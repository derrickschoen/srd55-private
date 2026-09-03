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
  measuredContextRolloverThreshold,
  contextTokenCount,
  turnInputTotal,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentInvocation,
} from '../../../src/vtt/agent-session';
import {
  AgentSessionLifecycle,
  CONTEXT_ROLLOVER_POLICY,
  shouldRollOver,
  UnmeasuredContextRolloverPolicyError,
} from '../../../src/vtt/agent-session-lifecycle';
import { referenceEncounterSetup } from '../../../src/vtt/reference-encounter';
import {
  EncounterSessionJournal,
  exportSavedSession,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import {
  SIMULATEDAgentSessionAdapter,
  SIMULATEDResumeFailure,
} from '../../fixtures/simulated-agent-session-adapter';

function invocation(runId: ReturnType<typeof encounterSessionId>, prompt: string): AgentInvocation {
  return {
    runId,
    prompt,
    model: 'SIMULATED-model',
    reasoningEffort: 'SIMULATED-effort',
    sessionProfile: 'test',
    callPhase: 'initial',
    output: { kind: 'tool_driven' },
    launcherToken: 'SIMULATED-launcher-token',
    recoveryLauncherToken: 'SIMULATED-full-launcher-token',
    freshSessionContext: {
      knowledgeBaseBundleHash: sha256('SIMULATED root+tactics'),
      startupInstructions: 'SIMULATED root\n\nSIMULATED tactics',
    },
    timeoutMs: 5_000,
  };
}

function setup(adapter: AgentSessionAdapter, policy = CONTEXT_ROLLOVER_POLICY) {
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
    lifecycle: new AgentSessionLifecycle(journal, adapter, 4, policy),
  };
}

describe('SIMULATED agent session lifecycle', () => {
  it('rollover threshold is measured', () => {
    expect(CONTEXT_ROLLOVER_POLICY).toEqual({
      kind: 'measured',
      threshold: 160000,
      evidence: 'supervisor 2026-09-03: 13392 per-call samples / 1083 rollouts; median 29102 p90 46093 p99 86762 max 238731; window 258400',
    });
  });

  it('uses >= at the measured rollover boundary (mutation: > instead of >=)', () => {
    const threshold = measuredContextRolloverThreshold(100_000);
    const policy = { kind: 'measured', threshold, evidence: 'SIMULATED measurement' } as const;

    expect(shouldRollOver(contextTokenCount(99_999), policy)).toBe(false);
    expect(shouldRollOver(contextTokenCount(100_000), policy)).toBe(true);
  });

  it('rejects an unmeasured rollover policy for startup outside tests and arena', async () => {
    const adapter = new SIMULATEDAgentSessionAdapter({ startIds: ['must-not-start'] });
    const { journal, sessionId } = setup(adapter);
    const lifecycle = new AgentSessionLifecycle(journal, adapter, 4, { kind: 'unmeasured' });
    const { sessionProfile: _testProfile, ...realInvocation } = invocation(sessionId, 'real startup');

    await expect(lifecycle.coldStart(realInvocation, new AbortController().signal))
      .rejects.toBeInstanceOf(UnmeasuredContextRolloverPolicyError);
    expect(adapter.startInvocations).toEqual([]);
  });

  it('compares rollover against per-call context, never the turn total (mutation: compare turnInputTotal)', async () => {
    const threshold = measuredContextRolloverThreshold(1_000);
    const usages = [
      { turnTotal: 190_320, contextInput: 999 },
      { turnTotal: 556_770, contextInput: 1_000 },
      { turnTotal: 73, contextInput: 73 },
    ];
    const startIds = ['agent-session:threshold-base', 'agent-session:threshold-successor'];
    const adapter: AgentSessionAdapter & {
      readonly starts: AgentInvocation[];
      readonly resumes: AgentSessionBinding[];
    } = {
      kind: 'codex',
      starts: [],
      resumes: [],
      probe: async () => ({ present: true, version: 'SIMULATED' }),
      start: async function(startInvocation) {
        this.starts.push(startInvocation);
        const sessionId = startIds.shift();
        const usage = usages.shift();
        if (sessionId === undefined || usage === undefined) throw new Error('SIMULATED start exhausted.');
        return {
          resumeSessionId: agentSessionId(sessionId), sessionId: null, finalText: '', exit: 'completed',
          usage: {
            turnInputTotal: turnInputTotal(usage.turnTotal),
            contextInputTokens: contextTokenCount(usage.contextInput),
            modelContextWindow: contextTokenCount(258_400),
            cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0,
          },
        };
      },
      resume: async function(binding) {
        this.resumes.push(binding);
        const usage = usages.shift();
        if (usage === undefined) throw new Error('SIMULATED resume exhausted.');
        return {
          resumeSessionId: binding.sessionId, sessionId: null, finalText: '', exit: 'completed',
          usage: {
            turnInputTotal: turnInputTotal(usage.turnTotal),
            contextInputTokens: contextTokenCount(usage.contextInput),
            modelContextWindow: contextTokenCount(258_400),
            cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0,
          },
        };
      },
      classifyFailure: () => 'unknown',
    };
    const policy = { kind: 'measured', threshold, evidence: 'SIMULATED boundary' } as const;
    const { lifecycle, journal, sessionId } = setup(adapter, policy);
    const signal = new AbortController().signal;

    await lifecycle.coldStartRound(invocation(sessionId, 'first'), signal);
    await lifecycle.resumeRound(invocation(sessionId, 'threshold call'), signal);
    expect(adapter.resumes).toHaveLength(1);
    expect(journal.agentSession()?.sessionId).toBe(agentSessionId('agent-session:threshold-base'));

    const rolled = await lifecycle.resumeRound(invocation(sessionId, 'post-threshold call'), signal);
    expect(rolled.resumeSessionId).toBe(agentSessionId('agent-session:threshold-successor'));
    expect(adapter.resumes).toHaveLength(1);
    expect(adapter.starts[1]?.bootstrap).toMatchObject({
      kind: 'context_rollover',
      knowledgeBaseBundleHash: sha256('SIMULATED root+tactics'),
      stateDelivery: 'full_engine_context',
    });
    expect(adapter.starts[1]?.instructions).toContain('[SESSION_DIGEST]');
    expect(adapter.starts[1]?.instructions).toContain('[FULL_ENGINE_CONTEXT]');
    expect(adapter.starts[1]?.launcherToken).toBe('SIMULATED-full-launcher-token');
    expect(journal.agentSession()).toMatchObject({
      sessionId: agentSessionId('agent-session:threshold-successor'),
      generation: 1,
      rolloverTriggerCount: 1,
      measuredRolloverThreshold: 1_000,
    });
  });

  it('records each completed lifecycle call before aggregate consumers can sum it', async () => {
    const inputs = [
      { turnTotal: 190_320, contextInput: 101 },
      { turnTotal: 556_770, contextInput: 203 },
    ];
    const adapter: AgentSessionAdapter = {
      kind: 'codex',
      probe: async () => ({ present: true, version: 'SIMULATED' }),
      start: async () => ({
        resumeSessionId: agentSessionId('agent-session:usage'),
        sessionId: null,
        finalText: '',
        usage: (() => {
          const usage = inputs.shift();
          if (usage === undefined) throw new Error('SIMULATED usage exhausted.');
          return {
            turnInputTotal: turnInputTotal(usage.turnTotal),
            contextInputTokens: contextTokenCount(usage.contextInput),
            modelContextWindow: contextTokenCount(258_400),
            cachedInputTokens: 31, outputTokens: 17, reasoningTokens: 7,
          };
        })(),
        exit: 'completed',
      }),
      resume: async (binding) => ({
        resumeSessionId: binding.sessionId,
        sessionId: null,
        finalText: '',
        usage: (() => {
          const usage = inputs.shift();
          if (usage === undefined) throw new Error('SIMULATED usage exhausted.');
          return {
            turnInputTotal: turnInputTotal(usage.turnTotal),
            contextInputTokens: contextTokenCount(usage.contextInput),
            modelContextWindow: contextTokenCount(258_400),
            cachedInputTokens: 41, outputTokens: 29, reasoningTokens: 11,
          };
        })(),
        exit: 'completed',
      }),
      classifyFailure: () => 'unknown',
    };
    const { lifecycle, journal, sessionId } = setup(adapter);
    const signal = new AbortController().signal;

    await lifecycle.coldStartRound(invocation(sessionId, 'first'), signal);
    await lifecycle.resumeCorrection({ ...invocation(sessionId, 'second'), callPhase: 'correction' }, signal);

    expect(journal.agentSession()?.callUsage).toEqual([
      { turnInputTotal: 190320, contextInputTokens: 101, modelContextWindow: 258400, cachedInput: 31, output: 17, reasoning: 7, callPhase: 'initial', ordinal: 1 },
      { turnInputTotal: 556770, contextInputTokens: 203, modelContextWindow: 258400, cachedInput: 41, output: 29, reasoning: 11, callPhase: 'correction', ordinal: 2 },
    ]);
    expect(journal.agentSession()?.currentContextTokens).toBe(203);
  });

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
      generation: 0,
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

      const result = await lifecycle.resumeRound({
        ...invocation(sessionId, 'pending-round'),
        launcherToken: 'SIMULATED-delta-launcher-token',
        recoveryLauncherToken: 'SIMULATED-full-launcher-token',
      }, signal);

      const predecessorHash = sha256('agent-session:failed');
      expect(result.resumeSessionId).toBe(agentSessionId('agent-session:successor'));
      expect(result.sessionId).toBeNull();
      expect(adapter.startInvocations).toHaveLength(2);
      expect(adapter.startInvocations[1]?.bootstrap).toMatchObject({
        kind: 'resume_recovery', predecessorSessionHash: predecessorHash,
        stateDelivery: 'full_engine_context',
      });
      expect(adapter.startInvocations[1]?.instructions).toContain('[SESSION_DIGEST]');
      expect(adapter.startInvocations[1]?.prompt).not.toContain('agent-session:failed');
      expect(adapter.startInvocations[1]?.prompt).toContain('[RECOVERY_DISPATCH]\npending-round');
      expect(adapter.startInvocations[1]?.launcherToken).toBe('SIMULATED-full-launcher-token');
      expect(adapter.resumeInvocations.map((entry) => entry.binding.sessionId)).toEqual([
        agentSessionId('agent-session:failed'),
      ]);
      expect(adapter.resumeInvocations.map((entry) => entry.invocation.launcherToken)).toEqual([
        'SIMULATED-delta-launcher-token',
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
          generation: 1,
          predecessorSessionHash: predecessorHash,
          status: 'active',
        },
      });
      expect(journal.agentSession()).toMatchObject({
        sessionId: agentSessionId('agent-session:successor'),
        generation: 1,
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
      generation: 0,
      predecessorSessionHash: null,
      status: 'active',
    });
  });
});
