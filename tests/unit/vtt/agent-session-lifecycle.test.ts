import { describe, expect, it } from 'vitest';
import { createEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import {
  agentSessionId,
  encounterBranchId,
  encounterSessionId,
} from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import {
  type AgentFailureClassification,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import { AgentSessionLifecycle } from '../../../src/vtt/agent-session-lifecycle';
import { referenceEncounterSetup } from '../../../src/vtt/reference-encounter';
import {
  EncounterSessionJournal,
  exportSavedSession,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';

class SIMULATEDResumeFailure extends Error {
  constructor(readonly classification: AgentFailureClassification) {
    super(`SIMULATED ${classification}`);
  }
}

class SIMULATEDAgentSessionAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  readonly startInvocations: AgentInvocation[] = [];
  readonly resumeInvocations: Array<{
    readonly binding: AgentSessionBinding;
    readonly invocation: AgentInvocation;
  }> = [];
  readonly #startIds: string[];
  readonly #resumeFailures: SIMULATEDResumeFailure[];

  constructor(input: {
    readonly startIds: readonly string[];
    readonly resumeFailures?: readonly SIMULATEDResumeFailure[];
  }) {
    this.#startIds = [...input.startIds];
    this.#resumeFailures = [...(input.resumeFailures ?? [])];
  }

  async probe() {
    return { present: true, version: 'SIMULATED' };
  }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.startInvocations.push(invocation);
    const next = this.#startIds.shift();
    if (next === undefined) throw new Error('SIMULATED start script exhausted.');
    return completed(next, 'SIMULATED bootstrap');
  }

  async resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
  ): Promise<AgentTurnResult> {
    this.resumeInvocations.push({ binding, invocation });
    const failure = this.#resumeFailures.shift();
    if (failure !== undefined) throw failure;
    return completed(binding.sessionId, `SIMULATED resume ${invocation.prompt}`);
  }

  classifyFailure(error: unknown): AgentFailureClassification {
    return error instanceof SIMULATEDResumeFailure ? error.classification : 'unknown';
  }
}

function completed(sessionId: string, finalText: string): AgentTurnResult {
  return {
    sessionId: agentSessionId(sessionId),
    finalText,
    usage: null,
    exit: 'completed',
  };
}

function invocation(runId: ReturnType<typeof encounterSessionId>, prompt: string): AgentInvocation {
  return {
    runId,
    prompt,
    model: 'SIMULATED-model',
    reasoningEffort: 'SIMULATED-effort',
    launcherToken: 'SIMULATED-launcher-token',
    timeoutMs: 5_000,
  };
}

function setup(adapter: SIMULATEDAgentSessionAdapter) {
  const sessionId = encounterSessionId('session:simulated-agent-lifecycle');
  const store = new MemoryBrowserSessionStore();
  const journal = EncounterSessionJournal.create({
    sessionId,
    branchId: encounterBranchId('branch:simulated-agent-lifecycle'),
    encounterState: createEncounter(referenceEncounterSetup()),
    coordinatorState: {
      requestSequence: 1,
      pendingRequest: null,
      pendingCommand: null,
      continuation: { kind: 'idle' },
      pause: null,
    },
    controllers: [],
    rng: mulberry32(948_217),
    store,
    mirror: new MemoryMirrorSink(),
  });
  return {
    sessionId,
    store,
    journal,
    lifecycle: new AgentSessionLifecycle(journal, adapter, 4),
  };
}

describe('SIMULATED agent session lifecycle', () => {
  it('cold-starts once, then resumes one persisted run-scoped session for round, room transition, and correction', async () => {
    const adapter = new SIMULATEDAgentSessionAdapter({ startIds: ['agent-session:stable'] });
    const { lifecycle, journal, sessionId, store } = setup(adapter);
    const signal = new AbortController().signal;

    expect(journal.agentSession()).toBeNull();
    await lifecycle.coldStart(invocation(sessionId, 'cold-start bootstrap'), signal);
    await lifecycle.resumeRound(invocation(sessionId, 'round:1'), signal);
    await lifecycle.resumeRoomTransition(invocation(sessionId, 'room_transition:2'), signal);
    await lifecycle.resumeCorrection(invocation(sessionId, 'correction:1'), signal);

    expect(adapter.startInvocations.map((entry) => entry.prompt)).toEqual(['cold-start bootstrap']);
    expect(adapter.resumeInvocations.map((entry) => entry.invocation.prompt)).toEqual([
      'round:1',
      'room_transition:2',
      'correction:1',
    ]);
    expect(new Set(adapter.resumeInvocations.map((entry) => entry.binding.sessionId))).toEqual(
      new Set([agentSessionId('agent-session:stable')]),
    );
    expect(store.revisions(sessionId).map((revision) => revision.transition.kind)).toEqual([
      'session_started',
      'agent_session_started',
      'agent_session_dispatched',
      'agent_session_dispatched',
      'agent_session_dispatched',
    ]);
    expect(journal.agentSession()).toMatchObject({
      cli: 'codex',
      sessionId: agentSessionId('agent-session:stable'),
      adapterVersion: 4,
      recoveryGeneration: 0,
      predecessorSessionHash: null,
      startedAtRevision: 2,
      lastDispatchedRevision: 4,
      status: 'active',
    });
    const reloadedStore = new MemoryBrowserSessionStore();
    importSavedSession(reloadedStore, exportSavedSession(store, sessionId));
    expect(EncounterSessionJournal.resume(
      sessionId,
      reloadedStore,
      new MemoryMirrorSink(),
    ).agentSession).toEqual(journal.agentSession());
  });

  it.each(['resume_not_found', 'resume_corrupt'] as const)(
    'creates and persists one visible recovery successor only for %s',
    async (classification) => {
      const adapter = new SIMULATEDAgentSessionAdapter({
        startIds: ['agent-session:failed', 'agent-session:successor'],
        resumeFailures: [new SIMULATEDResumeFailure(classification)],
      });
      const { lifecycle, journal, sessionId, store } = setup(adapter);
      const signal = new AbortController().signal;
      await lifecycle.coldStart(invocation(sessionId, 'cold-start bootstrap'), signal);

      const result = await lifecycle.resumeRound(invocation(sessionId, 'pending-round'), signal);

      const predecessorHash = sha256('agent-session:failed');
      expect(result.sessionId).toBe(agentSessionId('agent-session:successor'));
      expect(adapter.startInvocations).toHaveLength(2);
      expect(adapter.startInvocations[1]?.prompt).toContain('"format":"recovery_bootstrap"');
      expect(adapter.startInvocations[1]?.prompt).toContain(predecessorHash);
      expect(adapter.startInvocations[1]?.prompt).not.toContain('agent-session:failed');
      expect(adapter.resumeInvocations.map((entry) => entry.binding.sessionId)).toEqual([
        agentSessionId('agent-session:failed'),
        agentSessionId('agent-session:successor'),
      ]);
      const recovered = store.revisions(sessionId).find(
        (revision) => revision.transition.kind === 'agent_session_recovered',
      );
      expect(recovered?.transition).toMatchObject({
        kind: 'agent_session_recovered',
        failure: classification,
        failedBinding: {
          sessionId: agentSessionId('agent-session:failed'),
          status: 'superseded_after_resume_failure',
        },
        binding: {
          sessionId: agentSessionId('agent-session:successor'),
          recoveryGeneration: 1,
          predecessorSessionHash: predecessorHash,
          status: 'active',
        },
      });
      expect(journal.agentSession()).toMatchObject({
        sessionId: agentSessionId('agent-session:successor'),
        recoveryGeneration: 1,
        predecessorSessionHash: predecessorHash,
        status: 'active',
      });
    },
  );

  it('pauses other classified failures without silently creating a successor', async () => {
    const adapter = new SIMULATEDAgentSessionAdapter({
      startIds: ['agent-session:still-active'],
      resumeFailures: [new SIMULATEDResumeFailure('authentication')],
    });
    const { lifecycle, journal, sessionId, store } = setup(adapter);
    const signal = new AbortController().signal;
    await lifecycle.coldStart(invocation(sessionId, 'cold-start bootstrap'), signal);

    await expect(lifecycle.resumeCorrection(invocation(sessionId, 'correction'), signal))
      .rejects.toThrow('SIMULATED authentication');

    expect(adapter.startInvocations).toHaveLength(1);
    expect(store.revisions(sessionId).some(
      (revision) => revision.transition.kind === 'agent_session_recovered',
    )).toBe(false);
    expect(journal.agentSession()).toMatchObject({
      sessionId: agentSessionId('agent-session:still-active'),
      recoveryGeneration: 0,
      predecessorSessionHash: null,
      status: 'active',
    });
  });
});
