# Level-up wizard — one existing character, one level, one honest transaction

Status: design only. **Gates: none (plan only).** This plan starts from
`abbfa89d5c5ea90c5884c5aa34634f63cae2fdc4` and deliberately does not absorb the
unrelated Armor Class work already present in the working tree.

Binding law: **D48** (class first), **D55** (class → abilities before origins in
creation; for level-up, a class choice still precedes every consequence),
**D56** (straight-class advancement before adding a class), **D65** (starting
gear is a named package choice, not loose gear), **D67** (final number on the
sheet; sources on hover/touch), **D68** (mark the printed/default choice, never
label another legal choice “homebrew”), **D70** (unmade choices save and warn in
the wizard and on the sheet), **D71** (the UI prevents double submission),
**D77** (fixed hit points only), **D78** (ASI levels are per class and read from
the bundled table), and the later **D80** correction (subclass omission saves;
the command does not refuse it). D42, D49, D52, D53, D54 and D33 remain
load-bearing where this design cites them.

## 0. What is true now, each claim read rather than recalled

- **The domain transaction exists, but no production UI calls it.**
  `LevelUpClassCommand` reads the held class, requires an adjacent class level,
  enforces total character level 20, updates the class row, writes ASI effects,
  regenerates grants and captures a snapshot inverse
  (`src/commands/level-up-class.ts:85-142`, `:171-191`, `:193-271`,
  `:274-288`). Production wiring reaches the command through the factory and
  executor, while the planner UI mentions the intended path only in comments;
  repository search found no UI invocation
  (`src/commands/character-command-factory.ts:135-136`,
  `src/commands/character-command-executor.ts:503-517`,
  `src/ui/screens/planner/editors.ts:395-403`,
  `src/ui/screens/planner/screen.ts:465-482`).
- **`update_class` no longer levels.** Its payload is entry, subclass change or
  removal only (`src/domain/command-contracts.ts:126-154`), and its validator
  rejects an unknown `level` field (`src/commands/payload-validator.ts:380-412`).
  The planner therefore renders each class level as an `<output>`, while keeping
  its subclass selector and remove control live
  (`src/ui/screens/planner/editors.ts:380-435`). The wizard must drive
  `level_up_class`; it must not restore a second numeric writer.
- **The current level-up payload already has the cross-layer seam.** It carries
  `class_definition_id`, `target_level`, an optional subclass content key and an
  optional list of ability increases (`src/domain/command-contracts.ts:156-185`);
  validation pins the +2 or +1/+1 shape
  (`src/commands/payload-validator.ts:421-470`). This plan replaces that narrow
  ASI-only arm with a discriminated ASI-or-feat choice; it does not add a second
  level command.
- **The current refusal set has three members.** They are `class_not_held`,
  `ability_increase_required` and `level_not_adjacent`; `subclass_required` is
  deliberately absent (`src/builder/level-up.ts:38-67`). This matches D80's
  later correction: level 3 without a subclass proceeds and owes a warning
  (`.claude/decisions.md:117-144`).
- **The existing command still requires an ASI at a seeded ASI level.** It calls
  `asiLevelsForClassName`, refuses an empty increase list at a matching level,
  and rejects increases at other levels
  (`src/commands/level-up-class.ts:171-191`). D80 explicitly preserved
  `ability_increase_required` among the three refusals
  (`.claude/decisions.md:136-140`). That later, specific statement governs the
  apparent tension with D70: subclass and generated follow-up choices may stay
  unmade; the ASI-or-feat decision itself remains required until the owner says
  otherwise.
- **ASI applicability is already derived per class from the bundled class
  tables.** The parser reassembles wrapped feature cells, verifies every class
  enumerates levels 1–20, and exports `asiLevelsForClassName`
  (`src/rules/class-asi-levels-srd.ts:57-140`, `:142-152`). The verified sets are
  4/8/12/16 for ten classes, Fighter additionally 6/14, and Rogue additionally
  10 (`.claude/decisions.md:189-229`). A screen keyed to a union or a literal
  `[4]` would be wrong.
- **Hit points require no input and no new record.** D77 fixes every post-first
  level at hit die / 2 + 1 plus the live Constitution modifier
  (`.claude/decisions.md:231-242`). The typed helper computes the fixed die
  value (`src/rules/sheet.ts:691-725`), and the sheet adds that value plus
  Constitution for each later level (`src/rules/sheet.ts:738-754`,
  `:770-824`). The level-up command intentionally writes no
  `character_hit_point_rolls` row (`src/commands/level-up-class.ts:193-206`).
- **The hit die can be absent at the read boundary.** Guided class options carry
  `hit_die: number | null`, and the contract says a wizard must show unknown
  rather than substitute the sheet's assumed d8
  (`src/builder/contracts.ts:62-75`). The guided class query obtains it through a
  left join (`src/builder/guided-creation.ts:512-546`). The level-up read model
  must preserve that absence too.
- **Subclass choice is structurally available but bundled content is partial.**
  Every seeded 2024 class subclasses at class level 3, exposed as
  `LEVEL_UP_SUBCLASS_LEVEL` (`src/builder/level-up.ts:74-84`), while the bundled
  catalog contains only Eldritch Knight and Arcane Trickster
  (`src/rules/class-progression-lookup.ts:180-195`). The command accepts no key
  and resolves a supplied key only within the selected class
  (`src/commands/level-up-class.ts:144-169`).
- **An applied level already regenerates spell grants, but the existing spell
  picker cannot operate before that write.** Grant synchronization happens
  after the stored class level changes (`src/commands/level-up-class.ts:256-267`);
  the generator materializes list-choice slots with durable slot keys and IDs
  (`src/grants/grant-rule-slot-generator.ts:163-220`, `:612-685`). The spell
  picker requires an existing `slotId` for eligibility search and selection
  (`src/ui/screens/planner/spell-picker.ts:4-27`, `:117-170`). There is no
  pre-level slot for the wizard to pass it.
- **The planner already owns the post-write spell remedy.** It renders the
  durable slots and submits `set_slot` with the slot ID
  (`src/ui/screens/planner/screen.ts:590-625`). Completeness groups active,
  required, unlocked, unfilled spell slots and distinguishes user work from an
  unfillable catalog gap (`src/queries/character-completeness.ts:321-407`,
  `:486-524`). Reusing that warning is trivial; embedding spell selection before
  confirmation is not.
- **Feat definitions are real but only partly mechanical.** Each row stores
  `min_level`, `ability_points`, repeatability, prerequisites and grant rules
  (`db/schema/catalog-sources.ts:40-77`). The SRD parser produces 17 definitions,
  parses level/ability/feature prerequisites, derives 0/1/2 ability points, and
  currently generates rules only for Magic Initiate, Skilled and Fighting Style
  (`src/rules/feats-srd.ts:35-63`, `:89-186`, `:188-265`, `:267-328`). Numeric
  choices such as Grappler's allowed abilities and ability cap remain trapped in
  prose, so a complete level-up feat picker cannot be a select box over today's
  rows.
- **A feat source can already be persisted and can generate child spell
  choices.** `AddSourceCommand` validates duplicate/repeatable state and Magic
  Initiate configuration, inserts a source instance, and invokes the grant
  generator (`src/commands/add-source.ts:56-117`, `:119-195`). The background
  step proves the composition: it presents a player-selected Origin feat and
  configuration (`src/builder/background-choices.ts:76-139`) and its UI marks
  the printed feat as the default without calling alternatives homebrew
  (`src/ui/screens/guided-builder/background-step.ts:302-443`).
- **Current ASIs are not feat sources.** `LevelUpClassCommand` writes
  `ability_increase` effects owned by the class source and labels them with class
  and level (`src/commands/level-up-class.ts:208-253`). Supporting “ASI or
  another feat” therefore requires replacing this arm with one choice writer,
  not calling `AddSourceCommand` beside it and leaving ASI in a second shape.
- **Outstanding-choice warnings and sheet gaps are separate today.**
  Completeness knows unfilled spell choices, unchosen source options and
  addressable skill grants (`src/queries/character-completeness.ts:18-140`,
  `:780-870`). The character sheet instead returns a constant five-kind gap list
  and never calls completeness (`src/queries/character-sheet-builder.ts:261-270`,
  `:437-505`, `:838-846`). D70's shared wizard/sheet warning vocabulary is not
  implemented.
- **The sheet currently violates D67's presentation and data rules.**
  `SheetNumber` carries only a final value and one prose formula, and the HP and
  initiative builders collapse their contributing facts into that shape
  (`src/queries/character-sheet-builder.ts:107-117`, `:679-688`,
  `:723-728`). The view also combines class and species HP itself and embeds an
  ability score in the modifier's label, so those two final-number shapes do not
  even exist in the read model (`src/ui/screens/sheet/sheet-view.ts:285-303`,
  `:306-314`). It then constructs a visible formula paragraph beneath every row
  (`src/ui/screens/sheet/sheet-view.ts:911-940`), and the stylesheet explicitly
  says nothing is hidden (`src/ui/screens/sheet/styles.css:1-7`, `:50-60`).
  D67 instead requires the printable face to show the final number and the
  reveal to name every source that summed to it
  (`.claude/decisions.md:718-755`). This plan introduces one structured source
  projection and one reveal component used by both the wizard review and the
  sheet rather than putting prose formulas behind a wizard-only tooltip.
- **The newly landed AC foundation is usable by an exact level preview.**
  `CharacterSheetBuilder` reads eligible effects and returns the resolved AC
  including winner, bonuses, exclusions and tie information
  (`src/queries/character-sheet-builder.ts:566-593`, `:698-720`). The level-up
  command synchronizes class/subclass effects before it returns
  (`src/commands/level-up-class.ts:256-267`), so a rollback-only preview of the
  real command observes the same AC resolver the committed character will use.
- **The guided route shell establishes the right frontend pattern.** Screen
  modules are discovered automatically (`src/ui/app.ts:10-35`); the existing
  guided screen has exact route matchers, obtains one read model, mounts a pure
  step component, and composes cleanup (`src/ui/screens/guided-builder/screen.ts:18-38`,
  `:40-173`). It stores no authoritative wizard state in session storage
  (`src/ui/screens/guided-builder/screen.ts:27-31`).
- **Double-click protection already has an explicit owner rule.** D71 makes the
  disabled button between click and response the control
  (`.claude/decisions.md:545-562`). Command execution additionally carries an
  operation UUID and revision (`src/commands/client.ts:8-35`), and the executor
  replays the same UUID rather than applying it again
  (`src/commands/character-command-executor.ts:189-224`, `:320-341`).
- **Starting equipment is not a level-up grant.** The existing guided equipment
  path records one named class and background package choice and mints only its
  weapons and armour; other gear renders from rules tables
  (`.claude/decisions.md:800-837`). Advancing an existing class must neither
  offer those packages again nor mint their contents again.

## 1. Outcome and boundary

The outcome is a dedicated route that advances one **held, bundled class** by
exactly one class level and one total character level:

```text
/characters/:characterId/level-up
```

One run has one draft, one target class and one final `level_up_class`
transaction. Until confirmation, the draft is UI memory only; reload returns to
the class screen and no character data has moved. After confirmation, the new
level is ordinary persisted character state. Any follow-up spell, subclass or
other generated choice may be incomplete, reload, share and print with warnings.

This is **straight-class advancement** in D56's sequencing sense:

- it may advance a class the character already holds;
- if the character holds more than one class, it may advance any one of those
  held classes;
- it does not add a new class and shows no “Add class” card;
- multiclass entry remains in the planner until its own wizard unit can enforce
  the prerequisite and advanced-player warning together.

The wizard guides bundled 2024 classes only, matching D52. An imported/homebrew
class stays readable and editable in the planner; the wizard says it cannot
derive that class's level features, ASI schedule or hit die and does not pretend
to guide it.

The visual inspiration is the **information architecture**, not BG3 assets,
copy, arrangement or trade dress: a strong level heading, one consequential
decision at a time, conditional screens only when that level creates the choice,
and a final before/after review.

## 2. The level-up seam

Create `src/builder/level-up-wizard.ts` as an extract-free contract module and
re-export only shared types from the existing `src/builder/level-up.ts`. It owns:

```ts
type LevelUpStep =
  | 'class'
  | 'gains'
  | 'subclass'
  | 'advancement'
  | 'epic_boon'
  | 'review'
  | 'complete';

type LevelAdvancementChoice =
  | {
      kind: 'feat';
      feat_content_key: ContentKey;
      config: JsonObject;
      ability_increases: readonly LevelUpAbilityIncrease[];
    }
  | { kind: 'defer_epic_boon' };

interface LevelUpDraft {
  character_id: CharacterId;
  expected_revision: CharacterRevision;
  class_definition_id: ClassDefinitionId;
  target_class_level: ClassLevel;
  subclass_content_key?: ContentKey;
  advancement_choice?: LevelAdvancementChoice;
}
```

The actual branded types already present in `src/domain/ids.ts` and
`src/domain/enums.ts` are used; the sketch uses their semantic names and does not
authorize bare `number` aliases.

The seam also owns:

- exact route matcher and `levelUpPath(characterId)`;
- ordered-step derivation from the read model and draft;
- RPC method names for state and preview;
- panel and control locators used by unit/browser tests;
- `LevelUpWarningKey` and its presentation lookup;
- the front-door placement seam in §10.

There is no persisted `wizard_run` table. The durable facts are the class level,
source instances, effect rows and the new level-granted feat choice in §5.
Navigation state is not character state.

## 3. The one read model

`queries.characters.levelUpState` returns everything required to render every
pre-confirm screen:

```ts
type LevelUpState =
  | { kind: 'not_found' }
  | { kind: 'maximum_level'; character_id; total_level: 20 }
  | {
      kind: 'ready';
      character_id;
      revision;
      total_level;
      classes: readonly HeldClassLevelOption[];
      outstanding_choices: readonly OutstandingChoicePresentation[];
    };
```

Each `HeldClassLevelOption` carries:

- branded class definition id and content key;
- class name, current class level, target class level;
- whether its key belongs to the bundled set;
- `hit_die: HitDieSize | null`;
- current resolved Constitution score/modifier;
- fixed class HP base, modifier and floored class delta, plus current/projected
  final HP from the same class/species effect resolvers the sheet uses;
- current and projected total level/proficiency bonus;
- the parsed feature-name list for the target class level;
- the current and next `class_progressions` values needed to show spell-slot,
  cantrip and prepared-count deltas;
- applicable subclass options at level 3, including imported 2014/expanded
  subclasses attached to this class;
- `asi_or_feat` applicability from `asiLevelsForClassName`;
- `epic_boon` applicability from the same class-table feature cell at 19;
- qualified, unqualified and unprovable feat candidates with a named reason.

The read model never substitutes for a missing hit die. A bundled class missing
its traits row is shown but disabled with “Hit die unknown; fixed HP cannot be
derived.” That is an unavailable legal calculation, not a guessed d8.

Replace the narrowly named private parser in `class-asi-levels-srd.ts` with a
single public class-level feature parser that returns the reassembled feature
cell and derives both `hasAbilityScoreImprovement` and `hasEpicBoon`. Keep
`asiLevelsForClassName` as a thin consumer while callers migrate; do not create a
second parser over the same fixed-width table. The parser remains the source of
truth—no per-class literals in UI or command code.

## 4. Screen sequence

The step rail is computed after class selection. Inapplicable steps are omitted,
not shown disabled. “Back” changes only the in-memory draft; “Cancel” returns to
the launch surface without a write.

### 4.1 Class — always first

Offer one card per held bundled class:

- `Fighter 5 → Fighter 6`, not a free numeric field;
- current and target total character level;
- a short sourced list of feature names at the target class level;
- “Cannot guide this class” for held homebrew/unseeded classes, with the missing
  facts named;
- no classes the character does not hold and no “add class” action.

If exactly one class is held, it is preselected but the class screen still
renders. D48 is an ordering decision, not permission to make the choice
invisible.

At total level 20, render a terminal “Maximum level reached” panel. Do not issue
a command and wait for its TypeError.

### 4.2 Gains — always

This is a read-only explanation, not a form:

- **Hit points:** show the fixed class amount, live Constitution modifier,
  minimum-1 class result, any separately labelled level-scaled HP contribution,
  and projected final maximum. There is no radio, roll button, number input,
  method field or `character_hit_point_rolls` write.
- **Proficiency bonus:** show a change only if the projected total character
  level crosses a bonus boundary.
- **Class progression:** show target-level values and deltas that already exist
  in `class_progressions`—slots, Pact slots, cantrips and prepared/known count.
- **Features:** show names parsed from the target feature cell. Do not invent
  descriptions the repository does not carry. Automatic structured effects,
  including the landed class/subclass AC effects, are labelled “applied
  automatically”; text-only features are labelled “recorded in the SRD summary;
  full feature text is not printed here.”
- **Equipment:** show no package picker. A note says the existing named starting
  package remains unchanged. No weapon, armour or package row is written.

### 4.3 Subclass — target class level 3 only

Render only when `target_class_level === LEVEL_UP_SUBCLASS_LEVEL` and the class
does not already hold a subclass.

- Offer every subclass definition belonging to the selected class, labelled by
  rules edition.
- Default to no selection. A selected card contributes its content key to the
  command.
- “Decide later” is ordinary navigation. It renders an inline warning before
  leaving the screen, appears again on Review, and becomes the same warning on
  Complete and on the sheet.
- If the list is empty, explain that the catalog has no subclass for this class;
  Continue remains enabled. This is a catalog limitation plus an owed choice,
  never a dead end.

The planner's existing subclass select remains a later remedy. Setting it calls
`update_class`, which already reconciles subclass sources without moving the
level.

### 4.4 Ability Score Improvement or feat — only at that class's ASI levels

Render only when the selected class's parsed table says the target class level
has Ability Score Improvement. This is where Fighter 6/14 and Rogue 10 matter;
a Wizard at 6 must never see it.

The first card is **Ability Score Improvement (class default)**. “Class default”
is the D68 interaction pattern: it marks what the class feature names first; no
other legal choice is called homebrew or a departure. Its controls are +2 to one
ability or +1 to two distinct abilities, capped at 20.

Other cards are feats for which the target character qualifies:

- show name, minimum level, ability points and prerequisite result;
- feats with `ability_points = 0` show D53's warning: choosing this feat grants
  no ability increase;
- feats with one point render the sourced allowed-ability set and cap;
- feats with two points render the same +2/+1+1 control as ASI;
- Magic Initiate gathers spell list and casting ability because its source
  cannot generate without them; its actual spell selections remain follow-up
  choices under §7;
- repeatable feats are offered only when their repeat rule and configuration can
  be satisfied; a non-repeatable active feat is unavailable with the reason;
- an unmet prerequisite disables the card; an unprovable prerequisite is not
  treated as met.

Per the later, explicit D80 refusal count, this screen has no “Decide later.”
Confirmation cannot proceed without ASI or another qualified feat, and the
command retains the structured `ability_increase_required` refusal as the
server-side guard. The message is widened to “Choose Ability Score Improvement
or another feat for this level”; the reason string stays fixed.

### 4.5 Epic Boon — target class level 19 only

Epic Boon is not an ASI occurrence and must not be smuggled into
`asiLevelsForClassName`. The class feature cell names it independently.

Offer qualified Epic Boon feats, their one-point ability choice and cap 30.
Because D80 preserves only the ASI refusal while D70 governs other owed choices,
this screen includes “Decide later.” The durable choice row in §5 stores null,
and the wizard/sheet warn until it is resolved.

If the owner intends D80's required-choice exception to cover Epic Boon too,
that is one policy-arm change in the seam and command—not a schema change.

### 4.6 Review and confirm — always

Show:

- class and level being gained;
- selected subclass or an explicit owed-choice warning;
- selected ASI/feat/Epic Boon and its ability increases;
- fixed HP delta;
- final projected HP, ability scores, proficiency bonus, AC and initiative;
- newly created post-level choice warnings that the preview can prove;
- a clear statement that existing equipment packages and owned equipment do not
  change.

Derived numbers follow D67: only the final number is on the face. A labelled
button/reveal exposes sources on pointer hover, keyboard focus/activation and
touch. Do not use `title`, hover-only CSS, or visible inline arithmetic.

The Confirm button:

1. is disabled immediately with every Back/Cancel control while the request is
   in flight;
2. submits the exact previewed command through `commands.execute`;
3. reuses one operation UUID for retries of the unchanged draft;
4. re-enables after a definite refusal/network failure;
5. discards the UUID if any choice changes.

The request carries the revision used to build the preview. A revision conflict
does not merge a level-up; it reloads state and says the character changed.

### 4.7 Complete — after the transaction

Reload the committed sheet and shared outstanding-choice query. Show:

- the new class and total level;
- the same D67 final-number cards;
- every outstanding choice, with subclass and newly generated spell choices
  prominent;
- links to the planner remedies and the character sheet;
- “Level up again” only when total level is below 20.

The wizard is complete even when warnings remain. “Complete” means the level
transaction committed, not “the character has no outstanding choices.”

## 5. One feat choice, one source, one transaction

### 5.1 Durable level-granted feat choice

Add `character_level_feat_choices`:

| column | meaning |
|---|---|
| `id` | branded `CharacterLevelFeatChoiceId` |
| `character_id` | composite ownership guard |
| `character_class_level_id` | the held class row that granted the choice |
| `class_level` | branded 1..20 target class level |
| `choice_kind` | closed `asi_or_feat | epic_boon` |
| `feat_source_instance_id` | nullable; null means D70-owed |
| timestamps | normal carried row metadata |

Unique `(character_class_level_id, class_level, choice_kind)`. Composite
references prevent linking another character's class or feat source. Deleting a
feat source sets the pointer null; tombstoning it also makes the choice
outstanding at read time. The row is character state and therefore joins
snapshot, backup and share transport in the same dispatch as the migration.

Do not store a second `feat_definition_id`: the active feat source already owns
that relation. Do not store warning text or a “complete” boolean: null/active
source state is the fact, and presentation derives from it.

For pre-migration characters, a boot reconciler creates an unresolved row for
every reached bundled ASI/Epic-Boon occurrence it cannot prove. It does not
guess that a similarly labelled effect or same-level feat paid the choice.
No real user characters exist per D52, but imports and test fixtures still
deserve the non-destructive rule: a warning is safer than falsely marking a
choice complete.

### 5.2 Replace the ASI-only payload arm

`LevelUpClassCommand` keeps its discriminator and class/target/subclass fields.
Replace top-level `ability_increases` with:

```ts
advancement_choice?:
  | {
      kind: 'feat';
      feat_content_key: ContentKey;
      config: JsonObject;
      ability_increases: readonly LevelUpAbilityIncrease[];
    }
  | { kind: 'defer_epic_boon' };
```

At an ASI level, the field is required and must be `feat`. At Epic Boon it may
be a qualified feat or `defer_epic_boon`. At any other level it is rejected.

The command, inside its existing transaction:

1. validates class-held, adjacency and total-level guards;
2. derives the target occurrence from the class-table parser;
3. resolves and rechecks feat eligibility against server-side state;
4. updates the class level and optional subclass;
5. creates/reactivates the feat source with acquisition timing at the target
   character level;
6. writes ability contributions owned by that feat source, using the feat's
   structured point budget, allowed abilities and cap;
7. records the level-feat choice pointer, or the deferred Epic Boon row;
8. runs the existing grant generator for the class, subclass and feat;
9. returns the existing snapshot inverse.

Ability Score Improvement is handled as its seeded feat definition. Delete the
class-owned ASI special case instead of preserving two representations.

### 5.3 Feat mechanics required before the picker

Extend the feat parse/model with:

- `ability_increase_abilities`: closed ability list or “any”;
- `ability_increase_maximum`: 20 or 30 when `ability_points > 0`;
- the full four-value feat grouping from the source
  (`origin | general | fighting_style | epic_boon`);
- typed prerequisite decoding/evaluation results:
  `qualified | unmet | unprovable`, with reasons.

The current grouping's `origin | null` loses information the level-19 filter
needs. Replace it; this is pre-alpha and D53 explicitly left the four-value
grouping as the source-shaped option.

Prerequisite evaluation uses projected total level, resolved ability scores and
structured feature possession. Level and ability prerequisites are buildable
from current data. Feature prerequisites are not: class feature possession is
not a relation today. The class-level feature parser from §3 supplies a bundled
feature entitlement index for “Fighting Style Feature” and “Spellcasting
Feature.” Imported feature prerequisites remain `unprovable`, never silently
qualified.

The feat source records and generates every mechanic the existing grant rules
understand. This unit does not claim the application simulates every prose
benefit. Any feat that changes a displayed number must either contribute through
the effect/resolver vocabulary or make that number undetermined with a named
sheet gap; a confidently wrong initiative or AC is not an acceptable “recorded
feat.” Alert, Archery and Defense are the first required numeric fixtures.

This is the largest dependency in the plan and is split from the UI in §12.

## 6. Exact preview, not parallel arithmetic

Add `previewLevelUp(db, characterId, payload)` beside the command. It:

1. captures the character state before;
2. opens a database transaction;
3. applies the same `LevelUpClassCommand` body used by commit, without executor
   revision/audit rows;
4. builds `CharacterSheet` and completeness from the resulting state;
5. throws a private sentinel carrying the preview result;
6. catches only that exact sentinel outside the transaction;
7. asserts the post-preview captured state equals the before snapshot in tests.

The repository already uses the sentinel rollback pattern for share preview
(`src/sharing/character-share.ts:1376-1399`). The preview must not reimplement
HP, AC, feat effects or spell regeneration in a query object. Its value is that
the review sees the state the real command would create—including the landed AC
resolver and newly materialized spell-choice warnings—then rolls every row back.

Preview result:

```ts
interface LevelUpPreview {
  before: LevelUpDerivedNumbers;
  after: LevelUpDerivedNumbers;
  new_outstanding_choices: readonly OutstandingChoicePresentation[];
  command_fingerprint: string;
}
```

The fingerprint binds Review to the draft. Confirm refuses locally if the draft
has changed since preview and requests a new preview.

## 7. Spells are a separate unit, explicitly scoped out

This wizard does **not** embed cantrip, prepared-spell, known-spell or spellbook
pickers.

That is not a silent omission:

- before commit, the new slots and their IDs do not exist;
- preview creates them only inside a transaction that is rolled back;
- the current eligibility API and picker address durable slot IDs;
- accepting choices during preview would require a stable provisional identity
  and then an atomic mapping into the committed generator output;
- committing the level first and then calling `set_slot` produces several
  revisions/undo entries rather than the one level transaction this plan pins.

A future **LU-SPELLS** unit chooses one of two honest architectures:

1. grant-generator planning with stable logical slot keys that the level command
   can fill atomically; or
2. a post-level persisted sub-flow whose multiple operations and undo semantics
   are explicit.

Until then, the Gains screen previews spell capacity deltas, the Complete screen
shows the newly generated unfilled choices, the wizard says they remain to be
chosen, and the planner supplies the working picker. The sheet prints the same
outstanding-choice warnings under §8. That satisfies D70 without pretending the
wizard selected spells.

## 8. D70: one outstanding-choice vocabulary, two surfaces

Extract the presentation of outstanding choices from
`character-completeness.ts` into `src/queries/outstanding-choices.ts`. It owns
typed facts and text for:

- unfilled spell-choice groups;
- unchosen class/source options;
- unfilled skill grants;
- class level 3+ with null subclass;
- deferred Epic Boon choice.

Completeness and `CharacterSheetBuilder` both consume this one query. The planner
keeps its actionable controls. `CharacterSheet.gaps` gains per-character
outstanding-choice kinds instead of only the current constant catalog gaps.
The sheet renders each warning visibly and printably; it is never hidden inside
a D67 reveal because paper cannot hover.

The wizard consumes the same presentation objects:

- draft-time subclass omission is mapped to the same key before commit;
- preview/complete warnings come directly from the rollback/committed query;
- wording is not copied into a UI constant.

Warnings never disable Continue or Confirm, except the ASI-or-feat requirement
that D80 explicitly preserves. Catalog gaps and user choices remain distinct:
“No Wizard subclass is bundled” and “Subclass not chosen” can both be true and
need different remedies.

## 9. D67 reveal shared by wizard and sheet

Create a small UI primitive, not a database abstraction:

```ts
createDerivedNumberReveal({
  id,
  label,
  value,
  sources
})
```

It renders the final number plus a real button with `aria-expanded`,
`aria-controls` and focus behavior. Pointer hover/focus may open the same panel;
click/touch toggles it; Escape closes it; outside click closes it. The sources
remain ordinary DOM text when open, so D4's visible-data rule is preserved.

Before the primitive is used, replace `SheetNumber.formula` as the explanation
contract with structured `sources: readonly DerivedNumberSource[]`. Each source
has a stable kind, a person-readable source label, its signed contribution, and
an optional source-instance/content key; it is data, not a preformatted
arithmetic sentence. The builder must preserve the authoritative terms:

- ability base and every active ability contribution;
- HP per class/level fixed base, Constitution term and level-scaled species
  effects, which requires `hitPointMaximum` and `effectHitPoints` to return
  contribution traces and the builder—not the view—to produce one final HP
  maximum;
- AC winning base, shield and flat bonuses from the resolver;
- initiative base/ability and every modelled initiative effect;
- proficiency, save, skill and passive-perception terms from their resolved
  ability/proficiency inputs.

An unknown input produces an undetermined face plus a visible gap under D33; it
does not become a zero-valued source. Formula prose may remain as catalog/help
copy, but it cannot stand in for this source trace or be the reveal's only
content.

Remodel an ability row as a final score plus its modifier rather than storing
the score inside the modifier's label. The score's reveal names base and
additive sources; the modifier's reveal names the final score and the modifier
rule. Both are final-number faces, and their source terms are not conflated.

Refactor every derived-number sheet row to this primitive and remove its always
visible `.sheet-formula` paragraph. Print CSS prints the label and final number
only. Non-number warnings, gaps, AC exclusions and tie/exclusion explanations
remain visible because they explain a condition or missing fact, not merely the
terms of a sum.

The wizard Review and Complete screens use the same primitive with the preview
and committed `CharacterSheet` data. There is one touch behavior and one
accessibility test suite, not a wizard tooltip and a sheet tooltip that drift.

## 10. Coexistence with the planner, and the open front-door seam

Both surfaces stay:

- **wizard:** the only guided writer for an adjacent held-class level;
- **planner:** expert editing, subclass repair, generated spell choices, source
  configuration, warnings, undo/redo and save points.

The wizard never embeds the planner screen and the planner never gains a numeric
level field. Both share commands, sheet numbers, completeness and spell slots.

**OPEN OWNER QUESTION — intentionally not answered here:** should “Level up” be
the primary action on the character sheet or in the planner?

Pin it in `src/ui/level-up-entry.ts`:

```ts
type LevelUpEntrySurface = 'undecided' | 'sheet' | 'planner';
export const LEVEL_UP_ENTRY_SURFACE: LevelUpEntrySurface = 'undecided';
```

Both screens call the same `levelUpEntryLink(surface, characterId)` helper; only
the selected surface renders it as the primary action. The checked-in
`undecided` arm renders equivalent secondary links on both so the route is usable
without declaring either the front door. The switch is exhaustive and has no
default. Flipping the decision changes one constant and presentation tests—no
route, command, RPC, schema or saved character.

## 11. Controls, with their mechanisms

| control | mutation / failure it must catch | mechanism and fixture |
|---|---|---|
| **LU-ONE-PATH** | restore `level` to `update_class` or issue it from the planner | payload validator rejects `level`; source search proves the wizard is the only production `level_up_class` caller |
| **LU-ADJACENT** | remove the current+1 guard | command test attempts Fighter 2→7 and asserts named refusal and byte-identical state |
| **LU-CLASS-FIRST** | derive gains before a held class is chosen | UI unit asserts first panel/step is `class`; no preview RPC fires before selection |
| **LU-HELD-ONLY** | offer/add an unheld class | read-model fixture has Fighter held and Wizard catalogued; Wizard does not appear |
| **LU-HOMEBREW-HONEST** | substitute defaults for an unbundled class | held homebrew class renders disabled with named missing hit die/advancement data; no command fires |
| **LU-ASI-PER-CLASS** | hardcode the union or `[4]` | Fighter 5→6 and Rogue 9→10 render advancement; Wizard 5→6 does not; Sorcerer wrapped cells still produce 4/8/12/16 |
| **LU-ASI-REQUIRED** | allow an empty ASI-level payload | command preserves `ability_increase_required`; UI cannot confirm and raw RPC gets the structured refusal |
| **LU-FEAT-ZERO** | infer a +1 from choosing Alert/Archery | D53 fixture selects a 0-point feat and asserts warning, no `ability_increase` row |
| **LU-FEAT-POINTS** | accept the wrong ability/cap/point sum | Grappler permits only STR/DEX +1 cap 20; ASI permits any +2 or +1/+1 cap 20; Epic Boon fixture uses cap 30 |
| **LU-FEAT-PREREQ** | treat unprovable/unmet as qualified | Grappler below 13 and Wizard choosing Fighting Style are unavailable with different reasons; qualified Fighter fixture is available |
| **LU-FEAT-ATOMIC** | level moves but feat/effects fail | induce grant-generation failure after the level update; class row, choice row, source, effects and slots all remain before-state |
| **LU-HP-FIXED** | add a roll/input or omit Constitution/minimum 1 | browser asserts no HP form controls; integration fixtures cover Fighter CON +2 and Wizard CON −5, showing fixed delta and floor 1, with zero roll rows |
| **LU-SUBCLASS-SAVE** | block level 3 with no option/key | Wizard 2→3 with empty bundled options commits; Complete and sheet carry the same warning key |
| **LU-SUBCLASS-APPLY** | attach another class's subclass | Fighter rejects Arcane Trickster and accepts Eldritch Knight; source/effects regenerate |
| **LU-EPIC-DEFER** | lose or hide a deferred level-19 choice | level 19 commits a null choice row; reload/share/backup and sheet preserve the warning; later resolution clears it |
| **LU-SPELL-SCOPE** | imply the wizard chose new spells | caster level fixture commits, generated slots remain empty, Complete/sheet warn, and no spell picker exists in the wizard DOM |
| **LU-EQUIPMENT-NOOP** | reapply a starting package | count/package/weapon/armor rows before and after ordinary and ASI level-ups are identical |
| **LU-PREVIEW-ROLLBACK** | preview leaks a row, revision or sequence change | capture full `CharacterState` and relevant catalog IDs before/after preview and assert equality |
| **LU-PREVIEW-EXACT** | parallel preview arithmetic drifts | preview and subsequent unchanged commit produce identical derived-number/source projections |
| **LU-D67-SOURCES** | hide a prose formula, sum HP in the view or call modifier terms score sources | ability score/modifier, class+species HP, AC and initiative fixtures compare structured source label/amounts to hand-authored expected terms whose result equals the correct face value |
| **LU-D67-TOUCH** | implement hover only or leave arithmetic visible | browser tests hover, keyboard and tap the same reveal; print stylesheet/screenshot contains final number and no source arithmetic |
| **LU-D70-ONE-TEXT** | copy warning text into wizard/sheet | both surfaces receive the same presentation object; test compares warning keys and text from one fixture |
| **LU-DOUBLE** | two rapid clicks issue two operations | delayed RPC fixture clicks twice; one call occurs, all navigation is disabled, and the unchanged retry reuses the UUID |
| **LU-STALE** | commit a preview after another edit | mutate revision between preview/confirm; command refuses, reloads, and no level moves |
| **LU-PLANNER-LIVE** | replace/redirect the planner | planner route, spell picker, completeness and subclass control browser journeys remain green |
| **LU-PORTABLE** | omit the choice row from one persistence path | snapshot undo/redo, backup restore and share clone retain ASI/feat/Epic choice provenance and warnings |

Mutation fixtures belong in `tests/fixtures/level-up-wizard-mutations.mjs`; they
must mutate the named mechanism, not regenerate expectations from production
output.

## 12. Dispatches — sized by blast radius, not filename count

The order is strict where noted. Parallel test authors may consume a ratified
seam, but no implementation dispatch invents its own payload or warning names.

1. **LU-0 — seam and class-level facts (M).** Ratify routes, steps, RPC shapes,
   locators, warning keys and entry-placement type. Replace the ASI-only table
   parser with the feature-cell read model while keeping the existing ASI
   function as one consumer. Exit: all twelve class tables, wrapped Sorcerer
   cells, Fighter 6/14, Rogue 10 and Epic Boon 19 are hand-transcribed negative
   controls.
2. **LU-1 — feat model and eligibility (L).** Migrate the four-value grouping,
   ability options/cap and typed prerequisite evaluator; update seeding, row
   contracts, schema inventories and source tests. Add structured numeric effect
   handling or explicit undetermined results for Alert, Archery and Defense.
   Exit: every bundled feat has a deterministic `qualified | unmet | unprovable`
   result and every displayed number affected by an offered feat is correct or
   explicitly undetermined.
3. **LU-2 — level-granted feat choice and command replacement (XL).** Add
   `character_level_feat_choices`; replace the ASI-only command arm with unified
   feat source/effects; add Epic defer/resolution; retain the two existing
   command guards plus D80's ASI refusal; regenerate class/subclass/feat grants
   in one transaction. This dispatch owns migration, snapshot, backup, share
   wire mint/frozen fixture, row contracts, audit and inverse tests. Splitting
   schema from transports would create an interval where export loses the new
   fact, so it is large but indivisible.
4. **LU-3 — shared outstanding choices and sheet warnings (L).** Extract the
   completeness vocabulary, add subclass/Epic checks, feed the same objects to
   planner and sheet, render them visibly in print, and add portability/reload
   controls. Exit: D70 warning equality is executable.
5. **LU-4 — rollback preview and read model (L).** Implement
   `levelUpState`/`previewLevelUp`, exact validators and worker/client plumbing.
   Reuse the real command under rollback and compare preview to commit. Exit:
   no preview changes state, and AC/HP/ability/proficiency projections match the
   commit.
6. **LU-5 — D67 source projection, reveal and sheet migration (XL).** Replace
   the collapsed `SheetNumber.formula` explanation with structured source
   traces, extend HP/ability/initiative projections without parallel
   arithmetic, build the hover/focus/touch reveal, move every derived sheet
   number to it, keep gaps visible, and prove print shows final numbers only.
   This is XL because D67 says “etc.” and therefore touches every derived-number
   producer, not because the reveal widget is difficult. It precedes the wizard
   UI so LU-6 consumes rather than clones it.
7. **LU-6 — wizard route and screens (XL).** Class, gains, conditional subclass,
   conditional ASI/feat, Epic Boon, review and complete; in-memory draft;
   operation UUID lifecycle; revision conflict; direct-route not-found/max-level
   states; responsive/a11y styling. Exit: unit and browser journeys cover levels
   2, 3, Fighter 6, Rogue 10, Wizard 6, caster progression and level 19.
8. **LU-7 — launch seam and regression closeout (S after owner answer, M without
   it).** Wire the chosen primary entry surface, or equivalent secondary links on
   both while the question stays open. Run planner, sheet, creation wizard,
   backup/share, build and full browser regression. No direct planner level
   writer returns.

**Separate future unit, not hidden in these sizes:** LU-SPELLS from §7. It needs
its own design because stable pre-commit slot identity and atomic undo semantics
do not exist.

## 13. Assumptions proved locally before finalizing

The following checks were run against the stated working tree:

- `git rev-parse HEAD` returned
  `abbfa89d5c5ea90c5884c5aa34634f63cae2fdc4`.
- `rg` found no production UI dispatch of `level_up_class`; production wiring is
  factory/executor only, with tests and comments elsewhere.
- The targeted suite
  `npm test -- --run tests/integration/commands/level-up-class.test.ts
  tests/unit/rules/srd-feats-extract.test.ts
  tests/integration/queries/completeness.test.ts
  tests/unit/ui/sheet-view.test.ts`
  passed **4 files / 57 tests**. This proves the current level command, feat
  extract, completeness and sheet projections are green before the planned
  replacement; it does not prove the new UI.
- Direct inspection of `class-level-tables.txt` found Ability Score Improvement
  at Fighter 6/14 and Rogue 10 and Epic Boon at 19 in every displayed class
  block; the current parser's own integration tests cover the per-class sets.
- Direct inspection of `feats.txt` confirmed Ability Score Improvement's any
  ability/cap 20, Grappler's STR/DEX/cap 20, Epic Boons' cap 30, Alert's
  initiative bonus, Archery's attack bonus and Defense's conditional AC bonus
  (`docs/srd/source/feats.txt:28-35`, `:64-80`, `:84-104`, `:106-173`).
- The working tree was already dirty with unrelated implementation and design
  work. This task neither edits nor claims ownership of any path except this
  plan.

## 14. Verification ladder

Each dispatch runs its focused unit/integration suite and `npm run typecheck`.
LU-2 additionally runs all schema, migration, snapshot, backup, share and
command tests. LU-3 runs completeness, character sheet and print tests. LU-4
runs command plus preview equivalence. LU-5 runs sheet unit/browser/a11y/print.
LU-6 runs guided-builder and planner browser journeys.

Final verification:

```text
npm test
npm run build
npm run test:browser
```

The final manual pass uses:

1. Fighter 1→2, CON 14 — fixed HP is shown, no choice exists.
2. Wizard 2→3 with no bundled subclass — level saves; wizard and sheet warn.
3. Fighter 5→6 — ASI/feat screen appears.
4. Wizard 5→6 — ASI/feat screen does not appear.
5. Rogue 9→10 — ASI/feat screen appears.
6. Fighter 3→4 choosing Alert — no ability increase is invented; warning shows;
   initiative is correct or explicitly undetermined.
7. Wizard 2→3 — new spell slots/choices generate after commit and warn; the
   planner can fill them.
8. Any class 18→19 deferring Epic Boon — level saves and the warning survives
   reload, share, backup and print.
9. Preview then commit an AC-changing automatic/subclass effect — before/after
   preview equals the committed resolver result.
10. Rapid double confirm — one request, one level, one history entry.

## 15. Not in this unit

- Adding a new class through the wizard; D56 sequences it later and D49 requires
  its prerequisite block and advanced-player warning together.
- Embedded spell selection; LU-SPELLS owns it for the reasons in §7.
- Leveling down, skipping levels, or batch leveling.
- Reapplying or changing starting equipment packages during ordinary level-up.
- Copying BG3 artwork, sounds, text, layout or branded visual language.
- Making imported/homebrew class advancement derivable without imported
  progression, hit-die and feature-choice contracts.

## 16. Unresolved risks

1. **Feat completeness is larger than the existing feat catalog suggests.**
   Eligibility is partly structured, but ability options/caps and several
   number-changing benefits are still prose. LU-1 must either model each offered
   numeric effect or make its affected number visibly undetermined; recording a
   feat beside a confidently wrong number is the highest correctness risk.
2. **D70 and D80 draw an awkward boundary.** D70 says owed choices save; D80,
   later and specifically, preserves `ability_increase_required`. This plan
   obeys both by requiring ASI-or-feat while allowing subclass, spell and Epic
   Boon omissions. One owner sentence could make all level choices deferrable;
   the choice-row model makes that a policy change rather than a migration.
3. **Spell selection is not atomic with level-up today.** The working picker
   needs durable slot IDs that exist only after grant regeneration. The scoped
   warning/planner remedy is honest, but a later LU-SPELLS design must choose
   stable provisional slot identity or explicit multi-operation semantics
   before the wizard can be called mechanically complete for casters.
