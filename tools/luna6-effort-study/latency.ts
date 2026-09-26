/**
 * Per-call response time with the hang guard as right-censoring (plan r5 §3.6). A call the guard aborted is censored
 * at the fixed 1,800,000 ms: it ranks above every completed call, and a quantile that lands on it is reported as
 * censored, never as a number. Speed decides nothing; S-RESULT reports it beside the quality result.
 */
import type { LunaCallExit } from '../luna-call-log';
import { LEGACY_ROUND_WALL_MS } from '../model-routes';

export const LUNA6_CENSORED_QUANTILE = '>=1800000 (censored)' as const;
export type Luna6Quantile = number | typeof LUNA6_CENSORED_QUANTILE | null;

/** Every exit a call-log record can carry; the type below fails to compile if `LunaCallExit` gains one. */
export const LUNA6_CALL_EXITS = [
  'completed', 'cancelled', 'timed_out', 'infrastructure_failed', 'failed', 'thrown',
] as const satisfies readonly LunaCallExit[];
type MissingCallExit = Exclude<LunaCallExit, (typeof LUNA6_CALL_EXITS)[number]>;
const everyCallExitListed: [MissingCallExit] extends [never] ? true : MissingCallExit = true;
void everyCallExitListed;

export interface Luna6CallTiming {
  readonly elapsedMs: number;
  readonly exit: LunaCallExit;
  readonly hangGuardFired: boolean;
}

export type Luna6OtherFailureExit = Exclude<LunaCallExit, 'completed'>;

export interface Luna6SpeedSummary {
  readonly calls: number;
  readonly completed: number;
  readonly censored: number;
  readonly otherFailures: Readonly<Record<Luna6OtherFailureExit, number>>;
  /** completed / (completed + censored); null when neither occurred. */
  readonly completionRate: number | null;
  readonly p50: Luna6Quantile;
  readonly p90: Luna6Quantile;
  readonly p95: Luna6Quantile;
  readonly max: Luna6Quantile;
  /**
   * Calls the old 180 s wall would have censored: every censored call, and every call that ran 180,000 ms or longer
   * (a bounded round accepts a completion only while at least 1 ms remains, `agent-session-lifecycle.ts`).
   */
  readonly callsOver180s: number;
}

/**
 * Nearest-rank quantile, `rank = ceil(percent·n / 100)` in integer arithmetic, over the completed calls ascending with
 * every censored call ranked above them.
 */
function nearestRank(completedAscending: readonly number[], censored: number, percent: number): Luna6Quantile {
  const n = completedAscending.length + censored;
  if (n === 0) return null;
  const rank = Math.floor((percent * n + 99) / 100);
  const clamped = Math.min(n, Math.max(1, rank));
  if (clamped > completedAscending.length) return LUNA6_CENSORED_QUANTILE;
  return completedAscending[clamped - 1] ?? null;
}

export function luna6SpeedSummary(calls: readonly Luna6CallTiming[]): Luna6SpeedSummary {
  const otherFailures: Record<Luna6OtherFailureExit, number> = {
    cancelled: 0, infrastructure_failed: 0, timed_out: 0, failed: 0, thrown: 0,
  };
  const completedAscending: number[] = [];
  let censored = 0;
  for (const call of calls) {
    if (call.hangGuardFired) {
      censored += 1;
    } else if (call.exit === 'completed') {
      completedAscending.push(call.elapsedMs);
    } else {
      otherFailures[call.exit] += 1;
    }
  }
  completedAscending.sort((left, right) => left - right);
  const measured = completedAscending.length + censored;
  return {
    calls: calls.length,
    completed: completedAscending.length,
    censored,
    otherFailures,
    completionRate: measured === 0 ? null : completedAscending.length / measured,
    p50: nearestRank(completedAscending, censored, 50),
    p90: nearestRank(completedAscending, censored, 90),
    p95: nearestRank(completedAscending, censored, 95),
    max: nearestRank(completedAscending, censored, 100),
    callsOver180s: calls.filter((call) => call.hangGuardFired || call.elapsedMs >= LEGACY_ROUND_WALL_MS).length,
  };
}

function median(sortedAscending: readonly number[]): number | null {
  const middle = Math.floor(sortedAscending.length / 2);
  if (sortedAscending.length === 0) return null;
  return sortedAscending.length % 2 === 1
    ? sortedAscending[middle] ?? null
    : ((sortedAscending[middle - 1] ?? 0) + (sortedAscending[middle] ?? 0)) / 2;
}

export interface Luna6PairTiming {
  readonly high: readonly Luna6CallTiming[];
  readonly xhigh: readonly Luna6CallTiming[];
}

export interface Luna6PairedTimeRatio {
  /** The median over usable pairs of sum(xhigh elapsed) / sum(high elapsed); null when no pair is usable. */
  readonly median: number | null;
  readonly pairs: number;
  /** Pairs left out because a cell has a censored or failed call, or the high cell has no elapsed time. */
  readonly leftOut: number;
}

/** No ratio ever involves a censored or failed call (§3.6). */
export function luna6PairedTimeRatio(pairs: readonly Luna6PairTiming[]): Luna6PairedTimeRatio {
  const clean = (calls: readonly Luna6CallTiming[]): boolean =>
    calls.every((call) => call.exit === 'completed' && !call.hangGuardFired);
  const total = (calls: readonly Luna6CallTiming[]): number => calls.reduce((sum, call) => sum + call.elapsedMs, 0);
  const ratios = pairs
    .filter((pair) => clean(pair.high) && clean(pair.xhigh) && total(pair.high) > 0)
    .map((pair) => total(pair.xhigh) / total(pair.high))
    .sort((left, right) => left - right);
  return { median: median(ratios), pairs: ratios.length, leftOut: pairs.length - ratios.length };
}

export interface Luna6TokenUsage {
  readonly reasoning: number;
  readonly output: number;
}

export interface Luna6TokenSummary {
  readonly calls: number;
  readonly reasoning: { readonly mean: number | null; readonly median: number | null };
  readonly output: { readonly mean: number | null; readonly median: number | null };
}

/** Reasoning and output tokens per call, from the rows' `callUsage` (completed calls report usage). */
export function luna6TokenSummary(usage: readonly Luna6TokenUsage[]): Luna6TokenSummary {
  const summary = (values: readonly number[]): { readonly mean: number | null; readonly median: number | null } => ({
    mean: values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length,
    median: median([...values].sort((left, right) => left - right)),
  });
  return {
    calls: usage.length,
    reasoning: summary(usage.map((entry) => entry.reasoning)),
    output: summary(usage.map((entry) => entry.output)),
  };
}
