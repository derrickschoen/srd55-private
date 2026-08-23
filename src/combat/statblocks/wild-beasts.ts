import { monsterStatblock } from '../statblock';
import {
  SRD_PATH,
  abilityLines,
  baseDetails,
  conditionOnHit,
  damage,
  melee,
  notListed,
  present,
  savingThrowBonuses,
} from './monster-helpers';

const boarAbilities = abilityLines([13, 1, 1], [11, 0, 0], [14, 2, 2], [2, -4, -4], [9, -1, -1], [5, -3, -3]);
export const BOAR = monsterStatblock({
  id: 'statblock:boar', name: 'Boar', armorClass: 11, hitPointMaximum: 13, speedFeet: 40, initiativeBonus: 0,
  savingThrowBonuses: savingThrowBonuses(boarAbilities), usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 22782, lineEnd: 22809 }], { sizes: ['Medium'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: '1/4', experiencePoints: 50, proficiencyBonus: 2 }, { count: 2, sides: 8, modifier: 4 }, 40, boarAbilities),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([]), passivePerception: 9, languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'bloodied_fury', grantsAdvantageOn: ['attack_rolls'] }]),
    actions: [melee('gore', 'Gore', 3, [damage(4, 1, 6, 1, 'Piercing'), damage(3, 1, 6, 0, 'Piercing', { kind: 'charge', minimumStraightFeet: 20, maximumTargetSize: 'Medium' })], [conditionOnHit('Prone', 'Medium', { trigger: { kind: 'charge', minimumStraightFeet: 20, maximumTargetSize: 'Medium' } })])],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const blackBearAbilities = abilityLines([15, 2, 2], [12, 1, 1], [14, 2, 2], [2, -4, -4], [12, 1, 1], [7, -2, -2]);
export const BLACK_BEAR = monsterStatblock({
  id: 'statblock:black-bear', name: 'Black Bear', armorClass: 11, hitPointMaximum: 19, speedFeet: 30, initiativeBonus: 1,
  savingThrowBonuses: savingThrowBonuses(blackBearAbilities), attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 22727, lineEnd: 22748 }], { sizes: ['Medium'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: '1/2', experiencePoints: 100, proficiencyBonus: 2 }, { count: 3, sides: 8, modifier: 6 }, 30, blackBearAbilities, [{ kind: 'climb', feet: 30, hover: false }, { kind: 'swim', feet: 30, hover: false }]),
    skills: present([{ name: 'Perception', bonus: 5 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 15, languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['rend'], combination: 'any' }, melee('rend', 'Rend', 4, [damage(5, 1, 6, 2, 'Slashing')])],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const direWolfAbilities = abilityLines([17, 3, 3], [15, 2, 2], [15, 2, 2], [3, -4, -4], [12, 1, 1], [7, -2, -2]);
export const DIRE_WOLF = monsterStatblock({
  id: 'statblock:dire-wolf', name: 'Dire Wolf', armorClass: 14, hitPointMaximum: 22, speedFeet: 50, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(direWolfAbilities), usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 22865, lineEnd: 22891 }], { sizes: ['Large'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 3, sides: 10, modifier: 6 }, 50, direWolfAbilities),
    skills: present([{ name: 'Perception', bonus: 5 }, { name: 'Stealth', bonus: 4 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 15, languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }]),
    actions: [melee('bite', 'Bite', 5, [damage(8, 1, 10, 3, 'Piercing')], [conditionOnHit('Prone', 'Large')])], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const brownBearAbilities = abilityLines([17, 3, 3], [12, 1, 1], [15, 2, 2], [2, -4, -4], [13, 1, 1], [7, -2, -2]);
export const BROWN_BEAR = monsterStatblock({
  id: 'statblock:brown-bear', name: 'Brown Bear', armorClass: 11, hitPointMaximum: 22, speedFeet: 40, initiativeBonus: 1,
  savingThrowBonuses: savingThrowBonuses(brownBearAbilities), attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 22768, lineEnd: 22771 }, { path: SRD_PATH, lineStart: 22811, lineEnd: 22833 }], { sizes: ['Large'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 3, sides: 10, modifier: 6 }, 40, brownBearAbilities, [{ kind: 'climb', feet: 30, hover: false }]),
    skills: present([{ name: 'Perception', bonus: 3 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 13, languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['bite', 'claw'], combination: 'fixed' }, melee('bite', 'Bite', 5, [damage(7, 1, 8, 3, 'Piercing')]), melee('claw', 'Claw', 5, [damage(5, 1, 4, 3, 'Slashing')], [conditionOnHit('Prone', 'Large')])],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const lionAbilities = abilityLines([17, 3, 3], [15, 2, 2], [11, 0, 0], [3, -4, -4], [12, 1, 1], [8, -1, -1]);
export const LION = monsterStatblock({
  id: 'statblock:lion', name: 'Lion', armorClass: 12, hitPointMaximum: 22, speedFeet: 50, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(lionAbilities), attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 23518, lineEnd: 23556 }], { sizes: ['Large'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 4, sides: 10, modifier: 0 }, 50, lionAbilities),
    skills: present([{ name: 'Perception', bonus: 3 }, { name: 'Stealth', bonus: 4 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 13, languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }, { kind: 'running_leap', runningStartFeet: 10, longJumpFeet: 25 }]),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['rend', 'roar'], combination: 'one_attack_may_be_replaced' },
      melee('rend', 'Rend', 5, [damage(7, 1, 8, 3, 'Slashing')]),
      { kind: 'saving_throw', id: 'roar', name: 'Roar', savingThrow: { ability: 'wisdom', dc: 11 }, target: { rangeFeet: 15, maximumSize: null, excludedKinds: [] }, failure: { damage: [], effects: [conditionOnHit('Frightened', null, { duration: 'until_start_of_monster_next_turn' })] }, success: { kind: 'none' } },
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const tigerAbilities = abilityLines([17, 3, 3], [16, 3, 3], [14, 2, 2], [3, -4, -4], [12, 1, 1], [8, -1, -1]);
export const TIGER = monsterStatblock({
  id: 'statblock:tiger', name: 'Tiger', armorClass: 13, hitPointMaximum: 30, speedFeet: 40, initiativeBonus: 3,
  savingThrowBonuses: savingThrowBonuses(tigerAbilities), usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 23968, lineEnd: 23994 }], { sizes: ['Large'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 4, sides: 10, modifier: 8 }, 40, tigerAbilities),
    skills: present([{ name: 'Perception', bonus: 3 }, { name: 'Stealth', bonus: 7 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 13, languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [melee('rend', 'Rend', 5, [damage(10, 2, 6, 3, 'Slashing')], [conditionOnHit('Prone', 'Large')])],
    bonusActions: present([{ kind: 'nimble_escape', actions: ['Disengage', 'Hide'] }]), reactions: notListed('reactions'),
  },
});

const polarBearAbilities = abilityLines([20, 5, 5], [14, 2, 2], [16, 3, 3], [2, -4, -4], [13, 1, 1], [7, -2, -2]);
export const POLAR_BEAR = monsterStatblock({
  id: 'statblock:polar-bear', name: 'Polar Bear', armorClass: 12, hitPointMaximum: 42, speedFeet: 40, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(polarBearAbilities), attacksPerAction: 2, damageResponses: [{ type: 'Cold', response: 'resistant' }], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 23676, lineEnd: 23696 }], { sizes: ['Large'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 5, sides: 10, modifier: 15 }, 40, polarBearAbilities, [{ kind: 'swim', feet: 40, hover: false }]),
    skills: present([{ name: 'Perception', bonus: 5 }, { name: 'Stealth', bonus: 4 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 15, languages: present([]), damageResponses: present([{ type: 'Cold', response: 'resistant' }]), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['rend'], combination: 'any' }, melee('rend', 'Rend', 7, [damage(9, 1, 8, 5, 'Slashing')])], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const saberToothedTigerAbilities = abilityLines([18, 4, 6], [17, 3, 5], [15, 2, 2], [3, -4, -4], [12, 1, 1], [8, -1, -1]);
export const SABER_TOOTHED_TIGER = monsterStatblock({
  id: 'statblock:saber-toothed-tiger', name: 'Saber-Toothed Tiger', armorClass: 13, hitPointMaximum: 52, speedFeet: 40, initiativeBonus: 3,
  savingThrowBonuses: savingThrowBonuses(saberToothedTigerAbilities), attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 23754, lineEnd: 23787 }], { sizes: ['Large'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 7, sides: 10, modifier: 14 }, 40, saberToothedTigerAbilities),
    skills: present([{ name: 'Perception', bonus: 5 }, { name: 'Stealth', bonus: 7 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 15, languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'running_leap', runningStartFeet: 10, longJumpFeet: 25 }]),
    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['rend'], combination: 'any' }, melee('rend', 'Rend', 6, [damage(11, 2, 6, 4, 'Slashing')])],
    bonusActions: present([{ kind: 'nimble_escape', actions: ['Disengage', 'Hide'] }]), reactions: notListed('reactions'),
  },
});

const giantScorpionAbilities = abilityLines([16, 3, 3], [13, 1, 1], [15, 2, 2], [1, -5, -5], [9, -1, -1], [3, -4, -4]);
export const GIANT_SCORPION = monsterStatblock({
  id: 'statblock:giant-scorpion', name: 'Giant Scorpion', armorClass: 15, hitPointMaximum: 52, speedFeet: 40, initiativeBonus: 1,
  savingThrowBonuses: savingThrowBonuses(giantScorpionAbilities), attacksPerAction: 3, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 23287, lineEnd: 23312 }], { sizes: ['Large'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: 3, experiencePoints: 700, proficiencyBonus: 2 }, { count: 7, sides: 10, modifier: 14 }, 40, giantScorpionAbilities),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'blindsight', rangeFeet: 60 }]), passivePerception: 9, languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 3, actionIds: ['claw', 'claw', 'sting'], combination: 'fixed' },
      melee('claw', 'Claw', 5, [damage(6, 1, 6, 3, 'Bludgeoning')], [conditionOnHit('Grappled', 'Large', { escapeDc: 13, duration: 'until_escape' })]),
      melee('sting', 'Sting', 5, [damage(7, 1, 8, 3, 'Piercing'), damage(11, 2, 10, 0, 'Poison')]),
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});
