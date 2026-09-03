import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  agentSessionIdFromCli,
  contextTokenCount,
  turnInputTotal,
  measuredContextRolloverThreshold,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import { AgentSessionLifecycle } from '../../../src/vtt/agent-session-lifecycle';
import {
  parseConversationArgs,
  proposalResolutionDivergence,
  runConversation,
} from '../../../tools/ai-dm-conversation';
import { mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { armorClass, encounterSessionId, type CombatantId } from '../../../src/combat/values';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { generateRoom } from '../../../src/vtt/room-generator';
import { availableEngineActorOptions, pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  loadArenaFixture,
  parseEngineMcpJsonLine,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import { mcpRequestMeta, type McpHandler } from '../../../src/vtt/mcp/handler';
import { reduceSessionEncounter } from '../../../src/vtt/session-encounter-reducer';
import {
  importSavedSession,
  exportSavedSession,
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { codexArgv } from '../../../src/vtt/agent-adapters/codex';
import {
  applyRevisionDelta,
  type RevisionDeltaOperation,
} from '../../../src/vtt/dm-bridge/projection-transport';
import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { alternatingInitiativeRoom } from '../../fixtures/initiative-segments/alternating-room';
import {
  createScriptedPartyPlan,
  type ScriptedPartyDecisionPolicy,
} from '../../../src/vtt/scripted-party-round';
import {
  AI_DM_KB_FIXTURE_DIRECTORY,
  DEFAULT_AI_DM_KB_ROOT,
  KB_SUBJECTS,
} from '../../../src/vtt/knowledge-base-contract';
import { declareTestInputs } from '../../helpers/test-inputs';

const kbInputs = declareTestInputs({ fixtures: [
  'tests/fixtures/ai-dm-kb/ai-dm-core.md',
  'tests/fixtures/ai-dm-kb/tactics.md',
] });
const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';

async function runConversationWithPartyPolicy(
  decisionPolicy: ScriptedPartyDecisionPolicy,
  config: Parameters<typeof runConversation>[0],
  options?: Parameters<typeof runConversation>[1],
): Promise<Awaited<ReturnType<typeof runConversation>>> {
  return runConversation(config, { ...options, partyPolicyOverride: decisionPolicy });
}

class RecordingConversationAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  readonly startInvocations: AgentInvocation[] = [];
  readonly resumeInvocations: AgentInvocation[] = [];

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.startInvocations.push(invocation);
    return this.completed(agentSessionIdFromCli('codex:SIMULATED-kb-session'));
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.resumeInvocations.push(invocation);
    return this.completed(binding.sessionId);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }

  private completed(sessionId: AgentTurnResult['resumeSessionId']): AgentTurnResult {
    return { resumeSessionId: sessionId, sessionId: null, finalText: 'SIMULATED', usage: null, exit: 'completed' };
  }
}

function objectValue(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function serializedToolCall(
  handler: McpHandler,
  name: string,
  argumentsValue: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const message = parseEngineMcpJsonLine(JSON.stringify({
    jsonrpc: '2.0', id: `serialized:${name}`, method: 'tools/call',
    params: {
      name,
      arguments: argumentsValue,
      _meta: mcpRequestMeta({ name: 'serialized-round-trip-test', version: '1.0.0' }),
    },
  }));
  const response = handler.handle(message);
  if (response === null || response.error !== undefined) {
    throw new Error(`Serialized ${name} call failed: ${JSON.stringify(response)}`);
  }
  const result = objectValue(response.result, `${name} result`);
  if (result['isError'] !== false) throw new Error(`Serialized ${name} tool failed: ${JSON.stringify(result)}`);
  return objectValue(result['structuredContent'], `${name} structured content`);
}

class SerializedRoundTripAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  readonly submittedOptions: Readonly<Record<string, unknown>>[] = [];
  readonly decodedOptions: Readonly<Record<string, unknown>>[] = [];
  readonly turnContexts: Readonly<Record<string, unknown>>[] = [];
  readonly startInvocations: AgentInvocation[] = [];
  readonly resumeInvocations: AgentInvocation[] = [];
  #startCount = 0;

  constructor(
    private readonly choice: 'use_action_dodge' | 'targeted_web' | 'attack' | 'invalid_then_dodge' | 'option_shaped_end_turn',
    private readonly usageInputs: number[] = [],
  ) {}

  async probe() { return { present: true, version: 'SERIALIZED-TEST' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.startInvocations.push(invocation);
    this.#startCount += 1;
    const sessionId = agentSessionIdFromCli(
      `codex:serialized:${invocation.runId}:session-${String(this.#startCount)}`,
    );
    return this.dispatch(sessionId, invocation);
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.resumeInvocations.push(invocation);
    return this.dispatch(binding.sessionId, invocation);
  }

  private async dispatch(
    sessionId: AgentTurnResult['resumeSessionId'],
    invocation: AgentInvocation,
  ): Promise<AgentTurnResult> {
    const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    expect(manifest.toolProfile).toBe('dm');
    const state = await loadArenaFixture(manifest.fixturePath);
    const runtime = createEngineMcpRuntime(state, {
      runId: manifest.runId,
      branchId: manifest.branchId,
      revision: manifest.revision,
      requestId: manifest.requestId,
      phase: manifest.phase,
      correctionNumber: manifest.correctionNumber,
      room: manifest.room,
      historyKind: manifest.historyKind,
      ...(manifest.toolProfile === undefined ? {} : { toolProfile: manifest.toolProfile }),
      ...(manifest.turnContextDeltaBase === undefined ? {} : {
        turnContextDeltaBase: manifest.turnContextDeltaBase,
      }),
      ...(manifest.initiativeProjection === undefined ? {} : {
        initiativeProjection: manifest.initiativeProjection,
      }),
    });
    const wireContext = serializedToolCall(runtime.handler, 'engine.get_turn_context', {
      run_id: manifest.runId, expected_revision: manifest.revision, scope: 'round',
      ...(manifest.turnContextDeltaBase === undefined ? { granularity: 'full' } : {
        granularity: 'turn_delta', since_revision: manifest.turnContextDeltaBase.revision,
      }),
    });
    const changes = wireContext['changes'];
    const context = wireContext['granularity'] !== 'turn_delta'
      ? wireContext
      : manifest.turnContextDeltaBase === undefined || !Array.isArray(changes)
        ? null
        : applyRevisionDelta(
            manifest.turnContextDeltaBase.context,
            changes as readonly RevisionDeltaOperation[],
          );
    if (context === null) throw new Error('Serialized turn delta could not be reconstructed.');
    this.turnContexts.push(context);
    const stateRef = objectValue(context['state_ref'], 'serialized state ref');
    const actors = runtime.feed.current().request?.actors;
    if (actors === undefined) throw new Error('Serialized round request has no actors.');
    let specialSubmitted = false;
    const proposals = actors.map((actorId) => {
      const options = runtime.feed.current().projection.combatants
        .find((combatant) => combatant.id === actorId)?.options ?? [];
      const special = !specialSubmitted ? options.find((option) => option.actionSlots.some((slot) =>
        this.choice === 'attack'
          ? slot.use.kind === 'attack' || slot.use.kind === 'multiattack'
          : this.choice === 'targeted_web'
            ? slot.use.kind === 'saving_throw' && slot.use.actionId === 'web'
            : false)) : undefined;
      if (special !== undefined) specialSubmitted = true;
      const requestedKind = this.choice === 'option_shaped_end_turn' ? 'end_turn' : 'dodge';
      const selected = special ?? options.find((option) => option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === requestedKind));
      if (selected === undefined) throw new Error(`Serialized round has no ${requestedKind} option for ${actorId}.`);
      this.submittedOptions.push({ option_id: selected.optionId, label: selected.label });
      return {
        actor_id: actorId,
        expected_revision: manifest.revision,
        primary_option_id: selected.optionId,
        fallback_option_id: null,
        override_justification: requestedKind === 'dodge' || requestedKind === 'end_turn'
          ? { reason: 'objective', note: 'Serialized fixture intentionally selects a dominated option.' }
          : null,
      };
    });
    if ((this.choice === 'attack' || this.choice === 'targeted_web') && !specialSubmitted) {
      throw new Error(`Serialized round has no requested actor with a resolvable ${this.choice}.`);
    }
    const submitted = serializedToolCall(runtime.handler, 'engine.submit_round_proposals', {
      state_ref: stateRef,
      request_id: manifest.requestId,
      phase: manifest.phase,
      idempotency_key: `serialized-${this.choice}-${manifest.phase}`,
      proposals,
    });
    if (submitted['status'] !== 'proposed' || runtime.proposals.length !== 1) {
      throw new Error(`Serialized round was not proposed: ${JSON.stringify(submitted)}`);
    }
    const proposal = runtime.proposals[0];
    if (proposal?.kind !== 'round_turn_proposal') throw new Error('Serialized handler omitted the round proposal.');
    this.decodedOptions.push(...proposal.resolutions.map((resolution) => ({
      option_id: resolution.option.optionId,
      label: resolution.option.label,
      action_slots: resolution.option.actionSlots,
    })));
    const dispatchedProposal = this.choice === 'invalid_then_dodge' && manifest.phase === 'initial'
      ? {
          ...proposal,
          resolutions: proposal.resolutions.map((resolution) => ({
            ...resolution,
            resolutionDigest: '0'.repeat(64),
          })),
        }
      : proposal;
    writeFileSync(manifest.proposalSpoolPath, `${JSON.stringify(dispatchedProposal)}\n`, 'utf8');
    return this.completed(sessionId);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }

  private completed(sessionId: AgentTurnResult['resumeSessionId']): AgentTurnResult {
    return {
      resumeSessionId: sessionId,
      sessionId,
      finalText: 'SERIALIZED-TEST',
      usage: this.usageInputs.length === 0 ? null : {
        turnInputTotal: turnInputTotal(this.usageInputs[0]!),
        contextInputTokens: contextTokenCount(this.usageInputs.shift()!),
        modelContextWindow: null,
        cachedInputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
      },
      exit: 'completed',
    };
  }
}

function pendingArenaReactionState(): EncounterState {
  const mover = playerProfile('arena-reaction-mover', { hitPoints: 100, initiativeBonus: 20 });
  const reactor = monsterProfile('arena-reaction-reactor', { hitPoints: 100, initiativeBonus: -20 });
  const started = reduceEncounter(createEncounter({
    bounds: { columns: 5, rows: 2 },
    combatants: [mover, reactor],
    tokens: [placedToken(mover, 1), placedToken(reactor, 0)],
    reactionPolicies: [{
      combatant: reactor.id,
      reactionKind: 'opportunity_attack',
      policy: 'ask',
    }],
  }), { type: 'roll_initiative' }, () => 0.5).state;
  return reduceEncounter(started, {
    type: 'move',
    actor: mover.id,
    path: [{ column: 2, row: 0 }],
    cause: 'voluntary',
  }, () => 0.5).state;
}

function oversizedTurnContextState(): EncounterState {
  const player = playerProfile('context-trim-player', { initiativeBonus: 20 });
  const monsters = Array.from({ length: 45 }, (_value, index) =>
    monsterProfile(`context-trim-monster-${String(index + 1)}`, { initiativeBonus: -20 }));
  return reduceEncounter(createEncounter({
    bounds: { columns: 50, rows: 2 },
    combatants: [player, ...monsters],
    tokens: [
      placedToken(player, 49),
      ...monsters.map((monster, index) => placedToken(monster, index)),
    ],
  }), { type: 'roll_initiative' }, () => 0.5).state;
}

function preparedMonsterRoundRevision(initialState: EncounterState): {
  readonly revision: number;
  readonly resolvedDeathSaves: number;
} {
  const rng = mulberry32(8_274_113);
  let resolvedDeathSaves = 0;
  const reduce = (state: EncounterState, command: EncounterCommand): EncounterState => {
    let current = reduceSessionEncounter(state, command, rng).state;
    for (;;) {
      const decision = current.pendingDecisions.find((candidate) => candidate.kind === 'death_save');
      if (decision === undefined) return current;
      resolvedDeathSaves += 1;
      current = reduceSessionEncounter(current, {
        type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'roll',
      }, rng).state;
    }
  };
  let state = initialState;
  if (state.initiative.length === 0) state = reduce(state, { type: 'roll_initiative' });
  const firstMonster = state.combatants
    .filter((combatant) => combatant.profile.kind === 'monster' && combatant.life !== 'dead')
    .map((combatant) => combatant.profile.id)
    .sort((left, right) => left.localeCompare(right))[0];
  if (firstMonster === undefined) throw new Error('Generated room has no living monster.');
  for (let index = 0; state.activeCombatant !== firstMonster && index < state.combatants.length * 3; index += 1) {
    const active = state.activeCombatant;
    if (active === null) throw new Error('Generated room initiative has no active combatant.');
    state = reduce(state, { type: 'end_turn', actor: active });
  }
  if (state.activeCombatant !== firstMonster) throw new Error('Could not prepare generated monster round.');
  return { revision: state.revision, resolvedDeathSaves };
}

const LEGACY_BLOCK_ARGS = [
  '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
] as const;

describe('AI-DM engine MCP conversation runner', () => {
  it('authorizes a serialized revision-bound Dodge proposal', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-dodge-'));
    const adapter = new SerializedRoundTripAdapter('use_action_dodge');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });
    const rejectionReasons = result.rows[0]?.chainEvidence.failedAttempts
      .flatMap((attempt) => attempt.rejectionReasons) ?? [];

    expect(adapter.submittedOptions).toContainEqual(expect.objectContaining({ label: 'Dodge' }));
    expect(adapter.decodedOptions).toContainEqual(expect.objectContaining({
      action_slots: [{ slot: 'main', use: { kind: 'dodge' } }],
    }));
    expect(rejectionReasons).not.toContain('The engine could not authorize this proposal mechanic.');
    expect(result.rows[0]).toEqual(expect.objectContaining({ outcome: 'authorized', refusals: [] }));
    expect(result.rows[0]).toEqual(expect.objectContaining({
      plannedBy: { model: 'gpt-5.6-sol', effort: 'medium' },
      escalated: false,
      escalationModel: null,
    }));
    expect(result.rows[0]?.stateBinding.authorization).toEqual(result.rows[0]?.stateBinding.capsule);
  });

  it('authorizes targeted Web and non-targeted Dodge through composite options', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-web-'));
    const adapter = new SerializedRoundTripAdapter('targeted_web');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.submittedOptions.some((option) => String(option['label']).includes('Web'))).toBe(true);
    expect(adapter.submittedOptions).toContainEqual(expect.objectContaining({ label: 'Dodge' }));
    expect(adapter.decodedOptions.some((option) => JSON.stringify(option['action_slots']).includes('web'))).toBe(true);
    expect(result.rows[0]).toEqual(expect.objectContaining({ outcome: 'authorized', refusals: [] }));
    expect(result.rows[0]?.chainEvidence.failedAttempts.flatMap((attempt) => attempt.rejectionReasons))
      .not.toContain('Utility action web cannot authorize a target.');
  });

  it('round-trips the End Turn option emitted by the tactical context', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-end-turn-'));
    const adapter = new SerializedRoundTripAdapter('option_shaped_end_turn');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.submittedOptions).toContainEqual(expect.objectContaining({ label: 'End Turn' }));
    expect(adapter.decodedOptions).toContainEqual(expect.objectContaining({
      action_slots: [{ slot: 'main', use: { kind: 'end_turn' } }],
    }));
    expect(result.rows[0]).toEqual(expect.objectContaining({ outcome: 'authorized', refusals: [] }));
  });

  function primaryCodexArgvBytes(dispatched: AgentInvocation): string {
    return JSON.stringify(codexArgv({
      cwd: '/SIMULATED/workspace',
      model: dispatched.model,
      reasoningEffort: dispatched.reasoningEffort,
      engineCommand: '/SIMULATED/node',
      engineArgs: ['/SIMULATED/engine-mcp.mjs', '/SIMULATED/primary-launcher.json'],
      instructions: null,
      sessionId: 'SIMULATED-base-session',
    }));
  }

  it('keeps tiered primary argv/config byte-identical and isolates escalation from the base session', { timeout: 60_000 }, async () => {
    const untieredDirectory = mkdtempSync(join(tmpdir(), 'dnd-conversation-primary-untiered-'));
    const tieredDirectory = mkdtempSync(join(tmpdir(), 'dnd-conversation-primary-tiered-'));
    const untieredAdapter = new SerializedRoundTripAdapter('invalid_then_dodge');
    const tieredAdapter = new SerializedRoundTripAdapter('invalid_then_dodge');
    const commonArgs = [
      '--rooms', '1', '--rounds', '1', '--model', 'gpt-base', '--effort', 'low',
      ...LEGACY_BLOCK_ARGS,
    ] as const;

    await runConversation(parseConversationArgs([
      ...commonArgs, '--out', join(untieredDirectory, 'rows.jsonl'),
    ]), { adapter: untieredAdapter, roomStates: [generateRoom(3_943_006).encounter.state] });
    await runConversation(parseConversationArgs([
      ...commonArgs, '--out', join(tieredDirectory, 'rows.jsonl'),
      '--escalation-model', 'gpt-escalation', '--escalation-effort', 'high',
    ]), { adapter: tieredAdapter, roomStates: [generateRoom(3_943_006).encounter.state] });

    const untieredPrimary = untieredAdapter.startInvocations[0];
    const tieredPrimary = tieredAdapter.startInvocations[0];
    if (untieredPrimary === undefined || tieredPrimary === undefined) {
      throw new Error('SIMULATED primary dispatch was not recorded.');
    }
    expect(primaryCodexArgvBytes(tieredPrimary)).toBe(primaryCodexArgvBytes(untieredPrimary));
    expect(tieredAdapter.startInvocations).toHaveLength(2);
    expect(tieredAdapter.startInvocations[1]?.instructions).toContain('OFFENSIVE corrected round');
    expect(tieredAdapter.startInvocations[1]?.instructions)
      .toContain('every actor with a legal attack must attack');
    expect(tieredAdapter.startInvocations[1]?.instructions)
      .toContain('Dash-to-close counts as offense for out-of-reach melee');
    expect(tieredAdapter.startInvocations[1]?.instructions)
      .toContain('Dodge is allowed only when that actor has no resolvable action');
    const escalation = tieredAdapter.startInvocations[1];
    if (escalation?.instructions === undefined || escalation.instructions === null) {
      throw new Error('Configured escalation omitted its typed startup instructions.');
    }
    expect(escalation.bootstrap).toMatchObject({
      kind: 'escalation', knowledgeBaseBundleHash: DEFAULT_KB_HASH,
      stateDelivery: 'full_engine_context',
    });
    const startupOrder = [
      escalation.instructions.indexOf('## Role'),
      escalation.instructions.indexOf('When a melee creature cannot reach an enemy'),
      escalation.instructions.indexOf('[SESSION_DIGEST]'),
      escalation.instructions.indexOf('[FULL_ENGINE_CONTEXT]'),
      escalation.instructions.indexOf('OFFENSIVE corrected round'),
    ];
    expect(startupOrder.every((position) => position >= 0)).toBe(true);
    expect(startupOrder).toEqual([...startupOrder].sort((left, right) => left - right));
    expect(tieredAdapter.resumeInvocations).toHaveLength(0);
    expect(untieredAdapter.startInvocations).toHaveLength(1);
    expect(untieredAdapter.resumeInvocations).toHaveLength(1);
  });

  it('constructs no escalation adapter or bootstrap for the exact post-shift no-flag control shape (mutation: implicit escalation default)', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-no-escalation-'));
    const adapter = new SerializedRoundTripAdapter('invalid_then_dodge');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--model', 'gpt-5.6-luna', '--effort', 'low',
      ...LEGACY_BLOCK_ARGS,
    ]);
    expect({ escalationModel: config.escalationModel, escalationEffort: config.escalationEffort })
      .toEqual({ escalationModel: null, escalationEffort: null });

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.startInvocations[0]?.bootstrap).toEqual({ kind: 'cold_start' });
    expect(adapter.resumeInvocations).toHaveLength(1);
    expect(adapter.resumeInvocations[0]?.bootstrap).toBeUndefined();
    expect(result.rows[0]).toEqual(expect.objectContaining({
      escalated: false,
      escalationModel: null,
      escalationSessionId: null,
    }));
  });

  it('keeps one sitting across rooms, rolls only at threshold, and explicit end prevents resume', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-sitting-rollover-'));
    const adapter = new SerializedRoundTripAdapter('use_action_dodge', [1_000, 73]);
    const config = parseConversationArgs([
      '--rooms', '2', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);
    const policy = {
      kind: 'measured',
      threshold: measuredContextRolloverThreshold(1_000),
      evidence: 'SIMULATED conversation boundary',
    } as const;
    const result = await runConversation(config, {
      adapter,
      contextRolloverPolicy: policy,
      endSession: true,
    });

    expect(adapter.startInvocations).toHaveLength(2);
    expect(adapter.resumeInvocations).toHaveLength(0);
    expect(adapter.startInvocations[1]?.bootstrap).toMatchObject({ kind: 'context_rollover' });
    expect(result.rows.map((row) => ({
      room: row.room,
      generation: row.agentSessionGeneration,
      rolled: row.contextRolloverOccurred,
    }))).toEqual([
      { room: 1, generation: 0, rolled: false },
      { room: 2, generation: 1, rolled: true },
    ]);
    expect(result.binding?.sessionId).not.toBe(agentSessionIdFromCli(
      'codex:serialized:encounter:ai-dm-conversation:session-1',
    ));

    const store = new MemoryBrowserSessionStore();
    const runId = importSavedSession(store, result.journalExport);
    const journal = EncounterSessionJournal.resume(runId, store, new MemoryMirrorSink()).journal;
    expect(journal.ended()).toBe(true);
    const lifecycle = new AgentSessionLifecycle(journal, adapter, 1, policy);
    await expect(lifecycle.resumeRound({
      runId,
      prompt: 'must not dispatch after explicit end',
      model: config.model,
      reasoningEffort: config.effort,
      sessionProfile: 'test',
      callPhase: 'initial',
      launcherToken: 'SIMULATED-unused',
      timeoutMs: 1,
    }, new AbortController().signal)).rejects.toThrow('Explicitly ended sitting');
    expect(adapter.startInvocations).toHaveLength(2);
  });

  it.each([
    {
      name: 'tiered',
      escalationArgs: ['--escalation-model', 'gpt-escalation', '--escalation-effort', 'high'],
      expectedPlanner: { model: 'gpt-escalation', effort: 'high' },
      expectedEscalated: true,
      expectedEscalationModel: 'gpt-escalation',
    },
    {
      name: 'untiered',
      escalationArgs: [],
      expectedPlanner: { model: 'gpt-base', effort: 'low' },
      expectedEscalated: false,
      expectedEscalationModel: null,
    },
  ] as const)(
    'routes a $name correction using actual dispatch bookkeeping',
    { timeout: 60_000 },
    async ({ escalationArgs, expectedPlanner, expectedEscalated, expectedEscalationModel }) => {
      const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-tiered-correction-'));
      const adapter = new SerializedRoundTripAdapter('invalid_then_dodge');
      const config = parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
        '--model', 'gpt-base', '--effort', 'low',
        ...LEGACY_BLOCK_ARGS,
        ...escalationArgs,
      ]);

      const result = await runConversation(config, {
        adapter,
        roomStates: [generateRoom(3_943_006).encounter.state],
      });

      expect(adapter.startInvocations[0]).toEqual(expect.objectContaining({
        model: 'gpt-base', reasoningEffort: 'low',
      }));
      const correctionInvocation = expectedEscalated
        ? adapter.startInvocations[1]
        : adapter.resumeInvocations[0];
      expect(correctionInvocation).toEqual(expect.objectContaining({
        model: expectedPlanner.model, reasoningEffort: expectedPlanner.effort,
      }));
      expect(adapter.startInvocations).toHaveLength(expectedEscalated ? 2 : 1);
      expect(adapter.resumeInvocations).toHaveLength(expectedEscalated ? 0 : 1);
      expect(result.rows[0]).toEqual(expect.objectContaining({
        outcome: 'authorized',
        sessionId: 'codex:serialized:encounter:ai-dm-conversation:session-1',
        escalationSessionId: expectedEscalated
          ? 'codex:serialized:encounter:ai-dm-conversation:session-2'
          : null,
        plannedBy: expectedPlanner,
        escalated: expectedEscalated,
        escalationModel: expectedEscalationModel,
      }));
    },
  );

  it('authorizes a serialized MCP attack proposal', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-attack-'));
    const adapter = new SerializedRoundTripAdapter('attack');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.submittedOptions.some((option) => !['Dodge', 'End Turn'].includes(String(option['label'])))).toBe(true);
    expect(adapter.decodedOptions.some((option) => JSON.stringify(option['action_slots']).includes('attack'))).toBe(true);
    const context = adapter.turnContexts[0];
    if (context === undefined) throw new Error('Serialized public flow omitted its turn context.');
    const frontier = objectValue(context['team_plan_frontier'], 'serialized team plan frontier');
    const frontierCandidates = frontier['candidates'];
    const advertisedPlays = context['applicable_plays'];
    if (!Array.isArray(frontierCandidates) || !Array.isArray(advertisedPlays)) {
      throw new Error('Serialized public flow omitted team frontier candidates or advertised plays.');
    }
    expect(frontier).toMatchObject({
      policy: 'team-scorer-v1',
      frontier_resolution: 'contains_unresolved',
    });
    expect(advertisedPlays.map((entry) => objectValue(entry, 'advertised play')['name']))
      .toEqual(frontierCandidates.map((entry) =>
        objectValue(entry, 'team frontier candidate')['candidate_id']));
    expect(result.rows[0]).toEqual(expect.objectContaining({ outcome: 'authorized', refusals: [] }));
    expect(result.rows[0]?.stateBinding.authorization).toEqual(result.rows[0]?.stateBinding.capsule);
  });

  it('requests full context for round one and a delta for a resumed later round', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-round-delta-'));
    const adapter = new SerializedRoundTripAdapter('use_action_dodge');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '2', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_001).encounter.state],
    });
    const initialInvocations = [...adapter.startInvocations, ...adapter.resumeInvocations].filter((entry) =>
      entry.launcherToken.includes('-initial-launcher.json'));
    const secondManifest = initialInvocations[1] === undefined
      ? null
      : JSON.parse(readFileSync(initialInvocations[1].launcherToken, 'utf8')) as EngineMcpLauncherManifest;

    expect(result.rows).toHaveLength(2);
    expect(initialInvocations[0]?.prompt).toContain('granularity "full"');
    expect(initialInvocations[1]?.prompt).toContain('granularity "turn_delta"');
    expect(secondManifest?.turnContextDeltaBase).toEqual(expect.objectContaining({
      revision: result.rows[0]?.contextRevision,
    }));
  });

  it('preserves accepted suggested composite proposals in the authorized SIMULATED row', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-accepted-fallback-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [generateRoom(3_943_002).encounter.state],
      suggestionResponseByRequest: { 'room-1-round-1': 'as_is' },
    });
    const row = result.rows[0];
    expect(row).toEqual(expect.objectContaining({
      outcome: 'authorized', suggestionAdopted: 'as_is', refusals: [],
    }));
    expect(row?.authorizedPlan).toEqual(expect.arrayContaining([
      expect.objectContaining({
        acceptedProposal: expect.objectContaining({
          actor_id: expect.any(String), primary_option_id: expect.any(String), expected_revision: expect.any(Number),
        }),
      }),
    ]));
    expect(JSON.parse(readFileSync(outPath, 'utf8').trim())).toEqual(expect.objectContaining({
      authorizedPlan: expect.arrayContaining([
        expect.objectContaining({
          acceptedProposal: expect.objectContaining({
            primary_option_id: expect.any(String), fallback_option_id: expect.anything(),
          }),
        }),
      ]),
    }));
  });

  it('identifies the divergent mechanic when room 3943006 cannot be re-resolved', () => {
    const state = freshMonsterPlanningState(generateRoom(3_943_006).encounter.state);
    const actor = state.combatants.find((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead');
    if (actor === undefined) throw new Error('Generated room 3943006 has no living monster.');
    const option = availableEngineActorOptions(state, actor.profile.id)
      .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
    if (option === undefined) throw new Error('Room 3943006 Dodge option is absent.');
    const proposal = {
      actorId: actor.profile.id, expectedRevision: state.revision, primaryOptionId: option.optionId,
      fallbackOptionId: null, overrideJustification: null,
    };
    const proposalTime = pureTurnProposalResolver.resolve(state, proposal);
    if (!proposalTime.valid) throw new Error('Room 3943006 Dodge proposal did not resolve.');

    expect(proposalResolutionDivergence(state, {
      proposal,
      option: proposalTime.option,
      primaryOption: proposalTime.primaryOption,
      fallbackOption: proposalTime.fallbackOption,
      mechanics: proposalTime.mechanics,
      selectedBranch: proposalTime.selectedBranch,
      resolutionDigest: '0'.repeat(64),
      summary: proposalTime.summary,
    })).toEqual([
      `${actor.profile.id}: path or final-position geometry diverged while action sequence, targets, and movement cost remained ${proposalTime.summary}.`,
    ]);
  });

  it.each([3_943_004, 3_943_007])(
    'authorizes generated room %i through the real host after resolving boundary decisions',
    { timeout: 60_000 },
    async (seed) => {
      const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-generated-${String(seed)}-`));
      const generatedState = generateRoom(seed).encounter.state;
      const prepared = preparedMonsterRoundRevision(generatedState);
      const config = parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
        '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
        ...LEGACY_BLOCK_ARGS,
      ]);

      const result = await runConversation(config, { roomStates: [generatedState] });
      const row = result.rows[0];

      expect(prepared.resolvedDeathSaves).toBeGreaterThan(0);
      expect(row).toEqual(expect.objectContaining({
        outcome: 'authorized', agentDispatched: true, serviceNull: false,
      }));
      expect(row?.toolCalls).toBeGreaterThan(0);
      expect(row?.contextRevision).toBe(1 + prepared.revision - generatedState.revision);
      expect(row?.stateBinding.authorization).toEqual(row?.stateBinding.capsule);
      expect(row?.chainEvidence.failedAttempts.flatMap((attempt) =>
        attempt.rejectionReasons,
      ).some((reason) => reason.includes('Reaction offer'))).toBe(false);
      expect(row?.chainEvidence.failedAttempts.every((attempt) =>
        attempt.declaredProposal === null || typeof attempt.declaredProposal['option_id'] === 'string'))
        .toBe(true);
    },
  );

  it.each([
    ['decline', 'decline'],
    ['take', 'accept'],
  ] as const)(
    'auto-resolves an unattended ask Reaction with the %s policy and authorizes the SIMULATED arena round',
    { timeout: 60_000 },
    async (askDefault, resolution) => {
      const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-reaction-${askDefault}-`));
      const store = new MemoryBrowserSessionStore();
      const config = parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
        '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
        '--reaction-ask-default', askDefault,
        ...LEGACY_BLOCK_ARGS,
      ]);

      const result = await runConversation(config, {
        roomStates: [pendingArenaReactionState()],
        store,
      });

      expect(result.rows).toEqual([
        expect.objectContaining({ outcome: 'authorized', refusals: [], agentDispatched: true }),
      ]);
      expect(store.revisions(encounterSessionId('encounter:ai-dm-conversation'))
        .map((revision) => revision.transition))
        .toContainEqual(expect.objectContaining({
          kind: 'unattended_reaction_auto_resolved',
          configuredPolicy: 'ask',
          askDefault,
          resolution,
        }));
      const restored = new MemoryBrowserSessionStore();
      importSavedSession(restored, result.journalExport);
      expect(restored.revisions(encounterSessionId('encounter:ai-dm-conversation'))
        .map((revision) => revision.transition.kind))
        .toContain('unattended_reaction_auto_resolved');
    },
  );

  it('restores sticky side-wide guidance across a room transition and resolves a pending offer before dispatch', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-sticky-reaction-'));
    const store = new MemoryBrowserSessionStore();
    const config = parseConversationArgs([
      '--rooms', '2', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      '--reaction-ask-default', 'decline',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [pendingArenaReactionState(), pendingArenaReactionState()],
      store,
      restoreAfterRound: 1,
      reactionGuidanceByRequest: {
        'room-1-round-1': { sideWide: { opportunity_attack: 'take' }, actors: [] },
      },
    });

    expect(result.restoredMidRun).toBe(true);
    expect(result.rows.map((row) => row.outcome)).toEqual(['authorized', 'authorized']);
    expect(result.rows.every((row) => row.agentDispatched)).toBe(true);
    const restoredStore = new MemoryBrowserSessionStore();
    importSavedSession(restoredStore, result.journalExport);
    const transitions = restoredStore.revisions(encounterSessionId('encounter:ai-dm-conversation'))
      .map((revision) => revision.transition);
    expect(transitions).toContainEqual(expect.objectContaining({
      kind: 'reaction_guidance_replaced',
      guidance: { sideWide: { opportunity_attack: 'take' }, actors: [] },
    }));
    expect(transitions).toContainEqual(expect.objectContaining({
      kind: 'reaction_guidance_auto_resolved',
      reactionKind: 'opportunity_attack', instruction: 'take',
      scope: { kind: 'side_wide' }, resolution: 'accept',
    }));
  });

  it('falls back to unattended toggle policy when sticky guidance does not cover the pending trigger', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-uncovered-reaction-'));
    const store = new MemoryBrowserSessionStore();
    const config = parseConversationArgs([
      '--rooms', '2', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      '--reaction-ask-default', 'decline',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [pendingArenaReactionState(), pendingArenaReactionState()],
      store,
      reactionGuidanceByRequest: {
        'room-1-round-1': { sideWide: { hit_by_attack: 'take' }, actors: [] },
      },
    });

    expect(result.rows[1]).toEqual(expect.objectContaining({ outcome: 'authorized', agentDispatched: true }));
    expect(store.revisions(encounterSessionId('encounter:ai-dm-conversation'))
      .map((revision) => revision.transition))
      .toContainEqual(expect.objectContaining({
        kind: 'unattended_reaction_auto_resolved', reactionKind: 'opportunity_attack',
        configuredPolicy: 'ask', askDefault: 'decline', resolution: 'decline',
      }));
  });

  it('keeps one SIMULATED session across two rooms, one correction, and a browser restore', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--fixtures', 'tests/fixtures/arena-basis',
      '--rooms', '2',
      '--rounds', '2',
      '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary',
      '--capture-rl-data',
      '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      exhaustInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
      restoreAfterRound: 1,
    });
    const firstRoom = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const capturedActorKnowledge = firstRoom.combatants
      .filter((combatant) => combatant.profile.kind === 'monster')
      .map((combatant) => projectActorKnowledge(firstRoom, combatant.profile.id));

    expect(result.rows).toHaveLength(4);
    expect(result.rows.map((row) => row.outcome)).toEqual([
      'authorized', 'authorized', 'authorized', 'authorized',
    ]);
    expect(result.rows.every((row) => row.refusals.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.sessionId === null && row.escalationSessionId === null)).toBe(true);
    expect(new Set(result.rows.map((row) => row.sessionIdHash)).size).toBe(1);
    expect(result.rows[0]?.toolCalls).toBe(2);
    expect(result.rows[0]?.agentDispatched).toBe(true);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      plannedBy: null, plannerLabel: 'engine_default', autoSubmitBlocks: [],
      escalated: false, escalationModel: null,
    }));
    expect(result.rows[0]?.chainEvidence).toEqual({
      failedAttempts: expect.arrayContaining([
        expect.objectContaining({ attempt: 'primary' }),
        expect.objectContaining({ attempt: 'fallback' }),
        expect.objectContaining({ attempt: 'correction' }),
      ]),
      autoResolvedTrigger: expect.stringContaining('engine auto-submitted'),
      correctionFinalText: 'SIMULATED — proposal delivered through engine MCP spool',
    });
    expect(result.rows[0]?.proposalId).toContain('engine-default:');
    expect(result.rows[0]?.rlData).toEqual(expect.objectContaining({
      plannerLabel: 'engine_default',
      autoSubmitBlocks: [],
      intelPolicyVersions: {
        movement: 'movement-options-v1',
        opportunityCost: 'opportunity-cost-v1',
        teamScorer: 'team-scorer-v1',
        correction: 'dominance-correction-v1',
        materialityContext: 'materiality-context-v1',
        actorKnowledge: 'actor-knowledge-v2',
        reactionSpendHold: 'reaction-spend-hold-v1',
        legendaryWindows: 'legendary-windows-v1',
        recoveryCapability: 'recovery-capability-v1',
      },
    }));
    // Fixture bands, hand-computed:
    // cleric hp 52 of max 52 = 100% -> band uninjured; effective AC 18 + 1 = 19 -> heavily_defended.
    // fighter hp 51 of max 67 = 76.1% -> band bloodied; AC 18 -> heavily_defended.
    // wizard hp 38 of max 38 = 100% -> band uninjured; AC 15 -> guarded.
    const projectedTargets = [
      {
        kind: 'perceived',
        targetId: 'combatant:cleric',
        position: { column: 2, row: 4 },
        conditions: [],
        armorClass: { kind: 'perceived_band', band: 'heavily_defended' },
        hitPoints: { kind: 'perceived_band', band: 'uninjured' },
        reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
        reaction: { kind: 'unknown' },
      },
      {
        kind: 'perceived',
        targetId: 'combatant:fighter',
        position: { column: 1, row: 2 },
        conditions: [],
        armorClass: { kind: 'perceived_band', band: 'heavily_defended' },
        hitPoints: { kind: 'perceived_band', band: 'bloodied' },
        reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
        reaction: { kind: 'unknown' },
      },
      {
        kind: 'perceived',
        targetId: 'combatant:wizard',
        position: { column: 1, row: 6 },
        conditions: [],
        armorClass: { kind: 'perceived_band', band: 'guarded' },
        hitPoints: { kind: 'perceived_band', band: 'uninjured' },
        reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
        reaction: { kind: 'unknown' },
      },
    ];
    expect(capturedActorKnowledge).toEqual([
      {
        policy: 'actor-knowledge-v2',
        actorId: 'combatant:generated-3943001-monster-1',
        targets: projectedTargets,
      },
      {
        policy: 'actor-knowledge-v2',
        actorId: 'combatant:generated-3943001-monster-2',
        targets: projectedTargets,
      },
      {
        policy: 'actor-knowledge-v2',
        actorId: 'combatant:generated-3943001-monster-3',
        targets: projectedTargets,
      },
    ]);
    expect(result.rows[0]?.authorizedPlan?.some((entry) =>
      entry.resolutionSummary.actionSlots.some((slot) => slot.kind === 'dodge'))).toBe(false);
    expect(result.rows[1]?.proposalId).toContain('round:');
    expect(result.rows[0]?.projectionRevision).toBeGreaterThan(result.rows[0]?.contextRevision ?? 0);
    expect(result.rows[1]?.contextRevision).toBe(result.rows[0]?.projectionRevision);
    expect(result.rows[2]?.contextRevision).toBeGreaterThan(result.rows[1]?.projectionRevision ?? 0);
    expect(result.binding?.sessionId).toBe('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(result.binding).not.toBeNull();
    if (result.binding === null) throw new Error('SIMULATED run lost its agent binding.');
    expect(result.binding.lastDispatchedRevision).toBeGreaterThan(result.binding.startedAtRevision);
    expect(result.restoredMidRun).toBe(true);
    expect(result.journalExport).toContain('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
  });

  it('uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unresolved-frontier-'));
    const state = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--capture-rl-data', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [state],
      exhaustInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    });

    const row = result.rows[0];
    expect(row).toEqual(expect.objectContaining({
      outcome: 'authorized',
      plannedBy: null,
      plannerLabel: 'sim_controller',
      proposalId: expect.stringContaining('sim-controller:'),
      autoSubmitBlocks: expect.arrayContaining([
        {
          actorId: 'combatant:generated-5117009-monster-1',
          reason: 'auto_submit_blocked_unresolved_frontier',
        },
      ]),
      chainEvidence: expect.objectContaining({
        autoResolvedTrigger: expect.stringContaining('unresolved frontier competition blocked engine auto-submit'),
      }),
    }));
    expect(row?.rlData).toEqual(expect.objectContaining({
      plannerLabel: 'sim_controller',
      autoSubmitBlocks: expect.arrayContaining([
        {
          actorId: 'combatant:generated-5117009-monster-1',
          reason: 'auto_submit_blocked_unresolved_frontier',
        },
      ]),
    }));
    const priestPlan = row?.authorizedPlan?.find((entry) =>
      entry.actorId === 'combatant:generated-5117009-monster-1');
    expect(priestPlan?.resolutionSummary.actionSlots).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'dodge' }),
    ]));
    expect(row?.projectionRevision).toBeGreaterThan(row?.contextRevision ?? 0);
  });

  it.each([
    {
      name: 'no proposal',
      expected: 'no_proposal',
      options: {
        exhaustInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      },
      hard: false,
    },
    {
      name: 'validation exhaustion',
      expected: 'validation_exhausted',
      options: {
        invalidInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      },
      hard: false,
    },
    {
      name: 'blocked auto-submit',
      expected: 'auto_submit_blocked',
      options: {
        exhaustInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      },
      hard: true,
    },
    {
      name: 'timeout',
      expected: 'timeout',
      options: {
        timeoutInitial: ['room-1-round-2'],
        failCorrection: ['room-1-round-2'],
      },
      hard: false,
    },
  ] as const)('records typed fallbackReason for $name from the stub adapter', { timeout: 60_000 }, async ({
    expected,
    options,
    hard,
  }) => {
    const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-fallback-${expected}-`));
    const rounds = expected === 'timeout' ? 2 : 1;
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', String(rounds), '--out', join(directory, 'rows.jsonl'),
      '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);
    const state = hard
      ? await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json')
      : await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');

    const result = await runConversation(config, { roomStates: [state], ...options });

    expect(result.rows.at(-1)?.fallbackReason).toBe(expected);
    expect(result.rows.at(-1)?.refusals).toEqual([]);
  });

  it('does not depend on turn-context rendering to resolve a brutal exhaustion frontier', async () => {
    const state = freshMonsterPlanningState(
      await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json'),
    );
    const actorIds = state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'monster' ? [combatant.profile.id] : []);
    const resolutions = () => actorIds.map((actorId) =>
      actorOpportunityReport(state, actorId, canonicalEngineQueryPort, state.revision).frontierResolution);
    const beforeRender = resolutions();
    const firstActorId = actorIds[0];
    if (firstActorId === undefined) throw new Error('Brutal fixture has no first monster actor.');
    const firstActorOptions = engineActorOptions(state, firstActorId);
    expect(firstActorOptions.humanOnly).toContainEqual(expect.objectContaining({
      label: 'spellcasting/detect-evil-and-good',
      declaredOption: {
        kind: 'spell',
        sourceActionId: 'spellcasting',
        spellId: 'detect-evil-and-good',
        slot: 'main',
      },
      noModeledEffect: {
        kind: 'unsupported_spell_payload',
        sourceActionId: 'spellcasting',
        spellId: 'detect-evil-and-good',
        limitation: 'utility_operation_unmodeled',
      },
    }));
    expect(firstActorOptions.offerable.some((option) => option.label === 'spellcasting/detect-evil-and-good'))
      .toBe(false);
    const runtime = createEngineMcpRuntime(state, { toolProfile: 'dm', requestedActorIds: actorIds });
    const capsule = runtime.feed.current();
    runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
      granularity: 'full',
      intel_mode: 'full',
    });

    expect(beforeRender).toEqual([
      'fully_resolved',
      'fully_resolved',
      'fully_resolved',
      'contains_unresolved',
    ]);
    expect(resolutions()).toEqual(beforeRender);
  });

  it('hidden_options_logged_once: records every hidden option once with engine-state knowledge and stationary Disengage reasons', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-hidden-options-'));
    const outPath = join(directory, 'rows.jsonl');
    const hiddenActor = monsterProfile('hidden-options-actor', { initiativeBonus: 20 });
    const hiddenTarget = playerProfile('hidden-options-target', { initiativeBonus: -20 });
    const state = createEncounter({
      bounds: { columns: 3, rows: 1 },
      combatants: [hiddenActor, hiddenTarget],
      tokens: [placedToken(hiddenActor, 0), placedToken(hiddenTarget, 2)],
    });
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]), {
      adapter: new SerializedRoundTripAdapter('use_action_dodge'),
      roomStates: [state],
      partyPolicyOverride: 'heuristic_v0',
    });
    const row = result.rows[0];
    if (row === undefined) throw new Error('Hidden-option conversation produced no row.');
    const identities = row.hiddenOptions.map((option) => option.humanOptionId);

    expect(row.knowledgeModel).toBe('engine_state');
    expect(new Set(identities).size).toBe(identities.length);
    expect(row.hiddenOptions.filter((option) =>
      option.declaredOption.kind === 'standard_action' &&
      option.reason.kind === 'disengage_without_movement').length).toBeGreaterThan(0);
    expect(row.hiddenOptions.every((option) => option.actorId.length > 0 &&
      option.humanOptionId.startsWith('human-option:'))).toBe(true);
    expect(JSON.parse(readFileSync(outPath, 'utf8').trim())).toMatchObject({
      knowledgeModel: 'engine_state',
      hiddenOptions: row.hiddenOptions,
    });
  });

  it('runs a model-free stdio MCP dry-run smoke (mutation: count tool calls as KB reads)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-smoke-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config);

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', toolCalls: 2, kbReads: [], callsPerRound: 1,
        refusals: [], kbHash: DEFAULT_KB_HASH,
        contextRolloverOccurred: false,
        contextRolloverTriggerCount: 0,
        escalated: false,
        escalationSessionId: null,
      }),
    ]);
    expect(result.rows[0]?.tokens).toEqual({ input: 0, cachedInput: 0, output: 0, reasoning: 0 });
    const store = new MemoryBrowserSessionStore();
    const sessionId = importSavedSession(store, result.journalExport);
    expect(exportSavedSession(store, sessionId)).toBe(result.journalExport);
  });

  it('runs a three-room three-round model-free brutal smoke with the stub adapter', { timeout: 120_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-3round-smoke-'));
    const config = parseConversationArgs([
      '--fixtures', 'tests/fixtures/arena-basis-brutal',
      '--rooms', '3', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'derived_v1',
      '--dry-run',
    ]);

    const result = await runConversation(config);

    expect(new Set(result.rows.map((row) => row.room))).toEqual(new Set([1, 2, 3]));
    expect(result.rows).toHaveLength(9);
    expect(result.rows.flatMap((row) => row.refusals)).toEqual([]);
    expect(result.rows.every((row) => row.knowledgeModel === 'engine_state')).toBe(true);
  });

  it('retries one SIMULATED service flap and uses the first healthy primary turn', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-flap-recovery-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      flapPrimaryByRequest: { 'room-1-round-1': 1 },
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', flapRetries: 1, serviceNull: false,
        toolCalls: 2, refusals: [],
      }),
    ]);
  });

  it('marks three consecutive SIMULATED service flaps as service_null without exhausting the turn', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-service-null-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      flapPrimaryByRequest: { 'room-1-round-1': 3 },
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'service_null', flapRetries: 2, serviceNull: true,
        toolCalls: 0, proposalId: null, refusals: [],
        plannedBy: null, escalated: false, escalationModel: null,
        authorizedPlan: null, roundNarrative: null,
        chainEvidence: { failedAttempts: [], autoResolvedTrigger: null, correctionFinalText: null },
      }),
    ]);
    expect(result.rows[0]?.projectionRevision).toBe(result.rows[0]?.contextRevision);
  });

  it('does not retry a SIMULATED primary turn that called engine tools before rejection', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-engine-rejection-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      invalidInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', plannerLabel: 'engine_default', flapRetries: 0, serviceNull: false,
        toolCalls: 3,
        chainEvidence: expect.objectContaining({
          failedAttempts: expect.arrayContaining([
            expect.objectContaining({ attempt: 'primary' }),
            expect.objectContaining({ attempt: 'fallback' }),
          ]),
        }),
      }),
    ]);
  });

  it('records when the turn-context 32KB trimmer fired', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-context-trim-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [oversizedTurnContextState()],
    });

    expect(result.rows[0]).toEqual(expect.objectContaining({ contextTruncated: true }));
    const rawTurnContext = result.rows[0]?.rawTurnContext;
    if (rawTurnContext === undefined) throw new Error('Trimmed row omitted its raw turn context.');
    const turnContext = objectValue(JSON.parse(rawTurnContext) as unknown, 'trimmed turn context');
    expect(new TextEncoder().encode(rawTurnContext).byteLength).toBeLessThanOrEqual(32 * 1024);
    expect(turnContext).toMatchObject({
      granularity: 'full',
      context_trimmed: true,
      compact_fallback: true,
      team_plan_frontier: {
        policy: 'team-scorer-v1',
        frontier_resolution: 'fully_resolved',
        detail_level: 'omitted',
        frontier_candidate_count: 2,
        removed_candidate_count: 0,
        reason: 'context_size_limit',
      },
    });
    const frontier = objectValue(turnContext['team_plan_frontier'], 'trimmed team plan frontier');
    expect(frontier).not.toHaveProperty('candidates');
    expect(frontier).not.toHaveProperty('removed');
    expect(turnContext).not.toHaveProperty('renderer_defect');
    const actors = turnContext['actors'];
    if (!Array.isArray(actors)) throw new Error('Compact fallback omitted actors.');
    expect(actors).toHaveLength(45);
    expect(actors.every((value) => {
      const options = objectValue(value, 'compact fallback actor')['options'];
      return Array.isArray(options) && options.length === 2 && options.every((option) =>
        /^k\d+$/u.test(String(objectValue(option, 'compact fallback option')['option_id'])));
    })).toBe(true);
  });

  it('injects the root and tactics pair byte-for-byte only on cold start and attributes its hash', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-kb-'));
    const outPath = join(directory, 'rows.jsonl');
    const root = kbInputs.fixtures.readText('tests/fixtures/ai-dm-kb/ai-dm-core.md');
    const tactics = kbInputs.fixtures.readText('tests/fixtures/ai-dm-kb/tactics.md');
    const resolvedRoot = KB_SUBJECTS.reduce<string>((text, subject) => text.replaceAll(
      `${AI_DM_KB_FIXTURE_DIRECTORY}/${subject}.md`,
      resolve(process.cwd(), AI_DM_KB_FIXTURE_DIRECTORY, `${subject}.md`),
    ), root);
    const startupInstructions = `${resolvedRoot}\n\n${tactics}`;
    const adapter = new RecordingConversationAdapter();
    const config = parseConversationArgs([
      '--rooms', '3', '--rounds', '1', '--out', outPath, '--kb', DEFAULT_AI_DM_KB_ROOT,
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, { adapter });

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.startInvocations[0]?.instructions).toBe(startupInstructions);
    expect(adapter.startInvocations[0]?.prompt).not.toContain(startupInstructions);
    expect(adapter.resumeInvocations.length).toBeGreaterThan(0);
    expect(adapter.resumeInvocations.every((entry) => entry.instructions === null)).toBe(true);
    expect(adapter.resumeInvocations.every((entry) => !entry.prompt.includes(startupInstructions))).toBe(true);
    const injectedText = [
      ...adapter.startInvocations.map((entry) => entry.instructions ?? ''),
      ...adapter.resumeInvocations.map((entry) => entry.instructions ?? ''),
    ].join('\n');
    expect(injectedText.split(startupInstructions).length - 1).toBe(1);

    expect(adapter.resumeInvocations.some((entry) =>
      entry.prompt.startsWith('[ROOM_TRANSITION]'))).toBe(false);

    const initialRoundInvocations = [...adapter.startInvocations, ...adapter.resumeInvocations].filter((entry) =>
      entry.launcherToken.includes('-initial-launcher.json'));
    expect(initialRoundInvocations).toHaveLength(9);
    expect(initialRoundInvocations.every((entry) => {
      const manifest = JSON.parse(readFileSync(entry.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
      return entry.prompt.includes('granularity "full"') &&
        manifest.turnContextDeltaBase === undefined;
    })).toBe(true);
    expect(result.rows.every((row) => row.kbHash === DEFAULT_KB_HASH)).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line)))
      .toHaveLength(3);
  });

  it('starts the persistent SIMULATED session with the first round plan in one model dispatch', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cold-plan-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]));

    expect(result.rows[0]).toEqual(expect.objectContaining({
      outcome: 'authorized', agentDispatched: true, callsPerRound: 1,
      combatModel: 'monster_block_v1',
      roundProtocolVersion: 3,
      partyPolicyHash: null,
      materialityPolicyHash: null,
      adjustmentBudget: 0,
      pcTurns: [],
      adjustments: [],
      monsterSegments: [],
    }));
    expect(result.rows[0]?.startingRoomDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.rows[0]?.teamPlans).toEqual({
      party: null,
      monsters: expect.objectContaining({ initialProposalId: expect.any(String) }),
    });
    expect(result.rows[0]?.roundTotals).toEqual(expect.objectContaining({
      initialCalls: 1,
      adjustmentCalls: 0,
      correctionCalls: 0,
      serviceNullAdjustments: 0,
      tokens: result.rows[0]?.tokens,
    }));
  });

  it('directs K6 to consume an inline suggestion without fetching the same play again', () => {
    const k6 = readFileSync('tests/fixtures/ai-dm-kb/k6.txt', 'utf8');

    expect(k6).toContain('If suggested_plan is present, use its proposals directly');
    expect(k6).toContain('do not call engine.propose_from_play');
    expect(k6).toContain('Only when suggested_plan is absent');
  });

  it('admits the active process and local OpenAI conversation adapters', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cli-'));
    const outPath = join(directory, 'rows.jsonl');
    const defaults = parseConversationArgs(['--rooms', '1', '--out', outPath]);
    expect(defaults.combatModel).toBe('initiative_segments_v1');
    expect(defaults.initiativeProfile).toBe('derived_v1');
    expect(defaults.intelMode).toBe('full');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--intel-mode', 'off',
    ]).intelMode).toBe('off');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--intel-mode', 'partial',
    ])).toThrow('--intel-mode must be full or off.');
    const block = parseConversationArgs([
      '--rooms', '1', '--out', outPath,
      '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
    ]);
    expect(block.combatModel).toBe('monster_block_v1');
    expect(block.initiativeProfile).toBe('legacy');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--combat-model', 'unknown-model',
    ])).toThrow('--combat-model must be monster_block_v1 or initiative_segments_v1');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--initiative-profile', 'synthetic',
    ])).toThrow('--initiative-profile must be legacy or derived_v1');
    expect(parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'claude-code']).cli)
      .toBe('claude-code');
    expect(() => parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'pi']))
      .toThrow('--cli must be codex, claude-code, or local-openai');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'local-openai',
      '--local-base-url', 'http://127.0.0.1:11434/v1', '--local-model', 'llama-SIMULATED',
    ])).toEqual(expect.objectContaining({
      cli: 'local-openai', model: 'llama-SIMULATED', cliBin: '',
      localOpenAi: {
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'llama-SIMULATED',
        thinkMode: 'off',
      },
    }));
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'local-openai',
      '--local-base-url', 'http://127.0.0.1:11434/v1', '--local-model', 'llama-SIMULATED',
      '--local-think', 'on',
    ]).localOpenAi?.thinkMode).toBe('on');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'local-openai',
      '--local-base-url', 'http://127.0.0.1:11434/v1', '--local-model', 'llama-SIMULATED',
      '--local-think', 'sometimes',
    ])).toThrow('--local-think must be on or off');
    expect(parseConversationArgs(['--rooms', '1', '--out', outPath]).kbPath)
      .toBe(join(process.cwd(), DEFAULT_AI_DM_KB_ROOT));
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'tests/fixtures/arena-basis/seed-3943001.json',
    ])).toThrow('--kb must name a root under tests/fixtures/ai-dm-kb');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath,
      '--escalation-model', 'gpt-escalation', '--escalation-effort', 'xhigh',
    ])).toEqual(expect.objectContaining({
      escalationModel: 'gpt-escalation', escalationEffort: 'xhigh',
    }));
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--escalation-model', 'gpt-escalation',
    ])).toThrow('--escalation-model and --escalation-effort must be supplied together');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'content/cc-by-sa/forbidden.txt',
    ])).toThrow('--kb cannot use content/cc-by-sa');
  });

  it('derives per-combatant initiative for standalone fixtures and rejects an explicit legacy profile', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-fixture-constraint-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'derived.jsonl'), '--dry-run',
    ]));
    expect(result.rows[0]?.combatModel).toBe('initiative_segments_v1');

    const incompatible = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'legacy.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'legacy', '--dry-run',
    ]);
    await expect(runConversation(incompatible)).rejects.toThrow(
      'initiative_segments_v1 fixture constraint: room 1 must declare config.initiativeMode="per_combatant"',
    );
  });

  it('walks an alternating initiative fixture without waking the DM for HP-only drift', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-no-drift-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
    });
    const row = result.rows[0];

    expect(row).toEqual(expect.objectContaining({
      combatModel: 'initiative_segments_v1',
      roundProtocolVersion: 3,
      outcome: 'authorized',
      adjustments: [],
      callsPerRound: 2,
      adjustmentBudget: 2,
    }));
    expect(row?.partyPolicyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(row?.materialityPolicyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(row?.teamPlans.party).toEqual(expect.objectContaining({
      planId: expect.any(String),
      planHash: expect.any(String),
      sharedObjective: 'defeat_the_hostile_team',
      programs: expect.any(Array),
    }));
    expect(row?.teamPlans.monsters).toEqual(expect.objectContaining({
      initialProposalId: expect.any(String),
      initialProposalHash: expect.any(String),
      authorizedProposals: expect.any(Array),
    }));
    expect(row?.initiativeOrder).toHaveLength(6);
    expect(row?.initiativeOrder).toEqual([
      'combatant:cleric',
      'combatant:generated-3943001-monster-3',
      'combatant:fighter',
      'combatant:wizard',
      'combatant:generated-3943001-monster-2',
      'combatant:generated-3943001-monster-1',
    ]);
    expect(row?.pcTurns).toHaveLength(3);
    expect(row?.pcTurns?.every((turn) => !turn.material)).toBe(true);
    expect(row?.pcTurns?.every((turn) =>
      turn.initiativeIndex >= 0 && turn.afterRevision > turn.beforeRevision &&
      turn.plannedProgramHash.length === 64 && turn.executedProgramHash.length === 64 &&
      turn.commandSequence.length > 0 && turn.adherenceReasons.length > 0)).toBe(true);
    expect(row?.monsterSegments?.map((segment) => segment.actors)).toEqual([
      ['combatant:generated-3943001-monster-3'],
      [
        'combatant:generated-3943001-monster-2',
        'combatant:generated-3943001-monster-1',
      ],
    ]);
    expect(row?.monsterSegments?.every((segment) =>
      Array.isArray(segment.deviationResolutions) &&
      segment.initiativeIndexes.length === segment.actors.length &&
      segment.afterRevision > segment.beforeRevision && segment.appliedPlanHash.length === 64)).toBe(true);
    expect(row?.roundTotals).toEqual(expect.objectContaining({
      initialCalls: 1,
      adjustmentCalls: 0,
      correctionCalls: 0,
      serviceNullAdjustments: 0,
    }));
    expect(row?.speculations).toContainEqual(expect.objectContaining({
      status: 'adopted', proposed: true, adopted: true, discarded: false,
      budgetMs: 60_000,
      branchCount: expect.any(Number),
      planningWallMs: expect.any(Number),
      boundaryWaitMs: expect.any(Number),
      source: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
      decision: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
    }));
  });

  it('ends a three-round room as party_defeated when all PCs are dead entering the party segment', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-party-defeated-'));
    const base = await alternatingInitiativeRoom();
    const defeated: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) =>
        combatant.profile.kind === 'player_character'
          ? { ...combatant, hitPoints: 0, life: 'dead' as const, deathSaves: null }
          : combatant),
    };
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversation(config, { roomStates: [defeated] });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.terminalOutcome).toEqual({
      kind: 'encounter_over', result: 'party_defeated',
    });
    expect(result.rows[0]?.refusals).toEqual([]);
  });

  it('runs three rounds with a one-round party program by recording typed default turns', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-party-default-'));
    const base = await alternatingInitiativeRoom({ monsterHitPoints: 10_000 });
    const durable: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) => combatant.profile.kind === 'player_character'
        ? {
            ...combatant,
            hitPoints: 10_000,
            profile: {
              ...combatant.profile,
              rules: { ...combatant.profile.rules, hitPointMaximum: 10_000 },
            },
          }
        : combatant),
    };
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversation(config, {
      roomStates: [durable],
      mutateScriptedPartyPlan: (plan, context) => context.round === 1
        ? plan
        : { ...plan, programs: [] },
    });

    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((row) => row.partyDefaultTurn)).toEqual([false, true, true]);
    expect(result.rows.flatMap((row) => row.refusals)).toEqual([]);
    expect(result.rows.slice(1).flatMap((row) => row.pcTurns)
      .every((turn) => turn.partyDefaultTurn !== null)).toBe(true);
  });

  it.each([
    ['keep', 'baseline_kept'],
    ['change', 'adjusted'],
  ] as const)('records a material adjustment that chooses %s', { timeout: 30_000 }, async (response, outcome) => {
    const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-segments-${response}-`));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--capture-rl-data', '--dry-run',
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': response },
    });
    const row = result.rows[0];

    expect(row?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome,
      granularity: 'turn_delta',
      flapRetries: 0,
      triggerPcTurnOrdinal: 1,
      triggerInitiativeIndex: 0,
      requestId: 'request:room-1-round-1-pc-turn-1',
      openActors: expect.any(Array),
      proposalId: expect.any(String),
      baselinePlanHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      resultPlanHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      changedActors: expect.any(Array),
      correctionSessionId: null,
      usage: expect.objectContaining({ input: expect.any(Number) }),
      toolCalls: expect.any(Number),
      modelCalls: 1,
      refusals: [],
      correctionChain: null,
      rlData: expect.any(Array),
    }));
    expect(row?.adjustments?.[0]?.stateBinding).toEqual({
      request: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
      result: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
    });
    expect(row?.adjustments?.[0]?.rawContext).toContain('"granularity":"turn_delta"');
    expect(row?.rlData).toEqual(expect.objectContaining({
      format: 'arena-rl-capture-v2',
      task: 'round_plan',
      submissionTool: 'engine.submit_round_proposals',
      roundProtocolVersion: 3,
      engineIntel: expect.objectContaining({
        policy: 'dm-intel-capture-v1',
        policyVersions: expect.objectContaining({
          evaluator: 'tactical-evaluator-v2',
          renderer: 'dm-turn-intel-v1',
          query: 'dm-intel-query-v1',
          capture: 'dm-intel-capture-v1',
        }),
        actors: expect.arrayContaining([expect.objectContaining({
          offeredOptionIds: expect.any(Array),
          rows: expect.any(Array),
        })]),
      }),
    }));
    expect(row?.engineIntel).toEqual(row?.rlData?.engineIntel);
    expect(row?.adjustments[0]?.rlData[0]).toEqual(expect.objectContaining({
      format: 'arena-rl-capture-v2',
      task: 'plan_adjustment',
      submissionTool: 'engine.submit_plan_adjustment',
      parentPlanId: expect.any(String),
    }));
    expect(row?.adjustments?.[0]?.reasons).toContain('OPEN_MONSTER_SET_CHANGED');
    expect(row?.adjustments).toHaveLength(1);
    expect(row?.roundTotals.adjustmentCalls).toBe(1);
    expect(row?.monsterSegments?.flatMap((segment) => segment.actors)).toHaveLength(2);
  });

  it('fires the adjustment machinery for a material symmetric-evaluator PC turn', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-symmetric-material-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    const base = await alternatingInitiativeRoom({ fragileMonsterCount: 1 });
    const symmetricMaterialState: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) => {
        switch (combatant.profile.id) {
          case 'combatant:cleric':
            return {
              ...combatant,
              profile: {
                ...combatant.profile,
                rules: { ...combatant.profile.rules, attacksPerAction: 1 },
              },
            };
          case 'combatant:generated-3943001-monster-1':
            return {
              ...combatant,
              hitPoints: 1,
              profile: {
                ...combatant.profile,
                rules: {
                  ...combatant.profile.rules,
                  armorClass: armorClass(0),
                  hitPointMaximum: 1,
                },
              },
            };
          default: return combatant;
        }
      }),
      tokens: base.tokens.map((token) => token.combatantId === 'combatant:generated-3943001-monster-1'
        ? { ...token, position: { column: 4, row: 7 } }
        : token),
    };

    // Cleric and monster-1 are adjacent, so the symmetric evaluator ranks its
    // unknown-AC melee attack (rank 2) ahead of force_save (rank 3). Monster-1
    // has AC 0 and 1 HP; the generic attack is +7 and 1d8 + 4, so the fixed
    // transcript's non-natural-1 hit deals at least 5 and changes the open set [m1,m2,m3]
    // to [m2,m3]. That is hand-computed OPEN_MONSTER_SET_CHANGED materiality.
    const result = await runConversationWithPartyPolicy('symmetric_evaluator_v1', config, {
      roomStates: [symmetricMaterialState],
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'keep' },
    });
    const row = result.rows[0];
    const firstTurn = row?.pcTurns?.[0];
    const adjustment = row?.adjustments?.[0];

    expect(row?.partyPolicyHash).toBe(createScriptedPartyPlan(symmetricMaterialState, {
      decisionPolicy: 'symmetric_evaluator_v1',
    }).policyHash);
    expect(firstTurn?.actor).toBe('combatant:cleric');
    expect(firstTurn?.commandSequence).toHaveLength(1);
    expect(firstTurn?.commandSequence.every((command) =>
      command.type === 'attack' && command.target === 'combatant:generated-3943001-monster-1')).toBe(true);
    expect(firstTurn?.material).toBe(true);
    expect(firstTurn?.materialityReasons).toEqual(['LIFE_STATE_CHANGED', 'OPEN_MONSTER_SET_CHANGED']);
    expect(row?.adjustments).toHaveLength(1);
    expect(adjustment?.trigger).toBe('combatant:cleric');
    expect(adjustment?.triggerPcTurnOrdinal).toBe(1);
    expect(adjustment?.reasons).toEqual(['LIFE_STATE_CHANGED', 'OPEN_MONSTER_SET_CHANGED']);
    expect(adjustment?.outcome).toBe('baseline_kept');
    expect(row?.roundTotals.adjustmentCalls).toBe(1);
    expect(row?.speculations).toContainEqual(expect.objectContaining({
      status: 'adopted', proposed: true, adopted: true, discarded: false,
    }));
  });

  it('discards speculation when the actual board invalidates the planned option structure', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-speculation-material-change-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    let mutated = false;
    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      mutateBeforeSpeculationBoundary: (state) => {
        if (mutated) return state;
        mutated = true;
        return {
          ...state,
          revision: state.revision + 1,
          combatants: state.combatants.map((combatant) => combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
        };
      },
    });

    expect(result.rows[0]?.speculations).toContainEqual(expect.objectContaining({
      status: 'discarded', proposed: true, adopted: false, discarded: true,
      discardReason: expect.stringMatching(/^(?:no_scenario_match|option_mapping_failed|proposal_validation_failed)$/u),
      decision: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
    }));
    expect(result.rows[0]?.refusals).not.toContainEqual(expect.stringContaining('SPECULATION_RECALC_REQUIRED'));
  });

  it('aborts speculative planning at the D407 pacing deadline', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-speculation-budget-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      speculationBudgetMs: 5,
      speculationDispatchDelayMs: 25,
    });
    const expired = result.rows[0]?.speculations.find((entry) =>
      entry.status === 'discarded' && entry.discardReason === 'budget_expired');

    expect(expired).toEqual(expect.objectContaining({
      status: 'discarded', budgetMs: 5, proposed: true, adopted: false, discarded: true,
      planningWallMs: expect.any(Number), boundaryWaitMs: expect.any(Number),
    }));
    expect(expired?.status === 'discarded' ? expired.planningWallMs : Number.POSITIVE_INFINITY)
      .toBeLessThan(1_000);
  });

  it('gives two material PC turns independent adjustment flap budgets', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-independent-flaps-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const base = await alternatingInitiativeRoom({ fragileMonsterCount: 1 });
    const twoFragileMonsters: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) =>
        combatant.profile.id === 'combatant:generated-3943001-monster-3'
          ? {
            ...combatant,
            hitPoints: 1,
            profile: {
              ...combatant.profile,
              rules: { ...combatant.profile.rules, hitPointMaximum: 1 },
            },
          }
          : combatant),
    };
    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [twoFragileMonsters],
      flapPrimaryByRequest: {
        'room-1-round-1-pc-turn-1': 1,
        'room-1-round-1-pc-turn-2': 1,
      },
    });

    expect(result.rows[0]?.adjustments?.slice(0, 2)).toEqual([
      expect.objectContaining({ flapRetries: 1, outcome: 'baseline_kept' }),
      expect.objectContaining({ flapRetries: 1, outcome: 'baseline_kept' }),
    ]);
  });

  it('runs one adjustment correction and retains the corrected replacement', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-correction-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'invalid' },
    });

    expect(result.rows[0]?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome: 'adjusted',
      flapRetries: 0,
    }));
    expect(result.rows[0]?.callsPerRound).toBeGreaterThanOrEqual(3);
  });

  it('keeps the baseline after three adjustment service nulls and continues the round', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-service-null-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      flapPrimaryByRequest: { 'room-1-round-1-pc-turn-1': 3 },
    });

    expect(result.rows[0]?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome: 'service_null',
      flapRetries: 2,
    }));
    expect(result.rows[0]?.pcTurns).toHaveLength(3);
    expect(result.rows[0]?.monsterSegments?.flatMap((segment) => segment.actors).length)
      .toBeGreaterThan(0);
  });

  it('treats adjustment correction no-response as protocol exhaustion, not a flap', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-correction-exhaustion-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'invalid' },
      failCorrection: ['room-1-round-1-pc-turn-1'],
    });

    expect(result.rows[0]?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome: 'baseline_kept',
      flapRetries: 0,
    }));
    expect(result.rows[0]?.monsterSegments?.flatMap((segment) => segment.actors).length)
      .toBeGreaterThan(0);
  });
});
