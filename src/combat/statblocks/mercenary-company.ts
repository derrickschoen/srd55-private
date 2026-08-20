import { monsterStatblock } from '../statblock';
import {
  SRD_PATH,
  abilityLines,
  baseDetails,
  damage,
  melee,
  meleeOrRanged,
  notListed,
  present,
  ranged,
  savingThrowBonuses,
} from './monster-helpers';

const banditAbilities = abilityLines([11, 0, 0], [12, 1, 1], [12, 1, 1], [10, 0, 0], [10, 0, 0], [10, 0, 0]);
export const BANDIT = monsterStatblock({
  id: 'statblock:bandit', name: 'Bandit', armorClass: 12, hitPointMaximum: 11, speedFeet: 30, initiativeBonus: 1,
  savingThrowBonuses: savingThrowBonuses(banditAbilities), usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 16991, lineEnd: 17017 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: null, alignment: 'Neutral' }, { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, { count: 2, sides: 8, modifier: 2 }, 30, banditAbilities),
    skills: notListed('skills'), gear: present(['Leather Armor', 'Light Crossbow', 'Scimitar']), senses: present([]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Thieves’ Cant', canSpeak: true }]),
    damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [melee('scimitar', 'Scimitar', 3, [damage(4, 1, 6, 1, 'Slashing')]), ranged('light-crossbow', 'Light Crossbow', 3, [damage(5, 1, 8, 1, 'Piercing')], 80, present(320))],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const guardAbilities = abilityLines([13, 1, 1], [12, 1, 1], [12, 1, 1], [10, 0, 0], [11, 0, 0], [10, 0, 0]);
export const GUARD = monsterStatblock({
  id: 'statblock:guard', name: 'Guard', armorClass: 16, hitPointMaximum: 11, speedFeet: 30, initiativeBonus: 1,
  savingThrowBonuses: savingThrowBonuses(guardAbilities), usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 19377, lineEnd: 19398 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: null, alignment: 'Neutral' }, { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, { count: 2, sides: 8, modifier: 2 }, 30, guardAbilities),
    skills: present([{ name: 'Perception', bonus: 2 }]), gear: present(['Chain Shirt', 'Shield', 'Spear']), senses: present([]), passivePerception: 12,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [meleeOrRanged('spear', 'Spear', 3, [damage(4, 1, 6, 1, 'Piercing')], 5, 20, 60)], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const scoutAbilities = abilityLines([11, 0, 0], [14, 2, 2], [12, 1, 1], [11, 0, 0], [13, 1, 1], [11, 0, 0]);
export const SCOUT = monsterStatblock({
  id: 'statblock:scout', name: 'Scout', armorClass: 13, hitPointMaximum: 16, speedFeet: 30, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(scoutAbilities), attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 21130, lineEnd: 21164 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: null, alignment: 'Neutral' }, { rating: '1/2', experiencePoints: 100, proficiencyBonus: 2 }, { count: 3, sides: 8, modifier: 3 }, 30, scoutAbilities),
    skills: present([{ name: 'Nature', bonus: 4 }, { name: 'Perception', bonus: 5 }, { name: 'Stealth', bonus: 6 }, { name: 'Survival', bonus: 5 }]), gear: present(['Leather Armor', 'Longbow', 'Shortsword']), senses: present([]), passivePerception: 15,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: true }]),
    damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['shortsword', 'longbow'], combination: 'any' }, melee('shortsword', 'Shortsword', 4, [damage(5, 1, 6, 2, 'Piercing')]), ranged('longbow', 'Longbow', 4, [damage(6, 1, 8, 2, 'Piercing')], 150, present(600))],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const toughAbilities = abilityLines([15, 2, 2], [12, 1, 1], [14, 2, 2], [10, 0, 0], [10, 0, 0], [11, 0, 0]);
export const TOUGH = monsterStatblock({
  id: 'statblock:tough', name: 'Tough', armorClass: 12, hitPointMaximum: 32, speedFeet: 30, initiativeBonus: 1,
  savingThrowBonuses: savingThrowBonuses(toughAbilities), usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 21807, lineEnd: 21832 }, { path: SRD_PATH, lineStart: 21867, lineEnd: 21873 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: null, alignment: 'Neutral' }, { rating: '1/2', experiencePoints: 100, proficiencyBonus: 2 }, { count: 5, sides: 8, modifier: 10 }, 30, toughAbilities),
    skills: notListed('skills'), gear: present(['Heavy Crossbow', 'Leather Armor', 'Mace']), senses: present([]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }]),
    actions: [melee('mace', 'Mace', 4, [damage(5, 1, 6, 2, 'Bludgeoning')]), ranged('heavy-crossbow', 'Heavy Crossbow', 3, [damage(6, 1, 10, 1, 'Piercing')], 100, present(400))],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const spyAbilities = abilityLines([10, 0, 0], [15, 2, 2], [10, 0, 0], [12, 1, 1], [14, 2, 2], [16, 3, 3]);
export const SPY = monsterStatblock({
  id: 'statblock:spy', name: 'Spy', armorClass: 12, hitPointMaximum: 27, speedFeet: 30, initiativeBonus: 4,
  savingThrowBonuses: savingThrowBonuses(spyAbilities), usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 21620, lineEnd: 21650 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: null, alignment: 'Neutral' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 6, sides: 8, modifier: 0 }, 30, spyAbilities, [{ kind: 'climb', feet: 30, hover: false }]),
    skills: present([{ name: 'Deception', bonus: 5 }, { name: 'Insight', bonus: 4 }, { name: 'Investigation', bonus: 5 }, { name: 'Perception', bonus: 6 }, { name: 'Sleight of Hand', bonus: 4 }, { name: 'Stealth', bonus: 6 }]), gear: present(['Hand Crossbow', 'Shortsword', 'Thieves’ Tools']), senses: present([]), passivePerception: 16,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [
      melee('shortsword', 'Shortsword', 4, [damage(5, 1, 6, 2, 'Piercing'), damage(7, 2, 6, 0, 'Poison')]),
      ranged('hand-crossbow', 'Hand Crossbow', 4, [damage(5, 1, 6, 2, 'Piercing'), damage(7, 2, 6, 0, 'Poison')], 30, present(120)),
    ],
    bonusActions: present([{ kind: 'cunning_action', actions: ['Dash', 'Disengage', 'Hide'] }]), reactions: notListed('reactions'),
  },
});

const berserkerAbilities = abilityLines([16, 3, 3], [12, 1, 1], [17, 3, 3], [9, -1, -1], [11, 0, 0], [9, -1, -1]);
export const BERSERKER = monsterStatblock({
  id: 'statblock:berserker', name: 'Berserker', armorClass: 13, hitPointMaximum: 67, speedFeet: 30, initiativeBonus: 1,
  savingThrowBonuses: savingThrowBonuses(berserkerAbilities), usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 17116, lineEnd: 17139 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: null, alignment: 'Neutral' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 9, sides: 8, modifier: 27 }, 30, berserkerAbilities),
    skills: notListed('skills'), gear: present(['Greataxe', 'Hide Armor']), senses: present([]), passivePerception: 10, languages: present([{ kind: 'named', name: 'Common', canSpeak: true }]),
    damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: present([{ kind: 'bloodied_frenzy', grantsAdvantageOn: ['attack_rolls', 'saving_throws'] }]),
    actions: [melee('greataxe', 'Greataxe', 5, [damage(9, 1, 12, 3, 'Slashing')])], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const knightAbilities = abilityLines([16, 3, 3], [11, 0, 0], [14, 2, 4], [11, 0, 0], [11, 0, 2], [15, 2, 2]);
export const KNIGHT = monsterStatblock({
  id: 'statblock:knight', name: 'Knight', armorClass: 18, hitPointMaximum: 52, speedFeet: 30, initiativeBonus: 0,
  savingThrowBonuses: savingThrowBonuses(knightAbilities), attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 19755, lineEnd: 19779 }, { path: SRD_PATH, lineStart: 19802, lineEnd: 19809 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: null, alignment: 'Neutral' }, { rating: 3, experiencePoints: 700, proficiencyBonus: 2 }, { count: 8, sides: 8, modifier: 16 }, 30, knightAbilities),
    skills: notListed('skills'), gear: present(['Greatsword', 'Heavy Crossbow', 'Plate Armor']), senses: present([]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['greatsword', 'heavy-crossbow'], combination: 'any' },
      melee('greatsword', 'Greatsword', 5, [damage(10, 2, 6, 3, 'Slashing'), damage(4, 1, 8, 0, 'Radiant')]),
      ranged('heavy-crossbow', 'Heavy Crossbow', 2, [damage(11, 2, 10, 0, 'Piercing'), damage(4, 1, 8, 0, 'Radiant')], 100, present(400)),
    ],
    bonusActions: notListed('bonus actions'), reactions: present([{ kind: 'parry', trigger: 'hit_by_melee_attack', requiresHoldingWeapon: true, armorClassBonus: 2, appliesToTriggeringAttackOnly: true }]),
  },
});
