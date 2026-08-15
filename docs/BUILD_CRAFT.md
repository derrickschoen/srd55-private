# BUILD CRAFT — public clean-room doctrine

Read this before specifying, validating, simulating, or comparing an SRD character build. This is a living set of safeguards, not a catalogue of builds.

## 0. What may be written here, and why this file is public

This document crosses the D59 licensing boundary only as a clean-room distillation. It contains independently worded methods, generalized mechanics patterns, and rules supported by the public SRD 5.2.1 corpus.

The following may cross into this file:

- generalized mechanics and arithmetic;
- verification and testing discipline;
- generic mistake-prevention patterns; and
- SRD 5.2.1 rules, each cited to a bundled source extract.

The following must remain private:

- any creator identity or publication identifier;
- any recognizable third-party build, including a class progression, ability array, or selection package reproduced as a unit;
- evidence or audit trails from private gates; and
- material available only from non-SRD rulebooks.

An outcome may be recorded without its private evidence. If a lesson cannot be stated without reconstructing a particular third-party work, omit it and record the omission as `Private per D59`.

### SRD 5.2.1 attribution

> This work includes material from the System Reference Document 5.2.1
> ("SRD 5.2.1") by Wizards of the Coast LLC, available at
> https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
> Commons Attribution 4.0 International License, available at
> https://creativecommons.org/licenses/by/4.0/legalcode.

## 1. Rule Zero — never state a rule from memory

Verification belongs to each rules claim, not to a document, heading, reviewer, or prior successful run.

1. Search `.ai/rules/INDEX.md` for an existing verified answer.
2. Use the repository's verified knowledge-base workflow when the answer needs independent readers.
3. If the answer is absent, inspect the appropriate `docs/srd/source/` extract and add a knowledge-base entry before relying on the rule.
4. Treat disagreement as unresolved. Read the cited material; do not average answers or prefer confidence over evidence.
5. Mark an unsupported statement `UNCERTAIN`. Absence from the knowledge base is a search result, not permission to guess.

The source was extracted from a two-column document. Plain text search can miss a phrase split by layout, hyphenation, or the neighboring column. Use `.ai/rules/srdgrep.py` for normalized searching, then inspect the cited extract in context. The layout warning is also embedded in affected source files, such as [docs/srd/source/class-core-traits.txt](srd/source/class-core-traits.txt).

Verification tests need two directions:

- a malformed or forbidden case that must fail; and
- a valid control that must pass, proving the guard does not over-refuse.

For field validation, mutate a complete record toward a well-formed but wrong value. Deleting a field proves only that absence is detected; plausible wrong values are the failures most likely to survive into production.

## 2. The completeness gate — a build spec is not a build

Completeness is a gate, not a score. A record that cannot be instantiated is not ready for legality review.

| Required declaration | Why it is load-bearing |
|---|---|
| Starting class | Initial class traits and later multiclass grants differ; use the separate source tables. [docs/srd/source/class-core-traits.txt](srd/source/class-core-traits.txt), [docs/srd/source/multiclass-entry-grants.txt](srd/source/multiclass-entry-grants.txt) |
| Background | Background choices include ability-score adjustments. [docs/srd/source/backgrounds.txt](srd/source/backgrounds.txt) |
| Species | Species traits can carry mechanical effects and limited-use features. [docs/srd/source/species-descriptions.txt](srd/source/species-descriptions.txt) |
| Ordered ability assignment | The chosen generation method and its arithmetic must be reproducible. [docs/srd/source/ability-score-generation.txt](srd/source/ability-score-generation.txt) |
| Level order | Multiclass prerequisites are checked when a new class is entered. [docs/srd/source/multiclassing.txt](srd/source/multiclassing.txt) |
| Every offered choice | Class features can require explicit choices; unstated choices must not receive credit. [docs/srd/source/sheet-math.txt](srd/source/sheet-math.txt) |
| Spell-to-class association | Prepared spells and spellcasting ability are determined per class. [docs/srd/source/multiclassing.txt](srd/source/multiclassing.txt) |
| Round-by-round routine | Action contention, setup costs, triggers, and depletion need an explicit timeline. |
| Allowed sources and deviations | Public SRD rules must remain distinguishable from house rules and unavailable material. |
| Per-encounter output | A day average alone hides front-loading and exhaustion. |

Apply gates in this order:

1. schema completeness;
2. legality against cited rules; and
3. simulation or scoring.

A variant is a separate record. An unresolved alternative inside one record makes its legality and output indeterminate.

## 3. Composition arithmetic that is routinely got wrong

Write the arithmetic before interpreting it.

For shared multiclass spell slots, add every qualifying full spellcasting level and half the qualifying Paladin and Ranger levels, rounded up as directed, then look up the resulting level on the multiclass table. Warlock is not included in that enumeration; do not silently count Pact Magic as shared-slot progression.
[docs/srd/source/multiclassing.txt](srd/source/multiclassing.txt)

Keep these related quantities separate:

- available slot levels come from the combined-slot calculation;
- prepared spells are determined for each class at that class's level;
- a higher-level slot does not itself grant a higher-level prepared spell;
- each prepared spell retains its class association and uses that class's spellcasting ability; and
- cantrip scaling and proficiency bonus use total character level unless the rule says otherwise.

All five points are stated in the multiclass rules.
[docs/srd/source/multiclassing.txt](srd/source/multiclassing.txt)

Do not merge things merely because they share a label. Extra Attack features from multiple classes do not stack, and alternative Armor Class calculations are choices rather than additive bonuses.
[docs/srd/source/multiclassing.txt](srd/source/multiclassing.txt),
[docs/srd/source/attack-class-features.txt](srd/source/attack-class-features.txt),
[docs/srd/source/unarmored-defense.txt](srd/source/unarmored-defense.txt)

Finally, distinguish initial traits from multiclass-entry grants. A later class provides only its stated multiclass traits plus the applicable class features; copying its entire initial trait row over-grants proficiencies.
[docs/srd/source/multiclass-entry-grants.txt](srd/source/multiclass-entry-grants.txt)

## 4. Action economy

Create a ledger for every round before calculating output:

| Budget or condition | Record |
|---|---|
| Action and Bonus Action | the effect used, its source, and any displaced option |
| Reaction | the trigger, availability, range, and assumed opportunity rate |
| Concentration | the maintained effect and the event that can replace or end it |
| Spell slots and limited uses | the exact pool and cost |
| Movement and positioning | the distance or geometry assumption |
| Other creatures | a separate turn, command cost, duration, and stat source |

SRD features explicitly attach effects to actions and Bonus Actions, and Extra Attack changes attacks within the Attack action rather than creating another turn. Preserve those labels in the ledger.
[docs/srd/source/attack-class-features.txt](srd/source/attack-class-features.txt),
[docs/srd/source/class-core-traits.txt](srd/source/class-core-traits.txt)

Apply these generalized gates:

1. Two effects competing for the same action label cannot both occupy the same
   ledger slot without an explicit rule permitting it. [docs/srd/source/attack-class-features.txt](srd/source/attack-class-features.txt)
2. An additional attack is not automatically an additional action, and a
   changed modifier or damage die is not automatically another attack. [docs/srd/source/attack-class-features.txt](srd/source/attack-class-features.txt)
3. A reaction is conditional on its trigger and opportunity; capacity alone is
   not expected output. [docs/srd/source/spell-descriptions.txt](srd/source/spell-descriptions.txt)
4. Effects requiring concentration must be checked together, not as an
   independent list of always-on benefits. Spell records state concentration in
   their duration fields. [docs/srd/source/spell-descriptions.txt](srd/source/spell-descriptions.txt)
5. Give each summon, companion, or familiar its own ledger rather than treating
   its activity as the character's extra action. [docs/srd/source/spell-descriptions.txt](srd/source/spell-descriptions.txt)
6. Charge setup in the round where it occurs.
7. Never spend one attack, hit, slot, die, trigger, or action twice merely
   because two features refer to it.

A legal setup can still reduce total output when the remaining encounter is too short to repay its opportunity cost. Show both the setup round and the later payoff instead of reporting only the steady-state round.

Private per D59: corpus frequencies, mined examples, and private audit evidence.

## 5. Resource cadence across the adventuring day

Model the declared day, not only the best round. Give every resource a record with capacity, unit cost, recovery event, legal frequency, action cost, and fallback. SRD features distinguish recovery after Short and Long Rests, so the recovery clause must be read per feature rather than inferred from the resource name. [docs/srd/source/class-core-traits.txt](srd/source/class-core-traits.txt)

For `E` equal-length encounters of `R` rounds and a pool of `U` uses:

- a Long-Rest pool has a ceiling of `U / (E × R)` uses per round; and
- a Short-Rest pool with `S` completed Short Rests has a ceiling of
  `U × (S + 1) / (E × R)` uses per round.

These are mathematical upper bounds, not promised output. Triggers, action contention, encounter endings, and unused capacity can lower delivery. If encounter lengths vary, divide by the actual total `ΣRₑ`.

Always show:

1. the exact round or event where each pool runs dry;
2. the round-by-round curve, not just its average;
3. the assumed rest schedule;
4. throughput limits imposed by the action ledger;
5. both costs of any resource conversion;
6. the at-will or genuinely refreshing fallback; and
7. a range or refusal when enemy behavior controls the opportunity.

Do not compare one record's best encounter with another record's whole-day average. Label prepared-ground ceilings separately from ordinary initiative starts, and do not flatten a discrete nova into fractional uses unless the reported quantity is explicitly a long-run expectation.

Private per D59: mined routines, private gate evidence, and corpus-derived examples.

## 6. Measured and judged are different kinds of number

`MEASURED` means produced by a declared reproducible model. `JUDGED` means an assessment. A composite containing either judgment or an imputed value remains judged and must be labeled that way.

Comparisons require a common basis: target profile, target count, geometry, enemy behavior, encounter lengths, rest schedule, setup policy, and source version. Where a supported component is unavailable, preserve `unavailable` or report a range; never let it become numeric zero through composition.

When hand calculation and simulation disagree, check in this order:

1. basis and target assumptions;
2. probability distributions and conditional triggers;
3. critical-hit and saving-throw branches against their cited source rules;
4. resource cadence and action contention;
5. explicit setup rounds;
6. internal rounding; and
7. source-version mismatch.

Compare unrounded internal values and round only for display. Compare ceilings with ceilings and floors with floors. Never publish a supported subtotal as whole-record output, and never average signed residuals in a way that allows an overestimate to cancel an underestimate.

## 7. The mistake register

Private per D59: individual mistakes, concrete builds, and their audit trails.

### The seven patterns that may cross

1. **Use an independent reader.** Authors reliably miss errors in their own framing; make second-reader review part of the process.
2. **Distrust recall and mental arithmetic.** A remembered rule may belong to a different source version, while arithmetic can lose a rounding or recovery term. Reopen the cited rule and write the equation.
3. **Audit summaries against their calculations.** A correct calculation can be summarized incorrectly when only its upside or headline survives.
4. **Make decisions representable.** If the schema has no field for a required choice, the omission becomes invisible rather than resolved.
5. **Apply every gate to its author.** Run the same completeness, legality, and evidence standard against the governing work before imposing it elsewhere.
6. **Evaluate inherited material claim by claim.** Old detail may be wrong while an abstract structure remains useful; wholesale acceptance and wholesale rejection both discard necessary review.
7. **Classify blockers precisely.** Distinguish missing implementation, an intentionally judged axis, missing model state, unavailable public rules, and true illegality before deciding what to do.

## 8. Keeping this document alive

1. Add a generalized prevention pattern when a new rules or modeling error is found; keep identifying evidence private when D59 requires it.
2. Give every SRD rule claim a link to `docs/srd/source/<file>`. Otherwise mark it `UNCERTAIN` until verified.
3. Correct the governing knowledge entry first, then search for the stale claim everywhere it may have propagated.
4. Record a clean-room omission as `Private per D59` rather than laundering it into vague prose.
5. Execute every guard, including its self-test when provided.
6. Preserve both an invalid mutation and a valid control.
7. Re-run the clean-room lint after every change to this document.

## Provenance

This public document is an independently worded distillation under D59. It contains public SRD mechanics and generalized engineering practice only. Third-party identities, build configurations, private evidence, and non-SRD material are withheld.
