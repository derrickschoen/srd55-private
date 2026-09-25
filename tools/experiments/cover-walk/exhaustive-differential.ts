/**
 * PERF-02 cover6 exhaustive differential: experiment evidence, NOT a gate test.
 *
 * Compares src/combat/cover.ts (the exact lattice walk, the typed line verdict, no trace
 * caches) against the FROZEN copy of the pre-walk code in tests/helpers/reference-cover.ts,
 * over every fixture encounter, generated los_cover_v1 and brutal rooms, and a densified
 * variant of each (random extra walls and cover objects). Every comparison is of JSON bytes,
 * so key order is part of the answer; a thrown error compares by class and message.
 *
 *   node node_modules/vite-node/vite-node.mjs tools/experiments/cover-walk/exhaustive-differential.ts <out.json> [first:end]
 *
 * `first:end` selects base states by index (each base state also yields its densified
 * variant); omit it for all of them. The rasterizer section runs only in the shard that
 * starts at 0.
 *
 * Sections, each of which can fail the run:
 * - raster: rasterizeCornerLine on every lattice ray in a window against every cell of a
 *   larger window, random long rays, and duplicate candidates;
 * - pairs: every ordered pair of placed creatures: full trace, coverBetweenCombatants, and
 *   the verdict against the reference trace's verdict fields;
 * - toCells: every placed creature to every cell, trace and verdict;
 * - anchored: every placed creature from every in-bounds anchor to every other placed
 *   creature, trace and verdict;
 * - anchoredToCells: the same anchors to four sampled cells each, trace and verdict;
 * - terrain: 400 random cell pairs, traceTerrainLine and terrainLineVerdict;
 * - objects: 100 random cell pairs, coverTierBetweenObjects;
 * - shapes: a multi-cell target list and an empty one (which must throw alike).
 * The run exits 0 only when every section compared something and nothing differed, and
 * every fixture file was either decoded or is a known provenance sidecar.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as candidate from '../../../src/combat/cover';
import type { EncounterState } from '../../../src/combat/encounter';
import type { GridCell } from '../../../src/combat/grid';
import type { CombatantId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import { terrainBlocking } from '../../../src/combat/terrain';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import { decodeChallengeRoomProvenanceV1 } from '../../../src/vtt/challenge-room-fixture';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { generateRoom } from '../../../src/vtt/room-generator';
import * as reference from '../../../tests/helpers/reference-cover';

const outPath = process.argv[2];
if (outPath === undefined) throw new Error('usage: exhaustive-differential.ts <out.json> [first:end]');
const range = process.argv[3]?.split(':').map(Number);
const firstState = range?.[0] ?? 0;
const endState = range?.[1] ?? Number.POSITIVE_INFINITY;

const DIRS = [
  'arena-basis', 'arena-basis-brutal', 'arena-basis-brutal-2', 'arena-basis-brutal-b', 'arena-basis-challenge',
  'arena-basis-hard', 'arena-basis-hard-2', 'arena-basis-los-cover-v1',
];
const CHALLENGE_DIR = 'arena-basis-challenge';

interface BaseState {
  readonly label: string;
  readonly load: () => Promise<EncounterState>;
}

const coverage = { filesSeen: 0, sidecars: [] as string[], fixtures: [] as string[], generated: [] as string[] };

/** Every fixture file is an encounter or a provenance sidecar; anything else fails the run. */
function baseStates(): BaseState[] {
  const bases: BaseState[] = [];
  for (const dir of DIRS) {
    for (const file of readdirSync(`tests/fixtures/${dir}`).sort()) {
      const label = `${dir}/${file}`;
      const path = `tests/fixtures/${label}`;
      coverage.filesSeen += 1;
      if (dir === CHALLENGE_DIR && /^seed-\d+\.provenance\.json$/.test(file)) {
        decodeChallengeRoomProvenanceV1(JSON.parse(readFileSync(path, 'utf8')) as unknown);
        coverage.sidecars.push(label);
        continue;
      }
      if (!/^seed-\d+\.json$/.test(file)) throw new Error(`Unexpected fixture file ${label}.`);
      coverage.fixtures.push(label);
      bases.push({
        label,
        load: dir === CHALLENGE_DIR
          ? () => Promise.resolve(decodeArenaBasisEnvelopeV1(JSON.parse(readFileSync(path, 'utf8')) as unknown, {
              mode: 'challenge',
            }).encounter.state)
          : () => loadArenaFixture(path),
      });
    }
  }
  for (const difficulty of ['standard', 'hard', 'brutal'] as const) {
    for (let seed = 0; seed < 24; seed += 1) {
      const label = `los_cover_v1/${difficulty}/${String(seed)}`;
      coverage.generated.push(label);
      bases.push({
        label,
        load: () => Promise.resolve(generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' }).encounter.state),
      });
    }
  }
  for (let index = 0; index < 10; index += 1) {
    const seed = 6_206_001 + index;
    const label = `brutal/${String(seed)}`;
    coverage.generated.push(label);
    bases.push({ label, load: () => Promise.resolve(generateRoom(seed, { difficulty: 'brutal' }).encounter.state) });
  }
  return bases;
}

/** Deterministic PRNG (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TERRAIN_KINDS = ['half_cover', 'three_quarters_cover', 'wall', 'open'] as const;

/** A denser variant: random walls off the tokens' anchors, and random one- or two-cell cover objects. */
function densify(state: EncounterState, seed: number): EncounterState {
  const next = random(seed);
  const pick = (): GridCell => ({
    column: Math.floor(next() * state.bounds.columns),
    row: Math.floor(next() * state.bounds.rows),
  });
  const anchors = new Set(state.tokens.map((token) => `${String(token.position.column)},${String(token.position.row)}`));
  const blockedCells = [...state.blockedCells];
  for (let index = 0; index < 12; index += 1) {
    const cell = pick();
    if (!anchors.has(`${String(cell.column)},${String(cell.row)}`)) blockedCells.push(cell);
  }
  const worldObjects: WorldObject[] = [...state.worldObjects];
  for (let index = 0; index < 6; index += 1) {
    const position = pick();
    const kind = TERRAIN_KINDS[Math.floor(next() * TERRAIN_KINDS.length)] ?? 'open';
    worldObjects.push({
      id: worldObjectId(`object:dense-${String(seed)}-${String(index)}`),
      name: 'dense',
      kind: 'cover',
      position,
      footprint: next() < 0.5 ? [position] : [position, { column: position.column + 1, row: position.row }],
      durability: { kind: 'indestructible' },
      armorClass: armorClass(15),
      damageResponses: [],
      blocking: terrainBlocking(kind),
      createdRevision: 0,
    });
  }
  return { ...state, blockedCells, worldObjects };
}

function placedIds(state: EncounterState): CombatantId[] {
  return state.combatants
    .filter((combatant) => state.tokens.some((token) => token.combatantId === combatant.profile.id))
    .map((combatant) => combatant.profile.id);
}

function outcome(run: () => unknown): string {
  try {
    return JSON.stringify(run());
  } catch (error) {
    const name = error instanceof Error ? error.constructor.name : typeof error;
    return `THROW ${name}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

interface VerdictFields {
  readonly sourceCell: GridCell;
  readonly targetCell: GridCell;
  readonly tier: string;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
}

function verdictFields(line: VerdictFields): VerdictFields {
  return {
    sourceCell: line.sourceCell,
    targetCell: line.targetCell,
    tier: line.tier,
    blocksSight: line.blocksSight,
    sourceIds: line.sourceIds,
  };
}

const SECTIONS = ['raster', 'pairs', 'toCells', 'anchored', 'anchoredToCells', 'terrain', 'objects', 'shapes'] as const;
type SectionName = (typeof SECTIONS)[number];
const totals = Object.fromEntries(SECTIONS.map((name) => [name, { compared: 0, mismatches: 0 }])) as
  Record<SectionName, { compared: number; mismatches: number }>;
const examples: unknown[] = [];

function compare(section: SectionName, label: string, expected: string, actual: string): void {
  totals[section].compared += 1;
  if (expected === actual) return;
  totals[section].mismatches += 1;
  if (examples.length < 12) {
    examples.push({ section, label, expected: expected.slice(0, 600), actual: actual.slice(0, 600) });
  }
}

function rasterSection(): void {
  const cells: GridCell[] = [];
  for (let row = -3; row <= 12; row += 1) for (let column = -3; column <= 12; column += 1) cells.push({ column, row });
  const points: GridCell[] = [];
  for (let row = -2; row <= 11; row += 1) for (let column = -2; column <= 11; column += 1) points.push({ column, row });
  for (const from of points) {
    for (const to of points) {
      compare('raster', `${JSON.stringify(from)}->${JSON.stringify(to)}`,
        outcome(() => reference.rasterizeCornerLine(from, to, cells)),
        outcome(() => candidate.rasterizeCornerLine(from, to, cells)));
    }
  }
  const next = random(7);
  for (let index = 0; index < 3_000; index += 1) {
    const from = { column: Math.floor(next() * 80) - 10, row: Math.floor(next() * 80) - 10 };
    const to = { column: Math.floor(next() * 80) - 10, row: Math.floor(next() * 80) - 10 };
    const box: GridCell[] = [];
    for (let row = Math.min(from.row, to.row) - 1; row <= Math.max(from.row, to.row) + 1; row += 1) {
      for (let column = Math.min(from.column, to.column) - 1; column <= Math.max(from.column, to.column) + 1; column += 1) {
        box.push({ column, row });
      }
    }
    compare('raster', `long ${String(index)}`,
      outcome(() => reference.rasterizeCornerLine(from, to, box)),
      outcome(() => candidate.rasterizeCornerLine(from, to, box)));
  }
  const duplicates = [{ column: 1, row: 1 }, { column: 2, row: 1 }, { column: 1, row: 1 }];
  compare('raster', 'duplicates',
    outcome(() => reference.rasterizeCornerLine({ column: 0, row: 0 }, { column: 4, row: 3 }, duplicates)),
    outcome(() => candidate.rasterizeCornerLine({ column: 0, row: 0 }, { column: 4, row: 3 }, duplicates)));
}

/** Four target cells per (mover, anchor): the anchor's reflection through the mover's cell, then three pseudo-random. */
function sampledTargets(state: EncounterState, current: GridCell, anchor: GridCell, salt: number): GridCell[] {
  const cells: GridCell[] = [];
  const reflected = { column: 2 * current.column - anchor.column, row: 2 * current.row - anchor.row };
  if (reflected.column >= 0 && reflected.column < state.bounds.columns &&
    reflected.row >= 0 && reflected.row < state.bounds.rows) cells.push(reflected);
  const size = state.bounds.columns * state.bounds.rows;
  for (let k = 1; cells.length < 4; k += 1) {
    const index = (salt * 7_919 + k * 104_729 + anchor.row * 131 + anchor.column * 17) % size;
    cells.push({ column: index % state.bounds.columns, row: Math.floor(index / state.bounds.columns) });
  }
  return cells;
}

function stateSections(label: string, state: EncounterState, salt: number): void {
  const ids = placedIds(state);
  for (const a of ids) {
    for (const b of ids) {
      if (a === b) continue;
      const pair = `${label} ${String(a)}->${String(b)}`;
      compare('pairs', `${pair} trace`,
        outcome(() => reference.traceCombatantLine(state, a, b)),
        outcome(() => candidate.traceCombatantLine(state, a, b)));
      compare('pairs', `${pair} cover`,
        outcome(() => reference.coverBetweenCombatants(state, a, b)),
        outcome(() => candidate.coverBetweenCombatants(state, a, b)));
      compare('pairs', `${pair} verdict`,
        outcome(() => verdictFields(reference.traceCombatantLine(state, a, b))),
        outcome(() => verdictFields(candidate.combatantLineVerdict(state, a, b))));
    }
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const cell = { column, row };
        const line = `${label} ${String(a)}->${String(column)},${String(row)}`;
        compare('toCells', `${line} trace`,
          outcome(() => reference.traceCombatantLineToCells(state, a, [cell])),
          outcome(() => candidate.traceCombatantLineToCells(state, a, [cell])));
        compare('toCells', `${line} verdict`,
          outcome(() => verdictFields(reference.traceCombatantLineToCells(state, a, [cell]))),
          outcome(() => verdictFields(candidate.combatantLineVerdictToCells(state, a, [cell]))));
      }
    }
  }
  for (const [moverIndex, a] of ids.entries()) {
    const token = state.tokens.find((entry) => entry.combatantId === a);
    if (token === undefined) throw new Error(`No token for ${String(a)} in ${label}.`);
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const anchor = { column, row };
        const options = { sourceAnchor: anchor };
        for (const b of ids) {
          if (a === b) continue;
          const line = `${label} ${String(a)}@${String(column)},${String(row)}->${String(b)}`;
          compare('anchored', `${line} trace`,
            outcome(() => reference.traceCombatantLine(state, a, b, options)),
            outcome(() => candidate.traceCombatantLine(state, a, b, options)));
          compare('anchored', `${line} verdict`,
            outcome(() => verdictFields(reference.traceCombatantLine(state, a, b, options))),
            outcome(() => verdictFields(candidate.combatantLineVerdict(state, a, b, options))));
        }
        for (const target of sampledTargets(state, token.position, anchor, salt * 31 + moverIndex)) {
          const line = `${label} ${String(a)}@${String(column)},${String(row)}->${String(target.column)},${String(target.row)}`;
          compare('anchoredToCells', `${line} trace`,
            outcome(() => reference.traceCombatantLineToCells(state, a, [target], options)),
            outcome(() => candidate.traceCombatantLineToCells(state, a, [target], options)));
          compare('anchoredToCells', `${line} verdict`,
            outcome(() => verdictFields(reference.traceCombatantLineToCells(state, a, [target], options))),
            outcome(() => verdictFields(candidate.combatantLineVerdictToCells(state, a, [target], options))));
        }
      }
    }
  }
  const next = random(salt * 7_919 + 13);
  const cell = (): GridCell => ({
    column: Math.floor(next() * state.bounds.columns),
    row: Math.floor(next() * state.bounds.rows),
  });
  for (let index = 0; index < 400; index += 1) {
    const from = cell();
    const to = cell();
    compare('terrain', `${label} terrain ${String(index)} trace`,
      outcome(() => reference.traceTerrainLine(state, from, to)),
      outcome(() => candidate.traceTerrainLine(state, from, to)));
    compare('terrain', `${label} terrain ${String(index)} verdict`,
      outcome(() => verdictFields(reference.traceTerrainLine(state, from, to))),
      outcome(() => verdictFields(candidate.terrainLineVerdict(state, from, to))));
    if (index % 4 === 0) {
      compare('objects', `${label} objects ${String(index)}`,
        outcome(() => reference.coverTierBetweenObjects(state.worldObjects, from, to)),
        outcome(() => candidate.coverTierBetweenObjects(state.worldObjects, from, to)));
    }
  }
  const first = ids[0];
  if (first !== undefined) {
    const block = [{ column: 1, row: 1 }, { column: 2, row: 1 }, { column: 1, row: 2 }, { column: 2, row: 2 }];
    compare('shapes', `${label} multi trace`,
      outcome(() => reference.traceCombatantLineToCells(state, first, block)),
      outcome(() => candidate.traceCombatantLineToCells(state, first, block)));
    compare('shapes', `${label} multi verdict`,
      outcome(() => verdictFields(reference.traceCombatantLineToCells(state, first, block))),
      outcome(() => verdictFields(candidate.combatantLineVerdictToCells(state, first, block))));
    compare('shapes', `${label} empty trace`,
      outcome(() => reference.traceCombatantLineToCells(state, first, [])),
      outcome(() => candidate.traceCombatantLineToCells(state, first, [])));
    compare('shapes', `${label} empty verdict`,
      outcome(() => verdictFields(reference.traceCombatantLineToCells(state, first, []))),
      outcome(() => verdictFields(candidate.combatantLineVerdictToCells(state, first, []))));
  }
}

const started = Date.now();
const bases = baseStates();
const selected = bases.slice(firstState, Math.min(endState, bases.length));
if (firstState === 0) rasterSection();
let states = 0;
for (const [offset, base] of selected.entries()) {
  const index = firstState + offset;
  const state = await base.load();
  for (const [variant, variantState] of [['', state], ['+dense', densify(state, 1_000 + index)]] as const) {
    states += 1;
    stateSections(`${base.label}${variant}`, variantState, index * 2 + (variant === '' ? 0 : 1));
  }
  process.stdout.write(`${base.label} ${SECTIONS.map((name) =>
    `${name}=${String(totals[name].compared)}/${String(totals[name].mismatches)}`).join(' ')}\n`);
}

const failures: string[] = [];
if (states === 0) failures.push('states=0');
for (const name of SECTIONS) {
  if (name === 'raster' && firstState !== 0) continue;
  if (totals[name].compared === 0) failures.push(`${name}.compared=0`);
  if (totals[name].mismatches !== 0) failures.push(`${name}.mismatches=${String(totals[name].mismatches)}`);
}
if (coverage.fixtures.length + coverage.sidecars.length !== coverage.filesSeen) failures.push('fixture files unaccounted');
const result = {
  shard: `${String(firstState)}:${String(firstState + selected.length)}`,
  baseStates: bases.length,
  states,
  wallSeconds: (Date.now() - started) / 1000,
  pass: failures.length === 0,
  failures,
  coverage: {
    filesSeen: coverage.filesSeen,
    fixtures: coverage.fixtures.length,
    sidecars: coverage.sidecars,
    generated: coverage.generated.length,
  },
  totals,
  examples,
};
writeFileSync(outPath, `${JSON.stringify(result, null, 1)}\n`);
console.log(`COVER-DIFFERENTIAL ${result.pass ? 'PASS' : 'FAIL'} shard=${result.shard} states=${String(states)} ` +
  `${SECTIONS.map((name) => `${name}=${String(totals[name].compared)}/${String(totals[name].mismatches)}`).join(' ')} ` +
  `failures=${JSON.stringify(failures)} wall=${String(result.wallSeconds)}s`);
process.exit(result.pass ? 0 : 1);
