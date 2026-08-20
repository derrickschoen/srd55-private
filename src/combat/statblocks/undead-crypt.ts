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
  ranged,
  savingThrowBonuses,
} from './monster-helpers';

const warhorseSkeletonAbilities = abilityLines([18, 4, 4], [12, 1, 1], [15, 2, 2], [2, -4, -4], [8, -1, -1], [5, -3, -3]);
export const WARHORSE_SKELETON = monsterStatblock({
  id: 'statblock:warhorse-skeleton', name: 'Warhorse Skeleton', armorClass: 13, hitPointMaximum: 22, speedFeet: 60, initiativeBonus: 1,
  savingThrowBonuses: savingThrowBonuses(warhorseSkeletonAbilities), damageResponses: [{ type: 'Bludgeoning', response: 'vulnerable' }, { type: 'Poison', response: 'immune' }], conditionImmunities: ['Exhaustion', 'Poisoned'], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 21402, lineEnd: 21426 }], { sizes: ['Large'], type: 'Undead', subtype: null, alignment: 'Lawful Evil' }, { rating: '1/2', experiencePoints: 100, proficiencyBonus: 2 }, { count: 3, sides: 10, modifier: 6 }, 60, warhorseSkeletonAbilities),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 9, languages: present([]),
    damageResponses: present([{ type: 'Bludgeoning', response: 'vulnerable' }, { type: 'Poison', response: 'immune' }]), conditionImmunities: present(['Exhaustion', 'Poisoned']), traits: notListed('traits'),
    actions: [melee('hooves', 'Hooves', 6, [damage(7, 1, 6, 4, 'Bludgeoning')], [conditionOnHit('Prone', 'Large', { trigger: { kind: 'charge', minimumStraightFeet: 20, maximumTargetSize: 'Large' } })])], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const ghoulAbilities = abilityLines([13, 1, 1], [15, 2, 2], [10, 0, 0], [7, -2, -2], [10, 0, 0], [6, -2, -2]);
export const GHOUL = monsterStatblock({
  id: 'statblock:ghoul', name: 'Ghoul', armorClass: 12, hitPointMaximum: 22, speedFeet: 30, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(ghoulAbilities), attacksPerAction: 2, damageResponses: [{ type: 'Poison', response: 'immune' }], conditionImmunities: ['Charmed', 'Exhaustion', 'Poisoned'], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 18820, lineEnd: 18830 }, { path: SRD_PATH, lineStart: 18860, lineEnd: 18882 }], { sizes: ['Medium'], type: 'Undead', subtype: null, alignment: 'Chaotic Evil' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 5, sides: 8, modifier: 0 }, 30, ghoulAbilities),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10, languages: present([{ kind: 'named', name: 'Common', canSpeak: true }]),
    damageResponses: present([{ type: 'Poison', response: 'immune' }]), conditionImmunities: present(['Charmed', 'Exhaustion', 'Poisoned']), traits: notListed('traits'),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['bite'], combination: 'any' },
      melee('bite', 'Bite', 4, [damage(5, 1, 6, 2, 'Piercing'), damage(3, 1, 6, 0, 'Necrotic')]),
      melee('claw', 'Claw', 4, [damage(4, 1, 4, 2, 'Slashing')], [conditionOnHit('Paralyzed', null, { excludedKinds: ['Undead', 'Elf'], save: { ability: 'constitution', dc: 10 }, duration: 'until_end_of_target_next_turn' })]),
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const ghastAbilities = abilityLines([16, 3, 3], [17, 3, 3], [10, 0, 0], [11, 0, 0], [10, 0, 2], [8, -1, -1]);
export const GHAST = monsterStatblock({
  id: 'statblock:ghast', name: 'Ghast', armorClass: 13, hitPointMaximum: 36, speedFeet: 30, initiativeBonus: 3,
  savingThrowBonuses: savingThrowBonuses(ghastAbilities), damageResponses: [{ type: 'Necrotic', response: 'resistant' }, { type: 'Poison', response: 'immune' }], conditionImmunities: ['Charmed', 'Exhaustion', 'Poisoned'], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 18758, lineEnd: 18782 }, { path: SRD_PATH, lineStart: 18809, lineEnd: 18818 }, { path: SRD_PATH, lineStart: 18820, lineEnd: 18830 }], { sizes: ['Medium'], type: 'Undead', subtype: null, alignment: 'Chaotic Evil' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 8, sides: 8, modifier: 0 }, 30, ghastAbilities),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10, languages: present([{ kind: 'named', name: 'Common', canSpeak: true }]),
    damageResponses: present([{ type: 'Necrotic', response: 'resistant' }, { type: 'Poison', response: 'immune' }]), conditionImmunities: present(['Charmed', 'Exhaustion', 'Poisoned']),
    traits: present([{ kind: 'stench', emanationFeet: 5, savingThrow: { ability: 'constitution', dc: 10 }, condition: 'Poisoned', duration: 'until_start_of_monster_next_turn', successImmunityHours: 24 }]),
    actions: [
      melee('bite', 'Bite', 5, [damage(7, 1, 8, 3, 'Piercing'), damage(9, 2, 8, 0, 'Necrotic')]),
      melee('claw', 'Claw', 5, [damage(10, 2, 6, 3, 'Slashing')], [conditionOnHit('Paralyzed', null, { excludedKinds: ['Undead'], save: { ability: 'constitution', dc: 10 }, duration: 'until_end_of_target_next_turn' })]),
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const specterAbilities = abilityLines([1, -5, -5], [14, 2, 2], [11, 0, 0], [10, 0, 0], [10, 0, 0], [11, 0, 0]);
export const SPECTER = monsterStatblock({
  id: 'statblock:specter', name: 'Specter', armorClass: 12, hitPointMaximum: 22, speedFeet: 30, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(specterAbilities),
  damageResponses: [{ type: 'Acid', response: 'resistant' }, { type: 'Bludgeoning', response: 'resistant' }, { type: 'Cold', response: 'resistant' }, { type: 'Fire', response: 'resistant' }, { type: 'Lightning', response: 'resistant' }, { type: 'Necrotic', response: 'immune' }, { type: 'Piercing', response: 'resistant' }, { type: 'Poison', response: 'immune' }, { type: 'Slashing', response: 'resistant' }, { type: 'Thunder', response: 'resistant' }],
  conditionImmunities: ['Charmed', 'Exhaustion', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Unconscious'], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 21482, lineEnd: 21522 }], { sizes: ['Medium'], type: 'Undead', subtype: null, alignment: 'Chaotic Evil' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 5, sides: 8, modifier: 0 }, 30, specterAbilities, [{ kind: 'fly', feet: 50, hover: true }]),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: false }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: false }]),
    damageResponses: present([{ type: 'Acid', response: 'resistant' }, { type: 'Bludgeoning', response: 'resistant' }, { type: 'Cold', response: 'resistant' }, { type: 'Fire', response: 'resistant' }, { type: 'Lightning', response: 'resistant' }, { type: 'Necrotic', response: 'immune' }, { type: 'Piercing', response: 'resistant' }, { type: 'Poison', response: 'immune' }, { type: 'Slashing', response: 'resistant' }, { type: 'Thunder', response: 'resistant' }]),
    conditionImmunities: present(['Charmed', 'Exhaustion', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Unconscious']),
    traits: present([
      { kind: 'incorporeal_movement', difficultTerrain: true, endingInObjectDamage: damage(5, 1, 10, 0, 'Force') },
      { kind: 'sunlight_sensitivity', disadvantageOn: ['ability_checks', 'attack_rolls'] },
    ]),
    actions: [melee('life-drain', 'Life Drain', 4, [damage(7, 2, 6, 0, 'Necrotic')], [{ kind: 'hit_point_maximum_reduction', amount: 'damage_taken' }])],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const minotaurSkeletonAbilities = abilityLines([18, 4, 4], [11, 0, 0], [15, 2, 2], [6, -2, -2], [8, -1, -1], [5, -3, -3]);
export const MINOTAUR_SKELETON = monsterStatblock({
  id: 'statblock:minotaur-skeleton', name: 'Minotaur Skeleton', armorClass: 12, hitPointMaximum: 45, speedFeet: 40, initiativeBonus: 0,
  savingThrowBonuses: savingThrowBonuses(minotaurSkeletonAbilities), damageResponses: [{ type: 'Bludgeoning', response: 'vulnerable' }, { type: 'Poison', response: 'immune' }], conditionImmunities: ['Exhaustion', 'Poisoned'], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 21428, lineEnd: 21457 }], { sizes: ['Large'], type: 'Undead', subtype: null, alignment: 'Lawful Evil' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 6, sides: 10, modifier: 12 }, 40, minotaurSkeletonAbilities),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 9, languages: present([{ kind: 'named', name: 'Abyssal', canSpeak: false }]),
    damageResponses: present([{ type: 'Bludgeoning', response: 'vulnerable' }, { type: 'Poison', response: 'immune' }]), conditionImmunities: present(['Exhaustion', 'Poisoned']), traits: notListed('traits'),
    actions: [
      melee('gore', 'Gore', 6, [damage(11, 2, 6, 4, 'Piercing'), damage(9, 2, 8, 0, 'Piercing', { kind: 'charge', minimumStraightFeet: 20, maximumTargetSize: 'Large' })], [conditionOnHit('Prone', 'Large', { trigger: { kind: 'charge', minimumStraightFeet: 20, maximumTargetSize: 'Large' } })]),
      melee('slam', 'Slam', 6, [damage(15, 2, 10, 4, 'Bludgeoning')]),
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const ogreZombieAbilities = abilityLines([19, 4, 4], [6, -2, -2], [18, 4, 4], [3, -4, -4], [6, -2, 0], [5, -3, -3]);
export const OGRE_ZOMBIE = monsterStatblock({
  id: 'statblock:ogre-zombie', name: 'Ogre Zombie', armorClass: 8, hitPointMaximum: 85, speedFeet: 30, initiativeBonus: -2,
  savingThrowBonuses: savingThrowBonuses(ogreZombieAbilities), damageResponses: [{ type: 'Poison', response: 'immune' }], conditionImmunities: ['Exhaustion', 'Poisoned'], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 22637, lineEnd: 22669 }], { sizes: ['Large'], type: 'Undead', subtype: null, alignment: 'Neutral Evil' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 9, sides: 10, modifier: 36 }, 30, ogreZombieAbilities),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 8,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: false }, { kind: 'named', name: 'Giant', canSpeak: false }]),
    damageResponses: present([{ type: 'Poison', response: 'immune' }]), conditionImmunities: present(['Exhaustion', 'Poisoned']),
    traits: present([{ kind: 'undead_fortitude', saveAbility: 'constitution', dcBase: 5, addDamageTaken: true, excludedDamageType: 'Radiant', excludedCriticalHits: true, successHitPoints: 1 }]),
    actions: [melee('slam', 'Slam', 6, [damage(13, 2, 8, 4, 'Bludgeoning')])], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const wightAbilities = abilityLines([15, 2, 2], [14, 2, 2], [16, 3, 3], [10, 0, 0], [13, 1, 1], [15, 2, 2]);
export const WIGHT = monsterStatblock({
  id: 'statblock:wight', name: 'Wight', armorClass: 14, hitPointMaximum: 82, speedFeet: 30, initiativeBonus: 4,
  savingThrowBonuses: savingThrowBonuses(wightAbilities), attacksPerAction: 2, damageResponses: [{ type: 'Necrotic', response: 'resistant' }, { type: 'Poison', response: 'immune' }], conditionImmunities: ['Exhaustion', 'Poisoned'], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 22435, lineEnd: 22490 }], { sizes: ['Medium'], type: 'Undead', subtype: null, alignment: 'Neutral Evil' }, { rating: 3, experiencePoints: 700, proficiencyBonus: 2 }, { count: 11, sides: 8, modifier: 33 }, 30, wightAbilities),
    skills: present([{ name: 'Perception', bonus: 3 }, { name: 'Stealth', bonus: 4 }]), gear: present(['Studded Leather Armor']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 13,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: true }]),
    damageResponses: present([{ type: 'Necrotic', response: 'resistant' }, { type: 'Poison', response: 'immune' }]), conditionImmunities: present(['Exhaustion', 'Poisoned']),
    traits: present([{ kind: 'sunlight_sensitivity', disadvantageOn: ['ability_checks', 'attack_rolls'] }]),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['necrotic-sword', 'necrotic-bow', 'life-drain'], combination: 'one_attack_may_be_replaced' },
      melee('necrotic-sword', 'Necrotic Sword', 4, [damage(6, 1, 8, 2, 'Slashing'), damage(4, 1, 8, 0, 'Necrotic')]),
      ranged('necrotic-bow', 'Necrotic Bow', 4, [damage(6, 1, 8, 2, 'Piercing'), damage(4, 1, 8, 0, 'Necrotic')], 150, present(600)),
      { kind: 'saving_throw', id: 'life-drain', name: 'Life Drain', savingThrow: { ability: 'constitution', dc: 13 }, target: { rangeFeet: 5, maximumSize: null, excludedKinds: [] }, failure: { damage: [damage(6, 1, 8, 2, 'Necrotic')], effects: [{ kind: 'hit_point_maximum_reduction', amount: 'damage_taken' }, { kind: 'raises_as_zombie', targetKind: 'Humanoid', delayHours: 24, controllerLimit: 12, preventedBy: ['restored_to_life', 'body_destroyed'] }] }, success: { kind: 'none' } },
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});
