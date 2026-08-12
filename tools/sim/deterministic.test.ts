// Category 1: deterministic seams via injected Rng stubs.
//
// Every expected value below was independently derived by hand from the
// source (dice sizes, DCs, resource costs — never by running the sim and
// copying its output; see AGENTS.md) and then cross-checked against the
// actual code path with a throw-on-exhaustion scripted Rng during test
// authoring, so a miscounted draw fails loudly instead of silently landing
// on the wrong branch. All draw-count derivations are documented inline.
import { describe, expect, it } from 'vitest';
import {
  champion,
  championRanged,
  devotion,
  domination,
  monk,
  veteran,
} from './sim';
import {
  ALWAYS_MIN,
  constRng,
  DAMAGE_DIE_MID,
  MIRROR_DECLINE,
  MIRROR_TRIGGER,
  MISS,
  repeat,
  scriptedRng,
  SKIP_PROB,
} from './test-helpers';

describe('always-min Rng (every roll a natural 1): miss-only branches', () => {
  // Every d20 draw -> 1 (auto-miss, regardless of to-hit bonus or AC).

  it('Champion Graze deals ability modifier ONLY — no weapon/item bonus (F5)', () => {
    // dealt = abil(L) * total melee attack-slots(L), where attack-slots
    // account for round-0 (and, at 17, round-1) Action Surge doubling and
    // the crit-triggered bonus attack never firing (no crits under all-miss).
    //   L3:  natk=1; slots = (1+1) + 1 + 1 + 1 = 5
    //   L6:  natk=2; slots = (2+2) + 2 + 2 + 2 = 10
    //   L11: natk=3; slots = (3+3) + 3 + 3 + 3 = 15
    //   L17: natk=3; slots = (3+3) + (3+3) + 3 + 3 = 18  (F4: 2nd surge at 17)
    const abil = { 3: 3, 6: 4, 11: 5, 17: 5 } as const;
    const slots = { 3: 5, 6: 10, 11: 15, 17: 18 } as const;
    for (const L of [3, 6, 11, 17] as const) {
      const r = champion(ALWAYS_MIN, L, 1);
      expect(r).toEqual({ dealt: abil[L] * slots[L], prevented: 0 });
    }
  });

  it('championRanged never applies Graze: dealt is exactly 0 when every attack misses', () => {
    for (const L of [3, 6, 11, 17] as const) {
      expect(championRanged(ALWAYS_MIN, L, 1)).toEqual({ dealt: 0, prevented: 0 });
    }
  });

  it("Veteran fires Sure Strike every round when Sneak Attack never lands", () => {
    // Sure Strike = floor((sa+1)/2) d6, every die shows 1 (min face, no reroll
    // triggered since rr() only rerolls a face of exactly 2). 4 rounds/combat.
    const sa = { 3: 3, 6: 4, 11: 11, 17: 17 } as const;
    for (const L of [3, 6, 11, 17] as const) {
      const r = veteran(ALWAYS_MIN, L, 1);
      const expectedDealt = 4 * Math.floor((sa[L] + 1) / 2);
      expect(r).toEqual({ dealt: expectedDealt, prevented: 0 });
    }
  });

  it('monk deals and prevents nothing when every roll (its own and the enemies\') misses', () => {
    for (const L of [3, 6, 11, 17] as const) {
      expect(monk(ALWAYS_MIN, L, 1)).toEqual({ dealt: 0, prevented: 0 });
    }
  });
});

describe('constant-value Rng (fixed non-crit hit): exact smite-queue accounting', () => {
  // x=0.72 -> d20=15 (hits every sampled AC without ever crossing into crit
  // territory), d6=5, d8=6. Every attack in paladin/domination lands as a
  // plain hit, so smite dice are never doubled — this isolates the queue
  // bookkeeping (F6's fix) from crit-doubling behavior (covered separately).
  const X = 0.72;
  // Independently reconstructed from the SRD Paladin slot table at L17
  // (1st:4 2nd:3 3rd:3 4th:3 5th:1) plus the one free Paladin's Smite:
  // dice-per-slot-level = level+1 -> [2,2,2,2,2, 3,3,3, 4,4,4, 5,5,5, 6],
  // sorted descending, 15 entries total.
  const L17_QUEUE = [6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2];

  it('devotion L17 burst: Sacred Weapon activation leaves all 4 Bonus Actions available to smite', () => {
    const abil = 5;
    const wb = 3;
    const rad = 6; // one d8 face, Radiant Strikes active at L17
    const perAttack = 5 /* weapon d6 */ + (abil + wb) + rad; // = 19
    const weaponTotal = perAttack * 3 /* natk */ * 4 /* rounds */;
    const smiteTotal = L17_QUEUE.slice(0, 4).reduce((a, b) => a + b, 0) * 6; // d8 face=6, not crit-doubled
    const r = devotion(constRng(X), 17, 1);
    expect(r).toEqual({ dealt: weaponTotal + smiteTotal, prevented: 0 });
  });

  it('devotion L17 day: 15 of 16 rounds consume the complete Long-Rest smite queue', () => {
    const perAttack = 19;
    const weaponTotal = perAttack * 3 * 16;
    const smiteTotal = L17_QUEUE.reduce((a, b) => a + b, 0) * 6;
    const r = devotion(constRng(X), 17, 4);
    expect(r).toEqual({ dealt: weaponTotal + smiteTotal, prevented: 0 });
  });

  it('domination smite-only L17 burst: all 4 rounds can smite', () => {
    const perAttack = 19;
    const weaponTotal = perAttack * 3 * 4;
    const smiteTotal = L17_QUEUE.slice(0, 4).reduce((a, b) => a + b, 0) * 6;
    const r = domination(constRng(X), 17, 1, 'smite');
    expect(r).toEqual({ dealt: weaponTotal + smiteTotal, prevented: 0 });
  });
});

describe('monk: hand-crafted sequences steering specific return-fire branches', () => {
  // Shared shape for every case below: the monk's own attacks and Court
  // Cantrip roll are all forced to miss (MISS = nat 1), isolating the
  // `prevented`/re-manifest bookkeeping from the monk's own `dealt`. Enemy
  // A's goad-defiance check and enemy B's presence check both consume
  // SKIP_PROB (>=0.25 skips defiance, <0.5 skips B), so only enemy A's
  // attacks against the monk are in play.

  it('L3: Mirror Image actually diverts a hit (one of its 3 d6 rolls is 3+)', () => {
    // A single Mirror Image casting always creates exactly 3 duplicates,
    // regardless of MIRROR_POOL[L] (which only bounds how many times a fresh
    // casting can be pre-cast across the day). One d6 is rolled per
    // duplicate; ANY 3+ diverts the hit.
    const values = [
      ...repeat(MISS, 5), // round 0: 4 flurry attacks + Court Cantrip, all miss
      SKIP_PROB, // A defiance: skipped
      0.62, MIRROR_DECLINE, MIRROR_TRIGGER, MIRROR_DECLINE, DAMAGE_DIE_MID, // atk1: d20=13(hit,total 18) + 3 mirror rolls (one triggers) + 1 absorb-damage draw
      MISS, // atk2: miss
      SKIP_PROB, // B: absent

      ...repeat(MISS, 5), SKIP_PROB, MISS, MISS, SKIP_PROB, // round 1 (still flurrying), quiescent return fire
      ...repeat(MISS, 2), SKIP_PROB, MISS, MISS, SKIP_PROB, // round 2 (focus exhausted)
      ...repeat(MISS, 2), SKIP_PROB, MISS, MISS, SKIP_PROB, // round 3
    ];
    const r = monk(scriptedRng(values), 3, 1);
    // One absorbed hit: d8=5 (DAMAGE_DIE_MID) + flat 4 = 9.
    expect(r).toEqual({ dealt: 0, prevented: 9 });
  });

  it('L3: Mirror Image declines, then a Shield cast absorbs the hit and stays up for the rest of the round', () => {
    const values = [
      ...repeat(MISS, 5), // round 0 own actions
      SKIP_PROB, // A defiance: skipped
      // atk1: hits in-band; all 3 mirror rolls decline; Shield casts
      // (spends the round's Reaction + one pool charge, sets shieldActive).
      0.62, MIRROR_DECLINE, MIRROR_DECLINE, MIRROR_DECLINE, DAMAGE_DIE_MID,
      // atk2: hits in-band again; shieldActive short-circuits straight to a
      // free absorb (no Mirror re-check, no pool spend).
      0.62, DAMAGE_DIE_MID,
      SKIP_PROB, // B: absent

      ...repeat(MISS, 5), SKIP_PROB, MISS, MISS, SKIP_PROB, // round 1
      ...repeat(MISS, 2), SKIP_PROB, MISS, MISS, SKIP_PROB, // round 2
      ...repeat(MISS, 2), SKIP_PROB, MISS, MISS, SKIP_PROB, // round 3
    ];
    const r = monk(scriptedRng(values), 3, 1);
    // Two absorbed hits, both (5+4)=9: one from the Shield cast, one free.
    expect(r).toEqual({ dealt: 0, prevented: 18 });
  });

  it('L11: a Concentration save failure breaks Hands, and the monk re-manifests next round (F3)', () => {
    // Round 0: L>=11 manifests Hands via the Bonus Action (no Flurry that
    // round). A's first attack lands OUTSIDE the shield band (total >=
    // monkAC+5), so it resolves as a real hit; Mirror declines (3 rolls);
    // Concentration save fails (DC = max(10, floor(dmg/2))) -> hands=false.
    // Round 1: hands is false and focus (6 remaining) >= 4, so the monk
    // RE-MANIFESTS (F3's fix). We make round 1's Court Cantrip HIT so its
    // damage total reveals whether the Hands rider (+Wis) is back: if F3
    // regressed (hands stuck false), this round's dealt would be 15, not 20.
    const HIT_OUT_OF_BAND = 0.87; // d20=18, total=27 >= monkAC(20)+5=25
    const CONC_FAIL = 0.22; // d20=5 -> 5+2=7 < dc(10)
    const CANTRIP_HIT = 0.7; // d20=15 -> 15+wis(5)+prof(4)=24 >= ac(18)

    const values = [
      // round 0: manifest consumes the BA -> 3 own attacks + 1 cantrip, all miss
      ...repeat(MISS, 4),
      SKIP_PROB,
      HIT_OUT_OF_BAND, MIRROR_DECLINE, MIRROR_DECLINE, MIRROR_DECLINE, // atk1 d20 + 3 mirror declines
      DAMAGE_DIE_MID, DAMAGE_DIE_MID, // real-hit damage (edn=2 dice at L11)
      CONC_FAIL, // save fails -> hands=false
      MISS, MISS, // atk2, atk3 miss
      SKIP_PROB,

      // round 1: re-manifest -> 3 own attacks (miss) + cantrip HITS (3d8 + rider)
      ...repeat(MISS, 3), CANTRIP_HIT, DAMAGE_DIE_MID, DAMAGE_DIE_MID, DAMAGE_DIE_MID,
      SKIP_PROB, MISS, MISS, MISS, SKIP_PROB,

      // rounds 2-3: hands stays true, flurry resumes (6 own attacks + cantrip, all miss)
      ...repeat(MISS, 7), SKIP_PROB, MISS, MISS, MISS, SKIP_PROB,
      ...repeat(MISS, 7), SKIP_PROB, MISS, MISS, MISS, SKIP_PROB,
    ];
    const r = monk(scriptedRng(values), 11, 1);
    // Round 1 cantrip: 3d8 (each face 5) = 15, + rider (Wis=5 at L11) = 20.
    expect(r).toEqual({ dealt: 20, prevented: 0 });
  });
});
