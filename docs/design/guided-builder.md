# Level-1 guided character builder

Status: design only. This document describes the first guided build and the
shape needed for the committed per-level follow-up. It does not change the
current character, rules, or catalog models.

## Decisions this design treats as fixed

This design applies D11 and all seven parts of D42; it does not reopen them.
In particular:

- the ordinary creation path cannot persist a character until it has a class;
- the wizard replaces the character-list name form;
- species and background precede class, ability scores precede equipment, and
  spell choices that can change an attack precede equipment;
- the builder records weapons and armour, not packs, foci, tools, or money;
- a later class addition recomputes the proficiency union and adds
  recommendations without replacing equipment; and
- eligibility and fit are separate outputs. Eligibility can disable a choice.
  Fit can only annotate and order an eligible choice.

Sources: `.claude/decisions.md:556-725` (D42) and
`.claude/decisions.md:4350-4393` (D11).

There is one important vocabulary qualification. D28 records that anybody may
carry a weapon and that a non-proficient weapon remains recordable outside the
builder; the consequence is loss of the proficiency bonus, not an ownership
ban (`src/rules/multiclass-proficiency.ts:23-27`,
`src/rules/multiclass-proficiency.ts:331-338`). In this document, “unavailable”
means “not selectable as the guided class kit.” It must never be worded as
“your character cannot own or use this.” The existing free-form weapons and
armour panels remain the tolerant path.

## Recommended architecture

### A level event, not a creation form

Use one ordered step engine for both creation and later levels:

```text
BuildRun
  mode: "create" | "level_up"
  target_character_level: 1..20
  class_event:
    | { kind: "initial_class"; class_definition_id }
    | { kind: "increase_class"; class_definition_id }
    | { kind: "add_class"; class_definition_id }
  steps: StepState[]
```

Each step has `applicable`, `complete`, `readModel`, and `submit` operations.
Creation-only origin steps return `applicable = false` during level-up. Class
skills, spell choices, ability changes, and kit review are repeatable steps
whose obligations are derived for the target level. Do not fork a separate
level-up form.

The build run need not be a portable character table. Before the first class is
chosen, keep the draft in memory and versioned session storage. A main-path
database row does not yet exist. On the class submission, one transaction
creates the character root, copies the chosen origins, and adds the starting
class at level 1. `UpdateClassCommand` already knows that the first inserted
class is the starting class and creates its class source at acquired character
level 1 (`src/commands/update-class.ts:142-207`).

After that transaction the route becomes
`/characters/:id/build/levels/1`. Every persisted intermediate state has a
class, so closing the tab can leave an incomplete character but cannot create a
class-less one. Step completion should be re-derived from character state and
the completeness query where possible; session storage is navigation state,
not the authority after materialisation.

This is deliberately not “create a blank row, then hide it.” The current
`CharacterCrud.create` inserts only a name and relies on six default scores of
10 (`src/queries/character-crud.ts:73-82`,
`db/schema/character.ts:56-67`). That operation remains the escape hatch, not
the guided entry point.

## Step sequence

“Writes” below names the durable result, even where a missing work item must
first provide the writer.

### 0. Identity and draft

Repeatable for level-up: **no**.

Reads:

- no character row;
- the current name rules: non-blank and at most 120 Unicode code points
  (`src/queries/character-crud.ts:57-64`);
- any version-compatible creation draft in session storage.

Writes:

- draft `name`;
- no database data.

Complete when:

- the trimmed name is non-empty and the stored name is at most 120 code points.

The primary character-list action becomes “Build a character” and opens this
step. The current inline form at
`src/ui/screens/character-list/character-list.ts:232-275` is removed from the
main path.

### 1. Species

Repeatable for level-up: **no**. It remains editable later in the workspace,
but is not a per-level grant.

Reads:

- the nine `species_templates` and their ordered trait/effect children. Nine is
  the complete bundled SRD set (`db/schema/origins.ts:113-126`);
- `size` and `alternate_size`; Human and Tiefling are the two bundled
  two-size cases (`db/schema/origins.ts:154-168`);
- any structured sub-choice catalog added by the work below.

Writes:

- before class selection: the template content key and choices into the draft;
- when class materialises the character: value copies in `character_species`,
  `character_species_traits`, and `character_effects`, following the existing
  copy helpers (`src/rules/origins.ts:14-39`, `:175-258`);
- the species source instance and its grant slots when the selected species
  grants spells.

Complete when:

- one species is selected;
- a size is selected when `alternate_size` is present;
- every structured, mechanically relevant species choice is resolved.

The last condition cannot be implemented honestly yet. Elf, Gnome, and
Tiefling lineage choices are currently retained only inside trait text
(`src/rules/origins-srd.ts:47-56`), while Dragonborn and Tiefling resistance
types are represented only as nullable, outstanding effect values
(`db/schema/origins.ts:621-632`). The UI must not claim “Species complete” merely
because a template was copied.

### 2. Background

Repeatable for level-up: **no**.

Reads:

- exactly four bundled backgrounds: Acolyte, Criminal, Sage, and Soldier
  (`docs/srd/source/backgrounds.txt:12-25`);
- the background’s three ability names, feat, two skills, tool text, and two
  printed equipment alternatives
  (`db/schema/origins.ts:774-829`);
- structured background equipment lines, but only to carry any weapon or armour
  forward to the later equipment step.

Writes:

- before class selection: background content key in the draft;
- when class materialises the character: a value copy in
  `character_background`;
- fixed background skill proficiencies and the origin-feat/source grant once
  those writers and provenance are available;
- no ability values and no equipment yet.

Complete when:

- one of the four SRD background templates is selected.

The background’s ability allocation is deliberately deferred to step 5 and its
mechanical equipment to step 7. Tool selection, packs, foci, clothes, and money
are displayed as “not tracked by this app” and do not gate completion. The
source says a background gives two specified skills
(`docs/srd/source/backgrounds.txt:54-64`); the current character skill table is
a flat set with no source provenance
(`db/schema/sheet-inputs.ts:270-282`), so applying those skills is missing work,
not a text-to-enum guess to hide in the UI.

### 3. Class for this level

Repeatable for level-up: **yes**.

Reads:

- `class_definitions`;
- the selected class’s `class_sheet_traits`, skill options, saving throws,
  armour training, and weapon proficiencies
  (`db/schema/sheet.ts:105-187`, `:245-321`, `:324-461`);
- for a later added class, the `granted_on_multiclass_entry` subsets and
  multiclass skill count/pool rather than the full starting row
  (`db/schema/sheet.ts:155-184`, `:345-368`, `:414-448`);
- for a later added class, the structured primary-ability requirements of the
  new class and every current class;
- for a later level in an existing class, the current class level.

Writes:

- creation: atomically creates `characters`, origin value/source rows, and one
  `character_class_levels` row with `level = 1` and
  `is_starting_class = true`;
- level-up: either increments an existing class or adds a new class through the
  existing class command path.

Complete when:

- creation has exactly one selected starting class at level 1;
- level-up has one selected class event and the resulting total level is at
  most 20. The command already enforces class and total levels 1..20
  (`src/commands/update-class.ts:104-121`);
- an `add_class` event meets the score-13 primary-ability requirements for the
  new class and every current class. The SRD states this at
  `docs/srd/source/multiclassing.txt:20-25`. This is a future level-up
  obligation, not level-1 completion, and it is blocked by the D27 collision
  listed under missing work.

Before submission, the UI may say “Class undetermined.” After submission, no
ordinary route may render or save a class-less character. The class choice is
also the materialisation boundary: if the transaction fails, no partial
character is retained.

### 4. Class-granted choices

Repeatable for level-up: **yes**, whenever the class event creates an
outstanding choice.

Reads:

- for the starting class, `skill_choice_count`,
  `skill_choice_from_any`, and `class_skill_options`;
- all eighteen skills when `skill_choice_from_any = true`. Zero option rows for
  Bard means “all eighteen,” not “none”
  (`db/schema/sheet.ts:141-153`, `:292-302`);
- for an added class, `multiclass_skill_choice_count` and
  `multiclass_skill_choice_pool`;
- already-held skill proficiencies.

Writes:

- chosen rows in `character_skill_proficiencies`, with provenance once that
  model exists.

Complete when:

- the required number of distinct, eligible skills has been selected.

Use the recently landed multiclass picker as the interaction precedent, not as
a one-off component. It puts only `available_skills` in the select, uses a
placeholder, disables an empty pool, and submits a command rather than editing
the query model (`src/ui/screens/planner/completeness.ts:14-69`). Its query
already implements “any” as all eighteen and a class list as the seeded option
rows (`src/queries/character-completeness.ts:778-815`).

The exact SRD rule for collisions between fixed background skills and a later
class skill choice is not in the committed extracts. The current unique
destination prevents storing the same skill twice, but database uniqueness is
not an SRD justification. Until that source is extracted, exclude already-held
skills as the current multiclass picker does and state that limitation; do not
invent a replacement-choice rule.

### 5. Ability scores and background increases

Repeatable for level-up: **yes**, with two modes:

- level 1: enter base scores and allocate the background increases;
- later level: apply only an ability change actually granted at that level.

Reads:

- all six draft/current scores;
- the selected background’s three eligible ability names;
- the class’s primary-ability statement as guidance;
- the hard storage range 1..30
  (`db/schema/character.ts:80-95`).

Writes:

- all six final values in `characters`;
- enough allocation provenance to prove the background’s increase rule rather
  than merely observing the final totals.

Complete when:

- all six base scores are explicitly entered;
- the player allocates either +2 to one listed background ability and +1 to a
  different listed ability, or +1 to all three;
- none of those increases raises a score above 20.

That allocation rule is verbatim in
`docs/srd/source/backgrounds.txt:45-50`. The repository has no committed extract
for rolling, standard array, or point buy. Therefore v1 can accept manual base
scores, but it cannot label any generation method “SRD-valid” or enforce a
point budget. Adding such a method requires its own source extract.

The final six scores alone cannot prove how the background bonuses were
allocated. The current background row stores only the three eligible names
(`db/schema/origins.ts:1017-1026`). Allocation provenance is missing work.

### 6. Spell and attack-cantrip choices

Repeatable for level-up: **yes**, when the class/source grant system produces
new required slots.

Reads:

- the active spell selection slots generated for the chosen class and other
  sources;
- eligible spells from the bundled catalog and imported catalogs;
- the completeness result for required, unfilled choices;
- recognised access to True Strike and Shillelagh by content key, including the
  “right name under an unknown key” reported state
  (`src/rules/attack-cantrips.ts:4-27`, `:141-208`).

Writes:

- ordinary spell-slot selections through the existing command path.

Complete when:

- all required level-1 permanent selections are filled according to the
  completeness policy. Prepared lists retain their existing policy: partial
  under-fill is allowed, but a wholly empty required prepared group is
  outstanding (`src/queries/character-completeness.ts:271-285`);
- the equipment step can distinguish known, not known, and unrecognised-key
  states for both attack cantrips.

This is not a second spell picker. Reuse the existing eligibility, slot,
command, and completeness models. The bundled spell catalog is now parsed from
spell descriptions plus eight independent class-list extracts
(`src/rules/spells-srd.ts:8-53`).

### 7. Weapons and armour

Repeatable for level-up: **yes**.

It is always present at level 1. At a later level it is applicable when:

- an ability score changed;
- a class was added; or
- a new feature/spell changed how a weapon attack can be made.

Reads:

- final ability scores;
- the proficiency grants actually received by this character. The starting
  class contributes its full rows; later classes contribute only rows flagged
  for entry; the result is a union
  (`src/queries/class-proficiency-lookup.ts:161-193`,
  `src/rules/multiclass-proficiency.ts:8-21`);
- weapon and armour templates;
- class starting-equipment options and their mechanical item rows once added;
- selected background package mechanical items, if any;
- recognised True Strike/Shillelagh access and the future Pact weapon state;
- existing character weapons and armour during level-up.

Writes:

- copied value rows in `character_weapons` and `character_armor`;
- never a pack, focus, tool, clothing item, or currency row;
- during level-up, only explicit additions/removals the player confirms.

Complete when:

- the player has reviewed the available kit and explicitly confirmed either
  the selected weapons/armour or “keep/no equipment”;
- every selected guided item is in the guided eligibility set;
- any exact class-package choice has a selected option label.

There is no sourced minimum number of weapons or armour pieces. D42 says the
builder helps equip the character, not that every build must store one of each.
Consequently “reviewed and explicitly kept none” is complete; silently skipping
the step is not.

For an added class, show new recommendations alongside existing gear. Do not
preselect removal and do not overwrite a row. The owner’s Sorcerer/Cleric
example depends on the multiclass-entry union: Cleric entry adds Light, Medium,
and Shields (`docs/srd/source/multiclass-entry-grants.txt:46-52`), whereas the
starting Sorcerer has no armour training
(`docs/srd/source/class-core-traits.txt:249-269`).

### 8. Review and enter the workspace

Repeatable for level-up: **yes**.

Reads:

- the completion result of every applicable step;
- warnings and catalog gaps, kept separate from outstanding player choices in
  the same manner as the existing completeness UI
  (`src/ui/screens/planner/completeness.ts:111-147`).

Writes:

- no new domain facts; it marks the local run finished and navigates to the
  character workspace.

Complete when:

- every applicable blocking obligation is complete;
- non-blocking suggestions and warnings have been displayed but need not be
  “fixed.”

## Blocking rules and their sources

| Builder rule | Source | Behaviour |
| --- | --- | --- |
| Do not persist through the guided path before a first class is selected. | D42 §1–2, `.claude/decisions.md:561-596` | Identity/origin state remains a draft. Class submission creates the valid aggregate transactionally. |
| Name is non-blank and no longer than 120 code points. | Existing application contract, `src/queries/character-crud.ts:57-64`; not an SRD rule. | Continue is disabled and submission repeats server validation. |
| SRD-guided species come from the nine bundled rows. | `db/schema/origins.ts:113-126` | Homebrew is not invented in the SRD picker. Import and later manual editing remain tolerant. |
| A two-size species requires one of its two printed sizes. | `db/schema/origins.ts:154-168` | No default should silently turn every Human or Tiefling into the first size. |
| SRD-guided backgrounds are only Acolyte, Criminal, Sage, and Soldier. | `docs/srd/source/backgrounds.txt:12-25` | Do not show the twelve unlicensed PHB backgrounds. |
| Background increases are +2/+1 to different listed abilities or +1/+1/+1, and cannot raise a score above 20. | `docs/srd/source/backgrounds.txt:45-50` | Invalid allocations are disabled with the printed requirement. |
| Every stored ability score is an integer 1..30. | Application/database contract, `db/schema/character.ts:80-95`; the level-1 generation method is not sourced. | Reject outside the range. Do not infer standard array or point-buy legality. |
| Creation class level is 1; resulting total level cannot exceed 20. | `src/commands/update-class.ts:104-121` | The command is the final enforcement point. |
| Adding a new class requires a score of at least 13 in the new class’s primary ability and those of every current class. | `docs/srd/source/multiclassing.txt:20-25` | Future level-up rule: disable submission and name every unmet ability. This cannot ship until the D27 text-only collision is resolved. |
| Starting-class skill count and pool are the seeded count plus class options; Bard’s `from_any` means all eighteen. | `db/schema/sheet.ts:141-153`, `:292-302`; Bard source at `docs/srd/source/class-core-traits.txt:41-65` | Continue requires the exact number of distinct eligible choices. |
| Added-class skill choices use the entry count and entry pool, not the starting count. | `db/schema/sheet.ts:155-184`; source examples at `docs/srd/source/multiclass-entry-grants.txt:33-40`, `:111-131` | Reuse the multiclass outstanding-choice read model. |
| Guided armour is limited to categories in the actual starting/entry proficiency union. | Seeded rows and entry flags at `db/schema/sheet.ts:324-380`; union reader at `src/queries/class-proficiency-lookup.ts:90-193` | Unavailable cards state the missing training. The manual panel can still record them and warn. |
| Guided weapons are limited to proficiency rows in that same union, including Monk Light and Rogue Finesse-or-Light qualifiers. | Source at `docs/srd/source/class-core-traits.txt:145-169`, `:223-247`; evaluator at `src/rules/multiclass-proficiency.ts:57-139` | Evaluate bundled qualifiers. An unknown imported qualifier is “eligibility cannot be established,” not guessed true or false. |
| A required spell choice must satisfy the existing slot eligibility. | Existing slot/completeness system, `src/queries/character-completeness.ts:343-396` | Keep invalid choices unavailable and keep catalog gaps separate from player omissions. |
| A class starting package must be one of its printed labels and must copy only its declared mechanical rows. | `docs/srd/source/class-core-traits.txt`; Fighter proves labels are not binary at `:139-143`. | This rule cannot ship until the missing class-equipment catalog exists. |

No committed source says that a proficient character owns a weapon, that every
level-1 character must take a weapon, that a “Dex build” begins at a particular
score, or that one weapon is globally better than another. Those are not
blocking rules.

## Kit suggestions

### Produce two results

The kit query returns two independent fields per card:

```text
eligibility:
  | { state: "available"; via: string[] }
  | { state: "unavailable"; requirement: string }
  | { state: "unknown"; reason: string }

fit:
  | { state: "recommended"; reasons: string[] }
  | { state: "alternative"; tradeoffs: string[] }
  | { state: "magic_dependent"; reasons: string[] }
```

Only `eligibility` controls the input’s disabled state. `fit` controls badges,
explanatory text, and default ordering. This type separation prevents a future
CSS or filtering change from turning “suboptimal” into “forbidden.”

### Armour ranking

For each available body-armour template, compute the AC from its stored base,
Dexterity mode, cap, and the character’s Dexterity modifier. Those facts come
directly from the armour table
(`docs/srd/source/armor-table.txt:9-27`) and are already derived exhaustively in
`src/rules/sheet.ts:819-862`.

Recommend the highest-AC available rows whose printed Strength requirement is
met. If a higher-AC row misses its Strength requirement, keep it available and
show the existing sourced warning; do not disable it
(`src/rules/sheet.ts:804-812`). Stealth disadvantage is a visible tradeoff, not
an automatic loser. When equal AC rows differ on stealth, show both rather than
claiming the app knows the player’s priority.

Show Shield as a separate available recommendation when the proficiency union
contains `shield`. Do not currently block it based on a selected Two-Handed
weapon: the committed extracts list the property but do not contain its rule
text (`src/rules/attack-profiles.ts:23-26`).

### Weapon ranking

Use D42 §5’s owner-provided heuristic, and label it as advice:

- if Dexterity is higher than Strength, put Finesse and ranged templates in the
  recommended group;
- if Strength is higher, put Heavy and Versatile templates in the recommended
  group;
- on a tie, show both groups as alternatives and choose no winner.

The template has the needed Finesse, Heavy, range-group, and Versatile facts
(`db/schema/weapons.ts:293-336`). The normal attack formulas are sourced as
Strength for melee and Dexterity for ranged, subject to weapon-property rules
(`docs/srd/source/sheet-math.txt:66-79`). However, the Finesse, Thrown,
Versatile, Heavy, and Two-Handed rule texts are not committed
(`src/rules/attack-profiles.ts:18-26`). D42 authorises the high-level heuristic;
it does not justify finer claims such as “this is 12% better,” an optimal
damage ranking, dual-wield compatibility, or shield compatibility.

Within one recommendation group, preserve printed class-package order and then
catalog order. Do not silently select the largest damage die: weapon mastery,
reach, loading, hands, range, and player intent make that preference unsourced.

### Magic-dependent weapon note

Show an amber “Relies on …” badge, never a lock, when all of these are true:

1. the weapon is available in the guided kit;
2. its normal Strength/Dexterity fit is worse than an available magical attack
   ability; and
3. the character actually selected a feature that applies to that weapon.

For True Strike, the source changes the attack and damage ability to the
spellcasting ability and requires a proficient weapon worth at least 1 CP
(`docs/srd/source/weapon-attack-cantrips.txt:10-29`). For Shillelagh, it applies
only to a held Club or Quarterstaff and substitutes the spellcasting ability
for Strength (`docs/srd/source/weapon-attack-cantrips.txt:31-54`). Access must
come from `recogniseAttackCantrips`; matching a display name is forbidden
(`src/rules/attack-cantrips.ts:22-27`).

“Only makes sense” has no SRD threshold. The proposed transparent heuristic is
“the applicable magical ability modifier is strictly greater than the best
ordinary ability modifier.” That is a product guess. Put the exact comparison
in one pure policy function and test boundary ties so the guess is at least
consistent and replaceable.

Pact of the Blade cannot participate yet. The repository stores only the
unresolved text “Level 5+ Warlock, Pact of the Blade” for a different optional
feature (`db/schema/catalog-classes.ts:469-484`). It has no invocation
selection, no selected pact weapon, and no structured ability substitution
(`src/rules/extra-attack.ts:47-60`).

### UI language

Use three visually and semantically distinct presentations:

- **Recommended for your current scores** — coloured recommendation badge,
  normal enabled input, short reason;
- **Available alternative** — normal enabled input, optional tradeoff note;
- **Not available in the guided kit** — disabled input plus the exact missing
  proficiency/training requirement and a link-like sentence: “You can still
  record custom or non-proficient gear in the workspace.”

Selecting an available alternative must leave “Continue” enabled. Its note
must not use “invalid,” “illegal,” or an error colour. The review screen lists
recommendations under “Suggestions,” not under “Problems” or “Outstanding.”
Magic-dependent notes use a fourth, amber treatment and name the spell/feature.

## Missing work, split into implementation dispatches

Estimates are relative: **S** is a focused change (roughly 0.5–1 day), **M** is
several connected files and tests (2–4 days), **L** crosses schema/content/UI
and portability (about 1–2 weeks), and **XL** is a new reusable domain track
(multiple weeks). These are guesses, not measured estimates.

1. **Repeatable build route and step engine — M.** Replace the character-list
   form with `/characters/new`, define the level-event/step contracts, keep the
   pre-class draft in versioned session storage, and resume post-class runs by
   deriving completion from character state.

2. **Transactional guided materialisation — M.** Add one command/RPC operation
   that creates the character, copies selected origins, and invokes the initial
   class update in one transaction. Prove rollback at every sub-write. Do not
   call the current blank `CharacterCrud.create` and patch the class afterward.

3. **Origin application writers and source bridge — L.** Production code has
   value-copy helpers, but no complete picker/writer that copies species,
   traits, effects, background, and matching source instances/grants together.
   The schema itself says the second half of picking a species “was designed
   and never built” (`db/schema/origins.ts:646-661`).

4. **Structured species sub-choices — L.** Model Elf/Gnome/Tiefling lineage,
   Dragonborn ancestry, Goliath ancestry, Human choices, alternate size, and
   their mechanical consequences as declared catalog choices copied to
   character selections. The present parser explicitly leaves lineage choices
   inside prose (`src/rules/origins-srd.ts:47-56`). Split this further by
   species during dispatch; do not ship a “complete” step that handles only
   nullable resistance types.

5. **Skill provenance and origin/class application — L.** Add provenance to
   character skill selections (origin, starting class, multiclass entry, other)
   and make backup/share/snapshot/undo carry it. This closes the known
   under-reporting in multiclass completeness
   (`src/queries/character-completeness.ts:90-109`) and makes background/class
   collision handling testable once its SRD source is extracted.

6. **Background ability-allocation provenance — M.** Represent base scores and
   the chosen +2/+1 or +1/+1/+1 allocation, or represent an equivalent
   immutable level-1 ability event. Final totals alone cannot validate the
   choice. Include portability and later edits.

7. **Ability-generation SRD extract — S per supported method.** Extract and pin
   the actual SRD text before implementing standard array, rolling, or point
   buy. Until then the design supports explicit manual base scores only.

8. **Resolve the primary-ability decision collision — S design decision, then
   M if structure is approved.** The Core Traits extract contains the
   primary-ability field (for example Fighter at
   `docs/srd/source/class-core-traits.txt:121-125`), and the multiclass rule
   makes it a blocking prerequisite
   (`docs/srd/source/multiclassing.txt:20-25`). D27 nevertheless binds the
   primary-ability expression to text only
   (`.claude/decisions.md:2974-2977`), and the bundled class seeder currently
   does not even write the existing text column
   (`src/rules/class-progression-lookup.ts:305-339`). Do not silently override
   D27 in implementation. Obtain an owner ruling on whether the committed
   level-up wizard amends it. If approved, retain the printed text and add a
   typed expression: Fighter’s “Strength or Dexterity” is an `any_of`, while
   multi-ability requirements need an `all_of`; evaluate the expression for
   both the new class and every current class.

9. **Class starting-equipment catalog — L.** Extract every full class option,
   including continuations missing from the present narrow extract. Add an
   option table keyed by class and `option_label: string`, plus ordered
   mechanical item rows referencing weapon/armour templates. Keep the whole
   printed option text as passthrough. Do not use a boolean A/B column: Fighter
   prints “Choose A, B, or C”
   (`docs/srd/source/class-core-traits.txt:139-143`). GP is an untracked text
   line, not a `coin` kind, per D40.

10. **Reconcile the existing background equipment shape with D40 — M.** The
    current schema still contains `item_kind = coin` and `coin_copper`
    (`db/schema/origins.ts:918-930`, `:968-987`) even though D40 dropped coin as
    a kind. Do not copy that obsolete limb into class equipment. Replace it
    before sharing a generic package-item model.

11. **Equipment projection and commands — M.** Query class/background packages,
    copy only weapons and armour to character value rows, and apply a reviewed
    delta transactionally. Reuse the established value-copy pattern; never
    retain a live template reference
    (`db/schema/sheet-inputs.ts:72-88`,
    `db/schema/weapons.ts:288-291`).

12. **Persist weapon attack kind for repeatable recommendations — M.** A weapon
    template knows its simple/martial melee/ranged group, but a character weapon
    deliberately does not retain melee/ranged. The current attack engine must
    therefore show both formula branches
    (`src/rules/attack-profiles.ts:16-26`, `:417-453`). Add an open
    `melee | ranged | null` value (or an equivalent typed attack-kind fact) to
    the character copy and all portability arms. Without it, the level-up
    recommender cannot reliably reassess existing gear; thrown/range fields are
    not a safe substitute.

13. **Model attack-cantrip weapon scope — M.** Shillelagh needs a stable
    Club/Quarterstaff applicability fact after template copy, and True Strike
    needs the weapon’s 1+ CP eligibility. Weapon templates intentionally omit
    cost (`db/schema/sheet.ts:581-583`), so the builder cannot prove True Strike
    scope from current rows. Add sourced, copied mechanical applicability
    values; do not match character weapon names.

14. **Kit eligibility and suggestion query — L.** Compose
    `ClassProficiencyLookup`, template data, final scores, package options, and
    cantrip access into the two-axis result described above. Keep all
    recommendation thresholds in one pure policy and test that mutating fit can
    never mutate eligibility.

15. **Pact of the Blade and optional class-feature selection — XL.** Build a
    general optional-feature catalog/selection model, not a boolean named after
    one invocation. It needs:

    - sourced Pact of the Blade feature content and structured prerequisites;
    - character selection tied to the granting Warlock source and acquired
      class level;
    - a reference from that selection to one character weapon as the pact
      weapon;
    - a structured attack-ability override and weapon scope consumed by attack
      profiles and kit fit;
    - removal/replacement semantics; and
    - command undo, snapshot, backup, share, import tolerance, completeness, and
      level-up integration.

    The existing `named_features` table can supply text for Thirsting/Devouring
    Blade, but explicitly cannot say whether a character took one or which
    weapon is bonded (`db/schema/catalog-classes.ts:429-444`).

16. **Level-feature obligations — XL.** A comprehensive level-up wizard needs
    the per-level class/subclass/feature choices D11 originally deferred. D42
    puts them back on the path. Define them as level-event obligations consumed
    by the same step engine; do not hard-code ASI levels or subclass choices in
    UI conditionals.

17. **Wizard completeness, accessibility, and adversarial tests — M.** Add
    query-level step completion, keyboard/focus restoration following the
    multiclass picker’s `data-focus-key` precedent
    (`src/ui/screens/planner/completeness.ts:27-30`), browser tests for disabled
    legality versus enabled poor-fit choices, transaction rollback tests, and
    negative controls proving recommendations never block.

## Blank-character escape hatch

Keep the low-level blank create operation, but remove it from the primary form.
Expose it under an expanded “Import and recovery” or “Advanced” section as
“Create blank character,” with copy explaining that it is for repairing an
import/share or preparing a fixture. It calls the existing name-only
`CharacterCrud.create`; it does not enter the guided route automatically.

The following depend on that boundary remaining tolerant:

- backup import and share import can materialise old/homebrew documents,
  including documents with no class;
- direct test fixtures can create the aggregate root before inserting the rows
  relevant to a test;
- recovery work can open a partial document and add its missing class manually.

The existing list already renders such a row as “Level undetermined” and “No
classes yet” (`src/ui/screens/character-list/character-list.ts:128-132`,
`:389-405`). Keep that degraded rendering for boundary-created rows. Add a
prominent “Add a class” repair action, but do not redirect them into creation
or reject them. Import, share, catalog, and the blank escape remain the tolerant
half of D11.

## Honest risks: what will be wrong first

### The first equipment parse will look complete and be truncated

The current extract ends Fighter’s visible option in the middle of “Jav-”
(`docs/srd/source/class-core-traits.txt:139-143`). The class tables cross page
columns, and Fighter has a third option. A parser can easily produce twelve
classes and still lose option continuations. Require exact per-class option
labels, full passthrough text, declared mechanical links in both directions,
and a failing count/fixture for Fighter C.

### “Recommended” will become “required” through presentation

The domain can keep eligibility and fit separate while the UI sorts poor-fit
items below a collapsed fold, greys them, or disables a whole card component.
Browser tests must select a Strength Fighter’s rapier and complete the wizard.
A negative control should mutate the fit to “alternative” without changing the
enabled state.

### Origin selection is much less built than the catalog makes it appear

Nine species and four backgrounds are seeded, but several mechanically
important species sub-choices remain prose, the source-instance bridge is
absent, and skill/background ability provenance is absent. A picker over catalog
names alone would demo well while losing choices. Treat origin application and
sub-choice work as prerequisites, not polish.

### The magic-dependent badge will overclaim scope

True Strike has a weapon-cost condition the weapon schema does not store;
Shillelagh names two weapon kinds that cannot safely be recovered from an
edited value row by name; Pact of the Blade has no selection at all. Until the
applicability work lands, show “cannot determine” rather than a positive badge.
The most dangerous failure is a positive badge inferred from display text.

### Existing gear cannot yet be re-ranked honestly on level-up

Template `srd_group` knows melee versus ranged, but that fact is lost on the
character copy. A level-1 picker can rank templates correctly and a later
level-up can no longer classify the copied weapon. If the attack-kind work is
deferred, the level-up kit must recommend new catalog items without claiming to
understand the fit of existing ones.

### Ability methods will be recalled from memory

The repository sources the background bonuses but not rolling, standard array,
or point buy. These rules are familiar enough that an implementation will be
tempted to type them in. V1 should say “Enter base scores” until an extract is
committed and tested.

### Package projection can imply the app gave away untracked gear

The class source packages contain foci, packs, tools, and money beside weapons
and armour. The review must say “The app recorded: …” and separately “The
printed package also includes untracked items: …”. Dropping the latter silently
would make the projection look like the whole SRD package.

### Homebrew classes have no provable guided kit

`ClassProficiencyLookup` deliberately grants nothing when a class has no seeded
proficiency rows rather than guessing “simple”
(`src/queries/class-proficiency-lookup.ts:42-55`). The builder should show a
catalog gap and route the player to the tolerant manual equipment panel. It
must not present an empty guided list as proof the class permits nothing.

### Pre-class draft recovery can create stale catalog references

A session draft can outlive a reseed or catalog import. Store content keys plus
a draft schema version, re-resolve every key on resume, and return the user to
the invalidated step when a key is gone. Never materialise by a stale numeric
template id.

### Materialisation spans systems with different current writers

Character creation, origin copies, source instances, grant-slot generation,
and class update were not designed as one public operation. The transaction
must fail closed and be mutation-tested at each boundary. “Character exists but
class write failed” is exactly the class-less state this design is meant to
prevent.
