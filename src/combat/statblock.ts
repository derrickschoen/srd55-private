import {
  abilities,
  conditionType,
  creatureSize,
  creatureType,
  damageType as domainDamageType,
  type Ability,
  type ConditionType,
  type CreatureSize,
  type CreatureType,
  type DamageType as DomainDamageType,
} from '../domain/enums';
import type { DamageResponse } from './resolution';
import { SPELL_MANIFEST, type SpellManifestStatus } from './spells/manifest';
import {
  armorClass,
  damageType,
  feet,
  statblockId,
  type ArmorClass,
  type DamageType,
  type Feet,
  type StatblockId,
} from './values';

export type ChallengeRating = '1/8' | '1/4' | '1/2' | 1 | 2 | 3;
export type MovementKind = 'walk' | 'burrow' | 'climb' | 'fly' | 'swim';
export type SenseKind = 'blindsight' | 'darkvision' | 'tremorsense' | 'truesight';

export interface SourceSpan {
  readonly path: 'docs/srd/full/srd-5.2.1.txt';
  readonly lineStart: number;
  readonly lineEnd: number;
}

export type DecodedField<T> =
  | { readonly kind: 'present'; readonly value: T }
  | { readonly kind: 'absent'; readonly note: string };

export interface MonsterDice {
  readonly count: number;
  readonly sides: 4 | 6 | 8 | 10 | 12 | 20;
  readonly modifier: number;
}

export interface MonsterAbilityLine {
  readonly score: number;
  readonly modifier: number;
  readonly saveBonus: number;
}

export interface MonsterMovementSpeed {
  readonly kind: MovementKind;
  readonly feet: number;
  readonly hover: boolean;
}

export interface MonsterSkill {
  readonly name: string;
  readonly bonus: number;
}

export interface MonsterSense {
  readonly kind: SenseKind;
  readonly rangeFeet: number;
}

export type MonsterLanguage =
  | { readonly kind: 'named'; readonly name: string; readonly canSpeak: boolean }
  | { readonly kind: 'choice'; readonly count: number; readonly qualifier: string; readonly canSpeak: boolean };

export interface MonsterClassification {
  readonly sizes: readonly CreatureSize[];
  readonly type: CreatureType;
  readonly subtype: string | null;
  readonly alignment: string;
}

export interface MonsterChallenge {
  readonly rating: ChallengeRating;
  readonly experiencePoints: 25 | 50 | 100 | 200 | 450 | 700;
  readonly proficiencyBonus: 2;
}

export type MonsterDamageTrigger =
  | { readonly kind: 'always' }
  | { readonly kind: 'attack_roll_advantage' }
  | { readonly kind: 'charge'; readonly minimumStraightFeet: number; readonly maximumTargetSize: CreatureSize };

export interface MonsterDamageTerm {
  readonly average: number;
  readonly dice: MonsterDice;
  readonly type: DomainDamageType;
  readonly trigger: MonsterDamageTrigger;
}

export type MonsterAttackDelivery =
  | { readonly kind: 'melee'; readonly reachFeet: number }
  | { readonly kind: 'ranged'; readonly rangeFeet: number; readonly longRangeFeet: DecodedField<number> }
  | { readonly kind: 'melee_or_ranged'; readonly reachFeet: number; readonly rangeFeet: number; readonly longRangeFeet: number };

export interface MonsterAttackAction {
  readonly kind: 'attack';
  readonly id: string;
  readonly name: string;
  readonly attackBonus: number;
  readonly delivery: MonsterAttackDelivery;
  readonly damage: readonly MonsterDamageTerm[];
  readonly attackRollAdvantage: null | {
    readonly kind: 'target_grappled_by_attacker';
  };
  readonly onHit: readonly MonsterOnHitEffect[];
}

export interface MonsterSavingThrow {
  readonly ability: Ability;
  readonly dc: number;
}

export interface MonsterEffectTarget {
  readonly maximumSize: CreatureSize | null;
  readonly excludedKinds: readonly ('Undead' | 'Elf')[];
}

export type MonsterEffectDuration =
  | 'until_escape'
  | 'until_end_of_target_next_turn'
  | 'until_start_of_monster_next_turn';

export type MonsterOnHitEffect =
  | {
    readonly kind: 'condition';
    readonly condition: 'Frightened' | 'Grappled' | 'Paralyzed' | 'Prone';
    readonly trigger: MonsterDamageTrigger;
    readonly target: MonsterEffectTarget;
    readonly savingThrow: MonsterSavingThrow | null;
    readonly escapeDc: number | null;
    readonly duration: MonsterEffectDuration | null;
  }
  | { readonly kind: 'hit_point_maximum_reduction'; readonly amount: 'damage_taken' }
  | { readonly kind: 'raises_as_zombie'; readonly targetKind: 'Humanoid'; readonly delayHours: 24; readonly controllerLimit: 12; readonly preventedBy: readonly ['restored_to_life', 'body_destroyed'] };

export interface MonsterMultiattackAction {
  readonly kind: 'multiattack';
  readonly id: string;
  readonly count: number;
  readonly actionIds: readonly string[];
  readonly combination: 'any' | 'fixed' | 'one_attack_may_be_replaced';
}

export interface MonsterSavingThrowAction {
  readonly kind: 'saving_throw';
  readonly id: string;
  readonly name: string;
  readonly savingThrow: MonsterSavingThrow;
  readonly target: MonsterEffectTarget & { readonly rangeFeet: number };
  readonly failure: {
    readonly damage: readonly MonsterDamageTerm[];
    readonly effects: readonly MonsterOnHitEffect[];
  };
  readonly success: { readonly kind: 'none' };
}

export interface MonsterSpellReference {
  readonly id: string;
  readonly availability: 'at_will' | '1_per_day' | '3_per_day';
  readonly manifestStatus: SpellManifestStatus;
}

export interface MonsterSpellcastingAction {
  readonly kind: 'spellcasting';
  readonly id: string;
  readonly actionEconomy: 'action' | 'bonus_action';
  readonly ability: Ability;
  readonly saveDc: DecodedField<number>;
  readonly spellAttackBonus: DecodedField<number>;
  readonly spells: readonly MonsterSpellReference[];
}

export type MonsterAction = MonsterAttackAction | MonsterMultiattackAction | MonsterSavingThrowAction | MonsterSpellcastingAction;

export type MonsterTrait =
  | { readonly kind: 'pack_tactics'; readonly allyDistanceFeet: 5; readonly blockedByCondition: 'Incapacitated'; readonly appliesTo: 'attack_rolls' }
  | { readonly kind: 'undead_fortitude'; readonly saveAbility: 'constitution'; readonly dcBase: 5; readonly addDamageTaken: true; readonly excludedDamageType: 'Radiant'; readonly excludedCriticalHits: true; readonly successHitPoints: 1 }
  | { readonly kind: 'abduct'; readonly extraMovementCostWhileGrappling: false }
  | { readonly kind: 'aura_of_authority'; readonly emanationFeet: number; readonly grantsAdvantageOn: readonly ['attack_rolls', 'saving_throws']; readonly blockedByCondition: 'Incapacitated' }
  | { readonly kind: 'bloodied_frenzy'; readonly grantsAdvantageOn: readonly ['attack_rolls', 'saving_throws'] }
  | { readonly kind: 'bloodied_fury'; readonly grantsAdvantageOn: readonly ['attack_rolls'] }
  | { readonly kind: 'incorporeal_movement'; readonly difficultTerrain: true; readonly endingInObjectDamage: MonsterDamageTerm }
  | { readonly kind: 'running_leap'; readonly runningStartFeet: number; readonly longJumpFeet: number }
  | { readonly kind: 'stench'; readonly emanationFeet: number; readonly savingThrow: MonsterSavingThrow; readonly condition: 'Poisoned'; readonly duration: 'until_start_of_monster_next_turn'; readonly successImmunityHours: 24 }
  | { readonly kind: 'sunlight_sensitivity'; readonly disadvantageOn: readonly ['ability_checks', 'attack_rolls'] };

export type MonsterBonusAction =
  | { readonly kind: 'nimble_escape'; readonly actions: readonly ['Disengage', 'Hide'] }
  | { readonly kind: 'cunning_action'; readonly actions: readonly ['Dash', 'Disengage', 'Hide'] }
  | MonsterSavingThrowAction
  | MonsterSpellcastingAction;

export type MonsterReaction =
  | {
    readonly kind: 'parry';
    readonly trigger: 'hit_by_melee_attack';
    readonly requiresHoldingWeapon: true;
    readonly armorClassBonus: 2;
    readonly appliesToTriggeringAttackOnly: true;
  }
  | {
    readonly kind: 'redirect_attack';
    readonly trigger: 'targeted_by_visible_attack_roll';
    readonly allyDistanceFeet: number;
    readonly maximumAllySize: CreatureSize;
    readonly swapsPlaces: true;
    readonly allyBecomesTarget: true;
  };

export interface MonsterSourceDetailsInput {
  readonly source: readonly SourceSpan[];
  readonly classification: MonsterClassification;
  readonly challenge: MonsterChallenge;
  readonly hitPointDice: MonsterDice;
  readonly movement: readonly MonsterMovementSpeed[];
  readonly abilities: Readonly<Record<Ability, MonsterAbilityLine>>;
  readonly skills: DecodedField<readonly MonsterSkill[]>;
  readonly gear: DecodedField<readonly string[]>;
  readonly senses: DecodedField<readonly MonsterSense[]>;
  readonly passivePerception: number;
  readonly languages: DecodedField<readonly MonsterLanguage[]>;
  readonly damageResponses: DecodedField<readonly { readonly type: string; readonly response: Exclude<DamageResponse, 'normal'> }[]>;
  readonly conditionImmunities: DecodedField<readonly string[]>;
  readonly traits: DecodedField<readonly MonsterTrait[]>;
  readonly actions: readonly MonsterAction[];
  readonly bonusActions: DecodedField<readonly MonsterBonusAction[]>;
  readonly reactions: DecodedField<readonly MonsterReaction[]>;
}

export interface MonsterSourceDetails {
  readonly source: DecodedField<readonly SourceSpan[]>;
  readonly classification: DecodedField<MonsterClassification>;
  readonly challenge: DecodedField<MonsterChallenge>;
  readonly hitPointDice: DecodedField<MonsterDice>;
  readonly movement: DecodedField<readonly MonsterMovementSpeed[]>;
  readonly abilities: DecodedField<Readonly<Record<Ability, MonsterAbilityLine>>>;
  readonly skills: DecodedField<readonly MonsterSkill[]>;
  readonly gear: DecodedField<readonly string[]>;
  readonly senses: DecodedField<readonly MonsterSense[]>;
  readonly passivePerception: DecodedField<number>;
  readonly languages: DecodedField<readonly MonsterLanguage[]>;
  readonly damageResponses: DecodedField<readonly { readonly type: DamageType; readonly response: Exclude<DamageResponse, 'normal'> }[]>;
  readonly conditionImmunities: DecodedField<readonly ConditionType[]>;
  readonly traits: DecodedField<readonly MonsterTrait[]>;
  readonly actions: DecodedField<readonly MonsterAction[]>;
  readonly bonusActions: DecodedField<readonly MonsterBonusAction[]>;
  readonly reactions: DecodedField<readonly MonsterReaction[]>;
}

export interface MonsterStatblockInput {
  readonly id: string;
  readonly name: string;
  readonly armorClass: number;
  readonly hitPointMaximum: number;
  readonly speedFeet: number;
  readonly initiativeBonus: number;
  readonly savingThrowBonuses: Readonly<Record<Ability, number>>;
  readonly attacksPerAction?: number;
  readonly reachFeet?: number;
  readonly damageResponses?: readonly { readonly type: string; readonly response: DamageResponse }[];
  readonly conditionImmunities?: readonly string[];
  readonly usesDeathSaves?: boolean;
  readonly sourceDetails?: MonsterSourceDetailsInput;
}

export interface MonsterStatblock {
  readonly id: StatblockId;
  readonly name: string;
  readonly armorClass: ArmorClass;
  readonly hitPointMaximum: number;
  readonly speed: Feet;
  readonly initiativeBonus: number;
  readonly savingThrowBonuses: Readonly<Record<Ability, number>>;
  readonly attacksPerAction: number;
  readonly reach: Feet;
  readonly damageResponses: readonly { readonly type: DamageType; readonly response: DamageResponse }[];
  readonly conditionImmunities: readonly string[];
  readonly usesDeathSaves: boolean;
  readonly sourceDetails: MonsterSourceDetails;
}

const AUTHORED_ABSENCE = 'This authored statblock did not supply the SRD field.';
const present = <T>(value: T): DecodedField<T> => ({ kind: 'present', value });
const absent = <T>(note = AUTHORED_ABSENCE): DecodedField<T> => ({ kind: 'absent', note });

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${label} must be a positive safe integer.`);
  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative safe integer.`);
  return value;
}

function finiteInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label} must be a safe integer.`);
  return value;
}

function nonEmptyText(value: string, label: string): string {
  if (value.trim().length === 0 || value.trim() !== value) throw new RangeError(`${label} must be trimmed and non-empty.`);
  return value;
}

function validateDice(dice: MonsterDice, label: string): MonsterDice {
  positiveInteger(dice.count, `${label} count`);
  finiteInteger(dice.modifier, `${label} modifier`);
  return dice;
}

function validateDecoded<T>(field: DecodedField<T>, label: string, validate: (value: T) => T): DecodedField<T> {
  return field.kind === 'absent'
    ? absent(nonEmptyText(field.note, `${label} absence note`))
    : present(validate(field.value));
}

function validateSpell(reference: MonsterSpellReference): MonsterSpellReference {
  const row = SPELL_MANIFEST.find(({ id }) => id === reference.id);
  if (row === undefined) throw new RangeError(`Monster spell ${reference.id} is absent from the spell manifest.`);
  if (row.status !== reference.manifestStatus) throw new RangeError(`Monster spell ${reference.id} has the wrong manifest status.`);
  return reference;
}

function validateDamageTerm(term: MonsterDamageTerm, label: string): MonsterDamageTerm {
  nonNegativeInteger(term.average, `${label} damage average`);
  validateDice(term.dice, `${label} damage`);
  domainDamageType(term.type);
  if (term.trigger.kind === 'charge') {
    positiveInteger(term.trigger.minimumStraightFeet, `${label} charge distance`);
    creatureSize(term.trigger.maximumTargetSize);
  }
  return term;
}

function validateEffect(effect: MonsterOnHitEffect, label: string): MonsterOnHitEffect {
  switch (effect.kind) {
    case 'condition':
      conditionType(effect.condition);
      if (effect.trigger.kind === 'charge') {
        positiveInteger(effect.trigger.minimumStraightFeet, `${label} condition charge distance`);
        creatureSize(effect.trigger.maximumTargetSize);
      }
      if (effect.target.maximumSize !== null) creatureSize(effect.target.maximumSize);
      if (effect.savingThrow !== null) {
        abilities.includes(effect.savingThrow.ability);
        positiveInteger(effect.savingThrow.dc, `${label} save DC`);
      }
      if (effect.escapeDc !== null) positiveInteger(effect.escapeDc, `${label} escape DC`);
      return effect;
    case 'hit_point_maximum_reduction':
      return effect;
    case 'raises_as_zombie':
      return effect;
  }
}

function validateAction<T extends MonsterAction | MonsterBonusAction>(action: T): T {
  switch (action.kind) {
    case 'attack':
      nonEmptyText(action.id, 'Attack id');
      nonEmptyText(action.name, 'Attack name');
      finiteInteger(action.attackBonus, `${action.name} attack bonus`);
      action.damage.forEach((term) => validateDamageTerm(term, action.name));
      action.onHit.forEach((effect) => validateEffect(effect, action.name));
      switch (action.delivery.kind) {
        case 'melee':
          positiveInteger(action.delivery.reachFeet, `${action.name} reach`);
          break;
        case 'ranged':
          positiveInteger(action.delivery.rangeFeet, `${action.name} range`);
          validateDecoded(action.delivery.longRangeFeet, `${action.name} long range`, (range) => positiveInteger(range, `${action.name} long range`));
          break;
        case 'melee_or_ranged':
          positiveInteger(action.delivery.reachFeet, `${action.name} reach`);
          positiveInteger(action.delivery.rangeFeet, `${action.name} range`);
          positiveInteger(action.delivery.longRangeFeet, `${action.name} long range`);
          break;
      }
      return action;
    case 'multiattack':
      nonEmptyText(action.id, 'Multiattack id');
      positiveInteger(action.count, 'Multiattack count');
      if (action.actionIds.length === 0) throw new RangeError('Multiattack must name at least one action.');
      if (action.combination === 'fixed' && action.actionIds.length !== action.count) {
        throw new RangeError('Fixed Multiattack must list each action in order.');
      }
      return action;
    case 'saving_throw':
      nonEmptyText(action.id, 'Saving throw action id');
      nonEmptyText(action.name, 'Saving throw action name');
      positiveInteger(action.savingThrow.dc, `${action.name} save DC`);
      positiveInteger(action.target.rangeFeet, `${action.name} range`);
      if (action.target.maximumSize !== null) creatureSize(action.target.maximumSize);
      action.failure.damage.forEach((term) => validateDamageTerm(term, action.name));
      action.failure.effects.forEach((effect) => validateEffect(effect, action.name));
      return action;
    case 'spellcasting':
      nonEmptyText(action.id, 'Spellcasting id');
      validateDecoded(action.saveDc, 'Spell save DC', (dc) => positiveInteger(dc, 'Spell save DC'));
      validateDecoded(action.spellAttackBonus, 'Spell attack bonus', (bonus) => finiteInteger(bonus, 'Spell attack bonus'));
      action.spells.forEach(validateSpell);
      return action;
    case 'nimble_escape':
      return action;
    case 'cunning_action':
      return action;
  }
}

function emptySourceDetails(): MonsterSourceDetails {
  return {
    source: absent(), classification: absent(), challenge: absent(), hitPointDice: absent(), movement: absent(), abilities: absent(),
    skills: absent(), gear: absent(), senses: absent(), passivePerception: absent(), languages: absent(), damageResponses: absent(),
    conditionImmunities: absent(), traits: absent(), actions: absent(), bonusActions: absent(), reactions: absent(),
  };
}

function validateSourceDetails(input: MonsterSourceDetailsInput | undefined, speedFeet: number): MonsterSourceDetails {
  if (input === undefined) return emptySourceDetails();
  if (input.source.length === 0) throw new RangeError('Monster source must have at least one span.');
  for (const span of input.source) {
    positiveInteger(span.lineStart, 'Source start line');
    if (span.lineEnd < span.lineStart) throw new RangeError('Source span must end after it starts.');
  }
  if (input.classification.sizes.length === 0) throw new RangeError('Monster must have at least one size.');
  input.classification.sizes.forEach((size) => creatureSize(size));
  creatureType(input.classification.type);
  nonEmptyText(input.classification.alignment, 'Alignment');
  const experienceByChallenge: Readonly<Record<ChallengeRating, MonsterChallenge['experiencePoints']>> = {
    '1/8': 25, '1/4': 50, '1/2': 100, 1: 200, 2: 450, 3: 700,
  };
  if (input.challenge.experiencePoints !== experienceByChallenge[input.challenge.rating]) {
    throw new RangeError('Monster XP must match its Challenge Rating.');
  }
  validateDice(input.hitPointDice, 'Hit Point dice');
  const walk = input.movement.find(({ kind }) => kind === 'walk');
  if (walk === undefined || walk.feet !== speedFeet) throw new RangeError('Detailed walking speed must match combat walking speed.');
  input.movement.forEach((movement) => nonNegativeInteger(movement.feet, `${movement.kind} speed`));
  for (const ability of abilities) {
    const line = input.abilities[ability];
    positiveInteger(line.score, `${ability} score`);
    finiteInteger(line.modifier, `${ability} modifier`);
    finiteInteger(line.saveBonus, `${ability} save bonus`);
  }
  const actions = input.actions.map((action) => validateAction(action));
  const actionIds = new Set(actions.filter((action) => action.kind !== 'multiattack').map(({ id }) => id));
  for (const action of actions) {
    if (action.kind === 'multiattack' && action.actionIds.some((id) => !actionIds.has(id))) throw new RangeError('Multiattack references an unknown action.');
  }
  const decodedDamageResponses: MonsterSourceDetails['damageResponses'] = input.damageResponses.kind === 'absent'
    ? absent(nonEmptyText(input.damageResponses.note, 'Damage responses absence note'))
    : present(input.damageResponses.value.map((entry) => ({ type: damageType(entry.type), response: entry.response })));
  const decodedConditionImmunities: MonsterSourceDetails['conditionImmunities'] = input.conditionImmunities.kind === 'absent'
    ? absent(nonEmptyText(input.conditionImmunities.note, 'Condition immunities absence note'))
    : present(input.conditionImmunities.value.map(conditionType));
  return {
    source: present(input.source), classification: present(input.classification), challenge: present(input.challenge),
    hitPointDice: present(input.hitPointDice), movement: present(input.movement), abilities: present(input.abilities),
    skills: validateDecoded(input.skills, 'Skills', (skills) => skills.map((skill) => ({ name: nonEmptyText(skill.name, 'Skill name'), bonus: finiteInteger(skill.bonus, `${skill.name} bonus`) }))),
    gear: validateDecoded(input.gear, 'Gear', (gear) => gear.map((item) => nonEmptyText(item, 'Gear item'))),
    senses: validateDecoded(input.senses, 'Senses', (senses) => senses.map((sense) => ({ ...sense, rangeFeet: positiveInteger(sense.rangeFeet, `${sense.kind} range`) }))),
    passivePerception: present(nonNegativeInteger(input.passivePerception, 'Passive Perception')),
    languages: validateDecoded(input.languages, 'Languages', (languages) => languages.map((language) => language.kind === 'named' ? { ...language, name: nonEmptyText(language.name, 'Language') } : { ...language, count: positiveInteger(language.count, 'Language choice count'), qualifier: nonEmptyText(language.qualifier, 'Language choice qualifier') })),
    damageResponses: decodedDamageResponses,
    conditionImmunities: decodedConditionImmunities,
    traits: validateDecoded(input.traits, 'Traits', (traits) => traits), actions: present(actions),
    bonusActions: validateDecoded(input.bonusActions, 'Bonus actions', (bonusActions) => bonusActions.map((action) => validateAction(action))),
    reactions: validateDecoded(input.reactions, 'Reactions', (reactions) => reactions),
  };
}

export function monsterStatblock(input: MonsterStatblockInput): MonsterStatblock {
  const savingThrowBonuses = Object.fromEntries(abilities.map((ability) => [ability, finiteInteger(input.savingThrowBonuses[ability], `${ability} save bonus`)])) as Record<Ability, number>;
  const seenDamageTypes = new Set<string>();
  const damageResponses = (input.damageResponses ?? []).map((entry) => {
    const type = damageType(entry.type);
    if (seenDamageTypes.has(type)) throw new RangeError(`Duplicate damage response for ${type}.`);
    seenDamageTypes.add(type);
    return { type, response: entry.response };
  });
  const conditionImmunities = (input.conditionImmunities ?? []).map((condition) => nonEmptyText(condition, 'Condition immunity'));
  if (new Set(conditionImmunities).size !== conditionImmunities.length) throw new RangeError('Condition immunities must be unique.');
  const checkedArmorClass = armorClass(input.armorClass);
  if (checkedArmorClass < 1) throw new RangeError('Monster Armor Class must be positive.');
  const hitPointMaximum = positiveInteger(input.hitPointMaximum, 'Monster Hit Point maximum');
  const sourceDetails = validateSourceDetails(input.sourceDetails, input.speedFeet);
  if (sourceDetails.hitPointDice.kind === 'present') {
    const dice = sourceDetails.hitPointDice.value;
    const sourcedAverage = Math.floor(dice.count * (dice.sides + 1) / 2) + dice.modifier;
    if (sourcedAverage !== hitPointMaximum) throw new RangeError('Hit Point dice must produce the listed average.');
  }
  if (sourceDetails.abilities.kind === 'present') {
    for (const ability of abilities) {
      if (sourceDetails.abilities.value[ability].saveBonus !== savingThrowBonuses[ability]) {
        throw new RangeError(`Detailed ${ability} save bonus must match combat rules.`);
      }
    }
  }
  if (input.sourceDetails !== undefined) {
    const detailedDamageResponses = sourceDetails.damageResponses.kind === 'present' ? sourceDetails.damageResponses.value : [];
    if (JSON.stringify(detailedDamageResponses) !== JSON.stringify(damageResponses)) {
      throw new RangeError('Detailed damage responses must match combat rules.');
    }
    const detailedConditionImmunities = sourceDetails.conditionImmunities.kind === 'present' ? sourceDetails.conditionImmunities.value : [];
    if (JSON.stringify(detailedConditionImmunities) !== JSON.stringify(conditionImmunities)) {
      throw new RangeError('Detailed condition immunities must match combat rules.');
    }
  }
  if (sourceDetails.actions.kind === 'present') {
    const multiattack = sourceDetails.actions.value.find((action) => action.kind === 'multiattack');
    const detailedCount = multiattack?.count ?? 1;
    if (detailedCount !== (input.attacksPerAction ?? 1)) throw new RangeError('Multiattack count must match attacks per action.');
  }
  return {
    id: statblockId(input.id), name: nonEmptyText(input.name, 'Monster name'), armorClass: checkedArmorClass,
    hitPointMaximum, speed: feet(input.speedFeet), initiativeBonus: finiteInteger(input.initiativeBonus, 'Monster Initiative bonus'),
    savingThrowBonuses, attacksPerAction: positiveInteger(input.attacksPerAction ?? 1, 'Attacks per action'), reach: feet(input.reachFeet ?? 5),
    damageResponses, conditionImmunities, usesDeathSaves: input.usesDeathSaves ?? false,
    sourceDetails,
  };
}
