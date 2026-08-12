// DPR + damage-prevented Monte Carlo sim for the homebrew subclasses vs
// optimized 2024 builds.
//
// Rules are verified against SRD 5.2.1 where the content exists there. Three
// comparator picks are 2024 PHB content absent from the SRD and are used as
// standard "optimized 2024" builds only: Oath of Vengeance (Vow of Enmity),
// the Great Weapon Master feat, and College of Valor. Everything else,
// including every homebrew-vs-SRD claim, is anchored to the SRD text.
//
// Lineage: consolidation of sim4.py (post-audit corrected builds), the
// equal-items overlay, sim5.py (Oath of Domination), and the monk-17
// initiative-manifest variant — then corrected by the 2026-08-10 dual-reviewer
// consensus pass (opus + sol). The Python dprsim.py preserved alongside the
// session is the PRE-FIX board; this file is canonical and intentionally
// diverges from it by the fix list below.
//
// Basis:
//   - Levels 3/6/11/17. Enemy AC 14/16/18/18. Primary 16 -> 18 (ASI@4) -> 20 (ASI@8).
//   - burst = one 4-round combat, fresh short-rest resources, day-fresh long-rest pools.
//   - day   = 4 combats x 4 rounds with Short Rests between; Long-Rest resources
//             (spell slots, smite queues, Shield-slot pools, Innate Sorcery uses)
//             are shared across the day; Short-Rest resources refresh per combat.
//   - Items (owner ruling 2026-08-10): +1/+2/+3 weapon at 6/11/17 for ALL weapon
//     builds, melee and ranged, including the bladelock's pact weapon. Builds
//     whose attacks are spells (Eldritch Blast volleys, Scorching Ray rows) stay
//     itemless: the SRD has no generic +X spell-attack item. The Barbed Court
//     monk's ladder (Barbed Fists +1/+2/+3) IS its item.
//   - Barbed Court monk runs in the fights-back environment (2 enemies, one
//     goad-bound, one 50% defector; Concentration saves Con +2 vs DC 10, with
//     a Long-Rest pool of Shield casts absorbing threats in the 18-22 band).
//   - Other builds run against dummies (no return fire); casters flagged as such.
//
// Declared assumptions (consensus-reviewed):
//   - Party context: an ally is adjacent to the target, so Sneak Attack is legal
//     on hits without Advantage (SRD ally-within-5-feet clause). The repo is a
//     party simulator; the monk's environment explicitly includes a party.
//   - The CME caster rows fight inside their own 15-foot Emanation (the build's
//     defining posture), so the rider applies to their ray/attack hits. CME's
//     10-minute duration and re-cast cost across a 4-combat day are NOT modeled;
//     the caster day column is therefore an upper bound.
//   - Initiative: the party acts before the enemy each round (Command's lost
//     turn lands in the same round the save fails).
//   - Enemy Wis save +2 at every level; no Legendary Resistance.
//
// DAMAGE PREVENTED channel: every build returns { dealt, prevented }.
//   Prevented = enemy damage that would have landed but was negated by a
//   build's control/defense feature, sampled against the standard enemy
//   offense profile (ENEMY below).
//
// Full defensive accounting (owner ruling 2026-08-10):
//   - Domination: Grovel turn-loss (a failed save ends the enemy's turn).
//   - Barbed Court: return fire is derived from ENEMY[L] against the monk's
//     real AC (Unarmored Defense 10 + Dex 3 + Wis, plus Warding Image +2 from
//     L6 -> AC 16/19/20/20). Shield casts (Long-Rest pool = 1st-level slots)
//     convert hits in the [AC, AC+4] band; Mirror Image (Faces of the Court,
//     PB castings per Long Rest, declared pre-cast before each combat while
//     the pool lasts) diverts attacks on a d6 of 3+, destroying one image;
//     the goad-bound enemy defies the bind 25% of rounds (declared rate) and
//     attacks an ally at Disadvantage, crediting the damage the Disadvantage
//     removed; Concentration DC = max(10, floor(damage/2)) on hits that land.
//     Rebuking Shield's 2d8 Psychic retaliation (initManifest row) fires on
//     each melee hit the monk takes while the upgraded Hands last (dealt).
//   - Veteran melee: Veteran Reflexes (L13+, PB uses per Long Rest) turns a
//     hit within PB of the Veteran's AC (15/16/17/17) into a miss.
//   Declared washes and exclusions: Aura of Protection (both paladin rows),
//   Uncanny Dodge (both rogue rows), Aura of Certainty (no Charm effects in
//   the environment), Bane (off the optimal line), ranged-Veteran incoming
//   fire (out of melee reach). Also unmodeled (monk dealt undercount): Innate
//   Sorcery of the Court advantage on Court Cantrip rolls.
//   Comparability notes (N6/N7): the Valor bard's Battle Magic and dry-round
//   weapon swings stay itemless with the rest of its caster row (declared,
//   not an oversight). Prevented rows are not on a common incoming stream —
//   the monk faces ~1.75 enemy attack streams per round, the Veteran 1 — so
//   prevented compares a build against its own exposure, not build vs build.
//   Enemy attacks are assumed melee and Psychic-immunity-free for Rebuking
//   Shield retaliation (N8).
//
// Consensus fixes applied (2026-08-10, opus F# / sol F#):
//   F1  caster day columns share one Long-Rest slot queue (were re-nova'ing per combat)
//   F2  bladelock pact weapon + all ranged weapon rows get the items ladder (owner ruling)
//   F3  initManifest monk can re-manifest Hands after a Concentration break
//   F4  Champion: second Action Surge at 17 (both champion rows)
//   F5  Graze = ability modifier only (SRD text; weapon bonus removed)
//   F6  L17 smite queues include the four 1st-level slots (both paladins)
//   F7/solF2  Eldritch Smite gated to Warlock 5+
//   F8/solF3  ranged Veteran = hand crossbows, TWF feat mod on both shots, Archery at 13+
//   F9  monk Shield absorbs draw from a Long-Rest pool (2/3/4/4), not per-combat
//   F12 thiefRanged Vex actually carries (dead branch fixed)
//   F13/F14 Vex and Studied Attacks carry across round boundaries
//   F16 Innate Sorcery limited to 2 combats per day
//   F18 Champion Heroic Warrior (L10+): reroll one missed attack per turn
//   F23 paladin comment corrected (greedy slots; dice double when any hit crits)
//   F24 bladelock crits roll doubled dice instead of doubling the sum
//   F26 Hex paid once per day (upcast duration 4/8/24 hours spans Short Rests);
//       Darkness (Conc, 10 min) still re-paid per combat
//   solF7 dead `rnd === 0` disjunct removed from monk `spent`
//   solF8 monk `focus = L - 1` documented (goad FP, assumed spent round 1 —
//         declared simplification: charged even on an all-miss round)
//
// Oath of Domination (docs/homebrew/cc-by/2026-08-03-oath-of-domination-subclass.md,
// conformed to the 2024 subclass skeleton by owner rulings 2026-08-11 — see
// rulings.md):
//   L3 Channel Divinity, one option on the class pool (2 uses, one back per
//   Short Rest, 3 from L11 — the paladin's only Short-Rest resource):
//     Voice of Domination: immediately after casting Divine Smite, 1 CD
//       (no action) -> 1 minute of Bonus-Action slotless Command.
//   (Foreseen Strike was dropped by owner ruling 2026-08-11: per CD use it
//   was dominated by Voice and would never be chosen.)
//   Commands require Voice active (no slot-cast fallback is modeled).
//   L7 also upgrades Command targeting to every chosen creature in the aura;
//   the single-enemy model cannot price that, so the 11/17 control/prevented
//   numbers UNDERSTATE the kit against groups.
//   L7 Aura of Certainty (final owner ruling 2026-08-11): paladin Blindsight
//   at the aura's radius + allies inside don't provoke Opportunity Attacks +
//   comprehension ribbon. Worth ~0 in this single-character, no-vision-denial
//   model — deliberately unmodeled. The save-Disadvantage amplifier moved to
//   Dominion Foretold (level 20, outside the modeled bands).
//   Grovel on a failed Wis save: the target falls Prone and its turn ends
//   (its whole turn is lost) -> our melee attacks NEXT round have Advantage.
//   A Command round cannot also Bonus-Action Divine Smite. Cha 16 flat on
//   the Dex build -> DC 13/14/15/17.
//   L15 Formation and L20 Dominion are out of the modeled bands' resource
//   picture (Formation is Cha-mod/LR support movement; Dominion is 10 min,
//   1/LR + level-5-slot reload).

// --- RNG ---------------------------------------------------------------------
// Every build takes an injectable Rng (uniform [0,1)) so tests can pin the
// sequence. mulberry32 provides reproducible runs.

export type Rng = () => number;

/** Small seeded PRNG (mulberry32) for reproducible runs and tests. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Level = 3 | 6 | 11 | 17;

export interface CombatResult {
  dealt: number;
  prevented: number;
}

export const AC: Record<Level, number> = { 3: 14, 6: 16, 11: 18, 17: 18 };
export const WB: Record<Level, number> = { 3: 0, 6: 1, 11: 2, 17: 3 }; // equal-items weapon bonus

// Standard enemy offense profile per level band: (attacks, to-hit, dice n, dice s, flat).
export const ENEMY: Record<Level, readonly [number, number, number, number, number]> = {
  3: [2, 5, 1, 8, 4],
  6: [2, 7, 2, 6, 4],
  11: [3, 9, 2, 8, 5],
  17: [3, 11, 3, 8, 6],
};
// Typical defender AC the prevented damage is sampled against (front-liner).
export const DEF_AC: Record<Level, number> = { 3: 17, 6: 18, 11: 19, 17: 20 };

function randInt(rng: Rng, s: number): number {
  return Math.floor(rng() * s) + 1;
}

function d(rng: Rng, n: number, s: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += randInt(rng, s);
  return total;
}

function rr(rng: Rng, s: number): number {
  // Deuces Are Wild: reroll a 2 once (Veteran damage dice only).
  const v = randInt(rng, s);
  return v === 2 ? randInt(rng, s) : v;
}

function roll(rng: Rng, adv: boolean): number {
  const r = randInt(rng, 20);
  return adv ? Math.max(r, randInt(rng, 20)) : r;
}

function enemyTurnDamage(rng: Rng, L: Level): number {
  // Sample the damage one enemy turn would deal against a typical front-liner.
  const [natk, th, dn, ds, fl] = ENEMY[L];
  let dmg = 0;
  for (let i = 0; i < natk; i++) {
    const r = randInt(rng, 20);
    const crit = r === 20;
    if (r === 1 || (r + th < DEF_AC[L] && !crit)) continue;
    dmg += d(rng, dn * (crit ? 2 : 1), ds) + fl;
  }
  return dmg;
}

function enemyHitDamage(rng: Rng, L: Level): number {
  // Sample the damage of one enemy hit (for an attack negated by an AC bump).
  const [, , dn, ds, fl] = ENEMY[L];
  return d(rng, dn, ds) + fl;
}

// Divine Smite queues, shared by both paladins. Dice count = slot level + 1;
// the leading 2 is the free Paladin's Smite (one per Long Rest). Slots per the
// SRD Paladin table: L3 = 3x1st; L6 = 4x1st 2x2nd; L11 = 4/3/3;
// L17 = 4/3/3/3/1 (F6: the four 1st-level entries were missing at 17).
const SMITE_Q: Record<Level, readonly number[]> = {
  3: [2, 2, 2, 2],
  6: [2, 3, 3, 2, 2, 2, 2],
  11: [2, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2],
  17: [2, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2],
};

// --- MELEE, equal items -----------------------------------------------------

export function paladin(rng: Rng, L: Level, nc: number): CombatResult {
  // Dex Vengeance paladin (Vow of Enmity: 2024 PHB, not SRD — see header).
  // Round-1 BA = Vow of Enmity (advantage all combat, no round-1 smite).
  // Divine Smite is a BA spell: one per turn on a round with a hit, greediest
  // slot first; the smite's dice are doubled when any hit that turn was a crit.
  const wb = WB[L];
  const hit = ({ 3: 5, 6: 7, 11: 9, 17: 11 } as const)[L] + wb;
  const ac = AC[L];
  const mod = ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L] + wb;
  const natk = ({ 3: 2, 6: 3, 11: 3, 17: 3 } as const)[L];
  const rad = L >= 11 ? 1 : 0; // Radiant Strikes
  const qq = [...SMITE_Q[L]].sort((a, b) => b - a);
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    for (let rnd = 0; rnd < 4; rnd++) {
      const can = rnd > 0;
      const hits: boolean[] = [];
      for (let i = 0; i < natk; i++) {
        const r = roll(rng, true);
        const crit = r === 20;
        if (r === 1 || (r + hit < ac && !crit)) continue;
        dealt += d(rng, crit ? 2 : 1, 6) + mod + d(rng, rad * (crit ? 2 : 1), 8);
        hits.push(crit);
      }
      if (can && qq.length > 0 && hits.length > 0) {
        const sm = qq.shift() as number;
        dealt += d(rng, sm * (hits.some(Boolean) ? 2 : 1), 8);
      }
    }
  }
  return { dealt, prevented: 0 };
}

export type DominationPolicy = 'smite' | 'mix' | 'adaptive' | 'control';

export function domination(
  rng: Rng,
  L: Level,
  nc: number,
  policy: DominationPolicy = 'adaptive',
): CombatResult {
  // Oath of Domination on the same chassis, conformed kit (header).
  // Policies (all levels share the CD economy; Voice is the level-3 option):
  //   smite   : never Command; CD goes unspent (pure dealt ceiling).
  //   mix     : activate Voice on the round-1 smite; Command round 2; smite
  //             rounds 3-4.
  //   adaptive: activate Voice on the round-1 smite, then Command until a
  //             Grovel lands, smiting on advantage rounds (and commanding
  //             once the queue is dry).
  //   control : activate on the round-1 smite; Command rounds 2-4.
  // Voice requires a smite THIS combat (activation is smite-triggered and
  // the 1-minute duration covers one combat); a dry queue in the day tail
  // means no activation, so those rounds are attacks only.
  // A failed Grovel save ends the enemy's turn: the lost turn is sampled into
  // the prevented channel, and next round's melee attacks have Advantage.
  const wb = WB[L];
  const hit = ({ 3: 5, 6: 7, 11: 9, 17: 11 } as const)[L] + wb;
  const ac = AC[L];
  const mod = ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L] + wb;
  const natk = ({ 3: 2, 6: 3, 11: 3, 17: 3 } as const)[L];
  const rad = L >= 11 ? 1 : 0;
  const dc = ({ 3: 13, 6: 14, 11: 15, 17: 17 } as const)[L];
  const cdCap = L >= 11 ? 3 : 2;
  const qq = [...SMITE_Q[L]].sort((a, b) => b - a);
  let cd = cdCap;
  let dealt = 0;
  let prevented = 0;
  for (let c = 0; c < nc; c++) {
    if (c > 0) cd = Math.min(cdCap, cd + 1); // Short Rest: one use back
    let voiceOn = false;
    let advNext = false;
    for (let rnd = 0; rnd < 4; rnd++) {
      const adv = advNext;
      advNext = false;
      let command = false;
      if (policy === 'mix') {
        command = voiceOn && rnd === 1;
      } else if (policy === 'adaptive') {
        command = voiceOn && rnd >= 1 && (!adv || qq.length === 0);
      } else if (policy === 'control') {
        command = voiceOn && rnd >= 1;
      }
      const hits: boolean[] = [];
      for (let i = 0; i < natk; i++) {
        const r = roll(rng, adv);
        const crit = r === 20;
        if (r === 1 || (r + hit < ac && !crit)) continue;
        dealt += d(rng, crit ? 2 : 1, 6) + mod + d(rng, rad * (crit ? 2 : 1), 8);
        hits.push(crit);
      }
      if (!command && qq.length > 0 && hits.length > 0) {
        const sm = qq.shift() as number;
        dealt += d(rng, sm * (hits.some(Boolean) ? 2 : 1), 8);
        if (policy !== 'smite' && !voiceOn && cd > 0) {
          cd -= 1; // Voice of Domination activates on this smite
          voiceOn = true;
        }
      } else if (command) {
        if (randInt(rng, 20) + 2 < dc) {
          advNext = true;
          prevented += enemyTurnDamage(rng, L);
        }
      }
    }
  }
  return { dealt, prevented };
}

function championCore(rng: Rng, L: Level, nc: number, ranged: boolean): CombatResult {
  // Champion Fighter, shared chassis for the melee (GWM greatsword — GWM is
  // 2024 PHB, not SRD) and ranged (hand-crossbow-free shortbow + Archery)
  // rows. Expanded crit 19 (18 at 15); Action Surge round 1 of each combat
  // plus round 2 at L17 (two uses per Short Rest, F4); Studied Attacks (L13+)
  // advantage after a miss, carried across round boundaries (F14); Heroic
  // Warrior (L10+): one Heroic Inspiration reroll of a missed attack per turn
  // (F18). Melee adds Graze (ability modifier only, F5), the GWM per-turn
  // bonus, and the GWM crit BA attack. Ranged carries Vex across rounds (F13).
  const wb = WB[L];
  const hit = ({ 3: 5, 6: 7, 11: 9, 17: 11 } as const)[L] + wb + (ranged ? 2 : 0); // Archery
  const ac = AC[L];
  const abil = ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L];
  const mod = abil + wb;
  const gwm = ranged ? 0 : ({ 3: 0, 6: 3, 11: 4, 17: 6 } as const)[L];
  const cm = L < 15 ? 19 : 18;
  const natk = ({ 3: 1, 6: 2, 11: 3, 17: 3 } as const)[L];
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    let ma = false; // Studied Attacks: advantage on next attack after a miss
    let vex = false; // ranged: Vex carries to the next attack
    for (let rnd = 0; rnd < 4; rnd++) {
      const surge = rnd === 0 || (L >= 17 && rnd === 1); // F4: two uses at 17
      let n = natk + (surge ? natk : 0);
      let gu = false;
      let ba = false;
      let hi = L >= 10; // Heroic Warrior: free Heroic Inspiration each turn
      let i = 0;
      while (i < n) {
        const adv = (ma && L >= 13) || (ranged && vex);
        let r = roll(rng, adv);
        let crit = r >= cm;
        let miss = r === 1 || (r + hit < ac && !crit);
        if (miss && hi) {
          // F18: reroll one missed attack with Heroic Inspiration
          hi = false;
          r = roll(rng, adv);
          crit = r >= cm;
          miss = r === 1 || (r + hit < ac && !crit);
        }
        ma = false;
        if (miss) {
          if (!ranged) dealt += abil; // Graze (F5: ability modifier only)
          ma = true;
          vex = false;
          i += 1;
          continue;
        }
        if (ranged) {
          dealt += d(rng, crit ? 2 : 1, 6) + mod;
          vex = true;
        } else {
          const rolls = crit ? 4 : 2;
          let weaponDamage = 0;
          for (let k = 0; k < rolls; k++) weaponDamage += Math.max(randInt(rng, 6), 3);
          dealt += weaponDamage + mod;
          if (!gu) {
            dealt += gwm;
            gu = true;
          }
          if (crit && !ba) {
            ba = true;
            n += 1;
          }
        }
        i += 1;
      }
    }
  }
  return { dealt, prevented: 0 };
}

export function champion(rng: Rng, L: Level, nc: number): CombatResult {
  return championCore(rng, L, nc, false);
}

export function championRanged(rng: Rng, L: Level, nc: number): CombatResult {
  return championCore(rng, L, nc, true);
}

export function thief(rng: Rng, L: Level, nc: number): CombatResult {
  // SRD Thief, shortsword (Vex) + scimitar (Nick): Steady Aim advantage on
  // attack 1, Vex carries to attack 2. Thief's Reflexes extra turn at 17.
  // Sneak Attack once per turn — legal on a no-advantage hit via the declared
  // adjacent-ally assumption (header). ~25% chance of an off-turn OA reaction SA.
  const wb = WB[L];
  const hit = ({ 3: 5, 6: 7, 11: 9, 17: 11 } as const)[L] + wb;
  const ac = AC[L];
  const sa = ({ 3: 2, 6: 3, 11: 6, 17: 9 } as const)[L];
  const mod = ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L] + wb;
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    for (let rnd = 0; rnd < 4; rnd++) {
      const turns = L >= 17 && rnd === 0 ? 2 : 1;
      for (let t = 0; t < turns; t++) {
        let got = false;
        let h1 = false;
        for (let i = 0; i < 2; i++) {
          const adv = i === 0 || h1;
          const r = roll(rng, adv);
          const crit = r === 20;
          const ok = r > 1 && (r + hit >= ac || crit);
          if (i === 0) h1 = ok;
          if (ok) {
            dealt += d(rng, crit ? 2 : 1, 6) + (i === 0 ? mod : wb);
            if (!got) {
              dealt += d(rng, crit ? sa * 2 : sa, 6);
              got = true;
            }
          }
        }
      }
      if (rng() < 0.25) {
        const r = roll(rng, false);
        const crit = r === 20;
        if (r > 1 && (r + hit >= ac || crit)) {
          dealt += d(rng, crit ? 2 : 1, 6) + mod + d(rng, crit ? sa * 2 : sa, 6);
        }
      }
    }
  }
  return { dealt, prevented: 0 };
}

export function veteran(rng: Rng, L: Level, nc: number, ranged = false): CombatResult {
  // Homebrew Veteran. SA dice: std+1 at 3/6, Rogue-level dice from 9.
  // Old Reserves: once per combat, +floor(L/2)d6 on a SA hit. Deuces rerolls
  // on weapon/SA dice. Crit 19 at 13, 18 at 17. Sure Strike consolation on a
  // no-SA round: half SA dice rounded up. SA on a no-advantage hit is legal
  // via the declared adjacent-ally assumption (header).
  // Melee = TWF shortsword+scimitar with Steady Aim.
  // Ranged (F8) = dual hand crossbows: the Old Training TWF feat adds the
  // ability modifier to the off-hand shot too; Archery Fighting Style (+2)
  // from the L13 Fighting Style feature; items ladder applies (owner ruling).
  // Veteran Reflexes (13+, melee row): the Veteran duels one ENEMY[L] enemy;
  // a Reaction (+PB AC, PB uses per Long Rest) flips a hit landing within PB
  // of the Veteran's AC (studded leather: 15/16/17/17) into a miss
  // (prevented += its damage). Ranged row: out of melee reach, no incoming
  // stream (declared). Uncanny Dodge is a declared wash (both rogue rows).
  const wb = WB[L];
  const hit =
    ({ 3: 5, 6: 7, 11: 9, 17: 11 } as const)[L] + wb + (ranged && L >= 13 ? 2 : 0);
  const ac = AC[L];
  const mod = ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L] + wb;
  const sa = ({ 3: 3, 6: 4, 11: 11, 17: 17 } as const)[L];
  const cm = L < 13 ? 20 : L < 17 ? 19 : 18;
  const boost = Math.floor(L / 2);
  const prof = ({ 3: 2, 6: 3, 11: 4, 17: 6 } as const)[L];
  const vac = ({ 3: 15, 6: 16, 11: 17, 17: 17 } as const)[L];
  const [enatk, eth, edn, eds, efl] = ENEMY[L];
  let dealt = 0;
  let prevented = 0;
  let reflexes = !ranged && L >= 13 ? prof : 0; // Veteran Reflexes, PB/LR pool
  for (let c = 0; c < nc; c++) {
    let b = 1;
    for (let rnd = 0; rnd < 4; rnd++) {
      let got = false;
      let h1 = false;
      for (let i = 0; i < 2; i++) {
        const adv = ranged ? i === 1 && h1 : i === 0 || h1;
        const r = roll(rng, adv);
        const crit = r >= cm;
        const ok = r > 1 && (r + hit >= ac || crit);
        if (i === 0) h1 = ok;
        if (ok) {
          const rolls = crit ? 2 : 1;
          let weaponDamage = 0;
          for (let k = 0; k < rolls; k++) weaponDamage += rr(rng, 6);
          dealt += weaponDamage + mod; // TWF feat: mod on both hands (F8)
          if (!got) {
            const ex = b > 0 ? boost : 0;
            if (ex) b -= 1;
            const n = sa + ex;
            const rollsN = crit ? n * 2 : n;
            let saDamage = 0;
            for (let k = 0; k < rollsN; k++) saDamage += rr(rng, 6);
            dealt += saDamage;
            got = true;
          }
        }
      }
      if (!got) {
        const cnt = Math.floor((sa + 1) / 2);
        let sureStrike = 0;
        for (let k = 0; k < cnt; k++) sureStrike += rr(rng, 6); // Sure Strike
        dealt += sureStrike;
      }
      if (!ranged) {
        // Incoming melee stream from the dueled enemy (prevented channel only).
        // N4: Veteran Reflexes is a Reaction — at most one use per round.
        let reactionFree = true;
        for (let k = 0; k < enatk; k++) {
          const r = randInt(rng, 20);
          const crit = r === 20;
          const total = r + eth;
          const wouldHit = r !== 1 && (total >= vac || crit);
          if (!wouldHit) continue;
          if (!crit && total < vac + prof && reflexes > 0 && reactionFree) {
            // Veteran Reflexes flips this hit into a miss.
            reflexes -= 1;
            reactionFree = false;
            prevented += d(rng, edn, eds) + efl;
          }
        }
      }
    }
  }
  return { dealt, prevented };
}

// Monk Shield-cast pool per Long Rest = the subclass's 1st-level slot count
// (Barbed Court Spellcasting: 2/3/4/4 at L3/6/11/17). F9: this is a Long-Rest
// resource; it must not refresh per combat.
const SHIELD_POOL: Record<Level, number> = { 3: 2, 6: 3, 11: 4, 17: 4 };
// Faces of the Court: free Mirror Image castings per Long Rest = PB.
const MIRROR_POOL: Record<Level, number> = { 3: 2, 6: 3, 11: 4, 17: 6 };
// Unarmored Defense 10 + Dex 3 (flat 16) + Wis, +2 Warding Image from L6.
const MONK_AC: Record<Level, number> = { 3: 16, 6: 19, 11: 20, 17: 20 };
// Declared rate at which the goad-bound enemy defies the bind and attacks an
// ally at Disadvantage instead of dueling the monk.
const GOAD_DEFIANCE = 0.25;

export function monk(rng: Rng, L: Level, nc: number, initManifest = false): CombatResult {
  // Barbed Court monk, fights-back environment (full defensive accounting —
  // see header). Ladder (Barbed Fists) is the item. Flurry = 3 strikes from
  // 10. Courtier's Slap once per turn on the Attack action. Court Cantrip
  // fires on any Focus spend. Hands of the Barbed Court: BA + 4 FP,
  // Concentration, +Wis rider (2xWis and Advantage at 17); re-manifests after
  // a Concentration break whenever the BA and 4 FP are available (F3).
  // initManifest (17 only): Rebuking Shield ruling — manifest as a Reaction
  // on initiative (4 FP) plus the 3 FP upgrade (2d8 Psychic retaliation on
  // each melee hit taken while the Hands last); BA free round 1.
  //
  // Return fire: two ENEMY[L]-profile enemies, assumed melee (retaliation
  // note: Psychic immunity unmodeled). Enemy A is goad-bound: it duels the
  // monk, except GOAD_DEFIANCE of rounds it attacks an ally at Disadvantage
  // (prevented += the damage Disadvantage removed, crit-aware). Enemy B
  // attacks the monk half the time, an ally otherwise (unmodeled). Against
  // the monk: Mirror Image diverts a hit when any of one-d6-per-remaining-
  // duplicate rolls 3+ (one image spent; prevented += the hit it absorbed);
  // a Shield cast costs the round's one Reaction, lasts the rest of the
  // round, and blocks every non-crit hit landing in [AC, AC+4] while active
  // (prevented += each blocked hit); the initManifest row's Reaction is
  // already spent on the initiative manifestation in round 1. Landed hits
  // force a Concentration save at DC max(10, floor(damage/2)) with Con +2.
  const md = ({ 3: 6, 6: 8, 11: 10, 17: 12 } as const)[L];
  const lad = ({ 3: 0, 6: 1, 11: 2, 17: 3 } as const)[L];
  const wis = ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L];
  const prof = ({ 3: 2, 6: 3, 11: 4, 17: 6 } as const)[L];
  const hit = wis + prof + lad;
  const flat = wis + lad;
  const ac = AC[L];
  const rider = L < 11 ? 0 : L === 11 ? wis : 2 * wis;
  const monkAC = MONK_AC[L];
  const [enatk, eth, edn, eds, efl] = ENEMY[L];
  let dealt = 0;
  let prevented = 0;
  let shields = SHIELD_POOL[L]; // Long-Rest pool, shared across the day (F9)
  let mirrors = MIRROR_POOL[L]; // Long-Rest pool of free Mirror Image casts
  for (let c = 0; c < nc; c++) {
    let focus: number;
    let hands: boolean;
    // Rebuking Shield upgrade: bought once at initiative (initManifest row);
    // it ends with the manifestation and is NOT restored by a re-manifest
    // (N3 — a plain re-manifest costs 4 FP and does not re-buy the 3 FP shield).
    let shieldUp = false;
    if (initManifest && L >= 17) {
      // Focus = level, minus: 1 goad + 4 Hands + 3 Rebuking Shield upgrade,
      // all committed at initiative.
      focus = L - 1 - 4 - 3;
      hands = true;
      shieldUp = true;
    } else {
      // Focus = level, minus 1 FP for Barbed Goad — assumed spent on a round-1
      // hit (declared simplification: charged even on an all-miss round).
      focus = L - 1;
      hands = false;
    }
    // Faces of the Court: declared pre-cast before the combat while the free
    // pool lasts (1-minute duration covers the fight; no action spent in it).
    let images = 0;
    if (mirrors > 0) {
      mirrors -= 1;
      images = 3; // each casting is always 3 duplicates; MIRROR_POOL bounds castings, not duplicates
    }
    for (let rnd = 0; rnd < 4; rnd++) {
      let ba = true;
      if (L >= 11 && !hands && focus >= 4) {
        // Manifest (or re-manifest after a break, F3) as the Bonus Action.
        focus -= 4;
        hands = true;
        ba = false;
      }
      let n = (L === 3 ? 1 : 2) + 1; // attacks + slap
      let spent = !ba;
      if (ba && focus >= 1) {
        focus -= 1;
        n += L >= 10 ? 3 : 2; // Flurry
        spent = true;
      }
      const adv = hands && L >= 17;
      for (let i = 0; i < n; i++) {
        const r = roll(rng, adv);
        const crit = r === 20;
        if (r === 1 || (r + hit < ac && !crit)) continue;
        dealt += d(rng, crit ? 2 : 1, md) + flat + (hands ? rider : 0);
      }
      if (spent && L >= 3) {
        // Court Cantrip on Focus spend
        const r = roll(rng, adv);
        const crit = r === 20;
        if (r > 1 && (r + wis + prof >= ac || crit)) {
          const nd = ({ 3: 1, 6: 2, 11: 3, 17: 4 } as const)[L];
          dealt += d(rng, nd * (crit ? 2 : 1), 8) + (hands ? rider : 0);
        }
      }
      // --- return fire ---
      // N2/N9: one Reaction per round; the initManifest row's round-1
      // Reaction was spent manifesting at initiative.
      let reactionFree = !(initManifest && L >= 17 && rnd === 0);
      let shieldActive = false; // a cast Shield covers the rest of the round
      for (const enemy of ['A', 'B'] as const) {
        if (enemy === 'A' && rng() < GOAD_DEFIANCE) {
          // Goad defiance: attack an ally at Disadvantage. Credit the damage
          // the Disadvantage removed (paired rolls vs the front-liner AC).
          for (let k = 0; k < enatk; k++) {
            const r1 = randInt(rng, 20);
            const r2 = randInt(rng, 20);
            const crit1 = r1 === 20;
            const hitsNormal = r1 !== 1 && (r1 + eth >= DEF_AC[L] || crit1);
            const low = Math.min(r1, r2);
            const hitsDisadv = low !== 1 && (low + eth >= DEF_AC[L] || low === 20);
            if (hitsNormal && !hitsDisadv) {
              prevented += d(rng, edn * (crit1 ? 2 : 1), eds) + efl; // N5: crit-aware
            }
          }
          continue;
        }
        if (enemy === 'B' && rng() < 0.5) continue; // B is on an ally (unmodeled)
        for (let k = 0; k < enatk; k++) {
          const r = randInt(rng, 20);
          const crit = r === 20;
          const total = r + eth;
          const wouldHit = r !== 1 && (total >= monkAC || crit);
          if (!wouldHit) continue;
          const inShieldBand = !crit && total < monkAC + 5; // [AC, AC+4], crits pierce
          // Resource priority: an already-active Shield blocks band hits for
          // free; then Mirror Image duplicates (free, expire with the combat);
          // the Long-Rest Shield pool is spent last.
          if (shieldActive && inShieldBand) {
            // N2: an active Shield blocks every band hit for the rest of the round.
            prevented += d(rng, edn, eds) + efl;
            continue;
          }
          if (images > 0) {
            // Mirror Image: one d6 per remaining duplicate; any 3+ diverts
            // the hit to a duplicate, destroying it (N1).
            let diverted = false;
            for (let im = 0; im < images; im++) {
              if (randInt(rng, 6) >= 3) diverted = true;
            }
            if (diverted) {
              images -= 1;
              prevented += d(rng, edn * (crit ? 2 : 1), eds) + efl; // N5: crit-aware
              continue;
            }
          }
          if (inShieldBand && reactionFree && shields > 0) {
            // Cast Shield: the round's Reaction, one pool charge, blocks this
            // hit and covers the remainder of the round.
            shields -= 1;
            reactionFree = false;
            shieldActive = true;
            prevented += d(rng, edn, eds) + efl;
            continue;
          }
          const dmg = d(rng, edn * (crit ? 2 : 1), eds) + efl;
          if (shieldUp && hands) {
            dealt += d(rng, 2, 8); // Rebuking Shield retaliation (N3: while upgraded)
          }
          if (hands) {
            const dc = Math.max(10, Math.floor(dmg / 2));
            if (randInt(rng, 20) + 2 < dc) {
              hands = false;
              shieldUp = false; // N3: the shield ends with the manifestation
            }
          }
        }
      }
    }
  }
  return { dealt, prevented };
}

// --- RANGED -----------------------------------------------------------------

export function thiefRanged(rng: Rng, L: Level, nc: number): CombatResult {
  // SRD Thief, dual hand crossbows: the BA off-hand shot conflicts with
  // Steady Aim, so advantage comes only from Vex, which carries across
  // attacks and round boundaries (F12: the carry was previously dead code).
  // No TWF feat, so no ability mod on the off-hand; the weapon bonus (owner
  // items ruling) applies to both. SA legality per the adjacent-ally
  // assumption (header).
  const wb = WB[L];
  const hit = ({ 3: 5, 6: 7, 11: 9, 17: 11 } as const)[L] + wb;
  const ac = AC[L];
  const sa = ({ 3: 2, 6: 3, 11: 6, 17: 9 } as const)[L];
  const mod = ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L] + wb;
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    let vex = false; // carries across attacks, turns, and rounds (F12)
    for (let rnd = 0; rnd < 4; rnd++) {
      const turns = L >= 17 && rnd === 0 ? 2 : 1;
      for (let t = 0; t < turns; t++) {
        let got = false;
        for (let i = 0; i < 2; i++) {
          const r = roll(rng, vex);
          const crit = r === 20;
          const ok = r > 1 && (r + hit >= ac || crit);
          vex = ok; // Vex: a hit grants advantage on the next attack
          if (ok) {
            dealt += d(rng, crit ? 2 : 1, 6) + (i === 0 ? mod : wb);
            if (!got) {
              dealt += d(rng, crit ? sa * 2 : sa, 6);
              got = true;
            }
          }
        }
      }
    }
  }
  return { dealt, prevented: 0 };
}

export function fiend(
  rng: Rng,
  L: Level,
  nc: number,
  blade = false,
  dark = false,
): CombatResult {
  // Fiend warlock. blade: Pact of the Blade greatsword (items ladder applies,
  // F2/owner ruling), Hex (or Darkness variant: Devil's Sight advantage),
  // Eldritch Smite once per turn from the Pact Magic pool — Warlock 5+ only
  // (F7). Otherwise: Eldritch Blast + Agonizing Blast with Hex, leveled-slot
  // Scorching-Ray-style volleys first (spell attacks: itemless).
  // Hex upcast on a pact slot (level 2/3/5/5) lasts 4/8/24/24 hours, so one
  // casting spans the whole 4-combat day: the slot is paid once, in combat 1
  // (F26). Darkness is Concentration 10 minutes and is re-paid every combat.
  const wb = blade ? WB[L] : 0;
  const hit = ({ 3: 5, 6: 7, 11: 9, 17: 11 } as const)[L] + wb;
  const ac = AC[L];
  const cha = ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L];
  const slots = ({ 3: 2, 6: 2, 11: 3, 17: 4 } as const)[L];
  const slvl = ({ 3: 2, 6: 3, 11: 5, 17: 5 } as const)[L];
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    // Darkness: re-cast each combat. Hex: paid once per day (F26).
    const upkeep = dark ? 1 : c === 0 ? 1 : 0;
    let sq = slots - upkeep;
    for (let rnd = 0; rnd < 4; rnd++) {
      if (blade) {
        const natk = L >= 17 ? 3 : L >= 5 ? 2 : 1;
        let drunk = false;
        const hits: boolean[] = [];
        for (let i = 0; i < natk; i++) {
          const r = roll(rng, dark);
          const crit = r === 20;
          if (r === 1 || (r + hit < ac && !crit)) continue;
          const dice: Array<[number, number]> = [[2, 6]];
          if (!dark) dice.push([1, 6]); // Hex
          if (L >= 9 && !drunk) {
            dice.push([1, 6]);
            drunk = true;
          }
          // F24: crits roll doubled dice; flat bonuses are not doubled.
          const diceTotal = dice.reduce(
            (sum, [n_, s_]) => sum + d(rng, n_ * (crit ? 2 : 1), s_),
            0,
          );
          dealt += diceTotal + cha + wb;
          hits.push(crit);
        }
        if (L >= 5 && sq > 0 && hits.length > 0) {
          // F7: Eldritch Smite requires Warlock 5+
          sq -= 1;
          const sm = 1 + slvl; // Eldritch Smite dice
          dealt += d(rng, sm * (hits.some(Boolean) ? 2 : 1), 8);
        }
      } else {
        if (sq > 0) {
          sq -= 1;
          for (let v = 0; v < slvl + 1; v++) {
            // Scorching-Ray-style volley
            const r = roll(rng, false);
            const crit = r === 20;
            if (r > 1 && (r + hit >= ac || crit)) {
              dealt += d(rng, crit ? 4 : 2, 6) + d(rng, crit ? 2 : 1, 6);
            }
          }
        } else {
          const beams = L < 5 ? 1 : L < 11 ? 2 : L < 17 ? 3 : 4;
          for (let b = 0; b < beams; b++) {
            const r = roll(rng, false);
            const crit = r === 20;
            if (r > 1 && (r + hit >= ac || crit)) {
              dealt += d(rng, crit ? 2 : 1, 10) + cha + d(rng, crit ? 2 : 1, 6);
            }
          }
        }
      }
    }
  }
  return { dealt, prevented: 0 };
}

// --- CASTERS (itemless; CME posture per header) -----------------------------

// Day-long Scorching Ray queues (F1). Full-caster slots at 11: 4/3/3/3/2/1;
// at 17: 4/3/3/3/2/1/1/1/1. The top slot (6th at 11, 8th at 17) is pre-spent
// on CME; every remaining slot of level 2+ becomes one ray round (Scorching
// Ray: slot level + 1 rays), greedy-highest-first. 1st-level slots cannot
// cast it. When the queue is dry: cantrip/weapon fallback (see each build).
const RAY_Q: Record<11 | 17, readonly number[]> = {
  11: [6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3],
  17: [10, 8, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3],
};

export function sorcwiz(rng: Rng, L: Level, nc: number): CombatResult | null {
  // Draconic Sorcerer 3 / Wizard 8+ (legal split; Wizard preps CME).
  // CME pre-cast before initiative; the rider applies under the declared
  // in-Emanation posture (header). Innate Sorcery advantage: 2 uses per Long
  // Rest, 1 minute each -> the first 2 combats of the day only (F16).
  // Dry rounds (day tail): Fire Bolt (3d10 at 11, 4d10 at 17) + rider.
  if (L !== 11 && L !== 17) return null; // F21: equality guard narrows Level
  const hit = ({ 11: 9, 17: 11 } as const)[L];
  const ac = AC[L];
  const rider = ({ 11: 4, 17: 6 } as const)[L];
  const fb = L === 11 ? 3 : 4; // Fire Bolt dice
  const queue = [...RAY_Q[L]]; // F1: one Long-Rest queue for the whole day
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    const adv = c < 2; // F16: Innate Sorcery covers 2 combats
    for (let rnd = 0; rnd < 4; rnd++) {
      const rays = queue.length > 0 ? (queue.shift() as number) : 0;
      if (rays > 0) {
        for (let i = 0; i < rays; i++) {
          const r = roll(rng, adv);
          const crit = r === 20;
          if (r > 1 && (r + hit >= ac || crit)) {
            dealt += d(rng, crit ? 4 : 2, 6) + d(rng, rider * (crit ? 2 : 1), 8);
          }
        }
      } else {
        const r = roll(rng, adv);
        const crit = r === 20;
        if (r > 1 && (r + hit >= ac || crit)) {
          dealt += d(rng, fb * (crit ? 2 : 1), 10) + d(rng, rider * (crit ? 2 : 1), 8);
        }
      }
    }
  }
  return { dealt, prevented: 0 };
}

export function valor(rng: Rng, L: Level, nc: number): CombatResult | null {
  // Straight Valor Bard with CME (Magical Secrets at 10; College of Valor is
  // 2024 PHB, not SRD — see header). Battle Magic BA weapon attack from 14 on
  // spell-casting rounds. Dry rounds (day tail): Extra Attack, two weapon
  // swings with the CME rider (in-Emanation posture).
  if (L !== 11 && L !== 17) return null; // F21: equality guard narrows Level
  const hit = ({ 11: 9, 17: 11 } as const)[L];
  const ac = AC[L];
  const rider = ({ 11: 4, 17: 6 } as const)[L];
  const queue = [...RAY_Q[L]]; // F1: one Long-Rest queue for the whole day
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    for (let rnd = 0; rnd < 4; rnd++) {
      const rays = queue.length > 0 ? (queue.shift() as number) : 0;
      if (rays > 0) {
        for (let i = 0; i < rays; i++) {
          const r = roll(rng, false);
          const crit = r === 20;
          if (r > 1 && (r + hit >= ac || crit)) {
            dealt += d(rng, crit ? 4 : 2, 6) + d(rng, rider * (crit ? 2 : 1), 8);
          }
        }
        if (L >= 14) {
          // Battle Magic BA attack after casting with the action
          const r = roll(rng, false);
          const crit = r === 20;
          if (r > 1 && (r + hit >= ac || crit)) {
            dealt += d(rng, crit ? 2 : 1, 8) + 5 + d(rng, rider * (crit ? 2 : 1), 8);
          }
        }
      } else {
        // Dry round: Attack action (Extra Attack), rider applies in-Emanation.
        for (let a = 0; a < 2; a++) {
          const r = roll(rng, false);
          const crit = r === 20;
          if (r > 1 && (r + hit >= ac || crit)) {
            dealt += d(rng, crit ? 2 : 1, 8) + 5 + d(rng, rider * (crit ? 2 : 1), 8);
          }
        }
      }
    }
  }
  return { dealt, prevented: 0 };
}
