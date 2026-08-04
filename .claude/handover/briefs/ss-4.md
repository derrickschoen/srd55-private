# DISPATCH SS-4 — legacy route and printable-report retirement (M, MINT-FREE, wt/pwa, PLAYWRIGHT_PORT=44534)

You are working in /home/vagrant/PhpstormProjects/dnd-wt-pwa (branch wt/pwa),
fast-forwarded to main by the supervisor. `.claude/decisions.md` is law and wins
over every other guidance file.

THE BINDING PLAN is `docs/design/2026-08-01-sheet-spell-section.md` (merged at
e29cd35; the doc's own commit is 028d78f). BOUND: **section 4 in full** (4.1
runtime/documentation inventory, 4.2 test/source inventory, 4.3 strict-superset
browser assertion mapping), the **unit row SS-4 in section 5**, and the
section-6 rows **SS-RPC-ONE-PROJECTION** (6.2), **SS-ROUTE-RETIRED**,
**SS-STALE-MESSAGE-GONE** and **SS-BROWSER-NO-WRITE** (6.3). Section 1.2's
P1-P13 are author-proved facts — build on them, do not re-derive.

Implement exactly SS-4.

**NOT YOURS.** SS-1 (typed character-spell projection — the builder, the DTO,
the recursive class-attribution query, the comparator), SS-2 (compact sheet
section, `CharacterSheet.spells` rendering, the sheet-header **Print character
sheet** button), SS-3 (print appendix composition and the `@page` move), SS-5
(closeout and D149 acceptance). Also not yours, in other lanes and other
worktrees: FF-A/FF-B/**FF-C**/FF-D (D104/D141 flavor — SS-3 consumes FF-C's
appendix mechanism, you do not), W-C/W-D/W-E/W-F and W-MC-1..6 (level-up
wizard), D91-R and its FIX chain (resource maxima), FIX-ATTR, RESP-1, P0-P7
(party storage), HA-*/CI-*/DOC-* (the mint chain), SUBCL-SEED, the D153
probe+banner unit, the D158 spell-form/fork units, and the D159 verbose-appendix
unit. You touch no schema, no command, no wizard file, no party file.

## PRECONDITION — check this before writing a line

Section 5's graph makes SS-4 depend on **SS-2 + SS-3** (and transitively SS-1,
and FF-C through SS-3). Verify all of the following exist in YOUR merge base
before deleting anything:

1. `src/queries/character-spell-section-builder.ts` and a `spells` value on
   `CharacterSheet` (SS-1).
2. A rendered compact spell section plus a labelled `.sheet-chrome` **Print
   character sheet** button in the sheet header (SS-2). You do NOT create that
   button — section 4.1 assigns it to the sheet screen and section 5 assigns it
   to SS-2. If it is missing, the 4.3 replacement you must write cannot assert
   it.
3. The spell appendix compositor AND the moved page rule: `@page { size: letter;
   margin: 0.5in; }` present in `src/ui/screens/sheet/styles.css` (SS-3, section
   3.4). **Do not delete `src/ui/screens/print/styles.css` until you have read
   that rule in the sheet stylesheet with your own eyes.** P9 is explicit: the
   legacy screen is where D122 currently lives, and deleting it without the move
   deletes D122. If SS-3 did not move it, STOP and report — do not move it
   yourself and do not delete the file "temporarily".

**When this brief was written none of the three existed** (wt/pwa at e341edd:
no `src/queries/character-spell-section-builder.ts`; `src/ui/screens/print/`
still holds `screen.ts`, `printable-list.ts`, `styles.css`; the only `@page` is
`src/ui/screens/print/styles.css:253`). If that is still the tree you were given,
you were dispatched early: STOP and report.

**Every line number in the design doc is from an older tree.** Locate by exact
test name and exact symbol, never by line number. The current, verified
locations are in the tables below.

EXIT — section 5 row **SS-4**, quoted verbatim (Contents and exit criteria):

> Delete print screen/renderer/CSS, printable builder/RPC/client types, stale
> PHP message, and `/print` links; repoint build report to sheet; adapt fixtures
> and all affected unit/integration/browser/RPC/parity tests. Exit: repository
> search finds no runtime `/characters/:id/print`, printable screen, printable
> RPC, variant, or PHP instruction; the two named browser replacements pass.
> Historical decision/progress records remain explicitly marked.

## AMENDMENTS — D159 (2026-08-01) and what it does to your assertions

No D-ruling is dated after the design doc, but **D159 was recorded at cf6ec53
(22:11) and the doc was written at 028d78f (22:39) without reflecting it.** Read
D159 in `.claude/decisions.md:21-30` yourself. It says printing "offers an OPTION
to append the verbose text — calculations and source disclosures — as appendix
pages, **joining the D141 flavor and D149 spell appendices**".

- **Section 3.3's document order is incomplete, not wrong.** A fourth appendix
  (D159 verbose) will land later, before the D125 notice. You must not build it —
  it is a separate unit — and you must not write an assertion that forbids it.
  Assert **relative** order (spell appendix precedes the notice; the notice is
  `lastElementChild` and keeps `break-before: page`), never an exhaustive sibling
  inventory or an exact appendix count. An assertion the D159 unit has to weaken
  is a defect you authored; weakening it later is forbidden by process rule 4.
- **Section 4.3's "no variant selector" is about the RETIRED control, not about
  print options in general.** Assert the absence of the specific legacy artifacts
  by name — the `Print variant` labelled select, `[data-variant-form]`, the
  `data-variant` attribute, `?variant=` in the URL, and the
  `[data-screen="printable-list"]` root. Do not assert "the sheet header has no
  other controls": FF-C already ships a `.sheet-chrome` checkbox and D159 will
  add a print option.
- **D152 (numbers-only printed feature text)** reinforces the deletions: nothing
  you remove comes back as feature prose. **D153 (WebKit)** is the supervisor's
  spike — browser tests stay Chromium-only and you add no Playwright project
  (that is a config edit anyway).

## MINT-FREE

You mint nothing: no migration, no share-wire version, no character-backup
document version, no character-state snapshot version. Frozen with an EMPTY diff
vs your merge base: migrations 0000-0026 (0027 lives in FF-A), wire v1-v16 (v17
in FF-A), existing a7-v* snapshot assertions, and everything under `db/schema/**`
and `src/db/schema.sql`. Section 5's preamble is explicit: no unit here may edit
migrations, schema declarations, backup versions, character-state versions,
share-wire modules, or frozen portable fixtures. If retirement appears to need
one, that is a dispatch error — STOP and report.

FLOORS: `.claude/handover/lane-state.md` **in your worktree** governs — read it,
it moves. Meet or exceed vitest / Playwright / build 0 as it states them, and
remember SS-1/SS-2/SS-3 raised them ahead of you. At the time this brief was
written that file said vitest 3,218 exit 0 (201 files), Playwright 92 exit 0 (22
specs), build 0 — and the wt/pwa tree contained 201 vitest test files but only
**20** `tests/browser/*.spec.ts` files. Count your own specs; the spec table
covers every spec file present in YOUR tree. If lane-state names more specs than
exist, say so in your report rather than inventing rows.

## Scope

Section 4.1 and 4.2 are the inventory; these are the same rows with their
verified current locations.

1. **Delete `src/ui/screens/print/screen.ts`.** Route matcher, variant parsing,
   printable RPC call, variant navigation and legacy print-button listener all
   die. **No redirect, no route alias, no compatibility shim** — section 4.1's
   last paragraph makes the retired URL an ordinary unmatched route served by
   `src/ui/app.ts`'s unmatched-route shell, and calls a redirect forbidden by
   D149.
2. **Delete `src/ui/screens/print/printable-list.ts`.** This is where the stale
   PHP-era instruction lives (`printable-list.ts:14-18` and `:254-274`). Section
   3.1: it is **deleted, not rewritten**. The words `php artisan` and the Tier-2
   installation advice must not survive anywhere in runtime code or DOM.
3. **Delete `src/ui/screens/print/styles.css`** — only after the precondition-3
   check. Exactly one `@page` rule must exist in the bundle afterward.
4. **`src/ui/screens/planner/screen.ts:425-432`** — remove the `Print spells`
   anchor (`print.href = /characters/${session.characterId}/print`) and drop it
   from `actions.append(status, sheet, print)`. Keep the `Character sheet`
   anchor. No test asserts either label today (verified: the only other
   occurrence of those strings is the title assertion inside the browser test you
   are deleting), so this is a clean removal.
5. **`src/ui/screens/build-report/build-report.ts:214`** — replace
   `<a href="/characters/${characterId}/print" …>Printable spell list</a>` with
   `Character sheet` linking to `/characters/${characterId}/sheet`. The build
   report stays read-only and otherwise unchanged.
6. **`src/ui/screens/sheet/screen.ts:14-22`** — the comment currently explains
   matcher priority against `/print` ("`print` (p) is tested before `sheet` (s)").
   Update the prose to state why the `/sheet` matcher stays EXACT on its own
   merits. Keep the exact matcher; do not loosen it.
7. **`src/queries/client.ts`** — remove the printable import (`:50`), the
   `printable(` method on the client type (`:101`) and its implementation
   (`:252-262`). `sheet()` is the one spell-bearing projection.
8. **`src/worker/handlers/queries.ts`** — remove the
   `printable-spell-list-builder` import (`:27`), `isPrintableParams` and the
   `PrintableParams` type (`:227-235`), and the `queries.reports.printable`
   handler (`:345-352`). No replacement RPC is minted; `queries.characters.sheet`
   already carries spells from SS-1.
9. **Delete `src/reports/printable-spell-list-builder.ts`** after confirming SS-1
   already took whatever access/fact reading it needed. Do NOT preserve
   `PrintableVariant`, the unprepared long-rest catalog sections, or a
   compatibility DTO.
10. **`src/reports/printable-ordering.ts`** — delete it, or keep it only if a
    live non-printable caller remains (check; `src/reports/build-report-ordering.ts`
    is a different module and stays). The D149 comparator is level → name →
    branded id and belongs to SS-1; do not resurrect source-natural/mode ordering
    under a new name.
11. **`progress/U72.md`** — retain as a historical delivery record and add a
    short retirement note pointing at D149 and this design. Do not rewrite it as
    though the route never existed. `.claude/decisions.md`, and
    `.claude/handover/lane-state.md` are **retained untouched** — they are the
    binding ruling and the queue record. Historical/planning markdown outside the
    doc's inventory (`BUILD-PROGRESS.md`, `PARITY-AUDIT.md`, `PARALLEL-PLAN.md`,
    other design docs and briefs) is likewise NOT rewritten: the exit clause is
    about **runtime** `/characters/:id/print`, and your final search must be
    scoped to say so honestly rather than by scrubbing history.
12. **Tests, fixtures and the parity oracle** — section 4.2, item by item, in the
    table below. Every removal carries its named strict-superset replacement.

## Removals and their named replacements (section 4.3 is law here)

**A removal without a named replacement is illegal.** Section 4.3 opens with
"Removed browser coverage is legal only with these named replacements." The two
replacement test names are fixed by the doc and are the names your report and
your negative controls must use:

- **“spell section and print appendix replace the legacy print route without
  writes”** — new, in `tests/browser/character-sheet.spec.ts`.
- **“legacy print route retires while the exact sheet route remains reachable”**
  — replaces the shadow test in the same file.

| Removed / amended (verified location today) | Replacement, and what it must add |
|---|---|
| `tests/browser/reports-and-print.spec.ts:173-262` **“reference and full printable routes preserve data and expose accessible print CSS”** (carries `test.setTimeout(90_000)`, measured 30.9s alone) | Deleted. Its six assertion clusters map one-for-one onto **“spell section and print appendix replace the legacy print route without writes”** per the 4.3 table: (a) route/title/controls → `/sheet`, sheet title, compact section, labelled Print character sheet button, named legacy artifacts absent, appendix always on print; (b) source-heading order → class-attributed groups, level/name order inside each class, Gift 2 / Gift 10 as ordered **Other sources**, plus a same-spell-in-two-classes fixture row so grouping cannot be faked by global ordering; (c) Command DC / Misty Step free-cast → Command's Cleric group states Save DC/attack exactly once and is **Prepared**, Misty Step stays under its truthful non-class source as **Known** with its statistics once, and the stored free-cast row is asserted unchanged; (d) variant selection → no selector, no URL variant, appendix always present, Command's exact full prose, Goodberry's text-unavailable statement, the appendix-level notice naming Goodberry, and **no PHP instruction anywhere in the DOM**; (e) print CSS → all `.sheet-chrome` controls hidden, appendix root starts a page, headings/facts avoid separation, long prose `break-inside: auto` with widows/orphans (stricter than the legacy whole-card `avoid`); (f) no-write → full database export compared before/after render, print-media entry and exit, and reload, retaining the exact character/slot/free-cast row assertions. |
| `tests/browser/reports-and-print.spec.ts:83-171` build-report test | **Keep, unchanged.** Do not rename the spec file — a renamed spec churns the spec table and the lane-state spec count, and the doc does not authorize it. |
| `tests/browser/character-sheet.spec.ts:1075-1092` **“the sheet route is not shadowed by the printable-list route”** (`testInfo.setTimeout(20_000)`, measured 14.7s alone) | Replaced by **“legacy print route retires while the exact sheet route remains reachable”**: `/print` mounts NEITHER `[data-screen="printable-list"]` nor `[data-screen="character-sheet"]`; `/sheet` mounts exactly one sheet. Carry a measured per-test timeout forward — this test's cost was SRD boot, which has not changed. |
| `tests/browser/php-feature-parity.spec.ts:2378-2520` **“builds Mutt printable sources with complete facts and only the mechanically relevant number”** (`test.setTimeout(60_000)`, measured 23.4s alone) | **Retain and amend in place, keeping the exact test name** so its persisted-fixture oracle stays recognizable. Replace the `queries.reports.printable` RPC call (`:2385`, currently `rpc<any>`) with `queries.characters.sheet`, and the `/print` route-card assertions (`:2507-2519`) with compact-section / print-appendix / grouped-statistics / marker assertions against the same controlled database. Keep the final `databaseBytes` equality assertion. The old line uses `any`; your replacement must not — process rule 4 forbids introducing one. |
| `tests/browser/character-sheet.spec.ts:545` **“print media keeps the sheet and warnings, adds paper fields, and ends with attribution”** and its `lastElementChild` assertion (`:692`) | **NOT YOURS — SS-3 owns it** (section 5's SS-3 exit: "notice-last assertion unchanged"). Do not edit it. If SS-3 left it un-amended, report that; do not fix it inside SS-4. |
| `tests/unit/ui/level-up-wizard.test.ts:280` `'/characters/7/print'` in the negative route list | Replace with another real non-level-up route (e.g. `/characters/7/report`). Its subject is exact level-up matching, not print existence — the list must keep a real route, not lose an entry. |
| `tests/unit/ui/reports.test.ts` — imports `../../../src/ui/screens/print/printable-list` at `:12`; cases at `:58`, `:86`, `:161`, `:262` | Keep the build-report half (`:58`, `:86`). Move any retained spell projection/rendering assertion into `tests/unit/ui/sheet-view.test.ts` (SS-2's home) or the new query integration coverage. `:161` "renders the reference sheet in deterministic natural source order…" and `:262` "renders the exact partial and unavailable full-reference warnings…" are variant/PHP-warning subjects that retired — deleting them is legal **only** because the retained facts are re-asserted under D149 semantics; name where each landed. |
| `tests/integration/reports/printable-list.test.ts` (444 lines; cases at `:73`, `:244`, `:312`, `:383`, `:419`) | Replaced by `tests/integration/queries/character-sheet-spells.test.ts`. **Check first whether SS-1 already created it** — section 5 gives SS-1 the controlled integration fixture and section 4.2 lists the replacement here; that seam is ambiguous in the doc. Do not duplicate it. Retained proofs: controlled-row, deterministic build, class/source grouping, statistics, description absence, Wizard prepared, no-write, ordering. `:244` (long-rest swaps) and the reference-variant subjects retire — do not relabel long-rest candidates or `spellbook`/ritual-only entries as character spells; section 2.2 and `printable-list.test.ts:350-379` are explicit that book membership is not "known or prepared". |
| `tests/integration/reports/printable-list-fixture.ts` (495 lines) — imported by `tests/browser/reports-and-print.spec.ts:6`, `tests/browser/fixtures/php-parity.ts:19-21` (`printableFixtureImage`, `:604`) and the integration test | Rename/adapt to `tests/integration/queries/character-sheet-spells-fixture.ts` (again: SS-1 may have already done it — check). Keep the multiclass, hostile-source, missing-text, free-cast and mixed-stat facts and add explicit known / prepared / always-prepared / placeholder rows. Repoint **all three** importers in the same change; a dangling import is a red build, and `php-parity.ts` is the parity oracle. |
| `tests/integration/queries/rpc.test.ts:269` `queries.reports.printable` call, inside the case at `:152` **“exposes workspace, catalog, eligibility, report, printable, and history as serializable DTOs”** | Remove the call and assert the extended `queries.characters.sheet` result instead (`:310`, `:328` reference `printable` too). The case NAME contains "printable" — renaming a test is a removal: state the new name and that the same DTO-serializability subject is fully retained, minus the retired method. |

## Negative controls — one per load-bearing assertion, with the failing test

| Assertion | Mutation | Test that must fail |
|---|---|---|
| The retired route mounts nothing (SS-ROUTE-RETIRED) | `keep-print-screen-module`: restore `src/ui/screens/print/screen.ts` so the eager glob discovers it again | **“legacy print route retires while the exact sheet route remains reachable”** |
| The printable RPC is gone from the live registry (SS-RPC-ONE-PROJECTION) | `retain-printable-handler`: leave `queries.reports.printable` registered in `src/worker/handlers/queries.ts` | **“sheet is the sole printable character projection”** — the exact method inventory over the frozen `handlers` array |
| The PHP-era instruction is gone (SS-STALE-MESSAGE-GONE) | `reuse-legacy-text-notice`: re-import the old warning text into the missing-text notice | **“spell section and print appendix replace the legacy print route without writes”** — its forbidden-text assertion (`php artisan`, Tier-2 install advice) |
| Retirement does not cost D122 (SS-LETTER) | `delete-page-rule-with-print-css`: delete `src/ui/screens/print/styles.css` without SS-3's moved rule present | SS-3's **“print media keeps the sheet and warnings, adds paper fields, and ends with attribution”** stylesheet assertion — run it, do not edit it |
| Retirement writes nothing (SS-BROWSER-NO-WRITE) | `persist-print-preference`: write a variant/print flag on render or on print | **“spell section and print appendix replace the legacy print route without writes”** — database export equality across render, print enter/exit, and reload |
| Class provenance survives the move off the legacy grouping (SS-MULTICLASS-PRINT) | `flatten-print-spells`: render one global spell list instead of class groups | the same replacement test's exact headings/order assertions |
| The build report points at the survivor | `restore-printable-link`: put the `/print` anchor back in `build-report.ts` | your build-report link assertion — name it, and put it in `tests/browser/reports-and-print.spec.ts`'s retained build-report test or `tests/unit/ui/reports.test.ts`, whichever you keep |

Run each mutation, watch the named test fail, restore, and paste the real
before/after in your report. A control you did not execute is not a control.

## Process rules (all mandatory)

1. **Spec TABLE for every Playwright spec file in your tree** (20 today): Spec |
   Affected | Why. A bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on **PLAYWRIGHT_PORT=44534**, and the
   full vitest suite. Paste real numbers. Other lanes run suites concurrently —
   contention is the norm; run ONE full vitest at a time (lane-state's 2026-08-01
   concurrency finding: two full vitest pools contend exactly as Playwright
   suites do, and produced four false reds).
4. Any test >1.5s alone gets a per-test timeout (20_000) with the **measured**
   alone-time in a comment. **Never a config edit.** The tests you are replacing
   carry measured ceilings (90_000 / 60_000 / 20_000) — your replacements inherit
   the work, so measure them and annotate; do not copy a number you did not
   measure.
5. No `any` / `@ts-ignore` / `@ts-expect-error` / `.skip` / `.todo`, no config
   edits (vite/vitest/playwright/tsconfig/package.json), no weakened assertions,
   no deleting a test to reach green — a **stated strict-superset replacement is
   the only legal removal**, and on this unit that means the section-4.3 mapping,
   by name. Never regenerate an expectation from our own output; expectations are
   hand-reviewed values.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails.
7. If the scope appears to require a forbidden area (frozen artifact, config,
   another unit's files) or is infeasible as specified — including a missing
   SS-2/SS-3 precondition — STOP and report the finding. That is a correct
   outcome.
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted; the spec table; files created /
modified / **deleted**; the removal→replacement mapping showing every deleted
assertion's named home; negative-control candidates with exact test names and
the observed failures; and the exact command and scope of the final repository
search proving no runtime `/characters/:id/print`, printable screen, printable
RPC, variant, or PHP instruction remains.
