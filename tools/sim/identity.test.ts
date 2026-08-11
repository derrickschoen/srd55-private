// Category 3: identity tests — structural properties that must hold
// regardless of what the dice do this run.
import { describe, expect, it } from 'vitest';
import {
  champion,
  championRanged,
  domination,
  fiend,
  monk,
  mulberry32,
  paladin,
  sorcwiz,
  veteran,
} from './sim';
import { ALWAYS_MIN } from './test-helpers';

describe('monk(initManifest) is inert below L17', () => {
  it('produces byte-identical results to monk() at L3, L6, L11 under the same seed', () => {
    for (const L of [3, 6, 11] as const) {
      const a = monk(mulberry32(1234), L, 4);
      const b = monk(mulberry32(1234), L, 4, true);
      expect(b).toEqual(a);
    }
  });

  it('DOES differ at L17 (the flag is not inert there)', () => {
    const a = monk(mulberry32(1234), 17, 4);
    const b = monk(mulberry32(1234), 17, 4, true);
    expect(b).not.toEqual(a);
  });

  // (A previous variant re-ran the check under ALWAYS_MIN; removed as vacuous —
  // every path deals/prevents 0 there, so it compared {0,0} to {0,0}. The
  // seeded test above is the real guard.)
});

describe('champion vs championRanged: share championCore, but are not the same build', () => {
  it('differ under a live seeded stream at every level', () => {
    for (const L of [3, 6, 11, 17] as const) {
      const melee = champion(mulberry32(99), L, 1);
      const ranged = championRanged(mulberry32(99), L, 1);
      expect(ranged).not.toEqual(melee);
    }
  });

  it('structurally differ in the way the header documents: Graze (melee-only) and GWM (melee-only) both vanish in the ranged row', () => {
    // Under an always-miss Rng, melee Graze contributes ability-mod damage
    // every attack; ranged has no Graze equivalent, so dealt is exactly 0.
    for (const L of [3, 6, 11, 17] as const) {
      const melee = champion(ALWAYS_MIN, L, 1);
      const ranged = championRanged(ALWAYS_MIN, L, 1);
      expect(melee.dealt).toBeGreaterThan(0);
      expect(ranged.dealt).toBe(0);
    }
  });
});

describe('purity: the same seed run twice produces identical results', () => {
  // Guards against hidden shared/mutable module state (e.g. a build that
  // accidentally mutated one of the exported Record constants, or a queue
  // built once at module scope instead of per-call).
  const cases: Array<[string, () => unknown]> = [
    ['paladin L17 day', () => paladin(mulberry32(42), 17, 4)],
    ['domination L11 day (open)', () => domination(mulberry32(42), 11, 4, 'open')],
    ['monk L17 day (initManifest)', () => monk(mulberry32(42), 17, 4, true)],
    ['fiend L17 day (blade+dark)', () => fiend(mulberry32(42), 17, 4, true, true)],
    ['veteran L13... L17 ranged day', () => veteran(mulberry32(42), 17, 4, true)],
    ['sorcwiz L17 day', () => sorcwiz(mulberry32(42), 17, 4)],
  ];

  it.each(cases)('%s: two independent calls with the same seed match exactly', (_name, run) => {
    expect(run()).toEqual(run());
  });

  it('calling a build repeatedly against the SAME Rng instance does NOT repeat (proves the Rng, not the build, drives variation)', () => {
    // A large-variance build (L17, a full day) makes an accidental tie
    // between two independent slices of the same stream astronomically
    // unlikely, unlike a single small burst combat.
    const rng = mulberry32(7);
    const first = paladin(rng, 17, 4);
    const second = paladin(rng, 17, 4);
    expect(second).not.toEqual(first);
  });

  it('module-level resource tables (SMITE_Q-shaped constants) are not mutated across repeated calls', () => {
    // If a build's queue construction ever regressed to `SMITE_Q[L]` without
    // a defensive copy (`[...SMITE_Q[L]]`), repeated calls would see a
    // shrinking queue and diverge. Ten repeated fresh-seed L17 day calls
    // must all match the first.
    const reference = domination(mulberry32(9001), 17, 4, 'smite');
    for (let i = 0; i < 10; i++) {
      expect(domination(mulberry32(9001), 17, 4, 'smite')).toEqual(reference);
    }
  });
});
