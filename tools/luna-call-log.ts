/**
 * LUNA6 call log (`luna-call-log-v2`, plan §2.4): every gpt-6-luna call writes a `dispatch` event before it is
 * delegated and a `complete` event when it returns or throws, joined by a dispatch ordinal. The log is JSONL,
 * append-only and written synchronously, so a crash keeps every event written before it.
 *
 * Owner rulings: D890 (a) keeps a 30 min per-call hang guard, logged whenever it fires; the owner's answer of
 * 2026-09-24 18:58 limits the lift, and therefore this log, to gpt-6-luna calls.
 */
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import type {
  AgentInvocation,
  AgentSessionAdapter,
  AgentTurnResult,
} from '../src/vtt/agent-session';
import { LUNA_HANG_GUARD_MS } from './model-routes';

export const LUNA_CALL_LOG_SCHEMA = 'luna-call-log-v2' as const;

export type LunaCallSurface = 'agent_adapter' | 'screenshot_cli' | 'responses_api';
export type LunaCallDispatchKind = 'start' | 'resume';
export type LunaCallBoundKind = 'hang_guard' | 'speculation_window' | 'shorter_than_guard';
/** An agent adapter's own exit, a CLI or request that failed without timing out, or a thrown call. */
export type LunaCallExit = AgentTurnResult['exit'] | 'failed' | 'thrown';

export interface LunaCallDispatchMeta {
  readonly cellKey: string;
  readonly surface: LunaCallSurface;
  readonly dispatch: LunaCallDispatchKind | null;
  readonly callPhase: string;
  readonly bootstrapKind: string | null;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly timeoutMs: number;
}

export interface LunaCallDispatchEvent extends LunaCallDispatchMeta {
  readonly schema: typeof LUNA_CALL_LOG_SCHEMA;
  readonly event: 'dispatch';
  readonly runId: string;
  readonly ordinal: number;
  readonly boundKind: LunaCallBoundKind;
  readonly startedAtUnixMs: number;
}

export interface LunaCallCompletion {
  readonly endedAtUnixMs: number;
  readonly elapsedMs: number;
  readonly exit: LunaCallExit;
  readonly hangGuardFired: boolean;
  readonly error: string | null;
  readonly providerRequestId: string | null;
}

export interface LunaCallCompleteEvent extends LunaCallCompletion {
  readonly schema: typeof LUNA_CALL_LOG_SCHEMA;
  readonly event: 'complete';
  readonly runId: string;
  readonly cellKey: string;
  readonly ordinal: number;
}

export type LunaCallLogEvent = LunaCallDispatchEvent | LunaCallCompleteEvent;

type DispatchFields = Omit<LunaCallDispatchEvent, 'schema' | 'event'>;
type NullCompletion = { readonly [Key in keyof LunaCallCompletion]: null };

/** One call, joined from its two events; `pending` is a dispatch that never completed (crash evidence). */
export type LunaCallRecord =
  | (DispatchFields & LunaCallCompletion & { readonly pending: false })
  | (DispatchFields & NullCompletion & { readonly pending: true });

export interface LunaCallLogSink {
  readonly runId: string;
  /** Assigns the next dispatch ordinal. Called before the call is delegated. */
  nextOrdinal(): number;
  write(event: LunaCallLogEvent): void;
}

export function lunaCallLogPath(outPath: string): string {
  return `${outPath}.luna-calls.jsonl`;
}

/** A synchronous, append-only file sink. Each sink is one run: its own run id and its own ordinal counter. */
export function lunaCallLogSink(path: string, runId = `luna-run:${randomUUID()}`): LunaCallLogSink {
  let ordinal = 0;
  return {
    runId,
    nextOrdinal: () => {
      ordinal += 1;
      return ordinal;
    },
    write: (event) => {
      appendFileSync(path, `${JSON.stringify(event)}\n`, 'utf8');
    },
  };
}

export function lunaCallBoundKind(timeoutMs: number, callPhase: string): LunaCallBoundKind {
  if (timeoutMs === LUNA_HANG_GUARD_MS) return 'hang_guard';
  return callPhase === 'speculation' || callPhase === 'speculation_recalculation'
    ? 'speculation_window'
    : 'shorter_than_guard';
}

export function lunaHangGuardFiredLine(
  runId: string,
  meta: LunaCallDispatchMeta,
  elapsedMs: number,
): string {
  return `[luna-hang-guard] FIRED run=${runId} cell=${meta.cellKey} phase=${meta.callPhase} ` +
    `model=${meta.model} effort=${meta.reasoningEffort} timeoutMs=${String(meta.timeoutMs)} ` +
    `elapsedMs=${String(elapsedMs)}\n`;
}

export interface LunaCallOutcome {
  readonly exit: LunaCallExit;
  readonly error?: string | null;
  readonly providerRequestId?: string | null;
}

export interface LunaCallInFlight {
  readonly ordinal: number;
  readonly boundKind: LunaCallBoundKind;
  complete(outcome: LunaCallOutcome): LunaCallCompleteEvent;
}

/** Writes the dispatch event and returns the handle that writes the completion. */
export function beginLunaCall(sink: LunaCallLogSink, meta: LunaCallDispatchMeta): LunaCallInFlight {
  if (!Number.isSafeInteger(meta.timeoutMs) || meta.timeoutMs < 1) {
    throw new RangeError('A logged gpt-6-luna call requires a positive per-call timeout.');
  }
  const ordinal = sink.nextOrdinal();
  const boundKind = lunaCallBoundKind(meta.timeoutMs, meta.callPhase);
  const startedAtUnixMs = Date.now();
  sink.write({
    schema: LUNA_CALL_LOG_SCHEMA,
    event: 'dispatch',
    runId: sink.runId,
    cellKey: meta.cellKey,
    ordinal,
    surface: meta.surface,
    dispatch: meta.dispatch,
    callPhase: meta.callPhase,
    bootstrapKind: meta.bootstrapKind,
    model: meta.model,
    reasoningEffort: meta.reasoningEffort,
    timeoutMs: meta.timeoutMs,
    boundKind,
    startedAtUnixMs,
  });
  let completed = false;
  return {
    ordinal,
    boundKind,
    complete(outcome) {
      if (completed) throw new Error(`gpt-6-luna call ${String(ordinal)} of ${sink.runId} completed twice.`);
      completed = true;
      const endedAtUnixMs = Date.now();
      const elapsedMs = endedAtUnixMs - startedAtUnixMs;
      const hangGuardFired = outcome.exit === 'timed_out' && boundKind === 'hang_guard';
      const event: LunaCallCompleteEvent = {
        schema: LUNA_CALL_LOG_SCHEMA,
        event: 'complete',
        runId: sink.runId,
        cellKey: meta.cellKey,
        ordinal,
        endedAtUnixMs,
        elapsedMs,
        exit: outcome.exit,
        hangGuardFired,
        error: outcome.error ?? null,
        providerRequestId: outcome.providerRequestId ?? null,
      };
      sink.write(event);
      if (hangGuardFired) {
        process.stderr.write(lunaHangGuardFiredLine(sink.runId, meta, elapsedMs));
      }
      return event;
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function turnError(turn: AgentTurnResult): string | null {
  switch (turn.exit) {
    case 'completed': return null;
    case 'cancelled': return turn.cancellationReason;
    case 'timed_out': return `timed out after ${String(turn.timeoutMs)} ms`;
    case 'infrastructure_failed': return turn.failureReason;
  }
}

export interface LunaCallLogContext {
  /** The cell a call belongs to, read at dispatch: the scheduled cell key, or the runner's `<room>:<round>`. */
  readonly cellKey: () => string;
}

/**
 * Decorates an agent adapter so every start and resume is logged at the adapter boundary, where the real codex
 * adapter hands `invocation.timeoutMs` to its process runner's kill timer.
 */
export function withLunaCallLog(
  inner: AgentSessionAdapter,
  sink: LunaCallLogSink,
  context: LunaCallLogContext,
): AgentSessionAdapter {
  const logged = async (
    dispatch: LunaCallDispatchKind,
    invocation: AgentInvocation,
    call: () => Promise<AgentTurnResult>,
  ): Promise<AgentTurnResult> => {
    if (invocation.timeoutMs === null) {
      throw new RangeError('A lifted gpt-6-luna call reached its adapter without a per-call hang guard.');
    }
    const meta: LunaCallDispatchMeta = {
      cellKey: context.cellKey(),
      surface: 'agent_adapter',
      dispatch,
      callPhase: invocation.callPhase,
      bootstrapKind: invocation.bootstrap?.kind ?? null,
      model: invocation.model,
      reasoningEffort: invocation.reasoningEffort,
      timeoutMs: invocation.timeoutMs,
    };
    const inFlight = beginLunaCall(sink, meta);
    try {
      const turn = await call();
      inFlight.complete({ exit: turn.exit, error: turnError(turn) });
      return turn;
    } catch (error) {
      inFlight.complete({ exit: 'thrown', error: errorMessage(error) });
      throw error;
    }
  };
  return {
    kind: inner.kind,
    probe: () => inner.probe(),
    start: (invocation, signal) => logged('start', invocation, () => inner.start(invocation, signal)),
    resume: (binding, invocation, signal) =>
      logged('resume', invocation, () => inner.resume(binding, invocation, signal)),
    classifyFailure: (error) => inner.classifyFailure(error),
  };
}

export class LunaHangGuardExpired extends Error {
  override readonly name = 'LunaHangGuardExpired' as const;

  constructor(readonly record: LunaCallCompleteEvent) {
    super(`gpt-6-luna call ${String(record.ordinal)} of ${record.runId} was aborted by its per-call guard ` +
      `after ${String(record.elapsedMs)} ms.`);
  }
}

export interface GuardedLunaCallMeta extends Omit<LunaCallDispatchMeta, 'timeoutMs'> {
  /** Defaults to the 30 min hang guard; DATA-01 keeps the default (plan §7). */
  readonly timeoutMs?: number;
}

export interface GuardedLunaCallOptions<Value> {
  readonly providerRequestId?: (value: Value) => string | null;
}

type GuardedOutcome<Value> =
  | { readonly kind: 'value'; readonly value: Value }
  | { readonly kind: 'error'; readonly error: unknown }
  | { readonly kind: 'guard_fired' };

/**
 * The hang guard for callers that are not agent adapters (DATA-01's Responses client, plan §7): logs the dispatch,
 * arms an abort at the guard, calls `fn` with that abort signal and races `fn` against the guard. When the guard
 * fires first, the completion is `timed_out`, the FIRED line is written, and `LunaHangGuardExpired` is thrown at the
 * deadline whether or not `fn` honours the abort (review r1 P3): a client that ignores or delays its signal cannot
 * hold the call past the guard. `fn`'s later settlement, if any, is ignored.
 */
export async function guardedLunaCall<Value>(
  meta: GuardedLunaCallMeta,
  sink: LunaCallLogSink,
  fn: (signal: AbortSignal) => Promise<Value>,
  options: GuardedLunaCallOptions<Value> = {},
): Promise<Value> {
  const timeoutMs = meta.timeoutMs ?? LUNA_HANG_GUARD_MS;
  const inFlight = beginLunaCall(sink, { ...meta, timeoutMs });
  const controller = new AbortController();
  // Registered before `fn` runs, so at the deadline the guard settles ahead of any rejection `fn` makes from its own
  // abort listener: a firing is always recorded as the guard's, never as the call's error.
  const guard = new Promise<GuardedOutcome<Value>>((resolvePromise) => {
    controller.signal.addEventListener('abort', () => resolvePromise({ kind: 'guard_fired' }), { once: true });
  });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const operation = (async () => fn(controller.signal))().then(
    (value): GuardedOutcome<Value> => ({ kind: 'value', value }),
    (error: unknown): GuardedOutcome<Value> => ({ kind: 'error', error }),
  );
  const outcome = await Promise.race([operation, guard]);
  clearTimeout(timer);
  switch (outcome.kind) {
    case 'guard_fired':
      throw new LunaHangGuardExpired(inFlight.complete({
        exit: 'timed_out',
        error: `no settlement within the ${String(timeoutMs)} ms hang guard; the call was aborted`,
      }));
    case 'error':
      inFlight.complete({ exit: 'thrown', error: errorMessage(outcome.error) });
      throw outcome.error;
    case 'value':
      inFlight.complete({ exit: 'completed', providerRequestId: options.providerRequestId?.(outcome.value) ?? null });
      return outcome.value;
  }
}

const DISPATCH_KEYS = [
  'schema', 'event', 'runId', 'cellKey', 'ordinal', 'surface', 'dispatch', 'callPhase', 'bootstrapKind', 'model',
  'reasoningEffort', 'timeoutMs', 'boundKind', 'startedAtUnixMs',
] as const;
const COMPLETE_KEYS = [
  'schema', 'event', 'runId', 'cellKey', 'ordinal', 'endedAtUnixMs', 'elapsedMs', 'exit', 'hangGuardFired', 'error',
  'providerRequestId',
] as const;

function decodeEvent(line: string, index: number): LunaCallLogEvent {
  const value: unknown = JSON.parse(line);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Call-log line ${String(index + 1)} is not an object.`);
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (record['schema'] !== LUNA_CALL_LOG_SCHEMA) {
    throw new TypeError(`Call-log line ${String(index + 1)} is not ${LUNA_CALL_LOG_SCHEMA}.`);
  }
  const keys = record['event'] === 'dispatch' ? DISPATCH_KEYS : record['event'] === 'complete' ? COMPLETE_KEYS : null;
  if (keys === null) throw new TypeError(`Call-log line ${String(index + 1)} has no dispatch or complete event.`);
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, position) => key !== expected[position])) {
    throw new TypeError(`Call-log line ${String(index + 1)} has keys ${actual.join(',')}; expected ${expected.join(',')}.`);
  }
  if (typeof record['runId'] !== 'string' || typeof record['cellKey'] !== 'string' ||
    !Number.isSafeInteger(record['ordinal']) || (record['ordinal'] as number) < 1) {
    throw new TypeError(`Call-log line ${String(index + 1)} has no run id, cell key or positive ordinal.`);
  }
  return value as LunaCallLogEvent;
}

/**
 * Joins dispatch and completion events by `(runId, ordinal)` and returns one record per call, sorted by run id then
 * ordinal. A dispatch without a completion is `pending`. A completion without a dispatch, a repeated event, or a
 * completion whose cell differs from its dispatch is refused.
 */
export function reconcileLunaCallLog(lines: readonly string[]): readonly LunaCallRecord[] {
  const dispatches = new Map<string, LunaCallDispatchEvent>();
  const completions = new Map<string, LunaCallCompleteEvent>();
  lines.forEach((line, index) => {
    if (line.trim().length === 0) return;
    const event = decodeEvent(line, index);
    const key = `${event.runId}\0${String(event.ordinal)}`;
    const seen = event.event === 'dispatch' ? dispatches : completions;
    if (seen.has(key)) {
      throw new TypeError(`Call log repeats the ${event.event} of run ${event.runId} ordinal ${String(event.ordinal)}.`);
    }
    if (event.event === 'dispatch') dispatches.set(key, event);
    else completions.set(key, event);
  });
  for (const [key, completion] of completions) {
    const dispatch = dispatches.get(key);
    if (dispatch === undefined) {
      throw new TypeError(
        `Call log completes run ${completion.runId} ordinal ${String(completion.ordinal)} with no dispatch.`,
      );
    }
    if (dispatch.cellKey !== completion.cellKey) {
      throw new TypeError(
        `Call log completes run ${completion.runId} ordinal ${String(completion.ordinal)} in cell ` +
        `${completion.cellKey}, dispatched in ${dispatch.cellKey}.`,
      );
    }
  }
  return [...dispatches.entries()]
    .sort(([, left], [, right]) =>
      left.runId === right.runId ? left.ordinal - right.ordinal : left.runId < right.runId ? -1 : 1)
    .map(([key, dispatch]): LunaCallRecord => {
      const { schema: _schema, event: _event, ...fields } = dispatch;
      const completion = completions.get(key);
      if (completion === undefined) {
        return {
          ...fields,
          pending: true,
          endedAtUnixMs: null,
          elapsedMs: null,
          exit: null,
          hangGuardFired: null,
          error: null,
          providerRequestId: null,
        };
      }
      return {
        ...fields,
        pending: false,
        endedAtUnixMs: completion.endedAtUnixMs,
        elapsedMs: completion.elapsedMs,
        exit: completion.exit,
        hangGuardFired: completion.hangGuardFired,
        error: completion.error,
        providerRequestId: completion.providerRequestId,
      };
    });
}
