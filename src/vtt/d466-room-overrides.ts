import type { ChallengeRating, MonsterStatblock } from '../combat/statblock';
import { BUNDLED_MONSTER_ROSTER } from '../combat/statblocks/roster';

export type D466OriginalCreatureId =
  | 'statblock:doppelganger'
  | 'statblock:ghost'
  | 'statblock:will-o-wisp';

export type D466ReplacementCreatureId =
  | 'statblock:giant-scorpion'
  | 'statblock:archelon'
  | 'statblock:gargoyle';

export type EncounterRole =
  | 'melee_disruptor'
  | 'durable_pressure_creature'
  | 'mobile_flying_striker';

export interface D466CreatureReplacement<
  Original extends D466OriginalCreatureId = D466OriginalCreatureId,
  Replacement extends D466ReplacementCreatureId = D466ReplacementCreatureId,
  Rating extends Extract<ChallengeRating, 2 | 3 | 4> = Extract<ChallengeRating, 2 | 3 | 4>,
  Eighths extends 16 | 24 | 32 = 16 | 24 | 32,
  Role extends EncounterRole = EncounterRole,
> {
  readonly original: Original;
  readonly replacement: Replacement;
  readonly challengeRating: Rating;
  /** One shared literal makes unequal original/replacement CR spend unrepresentable. */
  readonly crEighths: Eighths;
  readonly role: Role;
}

export const D466_CREATURE_REPLACEMENTS = [
  {
    original: 'statblock:doppelganger',
    replacement: 'statblock:giant-scorpion',
    challengeRating: 3,
    crEighths: 24,
    role: 'melee_disruptor',
  },
  {
    original: 'statblock:ghost',
    replacement: 'statblock:archelon',
    challengeRating: 4,
    crEighths: 32,
    role: 'durable_pressure_creature',
  },
  {
    original: 'statblock:will-o-wisp',
    replacement: 'statblock:gargoyle',
    challengeRating: 2,
    crEighths: 16,
    role: 'mobile_flying_striker',
  },
] as const satisfies readonly [
  D466CreatureReplacement<'statblock:doppelganger', 'statblock:giant-scorpion', 3, 24, 'melee_disruptor'>,
  D466CreatureReplacement<'statblock:ghost', 'statblock:archelon', 4, 32, 'durable_pressure_creature'>,
  D466CreatureReplacement<'statblock:will-o-wisp', 'statblock:gargoyle', 2, 16, 'mobile_flying_striker'>,
];

export type D466CreatureReplacementRecord = (typeof D466_CREATURE_REPLACEMENTS)[number];

export type D466GeneratedRoomOverride =
  | { readonly seed: 6_204_004; readonly original: 'statblock:doppelganger' }
  | { readonly seed: 6_204_006; readonly original: 'statblock:doppelganger' }
  | { readonly seed: 6_204_009; readonly original: 'statblock:will-o-wisp' };

export const D466_GENERATED_ROOM_OVERRIDES = [
  { seed: 6_204_004, original: 'statblock:doppelganger' },
  { seed: 6_204_006, original: 'statblock:doppelganger' },
  { seed: 6_204_009, original: 'statblock:will-o-wisp' },
] as const satisfies readonly D466GeneratedRoomOverride[];

function challengeEighths(challenge: ChallengeRating): number {
  switch (challenge) {
    case '1/8': return 1;
    case '1/4': return 2;
    case '1/2': return 4;
    case 1: return 8;
    case 2: return 16;
    case 3: return 24;
    case 4: return 32;
    case 5: return 40;
    case 6: return 48;
    case 11: return 88;
  }
}

function rosterCreature(id: D466OriginalCreatureId | D466ReplacementCreatureId): {
  readonly challengeRating: ChallengeRating;
  readonly statblock: MonsterStatblock;
} {
  const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === id);
  if (row === undefined) throw new Error(`D466 replacement table references missing creature ${id}.`);
  if (!('challengeRating' in row)) {
    throw new Error(`D466 replacement table creature ${id} has no roster challenge rating.`);
  }
  return { challengeRating: row.challengeRating, statblock: row.statblock };
}

/** At module load, prove roster metadata and decoded statblock CR agree with the typed record. */
for (const replacement of D466_CREATURE_REPLACEMENTS) {
  for (const id of [replacement.original, replacement.replacement] as const) {
    const creature = rosterCreature(id);
    const decodedChallenge = creature.statblock.sourceDetails.challenge;
    if (
      creature.challengeRating !== replacement.challengeRating ||
      challengeEighths(creature.challengeRating) !== replacement.crEighths ||
      decodedChallenge.kind !== 'present' ||
      decodedChallenge.value.rating !== replacement.challengeRating
    ) {
      throw new Error(
        `D466 replacement ${id} must have CR ${String(replacement.challengeRating)} ` +
        `(${String(replacement.crEighths)} eighths) in roster and statblock metadata.`,
      );
    }
  }
}

export function d466CreatureReplacement(
  original: D466OriginalCreatureId,
): D466CreatureReplacementRecord {
  const replacement = D466_CREATURE_REPLACEMENTS.find((candidate) => candidate.original === original);
  if (replacement === undefined) throw new Error(`Missing D466 creature replacement for ${original}.`);
  return replacement;
}

export function d466ReplacementStatblock(
  replacement: D466CreatureReplacementRecord,
): MonsterStatblock {
  return rosterCreature(replacement.replacement).statblock;
}

export function d466OriginalStatblock(
  replacement: D466CreatureReplacementRecord,
): MonsterStatblock {
  return rosterCreature(replacement.original).statblock;
}

export function d466GeneratedRoomOverride(seed: number): D466CreatureReplacementRecord | null {
  const override = D466_GENERATED_ROOM_OVERRIDES.find((candidate) => candidate.seed === seed);
  return override === undefined ? null : d466CreatureReplacement(override.original);
}
