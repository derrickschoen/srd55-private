# Rogue Subclass: Executioner

Status: **provisional, ready for design review only**. This is a MINT-FREE,
docs-only full subclass draft. D192's level-9 engine is reproduced without
softening; every other authored feature remains subject to owner approval and
playtest.

## 1. Identity

OWNER-APPROVAL: Subclass name, identity paragraph, and three scene moments.

An Executioner is a rogue who **singles out one foe at a time** in order to end
a dangerous scene with one decisive weapon strike. In combat, the rogue waits
until a foe stands without help and drives a weapon into the opening. In
exploration, the rogue studies a weapon and the hands carrying it before
choosing a route past its owner. In a social scene, the rogue spots the supposed
courtier whose grip reveals a practiced killer.

The repeated loop is deliberately plain: isolate, strike, and let the Rogue's
own Sneak Attack table carry the result. The subclass introduces no spell,
pool, counter, stance, mark, or limited use.

## 2. Host Schedule and Budget Posture

The Rogue subclass schedule is **3 / 9 / 13 / 17**. The SRD Thief has two named
features at level 3 and one at each later slot
([Rogue and Sneak Attack table](../srd/full/srd-5.2.1.txt#L3710-L3753),
[Thief](../srd/full/srd-5.2.1.txt#L3827-L3885)). Executioner uses the same
five-feature cadence. Its five operative feature texts total about **184 rules
words**, below the Champion structural model's 199 rules words across six
features ([Champion](../srd/full/srd-5.2.1.txt#L2968-L3016)).

Guideline 01 calls Rogue dependence **High by need; low by schedule**: level 3
must establish a native precision-damage loop without becoming a portable
multiclass package, and later power should normally favor reliability over a
large rider. D192 deliberately overrides that normal damage posture at level 9.
The protected dial is the unconditional doubling of the Sneak Attack dice shown
in the class table. The worksheet reports its price rather than inventing a
condition, resource, or action cost.

## 3. Subclass Features

### Level 3: Single Out

OWNER-APPROVAL: Entire feature, including the isolation test and its application
to both Finesse and Ranged weapons through the normal Sneak Attack rule.

You don't need Advantage on the attack roll to use Sneak Attack if no creature
other than you is within 5 feet of the target and you don't have Disadvantage
on the attack roll. All the other rules for Sneak Attack still apply.

### Level 3: Weapon Reader

OWNER-APPROVAL: Entire feature, including the one-minute observation time and
the two facts learned.

After you observe a creature hold or use a weapon for at least 1 minute, you
know whether that creature is proficient with the weapon and whether it has
dealt damage with that weapon within the past 24 hours.

### Level 9: Double Sneak Attack

OWNER-SPECIFIED FROZEN ENGINE: D192 fixes the unconditional doubling. The
feature name and SRD-register expression are draft wording.

When you deal Sneak Attack damage, roll twice the number of Sneak Attack dice
shown for your Rogue level in the Sneak Attack column of the Rogue Features
table.

OWNER-APPROVAL: The following Cunning Strike interaction sentence resolves
order of operations without reducing the frozen multiplier.

The doubled dice are Sneak Attack damage dice. If you use a Cunning Strike
effect, remove its die cost from the doubled number of dice before rolling
them.

### Level 13: Ready Arsenal

OWNER-APPROVAL: Entire feature, including access to every qualifying weapon's
mastery property.

You can use the mastery property of every weapon with which you have
proficiency that has the Finesse property or is a Ranged weapon.

### Level 17: Certain Harm

OWNER-APPROVAL: Entire feature, including the deliberately small floor of 2.

When you roll a weapon's damage die or a Sneak Attack die and roll a 1, treat it
as a 2.

## 4. Power-Budget Worksheet

### Host posture and protected dial

Executioner attaches every combat rule to weapons, Weapon Mastery, or Sneak
Attack. It adds no attack, action, Bonus Action, Reaction, Advantage, flat
accuracy bonus, defense bonus, spell, resource, or persistent state. Single Out
changes eligibility but not accuracy. Ready Arsenal changes weapon choice but
not the property printed on a weapon. Certain Harm raises only the minimum of a
damage die.

The exception is Double Sneak Attack. It is an always-on multiplier applied to
the Rogue's scaling damage engine and is consequently much larger than the
level-9 Thief feature. That conclusion is not repaired away because D192 freezes
the mechanic.

### Feature-by-feature record

| Feature | Slot; weight | At-will / nova | Actions, state, and frequency | Scaling, pillars, and export | Thief comparison and verdict |
|---|---|---|---|---|---|
| Single Out | 3; rock | At will; no separate nova | No action; checked when Sneak Attack eligibility is checked; expected in 1–3 rounds per fight when a foe is isolated | Sneak Attack scales only with Rogue level; C; a 3-level dip exports an alternate route to 2d6 | Fast Hands adds broad Bonus Action utility and Second-Story Work adds mobility. Single Out is narrower but directly improves combat reliability; **within entry budget, dip amber** |
| Weapon Reader | 3; ribbon | At will | 1 minute of observation; no retained state | E/S; no numeric scaling; exports information only | Less broad than Second-Story Work and does not compete with Cunning Action; **subdued support** |
| Double Sneak Attack | 9; dominant rock | At will; doubles every legal Sneak Attack, including an off-turn Sneak Attack | No action or new state; expected whenever Sneak Attack lands | Rogue table: 10d6 at 9, 14d6 at 13, 18d6 at 17; C; requires nine Rogue levels | Supreme Sneak adds a 1d6-cost stealth option and no damage. This adds 17.5 average damage on every successful level-9 Sneak Attack; **far above comparator, owner-frozen hot** |
| Ready Arsenal | 13; utility rock | At will | No action or state; relevant when equipment or desired mastery changes | Rogue weapon proficiency and weapon properties; C/E; thirteen Rogue levels | Use Magic Device grants broad magic-item access and efficiency. Ready Arsenal is martial flexibility only; **well below comparator to flank level 9** |
| Certain Harm | 17; subdued rock | At will; no nova beyond more dice in a critical hit | No action or state; relevant on every weapon damage roll | Weapon and Sneak Attack dice; C; seventeen Rogue levels | Thief's Reflexes can add a full turn in round 1. Certain Harm adds only 3 average damage to an 18d6 Sneak Attack before the weapon die; **well below comparator to flank level 9** |

### Rogue damage-delta table

The table assumes one successful Sneak Attack with no Cunning Strike cost. A d6
averages 3.5. The attempted-turn column applies a constructed 65 percent hit
rate only to expose scale; it is not a claim about table accuracy. Thief has no
feature that changes the class-table Sneak Attack dice at these levels.

| Rogue level | Class-table / Thief dice | Thief average | Executioner dice | Executioner average | Delta on a successful Sneak Attack | Delta per attempted turn at 65% |
|---:|---:|---:|---:|---:|---:|---:|
| 9 | 5d6 | 17.5 | 10d6 | 35 | **+17.5** | **+11.38** |
| 13 | 7d6 | 24.5 | 14d6 | 49 | **+24.5** | **+15.93** |
| 17 | 9d6 | 31.5 | 18d6 | 63 | **+31.5** | **+20.48** |

A 1d6 Cunning Strike cost leaves the Executioner rolling 9d6, 13d6, or
17d6 at these levels, while the Thief rolls 4d6, 6d6, or 8d6. The cost remains
one die; it is not doubled. The multiplier therefore makes Cunning Strike much
cheaper as a fraction of retained damage.

At level 17, Thief's Reflexes can produce two 9d6 Sneak Attacks in the first
round if both turns qualify, for 18d6 total. Executioner reaches 18d6 with one
qualifying Sneak Attack in every round. Because Sneak Attack is once per turn
rather than once per round, a legal Reaction attack on another creature's turn
can deliver another 18d6; party-granted Reaction attacks are therefore the
largest stacking risk.

**Hot verdict:** Double Sneak Attack is not merely high-side. It is an
always-on +100 percent increase to the class's main scaling damage component,
outclasses Supreme Sneak at acquisition, discounts every Cunning Strike cost as
a share of remaining dice, and doubles the reward from every legal off-turn
Sneak Attack. The quiet level-13 and level-17 features do not make the whole kit
comparable to Thief in sustained damage. D192 freezes this result; only owner
review and adversarial playtesting can decide whether the intended play
experience justifies the outlier.

### Whole-kit snapshots

| Snapshot | Executioner | Thief comparator | Budget verdict |
|---|---|---|---|
| Entry (3) | Alternate isolated-foe Sneak Attack eligibility plus narrow weapon-reading | Bonus Action object/skill use, climbing, and Dexterity jumping | Less utility, more combat reliability; **paper-close, F3 amber** |
| Tier 2 (9) | Every Sneak Attack doubles from 5d6 to 10d6 | A 1d6-cost way to preserve the Hide action's Invisible condition | **Executioner is decisively over the slot line** |
| Tier 3 (13) | 14d6 Sneak Attack and all qualifying weapon masteries | Four attunements, charge conservation, and broad scroll access | Quiet new feature does not offset the inherited damage gap; **whole kit remains hot** |
| Tier 4 (17) | 18d6 Sneak Attack; die results of 1 become 2 | A second first-round turn | Thief can match 18d6 only through two successful first-round Sneak Attacks; Executioner sustains it and multiplies off-turn attacks; **hot** |

### Action economy, stacking, and rest stress

- **Ordinary turn:** Attack action with a Finesse or Ranged weapon; Single Out
  or the normal Sneak Attack condition establishes eligibility; Cunning Action
  or Steady Aim still owns the Bonus Action; Uncanny Dodge still owns the
  Reaction.
- **Best supported turn:** Advantage raises delivery and critical frequency;
  a party-granted Reaction attack can create a second Sneak Attack in the round.
  Double Sneak Attack multiplies both without paying an action or resource.
- **Cunning Strike:** costs are paid from the doubled pool, so a 1d6 cost leaves
  90 percent of the level-9 pool rather than 80 percent of Thief's pool.
- **Critical hit:** all Sneak Attack damage dice are rolled again under the
  normal critical-hit rule. A critical level-17 Executioner Sneak Attack rolls
  36d6 before the weapon; the subclass does not cap or soften that stack.
- **One-fight, no-Short-Rest, and rest-rich days:** identical sustained access.
  The subclass has no uses to spend or recover, so day structure does not price
  its output.

## 5. Failure-Taxonomy Pass

All sixteen traps in guideline 04 were checked against the assembled subclass.

| Trap | Check performed | Verdict |
|---|---|---|
| F1 Compounding Punishment | No feature punishes failure or consumes a later action. | Clear |
| F2 Imported Chassis Mismatch | Every combat feature uses Sneak Attack, weapon dice, or Weapon Mastery. | Clear |
| F3 Dip Bait | A level-17 Fighter, Ranger, or Monk taking Rogue 3 buys base Expertise, Cunning Action, Steady Aim, 2d6 Sneak Attack, and Single Out's alternate eligibility. Single Out has no standalone die or accuracy bonus and never scales without Rogue levels, but it improves an already attractive base-Rogue package. | **Amber; explicit outsider test required** |
| F4 Farmable or Famine Triggers | Isolation can be created through ordinary movement but restores nothing; Weapon Reader requires a real creature and a minute. Normal ally proximity and Steady Aim remain fallback Sneak Attack routes. | Clear |
| F5 Advantage Faucet | No Advantage is granted. Single Out changes eligibility only and still fails under Disadvantage. | Clear |
| F6 Action Congestion / Economy Multiplication | No action or attack is added. The kit leaves Rogue Bonus Actions and Reactions unchanged. | Clear |
| F7 Runaway Interaction Math | Double Sneak Attack intentionally scales with class-table dice and again on critical hits and off-turn Sneak Attacks. | **Known hot; frozen multiplier** |
| F8 Stacking Blindness | Ordinary equipment, Advantage, critical hits, Cunning Strike, party support, and off-turn Reaction attacks are assembled in section 4. The strongest legal stack can produce 36d6 on each critical Sneak Attack at level 17. | **Amber; primary adversarial test** |
| F9 Golden-Cage Benchmark | Every slot and whole-kit snapshot uses Thief on the same Rogue chassis. | Clear |
| F10 White-Room Day | The feature is at will, so the most favorable one-fight day and a long adventuring day have the same per-round availability. | **Known high sustained output** |
| F11 Campaign-Contingent Payload | No creature family, terrain, damage type, or ally condition gates the kit. Isolation has normal Sneak Attack fallbacks. | Clear |
| F12 Niche Trespass | The party damage specialist is the exposed seat. The subclass gains no control, healing, spell, or broad social replacement, but its sustained single-hit damage may compress other damage roles. | Amber; harmed-seat observation |
| F13 Bookkeeping Tax | Zero subclass quantities are retained. Eligibility, weapon property, and die floors are resolved on the current roll. | Clear |
| F14 Bounced Flavor Cheque | Level 3 isolates and reads weapons; 9 finishes brutally; 13 broadens weapon technique; 17 makes every die dependable. | Amber pending owner approval |
| F15 Dead-Air Progression | Level 13 opens new mastery choices; level 17 is intentionally only a magnitude culmination because level 9 consumes the combat budget. | Amber; simplicity may read as thin progression |
| F16 Untested Altitude | No acquisition, level-9, level-13, or level-17 table play has occurred. | Amber; all authored mechanics provisional |

## 6. Filled Design Checklist

Legend: **Green** is supported by a rule, calculation, or SRD comparison.
**Amber** requires owner, cold-reader, harmed-seat, or table evidence. The frozen
level-9 outlier is labeled hot rather than disguised as a Green balance result.

### 6.1 Identity and host declaration

| Item | Status | Evidence |
|---|---|---|
| Fantasy sentence | Green | A rogue repeatedly singles out one foe to end danger with one weapon strike; three scene moments are stated. |
| Unserved loop | Green | Base Rogue and Thief do not reward an isolated target or multiply class-table Sneak Attack dice. |
| Fiction-to-rule map | Amber | Isolation → Single Out; weapon scrutiny → Weapon Reader/Ready Arsenal; finish → Double Sneak Attack/Certain Harm. Owner approval remains. |
| Flavor cheque by level | Green | 3 isolates and reads; 9 doubles the finish; 13 broadens weapon technique; 17 removes the lowest damage result. |

### 6.2 Schedule and slot budget

| Item | Status | Evidence |
|---|---|---|
| Schedule conformance | Green | Rogue 3/9/13/17; no added, omitted, or shifted level. |
| Feature-count explanation | Green | Single Out is the level-3 engine and Weapon Reader is compact support; one feature follows at each later slot, matching Thief's cadence. |
| Budget per slot | Green | Section 4 records weight, access, actions, frequency, scaling, pillars, export, and comparator. |
| Whole-kit budget | Amber / hot | Snapshots prove Double Sneak Attack exceeds Thief from level 9 onward; D192 prevents magnitude revision. |
| Class dependence fit | Amber / hot | Native-engine attachment and utility fit Rogue; the frozen +100 percent precision damage does not fit guideline 01's normal medium damage share. |

### 6.3 Progression and scaling

| Item | Status | Evidence |
|---|---|---|
| Level-3 loop present | Green | Observe isolation; choose the foe; make a normal weapon attack; deliver native Sneak Attack. |
| Later features deepen loop | Green | Multiplier, weapon breadth, and damage floor all attach to the same strike. |
| Tier-appropriate scaling | Amber / hot | Exact 9/13/17 dice are calculated; tier-3 breadth and tier-4 simplicity are present, but live tests are absent. |
| Native-engine attachment | Green | Rogue-level Sneak Attack dice and qualifying weapon properties carry all combat scaling. |
| No new required ability | Green | No ability score, attack formula, DC, or use count is added. |

### 6.4 Multiclass and interaction audit

| Item | Status | Evidence |
|---|---|---|
| Outsider reading 3–5 | Amber | Fighter 17, Ranger 17, and Monk 17 each buy the base Rogue 3 package plus isolated-target eligibility, while delaying their own final three levels. No subclass number scales outside Rogue, but the package needs adversarial builds. |
| Dip-resistant scaling | Green | Single Out multiplies Sneak Attack eligibility; the doubled dice require Rogue 9; no Proficiency Bonus pool, armor, weapon grant, or attack-stat substitution exists. |
| Full-stack test | Amber / hot | Section 4 includes Advantage, criticals, Cunning Strike, ordinary weapons, party-granted Reaction attacks, and sustained/off-turn output. Live proof is absent. |
| Near-automatic overshoots absent | Amber / frozen exception | No broad proficiency, save pair, defense formula, resource loop, accuracy, extra attack, or action exists; the intentional near-automatic overshoot is the damage multiplier. |

### 6.5 Actions, accuracy, and triggers

| Item | Status | Evidence |
|---|---|---|
| Action-economy tally | Green | Action Attack; Bonus Action base Rogue option; Reaction Uncanny Dodge or an available attack; concentration none; free rider Single Out/doubling; off-turn trigger only through an existing legal attack. |
| Extra-economy carrier | Amber / hot | The subclass adds no carrier, but any external Reaction-attack carrier receives doubled Sneak Attack dice. |
| Advantage gate | Green | No Advantage granted; Steady Aim retains its printed Bonus Action and Speed costs. |
| Flat-bonus gate | Green | No flat attack, AC, save, or save-DC bonus. |
| Farmability audit | Green | Allies, objects, summons, repeated Initiative, and target swapping restore nothing and create no new attack. |
| Famine audit | Green | Normal ally adjacency and Steady Aim remain deterministic alternatives when a target is not isolated. |
| Frequency statement | Green | Single Out offered 1–3 rounds/fight; Weapon Reader 0–2 scenes/session; doubling every successful Sneak Attack; Ready Arsenal on equipment/tactic changes; Certain Harm every damage roll. |

### 6.6 Resource and rest stress

| Item | Status | Evidence |
|---|---|---|
| Uses model matches effect | Amber / hot | Everything is at will and simple; that cadence is too generous for the frozen multiplier by normal budget rules. |
| One-fight-day test | Amber / hot | Best legal round includes a doubled on-turn Sneak Attack and a doubled off-turn Sneak Attack; criticals can make either 36d6 at 17. |
| No-Short-Rest day | Green | No subclass feature depends on rest recovery. |
| Rest-rich day | Green | No subclass output reloads or changes with rests. |
| Drawback integrity | Green | No drawback is claimed as a balancing price. |

### 6.7 Pillars, party, and campaign

| Feature | C | E | S | Player initiates? | Weight |
|---|:---:|:---:|:---:|:---:|---|
| Single Out | C | — | — | Yes | Rock |
| Weapon Reader | — | E | S | Yes | Ribbon |
| Double Sneak Attack | C | — | — | Yes | Dominant rock |
| Ready Arsenal | C | E | — | Yes | Utility rock |
| Certain Harm | C | — | — | Yes | Subdued rock |

| Item | Status | Evidence |
|---|---|---|
| Pillar coverage grid | Green | Every feature is classified; the whole kit reaches C/E/S. |
| No single-pillar silence | Green | Weapon Reader is player-initiated E/S support beside a substantial level-3 combat engine; no later slot is ribbon-only. |
| Niche trespass | Amber | Single-target damage specialists are at risk of being overshadowed; observe their participation and encounter contribution. |
| Campaign contingency | Green | Zero core features require a creature family, terrain, damage type, facilitator setup, or ally-only condition. |
| Social dependency | Green | No campaign premise or party composition is required. |
| Equipment/companion continuity | Green | Any proficient Finesse or Ranged weapon works; Ready Arsenal improves treasure continuity; no companion exists. |

### 6.8 Complexity and table speed

| Item | Status | Evidence |
|---|---|---|
| One tracked quantity maximum | Green | **None.** No subclass state persists between rolls or turns. |
| One recurring decision center | Green | Choose the isolated target and, through the base class, whether to spend dice on Cunning Strike. |
| Trigger clarity | Green | Isolation is checked with Sneak Attack eligibility; doubling and die floors are checked while rolling damage. |
| Table-speed simulation | Amber | Estimated first turn 20 seconds and fifth use 15 seconds; not timed with a cold reader. |
| Cold-reader test | Amber | Operative text states eligibility and order; independent review of doubled Cunning Strike costs is absent. |

### 6.9 Playtest coverage and status

| Item | Status | Evidence |
|---|---|---|
| Usage instrument | Green | Record eligible/noticed/offered/chosen/resolved counts, isolation source, hit/critical, Cunning Strike dice removed, on/off-turn damage, rule reopenings, and other damage-seat participation. |
| Acquisition test | Amber | Not run at Rogue 3. |
| Middle-tier test | Amber | Not run at Rogue 9. |
| Untested altitude | Amber | Levels 13 and 17 unplayed; both authored features and every stack are provisional. |
| Harmed-party observation | Amber | Not run from another martial damage seat. |
| Fifth-use verdict | Amber | Not run. |

### 6.10 Clean-room and release gate

| Item | Status | Evidence |
|---|---|---|
| Permitted citations | Green | Only dispatch-authorized repository decisions, guidelines, committed structural models, and anchored SRD 5.2.1 lines were used. |
| External names / Product Identity | Green | No external creator, product, setting, character, creature, or plane appears. |
| Non-SRD quotation | Green | D192's owner-specified mechanic is identified; no non-SRD source wording is reproduced. |
| Risk disposition | Green | Every evidence gap and the known frozen outlier are listed below rather than called balanced. |

| Provisional item | Risk | Required test | Owner/status |
|---|---|---|---|
| Identity, Single Out, and Weapon Reader | Entry loop or fiction may miss owner intent; dip may be too attractive | Owner text review, cold-reader adjudication, and three outsider builds at levels 3–5 | OWNER-APPROVAL pending |
| Double Sneak Attack expression | Cunning Strike order may not match owner intent | Owner adjudication using 1d6 and 6d6 Cunning Strike costs | Frozen engine; wording approval pending |
| Double Sneak Attack stack | Sustained, critical, and off-turn damage substantially exceed Thief | Levels 9/13/17 adversarial combats with ordinary gear, Advantage, Cunning Strike, and party-granted Reaction attacks | Frozen engine; **hot and untested** |
| Ready Arsenal | Broad mastery access may add more tactical breadth than intended or too little tier-3 excitement | Level-13 equipment rotation and fifth-use timing | OWNER-APPROVAL pending |
| Certain Harm | Floor of 2 may be imperceptible as a final feature | Level-17 repeated damage rolls; record noticed value and satisfaction | OWNER-APPROVAL pending |
| Niche and speed | Another damage specialist may contribute less; order clause may slow play | Harmed-seat observation and timed fifth use | Reviewer unassigned |

**Pre-flight result:** **Ready for design review only, not represented as
balanced.** Schedule, adjudication text, clean-room boundary, and exact damage
math are present. The frozen engine is a known high-side outlier; owner approval,
independent adjudication, and all table tests remain outstanding. Reviewer:
initial author desk pass. Date: 2026-08-03.

## 7. Distance Checklist

D174's rename-and-mechanical-distance rule and the dispatch's specific Thief
boundary were checked against the complete draft.

1. **Name distance — Pass.** Executioner, Single Out, Weapon Reader, Double
   Sneak Attack, Ready Arsenal, and Certain Harm do not use Fast Hands,
   Second-Story Work, Supreme Sneak, Use Magic Device, or Thief's Reflexes.
2. **Mechanical distance — Pass.** The subclass has no Bonus Action object use,
   climbing or jumping benefit, retained invisibility, magic-item access, charge
   conservation, scroll casting, or extra turn. It instead qualifies and
   multiplies the native Sneak Attack engine, broadens qualifying mastery access,
   and raises a damage-die floor.
3. **Shared chassis only — Pass.** Sneak Attack, Cunning Strike, Weapon Mastery,
   Cunning Action, and Steady Aim are base Rogue rules rather than borrowed
   Thief mechanics.

## 8. Clean-Room Sources and License

This draft uses only D192 with D174/D191 context, the six files in
`docs/design/subclass-guidelines/`, SRD 5.2.1, and the committed monk/oath
documents as structural models. No web or non-open subclass source was used.

This document is released under CC-BY-4.0 (Creative Commons Attribution 4.0
International).

> This work includes material from the System Reference Document 5.2
> ("SRD 5.2") by Wizards of the Coast LLC, available at
> https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
> Commons Attribution 4.0 International License, available at
> https://creativecommons.org/licenses/by/4.0/legalcode.
