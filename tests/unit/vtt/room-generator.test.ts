import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { BUNDLED_MONSTER_ROSTER, STARTER_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { spellDefinition } from '../../../src/combat/spells/definitions';
import { sha256 } from '../../../src/crypto/sha256';
import { creatureSizes, type KnownCreatureSize } from '../../../src/domain/enums';
import {
  D466_GENERATED_ROOM_OVERRIDES,
  d466CreatureReplacement,
  d466ReplacementStatblock,
} from '../../../src/vtt/d466-room-overrides';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import {
  BRUTAL_CHALLENGE_BUDGET_SCALE,
  BRUTAL_TERRAIN_FEATURE_COUNT_BAND,
  generateRoom,
  heldoutMaximizingMonsterRosters,
  HELDOUT_STARTER_MONSTER_FAMILIES,
  ROOM_GRID_DIMENSIONS,
  type GeneratedRoom,
} from '../../../src/vtt/room-generator';
import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
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

const BRUTAL_BASIS_SEEDS = [6_203_001, 6_203_002, 6_203_003] as const;
const BRUTAL_BASIS_GENERATED_DIGESTS = {
  6_203_001: '3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b',
  6_203_002: 'cdb567192800c4dbea964fbabf03d88013d7d6402da8b391cf2f60e19e69a0c9',
  6_203_003: '6c470c04fd6373f7fa999d5f0c66539c54eb71e6094e2b83a2ca972ab91720f8',
} as const;
const BRUTAL_BASIS_FIXTURE_DIGESTS = {
  6_203_001: '3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b',
  6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
  6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
} as const;
const BRUTAL_PRODUCTIVITY_SEEDS = [
  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
] as const;

const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
  6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
  6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
  6_204_003: '105b5a7ff69ff572606a494fc336b29badb16f5c08438ec83fe0f1b7cf264e6f',
  6_204_004: 'e3b822d18589cfabdd6acc579daec22325540661869850ba55c583970725fd75',
  6_204_005: '3af3cf9a27216bc25dad9586696d47f587bec1e7ed8879569c6052e892693e72',
  6_204_006: 'be0fcd2d2cbf0415fc6b07189132ba665e30973b86a3847e43b427c11a238b4f',
  6_204_007: '56665e115694a30c5ff7da200e10394ae55093e5b85e03252bc2f36717cc5ba4',
  6_204_008: 'ae387c2541e566bdf565334837d2729eb9c1a65303fe0f412eed3288fd86d306',
  6_204_009: '04fbc7fd4cd029c63d0d936539ab53aca3d50c80206764aede55fbc0ba72a88e',
  6_204_010: '2768168a0da1fa28d35e86febb92a6035f892fbe5a1f703c89c13fe6ace3339b',
} as const;

const D466_6204_NON_ROSTER_DIGESTS = {
  6_204_001: 'a510aaa8e785c641bcf3455df6f7ce8fbf71b0f2ec978e3b5e6f2ac62f289a3f',
  6_204_002: 'c26ea2b4bca6ed4f7afbf044a9853b410287e80dc9a4a4fc6f322083ea6eb501',
  6_204_003: '16bb7c43f6a2a1751928de993d50e5bd27e69b64c9ac8a4db9efbb72d94e2f66',
  6_204_004: '9fb5c7812054c026eb9f8d070691fbf8af5925d5e6ce8123a33a3085af961990',
  6_204_005: '0ad33edb24bda5de199144bf9c6d6f1412e61d2915486a1364817cd47438259d',
  6_204_006: 'd0138274a6f2b4cdf7996578b6408803ad723d808fb4b6d5487cc4b767dee880',
  6_204_007: 'bcd1545c7a397c86a37c7a672aab72c99689a94a9df812e5a39db830cbb7c326',
  6_204_008: '1bf591adce1bceac8ea3a8e44f9fcfed5b252266ceccfcc96991cb20670bc8b1',
  6_204_009: 'a323c1eb80becabbae04661c815887440ddc89e02aa56a757cb776d5348d8255',
  6_204_010: '2439eb3aa80907618d35f188429eb9ca07c56e3b0c35b1218e7732917e6b7ee9',
} as const;

const D466_6204_CR_SPEND = {
  6_204_001: 60, 6_204_002: 50, 6_204_003: 64, 6_204_004: 54, 6_204_005: 58,
  6_204_006: 74, 6_204_007: 66, 6_204_008: 52, 6_204_009: 58, 6_204_010: 46,
} as const;

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
    'tests/fixtures/arena-basis-brutal/seed-6203001.json',
    'tests/fixtures/arena-basis-brutal/seed-6203002.json',
    'tests/fixtures/arena-basis-brutal/seed-6203003.json',
    'tests/fixtures/heldout-party/level-3.json',
    'tests/fixtures/heldout-party/level-4.json',
    'tests/fixtures/heldout-party/level-5.json',
    'tests/fixtures/heldout-party/level-6.json',
  ],
});

function heldoutParty(level: 3 | 4 | 5 | 6) {
  const paths = {
    3: 'tests/fixtures/heldout-party/level-3.json',
    4: 'tests/fixtures/heldout-party/level-4.json',
    5: 'tests/fixtures/heldout-party/level-5.json',
    6: 'tests/fixtures/heldout-party/level-6.json',
  } as const;
  const loaded = loadExternalPartyPackBytes(inputs.fixtures.readText(paths[level]));
  if (loaded.status !== 'loaded') throw new Error(`Held-out party ${String(level)} did not load.`);
  return loaded.party;
}

function independentMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function omitUndefined(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

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

function d466NonRosterProjection(room: GeneratedRoom): unknown {
  const monsterTokenIndexes = new Map(room.spec.monsterRoster.map((entry, index) => [
    String(entry.tokenId),
    index,
  ]));
  return omitUndefined({
    spec: { ...room.spec, monsterRoster: [] },
    encounter: {
      ...room.encounter,
      state: {
        ...room.encounter.state,
        combatants: room.encounter.state.combatants.filter(
          (combatant) => combatant.profile.kind !== 'monster',
        ).map((combatant) => ({
          ...combatant,
          profile: {
            ...combatant.profile,
            rules: { ...combatant.profile.rules, sizeCategory: legacyFixtureSize(combatant.profile) },
          },
        })),
        tokens: room.encounter.state.tokens.map((token) => {
          const monsterIndex = monsterTokenIndexes.get(String(token.id));
          return {
            ...token,
            placementMode: undefined,
            position: monsterIndex === undefined
              ? token.position
              : {
                  column: room.spec.dimensions.columns - 2 - monsterIndex % 2,
                  row: 1 + Math.floor(monsterIndex / 2) * 2,
                },
          };
        }),
        environment: {
          ...room.encounter.state.environment,
          narrowOpeningRegions: undefined,
        },
        sharedSpaceRelations: undefined,
        adjudicationPending: undefined,
        observationHistory: undefined,
      },
    },
  });
}

function fixtureSize(profile: GeneratedRoom['encounter']['state']['combatants'][number]['profile']): KnownCreatureSize {
  if (profile.kind === 'player_character') return 'Medium';
  const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === profile.statblockId);
  const size = row?.statblock.sourceDetails.classification.kind === 'present'
    ? row.statblock.sourceDetails.classification.value.sizes[0]
    : undefined;
  if (size === undefined || !creatureSizes.includes(size as KnownCreatureSize)) {
    throw new Error(`Frozen room references ${profile.statblockId} without an authoritative size.`);
  }
  return size as KnownCreatureSize;
}

function legacyFixtureSize(
  profile: GeneratedRoom['encounter']['state']['combatants'][number]['profile'],
): KnownCreatureSize | undefined {
  if (profile.kind === 'player_character') return undefined;
  const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === profile.statblockId);
  const sizes = row?.statblock.sourceDetails.classification.kind === 'present'
    ? row.statblock.sourceDetails.classification.value.sizes
    : [];
  const [size] = sizes;
  return sizes.length === 1 && size !== undefined && creatureSizes.includes(size as KnownCreatureSize)
    ? size as KnownCreatureSize
    : undefined;
}

function footprintWidth(size: KnownCreatureSize): 1 | 2 | 3 | 4 {
  switch (size) {
    case 'Tiny':
    case 'Small':
    case 'Medium': return 1;
    case 'Large': return 2;
    case 'Huge': return 3;
    case 'Gargantuan': return 4;
  }
}

function expectedCreatureSpaceFixture(bytes: string): string {
  const legacy = JSON.parse(bytes) as GeneratedRoom;
  const sizes = new Map(legacy.encounter.state.combatants.map((combatant) => [
    String(combatant.profile.id),
    fixtureSize(combatant.profile),
  ]));
  const occupied = new Set<string>();
  const blocked = new Set(legacy.spec.blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`));
  const tokens = legacy.encounter.state.tokens.map((token) => {
    const size = sizes.get(String(token.combatantId));
    if (size === undefined) throw new Error(`Frozen token ${token.id} has no sized combatant.`);
    const width = footprintWidth(size);
    const candidates = Array.from(
      { length: legacy.spec.dimensions.columns * legacy.spec.dimensions.rows },
      (_unused, index) => ({
        column: index % legacy.spec.dimensions.columns,
        row: Math.floor(index / legacy.spec.dimensions.columns),
      }),
    ).sort((left, right) =>
      Math.max(
        Math.abs(left.column - token.position.column),
        Math.abs(left.row - token.position.row),
      ) - Math.max(
        Math.abs(right.column - token.position.column),
        Math.abs(right.row - token.position.row),
      ) || left.row - right.row || left.column - right.column);
    const position = candidates.find((anchor) => {
      if (anchor.column + width > legacy.spec.dimensions.columns ||
        anchor.row + width > legacy.spec.dimensions.rows) return false;
      for (let row = anchor.row; row < anchor.row + width; row += 1) {
        for (let column = anchor.column; column < anchor.column + width; column += 1) {
          const key = `${String(column)},${String(row)}`;
          if (blocked.has(key) || occupied.has(key)) return false;
        }
      }
      return true;
    });
    if (position === undefined) throw new Error(`Frozen token ${token.id} has no legal D514 anchor.`);
    for (let row = position.row; row < position.row + width; row += 1) {
      for (let column = position.column; column < position.column + width; column += 1) {
        occupied.add(`${String(column)},${String(row)}`);
      }
    }
    return { ...token, position, placementMode: { kind: 'normal' as const, actual: size } };
  });
  const upgraded: GeneratedRoom = {
    ...legacy,
    encounter: {
      ...legacy.encounter,
      state: {
        ...legacy.encounter.state,
        combatants: legacy.encounter.state.combatants.map((combatant) => ({
          ...combatant,
          profile: {
            ...combatant.profile,
            rules: { ...combatant.profile.rules, sizeCategory: fixtureSize(combatant.profile) },
          },
        })),
        tokens,
        environment: {
          ...legacy.encounter.state.environment,
          narrowOpeningRegions: [],
        },
        sharedSpaceRelations: [],
        adjudicationPending: [],
        observationHistory: [],
      },
    },
  };
  return `${canonicalJson(upgraded)}\n`;
}

function legacyCreatureSpaceProjection(room: GeneratedRoom): string {
  const monsterTokenIndexes = new Map(room.spec.monsterRoster.map((entry, index) => [
    String(entry.tokenId),
    index,
  ]));
  return canonicalJson(omitUndefined({
    ...room,
    encounter: {
      ...room.encounter,
      state: {
        ...room.encounter.state,
        combatants: room.encounter.state.combatants.map((combatant) => ({
          ...combatant,
          profile: {
            ...combatant.profile,
            rules: { ...combatant.profile.rules, sizeCategory: legacyFixtureSize(combatant.profile) },
          },
        })),
        tokens: room.encounter.state.tokens.map((token) => {
          const monsterIndex = monsterTokenIndexes.get(String(token.id));
          return {
            ...token,
            placementMode: undefined,
            position: monsterIndex === undefined
              ? token.position
              : {
                  column: room.spec.dimensions.columns - 2 - monsterIndex % 2,
                  row: 1 + Math.floor(monsterIndex / 2) * 2,
                },
          };
        }),
        environment: {
          ...room.encounter.state.environment,
          narrowOpeningRegions: undefined,
        },
        sharedSpaceRelations: undefined,
        adjudicationPending: undefined,
        observationHistory: undefined,
      },
    },
  }));
}

describe('seeded room generator', () => {
  it('produces byte-identical reducer state for the same seed', () => {
    expect(canonicalJson(generateRoom(394_300))).toBe(canonicalJson(generateRoom(394_300)));
    expect(canonicalJson(generateRoom(511_700, { difficulty: 'hard' }))).toBe(
      canonicalJson(generateRoom(511_700, { difficulty: 'hard' })),
    );
    expect(canonicalJson(generateRoom(620_300, { difficulty: 'brutal' }))).toBe(
      canonicalJson(generateRoom(620_300, { difficulty: 'brutal' })),
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
    // Seed 3943005's Priest Acolyte derives three independent 1/day Divine Aid pools from its statblock.
    const path = `tests/fixtures/arena-basis/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis/seed-${typeof seed}.json`;
    const fixtureBytes = inputs.fixtures.readText(path);
    expect(`${canonicalJson(generateRoom(seed))}\n`).toBe(expectedCreatureSpaceFixture(fixtureBytes));
  });

  it('kills M576-E2-LEGACY-DEFAULT-CONSUMES-RNG without serializing a terrain profile', () => {
    const fixtureBytes = inputs.fixtures.readText('tests/fixtures/arena-basis/seed-3943001.json');
    const generated = generateRoom(3_943_001);
    expect(Object.hasOwn(generated.spec, 'terrainProfile')).toBe(false);
    expect(`${canonicalJson(generated)}\n`).toBe(expectedCreatureSpaceFixture(fixtureBytes));
  });

  it.each(HARD_BASIS_SEEDS)('pins frozen hard arena basis seed %s byte-for-byte', (seed) => {
    // Every hard basis seed has Priest monster-1: Spirit Guardians is 1/day and each Divine Aid spell is 3/day.
    const path = `tests/fixtures/arena-basis-hard/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis-hard/seed-${typeof seed}.json`;
    const fixtureBytes = inputs.fixtures.readText(path);
    expect(`${canonicalJson(generateRoom(seed, { difficulty: 'hard' }))}\n`).toBe(
      expectedCreatureSpaceFixture(fixtureBytes),
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

  it.each(BRUTAL_BASIS_SEEDS)('pins frozen brutal arena basis seed %s byte-for-byte', (seed) => {
    const path = `tests/fixtures/arena-basis-brutal/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis-brutal/seed-${typeof seed}.json`;
    const generatedBytes = `${canonicalJson(generateRoom(seed, { difficulty: 'brutal' }))}\n`;
    const fixtureBytes = inputs.fixtures.readText(path);
    const legacyGeneratedBytes = `${legacyCreatureSpaceProjection(
      generateRoom(seed, { difficulty: 'brutal' }),
    )}\n`;
    if (seed === 6_203_001) expect(legacyGeneratedBytes).toBe(fixtureBytes);
    expect(sha256(legacyGeneratedBytes),
      `seed ${String(seed)} pre-replacement generation changed`).toBe(
      BRUTAL_BASIS_GENERATED_DIGESTS[seed],
    );
    expect(sha256(fixtureBytes), `seed ${String(seed)} typed fixture changed`).toBe(
      BRUTAL_BASIS_FIXTURE_DIGESTS[seed],
    );
    if (seed === 6_203_001) expect(generatedBytes).toBe(expectedCreatureSpaceFixture(fixtureBytes));
  });

  it('applies only the three 6204 post-sampling replacements without changing RNG-derived room data', () => {
    expect(D466_GENERATED_ROOM_OVERRIDES.map((override) => override.seed)).toEqual([
      6_204_004, 6_204_006, 6_204_009,
    ]);
    for (let seed = 6_204_001; seed <= 6_204_010; seed += 1) {
      const typedSeed = seed as keyof typeof D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS;
      const room = generateRoom(seed, { difficulty: 'brutal' });
      expect(
        sha256(canonicalJson(d466NonRosterProjection(room))),
        `seed ${String(seed)} changed terrain, party, ids, placement, or RNG-derived state`,
      ).toBe(D466_6204_NON_ROSTER_DIGESTS[typedSeed]);
      expect(room.spec.challengeBudgetEighths, `seed ${String(seed)} changed CR budget`).toBe(
        D466_6204_CR_SPEND[typedSeed],
      );
      expect(room.spec.challengeSpentEighths, `seed ${String(seed)} changed CR spend`).toBe(
        D466_6204_CR_SPEND[typedSeed],
      );

      const override = D466_GENERATED_ROOM_OVERRIDES.find((candidate) => candidate.seed === seed);
      if (override === undefined) {
        expect(
          sha256(canonicalJson(room.spec.monsterRoster)),
          `seed ${String(seed)} roster changed; making the override also fire for 6204005 must fail`,
        ).toBe(D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS[typedSeed]);
        continue;
      }

      const replacement = d466CreatureReplacement(override.original);
      const replacementEntries = room.spec.monsterRoster.filter(
        (entry) => entry.statblockId === replacement.replacement,
      );
      expect(replacementEntries.length, `seed ${String(seed)} did not receive its replacement`).toBeGreaterThan(0);
      expect(room.spec.monsterRoster.some((entry) => entry.statblockId === replacement.original)).toBe(false);
      for (const entry of replacementEntries) {
        expect(entry).toMatchObject({
          challengeRating: replacement.challengeRating,
          challengeEighths: replacement.crEighths,
        });
        const combatant = room.encounter.state.combatants.find(
          (candidate) => candidate.profile.id === entry.combatantId,
        );
        expect(combatant?.profile).toEqual(monsterCombatantProfile(
          d466ReplacementStatblock(replacement),
          { combatantId: entry.combatantId, tokenId: entry.tokenId },
        ));
      }
      const restoredRoster = room.spec.monsterRoster.map((entry) =>
        entry.statblockId !== replacement.replacement ? entry : {
          ...entry,
          statblockId: replacement.original,
        });
      expect(
        sha256(canonicalJson(restoredRoster)),
        `seed ${String(seed)} changed sampled roster data beyond the typed id replacement`,
      ).toBe(D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS[typedSeed]);
    }
  });

  it.each(BRUTAL_PRODUCTIVITY_SEEDS)(
    'generates brutal seed %s with executable casters, dense terrain, scaled pressure, and productive monsters',
    (seed) => {
      const hard = generateRoom(seed, { difficulty: 'hard' });
      const brutal = generateRoom(seed, { difficulty: 'brutal' });
      expect(brutal.spec.challengeBudgetEighths).toBe(
        hard.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_BUDGET_SCALE,
      );
      expect(brutal.spec.challengeSpentEighths).toBeGreaterThanOrEqual(
        brutal.spec.challengeBudgetEighths * 0.9,
      );
      expect(brutal.spec.challengeSpentEighths).toBeLessThanOrEqual(
        brutal.spec.challengeBudgetEighths,
      );

      const rosterRows = brutal.spec.monsterRoster.map((entry) => {
        const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === entry.statblockId);
        if (row === undefined) throw new Error(`Brutal room references unknown ${entry.statblockId}.`);
        return row;
      });
      expect(rosterRows.some((row) => {
        const actions = row.statblock.sourceDetails.actions;
        return actions.kind === 'present' && actions.value.some((action) =>
          action.kind === 'spellcasting' && action.execution?.kind !== 'absent' &&
          action.spells.some((spell) => spell.manifestStatus === 'implemented'));
      })).toBe(true);

      const terrainCounts = {
        difficult: brutal.spec.terrain.filter((feature) =>
          feature.kind === 'difficult-terrain-patch').length,
        hazards: brutal.spec.terrain.filter((feature) => feature.kind === 'hazard-object').length,
        lights: brutal.spec.terrain.filter((feature) => feature.kind === 'light-source').length,
        obscurement: brutal.spec.terrain.filter((feature) =>
          feature.kind === 'obscurement-patch').length,
      };
      expect(terrainCounts.difficult).toBeGreaterThanOrEqual(3);
      expect(terrainCounts.hazards).toBeGreaterThanOrEqual(3);
      expect(terrainCounts.lights).toBeGreaterThanOrEqual(2);
      expect(terrainCounts.obscurement).toBeGreaterThanOrEqual(2);
      expect(brutal.spec.terrain.length).toBeGreaterThan(hard.spec.terrain.length);
      expect(Object.values(terrainCounts).reduce((total, count) => total + count, 0))
        .toBeGreaterThanOrEqual(BRUTAL_TERRAIN_FEATURE_COUNT_BAND.minimum);
      expect(Object.values(terrainCounts).reduce((total, count) => total + count, 0))
        .toBeLessThanOrEqual(BRUTAL_TERRAIN_FEATURE_COUNT_BAND.maximum);

      const planningState = freshMonsterPlanningState(brutal.encounter.state);
      const monsters = planningState.combatants.filter((combatant) =>
        combatant.profile.kind === 'monster');
      for (const monster of monsters) {
        const productive = availableEngineActorOptions(planningState, monster.profile.id)
          .some((option) => {
            const resolution = resolveEngineActorOption(planningState, option);
            return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
              resolution.mechanics.actionSlots.some((slot) =>
                slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
                slot.kind === 'use_world_object'));
          });
        expect(productive, `${monster.profile.id} has no productive first-turn option`).toBe(true);
      }
    },
  );

  it.each([
    [3, 900],
    [4, 1_500],
    [5, 3_000],
    [6, 4_000],
  ] as const)('builds four full level-matched PCs at level %s', (level, targetXp) => {
    const party = heldoutParty(level);
    const room = generateRoom(7_850_001 + level, {
      initiativeProfile: 'derived_v1',
      heldoutOrdinary: {
        protocol: 'heldout-development-v1',
        party,
        partyLevel: level,
        targetXp,
      },
    });
    const players = room.encounter.state.combatants.filter((subject) =>
      subject.profile.kind === 'player_character');

    expect(players).toHaveLength(4);
    expect(players.map((subject) => subject.profile.id)).toEqual(
      party.members.map((member) => member.profile.id),
    );
    expect(players.every((subject) =>
      subject.life === 'living' && subject.hitPoints === subject.profile.rules.hitPointMaximum &&
      subject.deathSaves === null)).toBe(true);
    expect(room.spec.partyState.every((seat) =>
      seat.hitPointFraction === 1 && seat.concentrating === false &&
      seat.spellSlots.every((slot) => slot.remaining === slot.maximum))).toBe(true);
    expect(room.spec.heldoutOrdinary).toMatchObject({
      protocol: 'heldout-development-v1',
      partyLevel: level,
      targetXp,
      spentXp: targetXp,
    });
  });

  it('all 16 family/budget cells have exact maximizing vectors', () => {
    const expectedCounts = {
      goblinoid_warband: [90, 151, 125, 44],
      undead_crypt: [213, 505, 279, 36],
      mercenary_company: [323, 548, 294, 56],
      wild_beasts: [4_820, 12_158, 25_354, 22_467],
    } as const;
    const budgets = [900, 1_500, 3_000, 4_000] as const;

    for (const family of HELDOUT_STARTER_MONSTER_FAMILIES) {
      expect(budgets.map((budget) => {
        const vectors = heldoutMaximizingMonsterRosters(family, budget);
        expect(vectors.every((vector) => vector.spentXp === budget)).toBe(true);
        return vectors.length;
      })).toEqual(expectedCounts[family]);
    }
  });

  it('maximal XP roster follows the canonical tie draw', () => {
    const seed = 7_850_009;
    const rng = independentMulberry32(seed);
    const expectedFamilyIndex = Math.floor(rng() * HELDOUT_STARTER_MONSTER_FAMILIES.length);
    const expectedFamily = HELDOUT_STARTER_MONSTER_FAMILIES[expectedFamilyIndex];
    if (expectedFamily === undefined) throw new Error('Independent family draw escaped its registry.');
    const vectors = heldoutMaximizingMonsterRosters(expectedFamily, 3_000);
    const expectedVectorIndex = Math.floor(rng() * vectors.length);
    const expectedVector = vectors[expectedVectorIndex];
    if (expectedVector === undefined) throw new Error('Independent vector draw escaped its registry.');
    const room = generateRoom(seed, {
      dimensions: { columns: 12, rows: 12 },
      heldoutOrdinary: {
        protocol: 'heldout-development-v1',
        party: heldoutParty(5),
        partyLevel: 5,
        targetXp: 3_000,
      },
    });
    const provenance = room.spec.heldoutOrdinary;
    if (provenance === undefined) throw new Error('Held-out provenance is absent.');

    expect(provenance.family).toBe(expectedFamily);
    expect(provenance.rng.familyDrawIndex).toBe(expectedFamilyIndex);
    expect(provenance.maximizingVectorIndex).toBe(expectedVectorIndex);
    expect(provenance.rng.vectorDrawIndex).toBe(expectedVectorIndex);
    expect(room.spec.monsterRoster.map((entry) => entry.statblockId)).toEqual(expectedVector.statblockIds);
    expect(provenance.maximizingVectorCount).toBe(vectors.length);
    expect(provenance.spentXp).toBe(provenance.targetXp);
  });

  it('challenge absence fails explicitly', () => {
    const source = STARTER_MONSTER_ROSTER.find((row) => row.family === 'goblinoid_warband');
    if (source === undefined) throw new Error('Starter roster lost its goblinoid family.');
    const missingChallenge = {
      ...source,
      statblock: {
        ...source.statblock,
        sourceDetails: {
          ...source.statblock.sourceDetails,
          challenge: { kind: 'absent' as const, note: 'negative control' },
        },
      },
    };

    expect(() => heldoutMaximizingMonsterRosters(
      'goblinoid_warband',
      900,
      [missingChallenge],
    )).toThrow(`Held-out starter monster ${source.id} has no sourced challenge XP.`);
  });

  it('allows any loaded built character to replace a default companion', () => {
    const original = JSON.parse(inputs.fixtures.readText(
      'tests/fixtures/heldout-party/level-3.json',
    )) as unknown;
    if (typeof original !== 'object' || original === null || !('members' in original) ||
      !Array.isArray(original.members)) throw new Error('Party fixture structure changed.');
    const loadedOriginal = loadExternalPartyPackBytes(JSON.stringify(original));
    if (loadedOriginal.status !== 'loaded') throw new Error('Original held-out party did not load.');
    const replacement = structuredClone(loadedOriginal.party.pack.members[0]);
    if (replacement === undefined) throw new Error('Held-out party has no replacement source.');
    const members = [...loadedOriginal.party.pack.members];
    members[1] = {
      ...replacement,
      combatantId: 'combatant:arbitrary-built-replacement',
      tokenId: 'token:arbitrary-built-replacement',
      characterId: 58_617,
    };
    const loadedReplacement = loadExternalPartyPackBytes(JSON.stringify({
      ...loadedOriginal.party.pack,
      members,
    }));
    if (loadedReplacement.status !== 'loaded') throw new Error('Arbitrary replacement did not load.');

    const room = generateRoom(7_850_017, {
      heldoutOrdinary: {
        protocol: 'heldout-development-v1',
        party: loadedReplacement.party,
        partyLevel: 3,
        targetXp: 900,
      },
    });
    expect(room.encounter.state.combatants.filter((subject) =>
      subject.profile.kind === 'player_character').map((subject) => subject.profile.id)).toContain(
      'combatant:arbitrary-built-replacement',
    );
  });
});
