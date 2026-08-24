import type { CreatureType, DamageType } from '../../domain/enums';
import { monsterStatblock, type MonsterStatblock, type SourceSpan } from '../statblock';
import { statblockId, type StatblockId } from '../values';
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
import { BUNDLED_MONSTER_ROSTER } from './roster';

export type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface CasterContext {
  readonly spellSaveDc: number;
  readonly spellAttackBonus: number;
  readonly spellcastingAbilityModifier: number;
  readonly slotLevel: SpellSlotLevel;
}

export type CompanionTemplateId =
  | 'statblock:otherworldly-steed'
  | 'statblock:giant-insect'
  | 'statblock:animated-object';

export type CompanionInstantiationRequest =
  | ({ readonly monsterId: 'statblock:otherworldly-steed'; readonly creatureType: 'Celestial' | 'Fey' | 'Fiend' } & CasterContext)
  | ({ readonly monsterId: 'statblock:giant-insect'; readonly form: 'Centipede' | 'Spider' | 'Wasp' } & CasterContext)
  | ({ readonly monsterId: 'statblock:animated-object'; readonly size: 'Medium or smaller' | 'Large' | 'Huge' } & CasterContext);

export interface MonsterScalingFormula {
  readonly field: string;
  readonly formula: string;
  readonly source: SourceSpan;
}

export interface ParameterizedMonsterTemplate<Id extends CompanionTemplateId> {
  readonly kind: 'parameterized';
  readonly id: Id;
  readonly name: string;
  readonly source: readonly SourceSpan[];
  readonly scaling: readonly MonsterScalingFormula[];
}

const STEED_SOURCE = [
  { path: SRD_PATH, lineStart: 8144, lineEnd: 8145 },
  { path: SRD_PATH, lineStart: 8153, lineEnd: 8191 },
] as const;
const INSECT_SOURCE = [
  { path: SRD_PATH, lineStart: 8529, lineEnd: 8530 },
  { path: SRD_PATH, lineStart: 8532, lineEnd: 8568 },
] as const;
const ANIMATED_OBJECT_SOURCE = [
  { path: SRD_PATH, lineStart: 6618, lineEnd: 6620 },
  { path: SRD_PATH, lineStart: 6643, lineEnd: 6646 },
  { path: SRD_PATH, lineStart: 6648, lineEnd: 6670 },
] as const;

export const OTHERWORLDLY_STEED_TEMPLATE: ParameterizedMonsterTemplate<'statblock:otherworldly-steed'> = {
  kind: 'parameterized', id: 'statblock:otherworldly-steed', name: 'Otherworldly Steed', source: STEED_SOURCE,
  scaling: [
    { field: 'armorClass', formula: '10 + slotLevel', source: { path: SRD_PATH, lineStart: 8155, lineEnd: 8156 } },
    { field: 'hitPointMaximum', formula: '5 + 10 * slotLevel', source: { path: SRD_PATH, lineStart: 8157, lineEnd: 8158 } },
    { field: 'flySpeed', formula: 'slotLevel >= 4 ? 60 : absent', source: { path: SRD_PATH, lineStart: 8159, lineEnd: 8159 } },
    { field: 'attackBonus', formula: 'spellAttackBonus', source: { path: SRD_PATH, lineStart: 8173, lineEnd: 8174 } },
    { field: 'otherworldlySlamDamage', formula: '1d8 + slotLevel', source: { path: SRD_PATH, lineStart: 8173, lineEnd: 8177 } },
    { field: 'fellGlareDc', formula: 'spellSaveDc', source: { path: SRD_PATH, lineStart: 8180, lineEnd: 8184 } },
    { field: 'healingTouch', formula: '2d8 + slotLevel', source: { path: SRD_PATH, lineStart: 8189, lineEnd: 8191 } },
  ],
};

export const GIANT_INSECT_TEMPLATE: ParameterizedMonsterTemplate<'statblock:giant-insect'> = {
  kind: 'parameterized', id: 'statblock:giant-insect', name: 'Giant Insect', source: INSECT_SOURCE,
  scaling: [
    { field: 'armorClass', formula: '11 + slotLevel', source: { path: SRD_PATH, lineStart: 8532, lineEnd: 8535 } },
    { field: 'hitPointMaximum', formula: '30 + 10 * (slotLevel - 4)', source: { path: SRD_PATH, lineStart: 8535, lineEnd: 8535 } },
    { field: 'attacksPerAction', formula: 'floor(slotLevel / 2)', source: { path: SRD_PATH, lineStart: 8550, lineEnd: 8553 } },
    { field: 'attackBonus', formula: 'spellAttackBonus', source: { path: SRD_PATH, lineStart: 8555, lineEnd: 8560 } },
    { field: 'poisonJabPiercingDamage', formula: '1d6 + 3 + slotLevel', source: { path: SRD_PATH, lineStart: 8555, lineEnd: 8557 } },
    { field: 'webBoltBludgeoningDamage', formula: '1d10 + 3 + slotLevel', source: { path: SRD_PATH, lineStart: 8558, lineEnd: 8561 } },
    { field: 'venomousSpewDc', formula: 'spellSaveDc', source: { path: SRD_PATH, lineStart: 8564, lineEnd: 8568 } },
  ],
};

export const ANIMATED_OBJECT_TEMPLATE: ParameterizedMonsterTemplate<'statblock:animated-object'> = {
  kind: 'parameterized', id: 'statblock:animated-object', name: 'Animated Object', source: ANIMATED_OBJECT_SOURCE,
  scaling: [
    { field: 'maximumSummonedObjects', formula: 'spellcastingAbilityModifier, with Large counting as 2 and Huge as 3', source: { path: SRD_PATH, lineStart: 6618, lineEnd: 6625 } },
    { field: 'slamUpcastDice', formula: 'one size-specific die per slotLevel above 5', source: { path: SRD_PATH, lineStart: 6643, lineEnd: 6646 } },
    { field: 'attackBonus', formula: 'spellAttackBonus', source: { path: SRD_PATH, lineStart: 6664, lineEnd: 6667 } },
    { field: 'largeAndHugeSlamModifier', formula: '3 + spellcastingAbilityModifier', source: { path: SRD_PATH, lineStart: 6667, lineEnd: 6670 } },
  ],
};

export const PARAMETERIZED_MONSTER_TEMPLATES = [
  OTHERWORLDLY_STEED_TEMPLATE,
  GIANT_INSECT_TEMPLATE,
  ANIMATED_OBJECT_TEMPLATE,
] as const;

const steedAbilities = abilityLines([18, 4, 4], [12, 1, 1], [14, 2, 2], [6, -2, -2], [12, 1, 1], [8, -1, -1]);
const insectAbilities = abilityLines([17, 3, 3], [13, 1, 1], [15, 2, 2], [4, -3, -3], [14, 2, 2], [3, -4, -4]);
const objectAbilities = abilityLines([16, 3, 3], [10, 0, 0], [10, 0, 0], [3, -4, -4], [3, -4, -4], [1, -5, -5]);

function checkedContext(context: CasterContext, minimumSlotLevel: SpellSlotLevel, name: string): CasterContext {
  if (!Number.isSafeInteger(context.spellSaveDc) || context.spellSaveDc < 1) throw new RangeError(`${name} requires a positive spell save DC.`);
  if (!Number.isSafeInteger(context.spellAttackBonus)) throw new RangeError(`${name} requires a safe-integer spell attack bonus.`);
  if (!Number.isSafeInteger(context.spellcastingAbilityModifier)) throw new RangeError(`${name} requires a safe-integer spellcasting ability modifier.`);
  if (!Number.isSafeInteger(context.slotLevel) || context.slotLevel < minimumSlotLevel || context.slotLevel > 9) {
    throw new RangeError(`${name} requires slot level ${minimumSlotLevel} through 9.`);
  }
  return context;
}

function instantiateSteed(request: Extract<CompanionInstantiationRequest, { readonly monsterId: 'statblock:otherworldly-steed' }>): MonsterStatblock {
  const context = checkedContext(request, 2, 'Otherworldly Steed');
  const damageTypeByCreature: Readonly<Record<typeof request.creatureType, DamageType>> = {
    Celestial: 'Radiant', Fey: 'Psychic', Fiend: 'Necrotic',
  };
  const bonusActions = request.creatureType === 'Fiend'
    ? [{ kind: 'saving_throw' as const, id: 'fell-glare', name: 'Fell Glare', savingThrow: { ability: 'wisdom' as const, dc: context.spellSaveDc }, target: { rangeFeet: 60, maximumSize: null, excludedKinds: [] }, failure: { damage: [], effects: [conditionOnHit('Frightened', null, { duration: 'until_end_of_monster_next_turn' })] }, success: { kind: 'none' as const } }]
    : request.creatureType === 'Fey'
      ? [{ kind: 'teleport' as const, distanceFeet: 60, includesRider: true as const }]
      : [{ kind: 'healing' as const, rangeFeet: 5, average: 9 + context.slotLevel, dice: { count: 2, sides: 8 as const, modifier: context.slotLevel } }];
  return monsterStatblock({
    id: request.monsterId, name: 'Otherworldly Steed', armorClass: 10 + context.slotLevel,
    hitPointMaximum: 5 + 10 * context.slotLevel, hitPointMaximumIsFormula: true, speedFeet: 60, initiativeBonus: 1,
    savingThrowBonuses: savingThrowBonuses(steedAbilities), usesDeathSaves: false,
    sourceDetails: {
      ...baseDetails(STEED_SOURCE, { sizes: ['Large'], type: request.creatureType as CreatureType, subtype: null, alignment: 'Neutral' }, { rating: 'none', experiencePoints: 0, proficiencyBonus: 'caster' }, { count: context.slotLevel, sides: 10, modifier: 0 }, 60, steedAbilities, context.slotLevel >= 4 ? [{ kind: 'fly', feet: 60, hover: false }] : []),
      skills: notListed('skills'), gear: notListed('gear'), senses: present([]), passivePerception: 11,
      languages: present([{ kind: 'named', name: 'Telepathy 1 mile (works only with its caster)', canSpeak: false }]),
      damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'),
      traits: present([{ kind: 'life_bond', rangeFeet: 5, spellMinimumLevel: 1 }]),
      actions: [melee('otherworldly-slam', 'Otherworldly Slam', context.spellAttackBonus, [damage(4 + context.slotLevel, 1, 8, context.slotLevel, damageTypeByCreature[request.creatureType])])],
      bonusActions: present(bonusActions), reactions: notListed('reactions'),
    },
  });
}

function instantiateInsect(request: Extract<CompanionInstantiationRequest, { readonly monsterId: 'statblock:giant-insect' }>): MonsterStatblock {
  const context = checkedContext(request, 4, 'Giant Insect');
  const attacksPerAction = Math.floor(context.slotLevel / 2);
  const actions = [
    { kind: 'multiattack' as const, id: 'multiattack', count: attacksPerAction, actionIds: ['poison-jab'], combination: 'any' as const },
    melee('poison-jab', 'Poison Jab', context.spellAttackBonus, [damage(6 + context.slotLevel, 1, 6, 3 + context.slotLevel, 'Piercing'), damage(2, 1, 4, 0, 'Poison')], [], 10),
    ...(request.form === 'Spider' ? [attack('web-bolt', 'Web Bolt', context.spellAttackBonus, { kind: 'ranged', rangeFeet: 60, longRangeFeet: notListed('a long range for Web Bolt') }, [damage(8 + context.slotLevel, 1, 10, 3 + context.slotLevel, 'Bludgeoning')], [{ kind: 'speed_reduction' as const, feet: 0 as const, duration: 'until_start_of_monster_next_turn' as const }])] : []),
  ];
  const bonusActions = request.form === 'Centipede'
    ? [{ kind: 'saving_throw' as const, id: 'venomous-spew', name: 'Venomous Spew', savingThrow: { ability: 'constitution' as const, dc: context.spellSaveDc }, target: { rangeFeet: 10, maximumSize: null, excludedKinds: [] }, failure: { damage: [], effects: [conditionOnHit('Poisoned', null, { duration: 'until_start_of_monster_next_turn' })] }, success: { kind: 'none' as const } }]
    : [];
  return monsterStatblock({
    id: request.monsterId, name: 'Giant Insect', armorClass: 11 + context.slotLevel,
    hitPointMaximum: 30 + 10 * (context.slotLevel - 4), speedFeet: 40, initiativeBonus: 1,
    savingThrowBonuses: savingThrowBonuses(insectAbilities), attacksPerAction, usesDeathSaves: false,
    sourceDetails: {
      ...baseDetails(INSECT_SOURCE, { sizes: ['Large'], type: 'Beast', subtype: request.form, alignment: 'Unaligned' }, { rating: 'none', experiencePoints: 0, proficiencyBonus: 'caster' }, notListed('Hit Dice'), 40, insectAbilities, [{ kind: 'climb', feet: 40, hover: false }, ...(request.form === 'Wasp' ? [{ kind: 'fly' as const, feet: 40, hover: false }] : [])]),
      skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 12,
      languages: present([{ kind: 'named', name: 'the languages its caster knows', canSpeak: false }]), damageResponses: notListed('damage vulnerabilities, resistances, or immunities'), conditionImmunities: notListed('condition immunities'), traits: present([{ kind: 'spider_climb' }]),
      actions, bonusActions: present(bonusActions), reactions: notListed('reactions'),
    },
  });
}

function instantiateAnimatedObject(request: Extract<CompanionInstantiationRequest, { readonly monsterId: 'statblock:animated-object' }>): MonsterStatblock {
  const context = checkedContext(request, 5, 'Animated Object');
  const size = request.size === 'Medium or smaller' ? 'Medium' : request.size;
  const upcastDice = context.slotLevel - 5;
  const damageProfile = request.size === 'Medium or smaller'
    ? { count: 1 + upcastDice, sides: 4 as const, modifier: 3 }
    : request.size === 'Large'
      ? { count: 2 + upcastDice, sides: 6 as const, modifier: 3 + context.spellcastingAbilityModifier }
      : { count: 2 + upcastDice, sides: 12 as const, modifier: 3 + context.spellcastingAbilityModifier };
  const average = Math.floor(damageProfile.count * (damageProfile.sides + 1) / 2) + damageProfile.modifier;
  const hitPointMaximum = request.size === 'Medium or smaller' ? 10 : request.size === 'Large' ? 20 : 40;
  return monsterStatblock({
    id: request.monsterId, name: 'Animated Object', armorClass: 15, hitPointMaximum, speedFeet: 30, initiativeBonus: 0,
    savingThrowBonuses: savingThrowBonuses(objectAbilities), damageResponses: [{ type: 'Poison', response: 'immune' }, { type: 'Psychic', response: 'immune' }],
    conditionImmunities: ['Charmed', 'Exhaustion', 'Frightened', 'Paralyzed', 'Poisoned'], usesDeathSaves: false,
    sourceDetails: {
      ...baseDetails(ANIMATED_OBJECT_SOURCE, { sizes: [size], type: 'Construct', subtype: null, alignment: 'Unaligned' }, { rating: 'none', experiencePoints: 0, proficiencyBonus: 'caster' }, notListed('Hit Dice'), 30, objectAbilities),
      skills: notListed('skills'), gear: notListed('gear'), senses: present([{ kind: 'blindsight', rangeFeet: 30 }]), passivePerception: 6,
      languages: present([{ kind: 'named', name: 'the languages its caster knows', canSpeak: false }]), damageResponses: present([{ type: 'Poison', response: 'immune' }, { type: 'Psychic', response: 'immune' }]), conditionImmunities: present(['Charmed', 'Exhaustion', 'Frightened', 'Paralyzed', 'Poisoned']), traits: notListed('traits'),
      actions: [melee('slam', 'Slam', context.spellAttackBonus, [damage(average, damageProfile.count, damageProfile.sides, damageProfile.modifier, 'Force')])],
      bonusActions: notListed('bonus actions'), reactions: notListed('reactions'),
    },
  });
}

export function instantiateMonsterTemplate(request: CompanionInstantiationRequest): MonsterStatblock {
  switch (request.monsterId) {
    case 'statblock:otherworldly-steed': return instantiateSteed(request);
    case 'statblock:giant-insect': return instantiateInsect(request);
    case 'statblock:animated-object': return instantiateAnimatedObject(request);
  }
}

export type BundledMonsterRegistryEntry =
  | { readonly kind: 'static'; readonly id: StatblockId; readonly statblock: MonsterStatblock }
  | (typeof PARAMETERIZED_MONSTER_TEMPLATES)[number];

export const BUNDLED_MONSTER_REGISTRY: readonly BundledMonsterRegistryEntry[] = [
  ...BUNDLED_MONSTER_ROSTER.map((row) => ({ kind: 'static' as const, id: row.statblock.id, statblock: row.statblock })),
  ...PARAMETERIZED_MONSTER_TEMPLATES,
];

export type MonsterRegistryLookup =
  | { readonly status: 'resolved'; readonly entry: BundledMonsterRegistryEntry }
  | { readonly status: 'refused'; readonly refusal: { readonly reason: 'missing_monster_id'; readonly monsterId: string } };

export function lookupBundledMonster(monsterId: string): MonsterRegistryLookup {
  const id = statblockId(monsterId);
  const entry = BUNDLED_MONSTER_REGISTRY.find((candidate) => candidate.id === id);
  return entry === undefined
    ? { status: 'refused', refusal: { reason: 'missing_monster_id', monsterId } }
    : { status: 'resolved', entry };
}
