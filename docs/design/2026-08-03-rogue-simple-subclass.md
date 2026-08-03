# Rogue Subclass: Executioner

Status: **provisional, ready for design review only**. This is a MINT-FREE,
docs-only rebuild under D194, which amends D192. The level-3 critical range and
level-9 once-per-round engine are owner-frozen. The subclass name, feature
names, Weapon Reader ribbon, and level-13 and level-17 mechanics remain
**OWNER-APPROVAL**. Nothing here is represented as playtested.

## 1. Identity

OWNER-APPROVAL: Subclass name, identity paragraph, Weapon Reader retention, and
the three scene moments.

An Executioner is a rogue who **turns practiced openings into dependable
results** in order to finish danger without elaborate setup. In combat, the
rogue uses a familiar weapon, lands unusually frequent decisive hits, and
delivers the full force of Sneak Attack once each round. In exploration, the
rogue reads a weapon and disappears beside the smallest useful patch of shadow
or cover. In a social scene, the rogue relies on a pair of signature skills
whose results no longer swing with an unlucky die.

The loop is intentionally Champion-simple: observe whether Sneak Attack is
available, choose the attack, and let the Rogue's own weapon and Sneak Attack
rules carry the result. Later levels make the strike, access to hiding, and two
signature skills more reliable. The subclass adds no spell, pool, charge,
mark, stance, target duration, or rest-based use.

## 2. Host Schedule and Budget Posture

The Rogue subclass schedule is **3 / 9 / 13 / 17**. The SRD Thief has two named
features at level 3 and one at each later slot
([Rogue and Sneak Attack table](../srd/full/srd-5.2.1.txt#L3710-L3753),
[Thief](../srd/full/srd-5.2.1.txt#L3827-L3885)). This draft uses four scheduled
feature blocks, with Weapon Reader retained as compact support inside the
level-3 block.

Guideline 01 calls Rogue dependence **High by need; low by schedule** and
normally favors precision-damage reliability over a large new rider. D194
fixes two exceptions and the frame used to judge them:

1. attacks with Sneak-compatible weapons critically hit on 19 or 20 at level
   3; and
2. the first Sneak Attack in each round doubles its table dice at level 9, so
   the rogue can supply the Sneak Attack contribution of two ordinary Sneak
   Attacks without manufacturing an off-turn attack every round.

The budget worksheet therefore uses **two comparators**, not one convenient
sibling: the SRD Thief required by the guidelines, and the owner's recorded
Rogue 5/Fighter 6 DPR benchmark. The two comparators answer different
questions and produce different verdicts.

## 3. Subclass Features

The following four scheduled feature blocks are the complete rules packet.

### Level 3: Measured Lethality

OWNER-FROZEN MECHANIC; OWNER-APPROVAL: Original feature name and final wording.

Your attack rolls with a weapon that has the Finesse property or is a Ranged
weapon can score a Critical Hit on a roll of 19 or 20 on the d20.

**Weapon Reader (ribbon).** OWNER-APPROVAL: Retention of the existing ribbon and
its complete text.

After you observe a creature hold or use a weapon for at least 1 minute, you
know whether that creature is proficient with the weapon and whether it has
dealt damage with that weapon within the past 24 hours.

### Level 9: Double Sneak Attack

OWNER-FROZEN MECHANIC; OWNER-APPROVAL: Feature name and final wording.

The first time in a round that you deal Sneak Attack damage, roll twice the
number of Sneak Attack dice shown for your Rogue level in the Sneak Attack
column of the Rogue Features table. If you deal Sneak Attack damage again in
the same round, use the normal number of dice from the table for that Sneak
Attack.

Before doubling the dice, subtract any Sneak Attack dice you forgo to pay the
die cost of a Cunning Strike effect.

On a Critical Hit, the attack's damage dice are rolled twice as normal. Thus,
when your first Sneak Attack of a round is part of a Critical Hit—including a
Critical Hit on a 19 or 20 from Measured Lethality—you roll the doubled Sneak
Attack dice twice. With no Cunning Strike cost, that is four times the number
of Sneak Attack dice shown in the table.

### Level 13: Vanishing Point

OWNER-APPROVAL: Entire feature, including the 5-foot scope, Dim Light and Half
Cover thresholds, and removal of both normal Hide preconditions.

While you are within 5 feet of an area of Dim Light or an object or structure
large enough to grant Half Cover, you can take the Hide action even if you
aren't Heavily Obscured or behind Three-Quarters Cover or Total Cover, and even
if you are in an enemy's line of sight. You still make the Hide action's
Dexterity (Stealth) check, and all other rules for that action apply.

### Level 17: Practiced Certainty

OWNER-APPROVAL: Entire feature, including two Expertise skills and the floor of
15.

When you gain this feature, choose two skills in which you have Expertise.
Whenever you make an ability check that uses either chosen skill proficiency,
you can treat a d20 roll of 14 or lower as a 15. For those checks, this benefit
replaces the minimum d20 roll from Reliable Talent.

## 4. Power-Budget Worksheet

### 4.1 Two-comparator method

| Comparator | Question | Result |
|---|---|---|
| SRD Thief | How much power and utility does the same Rogue chassis receive at 3/9/13/17? | Executioner is substantially above Thief in sustained weapon damage from level 9, substantially below it in broad object/magic-item utility, and differently reliable at 13/17. **Combat-high; whole-kit unresolved.** |
| Owner benchmark: built Rogue 5/Fighter 6 at DPR parity | Does one doubled Sneak Attack replace the DPR contribution for which a built rogue/fighter must contrive additional attacks and off-turn delivery? | D194 records parity as the target and rationale. One doubled table contribution is exactly `2T`, the same Sneak Attack contribution as two ordinary table applications at the comparator's relevant rate. The once-per-round boundary prevents the multiplier from riding both an on-turn and off-turn Sneak Attack. **Meets the owner benchmark by construction; exact build-card reproduction remains amber because the permitted packet does not specify that build's equipment, feats, subclass, accuracy, or round cadence.** |

`T` is the average damage of the Sneak Attack dice shown in the relevant Rogue
table; weapon dice and modifiers are held outside this identity check. This
does not claim that two characters with different Rogue levels have the same
Sneak Attack table. It records why the owner benchmark concerns total built
DPR while the feature's replaceable contribution is `2T`.

### 4.2 Feature-by-feature record

| Feature | Slot; weight | Access, actions, state, frequency | Scaling, pillars, export | Thief comparison and verdict |
|---|---|---|---|---|
| Measured Lethality + Weapon Reader | 3; combat rock + ribbon | At will; no action or retained state; the critical benefit is offered on every qualifying attack and resolves on about 10% of single d20 attacks; Weapon Reader takes 1 minute | Finesse/Ranged weapon dice and Sneak Attack scale with Rogue level; C/E/S; a 3-level dip exports the 19–20 range | Fast Hands and Second-Story Work give broad Bonus Action utility and mobility. This bundle gives more spike damage and narrower information; **dip and famine amber** |
| Double Sneak Attack | 9; dominant rock | Automatic on the first Sneak Attack each round; no action, use, or target state; later Sneak Attacks that round are normal | Rogue table; C; requires nine Rogue levels | Supreme Sneak is a 1d6-cost stealth option. This is much stronger sustained damage; **far above the Thief slot, owner-frozen** |
| Vanishing Point | 13; utility/combat rock | At will; uses the existing Hide action; no persistent state beyond normal hiding; relevant whenever nearby light or cover satisfies the access test | Base Hide check and Rogue skills; C/E; thirteen Rogue levels | Use Magic Device supplies broad item access and efficiency. This is narrower but offers repeatable hiding access; **below in breadth, potentially strong in encounter frequency** |
| Practiced Certainty | 17; utility capstone | At will; passive after two acquisition choices; no action or changing menu; relevant on every check with either chosen skill | Expertise, Reliable Talent, and the chosen ability modifier; C/E/S; seventeen Rogue levels | Thief's Reflexes adds a complete second turn in round 1. This instead guarantees exceptional signature-skill totals throughout a scene; **less combat tempo, more persistent certainty** |

### 4.3 Sneak Attack, Cunning Strike, and off-turn math

Let `N` be the number of Sneak Attack dice in the Rogue table and `C` be the
total Cunning Strike die cost paid on that Sneak Attack.

- First Sneak Attack of the round: `2 × (N − C)` dice.
- A later Sneak Attack in the same round: `N − C` dice.
- Critical first Sneak Attack: `4 × (N − C)` dice.
- Critical later Sneak Attack: `2 × (N − C)` dice.

The cost is therefore paid **before** doubling. A 1d6 cost at Rogue 9 changes
the first Sneak Attack from `2 × 5d6 = 10d6` to `2 × 4d6 = 8d6`, not 9d6.
The feature does not discount the cost as a fraction of the table pool.

| Rogue level | Table `N` | First Sneak | First with 1d6 cost | Critical first, no cost | Later Sneak that round |
|---:|---:|---:|---:|---:|---:|
| 9 | 5d6 | 10d6 (35 avg.) | 8d6 (28 avg.) | 20d6 (70 avg.) | 5d6 (17.5 avg.) |
| 13 | 7d6 | 14d6 (49 avg.) | 12d6 (42 avg.) | 28d6 (98 avg.) | 7d6 (24.5 avg.) |
| 17 | 9d6 | 18d6 (63 avg.) | 16d6 (56 avg.) | 36d6 (126 avg.) | 9d6 (31.5 avg.) |

**The off-turn breach is closed at the multiplier.** Under the discarded
per-turn expression, an on-turn and off-turn Sneak Attack each doubled for
`4N` dice in one round. Under D194, the same pair is `2N + N = 3N`; the second
Sneak Attack is unequivocally normal. A character who does not seek the
off-turn attack deals `2N`, matching the Sneak Attack contribution of an
ordinary rogue who contrives two normal applications (`N + N = 2N`). External
action-economy support can still add the normal `N`; D194 closes repeated
doubling, not the base class's once-per-turn permission.

### 4.4 Critical-hit math

The normal critical-hit rule rolls all of the attack's damage dice twice,
including Sneak Attack dice
([Critical Hits](../srd/full/srd-5.2.1.txt#L996-L1013)). Measured Lethality
deliberately uses the SRD Champion's 19–20 shape but narrows it to the weapons
that can normally carry Sneak Attack
([Champion](../srd/full/srd-5.2.1.txt#L2968-L2985)).

| Roll mode | Normal 20-only critical chance | 19–20 critical chance | Increase |
|---|---:|---:|---:|
| One d20 | 5% | 10% | +5 percentage points |
| Advantage | `1 − 0.95² = 9.75%` | `1 − 0.90² = 19%` | +9.25 percentage points |

With Advantage, the subclass therefore critically hits on about **19% of
qualifying attacks**. On the doubled first Sneak Attack, the 19–20 critical
rolls the doubled pool twice: 20d6 at Rogue 9, 28d6 at 13, and 36d6 at 17
before any Cunning Strike cost. The weapon's damage dice are also doubled, but
static modifiers are not.

### 4.5 Whole-kit snapshots and comparator verdicts

| Snapshot | Executioner | SRD Thief | Verdict |
|---|---|---|---|
| Entry (3) | 19–20 criticals with Sneak-compatible weapons; narrow weapon information | Bonus Action object/skill use, climbing, and Dexterity jumping | Executioner trades broad utility for an infrequent damage spike; **paper-plausible, dip/famine amber** |
| Tier 2 (9) | First Sneak each round is 10d6 before costs; later Sneaks are 5d6 | A 1d6-cost way to preserve hiding after an attack | **Far above Thief's damage line; at the owner's contrived-second-Sneak benchmark by construction** |
| Tier 3 (13) | First Sneak is 14d6; can attempt to Hide while observed near Dim Light or Half Cover | Four attunements, charge conservation, and broad scroll access | Executioner is combat/reliability focused; Thief is much broader in magic-item utility; **different axes, Hide frequency amber** |
| Tier 4 (17) | First Sneak is 18d6; two Expertise skills have a d20 floor of 15 | A second turn in round 1 | Executioner sustains damage and signature-skill certainty; Thief owns stronger opening tempo; **Executioner remains combat-high overall** |

**Comparator verdict — SRD Thief:** Executioner is not at the Thief's damage
posture from level 9 onward. Once-per-round prevents the former `4N` supported
round, but `2N` every round and the 19–20 critical range remain much stronger
than Supreme Sneak. Thief retains materially broader mobility, object, and
magic-item utility.

**Comparator verdict — owner benchmark:** D194's goal is parity with the built
Rogue 5/Fighter 6 without requiring a manufactured Opportunity Attack or
round-by-round ally support. The intended comparison passes: one first Sneak
at `2N` replaces two normal applications at `2N`, and a second Sneak cannot
receive the multiplier. Reproducing the benchmark's exact total DPR is amber
until its build card and encounter assumptions are supplied; this draft does
not invent them from its own output.

### 4.6 Actions, stacking, rest stress, and tracking

- **Ordinary turn:** take the Attack action with a Finesse or Ranged weapon;
  normal Sneak Attack eligibility applies; Cunning Action or Steady Aim retains
  the Bonus Action; Uncanny Dodge retains the Reaction.
- **Supported round:** Advantage raises the 19–20 critical chance to about 19%.
  An existing legal Reaction attack can deliver a later, normal Sneak Attack;
  it never receives Double Sneak Attack after the round's first Sneak.
- **Cunning Strike:** every die cost is removed from the table pool before the
  first Sneak's remaining dice are doubled.
- **One-fight, no-Short-Rest, and rest-rich days:** identical access. No
  subclass feature spends or recovers a resource.
- **Bookkeeping:** there is no number, target, duration, or resource to track.
  The only transient timing fact is whether the first Sneak Attack of the
  current round has occurred, mandated by D194's boundary.

## 5. Failure-Taxonomy Pass

All sixteen traps in guideline 04 were rerun against the rebuilt whole kit.

| Trap | Check performed | Verdict |
|---|---|---|
| F1 Compounding Punishment | No failure creates a second cost or consumes a later action. | Clear |
| F2 Imported Chassis Mismatch | Every rule is expressed through SRD critical hits, Sneak Attack, Cunning Strike, Hide, Expertise, or Reliable Talent. | Clear |
| F3 Dip Bait | Rogue 3 exports a 19–20 range with every Finesse or Ranged weapon plus the base Rogue 3 package. The restriction fits Rogue but also fits several Dexterity weapon builds. | **Amber; three outsider builds required** |
| F4 Farmable or Famine Triggers | Nothing is farmable or restores input. A 19–20 result still occurs on only 10% of ordinary qualifying attacks (19% with Advantage), so the visible level-3 combat feature is stochastic rather than a deterministic loop. Base Sneak Attack and Weapon Reader remain available. | **Amber; acquisition usage test** |
| F5 Advantage Faucet | No Advantage is granted. Existing Advantage is priced by its source and included in the 19% critical calculation. | Clear |
| F6 Action Congestion / Economy Multiplication | No action, attack, turn, Bonus Action, or Reaction is added. Externally supplied attacks carry only a normal later Sneak Attack. | Clear |
| F7 Runaway Interaction Math | The once-per-round boundary holds magnitude to `2N` for the first Sneak and `N` later. Criticals make the first `4N`, not an unbounded repeat. | **Amber; high but explicitly capped stack** |
| F8 Stacking Blindness | Advantage, criticals, Cunning Strike costs, ordinary weapons, party-granted Reaction attacks, and the two-Sneak round are calculated in section 4. | **Amber; adversarial table proof absent** |
| F9 Golden-Cage Benchmark | Every slot and whole-kit tier is compared to Thief; the separate owner benchmark is disclosed rather than substituted for it. | Clear |
| F10 White-Room Day | All features are at will. One-fight and long-day per-round access are identical; nova variance comes from criticals, not rest pacing. | **Amber; sustained combat-high posture** |
| F11 Campaign-Contingent Payload | Only Vanishing Point depends on the scene supplying Dim Light or suitable cover, and normal Hide remains the fallback. | **Amber; one environmental dependency** |
| F12 Niche Trespass | Weapon-damage and skill-specialist seats are exposed: sustained Sneak damage may compress another martial's moment, while a minimum Expertise roll can erase another specialist's uncertainty. | **Amber; harmed-seat conversation required** |
| F13 Bookkeeping Tax | No pool, mark, menu, or duration exists. The first-Sneak-per-round fact is one transient binary check. | Clear structurally; cold-reader timing amber |
| F14 Bounced Flavor Cheque | Level 3 improves the decisive strike and reads weapons; 9 guarantees the DPR contribution once per round; 13 guarantees access to a Hide attempt; 17 guarantees signature-skill floors. | Clear pending owner approval |
| F15 Dead-Air Progression | Level 13 adds a new Hide permission in combat and exploration; level 17 culminates the reliability register without a late subsystem. | Clear on paper; fifth-use satisfaction amber |
| F16 Untested Altitude | No acquisition, level-9, level-13, or level-17 table play has occurred. | **Amber; all table behavior provisional** |

## 6. Filled Design Checklist

Legend: **Green** is supported by a rule, calculation, or SRD comparison.
**Amber** requires owner, cold-reader, harmed-seat, build-card, or table
evidence. Owner-frozen does not mean proven balanced.

### 6.1 Identity and host declaration

| Item | Status | Evidence |
|---|---|---|
| Fantasy sentence | Green | A rogue turns practiced openings into dependable results to finish danger without elaborate setup; three scene moments are stated. |
| Unserved loop | Green | Base Rogue and Thief do not widen the qualifying-weapon critical range, double the first Sneak each round, relax Hide access, or raise a narrow skill floor. |
| Fiction-to-rule map | Amber | Practice maps to all four levels, but name, identity, and authored features need owner approval. |
| Flavor cheque by level | Green | 3 decisive hit/weapon reading; 9 dependable DPR; 13 dependable Hide access; 17 dependable signature skills. |

### 6.2 Schedule and slot budget

| Item | Status | Evidence |
|---|---|---|
| Schedule conformance | Green | Rogue 3/9/13/17; no added, omitted, or shifted level. |
| Feature-count explanation | Green | One level-3 combat rock plus Weapon Reader support; one block at every later slot. |
| Budget per slot | Green | Section 4 records weight, access, actions, state, frequency, scaling, pillars, export, and same-class comparison. |
| Whole-kit budget | Amber | Thief comparison is combat-high; owner comparator is parity; the difference is explicit and needs play. |
| Class dependence fit | Amber | Reliability and native-engine attachment fit Rogue; the owner-frozen damage magnitude exceeds the guideline sibling. |

### 6.3 Progression and scaling

| Item | Status | Evidence |
|---|---|---|
| Level-3 loop present | Amber | Observe eligibility, choose a target, make the normal attack, and sometimes produce a 19–20 critical. The subclass-visible combat change is stochastic. |
| Later features deepen loop | Green | The first strike, access to hiding, and signature skill results become reliable without a second engine. |
| Tier-appropriate scaling | Amber | Exact dice are shown at 9/13/17; tier-3 adds a permission and tier-4 removes uncertainty, but neither has live proof. |
| Native-engine attachment | Green | Weapon category, Rogue-table dice, Hide, Expertise, and Reliable Talent carry every rule. |
| No new required ability | Green | No new attack ability, DC, or use-count ability is introduced. |

### 6.4 Multiclass and interaction audit

| Item | Status | Evidence |
|---|---|---|
| Outsider reading 3–5 | Amber | Fighter 17, Ranger 17, and Monk 17 each buy base Rogue 3 plus 19–20 criticals with their qualifying weapons; exact build tests remain. |
| Dip-resistant scaling | Amber | Sneak dice scale only with Rogue level, but the 19–20 range itself is portable and fully online at Rogue 3. |
| Full-stack test | Amber | Section 4 assembles ordinary weapons, Advantage, criticals, Cunning Strike, and off-turn delivery on paper; table proof is absent. |
| Near-automatic overshoots absent | Amber / frozen exception | No broad proficiency doubling, save pair, defense formula, resource loop, accuracy bonus, or extra action exists; the deliberate exception is `2N` first-Sneak damage. |

### 6.5 Actions, accuracy, and triggers

| Item | Status | Evidence |
|---|---|---|
| Action-economy tally | Green | Action Attack; Bonus Action base Rogue option; Reaction base Rogue option or existing attack; concentration none; free riders critical range/doubling; off-turn Sneak normal after the first. |
| Extra-economy carrier | Green | The subclass adds no carrier, and the once-per-round multiplier cannot ride a second carrier. |
| Advantage gate | Green | No Advantage granted; existing Advantage is separately priced. |
| Flat-bonus gate | Green | No flat attack, AC, save, or save-DC bonus. |
| Farmability audit | Green | Allies, objects, summons, repeated Initiative, and target swapping restore nothing or reset the round boundary. |
| Famine audit | Amber | Criticals are infrequent, but normal Sneak Attack and the later deterministic features remain. Acquisition fun needs observation. |
| Frequency statement | Green | Critical offered every qualifying attack; Weapon Reader 0–2 scenes/session; Double on first successful Sneak each round; Vanishing Point whenever environment qualifies; Practiced Certainty on every chosen-skill check. |

### 6.6 Resource and rest stress

| Item | Status | Evidence |
|---|---|---|
| Uses model matches effect | Amber | No resource violates the owner's simplicity brief; the Thief comparator still reads the at-will damage as high. |
| One-fight-day test | Amber | Best supported round is a critical `4N` first Sneak plus at most a normal later Sneak; live encounter impact is unknown. |
| No-Short-Rest day | Green | No subclass feature depends on rest recovery. |
| Rest-rich day | Green | No subclass output reloads or changes with rests. |
| Drawback integrity | Green | No drawback is claimed as a balancing price. |

### 6.7 Pillars, party, and campaign

| Feature block | C | E | S | Player initiates? | Weight |
|---|:---:|:---:|:---:|:---:|---|
| Measured Lethality + Weapon Reader | C | E | S | Yes | Rock + ribbon |
| Double Sneak Attack | C | — | — | Yes | Dominant rock |
| Vanishing Point | C | E | — | Yes | Utility/combat rock |
| Practiced Certainty | C | E | S | Yes | Utility capstone |

| Item | Status | Evidence |
|---|---|---|
| Pillar coverage grid | Green | Every feature block and scene is classified; the whole kit reaches C/E/S. |
| No single-pillar silence | Green | Weapon Reader and the chosen skills are player-initiated outside combat; no scheduled level is ribbon-only. |
| Niche trespass | Amber | Other weapon-damage and skill-specialist players require harmed-seat observation. |
| Campaign contingency | Amber | One feature uses environmental Dim Light/cover; normal Hide is the fallback. |
| Social dependency | Amber | The mechanics require no fixed party, but the damage and skill floors require a table conversation about spotlight compression. |
| Equipment/companion continuity | Green | Any proficient Finesse or Ranged weapon works; no companion exists. |

### 6.8 Complexity and table speed

| Item | Status | Evidence |
|---|---|---|
| One tracked quantity maximum | Green | No quantity; only whether the round's first Sneak Attack has occurred. |
| One recurring decision center | Green | The subclass adds no menu; normal targeting and Cunning Strike remain the Rogue's decisions. |
| Trigger clarity | Amber | “First in a round” is explicit, but a cold reader must correctly distinguish a round from a turn. |
| Table-speed simulation | Amber | Expected ordinary call: attack, check first Sneak, pay costs, double remainder, roll. Estimated fifth use 15 seconds; not timed. |
| Cold-reader test | Amber | Operative text states category, order, boundaries, access, and floors; independent adjudication is absent. |

### 6.9 Playtest coverage and status

| Item | Status | Evidence |
|---|---|---|
| Usage instrument | Green | Record eligible/noticed/resolved criticals; first/later Sneaks; costs before doubling; Hide offers/successes; chosen-skill checks; rule reopenings; and harmed-seat participation. |
| Acquisition test | Amber | Not run at Rogue 3. |
| Middle-tier test | Amber | Not run at Rogue 9. |
| Untested altitude | Amber | Levels 13 and 17 unplayed; both authored features and their interaction are provisional. |
| Harmed-party observation | Amber | Not run from another martial or skill-specialist seat. |
| Fifth-use verdict | Amber | Not run. |

### 6.10 Clean-room and release gate

| Item | Status | Evidence |
|---|---|---|
| Permitted citations | Green | Only D194/D192, guidelines 00–05, SRD 5.2.1, the prior draft, and the dispatch's two distilled idea pools were used. |
| External names / Product Identity | Green | No forbidden subclass, creator, setting, character, creature, or plane appears. |
| Non-SRD quotation | Green | No third-party wording is reproduced; all rules expression is original or attributed SRD material. |
| Risk disposition | Green | Every evidence gap and comparator conflict is listed below rather than called balanced. |

| Provisional item | Risk | Required test | Owner/status |
|---|---|---|---|
| Executioner identity and Weapon Reader | The old ribbon may feel investigative rather than reliable, and its 24-hour fact may invite fiction questions | Owner text review and a cold-reader social/exploration scene | **OWNER-APPROVAL pending** |
| Measured Lethality | Portable Rogue 3 dip; subclass identity may appear too rarely without Advantage | Three level-17 outsider builds and repeated Rogue 3 combats | Mechanic frozen; name/wording approval pending |
| Double Sneak Attack | `2N` exceeds Thief while criticals reach `4N`; round/turn language may be misread | Levels 9/13/17 combats with Advantage, Cunning Strike, and a supported Reaction attack | Mechanic frozen; comparator conflict amber |
| Rogue 5/Fighter 6 comparator | Exact parity cannot be reproduced without the owner's build card | Supply gear, feats, subclass, accuracy, round cadence, and rest assumptions; rerun DPR | Recorded owner verdict accepted; reproduction amber |
| Vanishing Point | Dim Light/cover frequency and “large enough” judgment may vary; observed hiding may be too available or too rare | Three maps at level 13, including bright open ground and mixed cover; cold GM adjudication | **OWNER-APPROVAL pending** |
| Practiced Certainty | Floor 15 plus Expertise can trivialize hard checks and compress another specialist's seat | Level-17 C/E/S scenes with two different chosen-skill pairs and harmed-seat observation | **OWNER-APPROVAL pending** |
| Niche and speed | Another martial or specialist may contribute less; first-Sneak timing may be forgotten | Pre-play table conversation, harmed-seat log, and timed fifth use | Reviewer/test owner unassigned |

**Pre-flight result:** **Ready for design review only, not represented as
balanced.** Schedule, critical interaction, cost order, once-per-round boundary,
two comparators, clean-room boundary, and exact dice math are present. Owner
approval, a comparator build card, independent adjudication, and all table tests
remain outstanding. Reviewer: initial author desk pass. Date: 2026-08-03.

## 7. Table Conversation and Harmed-Seat Check

Before this subclass enters play, disclose two deliberate facts to the whole
table: its first Sneak Attack each round supplies the damage contribution that
D194 compares to an optimized rogue/fighter without requiring recurring
off-turn help, and its two chosen Expertise skills eventually receive a d20
floor of 15. Ask the other weapon-damage player and the other likely skill
specialist whether either rule makes their best moments less necessary or less
visible. The facilitator should also state how often Dim Light and useful cover
normally appear.

During play, record whether those players speak, act, or contribute less in
rounds and scenes where Double Sneak Attack or Practiced Certainty resolves.
This conversation does not mathematically balance the features; it exposes the
two seats most likely to be harmed and establishes the evidence needed for an
owner decision.

## 8. Distance Checklist

1. **Thief name distance — Pass.** No feature uses Fast Hands, Second-Story
   Work, Supreme Sneak, Use Magic Device, or Thief's Reflexes.
2. **Thief mechanical distance — Pass.** The subclass adds no Bonus Action
   object use, climbing/jumping benefit, post-attack hidden retention,
   magic-item access, charge conservation, scroll casting, or extra turn.
3. **Champion-shape disclosure — Deliberate and attributed.** Measured
   Lethality uses the SRD Champion's 19–20 critical shape with an original name
   and narrows it from all weapons and Unarmed Strikes to weapons that match
   Sneak Attack's Finesse/Ranged framing. This is disclosed mechanical ancestry,
   not claimed distance.
4. **Distilled-pool distance — Pass.** Vanishing Point adapts the permitted
   precondition-removal shape, and Practiced Certainty adapts the permitted
   scoped-floor shape. Their rules text and feature names are original; no
   source expression was consulted or reproduced.
5. **BFRD attribution — Not triggered.** Neither selected late feature uses a
   BFRD-derived idea from the dispatch's pool, so no BFRD CC-BY attribution line
   is due. The selected shapes both came from the distilled 3.5 pool.

## 9. Clean-Room Sources and License

This rebuild uses only D194 as the amendment to D192, the six files in
`docs/design/subclass-guidelines/`, SRD 5.2.1, the prior version of this
document, and the two distilled idea pools in the dispatch. It uses no material
from the forbidden non-free summaries. No web source, other document, or
undistilled third-party text was consulted.

This document is released under CC-BY-4.0 (Creative Commons Attribution 4.0
International).

> This work includes material from the System Reference Document 5.2
> ("SRD 5.2") by Wizards of the Coast LLC, available at
> https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
> Commons Attribution 4.0 International License, available at
> https://creativecommons.org/licenses/by/4.0/legalcode.
