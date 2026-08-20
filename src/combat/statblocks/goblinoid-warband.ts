import { monsterStatblock } from '../statblock';
import {
  SRD_PATH,
  abilityLines,
  baseDetails,
  conditionOnHit,
  damage,
  melee,
  meleeOrRanged,
  notListed,
  present,
  ranged,
  savingThrowBonuses,
} from './monster-helpers';

const goblinMinionAbilities = abilityLines([8, -1, -1], [15, 2, 2], [10, 0, 0], [10, 0, 0], [8, -1, -1], [8, -1, -1]);
export const GOBLIN_MINION = monsterStatblock({
  id: 'statblock:goblin-minion', name: 'Goblin Minion', armorClass: 12, hitPointMaximum: 7, speedFeet: 30, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(goblinMinionAbilities), usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 18957, lineEnd: 18983 }], { sizes: ['Small'], type: 'Fey', subtype: 'Goblinoid', alignment: 'Chaotic Neutral' }, { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, { count: 2, sides: 6, modifier: 0 }, 30, goblinMinionAbilities),
    skills: present([{ name: 'Stealth', bonus: 6 }]), gear: present(['Daggers (3)']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 9,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Goblin', canSpeak: true }]),
    damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [meleeOrRanged('dagger', 'Dagger', 4, [damage(4, 1, 4, 2, 'Piercing')], 5, 20, 60)],
    bonusActions: present([{ kind: 'nimble_escape', actions: ['Disengage', 'Hide'] }]), reactions: notListed('reactions'),
  },
});

const goblinBossAbilities = abilityLines([10, 0, 0], [15, 2, 2], [10, 0, 0], [10, 0, 0], [8, -1, -1], [10, 0, 0]);
export const GOBLIN_BOSS = monsterStatblock({
  id: 'statblock:goblin-boss', name: 'Goblin Boss', armorClass: 17, hitPointMaximum: 21, speedFeet: 30, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(goblinBossAbilities), attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 18957, lineEnd: 18996 }], { sizes: ['Small'], type: 'Fey', subtype: 'Goblinoid', alignment: 'Chaotic Neutral' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 6, sides: 6, modifier: 0 }, 30, goblinBossAbilities),
    skills: present([{ name: 'Stealth', bonus: 6 }]), gear: present(['Chain Shirt', 'Scimitar', 'Shield', 'Shortbow']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 9,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Goblin', canSpeak: true }]),
    damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['scimitar', 'shortbow'], combination: 'any' },
      melee('scimitar', 'Scimitar', 4, [damage(5, 1, 6, 2, 'Slashing'), damage(2, 1, 4, 0, 'Slashing', { kind: 'attack_roll_advantage' })]),
      ranged('shortbow', 'Shortbow', 4, [damage(5, 1, 6, 2, 'Piercing'), damage(2, 1, 4, 0, 'Piercing', { kind: 'attack_roll_advantage' })], 80, present(320)),
    ],
    bonusActions: present([{ kind: 'nimble_escape', actions: ['Disengage', 'Hide'] }]),
    reactions: present([{ kind: 'redirect_attack', trigger: 'targeted_by_visible_attack_roll', allyDistanceFeet: 5, maximumAllySize: 'Medium', swapsPlaces: true, allyBecomesTarget: true }]),
  },
});

const bugbearWarriorAbilities = abilityLines([15, 2, 2], [14, 2, 2], [13, 1, 1], [8, -1, -1], [11, 0, 0], [9, -1, -1]);
export const BUGBEAR_WARRIOR = monsterStatblock({
  id: 'statblock:bugbear-warrior', name: 'Bugbear Warrior', armorClass: 14, hitPointMaximum: 33, speedFeet: 30, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(bugbearWarriorAbilities), reachFeet: 10, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 17728, lineEnd: 17761 }], { sizes: ['Medium'], type: 'Fey', subtype: 'Goblinoid', alignment: 'Chaotic Evil' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 6, sides: 8, modifier: 6 }, 30, bugbearWarriorAbilities),
    skills: present([{ name: 'Stealth', bonus: 6 }, { name: 'Survival', bonus: 2 }]), gear: present(['Hide Armor', 'Light Hammers (3)']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Goblin', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'abduct', extraMovementCostWhileGrappling: false }]),
    actions: [
      melee('grab', 'Grab', 4, [damage(9, 2, 6, 2, 'Bludgeoning')], [conditionOnHit('Grappled', 'Medium', { escapeDc: 12, duration: 'until_escape' })], 10),
      { ...meleeOrRanged('light-hammer', 'Light Hammer', 4, [damage(9, 3, 4, 2, 'Bludgeoning')], 10, 20, 60), attackRollAdvantage: { kind: 'target_grappled_by_attacker' } },
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const bugbearStalkerAbilities = abilityLines([17, 3, 3], [14, 2, 2], [14, 2, 4], [11, 0, 0], [12, 1, 3], [11, 0, 0]);
export const BUGBEAR_STALKER = monsterStatblock({
  id: 'statblock:bugbear-stalker', name: 'Bugbear Stalker', armorClass: 15, hitPointMaximum: 65, speedFeet: 30, initiativeBonus: 2,
  savingThrowBonuses: savingThrowBonuses(bugbearStalkerAbilities), attacksPerAction: 2, reachFeet: 10, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 17677, lineEnd: 17720 }], { sizes: ['Medium'], type: 'Fey', subtype: 'Goblinoid', alignment: 'Chaotic Evil' }, { rating: 3, experiencePoints: 700, proficiencyBonus: 2 }, { count: 10, sides: 8, modifier: 20 }, 30, bugbearStalkerAbilities),
    skills: present([{ name: 'Stealth', bonus: 6 }, { name: 'Survival', bonus: 3 }]), gear: present(['Chain Shirt', 'Javelins (6)', 'Morningstar']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 11,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Goblin', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'abduct', extraMovementCostWhileGrappling: false }]),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['javelin', 'morningstar'], combination: 'any' },
      meleeOrRanged('javelin', 'Javelin', 5, [damage(13, 3, 6, 3, 'Piercing')], 10, 30, 120),
      melee('morningstar', 'Morningstar', 5, [damage(12, 2, 8, 3, 'Piercing')], [], 10, { kind: 'target_grappled_by_attacker' }),
    ],
    bonusActions: present([{ kind: 'saving_throw', id: 'quick-grapple', name: 'Quick Grapple', savingThrow: { ability: 'dexterity', dc: 13 }, target: { rangeFeet: 10, maximumSize: 'Medium', excludedKinds: [] }, failure: { damage: [], effects: [conditionOnHit('Grappled', 'Medium', { escapeDc: 13, duration: 'until_escape' })] }, success: { kind: 'none' } }]),
    reactions: notListed('reactions'),
  },
});

const hobgoblinCaptainAbilities = abilityLines([15, 2, 2], [14, 2, 2], [14, 2, 2], [12, 1, 1], [10, 0, 0], [13, 1, 1]);
export const HOBGOBLIN_CAPTAIN = monsterStatblock({
  id: 'statblock:hobgoblin-captain', name: 'Hobgoblin Captain', armorClass: 17, hitPointMaximum: 58, speedFeet: 30, initiativeBonus: 4,
  savingThrowBonuses: savingThrowBonuses(hobgoblinCaptainAbilities), attacksPerAction: 2, usesDeathSaves: false,
  sourceDetails: {
    ...baseDetails([{ path: SRD_PATH, lineStart: 19576, lineEnd: 19611 }], { sizes: ['Medium'], type: 'Fey', subtype: 'Goblinoid', alignment: 'Lawful Evil' }, { rating: 3, experiencePoints: 700, proficiencyBonus: 2 }, { count: 9, sides: 8, modifier: 18 }, 30, hobgoblinCaptainAbilities),
    skills: notListed('skills'), gear: present(['Greatsword', 'Half Plate Armor', 'Longbow']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'named', name: 'Goblin', canSpeak: true }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'aura_of_authority', emanationFeet: 10, grantsAdvantageOn: ['attack_rolls', 'saving_throws'], blockedByCondition: 'Incapacitated' }]),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['greatsword', 'longbow'], combination: 'any' },
      melee('greatsword', 'Greatsword', 4, [damage(9, 2, 6, 2, 'Slashing'), damage(3, 1, 6, 0, 'Poison')]),
      ranged('longbow', 'Longbow', 4, [damage(6, 1, 8, 2, 'Piercing'), damage(5, 2, 4, 0, 'Poison')], 150, present(600)),
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});
