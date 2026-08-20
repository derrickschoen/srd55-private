import {
  monsterStatblock,
  type DecodedField,
  type MonsterAbilityLine,
  type MonsterAttackAction,
  type MonsterSourceDetailsInput,
} from '../statblock';
import type { Ability } from '../../domain/enums';

const SRD_PATH = 'docs/srd/full/srd-5.2.1.txt' as const;
const present = <T>(value: T): DecodedField<T> => ({ kind: 'present', value });
const notListed = <T>(field: string): DecodedField<T> => ({
  kind: 'absent',
  note: `The bundled SRD statblock does not list ${field}.`,
});

const abilityLines = (
  strength: readonly [number, number, number],
  dexterity: readonly [number, number, number],
  constitution: readonly [number, number, number],
  intelligence: readonly [number, number, number],
  wisdom: readonly [number, number, number],
  charisma: readonly [number, number, number],
): Readonly<Record<Ability, MonsterAbilityLine>> => ({
  strength: { score: strength[0], modifier: strength[1], saveBonus: strength[2] },
  dexterity: { score: dexterity[0], modifier: dexterity[1], saveBonus: dexterity[2] },
  constitution: { score: constitution[0], modifier: constitution[1], saveBonus: constitution[2] },
  intelligence: { score: intelligence[0], modifier: intelligence[1], saveBonus: intelligence[2] },
  wisdom: { score: wisdom[0], modifier: wisdom[1], saveBonus: wisdom[2] },
  charisma: { score: charisma[0], modifier: charisma[1], saveBonus: charisma[2] },
});

const melee = (
  id: string,
  name: string,
  attackBonus: number,
  average: number,
  count: number,
  sides: 4 | 6 | 8 | 10 | 12 | 20,
  modifier: number,
  type: 'Bludgeoning' | 'Piercing' | 'Radiant' | 'Slashing',
  reachFeet = 5,
): MonsterAttackAction => ({
  kind: 'attack', id, name, attackBonus, delivery: { kind: 'melee', reachFeet },
  damage: [{ average, dice: { count, sides, modifier }, type, trigger: 'always' }], onHit: null,
});

const ranged = (
  id: string,
  name: string,
  attackBonus: number,
  average: number,
  count: number,
  sides: 4 | 6 | 8 | 10 | 12 | 20,
  modifier: number,
  type: 'Piercing' | 'Radiant',
  rangeFeet: number,
  longRangeFeet: DecodedField<number>,
): MonsterAttackAction => ({
  kind: 'attack', id, name, attackBonus, delivery: { kind: 'ranged', rangeFeet, longRangeFeet },
  damage: [{ average, dice: { count, sides, modifier }, type, trigger: 'always' }], onHit: null,
});

const baseDetails = (
  source: MonsterSourceDetailsInput['source'],
  classification: MonsterSourceDetailsInput['classification'],
  challenge: MonsterSourceDetailsInput['challenge'],
  hitPointDice: MonsterSourceDetailsInput['hitPointDice'],
  speedFeet: number,
  abilities: MonsterSourceDetailsInput['abilities'],
): Pick<MonsterSourceDetailsInput, 'source' | 'classification' | 'challenge' | 'hitPointDice' | 'movement' | 'abilities'> => ({
  source, classification, challenge, hitPointDice,
  movement: [{ kind: 'walk', feet: speedFeet, hover: false }], abilities,
});

const goblinAbilities = abilityLines([8, -1, -1], [15, 2, 2], [10, 0, 0], [10, 0, 0], [8, -1, -1], [8, -1, -1]);
const goblinScimitar = melee('scimitar', 'Scimitar', 4, 5, 1, 6, 2, 'Slashing');
const goblinShortbow = ranged('shortbow', 'Shortbow', 4, 5, 1, 6, 2, 'Piercing', 80, present(320));

export const GOBLIN_WARRIOR = monsterStatblock({
  id: 'statblock:goblin-warrior', name: 'Goblin Warrior', armorClass: 15, hitPointMaximum: 10, speedFeet: 30,
  initiativeBonus: 2, savingThrowBonuses: Object.fromEntries(Object.entries(goblinAbilities).map(([key, value]) => [key, value.saveBonus])) as Record<Ability, number>,
  usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 18985, lineEnd: 19018 }], { sizes: ['Small'], type: 'Fey', subtype: 'Goblinoid', alignment: 'Chaotic Neutral' }, { rating: '1/4', experiencePoints: 50, proficiencyBonus: 2 }, { count: 3, sides: 6, modifier: 0 }, 30, goblinAbilities),
    skills: present([{ name: 'Stealth', bonus: 6 }]), gear: present(['Leather Armor', 'Scimitar', 'Shield', 'Shortbow']),
    senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 9,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Goblin', canSpeak: true }]),
    damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [
      { ...goblinScimitar, damage: [...goblinScimitar.damage, { average: 2, dice: { count: 1, sides: 4, modifier: 0 }, type: 'Slashing', trigger: 'attack_roll_advantage' }] },
      { ...goblinShortbow, damage: [...goblinShortbow.damage, { average: 2, dice: { count: 1, sides: 4, modifier: 0 }, type: 'Piercing', trigger: 'attack_roll_advantage' }] },
    ],
    bonusActions: present([{ kind: 'nimble_escape', actions: ['Disengage', 'Hide'] }]), reactions: notListed('reactions'),
  },
});

const hobgoblinAbilities = abilityLines([13, 1, 1], [12, 1, 1], [12, 1, 1], [10, 0, 0], [10, 0, 0], [9, -1, -1]);
export const HOBGOBLIN_WARRIOR = monsterStatblock({
  id: 'statblock:hobgoblin-warrior', name: 'Hobgoblin Warrior', armorClass: 18, hitPointMaximum: 11, speedFeet: 30,
  initiativeBonus: 3, savingThrowBonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 0, wisdom: 0, charisma: -1 }, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 19540, lineEnd: 19574 }], { sizes: ['Medium'], type: 'Fey', subtype: 'Goblinoid', alignment: 'Lawful Evil' }, { rating: '1/2', experiencePoints: 100, proficiencyBonus: 2 }, { count: 2, sides: 8, modifier: 2 }, 30, hobgoblinAbilities),
    skills: notListed('skills'), gear: present(['Half Plate Armor', 'Longbow', 'Longsword', 'Shield']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Goblin', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }]),
    actions: [melee('longsword', 'Longsword', 3, 12, 2, 10, 1, 'Slashing'), { ...ranged('longbow', 'Longbow', 3, 5, 1, 8, 1, 'Piercing', 150, present(600)), damage: [{ average: 5, dice: { count: 1, sides: 8, modifier: 1 }, type: 'Piercing', trigger: 'always' }, { average: 7, dice: { count: 3, sides: 4, modifier: 0 }, type: 'Poison', trigger: 'always' }] }],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const banditAbilities = abilityLines([15, 2, 4], [16, 3, 5], [14, 2, 2], [14, 2, 2], [11, 0, 2], [14, 2, 2]);
export const BANDIT_CAPTAIN = monsterStatblock({
  id: 'statblock:bandit-captain', name: 'Bandit Captain', armorClass: 15, hitPointMaximum: 52, speedFeet: 30, initiativeBonus: 3,
  savingThrowBonuses: { strength: 4, dexterity: 5, constitution: 2, intelligence: 2, wisdom: 2, charisma: 2 }, attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 17019, lineEnd: 17053 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: null, alignment: 'Neutral' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 8, sides: 8, modifier: 16 }, 30, banditAbilities),
    skills: present([{ name: 'Athletics', bonus: 4 }, { name: 'Deception', bonus: 4 }]), gear: present(['Pistol', 'Scimitar', 'Studded Leather Armor']), senses: present([]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Thieves’ Cant', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, attackIds: ['scimitar', 'pistol'], combination: 'any' }, melee('scimitar', 'Scimitar', 5, 6, 1, 6, 3, 'Slashing'), ranged('pistol', 'Pistol', 5, 8, 1, 10, 3, 'Piercing', 30, present(90))],
    bonusActions: notListed('bonus actions'), reactions: present([{ kind: 'parry', trigger: 'hit_by_melee_attack', requiresHoldingWeapon: true, armorClassBonus: 2, appliesToTriggeringAttackOnly: true }]),
  },
});

const ogreAbilities = abilityLines([19, 4, 4], [8, -1, -1], [16, 3, 3], [5, -3, -3], [7, -2, -2], [7, -2, -2]);
export const OGRE = monsterStatblock({
  id: 'statblock:ogre', name: 'Ogre', armorClass: 11, hitPointMaximum: 68, speedFeet: 40, initiativeBonus: -1,
  savingThrowBonuses: { strength: 4, dexterity: -1, constitution: 3, intelligence: -3, wisdom: -2, charisma: -2 }, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 20448, lineEnd: 20469 }], { sizes: ['Large'], type: 'Giant', subtype: null, alignment: 'Chaotic Evil' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 8, sides: 10, modifier: 24 }, 40, ogreAbilities),
    skills: notListed('skills'), gear: present(['Greatclub', 'Javelins (3)']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 8,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Giant', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [melee('greatclub', 'Greatclub', 6, 13, 2, 8, 4, 'Bludgeoning'), { kind: 'attack', id: 'javelin', name: 'Javelin', attackBonus: 6, delivery: { kind: 'melee_or_ranged', reachFeet: 5, rangeFeet: 30, longRangeFeet: 120 }, damage: [{ average: 11, dice: { count: 2, sides: 6, modifier: 4 }, type: 'Piercing', trigger: 'always' }], onHit: null }],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const acolyteAbilities = abilityLines([14, 2, 2], [10, 0, 0], [12, 1, 1], [10, 0, 0], [14, 2, 2], [11, 0, 0]);
export const PRIEST_ACOLYTE = monsterStatblock({
  id: 'statblock:priest-acolyte', name: 'Priest Acolyte', armorClass: 13, hitPointMaximum: 11, speedFeet: 30, initiativeBonus: 0,
  savingThrowBonuses: { strength: 2, dexterity: 0, constitution: 1, intelligence: 0, wisdom: 2, charisma: 0 }, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 20706, lineEnd: 20740 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: 'Cleric', alignment: 'Neutral' }, { rating: '1/4', experiencePoints: 50, proficiencyBonus: 2 }, { count: 2, sides: 8, modifier: 2 }, 30, acolyteAbilities),
    skills: present([{ name: 'Medicine', bonus: 4 }, { name: 'Religion', bonus: 2 }]), gear: present(['Chain Shirt', 'Holy Symbol', 'Mace']), senses: present([]), passivePerception: 12,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [melee('mace', 'Mace', 4, 5, 1, 6, 2, 'Bludgeoning'), ranged('radiant-flame', 'Radiant Flame', 4, 7, 2, 6, 0, 'Radiant', 60, notListed('a long range for Radiant Flame')), { kind: 'spellcasting', id: 'spellcasting', actionEconomy: 'action', ability: 'wisdom', saveDc: notListed('a spell save DC for the Priest Acolyte'), spellAttackBonus: notListed('a spell attack bonus for the Priest Acolyte'), spells: [{ id: 'light', availability: 'at_will', manifestStatus: 'implemented' }, { id: 'thaumaturgy', availability: 'at_will', manifestStatus: 'implemented' }] }],
    bonusActions: present([{ kind: 'spellcasting', id: 'divine-aid', actionEconomy: 'bonus_action', ability: 'wisdom', saveDc: notListed('a Divine Aid save DC'), spellAttackBonus: notListed('a Divine Aid spell attack bonus'), spells: [{ id: 'bless', availability: '1_per_day', manifestStatus: 'implemented' }, { id: 'healing-word', availability: '1_per_day', manifestStatus: 'implemented' }, { id: 'sanctuary', availability: '1_per_day', manifestStatus: 'implemented' }] }]), reactions: notListed('reactions'),
  },
});

const priestAbilities = abilityLines([16, 3, 3], [10, 0, 0], [12, 1, 1], [13, 1, 1], [16, 3, 3], [13, 1, 1]);
export const PRIEST = monsterStatblock({
  id: 'statblock:priest', name: 'Priest', armorClass: 13, hitPointMaximum: 38, speedFeet: 30, initiativeBonus: 0,
  savingThrowBonuses: { strength: 3, dexterity: 0, constitution: 1, intelligence: 1, wisdom: 3, charisma: 1 }, attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 20704, lineEnd: 20716 }, { path: SRD_PATH, lineStart: 20742, lineEnd: 20766 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: 'Cleric', alignment: 'Neutral' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 7, sides: 8, modifier: 7 }, 30, priestAbilities),
    skills: present([{ name: 'Medicine', bonus: 7 }, { name: 'Perception', bonus: 5 }, { name: 'Religion', bonus: 5 }]), gear: present(['Chain Shirt', 'Holy Symbol', 'Mace']), senses: present([]), passivePerception: 15,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, attackIds: ['mace', 'radiant-flame'], combination: 'any' }, { ...melee('mace', 'Mace', 5, 6, 1, 6, 3, 'Bludgeoning'), damage: [{ average: 6, dice: { count: 1, sides: 6, modifier: 3 }, type: 'Bludgeoning', trigger: 'always' }, { average: 5, dice: { count: 2, sides: 4, modifier: 0 }, type: 'Radiant', trigger: 'always' }] }, ranged('radiant-flame', 'Radiant Flame', 5, 11, 2, 10, 0, 'Radiant', 60, notListed('a long range for Radiant Flame')), { kind: 'spellcasting', id: 'spellcasting', actionEconomy: 'action', ability: 'wisdom', saveDc: present(13), spellAttackBonus: notListed('a spell attack bonus for the Priest'), spells: [{ id: 'light', availability: 'at_will', manifestStatus: 'implemented' }, { id: 'thaumaturgy', availability: 'at_will', manifestStatus: 'implemented' }, { id: 'spirit-guardians', availability: '1_per_day', manifestStatus: 'implemented' }] }],
    bonusActions: present([{ kind: 'spellcasting', id: 'divine-aid', actionEconomy: 'bonus_action', ability: 'wisdom', saveDc: present(13), spellAttackBonus: notListed('a Divine Aid spell attack bonus'), spells: [{ id: 'bless', availability: '3_per_day', manifestStatus: 'implemented' }, { id: 'dispel-magic', availability: '3_per_day', manifestStatus: 'implemented' }, { id: 'healing-word', availability: '3_per_day', manifestStatus: 'implemented' }, { id: 'lesser-restoration', availability: '3_per_day', manifestStatus: 'implemented' }] }]), reactions: notListed('reactions'),
  },
});

const skeletonAbilities = abilityLines([10, 0, 0], [16, 3, 3], [15, 2, 2], [6, -2, -2], [8, -1, -1], [5, -3, -3]);
export const SKELETON = monsterStatblock({
  id: 'statblock:skeleton', name: 'Skeleton', armorClass: 14, hitPointMaximum: 13, speedFeet: 30, initiativeBonus: 3,
  savingThrowBonuses: { strength: 0, dexterity: 3, constitution: 2, intelligence: -2, wisdom: -1, charisma: -3 }, damageResponses: [{ type: 'Bludgeoning', response: 'vulnerable' }, { type: 'Poison', response: 'immune' }], conditionImmunities: ['Exhaustion', 'Poisoned'], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 21374, lineEnd: 21400 }], { sizes: ['Medium'], type: 'Undead', subtype: null, alignment: 'Lawful Evil' }, { rating: '1/4', experiencePoints: 50, proficiencyBonus: 2 }, { count: 2, sides: 8, modifier: 4 }, 30, skeletonAbilities),
    skills: notListed('skills'), gear: present(['Shortbow', 'Shortsword']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 9,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: false }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: false }]), damageResponses: present([{ type: 'Bludgeoning', response: 'vulnerable' }, { type: 'Poison', response: 'immune' }]), conditionImmunities: present(['Exhaustion', 'Poisoned']), traits: notListed('traits'),
    actions: [melee('shortsword', 'Shortsword', 5, 6, 1, 6, 3, 'Piercing'), ranged('shortbow', 'Shortbow', 5, 6, 1, 6, 3, 'Piercing', 80, present(320))], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const zombieAbilities = abilityLines([13, 1, 1], [6, -2, -2], [16, 3, 3], [3, -4, -4], [6, -2, 0], [5, -3, -3]);
export const ZOMBIE = monsterStatblock({
  id: 'statblock:zombie', name: 'Zombie', armorClass: 8, hitPointMaximum: 15, speedFeet: 20, initiativeBonus: -2,
  savingThrowBonuses: { strength: 1, dexterity: -2, constitution: 3, intelligence: -4, wisdom: 0, charisma: -3 }, damageResponses: [{ type: 'Poison', response: 'immune' }], conditionImmunities: ['Exhaustion', 'Poisoned'], usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 22603, lineEnd: 22635 }], { sizes: ['Medium'], type: 'Undead', subtype: null, alignment: 'Neutral Evil' }, { rating: '1/4', experiencePoints: 50, proficiencyBonus: 2 }, { count: 2, sides: 8, modifier: 6 }, 20, zombieAbilities),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 8,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: false }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: false }]), damageResponses: present([{ type: 'Poison', response: 'immune' }]), conditionImmunities: present(['Exhaustion', 'Poisoned']),
    traits: present([{ kind: 'undead_fortitude', saveAbility: 'constitution', dcBase: 5, addDamageTaken: true, excludedDamageType: 'Radiant', excludedCriticalHits: true, successHitPoints: 1 }]), actions: [melee('slam', 'Slam', 3, 5, 1, 8, 1, 'Bludgeoning')], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const wolfAbilities = abilityLines([14, 2, 2], [15, 2, 2], [12, 1, 1], [3, -4, -4], [12, 1, 1], [6, -2, -2]);
export const WOLF = monsterStatblock({
  id: 'statblock:wolf', name: 'Wolf', armorClass: 12, hitPointMaximum: 11, speedFeet: 40, initiativeBonus: 2,
  savingThrowBonuses: { strength: 2, dexterity: 2, constitution: 1, intelligence: -4, wisdom: 1, charisma: -2 }, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 24033, lineEnd: 24059 }], { sizes: ['Medium'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: '1/4', experiencePoints: 50, proficiencyBonus: 2 }, { count: 2, sides: 8, modifier: 2 }, 40, wolfAbilities),
    skills: present([{ name: 'Perception', bonus: 5 }, { name: 'Stealth', bonus: 4 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 15,
    languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: present([{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }]),
    actions: [{ ...melee('bite', 'Bite', 4, 5, 1, 6, 2, 'Piercing'), onHit: { kind: 'condition', condition: 'Prone', maximumTargetSize: 'Medium', savingThrow: null } }], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});
