import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  agentSessionIdFromCli,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import {
  parseConversationArgs,
  proposalResolutionDivergence,
  runConversation,
} from '../../../tools/ai-dm-conversation';
import { mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { encounterSessionId, type CombatantId } from '../../../src/combat/values';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { generateRoom } from '../../../src/vtt/room-generator';
import {
  pureIntentResolver,
  type EngineActionChoice,
  type EngineTurnIntent,
} from '../../../src/vtt/intent-resolver';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import {
  createEngineMcpRuntime,
  loadArenaFixture,
  parseEngineMcpJsonLine,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import { mcpRequestMeta, type McpHandler } from '../../../src/vtt/mcp/handler';
import { reduceSessionEncounter } from '../../../src/vtt/session-encounter-reducer';
import {
  importSavedSession,
  MemoryBrowserSessionStore,
} from '../../../src/vtt/session-persistence';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

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

  private completed(sessionId: AgentTurnResult['sessionId']): AgentTurnResult {
    return { sessionId, finalText: 'SIMULATED', usage: null, exit: 'completed' };
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

function attackIntent(state: EncounterState, actorId: CombatantId): Readonly<Record<string, unknown>> | null {
  const actor = canonicalEngineQueryPort.combatant(state, actorId);
  if (actor === null) throw new Error(`Serialized attack actor ${actorId} is absent.`);
  const targets = state.combatants.filter((candidate) =>
    candidate.life !== 'dead' && !canonicalEngineQueryPort.sameSide(state, actorId, candidate.profile.id));
  for (const action of canonicalEngineQueryPort.actions(state, actorId)) {
    if (action.kind !== 'attack') continue;
    for (const target of targets) {
      const intent: EngineTurnIntent = {
        actorId,
        choice: {
          kind: 'attack', actionId: action.id,
          target: { kind: 'combatant', combatantId: target.profile.id },
        },
        movement: {
          willingness: 'only_if_required', maximumFeet: actor.profile.rules.speed,
          opportunityRisk: 'accept_if_needed',
        },
        engagement: { stance: 'close_to_melee' },
        fallback: null,
      };
      if (!pureIntentResolver.resolve(state, intent).valid) continue;
      return {
        actor_id: actorId,
        choice: {
          kind: 'attack', action_id: action.id,
          target: { kind: 'combatant', combatant_id: target.profile.id },
        },
        movement: {
          willingness: 'only_if_required', maximum_feet: actor.profile.rules.speed,
          opportunity_risk: 'accept_if_needed',
        },
        engagement: { stance: 'close_to_melee' },
        fallback: null,
      };
    }
  }
  return null;
}

class SerializedRoundTripAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  readonly submittedChoices: Readonly<Record<string, unknown>>[] = [];
  readonly decodedChoices: EngineActionChoice[] = [];

  constructor(private readonly choice: 'use_action_dodge' | 'attack') {}

  async probe() { return { present: true, version: 'SERIALIZED-TEST' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    return this.completed(agentSessionIdFromCli(`codex:serialized:${invocation.runId}`));
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
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
    });
    const context = serializedToolCall(runtime.handler, 'engine.get_turn_context', {
      run_id: manifest.runId, expected_revision: manifest.revision, scope: 'round',
    });
    const stateRef = objectValue(context['state_ref'], 'serialized state ref');
    const actors = runtime.feed.current().request?.actors;
    if (actors === undefined) throw new Error('Serialized round request has no actors.');
    let attackSubmitted = false;
    const intents = actors.map((actorId) => {
      const attack = this.choice === 'attack' && !attackSubmitted
        ? attackIntent(state, actorId)
        : null;
      if (attack !== null) attackSubmitted = true;
      const intent = attack ?? {
        actor_id: actorId,
        choice: this.choice === 'use_action_dodge'
          ? { kind: 'use_action', action_id: 'dodge', target: null }
          : { kind: 'dodge' },
        movement: { willingness: 'none', maximum_feet: 0, opportunity_risk: 'avoid' },
        engagement: { stance: 'hold_position' },
        fallback: null,
      };
      this.submittedChoices.push(objectValue(intent['choice'], 'serialized intent choice'));
      return intent;
    });
    if (this.choice === 'attack' && !attackSubmitted) {
      throw new Error('Serialized round has no requested actor with a resolvable attack.');
    }
    const submitted = serializedToolCall(runtime.handler, 'engine.submit_round_intents', {
      state_ref: stateRef,
      request_id: manifest.requestId,
      phase: manifest.phase,
      idempotency_key: `serialized-${this.choice}-${manifest.phase}`,
      intents,
    });
    if (submitted['status'] !== 'proposed' || runtime.proposals.length !== 1) {
      throw new Error(`Serialized round was not proposed: ${JSON.stringify(submitted)}`);
    }
    const proposal = runtime.proposals[0];
    if (proposal?.kind !== 'round_intent_proposal') throw new Error('Serialized handler omitted the round proposal.');
    this.decodedChoices.push(...proposal.resolutions.map((resolution) => resolution.intent.choice));
    writeFileSync(manifest.proposalSpoolPath, `${JSON.stringify(proposal)}\n`, 'utf8');
    return this.completed(binding.sessionId);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }

  private completed(sessionId: AgentTurnResult['sessionId']): AgentTurnResult {
    return { sessionId, finalText: 'SERIALIZED-TEST', usage: null, exit: 'completed' };
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

describe('AI-DM engine MCP conversation runner', () => {
  it('authorizes a serialized MCP use_action dodge proposal', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-dodge-'));
    const adapter = new SerializedRoundTripAdapter('use_action_dodge');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });
    const rejectionReasons = result.rows[0]?.chainEvidence.failedAttempts
      .flatMap((attempt) => attempt.rejectionReasons) ?? [];

    expect(adapter.submittedChoices).toContainEqual({
      kind: 'use_action', action_id: 'dodge', target: null,
    });
    expect(adapter.decodedChoices).toContainEqual({
      kind: 'use_action', actionId: 'dodge', target: null,
    });
    expect(rejectionReasons).not.toContain('The engine could not authorize this proposal mechanic.');
    expect(result.rows[0]).toEqual(expect.objectContaining({ outcome: 'authorized', refusals: [] }));
    expect(result.rows[0]?.stateBinding.authorization).toEqual(result.rows[0]?.stateBinding.capsule);
  });

  it('authorizes a serialized MCP attack proposal', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-attack-'));
    const adapter = new SerializedRoundTripAdapter('attack');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.submittedChoices.some((choice) => choice['kind'] === 'attack')).toBe(true);
    expect(adapter.decodedChoices.some((choice) => choice.kind === 'attack')).toBe(true);
    expect(result.rows[0]).toEqual(expect.objectContaining({ outcome: 'authorized', refusals: [] }));
    expect(result.rows[0]?.stateBinding.authorization).toEqual(result.rows[0]?.stateBinding.capsule);
  });

  it('identifies the divergent mechanic when room 3943006 cannot be re-resolved', () => {
    const state = generateRoom(3_943_006).encounter.state;
    const actor = state.combatants.find((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead');
    if (actor === undefined) throw new Error('Generated room 3943006 has no living monster.');
    const intent: EngineTurnIntent = {
      actorId: actor.profile.id,
      choice: { kind: 'dodge' },
      movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
      engagement: { stance: 'hold_position' },
      fallback: null,
    };
    const proposalTime = pureIntentResolver.resolve(state, intent);
    if (!proposalTime.valid) throw new Error('Room 3943006 dodge intent did not resolve.');

    expect(proposalResolutionDivergence(state, {
      intent,
      selectedBranch: proposalTime.selectedBranch,
      resolutionDigest: '0'.repeat(64),
      summary: proposalTime.summary,
    })).toEqual([
      `${actor.profile.id}: path or final-position geometry diverged while action, target, and movement cost remained ${proposalTime.summary}.`,
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
      expect(row?.chainEvidence.failedAttempts.find((attempt) =>
        attempt.rejectionReasons.some((reason) => reason.includes('cannot reach')),
      )?.declaredIntent).toEqual(expect.objectContaining({
        movement: expect.objectContaining({ willingness: 'only_if_required' }),
        engagement: { stance: 'close_to_melee' },
      }));
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
      '--dry-run',
    ]);

    const result = await runConversation(config, {
      exhaustInitial: ['room-1-round-1'],
      restoreAfterRound: 1,
    });

    expect(result.rows).toHaveLength(4);
    expect(result.rows.map((row) => row.outcome)).toEqual([
      'auto_resolved', 'authorized', 'authorized', 'authorized',
    ]);
    expect(result.rows.every((row) => row.refusals.length === 0)).toBe(true);
    expect(new Set(result.rows.map((row) => row.sessionIdHash)).size).toBe(1);
    expect(result.rows[0]?.toolCalls).toBe(3);
    expect(result.rows[0]?.agentDispatched).toBe(true);
    expect(result.rows[0]?.chainEvidence).toEqual({
      failedAttempts: expect.arrayContaining([
        expect.objectContaining({ attempt: 'primary' }),
        expect.objectContaining({ attempt: 'fallback' }),
        expect.objectContaining({ attempt: 'correction' }),
      ]),
      autoResolvedTrigger: expect.stringContaining('deterministic controller'),
      correctionFinalText: 'SIMULATED — proposal delivered through engine MCP spool',
    });
    expect(result.rows[0]?.proposalId).toBeNull();
    expect(result.rows[1]?.proposalId).toContain('round:');
    expect(result.rows[0]?.projectionRevision).toBeGreaterThan(result.rows[0]?.contextRevision ?? 0);
    expect(result.rows[1]?.contextRevision).toBe(result.rows[0]?.projectionRevision);
    expect(result.rows[2]?.contextRevision).toBeGreaterThan(result.rows[1]?.projectionRevision ?? 0);
    expect(result.binding.sessionId).toBe('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(result.binding.lastDispatchedRevision).toBeGreaterThan(result.binding.startedAtRevision);
    expect(result.restoredMidRun).toBe(true);
    expect(result.journalExport).toContain('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
  });

  it('runs a model-free stdio MCP dry-run smoke', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-smoke-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
    ]);

    const result = await runConversation(config);

    expect(result.rows).toEqual([
      expect.objectContaining({ outcome: 'authorized', toolCalls: 2, refusals: [], kbHash: null }),
    ]);
    expect(result.rows[0]?.tokens).toEqual({ input: 0, cachedInput: 0, output: 0, reasoning: 0 });
  });

  it('retries one SIMULATED service flap and uses the first healthy primary turn', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-flap-recovery-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
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
    ]);

    const result = await runConversation(config, {
      flapPrimaryByRequest: { 'room-1-round-1': 3 },
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'service_null', flapRetries: 2, serviceNull: true,
        toolCalls: 0, proposalId: null, refusals: [],
        chainEvidence: { failedAttempts: [], autoResolvedTrigger: null, correctionFinalText: null },
      }),
    ]);
    expect(result.rows[0]?.projectionRevision).toBe(result.rows[0]?.contextRevision);
  });

  it('does not retry a SIMULATED primary turn that called engine tools before rejection', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-engine-rejection-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
    ]);

    const result = await runConversation(config, {
      invalidInitial: ['room-1-round-1'],
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'auto_resolved', flapRetries: 0, serviceNull: false,
        toolCalls: 4,
        chainEvidence: expect.objectContaining({
          failedAttempts: expect.arrayContaining([
            expect.objectContaining({ attempt: 'primary' }),
            expect.objectContaining({ attempt: 'fallback' }),
          ]),
        }),
      }),
    ]);
  });

  it('injects a KB only on cold start and attributes every output row to its bytes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-kb-'));
    const outPath = join(directory, 'rows.jsonl');
    const kbPath = join(directory, 'kb.txt');
    const kbText = 'SIMULATED KB: café tactics\n';
    writeFileSync(kbPath, kbText, 'utf8');
    const adapter = new RecordingConversationAdapter();
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--kb', kbPath,
    ]);

    const result = await runConversation(config, { adapter });
    const expectedHash = createHash('sha256').update(Buffer.from(kbText, 'utf8')).digest('hex');

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.startInvocations[0]?.instructions).toBe(kbText);
    expect(adapter.startInvocations[0]?.prompt).not.toContain(kbText);
    expect(adapter.resumeInvocations.length).toBeGreaterThan(0);
    expect(adapter.resumeInvocations.every((entry) => entry.instructions === null)).toBe(true);
    expect(adapter.resumeInvocations.every((entry) => !entry.prompt.includes(kbText))).toBe(true);
    expect(result.rows.every((row) => row.kbHash === expectedHash)).toBe(true);
    expect(JSON.parse(readFileSync(outPath, 'utf8').trim())).toEqual(
      expect.objectContaining({ kbHash: expectedHash }),
    );
  });

  it('admits only the active codex and claude-code adapters', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cli-'));
    const outPath = join(directory, 'rows.jsonl');
    expect(parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'claude-code']).cli)
      .toBe('claude-code');
    expect(() => parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'pi']))
      .toThrow('--cli must be codex or claude-code');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'tests/fixtures/arena-basis/seed-3943001.json',
    ]).kbPath).toBe(join(process.cwd(), 'tests/fixtures/arena-basis/seed-3943001.json'));
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'content/cc-by-sa/forbidden.txt',
    ])).toThrow('--kb cannot use content/cc-by-sa');
  });
});
