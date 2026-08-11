// Category 7: regression guards added after a mutation-testing gap review of
// the original six files.
//
// Method: each confirmed defect from the 2026-08-10 consensus review (F#) and
// the follow-up defensive-accounting round (N#) was re-introduced into a copy
// of sim.ts / run.ts and the suite re-run. Every defect below is one whose
// mutant SURVIVED the original suite — i.e. the sim could silently regress to
// the shipped-and-fixed bug without a single test failing. Each test here was
// then confirmed to kill its mutant.
//
// As in deterministic.test.ts, every expected number is derived by hand from
// the source (dice sizes, attack counts, resource costs, draw counts) and
// documented at the call site — never copied from a run of the sim.
//
// Two of these guards assert a *draw count* rather than a damage total. That
// is deliberate and is the only honest detector for the "flag dropped at a
// round boundary" defect class (F13/F14/F18): `roll(rng, adv)` consumes TWO
// d20 draws under advantage and one without, so losing a carried advantage
// flag consumes FEWER draws. A scripted sequence therefore cannot catch it by
// exhaustion (the regressed run just leaves values unread) and an all-miss
// damage total is identical either way. The draw count is what actually moves.
import { describe, expect, it, vi } from 'vitest';
import {
  champion,
  championRanged,
  fiend,
  monk,
  sorcwiz,
  thiefRanged,
  valor,
  veteran,
  type Rng,
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

/** Wraps an Rng and counts how many values it was asked for. */
function drawCounter(inner: Rng): { rng: Rng; draws: () => number } {
  let n = 0;
  return {
    rng: () => {
      n += 1;
      return inner();
    },
    draws: () => n,
  };
}

// x=0.72 -> d20=15, d6=5, d8=6, d10=8. A plain hit against every sampled AC,
// never a crit at any of the sim's crit thresholds (18/19/20).
const X = 0.72;

describe('items ladder reaches every weapon build (F2 / owner ruling 2026-08-10)', () => {
  // The owner ruling gives +1/+2/+3 at 6/11/17 to ALL weapon builds, melee and
  // ranged, including the bladelock's pact weapon; only builds whose attacks
  // are spells stay itemless. Each total below is exact under constRng(X), so
  // dropping `wb` from either the to-hit or the damage side moves it.

  it('championRanged L17 carries +3 on damage: 18 attack-slots x (d6 + Dex + 3)', () => {
    // hit = 11 + wb(3) + 2 (Archery) = 16; d20=15 -> 31 vs AC 18, always a
    // plain hit (crit threshold 18 at L15+, and 15 < 18).
    // Attack slots: natk=3, Action Surge in rounds 0 and 1 (F4) -> 6+6+3+3=18.
    // Per hit: d6(5) + mod(abil 5 + wb 3) = 13. Heroic Warrior never fires (no
    // misses); Vex is set but advantage is irrelevant under a constant Rng.
    expect(championRanged(constRng(X), 17, 1)).toEqual({ dealt: 18 * 13, prevented: 0 });
  });

  it('thiefRanged L17 carries +3 on BOTH hands (off-hand gets wb but not the ability mod)', () => {
    // 5 turns (Thief's Reflexes doubles round 0), 2 shots each, all hits.
    // Main hand: d6(5) + mod(5+3) = 13. Off-hand: d6(5) + wb(3) = 8 — the
    // off-hand deliberately gets the item bonus without the ability modifier
    // (no TWF feat on this build). Sneak Attack once per turn: 9d6 = 45.
    expect(thiefRanged(constRng(X), 17, 1)).toEqual({ dealt: 5 * (13 + 8 + 45), prevented: 0 });
  });

  it('bladelock L17 pact greatsword carries +3 (spell-attack rows stay itemless)', () => {
    // natk=3. Round dice: attack 1 = 2d6 + 1d6 Hex + 1d6 Devouring (once per
    // round, L9+) = 20; attacks 2-3 = 2d6 + 1d6 = 15. Flat per hit = cha 5 +
    // wb 3 = 8. Round = 28 + 23 + 23 = 74.
    // Eldritch Smite: pact slots 4 minus 1 paid for Hex in combat 1 (F26) = 3
    // castings, one per round for rounds 0-2, (1 + slot level 5) = 6d8 at
    // face 6 = 36, undoubled (no crit).
    expect(fiend(constRng(X), 17, 1, true, false)).toEqual({
      dealt: 4 * 74 + 3 * 36,
      prevented: 0,
    });
  });
});

describe('ranged Veteran: TWF mod on the off-hand, Archery gated to L13+ (F8)', () => {
  it('L17 hand crossbows: the ability modifier is added to BOTH shots', () => {
    // hit = 11 + wb(3) + 2 (Archery at 13+) = 16; d20=15 -> plain hit (crit 18).
    // Weapon die rr(d6) -> face 5 (a 5 is not a 2, so Deuces never rerolls).
    // Per shot: 5 + mod(5+3) = 13 — the off-hand shot gets `mod` too (F8).
    // Sneak Attack once per round: sa=17 dice, +8 Old Reserves in round 0 only
    // (once per combat) -> 25d6 then 17d6, every die face 5.
    const perShot = 13;
    const round0 = perShot + 25 * 5 + perShot; // 151
    const laterRound = perShot + 17 * 5 + perShot; // 111
    expect(veteran(constRng(X), 17, 1, true)).toEqual({
      dealt: round0 + 3 * laterRound,
      prevented: 0,
    });
  });

  it('L11 hand crossbows do NOT get the Archery Fighting Style: a d20 of 6 misses', () => {
    // Archery arrives with the L13 Fighting Style feature. At L11 the ranged
    // to-hit is 9 + wb(2) = 11, so a d20 of 6 totals 17 and misses AC 18. With
    // Archery wrongly applied it would total 19 and hit — so this total is the
    // whole no-hit consolation line and nothing else.
    // x=0.27 -> d20=6, and d6 -> 2, which Deuces Are Wild rerolls into another
    // 2, so every Sure Strike die scores 2.
    // Sure Strike = ceil(sa/2) = floor((11+1)/2) = 6 dice per round.
    expect(veteran(constRng(0.27), 11, 1, true)).toEqual({ dealt: 4 * 6 * 2, prevented: 0 });
  });
});

describe('advantage flags carry across round boundaries (F12/F13/F14) and Heroic Warrior fires (F18)', () => {
  // Draw-count guards — see the file header for why a damage total cannot
  // detect this defect class. Under ALWAYS_MIN every d20 is a natural 1, so
  // every attack misses, no damage dice are ever rolled, and the ONLY thing
  // the counter measures is how many d20s each attack asked for: 2 with
  // advantage, 1 without, plus 1 (or 2) more for a Heroic Warrior reroll.

  it('champion melee: Studied Attacks (L13+) survives the round boundary, and Heroic Warrior rerolls one miss per turn', () => {
    // L6 — no Heroic Warrior (L10+), no Studied Attacks (L13+):
    //   attacks = natk(2)+surge(2), then 2+2+2 = 10, one draw each = 10.
    // L11 — Heroic Warrior on, Studied Attacks still off:
    //   attacks = 6+3+3+3 = 15 single draws, + one reroll per round (`hi` is
    //   reset every round and spent on that round's first miss) = 15+4 = 19.
    // L17 — both on. `ma` starts false, so round 0's first attack is a plain
    //   roll (1) plus a plain reroll (1); every later attack in the combat is
    //   advantaged (2), including the reroll:
    //   round 0 (6 attacks): 2 + 5*2               = 12
    //   round 1 (6 attacks, surge again at 17):
    //           first attack 2 + reroll 2, + 5*2   = 14
    //   rounds 2 and 3 (3 attacks each): 2+2 + 2*2 =  8 each
    //   total = 12 + 14 + 8 + 8 = 42
    // If `ma` were re-initialised per round (F14), rounds 1-3 would open with
    // an unadvantaged pair and the total would fall to 36; with no Heroic
    // Warrior at all (F18) it would be 35.
    const expected = { 6: 10, 11: 19, 17: 42 } as const;
    for (const L of [6, 11, 17] as const) {
      const c = drawCounter(ALWAYS_MIN);
      champion(c.rng, L, 1);
      expect(c.draws(), `champion L${L} d20 draws`).toBe(expected[L]);
    }
  });

  it('championRanged: Vex survives the round boundary (F13)', () => {
    // L6 (no Heroic Warrior, no Studied Attacks) isolates Vex completely.
    // Round 0 has 4 attacks (natk 2 + Action Surge 2): three miss, the fourth
    // hits and sets Vex. Round 0's own draws: 3 misses + 1 hit + 1 damage die.
    // Round 1's FIRST attack must then be advantaged (2 draws) — that is the
    // carry. It misses, clearing Vex; everything after is single-draw.
    // Correct total: 5 (round 0) + 2 + 1 (round 1) + 2 + 2 (rounds 2-3) = 12.
    // With Vex re-initialised per round it is 10.
    const HIT = 0.7; // d20=15; hit = 7+wb(1)+2 = 10 -> 25 vs AC 16; crit is 19+
    const values = [
      MISS, MISS, MISS, // round 0 attacks 1-3
      HIT, DAMAGE_DIE_MID, // round 0 attack 4 hits: d6=4, + mod(abil 4 + wb 1) = 9
      MISS, MISS, // round 1 attack 1 — an ADVANTAGE PAIR, both natural 1s
      MISS, // round 1 attack 2 (Vex cleared by the miss)
      MISS, MISS, // round 2
      MISS, MISS, // round 3
    ];
    const c = drawCounter(scriptedRng(values));
    const r = championRanged(c.rng, 6, 1);
    expect(r).toEqual({ dealt: 4 + 5, prevented: 0 });
    expect(c.draws()).toBe(12);
  });

  it('thiefRanged: Vex carries across attacks, turns AND rounds (F12 — the carry was dead code)', () => {
    // L3: hit = 5, AC 14, sa = 2d6, mod = 3, wb = 0. One turn per round.
    // Round 0 attack 1 misses; attack 2 hits (off-hand: d6 + wb only) and
    // takes Sneak Attack; Vex is set. Round 1's first attack is then rolled as
    // an advantage PAIR whose high die hits.
    const HIT = 0.7; // d20=15 -> 20 vs AC 14
    const values = [
      MISS, // round 0 attack 1
      HIT, DAMAGE_DIE_MID, DAMAGE_DIE_MID, DAMAGE_DIE_MID, // attack 2: d6=4 (+wb 0), then 2d6 Sneak Attack
      MISS, HIT, // round 1 attack 1: advantage pair, high die = 15 -> hit
      DAMAGE_DIE_MID, DAMAGE_DIE_MID, DAMAGE_DIE_MID, // d6=4 + mod(3), then 2d6 Sneak Attack
      MISS, MISS, // round 1 attack 2 (advantage pair after the hit) -> miss
      MISS, MISS, // round 2 (Vex cleared)
      MISS, MISS, // round 3
    ];
    const r = thiefRanged(scriptedRng(values), 3, 1);
    // Round 0: (4 + 0) + 8 = 12. Round 1: (4 + 3) + 8 = 15.
    expect(r).toEqual({ dealt: 27, prevented: 0 });
  });
});

describe('Innate Sorcery covers exactly the first 2 combats of a day (F16)', () => {
  it('sorcwiz L11 day: advantage costs a second d20 per attack, and stops after combat 2', () => {
    // Ray queue at L11 is 11 entries [6,6,5,5,5,4,4,4,3,3,3] consumed one per
    // round across the whole day (F1), then 5 dry Fire Bolt rounds:
    //   combat 1 (rounds 0-3):  6+6+5+5 = 22 attacks, WITH advantage -> 44 draws
    //   combat 2 (rounds 4-7):  5+4+4+4 = 17 attacks, WITH advantage -> 34 draws
    //   combat 3 (rounds 8-11): 3+3+3 + 1 Fire Bolt = 10 attacks, no adv -> 10
    //   combat 4 (rounds 12-15): 4 Fire Bolts = 4 attacks, no adv       ->  4
    // total 92. If Innate Sorcery ran all day (the F16 bug) it would be 106.
    const c = drawCounter(ALWAYS_MIN);
    const r = sorcwiz(c.rng, 11, 4);
    expect(r).toEqual({ dealt: 0, prevented: 0 });
    expect(c.draws()).toBe(92);
  });
});

describe('a crit rolls doubled DICE, not a doubled sum (F24)', () => {
  it('bladelock crit at L6 draws 2n dice and totals their distinct faces', () => {
    // Under an all-max or all-equal Rng the two implementations agree, so this
    // needs distinct faces. x = (face - 0.5)/6 lands mid-bucket for a d6.
    const f = (face: number): number => (face - 0.5) / 6;
    const CRIT = 0.999; // d20 = 20
    const D8_MIN = 0.0; // every d8 shows 1
    // L6 bladelock: natk=2, hit = 7 + wb(1) = 8 vs AC 16, cha 4.
    // Crit dice: [2d6 weapon] -> 4d6, [1d6 Hex] -> 2d6 (Devouring is L9+).
    // Faces 1..6 in draw order sum to 21; + cha(4) + wb(1) = 26.
    // Doubling the summed roll instead would draw only 3 dice (faces 1,2,3 = 6)
    // and double to 12 — a different total AND a different draw count.
    const values = [
      CRIT, // round 0 attack 1: natural 20
      f(1), f(2), f(3), f(4), // weapon 2d6 doubled -> 4 dice
      f(5), f(6), // Hex 1d6 doubled -> 2 dice
      MISS, // round 0 attack 2 misses
      ...repeat(D8_MIN, 8), // Eldritch Smite: (1 + slot level 3) = 4d8, doubled by the crit
      MISS, MISS, // round 1
      MISS, MISS, // round 2
      MISS, MISS, // round 3
    ];
    const r = fiend(scriptedRng(values), 6, 1, true, false);
    // 21 + 4 + 1 = 26 from the crit, plus 8d8 of face 1 = 8 from the smite.
    // Rounds 1-3 have no hits and the single pact slot is already spent.
    expect(r).toEqual({ dealt: 26 + 8, prevented: 0 });
  });
});

describe('caster rows are null below their level floor (F21)', () => {
  it('sorcwiz and valor return null at L3 and L6, and a result at L11/L17', () => {
    for (const L of [3, 6] as const) {
      expect(sorcwiz(ALWAYS_MIN, L, 1)).toBeNull();
      expect(valor(ALWAYS_MIN, L, 1)).toBeNull();
    }
    for (const L of [11, 17] as const) {
      expect(sorcwiz(ALWAYS_MIN, L, 1)).not.toBeNull();
      expect(valor(ALWAYS_MIN, L, 1)).not.toBeNull();
    }
  });
});

describe('monk: Rebuking Shield is not restored free by a re-manifest (N3)', () => {
  it('L17 initManifest: after Concentration breaks, the re-manifested Hands retaliate no more', () => {
    // The 2026-08-10 ruling prices the retaliation as a +3 Focus upgrade bought
    // at initiative; it ends with the manifestation and a plain 4-Focus
    // re-manifest does NOT re-buy it. Two hits are taken here, both out of the
    // Shield band and both undiverted:
    //   round 0 — Hands are up AND upgraded -> 2d8 Psychic retaliation (dealt
    //             += 10), then the Concentration save fails and both flags drop
    //   round 1 — the monk re-manifests for 4 Focus and takes another hit; the
    //             retaliation must NOT fire, and the save is made
    // dealt is therefore exactly one 2d8 retaliation. If the retaliation were
    // still gated on `initManifest` (the N3 bug) it would fire twice (20), and
    // if the Concentration break failed to clear the upgrade it would too.
    const HIT_OOB = 0.7; // d20=15 -> 15+11 = 26; >= monkAC 20 and >= 25, so outside the [AC, AC+4] Shield band
    const CONC_FAIL = 0.22; // d20=5 -> 5+2 = 7 < DC 10
    const CONC_PASS = 0.7; // d20=15 -> 17 >= DC 10
    const values = [
      // --- round 0: Hands already up (manifested at initiative), Focus 9 ---
      ...repeat(MISS, 12), // 6 attacks (2 + slap + 3 Flurry), each an advantage pair
      MISS, MISS, // Court Cantrip, also advantaged
      SKIP_PROB, // enemy A does not defy the goad
      HIT_OOB, // A attack 1 lands, outside the Shield band
      ...repeat(MIRROR_DECLINE, 3), // 3 duplicates, every d6 declines
      ...repeat(DAMAGE_DIE_MID, 3), // the hit's 3d8 (face 5) + 6 flat = 21
      ...repeat(DAMAGE_DIE_MID, 2), // Rebuking Shield retaliation 2d8 = 10 -> dealt
      CONC_FAIL, // Concentration breaks: hands AND the shield upgrade drop
      MISS, MISS, // A attacks 2-3 miss
      SKIP_PROB, // enemy B is on an ally
      // --- round 1: re-manifest for 4 Focus (no Bonus Action left for Flurry) ---
      ...repeat(MISS, 6), // 3 attacks (2 + slap), advantaged again
      MISS, MISS, // Court Cantrip (Focus was spent on the manifest)
      SKIP_PROB,
      HIT_OOB,
      ...repeat(MIRROR_DECLINE, 3),
      ...repeat(DAMAGE_DIE_MID, 3), // NO retaliation draws follow: the upgrade is gone
      CONC_PASS,
      MISS, MISS,
      SKIP_PROB,
      // --- rounds 2-3: Hands up, Flurry back on, everything quiescent ---
      ...repeat(MISS, 12), MISS, MISS, SKIP_PROB, MISS, MISS, MISS, SKIP_PROB,
      ...repeat(MISS, 12), MISS, MISS, SKIP_PROB, MISS, MISS, MISS, SKIP_PROB,
    ];
    expect(monk(scriptedRng(values), 17, 1, true)).toEqual({ dealt: 10, prevented: 0 });
  });
});

describe('monk: Shield costs the round\'s one Reaction (N2), already spent at initiative (N9)', () => {
  it('L17 initManifest round 1: an in-band hit is NOT blocked, because the Reaction manifested the Hands', () => {
    // The initiative manifestation is a Reaction held "until the monk's first
    // turn", so round 1 has no Reaction left for Shield. The enemy attack here
    // lands squarely in the [AC, AC+4] band with a full Shield pool available:
    // the only reason it must not be absorbed is the Reaction budget.
    // Absorbing it would put 21 into `prevented` and skip both the retaliation
    // and the Concentration save.
    const HIT_IN_BAND = 0.55; // d20=12 -> 23, in [monkAC 20, 24]
    const CONC_PASS = 0.7;
    const values = [
      ...repeat(MISS, 12), // round 0: 6 advantaged attacks
      MISS, MISS, // Court Cantrip
      SKIP_PROB, // A does not defy the goad
      HIT_IN_BAND,
      ...repeat(MIRROR_DECLINE, 3), // duplicates decline, so Shield is the only thing left
      ...repeat(DAMAGE_DIE_MID, 3), // the hit lands: 3d8 + 6 = 21
      ...repeat(DAMAGE_DIE_MID, 2), // Rebuking Shield retaliation (Hands are up and upgraded)
      CONC_PASS, // DC = max(10, floor(21/2)) = 10
      MISS, MISS,
      SKIP_PROB,
      // rounds 1-3: quiescent (Focus still funds Flurry every round)
      ...repeat(MISS, 12), MISS, MISS, SKIP_PROB, MISS, MISS, MISS, SKIP_PROB,
      ...repeat(MISS, 12), MISS, MISS, SKIP_PROB, MISS, MISS, MISS, SKIP_PROB,
      ...repeat(MISS, 12), MISS, MISS, SKIP_PROB, MISS, MISS, MISS, SKIP_PROB,
    ];
    expect(monk(scriptedRng(values), 17, 1, true)).toEqual({ dealt: 10, prevented: 0 });
  });
});

describe('Veteran Reflexes is a Reaction: at most one use per round (N4)', () => {
  it('L17: three in-band enemy hits in one round, exactly one turned into a miss', () => {
    // The Veteran's pool is PB(6) uses per Long Rest, so the pool cannot be
    // what stops the 2nd and 3rd flip — only the one-Reaction-per-round budget
    // can. Enemy roll 9 -> 9+11 = 20, at or above the Veteran's AC 17 and
    // below AC+PB = 23, i.e. inside the flip band, and not a crit.
    const IN_BAND = 0.4; // d20 = 9
    const round = (enemy: number[]): number[] => [
      MISS, MISS, // the Veteran's main hand (Steady Aim advantage pair)
      MISS, // off-hand
      ...repeat(MISS, 9), // Sure Strike consolation: floor((17+1)/2) = 9 d6, face 1
      ...enemy,
    ];
    const values = [
      ...round([
        IN_BAND, ...repeat(DAMAGE_DIE_MID, 3), // hit 1: flipped, prevented += 3d8(5) + 6 = 21
        IN_BAND, // hit 2: also in band, also with pool left — but no Reaction
        IN_BAND, // hit 3: likewise
      ]),
      ...round([MISS, MISS, MISS]),
      ...round([MISS, MISS, MISS]),
      ...round([MISS, MISS, MISS]),
    ];
    expect(veteran(scriptedRng(values), 17, 1)).toEqual({ dealt: 4 * 9, prevented: 21 });
  });
});

describe('monk: absorbed crits are credited at crit damage (N5)', () => {
  it('L3: a natural 20 diverted onto a Mirror Image duplicate credits DOUBLED dice', () => {
    // ENEMY[3] deals 1d8+4. A diverted crit must credit 2d8+4 = 14, not 9.
    const CRIT = 0.999; // d20 = 20 — pierces the Shield band, but Mirror Image still diverts
    const values = [
      ...repeat(MISS, 5), // round 0: 4 attacks (1 + slap + 2 Flurry) + Court Cantrip
      SKIP_PROB, // A does not defy the goad
      CRIT,
      MIRROR_DECLINE, MIRROR_TRIGGER, MIRROR_DECLINE, // one of the 3 duplicates takes it
      DAMAGE_DIE_MID, DAMAGE_DIE_MID, // 2d8 (face 5) because it was a crit -> +4 flat
      MISS, // A attack 2
      SKIP_PROB, // B is on an ally
      ...repeat(MISS, 5), SKIP_PROB, MISS, MISS, SKIP_PROB, // round 1 (last Focus point)
      ...repeat(MISS, 2), SKIP_PROB, MISS, MISS, SKIP_PROB, // round 2 (Focus dry: no Flurry, no cantrip)
      ...repeat(MISS, 2), SKIP_PROB, MISS, MISS, SKIP_PROB, // round 3
    ];
    expect(monk(scriptedRng(values), 3, 1)).toEqual({ dealt: 0, prevented: 14 });
  });
});

describe("monk return fire is resolved against the monk's own AC ladder (F10/F25)", () => {
  it('L6: an enemy total of 18 misses AC 19 — Warding Image\'s +2 is permanent, not a consumable', () => {
    // MONK_AC at L6 is 10 + Dex 3 + Wis 4 + Warding Image 2 = 19. An enemy
    // roll of 11 totals 18: enough to hit the generic front-liner AC (DEF_AC
    // 18) and enough to hit an unwarded monk (17), but not this monk. Nothing
    // is absorbed, nothing is diverted, and no Shield charge is spent — and
    // because scriptedRng throws the moment it is over-drawn, a regression
    // that lets these attacks land fails loudly rather than silently.
    const GRAZING_MISS = 0.52; // d20 = 11 -> 11 + 7 = 18
    const quietRound = [
      ...repeat(MISS, 6), // 5 attacks (2 + slap + 2 Flurry) + Court Cantrip
      SKIP_PROB, // A does not defy the goad
      GRAZING_MISS, GRAZING_MISS, // both of A's attacks fall one short
      SKIP_PROB, // B is on an ally
    ];
    const values = [...quietRound, ...quietRound, ...quietRound, ...quietRound];
    expect(monk(scriptedRng(values), 6, 1)).toEqual({ dealt: 0, prevented: 0 });
  });
});

describe('run.ts reports uncertainty and keeps rows on common random numbers (F19)', () => {
  async function captureBoard(): Promise<string[]> {
    const original = process.argv.slice();
    process.argv = [...process.argv.slice(0, 2), '3'];
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.map((a) => String(a)).join(' '));
    });
    vi.resetModules();
    try {
      await import('./run.ts');
    } finally {
      spy.mockRestore();
      process.argv = original;
    }
    return lines;
  }

  it('every data row ends with a 95% CI half-width, and identical builds print identical cells', async () => {
    const lines = await captureBoard();
    const dataRows = lines.filter((l) => l.includes(' | day: '));
    expect(dataRows.length).toBeGreaterThan(10);
    for (const row of dataRows) {
      // F19: differences smaller than two rows' combined ± are noise, so the
      // ± must be on every row, not just reported once.
      expect(row, `row without a CI: ${row}`).toMatch(/±\d+\.\d$/);
    }

    // Common random numbers: every row re-seeds mulberry32(seed + level) per
    // cell, so two rows running the same code must print the same numbers.
    // `monk` and `monk(initManifest)` are documented as identical below L17,
    // which makes them the board's own built-in CRN check. Without the
    // per-row/per-cell reseed (a single shared stream) the second row would
    // read different draws and these cells would diverge.
    const dealtStart = lines.findIndex((l) => l.includes('=== DAMAGE DEALT'));
    const dealtEnd = lines.findIndex((l) => l.includes('=== DAMAGE PREVENTED'));
    expect(dealtStart).toBeGreaterThanOrEqual(0);
    expect(dealtEnd).toBeGreaterThan(dealtStart);
    const dealt = lines.slice(dealtStart, dealtEnd);
    const burstCells = (prefix: string): string[] => {
      const row = dealt.find((l) => l.startsWith(prefix));
      if (row === undefined) throw new Error(`no board row starting "${prefix}"`);
      return (row.slice(44).split(' | day: ')[0] ?? '').trim().split(/\s+/);
    };
    const plain = burstCells('BARBED COURT (fights-back env)');
    const init = burstCells('BARBED COURT (init manifest @17)');
    expect(plain).toHaveLength(4);
    expect(init.slice(0, 3)).toEqual(plain.slice(0, 3)); // L3/L6/L11 must match exactly
  });
});
