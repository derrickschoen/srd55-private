import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, closeSync, fsyncSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { appendFile, copyFile, mkdir, mkdtemp, readdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createInterface, type Interface } from 'node:readline';
import { canonicalJson } from '../src/commands/canonical-json';
import { decisionReasonProblem } from '../src/vtt/decision-reason';
import type { PersistedCoordinatorState } from '../src/combat/coordinator';
import type { EncounterState } from '../src/combat/encounter';
import { mulberry32 } from '../src/combat/random';
import {
  agentSessionId, combatantId, encounterBranchId, encounterSessionId,
  type CombatantId, type EncounterBranchId, type EncounterSessionId,
} from '../src/combat/values';
import { sha256 } from '../src/crypto/sha256';
import {
  agentCallUsage, engineDispatchId, turnInputTotal,
  AGENT_SKILL_NAMES,
  type AgentCallPhase, type AgentCallUsage,
  type AgentAdapterKind, type AgentCliKind, type AgentFailureClassification, type AgentInvocation, type AgentSessionAdapter,
  type AgentInvocationOutput, type AgentSessionBinding, type AgentToolSession, type AgentTurnResult, type AgentUsage,
  type AgentInstructionSource, type AgentSkillName, type ContextRolloverPolicy, type FreshSessionContext,
  type EngineCatalogEvidence,
} from '../src/vtt/agent-session';
import { D569IntegrityStop, type D569DispatchIntegrityArtifact } from '../src/vtt/d569-integrity';
import {
  classifyTurnContextDelivery,
  type HostContextDiagnostic,
  type TurnContextConfiguredCaps,
  type TurnContextDelivery,
  type TurnContextMeasurement,
} from '../src/vtt/turn-context-delivery';
import { AgentSessionLifecycle } from '../src/vtt/agent-session-lifecycle';
import { AGENT_ADAPTER_VERSION, resolveAgentAdapter } from '../src/vtt/agent-adapters';
import {
  LocalOpenAiAgentSessionAdapter,
  type LocalOpenAiConfig,
  type LocalThinkMode,
} from '../src/vtt/agent-adapters/local-openai';
import type {
  PlanAdjustmentProposalEnvelope,
  ProposedTurnResolution,
  RoundTurnProposalEnvelope,
} from '../src/vtt/engine-envelopes';
import {
  engineStateHandle,
  type EnginePlanAdjustmentMetadata,
  type EngineStateCapsule,
} from '../src/vtt/engine-state-capsule';
import {
  EngineRoundSession,
  type EngineBoundaryResolutions,
  type EngineOrdinaryRoundCapsuleRequest,
  type EngineProposalDeviation,
  type EngineRoundSnapshot,
} from '../src/vtt/engine-round-session';
import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';
import {
  availableEngineActorOptions, pureTurnProposalResolver,
  type EngineOfferableOption, type EngineTurnProposal, type ResolvedTurnMechanics,
} from '../src/vtt/intent-resolver';
import {
  enginePlayToken,
  type EngineActivationChoice,
  type EngineActivationChoiceSlot,
  type EnginePlayToken,
} from '../src/vtt/turn-proposal';
import {
  hiddenOptionRecords,
  type HiddenOptionRecord,
} from '../src/vtt/turn-option-registry';
import { projectFutureMonsterTurns } from '../src/vtt/monster-planning-state';
import { SNIPPET_REGISTRY, type PlayName } from '../src/vtt/snippet-registry-runtime';
import {
  buildHostScenarioMenu,
  evaluateHostScenarios,
} from '../src/vtt/speculative-planning';
import type { QueuedSpeculativePlanEnvelope } from '../src/vtt/speculative-plan-types';
import { mcpRequestMeta } from '../src/vtt/mcp/handler';
import {
  createEngineMcpRuntime, engineMcpUiFeedbackSpoolPath, loadArenaFixture,
  type EngineMcpBoardImageBinding,
  type EngineMcpLauncherManifest,
} from '../src/vtt/mcp/entrypoint';
import {
  engineUiFeedbackSchema,
  type EngineUiFeedback,
} from '../src/vtt/mcp/schemas';
import {
  BoardSnapshotService,
  boardStateDigest,
  readValidatedBoardImage,
  type BoardImageArtifact,
  type BoardImageSource,
  type BoardSnapshotCapture,
} from './ai-dm-board-snapshot';
import type {
  IntelMode,
  OverridePolicy,
  TurnContextDeltaBase,
  TurnContextSizeOmission,
} from '../src/vtt/mcp/engine-server';
import {
  DEFAULT_OVERRIDE_POLICY,
  OVERRIDE_POLICIES,
  renderBlindEnginePrompt,
  renderEnginePrompt,
  SEMANTIC_BOARD_MAX_BYTES,
  TURN_CONTEXT_MAX_BYTES,
} from '../src/vtt/mcp/engine-server';
import {
  applyRevisionDelta,
  type RevisionDeltaOperation,
} from '../src/vtt/dm-bridge/projection-transport';
import {
  EncounterSessionJournal, importSavedSession, MemoryBrowserSessionStore,
  MemoryMirrorSink, type BrowserSessionStore,
} from '../src/vtt/session-persistence';
import {
  TurnExhaustionCoordinator, type DeterministicProposalResolution,
  type InitialProposalAttempt, type TurnExhaustionHost,
} from '../src/vtt/turn-exhaustion-coordinator';
import type { UnattendedReactionAskDefault } from '../src/vtt/reaction-offer-host-policy';
import { captureDmIntel, type DmIntelCapture } from '../src/vtt/dm-tactical-intel';
import {
  actorOpportunityReport,
  submissionDominance,
  DOMINANCE_CORRECTION_POLICY,
  MATERIALITY_CONTEXT_POLICY,
  OPPORTUNITY_COST_POLICY,
} from '../src/vtt/intel/opportunity-cost';
import {
  bindDecision,
  createDecisionCatalog,
  finalIndicesDecisionSchema,
  minimalRoundSubmission,
  normalizeIndexDecision,
  renderDecisionCatalog,
  type DecisionCatalog,
  type DecisionPhase,
  type DecisionNormalizationRejectionCode,
  type DecisionTransport,
  type BoundRoundDecision,
  type StructuredFinalDecisionReasonGate,
} from '../src/vtt/agent-round-decision';
import { MOVEMENT_OPTIONS_INTEL_POLICY } from '../src/vtt/intel/movement-options';
import { TEAM_SCORER_POLICY } from '../src/vtt/intel/team-scorer';
import { ACTOR_KNOWLEDGE_POLICY } from '../src/vtt/intel/actor-knowledge';
import { LEGENDARY_WINDOWS_POLICY } from '../src/vtt/intel/legendary-windows';
import { REACTION_SPEND_HOLD_POLICY } from '../src/vtt/intel/reaction-spend-hold';
import { RECOVERY_CAPABILITY_POLICY } from '../src/vtt/intel/recovery-capability';
import {
  type ReactionGuidanceDeclaration,
} from '../src/vtt/reaction-guidance';
import {
  createScriptedPartyPlan,
  DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
  materializeScriptedPartyTurn,
  type ScriptedPartyAdherence,
  type ScriptedPartyAdherenceReasonCode,
  type ScriptedPartyDefaultTurn,
  type ScriptedPartyDecisionPolicy,
  type ScriptedPartyPlan,
} from '../src/vtt/scripted-party-round';
import {
  applyRoomInitiativeProfile,
  ROOM_INITIATIVE_PROFILES,
  type RoomInitiativeProfile,
} from '../src/vtt/room-generator';
import {
  evaluatePlanMateriality,
  PLAN_MATERIALITY_POLICY_HASH,
  type PlanMaterialityReasonCode,
} from '../src/vtt/plan-materiality';
import {
  AdjustmentExhaustionCoordinator,
  type AdjustmentExhaustionTransition,
} from '../src/vtt/adjustment-exhaustion-coordinator';
import { buildArenaSessionInstructions } from './rl/arena-session-instructions';
import { readRepoCommit } from './rl/repo-commit';
import {
  DEFAULT_RENDERER_PROFILE,
  RENDERER_POLICY_VERSION,
  extractCircumstanceFeatures,
  rendererProfileSchema,
  type CircumstanceFeatureVector,
  type RendererProfile,
  type RendererRemovalCounts,
} from '../src/vtt/renderer-profile';
import type { SemanticBoardTruncationClass } from '../src/vtt/semantic-board-payload';
import {
  DEFAULT_AI_DM_KB_ROOT,
  D569_AI_DM_KB_ROOT,
  loadAiDmKnowledgeBase,
  type LoadedAiDmKnowledgeBase,
} from '../src/vtt/knowledge-base-contract';
import {
  decodeKbReadRecords,
  kbSubjectSources,
  KbReadBudget,
  type KbReadCallPhase,
  type KbReadRecord,
  type KbSubjectSources,
} from '../src/vtt/mcp/knowledge-base';
import {
  BLIND_INTENT_VERSION,
  BLIND_MAX_ATTEMPTS_DEFAULT,
  BLIND_REPAIR_ARMS,
  blindMaxAttemptsSchema,
  blindRoundIntentEnvelopeSchema,
  type BlindIntent,
  type BlindIntentRejectionCode,
  type BlindMaxAttempts,
  type BlindRepairArm,
  type DmMode,
} from '../src/vtt/blind-dm-contract';
import {
  BLIND_SEMANTIC_BOARD_MAX_BYTES,
  BLIND_TURN_CONTEXT_MAX_BYTES,
  type BlindTurnContextBudgetEvidence,
  type BlindVisualDescriptor,
} from '../src/vtt/blind-turn-context';
import {
  BlindModelIngressRecorder,
  auditBlindIngress,
  type BlindIngressAudit,
  type BlindIngressRecord,
} from '../src/vtt/blind-model-ingress';
import type { BlindIntentSubmissionRecord } from '../src/vtt/mcp/engine-server';
import {
  BLIND_STATE_PRIMER_VERSION,
} from './ai-dm-board-snapshot';
import {
  BOARD_GLYPH_PRIMER,
  GENERAL_PRIMER,
} from './ai-dm-screenshot-probe';

export const CONVERSATION_CLIS = ['codex', 'claude-code', 'local-openai'] as const;
export type ConversationCli = (typeof CONVERSATION_CLIS)[number];
export const CONVERSATION_TRANSPORTS = ['mcp_minimal', 'final_indices'] as const;
export type ConversationTransport = (typeof CONVERSATION_TRANSPORTS)[number];
export const CONVERSATION_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;
export type ConversationEffort = (typeof CONVERSATION_EFFORTS)[number];
export const COMBAT_MODELS = ['monster_block_v1', 'initiative_segments_v1'] as const;
export type CombatModel = (typeof COMBAT_MODELS)[number];
export const ROUND_PROTOCOL_VERSION = 3 as const;
export const SPECULATION_MS_PER_PLAYER_TURN = 60_000 as const;
export const SPECULATION_MAX_BUDGET_MS = 300_000 as const;

const INITIAL_COORDINATOR_STATE: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};
const RULES_SOURCE = { get: () => null } as const;

export const BOARD_IMAGE_MODES = ['off', 'png', 'capture_only'] as const;
export type BoardImageMode = (typeof BOARD_IMAGE_MODES)[number];

export interface ConversationBoardSnapshotService {
  readonly outputDirectory: string;
  capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact>;
  close(): Promise<void>;
}

interface ConversationConfigBase {
  readonly dmMode: DmMode;
  readonly dmModeExplicit: boolean;
  readonly blindRepairArm: BlindRepairArm;
  readonly blindMaxAttempts: BlindMaxAttempts;
  readonly blindFacts: boolean;
  readonly midRoundAdjustmentsEnabled: boolean;
  readonly intelMode: IntelMode;
  readonly overridePolicy: OverridePolicy;
  readonly rendererProfile: RendererProfile;
  readonly turnContextMaximumBytes: number;
  readonly combatModel: CombatModel;
  readonly initiativeProfile: RoomInitiativeProfile;
  readonly partyPolicy: ScriptedPartyDecisionPolicy;
  readonly fixturesPath: string;
  readonly rooms: number;
  readonly rounds: number;
  readonly cli: ConversationCli;
  readonly decisionTransport: ConversationTransport;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly escalationModel: string | null;
  readonly escalationEffort: ConversationEffort | null;
  readonly outPath: string;
  readonly dryRun: boolean;
  readonly cwd: string;
  readonly cliBin: string;
  readonly timeoutMs: number;
  readonly reactionAskDefault: UnattendedReactionAskDefault;
  readonly captureRlData: boolean;
  readonly localOpenAi: LocalOpenAiConfig | null;
  readonly boardImageMode: BoardImageMode;
  readonly scheduledCellKey?: string;
}

export type ConversationConfig = ConversationConfigBase & AgentInstructionSource;

export type ConversationRlTask = 'round_plan' | 'plan_adjustment';
export type ConversationRlSubmissionTool =
  | 'engine.submit_round_proposals'
  | 'engine.submit_plan_adjustment';

export interface ConversationRlDataV2 {
  readonly format: 'arena-rl-capture-v2';
  readonly task: ConversationRlTask;
  readonly submissionTool: ConversationRlSubmissionTool;
  readonly sourceLicense: 'project-generated';
  readonly sessionInstructions: string;
  readonly rawTurnContext: string;
  readonly turnContext: Readonly<Record<string, unknown>>;
  readonly submittedArguments: Readonly<Record<string, unknown>>;
  readonly stateDigest: string;
  readonly requestId: string;
  readonly proposalId: string;
  readonly parentPlanId: string | null;
  readonly repoCommit: string;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly sessionId: string | null;
  readonly roundProtocolVersion: typeof ROUND_PROTOCOL_VERSION;
  readonly partyPolicyHash: string | null;
  readonly materialityPolicyHash: string | null;
  readonly plannerLabel: 'model' | ExhaustionPlannerLabel;
  readonly autoSubmitBlocks: readonly ConversationAutoSubmitBlock[];
  readonly intelPolicyVersions: {
    readonly intel_mode: 'off';
  } | {
    readonly movement: typeof MOVEMENT_OPTIONS_INTEL_POLICY;
    readonly opportunityCost: typeof OPPORTUNITY_COST_POLICY;
    readonly teamScorer: typeof TEAM_SCORER_POLICY;
    readonly correction: typeof DOMINANCE_CORRECTION_POLICY;
    readonly materialityContext: typeof MATERIALITY_CONTEXT_POLICY;
    readonly actorKnowledge: typeof ACTOR_KNOWLEDGE_POLICY;
    readonly reactionSpendHold: typeof REACTION_SPEND_HOLD_POLICY;
    readonly legendaryWindows: typeof LEGENDARY_WINDOWS_POLICY;
    readonly recoveryCapability: typeof RECOVERY_CAPABILITY_POLICY;
  };
  readonly engineIntel: DmIntelCapture | null;
}

export type ConversationRlData = ConversationRlDataV2;

export interface ConversationTokenCounts {
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
  readonly reasoning: number;
}

export interface ConversationChainAttemptEvidence {
  readonly attempt: 'primary' | 'fallback' | 'correction';
  readonly actorId: CombatantId | null;
  readonly declaredProposal: Readonly<Record<string, unknown>> | null;
  readonly rejectionReasons: readonly string[];
  readonly rejectionCodes?: readonly string[];
}

export interface ConversationChainEvidence {
  readonly failedAttempts: readonly ConversationChainAttemptEvidence[];
  readonly autoResolvedTrigger: string | null;
  readonly correctionFinalText: string | null;
}

export interface ConversationAuthorizedActorPlan {
  readonly actorId: CombatantId;
  readonly reason: string;
  readonly acceptedProposal: Readonly<Record<string, unknown>>;
  readonly selectedBranch: 'primary' | 'fallback';
  readonly resolutionSummary: {
    readonly optionId: string;
    readonly movementFeet: number;
    readonly actionSlots: ResolvedTurnMechanics['actionSlots'];
  };
}

export interface ConversationPcTurn {
  readonly actor: CombatantId;
  readonly partyDefaultTurn: ScriptedPartyDefaultTurn | null;
  readonly initiativeIndex: number;
  readonly beforeRevision: number;
  readonly afterRevision: number;
  readonly plannedProgramHash: string;
  readonly executedProgramHash: string;
  readonly commandSequence: readonly import('../src/combat/events').EncounterCommand[];
  readonly adherence: ScriptedPartyAdherence;
  readonly adherenceReasons: readonly ScriptedPartyAdherenceReasonCode[];
  readonly beforeDigest: string;
  readonly afterDigest: string;
  readonly material: boolean;
  readonly materialityReasons: readonly PlanMaterialityReasonCode[];
}

interface ConversationAdjustmentTrigger {
  readonly trigger: CombatantId;
  readonly triggerPcTurnOrdinal: number;
  readonly triggerInitiativeIndex: number;
  readonly reasons: readonly PlanMaterialityReasonCode[];
  readonly openActors: readonly CombatantId[];
}

export type ConversationAdjustment = ConversationAdjustmentTrigger & (
  | { readonly skipped: 'no_material_change' }
  | {
  readonly skipped: null;
  readonly preflight: 'retained_plan_illegal' | 'superior_option_appeared';
  readonly requestId: string;
  readonly proposalId: string | null;
  readonly baselinePlanHash: string;
  readonly resultPlanHash: string;
  readonly changedActors: readonly CombatantId[];
  readonly outcome: 'adjusted' | 'baseline_kept' | 'service_null';
  readonly sessionId: string | null;
  readonly correctionSessionId: string | null;
  readonly rawContext: string;
  readonly granularity: 'full' | 'turn_delta';
  readonly stateBinding: {
    readonly request: { readonly revision: number; readonly digest: string };
    readonly result: { readonly revision: number; readonly digest: string };
  };
  readonly usage: ConversationTokenCounts;
  readonly toolCalls: number;
  readonly modelCalls: number;
  readonly flapRetries: 0 | 1 | 2;
  readonly refusals: readonly ConversationChainAttemptEvidence[];
  readonly correctionChain: {
    readonly refusedActorIds: readonly CombatantId[];
    readonly result: import('../src/vtt/adjustment-exhaustion-coordinator').AdjustmentCorrectionResult;
    readonly proposalId: string | null;
    readonly rawContext: string;
    readonly granularity: 'full' | 'turn_delta';
  } | null;
  readonly rlData: readonly ConversationRlDataV2[];
});

export interface ConversationMonsterSegment {
  readonly actors: readonly CombatantId[];
  readonly initiativeIndexes: readonly number[];
  readonly beforeRevision: number;
  readonly afterRevision: number;
  readonly appliedPlanHash: string;
  readonly deviationResolutions: readonly EngineProposalDeviation[];
}

export type ConversationSpeculationDiscardReason =
  | 'empty_scenario_menu'
  | 'budget_expired'
  | 'dispatch_failed'
  | 'target_disappeared'
  | 'actor_set_changed'
  | 'newer_adjustment_present'
  | 'no_scenario_match'
  | 'ambiguous_scenario_match'
  | 'option_mapping_failed'
  | 'proposal_validation_failed'
  | 'context_actor_set_mismatch';

export type ConversationSpeculation =
  | {
      readonly status: 'not_proposed';
      readonly reason: 'no_eligible_player_window' | 'empty_scenario_menu';
      readonly budgetMs: number;
    }
  | {
      readonly status: 'proposed' | 'adopted' | 'discarded';
      readonly proposed: true;
      readonly adopted: boolean;
      readonly discarded: boolean;
      readonly discardReason: ConversationSpeculationDiscardReason | null;
      readonly targetMonsterRound: number;
      readonly targetActorIds: readonly CombatantId[];
      readonly branchCount: number;
      readonly budgetMs: number;
      readonly planningWallMs: number;
      readonly boundaryWaitMs: number;
      readonly plannedBy: ConversationPlannerAttribution;
      readonly source: { readonly revision: number; readonly digest: string };
      readonly decision: { readonly revision: number; readonly digest: string } | null;
    };

interface SpeculativeDispatchCompletion {
  readonly plan: QueuedSpeculativePlanEnvelope | null;
  readonly turn: AgentTurnResult | null;
  readonly planningWallMs: number;
  readonly timedOut: boolean;
  readonly error: string | null;
  readonly failingDispatch: NonNullable<ConversationRowBase['failingDispatch']> | null;
}

interface InFlightSpeculation {
  readonly dispatchId: import('../src/vtt/agent-session').EngineDispatchId;
  readonly sourceSnapshot: EngineRoundSnapshot;
  readonly sourceTurnContext: TurnContextDeltaBase;
  readonly targetActorIds: readonly CombatantId[];
  readonly targetMonsterRound: number;
  readonly branchCount: number;
  readonly budgetMs: number;
  readonly planner: ConversationPlannerAttribution;
  readonly baselinePlanHash: string;
  readonly controller: AbortController;
  readonly completion: Promise<SpeculativeDispatchCompletion>;
}

export interface ConversationTeamPlans {
  readonly party: null | {
    readonly planId: string;
    readonly planHash: string;
    readonly sharedObjective: string;
    readonly programs: ScriptedPartyPlan['programs'];
  };
  readonly monsters: null | {
    readonly initialProposalId: string;
    readonly initialProposalHash: string;
    readonly authorizedProposals: readonly EngineTurnProposal[];
  };
}

export interface ConversationSuggestedPlay {
  readonly name: PlayName;
  readonly hash: string;
}

export type ConversationSuggestionAdoption = 'as_is' | 'edited' | 'ignored';
type SimulatedSuggestionResponse = ConversationSuggestionAdoption | 'legacy';

export type ConversationFallbackReason =
  | 'no_proposal'
  | 'validation_exhausted'
  | 'auto_submit_blocked'
  | 'timeout'
  | 'host_authorization_failed'
  | 'resolver_rejected'
  | 'correction_cancelled'
  | 'correction_timeout'
  | 'dispatch_cancelled';

export type ConversationTerminalOutcome = {
  readonly kind: 'encounter_over';
  readonly result: 'party_defeated';
};

export type ConversationBoardImage =
  | { readonly mode: 'off' }
  | {
      readonly mode: 'png';
      readonly sha256: string;
      readonly bytes: number;
      readonly width: number;
      readonly height: number;
      readonly captureMs: number;
      readonly relativePath: `board-images/${string}.png`;
    }
  | {
      readonly mode: 'capture_only';
      readonly sha256: string;
      readonly bytes: number;
      readonly width: number;
      readonly height: number;
      readonly captureMs: number;
      readonly relativePath: `board-images/${string}.png`;
    };

export const BOARD_IMAGE_SCALE_STARTUP_INSTRUCTION = 'Each grid square on the board image is 5 feet; distances in the text are in feet.';
export const UI_FEEDBACK_STARTUP_INSTRUCTION = 'After an accepted round decision, you may call engine.submit_ui_feedback once to report how useful the board picture was. This optional feedback is never scored and never affects the encounter.';

export interface ConversationBoardImageEvidence {
  readonly capturedAtUnixMs: number;
  readonly primaryDispatchStartedAtUnixMs: number;
  readonly source: BoardImageSource;
  readonly chromiumVersion: string;
}

export interface ConversationBlindAttempt {
  readonly number: number;
  readonly intentText: string;
  readonly parsedIntents: readonly BlindIntent[] | null;
  readonly startedAtOffsetMs: number;
  readonly endedAtOffsetMs: number;
  readonly modelWallMs: number;
  readonly modelFirstTokenMs: number | null;
  readonly resolverLatencyMs: number;
  readonly resolverOutcome: 'accepted' | 'rejected';
  readonly codes: readonly BlindIntentRejectionCode[];
  readonly hintExposed: boolean;
}

export interface ConversationVisualProfile {
  readonly primerVersion: string;
  readonly images: readonly {
    readonly role: 'dm_board' | 'accessible_board_raster' | 'player_board';
    readonly sha256: string;
    readonly ordinal: number;
  }[];
  readonly glyphMode: string;
  readonly captureTilePx: number;
  readonly perImageCaptureLatencyMs: readonly number[];
  readonly totalImageCaptureLatencyMs: number;
}

export interface ConversationProjectionEvidence {
  readonly projectionVersion: string;
  readonly sha256: string;
  readonly utf8Bytes: number;
}

export interface ConversationBlindRowEvidence {
  readonly dmMode: DmMode;
  readonly blindFacts: boolean;
  readonly midRoundAdjustmentsEnabled: false;
  readonly blindContextVersion: 'blind-turn-context-v1';
  readonly blindIntentVersion: typeof BLIND_INTENT_VERSION;
  readonly blindRepairArm: BlindRepairArm;
  readonly blindMaxAttempts: BlindMaxAttempts;
  readonly blindIntentText: string | null;
  readonly blindIntents: readonly BlindIntent[] | null;
  readonly blindResolverOutcome: readonly {
    readonly actor: { readonly name: string; readonly badge: number };
    readonly status: 'accepted' | 'rejected';
    readonly semanticDigest: string | null;
  }[];
  readonly blindRejectionCodes: readonly BlindIntentRejectionCode[];
  readonly blindAttempts: readonly ConversationBlindAttempt[];
  readonly blindResolverLatencyMs: number;
  readonly blindIngressAudit: BlindIngressAudit;
  readonly visualProfile: ConversationVisualProfile;
  readonly sharedKbComponentHashes: Readonly<Record<string, string>>;
  readonly semanticBoardEvidence: null | {
    readonly format: string;
    readonly sha256: string;
    readonly utf8Bytes: number;
    readonly omittedBlocks: readonly ['reach_range_summaries'];
  };
  readonly creatureFactsEvidence: ConversationProjectionEvidence & {
    readonly sourceIds: readonly string[];
  };
  readonly legalMovementEvidence: ConversationProjectionEvidence & {
    readonly stateDigest: string;
    readonly actorCellCounts: readonly { readonly name: string; readonly badge: number; readonly cells: number }[];
  };
  readonly turnContextBudget: BlindTurnContextBudgetEvidence;
  readonly blindPrivateAnswerKey: {
    readonly selectedOfferedIds: readonly string[];
    readonly semanticDigests: readonly string[];
    readonly catalogDigest: string;
    readonly engineTopRecommendationIds: readonly string[];
    readonly engineTopPolicyVersion: string;
    readonly blindDiffersFromEngineTop: boolean | null;
  };
}

interface ConversationRowBase {
  readonly rowContractVersion?: 'arena-row-v3';
  readonly scheduledCellKey?: string;
  readonly dispatchId?: string;
  readonly engineCatalogEvidence?: EngineCatalogEvidence;
  readonly turnContextDelivery?: TurnContextDelivery;
  readonly turnContextConfiguredCaps?: TurnContextConfiguredCaps;
  readonly hostContextDiagnostic?: HostContextDiagnostic;
  readonly failingDispatch?: {
    readonly phase: 'primary' | 'correction' | 'adjustment' | 'speculative' | 'speculation_recalculation';
    readonly exit: 'cancelled' | 'infrastructure_failed';
    readonly dispatchId: string;
    readonly engineCatalogEvidence: EngineCatalogEvidence;
    readonly turnContextDelivery: TurnContextDelivery;
    readonly failureReason: string;
  };
  readonly knowledgeModel: 'engine_state';
  readonly hiddenOptions: readonly HiddenOptionRecord[];
  readonly intelMode: IntelMode;
  /** Experimental policy attribution belongs to the answer key, never a blinded packet. */
  readonly overridePolicy: OverridePolicy;
  readonly rendererAttribution: {
    readonly policyVersion: typeof RENDERER_POLICY_VERSION;
    readonly profile: RendererProfile;
  };
  readonly baseContextBytes: number | null;
  readonly semanticBoardBytes: number | null;
  readonly semanticBoardTruncated: readonly SemanticBoardTruncationClass[];
  readonly circumstanceFeatures: CircumstanceFeatureVector;
  readonly combatModel: CombatModel;
  readonly roundProtocolVersion: typeof ROUND_PROTOCOL_VERSION;
  readonly startingRoomDigest: string;
  readonly room: number;
  readonly round: number;
  readonly cli: ConversationCli;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly escalationEffort: ConversationEffort | null;
  readonly uiFeedback: EngineUiFeedback | null;
  readonly thinkMode: LocalThinkMode | null;
  readonly contextRevision: number;
  readonly projectionRevision: number;
  /** Codex rollout ID; locate its full log with a rollout-*-<id>.jsonl glob. */
  readonly sessionId: string | null;
  readonly escalationSessionId: string | null;
  readonly sessionIdHash: string | null;
  readonly kbHash: string | null;
  readonly instructionSource: AgentInstructionSource['instructionSource'];
  readonly skillName: AgentSkillName | null;
  readonly skillHash: string | null;
  readonly kbReads: readonly KbReadRecord[];
  readonly repoCommit: string;
  readonly rawTurnContext: string | null;
  readonly turnContextMaximumBytes: number;
  readonly preTrimBytes: number | null;
  readonly postTrimBytes: number | null;
  readonly optionsOmittedForSize: number;
  readonly optionsOmittedForSizeByActor: readonly TurnContextSizeOmission[];
  readonly turnContextGranularity: 'full' | 'turn_delta' | null;
  readonly snippetHash: string;
  readonly snippetSetHash: string;
  readonly suggestedPlay: ConversationSuggestedPlay | null;
  readonly suggestionAdopted: ConversationSuggestionAdoption | null;
  readonly outcome: 'authorized' | 'auto_resolved' | 'awaiting_dm_adjudication' | 'refused' | 'service_null' | 'local_error' | 'execution_failed' | 'partial_execution' | 'infrastructure_failed' | 'integrity_indeterminate';
  readonly executionErrorClass: ConversationExecutionErrorClass | null;
  readonly proposalId: string | null;
  readonly timeToFirstAction: number;
  readonly endToEndWall: number;
  readonly wallPerCreature: number;
  readonly tokens: ConversationTokenCounts;
  readonly callUsage: readonly AgentCallUsage[];
  readonly agentSessionGeneration: number;
  readonly contextRolloverTriggerCount: number;
  readonly contextRolloverThreshold: number | null;
  readonly contextRolloverOccurred: boolean;
  readonly agentSessionDigestHash: string | null;
  readonly refusals: readonly string[];
  readonly toolCalls: number;
  readonly callsPerRound: number;
  readonly agentDispatched: boolean;
  readonly flapRetries: 0 | 1 | 2;
  readonly serviceNull: boolean;
  /** Transport and validation facts belong to the answer key, never a blinded packet. */
  readonly decisionTransport: ConversationTransport;
  readonly firstDecisionAccepted: boolean;
  readonly decisionAttempts: number;
  readonly decisionRejectionCodes: readonly StructuredFinalRejectionCode[];
  readonly normalizationCodes: readonly DecisionNormalizationRejectionCode[];
  /** Answer-key metric input for engine-recommendation anchoring. */
  readonly chosenOptionIndices?: readonly {
    readonly actorId: CombatantId;
    readonly primaryOptionIndex: number;
    readonly fallbackOptionIndex: number | null;
  }[];
  readonly contextTruncated: boolean;
  readonly plannedBy: ConversationPlannerAttribution | null;
  readonly planner: ConversationPlanner;
  readonly overrideKinds: readonly ConversationOverrideKind[];
  readonly overrideRejections: readonly ConversationOverrideRejection[];
  readonly fallbackReason: ConversationFallbackReason | null;
  readonly autoSubmitBlocks: readonly ConversationAutoSubmitBlock[];
  readonly partyDefaultTurn: boolean;
  readonly terminalOutcome: ConversationTerminalOutcome | null;
  readonly escalated: boolean;
  readonly escalationModel: string | null;
  readonly stateBinding: {
    readonly capsule: { readonly revision: number; readonly digest: string };
    readonly authorization: { readonly revision: number; readonly digest: string } | null;
  };
  readonly authorizedPlan: readonly ConversationAuthorizedActorPlan[] | null;
  readonly rationale: string | null;
  readonly roundNarrative: string | null;
  readonly chainEvidence: ConversationChainEvidence;
  readonly initiativeOrder: readonly CombatantId[];
  readonly partyPolicyHash: string | null;
  readonly materialityPolicyHash: string | null;
  readonly engineIntel: DmIntelCapture | null;
  readonly adjustmentBudget: number;
  readonly teamPlans: ConversationTeamPlans;
  readonly pcTurns: readonly ConversationPcTurn[];
  readonly adjustments: readonly ConversationAdjustment[];
  readonly monsterSegments: readonly ConversationMonsterSegment[];
  readonly speculation: ConversationSpeculation;
  readonly speculations: readonly ConversationSpeculation[];
  readonly roundTotals: {
    readonly initialCalls: number;
    readonly adjustmentCalls: number;
    readonly correctionCalls: number;
    readonly serviceNullAdjustments: number;
    readonly contextBytes: number;
    readonly tokens: ConversationTokenCounts;
  };
  readonly rlData?: ConversationRlData;
}

export type ConversationBoardImageFields =
  | {
      readonly boardImage: { readonly mode: 'off' };
      readonly boardImageEvidence: null;
    }
  | {
      readonly boardImage: Exclude<ConversationBoardImage, { readonly mode: 'off' }>;
      readonly boardImageEvidence: ConversationBoardImageEvidence;
    };

export type ConversationRow = ConversationRowBase & ConversationBoardImageFields &
  Partial<ConversationBlindRowEvidence>;

/** The complete row shape written by the conversation runner. */
export type ConversationRowPersisted = ConversationRow;

/** Exact JSONL payload for one persisted conversation row. */
export function serializeConversationRow(row: ConversationRowPersisted): string {
  return JSON.stringify(row);
}

export interface ConversationPlannerAttribution {
  readonly model: string;
  readonly effort: ConversationEffort;
}

export type ConversationPlanner = 'model' | 'engine_default' | 'sim_controller';
export type ConversationExecutionErrorClass =
  | 'missing_pc_program'
  | 'invalid_self_target'
  | 'unresolved_boundary_decision'
  | 'cli_timeout'
  | 'other';
export type ConversationOverrideKind = NonNullable<EngineTurnProposal['overrideJustification']>['kind'];
export interface ConversationOverrideRejection {
  readonly actorId: CombatantId | null;
  readonly code: 'OVERRIDE_UNJUSTIFIED';
}

export interface ConversationRunResult {
  readonly rows: readonly ConversationRow[];
  readonly binding: AgentSessionBinding | null;
  readonly journalExport: string;
  readonly restoredMidRun: boolean;
}

export interface TurnContextRenderEvidence {
  readonly preTrimBytes: number;
  readonly postTrimBytes: number;
  readonly baseContextBytes: number;
  readonly features: CircumstanceFeatureVector;
  readonly removals: RendererRemovalCounts;
  readonly optionsOmittedForSizeByActor: readonly TurnContextSizeOmission[];
  readonly semanticBoardBytes: number;
  readonly semanticBoardTruncated: readonly SemanticBoardTruncationClass[];
}

export interface ConversationRunOptions {
  readonly repoCommit?: string;
  readonly clock?: () => number;
  readonly roomStates?: readonly EncounterState[];
  readonly store?: BrowserSessionStore;
  readonly adapter?: AgentSessionAdapter;
  readonly boardSnapshotService?: ConversationBoardSnapshotService;
  readonly boardSnapshotServiceFactory?: (
    outputDirectory: string,
  ) => Promise<ConversationBoardSnapshotService>;
  readonly onPrimaryDispatchStart?: () => void;
  /** Test evidence seam for exact model-facing primary invocation bytes. */
  readonly onPrimaryInvocation?: (invocation: AgentInvocation) => void;
  /** Test evidence seam for the immutable invocation emitted at every runner phase. */
  readonly onAgentInvocation?: (invocation: AgentInvocation) => void;
  readonly onSpeculationDispatchStart?: () => void;
  /** Test-only lower pacing cap; production derives 60 seconds per eligible PC, capped at five minutes. */
  readonly speculationBudgetMs?: number;
  /** SIMULATED-only delay injected before speculative dispatch. */
  readonly speculationDispatchDelayMs?: number;
  /** Test-only delay for deterministic in-process SIMULATED dispatches; omitted keeps real MCP children. */
  readonly simulatedInProcessDispatchDelayMs?: number;
  /** Test-only seam that deterministically exercises the post-speculation recalculation transition. */
  readonly forceSpeculationRecalculationForTest?: boolean;
  /** SIMULATED-only immutable state replacement immediately before speculative boundary validation. */
  readonly mutateBeforeSpeculationBoundary?: (state: EncounterState) => EncounterState;
  /** Test-only immutable state replacement immediately before adjustment legality preflight. */
  readonly mutateBeforeAdjustmentPreflight?: (state: EncounterState) => EncounterState;
  /** Test-only context mutation proving speculative actor binding is checked before dispatch. */
  readonly mutateSpeculativeContext?: (
    context: Readonly<Record<string, unknown>>,
  ) => Readonly<Record<string, unknown>>;
  /** Test-only explicit override; takes precedence over the configured arena policy. */
  readonly partyPolicyOverride?: ScriptedPartyDecisionPolicy;
  /** Test-only browser-reload proof point; one-based completed round count. */
  readonly restoreAfterRound?: number;
  /** Arena-scoped memo for identical no-tool renders; actual tool evidence always wins. */
  readonly rendererEvidenceCache?: Map<string, TurnContextRenderEvidence>;
  /** SIMULATED-only exhaustion cases, encoded as `room-N-round-N`. */
  readonly exhaustInitial?: readonly string[];
  readonly invalidInitial?: readonly string[];
  /** SIMULATED-only cancelled initial dispatches, encoded as `room-N-round-N`. */
  readonly timeoutInitial?: readonly string[];
  /** SIMULATED-only adjustment dispatch that stages evidence before timing out. */
  readonly stagedAdjustmentTimeout?: readonly string[];
  /** SIMULATED-only adjustment correction that stages evidence before timing out. */
  readonly stagedAdjustmentCorrectionTimeout?: readonly string[];
  /** SIMULATED-only speculative dispatch that stages evidence before timing out. */
  readonly stagedSpeculationTimeout?: boolean;
  /** SIMULATED-only recalculation dispatch that stages evidence before engine startup failure. */
  readonly failSpeculationRecalculation?: boolean;
  /** SIMULATED-adapter injection of a returned required-engine infrastructure failure. */
  readonly failSpeculationInfrastructure?: boolean;
  /** Test-only join controls for end-of-round and exception-cleanup transition coverage. */
  readonly endRoundAfterSpeculationStartForTest?: boolean;
  readonly failAfterSpeculationStartForTest?: boolean;
  readonly onInitiativeIterationForTest?: () => void;
  /** Test-only forensic ingress appended immediately before the final blind audit. */
  readonly blindIngressAuditProbeText?: string;
  readonly failCorrection?: readonly string[];
  /** SIMULATED-only count of consecutive service-null primary turns by request key. */
  readonly flapPrimaryByRequest?: Readonly<Record<string, number>>;
  /** SIMULATED-only host failures before the round reaches the agent lifecycle. */
  readonly failBeforeDispatch?: readonly string[];
  /** SIMULATED-only sticky declarations keyed by `room-N-round-N`. */
  readonly reactionGuidanceByRequest?: Readonly<Record<string, ReactionGuidanceDeclaration>>;
  /** SIMULATED-only response to the inline suggestion, keyed by `room-N-round-N`. */
  readonly suggestionResponseByRequest?: Readonly<Record<string, ConversationSuggestionAdoption>>;
  /** SIMULATED-only adjustment response keyed by `room-N-round-N-pc-turn-N`. */
  readonly adjustmentResponseByRequest?: Readonly<Record<string, 'keep' | 'change' | 'invalid'>>;
  /** Test-only policy seam used to force or disable deterministic rollover. */
  readonly contextRolloverPolicy?: ContextRolloverPolicy;
  /** Test-only replacement for reproducing stale or incomplete scripted plans. */
  readonly mutateScriptedPartyPlan?: (
    plan: ScriptedPartyPlan,
    context: { readonly room: number; readonly round: number },
  ) => ScriptedPartyPlan;
  /** Explicit sitting boundary; omitted means the sitting remains resumable. */
  readonly endSession?: boolean;
}

export function boardImageOutputDirectory(
  config: Pick<ConversationConfig, 'cwd' | 'outPath'>,
): string {
  const identity = sha256(resolve(config.outPath)).slice(0, 20);
  return resolve(config.cwd, 'dnd-slim-runs', `board-capture-${identity}-images`);
}

function blindVisualDescriptors(artifact: BoardImageArtifact | null): readonly BlindVisualDescriptor[] {
  const blind = artifact?.blindState;
  return blind === undefined ? [] : [{
    kind: blind.role,
    ordinal: blind.ordinal,
    primer_version: blind.primerVersion,
    glyph_mode: blind.glyphMode,
    capture_tile_px: blind.captureTilePx,
  }];
}

function requiredValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
  return value;
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new TypeError(`${option} must be a positive integer.`);
  return parsed;
}

function pathIsInside(parent: string, candidate: string): boolean {
  const path = relative(resolve(parent), resolve(candidate));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

function validateKbPath(cwd: string, candidate: string): void {
  if (pathIsInside(resolve(cwd, 'content/cc-by-sa'), candidate)) {
    throw new TypeError('--kb cannot use content/cc-by-sa as a knowledge-base source.');
  }
  if (!pathIsInside(resolve(cwd, 'tests/fixtures/ai-dm-kb'), candidate)) {
    throw new TypeError('--kb must name a root under tests/fixtures/ai-dm-kb.');
  }
}

function parsedInstructionSource(
  values: ReadonlyMap<string, string>,
  cwd: string,
  cli: ConversationCli,
): AgentInstructionSource {
  const source = values.get('--instruction-source') ?? (values.has('--kb') ? 'kb' : 'none');
  const skill = values.get('--skill');
  if (source !== 'none' && source !== 'kb' && source !== 'skill') {
    throw new TypeError('--instruction-source must be none, kb, or skill.');
  }
  if (source !== 'skill' && skill !== undefined) {
    throw new TypeError('--skill requires --instruction-source skill.');
  }
  if (source === 'skill') {
    if (cli !== 'codex') throw new TypeError('--instruction-source skill requires --cli codex.');
    if (values.has('--kb')) throw new TypeError('--kb cannot be combined with --instruction-source skill.');
    if (!AGENT_SKILL_NAMES.includes(skill as AgentSkillName)) {
      throw new TypeError('--skill must be engine-submission or dm-round.');
    }
    return { instructionSource: 'skill', skill: skill as AgentSkillName, kbPath: null };
  }
  if (source === 'kb') {
    const kbPath = resolve(cwd, values.get('--kb') ?? DEFAULT_AI_DM_KB_ROOT);
    validateKbPath(cwd, kbPath);
    return { instructionSource: 'kb', skill: null, kbPath };
  }
  if (values.has('--kb')) throw new TypeError('--kb requires --instruction-source kb.');
  return { instructionSource: 'none', skill: null };
}

export function parseConversationArgs(argv: readonly string[], cwd = process.cwd()): ConversationConfig {
  const values = new Map<string, string>();
  let dryRun = false;
  let captureRlData = false;
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--dry-run') { dryRun = true; continue; }
    if (option === '--capture-rl-data') { captureRlData = true; continue; }
    if (![
      '--fixtures', '--rooms', '--rounds', '--reps', '--cli', '--model', '--effort',
      '--escalation-model', '--escalation-effort',
      '--out', '--cli-bin', '--timeout-ms', '--kb', '--reaction-ask-default',
      '--transport', '--instruction-source', '--skill',
      '--combat-model', '--initiative-profile',
      '--intel-mode',
      '--override-policy',
      '--renderer-profile',
      '--turn-context-max-bytes',
      '--board-image',
      '--dm-mode', '--blind-repair-arm', '--blind-max-attempts', '--blind-facts',
      '--local-base-url', '--local-model', '--local-api-key', '--local-think',
    ].includes(option ?? '')) throw new TypeError(`Unknown conversation option ${option ?? '<missing>'}.`);
    values.set(option ?? '', requiredValue(argv, index, option ?? '<missing>'));
    index += 1;
  }
  const outPath = resolve(values.get('--out') ?? '');
  if ((values.get('--out') ?? '').length === 0) throw new TypeError('--out is required.');
  if (pathIsInside(cwd, outPath)) throw new TypeError('--out must be outside the repository working tree.');
  const dmModeExplicit = values.has('--dm-mode');
  const dmMode = values.get('--dm-mode') ?? 'advice';
  if (dmMode !== 'advice' && dmMode !== 'blind') {
    throw new TypeError('--dm-mode must be advice or blind.');
  }
  if (dmModeExplicit && !values.has('--instruction-source') && !values.has('--kb')) {
    values.set('--instruction-source', 'kb');
    values.set('--kb', D569_AI_DM_KB_ROOT);
  }
  const effort = values.get('--effort') ?? 'medium';
  if (!CONVERSATION_EFFORTS.includes(effort as ConversationEffort)) {
    throw new TypeError('--effort must be low, medium, high, or xhigh.');
  }
  const escalationModel = values.get('--escalation-model') ?? null;
  const escalationEffort = values.get('--escalation-effort') ?? null;
  if ((escalationModel === null) !== (escalationEffort === null)) {
    throw new TypeError('--escalation-model and --escalation-effort must be supplied together.');
  }
  if (escalationEffort !== null &&
    !CONVERSATION_EFFORTS.includes(escalationEffort as ConversationEffort)) {
    throw new TypeError('--escalation-effort must be low, medium, high, or xhigh.');
  }
  const cli = values.get('--cli') ?? 'codex';
  if (!CONVERSATION_CLIS.includes(cli as ConversationCli)) {
    throw new TypeError('--cli must be codex, claude-code, or local-openai.');
  }
  const selectedCli = cli as ConversationCli;
  const transport = values.get('--transport') ?? 'mcp_minimal';
  if (!CONVERSATION_TRANSPORTS.includes(transport as ConversationTransport)) {
    throw new TypeError('--transport must be mcp_minimal or final_indices.');
  }
  if (transport === 'final_indices' && selectedCli !== 'codex') {
    throw new TypeError('--transport final_indices currently requires --cli codex.');
  }
  const hasLocalOption = values.has('--local-base-url') || values.has('--local-model') ||
    values.has('--local-api-key') || values.has('--local-think');
  if (selectedCli !== 'local-openai' && hasLocalOption) {
    throw new TypeError('--local-base-url, --local-model, --local-api-key, and --local-think require --cli local-openai.');
  }
  const localBaseUrl = values.get('--local-base-url');
  const localModel = values.get('--local-model');
  if (selectedCli === 'local-openai' && (localBaseUrl === undefined || localModel === undefined)) {
    throw new TypeError('--cli local-openai requires --local-base-url and --local-model.');
  }
  const localThink = values.get('--local-think') ?? 'off';
  if (localThink !== 'on' && localThink !== 'off') {
    throw new TypeError('--local-think must be on or off.');
  }
  const localOpenAi: LocalOpenAiConfig | null = selectedCli === 'local-openai'
    ? {
        baseUrl: localBaseUrl ?? '',
        model: localModel ?? '',
        thinkMode: localThink,
        ...(values.has('--local-api-key') ? { apiKey: values.get('--local-api-key') ?? '' } : {}),
      }
    : null;
  const instructionSource = parsedInstructionSource(values, cwd, selectedCli);
  const reactionAskDefault = values.get('--reaction-ask-default') ?? 'decline';
  if (reactionAskDefault !== 'decline' && reactionAskDefault !== 'take') {
    throw new TypeError('--reaction-ask-default must be decline or take.');
  }
  const combatModel = values.get('--combat-model') ?? 'initiative_segments_v1';
  if (!COMBAT_MODELS.includes(combatModel as CombatModel)) {
    throw new TypeError('--combat-model must be monster_block_v1 or initiative_segments_v1.');
  }
  const initiativeProfile = values.get('--initiative-profile') ?? 'derived_v1';
  if (!ROOM_INITIATIVE_PROFILES.includes(initiativeProfile as RoomInitiativeProfile)) {
    throw new TypeError('--initiative-profile must be legacy or derived_v1.');
  }
  const intelMode = values.get('--intel-mode') ?? 'full';
  if (intelMode !== 'full' && intelMode !== 'off') {
    throw new TypeError('--intel-mode must be full or off.');
  }
  const overridePolicy = values.get('--override-policy') ?? DEFAULT_OVERRIDE_POLICY;
  if (!OVERRIDE_POLICIES.includes(overridePolicy as OverridePolicy)) {
    throw new TypeError('--override-policy must be strict or typed_reason.');
  }
  const rendererProfile = values.has('--renderer-profile')
    ? rendererProfileSchema.parse(JSON.parse(values.get('--renderer-profile') ?? ''))
    : DEFAULT_RENDERER_PROFILE;
  const turnContextMaximumBytes = positiveInteger(
    values.get('--turn-context-max-bytes') ?? String(dmMode === 'blind'
      ? BLIND_TURN_CONTEXT_MAX_BYTES
      : TURN_CONTEXT_MAX_BYTES),
    '--turn-context-max-bytes',
  );
  const boardImageMode = values.get('--board-image') ?? (dmModeExplicit ? 'png' : 'off');
  if (!BOARD_IMAGE_MODES.includes(boardImageMode as BoardImageMode)) {
    throw new TypeError('--board-image must be off, png, or capture_only.');
  }
  if (boardImageMode === 'png' && selectedCli === 'local-openai') {
    throw new TypeError('--board-image png requires an MCP-backed CLI.');
  }
  if (boardImageMode === 'png' && transport !== 'mcp_minimal') {
    throw new TypeError('--board-image png requires --transport mcp_minimal.');
  }
  const blindRepairArm = values.get('--blind-repair-arm') ?? 'code_only';
  if (!BLIND_REPAIR_ARMS.includes(blindRepairArm as BlindRepairArm)) {
    throw new TypeError('--blind-repair-arm must be code_only or minimal_legal_alternative.');
  }
  const blindMaxAttempts = blindMaxAttemptsSchema.parse(
    values.has('--blind-max-attempts')
      ? positiveInteger(values.get('--blind-max-attempts') ?? '', '--blind-max-attempts')
      : undefined,
  );
  const blindFactsValue = values.get('--blind-facts') ?? 'off';
  if (blindFactsValue !== 'on' && blindFactsValue !== 'off') {
    throw new TypeError('--blind-facts must be on or off.');
  }
  if (dmMode !== 'blind' && (values.has('--blind-repair-arm') ||
    values.has('--blind-max-attempts') || values.has('--blind-facts'))) {
    throw new TypeError('Blind repair, attempt, and fact options require --dm-mode blind.');
  }
  if (dmMode === 'blind' && (transport !== 'mcp_minimal' || boardImageMode !== 'png' ||
    turnContextMaximumBytes !== BLIND_TURN_CONTEXT_MAX_BYTES)) {
    throw new TypeError('Blind mode requires MCP-minimal, PNG delivery, and a 65536-byte base cap.');
  }
  if (dmModeExplicit && (escalationModel !== null || escalationEffort !== null || captureRlData)) {
    throw new TypeError('D569 experiment modes prohibit escalation and RL capture.');
  }
  if (dmModeExplicit && (instructionSource.instructionSource !== 'kb' ||
    instructionSource.kbPath !== resolve(cwd, D569_AI_DM_KB_ROOT))) {
    throw new TypeError('Explicit D569 DM modes require the shared D570 knowledge bundle.');
  }
  return {
    dmMode: dmMode as DmMode,
    dmModeExplicit,
    blindRepairArm: blindRepairArm as BlindRepairArm,
    blindMaxAttempts,
    blindFacts: blindFactsValue === 'on',
    midRoundAdjustmentsEnabled: !dmModeExplicit,
    intelMode,
    overridePolicy: overridePolicy as OverridePolicy,
    rendererProfile,
    turnContextMaximumBytes,
    combatModel: combatModel as CombatModel,
    initiativeProfile: initiativeProfile as RoomInitiativeProfile,
    partyPolicy: DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
    fixturesPath: resolve(values.get('--fixtures') ?? 'tests/fixtures/arena-basis'),
    rooms: positiveInteger(values.get('--rooms') ?? '12', '--rooms'),
    rounds: positiveInteger(values.get('--rounds') ?? values.get('--reps') ?? '1', '--rounds'),
    cli: selectedCli,
    decisionTransport: transport as ConversationTransport,
    model: localOpenAi?.model ?? values.get('--model') ?? (selectedCli === 'codex' ? 'gpt-5.6-sol' : 'sonnet'),
    effort: effort as ConversationEffort,
    escalationModel,
    escalationEffort: escalationEffort as ConversationEffort | null,
    outPath,
    dryRun,
    cwd: resolve(cwd),
    cliBin: values.get('--cli-bin') ?? (selectedCli === 'codex' ? 'codex' : selectedCli === 'claude-code' ? 'claude' : ''),
    timeoutMs: positiveInteger(values.get('--timeout-ms') ?? (dmModeExplicit ? '240000' : '120000'), '--timeout-ms'),
    ...instructionSource,
    reactionAskDefault,
    captureRlData,
    localOpenAi,
    boardImageMode: boardImageMode as BoardImageMode,
  };
}

const knowledgeBaseLoads = new Map<string, Promise<LoadedAiDmKnowledgeBase>>();

async function loadKnowledgeBase(config: ConversationConfig): Promise<LoadedAiDmKnowledgeBase> {
  const root = config.instructionSource === 'kb' ? config.kbPath : DEFAULT_AI_DM_KB_ROOT;
  const key = `${config.cwd}\0${root ?? '<none>'}`;
  const existing = knowledgeBaseLoads.get(key);
  if (existing !== undefined) return existing;
  const pending = loadAiDmKnowledgeBase(config.cwd, root);
  knowledgeBaseLoads.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    knowledgeBaseLoads.delete(key);
    throw error;
  }
}

const OPERATOR_CODEX_HOME = '/home/vagrant/.codex-aidm';

export interface IsolatedCodexHome {
  readonly codexHome: string;
  readonly skillHash: string | null;
}

export async function buildIsolatedCodexHome(
  artifactsDirectory: string,
  config: { readonly cwd: string } & AgentInstructionSource,
  operatorHome = OPERATOR_CODEX_HOME,
): Promise<IsolatedCodexHome> {
  const suffix = config.instructionSource === 'skill' ? config.skill : config.instructionSource;
  const codexHome = resolve(artifactsDirectory, `codex-home-${suffix}`);
  const skillsDirectory = resolve(codexHome, 'skills');
  await mkdir(skillsDirectory, { recursive: true });
  await Promise.all(['auth.json', 'config.toml'].map(async (name) =>
    symlink(resolve(operatorHome, name), resolve(codexHome, name), 'file')));
  if (config.instructionSource !== 'skill') return { codexHome, skillHash: null };

  const fixturePath = resolve(config.cwd, 'tests/fixtures/ai-dm-skills', config.skill, 'SKILL.md');
  const skillDirectory = resolve(skillsDirectory, config.skill);
  const skillBytes = await readFile(fixturePath);
  await mkdir(skillDirectory, { recursive: true });
  await copyFile(fixturePath, resolve(skillDirectory, 'SKILL.md'));
  return { codexHome, skillHash: sha256(skillBytes.toString('utf8')) };
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>> : null;
}

function requiredRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  const candidate = asRecord(value);
  if (candidate === null) throw new TypeError(`${label} must be an object.`);
  return candidate;
}

function recordsWithin(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(recordsWithin);
  const candidate = asRecord(value);
  return candidate === null ? [] : [candidate, ...Object.values(candidate).flatMap(recordsWithin)];
}

function eventToolNames(value: unknown): readonly string[] {
  return recordsWithin(value).flatMap((candidate) => {
    if (candidate['type'] !== 'mcp_tool_call' && candidate['type'] !== 'tool_use') return [];
    const name = candidate['tool'] ?? candidate['name'];
    return typeof name === 'string' && name.includes('engine') ? [name] : [];
  });
}

function eventContextTrimmed(value: unknown): boolean {
  if (typeof value === 'string' && value.includes('context_trimmed')) {
    try { return eventContextTrimmed(JSON.parse(value) as unknown); } catch { return false; }
  }
  if (Array.isArray(value)) return value.some(eventContextTrimmed);
  const candidate = asRecord(value);
  return candidate !== null && (candidate['context_trimmed'] === true ||
    Object.values(candidate).some(eventContextTrimmed));
}

function rejectionEvidence(value: unknown): readonly ConversationChainAttemptEvidence[] {
  const attempts = recordsWithin(value).flatMap((candidate) => {
    const rawAttempts = candidate['attempt_rejections'];
    if (!Array.isArray(rawAttempts)) return [];
    const actorId = typeof candidate['actor_id'] === 'string'
      ? combatantId(candidate['actor_id']) : null;
    return rawAttempts.flatMap<ConversationChainAttemptEvidence>((attemptValue) => {
      const attempt = asRecord(attemptValue);
      const reasons = attempt?.['rejection_reasons'];
      const attemptKind = attempt?.['attempt'];
    const declaredOptionId = attempt?.['declared_option_id'];
      const codes = candidate['codes'];
      const declaredProposal = typeof declaredOptionId === 'string'
        ? { option_id: declaredOptionId }
        : null;
      if ((attemptKind !== 'primary' && attemptKind !== 'fallback') ||
        !Array.isArray(reasons) || !reasons.every((reason) => typeof reason === 'string')) return [];
      return [{
        attempt: attemptKind,
        actorId,
        declaredProposal: declaredProposal === null ? null : structuredClone(declaredProposal),
        rejectionReasons: reasons as readonly string[],
        ...(Array.isArray(codes) && codes.every((code) => typeof code === 'string')
          ? { rejectionCodes: codes as readonly string[] }
          : {}),
      }];
    });
  });
  if (attempts.length > 0) return attempts;
  const error = recordsWithin(value).find((candidate) => candidate['isError'] === true);
  if (error === undefined) return [];
  const reasons = [...new Set(recordsWithin(error).flatMap((candidate) =>
    ['reason', 'summary', 'message', 'text'].flatMap((key) =>
      typeof candidate[key] === 'string' ? [candidate[key] as string] : []),
  ))].filter((reason) => reason.length > 0 && reason.length <= 2_000);
  return reasons.length === 0 ? [] : [{
    attempt: 'primary', actorId: null, declaredProposal: null, rejectionReasons: reasons,
  }];
}

function tokenCounts(usage: AgentUsage | null): ConversationTokenCounts {
  return usage === null ? { input: 0, cachedInput: 0, output: 0, reasoning: 0 } : {
    input: usage.turnInputTotal,
    cachedInput: usage.cachedInputTokens,
    output: usage.outputTokens,
    reasoning: usage.reasoningTokens,
  };
}

function truncateAgentFinalText(value: string): string {
  return Array.from(value).slice(0, 300).join('');
}

function addAgentUsage(total: AgentUsage | null, usage: AgentUsage | null): AgentUsage | null {
  if (usage === null) return total;
  if (total === null) return usage;
  return {
    turnInputTotal: turnInputTotal(total.turnInputTotal + usage.turnInputTotal),
    contextInputTokens: usage.contextInputTokens,
    modelContextWindow: usage.modelContextWindow,
    cachedInputTokens: total.cachedInputTokens + usage.cachedInputTokens,
    outputTokens: total.outputTokens + usage.outputTokens,
    reasoningTokens: total.reasoningTokens + usage.reasoningTokens,
  };
}

function livingMonsterIds(state: EncounterState): readonly CombatantId[] {
  return state.combatants.flatMap((subject) =>
    subject.profile.kind === 'monster' && subject.life !== 'dead' ? [subject.profile.id] : [],
  ).sort((left, right) => left.localeCompare(right));
}

function partyIsDefeated(state: EncounterState): boolean {
  const players = state.combatants.filter((subject) =>
    subject.profile.kind === 'player_character');
  return players.length > 0 && players.every((subject) => subject.life !== 'living');
}

interface SegmentMonsterPlanEntry {
  readonly proposal: EngineTurnProposal;
  readonly option: EngineOfferableOption;
  readonly primaryOption: EngineOfferableOption;
  readonly fallbackOption: EngineOfferableOption | null;
  readonly mechanics: ResolvedTurnMechanics;
  readonly selectedBranch: 'primary' | 'fallback';
  readonly strictNoFallback?: true;
}

type ExhaustionPlannerLabel = 'engine_default' | 'sim_controller';
export type ConversationAutoSubmitBlockReason = 'auto_submit_blocked_unresolved_frontier';

export interface ConversationAutoSubmitBlock {
  readonly actorId: CombatantId;
  readonly reason: ConversationAutoSubmitBlockReason;
}

interface ExhaustionPlanEntry extends SegmentMonsterPlanEntry {
  readonly resolutionDigest: string;
  readonly summary: string;
  readonly plannerLabel: ExhaustionPlannerLabel;
}

function monsterPlanHash(plan: ReadonlyMap<CombatantId, SegmentMonsterPlanEntry>): string {
  return sha256(canonicalJson([...plan.values()]
    .map((entry) => entry.proposal)
    .sort((left, right) => left.actorId.localeCompare(right.actorId))));
}

function firstActivationChoice(slot: EngineActivationChoiceSlot | null | undefined): EngineActivationChoice | null {
  if (slot === undefined || slot === null) return null;
  switch (slot.kind) {
    case 'command_word':
      return { kind: slot.kind, value: slot.values[0] };
    case 'unicorns_blessing_spell':
      return { kind: slot.kind, value: slot.values[0] };
    case 'dispel_evil_and_good_mode':
      return { kind: slot.kind, value: slot.values[0] };
    case 'calm_emotions_per_target':
      return {
        kind: slot.kind,
        selections: slot.targetIds.map((targetId) => ({ targetId, mode: slot.values[0] })),
      };
  }
}

function engineDefaultPlanEntry(
  state: EncounterState,
  actorId: CombatantId,
  revision = state.revision,
): ExhaustionPlanEntry & {
  readonly frontierResolution: 'fully_resolved' | 'contains_unresolved';
} {
  const planningState = projectFutureMonsterTurns(state, [actorId]);
  const report = actorOpportunityReport(
    planningState,
    actorId,
    canonicalEngineQueryPort,
    revision,
  );
  const option = report.defaultOption;
  const proposal: EngineTurnProposal = {
    actorId, expectedRevision: revision, primaryOptionId: option.optionId,
    fallbackOptionId: null,
    reason: 'The engine selected its highest-ranked available option.',
    activationChoice: firstActivationChoice(option.activationChoice),
    overrideJustification: null,
  };
  const resolution = pureTurnProposalResolver.resolve(planningState, proposal);
  if (!resolution.valid) {
    const details = resolution.refusals.map((refusal) => `${refusal.code}: ${refusal.summary}`).join('; ');
    throw new Error(`Could not stage engine default for ${actorId}: ${details}`);
  }
  return {
    proposal,
    option: resolution.option,
    primaryOption: resolution.primaryOption,
    fallbackOption: resolution.fallbackOption,
    mechanics: resolution.mechanics,
    selectedBranch: resolution.selectedBranch,
    resolutionDigest: resolution.resolutionDigest,
    summary: resolution.summary,
    plannerLabel: 'engine_default',
    frontierResolution: report.frontierResolution,
  };
}

function simControllerPlanEntry(
  state: EncounterState,
  actorId: CombatantId,
  revision = state.revision,
): ExhaustionPlanEntry {
  const planningState = projectFutureMonsterTurns(state, [actorId]);
  const option = availableEngineActorOptions(
    planningState,
    actorId,
    canonicalEngineQueryPort,
    revision,
  ).find((candidate) => candidate.actionSlots.some((slot) =>
    slot.slot === 'main' && slot.use.kind === 'dodge'));
  if (option === undefined) throw new Error(`Could not stage deterministic-controller Dodge for ${actorId}.`);
  const proposal: EngineTurnProposal = {
    actorId, expectedRevision: revision, primaryOptionId: option.optionId,
    fallbackOptionId: null,
    reason: 'The deterministic controller chose Dodge after model planning was exhausted.',
    overrideJustification: null,
  };
  const resolution = pureTurnProposalResolver.resolve(planningState, proposal);
  if (!resolution.valid) throw new Error(`Could not resolve deterministic-controller Dodge for ${actorId}.`);
  return {
    proposal,
    option: resolution.option,
    primaryOption: resolution.primaryOption,
    fallbackOption: resolution.fallbackOption,
    mechanics: resolution.mechanics,
    selectedBranch: resolution.selectedBranch,
    resolutionDigest: resolution.resolutionDigest,
    summary: resolution.summary,
    plannerLabel: 'sim_controller',
  };
}

function maximalLivingMonsterSegment(state: EncounterState): readonly CombatantId[] {
  if (state.activeInitiativeIndex === null) return [];
  const actors: CombatantId[] = [];
  for (let index = state.activeInitiativeIndex; index < state.initiative.length; index += 1) {
    const slot = state.initiative[index];
    if (slot === undefined) throw new Error('Initiative segment encountered a missing slot.');
    const combatant = state.combatants.find((entry) => entry.profile.id === slot.combatant);
    if (combatant === undefined) throw new Error(`Initiative actor ${slot.combatant} is absent.`);
    if (combatant.life === 'dead') continue;
    if (combatant.profile.kind === 'player_character') break;
    actors.push(combatant.profile.id);
  }
  return actors;
}

function playerWindowBeforeNextMonster(state: EncounterState): {
  readonly players: readonly CombatantId[];
  readonly monsters: readonly CombatantId[];
} {
  if (state.activeInitiativeIndex === null) return { players: [], monsters: [] };
  const players: CombatantId[] = [];
  const monsters: CombatantId[] = [];
  let reachedMonsters = false;
  for (let index = state.activeInitiativeIndex; index < state.initiative.length; index += 1) {
    const slot = state.initiative[index];
    if (slot === undefined) throw new Error('Speculative initiative window encountered a missing slot.');
    const combatant = state.combatants.find((entry) => entry.profile.id === slot.combatant);
    if (combatant === undefined) throw new Error(`Speculative initiative actor ${slot.combatant} is absent.`);
    if (combatant.life === 'dead') continue;
    if (combatant.profile.kind === 'player_character') {
      if (reachedMonsters) break;
      players.push(combatant.profile.id);
      continue;
    }
    reachedMonsters = true;
    monsters.push(combatant.profile.id);
  }
  return { players, monsters };
}

function sameCombatantSet(left: readonly CombatantId[], right: readonly CombatantId[]): boolean {
  const a = [...left].sort((one, two) => one.localeCompare(two));
  const b = [...right].sort((one, two) => one.localeCompare(two));
  return a.length === b.length && a.every((actorId, index) => actorId === b[index]);
}

function renderedContextActorIds(context: Readonly<Record<string, unknown>>): readonly CombatantId[] {
  const actors = context['actors'];
  if (!Array.isArray(actors)) return [];
  return actors.flatMap((value): readonly CombatantId[] => {
    const actor = asRecord(value);
    return typeof actor?.['actor_id'] === 'string' ? [combatantId(actor['actor_id'])] : [];
  });
}

function executionErrorClass(error: unknown): ConversationExecutionErrorClass {
  const message = error instanceof Error ? error.message : String(error);
  if (/no (?:round |scripted )?program|program is missing|missing.*program/iu.test(message)) {
    return 'missing_pc_program';
  }
  if (/Self spell does not select targets|invalid.*self.?target/iu.test(message)) {
    return 'invalid_self_target';
  }
  if (/pending decision for this boundary is unresolved|unresolved.*boundary decision/iu.test(message)) {
    return 'unresolved_boundary_decision';
  }
  if (/timed out|timeout/iu.test(message)) return 'cli_timeout';
  return 'other';
}

function optionStructure(option: EngineOfferableOption): string {
  const { optionId: _optionId, revision: _revision, ...structure } = option;
  return canonicalJson(structure);
}

function rebaseStoredPlanEntries(input: {
  readonly state: EncounterState;
  readonly actualRevision: number;
  readonly entries: readonly SegmentMonsterPlanEntry[];
}): readonly SegmentMonsterPlanEntry[] | null {
  const actors = input.entries.map((entry) => entry.proposal.actorId);
  const planningState = projectFutureMonsterTurns(input.state, actors);
  const rebound: SegmentMonsterPlanEntry[] = [];
  for (const entry of input.entries) {
    const options = availableEngineActorOptions(
      planningState,
      entry.proposal.actorId,
      canonicalEngineQueryPort,
      input.actualRevision,
    );
    const primary = options.filter((option) => optionStructure(option) === optionStructure(entry.primaryOption));
    const fallback = entry.fallbackOption === null ? [] : options.filter((option) =>
      optionStructure(option) === optionStructure(entry.fallbackOption!));
    if (primary.length !== 1 || (entry.fallbackOption !== null && fallback.length !== 1)) return null;
    const proposal: EngineTurnProposal = {
      ...structuredClone(entry.proposal),
      expectedRevision: input.actualRevision,
      primaryOptionId: primary[0]!.optionId,
      fallbackOptionId: entry.fallbackOption === null ? null : fallback[0]!.optionId,
    };
    const resolution = pureTurnProposalResolver.resolve(planningState, proposal);
    if (!resolution.valid) return null;
    rebound.push({
      proposal,
      option: structuredClone(resolution.option),
      primaryOption: structuredClone(resolution.primaryOption),
      fallbackOption: structuredClone(resolution.fallbackOption),
      mechanics: resolution.mechanics,
      selectedBranch: resolution.selectedBranch,
    });
  }
  return rebound;
}

function adjustmentPreflight(input: {
  readonly state: EncounterState;
  readonly actualRevision: number;
  readonly entries: readonly SegmentMonsterPlanEntry[];
}): { readonly dispatch: true; readonly reason: 'retained_plan_illegal' | 'superior_option_appeared' } | {
  readonly dispatch: false;
  readonly rebound: readonly SegmentMonsterPlanEntry[];
} {
  const rebound = rebaseStoredPlanEntries(input);
  if (rebound === null) return { dispatch: true, reason: 'retained_plan_illegal' };
  const planningState = projectFutureMonsterTurns(
    input.state,
    rebound.map((entry) => entry.proposal.actorId),
  );
  const superiorAppeared = rebound.some((entry) => submissionDominance(
    actorOpportunityReport(
      planningState,
      entry.proposal.actorId,
      canonicalEngineQueryPort,
      input.actualRevision,
    ),
    entry.option.optionId,
  ).status === 'dominated');
  return superiorAppeared
    ? { dispatch: true, reason: 'superior_option_appeared' }
    : { dispatch: false, rebound };
}

function adoptSpeculativeBranch(input: {
  readonly state: EncounterState;
  readonly actualRevision: number;
  readonly targetRoom: number;
  readonly targetMonsterRound: number;
  readonly targetActorIds: readonly CombatantId[];
  readonly plan: QueuedSpeculativePlanEnvelope;
  readonly sourceCapsule: EngineStateCapsule;
}): { readonly entries: readonly SegmentMonsterPlanEntry[]; readonly scenarioId: string } | {
  readonly entries: null;
  readonly reason: Exclude<ConversationSpeculationDiscardReason, 'empty_scenario_menu' | 'budget_expired' | 'dispatch_failed'>;
} {
  if (input.plan.targetRoom !== input.targetRoom ||
    input.plan.targetMonsterRound !== input.targetMonsterRound) {
    return { entries: null, reason: 'target_disappeared' };
  }
  const livingTargets = input.targetActorIds.filter((actorId) => input.state.combatants.some((entry) =>
    entry.profile.id === actorId && entry.profile.kind === 'monster' && entry.life !== 'dead'));
  if (!sameCombatantSet(input.plan.actorIds, livingTargets)) {
    return { entries: null, reason: 'actor_set_changed' };
  }
  const selection = evaluateHostScenarios(input.state, input.plan.scenarios, canonicalEngineQueryPort);
  if (selection.kind === 'no_match') {
    return {
      entries: null,
      reason: selection.reason === 'OVERLAPPING_SCENARIOS'
        ? 'ambiguous_scenario_match'
        : 'no_scenario_match',
    };
  }
  const branch = input.plan.branches.find((candidate) => candidate.scenarioId === selection.scenario.scenarioId);
  if (branch === undefined || !sameCombatantSet(
    branch.proposals.map((proposal) => proposal.actorId),
    livingTargets,
  )) return { entries: null, reason: 'actor_set_changed' };
  const planningState = projectFutureMonsterTurns(input.state, livingTargets);
  const entries: SegmentMonsterPlanEntry[] = [];
  for (const proposed of branch.proposals) {
    const actorOptions = availableEngineActorOptions(
      planningState,
      proposed.actorId,
      canonicalEngineQueryPort,
      input.actualRevision,
    );
    const sourceOptions = input.sourceCapsule.projection.combatants
      .find((actor) => actor.id === proposed.actorId)?.options ?? [];
    const sourcePrimary = sourceOptions.find((option) => option.optionId === proposed.primaryOptionId);
    const sourceFallback = proposed.fallbackOptionId === null ? null : sourceOptions.find((option) =>
      option.optionId === proposed.fallbackOptionId);
    if (sourcePrimary === undefined || sourceFallback === undefined) return {
      entries: null, reason: 'option_mapping_failed',
    };
    const primaryMatches = actorOptions.filter((option) =>
      optionStructure(option) === optionStructure(sourcePrimary));
    const fallbackMatches = sourceFallback === null ? [] : actorOptions.filter((option) =>
      optionStructure(option) === optionStructure(sourceFallback));
    if (primaryMatches.length !== 1 ||
      (proposed.fallbackOptionId !== null && fallbackMatches.length !== 1)) {
      return { entries: null, reason: 'option_mapping_failed' };
    }
    const primary = primaryMatches[0];
    const fallback = proposed.fallbackOptionId === null ? null : fallbackMatches[0];
    if (primary === undefined || (proposed.fallbackOptionId !== null && fallback === undefined)) {
      return { entries: null, reason: 'option_mapping_failed' };
    }
    const rebound: EngineTurnProposal = {
      ...structuredClone(proposed),
      expectedRevision: input.actualRevision,
      primaryOptionId: primary.optionId,
      fallbackOptionId: fallback?.optionId ?? null,
    };
    const resolution = pureTurnProposalResolver.resolve(planningState, rebound);
    if (!resolution.valid) return { entries: null, reason: 'proposal_validation_failed' };
    entries.push({
      proposal: rebound,
      option: structuredClone(resolution.option),
      primaryOption: structuredClone(resolution.primaryOption),
      fallbackOption: structuredClone(resolution.fallbackOption),
      mechanics: resolution.mechanics,
      selectedBranch: resolution.selectedBranch,
    });
  }
  return { entries, scenarioId: selection.scenario.scenarioId };
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
  };
}

interface SuggestedPlanBookkeeping {
  readonly play: ConversationSuggestedPlay;
  readonly proposals: readonly EngineTurnProposal[];
}

function suggestedPlanBookkeeping(capsule: EngineRoundSnapshot['capsule']): SuggestedPlanBookkeeping | null {
  const top = SNIPPET_REGISTRY.applicable(capsule)[0];
  if (top === undefined) return null;
  const draft = SNIPPET_REGISTRY.expand(top.name, capsule);
  return {
    play: { name: top.name, hash: top.snippetHash },
    proposals: draft.proposals,
  };
}

export function classifySuggestionAdoption(
  suggestion: readonly EngineTurnProposal[] | null,
  accepted: readonly EngineTurnProposal[] | null,
): ConversationSuggestionAdoption | null {
  if (suggestion === null) return null;
  if (accepted === null || accepted.length === 0) return 'ignored';
  const acceptedByActor = new Map(accepted.map((entry) => [entry.actorId, entry]));
  const exact = accepted.length === suggestion.length && suggestion.every((proposal) =>
    isDeepStrictEqual(acceptedByActor.get(proposal.actorId), proposal));
  if (exact) return 'as_is';
  const retainsSuggestedOption = suggestion.some((proposal) => {
    const acceptedProposal = acceptedByActor.get(proposal.actorId);
    return acceptedProposal !== undefined && acceptedProposal.primaryOptionId === proposal.primaryOptionId;
  });
  return retainsSuggestedOption ? 'edited' : 'ignored';
}

function scriptedProposals(
  state: EncounterState,
  phase: 'initial' | 'correction',
  revision = state.revision,
): readonly EngineTurnProposal[] {
  const actors = livingMonsterIds(state);
  const planningState = projectFutureMonsterTurns(state, actors);
  return actors.map((actorId): EngineTurnProposal => {
    const report = actorOpportunityReport(
      planningState,
      actorId,
      canonicalEngineQueryPort,
      revision,
    );
    const primary = report.defaultOption;
    const fallback = availableEngineActorOptions(
      planningState, actorId, canonicalEngineQueryPort, revision,
    ).find((option) => option.optionId !== primary.optionId);
    if (phase === 'initial' && fallback === undefined) {
      throw new Error(`Could not stage an independent fallback for ${actorId}.`);
    }
    return {
      actorId, expectedRevision: revision, primaryOptionId: primary.optionId,
      fallbackOptionId: phase === 'correction' ? null : fallback?.optionId ?? null,
      reason: 'Use the engine-ranked option to maximize immediate tactical value.',
      overrideJustification: null,
    };
  });
}

function intentionallyIgnoredProposals(
  state: EncounterState,
  phase: 'initial' | 'correction',
  playToken: EnginePlayToken,
  revision = state.revision,
): readonly EngineTurnProposal[] {
  const actors = livingMonsterIds(state);
  const planningState = projectFutureMonsterTurns(state, actors);
  return actors.map((actorId): EngineTurnProposal => {
    const option = availableEngineActorOptions(
      planningState,
      actorId,
      canonicalEngineQueryPort,
      revision,
    ).find((candidate) => candidate.actionSlots.some((slot) =>
      slot.slot === 'main' && slot.use.kind === 'end_turn'));
    if (option === undefined) throw new Error(`Could not stage intentionally ignored response for ${actorId}.`);
    const fallback = availableEngineActorOptions(
      planningState, actorId, canonicalEngineQueryPort, revision,
    ).find((candidate) => candidate.optionId !== option.optionId);
    if (phase === 'initial' && fallback === undefined) {
      throw new Error(`Could not stage an independent ignored-response fallback for ${actorId}.`);
    }
    return {
      actorId,
      expectedRevision: revision,
      primaryOptionId: option.optionId,
      fallbackOptionId: phase === 'correction' ? null : fallback?.optionId ?? null,
      reason: 'End the turn to intentionally ignore the suggested coordinated play.',
      overrideJustification: {
        kind: 'engine_play',
        token: playToken,
      },
    };
  });
}

export class McpChildExited extends Error {
  override readonly name = 'McpChildExited';
  readonly code = 'MCP_CHILD_EXITED';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

interface PendingMcpRequest {
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: Error) => void;
}

export interface McpClient {
  readonly child: ChildProcessWithoutNullStreams;
  readonly lines: Interface;
  readonly pending: Map<number, PendingMcpRequest>;
  nextId: number;
  stderr: string;
  terminalError: Error | null;
  terminalErrorDelivered: boolean;
  readonly exit: Promise<number | null>;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rejectMcpClient(client: McpClient, error: Error): void {
  if (client.terminalError === null) {
    client.terminalError = error;
    if (client.pending.size > 0) client.terminalErrorDelivered = true;
    for (const pending of client.pending.values()) pending.reject(error);
    client.pending.clear();
  }
}

function ensureMcpChildTermination(client: McpClient, signal: NodeJS.Signals): void {
  if (client.child.exitCode === null && client.child.signalCode === null) client.child.kill(signal);
}

function terminateMcpClient(client: McpClient, error: Error): void {
  rejectMcpClient(client, error);
  ensureMcpChildTermination(client, 'SIGTERM');
}

function childExitedError(client: McpClient, detail: string, cause?: unknown): McpChildExited {
  const stderr = client.stderr.trim();
  return new McpChildExited(
    `Engine MCP child ${detail}${stderr.length === 0 ? '' : `: ${stderr}`}`,
    cause === undefined ? undefined : { cause },
  );
}

export function createMcpClient(child: ChildProcessWithoutNullStreams): McpClient {
  const lines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
  let resolveExit: (code: number | null) => void = () => {};
  const exit = new Promise<number | null>((resolvePromise) => { resolveExit = resolvePromise; });
  const client: McpClient = {
    child, lines, pending: new Map(), nextId: 1, stderr: '',
    terminalError: null, terminalErrorDelivered: false, exit,
  };
  child.stderr.on('data', (chunk: Buffer) => { client.stderr += chunk.toString('utf8'); });
  child.stderr.on('error', (error) => {
    terminateMcpClient(client, childExitedError(client, `stderr failed: ${errorText(error)}`, error));
  });
  child.stdin.on('error', (error) => {
    terminateMcpClient(client, childExitedError(client, `stdin failed: ${errorText(error)}`, error));
  });
  child.stdout.on('error', (error) => {
    terminateMcpClient(client, childExitedError(client, `stdout failed: ${errorText(error)}`, error));
  });
  lines.on('error', (error) => {
    terminateMcpClient(client, childExitedError(client, `readline failed: ${errorText(error)}`, error));
  });
  lines.on('line', (line) => {
    let response: Readonly<Record<string, unknown>> | null;
    try {
      response = asRecord(JSON.parse(line) as unknown);
    } catch (error) {
      terminateMcpClient(client, new Error(`Engine MCP response was not valid JSON: ${errorText(error)}`, { cause: error }));
      return;
    }
    if (response === null || typeof response['id'] !== 'number') {
      terminateMcpClient(client, new Error('Engine MCP response id mismatch.'));
      return;
    }
    const id = response['id'];
    const pending = client.pending.get(id);
    if (pending === undefined) {
      terminateMcpClient(client, new Error('Engine MCP response id mismatch.'));
      return;
    }
    client.pending.delete(id);
    if (response['error'] !== undefined) pending.reject(new Error(JSON.stringify(response['error'])));
    else pending.resolve(response['result']);
  });
  lines.once('close', () => {
    terminateMcpClient(client, childExitedError(client, 'stdout closed'));
  });
  child.once('error', (error) => {
    rejectMcpClient(client, childExitedError(client, `failed: ${errorText(error)}`, error));
    resolveExit(null);
  });
  child.once('exit', (code, signal) => {
    rejectMcpClient(client, childExitedError(
      client,
      `exited ${code === null ? `from ${String(signal)}` : `with code ${String(code)}`}`,
    ));
    resolveExit(code);
  });
  return client;
}

export function startMcpClient(cwd: string, launcherPath: string): McpClient {
  return createMcpClient(spawn(process.execPath, [
    resolve(cwd, 'node_modules/vite-node/vite-node.mjs'),
    resolve(cwd, 'tools/engine-mcp-server.ts'),
    launcherPath,
  ], { cwd, stdio: ['pipe', 'pipe', 'pipe'] }));
}

export async function mcpRequest(client: McpClient, method: string, params: unknown): Promise<unknown> {
  const id = client.nextId;
  client.nextId += 1;
  const requestParams = asRecord(params);
  if (requestParams === null) throw new TypeError('MCP request params must be an object.');
  if (client.terminalError !== null) {
    client.terminalErrorDelivered = true;
    throw client.terminalError;
  }
  if (client.child.exitCode !== null || client.child.signalCode !== null ||
    client.child.stdin.destroyed || client.child.stdin.writableEnded || !client.child.stdin.writable) {
    const error = childExitedError(client, 'is not writable');
    rejectMcpClient(client, error);
    client.terminalErrorDelivered = true;
    throw error;
  }
  const payload = `${JSON.stringify({
    jsonrpc: '2.0', id, method,
    params: {
      ...requestParams,
      _meta: mcpRequestMeta({ name: 'ai-dm-conversation-SIMULATED', version: '1.0.0' }),
    },
  })}\n`;
  const response = new Promise<unknown>((resolvePromise, reject) => {
    client.pending.set(id, { resolve: resolvePromise, reject });
  });
  client.child.stdin.write(payload, (error) => {
    if (error !== null && error !== undefined) {
      terminateMcpClient(client, childExitedError(client, `write failed: ${errorText(error)}`, error));
    }
  });
  return response;
}

const MCP_CHILD_SHUTDOWN_GRACE_MS = 1_000;

async function waitForMcpExit(
  client: McpClient,
  timeoutMs: number,
): Promise<{ readonly exited: true; readonly code: number | null } | { readonly exited: false }> {
  return new Promise((resolvePromise) => {
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      resolvePromise({ exited: false });
    }, timeoutMs);
    void client.exit.then((code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolvePromise({ exited: true, code });
    });
  });
}

export async function stopMcpClient(client: McpClient, allowNonzero = false): Promise<void> {
  if (!client.child.stdin.destroyed && !client.child.stdin.writableEnded) client.child.stdin.end();
  let outcome = await waitForMcpExit(client, MCP_CHILD_SHUTDOWN_GRACE_MS);
  if (!outcome.exited) {
    ensureMcpChildTermination(client, 'SIGKILL');
    outcome = await waitForMcpExit(client, MCP_CHILD_SHUTDOWN_GRACE_MS);
  }
  client.lines.close();
  if (!outcome.exited) {
    const error = childExitedError(client, 'did not exit after SIGKILL');
    rejectMcpClient(client, error);
    if (!client.terminalErrorDelivered) {
      client.terminalErrorDelivered = true;
      throw client.terminalError ?? error;
    }
    return;
  }
  if (outcome.code !== 0 && !allowNonzero && !client.terminalErrorDelivered) {
    const error = client.terminalError ?? childExitedError(
      client,
      `exited with code ${String(outcome.code)}`,
    );
    client.terminalErrorDelivered = true;
    throw error;
  }
}

function externalReactionGuidance(guidance: ReactionGuidanceDeclaration): Readonly<Record<string, unknown>> {
  return {
    ...(guidance.sideWide === null ? {} : { side_wide: guidance.sideWide }),
    ...(guidance.actors.length === 0 ? {} : {
      actors: guidance.actors.map((entry) => ({ actor_id: entry.actorId, triggers: entry.triggers })),
    }),
  };
}

function rlCapture(
  knowledgeBase: string | null,
  turnContext: CapturedTurnContext,
  proposal: RoundTurnProposalEnvelope | PlanAdjustmentProposalEnvelope,
  intelMode: IntelMode,
  metadata: {
    readonly repoCommit: string;
    readonly model: string;
    readonly effort: ConversationEffort;
    readonly sessionId: string | null;
    readonly parentPlanId: string | null;
    readonly partyPolicyHash: string | null;
    readonly materialityPolicyHash: string | null;
    readonly plannerLabel?: 'model' | ExhaustionPlannerLabel;
    readonly autoSubmitBlocks?: readonly ConversationAutoSubmitBlock[];
  },
): ConversationRlDataV2 {
  if (proposal.submittedArguments === undefined) {
    throw new Error('Accepted proposal omitted its validated submission arguments.');
  }
  if (intelMode === 'full' && proposal.intelCapture === undefined) {
    throw new Error('Accepted proposal omitted its full-precision offered-set intel capture.');
  }
  const adjustment = proposal.kind === 'plan_adjustment_turn_proposal';
  return {
    format: 'arena-rl-capture-v2',
    task: adjustment ? 'plan_adjustment' : 'round_plan',
    submissionTool: adjustment
      ? 'engine.submit_plan_adjustment'
      : 'engine.submit_round_proposals',
    sourceLicense: 'project-generated',
    sessionInstructions: buildArenaSessionInstructions(knowledgeBase),
    rawTurnContext: turnContext.raw,
    turnContext: structuredClone(turnContext.value),
    submittedArguments: structuredClone(proposal.submittedArguments),
    stateDigest: proposal.stateDigest,
    requestId: proposal.requestId,
    proposalId: proposal.proposalId,
    parentPlanId: metadata.parentPlanId,
    repoCommit: metadata.repoCommit,
    model: metadata.model,
    effort: metadata.effort,
    sessionId: metadata.sessionId,
    roundProtocolVersion: ROUND_PROTOCOL_VERSION,
    partyPolicyHash: metadata.partyPolicyHash,
    materialityPolicyHash: metadata.materialityPolicyHash,
    plannerLabel: metadata.plannerLabel ?? 'model',
    autoSubmitBlocks: structuredClone(metadata.autoSubmitBlocks ?? []),
    intelPolicyVersions: intelMode === 'off'
      ? { intel_mode: 'off' }
      : {
          movement: MOVEMENT_OPTIONS_INTEL_POLICY,
          opportunityCost: OPPORTUNITY_COST_POLICY,
          teamScorer: TEAM_SCORER_POLICY,
          correction: DOMINANCE_CORRECTION_POLICY,
          materialityContext: MATERIALITY_CONTEXT_POLICY,
          actorKnowledge: ACTOR_KNOWLEDGE_POLICY,
          reactionSpendHold: REACTION_SPEND_HOLD_POLICY,
          legendaryWindows: LEGENDARY_WINDOWS_POLICY,
          recoveryCapability: RECOVERY_CAPABILITY_POLICY,
        },
    engineIntel: proposal.intelCapture === undefined ? null : structuredClone(proposal.intelCapture),
  };
}

interface CapturedTurnContext {
  readonly raw: string;
  readonly granularity: 'full' | 'turn_delta';
  readonly value: Readonly<Record<string, unknown>>;
  readonly rendering?: TurnContextRenderEvidence;
}

function capturedTurnContext(raw: string, maximumBytes: number): CapturedTurnContext {
  const value = requiredRecord(JSON.parse(raw) as unknown, 'recorded turn context');
  const proseDocument =
    (value['format'] === 'caveman_prose' || value['format'] === 'regular_prose') &&
    typeof value['document'] === 'string'
      ? value['document']
      : null;
  const modelVisibleRaw = proseDocument ?? raw;
  const bytes = new TextEncoder().encode(modelVisibleRaw).byteLength;
  const baseValue = structuredClone(value) as Record<string, unknown>;
  const hasSemanticBoard = baseValue['semantic_board'] !== undefined;
  delete baseValue['semantic_board'];
  delete baseValue['semantic_board_truncated'];
  const baseBytes = new TextEncoder().encode(JSON.stringify(baseValue)).byteLength;
  const totalMaximumBytes = maximumBytes + (hasSemanticBoard ? SEMANTIC_BOARD_MAX_BYTES : 0);
  if ((proseDocument === null && baseBytes > maximumBytes) || bytes > totalMaximumBytes) {
    throw new RangeError(
      `Recorded turn context is ${String(bytes)} UTF-8 bytes with a ${String(baseBytes)}-byte base; maxima are ${String(totalMaximumBytes)} total and ${String(maximumBytes)} base.`,
    );
  }
  const granularity = value['granularity'];
  if (granularity !== 'full' && granularity !== 'turn_delta') {
    throw new TypeError('Recorded turn context has no supported granularity marker.');
  }
  return { raw: modelVisibleRaw, granularity, value };
}

function deliveredTurnContextMeasurement(context: CapturedTurnContext): TurnContextMeasurement {
  const proseDocument =
    (context.value['format'] === 'caveman_prose' || context.value['format'] === 'regular_prose') &&
    typeof context.value['document'] === 'string';
  if (proseDocument) {
    return {
      baseBytes: new TextEncoder().encode(context.raw).byteLength,
      semanticBytes: 0,
    };
  }
  const base = structuredClone(context.value) as Record<string, unknown>;
  const semantic = base['semantic_board'];
  delete base['semantic_board'];
  delete base['semantic_board_truncated'];
  return {
    baseBytes: new TextEncoder().encode(JSON.stringify(base)).byteLength,
    semanticBytes: semantic === undefined
      ? 0
      : new TextEncoder().encode(JSON.stringify(semantic)).byteLength,
  };
}

function blindRendererEvidence(
  state: EncounterState,
  capsule: EngineStateCapsule,
  context: CapturedTurnContext,
): TurnContextRenderEvidence {
  const base = structuredClone(context.value) as Record<string, unknown>;
  const semantic = base['semantic_board'];
  delete base['semantic_board'];
  const baseContextBytes = new TextEncoder().encode(JSON.stringify(base)).byteLength;
  const semanticBoardBytes = semantic === undefined
    ? 0
    : new TextEncoder().encode(JSON.stringify(semantic)).byteLength;
  return {
    preTrimBytes: baseContextBytes,
    postTrimBytes: baseContextBytes,
    baseContextBytes,
    features: extractCircumstanceFeatures({
      state,
      capsule,
      renderedContext: context.value,
      granularity: 'full',
      preTrimBytes: baseContextBytes,
      postTrimBytes: baseContextBytes,
    }),
    removals: { rows: 0, options: 0, threats: 0, movement: 0, rare: 0, adverts: 0, topLevel: 0 },
    optionsOmittedForSizeByActor: [],
    semanticBoardBytes,
    semanticBoardTruncated: [],
  };
}

function unrequestedTurnContext(maximumBytes: number): CapturedTurnContext {
  return capturedTurnContext(JSON.stringify({
    granularity: 'full',
    context_not_requested: true,
  }), maximumBytes);
}

export function profiledTurnContextArguments(input: {
  readonly runId: string;
  readonly expectedRevision: number;
  readonly intelMode: IntelMode;
  readonly blind: boolean;
  readonly baseRevision?: number;
}): Readonly<Record<string, unknown>> {
  return {
    run_id: input.runId,
    expected_revision: input.expectedRevision,
    scope: 'round',
    ...(input.blind ? {} : { intel_mode: input.intelMode }),
    ...(input.baseRevision === undefined
      ? { granularity: 'full' }
      : { granularity: 'turn_delta', since_revision: input.baseRevision }),
  };
}

function plannedTurnContext(
  state: EncounterState,
  snapshot: EngineRoundSnapshot,
  base: TurnContextDeltaBase | undefined,
  intelMode: IntelMode,
  rendererProfile: RendererProfile,
  turnContextMaximumBytes: number,
  blind?: {
    readonly repairArm: BlindRepairArm;
    readonly maxAttempts: BlindMaxAttempts;
    readonly facts: boolean;
    readonly visuals: readonly BlindVisualDescriptor[];
  },
): CapturedTurnContext {
  const capsule = snapshot.capsule;
  const request = capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error('Recorded turn context requires an ordinary pending request.');
  }
  let rendering: CapturedTurnContext['rendering'];
  const runtime = createEngineMcpRuntime(state, {
    runId: capsule.runId,
    branchId: capsule.branchId,
    revision: capsule.revision,
    requestId: request.requestId,
    phase: request.phase,
    correctionNumber: request.correctionNumber,
    room: capsule.projection.room,
    ...(capsule.historyDelta[0] === undefined ? {} : {
      historyKind: capsule.historyDelta[0].kind,
    }),
    ...(request.kind === 'plan_adjustment' ? {
      requestKind: request.kind,
      requestedActorIds: request.actors,
      planAdjustment: {
      parentPlanId: request.parentPlanId,
      baselinePlanHash: request.baselinePlanHash,
      triggerPcTurnId: request.triggerPcTurnId,
      beforeRevision: request.beforeRevision,
      afterRevision: request.afterRevision,
      materialityReasonCodes: request.materialityReasonCodes,
      baselineProposalDigests: request.baselineProposalDigests,
      adjustmentBudget: request.adjustmentBudget,
      },
    } : { requestedActorIds: request.actors }),
    toolProfile: blind === undefined ? 'dm' : 'blind',
    ...(blind === undefined ? {} : {
      dmMode: 'blind' as const,
      blindRepairArm: blind.repairArm,
      blindMaxAttempts: blind.maxAttempts,
      blindFacts: blind.facts,
      blindVisuals: blind.visuals,
    }),
    rendererProfile,
    turnContextMaximumBytes,
    onTurnContextRendered: (value) => { rendering = value; },
    initiativeProjection: capsule.projection.initiative,
    ...(base === undefined || blind !== undefined ? {} : { turnContextDeltaBase: base }),
  });
  const value = runtime.toolSurface.execute('engine.get_turn_context', profiledTurnContextArguments({
    runId: capsule.runId,
    expectedRevision: capsule.revision,
    intelMode,
    blind: blind !== undefined,
    ...(base === undefined || blind !== undefined ? {} : { baseRevision: base.revision }),
  }));
  return {
    ...capturedTurnContext(JSON.stringify(value), turnContextMaximumBytes),
    ...(rendering === undefined ? {} : { rendering }),
  };
}

function takeTurnContext(path: string, maximumBytes: number): CapturedTurnContext | null {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return null; }
  const raw = source.split('\n').filter((line) => line.trim().length > 0).at(-1);
  return raw === undefined ? null : capturedTurnContext(contextPayload(raw), maximumBytes);
}

function contextPayload(raw: string): string {
  const value: unknown = JSON.parse(raw);
  const record = requiredRecord(value, 'turn-context spool record');
  const {
    dispatchId: _dispatchId,
    dispatchProfile: _dispatchProfile,
    dispatchPhase: _dispatchPhase,
    ...context
  } = record;
  return JSON.stringify(context);
}

function takeCorrelatedTurnContext(
  path: string,
  maximumBytes: number,
  dispatchId: string,
): CapturedTurnContext | null {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return null; }
  const raw = source.split('\n').filter((line) => line.trim().length > 0).findLast((line) => {
    const value: unknown = JSON.parse(line);
    return asRecord(value)?.['dispatchId'] === dispatchId;
  });
  return raw === undefined ? null : capturedTurnContext(contextPayload(raw), maximumBytes);
}

function spoolEvidence(path: string): { readonly recordCount: number; readonly sha256: string } {
  let source = '';
  try { source = readFileSync(path, 'utf8'); } catch { /* an absent spool is the empty spool */ }
  return {
    recordCount: source.split('\n').filter((line) => line.trim().length > 0).length,
    sha256: sha256(source),
  };
}

export function persistD569IntegrityStop(input: {
  readonly artifactPath: string;
  readonly rowPath: string;
  readonly scheduledCellKey: string;
  readonly launcherPath: string;
  readonly proposalSpoolPath: string;
  readonly contextSpoolPath: string;
  readonly catalogEvidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>;
  readonly delivery: Extract<TurnContextDelivery, { readonly status: 'delivered' | 'indeterminate' }>;
  readonly turn: AgentTurnResult;
}): never {
  if (input.turn.processEvidence === null) {
    throw new Error('Indeterminate integrity STOP requires complete process evidence.');
  }
  const contextSpool = spoolEvidence(input.contextSpoolPath);
  if (input.delivery.status === 'indeterminate' && contextSpool.recordCount !== 0) {
    throw new Error('Indeterminate delivery requires an empty correlated context spool.');
  }
  if (input.delivery.status === 'delivered' && contextSpool.recordCount === 0) {
    throw new Error('Delivered contradictory evidence requires a correlated context spool record.');
  }
  const proposalSpool = spoolEvidence(input.proposalSpoolPath);
  const artifact: D569DispatchIntegrityArtifact & Pick<AgentTurnResult, 'processEvidence' | 'partialResultEvidence'> = {
    version: 1,
    kind: 'dispatch_integrity_indeterminate',
    scheduledCellKey: input.scheduledCellKey,
    dispatchId: input.catalogEvidence.dispatchId,
    launcherSha256: sha256(readFileSync(input.launcherPath, 'utf8')),
    processEvidenceSha256: sha256(canonicalJson(input.turn.processEvidence)),
    processEvidence: input.turn.processEvidence,
    partialResultEvidence: input.turn.partialResultEvidence,
    catalogEvidence: input.catalogEvidence,
    delivery: input.delivery,
    contextSpool,
    proposalSpool: { ...proposalSpool, stagedUnconsumed: true },
    recordedAtUnixMs: Date.now(),
  };
  const temporaryPath = `${input.artifactPath}.tmp`;
  writeFileSync(temporaryPath, `${canonicalJson(artifact)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporaryPath, input.artifactPath);
  const artifactDescriptor = openSync(input.artifactPath, 'r');
  try { fsyncSync(artifactDescriptor); } finally { closeSync(artifactDescriptor); }
  const row = {
    rowContractVersion: 'arena-row-v3',
    outcome: 'integrity_indeterminate',
    passed: false,
    scheduledCellKey: input.scheduledCellKey,
    dispatchId: input.catalogEvidence.dispatchId,
    engineCatalogEvidence: input.catalogEvidence,
    turnContextDelivery: input.delivery,
    authorizedPlan: null,
    execution: null,
  } as const;
  appendFileSync(input.rowPath, `${JSON.stringify(row)}\n`, 'utf8');
  const descriptor = openSync(input.rowPath, 'r');
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
  throw new D569IntegrityStop(`Dispatch integrity is indeterminate for ${input.scheduledCellKey}.`);
}

function takeUiFeedback(path: string | null): EngineUiFeedback | null {
  if (path === null) return null;
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return null; }
  const entries = source.split('\n').filter((line) => line.trim().length > 0);
  if (entries.length > 1) throw new TypeError('UI feedback spool contains more than one report for a round.');
  const encoded = entries[0];
  if (encoded === undefined) return null;
  return engineUiFeedbackSchema.parse(JSON.parse(encoded) as unknown);
}

async function driveScriptedMcp(
  cwd: string,
  launcherPath: string,
  intelMode: IntelMode,
  submit: boolean,
  invalid: boolean,
  reactionGuidance: ReactionGuidanceDeclaration | null,
  suggestionResponse: SimulatedSuggestionResponse,
  adjustmentResponse: 'keep' | 'change' | 'invalid',
  signal?: AbortSignal,
  speculativeDelayMs = 0,
  inProcessToolSession?: AgentToolSession,
): Promise<{
  readonly calls: number;
  readonly rejections: readonly ConversationChainAttemptEvidence[];
  readonly contextTruncated: boolean;
}> {
  const manifest = JSON.parse(await readFile(launcherPath, 'utf8')) as EngineMcpLauncherManifest;
  const state = inProcessToolSession !== undefined &&
    'simulatedEncounterState' in inProcessToolSession
    ? structuredClone(inProcessToolSession.simulatedEncounterState as EncounterState)
    : await loadArenaFixture(manifest.fixturePath);
  const client = inProcessToolSession === undefined ? startMcpClient(cwd, launcherPath) : null;
  const abortClient = (): void => { client?.child.kill('SIGTERM'); };
  if (client !== null && signal?.aborted === true) abortClient();
  else if (client !== null) signal?.addEventListener('abort', abortClient, { once: true });
  const requestMcp = (method: string, params: unknown): Promise<unknown> => {
    if (client !== null) return mcpRequest(client, method, params);
    if (inProcessToolSession === undefined) throw new Error('In-process MCP dispatch omitted its tool session.');
    if (method === 'server/discover') return Promise.resolve({});
    if (method === 'tools/list') return Promise.resolve({ tools: inProcessToolSession.tools });
    if (method === 'resources/read' && manifest.phase === 'speculative') {
      const stateRef = 'stateRef' in inProcessToolSession
        ? asRecord(inProcessToolSession.stateRef)
        : null;
      if (stateRef === null) throw new Error('In-process speculative dispatch omitted its state_ref.');
      return Promise.resolve({ contents: [{ text: JSON.stringify({ state_ref: stateRef }) }] });
    }
    if (method === 'tools/call') {
      const call = requiredRecord(params, 'in-process tools/call parameters');
      const name = call['name'];
      if (typeof name !== 'string') throw new TypeError('In-process tools/call omitted its name.');
      return Promise.resolve({
        isError: false,
        structuredContent: inProcessToolSession.execute(name, call['arguments']),
      });
    }
    throw new Error(`In-process SIMULATED MCP does not implement ${method}.`);
  };
  let calls = 0;
  try {
    await requestMcp('server/discover', {});
    const listedTools = asRecord(await requestMcp('tools/list', {}))?.['tools'];
    if (manifest.kbReadSpoolPath !== undefined &&
      (!Array.isArray(listedTools) || !listedTools.some((tool) =>
        asRecord(tool)?.['name'] === 'engine.read_kb_subject'))) {
      throw new Error('Launcher-owned KB subject tool is not advertised.');
    }
    if (manifest.dmMode === 'blind') {
      const resources = asRecord(await requestMcp('resources/list', {}));
      await requestMcp('resources/templates/list', {});
      const prompts = asRecord(await requestMcp('prompts/list', {}));
      for (const resource of Array.isArray(resources?.['resources']) ? resources['resources'] : []) {
        const uri = asRecord(resource)?.['uri'];
        if (typeof uri === 'string') await requestMcp('resources/read', { uri });
      }
      for (const prompt of Array.isArray(prompts?.['prompts']) ? prompts['prompts'] : []) {
        const name = asRecord(prompt)?.['name'];
        if (name === 'engine.plan_blind_round') {
          await requestMcp('prompts/get', {
            name,
            arguments: { run_id: manifest.runId, expected_revision: manifest.revision },
          });
        } else if (name === 'engine.repair_blind_intents' && manifest.phase === 'correction') {
          await requestMcp('prompts/get', {
            name,
            arguments: {
              run_id: manifest.runId,
              expected_revision: manifest.revision,
              request_id: manifest.requestId,
            },
          });
        }
      }
    }
    if (manifest.phase === 'speculative') {
      await abortableDelay(speculativeDelayMs, signal ?? new AbortController().signal);
      const speculative = manifest.speculativeRequest;
      const actors = manifest.requestedActorIds;
      if (speculative === undefined || actors === undefined) {
        throw new Error('SIMULATED speculative launcher omitted its bounded request.');
      }
      const resource = asRecord(await requestMcp('resources/read', {
        uri: `engine://run/${encodeURIComponent(manifest.runId)}/revision/${String(manifest.revision)}/turn`,
      }));
      const contents = resource?.['contents'];
      const firstContent = Array.isArray(contents) ? asRecord(contents[0]) : null;
      const revision = firstContent === null ? null : asRecord(
        JSON.parse(String(firstContent['text'])) as unknown,
      );
      const stateRef = asRecord(revision?.['state_ref']);
      if (stateRef === null) throw new Error('Speculative revision resource omitted state_ref.');
      const proposals = actors.map((actorId) =>
        externalProposal(engineDefaultPlanEntry(state, actorId, manifest.revision).proposal));
      const result = asRecord(await requestMcp('tools/call', {
        name: 'engine.submit_speculative_round_plan',
        arguments: {
          state_ref: stateRef,
          request_id: manifest.requestId,
          target_room: speculative.targetRoom,
          target_monster_round: speculative.targetMonsterRound,
          refresh_generation: speculative.refreshGeneration,
          branches: speculative.scenarios.map((scenario) => ({
            scenario_id: scenario.scenarioId,
            proposals,
          })),
          idempotency_key: `SIMULATED-${manifest.requestId}`.slice(0, 200),
        },
      }));
      calls += 1;
      if (result === null || result['isError'] !== false) {
        throw new Error('engine.submit_speculative_round_plan failed in the SIMULATED client.');
      }
      return { calls, rejections: rejectionEvidence(result), contextTruncated: false };
    }
    const contextResult = asRecord(await requestMcp('tools/call', {
      name: 'engine.get_turn_context',
      arguments: profiledTurnContextArguments({
        runId: manifest.runId,
        expectedRevision: manifest.revision,
        intelMode,
        blind: manifest.dmMode === 'blind',
        ...(manifest.turnContextDeltaBase === undefined
          ? {} : { baseRevision: manifest.turnContextDeltaBase.revision }),
      }),
    }));
    calls += 1;
    if (contextResult === null || contextResult['isError'] !== false || !submit) {
      return {
        calls,
        rejections: rejectionEvidence(contextResult),
        contextTruncated: eventContextTrimmed(contextResult),
      };
    }
    const wireContext = asRecord(contextResult['structuredContent']);
    if (wireContext === null) throw new Error('engine.get_turn_context omitted structured content.');
    const changes = wireContext['changes'];
    const context = wireContext['granularity'] !== 'turn_delta'
      ? wireContext
      : manifest.turnContextDeltaBase === undefined || !Array.isArray(changes)
        ? null
        : applyRevisionDelta(
            manifest.turnContextDeltaBase.context,
            changes as readonly RevisionDeltaOperation[],
          );
    if (context === null) throw new Error('engine.get_turn_context delta could not be reconstructed.');
    const stateRef = asRecord(context['state_ref']);
    if (stateRef === null) throw new Error('engine.get_turn_context omitted state_ref.');
    if (manifest.dmMode === 'blind') {
      if (!submit) {
        return {
          calls,
          rejections: [],
          contextTruncated: false,
        };
      }
      const request = asRecord(context['request']);
      const requiredActors = request?.['required_actors'];
      if (!Array.isArray(requiredActors)) {
        throw new Error('Blind context omitted required actor display identities.');
      }
      const envelope = {
        intent_version: BLIND_INTENT_VERSION,
        intents: requiredActors.map((actor) => ({
          actor: requiredRecord(actor, 'blind required actor'),
          action: { kind: 'dodge' as const },
          destination: { kind: 'relative' as const, relation: 'hold' as const },
          reason: 'Maintain a defensive posture.',
        })),
      };
      const attempts: unknown[] = invalid ? [{
        intent_version: BLIND_INTENT_VERSION,
        intents: requiredActors.map((actor) => ({
          actor: requiredRecord(actor, 'blind required actor'),
          action: { kind: 'help' as const },
          reason: 'Support an ally.',
        })),
      }, envelope] : [envelope];
      let finalResult: Readonly<Record<string, unknown>> | null = null;
      for (const attempted of attempts.slice(0, manifest.blindMaxAttempts ?? BLIND_MAX_ATTEMPTS_DEFAULT)) {
        const result = asRecord(await requestMcp('tools/call', {
          name: 'engine.submit_blind_round_intents',
          arguments: attempted,
        }));
        calls += 1;
        finalResult = asRecord(result?.['structuredContent']);
        if (finalResult?.['status'] === 'accepted') break;
      }
      return {
        calls,
        rejections: [],
        contextTruncated: false,
      };
    }
    if (manifest.requestKind === 'plan_adjustment') {
      const actorId = manifest.requestedActorIds?.[0];
      const invalidAdjustment = manifest.phase === 'initial' && adjustmentResponse === 'invalid';
      const updates = manifest.phase === 'initial' && adjustmentResponse === 'keep'
        ? []
        : actorId === undefined
          ? []
          : (() => {
              const proposal = engineDefaultPlanEntry(state, actorId, manifest.revision).proposal;
              const fallback = availableEngineActorOptions(
                projectFutureMonsterTurns(state, [actorId]),
                actorId,
                canonicalEngineQueryPort,
                manifest.revision,
              ).find((option) => option.optionId !== proposal.primaryOptionId);
              if (manifest.phase === 'initial' && fallback === undefined) {
                throw new Error(`SIMULATED adjustment has no independent fallback for ${actorId}.`);
              }
              return [externalProposal({
                ...proposal,
                fallbackOptionId: manifest.phase === 'correction'
                  ? null
                  : invalidAdjustment
                    ? 'SIMULATED-unavailable-adjustment-fallback' as EngineTurnProposal['fallbackOptionId']
                    : fallback?.optionId ?? null,
                ...(invalidAdjustment ? {
                  primaryOptionId: 'SIMULATED-unavailable-adjustment' as EngineTurnProposal['primaryOptionId'],
                } : {}),
              })];
            })();
      const submitResult = asRecord(await requestMcp('tools/call', {
        name: 'engine.submit_plan_adjustment',
        arguments: {
          state_ref: stateRef,
          request_id: manifest.requestId,
          phase: manifest.phase,
          idempotency_key: `SIMULATED-${manifest.requestId}-${manifest.phase}`.slice(0, 200),
          baseline_plan_hash: manifest.planAdjustment?.baselinePlanHash,
          updates,
        },
      }));
      calls += 1;
      if (submitResult === null || submitResult['isError'] !== false) {
        throw new Error('engine.submit_plan_adjustment failed in the SIMULATED client.');
      }
      return {
        calls,
        rejections: rejectionEvidence(submitResult),
        contextTruncated: eventContextTrimmed(contextResult),
      };
    }
    const suggestion = asRecord(context['suggested_plan']);
    const suggestedProposals = suggestion?.['proposals'];
    const advertisedPlays = context['applicable_plays'];
    const firstAdvertisedPlay = Array.isArray(advertisedPlays)
      ? asRecord(advertisedPlays[0])
      : null;
    const contextualPlayToken = suggestion?.['play_token'] ?? firstAdvertisedPlay?.['play_token'];
    let frontierProposals: readonly unknown[] | undefined;
    if ((suggestionResponse === 'as_is' || suggestionResponse === 'edited') &&
      !Array.isArray(suggestedProposals)) {
      const advertised = context['applicable_plays'];
      const firstPlay = Array.isArray(advertised) ? asRecord(advertised[0]) : null;
      const playName = firstPlay?.['name'];
      if (typeof playName === 'string') {
        const expansionResult = asRecord(await requestMcp('tools/call', {
          name: 'engine.propose_from_play',
          arguments: { play_name: playName },
        }));
        calls += 1;
        if (expansionResult === null || expansionResult['isError'] !== false) {
          throw new Error('engine.propose_from_play failed for the chosen team-frontier play.');
        }
        const expansion = asRecord(expansionResult['structuredContent']);
        if (Array.isArray(expansion?.['proposals'])) frontierProposals = expansion['proposals'];
      }
    }
    const enginePlanProposals = Array.isArray(suggestedProposals)
      ? suggestedProposals
      : frontierProposals;
    const useEnginePlan = (suggestionResponse === 'as_is' || suggestionResponse === 'edited') &&
      Array.isArray(enginePlanProposals);
    const proposals = useEnginePlan
      ? structuredClone(enginePlanProposals) as readonly Readonly<Record<string, unknown>>[]
      : suggestionResponse === 'ignored'
        ? intentionallyIgnoredProposals(
            state,
            manifest.phase,
            typeof contextualPlayToken === 'string'
              ? enginePlayToken(contextualPlayToken)
              : enginePlayToken('SIMULATED-unissued-play-token'),
            manifest.revision,
          ).map(externalProposal)
        : scriptedProposals(state, manifest.phase, manifest.revision).map(externalProposal);
    const responseProposals = suggestionResponse !== 'edited' || !useEnginePlan
      ? proposals
      : proposals.map((proposal, index) => index !== 0 ? proposal : {
          ...proposal,
          override_justification: {
            kind: 'engine_play',
            token: typeof suggestion?.['play_token'] === 'string'
              ? suggestion['play_token']
              : 'SIMULATED-unissued-play-token',
          },
        });
    const submittedProposals = invalid ? responseProposals.map((proposal) => ({
      ...proposal,
      primary_option_id: 'SIMULATED-unavailable-option',
      fallback_option_id: manifest.phase === 'correction' ? null : 'SIMULATED-unavailable-fallback',
    })) : responseProposals;
    const submitResult = asRecord(await requestMcp('tools/call', {
      name: 'engine.submit_round_proposals',
      arguments: {
        proposals: submittedProposals,
        ...(reactionGuidance === null ? {} : { reaction_guidance: externalReactionGuidance(reactionGuidance) }),
      },
    }));
    calls += 1;
    if (submitResult === null || submitResult['isError'] !== false) {
      throw new Error('engine.submit_round_proposals failed in the SIMULATED client.');
    }
    const submitted = asRecord(submitResult['structuredContent']);
    if (manifest.boardImage !== undefined && submitted?.['status'] === 'proposed') {
      const feedbackResult = asRecord(await requestMcp('tools/call', {
        name: 'engine.submit_ui_feedback',
        arguments: {
          readability: 4,
          what_helped: ['The board picture made positions and nearby obstacles easy to compare.'],
          what_confused: [],
          missing: [],
          suggestion: 'Keep the board picture aligned with the same round context.',
        },
      }));
      calls += 1;
      if (feedbackResult === null || feedbackResult['isError'] !== false ||
        asRecord(feedbackResult['structuredContent'])?.['status'] !== 'recorded') {
        throw new Error('engine.submit_ui_feedback failed in the SIMULATED client.');
      }
    }
    return {
      calls,
      rejections: rejectionEvidence(submitResult),
      contextTruncated: eventContextTrimmed(contextResult),
    };
  } finally {
    if (client !== null) {
      signal?.removeEventListener('abort', abortClient);
      await stopMcpClient(client, signal?.aborted === true);
    }
  }
}

class SimulatedConversationAdapter implements AgentSessionAdapter {
  readonly kind: AgentAdapterKind;
  readonly callsByRequest = new Map<string, number>();
  readonly rejectionsByRequest = new Map<string, readonly ConversationChainAttemptEvidence[]>();
  readonly contextTruncatedByRequest = new Map<string, boolean>();
  readonly contextCallsByRequest = new Map<string, number>();
  readonly #exhaustInitial: ReadonlySet<string>;
  readonly #invalidInitial: ReadonlySet<string>;
  readonly #timeoutInitial: ReadonlySet<string>;
  readonly #stagedAdjustmentTimeout: ReadonlySet<string>;
  readonly #stagedAdjustmentCorrectionTimeout: ReadonlySet<string>;
  readonly #stagedSpeculationTimeout: boolean;
  readonly #failSpeculationRecalculation: boolean;
  readonly #failSpeculationInfrastructure: boolean;
  readonly #failCorrection: ReadonlySet<string>;
  readonly #remainingPrimaryFlaps: Map<string, number>;
  readonly #reactionGuidanceByRequest: Readonly<Record<string, ReactionGuidanceDeclaration>>;
  readonly #suggestionResponseByRequest: Readonly<Record<string, ConversationSuggestionAdoption>>;
  readonly #adjustmentResponseByRequest: Readonly<Record<string, 'keep' | 'change' | 'invalid'>>;
  readonly #speculativeDelayMs: number;
  readonly #inProcessDispatchDelayMs: number | null;
  #starts = 0;

  constructor(
    kind: ConversationCli,
    private readonly cwd: string,
    private readonly intelMode: IntelMode,
    exhaust: readonly string[],
    invalid: readonly string[],
    timeout: readonly string[],
    stagedAdjustmentTimeout: readonly string[],
    stagedAdjustmentCorrectionTimeout: readonly string[],
    stagedSpeculationTimeout: boolean,
    failSpeculationRecalculation: boolean,
    failSpeculationInfrastructure: boolean,
    fail: readonly string[],
    primaryFlaps: Readonly<Record<string, number>>,
    reactionGuidanceByRequest: Readonly<Record<string, ReactionGuidanceDeclaration>>,
    suggestionResponseByRequest: Readonly<Record<string, ConversationSuggestionAdoption>>,
    adjustmentResponseByRequest: Readonly<Record<string, 'keep' | 'change' | 'invalid'>>,
    speculativeDelayMs: number,
    inProcessDispatchDelayMs: number | null,
  ) {
    this.kind = kind;
    this.#exhaustInitial = new Set(exhaust);
    this.#invalidInitial = new Set(invalid);
    this.#timeoutInitial = new Set(timeout);
    this.#stagedAdjustmentTimeout = new Set(stagedAdjustmentTimeout);
    this.#stagedAdjustmentCorrectionTimeout = new Set(stagedAdjustmentCorrectionTimeout);
    this.#stagedSpeculationTimeout = stagedSpeculationTimeout;
    this.#failSpeculationRecalculation = failSpeculationRecalculation;
    this.#failSpeculationInfrastructure = failSpeculationInfrastructure;
    this.#failCorrection = new Set(fail);
    this.#remainingPrimaryFlaps = new Map(Object.entries(primaryFlaps));
    this.#reactionGuidanceByRequest = reactionGuidanceByRequest;
    this.#suggestionResponseByRequest = suggestionResponseByRequest;
    this.#adjustmentResponseByRequest = adjustmentResponseByRequest;
    this.#speculativeDelayMs = speculativeDelayMs;
    this.#inProcessDispatchDelayMs = inProcessDispatchDelayMs;
  }

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
    this.#starts += 1;
    const manifest = JSON.parse(await readFile(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    const modeSuffix = manifest.dmMode === undefined ? '' : `:${manifest.dmMode}`;
    const sessionId = this.#starts === 1
      ? `agent-session:SIMULATED:${invocation.runId}${modeSuffix}`
      : `agent-session:SIMULATED:${invocation.runId}${modeSuffix}:fresh-${String(this.#starts)}`;
    return this.#dispatch(sessionId, invocation, false, signal);
  }

  async resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    return this.#dispatch(
      binding.sessionId,
      invocation,
      invocation.prompt.startsWith('[ROOM_TRANSITION]'),
      signal,
    );
  }

  async #dispatch(
    sessionId: string,
    invocation: AgentInvocation,
    roomTransition: boolean,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    const manifest = JSON.parse(await readFile(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    const key = manifest.requestId.replace(/^request:/u, '');
    if (invocation.callPhase === 'speculation' && this.#failSpeculationInfrastructure) {
      await Promise.resolve();
      if (manifest.dispatchId === undefined) throw new Error('Speculation launcher omitted dispatch id.');
      return {
        resumeSessionId: null, sessionId: null, finalText: '', usage: null,
        exit: 'infrastructure_failed', failureReason: 'SIMULATED speculative engine startup failure',
        component: 'engine_mcp_startup', processEvidence: null,
        engineCatalogEvidence: {
          status: 'absent', basis: 'required_engine_initialization_failed', dispatchId: manifest.dispatchId,
          corroboration: ['SIMULATED speculative engine startup failure'],
        },
        partialResultEvidence: {
          status: 'partial', decodedEventCount: 0, finalTextFragment: '', observedUsage: null,
          stagedInvocationIds: [],
        },
      };
    }
    if (invocation.callPhase === 'speculation_recalculation' && this.#failSpeculationRecalculation) {
      await driveScriptedMcp(
        this.cwd, invocation.launcherToken, this.intelMode, true, false, null,
        'legacy', 'keep', signal, 0, invocation.toolSession,
      );
      await abortableDelay(this.#inProcessDispatchDelayMs ?? 0, signal);
      if (manifest.dispatchId === undefined) throw new Error('Recalculation launcher omitted dispatch id.');
      return {
        resumeSessionId: agentSessionId(sessionId), sessionId: null, finalText: '', usage: null,
        exit: 'infrastructure_failed', failureReason: 'SIMULATED recalculation engine startup failure',
        component: 'engine_mcp_startup',
        processEvidence: null,
        engineCatalogEvidence: {
          status: 'absent', basis: 'required_engine_initialization_failed', dispatchId: manifest.dispatchId,
          corroboration: ['SIMULATED recalculation engine startup failure'],
        },
        partialResultEvidence: {
          status: 'partial', decodedEventCount: 0, finalTextFragment: '', observedUsage: null,
          stagedInvocationIds: ['SIMULATED-recalculation-staged-before-failure'],
        },
      };
    }
    if (!roomTransition && manifest.phase === 'initial' && this.#timeoutInitial.has(key)) {
      return cancelledSimulated(sessionId, manifest);
    }
    if (manifest.requestKind === 'plan_adjustment' && manifest.phase === 'initial' &&
      this.#stagedAdjustmentTimeout.has(key)) {
      await driveScriptedMcp(
        this.cwd, invocation.launcherToken, this.intelMode, true, false, null,
        'legacy', this.#adjustmentResponseByRequest[key] ?? 'keep', signal, 0, invocation.toolSession,
      );
      await abortableDelay(this.#inProcessDispatchDelayMs ?? 0, signal);
      return timedOutSimulated(sessionId, manifest);
    }
    if (manifest.requestKind === 'plan_adjustment' && manifest.phase === 'correction' &&
      this.#stagedAdjustmentCorrectionTimeout.has(key)) {
      await driveScriptedMcp(
        this.cwd, invocation.launcherToken, this.intelMode, true, false, null,
        'legacy', 'change', signal, 0, invocation.toolSession,
      );
      await abortableDelay(this.#inProcessDispatchDelayMs ?? 0, signal);
      return timedOutSimulated(sessionId, manifest);
    }
    if (manifest.phase === 'speculative' && this.#stagedSpeculationTimeout) {
      await driveScriptedMcp(
        this.cwd, invocation.launcherToken, this.intelMode, true, false, null,
        'legacy', 'keep', signal, 0, invocation.toolSession,
      );
      return timedOutSimulated(sessionId, manifest);
    }
    if (invocation.output.kind === 'structured_final') {
      const finalText = !roomTransition && manifest.phase === 'initial' && this.#exhaustInitial.has(key)
        ? ''
        : !roomTransition && manifest.phase === 'correction' && this.#failCorrection.has(key)
          ? ''
          : simulatedIndexedFinalDecision(
              invocation.prompt,
              structuredFinalDecisionPhase(manifest.phase),
            );
      return completedSimulated(sessionId, finalText, manifest);
    }
    const remainingFlaps = this.#remainingPrimaryFlaps.get(key) ?? 0;
    if (!roomTransition && manifest.phase === 'initial' && remainingFlaps > 0) {
      this.#remainingPrimaryFlaps.set(key, remainingFlaps - 1);
      return completedSimulated(sessionId, undefined, manifest);
    }
    const submit = !roomTransition && !(manifest.phase === 'initial'
      ? this.#exhaustInitial.has(key) : this.#failCorrection.has(key));
    await abortableDelay(this.#inProcessDispatchDelayMs ?? 0, signal);
    const driven = await driveScriptedMcp(
      this.cwd,
      invocation.launcherToken,
      this.intelMode,
      submit,
      manifest.phase === 'initial' && this.#invalidInitial.has(key),
      manifest.phase === 'initial' ? this.#reactionGuidanceByRequest[key] ?? null : null,
      manifest.phase === 'initial' ? this.#suggestionResponseByRequest[key] ?? 'legacy' : 'legacy',
      this.#adjustmentResponseByRequest[key] ?? 'keep',
      signal,
      manifest.phase === 'speculative' ? this.#speculativeDelayMs : 0,
      this.#inProcessDispatchDelayMs === null ? undefined : invocation.toolSession,
    );
    this.callsByRequest.set(manifest.requestId, (this.callsByRequest.get(manifest.requestId) ?? 0) + driven.calls);
    this.contextCallsByRequest.set(
      manifest.requestId,
      (this.contextCallsByRequest.get(manifest.requestId) ?? 0) + 1,
    );
    if (driven.rejections.length > 0) {
      this.rejectionsByRequest.set(manifest.requestId, driven.rejections);
    }
    if (driven.contextTruncated) this.contextTruncatedByRequest.set(manifest.requestId, true);
    return completedSimulated(sessionId, undefined, manifest);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }
}

class ModelCallBookkeepingAdapter implements AgentSessionAdapter {
  readonly kind: AgentAdapterKind;
  #modelCalls = 0;

  constructor(private readonly inner: AgentSessionAdapter) {
    this.kind = inner.kind;
  }

  get modelCalls(): number { return this.#modelCalls; }

  probe() { return this.inner.probe(); }

  start(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
    this.#modelCalls += 1;
    return this.inner.start(invocation, signal);
  }

  resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    this.#modelCalls += 1;
    return this.inner.resume(binding, invocation, signal);
  }

  classifyFailure(error: unknown): AgentFailureClassification {
    return this.inner.classifyFailure(error);
  }
}

function simulatedIndexedFinalDecision(prompt: string, phase: DecisionPhase): string {
  const marker = '[DECISION_CATALOG]\n';
  const index = prompt.lastIndexOf(marker);
  if (index < 0) throw new Error('SIMULATED final-index dispatch received no decision catalog.');
  const catalog = requiredRecord(JSON.parse(prompt.slice(index + marker.length)) as unknown, 'decision catalog');
  const digest = catalog['catalogDigest'];
  const actors = catalog['actors'];
  if (typeof digest !== 'string' || !Array.isArray(actors)) {
    throw new Error('SIMULATED final-index dispatch received a malformed decision catalog.');
  }
  const proposals: Record<string, unknown> = {};
  for (const actorValue of actors) {
      const actor = requiredRecord(actorValue, 'decision catalog actor');
      const options = actor['options'];
      const actorId = actor['actorId'];
      if (typeof actorId !== 'string') {
        throw new Error('SIMULATED final-index dispatch received an actor without an id.');
      }
      if (!Array.isArray(options) || options.length < (phase === 'initial' ? 2 : 1)) {
        throw new Error('SIMULATED final-index dispatch requires the catalogued fallback option.');
      }
      proposals[actorId] = {
        primaryOptionIndex: 0,
        fallbackOptionIndex: phase === 'correction' ? null : 1,
        override: null,
        reason: 'The engine recommendation preserves the current tactical objective.',
      };
  }
  return JSON.stringify({
    catalogDigest: digest,
    reaction_guidance: { inherit: true },
    proposals,
    rationale: null,
  });
}

export function structuredFinalDecisionPhase(
  phase: EngineMcpLauncherManifest['phase'],
): DecisionPhase {
  switch (phase) {
    case 'initial':
    case 'correction':
      return phase;
    case 'speculative':
      throw new TypeError('Structured-final decisions are unavailable for speculative dispatch.');
  }
  phase satisfies never;
  throw new Error('Unknown structured-final decision phase.');
}

function completedSimulated(
  value: string,
  finalText = 'SIMULATED — proposal delivered through engine MCP spool',
  manifest?: EngineMcpLauncherManifest,
): AgentTurnResult {
  return {
    resumeSessionId: agentSessionId(value),
    sessionId: null,
    finalText,
    usage: null,
    exit: 'completed',
    processEvidence: null,
    engineCatalogEvidence: manifest?.dispatchId === undefined ? null : {
      status: 'ready', basis: 'required_cli_completed_with_valid_catalog',
      dispatchId: manifest.dispatchId, advertisedInvocationCount: 0, resourceOperationCount: 0,
    },
    partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
  };
}

function cancelledSimulated(value: string, manifest?: EngineMcpLauncherManifest): AgentTurnResult {
  return {
    resumeSessionId: agentSessionId(value),
    sessionId: null,
    finalText: '',
    usage: null,
    exit: 'cancelled',
    cancellationReason: 'SIMULATED cancellation',
    processEvidence: null,
    engineCatalogEvidence: manifest?.dispatchId === undefined ? null : {
      status: 'ready', basis: 'required_cli_completed_with_valid_catalog',
      dispatchId: manifest.dispatchId, advertisedInvocationCount: 0, resourceOperationCount: 0,
    },
    partialResultEvidence: {
      status: 'partial', decodedEventCount: 0, finalTextFragment: '', observedUsage: null,
      stagedInvocationIds: [],
    },
  };
}

function timedOutSimulated(value: string, manifest: EngineMcpLauncherManifest): AgentTurnResult {
  return {
    resumeSessionId: agentSessionId(value), sessionId: null, finalText: '', usage: null,
    exit: 'timed_out', timeoutMs: 1, processEvidence: null,
    engineCatalogEvidence: manifest.dispatchId === undefined ? null : {
      status: 'ready', basis: 'required_cli_completed_with_valid_catalog',
      dispatchId: manifest.dispatchId, advertisedInvocationCount: 0, resourceOperationCount: 0,
    },
    partialResultEvidence: {
      status: 'partial', decodedEventCount: 0, finalTextFragment: '', observedUsage: null,
      stagedInvocationIds: ['SIMULATED-staged-before-timeout'],
    },
  };
}

function agentDispatchWasCancelled(error: unknown): boolean {
  return error instanceof Error && /Agent (?:cold start|resume|recovery cold start|escalation cold start) was cancelled\.$/u
    .test(error.message);
}

async function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return;
  await new Promise<void>((resolvePromise, reject) => {
    const abort = (): void => {
      clearTimeout(timer);
      reject(new Error('SPECULATION_ABORTED'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolvePromise();
    }, milliseconds);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

function isRoundProposal(value: unknown): value is RoundTurnProposalEnvelope {
  const input = asRecord(value);
  return input?.['kind'] === 'round_turn_proposal' &&
    typeof input['proposalId'] === 'string' && typeof input['runId'] === 'string' &&
    typeof input['branchId'] === 'string' && typeof input['requestId'] === 'string' &&
    typeof input['expectedRevision'] === 'number' && typeof input['stateDigest'] === 'string' &&
    typeof input['stateHandle'] === 'string' &&
    (input['phase'] === 'initial' || input['phase'] === 'correction') &&
    typeof input['idempotencyKey'] === 'string' && Array.isArray(input['resolutions']) &&
    (input['reactionGuidance'] === null || asRecord(input['reactionGuidance']) !== null);
}

function isPlanAdjustmentProposal(value: unknown): value is PlanAdjustmentProposalEnvelope {
  const input = asRecord(value);
  return input?.['kind'] === 'plan_adjustment_turn_proposal' &&
    typeof input['proposalId'] === 'string' && typeof input['runId'] === 'string' &&
    typeof input['branchId'] === 'string' && typeof input['requestId'] === 'string' &&
    typeof input['expectedRevision'] === 'number' && typeof input['stateDigest'] === 'string' &&
    typeof input['stateHandle'] === 'string' &&
    (input['phase'] === 'initial' || input['phase'] === 'correction') &&
    typeof input['idempotencyKey'] === 'string' &&
    typeof input['baseline_plan_hash'] === 'string' && Array.isArray(input['updates']);
}

function isSpeculativePlan(value: unknown): value is QueuedSpeculativePlanEnvelope {
  const input = asRecord(value);
  return input?.['kind'] === 'speculative_round_plan' &&
    input['status'] === 'QUEUED-SPECULATIVE' &&
    typeof input['speculativePlanId'] === 'string' &&
    typeof input['requestId'] === 'string' &&
    typeof input['sourceRevision'] === 'number' &&
    typeof input['sourceDigest'] === 'string' &&
    Array.isArray(input['actorIds']) && Array.isArray(input['branches']) &&
    Array.isArray(input['scenarios']);
}

function takeRoundProposal(path: string): RoundTurnProposalEnvelope | null {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return null; }
  const proposal = source.split('\n').filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line) as unknown).findLast(isRoundProposal) ?? null;
  return proposal === null ? null : structuredClone(proposal);
}

function takePlanAdjustmentProposal(path: string): PlanAdjustmentProposalEnvelope | null {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return null; }
  const proposal = source.split('\n').filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line) as unknown).findLast(isPlanAdjustmentProposal) ?? null;
  return proposal === null ? null : structuredClone(proposal);
}

function takeSpeculativePlan(path: string): QueuedSpeculativePlanEnvelope | null {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return null; }
  const plan = source.split('\n').filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line) as unknown).findLast(isSpeculativePlan) ?? null;
  return plan === null ? null : structuredClone(plan);
}

function takeBlindIntentSubmissions(path: string | null): readonly BlindIntentSubmissionRecord[] {
  if (path === null) return [];
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return []; }
  return source.split('\n').filter((line) => line.trim().length > 0).map((line) => {
    const value: unknown = JSON.parse(line);
    const candidate = requiredRecord(value, 'blind intent submission');
    if (!Number.isSafeInteger(candidate['attempt']) || typeof candidate['startedAtUnixMs'] !== 'number' ||
      typeof candidate['endedAtUnixMs'] !== 'number' || typeof candidate['resolverLatencyMs'] !== 'number') {
      throw new TypeError('Blind intent submission timing evidence is invalid.');
    }
    return candidate as unknown as BlindIntentSubmissionRecord;
  });
}

function takeBlindIngressRecords(path: string | null): readonly BlindIngressRecord[] {
  if (path === null) return [];
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return []; }
  return source.split('\n').filter((line) => line.trim().length > 0).map((line, index) => {
    const value: unknown = JSON.parse(line);
    const candidate = requiredRecord(value, 'blind ingress record');
    if (candidate['ordinal'] !== index + 1 || typeof candidate['channel'] !== 'string' ||
      typeof candidate['text'] !== 'string' || typeof candidate['utf8Bytes'] !== 'number' ||
      typeof candidate['sha256'] !== 'string') {
      throw new TypeError('Blind ingress spool contains invalid evidence.');
    }
    return candidate as unknown as BlindIngressRecord;
  });
}

function appendBlindIngress(
  path: string | null,
  records: readonly { readonly channel: 'startup' | 'initial_prompt' | 'retry_prompt' | 'replay_history' | 'image_metadata'; readonly text: string }[],
): void {
  if (path === null || records.length === 0) return;
  const existing = takeBlindIngressRecords(path);
  const recorder = new BlindModelIngressRecorder(existing, (record) => {
    appendFileSync(path, `${JSON.stringify(record)}\n`, 'utf8');
  });
  for (const record of records) recorder.record(record.channel, record.text);
}

async function writeLauncher(input: {
  readonly directory: string;
  readonly name: string;
  readonly rendererProfile: RendererProfile;
  readonly turnContextMaximumBytes: number;
  readonly overridePolicy: OverridePolicy;
  readonly snapshot: EngineRoundSnapshot;
  readonly room: number;
  readonly historyKind: string;
  readonly turnContextDeltaBase?: TurnContextDeltaBase;
  readonly kbRead?: {
    readonly spoolPath: string;
    readonly subjectSources: KbSubjectSources;
  };
  readonly boardImage?: EngineMcpBoardImageBinding;
  readonly dmMode?: DmMode;
  readonly blindRepairArm?: BlindRepairArm;
  readonly blindMaxAttempts?: BlindMaxAttempts;
  readonly blindDeadlineUnixMs?: number;
  readonly blindFacts?: boolean;
  readonly blindVisuals?: readonly BlindVisualDescriptor[];
  readonly semanticBoardMaximumBytes?: number;
  readonly dispatchPhase?: import('../src/vtt/agent-session').EngineDispatchPhase;
}): Promise<{
  readonly manifestPath: string;
  readonly recoveryManifestPath: string;
  readonly spoolPath: string;
  readonly recoverySpoolPath: string;
  readonly turnContextSpoolPath: string;
  readonly recoveryTurnContextSpoolPath: string;
  readonly uiFeedbackSpoolPath: string | null;
  readonly recoveryUiFeedbackSpoolPath: string | null;
  readonly blindIntentSpoolPath: string | null;
  readonly recoveryBlindIntentSpoolPath: string | null;
  readonly blindIngressSpoolPath: string | null;
  readonly recoveryBlindIngressSpoolPath: string | null;
  readonly dispatchId: import('../src/vtt/agent-session').EngineDispatchId;
  readonly recoveryDispatchId: import('../src/vtt/agent-session').EngineDispatchId;
}> {
  const fixturePath = join(input.directory, `${input.name}-fixture.json`);
  const spoolPath = join(input.directory, `${input.name}-proposals.jsonl`);
  const recoverySpoolPath = join(input.directory, `${input.name}-recovery-proposals.jsonl`);
  const turnContextSpoolPath = join(input.directory, `${input.name}-turn-context.jsonl`);
  const recoveryTurnContextSpoolPath = join(input.directory, `${input.name}-recovery-turn-context.jsonl`);
  const manifestPath = join(input.directory, `${input.name}-launcher.json`);
  const recoveryManifestPath = join(input.directory, `${input.name}-launcher-full.json`);
  const blindIntentSpoolPath = input.dmMode === 'blind'
    ? join(input.directory, `${input.name}-blind-intents.jsonl`)
    : null;
  const recoveryBlindIntentSpoolPath = input.dmMode === 'blind'
    ? join(input.directory, `${input.name}-recovery-blind-intents.jsonl`)
    : null;
  const blindIngressSpoolPath = input.dmMode === 'blind'
    ? join(input.directory, `${input.name}-blind-ingress.jsonl`)
    : null;
  const recoveryBlindIngressSpoolPath = input.dmMode === 'blind'
    ? join(input.directory, `${input.name}-recovery-blind-ingress.jsonl`)
    : null;
  const uiFeedbackSpoolPath = input.boardImage === undefined
    ? null
    : engineMcpUiFeedbackSpoolPath(spoolPath);
  const recoveryUiFeedbackSpoolPath = input.boardImage === undefined
    ? null
    : engineMcpUiFeedbackSpoolPath(recoverySpoolPath);
  const readinessSpoolPath = join(input.directory, `${input.name}-engine-readiness.jsonl`);
  const recoveryReadinessSpoolPath = join(input.directory, `${input.name}-recovery-engine-readiness.jsonl`);
  await writeFile(fixturePath, input.snapshot.fixtureJson, 'utf8');
  await writeFile(spoolPath, '', 'utf8');
  await writeFile(recoverySpoolPath, '', 'utf8');
  await writeFile(turnContextSpoolPath, '', 'utf8');
  await writeFile(recoveryTurnContextSpoolPath, '', 'utf8');
  await writeFile(readinessSpoolPath, '', 'utf8');
  await writeFile(recoveryReadinessSpoolPath, '', 'utf8');
  if (blindIntentSpoolPath !== null) await writeFile(blindIntentSpoolPath, '', 'utf8');
  if (recoveryBlindIntentSpoolPath !== null) await writeFile(recoveryBlindIntentSpoolPath, '', 'utf8');
  if (blindIngressSpoolPath !== null) await writeFile(blindIngressSpoolPath, '', 'utf8');
  if (recoveryBlindIngressSpoolPath !== null) await writeFile(recoveryBlindIngressSpoolPath, '', 'utf8');
  if (uiFeedbackSpoolPath !== null) await writeFile(uiFeedbackSpoolPath, '', 'utf8');
  if (recoveryUiFeedbackSpoolPath !== null) await writeFile(recoveryUiFeedbackSpoolPath, '', 'utf8');
  const capsule = input.snapshot.capsule;
  const request = capsule.request;
  if (request === null) throw new Error('Conversation launcher requires a pending request.');
  const dispatchPhase = input.dispatchPhase ?? (request.phase === 'speculative'
    ? 'speculative' as const
    : request.phase === 'correction'
      ? 'correction' as const
      : request.kind === 'plan_adjustment' ? 'adjustment' as const : 'primary' as const);
  const dispatchId = engineDispatchId(`engine-dispatch:${randomUUID()}`);
  const manifest: EngineMcpLauncherManifest = {
    format: 'engine-mcp-launcher-v1', fixturePath, proposalSpoolPath: spoolPath,
    readinessSpoolPath, dispatchId, dispatchPhase,
    turnContextSpoolPath,
    ...(input.kbRead === undefined ? {} : {
      kbReadSpoolPath: input.kbRead.spoolPath,
      kbSubjectSources: input.kbRead.subjectSources,
    }),
    runId: capsule.runId, branchId: capsule.branchId,
    revision: capsule.revision, requestId: request.requestId,
    phase: request.phase, correctionNumber: request.correctionNumber,
    overridePolicy: input.overridePolicy,
    room: input.room, historyKind: input.historyKind,
    toolProfile: input.dmMode === 'blind' ? 'blind' : 'dm',
    ...(input.dmMode === undefined ? {} : { dmMode: input.dmMode }),
    ...(input.blindRepairArm === undefined ? {} : { blindRepairArm: input.blindRepairArm }),
    ...(input.blindMaxAttempts === undefined ? {} : { blindMaxAttempts: input.blindMaxAttempts }),
    ...(input.blindDeadlineUnixMs === undefined ? {} : { blindDeadlineUnixMs: input.blindDeadlineUnixMs }),
    ...(input.blindFacts === undefined ? {} : { blindFacts: input.blindFacts }),
    ...(input.blindVisuals === undefined ? {} : { blindVisuals: input.blindVisuals }),
    ...(blindIntentSpoolPath === null ? {} : { blindIntentSpoolPath }),
    ...(blindIngressSpoolPath === null ? {} : { blindIngressSpoolPath }),
    rendererProfile: input.rendererProfile,
    turnContextMaximumBytes: input.turnContextMaximumBytes,
    ...(input.semanticBoardMaximumBytes === undefined ? {} : {
      semanticBoardMaximumBytes: input.semanticBoardMaximumBytes,
    }),
    initiativeProjection: capsule.projection.initiative,
    ...(input.boardImage === undefined ? {} : { boardImage: input.boardImage }),
    ...(request.phase === 'speculative' ? {
      requestedActorIds: request.actors,
      speculativeRequest: {
        targetRoom: request.targetRoom,
        targetMonsterRound: request.targetMonsterRound,
        refreshGeneration: request.refreshGeneration,
        scenarioMenu: request.scenarioMenu,
        scenarios: request.scenarios,
      },
    } : request.kind === 'plan_adjustment' ? {
      requestKind: request.kind,
      requestedActorIds: request.actors,
      planAdjustment: {
      parentPlanId: request.parentPlanId,
      baselinePlanHash: request.baselinePlanHash,
      triggerPcTurnId: request.triggerPcTurnId,
      beforeRevision: request.beforeRevision,
      afterRevision: request.afterRevision,
      materialityReasonCodes: request.materialityReasonCodes,
      baselineProposalDigests: request.baselineProposalDigests,
      adjustmentBudget: request.adjustmentBudget,
      },
    } : {}),
    ...(input.turnContextDeltaBase === undefined ? {} : {
      turnContextDeltaBase: input.turnContextDeltaBase,
    }),
  };
  await writeFile(manifestPath, canonicalJson(manifest), 'utf8');
  const { turnContextDeltaBase: _turnContextDeltaBase, ...baseFullManifest } = manifest;
  const fullManifest: EngineMcpLauncherManifest = {
    ...baseFullManifest,
    proposalSpoolPath: recoverySpoolPath,
    turnContextSpoolPath: recoveryTurnContextSpoolPath,
    readinessSpoolPath: recoveryReadinessSpoolPath,
    dispatchId: engineDispatchId(`engine-dispatch:${randomUUID()}`),
    ...(recoveryBlindIntentSpoolPath === null ? {} : { blindIntentSpoolPath: recoveryBlindIntentSpoolPath }),
    ...(recoveryBlindIngressSpoolPath === null ? {} : { blindIngressSpoolPath: recoveryBlindIngressSpoolPath }),
  };
  await writeFile(recoveryManifestPath, canonicalJson(fullManifest), 'utf8');
  return {
    manifestPath, recoveryManifestPath, spoolPath, recoverySpoolPath,
    turnContextSpoolPath, recoveryTurnContextSpoolPath,
    uiFeedbackSpoolPath, recoveryUiFeedbackSpoolPath,
    blindIntentSpoolPath, recoveryBlindIntentSpoolPath,
    blindIngressSpoolPath, recoveryBlindIngressSpoolPath,
    dispatchId,
    recoveryDispatchId: fullManifest.dispatchId ?? (() => { throw new Error('Recovery dispatch ID is absent.'); })(),
  };
}

function dispatchSpools(
  launcher: Awaited<ReturnType<typeof writeLauncher>>,
  turn: AgentTurnResult,
) {
  const primaryHasRecords = spoolContainsRecords(launcher.spoolPath) ||
    spoolContainsRecords(launcher.turnContextSpoolPath);
  const recoveryHasRecords = spoolContainsRecords(launcher.recoverySpoolPath) ||
    spoolContainsRecords(launcher.recoveryTurnContextSpoolPath);
  const recovery = turn.engineCatalogEvidence?.dispatchId === launcher.recoveryDispatchId ||
    turn.engineCatalogEvidence === null && recoveryHasRecords && !primaryHasRecords;
  return recovery ? {
    proposal: launcher.recoverySpoolPath,
    context: launcher.recoveryTurnContextSpoolPath,
    uiFeedback: launcher.recoveryUiFeedbackSpoolPath,
    blindIntent: launcher.recoveryBlindIntentSpoolPath,
    blindIngress: launcher.recoveryBlindIngressSpoolPath,
  } : {
    proposal: launcher.spoolPath,
    context: launcher.turnContextSpoolPath,
    uiFeedback: launcher.uiFeedbackSpoolPath,
    blindIntent: launcher.blindIntentSpoolPath,
    blindIngress: launcher.blindIngressSpoolPath,
  };
}

function spoolContainsRecords(path: string): boolean {
  try {
    return readFileSync(path, 'utf8').split('\n').some((line) => line.trim().length > 0);
  } catch {
    return false;
  }
}

function enforceCompletedDispatchIntegrity(input: {
  readonly turn: AgentTurnResult;
  readonly launcher: Awaited<ReturnType<typeof writeLauncher>>;
  readonly spools: ReturnType<typeof dispatchSpools>;
  readonly maximumBytes: number;
  readonly artifactPath: string;
  readonly rowPath: string;
  readonly scheduledCellKey: string;
}): void {
  const catalogEvidence = input.turn.engineCatalogEvidence;
  if (catalogEvidence?.status !== 'inconclusive') return;
  const correlatedContext = takeCorrelatedTurnContext(
    input.spools.context,
    input.maximumBytes,
    catalogEvidence.dispatchId,
  );
  const delivery = classifyTurnContextDelivery({
    turn: input.turn,
    catalogEvidence,
    delivered: correlatedContext === null ? null : {
      contextSha256: sha256(correlatedContext.raw),
      measurement: deliveredTurnContextMeasurement(correlatedContext),
    },
  });
  const contradictoryStartup = input.turn.exit === 'infrastructure_failed';
  if (delivery.status !== 'indeterminate' && !contradictoryStartup) return;
  if (delivery.status !== 'indeterminate' && delivery.status !== 'delivered') {
    throw new Error('Contradictory startup evidence produced an unsupported delivery state.');
  }
  persistD569IntegrityStop({
    artifactPath: input.artifactPath,
    rowPath: input.rowPath,
    scheduledCellKey: input.scheduledCellKey,
    launcherPath: catalogEvidence.dispatchId === input.launcher.recoveryDispatchId
      ? input.launcher.recoveryManifestPath
      : input.launcher.manifestPath,
    proposalSpoolPath: input.spools.proposal,
    contextSpoolPath: input.spools.context,
    catalogEvidence,
    delivery,
    turn: input.turn,
  });
}

function classifyFailedDispatch(input: {
  readonly phase: NonNullable<ConversationRowBase['failingDispatch']>['phase'];
  readonly turn: AgentTurnResult;
  readonly contextSpoolPath: string;
  readonly maximumBytes: number;
}): NonNullable<ConversationRowBase['failingDispatch']> | null {
  if (input.turn.exit !== 'cancelled' && input.turn.exit !== 'infrastructure_failed') return null;
  const catalog = input.turn.engineCatalogEvidence;
  if (catalog === null) return null;
  const context = takeCorrelatedTurnContext(input.contextSpoolPath, input.maximumBytes, catalog.dispatchId);
  const delivery = classifyTurnContextDelivery({
    turn: input.turn,
    catalogEvidence: catalog,
    delivered: context === null ? null : {
      contextSha256: sha256(context.raw),
      measurement: deliveredTurnContextMeasurement(context),
    },
  });
  return {
    phase: input.phase,
    exit: input.turn.exit,
    dispatchId: catalog.dispatchId,
    engineCatalogEvidence: catalog,
    turnContextDelivery: delivery,
    failureReason: input.turn.exit === 'cancelled'
      ? input.turn.cancellationReason
      : input.turn.failureReason,
  };
}

class CellInfrastructureAbort extends Error {
  override readonly name = 'CellInfrastructureAbort' as const;
}

class CellSpeculationDispatchAbort extends Error {
  override readonly name = 'CellSpeculationDispatchAbort' as const;
}

function fullTurnContextBase(
  state: EncounterState,
  snapshot: EngineRoundSnapshot,
  intelMode: IntelMode,
  rendererProfile: RendererProfile,
  turnContextMaximumBytes: number,
): TurnContextDeltaBase {
  const capsule = snapshot.capsule;
  const request = capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error('Turn-context base requires an ordinary pending request.');
  }
  const runtime = createEngineMcpRuntime(state, {
    runId: capsule.runId,
    branchId: capsule.branchId,
    revision: capsule.revision,
    requestId: request.requestId,
    phase: request.phase,
    correctionNumber: request.correctionNumber,
    room: capsule.projection.room,
    ...(capsule.historyDelta[0] === undefined ? {} : {
      historyKind: capsule.historyDelta[0].kind,
    }),
    ...(request.kind === 'plan_adjustment' ? {
      requestKind: request.kind,
      requestedActorIds: request.actors,
      planAdjustment: {
      parentPlanId: request.parentPlanId,
      baselinePlanHash: request.baselinePlanHash,
      triggerPcTurnId: request.triggerPcTurnId,
      beforeRevision: request.beforeRevision,
      afterRevision: request.afterRevision,
      materialityReasonCodes: request.materialityReasonCodes,
      baselineProposalDigests: request.baselineProposalDigests,
      adjustmentBudget: request.adjustmentBudget,
      },
    } : { requestedActorCount: request.actors.length }),
    toolProfile: 'dm',
    rendererProfile,
    turnContextMaximumBytes,
    initiativeProjection: capsule.projection.initiative,
  });
  const response = runtime.handler.handle({
    jsonrpc: '2.0', id: 'turn-context-base', method: 'tools/call',
    params: {
      name: 'engine.get_turn_context',
      arguments: {
        run_id: capsule.runId, expected_revision: capsule.revision,
        scope: 'round', granularity: 'full', intel_mode: intelMode,
      },
      _meta: mcpRequestMeta({ name: 'ai-dm-conversation-base', version: '1.0.0' }),
    },
  });
  const responseRecord = asRecord(response);
  const result = asRecord(responseRecord?.['result']);
  const context = asRecord(result?.['structuredContent']);
  if (result?.['isError'] !== false || context === null || context['granularity'] !== 'full') {
    throw new Error('Could not compute the full turn-context delta base.');
  }
  return { revision: capsule.revision, context: structuredClone(context) };
}

function inProcessDmToolSession(input: {
  readonly state: EncounterState;
  readonly snapshot: EngineRoundSnapshot;
  readonly intelMode: IntelMode;
  readonly rendererProfile: RendererProfile;
  readonly turnContextMaximumBytes: number;
  readonly overridePolicy: OverridePolicy;
  readonly turnContextDeltaBase?: TurnContextDeltaBase;
  readonly onProposal: (proposal: RoundTurnProposalEnvelope | PlanAdjustmentProposalEnvelope) => void;
  readonly onToolResult: (name: string, result: unknown) => void;
  readonly onTurnContextRendered?: (evidence: NonNullable<CapturedTurnContext['rendering']>) => void;
  readonly kbReadBudget?: KbReadBudget;
  readonly kbReadCallPhase?: KbReadCallPhase;
}): AgentToolSession & { readonly simulatedEncounterState: EncounterState } {
  const capsule = input.snapshot.capsule;
  const request = capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error('Local OpenAI tool session requires an ordinary pending request.');
  }
  const runtime = createEngineMcpRuntime(input.state, {
    runId: capsule.runId,
    branchId: capsule.branchId,
    revision: capsule.revision,
    requestId: request.requestId,
    phase: request.phase,
    correctionNumber: request.correctionNumber,
    room: capsule.projection.room,
    ...(capsule.historyDelta[0] === undefined ? {} : {
      historyKind: capsule.historyDelta[0].kind,
    }),
    ...(request.kind === 'plan_adjustment' ? {
      requestKind: request.kind,
      requestedActorIds: request.actors,
      planAdjustment: {
      parentPlanId: request.parentPlanId,
      baselinePlanHash: request.baselinePlanHash,
      triggerPcTurnId: request.triggerPcTurnId,
      beforeRevision: request.beforeRevision,
      afterRevision: request.afterRevision,
      materialityReasonCodes: request.materialityReasonCodes,
      baselineProposalDigests: request.baselineProposalDigests,
      adjustmentBudget: request.adjustmentBudget,
      },
    } : { requestedActorCount: request.actors.length }),
    toolProfile: 'dm',
    rendererProfile: input.rendererProfile,
    turnContextMaximumBytes: input.turnContextMaximumBytes,
    overridePolicy: input.overridePolicy,
    ...(input.onTurnContextRendered === undefined ? {} : {
      onTurnContextRendered: input.onTurnContextRendered,
    }),
    initiativeProjection: capsule.projection.initiative,
    ...(input.turnContextDeltaBase === undefined ? {} : {
      turnContextDeltaBase: input.turnContextDeltaBase,
    }),
    ...(input.kbReadBudget === undefined ? {} : { kbReadBudget: input.kbReadBudget }),
    ...(input.kbReadCallPhase === undefined ? {} : { kbReadCallPhase: input.kbReadCallPhase }),
    onProposal: (proposal) => {
      if (isRoundProposal(proposal) || isPlanAdjustmentProposal(proposal)) {
        input.onProposal(structuredClone(proposal));
      }
    },
  });
  return {
    simulatedEncounterState: structuredClone(input.state),
    tools: runtime.toolSurface.tools,
    execute(name, argumentsValue) {
      try {
        const result = runtime.toolSurface.execute(name, name === 'engine.get_turn_context'
          ? { ...requiredRecord(argumentsValue, 'engine.get_turn_context arguments'), intel_mode: input.intelMode }
          : argumentsValue);
        input.onToolResult(name, result);
        return result;
      } catch (error) {
        input.onToolResult(name, { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },
  };
}

function decisionCatalogForSnapshot(
  state: EncounterState,
  snapshot: EngineRoundSnapshot,
): DecisionCatalog {
  const request = snapshot.capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error('Structured final decisions require an ordinary pending request.');
  }
  const planningState = projectFutureMonsterTurns(state, request.actors);
  return createDecisionCatalog({
    requestId: request.requestId,
    phase: request.phase,
    expectedRevision: snapshot.capsule.revision,
    stateDigest: snapshot.capsule.digest,
    actors: request.actors.map((actorId) => {
      const registry = availableEngineActorOptions(
        planningState, actorId, canonicalEngineQueryPort, snapshot.capsule.revision,
      );
      const report = actorOpportunityReport(
        planningState, actorId, canonicalEngineQueryPort, snapshot.capsule.revision,
      );
      const defaultOption = report.defaultOption;
      const frontierIds = new Set(registry.filter((option) => {
        const verdict = submissionDominance(report, option.optionId).status;
        return verdict === 'not_dominated' || verdict === 'not_dominated_tradeoff';
      }).map((option) => option.optionId));
      const ordered = [
        defaultOption,
        ...registry.filter((option) => option.optionId !== defaultOption.optionId && frontierIds.has(option.optionId)),
        ...registry.filter((option) => option.optionId !== defaultOption.optionId && !frontierIds.has(option.optionId)),
      ];
      return {
        actorId,
        options: ordered.map((option) => ({ optionId: option.optionId, label: option.label })),
      };
    }),
  });
}

function structuredFinalPrompt(context: CapturedTurnContext, catalog: DecisionCatalog): string {
  return [
    'Return only the schema-constrained indexed decision. Do not call engine tools.',
    '[TURN_CONTEXT]',
    context.raw,
    '[DECISION_CATALOG]',
    JSON.stringify(renderDecisionCatalog(catalog)),
  ].join('\n');
}

async function structuredFinalOutput(
  transport: DecisionTransport,
  directory: string,
  name: string,
  catalog: DecisionCatalog,
): Promise<AgentInvocationOutput> {
  switch (transport) {
    case 'mcp_minimal': return { kind: 'tool_driven' };
    case 'final_indices': {
      const schemaPath = join(directory, `${name}-final-indices-schema.json`);
      const schema = finalIndicesDecisionSchema(catalog);
      await writeFile(schemaPath, canonicalJson(schema), 'utf8');
      return {
        kind: 'structured_final', schemaPath, decisionEncoding: 'indices', engineTools: 'disabled',
      };
    }
    case 'final_ids':
      throw new TypeError('Decision transport final_ids is intentionally unimplemented.');
  }
  transport satisfies never;
  throw new Error('Unknown decision transport.');
}

type StructuredFinalRejectionCode =
  | 'decision_missing'
  | 'decision_invalid'
  | 'decision_timeout'
  | 'engine_rejected'
  | 'REASON_REQUIRED';

type StructuredFinalQueueResult =
  | {
      readonly kind: 'accepted';
      readonly proposal: RoundTurnProposalEnvelope | PlanAdjustmentProposalEnvelope;
      readonly decision: BoundRoundDecision;
    }
  | {
      readonly kind: 'rejected';
      readonly code: StructuredFinalRejectionCode;
      readonly normalizationCode: DecisionNormalizationRejectionCode | null;
      readonly engineResult: unknown | null;
    };

const STRUCTURED_FINAL_DECISION_REASON_GATE: StructuredFinalDecisionReasonGate = {
  validate: (_actorId, reason) => decisionReasonProblem(reason) === null
    ? { kind: 'accepted' }
    : { kind: 'rejected', code: 'REASON_REQUIRED' },
};

function queueStructuredFinalDecision(input: {
  readonly finalText: string;
  readonly exit: AgentTurnResult['exit'];
  readonly catalog: DecisionCatalog;
  readonly state: EncounterState;
  readonly snapshot: EngineRoundSnapshot;
  readonly intelMode: IntelMode;
  readonly rendererProfile: RendererProfile;
  readonly turnContextMaximumBytes: number;
  readonly overridePolicy: OverridePolicy;
  readonly turnContextDeltaBase?: TurnContextDeltaBase;
  readonly inheritedReactionGuidance: ReactionGuidanceDeclaration | null;
  /** G2.1 plugs its semantic decision-reason detector into this ingress seam. */
  readonly reasonGate?: StructuredFinalDecisionReasonGate;
}): StructuredFinalQueueResult {
  if (input.exit !== 'completed') {
    return { kind: 'rejected', code: 'decision_timeout', normalizationCode: null, engineResult: null };
  }
  if (input.finalText.trim().length === 0) {
    return { kind: 'rejected', code: 'decision_missing', normalizationCode: null, engineResult: null };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.finalText) as unknown;
  } catch {
    return { kind: 'rejected', code: 'decision_invalid', normalizationCode: 'invalid_shape', engineResult: null };
  }
  const normalized = normalizeIndexDecision(
    parsed,
    input.catalog,
    input.inheritedReactionGuidance,
    input.reasonGate,
  );
  if (normalized.kind === 'rejected') {
    return {
      kind: 'rejected',
      code: normalized.code === 'REASON_REQUIRED' ? 'REASON_REQUIRED' : 'decision_invalid',
      normalizationCode: normalized.code,
      engineResult: null,
    };
  }
  const bound = bindDecision(input.catalog, normalized.decision, input.inheritedReactionGuidance);
  let queued: RoundTurnProposalEnvelope | PlanAdjustmentProposalEnvelope | null = null;
  const toolSession = inProcessDmToolSession({
    state: input.state,
    snapshot: input.snapshot,
    intelMode: input.intelMode,
    rendererProfile: input.rendererProfile,
    turnContextMaximumBytes: input.turnContextMaximumBytes,
    overridePolicy: input.overridePolicy,
    ...(input.turnContextDeltaBase === undefined ? {} : {
      turnContextDeltaBase: input.turnContextDeltaBase,
    }),
    onProposal: (proposal) => { queued = proposal; },
    onToolResult: () => undefined,
  });
  const request = input.snapshot.capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error('Structured final queue lost its ordinary pending request.');
  }
  let engineResult: unknown;
  try {
    if (request.kind === 'plan_adjustment') {
      engineResult = toolSession.execute('engine.submit_plan_adjustment', {
        state_ref: {
          run_id: input.snapshot.capsule.runId,
          state_handle: engineStateHandle(input.snapshot.capsule),
          expected_revision: input.snapshot.capsule.revision,
        },
        request_id: request.requestId,
        phase: request.phase,
        idempotency_key: `final-indices:${input.catalog.digest}`,
        baseline_plan_hash: request.baselinePlanHash,
        updates: bound.proposals.map(externalProposal),
      });
    } else {
      engineResult = toolSession.execute('engine.submit_round_proposals', minimalRoundSubmission(bound));
    }
  } catch {
    return { kind: 'rejected', code: 'engine_rejected', normalizationCode: null, engineResult: null };
  }
  if (queued === null) {
    return { kind: 'rejected', code: 'engine_rejected', normalizationCode: null, engineResult };
  }
  return { kind: 'accepted', proposal: queued, decision: bound };
}

function inProcessSpeculativeToolSession(input: {
  readonly state: EncounterState;
  readonly snapshot: EngineRoundSnapshot;
  readonly onPlan: (plan: QueuedSpeculativePlanEnvelope) => void;
}): AgentToolSession & {
  readonly stateRef: Readonly<Record<string, unknown>>;
  readonly simulatedEncounterState: EncounterState;
} {
  const capsule = input.snapshot.capsule;
  const request = capsule.request;
  if (request?.phase !== 'speculative') {
    throw new Error('Speculative tool session requires a speculative pending request.');
  }
  const runtime = createEngineMcpRuntime(input.state, {
    runId: capsule.runId,
    branchId: capsule.branchId,
    revision: capsule.revision,
    requestId: request.requestId,
    phase: 'speculative',
    room: request.targetRoom,
    ...(capsule.historyDelta[0] === undefined ? {} : {
      historyKind: capsule.historyDelta[0].kind,
    }),
    requestedActorIds: request.actors,
    speculativeRequest: {
      targetRoom: request.targetRoom,
      targetMonsterRound: request.targetMonsterRound,
      refreshGeneration: request.refreshGeneration,
      scenarioMenu: request.scenarioMenu,
      scenarios: request.scenarios,
    },
    toolProfile: 'dm',
    initiativeProjection: capsule.projection.initiative,
    onSpeculativePlan: (plan) => input.onPlan(structuredClone(plan)),
  });
  return {
    simulatedEncounterState: structuredClone(input.state),
    stateRef: {
      run_id: capsule.runId,
      state_handle: engineStateHandle(capsule),
      expected_revision: capsule.revision,
    },
    tools: runtime.toolSurface.tools,
    execute(name, argumentsValue) {
      return runtime.toolSurface.execute(name, argumentsValue);
    },
  };
}

function recordAutoResolvedReactions(
  journal: EncounterSessionJournal,
  resolutions: EngineBoundaryResolutions,
): void {
  for (const resolution of resolutions.fallbackResolutions) {
    journal.recordHostTransition({
      kind: 'unattended_reaction_auto_resolved',
      ...resolution,
    });
  }
  for (const resolution of resolutions.guidedResolutions) {
    journal.recordHostTransition({ kind: 'reaction_guidance_auto_resolved', ...resolution });
  }
}

export function proposalResolutionDivergence(
  state: EncounterState,
  entry: ProposedTurnResolution,
): readonly string[] {
  const checked = pureTurnProposalResolver.resolve(state, entry.proposal);
  if (!checked.valid) {
    return [`${entry.proposal.actorId}: proposal-time resolution was valid, but authoritative resolution refused it: ${checked.refusals.map((refusal) => refusal.summary).join('; ')}`];
  }
  if (checked.selectedBranch !== entry.selectedBranch) {
    return [`${entry.proposal.actorId}: selected branch diverged from ${entry.selectedBranch} to ${checked.selectedBranch}.`];
  }
  if (checked.resolutionDigest === entry.resolutionDigest) return [];
  return checked.summary === entry.summary
    ? [`${entry.proposal.actorId}: path or final-position geometry diverged while action sequence, targets, and movement cost remained ${checked.summary}.`]
    : [`${entry.proposal.actorId}: resolved action sequence, targets, or movement cost diverged; proposal was "${entry.summary}" and authoritative resolution was "${checked.summary}".`];
}

function authorizedMechanics(state: EncounterState, proposal: RoundTurnProposalEnvelope): {
  readonly entries: readonly {
    readonly proposal: EngineTurnProposal;
    readonly option: EngineOfferableOption;
    readonly primaryOption: EngineOfferableOption;
    readonly fallbackOption: EngineOfferableOption | null;
    readonly mechanics: ResolvedTurnMechanics;
    readonly acceptedProposal: Readonly<Record<string, unknown>>;
    readonly selectedBranch: 'primary' | 'fallback';
    readonly summary: string;
    readonly primaryDeclaredProposal: Readonly<Record<string, unknown>>;
    readonly selectedDeclaredProposal: Readonly<Record<string, unknown>>;
    readonly primaryRejectionReasons: readonly string[];
    readonly strictNoFallback?: true;
  }[] | null;
  readonly divergences: readonly ConversationChainAttemptEvidence[];
} {
  const planningState = projectFutureMonsterTurns(
    state,
    proposal.resolutions.map((entry) => entry.proposal.actorId),
  );
  const divergences = proposal.resolutions.flatMap<ConversationChainAttemptEvidence>((entry) => {
    const reasons = proposalResolutionDivergence(planningState, entry);
    return reasons.length === 0 ? [] : [{
      attempt: proposal.phase === 'correction' ? 'correction' : 'primary',
      actorId: entry.proposal.actorId,
      declaredProposal: externalProposal(entry.proposal),
      rejectionReasons: reasons,
    }];
  });
  if (divergences.length > 0) return { entries: null, divergences };
  const resolved = proposal.resolutions.map((entry) => {
    const checked = pureTurnProposalResolver.resolve(planningState, entry.proposal);
    if (!checked.valid) return null;
    return {
      proposal: structuredClone(entry.proposal),
      option: structuredClone(checked.option),
      primaryOption: structuredClone(checked.primaryOption),
      fallbackOption: structuredClone(checked.fallbackOption),
      mechanics: checked.mechanics,
      acceptedProposal: externalProposal(entry.proposal),
      selectedBranch: entry.selectedBranch,
      summary: entry.summary,
      primaryDeclaredProposal: externalProposal(entry.proposal),
      selectedDeclaredProposal: externalProposal(entry.proposal),
      primaryRejectionReasons: checked.refusals.map((refusal) => refusal.summary),
      ...(entry.strictNoFallback === true ? { strictNoFallback: true as const } : {}),
    };
  });
  return {
    entries: resolved.some((entry) => entry === null) ? null : resolved as readonly {
      readonly proposal: EngineTurnProposal;
      readonly option: EngineOfferableOption;
      readonly primaryOption: EngineOfferableOption;
      readonly fallbackOption: EngineOfferableOption | null;
      readonly mechanics: ResolvedTurnMechanics;
      readonly acceptedProposal: Readonly<Record<string, unknown>>;
      readonly selectedBranch: 'primary' | 'fallback';
      readonly summary: string;
      readonly primaryDeclaredProposal: Readonly<Record<string, unknown>>;
      readonly selectedDeclaredProposal: Readonly<Record<string, unknown>>;
      readonly primaryRejectionReasons: readonly string[];
      readonly strictNoFallback?: true;
    }[],
    divergences,
  };
}

function agentInstructionSource(config: ConversationConfig): AgentInstructionSource {
  switch (config.instructionSource) {
    case 'none':
      return { instructionSource: 'none', skill: null };
    case 'kb':
      return { instructionSource: 'kb', skill: null, kbPath: config.kbPath };
    case 'skill':
      return { instructionSource: 'skill', skill: config.skill, kbPath: null };
  }
}

function invocation(
  config: ConversationConfig,
  runId: EncounterSessionId,
  callPhase: AgentCallPhase,
  prompt: string,
  launcherToken: string,
  instructions: string | null = null,
  planner: ConversationPlannerAttribution = { model: config.model, effort: config.effort },
  recoveryLauncherToken?: string,
  toolSession?: AgentToolSession,
  freshSessionContext?: FreshSessionContext,
  output: AgentInvocationOutput = { kind: 'tool_driven' },
  dispatchIdentity?: {
    readonly engineDispatchId: import('../src/vtt/agent-session').EngineDispatchId;
    readonly recoveryEngineDispatchId: import('../src/vtt/agent-session').EngineDispatchId;
  },
): AgentInvocation {
  return {
    ...agentInstructionSource(config),
    runId, prompt, instructions, model: planner.model, reasoningEffort: planner.effort,
    sessionProfile: 'arena',
    callPhase, output,
    launcherToken, timeoutMs: config.timeoutMs,
    ...(recoveryLauncherToken === undefined ? {} : { recoveryLauncherToken }),
    ...(dispatchIdentity === undefined ? {} : dispatchIdentity),
    ...(toolSession === undefined ? {} : { toolSession }),
    ...(freshSessionContext === undefined ? {} : { freshSessionContext }),
  };
}

function plannerAttribution(dispatched: AgentInvocation): ConversationPlannerAttribution {
  if (!CONVERSATION_EFFORTS.includes(dispatched.reasoningEffort as ConversationEffort)) {
    throw new TypeError(`Dispatched planner effort ${dispatched.reasoningEffort} is not attributable.`);
  }
  return {
    model: dispatched.model,
    effort: dispatched.reasoningEffort as ConversationEffort,
  };
}

function turnContextPrompt(base: TurnContextDeltaBase | undefined, intelMode: IntelMode): string {
  const mode = ` and intel_mode "${intelMode}"`;
  return base === undefined
    ? `Call engine.get_turn_context with granularity "full"${mode}.`
    : `Call engine.get_turn_context with granularity "turn_delta", since_revision ${String(base.revision)}${mode}; the engine will return full context if that base is unavailable.`;
}

async function roomStates(config: ConversationConfig, options: ConversationRunOptions): Promise<readonly EncounterState[]> {
  if (options.roomStates !== undefined) {
    if (options.roomStates.length < config.rooms) throw new RangeError('Conversation options contain too few room states.');
    // EngineRoundSession owns the defensive clone; retaining another full copy
    // here multiplies setup cost for every interleaved arm without adding isolation.
    return options.roomStates.slice(0, config.rooms);
  }
  const names = (await readdir(config.fixturesPath)).filter((name) => /^seed-\d+\.json$/u.test(name))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
  if (names.length < config.rooms) throw new RangeError(`Requested ${String(config.rooms)} rooms, but only ${String(names.length)} fixtures exist.`);
  return Promise.all(names.slice(0, config.rooms).map(async (name) =>
    applyRoomInitiativeProfile(
      await loadArenaFixture(resolve(config.fixturesPath, name)),
      config.initiativeProfile,
    )));
}

async function runConversationWithConfiguredIntel(
  config: ConversationConfig,
  options: ConversationRunOptions,
): Promise<ConversationRunResult> {
  const partyPolicy = options.partyPolicyOverride ?? config.partyPolicy;
  const clock = options.clock ?? (() => performance.now());
  const knowledgeBase = await loadKnowledgeBase(config);
  const blindPrimer = [GENERAL_PRIMER, ...BOARD_GLYPH_PRIMER.full].join(' ');
  const startupInstructions = config.dmMode === 'blind'
    ? `${knowledgeBase.startupInstructions}\n\nGeneral primer ${BLIND_STATE_PRIMER_VERSION}: ${blindPrimer}`
    : config.boardImageMode === 'png'
    ? `${knowledgeBase.startupInstructions}\n\n${BOARD_IMAGE_SCALE_STARTUP_INSTRUCTION}\n${UI_FEEDBACK_STARTUP_INSTRUCTION}`
    : knowledgeBase.startupInstructions;
  const freshSessionContext: FreshSessionContext = {
    knowledgeBaseBundleHash: knowledgeBase.combinedStartupHash,
    startupInstructions,
  };
  const repoCommit = options.repoCommit ?? await readRepoCommit(config.cwd);
  await writeFile(config.outPath, '', 'utf8');
  const artifacts = await mkdtemp(join(tmpdir(), 'dnd-ai-dm-conversation-'));
  const instructionEnvironment = config.cli === 'codex'
    ? await buildIsolatedCodexHome(artifacts, config)
    : { codexHome: null, skillHash: null };
  const states = await roomStates(config, options);
  if (config.combatModel === 'initiative_segments_v1') {
    const invalidFixture = states.findIndex((state) => state.config.initiativeMode !== 'per_combatant');
    if (invalidFixture >= 0) {
      throw new Error(
        `initiative_segments_v1 fixture constraint: room ${String(invalidFixture + 1)} must declare config.initiativeMode="per_combatant"; use --initiative-profile derived_v1 for frozen block fixtures.`,
      );
    }
  }
  const runId = encounterSessionId('encounter:ai-dm-conversation');
  const branchId = encounterBranchId('branch:ai-dm-conversation');
  let store = options.store ?? new MemoryBrowserSessionStore();
  let journal = EncounterSessionJournal.create({
    sessionId: runId, branchId, encounterState: states[0]!, coordinatorState: INITIAL_COORDINATOR_STATE,
    controllers: [], rng: mulberry32(3_943_001), store, mirror: new MemoryMirrorSink(),
  });
  let observedToolCalls = 0;
  let observedTurnContextCalls = 0;
  let observedContextTruncated = false;
  let observedRejections: ConversationChainAttemptEvidence[] = [];
  const simulated = config.dryRun ? new SimulatedConversationAdapter(
    config.cli, config.cwd, config.intelMode, options.exhaustInitial ?? [], options.invalidInitial ?? [],
    options.timeoutInitial ?? [],
    options.stagedAdjustmentTimeout ?? [],
    options.stagedAdjustmentCorrectionTimeout ?? [],
    options.stagedSpeculationTimeout ?? false,
    options.failSpeculationRecalculation ?? false,
    options.failSpeculationInfrastructure ?? false,
    options.failCorrection ?? [],
    options.flapPrimaryByRequest ?? {},
    options.reactionGuidanceByRequest ?? {},
    options.suggestionResponseByRequest ?? {},
    options.adjustmentResponseByRequest ?? {},
    options.speculationDispatchDelayMs ?? 0,
    options.simulatedInProcessDispatchDelayMs ?? null,
  ) : null;
  const selectedAdapter = options.adapter ?? simulated ?? (config.cli === 'local-openai'
    ? new LocalOpenAiAgentSessionAdapter({
        baseUrl: config.localOpenAi?.baseUrl ?? '',
        thinkMode: config.localOpenAi?.thinkMode ?? 'off',
        ...(config.localOpenAi?.apiKey === undefined ? {} : { apiKey: config.localOpenAi.apiKey }),
      })
    : resolveAgentAdapter(config.cli as AgentCliKind, {
        binary: config.cliBin, cwd: config.cwd, engineCommand: process.execPath,
        ...(instructionEnvironment.codexHome === null ? {} : { codexHome: instructionEnvironment.codexHome }),
        engineToolProfile: config.dmMode === 'blind' ? 'blind' : 'dm',
        engineArgs: [
          resolve(config.cwd, 'node_modules/vite-node/vite-node.mjs'),
          resolve(config.cwd, 'tools/engine-mcp-server.ts'),
        ],
        onStdoutLine: (line) => {
          try {
            const event: unknown = JSON.parse(line) as unknown;
            const toolNames = eventToolNames(event);
            observedToolCalls += toolNames.length;
            observedTurnContextCalls += toolNames.filter((name) => name.includes('get_turn_context')).length;
            if (eventContextTrimmed(event)) observedContextTruncated = true;
            observedRejections.push(...rejectionEvidence(event));
          } catch { /* non-JSON */ }
        },
      }));
  if (selectedAdapter.kind !== config.cli) throw new Error('Configured CLI and agent adapter kind disagree.');
  const adapter = new ModelCallBookkeepingAdapter(selectedAdapter);
  const rows: ConversationRow[] = [];
  let capsuleRevision = 1;
  const engineSession = new EngineRoundSession(
    states[0]!,
    mulberry32(8_274_113),
    { kind: 'unattended', askDefault: config.reactionAskDefault },
  );
  let completedRounds = 0;
  let restoredMidRun = false;
  let lastSeenTurnContext: TurnContextDeltaBase | undefined;
  const basePlanner: ConversationPlannerAttribution = {
    model: config.model,
    effort: config.effort,
  };
  const escalationPlanner: ConversationPlannerAttribution | null =
    config.escalationModel === null || config.escalationEffort === null
      ? null
      : { model: config.escalationModel, effort: config.escalationEffort };
  const escalationRepairInstructions =
    'This is a fresh one-shot escalation session for the supplied repair brief. Submit one complete OFFENSIVE corrected round: every actor with a legal attack must attack; Dash-to-close counts as offense for out-of-reach melee; Dodge is allowed only when that actor has no resolvable action. Use only the correction launcher; no fallback remains.';
  const prepareRound = (request: EngineOrdinaryRoundCapsuleRequest): EngineRoundSnapshot => {
    const prepared = engineSession.prepareRound(request, journal.reactionGuidance());
    recordAutoResolvedReactions(journal, prepared);
    capsuleRevision += prepared.revisionDelta;
    return prepared.snapshot;
  };
  const beginSegmentRound = (request: EngineOrdinaryRoundCapsuleRequest): EngineRoundSnapshot => {
    const prepared = engineSession.beginRoundWithoutSkipping(request, journal.reactionGuidance());
    recordAutoResolvedReactions(journal, prepared);
    capsuleRevision += prepared.revisionDelta;
    return prepared.snapshot;
  };
  const prepareConfiguredRound = (request: EngineOrdinaryRoundCapsuleRequest): EngineRoundSnapshot =>
    config.combatModel === 'initiative_segments_v1'
      ? beginSegmentRound(request)
      : prepareRound(request);

  prepareConfiguredRound({
    runId, branchId, revision: capsuleRevision, requestId: 'request:room-1-round-1',
    phase: 'initial', room: 1, historyKind: 'session_started',
  });
  let lifecycle = new AgentSessionLifecycle(
    journal,
    adapter,
    AGENT_ADAPTER_VERSION,
    options.contextRolloverPolicy,
  );

  for (let room = 1; room <= config.rooms; room += 1) {
    if (room > 1) {
      engineSession.replaceEncounterState(states[room - 1]!);
      capsuleRevision += 1;
      const requestId = `request:room-${String(room)}-round-1`;
      prepareConfiguredRound({
        runId, branchId, revision: capsuleRevision, requestId,
        phase: 'initial', room, historyKind: 'room_transition',
      });
      lastSeenTurnContext = undefined;
    }

    for (let round = 1; round <= config.rounds; round += 1) {
      const generationBeforeRound = journal.agentSession()?.generation ?? 0;
      const roundStarted = clock();
      const modelCallsBeforeRound = adapter.modelCalls;
      observedToolCalls = 0;
      observedTurnContextCalls = 0;
      observedContextTruncated = false;
      observedRejections = [];
      const requestId = `request:room-${String(room)}-round-${String(round)}`;
      const key = `room-${String(room)}-round-${String(round)}`;
      const kbReadSpoolPath = join(artifacts, `${key}-kb-reads.jsonl`);
      const rowKbSubjectSources = knowledgeBase.kind === 'bundle' &&
        knowledgeBase.subjectReadPolicy === 'two_per_round'
        ? kbSubjectSources(knowledgeBase)
        : undefined;
      if (rowKbSubjectSources !== undefined) await writeFile(kbReadSpoolPath, '', 'utf8');
      const rowKbReadBudget = rowKbSubjectSources === undefined
        ? undefined
        : new KbReadBudget(rowKbSubjectSources, [], (record) => {
            appendFileSync(kbReadSpoolPath, `${JSON.stringify(record)}\n`, 'utf8');
          });
      const launcherKbRead = rowKbSubjectSources === undefined ? undefined : {
        spoolPath: kbReadSpoolPath,
        subjectSources: rowKbSubjectSources,
      };
      const initialRequest: EngineOrdinaryRoundCapsuleRequest = {
        runId, branchId, revision: capsuleRevision, requestId,
        phase: 'initial', room, historyKind: round === 1 ? 'room_ready' : 'proposal_applied',
      };
      const initialSnapshot = round === 1
        ? engineSession.snapshot(initialRequest)
        : prepareConfiguredRound(initialRequest);
      const rendererState = structuredClone(engineSession.currentState());
      const rendererDeltaBase = lastSeenTurnContext;
      const capsule = initialSnapshot.capsule;
      const optionProjectionState = projectFutureMonsterTurns(
        rendererState,
        capsule.request?.actors ?? [],
      );
      const hiddenOptions = hiddenOptionRecords(
        optionProjectionState,
        capsule.request?.actors ?? [],
        capsule.revision,
      );
      const suggestedPlan = suggestedPlanBookkeeping(capsule);
      const createdSegmentPartyPlan = config.combatModel === 'initiative_segments_v1'
        ? createScriptedPartyPlan(engineSession.currentState(), {
            decisionPolicy: partyPolicy,
          })
        : null;
      const segmentPartyPlan = createdSegmentPartyPlan === null
        ? null
        : options.mutateScriptedPartyPlan?.(createdSegmentPartyPlan, { room, round }) ??
          createdSegmentPartyPlan;
      const initiativeOrder = engineSession.currentState().initiative.map((entry) => entry.combatant);
      const initiativeIndexByActor = new Map(
        initiativeOrder.map((actorId, index) => [actorId, index] as const),
      );
      const startingRoomDigest = sha256(canonicalJson(states[room - 1]!));
      const contextRevision = capsule.revision;
      const authoritativeInitialRequest = { ...initialRequest, revision: contextRevision };
      let currentTurnContext: TurnContextDeltaBase | undefined;
      const getCurrentTurnContext = (): TurnContextDeltaBase => {
        currentTurnContext ??= fullTurnContextBase(
          engineSession.currentState(), initialSnapshot, config.intelMode, config.rendererProfile,
          config.turnContextMaximumBytes,
        );
        return currentTurnContext;
      };
      let boardImageArtifact: BoardImageArtifact | null = null;
      let boardImagePrimaryDispatchStartedAtUnixMs: number | null = null;
      let boardImageBinding: EngineMcpBoardImageBinding | undefined;
      let plannedInitialTurnContext: CapturedTurnContext | undefined;
      let initialRendererEvidence: CapturedTurnContext['rendering'];
      const getPlannedInitialTurnContext = (): CapturedTurnContext => {
        plannedInitialTurnContext ??= plannedTurnContext(
          engineSession.currentState(),
          initialSnapshot,
          lastSeenTurnContext,
          config.intelMode,
          config.rendererProfile,
          config.turnContextMaximumBytes,
          config.dmMode === 'blind' ? {
            repairArm: config.blindRepairArm,
            maxAttempts: config.blindMaxAttempts,
            facts: config.blindFacts,
            visuals: blindVisualDescriptors(boardImageArtifact),
          } : undefined,
        );
        return plannedInitialTurnContext;
      };
      let rowTurnContext = unrequestedTurnContext(config.turnContextMaximumBytes);
      const initialDecisionCatalog = config.decisionTransport === 'final_indices'
        ? decisionCatalogForSnapshot(engineSession.currentState(), initialSnapshot)
        : null;
      if (initialDecisionCatalog !== null) rowTurnContext = getPlannedInitialTurnContext();
      const initialInvocationOutput = initialDecisionCatalog === null
        ? { kind: 'tool_driven' } as const
        : await structuredFinalOutput(config.decisionTransport, artifacts, `${key}-initial`, initialDecisionCatalog);
      if (config.boardImageMode !== 'off') {
        const snapshotService = options.boardSnapshotService;
        if (snapshotService === undefined) {
          throw new Error('Capturing board-image modes require a live arena-scoped snapshot service.');
        }
        const source: BoardImageSource = {
          room,
          round: rendererState.round,
          revision: rendererState.revision,
          stateDigest: boardStateDigest(rendererState),
        };
        boardImageArtifact = await snapshotService.capture({ state: rendererState, source });
        if (config.dmMode === 'blind' && boardImageArtifact.blindState === undefined) {
          throw new Error('Blind DM mode requires a state-only board image; advice captures cannot be reused.');
        }
        boardImagePrimaryDispatchStartedAtUnixMs = Date.now();
        await readValidatedBoardImage({
          artifact: boardImageArtifact,
          artifactRoot: snapshotService.outputDirectory,
          state: rendererState,
          source,
          primaryDispatchStartedAtUnixMs: boardImagePrimaryDispatchStartedAtUnixMs,
        });
        if (config.boardImageMode === 'png') {
          boardImageBinding = {
            artifactRoot: snapshotService.outputDirectory,
            artifact: boardImageArtifact,
            primaryDispatchStartedAtUnixMs: boardImagePrimaryDispatchStartedAtUnixMs,
          };
        }
      }
      const blindDeadlineUnixMs = Date.now() + config.timeoutMs;
      const writeInitialLauncher = (name: string) => writeLauncher({
        rendererProfile: config.rendererProfile,
        turnContextMaximumBytes: config.turnContextMaximumBytes,
        overridePolicy: config.overridePolicy,
        directory: artifacts, name, snapshot: initialSnapshot, room,
        historyKind: round === 1 ? 'room_ready' : 'proposal_applied',
        ...(config.dmModeExplicit ? { dmMode: config.dmMode } : {}),
        ...(config.dmMode === 'blind' ? {
          blindRepairArm: config.blindRepairArm,
          blindMaxAttempts: config.blindMaxAttempts,
          blindDeadlineUnixMs,
          blindFacts: config.blindFacts,
          blindVisuals: blindVisualDescriptors(boardImageArtifact),
          semanticBoardMaximumBytes: BLIND_SEMANTIC_BOARD_MAX_BYTES,
        } : {}),
        ...(launcherKbRead === undefined ? {} : { kbRead: launcherKbRead }),
        ...(lastSeenTurnContext === undefined || config.dmMode === 'blind' ? {} : {
          turnContextDeltaBase: lastSeenTurnContext,
        }),
        ...(boardImageBinding === undefined ? {} : { boardImage: boardImageBinding }),
      });
      const initialLauncher = await writeInitialLauncher(`${key}-initial`);
      let activeInitialSpools = {
        proposal: initialLauncher.spoolPath,
        context: initialLauncher.turnContextSpoolPath,
        uiFeedback: initialLauncher.uiFeedbackSpoolPath,
        blindIntent: initialLauncher.blindIntentSpoolPath,
        blindIngress: initialLauncher.blindIngressSpoolPath,
      };
      const started = clock();
      let localInitialProposal: RoundTurnProposalEnvelope | null = null;
      const initialToolSession = config.cli === 'local-openai' ||
        options.simulatedInProcessDispatchDelayMs !== undefined
        ? inProcessDmToolSession({
            state: engineSession.currentState(),
            snapshot: initialSnapshot,
            intelMode: config.intelMode,
            rendererProfile: config.rendererProfile,
            turnContextMaximumBytes: config.turnContextMaximumBytes,
            overridePolicy: config.overridePolicy,
            ...(rowKbReadBudget === undefined ? {} : {
              kbReadBudget: rowKbReadBudget,
              kbReadCallPhase: 'initial',
            }),
            ...(lastSeenTurnContext === undefined ? {} : {
              turnContextDeltaBase: lastSeenTurnContext,
            }),
            onProposal: (proposal) => {
              if (isRoundProposal(proposal)) localInitialProposal = proposal;
            },
            onTurnContextRendered: (evidence) => { initialRendererEvidence = evidence; },
            onToolResult: (name, result) => {
              observedToolCalls += 1;
              if (name === 'engine.get_turn_context') observedTurnContextCalls += 1;
              if (name === 'engine.get_turn_context') {
                rowTurnContext = capturedTurnContext(JSON.stringify(result), config.turnContextMaximumBytes);
                if (rowTurnContext.granularity === 'full') {
                  currentTurnContext = {
                    revision: initialSnapshot.capsule.revision,
                    context: structuredClone(rowTurnContext.value),
                  };
                }
              }
              if (eventContextTrimmed(result)) observedContextTruncated = true;
              observedRejections.push(...rejectionEvidence(result));
            },
          })
        : undefined;
      let roundUsage: AgentUsage | null = null;
      const roundCallUsage: AgentCallUsage[] = [];
      const captureCallUsage = (turn: AgentTurnResult, callPhase: AgentCallPhase): void => {
        if (turn.usage === null) return;
        roundCallUsage.push(agentCallUsage(turn.usage, callPhase, roundCallUsage.length + 1));
        roundUsage = addAgentUsage(roundUsage, turn.usage);
      };
      let proposalId: string | null = null;
      let outcome: ConversationRow['outcome'] = 'refused';
      let executionError: ConversationExecutionErrorClass | null = null;
      let initiativeExecutionPending = false;
      const refusals: string[] = [];
      let agentDispatched = false;
      let flapRetries: 0 | 1 | 2 = 0;
      let serviceNull = false;
      let firstDecisionAccepted = false;
      let decisionAttempts = 0;
      const decisionRejectionCodes: StructuredFinalRejectionCode[] = [];
      const normalizationCodes: DecisionNormalizationRejectionCode[] = [];
      const failedAttempts: ConversationChainAttemptEvidence[] = [];
      let autoResolvedTrigger: string | null = null;
      let correctionFinalText: string | null = null;
      let authorizationStateBinding: ConversationRow['stateBinding']['authorization'] = null;
      let authorizedPlan: ConversationRow['authorizedPlan'] = null;
      let pendingStructuredDecision: BoundRoundDecision | null = null;
      let authorizedChosenOptionIndices: NonNullable<ConversationRow['chosenOptionIndices']> = [];
      let acceptedSubmission: readonly EngineTurnProposal[] | null = null;
      let acceptedIntelCapture: DmIntelCapture | null = null;
      let authorizedMonsterProposalHash: string | null = null;
      let roundRationale: string | null = null;
      let roundNarrative: ConversationRow['roundNarrative'] = null;
      let initialDispatchPlanner: ConversationPlannerAttribution | null = null;
      let correctionDispatchPlanner: ConversationPlannerAttribution | null = null;
      let plannedBy: ConversationRow['plannedBy'] = null;
      let planner: ConversationPlanner = 'model';
      let fallbackReason: ConversationFallbackReason | null = null;
      let partyDefaultTurn = false;
      let terminalOutcome: ConversationTerminalOutcome | null = null;
      let primaryDispatchTimedOut = false;
      let correctionDispatchTimedOut = false;
      let escalated = false;
      let firedEscalationModel: string | null = null;
      let rolloutSessionId: string | null = null;
      let primaryTurn: AgentTurnResult | null = null;
      let primaryCatalogEvidence: EngineCatalogEvidence | null = null;
      let primaryDelivery: TurnContextDelivery | null = null;
      let failingDispatch: NonNullable<ConversationRowBase['failingDispatch']> | null = null;
      let escalationSessionId: string | null = null;
      let capturedRlData: ConversationRlData | undefined;
      let correctionTurnContextSpoolPath: string | null = null;
      let correctionUiFeedbackSpoolPath: string | null = null;
      let uiFeedback: EngineUiFeedback | null = null;
      let recordedCorrectionTurnContext: CapturedTurnContext | null = null;
      let initialCalls = 0;
      let adjustmentCalls = 0;
      let correctionCalls = 0;
      let serviceNullAdjustments = 0;
      const pcTurns: ConversationPcTurn[] = [];
      const adjustments: ConversationAdjustment[] = [];
      const monsterSegments: ConversationMonsterSegment[] = [];
      const segmentMonsterPlan = new Map<CombatantId, SegmentMonsterPlanEntry>();
      const exhaustionEntries = new Map<CombatantId, ExhaustionPlanEntry>();
      const autoSubmitBlocks = new Map<CombatantId, ConversationAutoSubmitBlock>();
      let exhaustionIntelCapture: DmIntelCapture | null = null;
      let segmentPlanId: string | null = null;
      let speculation: ConversationSpeculation = {
        status: 'not_proposed', reason: 'no_eligible_player_window', budgetMs: 0,
      };
      const speculations: ConversationSpeculation[] = [];
      const inFlightSpeculation: { current: InFlightSpeculation | null } = { current: null };
      const applyJoinedSpeculativeInfrastructure = (
        completed: SpeculativeDispatchCompletion,
      ): boolean => {
        if (completed.turn?.exit !== 'infrastructure_failed') return false;
        outcome = 'infrastructure_failed';
        serviceNull = true;
        refusals.push(completed.turn.failureReason);
        failingDispatch = completed.failingDispatch;
        return true;
      };
      const adjustmentTransitions: AdjustmentExhaustionTransition[] = [];
      const adjustmentPersistence = {
        transitions: (): readonly AdjustmentExhaustionTransition[] => adjustmentTransitions,
        record: (transition: AdjustmentExhaustionTransition): void => {
          adjustmentTransitions.push(structuredClone(transition));
        },
      };
      const startSpeculation = async (
        sourceState: EncounterState,
        window: ReturnType<typeof playerWindowBeforeNextMonster>,
      ): Promise<void> => {
        if (config.dmModeExplicit) return;
        if (inFlightSpeculation.current !== null || window.players.length === 0 || window.monsters.length === 0) return;
        const derivedBudget = Math.min(
          window.players.length * SPECULATION_MS_PER_PLAYER_TURN,
          SPECULATION_MAX_BUDGET_MS,
        );
        const budgetMs = Math.min(derivedBudget, options.speculationBudgetMs ?? derivedBudget);
        const menu = buildHostScenarioMenu(
          sourceState,
          window.monsters,
          window.players,
          canonicalEngineQueryPort,
        );
        if (menu.scenarios.length === 0) {
          if (speculations.length === 0) {
            speculation = { status: 'not_proposed', reason: 'empty_scenario_menu', budgetMs };
          }
          return;
        }
        const speculativeRequestId = `${requestId}:speculative:${String(window.monsters[0])}`;
        const sourceSnapshot = engineSession.snapshot({
          runId, branchId, revision: capsuleRevision,
          requestId: speculativeRequestId,
          phase: 'speculative',
          room,
          historyKind: 'speculative_plan_requested',
          requestedActorIds: window.monsters,
          targetMonsterRound: round,
          refreshGeneration: 0,
          scenarioMenu: menu.scenarioMenu,
          scenarios: menu.scenarios,
        });
        const ordinaryContextSnapshot = engineSession.snapshot({
          runId, branchId, revision: capsuleRevision,
          requestId: `${speculativeRequestId}:context`,
          phase: 'initial',
          room,
          historyKind: 'speculative_context_projected',
          requestedActorIds: window.monsters,
        });
        const renderedOrdinaryContext = plannedTurnContext(
          sourceState,
          ordinaryContextSnapshot,
          undefined,
          config.intelMode,
          config.rendererProfile,
          config.turnContextMaximumBytes,
        ).value;
        const ordinaryContext = options.mutateSpeculativeContext?.(renderedOrdinaryContext) ??
          renderedOrdinaryContext;
        const planner = escalationPlanner ?? basePlanner;
        if (!sameCombatantSet(renderedContextActorIds(ordinaryContext), window.monsters)) {
          speculation = {
            status: 'discarded', proposed: true, adopted: false, discarded: true,
            discardReason: 'context_actor_set_mismatch',
            targetMonsterRound: round,
            targetActorIds: window.monsters,
            branchCount: menu.scenarios.length,
            budgetMs,
            planningWallMs: 0,
            boundaryWaitMs: 0,
            plannedBy: planner,
            source: {
              revision: sourceSnapshot.capsule.revision,
              digest: sourceSnapshot.capsule.digest,
            },
            decision: null,
          };
          speculations.push(speculation);
          return;
        }
        const speculativeContext = {
          ...ordinaryContext,
          state_ref: {
            run_id: sourceSnapshot.capsule.runId,
            state_handle: engineStateHandle(sourceSnapshot.capsule),
            expected_revision: sourceSnapshot.capsule.revision,
          },
          speculative_request: sourceSnapshot.capsule.request,
        };
        const launcher = await writeLauncher({
          rendererProfile: config.rendererProfile,
          turnContextMaximumBytes: config.turnContextMaximumBytes,
          overridePolicy: config.overridePolicy,
          directory: artifacts,
          name: `${key}-speculative-${String(window.monsters[0])}`,
          snapshot: sourceSnapshot,
          room,
          historyKind: 'speculative_plan_requested',
        });
        let localPlan: QueuedSpeculativePlanEnvelope | null = null;
        const toolSession = config.cli === 'local-openai' ||
          options.simulatedInProcessDispatchDelayMs !== undefined
          ? inProcessSpeculativeToolSession({
              state: sourceState,
              snapshot: sourceSnapshot,
              onPlan: (plan) => { localPlan = plan; },
            })
          : undefined;
        const controller = new AbortController();
        const dispatchStarted = clock();
        const timeout = setTimeout(() => controller.abort(), budgetMs);
        const completion = (async (): Promise<SpeculativeDispatchCompletion> => {
          try {
            options.onSpeculationDispatchStart?.();
            const speculativeInvocation = invocation(
              config,
              runId,
              'speculation',
              renderEnginePrompt(
                'speculate_round', sourceSnapshot.capsule, RULES_SOURCE, undefined, speculativeContext,
              ),
              launcher.manifestPath,
              startupInstructions,
              planner,
              launcher.recoveryManifestPath,
              toolSession,
              freshSessionContext,
              { kind: 'tool_driven' },
              { engineDispatchId: launcher.dispatchId, recoveryEngineDispatchId: launcher.recoveryDispatchId },
            );
            options.onAgentInvocation?.(speculativeInvocation);
            const turn = await adapter.start(speculativeInvocation, controller.signal);
            const planningWallMs = clock() - dispatchStarted;
            const spools = dispatchSpools(launcher, turn);
            enforceCompletedDispatchIntegrity({
              turn,
              launcher,
              spools,
              maximumBytes: config.turnContextMaximumBytes,
              artifactPath: join(artifacts, `${key}-speculative-${String(window.monsters[0])}-dispatch-integrity.json`),
              rowPath: config.outPath,
              scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
            });
            return {
              plan: turn.exit === 'completed' ? localPlan ?? takeSpeculativePlan(spools.proposal) : null,
              turn,
              planningWallMs,
              timedOut: turn.exit === 'timed_out' || controller.signal.aborted || planningWallMs > budgetMs,
              error: turn.exit === 'infrastructure_failed' ? turn.failureReason : null,
              failingDispatch: turn.exit === 'infrastructure_failed'
                ? classifyFailedDispatch({
                    phase: 'speculative', turn, contextSpoolPath: spools.context,
                    maximumBytes: config.turnContextMaximumBytes,
                  })
                : null,
            };
          } catch (error) {
            if (error instanceof D569IntegrityStop) throw error;
            return {
              plan: null,
              turn: null,
              planningWallMs: clock() - dispatchStarted,
              timedOut: controller.signal.aborted,
              error: error instanceof Error ? error.message : String(error),
              failingDispatch: null,
            };
          } finally {
            clearTimeout(timeout);
          }
        })();
        inFlightSpeculation.current = {
          dispatchId: launcher.dispatchId,
          sourceSnapshot,
          sourceTurnContext: {
            revision: ordinaryContextSnapshot.capsule.revision,
            context: structuredClone(ordinaryContext),
          },
          targetActorIds: window.monsters,
          targetMonsterRound: round,
          branchCount: menu.scenarios.length,
          budgetMs,
          planner,
          baselinePlanHash: monsterPlanHash(segmentMonsterPlan),
          controller,
          completion,
        };
        speculation = {
          status: 'proposed', proposed: true, adopted: false, discarded: false,
          discardReason: null,
          targetMonsterRound: round,
          targetActorIds: window.monsters,
          branchCount: menu.scenarios.length,
          budgetMs,
          planningWallMs: 0,
          boundaryWaitMs: 0,
          plannedBy: planner,
          source: {
            revision: sourceSnapshot.capsule.revision,
            digest: sourceSnapshot.capsule.digest,
          },
          decision: null,
        };
      };
      const dispatchPlanAdjustment = async (input: {
        readonly triggerActor: CombatantId;
        readonly pcTurnOrdinal: number;
        readonly beforeRevision: number;
        readonly afterRevision: number;
        readonly reasons: readonly PlanMaterialityReasonCode[];
        readonly openActorIds: readonly CombatantId[];
      }): Promise<void> => {
        if (!config.midRoundAdjustmentsEnabled) return;
        if (segmentPlanId === null) throw new Error('Material PC turn has no authorized monster plan to adjust.');
        if (options.mutateBeforeAdjustmentPreflight !== undefined) {
          engineSession.replaceEncounterState(
            options.mutateBeforeAdjustmentPreflight(engineSession.currentState()),
          );
          capsuleRevision = Math.max(capsuleRevision, engineSession.currentState().revision);
        }
        const baselineEntries = input.openActorIds.map((actorId) => {
          const entry = segmentMonsterPlan.get(actorId);
          if (entry === undefined) throw new Error(`Open monster ${actorId} has no baseline proposal.`);
          return entry;
        });
        const preflight = adjustmentPreflight({
          state: engineSession.currentState(),
          actualRevision: capsuleRevision,
          entries: baselineEntries,
        });
        if (!preflight.dispatch) {
          for (const entry of preflight.rebound) {
            segmentMonsterPlan.set(entry.proposal.actorId, entry);
          }
          segmentPlanId = `retained:${monsterPlanHash(segmentMonsterPlan)}`;
          if (inFlightSpeculation.current !== null) {
            inFlightSpeculation.current = {
              ...inFlightSpeculation.current,
              baselinePlanHash: monsterPlanHash(segmentMonsterPlan),
            };
          }
          adjustments.push({
            trigger: input.triggerActor,
            triggerPcTurnOrdinal: input.pcTurnOrdinal,
            triggerInitiativeIndex: initiativeIndexByActor.get(input.triggerActor) ?? -1,
            reasons: input.reasons,
            openActors: input.openActorIds,
            skipped: 'no_material_change',
          });
          return;
        }
        const adjustmentKey = `${key}-pc-turn-${String(input.pcTurnOrdinal)}`;
        const adjustmentRequestId = `request:${adjustmentKey}`;
        const baselinePlanHash = monsterPlanHash(segmentMonsterPlan);
        const metadataFor = (actors: readonly CombatantId[]): EnginePlanAdjustmentMetadata => ({
          parentPlanId: segmentPlanId ?? `monster-plan:${baselinePlanHash}`,
          baselinePlanHash,
          triggerPcTurnId: `pc-turn:${adjustmentKey}`,
          beforeRevision: input.beforeRevision,
          afterRevision: input.afterRevision,
          materialityReasonCodes: input.reasons,
          baselineProposalDigests: actors.map((actorId) => {
            const entry = segmentMonsterPlan.get(actorId);
            if (entry === undefined) throw new Error(`Open monster ${actorId} has no baseline proposal.`);
            return { actorId, proposalDigest: sha256(canonicalJson(entry.proposal)) };
          }),
          adjustmentBudget: Math.min(actors.length, 2) as 1 | 2,
        });
        const adjustmentRequest: EngineOrdinaryRoundCapsuleRequest = {
          runId, branchId, revision: capsuleRevision, requestId: adjustmentRequestId,
          phase: 'initial', room, historyKind: 'plan_adjustment_requested',
          requestKind: 'plan_adjustment', requestedActorIds: input.openActorIds,
          planAdjustment: metadataFor(input.openActorIds),
        };
        const adjustmentSnapshot = engineSession.snapshot(adjustmentRequest);
        const plannedAdjustmentContext = plannedTurnContext(
          engineSession.currentState(), adjustmentSnapshot, lastSeenTurnContext, config.intelMode,
          config.rendererProfile,
          config.turnContextMaximumBytes,
        );
        let adjustmentTurnContext = plannedAdjustmentContext;
        const adjustmentDecisionCatalog = config.decisionTransport === 'final_indices'
          ? decisionCatalogForSnapshot(engineSession.currentState(), adjustmentSnapshot)
          : null;
        const adjustmentInvocationOutput = adjustmentDecisionCatalog === null
          ? { kind: 'tool_driven' } as const
          : await structuredFinalOutput(
              config.decisionTransport,
              artifacts,
              `${adjustmentKey}-initial`,
              adjustmentDecisionCatalog,
            );
        const writeAdjustmentLauncher = (name: string) => writeLauncher({
          rendererProfile: config.rendererProfile,
          turnContextMaximumBytes: config.turnContextMaximumBytes,
          overridePolicy: config.overridePolicy,
          directory: artifacts,
          name,
          snapshot: adjustmentSnapshot,
          room,
          historyKind: 'plan_adjustment_requested',
          ...(launcherKbRead === undefined ? {} : { kbRead: launcherKbRead }),
          ...(lastSeenTurnContext === undefined ? {} : { turnContextDeltaBase: lastSeenTurnContext }),
        });
        const adjustmentLauncher = await writeAdjustmentLauncher(`${adjustmentKey}-initial`);
        let localAdjustmentProposal: PlanAdjustmentProposalEnvelope | null = null;
        const adjustmentToolSession = config.cli === 'local-openai' ||
          options.simulatedInProcessDispatchDelayMs !== undefined
          ? inProcessDmToolSession({
              state: engineSession.currentState(),
              snapshot: adjustmentSnapshot,
              intelMode: config.intelMode,
              rendererProfile: config.rendererProfile,
              turnContextMaximumBytes: config.turnContextMaximumBytes,
              overridePolicy: config.overridePolicy,
              ...(rowKbReadBudget === undefined ? {} : {
                kbReadBudget: rowKbReadBudget,
                kbReadCallPhase: 'adjustment',
              }),
              ...(lastSeenTurnContext === undefined ? {} : { turnContextDeltaBase: lastSeenTurnContext }),
              onProposal: (proposal) => {
                if (isPlanAdjustmentProposal(proposal)) localAdjustmentProposal = proposal;
              },
              onToolResult: (name, result) => {
                observedToolCalls += 1;
                if (name === 'engine.get_turn_context') {
                  observedTurnContextCalls += 1;
                  adjustmentTurnContext = capturedTurnContext(
                    JSON.stringify(result),
                    config.turnContextMaximumBytes,
                  );
                }
                if (eventContextTrimmed(result)) observedContextTruncated = true;
                observedRejections.push(...rejectionEvidence(result));
              },
            })
          : undefined;
        const adjustmentToolCalls = (): number =>
          simulated?.callsByRequest.get(adjustmentRequestId) ?? observedToolCalls;
        const adjustmentRejections = (): readonly ConversationChainAttemptEvidence[] =>
          simulated?.rejectionsByRequest.get(adjustmentRequestId) ?? observedRejections;
        const rejectionsBeforeAdjustment = adjustmentRejections().length;
        let adjustmentProposal: PlanAdjustmentProposalEnvelope | null = null;
        let adjustmentSessionId: string | null = null;
        let adjustmentCorrectionSessionId: string | null = null;
        let adjustmentFlapRetries: 0 | 1 | 2 = 0;
        let adjustmentServiceNull = false;
        let adjustmentFinalRejected = false;
        let adjustmentUsage: AgentUsage | null = null;
        const modelCallsBeforeAdjustment = adapter.modelCalls;
        const toolCallsBeforeAdjustment = adjustmentToolCalls();
        const adjustmentRlData: ConversationRlDataV2[] = [];
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const dispatchAdjustmentLauncher = attempt === 0
            ? adjustmentLauncher
            : await writeAdjustmentLauncher(`${adjustmentKey}-initial-retry-${String(attempt + 1)}`);
          const callsBefore = adjustmentToolCalls();
          const rejectionsBefore = adjustmentRejections().length;
          const retryNote = attempt === 0 ? '' :
            '[SERVICE_RETRY] The previous adjustment turn completed with no engine tool activity, proposal, or refusal. Retry this PC-turn adjustment now.\n\n';
          const adjustmentInvocation = invocation(
            config,
            runId,
            'adjustment',
            adjustmentDecisionCatalog === null
              ? `${retryNote}${turnContextPrompt(lastSeenTurnContext, config.intelMode)}\n\n${renderEnginePrompt('plan_round', adjustmentSnapshot.capsule, RULES_SOURCE)}`
              : structuredFinalPrompt(adjustmentTurnContext, adjustmentDecisionCatalog),
            dispatchAdjustmentLauncher.manifestPath,
            null,
            basePlanner,
            dispatchAdjustmentLauncher.recoveryManifestPath,
            adjustmentToolSession,
            freshSessionContext,
            adjustmentInvocationOutput,
            {
              engineDispatchId: dispatchAdjustmentLauncher.dispatchId,
              recoveryEngineDispatchId: dispatchAdjustmentLauncher.recoveryDispatchId,
            },
          );
          options.onAgentInvocation?.(adjustmentInvocation);
          adjustmentCalls += 1;
          const turn = await lifecycle.resumeRound(
            adjustmentInvocation,
            new AbortController().signal,
          );
          adjustmentSessionId = turn.sessionId;
          captureCallUsage(turn, 'adjustment');
          decisionAttempts += 1;
          adjustmentUsage = addAgentUsage(adjustmentUsage, turn.usage);
          const adjustmentSpools = dispatchSpools(dispatchAdjustmentLauncher, turn);
          enforceCompletedDispatchIntegrity({
            turn,
            launcher: dispatchAdjustmentLauncher,
            spools: adjustmentSpools,
            maximumBytes: config.turnContextMaximumBytes,
            artifactPath: join(artifacts, `${adjustmentKey}-initial-${String(attempt + 1)}-dispatch-integrity.json`),
            rowPath: config.outPath,
            scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
          });
          if (turn.exit !== 'completed') {
            adjustmentServiceNull = true;
            if (turn.exit === 'infrastructure_failed') {
              outcome = 'infrastructure_failed';
              serviceNull = true;
              refusals.push(turn.failureReason);
              failingDispatch = classifyFailedDispatch({
                phase: 'adjustment', turn,
                contextSpoolPath: adjustmentSpools.context,
                maximumBytes: config.turnContextMaximumBytes,
              });
              throw new CellInfrastructureAbort('Adjustment engine MCP infrastructure failed.');
            }
            break;
          }
          adjustmentTurnContext = takeTurnContext(
            adjustmentSpools.context,
            config.turnContextMaximumBytes,
          ) ??
            adjustmentTurnContext;
          if (adjustmentDecisionCatalog === null) {
            adjustmentProposal = localAdjustmentProposal ??
              takePlanAdjustmentProposal(adjustmentSpools.proposal);
          } else {
            const structured = queueStructuredFinalDecision({
              finalText: turn.finalText,
              exit: turn.exit,
              catalog: adjustmentDecisionCatalog,
              state: engineSession.currentState(),
              snapshot: adjustmentSnapshot,
              intelMode: config.intelMode,
              rendererProfile: config.rendererProfile,
              turnContextMaximumBytes: config.turnContextMaximumBytes,
              overridePolicy: config.overridePolicy,
              ...(lastSeenTurnContext === undefined ? {} : { turnContextDeltaBase: lastSeenTurnContext }),
              inheritedReactionGuidance: journal.reactionGuidance(),
              reasonGate: STRUCTURED_FINAL_DECISION_REASON_GATE,
            });
            if (structured.kind === 'accepted') {
              if (!isPlanAdjustmentProposal(structured.proposal)) {
                throw new Error('Adjustment final-index decision queued a non-adjustment proposal.');
              }
              adjustmentProposal = structured.proposal;
            } else {
              adjustmentFinalRejected = true;
              decisionRejectionCodes.push(structured.code);
              if (structured.normalizationCode !== null) normalizationCodes.push(structured.normalizationCode);
              if (structured.engineResult !== null) {
                observedRejections.push(...rejectionEvidence(structured.engineResult));
              }
            }
          }
          const flapped = adjustmentDecisionCatalog === null && turn.exit === 'completed' && adjustmentProposal === null &&
            adjustmentToolCalls() === callsBefore && adjustmentRejections().length === rejectionsBefore;
          if (!flapped) break;
          if (adjustmentDecisionCatalog !== null) break;
          if (attempt === 2) {
            adjustmentServiceNull = true;
            break;
          }
          adjustmentFlapRetries = attempt === 0 ? 1 : 2;
        }
        if (adjustmentServiceNull) {
          serviceNullAdjustments += 1;
          const resultCapsule = engineSession.authorizationCapsule({
            ...adjustmentRequest,
            revision: capsuleRevision,
          });
          adjustments.push({
            trigger: input.triggerActor,
            triggerPcTurnOrdinal: input.pcTurnOrdinal,
            triggerInitiativeIndex: initiativeIndexByActor.get(input.triggerActor) ?? -1,
            reasons: input.reasons,
            openActors: input.openActorIds,
            skipped: null,
            preflight: preflight.reason,
            requestId: adjustmentRequestId,
            proposalId: null,
            baselinePlanHash,
            resultPlanHash: baselinePlanHash,
            changedActors: [],
            outcome: 'service_null',
            sessionId: adjustmentSessionId,
            correctionSessionId: null,
            rawContext: adjustmentTurnContext.raw,
            granularity: adjustmentTurnContext.granularity,
            stateBinding: {
              request: {
                revision: adjustmentSnapshot.capsule.revision,
                digest: adjustmentSnapshot.capsule.digest,
              },
              result: { revision: resultCapsule.revision, digest: resultCapsule.digest },
            },
            usage: tokenCounts(adjustmentUsage),
            toolCalls: adjustmentToolCalls() - toolCallsBeforeAdjustment,
            modelCalls: adapter.modelCalls - modelCallsBeforeAdjustment,
            flapRetries: adjustmentFlapRetries,
            refusals: [],
            correctionChain: null,
            rlData: [],
          });
          return;
        }

        const currentAdjustmentRejections = adjustmentRejections().slice(rejectionsBeforeAdjustment);
        const rejectedAdjustmentActors = currentAdjustmentRejections.flatMap((entry) =>
          entry.actorId === null || !input.openActorIds.includes(entry.actorId) ? [] : [entry.actorId]);
        const refusedActorIds = [...new Set([
          ...rejectedAdjustmentActors,
          ...(adjustmentFinalRejected ? input.openActorIds : []),
        ])]
          .sort((left, right) => left.localeCompare(right));
        let correctionRuntime: Parameters<AdjustmentExhaustionCoordinator['coordinate']>[0]['correction'] = null;
        let adjustmentCorrectionProposal: PlanAdjustmentProposalEnvelope | null = null;
        const recordedAdjustmentCorrectionProposal = (): PlanAdjustmentProposalEnvelope | null =>
          adjustmentCorrectionProposal;
        let adjustmentCorrectionContext: CapturedTurnContext | null = null;
        if (refusedActorIds.length > 0) {
          const correctionRequest: EngineOrdinaryRoundCapsuleRequest = {
            runId, branchId, revision: capsuleRevision, requestId: adjustmentRequestId,
            phase: 'correction', room, historyKind: 'plan_adjustment_correction_requested',
            requestKind: 'plan_adjustment', requestedActorIds: refusedActorIds,
            planAdjustment: metadataFor(refusedActorIds),
          };
          const correctionSnapshot = engineSession.snapshot(correctionRequest);
          const correctionContext = plannedTurnContext(
            engineSession.currentState(), correctionSnapshot, lastSeenTurnContext, config.intelMode,
            config.rendererProfile,
            config.turnContextMaximumBytes,
          );
          adjustmentCorrectionContext = correctionContext;
          const adjustmentCorrectionDecisionCatalog = config.decisionTransport === 'final_indices'
            ? decisionCatalogForSnapshot(engineSession.currentState(), correctionSnapshot)
            : null;
          const correctionInvocationOutput = adjustmentCorrectionDecisionCatalog === null
            ? { kind: 'tool_driven' } as const
            : await structuredFinalOutput(
                config.decisionTransport,
                artifacts,
                `${adjustmentKey}-correction`,
                adjustmentCorrectionDecisionCatalog,
              );
          const correctionLauncher = await writeLauncher({
            rendererProfile: config.rendererProfile,
            turnContextMaximumBytes: config.turnContextMaximumBytes,
            overridePolicy: config.overridePolicy,
            directory: artifacts,
            name: `${adjustmentKey}-correction`,
            snapshot: correctionSnapshot,
            room,
            historyKind: 'plan_adjustment_correction_requested',
            ...(launcherKbRead === undefined ? {} : { kbRead: launcherKbRead }),
            ...(lastSeenTurnContext === undefined ? {} : { turnContextDeltaBase: lastSeenTurnContext }),
          });
          let correctionSpools = dispatchSpools(correctionLauncher, {
            exit: 'completed', resumeSessionId: agentSessionId('agent-session:spool-placeholder'),
            sessionId: null, finalText: '', usage: null, processEvidence: null,
            partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
            engineCatalogEvidence: null,
          });
          let localCorrection: PlanAdjustmentProposalEnvelope | null = null;
          const correctionToolSession = config.cli === 'local-openai' ||
            options.simulatedInProcessDispatchDelayMs !== undefined
            ? inProcessDmToolSession({
                state: engineSession.currentState(),
                snapshot: correctionSnapshot,
                intelMode: config.intelMode,
                rendererProfile: config.rendererProfile,
                turnContextMaximumBytes: config.turnContextMaximumBytes,
                overridePolicy: config.overridePolicy,
                ...(rowKbReadBudget === undefined ? {} : {
                  kbReadBudget: rowKbReadBudget,
                  kbReadCallPhase: 'adjustment',
                }),
                ...(lastSeenTurnContext === undefined ? {} : { turnContextDeltaBase: lastSeenTurnContext }),
                onProposal: (proposal) => {
                  if (isPlanAdjustmentProposal(proposal)) {
                    localCorrection = proposal;
                    adjustmentCorrectionProposal = proposal;
                  }
                },
                onToolResult: (name, result) => {
                  observedToolCalls += 1;
                  if (name === 'engine.get_turn_context') observedTurnContextCalls += 1;
                  if (eventContextTrimmed(result)) observedContextTruncated = true;
                  observedRejections.push(...rejectionEvidence(result));
                },
              })
            : undefined;
          correctionRuntime = {
            capsule: correctionSnapshot.capsule,
            rules: RULES_SOURCE,
            turnContext: correctionContext.value,
            lifecycle: {
              resumeCorrection: async (correctionInvocation, signal) => {
                options.onAgentInvocation?.(correctionInvocation);
                correctionCalls += 1;
                const turn = await lifecycle.resumeCorrection(correctionInvocation, signal);
                correctionSpools = dispatchSpools(correctionLauncher, turn);
                enforceCompletedDispatchIntegrity({
                  turn,
                  launcher: correctionLauncher,
                  spools: correctionSpools,
                  maximumBytes: config.turnContextMaximumBytes,
                  artifactPath: join(artifacts, `${adjustmentKey}-correction-dispatch-integrity.json`),
                  rowPath: config.outPath,
                  scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
                });
                if (turn.exit === 'infrastructure_failed') {
                  failingDispatch = classifyFailedDispatch({
                    phase: 'correction', turn,
                    contextSpoolPath: correctionSpools.context,
                    maximumBytes: config.turnContextMaximumBytes,
                  });
                }
                adjustmentCorrectionSessionId = turn.sessionId;
                captureCallUsage(turn, 'correction');
                decisionAttempts += 1;
                adjustmentUsage = addAgentUsage(adjustmentUsage, turn.usage);
                adjustmentCorrectionContext =
                  takeTurnContext(correctionSpools.context, config.turnContextMaximumBytes) ??
                  adjustmentCorrectionContext;
                if (turn.exit !== 'completed') {
                  localCorrection = null;
                  adjustmentCorrectionProposal = null;
                  return turn;
                }
                if (adjustmentCorrectionDecisionCatalog !== null) {
                  const structured = queueStructuredFinalDecision({
                    finalText: turn.finalText,
                    exit: turn.exit,
                    catalog: adjustmentCorrectionDecisionCatalog,
                    state: engineSession.currentState(),
                    snapshot: correctionSnapshot,
                    intelMode: config.intelMode,
                    rendererProfile: config.rendererProfile,
                    turnContextMaximumBytes: config.turnContextMaximumBytes,
                    overridePolicy: config.overridePolicy,
                    ...(lastSeenTurnContext === undefined ? {} : {
                      turnContextDeltaBase: lastSeenTurnContext,
                    }),
                    inheritedReactionGuidance: journal.reactionGuidance(),
                    reasonGate: STRUCTURED_FINAL_DECISION_REASON_GATE,
                  });
                  if (structured.kind === 'accepted') {
                    if (!isPlanAdjustmentProposal(structured.proposal)) {
                      throw new Error('Adjustment correction final-index decision queued a non-adjustment proposal.');
                    }
                    localCorrection = structured.proposal;
                    adjustmentCorrectionProposal = structured.proposal;
                  } else {
                    decisionRejectionCodes.push(structured.code);
                    if (structured.normalizationCode !== null) normalizationCodes.push(structured.normalizationCode);
                    if (structured.engineResult !== null) {
                      observedRejections.push(...rejectionEvidence(structured.engineResult));
                    }
                  }
                }
                return turn;
              },
            },
            invocation: invocation(
              config,
              runId,
              'correction',
              adjustmentCorrectionDecisionCatalog === null
                ? 'replaced by adjustment correction renderer'
                : structuredFinalPrompt(correctionContext, adjustmentCorrectionDecisionCatalog),
              correctionLauncher.manifestPath,
              null,
              basePlanner,
              correctionLauncher.recoveryManifestPath,
              correctionToolSession,
              freshSessionContext,
              correctionInvocationOutput,
              {
                engineDispatchId: correctionLauncher.dispatchId,
                recoveryEngineDispatchId: correctionLauncher.recoveryDispatchId,
              },
            ),
            signal: new AbortController().signal,
            activateCapsule: () => undefined,
            takeProposal: () => {
              const proposal = localCorrection ?? takePlanAdjustmentProposal(correctionSpools.proposal);
              adjustmentCorrectionProposal = proposal;
              return proposal;
            },
          };
        }
        const completion = await new AdjustmentExhaustionCoordinator(adjustmentPersistence).coordinate({
          initial: {
            requestId: adjustmentRequestId,
            baselinePlanHash,
            openActorIds: input.openActorIds,
            stagedProposal: adjustmentProposal,
            refusedActorIds,
          },
          correction: correctionRuntime,
        });
        if (completion.correctionResult === 'infrastructure_failed') {
          outcome = 'infrastructure_failed';
          serviceNull = true;
          throw new CellInfrastructureAbort('Adjustment correction engine MCP infrastructure failed.');
        }
        const completedCorrectionProposal = recordedAdjustmentCorrectionProposal();
        if (config.captureRlData && adjustmentProposal?.submittedArguments !== undefined) {
          adjustmentRlData.push(rlCapture(
            startupInstructions,
            adjustmentTurnContext,
            adjustmentProposal,
            config.intelMode,
            {
              repoCommit,
              model: config.model,
              effort: config.effort,
              sessionId: adjustmentSessionId,
              parentPlanId: metadataFor(input.openActorIds).parentPlanId,
              partyPolicyHash: segmentPartyPlan?.policyHash ?? null,
              materialityPolicyHash: PLAN_MATERIALITY_POLICY_HASH,
            },
          ));
        }
        if (config.captureRlData && completion.correctionResult === 'accepted' &&
          completedCorrectionProposal?.submittedArguments !== undefined &&
          adjustmentCorrectionContext !== null) {
          adjustmentRlData.push(rlCapture(
            startupInstructions,
            adjustmentCorrectionContext,
            completedCorrectionProposal,
            config.intelMode,
            {
              repoCommit,
              model: config.model,
              effort: config.effort,
              sessionId: adjustmentCorrectionSessionId,
              parentPlanId: metadataFor(input.openActorIds).parentPlanId,
              partyPolicyHash: segmentPartyPlan?.policyHash ?? null,
              materialityPolicyHash: PLAN_MATERIALITY_POLICY_HASH,
            },
          ));
        }
        for (const update of completion.updates) {
          const resolution = pureTurnProposalResolver.resolve(
            projectFutureMonsterTurns(engineSession.currentState(), [update.proposal.actorId]),
            update.proposal,
          );
          if (!resolution.valid) {
            throw new Error(`Staged adjustment for ${update.proposal.actorId} is no longer resolvable.`);
          }
          segmentMonsterPlan.set(update.proposal.actorId, {
            proposal: structuredClone(update.proposal),
            option: structuredClone(resolution.option),
            primaryOption: structuredClone(resolution.primaryOption),
            fallbackOption: structuredClone(resolution.fallbackOption),
            mechanics: resolution.mechanics,
            selectedBranch: resolution.selectedBranch,
          });
        }
        const resultPlanHash = monsterPlanHash(segmentMonsterPlan);
        segmentPlanId = `monster-plan:${resultPlanHash}`;
        const resultCapsule = engineSession.authorizationCapsule({
          ...adjustmentRequest,
          revision: capsuleRevision,
        });
        adjustments.push({
          trigger: input.triggerActor,
          triggerPcTurnOrdinal: input.pcTurnOrdinal,
          triggerInitiativeIndex: initiativeIndexByActor.get(input.triggerActor) ?? -1,
          reasons: input.reasons,
          openActors: input.openActorIds,
          skipped: null,
          preflight: preflight.reason,
          requestId: adjustmentRequestId,
          proposalId: adjustmentProposal?.proposalId ?? completedCorrectionProposal?.proposalId ?? null,
          baselinePlanHash,
          resultPlanHash,
          changedActors: completion.updates.map((entry) => entry.proposal.actorId),
          outcome: completion.kind,
          sessionId: adjustmentSessionId,
          correctionSessionId: adjustmentCorrectionSessionId,
          rawContext: adjustmentTurnContext.raw,
          granularity: adjustmentTurnContext.granularity,
          stateBinding: {
            request: {
              revision: adjustmentSnapshot.capsule.revision,
              digest: adjustmentSnapshot.capsule.digest,
            },
            result: { revision: resultCapsule.revision, digest: resultCapsule.digest },
          },
          usage: tokenCounts(adjustmentUsage),
          toolCalls: adjustmentToolCalls() - toolCallsBeforeAdjustment,
          modelCalls: adapter.modelCalls - modelCallsBeforeAdjustment,
          flapRetries: adjustmentFlapRetries,
          refusals: currentAdjustmentRejections,
          correctionChain: refusedActorIds.length === 0 ? null : {
            refusedActorIds,
            result: completion.correctionResult,
            proposalId: completedCorrectionProposal?.proposalId ?? null,
            rawContext: adjustmentCorrectionContext?.raw ?? adjustmentTurnContext.raw,
            granularity: adjustmentCorrectionContext?.granularity ?? adjustmentTurnContext.granularity,
          },
          rlData: adjustmentRlData,
        });
      };
      try {
        if (options.failBeforeDispatch?.includes(key) === true) {
          throw new Error('SIMULATED host failure before agent dispatch.');
        }
        let proposed: RoundTurnProposalEnvelope | null = null;
        const toolCallsObserved = (): number =>
          simulated?.callsByRequest.get(requestId) ?? observedToolCalls;
        const contextCallsObserved = (): number =>
          simulated?.contextCallsByRequest.get(requestId) ?? observedTurnContextCalls;
        const rejectionsObserved = (): readonly ConversationChainAttemptEvidence[] =>
          simulated?.rejectionsByRequest.get(requestId) ?? observedRejections;
        const primaryPrompt = initialDecisionCatalog === null
          ? config.dmMode === 'blind'
            ? renderBlindEnginePrompt('plan_blind_round', capsule, RULES_SOURCE)
            : renderEnginePrompt('plan_round', capsule, RULES_SOURCE)
          : structuredFinalPrompt(rowTurnContext, initialDecisionCatalog);
        try {
          const dispatchAttempts = config.dmMode === 'blind' ? 1 : 3;
          for (let attempt = 0; attempt < dispatchAttempts; attempt += 1) {
            const dispatchLauncher = attempt === 0
              ? initialLauncher
              : await writeInitialLauncher(
                  `${key}-retry-${String(attempt + 1)}-initial`,
                );
            const callsBefore = toolCallsObserved();
            const contextCallsBefore = contextCallsObserved();
            const rejectionsBefore = rejectionsObserved().length;
            const retryNote = attempt === 0 ? '' :
              '[SERVICE_RETRY] The previous turn completed with no engine tool activity and no proposal. Retry the same round now.\n\n';
            const primaryInvocation = invocation(
              config, runId,
              'initial',
              initialDecisionCatalog === null
                ? config.dmMode === 'blind'
                  ? `${retryNote}Call engine.get_turn_context with granularity "full", then call engine.submit_blind_round_intents.\n\n${primaryPrompt}`
                  : `${retryNote}${turnContextPrompt(lastSeenTurnContext, config.intelMode)}\n\n${primaryPrompt}`
                : primaryPrompt,
              dispatchLauncher.manifestPath,
              journal.agentSession() === null ? startupInstructions : null,
              basePlanner,
              dispatchLauncher.recoveryManifestPath,
              initialToolSession,
              freshSessionContext,
              initialInvocationOutput,
              {
                engineDispatchId: dispatchLauncher.dispatchId,
                recoveryEngineDispatchId: dispatchLauncher.recoveryDispatchId,
              },
            );
            initialDispatchPlanner = plannerAttribution(primaryInvocation);
            if (config.dmMode === 'blind') {
              const priorPrompts = takeBlindIngressRecords(dispatchLauncher.blindIngressSpoolPath)
                .filter((record) => record.channel === 'initial_prompt' || record.channel === 'retry_prompt')
                .map((record) => record.text);
              const ingress = [
                ...(attempt === 0 ? [{ channel: 'startup' as const, text: startupInstructions }] : []),
                ...(priorPrompts.length === 0 ? [] : [{
                  channel: 'replay_history' as const,
                  text: canonicalJson(priorPrompts),
                }]),
                {
                  channel: attempt === 0 ? 'initial_prompt' as const : 'retry_prompt' as const,
                  text: primaryInvocation.prompt,
                },
                ...(boardImageArtifact?.blindState === undefined ? [] : [{
                  channel: 'image_metadata' as const,
                  text: canonicalJson({
                    role: boardImageArtifact.blindState.role,
                    ordinal: boardImageArtifact.blindState.ordinal,
                    sha256: boardImageArtifact.sha256,
                    primerVersion: boardImageArtifact.blindState.primerVersion,
                  }),
                }]),
              ];
              appendBlindIngress(dispatchLauncher.blindIngressSpoolPath, ingress);
              appendBlindIngress(dispatchLauncher.recoveryBlindIngressSpoolPath, ingress);
            }
            options.onPrimaryInvocation?.(primaryInvocation);
            options.onAgentInvocation?.(primaryInvocation);
            options.onPrimaryDispatchStart?.();
            initialCalls += 1;
            let turn: AgentTurnResult;
            try {
              if (journal.agentSession() === null) {
                const cold = await lifecycle.coldStartRound(primaryInvocation, new AbortController().signal);
                turn = cold.turn;
              } else {
                turn = await lifecycle.resumeRound(primaryInvocation, new AbortController().signal);
              }
            } catch (error) {
              if (!agentDispatchWasCancelled(error)) throw error;
              primaryDispatchTimedOut = true;
              if (initialDecisionCatalog !== null) {
                decisionAttempts += 1;
                decisionRejectionCodes.push('decision_timeout');
              }
              break;
            }
            primaryTurn = turn;
            primaryCatalogEvidence = turn.engineCatalogEvidence ?? (config.dmModeExplicit ? {
              status: 'inconclusive', dispatchId: dispatchLauncher.dispatchId,
              reason: 'no_correlated_catalog',
            } : null);
            activeInitialSpools = dispatchSpools(dispatchLauncher, turn);
            const recoveryDispatch = activeInitialSpools.proposal === dispatchLauncher.recoverySpoolPath;
            const correlatedContext = takeCorrelatedTurnContext(
              activeInitialSpools.context,
              config.turnContextMaximumBytes,
              primaryCatalogEvidence?.dispatchId ?? dispatchLauncher.dispatchId,
            );
            if (primaryCatalogEvidence !== null) {
              primaryDelivery = classifyTurnContextDelivery({
                turn,
                catalogEvidence: primaryCatalogEvidence,
                delivered: correlatedContext === null ? null : {
                  contextSha256: sha256(correlatedContext.raw),
                  measurement: deliveredTurnContextMeasurement(correlatedContext),
                },
              });
              if (primaryCatalogEvidence.status === 'inconclusive' &&
                (primaryDelivery.status === 'indeterminate' || turn.exit === 'infrastructure_failed')) {
                if (primaryDelivery.status !== 'indeterminate' && primaryDelivery.status !== 'delivered') {
                  throw new Error('Contradictory primary startup evidence produced an unsupported delivery state.');
                }
                persistD569IntegrityStop({
                  artifactPath: join(artifacts, `${key}-dispatch-integrity.json`),
                  rowPath: config.outPath,
                  scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
                  launcherPath: recoveryDispatch
                    ? dispatchLauncher.recoveryManifestPath
                    : dispatchLauncher.manifestPath,
                  proposalSpoolPath: activeInitialSpools.proposal,
                  contextSpoolPath: activeInitialSpools.context,
                  catalogEvidence: primaryCatalogEvidence,
                  delivery: primaryDelivery,
                  turn,
                });
              }
            }
            rolloutSessionId = turn.sessionId;
            captureCallUsage(turn, 'initial');
            decisionAttempts += 1;
            if (turn.exit !== 'completed') {
              serviceNull = true;
              if (initialDecisionCatalog !== null) {
                decisionRejectionCodes.push('decision_timeout');
              }
              if (turn.exit === 'cancelled' && config.dmModeExplicit && initialDecisionCatalog === null) {
                primaryDispatchTimedOut = false;
                outcome = 'infrastructure_failed';
                fallbackReason = 'dispatch_cancelled';
                if (primaryCatalogEvidence === null || primaryDelivery === null) {
                  throw new D569IntegrityStop('Cancelled D569 dispatch lacks correlated catalog or delivery evidence.');
                }
                failingDispatch = {
                  phase: 'primary', exit: 'cancelled',
                  dispatchId: primaryCatalogEvidence.dispatchId,
                  engineCatalogEvidence: primaryCatalogEvidence,
                  turnContextDelivery: primaryDelivery,
                  failureReason: turn.cancellationReason,
                };
              } else if (turn.exit === 'timed_out' || turn.exit === 'cancelled') {
                primaryDispatchTimedOut = true;
                outcome = 'refused';
                fallbackReason = 'timeout';
              } else if (turn.exit === 'infrastructure_failed') {
                outcome = 'infrastructure_failed';
                refusals.push(turn.failureReason);
                if (config.dmModeExplicit && (primaryCatalogEvidence === null || primaryDelivery === null)) {
                  throw new D569IntegrityStop('Failed D569 dispatch lacks correlated catalog or delivery evidence.');
                }
                if (primaryCatalogEvidence !== null && primaryDelivery !== null) failingDispatch = {
                  phase: 'primary', exit: 'infrastructure_failed',
                  dispatchId: primaryCatalogEvidence.dispatchId,
                  engineCatalogEvidence: primaryCatalogEvidence,
                  turnContextDelivery: primaryDelivery,
                  failureReason: turn.failureReason,
                };
              } else {
                outcome = 'refused';
              }
              break;
            }
            if (initialDecisionCatalog === null) {
              rowTurnContext = correlatedContext ?? rowTurnContext;
              proposed = localInitialProposal ?? takeRoundProposal(activeInitialSpools.proposal);
              if (decisionAttempts === 1) firstDecisionAccepted = proposed !== null;
            } else {
              const structured = queueStructuredFinalDecision({
                finalText: turn.finalText,
                exit: turn.exit,
                catalog: initialDecisionCatalog,
                state: engineSession.currentState(),
                snapshot: initialSnapshot,
                intelMode: config.intelMode,
                rendererProfile: config.rendererProfile,
                turnContextMaximumBytes: config.turnContextMaximumBytes,
                overridePolicy: config.overridePolicy,
                ...(lastSeenTurnContext === undefined ? {} : { turnContextDeltaBase: lastSeenTurnContext }),
                inheritedReactionGuidance: journal.reactionGuidance(),
                reasonGate: STRUCTURED_FINAL_DECISION_REASON_GATE,
              });
              if (structured.kind === 'accepted') {
                if (!isRoundProposal(structured.proposal)) {
                  throw new Error('Initial final-index decision queued a non-round proposal.');
                }
                proposed = structured.proposal;
                pendingStructuredDecision = structured.decision;
                if (decisionAttempts === 1) firstDecisionAccepted = true;
              } else {
                decisionRejectionCodes.push(structured.code);
                if (structured.normalizationCode !== null) normalizationCodes.push(structured.normalizationCode);
                if (structured.engineResult !== null) {
                  observedRejections.push(...rejectionEvidence(structured.engineResult));
                }
              }
            }
            const flapped = initialDecisionCatalog === null && turn.exit === 'completed' && proposed === null &&
              toolCallsObserved() === callsBefore && rejectionsObserved().length === rejectionsBefore;
            if (config.dmMode !== 'blind' && (contextCallsObserved() > contextCallsBefore || proposed !== null)) {
              lastSeenTurnContext = getCurrentTurnContext();
            }
            if (!flapped) break;
            if (initialDecisionCatalog !== null) break;
            if (attempt === dispatchAttempts - 1) {
              serviceNull = true;
              outcome = 'service_null';
              break;
            }
            flapRetries = attempt === 0 ? 1 : 2;
          }
        } finally {
          agentDispatched = adapter.modelCalls > modelCallsBeforeRound;
        }
        if (!serviceNull) {
        const engineRejections = simulated?.rejectionsByRequest.get(requestId) ?? observedRejections;
        const authorizationState = engineSession.currentState();
        const initial: InitialProposalAttempt = proposed === null ? {
          kind: 'exhausted', requestId, initialProposalId: `exhausted:${requestId}`,
          actorFailures: livingMonsterIds(authorizationState).map((actorId) => {
            const actorRejections = engineRejections.filter((entry) =>
              entry.actorId === null || entry.actorId === actorId);
            if (actorRejections.length > 0) failedAttempts.push(...actorRejections);
            else failedAttempts.push(
              { attempt: 'primary', actorId, declaredProposal: null, rejectionReasons: ['No engine rejection was returned because the agent submitted no initial proposal.'] },
              { attempt: 'fallback', actorId, declaredProposal: null, rejectionReasons: ['No engine rejection was returned because the agent submitted no fallback proposal.'] },
            );
            return { actorId, fallbackResult: actorRejections.length > 0 ? 'invalid' : 'absent' };
          }),
        } : { kind: 'proposal', proposal: proposed };
        const correctionRequest: EngineOrdinaryRoundCapsuleRequest = {
          runId, branchId, revision: contextRevision, requestId,
          phase: 'correction', room, historyKind: 'proposal_correction_requested',
        };
        const correctionSnapshot = engineSession.snapshot(correctionRequest);
        const correctionCapsule = correctionSnapshot.capsule;
        const correctionActorIds = correctionCapsule.request?.actors;
        if (correctionActorIds === undefined) throw new Error('Correction capsule has no actor set.');
        const correctionTurnContextBase = escalationPlanner === null
          ? lastSeenTurnContext
          : undefined;
          let plannedCorrectionTurnContext: CapturedTurnContext | undefined;
          const getPlannedCorrectionTurnContext = (): CapturedTurnContext => {
            plannedCorrectionTurnContext ??= plannedTurnContext(
              engineSession.currentState(),
              correctionSnapshot,
              correctionTurnContextBase,
              config.intelMode,
              config.rendererProfile,
              config.turnContextMaximumBytes,
            );
            return plannedCorrectionTurnContext;
          };
        const correctionDecisionCatalog = config.decisionTransport === 'final_indices'
          ? decisionCatalogForSnapshot(engineSession.currentState(), correctionSnapshot)
          : null;
        if (correctionDecisionCatalog !== null) {
          recordedCorrectionTurnContext = getPlannedCorrectionTurnContext();
        }
        const correctionInvocationOutput = correctionDecisionCatalog === null
          ? { kind: 'tool_driven' } as const
          : await structuredFinalOutput(
              config.decisionTransport,
              artifacts,
              `${key}-correction`,
              correctionDecisionCatalog,
            );
        const correctionLauncher = await writeLauncher({
          rendererProfile: config.rendererProfile,
          turnContextMaximumBytes: config.turnContextMaximumBytes,
          overridePolicy: config.overridePolicy,
          directory: artifacts, name: `${key}-correction`, snapshot: correctionSnapshot,
          room, historyKind: 'proposal_correction_requested',
          ...(config.dmModeExplicit ? { dmMode: config.dmMode } : {}),
          ...(config.dmMode === 'blind' ? {
            blindRepairArm: config.blindRepairArm,
            blindMaxAttempts: config.blindMaxAttempts,
            blindDeadlineUnixMs,
            blindFacts: config.blindFacts,
            blindVisuals: blindVisualDescriptors(boardImageArtifact),
            semanticBoardMaximumBytes: BLIND_SEMANTIC_BOARD_MAX_BYTES,
          } : {}),
          ...(launcherKbRead === undefined ? {} : { kbRead: launcherKbRead }),
          ...(correctionTurnContextBase === undefined || config.dmMode === 'blind' ? {} : {
            turnContextDeltaBase: correctionTurnContextBase,
          }),
          ...(boardImageBinding === undefined ? {} : { boardImage: boardImageBinding }),
        });
        let mainCorrectionSpools = {
          proposal: correctionLauncher.spoolPath,
          context: correctionLauncher.turnContextSpoolPath,
          uiFeedback: correctionLauncher.uiFeedbackSpoolPath,
          blindIntent: correctionLauncher.blindIntentSpoolPath,
          blindIngress: correctionLauncher.blindIngressSpoolPath,
        };
        correctionTurnContextSpoolPath = correctionLauncher.turnContextSpoolPath;
        correctionUiFeedbackSpoolPath = correctionLauncher.uiFeedbackSpoolPath;
        let localCorrectionProposal: RoundTurnProposalEnvelope | null = null;
        const correctionToolSession = config.cli === 'local-openai' ||
          options.simulatedInProcessDispatchDelayMs !== undefined
          ? inProcessDmToolSession({
              state: engineSession.currentState(),
              snapshot: correctionSnapshot,
              intelMode: config.intelMode,
              rendererProfile: config.rendererProfile,
              turnContextMaximumBytes: config.turnContextMaximumBytes,
              overridePolicy: config.overridePolicy,
              ...(rowKbReadBudget === undefined ? {} : {
                kbReadBudget: rowKbReadBudget,
                kbReadCallPhase: 'correction',
              }),
              ...(correctionTurnContextBase === undefined ? {} : {
                turnContextDeltaBase: correctionTurnContextBase,
              }),
              onProposal: (proposal) => {
                if (isRoundProposal(proposal)) localCorrectionProposal = proposal;
              },
              onToolResult: (name, result) => {
              observedToolCalls += 1;
              if (name === 'engine.get_turn_context') observedTurnContextCalls += 1;
              if (name === 'engine.get_turn_context') {
                recordedCorrectionTurnContext = capturedTurnContext(
                  JSON.stringify(result),
                  config.turnContextMaximumBytes,
                );
              }
                if (eventContextTrimmed(result)) observedContextTruncated = true;
                observedRejections.push(...rejectionEvidence(result));
              },
            })
          : undefined;
        const host: TurnExhaustionHost = {
          authorize: async (proposal) => {
            const expectedCapsule = proposal.phase === 'initial' ? capsule : correctionCapsule;
            const expectedRequest = proposal.phase === 'initial'
              ? authoritativeInitialRequest : correctionRequest;
            const authorizationCapsule = engineSession.authorizationCapsule(expectedRequest);
            authorizationStateBinding = {
              revision: authorizationCapsule.revision,
              digest: authorizationCapsule.digest,
            };
            if (proposal.runId !== runId || proposal.branchId !== branchId || proposal.requestId !== requestId ||
              proposal.expectedRevision !== contextRevision || proposal.stateDigest !== expectedCapsule.digest ||
              proposal.stateHandle !== engineStateHandle(expectedCapsule) ||
              authorizationCapsule.revision !== expectedCapsule.revision ||
              authorizationCapsule.digest !== expectedCapsule.digest) {
              failedAttempts.push({
                attempt: proposal.phase === 'correction' ? 'correction' : 'primary',
                actorId: null,
                declaredProposal: proposal.resolutions[0] === undefined
                  ? null : externalProposal(proposal.resolutions[0].proposal),
                rejectionReasons: ['Proposal binding does not match the authoritative run, branch, request, revision, digest, and state handle.'],
              });
              return 'invalidated';
            }
            const proposalTurnContext = config.captureRlData
              ? proposal.phase === 'initial'
                ? takeTurnContext(activeInitialSpools.context, config.turnContextMaximumBytes) ??
                  getPlannedInitialTurnContext()
                : takeTurnContext(mainCorrectionSpools.context, config.turnContextMaximumBytes) ??
                  getPlannedCorrectionTurnContext()
              : null;
            const proposalRlData = proposalTurnContext === null
              ? undefined
              : rlCapture(startupInstructions, proposalTurnContext, proposal, config.intelMode, {
                  repoCommit,
                  model: config.model,
                  effort: config.effort,
                  sessionId: rolloutSessionId,
                  parentPlanId: null,
                  partyPolicyHash: segmentPartyPlan?.policyHash ?? null,
                  materialityPolicyHash: config.combatModel === 'initiative_segments_v1'
                    ? PLAN_MATERIALITY_POLICY_HASH
                    : null,
                });
            const checkedProposal = authorizedMechanics(engineSession.currentState(), proposal);
            if (checkedProposal.entries === null) {
              failedAttempts.push(...(checkedProposal.divergences.length > 0
                ? checkedProposal.divergences
                : [{
                    attempt: proposal.phase === 'correction' ? 'correction' as const : 'primary' as const,
                    actorId: null,
                    declaredProposal: proposal.resolutions[0] === undefined
                      ? null : externalProposal(proposal.resolutions[0].proposal),
                    rejectionReasons: ['The engine could not authorize this proposal mechanic.'],
                  }]));
              return 'invalid';
            }
            const mechanics = checkedProposal.entries;
            const effectiveReactionGuidance = proposal.reactionGuidance ?? journal.reactionGuidance();
            try {
              for (const entry of mechanics) {
                if (entry.primaryRejectionReasons.length > 0) {
                  failedAttempts.push({
                    attempt: 'primary', actorId: entry.mechanics.actorId,
                    declaredProposal: entry.primaryDeclaredProposal,
                    rejectionReasons: entry.primaryRejectionReasons,
                  });
                }
              }
              if (config.combatModel === 'monster_block_v1') {
              const applied = engineSession.applyResolvedMechanics(mechanics, effectiveReactionGuidance);
              capsuleRevision += Math.max(1, applied.revisionDelta);
              recordAutoResolvedReactions(journal, applied);
              } else {
                for (const [index, entry] of mechanics.entries()) {
                  const resolution = proposal.resolutions[index];
                  if (resolution === undefined) {
                    throw new Error('Authorized segment plan lost an actor resolution.');
                  }
                  segmentMonsterPlan.set(entry.mechanics.actorId, {
                    proposal: structuredClone(resolution.proposal),
                    option: structuredClone(entry.option),
                    primaryOption: structuredClone(entry.primaryOption),
                    fallbackOption: structuredClone(entry.fallbackOption),
                    mechanics: entry.mechanics,
                    selectedBranch: entry.selectedBranch,
                    ...(entry.strictNoFallback === true ? { strictNoFallback: true as const } : {}),
                  });
                }
                segmentPlanId = proposal.proposalId;
              }
            } catch (error) {
              failedAttempts.push({
                attempt: proposal.phase === 'correction' ? 'correction' : 'primary',
                actorId: null,
                declaredProposal: mechanics[0]?.selectedDeclaredProposal ?? null,
                rejectionReasons: [error instanceof Error ? error.message : String(error)],
              });
              return 'invalid';
            }
            proposalId = proposal.proposalId;
            authorizedMonsterProposalHash = sha256(canonicalJson(proposal));
            acceptedSubmission = proposal.resolutions.map((entry) => structuredClone(entry.proposal));
            acceptedIntelCapture = proposal.intelCapture === undefined
              ? null : structuredClone(proposal.intelCapture);
            const structuredReasonByActor = new Map(
              pendingStructuredDecision?.selections.map((selection) => [selection.actorId, selection.reason]) ?? [],
            );
            authorizedPlan = mechanics.map((entry): ConversationAuthorizedActorPlan => ({
              actorId: entry.mechanics.actorId,
              reason: structuredReasonByActor.get(entry.mechanics.actorId) ?? entry.proposal.reason,
              acceptedProposal: structuredClone(entry.acceptedProposal),
              selectedBranch: entry.selectedBranch,
              resolutionSummary: {
                optionId: entry.mechanics.optionId,
                movementFeet: entry.mechanics.movementCostFeet,
                actionSlots: structuredClone(entry.mechanics.actionSlots),
              },
            }));
            capturedRlData = proposalRlData;
            roundRationale = proposal.rationale;
            roundNarrative = mechanics.map((entry) => entry.summary).join('; ');
            authorizedChosenOptionIndices = pendingStructuredDecision?.selections.map((selection) => ({
              actorId: selection.actorId,
              primaryOptionIndex: selection.primaryOptionIndex,
              fallbackOptionIndex: selection.fallbackOptionIndex,
            })) ?? [];
            const acceptingPlanner = proposal.phase === 'initial'
              ? initialDispatchPlanner
              : correctionDispatchPlanner;
            if (acceptingPlanner === null) {
              throw new Error(`Accepted ${proposal.phase} proposal has no dispatch attribution.`);
            }
            plannedBy = acceptingPlanner;
            if (proposal.reactionGuidance !== null) {
              journal.replaceReactionGuidance(
                proposal.requestId,
                proposal.proposalId,
                proposal.reactionGuidance,
              );
            }
            return 'authorized';
          },
          resolveDeterministically: async (actorId): Promise<DeterministicProposalResolution> => {
            const defaultEntry = engineDefaultPlanEntry(
              engineSession.currentState(),
              actorId,
              capsuleRevision,
            );
            const exhaustionEntry = defaultEntry.frontierResolution === 'fully_resolved'
              ? defaultEntry
              : simControllerPlanEntry(
                  engineSession.currentState(),
                  actorId,
                  capsuleRevision,
                );
            if (defaultEntry.frontierResolution === 'contains_unresolved') {
              autoSubmitBlocks.set(actorId, {
                actorId,
                reason: 'auto_submit_blocked_unresolved_frontier',
              });
            }
            exhaustionEntries.set(actorId, exhaustionEntry);
            if (config.intelMode === 'full') {
              exhaustionIntelCapture ??= captureDmIntel(
                engineSession.currentState(),
                correctionCapsule,
                canonicalEngineQueryPort,
              );
            }
            return {
              actorId,
              expectedRevision: capsuleRevision,
              resolutionDigest: exhaustionEntry.resolutionDigest,
            };
          },
          applyAutoResolved: async (resolution) => {
            const exhaustionEntry = exhaustionEntries.get(resolution.actorId);
            if (exhaustionEntry === undefined || exhaustionEntry.resolutionDigest !== resolution.resolutionDigest) {
              throw new Error(`Exhaustion resolution was not retained for ${resolution.actorId}.`);
            }
            if (config.combatModel === 'initiative_segments_v1') {
              segmentMonsterPlan.set(resolution.actorId, exhaustionEntry);
              return;
            }
            if (exhaustionEntries.size < correctionActorIds.length) return;
            const entries = correctionActorIds.map((actorId) => {
              const entry = exhaustionEntries.get(actorId);
              if (entry === undefined) throw new Error(`Exhaustion resolution is absent for ${actorId}.`);
              return entry;
            });
            const applied = engineSession.applyResolvedMechanics(entries, journal.reactionGuidance());
            capsuleRevision += Math.max(1, applied.revisionDelta);
            recordAutoResolvedReactions(journal, applied);
          },
          pauseForDmAdjudication: ({ actorId, reason }) => { refusals.push(`${actorId}: ${reason}`); },
        };
        const coordinated = await new TurnExhaustionCoordinator(journal.turnExhaustionPersistence()).coordinate({
          initial,
          authorizationFailurePolicy: config.dmMode === 'blind'
            ? { kind: 'refuse_blind' }
            : { kind: 'correct_with_dm_protocol' },
          correction: {
            capsule: correctionCapsule, rules: RULES_SOURCE,
            turnContext: {
              revision: contextRevision, room, round,
              get_turn_context: correctionTurnContextBase === undefined
                ? { granularity: 'full' }
                : {
                    granularity: 'turn_delta',
                    since_revision: correctionTurnContextBase.revision,
                  },
            },
            lifecycle: {
              resumeCorrection: async (correctionInvocation: AgentInvocation, signal: AbortSignal) => {
                options.onAgentInvocation?.(correctionInvocation);
                correctionDispatchPlanner = plannerAttribution(correctionInvocation);
                escalated = escalationPlanner !== null;
                firedEscalationModel = escalationPlanner === null
                  ? null
                  : correctionDispatchPlanner.model;
                /* A model-changing resume contaminates the persistent base session even when
                 * the next primary argv switches back. Keep untiered corrections in-session,
                 * but dispatch configured escalation as a fresh, repair-brief-seeded session. */
                const contextCallsBeforeCorrection = simulated?.contextCallsByRequest.get(requestId) ??
                  observedTurnContextCalls;
                correctionCalls += 1;
                recordedCorrectionTurnContext = getPlannedCorrectionTurnContext();
                let correctionTurn: AgentTurnResult;
                try {
                  correctionTurn = escalationPlanner === null
                    ? await lifecycle.resumeCorrection(correctionInvocation, signal)
                    : await lifecycle.startEscalation({
                        ...correctionInvocation,
                        instructions: escalationRepairInstructions,
                      }, signal);
                } catch (error) {
                  if (!agentDispatchWasCancelled(error)) throw error;
                  correctionDispatchTimedOut = true;
                  const activeBinding = journal.agentSession();
                  if (activeBinding === null) {
                    throw new Error('Timed-out correction has no retained agent session.');
                  }
                  correctionTurn = {
                    resumeSessionId: activeBinding.sessionId,
                    sessionId: null,
                    finalText: '',
                    usage: null,
                    exit: 'cancelled',
                    cancellationReason: 'legacy_adapter_cancellation',
                    processEvidence: null,
                    engineCatalogEvidence: null,
                    partialResultEvidence: {
                      status: 'partial', decodedEventCount: 0, finalTextFragment: '',
                      observedUsage: null, stagedInvocationIds: [],
                    },
                  };
                }
                mainCorrectionSpools = dispatchSpools(correctionLauncher, correctionTurn);
                enforceCompletedDispatchIntegrity({
                  turn: correctionTurn,
                  launcher: correctionLauncher,
                  spools: mainCorrectionSpools,
                  maximumBytes: config.turnContextMaximumBytes,
                  artifactPath: join(artifacts, `${key}-correction-dispatch-integrity.json`),
                  rowPath: config.outPath,
                  scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
                });
                correctionTurnContextSpoolPath = mainCorrectionSpools.context;
                correctionUiFeedbackSpoolPath = mainCorrectionSpools.uiFeedback;
                if (correctionTurn.exit === 'infrastructure_failed') {
                  failingDispatch = classifyFailedDispatch({
                    phase: 'correction', turn: correctionTurn,
                    contextSpoolPath: mainCorrectionSpools.context,
                    maximumBytes: config.turnContextMaximumBytes,
                  });
                }
                if (correctionTurn.exit !== 'completed') {
                  correctionDispatchTimedOut = correctionTurn.exit === 'timed_out';
                  captureCallUsage(correctionTurn, 'correction');
                  correctionFinalText = correctionTurn.finalText;
                  return correctionTurn;
                }
                if (escalationPlanner !== null &&
                  correctionTurn.resumeSessionId === journal.agentSession()?.sessionId) {
                  throw new Error('Tiered correction did not create an isolated escalation session.');
                }
                if (escalationPlanner === null) rolloutSessionId = correctionTurn.sessionId;
                else escalationSessionId = correctionTurn.sessionId;
                captureCallUsage(correctionTurn, 'correction');
                decisionAttempts += 1;
                recordedCorrectionTurnContext =
                  takeTurnContext(mainCorrectionSpools.context, config.turnContextMaximumBytes) ??
                  recordedCorrectionTurnContext;
                if (correctionDecisionCatalog !== null) {
                  const structured = queueStructuredFinalDecision({
                    finalText: correctionTurn.finalText,
                    exit: correctionTurn.exit,
                    catalog: correctionDecisionCatalog,
                    state: engineSession.currentState(),
                    snapshot: correctionSnapshot,
                    intelMode: config.intelMode,
                    rendererProfile: config.rendererProfile,
                    turnContextMaximumBytes: config.turnContextMaximumBytes,
                    overridePolicy: config.overridePolicy,
                    ...(correctionTurnContextBase === undefined ? {} : {
                      turnContextDeltaBase: correctionTurnContextBase,
                    }),
                    inheritedReactionGuidance: journal.reactionGuidance(),
                    reasonGate: STRUCTURED_FINAL_DECISION_REASON_GATE,
                  });
                  if (structured.kind === 'accepted') {
                    if (!isRoundProposal(structured.proposal)) {
                      throw new Error('Correction final-index decision queued a non-round proposal.');
                    }
                    localCorrectionProposal = structured.proposal;
                    pendingStructuredDecision = structured.decision;
                  } else {
                    decisionRejectionCodes.push(structured.code);
                    if (structured.normalizationCode !== null) normalizationCodes.push(structured.normalizationCode);
                    if (structured.engineResult !== null) {
                      observedRejections.push(...rejectionEvidence(structured.engineResult));
                    }
                  }
                }
                const contextCallsAfterCorrection = simulated?.contextCallsByRequest.get(requestId) ??
                  observedTurnContextCalls;
                if (escalationPlanner === null &&
                  contextCallsAfterCorrection > contextCallsBeforeCorrection) {
                  lastSeenTurnContext = fullTurnContextBase(
                    engineSession.currentState(),
                    correctionSnapshot,
                    config.intelMode,
                    config.rendererProfile,
                    config.turnContextMaximumBytes,
                  );
                }
                correctionFinalText = correctionTurn.finalText;
                return correctionTurn;
              },
            },
            invocation: invocation(
              config,
              runId,
              'correction',
              correctionDecisionCatalog === null
                ? 'replaced by correction renderer'
                : structuredFinalPrompt(getPlannedCorrectionTurnContext(), correctionDecisionCatalog),
              correctionLauncher.manifestPath,
              null,
              escalationPlanner ?? basePlanner,
              correctionLauncher.recoveryManifestPath,
              correctionToolSession,
              freshSessionContext,
              correctionInvocationOutput,
              {
                engineDispatchId: correctionLauncher.dispatchId,
                recoveryEngineDispatchId: correctionLauncher.recoveryDispatchId,
              },
            ),
            signal: new AbortController().signal,
            activateCapsule: () => undefined,
            takeProposal: () => localCorrectionProposal ?? takeRoundProposal(mainCorrectionSpools.proposal),
          },
          host,
        });
        outcome = coordinated.kind;
        if (coordinated.kind === 'refused') fallbackReason = coordinated.reason;
        if (coordinated.kind === 'infrastructure_failed') serviceNull = true;
        if (coordinated.kind === 'authorized') proposalId = coordinated.proposalId;
        if (coordinated.kind === 'auto_resolved') {
          const correctionRejections = simulated?.rejectionsByRequest.get(requestId) ?? observedRejections;
          if (correctionRejections.length > 0 &&
            !failedAttempts.some((entry) => entry.attempt === 'correction')) {
            failedAttempts.push(...correctionRejections.map((entry) => ({
              ...entry,
              attempt: 'correction' as const,
            })));
          }
          const correctionFailure = journal.turnExhaustionPersistence().transitions().find((entry) =>
            entry.kind === 'proposal_correction_failed' && entry.requestId === requestId);
          if (correctionFailure?.kind === 'proposal_correction_failed' &&
            !failedAttempts.some((entry) => entry.attempt === 'correction')) {
            failedAttempts.push({
              attempt: 'correction', actorId: null,
                declaredProposal: null,
              rejectionReasons: [correctionFailure.result === 'no_response'
                ? 'No engine rejection was returned because the correction dispatch submitted no proposal.'
                : `The engine rejected the correction as ${correctionFailure.result}.`],
            });
          }
          correctionFinalText = correctionFailure?.kind === 'proposal_correction_failed' &&
            correctionFailure.result === 'no_response' && correctionFinalText !== null
            ? truncateAgentFinalText(correctionFinalText)
            : null;
          const entries = coordinated.actorIds.map((actorId) => {
            const entry = exhaustionEntries.get(actorId);
            if (entry === undefined) throw new Error(`Exhaustion resolution is absent for ${actorId}.`);
            return entry;
          });
          const blockFacts = [...autoSubmitBlocks.values()]
            .sort((left, right) => left.actorId.localeCompare(right.actorId));
          const exhaustionPlannerLabel: ExhaustionPlannerLabel = blockFacts.length === 0
            ? 'engine_default'
            : 'sim_controller';
          fallbackReason = blockFacts.length > 0
            ? 'auto_submit_blocked'
            : primaryDispatchTimedOut || correctionDispatchTimedOut
              ? 'timeout'
              : engineRejections.length > 0 || proposed !== null
                ? 'validation_exhausted'
                : 'no_proposal';
          const exhaustionProposalId = `${exhaustionPlannerLabel === 'engine_default'
            ? 'engine-default'
            : 'sim-controller'}:${requestId}`;
          proposalId = exhaustionProposalId;
          acceptedSubmission = entries.map((entry) => structuredClone(entry.proposal));
          acceptedIntelCapture = exhaustionIntelCapture;
          authorizedMonsterProposalHash = sha256(canonicalJson(acceptedSubmission));
          authorizationStateBinding = {
            revision: correctionCapsule.revision,
            digest: correctionCapsule.digest,
          };
          authorizedPlan = entries.map((entry) => ({
            actorId: entry.proposal.actorId,
            reason: entry.proposal.reason,
            acceptedProposal: externalProposal(entry.proposal),
            selectedBranch: entry.selectedBranch,
            resolutionSummary: {
              optionId: entry.mechanics.optionId,
              movementFeet: entry.mechanics.movementCostFeet,
              actionSlots: structuredClone(entry.mechanics.actionSlots),
            },
          }));
          roundNarrative = entries.map((entry) => entry.summary).join('; ');
          planner = exhaustionPlannerLabel;
          if (config.combatModel === 'initiative_segments_v1') {
            segmentPlanId = exhaustionProposalId;
          }
          if (config.captureRlData) {
            if (config.intelMode === 'full' && exhaustionIntelCapture === null) {
              throw new Error('Exhaustion resolution omitted intel capture.');
            }
            const submittedArguments = {
              state_ref: {
                run_id: correctionCapsule.runId,
                state_handle: engineStateHandle(correctionCapsule),
                expected_revision: correctionCapsule.revision,
              },
              request_id: requestId,
              phase: 'correction',
              idempotency_key: `${exhaustionPlannerLabel}-${requestId}`,
              proposals: entries.map((entry) => externalProposal(entry.proposal)),
            };
            const syntheticProposal: RoundTurnProposalEnvelope = {
              kind: 'round_turn_proposal',
              proposalId: exhaustionProposalId,
              runId,
              branchId,
              requestId,
              expectedRevision: correctionCapsule.revision,
              stateDigest: correctionCapsule.digest,
              stateHandle: engineStateHandle(correctionCapsule),
              phase: 'correction',
              idempotencyKey: `${exhaustionPlannerLabel}-${requestId}`,
              resolutions: entries.map((entry) => ({
                proposal: entry.proposal,
                option: entry.option,
                primaryOption: entry.primaryOption,
                fallbackOption: entry.fallbackOption,
                mechanics: entry.mechanics,
                selectedBranch: entry.selectedBranch,
                resolutionDigest: entry.resolutionDigest,
                summary: entry.summary,
              })),
              rationale: null,
              reactionGuidance: journal.reactionGuidance(),
              submittedArguments,
              ...(exhaustionIntelCapture === null ? {} : { intelCapture: exhaustionIntelCapture }),
            };
            capturedRlData = rlCapture(
              startupInstructions,
              recordedCorrectionTurnContext ?? getPlannedCorrectionTurnContext(),
              syntheticProposal,
              config.intelMode,
              {
                repoCommit,
                model: config.model,
                effort: config.effort,
                sessionId: rolloutSessionId,
                parentPlanId: null,
                partyPolicyHash: segmentPartyPlan?.policyHash ?? null,
                materialityPolicyHash: config.combatModel === 'initiative_segments_v1'
                  ? PLAN_MATERIALITY_POLICY_HASH
                  : null,
                plannerLabel: exhaustionPlannerLabel,
                autoSubmitBlocks: blockFacts,
              },
            );
          }
          outcome = 'authorized';
          autoResolvedTrigger = blockFacts.length === 0
            ? 'The initial primary/fallback chain and single correction were exhausted; the engine auto-submitted its non-dominated default.'
            : 'The initial primary/fallback chain and single correction were exhausted; unresolved frontier competition blocked engine auto-submit, so the deterministic controller resolved the affected actor turns.';
        }
        if (coordinated.kind !== 'auto_resolved' && config.decisionTransport !== 'final_indices') {
          correctionFinalText = null;
        }
        }
        if (config.combatModel === 'initiative_segments_v1' && !serviceNull &&
          (outcome === 'authorized' || outcome === 'auto_resolved')) {
          initiativeExecutionPending = true;
          outcome = 'execution_failed';
          if (partyIsDefeated(engineSession.currentState())) {
            terminalOutcome = { kind: 'encounter_over', result: 'party_defeated' };
          } else {
          if (segmentPartyPlan === null || segmentPlanId === null) {
            throw new Error('Authorized initiative-segment round is missing a stored team plan.');
          }
          const openMonsters = new Set(livingMonsterIds(engineSession.currentState()));
          const acted = new Set<CombatantId>();
          let pcTurnOrdinal = 0;
          while (true) {
            options.onInitiativeIterationForTest?.();
            let state = engineSession.currentState();
            const activeActorId = state.activeCombatant;
            if (activeActorId === null) break;
            if (acted.has(activeActorId)) {
              if (state.phase.kind !== 'concluded' && state.round <= rendererState.round) {
                throw new Error(
                  `Initiative-segment round stalled on already-acted combatant ${activeActorId} ` +
                  `before advancing from round ${String(rendererState.round)}.`,
                );
              }
              break;
            }
            const active = state.combatants.find((entry) => entry.profile.id === activeActorId);
            if (active === undefined) throw new Error(`Active initiative actor ${activeActorId} is absent.`);
            if (active.life === 'dead') {
              throw new Error(`Dead initiative actor ${activeActorId} remained active.`);
            }
            if (active.profile.kind === 'player_character') {
              await startSpeculation(state, playerWindowBeforeNextMonster(state));
              if (inFlightSpeculation.current !== null && options.failAfterSpeculationStartForTest === true) {
                throw new Error('SIMULATED failure after speculation start.');
              }
              if (inFlightSpeculation.current !== null && options.endRoundAfterSpeculationStartForTest === true) break;
              pcTurnOrdinal += 1;
              const beforeState = state;
              const beforeOpenActorIds = [...openMonsters]
                .filter((actorId) => beforeState.combatants.some((entry) =>
                  entry.profile.id === actorId && entry.life !== 'dead'))
                .sort((left, right) => left.localeCompare(right));
              const beforeOptions = beforeOpenActorIds.map((actorId) => {
                const entry = segmentMonsterPlan.get(actorId);
                if (entry === undefined) throw new Error(`Open monster ${actorId} has no stored plan.`);
                return entry.option;
              });
              const materialized = materializeScriptedPartyTurn({
                state: beforeState,
                plan: segmentPartyPlan,
                actorId: activeActorId,
              });
              if (materialized.partyDefaultTurn !== null) partyDefaultTurn = true;
              const applied = engineSession.completeScriptedPcTurn(
                materialized,
                journal.reactionGuidance(),
              );
              capsuleRevision += Math.max(1, applied.revisionDelta);
              recordAutoResolvedReactions(journal, applied);
              acted.add(activeActorId);
              const afterState = engineSession.currentState();
              for (const actorId of [...openMonsters]) {
                if (!afterState.combatants.some((entry) =>
                  entry.profile.id === actorId && entry.life !== 'dead')) {
                  openMonsters.delete(actorId);
                }
              }
              const afterOpenActorIds = [...openMonsters].sort((left, right) => left.localeCompare(right));
              const materiality = evaluatePlanMateriality({
                before: {
                  state: beforeState,
                  openMonsterActorIds: beforeOpenActorIds,
                  remainingOptions: beforeOptions,
                },
                after: {
                  state: afterState,
                  openMonsterActorIds: afterOpenActorIds,
                  remainingOptions: afterOpenActorIds.map((actorId) => {
                    const entry = segmentMonsterPlan.get(actorId);
                    if (entry === undefined) throw new Error(`Open monster ${actorId} has no stored plan.`);
                    return entry.option;
                  }),
                },
              });
              pcTurns.push({
                actor: activeActorId,
                partyDefaultTurn: materialized.partyDefaultTurn,
                initiativeIndex: initiativeIndexByActor.get(activeActorId) ?? -1,
                beforeRevision: beforeState.revision,
                afterRevision: afterState.revision,
                plannedProgramHash: materialized.plannedProgramHash,
                executedProgramHash: materialized.executedProgramHash,
                commandSequence: structuredClone(materialized.reducerCommands),
                adherence: materialized.adherence,
                adherenceReasons: materialized.reasonCodes,
                beforeDigest: materiality.beforeDigest,
                afterDigest: materiality.afterDigest,
                material: materiality.material,
                materialityReasons: materiality.reasonCodes,
              });
              outcome = 'partial_execution';
              if (materiality.material && afterOpenActorIds.length > 0) {
                await dispatchPlanAdjustment({
                  triggerActor: activeActorId,
                  pcTurnOrdinal,
                  beforeRevision: beforeState.revision,
                  afterRevision: afterState.revision,
                  reasons: materiality.reasonCodes,
                  openActorIds: afterOpenActorIds,
                });
              }
              continue;
            }

            const segmentActors = maximalLivingMonsterSegment(state);
            if (segmentActors.length === 0) {
              throw new Error(`Active monster ${activeActorId} did not produce a monster initiative segment.`);
            }
            if (inFlightSpeculation.current !== null &&
              inFlightSpeculation.current.targetActorIds.includes(segmentActors[0]!)) {
              if (options.mutateBeforeSpeculationBoundary !== undefined) {
                engineSession.replaceEncounterState(options.mutateBeforeSpeculationBoundary(state));
                state = engineSession.currentState();
                capsuleRevision = Math.max(capsuleRevision, state.revision);
              }
              const pending = inFlightSpeculation.current;
              const boundaryStarted = clock();
              const completed = await pending.completion;
              if (completed.turn !== null) captureCallUsage(completed.turn, 'speculation');
              if (applyJoinedSpeculativeInfrastructure(completed)) {
                inFlightSpeculation.current = null;
                throw new CellInfrastructureAbort('Speculative engine MCP infrastructure failed.');
              }
              const decisionSnapshot = engineSession.snapshot({
                runId, branchId, revision: capsuleRevision,
                requestId: `${requestId}:speculation-decision`,
                phase: 'initial', room,
                historyKind: 'speculative_plan_decided',
                requestedActorIds: segmentActors,
              });
              let discardReason: ConversationSpeculationDiscardReason | null = null;
              let adoptedEntries: readonly SegmentMonsterPlanEntry[] | null = null;
              if (completed.timedOut) discardReason = 'budget_expired';
              else if (completed.error !== null || completed.plan === null) discardReason = 'dispatch_failed';
              else if (!sameCombatantSet(segmentActors, pending.targetActorIds)) {
                discardReason = 'target_disappeared';
              } else if (monsterPlanHash(segmentMonsterPlan) !== pending.baselinePlanHash) {
                discardReason = 'newer_adjustment_present';
              } else {
                const adoption = adoptSpeculativeBranch({
                  state,
                  actualRevision: capsuleRevision,
                  targetRoom: room,
                  targetMonsterRound: round,
                  targetActorIds: segmentActors,
                  plan: completed.plan,
                  sourceCapsule: pending.sourceSnapshot.capsule,
                });
                if (adoption.entries === null) discardReason = adoption.reason;
                else adoptedEntries = adoption.entries;
              }
              if (options.forceSpeculationRecalculationForTest === true) {
                discardReason = 'proposal_validation_failed';
                adoptedEntries = null;
              }
              if (adoptedEntries !== null) {
                for (const entry of adoptedEntries) {
                  segmentMonsterPlan.set(entry.proposal.actorId, entry);
                }
                segmentPlanId = `speculative:${monsterPlanHash(segmentMonsterPlan)}`;
              } else {
                const currentEntries = segmentActors.map((actorId) => segmentMonsterPlan.get(actorId))
                  .filter((entry): entry is SegmentMonsterPlanEntry => entry !== undefined);
                const rebound = options.forceSpeculationRecalculationForTest === true
                  ? null
                  : currentEntries.length === segmentActors.length
                  ? rebaseStoredPlanEntries({ state, actualRevision: capsuleRevision, entries: currentEntries })
                  : null;
                if (rebound === null) {
                  let recalculated: readonly SegmentMonsterPlanEntry[] | null = null;
                  if (completed.turn !== null) {
                    const recalculationRequestId = `${requestId}:speculation-recalc:${String(segmentActors[0])}`;
                    const recalculationSnapshot = engineSession.snapshot({
                      runId,
                      branchId,
                      revision: capsuleRevision,
                      requestId: recalculationRequestId,
                      phase: 'initial',
                      room,
                      historyKind: 'speculative_plan_recalculated',
                      requestedActorIds: segmentActors,
                    });
                    const recalculationLauncher = await writeLauncher({
                      rendererProfile: config.rendererProfile,
                      turnContextMaximumBytes: config.turnContextMaximumBytes,
                      overridePolicy: config.overridePolicy,
                      directory: artifacts,
                      name: `${key}-speculation-recalc-${String(segmentActors[0])}`,
                      snapshot: recalculationSnapshot,
                      room,
                      historyKind: 'speculative_plan_recalculated',
                      turnContextDeltaBase: pending.sourceTurnContext,
                      dispatchPhase: 'speculative',
                    });
                    let localRecalculationProposal: RoundTurnProposalEnvelope | null = null;
                    const recalculationToolSession = config.cli === 'local-openai' ||
                      options.simulatedInProcessDispatchDelayMs !== undefined
                      ? inProcessDmToolSession({
                          state,
                          snapshot: recalculationSnapshot,
                          intelMode: config.intelMode,
                          rendererProfile: config.rendererProfile,
                          turnContextMaximumBytes: config.turnContextMaximumBytes,
                          overridePolicy: config.overridePolicy,
                          turnContextDeltaBase: pending.sourceTurnContext,
                          onProposal: (proposal) => {
                            if (isRoundProposal(proposal)) localRecalculationProposal = proposal;
                          },
                          onToolResult: (name, result) => {
                            observedToolCalls += 1;
                            if (name === 'engine.get_turn_context') observedTurnContextCalls += 1;
                            if (eventContextTrimmed(result)) observedContextTruncated = true;
                            observedRejections.push(...rejectionEvidence(result));
                          },
                        })
                      : undefined;
                    if (completed.turn.exit !== 'completed') {
                      speculation = {
                        status: 'discarded', proposed: true, adopted: false, discarded: true,
                        discardReason: completed.turn.exit === 'timed_out' ? 'budget_expired' : 'dispatch_failed',
                        targetMonsterRound: pending.targetMonsterRound,
                        targetActorIds: pending.targetActorIds,
                        branchCount: pending.branchCount,
                        budgetMs: pending.budgetMs,
                        planningWallMs: completed.planningWallMs,
                        boundaryWaitMs: clock() - boundaryStarted,
                        plannedBy: pending.planner,
                        source: {
                          revision: pending.sourceSnapshot.capsule.revision,
                          digest: pending.sourceSnapshot.capsule.digest,
                        },
                        decision: {
                          revision: decisionSnapshot.capsule.revision,
                          digest: decisionSnapshot.capsule.digest,
                        },
                      };
                      speculations.push(speculation);
                      inFlightSpeculation.current = null;
                      outcome = 'refused';
                      serviceNull = true;
                      fallbackReason = completed.turn.exit === 'cancelled' ? 'dispatch_cancelled' : 'timeout';
                      initiativeExecutionPending = false;
                      throw new CellSpeculationDispatchAbort(
                        'Incomplete speculative dispatch could not be rebased; no default was executed.',
                      );
                    }
                    const binding: AgentSessionBinding = {
                      cli: adapter.kind,
                      sessionId: completed.turn.resumeSessionId,
                      adapterVersion: AGENT_ADAPTER_VERSION,
                      generation: 0,
                      rolloverTriggerCount: 0,
                      measuredRolloverThreshold: null,
                      lastDigestHash: null,
                      predecessorSessionHash: null,
                      startedAtRevision: pending.sourceSnapshot.capsule.revision,
                      lastDispatchedRevision: pending.sourceSnapshot.capsule.revision,
                      callUsage: [],
                      currentContextTokens: null,
                      status: 'active',
                    };
                    try {
                      const recalculationInvocation = invocation(
                        config,
                        runId,
                        'speculation_recalculation',
                        `${turnContextPrompt(pending.sourceTurnContext, config.intelMode)}\n\n${renderEnginePrompt('plan_round', recalculationSnapshot.capsule, RULES_SOURCE)}`,
                        recalculationLauncher.manifestPath,
                        null,
                        pending.planner,
                        recalculationLauncher.recoveryManifestPath,
                        recalculationToolSession,
                        freshSessionContext,
                        { kind: 'tool_driven' },
                        {
                          engineDispatchId: recalculationLauncher.dispatchId,
                          recoveryEngineDispatchId: recalculationLauncher.recoveryDispatchId,
                        },
                      );
                      options.onAgentInvocation?.(recalculationInvocation);
                      const recalculationTurn = await adapter.resume(
                        binding,
                        recalculationInvocation,
                        new AbortController().signal,
                      );
                      captureCallUsage(recalculationTurn, 'speculation_recalculation');
                      const recalculationSpools = dispatchSpools(recalculationLauncher, recalculationTurn);
                      enforceCompletedDispatchIntegrity({
                        turn: recalculationTurn,
                        launcher: recalculationLauncher,
                        spools: recalculationSpools,
                        maximumBytes: config.turnContextMaximumBytes,
                        artifactPath: join(artifacts, `${key}-speculation-recalc-${String(segmentActors[0])}-dispatch-integrity.json`),
                        rowPath: config.outPath,
                        scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
                      });
                      if (recalculationTurn.exit === 'infrastructure_failed') {
                        outcome = 'infrastructure_failed';
                        serviceNull = true;
                        refusals.push(recalculationTurn.failureReason);
                        failingDispatch = classifyFailedDispatch({
                          phase: 'speculation_recalculation', turn: recalculationTurn,
                          contextSpoolPath: recalculationSpools.context,
                          maximumBytes: config.turnContextMaximumBytes,
                        });
                        throw new CellInfrastructureAbort('Speculation recalculation engine MCP infrastructure failed.');
                      }
                      const proposal = recalculationTurn.exit === 'completed'
                        ? localRecalculationProposal ?? takeRoundProposal(recalculationSpools.proposal)
                        : null;
                      if (proposal !== null) {
                        const checked = authorizedMechanics(state, proposal);
                        if (checked.entries !== null && sameCombatantSet(
                          checked.entries.map((entry) => entry.proposal.actorId),
                          segmentActors,
                        )) {
                          recalculated = checked.entries.map((entry) => ({
                            proposal: structuredClone(entry.proposal),
                            option: structuredClone(entry.option),
                            primaryOption: structuredClone(entry.primaryOption),
                            fallbackOption: structuredClone(entry.fallbackOption),
                            mechanics: entry.mechanics,
                            selectedBranch: entry.selectedBranch,
                          }));
                        }
                      }
                    } catch (error) {
                      if (error instanceof D569IntegrityStop || error instanceof CellInfrastructureAbort) throw error;
                      recalculated = null;
                    }
                  }
                  recalculated ??= segmentActors.map((actorId) =>
                    engineDefaultPlanEntry(state, actorId, capsuleRevision));
                  for (const entry of recalculated) {
                    segmentMonsterPlan.set(entry.proposal.actorId, entry);
                  }
                  segmentPlanId = `recalculated:${monsterPlanHash(segmentMonsterPlan)}`;
                } else {
                  for (const entry of rebound) segmentMonsterPlan.set(entry.proposal.actorId, entry);
                }
              }
              const boundaryWaitMs = clock() - boundaryStarted;
              speculation = {
                status: adoptedEntries === null ? 'discarded' : 'adopted',
                proposed: true,
                adopted: adoptedEntries !== null,
                discarded: adoptedEntries === null,
                discardReason,
                targetMonsterRound: pending.targetMonsterRound,
                targetActorIds: pending.targetActorIds,
                branchCount: pending.branchCount,
                budgetMs: pending.budgetMs,
                planningWallMs: completed.planningWallMs,
                boundaryWaitMs,
                plannedBy: pending.planner,
                source: {
                  revision: pending.sourceSnapshot.capsule.revision,
                  digest: pending.sourceSnapshot.capsule.digest,
                },
                decision: {
                  revision: decisionSnapshot.capsule.revision,
                  digest: decisionSnapshot.capsule.digest,
                },
              };
              speculations.push(speculation);
              inFlightSpeculation.current = null;
            }
            const applications = segmentActors.map((actorId) => {
              if (!openMonsters.has(actorId)) {
                throw new Error(`Monster ${actorId} began a second turn in one initiative-segment round.`);
              }
              const entry = segmentMonsterPlan.get(actorId);
              if (entry === undefined) throw new Error(`Monster segment actor ${actorId} has no stored plan.`);
              openMonsters.delete(actorId);
              acted.add(actorId);
              return entry;
            });
            const segmentBeforeRevision = state.revision;
            const appliedPlanHash = monsterPlanHash(segmentMonsterPlan);
            const applied = engineSession.applyConsecutiveMonsterSegment(
              applications,
              journal.reactionGuidance(),
            );
            capsuleRevision += Math.max(1, applied.revisionDelta);
            recordAutoResolvedReactions(journal, applied);
            monsterSegments.push({
              actors: segmentActors,
              initiativeIndexes: segmentActors.map((actorId) =>
                initiativeIndexByActor.get(actorId) ?? -1),
              beforeRevision: segmentBeforeRevision,
              afterRevision: engineSession.currentState().revision,
              appliedPlanHash,
              deviationResolutions: applied.deviationResolutions,
            });
            outcome = 'partial_execution';
          }
          if (inFlightSpeculation.current !== null) {
            const pending = inFlightSpeculation.current;
            pending.controller.abort();
            const completed = await pending.completion;
            const joinedInfrastructureFailure = applyJoinedSpeculativeInfrastructure(completed);
            speculation = {
              status: 'discarded', proposed: true, adopted: false, discarded: true,
              discardReason: 'target_disappeared',
              targetMonsterRound: pending.targetMonsterRound,
              targetActorIds: pending.targetActorIds,
              branchCount: pending.branchCount,
              budgetMs: pending.budgetMs,
              planningWallMs: completed.planningWallMs,
              boundaryWaitMs: 0,
              plannedBy: pending.planner,
              source: {
                revision: pending.sourceSnapshot.capsule.revision,
                digest: pending.sourceSnapshot.capsule.digest,
              },
              decision: null,
            };
            speculations.push(speculation);
            inFlightSpeculation.current = null;
            if (joinedInfrastructureFailure) {
              throw new CellInfrastructureAbort('End-of-round speculative engine MCP infrastructure failed.');
            }
          }
          }
          outcome = 'authorized';
          initiativeExecutionPending = false;
        }
      } catch (error) {
        if (error instanceof D569IntegrityStop) throw error;
        if (inFlightSpeculation.current !== null) {
          const pending = inFlightSpeculation.current;
          pending.controller.abort();
          const completed = await pending.completion;
          const joinedInfrastructureFailure = applyJoinedSpeculativeInfrastructure(completed);
          speculation = {
            status: 'discarded', proposed: true, adopted: false, discarded: true,
            discardReason: 'target_disappeared',
            targetMonsterRound: pending.targetMonsterRound,
            targetActorIds: pending.targetActorIds,
            branchCount: pending.branchCount,
            budgetMs: pending.budgetMs,
            planningWallMs: completed.planningWallMs,
            boundaryWaitMs: 0,
            plannedBy: pending.planner,
            source: {
              revision: pending.sourceSnapshot.capsule.revision,
              digest: pending.sourceSnapshot.capsule.digest,
            },
            decision: null,
          };
          speculations.push(speculation);
          inFlightSpeculation.current = null;
          if (joinedInfrastructureFailure) {
            outcome = 'infrastructure_failed';
            initiativeExecutionPending = false;
          }
        }
        if (outcome === 'infrastructure_failed' || error instanceof CellInfrastructureAbort) {
          outcome = 'infrastructure_failed';
          initiativeExecutionPending = false;
        } else if (error instanceof CellSpeculationDispatchAbort) {
          initiativeExecutionPending = false;
        } else if (initiativeExecutionPending) {
          executionError = executionErrorClass(error);
        } else if (config.cli === 'local-openai' && selectedAdapter.classifyFailure(error) !== 'unknown') {
          outcome = 'local_error';
          serviceNull = false;
          flapRetries = 0;
        }
        if (!(error instanceof CellInfrastructureAbort)) {
          refusals.push(error instanceof Error ? error.message : String(error));
        }
      }
      const wall = clock() - started;
      const endToEndWall = clock() - roundStarted;
      const binding = journal.agentSession();
      rowTurnContext = takeTurnContext(
        activeInitialSpools.context,
        config.turnContextMaximumBytes,
      ) ?? rowTurnContext;
      if (correctionTurnContextSpoolPath !== null) {
        recordedCorrectionTurnContext = takeTurnContext(
          correctionTurnContextSpoolPath,
          config.turnContextMaximumBytes,
        ) ??
          recordedCorrectionTurnContext;
      }
      uiFeedback = takeUiFeedback(correctionUiFeedbackSpoolPath) ??
        takeUiFeedback(activeInitialSpools.uiFeedback);
      const recordedMonsterProposals = acceptedSubmission ??
        (segmentMonsterPlan.size === 0
          ? null
          : [...segmentMonsterPlan.values()].map((entry) => structuredClone(entry.proposal)));
      const teamPlans: ConversationTeamPlans = {
        party: segmentPartyPlan === null ? null : {
          planId: segmentPartyPlan.planId,
          planHash: segmentPartyPlan.planHash,
          sharedObjective: segmentPartyPlan.sharedObjective,
          programs: structuredClone(segmentPartyPlan.programs),
        },
        monsters: proposalId === null || authorizedMonsterProposalHash === null ||
          recordedMonsterProposals === null ? null : {
          initialProposalId: proposalId,
          initialProposalHash: authorizedMonsterProposalHash,
          authorizedProposals: recordedMonsterProposals,
        },
      };
      const totalsTokens = tokenCounts(roundUsage);
      const contextBytes = config.dmModeExplicit
        ? primaryDelivery?.status === 'delivered'
          ? new TextEncoder().encode(rowTurnContext.raw).byteLength
          : 0
        : [
            rowTurnContext.raw,
            ...(recordedCorrectionTurnContext === null ? [] : [recordedCorrectionTurnContext.raw]),
            ...adjustments.flatMap((entry) => entry.skipped === 'no_material_change' ? [] : [
              entry.rawContext,
              ...(entry.correctionChain === null ? [] : [entry.correctionChain.rawContext]),
            ]),
          ].reduce((total, context) => total + new TextEncoder().encode(context).byteLength, 0);
      const rendererEvidenceCacheKey = canonicalJson({
        startingRoomDigest,
        revision: initialSnapshot.capsule.revision,
        requestPhase: initialSnapshot.capsule.request?.phase ?? null,
        requestKind: initialSnapshot.capsule.request === null
          ? null
          : 'kind' in initialSnapshot.capsule.request
            ? initialSnapshot.capsule.request.kind ?? 'round_plan'
            : 'speculative',
        combatModel: config.combatModel,
        dmMode: config.dmMode,
        blindFacts: config.blindFacts,
        intelMode: config.intelMode,
        rendererProfile: config.rendererProfile,
        turnContextMaximumBytes: config.turnContextMaximumBytes,
        deltaBaseRevision: rendererDeltaBase?.revision ?? null,
      });
      let hostContextDiagnostic: HostContextDiagnostic = null;
      let diagnosticTurnContext: CapturedTurnContext | null = null;
      if (config.dmMode === 'blind' && rowTurnContext.value['dm_mode'] !== 'blind') {
        try {
          diagnosticTurnContext = getPlannedInitialTurnContext();
          hostContextDiagnostic = { status: 'rendered', contextSha256: sha256(diagnosticTurnContext.raw) };
        } catch (error) {
          hostContextDiagnostic = {
            status: 'unavailable',
            errorClass: error instanceof Error ? error.name : 'UnknownError',
          };
        }
      }
      const rendererEvidence = config.dmMode === 'blind'
        ? blindRendererEvidence(rendererState, capsule, diagnosticTurnContext ?? rowTurnContext)
        : initialRendererEvidence ?? plannedInitialTurnContext?.rendering ??
          options.rendererEvidenceCache?.get(rendererEvidenceCacheKey) ?? plannedTurnContext(
            rendererState,
            initialSnapshot,
            rendererDeltaBase,
            config.intelMode,
            config.rendererProfile,
            config.turnContextMaximumBytes,
          ).rendering;
      if (rendererEvidence === undefined) throw new Error('Turn-context renderer emitted no attribution evidence.');
      options.rendererEvidenceCache?.set(rendererEvidenceCacheKey, rendererEvidence);
      const optionsOmittedForSize = rendererEvidence.optionsOmittedForSizeByActor
        .reduce((total, actor) => total + actor.count, 0);
      const deliveredPrimaryContext = !config.dmModeExplicit || primaryDelivery?.status === 'delivered';
      const kbReads = rowKbSubjectSources === undefined
        ? []
        : decodeKbReadRecords(readFileSync(kbReadSpoolPath, 'utf8'));
      const overrideKinds = [...new Set((acceptedSubmission ?? []).flatMap((proposal) =>
        proposal.overrideJustification === null ? [] : [proposal.overrideJustification.kind]))]
        .sort((left, right) => left.localeCompare(right));
      const overrideRejections = failedAttempts.flatMap((attempt): readonly ConversationOverrideRejection[] =>
        attempt.rejectionCodes?.includes('OVERRIDE_UNJUSTIFIED') === true
          ? [{ actorId: attempt.actorId, code: 'OVERRIDE_UNJUSTIFIED' }]
          : []);
      if (outcome === 'authorized' && refusals.length > 0) {
        throw new Error('Authorized arena row cannot carry execution refusals.');
      }
      const boardImageFields: ConversationBoardImageFields = config.boardImageMode === 'off'
        ? { boardImage: { mode: 'off' }, boardImageEvidence: null }
        : boardImageArtifact === null || boardImagePrimaryDispatchStartedAtUnixMs === null
          ? (() => { throw new Error('Capturing board-image row cannot persist without a validated board artifact.'); })()
          : {
              boardImage: {
                mode: config.boardImageMode,
                sha256: boardImageArtifact.sha256,
                bytes: boardImageArtifact.bytes,
                width: boardImageArtifact.width,
                height: boardImageArtifact.height,
                captureMs: boardImageArtifact.captureMs,
                relativePath: boardImageArtifact.relativePath,
              },
              boardImageEvidence: {
                capturedAtUnixMs: boardImageArtifact.capturedAtUnixMs,
                primaryDispatchStartedAtUnixMs: boardImagePrimaryDispatchStartedAtUnixMs,
                source: { ...boardImageArtifact.source },
                chromiumVersion: boardImageArtifact.chromiumVersion,
              },
            };
      const sharedKbComponentHashes = knowledgeBase.kind === 'bundle'
        ? {
            root: knowledgeBase.componentSha256.root,
            tactics: knowledgeBase.componentSha256.tactics,
            ...Object.fromEntries(Object.entries(knowledgeBase.componentSha256.subjects)
              .map(([subject, hash]) => [subject, hash])),
          }
        : {};
      const d569AdviceFields = config.dmModeExplicit && config.dmMode === 'advice'
        ? (() => {
            if (boardImageArtifact === null) {
              throw new Error('Explicit D569 advice row lacks its independently captured board image.');
            }
            return {
            dmMode: 'advice' as const,
            blindFacts: false,
            midRoundAdjustmentsEnabled: false as const,
            blindRepairArm: config.blindRepairArm,
            blindMaxAttempts: config.blindMaxAttempts,
            blindIntentText: null,
            blindIntents: null,
            blindResolverOutcome: [],
            blindRejectionCodes: [],
            blindAttempts: [],
            blindResolverLatencyMs: 0,
            visualProfile: {
              primerVersion: 'standing-advice-board-image-v1',
              images: [{ role: 'dm_board' as const, sha256: boardImageArtifact.sha256, ordinal: 1 }],
              glyphMode: 'standing_default',
              captureTilePx: 128,
              perImageCaptureLatencyMs: [boardImageArtifact.captureMs],
              totalImageCaptureLatencyMs: boardImageArtifact.captureMs,
            },
            sharedKbComponentHashes,
            };
          })()
        : {};
      let d569BlindFields: Partial<ConversationBlindRowEvidence> = {};
      if (config.dmMode === 'blind') {
        const submissions = takeBlindIntentSubmissions(activeInitialSpools.blindIntent);
        const observedIngressRecords = takeBlindIngressRecords(activeInitialSpools.blindIngress);
        const ingressRecords = options.blindIngressAuditProbeText === undefined
          ? observedIngressRecords
          : [...observedIngressRecords, {
              ordinal: observedIngressRecords.length + 1,
              channel: 'initial_prompt' as const,
              text: options.blindIngressAuditProbeText,
              utf8Bytes: new TextEncoder().encode(options.blindIngressAuditProbeText).byteLength,
              sha256: sha256(options.blindIngressAuditProbeText),
            }];
        const offeredOptions = (capsule.request?.actors ?? []).flatMap((actorId) =>
          availableEngineActorOptions(optionProjectionState, actorId, canonicalEngineQueryPort, capsule.revision));
        const offeredOptionIds = offeredOptions.map((option) => String(option.optionId));
        if (primaryDelivery === null) throw new Error('Blind row lacks typed turn-context delivery evidence.');
        const ingressAudit = auditBlindIngress(ingressRecords, primaryDelivery, {
          offeredOptionIds,
          requiredText: [BLIND_INTENT_VERSION, 'creature_facts', 'legal_movement', BLIND_STATE_PRIMER_VERSION],
        });
        const finalSubmission = submissions.at(-1) ?? null;
        const finalParsed = finalSubmission === null
          ? null
          : blindRoundIntentEnvelopeSchema.safeParse(finalSubmission.envelope);
        const parsedIntents = finalParsed?.success === true ? finalParsed.data.intents : null;
        const attemptBaseline = blindDeadlineUnixMs - config.timeoutMs;
        let priorAttemptEnd = attemptBaseline;
        const blindAttempts = submissions.map((submission): ConversationBlindAttempt => {
          const parsed = blindRoundIntentEnvelopeSchema.safeParse(submission.envelope);
          const resolution = submission.resolution;
          const startedAtOffsetMs = Math.max(0, priorAttemptEnd - attemptBaseline);
          const entry: ConversationBlindAttempt = {
            number: submission.attempt,
            intentText: JSON.stringify(submission.envelope),
            parsedIntents: parsed.success ? parsed.data.intents : null,
            startedAtOffsetMs,
            endedAtOffsetMs: Math.max(startedAtOffsetMs, submission.endedAtUnixMs - attemptBaseline),
            modelWallMs: Math.max(0, submission.startedAtUnixMs - priorAttemptEnd),
            modelFirstTokenMs: null,
            resolverLatencyMs: submission.resolverLatencyMs,
            resolverOutcome: resolution.status,
            codes: resolution.status === 'rejected' ? resolution.codes : [],
            hintExposed: config.blindRepairArm === 'minimal_legal_alternative' &&
              resolution.status === 'rejected' && resolution.legalAlternative !== undefined,
          };
          priorAttemptEnd = submission.endedAtUnixMs;
          return entry;
        });
        const contextRecord = rowTurnContext.value;
        const deliveredContext = primaryDelivery.status === 'delivered';
        const deliveredMeasurement = primaryDelivery.status === 'delivered'
          ? primaryDelivery.measurement
          : null;
        const creatureFacts = !deliveredContext ? null
          : requiredRecord(contextRecord['creature_facts'], 'blind creature_facts');
        const legalMovement = !deliveredContext ? null
          : requiredRecord(contextRecord['legal_movement'], 'blind legal_movement');
        const semanticBoard = !deliveredContext || contextRecord['semantic_board'] === undefined
          ? null
          : requiredRecord(contextRecord['semantic_board'], 'blind semantic_board');
        const encodedEvidence = (value: unknown): { readonly sha256: string; readonly utf8Bytes: number } => {
          const bytes = canonicalJson(value);
          return { sha256: sha256(bytes), utf8Bytes: new TextEncoder().encode(bytes).byteLength };
        };
        const creatureEncoded = creatureFacts === null ? null : encodedEvidence(creatureFacts);
        const movementEncoded = legalMovement === null ? null : encodedEvidence(legalMovement);
        const creatureProvenance = creatureFacts === null ? null
          : requiredRecord(creatureFacts['provenance'], 'blind creature provenance');
        const rulesSources = creatureProvenance?.['rules_sources'];
        const movementProvenance = legalMovement === null ? null
          : requiredRecord(legalMovement['provenance'], 'blind movement provenance');
        const movementActors = legalMovement?.['actors'];
        const selectedOfferedIds = finalSubmission?.resolution.status === 'accepted'
          ? finalSubmission.resolution.actors.map((actor) => actor.selectedOptionId)
          : [];
        const engineTopRecommendationIds = (capsule.request?.actors ?? []).map((actorId) =>
          String(actorOpportunityReport(optionProjectionState, actorId, canonicalEngineQueryPort).defaultOption.optionId));
        const visual = boardImageArtifact?.blindState;
        if (visual === undefined || boardImageArtifact === null) {
          throw new Error('Blind row lacks state-only visual evidence.');
        }
        d569BlindFields = {
          dmMode: 'blind',
          blindFacts: config.blindFacts,
          midRoundAdjustmentsEnabled: false,
          blindContextVersion: 'blind-turn-context-v1',
          blindIntentVersion: BLIND_INTENT_VERSION,
          blindRepairArm: config.blindRepairArm,
          blindMaxAttempts: config.blindMaxAttempts,
          blindIntentText: finalSubmission === null ? null : JSON.stringify(finalSubmission.envelope),
          blindIntents: parsedIntents,
          blindResolverOutcome: finalSubmission?.resolution.status === 'accepted'
            ? finalSubmission.resolution.actors.map((actor) => ({
                actor: actor.actor,
                status: 'accepted' as const,
                semanticDigest: actor.semanticDigest,
              }))
            : finalSubmission?.resolution.actor === undefined ? [] : [{
                actor: finalSubmission.resolution.actor,
                status: 'rejected' as const,
                semanticDigest: null,
              }],
          blindRejectionCodes: submissions.flatMap((submission) =>
            submission.resolution.status === 'rejected' ? submission.resolution.codes : []),
          blindAttempts,
          blindResolverLatencyMs: blindAttempts.reduce((total, attempt) => total + attempt.resolverLatencyMs, 0),
          blindIngressAudit: ingressAudit,
          visualProfile: {
            primerVersion: visual.primerVersion,
            images: [{ role: visual.role, sha256: boardImageArtifact.sha256, ordinal: visual.ordinal }],
            glyphMode: visual.glyphMode,
            captureTilePx: visual.captureTilePx,
            perImageCaptureLatencyMs: [boardImageArtifact.captureMs],
            totalImageCaptureLatencyMs: boardImageArtifact.captureMs,
          },
          sharedKbComponentHashes,
          semanticBoardEvidence: semanticBoard === null ? null : {
            format: String(requiredRecord(semanticBoard['provenance'], 'blind semantic provenance')['format']),
            ...encodedEvidence(semanticBoard),
            omittedBlocks: ['reach_range_summaries'],
          },
          ...(creatureEncoded === null ? {} : { creatureFactsEvidence: {
            projectionVersion: 'blind-creature-facts-v1',
            ...creatureEncoded,
            sourceIds: Array.isArray(rulesSources) ? rulesSources.flatMap((source) => {
              const sourceId = asRecord(source)?.['source_id'];
              return typeof sourceId === 'string' ? [sourceId] : [];
            }) : [],
          } }),
          ...(movementEncoded === null || movementProvenance === null ? {} : { legalMovementEvidence: {
            projectionVersion: String(movementProvenance['query']),
            stateDigest: String(movementProvenance['state_digest']),
            ...movementEncoded,
            actorCellCounts: Array.isArray(movementActors) ? movementActors.map((actor) => {
              const entry = requiredRecord(actor, 'blind legal movement actor');
              return {
                name: String(entry['name']),
                badge: Number(entry['badge']),
                cells: Array.isArray(entry['cells']) ? entry['cells'].length : 0,
              };
            }) : [],
          } }),
          ...(deliveredMeasurement === null ? {} : { turnContextBudget: {
            configuredBaseBytes: BLIND_TURN_CONTEXT_MAX_BYTES,
            configuredSemanticBytes: BLIND_SEMANTIC_BOARD_MAX_BYTES,
            actualBaseBytes: deliveredMeasurement.baseBytes,
            actualSemanticBytes: deliveredMeasurement.semanticBytes,
            truncatedBlocks: [],
          } }),
          blindPrivateAnswerKey: {
            selectedOfferedIds,
            semanticDigests: finalSubmission?.resolution.status === 'accepted'
              ? finalSubmission.resolution.actors.map((actor) => actor.semanticDigest)
              : [],
            catalogDigest: sha256(canonicalJson(offeredOptions.map((option) => option.optionId).sort())),
            engineTopRecommendationIds,
            engineTopPolicyVersion: OPPORTUNITY_COST_POLICY,
            blindDiffersFromEngineTop: selectedOfferedIds.length === 0 ? null :
              selectedOfferedIds.some((id, index) => id !== engineTopRecommendationIds[index]),
          },
        };
      }
      const row: ConversationRow = {
        ...(config.dmModeExplicit ? (() => {
          if (primaryTurn === null || primaryCatalogEvidence === null || primaryDelivery === null) {
            throw new Error('D569 row lacks primary dispatch evidence.');
          }
          if (outcome === 'infrastructure_failed' && failingDispatch === null) {
            throw new D569IntegrityStop('D569 infrastructure outcome lacks failing-dispatch evidence.');
          }
          return {
            rowContractVersion: 'arena-row-v3' as const,
            scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
            dispatchId: primaryCatalogEvidence.dispatchId,
            engineCatalogEvidence: primaryCatalogEvidence,
            turnContextDelivery: primaryDelivery,
            turnContextConfiguredCaps: {
              baseBytes: config.turnContextMaximumBytes,
              semanticBytes: config.dmMode === 'blind' ? BLIND_SEMANTIC_BOARD_MAX_BYTES : SEMANTIC_BOARD_MAX_BYTES,
            },
            hostContextDiagnostic,
          };
        })() : {}),
        ...(failingDispatch === null ? {} : { failingDispatch }),
        knowledgeModel: 'engine_state',
        hiddenOptions,
        intelMode: config.intelMode,
        overridePolicy: config.overridePolicy,
        rendererAttribution: {
          policyVersion: RENDERER_POLICY_VERSION,
          profile: config.rendererProfile,
        },
        semanticBoardBytes: primaryDelivery?.status === 'delivered'
          ? primaryDelivery.measurement.semanticBytes
          : deliveredPrimaryContext ? rendererEvidence.semanticBoardBytes : null,
        baseContextBytes: primaryDelivery?.status === 'delivered'
          ? primaryDelivery.measurement.baseBytes
          : deliveredPrimaryContext ? rendererEvidence.baseContextBytes : null,
        semanticBoardTruncated: deliveredPrimaryContext ? rendererEvidence.semanticBoardTruncated : [],
        circumstanceFeatures: deliveredPrimaryContext ? rendererEvidence.features : {
          ...rendererEvidence.features,
          pre_trim_bytes: 0,
          trim_bytes_removed: 0,
          trim_engaged: false,
        },
        combatModel: config.combatModel,
        roundProtocolVersion: ROUND_PROTOCOL_VERSION,
        startingRoomDigest,
        room, round, cli: config.cli, model: config.model,
        effort: config.effort,
        escalationEffort: config.escalationEffort,
        uiFeedback,
        ...boardImageFields,
        thinkMode: config.localOpenAi?.thinkMode ?? null,
        contextRevision, projectionRevision: capsuleRevision,
        sessionId: rolloutSessionId,
        escalationSessionId,
        sessionIdHash: binding === null ? null : sha256(binding.sessionId),
        outcome,
        executionErrorClass: executionError,
        proposalId,
        kbHash: knowledgeBase.combinedStartupHash,
        instructionSource: config.instructionSource,
        skillName: config.skill,
        skillHash: instructionEnvironment.skillHash,
        kbReads,
        repoCommit,
        rawTurnContext: deliveredPrimaryContext ? rowTurnContext.raw : null,
        turnContextMaximumBytes: config.turnContextMaximumBytes,
        preTrimBytes: deliveredPrimaryContext ? rendererEvidence.preTrimBytes : null,
        postTrimBytes: deliveredPrimaryContext ? rendererEvidence.postTrimBytes : null,
        optionsOmittedForSize: deliveredPrimaryContext ? optionsOmittedForSize : 0,
        optionsOmittedForSizeByActor: deliveredPrimaryContext
          ? structuredClone(rendererEvidence.optionsOmittedForSizeByActor)
          : [],
        turnContextGranularity: deliveredPrimaryContext ? rowTurnContext.granularity : null,
        snippetHash: SNIPPET_REGISTRY.snippetHash,
        snippetSetHash: SNIPPET_REGISTRY.snippetSetHash,
        suggestedPlay: suggestedPlan?.play ?? null,
        suggestionAdopted: classifySuggestionAdoption(suggestedPlan?.proposals ?? null, acceptedSubmission),
        timeToFirstAction: wall,
        endToEndWall,
        wallPerCreature: wall / Math.max(1, livingMonsterIds(engineSession.currentState()).length),
        tokens: totalsTokens,
        callUsage: structuredClone(roundCallUsage),
        agentSessionGeneration: binding?.generation ?? 0,
        contextRolloverTriggerCount: binding?.rolloverTriggerCount ?? 0,
        contextRolloverThreshold: binding?.measuredRolloverThreshold ?? null,
        contextRolloverOccurred: (binding?.generation ?? 0) > generationBeforeRound &&
          (binding?.rolloverTriggerCount ?? 0) > 0,
        agentSessionDigestHash: binding === null ? null : journal.agentSessionDigest().hash,
        refusals,
        toolCalls: simulated?.callsByRequest.get(requestId) ?? observedToolCalls,
        callsPerRound: adapter.modelCalls - modelCallsBeforeRound,
        agentDispatched, flapRetries, serviceNull,
        decisionTransport: config.decisionTransport,
        firstDecisionAccepted,
        decisionAttempts,
        decisionRejectionCodes,
        normalizationCodes,
        ...(config.decisionTransport === 'final_indices' ? {
          chosenOptionIndices: authorizedChosenOptionIndices,
        } : {}),
        contextTruncated: deliveredPrimaryContext &&
          (simulated?.contextTruncatedByRequest.get(requestId) ?? observedContextTruncated),
        plannedBy,
        planner,
        overrideKinds,
        overrideRejections,
        fallbackReason,
        autoSubmitBlocks: [...autoSubmitBlocks.values()]
          .sort((left, right) => left.actorId.localeCompare(right.actorId)),
        partyDefaultTurn,
        terminalOutcome,
        escalated, escalationModel: firedEscalationModel,
        stateBinding: {
          capsule: { revision: capsule.revision, digest: capsule.digest },
          authorization: authorizationStateBinding,
        },
        authorizedPlan,
        rationale: roundRationale,
        roundNarrative,
        chainEvidence: { failedAttempts, autoResolvedTrigger, correctionFinalText },
        initiativeOrder,
        partyPolicyHash: segmentPartyPlan?.policyHash ?? null,
        materialityPolicyHash: config.combatModel === 'initiative_segments_v1'
          ? PLAN_MATERIALITY_POLICY_HASH
          : null,
        engineIntel: acceptedIntelCapture,
        adjustmentBudget: config.midRoundAdjustmentsEnabled && config.combatModel === 'initiative_segments_v1' ? 2 : 0,
        teamPlans,
        pcTurns,
        adjustments,
        monsterSegments,
        speculation,
        speculations,
        roundTotals: {
          initialCalls,
          adjustmentCalls,
          correctionCalls,
          serviceNullAdjustments,
          contextBytes,
          tokens: totalsTokens,
        },
        ...(capturedRlData === undefined ? {} : { rlData: capturedRlData }),
        ...d569AdviceFields,
        ...d569BlindFields,
      };
      rows.push(row);
      await appendFile(config.outPath, `${serializeConversationRow(row)}\n`, 'utf8');
      const persistedBlindAudit = d569BlindFields.blindIngressAudit;
      if (persistedBlindAudit?.version === 2 && !persistedBlindAudit.forbiddenContentPassed) {
        throw new D569IntegrityStop('Blind ingress contained forbidden content after the forensic row was persisted.');
      }
      completedRounds += 1;
      if (!restoredMidRun && options.restoreAfterRound === completedRounds) {
        const saved = journal.export();
        store = new MemoryBrowserSessionStore();
        importSavedSession(store, saved);
        journal = EncounterSessionJournal.resume(runId, store, new MemoryMirrorSink()).journal;
        lifecycle = new AgentSessionLifecycle(
          journal,
          adapter,
          AGENT_ADAPTER_VERSION,
          options.contextRolloverPolicy,
        );
        restoredMidRun = true;
      }
      if (terminalOutcome !== null) break;
    }
  }
  if (options.endSession === true) journal.endSession();
  const binding = journal.agentSession();
  return { rows, binding, journalExport: journal.export(), restoredMidRun };
}

export async function runConversation(
  config: ConversationConfig,
  options: ConversationRunOptions = {},
): Promise<ConversationRunResult> {
  const environmentKey = 'DND_LANE_INTEL_MODE';
  const previousMode = process.env[environmentKey];
  process.env[environmentKey] = config.intelMode;
  let ownedSnapshotService: ConversationBoardSnapshotService | null = null;
  try {
    if (config.boardImageMode !== 'off' && options.boardSnapshotService === undefined) {
      const outputDirectory = boardImageOutputDirectory(config);
      ownedSnapshotService = options.boardSnapshotServiceFactory === undefined
        ? await BoardSnapshotService.start({
            outputDirectory,
            ...(config.dmMode === 'blind' ? {
              informationMode: 'blind_state' as const,
              boardGlyphs: 'full' as const,
              captureTilePx: 128 as const,
              primerVersion: BLIND_STATE_PRIMER_VERSION,
            } : {}),
          })
        : await options.boardSnapshotServiceFactory(outputDirectory);
    }
    return await runConversationWithConfiguredIntel(config, {
      ...options,
      ...(ownedSnapshotService === null ? {} : { boardSnapshotService: ownedSnapshotService }),
    });
  } finally {
    await ownedSnapshotService?.close();
    if (previousMode === undefined) delete process.env[environmentKey];
    else process.env[environmentKey] = previousMode;
  }
}

async function main(): Promise<void> {
  await runConversation(parseConversationArgs(process.argv.slice(2)));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-conversation.ts') || invokedPath.endsWith('\\ai-dm-conversation.ts') ||
  ((invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs')) &&
    (process.argv.includes('--rounds') || process.argv.includes('--fixtures')))
)) await main();
