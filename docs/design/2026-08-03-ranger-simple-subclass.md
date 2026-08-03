# Ranger Subclass: Pursuer

Status: **provisional, ready for design review only**. This is a MINT-FREE,
docs-only full subclass draft. D192's level-7 engine is reproduced without
mechanical change; every other authored feature remains subject to owner
approval and playtest.

## 1. Identity

OWNER-APPROVAL: Subclass name, identity paragraph, and three scene moments.

A Pursuer is a ranger who **closes on a chosen quarry** in order to turn any
escape into a clean weapon finish. In combat, a weapon hit carries the ranger
through the melee toward the marked foe. In exploration, the ranger follows the
direction of a fleeing mark after footprints disappear. In a social scene, the
ranger keeps track of a marked suspect through a crowded hall when negotiation
breaks down.

The subclass introduces no spell, spell slot, pool, counter, stance, menu, or
second mark. It modifies the Ranger's existing Hunter's Mark and otherwise uses
weapon attacks and movement. The mark remains the kit's only tracked state.

## 2. Host Schedule and Budget Posture

The Ranger subclass schedule is **3 / 7 / 11 / 15**. The SRD Hunter has two
named features at level 3 and one at each later slot
([Ranger table and base features](../srd/full/srd-5.2.1.txt#L3488-L3593),
[Hunter](../srd/full/srd-5.2.1.txt#L3649-L3711)). Pursuer uses the same
five-feature cadence. Its five operative feature texts total about **189 rules
words**, below the Champion structural model's 199 rules words across six
features ([Champion](../srd/full/srd-5.2.1.txt#L2968-L3016)).

Guideline 01 rates Ranger subclass dependence **Medium** and assigns it a
core-mark interaction, bounded combat rider, and player-initiated exploration
utility, with a medium-high damage share and a utility counterweight. Pursuer's
protected dial is D192's unbound Hunter's Mark at level 7: no Concentration and
no action to transfer the mark when the marked target reaches 0 Hit Points. The
other slots flank that high-value feature with movement, information, flexible
retargeting, and a bounded marked-target critical range.

## 3. Subclass Features

### Level 3: Close the Distance

OWNER-APPROVAL: Entire feature, including the once-per-turn limit, 10-foot
movement, direction requirement, and Opportunity Attack protection.

Once on each of your turns when you hit the creature marked by your Hunter's
Mark with a weapon, you can move up to 10 feet toward that creature without
provoking Opportunity Attacks.

### Level 3: True Trail

OWNER-APPROVAL: Entire feature, including the same-plane and 1-mile boundaries.

While the creature marked by your Hunter's Mark is on the same plane of
existence as you and within 1 mile of you, you know the direction to that
creature.

### Level 7: Unbound Mark

OWNER-SPECIFIED FROZEN ENGINE: D192 fixes both clauses. The feature name and
SRD-register expression are draft wording.

When you cast Hunter's Mark, the spell lasts for its full duration without
requiring Concentration from you. If the creature marked by the spell drops to
0 Hit Points before the spell ends, you can move the mark to another creature
you can see within the spell's range that has at least 1 Hit Point (no action
required).

### Level 11: Change of Quarry

OWNER-APPROVAL: Entire feature, including the once-per-turn boundary, hit
timing, and no-action transfer before the former target reaches 0 Hit Points.

Once on each of your turns when you hit a creature with a weapon while your
Hunter's Mark is active, you can move the mark to that creature if it isn't
already marked (no action required). The mark moves after the attack's damage
is dealt.

### Level 15: Final Aim

OWNER-APPROVAL: Entire feature, including the 18–20 critical range and its
marked-target boundary.

Your weapon attacks against the creature marked by your Hunter's Mark score a
Critical Hit on a roll of 18–20 on the d20.

## 4. Ranger Base-Class Hunter's Mark Interactions

The SRD spell uses a Bonus Action to cast, requires Concentration, deals 1d6
extra Force damage whenever the caster hits the marked target with an attack
roll, grants Advantage on checks to find it, and normally uses a Bonus Action to
move the mark after the target reaches 0 Hit Points
([spell opening](../srd/full/srd-5.2.1.txt#L8917-L8934),
[transfer and upcast duration](../srd/full/srd-5.2.1.txt#L8857-L8865)). The
Ranger base class then changes that engine at levels 1, 13, 17, and 20. Pursuer
interacts with each as follows.

| Ranger level | Base feature | Base effect | Pursuer interaction |
|---:|---|---|---|
| 1 | Favored Enemy | Hunter's Mark is always prepared and can be cast without a spell slot 2–6 times per Long Rest as shown in the class table. | **Stacks without duplication.** Pursuer grants no preparation or casting. At level 7, every Hunter's Mark you cast—using Favored Enemy or a spell slot—uses Unbound Mark. Favored Enemy's use count and Long Rest recovery are unchanged. |
| Spell rule, from level 1 | Hunter's Mark transfer | After the marked target drops to 0 Hit Points, moving the mark normally costs a Bonus Action. | **Superseded for you at level 7.** Unbound Mark replaces only that transfer cost: the eligible transfer takes no action. The original Bonus Action casting time is unchanged. At level 11, Change of Quarry additionally permits a no-action transfer after you hit a living unmarked creature, even before the former target drops. |
| 13 | Relentless Hunter | Taking damage can't break Concentration on Hunter's Mark. | **Superseded, not stacked.** Unbound Mark already means your Hunter's Mark requires no Concentration, so there is no Hunter's Mark Concentration for damage to break. Relentless Hunter gives no additional benefit to this spell for a Pursuer; it does not restore or consume anything. |
| 17 | Precise Hunter | You have Advantage on attack rolls against the creature marked by Hunter's Mark. | **Stacks normally.** The Advantage applies to the current marked creature, including a mark moved by Unbound Mark or Change of Quarry. It increases both hit and Critical Hit frequency for Final Aim; it doesn't change transfer timing. |
| 20 | Foe Slayer | Hunter's Mark uses a d10 rather than a d6. | **Stacks normally.** The current marked creature takes the d10 extra damage on a hit, and that d10 is rolled again on a Final Aim Critical Hit under the normal critical rule. Concentration, casting time, transfer timing, duration, and uses are otherwise unchanged. |

In short: Pursuer **does not duplicate Favored Enemy**, **supersedes the spell's
post-defeat Bonus Action transfer at 7**, **makes Relentless Hunter redundant for
Hunter's Mark at 13**, and **stacks with Precise Hunter and Foe Slayer at 17 and
20**. Unbound Mark does not remove Hunter's Mark's initial Bonus Action casting
time, increase its range or duration, grant another casting, or create a second
marked creature.

## 5. Power-Budget Worksheet

### Host posture and protected dial

Pursuer attaches every feature to the Ranger's existing mark, weapon attacks,
or movement. It adds no spellcasting, damage pool, new attack, flat attack
bonus, saving throw, Reaction, or persistent subclass quantity. Close the
Distance and Change of Quarry are free riders with once-per-turn boundaries.
True Trail uses the existing marked creature. Final Aim is always available but
only against that one creature.

The exception is Unbound Mark. Removing Concentration both guarantees the
spell's damage engine against ordinary damage and frees the Ranger to maintain
a different Concentration spell at the same time. Eliminating the transfer
Bonus Action also releases heavily contested Ranger action economy when the
marked target falls. Both benefits are owner-frozen.

### Feature-by-feature record

| Feature | Slot; weight | At-will / nova | Actions, state, and frequency | Scaling, pillars, and export | Hunter comparison and verdict |
|---|---|---|---|---|---|
| Close the Distance | 3; combat rock | At will; up to 10 feet once/turn | Free rider on a weapon hit against the native mark; expected 1–3 offers/fight | Weapon hit, mark, and Ranger movement; C; three Ranger levels and an active class spell | Hunter's Prey adds 1d8 once/turn against a wounded foe or a conditional extra attack. This adds 0 damage and only approach movement; **below combat comparator** |
| True Trail | 3; utility support | At will while the mark lasts | No action beyond the spell's existing cast; same marked creature; expected 0–2 chase scenes/session | 1 mile, same plane; E/S; three Ranger levels and a maintained class spell | Hunter's Lore reveals Immunities, Resistances, and Vulnerabilities. True Trail reveals direction only; **narrower, player-initiated support** |
| Unbound Mark | 7; dominant rock | At will on every cast; no nova limit | Initial cast still a Bonus Action; no Concentration; defeat transfer takes no action; expected Concentration benefit every marked fight and 0–2 transfers/fight | Native spell duration and Favored Enemy uses; C/E; seven Ranger levels | Defensive Tactics grants either Opportunity Attack Disadvantage or protection after one creature hits. Unbound Mark prevents all damage-based loss from 7 and frees another Concentration effect; **well above comparator, owner-frozen hot** |
| Change of Quarry | 11; flexibility rock | One no-action transfer each turn after a weapon hit | No extra attack; damage resolves before transfer; expected 0–2 tactical transfers/fight | Existing single mark; C/E; eleven Ranger levels | Superior Hunter's Prey can echo one mark die to another creature once/turn. Change of Quarry moves rather than copies the mark and adds no damage to the triggering hit; **below damage comparator, action-economy amber** |
| Final Aim | 15; subdued offensive rock | At will against one marked creature; 18–20 critical range | No action; expected on every marked-target weapon attack | Two attacks, marked weapon/mark dice, and Precise Hunter at 17; C; fifteen Ranger levels | Superior Hunter's Defense can use a Reaction for Resistance to a damage type through the turn. Final Aim adds about 1.6 DPR with two d8+d6 attacks before Advantage; **lower defensive swing, bounded offense** |

### What removing Concentration is worth

Guideline 01 heuristic 6 prices a d6 added to one d20 roll at about 17.5
percentage points, and heuristic 7 treats Advantage as roughly +3.3 or a d6
d20 rider. Unbound Mark is more valuable than either single-roll benefit because
it removes a repeated failure sequence and opens a second simultaneous
Concentration effect.

At a common DC 10 Concentration save, a Ranger with a +2 Constitution save has
a 65 percent chance to retain a normal Hunter's Mark after one damaging hit,
42.25 percent after two, and 27.46 percent after three. With +3, the sequence is
70 percent, 49 percent, and 34.3 percent. Unbound Mark makes retention 100
percent against all those damage events. Unlike an approximately +3.3
Advantage-sized roll benefit, it also removes the need to roll, prevents the
spell from occupying Concentration, and can save a later Bonus Action and
Favored Enemy use or spell slot that would have recast a lost mark.

The freed Concentration slot is not honestly reducible to one d20 bonus. At
level 7 the Ranger can keep Hunter's Mark's expected `2 × 0.65 × 3.5 = 4.55`
extra damage per two-attack turn while also maintaining a different
Concentration spell. The value of that second spell varies by preparation and
scene, so the worksheet labels it a major capability increase rather than
assigning a false universal DPR number. At level 13, the base class would have
removed damage-based Concentration loss through Relentless Hunter, but it would
still occupy Concentration; Unbound Mark therefore keeps its second-spell value
through level 20.

Eliminating the post-defeat transfer Bonus Action is smaller but still real.
It is worth one freed Bonus Action each time a marked creature drops and another
eligible target is visible. That action can remain available for a base Ranger
feature, spell, or off-hand attack; no extra Bonus Action is created if no
transfer occurs.

**Hot verdict:** At level 7, no-Concentration Hunter's Mark plus a no-action
defeat transfer is substantially stronger and more generally relevant than
either Hunter Defensive Tactics option. It guarantees mark retention years
before Relentless Hunter, frees Concentration permanently, and removes an
occasionally decisive Bonus Action cost. The subdued level-3, level-11, and
level-15 features flank but do not erase that slot advantage. D192 freezes the
mechanic, so the draft exposes the interaction and requires full spell-stack
testing rather than pretending the feature sits on the Hunter line.

### Explicit numerical checks

- **Level 3 movement:** Close the Distance adds at most 10 feet per turn and 0
  damage. It requires a weapon hit on the one marked creature and can only move
  toward that creature.
- **Level 11 retarget:** if the Ranger attacks an unmarked creature twice at 65
  percent accuracy, the first attack must hit before Change of Quarry marks it.
  The chance that both attacks hit is `0.65 × 0.65 = 42.25%`, producing
  `0.4225 × 3.5 = 1.48` expected mark damage on the second hit. This is not free
  damage against the former mark; the mark leaves that creature.
- **Level 15 criticals:** with two attacks and each hit containing a d8 weapon
  die plus a d6 mark die, widening 20 to 18–20 adds 10 percentage points of
  critical chance per attack, or about `2 × 0.10 × 8 = 1.6` DPR before
  Advantage. At level 17, Precise Hunter changes the per-attack critical chance
  from 9.75 percent for a natural 20 with Advantage to 27.75 percent for 18–20,
  an 18-point increase; two d8+d6 attacks add about `2 × 0.18 × 8 = 2.88` DPR.
  At level 20, Foe Slayer makes the extra critical dice d8+d10 (average 10), so
  the corresponding Advantage-era increase is about 3.6 DPR.

### Whole-kit snapshots

| Snapshot | Pursuer | Hunter comparator | Budget verdict |
|---|---|---|---|
| Entry (3) | 10-foot weapon-hit pursuit and direction to one nearby marked creature | Resistance/Vulnerability information plus 1d8 damage or conditional extra attack | Pursuer trades damage and broad combat information for movement/tracking; **below line on paper, F3 mark-stack amber** |
| Tier 2 (7) | Hunter's Mark never uses Concentration and transfers after defeat with no action | Opportunity Attack Disadvantage or later attacks from one hitter have Disadvantage | **Pursuer is decisively above the slot line** |
| Tier 3 (11) | A weapon hit can move the single mark before a target falls | One mark die can echo to a second creature once/turn | Lower direct damage but greater target flexibility; **action-economy amber** |
| Tier 4 (15) | Marked-target weapon criticals on 18–20 | Reaction Resistance to current damage type through the turn | Smaller ordinary swing and offense-only; **subdued to flank level 7** |

### Action economy, stacking, and rest stress

- **First marked turn:** Bonus Action casts Hunter's Mark using Favored Enemy or
  a spell slot; Attack action makes two weapon attacks from Ranger 5 onward;
  Close the Distance may move the Ranger; Reaction remains free; Unbound Mark
  consumes no Concentration at 7.
- **Defeat transfer:** after the marked creature reaches 0 Hit Points and before
  the spell ends, Unbound Mark can move the mark to one visible living creature
  in spell range with no action. The initial casting action is never removed.
- **Voluntary transfer at 11:** attack an unmarked creature; on a hit, resolve
  damage, then move the active mark to it. A later attack can receive the mark
  die. Only one mark exists.
- **Strongest spell stack:** Hunter's Mark remains active beside a second
  Concentration spell. Ordinary equipment, Fighting Style, Weapon Mastery,
  Extra Attack, and party accuracy support all continue to function. Precise
  Hunter supplies Advantage at 17 and raises Final Aim's critical frequency.
- **One-fight day:** all Favored Enemy uses and spell slots may be concentrated,
  but the subclass adds no cast or slot. The strongest benefit is concurrent
  Concentration and uninterrupted mark uptime.
- **No-Short-Rest and rest-rich days:** Favored Enemy follows its Long Rest
  recovery. No subclass output restores uses, slots, Hit Points, or its own
  input, and Short Rests do not alter the engine.

## 6. Failure-Taxonomy Pass

All sixteen traps in guideline 04 were checked against the assembled subclass.

| Trap | Check performed | Verdict |
|---|---|---|
| F1 Compounding Punishment | A missed attack adds no subclass penalty; no later action repairs a failure. | Clear |
| F2 Imported Chassis Mismatch | Every rule uses Hunter's Mark, weapon hits, movement, or SRD critical timing. | Clear |
| F3 Dip Bait | A level-17 Fighter, Rogue, or Monk taking Ranger 3 buys the base Ranger spell/weapon package, two free Hunter's Mark casts, 10-foot hit movement, and 1-mile direction. The subclass adds no standalone damage and needs the class spell, but Favored Enemy plus utility makes the opening attractive. The transformative no-Concentration feature requires Ranger 7. | **Amber; explicit outsider test required** |
| F4 Farmable or Famine Triggers | Weapon hits and target defeat restore nothing. Harmless targets can move the existing mark but create no slot, use, damage, or second mark. Misses leave normal Ranger play intact. | Clear |
| F5 Advantage Faucet | No Advantage is granted by the subclass. Base Precise Hunter arrives at 17 and is included in Final Aim math. | Clear |
| F6 Action Congestion / Economy Multiplication | Initial casting still contests the Bonus Action. Transfers save an action but never add an attack or Bonus Action. Close the Distance adds movement only. | Amber; freed-action value needs live play |
| F7 Runaway Interaction Math | Close the Distance and Change of Quarry are once per turn; only one mark exists; Final Aim widens one marked-target critical range without adding attacks. | Clear on paper |
| F8 Stacking Blindness | Ordinary weapons, Extra Attack, Weapon Mastery, Fighting Style, a second Concentration spell, party accuracy, Precise Hunter, critical dice, and Foe Slayer are assembled in section 5. | **Amber; Concentration-stack test is primary** |
| F9 Golden-Cage Benchmark | Every slot and whole-kit snapshot uses Hunter on the same Ranger chassis. | Clear |
| F10 White-Room Day | Favored Enemy uses and slots are stress-tested conceptually for one-fight and long days; Unbound Mark's at-will modification remains fully available in both. | Amber; concurrent-spell swing varies |
| F11 Campaign-Contingent Payload | No creature family, terrain, damage type, or ally condition gates the combat engine. True Trail is extra utility rather than the sole identity. | Clear |
| F12 Niche Trespass | Scout and single-target damage seats are exposed. Direction lacks distance, senses, hidden-path revelation, or communication, and Final Aim remains one-target weapon offense. | Amber; harmed-seat observation |
| F13 Bookkeeping Tax | The existing Hunter's Mark is the only tracked quantity. Transfers move that state; no second mark, counter, duration, or pool is added. | Clear |
| F14 Bounced Flavor Cheque | Level 3 closes and follows; 7 keeps the chase unbroken; 11 changes quarry on a hit; 15 finishes the marked foe. | Amber pending owner approval |
| F15 Dead-Air Progression | Movement/tracking, unbinding, voluntary retargeting, and critical culmination each change the mark loop without a second subsystem. | Clear |
| F16 Untested Altitude | No acquisition, level-7, level-11, or level-15 table play has occurred. | Amber; all authored mechanics provisional |

## 7. Filled Design Checklist

Legend: **Green** is supported by a rule, calculation, or SRD comparison.
**Amber** requires owner, cold-reader, harmed-seat, or table evidence. The frozen
level-7 outlier is labeled hot rather than disguised as a Green balance result.

### 7.1 Identity and host declaration

| Item | Status | Evidence |
|---|---|---|
| Fantasy sentence | Green | A ranger repeatedly closes on a chosen quarry to turn escape into a weapon finish; three scene moments are stated. |
| Unserved loop | Green | Base Ranger and Hunter do not add hit-triggered pursuit, direction, no-Concentration, voluntary hit retargeting, or marked critical range as one loop. |
| Fiction-to-rule map | Amber | Weapon hit → pursuit/retarget; magical quarry sense → direction; unbroken chase → no Concentration; finish → critical range. Owner approval remains. |
| Flavor cheque by level | Green | 3 closes/follows; 7 unbinds; 11 changes quarry; 15 finishes. |

### 7.2 Schedule and slot budget

| Item | Status | Evidence |
|---|---|---|
| Schedule conformance | Green | Ranger 3/7/11/15; no added, omitted, or shifted level. |
| Feature-count explanation | Green | Close the Distance is the level-3 engine and True Trail is compact exploration support; one feature follows at each later slot, matching Hunter's cadence. |
| Budget per slot | Green | Section 5 records weight, access, actions, frequency, scaling, pillars, export, and comparator. |
| Whole-kit budget | Amber / hot | Snapshots show the level-7 feature exceeds Hunter; quieter surrounding slots reduce but do not erase that value. |
| Class dependence fit | Amber / hot | Core-mark interaction, weapon rider, and exploration utility fit Ranger; permanent freed Concentration exceeds ordinary Medium dependence. |

### 7.3 Progression and scaling

| Item | Status | Evidence |
|---|---|---|
| Level-3 loop present | Green | Observe the mark; choose pursuit; hit with a normal weapon; close 10 feet and retain direction. |
| Later features deepen loop | Green | Concentration/action friction, retarget timing, and critical consequence improve the same mark. |
| Tier-appropriate scaling | Amber | Paper checks at 5/11/17/20 are explicit; live tier checks absent. Level 11 adds voluntary retargeting and 15 is a simple culmination. |
| Native-engine attachment | Green | Hunter's Mark, Favored Enemy, Extra Attack, Precise Hunter, Foe Slayer, and Ranger level gates carry scaling. |
| No new required ability | Green | No attack ability, DC, use count, or required score is added. |

### 7.4 Multiclass and interaction audit

| Item | Status | Evidence |
|---|---|---|
| Outsider reading 3–5 | Amber | Fighter 17, Rogue 17, and Monk 17 each buy the base Ranger 3 package plus hit movement and mark direction while delaying their native final levels. The dominant unbinding remains behind Ranger 7. |
| Dip-resistant scaling | Green | Entry rules require the Ranger's class spell and add no standalone damage, armor, attack-stat substitution, unconditional accuracy, or convertible pool. |
| Full-stack test | Amber / hot | Section 5 includes equipment, two attacks, fighting/mastery riders, a second Concentration spell, party accuracy, Precise Hunter, criticals, and Foe Slayer; live results absent. |
| Near-automatic overshoots absent | Amber / frozen exception | No doubled proficiency, save pair, defense formula, resource loop, extra attack, or unconditional accuracy exists; the intentional overshoot is permanently freed Concentration. |

### 7.5 Actions, accuracy, and triggers

| Item | Status | Evidence |
|---|---|---|
| Action-economy tally | Green | Action Attack; Bonus Action initial Hunter's Mark or base option; Reaction free; Concentration none for the mark at 7 but at most one other Concentration spell; free rider movement/transfer; no off-turn subclass interrupt. |
| Extra-economy carrier | Green | No attack, action, Bonus Action, or turn is added; a transfer cost is removed only when its trigger occurs. |
| Advantage gate | Green | Subclass grants none; base level-17 Advantage is one marked target and included in the math. |
| Flat-bonus gate | Green | No flat attack, AC, save, or save-DC bonus. |
| Farmability audit | Green | Allies, harmless targets, summons, objects, repeated Initiative, and target swapping restore no use or slot and cannot create a second mark. |
| Famine audit | Green | The player casts the mark and makes ordinary weapon attacks; misses do not remove the mark or the base turn. |
| Frequency statement | Green | Close 1–3 offers/fight; Trail 0–2 chase scenes/session; no-Concentration every marked fight; defeat transfer 0–2/fight; voluntary transfer 0–2/fight; Final Aim every marked-target attack. |

### 7.6 Resource and rest stress

| Item | Status | Evidence |
|---|---|---|
| Uses model matches effect | Amber / hot | The subclass spends only native casts and slots, but permanent no-Concentration is high-value at-will modification. |
| One-fight-day test | Amber | All Favored Enemy uses and slots can be spent, with Hunter's Mark beside the strongest prepared Concentration option; exact swing is preparation- and encounter-dependent. |
| No-Short-Rest day | Green | Favored Enemy and slots use Long Rest recovery; the subclass assumes no Short Rest. |
| Rest-rich day | Green | Short Rests add no subclass output and nothing restores its own input. |
| Drawback integrity | Green | No drawback is claimed; initial Bonus Action, sight/range, single target, duration, and uses remain real printed limits. |

### 7.7 Pillars, party, and campaign

| Feature | C | E | S | Player initiates? | Weight |
|---|:---:|:---:|:---:|:---:|---|
| Close the Distance | C | — | — | Yes | Rock |
| True Trail | — | E | S | Yes through the mark | Support |
| Unbound Mark | C | E | — | Yes through the mark | Dominant rock |
| Change of Quarry | C | E | — | Yes | Rock |
| Final Aim | C | — | — | Yes | Rock |

| Item | Status | Evidence |
|---|---|---|
| Pillar coverage grid | Green | Every feature is classified and the whole kit reaches C/E/S. |
| No single-pillar silence | Green | True Trail is player-initiated non-combat support beside a substantial combat engine; no schedule level is ribbon-only. |
| Niche trespass | Amber | Scout and single-target damage roles are bounded by one marked creature, one-mile direction without distance or route, and no new skill Expertise; observe those seats. |
| Campaign contingency | Green | Zero core features require a creature family, terrain, damage type, facilitator setup, or ally condition. |
| Social dependency | Green | No campaign premise is required; marking a creature still follows the spell's visible-casting and targeting rules. |
| Equipment/companion continuity | Green | Any proficient weapon works; ordinary magic treasure remains useful; no companion exists. |

### 7.8 Complexity and table speed

| Item | Status | Evidence |
|---|---|---|
| One tracked quantity maximum | Green | **Hunter's Mark only**, inherited from the base class. No subclass quantity is added. |
| One recurring decision center | Green | Choose which one creature carries the existing mark. |
| Trigger clarity | Green | Player watches their own marked-target weapon hit, target reaching 0 Hit Points, or weapon hit on a new quarry. |
| Table-speed simulation | Amber | Estimated first mark/attack turn 25 seconds and fifth use 18 seconds; not timed with a cold reader. |
| Cold-reader test | Amber | Costs, ranges, timing, one-target state, living replacement, and base interactions are stated; independent adjudication absent. |

### 7.9 Playtest coverage and status

| Item | Status | Evidence |
|---|---|---|
| Usage instrument | Green | Record eligible/noticed/offered/chosen/resolved counts, marked rounds, Concentration effects run concurrently, saved saves/Bonus Actions, transfers, movement, criticals, forgotten state, rule reopenings, and affected-seat participation. |
| Acquisition test | Amber | Not run at Ranger 3. |
| Middle-tier test | Amber | Not run at Ranger 7. |
| Untested altitude | Amber | Levels 11, 15, 17, and 20 unplayed; all interactions explicitly provisional. |
| Harmed-party observation | Amber | Not run from scout, controller, or single-target damage seats. |
| Fifth-use verdict | Amber | Not run. |

### 7.10 Clean-room and release gate

| Item | Status | Evidence |
|---|---|---|
| Permitted citations | Green | Only dispatch-authorized repository decisions, guidelines, committed structural models, and anchored SRD 5.2.1 lines were used. |
| External names / Product Identity | Green | No external creator, product, setting, character, creature, or plane appears. |
| Non-SRD quotation | Green | D192's owner-specified mechanic is identified; no non-SRD source wording is reproduced. |
| Risk disposition | Green | Every evidence gap and the known frozen outlier are listed below rather than called balanced. |

| Provisional item | Risk | Required test | Owner/status |
|---|---|---|---|
| Identity, Close the Distance, and True Trail | Entry may feel too light or utility may disclose too much | Owner text review, cold-reader adjudication, pursuit scenes, and three outsider builds at levels 3–5 | OWNER-APPROVAL pending |
| Unbound Mark expression | Living-target transfer timing or duration interaction may not match owner intent | Owner adjudication across defeat, no visible target, later target appearance, and upcast durations | Frozen engine; wording approval pending |
| Concentration stack | Hunter's Mark plus another Concentration spell may exceed Ranger/Hunter encounter control | Level-7/11/15 combats using ordinary gear and varied prepared Concentration spells; record uptime, damage, control, and saved actions | Frozen engine; **hot and untested** |
| Change of Quarry | No-action voluntary transfer may erase target-commitment and Bonus Action tension | Level-11 multi-target encounters; record transfers, second-attack mark damage, and unused Bonus Actions | OWNER-APPROVAL pending |
| Final Aim | 18–20 may spike too strongly with Advantage and on-hit dice or feel too small without them | Level-15/17/20 tests with d6/d10 marks, ordinary weapons, Advantage, and critical riders | OWNER-APPROVAL pending |
| Niche and speed | Scout/controller/damage participation or transfer timing may suffer | Harmed-seat observation and timed fifth use | Reviewer unassigned |

**Pre-flight result:** **Ready for design review only, not represented as
balanced.** Schedule, adjudication text, clean-room boundary, base-class
interaction map, and paper math are present. The frozen engine is a known
high-side outlier; owner approval, independent adjudication, and all table tests
remain outstanding. Reviewer: initial author desk pass. Date: 2026-08-03.

## 8. Distance Checklist

D174's rename-and-mechanical-distance rule and the dispatch's specific Hunter
boundary were checked against the complete draft.

1. **Name distance — Pass.** Pursuer, Close the Distance, True Trail, Unbound
   Mark, Change of Quarry, and Final Aim do not use Hunter's Lore, Hunter's Prey,
   Defensive Tactics, Escape the Horde, Multiattack Defense, Colossus Slayer,
   Horde Breaker, Superior Hunter's Prey, or Superior Hunter's Defense.
2. **Mechanical distance — Pass.** The subclass does not reveal Immunities,
   Resistances, or Vulnerabilities; add 1d8 against a wounded foe; grant an extra
   attack; impose Disadvantage on Opportunity or follow-up attacks; echo a mark
   die to a second creature; or grant Reaction Resistance. It instead supplies
   approach movement, direction, Concentration/action unbinding, single-mark
   retargeting, and a marked-target critical range.
3. **Shared chassis only — Pass.** Hunter's Mark is a base Ranger spell and
   Favored Enemy, Relentless Hunter, Precise Hunter, and Foe Slayer are base
   Ranger features. Section 4 states exactly where Pursuer stacks with or
   supersedes each rather than presenting them as subclass inventions.

## 9. Clean-Room Sources and License

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
