import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import type { GeneratedRoom } from '../../../src/vtt/room-generator';
import { declaredMonsterTraits } from '../../../src/combat/monster-traits';
import { sha256 } from '../../../src/crypto/sha256';
import {
  D466_CREATURE_REPLACEMENTS,
  d466CreatureReplacement,
  d466OriginalStatblock,
  d466ReplacementStatblock,
  type D466OriginalCreatureId,
  type D466ReplacementCreatureId,
} from '../../../src/vtt/d466-room-overrides';
import { monsterTraitSupportRows } from '../../../src/vtt/monster-feature-support';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { generateRoom } from '../../../src/vtt/room-generator';
import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
import { declareTestInputs } from '../../helpers/test-inputs';

const BRUTAL_FIXTURE_PATHS = [
  'tests/fixtures/arena-basis-brutal/seed-6203001.json',
  'tests/fixtures/arena-basis-brutal/seed-6203002.json',
  'tests/fixtures/arena-basis-brutal/seed-6203003.json',
  'tests/fixtures/arena-basis-brutal/seed-6203004.json',
  'tests/fixtures/arena-basis-brutal/seed-6203005.json',
  'tests/fixtures/arena-basis-brutal/seed-6203006.json',
  'tests/fixtures/arena-basis-brutal/seed-6203007.json',
  'tests/fixtures/arena-basis-brutal/seed-6203008.json',
  'tests/fixtures/arena-basis-brutal/seed-6203009.json',
  'tests/fixtures/arena-basis-brutal/seed-6203010.json',
] as const;

const HARD_FIXTURE_PATHS = [
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
] as const;

const inputs = declareTestInputs({ fixtures: [...BRUTAL_FIXTURE_PATHS, ...HARD_FIXTURE_PATHS] });

const AFFECTED_FIXTURE_DIGESTS = [
  {
    path: 'tests/fixtures/arena-basis-brutal/seed-6203002.json',
    combatantId: 'combatant:generated-6203002-monster-3',
    original: 'statblock:doppelganger', replacement: 'statblock:giant-scorpion',
    old: 'cdb567192800c4dbea964fbabf03d88013d7d6402da8b391cf2f60e19e69a0c9',
    current: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
  },
  {
    path: 'tests/fixtures/arena-basis-brutal/seed-6203003.json',
    combatantId: 'combatant:generated-6203003-monster-1',
    original: 'statblock:doppelganger', replacement: 'statblock:giant-scorpion',
    old: '6c470c04fd6373f7fa999d5f0c66539c54eb71e6094e2b83a2ca972ab91720f8',
    current: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
  },
  {
    path: 'tests/fixtures/arena-basis-brutal/seed-6203006.json',
    combatantId: 'combatant:generated-6203006-monster-2',
    original: 'statblock:ghost', replacement: 'statblock:archelon',
    old: '195e40202ba4bef3d8daa39784cbe4550047dae2d115b415fe3466681a0d9944',
    current: '3e6818fe70e276e9ee7407d76b01e3afab7254cc1c27e649d5f445a5f6a6480c',
  },
  {
    path: 'tests/fixtures/arena-basis-brutal/seed-6203007.json',
    combatantId: 'combatant:generated-6203007-monster-1',
    original: 'statblock:doppelganger', replacement: 'statblock:giant-scorpion',
    old: '8807d5e875a914149d688d37eb4d852efd00d0520665ed49589cec14d73cf12c',
    current: 'e6215e5b6388a79bc850e7ff97867f2618733acbb434526a77133e382cba2d1b',
  },
  {
    path: 'tests/fixtures/arena-basis-brutal/seed-6203009.json',
    combatantId: 'combatant:generated-6203009-monster-2',
    original: 'statblock:ghost', replacement: 'statblock:archelon',
    old: '438ca3b825470e0ac11f5f3a587ed22f4cbd1b04fbf3c8f78ae925ebc2cde370',
    current: '9780276cdec0ee71c99cc13217d73376990866f5ab3ab471c7a793196665f7ce',
  },
  {
    path: 'tests/fixtures/arena-basis-brutal/seed-6203010.json',
    combatantId: 'combatant:generated-6203010-monster-2',
    original: 'statblock:ghost', replacement: 'statblock:archelon',
    old: '192ba531c89d5303552c21e7d0f7899685a7c62fcc833c135eb27ddf607dd63c',
    current: '2ec7f3c1298e7b6f3519cf765bcb88f36be3426e02cf7572730a77af9e32114d',
  },
] as const satisfies readonly {
  readonly path: (typeof BRUTAL_FIXTURE_PATHS)[number];
  readonly combatantId: `combatant:generated-${string}`;
  readonly original: D466OriginalCreatureId;
  readonly replacement: D466ReplacementCreatureId;
  readonly old: string;
  readonly current: string;
}[];

const UNCHANGED_FIXTURE_DIGESTS = {
  'tests/fixtures/arena-basis-brutal/seed-6203001.json': '3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b',
  'tests/fixtures/arena-basis-brutal/seed-6203004.json': '6f9465eccac77eb60ffab2be1832f8f1bcd3290c655130c2ac752a38e6d75a20',
  'tests/fixtures/arena-basis-brutal/seed-6203005.json': '5b3be6abbdf2fcccff3243639d582bea2fb1098099fa91cf2208a0f143a2364e',
  'tests/fixtures/arena-basis-brutal/seed-6203008.json': 'b067b1aa081f368859979415c468d997b6fa504cad6ad70dc6998c90eeb3207c',
  'tests/fixtures/arena-basis-hard/seed-5117001.json': 'fb5c2811fa4751b4e3e25f1f2aa4fac74c1235aee998f7a232f24b70164d132d',
  'tests/fixtures/arena-basis-hard/seed-5117002.json': '85daa5615a594cd3cc89f19d605946e33975954ecdae8204b5df216ce3e804ff',
  'tests/fixtures/arena-basis-hard/seed-5117003.json': '67e4ab39e3a7c89e8d96d1deadcb67820c848c78a0ca5fa0a3d8ed40b45007fb',
  'tests/fixtures/arena-basis-hard/seed-5117004.json': 'a23f8912e86d84d091633cd3494af0d886731a7c13af74fdb915d209d8f96e30',
  'tests/fixtures/arena-basis-hard/seed-5117005.json': '8caae8d94f1eeb9ac46f6cabb2ad3578bc1f63b921e59e00911935827d0bac4c',
  'tests/fixtures/arena-basis-hard/seed-5117006.json': '04b6f6af41237fd30e5d486d26d44e929a29ddd5df5cc9689010f5b7fa54e11d',
  'tests/fixtures/arena-basis-hard/seed-5117007.json': '2eb3ff898ebb3e413ef30cbcf9d7611553f4c38b8bfe9135e665ce011ff9b45a',
  'tests/fixtures/arena-basis-hard/seed-5117008.json': 'b59c2a1f6360b80db375363faad7e2212ffaa3db09ed25428c9d8f91ad580805',
  'tests/fixtures/arena-basis-hard/seed-5117009.json': 'b679f1135883166b7a151e95ac969cc4b7d474d10cd180cac85a9a416eb6898a',
  'tests/fixtures/arena-basis-hard/seed-5117010.json': '6388153ab3eec04b77475f328d38b837de1f571c41aeaf6cfcf8a5fd62b44e94',
} as const;

function fixture(path: (typeof BRUTAL_FIXTURE_PATHS)[number] | (typeof HARD_FIXTURE_PATHS)[number]): GeneratedRoom {
  return JSON.parse(inputs.fixtures.readText(path)) as GeneratedRoom;
}

function hasAttackRoll(option: ReturnType<typeof engineActorOptions>['offerable'][number]): boolean {
  return option.actionSlots.some((slot) => {
    const use = slot.use;
    return use.kind === 'attack' ||
      (use.kind === 'multiattack' && use.components.some((component) => component.kind === 'attack'));
  });
}

describe('D466 room roster preflight', () => {
  it('pins both fixture eras and proves each 6203 edit changed only the typed creature halves', () => {
    for (const expected of AFFECTED_FIXTURE_DIGESTS) {
      const bytes = inputs.fixtures.readText(expected.path);
      expect(sha256(bytes), `${expected.path}: reverting only spec.monsterRoster must fail`).toBe(expected.current);
      expect(expected.current).not.toBe(expected.old);
      const room = JSON.parse(bytes) as GeneratedRoom;
      const replacement = d466CreatureReplacement(expected.original);
      expect(replacement.replacement).toBe(expected.replacement);
      const rosterEntry = room.spec.monsterRoster.find((entry) => entry.combatantId === expected.combatantId);
      expect(rosterEntry).toMatchObject({
        statblockId: expected.replacement,
        challengeRating: replacement.challengeRating,
        challengeEighths: replacement.crEighths,
      });
      const combatant = room.encounter.state.combatants.find(
        (candidate) => candidate.profile.id === expected.combatantId,
      );
      const replacementProfile = d466ReplacementStatblock(replacement);
      expect(combatant).toMatchObject({
        hitPoints: replacementProfile.hitPointMaximum,
        profile: { statblockId: expected.replacement, rules: { hitPointMaximum: replacementProfile.hitPointMaximum } },
      });

      const originalProfile = d466OriginalStatblock(replacement);
      const restored: GeneratedRoom = {
        ...room,
        encounter: {
          ...room.encounter,
          state: {
            ...room.encounter.state,
            combatants: room.encounter.state.combatants.map((candidate) =>
              candidate.profile.id !== expected.combatantId ? candidate : {
                ...candidate,
                hitPoints: originalProfile.hitPointMaximum,
                profile: monsterCombatantProfile(originalProfile, {
                  combatantId: candidate.profile.id,
                  tokenId: candidate.profile.tokenId,
                }),
              }),
          },
        },
        spec: {
          ...room.spec,
          monsterRoster: room.spec.monsterRoster.map((entry) =>
            entry.combatantId !== expected.combatantId ? entry : {
              ...entry,
              statblockId: replacement.original,
              challengeRating: replacement.challengeRating,
              challengeEighths: replacement.crEighths,
            }),
        },
      };
      expect(
        sha256(`${canonicalJson(restored)}\n`),
        `${expected.path}: positions, ids, party, terrain, and all non-replacement bytes changed`,
      ).toBe(expected.old);
    }
  });

  it('pins all fourteen fixtures that must remain byte-identical', () => {
    for (const [path, expected] of Object.entries(UNCHANGED_FIXTURE_DIGESTS)) {
      expect(
        sha256(inputs.fixtures.readText(path as keyof typeof UNCHANGED_FIXTURE_DIGESTS)),
        `${path}: collateral fixture edit`,
      ).toBe(expected);
    }
  });

  it('preflights all 30 rooms for an offerable attack roll and exhaustive trait dispositions', () => {
    const rooms = [
      ...BRUTAL_FIXTURE_PATHS.map((path) => ({ label: path, room: fixture(path) })),
      ...HARD_FIXTURE_PATHS.map((path) => ({ label: path, room: fixture(path) })),
      ...Array.from({ length: 10 }, (_unused, index) => {
        const seed = 6_204_001 + index;
        return { label: `generated brutal seed ${String(seed)}`, room: generateRoom(seed, { difficulty: 'brutal' }) };
      }),
    ];
    expect(rooms, 'removing one seed from the 30-room list').toHaveLength(30);

    for (const { label, room } of rooms) {
      const state = freshMonsterPlanningState(room.encounter.state);
      for (const monster of state.combatants) {
        if (monster.profile.kind !== 'monster') continue;
        const partition = engineActorOptions(state, monster.profile.id);
        expect(
          partition.offerable.some(hasAttackRoll),
          `${label}/${monster.profile.statblockId}: reverting the lion mixed-multiattack fix or removing an attack`,
        ).toBe(true);

        const traits = declaredMonsterTraits(state, monster.profile.id);
        const supportRows = monsterTraitSupportRows(state, monster.profile.id);
        expect(
          supportRows,
          `${label}/${monster.profile.statblockId}: dropping a feature-support disposition case`,
        ).toHaveLength(traits.length);
        expect(supportRows.every((row) => row.disposition !== undefined)).toBe(true);
      }
    }
  });

  it('keeps the replacement table closed and fully represented in the fixture policy', () => {
    expect(D466_CREATURE_REPLACEMENTS).toHaveLength(3);
    expect(new Set(AFFECTED_FIXTURE_DIGESTS.map((row) => row.replacement))).toEqual(
      new Set(['statblock:giant-scorpion', 'statblock:archelon']),
    );
  });
});
