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
  type AgentCliKind, type AgentInvocation, type AgentSessionAdapter,
  type AgentSessionBinding, type AgentTurnResult, type AgentUsage,
} from '../src/vtt/agent-session';
import { AgentSessionLifecycle } from '../src/vtt/agent-session-lifecycle';
import { AGENT_ADAPTER_VERSION, resolveAgentAdapter } from '../src/vtt/agent-adapters';
import type { ProposedIntentResolution, RoundIntentProposalEnvelope } from '../src/vtt/engine-envelopes';
import { engineStateHandle } from '../src/vtt/engine-state-capsule';
import {
  EngineRoundSession,
  type EngineBoundaryResolutions,
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
import { renderEnginePrompt } from '../src/vtt/mcp/engine-server';
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

export const CONVERSATION_CLIS = ['codex', 'claude-code'] as const;
export type ConversationCli = (typeof CONVERSATION_CLIS)[number];
export const CONVERSATION_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;
export type ConversationEffort = (typeof CONVERSATION_EFFORTS)[number];

const INITIAL_COORDINATOR_STATE: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};
const RULES_SOURCE = { get: () => null } as const;

export interface ConversationConfig {
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
}

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

export interface ConversationSuggestedPlay {
  readonly name: PlayName;
  readonly hash: string;
}

export type ConversationSuggestionAdoption = 'as_is' | 'edited' | 'ignored';
type SimulatedSuggestionResponse = ConversationSuggestionAdoption | 'legacy';

export interface ConversationRow {
  readonly room: number;
  readonly round: number;
  readonly cli: ConversationCli;
  readonly contextRevision: number;
  readonly projectionRevision: number;
  readonly sessionIdHash: string;
  readonly kbHash: string | null;
  readonly snippetHash: string;
  readonly snippetSetHash: string;
  readonly suggestedPlay: ConversationSuggestedPlay | null;
  readonly suggestionAdopted: ConversationSuggestionAdoption | null;
  readonly outcome: 'authorized' | 'auto_resolved' | 'awaiting_dm_adjudication' | 'refused' | 'service_null';
  readonly proposalId: string | null;
  readonly timeToFirstAction: number;
  readonly wallPerCreature: number;
  readonly tokens: ConversationTokenCounts;
  readonly refusals: readonly string[];
  readonly toolCalls: number;
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
}

export interface ConversationPlannerAttribution {
  readonly model: string;
  readonly effort: ConversationEffort;
}

export interface ConversationRunResult {
  readonly rows: readonly ConversationRow[];
  readonly binding: AgentSessionBinding;
  readonly journalExport: string;
  readonly restoredMidRun: boolean;
}

export interface ConversationRunOptions {
  readonly roomStates?: readonly EncounterState[];
  readonly store?: BrowserSessionStore;
  readonly adapter?: AgentSessionAdapter;
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
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--dry-run') { dryRun = true; continue; }
    if (![
      '--fixtures', '--rooms', '--rounds', '--reps', '--cli', '--model', '--effort',
      '--escalation-model', '--escalation-effort',
      '--out', '--cli-bin', '--timeout-ms', '--kb', '--reaction-ask-default',
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
    throw new TypeError('--cli must be codex or claude-code.');
  }
  const selectedCli = cli as ConversationCli;
  const kbPath = values.has('--kb') ? resolve(values.get('--kb') ?? '') : null;
  if (kbPath !== null) validateKbPath(cwd, kbPath);
  const reactionAskDefault = values.get('--reaction-ask-default') ?? 'decline';
  if (reactionAskDefault !== 'decline' && reactionAskDefault !== 'take') {
    throw new TypeError('--reaction-ask-default must be decline or take.');
  }
  return {
    fixturesPath: resolve(values.get('--fixtures') ?? 'tests/fixtures/arena-basis'),
    rooms: positiveInteger(values.get('--rooms') ?? '12', '--rooms'),
    rounds: positiveInteger(values.get('--rounds') ?? values.get('--reps') ?? '1', '--rounds'),
    cli: selectedCli,
    model: values.get('--model') ?? (selectedCli === 'codex' ? 'gpt-5.6-sol' : 'sonnet'),
    effort: effort as ConversationEffort,
    escalationModel,
    escalationEffort: escalationEffort as ConversationEffort | null,
    outPath,
    dryRun,
    cwd: resolve(cwd),
    cliBin: values.get('--cli-bin') ?? (selectedCli === 'codex' ? 'codex' : 'claude'),
    timeoutMs: positiveInteger(values.get('--timeout-ms') ?? '120000', '--timeout-ms'),
    kbPath,
    reactionAskDefault,
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

async function driveScriptedMcp(
  cwd: string,
  launcherPath: string,
  submit: boolean,
  invalid: boolean,
  reactionGuidance: ReactionGuidanceDeclaration | null,
  suggestionResponse: SimulatedSuggestionResponse,
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
  readonly kind: AgentCliKind;
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
  ) {
    this.kind = kind;
    this.#exhaustInitial = new Set(exhaust);
    this.#invalidInitial = new Set(invalid);
    this.#failCorrection = new Set(fail);
    this.#remainingPrimaryFlaps = new Map(Object.entries(primaryFlaps));
    this.#reactionGuidanceByRequest = reactionGuidanceByRequest;
    this.#suggestionResponseByRequest = suggestionResponseByRequest;
  }

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.#starts += 1;
    const sessionId = this.#starts === 1
      ? `agent-session:SIMULATED:${invocation.runId}`
      : `agent-session:SIMULATED:${invocation.runId}:fresh-${String(this.#starts)}`;
    const manifest = JSON.parse(await readFile(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    return manifest.phase === 'correction'
      ? this.#dispatch(sessionId, invocation, false)
      : completedSimulated(sessionId);
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

function completedSimulated(value: string): AgentTurnResult {
  return {
    sessionId: agentSessionId(value),
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

function takeRoundProposal(path: string): RoundIntentProposalEnvelope | null {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return null; }
  const proposal = source.split('\n').filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line) as unknown).findLast(isRoundProposal) ?? null;
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
}> {
  const fixturePath = join(input.directory, `${input.name}-fixture.json`);
  const spoolPath = join(input.directory, `${input.name}-proposals.jsonl`);
  const manifestPath = join(input.directory, `${input.name}-launcher.json`);
  const recoveryManifestPath = join(input.directory, `${input.name}-launcher-full.json`);
  await writeFile(fixturePath, input.snapshot.fixtureJson, 'utf8');
  await writeFile(spoolPath, '', 'utf8');
  const capsule = input.snapshot.capsule;
  const request = capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error('Conversation launcher requires an ordinary pending request.');
  }
  const manifest: EngineMcpLauncherManifest = {
    format: 'engine-mcp-launcher-v1', fixturePath, proposalSpoolPath: spoolPath,
    runId: capsule.runId, branchId: capsule.branchId,
    revision: capsule.revision, requestId: request.requestId,
    phase: request.phase, correctionNumber: request.correctionNumber,
    room: input.room, historyKind: input.historyKind, toolProfile: 'dm',
    ...(input.turnContextDeltaBase === undefined ? {} : {
      turnContextDeltaBase: input.turnContextDeltaBase,
    }),
  };
  await writeFile(manifestPath, canonicalJson(manifest), 'utf8');
  const { turnContextDeltaBase: _turnContextDeltaBase, ...fullManifest } = manifest;
  await writeFile(recoveryManifestPath, canonicalJson(fullManifest), 'utf8');
  return { manifestPath, recoveryManifestPath, spoolPath };
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
    requestedActorCount: request.actors.length,
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
): AgentInvocation {
  return {
    runId, prompt, instructions, model: planner.model, reasoningEffort: planner.effort,
    sessionProfile: 'arena',
    launcherToken, timeoutMs: config.timeoutMs,
    ...(recoveryLauncherToken === undefined ? {} : { recoveryLauncherToken }),
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
  await writeFile(config.outPath, '', 'utf8');
  const artifacts = await mkdtemp(join(tmpdir(), 'dnd-ai-dm-conversation-'));
  const states = await roomStates(config, options);
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
  ) : null;
  const adapter = options.adapter ?? simulated ?? resolveAgentAdapter(config.cli, {
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
  });
  if (adapter.kind !== config.cli) throw new Error('Configured CLI and agent adapter kind disagree.');
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
    'This is a fresh one-shot escalation session for the single correction in the supplied repair brief. Use only the correction launcher and submit the complete corrected round once; no fallback remains.';
  const prepareRound = (request: EngineRoundCapsuleRequest): EngineRoundSnapshot => {
    const prepared = engineSession.prepareRound(request, journal.reactionGuidance());
    recordAutoResolvedReactions(journal, prepared);
    capsuleRevision += prepared.revisionDelta;
    return prepared.snapshot;
  };

  const firstSnapshot = prepareRound({
    runId, branchId, revision: capsuleRevision, requestId: 'request:room-1-round-1',
    phase: 'initial', room: 1, historyKind: 'session_started',
  });
  let lifecycle = new AgentSessionLifecycle(journal, adapter, AGENT_ADAPTER_VERSION);
  const bootstrap = await writeLauncher({
    directory: artifacts, name: 'bootstrap', snapshot: firstSnapshot,
    room: 1, historyKind: 'session_started',
  });
  await lifecycle.coldStart(invocation(
    config, runId,
    'Establish one persistent AI-DM session for this dungeon run. Do not propose a turn until the host resumes you.',
    bootstrap.manifestPath,
    knowledgeBase?.text ?? null,
  ), new AbortController().signal);

  for (let room = 1; room <= config.rooms; room += 1) {
    if (room > 1) {
      engineSession.replaceEncounterState(states[room - 1]!);
      capsuleRevision += 1;
      const requestId = `request:room-${String(room)}-round-1`;
      const snapshot = prepareRound({
        runId, branchId, revision: capsuleRevision, requestId,
        phase: 'initial', room, historyKind: 'room_transition',
      });
      const launcher = await writeLauncher({
        directory: artifacts, name: `room-${String(room)}-transition`, snapshot,
        room, historyKind: 'room_transition',
      });
      const contextCallsBeforeTransition = simulated?.contextCallsByRequest.get(requestId) ??
        observedTurnContextCalls;
      await lifecycle.resumeRoomTransition(invocation(
        config, runId,
        `[ROOM_TRANSITION] Enter room ${String(room)}. Call engine.get_turn_context once with granularity "full"; do not submit intents yet.`,
        launcher.manifestPath,
        null,
        basePlanner,
        launcher.recoveryManifestPath,
      ), new AbortController().signal);
      const contextCallsAfterTransition = simulated?.contextCallsByRequest.get(requestId) ??
        observedTurnContextCalls;
      lastSeenTurnContext = contextCallsAfterTransition > contextCallsBeforeTransition
        ? fullTurnContextBase(engineSession.currentState(), snapshot)
        : undefined;
    }

    for (let round = 1; round <= config.rounds; round += 1) {
      const started = performance.now();
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
        : prepareRound(initialRequest);
      const capsule = initialSnapshot.capsule;
      const suggestedPlan = suggestedPlanBookkeeping(capsule);
      const contextRevision = capsule.revision;
      const authoritativeInitialRequest = { ...initialRequest, revision: contextRevision };
      const currentTurnContext = fullTurnContextBase(engineSession.currentState(), initialSnapshot);
      const initialLauncher = await writeLauncher({
        directory: artifacts, name: `${key}-initial`, snapshot: initialSnapshot, room,
        historyKind: round === 1 ? 'room_ready' : 'proposal_applied',
        ...(lastSeenTurnContext === undefined ? {} : {
          turnContextDeltaBase: lastSeenTurnContext,
        }),
      });
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
      let roundNarrative: ConversationRow['roundNarrative'] = null;
      let initialDispatchPlanner: ConversationPlannerAttribution | null = null;
      let correctionDispatchPlanner: ConversationPlannerAttribution | null = null;
      let plannedBy: ConversationRow['plannedBy'] = null;
      let escalated = false;
      let firedEscalationModel: string | null = null;
      try {
        if (options.failBeforeDispatch?.includes(key) === true) {
          throw new Error('SIMULATED host failure before agent dispatch.');
        }
        const dispatchBefore = journal.agentSession()?.lastDispatchedRevision ?? null;
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
              null, basePlanner, initialLauncher.recoveryManifestPath,
            );
            initialDispatchPlanner = plannerAttribution(primaryInvocation);
            const turn = await lifecycle.resumeRound(
              primaryInvocation,
              new AbortController().signal,
            );
            roundUsage = addAgentUsage(roundUsage, turn.usage);
            proposed = takeRoundProposal(initialLauncher.spoolPath);
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
          const dispatchAfter = journal.agentSession()?.lastDispatchedRevision ?? null;
          agentDispatched = dispatchAfter !== null && dispatchAfter !== dispatchBefore;
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
        const correctionLauncher = await writeLauncher({
          directory: artifacts, name: `${key}-correction`, snapshot: correctionSnapshot,
          room, historyKind: 'intent_correction_requested',
          ...(correctionTurnContextBase === undefined ? {} : {
            turnContextDeltaBase: correctionTurnContextBase,
          }),
        });
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
              const applied = engineSession.applyResolvedMechanics(mechanics, effectiveReactionGuidance);
              capsuleRevision += Math.max(1, applied.revisionDelta);
              recordAutoResolvedReactions(journal, applied);
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
                  correctionTurn.sessionId === journal.agentSession()?.sessionId) {
                  throw new Error('Tiered correction did not create an isolated escalation session.');
                }
                roundUsage = addAgentUsage(roundUsage, correctionTurn.usage);
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
            ),
            signal: new AbortController().signal,
            activateCapsule: () => undefined,
            takeProposal: () => takeRoundProposal(correctionLauncher.spoolPath),
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
      } catch (error) {
        refusals.push(error instanceof Error ? error.message : String(error));
      }
      const wall = performance.now() - started;
      const binding = journal.agentSession();
      if (binding === null) throw new Error('Conversation lost its persisted agent session binding.');
      const row: ConversationRow = {
        room, round, cli: config.cli, contextRevision, projectionRevision: capsuleRevision,
        sessionIdHash: sha256(binding.sessionId), outcome, proposalId,
        kbHash: knowledgeBase?.hash ?? null,
        snippetHash: SNIPPET_REGISTRY.snippetHash,
        snippetSetHash: SNIPPET_REGISTRY.snippetSetHash,
        suggestedPlay: suggestedPlan?.play ?? null,
        suggestionAdopted: classifySuggestionAdoption(suggestedPlan?.intents ?? null, acceptedSubmission),
        timeToFirstAction: wall,
        wallPerCreature: wall / Math.max(1, livingMonsterIds(engineSession.currentState()).length),
        tokens: tokenCounts(roundUsage), refusals,
        toolCalls: simulated?.callsByRequest.get(requestId) ?? observedToolCalls,
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
  if (binding === null) throw new Error('Conversation completed without a persisted agent session binding.');
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
