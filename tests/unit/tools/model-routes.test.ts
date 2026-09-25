import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import {
  agentSessionIdFromCli,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import { createUnboundedRoundDeadline } from '../../../src/vtt/agent-session-lifecycle';
import type { ConversationEffort } from '../../../tools/ai-dm-conversation';
import {
  guardedLunaCall,
  reconcileLunaCallLog,
  withLunaCallLog,
  type LunaCallLogEvent,
  type LunaCallLogSink,
} from '../../../tools/luna-call-log';
import {
  lunaStudyRoute,
  resolveScreenshotTimeout,
  resolveSessionBounds,
  type LunaEffort,
  type SessionBoundsInput,
} from '../../../tools/model-routes';

// Expectations are typed from the owner rulings (D890; 2026-09-24 18:58 "gpt-6-luna only") and plan §2.2 text,
// never read from the module under test.
const MIXED = 'LUNA6: a run mixing gpt-6-luna and other routes cannot give each route its own bound ' +
  '(owner 2026-09-24: only gpt-6-luna calls lose the 180 s wall); split it';

type Outcome<Value> = { readonly ok: Value } | { readonly error: string };

function outcome<Value>(run: () => Value): Outcome<Value> {
  try {
    return { ok: run() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function bounds(
  routes: SessionBoundsInput['routes'],
  path: SessionBoundsInput['path'],
  explicitTimeoutMs: number | null = null,
  explicitRoundWall: SessionBoundsInput['explicitRoundWall'] = null,
) {
  return outcome(() => resolveSessionBounds({ routes, path, explicitTimeoutMs, explicitRoundWall }));
}

function memorySink(runId: string): { readonly sink: LunaCallLogSink; readonly events: LunaCallLogEvent[] } {
  const events: LunaCallLogEvent[] = [];
  let ordinal = 0;
  return {
    events,
    sink: {
      runId,
      nextOrdinal: () => {
        ordinal += 1;
        return ordinal;
      },
      write: (event) => {
        events.push(event);
      },
    },
  };
}

function invocation(callPhase: AgentInvocation['callPhase'], timeoutMs: number | null): AgentInvocation {
  return {
    instructionSource: 'none',
    skill: null,
    runId: encounterSessionId('encounter:luna6-t1'),
    prompt: 'LUNA6 T1',
    model: 'gpt-6-luna',
    reasoningEffort: 'xhigh',
    callPhase,
    output: { kind: 'tool_driven' },
    launcherToken: '/SIMULATED/launcher.json',
    timeoutMs,
  };
}

function completedTurn(): AgentTurnResult {
  return {
    exit: 'completed',
    resumeSessionId: agentSessionIdFromCli('luna6-t1-session'),
    sessionId: null,
    finalText: 'SIMULATED',
    usage: null,
    processEvidence: null,
    partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
    engineCatalogEvidence: null,
  };
}

async function flushMicrotasks(): Promise<void> {
  for (let tick = 0; tick < 20; tick += 1) await Promise.resolve();
}

describe('LUNA6 model routes and the Luna hang guard', () => {
  it('resolves every gpt-6-luna route to the 30 min hang guard with no round wall (owner 2026-09-24)', () => {
    const lifted = { ok: { timeoutMs: 1_800_000, roundWallMs: null, bound: 'luna_hang_guard' } };
    expect([
      bounds([{ model: 'gpt-6-luna', effort: 'low' }], 'legacy'),
      bounds([{ model: 'gpt-6-luna', effort: 'medium' }], 'legacy'),
      bounds([{ model: 'gpt-6-luna', effort: 'high' }], 'dm_mode'),
      bounds([{ model: 'gpt-6-luna', effort: 'xhigh' }], 'dm_mode'),
      bounds([{ model: 'gpt-6-luna', effort: 'high' }, { model: 'gpt-6-luna', effort: 'xhigh' }], 'legacy'),
      bounds([{ model: 'gpt-6-luna', effort: 'xhigh' }], 'legacy', 1_800_000),
    ]).toEqual([lifted, lifted, lifted, lifted, lifted, lifted]);
  });

  it('keeps every non-Luna route on the legacy 120000 / 240000 timeouts and the 180000 round wall', () => {
    expect([
      bounds([{ model: 'gpt-5.6-sol', effort: 'medium' }], 'legacy'),
      bounds([{ model: 'gpt-5.6-sol', effort: 'medium' }], 'dm_mode'),
      bounds([{ model: 'gpt-5.6-luna', effort: 'low' }], 'legacy', 240_000),
      bounds([{ model: 'gpt-5.6-luna', effort: 'high' }, { model: 'gpt-5.6-sol', effort: 'high' }], 'dm_mode', 150_000, 180_000),
      bounds([{ model: 'gpt-5.6-terra', effort: 'medium' }], 'dm_mode'),
      bounds([{ model: 'qwen3:8b', effort: 'medium' }], 'legacy'),
    ]).toEqual([
      { ok: { timeoutMs: 120_000, roundWallMs: 180_000, bound: 'legacy_default' } },
      { ok: { timeoutMs: 240_000, roundWallMs: 180_000, bound: 'legacy_default' } },
      { ok: { timeoutMs: 240_000, roundWallMs: 180_000, bound: 'cli_override' } },
      { ok: { timeoutMs: 150_000, roundWallMs: 180_000, bound: 'cli_override' } },
      { ok: { timeoutMs: 240_000, roundWallMs: 180_000, bound: 'legacy_default' } },
      { ok: { timeoutMs: 120_000, roundWallMs: 180_000, bound: 'legacy_default' } },
    ]);
  });

  it('refuses a run that mixes gpt-6-luna and other routes', () => {
    expect([
      bounds([{ model: 'gpt-6-luna', effort: 'high' }, { model: 'gpt-5.6-sol', effort: 'high' }], 'legacy'),
      bounds([{ model: 'gpt-5.6-sol', effort: 'high' }, { model: 'gpt-6-luna', effort: 'xhigh' }], 'legacy'),
      bounds([{ model: 'gpt-6-luna', effort: 'high' }, { model: 'gpt-5.6-luna', effort: 'high' }], 'dm_mode'),
    ]).toEqual([{ error: MIXED }, { error: MIXED }, { error: MIXED }]);
  });

  it('refuses an explicit timeout or round wall that would censor a gpt-6-luna run', () => {
    expect([
      bounds([{ model: 'gpt-6-luna', effort: 'xhigh' }], 'legacy', 120_000),
      bounds([{ model: 'gpt-6-luna', effort: 'high' }], 'dm_mode', 3_600_000),
      bounds([{ model: 'gpt-6-luna', effort: 'xhigh' }], 'legacy', null, 180_000),
      bounds([{ model: 'gpt-6-luna', effort: 'high' }, { model: 'gpt-6-luna', effort: 'xhigh' }], 'legacy', 240_000),
      bounds([{ model: 'gpt-6-luna', effort: 'high' }], 'legacy', 1_800_000, 180_000),
    ]).toEqual([
      { error: 'LUNA6: gpt-6-luna xhigh runs uncensored (owner 2026-09-24); --timeout-ms 120000 is refused (hang guard 1800000)' },
      { error: 'LUNA6: gpt-6-luna high runs uncensored (owner 2026-09-24); --timeout-ms 3600000 is refused (hang guard 1800000)' },
      { error: 'LUNA6: gpt-6-luna xhigh runs uncensored (owner 2026-09-24); --round-wall-ms 180000 is refused (hang guard 1800000)' },
      { error: 'LUNA6: gpt-6-luna high/xhigh runs uncensored (owner 2026-09-24); --timeout-ms 240000 is refused (hang guard 1800000)' },
      { error: 'LUNA6: gpt-6-luna high runs uncensored (owner 2026-09-24); --round-wall-ms 180000 is refused (hang guard 1800000)' },
    ]);
  });

  it('effort-study Luna routes keep their stated effort on gpt-6-luna (D887 b)', () => {
    expectTypeOf<LunaEffort>().toEqualTypeOf<ConversationEffort>();
    const efforts: readonly LunaEffort[] = ['low', 'medium', 'high', 'xhigh'];
    expect(efforts.map((effort) => lunaStudyRoute(effort))).toEqual([
      { model: 'gpt-6-luna', effort: 'low' },
      { model: 'gpt-6-luna', effort: 'medium' },
      { model: 'gpt-6-luna', effort: 'high' },
      { model: 'gpt-6-luna', effort: 'xhigh' },
    ]);
  });

  it('the unbounded round deadline hands the invocation timeout to the adapter unchanged and never aborts', async () => {
    vi.useFakeTimers();
    try {
      const deadline = createUnboundedRoundDeadline();
      const guarded = invocation('initial', 1_800_000);
      const budget = deadline.dispatch(guarded);
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);
      expect({
        budget: budget.kind === 'open' ? { kind: budget.kind, timeoutMs: budget.timeoutMs } : budget,
        sameInvocation: budget.kind === 'open' && budget.invocation === guarded,
        abortedAfterADay: deadline.signal.aborted,
        acceptsCompletion: deadline.acceptsCompletion(),
        unguarded: outcome(() => deadline.dispatch(invocation('initial', null))),
      }).toEqual({
        budget: { kind: 'open', timeoutMs: 1_800_000 },
        sameInvocation: true,
        abortedAfterADay: false,
        acceptsCompletion: true,
        unguarded: { error: 'An unbounded round requires a per-call hang guard.' },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('the call log pairs dispatch and completion events by dispatch ordinal when calls overlap', async () => {
    const releases = new Map<string, (turn: AgentTurnResult) => void>();
    const inner: AgentSessionAdapter = {
      kind: 'codex',
      probe: async () => ({ present: true, version: 'SIMULATED' }),
      start: (dispatched) => new Promise<AgentTurnResult>((resolve) => {
        releases.set(dispatched.callPhase, resolve);
      }),
      resume: async () => { throw new Error('LUNA6 T1 fake adapter never resumes.'); },
      classifyFailure: () => 'unknown',
    };
    const { sink, events } = memorySink('luna-run:T1-overlap');
    const logged = withLunaCallLog(inner, sink, { cellKey: () => '1:1' });
    const signal = new AbortController().signal;
    const first = logged.start(invocation('initial', 1_800_000), signal);
    const second = logged.start(invocation('speculation', 60_000), signal);
    releases.get('speculation')?.(completedTurn());
    await second;
    releases.get('initial')?.(completedTurn());
    await first;
    expect({
      order: events.map((event) => `${event.event}:${String(event.ordinal)}`),
      calls: reconcileLunaCallLog(events.map((event) => JSON.stringify(event))).map((record) => ({
        ordinal: record.ordinal,
        callPhase: record.callPhase,
        exit: record.exit,
        boundKind: record.boundKind,
      })),
    }).toEqual({
      order: ['dispatch:1', 'dispatch:2', 'complete:2', 'complete:1'],
      calls: [
        { ordinal: 1, callPhase: 'initial', exit: 'completed', boundKind: 'hang_guard' },
        { ordinal: 2, callPhase: 'speculation', exit: 'completed', boundKind: 'speculation_window' },
      ],
    });
  });

  it('guardedLunaCall aborts at exactly 1800000 ms, logs the firing and writes one FIRED line', async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const { sink, events } = memorySink('luna-run:T1-guard');
      const handed: AbortSignal[] = [];
      let settled = false;
      let error: string | null = null;
      void guardedLunaCall(
        {
          cellKey: 'data01:1', surface: 'responses_api', dispatch: null, callPhase: 'data01_teacher',
          bootstrapKind: null, model: 'gpt-6-luna', reasoningEffort: 'xhigh',
        },
        sink,
        (signal) => new Promise<never>((_resolve, reject) => {
          handed.push(signal);
          signal.addEventListener('abort', () => reject(new Error('SIMULATED request aborted')));
        }),
      ).then(
        () => { settled = true; },
        (thrown: unknown) => {
          settled = true;
          error = thrown instanceof Error ? thrown.name : String(thrown);
        },
      );
      await vi.advanceTimersByTimeAsync(1_799_999);
      await flushMicrotasks();
      const before = settled;
      await vi.advanceTimersByTimeAsync(1);
      await flushMicrotasks();
      const after = settled;
      const firedLines = stderr.mock.calls
        .map(([chunk]) => String(chunk))
        .filter((line) => line.startsWith('[luna-hang-guard] FIRED '));
      const [record] = reconcileLunaCallLog(events.map((event) => JSON.stringify(event)));
      expect({
        before,
        after,
        error,
        // The call's own signal is the one the guard aborts (M71 hands fn a fresh, never-aborted signal).
        signalAborted: handed.length === 1 ? handed[0]?.aborted : `${String(handed.length)} calls`,
        record: record === undefined ? null : {
          exit: record.exit, hangGuardFired: record.hangGuardFired, timeoutMs: record.timeoutMs,
        },
        fired: firedLines.length,
        firedLines,
      }).toEqual({
        before: false,
        after: true,
        error: 'LunaHangGuardExpired',
        signalAborted: true,
        record: { exit: 'timed_out', hangGuardFired: true, timeoutMs: 1_800_000 },
        fired: 1,
        firedLines: [
          '[luna-hang-guard] FIRED run=luna-run:T1-guard cell=data01:1 phase=data01_teacher model=gpt-6-luna ' +
          'effort=xhigh timeoutMs=1800000 elapsedMs=1800000\n',
        ],
      });
    } finally {
      stderr.mockRestore();
      vi.useRealTimers();
    }
  });

  it('guardedLunaCall rejects at 1800000 ms and logs the firing when the call ignores its abort signal', async () => {
    // Review r1 P3: a client that ignores (or delays) the abort must not hold the call past the guard. The call below
    // never settles; the guard alone must settle it, log it and write the FIRED line at the deadline.
    vi.useFakeTimers({ now: 5_000_000 });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const { sink, events } = memorySink('luna-run:T1-deaf');
      const handed: AbortSignal[] = [];
      let settled = false;
      let error: string | null = null;
      void guardedLunaCall(
        {
          cellKey: 'data01:2', surface: 'responses_api', dispatch: null, callPhase: 'data01_teacher',
          bootstrapKind: null, model: 'gpt-6-luna', reasoningEffort: 'high',
        },
        sink,
        (signal) => {
          handed.push(signal);
          return new Promise<never>(() => undefined);
        },
      ).then(
        () => { settled = true; },
        (thrown: unknown) => {
          settled = true;
          error = thrown instanceof Error ? thrown.name : String(thrown);
        },
      );
      const signalAborted = () => (handed.length === 1 ? handed[0]?.aborted : `${String(handed.length)} calls`);
      await vi.advanceTimersByTimeAsync(1_799_999);
      await flushMicrotasks();
      const before = { settled, signalAborted: signalAborted(), events: events.map((event) => event.event) };
      await vi.advanceTimersByTimeAsync(1);
      await flushMicrotasks();
      const after = { settled, signalAborted: signalAborted(), events: events.map((event) => event.event) };
      const firedLines = stderr.mock.calls
        .map(([chunk]) => String(chunk))
        .filter((line) => line.startsWith('[luna-hang-guard] FIRED '));
      const [record] = reconcileLunaCallLog(events.map((event) => JSON.stringify(event)));
      expect({
        before,
        after,
        error,
        record: record === undefined ? null : {
          pending: record.pending, exit: record.exit, hangGuardFired: record.hangGuardFired,
          timeoutMs: record.timeoutMs, elapsedMs: record.elapsedMs, error: record.error,
        },
        firedLines,
      }).toEqual({
        before: { settled: false, signalAborted: false, events: ['dispatch'] },
        after: { settled: true, signalAborted: true, events: ['dispatch', 'complete'] },
        error: 'LunaHangGuardExpired',
        record: {
          pending: false, exit: 'timed_out', hangGuardFired: true, timeoutMs: 1_800_000, elapsedMs: 1_800_000,
          error: 'no settlement within the 1800000 ms hang guard; the call was aborted',
        },
        firedLines: [
          '[luna-hang-guard] FIRED run=luna-run:T1-deaf cell=data01:2 phase=data01_teacher model=gpt-6-luna ' +
          'effort=high timeoutMs=1800000 elapsedMs=1800000\n',
        ],
      });
    } finally {
      stderr.mockRestore();
      vi.useRealTimers();
    }
  });

  it('screenshot calls give gpt-6-luna models the hang guard and leave other models untimed', () => {
    expect([
      outcome(() => resolveScreenshotTimeout({ model: 'gpt-6-luna', effort: 'xhigh', explicitTimeoutMs: null })),
      outcome(() => resolveScreenshotTimeout({ model: 'gpt-6-luna', effort: 'low', explicitTimeoutMs: 1_800_000 })),
      outcome(() => resolveScreenshotTimeout({ model: 'gpt-6-luna', effort: 'medium', explicitTimeoutMs: 300_000 })),
      outcome(() => resolveScreenshotTimeout({ model: 'gpt-5.6-luna', effort: 'medium', explicitTimeoutMs: null })),
      outcome(() => resolveScreenshotTimeout({ model: 'gpt-5.6-sol', effort: 'high', explicitTimeoutMs: 600_000 })),
    ]).toEqual([
      { ok: 1_800_000 },
      { ok: 1_800_000 },
      { error: 'LUNA6: gpt-6-luna medium runs uncensored (owner 2026-09-24); --timeout-ms 300000 is refused (hang guard 1800000)' },
      { ok: null },
      { ok: 600_000 },
    ]);
  });

  it('reconciles call-log events and reports a dispatch without completion as pending', () => {
    const dispatch = (runId: string, ordinal: number, cellKey = '1:1') => JSON.stringify({
      schema: 'luna-call-log-v2', event: 'dispatch', runId, cellKey, ordinal, surface: 'agent_adapter',
      dispatch: 'start', callPhase: 'initial', bootstrapKind: 'cold_start', model: 'gpt-6-luna',
      reasoningEffort: 'high', timeoutMs: 1_800_000, boundKind: 'hang_guard', startedAtUnixMs: 100,
    });
    const complete = (runId: string, ordinal: number, cellKey = '1:1') => JSON.stringify({
      schema: 'luna-call-log-v2', event: 'complete', runId, cellKey, ordinal, endedAtUnixMs: 250,
      elapsedMs: 150, exit: 'completed', hangGuardFired: false, error: null, providerRequestId: null,
    });
    const summary = (lines: readonly string[]) => outcome(() => reconcileLunaCallLog(lines).map((record) => ({
      runId: record.runId, ordinal: record.ordinal, pending: record.pending, exit: record.exit,
      elapsedMs: record.elapsedMs,
    })));
    expect([
      summary([dispatch('run-b', 1), dispatch('run-b', 2), dispatch('run-a', 1), complete('run-a', 1),
        complete('run-b', 1), '']),
      summary([complete('run-a', 1)]),
      summary([dispatch('run-a', 1), dispatch('run-a', 1)]),
      summary([dispatch('run-a', 1), complete('run-a', 1, '2:1')]),
    ]).toEqual([
      {
        ok: [
          { runId: 'run-a', ordinal: 1, pending: false, exit: 'completed', elapsedMs: 150 },
          { runId: 'run-b', ordinal: 1, pending: false, exit: 'completed', elapsedMs: 150 },
          { runId: 'run-b', ordinal: 2, pending: true, exit: null, elapsedMs: null },
        ],
      },
      { error: 'Call log completes run run-a ordinal 1 with no dispatch.' },
      { error: 'Call log repeats the dispatch of run run-a ordinal 1.' },
      { error: 'Call log completes run run-a ordinal 1 in cell 2:1, dispatched in 1:1.' },
    ]);
  });
});
