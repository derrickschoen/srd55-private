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
import type { ConditionName } from './conditions';
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

export type ChallengeRating = '1/8' | '1/4' | '1/2' | 1 | 2 | 3 | 4 | 5 | 6;
export type MovementKind = 'walk' | 'burrow' | 'climb' | 'fly' | 'swim';
export type SenseKind = 'blindsight' | 'darkvision' | 'tremorsense' | 'truesight';
export type CombatSense =
  | { readonly kind: 'normal_sight' }
  | {
      readonly kind: 'blindsight' | 'darkvision' | 'tremorsense' | 'truesight';
      readonly rangeFeet: number;
    };

export interface SourceSpan {
  readonly path: 'docs/srd/full/srd-5.2.1.txt';
  readonly lineStart: number;
  readonly lineEnd: number;
}

export type MonsterAttributionKey = 'srd-5.1-cc-by-4.0' | 'a5esrd-cc-by-4.0';

export type MonsterProvenance =
  | { readonly kind: 'srd_5_2_1_decoded'; readonly source: readonly SourceSpan[] }
  | {
      readonly kind: 'adapted_cc_by';
      readonly sourceId: 'srd-5.1' | 'a5esrd';
      readonly locator: string;
      readonly attributionKey: MonsterAttributionKey;
      readonly modifications: string;
    }
  | {
      readonly kind: 'original_homebrew';
      readonly comparableAnchors: readonly {
        readonly name: string;
        readonly source: SourceSpan;
        readonly armorClass: number;
        readonly hitPoints: number;
        readonly computedDpr: number;
        readonly allowedArmorClass: readonly [minimum: number, maximum: number];
        readonly allowedHitPoints: readonly [minimum: number, maximum: number];
        readonly allowedDpr: readonly [minimum: number, maximum: number];
      }[];
      readonly designNote: string;
    }
  | { readonly kind: 'external_import'; readonly sourceId: string };

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
  | { readonly kind: 'choice'; readonly count: number; readonly qualifier: string; readonly canSpeak: boolean }
  | { readonly kind: 'telepathy'; readonly rangeFeet: number };

export interface MonsterClassification {
  readonly sizes: readonly CreatureSize[];
  readonly type: CreatureType;
  readonly subtype: string | null;
  readonly alignment: string;
}

export interface MonsterChallenge {
  readonly rating: ChallengeRating | 'none';
  readonly experiencePoints: 0 | 25 | 50 | 100 | 200 | 450 | 700 | 1_100 | 1_800 | 2_300;
  readonly proficiencyBonus: 2 | 3 | 'caster';
}

export type MonsterDamageTrigger =
  | { readonly kind: 'always' }
  | { readonly kind: 'attack_roll_advantage' }
  | { readonly kind: 'replaces_base_when_target_bloodied' }
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
    readonly kind: 'target_grappled_by_attacker' | 'target_not_full_hit_points';
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
  | 'until_end_of_monster_next_turn'
  | 'until_end_of_target_next_turn'
  | 'until_start_of_monster_next_turn';

export type MonsterOnHitEffect =
  | {
    readonly kind: 'condition';
    /** Reuses the spell engine's closed condition vocabulary, including Blinded. */
    readonly condition: Exclude<ConditionName, 'Exhaustion'>;
    readonly trigger: MonsterDamageTrigger;
    readonly target: MonsterEffectTarget;
    readonly savingThrow: MonsterSavingThrow | null;
    readonly escapeDc: number | null;
    readonly duration: MonsterEffectDuration | null;
  }
  | {
    /** A1: the spell engine's ongoing-damage tick, owned by a named condition lifecycle. */
    readonly kind: 'condition_bound_ongoing_damage';
    readonly boundCondition: Extract<ConditionName, 'Grappled' | 'Restrained'>;
    readonly damage: MonsterDamageTerm;
    readonly event: { readonly kind: 'event_trigger'; readonly hook: 'target_turn_start'; readonly frequency: 'once_per_turn' };
    readonly endsWhen: { readonly kind: 'condition_ends'; readonly condition: Extract<ConditionName, 'Grappled' | 'Restrained'> };
  }
  | { readonly kind: 'hit_point_maximum_reduction'; readonly amount: 'damage_taken' }
  | { readonly kind: 'speed_reduction'; readonly feet: 0; readonly duration: 'until_start_of_monster_next_turn' }
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
  readonly success: { readonly kind: 'none' } | { readonly kind: 'half_damage' };
}

export interface MonsterSpellReference {
  readonly id: string;
  readonly availability: 'at_will' | '1_per_day' | '3_per_day' | 'shared_3_per_day';
  readonly manifestStatus: SpellManifestStatus | 'not_in_manifest';
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

/** SRD legendary window, one-at-a-time use, and refresh: docs/srd/full/srd-5.2.1.txt:16703-16716. */
export type MonsterLegendaryAction =
  | {
      readonly kind: 'move_and_attack';
      readonly id: string;
      readonly name: string;
      readonly cost: number;
      readonly movement: 'half_speed' | 'speed';
      readonly avoidsOpportunityAttacks: boolean;
      readonly attackId: string;
    }
  | {
      readonly kind: 'temporary_defense';
      readonly id: string;
      readonly name: string;
      readonly cost: number;
      readonly target: 'self_or_visible_creature';
      readonly rangeFeet: number;
      readonly temporaryHitPoints: MonsterDice;
      readonly temporaryHitPointsAverage: number;
      readonly armorClassBonus: number;
      readonly expiresAt: 'end_of_monster_next_turn';
    };

export interface MonsterLegendaryActions {
  readonly maximumUses: number;
  readonly actions: readonly MonsterLegendaryAction[];
  readonly refresh: 'start_of_each_turn';
  readonly window: 'after_another_creature_turn';
}

export interface MonsterLegendaryResistance {
  readonly maximumUses: number;
  readonly recharge: 'day';
  readonly conversion: 'failed_save_to_success';
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
  | { readonly kind: 'sunlight_sensitivity'; readonly disadvantageOn: readonly ['ability_checks', 'attack_rolls'] }
  | { readonly kind: 'amphibious' }
  | { readonly kind: 'hold_breath'; readonly minutes: number }
  | { readonly kind: 'water_breathing'; readonly onlyUnderwater: true }
  | { readonly kind: 'spider_climb' }
  | { readonly kind: 'web_walker' }
  /** SRD 5.1: docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23501-23503. */
  | { readonly kind: 'web_sense' }
  /** SRD 5.1: docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23547-23550. */
  | { readonly kind: 'keen_sight' }
  /** SRD 5.2.1: docs/srd/full/srd-5.2.1.txt:23236-23237. */
  | { readonly kind: 'flyby' }
  | { readonly kind: 'magic_resistance'; readonly advantageOn: 'spells_and_magical_effects' }
  | { readonly kind: 'life_bond'; readonly rangeFeet: 5; readonly spellMinimumLevel: 1 };

export type MonsterBonusAction =
  | { readonly kind: 'nimble_escape'; readonly actions: readonly ['Disengage', 'Hide'] }
  | { readonly kind: 'cunning_action'; readonly actions: readonly ['Dash', 'Disengage', 'Hide'] }
  | { readonly kind: 'teleport'; readonly distanceFeet: number; readonly includesRider: true }
  | { readonly kind: 'healing'; readonly rangeFeet: number; readonly average: number; readonly dice: MonsterDice }
  | {
      readonly kind: 'spell_choice';
      readonly id: string;
      readonly name: string;
      readonly uses: number;
      readonly recharge: 'day';
      readonly ability: Ability;
      readonly spells: readonly MonsterSpellReference[];
    }
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
  readonly hitPointDice: MonsterDice | DecodedField<MonsterDice>;
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
  readonly legendaryActions?: DecodedField<MonsterLegendaryActions>;
  readonly legendaryResistance?: DecodedField<MonsterLegendaryResistance>;
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
  readonly legendaryActions: DecodedField<MonsterLegendaryActions>;
  readonly legendaryResistance: DecodedField<MonsterLegendaryResistance>;
}

export interface MonsterStatblockInput {
  readonly id: string;
  readonly name: string;
  readonly armorClass: number;
  readonly hitPointMaximum: number;
  /** Summoned blocks can list Hit Dice while defining maximum HP by a separate spell-level formula. */
  readonly hitPointMaximumIsFormula?: true;
  readonly speedFeet: number;
  readonly initiativeBonus: number;
  readonly savingThrowBonuses: Readonly<Record<Ability, number>>;
  readonly attacksPerAction?: number;
  readonly reachFeet?: number;
  readonly damageResponses?: readonly { readonly type: string; readonly response: DamageResponse }[];
  readonly conditionImmunities?: readonly string[];
  readonly usesDeathSaves?: boolean;
  readonly senses?: readonly CombatSense[];
  readonly provenance?: MonsterProvenance;
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
  readonly senses: readonly CombatSense[];
  readonly provenance: MonsterProvenance;
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
  if (reference.manifestStatus === 'not_in_manifest') {
    if (row !== undefined) throw new RangeError(`Monster spell ${reference.id} is present in the spell manifest.`);
    return reference;
  }
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
    case 'condition_bound_ongoing_damage':
      validateDamageTerm(effect.damage, `${label} ongoing`);
      if (effect.endsWhen.condition !== effect.boundCondition) {
        throw new RangeError(`${label} ongoing damage must end with its bound condition.`);
      }
      return effect;
    case 'hit_point_maximum_reduction':
    case 'speed_reduction':
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
    case 'teleport':
      positiveInteger(action.distanceFeet, 'Teleport distance');
      return action;
    case 'healing':
      positiveInteger(action.rangeFeet, 'Healing range');
      nonNegativeInteger(action.average, 'Healing average');
      validateDice(action.dice, 'Healing');
      return action;
    case 'spell_choice':
      nonEmptyText(action.id, 'Spell-choice id');
      nonEmptyText(action.name, 'Spell-choice name');
      positiveInteger(action.uses, 'Spell-choice uses');
      action.spells.forEach(validateSpell);
      return action;
  }
}

function emptySourceDetails(): MonsterSourceDetails {
  return {
    source: absent(), classification: absent(), challenge: absent(), hitPointDice: absent(), movement: absent(), abilities: absent(),
    skills: absent(), gear: absent(), senses: absent(), passivePerception: absent(), languages: absent(), damageResponses: absent(),
    conditionImmunities: absent(), traits: absent(), actions: absent(), bonusActions: absent(), reactions: absent(),
    legendaryActions: absent(), legendaryResistance: absent(),
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
    '1/8': 25, '1/4': 50, '1/2': 100, 1: 200, 2: 450, 3: 700, 4: 1_100, 5: 1_800, 6: 2_300,
  };
  if (input.challenge.rating === 'none') {
    if (input.challenge.experiencePoints !== 0 || input.challenge.proficiencyBonus !== 'caster') {
      throw new RangeError('Unrated summoned monsters must use XP 0 and the caster proficiency bonus.');
    }
  } else if (input.challenge.experiencePoints !== experienceByChallenge[input.challenge.rating]) {
    throw new RangeError('Monster XP must match its Challenge Rating.');
  } else if (input.challenge.proficiencyBonus !== (typeof input.challenge.rating === 'number' && input.challenge.rating >= 5 ? 3 : 2)) {
    throw new RangeError('Monster proficiency bonus must match its Challenge Rating.');
  }
  const decodedHitPointDice = 'kind' in input.hitPointDice
    ? validateDecoded(input.hitPointDice, 'Hit Point dice', (dice) => validateDice(dice, 'Hit Point dice'))
    : present(validateDice(input.hitPointDice, 'Hit Point dice'));
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
  const legendaryActions = validateDecoded(
    input.legendaryActions ?? absent<MonsterLegendaryActions>('The bundled SRD statblock does not list Legendary Actions.'),
    'Legendary Actions',
    (legendary) => {
      positiveInteger(legendary.maximumUses, 'Legendary Action uses');
      if (legendary.actions.length === 0) throw new RangeError('Legendary Actions must list at least one action.');
      const legendaryIds = new Set<string>();
      for (const action of legendary.actions) {
        nonEmptyText(action.id, 'Legendary Action id');
        nonEmptyText(action.name, 'Legendary Action name');
        positiveInteger(action.cost, 'Legendary Action cost');
        if (action.cost > legendary.maximumUses) throw new RangeError('Legendary Action cost exceeds the use pool.');
        if (legendaryIds.has(action.id)) throw new RangeError('Legendary Action ids must be unique.');
        legendaryIds.add(action.id);
        if (action.kind === 'move_and_attack') {
          if (!actionIds.has(action.attackId)) throw new RangeError('Legendary Action references an unknown attack.');
        } else {
          positiveInteger(action.rangeFeet, 'Legendary Action range');
          validateDice(action.temporaryHitPoints, 'Legendary Action temporary Hit Points');
          nonNegativeInteger(action.temporaryHitPointsAverage, 'Legendary Action temporary Hit Point average');
          positiveInteger(action.armorClassBonus, 'Legendary Action Armor Class bonus');
        }
      }
      return legendary;
    },
  );
  const legendaryResistance = validateDecoded(
    input.legendaryResistance ?? absent<MonsterLegendaryResistance>('The bundled SRD statblock does not list Legendary Resistance.'),
    'Legendary Resistance',
    (resistance) => ({ ...resistance, maximumUses: positiveInteger(resistance.maximumUses, 'Legendary Resistance uses') }),
  );
  const decodedDamageResponses: MonsterSourceDetails['damageResponses'] = input.damageResponses.kind === 'absent'
    ? absent(nonEmptyText(input.damageResponses.note, 'Damage responses absence note'))
    : present(input.damageResponses.value.map((entry) => ({ type: damageType(entry.type), response: entry.response })));
  const decodedConditionImmunities: MonsterSourceDetails['conditionImmunities'] = input.conditionImmunities.kind === 'absent'
    ? absent(nonEmptyText(input.conditionImmunities.note, 'Condition immunities absence note'))
    : present(input.conditionImmunities.value.map(conditionType));
  return {
    source: present(input.source), classification: present(input.classification), challenge: present(input.challenge),
    hitPointDice: decodedHitPointDice, movement: present(input.movement), abilities: present(input.abilities),
    skills: validateDecoded(input.skills, 'Skills', (skills) => skills.map((skill) => ({ name: nonEmptyText(skill.name, 'Skill name'), bonus: finiteInteger(skill.bonus, `${skill.name} bonus`) }))),
    gear: validateDecoded(input.gear, 'Gear', (gear) => gear.map((item) => nonEmptyText(item, 'Gear item'))),
    senses: validateDecoded(input.senses, 'Senses', (senses) => senses.map((sense) => ({ ...sense, rangeFeet: positiveInteger(sense.rangeFeet, `${sense.kind} range`) }))),
    passivePerception: present(nonNegativeInteger(input.passivePerception, 'Passive Perception')),
    languages: validateDecoded(input.languages, 'Languages', (languages) => languages.map((language) => {
      switch (language.kind) {
        case 'named': return { ...language, name: nonEmptyText(language.name, 'Language') };
        case 'choice': return { ...language, count: positiveInteger(language.count, 'Language choice count'), qualifier: nonEmptyText(language.qualifier, 'Language choice qualifier') };
        case 'telepathy': return { ...language, rangeFeet: positiveInteger(language.rangeFeet, 'Telepathy range') };
      }
    })),
    damageResponses: decodedDamageResponses,
    conditionImmunities: decodedConditionImmunities,
    traits: validateDecoded(input.traits, 'Traits', (traits) => traits), actions: present(actions),
    bonusActions: validateDecoded(input.bonusActions, 'Bonus actions', (bonusActions) => bonusActions.map((action) => validateAction(action))),
    reactions: validateDecoded(input.reactions, 'Reactions', (reactions) => reactions),
    legendaryActions,
    legendaryResistance,
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
  const declaredSenses = input.senses ?? [
    { kind: 'normal_sight' as const },
    ...(sourceDetails.senses.kind === 'present'
      ? sourceDetails.senses.value.flatMap((sense): readonly CombatSense[] => {
          switch (sense.kind) {
            case 'blindsight':
            case 'darkvision':
            case 'tremorsense':
            case 'truesight': return [{ kind: sense.kind, rangeFeet: sense.rangeFeet }];
          }
        })
      : []),
  ];
  const senses = declaredSenses.map((sense): CombatSense => {
    switch (sense.kind) {
      case 'normal_sight': return sense;
      case 'blindsight':
      case 'darkvision':
      case 'tremorsense':
      case 'truesight': return { ...sense, rangeFeet: positiveInteger(sense.rangeFeet, `${sense.kind} range`) };
    }
  });
  if (new Set(senses.map(({ kind }) => kind)).size !== senses.length) {
    throw new RangeError('Combat senses must use unique kinds.');
  }
  if (sourceDetails.hitPointDice.kind === 'present' && input.hitPointMaximumIsFormula !== true) {
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
    damageResponses, conditionImmunities, usesDeathSaves: input.usesDeathSaves ?? false, senses,
    provenance: input.provenance ?? (sourceDetails.source.kind === 'present'
      ? { kind: 'srd_5_2_1_decoded', source: sourceDetails.source.value }
      : { kind: 'external_import', sourceId: 'authored-runtime' }),
    sourceDetails,
  };
}
