/**
 * The LUNA6 effort-study operator (plan r5 §3.7; D898): `schedule`, `ingest`, `packets` and `analyze`, each run as
 *
 *   node node_modules/vite-node/vite-node.mjs tools/luna6-effort-study.ts <sub> --root <R> [options]
 *
 * from the study checkout. Every file a subcommand writes is opened with flag `wx`, after checking that none of its
 * targets exists, so no stage overwrites evidence. Each subcommand prints one final `LUNA6 <SUB> PASS …` line and
 * exits 0, or prints `LUNA6 <SUB> FAIL <where>: <reason>` lines and exits 1.
 *
 *   schedule --seed <P> --codex-bin <abs>   writes schedule.json (both must equal the registration)
 *   schedule --reruns                       writes schedule-reruns.json, the §3.2 rerun section, after the cells ran
 *   ingest                                  writes normalized/<tag>.jsonl, guard-ledger.json, ingest-report.json
 *   packets --shuffle-seeds <s1,…,s8>       writes luna6-packet-<tag>.json and answer-keys/luna6-key-<tag>.json;
 *                                           the seeds follow D898 R3's tag order, and at the registered root they
 *                                           must be the registered seeds
 *   analyze                                 writes results/luna6-effort-study-result.json
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { canonicalJson } from '../src/commands/canonical-json';
import { analyzeLuna6Study, type Luna6TagDocuments } from './luna6-effort-study/analyze';
import {
  ingestLuna6Study,
  luna6PairsNeedingRerun,
  Luna6StudyRefusal,
  type JsonRecord,
  type Luna6CellEvidence,
  type Luna6CellSpeed,
  type Luna6GuardLedgerKey,
} from './luna6-effort-study/ingest';
import { buildLuna6Packets } from './luna6-effort-study/packets';
import {
  LUNA6_EFFORT_STUDY,
  luna6Tags,
  type Luna6EffortStudyRegistration,
  type Luna6Tag,
} from './luna6-effort-study/registration';
import {
  buildLuna6Reruns,
  buildLuna6Schedule,
  type Luna6Reruns,
  type Luna6Schedule,
} from './luna6-effort-study/schedule';

export const LUNA6_RESULT_SCHEMA = 'luna6-effort-study-result-v1' as const;

const SUBCOMMANDS = {
  schedule: 'SCHEDULE',
  ingest: 'INGEST',
  packets: 'PACKETS',
  analyze: 'ANALYSIS',
} as const;
type Subcommand = keyof typeof SUBCOMMANDS;

export interface Luna6CliOutput {
  line(text: string): void;
}

const processOutput: Luna6CliOutput = { line: (text) => { process.stdout.write(`${text}\n`); } };

class CliFailure extends Error {
  constructor(readonly violations: readonly string[]) {
    super(violations.join('\n'));
  }
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function readJson(path: string, label: string): { readonly value: unknown; readonly text: string } {
  const text = readText(path);
  if (text === null) throw new CliFailure([`${label}: ${path} is missing`]);
  try {
    return { value: JSON.parse(text) as unknown, text };
  } catch (error) {
    throw new CliFailure([`${label}: ${path} is not JSON (${error instanceof Error ? error.message : String(error)})`]);
  }
}

/** Refuses to start when any target exists, then writes every target with flag `wx`. */
function writeAllOnce(files: readonly { readonly path: string; readonly text: string }[]): void {
  const existing = files.filter((file) => existsSync(file.path));
  if (existing.length > 0) {
    throw new CliFailure(existing.map((file) => `output: ${file.path} exists; a stage never overwrites evidence`));
  }
  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.text, { encoding: 'utf8', flag: 'wx' });
  }
}

interface ParsedArgs {
  readonly subcommand: Subcommand;
  readonly root: string;
  readonly options: ReadonlyMap<string, string>;
  readonly flags: ReadonlySet<string>;
}

const VALUE_OPTIONS = new Set(['--root', '--seed', '--codex-bin', '--shuffle-seeds']);
const FLAG_OPTIONS = new Set(['--reruns']);

function parseArgs(argv: readonly string[]): ParsedArgs {
  const [first, ...rest] = argv[0] === '--' ? argv.slice(1) : argv;
  if (first === undefined || !Object.prototype.hasOwnProperty.call(SUBCOMMANDS, first)) {
    throw new CliFailure([`usage: tools/luna6-effort-study.ts <schedule|ingest|packets|analyze> --root <dir>; got ${String(first)}`]);
  }
  const options = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < rest.length; index += 1) {
    const option = rest[index]!;
    if (FLAG_OPTIONS.has(option)) {
      flags.add(option);
    } else if (VALUE_OPTIONS.has(option)) {
      const value = rest[index + 1];
      if (value === undefined || value.startsWith('--')) throw new CliFailure([`arguments: ${option} requires a value`]);
      options.set(option, value);
      index += 1;
    } else {
      throw new CliFailure([`arguments: unknown option ${option}`]);
    }
  }
  const root = options.get('--root');
  if (root === undefined) throw new CliFailure(['arguments: --root is required']);
  return { subcommand: first as Subcommand, root: resolve(root), options, flags };
}

function cellPath(root: string, ordinal: number, suffix: string): string {
  return `${root}/cells/${String(ordinal).padStart(3, '0')}${suffix}`;
}

function readSchedule(root: string): { readonly schedule: Luna6Schedule; readonly sha: string } {
  const { value, text } = readJson(`${root}/schedule.json`, 'schedule.json');
  return { schedule: value as Luna6Schedule, sha: sha256(text) };
}

function readReruns(root: string): { readonly reruns: Luna6Reruns | null; readonly sha: string | null } {
  const text = readText(`${root}/schedule-reruns.json`);
  if (text === null) return { reruns: null, sha: null };
  return { reruns: readJson(`${root}/schedule-reruns.json`, 'schedule-reruns.json').value as Luna6Reruns, sha: sha256(text) };
}

function readCells(root: string, ordinals: readonly number[]): ReadonlyMap<number, Luna6CellEvidence> {
  const violations: string[] = [];
  const cells = new Map<number, Luna6CellEvidence>();
  for (const ordinal of ordinals) {
    const exitText = readText(cellPath(root, ordinal, '.exit'));
    let exitCode: number | null = null;
    if (exitText !== null) {
      if (!/^-?\d+$/u.test(exitText.trim())) {
        violations.push(`cell ${String(ordinal).padStart(3, '0')}: its exit file holds ${JSON.stringify(exitText)}, not an exit code`);
        continue;
      }
      exitCode = Number(exitText.trim());
    }
    cells.set(ordinal, {
      exitCode,
      rowsText: readText(cellPath(root, ordinal, '.jsonl')),
      callLogText: readText(cellPath(root, ordinal, '.jsonl.luna-calls.jsonl')),
    });
  }
  if (violations.length > 0) throw new CliFailure(violations);
  return cells;
}

function scheduleCommand(args: ParsedArgs, registration: Luna6EffortStudyRegistration): string {
  if (args.flags.has('--reruns')) {
    const { schedule, sha } = readSchedule(args.root);
    const cells = readCells(args.root, schedule.entries.map((entry) => entry.ordinal));
    const need = luna6PairsNeedingRerun(registration, schedule, cells);
    if (need.violations.length > 0) throw new CliFailure(need.violations);
    const reruns = buildLuna6Reruns(registration, schedule, sha, need.pairs);
    const text = `${canonicalJson(reruns)}\n`;
    writeAllOnce([{ path: `${args.root}/schedule-reruns.json`, text }]);
    const ordinals = reruns.entries.map((entry) => entry.ordinal);
    return `LUNA6 SCHEDULE PASS reruns=${String(need.pairs.length)} entries=${String(reruns.entries.length)} ` +
      `ordinals=${ordinals.length === 0 ? 'none' : `${String(ordinals[0])}-${String(ordinals[ordinals.length - 1])}`} ` +
      `sha256=${sha256(text)}`;
  }
  const seedText = args.options.get('--seed');
  const codexBin = args.options.get('--codex-bin');
  const violations: string[] = [];
  if (seedText === undefined || String(registration.scheduleSeed) !== seedText) {
    violations.push(`arguments: --seed ${String(seedText)} is not the registered schedule seed ${String(registration.scheduleSeed)}`);
  }
  if (codexBin !== registration.codexBin) {
    violations.push(`arguments: --codex-bin ${String(codexBin)} is not the registered ${registration.codexBin}`);
  }
  if (violations.length > 0) throw new CliFailure(violations);
  const schedule = buildLuna6Schedule(registration, registration.scheduleSeed);
  const text = `${canonicalJson(schedule)}\n`;
  writeAllOnce([{ path: `${args.root}/schedule.json`, text }]);
  return `LUNA6 SCHEDULE PASS entries=${String(schedule.entries.length)} pairs=${String(registration.pairs)} ` +
    `seed=${String(registration.scheduleSeed)} sha256=${sha256(text)}`;
}

function ingestCommand(args: ParsedArgs, registration: Luna6EffortStudyRegistration): string {
  const { schedule, sha } = readSchedule(args.root);
  const { reruns } = readReruns(args.root);
  const ordinals = [...schedule.entries, ...(reruns?.entries ?? [])].map((entry) => entry.ordinal);
  const cells = readCells(args.root, ordinals);
  const result = ingestLuna6Study({ registration, schedule, scheduleSha256: sha, reruns, cells });
  writeAllOnce([
    ...luna6Tags(registration).map((tag) => ({
      path: `${args.root}/normalized/${tag}.jsonl`,
      text: result.normalized[tag].map((row) => `${JSON.stringify(row)}\n`).join(''),
    })),
    {
      path: `${args.root}/normalized/guard-ledger.json`,
      text: `${canonicalJson({ schema: 'luna6-guard-ledger-v1', registration: registration.id, entries: result.ledger })}\n`,
    },
    { path: `${args.root}/normalized/ingest-report.json`, text: `${canonicalJson(result.report)}\n` },
  ]);
  return `LUNA6 INGEST PASS cells=${String(result.report.cells)} pairs=${String(result.report.pairs)} ` +
    `excludedPairs=${String(result.report.excludedPairs.length)} sa1=${String(result.report.sa1)} ` +
    `calls=${String(result.report.calls)}`;
}

function parseRows(text: string, label: string): readonly JsonRecord[] {
  return text.split('\n').filter((line) => line.trim().length > 0).map((line, index) => {
    try {
      return JSON.parse(line) as JsonRecord;
    } catch {
      throw new CliFailure([`${label}: line ${String(index + 1)} is not JSON`]);
    }
  });
}

function packetsCommand(args: ParsedArgs, registration: Luna6EffortStudyRegistration): string {
  const order = Object.keys(registration.packetShuffleSeeds) as Luna6Tag[];
  const seedsText = args.options.get('--shuffle-seeds');
  const seeds = (seedsText ?? '').split(',').map((value) => value.trim());
  if (seeds.length !== order.length || seeds.some((value) => !/^\d+$/u.test(value))) {
    throw new CliFailure([`arguments: --shuffle-seeds needs ${String(order.length)} integers in the order ${order.join(',')}`]);
  }
  const shuffleSeeds = Object.fromEntries(order.map((tag, index) => [tag, Number(seeds[index])])) as Record<Luna6Tag, number>;
  if (args.root === registration.studyRoot && canonicalJson(shuffleSeeds) !== canonicalJson(registration.packetShuffleSeeds)) {
    throw new CliFailure([`arguments: at the registered root ${registration.studyRoot} the shuffle seeds must be the registered seeds (D898 R3)`]);
  }
  const normalized = Object.fromEntries(luna6Tags(registration).map((tag) => {
    const path = `${args.root}/normalized/${tag}.jsonl`;
    const text = readText(path);
    if (text === null) throw new CliFailure([`packet ${tag}: ${path} is missing`]);
    return [tag, parseRows(text, path)];
  })) as Record<Luna6Tag, readonly JsonRecord[]>;
  const { packets, violations } = buildLuna6Packets(registration, normalized, shuffleSeeds);
  if (violations.length > 0) throw new CliFailure(violations);
  const files = luna6Tags(registration).flatMap((tag) => {
    const built = packets[tag]!;
    return [
      { path: `${args.root}/luna6-packet-${tag}.json`, text: `${canonicalJson(built.packet)}\n` },
      { path: `${args.root}/answer-keys/luna6-key-${tag}.json`, text: `${canonicalJson(built.answerKey)}\n` },
    ];
  });
  writeAllOnce(files);
  const entries = luna6Tags(registration).reduce((sum, tag) => sum + packets[tag]!.packet.entries.length, 0);
  return `LUNA6 PACKETS PASS packets=${String(luna6Tags(registration).length)} entries=${String(entries)} leakScan=clean`;
}

function analyzeCommand(args: ParsedArgs, registration: Luna6EffortStudyRegistration): string {
  const inputs = {
    schedule: readSchedule(args.root).sha,
    reruns: readReruns(args.root).sha,
    packets: {} as Record<string, string>,
    keys: {} as Record<string, string>,
    seats: {} as Record<string, Record<string, string>>,
    ledger: '',
    ingestReport: '',
  };
  const resultsDirectory = `${args.root}/results`;
  const seatFiles = existsSync(resultsDirectory) ? readdirSync(resultsDirectory) : [];
  const documents: Partial<Record<Luna6Tag, Luna6TagDocuments>> = {};
  for (const tag of luna6Tags(registration)) {
    const packet = readJson(`${args.root}/luna6-packet-${tag}.json`, `packet for ${tag}`);
    const answerKey = readJson(`${args.root}/answer-keys/luna6-key-${tag}.json`, `answer key for ${tag}`);
    inputs.packets[tag] = sha256(packet.text);
    inputs.keys[tag] = sha256(answerKey.text);
    const prefix = `normalized-${tag}-`;
    const seats: Record<string, unknown> = {};
    const seatShas: Record<string, string> = {};
    for (const file of seatFiles.filter((name) => name.startsWith(prefix) && name.endsWith('.json')).sort()) {
      const seat = file.slice(prefix.length, -'.json'.length);
      const document = readJson(`${resultsDirectory}/${file}`, `seat ${seat} for ${tag}`);
      seats[seat] = document.value;
      seatShas[seat] = sha256(document.text);
    }
    inputs.seats[tag] = seatShas;
    documents[tag] = { packet: packet.value, answerKey: answerKey.value, seats };
  }
  const ledger = readJson(`${args.root}/normalized/guard-ledger.json`, 'guard ledger');
  const report = readJson(`${args.root}/normalized/ingest-report.json`, 'ingest report');
  inputs.ledger = sha256(ledger.text);
  inputs.ingestReport = sha256(report.text);
  const ledgerEntries = (ledger.value as { readonly entries?: readonly Luna6GuardLedgerKey[] }).entries;
  const speed = (report.value as { readonly speed?: readonly Luna6CellSpeed[] }).speed;
  if (!Array.isArray(ledgerEntries) || !Array.isArray(speed)) {
    throw new CliFailure(['inputs: the guard ledger or the ingest report has no entries']);
  }
  const analysis = analyzeLuna6Study({ registration, documents, ledger: ledgerEntries, speed });
  const { delta, ...rest } = analysis;
  const result = {
    schema: LUNA6_RESULT_SCHEMA,
    registration: {
      id: registration.id,
      preregistration: registration.preregistration,
      sha256: sha256(canonicalJson(registration)),
    },
    ...rest,
    delta: { mean: delta.mean, lower_qstar: delta.lowerQstar, upper_97_5: delta.upper975 },
    inputs,
  };
  writeAllOnce([{ path: `${resultsDirectory}/luna6-effort-study-result.json`, text: `${canonicalJson(result)}\n` }]);
  return `LUNA6 ANALYSIS PASS decision=${analysis.decision} delta=${String(delta.mean)} ` +
    `lower=${String(delta.lowerQstar)} pairs=${String(analysis.pairs)}`;
}

/** Runs one subcommand; returns the exit code. Exported for tests; the module runs it only when invoked directly. */
export function runLuna6EffortStudyCli(
  argv: readonly string[],
  output: Luna6CliOutput = processOutput,
  registration: Luna6EffortStudyRegistration = LUNA6_EFFORT_STUDY,
): number {
  const requested = argv[0] === '--' ? argv[1] : argv[0];
  let label: string = requested !== undefined && Object.prototype.hasOwnProperty.call(SUBCOMMANDS, requested)
    ? SUBCOMMANDS[requested as Subcommand]
    : 'USAGE';
  try {
    const args = parseArgs(argv);
    label = SUBCOMMANDS[args.subcommand];
    const pass = (() => {
      switch (args.subcommand) {
        case 'schedule': return scheduleCommand(args, registration);
        case 'ingest': return ingestCommand(args, registration);
        case 'packets': return packetsCommand(args, registration);
        case 'analyze': return analyzeCommand(args, registration);
      }
    })();
    output.line(pass);
    return 0;
  } catch (error) {
    const violations = error instanceof CliFailure || error instanceof Luna6StudyRefusal
      ? error.violations
      : [`${label.toLowerCase()}: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`];
    for (const violation of violations) output.line(`LUNA6 ${label} FAIL ${violation}`);
    return 1;
  }
}

const invokedPath = process.argv[1];
const isStudyPath = (path: string): boolean =>
  path.endsWith('/luna6-effort-study.ts') || path.endsWith('\\luna6-effort-study.ts') || path === 'luna6-effort-study.ts';
if (process.env['VITEST'] !== 'true' && invokedPath !== undefined && (
  isStudyPath(invokedPath) ||
  ((invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs')) &&
    process.argv.some(isStudyPath))
)) {
  const scriptIndex = process.argv.findIndex(isStudyPath);
  process.exitCode = runLuna6EffortStudyCli(process.argv.slice(scriptIndex + 1));
}
