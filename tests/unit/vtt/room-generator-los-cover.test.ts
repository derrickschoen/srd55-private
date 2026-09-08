import { describe, expect, it } from 'vitest';
import { combatantSpace, combatantSpaceAt } from '../../../src/combat/combat-rules';
import {
  traceCombatantLine,
  traceCombatantLineToCells,
  type TerrainLineTrace,
} from '../../../src/combat/cover';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import { isCellInside, type GridCell } from '../../../src/combat/grid';
import { findPath } from '../../../src/combat/movement';
import { terrainBlocking, type CoverTier } from '../../../src/combat/terrain';
import { feet, type CombatantId } from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import {
  generateRoom,
  type GeneratedRoom,
  type RoomDifficultyProfile,
} from '../../../src/vtt/room-generator';
import { declareTestInputs } from '../../helpers/test-inputs';

const FIXTURE_CASES = [
  { difficulty: 'standard', seed: 5_762_001, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json' },
  { difficulty: 'standard', seed: 5_762_002, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json' },
  { difficulty: 'standard', seed: 5_762_003, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json' },
  { difficulty: 'hard', seed: 5_762_101, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json' },
  { difficulty: 'hard', seed: 5_762_102, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json' },
  { difficulty: 'hard', seed: 5_762_103, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json' },
  { difficulty: 'brutal', seed: 5_762_201, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json' },
  { difficulty: 'brutal', seed: 5_762_202, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json' },
  { difficulty: 'brutal', seed: 5_762_203, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json' },
] as const satisfies readonly {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
  readonly path: `tests/fixtures/${string}`;
}[];

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json',
  ],
});

const PROPERTY_CASES: readonly {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
}[] = (['standard', 'hard', 'brutal'] as const).flatMap((difficulty) =>
  Array.from({ length: 32 }, (_unused, seed) => ({ difficulty, seed })));

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function livingSides(room: GeneratedRoom) {
  const state = room.encounter.state;
  return {
    party: state.combatants.filter((combatant) =>
      combatant.life === 'living' && combatant.profile.kind === 'player_character'),
    monsters: state.combatants.filter((combatant) =>
      combatant.life === 'living' && combatant.profile.kind === 'monster'),
  };
}

function opposingPairTraces(room: GeneratedRoom): readonly TerrainLineTrace[] {
  const state = room.encounter.state;
  const { party, monsters } = livingSides(room);
  return [
    ...party.flatMap((source) => monsters.map((target) =>
      traceCombatantLine(state, source.profile.id, target.profile.id))),
    ...monsters.flatMap((source) => party.map((target) =>
      traceCombatantLine(state, source.profile.id, target.profile.id))),
  ];
}

function creatureToCellTraces(room: GeneratedRoom): readonly TerrainLineTrace[] {
  const state = room.encounter.state;
  const occupied = new Set(state.combatants.flatMap((combatant) =>
    combatant.life === 'dead' ? [] : combatantSpace(state, combatant.profile.id).cells.map(cellKey)));
  return state.combatants.flatMap((source) => {
    if (source.life !== 'living') return [];
    const traces: TerrainLineTrace[] = [];
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const target = { column, row };
        if (!occupied.has(cellKey(target))) {
          traces.push(traceCombatantLineToCells(state, source.profile.id, [target]));
        }
      }
    }
    return traces;
  });
}

function expectFeatureMembership(room: GeneratedRoom): void {
  const state = room.encounter.state;
  const half = room.spec.terrain.find((feature) =>
    feature.kind === 'cover-object' && feature.object.terrainKind === 'half_cover');
  const threeQuarters = room.spec.terrain.find((feature) =>
    feature.kind === 'cover-object' && feature.object.terrainKind === 'three_quarters_cover');
  const wall = room.spec.terrain.find((feature) => feature.kind === 'wall');
  expect(half?.kind).toBe('cover-object');
  expect(threeQuarters?.kind).toBe('cover-object');
  expect(wall?.kind).toBe('wall');
  if (half?.kind !== 'cover-object' || half.object.terrainKind !== 'half_cover' ||
    threeQuarters?.kind !== 'cover-object' ||
    threeQuarters.object.terrainKind !== 'three_quarters_cover' || wall?.kind !== 'wall') {
    throw new Error('los_cover_v1 typed terrain is incomplete.');
  }
  expect(half.object.blocking).toEqual(terrainBlocking('half_cover'));
  expect(threeQuarters.object.blocking).toEqual(terrainBlocking('three_quarters_cover'));
  expect(state.blockedCells).toEqual(wall.cells);

  const occupied = new Set(state.combatants.flatMap((combatant) =>
    combatant.life === 'dead' ? [] : combatantSpace(state, combatant.profile.id).cells.map(cellKey)));
  const doors = new Set(state.worldObjects.filter((object) => object.kind === 'door')
    .flatMap((object) => object.footprint.map(cellKey)));
  const movementBlocking = [threeQuarters.object.footprint, wall.cells];
  const seenBlocking = new Set<string>();
  for (const footprint of [half.object.footprint, threeQuarters.object.footprint, wall.cells]) {
    expect(new Set(footprint.map(cellKey)).size).toBe(footprint.length);
    expect(footprint.every((cell) => isCellInside(state.bounds, cell))).toBe(true);
    expect(footprint.every((cell) => !occupied.has(cellKey(cell)) && !doors.has(cellKey(cell)))).toBe(true);
  }
  for (const footprint of movementBlocking) {
    for (const cell of footprint) {
      expect(seenBlocking.has(cellKey(cell))).toBe(false);
      seenBlocking.add(cellKey(cell));
    }
  }

  const pairTraces = opposingPairTraces(room);
  const cellTraces = creatureToCellTraces(room);
  const allTraces = [...pairTraces, ...cellTraces];
  const halfSource = `object:${String(half.object.id)}`;
  const threeQuartersSource = `object:${String(threeQuarters.object.id)}`;
  const wallSources = new Set(wall.cells.map((cell) => `blocked:${cellKey(cell)}`));
  expect(pairTraces.some((trace) => trace.tier === 'half' && trace.sourceIds.includes(halfSource))).toBe(true);
  expect(pairTraces.some((trace) =>
    trace.tier === 'three_quarters' && trace.sourceIds.includes(threeQuartersSource))).toBe(true);
  expect(allTraces.some((trace) => trace.tier === 'total' && trace.blocksSight &&
    trace.sourceIds.some((id) => wallSources.has(id)))).toBe(true);
  expect(allTraces.some((trace) => trace.tier === 'none' && !trace.blocksSight)).toBe(true);

  for (const object of [half.object, threeQuarters.object]) {
    expect(object.footprint.some((cell) => {
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) continue;
          const adjacent = { column: cell.column + columnOffset, row: cell.row + rowOffset };
          if (isCellInside(state.bounds, adjacent) && !seenBlocking.has(cellKey(adjacent)) &&
            !occupied.has(cellKey(adjacent))) return true;
        }
      }
      return false;
    })).toBe(true);
  }
}

function sideCanChangeLine(
  room: GeneratedRoom,
  actors: readonly { readonly profile: { readonly id: CombatantId; readonly rules: { readonly speed: number } } }[],
  opponents: readonly { readonly profile: { readonly id: CombatantId } }[],
): boolean {
  const state = room.encounter.state;
  const world = encounterMovementWorld(state);
  return actors.some((actor) => opponents.some((opponent) => {
    const token = state.tokens.find((candidate) => candidate.combatantId === actor.profile.id);
    if (token === undefined) return false;
    const current = traceCombatantLine(state, actor.profile.id, opponent.profile.id);
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const destination = { column, row };
        const path = findPath(world, {
          actorId: actor.profile.id,
          start: token.position,
          goal: destination,
          maximumCost: feet(actor.profile.rules.speed),
        });
        if (path.kind !== 'found' || path.cells.length === 0) continue;
        const changed = traceCombatantLine(state, actor.profile.id, opponent.profile.id, {
          sourceAnchor: destination,
        });
        if (changed.tier !== current.tier || changed.blocksSight !== current.blocksSight) return true;
      }
    }
    return false;
  }));
}

function reachesProductiveRegion(room: GeneratedRoom, actorId: CombatantId): boolean {
  const state = room.encounter.state;
  const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
  const token = state.tokens.find((candidate) => candidate.combatantId === actorId);
  if (actor === undefined || token === undefined || actor.life !== 'living') return true;
  const opponents = state.combatants.filter((candidate) => candidate.life === 'living' &&
    candidate.profile.kind !== actor.profile.kind);
  const world = encounterMovementWorld(state);
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const destination = { column, row };
      const footprint = combatantSpaceAt(state, actorId, destination);
      if (!footprint.cells.every((cell) => isCellInside(state.bounds, cell))) continue;
      if (!opponents.some((opponent) => !traceCombatantLine(
        state,
        actorId,
        opponent.profile.id,
        { sourceAnchor: destination },
      ).blocksSight)) continue;
      const path = findPath(world, {
        actorId,
        start: token.position,
        goal: destination,
        maximumCost: feet(state.bounds.columns * state.bounds.rows * 10),
      });
      if (path.kind === 'found') return true;
    }
  }
  return false;
}

function expectProductiveMonsters(room: GeneratedRoom): void {
  const planning = freshMonsterPlanningState(room.encounter.state);
  const monsters = planning.combatants.filter((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life === 'living');
  for (const monster of monsters) {
    const productive = availableEngineActorOptions(planning, monster.profile.id).some((option) => {
      const resolution = resolveEngineActorOption(planning, option);
      return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
        resolution.mechanics.actionSlots.some((slot) =>
          slot.kind === 'attack' || slot.kind === 'saving_throw' ||
          slot.kind === 'cast_spell' || slot.kind === 'use_world_object'));
    });
    expect(productive, monster.profile.id).toBe(true);
  }
}

describe('D576 los_cover_v1 generator membership', () => {
  it.each(FIXTURE_CASES)(
    'kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for $difficulty seed $seed',
    ({ difficulty, seed, path }) => {
      const room = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
      expect(room.spec.terrainProfile).toBe('los_cover_v1');
      expectFeatureMembership(room);
      const fixtureText = inputs.fixtures.readText(path);
      expect(`${canonicalJson(room)}\n`).toBe(fixtureText);
      expect(canonicalJson(decodeArenaFixtureText(fixtureText))).toBe(
        canonicalJson(room.encounter.state),
      );
    },
  );

  it('kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture', () => {
    for (const fixture of FIXTURE_CASES) {
      expectFeatureMembership(generateRoom(fixture.seed, {
        difficulty: fixture.difficulty,
        terrainProfile: 'los_cover_v1',
      }));
    }
  });

  it('kills M576-E2-WALL-SEALS-ROOM for every living footprint size', () => {
    for (const fixture of FIXTURE_CASES) {
      const room = generateRoom(fixture.seed, {
        difficulty: fixture.difficulty,
        terrainProfile: 'los_cover_v1',
      });
      for (const combatant of room.encounter.state.combatants.filter((candidate) =>
        candidate.life === 'living')) {
        expect(reachesProductiveRegion(room, combatant.profile.id),
          `${fixture.difficulty} seed ${String(fixture.seed)} ${combatant.profile.id}`).toBe(true);
      }
    }
  });

  it('retains a productive first-turn option for every living monster in the versioned basis', () => {
    for (const fixture of FIXTURE_CASES) {
      expectProductiveMonsters(generateRoom(fixture.seed, {
        difficulty: fixture.difficulty,
        terrainProfile: 'los_cover_v1',
      }));
    }
  });

  it('kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side', () => {
    for (const fixture of FIXTURE_CASES) {
      const room = generateRoom(fixture.seed, {
        difficulty: fixture.difficulty,
        terrainProfile: 'los_cover_v1',
      });
      const { party, monsters } = livingSides(room);
      expect(sideCanChangeLine(room, party, monsters), `${fixture.difficulty} party`).toBe(true);
      expect(sideCanChangeLine(room, monsters, party), `${fixture.difficulty} monsters`).toBe(true);
    }
  });

  it.each(PROPERTY_CASES)(
    'kills M576-E2-SEED-SPECIFIC-CORRECTION for $difficulty seed $seed',
    ({ difficulty, seed }) => {
      const first = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
      const second = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
      expect(first.spec.terrainProfile).toBe('los_cover_v1');
      expect(first.spec.terrain.filter((feature) => feature.kind === 'cover-object')).toHaveLength(2);
      expect(first.spec.terrain.filter((feature) => feature.kind === 'wall')).toHaveLength(1);
      expect(sha256(canonicalJson(first)), `${difficulty} seed ${String(seed)}`).toBe(
        sha256(canonicalJson(second)),
      );
    },
  );

  it('kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION', () => {
    for (const [difficulty, seed] of [
      ['standard', 1],
      ['brutal', 1],
    ] as const) {
      const room = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
      const large = room.encounter.state.combatants.filter((combatant) =>
        combatant.life === 'living' && ['Large', 'Huge', 'Gargantuan'].includes(
          combatant.profile.rules.sizeCategory ?? '',
        ));
      expect(large.length).toBeGreaterThan(0);
      for (const combatant of large) {
        expect(reachesProductiveRegion(room, combatant.profile.id), combatant.profile.id).toBe(true);
      }

      expectProductiveMonsters(room);
    }
  });
});
