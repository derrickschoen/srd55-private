# Sheet-Effect Taxonomy: every mechanism shape by which published 5e/2024 content changes a number

Design input for a typed, data-authorable effect system in a browser-only TypeScript character-sheet
engine. This is a catalogue of **shapes**, not of content: the reusable mechanism patterns that
subclasses, feats, spells, magic items and class features are assembled from.

## 0. Sourcing rule (clean-room) and how to read this

**Naming rule.** Only content published in SRD 5.1 (2014) and SRD 5.2 / 5.2.1 (2024) — both released
by Wizards of the Coast under CC-BY-4.0 — is named here. Everything else is described abstractly with
an **invented generic example**; no non-SRD feat, subclass, item or feature is named, quoted, or
enumerated, and claims about non-SRD breadth are stated statistically, never as a list. Even for SRD
content this document **describes** mechanics rather than reproducing text.

Scope note established during the audit: the SRD-safe example pool is much wider than "spells and
classes". SRD 5.1 contains a full magic-items chapter, and SRD 5.2.1 contains 243 magic items
(5.2 shipped 15 short; 5.2.1 restored them, and renamed two artifact-class items). SRD 5.2.1 also
contains the 2024 weapon-mastery properties and the 2024 rules glossary. Several examples the source
draft carried as "generic, non-SRD" were promoted to named SRD examples on that basis.

**Per-shape template.** Each numbered shape carries the five dimensions the engine's type vocabulary
must encode:

`target` (what sheet quantity) · `shape` (how the value is computed) · `stack` (combine vs override) ·
`gate` (what makes it active) · `cadence` (recharge/usage rhythm, where applicable)

**Numbering.** `S1–S73` are mechanism shapes (§3–§12). `R1–R11` are cross-cutting combination rules
(§13). `G1–G10` are gating/duration classes (§14). `C1–C8` are cadence classes (§7.3). **Addendum A**
continues all four series — `S74–S98`, `C9–C12`, `G11–G13` — from the magic-item corpus validation;
nothing in §1–§18 was renumbered to accommodate it. A published feature is
normally one target × one shape × one stack rule × one gate, and often bundles two or three
independently-parameterised values under one name (S30).

---

## 1. Target-quantity taxonomy

The closed set of sheet quantities published content writes into. The engine's `Target` union should be
this list; each entry has a **kind** that constrains which operations are even well-typed on it.

| Kind | Targets |
|---|---|
| Scalar | ability score; ability-score *cap*; save bonus (per ability); skill/tool check bonus; AC; attack bonus; damage bonus; save DC; spell attack bonus; initiative; max HP; current HP; temp HP; speed (per movement mode, independently); sense range (per sense); carrying capacity / push-drag-lift; passive score (derived); proficiency bonus itself; attunement-slot count; jump distance (derived); spell-save-DC and spell-attack-bonus **as two separate targets** |
| Dice expression | weapon/feature damage dice (count and size independently); extra-damage dice; a resource's die size; hit-die size |
| Set membership | skill/tool/weapon/armour/save/language proficiencies; expertise set; damage resistances/immunities/vulnerabilities; condition immunities; movement modes possessed; senses possessed |
| Enum / categorical | size category; creature type; damage type of an attack; weapon properties; crit range; advantage/disadvantage state per roll category |
| Pool | spell slots per level; pact slots; class resource points; per-rest use counts; item charges; hit-dice pool (typed by die size) |
| Entitlement | spells on your list / known / prepared / always-prepared / free-cast / at-will / ritual-only; feats; features |
| Formula selection | which base-AC formula applies; which ability governs a given roll |
| Predicate | derived named states (§7.1) usable as gates |

Two targets that look like one and are not: **spell save DC** and **spell attack bonus** are separately
addressable (SRD: an attunable wand grants a bonus to spell *attack rolls* only and leaves the DC
alone). Likewise **ability score** vs **ability modifier** vs **the score's maximum** are three targets.

---

## 2. Value sources (the leaves of every formula)

Not shapes in themselves — the referenceable inputs a shape's value may be built from. Getting this
union right is what makes level-scaled effects data rather than code.

- `Const n`
- `TotalCharacterLevel` — proficiency bonus, cantrip scaling, ASI cadence, attunement cap, hit-dice count
- `ClassLevel(c)` — nearly all class resources and feature scaling
- `EffectiveLevel(c, substitution)` — "counts as a level of X for this purpose"; the multiclass
  caster-level contribution (S38) is this
- `ProficiencyBonus` (itself derived from `TotalCharacterLevel`)
- `AbilityMod(a)` / `AbilityScore(a)`
- `AnotherSheetField(f)` — e.g. a formula that reads current AC, current speed, current max HP
- `SpentResourceLevel` — the level of the slot/charge consumed to trigger this effect (S31)
- `CountOf(predicate)` — number of attuned items, allies within a radius, targets affected, charges
  remaining
- `ForeignField(emitter, f)` — a value owned by *another* character (auras, S61)
- `DieRoll(count, size)` — a value that is a distribution, not a number (S24, S38-adjacent, C6)

---

## 3. Additive family

**S1. Flat constant.** Fixed delta, independent of all character state.
`target:` any scalar · `shape:` `Const` · `stack:` sums with other sources by default (R1) ·
`gate:` usually while-worn/attuned or permanent · `cadence:` —
*SRD:* an attunable protective ring adds +1 to AC and to every saving throw while attuned.

**S2. Per-level accrual (running total).** A fixed increment applied once per level gained, so the
current value is `k × levels`, not a one-off constant. Must be modelled as a formula, not as N stored
grants, or retroactive level changes corrupt it.
`target:` max HP overwhelmingly · `shape:` `Scale{ClassLevel|TotalLevel, ×k}` · `stack:` sums ·
`gate:` permanent · `cadence:` —
*SRD:* a draconic sorcerer origin raises max HP by 1 per sorcerer level; a hill-dwarf lineage raises
max HP by 1 per character level. Note the two use **different level sources** (S26).

**S3. Ability-modifier-derived value.** Value equals (or is linear in) an ability modifier, recomputed
whenever the score changes — never frozen at grant time.
`target:` attack/damage, save DC, initiative, AC formulas, pool maxima · `shape:` `Ref(AbilityMod a)` ·
`stack:` sums · `gate:` varies · `cadence:` —
*SRD:* a bard's inspiration uses per rest equal the bard's Charisma modifier.

**S4. Proficiency-bonus-derived value.** Value is `PB`, `2×PB`, or `PB ÷ 2` with an **explicit rounding
direction** — the direction is a parameter, not a constant.
`target:` skill/tool/save/attack bonuses; increasingly, per-rest pool maxima in 2024-era content ·
`shape:` `Scale{PB, ×m, ÷d, round}` · `stack:` a single PB contribution per roll (R6) ·
`gate:` set membership (S45/S46) · `cadence:` —
*SRD:* a bard adds half proficiency bonus, rounded down, to ability checks that don't already include
it. The 2024 revision moves several per-rest resource maxima from hand-written level tables onto
PB-linear formulas — the **same named resource, a different function shape, across editions**, which is
the single strongest argument for making function shape data rather than code.

**S5. Condition-track scalar (global penalty).** A stacking condition level produces a scalar applied to
an entire *class* of rolls at once, plus other targets, and recovers on its own cadence.
`target:` every d20 test simultaneously, plus speed · `shape:` `Scale{TrackLevel, ×k}` (negative) ·
`stack:` applies once, not per roll type · `gate:` track level > 0 · `cadence:` recovery of one track
level per long rest
*SRD 5.2.1:* the 2024 exhaustion condition subtracts 2× its level from every d20 test and 5× its level
(in feet) from speed, and a long rest removes one level. This is the cleanest published example of a
modifier whose target is a *category of rolls* rather than a sheet field.

**S6. Passive-score-only modifier.** A bonus that applies to the passive derivation of a skill and not
to active rolls of it (or vice versa). Related: the rules translate roll-state into a number here —
advantage on the underlying check is +5 to the passive score, disadvantage −5.
`target:` passive scores · `shape:` `Const`, plus an advantage→±5 translation rule ·
`stack:` sums · `gate:` permanent · `cadence:` —
*Generic (invented):* a vigilance-themed feat that adds a flat bonus to the character's passive scores
only, leaving the corresponding active checks untouched — the passive derivation and the active roll are
two read sites over one skill bonus, and content exists that addresses exactly one of them.

---

## 4. Multiplicative and clamping family

Absent from the source draft except as a special case of expertise; it is a distinct operator class and
the engine will produce wrong numbers without it, because multiplication does not commute with the
additive layer.

**S7. Multiplier on a derived total.** Doubling, tripling or halving a computed quantity.
`target:` jump distance, carrying capacity, speed, damage · `shape:` `Mul{k}` ·
`stack:` see R7 (multipliers do not compound; damage multipliers apply once, after all addition) ·
`gate:` varies · `cadence:` —
*SRD:* a 1st-level jump-enhancing spell triples the target's jump distance; carrying capacity doubles
for a Large creature; boots that alter speed also multiply the wearer's jump distances.

**S8. Multiplier on a formula *component*.** Doubles one input's contribution, not the total —
distinguishable from S7 whenever anything else feeds the same target.
`target:` a proficiency contribution inside a check bonus · `shape:` `Scale{PB, ×2}` ·
`stack:` idempotent (double proficiency twice is still double) ·
`gate:` requires membership in the underlying proficiency set · `cadence:` —
*SRD:* expertise.

**S9. Input clamp inside a formula.** A formula caps one of its own inputs before summing.
`target:` AC most visibly · `shape:` `Clamp{Ref(AbilityMod Dex), max: 2}` inside a base formula ·
*SRD:* medium armour adds Dexterity modifier to a maximum of +2; heavy armour adds none at all
(`max: 0`). The engine must express the cap as part of the base formula, not as a post-hoc AC cap.

**S10. Output cap and cap-raising.** Two different things that must not be conflated: a ceiling applied
to a final value, and an effect whose *target is the ceiling itself*.
`target:` ability score cap; any capped scalar · `shape:` `ClampMax` / `Add` applied to a cap target ·
*SRD:* ability scores cap at 20 by default; the rare instructional-manual/tome items raise a specific
ability score by 2 **and raise that score's maximum by 2**, which is an effect on the cap target, not on
the score.

**S11. Output floor / minimum.** `max(computed, floor)`, including the idiomatic "counts as at least X"
and "minimum 1".
`target:` any scalar; recovery amounts; damage · `shape:` `ClampMin` ·
*SRD:* hit dice regained on a long rest are half the character's total, minimum 1 — a recovery amount
that is simultaneously a formula, a rounding decision, and a floor. Also: a half-orc lineage's
once-per-long-rest ability to drop to 1 HP instead of 0 is a floor on an *outcome*, not on a modifier.

---

## 5. Override, set and formula-replacement family

**S12. Unconditional set.** Value replaced outright, including downward.
`target:` speed, ability scores, AC · `shape:` `Set{v}` · `stack:` beats additive within its layer (R8) ·
*SRD:* the grappled and restrained conditions set speed to 0 regardless of any bonuses.

**S13. Set-as-floor (raise-only override).** `target := max(current, v)`. Observably different from S12
exactly when the baseline already exceeds `v`, which is why they cannot be one constructor.
`target:` ability scores, speed · `shape:` `SetIfHigher{v}` · `gate:` typically while-attuned ·
*SRD:* boots that make walking speed 30 unless it is already higher; a giant-strength belt that sets
Strength to a fixed value only if it is not already higher; a headband that sets Intelligence to 19 with
the same "no effect if already higher" clause.

**S14. Set-base (override that still accepts further layering).** Replaces the *base* another additive
layer builds on, rather than dictating the final number.
`target:` sense ranges most cleanly · `shape:` `SetBase{v}` · `stack:` additive effects still apply after ·
*Generic:* one source establishes darkvision at 60 ft as a base while a separate source that extends
darkvision by 30 ft still applies on top, yielding 90.

**S15. Base-formula replacement (alternate AC formulas).** Swaps *which* formula and which input fields
compute a target.
`target:` AC · `shape:` `ReplaceFormula` · `stack:` **exclusive** — exactly one base formula applies and
the character picks (R4); additive AC bonuses then apply to whichever base won ·
`gate:` usually "while wearing no armour" / spell duration
*SRD:* the barbarian and monk unarmoured-defence features (10 + Dex + a second ability modifier, a
different second ability per class); a draconic sorcerer origin's 13 + Dex; a 1st-level armour spell's
13 + Dex for its duration. The multiclassing rules explicitly forbid acquiring the unarmoured-defence
feature twice — a published, SRD-stated instance of formula exclusivity that the type system should make
unrepresentable rather than validate at runtime.

**S16. Compound formula with swappable inputs.** `constant + PB + AbilityMod(a)`, where the constant,
the ability, and whether PB participates are all parameters — and where the DC and the attack bonus are
independently targetable outputs.
`target:` spell save DC, spell attack bonus, feature DCs · `shape:` `Sum[Const, Ref(PB), Ref(AbilityMod a)]` ·
*SRD:* the spellcasting DC/attack construction; separately, an attunable wand that adds to spell attack
rolls only. A per-grant spellcasting ability (S48) means a multiclassed sheet holds several
simultaneous, differently-valued instances of this formula.

**S17. Governing-ability substitution.** A roll normally keyed to ability X is keyed to ability Y, with
nothing else changed.
`target:` formula selection on attack/damage rolls · `shape:` `Substitute{Str → Dex}` etc. ·
`stack:` last-writer/most-specific wins; two substitutions on one roll is an authoring error ·
*SRD:* a monk's martial-arts feature lets Dexterity replace Strength for unarmed strikes and monk
weapons; the finesse weapon property offers the wielder the choice per attack; a druidic cantrip makes a
club or quarterstaff use the caster's spellcasting ability for attack and damage. (The source draft used
a non-SRD pact-weapon example here; these SRD ones are strictly better anyway because one of them is a
*choice* rather than a fixed swap.)

**S18. Damage-type rewrite and categorical qualification.** Changes the *type* of damage dealt, or
attaches a qualifier that changes how downstream resistance maths resolves.
`target:` damage type enum; the "magical" qualifier · `shape:` `SetEnum` / `AddQualifier` ·
`stack:` one type wins; qualifiers accumulate ·
*SRD:* the same druidic cantrip also makes the weapon magical for the purpose of overcoming resistance —
a non-numeric change that alters a numeric outcome two layers downstream.

**S19. Die-expression substitution.** A die is replaced by a different die, or a scalar is replaced by a
die. Forces the engine to accept that a `Value` may be a distribution.
`target:` weapon damage dice; any scalar under an optional-rule variant · `shape:` `Dice{n, size}` ·
*SRD:* the same cantrip changes the weapon's damage die to a d8. *Generic:* an optional variant rule
that replaces the flat proficiency bonus with a die whose size steps on the same level table — the value
kind changes while the target and the scaling schedule do not.

---

## 6. Level-scaling and piecewise family

**S20. Continuous per-level scaling with an explicit rounding direction.** Rounding is a per-feature,
per-edition parameter. Verified during this audit and load-bearing for this engine: a half-caster's
contribution to the multiclass caster level is **rounded down** under 2014 rules and **rounded up**
under 2024 rules — same target, same shape, different parameter.
`target:` caster level, pool maxima, recovery amounts · `shape:` `Scale{src, ÷d, round}` ·

**S21. Tiered step function (table lookup).** Value changes at listed breakpoints and is flat between
them; the honest representation is a sparse table, and there is no obligation to discover a closed form.
`target:` almost anything · `shape:` `Table[level → v]` ·
*SRD:* a rage-damage bonus stepping at three barbarian levels; the number of attacks granted by an
extra-attack feature stepping once (and, for one class, twice more later); cantrip damage stepping at
character levels 5, 11 and 17.

**S22. Piecewise replacement, where a later segment is itself a function.** Disjoint level ranges each
with their own **formula**, where crossing a boundary *replaces* the previous formula's output rather
than adding to it. This is the general case of which S21 is the all-constants degenerate form.
`target:` extra-damage dice counts, pool maxima, die sizes · `shape:`
`Piecewise[(lo,hi) → Value]` · `stack:` internal replacement, then the whole result stacks normally ·
**Honesty note, and a correction to the source draft:** the draft cited a rogue's sneak-attack dice as a
piecewise flat-then-formula progression. It is not — in SRD text it is a single monotone progression
(one die, plus one more at every second level), expressible as one rounded `Scale`. The commissioning
case (a) — a fixed +1 die over one level band, replaced from a later level by `floor(classLevel / 2)` —
is therefore a **general shape the constructor must support**, whose SRD instances are mostly degenerate
(all-constant segments, S21) or single-formula (S20). Published precedent for a genuinely mixed
piecewise does exist: the 2024 revision replaced several hand-written per-level tables with formulas
while retaining fixed values at the lowest levels, and pool maxima that are constant up to a threshold
and unbounded after it (S35) are piecewise with a non-numeric final segment. Build the general
constructor; do not special-case the motivating feature.

**S23. Die-size step by tier.** What steps is the *size* of a die, not the count.
`target:` a resource or feature die · `shape:` `Table[level → dieSize]` ·
*SRD:* a monk's martial-arts die stepping through larger sizes at defined class levels and referenced by
name by other features; a bard's inspiration die doing the same on a different schedule.

**S24. Multi-parameter bundling under one feature identity.** One named feature owns several
independently-scheduled values.
*SRD:* the barbarian rage feature bundles (i) uses per long rest on one breakpoint schedule,
(ii) a flat damage bonus on a *different* schedule, and (iii) a duration; a later feature removes the
use limit entirely (S35). *Generic:* a martial subclass's manoeuvre-dice pool whose die **count** and
die **size** step on two different schedules. Engine consequence: a feature is a container of parameters,
not a value.

**S25. Level-source selection.** Which level a formula reads is itself a parameter, and getting it wrong
is the single most likely multiclass bug.
`shape:` the choice among `TotalCharacterLevel`, `ClassLevel(c)`, `EffectiveLevel(c, subst)` ·
*SRD:* cantrip damage scales on **total character level** even for a multiclassed caster, while a class
resource pool scales on **that class's level only**, and proficiency bonus scales on total level. Three
different sources visible on one sheet simultaneously.

**S26. Resource-instance-keyed scaling.** Value scales with the level of the *resource instance spent*,
not with any character level, and usually carries an independent level-gated cap.
`target:` extra damage dice, effect magnitude · `shape:` `Scale{SpentResourceLevel}` + `ClampMax` ·
*SRD:* a paladin's smite feature scales its extra dice with the level of the slot expended, capped
independently, with a conditional extra die against certain creature types (S63).

**S27. Upcast delta scaling.** `base + k × (slotLevel − baseLevel)`, applied to one or several of the
effect's parameters at once (dice, target count, duration, range).
`shape:` `Scale{SpentResourceLevel − Const}` per parameter ·
*SRD:* the "at higher levels" clause of most spells. A charge-driven item can drive the same delta from
charges rather than slots (S36), so the constructor should read the delta from the spend record, not
from "slot" specifically.

**S28. Per-instance / per-target-count scaling.** Value depends on how many targets or objects are
affected, or is divided among them.
`shape:` `Scale{CountOf(targets)}` or `Distribute{pool, targets}` ·
*SRD:* a force-dart cantrip-adjacent 1st-level spell that fires a number of darts and lets the caster
allocate them; a sleep-type spell that spends a rolled HP pool across creatures in ascending order.
Relevant because the value is not a sheet number at all — it is a per-use allocation.

---

## 7. Resource pools, recharge and rate limiting (case (b))

### 7.1 Pool shapes

**S29. Pool with a scaled maximum.** A named pool whose max is any `Value` from §2–§6 and whose current
value is persistent state. The max and the recharge rule are **orthogonal**; the source draft's
folding of "how big" and "how it refills" into one entry is the thing to avoid.
`target:` pool · `shape:` `max: Value` ·
*SRD:* a monk's point pool equals monk level (2014 "ki"; the 2024 rules rename the same pool and keep
the level-equals-max shape); a sorcerer's point pool equals sorcerer level from a threshold onward;
per-rest use counts equal to an ability modifier (S3) or a PB formula (S4).

**S30. Parallel same-kind pool that never merges.** Two pools of structurally identical units that are
tracked separately and refill on different cadences, but can be spent on the same things.
*SRD:* pact-magic slots vs standard spell slots — same unit ("a slot of level N"), different maxima,
different recharge, and the multiclassing rules keep them separate rather than summing (S39).

**S31. Charge pool attached to an item, with expenditure scaling and a destruction risk.** Charges are a
pool whose spend amount is chosen per use (S27) and whose exhaustion can carry a terminal random event.
*SRD:* a wand with 7 charges, where spending additional charges raises the effective spell level, and
where expending the last charge triggers a d20 roll that destroys the item on a 1.

**S32. Unlimited sentinel as a pool maximum.** Beyond a threshold the maximum is not a number but "stop
tracking".
`shape:` `Piecewise[..., (threshold, ∞) → Unlimited]` ·
*SRD:* a barbarian's rage uses become unlimited at the class's capstone level. The sentinel must live
*inside* the `Value` type; modelling it as `max: 9999` breaks the UI and the "can I still use this"
predicate.

**S33. Bidirectional conversion between pools at asymmetric rate tables.** Two pools convert into each
other at rates that depend on the *denomination* being purchased, and the two directions use different
tables — it is not a reversible ratio.
*SRD:* a sorcerer's flexible-casting feature converts a spell slot into points equal to the slot's level,
while creating a slot of a given level costs a strictly larger, level-dependent number of points, with a
hard cap on the level of slot that can be created. Model as directed `ConversionRule` edges with their
own caps, never as a single exchange rate.

### 7.2 Recovery shapes

**S34. Full recharge on a rest of stated granularity.** Granularity is a parameter with at least three
values: long only; short-or-long; and (rarely) other.
*SRD:* pact slots and a monk's points return on a short or long rest; standard slots and rage uses on a
long rest.

**S35. Partial recovery — a fixed or formula amount on the shorter rest, full on the longer.** Requires
the recharge amount to be a `Value`, not an enum of {full, none}.
*2024 rules:* the druid wild-shape use pool regains **one** use on a short rest and all uses on a long
rest — two recharge rules on one pool. *SRD:* hit dice regained on a long rest are half the total,
minimum 1 (S11) — a partial recovery with rounding and a floor.

**S36. Self-scheduled recovery independent of resting.** A once-per-day (or per-rest-count) recovery
whose *amount* is a formula and whose trigger is not "you rested" but "you chose to, subject to a
usage gate".
*SRD:* a wizard's arcane-recovery feature recovers slots totalling half the wizard's level rounded up,
once per day, taken during a short rest; a land-druid analogue exists on the same shape.

**S37. Event-triggered restoration layered on top of a rest cadence.** A pool regains units on an
in-fiction event, concurrently with its normal rest rule.
*Generic:* a combat-resource pool that refills on a long rest but also regains one unit when its owner
scores a critical hit or drops a foe. The consequence for the type system is that `recharge` is a
**list** of rules, not one rule. Scope: the mirror-image case — a pool that *drains* on an event or on
elapsed use — is S96.

**S38. Clock/calendar recharge with a random amount.** Refill keyed to a time of day rather than to
rests, with the amount rolled.
*SRD:* item charges that return at dawn in a rolled quantity (e.g. 1d6+1). This resolves the "is
monster-style recharge relevant to player sheets?" question: **yes, but in this form.** Per-round
probabilistic recharge (roll a die at the start of each of your turns to regain the ability) is a
stat-block idiom that reaches a PC sheet only when an item or feature grants a stat-block-style ability;
it is the same constructor as S37 with a probabilistic trigger, so support `OnEvent(trigger, amount)`
with a trigger that can be "start of turn, on a die result" and nothing further is needed.

### 7.3 Cadence classes (the `cadence` dimension's value set)

`C1` per turn · `C2` per round · `C3` per short rest · `C4` per short-or-long rest · `C5` per long rest ·
`C6` per day / per dawn (calendar) · `C7` per event trigger · `C8` per named target ("once per creature
per rest"). `C1`/`C2`/`C8` are **rate limiters** and are orthogonal to pools — see S40.

**S39. Pool-free single-use gate.** "Once, then not again until a long rest," with no pool worth
displaying. Structurally a pool of max 1, and worth normalising to that rather than having two
mechanisms.

**S40. Rate limiter independent of any pool.** A cap on how often an otherwise-unlimited effect can fire
within a time unit or per target.
*SRD:* an extra-damage feature usable once per turn regardless of how many attacks land; two of the 2024
weapon-mastery properties grant an extra attack that can be made only once per turn (verified against
SRD 5.2.1 during this audit); the remaining six carry no usage limit and are always available. This
resolves the draft's flagged weapon-mastery-cadence UNKNOWN: **at-will, with a per-turn limiter on
exactly the two that grant an extra attack.**

---

## 8. Grant family (set membership and entitlements)

Grants are not modifiers. They add membership or entitlement, which *downstream* causes numbers to
change. Keeping them a separate constructor is what stops "add proficiency" from being typed as an
arithmetic operation.

**S41. Proficiency grant.** Adds membership to a proficiency set; the number appears only because a
check formula consults membership (S4).

**S42. Expertise grant**, and the compound **"proficiency if you lack it, otherwise expertise"** — a
grant whose behaviour depends on the character's own state *at grant time*. Called out because a mature
production implementation reportedly cannot express it in a single modifier (§10), so it is worth
first-class support here rather than two authored variants.

**S43. Advantage/disadvantage state on a named roll category.** Boolean-ish state, not a number, scoped
to an enumerated roll category (a named ability's saves; attack rolls under a stated circumstance; a
named skill). Combines by R5, not by summation.

**S44. Resistance / immunity / vulnerability grant.** A small enum per damage type or condition;
idempotent (R7).

**S45. Sense grant with a range.** Interacts with S14 when a second source would extend rather than
replace.

**S46. Movement-mode grant.** Acquiring a speed that did not exist (fly/swim/climb) is a set-membership
change plus a scalar; "your swim speed equals your walking speed" is a grant whose value is a live
reference to another field, not a copy.

**S47. Size/creature-type change.** A categorical change with numeric knock-on effects (carrying
capacity multiplier, reach, weapon-size interactions). *Generic:* a lineage trait that counts the
character as one size larger for carrying capacity only — a **derived-input substitution scoped to one
formula**, not a real size change, and the two must be distinguishable.

**S48. Spell entitlement grant — six distinct sub-forms.** The most important grant family for a
multiclass spell engine, and the one most often collapsed into "knows the spell":
1. **List expansion** — the spell becomes eligible for selection but nothing is known yet.
2. **Known/prepared, counting against the limit.**
3. **Always prepared and exempt from the limit** (*SRD:* cleric domain spells).
4. **Free cast once per rest without expending a slot.**
5. **At-will casting** (*SRD:* certain warlock invocations; all cantrips).
6. **Ritual-only casting.**
Each grant additionally carries: which **spellcasting ability** it uses (may differ from the host
class's), a **fixed casting level** where applicable, and whether it **counts as a class spell for you**
(which feeds eligibility rules elsewhere). A multiclassed sheet routinely holds all six sub-forms at once.

**S49. Grant whose payload is another choice.** A feature that grants a feat pick, a subclass pick, or a
sub-feature pick — effects form a tree, and resolution must be re-runnable when a lower node's choice
changes.

**S50. Heterogeneous choice slot.** A menu whose options instantiate *different shapes* from this
taxonomy (*SRD:* the warlock invocation list contains options that are flat bonuses, others that are
resistance grants, others that are at-will spell grants). The engine's choice abstraction must hold
options of heterogeneous effect shape, not merely heterogeneous names. Scope: the same requirement with
the selector moved from the player to a die, resolved per use rather than per binding, is S80.

**S51. Selection breadth as a parameter.** Fixed single · choose-N-from-a-closed-list-of-M ·
choose-N-from-an-open category predicate ("any skill", "a spell from any list") · all-matching-category.
Open-category is a materially different tooling problem because the option set grows with content.

**S52. Rebinding cadence on a choice.** Orthogonal to breadth: fixed at grant · re-choosable on level-up ·
re-choosable after a long rest (*SRD:* prepared spell lists) · re-choosable on each use. A choice is a
binding with a lifetime, not a one-time write.

---

## 9. Roll-outcome shaping

**S53. Roll floor / reroll clamp.** Alters the die's distribution rather than adding to it — not
equivalent to any flat bonus.
*SRD:* a fighting style that rerolls damage dice showing 1 or 2, once each, and forces use of the new
roll; a high-level rogue feature that treats a d20 result below 10 as 10 on proficient ability checks.
Scope: rewriting a roll's *classification* after it has resolved (failure → success) is not a reroll and
is S77.

**S54. Critical-range modification.** Changes the *classification threshold* of a roll.
*SRD:* a fighter archetype scores critical hits on 19–20, and later on 18–20. Related but distinct:
rules that make an attack an automatic critical hit under a state condition.

**S55. Outcome-conditional extra dice.** Dice added only when the roll lands in a classification bucket.
*SRD:* a barbarian feature adding extra weapon dice on a critical hit, with a count stepping by tier
(S21); a half-orc lineage trait adding one extra weapon die on a critical hit.

**S56. Triggered rider on hit or miss.** Attached to a weapon or attack, fires on the attack's *outcome*
and produces something other than a modifier to the triggering roll. This is a small state machine, not
a sheet value, and it is the shape that fits the taxonomy worst — which is itself the finding.
*SRD 5.2.1 (2024 weapon-mastery properties, now confirmed SRD and therefore nameable):* on a hit, a
property that grants the attacker advantage on their next attack against that same creature before the
end of their next turn; a sibling property that imposes disadvantage on the *target's* next attack; one
that, on a **miss**, still deals damage equal to the attack's governing ability modifier; one that, on a
hit, forces a Constitution save (DC 8 + PB + the attack's ability modifier — i.e. an S16 formula
embedded in a rider) or applies the prone condition; one that grants an extra attack against a second
creature whose damage formula deliberately differs from the parent attack's; one that reduces the
target's speed until the attacker's next turn. Three engine-relevant observations: the transient token
may attach to **another creature**; its expiry window is a turn-relative clock, not a duration in
minutes; and the rider's own DC/damage formulas are full formulas in their own right.

**S57. Fallback-on-failure (graded outcomes).** An effect whose value is tiered by the *result*: full on
a failed save, half (rounded down) on a success, and in some cases a reduced but non-zero result on a
miss. The value constructor therefore needs an outcome-keyed variant, not just a scalar.

**S58. Banked one-shot roll modifier.** A bonus die minted now, held, and consumed by one future roll of
a named category — possibly by a *different* creature, possibly after seeing the roll.
*SRD:* a guidance-style cantrip's bonus die on one ability check; a bless-style spell's die on attack
rolls and saves for its duration; a bard's inspiration die handed to an ally and spent by that ally.
Lifecycle: minted → held with an expiry → consumed → gone. None of "modifier", "pool" or "grant" alone
covers it. Scope: banking a *whole spell* together with the original caster's DC, attack bonus and slot
level is a different shape, S79.

**S59. Temporary hit points.** A separate field, not max HP and not healing; lost first; and governed by
its own non-stacking rule (R3).

---

## 10. Suppression and waiver family

The source draft correctly identified this as a gap and recommended adopting it; it is adopted here as a
first-class family. None of S1–S59 can express "cancel a rule that would otherwise apply" without
abusing a stacking rule.

**S60. Penalty suppression.** Cancels an otherwise-applicable penalty from a *different* rule.
*SRD:* boots that additionally prevent the wearer's speed being reduced by encumbrance or heavy armour —
suppressing two named penalties that live in the equipment rules, not in any effect the character owns.
Other canonical targets: the disadvantage on Stealth imposed by certain armour, the speed reduction
imposed when an armour's Strength requirement is unmet.

**S61. Requirement waiver (removes a sheet line item).** Removes a precondition rather than a penalty.
*SRD:* a spellcasting focus substitutes for material components that lack a stated cost — the components
line stops being a tracked requirement. Other instances: ignoring a weapon's loading property, ignoring
an ammunition requirement, casting without somatic components. These are the effects that make sheet
*line items disappear*, and they must be modelled as suppressors of a named rule id, which in turn means
every suppressible rule needs a stable id.

**S62. Categorical mechanic immunity.** "You can't be surprised", "your ability scores can't be reduced",
"you can't be forced to move" — suppression at the rules layer, keyed to a mechanic rather than a damage
type.

---

## 11. Relational and conditional family

**S63. Target-conditional modifier.** Applies only against certain targets or target states (a creature
type; a target that is bloodied; a target you can see). **Cannot be folded into a static sheet number** —
the sheet must be able to render conditional annotations as first-class output.

**S64. Self-state-conditional modifier.** Gated on the character's own derived state (while raging, while
wearing no armour, while wielding no shield, while below half HP, while a resource remains).
*SRD:* several class features condition on being unarmoured; the 2024 rules formalise the half-HP
predicate (S66).

**S65. Positional/aura effect emitted to others.** An effect applied to *other* characters within a
radius, whose value is computed from the **emitter's** stats, with a radius that may itself scale.
*SRD:* a paladin's protective aura adds the paladin's Charisma modifier to nearby allies' saving throws,
with the radius increasing at a later level. Engine consequence: a sheet must be able to receive an
effect whose value is `ForeignField(otherCharacter, f)` — the only shape in the original body of this
document that breaks the single-character closed world. Scope: the aura's reads are **live**. A foreign
field read once and then frozen — the source creature may afterwards cease to exist and the number
persists — is S98, and reflection that resolves an effect with a foreign caster's parameters is S76.

**S66. Named derived predicate.** Not an effect: a boolean computed from other fields and given a stable
name so features can gate on it by name.
*SRD 5.2.1 (verified):* the 2024 rules define a state that holds while a creature is at half its hit
points or fewer, and other content references it by name — formalising what 2014-era text spelled out
inline. Model these as a registry of named predicates evaluated over the sheet, referenced by gates.

---

## 12. Multiclass aggregation shapes

Called out separately because this project's domain is multiclass spellcasting.

**S67. Combined-caster-level lookup.** Multiple spellcasting classes do **not** each look up their own
slot table and sum. A single derived caster level is computed by summing weighted, individually-rounded
per-class contributions, and that one number indexes one table.
*Verified:* full casters contribute their full level; half-casters contribute half, **rounded down under
2014 rules and rounded up under 2024 rules**; the third-caster subclasses contribute a third, rounded
down. The rounding direction is therefore per-class-and-per-edition data (S20), and the engine already
needs both rulesets side by side.

**S68. Separately-tracked parallel progression.** Pact-magic slots are computed from that class's own
level and are not folded into S67's combined level, while remaining spendable on the same spells (S30).

**S69. Per-class-siloed resources.** Non-slot pools read `ClassLevel(c)` only; multiclassing into a
second class does not inflate them. This is the default a naive implementation gets wrong.

**S70. Total-character-level quantities.** Proficiency bonus, cantrip scaling tiers, ASI/feat cadence,
attunement capacity and the hit-dice **count** all read total level regardless of the class split.

**S71. Non-combining duplicate features.** Explicit SRD multiclassing rules: an extra-attack feature
gained from two classes does not add; the unarmoured-defence feature cannot be gained twice. The general
shape is "a feature identity that is idempotent across sources", which is a per-feature flag, not a
global stacking rule.

**S72. Typed multiset accumulation.** The hit-dice pool is not a scalar: it is a multiset keyed by die
size (a character may hold d8s from one class and d10s from another), and both spending and the
half-total-minimum-1 recovery (S11) operate over the typed multiset. Any pool that can be contributed to
by more than one class needs this treatment or it will silently coerce to a scalar.

**S73. Acquisition preconditions.** Gates on *gaining* levels/effects rather than on applying them:
ability-score prerequisites for entering a class, and a reduced proficiency set granted on multiclass
entry compared to starting in that class. These belong to the same predicate language as §13's gates but
run at a different time (build-time validation, not sheet evaluation). Scope: preconditions that read
*other equipped or attuned items* rather than the character's own scores, and that revoke themselves when
the prerequisite item is removed, are S88; preconditions that read a recorded past event are S89.

---

## 13. Combination rules of the 5e math system (stacking / override)

This section contains **the most significant correction to the source draft.** The draft asserted a
general "bonuses of the same named type don't stack; take the highest" rule as 5e's default. That is a
d20-lineage convention from earlier editions and from other systems; **it is not a 5e rule.** 5e's
default is that modifiers from different sources **add**. Getting this backwards would produce
systematically low numbers across the whole sheet.

**R1. Default: everything adds.** Modifiers from distinct sources sum. Non-stacking is always a
*specific* rule attached to a *specific* mechanic, enumerated below.

**R2. Same-spell (2014) / same-name (2024) non-combination.** Effects of *different* spells add while
their durations overlap; effects of the *same* spell cast more than once do not combine — the most
potent applies. The 2024 rules generalise this from "the same spell" to "game features with the same
name", covering features, traits, items and spells alike. *UNKNOWN: whether the generalised wording
appears in SRD 5.2.1's glossary or only in the 2024 core books — the narrower spell-scoped form is
certainly present in SRD text.* Implementation: a `dedupeKey` on each effect (default: its source
feature's name), with take-the-most-potent resolution — **not** a bonus-type dedup.

**R3. Temporary hit points never stack.** Any two grants, from any sources, resolve by choosing one —
you keep the more useful pool, you do not sum. Special-cased in the engine, not derived from R2.

**R4. Base-formula exclusivity.** At most one base-AC formula applies; the character chooses among those
available. Additive AC bonuses then apply on top of whichever base won. The multiclass rule against
acquiring the same unarmoured-defence feature twice is a published corollary.

**R5. Advantage and disadvantage do not accumulate and do cancel.** Any number of sources of advantage
count as one; if at least one source of each is present they cancel exactly and the roll is made
straight. This is a three-state lattice, not an integer.

**R6. One proficiency contribution per roll.** A roll includes proficiency bonus at most once
(possibly doubled or halved, S4/S8) — you cannot add it twice from two sources.

**R7. Resistance is idempotent and multipliers resolve last.** Multiple resistances to the same damage
type still halve once; resistance and vulnerability to the same type cancel; damage resolution applies
all additive modifiers first, then any halving/doubling, exactly once. Ordering here is a rule, not an
implementation detail.

**R8. Set beats add within its layer; set-base does not.** An unconditional set (S12) or set-as-floor
(S13) supersedes additive contributions to the pre-set value, while a set-base (S14) explicitly invites
further additive layering. "Does this override or stack" is therefore a property of the *operator*, not
of the target.

**R9. Concentration is a one-slot mutual exclusion across effects.** At most one concentration-tagged
effect at a time; starting a second ends the first. Scoped to a **tag shared across many effects**, not
to a target quantity.

**R10. Attunement is an N-slot capacity** (3 by default, and itself a target other effects can raise)
shared across all attunement-gated item effects, with the player choosing the active subset. Also: some
items forbid attuning to more than one of their kind at a time — a per-item-family exclusion on top of
the global capacity. Two further cases live on this rule: attunement that is *conditional on other items
being worn or attuned* and ends when they are removed (S88), and companion bindings that occupy their own
capacity alongside it (S74).

**R11. Global rounding convention: round down unless a rule says otherwise.** Halving damage, halving
recovery amounts, and most divisions round down; the exceptions (S4's round-up half-proficiency variant,
the 2024 half-caster contribution) are exactly why rounding must be carried per formula.

### Evaluation pipeline implied by R1–R11

For each target, in this fixed order:
1. select the base formula (R4) →
2. sum additive contributions after dedupe by key (R1, R2, R6) →
3. apply set / set-if-higher / set-base per R8 →
4. apply multipliers (S7/S8), once each (R7) →
5. apply clamps and floors (S9–S11) →
6. apply suppressors (S60–S62), which may remove any of the above by rule id.

Advantage state (R5), resistance state (R7) and pool state resolve on their own lattices, outside this
scalar pipeline.

---

## 14. Gating / duration classes

`G1` **Permanent / always-on** — most passive features, feats, ability increases.
`G2` **While-equipped** — worn/wielded, no attunement.
`G3` **While-attuned** — plus R10's capacity and (usually) simultaneous carry.
`G4` **Toggled stance/mode** — actively switched on, usually costing a pool unit, ending manually, on a
timer, or on an **upkeep condition failing** (a stance that ends if its owner does not meet a per-round
requirement is a distinct sub-case the source draft missed). Entry and exit are both **voluntary**; the
involuntary counterpart, entered by failing a check and not endable at will, is `G11` (S81).
`G5` **Concentration** — timer plus R9 plus damage-triggered saves plus voluntary end. The recurring
obligation sits on the **emitter**; an effect whose *target* re-rolls to end it is `G12` (S82).
`G6` **Timed duration** — (interval, unit), including **turn-relative windows** ("until the end of your
next turn"), which are not expressible in minutes and need their own clock (S56). A duration that runs
alongside a recurring exit save is `G12`, not this.
`G7` **Event-triggered** — fires on a trigger, no standing state (S56).
`G8` **Self-state-conditional** — a predicate over the owner's own sheet (S64, S66).
`G9` **Target-conditional** — a predicate over the *other* creature (S63); can never be folded into a
static sheet number.
`G10` **Spend-gated** — available only by expending a unit at use time, collapsing duration and resource
gate into the trigger (most spells, S26/S27).

Note that `G8`/`G9` are the classes a sheet cannot pre-compute. The engine's output type must therefore
be "a number plus a set of conditional riders", not a number.

---

## 15. D&D Beyond's modifier model (described, not reproduced)

Sourced from public community documentation of D&D Beyond's homebrew modifier editor; their internal
schema is not published. Everything below is a paraphrase of observed behaviour, offered as the closest
thing to a production reference implementation of this problem.

**Shape of the model.** A modifier is a tuple of four largely independent axes:

- **Type** — a fixed enum naming the operator/mechanism family. Observed members correspond closely to
  this document's operator set: an additive bonus; a separately-named *stacking* additive bonus; an
  unconditional set; a set-base; proficiency; expertise (equivalently "twice proficiency"); half
  proficiency and, as a **separate enum member**, half proficiency rounded up; advantage; disadvantage;
  resistance; immunity; vulnerability; damage; damage-type replacement; weapon-property add and
  weapon-property ignore; a general "ignore" suppressor; language; size; sense; carrying capacity; a
  grant-a-feat type; and 2024-era additions for enabling a feature and for substituting which ability a
  weapon uses.
- **Subtype** — which instance within the family: which skill, which damage type, which sense, which
  roll category.
- **Value** — a fixed number, a live reference to an ability modifier, a dice expression, or one of a
  small set of derived references (notably current proficiency bonus and the count of currently attuned
  items). I.e. their value field is already a small expression language over derived character state,
  which is the same conclusion §2 reaches independently.
- **Duration** — an (interval, unit) pair over rounds/minutes/hours/days, decoupled entirely from value
  and target.

Additional observed behaviours: item modifiers are gated on attunement; spell modifiers are restricted
to a narrower type subset; some types are restricted to particular content categories (e.g. damage
modifiers only on items and spells).

**What their design decides, and what it costs.**

1. **Non-stacking is opt-out, not opt-in.** Their plain additive type participates in a
   take-the-highest dedup, and an author must deliberately choose the stacking variant to make two
   bonuses sum. Note this is an *implementation policy*, not a 5e rule (§13 R1) — it is a pragmatic way
   to make user-authored content behave, and this engine should not copy it wholesale. Copy the
   *mechanism* (an explicit per-effect stacking decision), reject the *default*.
2. **Set vs set-base as two enum members** matches this document's S12/S13 vs S14 split exactly, and is
   evidence that the distinction is load-bearing in practice rather than theoretical.
3. **Rounding direction as two enum members** rather than one member with a parameter. A viable
   alternative to §S4's parameterised approach; it trades combinatorial enum growth for a simpler value
   type. Given that this project needs 2014 and 2024 rounding side by side (S67), the parameterised form
   is the better fit here.
4. **A first-class "ignore" suppressor** exists in their vocabulary and has no counterpart in the source
   draft's families — the direct evidence for adopting §10 as its own family.
5. **The vocabulary outruns the enforcement.** Several of their types are reported by their user
   community as defined but inert — present in the authoring UI with no visible effect on computed
   numbers. The caution for this project: naming a shape in the type system is necessary but not
   sufficient; each shape needs a consuming read site, and the type system should ideally make an
   unconsumed shape a compile error rather than a silent no-op.
6. **Compound conditionals are the known weak point.** The "gain proficiency, or expertise if you already
   have proficiency" pattern (S42) is reported by their community as not expressible in a single
   modifier, requiring two authored variants. Likewise their prerequisite/restriction field is largely
   free text rather than structured data — meaning §14's gating taxonomy is the part of this problem that
   even a mature implementation has **not** solved as data. Treat structured gates as a design risk to
   attack deliberately, not a solved pattern to copy.
7. **Special-casing leaks in.** At least one modifier in their vocabulary is scoped to a single named
   cantrip. A schema that cannot express a popular feature generally will eventually grow a bespoke
   member for it; that is the failure mode this taxonomy exists to prevent.

---

## 16. Engine-design implications

### 16.1 Four constructors absorb roughly two-thirds of the taxonomy

**(1) A recursive `Value` expression type.** One type, evaluated against a resolved character context:

```
Value =
  | Const(n)
  | Ref(source)                                   // §2 value sources
  | Scale{ src, mul, div, round: Floor|Ceil }     // S2 S4 S20 S25 S26 S27 S28
  | Table[{ from, to, Value }]                    // S21 S23  (all-constant segments)
  | Piecewise[{ from, to, Value }]                // S22      (segments may be formulas)
  | Dice{ count: Value, size: Value }             // S19 S23 S31
  | Sum[Value] | Mul{ Value, k }                  // S1 S7 S8 S16
  | Clamp{ Value, min?: Value, max?: Value }      // S9 S10 S11 S26
  | Unlimited                                     // S32 sentinel
  | ByOutcome{ full: Value, partial: Value }      // S57
```

`Table` and `Piecewise` are deliberately the same constructor family at two strictness levels: keep
`Table` as the honest escape hatch for published breakpoint tables that have no closed form, and reserve
`Piecewise` for segments that are themselves formulas. **This is exactly case (a):** a scaling feature
value that is `+1` over one class-level band and `floor(classLevel / 2)` from a later level is

```
Piecewise[ {3, 8, Const(1)},
           {9, ∞, Scale{ ClassLevel(rogue), div: 2, round: Floor }} ]
```

with no bespoke code for the feature, and the same constructor covering rage-uses-then-unlimited
(`Piecewise[..., {20, ∞, Unlimited}]`), die-size tables, and the 2024 shift of per-rest maxima from
tables to PB formulas. Note the audit finding behind this: the SRD version of the feature that motivated
case (a) is *not* piecewise — so build the general constructor for the general shape, and do not derive
its design from one feature's published numbers.

**(2) A small `Op` enum over typed targets.** `Add · Mul · Set · SetIfHigher · SetBase · ClampMax ·
ClampMin · RaiseCap · SubstituteInput · ReplaceFormula · GrantMember · Suppress(ruleId)`. Each target in
§1 declares a **kind**, and the type system should make an ill-kinded pairing unrepresentable — no
`Add` to a set-membership target, no `SubstituteInput` on a scalar, no `Mul` on an enum. Applied in the
fixed pipeline of §13, this collapses §4, §5 and §10 into one dispatch.

**(3) `Pool` as a record, not an effect.** Case (b) falls out of:

```
Pool = { id, max: Value, spendUnit, recharge: RechargeRule[], limiters: RateLimit[] }
RechargeRule = OnRest(Short|Long|ShortOrLong, Full | Amount(Value))
             | OnEvent(trigger, Amount(Value))          // includes probabilistic triggers
             | OnClock(Dawn|Dusk|Day, Amount(Value))    // Value may be Dice
             | SelfScheduled(perPeriod: Cadence, Amount(Value))
RateLimit    = PerTurn | PerRound | PerRest(Short|Long) | PerTarget(scope)
Conversion   = { from: PoolId, to: PoolId, rate: Table, cap?: Value }   // directed, asymmetric
```

`recharge` being a **list** is the load-bearing decision (S35, S37): the 2024 shape-changing use pool
regains one use on a short rest *and* all on a long rest, and event-triggered top-ups coexist with rest
recharge. `max: Value` reuses constructor (1) wholesale, so a monk-style pool (`Ref(ClassLevel)`), a
modifier-sized pool (`Ref(AbilityMod)`), a PB-sized pool, a breakpoint-table pool and an
unlimited-at-capstone pool are all the same type. Conversions are **directed edges with their own rate
tables** because the two directions genuinely differ. Rate limiters are separate from pools because
"once per turn" limits effects that have no pool at all (S40).

**(4) `Grant` as a distinct constructor from modifiers**, with spell entitlements (S48) carrying their
own six-way sub-form, spellcasting ability, fixed casting level, and counts-as-a-class-spell flag. A
multiclass engine's correctness lives almost entirely in these distinctions, and none of them is a
number.

### 16.2 The three things a type system can prevent here

- **Level-source confusion (S25/S67–S72).** Make `ClassLevel(c)`, `TotalCharacterLevel` and
  `EffectiveLevel` distinct types so a formula cannot silently read the wrong one; make the multiclass
  caster-level contribution a function of (class, ruleset) with rounding as data, since the 2014/2024
  half-caster direction differs and this project must model both.
- **Kind errors between op and target** (§16.1 point 2).
- **Unconsumed vocabulary.** Every shape in the type system should have exactly one read site; an
  exhaustive `switch` over the `Op` and `Value` unions at each read site turns "we named it but never
  wired it up" — D&D Beyond's observed failure mode — into a compile error.

### 16.3 The three things it cannot, and must surface instead

- **Target-conditional and self-conditional modifiers (S63/S64, G8/G9)** cannot be folded into a
  displayed number. The sheet's computed-value type should be `{ value, riders: ConditionalRider[] }`
  from the start; retrofitting that later touches every read site.
- **Riders and outcome state machines (S56, S58).** Turn-relative windows, tokens attached to *other*
  creatures, and banked dice handed to allies are lifecycle objects, not sheet fields. Give them a
  minimal `TransientToken { owner, expiry: TurnRelativeClock, payload }` rather than pretending they are
  modifiers.
- **Foreign-sourced values (S65).** An aura's value belongs to another character. Either declare auras
  out of scope explicitly, or make `ForeignField` a real source in §2 — but do not let it arrive by
  accident.

### 16.4 Per-source provenance: computed values are term lists, not totals

The sheet must display *labelled terms* — a dice-valued feature rendering as two separately attributed
groups rather than one merged total — so §16.3's `{ value, riders }` is insufficient. The computed-value
type is:

```
Computed<K> = { terms: Term<K>[], value: K, riders: ConditionalRider[] }
Term<K>     = { source: SourceRef, op: Op, contribution: K | Computed<K>,
                status: Applied | Superseded(by: TermId) | Suppressed(rule: RuleId) }
```

Four consequences, in the order they bite:

1. **`Term` is parameterised by the target's kind** (§1), so a dice-valued target carries dice-valued
   contributions and prints without string surgery. **Invariant: no algebraic simplification across
   terms.** Two dice contributions of the same size from different sources never merge into one; merging
   is legal only *within* a term. `value` is the fold of the term list, cached, never the source of
   truth. Term order is the §13 pipeline order — never sorted by magnitude, because the pipeline order is
   the explanation.
2. **The override family renders as replacement, not addition.** A term list is a trace, not a sum. A
   set-family term (S12/S13) carries `replaces: TermId[]` and prints with replacement notation
   (`= X`), flipping its victims to `Superseded`. A set-base term (S14) occupies the base position and
   *leaves later additive terms summing on top* — the S12/S13-vs-S14 distinction becomes literally
   visible, which is the best available check that the engine implemented R8 correctly. A
   formula-replacement term (S15) replaces the base term itself and its `contribution` is a nested
   `Computed` holding the winning formula's own sub-terms; render collapsed, expandable. This is why
   `contribution` must admit a nested `Computed` rather than only a resolved value.
3. **Dedupe and take-highest keep the losing term, marked — they do not drop it.** Retention is the
   choice because the R-rules that suppress (R2 same-name non-combination, R3 temp HP, R4 base
   exclusivity, R5 cancellation, R6 one proficiency contribution, R7 idempotent resistance) are precisely
   the counterintuitive ones, and a dropped term makes "this rule suppressed it" indistinguishable from
   "you were never granted it" — the most common support question a sheet tool generates. The cost is
   only render noise, paid by defaulting non-`Applied` terms to a disclosure rather than by deleting
   data. Suppressors (S60–S62) mark by rule id for the same reason.
4. **Segment boundaries do not belong in the term label.** Agreed: the resolved contribution at the
   current level plus `source` is the whole of the sheet's obligation; a schedule rendered inline
   duplicates the level-up/planner surface that already owns "what changes when" and will drift from it.
   The one requirement this places on the model is that `source` must remain a **resolvable reference to
   the authored effect**, not a flattened display string — so the planner can ask the same term for its
   next boundary without a parallel lookup path.

One trap this makes visible: temporary hit points (S59) get their own target and their own term list;
they must never appear as a term on current or maximum HP.

---

## 17. Residual UNKNOWNs

- **UNKNOWN (resolved partially):** whether the 2024 generalisation of the non-combination rule from
  "the same spell" to "features with the same name" appears in SRD 5.2.1's glossary, or only in the 2024
  core books. The narrower, spell-scoped form is definitely SRD. Engine impact is low: implement the
  dedupe key generally and configure its scope per ruleset.
- **UNKNOWN:** exact 2024 numeric tables for several class resource pools were not primary-verified. Only
  the *structural* claim is asserted here (several moved from breakpoint tables to PB-linear formulas);
  no specific 2024 numbers are stated in this document as fact.
- **UNKNOWN:** whether any published content combines an S14 set-base with a competing S13 set-as-floor
  on the same target, which would force a precedence rule between them. No instance was found; the
  pipeline in §13 orders them arbitrarily (set-if-higher before set-base) and should be revisited if a
  real case appears.
- **UNKNOWN:** whether an `EffectiveLevel` substitution ("count as a level of X for this purpose") occurs
  in SRD content or only in non-SRD content. It is included as a value source because the multiclass
  caster-level contribution needs it regardless of provenance.
- **RESOLVED this pass:** 2024 weapon-mastery usage cadence — at will, with a once-per-turn limiter on
  exactly the two properties that grant an extra attack (verified against an SRD 5.2 reproduction of the
  mastery-properties text).
- **RESOLVED this pass:** SRD 5.2.1 magic-item carryover — 5.2.1 contains 243 magic items including the
  5.1 carryovers, after 5.2 omitted 15 in error; two artifact-class items were renamed. SRD-named item
  examples in this document are safe under both.
- **RESOLVED this pass:** monster-style recharge relevance — the player-sheet form is clock-based item
  charge recharge with a rolled amount (S38); per-round probabilistic recharge needs no new constructor,
  only an `OnEvent` trigger that can be probabilistic.
- **RESOLVED this pass:** 2014/2024 half-caster rounding direction for multiclass caster level (down vs
  up respectively).

## 18. Non-goals

- **Qualitative-capability unlocks** (which creature forms a shapeshifting feature may assume, which
  lists a feature may select from) change eligibility, not numbers. They are real mechanisms belonging to
  a content-filtering taxonomy, deliberately excluded — except where an eligibility flag is carried on a
  grant (S48) because a numeric read site consults it.
- **Monster/NPC stat-block idioms** (legendary and lair actions) are out of scope; the one that leaks
  onto player sheets, probabilistic recharge, is covered by S38.
- **The interior of a summoned or bound companion** — its own AC, hit points, turns, attacks and saves —
  is owned by an encounter layer, not by this engine. What the sheet does own is the binding itself, and
  the boundary between the two is contracted explicitly in S74 rather than left implicit.
- **No enumeration of non-SRD content.** Where a shape's most vivid published instances are non-SRD, the
  shape is described with a generic example. The absence of a named example is a licensing decision, not
  a coverage gap.

---

## Addendum A: legendary/artifact-tier mechanisms (2026-08-11 corpus validation)

S1–S73 were assembled from class, subclass, feat and spell shapes, with magic items sampled
opportunistically. They were subsequently validated against a 307-entry magic-item corpus spanning
uncommon through artifact. The uncommon and rare tiers are almost entirely covered. The gaps are
**concentrated in the legendary and artifact tiers**, and they are concentrated there for a structural
reason worth stating: at those tiers a single named item routinely bundles a second stat-blocked
creature, a random-outcome table, a multi-day cadence and an identity gate under one name — S24's
multi-parameter bundling taken past the point where every parameter is a number. Twelve systematic gaps
and roughly fourteen single-instance oddities were found; they are `S74–S98`, with cadence classes
`C9–C12` and gating classes `G11–G13`. **No existing number is renumbered or reused.** Everything here is
post-tranche-1 — tranche 1 being §13's scalar pipeline and §16.1's four constructors — so each entry
names the constructor family it extends rather than proposing a fifth by default. Sourcing follows §0
unchanged: no magic item is named, SRD instances are described and tagged `SRD:`, and everything whose
published instances are non-SRD carries an invented generic example instead.

### A.1 Additions to §1, §2, §7.3 and §14

**Targets (§1).**

| Kind | Added targets |
|---|---|
| Scalar | physical age; emitted-light radius (bright and dim radii are two independent scalars); the **cost side** of a pool spend (S95) |
| Set membership | self-state flags — invisible, ethereal, incorporeal — held as membership rather than as conditions (S83); per-effect immunity tokens (S85) |
| Enum / categorical | alignment (S84) |
| Pool | level-denominated storage capacity, filled and drained in spell-level units (S79) — a typed multiset in S72's sense, not a scalar |
| Entitlement | bound companion instances, with a capacity (S74) |
| Predicate | recorded-history flags — a past event that gates a present effect (S89) |

**Value sources (§2).** `TimeSince(event)` — elapsed real time since a recorded trigger, which is what
"at dawn the day after you first do X" and "if three days pass without Y" read; `UseCount(feature)` —
how many times this feature has been used, ever or within a window (S91); `Snapshot(ForeignField(c, f))`
— a foreign field frozen at a trigger instant rather than tracked live (S98).

**Cadence classes (§7.3).** `C9` fixed real-time cooldown at an arbitrary unit (an hour, three days, a
year) — *not* expressible as C5/C6 and not equivalent to them, since resting does not advance it ·
`C10` randomised cooldown, where the interval is itself a `Dice` value · `C11` continuous-use budget,
denominated in elapsed time and deducted in stated increments while active (S96) · `C12` terminal —
no recharge rule at all, the pool drains once and the effect ends permanently.

**Gating classes (§14).** `G11` involuntary compulsion — a constraint imposed on the owner by the effect,
entered by failing a check rather than by choosing (S81) · `G12` repeat-save-to-end — an effect that
persists until its victim passes a recurring save on its own schedule (S82) · `G13` history-gated —
active only once a recorded past event has occurred (S89).

### A.2 The boundary shape: a second stat-blocked entity

**S74. Bound companion instance (a linked sheet, not an effect).** The corpus's largest single gap: items
that instantiate a creature with its own AC, hit points, speeds, attacks and saves. **This is neither a
Target nor a new top-level category, and it is not a plain non-goal either.** As a Target it would force
§1's union to admit "an entire second stat block", breaking the single-character closed world far harder
than S65 does (S65 *reads* one scalar off another sheet; this would *own* one). As a flat non-goal it
would discard the parts that are unambiguously the sheet's — the activation cost, the pool or cadence
gating it, the attunement gating that, the duration, and any effect the entity grants back to its owner.
The honest model is a **boundary contract**: one entitlement-kind target holding an opaque reference.

- **The sheet owns:** the binding's existence and capacity, the activation gate (G3/G10), the
  re-instantiation cadence (C9/C10 dominate — multi-day cooldowns are the norm at this tier), the duration
  and its early-termination triggers (dismissed, dropped to 0 hit points, dawn), and any effect the entity
  emits **onto the owner's sheet**, which is an ordinary S65 aura with a foreign emitter.
- **An encounter layer owns:** the entity's stat block, turns, hit points, attacks and saves. This engine
  neither computes nor stores them.
- **The contract** is `CompanionBinding { statBlockRef, controlMode, expiry, onExpiry }`, `statBlockRef`
  opaque here.

`target:` bound-companion entitlement · `shape:` `GrantMember{CompanionBinding}` · `stack:` capacity-
limited, and several instances forbid a second concurrent binding of the same family (R10's per-family
exclusion applied to bindings) · `gate:` G3 + G10 · `cadence:` C9/C10.
*SRD:* a statuette that becomes a beast for a stated duration and cannot be used again for a stated number
of days; a horn whose blast summons a rolled number of warrior spirits, where both the **number summoned
and whether they are friendly** depend on a proficiency the blower does or does not have — a binding whose
parameters read the owner's own sheet. *Generic:* an attuned blade that calls a bound shade and refuses to
call a second while the first serves.
**Tranche:** extends `Grant` (4) plus one opaque reference type; deliberately *not* `Value` — nothing here
is a number this engine computes. **Declared non-goal, restated for §18:** the companion's interior. If a
later requirement needs its AC on screen, that is a second sheet instance, not an effect shape.

### A.3 New operator and lifecycle shapes

**S75. Instant-destruction outcome (bypasses the damage pipeline entirely).** An outcome that removes a
creature without routing through hit points, resistances or R7's ordering — distinct from massive
damage, and distinct from S12's "set current HP to 0", which still leaves a creature to be stabilised.
`target:` creature existence, not a sheet scalar · `shape:` `Outcome{Destroy}` keyed to a classification
bucket · `stack:` — · `gate:` typically a critical hit or a failed save, plus an immunity predicate
listing the creature kinds it cannot touch · `cadence:` varies.
*SRD:* a slashing weapon that decapitates on a natural 20 and, against creatures on its own exclusion
list, **degrades to extra dice instead** — the exclusion is part of the shape, not a DM ruling; a maul
that, on a natural 20 against one creature type, forces a save or death; a charged talisman that destroys
an opposed-alignment target outright, leaving nothing. Two consequences: `ByOutcome` needs branches that
are not both numbers (destroy | dice), and destruction outcomes carry a recovery-restriction tag (S90).
**Tranche:** extends `Op` (2) with a non-numeric outcome, and `ByOutcome` in `Value` (1).

**S76. Redirection and reflection operators.** An incoming effect is re-pointed at a different creature
before it resolves. Two sub-forms that must not be one constructor: **redirection** moves an attack aimed
at *someone else* onto you with no change of parameters; **reflection** sends an effect back at its
originator, and the returning effect keeps the **original caster's** save DC, attack bonus, slot level and
spellcasting ability — four `ForeignField` reads, so a sheet must be able to *evaluate an effect whose
formula it does not own*.
`target:` the resolution target of a foreign effect · `shape:` `Retarget{from, to, preserveParams}` ·
`stack:` at most one per incoming effect; two is an authoring error · `gate:` G7, usually reaction-costed,
sometimes conditioned on a specific save result · `cadence:` per-use pool or C6.
*SRD:* a ring that, on a natural 20 on a save against a single-target spell of bounded level, makes the
spell target its caster instead using the caster's own parameters; a shield whose curse pulls ranged
attacks aimed at nearby allies onto the bearer.
**Tranche:** extends `Op` (2), and forces `ForeignField` (§2) from "auras only" to a general facility.

**S77. Outcome flip (a resolved result is reclassified after the fact).** A failed save becomes a
successful one — not a reroll (S53 changes the die and you take what you get), not a bonus die (S58
changes the number before classification), but a rewrite of the *classification* after resolution.
`target:` roll outcome · `shape:` `FlipOutcome{Fail → Success}` · `stack:` one flip per roll ·
`gate:` G7 reaction, usually spend-gated and scoped to a stated effect category ·
`cadence:` per charge, or C6.
*SRD:* a charged medallion that turns one failed save against a stated source-kind into a success and is
destroyed with its last charge; a ring that does the same for one category of saves. Why it is its own
operator: a flip is unconditionally sufficient, whereas any "equivalent" bonus is still bounded by the DC,
and the two diverge on a natural 1 or when the DC is unknown at bank time.
**Tranche:** extends `Op` (2); consumes from a `Pool` (3); renders as a `Term` marking the original
outcome `Superseded`, so §16.4's trace shows the flip rather than hiding it.

**S78. Sub-daily and multi-day cadences, and elapsed-time gating.** The most common cadence above the rare
tier is neither "per long rest" nor "at dawn" — it is a **real-time cooldown of arbitrary length**, an hour
to a year, sometimes randomised. Rests do not advance it, so a party that camps for a week is a different
case from one that takes two long rests.
`shape:` `Cooldown{ Value }`, the value possibly `Dice` (C10) · `gate:` unavailable while live ·
`cadence:` C9/C10.
*SRD:* an item usable once then not again for a stated number of days; a portal-cloth whose reuse interval
is a rolled number of hours; a pair of wings unusable again for a rolled number of hours after they fade.
The companion source is `TimeSince(event)`. *Generic:* a weapon whose penalty begins **at dawn on the day
after** its first attack roll — a gate reading a recorded timestamp, not a rest counter; and a hungry blade
that turns on its wielder if a stated number of days pass without a stated event, which is G4's upkeep
condition measured on a calendar rather than per round.
**Tranche:** `Pool.recharge` (3) gains a `Cooldown` rule; `Value` (1) supplies `Dice` intervals; §2 gains
`TimeSince`.

**S79. Banked whole-spell storage with frozen originating parameters.** A container holds **a cast spell** —
not a bonus die (S58), not an entitlement to cast (S48). Banked with it are the parameters of whoever put
it there: slot level, save DC, attack bonus and spellcasting ability all remain the **original caster's**
when a different creature releases it.
`target:` a level-denominated storage pool · `shape:` `Bank{ spell, frozenParams }`, capacity spent in
spell-level units · `stack:` capacity is a typed multiset (S72) — "three levels" may be one 3rd or three
1sts · `gate:` G3 while worn · `cadence:` none; it holds until released (C12-adjacent).
*SRD:* a ring and an orbiting stone that each store a few spell levels, cast later by the wearer but
resolved with the original caster's numbers; a rod that absorbs a spell's **energy** rather than the spell
and converts stored levels into slots for its holder — the same pool with a different release rule, which
is the argument for separating capacity from release.
**Tranche:** `Pool` (3) gains a level-denominated multiset with a payload; `Grant` (4) gains a release
entitlement. The sheet must hold and later **evaluate a spell whose casting parameters belong to no class
on it** — the same requirement S76 raises.

**S80. Per-use random table over heterogeneous payloads.** One activation rolls, and each bucket is a
**structurally different shape** — a scalar here, a grant there, a companion (S74), a permanent loss,
nothing at all. S50 establishes that a *choice* menu must hold heterogeneous shapes; this is that
requirement with the selector moved from the player to a die and the selection made per use, not per
binding (S52).
`target:` whatever the drawn bucket targets · `shape:` `RandomTable[ weight → Effect ]`, `Effect` being the
full effect union recursively · `stack:` per draw, independently · `gate:` G10 · `cadence:` per use.
*SRD:* a wand whose activation rolls on a long table of unrelated effects; a card deck whose draws
variously change an ability score, change alignment (S84), destroy carried property, instantiate a hostile
creature (S74) or grant an entitlement — several permanent and irreversible.
**Tranche:** extends `Grant`/choice (4) with a random selector, and requires the effect union to be
**recursively embeddable** — the real cost here, and worth paying once.

**S81. Involuntary compulsion (a constraint imposed on the owner).** G4's stance is entered and ended
voluntarily. This is its opposite: entered by **failing** a check, ended only on the effect's terms, and
while active it removes options rather than adding a modifier — a forced target, a forbidden action, an
attunement that cannot be ended.
`target:` action-availability predicates, not scalars · `shape:` `Constrain{ predicate }` ·
`stack:` several may hold at once and do not merge · `gate:` G11 · `cadence:` until its stated end.
*SRD:* a cursed axe forcing a save whenever its bearer takes damage and, on a failure, dictating the
bearer's action each round until a condition is met; a cursed blade whose bearer becomes unwilling to part
with it and **cannot end the attunement**. Engine consequence: §16.3's "a number plus conditional riders"
is not enough — the output type also needs a set of **active constraints**, which are neither.
**Tranche:** extends `Op` (2) with a non-numeric constraint, and §14 with G11.

**S82. Repeat-save-to-end.** The commonest duration idiom at this tier, and distinct from both G5 and G6:
the effect runs on a timer *and* its victim re-rolls a save on a stated schedule, ending it early on a
success. G5 puts the recurring obligation on the **emitter**; G6 is a pure clock; this puts a recurring
**exit roll** on the target.
`shape:` `RepeatSave{ ability, dc, schedule, onSuccess: End }` alongside a maximum duration ·
`gate:` G12 · `cadence:` the save's own schedule.
*SRD:* stun, blindness and paralysis riders on weapons and rods that all use "1 minute, save at the end of
each of your turns to end". *Generic:* a petrifying effect on the **one-shot** variant — a single repeat at
the end of the next turn, after which the condition worsens permanently. Two schedules of one shape; an
engine that hard-codes "each turn" gets the second silently wrong.
**Tranche:** extends the gating vocabulary (§14) and `TransientToken` (§16.3) with a save schedule.

**S83. Self-state toggle as a target.** Invisible, ethereal, incorporeal: not conditions, not senses, not
movement modes, not derivable from any scalar. They are membership in a small set of **self-states**,
toggled by their owner, with per-state break conditions that are data on the grant rather than properties
of the state.
`target:` self-state flag set · `shape:` `GrantMember{state}` with `breaksOn: [attack, cast, remove, …]` ·
`stack:` idempotent · `gate:` G2/G3 plus a toggle · `cadence:` C11 in several instances (S96) or C6.
*SRD:* a ring granting invisibility until its wearer attacks, casts, or ends it as a bonus action; a cloak
granting the same off a two-hour elapsed budget; plate granting an ethereal state for a fixed interval,
ending early if the armour comes off.
**Tranche:** extends `Grant` (4) with a membership target carrying its own termination predicate.

**S84. Alignment as a target and as a gate.** An enum on the sheet that published content both **reads**
(as an attunement precondition, and as a target-conditional in S63's sense) and **writes** (forcibly, on a
failed save or a random draw).
`target:` alignment enum · `shape:` `SetEnum` for the write, `Predicate` for the read ·
`stack:` last write wins · `gate:` G13/G3 for the read · `cadence:` —.
*SRD:* items attunable only by a creature of a stated alignment, or only by one whose alignment matches the
item's own; a talisman that damages by alignment band and destroys only opposed targets; a drawn card that
inverts both alignment axes and does nothing to a creature that has neither. Three mechanisms — an
acquisition precondition (S73), a target-conditional (S63) and an enum write — over one field, which is
why the field must exist rather than being a note.
**Tranche:** extends `Op` (2) with `SetEnum` on a new categorical target, and S73's precondition language.

### A.4 Single-instance oddities

Each appears once or twice in the corpus. They are recorded rather than generalised: each needs a name so
it cannot be silently mis-modelled as the thing it resembles, and none earns its own constructor family.
All extend `Op` (2) unless stated.

**S85. Per-effect immunity token.** Immunity keyed to **one effect instance**, not a damage type or
condition (S44), and expiring on a clock. `gate:` acquired by *succeeding* against the effect ·
`cadence:` C9. *SRD:* a summoned beast's fear aura a creature becomes immune to for 24 hours once it saves;
a creature-swaying effect that cannot be re-attempted on the same target for a stated period.
Extends `Grant` (4).

**S86. Contested roll (roll versus roll).** Resolution against **another creature's live roll** rather than
a static DC (S16); the sheet must expose "the check I would make" as a first-class output. *SRD:* opposed
Intelligence checks to seize control of a hovering annihilating sphere; an opposed check to sway a creature
another creature already controls. Extends the output type, not `Value`.

**S87. Shared-bonus reallocation across two targets.** One bonus as a **budget split at use time** between
two targets, re-decided each turn, persisting for a turn-relative window. `shape:`
`Allocate{ total: Value, across: Target[] }` · `cadence:` C1. *SRD:* a sword whose attack-and-damage bonus
may be moved wholly or partly to the wielder's AC until the start of their next turn. Not S28: this splits
across **sheet fields**, not across an effect's targets.

**S88. Co-attunement prerequisite and combined-set benefits.** Attunement gated on *other items* being worn
or attuned, plus benefits existing only while two attunements are held together. `gate:` a predicate over
R10's attuned set, evaluated continuously — dropping either item ends the attunement. *SRD:* a maul
attunable only while a specific belt and gauntlets are worn. *Generic:* a paired relic whose combined
block of benefits exists only while both halves are attuned to one creature. Extends S73 and R10.

**S89. Narrative-achievement tier unlock.** A gate whose predicate is a **recorded past event**,
permanently unlocking a further tier of the same item. `gate:` G13. *SRD:* a ring whose second property
block unlocks once its wearer has helped slay a creature of the linked plane; instructional tomes whose
benefits apply only after a fixed study period. The sheet's persistent state therefore includes **history
flags**, not only current values.

**S90. Recovery-restriction tag on a death or destruction outcome.** Which restoration magic can undo an
outcome is a property **of the outcome**, not of the character. *SRD:* a drawn card summoning a reaper
whose kills cannot be reversed at all. *Generic:* a soul-consuming blade whose kills are reversible only by
one named 9th-level spell. Rides on S75.

**S91. Escalating risk on repeated use.** A per-use failure or destruction probability that **grows with
use count** inside a window. `shape:` `Scale{UseCount(feature), ×k}` as a probability · `cadence:` resets
with the window. *SRD:* a fan with a cumulative per-reuse chance of tearing apart before dawn; a longevity
draught whose chance of inverting its own effect rises cumulatively per dose. Distinct from S31's flat
terminal risk, which does not escalate. Extends `Value` (1) via `UseCount`.

**S92. Active-condition cure versus future resistance.** Removing a condition **now** is not granting
immunity to it (S44); the two are worded alike and are different targets. *SRD:* a salve that ends a
current poisoned condition and cures a current disease, versus a pendant granting standing immunity to
both. Consumables cluster on the former, worn items on the latter.

**S93. Emitted light as a target.** Bright radius and dim radius are two independent scalars, adjustable,
dismissible, and read by other rules. *SRD:* a blade whose wielder steps its radii up or down in fixed
increments; a gem whose command word sheds a stated bright radius plus a further dim band until dismissed.

**S94. Cumulative aging.** Physical age as a mutable scalar with its own floor, written in both directions.
*SRD:* a draught reducing physical age by a rolled amount to a stated minimum, which on later doses may
instead **add** the same rolled amount (S91). `shape:` `Add{Dice}` + `ClampMin`.

**S95. Pool-spend cost discount.** A modifier on the **cost side** of a spend rather than on any effect
value, floored at zero. `shape:` `Add{−k}` on `spendCost`, `ClampMin{0}`. *Generic:* an item whose charge
costs drop by a fixed amount for a qualifying wielder; a focus letting one spell per day be cast at zero
slot cost. This is why §16.1's `Pool` needs `spendUnit` to be a `Value`, not a constant.

**S96. Event-triggered charge loss, and elapsed-time-denominated pools.** S37's mirror image: a pool that
**drains** on an event or on elapsed use rather than refilling. Two sub-forms — conditional spend, where
the charge is consumed only if the effect succeeded, and a continuous budget deducted in stated increments
while a state is active (C11). *SRD:* a blade losing a charge only when its instant-death effect actually
kills; a cloak with a two-hour invisibility budget deducted per minute of use and regaining a stated amount
per uninterrupted idle period; a candle whose burn time is deducted the same way and may be snuffed to
preserve the remainder. Makes `recharge: RechargeRule[]` symmetric with a `drain: DrainRule[]`.

**S97. Choice between two whole precomputed formulas at use time.** Not S17's substitution of one input:
the user picks between **two fully-formed bonuses the sheet already computes**, per use. *Generic:* a touch
attack resolvable with either the character's melee weapon attack bonus or their spell attack bonus, the
attacker choosing. `shape:` `PickFormula[ Value, Value ]`, choice at use time — S52's
re-choosable-on-each-use cadence applied to a formula rather than to a grant.

**S98. Snapshot of a foreign field at a trigger instant.** A value read off **another creature** and then
**frozen**; the source may cease to exist and the number persists. Distinct from S65, whose aura reads are
live. *Generic:* a weapon granting temporary hit points equal to a slain creature's hit point maximum on a
24-hour clock, and a critical hit dealing extra damage equal to half the target's hit point maximum,
computed once at the instant of the hit. `shape:` `Snapshot(ForeignField(c, f), atInstant)` (§2).
Extends `Value` (1).

### A.5 Cross-references added to existing shapes

S37 → S96 · S50 → S80 · S53 → S77 · S58 → S79 · S65 → S98 · G4 → G11 · G5/G6 → G12 · S73/R10 → S88.
These are scope notes only; no existing shape's definition changed.

### A.6 Adequacy statement (replacing the implicit caveat behind §17)

§17 stands as written and is not superseded — its four residual UNKNOWNs are unaffected by this pass, and
the item-provenance question it resolved is what made this validation possible at all. What this addendum
retires is the *implicit* claim underneath it: that S1–S73 were one more pass away from complete, with the
remaining pass being more of the same. That was wrong in a specific and instructive way. The missing
mechanisms were not further arithmetic shapes; the additive, multiplicative, override and scaling families
survived a 307-item corpus without a single new operator, and the four constructors of §16.1 absorbed the
rare and uncommon tiers essentially untouched. Everything this pass added is **non-numeric**: an outcome
that bypasses the number (S75), a re-target of someone else's effect (S76), a reclassification of a
resolved roll (S77), a clock that rests do not advance (S78), a banked effect carrying a foreign sheet's
parameters (S79), a die that selects between structurally unlike payloads (S80), a constraint that removes
options rather than changing values (S81), and a second creature that this engine should explicitly decline
to own (S74). The taxonomy is therefore now **adequate for the tranche-1 scalar engine and honest about its
boundary** rather than merely near-complete: §16.3's three surfaced-not-solved items grow to five, adding
active constraints (S81) and companion bindings (S74) to conditional riders, transient tokens and foreign
fields. The next pass that would change these conclusions is not another item corpus — it is a spell or
subclass corpus of comparable size, and the prediction this addendum is willing to be judged on is that
such a pass adds gates and lifecycles, not operators.

---

*SRD 5.1 and SRD 5.2.1 content referenced by name is © Wizards of the Coast, licensed CC-BY-4.0. This
document describes mechanics; it does not reproduce text.*
