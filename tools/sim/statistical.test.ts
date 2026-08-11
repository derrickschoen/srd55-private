// Category 4: statistical tests. Tolerance-based, seeded mulberry32, N>=4000.
// Per AGENTS.md, none of these hardcode an exact board number as a golden
// value — every threshold is either an independently-derivable probability
// (the d20-vs-AC micro-check) or a directional/relative-magnitude invariant
// that must hold for structural reasons regardless of the exact numbers.
import { describe, expect, it } from 'vitest';
import { champion, domination, monk, mulberry32, paladin, thief, veteran } from './sim';
import { differsBySigma, sampleMeanPerRound } from './test-helpers';

describe('known-probability micro-check: a lone d20 test against a fixed AC', () => {
  it("mulberry32's stream, fed through the sim's own randInt formula, matches the binomial hit-probability for a d20+bonus vs AC", () => {
    // randInt(rng, 20) = floor(rng()*20) + 1, per sim.ts. This reimplements
    // that exact formula (it is not exported) to check mulberry32's fairness
    // against a textbook target: P(roll + bonus >= AC), roll in 1..20, no
    // advantage, no auto-miss/crit special-casing (a "lone d20 test").
    const bonus = 7;
    const ac = 16; // hits on a roll of 9+ => 12/20 = 0.6
    const theoretical = 12 / 20;
    const rng = mulberry32(2026);
    const N = 200_000;
    let hits = 0;
    for (let i = 0; i < N; i++) {
      const roll = Math.floor(rng() * 20) + 1;
      if (roll + bonus >= ac) hits++;
    }
    const observed = hits / N;
    const se = Math.sqrt((theoretical * (1 - theoretical)) / N);
    expect(Math.abs(observed - theoretical)).toBeLessThan(5 * se);
  });
});

describe('directional invariants: dealt', () => {
  it('Foreseen strikes flip the L3 burst: Domination (smite-only) > Vengeance there, Vengeance still ahead at L6-11', () => {
    // Owner ruling 2026-08-11 (second batch): Cha-mod (3) misses per Long
    // Rest become hits. Three conversions concentrated into one 4-round
    // combat outweigh Vow of Enmity's advantage at L3 (few attacks, low
    // accuracy); by L6+ the paladin's own attack volume dilutes them and
    // Vengeance leads again. Both directions are structural, not tuned.
    for (const L of [3, 6, 11] as const) {
      const rng = mulberry32(1000 + L);
      const pal = sampleMeanPerRound(paladin, rng, L, 1, 6000);
      const dom = sampleMeanPerRound((r, L2, nc) => domination(r, L2, nc, 'smite'), rng, L, 1, 6000);
      expect(differsBySigma(pal, dom, 4)).toBe(true);
      if (L === 3) expect(dom.mean).toBeGreaterThan(pal.mean);
      else expect(pal.mean).toBeGreaterThan(dom.mean);
    }
  });

  it('Foreseen strikes are a Long-Rest pool: Domination day per-round trails Vengeance day at every level', () => {
    // The same 3 conversions spread over 16 rounds cannot keep up with
    // always-on advantage; day mode restores the old ordering everywhere.
    for (const L of [3, 6, 11, 17] as const) {
      const rng = mulberry32(1500 + L);
      const pal = sampleMeanPerRound(paladin, rng, L, 4, 1500);
      const dom = sampleMeanPerRound((r, L2, nc) => domination(r, L2, nc, 'smite'), rng, L, 4, 1500);
      expect(pal.mean).toBeGreaterThan(dom.mean);
    }
  });

  it('Domination Command-max dealt < Domination smite-only dealt, at every level', () => {
    for (const L of [3, 6, 11, 17] as const) {
      const rng = mulberry32(2000 + L);
      const cmd = sampleMeanPerRound((r, L2, nc) => domination(r, L2, nc, 'control'), rng, L, 1, 6000);
      const smite = sampleMeanPerRound((r, L2, nc) => domination(r, L2, nc, 'smite'), rng, L, 1, 6000);
      expect(differsBySigma(cmd, smite, 4)).toBe(true);
      expect(cmd.mean).toBeLessThan(smite.mean);
    }
  });
});

describe('directional invariants: prevented', () => {
  it('Domination Command-max prevented > mix prevented, at every level', () => {
    for (const L of [3, 6, 11, 17] as const) {
      const rng = mulberry32(3000 + L);
      const cmd = sampleMeanPerRound(
        (r, L2, nc) => domination(r, L2, nc, 'control'),
        rng,
        L,
        1,
        6000,
        'prevented',
      );
      const mix = sampleMeanPerRound(
        (r, L2, nc) => domination(r, L2, nc, 'mix'),
        rng,
        L,
        1,
        6000,
        'prevented',
      );
      expect(differsBySigma(cmd, mix, 4)).toBe(true);
      expect(cmd.mean).toBeGreaterThan(mix.mean);
    }
  });
});

describe('day vs burst: resource-shape invariants', () => {
  it('paladin day <= burst, per round, at every level (Long-Rest smite queue is finite)', () => {
    for (const L of [3, 6, 11, 17] as const) {
      const rng = mulberry32(4000 + L);
      const burst = sampleMeanPerRound(paladin, rng, L, 1, 6000);
      const day = sampleMeanPerRound(paladin, rng, L, 4, 1500);
      // Generous band: day must not exceed burst by more than combined noise.
      expect(day.mean).toBeLessThanOrEqual(burst.mean + 4 * (burst.se + day.se));
    }
  });

  it('short-rest-only builds (champion, veteran, thief) track day ~= burst within a tight band', () => {
    // Unlike paladin/monk/fiend(Hex)/casters, these builds' resources
    // (Action Surge, Heroic Warrior, Old Reserves, Steady Aim) all recharge
    // on a Short Rest, and the day model gives one between every combat —
    // so day and burst per-round averages should coincide, not merely both
    // be "reasonable."
    const builds: Array<[string, typeof champion]> = [
      ['champion', champion],
      ['veteran', veteran],
      ['thief', thief],
    ];
    for (const [name, fn] of builds) {
      for (const L of [3, 17] as const) {
        const rng = mulberry32(5000 + L);
        const burst = sampleMeanPerRound(fn, rng, L, 1, 6000);
        const day = sampleMeanPerRound(fn, rng, L, 4, 1500);
        const relDiff = Math.abs(day.mean - burst.mean) / burst.mean;
        expect(relDiff, `${name} L${L}`).toBeLessThan(0.05);
      }
    }
  });

  it('monk day is measurably below burst (mixed Short/Long-Rest resources: Focus refreshes, Shield/Mirror pools do not)', () => {
    for (const L of [6, 11, 17] as const) {
      const rng = mulberry32(6000 + L);
      const burst = sampleMeanPerRound(monk, rng, L, 1, 6000);
      const day = sampleMeanPerRound(monk, rng, L, 4, 1500);
      expect(day.mean).toBeLessThan(burst.mean);
    }
  });
});
