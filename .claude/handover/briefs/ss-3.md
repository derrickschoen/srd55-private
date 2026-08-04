# DISPATCH SS-3 — print appendix composition (M, MINT-FREE, wt/pwa, PLAYWRIGHT_PORT=44533)

You are in /home/vagrant/PhpstormProjects/dnd-wt-pwa (branch wt/pwa),
fast-forwarded to main by the supervisor. `.claude/decisions.md` is law and
wins over every other guidance file, including the binding plan below.

THE BINDING PLAN is docs/design/2026-08-01-sheet-spell-section.md. BOUND:
section 3 in full (3.1 content source and card anatomy, 3.2 D141 mechanism and
dependency, 3.3 document order and the D125 last element, 3.4 US Letter
ownership), the unit row **SS-3** in section 5, and the section-6 rows
SS-APPENDIX-ORDER, SS-MISSING-TEXT, SS-SCREEN-PRINT, SS-NOTICE-LAST,
SS-LONG-PROSE, SS-LETTER. Sections 1.2 (P1-P13) and 2 are supervisor-reviewed
proven facts — build on them, do not re-derive them.

## PRECONDITION — check this FIRST, before writing a line

**HARD PREREQUISITE: FF-C must be MERGED TO MAIN.** Section 1.2 P10 of the
plan disproved the supplied claim that D141's flavor appendix already exists:

> The supplied claim that D141's flavor appendix is implemented is false in
> this current tree. Its implementation is a prerequisite, not evidence this
> document can cite as code.

Verified by the supervisor at main `e341edd` when this brief was written:
`git grep -in "flavor\|appendix"` over `src/queries/character-sheet-builder.ts`
and `src/ui/screens/sheet/` returns **nothing**. FF-C had not merged.

Before anything else, prove in YOUR merge base that all of the following exist:

1. `CharacterSheet.flavor` on `src/queries/character-sheet-builder.ts`.
2. FF-C's **pure appendix-content factory** — a function of `CharacterSheet`
   returning appendix content with no DOM (ff-c.md scope item 5) — and the
   compositor that materializes it, extending `setSheetPrintContent()`
   (`src/ui/screens/sheet/sheet-view.ts:1303`).
3. FF-C's shared appendix page-break CSS class in
   `src/ui/screens/sheet/styles.css` (`break-before: page` on the appendix
   root, `break-inside: auto` on prose).
4. `CharacterSheet.spells` and the `SheetSpellGroup[]` contract from **SS-1**
   (section 2.1). SS-3's dependency row is "SS-1 + merged FF-C", both arms.

**If any of the four symbols is absent: STOP and report, naming which one.**
Do NOT build a spell-specific appendix mechanism, a second compositor, a
second page-break class, or your own spell projection. The plan's SS-3 row
ends "If FF-C is still absent, this unit is blocked rather than minting a
second mechanism" — a blocked report is the CORRECT outcome, not a failure.
If FF-C landed under different symbol names, consume those names after a local
seam audit and say so in your report (section 3.2).

## NOT YOURS

**SS-1** (the spell projection, builder, comparator, class attribution,
`always_prepared` route field) — you consume it, you do not write it.
**SS-2** (the compact on-screen/on-paper spell section, `sheetSections`, the
sheet-header Print button). **SS-4** (deleting `src/ui/screens/print/screen.ts`
and `printable-list.ts`, the printable RPC/client types, the `/print` links,
the build-report repoint, the fixture renames, and the two named browser
replacements in section 4.3). **SS-5** (closeout). **FF-C** itself and
**FF-B**. The D159 optional verbose-calculation appendix is a FUTURE unit with
its own design — not yours to build.

Concretely: you delete no screen module, no printable builder, no RPC handler,
and no legacy test. The ONLY line you may remove outside your own files is the
four-line `@page` block in `src/ui/screens/print/styles.css:253-256` — see
scope item 7. Everything else in that file is SS-4's.

## AMENDMENTS — read this section, it is not boilerplate

**No D-ruling postdates the design doc.** Verified by commit order: `cf6ec53`
(D157-D160) precedes `028d78f` (the SPELL-SEC design). So there is no ruling
that lands *after* the plan and silently overrides it. Two rulings recorded
*before* the plan nevertheless touch SS-3 and are NOT bound by it. Decisions
win over guidance files, so they bind you:

- **D159 adds a THIRD appendix the plan's section 3.3 order does not list.**
  D159 verbatim: printing "offers an OPTION to append the verbose text —
  calculations and source disclosures — as appendix pages, joining the D141
  flavor and D149 spell appendices." Section 3.3 states a closed four-line
  order (sheet → flavor appendix → spell appendix → notice). CONSEQUENCE FOR
  YOU: implement that order exactly as written — you add no verbose appendix —
  but do NOT encode the appendix set as a closed two-member enum, a hardcoded
  pair of calls, or a test asserting "exactly two appendices exist." The
  ordering seam must accept a third registered appendix ahead of the notice
  without a rewrite. Assert the RELATIVE order (flavor before spell, spell
  before notice, notice last) — never an absolute child count.
- **D153 does not put WebKit in your suite.** iOS Safari is a support target
  *pending a supervisor-run WebKit spike*; the playwright-config change that
  spike needs is owner-ordered supervisor scope. Your browser proofs are
  Chromium (D109). Adding a webkit project is a config edit and a re-dispatch.
- **D152 is not a collision — do not stop on it.** "Printed feature text stays
  NUMBERS ONLY" governs class/subclass FEATURE text extraction. It does not
  touch SRD spell prose, which is already stored (P7) and which D149 orders
  printed. If you find yourself reasoning that D152 forbids the spell
  appendix, you have misread it.
- **D43/D45 + P8 keep the notice load-bearing.** The bundled prose you print
  is CC-BY SRD material (`docs/srd/ATTRIBUTION.md:32-39` requires the notice in
  any printed sheet reproducing SRD text). The spell appendix therefore sits
  BEFORE, and is covered by, the existing D125 notice. That is the mechanical
  reason the notice stays last — not a layout preference.

## THE OWNER'S WORDS — quoted verbatim from D149, not paraphrasable

> OWNER ADDITION, verbatim requirement: "print multiclass spells grouped by
> class, order by level and name" — the printed spell section and appendix
> group by contributing class, ordered by level then name within each class.

The appendix consumes SS-1's already-ordered `SheetSpellGroup[]` and renders
it in array order. **You write no comparator and no grouping code.** Section
3.1: "There is no renderer-side regrouping and no second comparator." A
second comparator that happens to agree is the defect SS-APPENDIX-ORDER
exists to kill.

## MINT-FREE

You mint nothing: no migration, no share-wire version, no character-backup
document version, no character-state snapshot version, no column, no table, no
RPC method. Frozen with an EMPTY diff vs your merge base: migrations
0000-0026, wire v1-v16, existing a7-v* snapshot assertions. If your work
appears to need a registry number, a column, or a new RPC, that is a dispatch
error — STOP and report (process rule 6).

## FLOORS

`.claude/handover/lane-state.md` IN YOUR WORKTREE governs and is authoritative;
it will be HIGHER than this brief once FF-C and SS-1 merge. At writing it read:
vitest 3,218 exit 0 (201 files), Playwright 92 exit 0 (22 specs), build 0.
Meet or exceed whatever it says when you start.

## Scope

The unit row, quoted verbatim from section 5 (Contents and exit criteria):

> Reuse FF-C's pure appendix/compositor and page-break classes; add full spell
> cards, missing-text disclosure, class/level/name order, long-prose splitting,
> explicit appendix order, and D125-before/last behavior. Move the single
> Letter `@page` rule to sheet CSS. Exit: print-media browser test proves
> Letter, screen↔print lifecycle, flavor→spell→notice ordering, notice-last
> assertion unchanged, and full stored prose. If FF-C is still absent, this
> unit is blocked rather than minting a second mechanism.

1. **Pure content first, DOM second.** Supply the spell-appendix content as a
   pure function of `CharacterSheet` in `sheet-view.ts`, on FF-C's precedent,
   so the unit suite pins card anatomy and order with no DOM — exactly as
   `sheetSections`/`sheetFacts` are pinned today. The compositor renders that
   value; it makes no decisions of its own.
2. **Always-on, no selector.** Section 3.1: "Printing the sheet always appends
   the spell appendix when at least one compact spell exists. There is no
   reference/full selector and no opt-in: D149 says printing appends full
   text." Contrast FF-C's flavor appendix, which IS opt-in — do not copy its
   checkbox. Zero spells ⇒ no appendix root at all.
3. **Card anatomy, in this order, from `SheetSpell.reference`** (section 3.1):
   (1) name, level, school, and non-2024 edition marker when applicable;
   (2) casting time/action, range, duration, components, concentration, ritual;
   (3) upcast and cantrip-upgrade lines only when recorded, preserving their
   distinct units; (4) attack modes and save abilities when recorded; (5) the
   exact stored description prose, preserving line breaks. A field that is not
   recorded is omitted or stated absent — never rendered as an em dash that
   reads as zero, never invented (D33).
4. **Missing text is disclosed, never fabricated.** `description === null`
   renders "Full spell text unavailable for this imported or placeholder
   spell." plus ONE appendix-level notice that NAMES the affected spells. It
   must not claim text is globally uninstalled — bundled SRD text exists by
   D43 and P7. The PHP-era instruction at
   `src/ui/screens/print/printable-list.ts:14-18` and `:254-274` is **deleted
   by SS-4, not rewritten and not imported by you.** Your notice shares no
   string with it.
5. **Text safety.** Spell names, source names and prose are unverified
   imported/homebrew text: names through `freeTextSpan()`
   (`src/ui/free-text.ts:22-28`), prose text-node-only, `white-space: pre-wrap`
   for the stored line breaks. No `innerHTML` anywhere in the appendix path.
   Prose and free-text names stay OUT of `sheetFacts()` (section 2.1).
6. **Pagination, exactly the D141 mechanism** (section 3.2), reusing FF-C's
   classes rather than new spell-specific ones:
   - one appendix root begins with `break-before: page`;
   - group and spell headings use `break-after: avoid`;
   - a short heading/facts block avoids splitting;
   - spell prose uses `break-inside: auto`, `orphans: 3`, and `widows: 3`;
   - the whole spell card is **NOT** `break-inside: avoid` in full-text mode.
   That last line is deliberate and is stricter than the legacy whole-card
   `avoid` it replaces (section 4.3): a long spell must continue naturally
   rather than overflow or waste a page.
7. **The single `@page` rule moves.** `@page { size: letter; margin: 0.5in; }`
   lives at `src/ui/screens/print/styles.css:253-256` and is the ONLY thing
   supplying D122 today (P9); screen CSS is eagerly bundled
   (`src/ui/app.ts:33-35`), which is why the retiring screen's rule currently
   reaches the sheet. Copy it **verbatim** into
   `src/ui/screens/sheet/styles.css` AND delete exactly those four lines from
   the print stylesheet in the same change, so the tree never holds two
   `@page` rules. Touch nothing else in that file.
8. **Document order is owned by one place** (section 3.3):

   ```text
   main character sheet (including compact spell section)
     -> optional D141 full-written-text appendix
     -> D149 full-spell-text appendix
     -> D125 SRD attribution notice + origin line (always last)
   ```

   "On every synchronization, remove previously generated print nodes, create
   the enabled appendices in that order, then append the attribution notice. Do
   not let an appendix append itself after the notice." Appending the notice
   LAST, after all appendices, is the mechanism; an appendix that inserts
   itself relative to the notice is the defect.
9. **Print-media lifecycle, on the existing contract** (P11): appendix DOM is
   created only while print media is active and removed on return to screen.
   The screen never contains hidden full spell text (section 2.5) — that is a
   D4 invariant, not a preference. Drive it from the existing
   `beforeprint` / `matchMedia('print')` / `afterprint` wiring in
   `src/ui/screens/sheet/screen.ts:70-94`; add no new listener path.
10. **Read-only.** The sheet screen writes nothing. No print preference, no
    variant, no "appendix shown" flag, no storage, no command, no query param.

EXIT (the same row, exit half, quoted verbatim):

> Exit: print-media browser test proves Letter, screen↔print lifecycle,
> flavor→spell→notice ordering, notice-last assertion unchanged, and full
> stored prose.

## The notice-last interaction — get this exactly right

P12, verified: the compositor appends the D125 notice last
(`src/ui/screens/sheet/sheet-view.ts:1353-1363`), CSS gives it
`break-before: page` (`src/ui/screens/sheet/styles.css`), and the browser test
asserts both the break and `parentElement.lastElementChild === element`. The
supervisor confirmed both assertions live in
`tests/browser/character-sheet.spec.ts` inside the test named
**"print media keeps the sheet and warnings, adds paper fields, and ends with
attribution"** (`test(` at :545; the notice assertions at :689-693).

Section 3.3: "This assertion stays unchanged... Amend that same named browser
test by adding two assertions: the spell appendix precedes the notice, and the
notice remains `lastElementChild` with `break-before: page`."

So: **the existing assertions are not edited, reordered, or relaxed — they are
joined by new ones, in the same test, under the same name.** Changing that
test's name breaks the mapping in section 4.3 and is a re-dispatch.

## Tests

The same test file also holds the `@page` scan
(`tests/browser/character-sheet.spec.ts:581`,
`expect(pageRules.some((rule) => /size:\s*letter/.test(rule))).toBe(true)`).
Note a real weakness the supervisor found: `some()` cannot fail on a
DUPLICATE `@page`, only on a missing one. SS-LETTER's claim is "exactly one
Letter `@page` rule with 0.5in margin." **Assert exactly one.** Strengthening
an assertion is legal and expected here; weakening one is not, and this is the
distinction — the existing `some()` assertion stays, and an exactly-one
assertion joins it.

Browser tests you own (Chromium):

- the amendment to **"print media keeps the sheet and warnings, adds paper
  fields, and ends with attribution"** described above, plus the exactly-one
  `@page` assertion;
- a NEW test **"spell appendix paginates long prose with the D141 mechanism"**
  covering computed `break-before`/`break-after`/`break-inside`/widows/orphans
  and the screen↔print lifecycle (pre-print count 0, print count N, after-print
  count 0) against a fixture with one deliberately long spell.

**SEQUENCING GAP, and you must name it in your report rather than close it:**
section 6.3 names the SS-4 replacement test "spell section and print appendix
replace the legacy print route without writes" as the failing test for
SS-SCREEN-PRINT and SS-STALE-MESSAGE-GONE. That test does not exist yet and is
SS-4's to create when it removes the legacy browser test. Do NOT create it,
do NOT remove `tests/browser/reports-and-print.spec.ts:173-262`, and do NOT
leave the assertion uncovered — put the lifecycle and forbidden-text proofs
you can make today in your own named test, and report that the strict-superset
replacement is OWED TO SS-4.

Unit coverage goes in `tests/unit/ui/sheet-view.test.ts` against the pure
appendix-content function. Integration coverage of the projection itself is
SS-1's — do not duplicate it.

## Negative controls — one per load-bearing assertion, with the failing test

| Assertion | Mutation | Test that must fail |
|---|---|---|
| Appendix and compact section share one order (**SS-APPENDIX-ORDER**) | `sort-appendix-by-name-only`: add an appendix-local comparator | **"compact and appendix projections share class level name order"** |
| Missing text is stated, PHP instruction never appears (**SS-MISSING-TEXT**) | `hide-null-description-card`: omit the card/notice | **"missing imported spell text is stated without PHP instructions"** |
| Notice stays last (**SS-NOTICE-LAST**) | `append-spells-after-notice`: append the spell appendix at the end | **"print media keeps the sheet and warnings, adds paper fields, and ends with attribution"** — both the sibling-order and `lastElementChild` assertions |
| Long prose splits (**SS-LONG-PROSE**) | `avoid-whole-spell-card`: apply `break-inside: avoid` to a long card | **"spell appendix paginates long prose with the D141 mechanism"** |
| US Letter survives the move (**SS-LETTER**) | `delete-page-rule-with-print-css`: remove the legacy rule without moving it — and, separately, leave the copy in `print/styles.css` so two exist | **"print media keeps the sheet and warnings, adds paper fields, and ends with attribution"** — the stylesheet assertion, on both mutations |
| Screen holds no hidden appendix (**SS-SCREEN-PRINT**) | `append-spell-dom-at-render`: create appendix DOM during `renderSheet` | your new lifecycle test's pre-print/after-print counts (the SS-4 replacement is owed — say so) |
| Grouping is not re-derived | `regroup-appendix-by-source-name`: group the appendix by `source_name` instead of consuming SS-1's groups | **"compact and appendix projections share class level name order"** |
| Prose is inert | `append-spell-html`: `innerHTML` in place of the text node / `freeTextSpan` | **"hostile spell text is visible inert and absent from sheet facts"** |
| Stored bytes are lossless | trim or re-wrap the description in the renderer | your appendix-content unit test, on a whitespace/newline sentinel |

## Process rules (all mandatory)

1. Spec TABLE for ALL Playwright spec files (22 at writing): Spec | Affected |
   Why — a bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44533`. Full
   vitest too. Paste real numbers — not "green", the counts.
4. Other lanes run suites concurrently; contention is the norm. Any test >1.5s
   alone gets a per-test timeout (20_000) with the MEASURED alone-time in a
   comment. **Never a config edit.**
5. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `.skip`, no `.todo`, no
   config edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (a stated strict-superset replacement
   is the only legal removal), never regenerate an expectation from our own
   output — expectations are hand-reviewed values.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails.
7. If the unit's scope seems to require touching a forbidden area (frozen
   artifact, config, another unit's files) or seems infeasible as specified,
   STOP and report the finding — that is a correct outcome.
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted; the spec table; files
created/modified; negative-control candidates with exact test names; the FF-C
seam audit (which merged symbols you consumed, and under what names); and the
named gap owed to SS-4.
