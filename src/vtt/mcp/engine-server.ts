import { canonicalJson } from '../../commands/canonical-json';
import type { EncounterState } from '../../combat/encounter';
import { gridDistance, type GridCell } from '../../combat/grid';
import type { MonsterAttackAction } from '../../combat/statblock';
import { TACTICAL_EVALUATOR_POLICY } from '../../combat/tactical-evaluator';
import { combatantId, encounterSessionId, type CombatantId } from '../../combat/values';
import { sha256 } from '../../crypto/sha256';
import {
  submitEngineNarration,
  submitEngineProposal,
  type NarrationSink,
  type ProposalSink,
} from '../engine-envelopes';
import {
  engineStateHandle,
  StaleEngineStateError,
  verifyEngineStateCapsule,
  type EngineStateCapsule,
  type EngineStateReference,
  type ReadonlyStateCapsuleSource,
  type RuleReference,
} from '../engine-state-capsule';
import type { EngineQueryPort, EngineTargetSelector } from '../engine-query-port';
import type { EngineMovementPreference, EngineTurnProposal, PureTurnProposalResolver } from '../intent-resolver';
import { engineOptionId, type EngineActorOption } from '../turn-proposal';
import {
  DM_INTEL_QUERY_POLICY,
  DM_TURN_INTEL_POLICY,
  captureDmIntel,
  exactDmIntelMatrix,
  fullInitiativeIntel,
  pairwiseInitiativeIntel,
  renderDmContextIntelRow,
  renderDmIntelRow,
  salientInitiativeWindow,
  topDmActorIntelRows,
} from '../dm-tactical-intel';
import { renderEngineFailureModes } from '../engine-failure-modes';
import {
  movementOptionsIntel,
  renderMovementContextRow,
  renderMovementIntelRow,
  MOVEMENT_OPTIONS_INTEL_POLICY,
} from '../intel/movement-options';
import {
  actorOpportunityReport,
  renderDodgeOpportunityCost,
  renderMaterialityContext,
  submissionDominance,
  DOMINANCE_CORRECTION_POLICY,
  OPPORTUNITY_COST_POLICY,
} from '../intel/opportunity-cost';
import {
  renderTeamPlanFrontier,
  scoreTeamPlans,
  type TeamPlanFrontierReport,
} from '../intel/team-scorer';
import type { ReactionGuidanceDeclaration, ReactionTriggerGuidance } from '../reaction-guidance';
import { diffTurnContextValues } from '../dm-bridge/projection-transport';
import { submitSpeculativeRoundPlan } from '../speculative-plan-submission';
import type { SpeculativePlanSink } from '../speculative-plan-types';
import {
  PLAY_NAMES,
  SNIPPET_REGISTRY,
  type PlayName,
} from '../snippet-registry-runtime';
import {
  createMcpHandler,
  type McpHandler,
  type McpPromptProvider,
  type McpResourceContent,
  type McpResourceProvider,
  type McpToolBinding,
} from './handler';
import { ENGINE_TOOL_SPECS, schemaViolations } from './schemas';

export const ENGINE_DM_TOOL_NAMES = Object.freeze([
  'engine.get_turn_context',
  'engine.query_tactical_intel',
  'engine.propose_from_play',
  'engine.validate_proposal',
  'engine.submit_round_proposals',
  'engine.request_dm_adjudication',
] as const);
export const ENGINE_ADJUSTMENT_DM_TOOL_NAMES = Object.freeze([
  'engine.get_turn_context',
  'engine.query_tactical_intel',
  'engine.validate_proposal',
  'engine.submit_plan_adjustment',
  'engine.request_dm_adjudication',
] as const);
export type EngineMcpToolProfile = 'full' | 'dm';

export interface EngineCapsuleFeed extends ReadonlyStateCapsuleSource {
  current(): EngineStateCapsule;
  snapshot(revision: number): EngineStateCapsule | null;
  listen(listener: (event: { readonly capsule: EngineStateCapsule; readonly roomTransition: boolean }) => void): () => void;
}

export class MutableEngineCapsuleFeed implements EngineCapsuleFeed {
  #current: EngineStateCapsule;
  readonly #snapshots = new Map<number, EngineStateCapsule>();
  readonly #listeners = new Set<(event: { readonly capsule: EngineStateCapsule; readonly roomTransition: boolean }) => void>();

  constructor(capsule: EngineStateCapsule) {
    if (!verifyEngineStateCapsule(capsule)) throw new TypeError('State capsule digest is invalid.');
    this.#current = structuredClone(capsule);
    this.#snapshots.set(capsule.revision, structuredClone(capsule));
  }

  current(): EngineStateCapsule { return structuredClone(this.#current); }
  snapshot(revision: number): EngineStateCapsule | null {
    const capsule = this.#snapshots.get(revision);
    return capsule === undefined ? null : structuredClone(capsule);
  }
  read(reference: EngineStateReference): EngineStateCapsule {
    const capsule = this.#current;
    if (reference.runId !== capsule.runId || reference.expectedRevision !== capsule.revision ||
      reference.stateHandle !== engineStateHandle(capsule) || !verifyEngineStateCapsule(capsule)) throw new StaleEngineStateError();
    return structuredClone(capsule);
  }
  listen(listener: (event: { readonly capsule: EngineStateCapsule; readonly roomTransition: boolean }) => void): () => void {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  }
  replace(capsule: EngineStateCapsule, roomTransition = false): void {
    if (!verifyEngineStateCapsule(capsule) || capsule.runId !== this.#current.runId || capsule.revision <= this.#current.revision) {
      throw new TypeError('Replacement capsule must be a valid later revision of the selected run.');
    }
    this.#current = structuredClone(capsule);
    this.#snapshots.set(capsule.revision, structuredClone(capsule));
    for (const listener of this.#listeners) listener({ capsule: structuredClone(capsule), roomTransition });
  }
}

export interface AllowlistedRuleEntry extends RuleReference {
  readonly text: string;
  readonly attribution: string;
}

export const SUGGESTED_PLAN_MAX_BYTES = 16 * 1024;
export const TURN_CONTEXT_MAX_BYTES = 32 * 1024;
const SUGGESTED_PLAN_ADVISORY = 'You may submit these revision-bound option proposals as-is via engine.submit_round_proposals, edit the selected option ids, or ignore this suggested plan.';

export function engineStateSummaryProofToken(capsuleDigest: string, granularity: string): string {
  return sha256(`${capsuleDigest}|${granularity}|state_summary_proof_v1`);
}
export interface AllowlistedRulesSource { readonly get: (ruleId: string) => AllowlistedRuleEntry | null }
export interface AdjudicationEnvelope {
  readonly adjudicationRequestId: string; readonly runId: string; readonly branchId: string;
  readonly requestId: string; readonly expectedRevision: number; readonly stateDigest: string;
  readonly stateHandle: string; readonly actorId: string; readonly subject: string; readonly reason: string;
  readonly blocking: boolean; readonly suggestedOutcomes: readonly string[]; readonly idempotencyKey: string;
}
export interface AdjudicationSink { readonly append: (envelope: AdjudicationEnvelope) => void }

export interface TurnContextDeltaBase {
  readonly revision: number;
  readonly context: Readonly<Record<string, unknown>>;
}

interface EngineMcpDependencies {
  readonly state: EncounterState;
  readonly stateSource: EngineCapsuleFeed;
  readonly queries: EngineQueryPort;
  readonly turnProposals: PureTurnProposalResolver;
  readonly proposals: ProposalSink;
  readonly speculativePlans: SpeculativePlanSink;
  readonly narration: NarrationSink;
  readonly adjudications: AdjudicationSink;
  readonly rules: AllowlistedRulesSource;
  readonly maximumToolResultBytes?: number;
  readonly maximumResourceBytes?: number;
  readonly listPageSize?: number;
  readonly toolProfile?: EngineMcpToolProfile;
  readonly turnContextDeltaBase?: TurnContextDeltaBase;
  readonly onTurnContext?: (context: Readonly<Record<string, unknown>>) => void;
}

export interface EngineToolSurface {
  readonly tools: readonly import('./handler').McpToolDescriptor[];
  execute(name: string, argumentsValue: unknown): unknown;
}

export interface EngineMcpApplication extends McpHandler {
  readonly toolSurface: EngineToolSurface;
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Readonly<Record<string, unknown>>;
}
function stringField(value: Readonly<Record<string, unknown>>, key: string): string {
  const field = value[key];
  if (typeof field !== 'string') throw new TypeError(`${key} must be a string.`);
  return field;
}
function numberField(value: Readonly<Record<string, unknown>>, key: string): number {
  const field = value[key];
  if (typeof field !== 'number') throw new TypeError(`${key} must be a number.`);
  return field;
}
function stateReference(value: unknown): EngineStateReference {
  const input = record(value, 'state_ref');
  return { runId: encounterSessionId(stringField(input, 'run_id')), stateHandle: stringField(input, 'state_handle'), expectedRevision: numberField(input, 'expected_revision') };
}
function externalStateRef(capsule: EngineStateCapsule): Readonly<Record<string, unknown>> {
  return { run_id: capsule.runId, state_handle: engineStateHandle(capsule), expected_revision: capsule.revision };
}
function decodeTarget(value: unknown): EngineTargetSelector {
  const input = record(value, 'target');
  const kind = stringField(input, 'kind');
  switch (kind) {
    case 'combatant': return { kind, combatantId: combatantId(stringField(input, 'combatant_id')) };
    case 'nearest_visible_enemy':
    case 'lowest_hp_visible_enemy':
    case 'most_injured_visible_ally':
    case 'current_threat': return { kind };
    case 'enemy_threatening_ally': return { kind, allyId: combatantId(stringField(input, 'ally_id')) };
    default: throw new TypeError('Unknown target selector.');
  }
}
type QueryActionChoice =
  | { readonly kind: 'attack'; readonly actionId: string; readonly target: EngineTargetSelector }
  | { readonly kind: 'cast_spell'; readonly spellId: string; readonly target: EngineTargetSelector | null }
  | { readonly kind: 'use_action'; readonly actionId: string; readonly target: EngineTargetSelector | null }
  | { readonly kind: 'dodge' | 'disengage' | 'dash' | 'end_turn' };

function decodeChoice(value: unknown): QueryActionChoice {
  const input = record(value, 'choice');
  const kind = stringField(input, 'kind');
  switch (kind) {
    case 'attack': return { kind, actionId: stringField(input, 'action_id'), target: decodeTarget(input['target']) };
    case 'cast_spell': return { kind, spellId: stringField(input, 'spell_id'), target: input['target'] === null ? null : decodeTarget(input['target']) };
    case 'use_action': return { kind, actionId: stringField(input, 'action_id'), target: input['target'] === null ? null : decodeTarget(input['target']) };
    case 'dodge': case 'disengage': case 'dash': case 'end_turn': return { kind };
    default: throw new TypeError('Unknown action choice.');
  }
}
function decodeMovement(value: unknown): EngineMovementPreference {
  const input = record(value, 'movement');
  return {
    willingness: stringField(input, 'willingness') as EngineMovementPreference['willingness'],
    ...(input['maximum_feet'] === undefined ? {} : { maximumFeet: numberField(input, 'maximum_feet') }),
    opportunityRisk: stringField(input, 'opportunity_risk') as EngineMovementPreference['opportunityRisk'],
  };
}
function decodeReactionTriggerGuidance(value: unknown): ReactionTriggerGuidance {
  const input = record(value, 'reaction trigger guidance');
  return Object.fromEntries(Object.entries(input)) as ReactionTriggerGuidance;
}
function decodeReactionGuidance(value: unknown): ReactionGuidanceDeclaration {
  const input = record(value, 'reaction_guidance');
  const actorValues = input['actors'];
  return {
    sideWide: input['side_wide'] === undefined ? null : decodeReactionTriggerGuidance(input['side_wide']),
    actors: actorValues === undefined ? [] : (actorValues as readonly unknown[]).map((value) => {
      const actor = record(value, 'actor reaction guidance');
      return {
        actorId: combatantId(stringField(actor, 'actor_id')),
        triggers: decodeReactionTriggerGuidance(actor['triggers']),
      };
    }),
  };
}
function decodeProposal(value: unknown): EngineTurnProposal {
  const input = record(value, 'proposal');
  const justification = input['override_justification'];
  return {
    actorId: combatantId(stringField(input, 'actor_id')),
    expectedRevision: numberField(input, 'expected_revision'),
    primaryOptionId: engineOptionId(stringField(input, 'primary_option_id')),
    fallbackOptionId: input['fallback_option_id'] === null
      ? null
      : engineOptionId(stringField(input, 'fallback_option_id')),
    overrideJustification: justification === null
      ? null
      : (() => {
          const decoded = record(justification, 'override justification');
          return {
            reason: stringField(decoded, 'reason') as NonNullable<EngineTurnProposal['overrideJustification']>['reason'],
            ...(decoded['note'] === undefined ? {} : { note: stringField(decoded, 'note') }),
          };
        })(),
  };
}
function externalProposal(proposal: EngineTurnProposal): Readonly<Record<string, unknown>> {
  return {
    actor_id: proposal.actorId,
    expected_revision: proposal.expectedRevision,
    primary_option_id: proposal.primaryOptionId,
    fallback_option_id: proposal.fallbackOptionId,
    override_justification: proposal.overrideJustification === null ? null : {
      reason: proposal.overrideJustification.reason,
      ...(proposal.overrideJustification.note === undefined ? {} : { note: proposal.overrideJustification.note }),
    },
  };
}
function hitPointBand(hitPoints: number, maximum: number): 'uninjured' | 'injured' | 'critical' | 'unknown' {
  if (maximum <= 0) return 'unknown';
  if (hitPoints >= maximum) return 'uninjured';
  return hitPoints * 4 <= maximum ? 'critical' : 'injured';
}
function actorStatus(actor: EngineStateCapsule['projection']['combatants'][number]): Readonly<Record<string, unknown>> {
  return { life: actor.life, hit_point_band: hitPointBand(actor.hitPoints, actor.hitPointMaximum), movement_feet: actor.movementRemainingFeet, action_available: actor.actionAvailable, bonus_action_available: actor.bonusActionAvailable, reaction_available: actor.reactionAvailable, effect_tags: [], pending_decision_ids: [] };
}
function tacticalSummary(capsule: EngineStateCapsule) {
  const living = capsule.projection.combatants.filter((actor) => actor.life !== 'dead');
  return {
    room: capsule.projection.room, round: capsule.projection.round, active_side: capsule.projection.activeSide,
    living_allies: living.filter((actor) => actor.side === 'player_character').length,
    living_enemies: living.filter((actor) => actor.side === 'monster').length,
    terrain_tags: [
      ...(capsule.projection.blockedCells.length > 0 ? ['blocked'] : []),
      ...(capsule.projection.difficultTerrainCells.length > 0 ? ['difficult_terrain'] : []),
      ...capsule.projection.movementBlockingObjects.map((object) => `object:${object.id}`),
    ].sort(),
  };
}
function recentChanges(capsule: EngineStateCapsule): readonly Readonly<Record<string, unknown>>[] {
  return [...capsule.historyDelta].sort((left, right) => left.revision - right.revision).map((entry) => ({ revision: entry.revision, kind: entry.kind, summary: `${entry.kind} at encounter round ${String(entry.encounterRound)}`, branch_status: entry.branchStatus }));
}
function expectationFor(state: EncounterState, queries: EngineQueryPort, actorId: CombatantId, actionId: string, targetId: CombatantId | null): Readonly<Record<string, unknown>> | null {
  const action = queries.actions(state, actorId).find((candidate): candidate is MonsterAttackAction => candidate.kind === 'attack' && candidate.id === actionId);
  const target = targetId === null ? null : queries.combatant(state, targetId);
  if (action === undefined || target === null) return null;
  const evaluation = queries.tacticalAttack(state, actorId, target.profile.id, action.id);
  if (evaluation === null) return null;
  if (
    evaluation.probabilities.status === 'unresolved' ||
    evaluation.damage.status === 'unresolved' ||
    evaluation.unresolved.length > 0
  ) {
    return {
      resolvable: false,
      outcome_probability: null,
      critical_probability: null,
      expected_value: null,
      metric: 'damage',
      assumption_codes: evaluation.unresolved,
      policy: evaluation.policy,
    };
  }
  return {
    resolvable: true,
    outcome_probability: evaluation.probabilities.hit,
    critical_probability: evaluation.probabilities.critical,
    expected_value: evaluation.damage.expectedDamage,
    metric: 'damage',
    assumption_codes: evaluation.rollMode.reasons,
    policy: evaluation.policy,
  };
}
function externalOptionSlot(slot: EngineActorOption['actionSlots'][number]): Readonly<Record<string, unknown>> {
  const use = slot.use;
  const targetIds = use.kind === 'attack' || use.kind === 'saving_throw'
    ? use.target.kind === 'combatant' ? [use.target.combatantId] : []
    : use.kind === 'multiattack'
      ? use.components.flatMap((component) => component.target.kind === 'combatant' ? [component.target.combatantId] : [])
      : use.kind === 'cast_spell'
        ? use.targets.flatMap((target) => target.kind === 'combatant' ? [target.combatantId] : [])
        : [];
  return {
    slot: slot.slot,
    kind: use.kind,
    action_id: use.kind === 'cast_spell' ? use.sourceActionId
      : 'actionId' in use ? use.actionId : use.kind,
    component_action_ids: use.kind === 'multiattack'
      ? use.components.map((component) => component.actionId)
      : [],
    spell_id: use.kind === 'cast_spell' ? use.spellId : null,
    target_ids: targetIds,
    world_object_id: use.kind === 'use_world_object' ? use.objectId : null,
  };
}
function tacticalOptions(state: EncounterState, queries: EngineQueryPort, capsule: EngineStateCapsule, actorId: CombatantId, includeExpectations: boolean, _includeUnavailable: boolean): readonly Readonly<Record<string, unknown>>[] {
  const projected = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
  if (projected === undefined) return [];
  const informationRank = (option: EngineActorOption): number => {
    const main = option.actionSlots.find((slot) => slot.slot === 'main')?.use;
    if (main === undefined) return 6;
    switch (main.kind) {
      case 'multiattack': return 0;
      case 'attack':
      case 'saving_throw': return 1;
      case 'cast_spell': return 2;
      case 'use_world_object': return 3;
      case 'dodge':
      case 'disengage':
      case 'dash': return 4;
      case 'end_turn': return 5;
    }
  };
  return [...projected.options]
    .sort((left, right) => informationRank(left) - informationRank(right) || left.label.localeCompare(right.label))
    .map((option) => {
    const first = option.actionSlots[0];
    if (first === undefined) throw new Error(`Composite option ${option.optionId} has no action slot use.`);
    const firstUse = first.use;
    const firstActionId = firstUse.kind === 'cast_spell' ? firstUse.sourceActionId
      : 'actionId' in firstUse ? firstUse.actionId : firstUse.kind;
    const kind = firstUse.kind === 'attack' || firstUse.kind === 'multiattack' ? 'attack'
      : firstUse.kind === 'cast_spell' ? 'cast_spell'
        : firstUse.kind === 'dodge' || firstUse.kind === 'disengage' || firstUse.kind === 'dash' || firstUse.kind === 'end_turn'
          ? firstUse.kind
          : 'use_action';
    const firstTarget = firstUse.kind === 'attack' || firstUse.kind === 'saving_throw'
      ? firstUse.target
      : firstUse.kind === 'multiattack'
        ? firstUse.components[0]?.target ?? null
        : firstUse.kind === 'cast_spell'
          ? firstUse.targets[0] ?? null
          : null;
    const targetId = firstTarget === null ? null : queries.resolveTarget(state, actorId, firstTarget);
    const movementFeet = option.movement.preference.willingness === 'none' ? 0 : null;
    return {
      option_id: option.optionId, actor_id: option.actorId, revision: option.revision, label: option.label,
      action_slots: option.actionSlots.map(externalOptionSlot),
      action_id: firstActionId, kind, target_selectors: [], resource_cost_labels: option.resourceCostLabels,
      usable_now: movementFeet === 0, usable_after_movement: true, minimum_movement_feet: movementFeet,
      visibility: targetId === null ? 'unknown' : queries.visibility(state, actorId, targetId)?.visible === true ? 'yes' : 'no',
      cover: targetId === null ? 'unknown' : queries.cover(state, actorId, targetId)?.tier ?? 'unknown', risks: [],
      expectation: includeExpectations && targetId !== null ? expectationFor(state, queries, actorId,
        firstUse.kind === 'multiattack' ? firstUse.components[0]?.actionId ?? firstActionId : firstActionId, targetId) : null,
      refusals: [],
    };
    });
}
function distanceBand(distance: number): 'engaged' | 'near' | 'far' { return distance <= 5 ? 'engaged' : distance <= 30 ? 'near' : 'far' }
function threats(state: EncounterState, queries: EngineQueryPort, actorId: CombatantId): readonly Readonly<Record<string, unknown>>[] {
  const origin = queries.tokenPosition(state, actorId);
  if (origin === null) return [];
  return state.combatants.filter((candidate) => candidate.life !== 'dead' && !queries.sameSide(state, actorId, candidate.profile.id)).flatMap((candidate) => {
    const position = queries.tokenPosition(state, candidate.profile.id);
    if (position === null) return [];
    const distance = gridDistance(origin, position);
    return [{ source_id: candidate.profile.id, kinds: ['melee'], distance_band: distanceBand(distance), can_reach_now: distance <= candidate.profile.rules.reach ? 'yes' : 'no', visible: queries.visibility(state, actorId, candidate.profile.id)?.visible ?? false, note_codes: [] }];
  }).sort((left, right) => left.source_id.localeCompare(right.source_id));
}
function exactCurrent(feed: EngineCapsuleFeed, runId: string, revision: number): EngineStateCapsule {
  const capsule = feed.current();
  if (capsule.runId !== runId || capsule.revision !== revision || !verifyEngineStateCapsule(capsule)) throw new StaleEngineStateError();
  return capsule;
}
function correctionGuidance(
  capsule: EngineStateCapsule,
  actorIds: readonly CombatantId[] = capsule.request?.actors ?? [],
): Readonly<Record<string, unknown>> {
  if (capsule.request === null) throw new RangeError('No turn proposal request is pending.');
  return {
    remaining_corrections: capsule.request.phase === 'initial' ? 1 : 0,
    required_actor_ids: actorIds,
    replace_whole_round: capsule.request.phase === 'speculative' || capsule.request.kind !== 'plan_adjustment',
  };
}
function resolutionPreview(resolution: Extract<ReturnType<PureTurnProposalResolver['resolve']>, { readonly valid: true }>): Readonly<Record<string, unknown>> {
  return { actor_id: resolution.mechanics.actorId, option_id: resolution.mechanics.optionId, action_slot_count: resolution.mechanics.actionSlots.length, movement_feet: resolution.mechanics.movementCostFeet, resolution_digest: resolution.resolutionDigest, summary: resolution.summary };
}
function disallowedLocator(locator: string): boolean {
  const normalized = locator.replaceAll('\\', '/').toLowerCase();
  return normalized.includes('content/cc-by-sa/') || normalized.startsWith('file:') || normalized.startsWith('http:') || normalized.startsWith('https:') || normalized.includes('..');
}
function allowedRule(rules: AllowlistedRulesSource, reference: { readonly rule_id: string; readonly source_locator: string }): AllowlistedRuleEntry | null {
  if (disallowedLocator(reference.source_locator)) return null;
  const entry = rules.get(reference.rule_id);
  return entry !== null && entry.sourceLocator === reference.source_locator && !disallowedLocator(entry.sourceLocator) && entry.attribution.trim().length > 0 ? entry : null;
}

export function renderEnginePrompt(kind: 'plan_round' | 'correct_proposal', capsule: EngineStateCapsule, rules: AllowlistedRulesSource, voice?: string, turnContext?: unknown): string {
  const entries = capsule.rulesIndex.flatMap((reference) => {
    const entry = allowedRule(rules, { rule_id: reference.ruleId, source_locator: reference.sourceLocator });
    return entry === null ? [] : [{ rule_id: entry.ruleId, source_locator: entry.sourceLocator, text: entry.text, attribution: entry.attribution }];
  });
  const uriBase = `engine://run/${encodeURIComponent(capsule.runId)}`;
  const adjustment = capsule.request?.phase !== 'speculative' && capsule.request?.kind === 'plan_adjustment';
  const fixed = adjustment
    ? kind === 'plan_round'
      ? 'Review the current remaining monster plan, then use engine.submit_plan_adjustment once. Submit zero to the stated adjustment budget of open-actor replacement proposals; omitted actors keep their baseline proposals and an empty updates list explicitly keeps the plan. Do not change reaction guidance. Never emit coordinates, paths, dice, modifiers, DCs, damage, or reducer commands.'
      : 'Correct only the refused plan-adjustment actors once with engine.submit_plan_adjustment. Valid staged updates remain accepted. No fallback remains after this correction; every correction fallback_option_id must be null. Omitted refused actors keep their baseline proposals.'
    : kind === 'plan_round'
      ? 'Use engine.get_turn_context, then engine.submit_round_proposals once for the complete required actor set. Select only offered revision-bound option ids. You may declare reaction_guidance for foreseeable Reactions; it persists until replaced. Never emit coordinates, paths, dice, modifiers, DCs, damage, or reducer commands.'
      : 'Correct the complete refused proposal request once. No fallback remains after this correction; correction fallback_option_id must be null. If you refresh context, use the get_turn_context request in current_context exactly.';
  return [fixed, `Turn resource: ${uriBase}/turn/current`, `Proposal schema: ${uriBase}/schema/turn-proposal-v1`, `<engine-data-json>${canonicalJson({ run_id: capsule.runId, revision: capsule.revision, request: capsule.request, voice: voice ?? null, recent_changes: recentChanges(capsule), current_context: turnContext ?? null, rules: entries })}</engine-data-json>`].join('\n');
}

export function createEngineMcpApplication(dependencies: EngineMcpDependencies): EngineMcpApplication {
  if (dependencies.maximumToolResultBytes !== undefined && dependencies.maximumToolResultBytes > 64 * 1024) {
    throw new RangeError('maximumToolResultBytes cannot exceed the 64 KiB hard limit.');
  }
  if (dependencies.maximumResourceBytes !== undefined && dependencies.maximumResourceBytes > 128 * 1024) {
    throw new RangeError('maximumResourceBytes cannot exceed the 128 KiB hard limit.');
  }
  const { state, stateSource: feed, proposals, speculativePlans, narration, adjudications, rules } = dependencies;
  const { queries, turnProposals } = dependencies;
  const idempotency = new Map<string, { readonly bytes: string; readonly result: unknown }>();
  const applicationCursors = new Map<string, { readonly digest: string; readonly key: string; readonly offset: number }>();
  const opportunityReports = new Map<string, ReturnType<typeof actorOpportunityReport>>();
  const teamPlanReports = new Map<string, TeamPlanFrontierReport>();
  function opportunityReport(capsule: EngineStateCapsule, actorId: CombatantId) {
    const key = `${capsule.digest}:${actorId}`;
    const prior = opportunityReports.get(key);
    if (prior !== undefined) return prior;
    const report = actorOpportunityReport(state, actorId, queries, capsule.revision);
    opportunityReports.set(key, report);
    return report;
  }
  function teamPlanReport(
    capsule: EngineStateCapsule,
    plays: ReturnType<typeof SNIPPET_REGISTRY.applicable>,
  ): TeamPlanFrontierReport | null {
    if (plays.length === 0) return null;
    const key = `${capsule.digest}:${plays.map((play) => play.snippetHash).join(':')}`;
    const prior = teamPlanReports.get(key);
    if (prior !== undefined) return prior;
    const report = scoreTeamPlans(state, plays.map((play) => ({
      candidateId: play.name,
      label: play.description,
      proposals: SNIPPET_REGISTRY.expand(play.name, capsule).proposals,
    })), queries);
    teamPlanReports.set(key, report);
    return report;
  }
  function applicationPage<T>(capsule: EngineStateCapsule, key: string, values: readonly T[], pageValue: unknown): { readonly values: readonly T[]; readonly truncated: boolean; readonly next: string | null } {
    const pageInput = pageValue === undefined ? {} : record(pageValue, 'page');
    const maximum = typeof pageInput['maximum_items'] === 'number' ? pageInput['maximum_items'] : 100;
    let offset = 0;
    if (pageInput['cursor'] !== undefined) {
      const cursor = stringField(pageInput, 'cursor');
      const entry = applicationCursors.get(cursor);
      if (entry === undefined || entry.digest !== capsule.digest || entry.key !== key) throw new RangeError('INVALID_CURSOR');
      offset = entry.offset;
    }
    const selected = values.slice(offset, offset + maximum);
    const nextOffset = offset + selected.length;
    if (nextOffset >= values.length) return { values: selected, truncated: false, next: null };
    const next = `app:${sha256(canonicalJson({ run: capsule.runId, digest: capsule.digest, key, offset: nextOffset })).slice(0, 48)}`;
    applicationCursors.set(next, { digest: capsule.digest, key, offset: nextOffset });
    return { values: selected, truncated: true, next };
  }
  function currentRequest(
    capsule: EngineStateCapsule,
    requestId: string,
    phase: string,
  ): Extract<NonNullable<EngineStateCapsule['request']>, { readonly phase: 'initial' | 'correction' }> {
    const request = capsule.request;
    if (request === null || request.phase === 'speculative' ||
      request.requestId !== requestId || request.phase !== phase) throw new RangeError('REQUEST_MISMATCH');
    return request;
  }
  function idempotent(key: string, input: unknown, create: () => unknown): unknown {
    const bytes = canonicalJson(input);
    const prior = idempotency.get(key);
    if (prior !== undefined) {
      if (prior.bytes !== bytes) throw new RangeError('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT');
      return prior.result;
    }
    const result = create();
    idempotency.set(key, { bytes, result: structuredClone(result) });
    return result;
  }
  function proposalWithPlayObjective(
    capsule: EngineStateCapsule,
    proposal: EngineTurnProposal,
  ): EngineTurnProposal {
    if (proposal.overrideJustification !== null) return proposal;
    const dominance = submissionDominance(
      opportunityReport(capsule, proposal.actorId),
      proposal.primaryOptionId,
    );
    return dominance.status === 'dominated'
      ? {
          ...proposal,
          overrideJustification: {
            reason: 'objective',
            note: 'The engine-authored tactical play intentionally coordinates this option.',
          },
        }
      : proposal;
  }
  function fullTurnContext(
    capsule: EngineStateCapsule,
    input: Readonly<Record<string, unknown>>,
  ): Readonly<Record<string, unknown>> {
    const requested = Array.isArray(input['actor_ids']) ? input['actor_ids'].map((id) => combatantId(String(id))) : capsule.request?.actors ?? [];
    const required = input['scope'] === 'active_turn' && capsule.projection.activeCombatant !== null ? [capsule.projection.activeCombatant] : requested;
    const maximum = typeof input['maximum_options_per_actor'] === 'number' ? input['maximum_options_per_actor'] : 20;
    const includeExpectations = input['include_expectations'] !== false;
    const exactIntel = exactDmIntelMatrix(state, capsule, queries, required);
    const contextualIntel = required.flatMap((actorId) => {
      const rows = topDmActorIntelRows(exactIntel, actorId);
      const repositioning = rows.find((row) => row.rangeBand === 'long' || !row.rangeLegal);
      return repositioning === undefined ? rows.slice(0, 1) : [repositioning];
    });
    const movementIntel = movementOptionsIntel(state, capsule, queries, contextualIntel);
    const actors = [...required].sort().map((actorId) => {
      const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
      if (actor === undefined) throw new RangeError(`ACTOR_ABSENT:${actorId}`);
      const all = tacticalOptions(state, queries, capsule, actorId, includeExpectations, true);
      const intelRows = topDmActorIntelRows(exactIntel, actorId);
      const opportunity = opportunityReport(capsule, actorId);
      return {
        actor_id: actorId,
        status: actorStatus(actor),
        options: all.slice(0, maximum),
        threats: [...threats(state, queries, actorId)],
        intel: {
          policy: DM_TURN_INTEL_POLICY,
          zero_movement_offense_count: exactIntel.filter((row) =>
            row.actorId === actorId && row.minimumMovementFeet === 0).length,
          rows: intelRows.map(renderDmContextIntelRow),
          movement: movementIntel.status === 'resolved'
            ? movementIntel.rows.filter((row) => row.actorId === actorId)
              .slice(0, 3).map(renderMovementContextRow)
            : [],
          opportunity_cost: renderDodgeOpportunityCost(opportunity),
          salient_window: salientInitiativeWindow(capsule, intelRows),
        },
        omitted: all.length > maximum,
      };
    });
    const adjustmentRequest = capsule.request?.phase !== 'speculative' && capsule.request?.kind === 'plan_adjustment'
      ? capsule.request
      : null;
    const advertisedPlays = adjustmentRequest === null ? SNIPPET_REGISTRY.applicable(capsule) : [];
    const teamReport = teamPlanReport(capsule, advertisedPlays);
    const frontierCandidateIds = new Set(teamReport?.frontier.map((entry) =>
      entry.candidate.candidateId) ?? []);
    const applicablePlays = advertisedPlays.filter((play) => frontierCandidateIds.has(play.name));
    const result = {
      granularity: 'full' as const,
      context_trimmed: false,
      state_ref: externalStateRef(capsule),
      request: capsule.request === null || capsule.request.phase === 'speculative' ? null : {
        kind: capsule.request.kind ?? 'round_plan',
        request_id: capsule.request.requestId, phase: capsule.request.phase,
        correction_number: capsule.request.correctionNumber,
        required_actor_ids: capsule.request.actors,
        ...(adjustmentRequest === null ? {} : {
          baseline_plan_hash: adjustmentRequest.baselinePlanHash,
          adjustment_budget: adjustmentRequest.adjustmentBudget,
        }),
      },
      summary: tacticalSummary(capsule), actors: actors.map(({ omitted: _omitted, ...actor }) => actor), recent_changes: [...recentChanges(capsule)],
      ...(dependencies.toolProfile === 'dm' ? {
        known_failure_modes: renderEngineFailureModes(),
      } : {}),
      applicable_plays: applicablePlays.map((play) => ({
        name: play.name,
        description: play.description,
        snippet_hash: play.snippetHash,
      })),
      team_plan_frontier: teamReport === null ? null : renderTeamPlanFrontier(teamReport),
      ...(adjustmentRequest === null ? {} : {
        materiality: renderMaterialityContext(adjustmentRequest.materialityReasonCodes, state),
        current_plan: {
          parent_plan_id: adjustmentRequest.parentPlanId,
          baseline_plan_hash: adjustmentRequest.baselinePlanHash,
          open_actor_proposals: adjustmentRequest.baselineProposalDigests.map((entry) => ({
            actor_id: entry.actorId,
            proposal_digest: entry.proposalDigest,
          })),
        },
      }),
      truncated: actors.some((actor) => actor.omitted), next_cursor: null,
    };
    const topPlay = applicablePlays.length === 1 ? applicablePlays[0] : undefined;
    const suggestedPlan = topPlay === undefined
      ? null
      : (() => {
        const draft = SNIPPET_REGISTRY.expand(topPlay.name, capsule);
        const plan = {
          play_name: topPlay.name,
          snippet_hash: topPlay.snippetHash,
          proposals: draft.proposals.map((proposal) =>
            externalProposal(proposalWithPlayObjective(capsule, proposal))),
          advisory: SUGGESTED_PLAN_ADVISORY,
        };
        const bytes = new TextEncoder().encode(JSON.stringify(plan)).byteLength;
        if (bytes > SUGGESTED_PLAN_MAX_BYTES) {
          throw new RangeError(`SUGGESTED_PLAN_TOO_LARGE: ${String(bytes)} UTF-8 bytes exceeds the ${String(SUGGESTED_PLAN_MAX_BYTES)}-byte limit.`);
        }
        return plan;
      })();
    let output: Readonly<Record<string, unknown>> = suggestedPlan === null
      ? result
      : { ...result, suggested_plan: suggestedPlan };
    const markContextTrimmed = (): void => {
      result.truncated = true;
      result.context_trimmed = true;
      if (suggestedPlan !== null && output !== result) {
        output = { ...output, truncated: true, context_trimmed: true };
      }
    };
    const frontierDetailLevels = ['candidate_summary', 'summary', 'omitted'] as const;
    let frontierDetailIndex = 0;
    const compactTeamPlanFrontier = (): boolean => {
      const detailLevel = frontierDetailLevels[frontierDetailIndex];
      if (teamReport === null || detailLevel === undefined) return false;
      frontierDetailIndex += 1;
      result.team_plan_frontier = renderTeamPlanFrontier(teamReport, detailLevel);
      markContextTrimmed();
      if (suggestedPlan !== null && output !== result) {
        output = { ...result, suggested_plan: suggestedPlan };
      }
      return true;
    };
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.options.length > 0);
      if (actor === undefined) break;
      actor.options.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES &&
      compactTeamPlanFrontier()) {
      // Each iteration advances to the next schema-valid compact representation.
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.movement.length > 1);
      if (actor === undefined) break;
      actor.intel.movement.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.rows.length > 1);
      if (actor === undefined) break;
      actor.intel.rows.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.threats.length > 0);
      if (actor === undefined) break;
      actor.threats.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES &&
      result.recent_changes.length > 0) {
      result.recent_changes.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES &&
      result.summary.terrain_tags.length > 0) {
      result.summary.terrain_tags.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.rows.length > 0);
      if (actor === undefined) break;
      actor.intel.rows.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.movement.length > 0);
      if (actor === undefined) break;
      actor.intel.movement.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.opportunity_cost !== null);
      if (actor === undefined) break;
      actor.intel.opportunity_cost = null;
      markContextTrimmed();
    }
    if (suggestedPlan !== null &&
      new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES) {
      result.truncated = true;
      result.context_trimmed = true;
      output = result;
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > TURN_CONTEXT_MAX_BYTES &&
      result.actors.length > 1) {
      result.actors.pop();
      markContextTrimmed();
    }
    return output;
  }
  function execute(name: string, value: unknown): unknown {
    const input = record(value, `${name} arguments`);
    if (name === 'engine.get_turn_context') {
      const capsule = exactCurrent(feed, stringField(input, 'run_id'), numberField(input, 'expected_revision'));
      if (capsule.request === null) throw new RangeError('NO_PENDING_REQUEST');
      if (capsule.request.phase === 'speculative') throw new RangeError('SPECULATIVE_CONTEXT_USES_CAPSULE_MENU');
      const full = fullTurnContext(capsule, input);
      const base = dependencies.turnContextDeltaBase;
      const context = input['granularity'] !== 'turn_delta' || base === undefined ||
        input['since_revision'] !== base.revision ||
        base.context['granularity'] !== 'full'
        ? full
        : (() => {
            const baseStateRef = record(base.context['state_ref'], 'turn context delta base state_ref');
            if (baseStateRef['run_id'] !== capsule.runId ||
              baseStateRef['expected_revision'] !== base.revision) return full;
            return {
              granularity: 'turn_delta' as const,
              anchor: {
                base_revision: base.revision,
                revision: capsule.revision,
                base_context_hash: sha256(canonicalJson(base.context)),
                context_hash: sha256(canonicalJson(full)),
                state_ref: full['state_ref'],
                request: full['request'],
              },
              changes: diffTurnContextValues(base.context, full),
              context_trimmed: full['context_trimmed'],
            };
          })();
      dependencies.onTurnContext?.(structuredClone(context));
      return context;
    }
    if (name === 'engine.propose_from_play') {
      const capsule = feed.current();
      if (capsule.request === null) throw new RangeError('NO_PENDING_REQUEST');
      if (capsule.request.phase !== 'initial' || capsule.request.kind === 'plan_adjustment') {
        throw new RangeError('PLAY_NOT_APPLICABLE_TO_REQUEST');
      }
      const requestedName = stringField(input, 'play_name');
      if (!PLAY_NAMES.some((candidate) => candidate === requestedName)) {
        throw new RangeError(`Unknown play ${requestedName}.`);
      }
      const playName = requestedName as PlayName;
      const advertised = SNIPPET_REGISTRY.applicable(capsule);
      const report = teamPlanReport(capsule, advertised);
      if (report === null || !report.frontier.some((entry) =>
        entry.candidate.candidateId === playName)) {
        throw new RangeError(`PLAY_DOMINATED:${playName}`);
      }
      const draft = SNIPPET_REGISTRY.expand(playName, capsule);
      return {
        state_ref: externalStateRef(capsule),
        play_name: playName,
        snippet_hash: draft.definition.snippetHash,
        proposals: draft.proposals.map((proposal) =>
          externalProposal(proposalWithPlayObjective(capsule, proposal))),
      };
    }
    const capsule = feed.read(stateReference(input['state_ref']));
    if (name === 'engine.query_tactical_intel') {
      const actorIds = Array.isArray(input['actor_ids'])
        ? input['actor_ids'].map((value) => combatantId(String(value)))
        : capsule.request?.actors ?? [];
      const targetIds = Array.isArray(input['target_ids'])
        ? new Set(input['target_ids'].map((value) => combatantId(String(value))))
        : null;
      const matrix = exactDmIntelMatrix(state, capsule, queries, actorIds)
        .filter((row) => targetIds === null || targetIds.has(row.targetId));
      const requestedPage = input['page'] === undefined ? {} : record(input['page'], 'page');
      const pageInput = {
        ...requestedPage,
        maximum_items: typeof requestedPage['maximum_items'] === 'number'
          ? requestedPage['maximum_items'] : 20,
      };
      const paged = applicationPage(
        capsule,
        canonicalJson({ actorIds, targetIds: targetIds === null ? null : [...targetIds].sort() }),
        matrix,
        pageInput,
      );
      const movement = movementOptionsIntel(state, capsule, queries, paged.values);
      const initiativeInput = input['initiative'] === undefined
        ? null : record(input['initiative'], 'initiative');
      const initiativeMode = initiativeInput === null ? 'none' : stringField(initiativeInput, 'mode');
      const initiative = initiativeMode === 'full'
        ? fullInitiativeIntel(capsule)
        : initiativeMode === 'pairwise'
          ? pairwiseInitiativeIntel(capsule, Array.isArray(initiativeInput?.['pairs'])
            ? initiativeInput['pairs'].map((value) => {
                const pair = record(value, 'initiative pair');
                return {
                  actorId: combatantId(stringField(pair, 'actor_id')),
                  targetId: combatantId(stringField(pair, 'target_id')),
                };
              })
            : [])
          : null;
      return {
        state_ref: externalStateRef(capsule),
        policy: DM_INTEL_QUERY_POLICY,
        renderer_policy: DM_TURN_INTEL_POLICY,
        evaluator_policy: TACTICAL_EVALUATOR_POLICY,
        rows: paged.values.map(renderDmIntelRow),
        movement_policy: MOVEMENT_OPTIONS_INTEL_POLICY,
        movement_rows: movement.status === 'resolved'
          ? movement.rows.filter((row) => paged.values.some((value) =>
            value.actorId === row.actorId && value.targetId === row.targetId)).map(renderMovementIntelRow)
          : [],
        opportunity_policy: OPPORTUNITY_COST_POLICY,
        correction_policy: DOMINANCE_CORRECTION_POLICY,
        opportunity_costs: actorIds.map((actorId) =>
          renderDodgeOpportunityCost(opportunityReport(capsule, actorId)))
          .filter((value): value is Readonly<Record<string, unknown>> => value !== null),
        initiative,
        truncated: paged.truncated,
        next_cursor: paged.next,
      };
    }
    if (name === 'engine.get_state_summary') {
      const granularity = stringField(input, 'granularity');
      if (granularity === 'combatant_detail' && !Array.isArray(input['combatant_ids'])) throw new RangeError('combatant_ids are required.');
      if (granularity === 'journal_delta' && typeof input['since_revision'] !== 'number') throw new RangeError('since_revision is required.');
      const ids = Array.isArray(input['combatant_ids']) ? input['combatant_ids'].map(String) : null;
      const combatants = capsule.projection.combatants.filter((actor) => ids === null || ids.includes(actor.id)).sort((left, right) => left.id.localeCompare(right.id)).map((actor) => ({
        combatant_id: actor.id,
        name: actor.name,
        side: actor.side,
        status: actorStatus(actor),
        options: granularity === 'combatant_detail' ? tacticalOptions(state, queries, capsule, actor.id, true, true) : [],
        threats: granularity === 'turn_minimal' || granularity === 'combatant_detail' ? threats(state, queries, actor.id) : [],
      }));
      const history = recentChanges(capsule).filter((entry) => typeof input['since_revision'] !== 'number' || Number(entry['revision']) > input['since_revision']);
      const source = granularity === 'journal_delta' ? history : combatants;
      const paged = applicationPage(capsule, canonicalJson({ granularity, ids, since: input['since_revision'] ?? null }), source, input['page']);
      return { state_ref: externalStateRef(capsule), granularity, proof_token: engineStateSummaryProofToken(capsule.digest, granularity), summary: { room: capsule.projection.room, round: capsule.projection.round, active_side: capsule.projection.activeSide, combatants: granularity === 'journal_delta' ? [] : paged.values, terrain_tags: tacticalSummary(capsule)['terrain_tags'], history: granularity === 'journal_delta' ? paged.values : history }, truncated: paged.truncated, next_cursor: paged.next };
    }
    if (name === 'engine.get_combatant_options') {
      const actorId = combatantId(stringField(input, 'actor_id'));
      const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
      if (actor === undefined) throw new RangeError('ACTOR_ABSENT');
      const all = tacticalOptions(state, queries, capsule, actorId, input['include_unavailable'] === true, input['include_unavailable'] === true);
      const paged = applicationPage(capsule, canonicalJson({ actorId, unavailable: input['include_unavailable'] === true }), all, input['page']);
      return { state_ref: externalStateRef(capsule), actor_id: actorId, status: actorStatus(actor), options: paged.values, truncated: paged.truncated, next_cursor: paged.next };
    }
    if (name === 'engine.query_path') {
      const actorId = combatantId(stringField(input, 'actor_id'));
      const objective = record(input['objective'], 'objective');
      const targetId = queries.resolveTarget(state, actorId, decodeTarget(objective['target']));
      const targetCell = targetId === null ? null : queries.tokenPosition(state, targetId);
      if (targetId === null || targetCell === null) return { state_ref: externalStateRef(capsule), feasible: false, minimum_feet: null, risks: [], resulting_relation: null, refusals: [{ code: 'TARGET_ABSENT', summary: 'The semantic target did not resolve.' }] };
      const movement = decodeMovement(input['movement']);
      const maximumFeet = movement.willingness === 'none' ? 0 : movement.maximumFeet;
      const candidates: { readonly cell: GridCell; readonly cost: number }[] = [];
      for (let row = 0; row < state.bounds.rows; row += 1) for (let column = 0; column < state.bounds.columns; column += 1) {
        const cell = { row, column };
        const path = queries.path(state, { actorId, destination: cell, movement: 'normal', ...(maximumFeet === undefined ? {} : { maximumFeet }) });
        if (!path.legal) continue;
        const kind = stringField(objective, 'kind');
        const actionId = typeof objective['action_id'] === 'string' ? objective['action_id'] : null;
        const relation = gridDistance(cell, targetCell);
        const qualifies = kind === 'enable_action' && actionId !== null ? queries.reach(state, { actorId, targetId, actionId, origin: cell }).legal
          : kind === 'withdraw_from' ? relation > gridDistance(queries.tokenPosition(state, actorId) ?? cell, targetCell)
            : kind === 'maintain_range_from' ? relation > 5 : true;
        if (qualifies) candidates.push({ cell, cost: path.costFeet });
      }
      candidates.sort((left, right) => left.cost - right.cost || gridDistance(left.cell, targetCell) - gridDistance(right.cell, targetCell) || left.cell.row - right.cell.row || left.cell.column - right.cell.column);
      const selected = candidates[0];
      return selected === undefined
        ? { state_ref: externalStateRef(capsule), feasible: false, minimum_feet: null, risks: [], resulting_relation: null, refusals: [{ code: 'OBJECTIVE_UNREACHABLE', summary: 'No legal path satisfies the semantic objective.' }] }
        : { state_ref: externalStateRef(capsule), feasible: true, minimum_feet: selected.cost, risks: [], resulting_relation: `${distanceBand(gridDistance(selected.cell, targetCell))} from ${targetId}`, refusals: [] };
    }
    if (name === 'engine.query_reach' || name === 'engine.query_cover' || name === 'engine.query_visibility') {
      const queryValues = input['queries'];
      if (!Array.isArray(queryValues)) throw new TypeError('queries must be an array.');
      const results = queryValues.map((value) => {
        const query = record(value, 'query');
        const actorId = combatantId(stringField(query, 'actor_id'));
        const targetId = queries.resolveTarget(state, actorId, decodeTarget(query['target']));
        const queryId = stringField(query, 'query_id');
        if (targetId === null) return { query_id: queryId, status: 'unknown', facts: name === 'engine.query_reach' ? { distance_band: 'unknown', action_range_feet: null, reachable_now: false, reachable_after_movement: false, minimum_movement_feet: null } : name === 'engine.query_cover' ? { tier: 'unknown', source_ids: [] } : { actor_can_perceive_target: false, target_can_perceive_actor: false, required_sense: 'unknown', reason_codes: ['TARGET_ABSENT'] }, refusals: [{ code: 'TARGET_ABSENT', summary: 'The semantic target did not resolve.' }] };
        if (name === 'engine.query_cover') {
          const cover = queries.cover(state, actorId, targetId);
          return { query_id: queryId, status: cover === null ? 'unknown' : cover.tier === 'total' ? 'no' : 'yes', facts: { tier: cover?.tier ?? 'unknown', source_ids: cover?.sourceIds ?? [] }, refusals: cover === null ? [{ code: 'TOKEN_ABSENT', summary: 'Cover cannot be resolved without both tokens.' }] : [] };
        }
        if (name === 'engine.query_visibility') {
          const visible = queries.visibility(state, actorId, targetId);
          return { query_id: queryId, status: visible === null ? 'unknown' : visible.visible ? 'yes' : 'no', facts: { actor_can_perceive_target: visible?.visible ?? false, target_can_perceive_actor: visible?.reciprocal ?? false, required_sense: visible?.sense ?? 'unknown', reason_codes: visible?.reason === null || visible === null ? [] : [visible.reason.toUpperCase()] }, refusals: visible === null ? [{ code: 'TOKEN_ABSENT', summary: 'Visibility cannot be resolved without both tokens.' }] : [] };
        }
        const actionId = typeof query['action_id'] === 'string' ? query['action_id'] : '';
        const reach = actionId.length === 0 ? null : queries.reach(state, { actorId, targetId, actionId });
        const actorCell = queries.tokenPosition(state, actorId);
        const targetCell = queries.tokenPosition(state, targetId);
        const distance = actorCell === null || targetCell === null ? null : gridDistance(actorCell, targetCell);
        const after = query['after_movement'] === undefined ? null : record(execute('engine.query_path', { state_ref: input['state_ref'], actor_id: actorId, objective: { kind: 'enable_action', action_id: actionId, target: query['target'] }, movement: query['after_movement'], ...(query['engagement'] === undefined ? {} : { engagement: query['engagement'] }) }), 'path result');
        const afterFeasible = after?.['feasible'] === true;
        return { query_id: queryId, status: reach?.legal === true ? 'yes' : afterFeasible ? 'conditional' : reach === null ? 'unknown' : 'no', facts: { distance_band: distance === null ? 'unknown' : distanceBand(distance), action_range_feet: reach?.legal === true ? reach.rangeFeet : null, reachable_now: reach?.legal === true, reachable_after_movement: afterFeasible, minimum_movement_feet: afterFeasible && typeof after?.['minimum_feet'] === 'number' ? after['minimum_feet'] : null }, refusals: reach !== null && !reach.legal ? reach.codes.map((code) => ({ code: code.toUpperCase(), summary: `${actionId}: ${code}` })) : [] };
      });
      return { state_ref: externalStateRef(capsule), results };
    }
    if (name === 'engine.query_dice_expectation') {
      const candidateValues = input['candidates'];
      if (!Array.isArray(candidateValues)) throw new TypeError('candidates must be an array.');
      const includeDistribution = input['include_distribution'] === true;
      return { state_ref: externalStateRef(capsule), results: candidateValues.map((value) => {
        const candidate = record(value, 'candidate');
        const actorId = combatantId(stringField(candidate, 'actor_id'));
        const choice = decodeChoice(candidate['choice']);
        const targetId = 'target' in choice && choice.target !== null ? queries.resolveTarget(state, actorId, choice.target) : null;
        const actionId = choice.kind === 'attack' || choice.kind === 'use_action' ? choice.actionId : choice.kind === 'cast_spell' ? choice.spellId : choice.kind;
        const expectation = expectationFor(state, queries, actorId, actionId, targetId);
        return expectation === null || expectation['resolvable'] !== true
          ? { candidate_id: stringField(candidate, 'candidate_id'), policy: TACTICAL_EVALUATOR_POLICY, resolvable: false, metrics: { outcome_probability: null, expected_damage: null, expected_healing: null, resource_cost: null, distribution: null }, assumptions: expectation?.['assumption_codes'] ?? [], refusals: [{ code: 'EXPECTATION_UNAVAILABLE', summary: 'The canonical mechanic does not expose an analytic expectation.' }] }
          : { candidate_id: stringField(candidate, 'candidate_id'), policy: expectation['policy'], resolvable: true, metrics: { outcome_probability: expectation['outcome_probability'], expected_damage: expectation['expected_value'], expected_healing: null, resource_cost: 0, distribution: includeDistribution ? [{ outcome: 0, probability: 1 - Number(expectation['outcome_probability']) }, { outcome: Number(expectation['expected_value']) / Number(expectation['outcome_probability']), probability: expectation['outcome_probability'] }] : null }, assumptions: expectation['assumption_codes'], refusals: [] };
      }) };
    }
    if (name === 'engine.validate_proposal') {
      const request = currentRequest(capsule, stringField(input, 'request_id'), stringField(input, 'phase'));
      const proposal = decodeProposal(input['proposal']);
      if (!request.actors.includes(proposal.actorId)) throw new RangeError('ACTOR_NOT_PENDING');
      if (proposal.expectedRevision !== capsule.revision) throw new RangeError('PROPOSAL_REVISION_MISMATCH');
      const resolution = turnProposals.resolve(state, proposal);
      return resolution.valid
        ? { state_ref: externalStateRef(capsule), valid: true, selected_branch: resolution.selectedBranch, resolution: resolutionPreview(resolution), refusals: [], correction_guidance: null }
        : { state_ref: externalStateRef(capsule), valid: false, selected_branch: 'none', resolution: null, refusals: resolution.refusals.map((entry) => ({ code: entry.code, summary: entry.summary })), correction_guidance: correctionGuidance(capsule) };
    }
    if (name === 'engine.submit_round_proposals') {
      const request = currentRequest(capsule, stringField(input, 'request_id'), stringField(input, 'phase'));
      if (request.kind === 'plan_adjustment') throw new RangeError('REQUEST_KIND_MISMATCH');
      const proposalValues = input['proposals'];
      if (!Array.isArray(proposalValues)) throw new TypeError('proposals must be an array.');
      const decoded = proposalValues.map(decodeProposal);
      const actual = decoded.map((proposal) => proposal.actorId);
      const expected = [...request.actors].sort();
      const normalized = [...actual].sort();
      const actorSetValid = new Set(actual).size === actual.length && expected.length === normalized.length && expected.every((actor, index) => actor === normalized[index]);
      const canonical = actorSetValid
        ? request.actors.map((actorId) => decoded.find((proposal) => proposal.actorId === actorId)).filter((proposal): proposal is EngineTurnProposal => proposal !== undefined)
        : decoded;
      const resolved = canonical.map((proposal) => ({ proposal, resolution: turnProposals.resolve(state, proposal) }));
      const dominanceRefusals = resolved.flatMap(({ proposal, resolution }) => {
        if (!resolution.valid || proposal.overrideJustification !== null) return [];
        const dominance = submissionDominance(
          opportunityReport(capsule, proposal.actorId),
          resolution.option.optionId,
        );
        return dominance.status !== 'dominated' ? [] : [{
          actor_id: proposal.actorId,
          codes: ['DOMINATED_OPTION_REQUIRES_OVERRIDE'],
          summary: dominance.delta,
          attempt_rejections: [{
            attempt: resolution.selectedBranch,
            declared_option_id: resolution.option.optionId,
            rejection_reasons: [dominance.delta],
          }],
        }];
      });
      const invalid = [
        ...(actorSetValid ? [] : [{
          actor_id: request.actors[0], codes: ['ROUND_ACTOR_SET_MISMATCH'],
          summary: 'Round submission must contain one proposal for each required actor exactly once.',
          attempt_rejections: [{
            attempt: 'primary' as const,
            declared_option_id: decoded[0]?.primaryOptionId ?? null,
            rejection_reasons: ['Round submission must contain one proposal for each required actor exactly once.'],
          }],
        }]),
        ...resolved.flatMap(({ proposal, resolution }) => resolution.valid ? [] : [{
          actor_id: proposal.actorId,
          codes: resolution.refusals.map((entry) => entry.code),
          summary: resolution.refusals.map((entry) => entry.summary).join('; '),
          attempt_rejections: (['primary', 'fallback'] as const).flatMap((attempt) => {
            const reasons = resolution.refusals
              .filter((entry) => entry.branch === attempt)
              .map((entry) => entry.summary);
            return reasons.length === 0 ? [] : [{
              attempt,
              declared_option_id: attempt === 'primary' ? proposal.primaryOptionId : proposal.fallbackOptionId,
              rejection_reasons: reasons,
            }];
          }),
        }]),
        ...dominanceRefusals,
      ];
      if (invalid.length > 0) return { status: 'rejected', state_ref: externalStateRef(capsule), actor_refusals: invalid, correction_guidance: correctionGuidance(capsule) };
      const key = stringField(input, 'idempotency_key');
      const reactionGuidance = input['reaction_guidance'] === undefined
        ? null : decodeReactionGuidance(input['reaction_guidance']);
      return idempotent(key, input, () => {
        const valid = resolved.flatMap(({ proposal, resolution }) => resolution.valid ? [{ proposal, option: resolution.option, primaryOption: resolution.primaryOption, fallbackOption: resolution.fallbackOption, mechanics: resolution.mechanics, selectedBranch: resolution.selectedBranch, resolutionDigest: resolution.resolutionDigest, summary: resolution.summary }] : []);
        const proposalId = `round:${sha256(canonicalJson({ digest: capsule.digest, key, valid, reactionGuidance })).slice(0, 48)}`;
        submitEngineProposal(feed, proposals, { kind: 'round_turn_proposal', proposalId, runId: capsule.runId, branchId: capsule.branchId, requestId: request.requestId, expectedRevision: capsule.revision, stateDigest: capsule.digest, stateHandle: engineStateHandle(capsule), phase: request.phase, idempotencyKey: key, resolutions: valid, reactionGuidance, submittedArguments: structuredClone(input), intelCapture: captureDmIntel(state, capsule, queries) });
        return { status: 'proposed', round_proposal_id: proposalId, state_ref: externalStateRef(capsule), actor_resolutions: valid.map((entry) => ({ actor_id: entry.proposal.actorId, selected_branch: entry.selectedBranch, resolution_digest: entry.resolutionDigest, summary: entry.summary })) };
      });
    }
    if (name === 'engine.submit_plan_adjustment') {
      const request = currentRequest(capsule, stringField(input, 'request_id'), stringField(input, 'phase'));
      if (request.kind !== 'plan_adjustment') throw new RangeError('REQUEST_KIND_MISMATCH');
      if (stringField(input, 'baseline_plan_hash') !== request.baselinePlanHash) {
        throw new RangeError('BASELINE_PLAN_MISMATCH');
      }
      const updateValues = input['updates'];
      if (!Array.isArray(updateValues)) throw new TypeError('updates must be an array.');
      const decoded = updateValues.map(decodeProposal);
      const counts = new Map<CombatantId, number>();
      for (const proposal of decoded) counts.set(proposal.actorId, (counts.get(proposal.actorId) ?? 0) + 1);
      const overBudget = decoded.length > request.adjustmentBudget;
      const evaluated = decoded.map((proposal) => {
        const actor = state.combatants.find((candidate) => candidate.profile.id === proposal.actorId);
        const staticRefusal = overBudget
          ? { code: 'ADJUSTMENT_BUDGET_EXCEEDED', summary: `Adjustment contains more than ${String(request.adjustmentBudget)} replacement proposals.` }
          : (counts.get(proposal.actorId) ?? 0) > 1
            ? { code: 'DUPLICATE_ACTOR_UPDATE', summary: 'An adjustment may replace an open actor at most once.' }
            : actor?.life === 'dead'
              ? { code: 'ACTOR_DEAD', summary: 'A dead actor cannot receive a plan adjustment.' }
              : !request.actors.includes(proposal.actorId)
                ? { code: 'ACTOR_NOT_OPEN', summary: 'Only actors whose turns remain open may receive an adjustment.' }
                : null;
        if (staticRefusal !== null) return { proposal, resolution: null, staticRefusal };
        const resolution = turnProposals.resolve(state, proposal);
        if (resolution.valid && proposal.overrideJustification === null) {
          const dominance = submissionDominance(
            opportunityReport(capsule, proposal.actorId),
            resolution.option.optionId,
          );
          if (dominance.status === 'dominated') {
            return {
              proposal,
              resolution: null,
              staticRefusal: { code: 'DOMINATED_OPTION_REQUIRES_OVERRIDE', summary: dominance.delta },
            };
          }
        }
        return { proposal, resolution, staticRefusal: null };
      });
      const valid = evaluated.flatMap((entry) => entry.resolution?.valid === true ? [{
        proposal: entry.proposal,
        option: entry.resolution.option,
        primaryOption: entry.resolution.primaryOption,
        fallbackOption: entry.resolution.fallbackOption,
        mechanics: entry.resolution.mechanics,
        selectedBranch: entry.resolution.selectedBranch,
        resolutionDigest: entry.resolution.resolutionDigest,
        summary: entry.resolution.summary,
      }] : []);
      const refusals = evaluated.flatMap((entry) => {
        if (entry.staticRefusal !== null) return [{
          actor_id: entry.proposal.actorId,
          codes: [entry.staticRefusal.code],
          summary: entry.staticRefusal.summary,
          attempt_rejections: [{
            attempt: 'primary' as const,
            declared_option_id: entry.proposal.primaryOptionId,
            rejection_reasons: [entry.staticRefusal.summary],
          }],
        }];
        const resolution = entry.resolution;
        if (resolution === null || resolution.valid) return [];
        return [{
          actor_id: entry.proposal.actorId,
          codes: resolution.refusals.map((refusal) => refusal.code),
          summary: resolution.refusals.map((refusal) => refusal.summary).join('; '),
          attempt_rejections: (['primary', 'fallback'] as const).flatMap((attempt) => {
            const reasons = resolution.refusals.filter((refusal) => refusal.branch === attempt).map((refusal) => refusal.summary);
            return reasons.length === 0 ? [] : [{
              attempt,
              declared_option_id: attempt === 'primary' ? entry.proposal.primaryOptionId : entry.proposal.fallbackOptionId,
              rejection_reasons: reasons,
            }];
          }),
        }];
      });
      const key = stringField(input, 'idempotency_key');
      return idempotent(key, input, () => {
        const proposalId = `adjustment:${sha256(canonicalJson({ digest: capsule.digest, key, baselinePlanHash: request.baselinePlanHash, valid })).slice(0, 48)}`;
        if (refusals.length === 0 || valid.length > 0) {
          submitEngineProposal(feed, proposals, {
            kind: 'plan_adjustment_turn_proposal',
            proposalId,
            runId: capsule.runId,
            branchId: capsule.branchId,
            requestId: request.requestId,
            expectedRevision: capsule.revision,
            stateDigest: capsule.digest,
            stateHandle: engineStateHandle(capsule),
            phase: request.phase,
            idempotencyKey: key,
            baseline_plan_hash: request.baselinePlanHash,
            updates: valid,
            submittedArguments: structuredClone(input),
            intelCapture: captureDmIntel(state, capsule, queries),
          });
        }
        const actorResolutions = valid.map((entry) => ({
          actor_id: entry.proposal.actorId,
          selected_branch: entry.selectedBranch,
          resolution_digest: entry.resolutionDigest,
          summary: entry.summary,
        }));
        return refusals.length === 0
          ? { status: 'proposed', adjustment_proposal_id: proposalId, state_ref: externalStateRef(capsule), actor_resolutions: actorResolutions }
          : {
              status: 'rejected',
              staged_proposal_id: valid.length === 0 ? null : proposalId,
              state_ref: externalStateRef(capsule),
              staged_actor_resolutions: actorResolutions,
              actor_refusals: refusals,
              correction_guidance: correctionGuidance(capsule, [...new Set(refusals.map((entry) => combatantId(entry.actor_id)))]),
            };
      });
    }
    if (name === 'engine.submit_speculative_round_plan') {
      const requestCapsule = feed.read(stateReference(input['state_ref']));
      const request = requestCapsule.request;
      if (request === null || request.phase !== 'speculative' ||
        request.requestId !== stringField(input, 'request_id')) {
        throw new RangeError('SPECULATIVE_REQUEST_MISMATCH');
      }
      const branchValues = input['branches'];
      if (!Array.isArray(branchValues)) throw new TypeError('branches must be an array.');
      const branches = branchValues.map((value) => {
        const branch = record(value, 'speculative branch');
        const proposalValues = branch['proposals'];
        if (!Array.isArray(proposalValues)) throw new TypeError('branch proposals must be an array.');
        return {
          scenarioId: stringField(branch, 'scenario_id'),
          proposals: proposalValues.map(decodeProposal),
        };
      });
      const key = stringField(input, 'idempotency_key');
      const reactionGuidance = input['reaction_guidance'] === undefined
        ? null
        : decodeReactionGuidance(input['reaction_guidance']);
      return idempotent(key, input, () => {
        const envelope = submitSpeculativeRoundPlan(feed, speculativePlans, {
          kind: 'speculative_round_plan',
          schemaVersion: 2,
          runId: requestCapsule.runId,
          encounterBranchId: requestCapsule.branchId,
          requestId: request.requestId,
          sourceRevision: requestCapsule.revision,
          sourceDigest: requestCapsule.digest,
          stateHandle: engineStateHandle(requestCapsule),
          targetRoom: numberField(input, 'target_room'),
          targetMonsterRound: numberField(input, 'target_monster_round'),
          refreshGeneration: numberField(input, 'refresh_generation') as 0 | 1 | 2,
          branches,
          reactionGuidance,
          idempotencyKey: key,
        });
        return {
          status: envelope.status,
          speculative_plan_id: envelope.speculativePlanId,
          state_ref: externalStateRef(requestCapsule),
        };
      });
    }
    if (name === 'engine.submit_proposal') {
      const request = currentRequest(capsule, stringField(input, 'request_id'), stringField(input, 'phase'));
      if (request.kind === 'plan_adjustment') throw new RangeError('REQUEST_KIND_MISMATCH');
      const proposal = decodeProposal(input['proposal']);
      if (request.actors.length !== 1 || request.actors[0] !== proposal.actorId) return { status: 'rejected', state_ref: externalStateRef(capsule), refusals: [{ code: 'ACTOR_REQUIRES_WHOLE_ROUND', summary: 'This actor belongs to the pending shared-initiative whole-round request.' }], correction_guidance: correctionGuidance(capsule) };
      const resolution = turnProposals.resolve(state, proposal);
      if (!resolution.valid) return { status: 'rejected', state_ref: externalStateRef(capsule), refusals: resolution.refusals.map((entry) => ({ code: entry.code, summary: entry.summary })), correction_guidance: correctionGuidance(capsule) };
      const key = stringField(input, 'idempotency_key');
      const reactionGuidance = input['reaction_guidance'] === undefined
        ? null : decodeReactionGuidance(input['reaction_guidance']);
      return idempotent(key, input, () => {
        const proposalId = `turn:${sha256(canonicalJson({ digest: capsule.digest, key, proposal, reactionGuidance })).slice(0, 48)}`;
        submitEngineProposal(feed, proposals, { kind: 'turn_proposal', proposalId, runId: capsule.runId, branchId: capsule.branchId, requestId: request.requestId, expectedRevision: capsule.revision, stateDigest: capsule.digest, stateHandle: engineStateHandle(capsule), phase: request.phase, idempotencyKey: key, resolution: { proposal, option: resolution.option, primaryOption: resolution.primaryOption, fallbackOption: resolution.fallbackOption, mechanics: resolution.mechanics, selectedBranch: resolution.selectedBranch, resolutionDigest: resolution.resolutionDigest, summary: resolution.summary }, reactionGuidance });
        return { status: 'proposed', proposal_id: proposalId, state_ref: externalStateRef(capsule), selected_branch: resolution.selectedBranch, resolution_summary: resolutionPreview(resolution) };
      });
    }
    if (name === 'engine.emit_narration') {
      const request = currentRequest(capsule, stringField(input, 'request_id'), capsule.request?.phase ?? 'initial');
      const references = Array.isArray(input['rule_references']) ? input['rule_references'].map((value) => record(value, 'rule reference')) : [];
      const accepted = references.flatMap((reference) => {
        const entry = allowedRule(rules, { rule_id: stringField(reference, 'rule_id'), source_locator: stringField(reference, 'source_locator') });
        return entry === null ? [] : [{ ruleId: entry.ruleId, sourceLocator: entry.sourceLocator }];
      });
      const warnings = references.length === accepted.length ? [] : ['One or more unknown or disallowed rule references were omitted.'];
      const key = stringField(input, 'idempotency_key');
      return idempotent(key, input, () => {
        const narrationId = `narration:${sha256(canonicalJson({ digest: capsule.digest, key, text: input['text'] })).slice(0, 48)}`;
        submitEngineNarration(feed, narration, { kind: 'narration', narrationId, runId: capsule.runId, branchId: capsule.branchId, requestId: request.requestId, expectedRevision: capsule.revision, stateDigest: capsule.digest, stateHandle: engineStateHandle(capsule), idempotencyKey: key, voice: stringField(input, 'voice') as 'cinematic_visible_rolls' | 'terse_tactical' | 'rules_explicit' | 'terse_rule_citing_validation', text: stringField(input, 'text'), audience: stringField(input, 'audience') as 'shared' | 'dm_only', ruleReferences: accepted });
        return { status: 'queued', narration_id: narrationId, state_ref: externalStateRef(capsule), warnings };
      });
    }
    if (name === 'engine.request_dm_adjudication') {
      const request = currentRequest(capsule, stringField(input, 'request_id'), capsule.request?.phase ?? 'initial');
      const actorId = stringField(input, 'actor_id');
      if (!request.actors.includes(combatantId(actorId))) throw new RangeError('ACTOR_NOT_PENDING');
      const key = stringField(input, 'idempotency_key');
      return idempotent(key, input, () => {
        const id = `adjudication:${sha256(canonicalJson({ digest: capsule.digest, key, input })).slice(0, 48)}`;
        adjudications.append({ adjudicationRequestId: id, runId: capsule.runId, branchId: capsule.branchId, requestId: request.requestId, expectedRevision: capsule.revision, stateDigest: capsule.digest, stateHandle: engineStateHandle(capsule), actorId, subject: stringField(input, 'subject'), reason: stringField(input, 'reason'), blocking: input['blocking'] === true, suggestedOutcomes: Array.isArray(input['suggested_outcomes']) ? input['suggested_outcomes'].map(String) : [], idempotencyKey: key });
        feed.read({ runId: capsule.runId, stateHandle: engineStateHandle(capsule), expectedRevision: capsule.revision });
        return { status: 'requested', adjudication_request_id: id, state_ref: externalStateRef(capsule) };
      });
    }
    throw new RangeError(`Unknown engine tool ${name}.`);
  }

  const profileRequest = feed.current().request;
  const advertisedNames: ReadonlySet<string> | null = dependencies.toolProfile === 'dm'
    ? new Set(profileRequest?.phase !== 'speculative' && profileRequest?.kind === 'plan_adjustment'
      ? ENGINE_ADJUSTMENT_DM_TOOL_NAMES
      : ENGINE_DM_TOOL_NAMES)
    : null;
  const bindings: readonly McpToolBinding[] = ENGINE_TOOL_SPECS
    .filter((spec) => advertisedNames === null || advertisedNames.has(spec.descriptor.name))
    .map((spec) => ({ descriptor: spec.descriptor, validateArguments: (value) => schemaViolations(spec.input, value), validateOutput: (value) => schemaViolations(spec.output, value), execute: (value) => execute(spec.descriptor.name, value) }));
  const bindingsByName = new Map(bindings.map((binding) => [binding.descriptor.name, binding]));
  const toolSurface: EngineToolSurface = Object.freeze({
    tools: Object.freeze(bindings.map((binding) => binding.descriptor)),
    execute(name: string, argumentsValue: unknown): unknown {
      const binding = bindingsByName.get(name);
      if (binding === undefined) throw new RangeError(`Unknown engine tool ${name}.`);
      const argumentViolations = binding.validateArguments(argumentsValue);
      if (argumentViolations.length > 0) {
        throw new TypeError(`Invalid tool arguments: ${JSON.stringify({ violations: argumentViolations })}`);
      }
      const value = binding.execute(argumentsValue);
      const outputViolations = binding.validateOutput(value);
      if (outputViolations.length > 0) {
        throw new TypeError(`Tool output violated outputSchema: ${JSON.stringify({ violations: outputViolations })}`);
      }
      return value;
    },
  });
  const currentTurnContext = (): unknown => {
    const capsule = feed.current();
    return execute('engine.get_turn_context', { run_id: capsule.runId, expected_revision: capsule.revision, scope: 'round' });
  };
  const resources = createResourceProvider(feed, rules, currentTurnContext, () => {
    const capsule = feed.current();
    const summary = record(execute('engine.get_state_summary', { state_ref: externalStateRef(capsule), granularity: 'room_tactical' }), 'state summary resource');
    const { proof_token: _proofToken, ...resource } = summary;
    return resource;
  });
  const prompts = createPromptProvider(feed, rules, currentTurnContext);
  const handler = createMcpHandler({ tools: bindings, resources, prompts, ...(dependencies.maximumToolResultBytes === undefined ? {} : { maximumToolResultBytes: dependencies.maximumToolResultBytes }), ...(dependencies.maximumResourceBytes === undefined ? {} : { maximumResourceBytes: dependencies.maximumResourceBytes }), ...(dependencies.listPageSize === undefined ? {} : { listPageSize: dependencies.listPageSize }) });
  return Object.freeze({
    handle: handler.handle,
    drainNotifications: handler.drainNotifications,
    toolSurface,
  });
}

function runBase(capsule: EngineStateCapsule): string { return `engine://run/${encodeURIComponent(capsule.runId)}`; }
function journalCursor(capsule: EngineStateCapsule, offset: number): string { return sha256(canonicalJson({ run: capsule.runId, revision: capsule.revision, digest: capsule.digest, offset })).slice(0, 48); }
function content(uri: string, value: unknown): McpResourceContent { return { uri, mimeType: 'application/json', text: canonicalJson(value) }; }
function createResourceProvider(feed: EngineCapsuleFeed, rules: AllowlistedRulesSource, currentTurn: () => unknown, currentRoom: () => unknown): McpResourceProvider {
  const subscriptions = new Map<string, Set<(event: { readonly uri: string; readonly listChanged: boolean }) => void>>();
  feed.listen((event) => {
    const base = runBase(event.capsule);
    for (const uri of [`${base}/turn/current`, `${base}/room/current`]) for (const listener of subscriptions.get(uri) ?? []) listener({ uri, listChanged: event.roomTransition });
  });
  function listedUris(capsule: EngineStateCapsule): readonly { readonly uri: string; readonly name: string; readonly description: string; readonly mimeType: 'application/json' }[] {
    const base = runBase(capsule);
    return [
      { uri: `${base}/turn/current`, name: 'Current turn', description: 'Mutable compact turn and request projection.', mimeType: 'application/json' },
      { uri: `${base}/room/current`, name: 'Current room', description: 'Mutable bounded room-tactical projection.', mimeType: 'application/json' },
      { uri: `${base}/revision/${String(capsule.revision)}/turn`, name: `Turn revision ${String(capsule.revision)}`, description: 'Immutable turn snapshot for a capsule revision.', mimeType: 'application/json' },
      { uri: `${base}/journal/${String(capsule.revision)}/${journalCursor(capsule, 0)}`, name: `Journal revision ${String(capsule.revision)}`, description: 'Immutable bounded journal chunk.', mimeType: 'application/json' },
      ...capsule.rulesIndex.flatMap((reference) => allowedRule(rules, { rule_id: reference.ruleId, source_locator: reference.sourceLocator }) === null ? [] : [{ uri: `${base}/rules/${encodeURIComponent(reference.ruleId)}`, name: `Rule ${reference.ruleId}`, description: 'Allowlisted attributed rule entry.', mimeType: 'application/json' as const }]),
      { uri: `${base}/schema/turn-proposal-v1`, name: 'Turn proposal v1', description: 'Revision-bound composite option-selection contract.', mimeType: 'application/json' },
    ];
  }
  return {
    list: () => listedUris(feed.current()),
    templates: () => {
      const base = runBase(feed.current());
      return [
        { uriTemplate: `${base}/journal/{revision}/{cursor}`, name: 'Journal chunk', description: 'Bounded immutable journal chunk.', mimeType: 'application/json' },
        { uriTemplate: `${base}/rules/{ruleId}`, name: 'Rule entry', description: 'One allowlisted attributed rule entry.', mimeType: 'application/json' },
      ];
    },
    subscribe(uri, listener) {
      const capsule = feed.current();
      const base = runBase(capsule);
      if (uri !== `${base}/turn/current` && uri !== `${base}/room/current`) throw new RangeError('Resource is not subscribable.');
      const listeners = subscriptions.get(uri) ?? new Set();
      listeners.add(listener);
      subscriptions.set(uri, listeners);
      return () => { listeners.delete(listener); };
    },
    read(uri) {
      if (/^(?:file|https?):/iu.test(uri) || uri.toLowerCase().includes('content/cc-by-sa')) throw new RangeError('Disallowed resource URI.');
      const capsule = feed.current();
      const base = runBase(capsule);
      if (uri === `${base}/turn/current`) return content(uri, currentTurn());
      if (uri === `${base}/room/current`) return content(uri, currentRoom());
      const revisionMatch = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}/revision/(\\d+)/turn$`, 'u').exec(uri);
      if (revisionMatch !== null) {
        const snapshot = feed.snapshot(Number(revisionMatch[1]));
        if (snapshot === null) throw new RangeError('Unknown or expired resource URI.');
        return content(uri, { state_ref: externalStateRef(snapshot), request: snapshot.request, summary: tacticalSummary(snapshot), recent_changes: recentChanges(snapshot) });
      }
      const journalMatch = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}/journal/(\\d+)/([^/]+)$`, 'u').exec(uri);
      if (journalMatch !== null) {
        const snapshot = feed.snapshot(Number(journalMatch[1]));
        if (snapshot === null) throw new RangeError('Unknown or expired resource URI.');
        const offsets = Array.from({ length: Math.max(1, Math.ceil(snapshot.historyDelta.length / 100)) }, (_value, index) => index * 100);
        const offset = offsets.find((candidate) => journalCursor(snapshot, candidate) === journalMatch[2]);
        if (offset === undefined) throw new RangeError('Unknown or expired resource URI.');
        const entries = recentChanges(snapshot).slice(offset, offset + 100);
        const nextOffset = offset + entries.length;
        return content(uri, {
          revision: snapshot.revision,
          entries,
          truncated: nextOffset < snapshot.historyDelta.length,
          next_cursor: nextOffset < snapshot.historyDelta.length ? journalCursor(snapshot, nextOffset) : null,
        });
      }
      const rulePrefix = `${base}/rules/`;
      if (uri.startsWith(rulePrefix)) {
        const ruleId = decodeURIComponent(uri.slice(rulePrefix.length));
        const reference = capsule.rulesIndex.find((entry) => entry.ruleId === ruleId);
        if (reference === undefined) throw new RangeError('Unknown or expired resource URI.');
        const entry = allowedRule(rules, { rule_id: reference.ruleId, source_locator: reference.sourceLocator });
        if (entry === null) throw new RangeError('Rule source is not allowlisted.');
        return content(uri, { rule_id: entry.ruleId, source_locator: entry.sourceLocator, text: entry.text, attribution: entry.attribution });
      }
      if (uri === `${base}/schema/turn-proposal-v1`) return content(uri, { version: 1, constraints: ['Select only engine-offered option ids from the exact revision.', 'Never send coordinates, cells, destinations, paths, attack modifiers, DCs, dice, damage, or commands.'], examples: [{ actor_id: 'monster-id', expected_revision: 42, primary_option_id: 'option:42:...', fallback_option_id: null, override_justification: null }] });
      throw new RangeError('Unknown or expired resource URI.');
    },
  };
}

function createPromptProvider(feed: EngineCapsuleFeed, rules: AllowlistedRulesSource, currentTurn: () => unknown): McpPromptProvider {
  const descriptors = Object.freeze([
    { name: 'engine.plan_round', description: 'Render the complete shared-initiative planning constraints and current resource links.', arguments: [{ name: 'run_id', description: 'Selected run identifier.', required: true }, { name: 'expected_revision', description: 'Exact current revision.', required: true }, { name: 'voice', description: 'Requested narration voice.', required: true }] },
    { name: 'engine.correct_proposal', description: 'Render the single bounded correction prompt with no remaining fallback.', arguments: [{ name: 'run_id', description: 'Selected run identifier.', required: true }, { name: 'expected_revision', description: 'Exact current revision.', required: true }, { name: 'request_id', description: 'Pending correction request.', required: true }] },
  ] as const);
  return {
    list: () => descriptors,
    get(name, value) {
      const input = record(value, 'prompt arguments');
      const allowed = name === 'engine.plan_round' ? ['run_id', 'expected_revision', 'voice'] : name === 'engine.correct_proposal' ? ['run_id', 'expected_revision', 'request_id'] : [];
      if (allowed.length === 0) throw new RangeError('Unknown prompt.');
      if (!Object.keys(input).every((key) => allowed.includes(key)) || allowed.some((key) => input[key] === undefined)) throw new TypeError('Prompt arguments are missing or contain unknown properties.');
      const capsule = exactCurrent(feed, stringField(input, 'run_id'), numberField(input, 'expected_revision'));
      if (name === 'engine.correct_proposal' && (capsule.request === null || capsule.request.requestId !== input['request_id'] || capsule.request.phase !== 'correction')) throw new RangeError('REQUEST_MISMATCH');
      const text = renderEnginePrompt(name === 'engine.plan_round' ? 'plan_round' : 'correct_proposal', capsule, rules, typeof input['voice'] === 'string' ? input['voice'] : undefined, currentTurn());
      if (text.toLowerCase().includes('content/cc-by-sa')) throw new RangeError('Disallowed prompt source.');
      return { resultType: 'complete', description: descriptors.find((descriptor) => descriptor.name === name)?.description, messages: [{ role: 'user', content: { type: 'text', text } }] };
    },
  };
}
