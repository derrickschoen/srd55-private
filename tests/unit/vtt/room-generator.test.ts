import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { STARTER_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { spellDefinition } from '../../../src/combat/spells/definitions';
import {
  generateRoom,
  ROOM_GRID_DIMENSIONS,
  type GeneratedRoom,
} from '../../../src/vtt/room-generator';
import { declareTestInputs } from '../../helpers/test-inputs';

const BASIS_SEEDS = [
  3_943_001,
  3_943_002,
  3_943_003,
  3_943_004,
  3_943_005,
  3_943_006,
  3_943_007,
  3_943_008,
  3_943_009,
  3_943_010,
  3_943_011,
  3_943_012,
] as const;

const HARD_BASIS_SEEDS = [
  5_117_001,
  5_117_002,
  5_117_003,
  5_117_004,
  5_117_005,
  5_117_006,
  5_117_007,
  5_117_008,
  5_117_009,
  5_117_010,
  5_117_011,
  5_117_012,
] as const;

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/arena-basis/seed-3943001.json',
    'tests/fixtures/arena-basis/seed-3943002.json',
    'tests/fixtures/arena-basis/seed-3943003.json',
    'tests/fixtures/arena-basis/seed-3943004.json',
    'tests/fixtures/arena-basis/seed-3943005.json',
    'tests/fixtures/arena-basis/seed-3943006.json',
    'tests/fixtures/arena-basis/seed-3943007.json',
    'tests/fixtures/arena-basis/seed-3943008.json',
    'tests/fixtures/arena-basis/seed-3943009.json',
    'tests/fixtures/arena-basis/seed-3943010.json',
    'tests/fixtures/arena-basis/seed-3943011.json',
    'tests/fixtures/arena-basis/seed-3943012.json',
    'tests/fixtures/arena-basis-hard/seed-5117001.json',
    'tests/fixtures/arena-basis-hard/seed-5117002.json',
    'tests/fixtures/arena-basis-hard/seed-5117003.json',
    'tests/fixtures/arena-basis-hard/seed-5117004.json',
    'tests/fixtures/arena-basis-hard/seed-5117005.json',
    'tests/fixtures/arena-basis-hard/seed-5117006.json',
    'tests/fixtures/arena-basis-hard/seed-5117007.json',
    'tests/fixtures/arena-basis-hard/seed-5117008.json',
    'tests/fixtures/arena-basis-hard/seed-5117009.json',
    'tests/fixtures/arena-basis-hard/seed-5117010.json',
    'tests/fixtures/arena-basis-hard/seed-5117011.json',
    'tests/fixtures/arena-basis-hard/seed-5117012.json',
  ],
});

function expectValidEnvironmentRegions(room: GeneratedRoom): void {
  const environment = room.encounter.state.environment;
  const regions = [
    ...environment.difficultTerrainRegions,
    ...environment.lightRegions,
    ...environment.obscurementRegions,
    ...(environment.movementRegions ?? []),
  ];
  for (const region of regions) {
    expect(region.id.trim()).not.toBe('');
    expect(region.cells.length).toBeGreaterThan(0);
  }
}

describe('seeded room generator', () => {
  it('produces byte-identical reducer state for the same seed', () => {
    expect(canonicalJson(generateRoom(394_300))).toBe(canonicalJson(generateRoom(394_300)));
    expect(canonicalJson(generateRoom(511_700, { difficulty: 'hard' }))).toBe(
      canonicalJson(generateRoom(511_700, { difficulty: 'hard' })),
    );
  });

  it('samples only the declared room vocabulary and stays within its CR budget', () => {
    const generated = generateRoom(394_301);
    expect(ROOM_GRID_DIMENSIONS).toContain(generated.spec.dimensions.columns);
    expect(ROOM_GRID_DIMENSIONS).toContain(generated.spec.dimensions.rows);
    expect(generated.spec.challengeSpentEighths).toBeLessThanOrEqual(
      generated.spec.challengeBudgetEighths,
    );
    expect(generated.spec.terrain.some((feature) => feature.kind === 'difficult-terrain-patch')).toBe(true);
    expect(generated.spec.terrain.some((feature) => feature.kind === 'hazard-object')).toBe(true);
    expect(generated.spec.terrain.some((feature) => feature.kind === 'light-source')).toBe(true);
    expect(generated.spec.partyState.filter((seat) => seat.life === 'dying')).toHaveLength(
      generated.spec.partyState.some((seat) => seat.life === 'dying') ? 1 : 0,
    );
  });

  it('loads the generated state through the real encounter reducer', () => {
    const generated = generateRoom(394_302);
    const reduced = reduceEncounter(
      generated.encounter.state,
      { type: 'roll_initiative' },
      mulberry32(901),
    );
    expect(reduced.state.revision).toBe(1);
    expect(reduced.state.initiative).toHaveLength(generated.encounter.state.combatants.length);
  });

  it('applies derived per-combatant initiative without changing the legacy profile', () => {
    const legacy = generateRoom(394_302).encounter.state;
    const derived = generateRoom(394_302, { initiativeProfile: 'derived_v1' }).encounter.state;

    expect(legacy.config.initiativeMode).toBe('shared_enemy');
    expect(legacy.combatants.slice(0, 3).map((entry) => entry.profile.rules.initiativeBonus))
      .toEqual([100, 70, 40]);
    expect(derived.config.initiativeMode).toBe('per_combatant');
    expect(derived.combatants.slice(0, 3).map((entry) => entry.profile.rules.initiativeBonus))
      .toEqual([2, 1, 2]);
    expect(derived.combatants.filter((entry) => entry.profile.rules.abilityScores !== undefined)
      .every((entry) => entry.profile.rules.initiativeBonus ===
        Math.floor(((entry.profile.rules.abilityScores?.dexterity ?? 10) - 10) / 2))).toBe(true);
    expect(canonicalJson(legacy)).toBe(canonicalJson(generateRoom(394_302).encounter.state));
  });

  it('keeps every sampled token in bounds across a rolling fresh seed set', () => {
    for (let seed = 0; seed < 256; seed += 1) {
      const state = generateRoom(seed).encounter.state;
      expect(state.tokens.every((token) =>
        token.position.column >= 0 && token.position.column < state.bounds.columns &&
        token.position.row >= 0 && token.position.row < state.bounds.rows,
      )).toBe(true);
    }
  });

  it('generates a valid hard room for regression seed 6001021', () => {
    expectValidEnvironmentRegions(generateRoom(6_001_021, { difficulty: 'hard' }));
  });

  it('keeps every generated environment region valid across 200 hard seeds', () => {
    for (let seed = 6_001_001; seed < 6_001_201; seed += 1) {
      expectValidEnvironmentRegions(generateRoom(seed, { difficulty: 'hard' }));
    }
  });

  it.each(BASIS_SEEDS)('pins frozen arena basis seed %s byte-for-byte', (seed) => {
    const path = `tests/fixtures/arena-basis/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis/seed-${typeof seed}.json`;
    expect(`${canonicalJson(generateRoom(seed))}\n`).toBe(inputs.fixtures.readText(path));
  });

  it.each(HARD_BASIS_SEEDS)('pins frozen hard arena basis seed %s byte-for-byte', (seed) => {
    const path = `tests/fixtures/arena-basis-hard/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis-hard/seed-${typeof seed}.json`;
    expect(`${canonicalJson(generateRoom(seed, { difficulty: 'hard' }))}\n`).toBe(
      inputs.fixtures.readText(path),
    );
  });

  it.each(HARD_BASIS_SEEDS)('derives every required hard feature from frozen seed %s', (seed) => {
    const path = `tests/fixtures/arena-basis-hard/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis-hard/seed-${typeof seed}.json`;
    const room = JSON.parse(inputs.fixtures.readText(path)) as GeneratedRoom;
    const rows = room.spec.monsterRoster.map((entry) => {
      const row = STARTER_MONSTER_ROSTER.find((candidate) => candidate.id === entry.statblockId);
      if (row === undefined) throw new Error(`Frozen hard room references unknown ${entry.statblockId}.`);
      return row;
    });
    const casterRows = rows.filter((row) =>
      row.statblock.sourceDetails.actions.kind === 'present' &&
      row.statblock.sourceDetails.actions.value.some((action) => action.kind === 'spellcasting'));
    const controlCasterRows = casterRows.filter((row) =>
      row.statblock.sourceDetails.actions.kind === 'present' &&
      row.statblock.sourceDetails.actions.value.some((action) =>
        action.kind === 'spellcasting' && action.spells.some((spell) => {
          const definition = spellDefinition(spell.id);
          return definition?.operation.kind === 'persistent_area' &&
            definition.operation.hooks.some((hook) => hook.effect.kind === 'save_gated') &&
            definition.operation.hooks.some((hook) =>
              hook.effect.kind === 'automatic' && hook.effect.payload.kind === 'effect' &&
              hook.effect.payload.payload.kind === 'movement_modifier');
        })));
    expect(casterRows.length).toBeGreaterThanOrEqual(1);
    expect(controlCasterRows.length).toBeGreaterThanOrEqual(1);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.length).toBeLessThanOrEqual(7);
    expect(rows.some((row) => row.id === 'statblock:guard')).toBe(true);
    expect(rows.some((row) => row.id === 'statblock:scout')).toBe(true);

    const difficultRegions = room.spec.terrain.filter((feature) =>
      feature.kind === 'difficult-terrain-patch');
    const features = room.spec.hardFeatures;
    expect(features?.shape).toBe('single-gate');
    expect(difficultRegions.length).toBeGreaterThanOrEqual(1);
    expect(features?.likelyApproachTerrainRegionIds.every((id) =>
      difficultRegions.some((region) => region.id === id && region.cells.length > 0))).toBe(true);
    expect(features?.chokepointCells).toHaveLength(1);
    const [gate] = features?.chokepointCells ?? [];
    if (gate === undefined) throw new Error('Hard room has no declared chokepoint cell.');
    const barrier = room.spec.blockedCells.filter((cell) => cell.column === gate.column);
    expect(barrier).toHaveLength(room.spec.dimensions.rows - 1);
    expect(barrier.some((cell) => cell.row === gate.row)).toBe(false);
  });
});
