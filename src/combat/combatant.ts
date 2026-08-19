import { abilities, type Ability } from '../domain/enums';
import type { CharacterSheet } from '../queries/character-sheet-builder';
import type { GridCell } from './grid';
import type { DamageResponse } from './resolution';
import type { MonsterStatblock } from './statblock';
import {
  armorClass,
  combatantId,
  damageType,
  feet,
  tokenId,
  type ArmorClass,
  type CombatantId,
  type DamageType,
  type Feet,
  type StatblockId,
  type TokenId,
} from './values';

export class CharacterCombatantProjectionError extends Error {
  override readonly name = 'CharacterCombatantProjectionError' as const;

  constructor(readonly field: string) {
    super(`Character sheet ${field} must be known before combat begins.`);
  }
}

export interface CombatRulesProfile {
  readonly armorClass: ArmorClass;
  readonly hitPointMaximum: number;
  readonly speed: Feet;
  readonly initiativeBonus: number;
  readonly savingThrowBonuses: Readonly<Record<Ability, number>>;
  readonly attacksPerAction: number;
  readonly reach: Feet;
  readonly damageResponses: readonly {
    readonly type: DamageType;
    readonly response: DamageResponse;
  }[];
  readonly conditionImmunities: readonly string[];
  readonly usesDeathSaves: boolean;
  /** Reducer-owned expendable spell slots; absent levels are unavailable. */
  readonly spellSlots: readonly SpellSlotCapacity[];
}

export type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SpellSlotCapacity {
  readonly level: SpellSlotLevel;
  readonly maximum: number;
}

export type CombatantProfile =
  | {
      readonly kind: 'player_character';
      readonly id: CombatantId;
      readonly tokenId: TokenId;
      readonly name: string;
      readonly characterId: number;
      readonly rules: CombatRulesProfile;
    }
  | {
      readonly kind: 'monster';
      readonly id: CombatantId;
      readonly tokenId: TokenId;
      readonly name: string;
      readonly statblockId: StatblockId;
      readonly rules: CombatRulesProfile;
    };

export interface CombatToken {
  readonly id: TokenId;
  readonly combatantId: CombatantId;
  readonly position: GridCell;
}

export interface CharacterCombatantIdentity {
  readonly combatantId: string;
  readonly tokenId: string;
  readonly spellSlots?: readonly SpellSlotCapacity[];
}

export type CharacterCombatSheet = Pick<
  CharacterSheet,
  | 'character_id'
  | 'name'
  | 'hit_point_maximum'
  | 'walking_speed'
  | 'armor_class'
  | 'initiative'
  | 'saves'
  | 'attacks_per_action'
  | 'damage_resistances'
  | 'unchosen_damage_resistances'
>;

function positiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new CharacterCombatantProjectionError(field);
  }
  return value;
}

function sheetSaveBonuses(
  sheet: CharacterCombatSheet,
): Readonly<Record<Ability, number>> {
  const bonuses = Object.fromEntries(
    abilities.map((ability) => {
      const row = sheet.saves.find((save) => save.ability === ability);
      if (row?.value === null || row === undefined) {
        throw new CharacterCombatantProjectionError(`${ability} saving throw`);
      }
      return [ability, row.value];
    }),
  ) as Record<Ability, number>;
  return bonuses;
}

/** Projects only sheet facts the rules engine can stand behind. */
export function characterCombatantProfile(
  sheet: CharacterCombatSheet,
  identity: CharacterCombatantIdentity,
): CombatantProfile {
  if (sheet.hit_point_maximum.value === null) {
    throw new CharacterCombatantProjectionError('Hit Point maximum');
  }
  if (sheet.walking_speed.kind === 'unknown') {
    throw new CharacterCombatantProjectionError('walking Speed');
  }
  if (sheet.unchosen_damage_resistances.length > 0) {
    throw new CharacterCombatantProjectionError('damage resistance types');
  }

  return {
    kind: 'player_character',
    id: combatantId(identity.combatantId),
    tokenId: tokenId(identity.tokenId),
    name: sheet.name,
    characterId: sheet.character_id,
    rules: {
      armorClass: armorClass(sheet.armor_class.value),
      hitPointMaximum: positiveInteger(
        sheet.hit_point_maximum.value,
        'Hit Point maximum',
      ),
      speed: feet(sheet.walking_speed.value),
      initiativeBonus: sheet.initiative.value,
      savingThrowBonuses: sheetSaveBonuses(sheet),
      attacksPerAction: positiveInteger(
        sheet.attacks_per_action.count,
        'attacks per action',
      ),
      reach: feet(5),
      damageResponses: sheet.damage_resistances.map((type) => ({
        type: damageType(type),
        response: 'resistant' as const,
      })),
      conditionImmunities: [],
      usesDeathSaves: true,
      spellSlots: identity.spellSlots ?? [],
    },
  };
}

export interface MonsterCombatantIdentity {
  readonly combatantId: string;
  readonly tokenId: string;
}

export function monsterCombatantProfile(
  statblock: MonsterStatblock,
  identity: MonsterCombatantIdentity,
): CombatantProfile {
  return {
    kind: 'monster',
    id: combatantId(identity.combatantId),
    tokenId: tokenId(identity.tokenId),
    name: statblock.name,
    statblockId: statblock.id,
    rules: {
      armorClass: statblock.armorClass,
      hitPointMaximum: statblock.hitPointMaximum,
      speed: statblock.speed,
      initiativeBonus: statblock.initiativeBonus,
      savingThrowBonuses: statblock.savingThrowBonuses,
      attacksPerAction: statblock.attacksPerAction,
      reach: statblock.reach,
      damageResponses: statblock.damageResponses,
      conditionImmunities: statblock.conditionImmunities,
      usesDeathSaves: statblock.usesDeathSaves,
      spellSlots: [],
    },
  };
}

export function combatToken(
  profile: CombatantProfile,
  position: GridCell,
): CombatToken {
  if (!Number.isSafeInteger(position.column) || !Number.isSafeInteger(position.row)) {
    throw new RangeError('Combat token coordinates must be safe integers.');
  }
  return {
    id: profile.tokenId,
    combatantId: profile.id,
    position: { ...position },
  };
}
