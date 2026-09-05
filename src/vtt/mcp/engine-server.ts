import { canonicalJson } from '../../commands/canonical-json';
import type { EncounterState } from '../../combat/encounter';
import { ALERTING_POLICY, type EncounterAlertingState } from '../../combat/alerting';
import type { EncounterEvent } from '../../combat/events';
import type { GridCell } from '../../combat/grid';
import { SEARCH_MEMORY_POLICY, type SearchMemory } from '../../combat/search-memory';
import type { MonsterAttackAction } from '../../combat/statblock';
import {
  evaluateTacticalAttack,
  TACTICAL_EVALUATOR_POLICY,
  type TacticalAttackInput,
} from '../../combat/tactical-evaluator';
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
import { resolveEngineActorOption, type EngineMovementPreference, type EngineTurnProposal, type PureTurnProposalResolver } from '../intent-resolver';
import { decisionReasonProblem } from '../decision-reason';
import {
  engineOptionId,
  enginePlayToken,
  type EngineOfferableOption,
  type EngineOptionMetric,
  type EngineOverrideJustification,
} from '../turn-proposal';
import {
  DM_INTEL_QUERY_POLICY,
  DM_TURN_INTEL_POLICY,
  captureDmIntel,
  exactDmIntelMatrix,
  fullInitiativeIntel,
  informativeDmIntelRows,
  isInformativeDmIntelRow,
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
import {
  evaluateOptionOutcome,
  OPTION_OUTCOME_POLICY,
  type OptionOutcomeEvaluation,
} from '../intel/option-outcome';
import type { ReactionGuidanceDeclaration, ReactionTriggerGuidance } from '../reaction-guidance';
import { diffTurnContextValues } from '../dm-bridge/projection-transport';
import {
  DEFAULT_RENDERER_PROFILE,
  extractCircumstanceFeatures,
  renderBytes,
  renderProseTurnContext,
  rendererProfileSchema,
  renderTurnContextProfile,
  resolveOptionReference,
  type CircumstanceFeatureVector,
  type RendererProfile,
  type RendererRemovalCounts,
} from '../renderer-profile';
import { submitSpeculativeRoundPlan } from '../speculative-plan-submission';
import type { SpeculativePlanSink } from '../speculative-plan-types';
import {
  PLAY_NAMES,
  SKILL_NAMES,
  SNIPPET_REGISTRY,
  type PlayName,
  type SkillName,
} from '../snippet-registry-runtime';
import {
  createMcpHandler,
  type McpHandler,
  type McpPromptProvider,
  type McpResourceContent,
  type McpResourceProvider,
  type McpToolBinding,
} from './handler';
import {
  ENGINE_ACTOR_KNOWLEDGE_POLICY,
  ENGINE_LEGENDARY_WINDOWS_POLICY,
  ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA,
  ENGINE_REACTION_SPEND_HOLD_POLICY,
  ENGINE_RECOVERY_CAPABILITY_POLICY,
  ENGINE_STATE_SUMMARY_POLICY,
  ENGINE_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA,
  ENGINE_TOOL_SPECS,
  ENGINE_TURN_PROPOSAL_INPUT_SCHEMA,
  engineSchemaInternals,
  generatedMinimalRoundSubmissionExample,
  schemaViolations,
} from './schemas';
import type { KbReadBudget, KbReadCallPhase } from './knowledge-base';

export const ENGINE_DM_TOOL_NAMES = Object.freeze([
  'engine.get_turn_context',
  'engine.query_tactical_intel',
  'engine.propose_from_play',
  'engine.load_skill',
  'engine.validate_proposal',
  'engine.submit_round_proposals',
  'engine.request_dm_adjudication',
] as const);
export const ENGINE_ADJUSTMENT_DM_TOOL_NAMES = Object.freeze([
  'engine.get_turn_context',
  'engine.query_tactical_intel',
  'engine.load_skill',
  'engine.validate_proposal',
  'engine.submit_plan_adjustment',
  'engine.request_dm_adjudication',
] as const);
export const ENGINE_SPECULATIVE_DM_TOOL_NAMES = Object.freeze([
  'engine.load_skill',
  'engine.submit_speculative_round_plan',
] as const);
export type EngineMcpToolProfile = 'full' | 'dm';
export const INTEL_MODES = ['full', 'off'] as const;
export type IntelMode = (typeof INTEL_MODES)[number];
export const OVERRIDE_POLICIES = ['strict', 'typed_reason'] as const;
export type OverridePolicy = (typeof OVERRIDE_POLICIES)[number];
export const DEFAULT_OVERRIDE_POLICY: OverridePolicy = 'typed_reason';

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

function encodedJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
const SUGGESTED_PLAN_ADVISORY = 'You may submit these revision-bound option proposals as-is via engine.submit_round_proposals, edit the selected option ids, or ignore this suggested plan.';

export function engineStateSummaryProofToken(capsuleDigest: string, granularity: string): string {
  return sha256(`${capsuleDigest}|${granularity}|state_summary_proof_v2_creature_space`);
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

interface CapsuleIntelReports {
  readonly actorKnowledge: readonly Readonly<Record<string, unknown>>[];
  readonly reactionSpendHold: readonly Readonly<Record<string, unknown>>[];
  readonly legendaryWindows: Readonly<Record<string, unknown>>;
  readonly legendaryWindowsCompact: Readonly<Record<string, unknown>>;
  readonly legendaryHasDetails: boolean;
  readonly recoveryCapabilities: Readonly<Record<string, unknown>>;
  readonly hasRecoveryTargets: boolean;
  readonly searchMemory: Readonly<Record<string, unknown>>;
  readonly hasSearchMemories: boolean;
  readonly alertState: Readonly<Record<string, unknown>>;
  readonly alertStateCompact: Readonly<Record<string, unknown>>;
  readonly hasAlertDetails: boolean;
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
  readonly rendererProfile?: RendererProfile;
  readonly turnContextMaximumBytes?: number;
  readonly onTurnContextRendered?: (result: {
    readonly preTrimBytes: number;
    readonly postTrimBytes: number;
    readonly features: CircumstanceFeatureVector;
    readonly removals: RendererRemovalCounts;
  }) => void;
  readonly kbReadBudget?: KbReadBudget;
  readonly kbReadCallPhase?: KbReadCallPhase;
  readonly overridePolicy?: OverridePolicy;
}

export interface EngineToolSurface {
  readonly tools: readonly import('./handler').McpToolDescriptor[];
  execute(name: string, argumentsValue: unknown): unknown;
}

export interface EngineMcpApplication extends McpHandler {
  readonly toolSurface: EngineToolSurface;
}

interface OverridePolicyRule {
  refusal(override: EngineOverrideJustification): { readonly code: 'OVERRIDE_UNJUSTIFIED'; readonly summary: string } | null;
}

const TYPED_REASON_OVERRIDE_RULE: OverridePolicyRule = {
  refusal: () => null,
};

const STRICT_OVERRIDE_RULE: OverridePolicyRule = {
  refusal(override) {
    switch (override.kind) {
      case 'engine_play':
      case 'missing_metric':
        return null;
      case 'objective':
      case 'morale':
      case 'roleplay':
      case 'resource_conservation':
      case 'unknown_engine_gap':
        return {
          code: 'OVERRIDE_UNJUSTIFIED',
          summary: 'The strict override policy accepts only engine_play or missing_metric justifications.',
        };
    }
    override satisfies never;
    throw new TypeError('Unknown override justification kind.');
  },
};

function overridePolicyRule(policy: OverridePolicy): OverridePolicyRule {
  switch (policy) {
    case 'strict': return STRICT_OVERRIDE_RULE;
    case 'typed_reason': return TYPED_REASON_OVERRIDE_RULE;
  }
  policy satisfies never;
  throw new TypeError(`Unknown override policy ${String(policy)}.`);
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
function arrayField(value: Readonly<Record<string, unknown>>, key: string): readonly unknown[] {
  const field = value[key];
  if (!Array.isArray(field)) throw new RangeError(`${key} must be an array.`);
  return field;
}
function stateReference(value: unknown): EngineStateReference {
  const input = record(value, 'state_ref');
  return { runId: encounterSessionId(stringField(input, 'run_id')), stateHandle: stringField(input, 'state_handle'), expectedRevision: numberField(input, 'expected_revision') };
}
function externalStateRef(capsule: EngineStateCapsule): Readonly<Record<string, unknown>> {
  return { run_id: capsule.runId, state_handle: engineStateHandle(capsule), expected_revision: capsule.revision };
}
function promptRequest(capsule: EngineStateCapsule): Readonly<Record<string, unknown>> | null {
  const request = capsule.request;
  if (request === null) return null;
  return {
    request_id: request.requestId,
    phase: request.phase,
    correction_number: request.correctionNumber,
    required_actor_ids: request.actors,
    ...(request.phase === 'speculative' ? {
      target_room: request.targetRoom,
      target_monster_round: request.targetMonsterRound,
      refresh_generation: request.refreshGeneration,
    } : request.kind === 'plan_adjustment' ? {
      baseline_plan_hash: request.baselinePlanHash,
      adjustment_budget: request.adjustmentBudget,
    } : {}),
  };
}
interface ProposalContractRefusal {
  readonly code: 'CORRECTION_FALLBACK_MUST_BE_NULL' | 'INITIAL_FALLBACK_REQUIRED' | 'PRIMARY_FALLBACK_IDENTICAL';
  readonly summary: string;
  readonly attempt: 'primary' | 'fallback';
}
function proposalContractRefusal(
  phase: 'initial' | 'correction',
  proposal: EngineTurnProposal,
): ProposalContractRefusal | null {
  if (phase === 'correction' && proposal.fallbackOptionId !== null) {
    return {
      code: 'CORRECTION_FALLBACK_MUST_BE_NULL',
      summary: 'Correction proposal fallback_option_id must be null.',
      attempt: 'fallback',
    };
  }
  if (phase === 'initial' && proposal.fallbackOptionId === null) {
    return {
      code: 'INITIAL_FALLBACK_REQUIRED',
      summary: 'Initial proposal fallback_option_id must identify an independent offered option.',
      attempt: 'fallback',
    };
  }
  if (proposal.fallbackOptionId !== null && proposal.fallbackOptionId === proposal.primaryOptionId) {
    return {
      code: 'PRIMARY_FALLBACK_IDENTICAL',
      summary: 'Primary and fallback option ids must identify independent choices.',
      attempt: 'fallback',
    };
  }
  return null;
}

interface LauncherRoundSubmissionBinding {
  readonly stateRef: Readonly<Record<string, unknown>>;
  readonly requestId: string;
  readonly phase: 'initial' | 'correction';
}
type PreparedRoundSubmission =
  | {
      readonly kind: 'minimal_submission';
      readonly submittedArguments: Readonly<Record<string, unknown>>;
      readonly envelope: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: 'explicit_envelope';
      readonly submittedArguments: Readonly<Record<string, unknown>>;
      readonly envelope: Readonly<Record<string, unknown>>;
    }
  | { readonly kind: 'rejected'; readonly result: Readonly<Record<string, unknown>> };
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
function decodeOverrideJustification(
  value: unknown,
): NonNullable<EngineTurnProposal['overrideJustification']> {
  const input = record(value, 'override justification');
  const kind = stringField(input, 'kind');
  switch (kind) {
    case 'objective':
    case 'morale':
    case 'roleplay':
    case 'resource_conservation':
    case 'unknown_engine_gap':
      return { kind };
    case 'engine_play':
      return { kind, token: typeof input['token'] === 'string' ? enginePlayToken(input['token']) : null };
    case 'missing_metric':
      return { kind, id: typeof input['id'] === 'string' ? input['id'] as EngineOptionMetric : null };
    default:
      throw new RangeError(`Unknown override justification kind ${kind}.`);
  }
}
function decodeProposal(value: unknown): EngineTurnProposal {
  const input = record(value, 'proposal');
  const justification = input['override_justification'];
  const choiceValue = input['activation_choice'];
  const activationChoice = choiceValue === undefined
    ? undefined
    : choiceValue === null
      ? null
    : (() => {
        const choice = record(choiceValue, 'activation choice');
        const kind = stringField(choice, 'kind');
        switch (kind) {
          case 'command_word':
          case 'unicorns_blessing_spell':
          case 'dispel_evil_and_good_mode':
            return { kind, value: stringField(choice, 'value') } as NonNullable<EngineTurnProposal['activationChoice']>;
          case 'calm_emotions_per_target':
            return {
              kind,
              selections: arrayField(choice, 'selections').map((entry) => {
                const selection = record(entry, 'Calm Emotions selection');
                return { targetId: combatantId(stringField(selection, 'target_id')), mode: stringField(selection, 'mode') };
              }),
            } as NonNullable<EngineTurnProposal['activationChoice']>;
          default: throw new RangeError(`Unknown activation choice kind ${kind}.`);
        }
      })();
  return {
    actorId: combatantId(stringField(input, 'actor_id')),
    expectedRevision: numberField(input, 'expected_revision'),
    primaryOptionId: engineOptionId(stringField(input, 'primary_option_id')),
    fallbackOptionId: input['fallback_option_id'] === null
      ? null
      : engineOptionId(stringField(input, 'fallback_option_id')),
    reason: stringField(input, 'reason'),
    overrideJustification: justification === null
      ? null
      : decodeOverrideJustification(justification),
    ...(activationChoice === undefined ? {} : { activationChoice }),
  };
}
function externalProposal(proposal: EngineTurnProposal): Readonly<Record<string, unknown>> {
  const override = proposal.overrideJustification;
  return {
    actor_id: proposal.actorId,
    expected_revision: proposal.expectedRevision,
    primary_option_id: proposal.primaryOptionId,
    fallback_option_id: proposal.fallbackOptionId,
    reason: proposal.reason,
    override_justification: override === null ? null : {
      kind: override.kind,
      ...(override.kind === 'engine_play' && override.token !== null
        ? { token: override.token }
        : {}),
      ...(override.kind === 'missing_metric' && override.id !== null
        ? { id: override.id }
        : {}),
    },
    ...(proposal.activationChoice === undefined ? {} : {
      activation_choice: proposal.activationChoice === null
        ? null
        : proposal.activationChoice.kind === 'calm_emotions_per_target'
          ? { kind: proposal.activationChoice.kind, selections: proposal.activationChoice.selections.map((entry) => ({ target_id: entry.targetId, mode: entry.mode })) }
          : { kind: proposal.activationChoice.kind, value: proposal.activationChoice.value },
    }),
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
function expectationFor(
  state: EncounterState,
  queries: EngineQueryPort,
  actorId: CombatantId,
  attacks: readonly { readonly actionId: string; readonly targetId: CombatantId }[],
): Readonly<Record<string, unknown>> | null {
  if (attacks.length === 0) return null;
  const evaluations = attacks.map(({ actionId, targetId }) => {
    const action = queries.actions(state, actorId).find(
      (candidate): candidate is MonsterAttackAction => candidate.kind === 'attack' && candidate.id === actionId,
    );
    const target = queries.combatant(state, targetId);
    return action === undefined || target === null
      ? null
      : queries.tacticalAttack(state, actorId, target.profile.id, action.id);
  });
  if (evaluations.some((evaluation) => evaluation === null)) return null;
  const present = evaluations.filter((evaluation) => evaluation !== null);
  if (
    present.some((evaluation) => evaluation.probabilities.status === 'unresolved' ||
      evaluation.damage.status === 'unresolved' || evaluation.unresolved.length > 0)
  ) {
    return {
      resolvable: false,
      outcome_probability: null,
      critical_probability: null,
      expected_value: null,
      metric: 'damage',
      assumption_codes: [...new Set(present.flatMap((evaluation) => evaluation.unresolved))],
      policy: present[0]?.policy ?? TACTICAL_EVALUATOR_POLICY,
    };
  }
  const resolved = present.map((evaluation) => {
    if (evaluation.probabilities.status !== 'resolved' || evaluation.damage.status !== 'resolved') {
      throw new Error('Resolved expectation narrowed to an unresolved attack evaluation.');
    }
    return {
      probabilities: evaluation.probabilities,
      damage: evaluation.damage,
      rollMode: evaluation.rollMode,
      policy: evaluation.policy,
    };
  });
  const allMissProbability = resolved.reduce((probability, evaluation) =>
    probability * evaluation.probabilities.miss, 1);
  const noCriticalProbability = resolved.reduce((probability, evaluation) =>
    probability * (1 - evaluation.probabilities.critical), 1);
  return {
    resolvable: true,
    outcome_probability: 1 - allMissProbability,
    critical_probability: 1 - noCriticalProbability,
    expected_value: resolved.reduce((total, evaluation) => total + evaluation.damage.expectedDamage, 0),
    metric: 'damage',
    assumption_codes: [...new Set(resolved.flatMap((evaluation) => evaluation.rollMode.reasons))],
    policy: resolved[0]?.policy ?? TACTICAL_EVALUATOR_POLICY,
  };
}

function rationalNumber(value: { readonly numerator: number; readonly denominator: number }): number {
  return value.numerator / value.denominator;
}

function advertisedExpectation(
  outcome: OptionOutcomeEvaluation,
  damageExpectation: Readonly<Record<string, unknown>> | null,
): Readonly<Record<string, unknown>> {
  if (outcome.status === 'unresolved') {
    return {
      kind: 'unresolved', resolvable: false, metric: 'none', reason: outcome.reason,
      assumption_codes: [outcome.reason], policy: outcome.policy,
    };
  }
  if (outcome.evidence.kind === 'damage') {
    return {
      kind: 'damage',
      resolvable: true,
      outcome_probability: damageExpectation?.['outcome_probability'] ?? null,
      critical_probability: damageExpectation?.['critical_probability'] ?? null,
      expected_value: rationalNumber(outcome.evidence.expectedDamage),
      expected_value_exact: outcome.evidence.expectedDamage,
      kill_probability_exact: outcome.evidence.killProbability,
      net_action_equivalents_exact: outcome.ledger.netActionEquivalents,
      metric: 'damage',
      assumption_codes: damageExpectation?.['assumption_codes'] ?? [],
      policy: outcome.policy,
    };
  }
  if (outcome.evidence.kind === 'hard_control') {
    const evidence = outcome.evidence;
    return {
      kind: 'hard_control',
      resolvable: true,
      metric: 'control',
      target_fail_probabilities: evidence.targetOutcomes.map((target) => ({
        target_id: target.targetId,
        side: target.side,
        exact: target.failProbability,
        probability: rationalNumber(target.failProbability),
      })),
      initial_count_distribution: evidence.hostileInitialCountDistribution,
      expected_initially_affected: rationalNumber(evidence.expectedInitiallyAffected),
      expected_initially_affected_exact: evidence.expectedInitiallyAffected,
      expected_disabled_turns: rationalNumber(evidence.expectedDisabledTurns),
      expected_disabled_turns_exact: evidence.expectedDisabledTurns,
      expected_wake_actions: rationalNumber(evidence.expectedWakeActions),
      expected_wake_actions_exact: evidence.expectedWakeActions,
      expected_control_burden: rationalNumber(evidence.expectedControlBurden),
      expected_control_burden_exact: evidence.expectedControlBurden,
      resource_penalty: rationalNumber(outcome.ledger.resourcePenalty),
      resource_penalty_exact: outcome.ledger.resourcePenalty,
      net_action_equivalents: rationalNumber(outcome.ledger.netActionEquivalents),
      net_action_equivalents_exact: outcome.ledger.netActionEquivalents,
      horizon_rounds: evidence.horizon.numerator,
      concentration_survival_exact: evidence.concentrationSurvival,
      concentration_exposure: evidence.concentrationExposure,
      assumption_codes: [
        `wake_reachability:${evidence.wakeReachability}`,
        `concentration:${evidence.concentrationExposure}`,
      ],
      policy: outcome.policy,
    };
  }
  if (outcome.evidence.kind === 'modeled_effect') {
    return {
      kind: 'modeled_effect', resolvable: true, metric: 'none',
      spell_ids: outcome.evidence.spellIds, assumption_codes: [], policy: outcome.policy,
    };
  }
  return {
    kind: outcome.evidence.kind,
    resolvable: true,
    metric: 'none',
    assumption_codes: [],
    policy: OPTION_OUTCOME_POLICY,
  };
}
function externalOptionSlot(
  slot: EngineOfferableOption['actionSlots'][number],
  omittedRiders: EngineOfferableOption['omittedRiders'],
): Readonly<Record<string, unknown>> {
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
    components: use.kind === 'multiattack'
      ? use.components.map((component) => ({
          kind: component.kind,
          action_id: component.actionId,
          target_ids: component.target.kind === 'combatant' ? [component.target.combatantId] : [],
          omitted_riders: component.omittedRiders,
        }))
      : [],
    spell_id: use.kind === 'cast_spell' ? use.spellId : null,
    target_ids: targetIds,
    world_object_id: use.kind === 'use_world_object' ? use.objectId : null,
    omitted_riders: use.kind === 'multiattack'
      ? omittedRiders
      : omittedRiders.length === 0
        ? omittedRiders
        : omittedRiders.filter((rider) =>
            'actionId' in use && rider.sourceActionId === use.actionId),
  };
}
function tacticalOptions(state: EncounterState, queries: EngineQueryPort, capsule: EngineStateCapsule, actorId: CombatantId, includeExpectations: boolean): readonly Readonly<Record<string, unknown>>[] {
  const projected = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
  if (projected === undefined) return [];
  const informationRank = (option: EngineOfferableOption): number => {
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
    const resolution = resolveEngineActorOption(state, option, queries);
    const movementFeet = resolution.valid ? resolution.mechanics.movementCostFeet : null;
    const attacks = firstUse.kind === 'attack'
      ? targetId === null ? [] : [{ actionId: String(firstUse.actionId), targetId }]
      : firstUse.kind === 'multiattack'
        ? firstUse.components.flatMap((component) => {
            if (component.kind !== 'attack') return [];
            const componentTarget = queries.resolveTarget(state, actorId, component.target);
            return componentTarget === null
              ? []
              : [{ actionId: String(component.actionId), targetId: componentTarget }];
          })
        : [];
    const externalActivationChoice = option.activationChoice === undefined || option.activationChoice === null
      ? undefined
      : option.activationChoice.kind === 'calm_emotions_per_target'
        ? { kind: option.activationChoice.kind, target_ids: option.activationChoice.targetIds, values: option.activationChoice.values }
        : { kind: option.activationChoice.kind, values: option.activationChoice.values };
    return {
      option_id: option.optionId, actor_id: option.actorId, revision: option.revision, label: option.label,
      action_slots: option.actionSlots.map((slot) => externalOptionSlot(slot, option.omittedRiders)),
      action_id: firstActionId, kind, target_selectors: [], resource_cost_labels: option.resourceCostLabels,
      omitted_riders: option.omittedRiders,
      ...(externalActivationChoice === undefined ? {} : { activation_choice: externalActivationChoice }),
      usable_now: resolution.valid && movementFeet === 0,
      usable_after_movement: resolution.valid,
      minimum_movement_feet: movementFeet,
      visibility: targetId === null ? 'unknown' : queries.visibility(state, actorId, targetId)?.visible === true ? 'yes' : 'no',
      cover: targetId === null ? 'unknown' : queries.cover(state, actorId, targetId)?.tier ?? 'unknown', risks: [],
      expectation: includeExpectations && resolution.valid
        ? advertisedExpectation(
            evaluateOptionOutcome(state, option, resolution.mechanics, queries),
            expectationFor(state, queries, actorId, attacks),
          )
        : null,
      refusals: [],
    };
    });
}
function distanceBand(distance: number): 'engaged' | 'near' | 'far' { return distance <= 5 ? 'engaged' : distance <= 30 ? 'near' : 'far' }
function threats(state: EncounterState, queries: EngineQueryPort, actorId: CombatantId): readonly Readonly<Record<string, unknown>>[] {
  if (queries.tokenPosition(state, actorId) === null) return [];
  return state.combatants.filter((candidate) => candidate.life !== 'dead' && !queries.sameSide(state, actorId, candidate.profile.id)).flatMap((candidate) => {
    const distance = queries.spaceDistance(state, actorId, candidate.profile.id);
    if (distance === null) return [];
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
  return { actor_id: resolution.mechanics.actorId, option_id: resolution.mechanics.optionId, action_slot_count: resolution.mechanics.actionSlots.length, movement_feet: resolution.mechanics.movementCostFeet, omitted_riders: resolution.mechanics.omittedRiders, resolution_digest: resolution.resolutionDigest, summary: resolution.summary };
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

export function renderEnginePrompt(kind: 'plan_round' | 'correct_proposal' | 'speculate_round', capsule: EngineStateCapsule, rules: AllowlistedRulesSource, voice?: string, turnContext?: unknown): string {
  const entries = capsule.rulesIndex.flatMap((reference) => {
    const entry = allowedRule(rules, { rule_id: reference.ruleId, source_locator: reference.sourceLocator });
    return entry === null ? [] : [{ rule_id: entry.ruleId, source_locator: entry.sourceLocator, text: entry.text, attribution: entry.attribution }];
  });
  const uriBase = `engine://run/${encodeURIComponent(capsule.runId)}`;
  const adjustment = capsule.request?.phase !== 'speculative' && capsule.request?.kind === 'plan_adjustment';
  const roundPhase = capsule.request?.phase === 'correction' ? 'correction' : 'initial';
  const minimalExample = canonicalJson(generatedMinimalRoundSubmissionExample(roundPhase));
  const fixed = kind === 'speculate_round'
    ? 'Plan every advertised speculative scenario, then use engine.submit_speculative_round_plan once. Each branch must cover the complete required monster actor set using only revision-bound option ids offered in current_context. The host alone evaluates conditions and validates the selected branch; never infer or execute outcomes, coordinates, paths, dice, modifiers, DCs, damage, or reducer commands.'
    : adjustment
    ? kind === 'plan_round'
      ? 'Review the current remaining monster plan, then use engine.submit_plan_adjustment once. Submit zero to the stated adjustment budget of open-actor replacement proposals; omitted actors keep their baseline proposals and an empty updates list explicitly keeps the plan. Do not change reaction guidance. Never emit coordinates, paths, dice, modifiers, DCs, damage, or reducer commands.'
      : 'Correct only the refused plan-adjustment actors once with engine.submit_plan_adjustment. Valid staged updates remain accepted. No fallback remains after this correction; every correction fallback_option_id must be null. Omitted refused actors keep their baseline proposals.'
    : kind === 'plan_round'
      ? `Use engine.get_turn_context, then submit only the minimal engine.submit_round_proposals arguments for the complete required actor set, with one short sentence per actor saying why this option. Generated minimal example: ${minimalExample}. The launcher fills state_ref, request_id, phase, and idempotency_key from this turn binding. One ACCEPTED submission per round; a call rejected for invalid arguments is not queued — fix it and call again. Select only offered revision-bound option ids and provide an independent fallback. You may declare reaction_guidance for foreseeable Reactions; it persists until replaced. Never emit coordinates, paths, dice, modifiers, DCs, damage, or reducer commands.`
      : `Correct the complete refused proposal request with the minimal engine.submit_round_proposals arguments, with one short sentence per actor saying why this option. Generated minimal example: ${minimalExample}. The launcher fills state_ref, request_id, phase, and idempotency_key from this turn binding. One ACCEPTED submission per round; a call rejected for invalid arguments is not queued — fix it and call again. No fallback remains after this correction; correction fallback_option_id must be null. If you refresh context, use the get_turn_context request in current_context exactly.`;
  return [fixed, `Turn resource: ${uriBase}/turn/current`, `Proposal schema: ${uriBase}/schema/turn-proposal-v1`, `<engine-data-json>${canonicalJson({ run_id: capsule.runId, revision: capsule.revision, request: promptRequest(capsule), voice: voice ?? null, recent_changes: recentChanges(capsule), current_context: turnContext ?? null, rules: entries })}</engine-data-json>`].join('\n');
}

function reactionAttackInput(
  state: EncounterState,
  decision: Extract<EncounterState['pendingDecisions'][number], { readonly kind: 'reaction_offer' }>,
): TacticalAttackInput | null {
  const command = decision.opportunityAttack.command;
  const attacker = state.combatants.find((candidate) => candidate.profile.id === command.actor);
  const target = state.combatants.find((candidate) => candidate.profile.id === command.target);
  const attackerPosition = state.tokens.find((token) => token.combatantId === command.actor)?.position;
  if (attacker === undefined || target === undefined || attackerPosition === undefined) return null;
  const criticalFloor = command.criticalFloor === 18 || command.criticalFloor === 19 ? command.criticalFloor : 20;
  return {
    attackerId: command.actor,
    targetId: command.target,
    attackerPosition,
    targetPosition: decision.opportunityAttack.from,
    range: command.tacticalRange ?? { kind: 'melee', reachFeet: attacker.profile.rules.reach },
    attackBonus: command.attackBonus,
    targetArmorClass: target.profile.rules.armorClass,
    criticalFloor,
    damageTerms: command.damage.terms.map((term) => ({ dice: term.dice })),
    attackerConditions: attacker.life === 'dying' || attacker.life === 'stable'
      ? [{ name: 'Unconscious' as const }]
      : [],
    targetConditions: target.life === 'dying' || target.life === 'stable'
      ? [{ name: 'Unconscious' as const }]
      : [],
    attackerCanSeeTarget: command.attackerCanSeeTarget,
    targetCanSeeAttacker: command.targetCanSeeAttacker,
    rollModeSources: [],
    featureRollModeInput: null,
    target: {
      hitPoints: target.hitPoints,
      usesDeathSaves: target.profile.rules.usesDeathSaves,
    },
    ...(command.rollMode === 'normal' ? {} : {
      unresolvedReasons: ['random_attack_modifier_unresolved' as const],
    }),
  };
}

function actorKnowledgeReports(
  state: EncounterState,
  queries: EngineQueryPort,
  capsule: EngineStateCapsule,
): readonly Readonly<Record<string, unknown>>[] {
  return state.combatants
    .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
    .map((actor) => ({
      actor_id: actor.profile.id,
      targets: state.combatants
        .filter((target) => !queries.sameSide(state, actor.profile.id, target.profile.id) && target.life !== 'dead')
        .map((target) => {
          const projected = capsule.projection.combatants.find((candidate) => candidate.id === target.profile.id);
          const distanceFeet = queries.spaceDistance(state, actor.profile.id, target.profile.id);
          if (projected?.placementStatus === 'placement_pending') {
            return {
              kind: 'placement_pending',
              target_id: target.profile.id,
              placement_status: 'placement_pending',
              pending_reason: projected.pendingReason,
            };
          }
          const visibility = queries.visibility(state, actor.profile.id, target.profile.id);
          return visibility?.visible === true && projected?.placementStatus === 'placed' && distanceFeet !== null
            ? {
                kind: 'perceived',
                target_id: target.profile.id,
                placement_status: 'placed',
                effective_size: projected.effectiveSize,
                placement_mode: structuredClone(projected.placementMode),
                footprint: projected.footprint.map((cell) => ({ ...cell })),
                distance_feet: distanceFeet,
              }
            : {
                kind: 'unknown',
                target_id: target.profile.id,
                last_seen: { status: 'unresolved', reason: 'last_seen_position_not_modeled' },
              };
        })
        .sort((left, right) => left.target_id.localeCompare(right.target_id)),
    }))
    .sort((left, right) => left.actor_id.localeCompare(right.actor_id));
}

function reactionSpendHoldReports(state: EncounterState): readonly Readonly<Record<string, unknown>>[] {
  const futureTurnStarts = state.initiative
    .slice(state.activeInitiativeIndex === null ? state.initiative.length : state.activeInitiativeIndex + 1)
    .map((entry) => ({ combatant: entry.combatant, round: state.round }));
  return state.pendingDecisions.flatMap((decision): readonly Readonly<Record<string, unknown>>[] => {
    if (decision.kind !== 'reaction_offer') return [];
    const tacticalAttack = reactionAttackInput(state, decision);
    if (tacticalAttack === null) return [];
    const evaluation = evaluateTacticalAttack(tacticalAttack);
    const spend = evaluation.damage.status === 'resolved'
      ? { status: 'resolved' as const, expected_damage: evaluation.damage.expectedDamage }
      : { status: 'unresolved' as const, reason: evaluation.damage.reason };
    return [{
      policy: ENGINE_REACTION_SPEND_HOLD_POLICY,
      status: evaluation.damage.status,
      ...(evaluation.damage.status === 'unresolved' ? { reason: evaluation.damage.reason } : {}),
      trigger_id: decision.id,
      reaction_kind: decision.reactionKind,
      spend,
      hold: {
        immediate_value: 0,
        possible_opportunities: futureTurnStarts.flatMap((turn) =>
          turn.combatant === decision.combatant || turn.combatant === decision.opportunityAttack.mover
            ? []
            : [{
                mover: turn.combatant,
                source_turn: turn,
                certainty: 'possible',
                condition: 'mover_voluntarily_leaves_reactor_reach',
              }]),
        unqualified_future_triggers: {
          status: 'unresolved',
          reason: 'future_movement_choice_unknown',
        },
      },
    }];
  });
}

function compactLegendaryToken(value: string): string {
  return value.trim().replaceAll(/\s+/gu, '-') || 'unnamed';
}

function legendaryWindowReports(
  state: EncounterState,
  capsule: EngineStateCapsule,
): {
  readonly full: Readonly<Record<string, unknown>>;
  readonly compact: Readonly<Record<string, unknown>>;
  readonly hasDetails: boolean;
} {
  const candidates = state.combatants.filter((subject) =>
    subject.legendary !== undefined || subject.profile.rules.legendary !== undefined);
  const resolved = candidates.find((subject) =>
    subject.legendary !== undefined && subject.profile.rules.legendary !== undefined);
  const pending = resolved === undefined ? null : state.pendingDecisions.find((decision) =>
    decision.kind === 'legendary_action_window' && decision.combatant === resolved.profile.id) ?? null;
  const upcoming = resolved === undefined ? undefined : capsule.projection.initiative.timeline.upcoming.find((event) =>
    event.kind === 'legendary_action_window' && event.legendaryCombatant === resolved.profile.id);
  const compactTokens = resolved === undefined
    ? ['legendary', 'unresolved', 'actions', '0/0', 'resistance', '0/0', 'next', 'unresolved', 'pending', 'none']
    : [
        'legendary', compactLegendaryToken(resolved.profile.name),
        'actions', `${String(resolved.legendary?.actionUsesRemaining ?? 0)}/${String(resolved.legendary?.actionUsesMaximum ?? 0)}`,
        'resistance', `${String(resolved.legendary?.resistanceUsesRemaining ?? 0)}/${String(resolved.legendary?.resistanceUsesMaximum ?? 0)}`,
        'next', String(pending?.boundary.activeCombatant ?? upcoming?.boundary.combatant ?? 'unresolved'),
        'pending', pending === null ? 'none' : 'action',
      ];
  const compact = {
    policy: ENGINE_LEGENDARY_WINDOWS_POLICY,
    status: candidates.length === 0 ? 'unresolved' : 'resolved',
    ...(candidates.length === 0 ? { reason: 'no_legendary_actor' } : {}),
    compact: compactTokens,
    detail_level: 'compact',
  };
  if (candidates.length === 0) return { full: compact, compact, hasDetails: false };
  const actors = candidates.map((actor) => {
    const pool = actor.legendary;
    const legendary = actor.profile.rules.legendary;
    if (pool === undefined || legendary === undefined) {
      return {
        status: 'unresolved',
        reason: pool === undefined ? 'legendary_pool_unavailable' : 'legendary_actions_unavailable',
        combatant: actor.profile.id,
        name: actor.profile.name,
      };
    }
    const actorPending = state.pendingDecisions.find((decision) =>
      decision.kind === 'legendary_action_window' && decision.combatant === actor.profile.id) ?? null;
    const actorUpcoming = capsule.projection.initiative.timeline.upcoming.find((event) =>
      event.kind === 'legendary_action_window' && event.legendaryCombatant === actor.profile.id);
    const nextWindow = actorPending !== null
      ? {
          status: 'resolved', afterCombatant: actorPending.boundary.activeCombatant,
          round: actorPending.boundary.round, source: 'pending_decision',
        }
      : actorUpcoming !== undefined
        ? {
            status: 'resolved', afterCombatant: actorUpcoming.boundary.combatant,
            round: actorUpcoming.boundary.round, source: 'timeline',
          }
        : { status: 'unresolved', reason: 'next_legendary_window_unavailable' };
    return {
      status: 'resolved',
      combatant: actor.profile.id,
      name: actor.profile.name,
      action_uses: { remaining: pool.actionUsesRemaining, maximum: pool.actionUsesMaximum },
      resistance_uses: { remaining: pool.resistanceUsesRemaining, maximum: pool.resistanceUsesMaximum },
      next_window: nextWindow,
      pending_window: actorPending === null ? null : {
        decision_id: actorPending.id,
        after_combatant: actorPending.boundary.activeCombatant,
        round: actorPending.boundary.round,
        options: actorPending.options.map((option) => {
          if (option.id === 'pass') {
            return { id: option.id, label: option.label, status: 'resolved', kind: 'pass' };
          }
          const action = legendary.actions.find((candidate) =>
            `legendary_action:${candidate.id}` === option.id);
          return action === undefined
            ? {
                id: option.id, label: option.label, status: 'unresolved',
                reason: 'legendary_action_missing_from_statblock',
              }
            : {
                id: option.id, label: option.label, status: 'resolved',
                kind: action.kind === 'move_and_attack' ? 'attack' : 'temporary_defense',
              };
        }),
      },
    };
  });
  return {
    full: {
      ...compact,
      detail_level: 'full',
      actors,
      resistance_spend_inputs: state.pendingDecisions.flatMap((decision) =>
        decision.kind === 'legendary_resistance'
          ? [{ status: 'unresolved', reason: 'effect_severity_unavailable' }]
          : []),
    },
    compact,
    hasDetails: true,
  };
}

function capsuleIntelReports(
  state: EncounterState,
  capsule: EngineStateCapsule,
  queries: EngineQueryPort,
): CapsuleIntelReports {
  const legendary = legendaryWindowReports(state, capsule);
  const recoveryTargets = state.combatants
    .filter((candidate) => candidate.life === 'dying' || candidate.life === 'dead')
    .map((candidate) => ({
      target: candidate.profile.id,
      status: 'unresolved',
      reason: 'party_data_unavailable',
    }));
  const searchMemories = state.searchMemories ?? [];
  const alerting = state.alerting;
  const helpCalls = state.eventLog.filter(
    (event): event is Extract<EncounterEvent, { readonly type: 'npc_called_for_help' }> =>
      event.type === 'npc_called_for_help',
  );
  const hasHelpCallJoins = alerting?.membership.some(
    (entry) => entry.kind === 'participant' && entry.joinedBy.kind === 'help_call',
  ) === true;
  return {
    actorKnowledge: actorKnowledgeReports(state, queries, capsule),
    reactionSpendHold: reactionSpendHoldReports(state),
    legendaryWindows: legendary.full,
    legendaryWindowsCompact: legendary.compact,
    legendaryHasDetails: legendary.hasDetails,
    recoveryCapabilities: {
      policy: ENGINE_RECOVERY_CAPABILITY_POLICY,
      targets: recoveryTargets,
    },
    hasRecoveryTargets: recoveryTargets.length > 0,
    searchMemory: renderSearchMemory(searchMemories),
    hasSearchMemories: searchMemories.length > 0,
    alertState: renderAlertState(alerting, helpCalls),
    alertStateCompact: renderAlertState(alerting, [], false),
    hasAlertDetails: helpCalls.length > 0 || hasHelpCallJoins,
  };
}

function renderSearchMemory(memories: readonly SearchMemory[]): Readonly<Record<string, unknown>> {
  return {
    policy: SEARCH_MEMORY_POLICY,
    memories: memories.map((memory) => ({
      observer: memory.observer,
      target: memory.target,
      cause: memory.cause,
      last_known_position: memory.lastKnownPosition,
      lost_at_round: memory.lostAtRound,
      expires: memory.expires,
      suspicion: {
        kind: memory.suspicion.kind,
        center: memory.suspicion.center,
        radius_feet: memory.suspicion.radius,
        cells: [...memory.suspicion.cells],
      },
      legal_escalations: memory.legalOptions.map((option) => {
        switch (option.kind) {
          case 'move_and_search': return { kind: option.kind, citation: option.searchCitation };
          case 'ready_action': return { kind: option.kind, citation: option.readyCitation };
          case 'attack_suspected_square': return {
            kind: option.kind,
            roll_mode: option.rollMode,
            citation: option.unseenTargetCitation,
          };
          case 'area_effect_over_region': return { kind: option.kind };
        }
      }),
    })),
  };
}

function renderAlertState(
  alerting: EncounterAlertingState | undefined,
  helpCalls: readonly Extract<EncounterEvent, { readonly type: 'npc_called_for_help' }>[],
  includeJoins = true,
): Readonly<Record<string, unknown>> {
  return {
    policy: ALERTING_POLICY,
    yelling_distance_feet: alerting?.yellingDistance.radius ?? 60,
    sound_propagation: alerting?.soundPropagation ?? { kind: 'radial', occlusion: 'not_modeled' },
    calls: helpCalls.map((event) => ({
      caller: event.caller,
      attacker: event.attacker,
      origin: event.origin,
      round: event.round,
    })),
    joined: (alerting?.membership ?? []).flatMap((entry) =>
      includeJoins && entry.kind === 'participant' && entry.joinedBy.kind === 'help_call'
        ? [{ combatant: entry.combatant, called_by: entry.joinedBy.caller, round: entry.joinedBy.round }]
        : []),
  };
}

function renderFailureModesWithCoverage(): Readonly<Record<string, unknown>> {
  const rendered = renderEngineFailureModes();
  const modes = rendered['modes'];
  if (!Array.isArray(modes)) throw new TypeError('Failure-mode renderer returned no modes.');
  const coveredCodes = new Set(['no_help_calling_plan', 'no_invisibility_search_plan']);
  return {
    policy: rendered['policy'],
    modes: modes.filter((mode) => typeof mode === 'string' && !coveredCodes.has(mode.split(':', 1)[0] ?? '')),
    covered_blind_spot_classes: [
      { class: 'combat_membership_leash', covered_by_policy: ALERTING_POLICY },
      { class: 'stealth_search', covered_by_policy: SEARCH_MEMORY_POLICY },
    ],
  };
}

export function createEngineMcpApplication(dependencies: EngineMcpDependencies): EngineMcpApplication {
  const selectedOverridePolicy = overridePolicyRule(
    dependencies.overridePolicy ?? DEFAULT_OVERRIDE_POLICY,
  );
  if (dependencies.maximumToolResultBytes !== undefined && dependencies.maximumToolResultBytes > 64 * 1024) {
    throw new RangeError('maximumToolResultBytes cannot exceed the 64 KiB hard limit.');
  }
  if (dependencies.maximumResourceBytes !== undefined && dependencies.maximumResourceBytes > 128 * 1024) {
    throw new RangeError('maximumResourceBytes cannot exceed the 128 KiB hard limit.');
  }
  const { state, stateSource: feed, proposals, speculativePlans, narration, adjudications, rules } = dependencies;
  const { queries, turnProposals } = dependencies;
  const launchCapsule = feed.current();
  const launchRequest = launchCapsule.request;
  const launcherRoundBinding: LauncherRoundSubmissionBinding | null =
    launchRequest !== null && launchRequest.phase !== 'speculative' && launchRequest.kind !== 'plan_adjustment'
      ? {
          stateRef: externalStateRef(launchCapsule),
          requestId: launchRequest.requestId,
          phase: launchRequest.phase,
        }
      : null;
  const rendererProfile = rendererProfileSchema.parse(
    dependencies.rendererProfile ?? DEFAULT_RENDERER_PROFILE,
  );
  const turnContextMaximumBytes = dependencies.turnContextMaximumBytes ?? TURN_CONTEXT_MAX_BYTES;
  if (!Number.isSafeInteger(turnContextMaximumBytes) || turnContextMaximumBytes < 1) {
    throw new RangeError('turnContextMaximumBytes must be a positive safe integer.');
  }
  // Profile and measure the complete incumbent context before the one authoritative cap pass.
  const fullContextAssemblyMaximumBytes = Number.MAX_SAFE_INTEGER;
  let optionReferences: ReadonlyMap<string, string> = new Map();
  const idempotency = new Map<string, { readonly bytes: string; readonly result: unknown }>();
  const applicationCursors = new Map<string, { readonly digest: string; readonly key: string; readonly offset: number }>();
  const opportunityReports = new Map<string, ReturnType<typeof actorOpportunityReport>>();
  const teamPlanReports = new Map<string, TeamPlanFrontierReport>();
  const contextIntelReports = new Map<string, CapsuleIntelReports>();
  const forcedIntelMode: IntelMode | null = process.env['DND_LANE_INTEL_MODE'] === 'off' ? 'off' : null;
  let activeIntelMode: IntelMode = forcedIntelMode ?? 'full';
  function requestedIntelMode(input: Readonly<Record<string, unknown>>): IntelMode {
    if (forcedIntelMode !== null) return forcedIntelMode;
    const requested = input['intel_mode'];
    if (requested === undefined) return activeIntelMode;
    if (requested !== 'full' && requested !== 'off') throw new TypeError('intel_mode must be full or off.');
    activeIntelMode = requested;
    return requested;
  }
  function contextIntelReport(capsule: EngineStateCapsule): CapsuleIntelReports {
    const prior = contextIntelReports.get(capsule.digest);
    if (prior !== undefined) return prior;
    const report = capsuleIntelReports(state, capsule, queries);
    contextIntelReports.set(capsule.digest, report);
    return report;
  }
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
  function roundBindingRejection(
    capsule: EngineStateCapsule,
    code: 'AMBIGUOUS_SUBMISSION_BINDING' | 'STALE_SUBMISSION_BINDING' | 'ROUND_SUBMISSION_BINDING_UNAVAILABLE',
    summary: string,
  ): Readonly<Record<string, unknown>> {
    const actorId = capsule.request?.actors[0];
    if (actorId === undefined) throw new RangeError(code);
    return {
      status: 'rejected',
      state_ref: externalStateRef(capsule),
      actor_refusals: [{
        actor_id: actorId,
        codes: [code],
        summary,
        attempt_rejections: [{
          attempt: 'primary',
          declared_option_id: null,
          rejection_reasons: [summary],
        }],
      }],
      correction_guidance: correctionGuidance(capsule),
    };
  }
  function prepareRoundSubmission(value: Readonly<Record<string, unknown>>): PreparedRoundSubmission {
    if (!engineSchemaInternals.minimalSubmitRoundTransportInput.safeParse(value).success) {
      return { kind: 'explicit_envelope', submittedArguments: value, envelope: value };
    }
    const current = feed.current();
    if (launcherRoundBinding === null) {
      return {
        kind: 'rejected',
        result: roundBindingRejection(
          current,
          'ROUND_SUBMISSION_BINDING_UNAVAILABLE',
          'This launcher was not issued for an ordinary round proposal request.',
        ),
      };
    }
    const currentRequest = current.request;
    if (currentRequest !== null && currentRequest.phase !== 'speculative' &&
      currentRequest.kind !== 'plan_adjustment' && currentRequest.requestId !== launcherRoundBinding.requestId) {
      return {
        kind: 'rejected',
        result: roundBindingRejection(
          current,
          'AMBIGUOUS_SUBMISSION_BINDING',
          'More than one pending round request is visible to this launcher binding; no request was selected.',
        ),
      };
    }
    const currentStateRef = externalStateRef(current);
    if (currentRequest === null || currentRequest.phase === 'speculative' ||
      currentRequest.kind === 'plan_adjustment' ||
      currentRequest.requestId !== launcherRoundBinding.requestId ||
      currentRequest.phase !== launcherRoundBinding.phase ||
      canonicalJson(currentStateRef) !== canonicalJson(launcherRoundBinding.stateRef)) {
      return {
        kind: 'rejected',
        result: roundBindingRejection(
          current,
          'STALE_SUBMISSION_BINDING',
          'The launcher turn binding is stale; refresh the current turn before submitting.',
        ),
      };
    }
    const idempotencyKey = `round-submit:${sha256(canonicalJson({
      state_ref: launcherRoundBinding.stateRef,
      request_id: launcherRoundBinding.requestId,
      phase: launcherRoundBinding.phase,
    })).slice(0, 48)}`;
    return {
      kind: 'minimal_submission',
      submittedArguments: value,
      envelope: {
        state_ref: launcherRoundBinding.stateRef,
        request_id: launcherRoundBinding.requestId,
        phase: launcherRoundBinding.phase,
        idempotency_key: idempotencyKey,
        proposals: value['proposals'],
        ...(value['rationale'] === undefined ? {} : { rationale: value['rationale'] }),
        ...(value['reaction_guidance'] === undefined ? {} : {
          reaction_guidance: value['reaction_guidance'],
        }),
      },
    };
  }
  function proposalWithPlayObjective(
    capsule: EngineStateCapsule,
    proposal: EngineTurnProposal,
    playToken: string,
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
            kind: 'engine_play',
            token: enginePlayToken(playToken),
          },
        }
      : proposal;
  }
  function dominanceRefusal(
    capsule: EngineStateCapsule,
    proposal: EngineTurnProposal,
    selectedOptionId: EngineOfferableOption['optionId'],
  ): { readonly code: string; readonly summary: string } | null {
    const dominance = submissionDominance(
      opportunityReport(capsule, proposal.actorId),
      selectedOptionId,
    );
    const override = proposal.overrideJustification;
    if (override !== null && decisionReasonProblem(proposal.reason) !== null) {
      return {
        code: 'OVERRIDE_UNJUSTIFIED',
        summary: 'An override reason must explain the decision instead of restating that an option was offered, legal, selected, or revision-bound.',
      };
    }
    if (override !== null) {
      const policyRefusal = selectedOverridePolicy.refusal(override);
      if (policyRefusal !== null) return policyRefusal;
    }
    if (dominance.status !== 'dominated') return null;
    if (override === null) {
      return { code: 'DOMINATED_OPTION_REQUIRES_OVERRIDE', summary: dominance.delta };
    }
    const issuedPlayTokens = SNIPPET_REGISTRY.applicable(capsule).map((play) => play.snippetHash);
    if (override.kind === 'engine_play' &&
      (override.token === null || !issuedPlayTokens.includes(override.token))) return {
        code: 'OVERRIDE_UNJUSTIFIED',
        summary: `${dominance.delta} The engine_play override must name a current-context token.`,
      };
    if (override.kind === 'missing_metric' && override.id === null) return {
      code: 'OVERRIDE_UNJUSTIFIED',
      summary: `${dominance.delta} The missing_metric override must name a typed metric id.`,
    };
    return null;
  }
  function fullTurnContext(
    capsule: EngineStateCapsule,
    input: Readonly<Record<string, unknown>>,
  ): Readonly<Record<string, unknown>> {
    const requestActors = capsule.request?.actors ?? [];
    const actorFilter = Array.isArray(input['actor_ids'])
      ? input['actor_ids'].map((id) => combatantId(String(id)))
      : null;
    const requested = actorFilter !== null && actorFilter.every((actorId) => requestActors.includes(actorId))
      ? actorFilter
      : requestActors;
    const activeRequestedActor = capsule.projection.activeCombatant !== null &&
      requested.includes(capsule.projection.activeCombatant)
      ? capsule.projection.activeCombatant
      : null;
    const required = input['scope'] === 'active_turn' && activeRequestedActor !== null
      ? [activeRequestedActor]
      : requested;
    const maximum = typeof input['maximum_options_per_actor'] === 'number' ? input['maximum_options_per_actor'] : 20;
    const includeExpectations = input['include_expectations'] !== false;
    if (requestedIntelMode(input) === 'off') {
      const actors = [...required].sort().map((actorId) => {
        const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
        if (actor === undefined) throw new RangeError(`ACTOR_ABSENT:${actorId}`);
        const all = tacticalOptions(state, queries, capsule, actorId, false);
        return {
          actor_id: actorId,
          status: actorStatus(actor),
          options: all.slice(0, maximum),
          threats: [...threats(state, queries, actorId)],
          omitted: all.length > maximum,
        };
      });
      const adjustmentRequest = capsule.request?.phase !== 'speculative' && capsule.request?.kind === 'plan_adjustment'
        ? capsule.request
        : null;
      const applicablePlays = adjustmentRequest === null ? SNIPPET_REGISTRY.applicable(capsule) : [];
      const applicableSkills = SNIPPET_REGISTRY.applicableSkills(capsule);
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
        summary: tacticalSummary(capsule),
        actors: actors.map(({ omitted: _omitted, ...actor }) => actor),
        recent_changes: [...recentChanges(capsule)],
        applicable_plays: applicablePlays.map((play) => ({
          name: play.name,
          description: play.description,
          snippet_hash: play.snippetHash,
          play_token: play.snippetHash,
        })),
        applicable_skills: applicableSkills.map((skill) => ({
          name: skill.name,
          description: skill.description,
          skill_hash: skill.skillHash,
        })),
        ...(adjustmentRequest === null ? {} : {
          current_plan: {
            parent_plan_id: adjustmentRequest.parentPlanId,
            baseline_plan_hash: adjustmentRequest.baselinePlanHash,
            open_actor_proposals: adjustmentRequest.baselineProposalDigests.map((entry) => ({
              actor_id: entry.actorId,
              proposal_digest: entry.proposalDigest,
            })),
          },
        }),
        truncated: actors.some((actor) => actor.omitted),
        next_cursor: null,
      };
      const topPlay = applicablePlays[0];
      const suggestedPlan = topPlay === undefined
        ? null
        : (() => {
          const draft = SNIPPET_REGISTRY.expand(topPlay.name, capsule);
          const plan = {
            play_name: topPlay.name,
            snippet_hash: topPlay.snippetHash,
            play_token: topPlay.snippetHash,
            proposals: draft.proposals.map((proposal) =>
              externalProposal(proposalWithPlayObjective(capsule, proposal, topPlay.snippetHash))),
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
        output = suggestedPlan === null ? result : { ...result, suggested_plan: suggestedPlan };
      };
      if (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
        result.applicable_skills.length > 0) {
        result.applicable_skills.splice(0);
        markContextTrimmed();
      }
      while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
        const actor = [...result.actors].reverse().find((candidate) => candidate.options.length > 0);
        if (actor === undefined) break;
        actor.options.pop();
        markContextTrimmed();
      }
      while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
        const actor = [...result.actors].reverse().find((candidate) => candidate.threats.length > 0);
        if (actor === undefined) break;
        actor.threats.pop();
        markContextTrimmed();
      }
      while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
        result.applicable_skills.length > 0) {
        result.applicable_skills.pop();
        markContextTrimmed();
      }
      while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
        result.recent_changes.length > 0) {
        result.recent_changes.pop();
        markContextTrimmed();
      }
      while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
        result.summary.terrain_tags.length > 0) {
        result.summary.terrain_tags.pop();
        markContextTrimmed();
      }
      if (suggestedPlan !== null &&
        new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
        result.truncated = true;
        result.context_trimmed = true;
        output = result;
      }
      while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
        result.actors.length > 1) {
        result.actors.pop();
        markContextTrimmed();
      }
      if (encodedJsonBytes(output) > fullContextAssemblyMaximumBytes) {
        const actor = result.actors[0];
        if (actor === undefined) throw new Error('Turn context requires at least one actor.');
        return {
          granularity: 'full',
          context_trimmed: true,
          state_ref: result.state_ref,
          request: result.request,
          summary: { ...result.summary, terrain_tags: [] },
          actors: [{
            actor_id: actor.actor_id,
            status: { ...actor.status, effect_tags: [], pending_decision_ids: [] },
            options: [],
            threats: [],
          }],
          applicable_plays: [],
          applicable_skills: [],
          recent_changes: [],
          truncated: true,
          next_cursor: null,
        };
      }
      return output;
    }
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
      const all = tacticalOptions(state, queries, capsule, actorId, includeExpectations);
      const intelRows = topDmActorIntelRows(exactIntel, actorId);
      const unresolvedFindings = exactIntel.filter((row) =>
        row.actorId === actorId && !isInformativeDmIntelRow(row)).map((row) => ({
          target_id: row.targetId,
          action_id: row.actionId,
          reason_codes: row.unresolvedReasons,
        }));
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
          rows: intelRows.map((row) => renderDmContextIntelRow(row, rendererProfile.nullFields)),
          movement: movementIntel.status === 'resolved'
            ? movementIntel.rows.filter((row) => row.actorId === actorId)
              .slice(0, 3).map(renderMovementContextRow)
            : [],
          opportunity_cost: renderDodgeOpportunityCost(opportunity),
          salient_window: salientInitiativeWindow(capsule, intelRows),
          ...(unresolvedFindings.length === 0 ? {} : { unresolved_findings: unresolvedFindings }),
        },
        omitted: all.length > maximum,
      };
    });
    const adjustmentRequest = capsule.request?.phase !== 'speculative' && capsule.request?.kind === 'plan_adjustment'
      ? capsule.request
      : null;
    const advertisedPlays = adjustmentRequest === null ? SNIPPET_REGISTRY.applicable(capsule) : [];
    const applicableSkills = SNIPPET_REGISTRY.applicableSkills(capsule);
    const teamReport = teamPlanReport(capsule, advertisedPlays);
    const frontierCandidateIds = new Set(teamReport?.frontier.map((entry) =>
      entry.candidate.candidateId) ?? []);
    const applicablePlays = advertisedPlays.filter((play) => frontierCandidateIds.has(play.name));
    const contextReports = contextIntelReport(capsule);
    const requiredActors = new Set(required);
    const actorKnowledge = {
      policy: ENGINE_ACTOR_KNOWLEDGE_POLICY,
      actors: contextReports.actorKnowledge
        .filter((report) => requiredActors.has(combatantId(String(report['actor_id'])))),
    };
    const reactionSpendHoldContext = {
      policy: ENGINE_REACTION_SPEND_HOLD_POLICY,
      windows: [...contextReports.reactionSpendHold],
    };
    const legendaryWindowsContext = contextReports.legendaryWindows;
    const recoveryCapabilitiesContext = contextReports.recoveryCapabilities;
    const searchMemoryContext = contextReports.searchMemory;
    const alertStateContext = contextReports.alertState;
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
        known_failure_modes: renderFailureModesWithCoverage(),
      } : {}),
      actor_knowledge: actorKnowledge,
      reaction_spend_hold: reactionSpendHoldContext,
      legendary_windows: legendaryWindowsContext,
      recovery_capabilities: recoveryCapabilitiesContext,
      search_memory: searchMemoryContext,
      alert_state: alertStateContext,
      applicable_plays: applicablePlays.map((play) => ({
        name: play.name,
        description: play.description,
        snippet_hash: play.snippetHash,
        play_token: play.snippetHash,
      })),
      applicable_skills: applicableSkills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        skill_hash: skill.skillHash,
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
          play_token: topPlay.snippetHash,
          proposals: draft.proposals.map((proposal) =>
            externalProposal(proposalWithPlayObjective(capsule, proposal, topPlay.snippetHash))),
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
    const initialContextUnderPressure = new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes;
    const markContextTrimmed = (): void => {
      result.truncated = true;
      result.context_trimmed = true;
      if (suggestedPlan !== null && output !== result) {
        output = { ...result, suggested_plan: suggestedPlan };
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
    if (initialContextUnderPressure && result.applicable_skills.length > 0) {
      result.applicable_skills.splice(0);
      markContextTrimmed();
    }
    // These reports can contain board-sized regions or event histories. Compact
    // them once at the first pressure signal, before iterative trimming performs
    // repeated JSON measurements over the remaining context.
    if (initialContextUnderPressure && contextReports.legendaryHasDetails) {
      result.legendary_windows = contextReports.legendaryWindowsCompact;
      markContextTrimmed();
    }
    if (initialContextUnderPressure && result.reaction_spend_hold.windows.length > 0) {
      result.reaction_spend_hold = { policy: ENGINE_REACTION_SPEND_HOLD_POLICY, windows: [] };
      markContextTrimmed();
    }
    if (initialContextUnderPressure && contextReports.hasRecoveryTargets) {
      result.recovery_capabilities = { policy: ENGINE_RECOVERY_CAPABILITY_POLICY, targets: [] };
      markContextTrimmed();
    }
    if (initialContextUnderPressure && result.actor_knowledge.actors.length > 0) {
      result.actor_knowledge = { policy: ENGINE_ACTOR_KNOWLEDGE_POLICY, actors: [] };
      markContextTrimmed();
    }
    if (initialContextUnderPressure && contextReports.hasSearchMemories) {
      result.search_memory = { policy: SEARCH_MEMORY_POLICY, memories: [] };
      markContextTrimmed();
    }
    if (initialContextUnderPressure && contextReports.hasAlertDetails) {
      result.alert_state = contextReports.alertStateCompact;
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.options.length > 0);
      if (actor === undefined) break;
      actor.options.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
      compactTeamPlanFrontier()) {
      // Each iteration advances to the next schema-valid compact representation.
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.movement.length > 1);
      if (actor === undefined) break;
      actor.intel.movement.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.rows.length > 1);
      if (actor === undefined) break;
      actor.intel.rows.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.threats.length > 0);
      if (actor === undefined) break;
      actor.threats.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
      result.applicable_skills.length > 0) {
      result.applicable_skills.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
      result.recent_changes.length > 0) {
      result.recent_changes.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
      result.summary.terrain_tags.length > 0) {
      result.summary.terrain_tags.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.rows.length > 0);
      if (actor === undefined) break;
      actor.intel.rows.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.movement.length > 0);
      if (actor === undefined) break;
      actor.intel.movement.pop();
      markContextTrimmed();
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.opportunity_cost !== null);
      if (actor === undefined) break;
      actor.intel.opportunity_cost = null;
      markContextTrimmed();
    }
    while (encodedJsonBytes(output) > fullContextAssemblyMaximumBytes) {
      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.salient_window !== null);
      if (actor === undefined) break;
      actor.intel.salient_window = null;
      markContextTrimmed();
    }
    while (encodedJsonBytes(output) > fullContextAssemblyMaximumBytes && result.applicable_plays.length > 0) {
      result.applicable_plays.pop();
      markContextTrimmed();
    }
    while (encodedJsonBytes(output) > fullContextAssemblyMaximumBytes) {
      const actor = [...result.actors].reverse().find((candidate) =>
        (Array.isArray(candidate.status.effect_tags) && candidate.status.effect_tags.length > 0) ||
        (Array.isArray(candidate.status.pending_decision_ids) && candidate.status.pending_decision_ids.length > 0));
      if (actor === undefined) break;
      const effectTags = actor.status.effect_tags;
      const pendingDecisionIds = actor.status.pending_decision_ids;
      if (Array.isArray(effectTags)) effectTags.splice(0);
      if (Array.isArray(pendingDecisionIds)) pendingDecisionIds.splice(0);
      markContextTrimmed();
    }
    if (suggestedPlan !== null &&
      new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes) {
      result.truncated = true;
      result.context_trimmed = true;
      output = result;
    }
    while (new TextEncoder().encode(JSON.stringify(output)).byteLength > fullContextAssemblyMaximumBytes &&
      result.actors.length > 1) {
      result.actors.pop();
      markContextTrimmed();
    }
    if (encodedJsonBytes(output) > fullContextAssemblyMaximumBytes) {
      const actor = result.actors[0];
      if (actor === undefined) throw new Error('Turn context requires at least one actor.');
      return {
        granularity: 'full',
        context_trimmed: true,
        state_ref: result.state_ref,
        request: result.request,
        summary: { ...result.summary, terrain_tags: [] },
        actors: [{
          actor_id: actor.actor_id,
          status: { ...actor.status, effect_tags: [], pending_decision_ids: [] },
          options: [],
          threats: [],
          intel: {
            policy: actor.intel.policy,
            zero_movement_offense_count: actor.intel.zero_movement_offense_count,
            rows: [],
            movement: [],
            opportunity_cost: null,
            salient_window: null,
          },
        }],
        actor_knowledge: { policy: ENGINE_ACTOR_KNOWLEDGE_POLICY, actors: [] },
        reaction_spend_hold: { policy: ENGINE_REACTION_SPEND_HOLD_POLICY, windows: [] },
        legendary_windows: contextReports.legendaryWindowsCompact,
        recovery_capabilities: { policy: ENGINE_RECOVERY_CAPABILITY_POLICY, targets: [] },
        search_memory: { policy: SEARCH_MEMORY_POLICY, memories: [] },
        alert_state: contextReports.alertStateCompact,
        applicable_plays: [],
        applicable_skills: [],
        team_plan_frontier: null,
        recent_changes: [],
        truncated: true,
        next_cursor: null,
      };
    }
    return output;
  }
  const decodeRenderedProposal = (value: unknown): EngineTurnProposal => {
    const input = record(value, 'proposal');
    const primary = stringField(input, 'primary_option_id');
    const fallback = input['fallback_option_id'];
    return decodeProposal({
      ...input,
      primary_option_id: resolveOptionReference(primary, optionReferences),
      fallback_option_id: typeof fallback === 'string'
        ? resolveOptionReference(fallback, optionReferences)
        : fallback,
    });
  };
  function execute(name: string, value: unknown): unknown {
    const suppliedInput = record(value, `${name} arguments`);
    const roundSubmission = name === 'engine.submit_round_proposals'
      ? prepareRoundSubmission(suppliedInput)
      : null;
    if (roundSubmission?.kind === 'rejected') return roundSubmission.result;
    const input = roundSubmission === null ? suppliedInput : roundSubmission.envelope;
    if (name === 'engine.read_kb_subject') {
      const budget = dependencies.kbReadBudget;
      const callPhase = dependencies.kbReadCallPhase;
      if (budget === undefined || callPhase === undefined) {
        throw new RangeError('KB_SUBJECT_READER_UNAVAILABLE');
      }
      return budget.read(
        stringField(input, 'subject') as import('../knowledge-base-contract').KbSubject,
        callPhase,
      );
    }
    if (name === 'engine.get_turn_context') {
      const capsule = exactCurrent(feed, stringField(input, 'run_id'), numberField(input, 'expected_revision'));
      if (capsule.request === null) throw new RangeError('NO_PENDING_REQUEST');
      if (capsule.request.phase === 'speculative') throw new RangeError('SPECULATIVE_CONTEXT_USES_CAPSULE_MENU');
      const incumbentFull = fullTurnContext(capsule, input);
      const rendered = renderTurnContextProfile(incumbentFull, rendererProfile);
      optionReferences = rendered.optionRefs;
      if (rendererProfile.format !== 'structured') {
        const prose = renderProseTurnContext(
          rendered.context,
          rendererProfile.format,
          rendered.optionRefs,
          turnContextMaximumBytes,
        );
        const features = extractCircumstanceFeatures({
          state,
          capsule,
          renderedContext: rendered.context,
          granularity: 'full',
          preTrimBytes: prose.preTrimBytes,
          postTrimBytes: prose.postTrimBytes,
        });
        dependencies.onTurnContextRendered?.({
          preTrimBytes: prose.preTrimBytes,
          postTrimBytes: prose.postTrimBytes,
          features,
          removals: rendered.removals,
        });
        dependencies.onTurnContext?.(structuredClone(prose.context));
        return prose.context;
      }
      const preTrimBytes = renderBytes(rendered.context);
      const trimToLimit = (source: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => {
        const sourceBytes = source === rendered.context ? preTrimBytes : renderBytes(source);
        if (sourceBytes <= turnContextMaximumBytes) return source;
        const candidate = structuredClone(source) as Record<string, unknown>;
        candidate['context_trimmed'] = true;
        candidate['truncated'] = true;
        const actorValues = Array.isArray(candidate['actors']) ? candidate['actors'] : [];
        const actorRecords = actorValues.filter((actor): actor is Record<string, unknown> =>
          typeof actor === 'object' && actor !== null && !Array.isArray(actor));
        const arrays = (key: 'options' | 'threats', actor: Record<string, unknown>): unknown[] =>
          Array.isArray(actor[key]) ? actor[key] as unknown[] : [];
        const objectAt = (parent: Record<string, unknown>, key: string): Record<string, unknown> | null => {
          const value = parent[key];
          return typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value as Record<string, unknown>
            : null;
        };
        const clearArrayField = (parent: Record<string, unknown>, key: string): void => {
          if (Array.isArray(parent[key])) parent[key] = [];
        };
        clearArrayField(candidate, 'applicable_skills');
        const knowledge = objectAt(candidate, 'actor_knowledge');
        if (knowledge !== null) clearArrayField(knowledge, 'actors');
        const reactions = objectAt(candidate, 'reaction_spend_hold');
        if (reactions !== null) clearArrayField(reactions, 'windows');
        const recovery = objectAt(candidate, 'recovery_capabilities');
        if (recovery !== null) clearArrayField(recovery, 'targets');
        const search = objectAt(candidate, 'search_memory');
        if (search !== null) clearArrayField(search, 'memories');
        const alert = objectAt(candidate, 'alert_state');
        if (alert !== null) {
          clearArrayField(alert, 'calls');
          clearArrayField(alert, 'joined');
          clearArrayField(alert, 'membership');
        }
        const legendary = objectAt(candidate, 'legendary_windows');
        if (legendary !== null && legendary['detail_level'] !== 'compact') {
          candidate['legendary_windows'] = {
            policy: legendary['policy'],
            status: legendary['status'],
            detail_level: 'compact',
            compact: Array.isArray(legendary['compact']) ? legendary['compact'] : [],
          };
        }
        const compactFallback = (): Readonly<Record<string, unknown>> => {
          const fallbackReferences = new Map(optionReferences);
          let referenceSequence = 1;
          const sourceActors = Array.isArray(source['actors']) ? source['actors'] : [];
          const compactActors = sourceActors.flatMap((actorValue) => {
            const actor = typeof actorValue === 'object' && actorValue !== null && !Array.isArray(actorValue)
              ? actorValue as Record<string, unknown>
              : null;
            if (actor === null) return [];
            const intel = objectAt(actor, 'intel');
            const opportunity = objectAt(intel ?? {}, 'opportunity_cost');
            const defaultId = opportunity?.['engine_default_option_id'];
            const actorOptions = Array.isArray(actor['options'])
              ? actor['options'].flatMap((optionValue) => {
                  const option = typeof optionValue === 'object' && optionValue !== null && !Array.isArray(optionValue)
                    ? optionValue as Record<string, unknown>
                    : null;
                  return option === null ? [] : [option];
                })
              : [];
            const exactId = (option: Record<string, unknown>): string | null => {
              if (typeof option['option_id'] === 'string') return option['option_id'];
              return typeof option['option_ref'] === 'string'
                ? optionReferences.get(option['option_ref']) ?? null
                : null;
            };
            const defaultOption = actorOptions.find((option) => exactId(option) === defaultId);
            const floorOptions = [
              ...(defaultOption === undefined ? [] : [defaultOption]),
              ...actorOptions.filter((option) => option !== defaultOption),
            ].slice(0, Math.min(2, actorOptions.length));
            const compactOptions = floorOptions.flatMap((option) => {
              const optionId = exactId(option);
              if (optionId === null) return [];
              const reference = `k${String(referenceSequence)}`;
              referenceSequence += 1;
              fallbackReferences.set(reference, optionId);
              return [{
                option_id: reference,
                action_id: option['action_id'],
                kind: option['kind'],
                usable_now: option['usable_now'],
                usable_after_movement: option['usable_after_movement'],
                minimum_movement_feet: option['minimum_movement_feet'],
              }];
            });
            const status = objectAt(actor, 'status');
            return [{
              actor_id: actor['actor_id'],
              status: status === null ? {} : {
                life: status['life'], hit_point_band: status['hit_point_band'],
                movement_feet: status['movement_feet'],
              },
              options: compactOptions,
              threats: [],
              intel: {
                policy: intel?.['policy'],
                zero_movement_offense_count: intel?.['zero_movement_offense_count'],
                rows: [], movement: [], opportunity_cost: null, salient_window: null,
              },
            }];
          });
          optionReferences = fallbackReferences;
          const sourceSummary = objectAt(source as Record<string, unknown>, 'summary');
          const sourceFrontier = objectAt(source as Record<string, unknown>, 'team_plan_frontier');
          const sourceFailures = objectAt(source as Record<string, unknown>, 'known_failure_modes');
          const compact = {
            granularity: 'full' as const,
            context_trimmed: true,
            state_ref: source['state_ref'],
            request: source['request'],
            summary: sourceSummary === null ? undefined : {
              room: sourceSummary['room'], round: sourceSummary['round'],
              active_side: sourceSummary['active_side'], living_allies: sourceSummary['living_allies'],
              living_enemies: sourceSummary['living_enemies'], terrain_tags: [],
            },
            actors: compactActors,
            actor_knowledge: { policy: objectAt(source as Record<string, unknown>, 'actor_knowledge')?.['policy'], actors: [] },
            reaction_spend_hold: { policy: objectAt(source as Record<string, unknown>, 'reaction_spend_hold')?.['policy'], windows: [] },
            legendary_windows: {
              policy: objectAt(source as Record<string, unknown>, 'legendary_windows')?.['policy'],
              detail_level: 'compact', compact: [],
            },
            recovery_capabilities: { policy: objectAt(source as Record<string, unknown>, 'recovery_capabilities')?.['policy'], targets: [] },
            search_memory: { policy: objectAt(source as Record<string, unknown>, 'search_memory')?.['policy'], memories: [] },
            alert_state: {
              policy: objectAt(source as Record<string, unknown>, 'alert_state')?.['policy'], calls: [], joined: [],
            },
            applicable_plays: [], applicable_skills: [], recent_changes: [],
            team_plan_frontier: sourceFrontier === null ? null : {
              policy: sourceFrontier['policy'],
              frontier_resolution: sourceFrontier['frontier_resolution'],
              detail_level: 'omitted',
              frontier_candidate_count: Array.isArray(sourceFrontier['candidates'])
                ? sourceFrontier['candidates'].length
                : sourceFrontier['frontier_candidate_count'] ?? 0,
              removed_candidate_count: Array.isArray(sourceFrontier['removed'])
                ? sourceFrontier['removed'].length
                : sourceFrontier['removed_candidate_count'] ?? 0,
              reason: 'context_size_limit',
            },
            ...(sourceFailures === null ? {} : {
              known_failure_modes: { policy: sourceFailures['policy'] },
            }),
            renderer_attribution: source['renderer_attribution'],
            compact_fallback: true,
            truncated: true,
            next_cursor: null,
          };
          const compactBytes = renderBytes(compact);
          return compactBytes <= turnContextMaximumBytes
            ? compact
            : { ...compact, renderer_defect: {
                code: 'K_SET_FLOOR_EXCEEDS_CONTEXT_CAP',
                measured_bytes: compactBytes,
                configured_cap_bytes: turnContextMaximumBytes,
              } };
        };
        while (renderBytes(candidate) > turnContextMaximumBytes) {
          const actor = [...actorRecords].reverse().find((entry) => arrays('options', entry).length > 2);
          if (actor === undefined) break;
          arrays('options', actor).pop();
        }
        while (renderBytes(candidate) > turnContextMaximumBytes) {
          const actor = [...actorRecords].reverse().find((entry) => {
            const intel = objectAt(entry, 'intel');
            return intel !== null && Array.isArray(intel['movement']) && intel['movement'].length > 0;
          });
          if (actor === undefined) break;
          const intel = objectAt(actor, 'intel');
          if (intel !== null && Array.isArray(intel['movement'])) intel['movement'].pop();
        }
        while (renderBytes(candidate) > turnContextMaximumBytes) {
          const actor = [...actorRecords].reverse().find((entry) => {
            const intel = entry['intel'];
            return typeof intel === 'object' && intel !== null && !Array.isArray(intel) &&
              Array.isArray((intel as Record<string, unknown>)['rows']) &&
              ((intel as Record<string, unknown>)['rows'] as unknown[]).length > 0;
          });
          if (actor === undefined) break;
          const intel = record(actor['intel'], 'profiled actor intel');
          (intel['rows'] as unknown[]).pop();
        }
        while (renderBytes(candidate) > turnContextMaximumBytes) {
          const actor = [...actorRecords].reverse().find((entry) => arrays('threats', entry).length > 0);
          if (actor === undefined) break;
          arrays('threats', actor).pop();
        }
        if (renderBytes(candidate) > turnContextMaximumBytes) clearArrayField(candidate, 'recent_changes');
        const summary = objectAt(candidate, 'summary');
        if (renderBytes(candidate) > turnContextMaximumBytes && summary !== null) clearArrayField(summary, 'terrain_tags');
        if (renderBytes(candidate) > turnContextMaximumBytes) candidate['team_plan_frontier'] = null;
        if (renderBytes(candidate) > turnContextMaximumBytes) clearArrayField(candidate, 'applicable_plays');
        while (renderBytes(candidate) > turnContextMaximumBytes) {
          const actor = [...actorRecords].reverse().find((entry) =>
            objectAt(objectAt(entry, 'intel') ?? {}, 'opportunity_cost') !== null);
          if (actor === undefined) break;
          const intel = objectAt(actor, 'intel');
          if (intel !== null) intel['opportunity_cost'] = null;
        }
        if (renderBytes(candidate) > turnContextMaximumBytes) {
          for (const actor of actorRecords) {
            const status = objectAt(actor, 'status');
            if (status !== null) {
              clearArrayField(status, 'effect_tags');
              clearArrayField(status, 'pending_decision_ids');
            }
          }
        }
        if (renderBytes(candidate) > turnContextMaximumBytes) delete candidate['suggested_plan'];
        if (renderBytes(candidate) > turnContextMaximumBytes) {
          return compactFallback();
        }
        return candidate;
      };
      const untrimmedFull = rendered.context;
      let trimmedFull: Readonly<Record<string, unknown>> | undefined;
      const full = (): Readonly<Record<string, unknown>> => {
        trimmedFull ??= trimToLimit(untrimmedFull);
        return trimmedFull;
      };
      const base = dependencies.turnContextDeltaBase;
      const wantsDelta = rendererProfile.delta !== 'off' && input['granularity'] === 'turn_delta';
      const contextCandidate = !wantsDelta || base === undefined ||
        input['since_revision'] !== base.revision ||
        base.context['granularity'] !== 'full'
        ? untrimmedFull
        : (() => {
            const baseStateRef = record(base.context['state_ref'], 'turn context delta base state_ref');
            if (baseStateRef['run_id'] !== capsule.runId ||
              baseStateRef['expected_revision'] !== base.revision) return untrimmedFull;
            const anchor = rendererProfile.anchor === 'hash_only'
              ? {
                  base_revision: base.revision,
                  revision: capsule.revision,
                  base_context_hash: sha256(canonicalJson(base.context)),
                  context_hash: sha256(canonicalJson(untrimmedFull)),
                }
              : {
                  base_revision: base.revision,
                  revision: capsule.revision,
                  base_context_hash: sha256(canonicalJson(base.context)),
                  context_hash: sha256(canonicalJson(untrimmedFull)),
                  state_ref: untrimmedFull['state_ref'],
                  request: untrimmedFull['request'],
                };
            const delta = {
              granularity: 'turn_delta' as const,
              anchor,
              changes: diffTurnContextValues(base.context, untrimmedFull),
              context_trimmed: untrimmedFull['context_trimmed'],
              renderer_attribution: untrimmedFull['renderer_attribution'],
            };
            return rendererProfile.delta === 'guarded' && renderBytes(delta) >= renderBytes(untrimmedFull) * 0.8
              ? untrimmedFull
              : delta;
          })();
      const context = contextCandidate['granularity'] === 'full'
        ? trimToLimit(contextCandidate)
        : encodedJsonBytes(contextCandidate) <= turnContextMaximumBytes
          ? contextCandidate
          : { ...full(), context_trimmed: true, truncated: true };
      const postTrimBytes = renderBytes(context);
      const featurePreTrimBytes = context['granularity'] === 'turn_delta'
        ? renderBytes(contextCandidate)
        : preTrimBytes;
      const features = extractCircumstanceFeatures({
        state,
        capsule,
        renderedContext: untrimmedFull,
        granularity: context['granularity'] === 'turn_delta' ? 'turn_delta' : 'full',
        preTrimBytes: featurePreTrimBytes,
        postTrimBytes,
      });
      dependencies.onTurnContextRendered?.({
        preTrimBytes: featurePreTrimBytes,
        postTrimBytes,
        features,
        removals: rendered.removals,
      });
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
        play_token: draft.definition.snippetHash,
        proposals: draft.proposals.map((proposal) =>
          externalProposal(proposalWithPlayObjective(capsule, proposal, draft.definition.snippetHash))),
      };
    }
    if (name === 'engine.load_skill') {
      const capsule = feed.current();
      const requestedName = stringField(input, 'skill_name');
      if (!SKILL_NAMES.some((candidate) => candidate === requestedName)) {
        throw new RangeError(`Unknown skill ${requestedName}.`);
      }
      const loaded = SNIPPET_REGISTRY.loadSkill(requestedName as SkillName, capsule);
      return {
        state_ref: externalStateRef(capsule),
        skill_name: loaded.name,
        skill_hash: loaded.skillHash,
        description: loaded.description,
        procedure: loaded.procedure,
          plays: loaded.plays.map((play) => ({
            name: play.name,
            description: play.description,
            snippet_hash: play.snippetHash,
            play_token: play.snippetHash,
        })),
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
      const informativeMatrix = informativeDmIntelRows(matrix);
      const paged = applicationPage(
        capsule,
        canonicalJson({ actorIds, targetIds: targetIds === null ? null : [...targetIds].sort() }),
        informativeMatrix,
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
        unresolved_findings: matrix.filter((row) => !isInformativeDmIntelRow(row)).map((row) => ({
          actor_id: row.actorId,
          target_id: row.targetId,
          action_id: row.actionId,
          reason_codes: row.unresolvedReasons,
        })),
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
      const combatants = capsule.projection.combatants.filter((actor) => ids === null || ids.includes(actor.id)).sort((left, right) => left.id.localeCompare(right.id)).map((actor) => actor.placementStatus === 'placed'
        ? {
            combatant_id: actor.id,
            name: actor.name,
            side: actor.side,
            status: actorStatus(actor),
            placement_status: 'placed' as const,
            effective_size: actor.effectiveSize,
            placement_mode: actor.placementMode,
            footprint: actor.footprint,
            options: granularity === 'combatant_detail' ? tacticalOptions(state, queries, capsule, actor.id, true) : [],
            threats: granularity === 'turn_minimal' || granularity === 'combatant_detail' ? threats(state, queries, actor.id) : [],
          }
        : {
            combatant_id: actor.id,
            name: actor.name,
            side: actor.side,
            status: actorStatus(actor),
            placement_status: 'placement_pending' as const,
            pending_reason: actor.pendingReason,
            options: [],
            threats: [],
          });
      const history = recentChanges(capsule).filter((entry) => typeof input['since_revision'] !== 'number' || Number(entry['revision']) > input['since_revision']);
      const source = granularity === 'journal_delta' ? history : combatants;
      const paged = applicationPage(capsule, canonicalJson({ granularity, ids, since: input['since_revision'] ?? null }), source, input['page']);
      return { state_ref: externalStateRef(capsule), policy: ENGINE_STATE_SUMMARY_POLICY, granularity, proof_token: engineStateSummaryProofToken(capsule.digest, granularity), summary: { room: capsule.projection.room, round: capsule.projection.round, active_side: capsule.projection.activeSide, combatants: granularity === 'journal_delta' ? [] : paged.values, terrain_tags: tacticalSummary(capsule)['terrain_tags'], history: granularity === 'journal_delta' ? paged.values : history }, truncated: paged.truncated, next_cursor: paged.next };
    }
    if (name === 'engine.get_combatant_options') {
      const actorId = combatantId(stringField(input, 'actor_id'));
      const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
      if (actor === undefined) throw new RangeError('ACTOR_ABSENT');
      const all = tacticalOptions(state, queries, capsule, actorId, true);
      const paged = applicationPage(capsule, canonicalJson({ actorId }), all, input['page']);
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
      const currentRelation = queries.spaceDistance(state, actorId, targetId);
      const candidates: { readonly cell: GridCell; readonly cost: number; readonly relation: number }[] = [];
      for (let row = 0; row < state.bounds.rows; row += 1) for (let column = 0; column < state.bounds.columns; column += 1) {
        const cell = { row, column };
        const path = queries.path(state, { actorId, destination: cell, movement: 'normal', ...(maximumFeet === undefined ? {} : { maximumFeet }) });
        if (!path.legal) continue;
        const kind = stringField(objective, 'kind');
        const actionId = typeof objective['action_id'] === 'string' ? objective['action_id'] : null;
        const relation = queries.spaceDistance(state, actorId, targetId, cell);
        if (relation === null) continue;
        const qualifies = kind === 'enable_action' && actionId !== null ? queries.reach(state, { actorId, targetId, actionId, origin: cell }).legal
          : kind === 'withdraw_from' ? currentRelation !== null && relation > currentRelation
            : kind === 'maintain_range_from' ? relation > 5 : true;
        if (qualifies) candidates.push({ cell, cost: path.costFeet, relation });
      }
      candidates.sort((left, right) => left.cost - right.cost || left.relation - right.relation || left.cell.row - right.cell.row || left.cell.column - right.cell.column);
      const selected = candidates[0];
      return selected === undefined
        ? { state_ref: externalStateRef(capsule), feasible: false, minimum_feet: null, risks: [], resulting_relation: null, refusals: [{ code: 'OBJECTIVE_UNREACHABLE', summary: 'No legal path satisfies the semantic objective.' }] }
        : { state_ref: externalStateRef(capsule), feasible: true, minimum_feet: selected.cost, risks: [], resulting_relation: `${distanceBand(selected.relation)} from ${targetId}`, refusals: [] };
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
        const distance = queries.spaceDistance(state, actorId, targetId);
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
        const expectation = targetId === null
          ? null
          : expectationFor(state, queries, actorId, [{ actionId, targetId }]);
        return expectation === null || expectation['resolvable'] !== true
          ? { candidate_id: stringField(candidate, 'candidate_id'), policy: TACTICAL_EVALUATOR_POLICY, resolvable: false, metrics: { outcome_probability: null, expected_damage: null, expected_healing: null, resource_cost: null, distribution: null }, assumptions: expectation?.['assumption_codes'] ?? [], refusals: [{ code: 'EXPECTATION_UNAVAILABLE', summary: 'The canonical mechanic does not expose an analytic expectation.' }] }
          : { candidate_id: stringField(candidate, 'candidate_id'), policy: expectation['policy'], resolvable: true, metrics: { outcome_probability: expectation['outcome_probability'], expected_damage: expectation['expected_value'], expected_healing: null, resource_cost: 0, distribution: includeDistribution ? [{ outcome: 0, probability: 1 - Number(expectation['outcome_probability']) }, { outcome: Number(expectation['expected_value']) / Number(expectation['outcome_probability']), probability: expectation['outcome_probability'] }] : null }, assumptions: expectation['assumption_codes'], refusals: [] };
      }) };
    }
    if (name === 'engine.validate_proposal') {
      const request = currentRequest(capsule, stringField(input, 'request_id'), stringField(input, 'phase'));
      const proposal = decodeRenderedProposal(input['proposal']);
      if (!request.actors.includes(proposal.actorId)) throw new RangeError('ACTOR_NOT_PENDING');
      if (proposal.expectedRevision !== capsule.revision) throw new RangeError('PROPOSAL_REVISION_MISMATCH');
      const contractRefusal = proposalContractRefusal(request.phase, proposal);
      if (contractRefusal !== null) {
        return { state_ref: externalStateRef(capsule), valid: false, selected_branch: 'none', resolution: null, refusals: [{ code: contractRefusal.code, summary: contractRefusal.summary }], correction_guidance: correctionGuidance(capsule) };
      }
      const resolution = turnProposals.resolve(state, proposal);
      if (!resolution.valid) {
        return { state_ref: externalStateRef(capsule), valid: false, selected_branch: 'none', resolution: null, refusals: resolution.refusals.map((entry) => ({ code: entry.code, summary: entry.summary })), correction_guidance: correctionGuidance(capsule) };
      }
      const refusal = dominanceRefusal(capsule, proposal, resolution.option.optionId);
      return refusal === null
        ? { state_ref: externalStateRef(capsule), valid: true, selected_branch: resolution.selectedBranch, resolution: resolutionPreview(resolution), refusals: [], correction_guidance: null }
        : { state_ref: externalStateRef(capsule), valid: false, selected_branch: 'none', resolution: null, refusals: [refusal], correction_guidance: correctionGuidance(capsule) };
    }
    if (name === 'engine.submit_round_proposals') {
      const request = currentRequest(capsule, stringField(input, 'request_id'), stringField(input, 'phase'));
      if (request.kind === 'plan_adjustment') throw new RangeError('REQUEST_KIND_MISMATCH');
      const proposalValues = input['proposals'];
      if (!Array.isArray(proposalValues)) throw new TypeError('proposals must be an array.');
      const missingReasons = proposalValues.flatMap((value) => {
        const proposal = record(value, 'proposal');
        return typeof proposal['reason'] === 'string' && proposal['reason'].trim().length > 0
          ? []
          : [{
              actor_id: typeof proposal['actor_id'] === 'string' ? proposal['actor_id'] : request.actors[0],
              codes: [typeof proposal['reason'] === 'string' && proposal['override_justification'] !== null
                ? 'OVERRIDE_UNJUSTIFIED' : 'REASON_REQUIRED'],
              summary: typeof proposal['reason'] === 'string' && proposal['override_justification'] !== null
                ? 'An override reason cannot be empty.'
                : 'Each proposal requires one short sentence explaining why this option was chosen.',
              attempt_rejections: [{
                attempt: 'primary' as const,
                declared_option_id: typeof proposal['primary_option_id'] === 'string'
                  ? proposal['primary_option_id'] : null,
                rejection_reasons: [typeof proposal['reason'] === 'string' && proposal['override_justification'] !== null
                  ? 'An override reason cannot be empty.' : 'A proposal reason is required.'],
              }],
            }];
      });
      if (missingReasons.length > 0) {
        return {
          status: 'rejected', state_ref: externalStateRef(capsule),
          actor_refusals: missingReasons, correction_guidance: correctionGuidance(capsule),
        };
      }
      const decoded = proposalValues.map(decodeRenderedProposal);
      const actual = decoded.map((proposal) => proposal.actorId);
      const expected = [...request.actors].sort();
      const normalized = [...actual].sort();
      const actorSetValid = new Set(actual).size === actual.length && expected.length === normalized.length && expected.every((actor, index) => actor === normalized[index]);
      const canonical = actorSetValid
        ? request.actors.map((actorId) => decoded.find((proposal) => proposal.actorId === actorId)).filter((proposal): proposal is EngineTurnProposal => proposal !== undefined)
        : decoded;
      const evaluated = canonical.map((proposal) => {
        const contractRefusal = proposalContractRefusal(request.phase, proposal);
        return {
          proposal,
          contractRefusal,
          resolution: contractRefusal === null ? turnProposals.resolve(state, proposal) : null,
        };
      });
      const dominanceRefusals = evaluated.flatMap(({ proposal, contractRefusal, resolution }) => {
        if (contractRefusal !== null || resolution === null || !resolution.valid) return [];
        const refusal = dominanceRefusal(capsule, proposal, resolution.option.optionId);
        return refusal === null ? [] : [{
          actor_id: proposal.actorId,
          codes: [refusal.code],
          summary: refusal.summary,
          attempt_rejections: [{
            attempt: resolution.selectedBranch,
            declared_option_id: resolution.option.optionId,
            rejection_reasons: [refusal.summary],
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
        ...evaluated.flatMap(({ proposal, contractRefusal, resolution }) => contractRefusal === null ? [] : [{
          actor_id: proposal.actorId,
          codes: [contractRefusal.code],
          summary: contractRefusal.summary,
          attempt_rejections: [{
            attempt: contractRefusal.attempt,
            declared_option_id: contractRefusal.attempt === 'primary'
              ? proposal.primaryOptionId : proposal.fallbackOptionId,
            rejection_reasons: [contractRefusal.summary],
          }],
        }]),
        ...evaluated.flatMap(({ proposal, contractRefusal, resolution }) => contractRefusal !== null || resolution === null || resolution.valid ? [] : [{
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
        const valid = evaluated.flatMap(({ proposal, contractRefusal, resolution }) => contractRefusal === null && resolution?.valid === true ? [{ proposal, option: resolution.option, primaryOption: resolution.primaryOption, fallbackOption: resolution.fallbackOption, mechanics: resolution.mechanics, selectedBranch: resolution.selectedBranch, resolutionDigest: resolution.resolutionDigest, summary: resolution.summary }] : []);
        const proposalId = `round:${sha256(canonicalJson({ digest: capsule.digest, key, valid, reactionGuidance })).slice(0, 48)}`;
        submitEngineProposal(feed, proposals, { kind: 'round_turn_proposal', proposalId, runId: capsule.runId, branchId: capsule.branchId, requestId: request.requestId, expectedRevision: capsule.revision, stateDigest: capsule.digest, stateHandle: engineStateHandle(capsule), phase: request.phase, idempotencyKey: key, resolutions: valid, rationale: typeof input['rationale'] === 'string' ? input['rationale'] : null, reactionGuidance, submittedArguments: structuredClone(roundSubmission?.submittedArguments ?? suppliedInput), ...(activeIntelMode === 'off' ? {} : { intelCapture: captureDmIntel(state, capsule, queries) }) });
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
        const contractRefusal = proposalContractRefusal(request.phase, proposal);
        const staticRefusal = overBudget
          ? { code: 'ADJUSTMENT_BUDGET_EXCEEDED', summary: `Adjustment contains more than ${String(request.adjustmentBudget)} replacement proposals.`, attempt: 'primary' as const }
          : (counts.get(proposal.actorId) ?? 0) > 1
            ? { code: 'DUPLICATE_ACTOR_UPDATE', summary: 'An adjustment may replace an open actor at most once.', attempt: 'primary' as const }
            : actor?.life === 'dead'
              ? { code: 'ACTOR_DEAD', summary: 'A dead actor cannot receive a plan adjustment.', attempt: 'primary' as const }
              : !request.actors.includes(proposal.actorId)
                ? { code: 'ACTOR_NOT_OPEN', summary: 'Only actors whose turns remain open may receive an adjustment.', attempt: 'primary' as const }
                : contractRefusal;
        if (staticRefusal !== null) return { proposal, resolution: null, staticRefusal };
        const resolution = turnProposals.resolve(state, proposal);
        if (resolution.valid) {
          const refusal = dominanceRefusal(capsule, proposal, resolution.option.optionId);
          if (refusal !== null) return { proposal, resolution: null, staticRefusal: { ...refusal, attempt: 'primary' as const } };
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
            attempt: entry.staticRefusal.attempt,
            declared_option_id: entry.staticRefusal.attempt === 'primary'
              ? entry.proposal.primaryOptionId : entry.proposal.fallbackOptionId,
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
            ...(activeIntelMode === 'off' ? {} : { intelCapture: captureDmIntel(state, capsule, queries) }),
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
          proposals: proposalValues.map(decodeRenderedProposal),
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
      const proposal = decodeRenderedProposal(input['proposal']);
      if (request.actors.length !== 1 || request.actors[0] !== proposal.actorId) return { status: 'rejected', state_ref: externalStateRef(capsule), refusals: [{ code: 'ACTOR_REQUIRES_WHOLE_ROUND', summary: 'This actor belongs to the pending shared-initiative whole-round request.' }], correction_guidance: correctionGuidance(capsule) };
      const contractRefusal = proposalContractRefusal(request.phase, proposal);
      if (contractRefusal !== null) return { status: 'rejected', state_ref: externalStateRef(capsule), refusals: [{ code: contractRefusal.code, summary: contractRefusal.summary }], correction_guidance: correctionGuidance(capsule) };
      const resolution = turnProposals.resolve(state, proposal);
      if (!resolution.valid) return { status: 'rejected', state_ref: externalStateRef(capsule), refusals: resolution.refusals.map((entry) => ({ code: entry.code, summary: entry.summary })), correction_guidance: correctionGuidance(capsule) };
      const dominance = dominanceRefusal(capsule, proposal, resolution.option.optionId);
      if (dominance !== null) return { status: 'rejected', state_ref: externalStateRef(capsule), refusals: [dominance], correction_guidance: correctionGuidance(capsule) };
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
    ? new Set(profileRequest?.phase === 'speculative'
      ? ENGINE_SPECULATIVE_DM_TOOL_NAMES
      : profileRequest?.kind === 'plan_adjustment'
        ? ENGINE_ADJUSTMENT_DM_TOOL_NAMES
        : ENGINE_DM_TOOL_NAMES)
    : null;
  const bindings: readonly McpToolBinding[] = ENGINE_TOOL_SPECS
    .filter((spec) => spec.descriptor.name === 'engine.read_kb_subject'
      ? dependencies.kbReadBudget !== undefined && profileRequest?.phase !== 'speculative'
      : advertisedNames === null || advertisedNames.has(spec.descriptor.name))
    .map((spec) => ({
      descriptor: spec.descriptor,
      validateArguments: (value) => spec.descriptor.name !== 'engine.submit_round_proposals'
        ? schemaViolations(spec.input, value)
        : engineSchemaInternals.minimalSubmitRoundTransportInput.safeParse(value).success ||
          engineSchemaInternals.submitRoundTransportInput.safeParse(value).success
          ? []
          : schemaViolations(spec.input, value),
      validateOutput: (value) => schemaViolations(spec.output, value),
      execute: (value) => execute(spec.descriptor.name, value),
    }));
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
      if (uri === `${base}/schema/turn-proposal-v1`) return content(uri, {
        version: 1,
        minimal_submission: ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA,
        minimal_example: generatedMinimalRoundSubmissionExample(
          capsule.request?.phase === 'correction' ? 'correction' : 'initial',
        ),
        envelope: ENGINE_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA,
        proposal: ENGINE_TURN_PROPOSAL_INPUT_SCHEMA,
        constraints: ['Select only engine-offered option ids from the exact revision.', 'Never send coordinates, cells, destinations, paths, attack modifiers, DCs, dice, damage, or commands.'],
        examples: generatedMinimalRoundSubmissionExample(
          capsule.request?.phase === 'correction' ? 'correction' : 'initial',
        )['proposals'],
      });
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
