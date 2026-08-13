// DPR + support-channel Monte Carlo sim for the homebrew subclasses and the
// complete twelve-subclass SRD 5.2.1 board.
//
// This work includes material from the System Reference Document 5.2.1
// ("SRD 5.2.1") by Wizards of the Coast LLC, available at
// https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
// Commons Attribution 4.0 International License, available at
// https://creativecommons.org/licenses/by/4.0/legalcode.
//
// Rules provenance. Every citation below is to
// docs/srd/full/srd-5.2.1.txt, the pinned full-text source required by D152.
//   - Path of the Berserker: "Barbarian" (Rage, Reckless Attack, Extra Attack,
//     Brutal Strike) and "Barbarian Subclass: Path of the Berserker" (Frenzy,
//     Retaliation). Greatsword/Graze is in "Weapons" > "Mastery Properties."
//     Its thrown counterpart uses handaxes from "Weapons" > "Simple Melee
//     Weapons" and the "Thrown," "Light," and "Vex" rules. Thrown handaxe
//     attacks use Strength, so Rage, Reckless, Frenzy, and Brutal Strike all
//     apply; staying beyond 5 feet removes Retaliation from this posture.
//   - Champion: "Fighter" (Fighting Style, Action Surge, Extra Attack,
//     Studied Attacks) and "Fighter Subclass: Champion" (Improved/Superior
//     Critical, Heroic Warrior). "Feats" > "Savage Attacker" and "Fighting
//     Style Feats" > "Great Weapon Fighting" supply its SRD-only package.
//     Its shortbow counterpart uses "Simple Ranged Weapons" > "Shortbow,"
//     Ammunition/Two-Handed/Vex, and "Fighting Style Feats" > "Archery."
//   - Warrior of the Open Hand: "Monk" (Martial Arts table, Focus, Flurry of
//     Blows, Stunning Strike, Heightened Focus) and "Monk Subclass: Warrior
//     of the Open Hand" (Open Hand Technique, Quivering Palm).
//     Its thrown handaxe is a Simple Melee weapon and therefore a Monk weapon:
//     Martial Arts/Dexterous Attacks and ranged Stunning Strike apply. Flurry,
//     Open Hand Technique, and Quivering Palm require Unarmed Strikes and add
//     no damage while the target is kept at thrown range.
//   - Thief: "Rogue" (Sneak Attack, Cunning Strike) and "Rogue Subclass:
//     Thief" (Fast Hands, Supreme Sneak, Use Magic Device, Thief's Reflexes).
//     Its legal ranged posture uses one shortbow attack with Steady Aim and
//     Sneak Attack. It does not use dual hand crossbows: Ammunition requires a
//     free hand to load a one-handed weapon, so that guide posture is absent.
//   - Oath of Devotion: "Paladin" (Fighting Style, Extra Attack, Paladin's
//     Smite, Radiant Strikes) and "Paladin Subclass: Oath of Devotion" >
//     "Level 3: Sacred Weapon." This retains the D233 oath-nova identity.
//     Its thrown javelins are Melee weapons with Thrown, so Divine Smite and
//     Radiant Strikes remain legal on their ranged attacks. Sacred Weapon
//     applies only to the first javelin: its effect ends once thrown because
//     the paladin is no longer carrying that weapon. Archery does not apply,
//     since javelins are Melee weapons even when used for ranged attacks.
//   - Hunter: "Ranger" (Fighting Style, Favored Enemy, Extra Attack, Precise
//     Hunter), "Ranger Subclass: Hunter" (Colossus Slayer, Superior Hunter's
//     Prey), and "Spell Descriptions" > "Hunter's Mark." The mark is 1d6 at
//     board levels; the Ranger table's d10 upgrade is Foe Slayer at level 20.
//     Its counterpart uses "Martial Ranged Weapons" > "Longbow" with
//     Ammunition/Heavy/Two-Handed and the Archery Fighting Style.
//   - Life Domain: "Cleric" (Channel Divinity, Blessed Strikes), "Cleric
//     Subclass: Life Domain" (Disciple of Life, Preserve Life, Blessed Healer,
//     Supreme Healing), and "Spell Descriptions" > "Spirit Guardians,"
//     "Sacred Flame," "Healing Word," and "Flame Strike."
//   - Circle of the Land: "Druid" (Wild Shape/Resurgence, Elemental Fury) and
//     "Druid Subclass: Circle of the Land" (Arid Land table, Land's Aid,
//     Natural Recovery, Nature's Ward/Sanctuary), plus "Spell Descriptions" >
//     "Burning Hands," "Fireball," and "Fire Bolt."
//   - Evoker: "Wizard" (Spellcasting, Arcane Recovery) and "Wizard Subclass:
//     Evoker" (Potent Cantrip, Sculpt Spells, Empowered Evocation,
//     Overchannel), plus those same evocation spell descriptions and "Acid
//     Splash."
//   - Draconic Sorcery: "Sorcerer" (Innate Sorcery, Font of Magic, Sorcerous
//     Restoration, Quickened/Twinned Spell) and "Sorcerer Subclass: Draconic
//     Sorcery" (Draconic Spells, Elemental Affinity), plus "Chromatic Orb,"
//     "Fireball," and "Fire Bolt." SRD Twinned does not duplicate these
//     damage spells; its modeled damage contribution is honestly zero.
//   - Fiend Patron: "Warlock" (Pact Magic, Agonizing Blast), "Warlock
//     Subclass: Fiend Patron" (Fiend Spells grants Scorching Ray; Dark One's
//     Blessing, Fiendish Resilience, Hurl Through Hell), and "Scorching Ray,"
//     "Eldritch Blast," and "Hex" spell descriptions.
//   - College of Lore: "Bard" (Bardic Inspiration, Font of Inspiration,
//     Magical Secrets) and "Bard Subclass: College of Lore" (Cutting Words,
//     Magical Discoveries), plus "Dissonant Whispers," "Vicious Mockery,"
//     "Fireball," and the established SRD CME posture at levels 11/17.
//   - Life, Land, Evoker, Draconic, Fiend, and Lore already attack at range
//     through their sourced spell/cantrip postures. Life and Land receive no
//     dominated weapon-only duplicate. Per the owner directive, Wizard,
//     Sorcerer, and Bard have no melee variant; none is present on the board.
//
// D233's three precedent substitutions remain documented in SUBSTITUTIONS.md
// alongside the complete guide-option mapping. No non-SRD feat or subclass
// is used by an SRD row.
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
//   - Most builds run against dummies (no return fire); casters are flagged as
//     such. Berserker has one declared melee enemy stream so Retaliation and
//     Rage resistance have an input. Lore samples one enemy attacking a
//     typical ally solely to price Cutting Words and Vicious Mockery.
//   - A second legal target is present for Hunter's Mark spill, Chromatic Orb
//     leaps, and alternating Hurl Through Hell targets. These are reported in
//     the support/amplification channel, never silently added to single-target
//     damage. Evoker likewise has one ally in its blast area to price Sculpt.
//
// Declared assumptions (consensus-reviewed):
//   - Party context: an ally is adjacent to the target, so Sneak Attack is legal
//     on hits without Advantage (SRD ally-within-5-feet clause). The repo is a
//     party simulator; the monk's environment explicitly includes a party.
//   - The CME caster rows fight inside their own 15-foot Emanation (the build's
//     defining posture), so the rider applies to their ray/attack hits. CME's
//     10-minute duration and re-cast cost are NOT modeled. The burst queue
//     front-loads its four rounds with the largest remaining spell slots, and
//     the day does not pay cross-combat recasts; consequently BOTH burst and
//     day CME cells are declared upper bounds, not sustained guide-comparable
//     DPR. The combined board marks the Lore row with a dagger footnote.
//   - Initiative: the party acts before the enemy each round (Command's lost
//     turn lands in the same round the save fails).
//   - Enemy Wis save +2 at every level; no Legendary Resistance.
//
// SUPPORT / AMPLIFICATION channel: every build retains the historical
// { dealt, prevented } shape. `prevented` contains enemy damage negated by a
// feature, healing delivered, or explicitly off-target damage amplification.
// It must not be read as personal single-target DPR; run.ts labels it fully.
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
//   fire (out of melee reach). The dummy rows also leave self-only or
//   incoming-dependent defenses unpriced: Open Hand Wholeness of Body,
//   Hunter Superior Hunter's Defense, Life's Improved Potent Spellcasting
//   temporary HP, Land Nature's Ward/Sanctuary, Draconic Resilience/Wings,
//   and Fiend Dark One's Blessing/Fiendish Resilience. Also unmodeled (monk
//   dealt undercount): Innate Sorcery of the Court advantage on Court Cantrip
//   rolls.
//   Comparability notes (N6/N7): the Lore bard's dry-round Fire Bolt and spell
//   attacks stay itemless with the rest of its caster row. Prevented rows are
//   not on a common incoming stream —
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

export type ConcentrationRole = 'none' | 'damage-anchored' | 'buff/control' | 'level-dependent';

/** Explicit concentration posture for every row on the complete SRD board. */
export const SRD_CONCENTRATION_ROLES = {
  berserker: 'none',
  berserkerThrown: 'none',
  champion: 'none',
  championRanged: 'none',
  openHand: 'none',
  openHandThrown: 'none',
  thief: 'none',
  thiefShortbow: 'none',
  devotion: 'none',
  devotionThrown: 'none',
  hunter: 'damage-anchored',
  hunterRanged: 'damage-anchored',
  lifeDomain: 'damage-anchored',
  circleLand: 'buff/control',
  evoker: 'none',
  draconic: 'none',
  fiendPatron: 'damage-anchored',
  fiend: 'damage-anchored',
  loreCollege: 'level-dependent',
} as const satisfies Record<string, ConcentrationRole>;

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

// Full-caster Long-Rest slots at the four board levels. Entries are slot
// levels, ordered high-to-low so a build's stated greedy policy is explicit.
const FULL_SLOT_Q: Record<Level, readonly number[]> = {
  3: [2, 2, 1, 1, 1, 1],
  6: [3, 3, 3, 2, 2, 2, 1, 1, 1, 1],
  11: [6, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 1],
  17: [9, 8, 7, 6, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 1],
};

function abilityMod(L: Level): number {
  return ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L];
}

function proficiency(L: Level): number {
  return ({ 3: 2, 6: 3, 11: 4, 17: 6 } as const)[L];
}

function cantripDice(L: Level): number {
  return L < 5 ? 1 : L < 11 ? 2 : L < 17 ? 3 : 4;
}

function saveFails(rng: Rng, dc: number, bonus = 2): boolean {
  return randInt(rng, 20) + bonus < dc;
}

function saveForHalf(rng: Rng, dc: number, damage: number, bonus = 2): number {
  return saveFails(rng, dc, bonus) ? damage : Math.floor(damage / 2);
}

/** Greedy Arcane/Natural Recovery allocation, capped at level-5 slots. */
function recoveredSlots(levelBudget: number): number[] {
  const slots: number[] = [];
  let remaining = levelBudget;
  while (remaining > 0) {
    const slot = Math.min(5, remaining);
    slots.push(slot);
    remaining -= slot;
  }
  return slots;
}

// --- MELEE, equal items -----------------------------------------------------

export function devotion(rng: Rng, L: Level, nc: number): CombatResult {
  // Dex Oath of Devotion paladin, shortsword (Vex) + scimitar (Nick), with
  // Two-Weapon Fighting. Sacred Weapon is activated as part of the first
  // Attack action and enchants only the held shortsword; it consumes no Bonus
  // Action, so round 1 can still Smite. Two Channel Divinity uses plus one
  // recovered at each Short Rest cover all four modeled combats.
  // Divine Smite is an immediate post-hit Bonus Action. The rotation spends
  // the next greedy slot on the first confirmed hit each turn; only THAT hit's
  // critical state doubles the Smite dice. Nick stays inside the Attack action.
  const wb = WB[L];
  const hit = proficiency(L) + abilityMod(L) + wb;
  const ac = AC[L];
  const mod = abilityMod(L) + wb;
  const actionAttacks = L >= 5 ? 2 : 1;
  const attacks = actionAttacks + 1;
  const rad = L >= 11 ? 1 : 0; // Radiant Strikes
  const qq = [...SMITE_Q[L]].sort((a, b) => b - a);
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    let vex = false;
    for (let rnd = 0; rnd < 4; rnd++) {
      let smiteAvailable = qq.length > 0;
      for (let i = 0; i < attacks; i++) {
        const nickAttack = i === attacks - 1;
        const advantage = vex;
        vex = false; // Vex applies to this next attack, hit or miss.
        const r = roll(rng, advantage);
        const crit = r === 20;
        if (r === 1 || (r + hit + (nickAttack ? 0 : 3) < ac && !crit)) continue;
        dealt += d(rng, crit ? 2 : 1, 6) + mod + d(rng, rad * (crit ? 2 : 1), 8);
        if (!nickAttack) vex = true; // Sacred shortsword also has Vex.
        if (smiteAvailable) {
          smiteAvailable = false;
          const sm = qq.shift() as number;
          dealt += d(rng, sm * (crit ? 2 : 1), 8);
        }
      }
    }
  }
  return { dealt, prevented: 0 };
}

export function devotionThrown(rng: Rng, L: Level, nc: number): CombatResult {
  // Strength Devotion paladin throwing javelins at normal range. A javelin is
  // categorized as a Melee weapon despite the ranged attack, so Divine Smite
  // and Radiant Strikes apply. Sacred Weapon enchants the first javelin as
  // part of round 1's Attack action, adds Charisma to that attack, then ends
  // once the throw means the paladin is no longer carrying that weapon. The
  // remaining attacks get no Sacred Weapon bonus. Archery is inapplicable.
  // The explicit SRD starting loadout has six javelins. They can be drawn as
  // part of each attack and are recovered between combats, but attacks seven
  // and eight in one combat hit the out-of-stock branch. Slow has no DPR value
  // against the stationary benchmark. Smite fires on the first confirmed hit
  // each turn, so its dice use that hit's critical state and no later roll.
  const wb = WB[L];
  const baseHit = proficiency(L) + abilityMod(L) + wb;
  const attacks = L >= 5 ? 2 : 1;
  const radiantDice = L >= 11 ? 1 : 0;
  const smites = [...SMITE_Q[L]].sort((a, b) => b - a);
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    let sacredJavelin = true;
    let javelins = 6;
    for (let rnd = 0; rnd < 4; rnd++) {
      let smiteAvailable = smites.length > 0;
      const availableAttacks = Math.min(attacks, javelins);
      for (let i = 0; i < availableAttacks; i++) {
        javelins--;
        const sacred = sacredJavelin;
        sacredJavelin = false;
        const r = roll(rng, false);
        const crit = r === 20;
        if (r === 1 || (r + baseHit + (sacred ? 3 : 0) < AC[L] && !crit)) continue;
        dealt +=
          d(rng, crit ? 2 : 1, 6) +
          abilityMod(L) +
          wb +
          d(rng, radiantDice * (crit ? 2 : 1), 8);
        if (smiteAvailable) {
          smiteAvailable = false;
          const smiteDice = smites.shift() as number;
          dealt += d(rng, smiteDice * (crit ? 2 : 1), 8);
        }
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

/** Action Surge placement policy for the Champion's four-round combat. */
export function championSurgesOnRound(L: Level, ranged: boolean, round: number): boolean {
  if (L >= 17) return round === 0 || round === 1;
  return round === (ranged ? 1 : 0);
}

function championCore(rng: Rng, L: Level, nc: number, ranged: boolean): CombatResult {
  // Champion Fighter, shared chassis for the melee (Savage Attacker
  // greatsword) and ranged (hand-crossbow-free shortbow + Archery) rows.
  // Expanded crit 19 (18 at 15); Action Surge round 1 of each combat
  // plus round 2 at L17 (two uses per Short Rest, F4); Studied Attacks (L13+)
  // advantage after a miss, carried across round boundaries (F14); Heroic
  // Warrior (L10+): one Heroic Inspiration reroll of a missed attack per turn
  // (F18). Melee adds Graze (ability modifier only, F5) and rolls one complete
  // weapon-damage pool twice per turn for Savage Attacker. Ranged does the
  // same (the feat is not melee-only) and carries Vex across rounds (F13).
  const wb = WB[L];
  const hit = ({ 3: 5, 6: 7, 11: 9, 17: 11 } as const)[L] + wb + (ranged ? 2 : 0); // Archery
  const ac = AC[L];
  const abil = ({ 3: 3, 6: 4, 11: 5, 17: 5 } as const)[L];
  const mod = abil + wb;
  const cm = L < 15 ? 19 : 18;
  const natk = ({ 3: 1, 6: 2, 11: 3, 17: 3 } as const)[L];
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    let ma = false; // Studied Attacks: advantage on next attack after a miss
    let vex = false; // ranged: Vex carries to the next attack
    for (let rnd = 0; rnd < 4; rnd++) {
      // The ranged posture banks shortbow Vex in round 1 before spending its
      // single Action Surge in round 2. At L17 both legal uses occupy distinct
      // turns (rounds 1 and 2), preserving the once-per-turn limit.
      const surge = championSurgesOnRound(L, ranged, rnd);
      let n = natk + (surge ? natk : 0);
      let savageUsed = false;
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
          const weaponRoll = (): number => d(rng, crit ? 2 : 1, 6);
          let weaponDamage = weaponRoll();
          if (!savageUsed) {
            weaponDamage = Math.max(weaponDamage, weaponRoll());
            savageUsed = true;
          }
          dealt += weaponDamage + mod;
          vex = true;
        } else {
          const rolls = crit ? 4 : 2;
          const weaponRoll = (): number => {
            let total = 0;
            for (let k = 0; k < rolls; k++) total += Math.max(randInt(rng, 6), 3);
            return total;
          };
          let weaponDamage = weaponRoll();
          if (!savageUsed) {
            weaponDamage = Math.max(weaponDamage, weaponRoll());
            savageUsed = true;
          }
          dealt += weaponDamage + mod;
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

// --- SRD 5.2.1 SUBCLASS BOARD ---------------------------------------------

export function berserker(rng: Rng, L: Level, nc: number): CombatResult {
  // Path of the Berserker, greatsword (Graze). Rage and Reckless Attack are
  // active in every combat. Frenzy lands on the first hit each turn. At L9+,
  // the second Attack-action attack gives up Reckless advantage for Brutal
  // Strike (1d10, 2d10 at L17). From L10, Retaliation attacks after the first
  // damaging melee hit each round. The incoming stream is one ENEMY[L]
  // creature; Rage's B/P/S resistance is credited in the support channel.
  const wb = WB[L];
  const hit = proficiency(L) + abilityMod(L) + wb;
  const flat = abilityMod(L) + wb;
  const rage = ({ 3: 2, 6: 2, 11: 3, 17: 4 } as const)[L];
  const frenzyDice = rage;
  const attacks = L >= 5 ? 2 : 1;
  const [enemyAttacks, enemyToHit, enemyDice, enemyDie, enemyFlat] = ENEMY[L];
  const barbarianAC = ({ 3: 15, 6: 16, 11: 17, 17: 17 } as const)[L];
  let dealt = 0;
  let prevented = 0;
  for (let c = 0; c < nc; c++) {
    for (let rnd = 0; rnd < 4; rnd++) {
      let frenzyPending = true;
      for (let i = 0; i < attacks; i++) {
        const brutal = L >= 9 && i === 1;
        const r = roll(rng, !brutal);
        const crit = r === 20;
        if (r === 1 || (r + hit < AC[L] && !crit)) {
          dealt += abilityMod(L); // Graze: ability modifier, not item bonus
          continue;
        }
        dealt += d(rng, crit ? 4 : 2, 6) + flat + rage;
        if (frenzyPending) {
          dealt += d(rng, frenzyDice * (crit ? 2 : 1), 6);
          frenzyPending = false;
        }
        if (brutal) dealt += d(rng, (L >= 17 ? 2 : 1) * (crit ? 2 : 1), 10);
      }

      let retaliated = false;
      for (let i = 0; i < enemyAttacks; i++) {
        const er = roll(rng, true); // Reckless grants the enemy Advantage
        const crit = er === 20;
        if (er === 1 || (er + enemyToHit < barbarianAC && !crit)) continue;
        const incoming = d(rng, enemyDice * (crit ? 2 : 1), enemyDie) + enemyFlat;
        prevented += incoming - Math.floor(incoming / 2); // Rage resistance, damage taken rounds down
        if (L >= 10 && !retaliated) {
          retaliated = true;
          const rr_ = roll(rng, false);
          const reactionCrit = rr_ === 20;
          if (rr_ > 1 && (rr_ + hit >= AC[L] || reactionCrit)) {
            dealt += d(rng, reactionCrit ? 4 : 2, 6) + flat + rage;
          } else {
            dealt += abilityMod(L); // Graze also applies to this weapon attack
          }
        }
      }
    }
  }
  return { dealt, prevented };
}

export function berserkerThrown(rng: Rng, L: Level, nc: number): CombatResult {
  // Two handaxes at normal thrown range. Because Thrown melee weapons retain
  // their melee attack ability, these are Strength attacks: Rage, Reckless,
  // Frenzy, and Brutal Strike all work. Light supplies one Bonus Action attack
  // after round 1; entering Rage consumes that Bonus Action on round 1. The
  // off-hand omits only the Strength modifier. Handaxe Vex is redundant with
  // Reckless except on the attack that forgoes Reckless to use Brutal Strike,
  // where carried Vex can still supply Advantage. The equal-items ruling treats
  // the thrown-weapon supply as the row's +X weapon. No enemy is within 5
  // feet, so Retaliation and the resistance support stream are absent.
  const wb = WB[L];
  const hit = proficiency(L) + abilityMod(L) + wb;
  const rage = ({ 3: 2, 6: 2, 11: 3, 17: 4 } as const)[L];
  const attackActionAttacks = L >= 5 ? 2 : 1;
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    let vex = false;
    for (let rnd = 0; rnd < 4; rnd++) {
      let frenzyPending = true;
      const lightExtraAttacks = rnd === 0 ? 0 : 1; // round 1 BA enters Rage
      const totalAttacks = attackActionAttacks + lightExtraAttacks;
      for (let i = 0; i < totalAttacks; i++) {
        const brutal = L >= 9 && i === attackActionAttacks - 1;
        const advantage = !brutal || vex; // advantage sources combine by OR
        vex = false;
        const r = roll(rng, advantage); // Reckless has no melee-only restriction
        const crit = r === 20;
        if (r === 1 || (r + hit < AC[L] && !crit)) continue;
        vex = true;
        const isLightExtra = lightExtraAttacks === 1 && i === totalAttacks - 1;
        dealt +=
          d(rng, crit ? 2 : 1, 6) +
          wb +
          rage +
          (isLightExtra ? 0 : abilityMod(L));
        if (frenzyPending) {
          dealt += d(rng, rage * (crit ? 2 : 1), 6);
          frenzyPending = false;
        }
        if (brutal) dealt += d(rng, (L >= 17 ? 2 : 1) * (crit ? 2 : 1), 10);
      }
    }
  }
  return { dealt, prevented: 0 };
}

export function openHand(rng: Rng, L: Level, nc: number): CombatResult {
  // Warrior of the Open Hand. Focus refreshes every Short Rest. Flurry is
  // used whenever affordable (two strikes, three from L10); the first Flurry
  // hit attempts Topple, granting Advantage to later strikes on a failed Dex
  // save. At L5+, spare Focus buys one Stunning Strike per turn. At L17,
  // Quivering Palm takes priority: set on the first hit, then forgo one attack
  // on later turns to discharge 10d12 (Con save for half).
  const martialDie = ({ 3: 6, 6: 8, 11: 10, 17: 12 } as const)[L];
  const mod = abilityMod(L);
  const hit = proficiency(L) + mod;
  const dc = 8 + proficiency(L) + mod;
  const baseAttacks = L >= 5 ? 2 : 1;
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    let focus = L;
    let palmSet = false;
    for (let rnd = 0; rnd < 4; rnd++) {
      let actionAttacks = baseAttacks;
      if (L >= 17 && palmSet) {
        actionAttacks -= 1;
        palmSet = false;
        dealt += saveForHalf(rng, dc, d(rng, 10, 12));
      }
      const flurry = focus > 0;
      if (flurry) focus -= 1;
      const flurryAttacks = flurry ? (L >= 10 ? 3 : 2) : 1;
      let stunned = false;
      let toppled = false;
      let nextAdvantage = false;
      let stunningAvailable = L >= 5 && L < 17 && focus > 0;
      const strike = (isFlurry: boolean): void => {
        const r = roll(rng, stunned || toppled || nextAdvantage);
        nextAdvantage = false;
        const crit = r === 20;
        if (r === 1 || (r + hit < AC[L] && !crit)) return;
        dealt += d(rng, crit ? 2 : 1, martialDie) + mod;
        if (L >= 17 && !palmSet && focus >= 4) {
          focus -= 4;
          palmSet = true;
        }
        if (stunningAvailable) {
          focus -= 1;
          stunningAvailable = false;
          // Failure stuns; success still grants Advantage to the next attack.
          stunned = saveFails(rng, dc);
          if (!stunned) nextAdvantage = true;
        }
        if (isFlurry && !toppled && saveFails(rng, dc)) toppled = true;
      };
      for (let i = 0; i < actionAttacks; i++) strike(false);
      for (let i = 0; i < flurryAttacks; i++) strike(true);
    }
  }
  return { dealt, prevented: 0 };
}

export function openHandThrown(rng: Rng, L: Level, nc: number): CombatResult {
  // Thrown handaxe, kept outside unarmed reach. As a Simple Melee weapon it is
  // a Monk weapon, so Dexterous Attacks and the Martial Arts die apply. Focus
  // funds one ranged Stunning Strike per turn when possible; a failed save
  // helps later attacks that turn, while a successful save grants Advantage
  // only to the next attack. Handaxe Vex carries across attacks and turns;
  // Vex and Stunning Strike combine by OR, never as extra advantage dice.
  // Flurry/Open Hand Technique/Quivering Palm cannot reach this target and are
  // honestly absent from the ranged posture.
  const wb = WB[L];
  const hit = proficiency(L) + abilityMod(L) + wb;
  const martialDie = ({ 3: 6, 6: 8, 11: 10, 17: 12 } as const)[L];
  const attacks = L >= 5 ? 2 : 1;
  const dc = 8 + proficiency(L) + abilityMod(L);
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    let focus = L;
    let vex = false;
    for (let rnd = 0; rnd < 4; rnd++) {
      let stunned = false;
      let stunningAdvantage = false;
      let stunAvailable = L >= 5 && focus > 0;
      for (let i = 0; i < attacks; i++) {
        const r = roll(rng, vex || stunned || stunningAdvantage);
        vex = false;
        stunningAdvantage = false;
        const crit = r === 20;
        if (r === 1 || (r + hit < AC[L] && !crit)) continue;
        vex = true;
        dealt += d(rng, (crit ? 2 : 1), martialDie) + abilityMod(L) + wb;
        if (stunAvailable) {
          focus -= 1;
          stunAvailable = false;
          // Failure leaves the target Stunned until our next turn; success
          // grants Advantage only to the next attack before then.
          stunned = saveFails(rng, dc);
          if (!stunned) stunningAdvantage = true;
        }
      }
    }
  }
  return { dealt, prevented: 0 };
}

export function hunter(rng: Rng, L: Level, nc: number): CombatResult {
  // Hunter Ranger, TWF Fighting Style, shortsword (Vex) + scimitar (Nick).
  // Hunter's Mark is established with the round-1 Bonus Action while Nick
  // keeps the Light attack inside the Attack action. It remains on the living
  // benchmark target: SRD 5.2.1 has no retarget-on-kill clause. Its die is d6
  // at these levels (d10 arrives at Ranger
  // 20). Colossus Slayer assumes the benchmark target starts wounded. From
  // L11, Superior Hunter's Prey sends one Mark die/turn to a second target;
  // that off-target amplification is returned in the support channel.
  const wb = WB[L];
  const hit = proficiency(L) + abilityMod(L) + wb;
  const flat = abilityMod(L) + wb;
  const attacks = (L >= 5 ? 2 : 1) + 1; // Nick folds the Light extra attack into Attack
  let dealt = 0;
  let prevented = 0;
  for (let c = 0; c < nc; c++) {
    let vex = false;
    for (let rnd = 0; rnd < 4; rnd++) {
      let colossusPending = true;
      let hitMarked = false;
      for (let i = 0; i < attacks; i++) {
        const nickAttack = i === attacks - 1;
        const r = roll(rng, L >= 17 || vex); // Precise Hunter at L17
        vex = false; // the next attack consumed any carried Vex
        const crit = r === 20;
        const ok = r > 1 && (r + hit >= AC[L] || crit);
        if (!ok) continue;
        if (!nickAttack) vex = true; // shortsword; Nick itself grants no Vex
        hitMarked = true;
        dealt += d(rng, crit ? 2 : 1, 6) + flat + d(rng, crit ? 2 : 1, 6);
        if (colossusPending) {
          dealt += d(rng, crit ? 2 : 1, 8);
          colossusPending = false;
        }
      }
      if (L >= 11 && hitMarked) prevented += d(rng, 1, 6);
    }
  }
  return { dealt, prevented };
}

export function hunterRanged(rng: Rng, L: Level, nc: number): CombatResult {
  // Longbow Hunter with Archery. Hunter's Mark and Colossus Slayer follow the
  // same wounded-primary assumptions as the melee row. Superior Hunter's Prey
  // remains explicit off-target amplification; Precise Hunter grants all
  // marked-target attacks Advantage at L17. Longbow's Slow mastery has no DPR
  // value against the stationary benchmark.
  const wb = WB[L];
  const hit = proficiency(L) + abilityMod(L) + wb + 2; // Archery
  const attacks = L >= 5 ? 2 : 1;
  let dealt = 0;
  let prevented = 0;
  for (let c = 0; c < nc; c++) {
    for (let rnd = 0; rnd < 4; rnd++) {
      let colossusPending = true;
      let hitMarked = false;
      for (let i = 0; i < attacks; i++) {
        const r = roll(rng, L >= 17);
        const crit = r === 20;
        if (r === 1 || (r + hit < AC[L] && !crit)) continue;
        hitMarked = true;
        dealt +=
          d(rng, crit ? 2 : 1, 8) +
          abilityMod(L) +
          wb +
          d(rng, crit ? 2 : 1, 6); // Hunter's Mark
        if (colossusPending) {
          dealt += d(rng, crit ? 2 : 1, 8);
          colossusPending = false;
        }
      }
      if (L >= 11 && hitMarked) prevented += d(rng, 1, 6);
    }
  }
  return { dealt, prevented };
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

export function thiefShortbow(rng: Rng, L: Level, nc: number): CombatResult {
  // Legal sustained Thief archer. One two-handed shortbow leaves ammunition
  // loading legal and Steady Aim supplies Advantage every turn. Sneak Attack
  // applies because this is a Ranged weapon; Thief's Reflexes adds the second
  // turn in round 1 at L17. Shortbow Vex is redundant with Steady Aim here.
  const wb = WB[L];
  const hit = proficiency(L) + abilityMod(L) + wb;
  const sneakDice = ({ 3: 2, 6: 3, 11: 6, 17: 9 } as const)[L];
  let dealt = 0;
  for (let c = 0; c < nc; c++) {
    for (let rnd = 0; rnd < 4; rnd++) {
      const turns = L >= 17 && rnd === 0 ? 2 : 1;
      for (let turn = 0; turn < turns; turn++) {
        const r = roll(rng, true); // Steady Aim
        const crit = r === 20;
        if (r === 1 || (r + hit < AC[L] && !crit)) continue;
        dealt +=
          d(rng, crit ? 2 : 1, 6) +
          abilityMod(L) +
          wb +
          d(rng, sneakDice * (crit ? 2 : 1), 6);
      }
    }
  }
  return { dealt, prevented: 0 };
}

export function thiefRanged(rng: Rng, L: Level, nc: number): CombatResult {
  // Legacy pre-directive dual-hand-crossbow policy retained only so its
  // historical regression tests remain meaningful; it is no longer a board
  // row because Ammunition requires a free hand to load a one-handed weapon.
  // The legal SRD board posture is thiefShortbow above. The BA shot conflicts with
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
  // (F7). Otherwise: exact Scorching Ray volleys from the Fiend Spells list
  // first (3 rays at slot level 2, +1 ray per higher slot; each ray is 2d6),
  // then Eldritch Blast + Agonizing Blast with Hex (spell attacks: itemless).
  // Pact slots refresh on a Short Rest; the board places one between modeled
  // combats, so the slot-volley posture refreshes every combat and burst is
  // expected to approximately equal day DPR.
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
      const hexCastThisTurn = !dark && c === 0 && rnd === 0;
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
        if (sq > 0 && !hexCastThisTurn) {
          sq -= 1;
          for (let v = 0; v < slvl + 1; v++) {
            // Scorching Ray: 3 rays at level 2, +1 per higher slot.
            const r = roll(rng, false);
            const crit = r === 20;
            if (r > 1 && (r + hit >= ac || crit)) {
              dealt += d(rng, crit ? 4 : 2, 6) + d(rng, crit ? 2 : 1, 6);
            }
          }
        } else {
          // Combat 1 round 1 casts Hex with a Pact slot. The SRD permits only
          // one slot-spending spell per turn, so that turn uses slotless EB;
          // it cannot also spend a slot on Scorching Ray.
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

export function fiendPatron(rng: Rng, L: Level, nc: number): CombatResult {
  // Straight Fiend Patron: Eldritch Blast + Agonizing Blast + Hex. Hex costs
  // one Pact slot in combat 1 and its upcast duration spans the adventuring
  // day. At L14+, Hurl Through Hell is attempted on the first beam hit each
  // round. Its free Long-Rest use plus level-5 Pact-slot reloads cover all
  // modeled L17 rounds; failed saves add 8d10 dealt and one incapacitated
  // enemy turn to the support channel. Dark One's Blessing is not priced in
  // the sustained-target environment because no kill is assumed.
  const hit = proficiency(L) + abilityMod(L);
  const dc = 8 + proficiency(L) + abilityMod(L);
  const beams = cantripDice(L);
  const pactSlots = ({ 3: 2, 6: 2, 11: 3, 17: 4 } as const)[L];
  let dealt = 0;
  let prevented = 0;
  let hurlReady = L >= 14;
  for (let c = 0; c < nc; c++) {
    let slots = pactSlots - (c === 0 ? 1 : 0); // Hex, once per day
    if (L >= 14 && !hurlReady && slots > 0) {
      slots -= 1;
      hurlReady = true;
    }
    for (let rnd = 0; rnd < 4; rnd++) {
      let hurlUsed = false;
      for (let i = 0; i < beams; i++) {
        const r = roll(rng, false);
        const crit = r === 20;
        if (r === 1 || (r + hit < AC[L] && !crit)) continue;
        dealt += d(rng, crit ? 2 : 1, 10) + abilityMod(L) + d(rng, crit ? 2 : 1, 6);
        if (hurlReady && !hurlUsed) {
          hurlReady = false;
          hurlUsed = true;
          const hurled = saveFails(rng, dc);
          if (hurled) {
            dealt += d(rng, 8, 10);
            prevented += enemyTurnDamage(rng, L);
          }
          if (slots > 0) {
            slots -= 1;
            hurlReady = true;
          }
          // The target is gone until the end of our next turn. A second
          // target supports next-round alternation, but no remaining beam in
          // this casting is silently assigned off-target.
          if (hurled) break;
        }
      }
    }
  }
  return { dealt, prevented };
}

export function lifeDomain(rng: Rng, L: Level, nc: number): CombatResult {
  // Life Cleric deliberately trades actions for support. One Preserve Life
  // action per combat restores its full 5*level pool (sufficient Bloodied
  // allies are assumed). One level-1 Healing Word per combat prices Disciple
  // of Life and, from L6, Blessed Healer. At L5+, the greediest available
  // level-3+ slot starts Spirit Guardians. The party-first walk-the-aura
  // posture enters the target's space on the Cleric's turn, then the target
  // ends its own turn in the emanation: two independent saves/ticks per round,
  // each on a different turn and therefore legal under the once-per-turn cap.
  // Remaining actions use Sacred Flame, with Potent Spellcasting from L7.
  const dc = 8 + proficiency(L) + abilityMod(L);
  const slots = [...FULL_SLOT_Q[L]];
  let divineIntervention = L >= 10;
  let dealt = 0;
  let prevented = 0;
  for (let c = 0; c < nc; c++) {
    const spiritIndex = slots.findIndex((slot) => slot >= 3);
    const spiritSlot = spiritIndex >= 0 ? (slots.splice(spiritIndex, 1)[0] as number) : 0;
    const healingIndex = slots.lastIndexOf(1);
    const canHeal = healingIndex >= 0;
    if (canHeal) slots.splice(healingIndex, 1);
    for (let rnd = 0; rnd < 4; rnd++) {
      if (spiritSlot > 0) {
        for (let tick = 0; tick < 2; tick++) {
          const spiritDamage = d(rng, spiritSlot, 8); // 3d8 + 1d8/slot above 3
          dealt += saveForHalf(rng, dc, spiritDamage);
        }
      }
      const preserveRound = spiritSlot > 0 ? 1 : 0;
      if (rnd === preserveRound) {
        prevented += 5 * L;
      } else if (!(spiritSlot > 0 && rnd === 0)) {
        if (divineIntervention) {
          divineIntervention = false;
          // Divine Intervention casts a level-5 Cleric spell without a slot;
          // Flame Strike is 10d6, Dexterity save for half.
          dealt += saveForHalf(rng, dc, d(rng, 10, 6));
        } else {
          const sacred = d(rng, cantripDice(L), 8);
          if (saveFails(rng, dc)) dealt += sacred + (L >= 7 ? abilityMod(L) : 0);
        }
      }
      if (canHeal && rnd === (spiritSlot > 0 ? 2 : 1)) {
        const wordDice = L >= 17 ? 8 : d(rng, 2, 4);
        prevented += wordDice + abilityMod(L) + 3; // Disciple: 2 + slot level
        if (L >= 6) prevented += 3; // Blessed Healer: 2 + slot level
      }
    }
  }
  return { dealt, prevented };
}

function aridSpellDamage(rng: Rng, slot: number): number {
  // Arid Circle supplies Burning Hands at 3 and Fireball at 5. Use Fireball
  // whenever the slot supports it; otherwise upcast Burning Hands.
  return slot >= 3 ? d(rng, 8 + slot - 3, 6) : d(rng, 3 + slot - 1, 6);
}

export function circleLand(rng: Rng, L: Level, nc: number): CombatResult {
  // Arid Circle of the Land. Round 1 spends Wild Shape on Land's Aid, dealing
  // and healing 2d6 (3d6 at 10, 4d6 at 14). Other rounds cast the greediest
  // arid blast or fall back to Fire Bolt. Natural Recovery contributes one
  // free Circle spell and one post-Short-Rest recovered slot allocation per
  // Long Rest. Healing is returned in the support channel.
  const dc = 8 + proficiency(L) + abilityMod(L);
  const slots = [...FULL_SLOT_Q[L]];
  if (L >= 6) {
    slots.push(3); // one free Fireball from Circle Spells
    if (nc > 1) slots.push(...recoveredSlots(Math.ceil(L / 2)));
    slots.sort((a, b) => b - a);
  }
  const landDice = L >= 14 ? 4 : L >= 10 ? 3 : 2;
  let dealt = 0;
  let prevented = 0;
  for (let c = 0; c < nc; c++) {
    for (let rnd = 0; rnd < 4; rnd++) {
      if (rnd === 0) {
        dealt += saveForHalf(rng, dc, d(rng, landDice, 6));
        prevented += d(rng, landDice, 6);
        continue;
      }
      const slot = slots.shift();
      if (slot !== undefined) {
        dealt += saveForHalf(rng, dc, aridSpellDamage(rng, slot));
      } else {
        const r = roll(rng, false);
        if (r > 1 && (r + proficiency(L) + abilityMod(L) >= AC[L] || r === 20)) {
          dealt +=
            d(rng, cantripDice(L) * (r === 20 ? 2 : 1), 10) +
            (L >= 7 ? abilityMod(L) : 0); // Elemental Fury: Potent Spellcasting
        }
      }
    }
  }
  return { dealt, prevented };
}

export function evoker(rng: Rng, L: Level, nc: number): CombatResult {
  // Evoker Wizard. Arcane Recovery adds one greedy <=5 slot allocation after
  // a Short Rest. Slots cast Fireball when level 3+, Burning Hands otherwise;
  // dry rounds use Acid Splash so Potent Cantrip guarantees half damage on a
  // successful save. Sculpt Spells (L6+) protects one adjacent ally from the
  // same rolled area damage; that avoided friendly fire is support. Empowered
  // Evocation adds Intelligence from L10. The environment exposes one ally,
  // safely within Sculpt's sourced 1+slot-level exclusion count. Overchannel
  // (L14+) maximizes the first level-5-or-lower spell once per Long Rest. Its
  // legal repeats are declined because the board has no self-damage valuation
  // channel for the escalating 2d12-per-slot-level Necrotic cost.
  const dc = 8 + proficiency(L) + abilityMod(L);
  const slots = [
    ...FULL_SLOT_Q[L],
    ...(nc > 1 ? recoveredSlots(Math.ceil(L / 2)) : []),
  ].sort((a, b) => b - a);
  if (L >= 14) {
    // A maximized level-5 Fireball (10d6 = 60) beats the expected damage of
    // even the level-9 version (14d6 = 49), so precommit that legal slot first.
    const levelFive = slots.indexOf(5);
    if (levelFive >= 0) slots.unshift(slots.splice(levelFive, 1)[0] as number);
  }
  let overchannel = L >= 14;
  let dealt = 0;
  let prevented = 0;
  for (let c = 0; c < nc; c++) {
    for (let rnd = 0; rnd < 4; rnd++) {
      const slot = slots.shift();
      if (slot === undefined) {
        const rolled = d(rng, cantripDice(L), 6); // Acid Splash
        dealt += saveFails(rng, dc) ? rolled : Math.floor(rolled / 2); // Potent Cantrip
        continue;
      }
      const dice = slot >= 3 ? 8 + slot - 3 : 3 + slot - 1;
      const useOverchannel = overchannel && slot <= 5;
      if (useOverchannel) overchannel = false;
      const rolled = useOverchannel ? dice * 6 : d(rng, dice, 6);
      const spellDamage = rolled + (L >= 10 ? abilityMod(L) : 0);
      dealt += saveForHalf(rng, dc, spellDamage);
      if (L >= 6) {
        // Without Sculpt the ally would save normally and take full/half.
        prevented += saveForHalf(rng, dc, spellDamage);
      }
    }
  }
  return { dealt, prevented };
}

function chromaticOrb(
  rng: Rng,
  L: Level,
  slot: number,
  advantage: boolean,
): CombatResult {
  const dice = 2 + slot;
  let dealt = 0;
  let amplified = 0;
  let leaps = 0;
  for (let target = 0; target <= slot; target++) {
    const r = roll(rng, advantage);
    const crit = r === 20;
    if (r === 1 || (r + proficiency(L) + abilityMod(L) < AC[L] && !crit)) break;
    const faces: number[] = [];
    for (let i = 0; i < dice * (crit ? 2 : 1); i++) faces.push(randInt(rng, 8));
    const damage = faces.reduce((sum, face) => sum + face, 0);
    if (target === 0) dealt += damage;
    else amplified += damage;
    const hasPair = new Set(faces).size < faces.length;
    if (!hasPair) break;
    leaps += 1;
    if (leaps >= slot) break;
  }
  return { dealt, prevented: amplified };
}

export interface DraconicTurnCasting {
  action: 'leveled spell' | 'cantrip';
  bonusAction: 'leveled spell' | 'cantrip' | 'none';
  slotsSpent: 0 | 1;
}

/** Pure decision node for the SRD one-slot-per-turn + Quickened lock. */
export function draconicTurnCasting(
  hasSlot: boolean,
  canQuicken: boolean,
): DraconicTurnCasting {
  if (hasSlot && canQuicken) {
    return { action: 'cantrip', bonusAction: 'leveled spell', slotsSpent: 1 };
  }
  if (hasSlot) {
    return { action: 'leveled spell', bonusAction: 'none', slotsSpent: 1 };
  }
  return {
    action: 'cantrip',
    bonusAction: canQuicken ? 'cantrip' : 'none',
    slotsSpent: 0,
  };
}

export function draconic(rng: Rng, L: Level, nc: number): CombatResult {
  // Fire Draconic Sorcerer. Slots level 3+ cast Fireball; lower slots cast
  // Chromatic Orb, whose sourced matching-d8 leap damage is off-target
  // amplification. On a leveled-spell turn, Quickened Spell (2 SP) changes
  // that spell to a Bonus Action and the action casts Fire Bolt. On a dry turn,
  // both spells are Fire Bolt (one action, one Quickened); no slot is spent.
  // This obeys both Quickened's level-1+ lock and the general one-slot-per-turn
  // rule. Sorcerous
  // Restoration restores floor(level/2) SP once after a Short Rest in a day.
  // Innate Sorcery covers the first two combats (+1 DC, Advantage on spell
  // attacks). Elemental Affinity adds Charisma to each Fire spell from L6.
  // Twinned Spell is known but adds no damage: SRD 5.2.1 only raises the
  // effective level of spells whose upcast adds targets, and neither chosen
  // damaging spell qualifies.
  const slots = [...FULL_SLOT_Q[L]];
  let sorceryPoints = L;
  let restored = false;
  let dealt = 0;
  let prevented = 0;
  for (let c = 0; c < nc; c++) {
    if (c > 0 && !restored && L >= 5) {
      sorceryPoints += Math.floor(L / 2);
      restored = true;
    }
    const innate = c < 2;
    const dc = 8 + proficiency(L) + abilityMod(L) + (innate ? 1 : 0);
    for (let rnd = 0; rnd < 4; rnd++) {
      const quickened = sorceryPoints >= 2;
      if (quickened) sorceryPoints -= 2;
      const slot = slots.shift();
      const casting = draconicTurnCasting(slot !== undefined, quickened);
      // When a slot exists, this is the Quickened Bonus Action spell; the
      // Fire Bolt below is the action. With no slot, this is the action Fire
      // Bolt and the block below is a second, Quickened Fire Bolt.
      if (slot !== undefined && slot >= 3) {
        const rolled = d(rng, 8 + slot - 3, 6) + (L >= 6 ? abilityMod(L) : 0);
        dealt += saveForHalf(rng, dc, rolled);
      } else if (slot !== undefined) {
        const orb = chromaticOrb(rng, L, slot, innate);
        dealt += orb.dealt + (orb.dealt > 0 && L >= 6 ? abilityMod(L) : 0);
        prevented += orb.prevented;
      } else {
        const r = roll(rng, innate);
        const crit = r === 20;
        if (r > 1 && (r + proficiency(L) + abilityMod(L) >= AC[L] || crit)) {
          dealt += d(rng, cantripDice(L) * (crit ? 2 : 1), 10) + (L >= 6 ? abilityMod(L) : 0);
        }
      }
      if (casting.bonusAction !== 'none') {
        const r = roll(rng, innate);
        const crit = r === 20;
        if (r > 1 && (r + proficiency(L) + abilityMod(L) >= AC[L] || crit)) {
          dealt += d(rng, cantripDice(L) * (crit ? 2 : 1), 10) + (L >= 6 ? abilityMod(L) : 0);
        }
      }
    }
  }
  return { dealt, prevented };
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

export function lore(rng: Rng, L: Level, nc: number): CombatResult | null {
  // Straight College of Lore Bard. Magical Discoveries supplies CME and Fire
  // Bolt; the latter is the dry-round fallback once the ray-slot queue is
  // exhausted. Cutting Words spends one Bardic Inspiration die on the damage
  // roll of the first enemy hit each round, reducing that damage by the die
  // result (to a minimum of 0). At L11/L17 the five-use Charisma pool refreshes
  // on each modeled Short Rest, so all four rounds in every combat are covered.
  if (L !== 11 && L !== 17) return null; // F21: equality guard narrows Level
  const hit = ({ 11: 9, 17: 11 } as const)[L];
  const ac = AC[L];
  const rider = ({ 11: 4, 17: 6 } as const)[L];
  const fireBoltDice = L === 11 ? 3 : 4;
  const inspirationDie = L === 11 ? 10 : 12;
  const queue = [...RAY_Q[L]]; // F1: one Long-Rest queue for the whole day
  let dealt = 0;
  let prevented = 0;
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
      } else {
        const r = roll(rng, false);
        const crit = r === 20;
        if (r > 1 && (r + hit >= ac || crit)) {
          dealt += d(rng, fireBoltDice * (crit ? 2 : 1), 10) + d(rng, rider * (crit ? 2 : 1), 8);
        }
      }

      const [enemyAttacks, enemyToHit, enemyDice, enemyDie, enemyFlat] = ENEMY[L];
      let cuttingWordsAvailable = true;
      for (let a = 0; a < enemyAttacks; a++) {
        const enemyRoll = randInt(rng, 20);
        const enemyCrit = enemyRoll === 20;
        if (enemyRoll === 1 || (enemyRoll + enemyToHit < DEF_AC[L] && !enemyCrit)) continue;
        const incoming = d(rng, enemyDice * (enemyCrit ? 2 : 1), enemyDie) + enemyFlat;
        if (cuttingWordsAvailable) {
          prevented += Math.min(incoming, randInt(rng, inspirationDie));
          cuttingWordsAvailable = false;
        }
      }
    }
  }
  return { dealt, prevented };
}

export function loreCollege(rng: Rng, L: Level, nc: number): CombatResult {
  // Full-level College of Lore board identity. The established L11/L17 CME
  // posture remains unchanged. At L3, slots cast Dissonant Whispers; at L6,
  // Magical Discoveries adds Fireball (used by level-3 slots) and Fire Bolt.
  // Lower slots still cast Dissonant Whispers, and dry rounds use Vicious
  // Mockery. Cutting Words is a three-use Long-Rest pool at L3 and a
  // four-use Short-Rest pool at L6. Vicious Mockery's Disadvantage on the
  // next enemy attack is independently credited to prevented damage.
  if (L === 11 || L === 17) return lore(rng, L, nc) as CombatResult;
  const dc = 8 + proficiency(L) + abilityMod(L);
  const slots = [...FULL_SLOT_Q[L]];
  const inspirationDie = L === 3 ? 6 : 8;
  let longRestCuttingWords = 3;
  let dealt = 0;
  let prevented = 0;
  for (let c = 0; c < nc; c++) {
    let cuttingWords = L >= 5 ? abilityMod(L) : longRestCuttingWords;
    for (let rnd = 0; rnd < 4; rnd++) {
      const slot = slots.shift();
      let mocked = false;
      if (slot !== undefined && L >= 6 && slot >= 3) {
        dealt += saveForHalf(rng, dc, d(rng, 8 + slot - 3, 6));
      } else if (slot !== undefined) {
        dealt += saveForHalf(rng, dc, d(rng, 2 + slot, 6));
      } else {
        mocked = saveFails(rng, dc);
        if (mocked) dealt += d(rng, cantripDice(L), 6);
      }

      const [enemyAttacks, enemyToHit, enemyDice, enemyDie, enemyFlat] = ENEMY[L];
      let reactionFree = cuttingWords > 0;
      for (let a = 0; a < enemyAttacks; a++) {
        const first = randInt(rng, 20);
        const normalCrit = first === 20;
        const normalHit = first !== 1 && (first + enemyToHit >= DEF_AC[L] || normalCrit);
        let actual = first;
        if (mocked && a === 0) actual = Math.min(first, randInt(rng, 20));
        const actualCrit = actual === 20;
        const actualHit = actual !== 1 && (actual + enemyToHit >= DEF_AC[L] || actualCrit);
        if (normalHit && !actualHit) {
          prevented += d(rng, enemyDice * (normalCrit ? 2 : 1), enemyDie) + enemyFlat;
          continue;
        }
        if (!actualHit) continue;
        const incoming = d(rng, enemyDice * (actualCrit ? 2 : 1), enemyDie) + enemyFlat;
        if (reactionFree) {
          prevented += Math.min(incoming, randInt(rng, inspirationDie));
          cuttingWords -= 1;
          reactionFree = false;
        }
      }
    }
    if (L === 3) longRestCuttingWords = cuttingWords;
  }
  return { dealt, prevented };
}
