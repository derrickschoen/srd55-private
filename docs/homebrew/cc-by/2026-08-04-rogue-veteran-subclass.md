# Rogue Subclass: Veteran

Status: **first publication draft** (2026-08-10), following two independent
publication reviews. The kit is owner-authored; this document's job is the
rules text, honest arithmetic, and labeled risk. Nothing here is represented
as playtested. Design history: this kit superseded an earlier draft
("Executioner") on 2026-08-04; its damage engine was re-derived by Monte
Carlo tuning on 2026-08-09/10 (see §5).

## 1. Identity

Veterans survive through practiced technique, broad experience, and the
ability to perform reliably under pressure. Some are retired soldiers,
seasoned scouts, professional adventurers, bounty hunters, or survivors who
have learned a little about nearly everything.

A Veteran rarely relies on luck. Their attacks find vulnerable openings even
when they fall short, and their years of experience eventually make them
capable in almost any situation.

## 2. Schedule and Feature-Count Posture

The Rogue subclass schedule is **3 / 9 / 13 / 17** (SRD 5.2.1 Rogue table).
This kit carries **seven blocks at 3, two at 9, three at 13, and three at
17** against the SRD Thief's 2/1/1/1. The count is far above the sibling and
is deliberate; the worksheet below prices the whole kit. One block (Too Old
for This) is a pure drawback and is listed as a real cost in the round math,
not as license for the rest.

## 3. Subclass Features

### Level 3: Seasoned Professional

You gain proficiency in one skill of your choice.

### Level 3: Old Training

You gain the **Two-Weapon Fighting** feat. For any feature or feat that
requires the Fighting Style Feature as a prerequisite, this feature
satisfies it.

### Level 3: Deeper Cuts

Your Sneak Attack deals one extra die of damage.

### Level 3: Old Reserves

When you deal Sneak Attack damage, you can draw on your reserves (no action
required, after seeing the damage roll): add a number of d6s to that damage
equal to half your Rogue level (round down). These dice are of the same
damage type as the Sneak Attack, are doubled by a critical hit, and can be
rerolled by Deuces Are Wild. Because Sure Strike is not Sneak Attack damage,
Old Reserves cannot be added to it. Once you use this feature, you can't use
it again until you finish a Short or Long Rest.

### Level 3: Too Old for This

You can only deal Sneak Attack damage on your turn. You cannot apply Sneak
Attack on Reactions or any effect outside your turn.

### Level 3: Deuces Are Wild

When you roll damage for a weapon attack, Sneak Attack, Old Reserves, or
Sure Strike, you can reroll each damage die that shows a 2, once per die.
You must use the new rolls.

### Level 3: Sure Strike

Once per turn, when you miss a creature with an attack using a Finesse or
Ranged weapon, you can choose to expend your Sneak Attack for the turn (no
action required): the target takes damage equal to **half your Sneak Attack
dice, rounded up**, of the weapon's damage type.

You must be able to see the target, and the attack must not have been made
with Disadvantage. On any turn you can deal Sneak Attack damage or use Sure
Strike, **but never both** — using either expends the turn's Sneak Attack.

### Level 9: Veteran's Strike

Your Sneak Attack dice equal your Rogue level (9d6 at 9th level, 20d6 at
20th). This replaces Deeper Cuts.

### Level 9: Extensive Experience

You gain proficiency in two skills of your choice.

In addition, choose two of your skill proficiencies. You gain Expertise in
those skills. You can choose skills in which you gained proficiency from
this feature.

### Level 13: Veteran Reflexes

When a creature you can see hits you with an attack, you can take a Reaction
to increase your Armor Class by an amount equal to your Proficiency Bonus
**against that attack**, potentially causing it to miss.

You can use this feature a number of times equal to your Proficiency Bonus,
and you regain all expended uses when you finish a Long Rest.

### Level 13: Critical Instincts

Your weapon attacks score a critical hit on a roll of 19–20. (Deliberately
narrower than its SRD ancestor: it does not extend to Unarmed Strikes —
this kit's chassis is Finesse and Ranged weapons.)

### Level 13: Fighting Style

You gain one Fighting Style feat of your choice. You can't take the same
feat as Old Training granted.

### Level 17: Master of Experience

You gain proficiency in every skill in which you don't already have
proficiency. You gain Expertise in every skill in which you don't already
have Expertise.

### Level 17: Heightened Lethality

Your weapon attacks score a critical hit on a roll of 18–20. This replaces
Critical Instincts.

### Level 17: Blindsight

You gain Blindsight out to a range of 10 feet.

## 4. Wording Notes

1. **Master of Experience** uses the broad owner ruling: all 18 skills —
   proficiency in everything first, then Expertise in everything.
2. **Fighting Styles are feats in SRD 5.2.1** (Archery, Defense, Great
   Weapon Fighting, Two-Weapon Fighting, prerequisite "Fighting Style
   Feature"); Old Training and the level-13 feature grant them as feats and
   satisfy the prerequisite. Archery is the standout level-13 pick for a
   ranged Veteran.
3. **Deuces Are Wild** is one reroll per die: a rerolled die that shows 2
   again keeps the 2.
4. **Veteran Reflexes** applies against the triggering attack only,
   declared after the hit is announced.
5. **Great Weapon Fighting + Deuces** touch the same dice: GWF treats 1s and
   2s as 3, so a die already treated as 3 shows no 2 to reroll. Stated so no
   table invents a double benefit.
6. **Critical hits and Deuces**: a critical doubles the dice rolled; each
   rolled die showing a 2 may be rerolled once. No double-reroll.
7. **Too Old for This and Sure Strike agree**: every Sneak Attack delivery
   path in this kit is on-turn.

## 5. Power-Budget Worksheet (design notes; derived arithmetic lives here)

Method note: all DPR figures are from a Monte Carlo simulation (thousands of
4-round combats per data point; enemy AC 14/16/18/18 at levels 3/6/11/17),
audited by two independent review passes on 2026-08-10; comparator builds
are optimized within 2024 rules. Numbers are model outputs, not playtest
results.

### 5.1 The guaranteed-damage line

Sure Strike makes the once-per-turn Sneak Attack near-deterministic: it
fails only against a target the Veteran cannot see, an attack made with
Disadvantage, or a turn with no Sneak Attack eligibility. Deuces raises each
d6 from 3.5 to 3.75 average (+7.1%).

| Rogue level | Sneak Attack | Avg | Avg w/ Deuces | Old Reserves (1/rest) |
|---:|---:|---:|---:|---:|
| 3 | 3d6 | 10.5 | 11.25 | +1d6 |
| 9 | 9d6 | 31.5 | 33.75 | +4d6 |
| 13 | 13d6 | 45.5 | 48.75 | +6d6 |
| 17 | 17d6 | 59.5 | 63.75 | +8d6 |

Critical range (weapon attacks): 19–20 from 13 (10% per d20; 19% with
Advantage), 18–20 from 17 (15%; 27.75% with Advantage). A level-17 critical
Sneak Attack rolls 34d6 (119 avg before Deuces) plus doubled weapon dice and
any doubled Old Reserves dice. Sure Strike deliveries are misses and cannot
critically hit.

**Round budget.** One Sneak Attack, on the Veteran's own turn, period. The
base class's off-turn Sneak Attack (Opportunity Attacks and similar) is
surrendered by Too Old for This — a real cost the comparator Thief keeps.

### 5.2 Defense line

Veteran Reflexes: Reaction, +PB to AC against a declared hit (+5 at 13, +6
at 17), PB uses per Long Rest. It competes with Uncanny Dodge for the same
Reaction — negate-or-halve becomes a live per-hit choice. The kit's tracked
resources are **two**: Veteran Reflexes' uses and Old Reserves' single
per-rest use. Blindsight 10 ft at 17 partially closes the unseen-attacker
case — which is also exactly the case that switches off both Veteran
Reflexes ("a creature you can see") and Sure Strike ("must be able to see
the target").

### 5.3 Skill line

Proficiencies: +1 at 3, +2 at 9; Expertise ×2 at 9; at 17, proficiency and
Expertise in all 18 skills.

### 5.4 Comparators (corrected board, 2026-08-10 audit)

Burst DPR over 4-round combats; "day" figures (four combats, Short Rests
between) are within one point for every row except the Paladin, whose
Long-Rest smites dilute.

All builds carry **+1/+2/+3 magic weapons at levels 6/11/17** (owner
ruling 2026-08-10).

| Build | L3 | L6 | L11 | L17 |
|---|---:|---:|---:|---:|
| **Veteran, melee (dual-wield Vex/Nick)** | **24.9** | **35.2** | **70.0** | **115.9** |
| Optimized Vengeance Paladin (melee ref.) | 19.5 | 34.7 | 60.5 | 72.3 |
| Champion Fighter, greatsword | 11.8 | 32.6 | 58.4 | 74.6 |
| SRD Thief, melee (incl. off-turn Sneak Attacks) | 18.4 | 26.4 | 43.3 | 75.6 |
| Barbed Court monk (this project; its ladder = its item) | 13.7 | 37.9 | 68.8 | 137.7 |

Ratios to the optimized Paladin (equal-items basis): **1.28× / 1.01× /
1.16× / 1.60×** — at the owner's stated targets (≈1× at 6, ahead at 11,
well ahead at 17 under the "few tables reach 17, and wizards are casting
*Wish*" waiver). The level-3
lead is the Rogue chassis itself (Sneak Attack + Steady Aim); a stock Thief
shows a similar spread. Against its own base class the premium is +38% at 6
and +73% at 11. The 40-round no-rest stress test shows the Veteran flat
(its burst equals its sustain — nothing in the engine depletes except Old
Reserves' one use), which makes it the most marathon-proof build measured.

### 5.5 Dip and stacking audit

A three-level dip exports Deeper Cuts (+1 die on a 2d6 pool), Sure Strike,
Old Reserves (+1d6), Deuces on every weapon attack, and the Two-Weapon
Fighting feat — priced against the on-turn-only drawback, which costs a dip
almost nothing. **Dip risk amber-high; outsider builds should be tested.**
The mitigation is that everything scales with Rogue level: the dip's version
is small.

### 5.6 Rest and day-shape stress

Everything except Veteran Reflexes and Old Reserves is at-will; one-fight
and long-day per-round output are near-identical (Old Reserves adds one
small nova per rest). Nova variance comes from crits, not rest pacing.

## 6. Failure-Taxonomy Pass

(The F-codes are this project's internal checklist of common homebrew
failure modes — e.g. F3 "is this a dip magnet?", F12 "does it trespass on
another character's niche?". Verdicts are design review, not playtest.)

| Trap | Verdict |
|---|---|
| F3 Dip Bait | **Amber-high** — see §5.5. |
| F7 Runaway Interaction | **Amber** — level-dice pool + 18–20 crits + Deuces + Archery is the stack to watch; capped by on-turn-once. |
| F8 Stacking Blindness | **Amber** — GWF/Deuces and crit/Deuces orders stated on paper only. |
| F10 White-Room Day | **Amber** — no table testing yet. |
| F12 Niche Trespass | **Amber** — the weapon-damage seat and every skill specialist's seat (Expertise-everything at 17); have the table conversation in §7. |
| F13 Bookkeeping Tax | Clear — two counters and one on-turn boundary. |
| All other checks | Clear (static drawback, SRD machinery throughout, no Advantage granted, nothing farmable or environment-gated, every level visibly changes play). |

## 7. Table Conversation and Harmed-Seat Check

Disclose before play: the Veteran deals its Sneak Attack essentially every
round regardless of the attack roll; from 13 its weapon attacks crit on
19–20 (18–20 from 17); at 17 it has proficiency and Expertise in every
skill. Ask the other weapon-damage player and every skill specialist whether
these make their best moments less necessary or less visible. The
conversation exposes the harmed seats; it does not balance the kit.

## 8. Distance Notes

1. **Thief distance — pass.** No analogue of any Thief feature.
2. **Champion crit ladder — deliberate, disclosed**: the SRD's 19–20 → 18–20
   range on a later schedule (13/17 vs 3/15), weapon attacks only.
3. **Great Weapon Fighting adjacency — disclosed**: Deuces rerolls 2s where
   the SRD feat floors 1s and 2s; different operation, same dice.
4. **No non-SRD work was consulted.** The kit is owner-authored; this
   document adds only SRD-anchored analysis.

## 9. Sources and License

Sources: the owner's rulings record, this project's design guidelines, and
SRD 5.2.1. No web source or third-party game text was consulted for rules
content.

**Open items:** playtests at every tier, outsider-dip builds, harmed-seat
conversations, cold-reader check.

This document is released under **CC-BY-4.0**. Attribute as: "Veteran
(Rogue subclass), © 2026 Derrick Schoen, CC-BY-4.0."

> This work includes material from the System Reference Document 5.2.1
> ("SRD 5.2.1") by Wizards of the Coast LLC, available at
> https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the
> Creative Commons Attribution 4.0 International License, available at
> https://creativecommons.org/licenses/by/4.0/legalcode.
