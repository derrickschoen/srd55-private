import { combatantsAreAllies } from '../../combat/allies';
import {
  effectiveCombatRules,
  planningSavingThrowFacts,
} from '../../combat/combat-rules';
import type { EncounterState } from '../../combat/encounter';
import { combatantSpace } from '../../combat/combat-rules';
import { minimumSpaceDistance } from '../../combat/creature-space';
import {
  savingThrowOutcomeWeights,
  type RollMode,
} from '../../combat/saving-throw-outcomes';
import {
  monsterSpellResourcePoolId,
  type MonsterBonusAction,
  type MonsterSpellcastingAction,
} from '../../combat/statblock';
import { spellDefinition } from '../../combat/spells/definitions';
import type { SpellDefinition, SpellOperation } from '../../combat/spells/types';
import type { EffectPayload } from '../../combat/effects';
import { difficultyClass, type CombatantId } from '../../combat/values';
import type { Ability } from '../../domain/enums';
import type { Brand } from '../../domain/ids';
import {
  engineTacticalAttackInput,
  monsterActions,
  monsterBonusActions,
  type EngineQueryPort,
} from '../engine-query-port';
import type {
  EngineOfferableOption,
  EngineBonusActionUse,
  EngineMainActionUse,
  ResolvedTurnMechanics,
} from '../turn-proposal';
import {
  evaluateTacticalAttack,
  type TacticalAttackInput,
  type TacticalDamageTerm,
} from '../../combat/tactical-evaluator';
import {
  exactRational,
  intelPolicyVersion,
  type ExactProbability,
  type ExactRational,
} from './contracts';

export const OPTION_OUTCOME_POLICY = intelPolicyVersion('option-outcome-v1');

export const CONTROL_HORIZON_ROUNDS = 3 as const;
export const FULL_HP_BAR_PRESSURE_CREDIT = exactRational(1, 1);
export const LIMITED_RESOURCE_CHARGE_PENALTY = exactRational(1, 2);
export const FULL_SPEED_APPROACH_CREDIT = exactRational(1, 4);

export type OptionOutcomeFamily = 'legacy' | 'hard_turn_denial' | 'modeled_effect';
export const OPTION_OUTCOME_FAMILIES = [
  'legacy',
  'hard_turn_denial',
  'modeled_effect',
] as const satisfies readonly OptionOutcomeFamily[];

export type ActionEquivalents = Brand<ExactRational, 'ActionEquivalents'>;
export type ControlHorizonRounds = Brand<ExactRational, 'ControlHorizonRounds'>;
export type SaveFailureProbability = Brand<ExactProbability, 'SaveFailureProbability'>;
export type ExpectedAffectedCount = Brand<ExactRational, 'ExpectedAffectedCount'>;
export type ExpectedDisabledTurns = Brand<ExactRational, 'ExpectedDisabledTurns'>;
export type ExpectedWakeActions = Brand<ExactRational, 'ExpectedWakeActions'>;
export type ConcentrationSurvivalProbability = Brand<ExactProbability, 'ConcentrationSurvivalProbability'>;
export type LegallyAffectedTarget = Brand<CombatantId, 'LegallyAffectedTarget'>;

export function actionEquivalents(value: ExactRational): ActionEquivalents {
  return value as ActionEquivalents;
}

export function controlHorizonRounds(rounds: number): ControlHorizonRounds {
  if (!Number.isSafeInteger(rounds) || rounds < 1 || rounds > CONTROL_HORIZON_ROUNDS) {
    throw new RangeError(`Control horizon must be from 1 through ${String(CONTROL_HORIZON_ROUNDS)} rounds.`);
  }
  return exactRational(rounds, 1) as ControlHorizonRounds;
}

export function saveFailureProbability(value: ExactProbability): SaveFailureProbability {
  return value as SaveFailureProbability;
}

export function expectedAffectedCount(value: ExactRational): ExpectedAffectedCount {
  if (value.numerator < 0) throw new RangeError('Expected affected count cannot be negative.');
  return value as ExpectedAffectedCount;
}

export function expectedDisabledTurns(value: ExactRational): ExpectedDisabledTurns {
  if (value.numerator < 0) throw new RangeError('Expected disabled turns cannot be negative.');
  return value as ExpectedDisabledTurns;
}

export function expectedWakeActions(value: ExactRational): ExpectedWakeActions {
  if (value.numerator < 0) throw new RangeError('Expected wake actions cannot be negative.');
  return value as ExpectedWakeActions;
}

export function concentrationSurvivalProbability(
  value: ExactProbability,
): ConcentrationSurvivalProbability {
  return value as ConcentrationSurvivalProbability;
}

export function legallyAffectedTarget(targetId: CombatantId): LegallyAffectedTarget {
  return targetId as LegallyAffectedTarget;
}

interface Fraction {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

const ZERO: Fraction = { numerator: 0n, denominator: 1n };
const ONE: Fraction = { numerator: 1n, denominator: 1n };

function bigintGcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

function fraction(numerator: bigint, denominator: bigint): Fraction {
  if (denominator === 0n) throw new RangeError('Fraction denominator cannot be zero.');
  if (numerator === 0n) return ZERO;
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = bigintGcd(numerator, denominator);
  return {
    numerator: sign * numerator / divisor,
    denominator: sign * denominator / divisor,
  };
}

function fromExact(value: ExactRational): Fraction {
  return fraction(BigInt(value.numerator), BigInt(value.denominator));
}

function add(left: Fraction, right: Fraction): Fraction {
  return fraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function subtract(left: Fraction, right: Fraction): Fraction {
  return add(left, fraction(-right.numerator, right.denominator));
}

function multiply(left: Fraction, right: Fraction): Fraction {
  return fraction(left.numerator * right.numerator, left.denominator * right.denominator);
}

function multiplyInteger(value: Fraction, scalar: number): Fraction {
  return fraction(value.numerator * BigInt(scalar), value.denominator);
}

function power(value: Fraction, exponent: number): Fraction {
  let result = ONE;
  for (let index = 0; index < exponent; index += 1) result = multiply(result, value);
  return result;
}

function toExact(value: Fraction): ExactRational {
  const numerator = Number(value.numerator);
  const denominator = Number(value.denominator);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new RangeError('Outcome rational exceeds the JSON-safe exact-rational boundary.');
  }
  return exactRational(numerator, denominator);
}

function asProbability(value: Fraction): ExactProbability {
  const exact = toExact(value);
  if (exact.numerator < 0 || exact.numerator > exact.denominator) {
    throw new RangeError('Outcome probability escaped [0,1].');
  }
  return exact as ExactProbability;
}

export type UnsupportedOutcomeReason =
  | 'saving_throw_action_outcome_unsupported'
  | 'world_object_outcome_unsupported'
  | 'spell_operation_unsupported'
  | 'spell_payload_unsupported'
  | 'save_dc_unrepresented'
  | 'hard_control_targets_unrepresented'
  | 'hard_control_duration_unrepresented'
  | 'repeat_save_control_unsupported'
  | 'wake_reachability_mixed_or_unknown'
  | 'control_damage_interaction_unsupported'
  | 'overlapping_control_unsupported'
  | 'attack_context_unresolved'
  | 'attack_probability_unresolved'
  | 'attack_damage_unresolved'
  | 'outcome_rational_overflow';

type OperationDisposition = 'attack_or_damage' | 'inspect_payload' | 'unsupported';

export const SPELL_OPERATION_OUTCOME_DISPOSITION = {
  composition: 'unsupported',
  shared_outcome: 'unsupported',
  reaction: 'unsupported',
  caster_choice: 'unsupported',
  random_branch: 'unsupported',
  target_branch: 'unsupported',
  reevaluated_branch: 'unsupported',
  condition_lifecycle: 'unsupported',
  roll_dice_modifier: 'unsupported',
  damage_dice_reduction: 'unsupported',
  roll_mode_modifier: 'unsupported',
  armor_class_modifier: 'unsupported',
  damage_response_modifier: 'unsupported',
  roll_defense_modifier: 'unsupported',
  targeted_defense_modifier: 'unsupported',
  heat_metal: 'unsupported',
  sustained_effect: 'unsupported',
  summon: 'unsupported',
  form_replacement: 'unsupported',
  damage_operation: 'attack_or_damage',
  armed_weapon_hit_rider: 'unsupported',
  persistent_area: 'unsupported',
  world_operations: 'unsupported',
  teleport: 'unsupported',
  forced_movement: 'unsupported',
  movement_mode: 'unsupported',
  movement_region: 'unsupported',
  speed_modification: 'unsupported',
  attack_damage: 'attack_or_damage',
  attack_then_save_damage: 'attack_or_damage',
  attack_damage_over_time: 'unsupported',
  hit_point_maximum_increase: 'unsupported',
  save_damage: 'attack_or_damage',
  save_multi_damage: 'attack_or_damage',
  save_damage_over_time: 'unsupported',
  save_damage_and_effect: 'unsupported',
  healing: 'unsupported',
  fixed_healing: 'unsupported',
  temporary_hit_points: 'unsupported',
  effect: 'inspect_payload',
  save_effect: 'inspect_payload',
  save_push: 'unsupported',
  remove_condition: 'unsupported',
  remove_condition_and_effect: 'unsupported',
  save_branch_effect: 'unsupported',
  attack_rays: 'attack_or_damage',
  attack_beams: 'attack_or_damage',
  summoned_weapon_attack: 'attack_or_damage',
  reaction_save_cancel: 'unsupported',
  dispel_magic: 'unsupported',
  revive: 'unsupported',
  remove_curse: 'unsupported',
  lifedrain_attack: 'attack_or_damage',
  magic_missiles: 'attack_or_damage',
  stabilize: 'unsupported',
  weapon_attack_augmentation: 'unsupported',
  utility: 'inspect_payload',
} as const satisfies Record<SpellOperation['kind'], OperationDisposition>;

type PayloadDisposition = 'hard_turn_denial' | 'unsupported';

export const EFFECT_PAYLOAD_OUTCOME_DISPOSITION = {
  sustained_effect: 'unsupported',
  summon_lifecycle: 'unsupported',
  ability_check_advantage: 'unsupported',
  ability_check_modifier: 'unsupported',
  action_surge: 'unsupported',
  alarm_ward: 'unsupported',
  appearance_illusion: 'unsupported',
  arcane_eye: 'unsupported',
  arcane_lock: 'unsupported',
  armor_class_modifier: 'unsupported',
  attack_roll_modifier: 'unsupported',
  attack_roll_mode_modifier: 'unsupported',
  attacks_against_target_roll_mode: 'unsupported',
  augury: 'unsupported',
  aura_of_life: 'unsupported',
  banishment: 'unsupported',
  base_armor_class: 'unsupported',
  beacon_of_hope: 'unsupported',
  bestow_curse: 'unsupported',
  black_tentacles_area: 'unsupported',
  blink: 'unsupported',
  bonus_action_attack_grant: 'unsupported',
  bonus_action_dash: 'unsupported',
  calm_emotions: 'unsupported',
  cannot_regain_hit_points: 'unsupported',
  charm_monster: 'unsupported',
  clairvoyance_sensor: 'unsupported',
  commanded_action: 'unsupported',
  communication_link: 'unsupported',
  condition: 'unsupported',
  condition_bundle: 'unsupported',
  condition_choice: 'unsupported',
  confusion_area: 'unsupported',
  conjure_minor_elementals: 'unsupported',
  conjured_hand: 'unsupported',
  consumable_healing_pool: 'unsupported',
  control_water: 'unsupported',
  corpse_preservation: 'unsupported',
  created_food_and_water: 'unsupported',
  creature_type_protection: 'unsupported',
  d20_test_modifier: 'unsupported',
  damage_reduction: 'unsupported',
  damage_resistances: 'unsupported',
  damage_rider: 'unsupported',
  darkvision: 'unsupported',
  daylight_area: 'unsupported',
  death_ward: 'unsupported',
  detect_thoughts: 'unsupported',
  detection_sense: 'unsupported',
  dimension_door: 'unsupported',
  divination: 'unsupported',
  energy_protection: 'unsupported',
  ensnaring_strike: 'unsupported',
  environmental_water: 'unsupported',
  exhaustion: 'unsupported',
  extra_attack_count_override: 'unsupported',
  faerie_fire: 'unsupported',
  healing_potion: 'unsupported',
  fabricate: 'unsupported',
  faithful_hound: 'unsupported',
  falling_protection: 'unsupported',
  fear: 'unsupported',
  fire_shield: 'unsupported',
  flaming_sphere: 'unsupported',
  flight: 'unsupported',
  floating_disk: 'unsupported',
  food_purification: 'unsupported',
  form_alteration: 'unsupported',
  freedom_of_movement: 'unsupported',
  gaseous_form: 'unsupported',
  glyph_of_warding: 'unsupported',
  granted_breath: 'unsupported',
  guardian_of_faith: 'unsupported',
  gust_of_wind_area: 'unsupported',
  hallucinatory_terrain: 'unsupported',
  haste: 'unsupported',
  hit_point_maximum_modifier: 'unsupported',
  hypnotic_pattern: 'hard_turn_denial',
  ice_storm_terrain: 'unsupported',
  illusion: 'unsupported',
  illusory_script: 'unsupported',
  image_illusion: 'unsupported',
  jump_movement: 'unsupported',
  language_comprehension: 'unsupported',
  levitation: 'unsupported',
  light_source: 'unsupported',
  locate_creature: 'unsupported',
  location_tracking: 'unsupported',
  magic_aura: 'unsupported',
  magic_circle: 'unsupported',
  magic_identification: 'unsupported',
  magic_missile_immunity: 'unsupported',
  magic_mouth: 'unsupported',
  magic_weapon: 'unsupported',
  major_image: 'unsupported',
  meld_into_stone: 'unsupported',
  minor_magic: 'unsupported',
  mirror_images: 'unsupported',
  movement_modifier: 'unsupported',
  nondetection: 'unsupported',
  object_location: 'unsupported',
  object_repair: 'unsupported',
  object_unlock: 'unsupported',
  obscured_area: 'unsupported',
  ongoing_damage: 'unsupported',
  opportunity_attacks_disabled: 'unsupported',
  phantasmal_killer: 'unsupported',
  phantom_steed: 'unsupported',
  poison_protection: 'unsupported',
  polymorph: 'unsupported',
  private_sanctum: 'unsupported',
  ray_enfeeblement: 'unsupported',
  recurring_damage_operation: 'unsupported',
  resilient_sphere: 'unsupported',
  rope_trick: 'unsupported',
  sanctuary: 'unsupported',
  saving_throw_modifier: 'unsupported',
  secret_chest: 'unsupported',
  see_invisibility: 'unsupported',
  sending: 'unsupported',
  shield_defense: 'unsupported',
  silence_area: 'unsupported',
  size_alteration: 'unsupported',
  skill_modifier: 'unsupported',
  roll_defense_modifier: 'unsupported',
  sleep_sequence: 'unsupported',
  sleet_storm_area: 'unsupported',
  slow: 'unsupported',
  speak_with_dead: 'unsupported',
  spider_climb: 'unsupported',
  spirit_guardians_area: 'unsupported',
  spiritual_weapon: 'unsupported',
  stinking_cloud_area: 'unsupported',
  stone_shape: 'unsupported',
  summoned_familiar: 'unsupported',
  summoned_undead: 'unsupported',
  teleport: 'unsupported',
  temporary_banishment: 'unsupported',
  tiny_hut: 'unsupported',
  trap_detection: 'unsupported',
  truth_zone: 'unsupported',
  universal_language: 'unsupported',
  unseen_servant: 'unsupported',
  vampiric_touch: 'unsupported',
  wall_of_fire: 'unsupported',
  warding_bond: 'unsupported',
  water_breathing: 'unsupported',
  water_walk: 'unsupported',
  web_area: 'unsupported',
  condition_suppression: 'unsupported',
  indifferent_toward_monster_side: 'unsupported',
} as const satisfies Record<EffectPayload['kind'], PayloadDisposition>;

export type WakeEligibility =
  | { readonly kind: 'outside_effect'; readonly targetId: CombatantId }
  | { readonly kind: 'saved_initially'; readonly targetId: LegallyAffectedTarget }
  | { readonly kind: 'released_earlier'; readonly targetId: LegallyAffectedTarget }
  | { readonly kind: 'currently_controlled'; readonly targetId: LegallyAffectedTarget };

export type WakeReachability = 'all_reachable' | 'none_reachable' | 'mixed_or_unknown';

export interface WakeRoundTrace {
  readonly round: number;
  readonly eligibility: {
    readonly outsideEffect: number;
    readonly savedInitially: number;
    readonly releasedEarlier: number;
    readonly currentlyControlled: number;
  };
  readonly wakeActions: number;
  readonly disabledTurns: number;
  readonly controlledNextRound: number;
}

export function wakeControlTrace(
  initiallyControlled: number,
  affectedCount: number,
  externalWakeCapable: number,
  horizon: number,
): readonly WakeRoundTrace[] {
  const inputs = [initiallyControlled, affectedCount, externalWakeCapable, horizon];
  if (inputs.some((value) => !Number.isSafeInteger(value) || value < 0) || initiallyControlled > affectedCount) {
    throw new RangeError('Wake-control trace inputs must be nonnegative integers within the affected count.');
  }
  const savedInitially = affectedCount - initiallyControlled;
  let controlled = initiallyControlled;
  let releasedEarlier = 0;
  const rounds: WakeRoundTrace[] = [];
  for (let round = 1; round <= horizon; round += 1) {
    const wakeCapable = externalWakeCapable + savedInitially + releasedEarlier;
    const wakeActions = Math.min(controlled, wakeCapable);
    const disabledTurns = controlled - wakeActions;
    const controlledNextRound = controlled - wakeActions;
    rounds.push({
      round,
      eligibility: {
        outsideEffect: externalWakeCapable,
        savedInitially,
        releasedEarlier,
        currentlyControlled: controlled,
      },
      wakeActions,
      disabledTurns,
      controlledNextRound,
    });
    releasedEarlier += wakeActions;
    controlled = controlledNextRound;
  }
  return rounds;
}

export interface HardControlProfile {
  readonly kind: 'hard_turn_denial';
  readonly targets: readonly LegallyAffectedTarget[];
  readonly save: {
    readonly ability: Ability;
    readonly rollMode: RollMode;
    readonly dc: number;
  };
  readonly durationRounds: number;
  readonly concentration: boolean;
  readonly endConditions: {
    readonly duration: true;
    readonly concentration: boolean;
    readonly damage: boolean;
    readonly allyWakeAction: boolean;
  };
}

export type DeclaredOptionOutcome =
  | { readonly kind: 'attack_sequence' }
  | { readonly kind: 'hard_control'; readonly profile: HardControlProfile }
  | { readonly kind: 'modeled_effect'; readonly spellIds: readonly string[] }
  | { readonly kind: 'movement' }
  | { readonly kind: 'known_no_effect' }
  | { readonly kind: 'unsupported'; readonly reason: UnsupportedOutcomeReason };

function hardControlProfileFromDefinition(
  definition: SpellDefinition,
  targetIds: readonly CombatantId[],
  saveDc: number | null,
): HardControlProfile | UnsupportedOutcomeReason {
  const operation = definition.operation;
  if (SPELL_OPERATION_OUTCOME_DISPOSITION[operation.kind] !== 'inspect_payload') {
    return 'spell_operation_unsupported';
  }
  if (operation.kind !== 'save_effect') return 'spell_operation_unsupported';
  if (EFFECT_PAYLOAD_OUTCOME_DISPOSITION[operation.effect.payload.kind] !== 'hard_turn_denial') {
    return 'spell_payload_unsupported';
  }
  const payload = operation.effect.payload;
  if (payload.kind !== 'hypnotic_pattern') return 'spell_payload_unsupported';
  if (saveDc === null) return 'save_dc_unrepresented';
  if (targetIds.length === 0) return 'hard_control_targets_unrepresented';
  if (operation.effect.durationRounds === null || operation.effect.durationRounds < 1) {
    return 'hard_control_duration_unrepresented';
  }
  if (operation.effect.repeatedSave !== undefined) return 'repeat_save_control_unsupported';
  return {
    kind: 'hard_turn_denial',
    targets: targetIds.map(legallyAffectedTarget),
    save: { ability: operation.ability, rollMode: operation.rollMode, dc: saveDc },
    durationRounds: operation.effect.durationRounds,
    concentration: operation.effect.concentration,
    endConditions: {
      duration: true,
      concentration: operation.effect.concentration,
      damage: payload.endsOnDamage,
      allyWakeAction: payload.wakeAction,
    },
  };
}

export function hardControlProfileForDefinition(
  definition: SpellDefinition,
  targetIds: readonly CombatantId[],
  saveDc: number | null,
): HardControlProfile | null {
  const result = hardControlProfileFromDefinition(definition, targetIds, saveDc);
  return typeof result === 'string' ? null : result;
}

export function isHardControlDefinition(definition: SpellDefinition): boolean {
  const operation = definition.operation;
  return operation.kind === 'save_effect' &&
    EFFECT_PAYLOAD_OUTCOME_DISPOSITION[operation.effect.payload.kind] === 'hard_turn_denial';
}

function sourceSpellcastingAction(
  state: EncounterState,
  actorId: CombatantId,
  use: Extract<EngineMainActionUse | EngineBonusActionUse, { readonly kind: 'cast_spell' }>,
): MonsterSpellcastingAction | Extract<MonsterBonusAction, { readonly kind: 'spell_choice' }> | null {
  const source = monsterActions(state, actorId).find(
    (action): action is MonsterSpellcastingAction =>
      action.kind === 'spellcasting' && action.id === use.sourceActionId,
  );
  return source ?? monsterBonusActions(state, actorId).find(
    (action): action is MonsterSpellcastingAction | Extract<MonsterBonusAction, { readonly kind: 'spell_choice' }> =>
      (action.kind === 'spellcasting' || action.kind === 'spell_choice') && action.id === use.sourceActionId,
  ) ?? null;
}

const B4_MODELED_EFFECT_SPELLS = new Set([
  'calm-emotions', 'command', 'cure-wounds', 'dispel-evil-and-good', 'entangle', 'lesser-restoration',
]);

function declaredSpellOutcome(
  state: EncounterState,
  option: EngineOfferableOption,
  use: Extract<EngineMainActionUse | EngineBonusActionUse, { readonly kind: 'cast_spell' }>,
): DeclaredOptionOutcome {
  const definition = spellDefinition(use.spellId);
  const source = sourceSpellcastingAction(state, option.actorId, use);
  if (definition === null || source === null) {
    return { kind: 'unsupported', reason: 'spell_operation_unsupported' };
  }
  if (B4_MODELED_EFFECT_SPELLS.has(String(use.spellId))) {
    return { kind: 'modeled_effect', spellIds: [use.spellId] };
  }
  const targetIds = use.targets.flatMap((selector) => selector.kind === 'combatant'
    ? [selector.combatantId]
    : []);
  const saveDc = source.kind === 'spellcasting' && source.saveDc.kind === 'present'
    ? source.saveDc.value : null;
  const profile = hardControlProfileFromDefinition(definition, targetIds, saveDc);
  return typeof profile === 'string'
    ? { kind: 'unsupported', reason: profile }
    : { kind: 'hard_control', profile };
}

function declaredUseOutcome(
  state: EncounterState,
  option: EngineOfferableOption,
  use: EngineMainActionUse | EngineBonusActionUse,
): DeclaredOptionOutcome {
  switch (use.kind) {
    case 'attack':
    case 'multiattack': return { kind: 'attack_sequence' };
    case 'cast_spell': return declaredSpellOutcome(state, option, use);
    case 'dash': return { kind: 'movement' };
    case 'dodge':
    case 'disengage':
    case 'end_turn':
    case 'hide': return { kind: 'known_no_effect' };
    case 'saving_throw': return { kind: 'unsupported', reason: 'saving_throw_action_outcome_unsupported' };
    case 'use_world_object': return { kind: 'unsupported', reason: 'world_object_outcome_unsupported' };
  }
}

export function classifyDeclaredOptionOutcome(
  state: EncounterState,
  option: EngineOfferableOption,
): DeclaredOptionOutcome {
  const declarations = option.actionSlots.map((slot) => declaredUseOutcome(state, option, slot.use));
  const unsupported = declarations.find(
    (declaration): declaration is Extract<DeclaredOptionOutcome, { readonly kind: 'unsupported' }> =>
      declaration.kind === 'unsupported',
  );
  if (unsupported !== undefined) return unsupported;

  const hardControl = declarations.filter(
    (declaration): declaration is Extract<DeclaredOptionOutcome, { readonly kind: 'hard_control' }> =>
      declaration.kind === 'hard_control',
  );
  if (hardControl.length > 1) {
    return { kind: 'unsupported', reason: 'overlapping_control_unsupported' };
  }
  if (hardControl.length === 1) {
    const control = hardControl[0];
    if (control === undefined) throw new Error('Hard-control declaration count is inconsistent.');
    if (declarations.some((declaration) => declaration.kind === 'attack_sequence')) {
      return { kind: 'unsupported', reason: 'control_damage_interaction_unsupported' };
    }
    return control;
  }

  if (declarations.some((declaration) => declaration.kind === 'attack_sequence')) {
    return { kind: 'attack_sequence' };
  }
  const modeledSpellIds = declarations.flatMap((declaration) =>
    declaration.kind === 'modeled_effect' ? declaration.spellIds : []);
  if (modeledSpellIds.length > 0) {
    return { kind: 'modeled_effect', spellIds: modeledSpellIds };
  }
  if (declarations.some((declaration) => declaration.kind === 'movement')) {
    return { kind: 'movement' };
  }
  return { kind: 'known_no_effect' };
}

export interface TacticalProgressLedger {
  readonly hostileKillActions: ActionEquivalents;
  readonly hostileHpPressure: ActionEquivalents;
  readonly hostileDisabledTurns: ActionEquivalents;
  readonly hostileWakeActions: ActionEquivalents;
  readonly friendlyDisabledTurns: ActionEquivalents;
  readonly friendlyWakeActions: ActionEquivalents;
  readonly positionalProgress: ActionEquivalents;
  readonly resourcePenalty: ActionEquivalents;
  readonly netActionEquivalents: ActionEquivalents;
}

export interface DamageDistributionEntry {
  readonly damage: number;
  readonly probability: ExactProbability;
}

export interface DamageOutcomeEvidence {
  readonly kind: 'damage';
  readonly targetId: CombatantId;
  readonly expectedDamage: ExactRational;
  readonly killProbability: ExactProbability;
  readonly distribution: readonly DamageDistributionEntry[];
}

export function combinedDamageActionEquivalents(
  state: EncounterState,
  evidence: readonly DamageOutcomeEvidence[],
): ActionEquivalents {
  const byTarget = new Map<CombatantId, readonly DamageOutcomeEvidence[]>();
  for (const entry of evidence) {
    byTarget.set(entry.targetId, [...(byTarget.get(entry.targetId) ?? []), entry]);
  }
  let total = ZERO;
  for (const [targetId, entries] of byTarget) {
    let distribution: ReadonlyMap<number, Fraction> = new Map([[0, ONE]]);
    for (const entry of entries) {
      distribution = convolveDistributions(distribution, new Map(entry.distribution.map((point) => [
        point.damage,
        fromExact(point.probability),
      ])));
    }
    const target = state.combatants.find((candidate) => candidate.profile.id === targetId);
    if (target === undefined) throw new Error(`Damage target ${targetId} is absent.`);
    const hitPoints = target.hitPoints < 1
      ? effectiveCombatRules(state, targetId).hitPointMaximum
      : target.hitPoints;
    let kill = ZERO;
    let pressure = ZERO;
    for (const [damage, probability] of distribution) {
      if (target.hitPoints > 0 && damage >= hitPoints) kill = add(kill, probability);
      else pressure = add(pressure, multiply(probability, fraction(BigInt(damage), BigInt(hitPoints))));
    }
    total = add(total, add(multiplyInteger(kill, CONTROL_HORIZON_ROUNDS), pressure));
  }
  return actionEquivalents(toExact(total));
}

export interface HardControlTargetEvidence {
  readonly targetId: LegallyAffectedTarget;
  readonly side: 'hostile' | 'friendly';
  readonly saveBonus: number;
  readonly rollMode: RollMode;
  readonly failProbability: SaveFailureProbability;
}

export interface HardControlOutcomeEvidence {
  readonly kind: 'hard_control';
  readonly profile: HardControlProfile;
  readonly targetOutcomes: readonly HardControlTargetEvidence[];
  readonly hostileInitialCountDistribution: readonly ExactProbability[];
  readonly friendlyInitialCountDistribution: readonly ExactProbability[];
  readonly expectedInitiallyAffected: ExpectedAffectedCount;
  readonly expectedDisabledTurns: ExpectedDisabledTurns;
  readonly expectedWakeActions: ExpectedWakeActions;
  readonly expectedControlBurden: ActionEquivalents;
  readonly horizon: ControlHorizonRounds;
  readonly wakeReachability: WakeReachability;
  readonly concentrationExposure: 'no_living_damage_threat' | 'exposed';
  readonly concentrationSaveDc: 10;
  readonly concentrationSaveBonus: number;
  readonly concentrationSurvival: ConcentrationSurvivalProbability;
  readonly wakeEligibility: readonly WakeEligibility[];
}

export type OptionOutcomeEvidence =
  | DamageOutcomeEvidence
  | HardControlOutcomeEvidence
  | { readonly kind: 'modeled_effect'; readonly spellIds: readonly string[] }
  | { readonly kind: 'movement'; readonly feet: number }
  | { readonly kind: 'known_no_effect' };

export interface ResolvedOptionOutcome {
  readonly status: 'resolved';
  readonly policy: typeof OPTION_OUTCOME_POLICY;
  readonly family: OptionOutcomeFamily;
  readonly evidence: OptionOutcomeEvidence;
  readonly ledger: TacticalProgressLedger;
}

export interface UnresolvedOptionOutcome {
  readonly status: 'unresolved';
  readonly policy: typeof OPTION_OUTCOME_POLICY;
  readonly reason: UnsupportedOutcomeReason;
}

export type OptionOutcomeEvaluation = ResolvedOptionOutcome | UnresolvedOptionOutcome;

function emptyLedger(input: Partial<Record<keyof TacticalProgressLedger, Fraction>> = {}): TacticalProgressLedger {
  const hostileKill = input.hostileKillActions ?? ZERO;
  const hostilePressure = input.hostileHpPressure ?? ZERO;
  const hostileDisabled = input.hostileDisabledTurns ?? ZERO;
  const hostileWake = input.hostileWakeActions ?? ZERO;
  const friendlyDisabled = input.friendlyDisabledTurns ?? ZERO;
  const friendlyWake = input.friendlyWakeActions ?? ZERO;
  const positional = input.positionalProgress ?? ZERO;
  const resource = input.resourcePenalty ?? ZERO;
  const net = input.netActionEquivalents ?? subtract(
    add(add(add(hostileKill, hostilePressure), hostileDisabled), add(hostileWake, positional)),
    add(add(friendlyDisabled, friendlyWake), resource),
  );
  return {
    hostileKillActions: actionEquivalents(toExact(hostileKill)),
    hostileHpPressure: actionEquivalents(toExact(hostilePressure)),
    hostileDisabledTurns: actionEquivalents(toExact(hostileDisabled)),
    hostileWakeActions: actionEquivalents(toExact(hostileWake)),
    friendlyDisabledTurns: actionEquivalents(toExact(friendlyDisabled)),
    friendlyWakeActions: actionEquivalents(toExact(friendlyWake)),
    positionalProgress: actionEquivalents(toExact(positional)),
    resourcePenalty: actionEquivalents(toExact(resource)),
    netActionEquivalents: actionEquivalents(toExact(net)),
  };
}

function d20Faces(mode: RollMode): readonly number[] {
  if (mode === 'normal') return Array.from({ length: 20 }, (_unused, index) => index + 1);
  return Array.from({ length: 20 }, (_unused, firstIndex) => firstIndex + 1).flatMap((first) =>
    Array.from({ length: 20 }, (_unused, secondIndex) => mode === 'advantage'
      ? Math.max(first, secondIndex + 1)
      : Math.min(first, secondIndex + 1)));
}

function modifierWeights(input: TacticalAttackInput): ReadonlyMap<number, bigint> {
  let distribution = new Map<number, bigint>([[0, 1n]]);
  for (const modifier of input.attackRollModifiers ?? []) {
    for (let die = 0; die < modifier.count; die += 1) {
      const next = new Map<number, bigint>();
      for (const [subtotal, weight] of distribution) {
        for (let face = 1; face <= modifier.sides; face += 1) {
          const total = subtotal + modifier.sign * face;
          next.set(total, (next.get(total) ?? 0n) + weight);
        }
      }
      distribution = next;
    }
  }
  return distribution;
}

function attackRollWeights(
  input: TacticalAttackInput,
  mode: RollMode,
): { readonly miss: Fraction; readonly hit: Fraction; readonly critical: Fraction } {
  const faces = d20Faces(mode);
  const modifiers = modifierWeights(input);
  const modifierTotal = [...modifiers.values()].reduce((sum, value) => sum + value, 0n);
  const denominator = BigInt(faces.length) * modifierTotal;
  let miss = 0n;
  let hit = 0n;
  let critical = 0n;
  for (const face of faces) {
    for (const [modifier, weight] of modifiers) {
      if (face === 1) miss += weight;
      else if (face >= input.criticalFloor) critical += weight;
      else if (input.targetArmorClass !== null && face + input.attackBonus + modifier >= input.targetArmorClass) hit += weight;
      else miss += weight;
    }
  }
  return {
    miss: fraction(miss, denominator),
    hit: fraction(hit, denominator),
    critical: fraction(critical, denominator),
  };
}

interface IntegerDistribution {
  readonly weights: ReadonlyMap<number, bigint>;
  readonly total: bigint;
}

function diceDistribution(terms: readonly TacticalDamageTerm[], critical: boolean): IntegerDistribution {
  let weights = new Map<number, bigint>([[0, 1n]]);
  let total = 1n;
  for (const term of terms) {
    let termWeights = new Map<number, bigint>([[0, 1n]]);
    const diceCount = term.dice.count * (critical ? 2 : 1);
    for (let die = 0; die < diceCount; die += 1) {
      const next = new Map<number, bigint>();
      for (const [subtotal, weight] of termWeights) {
        for (let face = 1; face <= term.dice.sides; face += 1) {
          next.set(subtotal + face, (next.get(subtotal + face) ?? 0n) + weight);
        }
      }
      termWeights = next;
      total *= BigInt(term.dice.sides);
    }
    const next = new Map<number, bigint>();
    for (const [prior, priorWeight] of weights) {
      for (const [termTotal, termWeight] of termWeights) {
        const damage = prior + Math.max(0, termTotal + term.dice.modifier);
        next.set(damage, (next.get(damage) ?? 0n) + priorWeight * termWeight);
      }
    }
    weights = next;
  }
  return { weights, total };
}

function attackDamageDistribution(input: TacticalAttackInput): ReadonlyMap<number, Fraction> | null {
  if (input.damageTerms === null || input.targetArmorClass === null) return null;
  const evaluation = evaluateTacticalAttack(input);
  if (evaluation.probabilities.status === 'unresolved' || evaluation.damage.status === 'unresolved') return null;
  const rolls = attackRollWeights(input, evaluation.rollMode.mode);
  const normal = diceDistribution(input.damageTerms, false);
  const critical = diceDistribution(input.damageTerms, true);
  const result = new Map<number, Fraction>([[0, rolls.miss]]);
  for (const [damage, weight] of normal.weights) {
    const probability = multiply(rolls.hit, fraction(weight, normal.total));
    result.set(damage, add(result.get(damage) ?? ZERO, probability));
  }
  for (const [damage, weight] of critical.weights) {
    const probability = multiply(rolls.critical, fraction(weight, critical.total));
    result.set(damage, add(result.get(damage) ?? ZERO, probability));
  }
  return result;
}

function convolveDistributions(
  left: ReadonlyMap<number, Fraction>,
  right: ReadonlyMap<number, Fraction>,
): ReadonlyMap<number, Fraction> {
  const result = new Map<number, Fraction>();
  for (const [leftValue, leftProbability] of left) {
    for (const [rightValue, rightProbability] of right) {
      const total = leftValue + rightValue;
      result.set(total, add(
        result.get(total) ?? ZERO,
        multiply(leftProbability, rightProbability),
      ));
    }
  }
  return result;
}

function movedState(
  state: EncounterState,
  mechanics: ResolvedTurnMechanics,
): EncounterState {
  return {
    ...state,
    tokens: state.tokens.map((token) => token.combatantId === mechanics.actorId
      ? { ...token, position: { ...mechanics.finalPosition } }
      : token),
  };
}

function attackOutcome(
  state: EncounterState,
  option: EngineOfferableOption,
  mechanics: ResolvedTurnMechanics,
): OptionOutcomeEvaluation {
  const attackUses = mechanics.actionSlots.filter((use) => use.kind === 'attack');
  const targetIds = [...new Set(attackUses.flatMap((use) => use.targetIds))];
  if (targetIds.length !== 1) {
    return { status: 'unresolved', policy: OPTION_OUTCOME_POLICY, reason: 'attack_context_unresolved' };
  }
  const targetId = targetIds[0];
  if (targetId === undefined) {
    return { status: 'unresolved', policy: OPTION_OUTCOME_POLICY, reason: 'attack_context_unresolved' };
  }
  const afterMovement = movedState(state, mechanics);
  let distribution: ReadonlyMap<number, Fraction> = new Map([[0, ONE]]);
  for (const use of attackUses) {
    const input = engineTacticalAttackInput(afterMovement, option.actorId, targetId, use.actionId);
    if (input === null) {
      return { status: 'unresolved', policy: OPTION_OUTCOME_POLICY, reason: 'attack_context_unresolved' };
    }
    const attackDistribution = attackDamageDistribution(input);
    if (attackDistribution === null) {
      return { status: 'unresolved', policy: OPTION_OUTCOME_POLICY, reason: 'attack_damage_unresolved' };
    }
    distribution = convolveDistributions(distribution, attackDistribution);
  }
  const target = state.combatants.find((candidate) => candidate.profile.id === targetId);
  if (target === undefined) {
    return { status: 'unresolved', policy: OPTION_OUTCOME_POLICY, reason: 'attack_context_unresolved' };
  }
  const valuationHitPoints = target.hitPoints < 1
    ? effectiveCombatRules(state, targetId).hitPointMaximum
    : target.hitPoints;
  let expectedDamageValue = ZERO;
  let killProbability = ZERO;
  let nonlethalPressure = ZERO;
  for (const [damage, probability] of distribution) {
    expectedDamageValue = add(expectedDamageValue, multiplyInteger(probability, damage));
    if (target.hitPoints > 0 && damage >= valuationHitPoints) killProbability = add(killProbability, probability);
    else nonlethalPressure = add(
      nonlethalPressure,
      multiply(probability, fraction(BigInt(damage), BigInt(valuationHitPoints))),
    );
  }
  const killActions = multiplyInteger(killProbability, CONTROL_HORIZON_ROUNDS);
  const ledger = emptyLedger({
    hostileKillActions: killActions,
    hostileHpPressure: nonlethalPressure,
  });
  try {
    return {
      status: 'resolved',
      policy: OPTION_OUTCOME_POLICY,
      family: 'legacy',
      evidence: {
        kind: 'damage',
        targetId,
        expectedDamage: toExact(expectedDamageValue),
        killProbability: asProbability(killProbability),
        distribution: [...distribution]
          .sort(([left], [right]) => left - right)
          .map(([damage, probability]) => ({ damage, probability: asProbability(probability) })),
      },
      ledger,
    };
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { status: 'unresolved', policy: OPTION_OUTCOME_POLICY, reason: 'outcome_rational_overflow' };
  }
}

function poissonBinomial(probabilities: readonly Fraction[]): readonly Fraction[] {
  let coefficients: Fraction[] = [ONE];
  for (const probability of probabilities) {
    const next = Array.from({ length: coefficients.length + 1 }, () => ZERO);
    const success = subtract(ONE, probability);
    coefficients.forEach((coefficient, index) => {
      next[index] = add(next[index] ?? ZERO, multiply(coefficient, success));
      next[index + 1] = add(next[index + 1] ?? ZERO, multiply(coefficient, probability));
    });
    coefficients = next;
  }
  return coefficients;
}

interface BurdenResult {
  readonly wake: Fraction;
  readonly disabled: Fraction;
  readonly expectedInitial: Fraction;
}

function expectedControlBurden(
  distribution: readonly Fraction[],
  externalWakeCapable: number,
  horizon: number,
  kappa: Fraction,
): BurdenResult {
  const affectedCount = distribution.length - 1;
  let wake = ZERO;
  let disabled = ZERO;
  let expectedInitial = ZERO;
  distribution.forEach((initialProbability, initiallyControlled) => {
    expectedInitial = add(expectedInitial, multiplyInteger(initialProbability, initiallyControlled));
    for (const round of wakeControlTrace(initiallyControlled, affectedCount, externalWakeCapable, horizon)) {
      const discount = power(kappa, round.round - 1);
      wake = add(wake, multiply(multiplyInteger(initialProbability, round.wakeActions), discount));
      disabled = add(disabled, multiply(multiplyInteger(initialProbability, round.disabledTurns), discount));
    }
  });
  return { wake, disabled, expectedInitial };
}

function wakeReachability(
  state: EncounterState,
  affected: readonly CombatantId[],
): WakeReachability {
  if (affected.length === 0) return 'all_reachable';
  const sideAnchor = affected[0];
  if (sideAnchor === undefined) return 'all_reachable';
  const possibleWakers = state.combatants.filter((candidate) =>
    candidate.life === 'living' && combatantsAreAllies(state, sideAnchor, candidate.profile.id));
  const reachable = possibleWakers.map((waker) => {
    const origin = state.tokens.find((token) => token.combatantId === waker.profile.id)?.position;
    if (origin === undefined) return false;
    return affected.some((targetId) => {
      if (targetId === waker.profile.id) return false;
      const target = state.tokens.find((token) => token.combatantId === targetId)?.position;
      return target !== undefined && minimumSpaceDistance(
        combatantSpace(state, waker.profile.id),
        combatantSpace(state, targetId),
      ) <= effectiveCombatRules(state, waker.profile.id).speed;
    });
  });
  return reachable.every(Boolean)
    ? 'all_reachable'
    : reachable.every((value) => !value)
      ? 'none_reachable'
      : 'mixed_or_unknown';
}

function concentrationFacts(
  state: EncounterState,
  actorId: CombatantId,
  concentration: boolean,
): {
  readonly exposure: 'no_living_damage_threat' | 'exposed';
  readonly saveBonus: number;
  readonly survival: Fraction;
} {
  const save = planningSavingThrowFacts(state, actorId, 'constitution', 'normal', 'other');
  if (!concentration) return {
    exposure: 'no_living_damage_threat',
    saveBonus: save.bonus,
    survival: ONE,
  };
  const livingThreat = state.combatants.some((candidate) =>
    candidate.life === 'living' && !combatantsAreAllies(state, actorId, candidate.profile.id));
  if (!livingThreat) return {
    exposure: 'no_living_damage_threat',
    saveBonus: save.bonus,
    survival: ONE,
  };
  const weights = savingThrowOutcomeWeights({
    bonus: save.bonus,
    dc: difficultyClass(10),
    rollMode: save.rollMode,
  });
  const success = save.automaticFailure
    ? ZERO
    : fraction(BigInt(weights.success), BigInt(weights.total));
  const survival = subtract(ONE, multiply(fraction(1n, 2n), subtract(ONE, success)));
  return { exposure: 'exposed', saveBonus: save.bonus, survival };
}

function canonicalLimitedResourceSpends(
  state: EncounterState,
  option: EngineOfferableOption,
): number {
  const pools = new Set<string>();
  for (const slot of option.actionSlots) {
    const use = slot.use;
    if (use.kind !== 'cast_spell') continue;
    const source = sourceSpellcastingAction(state, option.actorId, use);
    const reference = source?.spells.find((spell) => spell.id === use.spellId);
    if (source === null || source === undefined || reference === undefined) continue;
    const poolId = monsterSpellResourcePoolId(source.id, reference);
    if (poolId !== null) pools.add(String(poolId));
  }
  return pools.size;
}

export function evaluateHardControlProfile(
  state: EncounterState,
  actorId: CombatantId,
  profile: HardControlProfile,
  limitedResourceSpends = 0,
): OptionOutcomeEvaluation {
  const targetOutcomes: HardControlTargetEvidence[] = profile.targets.flatMap((targetId) => {
    const target = state.combatants.find((candidate) => candidate.profile.id === targetId);
    if (target === undefined || target.life === 'dead') return [];
    const rules = effectiveCombatRules(state, targetId);
    const immune = rules.conditionImmunities.includes('Charmed') ||
      rules.conditionImmunities.includes('Incapacitated');
    const guaranteedFailureToSuccess = (target.legendary?.resistanceUsesRemaining ?? 0) > 0;
    const save = planningSavingThrowFacts(
      state,
      targetId,
      profile.save.ability,
      profile.save.rollMode,
      'spell_or_magical_effect',
    );
    const weights = savingThrowOutcomeWeights({
      bonus: save.bonus,
      dc: difficultyClass(profile.save.dc),
      rollMode: save.rollMode,
    });
    const probability = immune || guaranteedFailureToSuccess
      ? ZERO
      : save.automaticFailure
        ? ONE
        : fraction(BigInt(weights.failure), BigInt(weights.total));
    return [{
      targetId,
      side: combatantsAreAllies(state, actorId, targetId) ? 'friendly' as const : 'hostile' as const,
      saveBonus: save.bonus,
      rollMode: save.rollMode,
      failProbability: saveFailureProbability(asProbability(probability)),
    }];
  });
  if (targetOutcomes.length !== profile.targets.length) {
    return { status: 'unresolved', policy: OPTION_OUTCOME_POLICY, reason: 'hard_control_targets_unrepresented' };
  }
  const hostiles = targetOutcomes.filter((target) => target.side === 'hostile');
  const friendlies = targetOutcomes.filter((target) => target.side === 'friendly');
  const hostileIds = hostiles.map((target) => target.targetId);
  const friendlyIds = friendlies.map((target) => target.targetId);
  const hostileReachability = wakeReachability(state, hostileIds);
  const friendlyReachability = wakeReachability(state, friendlyIds);
  if (hostileReachability === 'mixed_or_unknown' || friendlyReachability === 'mixed_or_unknown') {
    return { status: 'unresolved', policy: OPTION_OUTCOME_POLICY, reason: 'wake_reachability_mixed_or_unknown' };
  }
  const concentration = concentrationFacts(state, actorId, profile.concentration);
  const horizon = Math.min(CONTROL_HORIZON_ROUNDS, profile.durationRounds);
  const hostileDistribution = poissonBinomial(hostiles.map((target) => fromExact(target.failProbability)));
  const friendlyDistribution = poissonBinomial(friendlies.map((target) => fromExact(target.failProbability)));
  const affectedSet = new Set(profile.targets);
  const externalCount = (sideIds: readonly CombatantId[]): number => {
    const anchor = sideIds[0];
    if (anchor === undefined) return 0;
    return state.combatants.filter((candidate) =>
      candidate.life === 'living' && !affectedSet.has(legallyAffectedTarget(candidate.profile.id)) &&
      combatantsAreAllies(state, anchor, candidate.profile.id)).length;
  };
  const hostileBurden = expectedControlBurden(
    hostileDistribution,
    externalCount(hostileIds),
    horizon,
    concentration.survival,
  );
  const friendlyBurden = expectedControlBurden(
    friendlyDistribution,
    externalCount(friendlyIds),
    horizon,
    concentration.survival,
  );
  const hostileTotal = add(hostileBurden.wake, hostileBurden.disabled);
  const friendlyTotal = add(friendlyBurden.wake, friendlyBurden.disabled);
  const resourcePenalty = multiplyInteger(fromExact(LIMITED_RESOURCE_CHARGE_PENALTY), limitedResourceSpends);
  const ledger = emptyLedger({
    hostileDisabledTurns: hostileBurden.disabled,
    hostileWakeActions: hostileBurden.wake,
    friendlyDisabledTurns: friendlyBurden.disabled,
    friendlyWakeActions: friendlyBurden.wake,
    resourcePenalty,
  });
  const wakeEligibility: WakeEligibility[] = profile.targets.flatMap((targetId) => [
    { kind: 'saved_initially' as const, targetId },
    { kind: 'released_earlier' as const, targetId },
    { kind: 'currently_controlled' as const, targetId },
  ]);
  for (const candidate of state.combatants) {
    if (candidate.life === 'living' && !affectedSet.has(legallyAffectedTarget(candidate.profile.id))) {
      wakeEligibility.push({ kind: 'outside_effect', targetId: candidate.profile.id });
    }
  }
  return {
    status: 'resolved',
    policy: OPTION_OUTCOME_POLICY,
    family: 'hard_turn_denial',
    evidence: {
      kind: 'hard_control',
      profile,
      targetOutcomes,
      hostileInitialCountDistribution: hostileDistribution.map(asProbability),
      friendlyInitialCountDistribution: friendlyDistribution.map(asProbability),
      expectedInitiallyAffected: expectedAffectedCount(toExact(hostileBurden.expectedInitial)),
      expectedDisabledTurns: expectedDisabledTurns(toExact(hostileBurden.disabled)),
      expectedWakeActions: expectedWakeActions(toExact(hostileBurden.wake)),
      expectedControlBurden: actionEquivalents(toExact(subtract(hostileTotal, friendlyTotal))),
      horizon: controlHorizonRounds(horizon),
      wakeReachability: hostileReachability,
      concentrationExposure: concentration.exposure,
      concentrationSaveDc: 10,
      concentrationSaveBonus: concentration.saveBonus,
      concentrationSurvival: concentrationSurvivalProbability(asProbability(concentration.survival)),
      wakeEligibility,
    },
    ledger,
  };
}

export function evaluateOptionOutcome(
  state: EncounterState,
  option: EngineOfferableOption,
  mechanics: ResolvedTurnMechanics,
  _queries: EngineQueryPort,
): OptionOutcomeEvaluation {
  const declaration = classifyDeclaredOptionOutcome(state, option);
  switch (declaration.kind) {
    case 'attack_sequence': return attackOutcome(state, option, mechanics);
    case 'hard_control': return evaluateHardControlProfile(
      state,
      option.actorId,
      declaration.profile,
      canonicalLimitedResourceSpends(state, option),
    );
    case 'movement': {
      const speed = effectiveCombatRules(state, option.actorId).speed;
      const credit = speed === 0
        ? ZERO
        : multiply(
            fromExact(FULL_SPEED_APPROACH_CREDIT),
            fraction(BigInt(Math.min(mechanics.movementCostFeet, speed)), BigInt(speed)),
          );
      return {
        status: 'resolved',
        policy: OPTION_OUTCOME_POLICY,
        family: 'legacy',
        evidence: { kind: 'movement', feet: mechanics.movementCostFeet },
        ledger: emptyLedger({ positionalProgress: credit }),
      };
    }
    case 'modeled_effect': return {
      status: 'resolved',
      policy: OPTION_OUTCOME_POLICY,
      family: 'modeled_effect',
      evidence: { kind: 'modeled_effect', spellIds: declaration.spellIds },
      ledger: emptyLedger(),
    };
    case 'known_no_effect': return {
      status: 'resolved',
      policy: OPTION_OUTCOME_POLICY,
      family: 'legacy',
      evidence: { kind: 'known_no_effect' },
      ledger: emptyLedger(),
    };
    case 'unsupported': return {
      status: 'unresolved',
      policy: OPTION_OUTCOME_POLICY,
      reason: declaration.reason,
    };
  }
}
