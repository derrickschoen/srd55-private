# Armor Class, items, and one effect vocabulary

Binding law: **D69** (weapons and armour carry NO provenance — cited because §1
builds on those two tables and a reader will otherwise wonder where their source
lineage went; verified no conflict, since "worn armour" as a tie-break category is
identified structurally, not by provenance), **D72** (items are things, effects are
the one vocabulary), **D73**
(resolver + proficiency), **D74** (a broken condition excludes outright), **D75**
(a shield changes the base), **D76** (warn only on a strict reduction), **D79**
(armadillo, not turtle), D33, D35, D49, D67, D7.

## 0. What is true now, each read rather than recalled

- **`armorClass` already exists** — `src/rules/sheet.ts:770` — taking
  `{ armor?, shield?, scores, adjustment? }` and returning a result with
  warnings. **It has exactly ONE caller**, `character-sheet-builder.ts:540`.
  **Its signature cannot hold this unit's problem**: there is no parameter for a
  LIST of competing formulas with per-candidate eligibility and tie-break
  metadata. This is a **replacement of its input and internals**, not an
  extension. Pre-alpha licenses that; the plan says it so nobody implies
  continuity that is not there.
- **Its own comment names the gap this unit closes** (`sheet.ts:754-759):
  *"WHAT THIS DOES NOT MODEL, and says so rather than guessing: Unarmored Defense
  (Barbarian, Monk) and any other class feature offering an alternative
  calculation… The manual adjustment is the honest escape hatch until it is."*
  **D72 is the "until it is."**
- **The sheet already discloses it** — gap kind `no_unarmored_defense`, titled
  *"Unarmored Defense is not calculated"* (`character-sheet-builder.ts:409-412`).
  When this unit lands, that disclosure is **DELETED, not reworded**.
- **HALF a precedent ships, and revision 1 claimed the whole thing — an F27
  error in the section that exists to prevent F27 errors.** `sheet.ts:791-793`
  does `Math.max` over two worn-armour candidates, so **highest-wins is real**.
  Its comment says *"the better of the two is used and stated"* — and **nothing is
  stated**: I enumerated the warning codes emitted inside `armorClass` and there
  are exactly two, `armor_slot_mismatch` and `strength_requirement_unmet`.
  Neither says a tie happened or which candidate won. **The "and stated" is a
  sentence addressed to a source reader, not behaviour.** So: highest-wins
  extends a shipped pattern; **the disclosure D67/D73 require is entirely new
  work**, and AC-B must be scoped as building it, not wiring up something that
  already talks.
- **`character_effects` has four kinds** — `damage_resistance`, `hp_modifier`,
  `speed`, `ability_increase` — with kind-scoped nullable payload columns,
  `source_instance_id`, and a `label`. The CHECK is closed, so new kinds are a
  migration. *(Revision 7: true when written; AC-1 landed at `0f099bb` and the
  live schema now has NINE kinds. Kept because §1's design reasoning starts
  from this state.)*
- **`hp_modifier` already carries `hit_points_flat` AND `hit_points_per_level`.**
  The Armadillo Paladin's *"+3, and +1 whenever you gain another paladin level"*
  is **one existing row with no new schema.**
- **`character_sheet_adjustments.armor_class_adjustment`** is a single integer
  ±20 with a free-text note and **no source**.
- **There is no attunement anywhere.** Zero matches for `attun` in
  `src/db/schema.sql`. `character_items` and its attunement flags are entirely new.
  *(Revision 7: `character_items` now ships — AC-1, snapshot `a7-v10`, wire v8.)*
- **(Revision 5, after AC-1 landed at `0f099bb`.) The attunement gate has no
  input, and four revisions of this plan ran AC-ATTUNEMENT without asking what
  it reads.** AC-1 shipped exactly the row shape §1 specified — name,
  description, `requires_attunement`, `attuned`, `source_instance_id` — and
  **none of those fields links an item to the effects it grants.** The
  implementer saw this and severed the link *on purpose*, documenting it at
  `db/schema/items.ts:23-33`: inventing a link its own dispatch does not
  populate would be schema slack. Correct in isolation. But the only remaining
  link is `source_instance_id`, and `items.ts:79-88` states the common case
  defeats it: hand-added items — the common case — carry NULL there, and so do
  their hand-added effects. A shared `label` is severed by design and not
  unique. **So for the common case, "an unattuned item requiring attunement
  grants nothing" has nothing to read**, and AC-ATTUNEMENT was a control whose
  mechanism appeared zero times in the plan — the identical miss revision 4
  caught for `named_features`, one section over.
- **(Revision 6.) The candidate audit refuses what restore accepts, and AC-1
  widened the gap.** Verified by probe, not by reading: `rowContractError`
  refuses a pre-AC-1 `character_effects` row (`probe.ability: Invalid input`)
  and accepts the same row after `fillAddedNullableRowColumns`; the audit's
  save-point loop applies that fill **only for `character_weapons`**
  (`candidate-audit.ts:669`), while restore (`character-state.ts:484`) and
  backup validation (`character-backup.ts:296`) apply it for every table. So
  an imported image whose save points predate B2 or AC-1 fails the audit that
  quarantine runs, on rows restore itself would take. Pre-existing since B2's
  three columns; AC-1 made it eight. **Fixed as its own dispatch, not
  deferred to AC-2** — it is a live inconsistency in shipped code.
  *(Merged at `1fedac1`, negative-controlled.)*
- **(Revision 7, from the round-2 review — nine findings, all accepted, the
  four load-bearing ones re-verified in the tree before this revision was
  written.)** The biggest: "widen three CHECKs" was a third of AC-2's real
  size — the template tables cannot STORE the new payloads, `named_features`
  is the optional-features table and cannot mean Monk/Barbarian Unarmored
  Defense, the item FK inverts an insertion order three import paths share,
  and three of AC-1's nine kinds had no consumer anywhere in the plan. §10
  is restructured: AC-2 became AC-2a and AC-2b, AC-5 exists, and two more
  controls got mechanisms. The pattern across seven revisions holds: every
  round found a control or dispatch whose mechanism appeared zero times in
  the document.
- **A SUBCLASS CANNOT WRITE AN EFFECT ROW AT ALL, and revisions 1 and 2 built the
  headline fixture on the assumption that it could.** Verified: `subclass_features`
  has `effect_kind` CHECK'd to **`'extra_attack'` only**, read live at sheet-build
  time and **never copied into `character_effects`**. The only files mentioning
  both tables are generated contracts. And `INSERT INTO character_effects` appears
  at exactly **three** sites — `guided-creation.ts:1116` (the species-template
  copy), `guided-creation.ts:1586` and `level-up-class.ts:238` (both hand-written
  `ability_increase`). **So §9's Armadillo Paladin — `hp_modifier` +3/+1-per-level
  AND `armor_class_formula` 10+CON+CHA — has no mechanism to exist**, and neither
  does §9's "collision fixture that matters most". Species have a template-copy
  path; subclasses have nothing. **This is AC-2 and it was unbudgeted.**
- **AND THE SAME GAP EXISTS ONE LEVEL UP, WHICH REVISION 3 MISSED WHILE
  CONGRATULATING ITSELF ON FINDING IT.** `named_features` — the BASE-CLASS
  feature table, where **Monk and Barbarian Unarmored Defense actually live** —
  has the identical shape: `effect_kind` CHECK'd to `'extra_attack'` only
  (`schema.sql`), read live, and its only `INSERT` is the catalog seeder at
  `sheet-srd.ts:545`, never a per-character effect row. **Verified, including
  that the word `named_features` appeared ZERO times in this document before
  this revision.**

  That is worse than an omission. **Monk/Barbarian Unarmored Defense is the
  motivating example this plan quotes in §0** from `sheet.ts:754-759`, **and the
  Monk-with-a-shield case is §2's flagship worked example and `AC-SHIELD-BASE`'s
  entire fixture.** The plan's headline demonstration had no mechanism, in a
  revision whose headline finding was that another fixture had no mechanism.
  Three rounds of review found the subclass half; only the third found this half.
- **A phrasing overclaim from revision 3, corrected:** it said the only files
  mentioning both `subclass_features` and `character_effects` are generated
  contracts. `schema.sql` and six whole-schema invariant tests also do. They
  enumerate every table mechanically, so the finding stands — but the sentence
  was wrong and is not left standing.

## 1. The shape (D72)

`character_armor` and `character_weapons` **stay** — they carry dex caps, stealth
disadvantage, strength requirements, damage dice, mastery, range. A shield is
`character_armor.slot = 'shield'` and gets no table.

**`character_items` is new**: name, description, `requires_attunement`,
`attuned`, `source_instance_id`. **No `ac_change`, no `to_hit_change`, no
`flat_damage_bonus`** — D72 rejected that; every future modifier would be a new
column and one "+1 AC" would wear three shapes.

**Every numeric change is a `character_effects` row.** New kinds:

| kind | payload | covers |
|---|---|---|
| `armor_class_bonus` | `amount` | Cloak of the Armadillo, Ring of Shell |
| `armor_class_formula` | `base`, `ability_1`, `ability_2`, `allows_shield` | Monk, Barbarian, Armadillo Paladin (10+CON+CHA), Armadillo species (13+DEX) |
| `attack_ability_override` | `ability`, `weapon_scope` | Pact of the Blade |
| `weapon_attack_bonus` | `amount`, `weapon_scope` | +1 weapon |
| `weapon_damage_bonus` | `amount`, `weapon_scope` | flat damage |

## 2. The resolver — eligibility first, value second

**PINNED, per D74 and D75, in this order:**

1. **The floor always exists**: `base 10, ability_1 dexterity, allows_shield true`,
   eligible whenever unarmoured. Without it, excluding every formula leaves the
   sheet with no Armor Class at all.
2. **Evaluate CONDITIONS.** Wearing armour breaks *"while you aren't wearing
   armour"*. Carrying a shield breaks a formula whose `allows_shield` is false.
3. **Discard ineligible formulas OUTRIGHT** — not scored low, not tie-break
   losers. **A lower total is a legitimate outcome** and the app honours it.
4. **Highest total wins** among what remains.
5. **Tie-break: worn armour → species → subclass → class → item, then
   alphabetically by label.** *Not* by acquisition order: `source_instance_id` is
   **remapped on import** (D62 clones), so an id-ordered tie would break
   differently in a clone than in the original — the same character with two
   Armor Classes. This ordering is stable under remapping, which is the property
   that matters.
   **Where each category comes FROM (revision 7 — it was asserted, not
   derivable):** worn armour is structural; item is `character_item_id`
   (revision 5); class and subclass read the effect's `source_instance_id`'s
   source kind. **Species could not be derived at all**: the guided copy
   writes `source_instance_id = NULL` literally (`guided-creation.ts:1116`),
   leaving only the severed label. AC-2a changes that copy to carry the
   species source instance. A row with NULL source and NULL item is
   **manual, and ranks after item**, which revision 4's list omitted.
6. **Bonuses and the shield apply on top of the winner** — they are not in the
   competition. But **the shield is part of step 2**, so equipping one can lower
   the base while adding +2.

**The worked case that catches a wrong implementation** (D75): Monk, DEX +3,
WIS +3. No shield → Monk 16 beats the floor 13, **AC 16**. Shield → Monk formula
excluded, floor 13 wins, +2 shield, **AC 15**. A resolver that adds +2 to the
winning base without re-running eligibility reports **18**.

## 3. Proficiency (D73)

**Proficiency does NOT gate an effect; it changes consequences.**

- **Armour you are not proficient with STILL GIVES ITS AC.** Withholding it
  would be a wrong number, which D33 forbids more strongly than an unwelcome one.
  **That half is settled and not in question.**
- **RESOLVED, and revision 2's "BLOCKED" was over-cautious — the answer already
  ships.** `armor_not_trained` (`multiclass-proficiency.ts:366-372`) already
  prints: *"X is [a Shield | category] armor, and no class this character has
  trains them in it. The Armor Class below still counts it — recording it is
  allowed — but training is a requirement the table will want to apply."* That
  satisfies D73's substance exactly — the AC is not withheld, the existence of a
  requirement is stated, nothing is recited from memory — and it is computed from
  `character_armor` via `characterProficiencies`, a path **orthogonal to the new
  resolver**. **Taken for now: AC-B reuses it unchanged and invents nothing.**
  *Cost to flip:* one message if the owner wants D73's fuller wording, which
  would then need the F4 exception blessed explicitly. The background, kept
  because it is the reason this is a decision rather than an oversight: D73 — which I wrote — tells the sheet
  to state *"Disadvantage on any D20 test using Strength or Dexterity and an
  inability to cast spells."* **That text is not in `docs/srd/source/`**, and the
  codebase already refuses to print it, deliberately:
  `multiclass-proficiency.ts:354-362` — *"THE SENTENCE STOPS AT WHAT IS SOURCED…
  the only 'Disadvantage' in `armor-table.txt` is the Stealth column of seven
  specific rows… Reciting the penalty from memory is the one thing this
  application is built not to do (F4), and D26 leaves the adjudication to the
  table anyway."* I verified all of it: 28 files in `docs/srd/source/`, none
  covering equipment or general rules.

  So **a decision I recorded today instructs a violation of a shipped principle
  with an F-number behind it.** Three ways out, none of which a dispatch may pick
  on its own: state it anyway as a named exception the owner blesses; keep the
  existing softer shape (*"no class of theirs trains this; the Armor Class still
  counts it"*) and treat D73's wording as intent rather than text; or add the
  missing SRD source first. *(Revision 7: the taken-for-now above IS the
  answer — the second way out, the existing softer shape, D73's wording read
  as intent. This paragraph stays as the background that makes it a decision;
  it no longer blocks AC-B. Cost to flip is still one owner message.)*
- A weapon you are not proficient with loses the proficiency bonus — **already
  built and already proven**: `tests/browser/weapons.spec.ts` asserts a Wizard's
  Greatsword loses it and *both screens say so*, and `attack-profiles.ts:40`
  records a past bug where the label and the number disagreed. **That is the
  standard: label and number must agree.**
- **Attunement is a separate gate.** An unattuned item requiring attunement grants
  nothing. Both gates are checked; neither is confused for the other.
  **What the gate reads (revision 5):** a new **nullable
  `character_effects.character_item_id`**, added by AC-2's migration —
  composite `(character_item_id, character_id)` reference onto
  `character_items`, the same cross-character guard `source_instance_id`
  carries, `ON DELETE CASCADE` so deleting the cloak deletes its +1 (an item is
  the character's own row, not a source; tombstoning does not apply). The gate:
  an effect whose owning item has `requires_attunement = 1 AND attuned = 0` is
  **excluded**; an effect with NULL `character_item_id` is untouched. Nullable,
  so it rides `ADDED_NULLABLE_ROW_COLUMNS` without a snapshot bump.
  **The gate is for every effect reader, not AC (revision 6).** Effects are
  read independently at `ability-contributions.ts:108`,
  `character-sheet-builder.ts:576` (hp/speed/resistance) and `origins.ts:275`;
  an AC-only join suppresses the cloak while an unattuned amulet still adds
  HP. AC-3 defines ONE eligible-effects predicate and routes every mechanical
  consumer through it. Its SQL must be NULL-safe explicitly: under
  three-valued logic a naive `NOT (requires_attunement AND NOT attuned)`
  drops the NULL-joined rows the gate is defined to leave untouched.

## 4. What the sheet says

- **The excluded formula and its reason, always** (D74, D75): *"Armadillo Shell
  (13 + DEX) does not apply while you are wearing armour."* A number that falls
  when a person picks something up is indistinguishable from a bug otherwise.
- **A tie that was broken**, naming winner, loser and rule (D73).
- **The non-proficiency fact**, via the **existing** `armor_not_trained`
  warning — not a new sentence, and not the SRD penalty text (§3).
- **`no_unarmored_defense` is DELETED** — the disclosure's reason expires.
- **`strength_requirement_unmet` MUST SURVIVE the rewrite**, named here because
  the function carrying it is being replaced wholesale and this unit introduces
  new armour that triggers it (Shell Plate, Carapace Mail). Revision 1 never
  mentioned it and a silent loss was the likely outcome.
- **A PRE-EXISTING disagreement this unit must not inherit.** That warning says
  *"so their speed is reduced by 10 feet"*, and the printed speed
  (`character-sheet-builder.ts:601-608`) reads `character_species.base_speed_feet`
  with **no subtraction**. The number and the sentence already contradict each
  other — the exact defect class `attack-profiles.ts:40` records, where a label
  said "not proficient" while the number still added the bonus. **Pinned: either
  the speed applies the penalty or the warning stops claiming it.** Choosing
  silently is what produced the original bug.
- Under **D67** these are reveal content for Armor Class; under **D70** an owed
  choice is a gap. Different surfaces, and §7's trap keeps them apart.

## 5. The warning (D76)

**Predicate: `new total < previous total`. Strictly less.** Not "a formula was
excluded", not "the tie-break moved", not "the base changed while the total held.
A tie is not a reduction **even when the tie-break flips the winner**. Warn,
never block, never auto-swap.

## 6. `armor_class_adjustment` is retired

A single integer ±20 with a note and **no source** cannot answer D67's reveal, and
leaving it beside the effects layer is two mechanisms for one rule. **Taken for
now: retired into an `armor_class_bonus` effect carrying its note as the label.**
*Seam:* one column, one migration. *Cost to flip:* keep the column as a labelled
effect source.

## 7. The traps

**Trap 1 — ranking by value before checking conditions.** Passes every
higher-is-better test. Fails only D74's lower-AC-in-armour case and D75's
Monk-with-shield case.

**Trap 2 — wiring the warning and the disclosure to one predicate.** Wire the
disclosure to the warning's predicate and every tie silently loses its
explanation. Wire the warning to the disclosure's predicate and it cries on every
tie. **They share the resolver's output and nothing else.**

**Trap 3 — a second effect vocabulary for items.** D72 rejected it by name. One
rule in two places is F22, which has already bitten this project.

## 8. Controls

- **AC-ELIGIBILITY** — mutate the resolver to rank before filtering. Must fail:
  an Armadillo-species character **in light armour** shows the armour's total, not
  the higher unarmoured formula.
- **AC-SHIELD-BASE** — mutate the shield to a late addend. Must fail: the Monk
  with a shield is **15, not 18**. **(Revision 7: buildable after AC-1 + AC-3
  with a raw-inserted `armor_class_formula` row — AC-1's schema accepts a
  complete row today, and this file's controls already seed effects raw. The
  revision-4 claim that it needs AC-2 confused representing a Monk formula
  with PRODUCING one; the production path gets its own integration test in
  AC-2a, not this control.)**
- **AC-FLOOR** — mutate the floor away. Must fail: a character whose only formula
  is excluded still has an Armor Class.
- **AC-TIE-STABLE** — mutate the tie-break to order by `source_instance_id`. Must
  fail: a **clone** (D62) resolves the same tie the same way as its original.
  **(Revision 7: a naive clone does NOT make this mutant fail — export and
  import both preserve canonical order, so remapped ids usually keep their
  relative order. The fixture must CONSTRUCT the inversion: acquire the two
  tying sources in one order, tombstone-and-reacquire so the original's id
  order and the clone's canonical import order disagree, and assert both
  characters resolve alike. If ids never invert, the control proved nothing.)**
- **AC-WARN-STRICT** — mutate the warning to fire on exclusion. Must fail: a tie
  with a flipped winner **does not warn** while the sheet **still explains** the
  exclusion. One mutation, both halves asserted. **(Revision 7: this control
  follows AC-B, not the post-AC-3 controls dispatch — the warning needs a
  before-and-after pair no command result carries today, and AC-B owns the
  preview mechanism that supplies it.)**
- **AC-PROFICIENCY** — **retargeted; revision 2's version asserted the blocked
  text as a MUST.** Mutate non-proficient armour to withhold its AC. Must fail:
  **the AC still applies, and the existing `armor_not_trained` warning is
  present.** It asserts a warning that ships today, not a sentence nobody has
  agreed to write.
- **AC-ATTUNEMENT** — mutate the attunement gate away. Must fail: an unattuned
  item requiring attunement grants nothing. **The fixture asserts all four
  states (revision 6)** — required+unattuned excluded, required+attuned
  included, not-required+unattuned included (Ring of Shell), NULL
  `character_item_id` included — because against the exclusion alone, an
  implementation that drops EVERY item-owned effect passes the control.
- **AC-ONE-VOCABULARY** — mutate an item to carry its own `ac_change` column.
  Must fail: the resolver reads effects only. **(Revision 7, pinned: an unused
  column breaks nothing. The mutant stores the fixture's +1 ONLY in the new
  column, writes no effect row, and teaches the resolver to read it. Must
  fail: the fixture's AC keeps the +1 through the mutation — proving the test
  asserts the vocabulary, not just the number.)**

**Every fixture must make its mutation observable.** A character whose armoured
and unarmoured totals are equal cannot exercise AC-ELIGIBILITY; a Monk with DEX +0
cannot exercise AC-SHIELD-BASE.

**When each control becomes buildable.** This codebase's resolver tests seed
`character_effects` with raw INSERTs (`ability-contributions.test.ts:44`), so most
controls need only **AC-1 + AC-3** and can use seeded rows rather than the
production copy path. `AC-PROFICIENCY` is buildable **today** — `armor_not_trained`
already ships. **`AC-SHIELD-BASE` needs AC-2**, because a Monk formula cannot be
represented at all — not even as a seeded row — until `named_features`' CHECK is
widened. **`AC-ATTUNEMENT` also needs AC-2** — `character_item_id` does not
exist until its migration lands, so before AC-2 the control cannot fail for the
right reason (revision 5). That ordering is load-bearing, not convenient.

## 9. Fixtures (D79 names)

**Armadillo species** — `armor_class_formula` base 13, DEX, allows shield.
**Armadillo Paladin** — `hp_modifier` flat 3 / per-level 1, **plus**
`armor_class_formula` base 10, CON, CHA, allows shield.

Shell Plate (heavy), Carapace Mail (medium, DEX capped 2), Scute Wrap (light),
Shell Shield; Cloak of the Armadillo (+1 AC, attunement), Ring of Shell (+1 AC,
none — proves attunement is not required for an effect to exist), Staff of the
Armadillo (weapon **and** +1 AC — one thing, two effects), Armadillo Blade
(+2 damage), Pact Shell Blade (`attack_ability_override` CHA, self-scoped),
Amulet of the Burrow (`hp_modifier` flat +5), Band of Growth (per-level +1).

**The collision fixture that matters most:** Armadillo species **+** Armadillo
Paladin **+** Shell Shield **+** Cloak of the Armadillo, unarmoured — two
formulas, a shield and a flat bonus at once.

**Licensing:** all ours, so committing is fine under D59 — the test is
authorization and we are the author.

## 10. Dispatches — recounted every revision, because the count keeps being wrong

Revision 2 said two; revision 4 said four plus AC-B; **revision 7 says six plus
AC-B**, after the round-2 review measured AC-2 and found it was three
dispatches wearing one name. AC-1 has shipped (`0f099bb`).

- **AC-1 — SHIPPED.** Five new effect kinds, `character_items`, migration 0013,
  wire v8, snapshot `a7-v10`. The audit-fill defect its review surfaced was
  fixed separately (`1fedac1`).
- **AC-2a — FEATURE PRODUCTION (class, subclass, species).** The revision-5/6
  version said "widen three CHECKs" — but the CHECKs are the small half:
  **the template tables cannot STORE the new payloads.**
  `species_template_trait_effects` carries only damage/HP/speed columns
  (`origins.ts:316`); `subclass_features` and `named_features` carry only
  `effect_attack_count`/`effect_weapon_scope` (`catalog-classes.ts:332,488`),
  and `enums.ts:809` RECORDS the decision that a second class-feature kind
  requires child effect tables before content uses it. AC-2a honours that
  record rather than re-litigating it:
  - `subclass_feature_effects` and `named_feature_effects` — child tables
    mirroring `species_template_trait_effects` (the shape the trait inversion
    already established), each carrying the full effect payload set including
    the five AC-1 columns; the inline `effect_*` columns on their parents are
    retired the way the trait inversion retired theirs;
  - `species_template_trait_effects` widened with the five new payload columns
    and their kind-scoped CHECKs;
  - **a new automatic-class-feature shape** — `named_features` is EXPLICITLY
    the optional/conditional table (`catalog-classes.ts:419`,
    `sheet-content-lookup.ts:220`): auto-copying it would hand Thirsting
    Blade to every level-5 Warlock. Monk and Barbarian Unarmored Defense are
    AUTOMATIC and revision 4 was wrong to put them there. They get
    `class_feature_effects` (class_definition_id, class_level, name, payload),
    copied at class sync;
  - **generated-row identity**: a new nullable
    `character_effects.template_ref` (TEXT, e.g.
    `class_feature_effects:12`), NULL on every hand-written row. Re-sync
    deletes and re-copies ONLY rows whose `template_ref` is non-null and whose
    source instance belongs to the class being synced — the ASI rows sharing
    that `source_instance_id` (`level-up-class.ts:238`) have NULL
    `template_ref` and are untouchable. **Generation happens ONLY in
    commands; import NEVER invokes the generator** — share import already
    regenerates class/subclass SOURCES (`character-share.ts:1500`) and then
    carries effect rows verbatim, and a generator that also ran on import
    would duplicate every generated effect;
  - **the species copy carries its source**: `guided-creation.ts:1116` writes
    `source_instance_id = NULL` today; AC-2a passes the species source
    instance so §2's tie-break can tell species from manual;
  - an integration test proving the production path end-to-end: seed a
    template, sync, level, re-sync — one row, correct payload, ASI intact.
- **AC-2b — ITEM AND WEAPON OWNERSHIP, AND PORTABILITY.** After AC-2a, one
  migration and one wire mint carry everything:
  - `character_effects.character_item_id` (revision 5: composite reference,
    cascade, unique target index on `character_items (id, character_id)`,
    child-side index) and `character_effects.character_weapon_id` on identical
    terms — `one_bonded_weapon` cannot identify a weapon today
    (`enums.ts:780`), and without the column the three weapon kinds AC-1
    minted have no resolvable target;
  - **insertion order, NOT capture order**: restore, backup import and share
    import all insert effects before items today (`tables.ts:1210`,
    `character-state.ts:654`, `character-backup.ts:1967`,
    `character-share.ts:1950`), which the new FK inverts. Capture order is
    stable output and part of what `equalValues` compares — it does NOT move.
    AC-2b introduces a dependency-safe INSERT order distinct from capture
    order, and items/weapons insert before effects there;
  - backup import remaps `character_item_id`/`character_weapon_id` through
    `maps.character_items`/`maps.character_weapons` exactly as
    `source_instance_id` is remapped;
  - **wire v9**, minted once, carrying `itemRef`, `weaponRef` and
    `template_ref` in the effect tuple — v8 is frozen (D41) and is not
    amended;
  - **the item-add command** (revision 6): transactional, inserts the item
    first and its effect rows with the returned id;
  - comment truth: `DELETE_ORDER`'s "childless leaf" comments
    (`tables.ts:1230-1256`) and the superseded `items.ts:23-33` paragraph;
  - the cascade-chain integration test (source → item → effects, one DELETE).
- **AC-3 — the AC resolver and the gates.** Eligibility-then-value, the
  tie-break with §2's category derivation, the floor, proficiency and
  attunement — the attunement gate as ONE eligible-effects predicate every
  mechanical consumer routes through (revision 6), NULL-safe explicitly.
  Carries `strength_requirement_unmet` forward. **Needs AC-2a AND AC-2b.**
- **AC-5 — weapon effects into attack profiles.** `AttackProfileInput`
  accepts no effects today (`attack-profiles.ts:261`), so
  `attack_ability_override`, `weapon_attack_bonus` and `weapon_damage_bonus`
  have NO consumer — the +1 weapon and Pact Shell Blade fixtures the owner
  asked for cannot produce their numbers without this dispatch. Routes the
  same eligible-effects predicate (attunement gates a sword's +1 exactly as
  it gates a cloak's), resolves `one_bonded_weapon` via
  `character_weapon_id`, and keeps the label-and-number-agree standard
  `attack-profiles.ts:40` records. After AC-3.
- **AC-4 — retiring `armor_class_adjustment`**, all 21 references, migrating
  non-null values into `armor_class_bonus` effect rows. After AC-3, for the
  reason revision 4 gives. **Revision 7 pins the two edge rows the CHECKs
  refuse**: `amount` forbids zero (`origins.ts:881`) and `label` is NOT NULL,
  while a stored adjustment can be zero and its note can be null
  (`sheet-inputs.ts:328`). Disposition: a zero adjustment produces NO effect
  row — it changes no number, and D60 applies to its orphaned note, which the
  migration logs and drops; a null note becomes the label
  `Manual Armor Class adjustment`.
- **AC-B — the surfaces**: exclusion reasons, tie disclosure, deletion of
  `no_unarmored_defense`, the fixtures, and **the strict-reduction warning's
  mechanism, pinned (revision 7)**: commands return void and their results
  carry only inverse/revision/replay (`sheet-inputs.ts:176`,
  `character-command-executor.ts:43`), and a later read cannot reconstruct
  the previous total — so the warning is a PREVIEW: the surface runs the
  resolver on current state, applies, runs it again, and compares. Nothing
  persisted, replay untouched, D76's tie rule enforced where the pair exists.

Controls get their own dispatch after AC-3, per `ec2be58`'s precedent —
except AC-WARN-STRICT, which follows AC-B (§8), and AC-2a's production-path
proof, which lives inside AC-2a as an integration test.

## 11. NOT in this unit

Score-**setting** items (Belt of Giant Strength) — `ability_increase` is additive
with a cap and cannot say *"your Strength is 21"*; an `ability_override` kind is
its own decision and is **open with the owner**. General inventory for
non-modifying possessions (a rope, a potion) — **also open with the owner**; D65's
"gear is not itemised" stands until then. Conditions, rests, current hit points
(D26). The D67 reveal surface itself.
