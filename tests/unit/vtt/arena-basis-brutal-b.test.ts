import { describe, expect, it } from 'vitest';
import { combatantSpace, reduceEncounter } from '../../../src/combat/encounter';
import { spaceFitsBounds, spacesIntersect, spaceTouchesCellSet } from '../../../src/combat/creature-space';
import { mulberry32 } from '../../../src/combat/random';
import { BUNDLED_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { sha256 } from '../../../src/crypto/sha256';
import { D466_GENERATED_ROOM_OVERRIDES } from '../../../src/vtt/d466-room-overrides';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { decodeArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import {
  BRUTAL_CHALLENGE_BUDGET_SCALE,
  BRUTAL_CHALLENGE_SPEND_FRACTION_BAND,
  BRUTAL_TERRAIN_FEATURE_COUNT_BAND,
  generateRoom,
  type GeneratedRoom,
} from '../../../src/vtt/room-generator';
import { BRUTAL_10_B_SEEDS, BRUTAL_10_SEEDS, R1_10_SEEDS } from '../../../tools/ai-dm-rerun-packet';
import { declareTestInputs } from '../../helpers/test-inputs';

const FIXTURE_PATHS = [
  'tests/fixtures/arena-basis-brutal-b/seed-6206001.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206002.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206003.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206004.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206005.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206006.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206007.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206008.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206009.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206010.json',
] as const;

const FIXTURE_DIGESTS = {
  6_206_001: '7cc25c0ab9a0e380373a306874290d0f5247e74c0efb71e43ab593b58f0d9d3b',
  6_206_002: '3fdfe05812aeb6724789b4ff6f753ce68c523c13ff024d9ee275bd1060adbcaa',
  6_206_003: '36828c26a62a8af8c9cc32db7f3a13124d897a8aacf8ce4d4df2c11d2c742d3c',
  6_206_004: '35a5980497b2184a4d684e1849117bb70e4887cb40264ea33117e3e14322c60a',
  6_206_005: 'dc48b6cdd7d4e33dc3c9a0188586ebd1537deac4dec4284c7e9404cec652e2f1',
  6_206_006: 'd66fc0a9f29d84b5f1bc5a46b86483f91236d05b5cb1b951519cce7db98e2269',
  6_206_007: '1c4c337148afad9aff2a86143bb3156cc446ffabd2ccc8cc29eb004d83034bd9',
  6_206_008: '11a065b490f6e68effaddb0e919b9f9f9f7ae300f19a97f3359d3d4c86658a32',
  6_206_009: '19808aca9fb3ca7e4a77b6222cfae31c4f69a16b9b74ecc0706cb1eee58d4f5e',
  6_206_010: 'a9efe78460c66972d09c6efd1c7cc04409ba6fff5a0028657d2442a0ec2fbc83',
} as const satisfies Readonly<Record<(typeof BRUTAL_10_B_SEEDS)[number], string>>;

const inputs = declareTestInputs({ fixtures: FIXTURE_PATHS });

function cellIsInBounds(
  cell: { readonly column: number; readonly row: number },
  bounds: { readonly columns: number; readonly rows: number },
): boolean {
  return cell.column >= 0 && cell.column < bounds.columns &&
    cell.row >= 0 && cell.row < bounds.rows;
}

function assertBrutalMembership(
  room: GeneratedRoom,
  fixtureBytes: string,
  expectedDigest: string,
): void {
  const seed = room.spec.seed;
  const hard = generateRoom(seed, { difficulty: 'hard' });
  expect(room.spec.difficultyProfile, `seed ${String(seed)} difficulty`).toBe('brutal');
  expect(room.spec.challengeBudgetEighths, `seed ${String(seed)} scaled budget`).toBe(
    hard.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_BUDGET_SCALE,
  );
  expect(room.spec.challengeSpentEighths, `seed ${String(seed)} minimum spend`).toBeGreaterThanOrEqual(
    room.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_SPEND_FRACTION_BAND.minimum,
  );
  expect(room.spec.challengeSpentEighths, `seed ${String(seed)} maximum spend`).toBeLessThanOrEqual(
    room.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_SPEND_FRACTION_BAND.maximum,
  );

  const roster = room.spec.monsterRoster.map((entry) => {
    const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === entry.statblockId);
    if (row === undefined) throw new Error(`Seed ${String(seed)} references unknown ${entry.statblockId}.`);
    return row;
  });
  expect(roster.some((row) => {
    const actions = row.statblock.sourceDetails.actions;
    return actions.kind === 'present' && actions.value.some((action) =>
      action.kind === 'spellcasting' && action.execution?.kind !== 'absent' &&
      action.spells.some((spell) => spell.manifestStatus === 'implemented'));
  }), `seed ${String(seed)} executable caster`).toBe(true);

  const terrainCounts = {
    difficult: room.spec.terrain.filter((feature) => feature.kind === 'difficult-terrain-patch').length,
    hazards: room.spec.terrain.filter((feature) => feature.kind === 'hazard-object').length,
    lights: room.spec.terrain.filter((feature) => feature.kind === 'light-source').length,
    obscurement: room.spec.terrain.filter((feature) => feature.kind === 'obscurement-patch').length,
  };
  expect(terrainCounts.difficult, `seed ${String(seed)} difficult terrain`).toBeGreaterThanOrEqual(3);
  expect(terrainCounts.hazards, `seed ${String(seed)} hazards`).toBeGreaterThanOrEqual(3);
  expect(terrainCounts.lights, `seed ${String(seed)} lights`).toBeGreaterThanOrEqual(2);
  expect(terrainCounts.obscurement, `seed ${String(seed)} obscurement`).toBeGreaterThanOrEqual(2);
  expect(room.spec.terrain.length, `seed ${String(seed)} terrain exceeds hard`).toBeGreaterThan(
    hard.spec.terrain.length,
  );
  expect(room.spec.terrain.length, `seed ${String(seed)} terrain minimum`).toBeGreaterThanOrEqual(
    BRUTAL_TERRAIN_FEATURE_COUNT_BAND.minimum,
  );
  expect(room.spec.terrain.length, `seed ${String(seed)} terrain maximum`).toBeLessThanOrEqual(
    BRUTAL_TERRAIN_FEATURE_COUNT_BAND.maximum,
  );

  const state = decodeArenaFixture(room);
  const regions = [
    ...state.environment.difficultTerrainRegions,
    ...state.environment.lightRegions,
    ...state.environment.obscurementRegions,
    ...(state.environment.movementRegions ?? []),
  ];
  for (const region of regions) {
    expect(region.id.trim(), `seed ${String(seed)} region id`).not.toBe('');
    expect(region.cells.length, `seed ${String(seed)} region cells`).toBeGreaterThan(0);
    expect(region.cells.every((cell) => cellIsInBounds(cell, state.bounds)),
      `seed ${String(seed)} region bounds`).toBe(true);
  }
  expect(state.worldObjects.every((object) =>
    object.footprint.length > 0 && object.footprint.every((cell) => cellIsInBounds(cell, state.bounds))),
  `seed ${String(seed)} world-object positions`).toBe(true);

  const spaces = state.combatants.map((combatant) => ({
    id: combatant.profile.id,
    space: combatantSpace(state, combatant.profile.id),
  }));
  for (const entry of spaces) {
    expect(spaceFitsBounds(entry.space, state.bounds), `${entry.id} position bounds`).toBe(true);
    expect(spaceTouchesCellSet(entry.space, state.blockedCells), `${entry.id} blocked overlap`).toBe(false);
  }
  for (let left = 0; left < spaces.length; left += 1) {
    for (let right = left + 1; right < spaces.length; right += 1) {
      expect(spacesIntersect(spaces[left]!.space, spaces[right]!.space),
        `${spaces[left]!.id}/${spaces[right]!.id} overlap`).toBe(false);
    }
  }

  const reduced = reduceEncounter(state, { type: 'roll_initiative' }, mulberry32(seed));
  expect(reduced.state.revision, `seed ${String(seed)} reducer load`).toBe(state.revision + 1);
  expect(reduced.state.initiative, `seed ${String(seed)} initiative load`).toHaveLength(state.combatants.length);

  const planningState = freshMonsterPlanningState(state);
  for (const monster of planningState.combatants.filter((combatant) =>
    combatant.profile.kind === 'monster')) {
    const productive = availableEngineActorOptions(planningState, monster.profile.id).some((option) => {
      const resolution = resolveEngineActorOption(planningState, option);
      return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
        resolution.mechanics.actionSlots.some((slot) =>
          slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
          slot.kind === 'use_world_object'));
    });
    expect(productive, `${monster.profile.id} has no productive first-turn offer`).toBe(true);
  }

  // The byte pin lives with, and cannot pass instead of, the state-derived membership checks above.
  expect(sha256(fixtureBytes), `seed ${String(seed)} fixture bytes`).toBe(expectedDigest);
}

function fixtureAt(index: number): { readonly room: GeneratedRoom; readonly bytes: string } {
  const path = FIXTURE_PATHS[index];
  if (path === undefined) throw new RangeError(`No brutal-b fixture at index ${String(index)}.`);
  const bytes = inputs.fixtures.readText(path);
  return { room: JSON.parse(bytes) as GeneratedRoom, bytes };
}

describe('second brutal arena basis family', () => {
  it('uses one clean contiguous range disjoint from every existing seeded fixture family', () => {
    const existingSeeds = new Set([
      ...Array.from({ length: 12 }, (_unused, index) => 3_943_001 + index),
      ...R1_10_SEEDS,
      5_117_011, 5_117_012, 5_117_013,
      ...BRUTAL_10_SEEDS,
    ]);
    expect(BRUTAL_10_B_SEEDS.every((seed) => !existingSeeds.has(seed))).toBe(true);
    expect(BRUTAL_10_B_SEEDS).toEqual(Array.from({ length: 10 }, (_unused, index) => 6_206_001 + index));
    expect(BRUTAL_10_B_SEEDS.every((seed) =>
      !D466_GENERATED_ROOM_OVERRIDES.some((override) => Number(override.seed) === seed))).toBe(true);
    expect(D466_GENERATED_ROOM_OVERRIDES.map((override) => override.seed)).toEqual([
      6_204_004, 6_204_006, 6_204_009,
    ]);
  });

  it.each(BRUTAL_10_B_SEEDS)(
    'pins seed %s only after proving every brutal membership property from state',
    (seed) => {
      const index = seed - BRUTAL_10_B_SEEDS[0];
      const fixture = fixtureAt(index);
      expect(fixture.room.spec.seed).toBe(seed);
      assertBrutalMembership(fixture.room, fixture.bytes, FIXTURE_DIGESTS[seed]);
    },
  );

  it('fails structurally when a brutal-named fixture does not satisfy the membership predicates', () => {
    const fixture = fixtureAt(0);
    const structurallyInvalid: GeneratedRoom = {
      ...fixture.room,
      spec: { ...fixture.room.spec, terrain: [] },
    };
    expect(() => assertBrutalMembership(
      structurallyInvalid,
      fixture.bytes,
      FIXTURE_DIGESTS[BRUTAL_10_B_SEEDS[0]],
    )).toThrow();
  });
});
