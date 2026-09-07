import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { canonicalJson } from '../src/commands/canonical-json';
import { combatantSpace } from '../src/combat/combat-rules';
import { rasterizeInterveningCells, traceCombatantLine } from '../src/combat/cover';
import { minimumSpaceLine } from '../src/combat/creature-space';
import type { EncounterState } from '../src/combat/encounter';
import type { GridCell } from '../src/combat/grid';
import { TERRAIN_KINDS, TERRAIN_PROFILES, coverRank, type CoverTier } from '../src/combat/terrain';
import type { CombatantId } from '../src/combat/values';
import { sha256 } from '../src/crypto/sha256';
import { decodeArenaFixtureText } from '../src/vtt/mcp/entrypoint';
import { generateRoom } from '../src/vtt/room-generator';

export const LOS_COVER_ERA_AUDIT_VERSION = 'd576-los-cover-era-audit-v1' as const;
export const LOS_COVER_ENGINE_REVISION = 'd576-i1a-corner-rule-v1' as const;

export type EraAuditFamily = 'hard' | 'brutal' | 'brutal-b' | 'pool';

const HARD_SEEDS = Array.from({ length: 13 }, (_unused, index) => 5_117_001 + index);
const BRUTAL_SEEDS = Array.from({ length: 10 }, (_unused, index) => 6_203_001 + index);
const BRUTAL_B_SEEDS = Array.from({ length: 10 }, (_unused, index) => 6_206_001 + index);
const POOL_SEEDS = Array.from({ length: 30 }, (_unused, index) => 6_208_001 + index);
export const ERA_AUDIT_ROOM_COUNT = 63 as const;

const ALL_TRANSITIONS = [
  'none->none', 'none->half', 'none->three_quarters', 'none->total',
  'half->none', 'half->half', 'half->three_quarters', 'half->total',
  'three_quarters->none', 'three_quarters->half', 'three_quarters->three_quarters', 'three_quarters->total',
  'total->none', 'total->half', 'total->three_quarters', 'total->total',
] as const;
export type TierTransition = (typeof ALL_TRANSITIONS)[number];

export interface EraAuditCounts {
  readonly denominator: number;
  readonly line_of_sight_changed: number;
  readonly cover_tier_changed: number;
  readonly either_changed: number;
  readonly tier_transitions: Readonly<Record<TierTransition, number>>;
}

export interface EraAuditRoomRow extends EraAuditCounts {
  readonly family: EraAuditFamily;
  readonly seed: number;
  readonly room: number;
  readonly fixture_hash: string;
}

export interface EraAuditReport {
  readonly script_version: typeof LOS_COVER_ERA_AUDIT_VERSION;
  readonly engine_revision: typeof LOS_COVER_ENGINE_REVISION;
  readonly terrain_profiles: Readonly<Record<(typeof TERRAIN_KINDS)[number], {
    readonly cover_tier: CoverTier;
    readonly passability: 'open' | 'difficult' | 'blocked';
    readonly blocks_sight: boolean;
  }>>;
  readonly rooms: readonly EraAuditRoomRow[];
  readonly families: Readonly<Record<EraAuditFamily, EraAuditCounts>>;
  readonly overall: EraAuditCounts;
}

export interface EraAuditRoomInput {
  readonly family: EraAuditFamily;
  readonly seed: number;
  readonly room: number;
  readonly fixtureHash: string;
  readonly state: EncounterState;
}

interface CornerPoint {
  readonly column: number;
  readonly row: number;
}

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {
  const minimumColumn = Math.min(...cells.map((cell) => cell.column));
  const maximumColumn = Math.max(...cells.map((cell) => cell.column)) + 1;
  const minimumRow = Math.min(...cells.map((cell) => cell.row));
  const maximumRow = Math.max(...cells.map((cell) => cell.row)) + 1;
  return [
    { column: minimumColumn, row: minimumRow },
    { column: maximumColumn, row: minimumRow },
    { column: minimumColumn, row: maximumRow },
    { column: maximumColumn, row: maximumRow },
  ];
}

function cellCorners(cells: readonly GridCell[]): readonly CornerPoint[] {
  const values = cells.flatMap((cell) => [
    { column: cell.column, row: cell.row },
    { column: cell.column + 1, row: cell.row },
    { column: cell.column, row: cell.row + 1 },
    { column: cell.column + 1, row: cell.row + 1 },
  ]);
  return [...new Map(values.map((point) => [cellKey(point), point] as const)).values()];
}

function axisIntersection(start: number, delta: number, minimum: number, maximum: number): readonly [number, number] | null {
  if (delta === 0) return start > minimum && start < maximum
    ? [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]
    : null;
  const first = (minimum - start) / delta;
  const second = (maximum - start) / delta;
  return first <= second ? [first, second] : [second, first];
}

function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {
  const epsilon = 1e-9;
  const column = axisIntersection(from.column, to.column - from.column, cell.column + epsilon, cell.column + 1 - epsilon);
  const row = axisIntersection(from.row, to.row - from.row, cell.row + epsilon, cell.row + 1 - epsilon);
  if (column === null || row === null) return false;
  const entry = Math.max(0, column[0], row[0]);
  const exit = Math.min(1, column[1], row[1]);
  return entry <= exit && exit > 0 && entry < 1;
}

/** Frozen pre-D576 oracle. Production code must never import this audit-only export. */
export function legacyLineResult(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
): { readonly lineOfSight: boolean; readonly tier: CoverTier } {
  const source = combatantSpace(state, sourceId);
  const target = combatantSpace(state, targetId);
  const nearest = minimumSpaceLine(source, target);
  const sightBlockers = new Set(state.worldObjects
    .flatMap((object) => object.blocking.lineOfSight ? object.footprint : [])
    .map(cellKey));
  const lineOfSight = rasterizeInterveningCells(nearest.sourceCell, nearest.targetCell)
    .every((cell) => !sightBlockers.has(cellKey(cell)));

  let objectTier: CoverTier = 'total';
  for (const sourceCell of source.cells) {
    for (const targetCell of target.cells) {
      let rayTier: CoverTier = 'none';
      for (const cell of rasterizeInterveningCells(sourceCell, targetCell)) {
        for (const object of state.worldObjects) {
          if (object.footprint.some((occupied) => cellKey(occupied) === cellKey(cell)) &&
            coverRank(object.blocking.cover) > coverRank(rayTier)) rayTier = object.blocking.cover;
        }
      }
      if (coverRank(rayTier) < coverRank(objectTier)) objectTier = rayTier;
    }
  }

  const intervening = state.combatants.flatMap((candidate) => {
    const id = candidate.profile.id;
    if (id === sourceId || id === targetId || candidate.life === 'dead' ||
      !state.tokens.some((token) => token.combatantId === id)) return [];
    return [{ id, cells: combatantSpace(state, id).cells }];
  });
  const targetCorners = outerCorners(target.cells);
  let creatureCovered = intervening.length > 0;
  for (const sourceCorner of cellCorners(source.cells)) {
    const rayCovered = intervening.some((creature) => targetCorners.some((targetCorner) =>
      creature.cells.some((cell) => cornerLineCrossesCell(sourceCorner, targetCorner, cell))));
    if (!rayCovered) {
      creatureCovered = false;
      break;
    }
  }
  const tier = coverRank(objectTier) >= coverRank(creatureCovered ? 'half' : 'none')
    ? objectTier
    : 'half';
  return { lineOfSight, tier };
}

function emptyTransitions(): Record<TierTransition, number> {
  return Object.fromEntries(ALL_TRANSITIONS.map((transition) => [transition, 0])) as Record<TierTransition, number>;
}

function emptyCounts(): EraAuditCounts {
  return {
    denominator: 0,
    line_of_sight_changed: 0,
    cover_tier_changed: 0,
    either_changed: 0,
    tier_transitions: emptyTransitions(),
  };
}

export function auditEncounterState(state: EncounterState): EraAuditCounts {
  const ids = state.combatants
    .filter((combatant) => combatant.life !== 'dead' && state.tokens.some((token) => token.combatantId === combatant.profile.id))
    .map((combatant) => combatant.profile.id)
    .sort((left, right) => String(left).localeCompare(String(right)));
  const counts = emptyCounts();
  const transitions = { ...counts.tier_transitions };
  let denominator = 0;
  let lineOfSightChanged = 0;
  let coverTierChanged = 0;
  let eitherChanged = 0;
  for (const source of ids) {
    for (const target of ids) {
      if (source === target) continue;
      denominator += 1;
      const legacy = legacyLineResult(state, source, target);
      const current = traceCombatantLine(state, source, target);
      const sightChanged = legacy.lineOfSight === current.blocksSight;
      const coverChanged = legacy.tier !== current.tier;
      if (sightChanged) lineOfSightChanged += 1;
      if (coverChanged) coverTierChanged += 1;
      if (sightChanged || coverChanged) eitherChanged += 1;
      const transition = `${legacy.tier}->${current.tier}` as TierTransition;
      transitions[transition] += 1;
    }
  }
  return {
    denominator,
    line_of_sight_changed: lineOfSightChanged,
    cover_tier_changed: coverTierChanged,
    either_changed: eitherChanged,
    tier_transitions: transitions,
  };
}

function addCounts(left: EraAuditCounts, right: EraAuditCounts): EraAuditCounts {
  const transitions = emptyTransitions();
  for (const transition of ALL_TRANSITIONS) {
    transitions[transition] = left.tier_transitions[transition] + right.tier_transitions[transition];
  }
  return {
    denominator: left.denominator + right.denominator,
    line_of_sight_changed: left.line_of_sight_changed + right.line_of_sight_changed,
    cover_tier_changed: left.cover_tier_changed + right.cover_tier_changed,
    either_changed: left.either_changed + right.either_changed,
    tier_transitions: transitions,
  };
}

export function buildEraAuditReportFromRooms(inputs: readonly EraAuditRoomInput[]): EraAuditReport {
  const rooms = inputs.map((input): EraAuditRoomRow => ({
    family: input.family,
    seed: input.seed,
    room: input.room,
    fixture_hash: input.fixtureHash,
    ...auditEncounterState(input.state),
  }));
  const familyCounts = (['hard', 'brutal', 'brutal-b', 'pool'] as const).map((family) => [
    family,
    rooms.filter((row) => row.family === family).reduce<EraAuditCounts>(addCounts, emptyCounts()),
  ] as const);
  const families = Object.fromEntries(familyCounts) as Readonly<Record<EraAuditFamily, EraAuditCounts>>;
  return {
    script_version: LOS_COVER_ERA_AUDIT_VERSION,
    engine_revision: LOS_COVER_ENGINE_REVISION,
    terrain_profiles: Object.fromEntries(TERRAIN_KINDS.map((kind) => [kind, {
      cover_tier: TERRAIN_PROFILES[kind].coverTier,
      passability: TERRAIN_PROFILES[kind].passability,
      blocks_sight: TERRAIN_PROFILES[kind].blocksSight,
    }])) as EraAuditReport['terrain_profiles'],
    rooms,
    families,
    overall: rooms.reduce<EraAuditCounts>(addCounts, emptyCounts()),
  };
}

async function fixtureRoom(family: Exclude<EraAuditFamily, 'pool'>, seed: number): Promise<{ readonly state: EncounterState; readonly bytes: string }> {
  const path = resolve(`tests/fixtures/arena-basis-${family}/seed-${String(seed)}.json`);
  const bytes = await readFile(path, 'utf8');
  return { state: decodeArenaFixtureText(bytes), bytes };
}

export async function buildEraAuditReport(): Promise<EraAuditReport> {
  const definitions = [
    ['hard', HARD_SEEDS],
    ['brutal', BRUTAL_SEEDS],
    ['brutal-b', BRUTAL_B_SEEDS],
    ['pool', POOL_SEEDS],
  ] as const;
  const inputs: EraAuditRoomInput[] = [];
  for (const [family, seeds] of definitions) {
    for (const [index, seed] of seeds.entries()) {
      const loaded = family === 'pool'
        ? (() => {
            const room = generateRoom(seed, { difficulty: 'brutal' });
            const bytes = `${canonicalJson(room)}\n`;
            return { state: room.encounter.state, bytes };
          })()
        : await fixtureRoom(family, seed);
      inputs.push({
        family,
        seed,
        room: index + 1,
        fixtureHash: sha256(loaded.bytes),
        state: loaded.state,
      });
    }
  }
  if (inputs.length !== ERA_AUDIT_ROOM_COUNT) throw new Error(`Era audit expected 63 rooms, received ${String(inputs.length)}.`);
  return buildEraAuditReportFromRooms(inputs);
}

async function main(): Promise<void> {
  process.stdout.write(`${canonicalJson(await buildEraAuditReport())}\n`);
}

const invokedDirectly = process.argv.slice(1).some((argument) =>
  argument.endsWith('/los-cover-era-audit.ts') || argument.endsWith('\\los-cover-era-audit.ts'));
if (invokedDirectly) {
  await main();
}
