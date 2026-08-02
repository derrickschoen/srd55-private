# W-MC design: BG3-style wizard multiclass entry

Status: binding implementation design only. This document changes no production
code, tests, migrations, persistence contracts, or commits.

> **D147 — OWNER: wizard multiclass, BG3-style flow, SRD prereqs + house-rule
> toggle (2026-08-01):** Supersedes D107's deferral: the level-up wizard SHALL
> support adding a level in a new class, with a BG3-like add-class surface on the
> class step. Rules posture, owner-chosen from three options: ENFORCE the SRD 5.2
> multiclass prerequisites by default (13+ in the new class's primary ability AND
> 13+ in the current class's primary ability; a failing class appears disabled
> with the exact shortfall shown, the D119 pattern), plus a per-character
> "ignore multiclass prerequisites" HOUSE-RULE TOGGLE that unlocks BG3 behavior —
> default off, and when on it is recorded visibly on the sheet as a house rule.
> Entry proficiencies come from the already-parsed multiclass-entry-srd.ts grants;
> slots stay on the effective-caster-level computation.
>
> Sequencing, owner-chosen: design doc authored and reviewed NOW (parallel with
> the cascade); implementation dispatches only after W-D/W-E/W-F merge so
> multiclass lands on a complete wizard. Bar item 3 still closes at W-F.

The quotation is D147 in `.claude/decisions.md`. Decision-log references use
D/F numbers, never line numbers, as F17 requires. D147 supersedes D107's
planner-only deferral and the conflicting entry-time warn-and-allow posture in
D96. D96's non-conflicting standing-violation disclosure and D95's persistence
rule remain binding (§3.2). D119 remains binding for missing hit dice: the
option is present, focusable, non-selectable, and explains why.

## 1. Ruling chain and assumptions

### 1.1 Scope fixed by the rulings

W-MC extends, rather than replaces, the route and step architecture in
`docs/design/2026-07-31-level-up-wizard-route-ui.md`. The existing `class`,
`gains`, conditional-choice, `review`, and `complete` order remains the only
wizard. W-MC widens the Class choice from held classes only to two explicit
groups: held classes to advance and unheld classes to enter at class level 1.

The change does not add batch levelling, level allocation, respec, a second
planner, a second proficiency engine, or spell-slot arithmetic. It adds one new
action arm to the existing one-level-per-pass wizard and routes that arm through
the planner's existing `update_class` entry command.

### 1.2 Assumptions proved from the current tree

Every quoted code/source statement below is from the current tree and carries a
file:line citation. Binding decisions are cited by stable D/F number, as F17
requires. P18 is deliberately a future-seam observation rather than an
assumption about code not yet merged.

| ID | Proven assumption | Current-tree quotation/evidence |
|---|---|---|
| P1 | D147 requires both directions of the score-13 check, the per-character opt-out, visible sheet disclosure, existing entry grants, existing slot math, and post-W-F sequencing. | D147 says “13+ in the new class's primary ability AND 13+ in the current class's primary ability” and “implementation dispatches only after W-D/W-E/W-F merge.” |
| P2 | The route already owns one ordered step vocabulary and exact path seam. | `LEVEL_UP_STEP_ORDER` is `class`, `gains`, conditional choices, `review`, `complete` at `src/builder/level-up-wizard.ts:209-232`; the exact positive-ID matcher and path writer are at `src/builder/level-up-wizard.ts:486-506`. |
| P3 | Current state exposes held classes only and divides them into guideable and missing-hit-die options. | `eligibleHeldClasses` is filtered from `held`, then mapped into disabled/guideable options at `src/queries/level-up-state.ts:319-377`; no unheld catalog query contributes to `class_options` at `src/queries/level-up-state.ts:378-383`. |
| P4 | The D119 card pattern is a focusable article with no input, an accessible name/description, and visible explanation. | `renderDisabledClassOption` emits an `article`, `tabindex="0"`, `aria-labelledby`, `aria-describedby`, and only heading/explanation at `src/ui/screens/level-up/class-gains-steps.ts:123-152`; its no-input assertion is at `tests/unit/ui/level-up-wizard.test.ts:718-745`. |
| P5 | The class step currently renders one radio per guideable option and keeps selection in page memory. | The radio/card construction and change callback are at `src/ui/screens/level-up/class-gains-steps.ts:154-205`; the controller stores `selectedClassId` and resets downstream draft on selection at `src/ui/screens/level-up/level-up-wizard.ts:214-245` and `src/ui/screens/level-up/level-up-wizard.ts:333-346`. |
| P6 | Ability bases are durable, non-null character columns; the level-up query already reads all six and resolves character effects before using a score. | The six columns are `NOT NULL DEFAULT 10` at `db/schema/character.ts:71-83`; the state query selects them into `base_abilities` at `src/queries/level-up-state.ts:386-404`, then calls `resolveCharacterAbilities` at `src/queries/level-up-state.ts:668-675` and `src/queries/level-up-state.ts:739-774`. |
| P7 | Primary-ability expressions already have the required `one_of`/`all_of` type and tolerant stored decoder. | Fighter-style alternatives and Monk/Ranger-style conjunctions are encoded by `PrimaryAbilityExpression` at `src/domain/primary-ability.ts:7-23`; absent or malformed catalog JSON returns `unprovable` rather than a guess at `src/domain/primary-ability.ts:25-33` and `src/domain/primary-ability.ts:95-145`. |
| P8 | The twelve bundled primary-ability expressions are already parsed from SRD Core Traits and seeded into the nullable class catalog column. | The parser requires `Primary Ability` and parses `or` as `one_of`, `and`/scalar as `all_of` at `src/rules/class-traits-srd.ts:131-198`; it reads the field into every class result at `src/rules/class-traits-srd.ts:538-581`; the seed updates `class_definitions.primary_ability_expression` with canonical JSON at `src/rules/sheet-srd.ts:353-374`. |
| P9 | A correct evaluator already distinguishes `met`, `unmet`, and `unprovable`, including partial evidence. | The result union names the statuses, scores, failed abilities, and missing-expression/invalid-expression/missing-score reasons at `src/domain/primary-ability.ts:46-73`; `one_of` and `all_of` evaluation is exhaustive at `src/domain/primary-ability.ts:155-239`. Its current minimum is a literal constant at `src/domain/primary-ability.ts:35`; W-MC replaces that unsourced literal with the parsed SRD minimum described in §3.1. |
| P10 | The committed SRD source states one minimum for the new class and all current classes. | `docs/srd/source/multiclassing.txt:20-25` says “at least 13 in the primary ability of the new class and your current classes”; the Barbarian/Druid example continues at `docs/srd/source/multiclassing.txt:40-41`. |
| P11 | The planner's actual class-entry path is `commands.execute` → `update_class`, and an absent class is created at level 1. | The planner submits `{ type: 'update_class', class_definition_id, subclass_definition_id: null }` at `src/ui/screens/planner/screen.ts:545-582`; `UpdateClassCommand` states “a class the character does not have is created at level 1” at `src/commands/update-class.ts:286-295` and inserts level `1` with `is_starting_class = false` when other levels exist at `src/commands/update-class.ts:335-369`. |
| P12 | Class entry and ordinary advancement already share one class-source/grant synchronizer. | `syncClassSourceState` is documented as shared by `UpdateClassCommand` and `LevelUpClassCommand` at `src/commands/update-class.ts:77-94`; it creates/reactivates the class source, regenerates grants, applies automatic effects, and reconciles subclass sources at `src/commands/update-class.ts:95-153`. Entry invokes it with acquisition level `otherLevels + 1` at `src/commands/update-class.ts:380-390`; advancement invokes it before planned subchoices at `src/commands/level-up-class.ts:331-349`. |
| P13 | Multiclass-entry proficiency content is already parsed, subset-checked, and seeded into the existing rows. | `SrdMulticlassEntryGrant` carries armor, weapon, skill pool/count, and deliberately unseeded tool text at `src/rules/multiclass-entry-srd.ts:104-135`; the parser requires all twelve classes and validates entry subsets against Core Traits at `src/rules/multiclass-entry-srd.ts:378-419`; the seed writes the skill pair and `granted_on_multiclass_entry` flags at `src/rules/sheet-srd.ts:420-490`. |
| P14 | Entry skills are already minted from those seeded columns when a later class source is generated. | `classEntitlement` reads `is_starting_class` and chooses `skill_choice_count` for the starting class or `multiclass_skill_choice_count/_pool` for a later class at `src/grants/skill-grants.ts:239-288`; `syncClassSkillGrants` creates the addressed `class_skill`/`multiclass_skill` ordinals at `src/grants/skill-grants.ts:318-348`. |
| P15 | Existing proficiency verdicts already apply the initial/full versus entry/subset distinction and union the result. | `classProficiencyGrants` selects exactly one starting class and maps all others through `multiclass_entry` at `src/rules/sheet.ts:659-705`; `characterProficiencies` consumes those grants and produces armor/weapon verdicts and warnings at `src/rules/multiclass-proficiency.ts:293-315`. Saving throws remain starting-class-only at `src/rules/sheet.ts:1033-1055`. |
| P16 | Logical planned locators can already address the selected class before its durable child rows exist. | `LevelUpPlannedGrantSource` includes `{ kind: 'selected_class' }` at `src/domain/command-contracts.ts:175-189`; command resolution finds that class source by character and definition at `src/commands/level-up-class.ts:106-121`. Planned skills, Expertise, and spells share this locator vocabulary at `src/domain/command-contracts.ts:192-219`. |
| P17 | Spell slots already derive from the combined caster contribution and the sheet already prints the effective level. | Shared slots call `slots(sharedContributions)` and `casterLevel(sharedContributions)` at `src/rules/sheet.ts:1768-1785`, and each slot row records `effective_caster_level` at `src/rules/sheet.ts:1797-1809`; multiclass tests pin per-class rounding, shared slots, and separate Pact Magic at `tests/unit/rules/multiclass-slots.test.ts:43-145`. |
| P18 | W-F is not in the current tree, so its final preview/confirm contracts cannot yet be quoted. | The current screen performs only `levelUpState` at `src/ui/screens/level-up/screen.ts:22-44`; Skills/Expertise/Spells/Review/Complete still fall through to `renderUnimplementedLevelUpStep` at `src/ui/screens/level-up/level-up-wizard.ts:438-470`; the current query client has state/planned search but no Preview method at `src/queries/client.ts:63-101`, and the current registry registers state but no Preview handler at `src/worker/handlers/queries.ts:298-309`. |
| P19 | The existing rule-override table can hold this per-character setting without a schema change. | The generated schema is quoted in §4.1 from `src/db/schema.sql:439-450`; its Drizzle source calls `value` “Opaque JSON text” and makes `(character_id, rule_key)` unique at `db/schema/character.ts:976-996`. |
| P20 | Rule overrides already survive backup and share generically. | The table is character-owned with `backupDirect`, `backup`, and `share` all true at `src/domain/contracts/tables.ts:235-241`; backup includes it at `src/domain/contracts/tables.ts:1434-1442`; share export parses every row's JSON value at `src/sharing/character-share.ts:940-954` and import writes it back at `src/sharing/character-share.ts:2106-2118`. |
| P21 | The character sheet is one screen projection that remains visible in print except for interactive chrome. | `renderSheet` places non-collapsible warnings before all fact panels at `src/ui/screens/sheet/sheet-view.ts:1186-1230`; print CSS hides only `.sheet-chrome`, buttons, nav, and router links and explicitly keeps warnings full size at `src/ui/screens/sheet/styles.css:128-165`; the browser test verifies warnings remain visible in print at `tests/browser/character-sheet.spec.ts:492-560`. |
| P22 | Armor and weapon rows already have one shared database lookup and one shared entry-subset resolver. | `ClassProficiencyLookup.sources` reads both grant tables with their `granted_on_multiclass_entry` flags at `src/queries/class-proficiency-lookup.ts:57-159`; `classProficienciesFor(..., 'multiclass_entry')` is the sole exported resolver that filters those flags at `src/rules/sheet.ts:195-223`. Its current SQL limits ids to held classes at `src/queries/class-proficiency-lookup.ts:90-129`, so W-MC must widen that lookup for unheld candidates rather than copy the SQL. |

### 1.3 Future seam that cannot be verified yet

The only unverified implementation assumption is W-F's final action/Preview
shape. P18 proves why. W-MC does not invent parallel endpoints now: W-MC-1 begins
with a seam audit after W-F merges, preserves W-F's final state/Preview/confirm
names, and widens their action discriminant only where the new `update_class`
arm requires it. This is a dependency, not an owner question.

## 2. UX: the add-class surface

### 2.1 What “BG3-like” means here

“BG3-like” is a design term fixed locally by D147, not an instruction to copy a
game screen pixel-for-pixel:

- **Take:** the Class step shows the character's existing classes and a visibly
  separate **Add a class** collection in the same surface; choosing an unheld
  class means “take class level 1 now,” with no planner detour.
- **Take:** every class remains visible. A rules failure does not make a class
  disappear; default rules show it disabled with the reason, while the named
  house rule makes the same card selectable.
- **Take:** selecting a new class immediately changes the later wizard steps and
  gains preview for that class.
- **Drop:** no respec, simultaneous redistribution, numeric target level, batch
  allocation, or full 1–20 progression browser. One visit still adds one total
  level.
- **Drop:** BG3-style prerequisite freedom is not the default. It exists only
  behind the explicit per-character house-rule toggle required by D147.

### 2.2 Class-step layout and selection

The Class panel keeps the existing `data-level-up-panel="class"` seam and has
this DOM order:

1. route/step heading and existing permanent-choice warnings;
2. a fieldset **Advance an existing class**, containing held classes in current
   acquisition order (`ORDER BY level.id` is the existing order at
   `src/queries/level-up-state.ts:408-445`);
3. a fieldset **Add a class**, containing every catalog class not already held,
   ordered by name then id, matching the planner's catalog ordering at
   `src/queries/character-workspace-builder.ts:356-367`;
4. the house-rule control and explanatory text inside the **Add a class**
   fieldset, before its cards;
5. the existing advanced-planner link.

At total character level 20 the existing `maximum_level` terminal state remains
the whole route; it renders no held or unheld class cards because no level-up
action is legal (`src/queries/level-up-state.ts:310-317`). The command guard is
independently specified in §3.2 so the planner and direct RPC receive a
structured refusal rather than relying on this surface.

If exactly one held class is guideable, it remains the initial selection even
though new classes are visible. This preserves the straight-class fast path.
With several held classes there is no preselection. Selecting any other card
clears downstream draft exactly as the present controller clears subclass and
feat draft at `src/ui/screens/level-up/level-up-wizard.ts:333-346`.

The option type is widened rather than pretending “not held” is class level 0:

```ts
type LevelUpClassProgression =
  | {
      readonly kind: 'advance_held';
      readonly current_level: ClassLevel;
      readonly target_level: ClassLevel;
    }
  | {
      readonly kind: 'enter_new';
      readonly target_level: 1;
    };
```

The card text is correspondingly **Wizard 2 → 3** or **Add Fighter 1**. No zero
is cast to `ClassLevel`, and no nullable `current_level` leaks into the held arm.

### 2.3 Disabled-card anatomy and exact shortfall text

The renderer continues the D119 pattern proved by P4. A disabled class is a
focusable `<article>` with heading, status text, `aria-describedby`, and no
radio/button. It is not a disabled form control because a disabled control is
not reliably keyboard reachable.

The read model carries structured checks, not a preformatted backend sentence:

```ts
interface MulticlassPrerequisiteCheck {
  readonly role: 'new_class' | 'current_class';
  readonly class_definition_id: ClassDefinitionId;
  readonly class_name: string;
  readonly result: MulticlassPrimaryAbilityResult;
}

type LevelUpClassDisabledReason =
  | { readonly kind: 'missing_hit_die'; readonly class_name: string }
  | {
      readonly kind: 'multiclass_prerequisite';
      readonly checks: readonly MulticlassPrerequisiteCheck[];
    };
```

One UI formatter owns the visible and accessible prerequisite lines. Ability
labels use the existing closed `Ability` vocabulary. These exact forms are
pinned:

| Expression/result | Exact sentence form |
|---|---|
| Scalar/all-of failure | `New Wizard requires Intelligence 13; Intelligence 11 is 2 short.` |
| Multi all-of failure | `Current Paladin requires Strength 13 and Charisma 13; Charisma 10 is 3 short.` Only failed limbs appear after the semicolon. |
| One-of failure | `New Fighter requires Strength 13 or Dexterity 13; Strength 11 is 2 short; Dexterity 12 is 1 short.` All alternatives appear because every alternative failed. |
| Missing expression | `Current <class>: primary ability is not recorded, so the prerequisite cannot be verified.` |
| Invalid expression | `New <class>: the recorded primary ability is unreadable, so the prerequisite cannot be verified.` |
| Missing score | `<Role> <class>: <Ability> is required, but its score is unavailable.` |

The numeric shortfall is always `minimum - score` and is emitted only when
positive. Every failing current class gets its own line; failures are never
deduplicated merely because two classes name the same ability.

A class may have both a missing-hit-die reason and prerequisite reasons. Missing
hit die always keeps it disabled, even while the house rule is on. All reasons
render as a list; no first-reason-wins collapse is permitted.

### 2.4 House-rule control

The checkbox label is exactly **Ignore multiclass prerequisites (house rule)**.
Supporting copy is exactly **Saved immediately for this character. When on,
this house rule appears on the character sheet and printout.** The immediate
save is a deliberate exception to the wizard's in-memory choice draft: this is
a durable character setting, not a choice in the pending level.

On change, the screen executes the setting command from §4.2, disables only the
checkbox while it is in flight, then reloads `levelUpState`. The current class
selection survives if it remains selectable. Turning the rule off clears a
selected new class that fails or is unprovable, announces **The selected class
no longer meets multiclass prerequisites**, and leaves focus on the setting.
Failure restores the previous checked state and focuses the existing inline
`role="alert"` region. Cancel never rolls the setting back, and the copy says
that it saved.

When ON, unmet and unprovable prerequisite cards become ordinary selectable
radio cards. They retain every prerequisite line and add the visible text
**House rule: prerequisites ignored**; the accessible description includes the
same phrase. A passing class does not receive that badge. Missing-hit-die cards
remain D119-disabled.

### 2.5 Gains, Review, Complete, sheet, and print

For a new-class selection, Gains says **Add <class> level 1** and shows:

- total level `N → N + 1`;
- fixed post-character-level-1 HP, never the new class's level-1 maximum;
- sourced level-1 feature names;
- entry armor and weapon grants, plus the entry skill pool/count when present;
- no new saving throws;
- the existing generic completeness gap that languages and tool proficiencies
  are not modelled; W-MC does not pretend the deliberately unseeded tool text is
  a durable character fact (`src/queries/character-sheet-builder.ts:505-512`).

The SRD explicitly says a new class contributes post-level-1 HP unless total
character level is 1 at `docs/srd/source/multiclassing.txt:54-58`; the existing
fixed-value function derives from the sourced hit die at
`src/rules/sheet.ts:708-743`. Gains must not use the new class's level-1 maximum.

Review names the action **Add <class> 1**, lists entry grants and every planned
choice, and carries **House rule: multiclass prerequisites ignored** when the
setting is on and any check is not `met`. Complete uses the same action wording
and the fresh post-command sheet.

The sheet gets a separate, non-collapsible **House rules** panel immediately
after the header and before warnings. While the setting is ON it contains one
row marked `data-house-rule="ignore_multiclass_prerequisites"` with exact text
**Multiclass prerequisites are ignored for this character.** This is a neutral
declaration, not a warning and not an SRD citation. It appears even if no
current class actually needed the bypass: D147 binds visibility to the setting
being on. The panel is ordinary sheet content, not `.sheet-chrome`, so the
existing print stylesheet keeps it on paper (P21). `sheetFacts` adds the closed
key `house_rules: ['ignore_multiclass_prerequisites']` so the visible and
structured projections agree.

## 3. Rules and command behavior

### 3.1 Parsed SRD prerequisite table

Create `src/rules/multiclass-prerequisites-srd.ts`. Production code must not
transcribe `13` or a twelve-class prerequisite object. The parser consumes:

- `docs/srd/source/multiclassing.txt?raw` for the generic minimum and the rule
  that it applies to the new class and current classes (P10);
- `parseSrdClassTraits()` for the twelve sourced class names and their
  `PrimaryAbilityExpression` values (P8).

Its public result is:

```ts
interface SrdMulticlassPrerequisite {
  readonly class_name: string;
  readonly minimum: AbilityScore;
  readonly primary_ability_expression: PrimaryAbilityExpression;
}

function parseSrdMulticlassPrerequisites(
  multiclassingExtract?: string,
  traits?: readonly SrdClassTraits[],
): readonly SrdMulticlassPrerequisite[];
```

`AbilityScore` is the existing 1..30 value object (`src/rules/ability-score.ts:4-17`),
so an out-of-range captured minimum fails before it reaches evaluation. The
parser requires exactly one prerequisite sentence containing all three tokens
in order: `at least <integer>`, `primary ability of the new class`, and `your
current classes`. It requires the twelve-class result from
`parseSrdClassTraits`, rejects duplicate class names, and returns SRD class
order. The production evaluator accepts the parsed `AbilityScore` minimum as an
argument; `MULTICLASS_PRIMARY_ABILITY_MINIMUM = 13` is removed so the extract is
the only production source of the number. `MulticlassPrimaryAbilityResult`
widens its current literal-bound `minimum` field to `number` and writes the
validated `AbilityScore.value`; the range is established at the evaluator input
while the result stays a plain serializable query/command value.

For bundled rows, the query reads the stored `primary_ability_expression`, not
the parser directly, because the character points to catalog identities and the
stored row is what the command will act on. Seed health already compares stored
canonical JSON to the parser at `src/rules/sheet-srd.ts:134-159`. The new parser
supplies the minimum and an independent integration test joins its twelve rows
to the stored expressions.

#### Extract hazards and required failure modes

`multiclassing.txt` is a two-column `pdftotext -layout` extract. The
Prerequisites heading and first sentence are in the right column at
`docs/srd/source/multiclassing.txt:20-25`, while the Barbarian/Druid example
continues after the form feed in the left column at
`docs/srd/source/multiclassing.txt:40-41`. Unrelated higher-level equipment
numbers also sit between those regions at
`docs/srd/source/multiclassing.txt:28-36`.

Therefore the parser:

1. normalizes curly quotes and whitespace but never strips words;
2. anchors on the unique `Prerequisites` heading and the unique three-part rule
   sentence, not on the first number `13` anywhere in the file;
3. stops its rule search before the unique `Experience Points` heading;
4. rejects zero matches, multiple matches, missing `new class`, missing
   `current classes`, a non-integer/out-of-range minimum, or a changed connective;
5. does not parse the Barbarian/Druid example into a table. It is a cross-check:
   the parsed table must contain Barbarian `all_of(strength)` and Druid
   `all_of(wisdom)`, or parsing fails.

Tests hand-author the expected twelve expressions, as the existing independent
oracle does at `tests/unit/rules/primary-ability.test.ts:15-51`; they must never
regenerate the expected table from parser output.

### 3.2 Prerequisite computation in both directions

The query and command call one pure policy function with:

- the parsed minimum;
- the current resolved ability-score map from P6;
- the target class's stored expression;
- every held class's stored expression, in acquisition order;
- the decoded house-rule state.

For each expression, the existing P9 evaluator semantics remain:

- `one_of`: one known score at or above the minimum is `met`; all alternatives
  known and below are `unmet`; otherwise `unprovable`;
- `all_of`: any known below-minimum score is `unmet`; all known and passing are
  `met`; otherwise `unprovable`.

The returned check list is target first, then every current class. With the
setting OFF or invalid, every check must be `met`; `unmet` and `unprovable` both
disable/refuse. With the setting ON, those two states are disclosed but do not
block. This is the only policy switch. It never changes scores, expressions, or
results.

The rule runs only when `update_class` would insert an unheld class while at
least one class is held. Adding a character's first class and changing/removing
an already-held class are not multiclass entry. Advancing an already-held class
through `level_up_class` does not recheck entry prerequisites.

UI guideability is not the authority. `UpdateClassCommand` performs the same
policy and total-level checks immediately before any insert and raises
structured refusal data:

```ts
type UpdateClassEntryRefusalData =
  | {
      readonly reason: 'multiclass_prerequisite_unmet';
      readonly checks: readonly MulticlassPrerequisiteCheck[];
    }
  | {
      readonly reason: 'multiclass_prerequisite_unprovable';
      readonly checks: readonly MulticlassPrerequisiteCheck[];
    }
  | {
      readonly reason: 'maximum_character_level';
      readonly current_total_level: number;
      readonly maximum_total_level: 20;
    }
  | {
      readonly reason: 'subclass_not_available_at_class_level';
      readonly current_class_level: ClassLevel;
      readonly required_class_level: 3;
    };
```

If both occur, `unmet` is the top-level reason and the checks retain every
unprovable result too. Preview and Confirm transport this data unchanged. A
stale state, a planner call, or a hand-authored RPC therefore cannot bypass the
default. Total level is checked first; `current_total_level` stays numeric
because imported totals above 20 are deliberately preserved at
`src/queries/level-up-state.ts:297-310` under F11. The exact human message is
**A character cannot exceed total level 20, so no class can be added.** The
route never offers an action at or above 20 (§2.2), while the planner's existing
`role="alert"` error surface at `src/ui/screens/planner/screen.ts:438-449`
renders that command message. W-MC does not create a second planner eligibility
UI.

The subclass guard in §3.4 uses the final refusal arm and the exact message
**A subclass cannot be assigned before class level 3.** The planner's existing
early-level subclass select is intentionally not redesigned in W-MC; saving an
early selection reaches this structured command refusal and its generic alert.

#### Standing multiclass disclosure after entry

D147 replaces D96's warn-and-allow *entry authorization*, but it does not repeal
D96's non-conflicting permanent disclosure or D95. For a character holding two
or more classes, one shared standing-check projection evaluates every held
class against the sourced minimum, without target/current roles. Any `unmet` or
`unprovable` result produces the already-registered
`multiclass_primary_ability_unmet` or
`multiclass_primary_ability_unprovable` warning; those keys and presentations
already exist without production producers at
`src/builder/level-up-wizard.ts:509-585`. W-MC wires them rather than leaving
superseded dormant machinery.

The warnings appear in level-up state and the ordinary sheet warning list, full
size on screen and in print, for as long as the condition holds. They cover
imports, later ability reduction, and turning the house rule off after a
bypassed entry. They also remain while the toggle is ON: the neutral **House
rules** marker says why the build is allowed, while the warning states the SRD
condition that remains factually unmet or unprovable. Exact per-class detail
uses the §2.3 formatter without a role prefix, for example **Wizard requires
Intelligence 13; Intelligence 11 is 2 short.** Both the wizard and sheet import
that formatter from the single UI-owned module
`src/ui/multiclass-prerequisite-text.ts`; its context union is
`entry/new_class`, `entry/current_class`, or `standing`, so callers cannot
assemble prefixes themselves. A single-class character never gets a
multiclass warning.

### 3.3 One entry command, one operation, entry grants once

The wizard's new-class Confirm command is the planner's exact command type:

```ts
{
  type: 'update_class',
  class_definition_id: selectedClassId,
  subclass_definition_id: null,
  planned_subchoices: { skills, expertise, spells }
}
```

`planned_subchoices` is added only to the non-removal `UpdateClassCommand` arm
and uses the existing `LevelUpPlannedSubchoices` type from P16. Planner callers
omit it and continue to leave generated choices durably outstanding. Wizard
Confirm includes the selected choices and still permits D70 omissions exactly
as W-F does. Runtime validation additionally rejects `planned_subchoices` when
the selected class is already held; a caller cannot use `update_class` to fill
ordinary advancement choices or bypass `level_up_class`.

Extract the current private planned-subchoice application from
`LevelUpClassCommand` into one shared command-layer service. The ordering for
new entry is fixed:

```text
commands.execute(update_class)
  -> enforce total-level and multiclass-prerequisite guards
  -> insert character_class_levels(level 1, is_starting_class 0)
  -> syncClassSourceState
       -> source + level-1 features/spell slots
       -> entry skill grants from seeded pool/count
       -> automatic effects
  -> shared applyPlannedSubchoices(selected_class logical locators)
  -> one inverse + one revision + one operation
```

This ordering is required because the skill/spell/Expertise grant rows must
exist before logical locators can be resolved. It matches the current
advancement ordering (`syncClassSourceState` then `applyPlannedSubchoices`) at
`src/commands/level-up-class.ts:331-360`. No wizard code inserts a class row,
source, proficiency, grant, slot, effect, or selection directly.

Armor/weapon/saving-throw consequences are not written by the wizard. The
inserted row's `is_starting_class = 0` causes existing resolvers to select the
entry subset (P15). The seeded flags and skill pair from P13/P14 are the only
entry-grant content. Parsed tool clauses remain deliberately unmodelled and
disclosed; `src/rules/multiclass-entry-srd.ts:123-132` and
`src/rules/sheet-srd.ts:420-423` already make that omission explicit.

The pre-commit Class/Gains projection must consume the same stored rows. Extend
`ClassProficiencyLookup` with `sourcesForDefinitions(classDefinitionIds)` and
make its current `sources(characterId)` resolve held ids and delegate to it.
For each unheld candidate, pass that source value to the existing
`classProficienciesFor(source, 'multiclass_entry')`; never filter the flags in
`level-up-state.ts` or the UI. Read `multiclass_skill_choice_count` and
`multiclass_skill_choice_pool` from `class_sheet_traits`. For `class_list`, the
eligible names are that definition's `class_skill_options`; for `any`, they are
the closed skill vocabulary; for `none`, the count must be zero. Those are the
columns at `db/schema/sheet.ts:156-185` and the three tied cases at
`db/schema/sheet.ts:210-238`; command sync remains the authority that mints the
addressed `multiclass_skill` slots (P14). This gives State a previewable delta
without temporarily inserting a class and gives Confirm the same content
through the shared command path.

### 3.4 Subclass timing and spell slots

A new 2024 class enters at class level 1 with
`subclass_definition_id: null`. It has no Subclass step. The existing level-up
constant is class level 3 and is documented for all twelve seeded 2024 classes
at `src/builder/level-up.ts:100-110`; state currently offers a subclass only
when a held class targets that level and has none at
`src/queries/level-up-state.ts:548-565` and
`src/queries/level-up-state.ts:581-625`. W-MC applies that same
predicate to the `enter_new` arm, whose target is 1, so it cannot owe a
subclass. A later pass advancing that class from 2 to 3 uses the existing
Subclass step. `UpdateClassCommand` rejects a non-null subclass whenever the
resulting stored class level is below `LEVEL_UP_SUBCLASS_LEVEL`, both during
entry and on a later edit; the planner and direct RPC therefore cannot attach a
level-3 choice to a level-1 or level-2 class in a second call. At level 3 or
above, subclass assignment remains optional: D80 permits an unmade subclass and
D70 discloses that outstanding choice.

W-MC adds no spell-slot formula, table, cache, or browser arithmetic. Preview
runs the real `update_class` command in W-F's rollback transaction and then
builds the ordinary sheet; Confirm runs the same command for real. The sheet's
existing combined-caster path in P17 supplies both Preview and Complete. Planned
spell choices remain class-specific and use target class level 1; shared slot
capacity remains character-wide.

## 4. State, persistence, and file contracts

### 4.1 Storage decision: existing table, no migration, MINT-free

Store the setting in the existing `character_rule_overrides` table under the
literal key `ignore_multiclass_prerequisites`.

Current generated schema (`src/db/schema.sql:439-450`):

```sql
CREATE TABLE `character_rule_overrides` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `character_id` integer NOT NULL,
  `rule_key` VARCHAR NOT NULL,
  `value` TEXT NOT NULL,
  `note` TEXT,
  `created_at` DATETIME,
  `updated_at` DATETIME,
  FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`)
    ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `character_rule_overrides_character_id_rule_key_unique`
  ON `character_rule_overrides` (`character_id`,`rule_key`);
```

Canonical storage is:

| Setting | Row |
|---|---|
| OFF (default) | No row with that key. |
| ON | One row with `rule_key = 'ignore_multiclass_prerequisites'`, `value = 'true'`, and `note = NULL`. |

The table already supplies per-character ownership, cascade deletion, and
key uniqueness (P19). It already travels generically in backup and share (P20).
Therefore this change has **no database migration, no Drizzle snapshot, no
share-wire mint, no backup-format mint, and no character-snapshot mint**.

Portability tests assert setting semantics, not malformed-byte identity. Share
export preserves a malformed raw value only as a JSON string fallback at
`src/sharing/character-share.ts:940-954`, so import can normalize `garbage` to
`"garbage"`; both decode `invalid` and fail closed. Byte-for-byte preservation
is required only of the local setting command's signed undo (§4.2).

Do not reuse `characters.allow_legacy`: it is an existing, separate legacy
content opt-in at `db/schema/character.ts:97-103` and its command refreshes
spell eligibility at `src/commands/update-character-rules.ts:23-56`. Do not put
the setting in `characters.notes` or a source `config`; those are user text and
source-instance state, not per-character rules.

### 4.2 Setting reader and writer

One domain reader owns the literal key and returns a closed result:

```ts
type MulticlassPrerequisiteOverride =
  | { readonly status: 'off' }
  | { readonly status: 'on' }
  | {
      readonly status: 'invalid';
      readonly reason: 'invalid_json' | 'not_boolean';
    };
```

Absence is `off`; JSON `true` is `on`; JSON `false` is tolerated as `off` for an
older/foreign producer; malformed JSON or any other JSON value is `invalid`.
Invalid fails closed for command authorization, renders the toggle unchecked,
and adds an inline state warning **The stored multiclass house-rule setting is
unreadable and is being treated as off. Toggle it to repair the setting.** It
does not show the sheet house-rule marker.

Create public command
`set_multiclass_prerequisite_override { ignore: boolean }`. `true` upserts the
canonical row; `false` deletes it. It runs through `commands.execute`, revision,
audit, and operation UUID like every other character write.

Because `character_rule_overrides` is intentionally `snapshot: false`
(`src/domain/contracts/tables.ts:235-241`), do not mint a snapshot version just
to undo this setting. The public command captures the exact prior row and
returns an integrity-signed internal `restore_character_rule_override` inverse
whose payload preserves prior absence or the prior raw `value`, `note`, and
timestamps. This follows the signed internal inverse pattern used by
`UpdateClassCommand` at `src/commands/update-class.ts:396-403` and the HMAC
attach/verify service at `src/commands/integrity.ts:60-112`. Undo can therefore
restore even an invalid imported value byte-for-byte without data loss.

### 4.3 State and Preview contracts

After W-F merges, widen its action type in place:

```ts
type LevelUpAction =
  | {
      readonly kind: 'advance_held';
      readonly command: LevelUpClassCommand;
    }
  | {
      readonly kind: 'enter_new';
      readonly command: UpdateClassCommand;
    };
```

Do not create `multiclassState`, `previewMulticlass`, or a second route. The
existing `levelUpState` returns:

- `multiclass_prerequisite_override` closed state;
- held options with `progression.kind = 'advance_held'`;
- unheld options with `progression.kind = 'enter_new'`, target 1, all structured
  prerequisite checks, entry-grant projection, and combined disabled reasons;
- action-specific applicable steps derived by W-F's merged planned-choice
  service.

W-F's Preview endpoint accepts `LevelUpAction`, runs the exact command through
its existing rollback-only boundary, and returns the ordinary before/after
sheet projection. Confirm passes `action.command` unchanged to
`commands.execute`. Preview and Confirm must share payload validation, command
factory construction, revision check, prerequisite guard, entry source sync,
planned locator resolver, and sheet builder.

### 4.4 Expected file changes

This is an implementation inventory, not authorization in this doc-only unit.
W-MC-1 must reconcile it against merged W-F and delete any item W-F already
provides.

| File | Action | Contract |
|---|---|---|
| `src/rules/multiclass-prerequisites-srd.ts` | Create | Parse the generic SRD minimum and join it to parsed Core Traits. |
| `src/rules/multiclass-prerequisites.ts` | Create | Own the shared entry authorization and standing-check policies used by query, command, and sheet. |
| `src/domain/primary-ability.ts` | Modify | Accept the sourced minimum; retain exhaustive met/unmet/unprovable evaluation. |
| `src/rules/character-rule-overrides.ts` | Create | Own the key and strict `off/on/invalid` decoder. |
| `src/queries/class-proficiency-lookup.ts` | Modify | Add definition-id lookup and delegate the existing held-class reader; keep one flag resolver. |
| `src/commands/set-multiclass-prerequisite-override.ts` | Create | Canonical public setting write and exact signed inverse. |
| `src/commands/restore-character-rule-override.ts` | Create | Integrity-protected exact inverse for this key only. |
| `src/domain/command-contracts.ts`, `src/commands/payload-validator.ts`, `src/commands/character-command-factory.ts` | Modify | Add the setting commands; add planned subchoices to non-removal `update_class`. |
| `src/commands/update-class.ts` | Modify | Enforce maximum level and entry prerequisites, reject a subclass below class level 3, and reuse shared planned subchoice application. |
| `src/commands/level-up-class.ts` | Modify | Extract, then consume, the shared planned-subchoice applier; no behavior fork. |
| `src/builder/level-up-wizard.ts` | Modify | Add progression/action/check/entry-grant/house-rule contracts without a level-0 lie. |
| `src/queries/level-up-state.ts` | Modify | Query unheld catalog classes, resolved scores, stored expressions/override, entry grants, and action steps. |
| W-F's merged Preview/client/handler files | Modify | Widen the existing action discriminant; do not add an endpoint. |
| `src/ui/multiclass-prerequisite-text.ts` | Create | Own all entry and standing shortfall/unprovable sentences behind one closed context union. |
| `src/ui/screens/level-up/class-gains-steps.ts` | Modify | Two class groups, exact disabled anatomy/shortfall, toggle, and entry gains. |
| `src/ui/screens/level-up/level-up-wizard.ts`, `screen.ts`, `styles.css` | Modify | Preserve/clear draft correctly, persist toggle, submit the selected action, retain a11y/focus. |
| `src/queries/character-sheet-builder.ts` | Modify | Project active house-rule keys and standing multiclass warnings from the shared readers. |
| `src/ui/screens/sheet/sheet-view.ts`, `styles.css` | Modify | Visible screen/print House rules panel and structured parity. |
| Focused rule/command/query/UI/browser tests named in §6 | Create/modify | Falsifiable coverage and exact negative controls. |

## 5. Dispatch-sized units and dependency edges

Every unit has an explicit W-F edge, even where a narrower code dependency
would otherwise allow earlier work. That is D147's sequencing rule. W-F is the
last unit in the W-D/W-E/W-F cascade; W-MC-1's seam audit must verify all three
are merged rather than assuming that fact from the label alone.

```text
W-F merge -> W-MC-1 -> W-MC-2 -> W-MC-3 -> W-MC-4 -> W-MC-5 -> W-MC-6
              |           |          |          |          |
              +-----------+----------+----------+----------+  (each also checks W-F)
```

| Unit | Size | Dependencies | Contents and exit criteria |
|---|---|---|---|
| **W-MC-1 — W-F seam audit + sourced prerequisite rule** | S | W-F merged. | Ratify W-F action/state/Preview/confirm types; create the parsed prerequisite table and replace the production literal minimum; retain `one_of`/`all_of`/unprovable semantics. Exit: unique anchored source parse, independent twelve-row oracle, source mutations bite, no transcribed production table. **MINT-free.** |
| **W-MC-2 — per-character override + command guard** | M | W-F merged; W-MC-1. | Add the strict override reader, canonical setting command, exact signed inverse, and authoritative `update_class` entry guard used by planner/wizard/direct RPC. Exit: maximum-level/default/invalid blocks, ON permits prerequisites only, both-direction refusal data survives RPC, subclass assignment below class level 3 refuses, undo restores absent/valid/invalid prior rows byte-for-byte, and backup/share preserve setting semantics without version change. **MINT-free.** |
| **W-MC-3 — atomic entry action + state/Preview projection** | L | W-F merged; W-MC-1, W-MC-2. | Add `enter_new` action/options; read unheld catalog classes and seeded entry grants; extract shared planned-subchoice application; extend `update_class`; widen W-F Preview in place. Exit: Preview is neutral and equals commit; one command creates class level 1, correct source/grants/choices, one revision/operation; late locator failure rolls all back. **MINT-free.** |
| **W-MC-4 — Class/Gains wizard UI** | M | W-F merged; W-MC-3. | Render held/add groups, exact shortfalls, D119 combined reasons, selectable bypass cards, immediate-save toggle, entry Gains/Review/Complete wording, focus/status behavior, and downstream-draft reset. Exit: all control states work by keyboard and no prerequisite/proficiency/slot arithmetic exists in the renderer. **MINT-free.** |
| **W-MC-5 — sheet and print rules disclosure** | M | W-F merged; W-MC-2, W-MC-4. | Add the typed sheet house-rule projection, standing D95/D96 warnings, visible panel, structured `sheetFacts` key, and print proof. Exit: ON is visible on screen and emulated print even without a bypassed class; OFF/invalid has no house marker; every standing unmet/unprovable multiclass condition warns regardless of toggle; hostile unrelated override keys never render. **MINT-free.** |
| **W-MC-6 — integrated journeys and regression closeout** | M | W-F merged; W-MC-1..W-MC-5. | Run default-block, each-current-class, override, entry grants, subclass timing, multiclass slots, undo, reload, share/backup, and print journeys. Exit: named tests below pass plus `npm run typecheck`, `npm test`, `npm run build`, and Chromium `npm run test:browser`; straight-class W-F acceptance remains green. **MINT-free.** |

There are **no MINT units**. If implementation discovers that the existing
override table or generic portable paths cannot satisfy §4.1, it must stop and
return to design/owner review; it may not silently add a character column or
mint a persistence version under one of these dispatches.

## 6. Test strategy and negative controls

Every expected value is hand-authored from the committed source or a deliberately
asymmetric fixture. A retained test must still be able to fail. Each mutation
below names the exact test intended to kill it.

### 6.1 Unit and contract tests

| Unit | Named test row (exact future test name) | Guarantee | Negative-control candidate and exact killer |
|---|---|---|---|
| W-MC-1 | `tests/unit/rules/multiclass-prerequisites-srd.test.ts — parses one sourced minimum and joins all twelve hand-authored expressions` | Minimum 13 comes from `multiclassing.txt`; class expressions come from Core Traits; Fighter is OR, Monk/Paladin/Ranger are AND. | `hardcode-minimum-12`: ignore captured text and return 12; this exact test's expected minimum 13 fails. |
| W-MC-1 | `… — refuses changed, duplicated, or incomplete prerequisite prose` | Missing new/current direction, multiple matches, changed connective, and out-of-range number fail loudly. | `accept-new-class-only`: remove the current-classes assertion; this exact test's mutated extract missing “current classes” no longer throws. |
| W-MC-1 | `tests/unit/rules/primary-ability.test.ts — reports exact shortfalls for one_of and all_of at the sourced minimum` | Evaluator retains typed status and formatter gets enough data for every positive difference. | `one-of-as-all-of`: require both Fighter abilities; this exact test's Strength 8/Dexterity 13 case becomes unmet. |
| W-MC-2 | `tests/unit/rules/character-rule-overrides.test.ts — decodes absence false true malformed and non-boolean without guessing` | Only JSON true enables; absence/false disable; malformed/non-boolean are invalid. | `truthy-json-enables`: coerce `{}` or `"yes"`; this exact test expects invalid and fails. |
| W-MC-4 | `tests/unit/ui/level-up-wizard.test.ts — separates held and add-class cards and never represents entry as level zero` | Group legends, acquisition/alphabetic order, labels, and type-driven entry wording are stable. | `flatten-class-groups`: render one fieldset; this exact test cannot find both legends. |
| W-MC-4 | `… — renders every disabled reason with exact shortfall and no selection control` | D119 and every current/new prerequisite failure remain focusable, described, visible, and non-selectable. | `first-disabled-reason-only`: render `reasons[0]`; this exact test's missing-hit-die plus two current-class failures loses text. |
| W-MC-4 | `… — house rule makes prerequisite failures selectable but never unlocks missing hit die` | ON changes only prerequisite guideability and keeps the evidence/badge. | `override-unlocks-all`: treat every disabled reason as bypassable; this exact test finds a radio on the missing-hit-die card. |
| W-MC-5 | `tests/unit/ui/sheet-view.test.ts — prints the multiclass house rule in readable and structured projections` | Visible text and `sheetFacts.house_rules` agree; unrelated/invalid keys are absent. | `structured-only-house-rule`: omit the visible panel; this exact test's labelled counterpart assertion fails. |
| W-MC-5 | `… — renders every standing multiclass minimum warning independently of the house marker` | D95/D96 disclosure survives import, later ability reduction, and either toggle state; a single-class fixture is silent. | `hide-warning-when-override-on`: gate warnings on setting OFF; this exact ON fixture loses its named Wizard shortfall. |

### 6.2 Integration and command tests

| Unit | Named test row (exact future test name) | Guarantee | Negative-control candidate and exact killer |
|---|---|---|---|
| W-MC-1 | `tests/integration/rules/multiclass-prerequisite-seed.test.ts — joins the parsed prerequisite table to all twelve stored primary abilities` | Seeded canonical expressions and parsed source remain aligned without a new table. | `skip-ranger-seed-check`: omit one join row; this exact test's expected count 12 and Ranger AND oracle fail. |
| W-MC-2 | `tests/integration/commands/update-class.test.ts — entry refuses when the new class fails even though every current class passes` | New-class direction is command-enforced. | `check-current-only`: delete target evaluation; this exact test unexpectedly commits. |
| W-MC-2 | `… — entry refuses when any one of several current classes fails even though the new class passes` | Every current class is checked, not only starting/first/last. | `check-starting-only`: evaluate only `is_starting_class`; the deliberately failing second current class in this exact test is missed. |
| W-MC-2 | `… — entry fails closed on an unprovable expression and succeeds only with the exact house override` | Unknown does not become pass; ON permits without rewriting evidence. | `unprovable-is-met`: collapse status; the OFF half of this exact test commits. |
| W-MC-2 | `… — planner wizard and direct RPC share the same structured prerequisite refusal` | The rule lives in `UpdateClassCommand`, not a surface. | `guard-level-up-state-only`: remove command guard; planner/direct arms in this exact test succeed. |
| W-MC-2 | `… — class entry at or above total level twenty returns maximum_character_level before any write` | Level-20 and imported level-22 fixtures are terminal; planner/direct refusals preserve the actual total and use the truthful cap message. | `assume-current-total-is-20`: cast the refusal total to 20; this exact level-22 arm reports the wrong evidence. |
| W-MC-2 | `… — class levels one and two reject a subclass while level three may set or omit one` | `UpdateClassCommand` cannot attach a subclass on entry or a second call below level 3; D80 still permits omission at 3. | `subclass-on-second-call`: guard insertion only; this exact add-then-edit level-1 arm unexpectedly succeeds. |
| W-MC-2 | `… — setting undo restores absent valid and invalid prior override rows byte-for-byte` | No snapshot mint and no imported raw-value loss. | `inverse-canonicalizes-off`: restore every prior non-true value as absence; the invalid-row case in this exact test differs. |
| W-MC-2 | `tests/integration/sharing/round-trip.test.ts — multiclass prerequisite override survives share without a version mint` | Existing generic share portability preserves ON/OFF/invalid semantics. | `filter-known-override-on-export`: omit the key; this exact test's imported character is OFF. |
| W-MC-2 | `tests/integration/backup/round-trip.test.ts — multiclass prerequisite override survives backup without a version mint` | Existing direct-table backup restores the same setting semantics. | `omit-rule-overrides-from-backup`: remove the table from direct export; this exact restored character is OFF. |
| W-MC-3 | `tests/integration/commands/update-class.test.ts — wizard entry commits class source entry grants and planned choices in one operation` | `update_class` is the one path; `is_starting_class=0`; entry subset and logical choices are atomic. | `use-full-class-skill-count`: ignore entry pool/count; this exact Bard/Ranger asymmetric count fails. |
| W-MC-3 | `… — a late planned spell refusal rolls back the new class and every generated grant` | No partial class/grant/choice state. | `apply-subchoices-after-transaction`: move fills outside the class transaction; this exact byte-equivalence assertion fails. |
| W-MC-3 | `tests/integration/queries/level-up-wizard.test.ts — returns held and unheld options with target-first and every-current prerequisite checks` | State supplies complete structured evidence and stable ordering. | `drop-second-current-check`: slice held checks to one; this exact three-class fixture loses the named check. |
| W-MC-3 | `… — projects unheld armor weapon and skill entry grants from the stored entry subset` | State widens `ClassProficiencyLookup`, resolves flags through `classProficienciesFor`, and preserves `none`/`class_list`/`any` skill semantics. | `use-initial-proficiencies-in-gains`: resolve with `initial` instead of `multiclass_entry`; this exact Barbarian fixture gains Light/Medium armour and Simple weapons unexpectedly. |
| W-MC-3 | `… — Preview of entry is row revision operation and sequence neutral and equals commit` | W-F rollback Preview works for `update_class` and uses ordinary sheet math. | `commit-entry-preview`: return normally from Preview; this exact before/after database equality fails. |
| W-MC-3 | `… — entry has no subclass step while advancing that class two to three does` | State applies the shared class-level-3 predicate to both action arms. | `subclass-step-on-entry`: derive the step from subclass catalog presence alone; this exact level-1 entry option gains a Subclass step. |
| W-MC-3 | `… — entry preview gets proficiency verdicts and effective caster slots from the ordinary sheet` | No second proficiency/slot engine. | `add-browser-slot-math`: remove the Preview sheet result and substitute UI arithmetic; this exact backend Preview oracle is absent/different. |

### 6.3 Focused Chromium journeys

| Unit | Named test row (exact future test name) | Guarantee | Negative-control candidate and exact killer |
|---|---|---|---|
| W-MC-4 | `tests/browser/level-up-multiclass.spec.ts — default rules disable a new-class shortfall in both directions` | A target-fail fixture and a current-fail fixture show exact numbers and cannot advance. | `hide-failing-card`: filter the class instead of disabling it; this exact test cannot find the named focusable card. |
| W-MC-4 | `… — the saved house rule unlocks the same card and one confirm adds class level one` | Toggle saves immediately, badge stays visible, one operation/revision adds the class. | `ui-only-override`: unlock only the radio without persisting; this exact Confirm is refused and reload is OFF. |
| W-MC-4 | `… — turning the house rule off clears a now-invalid selection and preserves keyboard focus` | No stale selected action crosses the policy change. | `retain-disabled-selection`: keep `selectedClassId`; this exact status/selection assertion fails. |
| W-MC-6 | `… — Fighter to Bard uses only Bard entry skill and proficiency grants` | Entry skill count, armor/weapon union, no saving throws, and planned choice survive reload. | `use-core-traits-on-entry`: grant full Bard skills/saves; this exact post-sheet oracle fails. |
| W-MC-6 | `… — Wizard to Cleric updates shared slots through effective caster level` | Existing sheet slot computation handles the multiclass result. | `use-new-class-slots-only`: replace combined result with Cleric row; this exact slot counts differ. |
| W-MC-5 | `tests/browser/character-sheet.spec.ts — multiclass house-rule marker remains visible at full size in print` | Screen and emulated print both show the exact marker; OFF fixture does not. | `hide-house-rules-in-print`: add the panel to `.sheet-chrome`; this exact print visibility assertion fails. |
| W-MC-5 | `… — a standing multiclass shortfall remains visible in print with the toggle on or off` | Permanent D95/D96 warning and neutral house marker have independent predicates. | `house-marker-replaces-warning`: suppress warning while ON; this exact ON print fixture loses the shortfall sentence. |
| W-MC-6 | `tests/browser/level-up-multiclass.spec.ts — straight-class level up remains the preselected fast path` | D147 does not regress W-F's ordinary journey. | `preselect-first-alphabetic-new-class`: choose from the combined list; this exact expected held-class selection fails. |

W-MC-6 also runs the full gates named in its exit criteria. Browser scope remains
Chromium only under D109.

## 7. Open questions for the owner

None. D147 decides prerequisite enforcement, both directions, default OFF,
house-rule bypass, sheet visibility, existing entry grants/slot math, and
post-W-F sequencing. The current schema and command paths decide the remaining
technical choices without reopening those rulings.
