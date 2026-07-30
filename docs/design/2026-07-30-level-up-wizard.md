# Level-up wizard — one existing character, one level, one honest transaction

Status: design only, **revision 3**. **Gates: none (plan only).** Revision 3
starts from `e5c64b0adcfd56a9dcb829cf72144599f768f18c`. It retains revision 2's
spell, launch and durable-undo corrections and supersedes its partial feat
picker. D101 now requires the complete sourced 17-feat catalog at every
class-table ASI occurrence, with mechanics applied only through vocabulary the
repository actually has. It does not absorb unrelated work.

Binding law: **D48** (class first), **D55** (class → abilities before origins in
creation; for level-up, a class choice still precedes every consequence),
**D56** (straight-class advancement before adding a class), **D65** (starting
gear is a named package choice, not loose gear), **D67** (final number on the
sheet; sources on hover/touch), **D68** (mark the printed/default choice, never
label another legal choice “homebrew”), **D70** (unmade choices save and warn in
the wizard and on the sheet), **D71** (the UI prevents double submission),
**D77** (fixed hit points only), **D78** (ASI levels are per class and read from
the bundled table), and the later **D80** correction (subclass omission saves;
the command does not refuse it), **D85** (the sheet and character list Level Up
buttons enter this wizard; the planner remains a writer), **D87** (guided
creation and level-up include spell choices), **D90** (Expertise is modelled
after every skill proficiency choice), **D91** (resource maxima belong on the
sheet, not in wizard screens), **D94** (level-up undo is database-local and
never exported), **D95** (warnings are permanent while their condition holds),
**D96** (multiclass ability minimums warn and allow), and **D97** (level deletion
falls back to import-style reconstruction, never reaches total level 0, and
uses skill provenance), and **D101** (every ASI occurrence offers the full
qualifying SRD feat catalog; ASI is one feat among equals; expressible effects
use the existing vocabulary and everything else is sourced text under D33).
D42, D49, D52, D53, D54 and D33 remain load-bearing where this design cites
them. D100 adds no performance gate to this plan.

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
  ASI-only arm with one discriminated feat choice; it does not add a second
  level command or a privileged non-feat ASI path.
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
  unmade; the feat decision at the class's ASI occurrence remains required.
  D101 changes what satisfies that refusal—any qualified sourced feat, including
  a zero-point feat—not the historical refusal key.
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
- **An applied level already regenerates spell grants, while guided selection
  still has no pre-write address.** Grant synchronization happens after the
  stored class level changes (`src/commands/level-up-class.ts:256-267`). The
  generator gives each list choice a stable rule key and ordinal, then constructs
  the durable slot key as `source.instanceUuid:ruleKey:ordinal`
  (`src/grants/grant-rule-slot-generator.ts:163-220`, `:612-685`, `:703-716`).
  The current picker and `set_slot` payload nevertheless require an existing
  numeric `slot_id` for search and mutation
  (`src/ui/screens/planner/spell-picker.ts:4-27`, `:117-170`;
  `src/domain/command-contracts.ts:52-82`). A newly unlocked class, subclass or
  feat slot has no ID before the level transaction. Revision 3 therefore keeps a
  planned logical locator and maps it to the generated durable slot inside the
  command; it does not defer the screen again.
- **Wizard spellbook acquisition is a grant-rule path but not a selection
  slot.** The Wizard progression emits `spellbook_acquisition`; the generator
  reads acquisitions from class-source config and materializes the
  per-character `wizard_spellbook_entries` set
  (`src/rules/class-progression-lookup.ts:440-462`;
  `src/grants/grant-rule-slot-generator.ts:500-590`). The entry currently stores
  only character and spell version (`db/schema/character.ts:560-590`), so it
  cannot say which Wizard level granted it or represent an unmade acquisition.
  Guided planning must include this existing rule kind and evolve the entry into
  a nullable, addressable acquisition row with provenance; forcing Wizard's two
  level-up spells into `spell_selection_slots` would create a second spellbook,
  while leaving null choices only in source config would give the planner no
  durable row to remedy.
- **The class grant rules already express the durable spell counts, but not the
  complete guided-level policy.** `class_progressions.grant_rules` creates
  stable cantrip and prepared-choice ordinals, plus Wizard spellbook and
  class-specific choices (`src/rules/class-progression-lookup.ts:350-462`).
  The planner renders those slots and writes them through `set_slot`
  (`src/ui/screens/planner/screen.ts:590-625`). The full SRD prose additionally
  says which classes may replace a spell when they gain a level; that swap
  entitlement is not a structured row today. D87 requires a sourced extract and
  one planned-slot service shared by creation, level-up, the generator,
  eligibility search and the existing planner writer.
- **Feat definitions are real but only partly mechanical.** Each row stores
  `min_level`, `ability_points`, repeatability, prerequisites and grant rules
  (`db/schema/catalog-sources.ts:40-77`). The SRD parser produces 17 definitions,
  parses level/ability/feature prerequisites, derives 0/1/2 ability points, and
  currently generates rules only for Magic Initiate, Skilled and Fighting Style
  (`src/rules/feats-srd.ts:35-63`, `:89-186`, `:188-265`, `:267-328`). Numeric
  choices such as Grappler's allowed abilities and ability cap remain trapped in
  prose, so a complete level-up feat picker cannot be a select box over today's
  rows.
- **D101's full catalog is exactly 17 feats, and today's safe mechanical split
  is narrower than the numeric-looking prose.** The existing character effect
  vocabulary is `damage_resistance | hp_modifier | speed | ability_increase |
  armor_class_bonus | armor_class_formula | attack_ability_override |
  weapon_attack_bonus | weapon_damage_bonus`; the separate
  `ability_override` set-to kind from D83 has not landed. The source corpus has
  no feat-granted flat HP or speed increase and no set-to ability boon. The
  following matrix is hand-derived from `docs/srd/source/feats.txt:28-173`;
  “text” means the exact sourced benefit is shown and is not smuggled into a
  nearby but weaker effect kind.

  | sourced feat | mechanically representable now | sourced benefit that remains text / named gap |
  |---|---|---|
  | Alert | none | Initiative Proficiency adds proficiency bonus to Initiative, for which there is no effect kind; Initiative Swap is a post-roll ally exchange. Initiative is undetermined while this feat is active. |
  | Magic Initiate | two cantrip choices, one level-1 prepared/free-cast choice, chosen list and casting ability through existing grant rules and D87 slots | Spell Change is not structured today; LU-0 reads it from this feat extract and GF-1 plans its same-list/same-level replacement. The once-per-long-rest use remains paper play state under D91. |
  | Savage Attacker | none | once-per-turn weapon damage-die reroll/use-higher mechanic; it is not a flat `weapon_damage_bonus`. |
  | Skilled | skill selections through `skill_proficiency` grant rules | tool alternatives are not modelled by D102. The feat text says that limitation; the wizard does not fabricate tool rows or claim that an unrecorded tool is a skill. |
  | Ability Score Improvement | +2 to one ability or +1/+1 to distinct abilities, maximum 20, as `ability_increase` rows | none. |
  | Grappler | +1 Strength or Dexterity, maximum 20, as `ability_increase` | Punch and Grab, advantage against a creature grappled by the character, and moving a grappled creature without extra movement. |
  | Archery | none safely | +2 only to attacks with Ranged weapons. `weapon_attack_bonus` exists, but its current scopes are all weapons or one bonded weapon; using either would lie about melee attacks. Affected ranged attack bonuses are undetermined. |
  | Defense | none safely | +1 AC only while wearing Light, Medium or Heavy armor. `armor_class_bonus` has no equipment predicate; an unconditional row would be wrong. AC is undetermined while the condition holds. |
  | Great Weapon Fighting | none | conditional minimum-3 replacement for weapon damage dice on two-handed Melee attacks; not a flat damage bonus. |
  | Two-Weapon Fighting | none | conditional addition of the ability modifier to the extra Light-weapon attack when it is not already added. |
  | Boon of Combat Prowess | +1 to any ability, maximum 30 | turning one missed attack into a hit, refreshed at the start of the next turn. |
  | Boon of Dimensional Travel | +1 to any ability, maximum 30 | a conditional 30-foot teleport after the Attack or Magic action. |
  | Boon of Fate | +1 to any ability, maximum 30 | the reaction-like 2d4 bonus/penalty to a nearby D20 Test and its Initiative/Short/Long Rest recovery. |
  | Boon of Irresistible Offense | +1 Strength or Dexterity, maximum 30 | ignoring Bludgeoning/Piercing/Slashing Resistance and natural-20 extra damage equal to the increased ability score. |
  | Boon of Spell Recall | +1 Intelligence, Wisdom or Charisma, maximum 30 | the 1d4 slot-retention mechanic for level 1–4 slots. It grants no spell choice, so it creates no D87 locator. |
  | Boon of the Night Spirit | +1 to any ability, maximum 30 | conditional invisibility and conditional resistance to every damage type except Psychic and Radiant; a standing `damage_resistance` row would be false outside Dim Light/Darkness. |
  | Boon of Truesight | +1 to any ability, maximum 30 | 60-foot Truesight; senses have no effect kind. |

  The net is one fully effect-modelled feat (Ability Score Improvement), eight
  feats with safe `ability_increase` rows plus sourced text (Grappler and seven
  Epic Boons), two feats with non-effect grant machinery (Magic Initiate and
  Skilled, both with stated limits), and six wholly text-modelled feats (Alert,
  Savage Attacker and the four Fighting Style feats). This classification is a
  checked source-to-vocabulary contract, not a promise to simulate prose.
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
  and level (`src/commands/level-up-class.ts:208-253`). D101 therefore requires
  replacing this arm with one feat-source writer. Ability Score Improvement
  uses the same source, eligibility, application and provenance path as the
  other 16 definitions.
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
- **Expertise is currently a stated gap, not a mechanic.** The sheet always
  emits `no_expertise`, the skill resolver adds proficiency only once, and the
  guided skills step merely warns for a level-1 Rogue
  (`src/queries/character-sheet-builder.ts:261-270`, `:457-474`;
  `src/rules/sheet.ts:1090-1104`; `src/builder/contracts.ts:896-910`). The
  committed full SRD text says Bard gains two choices at levels 2 and 9, Ranger
  gains one at level 2 and two at level 9, Rogue gains two at levels 1 and 6,
  **and Wizard's level-2 Scholar grants one choice from six named proficient
  skills** (`docs/srd/full/srd-5.2.1.txt:2004-2009`, `:3541-3551`,
  `:3703-3707`, `:4682-4690`). D90 says every granting class; the owner's
  parenthetical list was not a closed set, and the sourced Wizard occurrence
  must not be dropped. These counts/pools live in prose rather than the class
  tables. Per `docs/srd/SOURCE.md`, implementation must first slice an attributed
  `docs/srd/source/class-expertise.txt`, register its checksum, and test the
  slice against the committed full text.
- **Skill provenance exists and is the deletion authority.**
  `character_skill_grants` is the source of truth; active distinct grants feed
  the sheet, and `rebuildSkillProjection` is the sole deriving writer of the
  transport projection (`src/grants/skill-grants.ts:24-38`, `:72-123`).
  Generator deactivation orphans a removed source's grants and rebuilds that
  projection (`src/grants/grant-rule-slot-generator.ts:800-850`). There is no
  parallel Expertise grant table yet.
- **The current skill-grant uniqueness cannot represent D97's overlapping
  provenance.** The partial unique index permits only one active row per
  `(character_id, skill)` (`db/schema/character.ts:540-556`), even though the
  read resolver already selects distinct skills. D97 explicitly requires a
  skill genuinely claimed by two sources to survive deletion under the other
  grant. LU-6 must remove that character/skill uniqueness, preserve the
  source/grant/ordinal identity, and keep duplicate-prevention as a
  rule-specific choice validation rather than a schema claim that two grantors
  cannot exist.
- **A local inverse exists, but durable level-up undo semantics do not.**
  `LevelUpClassCommand` captures a pre-write snapshot inverse
  (`src/commands/level-up-class.ts:274-288`), and the executor stores it in
  `character_operations` (`src/commands/character-command-executor.ts:274-315`).
  That journal is already classified out of snapshot, portable backup and share
  transport (`src/domain/contracts/tables.ts:260-280`). The planner's usable
  undo/redo stacks, however, are arrays in one `PlannerSession`; reload loses
  them (`src/ui/screens/planner/screen.ts:100-174`). No row marks a level inverse
  consumed or proves that the current aggregate still equals the inverse's
  post-state.
- **There is no general import reconciliation engine to reuse yet.** Backup and
  share imports restore document rows and, when provenance grants are present,
  call only `rebuildSkillProjection`
  (`src/backup/character-backup.ts:2520-2560`;
  `src/sharing/character-share.ts:2160-2180`). Class source/grant
  synchronization is reusable in `syncClassSourceState`, and source
  deactivation already tombstones generated spell and skill children
  (`src/commands/update-class.ts:70-126`;
  `src/grants/grant-rule-slot-generator.ts:800-850`), but D97's “same as import”
  engine must first be created and then called by both import paths and
  no-inverse level deletion.
- **Multiclass primary abilities are sourced but currently discarded.**
  `class_definitions.primary_ability_expression` exists as nullable text
  (`db/schema/catalog-classes.ts:190-220`), but repository search finds no
  seeding writer or read-side evaluator. `class-core-traits.txt` prints all
  twelve Primary Ability rows, and `class-traits-srd.ts` recognizes the field
  label while omitting it from `SrdClassTraits`
  (`docs/srd/source/class-core-traits.txt:19-304`;
  `src/rules/class-traits-srd.ts:93-126`). The sourced multiclass rule requires
  13 in the new and current classes (`docs/srd/source/multiclassing.txt:15-29`).
  GF-0 must parse `one_of` versus `all_of`, seed/decode that typed expression,
  and produce D96's named `met | unmet | unprovable` result. This straight-class
  wizard never blocks on it; it carries any existing unmet or unprovable
  multiclass-entry condition as a permanent warning.
- **Neither requested Level Up front door exists yet.** The character list card
  currently offers Open workspace, Share and Delete
  (`src/ui/screens/character-list/character-list.ts:319-470`), and the sheet
  header offers All characters and Open planner
  (`src/ui/screens/sheet/sheet-view.ts:870-900`). D85 now pins both to add a
  Level Up action targeting the same route; the planner stays reachable and
  keeps all of its existing writers.
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
- **Resource maxima are not wizard choices.** D91 puts Rage uses, Focus Points,
  Channel Divinity and the multiclass spell-slot maximum on the character sheet
  with empty printed boxes. Revision 3 may show a sourced spell-capacity delta
  in Gains, but it does not add resource trackers or resource-choice screens to
  this wizard.

## 1. Outcome and boundary

The outcome is a dedicated route that advances one **held, bundled class** by
exactly one class level and one total character level:

```text
/characters/:characterId/level-up
```

One run has one draft, one target class and one final `level_up_class`
transaction. Until confirmation, the draft is UI memory only; reload returns to
the class screen and no character data has moved. After confirmation, the new
level, every spell/skill/Expertise choice made in the wizard, and every generated
grant are ordinary persisted character state. D70 still permits subclass,
spell, Expertise and Epic Boon choices to remain unmade: their durable grant or
choice rows reload, share and print with permanent warnings. The ASI occurrence
becomes one required **feat** decision: every qualifying row from the
17-feat corpus is eligible to satisfy it, and Ability Score Improvement is the
default-marked member rather than a separate arm.

Revision 3 is intentionally **two implementation units with one ratified
contract**:

1. **Guided choices foundation** models Expertise and separates shared
   eligibility/assignment from row addressing. Guided creation adopts the same
   services for its level-1 spell and Rogue Expertise screens after its earlier
   class/skill steps have already materialized durable rows. Level-up adds the
   logical pre-ID address because its new rows cannot exist before confirmation.
   This satisfies the creation half of D87/D90; the same entitlement also serves
   Wizard Scholar at level 2.
2. **Level-up transaction and route** consumes that foundation and commits the
   level plus selected spell, skill and Expertise choices atomically.

Calling the first unit “future LU-SPELLS” would contradict D87. Calling all of
it one UI dispatch would hide the largest cross-flow dependency.

This is **straight-class advancement** in D56's sequencing sense:

- it may advance a class the character already holds;
- if the character holds more than one class, it may advance any one of those
  held classes;
- it does not add a new class and shows no “Add class” card;
- multiclass entry remains in the planner until its own wizard unit can show the
  D49 advanced-player warning and D96's permanent ability-minimum warning
  together. The minimum warns and allows; it never becomes a prerequisite
  refusal.

The wizard guides bundled 2024 classes only, matching D52. An imported/homebrew
class stays readable and editable in the planner; the wizard says it cannot
derive that class's level features, ASI schedule or hit die and does not pretend
to guide it.

The visual inspiration is the **information architecture**, not BG3 assets,
copy, arrangement or trade dress: a strong level heading, one consequential
decision at a time, conditional screens only when that level creates the choice,
and a final before/after review.

After commit, the Complete screen offers **Undo last level-up** when an exact
local inverse is still applicable. If it is absent or stale, level deletion
remains available through D97's best-effort reconstruction path. Neither path
can reduce total character level below 1.

## 2. The level-up seam

Create `src/builder/level-up-wizard.ts` as an extract-free contract module and
re-export only shared types from the existing `src/builder/level-up.ts`. It owns:

```ts
type LevelUpStep =
  | 'class'
  | 'gains'
  | 'subclass'
  | 'feat'
  | 'epic_boon'
  | 'skills'
  | 'expertise'
  | 'spells'
  | 'review'
  | 'complete';

type LevelFeatChoice =
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
  feat_choice?: LevelFeatChoice;
  skill_choices: readonly PlannedSkillChoice[];
  expertise_choices: readonly PlannedExpertiseChoice[];
  spell_choices: readonly PlannedSpellChoice[];
}
```

The guided-choice foundation owns logical locators that exist before generated
row IDs:

```ts
type PlannedGrantSource =
  | { kind: 'selected_class' }
  | { kind: 'selected_class_subclass' }
  | { kind: 'selected_feat' }
  | {
      kind: 'existing_source';
      source_instance_id: CharacterSourceInstanceId;
    };

interface PlannedGrantLocator {
  source: PlannedGrantSource;
  rule_key: GrantRuleKey;
  ordinal: GrantOrdinal;
}

type PlannedSpellChoice =
  | {
      kind: 'slot_selection';
      locator: PlannedGrantLocator;
      spell_version_id: SpellVersionId;
      mode: 'new' | 'replace';
    }
  | {
      kind: 'spellbook_acquisition';
      locator: PlannedGrantLocator;
      spell_version_id: SpellVersionId;
    };

interface PlannedSkillChoice {
  locator: PlannedGrantLocator;
  skill: Skill;
}

interface PlannedExpertiseChoice {
  locator: PlannedGrantLocator;
  skill: Skill;
}
```

These are command addresses, not a second stored identity. After generation the
command resolves each locator to exactly one active
`spell_selection_slots`, `wizard_spellbook_entries`,
`character_skill_grants` or `character_skill_expertise_grants` fact and applies
the same shared validation used by the planner's ID-addressed command and
spellbook grant rule. Zero or several matches is a structured refusal and rolls
the transaction back.

The actual branded types already present in `src/domain/ids.ts` and
`src/domain/enums.ts` are used; the sketch uses their semantic names and does not
authorize bare `number` aliases.

The seam also owns:

- exact route matcher and `levelUpPath(characterId)`;
- ordered-step derivation from the read model and draft;
- RPC method names for state, planned-choice eligibility and preview;
- panel and control locators used by unit/browser tests;
- `LevelUpWarningKey` and its presentation lookup;
- the pinned sheet/list entry contract in §11.

There is no persisted `wizard_run` table. The durable facts are the class level,
source instances, effect rows, spell/skill/Expertise grant rows and the new
level-granted feat choice in §5. Navigation state is not character state.

The seam also defines `FeatApplicationPlan`, the one pure projection between a
selected sourced feat and its consumers:

```ts
interface FeatApplicationPlan {
  feat_content_key: ContentKey;
  eligibility: FeatEligibilityResult;
  config: JsonObject;
  effects: readonly PlannedCharacterEffect[];
  grant_rules: readonly GrantRuleObject[];
  text_benefits: readonly FeatTextBenefit[];
  undetermined_numbers: readonly DerivedNumberId[];
}
```

It is derived from the feat definition, the projected character and selected
configuration; it is not persisted and is not a second benefit catalog. The
picker, preview and command call the same builder. Its `effects` arm may emit
only existing `character_effects` kinds. Its `grant_rules` arm feeds
`GrantRulePlanner`. This is the named D101/D87 seam: Magic Initiate produces
three planned spell locators from `selected_feat`, while Boon of Spell Recall
produces no locator because it changes slot expenditure rather than granting a
spell. `text_benefits` carries the sourced mechanics the application does not
simulate, and `undetermined_numbers` prevents a partial effect model from
printing a confident wrong number.

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
- `asi_level_feat` applicability from `asiLevelsForClassName`;
- `epic_boon` applicability from the same class-table feature cell at 19;
- all 17 sourced feat candidates, each with
  `qualified | unmet | unprovable`, repeat/config availability and a named
  reason, plus the derived `FeatApplicationPlan` for a selected qualified feat;
- the target-level planned skill, Expertise and spell grants, addressed by
  source/rule/ordinal rather than fabricated row IDs;
- which planned spell slots are newly unlocked, which existing slots are
  replaceable on this class level, and the shared eligibility constraints for
  each;
- every active skill proficiency with its surviving grant provenance, plus
  target-level Expertise occurrence/count;
- permanent multiclass-minimum presentations for later-acquired classes,
  including `met | unmet | unprovable`, the primary-ability expression and the
  resolved score(s).

The read model never substitutes for a missing hit die. A bundled class missing
its traits row is shown but disabled with “Hit die unknown; fixed HP cannot be
derived.” That is an unavailable legal calculation, not a guessed d8.

Replace the narrowly named private parser in `class-asi-levels-srd.ts` with a
single public class-level feature parser that returns the reassembled feature
cell and derives both `hasAbilityScoreImprovement` and `hasEpicBoon`. Keep
`asiLevelsForClassName` as a thin consumer while callers migrate; do not create a
second parser over the same fixed-width table. The parser remains the source of
truth—no per-class literals in UI or command code.

The class feature cell may identify that Expertise occurs, but it does not
supply Bard/Ranger/Rogue/Wizard pick counts or spell replacement permissions. Those
facts come from the new attributed class-Expertise and class-spellcasting prose
extracts. One typed entitlement reader combines table occurrences with prose
counts; UI and command code do not search raw feature strings independently.

`queries.characters.levelUpPlannedEligibleSpells` accepts the character,
revision, selected class and one `PlannedGrantLocator`. The server recomputes the
target grant plan, rejects a locator that is no longer in it, and searches with
the same `SpellSelectionConstraint` used to refresh a durable slot. Factoring
that constraint out of `SpellSelectionEligibility` is the enabling change: a
planned slot and a stored slot share one predicate without inventing a temporary
database row or holding a rollback transaction open across UI requests.

## 4. Screen sequence

The step rail is computed after class selection. Inapplicable steps are omitted,
not shown disabled. “Back” changes only the in-memory draft; “Cancel” returns to
the launch surface without a write.

### 4.1 Class — always first

Offer one card per held bundled class:

- `Fighter 5 → Fighter 6`, not a free numeric field;
- current and target total character level;
- a short sourced list of feature names at the target class level;
- any existing unmet or unprovable multiclass-primary-ability condition for
  this character, visibly permanent and explicitly non-blocking;
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
  Do not add Rage, Focus, Channel Divinity or other resource-maximum cards;
  D91 assigns those maxima and empty boxes to the sheet.
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

### 4.4 Feat choice — only at that class's ASI levels

Render only when the selected class's parsed table says the target class level
has Ability Score Improvement. This is where Fighter 6/14 and Rogue 10 matter;
a Wizard at 6 must never see it.

Render all 17 sourced feat cards through one card and selection component.
Ability Score Improvement carries the **class default** marker required by D68,
but it is a normal `feat_content_key`, normal feat source and normal
`FeatApplicationPlan`, not a separate radio arm or privileged payload shape.
No other legal feat is called homebrew or a departure.

Each card shows name, source category, minimum level, repeatability, ability
points, prerequisite result, its mechanically applied benefits and its exact
text-only benefits. Qualified cards are selectable; unmet and unprovable cards
remain visible but disabled with their named reason. In particular:

- Ability Score Improvement renders +2 to one ability or +1 to two distinct
  abilities, capped at 20;
- feats with `ability_points = 0` show D53's warning: choosing this feat grants
  no ability increase;
- feats with one point render the sourced allowed-ability set and cap;
- feats with two points render the sourced +2/+1+1 control;
- Magic Initiate gathers spell list and casting ability because its source
  cannot generate without them. `FeatApplicationPlan.grant_rules` then creates
  its two cantrip and one level-1 spell locators on the Spells screen in §4.8;
- Skilled exposes the skill part of its existing grant rule. Its tool
  alternative is printed as an unmodelled benefit under D102, never coerced to
  a skill and never hidden;
- repeatable feats are selectable only when their repeat rule and configuration
  can be satisfied. Magic Initiate requires a list not used by another active
  instance; Skilled and Ability Score Improvement may repeat; every other
  active feat is unavailable with the non-repeatable reason;
- Fighting Style feats require the sourced Fighting Style Feature entitlement;
  Boon of Spell Recall requires Spellcasting; Grappler requires projected
  Strength or Dexterity 13; Epic Boons require projected total level 19;
- the six wholly text-modelled feats and every partially modelled feat display
  the §0 coverage statement before selection. Alert, Archery and Defense also
  name the derived number that becomes undetermined rather than printing a
  confidently incomplete result.

Per the later, explicit D80 refusal count, this screen has no “Decide later.”
Confirmation cannot proceed without one qualified feat. The command retains
the historical structured `ability_increase_required` refusal as D80's fixed
server-side key even when the qualifying selection is a zero-point feat; its
message becomes “Choose a feat for this class level.”

### 4.5 Epic Boon — target class level 19 only

Epic Boon is not an ASI occurrence and must not be smuggled into
`asiLevelsForClassName`. The class feature cell names it independently.

Offer qualified Epic Boon feats, their one-point ability choice and cap 30.
Because D80 preserves only the ASI refusal while D70 governs other owed choices,
this screen includes “Decide later.” The durable choice row in §5 stores null,
and the wizard/sheet warn until it is resolved.

If the owner intends D80's required-choice exception to cover Epic Boon too,
that is one policy-arm change in the seam and command—not a schema change.

### 4.6 Skill choices — only when this level creates them

Render after the feat/Epic Boon screen because the selected feat may create a skill
grant. It shows only planned grants that do not already have a durable selection,
using the same pools, distinct-skill rules and recommended/default labelling as
the existing guided skills step.

- The screen writes only the draft's logical source/rule/ordinal choices.
- “Decide later” is allowed; the command still materializes the unfilled durable
  grant and the shared warning survives Complete, sheet and print.
- `Skilled` is the exception at the rule boundary because its three ordinals are
  **skill or tool**, while D102 forbids structured tool facts. The screen may
  fill zero to three ordinals with skills. An unfilled `allows_tool_instead`
  ordinal is not materialized as an owed skill and does not emit the false
  warning “choose a skill”; it contributes the permanent
  `unmodelled_tool_alternative` rules gap and the sourced Skilled text instead.
  Pure skill entitlements still materialize unfilled rows normally.
- A choice is revalidated after every earlier draft change. Selecting a
  different feat discards stale skill and downstream Expertise choices.
- No bundled 2024 class in the currently sourced Expertise set grants new skill
  proficiency picks at the same Expertise level, but the ordering is structural,
  not based on that accident. Imported/unprovable same-level dependencies defer
  Expertise and warn rather than offering an ineligible skill.

### 4.7 Expertise — only at a sourced granting level

Render after every skill-proficiency screen. Bard 2/9, Ranger 2/9, Rogue 1/6 and
Wizard Scholar 2 come from the attributed Expertise extract, including the
correct pick count and any narrower skill pool. The options are active, resolved
skill proficiencies that do not already have active Expertise; Wizard Scholar
further limits them to Arcana, History, Investigation, Medicine, Nature or
Religion.

- A level-up choice is addressed by planned class-source rule key and ordinal;
  after class grant generation the command fills the corresponding durable
  Expertise grant.
- “Decide later” creates or leaves that grant unfilled and produces the same
  permanent D70 warning in the wizard and sheet.
- If an underlying proficiency is later orphaned, its Expertise grant becomes
  orphaned with a named reason. It never floats onto an untrained skill and
  never silently keeps doubling the sheet number.
- The skill resolver adds the proficiency bonus once for proficiency and once
  more for active Expertise. The constant `no_expertise` sheet gap is deleted
  when this lands, not retained or reworded.

Guided creation consumes this same screen after species, class, background and
feat skill grants. That places Rogue 1 Expertise after all level-1
proficiencies, as D90 requires.

### 4.8 Spells — only when this level creates or permits choices

Render after subclass, selected-feat configuration, skills and Expertise so
all spell-granting sources for the transaction are known. The plan includes the
selected class/subclass, the newly selected feat and active existing sources
whose own rules trigger on gaining any level (Magic Initiate's spell change is
the bundled fixture). Group planned choices by class, subclass or feat and label
each as one of:

- **New cantrip/prepared/known/spellbook choice** — an ordinal whose entitlement
  first becomes active at the target level. Wizard's two spellbook acquisitions
  are planned grant-rule acquisitions and materialize in
  `wizard_spellbook_entries`, not fake prepared slots;
- **Replace one spell** — only when the sourced class prose permits a replacement
  on gaining this class level; choosing it replaces one existing unlocked
  selection, and skipping it preserves the old spell;
- **Always prepared/fixed** — read-only, because the grant generator owns it.

Search runs through `levelUpPlannedEligibleSpells`; the selected version key and
ID are kept in the draft and revalidated inside the command. Recommended spells
are marked as defaults under D68; alternatives are simply alternatives.

“Decide later” is allowed for new non-fixed choices. The row is generated empty,
and the existing unfilled-slot presentation becomes a permanent warning.
Wizard spellbook acquisitions use nullable generated
`wizard_spellbook_entries` acquisition rows on the same terms; the planner gains
an addressed spellbook remedy rather than hiding an owed choice in opaque source
config. An optional replacement has no owed-choice warning when skipped because
retaining the current spell is a complete choice. Magic Initiate selections
appear here after its list and casting ability were chosen in Feat Choice.

The screen does not call `set_slot` before confirmation. Confirmation generates
or revives the durable slots and applies every selected logical locator inside
the one `level_up_class` transaction through the same selection validator.
Guided creation uses the same picker/eligibility and assignment service for its
already durable level-1 slots, writing through the existing `set_slot` command
layer. Guided creation is a persisted multi-step flow today; this plan does not
falsely turn its whole run into the level-up command's one transaction. Both
flows share one spell model even though their row addresses differ.

### 4.9 Review and confirm — always

Show:

- class and level being gained;
- selected subclass or an explicit owed-choice warning;
- selected class-level feat or Epic Boon, its applied effects, grant choices and
  sourced text-only benefits;
- selected or deferred skill, Expertise and spell choices, including any
  optional spell replacement;
- fixed HP delta;
- final projected HP, ability scores, proficiency bonus, AC and initiative;
- newly created post-level choice warnings that the preview can prove;
- every still-true permanent multiclass-minimum warning; it never disables
  Confirm;
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

### 4.10 Complete — after the transaction

Reload the committed sheet and shared outstanding-choice query. Show:

- the new class and total level;
- the same D67 final-number cards;
- the committed spell and Expertise choices;
- every outstanding choice, with subclass and deliberately deferred spell,
  skill, Expertise or Epic Boon choices prominent;
- links to the planner remedies and the character sheet;
- “Undo last level-up” when the exact local stack entry in §8 is applicable,
  otherwise “Remove latest level (best effort)” with an explicit reconstruction
  explanation;
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
| `choice_kind` | closed `asi_level_feat | epic_boon` |
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

For pre-migration characters, a boot reconciler first recognizes the **exact
legacy level-command writer fingerprint**: class-owned `ability_increase`
effects, the exact class/level ASI label and one legal +2 or +1/+1 group. Only
that complete, unambiguous shape is converted to a seeded ASI feat source and
choice provenance. A merely similar label, same-level feat or partial group is
not proof; the reconciler creates an unresolved row, preserves the old effect
and warns. That distinction gives D97 attributable legacy ASI rows it can remove
without turning fuzzy labels into deletion authority. No real user characters
exist per D52, but imports and fixtures still deserve the non-destructive rule.

### 5.2 Replace the ASI-only payload arm

`LevelUpClassCommand` keeps its discriminator and class/target/subclass fields.
Replace top-level `ability_increases` with:

```ts
feat_choice?:
  | {
      kind: 'feat';
      feat_content_key: ContentKey;
      config: JsonObject;
      ability_increases: readonly LevelUpAbilityIncrease[];
    }
  | { kind: 'defer_epic_boon' };
skill_choices: readonly PlannedSkillChoice[];
expertise_choices: readonly PlannedExpertiseChoice[];
spell_choices: readonly PlannedSpellChoice[];
```

At an ASI level, the field is required and must be `feat`. Every one of the 17
sourced definitions reaches this same arm when its prerequisites and repeat
rules are satisfied. At Epic Boon it may
be a qualified feat or `defer_epic_boon`. At any other level it is rejected.

The command, inside its existing transaction:

1. validates class-held, adjacency and total-level guards;
2. derives the target occurrence from the class-table parser;
3. resolves and rechecks feat eligibility, repeatability and configuration
   against server-side state, then builds the same `FeatApplicationPlan` used by
   preview;
4. updates the class level and optional subclass;
5. creates/reactivates the feat source with acquisition timing at the target
   character level;
6. writes only the plan's expressible effects, owned by that feat source, using
   the feat's structured point budget, allowed abilities and cap; it never
   converts a text-only benefit to a broader effect;
7. records the level-feat choice pointer, or the deferred Epic Boon row;
8. runs the grant generator for the class, subclass and feat, including
   nullable Wizard acquisition rows and durable skill, Expertise and spell
   choice rows;
9. resolves each logical choice locator to exactly one generated active row,
   applies selected skills and Expertise through their shared grant writers, and
   applies slot/spellbook choices through their shared eligibility/assignment
   services;
10. records selection acquisition provenance needed by D97's no-inverse
    reconstruction;
11. returns the existing snapshot inverse.

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
- one exhaustively checked source-benefit coverage projection for all 17 rows:
  `effect | grant_rule | text`, including the affected derived-number key when
  omitted mechanics make a displayed number undetermined.

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

`FeatApplicationPlan` records and generates every mechanic the existing effects
and grant rules safely understand. Its coverage switch is exhaustive over the
17 content keys and has no default arm. Source tests compare its classification
to a hand-authored oracle derived from the §0 matrix; production output never
regenerates that expectation.

This dispatch does not add effect kinds or broaden effect predicates. In
particular, it refuses the tempting but false mappings `Alert ->
ability_increase`, `Archery -> weapon_attack_bonus(any_weapon)`, `Defense ->
armor_class_bonus(unconditional)`, `Great Weapon Fighting ->
weapon_damage_bonus`, and `Night Spirit -> standing damage_resistance`.
Ability Score Improvement, Grappler and each Epic Boon use
`ability_increase` with the sourced options and maximum. Magic Initiate and
Skilled use grant rules; every other mechanic remains sourced feature text.
When omitted mechanics affect a displayed total, the shared warnings layer
marks that total undetermined with the specific missing mechanic. A confidently
wrong initiative, ranged attack bonus or conditional AC is not an acceptable
“recorded feat.”

D83's future `ability_override` is accepted by the plan builder only after that
kind actually lands in `characterEffectKinds`, its row contracts and the
resolver. No feat in this 17-row corpus requires a set-to ability effect, so
revision 3 neither schedules nor anticipates it with a placeholder column.

Magic Initiate is the corpus's only spell-granting feat. Its selected list and
casting ability are part of `FeatApplicationPlan.config`; its existing two
`choice_from_list` rules flow into `GrantRulePlanner` under
`{ kind: 'selected_feat' }`, producing two cantrip ordinals and one level-1
ordinal before commit. LU-0 promotes its already sourced Spell Change paragraph
to the normalized replacement entitlement, and GF-1 resolves both new picks and
that optional replacement through the same D87 constraint/assignment services.
Boon of Spell Recall stays outside this seam beyond its +1 ability effect: its
slot-retention roll creates no spell selection and no resource tracker.

This is the largest dependency in the plan and is split from the UI in §13.

### 5.4 Expertise grants and exact skill math

Add `character_skill_expertise_grants`, deliberately parallel to
`character_skill_grants`:

| column | meaning |
|---|---|
| `id` | branded `CharacterSkillExpertiseGrantId` |
| `character_id` | composite ownership guard |
| `source_instance_id` | class/source that grants the occurrence |
| `grant_key`, `ordinal` | stable entitlement identity |
| `granted_at_class_level` | sourced class level that created it |
| `skill` | nullable owed choice |
| `state`, orphan reason/time | active or orphaned provenance |
| timestamps | normal carried row metadata |

Unique `(source_instance_id, grant_key, ordinal)`. A selected skill must be held
by an active `character_skill_grants` row and must not already have active
Expertise for this character. SQLite cannot express “references any active row”
as a static foreign key, so the command rechecks it transactionally and the
reconciler orphans Expertise when the last underlying proficiency grant
disappears. The read side counts distinct active Expertise grants, never the
transport projection.

This table is character state: snapshot, portable backup and share carry it.
The **undo stack metadata** in §8 is different and is explicitly local-only.
Historical/imported characters get unresolved Expertise grants only when a
bundled class/level entitlement is provable; the reconciler never guesses a
chosen skill.

`character_skill_proficiencies` remains a transport projection. Expertise does
not overload it with a rank column and does not become a second proficiency
writer.

## 6. Exact preview, not parallel arithmetic

Add `previewLevelUp(db, characterId, payload)` beside the command. It:

1. captures the character state before;
2. opens a database transaction;
3. applies the same `LevelUpClassCommand` body used by commit, without executor
   revision/audit rows;
4. generates prospective grants and applies the draft's planned
   skill/Expertise/spell choices through the same internal writers as commit;
5. builds `CharacterSheet` and completeness from the resulting state;
6. throws a private sentinel carrying the preview result;
7. catches only that exact sentinel outside the transaction;
8. asserts the post-preview captured state equals the before snapshot in tests.

The repository already uses the sentinel rollback pattern for share preview
(`src/sharing/character-share.ts:1376-1399`). The preview must not reimplement
HP, AC, feat effects, Expertise math, grant generation or spell assignment in a
query object. Its value is that the review sees the state the real command would
create—including the landed AC resolver, the selected spell section and only
genuinely deferred choice warnings—then rolls every row back.

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

## 7. Guided spell choices are in, with one stored slot model

D87 selects the planning architecture revision 1 left open: stable logical
grant locators before commit, mapped to the existing durable slots during the
atomic command.

The guided-choice foundation extracts three reusable pieces:

1. `GrantRulePlanner` evaluates the effective target-level class, subclass and
   configured feat rules without writing rows. Its output uses
   `(source role, rule_key, ordinal)` and the same normalized grant-rule type as
   `GrantRuleSlotGenerator`.
2. `SpellSelectionConstraint` is the pure eligibility input shared by planned
   search and `SpellSelectionEligibility.refresh(slotId)`.
3. `assignSpellSelection` owns selection validation and row updates. Existing
   `set_slot`, guided creation and `level_up_class` call it; only their address
   and transaction owner differ.

The command mapping order is fixed: validate every planned locator against the
target rule plan → update level/configure sources → generate slots and nullable
spellbook-acquisition rows → resolve every generated logical locator → recheck
eligibility/distinctness → assign slot or spellbook selections. A missing, duplicated,
locked or newly ineligible locator refuses the entire command. The rollback
preview follows that identical order.

New ordinals and optional replacements are different facts. A new required
ordinal left blank is an outstanding choice. A replacement entitlement is a
one-level opportunity over an existing active slot; declining it retains the
old assignment and creates no warning. The new attributed spellcasting prose
extract records which bundled classes allow which replacement, so the UI never
generalizes “whenever you gain a level” from one class to another.

Slot selections persist only in `spell_selection_slots`; Wizard acquisitions
persist only in the evolved `wizard_spellbook_entries`. GF-1 makes
`spell_version_id` nullable and adds source/rule/ordinal, acquisition-level and
state/orphan provenance, with uniqueness for both logical ordinal and selected
spell. Existing config-driven acquisitions migrate/reconcile into those rows,
then the table becomes the one authority; no config-plus-row duplicate survives.
No temporary slot row, session-storage payload or post-confirm `set_slot` batch
is introduced. The planner continues to edit the same committed rows after the
wizard.

## 8. Persistent undo and no-inverse level deletion

### 8.1 Exact local stack

Add `character_level_up_undo_entries`, a local index over the inverse already
stored in `character_operations`:

| column | meaning |
|---|---|
| `id`, `character_id` | local stack identity/owner |
| `level_up_operation_id` | the operation row carrying the snapshot inverse |
| `class_definition_id`, `target_class_level` | the level this entry reverses |
| `after_state_fingerprint` | canonical semantic `CharacterState`, excluding revision/audit/timestamps |
| `state` | `available | consumed` |
| `consumed_by_operation_uuid` | nullable exact-undo operation |
| timestamps | local metadata |

The operation reference is unique and cross-character guarded. The table is
`snapshot: false`, `backup: false`, `share: false`; portable backup and share
schemas do not gain placeholders for it. Candidate audit accepts the table
being empty and entries being absent or partial after local history pruning,
while validating every row that remains. A raw database image naturally carries
it.

The executor creates the available stack row only after it has applied the level
command, captured the exact post-state and inserted the referenced operation,
all inside the same outer transaction. A committed level without its stack row,
or a stack row pointing at an uncommitted operation, is therefore
unrepresentable through production code.

Exact undo is offered only when the current captured character-state fingerprint
equals the top entry's post-state fingerprint. That guard prevents a snapshot
inverse from erasing edits made after the level-up. Applying it is one command
transaction: restore the snapshot, increment revision, append audit/operation
rows, and mark the source level-up operation consumed. The restored state then
matches the preceding entry, so repeated undo works level by level while exact
inverses remain.

Exact undo returns a dedicated signed inverse that carries the after snapshot
and stack-entry ID. If the planner undoes that undo, the dedicated restore
command restores the post-level state and reactivates the same stack entry;
redo consumes it again. A plain `restore_snapshot` cannot mutate stack state.
This keeps wizard undo and planner undo/redo from disagreeing about whether the
same level is available.

### 8.2 Best-effort deletion when exact undo is unavailable

Add an explicit `remove_class_level` command; do not put `level` back on
`update_class`. It removes exactly the selected held class's latest level, or
removes that class row when it was level 1 and another class level remains.
It refuses when total character level is 1, so no path reaches total level 0.
The planner adds one **Remove latest level** action per held class, preceded by
the same impact/warning preview, so an imported character with no wizard
Complete state can still use D97. It never becomes a numeric decrement input.
`previewRemoveClassLevel` runs the exact selected inverse when applicable or the
same reconstruction command body under the §6 rollback sentinel, returning its
mode, before/after sheet, removed/orphaned/preserved provenance and warning
presentations. Confirm carries its revision/fingerprint; it never previews one
reconstruction and commits a newly recomputed target silently.

Removing the original starting class while another class survives is legal
under D97's character-total floor, but it is not silently reinterpreted as if a
later multiclass entry had always been the initial class. The command preserves
surviving grant provenance, leaves the existing deterministic
`no_starting_class` sheet adjudication/warning to identify the HP/proficiency
approximation, and adds that warning to its pre-confirmation impact review. A
later dedicated rule could define promotion; this plan does not invent one or
retroactively mint the surviving class's full starting skill package.

Without an applicable inverse, the command:

1. identifies the target class level and records what can be proven to have
   been acquired there;
2. removes/tombstones the level's feat-choice source, generated feature effects,
   Expertise grants, spell selections and subclass timing that are still
   attributable to that level;
3. decrements/removes the held class row;
4. calls the shared import reconciliation engine;
5. returns a fresh inverse of this best-effort operation for ordinary planner
   undo, without pretending the reconstruction was exact.

To make step 2 evidence-based, this plan adds acquisition provenance where the
current rows cannot answer the question: subclass acquisition class level and
wizard spell-selection class level. Newly generated slot ordinals can derive
their first entitlement level from the sourced progression; a replacement of an
older ordinal is cleared only when its selection provenance still names the
deleted level. Wizard spellbook acquisition rows carry
rule/ordinal/class-level provenance, so deletion can remove the exact owed or
filled acquisition without touching manually/imported spells of unknown origin.
Unknown/imported provenance is preserved and warned, never guessed.

### 8.3 One reconstruction engine, two callers

Create `reconcileCharacterDerivedState(db, characterId)`. It:

- synchronizes every active class/subclass/feat source from current persisted
  facts;
- regenerates only effects and grant rows with known template/rule identity;
- orphans generated rows whose known entitlement disappeared, preserving their
  previous selections for repair/history;
- reconciles skill and Expertise grants, then rebuilds the flat skill transport
  projection;
- preserves imported/homebrew rows it cannot prove generated and emits named
  `unprovable_reconstruction` warnings.

Portable backup import and share import call this engine after their document
rows are restored. `remove_class_level` calls the same export, not a copied
subset. This is a behavior change from today's projection-only import tail and
therefore needs frozen legacy/import fixtures before deletion depends on it.

When a class source disappears, skill provenance decides the outcome: a skill
with another active grant survives; a skill whose only grant was removed
disappears from the resolved sheet and leaves its orphaned grant/warning. The
command never guesses from the flat projection.

That rule requires a schema correction in this dispatch: drop the partial unique
index on active `(character_id, skill)`. Keep uniqueness on
`(source_instance_id, grant_key, ordinal)`, and let each grant rule decide
whether a player-facing selection must avoid an already held skill. The sheet
and transport projection remain `SELECT DISTINCT skill`; duplicate active
grantors change provenance, not the displayed proficiency count. Expertise
stays active until the **last** underlying proficiency grant is gone.

## 9. D70/D95: one permanent outstanding-choice vocabulary

Extract outstanding-choice facts from `character-completeness.ts` into
`src/queries/outstanding-choices.ts`, then compose them in
`src/queries/character-warnings.ts` with non-choice rules/reconstruction
conditions. `CharacterWarningPresentation` has a closed category
`outstanding_choice | rules_condition | reconstruction_gap`, so completeness
can filter choices without pretending an unmet multiclass minimum is a choice.
The shared presentation vocabulary owns typed facts and text for:

- unfilled spell-choice groups;
- unchosen class/source options;
- unfilled skill grants;
- unfilled or orphaned Expertise grants;
- class level 3+ with null subclass;
- deferred Epic Boon choice;
- unmet/unprovable multiclass primary-ability minimums;
- feat benefits intentionally left as sourced text because no exact effect or
  grant-rule vocabulary exists, including `unmodelled_tool_alternative`;
- derived numbers made undetermined by a selected feat's omitted numeric
  mechanic (Alert initiative, Archery ranged attack bonuses, Defense AC while
  armored);
- unprovable best-effort reconstruction facts.

Completeness, planner, `CharacterSheetBuilder` and wizard consume this one
presentation layer. The planner keeps actionable controls only for warnings with
a remedy. `CharacterSheet.gaps` gains per-character warning kinds instead of
only the current constant catalog gaps.
The sheet renders each warning visibly and printably; it is never hidden inside
a D67 reveal because paper cannot hover.

The wizard consumes the same presentation objects:

- draft-time subclass omission is mapped to the same key before commit;
- preview/complete warnings come directly from the rollback/committed query;
- wording is not copied into a UI constant.

Warnings never disable Continue or Confirm, except the ASI-level feat requirement
that D80 explicitly preserves. Catalog gaps and user choices remain distinct:
“No Wizard subclass is bundled” and “Subclass not chosen” can both be true and
need different remedies.

D95 adds no acknowledgement/dismissal state. These warnings stay full-size in
the wizard, planner, sheet and print for as long as their condition remains
true. The existing warning-acknowledgement machinery is not reused for any key
owned here.

## 10. D67 reveal shared by wizard and sheet

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
only. To satisfy D89, the printed sheet includes one plain note that detailed
number-source breakdowns are available on the interactive sheet and are omitted
from print; it does not silently discard hover-only information. Non-number
warnings, gaps, AC exclusions and tie/exclusion explanations remain visible
because they explain a condition or missing fact, not merely the terms of a sum.

The wizard Review and Complete screens use the same primitive with the preview
and committed `CharacterSheet` data. There is one touch behavior and one
accessibility test suite, not a wizard tooltip and a sheet tooltip that drift.

## 11. Coexistence with the planner and the pinned front door

All three surfaces stay:

- **wizard:** the only guided writer for an adjacent held-class level;
- **planner:** expert editing, subclass repair, generated spell choices, source
  configuration, warnings, bulk retuning, undo/redo and save points;
- **sheet and character list:** both render a visible **Level Up** button whose
  sole target is `levelUpPath(characterId)`.

The wizard never embeds the planner screen and the planner never gains a numeric
level field. The sheet/list buttons, wizard and planner share commands, sheet
numbers, warnings and spell slots. There is no `undecided | sheet | planner`
configuration: D85 answered that question. The planner may link to the wizard as
a convenience, but it is not the Level Up front door and does not lose any
writer.

## 12. Controls, with their mechanisms

| control | mutation / failure it must catch | mechanism and fixture |
|---|---|---|
| **LU-ONE-PATH** | restore `level` to `update_class` or add another increment writer | payload validator rejects `level`; wizard is the only production `level_up_class` caller; `remove_class_level` is a separately discriminated decrement/delete command |
| **LU-ADJACENT** | remove the current+1 guard | command test attempts Fighter 2→7 and asserts named refusal and byte-identical state |
| **LU-CLASS-FIRST** | derive gains before a held class is chosen | UI unit asserts first panel/step is `class`; no preview RPC fires before selection |
| **LU-HELD-ONLY** | offer/add an unheld class | read-model fixture has Fighter held and Wizard catalogued; Wizard does not appear |
| **LU-HOMEBREW-HONEST** | substitute defaults for an unbundled class | held homebrew class renders disabled with named missing hit die/feat-occurrence data; no command fires |
| **LU-ASI-PER-CLASS** | hardcode the union or `[4]` | Fighter 5→6 and Rogue 9→10 render Feat Choice; Wizard 5→6 does not; Sorcerer wrapped cells still produce 4/8/12/16 |
| **LU-ASI-REQUIRED** | allow an empty ASI-level payload | command preserves `ability_increase_required`; UI requires one qualified feat, including a legal zero-point feat, and raw RPC without one gets the structured refusal |
| **LU-FEAT-FULL-17** | keep revision 2's partial picker, filter by category, or special-case ASI outside feats | every ASI-level fixture renders the same hand-authored 17 content keys; unmet/unprovable cards are visible with reasons; ASI has only the D68 default marker and uses the same source/payload path |
| **LU-FEAT-ZERO** | infer a +1 from choosing Alert/Archery | D53 fixture selects a 0-point feat and asserts warning, no `ability_increase` row |
| **LU-FEAT-POINTS** | accept the wrong ability/cap/point sum | Grappler permits only STR/DEX +1 cap 20; ASI permits any +2 or +1/+1 cap 20; Epic Boon fixture uses cap 30 |
| **LU-FEAT-PREREQ** | treat unprovable/unmet as qualified | Grappler below 13 and Wizard choosing Fighting Style are unavailable with different reasons; qualified Fighter fixture is available |
| **LU-FEAT-COVERAGE** | map numeric-looking prose to an over-broad effect or silently omit it | a hand-authored 17-row oracle matches `FeatApplicationPlan`: nine feats emit sourced ability effects, Magic Initiate/Skilled emit their supported grants, and Alert/Archery/Defense make the named numbers undetermined; mutations that map Archery to all weapons, Defense to unconditional AC, or Night Spirit to standing resistance fail |
| **LU-FEAT-SPELL-SEAM** | create feat spell picks outside D87 or treat Spell Recall as spell acquisition | Magic Initiate config produces exactly three `selected_feat` locators and commits them atomically; its later same-list/same-level swap uses the same constraint; Boon of Spell Recall produces no spell locator |
| **LU-SKILLED-HONEST** | force three skills, create phantom tool rows, or warn that every unfilled skill-or-tool ordinal owes a skill | Skilled accepts zero to three modelled skill selections; remaining tool-capable ordinals create the sourced D102 coverage gap, no unfilled `character_skill_grants`, and no tool fact |
| **LU-FEAT-ATOMIC** | level moves but feat/effects fail | induce grant-generation failure after the level update; class row, choice row, source, effects and slots all remain before-state |
| **LU-LEGACY-ASI** | delete a lookalike effect or leave a proven old command effect unattributed | exact legacy writer fingerprint migrates to ASI feat/choice provenance; each single-field mutation preserves the effect, creates unresolved choice and warns |
| **LU-HP-FIXED** | add a roll/input or omit Constitution/minimum 1 | browser asserts no HP form controls; integration fixtures cover Fighter CON +2 and Wizard CON −5, showing fixed delta and floor 1, with zero roll rows |
| **LU-SUBCLASS-SAVE** | block level 3 with no option/key | Wizard 2→3 with empty bundled options commits; Complete and sheet carry the same warning key |
| **LU-SUBCLASS-APPLY** | attach another class's subclass | Fighter rejects Arcane Trickster and accepts Eldritch Knight; source/effects regenerate |
| **LU-EPIC-DEFER** | lose or hide a deferred level-19 choice | level 19 commits a null choice row; reload/share/backup and sheet preserve the warning; later resolution clears it |
| **LU-SPELL-PLANNED** | require a durable slot ID before commit or generate a second slot model | caster fixture searches and selects by logical source/rule/ordinal; commit maps it to exactly one generated `spell_selection_slots` row |
| **LU-SPELL-ATOMIC** | commit the level and spell picks as separate revisions | induced second-selection failure leaves level, sources, every slot and history byte-equal; success creates one operation/history group |
| **LU-SPELL-SWAP** | offer replacement to every caster or turn a skipped optional swap into a warning | sourced Bard allow-case and class deny-case; skipped swap preserves the old slot and produces no outstanding choice |
| **LU-SOURCE-SWAP** | inspect only the class being advanced and miss a source triggered by any level | an existing Magic Initiate source offers its one same-list/same-level replacement through an `existing_source` locator; skip preserves it |
| **LU-SPELL-DEFER** | hide a genuinely unfilled new slot | defer one new caster ordinal; Complete, planner, sheet and print share its warning; planner can fill the durable row |
| **LU-CREATION-SPELLS** | satisfy level-up but leave level-1 guided characters incomplete | guided Wizard spell and Rogue Expertise fixtures use durable row IDs through the shared eligibility/assignment services; no logical pre-ID address or second model is invented |
| **LU-WIZARD-BOOK** | force Wizard acquisitions into slots, lose their granting level, or make deferral unrepresentable | Wizard 2→3 generates exactly two nullable acquisition rows; selected rows carry eligible spells, a deferred row warns/remedies in planner, and rule/ordinal/level provenance survives undo/delete |
| **LU-EXPERTISE-SOURCE** | infer grants/counts/pools from memory or table feature names alone | attributed extract proves Bard 2/9 (2+2), Ranger 2/9 (1+2), Rogue 1/6 (2+2), and Wizard Scholar 2 (one from six named proficient skills), with negative controls elsewhere |
| **LU-EXPERTISE-ORDER** | offer Expertise before all proficiency choices | guided creation and level-up step derivation put every applicable skill screen first; unresolved same-level proficiency entitlement defers Expertise with a warning |
| **LU-EXPERTISE-MATH** | double an untrained/orphaned skill or add proficiency more than twice | active grant fixture is base + proficiency + proficiency; removing its last proficiency source orphans Expertise and removes the second bonus |
| **LU-MULTICLASS-WARN** | block advancement or dismiss an unmet minimum | multiclass fixture below 13 advances; wizard/sheet/print retain the same permanent warning with rule, actual score and source |
| **LU-EQUIPMENT-NOOP** | reapply a starting package | count/package/weapon/armor rows before and after ordinary and feat-choice level-ups are identical |
| **LU-PREVIEW-ROLLBACK** | preview leaks a row, revision or sequence change | capture full `CharacterState` and relevant catalog IDs before/after preview and assert equality |
| **LU-PREVIEW-EXACT** | parallel preview arithmetic drifts | preview and subsequent unchanged commit produce identical derived-number/source projections |
| **LU-D67-SOURCES** | hide a prose formula, sum HP in the view or call modifier terms score sources | ability score/modifier, class+species HP, AC and initiative fixtures compare structured source label/amounts to hand-authored expected terms whose result equals the correct face value |
| **LU-D67-TOUCH** | implement hover only or silently omit hover detail from print | browser tests hover, keyboard and tap the same reveal; print screenshot contains final number, no source arithmetic and D89's source-breakdown omission note |
| **LU-D70-ONE-TEXT** | copy warning text into wizard/sheet | both surfaces receive the same presentation object; test compares warning keys and text from one fixture |
| **LU-DOUBLE** | two rapid clicks issue two operations | delayed RPC fixture clicks twice; one call occurs, all navigation is disabled, and the unchanged retry reuses the UUID |
| **LU-STALE** | commit a preview after another edit | mutate revision between preview/confirm; command refuses, reloads, and no level moves |
| **LU-PLANNER-LIVE** | replace/redirect the planner | planner route, spell picker, completeness and subclass control browser journeys remain green |
| **LU-ENTRY** | restore an undecided/planner front door | sheet and every character-list card link to the exact wizard route, including level 20's terminal wizard state; planner remains separately reachable |
| **LU-UNDO-LOCAL** | lose undo on reload or export it | reload exposes exact undo; share/portable backup wire fixtures contain no stack field; raw DB copy retains it |
| **LU-UNDO-SAFE** | apply a stale whole-snapshot inverse over later edits | changed aggregate fingerprint hides/refuses exact undo and routes to reconstruction; unchanged successive levels undo in LIFO order |
| **LU-REMOVE-PREVIEW** | preview one reconstruction and commit another after intervening edits | planner removal preview is rollback-exact and fingerprint/revision-bound; stale confirmation refuses with byte-identical state |
| **LU-LEVEL-FLOOR** | delete the only remaining character level | exact and reconstruction paths both refuse at total level 1 with byte-identical state |
| **LU-STARTING-REMOVE** | silently promote a later class and mint full starting grants | deleting a level-1 starting class with another class surviving preserves that class's multiclass grant provenance and shows the existing no-starting-class adjudication before/after |
| **LU-RECONCILE-ONE** | write a deletion-only reconstruction copy | backup import, share import and no-inverse deletion are instrumented to call the same `reconcileCharacterDerivedState` export |
| **LU-SKILL-PROVENANCE** | guess whether a multiclass skill survives deletion | two-source skill survives under the remaining active grant; sole-source skill orphans and warns; flat projection is never the authority |
| **LU-PORTABLE** | omit durable choices or accidentally export local undo | snapshot/backup/share retain feat, Expertise and spell provenance/warnings; share and portable backup deliberately omit operation/undo metadata |

Mutation fixtures belong in `tests/fixtures/level-up-wizard-mutations.mjs`; they
must mutate the named mechanism, not regenerate expectations from production
output.

## 13. Dispatches — two units, sized by blast radius

The order is strict where noted. No dispatch invents payload, locator or warning
names outside the ratified seam. “GF” is the cross-flow guided foundation; “LU”
is the level-up transaction and route.

### Unit A — guided choice foundation

1. **GF-0 — sourced class-choice facts and seam (L).** Ratify steps, logical
   locators, RPCs and warning keys. Slice/register/checksum the Expertise and
   spell-replacement prose extracts from the committed full SRD. Replace the
   ASI-only table parser with the feature-cell model and typed entitlements for
   ASI, Epic Boon and Expertise. Extend the existing Core Traits parser to
   preserve and seed typed `one_of | all_of` primary-ability expressions, then
   add the D96 evaluator. Exit:
   all twelve class tables, wrapped Sorcerer cells, Fighter 6/14, Rogue 10, Epic
   Boon 19, every Bard/Ranger/Rogue/Wizard Expertise level/count/pool and
   spell-swap allow/deny case has hand-transcribed positive and negative
   controls.
2. **GF-1 — planned grant and spell-selection core (XL).** Add
   `GrantRulePlanner`, logical source/rule/ordinal addresses,
   `SpellSelectionConstraint`, planned eligibility RPC and the shared assignment
   writer. Refactor generator, durable eligibility refresh, `set_slot` and
   planner picker to consume them. Evolve `wizard_spellbook_entries` into
   nullable, addressable acquisition rows and migrate the current
   config-driven acquisitions without losing selected spells. Add selection
   acquisition provenance with migration, snapshot/backup/share contracts and
   frozen fixtures. The planner accepts a normalized configured rule list from
   `FeatApplicationPlan`, so LU-0 can supply Magic Initiate without a
   feat-specific spell path. Exit: planned
   and durable eligibility return identical candidates, Wizard acquisitions
   retain rule/ordinal/level provenance, and one generated slot model plus the
   one existing spellbook model remain.
3. **GF-2 — Expertise model and guided-creation adoption (XL).** Add
   `character_skill_expertise_grants`, generator/reconciler, fill/clear writer,
   exact sheet math and D70 warnings; delete `no_expertise`. Put creation
   Expertise after every skill source. Add level-1 spell screens using GF-1's
   shared picker/constraint/assignment services over the durable slots that
   creation has already generated, including Magic Initiate-generated choices.
   Make the `allows_tool_instead` boundary explicit: selected skill ordinals
   persist, while unrecorded tool alternatives produce the D102 coverage gap
   rather than false unfilled-skill rows. This dispatch owns
   migration, snapshot, backup, share wire/frozen fixtures and creation browser
   tests. Exit: a level-1 Wizard's spell section and Rogue's Expertise math are
   complete without opening the planner.

### Unit B — level-up transaction, reversibility and route

4. **LU-0 — full feat corpus, eligibility and application plans (XL).** Migrate
   the four-value grouping, ability options/cap and typed prerequisite
   evaluator; update seeding, row contracts, schema inventories and source
   tests. Add the exhaustive 17-key `FeatApplicationPlan` coverage switch and
   the named D33 gaps for text-only benefits. Wire only safe existing-vocabulary
   mappings: nine ability-increase feats, Magic Initiate's spell grants and the
   supported skill side of Skilled. Do not widen effect kinds or predicates.
   Exit: every card is deterministically `qualified | unmet | unprovable`;
   every sourced benefit is classified `effect | grant_rule | text`; the
   hand-authored matrix catches over-broad Archery, Defense, Great Weapon
   Fighting and Night Spirit mappings; affected numbers are correct or
   explicitly undetermined.
5. **LU-1 — level feat-choice schema and command core (XL).** Add
   `character_level_feat_choices`; replace the ASI-only arm with the unified
   feat source/application plan; add Epic defer/resolution; retain class-held,
   adjacent and D80's historically named ASI-required refusal. This dispatch
   owns its migration, snapshot, backup/share wire mint/frozen fixture, row
   contracts, audit and inverse tests. Exit: ASI is one normal feat source,
   each of the other 16 qualified definitions can use the identical command
   arm, and class/subclass/feat grant generation is one atomic command before
   guided subchoices are attached.
6. **LU-2 — atomic skill/Expertise/spell choices (XL).** Extend the ratified
   payload, validator and command with GF logical choices. Generate sources and
   grants, map every locator, fill skill/Expertise/spell rows, and reject stale
   or ambiguous mappings in the same transaction. Exit: selected new spells and
   swaps, Magic Initiate's three `selected_feat` locators, supported Skilled
   skill picks and Expertise commit in one revision; induced failure leaves
   byte-identical state. Spell Recall produces no locator.
7. **LU-3 — shared permanent warnings and feat-coverage gaps (L).** Extract
   outstanding-choice presentation, add subclass/Epic/skill/Expertise/spell,
   D96 and D101 coverage warnings, feed planner/sheet/wizard, and keep them
   visible in print with no acknowledgement state. Exit: D70/D95 key-and-text
   equality is executable, and selected text-only/partial feats name what the
   numbers omit.
8. **LU-4 — rollback preview and read model (L).** Implement
   `levelUpState`, planned eligibility, `previewLevelUp`, validators and
   worker/client plumbing. Reuse the real command under rollback and compare
   preview to commit, including selected spells and Expertise. Exit: preview
   changes no row/revision/sequence and its complete sheet projection equals the
   unchanged commit.
9. **LU-5 — D67 source projection, reveal and sheet migration (XL).** Replace
   `SheetNumber.formula` with structured traces, extend every derived-number
   producer, build the hover/focus/touch reveal, migrate the sheet, retain
   warnings and prove print shows final numbers only. It precedes route UI so
   LU-7 consumes one component.
10. **LU-6 — persistent undo and reconstruction (XXL).** Add the local undo
    index/fingerprints, `undo_last_level_up`, acquisition provenance,
    rollback-exact removal preview, `remove_class_level`, the total-level floor and
    `reconcileCharacterDerivedState`. Replace the active character/skill unique
    index with rule-specific duplicate validation so overlapping provenance is
    representable. Move backup/share import to that shared
    engine and prove legacy/homebrew preservation plus provenance-based
    multiclass skill outcomes. The stack metadata stays out of both export
    schemas. This is its own XXL dispatch because import semantics, deletion,
    history, schema and candidate audit must agree before the fallback is safe.
11. **LU-7 — wizard route and screens (XXL).** Build class, gains, subclass,
    full-17 feat/Epic, skills, Expertise, spells, review and complete; in-memory
    draft; operation UUID lifecycle; revision conflict; direct not-found/max
    states; exact-undo/fallback affordances; responsive/a11y behavior. Exit:
    browser journeys cover ordinary, subclass, Fighter 6, Rogue 10, Wizard 6,
    all 17 feat cards with allow/deny reasons, a caster new spell and swap,
    Magic Initiate, Expertise, D96 warning and level 19.
12. **LU-8 — D85 entry and regression closeout (M).** Put Level Up buttons on
    sheet and every list card, both targeting the wizard (level 20 lands on its
    terminal state). Keep planner
    editing live. Run creation, planner, sheet/print, undo/deletion,
    backup/share, build and browser regression. No numeric planner increment
    writer or undecided entry switch appears.

## 14. Assumptions proved locally before finalizing

The following checks were run against the stated working tree:

- `git rev-parse HEAD` returned
  `e5c64b0adcfd56a9dcb829cf72144599f768f18c`.
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
- The same complete extract contains exactly 4 Origin, 2 General, 4 Fighting
  Style and 7 Epic Boon feats. Comparing every benefit to
  `characterEffectKinds` proved the §0 split: only nine feats can emit a safe
  current effect, all nine are `ability_increase`, and none of the corpus uses
  flat HP, speed or D83's not-yet-landed set-to `ability_override`. Archery's
  ranged-only predicate is narrower than either current weapon scope; Defense's
  armor-worn predicate is absent from `armor_class_bonus`; Alert has no
  initiative effect kind. Those three therefore cannot honestly ride the
  tempting numeric kinds.
- `Magic Initiate` is the only one of the 17 feats that grants spell choices:
  its current rules provide two cantrip ordinals and one level-1 ordinal.
  `Boon of Spell Recall` changes whether a level 1–4 slot is expended and grants
  no spell, so it must not create a D87 locator. `Skilled` carries
  `allows_tool_instead`; D102 means the skill arm is representable but tool
  selections are not.
- Direct inspection of the committed full SRD found Expertise at Bard 2/9
  (two choices each), Ranger 2/9 (one then two), Rogue 1/6 (two each), and
  Wizard Scholar 2 (one from six named skills in which the character is
  proficient). `docs/srd/source/` has no Expertise extract yet; `SOURCE.md`
  requires the new slice, per-extract checksum and exact directory/table
  provenance check.
- `spell_selection_slots` has durable `rule_key`/`ordinal` columns and the
  generator derives `slot_key` from source UUID plus those fields, while the
  existing picker, eligibility RPC and `set_slot` payload still accept only a
  numeric durable ID. This proves the logical-locator adapter is new work and
  that a second stored spell model is unnecessary.
- `character_operations` already stores the level command's snapshot inverse
  and is classified out of backup/share, but planner undo arrays are in memory
  and no operation row records consumption or a post-state fingerprint.
- Backup/share import currently calls only `rebuildSkillProjection`; no shared
  whole-character derived-state reconciler exists. `syncClassSourceState`,
  generator tombstoning and skill projection rebuilding are reusable pieces,
  not the D97 engine itself.
- `character_skill_grants` currently has a partial unique index on active
  character/skill, so D97's two-surviving-grant fixture is unrepresentable until
  LU-6 moves duplicate policy out of the schema; the sheet/projection already
  resolves distinct skills.
- The Core Traits extract already contains all twelve primary-ability
  expressions. Its parser recognizes that field label but does not return it,
  and `primary_ability_expression` has no seeding/read consumer; D96 therefore
  requires preserving an existing sourced field, not inventing class literals.
- The sheet and character list currently have no Level Up link; the sheet links
  to planner and the list cards expose workspace/share/delete.
- The working tree was clean before this task. This task edits only this plan.

## 15. Verification ladder

Each dispatch runs its focused unit/integration suite and `npm run typecheck`.
GF-1 runs generator, eligibility, slot assignment and planner suites. GF-2 and
LU-1 run schema, migration, snapshot, backup, share and frozen-wire suites for
their new character facts. LU-2 adds command atomicity and planned-locator
mutations. LU-3 runs completeness, character sheet and print warnings. LU-4
runs command/preview equivalence. LU-5 runs sheet unit/browser/a11y/print. LU-6
runs import, candidate audit, exact undo, no-inverse deletion and provenance
fixtures. LU-7 runs guided creation, level-up and planner browser journeys.

Final verification:

```text
npm test
npm run build
npm run test:browser
```

The final manual pass uses:

1. Fighter 1→2, CON 14 — fixed HP is shown, no choice exists.
2. Wizard 2→3 with no bundled subclass — level saves; wizard and sheet warn.
3. Fighter 5→6 — Feat Choice shows the same 17 sourced cards, marks ASI as the
   class default, enables only qualified/repeatable choices and uses no separate
   ASI payload.
4. Wizard 5→6 — Feat Choice does not appear.
5. Rogue 9→10 — Feat Choice appears with the same 17-card catalog.
6. Fighter 3→4 choosing Alert — no ability increase is invented; its two
   benefits render as sourced text and Initiative is explicitly undetermined.
   Choosing Archery or Defense in qualified fixtures likewise does not create
   an all-weapon or unconditional-AC effect.
7. Bard 1→2, Rogue 5→6 and Wizard 1→2 — Expertise appears after skills with
   sourced count/pool, trained selections add proficiency twice, and deferral
   warns. Bard also exercises its sourced optional cantrip replacement.
8. Wizard 2→3 — choose two spellbook acquisitions and the newly unlocked
   prepared choice; preview and the one committed transaction show all three in
   their existing durable models.
9. Fighter 3→4 choosing Magic Initiate — configure its list/ability and choose
   its two cantrips and level-1 spell through three `selected_feat` locators on
   the same wizard pass and revision. A repeat instance rejects a used list;
   Boon of Spell Recall creates no locator.
10. A caster defers one new spell — Complete/sheet/print warn and the planner
    fills the same durable slot.
11. Any class 18→19 deferring Epic Boon — level saves and the warning survives
   reload, share, backup and print.
12. Preview then commit an AC-changing automatic/subclass effect — before/after
   preview equals the committed resolver result.
13. Rapid double confirm — one request, one level, one history entry.
14. A multiclass character below a sourced primary-ability minimum advances;
    the same permanent warning remains in wizard, sheet and print.
15. Reload after two level-ups, undo twice, and verify both exact snapshots;
    portable backup/share of the intermediate character contain no undo stack.
16. Edit after a level-up, then remove that level through best-effort
    reconstruction; the later edit and a skill with another active grant
    survive, while a sole-source skill/Expertise grant orphans and warns.
17. Import a character with no operation history and delete one latest class
    level; the shared import reconciler runs. Attempting the same on a
    one-level/one-class character refuses without changing state.
18. Guided creation of a level-1 Wizard and Rogue completes spell and Expertise
    screens before Review; neither needs the planner to make its sheet exact.

## 16. Not in this unit

- Adding a new class through the wizard; D56 sequences it later and D49 requires
  its advanced-player warning together with D96's warn-and-allow minimum.
- Removing a non-latest level from within one class, skipping levels, or batch
  leveling. D97's exact/fallback removal of one class's current top level is in.
- Reapplying or changing starting equipment packages during ordinary level-up.
- Rage/Focus/Channel Divinity or other resource-maximum screens; D91 assigns
  maxima and empty boxes to the sheet.
- Copying BG3 artwork, sounds, text, layout or branded visual language.
- Making imported/homebrew class advancement derivable without imported
  progression, hit-die and feature-choice contracts.

## 17. Unresolved risks

1. **Best-effort reconstruction is the highest data-loss risk.** The tree has
   reusable source synchronizers and a skill projection reconciler, but no
   whole-character import reconciler. Turning those pieces into one engine that
   removes only provably generated state, preserves unknown homebrew/import
   rows, and behaves identically from backup, share and level deletion is an XXL
   migration/import problem. LU-6 must land frozen legacy fixtures before any
   no-inverse delete UI is enabled.
2. **Pre-commit grant planning can drift from generation.** D87 requires spell
   and Expertise screens before the durable rows exist. `GrantRulePlanner` and
   the generator must consume one normalized rule representation, and commit
   must reject any logical locator that no longer maps exactly. A planner that
   merely resembles generation would preview eligible spells and then select a
   different durable slot—the most likely atomicity failure in revision 3.
3. **Full choice makes benefit coverage a correctness boundary, not catalog
   decoration.** All 17 feats must be selectable when qualified, but the
   existing vocabulary is intentionally weaker than several benefits:
   ranged-only attack bonuses, armor-conditional AC, Initiative proficiency,
   die replacement, conditional resistance and tool selections cannot be
   represented faithfully. The exhaustive `FeatApplicationPlan` matrix must
   neither grow a secret parallel effect system nor map those benefits to
   broader effects. Its failure mode is a plausible wrong number, especially
   Alert/Archery/Defense. Magic Initiate adds the cross-unit risk: its config,
   three new spell locators and later replacement entitlement must remain one
   normalized grant plan from preview through commit.
