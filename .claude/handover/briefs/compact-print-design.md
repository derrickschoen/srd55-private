# DESIGN DISPATCH — COMPACT-PRINT-DESIGN: compact ordinary numbers on paper, optional verbose appendix (DOC ONLY, MINT-FREE)

You are in /home/vagrant/PhpstormProjects/dnd-wt-hyg2 (branch wt/hyg2) — the
supervisor created and positioned it. DOC-ONLY: no port, no suites, run NO git
commands. `.claude/decisions.md` is law and wins over every other guidance file.

You write EXACTLY ONE file:

    docs/design/2026-08-02-compact-print-verbose-appendix.md

No source, test, migration, config or CSS changes. No commits. If the work
appears to require touching code to answer a question, that is a finding to
record IN the document ("needs a spike"), not a licence to edit.

## THE BINDING TEXT — there is no design doc for this unit, because you are writing it

Every other dispatch quotes a design doc's unit row. Yours does not exist yet.
The binding text is therefore the rulings themselves, quoted verbatim from
`.claude/decisions.md`, and the document you produce is what later dispatches
will quote.

**Scope — D159, quoted verbatim (the whole ruling; every clause is scope):**

> ## D159 — OWNER: print compacts ordinary numbers; verbose audit moves to an OPTIONAL appendix (2026-08-01)
>
> Supersedes the print-everything default within D89's constraint: on paper,
> CORRECT ordinary numbers drop their per-row reasoning; warnings and
> absence statements keep full sentences; the sheet prints one stated line
> that source breakdowns are on screen (D89's stated-absence rule). NEW:
> printing offers an OPTION to append the verbose text — calculations and
> source disclosures — as appendix pages, joining the D141 flavor and D149
> spell appendices. D67 exception recorded: on paper the sources are in the
> optional appendix, not beside the number; on screen nothing changes.

**The unchanged half — D67, quoted verbatim:**

> ## D67 — OWNER: sheet shows the FINAL NUMBER; sources on hover or touch (2026-07-29)
>
> Every derived number carries a reveal naming the sources that summed to it —
> hover for pointer, touch for touch; both are requirements. D33 stands: an
> UNKNOWN says unknown on the face of the sheet, not only in a reveal.

**The frame D159 says it works "within" — D89, quoted verbatim:**

> ## D89 — OWNER: the v1 printout is a print stylesheet over the sheet route (2026-07-30)
>
> One column, chrome suppressed, D88 empty current-HP box in print, browser
> print-to-PDF. Classic two-page form is NOT v1. Hover-only content needs a
> printable fallback or must state its absence.

**EXIT for this dispatch:** `docs/design/2026-08-02-compact-print-verbose-appendix.md`
exists and contains every numbered item in "What the document must contain"
below; every file:line claim in it is verifiable in THIS worktree; every D
number cited resolves in `.claude/decisions.md`; the unit table carries exit
criteria and dependency edges; the negative-control table names an exact test
per load-bearing assertion. A document that asserts the current print behaviour
without file:line is a re-dispatch.

## AMENDMENTS — rulings newer than the docs you build on (these WIN)

You are extending a print/appendix design that lives across two merged
documents and one queued brief. Where they disagree with a ruling, say so in
your document rather than inheriting the older text.

- **D159 supersedes the print-everything default in the merged code and its
  comment.** `src/ui/screens/sheet/styles.css:128-131` states, as the rationale
  for the whole print block, "Disclosures remain inline and D95 warnings retain
  the same readable size". The first clause is now false for correct ordinary
  numbers. Quote that comment in your document and state what replaces it. The
  second clause STILL HOLDS — warnings keep full sentences and readable size.
- **D152 (2026-08-01) bounds your appendix and is newer than D89/D141.** Printed
  feature text stays NUMBERS ONLY: no class or subclass feature rules text is
  extracted for v1. The verbose appendix carries CALCULATIONS AND SOURCE
  DISCLOSURES — the per-row reasoning the main sheet just dropped — and nothing
  else. It may not become the back door through which D152's excluded rules text
  arrives. Say this in the document, in those terms.
- **D149 (2026-08-01) already fixed the printed document's appendix order**, and
  `docs/design/2026-08-01-sheet-spell-section.md` §3.3 ("Document order and the
  D125 last element", lines 371-390) writes it as: sheet → flavor appendix →
  spell appendix → D125 notice, always last. **D159 adds a THIRD appendix that
  that list has no slot for.** Placing it is YOUR document's job; see item 6.
- **D125 (2026-07-31) is merged and its assertion is load-bearing.** The notice
  is appended last with `break-before: page`
  (`src/ui/screens/sheet/sheet-view.ts:1353-1363`;
  `src/ui/screens/sheet/styles.css:232-235`) and the browser test asserts both
  the break and `parentElement.lastElementChild === element`
  (`tests/browser/character-sheet.spec.ts:637-643`). SS-3's exit criterion says
  that assertion stays UNCHANGED. Your appendix goes before it, never after.
- **D153 (2026-08-01) amends D109's chromium-only matrix PENDING a supervisor
  WebKit spike.** Your test strategy is Chromium (`page.emulateMedia`), exactly
  as the merged print tests are. Do not design a proof that assumes WebKit, and
  do not claim iOS Safari print behaviour you have not measured.
- **D110 pre-alpha, D33 computed-or-absent, D4 collapsed-never-hidden, D108
  keyboard/labels/no-colour-only** all apply unchanged and constrain the option
  control and the pointer line.

## NOT YOURS — name every one of these as out of scope in the document

- **FF-C** (D104/D141 flavor projection, truncated print, opt-in appendix
  mechanism, `break-before: page` classes) — `.claude/handover/briefs/ff-c.md`,
  in flight in wt/attunement, UNMERGED. You REUSE its mechanism by name; you do
  not design a second one and you do not redesign it.
- **SS-1 / SS-2 / SS-3 / SS-4 / SS-5** — `docs/design/2026-08-01-sheet-spell-section.md`
  §12. SS-3 owns the spell appendix, the explicit appendix ORDER, and moving the
  single Letter `@page` rule into sheet CSS. SS-4 owns retiring the legacy
  `/characters/:id/print` route. You touch none of them; you state the edge.
- **FIX-ATTR / D125** — merged. The notice block, the build id, and the
  last-page rule are settled. You constrain yourself to them; you do not restate
  them as your own design.
- **W-D / W-E / W-F and W-MC-1..6** (level-up wizard, multiclass entry),
  **P0-P7 and the D157 roster** (party storage), **HA-1..5 / CI-3a..CI-8 /
  DOC-C / DOC-L** (the mint chain), **SUBCL-SEED** (D151), **the D158 spell
  form + fork**, **the D153 WebKit spike and the probe+banner unit**, and
  **HYG-3** (the ai-chat annotation currently dispatched in this same worktree)
  are all NOT yours. Your document proposes no work in any of them.

## FLOORS

Floors are not yours to run — this dispatch executes no suite. The current
vitest / Playwright / build floors and the frozen-artifact list (migrations,
wire versions, existing `a7-v*` snapshot assertions) live in
`.claude/handover/lane-state.md` IN THIS WORKTREE. Your unit table must say its
units are MINT-FREE and must point at that file for floors rather than baking a
count into the document — counts in a design doc go stale within a day and have
already caused one stop-and-reconcile this week.

## What the document must contain

1. **What the print stylesheet does TODAY, proved by file:line.** Line numbers
   differ between main and this worktree (`src/ui/screens/sheet/styles.css`'s
   print block starts at 133 here and 188 on main) — cite what YOU read in THIS
   tree, and say which commit you read. At minimum, account for:
   - `src/ui/screens/sheet/styles.css:127-235` — the whole `@media print` block:
     its rationale comment (128-131), chrome suppression, one-column reflow,
     `.sheet-warnings { font-size: 1rem }` (163), the resource-track and paper
     entry rules, and `.sheet-print-notice { break-before: page }` (232-235).
   - `src/ui/styles/base.css:126-137` — the global print block (black on white,
     footer and ai-chat hidden).
   - `src/ui/screens/print/styles.css:253-256` — the legacy route's
     `@page { size: letter }`. State plainly that this is SS-3/SS-4's to move
     and retire, and that your design must not depend on it existing.
   - `src/ui/screens/sheet/sheet-view.ts:1303-1364` — `setSheetPrintContent`,
     the print-time DOM mutator: what it adds, what it removes, and the D4
     invariant in its doc comment (print nodes exist only while print media is
     active; the screen subtree conceals nothing).
   - `src/ui/screens/sheet/screen.ts:70-94` — the print lifecycle: `beforeprint`,
     `afterprint`, and the `matchMedia('print')` listener that Playwright's
     emulated media drives. Any option the user ticks must survive this cycle;
     say how.
2. **An inventory of EVERY disclosure the compaction touches**, as a table, one
   row per producer: what it is, where it is produced (file:line), what it says
   on screen, and what D159 does to it on paper (drop / keep / move to
   appendix). The compaction is a claim about ALL of them, so the inventory is
   the document's spine, not an appendix to it. It must at least separate:
   - **Per-row reasoning** — every row gets a `.sheet-formula` `<p>` built from
     `row.detail` at `src/ui/screens/sheet/sheet-view.ts:1256-1260`, styled at
     `styles.css:83-87`. This is the bulk of what D159 drops on paper.
   - **Rows whose `detail` is not reasoning at all**: `gap:*` absence rows
     (`sheet-view.ts:899-906`, `value: null`, the prose IS the content),
     feature/background/species text rows, the equipment "not tracked
     individually" row (`sheet-view.ts:876-891`), "None recorded" rows.
     Blanket-hiding `.sheet-formula` in print would silently delete these. Prove
     you know which rows those are and name them.
   - **Rows whose number is correct but ASSUMPTION-LADEN** — D33's
     `category_not_stated` keeps the bonus with the assumption printed. Decide
     explicitly whether such a row is "a correct ordinary number" (compacts) or
     a disclosure (keeps its sentence), and defend the answer. This is the
     sharpest judgement call in the unit; do not leave it implicit.
   - **Warnings** — `sheet-view.ts:1211-1229`, `role="alert"`, full sentences,
     print font-size parity asserted at
     `tests/browser/character-sheet.spec.ts:503-513`. D159 keeps these.
   - **Free-text provenance markers** — `unverified-origin` on `free_text`
     cells (`sheet-view.ts:50-55`). A hostile string that is currently marked
     inline must not lose its marking by being moved to an appendix (D4).
3. **The classification problem, answered in the type system.** `SheetRow`
   (`sheet-view.ts:66-79`) has NO field distinguishing a correct ordinary number
   from a warning, an absence, or an assumption — only `id`, `label`, `value`,
   `detail`, `resource_marking`. A CSS selector guessing from `id` prefixes is
   the wrong answer and you should say why. Specify a closed, exhaustive
   classification carried in the projection, no `default:` arm, no `any`, such
   that adding a new row kind fails to compile rather than printing a silently
   wrong page.
4. **The screen-unchanged proof (D67).** `tests/unit/ui/sheet-view.test.ts`
   pins `detail` text row by row (e.g. lines 368-390, 537, 597-609) and pins the
   readable form against the JSON projection (line 270). Your design must not
   change `sheetSections`' output; compaction is a print-time projection over
   the same rows. State the invariant and name the test that would catch a
   violation. If your design DOES need a projection change, say so loudly and
   justify it against every one of those pins.
5. **The one stated pointer line (D89's stated-absence rule).** Exact wording
   proposed (a sentence, not a label), where it sits in the printed document, its
   `data-*` hook, whether it changes when the verbose appendix IS included (it
   must not claim the breakdowns are only on screen when they are two pages
   later), and the fact that it does not exist on screen. One line, stated once
   — not per row.
6. **The optional verbose appendix, and its place in the D149 order.** It joins
   the D141 flavor and D149 spell appendices as a THIRD member of that family:
   reuse FF-C's pure appendix-content function, its compositor seam, and its
   page-break classes (`.claude/handover/briefs/ff-c.md:95-113`: appendix pages
   get `break-before: page`, prose `break-inside: auto`, appendix panels are
   normal `.sheet-panel` and NEVER `.sheet-chrome`). Specify:
   - **The exact document order**, extending
     `docs/design/2026-08-01-sheet-spell-section.md:371-390`, which today reads
     sheet → flavor → spell → notice and has no slot for you. Argue the position
     (calculations belong nearest the numbers they explain, or last before the
     notice — pick one and defend it), and state that the D125 notice remains
     the last element with `break-before: page`, unchanged.
   - **What changes in SS-3's test.** SS-3's exit criterion proves
     "flavor→spell→notice ordering" and its SS-NOTICE-LAST control asserts that
     exact DOM order. A third appendix amends that ordering assertion while
     leaving the `lastElementChild` assertion untouched. Say which named test is
     amended, by whom, and in which merge order — and state the sequencing rule
     SS-3 itself uses: if the mechanism you depend on has not merged, the unit
     is BLOCKED rather than minting a second mechanism.
   - **The option control**: one checkbox or a grouped set alongside the flavor
     and spell options — decide, and say what the print options area looks like
     when all three exist. Labelled, keyboard-operable, focus-visible, no
     colour-only signalling (D108); `sheet-chrome` so it never prints; state
     survives the `beforeprint`/`afterprint`/media-change cycle of item 1;
     unticked by default.
   - **The D152 boundary**, restated at the point of design: calculations and
     source disclosures only, no feature rules text.
   - **What the appendix does when a row's reasoning is empty or identical to
     the number** — no empty pages, no "see above".
7. **Failure and honesty (D33 applied to paper).** What the printed page says
   when: a number is unknown (it says unknown on the face of the sheet, not only
   in a reveal — D67's second sentence); the appendix is requested but a row has
   no recorded reasoning; the sheet has warnings AND compacted rows (the warning
   must still be traceable to its number without the appendix); the user prints
   from a browser that fires no `beforeprint`. Nothing silently pretends.
8. **What a reader loses, stated plainly.** The honest cost of compaction — a
   printed sheet without the appendix no longer shows why a number is what it
   is. Say who that is acceptable for and why the owner chose it, so a later
   reader does not re-litigate it.
9. **Unit breakdown**, S/M/L, MINT-FREE, with dependency edges (FF-C merged,
   SS-1/SS-3 relationship), exit criteria per unit, and which units can run in
   parallel lanes. Point at `.claude/handover/lane-state.md` for floors instead
   of quoting counts.
10. **Test strategy.** Chromium `emulateMedia` print tests in
    `tests/browser/character-sheet.spec.ts` (the two existing print tests are at
    :423 "the sheet prints the derived numbers, and prints what it lacks" and
    :493 "print media keeps the sheet and warnings, adds paper fields, and ends
    with attribution"); pure-function unit tests for the classification and the
    appendix content, no DOM, in the shape
    `tests/unit/ui/sheet-view.test.ts` already uses. State which existing
    assertions are AMENDED versus which must remain byte-identical — a design
    that quietly weakens the :493 warning-parity assertion or the notice-last
    assertion is a defect, and saying so up front is how it gets caught.
11. **Negative controls**, one per load-bearing assertion, as a table:
    assertion | named mutation | the EXACT test name that must fail. At minimum:
    hide `.sheet-formula` on gap rows too; keep reasoning inline on paper;
    compact a warning; compact a `category_not_stated` assumption row; render the
    appendix with the option unticked; append the verbose appendix AFTER the D125
    notice; drop the stated pointer line; let an appendix-moved `free_text` cell
    lose its `unverified-origin` marker; change `sheetSections`' `detail` so the
    screen changes.
12. **Open questions for the owner**, phrased as decisions with options — at
    minimum the item-2 assumption-row call if you cannot settle it, the appendix
    position within the D149 order if the argument is genuinely balanced, and
    whether one combined "verbose appendix" option or three independent
    appendix options is the surface the owner wants.

Verify every decision number you cite against `.claude/decisions.md`. Do not
assert current behaviour you have not read; where you are unsure, SAY SO and
mark it as needing a spike before implementation.

## Process rules

Rule 7 binds YOU, now. Rules 1-6 are the bar every unit your document proposes
must be dispatched under — carry them into the unit table and the test strategy
verbatim, so a later brief can quote your rows without re-deriving them.

1. Spec TABLE for all Playwright spec files: Spec | Affected | Why — a bare
   list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on the PLAYWRIGHT_PORT given in the
   unit brief. Full vitest too. Paste real numbers.
4. Any test >1.5s alone gets a per-test timeout (20_000) with the measured
   alone-time in a comment. Never a config edit. Other lanes run suites
   concurrently; contention is the norm.
5. No `any`/`@ts-ignore`/`@ts-expect-error`/`.skip`/`.todo`, no config edits
   (vite/vitest/playwright/tsconfig/package.json), no weakened assertions, no
   deleting a test to pass (a stated strict-superset replacement is the only
   legal removal), never regenerate an expectation from our own output.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails.
7. The supervisor reviews and commits. **Do NOT commit.**

If the scope seems to require touching a forbidden area (another unit's files,
a frozen artifact, config) or seems infeasible as specified, STOP and report the
finding — that is a correct outcome.

When finished print exactly:
DONE docs/design/2026-08-02-compact-print-verbose-appendix.md
followed by a 10-line-max summary of the unit breakdown, plus any contradiction
you found between D159 and the merged spell-section/flavor designs.
