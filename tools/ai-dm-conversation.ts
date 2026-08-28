import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { appendFile, mkdtemp, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { createInterface, type Interface } from 'node:readline';
import { canonicalJson } from '../src/commands/canonical-json';
import type { PersistedCoordinatorState } from '../src/combat/coordinator';
import type { EncounterState } from '../src/combat/encounter';
import type { EncounterCommand } from '../src/combat/events';
import { monsterAttackCommand } from '../src/combat/monster-commands';
import { mulberry32, restoreMulberry32, type SerializableRng } from '../src/combat/random';
import type { MonsterAttackAction } from '../src/combat/statblock';
import {
  agentSessionId, encounterBranchId, encounterSessionId,
  type CombatantId, type EncounterBranchId, type EncounterSessionId,
} from '../src/combat/values';
import { sha256 } from '../src/crypto/sha256';
import {
  type AgentCliKind, type AgentInvocation, type AgentSessionAdapter,
  type AgentSessionBinding, type AgentTurnResult, type AgentUsage,
} from '../src/vtt/agent-session';
import { AgentSessionLifecycle } from '../src/vtt/agent-session-lifecycle';
import { AGENT_ADAPTER_VERSION, resolveAgentAdapter } from '../src/vtt/agent-adapters';
import type { RoundIntentProposalEnvelope } from '../src/vtt/engine-envelopes';
import { engineStateHandle, type EngineStateCapsule } from '../src/vtt/engine-state-capsule';
import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';
import {
  pureIntentResolver, type EngineActionChoice, type EngineIntentBranch,
  type EngineTurnIntent, type ResolvedIntentMechanics,
} from '../src/vtt/intent-resolver';
import { mcpRequestMeta } from '../src/vtt/mcp/handler';
import {
  createEngineMcpRuntime, loadArenaFixture, type EngineMcpLauncherManifest,
} from '../src/vtt/mcp/entrypoint';
import { renderEnginePrompt } from '../src/vtt/mcp/engine-server';
import {
  EncounterSessionJournal, importSavedSession, MemoryBrowserSessionStore,
  MemoryMirrorSink, type BrowserSessionStore,
} from '../src/vtt/session-persistence';
import { reduceSessionEncounter } from '../src/vtt/session-encounter-reducer';
import {
  TurnExhaustionCoordinator, type DeterministicIntentResolution,
  type InitialIntentAttempt, type TurnExhaustionHost,
} from '../src/vtt/turn-exhaustion-coordinator';
import {
  type AutoResolvedReactionOffer,
  unattendedReactionOfferResolution,
  type ReactionOfferHostPolicy,
  type UnattendedReactionAskDefault,
} from '../src/vtt/reaction-offer-host-policy';

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

export interface ConversationRow {
  readonly room: number;
  readonly round: number;
  readonly cli: ConversationCli;
  readonly contextRevision: number;
  readonly projectionRevision: number;
  readonly sessionIdHash: string;
  readonly kbHash: string | null;
  readonly outcome: 'authorized' | 'auto_resolved' | 'awaiting_dm_adjudication' | 'refused';
  readonly proposalId: string | null;
  readonly timeToFirstAction: number;
  readonly wallPerCreature: number;
  readonly tokens: ConversationTokenCounts;
  readonly refusals: readonly string[];
  readonly toolCalls: number;
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
  readonly failCorrection?: readonly string[];
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

function tokenCounts(usage: AgentUsage | null): ConversationTokenCounts {
  return usage === null ? { input: 0, cachedInput: 0, output: 0, reasoning: 0 } : {
    input: usage.inputTokens,
    cachedInput: usage.cachedInputTokens,
    output: usage.outputTokens,
    reasoning: usage.reasoningTokens,
  };
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
    case 'attack': return { kind: choice.kind, action_id: choice.actionId, target: externalTarget(choice.target) };
    case 'cast_spell': return {
      kind: choice.kind, spell_id: choice.spellId,
      target: choice.target === null ? null : externalTarget(choice.target),
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
    engagement: { stance: branch.engagement.stance },
  };
}

function externalIntent(intent: EngineTurnIntent): Readonly<Record<string, unknown>> {
  return {
    actor_id: intent.actorId,
    ...externalBranch(intent),
    fallback: intent.fallback === null ? null : externalBranch(intent.fallback),
  };
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

async function driveScriptedMcp(cwd: string, launcherPath: string, submit: boolean): Promise<number> {
  const manifest = JSON.parse(await readFile(launcherPath, 'utf8')) as EngineMcpLauncherManifest;
  const state = await loadArenaFixture(manifest.fixturePath);
  const client = startMcpClient(cwd, launcherPath);
  let calls = 0;
  try {
    await mcpRequest(client, 'server/discover', {});
    const contextResult = asRecord(await mcpRequest(client, 'tools/call', {
      name: 'engine.get_turn_context',
      arguments: { run_id: manifest.runId, expected_revision: manifest.revision, scope: 'round' },
    }));
    calls += 1;
    if (contextResult === null || contextResult['isError'] !== false || !submit) return calls;
    const context = asRecord(contextResult['structuredContent']);
    const stateRef = context === null ? null : asRecord(context['state_ref']);
    if (stateRef === null) throw new Error('engine.get_turn_context omitted state_ref.');
    const submitResult = asRecord(await mcpRequest(client, 'tools/call', {
      name: 'engine.submit_round_intents',
      arguments: {
        state_ref: stateRef,
        request_id: manifest.requestId,
        phase: manifest.phase,
        idempotency_key: `SIMULATED-${manifest.requestId}-${manifest.phase}`.slice(0, 200),
        intents: scriptedIntents(state, manifest.phase).map(externalIntent),
      },
    }));
    calls += 1;
    if (submitResult === null || submitResult['isError'] !== false) {
      throw new Error('engine.submit_round_intents failed in the SIMULATED client.');
    }
  } finally {
    await stopMcpClient(client);
  }
  return calls;
}

class SimulatedConversationAdapter implements AgentSessionAdapter {
  readonly kind: AgentCliKind;
  readonly callsByRequest = new Map<string, number>();
  readonly #exhaustInitial: ReadonlySet<string>;
  readonly #failCorrection: ReadonlySet<string>;

  constructor(kind: ConversationCli, private readonly cwd: string, exhaust: readonly string[], fail: readonly string[]) {
    this.kind = kind;
    this.#exhaustInitial = new Set(exhaust);
    this.#failCorrection = new Set(fail);
  }

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    return completedSimulated(`agent-session:SIMULATED:${invocation.runId}`);
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    const manifest = JSON.parse(await readFile(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    const key = manifest.requestId.replace(/^request:/u, '');
    const roomTransition = invocation.prompt.startsWith('[ROOM_TRANSITION]');
    const submit = !roomTransition && !(manifest.phase === 'initial'
      ? this.#exhaustInitial.has(key) : this.#failCorrection.has(key));
    const calls = await driveScriptedMcp(this.cwd, invocation.launcherToken, submit);
    this.callsByRequest.set(manifest.requestId, (this.callsByRequest.get(manifest.requestId) ?? 0) + calls);
    return completedSimulated(binding.sessionId);
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
    typeof input['idempotencyKey'] === 'string' && Array.isArray(input['resolutions']);
}

function takeRoundProposal(path: string): RoundIntentProposalEnvelope | null {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return null; }
  const proposal = source.split('\n').filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line) as unknown).findLast(isRoundProposal) ?? null;
  return proposal === null ? null : structuredClone(proposal);
}

function capsuleFor(input: {
  readonly state: EncounterState;
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly requestId: string;
  readonly phase: 'initial' | 'correction';
  readonly room: number;
  readonly historyKind: string;
}): EngineStateCapsule {
  return createEngineMcpRuntime(input.state, {
    runId: input.runId, branchId: input.branchId, revision: input.revision,
    requestId: input.requestId, phase: input.phase,
    correctionNumber: input.phase === 'correction' ? 1 : 0,
    room: input.room, historyKind: input.historyKind,
  }).feed.current();
}

async function writeLauncher(input: {
  readonly directory: string;
  readonly name: string;
  readonly state: EncounterState;
  readonly capsule: EngineStateCapsule;
  readonly room: number;
  readonly historyKind: string;
}): Promise<{ readonly manifestPath: string; readonly spoolPath: string }> {
  const fixturePath = join(input.directory, `${input.name}-fixture.json`);
  const spoolPath = join(input.directory, `${input.name}-proposals.jsonl`);
  const manifestPath = join(input.directory, `${input.name}-launcher.json`);
  await writeFile(fixturePath, canonicalJson({ encounter: { state: input.state } }), 'utf8');
  await writeFile(spoolPath, '', 'utf8');
  const request = input.capsule.request;
  if (request === null) throw new Error('Conversation capsule must have a pending request.');
  const manifest: EngineMcpLauncherManifest = {
    format: 'engine-mcp-launcher-v1', fixturePath, proposalSpoolPath: spoolPath,
    runId: input.capsule.runId, branchId: input.capsule.branchId,
    revision: input.capsule.revision, requestId: request.requestId,
    phase: request.phase, correctionNumber: request.correctionNumber,
    room: input.room, historyKind: input.historyKind,
  };
  await writeFile(manifestPath, canonicalJson(manifest), 'utf8');
  return { manifestPath, spoolPath };
}

function selectedChoice(entry: RoundIntentProposalEnvelope['resolutions'][number]): EngineActionChoice {
  if (entry.selectedBranch === 'primary') return entry.intent.choice;
  if (entry.intent.fallback === null) throw new Error('Fallback resolution omitted its branch.');
  return entry.intent.fallback.choice;
}

function reduceOne(state: EncounterState, command: EncounterCommand, rng: SerializableRng): EncounterState {
  return reduceSessionEncounter(state, command, rng).state;
}

function resolveUnattendedReactionOffers(
  initialState: EncounterState,
  rng: SerializableRng,
  policy: ReactionOfferHostPolicy,
): {
  readonly state: EncounterState;
  readonly resolutions: readonly AutoResolvedReactionOffer[];
} {
  let state = initialState;
  const resolutions: AutoResolvedReactionOffer[] = [];
  for (;;) {
    const selected = state.pendingDecisions.flatMap((decision) => {
      if (decision.kind !== 'reaction_offer') return [];
      const resolution = unattendedReactionOfferResolution(
        state,
        decision,
        'algorithm',
        policy,
      );
      return resolution === null ? [] : [resolution];
    })[0];
    if (selected === undefined) return { state, resolutions };
    state = reduceOne(state, {
      type: 'resolve_pending_decision',
      decisionId: selected.decisionId,
      optionId: selected.resolution,
    }, rng);
    resolutions.push(selected);
  }
}

function recordAutoResolvedReactions(
  journal: EncounterSessionJournal,
  resolutions: readonly AutoResolvedReactionOffer[],
): void {
  for (const resolution of resolutions) {
    journal.recordHostTransition({
      kind: 'unattended_reaction_auto_resolved',
      ...resolution,
    });
  }
}

function advanceToActor(state: EncounterState, actorId: CombatantId, rng: SerializableRng): EncounterState {
  let current = state;
  if (current.initiative.length === 0) current = reduceOne(current, { type: 'roll_initiative' }, rng);
  for (let index = 0; current.activeCombatant !== actorId && index < current.combatants.length * 3; index += 1) {
    const active = current.activeCombatant;
    if (active === null) throw new Error('Initiative has no active combatant.');
    current = reduceOne(current, { type: 'end_turn', actor: active }, rng);
  }
  if (current.activeCombatant !== actorId) throw new Error(`Could not advance initiative to ${actorId}.`);
  return current;
}

function applyResolvedMechanics(
  state: EncounterState,
  mechanics: ResolvedIntentMechanics,
  choice: EngineActionChoice,
  rng: SerializableRng,
  reactionPolicy: ReactionOfferHostPolicy,
): {
  readonly state: EncounterState;
  readonly autoResolvedReactions: readonly AutoResolvedReactionOffer[];
} {
  const autoResolvedReactions: AutoResolvedReactionOffer[] = [];
  const reduce = (current: EncounterState, command: EncounterCommand): EncounterState => {
    const reduced = reduceOne(current, command, rng);
    const resolved = resolveUnattendedReactionOffers(reduced, rng, reactionPolicy);
    autoResolvedReactions.push(...resolved.resolutions);
    return resolved.state;
  };
  let current = advanceToActor(state, mechanics.actorId, rng);
  if (mechanics.path.length > 0) {
    current = reduce(current, {
      type: 'move', actor: mechanics.actorId, path: mechanics.path, cause: 'voluntary',
    });
  }
  if (current.combatants.find((entry) => entry.profile.id === mechanics.actorId)?.life !== 'living') {
    return { state: current, autoResolvedReactions };
  }
  switch (choice.kind) {
    case 'attack': {
      if (mechanics.targetId === null) throw new Error('Resolved attack omitted its target.');
      const action = canonicalEngineQueryPort.actions(current, mechanics.actorId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === mechanics.actionId);
      if (action === undefined) throw new Error(`Resolved attack ${mechanics.actionId} is absent.`);
      current = reduce(current, monsterAttackCommand(action, mechanics.actorId, mechanics.targetId));
      break;
    }
    case 'dodge':
    case 'disengage':
    case 'dash': current = reduce(current, { type: choice.kind, actor: mechanics.actorId }); break;
    case 'end_turn': return {
      state: reduce(current, { type: 'end_turn', actor: mechanics.actorId }),
      autoResolvedReactions,
    };
    case 'cast_spell':
    case 'use_action': throw new Error(`Arena host cannot authorize unresolved ${choice.kind} mechanics.`);
  }
  return {
    state: reduce(current, { type: 'end_turn', actor: mechanics.actorId }),
    autoResolvedReactions,
  };
}

function authorizedMechanics(state: EncounterState, proposal: RoundIntentProposalEnvelope): readonly {
  readonly mechanics: ResolvedIntentMechanics;
  readonly choice: EngineActionChoice;
}[] | null {
  const resolved = proposal.resolutions.map((entry) => {
    const checked = pureIntentResolver.resolve(state, entry.intent);
    if (!checked.valid || checked.selectedBranch !== entry.selectedBranch ||
      checked.resolutionDigest !== entry.resolutionDigest) return null;
    const choice = selectedChoice(entry);
    return choice.kind === 'cast_spell' || choice.kind === 'use_action'
      ? null : { mechanics: checked.mechanics, choice };
  });
  return resolved.some((entry) => entry === null) ? null : resolved as readonly {
    readonly mechanics: ResolvedIntentMechanics;
    readonly choice: EngineActionChoice;
  }[];
}

function invocation(
  config: ConversationConfig,
  runId: EncounterSessionId,
  prompt: string,
  launcherToken: string,
  instructions: string | null = null,
): AgentInvocation {
  return {
    runId, prompt, instructions, model: config.model, reasoningEffort: config.effort,
    launcherToken, timeoutMs: config.timeoutMs,
  };
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
  const simulated = config.dryRun ? new SimulatedConversationAdapter(
    config.cli, config.cwd, options.exhaustInitial ?? [], options.failCorrection ?? [],
  ) : null;
  const adapter = options.adapter ?? simulated ?? resolveAgentAdapter(config.cli, {
    binary: config.cliBin, cwd: config.cwd, engineCommand: process.execPath,
    engineArgs: [
      resolve(config.cwd, 'node_modules/vite-node/vite-node.mjs'),
      resolve(config.cwd, 'tools/engine-mcp-server.ts'),
    ],
    onStdoutLine: (line) => {
      try { observedToolCalls += eventToolNames(JSON.parse(line) as unknown).length; } catch { /* non-JSON */ }
    },
  });
  if (adapter.kind !== config.cli) throw new Error('Configured CLI and agent adapter kind disagree.');
  let lifecycle = new AgentSessionLifecycle(journal, adapter, AGENT_ADAPTER_VERSION);
  const firstCapsule = capsuleFor({
    state: states[0]!, runId, branchId, revision: 1, requestId: 'request:room-1-round-1',
    phase: 'initial', room: 1, historyKind: 'session_started',
  });
  const bootstrap = await writeLauncher({
    directory: artifacts, name: 'bootstrap', state: states[0]!, capsule: firstCapsule,
    room: 1, historyKind: 'session_started',
  });
  await lifecycle.coldStart(invocation(
    config, runId,
    'Establish one persistent AI-DM session for this dungeon run. Do not propose a turn until the host resumes you.',
    bootstrap.manifestPath,
    knowledgeBase?.text ?? null,
  ), new AbortController().signal);

  const rows: ConversationRow[] = [];
  let capsuleRevision = 1;
  let state = structuredClone(states[0]!);
  let hostRng: SerializableRng = mulberry32(8_274_113);
  let completedRounds = 0;
  let restoredMidRun = false;

  for (let room = 1; room <= config.rooms; room += 1) {
    if (room > 1) {
      state = structuredClone(states[room - 1]!);
      capsuleRevision += 1;
    }
    const beforeReactionResolution = state.revision;
    const roomReactionResolution = resolveUnattendedReactionOffers(state, hostRng, {
      kind: 'unattended',
      askDefault: config.reactionAskDefault,
    });
    state = roomReactionResolution.state;
    recordAutoResolvedReactions(journal, roomReactionResolution.resolutions);
    capsuleRevision += state.revision - beforeReactionResolution;
    if (room > 1) {
      const requestId = `request:room-${String(room)}-round-1`;
      const capsule = capsuleFor({ state, runId, branchId, revision: capsuleRevision, requestId, phase: 'initial', room, historyKind: 'room_transition' });
      const launcher = await writeLauncher({ directory: artifacts, name: `room-${String(room)}-transition`, state, capsule, room, historyKind: 'room_transition' });
      await lifecycle.resumeRoomTransition(invocation(
        config, runId,
        `[ROOM_TRANSITION] Enter room ${String(room)}. Call engine.get_turn_context once; do not submit intents yet.`,
        launcher.manifestPath,
      ), new AbortController().signal);
    }

    for (let round = 1; round <= config.rounds; round += 1) {
      const started = performance.now();
      observedToolCalls = 0;
      const contextRevision = capsuleRevision;
      const requestId = `request:room-${String(room)}-round-${String(round)}`;
      const key = `room-${String(room)}-round-${String(round)}`;
      const capsule = capsuleFor({
        state, runId, branchId, revision: contextRevision, requestId,
        phase: 'initial', room, historyKind: round === 1 ? 'room_ready' : 'proposal_applied',
      });
      const initialLauncher = await writeLauncher({
        directory: artifacts, name: `${key}-initial`, state, capsule, room,
        historyKind: round === 1 ? 'room_ready' : 'proposal_applied',
      });
      let turn: AgentTurnResult | null = null;
      let roundUsage: AgentUsage | null = null;
      let proposalId: string | null = null;
      let outcome: ConversationRow['outcome'] = 'refused';
      const refusals: string[] = [];
      try {
        turn = await lifecycle.resumeRound(invocation(
          config, runId, renderEnginePrompt('plan_round', capsule, RULES_SOURCE), initialLauncher.manifestPath,
        ), new AbortController().signal);
        roundUsage = addAgentUsage(roundUsage, turn.usage);
        const proposed = takeRoundProposal(initialLauncher.spoolPath);
        const initial: InitialIntentAttempt = proposed === null ? {
          kind: 'exhausted', requestId, initialProposalId: `exhausted:${requestId}`,
          actorFailures: livingMonsterIds(state).map((actorId) => ({ actorId, fallbackResult: 'absent' })),
        } : { kind: 'proposal', proposal: proposed };
        const correctionCapsule = capsuleFor({
          state, runId, branchId, revision: contextRevision, requestId,
          phase: 'correction', room, historyKind: 'intent_correction_requested',
        });
        const correctionLauncher = await writeLauncher({
          directory: artifacts, name: `${key}-correction`, state, capsule: correctionCapsule,
          room, historyKind: 'intent_correction_requested',
        });
        const host: TurnExhaustionHost = {
          authorize: async (proposal) => {
            const expectedCapsule = proposal.phase === 'initial' ? capsule : correctionCapsule;
            if (proposal.runId !== runId || proposal.branchId !== branchId || proposal.requestId !== requestId ||
              proposal.expectedRevision !== contextRevision || proposal.stateDigest !== expectedCapsule.digest ||
              proposal.stateHandle !== engineStateHandle(expectedCapsule)) return 'invalidated';
            const mechanics = authorizedMechanics(state, proposal);
            if (mechanics === null) return 'invalid';
            const trialRng = restoreMulberry32(hostRng.snapshot());
            let trialState = state;
            const autoResolvedReactions: AutoResolvedReactionOffer[] = [];
            try {
              for (const entry of mechanics) {
                const applied = applyResolvedMechanics(
                  trialState,
                  entry.mechanics,
                  entry.choice,
                  trialRng,
                  { kind: 'unattended', askDefault: config.reactionAskDefault },
                );
                trialState = applied.state;
                autoResolvedReactions.push(...applied.autoResolvedReactions);
              }
            } catch { return 'invalid'; }
            capsuleRevision += Math.max(1, trialState.revision - state.revision);
            state = trialState;
            hostRng = trialRng;
            proposalId = proposal.proposalId;
            recordAutoResolvedReactions(journal, autoResolvedReactions);
            return 'authorized';
          },
          resolveDeterministically: async (actorId): Promise<DeterministicIntentResolution> => ({
            actorId, expectedRevision: capsuleRevision,
            resolutionDigest: sha256(canonicalJson({ actorId, choice: 'dodge', revision: capsuleRevision })),
          }),
          applyAutoResolved: async (resolution) => {
            const position = canonicalEngineQueryPort.tokenPosition(state, resolution.actorId);
            if (position === null) throw new Error('Deterministic actor has no token.');
            const trialRng = restoreMulberry32(hostRng.snapshot());
            const applied = applyResolvedMechanics(state, {
              actorId: resolution.actorId, actionId: 'dodge', targetId: null,
              movementCostFeet: 0, path: [], finalPosition: position,
            }, { kind: 'dodge' }, trialRng, {
              kind: 'unattended', askDefault: config.reactionAskDefault,
            });
            capsuleRevision += Math.max(1, applied.state.revision - state.revision);
            state = applied.state;
            hostRng = trialRng;
            recordAutoResolvedReactions(journal, applied.autoResolvedReactions);
          },
          pauseForDmAdjudication: ({ actorId, reason }) => { refusals.push(`${actorId}: ${reason}`); },
        };
        const coordinated = await new TurnExhaustionCoordinator(journal.turnExhaustionPersistence()).coordinate({
          initial,
          correction: {
            capsule: correctionCapsule, rules: RULES_SOURCE,
            turnContext: { revision: contextRevision, room, round },
            lifecycle: {
              resumeCorrection: async (correctionInvocation: AgentInvocation, signal: AbortSignal) => {
                const correctionTurn = await lifecycle.resumeCorrection(correctionInvocation, signal);
                roundUsage = addAgentUsage(roundUsage, correctionTurn.usage);
                return correctionTurn;
              },
            },
            invocation: invocation(config, runId, 'replaced by correction renderer', correctionLauncher.manifestPath),
            signal: new AbortController().signal,
            activateCapsule: () => undefined,
            takeProposal: () => takeRoundProposal(correctionLauncher.spoolPath),
          },
          host,
        });
        outcome = coordinated.kind;
        if (coordinated.kind === 'authorized') proposalId = coordinated.proposalId;
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
        timeToFirstAction: wall,
        wallPerCreature: wall / Math.max(1, livingMonsterIds(state).length),
        tokens: tokenCounts(roundUsage), refusals,
        toolCalls: simulated?.callsByRequest.get(requestId) ?? observedToolCalls,
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
