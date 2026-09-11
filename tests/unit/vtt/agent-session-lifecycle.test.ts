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
  engineDispatchId,
  turnInputTotal,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentInvocation,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import {
  type AgentDispatchDeadline,
  AgentSessionLifecycle,
  CONTEXT_ROLLOVER_POLICY,
  createConversationRoundDeadline,
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

const COMPLETED_EVIDENCE = {
  processEvidence: null,
  engineCatalogEvidence: null,
  partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
} as const;

function invocation(runId: ReturnType<typeof encounterSessionId>, prompt: string): AgentInvocation {
  return {
    instructionSource: 'none',
    skill: null,
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

function openDeadline() {
  return createConversationRoundDeadline(60_000, 0, () => 0);
}

type DeadlineFactory = typeof createConversationRoundDeadline;

async function mutationReceipt<T>(
  name: string,
  baseline: T,
  mutant: T,
  prove: (implementation: T) => Promise<void>,
): Promise<void> {
  let implementation = baseline;
  const originalHash = sha256(String(implementation));
  try {
    implementation = mutant;
    console.info(`[MUTATION_RECEIPT] ${name} APPLIED`);
    expect(sha256(String(implementation))).not.toBe(originalHash);
    console.info(`[MUTATION_RECEIPT] ${name} PROVED_APPLIED`);
    let failed = false;
    try {
      await prove(implementation);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    console.info(`[MUTATION_RECEIPT] ${name} FAILED_AS_EXPECTED`);
  } finally {
    implementation = baseline;
  }
  expect(sha256(String(implementation))).toBe(originalHash);
  console.info(`[MUTATION_RECEIPT] ${name} REVERTED hash=${originalHash}`);
  await prove(implementation);
  console.info(`[MUTATION_RECEIPT] ${name} BASELINE_PASSED hash=${originalHash}`);
}

function ceilingDeadlineFactory(
  budgetMs: number,
  startedAtMs: number,
  now: () => number,
): AgentDispatchDeadline {
  const signal = new AbortController().signal;
  return {
    signal,
    dispatch(candidate) {
      const timeoutMs = Math.min(candidate.timeoutMs ?? budgetMs, Math.ceil(startedAtMs + budgetMs - now()));
      return timeoutMs < 1
        ? { kind: 'exhausted' }
        : { kind: 'open', timeoutMs, invocation: { ...candidate, timeoutMs } };
    },
    acceptsCompletion: () => startedAtMs + budgetMs - now() > 0,
  };
}

function freshBudgetDeadlineFactory(
  budgetMs: number,
  _startedAtMs: number,
  _now: () => number,
): AgentDispatchDeadline {
  const signal = new AbortController().signal;
  return {
    signal,
    dispatch(candidate) {
      const timeoutMs = Math.min(candidate.timeoutMs ?? budgetMs, budgetMs);
      return { kind: 'open', timeoutMs, invocation: { ...candidate, timeoutMs } };
    },
    acceptsCompletion: () => true,
  };
}

describe('SIMULATED agent session lifecycle', () => {
  it.each(['cancelled', 'timed_out', 'infrastructure_failed'] as const)(
    'keeps an observed reusable identity unbound after a %s cold start',
    async (exit) => {
      const observed = agentSessionId(`agent-session:observed-${exit}`);
      const partial = {
        status: 'partial' as const, decodedEventCount: 1, finalTextFragment: 'partial',
        observedUsage: null, stagedInvocationIds: ['staged-1'],
      };
      const result: AgentTurnResult = exit === 'cancelled'
        ? { resumeSessionId: observed, sessionId: null, finalText: 'partial', usage: null, exit, cancellationReason: 'abort_signal', processEvidence: null, engineCatalogEvidence: null, partialResultEvidence: partial }
        : exit === 'timed_out'
          ? { resumeSessionId: observed, sessionId: null, finalText: 'partial', usage: null, exit, timeoutMs: 5_000, processEvidence: null, engineCatalogEvidence: null, partialResultEvidence: partial }
          : { resumeSessionId: observed, sessionId: null, finalText: 'partial', usage: null, exit, component: 'engine_mcp_startup', failureReason: 'required startup failed', processEvidence: null, engineCatalogEvidence: null, partialResultEvidence: partial };
      const adapter: AgentSessionAdapter = {
        kind: 'pi', probe: async () => ({ present: true, version: 'SIMULATED' }),
        start: async () => result, resume: async () => result, classifyFailure: () => 'unknown',
      };
      const first = setup(adapter);
      await expect(first.lifecycle.coldStart(invocation(first.sessionId, 'cold'), openDeadline()))
        .resolves.toEqual({ kind: 'unbound', turn: result });
      expect(first.journal.agentSession()).toBeNull();
      const round = setup(adapter);
      await expect(round.lifecycle.coldStartRound(invocation(round.sessionId, 'round'), openDeadline()))
        .resolves.toEqual({ kind: 'unbound', turn: result });
      expect(round.journal.agentSession()).toBeNull();
      expect(round.store.revisions(round.sessionId).map((revision) => revision.transition.kind))
        .toEqual(['session_started']);
    },
  );

  it.each(['coldStart', 'coldStartRound'] as const)(
    'returns late completed evidence from %s without binding it',
    async (method) => {
      let acceptsCompletion = true;
      const result: AgentTurnResult = {
        resumeSessionId: agentSessionId('agent-session:late-completed-evidence'),
        sessionId: 'rollout:late-completed-evidence',
        finalText: 'late completed evidence',
        usage: null,
        exit: 'completed',
        ...COMPLETED_EVIDENCE,
      };
      const adapter: AgentSessionAdapter = {
        kind: 'codex',
        probe: async () => ({ present: true, version: 'SIMULATED' }),
        start: async () => {
          acceptsCompletion = false;
          return result;
        },
        resume: async () => { throw new Error('Late cold-start fixture unexpectedly resumed.'); },
        classifyFailure: () => 'unknown',
      };
      const { lifecycle, journal, sessionId, store } = setup(adapter);
      const deadline: AgentDispatchDeadline = {
        signal: new AbortController().signal,
        dispatch: (candidate) => ({ kind: 'open', timeoutMs: 100, invocation: candidate }),
        acceptsCompletion: () => acceptsCompletion,
      };

      await expect(lifecycle[method](invocation(sessionId, 'late completion'), deadline))
        .resolves.toEqual({ kind: 'expired', turn: result });
      expect(journal.agentSession()).toBeNull();
      expect(store.revisions(sessionId).map((revision) => revision.transition.kind))
        .toEqual(['session_started']);
    },
  );

  it('fractional remainder floors and below one does not spawn', async () => {
    const prove = async (factory: DeadlineFactory): Promise<void> => {
      let now = 98.2;
      const open = factory(100, 0, () => now).dispatch(
        invocation(encounterSessionId('session:fractional-open'), 'fractional open'),
      );
      expect(open).toMatchObject({ kind: 'open', timeoutMs: 1, invocation: { timeoutMs: 1 } });
      now = 99.2;
      const exhausted = factory(100, 0, () => now).dispatch(
        invocation(encounterSessionId('session:fractional-exhausted'), 'fractional exhausted'),
      );
      expect(exhausted).toEqual({ kind: 'exhausted' });
    };

    await mutationReceipt(
      'fractional remainder floors and below one does not spawn',
      createConversationRoundDeadline,
      ceilingDeadlineFactory,
      prove,
    );
  });

  it('same deadline reaches recovery', async () => {
    const prove = async (factory: DeadlineFactory): Promise<void> => {
      let now = 0;
      const timeouts: number[] = [];
      let starts = 0;
      const adapter: AgentSessionAdapter = {
        kind: 'codex',
        probe: async () => ({ present: true, version: 'SIMULATED' }),
        start: async (candidate) => {
          starts += 1;
          timeouts.push(candidate.timeoutMs ?? -1);
          return {
            resumeSessionId: agentSessionId(`agent-session:deadline-${String(starts)}`),
            sessionId: null,
            finalText: '',
            usage: null,
            exit: 'completed',
            ...COMPLETED_EVIDENCE,
          };
        },
        resume: async (_binding, candidate) => {
          timeouts.push(candidate.timeoutMs ?? -1);
          now = 40;
          throw new SIMULATEDResumeFailure('resume_not_found');
        },
        classifyFailure: (error) => error instanceof SIMULATEDResumeFailure
          ? error.classification
          : 'unknown',
      };
      const { lifecycle, sessionId } = setup(adapter);
      await lifecycle.coldStart(invocation(sessionId, 'bootstrap'), factory(1_000, 0, () => now));
      await lifecycle.resumeRound(invocation(sessionId, 'recover'), factory(100, 0, () => now));
      expect(timeouts).toEqual([1_000, 100, 60]);
    };

    await mutationReceipt(
      'same deadline reaches recovery',
      createConversationRoundDeadline,
      freshBudgetDeadlineFactory,
      prove,
    );
  });
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

    await expect(lifecycle.coldStart(realInvocation, openDeadline()))
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
          ...COMPLETED_EVIDENCE,
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
          ...COMPLETED_EVIDENCE,
        };
      },
      classifyFailure: () => 'unknown',
    };
    const policy = { kind: 'measured', threshold, evidence: 'SIMULATED boundary' } as const;
    const { lifecycle, journal, sessionId } = setup(adapter, policy);
    const deadline = openDeadline();

    await lifecycle.coldStartRound(invocation(sessionId, 'first'), deadline);
    await lifecycle.resumeRound(invocation(sessionId, 'threshold call'), deadline);
    expect(adapter.resumes).toHaveLength(1);
    expect(journal.agentSession()?.sessionId).toBe(agentSessionId('agent-session:threshold-base'));

    const rolled = await lifecycle.resumeRound(invocation(sessionId, 'post-threshold call'), deadline);
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
        ...COMPLETED_EVIDENCE,
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
        ...COMPLETED_EVIDENCE,
      }),
      classifyFailure: () => 'unknown',
    };
    const { lifecycle, journal, sessionId } = setup(adapter);
    const deadline = openDeadline();

    await lifecycle.coldStartRound(invocation(sessionId, 'first'), deadline);
    await lifecycle.resumeCorrection({ ...invocation(sessionId, 'second'), callPhase: 'correction' }, deadline);

    expect(journal.agentSession()?.callUsage).toEqual([
      { turnInputTotal: 190320, contextInputTokens: 101, modelContextWindow: 258400, cachedInput: 31, output: 17, reasoning: 7, callPhase: 'initial', ordinal: 1 },
      { turnInputTotal: 556770, contextInputTokens: 203, modelContextWindow: 258400, cachedInput: 41, output: 29, reasoning: 11, callPhase: 'correction', ordinal: 2 },
    ]);
    expect(journal.agentSession()?.currentContextTokens).toBe(203);
  });

  it('cold-starts once, then resumes one persisted run-scoped session for round, room transition, and correction', async () => {
    const adapter = new SIMULATEDAgentSessionAdapter({ startIds: ['agent-session:stable'] });
    const { lifecycle, journal, sessionId, store } = setup(adapter);
    const deadline = openDeadline();

    expect(journal.agentSession()).toBeNull();
    await lifecycle.coldStart(invocation(sessionId, 'cold-start bootstrap'), deadline);
    await lifecycle.resumeRound(invocation(sessionId, 'round:1'), deadline);
    await lifecycle.resumeRoomTransition(invocation(sessionId, 'room_transition:2'), deadline);
    await lifecycle.resumeCorrection(invocation(sessionId, 'correction:1'), deadline);

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
      const deadline = openDeadline();
      await lifecycle.coldStart(invocation(sessionId, 'cold-start bootstrap'), deadline);

      const result = await lifecycle.resumeRound({
        ...invocation(sessionId, 'pending-round'),
        launcherToken: 'SIMULATED-delta-launcher-token',
        recoveryLauncherToken: 'SIMULATED-full-launcher-token',
      }, deadline);

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

  it('journals an incomplete recovery dispatch without replacing the predecessor binding', async () => {
    const failedRecovery: AgentTurnResult = {
      exit: 'timed_out', resumeSessionId: agentSessionId('agent-session:observed-recovery'),
      sessionId: null, finalText: 'partial recovery', usage: null, timeoutMs: 5_000,
      processEvidence: null, engineCatalogEvidence: null,
      partialResultEvidence: { status: 'partial', decodedEventCount: 1, finalTextFragment: 'partial recovery', observedUsage: null, stagedInvocationIds: [] },
    };
    let starts = 0;
    const adapter: AgentSessionAdapter = {
      kind: 'codex',
      probe: async () => ({ present: true, version: 'SIMULATED' }),
      start: async () => {
        starts += 1;
        return starts === 1 ? {
          exit: 'completed', resumeSessionId: agentSessionId('agent-session:recovery-predecessor'),
          sessionId: null, finalText: 'complete', usage: null, ...COMPLETED_EVIDENCE,
        } : failedRecovery;
      },
      resume: async () => { throw new SIMULATEDResumeFailure('resume_not_found'); },
      classifyFailure: (error) => error instanceof SIMULATEDResumeFailure ? error.classification : 'unknown',
    };
    const { lifecycle, journal, sessionId, store } = setup(adapter);
    await lifecycle.coldStart(invocation(sessionId, 'cold'), openDeadline());
    const recoveryDispatchId = engineDispatchId('engine-dispatch:recovery-failure-0001');
    const recovered = await lifecycle.resumeRound({
      ...invocation(sessionId, 'resume'), recoveryEngineDispatchId: recoveryDispatchId,
    }, openDeadline());

    expect(recovered).toEqual(failedRecovery);
    expect(journal.agentSession()?.sessionId).toBe(agentSessionId('agent-session:recovery-predecessor'));
    expect(store.revisions(sessionId).at(-1)?.transition).toEqual({
      kind: 'agent_session_recovery_failed',
      predecessorSessionHash: sha256('agent-session:recovery-predecessor'),
      dispatchId: recoveryDispatchId,
      exit: 'timed_out',
    });
  });

  it('pauses other classified failures without silently creating a successor', async () => {
    const adapter = new SIMULATEDAgentSessionAdapter({
      startIds: ['agent-session:still-active'],
      resumeFailures: [new SIMULATEDResumeFailure('authentication')],
    });
    const { lifecycle, journal, sessionId, store } = setup(adapter);
    const deadline = openDeadline();
    await lifecycle.coldStart(invocation(sessionId, 'cold-start bootstrap'), deadline);

    await expect(lifecycle.resumeCorrection(invocation(sessionId, 'correction'), deadline))
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
