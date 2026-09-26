/**
 * Stage 3 of the study pipeline (plan r5 §3.7): ties every scheduled cell to exactly one arena row and to its
 * gpt-6-luna call log, relabels the row's arm, builds the SA-1 guard ledger, and applies the §3.2 infrastructure rule
 * (a pair with an infrastructure failure or no row is rerun once, then excluded; STOP above D898 R2's 24 pairs).
 *
 * Every check collects a violation rather than stopping at the first, so one run names every problem.
 */
import { canonicalJson } from '../../src/commands/canonical-json';
import { reconcileLunaCallLog, type LunaCallRecord } from '../luna-call-log';
import { LUNA6_CALL_EXITS, type Luna6CallTiming, type Luna6TokenUsage } from './latency';
import {
  luna6Arm,
  luna6ModeCap,
  luna6Tags,
  type Luna6ArmId,
  type Luna6Basis,
  type Luna6EffortStudyRegistration,
  type Luna6Mode,
  type Luna6StratumId,
  type Luna6Tag,
} from './registration';
import {
  buildLuna6Reruns,
  buildLuna6Schedule,
  luna6CellName,
  luna6GridViolations,
  luna6PairName,
  type Luna6Reruns,
  type Luna6Schedule,
  type Luna6ScheduleEntry,
} from './schedule';

export type JsonRecord = Readonly<Record<string, unknown>>;

/** What a cell left on disk: its exit file, its row file and its call log (null when the file is absent). */
export interface Luna6CellEvidence {
  readonly exitCode: number | null;
  readonly rowsText: string | null;
  readonly callLogText: string | null;
}

export interface Luna6GuardLedgerKey {
  readonly mode: Luna6Mode;
  readonly basis: Luna6Basis;
  readonly seed: number;
  readonly rep: number;
  readonly arm: Luna6ArmId;
}

/** SA-1: a cell with at least one hang-guard firing is scored 0 at analysis. */
export interface Luna6GuardLedgerEntry extends Luna6GuardLedgerKey {
  readonly stratum: Luna6StratumId;
  readonly ordinal: number;
  readonly calls: readonly { readonly ordinal: number; readonly callPhase: string; readonly elapsedMs: number }[];
}

export interface Luna6TimedCall extends Luna6CallTiming {
  readonly callPhase: string;
}

/** The speed evidence of one cell in the final attempt of its pair (§3.6). */
export interface Luna6CellSpeed extends Luna6GuardLedgerKey {
  readonly stratum: Luna6StratumId;
  readonly ordinal: number;
  readonly pair: number;
  readonly calls: readonly Luna6TimedCall[];
  readonly usage: readonly Luna6TokenUsage[];
}

export const LUNA6_GUARD_LEDGER_SCHEMA = 'luna6-guard-ledger-v1' as const;
export const LUNA6_INGEST_REPORT_SCHEMA = 'luna6-ingest-report-v1' as const;

/** `normalized/guard-ledger.json`: the SA-1 cells, read back by the analysis (§3.3, §3.7). */
export interface Luna6GuardLedgerDocument {
  readonly schema: typeof LUNA6_GUARD_LEDGER_SCHEMA;
  readonly registration: Luna6EffortStudyRegistration['id'];
  readonly entries: readonly Luna6GuardLedgerEntry[];
}

export function luna6GuardLedgerDocument(
  registration: Pick<Luna6EffortStudyRegistration, 'id'>,
  ledger: readonly Luna6GuardLedgerEntry[],
): Luna6GuardLedgerDocument {
  return { schema: LUNA6_GUARD_LEDGER_SCHEMA, registration: registration.id, entries: ledger };
}

export interface Luna6IngestReport {
  readonly schema: typeof LUNA6_INGEST_REPORT_SCHEMA;
  readonly registration: Luna6EffortStudyRegistration['id'];
  readonly cells: number;
  readonly pairs: number;
  readonly excludedPairs: readonly { readonly pair: number; readonly name: string; readonly reason: string }[];
  readonly sa1: number;
  readonly calls: number;
  readonly attempts: readonly {
    readonly ordinal: number;
    readonly cell: string;
    readonly status: 'row' | 'infrastructure' | 'no_row';
    readonly detail: string;
    readonly calls: number;
    readonly firings: number;
  }[];
  readonly speed: readonly Luna6CellSpeed[];
}

export interface Luna6IngestResult {
  readonly normalized: Readonly<Record<Luna6Tag, readonly JsonRecord[]>>;
  readonly ledger: readonly Luna6GuardLedgerEntry[];
  readonly report: Luna6IngestReport;
}

/** A stage refused its inputs. Each violation is `<where>: <reason>`; the CLI prints one FAIL line per violation. */
export class Luna6StudyRefusal extends Error {
  override readonly name = 'Luna6StudyRefusal' as const;

  constructor(readonly violations: readonly string[]) {
    super(violations.join('\n'));
  }
}

type IngestRegistration = Pick<
  Luna6EffortStudyRegistration,
  'id' | 'arms' | 'modes' | 'strata' | 'cells' | 'pairs' | 'caps' | 'hangGuardMs' | 'maxExcludedPairs' | 'codexBin' |
  'kb' | 'studyRoot' | 'cellEnv' | 'scheduleSeed'
>;

type CellAttempt =
  | {
      readonly kind: 'row';
      readonly entry: Luna6ScheduleEntry;
      readonly row: JsonRecord;
      readonly records: readonly LunaCallRecord[];
      readonly infrastructure: boolean;
      readonly firings: readonly LunaCallRecord[];
    }
  | { readonly kind: 'no_row'; readonly entry: Luna6ScheduleEntry; readonly reason: string };

function cellWhere(entry: Luna6ScheduleEntry): string {
  return `cell ${String(entry.ordinal).padStart(3, '0')} (${luna6CellName(entry)})`;
}

function show(value: unknown): string {
  return value === undefined ? 'absent' : JSON.stringify(value);
}

/** The relabel may change exactly the field `arm`, from `single` to the arm id (as v5 did, runbook :1229-1239). */
export function luna6RelabelViolations(source: JsonRecord, derived: JsonRecord, arm: Luna6ArmId): readonly string[] {
  const keys = [...new Set([...Object.keys(source), ...Object.keys(derived)])].sort();
  const changed = keys.filter((key) => show(source[key]) !== show(derived[key]));
  const violations: string[] = [];
  const others = changed.filter((key) => key !== 'arm');
  if (others.length > 0) violations.push(`the relabel changes ${others.join(', ')} as well as arm`);
  if (source['arm'] !== 'single' || derived['arm'] !== arm) {
    violations.push(`the relabel must turn arm single into ${arm}; it turns ${show(source['arm'])} into ${show(derived['arm'])}`);
  }
  return violations;
}

function examineCell(
  registration: IngestRegistration,
  entry: Luna6ScheduleEntry,
  evidence: Luna6CellEvidence | undefined,
  violations: string[],
): CellAttempt | null {
  const where = cellWhere(entry);
  if (evidence === undefined || evidence.exitCode === null) {
    violations.push(`${where}: has no exit file; the cell has not run`);
    return null;
  }
  if (evidence.exitCode !== 0) return { kind: 'no_row', entry, reason: `exit ${String(evidence.exitCode)}` };
  const lines = (evidence.rowsText ?? '').split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { kind: 'no_row', entry, reason: 'no row' };
  if (lines.length !== 1) {
    violations.push(`${where}: has ${String(lines.length)} rows; exactly one is required`);
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(lines[0]!);
  } catch (error) {
    violations.push(`${where}: row is not JSON (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    violations.push(`${where}: row is not an object`);
    return null;
  }
  const row = parsed as JsonRecord;
  const before = violations.length;
  const arm = registration.arms.find((candidate) => candidate.id === entry.arm);
  if (arm === undefined) throw new TypeError(`The registration has no arm ${entry.arm}.`);
  const cap = luna6ModeCap(registration.caps, entry.mode);
  const registeredSeeds = new Set(registration.strata.flatMap((stratum) => stratum.seeds));
  const expect = (field: string, expected: unknown): void => {
    if (show(row[field]) !== show(expected)) {
      violations.push(`${where}: row ${field} ${show(row[field])} is not the scheduled ${show(expected)}`);
    }
  };
  if (row['rowContractVersion'] !== 'arena-row-v3') {
    violations.push(`${where}: row rowContractVersion ${show(row['rowContractVersion'])} is not arena-row-v3`);
  }
  if (row['outcome'] === 'integrity_indeterminate') {
    violations.push(`${where}: STOP: row outcome integrity_indeterminate (D569IntegrityStop); go to the owner`);
  }
  if (typeof row['seed'] !== 'number' || !registeredSeeds.has(row['seed'])) {
    violations.push(`${where}: row seed ${show(row['seed'])} is not a registered cohort seed`);
  }
  expect('seed', entry.seed);
  expect('room', entry.room);
  expect('round', entry.rep);
  expect('scheduledCellKey', entry.cellKey);
  expect('dmMode', entry.mode);
  expect('basis', entry.basis);
  if (row['model'] !== 'gpt-6-luna') violations.push(`${where}: row model ${show(row['model'])} is not gpt-6-luna`);
  expect('effort', arm.effort);
  expect('arm', 'single');
  expect('roundWallBudgetMs', null);
  if (row['turnContextMaximumBytes'] !== cap) {
    violations.push(
      `${where}: row turnContextMaximumBytes ${show(row['turnContextMaximumBytes'])} is not the registered ` +
      `${entry.mode} cap ${String(cap)}`,
    );
  }
  expect('turnContextConfiguredCaps', { baseBytes: cap, semanticBytes: registration.caps.semanticBytes });
  const callsPerRound = row['callsPerRound'];
  if (typeof callsPerRound !== 'number' || !Number.isSafeInteger(callsPerRound) || callsPerRound < 0) {
    violations.push(`${where}: row callsPerRound ${show(callsPerRound)} is not a nonnegative integer`);
  }
  let records: readonly LunaCallRecord[] = [];
  if (evidence.callLogText === null) {
    if (typeof callsPerRound === 'number' && callsPerRound > 0) {
      violations.push(`${where}: has no call log for its ${String(callsPerRound)} calls`);
    }
  } else {
    try {
      records = reconcileLunaCallLog(evidence.callLogText.split('\n'));
    } catch (error) {
      violations.push(`${where}: call log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const record of records) {
    const call = `${where}: call ${String(record.ordinal)}`;
    if (record.pending) violations.push(`${call} was dispatched and never completed`);
    if (record.cellKey !== entry.cellKey) violations.push(`${call} is logged in cell ${record.cellKey}, not ${entry.cellKey}`);
    if (record.model !== 'gpt-6-luna') violations.push(`${call} model ${record.model} is not gpt-6-luna`);
    if (record.reasoningEffort !== arm.effort) {
      violations.push(`${call} effort ${record.reasoningEffort} is not the scheduled ${arm.effort}`);
    }
    if (record.timeoutMs !== registration.hangGuardMs) {
      violations.push(`${call} timeoutMs ${String(record.timeoutMs)} is not the hang guard ${String(registration.hangGuardMs)}`);
    }
    if (record.boundKind !== 'hang_guard') violations.push(`${call} boundKind ${record.boundKind} is not hang_guard`);
  }
  const completions = records.filter((record) => !record.pending).length;
  if (typeof callsPerRound === 'number' && completions !== callsPerRound) {
    violations.push(`${where}: the call log completes ${String(completions)} calls; the row has callsPerRound ${String(callsPerRound)}`);
  }
  const derived: JsonRecord = { ...row, arm: entry.arm };
  violations.push(...luna6RelabelViolations(row, derived, entry.arm).map((violation) => `${where}: ${violation}`));
  if (violations.length > before) return null;
  const firings = records.filter((record) => record.hangGuardFired === true);
  // SA-1: a hang-guard firing is never infrastructure, whatever outcome the runner recorded.
  const infrastructure = row['outcome'] === 'infrastructure_failed' && firings.length === 0;
  return { kind: 'row', entry, row: derived, records, infrastructure, firings };
}

function attemptProblem(attempt: CellAttempt): string | null {
  if (attempt.kind === 'no_row') return `cell ${String(attempt.entry.ordinal)} ${attempt.reason}`;
  return attempt.infrastructure ? `cell ${String(attempt.entry.ordinal)} infrastructure_failed` : null;
}

function pairsOf<Entry extends Luna6ScheduleEntry>(entries: readonly Entry[]): ReadonlyMap<number, readonly Entry[]> {
  const pairs = new Map<number, Entry[]>();
  for (const entry of entries) pairs.set(entry.pair, [...(pairs.get(entry.pair) ?? []), entry]);
  return new Map([...pairs.entries()].sort(([left], [right]) => left - right)
    .map(([pair, cells]) => [pair, [...cells].sort((left, right) => left.ordinal - right.ordinal)]));
}

/** The schedule on disk must be the schedule the registration builds from its registered seed. */
function scheduleViolations(registration: IngestRegistration, schedule: Luna6Schedule): readonly string[] {
  const violations = [...luna6GridViolations(schedule.entries, registration).map((violation) => `schedule.json: ${violation}`)];
  const rebuilt = buildLuna6Schedule(registration, registration.scheduleSeed);
  if (canonicalJson(schedule) !== canonicalJson(rebuilt)) {
    violations.push(`schedule.json: is not the schedule the registration builds from seed ${String(registration.scheduleSeed)}`);
  }
  return violations;
}

export interface Luna6RerunNeed {
  readonly pairs: readonly number[];
  readonly violations: readonly string[];
}

/** The pairs whose scheduled attempt has an infrastructure failure or a cell without a row (§3.2). */
export function luna6PairsNeedingRerun(
  registration: IngestRegistration,
  schedule: Luna6Schedule,
  cells: ReadonlyMap<number, Luna6CellEvidence>,
): Luna6RerunNeed {
  const violations: string[] = [...scheduleViolations(registration, schedule)];
  const pairs: number[] = [];
  for (const [pair, entries] of pairsOf(schedule.entries)) {
    const attempts = entries.map((entry) => examineCell(registration, entry, cells.get(entry.ordinal), violations));
    if (attempts.some((attempt) => attempt === null)) continue;
    if (attempts.some((attempt) => attemptProblem(attempt!) !== null)) pairs.push(pair);
  }
  return { pairs, violations };
}

function timedCalls(records: readonly LunaCallRecord[]): readonly Luna6TimedCall[] {
  return records.flatMap((record) => record.pending ? [] : [{
    elapsedMs: record.elapsedMs,
    exit: record.exit,
    hangGuardFired: record.hangGuardFired,
    callPhase: record.callPhase,
  }]);
}

function tokenUsage(row: JsonRecord): readonly Luna6TokenUsage[] {
  const usage = row['callUsage'];
  if (!Array.isArray(usage)) return [];
  return usage.flatMap((entry: unknown) => {
    if (entry === null || typeof entry !== 'object') return [];
    const { reasoning, output } = entry as Readonly<Record<string, unknown>>;
    return typeof reasoning === 'number' && typeof output === 'number' ? [{ reasoning, output }] : [];
  });
}

/**
 * Stage 3. Throws `Luna6StudyRefusal` with every violation, or returns the eight tags' relabelled rows (both cells of
 * every pair, excluded pairs included, so the packet builder sees the registered grid), the guard ledger and the
 * report.
 */
export function ingestLuna6Study(input: {
  readonly registration: IngestRegistration;
  readonly schedule: Luna6Schedule;
  readonly scheduleSha256: string;
  readonly reruns: Luna6Reruns | null;
  readonly cells: ReadonlyMap<number, Luna6CellEvidence>;
}): Luna6IngestResult {
  const { registration, schedule, reruns, cells } = input;
  const violations: string[] = [...scheduleViolations(registration, schedule)];
  const rerunPairs = pairsOf(reruns?.entries ?? []);
  const attempts: Luna6IngestReport['attempts'][number][] = [];
  const record = (attempt: CellAttempt): void => {
    attempts.push({
      ordinal: attempt.entry.ordinal,
      cell: luna6CellName(attempt.entry),
      status: attempt.kind === 'no_row' ? 'no_row' : attempt.infrastructure ? 'infrastructure' : 'row',
      detail: attempt.kind === 'no_row' ? attempt.reason : String(attempt.row['outcome']),
      calls: attempt.kind === 'no_row' ? 0 : attempt.records.length,
      firings: attempt.kind === 'no_row' ? 0 : attempt.firings.length,
    });
  };
  const finals: { readonly pair: number; readonly cells: readonly Extract<CellAttempt, { kind: 'row' }>[] }[] = [];
  const excluded: Luna6IngestReport['excludedPairs'][number][] = [];
  const needed: number[] = [];
  for (const [pair, entries] of pairsOf(schedule.entries)) {
    const scheduled = entries.map((entry) => examineCell(registration, entry, cells.get(entry.ordinal), violations));
    if (scheduled.some((attempt) => attempt === null)) continue;
    const first = scheduled as readonly CellAttempt[];
    first.forEach(record);
    const problem = first.map(attemptProblem).find((value) => value !== null) ?? null;
    if (problem === null) {
      finals.push({ pair, cells: first as readonly Extract<CellAttempt, { kind: 'row' }>[] });
      continue;
    }
    needed.push(pair);
    const rerunEntries = rerunPairs.get(pair);
    const name = luna6PairName(entries[0]!);
    if (rerunEntries === undefined) {
      violations.push(`pair ${String(pair)} (${name}): needs its rerun (${problem}); run schedule --reruns after the scheduled cells`);
      continue;
    }
    const second = rerunEntries.map((entry) => examineCell(registration, entry, cells.get(entry.ordinal), violations));
    if (second.some((attempt) => attempt === null)) continue;
    const rerun = second as readonly CellAttempt[];
    rerun.forEach(record);
    const rerunProblem = rerun.map(attemptProblem).find((value) => value !== null) ?? null;
    if (rerunProblem === null) {
      finals.push({ pair, cells: rerun as readonly Extract<CellAttempt, { kind: 'row' }>[] });
      continue;
    }
    excluded.push({ pair, name, reason: rerunProblem });
    const withRows = [rerun, first].find((attempt) => attempt.every((cell) => cell.kind === 'row'));
    if (withRows === undefined) {
      violations.push(`pair ${String(pair)} (${name}): STOP: a cell has no row in either attempt; the packet builder needs both rows`);
      continue;
    }
    finals.push({ pair, cells: withRows as readonly Extract<CellAttempt, { kind: 'row' }>[] });
  }
  if (reruns !== null) {
    const rebuilt = buildLuna6Reruns(registration, schedule, input.scheduleSha256, needed);
    if (canonicalJson(reruns) !== canonicalJson(rebuilt)) {
      violations.push(`schedule-reruns.json: is not the rerun section of this schedule for pairs ${needed.join(',') || 'none'}`);
    }
  }
  if (excluded.length > registration.maxExcludedPairs) {
    violations.push(
      `infrastructure: STOP: ${String(excluded.length)} pairs end excluded, more than the registered ` +
      `${String(registration.maxExcludedPairs)}; go to the owner`,
    );
  }
  if (violations.length > 0) throw new Luna6StudyRefusal(violations);
  const high = luna6Arm(registration, 'high').id;
  const normalized = Object.fromEntries(luna6Tags(registration).map((tag) => [tag, [] as JsonRecord[]])) as
    Record<Luna6Tag, JsonRecord[]>;
  const ledger: Luna6GuardLedgerEntry[] = [];
  const speed: Luna6CellSpeed[] = [];
  const ordered = finals.flatMap((final) => final.cells.map((cell) => ({ pair: final.pair, cell })))
    .sort((left, right) => left.cell.entry.seed - right.cell.entry.seed || left.cell.entry.rep - right.cell.entry.rep ||
      (left.cell.entry.arm === high ? 0 : 1) - (right.cell.entry.arm === high ? 0 : 1));
  for (const { pair, cell } of ordered) {
    const { entry } = cell;
    normalized[`${entry.mode}-${entry.stratum}`].push(cell.row);
    const key = { mode: entry.mode, basis: entry.basis, seed: entry.seed, rep: entry.rep, arm: entry.arm };
    if (cell.firings.length > 0) {
      ledger.push({
        ...key, stratum: entry.stratum, ordinal: entry.ordinal,
        calls: cell.firings.map((firing) => ({
          ordinal: firing.ordinal, callPhase: firing.callPhase, elapsedMs: firing.elapsedMs ?? 0,
        })),
      });
    }
    speed.push({
      ...key, stratum: entry.stratum, ordinal: entry.ordinal, pair,
      calls: timedCalls(cell.records), usage: tokenUsage(cell.row),
    });
  }
  return {
    normalized,
    ledger,
    report: {
      schema: LUNA6_INGEST_REPORT_SCHEMA,
      registration: registration.id,
      cells: schedule.entries.length,
      pairs: finals.length - excluded.length,
      excludedPairs: excluded,
      sa1: ledger.length,
      calls: speed.reduce((sum, cell) => sum + cell.calls.length, 0),
      attempts: attempts.sort((left, right) => left.ordinal - right.ordinal),
      speed,
    },
  };
}

type InputRegistration = Pick<
  Luna6EffortStudyRegistration,
  'id' | 'arms' | 'modes' | 'strata' | 'cells' | 'pairs' | 'maxExcludedPairs'
>;

/** The ingest report as the analysis reads it back: every field it uses, each checked. */
export type Luna6CheckedIngestReport = Omit<Luna6IngestReport, 'attempts'>;

/** Stage 7's two inputs from stage 3, returned only after every check of `luna6AnalysisInputs` passed. */
export interface Luna6AnalysisInputs {
  readonly ledger: readonly Luna6GuardLedgerEntry[];
  readonly report: Luna6CheckedIngestReport;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isOrdinal(value: unknown): value is number {
  return isCount(value) && value >= 1;
}

function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** The registered cell a document entry names: its mode, stratum, the stratum's basis and seed, its rep and arm. */
function registeredCell(
  registration: InputRegistration,
  value: JsonRecord,
  where: string,
  violations: string[],
): (Luna6GuardLedgerKey & { readonly stratum: Luna6StratumId }) | null {
  const { mode: modeValue, stratum: stratumValue, basis, seed, rep, arm: armValue } = value;
  const mode = registration.modes.find((candidate) => candidate === modeValue);
  const arm = registration.arms.find((candidate) => candidate.id === armValue);
  const stratum = registration.strata.find((candidate) => candidate.id === stratumValue);
  const before = violations.length;
  if (mode === undefined) violations.push(`${where}: mode ${show(modeValue)} is not registered`);
  if (arm === undefined) violations.push(`${where}: arm ${show(armValue)} is not registered`);
  if (stratum === undefined) {
    violations.push(`${where}: stratum ${show(stratumValue)} is not registered`);
    return null;
  }
  if (basis !== stratum.basis) violations.push(`${where}: basis ${show(basis)} is not the ${stratum.id} basis ${stratum.basis}`);
  if (typeof seed !== 'number' || !stratum.seeds.includes(seed)) {
    violations.push(`${where}: seed ${show(seed)} is not a registered ${stratum.id} seed`);
  }
  if (!isOrdinal(rep) || rep > stratum.reps) violations.push(`${where}: rep ${show(rep)} is not in 1..${String(stratum.reps)}`);
  if (violations.length > before || mode === undefined || arm === undefined) return null;
  return { mode, basis: stratum.basis, seed: seed as number, rep: rep as number, arm: arm.id, stratum: stratum.id };
}

function ledgerFirings(value: unknown, where: string, violations: string[]): Luna6GuardLedgerEntry['calls'] | null {
  const firings = Array.isArray(value) ? value.flatMap((call: unknown) => {
    if (!isRecord(call)) return [];
    const { ordinal, callPhase, elapsedMs } = call;
    return isOrdinal(ordinal) && typeof callPhase === 'string' && isDuration(elapsedMs)
      ? [{ ordinal, callPhase, elapsedMs }]
      : [];
  }) : [];
  if (!Array.isArray(value) || firings.length === 0 || firings.length !== value.length) {
    violations.push(`${where}: calls is not a non-empty list of firings with ordinal, callPhase and elapsedMs`);
    return null;
  }
  return firings;
}

function parseLedger(
  registration: InputRegistration,
  document: unknown,
  violations: string[],
): readonly Luna6GuardLedgerEntry[] | null {
  const where = 'guard ledger';
  if (!isRecord(document)) {
    violations.push(`${where}: is not a JSON object`);
    return null;
  }
  if (document['schema'] !== LUNA6_GUARD_LEDGER_SCHEMA) {
    violations.push(`${where}: schema ${show(document['schema'])} is not ${LUNA6_GUARD_LEDGER_SCHEMA}`);
  }
  if (document['registration'] !== registration.id) {
    violations.push(`${where}: registration ${show(document['registration'])} is not ${registration.id}`);
  }
  const entries = document['entries'];
  if (!Array.isArray(entries)) {
    violations.push(`${where}: has no entries list`);
    return null;
  }
  const ledger: Luna6GuardLedgerEntry[] = [];
  const named = new Set<string>();
  entries.forEach((entry: unknown, index) => {
    const at = `${where}: entry ${String(index + 1)}`;
    if (!isRecord(entry)) {
      violations.push(`${at} is not an object`);
      return;
    }
    const cell = registeredCell(registration, entry, at, violations);
    const { ordinal } = entry;
    if (!isOrdinal(ordinal)) violations.push(`${at}: ordinal ${show(ordinal)} is not a positive integer`);
    const calls = ledgerFirings(entry['calls'], at, violations);
    if (cell === null || calls === null || !isOrdinal(ordinal)) return;
    const name = luna6CellName(cell);
    if (named.has(name)) violations.push(`${where}: names ${name} twice`);
    named.add(name);
    ledger.push({ ...cell, ordinal, calls });
  });
  return ledger;
}

function speedCalls(value: unknown, where: string, violations: string[]): readonly Luna6TimedCall[] | null {
  const exits: readonly unknown[] = LUNA6_CALL_EXITS;
  const calls = Array.isArray(value) ? value.flatMap((call: unknown) => {
    if (!isRecord(call)) return [];
    const { elapsedMs, exit, hangGuardFired, callPhase } = call;
    return isDuration(elapsedMs) && exits.includes(exit) && typeof hangGuardFired === 'boolean' && typeof callPhase === 'string'
      ? [{ elapsedMs, exit: exit as Luna6TimedCall['exit'], hangGuardFired, callPhase }]
      : [];
  }) : [];
  if (!Array.isArray(value) || calls.length !== value.length) {
    violations.push(`${where}: calls is not a list of calls with elapsedMs, a call-log exit, hangGuardFired and callPhase`);
    return null;
  }
  return calls;
}

function speedUsage(value: unknown, where: string, violations: string[]): readonly Luna6TokenUsage[] | null {
  const usage = Array.isArray(value) ? value.flatMap((entry: unknown) => {
    if (!isRecord(entry)) return [];
    const { reasoning, output } = entry;
    return isCount(reasoning) && isCount(output) ? [{ reasoning, output }] : [];
  }) : [];
  if (!Array.isArray(value) || usage.length !== value.length) {
    violations.push(`${where}: usage is not a list of reasoning and output token counts`);
    return null;
  }
  return usage;
}

function parseSpeed(
  registration: InputRegistration,
  value: unknown,
  where: string,
  violations: string[],
): readonly Luna6CellSpeed[] | null {
  if (!Array.isArray(value)) {
    violations.push(`${where}: has no speed list`);
    return null;
  }
  const before = violations.length;
  const cells: Luna6CellSpeed[] = [];
  value.forEach((entry: unknown, index) => {
    const at = `${where}: speed entry ${String(index + 1)}`;
    if (!isRecord(entry)) {
      violations.push(`${at} is not an object`);
      return;
    }
    const cell = registeredCell(registration, entry, at, violations);
    const { ordinal, pair } = entry;
    if (!isOrdinal(ordinal)) violations.push(`${at}: ordinal ${show(ordinal)} is not a positive integer`);
    if (!isOrdinal(pair)) violations.push(`${at}: pair ${show(pair)} is not a positive integer`);
    const calls = speedCalls(entry['calls'], at, violations);
    const usage = speedUsage(entry['usage'], at, violations);
    if (cell === null || calls === null || usage === null || !isOrdinal(ordinal) || !isOrdinal(pair)) return;
    cells.push({ ...cell, ordinal, pair, calls, usage });
  });
  return violations.length > before ? null : cells;
}

function parseExcludedPairs(
  value: unknown,
  where: string,
  violations: string[],
): Luna6IngestReport['excludedPairs'] | null {
  const excluded = Array.isArray(value) ? value.flatMap((entry: unknown) => {
    if (!isRecord(entry)) return [];
    const { pair, name, reason } = entry;
    return isOrdinal(pair) && typeof name === 'string' && typeof reason === 'string' ? [{ pair, name, reason }] : [];
  }) : [];
  if (!Array.isArray(value) || excluded.length !== value.length) {
    violations.push(`${where}: excludedPairs is not a list of pairs with name and reason`);
    return null;
  }
  return excluded;
}

function parseReport(
  registration: InputRegistration,
  document: unknown,
  violations: string[],
): Luna6CheckedIngestReport | null {
  const where = 'ingest report';
  if (!isRecord(document)) {
    violations.push(`${where}: is not a JSON object`);
    return null;
  }
  const { schema, registration: registered, cells, pairs, sa1, calls } = document;
  if (schema !== LUNA6_INGEST_REPORT_SCHEMA) violations.push(`${where}: schema ${show(schema)} is not ${LUNA6_INGEST_REPORT_SCHEMA}`);
  if (registered !== registration.id) violations.push(`${where}: registration ${show(registered)} is not ${registration.id}`);
  if (cells !== registration.cells) violations.push(`${where}: cells ${show(cells)} is not the registered ${String(registration.cells)}`);
  const excludedPairs = parseExcludedPairs(document['excludedPairs'], where, violations);
  if (excludedPairs !== null) {
    if (excludedPairs.length > registration.maxExcludedPairs) {
      violations.push(`${where}: ${String(excludedPairs.length)} pairs end excluded, more than the registered ` +
        `${String(registration.maxExcludedPairs)}`);
    }
    if (pairs !== registration.pairs - excludedPairs.length) {
      violations.push(`${where}: pairs ${show(pairs)} is not the registered ${String(registration.pairs)} less ` +
        `${String(excludedPairs.length)} excluded`);
    }
  }
  if (!isCount(sa1)) violations.push(`${where}: sa1 ${show(sa1)} is not a count`);
  const speed = parseSpeed(registration, document['speed'], where, violations);
  if (speed !== null) {
    violations.push(...luna6GridViolations(speed, registration).map((violation) => `${where}: speed: ${violation}`));
    const total = speed.reduce((sum, cell) => sum + cell.calls.length, 0);
    if (calls !== total) violations.push(`${where}: calls ${show(calls)} is not the ${String(total)} calls of its speed cells`);
  }
  if (excludedPairs === null || speed === null || !isCount(sa1) || !isCount(pairs) || !isCount(calls) || !isCount(cells)) {
    return null;
  }
  return {
    schema: LUNA6_INGEST_REPORT_SCHEMA, registration: registration.id, cells, pairs, excludedPairs, sa1, calls, speed,
  };
}

/**
 * Stage 7 reads stage 3's guard ledger and ingest report back (§3.7). Both must be this registration's, the report's
 * grid and counts must be the registered ones, and the ledger must name exactly the cells whose calls fired the hang
 * guard (SA-1): a ledger entry lost between the stages would otherwise remove an override without a trace. Throws
 * `Luna6StudyRefusal` naming every mismatch.
 */
export function luna6AnalysisInputs(
  registration: InputRegistration,
  ledgerDocument: unknown,
  reportDocument: unknown,
): Luna6AnalysisInputs {
  const violations: string[] = [];
  const ledger = parseLedger(registration, ledgerDocument, violations);
  const report = parseReport(registration, reportDocument, violations);
  if (ledger !== null && report !== null) {
    if (ledger.length !== report.sa1) {
      violations.push(`guard ledger: holds ${String(ledger.length)} entries; the ingest report counts sa1 ${String(report.sa1)}`);
    }
    const fired = new Set(report.speed.filter((cell) => cell.calls.some((call) => call.hangGuardFired)).map(luna6CellName));
    const named = new Set(ledger.map(luna6CellName));
    for (const name of [...fired].sort()) {
      if (!named.has(name)) violations.push(`guard ledger: lacks ${name}, whose call log fired the hang guard`);
    }
    for (const name of [...named].sort()) {
      if (!fired.has(name)) violations.push(`guard ledger: names ${name}, whose call log never fired the hang guard`);
    }
  }
  if (violations.length > 0) throw new Luna6StudyRefusal(violations);
  if (ledger === null || report === null) throw new Luna6StudyRefusal(['inputs: the guard ledger or the ingest report is unreadable']);
  return { ledger, report };
}
