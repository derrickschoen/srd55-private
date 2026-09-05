import { creatureTypes, type KnownCreatureType } from '../domain/enums';
import type { AssetId } from './ids';
import type { TokenArchetype, TokenSide } from './pixel-art';
import { archetypeTokenAssetId } from './starter-art-inputs';

/** Every SRD creature type names its bust; a missing row is a compile error. */
export const ARCHETYPE_BY_CREATURE_TYPE: Readonly<Record<KnownCreatureType, TokenArchetype>> = {
  Aberration: 'ooze',
  Beast: 'beast',
  Celestial: 'cleric',
  Construct: 'construct',
  Dragon: 'beast',
  Elemental: 'construct',
  Fey: 'rogue',
  Fiend: 'fiend',
  Giant: 'brute',
  Humanoid: 'fighter',
  Monstrosity: 'beast',
  Ooze: 'ooze',
  Plant: 'ooze',
  Undead: 'undead',
};

export const PASSTHROUGH_TYPE_ARCHETYPE: TokenArchetype = 'brute';
export const UNTYPED_MONSTER_ARCHETYPE: TokenArchetype = 'brute';
export const PLAYER_CHARACTER_ARCHETYPE: TokenArchetype = 'fighter';

/** The resolution says WHY an archetype was chosen; a guess never masquerades as a sourced type. */
export type ArchetypeResolution =
  | { readonly kind: 'known_creature_type'; readonly creatureType: KnownCreatureType; readonly archetype: TokenArchetype }
  | { readonly kind: 'passthrough_creature_type'; readonly creatureType: string; readonly archetype: TokenArchetype }
  | { readonly kind: 'untyped_monster'; readonly archetype: TokenArchetype }
  | { readonly kind: 'player_character'; readonly archetype: TokenArchetype };

export function isKnownCreatureType(value: string): value is KnownCreatureType {
  return (creatureTypes as readonly string[]).includes(value);
}

export interface ArchetypeSubject {
  readonly kind: 'player_character' | 'monster';
  /** Sourced creature type when the profile carries one; absent is a typed state, not ''. */
  readonly creatureType?: string;
}

export function resolveArchetype(subject: ArchetypeSubject): ArchetypeResolution {
  if (subject.kind === 'player_character') {
    return { kind: 'player_character', archetype: PLAYER_CHARACTER_ARCHETYPE };
  }
  if (subject.creatureType === undefined) {
    return { kind: 'untyped_monster', archetype: UNTYPED_MONSTER_ARCHETYPE };
  }
  if (isKnownCreatureType(subject.creatureType)) {
    return {
      kind: 'known_creature_type',
      creatureType: subject.creatureType,
      archetype: ARCHETYPE_BY_CREATURE_TYPE[subject.creatureType],
    };
  }
  return { kind: 'passthrough_creature_type', creatureType: subject.creatureType, archetype: PASSTHROUGH_TYPE_ARCHETYPE };
}

export function tokenSideFor(kind: 'player_character' | 'monster'): TokenSide {
  return kind === 'player_character' ? 'party' : 'foe';
}

export function tokenAssetFor(subject: ArchetypeSubject): AssetId {
  return archetypeTokenAssetId(resolveArchetype(subject).archetype, tokenSideFor(subject.kind));
}
