import { abilities } from '../../../src/domain/enums';
import {
  characterCombatantProfile,
  combatToken,
  monsterCombatantProfile,
  type CharacterCombatSheet,
  type CombatantProfile,
  type CombatToken,
  type SpellSlotCapacity,
} from '../../../src/combat/combatant';
import { monsterStatblock } from '../../../src/combat/statblock';

export function monsterProfile(
  key: string,
  options: {
    readonly hitPoints?: number;
    readonly initiativeBonus?: number;
    readonly attacksPerAction?: number;
    readonly usesDeathSaves?: boolean;
    readonly conditionImmunities?: readonly string[];
    readonly constitutionSaveBonus?: number;
  } = {},
): CombatantProfile {
  const statblock = monsterStatblock({
    id: `statblock:${key}`,
    name: key,
    armorClass: 12,
    hitPointMaximum: options.hitPoints ?? 10,
    speedFeet: 30,
    initiativeBonus: options.initiativeBonus ?? 0,
    savingThrowBonuses: {
      strength: 0,
      dexterity: 0,
      constitution: options.constitutionSaveBonus ?? 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    ...(options.attacksPerAction === undefined
      ? {}
      : { attacksPerAction: options.attacksPerAction }),
    ...(options.conditionImmunities === undefined
      ? {}
      : { conditionImmunities: options.conditionImmunities }),
    ...(options.usesDeathSaves === undefined
      ? {}
      : { usesDeathSaves: options.usesDeathSaves }),
  });
  const profile = monsterCombatantProfile(statblock, {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
  });
  return { ...profile, rules: { ...profile.rules, sizeCategory: 'Medium' } };
}

export function characterSheet(
  key: string,
  options: {
    readonly hitPoints?: number;
    readonly initiativeBonus?: number;
    readonly attacksPerAction?: number;
  } = {},
): CharacterCombatSheet {
  const initiativeBonus = options.initiativeBonus ?? 5;
  return {
    character_id: 1,
    name: key,
    creature_classification: { type: 'Humanoid', size: 'Medium' },
    hit_point_maximum: {
      id: 'hit_point_maximum',
      label: 'Hit Point maximum',
      value: options.hitPoints ?? 10,
      formula: 'fixture',
    },
    walking_speed: { kind: 'known', value: 30, detail: 'fixture' },
    armor_class: {
      id: 'armor_class',
      label: 'Armor Class',
      value: 14,
      formula: 'fixture',
      winner: {
        label: 'Unarmored',
        source: 'manual',
        expression: '10 + DEX',
        total: 14,
      },
      shields: [],
      bonuses: [],
      excluded: [],
      tie_break: null,
    },
    initiative: {
      id: 'initiative',
      label: 'Initiative',
      value: initiativeBonus,
      formula: 'fixture',
    },
    ability_scores: abilities.map((ability) => ({
      id: `ability:${ability}`,
      label: ability,
      ability,
      value: ability === 'wisdom' ? 18 : 10,
      score: ability === 'wisdom' ? 18 : 10,
      base_score: ability === 'wisdom' ? 18 : 10,
      increased_score: ability === 'wisdom' ? 18 : 10,
      override_terms: [],
      formula: 'fixture',
    })),
    proficiency_bonus: {
      id: 'proficiency_bonus',
      label: 'Proficiency Bonus',
      value: 2,
      formula: 'fixture',
    },
    saves: abilities.map((ability) => ({
      id: `save:${ability}`,
      label: ability,
      ability,
      value: 0,
      formula: 'fixture',
      proficient: false,
    })),
    attacks_per_action: {
      count: options.attacksPerAction ?? 1,
      unresolved: [],
    },
    damage_resistances: [],
    unchosen_damage_resistances: [],
  };
}

export function playerProfile(
  key: string,
  options: {
    readonly hitPoints?: number;
    readonly initiativeBonus?: number;
    readonly attacksPerAction?: number;
    readonly spellSlots?: readonly SpellSlotCapacity[];
  } = {},
): CombatantProfile {
  return characterCombatantProfile(characterSheet(key, options), {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
    ...(options.spellSlots === undefined ? {} : { spellSlots: options.spellSlots }),
  });
}

export function placedToken(
  profile: CombatantProfile,
  column: number,
  row = 0,
): CombatToken {
  return combatToken(profile, { column, row });
}
