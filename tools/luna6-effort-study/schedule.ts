/**
 * The effort study's schedule (plan r5 §3.2 at D898 R2's 240 pairs): the pairs in canonical order, shuffled by
 * Fisher–Yates on D569's generator seeded with the registered P, each pair's two arms back to back in a seeded
 * random order, and every cell's exact arena command line (§3.1, D898 R1 and R5).
 */
import { d569Mulberry32 } from '../d569-blind-experiment';
import {
  luna6Arm,
  luna6ModeCap,
  type Luna6ArmId,
  type Luna6Basis,
  type Luna6EffortStudyRegistration,
  type Luna6Mode,
  type Luna6Stratum,
  type Luna6StratumId,
} from './registration';

export const LUNA6_SCHEDULE_SCHEMA = 'luna6-effort-schedule-v1' as const;
export const LUNA6_RERUNS_SCHEMA = 'luna6-effort-reruns-v1' as const;

/** One arm of one encounter seed, mode and rep: the unit that runs as one arena invocation. */
export interface Luna6CellIdentity {
  readonly mode: Luna6Mode;
  readonly stratum: Luna6StratumId;
  readonly seed: number;
  readonly rep: number;
  readonly arm: Luna6ArmId;
}

export type Luna6PairIdentity = Omit<Luna6CellIdentity, 'arm'>;

export interface Luna6ScheduleEntry extends Luna6CellIdentity {
  /** 1–480 in the schedule; 481 onward for reruns. */
  readonly ordinal: number;
  /** The pair's position in the shuffled order, 1–240. Its two cells share it and run back to back. */
  readonly pair: number;
  readonly basis: Luna6Basis;
  /** The seed's room in its stratum's arena invocation (`--rooms 10`), 1–10. */
  readonly room: number;
  /** `<room>:<rep>`: the arena's `--cells` value and the row's `scheduledCellKey`. */
  readonly cellKey: string;
  readonly argv: readonly string[];
}

export interface Luna6Schedule {
  readonly schema: typeof LUNA6_SCHEDULE_SCHEMA;
  readonly registration: Luna6EffortStudyRegistration['id'];
  readonly scheduleSeed: number;
  readonly env: Luna6EffortStudyRegistration['cellEnv'];
  readonly entries: readonly Luna6ScheduleEntry[];
}

export interface Luna6RerunEntry extends Luna6ScheduleEntry {
  /** The schedule ordinal this cell replaces. */
  readonly rerunOf: number;
}

/** The schedule's rerun section (§3.2 infrastructure rule), written once, after the scheduled cells have run. */
export interface Luna6Reruns {
  readonly schema: typeof LUNA6_RERUNS_SCHEMA;
  readonly registration: Luna6EffortStudyRegistration['id'];
  readonly scheduleSha256: string;
  readonly entries: readonly Luna6RerunEntry[];
}

type ScheduleRegistration = Pick<
  Luna6EffortStudyRegistration,
  'id' | 'arms' | 'modes' | 'strata' | 'cells' | 'pairs' | 'caps' | 'codexBin' | 'kb' | 'studyRoot' | 'cellEnv'
>;

const BASIS_ORDER: readonly Luna6Basis[] = ['hard', 'brutal'];

export function luna6CellName(cell: Luna6CellIdentity): string {
  return `${cell.mode} ${cell.stratum} ${String(cell.seed)} rep ${String(cell.rep)} ${cell.arm}`;
}

export function luna6PairName(pair: Luna6PairIdentity): string {
  return `${pair.mode} ${pair.stratum} ${String(pair.seed)} rep ${String(pair.rep)}`;
}

export function luna6StratumOfSeed(
  registration: Pick<Luna6EffortStudyRegistration, 'strata'>,
  seed: number,
): Luna6Stratum | null {
  return registration.strata.find((stratum) => stratum.seeds.includes(seed)) ?? null;
}

/**
 * The pairs in canonical order (D898 R2): basis hard before brutal (hard is 5117xxx then 5118xxx), mode blind before
 * advice, seed ascending, rep ascending.
 */
export function luna6CanonicalPairs(
  registration: Pick<Luna6EffortStudyRegistration, 'modes' | 'strata'>,
): readonly Luna6PairIdentity[] {
  return BASIS_ORDER.flatMap((basis) => {
    const seeds = registration.strata
      .filter((stratum) => stratum.basis === basis)
      .flatMap((stratum) => stratum.seeds.map((seed) => ({ seed, stratum })))
      .sort((left, right) => left.seed - right.seed);
    return registration.modes.flatMap((mode) => seeds.flatMap(({ seed, stratum }) =>
      Array.from({ length: stratum.reps }, (_unused, index): Luna6PairIdentity => ({
        mode, stratum: stratum.id, seed, rep: index + 1,
      }))));
  });
}

/** Every registered cell, pairs in canonical order and the high arm first. */
export function luna6GridCells(
  registration: Pick<Luna6EffortStudyRegistration, 'modes' | 'strata' | 'arms'>,
): readonly Luna6CellIdentity[] {
  return luna6CanonicalPairs(registration).flatMap((pair) =>
    registration.arms.map((arm): Luna6CellIdentity => ({ ...pair, arm: arm.id })));
}

/** Grid violations of a list of cells against the registered grid: unregistered, repeated and missing cells. */
export function luna6GridViolations(
  cells: readonly Luna6CellIdentity[],
  registration: Pick<Luna6EffortStudyRegistration, 'modes' | 'strata' | 'arms' | 'cells'>,
): readonly string[] {
  const expected = luna6GridCells(registration);
  const violations: string[] = [];
  if (expected.length !== registration.cells) {
    violations.push(`the registered grid has ${String(expected.length)} cells, registered ${String(registration.cells)}`);
  }
  const expectedNames = new Set(expected.map(luna6CellName));
  const counts = new Map<string, number>();
  for (const cell of cells) counts.set(luna6CellName(cell), (counts.get(luna6CellName(cell)) ?? 0) + 1);
  for (const [name, count] of counts) {
    if (!expectedNames.has(name)) violations.push(`unregistered cell ${name}`);
    else if (count > 1) violations.push(`cell ${name} appears ${String(count)} times`);
  }
  const missing = expected.filter((cell) => !counts.has(luna6CellName(cell)));
  if (missing.length > 0) violations.push(...missing.map((cell) => `the grid lacks cell ${luna6CellName(cell)}`));
  return violations;
}

function stratumOf(registration: Pick<Luna6EffortStudyRegistration, 'strata'>, id: Luna6StratumId): Luna6Stratum {
  const stratum = registration.strata.find((candidate) => candidate.id === id);
  if (stratum === undefined) throw new TypeError(`The registration has no stratum ${id}.`);
  return stratum;
}

function effortOf(registration: Pick<Luna6EffortStudyRegistration, 'arms'>, arm: Luna6ArmId): 'high' | 'xhigh' {
  const registered = registration.arms.find((candidate) => candidate.id === arm);
  if (registered === undefined) throw new TypeError(`The registration has no arm ${arm}.`);
  return registered.effort;
}

/** The cell's output file: named by ordinal only, so no file name carries an arm or an effort (§3.1). */
export function luna6CellOutPath(registration: Pick<Luna6EffortStudyRegistration, 'studyRoot'>, ordinal: number): string {
  return `${registration.studyRoot}/cells/${String(ordinal).padStart(3, '0')}.jsonl`;
}

/** The exact §3.1 cell command, with D898 R1's `--basis-dir` for the second family and R5's codex binary. */
export function luna6CellArgv(
  registration: ScheduleRegistration,
  cell: Luna6CellIdentity,
  ordinal: number,
): readonly string[] {
  const stratum = stratumOf(registration, cell.stratum);
  const room = stratum.seeds.indexOf(cell.seed) + 1;
  const firstSeed = stratum.seeds[0];
  if (room === 0 || firstSeed === undefined) {
    throw new TypeError(`Seed ${String(cell.seed)} is not in the registered ${stratum.id} cohort.`);
  }
  return [
    'node', 'node_modules/vite-node/vite-node.mjs', 'tools/ai-dm-arena.ts', '--',
    '--rooms', String(stratum.seeds.length), '--reps', String(stratum.reps),
    '--seed', String(firstSeed), '--basis', stratum.basis,
    ...(stratum.basisDir === null ? [] : ['--basis-dir', stratum.basisDir]),
    '--cells', `${String(room)}:${String(cell.rep)}`,
    '--out', luna6CellOutPath(registration, ordinal),
    '--dm-mode', cell.mode,
    ...(cell.mode === 'blind'
      ? ['--blind-repair-arm', 'code_only', '--blind-max-attempts', '3', '--blind-facts', 'off']
      : []),
    '--cli', 'codex', '--cli-bin', registration.codexBin,
    '--model', 'gpt-6-luna', '--effort', effortOf(registration, cell.arm),
    '--instruction-source', 'kb', '--kb', registration.kb,
    '--transport', 'mcp_minimal', '--board-image', 'png',
    '--turn-context-max-bytes', String(luna6ModeCap(registration.caps, cell.mode)),
    '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'derived_v1',
    '--party-policy', 'symmetric_evaluator_v1', '--override-policy', 'typed_reason',
    '--reaction-ask-default', 'decline', '--intel-mode', 'full',
  ];
}

function scheduleEntry(
  registration: ScheduleRegistration,
  cell: Luna6CellIdentity,
  ordinal: number,
  pair: number,
): Luna6ScheduleEntry {
  const stratum = stratumOf(registration, cell.stratum);
  const room = stratum.seeds.indexOf(cell.seed) + 1;
  return {
    ordinal,
    pair,
    mode: cell.mode,
    stratum: cell.stratum,
    seed: cell.seed,
    rep: cell.rep,
    arm: cell.arm,
    basis: stratum.basis,
    room,
    cellKey: `${String(room)}:${String(cell.rep)}`,
    argv: luna6CellArgv(registration, cell, ordinal),
  };
}

/**
 * Builds the schedule (D898 R2): the canonical pairs are shuffled with Fisher–Yates driven by `mulberry32(seed)`
 * (for i from n − 1 down to 1, j = floor(g()·(i + 1))); then, walking the shuffled pairs, the same generator draws
 * `xhighFirst = g() < 0.5` for each pair, whose two cells are emitted back to back in that order.
 */
export function buildLuna6Schedule(registration: ScheduleRegistration, seed: number): Luna6Schedule {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new TypeError('The schedule seed must be a nonnegative safe integer.');
  const pairs = [...luna6CanonicalPairs(registration)];
  if (pairs.length !== registration.pairs) {
    throw new TypeError(`The registered strata give ${String(pairs.length)} pairs, registered ${String(registration.pairs)}.`);
  }
  const g = d569Mulberry32(seed);
  for (let index = pairs.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(g() * (index + 1));
    [pairs[index], pairs[swap]] = [pairs[swap]!, pairs[index]!];
  }
  const high = luna6Arm(registration, 'high').id;
  const xhigh = luna6Arm(registration, 'xhigh').id;
  const firsts: Luna6CellIdentity[] = [];
  const seconds: Luna6CellIdentity[] = [];
  for (const pair of pairs) {
    const xhighFirst = g() < 0.5;
    firsts.push({ ...pair, arm: xhighFirst ? xhigh : high });
    seconds.push({ ...pair, arm: xhighFirst ? high : xhigh });
  }
  const ordered = pairs.flatMap((_pair, index) => [firsts[index]!, seconds[index]!]);
  return {
    schema: LUNA6_SCHEDULE_SCHEMA,
    registration: registration.id,
    scheduleSeed: seed,
    env: registration.cellEnv,
    entries: ordered.map((cell, index) => scheduleEntry(registration, cell, index + 1, Math.floor(index / 2) + 1)),
  };
}

/**
 * The rerun section for the pairs that need one (§3.2): each pair's two cells again, in their original order,
 * numbered after the schedule's last ordinal in the order of the pairs' original ordinals.
 */
export function buildLuna6Reruns(
  registration: ScheduleRegistration,
  schedule: Luna6Schedule,
  scheduleSha256: string,
  pairsToRerun: readonly number[],
): Luna6Reruns {
  const wanted = new Set(pairsToRerun);
  const originals = schedule.entries.filter((entry) => wanted.has(entry.pair));
  if (originals.length !== wanted.size * 2) {
    throw new TypeError('Every rerun pair must be a scheduled pair with two cells.');
  }
  const firstOrdinal = schedule.entries.length + 1;
  return {
    schema: LUNA6_RERUNS_SCHEMA,
    registration: registration.id,
    scheduleSha256,
    entries: originals.map((entry, index): Luna6RerunEntry => ({
      ...scheduleEntry(registration, entry, firstOrdinal + index, entry.pair),
      rerunOf: entry.ordinal,
    })),
  };
}
