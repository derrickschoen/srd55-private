# Rogue Subclass: Veteran

Status: **provisional, ready for design review only**. This is a MINT-FREE,
docs-only rebuild under the owner ruling of 2026-08-04 (`rulings.md`), which
supersedes the Executioner draft and its D194–D196 arc. The name, identity,
and **entire kit are OWNER-AUTHORED and owner-frozen**: they are an input,
not a proposal. This document's job is honest arithmetic and labeled risk;
nothing in the kit has been rebalanced, and nothing is represented as
playtested.

Supersession map from the Executioner:

- The D195/D196 once-per-round Sneak Attack boundary is now the level-3
  drawback **Too Old for This** (on-turn only — strictly narrower, since it
  also forbids off-turn delivery such as Opportunity Attacks).
- The doubled Sneak Attack pool stays at level 9 (**Veteran's Strike**).
- The old level-3 19–20 critical range moves to level 13 (**Critical
  Instincts**) and becomes 18–20 at 17 (**Heightened Lethality**), now on
  all weapon attacks rather than only Finesse/Ranged.
- D196's Skill Mastery and the floor-15 capstone are replaced by the
  level-13 and level-17 blocks below. Weapon Reader is gone.

## 1. Identity

Owner's text, verbatim:

Veterans survive through practiced technique, broad experience, and the
ability to perform reliably under pressure. Some are retired soldiers,
seasoned scouts, professional adventurers, bounty hunters, or survivors who
have learned a little about nearly everything.

A Veteran rarely relies on luck. Their attacks find vulnerable openings even
when they fall short, and their years of experience eventually make them
capable in almost any situation.

## 2. Schedule and Feature-Count Posture

The Rogue subclass schedule is **3 / 9 / 13 / 17**
([Rogue table](../../srd/full/srd-5.2.1.txt#L3710-L3753)). This kit carries
**four blocks at 3, two at 9, three at 13, and three at 17** against the SRD
Thief's 2/1/1/1 ([Thief](../../srd/full/srd-5.2.1.txt#L3827-L3885)). The count
is far above the sibling and is owner-frozen; the worksheet below prices the
whole kit rather than pretending the blocks are ribbons. One block (Too Old
for This) is a pure drawback, which the guidelines do not price as budget
headroom (guideline 04, drawback integrity) — it is listed as a real cost in
the round math, not as license for the rest.

## 3. Subclass Features (owner rules text, verbatim)

### Level 3: Seasoned Professional

You gain proficiency in one skill of your choice.

### Level 3: Too Old for This

You can only deal Sneak Attack damage on your turn. You cannot apply Sneak
Attack on reactions or any effect outside your turn.

### Level 3: Deuces Are Wild

When you roll damage for a weapon attack or Sneak Attack, you can reroll any
damage die that shows a 2. You must use the new roll.

### Level 3: Sure Strike

Once per turn, when you miss a creature with an attack using a Finesse or
Ranged weapon, you can choose to expend your Sneak Attack for the turn (no
action required): the target takes damage equal to **half your Sneak Attack
dice, rounded up**, of the weapon's damage type.

You must be able to see the target, and the attack must not have been made
with disadvantage. On any turn you can deal Sneak Attack damage or use Sure
Strike, **but never both** — using either expends the turn's Sneak Attack.

*(Revised by owner rulings 2026-08-09, second revision: the guaranteed
floor costs no action and is the player's choice, but pays half dice and
fully expends the turn's Sneak Attack. Simmed on the vex/nick canonical
build: 59.7/103.0 burst, 59.5/103.6 sustained — the floor drops from 45 to
23 (11th) / 68 to 34 (17th) on whiffed rounds, ~6% of rounds under the Vex
chain.)*

### Level 9: Veteran's Strike

Your Sneak Attack damage dice are doubled.

For example, if your Sneak Attack is normally 5d6, it becomes 10d6.

This applies to your Sneak Attack dice pool in all cases, with no
exceptions.

Using Cunning Action or any other bonus action feature does not increase the
opportunity cost of Sneak Attack; you still only expend Sneak Attack once
per turn as normal.

### Level 9: Extensive Experience

You gain proficiency in two skills of your choice.

In addition, choose two of your skill proficiencies. You gain Expertise in
those skills.

You can choose skills in which you gained proficiency from this feature.

### Level 13: Veteran Reflexes

When a creature you can see hits you with an attack, you can use your
reaction to increase your Armor Class by a number equal to your proficiency
bonus, potentially causing the attack to miss.

You can use this feature a number of times equal to your proficiency bonus,
and you regain all expended uses when you finish a long rest.

### Level 13: Critical Instincts

Your weapon attacks score a critical hit on a roll of 19–20.

### Level 13: Fighting Style

You adopt a particular style of fighting. Choose one Fighting Style option
from the Fighter class. You can't take a Fighting Style option more than
once, even if you later gain another.

### Level 17: Master of Experience

You gain proficiency in every skill in which you don't already have
proficiency. You gain Expertise in every skill in which you don't already
have Expertise.

### Level 17: Heightened Lethality

Your weapon attacks score a critical hit on a roll of 18–20. This replaces
the Critical Instincts feature you gained at 13th level.

### Level 17: Blindsight

You gain blindsight out to a range of 10 feet.

## 4. Wording Notes (flags on the frozen text, not edits)

1. **Master of Experience — RESOLVED by owner ruling 2026-08-04 (broad
   reading).** SRD Expertise attaches to proficient skills, and the Veteran
   reaches only ~9 of 18 proficiencies natively, so the owner was asked
   which reading holds. Ruling: all 18 skills — proficiency in everything
   first, then Expertise in everything. The feature text's first sentence
   implements the ruling; the second is the owner's original sentence
   verbatim.
2. **Fighting Style mapping.** SRD 5.2.1 expresses the Fighter's options as
   Fighting Style *feats* — Archery, Defense, Great Weapon Fighting,
   Two-Weapon Fighting — each with prerequisite "Fighting Style Feature"
   ([Fighting Style Feats](../../srd/full/srd-5.2.1.txt#L5289-L5323)). This
   feature is read as granting one Fighting Style feat of your choice and
   satisfying that prerequisite. Archery (+2 to ranged attack rolls) is the
   standout pick for this kit's crit range.
3. **Deuces Are Wild reroll depth.** "You must use the new roll" is read as
   one reroll per die: a rerolled die that shows 2 again keeps the 2.
4. **Veteran Reflexes duration.** The AC increase is read as applying
   against the triggering attack only, declared after the hit is announced.
5. **Sure Strike damage type.** The miss-delivered damage uses the weapon's
   damage type by the feature's own text; Sneak Attack on a hit keeps its
   normal typing rule.
6. **Too Old for This and Sure Strike agree**: every Sneak Attack delivery
   path in this kit is on-turn.
7. **House-style deviation, accepted.** Veteran's Strike carries a worked
   example ("if your Sneak Attack is normally 5d6...") inside rules text;
   lessons.md §4 places derived arithmetic in design notes. Owner text ships
   verbatim; the deviation is noted, not corrected.

## 5. Power-Budget Worksheet (design notes; all derived arithmetic lives here)

### 5.1 The guaranteed-damage line

Sure Strike makes the once-per-turn Sneak Attack near-deterministic: on the
Veteran's turn it fails to deliver only against a target the Veteran cannot
see, an attack made with Disadvantage, or a turn with no Sneak Attack
eligibility at all. Deuces Are Wild raises each d6's average from 3.5 to
3.75 (a 2 is replaced once by a fresh 3.5-average roll: +0.25/die, **+7.1%**).

| Rogue level | Pool (Veteran's Strike from 9) | Avg | Avg with Deuces |
|---:|---:|---:|---:|
| 3 | 2d6 | 7 | 7.5 |
| 9 | 10d6 | 35 | 37.5 |
| 13 | 14d6 | 49 | 52.5 |
| 17 | 18d6 | 63 | 67.5 |

Critical range (weapon attacks): 19–20 from 13 (10% per d20; 19% with
Advantage), 18–20 from 17 (15%; 27.75% with Advantage). A level-17 critical
Sneak Attack rolls 36d6 (126 avg before Deuces) plus doubled weapon dice.
Sure Strike deliveries are misses and cannot critically hit; the crit line
rides hits only.

**Round budget.** One Sneak Attack, on the Veteran's own turn, period. The
base class's off-turn Sneak Attack (Opportunity Attack and similar) is
surrendered by Too Old for This — a real cost, and stricter than the
Executioner's once-per-round wording, which still allowed the single
application to occur off-turn.

**Cost-before-benefit window.** Levels 3–8 pay the on-turn-only drawback
while the pool is still single. Compensation in that window is Sure Strike's
reliability and Deuces; whether that trade feels fair at the table is a
playtest question, flagged, not answered.

### 5.2 Defense line

Veteran Reflexes: Reaction, +PB to AC against a declared hit (+5 at 13, +6
at 17), PB uses per Long Rest (5, then 6). It competes with Uncanny Dodge
for the same Reaction — negate-or-halve becomes a live per-hit choice. This
is the kit's only tracked resource and departs the commissioning ethos of
D192 ("extra resources to manage" avoided); owner-frozen, labeled. Blindsight
10 ft at 17 partially closes the unseen-attacker case — which is also
exactly the case that switches off both Veteran Reflexes ("a creature you
can see") and Sure Strike ("must be able to see the target").

### 5.3 Skill line

Proficiencies: +1 at 3, +2 at 9; Expertise +2 at 9; at 17, proficiency and
Expertise in **all 18 skills** (owner ruling, wording note 1). The
Executioner's universal proficiency at 13 is gone; the whole skill payload
now lands at 17, larger than before (D196's version added Expertise in two
skills; this adds it in all).

### 5.4 Comparator verdicts

**SRD Thief.** From level 9 the Veteran's guaranteed ~35–37.5 damage per
round has no Thief analogue at all (Supreme Sneak is a 1d6-cost stealth
option). At 13 the Veteran adds a crit range, a Fighting Style feat, and a
five-use Reaction defense against the Thief's Use Magic Device. At 17
Expertise-in-everything plus 18–20 crits stand against Thief's Reflexes'
one extra round-1 turn. **Verdict: far above the Thief line at every slot
from 9, and above it at 3 in combat reliability. Owner-frozen; labeled, not
softened. Full playtest requested at 3–5, 9, 13, and 17.**

**Owner's Rogue 5/Fighter 6 parity benchmark (D195/D196 era).** The old
argument was "one doubled application equals two contrived normal
applications" (2N = N + N). Sure Strike changes the comparison's basis: the
built comparator still needs to *hit* for its applications; the Veteran's
2N no longer depends on the attack roll. Guaranteed 2N per round exceeds
contrived 2N-at-hit-rate. **The parity claim does not carry over; flagged
as exceeding the recorded benchmark, pending the owner's build card.**

**Champion shape (disclosure, not distance).** Critical Instincts and
Heightened Lethality reuse the SRD Champion's 19–20 → 18–20 ladder
([Champion](../../srd/full/srd-5.2.1.txt#L2968-L2985)) on a later schedule
(13/17 vs. the Champion's 3/15) and on all weapon attacks. Disclosed
mechanical ancestry.

### 5.5 Dip and stacking audit

- **Three-level dip exports** Sure Strike (a guaranteed 2d6-scale delivery
  once per round, scaling only with Rogue levels) and, more portably,
  **Deuces Are Wild on every weapon attack forever** — a permanent damage
  reroll for any martial chassis at the cost of three Rogue levels and the
  on-turn-only Sneak Attack drawback (nearly free to a dip that barely
  Sneak Attacks). **F3 amber-high; three outsider builds required.**
- **Great Weapon Fighting feat + Deuces** touch the same dice: GWF treats
  1s and 2s as 3 ([GWF](../../srd/full/srd-5.2.1.txt#L5308-L5320)); a die that
  is already treated as 3 shows no 2 to reroll, so the pair needs an
  adjudication order. Flagged for the app's rules engine and for play.
- **Crit + Deuces order**: a critical doubles the dice rolled; each rolled
  die showing 2 may be rerolled once. Stated here so the table does not
  invent a double-reroll.

### 5.6 Rest and day-shape stress

Everything except Veteran Reflexes is at-will; one-fight and long-day
per-round output are identical. Reflexes is the only Long Rest quantity
(PB uses). Nova variance comes from crits, not rest pacing.

## 6. Failure-Taxonomy Pass

| Trap | Verdict |
|---|---|
| F1 Compounding Punishment | Clear — the drawback is static; no failure chains. |
| F2 Imported Chassis Mismatch | Clear — Sneak Attack, crit rules, Expertise, Fighting Style feats, blindsight are all SRD machinery. |
| F3 Dip Bait | **Amber-high** — Deuces is fully portable at Rogue 3; Sure Strike guarantees delivery. Three outsider builds required. |
| F4 Farmable/Famine | Clear — nothing farmable; famine is designed out (guaranteed delivery is the identity). |
| F5 Advantage Faucet | Clear — no Advantage granted; existing Advantage priced in the crit math. |
| F6 Action Congestion | Clear-ish — no added action; Veteran Reflexes vs. Uncanny Dodge Reaction competition noted. |
| F7 Runaway Interaction | **Amber** — guaranteed doubled pool + 18–20 crits + Deuces + Archery is the stack to watch; capped by on-turn-once. |
| F8 Stacking Blindness | **Amber** — GWF/Deuces order, crit/Deuces order, Reflexes/Uncanny choice all stated on paper only. |
| F9 Golden Cage | Clear — Thief and the owner benchmark both run; disagreement disclosed. |
| F10 White-Room Day | **Amber** — sustained combat-high posture is untested at any table. |
| F11 Campaign Contingent | Clear — nothing environment-gated. |
| F12 Niche Trespass | **Amber** — weapon-damage seat (guaranteed DPR) and every skill specialist's seat (Expertise-everything at 17) are exposed; harmed-seat conversation required. |
| F13 Bookkeeping Tax | Clear structurally — one Long Rest counter (Reflexes) and the on-turn boundary; cold-reader check pending. |
| F14 Bounced Flavor Cheque | Clear — "rarely relies on luck" is mechanically literal at every slot. |
| F15 Dead-Air Progression | Clear on paper — every slot lands multiple visible changes. |
| F16 Untested Altitude | **Amber** — no level of this kit has been played. |

## 7. Table Conversation and Harmed-Seat Check

Disclose to the table before play: the Veteran deals its (from 9, doubled)
Sneak Attack essentially every round regardless of the attack roll; from 13
its weapon attacks crit on 19–20 (18–20 from 17); at 17 it has proficiency
and Expertise in every skill. Ask the other weapon-damage
player and every skill specialist whether these make their best moments less
necessary or less visible, and record participation in play. The
conversation exposes the harmed seats; it does not balance the kit.

## 8. Distance Checklist

1. **Thief distance — Pass.** No Fast Hands, Second-Story Work, Supreme
   Sneak, Use Magic Device, or Thief's Reflexes analogue.
2. **Champion ladder — Deliberate, disclosed.** 19–20/18–20 crit range on a
   13/17 schedule; SRD-anchored ancestry, original names.
3. **Great Weapon Fighting adjacency — Disclosed.** Deuces rerolls 2s where
   the SRD feat floors 1s and 2s; different operation, same dice; the
   stacking note in §5.5 covers their interaction.
4. **Fighting Style feats — SRD content referenced by name only.**
5. **No non-SRD work consulted.** The kit is owner-authored; this document
   adds only SRD-anchored analysis.

## 9. Clean-Room Sources and License

This rebuild uses the owner ruling of 2026-08-04 (`rulings.md`, verbatim
kit), the superseded Executioner draft and its D192/D194/D195/D196 history,
the six files in `subclass-guidelines/`, and SRD 5.2.1. No web source or
third-party text was consulted.

**Open items:** the owner-benchmark build card, and all playtests
(acquisition 3–5, mid-tier 9, 13, 17, outsider dips, harmed seats,
cold-reader, fifth-use timing).

This document is released under CC-BY-4.0 (Creative Commons Attribution 4.0
International).

> This work includes material from the System Reference Document 5.2
> ("SRD 5.2") by Wizards of the Coast LLC, available at
> https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
> Commons Attribution 4.0 International License, available at
> https://creativecommons.org/licenses/by/4.0/legalcode.
