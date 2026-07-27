# ANSWERED 2026-07-26 — see D22. The model is INVERTED, not extended.
# BUILT on branch `feat/effects`. The question below is kept for its evidence.

The owner's answer: effects belong to the CHARACTER and the trait is
provenance. A trait granting two effects stops being a special case, and
`character_source_instances` already answers 'where did it come from'.

WHAT SHIPPED, AND WHERE IT DIVERGED FROM THE "RECOMMENDED IF YES" BELOW:

 - `species_template_trait_effects` is a child of the TRAIT, as recommended.
   The character side is NOT `character_species_trait_effects`: it is
   `character_effects`, keyed on `character_id` with a nullable composite
   reference to `character_source_instances`. Keying it on the trait would
   have kept every effect species-scoped, which is the coupling D22 removes.
 - `granted_spells` was DELETED from the vocabulary rather than carried over.
   It was a marker with no payload and no production consumer; the spells come
   from `species_definitions.grant_rules` through `src/grants/`, and
   `SpellAccessBuilder` already reports them with provenance. Removing it is
   what DISSOLVES this question's worked example: Fiendish Legacy stops being a
   two-effect trait and becomes a plain untyped `damage_resistance`.
   `src/rules/legacy-trait-effects.ts` keeps the retired member readable in
   every artifact already in the wild and drops it on the way in.
 - THE SHARE WIRE FORMAT WAS NOT A BLOCKER, which this question assumed it
   would be. The root tuple has grown 11 -> 12 -> 13 -> 14 with the version
   pinned at 1; effects are a fifteenth root element on the same terms, and
   `tests/unit/sharing/codec.test.ts` freezes a hand-built fourteen-element
   link proving the old shape still decodes and still imports its payload.
 - The `KNOWN GAP` test is REWRITTEN, not renamed: it now asserts the Tiefling's
   resistance IS recorded, and it was proved able to fail by deleting the
   effect declaration and the derivation branch in turn.

The "Related, and separate" note at the foot still stands untouched: no
`species_definitions` row is seeded, `active_from_class_level` cannot follow a
character's level for a non-class source, and neither was in scope here.

---

# Q — A species trait can carry TWO mechanical effects; the model holds one

Raised by the `feat/origins` adversarial review. It is a limit of the model D12
defined, so it is an owner call rather than something to patch under review.

## The fact

`species_template_traits.effect_kind` is ONE column. The Tiefling's
`Fiendish Legacy` carries two effects at once, and the source says so in the
trait's own paragraph:

- `docs/srd/source/species-descriptions.txt:202-206` — "Choose a legacy from the
  Fiendish Legacies table. **You gain the level 1 benefit of the chosen
  legacy.** When you reach character levels 3 and 5, you learn a higher-level
  spell."
- `:233-238` — every legacy's level-1 benefit is **a Resistance plus a cantrip**
  (Abyssal/Poison, Chthonic/Necrotic, Infernal/Fire).

So the trait grants a damage resistance AND spells. The column records
`granted_spells`, and the resistance is recorded nowhere.

## Why it matters, and why it is not just untidy

The Dragonborn's `Damage Resistance` names its type no more specifically —
"the damage type determined by your Draconic Ancestry trait" — and IS modelled,
as `damage_resistance` with a null type, surfacing as
`unchosenDamageResistances: 1`. Two structurally identical traits, two different
answers: a Dragonborn's sheet says they resist something, a Tiefling's says
nothing. That is the failure mode D12 named — "no sheet quietly showing the
wrong speed" — pointed at resistance.

Nothing consumes either value today; the class-sheet track's derivation does not
exist yet. So this is wrong-in-waiting, not wrong-on-screen.

## What was NOT done, and why

- **Not swapped** to `damage_resistance`. That trades a silent resistance for a
  silent spell grant. One line, and it only moves which half is invisible.
- **Not remodelled** into a set of effects per trait. That is two new tables (or
  a new column set) on both the catalog and character sides, plus a change to a
  POSITIONAL share wire format whose version is deliberately pinned at 1
  (`src/sharing/codec.ts:32`), plus backup, contracts and the generated schema.
  Doing that unannounced in a review cycle, against a model the owner defined
  and while another track is mid-flight in the same contracts file, is the
  "patch it blindly" outcome.

The gap is instead made loud: stated in `speciesTraitEffectKinds`
(`src/domain/enums.ts`), at the seed site (`src/rules/origins-srd.ts`), and
pinned by a failing-if-forgotten test named `KNOWN GAP: the Tiefling's
resistance is recorded nowhere` in `tests/unit/rules/species-effects.test.ts`.

## The question

Should a species trait carry a SET of mechanical effects rather than one?

Recommended if yes: a child table per side (`species_template_trait_effects`,
`character_species_trait_effects`) holding `(trait_id, effect_kind, payload
columns)`, moving the five payload columns off the trait row. It keeps the
closed compile-checked set and the per-kind CHECK constraints exactly as they
are, and it is the only shape that does not need a second answer when the next
two-effect trait appears. Cost: two tables, a share wire-format change, and the
backup/contract updates that follow.

Recommended if no: say so, and the Tiefling's resistance stays trait text
permanently — in which case the `KNOWN GAP` test should be reworded from a
pinned defect into a recorded decision.

## Related, and separate

`granted_spells` grants nothing at all today — no `species_definitions` row is
seeded, so no species `character_source_instances` row exists. Wiring it needs
more than a seed: the level 3/5 gates are `active_from_class_level` rules, and
`SourceRuleReader.classLevelForSource` (`src/grants/source-rule-reader.ts:198`)
resolves a level for a non-class source only from a `class_level` value
configured on the instance — a static number, which cannot follow a character's
level as it rises. That is its own piece of work.
