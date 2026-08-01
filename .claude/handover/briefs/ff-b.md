# DISPATCH FF-B — D104 atomic flavor authoring command and planner panel (M, MINT-FREE, post-FF-A main, PLAYWRIGHT_PORT=44520)

THE BINDING PLAN is docs/design/2026-07-31-d104-flavor-fields.md section 6.1
(Editing) and unit FF-B in section 9; section 8's row D104-FLAVOR-ATOMIC is
yours. Implement exactly FF-B. FF-C (sheet/print projection) and FF-D
(closeout) are NOT yours: no CharacterSheet flavor object, no sheetSections
row, no print CSS, no sheetFacts work.

EXIT, quoted from the section 9 unit row FF-B: "`update_character_flavor`,
validation/inverse/history, planner panel, client/session wiring, UI
disabled-submit behavior. Exit: one save is one revision and undo restores all
four fields."

PRECONDITION — FF-A must already be in your merge base. Verify all five before
writing code; if any is absent you were dispatched early, STOP and report:
`CHARACTER_TEXT_LIMITS` has four keys (alignment 120, appearance 4_000,
backstory 20_000, notes 20_000); `characters` has alignment/appearance/
backstory columns; `drizzle/0027_character_flavor.sql` exists;
`CURRENT_CHARACTER_SHARE_VERSION === 17`; `CHARACTER_BACKUP_VERSION === 3` and
`CHARACTER_SNAPSHOT_SCHEMA_VERSION === 'a7-v16'`.

FLOORS: take the vitest/Playwright/build numbers from
`.claude/handover/lane-state.md` in your worktree at dispatch — FF-A's merge
raises them above the 3,162 tests / 194 files and 88 / 20 specs recorded
before it. MINT-FREE: you mint NOTHING. Migrations 0000-0027, wire v1-v17,
backup v3 and snapshot a7-v16 all show an EMPTY diff vs your merge base. The
columns and their CHECKs already exist — if the work seems to need a migration
or a wire/backup/snapshot version, STOP and report.

AMENDMENTS (rulings newer than the doc — these WIN):
- D142 overrides section 4.1's limit-table row for `notes` and every "2,000 for
  every new write/share" sentence in 4.1/4.2: notes is 20,000 code points.
  FF-A shipped this in `src/domain/character-limits.ts`. Import
  `CHARACTER_TEXT_LIMITS`; never restate a number in a validator, a form, or a
  test expectation.
- D124 overrides section 6.1's fourth control caption ("Included in share links
  only when you opt in.") and the section 5.2 verbatim/opt-in split it was
  written against. There is ONE share option, "include my written text",
  default OFF, covering all four fields. The panel's caption must not say notes
  is the only opted-in field and must not imply alignment/appearance/backstory
  travel unconditionally. FF-A already shipped that consent control and the
  `too_large` refusal — do NOT touch `src/ui/screens/character-list/
  share-controls.ts`, `src/sharing/**`, or the worker sharing handler. Your
  only obligation is that the panel's wording agrees with what shipped; read it
  before writing the caption.
- D141 (main sheet truncates backstory/notes, optional appendix pages) is
  FF-C's; nothing on the sheet or print path changes here.

## Scope
1. `src/domain/command-contracts.ts`: add `UpdateCharacterFlavorCommand` with
   all four members REQUIRED and typed `string | null`. An omittable key would
   make "one atomic four-field value" a lie — absence is `null`, spelled once.
2. `src/commands/payload-validator.ts`: add `'update_character_flavor'` to
   `commandTypes` (:36-59) and a case to the validate switch (:1513-1545).
   `validateUpdateCharacterFlavor` enforces exact keys, `string | null`, and
   per-field maxima counted as CODE POINTS with `[...value].length` per doc 4.1
   ("Count code points with `[...value].length`") — never `.length`.
3. New `src/commands/update-character-flavor.ts`. Per 6.1: validate all four
   BEFORE opening the write transaction, then one UPDATE setting all four
   columns plus `updated_at`. Blank/whitespace-only becomes `NULL` (4.2), and a
   nonblank value is stored BYTE-FOR-BYTE — doc 4.1: "A nonblank value is
   stored byte-for-byte; trimming is used only to decide whether the field is
   absent." Do NOT reuse `nullableText` from `src/commands/sheet-inputs.ts:48-57`;
   it trims what it stores, which is the opposite rule.
4. Factory case in `src/commands/character-command-factory.ts` (:116 shows the
   `update_character_rules` shape) and the inverse case in
   `src/commands/character-command-executor.ts` (:446-450) restoring the four
   previous root values from the before-snapshot. One revision, one
   `character_operations` row, one history entry (executor :285-316).
5. Sole writer, per 6.1: "the new command becomes its sole writer... Any
   incidental root-update path found during implementation must be redirected
   to this command or narrowed so it cannot write `notes`." Grep for root
   UPDATEs reaching the four columns outside backup/share import and
   restore-snapshot; report what you found even if the answer is nothing.
6. Read projection: `src/queries/character-workspace-builder.ts:220` selects
   `SELECT revision, allow_legacy` with its codec at :59-64 — widen both, add a
   nested `flavor` object (not four top-level strings) to `Workspace` in
   `src/domain/read-models.ts:297-320` beside `allow_legacy`, and carry it
   through the workspace RPC (`src/worker/handlers/queries.ts:263`).
7. Planner panel, per 6.1: "Character details", built with the `panel()` helper
   (`src/ui/screens/planner/editors.ts:35-41`), placed near the character
   heading (`screen.ts:411`) and BEFORE rules/equipment panels. Alignment is a
   text input, never a select; appearance/backstory/notes are textareas. Each
   control's `maxLength` is its `CHARACTER_TEXT_LIMITS` entry (precedent
   `planner/weapons.ts:161-179`) plus a live remaining/maximum readout counting
   code points. Panel statement verbatim: "Free text only. These words are
   stored and printed, but never used to calculate character facts." ONE Save
   button submits the complete four-field value and is disabled SYNCHRONOUSLY
   until the command settles (`session.saving`, screen.ts:89,116-141) — never
   four independent writes.
   DOM `maxLength` counts UTF-16 code units, so astral characters exhaust it
   before the code-point limit. Keep it as the paste guard; the command
   validator is the authority and must ACCEPT exactly `limit` code points of
   astral text. Never weaken the validator to match the DOM — if that
   divergence proves unworkable, report it rather than paper over it.
8. Wire into `PlannerEditorActions` in `screen.ts:527+` through `mutate` /
   `session.execute`, same shape as `updateLegacy` at :537-544.

## Named negative controls (one per load-bearing assertion)
- **D104-FLAVOR-ATOMIC** (doc section 8, verbatim): "update `alignment` before
  validation of an oversized backstory; `update_character_flavor is
  all-or-nothing` must fail with a partially changed row."
- **D104-FLAVOR-UNDO-ALL-FOUR** — the exit criterion itself: make the inverse
  echo the payload's `appearance` instead of the before-snapshot value; the
  test asserting undo restores all four must fail.
- **D104-FLAVOR-BYTES-KEPT** — `.trim()` the stored value; a test saving text
  with leading/trailing spaces and internal newlines and reading it back
  byte-for-byte must fail. Same test proves whitespace-only stores `NULL`, not
  `''`.
- **D104-FLAVOR-CODEPOINTS** — swap `[...value].length` for `value.length`; a
  test saving exactly `CHARACTER_TEXT_LIMITS.backstory` astral code points
  (accepted) and limit+1 (refused BY NAME) must fail.
- **D104-FLAVOR-EXACT-KEYS** — make one member optional in the validator; a
  payload missing `notes` must be refused by name.
- **D104-FLAVOR-NOT-IN-AGENT-JSON** — the planner's D4 agent block builds from
  the workspace (`planner/agent-reference.ts:1086` consumes
  `workspace.allow_legacy`), so step 6 puts flavor one spread away from it.
  Assert none of the four keys and no hostile sentinel appears in the planner
  agent JSON; mutation: add `backstory` to that character block.
- **D104-FLAVOR-ONE-WRITE** (browser, planner.spec.ts) — fill all four, one
  click: assert exactly ONE revision increment and the button disabled while
  saving; mutation: issue four separate `session.execute` calls.
