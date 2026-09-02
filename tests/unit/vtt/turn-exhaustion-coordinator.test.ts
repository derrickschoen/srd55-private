import { describe, expect, it } from 'vitest';
import { createEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import {
  agentSessionId,
  encounterBranchId,
  encounterSessionId,
} from '../../../src/combat/values';
import { AgentSessionLifecycle } from '../../../src/vtt/agent-session-lifecycle';
import type { RoundTurnProposalEnvelope } from '../../../src/vtt/engine-envelopes';
import { engineActionId, engineOptionId } from '../../../src/vtt/turn-proposal';
import {
  createEngineStateCapsule,
  projectEngineDmProjection,
} from '../../../src/vtt/engine-state-capsule';
import { engineActionRegistry } from '../../../src/vtt/engine-query-port';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { referenceEncounterSetup } from '../../../src/vtt/reference-encounter';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import {
  MAX_PROPOSAL_CORRECTIONS,
  TurnExhaustionCoordinator,
  type AutoResolvedProposalMark,
  type DeterministicProposalResolution,
  type ProposalFallbackResult,
  type TurnExhaustionCorrectionRuntime,
  type TurnExhaustionHost,
} from '../../../src/vtt/turn-exhaustion-coordinator';
import { SIMULATEDAgentSessionAdapter } from '../../fixtures/simulated-agent-session-adapter';

const INITIAL_COORDINATOR_STATE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function fixture() {
  const state = createEncounter(referenceEncounterSetup());
  const actor = state.combatants.find((entry) => entry.profile.kind === 'monster')?.profile.id;
  if (actor === undefined) throw new Error('Exhaustion fixture needs a monster.');
  const sessionId = encounterSessionId('session:turn-exhaustion');
  const branchId = encounterBranchId('branch:turn-exhaustion');
  const store = new MemoryBrowserSessionStore();
  const journal = EncounterSessionJournal.create({
    sessionId,
    branchId,
    encounterState: state,
    coordinatorState: INITIAL_COORDINATOR_STATE,
    controllers: [],
    rng: mulberry32(398_399),
    store,
    mirror: new MemoryMirrorSink(),
  });
  journal.startAgentSession({
    cli: 'codex',
    sessionId: agentSessionId('agent-session:turn-exhaustion'),
    adapterVersion: 4,
  });
  const projection = projectDmBoard({
    view: { audience: 'dm', state },
    coordinator: INITIAL_COORDINATOR_STATE,
    controllers: [],
    history: journal.history(),
  });
  const capsule = createEngineStateCapsule({
    runId: sessionId,
    branchId,
    revision: 3,
    generatedAt: '2026-08-27T18:00:00.000Z',
    request: {
      requestId: 'request:exhaustion',
      phase: 'correction',
      correctionNumber: MAX_PROPOSAL_CORRECTIONS,
      actors: [actor],
    },
    projection: projectEngineDmProjection(projection, engineActionRegistry(state), 1),
  });
  return { actor, branchId, capsule, journal, sessionId, state, store };
}

function proposal(
  f: ReturnType<typeof fixture>,
  phase: 'initial' | 'correction',
  selectedBranch: 'primary' | 'fallback',
  proposalId = `proposal:${phase}`,
): RoundTurnProposalEnvelope {
  const primaryOption = {
    optionId: engineOptionId(`option:${phase}:primary`), actorId: f.actor, revision: f.state.revision,
    label: 'Dodge',
    movement: { preference: { willingness: 'none' as const, maximumFeet: 0, opportunityRisk: 'avoid' as const }, engagement: { stance: 'hold_position' as const } },
    actionSlots: [{ slot: 'main' as const, use: { kind: 'dodge' as const } }], resourceCostLabels: [], omittedRiders: [],
  };
  const fallbackOption = selectedBranch === 'fallback'
    ? { ...primaryOption, optionId: engineOptionId(`option:${phase}:fallback`), label: 'End Turn', actionSlots: [{ slot: 'main' as const, use: { kind: 'end_turn' as const } }] }
    : null;
  const selectedOption = fallbackOption ?? primaryOption;
  const turnProposal = {
    actorId: f.actor, expectedRevision: f.state.revision, primaryOptionId: primaryOption.optionId,
    fallbackOptionId: fallbackOption?.optionId ?? null, overrideJustification: null,
  };
  return {
    kind: 'round_turn_proposal',
    proposalId,
    runId: f.sessionId,
    branchId: f.branchId,
    requestId: 'request:exhaustion',
    expectedRevision: phase === 'initial' ? 2 : f.capsule.revision,
    stateDigest: f.capsule.digest,
    stateHandle: 'engine-state:test',
    phase,
    idempotencyKey: `idempotency:${phase}:0001`,
    reactionGuidance: null,
    resolutions: [{
      proposal: turnProposal,
      option: selectedOption,
      primaryOption,
      fallbackOption,
      mechanics: {
        actorId: f.actor, optionId: selectedOption.optionId, movementCostFeet: 0, path: [],
        finalPosition: { column: 0, row: 0 },
        actionSlots: [{ slot: 'main', kind: selectedBranch === 'fallback' ? 'end_turn' : 'dodge', actionId: engineActionId(selectedBranch === 'fallback' ? 'end_turn' : 'dodge'), spellId: null, targetIds: [], objectId: null }],
      },
      selectedBranch,
      resolutionDigest: 'a'.repeat(64),
      summary: 'The monster dodges.',
    }],
  };
}

function runtime(
  f: ReturnType<typeof fixture>,
  adapter: SIMULATEDAgentSessionAdapter,
  queued: RoundTurnProposalEnvelope[],
  activated: { value: number },
): TurnExhaustionCorrectionRuntime {
  return {
    capsule: f.capsule,
    rules: { get: () => null },
    turnContext: { request: { phase: 'correction', correction_number: 1 } },
    lifecycle: new AgentSessionLifecycle(f.journal, adapter, 4),
    invocation: {
      runId: f.sessionId,
      prompt: 'must be replaced',
      model: 'SIMULATED-model',
      reasoningEffort: 'SIMULATED-effort',
      launcherToken: 'SIMULATED-launcher-token',
      timeoutMs: null,
    },
    signal: new AbortController().signal,
    activateCapsule: () => { activated.value += 1; },
    takeProposal: () => queued.shift() ?? null,
  };
}

function host(input: {
  readonly authorization?: 'authorized' | 'invalidated' | 'invalid';
  readonly deterministic?: DeterministicProposalResolution | null;
  readonly marks?: AutoResolvedProposalMark[];
  readonly adjudications?: string[];
} = {}): TurnExhaustionHost {
  return {
    authorize: async () => input.authorization ?? 'authorized',
    resolveDeterministically: async (actorId) => input.deterministic === undefined
      ? { actorId, expectedRevision: 3, resolutionDigest: 'b'.repeat(64) }
      : input.deterministic,
    applyAutoResolved: async (_resolution, mark) => { input.marks?.push(mark); },
    pauseForDmAdjudication: ({ actorId }) => { input.adjudications?.push(actorId); },
  };
}

function exhausted(f: ReturnType<typeof fixture>, fallbackResult: ProposalFallbackResult = 'invalid') {
  return {
    kind: 'exhausted' as const,
    requestId: 'request:exhaustion',
    initialProposalId: 'proposal:initial-attempt',
    actorFailures: [{ actorId: f.actor, fallbackResult }],
  };
}

describe('host turn exhaustion coordinator', () => {
  it('authorizes an initial declared fallback and journals the selected fallback', async () => {
    const f = fixture();
    const adapter = new SIMULATEDAgentSessionAdapter({ startIds: [] });
    const coordinator = new TurnExhaustionCoordinator(f.journal.turnExhaustionPersistence());

    await expect(coordinator.coordinate({
      initial: { kind: 'proposal', proposal: proposal(f, 'initial', 'fallback') },
      correction: runtime(f, adapter, [], { value: 0 }),
      host: host(),
    })).resolves.toEqual({ kind: 'authorized', proposalId: 'proposal:initial', phase: 'initial' });

    expect(adapter.resumeInvocations).toHaveLength(0);
    expect(f.journal.history().map((entry) => entry.transition.kind)).toContain('proposal_fallback_resolved');
  });

  it('dispatches exactly one proposal correction and accepts its complete proposal', async () => {
    const f = fixture();
    const queued: RoundTurnProposalEnvelope[] = [];
    const adapter = new SIMULATEDAgentSessionAdapter({
      startIds: [],
      onResume: () => { queued.push(proposal(f, 'correction', 'primary')); },
    });
    const activated = { value: 0 };
    const coordinator = new TurnExhaustionCoordinator(f.journal.turnExhaustionPersistence());

    await expect(coordinator.coordinate({
      initial: exhausted(f),
      correction: runtime(f, adapter, queued, activated),
      host: host(),
    })).resolves.toEqual({ kind: 'authorized', proposalId: 'proposal:correction', phase: 'correction' });

    expect(activated.value).toBe(1);
    expect(adapter.resumeInvocations).toHaveLength(1);
    expect(adapter.resumeInvocations[0]?.invocation.prompt).toContain('Correct the complete refused proposal request once.');
    expect(adapter.resumeInvocations[0]?.invocation.prompt).toContain('fallback_option_id must be null');
    expect(f.journal.history().map((entry) => entry.transition.kind)).toEqual(expect.arrayContaining([
      'proposal_correction_requested',
      'agent_session_dispatched',
      'proposal_correction_resolved',
    ]));
  });

  it('marks deterministic controller output auto-resolved after the correction returns no proposal', async () => {
    const f = fixture();
    const adapter = new SIMULATEDAgentSessionAdapter({ startIds: [] });
    const marks: AutoResolvedProposalMark[] = [];
    const coordinator = new TurnExhaustionCoordinator(f.journal.turnExhaustionPersistence());

    await expect(coordinator.coordinate({
      initial: exhausted(f, 'absent'),
      correction: runtime(f, adapter, [], { value: 0 }),
      host: host({ marks }),
    })).resolves.toEqual({ kind: 'auto_resolved', actorIds: [f.actor] });

    expect(adapter.resumeInvocations).toHaveLength(1);
    expect(marks).toEqual([expect.objectContaining({
      actorId: f.actor,
      fallbackResult: 'absent',
      correctionResult: 'no_response',
      controllerResolutionDigest: 'b'.repeat(64),
    })]);
    expect(coordinator.reconstruct('request:exhaustion')).toEqual({
      requestId: 'request:exhaustion',
      stage: 'auto_resolved',
      correctionNumber: 1,
      autoResolvedActorIds: [f.actor],
    });
  });

  it('pauses for DM adjudication instead of skipping when the deterministic controller fails', async () => {
    const f = fixture();
    const adjudications: string[] = [];
    const coordinator = new TurnExhaustionCoordinator(f.journal.turnExhaustionPersistence());

    await expect(coordinator.coordinate({
      initial: exhausted(f),
      correction: runtime(f, new SIMULATEDAgentSessionAdapter({ startIds: [] }), [], { value: 0 }),
      host: host({ deterministic: null, adjudications }),
    })).resolves.toEqual({ kind: 'awaiting_dm_adjudication', actorId: f.actor });

    expect(adjudications).toEqual([f.actor]);
    expect(f.journal.history().map((entry) => entry.transition.kind)).toContain('proposal_auto_resolution_failed');
  });

  it('reconstructs a browser resume mid-chain without dispatching a second correction', async () => {
    const f = fixture();
    f.journal.recordHostTransition({
      kind: 'proposal_correction_requested',
      requestId: 'request:exhaustion',
      initialProposalId: 'proposal:initial-attempt',
      correctionNumber: 1,
      actorFailures: [{ actorId: f.actor, fallbackResult: 'invalid' }],
    });
    const adapter = new SIMULATEDAgentSessionAdapter({ startIds: [] });
    const marks: AutoResolvedProposalMark[] = [];
    const resumed = new TurnExhaustionCoordinator(f.journal.turnExhaustionPersistence());

    expect(resumed.reconstruct('request:exhaustion')?.stage).toBe('correction_requested');
    await resumed.coordinate({
      initial: exhausted(f),
      correction: runtime(f, adapter, [], { value: 0 }),
      host: host({ marks }),
    });

    expect(adapter.resumeInvocations).toHaveLength(0);
    expect(f.journal.history().filter((entry) =>
      entry.transition.kind === 'proposal_correction_requested')).toHaveLength(1);
    expect(marks).toHaveLength(1);
  });
});
