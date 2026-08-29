import { z } from 'zod';
import { PLAY_NAMES } from '../snippet-registry-runtime';
import type { McpToolDescriptor, SchemaViolation } from './handler';

const identifier = z.string().min(1).max(200).describe('Engine-owned stable identifier.');
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

const intentBranch = z.object({ choice: actionChoice, movement: movementPreference, engagement }).strict();
const turnIntent = intentBranch.extend({ actor_id: identifier, fallback: intentBranch.nullable() }).strict()
  .describe('One actor intent with at most one declarative fallback.');
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
const expectation = z.object({
  resolvable: z.boolean(), outcome_probability: z.number().min(0).max(1).nullable(),
  expected_value: z.number().finite().nullable(), metric: z.enum(['damage', 'healing', 'control', 'none']),
  assumption_codes: z.array(shortCode).max(20),
}).strict();
const tacticalOption = z.object({
  action_id: identifier, kind: z.enum(['attack', 'cast_spell', 'use_action', 'dodge', 'disengage', 'dash', 'end_turn']),
  target_selectors: z.array(targetSelector).max(50), resource_cost_labels: z.array(identifier).max(20),
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
const turnRequest = z.object({
  request_id: identifier, phase: z.enum(['initial', 'correction']), correction_number: z.union([z.literal(0), z.literal(1)]),
  required_actor_ids: z.array(identifier).min(1).max(50),
}).strict();
const actorContext = z.object({ actor_id: identifier, status: actorStatus, options: z.array(tacticalOption).max(20), threats: z.array(threat).max(50) }).strict();
const advertisedPlay = z.object({
  name: z.enum(PLAY_NAMES),
  description: z.string().min(1).max(200),
  snippet_hash: z.string().regex(/^[0-9a-f]{64}$/u),
}).strict();
const suggestedPlan = z.object({
  play_name: z.enum(PLAY_NAMES),
  snippet_hash: z.string().regex(/^[0-9a-f]{64}$/u),
  intents: z.array(turnIntent).min(1).max(50),
  advisory: z.string().min(1).max(300),
}).strict();
const turnContextOutput = z.object({
  state_ref: stateRef, request: turnRequest, summary: tacticalSummary, actors: z.array(actorContext).min(1).max(50),
  applicable_plays: z.array(advertisedPlay).max(3),
  suggested_plan: suggestedPlan.optional(),
  recent_changes: z.array(recentChange).max(100), truncated: z.boolean(), next_cursor: z.string().max(500).nullable(),
}).strict();
const proposeFromPlayOutput = z.object({
  state_ref: stateRef,
  play_name: z.enum(PLAY_NAMES),
  snippet_hash: z.string().regex(/^[0-9a-f]{64}$/u),
  intents: z.array(turnIntent).min(1).max(50),
}).strict();

const combatantSummary = z.object({
  combatant_id: identifier, name: identifier, side: z.enum(['player_character', 'monster']), status: actorStatus,
  options: z.array(tacticalOption).max(100), threats: z.array(threat).max(50),
}).strict();
const stateSummaryBody = z.object({
  room: z.number().int().min(1).nullable(), round: z.number().int().min(0), active_side: z.enum(['players', 'monsters', 'none']),
  combatants: z.array(combatantSummary).max(100), terrain_tags: z.array(shortCode).max(100), history: z.array(recentChange).max(100),
}).strict();
const stateSummaryOutput = z.object({ state_ref: stateRef, granularity: z.enum(['turn_minimal', 'room_tactical', 'combatant_detail', 'journal_delta']), proof_token: z.string().regex(/^[0-9a-f]{64}$/u), summary: stateSummaryBody, truncated: z.boolean(), next_cursor: z.string().max(500).nullable() }).strict();
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
const diceOutput = z.object({ state_ref: stateRef, results: z.array(z.object({ candidate_id: z.string().min(1).max(100), resolvable: z.boolean(), metrics, assumptions: z.array(shortCode).max(20), refusals: z.array(refusal).max(20) }).strict()).max(20) }).strict();

const resolutionPreview = z.object({ actor_id: identifier, action_id: identifier, target_id: identifier.nullable(), movement_feet: z.number().int().min(0), resolution_digest: z.string().min(64).max(128), summary: summaryText }).strict();
const correctionGuidance = z.object({ remaining_corrections: z.union([z.literal(0), z.literal(1)]), required_actor_ids: z.array(identifier).min(1).max(50), replace_whole_round: z.literal(true) }).strict();
const validateOutput = z.object({ state_ref: stateRef, valid: z.boolean(), selected_branch: z.enum(['primary', 'fallback', 'none']), resolution: resolutionPreview.nullable(), refusals: z.array(refusal).max(20), correction_guidance: correctionGuidance.nullable() }).strict();
const actorResolution = z.object({ actor_id: identifier, selected_branch: z.enum(['primary', 'fallback']), resolution_digest: z.string().min(64).max(128), summary: summaryText }).strict();
const actorRefusal = z.object({
  actor_id: identifier,
  codes: z.array(shortCode).min(1).max(20),
  summary: summaryText,
  attempt_rejections: z.array(z.object({
    attempt: z.enum(['primary', 'fallback']),
    declared_intent: intentBranch.nullable(),
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
const phaseIntentInput = z.object({ ...refInput, request_id: identifier, phase: z.enum(['initial', 'correction']), intent: turnIntent }).strict().superRefine((value, context) => {
  if (value.phase === 'correction' && value.intent.fallback !== null) context.addIssue({ code: 'custom', path: ['intent', 'fallback'], message: 'Correction intent fallback must be null.' });
});
const submitIntentInput = z.object({ ...refInput, request_id: identifier, phase: z.enum(['initial', 'correction']), idempotency_key: z.string().min(16).max(200), intent: turnIntent, reaction_guidance: reactionGuidance.optional() }).strict().superRefine((value, context) => {
  if (value.phase === 'correction' && value.intent.fallback !== null) context.addIssue({ code: 'custom', path: ['intent', 'fallback'], message: 'Correction intent fallback must be null.' });
});
const submitRoundInput = z.object({ ...refInput, request_id: identifier, phase: z.enum(['initial', 'correction']), idempotency_key: z.string().min(16).max(200), intents: z.array(turnIntent).min(1).max(50), reaction_guidance: reactionGuidance.optional() }).strict().superRefine((value, context) => {
  if (value.phase === 'correction') value.intents.forEach((intent, index) => {
    if (intent.fallback !== null) context.addIssue({ code: 'custom', path: ['intents', index, 'fallback'], message: 'Correction intent fallback must be null.' });
  });
});

export interface EngineToolSpec { readonly descriptor: McpToolDescriptor; readonly input: z.ZodType<unknown>; readonly output: z.ZodType<unknown> }
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
  return Object.freeze({
    ...generated,
    type: 'object',
    ...(generated['additionalProperties'] === undefined
      ? { properties: unionProperties, additionalProperties: false }
      : {}),
    $defs: {
      ...generatedDefinitions,
      stateRef: z.toJSONSchema(stateRef, { target: 'draft-2020-12', io: 'input' }),
      targetSelector: z.toJSONSchema(targetSelector, { target: 'draft-2020-12', io: 'input' }),
    },
  });
}
const queryAnnotations = Object.freeze({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
const proposalAnnotations = Object.freeze({ readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false });
function spec(name: string, description: string, input: z.ZodType<unknown>, output: z.ZodType<unknown>, proposal = false): EngineToolSpec {
  const inputSchema = jsonSchema(input);
  const correctionRule = name === 'engine.submit_round_intents'
    ? [{ if: { properties: { phase: { const: 'correction' } } }, then: { properties: { intents: { items: { properties: { fallback: { type: 'null' } } } } } } }]
    : name === 'engine.validate_intent' || name === 'engine.submit_intent'
      ? [{ if: { properties: { phase: { const: 'correction' } } }, then: { properties: { intent: { properties: { fallback: { type: 'null' } } } } } }]
      : null;
  return {
    descriptor: {
      name,
      description,
      inputSchema: correctionRule === null ? inputSchema : { ...inputSchema, allOf: correctionRule },
      outputSchema: jsonSchema(output),
      annotations: proposal ? proposalAnnotations : queryAnnotations,
    },
    input,
    output,
  };
}

export const ENGINE_TOOL_SPECS: readonly EngineToolSpec[] = Object.freeze([
  spec('engine.get_turn_context', 'Return the complete bounded tactical context for the active turn or shared-initiative round.', z.object({ run_id: identifier, expected_revision: z.number().int().min(1), scope: z.enum(['active_turn', 'round']), actor_ids: z.array(identifier).min(1).max(50).optional(), include_expectations: z.boolean().optional(), maximum_options_per_actor: z.number().int().min(1).max(20).optional() }).strict(), turnContextOutput),
  spec('engine.propose_from_play', 'Expand one advertised play into an editable, unqueued draft intent set.', z.object({ play_name: z.enum(PLAY_NAMES) }).strict(), proposeFromPlayOutput),
  spec('engine.get_state_summary', 'Read one bounded state projection or journal delta using an opaque application cursor.', z.object({ ...refInput, granularity: z.enum(['turn_minimal', 'room_tactical', 'combatant_detail', 'journal_delta']), combatant_ids: z.array(identifier).max(50).optional(), since_revision: z.number().int().min(1).optional(), page: page.optional() }).strict(), stateSummaryOutput),
  spec('engine.get_combatant_options', 'List canonical legal and unavailable action options for one combatant.', z.object({ ...refInput, actor_id: identifier, include_unavailable: z.boolean().optional(), page: page.optional() }).strict(), optionsOutput),
  spec('engine.query_path', 'Resolve a semantic movement objective without accepting or returning coordinates.', z.object({ ...refInput, actor_id: identifier, objective: z.union([z.object({ kind: z.literal('enable_action'), action_id: identifier, target: targetSelector }).strict(), z.object({ kind: z.enum(['approach', 'maintain_range_from', 'withdraw_from']), target: targetSelector }).strict()]), movement: movementPreference, engagement: engagement.optional() }).strict(), pathOutput),
  spec('engine.query_reach', 'Batch engine-owned current and post-movement reach checks.', z.object({ ...refInput, queries: z.array(pairQuery).min(1).max(50) }).strict(), pairOutput(reachFacts)),
  spec('engine.query_cover', 'Batch engine-owned cover comparisons.', z.object({ ...refInput, queries: z.array(pairQuery).min(1).max(50) }).strict(), pairOutput(coverFacts)),
  spec('engine.query_visibility', 'Batch engine-owned perception and visibility comparisons.', z.object({ ...refInput, queries: z.array(pairQuery).min(1).max(50) }).strict(), pairOutput(visibilityFacts)),
  spec('engine.query_dice_expectation', 'Compare bounded analytic outcomes without consuming RNG.', z.object({ ...refInput, candidates: z.array(z.object({ candidate_id: z.string().min(1).max(100), actor_id: identifier, choice: actionChoice, movement: movementPreference.optional(), engagement: engagement.optional() }).strict()).min(1).max(20), include_distribution: z.boolean().optional() }).strict(), diceOutput),
  spec('engine.validate_intent', 'Purely validate and preview one revision-bound intent.', phaseIntentInput, validateOutput),
  spec('engine.submit_round_intents', 'Validate and queue one all-or-nothing shared-initiative round proposal.', submitRoundInput, roundOutput, true),
  spec('engine.submit_intent', 'Validate and queue one separately controlled seat proposal.', submitIntentInput, singleOutput, true),
  spec('engine.emit_narration', 'Queue one bounded presentation-only narration chunk.', z.object({ ...refInput, request_id: identifier, idempotency_key: z.string().min(16).max(200), voice: z.enum(['cinematic_visible_rolls', 'terse_tactical', 'rules_explicit', 'terse_rule_citing_validation']), text: z.string().min(1).max(12_000), audience: z.enum(['shared', 'dm_only']), rule_references: z.array(z.object({ rule_id: identifier, source_locator: z.string().min(1).max(300) }).strict()).max(20).optional() }).strict(), narrationOutput, true),
  spec('engine.request_dm_adjudication', 'Queue a bounded DM question with no raw mechanical consequence.', z.object({ ...refInput, request_id: identifier, actor_id: identifier, subject: z.string().min(1).max(300), reason: z.string().min(1).max(2_000), blocking: z.boolean(), suggested_outcomes: z.array(z.string().min(1).max(500)).max(5).optional(), idempotency_key: z.string().min(16).max(200) }).strict(), adjudicationOutput, true),
]);

function jsonPointer(path: readonly PropertyKey[]): string {
  return path.length === 0 ? '$' : path.reduce<string>((pointer, segment) => `${pointer}/${String(segment).replaceAll('~', '~0').replaceAll('/', '~1')}`, '');
}
export function schemaViolations(schema: z.ZodType<unknown>, value: unknown): readonly SchemaViolation[] {
  const decoded = schema.safeParse(value);
  return decoded.success ? [] : decoded.error.issues.map((issue) => ({ path: jsonPointer(issue.path), keyword: issue.code, message: issue.message }));
}

export const engineSchemaInternals = { stateRef, targetSelector, actionChoice, movementPreference, engagement, turnIntent };
