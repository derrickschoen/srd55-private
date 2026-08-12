// Shared test utilities: deterministic Rng builders and statistical sampling
// helpers. Not a test file itself (no `*.test.ts` suffix), so vitest won't
// collect it, but it's colocated with the suite for easy adjustment.
import type { CombatResult, Level, Rng } from './sim';

/** An Rng that always returns the same value in [0,1). */
export function constRng(x: number): Rng {
  return () => x;
}

/**
 * d20 -> 1 (a natural 1: always misses, regardless of to-hit bonus) and
 * every damage die -> its lowest face, on every draw. The single stub value
 * that exercises every "miss" branch in the sim (Graze, Sure Strike, no
 * Sneak Attack, no return-fire hits landing).
 */
export const ALWAYS_MIN: Rng = () => 0.0;

/**
 * Rng built from an explicit, ordered list of [0,1) values. Throws a
 * descriptive error the moment the sequence is exhausted, so a script that
 * doesn't cover the exact number of draws the code path takes fails loudly
 * (pointing at "how many draws did I actually need") instead of silently
 * reading `undefined` or wrapping around.
 */
export function scriptedRng(values: readonly number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i];
    if (v === undefined) {
      throw new Error(
        `scriptedRng exhausted: only ${values.length} value(s) supplied, draw #${i + 1} requested. ` +
          'Either the script under-counts the branch it is meant to steer, or the code path changed.',
      );
    }
    i++;
    return v;
  };
}

/** `n` copies of `v` — for padding a scripted sequence with "nothing happens" draws. */
export function repeat(v: number, n: number): number[] {
  return Array(n).fill(v) as number[];
}

// Named constants used by the deterministic branch-steering tests. Every one
// of these was chosen and independently cross-checked (see the sim's own
// `randInt`/`roll` formula: `Math.floor(x * size) + 1`) so the resulting d20
// / d6 / d8 face is documented at the call site, not just asserted.
export const MISS = 0.0; // d20 -> 1 (nat 1)
export const SKIP_PROB = 0.3; // >=0.25 (skips a 25% check) AND <0.5 (skips a 50% check)
export const MIRROR_DECLINE = 0.1; // d6 -> 1 (<3, Mirror Image declines)
export const MIRROR_TRIGGER = 0.5; // d6 -> 4 (>=3, Mirror Image diverts)
export const DAMAGE_DIE_MID = 0.5; // d8 -> 5, d6 -> 4, d10 -> 6

export interface MeanStat {
  mean: number;
  se: number; // standard error of the mean
}

type BuildFn<L extends Level = Level> = (rng: Rng, level: L, nc: number) => CombatResult | null;

/**
 * Mean and standard error of `channel` (dealt or prevented), per round,
 * across N independent trials on one fresh mulberry32(seed) stream. Used by
 * the tolerance-based statistical tests — never as a source of golden
 * values (AGENTS.md: no regenerating expectations from the sim's own
 * output). The *comparisons* built from this helper's output are checked
 * against independently-derivable directions/bounds, not against numbers
 * copied from a board run.
 */
export function sampleMeanPerRound<L extends Level>(
  fn: BuildFn<L>,
  rng: Rng,
  level: L,
  nc: number,
  N: number,
  channel: 'dealt' | 'prevented' = 'dealt',
): MeanStat {
  const rounds = 4 * nc;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < N; i++) {
    const r = fn(rng, level, nc);
    if (r === null) throw new Error('sampleMeanPerRound: build returned null (level below its floor)');
    const v = (channel === 'dealt' ? r.dealt : r.prevented) / rounds;
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / N;
  const variance = Math.max(0, sumSq / N - mean * mean);
  return { mean, se: Math.sqrt(variance / N) };
}

/** True if `a` and `b` (each mean+/-se) differ by at least `k` combined standard errors. */
export function differsBySigma(a: MeanStat, b: MeanStat, k: number): boolean {
  const combinedSe = Math.sqrt(a.se * a.se + b.se * b.se);
  return Math.abs(a.mean - b.mean) >= k * combinedSe;
}
