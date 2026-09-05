import { z } from 'zod';
import { ENGINE_OPTION_METRICS, SIMPLE_OVERRIDE_JUSTIFICATION_KINDS } from '../turn-proposal';
import { TACTICAL_EVALUATOR_POLICY } from '../../combat/tactical-evaluator';
import { PLAY_NAMES, SKILL_NAMES } from '../snippet-registry-runtime';
import { DM_INTEL_QUERY_POLICY, DM_TURN_INTEL_POLICY } from '../dm-tactical-intel';
import { ENGINE_FAILURE_MODES_POLICY } from '../engine-failure-modes';
import { ENGINE_INITIATIVE_PROJECTION_POLICY } from '../engine-state-capsule';
import { MOVEMENT_EVALUATOR_POLICY } from '../../combat/movement-evaluator';
import { MOVEMENT_OPTIONS_INTEL_POLICY } from '../intel/movement-options';
import {
  DOMINANCE_CORRECTION_POLICY,
  MATERIALITY_CONTEXT_POLICY,
  OPPORTUNITY_COST_POLICY,
} from '../intel/opportunity-cost';
import { TEAM_SCORER_POLICY } from '../intel/team-scorer';
import { OPTION_OUTCOME_POLICY } from '../intel/option-outcome';
import { ALERTING_POLICY } from '../../combat/alerting';
import { SEARCH_MEMORY_POLICY } from '../../combat/search-memory';
import type { McpToolDescriptor, SchemaViolation } from './handler';
import { rendererAttributionSchema } from '../renderer-profile';
import { KB_SUBJECTS } from '../knowledge-base-contract';
import { creatureSizes } from '../../domain/enums';

export const ENGINE_ACTOR_KNOWLEDGE_POLICY = 'actor-knowledge-v2-creature-space' as const;
export const ENGINE_LEGENDARY_WINDOWS_POLICY = 'legendary-windows-v2' as const;
export const ENGINE_REACTION_SPEND_HOLD_POLICY = 'reaction-spend-hold-v1' as const;
export const ENGINE_RECOVERY_CAPABILITY_POLICY = 'recovery-capability-v2' as const;
export const ENGINE_STATE_SUMMARY_POLICY = 'state-summary-v2-creature-space' as const;

const identifier = z.string().min(1).max(200).describe('Engine-owned stable identifier.');
const offerableOptionIdentifier = identifier.refine(
  (value) => !value.startsWith('human-option:'),
  'Human-only option ids cannot be submitted as engine proposals.',
);
const shortCode = z.string().min(1).max(100).describe('Stable machine-readable code.');
const summaryText = z.string().min(1).max(500).describe('Bounded human-readable summary.');
const stateRef = z.object({
  run_id: identifier,
  state_handle: z.string().min(20).max(300).describe('Opaque digest-bound state handle.'),
  expected_revision: z.number().int().min(1).describe('Exact immutable journal revision.'),
}).strict().describe('Revision- and digest-bound engine state reference.');

const targetSelector = z.union([
  z.object({ kind: z.literal('combatant'), combatant_id: identifier }).strict(),
  z.object({ kind: z.enum(['nearest_visible_enemy', 'lowest_hp_visible_enemy', 'most_injured_visible_ally', 'current_threat']) }).strict(),
  z.object({ kind: z.literal('enemy_threatening_ally'), ally_id: identifier }).strict(),
]).describe('Semantic engine-resolved target selector; coordinates are forbidden.');

const actionChoice = z.union([
  z.object({
    kind: z.literal('attack'), action_id: identifier, target: targetSelector,
    resource_policy: z.enum(['conserve', 'normal', 'spend_if_useful']).optional(),
  }).strict(),
  z.object({
    kind: z.literal('cast_spell'), spell_id: identifier, target: targetSelector.nullable(),
    slot_policy: z.enum(['lowest_legal', 'conserve', 'best_effect']).optional(),
  }).strict(),
  z.object({ kind: z.literal('use_action'), action_id: identifier, target: targetSelector.nullable() }).strict(),
  z.object({ kind: z.literal('dodge'), action_id: z.literal('dodge').optional() }).strict(),
  z.object({ kind: z.literal('disengage'), action_id: z.literal('disengage').optional() }).strict(),
  z.object({ kind: z.literal('dash'), action_id: z.literal('dash').optional() }).strict(),
  z.object({ kind: z.literal('end_turn'), action_id: z.literal('end_turn').optional() }).strict(),
]).describe('Declarative engine-named action choice.');

const movementPreference = z.object({
  willingness: z.enum(['none', 'only_if_required', 'for_clear_advantage', 'freely']),
  maximum_feet: z.number().int().min(0).multipleOf(5).optional(),
  opportunity_risk: z.enum(['avoid', 'accept_if_needed', 'accept']),
}).strict().describe('Movement policy without a cell, destination, or path.');

const engagement = z.object({
  stance: z.enum(['hold_position', 'close_to_melee', 'maintain_range', 'withdraw']),
  anchor: targetSelector.nullable().optional(),
}).strict().describe('Semantic engagement objective resolved by the engine.');

const decisionReason = z.string().min(1).max(240).refine((value) => value.trim().length > 0, 'Reason cannot be blank.')
  .describe('One short sentence explaining why this option was chosen.');
const roundRationale = z.string().min(1).max(600).refine((value) => value.trim().length > 0, 'Rationale cannot be blank.')
  .describe('Optional round-level rationale retained outside blinded judging packets.');
const overrideJustification = z.discriminatedUnion('kind', [
  z.object({
    kind: z.enum(SIMPLE_OVERRIDE_JUSTIFICATION_KINDS),
  }).strict(),
  z.object({
    kind: z.literal('engine_play'),
    token: z.string().min(1).max(200).optional(),
  }).strict(),
  z.object({
    kind: z.literal('missing_metric'),
    id: z.enum(ENGINE_OPTION_METRICS).optional(),
  }).strict(),
]).describe('Required for a dominated selection. engine_play requires a current token; missing_metric requires a typed metric id.');
const activationChoice = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('command_word'), value: z.enum(['approach', 'flee', 'grovel', 'halt', 'drop']) }).strict(),
  z.object({ kind: z.literal('unicorns_blessing_spell'), value: z.enum(['cure-wounds', 'lesser-restoration']) }).strict(),
  z.object({ kind: z.literal('dispel_evil_and_good_mode'), value: z.enum(['break_enchantment', 'dismissal']) }).strict(),
  z.object({
    kind: z.literal('calm_emotions_per_target'),
    selections: z.array(z.object({
      target_id: identifier,
      mode: z.enum(['suppress_charmed_frightened', 'indifferent_toward_monster_side']),
    }).strict()).min(1).max(50),
  }).strict(),
]);
const activationChoiceSlot = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('command_word'), values: z.tuple([
    z.literal('approach'), z.literal('flee'), z.literal('grovel'), z.literal('halt'), z.literal('drop'),
  ]) }).strict(),
  z.object({ kind: z.literal('unicorns_blessing_spell'), values: z.tuple([
    z.literal('cure-wounds'), z.literal('lesser-restoration'),
  ]) }).strict(),
  z.object({ kind: z.literal('dispel_evil_and_good_mode'), values: z.tuple([
    z.literal('break_enchantment'), z.literal('dismissal'),
  ]) }).strict(),
  z.object({
    kind: z.literal('calm_emotions_per_target'), target_ids: z.array(identifier).min(1).max(50),
    values: z.tuple([z.literal('suppress_charmed_frightened'), z.literal('indifferent_toward_monster_side')]),
  }).strict(),
]);
const turnProposal = z.object({
  actor_id: identifier.meta({ examples: ['monster-id'] }),
  expected_revision: z.number().int().min(0).meta({ examples: [42] }),
  primary_option_id: offerableOptionIdentifier.meta({ examples: ['option:42:primary'] }),
  fallback_option_id: offerableOptionIdentifier.nullable().meta({ examples: ['option:42:fallback'] }),
  reason: decisionReason.meta({ examples: ['Close with the most vulnerable visible enemy before it can recover.'] }),
  override_justification: overrideJustification.nullable().meta({ examples: [null] }),
  activation_choice: activationChoice.nullable().optional(),
}).strict().describe('Revision-bound selection of engine-generated composite option ids.');
const reactionGuidanceInstruction = z.enum([
  'take', 'decline', 'only_when_target_visible', 'only_when_legal_without_moving',
]);
const reactionTriggerGuidance = z.object({
  hit_by_attack: reactionGuidanceInstruction.optional(),
  damaged_by_creature: reactionGuidanceInstruction.optional(),
  taking_damage_of_type: reactionGuidanceInstruction.optional(),
  creature_casts_spell: reactionGuidanceInstruction.optional(),
  opportunity_attack: reactionGuidanceInstruction.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one reaction trigger must be covered.');
const reactionGuidance = z.object({
  side_wide: reactionTriggerGuidance.optional(),
  actors: z.array(z.object({ actor_id: identifier, triggers: reactionTriggerGuidance }).strict()).max(50).optional(),
}).strict().superRefine((value, context) => {
  if (value.side_wide === undefined && (value.actors === undefined || value.actors.length === 0)) {
    context.addIssue({ code: 'custom', message: 'Reaction guidance must declare side-wide or actor guidance.' });
  }
  const actors = value.actors?.map((entry) => entry.actor_id) ?? [];
  if (new Set(actors).size !== actors.length) {
    context.addIssue({ code: 'custom', path: ['actors'], message: 'Reaction guidance actor IDs must be unique.' });
  }
});
const page = z.object({ cursor: z.string().min(1).max(500).optional(), maximum_items: z.number().int().min(1).max(100).optional() }).strict();

const refusal = z.object({ code: shortCode, summary: summaryText }).strict();
const risk = z.object({
  kind: z.enum(['opportunity_window', 'hazard', 'resource_exposure', 'visibility_loss']),
  source_id: identifier.nullable(), severity: z.enum(['low', 'medium', 'high']),
}).strict();
const exactRationalValue = z.object({
  numerator: z.number().int().safe(), denominator: z.number().int().safe().positive(),
}).strict();
const omittedRiderSource = {
  sourceActionId: identifier,
  componentActionId: identifier,
};
const omittedRider = z.discriminatedUnion('kind', [
  z.object({
    ...omittedRiderSource,
    kind: z.literal('conditional_damage_trigger'),
    trigger: z.enum(['attack_roll_advantage', 'replaces_base_when_target_bloodied', 'charge']),
  }).strict(),
  z.object({
    ...omittedRiderSource,
    kind: z.literal('conditional_on_hit_effect'),
    effect: z.literal('condition'),
    trigger: z.literal('charge'),
  }).strict(),
  z.object({
    ...omittedRiderSource,
    kind: z.literal('attack_advantage_window'),
    window: z.literal('first_round_of_each_combat'),
  }).strict(),
  z.object({
    ...omittedRiderSource,
    kind: z.literal('delayed_zombie_creation'),
    targetKind: z.literal('Humanoid'),
    delayHours: z.literal(24),
  }).strict(),
  z.object({
    ...omittedRiderSource,
    kind: z.literal('other_explicitly_classified_secondary_effect'),
    classification: z.enum([
      'coupled_action_use', 'equipment_corrosion', 'conditional_damage_replacement',
      'grapple_escape_disadvantage', 'attachment',
    ]),
    relatedActionId: identifier.optional(),
  }).strict(),
]);
const expectation = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('damage'), resolvable: z.literal(true),
    outcome_probability: z.number().min(0).max(1).nullable(),
    critical_probability: z.number().min(0).max(1).nullable(),
    expected_value: z.number().finite(), expected_value_exact: exactRationalValue,
    kill_probability_exact: exactRationalValue, net_action_equivalents_exact: exactRationalValue,
    metric: z.literal('damage'), assumption_codes: z.array(shortCode).max(20),
    policy: z.literal(OPTION_OUTCOME_POLICY),
  }).strict(),
  z.object({
    kind: z.literal('hard_control'), resolvable: z.literal(true), metric: z.literal('control'),
    target_fail_probabilities: z.array(z.object({
      target_id: identifier, side: z.enum(['hostile', 'friendly']), exact: exactRationalValue,
      probability: z.number().min(0).max(1),
    }).strict()).max(50),
    initial_count_distribution: z.array(exactRationalValue).max(51),
    expected_initially_affected: z.number().nonnegative(), expected_initially_affected_exact: exactRationalValue,
    expected_disabled_turns: z.number().nonnegative(), expected_disabled_turns_exact: exactRationalValue,
    expected_wake_actions: z.number().nonnegative(), expected_wake_actions_exact: exactRationalValue,
    expected_control_burden: z.number().finite(), expected_control_burden_exact: exactRationalValue,
    resource_penalty: z.number().nonnegative(), resource_penalty_exact: exactRationalValue,
    net_action_equivalents: z.number().finite(), net_action_equivalents_exact: exactRationalValue,
    horizon_rounds: z.number().int().min(1).max(3), concentration_survival_exact: exactRationalValue,
    concentration_exposure: z.enum(['no_living_damage_threat', 'exposed']),
    assumption_codes: z.array(shortCode).max(20), policy: z.literal(OPTION_OUTCOME_POLICY),
  }).strict(),
  z.object({
    kind: z.literal('unresolved'), resolvable: z.literal(false), metric: z.literal('none'),
    reason: shortCode, assumption_codes: z.array(shortCode).max(20), policy: z.literal(OPTION_OUTCOME_POLICY),
  }).strict(),
  z.object({
    kind: z.enum(['movement', 'known_no_effect']), resolvable: z.literal(true), metric: z.literal('none'),
    assumption_codes: z.array(shortCode).max(20), policy: z.literal(OPTION_OUTCOME_POLICY),
  }).strict(),
  z.object({
    kind: z.literal('modeled_effect'), resolvable: z.literal(true), metric: z.literal('none'),
    spell_ids: z.array(identifier).min(1).max(20),
    assumption_codes: z.array(shortCode).max(20), policy: z.literal(OPTION_OUTCOME_POLICY),
  }).strict(),
]);
const tacticalOption = z.object({
  option_id: identifier, actor_id: identifier, revision: z.number().int().min(0), label: summaryText,
  action_slots: z.array(z.object({
    slot: z.enum(['main', 'bonus']), kind: shortCode, action_id: identifier,
    component_action_ids: z.array(identifier).max(20), spell_id: identifier.nullable(),
    target_ids: z.array(identifier).max(50), world_object_id: identifier.nullable(),
    components: z.array(z.object({
      kind: z.enum(['attack', 'saving_throw']), action_id: identifier,
      target_ids: z.array(identifier).max(50), omitted_riders: z.array(omittedRider).max(50),
    }).strict()).max(20),
    omitted_riders: z.array(omittedRider).max(100),
  }).strict()).min(1).max(20),
  action_id: identifier, kind: z.enum(['attack', 'cast_spell', 'use_action', 'dodge', 'disengage', 'dash', 'end_turn']),
  target_selectors: z.array(targetSelector).max(50), resource_cost_labels: z.array(identifier).max(20),
  omitted_riders: z.array(omittedRider).max(100),
  activation_choice: activationChoiceSlot.optional(),
  usable_now: z.boolean(), usable_after_movement: z.boolean(), minimum_movement_feet: z.number().int().min(0).nullable(),
  visibility: z.enum(['yes', 'no', 'conditional', 'unknown']), cover: z.enum(['none', 'half', 'three_quarters', 'total', 'unknown']),
  risks: z.array(risk).max(50), expectation: expectation.nullable(), refusals: z.array(refusal).max(20),
}).strict();
const actorStatus = z.object({
  life: z.enum(['living', 'dying', 'stable', 'dead']), hit_point_band: z.enum(['uninjured', 'injured', 'critical', 'unknown']),
  movement_feet: z.number().int().min(0), action_available: z.boolean(), bonus_action_available: z.boolean(), reaction_available: z.boolean(),
  effect_tags: z.array(identifier).max(100), pending_decision_ids: z.array(identifier).max(50),
}).strict();
const threat = z.object({
  source_id: identifier, kinds: z.array(z.enum(['melee', 'ranged', 'save', 'hazard', 'control', 'reaction'])).min(1).max(10),
  distance_band: z.enum(['engaged', 'near', 'far', 'unknown']), can_reach_now: z.enum(['yes', 'no', 'conditional', 'unknown']),
  visible: z.boolean(), note_codes: z.array(shortCode).max(20),
}).strict();
const recentChange = z.object({ revision: z.number().int().min(1), kind: shortCode, summary: summaryText, branch_status: z.enum(['active', 'void']) }).strict();
const tacticalSummary = z.object({
  room: z.number().int().min(1).nullable(), round: z.number().int().min(0), active_side: z.enum(['players', 'monsters', 'none']),
  living_allies: z.number().int().min(0), living_enemies: z.number().int().min(0), terrain_tags: z.array(shortCode).max(100),
}).strict();
const monsterTraitKind = z.enum([
  'pack_tactics', 'undead_fortitude', 'abduct', 'aura_of_authority',
  'bloodied_frenzy', 'bloodied_fury', 'incorporeal_movement', 'running_leap',
  'stench', 'sunlight_sensitivity', 'amphibious', 'hold_breath',
  'water_breathing', 'spider_climb', 'web_walker', 'web_sense', 'keen_sight',
  'flyby', 'magic_resistance', 'life_bond', 'air_form', 'earth_glide',
  'siege_monster', 'adhesive', 'amorphous', 'corrosive_form',
  'ethereal_sight', 'ephemeral', 'illumination',
]);
const featureSupportDisposition = z.union([
  z.object({ kind: z.literal('modeled') }).strict(),
  z.object({
    kind: z.literal('offered_with_omission'),
    reason: z.literal('secondary_effect_omitted'),
  }).strict(),
  z.object({
    kind: z.literal('human_only_unmodeled'),
    reason: z.enum([
      'zero_hit_point_trait_unmodeled', 'grapple_movement_unmodeled',
      'ally_aura_unmodeled', 'incorporeal_movement_unmodeled',
      'jump_movement_unmodeled', 'trait_save_aura_unmodeled',
      'vertical_movement_unmodeled', 'web_movement_unmodeled',
      'companion_life_bond_unmodeled', 'special_space_movement_unmodeled',
      'object_damage_trait_unmodeled', 'automatic_grapple_trait_unmodeled',
      'equipment_corrosion_trait_unmodeled', 'ethereal_plane_unmodeled',
      'equipment_restriction_unmodeled', 'emitted_light_unmodeled',
    ]),
  }).strict(),
  z.object({
    kind: z.literal('encounter_not_applicable'),
    reason: z.enum(['no_sunlight_state', 'no_underwater_state']),
  }).strict(),
]);
const monsterTraitSupportRow = z.object({
  feature: z.object({ kind: z.literal('trait'), trait: monsterTraitKind }).strict(),
  disposition: featureSupportDisposition,
}).strict();
const compactIntelRow = z.object({
  policy: z.literal(DM_TURN_INTEL_POLICY),
  actor_id: identifier,
  target_id: identifier,
  option_id: identifier.nullable(),
  action_id: identifier.nullable(),
  attacks: z.number().int().min(0).max(20),
  kind: z.enum(['offense', 'approach']),
  visibility: z.enum(['VISIBLE', 'HIDDEN', 'UNKNOWN']),
  cover: z.enum(['NONE', 'HALF', 'THREE_QUARTERS', 'TOTAL', 'UNKNOWN']),
  range: z.enum(['MELEE', 'NORMAL', 'LONG', 'OUT', 'UNRESOLVED']),
  distance_feet: z.number().int().min(0).nullable(),
  roll_mode: z.enum(['STRAIGHT', 'ADVANTAGE', 'DISADVANTAGE', 'MIXED', 'UNRESOLVED']),
  reason_codes: z.array(shortCode).max(50),
  p_hit: z.enum(['≈0', '≈1/4', '≈1/3', '≈1/2', '≈2/3', '≈3/4', '≈1']).nullable(),
  ev: z.number().int().nullable(),
  consequence_codes: z.array(shortCode).max(20),
  movement_need_feet: z.number().int().min(0).nullable(),
  omitted_riders: z.array(omittedRider).max(100),
  feature_support_flags: z.array(monsterTraitSupportRow).max(100),
}).strict();
const contextIntelRow = compactIntelRow
  .omit({ policy: true, actor_id: true, option_id: true, attacks: true, reason_codes: true, consequence_codes: true, omitted_riders: true, feature_support_flags: true })
  .extend({
    attacks: z.number().int().min(0).max(20).optional(),
    reason_codes: z.array(shortCode).max(50).optional(),
    consequence_codes: z.array(shortCode).max(20).optional(),
    omitted_riders: z.array(omittedRider).max(100).optional(),
    feature_support_flags: z.array(monsterTraitSupportRow).max(100).optional(),
  });
const movementSnapshot = z.object({
  range: z.enum(['MELEE', 'NORMAL', 'LONG', 'OUT', 'UNRESOLVED']),
  roll: z.enum(['STRAIGHT', 'ADVANTAGE', 'DISADVANTAGE', 'MIXED', 'UNRESOLVED']),
  ev: z.number().int().nullable(),
}).strict();
const movementIntelRow = z.object({
  policy: z.literal(MOVEMENT_OPTIONS_INTEL_POLICY),
  evaluator_policy: z.literal(MOVEMENT_EVALUATOR_POLICY),
  actor_id: identifier,
  target_id: identifier,
  option_id: identifier.nullable(),
  action_id: identifier,
  semantic: z.enum(['move_5_to_normal_range', 'move_within_speed_to_enable_attack', 'maintain_range', 'other_reposition', 'no_reposition']),
  move_feet: z.number().int().min(0).nullable(),
  before: movementSnapshot,
  after: movementSnapshot.nullable(),
  opportunity_risk: z.enum(['none', 'opportunity_attack', 'hazard', 'unresolved']),
  hazard_risk: z.enum(['none', 'opportunity_attack', 'hazard', 'unresolved']),
  attack_eta: z.string().min(1).max(200),
}).strict();
const contextMovementIntelRow = movementIntelRow.omit({
  policy: true,
  evaluator_policy: true,
  actor_id: true,
  option_id: true,
});
const opportunityCost = z.object({
  policy: z.literal(OPPORTUNITY_COST_POLICY),
  correction_policy: z.literal(DOMINANCE_CORRECTION_POLICY),
  dodge_option_id: identifier,
  engine_default_option_id: identifier,
  status: z.enum(['dominated', 'not_dominated', 'not_dominated_tradeoff', 'blocked_unresolved']),
  better_option_id: identifier.optional(),
  delta: z.string().min(1).max(1_000).optional(),
  reason_codes: z.array(shortCode).max(50).optional(),
}).strict();
const actorIntel = z.object({
  policy: z.literal(DM_TURN_INTEL_POLICY),
  zero_movement_offense_count: z.number().int().min(0),
  rows: z.array(contextIntelRow).max(3),
  movement: z.array(contextMovementIntelRow).max(3),
  opportunity_cost: opportunityCost.nullable(),
  salient_window: z.string().min(1).max(500).nullable(),
}).strict();
const failureModesManifest = z.object({
  policy: z.literal(ENGINE_FAILURE_MODES_POLICY),
  modes: z.array(z.string().min(1).max(500)).min(1).max(20),
  covered_blind_spot_classes: z.array(z.object({
    class: z.enum(['combat_membership_leash', 'stealth_search']),
    covered_by_policy: z.enum([ALERTING_POLICY, SEARCH_MEMORY_POLICY]),
  }).strict()).length(2),
}).strict();

const gridCell = z.object({
  column: z.number().int().min(0),
  row: z.number().int().min(0),
}).strict();
const actorKnowledgeTarget = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('perceived'), target_id: identifier, placement_status: z.literal('placed'),
    effective_size: z.enum(creatureSizes),
    placement_mode: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('normal'), actual: z.enum(creatureSizes) }).strict(),
      z.object({ kind: z.literal('squeezed'), actual: z.enum(creatureSizes), sizedFor: z.enum(creatureSizes) }).strict(),
    ]),
    footprint: z.array(gridCell).min(1).max(16),
    distance_feet: z.number().int().min(0),
  }).strict(),
  z.object({
    kind: z.literal('placement_pending'), target_id: identifier,
    placement_status: z.literal('placement_pending'), pending_reason: z.literal('legacy_size_required'),
  }).strict(),
  z.object({
    kind: z.literal('suspected'), target_id: identifier,
    last_seen: z.object({ status: z.literal('resolved'), lastSeenPosition: gridCell }).strict(),
  }).strict(),
  z.object({
    kind: z.literal('unknown'), target_id: identifier,
    last_seen: z.object({
      status: z.literal('unresolved'), reason: z.literal('last_seen_position_not_modeled'),
    }).strict(),
  }).strict(),
]);
const actorKnowledgeContext = z.object({
  policy: z.literal(ENGINE_ACTOR_KNOWLEDGE_POLICY),
  actors: z.array(z.object({
    actor_id: identifier,
    targets: z.array(actorKnowledgeTarget).max(100),
  }).strict()).max(50),
}).strict();
const reactionSpendHoldContext = z.object({
  policy: z.literal(ENGINE_REACTION_SPEND_HOLD_POLICY),
  windows: z.array(z.object({
    policy: z.literal(ENGINE_REACTION_SPEND_HOLD_POLICY),
    status: z.enum(['resolved', 'unresolved']),
    reason: shortCode.optional(),
    trigger_id: identifier,
    reaction_kind: z.literal('opportunity_attack'),
    spend: z.union([
      z.object({ status: z.literal('resolved'), expected_damage: z.number().finite().min(0) }).strict(),
      z.object({ status: z.literal('unresolved'), reason: shortCode }).strict(),
    ]),
    hold: z.object({
      immediate_value: z.literal(0),
      possible_opportunities: z.array(z.object({
        mover: identifier,
        source_turn: z.object({ combatant: identifier, round: z.number().int().min(0) }).strict(),
        certainty: z.literal('possible'),
        condition: z.literal('mover_voluntarily_leaves_reactor_reach'),
      }).strict()).max(100),
      unqualified_future_triggers: z.object({
        status: z.literal('unresolved'), reason: z.literal('future_movement_choice_unknown'),
      }).strict(),
    }).strict(),
  }).strict()).max(50),
}).strict();
const usePool = z.object({ remaining: z.number().int().min(0), maximum: z.number().int().min(0) }).strict();
const legendaryNextWindow = z.union([
  z.object({
    status: z.literal('resolved'), afterCombatant: identifier, round: z.number().int().min(0),
    source: z.enum(['pending_decision', 'timeline']),
  }).strict(),
  z.object({ status: z.literal('unresolved'), reason: shortCode }).strict(),
]);
const legendaryActor = z.union([
  z.object({
    status: z.literal('unresolved'), reason: shortCode, combatant: identifier, name: summaryText,
  }).strict(),
  z.object({
    status: z.literal('resolved'), combatant: identifier, name: summaryText,
    action_uses: usePool, resistance_uses: usePool, next_window: legendaryNextWindow,
    pending_window: z.object({
      decision_id: identifier, after_combatant: identifier, round: z.number().int().min(0),
      options: z.array(z.union([
        z.object({ id: identifier, label: summaryText, status: z.literal('unresolved'), reason: shortCode }).strict(),
        z.object({
          id: identifier, label: summaryText, status: z.literal('resolved'),
          kind: z.enum(['attack', 'temporary_defense', 'pass']),
          target: identifier.optional(), expected_damage: z.number().finite().min(0).nullable().optional(),
        }).strict(),
      ])).max(50),
    }).strict().nullable(),
  }).strict(),
]);
const legendaryWindowsContext = z.union([
  z.object({
    policy: z.literal(ENGINE_LEGENDARY_WINDOWS_POLICY), status: z.enum(['resolved', 'unresolved']),
    reason: shortCode.optional(), compact: z.array(z.string().min(1).max(200)).length(10),
    detail_level: z.literal('compact'),
  }).strict(),
  z.object({
    policy: z.literal(ENGINE_LEGENDARY_WINDOWS_POLICY), status: z.enum(['resolved', 'unresolved']),
    reason: shortCode.optional(), compact: z.array(z.string().min(1).max(200)).length(10),
    detail_level: z.literal('full'), actors: z.array(legendaryActor).max(50),
    resistance_spend_inputs: z.array(z.union([
      z.object({ status: z.literal('unresolved'), reason: shortCode }).strict(),
      z.object({
        status: z.literal('resolved'), decision_id: identifier, combatant: identifier,
        source: identifier, failed_ability: shortCode, save_dc: z.number().int(),
        effect_severity: z.object({
          damageExpected: z.number().finite().nullable(), imposedConditions: z.array(shortCode).max(50),
          forcedMovementFeet: z.number().int().min(0).nullable(), removesTurn: z.boolean(),
        }).strict(),
      }).strict(),
    ])).max(50),
  }).strict(),
]);
const recoveryCapabilitiesContext = z.object({
  policy: z.literal(ENGINE_RECOVERY_CAPABILITY_POLICY),
  targets: z.array(z.union([
    z.object({ target: identifier, status: z.literal('unresolved'), reason: shortCode }).strict(),
    z.object({
      target: identifier, status: z.literal('resolved'),
      boundary: z.object({
        round: z.number().int().min(0), combatant: identifier,
        boundary: z.enum(['start', 'after_start', 'end']),
      }).strict(),
      knowledge: z.literal('dm_omniscient_party_resources'),
      source: z.literal('encounter_state_and_loaded_party'),
      options: z.array(z.object({
        rescuer: identifier, spell_id: identifier, kind: z.enum(['healing', 'revival']),
        slot_level: z.number().int().min(1).max(9), casting_time: z.enum(['action', 'bonus_action']),
        turn_round: z.number().int().min(0), reach: z.enum(['in_range', 'movement_qualified']),
        movement_feet: z.number().int().min(0),
      }).strict()).max(100),
    }).strict(),
  ])).max(100),
}).strict();
const searchMemoryContext = z.object({
  policy: z.literal(SEARCH_MEMORY_POLICY),
  memories: z.array(z.object({
    observer: identifier, target: identifier, cause: z.enum(['hiding', 'invisibility', 'obscurement']),
    last_known_position: gridCell, lost_at_round: z.number().int().min(0),
    expires: z.object({ kind: z.literal('start_of_round'), round: z.number().int().min(0) }).strict(),
    suspicion: z.object({
      kind: z.literal('grid_radius'), center: gridCell, radius_feet: z.number().int().min(0),
      cells: z.array(gridCell).max(100_000),
    }).strict(),
    legal_escalations: z.array(z.union([
      z.object({ kind: z.literal('move_and_search'), citation: z.string().min(1).max(300) }).strict(),
      z.object({ kind: z.literal('ready_action'), citation: z.string().min(1).max(300) }).strict(),
      z.object({
        kind: z.literal('attack_suspected_square'), roll_mode: z.literal('disadvantage'),
        citation: z.string().min(1).max(300),
      }).strict(),
      z.object({ kind: z.literal('area_effect_over_region') }).strict(),
    ])).max(4),
  }).strict()).max(1_000),
}).strict();
const alertStateContext = z.object({
  policy: z.literal(ALERTING_POLICY), yelling_distance_feet: z.number().int().positive(),
  sound_propagation: z.object({ kind: z.literal('radial'), occlusion: z.literal('not_modeled') }).strict(),
  calls: z.array(z.object({
    caller: identifier, attacker: identifier, origin: gridCell, round: z.number().int().min(0),
  }).strict()).max(10_000),
  joined: z.array(z.object({
    combatant: identifier, called_by: identifier, round: z.number().int().min(0),
  }).strict()).max(1_000),
}).strict();
const turnRequest = z.union([
  z.object({
    kind: z.literal('round_plan'), request_id: identifier,
    phase: z.enum(['initial', 'correction']), correction_number: z.union([z.literal(0), z.literal(1)]),
    required_actor_ids: z.array(identifier).min(1).max(50),
  }).strict(),
  z.object({
    kind: z.literal('plan_adjustment'), request_id: identifier,
    phase: z.enum(['initial', 'correction']), correction_number: z.union([z.literal(0), z.literal(1)]),
    required_actor_ids: z.array(identifier).min(1).max(50),
    baseline_plan_hash: z.string().regex(/^[0-9a-f]{64}$/u),
    adjustment_budget: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  }).strict(),
]);
const currentPlanSummary = z.object({
  parent_plan_id: identifier,
  baseline_plan_hash: z.string().regex(/^[0-9a-f]{64}$/u),
  open_actor_proposals: z.array(z.object({
    actor_id: identifier,
    proposal_digest: z.string().regex(/^[0-9a-f]{64}$/u),
  }).strict()).min(1).max(50),
}).strict();
const materialityContext = z.object({
  policy: z.literal(MATERIALITY_CONTEXT_POLICY),
  reasons: z.array(z.object({
    code: shortCode,
    affected_actor_ids: z.array(identifier).max(100),
    summary: z.string().min(1).max(1_000),
  }).strict()).min(1).max(20),
}).strict();
const actorContext = z.object({ actor_id: identifier, status: actorStatus, options: z.array(tacticalOption).max(20), threats: z.array(threat).max(50), intel: actorIntel }).strict();
const intelSuppressedActorContext = z.object({
  actor_id: identifier,
  status: actorStatus,
  options: z.array(tacticalOption).max(20),
  threats: z.array(threat).max(50),
}).strict();
const advertisedPlay = z.object({
  name: z.enum(PLAY_NAMES),
  description: z.string().min(1).max(200),
  snippet_hash: z.string().regex(/^[0-9a-f]{64}$/u),
  play_token: z.string().regex(/^[0-9a-f]{64}$/u),
}).strict();
const advertisedSkill = z.object({
  name: z.enum(SKILL_NAMES),
  description: z.string().min(1).max(200),
  skill_hash: z.string().regex(/^[0-9a-f]{64}$/u),
}).strict();
const teamPlanMetric = z.enum([
  'lethality',
  'objective_progress',
  'resource_conservation',
  'dying_pc_removal',
  'wasted_turn',
]);
const exactRational = z.object({
  numerator: z.number().int().safe(),
  denominator: z.number().int().positive().safe(),
}).strict();
const dominanceCoordinate = z.object({
  exact: exactRational,
  objective: z.enum(['maximize', 'minimize']),
}).strict();
const teamPlanDominanceVector = z.object({
  lethality: dominanceCoordinate,
  objective_progress: dominanceCoordinate,
  resource_conservation: dominanceCoordinate,
  dying_pc_removal: dominanceCoordinate,
  wasted_turn: dominanceCoordinate,
}).strict();
const wastedTurnMarker = z.object({
  kind: z.literal('wasted_turn'),
  actor_id: identifier,
  option_id: identifier,
  reason: z.enum(['zero_feet_dash', 'no_effect_turn']),
}).strict();
const resolvedTeamPlanCandidate = z.object({
  candidate_id: identifier,
  label: summaryText,
  status: z.literal('resolved'),
  dominance_vector: teamPlanDominanceVector,
  markers: z.array(wastedTurnMarker).max(50),
}).strict();
const unresolvedTeamPlanCandidate = z.object({
  candidate_id: identifier,
  label: summaryText,
  status: z.literal('unresolved'),
  unresolved_metrics: z.array(teamPlanMetric).min(1).max(5),
  reason_codes: z.array(z.enum([
    'duplicate_actor',
    'option_not_offered',
    'option_illegal',
    'actor_absent',
    'mixed_team_sides',
    'declared_outcome_unresolved',
    'semantic_attack_target_unresolved',
    'attack_allocation_unresolved',
  ])).min(1).max(20),
}).strict();
const fullTeamPlanFrontier = z.object({
  policy: z.literal(TEAM_SCORER_POLICY),
  frontier_resolution: z.enum(['fully_resolved', 'contains_unresolved']),
  candidates: z.array(z.discriminatedUnion('status', [
    resolvedTeamPlanCandidate,
    unresolvedTeamPlanCandidate,
  ])).max(3),
  removed: z.array(z.object({
    candidate_id: identifier,
    dominated_by_candidate_id: identifier,
    better_metrics: z.array(teamPlanMetric).min(1).max(5),
    dominance_vector: teamPlanDominanceVector,
    markers: z.array(wastedTurnMarker).max(50),
  }).strict()).max(3),
}).strict();
const candidateSummaryTeamPlanFrontier = z.object({
  policy: z.literal(TEAM_SCORER_POLICY),
  frontier_resolution: z.enum(['fully_resolved', 'contains_unresolved']),
  detail_level: z.literal('candidate_summary'),
  candidates: z.array(z.discriminatedUnion('status', [
    z.object({
      candidate_id: identifier,
      label: summaryText,
      status: z.literal('resolved'),
      wasted_turn_count: z.number().int().min(0).max(50),
    }).strict(),
    z.object({
      candidate_id: identifier,
      label: summaryText,
      status: z.literal('unresolved'),
      unresolved_metrics: z.array(teamPlanMetric).min(1).max(5),
      reason_codes: z.array(z.enum([
        'duplicate_actor',
        'option_not_offered',
        'option_illegal',
        'actor_absent',
        'mixed_team_sides',
        'declared_outcome_unresolved',
        'semantic_attack_target_unresolved',
        'attack_allocation_unresolved',
      ])).min(1).max(20),
    }).strict(),
  ])).max(3),
  removed: z.array(z.object({
    candidate_id: identifier,
    dominated_by_candidate_id: identifier,
    better_metrics: z.array(teamPlanMetric).min(1).max(5),
    wasted_turn_count: z.number().int().min(0).max(50),
  }).strict()).max(3),
}).strict();
const summaryTeamPlanFrontier = z.object({
  policy: z.literal(TEAM_SCORER_POLICY),
  frontier_resolution: z.enum(['fully_resolved', 'contains_unresolved']),
  detail_level: z.literal('summary'),
  frontier_candidate_ids: z.array(identifier).max(3),
  removed_candidate_ids: z.array(identifier).max(3),
}).strict();
const omittedTeamPlanFrontier = z.object({
  policy: z.literal(TEAM_SCORER_POLICY),
  frontier_resolution: z.enum(['fully_resolved', 'contains_unresolved']),
  detail_level: z.literal('omitted'),
  frontier_candidate_count: z.number().int().min(0).max(3),
  removed_candidate_count: z.number().int().min(0).max(3),
  reason: z.literal('context_size_limit'),
}).strict();
const teamPlanFrontier = z.union([
  fullTeamPlanFrontier,
  candidateSummaryTeamPlanFrontier,
  summaryTeamPlanFrontier,
  omittedTeamPlanFrontier,
]);
const suggestedPlan = z.object({
  play_name: z.enum(PLAY_NAMES),
  snippet_hash: z.string().regex(/^[0-9a-f]{64}$/u),
  play_token: z.string().regex(/^[0-9a-f]{64}$/u),
  proposals: z.array(turnProposal).min(1).max(50),
  advisory: z.string().min(1).max(300),
}).strict();
const fullTurnContextOutput = z.object({
  granularity: z.literal('full'), context_trimmed: z.boolean(),
  state_ref: stateRef, request: turnRequest, summary: tacticalSummary, actors: z.array(actorContext).min(1).max(50),
  applicable_plays: z.array(advertisedPlay).max(3),
  applicable_skills: z.array(advertisedSkill).max(3),
  team_plan_frontier: teamPlanFrontier.nullable(),
  suggested_plan: suggestedPlan.optional(),
  current_plan: currentPlanSummary.optional(),
  materiality: materialityContext.nullable().optional(),
  known_failure_modes: failureModesManifest.optional(),
  actor_knowledge: actorKnowledgeContext,
  reaction_spend_hold: reactionSpendHoldContext,
  legendary_windows: legendaryWindowsContext,
  recovery_capabilities: recoveryCapabilitiesContext,
  search_memory: searchMemoryContext,
  alert_state: alertStateContext,
  recent_changes: z.array(recentChange).max(100), truncated: z.boolean(), next_cursor: z.string().max(500).nullable(),
}).strict();
const intelSuppressedTurnContextOutput = z.object({
  granularity: z.literal('full'), context_trimmed: z.boolean(),
  state_ref: stateRef, request: turnRequest, summary: tacticalSummary,
  actors: z.array(intelSuppressedActorContext).min(1).max(50),
  applicable_plays: z.array(advertisedPlay).max(3),
  applicable_skills: z.array(advertisedSkill).max(3),
  suggested_plan: suggestedPlan.optional(),
  current_plan: currentPlanSummary.optional(),
  recent_changes: z.array(recentChange).max(100), truncated: z.boolean(), next_cursor: z.string().max(500).nullable(),
}).strict();
const revisionDeltaOperation = z.union([
  z.object({ kind: z.literal('set'), path: z.array(z.string()).min(1).max(20), value: z.unknown() }).strict(),
  z.object({ kind: z.literal('delete'), path: z.array(z.string()).min(1).max(20) }).strict(),
]);
const turnDeltaOutput = z.object({
  granularity: z.literal('turn_delta'),
  anchor: z.union([
    z.object({
      base_revision: z.number().int().min(1), revision: z.number().int().min(1),
      base_context_hash: z.string().regex(/^[0-9a-f]{64}$/u),
      context_hash: z.string().regex(/^[0-9a-f]{64}$/u),
      state_ref: stateRef, request: turnRequest,
    }).strict(),
    z.object({
      base_revision: z.number().int().min(1), revision: z.number().int().min(1),
      base_context_hash: z.string().regex(/^[0-9a-f]{64}$/u),
      context_hash: z.string().regex(/^[0-9a-f]{64}$/u),
    }).strict(),
  ]),
  changes: z.array(revisionDeltaOperation).max(10_000),
  context_trimmed: z.boolean(),
  renderer_attribution: rendererAttributionSchema.optional(),
}).strict();
const profiledFullTurnContextOutput = z.object({
  granularity: z.literal('full'),
  context_trimmed: z.boolean(),
  state_ref: stateRef,
  request: turnRequest,
  actors: z.array(z.record(z.string(), z.unknown())).min(1).max(50),
  renderer_attribution: rendererAttributionSchema.optional(),
  truncated: z.boolean(),
  next_cursor: z.string().max(500).nullable(),
}).passthrough();
const proseTurnContextOutput = z.object({
  format: z.enum(['caveman_prose', 'regular_prose']),
  granularity: z.literal('full'),
  context_trimmed: z.boolean(),
  state_ref: stateRef,
  request: turnRequest,
  document: z.string().min(1).max(32 * 1024),
  renderer_attribution: rendererAttributionSchema.optional(),
  truncated: z.boolean(),
  next_cursor: z.null(),
}).strict();
const turnContextOutput = z.union([
  fullTurnContextOutput,
  intelSuppressedTurnContextOutput,
  profiledFullTurnContextOutput,
  proseTurnContextOutput,
  turnDeltaOutput,
]);
const proposeFromPlayOutput = z.object({
  state_ref: stateRef,
  play_name: z.enum(PLAY_NAMES),
  snippet_hash: z.string().regex(/^[0-9a-f]{64}$/u),
  play_token: z.string().regex(/^[0-9a-f]{64}$/u),
  proposals: z.array(turnProposal).min(1).max(50),
}).strict();
const loadSkillOutput = z.object({
  state_ref: stateRef,
  skill_name: z.enum(SKILL_NAMES),
  skill_hash: z.string().regex(/^[0-9a-f]{64}$/u),
  description: z.string().min(1).max(200),
  procedure: z.string().min(1).max(2_000),
  plays: z.array(advertisedPlay).max(3),
}).strict();

const placedCombatantSummary = z.object({
  combatant_id: identifier, name: identifier, side: z.enum(['player_character', 'monster']), status: actorStatus,
  placement_status: z.literal('placed'),
  effective_size: z.enum(creatureSizes),
  placement_mode: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('normal'), actual: z.enum(creatureSizes) }).strict(),
    z.object({ kind: z.literal('squeezed'), actual: z.enum(creatureSizes), sizedFor: z.enum(creatureSizes) }).strict(),
  ]),
  footprint: z.array(gridCell).min(1).max(16),
  options: z.array(tacticalOption).max(100), threats: z.array(threat).max(50),
}).strict();
const placementPendingCombatantSummary = z.object({
  combatant_id: identifier, name: identifier, side: z.enum(['player_character', 'monster']), status: actorStatus,
  placement_status: z.literal('placement_pending'),
  pending_reason: z.literal('legacy_size_required'),
  options: z.array(tacticalOption).length(0), threats: z.array(threat).length(0),
}).strict();
const combatantSummary = z.discriminatedUnion('placement_status', [
  placedCombatantSummary,
  placementPendingCombatantSummary,
]);
const stateSummaryBody = z.object({
  room: z.number().int().min(1).nullable(), round: z.number().int().min(0), active_side: z.enum(['players', 'monsters', 'none']),
  combatants: z.array(combatantSummary).max(100), terrain_tags: z.array(shortCode).max(100), history: z.array(recentChange).max(100),
}).strict();
const stateSummaryOutput = z.object({ state_ref: stateRef, policy: z.literal(ENGINE_STATE_SUMMARY_POLICY), granularity: z.enum(['turn_minimal', 'room_tactical', 'combatant_detail', 'journal_delta']), proof_token: z.string().regex(/^[0-9a-f]{64}$/u), summary: stateSummaryBody, truncated: z.boolean(), next_cursor: z.string().max(500).nullable() }).strict();
const optionsOutput = z.object({ state_ref: stateRef, actor_id: identifier, status: actorStatus, options: z.array(tacticalOption).max(100), truncated: z.boolean(), next_cursor: z.string().max(500).nullable() }).strict();

const pathOutput = z.object({
  state_ref: stateRef, feasible: z.boolean(), minimum_feet: z.number().int().min(0).nullable(), risks: z.array(risk).max(50),
  resulting_relation: summaryText.nullable(), refusals: z.array(refusal).max(20),
}).strict();
const pairQuery = z.object({
  query_id: z.string().min(1).max(100), actor_id: identifier, target: targetSelector, action_id: identifier.optional(),
  after_movement: movementPreference.optional(), engagement: engagement.optional(),
}).strict();
const reachFacts = z.object({ distance_band: z.enum(['engaged', 'near', 'far', 'unknown']), action_range_feet: z.number().int().min(0).nullable(), reachable_now: z.boolean(), reachable_after_movement: z.boolean(), minimum_movement_feet: z.number().int().min(0).nullable() }).strict();
const coverFacts = z.object({ tier: z.enum(['none', 'half', 'three_quarters', 'total', 'unknown']), source_ids: z.array(identifier).max(50) }).strict();
const visibilityFacts = z.object({ actor_can_perceive_target: z.boolean(), target_can_perceive_actor: z.boolean(), required_sense: z.enum(['normal_sight', 'darkvision', 'blindsight', 'truesight', 'unknown']), reason_codes: z.array(shortCode).max(20) }).strict();
function pairOutput(facts: z.ZodType<unknown>) {
  return z.object({ state_ref: stateRef, results: z.array(z.object({ query_id: z.string().min(1).max(100), status: z.enum(['yes', 'no', 'conditional', 'unknown']), facts, refusals: z.array(refusal).max(20) }).strict()).max(50) }).strict();
}
const metrics = z.object({ outcome_probability: z.number().min(0).max(1).nullable(), expected_damage: z.number().finite().nullable(), expected_healing: z.number().finite().nullable(), resource_cost: z.number().int().min(0).nullable(), distribution: z.array(z.object({ outcome: z.number().finite(), probability: z.number().min(0).max(1) }).strict()).max(100).nullable() }).strict();
const diceOutput = z.object({ state_ref: stateRef, results: z.array(z.object({ candidate_id: z.string().min(1).max(100), policy: z.literal(TACTICAL_EVALUATOR_POLICY), resolvable: z.boolean(), metrics, assumptions: z.array(shortCode).max(20), refusals: z.array(refusal).max(20) }).strict()).max(20) }).strict();
const tacticalIntelInitiative = z.union([
  z.object({
    policy: z.literal(ENGINE_INITIATIVE_PROJECTION_POLICY),
    order: z.array(identifier).max(100),
    upcoming: z.array(z.unknown()).max(500),
  }).strict(),
  z.object({
    policy: z.literal(ENGINE_INITIATIVE_PROJECTION_POLICY),
    pairs: z.array(z.object({
      actor_id: identifier,
      target_id: identifier,
      actor_before_target: z.boolean(),
    }).strict()).max(100),
  }).strict(),
]);
const tacticalIntelOutput = z.object({
  state_ref: stateRef,
  policy: z.literal(DM_INTEL_QUERY_POLICY),
  renderer_policy: z.literal(DM_TURN_INTEL_POLICY),
  evaluator_policy: z.literal(TACTICAL_EVALUATOR_POLICY),
  rows: z.array(compactIntelRow).max(20),
  unresolved_findings: z.array(z.object({
    actor_id: identifier,
    target_id: identifier,
    action_id: identifier.nullable(),
    reason_codes: z.array(shortCode).min(1).max(50),
  }).strict()).max(1_000),
  movement_policy: z.literal(MOVEMENT_OPTIONS_INTEL_POLICY),
  movement_rows: z.array(movementIntelRow).max(100),
  opportunity_policy: z.literal(OPPORTUNITY_COST_POLICY),
  correction_policy: z.literal(DOMINANCE_CORRECTION_POLICY),
  opportunity_costs: z.array(opportunityCost).max(50),
  initiative: tacticalIntelInitiative.nullable(),
  truncated: z.boolean(),
  next_cursor: z.string().max(500).nullable(),
}).strict();

const resolutionPreview = z.object({ actor_id: identifier, option_id: identifier, action_slot_count: z.number().int().min(1).max(20), movement_feet: z.number().int().min(0), omitted_riders: z.array(omittedRider).max(100), resolution_digest: z.string().min(64).max(128), summary: summaryText }).strict();
const correctionGuidance = z.union([
  z.object({ remaining_corrections: z.union([z.literal(0), z.literal(1)]), required_actor_ids: z.array(identifier).min(1).max(50), replace_whole_round: z.literal(true) }).strict(),
  z.object({ remaining_corrections: z.union([z.literal(0), z.literal(1)]), required_actor_ids: z.array(identifier).min(1).max(50), replace_whole_round: z.literal(false) }).strict(),
]);
const validateOutput = z.object({ state_ref: stateRef, valid: z.boolean(), selected_branch: z.enum(['primary', 'fallback', 'none']), resolution: resolutionPreview.nullable(), refusals: z.array(refusal).max(20), correction_guidance: correctionGuidance.nullable() }).strict();
const actorResolution = z.object({ actor_id: identifier, selected_branch: z.enum(['primary', 'fallback']), resolution_digest: z.string().min(64).max(128), summary: summaryText }).strict();
const actorRefusal = z.object({
  actor_id: identifier,
  codes: z.array(shortCode).min(1).max(20),
  summary: summaryText,
  attempt_rejections: z.array(z.object({
    attempt: z.enum(['primary', 'fallback']),
    declared_option_id: identifier.nullable(),
    rejection_reasons: z.array(summaryText).min(1).max(20),
  }).strict()).min(1).max(2),
}).strict();
const roundOutput = z.union([
  z.object({ status: z.literal('proposed'), round_proposal_id: identifier, state_ref: stateRef, actor_resolutions: z.array(actorResolution).min(1).max(50) }).strict(),
  z.object({ status: z.literal('rejected'), state_ref: stateRef, actor_refusals: z.array(actorRefusal).min(1).max(50), correction_guidance: correctionGuidance }).strict(),
]);
const singleOutput = z.union([
  z.object({ status: z.literal('proposed'), proposal_id: identifier, state_ref: stateRef, selected_branch: z.enum(['primary', 'fallback']), resolution_summary: resolutionPreview }).strict(),
  z.object({ status: z.literal('rejected'), state_ref: stateRef, refusals: z.array(refusal).min(1).max(20), correction_guidance: correctionGuidance.nullable() }).strict(),
]);
const narrationOutput = z.object({ status: z.literal('queued'), narration_id: identifier, state_ref: stateRef, warnings: z.array(summaryText).max(20) }).strict();
const adjudicationOutput = z.object({ status: z.literal('requested'), adjudication_request_id: identifier, state_ref: stateRef }).strict();

const refInput = { state_ref: stateRef };
const phaseProposalInput = z.object({ ...refInput, request_id: identifier, phase: z.enum(['initial', 'correction']), proposal: turnProposal }).strict();
const submitProposalInput = z.object({ ...refInput, request_id: identifier, phase: z.enum(['initial', 'correction']), idempotency_key: z.string().min(16).max(200), proposal: turnProposal, reaction_guidance: reactionGuidance.optional() }).strict();
const minimalSubmitRoundInput = z.object({ proposals: z.array(turnProposal).min(1).max(50), rationale: roundRationale.optional(), reaction_guidance: reactionGuidance.optional() }).strict();
const submitRoundInput = z.object({ ...refInput, request_id: identifier, phase: z.enum(['initial', 'correction']), idempotency_key: z.string().min(16).max(200), proposals: z.array(turnProposal).min(1).max(50), rationale: roundRationale.optional(), reaction_guidance: reactionGuidance.optional() }).strict();
const submissionTransportProposal = turnProposal.extend({ reason: z.string().max(240).optional() });
const minimalSubmitRoundTransportInput = minimalSubmitRoundInput.extend({
  proposals: z.array(submissionTransportProposal).min(1).max(50),
});
const submitRoundTransportInput = submitRoundInput.extend({
  proposals: z.array(submissionTransportProposal).min(1).max(50),
});
const submitPlanAdjustmentInput = z.object({
  ...refInput,
  request_id: identifier,
  phase: z.enum(['initial', 'correction']),
  idempotency_key: z.string().min(16).max(200),
  baseline_plan_hash: z.string().regex(/^[0-9a-f]{64}$/u),
  updates: z.array(turnProposal).max(2),
}).strict();
const adjustmentOutput = z.union([
  z.object({
    status: z.literal('proposed'),
    adjustment_proposal_id: identifier,
    state_ref: stateRef,
    actor_resolutions: z.array(actorResolution).max(2),
  }).strict(),
  z.object({
    status: z.literal('rejected'),
    staged_proposal_id: identifier.nullable(),
    state_ref: stateRef,
    staged_actor_resolutions: z.array(actorResolution).max(2),
    actor_refusals: z.array(actorRefusal).min(1).max(50),
    correction_guidance: correctionGuidance,
  }).strict(),
]);
const speculativeBranch = z.object({
  scenario_id: identifier,
  proposals: z.array(turnProposal).min(1).max(50),
}).strict();
const submitSpeculativeRoundPlanInput = z.object({
  ...refInput,
  request_id: identifier,
  target_room: z.number().int().min(1),
  target_monster_round: z.number().int().min(1),
  refresh_generation: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  branches: z.array(speculativeBranch).min(1).max(4),
  reaction_guidance: reactionGuidance.optional(),
  idempotency_key: z.string().min(16).max(200),
}).strict();
const speculativeRoundPlanOutput = z.object({
  status: z.literal('QUEUED-SPECULATIVE'),
  speculative_plan_id: identifier,
  state_ref: stateRef,
}).strict();

export interface EngineToolSpec { readonly descriptor: McpToolDescriptor; readonly input: z.ZodType<unknown>; readonly output: z.ZodType<unknown> }
export const ADVERTISE_MCP_OUTPUT_SCHEMAS: boolean = false;

function referencedDefinitionKeys(value: unknown, definitions: Readonly<Record<string, unknown>>): ReadonlySet<string> {
  const referenced = new Set<string>();
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (typeof candidate !== 'object' || candidate === null) return;
    const record = candidate as Readonly<Record<string, unknown>>;
    const reference = record['$ref'];
    if (typeof reference === 'string' && reference.startsWith('#/$defs/')) {
      const key = decodeURIComponent(reference.slice('#/$defs/'.length)).replaceAll('~1', '/').replaceAll('~0', '~');
      if (!referenced.has(key)) {
        referenced.add(key);
        visit(definitions[key]);
      }
    }
    for (const [key, nested] of Object.entries(record)) if (key !== '$defs') visit(nested);
  };
  visit(value);
  return referenced;
}

function jsonSchema(schema: z.ZodType<unknown>): Readonly<Record<string, unknown>> {
  const generated = z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input', reused: 'ref' });
  const generatedDefinitions = typeof generated['$defs'] === 'object' && generated['$defs'] !== null &&
    !Array.isArray(generated['$defs'])
    ? generated['$defs'] as Readonly<Record<string, unknown>>
    : {};
  const variants = Array.isArray(generated['anyOf']) ? generated['anyOf'] : Array.isArray(generated['oneOf']) ? generated['oneOf'] : [];
  const unionProperties = Object.fromEntries(variants.flatMap((variant) => {
    if (typeof variant !== 'object' || variant === null || Array.isArray(variant)) return [];
    const properties = (variant as Readonly<Record<string, unknown>>)['properties'];
    return typeof properties === 'object' && properties !== null && !Array.isArray(properties)
      ? Object.entries(properties)
      : [];
  }));
  const { $defs: _generatedDefinitions, ...generatedRoot } = generated;
  const root = {
    ...generatedRoot,
    type: 'object',
    ...(generated['additionalProperties'] === undefined
      ? { properties: unionProperties, additionalProperties: false }
      : {}),
  };
  const reachable = referencedDefinitionKeys(root, generatedDefinitions);
  const definitions = Object.fromEntries(
    Object.entries(generatedDefinitions).filter(([key]) => reachable.has(key)),
  );
  return Object.freeze({
    ...root,
    ...(Object.keys(definitions).length === 0 ? {} : { $defs: definitions }),
  });
}

function schemaRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function referencedSchema(root: Readonly<Record<string, unknown>>, reference: string): Readonly<Record<string, unknown>> {
  if (!reference.startsWith('#/')) throw new TypeError(`Only local schema references can generate examples: ${reference}`);
  let value: unknown = root;
  for (const encoded of reference.slice(2).split('/')) {
    const segment = decodeURIComponent(encoded).replaceAll('~1', '/').replaceAll('~0', '~');
    value = schemaRecord(value, `schema reference ${reference}`)[segment];
  }
  return schemaRecord(value, `schema reference ${reference}`);
}

function generatedSchemaExample(
  schemaValue: unknown,
  root: Readonly<Record<string, unknown>>,
): unknown {
  const schema = schemaRecord(schemaValue, 'schema');
  const examples = schema['examples'];
  if (Array.isArray(examples) && examples.length > 0) return structuredClone(examples[0]);
  if (schema['const'] !== undefined) return structuredClone(schema['const']);
  const choices = schema['enum'];
  if (Array.isArray(choices) && choices.length > 0) return structuredClone(choices[0]);
  const reference = schema['$ref'];
  if (typeof reference === 'string') return generatedSchemaExample(referencedSchema(root, reference), root);
  const variants = Array.isArray(schema['anyOf'])
    ? schema['anyOf']
    : Array.isArray(schema['oneOf']) ? schema['oneOf'] : null;
  if (variants !== null && variants.length > 0) return generatedSchemaExample(variants[0], root);
  const declaredType = schema['type'];
  const type = Array.isArray(declaredType)
    ? declaredType.find((candidate) => candidate !== 'null')
    : declaredType;
  switch (type) {
    case 'object': {
      const properties = schemaRecord(schema['properties'] ?? {}, 'schema properties');
      const required = Array.isArray(schema['required']) ? schema['required'] : [];
      return Object.fromEntries(required.map((key) => {
        if (typeof key !== 'string' || properties[key] === undefined) {
          throw new TypeError('Required schema property is missing its definition.');
        }
        return [key, generatedSchemaExample(properties[key], root)];
      }));
    }
    case 'array': {
      const length = typeof schema['minItems'] === 'number' ? Math.max(1, schema['minItems']) : 1;
      return Array.from({ length }, () => generatedSchemaExample(schema['items'], root));
    }
    case 'string': return 'example';
    case 'integer':
    case 'number': return typeof schema['minimum'] === 'number' ? schema['minimum'] : 0;
    case 'boolean': return true;
    case 'null': return null;
    default: throw new TypeError(`Schema example generator does not support type ${String(type)}.`);
  }
}
const queryAnnotations = Object.freeze({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
const proposalAnnotations = Object.freeze({ readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false });
function spec(name: string, description: string, input: z.ZodType<unknown>, output: z.ZodType<unknown>, proposal = false): EngineToolSpec {
  const inputSchema = jsonSchema(input);
  return {
    descriptor: {
      name,
      description,
      inputSchema,
      ...(ADVERTISE_MCP_OUTPUT_SCHEMAS ? { outputSchema: jsonSchema(output) } : {}),
      annotations: proposal ? proposalAnnotations : queryAnnotations,
    },
    input,
    output,
  };
}

export const ENGINE_TURN_PROPOSAL_INPUT_SCHEMA = jsonSchema(turnProposal);

export const ENGINE_TOOL_SPECS: readonly EngineToolSpec[] = Object.freeze([
  spec('engine.read_kb_subject', 'Read one indexed knowledge-base subject; at most two successful reads are allowed per round.', z.object({
    subject: z.enum(KB_SUBJECTS),
  }).strict(), z.union([
    z.object({
      kind: z.literal('kb_subject'), subject: z.enum(KB_SUBJECTS), text: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u), byteCount: z.number().int().nonnegative(),
    }).strict(),
    z.object({ kind: z.literal('kb_read_budget_exhausted'), allowed: z.literal(2) }).strict(),
  ])),
  spec('engine.get_turn_context', 'Return full bounded tactical context, or a revision-addressed delta for a resumed session.', z.object({ run_id: identifier, expected_revision: z.number().int().min(1), scope: z.enum(['active_turn', 'round']), granularity: z.enum(['full', 'turn_delta']).optional(), since_revision: z.number().int().min(1).optional(), actor_ids: z.array(identifier).min(1).max(50).optional(), include_expectations: z.boolean().optional(), maximum_options_per_actor: z.number().int().min(1).max(20).optional(), intel_mode: z.enum(['full', 'off']).optional() }).strict().superRefine((value, context) => {
    if (value.granularity === 'turn_delta' && value.since_revision === undefined) {
      context.addIssue({ code: 'custom', path: ['since_revision'], message: 'since_revision is required for turn_delta.' });
    }
  }), turnContextOutput),
  spec('engine.query_tactical_intel', 'Read the versioned paginated actor-by-target tactical matrix and optional initiative order.', z.object({
    ...refInput,
    actor_ids: z.array(identifier).min(1).max(50).optional(),
    target_ids: z.array(identifier).min(1).max(50).optional(),
    page: z.object({ cursor: z.string().min(1).max(500).optional(), maximum_items: z.number().int().min(1).max(20).optional() }).strict().optional(),
    initiative: z.union([
      z.object({ mode: z.literal('none') }).strict(),
      z.object({ mode: z.literal('full') }).strict(),
      z.object({ mode: z.literal('pairwise'), pairs: z.array(z.object({ actor_id: identifier, target_id: identifier }).strict()).min(1).max(100) }).strict(),
    ]).optional(),
  }).strict(), tacticalIntelOutput),
  spec('engine.propose_from_play', 'Expand one advertised play into an editable, unqueued composite proposal set.', z.object({ play_name: z.enum(PLAY_NAMES) }).strict(), proposeFromPlayOutput),
  spec('engine.load_skill', 'Load one advertised tactical skill procedure and its referenced plays.', z.object({ skill_name: z.enum(SKILL_NAMES) }).strict(), loadSkillOutput),
  spec('engine.get_state_summary', 'Read one bounded state projection or journal delta using an opaque application cursor.', z.object({ ...refInput, granularity: z.enum(['turn_minimal', 'room_tactical', 'combatant_detail', 'journal_delta']), combatant_ids: z.array(identifier).max(50).optional(), since_revision: z.number().int().min(1).optional(), page: page.optional() }).strict(), stateSummaryOutput),
  spec('engine.get_combatant_options', 'List canonical offerable action options for one combatant.', z.object({ ...refInput, actor_id: identifier, page: page.optional() }).strict(), optionsOutput),
  spec('engine.query_path', 'Resolve a semantic movement objective without accepting or returning coordinates.', z.object({ ...refInput, actor_id: identifier, objective: z.union([z.object({ kind: z.literal('enable_action'), action_id: identifier, target: targetSelector }).strict(), z.object({ kind: z.enum(['approach', 'maintain_range_from', 'withdraw_from']), target: targetSelector }).strict()]), movement: movementPreference, engagement: engagement.optional() }).strict(), pathOutput),
  spec('engine.query_reach', 'Batch engine-owned current and post-movement reach checks.', z.object({ ...refInput, queries: z.array(pairQuery).min(1).max(50) }).strict(), pairOutput(reachFacts)),
  spec('engine.query_cover', 'Batch engine-owned cover comparisons.', z.object({ ...refInput, queries: z.array(pairQuery).min(1).max(50) }).strict(), pairOutput(coverFacts)),
  spec('engine.query_visibility', 'Batch engine-owned perception and visibility comparisons.', z.object({ ...refInput, queries: z.array(pairQuery).min(1).max(50) }).strict(), pairOutput(visibilityFacts)),
  spec('engine.query_dice_expectation', 'Compare bounded analytic outcomes without consuming RNG.', z.object({ ...refInput, candidates: z.array(z.object({ candidate_id: z.string().min(1).max(100), actor_id: identifier, choice: actionChoice, movement: movementPreference.optional(), engagement: engagement.optional() }).strict()).min(1).max(20), include_distribution: z.boolean().optional() }).strict(), diceOutput),
  spec('engine.validate_proposal', 'Purely validate and preview one revision-bound composite option proposal.', phaseProposalInput, validateOutput),
  spec('engine.submit_round_proposals', 'Queue the round; include one short sentence per actor saying why this option. Minimal input: { proposals, rationale?, reaction_guidance? }; the launcher fills state_ref, request_id, phase, and a deterministic idempotency_key from this turn binding. The full explicit envelope { state_ref, request_id, phase, idempotency_key, proposals, rationale?, reaction_guidance? } is also accepted. One ACCEPTED submission per round; a call rejected for invalid arguments is not queued — fix it and call again.', submitRoundInput, roundOutput, true),
  spec('engine.submit_plan_adjustment', 'Validate and queue a bounded patch over the remaining open monster plan.', submitPlanAdjustmentInput, adjustmentOutput, true),
  spec('engine.submit_speculative_round_plan', 'Structurally validate and queue one host-guarded contingent monster-round plan.', submitSpeculativeRoundPlanInput, speculativeRoundPlanOutput, true),
  spec('engine.submit_proposal', 'Validate and queue one separately controlled seat proposal.', submitProposalInput, singleOutput, true),
  spec('engine.emit_narration', 'Queue one bounded presentation-only narration chunk.', z.object({ ...refInput, request_id: identifier, idempotency_key: z.string().min(16).max(200), voice: z.enum(['cinematic_visible_rolls', 'terse_tactical', 'rules_explicit', 'terse_rule_citing_validation']), text: z.string().min(1).max(12_000), audience: z.enum(['shared', 'dm_only']), rule_references: z.array(z.object({ rule_id: identifier, source_locator: z.string().min(1).max(300) }).strict()).max(20).optional() }).strict(), narrationOutput, true),
  spec('engine.request_dm_adjudication', 'Queue a bounded DM question with no raw mechanical consequence.', z.object({ ...refInput, request_id: identifier, actor_id: identifier, subject: z.string().min(1).max(300), reason: z.string().min(1).max(2_000), blocking: z.boolean(), suggested_outcomes: z.array(z.string().min(1).max(500)).max(5).optional(), idempotency_key: z.string().min(16).max(200) }).strict(), adjudicationOutput, true),
]);

export const ENGINE_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA = ENGINE_TOOL_SPECS.find(
  (specification) => specification.descriptor.name === 'engine.submit_round_proposals',
)?.descriptor.inputSchema;
if (ENGINE_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA === undefined) {
  throw new Error('engine.submit_round_proposals must publish an input schema.');
}

export const ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA = jsonSchema(minimalSubmitRoundInput);

export function generatedMinimalRoundSubmissionExample(
  phase: 'initial' | 'correction',
): Readonly<Record<string, unknown>> {
  const generated = schemaRecord(
    generatedSchemaExample(
      ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA,
      ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA,
    ),
    'generated minimal submission example',
  );
  if (phase === 'initial') return generated;
  const proposals = generated['proposals'];
  if (!Array.isArray(proposals)) throw new TypeError('Generated minimal submission example omitted proposals.');
  return {
    ...generated,
    proposals: proposals.map((proposal) => ({
      ...schemaRecord(proposal, 'generated proposal example'),
      fallback_option_id: null,
    })),
  };
}

function jsonPointer(path: readonly PropertyKey[]): string {
  return path.length === 0 ? '$' : path.reduce<string>((pointer, segment) => `${pointer}/${String(segment).replaceAll('~', '~0').replaceAll('/', '~1')}`, '');
}
export function schemaViolations(schema: z.ZodType<unknown>, value: unknown): readonly SchemaViolation[] {
  const decoded = schema.safeParse(value);
  return decoded.success ? [] : decoded.error.issues.map((issue) => ({ path: jsonPointer(issue.path), keyword: issue.code, message: issue.message }));
}

export const engineSchemaInternals = {
  stateRef,
  targetSelector,
  actionChoice,
  movementPreference,
  engagement,
  turnProposal,
  minimalSubmitRoundInput,
  minimalSubmitRoundTransportInput,
  submitRoundTransportInput,
  submitSpeculativeRoundPlanInput,
};
