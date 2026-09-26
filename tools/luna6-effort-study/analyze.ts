/**
 * Stage 7 of the study pipeline (plan r5 §3.4, §3.7; D898 R6): joins every tag's packet, answer key and three seat
 * files, scores each cell by its integer numerator (the twelve component scores of the three seats; 0 for a
 * non-executed or SA-1-overridden cell; none for an infrastructure failure), pairs the arms, and decides the route by
 * the one-sided cluster-bootstrap test of superiority by δ in exact integer arithmetic:
 *
 *   a draw's mean is S/(3m); it exceeds δ = a/b iff b·S > 3·a·m; reject H0 iff the number of draws that do not
 *   exceed δ is ≤ floor(q*·n).
 *
 * D569's floating cell value (`d569PanelValues`) is reported beside the decision as a diagnostic only.
 */
import {
  D569_PANEL_COMPONENTS,
  d569ClusterBootstrapDraws,
  d569PanelValues,
  d569Percentile,
  type D569AnalysisRow,
  type D569PanelComponent,
  type D569PanelComponents,
} from '../d569-blind-experiment';
import {
  luna6PairedTimeRatio,
  luna6SpeedSummary,
  luna6TokenSummary,
  type Luna6PairedTimeRatio,
  type Luna6PairTiming,
  type Luna6SpeedSummary,
  type Luna6TokenSummary,
} from './latency';
import {
  luna6AnalysisInputs,
  Luna6StudyRefusal,
  type JsonRecord,
  type Luna6CellSpeed,
  type Luna6GuardLedgerKey,
} from './ingest';
import {
  LUNA6_BASES,
  luna6Arm,
  luna6Tags,
  type Luna6ArmId,
  type Luna6Basis,
  type Luna6EffortStudyRegistration,
  type Luna6Mode,
  type Luna6Seat,
  type Luna6StratumId,
  type Luna6Tag,
} from './registration';
import { luna6PairName, type Luna6PairIdentity } from './schedule';

export type Luna6CellOutcome = D569AnalysisRow['outcome'];

export interface Luna6SeatScore {
  readonly seat: Luna6Seat;
  readonly components: D569PanelComponents;
}

/** One judged cell: executed cells carry exactly the registered seats' components; other cells carry none. */
export interface Luna6ScoredCell extends Luna6GuardLedgerKey {
  readonly stratum: Luna6StratumId;
  readonly outcome: Luna6CellOutcome;
  readonly seats: readonly Luna6SeatScore[];
}

/** One complete pair: `t` is numerator(xhigh) − numerator(high), an integer (D898 R6). */
export interface Luna6PairDifference extends Luna6PairIdentity {
  readonly t: number;
}

export interface Luna6TagDocuments {
  readonly packet: unknown;
  readonly answerKey: unknown;
  /** Normalized seat files by seat name; an absent seat is `undefined`. */
  readonly seats: Readonly<Partial<Record<string, unknown>>>;
}

type DecisionRule = Pick<Luna6EffortStudyRegistration, 'margin' | 'qStar' | 'resamples' | 'bootstrapSeed' | 'seats'>;
type AnalysisRegistration = Pick<
  Luna6EffortStudyRegistration,
  'id' | 'arms' | 'modes' | 'strata' | 'seats' | 'margin' | 'qStar' | 'resamples' | 'bootstrapSeed'
>;
type StageRegistration = AnalysisRegistration & Pick<Luna6EffortStudyRegistration, 'cells' | 'pairs' | 'maxExcludedPairs'>;

const COMPONENT_MAXIMA: Readonly<Record<D569PanelComponent, number>> = {
  targetPriority: 3, actionEconomy: 3, coherence: 2, positioning: 2,
};
const UPPER_QUANTILE = 0.975;
const LOWER_QUANTILE = 0.025;

/** A cell's integer value for one analysis: the primary numerator, one component, one seat or a failure flag. */
type CellNumerator = (cell: Luna6ScoredCell, sa1Override: boolean) => number | null;

/** The SA-1 join key (§3.3): mode, basis, seed, rep and arm. */
export function luna6LedgerKey(key: Luna6GuardLedgerKey): string {
  return `${key.mode}|${key.basis}|${String(key.seed)}|${String(key.rep)}|${key.arm}`;
}

/**
 * A cell's integer numerator (D898 R6): the sum of its seats' component scores when executed; 0 for a refused,
 * execution-failed or service-failed cell and for an SA-1 override; null (excluded pairwise) for an infrastructure
 * failure.
 */
export function luna6CellNumerator(cell: Luna6ScoredCell, sa1Override: boolean): number | null {
  return zeroInclusive(cell, sa1Override, () => cell.seats.reduce((sum, seat) => sum + seatTotal(seat), 0));
}

function seatTotal(seat: Luna6SeatScore): number {
  return D569_PANEL_COMPONENTS.reduce((sum, name) => sum + seat.components[name], 0);
}

/** D569's zero-inclusive rule with SA-1 in front of it: the executed value, 0, or null (excluded pairwise). */
function zeroInclusive(cell: Luna6ScoredCell, sa1Override: boolean, executed: () => number | null): number | null {
  if (sa1Override) return 0;
  switch (cell.outcome) {
    case 'executed':
      return executed();
    case 'refused':
    case 'execution_failed':
    case 'service_failed':
      return 0;
    case 'infrastructure_failed':
      return null;
  }
}

export interface Luna6Pairing {
  readonly pairs: readonly Luna6PairDifference[];
  readonly excludedPairs: number;
  readonly sa1Overrides: number;
  readonly unmatchedLedger: readonly string[];
}

/** Pairs every registered case's two arms after the SA-1 override; a pair with an infrastructure cell is excluded. */
export function luna6PairDifferences(
  registration: Pick<Luna6EffortStudyRegistration, 'arms'>,
  cells: readonly Luna6ScoredCell[],
  ledger: readonly Luna6GuardLedgerKey[],
  numerator: CellNumerator = luna6CellNumerator,
): Luna6Pairing {
  const overrides = new Set(ledger.map(luna6LedgerKey));
  const matched = new Set<string>();
  const high = luna6Arm(registration, 'high').id;
  const xhigh = luna6Arm(registration, 'xhigh').id;
  const byPair = new Map<string, { identity: Luna6PairIdentity; high?: number | null; xhigh?: number | null }>();
  let sa1Overrides = 0;
  for (const cell of cells) {
    const key = luna6LedgerKey(cell);
    const overridden = overrides.has(key);
    if (overridden) {
      matched.add(key);
      sa1Overrides += 1;
    }
    const identity: Luna6PairIdentity = { mode: cell.mode, stratum: cell.stratum, seed: cell.seed, rep: cell.rep };
    const pairKey = luna6PairName(identity);
    const pair = byPair.get(pairKey) ?? { identity };
    const value = numerator(cell, overridden);
    if (cell.arm === high) pair.high = value;
    else if (cell.arm === xhigh) pair.xhigh = value;
    byPair.set(pairKey, pair);
  }
  const pairs: Luna6PairDifference[] = [];
  let excludedPairs = 0;
  for (const { identity, high: highValue, xhigh: xhighValue } of byPair.values()) {
    if (highValue === undefined || xhighValue === undefined) {
      throw new TypeError(`Pair ${luna6PairName(identity)} lacks an arm.`);
    }
    if (highValue === null || xhighValue === null) {
      excludedPairs += 1;
      continue;
    }
    const t = xhighValue - highValue;
    pairs.push({ ...identity, t });
  }
  const unmatchedLedger = ledger.filter((entry) => !matched.has(luna6LedgerKey(entry)))
    .map((entry) => `guard ledger entry ${luna6LedgerKey(entry)} matches no scored cell`);
  return { pairs, excludedPairs, sa1Overrides, unmatchedLedger };
}

interface Luna6Cluster {
  readonly seed: number;
  readonly key: string;
  readonly sum: number;
  readonly count: number;
}

/** Clusters are encounter seeds, in ascending seed order (D898 R6: the order the bootstrap consumes them). */
function luna6Clusters(pairs: readonly Luna6PairDifference[]): readonly Luna6Cluster[] {
  const clusters = new Map<string, { seed: number; sum: number; count: number }>();
  for (const pair of pairs) {
    const clusterKey = String(pair.seed);
    const cluster = clusters.get(clusterKey) ?? { seed: pair.seed, sum: 0, count: 0 };
    cluster.sum += pair.t;
    cluster.count += 1;
    clusters.set(clusterKey, cluster);
  }
  return [...clusters.entries()]
    .map(([key, cluster]) => ({ key, ...cluster }))
    .sort((left, right) => left.seed - right.seed || (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
}

/** One bootstrap draw in exact integers: S, the sum of the drawn pairs' t, and m, the number of drawn pairs. */
export interface Luna6ExactDraw {
  readonly sum: number;
  readonly count: number;
}

function exactDraws(clusters: readonly Luna6Cluster[], resamples: number, seed: number): Luna6ExactDraw[] {
  return d569ClusterBootstrapDraws(clusters, resamples, seed, (picked) => {
    let sum = 0;
    let count = 0;
    for (const cluster of picked) {
      sum += cluster.sum;
      count += cluster.count;
    }
    return { sum, count };
  });
}

/** Ascending by the exact value sum/count: compare sum₁·count₂ with sum₂·count₁ (counts are positive). */
function sortExact(draws: Luna6ExactDraw[]): Luna6ExactDraw[] {
  return draws.sort((left, right) => left.sum * right.count - right.sum * left.count);
}

/**
 * D569's percentile rule over exactly sorted draws: index `floor(q·n)` clamped to `[0, n − 1]` (§3.4); the value is
 * the draw's S/(divisor·m). NaN when there are no draws.
 */
export function luna6ExactPercentile(sorted: readonly Luna6ExactDraw[], quantile: number, divisor: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(quantile * sorted.length)));
  const draw = sorted[index];
  return draw === undefined ? Number.NaN : draw.sum / (divisor * draw.count);
}

/**
 * D898 R6: a draw's mean S/(seats·m) exceeds δ = a/b iff b·S > seats·a·m, in exact integer arithmetic. A draw
 * exactly at δ does not exceed it and counts against xhigh.
 */
export function luna6DrawExceedsMargin(draw: Luna6ExactDraw, rule: Pick<DecisionRule, 'margin' | 'seats'>): boolean {
  return rule.margin.denominator * draw.sum > rule.seats.length * rule.margin.numerator * draw.count;
}

/** D898 R6: floor(q*·n) draws, 2,500 at the registered q* = 0.025 and n = 100,000. */
export function luna6RejectLimit(rule: Pick<DecisionRule, 'qStar' | 'resamples'>): number {
  return Math.floor(rule.qStar * rule.resamples);
}

/** D898 R6: reject H0 iff the draws that do not exceed δ number at most floor(q*·n). */
export function luna6RejectsH0(drawsAtOrBelowMargin: number, rule: Pick<DecisionRule, 'qStar' | 'resamples'>): boolean {
  return drawsAtOrBelowMargin <= luna6RejectLimit(rule);
}

export interface Luna6Decision {
  readonly decision: 'high' | 'xhigh';
  readonly delta: { readonly mean: number; readonly lowerQstar: number; readonly upper975: number };
  readonly pairs: number;
  readonly clusters: number;
  /** Draws whose mean does not exceed δ; H0 is rejected iff this is at most `rejectLimit` (D898 R6). */
  readonly drawsAtOrBelowMargin: number;
  readonly rejectLimit: number;
}

/** The named test (§3.4; D898 R6), in exact integer arithmetic. A cell value is its numerator over the seat count. */
export function luna6Decision(pairs: readonly Luna6PairDifference[], rule: DecisionRule): Luna6Decision {
  if (pairs.length === 0) throw new TypeError('The decision needs at least one complete pair.');
  const divisor = rule.seats.length;
  const clusters = luna6Clusters(pairs);
  const draws = exactDraws(clusters, rule.resamples, rule.bootstrapSeed);
  const drawsAtOrBelowMargin = draws.filter((draw) => !luna6DrawExceedsMargin(draw, rule)).length;
  const totalT = pairs.reduce((sum, pair) => sum + pair.t, 0);
  const sorted = sortExact(draws);
  return {
    decision: luna6RejectsH0(drawsAtOrBelowMargin, rule) ? 'xhigh' : 'high',
    delta: {
      mean: totalT / (divisor * pairs.length),
      lowerQstar: luna6ExactPercentile(sorted, rule.qStar, divisor),
      upper975: luna6ExactPercentile(sorted, UPPER_QUANTILE, divisor),
    },
    pairs: pairs.length,
    clusters: clusters.length,
    drawsAtOrBelowMargin,
    rejectLimit: luna6RejectLimit(rule),
  };
}

export interface Luna6Interval {
  readonly pairs: number;
  readonly clusters: number;
  readonly mean: number | null;
  readonly lower: number | null;
  readonly upper: number | null;
}

/** A reported secondary: the pooled mean with its 95 % cluster-bootstrap percentile interval, exactly sorted. */
function luna6Interval(
  pairs: readonly Luna6PairDifference[],
  divisor: number,
  resamples: number,
  seed: number,
): Luna6Interval {
  if (pairs.length === 0) return { pairs: 0, clusters: 0, mean: null, lower: null, upper: null };
  const clusters = luna6Clusters(pairs);
  const sorted = sortExact(exactDraws(clusters, resamples, seed));
  return {
    pairs: pairs.length,
    clusters: clusters.length,
    mean: pairs.reduce((sum, pair) => sum + pair.t, 0) / (divisor * pairs.length),
    lower: luna6ExactPercentile(sorted, LOWER_QUANTILE, divisor),
    upper: luna6ExactPercentile(sorted, UPPER_QUANTILE, divisor),
  };
}

function entriesOf(value: unknown): readonly JsonRecord[] | null {
  const entries = Array.isArray(value)
    ? value
    : value !== null && typeof value === 'object' ? (value as JsonRecord)['entries'] : undefined;
  if (!Array.isArray(entries)) return null;
  return entries.map((entry: unknown) =>
    entry !== null && typeof entry === 'object' && !Array.isArray(entry) ? entry as JsonRecord : {});
}

function blindIds(count: number): readonly string[] {
  return Array.from({ length: count }, (_unused, index) => `blind-${String(index + 1).padStart(3, '0')}`);
}

/** Set equality of blind ids against the registered ids, and no id twice (M76). */
function idViolations(label: string, entries: readonly JsonRecord[], expected: readonly string[]): readonly string[] {
  const violations: string[] = [];
  const ids = entries.map((entry) => entry['blindId']);
  if (ids.some((id) => typeof id !== 'string')) violations.push(`${label} has an entry without a blindId`);
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  violations.push(...[...repeated].sort().map((id) => `${label} has duplicate ${id}`));
  const expectedSet = new Set(expected);
  const missing = expected.filter((id) => !seen.has(id));
  const extra = [...seen].filter((id) => !expectedSet.has(id)).sort();
  if (missing.length === 0 && extra.length === 0) return violations;
  const parts = [
    ...(missing.length === 0 ? [] : [`lacks ${missing.join(', ')}`]),
    ...(extra.length === 0 ? [] : [`has unregistered ${extra.join(', ')}`]),
  ];
  if (parts.length > 0) violations.push(`${label} ${parts.join(' and ')}`);
  return violations;
}

function analysisOutcome(value: unknown): Luna6CellOutcome | null {
  switch (value) {
    case 'authorized': return 'executed';
    case 'refused': return 'refused';
    case 'execution_failed': return 'execution_failed';
    case 'service_null': return 'service_failed';
    case 'infrastructure_failed': return 'infrastructure_failed';
    default: return null;
  }
}

/** Reads the answer key's arm: exactly one of the two registered arm ids, or null (M75). */
function keyArm(value: unknown, high: Luna6ArmId, xhigh: Luna6ArmId): Luna6ArmId | null {
  return value === xhigh ? xhigh : value === high ? high : null;
}

const CASE_ID = /^case-(\d+)-(\d+)$/u;

/**
 * Joins every registered tag's packet, answer key and seat files (§3.7 stage 7): the same registered blind ids in
 * each (set equality), no duplicates, exactly the registered seats, only the two registered arms, both arms for every
 * case, integer components in range with `total` their sum. Throws `Luna6StudyRefusal` naming every violation.
 */
export function luna6ScoredCells(
  registration: Pick<Luna6EffortStudyRegistration, 'arms' | 'modes' | 'strata' | 'seats'>,
  documents: Readonly<Partial<Record<Luna6Tag, Luna6TagDocuments>>>,
): readonly Luna6ScoredCell[] {
  const high = luna6Arm(registration, 'high').id;
  const xhigh = luna6Arm(registration, 'xhigh').id;
  const requiredSeats = registration.seats;
  const violations: string[] = [];
  const joined: {
    tag: Luna6Tag;
    mode: Luna6Mode;
    stratumId: Luna6StratumId;
    packet: readonly JsonRecord[];
    armById: ReadonlyMap<string, Luna6ArmId>;
    seats: ReadonlyMap<Luna6Seat, ReadonlyMap<string, JsonRecord>>;
  }[] = [];
  for (const tag of luna6Tags(registration)) {
    const separator = tag.indexOf('-');
    const mode = tag.slice(0, separator) as Luna6Mode;
    const stratum = registration.strata.find((candidate) => candidate.id === tag.slice(separator + 1));
    if (stratum === undefined) throw new TypeError(`The registration has no stratum for ${tag}.`);
    const expected = blindIds(stratum.seeds.length * stratum.reps * registration.arms.length);
    const before = violations.length;
    const document = documents[tag];
    if (document === undefined) {
      violations.push(`documents for ${tag} are missing`);
      continue;
    }
    const packet = entriesOf(document.packet);
    const key = entriesOf(document.answerKey);
    if (packet === null) violations.push(`packet for ${tag} has no entries`);
    else violations.push(...idViolations(`packet for ${tag}`, packet, expected));
    if (key === null) violations.push(`answer key for ${tag} has no entries`);
    else violations.push(...idViolations(`answer key for ${tag}`, key, expected));
    const armById = new Map<string, Luna6ArmId>();
    const unregisteredArms = new Set<string>();
    for (const entry of key ?? []) {
      const arm = keyArm(entry['arm'], high, xhigh);
      if (arm === null) unregisteredArms.add(String(entry['arm']));
      else if (typeof entry['blindId'] === 'string') armById.set(entry['blindId'], arm);
    }
    violations.push(...[...unregisteredArms].sort().map((arm) => `answer key for ${tag} names unregistered arm ${arm}`));
    const seats = new Map<Luna6Seat, ReadonlyMap<string, JsonRecord>>();
    for (const seat of requiredSeats) {
      const value = document.seats[seat];
      if (value === undefined) {
        violations.push(`seat ${seat} for ${tag} is missing`);
        continue;
      }
      const entries = entriesOf(value);
      if (entries === null) {
        violations.push(`seat ${seat} for ${tag} has no entries`);
        continue;
      }
      violations.push(...idViolations(`seat ${seat} for ${tag}`, entries, expected));
      seats.set(seat, new Map(entries.flatMap((entry) =>
        typeof entry['blindId'] === 'string' ? [[entry['blindId'], entry] as const] : [])));
    }
    for (const [seat, value] of Object.entries(document.seats)) {
      if (value !== undefined && !(requiredSeats as readonly string[]).includes(seat)) {
        violations.push(`seat ${seat} for ${tag} is not a registered seat`);
      }
    }
    for (const entry of packet ?? []) {
      const caseId = String(entry['caseId']);
      const match = CASE_ID.exec(caseId);
      const room = Number(match?.[1]);
      const rep = Number(match?.[2]);
      if (match === null || room < 1 || room > stratum.seeds.length || rep < 1 || rep > stratum.reps) {
        violations.push(`${tag} ${String(entry['blindId'])} has out-of-grid caseId ${caseId}`);
      }
      if (analysisOutcome(entry['outcome']) === null) {
        violations.push(`${tag} ${String(entry['blindId'])} has unregistered outcome ${String(entry['outcome'])}`);
      }
    }
    if (violations.length === before && packet !== null) {
      joined.push({ tag, mode, stratumId: stratum.id, packet, armById, seats });
    }
  }
  if (violations.length > 0) throw new Luna6StudyRefusal(violations);
  for (const { tag, stratumId, packet, armById } of joined) {
    const stratum = registration.strata.find((candidate) => candidate.id === stratumId)!;
    const armsByCase = new Map<string, Set<Luna6ArmId>>();
    for (const entry of packet) {
      const caseId = String(entry['caseId']);
      const arm = armById.get(String(entry['blindId']));
      if (arm !== undefined) armsByCase.set(caseId, new Set([...(armsByCase.get(caseId) ?? []), arm]));
    }
    for (let room = 1; room <= stratum.seeds.length; room += 1) {
      for (let rep = 1; rep <= stratum.reps; rep += 1) {
        const caseId = `case-${String(room).padStart(2, '0')}-${String(rep)}`;
        for (const arm of [high, xhigh]) {
          if (!(armsByCase.get(caseId)?.has(arm) ?? false)) violations.push(`${tag} ${caseId} lacks arm ${arm}`);
        }
      }
    }
  }
  if (violations.length > 0) throw new Luna6StudyRefusal(violations);
  const cells: Luna6ScoredCell[] = [];
  for (const { tag, mode, stratumId, packet, armById, seats } of joined) {
    const stratum = registration.strata.find((candidate) => candidate.id === stratumId)!;
    for (const entry of packet) {
      const blindId = String(entry['blindId']);
      const match = CASE_ID.exec(String(entry['caseId']))!;
      const room = Number(match[1]);
      const rep = Number(match[2]);
      const outcome = analysisOutcome(entry['outcome'])!;
      const scores: Luna6SeatScore[] = [];
      if (outcome === 'executed') {
        for (const seat of requiredSeats) {
          const score = seats.get(seat)?.get(blindId);
          if (score === undefined) {
            violations.push(`seat ${seat} for ${tag} has no score for ${blindId}`);
            continue;
          }
          const components = {} as Record<D569PanelComponent, number>;
          let valid = true;
          for (const name of D569_PANEL_COMPONENTS) {
            const value = score[name];
            if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > COMPONENT_MAXIMA[name]) {
              violations.push(`seat ${seat} for ${tag} ${blindId}.${name} ${JSON.stringify(value) ?? 'absent'} ` +
                `is not an integer in 0..${String(COMPONENT_MAXIMA[name])}`);
              valid = false;
            } else {
              components[name] = value;
            }
          }
          if (!valid) continue;
          const sum = D569_PANEL_COMPONENTS.reduce((total, name) => total + components[name], 0);
          if (score['total'] !== sum) {
            violations.push(`seat ${seat} for ${tag} ${blindId}.total ${JSON.stringify(score['total']) ?? 'absent'} ` +
              `is not the sum ${String(sum)}`);
            continue;
          }
          scores.push({ seat, components });
        }
      }
      cells.push({
        mode, stratum: stratumId, basis: stratum.basis, seed: stratum.seeds[room - 1]!, rep,
        arm: armById.get(blindId)!, outcome, seats: scores,
      });
    }
  }
  if (violations.length > 0) throw new Luna6StudyRefusal(violations);
  return cells;
}

/** One component summed over the seats (a cell's component value is this over the seat count). */
function componentNumerator(name: D569PanelComponent): CellNumerator {
  return (cell, sa1Override) =>
    zeroInclusive(cell, sa1Override, () => cell.seats.reduce((sum, seat) => sum + seat.components[name], 0));
}

/** One seat's total (a per-seat diagnostic; its divisor is 1). */
function seatNumerator(seat: Luna6Seat): CellNumerator {
  return (cell, sa1Override) => zeroInclusive(cell, sa1Override, () => {
    const score = cell.seats.find((candidate) => candidate.seat === seat);
    return score === undefined ? null : seatTotal(score);
  });
}

/** Failure risk (§3.4 secondary): 1 for refused, execution_failed, service_failed or SA-1; 0 when executed. */
function failureIndicator(cell: Luna6ScoredCell, sa1Override: boolean): number | null {
  if (sa1Override) return 1;
  switch (cell.outcome) {
    case 'executed': return 0;
    case 'refused':
    case 'execution_failed':
    case 'service_failed':
      return 1;
    case 'infrastructure_failed':
      return null;
  }
}

function executedOnly(cell: Luna6ScoredCell, sa1Override: boolean): number | null {
  return cell.outcome === 'executed' && !sa1Override ? luna6CellNumerator(cell, false) : null;
}

export interface Luna6FloatDiagnostic {
  readonly mean: number;
  readonly lowerQstar: number;
  readonly upper975: number;
}

/** D569's floating cell value through `d569PanelValues`, bootstrapped as D569 does; reported only (D898 R6). */
function floatDiagnostic(
  registration: DecisionRule & Pick<Luna6EffortStudyRegistration, 'arms'>,
  cells: readonly Luna6ScoredCell[],
  ledger: readonly Luna6GuardLedgerKey[],
): Luna6FloatDiagnostic {
  const overrides = new Set(ledger.map(luna6LedgerKey));
  const xhigh = luna6Arm(registration, 'xhigh').id;
  const values = new Map<string, { seed: number; high?: number | null; xhigh?: number | null }>();
  for (const cell of cells) {
    const row: D569AnalysisRow = {
      arm: cell.arm, family: cell.stratum === 'hard2' || cell.stratum === 'brutal2' ? 'second' : 'primary',
      basis: cell.basis, seed: cell.seed, rep: cell.rep, outcome: cell.outcome,
      seats: cell.seats.map((seat) => ({ judge: seat.seat, components: seat.components })),
    };
    const value = overrides.has(luna6LedgerKey(cell)) ? 0 : d569PanelValues(row)?.total ?? null;
    const key = luna6PairName(cell);
    const pair = values.get(key) ?? { seed: cell.seed };
    if (cell.arm === xhigh) pair.xhigh = value;
    else pair.high = value;
    values.set(key, pair);
  }
  const clusters = new Map<number, number[]>();
  const differences: number[] = [];
  for (const pair of values.values()) {
    if (pair.high === null || pair.high === undefined || pair.xhigh === null || pair.xhigh === undefined) continue;
    const difference = pair.xhigh - pair.high;
    differences.push(difference);
    clusters.set(pair.seed, [...(clusters.get(pair.seed) ?? []), difference]);
  }
  const clusterRows = [...clusters.entries()].sort(([left], [right]) => left - right).map(([, rows]) => rows);
  const draws = d569ClusterBootstrapDraws(clusterRows, registration.resamples, registration.bootstrapSeed, (picked) => {
    const sampled = picked.flat();
    return sampled.reduce((sum, value) => sum + value, 0) / sampled.length;
  });
  draws.sort((left, right) => left - right);
  return {
    mean: differences.reduce((sum, value) => sum + value, 0) / differences.length,
    lowerQstar: d569Percentile(draws, registration.qStar),
    upper975: d569Percentile(draws, UPPER_QUANTILE),
  };
}

export interface Luna6Speed {
  readonly byArmMode: Readonly<Record<string, Luna6SpeedSummary>>;
  readonly byArm: Readonly<Record<string, Luna6SpeedSummary>>;
  readonly pairedTimeRatio: Luna6PairedTimeRatio;
  readonly tokensByArmMode: Readonly<Record<string, Luna6TokenSummary>>;
}

/** §3.6, per arm × mode and pooled per arm, from the final attempt of every pair. */
export function luna6Speed(
  registration: Pick<Luna6EffortStudyRegistration, 'arms' | 'modes'>,
  cells: readonly Luna6CellSpeed[],
): Luna6Speed {
  const byArmMode: Record<string, Luna6SpeedSummary> = {};
  const tokensByArmMode: Record<string, Luna6TokenSummary> = {};
  const byArm: Record<string, Luna6SpeedSummary> = {};
  for (const arm of registration.arms) {
    for (const mode of registration.modes) {
      const selected = cells.filter((cell) => cell.arm === arm.id && cell.mode === mode);
      byArmMode[`${arm.id}/${mode}`] = luna6SpeedSummary(selected.flatMap((cell) => cell.calls));
      tokensByArmMode[`${arm.id}/${mode}`] = luna6TokenSummary(selected.flatMap((cell) => cell.usage));
    }
    byArm[arm.id] = luna6SpeedSummary(cells.filter((cell) => cell.arm === arm.id).flatMap((cell) => cell.calls));
  }
  const high = luna6Arm(registration, 'high').id;
  const pairs = new Map<string, { high?: Luna6CellSpeed; xhigh?: Luna6CellSpeed }>();
  for (const cell of cells) {
    const key = luna6PairName(cell);
    const pair = pairs.get(key) ?? {};
    if (cell.arm === high) pair.high = cell;
    else pair.xhigh = cell;
    pairs.set(key, pair);
  }
  const timings: Luna6PairTiming[] = [...pairs.values()].flatMap((pair) =>
    pair.high === undefined || pair.xhigh === undefined ? [] : [{ high: pair.high.calls, xhigh: pair.xhigh.calls }]);
  return { byArmMode, byArm, pairedTimeRatio: luna6PairedTimeRatio(timings), tokensByArmMode };
}

export const LUNA6_SUPPLEMENTARY_STATUS =
  'supplementary, not preregistered: S-PREREG §3.4 reports the difference per mode and per basis' as const;

export interface Luna6StudyAnalysis {
  readonly decision: Luna6Decision['decision'];
  readonly delta: Luna6Decision['delta'];
  readonly pairs: number;
  readonly excludedPairs: number;
  readonly clusters: number;
  readonly sa1Overrides: number;
  readonly rule: {
    readonly margin: Luna6EffortStudyRegistration['margin'];
    readonly qStar: number;
    readonly resamples: number;
    readonly bootstrapSeed: number;
    readonly drawsAtOrBelowMargin: number;
    readonly rejectLimit: number;
  };
  /** S-PREREG §3.4's secondaries, reported and never deciding. */
  readonly secondary: {
    readonly perMode: Readonly<Record<Luna6Mode, Luna6Interval>>;
    /** A basis pools its two strata (D898 R2): hard is 5117xxx and 5118xxx, brutal 6203xxx and 6207xxx. */
    readonly perBasis: Readonly<Record<Luna6Basis, Luna6Interval>>;
    readonly executedOnly: Luna6Interval;
    readonly perComponent: Readonly<Record<string, Luna6Interval>>;
    readonly perSeat: Readonly<Record<string, Luna6Interval>>;
    readonly failureRisk: Luna6Interval;
    readonly withoutSa1: Luna6Interval;
    /** Secondary k draws with bootstrap seed + k, in the order this text lists. */
    readonly seedOffsets: string;
  };
  /** Reported beside the secondaries and not preregistered: the four strata, each a basis and a family. */
  readonly supplementary: {
    readonly status: typeof LUNA6_SUPPLEMENTARY_STATUS;
    readonly perStratum: Readonly<Record<Luna6StratumId, Luna6Interval>>;
  };
  readonly speed: Luna6Speed;
  readonly diagnostics: { readonly floatDelta: Luna6FloatDiagnostic };
}

/** Stage 7: packet, answer key and three seat files per tag, plus the guard ledger, to the decision (§3.4, §3.7). */
export function analyzeLuna6Study(input: {
  readonly registration: AnalysisRegistration;
  readonly documents: Readonly<Partial<Record<Luna6Tag, Luna6TagDocuments>>>;
  readonly ledger: readonly Luna6GuardLedgerKey[];
  readonly speed?: readonly Luna6CellSpeed[];
}): Luna6StudyAnalysis {
  const { registration, ledger } = input;
  const cells = luna6ScoredCells(registration, input.documents);
  const pairing = luna6PairDifferences(registration, cells, ledger);
  if (pairing.unmatchedLedger.length > 0) throw new Luna6StudyRefusal(pairing.unmatchedLedger);
  const decision = luna6Decision(pairing.pairs, registration);
  const divisor = registration.seats.length;
  let offset = 0;
  const interval = (
    numerator: CellNumerator,
    select: (pair: Luna6PairDifference) => boolean,
    pairDivisor: number,
    ledgerForPairs: readonly Luna6GuardLedgerKey[] = ledger,
  ): Luna6Interval => {
    offset += 1;
    const pairs = luna6PairDifferences(registration, cells, ledgerForPairs, numerator).pairs.filter(select);
    return luna6Interval(pairs, pairDivisor, registration.resamples, registration.bootstrapSeed + offset);
  };
  const all = (): boolean => true;
  const basisOf = new Map(registration.strata.map((stratum) => [stratum.id, stratum.basis]));
  const perMode = Object.fromEntries(registration.modes.map((mode) =>
    [mode, interval(luna6CellNumerator, (pair) => pair.mode === mode, divisor)])) as Record<Luna6Mode, Luna6Interval>;
  const perBasis = Object.fromEntries(LUNA6_BASES.map((basis) =>
    [basis, interval(luna6CellNumerator, (pair) => basisOf.get(pair.stratum) === basis, divisor)])) as
    Record<Luna6Basis, Luna6Interval>;
  const executed = interval(executedOnly, all, divisor);
  const perComponent = Object.fromEntries(D569_PANEL_COMPONENTS.map((name) =>
    [name, interval(componentNumerator(name), all, divisor)]));
  const perSeat = Object.fromEntries(registration.seats.map((seat) => [seat, interval(seatNumerator(seat), all, 1)]));
  const failureRisk = interval(failureIndicator, all, 1);
  const withoutSa1 = interval(luna6CellNumerator, all, divisor, []);
  const perStratum = Object.fromEntries(registration.strata.map((stratum) =>
    [stratum.id, interval(luna6CellNumerator, (pair) => pair.stratum === stratum.id, divisor)])) as
    Record<Luna6StratumId, Luna6Interval>;
  return {
    decision: decision.decision,
    delta: decision.delta,
    pairs: decision.pairs,
    excludedPairs: pairing.excludedPairs,
    clusters: decision.clusters,
    sa1Overrides: pairing.sa1Overrides,
    rule: {
      margin: registration.margin,
      qStar: registration.qStar,
      resamples: registration.resamples,
      bootstrapSeed: registration.bootstrapSeed,
      drawsAtOrBelowMargin: decision.drawsAtOrBelowMargin,
      rejectLimit: decision.rejectLimit,
    },
    secondary: {
      perMode, perBasis, executedOnly: executed, perComponent, perSeat, failureRisk, withoutSa1,
      seedOffsets: 'bootstrap seed + k, k = 1.. in the order modes, bases, executed-only, components, seats, ' +
        'failure risk, without SA-1, then the supplementary strata',
    },
    supplementary: { status: LUNA6_SUPPLEMENTARY_STATUS, perStratum },
    speed: luna6Speed(registration, input.speed ?? []),
    diagnostics: { floatDelta: floatDiagnostic(registration, cells, ledger) },
  };
}

/**
 * Stage 7 as the operator runs it: the guard ledger and the ingest report are checked against the registration and
 * each other (`luna6AnalysisInputs`) before the analysis, and the pairs the packets exclude must be the pairs the
 * ingest report excluded. Throws `Luna6StudyRefusal` naming every mismatch.
 */
export function analyzeLuna6StudyStage(input: {
  readonly registration: StageRegistration;
  readonly documents: Readonly<Partial<Record<Luna6Tag, Luna6TagDocuments>>>;
  readonly ledgerDocument: unknown;
  readonly reportDocument: unknown;
}): Luna6StudyAnalysis {
  const { ledger, report } = luna6AnalysisInputs(input.registration, input.ledgerDocument, input.reportDocument);
  const analysis = analyzeLuna6Study({ registration: input.registration, documents: input.documents, ledger, speed: report.speed });
  if (analysis.excludedPairs !== report.excludedPairs.length) {
    throw new Luna6StudyRefusal([
      `ingest report: excludes ${String(report.excludedPairs.length)} of its pairs; the packets exclude ` +
      `${String(analysis.excludedPairs)}`,
    ]);
  }
  return analysis;
}
