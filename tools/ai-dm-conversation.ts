import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { appendFile, mkdtemp, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createInterface, type Interface } from 'node:readline';
import { canonicalJson } from '../src/commands/canonical-json';
import type { PersistedCoordinatorState } from '../src/combat/coordinator';
import type { EncounterState } from '../src/combat/encounter';
import { mulberry32 } from '../src/combat/random';
import type { MonsterAttackAction } from '../src/combat/statblock';
import {
  agentSessionId, combatantId, encounterBranchId, encounterSessionId,
  type CombatantId, type EncounterBranchId, type EncounterSessionId,
} from '../src/combat/values';
import { sha256 } from '../src/crypto/sha256';
import {
  type AgentAdapterKind, type AgentCliKind, type AgentFailureClassification, type AgentInvocation, type AgentSessionAdapter,
  type AgentSessionBinding, type AgentToolSession, type AgentTurnResult, type AgentUsage,
} from '../src/vtt/agent-session';
import { AgentSessionLifecycle } from '../src/vtt/agent-session-lifecycle';
import { AGENT_ADAPTER_VERSION, resolveAgentAdapter } from '../src/vtt/agent-adapters';
import {
  LocalOpenAiAgentSessionAdapter,
  type LocalOpenAiConfig,
  type LocalThinkMode,
} from '../src/vtt/agent-adapters/local-openai';
import type {
  PlanAdjustmentProposalEnvelope,
  ProposedIntentResolution,
  RoundIntentProposalEnvelope,
} from '../src/vtt/engine-envelopes';
import { engineStateHandle, type EnginePlanAdjustmentMetadata } from '../src/vtt/engine-state-capsule';
import {
  EngineRoundSession,
  type EngineBoundaryResolutions,
  type EngineIntentDeviation,
  type EngineRoundCapsuleRequest,
  type EngineRoundSnapshot,
} from '../src/vtt/engine-round-session';
import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';
import {
  pureIntentResolver, type EngineActionChoice, type EngineIntentBranch,
  type EngineTurnIntent, type ResolvedIntentMechanics,
} from '../src/vtt/intent-resolver';
import { SNIPPET_REGISTRY, type PlayName } from '../src/vtt/snippet-registry-runtime';
import { mcpRequestMeta } from '../src/vtt/mcp/handler';
import {
  createEngineMcpRuntime, loadArenaFixture, type EngineMcpLauncherManifest,
} from '../src/vtt/mcp/entrypoint';
import type { TurnContextDeltaBase } from '../src/vtt/mcp/engine-server';
import { renderEnginePrompt, TURN_CONTEXT_MAX_BYTES } from '../src/vtt/mcp/engine-server';
import {
  applyRevisionDelta,
  type RevisionDeltaOperation,
} from '../src/vtt/dm-bridge/projection-transport';
import {
  EncounterSessionJournal, importSavedSession, MemoryBrowserSessionStore,
  MemoryMirrorSink, type BrowserSessionStore,
} from '../src/vtt/session-persistence';
import {
  TurnExhaustionCoordinator, type DeterministicIntentResolution,
  type InitialIntentAttempt, type TurnExhaustionHost,
} from '../src/vtt/turn-exhaustion-coordinator';
import type { UnattendedReactionAskDefault } from '../src/vtt/reaction-offer-host-policy';
import {
  type ReactionGuidanceDeclaration,
} from '../src/vtt/reaction-guidance';
import {
  createScriptedPartyPlan,
  materializeScriptedPartyTurn,
  type ScriptedPartyAdherence,
  type ScriptedPartyAdherenceReasonCode,
  type ScriptedPartyPlan,
} from '../src/vtt/scripted-party-round';
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

export const CONVERSATION_CLIS = ['codex', 'claude-code', 'local-openai'] as const;
export type ConversationCli = (typeof CONVERSATION_CLIS)[number];
export const CONVERSATION_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;
export type ConversationEffort = (typeof CONVERSATION_EFFORTS)[number];
export const COMBAT_MODELS = ['monster_block_v1', 'initiative_segments_v1'] as const;
export type CombatModel = (typeof COMBAT_MODELS)[number];
export const ROUND_PROTOCOL_VERSION = 2 as const;

const INITIAL_COORDINATOR_STATE: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};
const RULES_SOURCE = { get: () => null } as const;

export interface ConversationConfig {
  readonly combatModel: CombatModel;
  readonly fixturesPath: string;
  readonly rooms: number;
  readonly rounds: number;
  readonly cli: ConversationCli;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly escalationModel: string | null;
  readonly escalationEffort: ConversationEffort | null;
  readonly outPath: string;
  readonly dryRun: boolean;
  readonly cwd: string;
  readonly cliBin: string;
  readonly timeoutMs: number;
  readonly kbPath: string | null;
  readonly reactionAskDefault: UnattendedReactionAskDefault;
  readonly captureRlData: boolean;
  readonly localOpenAi: LocalOpenAiConfig | null;
}

export interface ConversationRlDataV1 {
  readonly format: 'arena-rl-capture-v1';
  readonly sourceLicense: 'project-generated';
  readonly sessionInstructions: string;
  readonly turnContext: Readonly<Record<string, unknown>>;
  readonly submitRoundIntentsArguments: Readonly<Record<string, unknown>>;
  readonly stateDigest: string;
}

export type ConversationRlTask = 'round_plan' | 'plan_adjustment';
export type ConversationRlSubmissionTool =
  | 'engine.submit_round_intents'
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
}

export type ConversationRlData = ConversationRlDataV1 | ConversationRlDataV2;

export interface ConversationTokenCounts {
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
  readonly reasoning: number;
}

export interface ConversationChainAttemptEvidence {
  readonly attempt: 'primary' | 'fallback' | 'correction';
  readonly actorId: CombatantId | null;
  readonly declaredIntent: Readonly<Record<string, unknown>> | null;
  readonly rejectionReasons: readonly string[];
}

export interface ConversationChainEvidence {
  readonly failedAttempts: readonly ConversationChainAttemptEvidence[];
  readonly autoResolvedTrigger: string | null;
  readonly correctionFinalText: string | null;
}

export interface ConversationAuthorizedActorPlan {
  readonly actorId: CombatantId;
  readonly acceptedIntent: Readonly<Record<string, unknown>>;
  readonly selectedBranch: 'primary' | 'fallback';
  readonly resolutionSummary: {
    readonly actionId: string;
    readonly targetId: CombatantId | null;
    readonly movementFeet: number;
  };
}

export interface ConversationPcTurn {
  readonly actor: CombatantId;
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

export interface ConversationAdjustment {
  readonly trigger: CombatantId;
  readonly triggerPcTurnOrdinal: number;
  readonly triggerInitiativeIndex: number;
  readonly reasons: readonly PlanMaterialityReasonCode[];
  readonly openActors: readonly CombatantId[];
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
}

export interface ConversationMonsterSegment {
  readonly actors: readonly CombatantId[];
  readonly initiativeIndexes: readonly number[];
  readonly beforeRevision: number;
  readonly afterRevision: number;
  readonly appliedPlanHash: string;
  readonly deviationResolutions: readonly EngineIntentDeviation[];
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
    readonly authorizedIntents: readonly EngineTurnIntent[];
  };
}

export interface ConversationSuggestedPlay {
  readonly name: PlayName;
  readonly hash: string;
}

export type ConversationSuggestionAdoption = 'as_is' | 'edited' | 'ignored';
type SimulatedSuggestionResponse = ConversationSuggestionAdoption | 'legacy';

export interface ConversationRow {
  readonly combatModel: CombatModel;
  readonly roundProtocolVersion: typeof ROUND_PROTOCOL_VERSION;
  readonly startingRoomDigest: string;
  readonly room: number;
  readonly round: number;
  readonly cli: ConversationCli;
  readonly model: string;
  readonly thinkMode: LocalThinkMode | null;
  readonly contextRevision: number;
  readonly projectionRevision: number;
  /** Codex rollout ID; locate its full log with a rollout-*-<id>.jsonl glob. */
  readonly sessionId: string | null;
  readonly escalationSessionId: string | null;
  readonly sessionIdHash: string | null;
  readonly kbHash: string | null;
  readonly repoCommit: string;
  readonly rawTurnContext: string;
  readonly turnContextGranularity: 'full' | 'turn_delta';
  readonly snippetHash: string;
  readonly snippetSetHash: string;
  readonly suggestedPlay: ConversationSuggestedPlay | null;
  readonly suggestionAdopted: ConversationSuggestionAdoption | null;
  readonly outcome: 'authorized' | 'auto_resolved' | 'awaiting_dm_adjudication' | 'refused' | 'service_null' | 'local_error';
  readonly proposalId: string | null;
  readonly timeToFirstAction: number;
  readonly wallPerCreature: number;
  readonly tokens: ConversationTokenCounts;
  readonly refusals: readonly string[];
  readonly toolCalls: number;
  readonly callsPerRound: number;
  readonly agentDispatched: boolean;
  readonly flapRetries: 0 | 1 | 2;
  readonly serviceNull: boolean;
  readonly contextTruncated: boolean;
  readonly plannedBy: ConversationPlannerAttribution | 'sim_controller' | null;
  readonly escalated: boolean;
  readonly escalationModel: string | null;
  readonly stateBinding: {
    readonly capsule: { readonly revision: number; readonly digest: string };
    readonly authorization: { readonly revision: number; readonly digest: string } | null;
  };
  readonly authorizedPlan: readonly ConversationAuthorizedActorPlan[] | null;
  readonly roundNarrative: string | null;
  readonly chainEvidence: ConversationChainEvidence;
  readonly initiativeOrder: readonly CombatantId[];
  readonly partyPolicyHash: string | null;
  readonly materialityPolicyHash: string | null;
  readonly adjustmentBudget: number;
  readonly teamPlans: ConversationTeamPlans;
  readonly pcTurns: readonly ConversationPcTurn[];
  readonly adjustments: readonly ConversationAdjustment[];
  readonly monsterSegments: readonly ConversationMonsterSegment[];
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

export interface ConversationPlannerAttribution {
  readonly model: string;
  readonly effort: ConversationEffort;
}

export interface ConversationRunResult {
  readonly rows: readonly ConversationRow[];
  readonly binding: AgentSessionBinding | null;
  readonly journalExport: string;
  readonly restoredMidRun: boolean;
}

export interface ConversationRunOptions {
  readonly roomStates?: readonly EncounterState[];
  readonly store?: BrowserSessionStore;
  readonly adapter?: AgentSessionAdapter;
  readonly onPrimaryDispatchStart?: () => void;
  /** Test-only browser-reload proof point; one-based completed round count. */
  readonly restoreAfterRound?: number;
  /** SIMULATED-only exhaustion cases, encoded as `room-N-round-N`. */
  readonly exhaustInitial?: readonly string[];
  readonly invalidInitial?: readonly string[];
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
  if (pathIsInside(cwd, candidate) && !pathIsInside(resolve(cwd, 'tests/fixtures'), candidate)) {
    throw new TypeError('--kb must be outside the repository working tree or within tests/fixtures.');
  }
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
      '--combat-model',
      '--local-base-url', '--local-model', '--local-api-key', '--local-think',
    ].includes(option ?? '')) throw new TypeError(`Unknown conversation option ${option ?? '<missing>'}.`);
    values.set(option ?? '', requiredValue(argv, index, option ?? '<missing>'));
    index += 1;
  }
  const outPath = resolve(values.get('--out') ?? '');
  if ((values.get('--out') ?? '').length === 0) throw new TypeError('--out is required.');
  if (pathIsInside(cwd, outPath)) throw new TypeError('--out must be outside the repository working tree.');
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
  const kbPath = values.has('--kb') ? resolve(values.get('--kb') ?? '') : null;
  if (kbPath !== null) validateKbPath(cwd, kbPath);
  if (captureRlData && kbPath !== null && !pathIsInside(resolve(cwd, 'tests/fixtures'), kbPath)) {
    throw new TypeError('--capture-rl-data requires a project fixture KB or no KB.');
  }
  const reactionAskDefault = values.get('--reaction-ask-default') ?? 'decline';
  if (reactionAskDefault !== 'decline' && reactionAskDefault !== 'take') {
    throw new TypeError('--reaction-ask-default must be decline or take.');
  }
  const combatModel = values.get('--combat-model') ?? 'monster_block_v1';
  if (!COMBAT_MODELS.includes(combatModel as CombatModel)) {
    throw new TypeError('--combat-model must be monster_block_v1 or initiative_segments_v1.');
  }
  return {
    combatModel: combatModel as CombatModel,
    fixturesPath: resolve(values.get('--fixtures') ?? 'tests/fixtures/arena-basis'),
    rooms: positiveInteger(values.get('--rooms') ?? '12', '--rooms'),
    rounds: positiveInteger(values.get('--rounds') ?? values.get('--reps') ?? '1', '--rounds'),
    cli: selectedCli,
    model: localOpenAi?.model ?? values.get('--model') ?? (selectedCli === 'codex' ? 'gpt-5.6-sol' : 'sonnet'),
    effort: effort as ConversationEffort,
    escalationModel,
    escalationEffort: escalationEffort as ConversationEffort | null,
    outPath,
    dryRun,
    cwd: resolve(cwd),
    cliBin: values.get('--cli-bin') ?? (selectedCli === 'codex' ? 'codex' : selectedCli === 'claude-code' ? 'claude' : ''),
    timeoutMs: positiveInteger(values.get('--timeout-ms') ?? '120000', '--timeout-ms'),
    kbPath,
    reactionAskDefault,
    captureRlData,
    localOpenAi,
  };
}

async function loadKnowledgeBase(config: ConversationConfig): Promise<{
  readonly text: string;
  readonly hash: string;
} | null> {
  if (config.kbPath === null) return null;
  const sourcePath = await realpath(config.kbPath);
  validateKbPath(config.cwd, sourcePath);
  const bytes = await readFile(sourcePath);
  return {
    text: bytes.toString('utf8'),
    hash: createHash('sha256').update(bytes).digest('hex'),
  };
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
      const declaredIntent = asRecord(attempt?.['declared_intent']);
      if ((attemptKind !== 'primary' && attemptKind !== 'fallback') ||
        !Array.isArray(reasons) || !reasons.every((reason) => typeof reason === 'string')) return [];
      return [{
        attempt: attemptKind,
        actorId,
        declaredIntent: declaredIntent === null ? null : structuredClone(declaredIntent),
        rejectionReasons: reasons as readonly string[],
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
    attempt: 'primary', actorId: null, declaredIntent: null, rejectionReasons: reasons,
  }];
}

function tokenCounts(usage: AgentUsage | null): ConversationTokenCounts {
  return usage === null ? { input: 0, cachedInput: 0, output: 0, reasoning: 0 } : {
    input: usage.inputTokens,
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
    inputTokens: total.inputTokens + usage.inputTokens,
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

interface SegmentMonsterPlanEntry {
  readonly intent: EngineTurnIntent;
  readonly mechanics: ResolvedIntentMechanics;
  readonly selectedBranch: 'primary' | 'fallback';
}

function monsterPlanHash(plan: ReadonlyMap<CombatantId, SegmentMonsterPlanEntry>): string {
  return sha256(canonicalJson([...plan.values()]
    .map((entry) => entry.intent)
    .sort((left, right) => left.actorId.localeCompare(right.actorId))));
}

function deterministicDodgePlanEntry(state: EncounterState, actorId: CombatantId): SegmentMonsterPlanEntry {
  const intent: EngineTurnIntent = {
    actorId,
    choice: { kind: 'dodge' },
    movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
    engagement: { stance: 'hold_position' },
    fallback: null,
  };
  const resolution = pureIntentResolver.resolve(state, intent);
  if (!resolution.valid) throw new Error(`Could not stage deterministic Dodge for ${actorId}.`);
  return {
    intent,
    mechanics: resolution.mechanics,
    selectedBranch: resolution.selectedBranch,
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

function externalTarget(target: Extract<EngineActionChoice, { readonly kind: 'attack' }>['target']): Readonly<Record<string, unknown>> {
  switch (target.kind) {
    case 'combatant': return { kind: 'combatant', combatant_id: target.combatantId };
    case 'enemy_threatening_ally': return { kind: target.kind, ally_id: target.allyId };
    case 'nearest_visible_enemy':
    case 'lowest_hp_visible_enemy':
    case 'most_injured_visible_ally':
    case 'current_threat': return { kind: target.kind };
  }
}

function externalChoice(choice: EngineActionChoice): Readonly<Record<string, unknown>> {
  switch (choice.kind) {
    case 'attack': return {
      kind: choice.kind, action_id: choice.actionId, target: externalTarget(choice.target),
      ...(choice.resourcePolicy === undefined ? {} : { resource_policy: choice.resourcePolicy }),
    };
    case 'cast_spell': return {
      kind: choice.kind, spell_id: choice.spellId,
      target: choice.target === null ? null : externalTarget(choice.target),
      ...(choice.slotPolicy === undefined ? {} : { slot_policy: choice.slotPolicy }),
    };
    case 'use_action': return {
      kind: choice.kind, action_id: choice.actionId,
      target: choice.target === null ? null : externalTarget(choice.target),
    };
    case 'dodge':
    case 'disengage':
    case 'dash':
    case 'end_turn': return { kind: choice.kind };
  }
}

function externalBranch(branch: EngineIntentBranch): Readonly<Record<string, unknown>> {
  return {
    choice: externalChoice(branch.choice),
    movement: {
      willingness: branch.movement.willingness,
      ...(branch.movement.maximumFeet === undefined ? {} : { maximum_feet: branch.movement.maximumFeet }),
      opportunity_risk: branch.movement.opportunityRisk,
    },
    engagement: {
      stance: branch.engagement.stance,
      ...(branch.engagement.anchor === undefined ? {} : {
        anchor: branch.engagement.anchor === null ? null : externalTarget(branch.engagement.anchor),
      }),
    },
  };
}

function externalIntent(intent: EngineTurnIntent): Readonly<Record<string, unknown>> {
  return {
    actor_id: intent.actorId,
    ...externalBranch(intent),
    fallback: intent.fallback === null ? null : externalBranch(intent.fallback),
  };
}

interface SuggestedPlanBookkeeping {
  readonly play: ConversationSuggestedPlay;
  readonly intents: readonly EngineTurnIntent[];
}

function suggestedPlanBookkeeping(capsule: EngineRoundSnapshot['capsule']): SuggestedPlanBookkeeping | null {
  const top = SNIPPET_REGISTRY.applicable(capsule)[0];
  if (top === undefined) return null;
  const draft = SNIPPET_REGISTRY.expand(top.name, capsule);
  return {
    play: { name: top.name, hash: top.snippetHash },
    intents: draft.intents,
  };
}

export function classifySuggestionAdoption(
  suggestion: readonly EngineTurnIntent[] | null,
  accepted: readonly EngineTurnIntent[] | null,
): ConversationSuggestionAdoption | null {
  if (suggestion === null) return null;
  if (accepted === null || accepted.length === 0) return 'ignored';
  const acceptedByActor = new Map(accepted.map((entry) => [entry.actorId, entry]));
  const exact = accepted.length === suggestion.length && suggestion.every((intent) =>
    isDeepStrictEqual(acceptedByActor.get(intent.actorId), intent));
  if (exact) return 'as_is';
  const retainsSuggestedChoice = suggestion.some((intent) => {
    const acceptedIntent = acceptedByActor.get(intent.actorId);
    return acceptedIntent !== undefined && isDeepStrictEqual(acceptedIntent.choice, intent.choice);
  });
  return retainsSuggestedChoice ? 'edited' : 'ignored';
}

function scriptedIntents(state: EncounterState, phase: 'initial' | 'correction'): readonly EngineTurnIntent[] {
  return livingMonsterIds(state).map((actorId): EngineTurnIntent => {
    const actor = canonicalEngineQueryPort.combatant(state, actorId);
    const attack = canonicalEngineQueryPort.actions(state, actorId)
      .find((candidate): candidate is MonsterAttackAction => candidate.kind === 'attack');
    const target = canonicalEngineQueryPort.resolveTarget(state, actorId, { kind: 'nearest_visible_enemy' });
    const choice: EngineActionChoice = attack === undefined || target === null
      ? { kind: 'dodge' }
      : { kind: 'attack', actionId: attack.id, target: { kind: 'combatant', combatantId: target } };
    const primary: EngineIntentBranch = {
      choice,
      movement: {
        willingness: choice.kind === 'attack' ? 'only_if_required' : 'none',
        maximumFeet: choice.kind === 'attack' ? actor?.profile.rules.speed ?? 0 : 0,
        opportunityRisk: 'accept_if_needed',
      },
      engagement: { stance: choice.kind === 'attack' ? 'close_to_melee' : 'hold_position' },
    };
    return {
      actorId, ...primary,
      fallback: phase === 'correction' ? null : {
        choice: { kind: 'dodge' },
        movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
        engagement: { stance: 'hold_position' },
      },
    };
  });
}

interface McpClient {
  readonly child: ChildProcessWithoutNullStreams;
  readonly lines: Interface;
  readonly iterator: AsyncIterator<string>;
  nextId: number;
  stderr: string;
  readonly exit: Promise<number | null>;
}

function startMcpClient(cwd: string, launcherPath: string): McpClient {
  const child = spawn(process.execPath, [
    resolve(cwd, 'node_modules/vite-node/vite-node.mjs'),
    resolve(cwd, 'tools/engine-mcp-server.ts'),
    launcherPath,
  ], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
  const client: McpClient = {
    child, lines, iterator: lines[Symbol.asyncIterator](), nextId: 1, stderr: '',
    exit: new Promise<number | null>((resolvePromise, reject) => {
      child.once('error', reject);
      child.once('exit', resolvePromise);
    }),
  };
  child.stderr.on('data', (chunk: Buffer) => { client.stderr += chunk.toString('utf8'); });
  return client;
}

async function mcpRequest(client: McpClient, method: string, params: unknown): Promise<unknown> {
  const id = client.nextId;
  client.nextId += 1;
  const requestParams = asRecord(params);
  if (requestParams === null) throw new TypeError('MCP request params must be an object.');
  client.child.stdin.write(`${JSON.stringify({
    jsonrpc: '2.0', id, method,
    params: {
      ...requestParams,
      _meta: mcpRequestMeta({ name: 'ai-dm-conversation-SIMULATED', version: '1.0.0' }),
    },
  })}\n`);
  const line = await client.iterator.next();
  if (line.done) throw new Error(`Engine MCP server closed early: ${client.stderr}`);
  const response = asRecord(JSON.parse(line.value) as unknown);
  if (response === null || response['id'] !== id) throw new Error('Engine MCP response id mismatch.');
  if (response['error'] !== undefined) throw new Error(JSON.stringify(response['error']));
  return response['result'];
}

async function stopMcpClient(client: McpClient): Promise<void> {
  client.child.stdin.end();
  const code = await client.exit;
  client.lines.close();
  if (code !== 0) throw new Error(`Engine MCP server exited ${String(code)}: ${client.stderr}`);
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
  proposal: RoundIntentProposalEnvelope | PlanAdjustmentProposalEnvelope,
  metadata: {
    readonly repoCommit: string;
    readonly model: string;
    readonly effort: ConversationEffort;
    readonly sessionId: string | null;
    readonly parentPlanId: string | null;
    readonly partyPolicyHash: string | null;
    readonly materialityPolicyHash: string | null;
  },
): ConversationRlDataV2 {
  if (proposal.submittedArguments === undefined) {
    throw new Error('Accepted proposal omitted its validated submission arguments.');
  }
  const adjustment = proposal.kind === 'plan_adjustment_proposal';
  return {
    format: 'arena-rl-capture-v2',
    task: adjustment ? 'plan_adjustment' : 'round_plan',
    submissionTool: adjustment
      ? 'engine.submit_plan_adjustment'
      : 'engine.submit_round_intents',
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
  };
}

interface CapturedTurnContext {
  readonly raw: string;
  readonly granularity: 'full' | 'turn_delta';
  readonly value: Readonly<Record<string, unknown>>;
}

function capturedTurnContext(raw: string): CapturedTurnContext {
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes > TURN_CONTEXT_MAX_BYTES) {
    throw new RangeError(
      `Recorded turn context is ${String(bytes)} UTF-8 bytes; maximum is ${String(TURN_CONTEXT_MAX_BYTES)}.`,
    );
  }
  const value = requiredRecord(JSON.parse(raw) as unknown, 'recorded turn context');
  const granularity = value['granularity'];
  if (granularity !== 'full' && granularity !== 'turn_delta') {
    throw new TypeError('Recorded turn context has no supported granularity marker.');
  }
  return { raw, granularity, value };
}

function plannedTurnContext(
  state: EncounterState,
  snapshot: EngineRoundSnapshot,
  base: TurnContextDeltaBase | undefined,
): CapturedTurnContext {
  const capsule = snapshot.capsule;
  const request = capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error('Recorded turn context requires an ordinary pending request.');
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
      baselineIntentDigests: request.baselineIntentDigests,
      adjustmentBudget: request.adjustmentBudget,
      },
    } : { requestedActorCount: request.actors.length }),
    toolProfile: 'dm',
    ...(base === undefined ? {} : { turnContextDeltaBase: base }),
  });
  const value = runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    ...(base === undefined
      ? { granularity: 'full' }
      : { granularity: 'turn_delta', since_revision: base.revision }),
  });
  return capturedTurnContext(JSON.stringify(value));
}

function takeTurnContext(path: string): CapturedTurnContext | null {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return null; }
  const raw = source.split('\n').filter((line) => line.trim().length > 0).at(-1);
  return raw === undefined ? null : capturedTurnContext(raw);
}

async function driveScriptedMcp(
  cwd: string,
  launcherPath: string,
  submit: boolean,
  invalid: boolean,
  reactionGuidance: ReactionGuidanceDeclaration | null,
  suggestionResponse: SimulatedSuggestionResponse,
  adjustmentResponse: 'keep' | 'change' | 'invalid',
): Promise<{
  readonly calls: number;
  readonly rejections: readonly ConversationChainAttemptEvidence[];
  readonly contextTruncated: boolean;
}> {
  const manifest = JSON.parse(await readFile(launcherPath, 'utf8')) as EngineMcpLauncherManifest;
  const state = await loadArenaFixture(manifest.fixturePath);
  const client = startMcpClient(cwd, launcherPath);
  let calls = 0;
  try {
    await mcpRequest(client, 'server/discover', {});
    const contextResult = asRecord(await mcpRequest(client, 'tools/call', {
      name: 'engine.get_turn_context',
      arguments: {
        run_id: manifest.runId, expected_revision: manifest.revision, scope: 'round',
        ...(manifest.turnContextDeltaBase === undefined ? { granularity: 'full' } : {
          granularity: 'turn_delta', since_revision: manifest.turnContextDeltaBase.revision,
        }),
      },
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
    if (manifest.requestKind === 'plan_adjustment') {
      const actorId = manifest.requestedActorIds?.[0];
      const invalidAdjustment = manifest.phase === 'initial' && adjustmentResponse === 'invalid';
      const updates = manifest.phase === 'initial' && adjustmentResponse === 'keep'
        ? []
        : actorId === undefined
          ? []
          : [externalIntent(invalidAdjustment ? {
              actorId,
              choice: { kind: 'cast_spell', spellId: 'SIMULATED-unavailable-adjustment', target: null },
              movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
              engagement: { stance: 'hold_position' },
              fallback: {
                choice: { kind: 'cast_spell', spellId: 'SIMULATED-unavailable-adjustment-fallback', target: null },
                movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
                engagement: { stance: 'hold_position' },
              },
            } : {
              actorId,
              choice: { kind: 'dodge' },
              movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
              engagement: { stance: 'hold_position' },
              fallback: null,
            })];
      const submitResult = asRecord(await mcpRequest(client, 'tools/call', {
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
    const suggestedIntents = suggestion?.['intents'];
    const useSuggestion = (suggestionResponse === 'as_is' || suggestionResponse === 'edited') &&
      Array.isArray(suggestedIntents);
    const intents = useSuggestion
      ? structuredClone(suggestedIntents) as readonly Readonly<Record<string, unknown>>[]
      : suggestionResponse === 'ignored'
        ? livingMonsterIds(state).map((actorId) => externalIntent({
            actorId,
            choice: { kind: 'dodge' },
            movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
            engagement: { stance: 'hold_position' },
            fallback: null,
          }))
        : scriptedIntents(state, manifest.phase).map(externalIntent);
    const responseIntents = suggestionResponse !== 'edited' || !useSuggestion
      ? intents
      : intents.map((intent, index) => index !== 0 ? intent : {
          ...intent,
          movement: {
            ...requiredRecord(intent['movement'], 'suggested movement'),
            opportunity_risk: 'accept',
          },
        });
    const submittedIntents = invalid ? responseIntents.map((intent) => ({
      ...intent,
      choice: { kind: 'cast_spell', spell_id: 'SIMULATED-unavailable', target: null },
      fallback: {
        choice: { kind: 'cast_spell', spell_id: 'SIMULATED-unavailable-fallback', target: null },
        movement: { willingness: 'none', maximum_feet: 0, opportunity_risk: 'avoid' },
        engagement: { stance: 'hold_position' },
      },
    })) : responseIntents;
    const submitResult = asRecord(await mcpRequest(client, 'tools/call', {
      name: 'engine.submit_round_intents',
      arguments: {
        state_ref: stateRef,
        request_id: manifest.requestId,
        phase: manifest.phase,
        idempotency_key: `SIMULATED-${manifest.requestId}-${manifest.phase}`.slice(0, 200),
        intents: submittedIntents,
        ...(reactionGuidance === null ? {} : { reaction_guidance: externalReactionGuidance(reactionGuidance) }),
      },
    }));
    calls += 1;
    if (submitResult === null || submitResult['isError'] !== false) {
      throw new Error('engine.submit_round_intents failed in the SIMULATED client.');
    }
    return {
      calls,
      rejections: rejectionEvidence(submitResult),
      contextTruncated: eventContextTrimmed(contextResult),
    };
  } finally {
    await stopMcpClient(client);
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
  readonly #failCorrection: ReadonlySet<string>;
  readonly #remainingPrimaryFlaps: Map<string, number>;
  readonly #reactionGuidanceByRequest: Readonly<Record<string, ReactionGuidanceDeclaration>>;
  readonly #suggestionResponseByRequest: Readonly<Record<string, ConversationSuggestionAdoption>>;
  readonly #adjustmentResponseByRequest: Readonly<Record<string, 'keep' | 'change' | 'invalid'>>;
  #starts = 0;

  constructor(
    kind: ConversationCli,
    private readonly cwd: string,
    exhaust: readonly string[],
    invalid: readonly string[],
    fail: readonly string[],
    primaryFlaps: Readonly<Record<string, number>>,
    reactionGuidanceByRequest: Readonly<Record<string, ReactionGuidanceDeclaration>>,
    suggestionResponseByRequest: Readonly<Record<string, ConversationSuggestionAdoption>>,
    adjustmentResponseByRequest: Readonly<Record<string, 'keep' | 'change' | 'invalid'>>,
  ) {
    this.kind = kind;
    this.#exhaustInitial = new Set(exhaust);
    this.#invalidInitial = new Set(invalid);
    this.#failCorrection = new Set(fail);
    this.#remainingPrimaryFlaps = new Map(Object.entries(primaryFlaps));
    this.#reactionGuidanceByRequest = reactionGuidanceByRequest;
    this.#suggestionResponseByRequest = suggestionResponseByRequest;
    this.#adjustmentResponseByRequest = adjustmentResponseByRequest;
  }

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.#starts += 1;
    const sessionId = this.#starts === 1
      ? `agent-session:SIMULATED:${invocation.runId}`
      : `agent-session:SIMULATED:${invocation.runId}:fresh-${String(this.#starts)}`;
    const manifest = JSON.parse(await readFile(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    return this.#dispatch(sessionId, invocation, false);
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    return this.#dispatch(binding.sessionId, invocation, invocation.prompt.startsWith('[ROOM_TRANSITION]'));
  }

  async #dispatch(
    sessionId: string,
    invocation: AgentInvocation,
    roomTransition: boolean,
  ): Promise<AgentTurnResult> {
    const manifest = JSON.parse(await readFile(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    const key = manifest.requestId.replace(/^request:/u, '');
    const remainingFlaps = this.#remainingPrimaryFlaps.get(key) ?? 0;
    if (!roomTransition && manifest.phase === 'initial' && remainingFlaps > 0) {
      this.#remainingPrimaryFlaps.set(key, remainingFlaps - 1);
      return completedSimulated(sessionId);
    }
    const submit = !roomTransition && !(manifest.phase === 'initial'
      ? this.#exhaustInitial.has(key) : this.#failCorrection.has(key));
    const driven = await driveScriptedMcp(
      this.cwd,
      invocation.launcherToken,
      submit,
      manifest.phase === 'initial' && this.#invalidInitial.has(key),
      manifest.phase === 'initial' ? this.#reactionGuidanceByRequest[key] ?? null : null,
      manifest.phase === 'initial' ? this.#suggestionResponseByRequest[key] ?? 'legacy' : 'legacy',
      this.#adjustmentResponseByRequest[key] ?? 'keep',
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
    return completedSimulated(sessionId);
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

function completedSimulated(value: string): AgentTurnResult {
  return {
    resumeSessionId: agentSessionId(value),
    sessionId: null,
    finalText: 'SIMULATED — proposal delivered through engine MCP spool',
    usage: null,
    exit: 'completed',
  };
}

function isRoundProposal(value: unknown): value is RoundIntentProposalEnvelope {
  const input = asRecord(value);
  return input?.['kind'] === 'round_intent_proposal' &&
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
  return input?.['kind'] === 'plan_adjustment_proposal' &&
    typeof input['proposalId'] === 'string' && typeof input['runId'] === 'string' &&
    typeof input['branchId'] === 'string' && typeof input['requestId'] === 'string' &&
    typeof input['expectedRevision'] === 'number' && typeof input['stateDigest'] === 'string' &&
    typeof input['stateHandle'] === 'string' &&
    (input['phase'] === 'initial' || input['phase'] === 'correction') &&
    typeof input['idempotencyKey'] === 'string' &&
    typeof input['baseline_plan_hash'] === 'string' && Array.isArray(input['updates']);
}

function takeRoundProposal(path: string): RoundIntentProposalEnvelope | null {
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

async function writeLauncher(input: {
  readonly directory: string;
  readonly name: string;
  readonly snapshot: EngineRoundSnapshot;
  readonly room: number;
  readonly historyKind: string;
  readonly turnContextDeltaBase?: TurnContextDeltaBase;
}): Promise<{
  readonly manifestPath: string;
  readonly recoveryManifestPath: string;
  readonly spoolPath: string;
  readonly turnContextSpoolPath: string;
}> {
  const fixturePath = join(input.directory, `${input.name}-fixture.json`);
  const spoolPath = join(input.directory, `${input.name}-proposals.jsonl`);
  const turnContextSpoolPath = join(input.directory, `${input.name}-turn-context.jsonl`);
  const manifestPath = join(input.directory, `${input.name}-launcher.json`);
  const recoveryManifestPath = join(input.directory, `${input.name}-launcher-full.json`);
  await writeFile(fixturePath, input.snapshot.fixtureJson, 'utf8');
  await writeFile(spoolPath, '', 'utf8');
  await writeFile(turnContextSpoolPath, '', 'utf8');
  const capsule = input.snapshot.capsule;
  const request = capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error('Conversation launcher requires an ordinary pending request.');
  }
  const manifest: EngineMcpLauncherManifest = {
    format: 'engine-mcp-launcher-v1', fixturePath, proposalSpoolPath: spoolPath,
    turnContextSpoolPath,
    runId: capsule.runId, branchId: capsule.branchId,
    revision: capsule.revision, requestId: request.requestId,
    phase: request.phase, correctionNumber: request.correctionNumber,
    room: input.room, historyKind: input.historyKind, toolProfile: 'dm',
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
      baselineIntentDigests: request.baselineIntentDigests,
      adjustmentBudget: request.adjustmentBudget,
      },
    } : {}),
    ...(input.turnContextDeltaBase === undefined ? {} : {
      turnContextDeltaBase: input.turnContextDeltaBase,
    }),
  };
  await writeFile(manifestPath, canonicalJson(manifest), 'utf8');
  const { turnContextDeltaBase: _turnContextDeltaBase, ...fullManifest } = manifest;
  await writeFile(recoveryManifestPath, canonicalJson(fullManifest), 'utf8');
  return { manifestPath, recoveryManifestPath, spoolPath, turnContextSpoolPath };
}

function fullTurnContextBase(
  state: EncounterState,
  snapshot: EngineRoundSnapshot,
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
      baselineIntentDigests: request.baselineIntentDigests,
      adjustmentBudget: request.adjustmentBudget,
      },
    } : { requestedActorCount: request.actors.length }),
    toolProfile: 'dm',
  });
  const response = runtime.handler.handle({
    jsonrpc: '2.0', id: 'turn-context-base', method: 'tools/call',
    params: {
      name: 'engine.get_turn_context',
      arguments: {
        run_id: capsule.runId, expected_revision: capsule.revision,
        scope: 'round', granularity: 'full',
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
  readonly turnContextDeltaBase?: TurnContextDeltaBase;
  readonly onProposal: (proposal: RoundIntentProposalEnvelope | PlanAdjustmentProposalEnvelope) => void;
  readonly onToolResult: (name: string, result: unknown) => void;
}): AgentToolSession {
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
      baselineIntentDigests: request.baselineIntentDigests,
      adjustmentBudget: request.adjustmentBudget,
      },
    } : { requestedActorCount: request.actors.length }),
    toolProfile: 'dm',
    ...(input.turnContextDeltaBase === undefined ? {} : {
      turnContextDeltaBase: input.turnContextDeltaBase,
    }),
    onProposal: (proposal) => {
      if (isRoundProposal(proposal) || isPlanAdjustmentProposal(proposal)) {
        input.onProposal(structuredClone(proposal));
      }
    },
  });
  return {
    tools: runtime.toolSurface.tools,
    execute(name, argumentsValue) {
      try {
        const result = runtime.toolSurface.execute(name, argumentsValue);
        input.onToolResult(name, result);
        return result;
      } catch (error) {
        input.onToolResult(name, { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },
  };
}

function selectedIntentBranch(
  entry: RoundIntentProposalEnvelope['resolutions'][number],
): EngineIntentBranch {
  if (entry.selectedBranch === 'primary') return entry.intent;
  if (entry.intent.fallback === null) throw new Error('Fallback resolution omitted its branch.');
  return entry.intent.fallback;
}

function selectedChoice(entry: RoundIntentProposalEnvelope['resolutions'][number]): EngineActionChoice {
  return selectedIntentBranch(entry).choice;
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
  entry: ProposedIntentResolution,
): readonly string[] {
  const checked = pureIntentResolver.resolve(state, entry.intent);
  if (!checked.valid) {
    return [`${entry.intent.actorId}: proposal-time resolution was valid, but authoritative resolution refused it: ${checked.refusals.map((refusal) => refusal.summary).join('; ')}`];
  }
  if (checked.selectedBranch !== entry.selectedBranch) {
    return [`${entry.intent.actorId}: selected branch diverged from ${entry.selectedBranch} to ${checked.selectedBranch}.`];
  }
  if (checked.resolutionDigest === entry.resolutionDigest) return [];
  return checked.summary === entry.summary
    ? [`${entry.intent.actorId}: path or final-position geometry diverged while action, target, and movement cost remained ${checked.summary}.`]
    : [`${entry.intent.actorId}: resolved action, target, or movement cost diverged; proposal was "${entry.summary}" and authoritative resolution was "${checked.summary}".`];
}

function authorizedMechanics(state: EncounterState, proposal: RoundIntentProposalEnvelope): {
  readonly entries: readonly {
    readonly mechanics: ResolvedIntentMechanics;
    readonly choice: EngineActionChoice;
    readonly acceptedIntent: Readonly<Record<string, unknown>>;
    readonly selectedBranch: 'primary' | 'fallback';
    readonly summary: string;
    readonly primaryDeclaredIntent: Readonly<Record<string, unknown>>;
    readonly selectedDeclaredIntent: Readonly<Record<string, unknown>>;
    readonly primaryRejectionReasons: readonly string[];
  }[] | null;
  readonly divergences: readonly ConversationChainAttemptEvidence[];
} {
  const divergences = proposal.resolutions.flatMap<ConversationChainAttemptEvidence>((entry) => {
    const reasons = proposalResolutionDivergence(state, entry);
    return reasons.length === 0 ? [] : [{
      attempt: proposal.phase === 'correction' ? 'correction' : 'primary',
      actorId: entry.intent.actorId,
      declaredIntent: externalBranch(selectedIntentBranch(entry)),
      rejectionReasons: reasons,
    }];
  });
  if (divergences.length > 0) return { entries: null, divergences };
  const resolved = proposal.resolutions.map((entry) => {
    const checked = pureIntentResolver.resolve(state, entry.intent);
    if (!checked.valid) return null;
    const choice = selectedChoice(entry);
    const declared = selectedIntentBranch(entry);
    return choice.kind === 'cast_spell'
      ? null : {
          mechanics: checked.mechanics,
          choice,
          acceptedIntent: externalIntent(entry.intent),
          selectedBranch: entry.selectedBranch,
          summary: entry.summary,
          primaryDeclaredIntent: externalBranch(entry.intent),
          selectedDeclaredIntent: externalBranch(declared),
          primaryRejectionReasons: checked.refusals.map((refusal) => refusal.summary),
        };
  });
  return {
    entries: resolved.some((entry) => entry === null) ? null : resolved as readonly {
      readonly mechanics: ResolvedIntentMechanics;
      readonly choice: EngineActionChoice;
      readonly acceptedIntent: Readonly<Record<string, unknown>>;
      readonly selectedBranch: 'primary' | 'fallback';
      readonly summary: string;
      readonly primaryDeclaredIntent: Readonly<Record<string, unknown>>;
      readonly selectedDeclaredIntent: Readonly<Record<string, unknown>>;
      readonly primaryRejectionReasons: readonly string[];
    }[],
    divergences,
  };
}

function invocation(
  config: ConversationConfig,
  runId: EncounterSessionId,
  prompt: string,
  launcherToken: string,
  instructions: string | null = null,
  planner: ConversationPlannerAttribution = { model: config.model, effort: config.effort },
  recoveryLauncherToken?: string,
  toolSession?: AgentToolSession,
): AgentInvocation {
  return {
    runId, prompt, instructions, model: planner.model, reasoningEffort: planner.effort,
    sessionProfile: 'arena',
    launcherToken, timeoutMs: config.timeoutMs,
    ...(recoveryLauncherToken === undefined ? {} : { recoveryLauncherToken }),
    ...(toolSession === undefined ? {} : { toolSession }),
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

function turnContextPrompt(base: TurnContextDeltaBase | undefined): string {
  return base === undefined
    ? 'Call engine.get_turn_context with granularity "full".'
    : `Call engine.get_turn_context with granularity "turn_delta" and since_revision ${String(base.revision)}; the engine will return full context if that base is unavailable.`;
}

async function roomStates(config: ConversationConfig, options: ConversationRunOptions): Promise<readonly EncounterState[]> {
  if (options.roomStates !== undefined) {
    if (options.roomStates.length < config.rooms) throw new RangeError('Conversation options contain too few room states.');
    return options.roomStates.slice(0, config.rooms).map((state) => structuredClone(state));
  }
  const names = (await readdir(config.fixturesPath)).filter((name) => /^seed-\d+\.json$/u.test(name))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
  if (names.length < config.rooms) throw new RangeError(`Requested ${String(config.rooms)} rooms, but only ${String(names.length)} fixtures exist.`);
  return Promise.all(names.slice(0, config.rooms).map((name) => loadArenaFixture(resolve(config.fixturesPath, name))));
}

export async function runConversation(config: ConversationConfig, options: ConversationRunOptions = {}): Promise<ConversationRunResult> {
  const knowledgeBase = await loadKnowledgeBase(config);
  const repoCommit = await readRepoCommit(config.cwd);
  await writeFile(config.outPath, '', 'utf8');
  const artifacts = await mkdtemp(join(tmpdir(), 'dnd-ai-dm-conversation-'));
  const states = await roomStates(config, options);
  if (config.combatModel === 'initiative_segments_v1') {
    const invalidFixture = states.findIndex((state) => state.config.initiativeMode !== 'per_combatant');
    if (invalidFixture >= 0) {
      throw new Error(
        `initiative_segments_v1 fixture constraint: room ${String(invalidFixture + 1)} must declare config.initiativeMode="per_combatant"; frozen block fixtures are not mutated by the conversation driver.`,
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
    config.cli, config.cwd, options.exhaustInitial ?? [], options.invalidInitial ?? [],
    options.failCorrection ?? [],
    options.flapPrimaryByRequest ?? {},
    options.reactionGuidanceByRequest ?? {},
    options.suggestionResponseByRequest ?? {},
    options.adjustmentResponseByRequest ?? {},
  ) : null;
  const selectedAdapter = options.adapter ?? simulated ?? (config.cli === 'local-openai'
    ? new LocalOpenAiAgentSessionAdapter({
        baseUrl: config.localOpenAi?.baseUrl ?? '',
        thinkMode: config.localOpenAi?.thinkMode ?? 'off',
        ...(config.localOpenAi?.apiKey === undefined ? {} : { apiKey: config.localOpenAi.apiKey }),
      })
    : resolveAgentAdapter(config.cli as AgentCliKind, {
        binary: config.cliBin, cwd: config.cwd, engineCommand: process.execPath,
        engineToolProfile: 'dm',
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
  const escalationInstructions =
    'This is a fresh one-shot escalation session for the supplied repair brief. Submit one complete OFFENSIVE corrected round: every actor with a legal attack must attack; Dash-to-close counts as offense for out-of-reach melee; Dodge is allowed only when that actor has no resolvable action. Use only the correction launcher; no fallback remains.';
  const prepareRound = (request: EngineRoundCapsuleRequest): EngineRoundSnapshot => {
    const prepared = engineSession.prepareRound(request, journal.reactionGuidance());
    recordAutoResolvedReactions(journal, prepared);
    capsuleRevision += prepared.revisionDelta;
    return prepared.snapshot;
  };
  const beginSegmentRound = (request: EngineRoundCapsuleRequest): EngineRoundSnapshot => {
    const prepared = engineSession.beginRoundWithoutSkipping(request, journal.reactionGuidance());
    recordAutoResolvedReactions(journal, prepared);
    capsuleRevision += prepared.revisionDelta;
    return prepared.snapshot;
  };
  const prepareConfiguredRound = (request: EngineRoundCapsuleRequest): EngineRoundSnapshot =>
    config.combatModel === 'initiative_segments_v1'
      ? beginSegmentRound(request)
      : prepareRound(request);

  prepareConfiguredRound({
    runId, branchId, revision: capsuleRevision, requestId: 'request:room-1-round-1',
    phase: 'initial', room: 1, historyKind: 'session_started',
  });
  let lifecycle = new AgentSessionLifecycle(journal, adapter, AGENT_ADAPTER_VERSION);

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
      const started = performance.now();
      const modelCallsBeforeRound = adapter.modelCalls;
      observedToolCalls = 0;
      observedTurnContextCalls = 0;
      observedContextTruncated = false;
      observedRejections = [];
      const requestId = `request:room-${String(room)}-round-${String(round)}`;
      const key = `room-${String(room)}-round-${String(round)}`;
      const initialRequest: EngineRoundCapsuleRequest = {
        runId, branchId, revision: capsuleRevision, requestId,
        phase: 'initial', room, historyKind: round === 1 ? 'room_ready' : 'proposal_applied',
      };
      const initialSnapshot = round === 1
        ? engineSession.snapshot(initialRequest)
        : prepareConfiguredRound(initialRequest);
      const capsule = initialSnapshot.capsule;
      const suggestedPlan = suggestedPlanBookkeeping(capsule);
      const segmentPartyPlan = config.combatModel === 'initiative_segments_v1'
        ? createScriptedPartyPlan(engineSession.currentState())
        : null;
      const initiativeOrder = engineSession.currentState().initiative.map((entry) => entry.combatant);
      const initiativeIndexByActor = new Map(
        initiativeOrder.map((actorId, index) => [actorId, index] as const),
      );
      const startingRoomDigest = sha256(canonicalJson(states[room - 1]!));
      const contextRevision = capsule.revision;
      const authoritativeInitialRequest = { ...initialRequest, revision: contextRevision };
      const currentTurnContext = fullTurnContextBase(engineSession.currentState(), initialSnapshot);
      const plannedInitialTurnContext = plannedTurnContext(
        engineSession.currentState(),
        initialSnapshot,
        lastSeenTurnContext,
      );
      let rowTurnContext = plannedInitialTurnContext;
      const initialLauncher = await writeLauncher({
        directory: artifacts, name: `${key}-initial`, snapshot: initialSnapshot, room,
        historyKind: round === 1 ? 'room_ready' : 'proposal_applied',
        ...(lastSeenTurnContext === undefined ? {} : {
          turnContextDeltaBase: lastSeenTurnContext,
        }),
      });
      let localInitialProposal: RoundIntentProposalEnvelope | null = null;
      const initialToolSession = config.cli === 'local-openai'
        ? inProcessDmToolSession({
            state: engineSession.currentState(),
            snapshot: initialSnapshot,
            ...(lastSeenTurnContext === undefined ? {} : {
              turnContextDeltaBase: lastSeenTurnContext,
            }),
            onProposal: (proposal) => {
              if (isRoundProposal(proposal)) localInitialProposal = proposal;
            },
            onToolResult: (name, result) => {
              observedToolCalls += 1;
              if (name === 'engine.get_turn_context') observedTurnContextCalls += 1;
              if (name === 'engine.get_turn_context') {
                rowTurnContext = capturedTurnContext(JSON.stringify(result));
              }
              if (eventContextTrimmed(result)) observedContextTruncated = true;
              observedRejections.push(...rejectionEvidence(result));
            },
          })
        : undefined;
      let roundUsage: AgentUsage | null = null;
      let proposalId: string | null = null;
      let outcome: ConversationRow['outcome'] = 'refused';
      const refusals: string[] = [];
      let agentDispatched = false;
      let flapRetries: 0 | 1 | 2 = 0;
      let serviceNull = false;
      const failedAttempts: ConversationChainAttemptEvidence[] = [];
      let autoResolvedTrigger: string | null = null;
      let correctionFinalText: string | null = null;
      let authorizationStateBinding: ConversationRow['stateBinding']['authorization'] = null;
      let authorizedPlan: ConversationRow['authorizedPlan'] = null;
      let acceptedSubmission: readonly EngineTurnIntent[] | null = null;
      let authorizedMonsterProposalHash: string | null = null;
      let roundNarrative: ConversationRow['roundNarrative'] = null;
      let initialDispatchPlanner: ConversationPlannerAttribution | null = null;
      let correctionDispatchPlanner: ConversationPlannerAttribution | null = null;
      let plannedBy: ConversationRow['plannedBy'] = null;
      let escalated = false;
      let firedEscalationModel: string | null = null;
      let rolloutSessionId: string | null = null;
      let escalationSessionId: string | null = null;
      let capturedRlData: ConversationRlData | undefined;
      let correctionTurnContextSpoolPath: string | null = null;
      let recordedCorrectionTurnContext: CapturedTurnContext | null = null;
      let initialCalls = 0;
      let adjustmentCalls = 0;
      let correctionCalls = 0;
      let serviceNullAdjustments = 0;
      const pcTurns: ConversationPcTurn[] = [];
      const adjustments: ConversationAdjustment[] = [];
      const monsterSegments: ConversationMonsterSegment[] = [];
      const segmentMonsterPlan = new Map<CombatantId, SegmentMonsterPlanEntry>();
      let segmentPlanId: string | null = null;
      const adjustmentTransitions: AdjustmentExhaustionTransition[] = [];
      const adjustmentPersistence = {
        transitions: (): readonly AdjustmentExhaustionTransition[] => adjustmentTransitions,
        record: (transition: AdjustmentExhaustionTransition): void => {
          adjustmentTransitions.push(structuredClone(transition));
        },
      };
      const dispatchPlanAdjustment = async (input: {
        readonly triggerActor: CombatantId;
        readonly pcTurnOrdinal: number;
        readonly beforeRevision: number;
        readonly afterRevision: number;
        readonly reasons: readonly PlanMaterialityReasonCode[];
        readonly openActorIds: readonly CombatantId[];
      }): Promise<void> => {
        if (segmentPlanId === null) throw new Error('Material PC turn has no authorized monster plan to adjust.');
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
          baselineIntentDigests: actors.map((actorId) => {
            const entry = segmentMonsterPlan.get(actorId);
            if (entry === undefined) throw new Error(`Open monster ${actorId} has no baseline intent.`);
            return { actorId, intentDigest: sha256(canonicalJson(entry.intent)) };
          }),
          adjustmentBudget: Math.min(actors.length, 2) as 1 | 2,
        });
        const adjustmentRequest: EngineRoundCapsuleRequest = {
          runId, branchId, revision: capsuleRevision, requestId: adjustmentRequestId,
          phase: 'initial', room, historyKind: 'plan_adjustment_requested',
          requestKind: 'plan_adjustment', requestedActorIds: input.openActorIds,
          planAdjustment: metadataFor(input.openActorIds),
        };
        const adjustmentSnapshot = engineSession.snapshot(adjustmentRequest);
        const plannedAdjustmentContext = plannedTurnContext(
          engineSession.currentState(), adjustmentSnapshot, lastSeenTurnContext,
        );
        let adjustmentTurnContext = plannedAdjustmentContext;
        const adjustmentLauncher = await writeLauncher({
          directory: artifacts,
          name: `${adjustmentKey}-initial`,
          snapshot: adjustmentSnapshot,
          room,
          historyKind: 'plan_adjustment_requested',
          ...(lastSeenTurnContext === undefined ? {} : { turnContextDeltaBase: lastSeenTurnContext }),
        });
        let localAdjustmentProposal: PlanAdjustmentProposalEnvelope | null = null;
        const adjustmentToolSession = config.cli === 'local-openai'
          ? inProcessDmToolSession({
              state: engineSession.currentState(),
              snapshot: adjustmentSnapshot,
              ...(lastSeenTurnContext === undefined ? {} : { turnContextDeltaBase: lastSeenTurnContext }),
              onProposal: (proposal) => {
                if (isPlanAdjustmentProposal(proposal)) localAdjustmentProposal = proposal;
              },
              onToolResult: (name, result) => {
                observedToolCalls += 1;
                if (name === 'engine.get_turn_context') {
                  observedTurnContextCalls += 1;
                  adjustmentTurnContext = capturedTurnContext(JSON.stringify(result));
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
        let adjustmentUsage: AgentUsage | null = null;
        const modelCallsBeforeAdjustment = adapter.modelCalls;
        const toolCallsBeforeAdjustment = adjustmentToolCalls();
        const adjustmentRlData: ConversationRlDataV2[] = [];
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const callsBefore = adjustmentToolCalls();
          const rejectionsBefore = adjustmentRejections().length;
          const retryNote = attempt === 0 ? '' :
            '[SERVICE_RETRY] The previous adjustment turn completed with no engine tool activity, proposal, or refusal. Retry this PC-turn adjustment now.\n\n';
          const adjustmentInvocation = invocation(
            config,
            runId,
            `${retryNote}${turnContextPrompt(lastSeenTurnContext)}\n\n${renderEnginePrompt('plan_round', adjustmentSnapshot.capsule, RULES_SOURCE)}`,
            adjustmentLauncher.manifestPath,
            null,
            basePlanner,
            adjustmentLauncher.recoveryManifestPath,
            adjustmentToolSession,
          );
          adjustmentCalls += 1;
          const turn = await lifecycle.resumeRound(
            adjustmentInvocation,
            new AbortController().signal,
          );
          adjustmentSessionId = turn.sessionId;
          roundUsage = addAgentUsage(roundUsage, turn.usage);
          adjustmentUsage = addAgentUsage(adjustmentUsage, turn.usage);
          adjustmentTurnContext = takeTurnContext(adjustmentLauncher.turnContextSpoolPath) ??
            adjustmentTurnContext;
          adjustmentProposal = localAdjustmentProposal ??
            takePlanAdjustmentProposal(adjustmentLauncher.spoolPath);
          const flapped = turn.exit === 'completed' && adjustmentProposal === null &&
            adjustmentToolCalls() === callsBefore && adjustmentRejections().length === rejectionsBefore;
          if (!flapped) break;
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
        const refusedActorIds = [...new Set(currentAdjustmentRejections.flatMap((entry) =>
          entry.actorId === null || !input.openActorIds.includes(entry.actorId) ? [] : [entry.actorId]))]
          .sort((left, right) => left.localeCompare(right));
        let correctionRuntime: Parameters<AdjustmentExhaustionCoordinator['coordinate']>[0]['correction'] = null;
        let adjustmentCorrectionProposal: PlanAdjustmentProposalEnvelope | null = null;
        const recordedAdjustmentCorrectionProposal = (): PlanAdjustmentProposalEnvelope | null =>
          adjustmentCorrectionProposal;
        let adjustmentCorrectionContext: CapturedTurnContext | null = null;
        if (refusedActorIds.length > 0) {
          const correctionRequest: EngineRoundCapsuleRequest = {
            runId, branchId, revision: capsuleRevision, requestId: adjustmentRequestId,
            phase: 'correction', room, historyKind: 'plan_adjustment_correction_requested',
            requestKind: 'plan_adjustment', requestedActorIds: refusedActorIds,
            planAdjustment: metadataFor(refusedActorIds),
          };
          const correctionSnapshot = engineSession.snapshot(correctionRequest);
          const correctionContext = plannedTurnContext(
            engineSession.currentState(), correctionSnapshot, lastSeenTurnContext,
          );
          adjustmentCorrectionContext = correctionContext;
          const correctionLauncher = await writeLauncher({
            directory: artifacts,
            name: `${adjustmentKey}-correction`,
            snapshot: correctionSnapshot,
            room,
            historyKind: 'plan_adjustment_correction_requested',
            ...(lastSeenTurnContext === undefined ? {} : { turnContextDeltaBase: lastSeenTurnContext }),
          });
          let localCorrection: PlanAdjustmentProposalEnvelope | null = null;
          const correctionToolSession = config.cli === 'local-openai'
            ? inProcessDmToolSession({
                state: engineSession.currentState(),
                snapshot: correctionSnapshot,
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
                correctionCalls += 1;
                const turn = await lifecycle.resumeCorrection(correctionInvocation, signal);
                adjustmentCorrectionSessionId = turn.sessionId;
                roundUsage = addAgentUsage(roundUsage, turn.usage);
                adjustmentUsage = addAgentUsage(adjustmentUsage, turn.usage);
                adjustmentCorrectionContext =
                  takeTurnContext(correctionLauncher.turnContextSpoolPath) ?? adjustmentCorrectionContext;
                return turn;
              },
            },
            invocation: invocation(
              config,
              runId,
              'replaced by adjustment correction renderer',
              correctionLauncher.manifestPath,
              null,
              basePlanner,
              correctionLauncher.recoveryManifestPath,
              correctionToolSession,
            ),
            signal: new AbortController().signal,
            activateCapsule: () => undefined,
            takeProposal: () => {
              const proposal = localCorrection ?? takePlanAdjustmentProposal(correctionLauncher.spoolPath);
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
        const completedCorrectionProposal = recordedAdjustmentCorrectionProposal();
        if (config.captureRlData && adjustmentProposal?.submittedArguments !== undefined) {
          adjustmentRlData.push(rlCapture(
            knowledgeBase?.text ?? null,
            adjustmentTurnContext,
            adjustmentProposal,
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
            knowledgeBase?.text ?? null,
            adjustmentCorrectionContext,
            completedCorrectionProposal,
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
          const resolution = pureIntentResolver.resolve(engineSession.currentState(), update.intent);
          if (!resolution.valid) {
            throw new Error(`Staged adjustment for ${update.intent.actorId} is no longer resolvable.`);
          }
          segmentMonsterPlan.set(update.intent.actorId, {
            intent: structuredClone(update.intent),
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
          requestId: adjustmentRequestId,
          proposalId: adjustmentProposal?.proposalId ?? completedCorrectionProposal?.proposalId ?? null,
          baselinePlanHash,
          resultPlanHash,
          changedActors: completion.updates.map((entry) => entry.intent.actorId),
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
        let proposed: RoundIntentProposalEnvelope | null = null;
        const toolCallsObserved = (): number =>
          simulated?.callsByRequest.get(requestId) ?? observedToolCalls;
        const contextCallsObserved = (): number =>
          simulated?.contextCallsByRequest.get(requestId) ?? observedTurnContextCalls;
        const rejectionsObserved = (): readonly ConversationChainAttemptEvidence[] =>
          simulated?.rejectionsByRequest.get(requestId) ?? observedRejections;
        const primaryPrompt = renderEnginePrompt('plan_round', capsule, RULES_SOURCE);
        try {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            const callsBefore = toolCallsObserved();
            const contextCallsBefore = contextCallsObserved();
            const rejectionsBefore = rejectionsObserved().length;
            const retryNote = attempt === 0 ? '' :
              '[SERVICE_RETRY] The previous turn completed with no engine tool activity and no proposal. Retry the same round now.\n\n';
            const primaryInvocation = invocation(
              config, runId,
              `${retryNote}${turnContextPrompt(lastSeenTurnContext)}\n\n${primaryPrompt}`,
              initialLauncher.manifestPath,
              journal.agentSession() === null ? knowledgeBase?.text ?? null : null,
              basePlanner,
              initialLauncher.recoveryManifestPath,
              initialToolSession,
            );
            initialDispatchPlanner = plannerAttribution(primaryInvocation);
            options.onPrimaryDispatchStart?.();
            initialCalls += 1;
            const turn = journal.agentSession() === null
              ? await lifecycle.coldStartRound(primaryInvocation, new AbortController().signal)
              : await lifecycle.resumeRound(primaryInvocation, new AbortController().signal);
            rolloutSessionId = turn.sessionId;
            roundUsage = addAgentUsage(roundUsage, turn.usage);
            rowTurnContext = takeTurnContext(initialLauncher.turnContextSpoolPath) ?? rowTurnContext;
            proposed = localInitialProposal ?? takeRoundProposal(initialLauncher.spoolPath);
            const flapped = turn.exit === 'completed' && proposed === null &&
              toolCallsObserved() === callsBefore && rejectionsObserved().length === rejectionsBefore;
            if (contextCallsObserved() > contextCallsBefore || proposed !== null) {
              lastSeenTurnContext = currentTurnContext;
            }
            if (!flapped) break;
            if (attempt === 2) {
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
        const initial: InitialIntentAttempt = proposed === null ? {
          kind: 'exhausted', requestId, initialProposalId: `exhausted:${requestId}`,
          actorFailures: livingMonsterIds(authorizationState).map((actorId) => {
            const actorRejections = engineRejections.filter((entry) =>
              entry.actorId === null || entry.actorId === actorId);
            if (actorRejections.length > 0) failedAttempts.push(...actorRejections);
            else failedAttempts.push(
              { attempt: 'primary', actorId, declaredIntent: null, rejectionReasons: ['No engine rejection was returned because the agent submitted no initial proposal.'] },
              { attempt: 'fallback', actorId, declaredIntent: null, rejectionReasons: ['No engine rejection was returned because the agent submitted no fallback proposal.'] },
            );
            return { actorId, fallbackResult: 'absent' };
          }),
        } : { kind: 'proposal', proposal: proposed };
        const correctionRequest: EngineRoundCapsuleRequest = {
          runId, branchId, revision: contextRevision, requestId,
          phase: 'correction', room, historyKind: 'intent_correction_requested',
        };
        const correctionSnapshot = engineSession.snapshot(correctionRequest);
        const correctionCapsule = correctionSnapshot.capsule;
        const correctionTurnContextBase = escalationPlanner === null
          ? lastSeenTurnContext
          : undefined;
          const plannedCorrectionTurnContext = plannedTurnContext(
            engineSession.currentState(),
            correctionSnapshot,
            correctionTurnContextBase,
          );
        const correctionLauncher = await writeLauncher({
          directory: artifacts, name: `${key}-correction`, snapshot: correctionSnapshot,
          room, historyKind: 'intent_correction_requested',
          ...(correctionTurnContextBase === undefined ? {} : {
            turnContextDeltaBase: correctionTurnContextBase,
          }),
        });
        correctionTurnContextSpoolPath = correctionLauncher.turnContextSpoolPath;
        let localCorrectionProposal: RoundIntentProposalEnvelope | null = null;
        const correctionToolSession = config.cli === 'local-openai'
          ? inProcessDmToolSession({
              state: engineSession.currentState(),
              snapshot: correctionSnapshot,
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
                recordedCorrectionTurnContext = capturedTurnContext(JSON.stringify(result));
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
                declaredIntent: proposal.resolutions[0] === undefined
                  ? null : externalBranch(selectedIntentBranch(proposal.resolutions[0])),
                rejectionReasons: ['Proposal binding does not match the authoritative run, branch, request, revision, digest, and state handle.'],
              });
              return 'invalidated';
            }
            const proposalTurnContext = config.captureRlData
              ? proposal.phase === 'initial'
                ? takeTurnContext(initialLauncher.turnContextSpoolPath) ?? plannedInitialTurnContext
                : takeTurnContext(correctionLauncher.turnContextSpoolPath) ?? plannedCorrectionTurnContext
              : null;
            const proposalRlData = proposalTurnContext === null
              ? undefined
              : rlCapture(knowledgeBase?.text ?? null, proposalTurnContext, proposal, {
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
                    declaredIntent: proposal.resolutions[0] === undefined
                      ? null : externalBranch(selectedIntentBranch(proposal.resolutions[0])),
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
                    declaredIntent: entry.primaryDeclaredIntent,
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
                    intent: structuredClone(resolution.intent),
                    mechanics: entry.mechanics,
                    selectedBranch: entry.selectedBranch,
                  });
                }
                segmentPlanId = proposal.proposalId;
              }
            } catch (error) {
              failedAttempts.push({
                attempt: proposal.phase === 'correction' ? 'correction' : 'primary',
                actorId: null,
                declaredIntent: mechanics[0]?.selectedDeclaredIntent ?? null,
                rejectionReasons: [error instanceof Error ? error.message : String(error)],
              });
              return 'invalid';
            }
            proposalId = proposal.proposalId;
            authorizedMonsterProposalHash = sha256(canonicalJson(proposal));
            acceptedSubmission = proposal.resolutions.map((entry) => structuredClone(entry.intent));
            authorizedPlan = mechanics.map((entry): ConversationAuthorizedActorPlan => ({
              actorId: entry.mechanics.actorId,
              acceptedIntent: structuredClone(entry.acceptedIntent),
              selectedBranch: entry.selectedBranch,
              resolutionSummary: {
                actionId: entry.mechanics.actionId,
                targetId: entry.mechanics.targetId,
                movementFeet: entry.mechanics.movementCostFeet,
              },
            }));
            capturedRlData = proposalRlData;
            roundNarrative = mechanics.map((entry) => entry.summary).join('; ');
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
          resolveDeterministically: async (actorId): Promise<DeterministicIntentResolution> => ({
            actorId, expectedRevision: capsuleRevision,
            resolutionDigest: sha256(canonicalJson({ actorId, choice: 'dodge', revision: capsuleRevision })),
          }),
          applyAutoResolved: async (resolution) => {
            if (config.combatModel === 'initiative_segments_v1') {
              segmentMonsterPlan.set(
                resolution.actorId,
                deterministicDodgePlanEntry(engineSession.currentState(), resolution.actorId),
              );
              segmentPlanId = `auto-plan:${requestId}`;
              plannedBy = 'sim_controller';
              return;
            }
            const position = canonicalEngineQueryPort.tokenPosition(
              engineSession.currentState(), resolution.actorId,
            );
            if (position === null) throw new Error('Deterministic actor has no token.');
            const applied = engineSession.applyResolvedMechanics([{
              mechanics: {
                actorId: resolution.actorId, actionId: 'dodge', targetId: null,
                movementCostFeet: 0, path: [], finalPosition: position,
              },
              choice: { kind: 'dodge' },
            }], journal.reactionGuidance());
            capsuleRevision += Math.max(1, applied.revisionDelta);
            recordAutoResolvedReactions(journal, applied);
            plannedBy = 'sim_controller';
          },
          pauseForDmAdjudication: ({ actorId, reason }) => { refusals.push(`${actorId}: ${reason}`); },
        };
        const coordinated = await new TurnExhaustionCoordinator(journal.turnExhaustionPersistence()).coordinate({
          initial,
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
                recordedCorrectionTurnContext = plannedCorrectionTurnContext;
                const correctionTurn = escalationPlanner === null
                  ? await lifecycle.resumeCorrection(correctionInvocation, signal)
                  : await adapter.start({
                      ...correctionInvocation,
                      instructions: escalationInstructions,
                    }, signal);
                if (correctionTurn.exit !== 'completed') {
                  throw new Error('Agent correction dispatch was cancelled.');
                }
                if (escalationPlanner !== null &&
                  correctionTurn.resumeSessionId === journal.agentSession()?.sessionId) {
                  throw new Error('Tiered correction did not create an isolated escalation session.');
                }
                if (escalationPlanner === null) rolloutSessionId = correctionTurn.sessionId;
                else escalationSessionId = correctionTurn.sessionId;
                roundUsage = addAgentUsage(roundUsage, correctionTurn.usage);
                recordedCorrectionTurnContext =
                  takeTurnContext(correctionLauncher.turnContextSpoolPath) ?? recordedCorrectionTurnContext;
                const contextCallsAfterCorrection = simulated?.contextCallsByRequest.get(requestId) ??
                  observedTurnContextCalls;
                if (escalationPlanner === null &&
                  contextCallsAfterCorrection > contextCallsBeforeCorrection) {
                  lastSeenTurnContext = fullTurnContextBase(
                    engineSession.currentState(),
                    correctionSnapshot,
                  );
                }
                correctionFinalText = correctionTurn.finalText;
                return correctionTurn;
              },
            },
            invocation: invocation(
              config,
              runId,
              'replaced by correction renderer',
              correctionLauncher.manifestPath,
              null,
              escalationPlanner ?? basePlanner,
              correctionLauncher.recoveryManifestPath,
              correctionToolSession,
            ),
            signal: new AbortController().signal,
            activateCapsule: () => undefined,
            takeProposal: () => localCorrectionProposal ?? takeRoundProposal(correctionLauncher.spoolPath),
          },
          host,
        });
        outcome = coordinated.kind;
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
            entry.kind === 'intent_correction_failed' && entry.requestId === requestId);
          if (correctionFailure?.kind === 'intent_correction_failed' &&
            !failedAttempts.some((entry) => entry.attempt === 'correction')) {
            failedAttempts.push({
              attempt: 'correction', actorId: null,
              declaredIntent: null,
              rejectionReasons: [correctionFailure.result === 'no_response'
                ? 'No engine rejection was returned because the correction dispatch submitted no proposal.'
                : `The engine rejected the correction as ${correctionFailure.result}.`],
            });
          }
          correctionFinalText = correctionFailure?.kind === 'intent_correction_failed' &&
            correctionFailure.result === 'no_response' && correctionFinalText !== null
            ? truncateAgentFinalText(correctionFinalText)
            : null;
          autoResolvedTrigger = 'The initial primary/fallback chain and single correction were exhausted; the deterministic controller resolved the turn.';
        }
        if (coordinated.kind !== 'auto_resolved') correctionFinalText = null;
        }
        if (config.combatModel === 'initiative_segments_v1' && !serviceNull &&
          (outcome === 'authorized' || outcome === 'auto_resolved')) {
          if (segmentPartyPlan === null || segmentPlanId === null) {
            throw new Error('Authorized initiative-segment round is missing a stored team plan.');
          }
          const openMonsters = new Set(livingMonsterIds(engineSession.currentState()));
          const acted = new Set<CombatantId>();
          let pcTurnOrdinal = 0;
          while (true) {
            const state = engineSession.currentState();
            const activeActorId = state.activeCombatant;
            if (activeActorId === null || acted.has(activeActorId)) break;
            const active = state.combatants.find((entry) => entry.profile.id === activeActorId);
            if (active === undefined) throw new Error(`Active initiative actor ${activeActorId} is absent.`);
            if (active.life === 'dead') {
              throw new Error(`Dead initiative actor ${activeActorId} remained active.`);
            }
            if (active.profile.kind === 'player_character') {
              pcTurnOrdinal += 1;
              const beforeState = state;
              const beforeOpenActorIds = [...openMonsters]
                .filter((actorId) => beforeState.combatants.some((entry) =>
                  entry.profile.id === actorId && entry.life !== 'dead'))
                .sort((left, right) => left.localeCompare(right));
              const beforeIntents = beforeOpenActorIds.map((actorId) => {
                const entry = segmentMonsterPlan.get(actorId);
                if (entry === undefined) throw new Error(`Open monster ${actorId} has no stored plan.`);
                return entry.intent;
              });
              const materialized = materializeScriptedPartyTurn({
                state: beforeState,
                plan: segmentPartyPlan,
                actorId: activeActorId,
              });
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
                  remainingIntents: beforeIntents,
                },
                after: {
                  state: afterState,
                  openMonsterActorIds: afterOpenActorIds,
                  remainingIntents: afterOpenActorIds.map((actorId) => {
                    const entry = segmentMonsterPlan.get(actorId);
                    if (entry === undefined) throw new Error(`Open monster ${actorId} has no stored plan.`);
                    return entry.intent;
                  }),
                },
              });
              pcTurns.push({
                actor: activeActorId,
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
          }
        }
      } catch (error) {
        if (config.cli === 'local-openai' && selectedAdapter.classifyFailure(error) !== 'unknown') {
          outcome = 'local_error';
          serviceNull = false;
          flapRetries = 0;
        }
        refusals.push(error instanceof Error ? error.message : String(error));
      }
      const wall = performance.now() - started;
      const binding = journal.agentSession();
      rowTurnContext = takeTurnContext(initialLauncher.turnContextSpoolPath) ?? rowTurnContext;
      if (correctionTurnContextSpoolPath !== null) {
        recordedCorrectionTurnContext = takeTurnContext(correctionTurnContextSpoolPath) ??
          recordedCorrectionTurnContext;
      }
      const recordedMonsterIntents = acceptedSubmission ??
        (segmentMonsterPlan.size === 0
          ? null
          : [...segmentMonsterPlan.values()].map((entry) => structuredClone(entry.intent)));
      const teamPlans: ConversationTeamPlans = {
        party: segmentPartyPlan === null ? null : {
          planId: segmentPartyPlan.planId,
          planHash: segmentPartyPlan.planHash,
          sharedObjective: segmentPartyPlan.sharedObjective,
          programs: structuredClone(segmentPartyPlan.programs),
        },
        monsters: proposalId === null || authorizedMonsterProposalHash === null ||
          recordedMonsterIntents === null ? null : {
          initialProposalId: proposalId,
          initialProposalHash: authorizedMonsterProposalHash,
          authorizedIntents: recordedMonsterIntents,
        },
      };
      const totalsTokens = tokenCounts(roundUsage);
      const contextBytes = [
        rowTurnContext.raw,
        ...(recordedCorrectionTurnContext === null ? [] : [recordedCorrectionTurnContext.raw]),
        ...adjustments.flatMap((entry) => [
          entry.rawContext,
          ...(entry.correctionChain === null ? [] : [entry.correctionChain.rawContext]),
        ]),
      ]
        .reduce((total, context) => total + new TextEncoder().encode(context).byteLength, 0);
      const row: ConversationRow = {
        combatModel: config.combatModel,
        roundProtocolVersion: ROUND_PROTOCOL_VERSION,
        startingRoomDigest,
        room, round, cli: config.cli, model: config.model,
        thinkMode: config.localOpenAi?.thinkMode ?? null,
        contextRevision, projectionRevision: capsuleRevision,
        sessionId: rolloutSessionId,
        escalationSessionId,
        sessionIdHash: binding === null ? null : sha256(binding.sessionId), outcome, proposalId,
        kbHash: knowledgeBase?.hash ?? null,
        repoCommit,
        rawTurnContext: rowTurnContext.raw,
        turnContextGranularity: rowTurnContext.granularity,
        snippetHash: SNIPPET_REGISTRY.snippetHash,
        snippetSetHash: SNIPPET_REGISTRY.snippetSetHash,
        suggestedPlay: suggestedPlan?.play ?? null,
        suggestionAdopted: classifySuggestionAdoption(suggestedPlan?.intents ?? null, acceptedSubmission),
        timeToFirstAction: wall,
        wallPerCreature: wall / Math.max(1, livingMonsterIds(engineSession.currentState()).length),
        tokens: totalsTokens, refusals,
        toolCalls: simulated?.callsByRequest.get(requestId) ?? observedToolCalls,
        callsPerRound: adapter.modelCalls - modelCallsBeforeRound,
        agentDispatched, flapRetries, serviceNull,
        contextTruncated: simulated?.contextTruncatedByRequest.get(requestId) ?? observedContextTruncated,
        plannedBy, escalated, escalationModel: firedEscalationModel,
        stateBinding: {
          capsule: { revision: capsule.revision, digest: capsule.digest },
          authorization: authorizationStateBinding,
        },
        authorizedPlan,
        roundNarrative,
        chainEvidence: { failedAttempts, autoResolvedTrigger, correctionFinalText },
        initiativeOrder,
        partyPolicyHash: segmentPartyPlan?.policyHash ?? null,
        materialityPolicyHash: config.combatModel === 'initiative_segments_v1'
          ? PLAN_MATERIALITY_POLICY_HASH
          : null,
        adjustmentBudget: config.combatModel === 'initiative_segments_v1' ? 2 : 0,
        teamPlans,
        pcTurns,
        adjustments,
        monsterSegments,
        roundTotals: {
          initialCalls,
          adjustmentCalls,
          correctionCalls,
          serviceNullAdjustments,
          contextBytes,
          tokens: totalsTokens,
        },
        ...(capturedRlData === undefined ? {} : { rlData: capturedRlData }),
      };
      rows.push(row);
      await appendFile(config.outPath, `${JSON.stringify(row)}\n`, 'utf8');
      completedRounds += 1;
      if (!restoredMidRun && options.restoreAfterRound === completedRounds) {
        const saved = journal.export();
        store = new MemoryBrowserSessionStore();
        importSavedSession(store, saved);
        journal = EncounterSessionJournal.resume(runId, store, new MemoryMirrorSink()).journal;
        lifecycle = new AgentSessionLifecycle(journal, adapter, AGENT_ADAPTER_VERSION);
        restoredMidRun = true;
      }
    }
  }
  const binding = journal.agentSession();
  return { rows, binding, journalExport: journal.export(), restoredMidRun };
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
