// Category 5: mulberry32 itself. Pinned outputs are cross-checked against an
// independent transcription of the public-domain mulberry32 algorithm
// (bryc's / cprosche's well-known implementation), typed out here without
// reading sim.ts's copy, specifically so this isn't "the expectation is
// whatever the code produces." Both produced identical sequences for every
// seed checked during development (1, 31, 42, 12345).
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './sim';

function referenceMulberry32(seed: number): () => number {
  let a = seed;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('mulberry32', () => {
  it('matches an independent reference implementation for seed=1 (first 5 draws)', () => {
    const rng = mulberry32(1);
    const draws = Array.from({ length: 5 }, () => rng());
    // Independently computed via referenceMulberry32(1); also hand-verifiable
    // by running the formula above for seed=1.
    expect(draws).toEqual([
      0.6270739405881613,
      0.002735721180215478,
      0.5274470399599522,
      0.9810509674716741,
      0.9683778982143849,
    ]);
  });

  it('matches the reference implementation across several seeds, not just one', () => {
    for (const seed of [1, 2, 31, 42, 12345, 0, 4294967295]) {
      const a = mulberry32(seed);
      const b = referenceMulberry32(seed);
      const av = Array.from({ length: 8 }, () => a());
      const bv = Array.from({ length: 8 }, () => b());
      expect(av).toEqual(bv);
    }
  });

  it('produces values in [0, 1) over a large sample', () => {
    const rng = mulberry32(777);
    for (let i = 0; i < 50_000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is a deterministic function of its seed: two instances with the same seed produce identical streams', () => {
    const a = mulberry32(2024);
    const b = mulberry32(2024);
    const av = Array.from({ length: 100 }, () => a());
    const bv = Array.from({ length: 100 }, () => b());
    expect(av).toEqual(bv);
  });

  it('different seeds produce different streams (sanity: not a constant function)', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const av = Array.from({ length: 20 }, () => a());
    const bv = Array.from({ length: 20 }, () => b());
    expect(av).not.toEqual(bv);
  });

  it('roughly uniform: the mean of a large sample is close to 0.5', () => {
    const rng = mulberry32(31415);
    const N = 200_000;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += rng();
    const mean = sum / N;
    // SE of the mean of Uniform[0,1) over N draws is 1/sqrt(12*N) ~ 0.00065;
    // use a generous 10-sigma band to keep this from ever being flaky.
    expect(Math.abs(mean - 0.5)).toBeLessThan(10 * (1 / Math.sqrt(12 * N)));
  });
});
