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
  MemoryBrowserSessionStore,
} from '../../../src/vtt/session-persistence';
import { codexArgv } from '../../../src/vtt/agent-adapters/codex';
import {
  applyRevisionDelta,
  type RevisionDeltaOperation,
} from '../../../src/vtt/dm-bridge/projection-transport';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { alternatingInitiativeRoom } from '../../fixtures/initiative-segments/alternating-room';

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
  readonly startInvocations: AgentInvocation[] = [];
  readonly resumeInvocations: AgentInvocation[] = [];
  #startCount = 0;

  constructor(private readonly choice: 'use_action_dodge' | 'targeted_web' | 'attack' | 'invalid_then_dodge' | 'option_shaped_end_turn') {}

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
        override_justification: null,
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
      usage: null,
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
    expect(tieredAdapter.resumeInvocations).toHaveLength(0);
    expect(untieredAdapter.startInvocations).toHaveLength(1);
    expect(untieredAdapter.resumeInvocations).toHaveLength(1);
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
      '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      exhaustInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
      restoreAfterRound: 1,
    });

    expect(result.rows).toHaveLength(4);
    expect(result.rows.map((row) => row.outcome)).toEqual([
      'auto_resolved', 'authorized', 'authorized', 'authorized',
    ]);
    expect(result.rows.every((row) => row.refusals.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.sessionId === null && row.escalationSessionId === null)).toBe(true);
    expect(new Set(result.rows.map((row) => row.sessionIdHash)).size).toBe(1);
    expect(result.rows[0]?.toolCalls).toBe(2);
    expect(result.rows[0]?.agentDispatched).toBe(true);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      plannedBy: 'sim_controller', escalated: false, escalationModel: null,
    }));
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
    expect(result.binding?.sessionId).toBe('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(result.binding).not.toBeNull();
    if (result.binding === null) throw new Error('SIMULATED run lost its agent binding.');
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
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config);

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', toolCalls: 2, callsPerRound: 1, refusals: [], kbHash: null,
      }),
    ]);
    expect(result.rows[0]?.tokens).toEqual({ input: 0, cachedInput: 0, output: 0, reasoning: 0 });
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
        outcome: 'auto_resolved', flapRetries: 0, serviceNull: false,
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
  });

  it('injects a KB only on cold start and attributes every output row to its bytes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-kb-'));
    const outPath = join(directory, 'rows.jsonl');
    const kbPath = join(directory, 'kb.txt');
    const kbText = 'SIMULATED KB: café tactics\n';
    writeFileSync(kbPath, kbText, 'utf8');
    const adapter = new RecordingConversationAdapter();
    const config = parseConversationArgs([
      '--rooms', '3', '--rounds', '1', '--out', outPath, '--kb', kbPath,
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, { adapter });
    const expectedHash = createHash('sha256').update(Buffer.from(kbText, 'utf8')).digest('hex');

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.startInvocations[0]?.instructions).toBe(kbText);
    expect(adapter.startInvocations[0]?.prompt).not.toContain(kbText);
    expect(adapter.resumeInvocations.length).toBeGreaterThan(0);
    expect(adapter.resumeInvocations.every((entry) => entry.instructions === null)).toBe(true);
    expect(adapter.resumeInvocations.every((entry) => !entry.prompt.includes(kbText))).toBe(true);
    const injectedText = [
      ...adapter.startInvocations.map((entry) => entry.instructions ?? ''),
      ...adapter.resumeInvocations.map((entry) => entry.instructions ?? ''),
    ].join('\n');
    expect(injectedText.split(kbText).length - 1).toBe(1);

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
    expect(result.rows.every((row) => row.kbHash === expectedHash)).toBe(true);
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
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'tests/fixtures/arena-basis/seed-3943001.json',
    ]).kbPath).toBe(join(process.cwd(), 'tests/fixtures/arena-basis/seed-3943001.json'));
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
      callsPerRound: 1,
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

    const result = await runConversation(config, {
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
    }));
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
    const result = await runConversation(config, {
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

    const result = await runConversation(config, {
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

    const result = await runConversation(config, {
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

    const result = await runConversation(config, {
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
