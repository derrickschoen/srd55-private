import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { generateRoom, ROOM_GRID_DIMENSIONS } from '../../../src/vtt/room-generator';
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
  ],
});

describe('seeded room generator', () => {
  it('produces byte-identical reducer state for the same seed', () => {
    expect(canonicalJson(generateRoom(394_300))).toBe(canonicalJson(generateRoom(394_300)));
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

  it('keeps every sampled token in bounds across a rolling fresh seed set', () => {
    for (let seed = 0; seed < 256; seed += 1) {
      const state = generateRoom(seed).encounter.state;
      expect(state.tokens.every((token) =>
        token.position.column >= 0 && token.position.column < state.bounds.columns &&
        token.position.row >= 0 && token.position.row < state.bounds.rows,
      )).toBe(true);
    }
  });

  it.each(BASIS_SEEDS)('pins frozen arena basis seed %s byte-for-byte', (seed) => {
    const path = `tests/fixtures/arena-basis/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis/seed-${typeof seed}.json`;
    expect(`${canonicalJson(generateRoom(seed))}\n`).toBe(inputs.fixtures.readText(path));
  });
});
