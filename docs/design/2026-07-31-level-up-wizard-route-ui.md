# LU-W design: level-up wizard route and UI

Status: implementation plan only. This document changes no production code,
tests, migrations, persistence contracts, or commits.

## 1. Scope and governing decisions

LU-W adds the primary straight-class level-up surface at
`/characters/:characterId/level-up`. It consumes the unified level-up command
from LU-1 and the atomic planned skill, Expertise, and spell choices from LU-2.
It does not design either backend contract again.

The following decision references were checked against the headings and current
text in `.claude/decisions.md` before this plan was written:

- D85 requires a Level Up button on the sheet and every character-list card,
  entering a one-level-per-pass wizard. The planner remains a writer, but both
  paths use the one command layer.
- D77 makes post-level-1 HP fixed: hit die / 2 + 1 + Constitution modifier,
  with no roll choice and no per-level HP write.
- D101 makes Ability Score Improvement one feat among all 17 sourced feats at
  every class-specific ASI level; D78 requires those levels to come from seeded
  class data rather than UI literals.
- D70 makes an unmade choice saveable and visible as the same named wizard and
  sheet warning. D95 makes such warnings permanent while their condition holds,
  with no acknowledgement state.
- D87 requires level-up spell picks and swaps through the existing grant-rule
  and spell-selection machinery. D90 places Expertise after all skill choices.
- D33 requires a value to be computed correctly or shown as unknown/absent; a
  guessed or partly modelled number must not be recited as fact. D102 likewise
  keeps tool alternatives as stated text rather than invented structured data.
- D107 says straight-class wizard flow satisfies v1; multiclass entry remains a
  planner-only operation. D111 makes that planner an explicitly advanced door.
- D108 requires keyboard operation, labels, focus trapping/restoration for any
  modal, and no colour-only signalling. D109 limits the tested browser matrix to
  Chromium.
- D112 makes the scripted Playwright walkthrough the acceptance gate.
- D71 puts double-submit prevention in the UI. The command executor's operation
  UUID replay remains the second line of defence, not a reason to leave the
  confirm button active.

Out of scope for LU-W:

- adding a new class, changing class membership, batch levelling, or accepting a
  free-form target level;
- inventing LU-1's feat-choice payload/table shape or LU-2's atomic subchoice
  payload fields;
- migrations, snapshot schema changes, backup fields, share-wire versions, or
  frozen wire fixtures;
- current HP, rolled HP, XP, or resource-spending controls;
- a second feat-benefit classifier, spell-eligibility rule, or sheet arithmetic
  implementation in the browser.

## 2. Assumptions proved from the current branch

Every statement below describes code that exists at `a5105ae`. Future LU-1 or
LU-2 behavior is deliberately excluded from this list.

| ID | Proven assumption | Evidence |
|---|---|---|
| P1 | Screen modules self-register by exporting `screen` from a `screen.ts`; the application sorts discovered modules and renders the first matching screen. A level-up screen therefore needs its own exact matcher. | `src/ui/app.ts:10-35`, `src/ui/app.ts:66-99` |
| P2 | Routes expose a normalized pathname, decoded segments, and query parameters. Same-origin navigation uses `history.pushState`/`replaceState` and immediately rerenders subscribers. | `src/ui/router.ts:9-20`, `src/ui/router.ts:23-61` |
| P3 | The sheet matcher accepts exactly `/characters/:positiveId/sheet`; render performs one sheet query, mounts one pure view, wires router links, and returns cleanup. | `src/ui/screens/sheet/screen.ts:23-46`, `src/ui/screens/sheet/screen.ts:48-100`, `src/ui/screens/sheet/screen.ts:103-107` |
| P4 | The current sheet header has “All characters” and “Open planner” links but no Level Up link. | `src/ui/screens/sheet/sheet-view.ts:950-970` |
| P5 | The character list is the `/` screen. Each current card shows level/class summaries and exposes only Open workspace, Share link, and Delete actions; the list query supplies character summaries and the outstanding-count query supplies optional badges. | `src/ui/screens/character-list/screen.ts:5-8`, `src/ui/screens/character-list/character-list.ts:339-445`, `src/ui/screens/character-list/character-list.ts:448-540` |
| P6 | The existing guided builder uses exact seam route functions, loads database-derived state on every build-route render, mounts one step, gathers cleanup functions, and renavigates after writes so the step is re-derived. | `src/ui/screens/guided-builder/screen.ts:25-44`, `src/ui/screens/guided-builder/screen.ts:47-68`, `src/ui/screens/guided-builder/screen.ts:100-119`, `src/ui/screens/guided-builder/screen.ts:213-240` |
| P7 | Guided level-1 step order and route grammar live in the extract-free builder seam, not in screen code. The route accepts only canonical positive IDs and level 1. | `src/builder/contracts.ts:44-63`, `src/builder/contracts.ts:266-304`, `src/builder/contracts.ts:357-368` |
| P8 | The guided skills step addresses a specific grant, injects its write dependency, prevents a second write while one is in flight, displays an alert on failure, and re-derives after success. It also renders labels and named empty-choice explanations. | `src/ui/screens/guided-builder/skills-step.ts:111-175`, `src/ui/screens/guided-builder/skills-step.ts:227-305`, `src/ui/screens/guided-builder/skills-step.ts:377-406` |
| P9 | The guided Expertise step renders a labelled select per durable grant, disables its button before writing, supplies an operation UUID, and re-derives after success. | `src/ui/screens/guided-builder/expertise-step.ts:12-64`, `src/ui/screens/guided-builder/expertise-step.ts:66-89` |
| P10 | The guided spells step reuses the planner spell picker, injects search/assignment functions, supplies an operation UUID, and re-derives after selection. | `src/ui/screens/guided-builder/spells-step.ts:12-41`, `src/ui/screens/guided-builder/spells-step.ts:43-66` |
| P11 | The backup hint is specifically a one-time, browser-profile level-1-completion hint. It claims storage before rendering and stays absent if the claim cannot be persisted. LU-W must not show it again after level 2. | `src/ui/screens/guided-builder/backup-hint.ts:23-47`, `src/ui/screens/guided-builder/backup-hint.ts:57-63` |
| P12 | The level-up seam already pins the ten ordered steps, RPC method names, panel/control locators, canonical path writer, exact positive-ID path matcher, and the `epic_boon_deferred` warning key/presentation. | `src/builder/level-up-wizard.ts:193-216`, `src/builder/level-up-wizard.ts:268-344`, `src/builder/level-up-wizard.ts:358-395`; pinned by `tests/unit/builder/level-up-wizard-contract.test.ts:12-75` |
| P13 | LU-0 defines the 17 bundled feat keys and a `FeatApplicationPlan` containing eligibility, config, effects, grant rules, sourced text benefits, and undetermined numbers. Benefits are exhaustively classified as `effect | grant_rule | text`, and the plan is built by one pure function. | `src/rules/feat-application.ts:37-93`, `src/builder/level-up-wizard.ts:161-169`, `src/rules/feat-application.ts:142-190`, `src/rules/feat-application.ts:652-685` |
| P14 | Feat eligibility is a discriminated `qualified | unmet | unprovable` result with named reasons; unknown ability or feature evidence is not collapsed into a pass/fail fallback. | `src/builder/level-up-wizard.ts:66-129`; exercised by `tests/unit/rules/feat-application.test.ts:438-509` |
| P15 | The current command payload is still the pre-LU-1 ASI-only form: class ID, target level, optional subclass key, and optional ability increases. The validator accepts only that shape. | `src/domain/command-contracts.ts:158-187`, `src/commands/payload-validator.ts:426-484`, `src/commands/payload-validator.ts:1185-1190` |
| P16 | The current command checks held class and adjacent level before its transaction, detects ASI levels from the sourced class-level reader, requires old-style increases at those levels, writes no HP row, then reconciles class/subclass grants in the same transaction. | `src/commands/level-up-class.ts:85-142`, `src/commands/level-up-class.ts:171-206`, `src/commands/level-up-class.ts:256-271` |
| P17 | The command factory and executor already route `level_up_class` through the shared command path. Command execution checks operation-UUID replay before revision, commits one revision/audit/operation record, and returns idempotent replays for the same UUID. | `src/commands/character-command-factory.ts:137-140`, `src/commands/character-command-executor.ts:193-229`, `src/commands/character-command-executor.ts:281-321`, `src/commands/character-command-executor.ts:324-345` |
| P18 | The browser command client accepts an explicit operation UUID, otherwise generating one, and calls the single `commands.execute` RPC envelope. The worker command handler translates revision conflicts into structured `current_revision` data. | `src/commands/client.ts:8-36`, `src/worker/handlers/commands.ts:25-68` |
| P19 | The only currently implemented level-up query is planned eligible-spell search. It is present in the client and worker handler. `levelUpState` and `previewLevelUp` are pinned names but have no client methods or registered handlers on this branch. | Full client surface at `src/queries/client.ts:68-138` and `src/queries/client.ts:140-345`; full handler surface at `src/worker/handlers/queries.ts:193-310`; contrasted with `src/builder/level-up-wizard.ts:268-273` |
| P20 | Worker handler modules are auto-discovered, validate params before dispatch, reject duplicate methods, and turn non-`RpcError` exceptions into `handler_error`. New state/preview RPCs belong in a handler module, not direct UI database access. | `src/worker/registry.ts:35-63`, `src/worker/registry.ts:67-104`, `src/worker/registry.ts:109-113` |
| P21 | The sheet is computed afresh from character facts rather than stored. Its fixed post-level-1 HP base is `die / 2 + 1`, Constitution is read live, and unknown hit dice currently produce a sheet estimate with a warning. The LU-W face must still say unknown rather than copying the assumed die as fact. | `src/queries/character-sheet-builder.ts:90-110`, `src/rules/sheet.ts:691-725`, `src/rules/sheet.ts:738-775`, `src/rules/sheet.ts:791-824` |
| P22 | The acceptance walkthrough pins the future route string and contains a named item-3 seam. It creates a Dwarf Wizard with Constitution 13 and Intelligence 12, then Sage applies Constitution +2 and Intelligence +1; Sage already grants Arcana proficiency. It reaches the level-1 sheet, records core numbers, and reloads them. | `tests/browser/acceptance-walkthrough.spec.ts:3-12`, `tests/browser/acceptance-walkthrough.spec.ts:29-80`, `tests/browser/acceptance-walkthrough.spec.ts:179-181`, `tests/browser/acceptance-walkthrough.spec.ts:190-234` |
| P23 | Playwright has one configured project, Chromium, with one worker and no Firefox/WebKit projects. | `playwright.config.ts:21-53` |
| P24 | The existing modal precedent traps Tab/Shift+Tab, handles Escape, focuses the first control, and restores the invoker through a supplied callback; its unit test asserts those behaviors. LU-W can avoid modal UI entirely, but any later modal must meet this behavior. | `src/ui/screens/planner/items.ts:75-129`, `tests/unit/ui/items.test.ts:107-180` |
| P25 | Wizard level 2 is Scholar, not a subclass level. Scholar grants one Expertise choice among six skills in which the Wizard is already proficient; the sourced parser cross-checks the prose entitlement against the level table without feature-name substring inference. | `docs/srd/source/class-expertise.txt:41-45`, `docs/srd/source/class-level-tables.txt:299-307`, `src/rules/class-choice-entitlements-srd.ts:253-278`, `src/rules/class-choice-entitlements-srd.ts:380-392` |
| P26 | Sheet skill arithmetic adds proficiency bonus a second time only for an active Expertise grant on a proficient skill. For the acceptance fixture, Arcana therefore becomes Intelligence +1 plus proficiency +2 twice, or +5. | `src/rules/sheet.ts:1083-1113`, with fixture inputs proved by P22 |
| P27 | The codebase has a rollback-preview precedent: it runs the real operation in a database transaction, throws one private identity-checked sentinel after capturing the result, and rethrows every other error. The ordinary command executor, by contrast, commits revision/audit/operation state inside its transaction. | `src/sharing/character-share.ts:1491-1507`, `src/commands/character-command-executor.ts:193-229`, `src/commands/character-command-executor.ts:231-321` |
| P28 | `DatabaseContext.transaction` shares one depth-tracking runner. An outermost transaction uses SQLite transaction mode; every nested call uses a savepoint and decrements depth in `finally`. A Preview transaction can therefore enclose the level-up command's own transaction and roll back both. | `src/db/database.ts:40-45`, `src/db/database.ts:91-100`, `src/db/transaction.ts:5-27` |
| P29 | The existing rules prove the acceptance HP oracle. Wizard level 1 contributes 6 + Constitution modifier and later Wizard levels use fixed 4; the fixture's Constitution becomes 15 (+2). Dwarven Toughness is seeded as flat 0/per-level 1, its summarizer uses `flat + perLevel * total level`, and the sheet adds that species value separately. Thus level 1 is 6 + 2 + 1 = 9 and level 2 is 6 + 2 + (4 + 2) + 2 = 16. | `src/rules/sheet.ts:691-725`, `src/rules/sheet.ts:738-824`, P22, `src/rules/origins-srd.ts:300-320`, `src/rules/species-effects.ts:178-210`, `src/queries/character-sheet-builder.ts:721-747`, `src/queries/character-sheet-builder.ts:789-810` |

### Unproven or intentionally future assumptions

These are not stated as facts in the design or encoded into UI-specific parallel
types:

- **LU-1/LU-2 seam:** `character_level_feat_choices`, the unified feat command
  arm, and Epic Boon defer/resolution are not present on this branch. Their exact
  row columns, payload properties, result type, and refusal serialization are
  unproven here. LU-W consumes the merged LU-1 exports; it does not infer them
  from the older ASI payload.
- **LU-1/LU-2 seam:** atomic planned skill, Expertise, new-spell, and swap
  choices are not attached to the command on this branch. Their exact payload
  keys, locator refusal reasons, and result details are unproven here. LU-W
  consumes LU-2's merged types.
- The concrete `LevelUpState` and `LevelUpPreview` result types, validators, and
  worker handlers do not exist here. The seam pins only their method names. LU-W
  must first ratify these projections against the merged LU-1/LU-2 contracts; a
  screen-local guess is forbidden.
- It is unproven whether LU-1 will expose deferred Epic Boon resolution through
  the ordinary `level_up_class` arm or a distinct command arm. The UI behavior
  is designed below, but the dispatch must use the merged command exactly.
- It is unproven whether a missing hit die makes a merged LU-1 class option
  non-guideable or merely makes its HP preview absent. The UI must render the
  absence honestly either way; owner choice OQ-2 settles the interaction.
- The exact level-2 spell locator(s) produced for the acceptance Wizard are an
  LU-2 seam. The scripted spell name is selected only after LU-2's planned
  eligibility fixture proves it is offered for that exact draft.
- **LU-1/LU-2 seam:** it is unproven whether LU-2 planned spell search accepts
  the draft context of a newly selected feat such as Magic Initiate—its list,
  casting ability, and not-yet-durable grant identity. W-C must ratify that
  capability from merged LU-2 types/tests before W-D may render those locators;
  no temporary feat/grant row may be minted merely to make search work.

## 3. Technical approach

### 3.1 One route adapter, one in-memory draft, no wizard persistence

Create an exact `screen.ts` using `matchesLevelUpRoute(context.route.path)`.
The adapter creates the query/command clients, fetches the level-up state, and
mounts a controller. It never reads SQLite from the main thread.

The controller owns only transient navigation and selections:

```text
sheet/list Level Up
        |
        v
exact route -> state RPC -> class -> gains -> conditional choices -> review
                                     ^                              |
                                     |------ in-memory draft -------|
                                                                    v
                                              one commands.execute -> complete
                                                                    |
                                                                    v
                                                            fresh sheet query
```

No `wizard_run`, local-storage draft, session-storage draft, or partially written
grant row is added. Back edits the in-memory draft. Reloading the route safely
returns to the first applicable step from fresh state. **Cancel** immediately
returns to its launch surface and discards the draft without a confirmation
modal; browser Back/navigation/reload does the same. This deliberate draft-loss
rule is safe because nothing has been written, and is pinned in controller and
browser tests.

Step renderers receive immutable state/draft values and injected callbacks and
return `{ element, cleanup }`, matching the guided-builder pattern. The screen
owns RPC and router wiring; renderers do not import the worker or database.

### 3.2 Read/preview adapter is not a second rules engine

The route needs two currently absent RPC implementations:

1. `levelUpState` projects held class choices, projected gains, applicable
   steps, feat plans, and planned LU-2 choices from the merged backend.
2. `previewLevelUp` executes the exact merged command application through the
   rollback-only path specified below and returns the before/after sheet
   projection and outstanding-choice presentations.

Both are mint-free query/command adapters. They must consume LU-1/LU-2 exported
types and services. They must not recalculate HP, feat effects, skill pools,
Expertise eligibility, spell eligibility, or warning text independently for the
browser. If LU-1/LU-2 merge these RPCs first, LU-W deletes the duplicate inventory
items below and consumes them; it does not create parallel endpoints.

The preview path is new LU-W internal architecture, not an assumed LU-1/LU-2
capability. W-C factors a shared level-up preflight used by both executor and
Preview: the same payload validator, command factory/integrity check, and exact
expected-revision check. Factory construction may occur before the synchronous
transaction; the revision check is repeated inside the transaction immediately
before apply, matching the executor's race-closing check. Preview then calls the
merged constructed command/application service directly, captures its
sheet/result, and throws one module-private sentinel. It catches only that exact
sentinel by identity, following P27. P28 proves that the command's nested
transaction is a savepoint enclosed by Preview. Preview must not call
`commands.execute`: it creates no operation UUID, revision, audit record,
operation record, history entry, or idempotency collision. Confirm later calls
`commands.execute` with a freshly created UUID. Any validation failure, stale
revision, merged refusal, or unexpected error escapes Preview unchanged.

Although Preview returns a read projection, it temporarily enters a write path.
Register it in a dedicated `level-up-preview` worker handler module whose name
advertises the rollback boundary; only state/search stay in the ordinary query
handler. A live invariant test allows this single identity-sentinel-guarded
exception and proves that returning normally from Preview mutates state and is
caught by `W-PREVIEW-PURE`.

### 3.3 Applicable steps, not a fixed gauntlet

`LEVEL_UP_STEP_ORDER` remains the only global ordering. After class selection,
the controller filters it using applicability supplied by the read model and
draft:

- class and gains always render;
- subclass only for an owed subclass occurrence;
- feat only for the selected class's sourced ASI occurrence;
- Epic Boon only for the sourced level-19 occurrence or a resolution pass;
- skills, Expertise, and spells only when the planned LU-2 grant set contains
  work or an optional swap;
- review and complete finish the pass.

The UI never searches class-feature strings or hardcodes Fighter/Rogue/Wizard
levels to decide applicability. Skipped steps are absent from the rail and DOM,
not disabled placeholders.

### 3.4 Accessibility and focus

- Use native buttons, links, fieldsets, legends, labels, selects, and inputs.
  Every qualified feat card's radio has an accessible name containing the feat
  name. Every unmet/unprovable card is a focusable labelled article with its
  reasons in `aria-describedby` and no selection action, so keyboard users can
  reach the explanation without encountering a misleading disabled control.
  Every ability, skill, Expertise, and spell choice is explicitly labelled.
- Mark the active rail item with `aria-current="step"`; warning icons include
  text and never carry meaning through colour alone.
- After Next/Back, focus the new step heading (`tabindex="-1"`). On a validation
  error, focus the `role="alert"` summary and retain the user's selections.
- Initial state and preview regions use `aria-busy`; their named `role="status"`
  text announces loading. Confirm first moves focus to a `tabindex="-1"`
  submitting status, then disables all controls. Complete moves focus to its
  heading. This avoids disabling the control that still owns focus.
- On initial arrival, set the document title to `Level up — <character name>`
  and focus the route's `h1` after state loads. When class selection reshapes the
  step rail, a polite status announces the new applicable-step count; focus
  remains on the class control until Next moves it to the next heading.
- No LU-W interaction requires a modal. Revision conflicts, backend refusals,
  deferred-choice warnings, and confirm errors render inline. If a later
  dispatch introduces a modal, it must trap Tab/Shift+Tab, close on Escape, and
  restore the invoking control, matching P24.
- CSS remains one-column at narrow widths; larger card grids must preserve DOM
  and tab order. Chromium is the only browser project added to the gate.

## 4. User journey

### 4.1 Sheet to class selection

1. A level-1 sheet gains a primary **Level Up** link before the
   secondary **Open planner** link. Every character-list card gains the same
   Level Up link beside Open workspace. Both use `levelUpPath(characterId)`;
   neither constructs the path by string duplication.
2. The route loads a not-found, no-held-class, maximum-level, or ready state.
   Not found offers All characters. A classless character explains that no held
   class can be advanced and offers **Advanced: open planner**; it does not
   silently create a class. Maximum level states that no further level can be
   added and offers the sheet. Neither terminal state submits a command.
3. Ready state opens on Class. For the ordinary one-class case, `Wizard 1 -> 2`
   is preselected but still visible. There is no numeric level input and no
   unheld class card. Adding a class remains an **Advanced: open planner** door,
   not a wizard step (D107/D111).
4. A character with a held class but unfinished level-1 choices remains ready:
   permanent outstanding-choice warnings are repeated on Class and Review but
   do not block the pass (D70/D95). LU-W never equates “has warnings” with “has
   no held class.”
5. A backend `class_not_held` or `level_not_adjacent` refusal is translated from
   the merged LU-1 refusal data into an inline actionable message, then state is
   reloaded. The UI does not match refusal message strings.

### 4.2 Gains and fixed HP

Gains is read-only. It shows:

- current and target class/total level;
- fixed class HP base, live Constitution modifier, the post-level-1 minimum-1
  result, separately named level-scaled HP effects, and projected final maximum;
- proficiency-bonus change only when one exists;
- sourced target-level feature names and class-progression deltas returned by
  the read model.

It never renders an HP roll/fixed choice, roll button, method selector, current
HP field, or HP number input. If any input required for an exact HP projection is
absent, the face says **HP change unknown** and omits the projected number. It
does not display the sheet's fallback die as if it were sourced.

For the acceptance Dwarf Wizard, the proven existing rules imply a known level-2
class delta of 4 (d6 fixed base) + 2 Constitution = 6, plus the Dwarven
Toughness level-scaled contribution changing from 1 to 2. The review projection
must therefore move final max HP from 9 to 16. This expected value is asserted
against the rollback preview and the post-commit sheet, not recomputed in UI
code.

### 4.3 Subclass

When the merged state says a subclass choice is owed, show every returned option
with class and rules-edition labels. **Decide later** is allowed. Continuing with
no selection places the merged named warning on Review, Complete, and the sheet;
an empty catalog is an explanation plus Continue, not a dead end.

### 4.4 Feat/ASI — LU-1/LU-2 seam

At a sourced class ASI occurrence, render the same 17 LU-0 feat candidates. ASI
is marked **class default** but uses the same selection control and application
plan as every other feat.

Each card displays backend-projected:

- name/category, minimum, repeatability, and `qualified | unmet | unprovable`;
- every named eligibility reason;
- ability point budget, allowed abilities, and cap;
- applied effects, grant-rule benefits, exact sourced text-only benefits, and
  any affected number the plan marks undetermined.

Only `qualified` cards contain a selectable radio. `unmet` and `unprovable`
cards remain keyboard-focusable, visible, and described by their reasons, but
contain no selection action. A zero-point feat explicitly says it
grants no ability increase. One- and two-point controls are generated from the
returned plan, never a UI table. Magic Initiate's list/casting-ability config is
collected here, but its spell locators are filled later on Spells. Skilled's
supported skill ordinals appear later on Skills; its tool alternative remains
sourced text and never becomes a false owed skill.

Confirm cannot pass an ASI occurrence without a qualified feat. **LU-1/LU-2
seam: expected from LU-1:** the guaranteed `ability_increase_required` refusal
is transported as structured LU-1 refusal data and LU-W presents it as “Choose a
feat for this class level.” The UI does not infer its meaning from the old
ASI-only payload or parse an error message.

### 4.5 Epic Boon defer/resolution — LU-1/LU-2 seam

**LU-1/LU-2 seam: expected from LU-1:** at a sourced Epic Boon occurrence, show
qualified Epic Boons using the same feat card renderer, with their returned
ability choice/cap. Also show **Decide later**. Deferral commits the level
through the merged LU-1 arm, creates no fabricated feat mechanics, and displays
the already-pinned `epic_boon_deferred` presentation on Review, Complete, sheet,
and print for as long as it remains unresolved.

Resolution reuses the same route/card renderer and the exact LU-1 resolution arm;
it is not a browser-only patch to an existing choice row. The unresolved-choice
entry priority is owner decision OQ-1.

If OQ-1 selects route-based resolution (A or B), merged state exposes a distinct
`epic_resolution` variant. Its rail is exactly Epic Boon -> Review -> Complete:
Class, Gains, Subclass, Skills, Expertise, and Spells are absent because no level
is added. Review rollback-previews the exact LU-1 resolution arm, showing
unchanged total/class levels, removal of the deferred warning, and only the
chosen Boon's returned effects/unknowns. Complete says **Epic Boon choice
complete**, never “level N complete,” and offers the fresh sheet. If OQ-1 selects
planner remedy C, this route variant does not exist and LU-W only presents the
durable warning/link. W-A must ratify the state variant and W-C the preview arm
from the merged LU-1 contract before either renderer is dispatched.

### 4.6 Skill, Expertise, and spell choices — LU-2 seam

**LU-1/LU-2 seam: expected from LU-2:** after feat configuration, render only
LU-2's planned logical choices:

- Skills use source/rule/ordinal identity, label their granting source, exclude
  already held choices according to the backend plan, and allow a supported
  skill choice to remain unfilled when the merged command allows deferral.
- Expertise follows every skill screen and offers only the returned active
  proficient skills without existing Expertise. An unfilled grant is a named
  permanent warning, not an invented selection.
- Spells reuse `createSpellPicker` presentation while search calls
  `levelUpPlannedEligibleSpells` with the exact merged locator/revision. New
  choices, acquisitions, and optional swaps are visibly distinct. Skipping an
  optional swap preserves the current spell; deferring an owed new choice leaves
  the durable generated choice unfilled and warned.

These steps mutate only the in-memory draft. They do not call guided creation's
durable fill/assign RPCs. LU-2 revalidates and applies every logical locator in
the one final level-up command, so an invalid choice rolls back the class level,
feat, skills, Expertise, and spells together.

### 4.7 Review, confirm, and complete

Review requests a fresh rollback preview for the current draft. It shows before
and after values from the sheet projection, new features/choices, every deferred
or unmodelled warning, and no speculative number. Changing any earlier draft
selection invalidates the preview and requires a new one.

Confirm behavior:

1. synchronously focus and announce a submitting status, then disable
   Back/Cancel/Confirm and every draft control;
2. create one operation UUID for this confirmed draft and retain it through an
   ambiguous network retry;
3. submit the exact merged LU-1/LU-2 command with state revision;
4. on structured revision conflict, keep the draft, show that the character
   changed elsewhere, offer **Reload level-up state**, and do not blind-retry;
5. on success or idempotent replay, discard the draft and load fresh sheet data.

Complete says **Wizard level 2 complete** (using returned names/levels), lists
the applied gains and any outstanding warnings, and provides **Open character
sheet**. It does not show the level-1 backup hint again.

For the acceptance character, the fresh sheet must show total level 2, Wizard 2,
max HP 16, unchanged proficiency bonus +2, and Scholar-granted Arcana Expertise
at +5, as proved by P22/P25/P26. It must also show every newly selected eligible
Wizard spell named by the hand-authored LU-2 acceptance oracle described below.
Reload must preserve those facts and warnings.

## 5. File inventory

No migration, schema, snapshot-version, backup-contract, share-wire, or frozen
wire file belongs to LU-W. LU-1 owns its mint-carrying feat-choice persistence;
LU-2 owns any persistence consequences of its atomic command. The inventory
below is exhaustive for LU-W unless an upstream merge already supplies an item,
in which case LU-W consumes and tests it rather than duplicating it.

| File | Action | Reason |
|---|---|---|
| `src/builder/level-up-wizard.ts` | Modify | Ratify the exact merged LU-1/LU-2 state, preview, and draft-facing types beside the existing route/RPC/locator seam; no guessed payload fields. |
| `src/commands/level-up-class.ts` | Modify only if LU-1 leaves application private | Expose the merged constructed command/application service to rollback Preview without calling the executor; do not change its persistence contract. |
| `src/commands/character-command-preflight.ts` | Create | Share payload validation, factory/integrity construction, and exact revision checks between executor and rollback Preview. |
| `src/commands/character-command-executor.ts` | Modify | Consume the shared preflight so Preview cannot drift from Confirm validation/revision behavior. |
| `src/queries/level-up-state.ts` | Create if not supplied upstream | Build the route read projection from merged rules/command services without browser arithmetic. |
| `src/queries/level-up-preview.ts` | Create if not supplied upstream | Expose the real-command rollback preview used by Review; no parallel calculator. |
| `src/queries/client.ts` | Modify only for methods not supplied upstream | Add typed `levelUpState` and `previewLevelUp` methods using `LEVEL_UP_RPC`. |
| `src/worker/handlers/queries.ts` | Modify only if state is not supplied upstream | Validate/register only the missing read-only state handler and translate the structured merged result. |
| `src/worker/handlers/level-up-preview.ts` | Create if not supplied upstream | Register the rollback-writing Preview RPC outside the ordinary query-handler audit line. |
| `src/ui/screens/level-up/screen.ts` | Create | Exact route adapter, RPC/client wiring, initial state load, router link wiring, and cleanup. |
| `src/ui/screens/level-up/level-up-wizard.ts` | Create | In-memory draft/controller, applicability, navigation, preview invalidation, one-UUID confirm lifecycle, revision-conflict handling. |
| `src/ui/screens/level-up/level-up-shell.ts` | Create | Header, conditional step rail, static not-found/max-level panels, navigation, errors, and focus movement. |
| `src/ui/screens/level-up/class-gains-steps.ts` | Create | Pure Class, Gains, and conditional Subclass renderers. |
| `src/ui/screens/level-up/feat-steps.ts` | Create | Shared 17-card Feat/ASI and Epic Boon/defer renderer over `FeatApplicationPlan`. |
| `src/ui/screens/level-up/grant-steps.ts` | Create | Pure planned Skills, Expertise, and Spells renderers, reusing the existing spell picker presentation. |
| `src/ui/screens/level-up/review-complete.ts` | Create | Preview-backed Review and fresh-result Complete panels. |
| `src/ui/screens/level-up/styles.css` | Create | Responsive level-up layout, visible focus, warning states, and print-safe chrome behavior. |
| `src/ui/screens/sheet/sheet-view.ts` | Modify | Add primary Level Up route action before the advanced planner action. |
| `src/ui/screens/character-list/character-list.ts` | Modify | Add a Level Up route action to every card. |
| `tests/unit/builder/level-up-wizard-contract.test.ts` | Modify | Pin any newly ratified seam types/guards without regenerating expectations from production output. |
| `tests/unit/ui/level-up-wizard.test.ts` | Create | Pure renderer/controller, step applicability, no-write draft, focus/a11y, error, and double-submit tests. |
| `tests/unit/ui/sheet-view.test.ts` | Modify | Pin the sheet Level Up href and action ordering. |
| `tests/unit/ui/character-list.test.ts` | Modify | Pin per-card Level Up link creation through the seam path writer. |
| `tests/integration/queries/level-up-wizard.test.ts` | Create | State/preview RPC validation, preview non-mutation, backend/UI projection, and structured error coverage. |
| `tests/browser/fixtures/level-up-seam.ts` | Create | Read route/panel/control locators from the live seam, following the guided fixture precedent. |
| `tests/browser/fixtures/level-up-characters.ts` | Create | Declare hand-authored expected levels/choices and build/import real character images through merged command/test services, with explicit class-level/revision assertions; avoids driving 18 UI passes or hand-editing arbitrary rows. |
| `tests/browser/level-up-wizard.spec.ts` | Create | Focused ordinary, feat, Epic, LU-2, stale-revision, reload, direct-route, and keyboard journeys in Chromium. |
| `tests/browser/character-list.spec.ts` | Modify | Prove each list-card Level Up href reaches the exact route. |
| `tests/browser/character-sheet.spec.ts` | Modify | Prove the sheet Level Up action and ensure sheet/print/planner routes remain unshadowed. |
| `tests/browser/acceptance-walkthrough.spec.ts` | Modify | Replace the named item-3 seam with the Wizard 1-to-2 journey and post-level reload proof. |

## 6. Dispatch-sized units and dependency edges

All LU-W units are **mint-free**: none may modify migrations or portable wire.
“Pure UI” below means render/controller work over injected state/query/command
clients. Query/worker adapters are separately identified so UI work never grows
an accidental persistence tail.

```text
LU-1 merge -> W-A -> W-B1 -> W-B2 ---+
               \                       \
LU-2 merge ------> W-C -> W-D ----------> W-E -> W-F
```

In words: W-A requires LU-1; W-B1 requires W-A; W-B2 requires W-B1; W-C
requires both W-A and LU-2; W-D requires W-C; W-E requires W-B2 and W-D; W-F
requires W-E.

| Unit | Size | Dependency | Contents and exit |
|---|---|---|---|
| **W-A — LU-1 seam audit and base state adapter** | M | Starts immediately after LU-1 merges. | Compare merged unified feat/Epic command and refusal exports to the existing route seam; ratify only missing state/preview-facing types; implement base not-found/no-held-class/max/class/gains/subclass/feat/Epic state projection and client/worker plumbing. Exit: no old ASI-only payload leaks into new UI types; incomplete held-class characters preserve their warnings without being blocked; state handler has real integration tests. **Mint-free, not pure UI.** |
| **W-B1 — route shell and class progression** | M | W-A; no LU-2 dependency. | Exact screen, shell, draft navigation/loss behavior, initial/direct-route states, Class, Gains, Subclass, rail/focus/unit tests. Exit: these screens work against injected LU-1 fixtures, including unknown HP and incomplete/classless states; no command or persistence write occurs. **Pure UI, mint-free.** |
| **W-B2 — Feat/ASI and Epic surfaces** | M | W-B1; no LU-2 dependency. | The 17-card renderer, effect/grant-rule/text/unknown coverage, ability configuration, keyboard-reachable refusal reasons, Epic defer and OQ-1-selected resolution presentation. Exit: all LU-0 plan arms and the LU-1 warning/resolution seam have focused falsifiable tests. **Pure UI, mint-free.** |
| **W-C — LU-2 projection/preview adapter** | M | LU-2 merge plus W-A. | Consume exact merged planned-choice payload/locator/refusal types; ratify draft-feat planned search; extend state projection; share executor/Preview preflight; expose the existing merged command application only if needed; implement rollback Preview in its dedicated handler; hand-author and source-check the Wizard-2 acceptance choice oracle. Exit: validation/refusals match Confirm, Preview is row/revision neutral, and planned search/commit share locators. **Mint-free, not pure UI.** |
| **W-D — planned Skills/Expertise/Spells UI** | L | W-C; therefore explicit LU-2 edge. | Render logical choices into the in-memory draft, reuse spell picker presentation, provide deferral text and source labels, clear stale downstream choices on upstream edits, and test that no durable guided-fill RPC fires. **Pure UI, mint-free.** |
| **W-E — review, atomic confirm, and complete** | L | W-B2 + W-D. | Preview invalidation/fingerprint handling, warning summary, submitting/complete focus, one-operation-UUID submit, double-submit guard, LU-1 refusal and stale-revision handling, fresh Complete/sheet data. Exit: one click creates one level/revision/history operation and an induced LU-2 failure leaves state unchanged. **UI orchestration, mint-free.** |
| **W-F — D85 entry points and acceptance closeout** | M | W-E. | Sheet/list links, unit/browser regressions, focused Chromium journeys, and exact D112 walkthrough extension. Exit: both entry points reach the route, item 3 finishes level 2, the sheet is correct and reload-stable, and no planner/migration/wire regression appears. **Pure UI/test closeout, mint-free.** |

The mint-carrying dependency is **LU-1**, upstream of W-A. Its migration, backup,
share wire, and frozen fixtures must merge and pass before W-A consumes it.
LU-W must not “help” that lane by touching those files. LU-2 is also upstream;
if it unexpectedly needs persistence/wire changes, those remain in LU-2 and must
merge before W-C.

## 7. Test strategy and negative controls

### 7.1 Unit tests

Use hand-authored state/preview fixtures, not snapshots generated from the
renderer's own output. Test pure step applicability, labels, control state,
draft invalidation, focus movement, refusal messages, and operation UUID reuse.

| Assertion ID | Load-bearing assertion | Named negative-control candidate |
|---|---|---|
| **W-ROUTE-EXACT** | Only the canonical positive-ID level-up path matches; sheet, print, planner, zero, padded IDs, and trailing slash do not. | `loosen-level-up-matcher`: remove the segment-count/positive-ID guard; route test must fail. |
| **W-STEP-SOURCE** | Applicability comes from returned state/plan and respects `LEVEL_UP_STEP_ORDER`; Wizard 2 has no feat/Epic panel while Fighter 6 can have Feat. | `render-all-level-up-steps`: force every step into the rail; absence assertions must fail. |
| **W-HP-UNKNOWN** | Missing hit die/input renders “HP change unknown” and no guessed number/die. | `fallback-hit-die-eight-in-renderer`: add `?? 8` in production `class-gains-steps.ts`; the no-8/no-projected-number assertions must fail. |
| **W-FEAT-17** | One backend candidate yields one card; ASI is only a default marker; unmet/unprovable cards expose keyboard-reachable reasons and cannot be selected. | `add-radio-to-unprovable-grappler`: render a radio for an unprovable card; the no-action and keyboard assertions must fail. |
| **W-FEAT-COVERAGE** | Effect, grant-rule, text, and undetermined-number sections all render from one `FeatApplicationPlan`. | `drop-text-benefits`: omit the text arm in the card renderer; Alert/Defense coverage assertions must fail. |
| **W-EPIC-DEFER** | Decide later remains keyboard reachable and adds the named deferred warning to draft/review. | `require-epic-selection`: disable Next with no Epic choice; the defer journey must fail. |
| **W-LU2-DRAFT** | Skill/Expertise/spell selection changes only the draft before Confirm. | `call-guided-assign-on-select`: invoke a durable guided assignment from the spell callback; the zero-command spy must fail. |
| **W-FOCUS** | Next/Back focuses the new heading; every form control is labelled; alerts receive focus; meaning is not colour-only. | `remove-expertise-label`: delete the Expertise select label/aria-label; accessible-name assertion must fail. |
| **W-ONE-UUID** | Rapid confirm invokes once, with one retained operation UUID; a retry of an ambiguous outcome reuses it. | `uuid-per-click`: move `randomUUID()` inside each submit attempt; equality/call-count assertions must fail. |
| **W-LOAD-ANNOUNCE** | State, preview, submitting, and complete transitions expose busy/status semantics and move focus off controls before disabling them. | `disable-focused-confirm-first`: disable Confirm without moving focus to status; active-element assertion must fail. |
| **W-NO-BACKUP-HINT** | Complete never invokes or renders the level-1 backup hint. | `mount-backup-hint-on-complete`: call `showBackupHintOnComplete`; zero-call/absent-text assertions must fail. |
| **W-COLOR-SIGNAL** | Warning and eligibility states carry visible text plus accessible descriptions, never colour/icon alone. | `warning-icon-color-only`: remove production warning text/description while retaining its CSS class; text and accessible-description assertions must fail. |

### 7.2 Integration tests

Test the real registry, database, merged command, state builder, preview, and
command client boundary. The preview test captures all rows/revision before and
after preview and compares preview “after” to a subsequent real commit.

| Assertion ID | Load-bearing assertion | Named negative-control candidate |
|---|---|---|
| **W-RPC-LIVE** | State and dedicated Preview handler names are registered and validate exact params; state returns typed not-found/no-held-class/max/ready variants and Preview returns the typed projection/refusals. | `unregister-preview-handler`: remove the dedicated handler module; live-registry call must fail with `unknown_method`. |
| **W-PREVIEW-PURE** | Preview changes no row, revision, operation, or sequence, while its after-sheet equals commit. | `commit-preview-transaction`: let preview return normally instead of rolling back; state equality must fail. |
| **W-PREVIEW-PARITY** | Preview and Confirm share payload validation, integrity/factory construction, and strict level-up revision refusal; hand-authored malformed and stale requests produce the same structured refusal/revision data. | `preview-skips-payload-validator`: construct the command directly in production Preview; malformed-payload parity must fail. |
| **W-PREVIEW-AUDIT-LINE** | Registry inspection allows exactly one write-capable read projection, the dedicated identity-sentinel Preview; ordinary query handlers cannot import command application modules. | `register-preview-under-queries`: move Preview into the ordinary query handler; module-boundary assertion must fail. |
| **W-COMMAND-ATOMIC** | LU-1 feat and every LU-2 choice commit in one revision/operation; a late invalid locator rolls everything back. | `force-late-spell-refusal`: make the merged final spell-locator validator reject a hand-authored locator; level/feat/state must remain byte-equivalent. |
| **W-REFUSALS** | **LU-1/LU-2 seam: expected from LU-1:** `class_not_held`, `level_not_adjacent`, and `ability_increase_required` remain structured after worker transport. | `strip-refusal-data-in-worker`: change production handler translation to retain only the message; reason assertions must fail. |
| **W-EPIC-SEAM** | Using an LU-1-owned durable deferred fixture, state reload presents the pinned `epic_boon_deferred` warning; after calling LU-1's merged resolution command, LU-W state no longer presents it and class level is unchanged. LU-1, not LU-W, owns the persistence semantics. | `ignore-epic-warning-in-state-projection`: filter that key in production `level-up-state.ts`; the route-state assertion must fail. |
| **W-PLANNED-SPELL** | Planned search and final LU-2 validation agree for the same logical locator/revision. | `resolve-locator-as-row-id`: change production `level-up-preview.ts` to reinterpret the logical locator as a durable row ID; planned/preview equivalence must fail. |

### 7.3 Focused browser tests (Chromium only)

Add independent journeys for direct not-found/no-held-class/max routes,
incomplete-but-held level 1, Fighter ASI including all 17 cards, a zero-point
feat, Magic Initiate planned spells, level-3 subclass deferral, level-19 Epic
defer/resolution, Wizard/Rogue Expertise, caster new spell and optional swap,
stale revision, rapid double confirm, keyboard-only travel, and reload after
Complete. `level-up-characters.ts` constructs the mid/high-level inputs through
merged services and asserts their exact class levels/revisions before the page
opens; browser tests must not reach level 19 by repeating the UI journey or by
patching database rows ad hoc.

| Assertion ID | Load-bearing assertion | Named negative-control candidate |
|---|---|---|
| **W-ENTRY-BOTH** | Sheet and every list card link to the seam-generated route, while planner stays secondary/advanced. | `list-level-up-to-planner`: point the list action at `/characters/:id`; exact-URL assertion must fail. |
| **W-NO-SHADOW** | Level-up, sheet, print, and planner routes each mount exactly one intended screen. | `level-up-prefix-match`: accept every `/characters/:id/*`; cross-route DOM assertions must fail. |
| **W-KEYBOARD** | Tab/Shift+Tab reaches every action in logical order; Enter/Space operates choices; focus is visible and moves after navigation. | `mouse-only-feat-card`: attach selection only to a card click while disabling its radio; keyboard journey must fail. |
| **W-DOUBLE-CONFIRM** | Two rapid activations create one level, one revision increment, and one operation UUID. | `reenable-confirm-before-await`: re-enable immediately; database operation-count assertion must fail. |
| **W-STALE** | An external edit between Preview and Confirm yields an inline conflict and no level change until explicit reload. | `blind-retry-current-revision`: automatically resubmit using server revision; no-level-change assertion must fail. |
| **W-INCOMPLETE** | A classless card reaches its explanatory advanced-planner state, while a held-class character with unfinished choices remains guideable and repeats rather than blocks its warnings. | `treat-any-warning-as-classless`: branch on warning count in production state builder; ready-state assertion must fail. |

### 7.4 D112 acceptance-walkthrough extension

The exact current seam comment is:

```ts
// Item 3 seam: when the Level Up button and wizard exist, this same sitting
// will continue through LEVEL_UP_WIZARD_ROUTE_SEAM. Until then this test
// makes no assertion about level-up.
```

Replace those three comment lines with a short note that item 3 is exercised
after the current level-1 sheet baseline. Then, immediately after the existing
level-1 sheet assertions and before its final reload block:

1. record the character revision and assert level-1 max HP is 9;
2. click the sheet's **Level Up** link and assert the concrete URL obtained by
   replacing `:characterId` in `LEVEL_UP_WIZARD_ROUTE_SEAM`;
3. assert Wizard 1 -> 2 is selected, advance through Gains, and assert preview
   later confirms the Gains projection: class HP +6, Dwarven Toughness +1, and
   projected max HP 16;
4. assert Subclass, Feat, Epic Boon, and Skills panels are absent for this draft;
5. on Expertise choose Arcana. **LU-1/LU-2 seam: expected from LU-2:** W-C must
   hand-author the exact ordered `ACCEPTANCE_WIZARD_2_CHOICES` oracle in
   `level-up-characters.ts` after LU-2 merges, with each required new-spell or
   swap locator and selected spell name proved against the sourced Wizard-2
   entitlements and the planned-search integration fixture. The walkthrough
   selects every entry by its explicit label/name; it never snapshots or derives
   its expectation from the production preview response. W-F cannot start until
   that named oracle exists and its W-C integration test is green;
6. Preview, Confirm once, assert the Complete panel, and assert the database
   revision increased exactly once;
7. open the sheet and assert total level 2, Wizard 2, max HP 16, proficiency +2,
   Arcana Expertise with +5, and every spell named in the hand-authored oracle;
8. reload that sheet and repeat those exact facts, replacing the old “numbers
   stayed equal at level 1” tail with the stronger level-2 persistence proof.

Acceptance negative controls:

| Assertion ID | Load-bearing assertion | Named negative-control candidate |
|---|---|---|
| **AW-ROUTE** | The sheet action enters the concrete seam route for this character. | `sheet-level-up-wrong-id`: use a fixed or planner ID; URL assertion fails. |
| **AW-HP** | Preview and committed sheet both say 16, proving fixed class HP plus level-scaled species HP. | `omit-species-level-delta`: keep Dwarven Toughness at 1; expected 16 fails. |
| **AW-APPLICABILITY** | Wizard 2 omits subclass/feat/Epic/skills and reaches its real Expertise/spell work. | `show-asi-at-every-even-level`: a Feat panel appears and the absence check fails. |
| **AW-EXPERTISE** | Arcana is durably Expert and computes +5. | `store-expertise-without-proficiency`: active-Expertise/sheet-value assertion fails. |
| **AW-SPELL** | The chosen planned spell appears on the post-commit sheet. | `drop-planned-spell-choice`: spell-section assertion fails. |
| **AW-ATOMIC** | The entire pass increments revision once. | `split-subchoices-into-commands`: revision delta exceeds one. |
| **AW-RELOAD** | Level, HP, Expertise, and spell survive reload. | `complete-from-draft-only`: reload loses a fact and the repeated assertions fail. |

The Arcana expectation is not speculative: P22 proves the fixture has Arcana
proficiency and Intelligence 13, P25 proves Wizard 2 owes Scholar Expertise, and
P26 proves the +5 arithmetic. The exact spell oracle intentionally remains an
LU-1/LU-2 seam expected from LU-2; this document does not invent it before the
planner contract exists.

Final verification for each dispatch is its focused Vitest/integration set plus
`npm run typecheck`. W-F runs:

```text
npm test
npm run build
npm run test:browser
```

## 8. Open decisions for the owner

### OQ-1 — How does a deferred Epic Boon take priority on a later visit?

- **A — Resolve first (recommended):** Level Up opens the same route in an
  outstanding-choice resolution pass. After resolution, the player may start a
  separate one-level pass. This keeps the primary remedy out of the advanced
  planner and preserves D85's one-level-per-pass rule.
- **B — Separate sheet action:** the sheet warning gets **Choose Epic Boon** and
  Level Up continues to the next level independently.
- **C — Planner remedy:** only the advanced planner resolves it. This is the
  smallest route UI but makes a normal wizard deferral require the advanced door.

This decides route priority and labels only. LU-W will use whichever exact LU-1
resolution command arm is merged. **Decision deadline: before W-A exits its
state-variant audit, and therefore before W-B2 or W-E starts.**

### OQ-2 — What should a bundled class with an unknown hit die permit?

- **A — Allow with absent HP preview (recommended):** show **HP change unknown**,
  omit projected HP, retain the sheet's existing explicit estimate warning after
  commit, and do not invent a fourth LU-1 refusal.
- **B — Disable that class option:** explain that fixed HP cannot be derived and
  require repairing/cataloguing the class before guided level-up.
- **C — Leave the route:** send the player to the advanced planner. This does not
  currently supply a different HP truth and risks turning an unknown into a dead
  end.

No option may display an assumed d8 as the class's recorded hit die.
**Decision deadline: before W-A exits its guideability-state audit, and
therefore before W-B1 starts its Gains renderer.**
