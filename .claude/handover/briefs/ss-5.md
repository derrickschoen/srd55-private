# DISPATCH SS-5 — closeout and D149 acceptance (S, MINT-FREE, wt/pwa, PLAYWRIGHT_PORT=44535)

You are in /home/vagrant/PhpstormProjects/dnd-wt-pwa (branch wt/pwa).
`.claude/decisions.md` is law and wins over every other guidance file.

THE BINDING PLAN is `docs/design/2026-08-01-sheet-spell-section.md` (authored
028d78f, merged e29cd35 — it is on main and on this branch; if it is absent
from your tree you were dispatched to the wrong worktree: STOP and report).

BOUND: the section-5 unit row **SS-5** and the dependency graph above it;
**section 6 in full** — 6.1 (8 unit assertion IDs), 6.2 (8 integration IDs),
6.3 (8 Chromium IDs), the four-command final verification block, and the
closing checksum-manifest paragraph; **section 4.3**'s seven-row strict-
superset browser mapping; **sections 3.3 and 3.4**, the two print invariants
you re-prove rather than re-implement. Section 1.2's P1-P13 are proven facts
— build on them, do not re-derive.

NOT YOURS — every adjacent unit, named:

- **SS-1** (spell-section builder, DTO, `always_prepared` route field,
  recursive class attribution, comparator) — you write no builder.
- **SS-2** (compact section, `CharacterSheet` extension, `sheetSections`,
  Print button) — you write no renderer.
- **SS-3** (print appendix composition, `@page` move) — you compose nothing.
- **SS-4** (deleting the print screen/renderer/CSS, printable builder, RPC,
  client types, `/print` links; repointing the build report) — you delete no
  production file. Your job is to prove SS-1..SS-4 landed as ruled.
- **FF-B / FF-C** (D141 flavor text and its appendix mechanism) — SS-3's
  dependency, not yours; you neither build nor extend it.
- **The D159 compact-print + verbose-appendix unit** (design not yet written),
  **SUBCL-SEED** (D151), **the D158 spell form / fork units**, **W-MC-1..6**,
  **the D153 WebKit spike and the browser probe+banner unit**, and every
  **P0..P7** party unit. None of these are SS-5 and none of them are gaps you
  report against SS-1..SS-4.

## EXIT — section 5 row SS-5, quoted verbatim (Unit | Size | MINT | Dependency | Contents and exit criteria)

> **SS-5 — closeout and D149 acceptance** | S | **None** | SS-4 | Run focused
> projection/view/browser tests, typecheck/build/full suites, and a source
> inventory proving zero mint files changed. Exercise single-class,
> multiclass, non-class source, missing ability/text, hostile text,
> placeholder level, print lifecycle, reload, and no-write behavior. Exit:
> every negative control below has a named test, removed browser assertions
> have the mapped replacement, D91-R resource output is byte-for-byte
> unchanged for the fixture, and no owner question remains.

That row is both your Scope and your EXIT. SS-5 is a **proving** unit: the only
files you may add are acceptance tests that close a named gap the row requires
and SS-1..SS-4 left open. If closing a gap needs production code, that is an
SS-1..SS-4 defect — report it as a fix dispatch, do not absorb it.

## PRECONDITION — check this before running a single gate

Section 5's graph is `SS-1 -> SS-2 -> SS-4 -> SS-5`, with `SS-3` needing
`SS-1 + merged FF-C`. **When this brief was written none of it had landed.**
Verified in this worktree at e341edd:

- `src/queries/character-spell-section-builder.ts` — ABSENT
- `tests/integration/queries/character-sheet-spells.test.ts` — ABSENT
- `src/queries/character-sheet-builder.ts` — zero occurrences of `spells`
- `src/reports/printable-spell-list-builder.ts`, `src/reports/printable-ordering.ts`,
  `src/ui/screens/print/{screen.ts,printable-list.ts,styles.css}` — ALL PRESENT
- `src/worker/handlers/queries.ts:346` still registers `'queries.reports.printable'`

If any of those five facts still holds when you start, SS-4 is not in your
merge base: **STOP and report.** Do not implement SS-4's deletions to unblock
yourself, and do not "prove" retirement against a tree that never retired
anything — a closeout that passes on the wrong base is F19's zero from an
instrument pointed at nothing.

## AMENDMENTS — rulings newer than the design doc that touch SS-5 (these WIN)

- **D159 (2026-08-01) postdates the doc and reopens section 3.3's order.**
  Printing will offer an OPTION to append verbose calculations/source
  disclosures "as appendix pages, joining the D141 flavor and D149 spell
  appendices". Consequences for you alone: (a) the invariant you sign off is
  **the D125 notice is `lastElementChild` and starts a page** (section 3.3,
  P12) — NOT "the spell appendix is the last appendix"; do not accept or write
  an acceptance assertion that closes the appendix stack at three members;
  (b) the sheet Print control gaining an option later is expected, so a test
  asserting "the print button has no options" is a defect, not coverage;
  (c) D159's unit is unwritten and unbuilt — an absent verbose appendix is NOT
  an SS-5 gap and NOT an owner question.
- **D159 also moves the baseline of your byte-for-byte proof.** See scope 5:
  the claim is "unchanged by SS-1..SS-4", measured against your own merge base,
  never "unchanged since the design doc was written".
- **D152 (2026-08-01): printed feature text stays NUMBERS ONLY.** No class or
  subclass feature prose is extracted for v1; the sheet's stated-gap sentence
  is the honest answer. So "spell prose prints but feature prose does not" is
  settled, not an inconsistency to raise, and no feature-text appendix is owed.
- **D153 (2026-08-01): the browser matrix stays Chromium for you.** The WebKit
  feasibility spike is an owner-ordered SUPERVISOR task with owner-ordered
  config scope. Running or adding a `webkit` project here would be the config
  edit process rule 5 forbids. Section 6.3 is Chromium.
- **D151 (2026-08-01) seeds ALL SRD subclasses before the gate.** Your
  scenario matrix must ride SS-1's controlled fixture rows, not seeded catalog
  content; an acceptance test whose expectation moves when SUBCL-SEED lands is
  the wrong test.
- **D158 (2026-08-01)** adds a spell authoring form and a fork button on
  bundled spells, after the HA backend. Their absence from the D149 section is
  not a gap you report.
- **D148 (2026-08-01): the D106 gate HOLDS in full, no early sitting.** Your
  exit clause "no owner question remains" closes D149's unit chain only. It
  does not close the bar, does not authorize a sitting, and is not a
  publish-readiness statement.
- Not touching you, so you need not check them: D150, D154, D155, D156, D157,
  D160 (party/forge rulings). D143a IS already cited by the doc (section 1.1)
  and is bound as written: any invalid or missing spell content suppresses the
  ENTIRE spell-slot section.

## MINT-FREE

You mint nothing and you change nothing mintable. Frozen with an EMPTY diff vs
your merge base: `drizzle/0000-0026*.sql`, `db/schema/**`, `src/db/schema.sql`,
`src/sharing/wire-schemas/v1..v16`, `src/backup/backup-version.ts`
(`DATABASE_BACKUP_VERSION = 1`, `CHARACTER_BACKUP_VERSION = 2`),
`src/character/character-state.ts` (`CHARACTER_SNAPSHOT_SCHEMA_VERSION = 'a7-v15'`),
and every existing `a7-v*` assertion. If your acceptance work appears to need a
table, a column or a version, that is a dispatch error — STOP and report.

## FLOORS

`.claude/handover/lane-state.md` **in your worktree** governs; read it, never
go below it. At the time of writing it reads: vitest 3,218 / 201 files;
Playwright 92 / 22 specs; build 0; migrations 0000-0026 (0027 in FF-A);
wire v1-v16 (v17 in FF-A); a7-v* assertions.

Count reconciliation, so you do not stop on it: the tree at e341edd carries
**201** vitest test files (matches) but **20** files under `tests/browser/`
against lane-state's "22 specs". Count in your own tree, use the higher of
(your count, lane-state) as the floor, and NAME the discrepancy in your report.
Do not silently pick one and do not treat it as a missing-file finding.

## Scope

1. **The four commands, in the design's own order** (section 6, verbatim):
   `npm run typecheck`, `npm test`, `npm run build`, `npm run test:browser`.
   Paste real numbers for each. Playwright runs on `PLAYWRIGHT_PORT=44535`.
2. **Make the typecheck zero trustworthy.** `npm run typecheck` is `tsc -b`,
   and both projects write their build info to a machine-global path shared by
   every worktree on this box (`/tmp/dnd-multiclass-spells-static-app.tsbuildinfo`,
   `…-node.tsbuildinfo`). A concurrent lane can therefore hand you a cached 0.
   Run `npx tsc -b --force` and paste that. (A CLI flag, not a config edit —
   `tsconfig.app.json` includes `src`, `tsconfig.node.json` includes `tests`,
   `db`, `scripts`, `tools`; both stay untouched.)
3. **Negative-control audit — all 24 IDs, applied and inverted one at a time.**
   For each row: apply the exact mutation, run the named test, record the exact
   failing test name and the fail count, then **invert the exact edit** to
   restore (F19: `git checkout <path>` restores to HEAD, not to what you were
   holding — and COMMON.md forbids git commands in this worktree anyway), then
   re-run that test green. A control that kills a *different* test than the one
   named is a finding, not a pass.

   | ID | Mutation | Test that must fail |
   |---|---|---|
   | SS-MARKER | `map-all-buckets-to-known` | “spell markers distinguish prepared, always prepared, and known access” |
   | SS-SINGLE-HEADER | `always-render-class-heading` | “single-class spells omit only the redundant class group header” |
   | SS-STATS-ONCE | `render-stats-per-spell` | “normal spellcasting statistics render once at group level” |
   | SS-MIXED-STATS | `take-first-statistic` | “mixed spellcasting bases remain distinct and render once each” |
   | SS-COMPACT-EXACT | `leak-description-into-sheet` | “compact spell rows contain only D149 fields” |
   | SS-TEXT-SAFE | `append-spell-html` | “hostile spell text is visible inert and absent from sheet facts” |
   | SS-APPENDIX-ORDER | `sort-appendix-by-name-only` | “compact and appendix projections share class level name order” |
   | SS-MISSING-TEXT | `hide-null-description-card` | “missing imported spell text is stated without PHP instructions” |
   | SS-CLASS-ANCESTRY | `stop-source-ancestry-at-origin` | “sheet spells resolve nearest contributing class without inventing one” |
   | SS-CROSS-CLASS | `dedupe-before-grouping` | “multiclass duplicate spell preserves both class contributions” |
   | SS-LEVEL-NAME | `sort-spells-by-route-name` | “class spell order is level then name with unknown level last” |
   | SS-ACCESS-FILTER | `read-slots-without-access-builder` | “sheet spells use evaluated current access only” |
   | SS-FULL-TEXT-SOURCE | `trim-or-reparse-description` | “sheet spell reference preserves stored full text bytes” |
   | SS-NO-WRITE | `cache-spell-order-in-database` | “character spell projection is deterministic and byte-read-only” |
   | SS-NO-SLOT-MATH | `derive-slot-count-from-selected-spells` | “spell section does not alter D91 resource maxima” |
   | SS-RPC-ONE-PROJECTION | `retain-printable-handler` | “sheet is the sole printable character projection” |
   | SS-SCREEN-PRINT | `append-spell-dom-at-render` | “spell section and print appendix replace the legacy print route without writes” |
   | SS-MULTICLASS-PRINT | `flatten-print-spells` | the same named replacement test (headings/order assertions) |
   | SS-LETTER | `delete-page-rule-with-print-css` | “print media keeps the sheet and warnings, adds paper fields, and ends with attribution” |
   | SS-NOTICE-LAST | `append-spells-after-notice` | the amended attribution test, on BOTH sibling-order and `lastElementChild` |
   | SS-LONG-PROSE | `avoid-whole-spell-card` | “spell appendix paginates long prose with the D141 mechanism” |
   | SS-ROUTE-RETIRED | `keep-print-screen-module` | “legacy print route retires while the exact sheet route remains reachable” |
   | SS-STALE-MESSAGE-GONE | `reuse-legacy-text-notice` | the same replacement test, on its forbidden-text assertion |
   | SS-BROWSER-NO-WRITE | `persist-print-preference` | the same replacement test, on database-export equality |

4. **Strict-superset mapping audit (section 4.3, seven rows).** For each
   removed legacy assertion, name the surviving test and the exact assertion
   that replaces it, and prove the replacement is a **strict superset** — a row
   whose replacement is weaker or missing is a blocking finding, not a note.
   The two named replacements are “spell section and print appendix replace the
   legacy print route without writes” and “legacy print route retires while the
   exact sheet route remains reachable”. `tests/browser/php-feature-parity.spec.ts`
   keeps its existing name and its final byte-equivalence assertion.
5. **The D91-R byte-for-byte resource proof — the exit clause, done honestly.**
   Capture `sheet.resources` (the closed `SheetResourceMaximum` union,
   `src/rules/sheet.ts:1293`, produced by `resolveSheetResources` at
   `src/rules/sheet.ts:1874` and consumed at
   `src/queries/character-sheet-builder.ts:689`) for the acceptance fixture
   **with the spell section present**, and compare it byte-for-byte against the
   same fixture's resource value with the spell projection excluded. Compare
   the serialized bytes, not a field subset, and compare the RENDERED resource
   rows/box counts too — D91-R's shape-by-type is a print property, not just a
   number. **The fixture must be one whose slots actually print.** Under D143a
   a fixture with any invalid or missing spell content suppresses the entire
   slot section, and "byte-for-byte identical" between two suppressed sections
   proves nothing; state in your report which fixture you used and that its
   resource section is populated, not suppressed. This is the acceptance-level
   proof; SS-1's `SS-NO-SLOT-MATH` unit-level control is separate and both are
   required.
6. **Mint manifest (section 6's closing paragraph).** Produce an explicit
   pre/post checksum manifest over the migration, wire, backup-version and
   snapshot-version paths listed under MINT-FREE and report no changes. "That
   proof does not require Git" — use file checksums, and say which tool.
7. **Scenario matrix, exercised end to end**, exactly the row's list:
   single-class, multiclass, non-class source, missing ability, missing text,
   hostile text, placeholder level, print lifecycle (screen → print → screen),
   reload, and no-write. State for each whether an existing test already covers
   it or you added one, and where.
8. **Retirement inventory.** Repository search proving zero runtime references
   to `/characters/:id/print`, the printable screen, `queries.reports.printable`,
   `PrintableVariant`, or the PHP-era instruction — while `progress/U72.md` and
   `.claude/decisions.md` / `lane-state.md` retain their historical records
   explicitly marked (section 4.1's last three rows). Grep with Python, not
   shell quoting, for any pattern containing `*`, backticks or `$`.
9. **Line numbers in the design doc have drifted; locate by NAME.** Verified in
   this tree: the doc's `character-sheet.spec.ts:522-530` Letter scan is now at
   :581, its `:625-642` notice-last assertion is at :689-692, and its
   `:1023-1040` printable/sheet shadow test is at :1075-1091 (“the sheet route
   is not shadowed by the printable-list route”). Cite the test names.
10. **Owner questions.** Section 7 says “None.” If your audit produces one
    anyway, that is a real finding: name it in the report, do not answer it
    yourself, and do not declare the exit met.

## Process rules (all mandatory)

1. Spec TABLE for all Playwright spec files: Spec | Affected | Why — a bare
   list is a re-dispatch. Every spec file in `tests/browser/`, including the
   ones SS-1..SS-4 never touched.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44535`. Full
   vitest too. Paste real numbers.
4. Any test >1.5s alone gets a per-test timeout (20_000) with the measured
   alone-time in a comment. Never a config edit. Other lanes run suites
   concurrently; contention is the norm. Run ONE full vitest and at most one
   full Playwright at a time — two of either contend with each other.
5. No `any` / `@ts-ignore` / `@ts-expect-error` / `.skip` / `.todo`, no config
   edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (stated strict-superset replacements
   only), never regenerate an expectation from our own output.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails. For SS-5 that is scope 3's table plus a control
   for any acceptance test you add.
7. If the unit's scope seems to require touching a forbidden area or seems
   infeasible as specified, STOP and report — that is a correct outcome.
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted for all four commands; the spec
table; the 24-row control result with exact failing test names; the seven-row
mapping audit; the D91-R byte-for-byte result and the fixture you used; the
mint manifest; files created/modified; the spec-count discrepancy; every gap
you found in SS-1..SS-4 stated as a finding rather than absorbed.
