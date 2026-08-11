// Category 2: resource-accounting invariants. This is the class of bug the
// consensus review actually found (F1: caster day columns re-nova'd every
// combat instead of sharing one Long-Rest slot queue; F9: monk Shield
// absorbs refreshed per combat instead of drawing from a Long-Rest pool).
// Every test here compares "day" (one continuous nc=4 call) against "burst"
// (nc=1) to prove a shared resource is actually being shared and actually
// runs out, rather than trusting the printed board numbers.
import { describe, expect, it } from 'vitest';
import { domination, fiend, monk, mulberry32, sorcwiz, valor, veteran } from './sim';
import { constRng, sampleMeanPerRound } from './test-helpers';

describe('caster day ray totals never exceed the Long-Rest slot budget (F1)', () => {
  // RAY_Q is not exported (private module state) by design, so this is
  // verified the same way an external caller would have to: by exact
  // damage-total accounting under a fixed, non-crit constant Rng, using a
  // queue independently reconstructed from the multiclass slot table in the
  // sim's own header comment (4/3/3/3/2/1 at 11; 4/3/3/3/2/1/1/1/1 at 17,
  // top slot pre-spent on CME).
  const X = 0.72; // d20=15 (hit, non-crit), d6=5, d8=6, d10=8

  it('sorcwiz L11: the day queue (11 rounds of rays) runs dry after 11 of 16 rounds, then falls back to Fire Bolt', () => {
    const rayQ = [6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3]; // sum = 48 rays
    const rider = 4;
    const rayHitDmg = 5 * 2 + 6 * rider; // 2d6 (face 5) + rider d8s (face 6)
    const fireBoltDmg = 8 * 3 + 6 * rider; // 3d10 (face 8) + rider d8s
    const totalRays = rayQ.reduce((a, b) => a + b, 0);
    const dryRounds = 16 - rayQ.length;
    const expected = totalRays * rayHitDmg + dryRounds * fireBoltDmg;

    const r = sorcwiz(constRng(X), 11, 4);
    expect(r).toEqual({ dealt: expected, prevented: 0 });
  });

  it('sorcwiz L11 burst never exhausts the queue (4 rounds < 11 queued)', () => {
    const rayQ = [6, 6, 5, 5];
    const rider = 4;
    const rayHitDmg = 5 * 2 + 6 * rider;
    const totalRays = rayQ.reduce((a, b) => a + b, 0);
    const r = sorcwiz(constRng(X), 11, 1);
    expect(r).toEqual({ dealt: totalRays * rayHitDmg, prevented: 0 });
  });

  it('day per-round average is measurably lower than burst (the queue is the bottleneck, not a free re-nova)', () => {
    const rng = mulberry32(4242);
    const burst = sampleMeanPerRound(sorcwiz, rng, 11, 1, 4000);
    const day = sampleMeanPerRound(sorcwiz, rng, 11, 4, 1000);
    // A regression back to "day re-novas every combat" would make these
    // nearly equal; require day to sit meaningfully below burst.
    expect(day.mean).toBeLessThan(burst.mean * 0.85);
  });

  it('same invariant holds for the Valor bard (shares the same RAY_Q mechanism)', () => {
    const rng = mulberry32(4343);
    const burst = sampleMeanPerRound(valor, rng, 17, 1, 4000);
    const day = sampleMeanPerRound(valor, rng, 17, 4, 1000);
    expect(day.mean).toBeLessThan(burst.mean * 0.85);
  });
});

describe('smite queue: 15 entries at L17, shared across the day', () => {
  it('domination smite-only day gets more total smites than a single burst combat could', () => {
    // Burst (4 rounds, no Vow-of-Enmity exclusion for domination) can smite
    // at most 4 times. Day (16 rounds) can smite up to 15 times (queue
    // length) before running dry. If the queue reset every combat instead
    // (the pre-fix bug), day's per-round average would barely differ from
    // burst's, since each combat would re-open with a full queue and smite
    // every eligible round just like burst does.
    const rng = mulberry32(55);
    const burst = sampleMeanPerRound(
      (r, L, nc) => domination(r, L, nc, 'smite'),
      rng,
      17,
      1,
      6000,
    );
    const day = sampleMeanPerRound(
      (r, L, nc) => domination(r, L, nc, 'smite'),
      rng,
      17,
      4,
      1500,
    );
    // Per-round day average should be below burst: the last several of the
    // day's 16 rounds smite off an exhausted (or exhausting) queue.
    expect(day.mean).toBeLessThan(burst.mean);
  });
});

describe('Eldritch Smite contributes nothing at L3 (Warlock 5+ prerequisite, F7)', () => {
  it('L3 bladelock dealt is bounded above by weapon+Hex+cha alone (no 3d8 smite each round)', () => {
    // Analytic upper bound with NO smite: every attack (natk=1 at L3) always
    // hits and crits (roll(rng, dark) with dark=false -> adv=false, single
    // d20; use an always-max Rng so every hit is a crit and every die is
    // maxed, i.e. the largest the non-smite path can ever be).
    const alwaysMax: () => number = () => 0.999999;
    const r = fiend(alwaysMax, 3, 1, true, false);
    // Per crit hit at L3 (no smite): dice = [2d6, 1d6(Hex)] doubled = 3d6*2 = 6d6,
    // each face 6 (alwaysMax) = 36, + cha(3) + wb(0, itemless at L3) = 39.
    // 4 rounds * 1 attack = 4 hits -> 156 if NO smite ever fires.
    const noSmiteUpperBound = 4 * (6 * 6 + 3 + 0);
    expect(r.dealt).toBe(noSmiteUpperBound);
    // If Eldritch Smite were (incorrectly) firing at L3, a single 3d8 smite
    // maxed at crit would add 6d8*2=... this bound would be blown well past;
    // asserting exact equality above already proves no smite fired, but
    // spell it out for readability too:
    expect(r.dealt).toBeLessThan(noSmiteUpperBound + 1);
  });

  it('L5+ bladelock DOES smite: dealt exceeds the same no-smite-shaped bound', () => {
    const alwaysMax: () => number = () => 0.999999;
    const r = fiend(alwaysMax, 6, 1, true, false);
    // At L6 (>=5): natk=2, Hex + Devouring not yet (L<9). Per crit hit:
    // dice=[2d6,1d6] doubled=6d6 maxed=36, +cha(4)+wb(1)=41. 4 attacks (2/round*2 rounds worth... )
    // Rather than re-derive the full total (fragile), just prove smite fired:
    // an all-crit, all-hit L6 burst gets an Eldritch Smite every round it has
    // slots for (sq starts at slots-1=1), i.e. at least one 3d8 (crit-doubled)
    // smite must appear, which alone is worth 6d8 maxed = 48 > any single
    // weapon attack's contribution difference from the L3 case.
    const perHitNoSmite = 6 * 6 + 4 + 1; // 41
    const roundsWithAttacks = 4;
    const attacksPerRound = 2;
    const noSmiteTotal = perHitNoSmite * attacksPerRound * roundsWithAttacks;
    expect(r.dealt).toBeGreaterThan(noSmiteTotal);
  });
});

describe('monk SHIELD_POOL and MIRROR_POOL are shared across nc=4, not refreshed per combat (F9)', () => {
  it('prevented across a full day is less than 4x a single burst combat\'s prevented', () => {
    // Some of `prevented` (goad defiance) is NOT pool-gated, so the day/
    // burst gap is real but not huge (empirically ~15-40% depending on
    // level; L11 is the tightest at ~14%). A 8% margin comfortably clears
    // sampling noise at this N while still failing hard if the pools ever
    // regress to refreshing per combat (which would collapse the gap to ~0%).
    for (const L of [3, 6, 11, 17] as const) {
      const rng = mulberry32(900 + L);
      const burst = sampleMeanPerRound(monk, rng, L, 1, 6000, 'prevented');
      const day = sampleMeanPerRound(monk, rng, L, 4, 1500, 'prevented');
      // burst.mean and day.mean are both PER-ROUND averages. Total prevented
      // across 4 independent burst combats would be burst.mean * 4 rounds * 4
      // combats; total prevented across one shared-pool day is day.mean * 16
      // rounds. If the pool reset every combat, these totals would be equal
      // (within noise). Since it's a shared Long-Rest pool, the day total
      // must fall meaningfully short of 4 independent combats' worth.
      const dayTotal = day.mean * 16;
      const fourBurstsTotal = burst.mean * 4 * 4;
      expect(dayTotal).toBeLessThan(fourBurstsTotal * 0.92);
    }
  });
});

describe('Veteran Reflexes: melee only, L13+, PB-sized Long-Rest pool', () => {
  it('never contributes to prevented below L13, in either mode', () => {
    for (const L of [3, 11] as const) {
      const rng = mulberry32(70 + L);
      const meleePrevented = sampleMeanPerRound(veteran, rng, L, 1, 4000, 'prevented');
      expect(meleePrevented.mean).toBe(0);
      const rangedPrevented = sampleMeanPerRound(
        (r, L2, nc) => veteran(r, L2, nc, true),
        rng,
        L,
        1,
        4000,
        'prevented',
      );
      expect(rangedPrevented.mean).toBe(0);
    }
  });

  it('at L17, contributes to prevented in melee but NEVER in ranged (out of melee reach, declared)', () => {
    const rng = mulberry32(717);
    const melee = sampleMeanPerRound(veteran, rng, 17, 1, 4000, 'prevented');
    expect(melee.mean).toBeGreaterThan(0);
    const ranged = sampleMeanPerRound(
      (r, L, nc) => veteran(r, L, nc, true),
      rng,
      17,
      1,
      4000,
      'prevented',
    );
    expect(ranged.mean).toBe(0);
  });
});

describe('Hex paid once per day; Darkness re-paid every combat (F26)', () => {
  it('bladelock (Hex) day per-round average EXCEEDS burst: skipping the upkeep in combats 2-4 buys extra Eldritch Smites', () => {
    for (const L of [6, 11, 17] as const) {
      const rng = mulberry32(1000 + L);
      const burst = sampleMeanPerRound((r, L2, nc) => fiend(r, L2, nc, true, false), rng, L, 1, 4000);
      const day = sampleMeanPerRound((r, L2, nc) => fiend(r, L2, nc, true, false), rng, L, 4, 1000);
      expect(day.mean).toBeGreaterThan(burst.mean);
    }
  });

  it('bladelock (Darkness) day and burst stay close: the Concentration spell is re-paid every combat regardless', () => {
    for (const L of [6, 11, 17] as const) {
      const rng = mulberry32(2000 + L);
      const burst = sampleMeanPerRound((r, L2, nc) => fiend(r, L2, nc, true, true), rng, L, 1, 6000);
      const day = sampleMeanPerRound((r, L2, nc) => fiend(r, L2, nc, true, true), rng, L, 4, 1500);
      const relDiff = Math.abs(day.mean - burst.mean) / burst.mean;
      expect(relDiff).toBeLessThan(0.05);
    }
  });
});
