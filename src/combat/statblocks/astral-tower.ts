import {
  monsterStatblock,
  type DecodedField,
  type MonsterAction,
  type MonsterProvenance,
  type MonsterStatblock,
  type MonsterTypedUnavailableMechanic,
  type SourceSpan,
} from '../statblock';
import {
  SRD_PATH,
  abilityLines,
  attack,
  baseDetails,
  conditionOnHit,
  damage,
  melee,
  notListed,
  present,
  savingThrowBonuses,
} from './monster-helpers';

const unsupported = <T>(note: string): DecodedField<T> => ({ kind: 'absent', note });
const typedUnavailable = (source: SourceSpan, note: string): MonsterTypedUnavailableMechanic => ({
  source,
  execution: { kind: 'absent', note },
});
const actionUnavailable = (note: string) => ({ execution: { kind: 'absent' as const, note } });

type OriginalHomebrewProvenance = Extract<MonsterProvenance, { readonly kind: 'original_homebrew' }>;

export interface UnsupportedStatblockEntry {
  readonly monsterId: string;
  readonly category: 'challenge' | 'trait' | 'action' | 'bonus_action' | 'reaction';
  readonly name: string;
  readonly represented: string;
  readonly unsupported: string;
  readonly source: SourceSpan;
}

const AIR_ELEMENTAL_SOURCE = { path: SRD_PATH, lineStart: 16783, lineEnd: 16826 } as const;
const ANIMATED_ARMOR_SOURCE = { path: SRD_PATH, lineStart: 16830, lineEnd: 16856 } as const;
const BLACK_PUDDING_SOURCE = { path: SRD_PATH, lineStart: 17239, lineEnd: 17309 } as const;
const DOPPELGANGER_SOURCE = { path: SRD_PATH, lineStart: 18289, lineEnd: 18340 } as const;
const EARTH_ELEMENTAL_SOURCE = { path: SRD_PATH, lineStart: 18441, lineEnd: 18483 } as const;
const GARGOYLE_SOURCE = { path: SRD_PATH, lineStart: 18708, lineEnd: 18736 } as const;
const GHOST_SOURCE = { path: SRD_PATH, lineStart: 18786, lineEnd: 18858 } as const;
const MIMIC_SOURCE = { path: SRD_PATH, lineStart: 20204, lineEnd: 20253 } as const;
const ROC_SOURCE = { path: SRD_PATH, lineStart: 20997, lineEnd: 21027 } as const;
const STIRGE_SOURCE = { path: SRD_PATH, lineStart: 21654, lineEnd: 21693 } as const;
const WILL_O_WISP_SOURCE = { path: SRD_PATH, lineStart: 22494, lineEnd: 22544 } as const;
const GIANT_RAT_SOURCE = { path: SRD_PATH, lineStart: 23254, lineEnd: 23285 } as const;
const ANIMATED_FLYING_SWORD_SOURCE = { path: SRD_PATH, lineStart: 16858, lineEnd: 16875 } as const;

const srdProvenance = (source: SourceSpan): Extract<MonsterProvenance, { readonly kind: 'srd_5_2_1_decoded' }> => ({
  kind: 'srd_5_2_1_decoded',
  source: [source],
});

const airAbilities = abilityLines([14, 2, 2], [20, 5, 5], [14, 2, 2], [6, -2, -2], [10, 0, 0], [6, -2, -2]);
export const AIR_ELEMENTAL = monsterStatblock({
  id: 'statblock:air-elemental', name: 'Air Elemental', armorClass: 15, hitPointMaximum: 90, speedFeet: 10,
  initiativeBonus: 5, savingThrowBonuses: savingThrowBonuses(airAbilities), attacksPerAction: 2,
  damageResponses: [
    { type: 'Bludgeoning', response: 'resistant' }, { type: 'Lightning', response: 'resistant' },
    { type: 'Piercing', response: 'resistant' }, { type: 'Slashing', response: 'resistant' },
    { type: 'Poison', response: 'immune' }, { type: 'Thunder', response: 'immune' },
  ],
  conditionImmunities: ['Exhaustion', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Unconscious'],
  usesDeathSaves: false, provenance: srdProvenance(AIR_ELEMENTAL_SOURCE),
  sourceDetails: {
    ...baseDetails([AIR_ELEMENTAL_SOURCE], { sizes: ['Large'], type: 'Elemental', subtype: null, alignment: 'Neutral' }, { rating: 5, experiencePoints: 1_800, proficiencyBonus: 3 }, { count: 12, sides: 10, modifier: 24 }, 10, airAbilities, [{ kind: 'fly', feet: 90, hover: true }]),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Primordial (Auran)', canSpeak: true }]),
    damageResponses: present([
      { type: 'Bludgeoning', response: 'resistant' }, { type: 'Lightning', response: 'resistant' }, { type: 'Piercing', response: 'resistant' }, { type: 'Slashing', response: 'resistant' },
      { type: 'Poison', response: 'immune' }, { type: 'Thunder', response: 'immune' },
    ]),
    conditionImmunities: present(['Exhaustion', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Unconscious']),
    traits: present([{
      kind: 'air_form', canEnterCreatureSpace: true, canStopInCreatureSpace: true,
      narrowestPassageInches: 1, extraMovementCost: false,
      ...typedUnavailable(AIR_ELEMENTAL_SOURCE, 'Air Form movement awaits occupied-space and narrow-passage reducer support.'),
    }]),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['thunderous-slam'], combination: 'any' },
      melee('thunderous-slam', 'Thunderous Slam', 8, [damage(14, 2, 8, 5, 'Thunder')], [], 10),
      {
        kind: 'saving_throw', id: 'whirlwind', name: 'Whirlwind', savingThrow: { ability: 'strength', dc: 13 },
        target: { rangeFeet: 5, maximumSize: 'Medium', excludedKinds: [] },
        failure: { damage: [damage(24, 4, 10, 2, 'Thunder')], effects: [conditionOnHit('Prone', 'Medium')] },
        success: { kind: 'half_damage' },
        mechanics: [{
          kind: 'whirlwind', recharge: { dieSides: 6, minimumRoll: 4 }, targetLocation: 'in_monster_space',
          failurePush: { maximumFeet: 20, direction: 'straight_away_from_monster' },
          ...typedUnavailable(AIR_ELEMENTAL_SOURCE, 'Whirlwind awaits recharge and forced-movement reducer support.'),
        }],
        ...actionUnavailable('Whirlwind is withheld until its recharge and forced movement execute together.'),
      },
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const animatedArmorAbilities = abilityLines([14, 2, 2], [11, 0, 0], [13, 1, 1], [1, -5, -5], [3, -4, -4], [1, -5, -5]);
export const ANIMATED_ARMOR = monsterStatblock({
  id: 'statblock:animated-armor', name: 'Animated Armor', armorClass: 18, hitPointMaximum: 33, speedFeet: 25,
  initiativeBonus: 2, savingThrowBonuses: savingThrowBonuses(animatedArmorAbilities), attacksPerAction: 2,
  damageResponses: [{ type: 'Poison', response: 'immune' }, { type: 'Psychic', response: 'immune' }],
  conditionImmunities: ['Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Paralyzed', 'Petrified', 'Poisoned'],
  usesDeathSaves: false, provenance: srdProvenance(ANIMATED_ARMOR_SOURCE),
  sourceDetails: {
    ...baseDetails([ANIMATED_ARMOR_SOURCE], { sizes: ['Medium'], type: 'Construct', subtype: null, alignment: 'Unaligned' }, { rating: 1, experiencePoints: 200, proficiencyBonus: 2 }, { count: 6, sides: 8, modifier: 6 }, 25, animatedArmorAbilities),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'blindsight', rangeFeet: 60 }]), passivePerception: 6,
    languages: present([]), damageResponses: present([{ type: 'Poison', response: 'immune' }, { type: 'Psychic', response: 'immune' }]),
    conditionImmunities: present(['Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Paralyzed', 'Petrified', 'Poisoned']), traits: notListed('traits'),
    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['slam'], combination: 'any' }, melee('slam', 'Slam', 4, [damage(5, 1, 6, 2, 'Bludgeoning')])],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const blackPuddingAbilities = abilityLines([16, 3, 3], [5, -3, -3], [16, 3, 3], [1, -5, -5], [6, -2, -2], [1, -5, -5]);
export const BLACK_PUDDING = monsterStatblock({
  id: 'statblock:black-pudding', name: 'Black Pudding', armorClass: 7, hitPointMaximum: 68, speedFeet: 20,
  initiativeBonus: -3, savingThrowBonuses: savingThrowBonuses(blackPuddingAbilities),
  damageResponses: [
    { type: 'Acid', response: 'immune' }, { type: 'Cold', response: 'immune' },
    { type: 'Lightning', response: 'immune' }, { type: 'Slashing', response: 'immune' },
  ],
  conditionImmunities: ['Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Prone', 'Restrained'],
  usesDeathSaves: false, provenance: srdProvenance(BLACK_PUDDING_SOURCE),
  sourceDetails: {
    ...baseDetails([BLACK_PUDDING_SOURCE], { sizes: ['Large'], type: 'Ooze', subtype: null, alignment: 'Unaligned' }, { rating: 4, experiencePoints: 1_100, proficiencyBonus: 2 }, { count: 8, sides: 10, modifier: 24 }, 20, blackPuddingAbilities, [{ kind: 'climb', feet: 20, hover: false }]),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'blindsight', rangeFeet: 60 }]), passivePerception: 8,
    languages: present([]), damageResponses: present([
      { type: 'Acid', response: 'immune' }, { type: 'Cold', response: 'immune' }, { type: 'Lightning', response: 'immune' }, { type: 'Slashing', response: 'immune' },
    ]), conditionImmunities: present(['Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Prone', 'Restrained']),
    traits: present([{
      kind: 'amorphous', narrowestPassageInches: 1, extraMovementCost: false,
      ...typedUnavailable(BLACK_PUDDING_SOURCE, 'Amorphous awaits narrow-passage movement support.'),
    }, {
      kind: 'corrosive_form', meleeAttackerDamage: damage(4, 1, 8, 0, 'Acid'),
      ammunition: { material: 'nonmagical', destroyed: 'immediately_after_hit_that_deals_damage' },
      weapon: {
        material: 'nonmagical', trigger: 'after_dealing_damage_with_contact', cumulativeAttackPenalty: -1,
        destroyedAtPenalty: -5, repair: { spell: 'mending', removesAllPenalty: true },
      },
      consumption: { durationMinutes: 1, depthFeet: 2, materials: ['nonmagical_wood', 'nonmagical_metal'] },
      ...typedUnavailable(BLACK_PUDDING_SOURCE, 'Corrosive Form awaits contact damage, equipment durability, and material-consumption support.'),
    }, { kind: 'spider_climb' }]),
    actions: [{
      ...melee('dissolving-pseudopod', 'Dissolving Pseudopod', 5, [damage(17, 4, 6, 3, 'Acid')], [], 10),
      mechanics: [{
        kind: 'equipment_corrosion', equipment: 'nonmagical_armor', trigger: 'after_target_takes_damage',
        cumulativeArmorClassPenalty: -1, destroyedAtArmorClass: 10,
        repair: { spell: 'mending', removesAllPenalty: true },
        ...typedUnavailable(BLACK_PUDDING_SOURCE, 'Dissolving Pseudopod awaits equipment durability and Mending support.'),
      }],
      ...actionUnavailable('Dissolving Pseudopod is withheld until its armor corrosion executes with its damage.'),
    }],
    bonusActions: notListed('bonus actions'),
    reactions: present([{
      kind: 'split', requirements: { sizes: ['Large', 'Medium'], minimumHitPoints: 10 },
      triggers: [{ kind: 'becomes_bloodied' }, { kind: 'takes_damage', types: ['Lightning', 'Slashing'] }],
      replacement: {
        count: 2, statblock: 'same_as_original', size: 'one_smaller_than_original',
        initiative: 'original_initiative', hitPoints: { kind: 'divide_original_evenly', rounding: 'down' },
      },
      ...typedUnavailable(BLACK_PUDDING_SOURCE, 'Split awaits reaction triggers, replacement-creature creation, and Hit Point division support.'),
    }]),
  },
});

const doppelgangerAbilities = abilityLines([11, 0, 0], [18, 4, 4], [14, 2, 2], [11, 0, 0], [12, 1, 1], [14, 2, 2]);
export const DOPPELGANGER = monsterStatblock({
  id: 'statblock:doppelganger', name: 'Doppelganger', armorClass: 14, hitPointMaximum: 52, speedFeet: 30,
  initiativeBonus: 4, savingThrowBonuses: savingThrowBonuses(doppelgangerAbilities), attacksPerAction: 2,
  conditionImmunities: ['Charmed'], usesDeathSaves: false, provenance: srdProvenance(DOPPELGANGER_SOURCE),
  sourceDetails: {
    ...baseDetails([DOPPELGANGER_SOURCE], { sizes: ['Medium'], type: 'Monstrosity', subtype: null, alignment: 'Neutral' }, { rating: 3, experiencePoints: 700, proficiencyBonus: 2 }, { count: 8, sides: 8, modifier: 16 }, 30, doppelgangerAbilities),
    skills: present([{ name: 'Deception', bonus: 6 }, { name: 'Insight', bonus: 3 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 11,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'choice', count: 3, qualifier: 'other languages', canSpeak: true }]),
    damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: present(['Charmed']), traits: notListed('traits'),
    actions: [
      {
        kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['slam'], combination: 'any',
        mechanics: [{
          kind: 'also_uses_action_if_available', actionId: 'unsettling-visage',
          ...typedUnavailable(DOPPELGANGER_SOURCE, 'Multiattack awaits coupled non-attack action use.'),
        }],
        ...actionUnavailable('Multiattack is withheld until Unsettling Visage coupling is supported.'),
      },
      {
        ...melee('slam', 'Slam', 6, [damage(11, 2, 6, 4, 'Bludgeoning')]),
        mechanics: [{
          kind: 'attack_roll_advantage_window', window: 'first_round_of_each_combat',
          ...typedUnavailable(DOPPELGANGER_SOURCE, 'Slam awaits first-round combat-window advantage support.'),
        }],
        ...actionUnavailable('Slam is withheld until its first-round advantage is included.'),
      },
      { kind: 'spellcasting', id: 'read-thoughts', actionEconomy: 'action', ability: 'charisma', saveDc: present(12), spellAttackBonus: notListed('a spell attack bonus for Read Thoughts'), spells: [{ id: 'detect-thoughts', availability: 'at_will', manifestStatus: 'implemented' }] },
      {
        kind: 'saving_throw', id: 'unsettling-visage', name: 'Unsettling Visage', savingThrow: { ability: 'wisdom', dc: 12 },
        target: { rangeFeet: 15, maximumSize: null, excludedKinds: [] },
        failure: { damage: [], effects: [conditionOnHit('Frightened', null)] }, success: { kind: 'none' },
        mechanics: [{
          kind: 'unsettling_visage', recharge: { dieSides: 6, minimumRoll: 6 },
          targetArea: { kind: 'emanation', feet: 15, requiresSightOfMonster: true },
          repeatSave: { timing: 'end_of_each_target_turn', endsOnSuccess: true }, automaticSuccessAfterMinutes: 1,
          ...typedUnavailable(DOPPELGANGER_SOURCE, 'Unsettling Visage awaits recharge, area targeting, and repeated-save support.'),
        }],
        ...actionUnavailable('Unsettling Visage is withheld until its complete save lifecycle is supported.'),
      },
    ],
    bonusActions: present([{
      kind: 'shape_shift_retained_statistics',
      form: { kind: 'humanoid', sizes: ['Medium', 'Small'], retainedStatistics: 'all_except_size' },
      canReturnToTrueForm: true, equipmentTransforms: false,
      ...typedUnavailable(DOPPELGANGER_SOURCE, 'Shape-Shift awaits retained-statistics form-state support.'),
    }]),
    reactions: notListed('reactions'),
  },
});

const earthAbilities = abilityLines([20, 5, 5], [8, -1, -1], [20, 5, 5], [5, -3, -3], [10, 0, 0], [5, -3, -3]);
export const EARTH_ELEMENTAL = monsterStatblock({
  id: 'statblock:earth-elemental', name: 'Earth Elemental', armorClass: 17, hitPointMaximum: 147, speedFeet: 30,
  initiativeBonus: -1, savingThrowBonuses: savingThrowBonuses(earthAbilities), attacksPerAction: 2,
  damageResponses: [{ type: 'Thunder', response: 'vulnerable' }, { type: 'Poison', response: 'immune' }],
  conditionImmunities: ['Exhaustion', 'Paralyzed', 'Petrified', 'Poisoned', 'Unconscious'], usesDeathSaves: false,
  provenance: srdProvenance(EARTH_ELEMENTAL_SOURCE),
  sourceDetails: {
    ...baseDetails([EARTH_ELEMENTAL_SOURCE], { sizes: ['Large'], type: 'Elemental', subtype: null, alignment: 'Neutral' }, { rating: 5, experiencePoints: 1_800, proficiencyBonus: 3 }, { count: 14, sides: 10, modifier: 70 }, 30, earthAbilities, [{ kind: 'burrow', feet: 30, hover: false }]),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }, { kind: 'tremorsense', rangeFeet: 60 }]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Primordial (Terran)', canSpeak: true }]), damageResponses: present([{ type: 'Thunder', response: 'vulnerable' }, { type: 'Poison', response: 'immune' }]),
    conditionImmunities: present(['Exhaustion', 'Paralyzed', 'Petrified', 'Poisoned', 'Unconscious']),
    traits: present([{
      kind: 'earth_glide', material: ['nonmagical_unworked_earth', 'nonmagical_unworked_stone'], disturbsMaterial: false,
      ...typedUnavailable(EARTH_ELEMENTAL_SOURCE, 'Earth Glide awaits material-aware burrowing support.'),
    }, {
      kind: 'siege_monster', targetKinds: ['objects', 'structures'], damageMultiplier: 2,
      ...typedUnavailable(EARTH_ELEMENTAL_SOURCE, 'Siege Monster awaits object and structure damage multiplier support.'),
    }]),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['slam', 'rock-launch'], combination: 'any' },
      melee('slam', 'Slam', 8, [damage(14, 2, 8, 5, 'Bludgeoning')], [], 10),
      attack('rock-launch', 'Rock Launch', 8, { kind: 'ranged', rangeFeet: 60, longRangeFeet: notListed('a long range for Rock Launch') }, [damage(8, 1, 6, 5, 'Bludgeoning')], [conditionOnHit('Prone', 'Large')]),
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const gargoyleAbilities = abilityLines([15, 2, 2], [11, 0, 0], [16, 3, 3], [6, -2, -2], [11, 0, 0], [7, -2, -2]);
export const GARGOYLE = monsterStatblock({
  id: 'statblock:gargoyle', name: 'Gargoyle', armorClass: 15, hitPointMaximum: 67, speedFeet: 30,
  initiativeBonus: 2, savingThrowBonuses: savingThrowBonuses(gargoyleAbilities), attacksPerAction: 2,
  damageResponses: [{ type: 'Poison', response: 'immune' }], conditionImmunities: ['Exhaustion', 'Petrified', 'Poisoned'],
  usesDeathSaves: false, provenance: srdProvenance(GARGOYLE_SOURCE),
  sourceDetails: {
    ...baseDetails([GARGOYLE_SOURCE], { sizes: ['Medium'], type: 'Elemental', subtype: null, alignment: 'Chaotic Evil' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 9, sides: 8, modifier: 27 }, 30, gargoyleAbilities, [{ kind: 'fly', feet: 60, hover: false }]),
    skills: present([{ name: 'Stealth', bonus: 4 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10,
    languages: present([{ kind: 'named', name: 'Primordial (Terran)', canSpeak: true }]), damageResponses: present([{ type: 'Poison', response: 'immune' }]),
    conditionImmunities: present(['Exhaustion', 'Petrified', 'Poisoned']), traits: present([{ kind: 'flyby' }]),
    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['claw'], combination: 'any' }, melee('claw', 'Claw', 4, [damage(7, 2, 4, 2, 'Slashing')])],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const ghostAbilities = abilityLines([7, -2, -2], [13, 1, 1], [10, 0, 0], [10, 0, 0], [12, 1, 1], [17, 3, 3]);
export const GHOST = monsterStatblock({
  id: 'statblock:ghost', name: 'Ghost', armorClass: 11, hitPointMaximum: 45, speedFeet: 5,
  initiativeBonus: 1, savingThrowBonuses: savingThrowBonuses(ghostAbilities), attacksPerAction: 2,
  damageResponses: [
    ...(['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning', 'Piercing', 'Slashing', 'Thunder'] as const).map((type) => ({ type, response: 'resistant' as const })),
    { type: 'Necrotic', response: 'immune' }, { type: 'Poison', response: 'immune' },
  ],
  conditionImmunities: ['Charmed', 'Exhaustion', 'Frightened', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained'],
  usesDeathSaves: false, provenance: srdProvenance(GHOST_SOURCE),
  sourceDetails: {
    ...baseDetails([GHOST_SOURCE], { sizes: ['Medium'], type: 'Undead', subtype: null, alignment: 'Neutral' }, { rating: 4, experiencePoints: 1_100, proficiencyBonus: 2 }, { count: 10, sides: 8, modifier: 0 }, 5, ghostAbilities, [{ kind: 'fly', feet: 40, hover: true }]),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 11,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: true }]),
    damageResponses: present([
      ...(['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning', 'Piercing', 'Slashing', 'Thunder'] as const).map((type) => ({ type, response: 'resistant' as const })),
      { type: 'Necrotic', response: 'immune' as const }, { type: 'Poison', response: 'immune' as const },
    ]), conditionImmunities: present(['Charmed', 'Exhaustion', 'Frightened', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained']),
    traits: present([{
      kind: 'ethereal_sight', rangeFeet: 60, seesPlane: 'Ethereal', whileOnPlane: 'Material',
      ...typedUnavailable(GHOST_SOURCE, 'Ethereal Sight awaits plane-aware perception support.'),
    }, { kind: 'incorporeal_movement', difficultTerrain: true, endingInObjectDamage: damage(5, 1, 10, 0, 'Force') }]),
    actions: [
      { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['withering-touch'], combination: 'any' },
      melee('withering-touch', 'Withering Touch', 5, [damage(19, 3, 10, 3, 'Necrotic')]),
      {
        kind: 'spellcasting', id: 'etherealness', actionEconomy: 'action', ability: 'charisma',
        saveDc: notListed('a spell save DC for Etherealness'), spellAttackBonus: notListed('a spell attack bonus for Etherealness'),
        spells: [{ id: 'etherealness', availability: 'at_will', manifestStatus: 'not_in_manifest' }],
        mechanics: [{
          kind: 'ghost_etherealness', crossPlaneVisibility: 'material_and_border_ethereal_mutual',
          crossPlaneInteraction: 'neither_direction',
          ...typedUnavailable(GHOST_SOURCE, 'Ghost Etherealness awaits spell-manifest and plane-interaction support.'),
        }],
        ...actionUnavailable('Etherealness is withheld until plane state and its ghost-specific exceptions are supported.'),
      },
      {
        kind: 'saving_throw', id: 'horrific-visage', name: 'Horrific Visage', savingThrow: { ability: 'wisdom', dc: 13 },
        target: { rangeFeet: 60, maximumSize: null, excludedKinds: ['Undead'] },
        failure: { damage: [damage(10, 2, 6, 3, 'Psychic')], effects: [conditionOnHit('Frightened', null, { duration: 'until_start_of_monster_next_turn' })] },
        success: { kind: 'none' },
        mechanics: [{
          kind: 'horrific_visage', targetArea: { kind: 'cone', feet: 60, requiresSightOfMonster: true },
          successImmunity: { action: 'horrific_visage', sourceMonsterOnly: true, hours: 24 },
          ...typedUnavailable(GHOST_SOURCE, 'Horrific Visage awaits cone targeting and source-specific success immunity support.'),
        }],
        ...actionUnavailable('Horrific Visage is withheld until its cone and success immunity execute together.'),
      },
      {
        kind: 'saving_throw', id: 'possession', name: 'Possession', savingThrow: { ability: 'charisma', dc: 13 },
        target: { rangeFeet: 5, maximumSize: null, excludedKinds: [] },
        failure: { damage: [], effects: [] }, success: { kind: 'none' },
        mechanics: [{
          kind: 'possession', recharge: { dieSides: 6, minimumRoll: 6 }, targetKind: 'Humanoid', requiresVisibleTarget: true,
          failure: {
            ghostDisappears: true, targetCondition: 'Incapacitated', targetLosesBodyControl: true,
            targetRetainsAwareness: true, ghostControlsBody: true,
            ghostTargetability: 'only_effects_specifically_targeting_undead', retainedGhostStatistics: true,
            borrowedTargetStatistics: ['speed', 'strength_modifier', 'dexterity_modifier', 'constitution_modifier'],
          },
          endsWhen: ['body_zero_hit_points', 'ghost_bonus_action'],
          onEnd: { ghostAppearsWithinFeet: 5, space: 'unoccupied', targetImmunityHours: 24 }, successImmunityHours: 24,
          ...typedUnavailable(GHOST_SOURCE, 'Possession awaits body-control, stat borrowing, targetability, and exit-state support.'),
        }],
        ...actionUnavailable('Possession is withheld until its full state transfer and immunity lifecycle is supported.'),
      },
    ],
    bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const giantRatAbilities = abilityLines([7, -2, -2], [16, 3, 5], [11, 0, 0], [2, -4, -4], [10, 0, 0], [4, -3, -3]);
export const GIANT_RAT = monsterStatblock({
  id: 'statblock:giant-rat', name: 'Giant Rat', armorClass: 13, hitPointMaximum: 7, speedFeet: 30,
  initiativeBonus: 3, savingThrowBonuses: savingThrowBonuses(giantRatAbilities), usesDeathSaves: false,
  provenance: srdProvenance(GIANT_RAT_SOURCE),
  sourceDetails: {
    ...baseDetails([GIANT_RAT_SOURCE], { sizes: ['Small'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, { count: 2, sides: 6, modifier: 0 }, 30, giantRatAbilities, [{ kind: 'climb', feet: 30, hover: false }]),
    skills: present([{ name: 'Perception', bonus: 2 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 12,
    languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }]),
    actions: [melee('bite', 'Bite', 5, [damage(5, 1, 4, 3, 'Piercing')])], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const mimicAbilities = abilityLines([17, 3, 3], [12, 1, 1], [15, 2, 2], [5, -3, -3], [13, 1, 1], [8, -1, -1]);
export const MIMIC = monsterStatblock({
  id: 'statblock:mimic', name: 'Mimic', armorClass: 12, hitPointMaximum: 58, speedFeet: 20,
  initiativeBonus: 3, savingThrowBonuses: savingThrowBonuses(mimicAbilities), damageResponses: [{ type: 'Acid', response: 'immune' }],
  conditionImmunities: ['Prone'], usesDeathSaves: false, provenance: srdProvenance(MIMIC_SOURCE),
  sourceDetails: {
    ...baseDetails([MIMIC_SOURCE], { sizes: ['Medium'], type: 'Monstrosity', subtype: null, alignment: 'Neutral' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 9, sides: 8, modifier: 18 }, 20, mimicAbilities),
    skills: present([{ name: 'Stealth', bonus: 5 }]), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 11,
    languages: present([]), damageResponses: present([{ type: 'Acid', response: 'immune' }]), conditionImmunities: present(['Prone']),
    traits: present([{
      kind: 'adhesive', requiredForm: 'object', trigger: 'anything_touches_monster', maximumCreatureSize: 'Huge',
      condition: 'Grappled', escapeDc: 13, escapeChecksHaveDisadvantage: true,
      ...typedUnavailable(MIMIC_SOURCE, 'Adhesive awaits touch-triggered grappling and disadvantaged escape-check support.'),
    }]),
    actions: [
      {
        ...melee('bite', 'Bite', 5, [damage(7, 1, 8, 3, 'Piercing'), damage(4, 1, 8, 0, 'Acid')], [], 5, { kind: 'target_grappled_by_attacker' }),
        mechanics: [{
          kind: 'conditional_damage_replacement', condition: 'target_grappled_by_attacker', replacesDamageType: 'Piercing',
          replacement: damage(12, 2, 8, 3, 'Piercing'),
          ...typedUnavailable(MIMIC_SOURCE, 'Bite awaits grapple-dependent replacement damage support.'),
        }],
        ...actionUnavailable('Bite is withheld until grapple-dependent replacement damage is supported.'),
      },
      {
        ...melee('pseudopod', 'Pseudopod', 5, [damage(7, 1, 8, 3, 'Bludgeoning'), damage(4, 1, 8, 0, 'Acid')], [conditionOnHit('Grappled', 'Large', { escapeDc: 13, duration: 'until_escape' })]),
        mechanics: [{
          kind: 'grapple_escape_disadvantage', appliesToCondition: 'Grappled', appliesToEscapeDc: 13,
          ...typedUnavailable(MIMIC_SOURCE, 'Pseudopod awaits disadvantaged escape-check support.'),
        }],
        ...actionUnavailable('Pseudopod is withheld until its disadvantaged escape checks are supported.'),
      },
    ],
    bonusActions: present([{
      kind: 'shape_shift_retained_statistics',
      form: { kind: 'object', sizes: ['Medium', 'Small'], retainedStatistics: 'all' },
      canReturnToTrueForm: true, equipmentTransforms: false,
      ...typedUnavailable(MIMIC_SOURCE, 'Shape-Shift awaits retained-statistics object-form state support.'),
    }]),
    reactions: notListed('reactions'),
  },
});

const rocAbilities = abilityLines([28, 9, 9], [10, 0, 4], [20, 5, 5], [3, -4, -4], [10, 0, 4], [9, -1, -1]);
const rocActions: readonly MonsterAction[] = [
  { kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['beak', 'talons'], combination: 'one_attack_may_be_replaced' },
  melee('beak', 'Beak', 13, [damage(28, 3, 12, 9, 'Piercing')], [], 10),
  melee('talons', 'Talons', 13, [damage(23, 4, 6, 9, 'Slashing')], [
    conditionOnHit('Grappled', 'Huge', { escapeDc: 19, duration: 'until_escape' }),
    conditionOnHit('Restrained', 'Huge', { duration: 'until_escape' }),
  ]),
];
export const ROC = monsterStatblock({
  id: 'statblock:roc', name: 'Roc', armorClass: 15, hitPointMaximum: 248, speedFeet: 20, initiativeBonus: 8,
  savingThrowBonuses: savingThrowBonuses(rocAbilities), attacksPerAction: 2, usesDeathSaves: false,
  provenance: srdProvenance(ROC_SOURCE),
  sourceDetails: {
    ...baseDetails([ROC_SOURCE], { sizes: ['Gargantuan'], type: 'Monstrosity', subtype: null, alignment: 'Unaligned' }, { rating: 11, experiencePoints: 7_200, proficiencyBonus: 4 }, { count: 16, sides: 20, modifier: 80 }, 20, rocAbilities, [{ kind: 'fly', feet: 120, hover: false }]),
    skills: present([{ name: 'Perception', bonus: 8 }]), gear: notListed('gear'), senses: present([]), passivePerception: 18,
    languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'),
    conditionImmunities: notListed('condition immunities'), traits: notListed('traits'), actions: rocActions,
    bonusActions: present([{
      kind: 'swoop', recharge: { kind: 'recharge_roll', dieSides: 6, minimumRoll: 5 },
      requires: 'creature_grappled_by_monster',
      movement: { kind: 'fly', distance: 'half_speed', provokesOpportunityAttacks: false },
      releases: 'selected_grappled_creature',
      ...typedUnavailable(ROC_SOURCE, 'Swoop awaits recharge, grapple selection, movement, and release support.'),
    }]),
    reactions: notListed('reactions'), legendaryActions: notListed('Legendary Actions'), legendaryResistance: notListed('Legendary Resistance'),
  },
});

const stirgeAbilities = abilityLines([4, -3, -3], [16, 3, 3], [11, 0, 0], [2, -4, -4], [8, -1, -1], [6, -2, -2]);
export const STIRGE = monsterStatblock({
  id: 'statblock:stirge', name: 'Stirge', armorClass: 13, hitPointMaximum: 5, speedFeet: 10,
  initiativeBonus: 3, savingThrowBonuses: savingThrowBonuses(stirgeAbilities), usesDeathSaves: false,
  provenance: srdProvenance(STIRGE_SOURCE),
  sourceDetails: {
    ...baseDetails([STIRGE_SOURCE], { sizes: ['Tiny'], type: 'Monstrosity', subtype: null, alignment: 'Unaligned' }, { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, { count: 2, sides: 4, modifier: 0 }, 10, stirgeAbilities, [{ kind: 'fly', feet: 40, hover: false }]),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 9,
    languages: present([]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: notListed('traits'),
    actions: [{
      ...melee('proboscis', 'Proboscis', 5, [damage(6, 1, 6, 3, 'Piercing')]),
      mechanics: [{
        kind: 'attachment', targetRelation: 'attached_to_target', blocksActionIdWhileAttached: 'proboscis',
        recurringDamage: damage(5, 2, 4, 0, 'Necrotic'), recurringDamageTiming: 'start_of_monster_turn',
        selfDetachMovementFeet: 5, otherDetach: { action: true, rangeFeet: 5, actors: ['target', 'other_creature'] },
        ...typedUnavailable(STIRGE_SOURCE, 'Proboscis attachment awaits relation state, recurring damage, and detach operations.'),
      }],
      ...actionUnavailable('Proboscis is withheld until attachment and detach state are supported.'),
    }], bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
  },
});

const wispAbilities = abilityLines([1, -5, -5], [28, 9, 9], [10, 0, 0], [13, 1, 1], [14, 2, 2], [11, 0, 0]);
export const WILL_O_WISP = monsterStatblock({
  id: 'statblock:will-o-wisp', name: 'Will-o’-Wisp', armorClass: 19, hitPointMaximum: 27, speedFeet: 5,
  initiativeBonus: 9, savingThrowBonuses: savingThrowBonuses(wispAbilities),
  damageResponses: [
    ...(['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Necrotic', 'Piercing', 'Slashing'] as const).map((type) => ({ type, response: 'resistant' as const })),
    { type: 'Lightning', response: 'immune' }, { type: 'Poison', response: 'immune' },
  ], conditionImmunities: ['Exhaustion', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Unconscious'],
  usesDeathSaves: false, provenance: srdProvenance(WILL_O_WISP_SOURCE),
  sourceDetails: {
    ...baseDetails([WILL_O_WISP_SOURCE], { sizes: ['Tiny'], type: 'Undead', subtype: null, alignment: 'Chaotic Evil' }, { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, { count: 11, sides: 4, modifier: 0 }, 5, wispAbilities, [{ kind: 'fly', feet: 50, hover: true }]),
    skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 120 }]), passivePerception: 12,
    languages: present([{ kind: 'named', name: 'Common', canSpeak: true }, { kind: 'choice', count: 1, qualifier: 'other language', canSpeak: true }]),
    damageResponses: present([
      ...(['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Necrotic', 'Piercing', 'Slashing'] as const).map((type) => ({ type, response: 'resistant' as const })),
      { type: 'Lightning', response: 'immune' as const }, { type: 'Poison', response: 'immune' as const },
    ]), conditionImmunities: present(['Exhaustion', 'Grappled', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Unconscious']),
    traits: present([{
      kind: 'ephemeral', canWearEquipment: false, canCarryEquipment: false,
      ...typedUnavailable(WILL_O_WISP_SOURCE, 'Ephemeral awaits equipment-capability enforcement.'),
    }, {
      kind: 'illumination', brightLightFeet: 20, additionalDimLightFeet: 20,
      ...typedUnavailable(WILL_O_WISP_SOURCE, 'Illumination awaits emitted-light world state.'),
    }, { kind: 'incorporeal_movement', difficultTerrain: true, endingInObjectDamage: damage(5, 1, 10, 0, 'Force') }]),
    actions: [melee('shock', 'Shock', 4, [damage(11, 2, 8, 2, 'Lightning')])],
    bonusActions: present([{
      kind: 'consume_life', savingThrow: { ability: 'constitution', dc: 10 },
      target: { kind: 'visible_living_creature', rangeFeet: 5, requiredHitPoints: 0 },
      failure: { targetDies: true, healing: { average: 10, dice: { count: 3, sides: 6, modifier: 0 } } },
      success: { kind: 'none' },
      ...typedUnavailable(WILL_O_WISP_SOURCE, 'Consume Life awaits zero-Hit-Point targeting, instant death, and self-healing support.'),
    }, {
      kind: 'vanish', appliesInvisibleTo: ['monster', 'monster_light'], duration: 'until_concentration_ends',
      endsEarlyImmediatelyAfter: ['attack_roll', 'consume_life'],
      ...typedUnavailable(WILL_O_WISP_SOURCE, 'Vanish awaits concentration-bound invisibility and light-state support.'),
    }]),
    reactions: notListed('reactions'),
  },
});

function cleanRoomProvenance(
  name: string,
  anchor: { readonly name: string; readonly source: SourceSpan; readonly armorClass: number; readonly hitPoints: number; readonly computedDpr: number },
  bounds: { readonly armorClass: readonly [number, number]; readonly hitPoints: readonly [number, number]; readonly dpr: readonly [number, number] },
  role: string,
): OriginalHomebrewProvenance {
  return {
    kind: 'original_homebrew',
    comparableAnchors: [{ ...anchor, allowedArmorClass: bounds.armorClass, allowedHitPoints: bounds.hitPoints, allowedDpr: bounds.dpr }],
    designNote: `${name} is original clean-room homebrew derived only from the fixture role (${role}). The cited SRD creature is a numeric balance skeleton only; no external adventure prose or numbers were used. The homebrew: ID prefix is the clean-room provenance marker.`,
  };
}

const lowGroupAnchor = { name: 'Giant Rat', source: GIANT_RAT_SOURCE, armorClass: 13, hitPoints: 7, computedDpr: 5 } as const;
const flyingObjectAnchor = { name: 'Animated Flying Sword', source: ANIMATED_FLYING_SWORD_SOURCE, armorClass: 17, hitPoints: 14, computedDpr: 6 } as const;
const statueAnchor = { name: 'Gargoyle', source: GARGOYLE_SOURCE, armorClass: 15, hitPoints: 67, computedDpr: 14 } as const;

function homebrewDetails(options: {
  readonly source: SourceSpan;
  readonly classification: Parameters<typeof baseDetails>[1];
  readonly challenge: Parameters<typeof baseDetails>[2];
  readonly speedFeet: number;
  readonly abilities: Parameters<typeof baseDetails>[5];
  readonly movement?: Parameters<typeof baseDetails>[6];
  readonly senses: Parameters<typeof present<readonly { readonly kind: 'blindsight' | 'darkvision'; readonly rangeFeet: number }[]>>[0];
  readonly passivePerception: number;
  readonly actions: readonly MonsterAction[];
}) {
  return {
    ...baseDetails([options.source], options.classification, options.challenge, unsupported('Original clean-room HP are authored directly rather than transcribed as Hit Dice.'), options.speedFeet, options.abilities, options.movement),
    skills: unsupported<readonly { readonly name: string; readonly bonus: number }[]>('This clean-room role does not declare skills.'),
    gear: unsupported<readonly string[]>('This clean-room role does not declare gear.'), senses: present(options.senses), passivePerception: options.passivePerception,
    languages: present([]), damageResponses: unsupported<readonly { readonly type: string; readonly response: 'vulnerable' | 'resistant' | 'immune' }[]>('This clean-room role has no authored damage responses.'),
    conditionImmunities: unsupported<readonly string[]>('This clean-room role has no authored condition immunities.'),
    traits: unsupported<readonly never[]>('This clean-room role has no additional traits.'), actions: options.actions,
    bonusActions: unsupported<readonly never[]>('This clean-room role has no bonus actions.'), reactions: unsupported<readonly never[]>('This clean-room role has no reactions.'),
  };
}

const astraldendonAbilities = abilityLines([12, 1, 1], [14, 2, 2], [12, 1, 1], [3, -4, -4], [10, 0, 0], [5, -3, -3]);
const astraldendonProvenance = cleanRoomProvenance('Astraldendon', lowGroupAnchor, { armorClass: [10, 16], hitPoints: [4, 12], dpr: [3, 7] }, 'low-CR xenobotanical group combatant');
export const ASTRALDENDON = monsterStatblock({
  id: 'homebrew:escape-the-astral-tower/astraldendon', name: 'Astraldendon', armorClass: 13, hitPointMaximum: 8, speedFeet: 30,
  initiativeBonus: 2, savingThrowBonuses: savingThrowBonuses(astraldendonAbilities), usesDeathSaves: false, provenance: astraldendonProvenance,
  sourceDetails: homebrewDetails({ source: GIANT_RAT_SOURCE, classification: { sizes: ['Small'], type: 'Plant', subtype: null, alignment: 'Unaligned' }, challenge: { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, speedFeet: 30, abilities: astraldendonAbilities, senses: [], passivePerception: 10, actions: [melee('thorn', 'Thorn', 4, [damage(5, 1, 6, 2, 'Piercing')])] }),
});

const astralmyconAbilities = abilityLines([10, 0, 0], [12, 1, 1], [14, 2, 2], [6, -2, -2], [12, 1, 1], [5, -3, -3]);
const astralmyconProvenance = cleanRoomProvenance('Astralmycon', lowGroupAnchor, { armorClass: [10, 16], hitPoints: [4, 12], dpr: [3, 7] }, 'low-CR xenobotanical group combatant');
export const ASTRALMYCON = monsterStatblock({
  id: 'homebrew:escape-the-astral-tower/astralmycon', name: 'Astralmycon', armorClass: 12, hitPointMaximum: 9, speedFeet: 20,
  initiativeBonus: 1, savingThrowBonuses: savingThrowBonuses(astralmyconAbilities), usesDeathSaves: false, provenance: astralmyconProvenance,
  sourceDetails: homebrewDetails({ source: GIANT_RAT_SOURCE, classification: { sizes: ['Small'], type: 'Plant', subtype: 'Fungus', alignment: 'Unaligned' }, challenge: { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, speedFeet: 20, abilities: astralmyconAbilities, senses: [{ kind: 'darkvision', rangeFeet: 60 }], passivePerception: 11, actions: [melee('buffet', 'Buffet', 3, [damage(5, 1, 6, 2, 'Bludgeoning')])] }),
});

const broomAbilities = abilityLines([10, 0, 0], [15, 2, 4], [10, 0, 0], [1, -5, -5], [5, -3, -3], [1, -5, -5]);
const broomProvenance = cleanRoomProvenance('Animated Broom', flyingObjectAnchor, { armorClass: [14, 20], hitPoints: [8, 20], dpr: [4, 8] }, 'mobile animated-object encounter');
export const ANIMATED_BROOM = monsterStatblock({
  id: 'homebrew:escape-the-astral-tower/animated-broom', name: 'Animated Broom', armorClass: 15, hitPointMaximum: 12, speedFeet: 5,
  initiativeBonus: 4, savingThrowBonuses: savingThrowBonuses(broomAbilities), usesDeathSaves: false, provenance: broomProvenance,
  sourceDetails: homebrewDetails({ source: ANIMATED_FLYING_SWORD_SOURCE, classification: { sizes: ['Small'], type: 'Construct', subtype: null, alignment: 'Unaligned' }, challenge: { rating: '1/4', experiencePoints: 50, proficiencyBonus: 2 }, speedFeet: 5, abilities: broomAbilities, movement: [{ kind: 'fly', feet: 40, hover: true }], senses: [{ kind: 'blindsight', rangeFeet: 60 }], passivePerception: 7, actions: [melee('bristles', 'Bristles', 4, [damage(5, 1, 6, 2, 'Bludgeoning')])] }),
});

const statueAbilities = abilityLines([16, 3, 3], [8, -1, -1], [16, 3, 3], [3, -4, -4], [10, 0, 0], [3, -4, -4]);
const statueProvenance = cleanRoomProvenance('Animated Statue', statueAnchor, { armorClass: [12, 18], hitPoints: [40, 90], dpr: [10, 18] }, 'durable interaction-triggered reliquary guardian');
export const ANIMATED_STATUE = monsterStatblock({
  id: 'homebrew:escape-the-astral-tower/animated-statue', name: 'Animated Statue', armorClass: 17, hitPointMaximum: 60, speedFeet: 20,
  initiativeBonus: -1, savingThrowBonuses: savingThrowBonuses(statueAbilities), attacksPerAction: 2, usesDeathSaves: false, provenance: statueProvenance,
  sourceDetails: homebrewDetails({ source: GARGOYLE_SOURCE, classification: { sizes: ['Medium'], type: 'Construct', subtype: null, alignment: 'Unaligned' }, challenge: { rating: 2, experiencePoints: 450, proficiencyBonus: 2 }, speedFeet: 20, abilities: statueAbilities, senses: [{ kind: 'blindsight', rangeFeet: 60 }], passivePerception: 10, actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['stone-fist'], combination: 'any' }, melee('stone-fist', 'Stone Fist', 5, [damage(7, 1, 8, 3, 'Bludgeoning')])] }),
});

const familiarAbilities = abilityLines([3, -4, -4], [15, 2, 4], [10, 0, 0], [8, -1, -1], [12, 1, 3], [10, 0, 0]);
const familiarProvenance = cleanRoomProvenance('Familiar', lowGroupAnchor, { armorClass: [10, 16], hitPoints: [4, 12], dpr: [3, 7] }, 'small roaming familiar/scout');
export const FAMILIAR = monsterStatblock({
  id: 'homebrew:escape-the-astral-tower/familiar', name: 'Familiar', armorClass: 13, hitPointMaximum: 5, speedFeet: 20,
  initiativeBonus: 4, savingThrowBonuses: savingThrowBonuses(familiarAbilities), usesDeathSaves: false, provenance: familiarProvenance,
  sourceDetails: homebrewDetails({ source: GIANT_RAT_SOURCE, classification: { sizes: ['Tiny'], type: 'Beast', subtype: null, alignment: 'Unaligned' }, challenge: { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, speedFeet: 20, abilities: familiarAbilities, movement: [{ kind: 'fly', feet: 40, hover: false }], senses: [{ kind: 'darkvision', rangeFeet: 60 }], passivePerception: 13, actions: [melee('nip', 'Nip', 4, [damage(4, 1, 4, 2, 'Piercing')])] }),
});

export const ASTRAL_TOWER_UNSUPPORTED_ENTRIES: readonly UnsupportedStatblockEntry[] = [
] as const;

const SRD_ROWS = [
  AIR_ELEMENTAL, ANIMATED_ARMOR, BLACK_PUDDING, DOPPELGANGER, EARTH_ELEMENTAL, GARGOYLE,
  GHOST, GIANT_RAT, MIMIC, ROC, STIRGE, WILL_O_WISP,
] as const;
const HOMEBREW_ROWS = [ASTRALDENDON, ASTRALMYCON, ANIMATED_BROOM, ANIMATED_STATUE, FAMILIAR] as const;

export interface AstralTowerMonsterRosterRow {
  readonly id: string;
  readonly name: string;
  readonly family: 'astral_tower';
  readonly challengeRating: '1/8' | '1/4' | 1 | 2 | 3 | 4 | 5 | 11;
  readonly source: readonly SourceSpan[];
  readonly selectionNote: string;
  readonly provenance: MonsterProvenance;
  readonly statblock: MonsterStatblock;
}

const challengeById: Readonly<Record<string, AstralTowerMonsterRosterRow['challengeRating']>> = {
  'statblock:air-elemental': 5, 'statblock:animated-armor': 1, 'statblock:black-pudding': 4,
  'statblock:doppelganger': 3, 'statblock:earth-elemental': 5, 'statblock:gargoyle': 2,
  'statblock:ghost': 4, 'statblock:giant-rat': '1/8', 'statblock:mimic': 2, 'statblock:roc': 11,
  'statblock:stirge': '1/8', 'statblock:will-o-wisp': 2,
  'homebrew:escape-the-astral-tower/astraldendon': '1/8', 'homebrew:escape-the-astral-tower/astralmycon': '1/8',
  'homebrew:escape-the-astral-tower/animated-broom': '1/4', 'homebrew:escape-the-astral-tower/animated-statue': 2,
  'homebrew:escape-the-astral-tower/familiar': '1/8',
};

export const ASTRAL_TOWER_MONSTER_ROSTER: readonly AstralTowerMonsterRosterRow[] = [...SRD_ROWS, ...HOMEBREW_ROWS].map((statblock) => {
  const challengeRating = challengeById[statblock.id];
  if (challengeRating === undefined) throw new RangeError(`Missing Astral Tower challenge rating for ${statblock.id}.`);
  const source = statblock.provenance.kind === 'srd_5_2_1_decoded'
    ? statblock.provenance.source
    : statblock.provenance.kind === 'original_homebrew'
      ? statblock.provenance.comparableAnchors.map((anchor) => anchor.source)
      : [];
  return {
    id: statblock.id, name: statblock.name, family: 'astral_tower', challengeRating, source,
    selectionNote: statblock.provenance.kind === 'original_homebrew' ? 'Original clean-room fixture role.' : 'Exact SRD 5.2.1 transcription with explicit typed unsupported remainders.',
    provenance: statblock.provenance, statblock,
  };
});
