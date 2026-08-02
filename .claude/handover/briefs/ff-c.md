# DISPATCH FF-C — D104 flavor sheet projection, truncated print, opt-in appendix (M, MINT-FREE, TRACK M worktree wt/attunement, PLAYWRIGHT_PORT=44521)

THE BINDING PLAN is docs/design/2026-07-31-d104-flavor-fields.md section 6.2
(sheet and print) and unit row FF-C in section 9, with the named negative
controls in section 8 rows D104-BACKSTORY-DOM-SINK, D104-NO-FLAVOR-FACTS and
D104-PRINT-PRESENCE. Implement exactly FF-C. FF-A (persistence, merged before
you) and FF-B (`update_character_flavor` + planner panel, running in a
DIFFERENT worktree, concurrent with you) are NOT yours: no command, no
payload validator, no planner file, no schema/limits edit. FF-D (closeout) is
not yours either.

EXIT, quoted from the doc's unit row FF-C: "CharacterSheet flavor object,
optional visible section, hostile-text marker, pre-wrap styling,
structured-facts exclusion, print presence behavior. Exit: DOM-sink and print
negative controls pass." D141 adds to that exit: truncation is visibly marked
on the main sheet and the opt-in appendix carries the untruncated text.

AMENDMENTS (rulings newer than the doc — these WIN over the section they
override):
- **D141 overrides section 6.2's "the section naturally prints when present"
  and section 1's flat "printed when present".** The main sheet prints
  `alignment` and `appearance` IN FULL; it TRUNCATES `backstory` and `notes`
  with a visible continuation marker, so the play aid stays short. A SEPARATE
  OPT-IN prints the full written text as appendix page(s) AFTER the sheet.
  "Truncation on the main sheet must always be visibly marked, never silent."
- **D122 is already satisfied — do NOT add a second `@page`.** `@page { size:
  letter; margin: 0.5in }` lives in `src/ui/screens/print/styles.css:253`, and
  `src/ui/app.ts:33` globs screen modules with `eager: true`, so every screen's
  CSS (including that `@page`) is in the one startup bundle and applies to the
  sheet route's printed document. Your appendix needs page BREAKS, not a page
  size. If that `@page` block is absent from your merge base, STOP and report —
  it means TRACK S has not merged and D122 is unimplemented.
- D142 (notes cap 20,000) is FF-A-FIX2's, not yours: read the cap from
  `CHARACTER_TEXT_LIMITS`, never restate a number. Your fixtures should carry
  long notes precisely because that cap is now generous.
- D125 (last-page SRD notice) is NOT yours. Do not add attribution to the
  appendix; do not assume it exists.

MINT-FREE. You mint NOTHING: no migration, no wire version, no backup document
version, no character-state snapshot version. FF-A owns all four and has
merged. If your work appears to need a new registry number or a new column,
you have misread the unit — STOP and report. Confirm before you start that
`src/domain/character-limits.ts` exports `alignment/appearance/backstory` and
`CharacterRow` (src/domain/models.ts) carries the three new `string | null`
fields; if it does not, FF-A is not in your merge base and you were dispatched
wrong — STOP.

FLOORS (never lower; `.claude/handover/lane-state.md` in your worktree is
authoritative and will be HIGHER than this after FF-A merges): vitest ≥3,162
in ≥194 files exit 0, Playwright ≥88 in 20 specs exit 0, build 0. Frozen vs
your merge base — migrations, wire modules, backup/snapshot versions, existing
a7-v* assertions — all show an EMPTY diff.

## Scope

1. **Builder.** Add `readonly flavor: CharacterFlavor` to `CharacterSheet`
   (`src/queries/character-sheet-builder.ts:327-374`, beside
   `printed_features`), exactly the shape in doc 6.2 — four `string | null`
   members, nested object, not four top-level strings. Extend
   `SheetCharacterRow` (:386-398), its codec `sheetCharacter` (:400) and the
   `#character` SELECT (:973-985) with the four root columns through
   `sqlNullableString`. THE BUILDER NEVER TRUNCATES: it projects the stored
   bytes losslessly, because the appendix needs the full value and a limit
   change must not require a re-query.
2. **Readable projection.** In `sheetSections`
   (`src/ui/screens/sheet/sheet-view.ts:269`) append a "Character details"
   section only when at least one of the four trimmed values is non-blank, and
   emit a row only when THAT row's own value is non-blank after trimming —
   trimming decides presence, the displayed value is the original string
   byte-for-byte (doc 6.2). Row ids `flavor:alignment` … `flavor:notes`; fixed
   application-owned labels; the visible suffix "— unverified free text" as an
   ordinary (non-`free_text`) cell; the value as a single `free_text: true`
   cell so `cells()` routes it through `freeTextSpan()`
   (`src/ui/free-text.ts:22-28`) and nothing else. Model it on the
   `printed_features` section (:537-569), which is the precedent for prose the
   sheet prints and the facts exclude.
3. **On screen the rows carry the FULL text.** D141 governs the PRINTOUT. A
   person reading their own sheet must not be shown a stump with no way to read
   the rest, and the sheet's D4 invariant forbids concealed screen DOM
   (`sheet-view.ts:20-42` and the comment at :1056-1062 explaining why the
   existing print fields are inserted and removed rather than hidden).
4. **Print truncation, on the setSheetPrintFields precedent** (:1045-1109).
   Extend that mechanism — one exported mutator, called from the same
   `beforeprint` / `matchMedia('print')` / `afterprint` wiring already in
   `src/ui/screens/sheet/screen.ts:76-94` — so that entering print media
   replaces the `backstory` and `notes` row values with a truncated form plus a
   visible application-owned continuation marker, and leaving print media
   restores the full text. `alignment` and `appearance` are never touched.
   Truncate on CODE POINTS (`[...value]`), matching doc 4.1's counting rule;
   the marker states that text was cut, how much of it is printed, and that the
   appendix option prints the rest. Export the limit as one named constant in
   `sheet-view.ts` (400 code points) — the tests import it; no magic number is
   written twice. The truncated text still renders through `freeTextSpan()`;
   the marker is OUTSIDE it, because we wrote the marker.
5. **The opt-in appendix.** Render a labelled `sheet-chrome` checkbox in the
   sheet header (`renderSheet`, :950-975) — real `<input type="checkbox">` with
   a real `<label>`, D108 — present ONLY when `backstory` or `notes` is
   present, i.e. only when there is something to opt into. It writes NOTHING:
   no command, no storage, no query param; the sheet is read-only
   (`screen.ts:7-15`). When it is ticked AND print media is active, the same
   mutator appends appendix page(s) after the last sheet panel carrying the
   FULL `backstory`/`notes` text through `freeTextSpan()`; unticking or leaving
   print media removes those nodes. Supply the appendix CONTENT as a pure
   function of `CharacterSheet` in `sheet-view.ts`, so the unit suite pins the
   untruncated text with no DOM, exactly as `sheetSections`/`sheetFacts` are
   pinned today.
6. **CSS** (`src/ui/screens/sheet/styles.css`): `white-space: pre-wrap` on a
   NEW flavor-value class — do not restyle `.free-text` globally, it is used
   across the whole sheet. In the print block (:105+): the flavor section is a
   normal `.sheet-panel`, NEVER `.sheet-chrome`; appendix pages get
   `break-before: page` and their prose `break-inside: auto`.
7. **Facts stay closed.** `sheetFacts` (:731) gains nothing — not the values,
   not a presence flag, not a truncation count.

## Tests and negative controls

Unit (`tests/unit/ui/sheet-view.test.ts`, extending its `sheet()` factory at
:52), integration (`tests/integration/queries/character-sheet.test.ts`) and
browser (`tests/browser/character-sheet.spec.ts`, whose `sheetImage()` at :73
is your fixture). NO COMMAND EXISTS YET: seed flavor with direct SQL against
`characters` in the fixture image — do not wait on FF-B and do not write one.
Use hostile strings of the existing kind (:26-29): a backstory containing
`</script><img src=x onerror=...>`, astral-plane characters straddling the
truncation boundary, and a note long enough to truncate. Per doc section 8's
closing rule, the final browser assertion RELOADS the character before printing
so persistence, not in-memory state, is proved.

Name a mutation per load-bearing assertion with the exact test name it must
fail. These are required by name; add any others you need:

- **D104-BACKSTORY-DOM-SINK** — `innerHTML` in place of
  `freeTextSpan`/`textContent`.
- **D104-NO-FLAVOR-FACTS** — add `backstory` to `sheetFacts`.
- **D104-PRINT-PRESENCE** — drop the per-row presence guard, or mark the
  section `.sheet-chrome`.
- **D141-TRUNCATION-MARKED** — print the truncated value with the marker
  removed (silent truncation is the exact thing D141 forbids).
- **D141-TRUNCATE-CODEPOINTS** — `value.slice(n)` instead of the code-point
  slice; must fail on the astral fixture.
- **D141-SHORT-FIELDS-FULL** — truncate `alignment`/`appearance` too.
- **D141-APPENDIX-OPT-IN** — render the appendix with the checkbox unticked.
- **D141-APPENDIX-FULL-TEXT** — emit the truncated value into the appendix.

FILE OWNERSHIP (FF-B is live in another worktree): yours are
`character-sheet-builder.ts`, `sheet/sheet-view.ts`, `sheet/screen.ts`,
`sheet/styles.css` and the three test files above. Touching
`src/domain/character-limits.ts`, `src/domain/command-contracts.ts`, any
command/executor file, or any planner file is a re-dispatch.
