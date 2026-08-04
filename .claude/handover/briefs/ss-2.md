# DISPATCH SS-2 — compact sheet spell section (M, MINT-FREE, wt/pwa, PLAYWRIGHT_PORT=44532)

You are in /home/vagrant/PhpstormProjects/dnd-wt-pwa (branch wt/pwa).
`.claude/decisions.md` is law and wins over every other guidance file.

THE BINDING PLAN is `docs/design/2026-08-01-sheet-spell-section.md`. It is on
main (merged at e29cd35) and present in your tree — if it is absent you were
dispatched to the wrong worktree: STOP and report.

BOUND: section 2 in full (2.1 One typed projection, 2.2 marker rules, 2.3
attribution/ordering as a CONSUMER only, 2.4 statistics stated once, 2.5
section anatomy, 2.6 single-class rendering), the unit row **SS-2** in section
5, and the section-6.1 rows SS-MARKER, SS-SINGLE-HEADER, SS-STATS-ONCE,
SS-MIXED-STATS, SS-COMPACT-EXACT, SS-TEXT-SAFE. Section 1.2's P1, P2, P6, P11
and P13 are design-proved current-tree facts — build on them, do not re-derive.

NOT YOURS, by name:
- **SS-1** — the projection itself: builder module, DTO, `always_prepared`
  route field, recursive class attribution, marker reduction, placeholder
  level, full-text read, the comparator. You CONSUME it.
- **SS-3** — print appendix composition, page-break CSS, the `@page` move,
  missing-text disclosure, D125 ordering. You create NO appendix DOM.
- **SS-4** — retirement: deleting the print screen/renderer/CSS, the printable
  RPC and client types, the planner `/print` link, the build-report link, the
  stale PHP instruction, and every test rewrite in sections 4.2/4.3.
- **SS-5** — closeout, full-suite acceptance, mint-manifest proof.
- **FF-C** — the D141 flavor appendix, live in ANOTHER worktree
  (wt/attunement) and touching the SAME files. See FILE OWNERSHIP below.

EXIT — section 5 row SS-2, quoted verbatim (Contents and exit criteria):

> Extend `CharacterSheet`, `sheetSections`, DOM rendering, free-text handling,
> and sheet header Print button. Omit the single-class group header; show
> multiclass headers; state each distinct statistics basis once. Keep prose out
> of `sheetFacts`. Exit: pure unit and DOM tests prove exact anatomy, screen
> visibility, no hidden appendix, safe hostile names, and zero slot-math
> changes.

## PRECONDITION — SS-1 MUST MERGE FIRST. Check before writing a line.

Section 5's graph is `SS-1 query/projection -> SS-2 compact UI`. SS-2 depends
on SS-1 and on nothing else. Before you start, confirm in YOUR merge base:

- `src/queries/character-spell-section-builder.ts` exists;
- the section-2.1 DTO is exported — `SheetSpell`, `SheetSpellGroup`,
  `SheetSpellMarker`, `SheetSpellLevel`, `SheetSpellcastingStatistic`,
  `SheetSpellReference` — branded through the existing `SpellVersionId`,
  `SourceInstanceId`, `ClassDefinitionId`, `SpellLevel` ids.

If they are absent, SS-1 has not merged and you were dispatched early: **STOP
and report.** Do NOT declare your own spell DTO, your own marker union, your
own comparator, or a view-side grouping pass. A second grouping/ordering
implementation is precisely the defect section 3.1 exists to prevent ("no
renderer-side regrouping and no second comparator").

**SS-1/SS-2 boundary, because the doc splits it across two rows.** Section 2.1
says `CharacterSheetBuilder.build()` calls the new builder once and returns
`CharacterSheet.spells`; the section-5 row gives "Extend `CharacterSheet`" to
you. Resolve it by inspection, not by duplication: if SS-1 already added the
`spells` field and the single `build()` call, you add NEITHER — your half is
the view. If SS-1 landed only the standalone builder and DTO, you add the
readonly field and the ONE call site in `build()`, and nothing else in the
query layer. Either way there is exactly one call and exactly one field. Say in
your report which case you found.

## AMENDMENTS — rulings newer than the design doc

The doc binds D149 and cites D141/D122/D125/D91/D43/D45. Three later rulings
touch this unit's subject matter. None of them changes SS-2's scope, and the
reasons are load-bearing — do not "helpfully" apply them.

- **D152 (printed feature text stays NUMBERS ONLY) does NOT change SS-2.**
  D152 refuses extraction of class/subclass FEATURE text for v1. The spell
  section is D149-mandated sheet content whose text is already stored and
  already licensed (section 1.2 P7, and D43 makes bundled SRD spells CC-BY).
  D152 neither authorizes nor forbids anything in your compact rows — and it
  does not license dropping the spell section from the printout. Your compact
  rows carry no prose anyway (section 2.5), so the two rulings do not meet.
- **D159 (compact print + optional verbose appendix) does NOT change SS-2.**
  D159 compacts *per-row reasoning for correct ordinary numbers* on paper and
  moves *source disclosures* into an OPTIONAL appendix, recording a D67
  exception. The spell section is not a D67 disclosure: it is D149-mandated
  sheet content, and D149's appendix is not optional ("Printing the sheet
  always appends the spell appendix when at least one compact spell exists",
  section 3.1). So: no opt-in control, no variant selector, no print-time
  suppression of the spell section, and no D159 work of any kind in this unit.
  If a later D159 unit compacts print rendering, it will consume the section
  you build; it does not pre-empt it.
- **D158 (homebrew spells get a form, a fork button, and JSON import) does NOT
  change SS-2** — its units join the HA chain after that backend lands. Its one
  consequence for you is a reason to be strict about something the doc already
  requires: every spell name and source name is unverified free text and must
  render through `freeTextSpan()` / a `free_text: true` cell, never as trusted
  application-owned copy. Authored and forked spells will arrive there.

Rulings D147, D148, D150, D151, D153, D154, D155, D156, D157 and D160 do not
touch SS-2. Do not act on them here.

## MINT-FREE

You mint nothing: no migration, no share-wire version, no character-backup
document version, no character-state snapshot version, no schema change. This
unit is a read/projection concern (section 1.3: "All four are read/projection
concerns. The design is **MINT-FREE**"). Frozen with an EMPTY diff vs your
merge base: migrations 0000-0026, wire v1-v16, existing a7-v* assertions, every
`db/schema/**` file. If your work appears to need a column, a table or a
registry number, that is a dispatch error — STOP and report.

## FLOORS

`.claude/handover/lane-state.md` IN YOUR WORKTREE governs and is authoritative;
it may be higher than this by the time you run. As written it states: vitest
3,218 exit 0 (201 files), Playwright 92 exit 0 (22 specs), build 0. Never
lower. Two counts you should check rather than assume: 201 `*.test.ts` files is
what the tree actually holds, but only **20** `tests/browser/*.spec.ts` files
exist at e341edd against lane-state's "22 specs". Count the spec files
yourself, table every one you find, and REPORT the discrepancy — do not quietly
adopt the smaller number as if it were the floor.

## Scope

1. **`CharacterSheet.spells`.** Per the boundary rule above. If it falls to
   you: one `readonly` member beside `printed_features`
   (`src/queries/character-sheet-builder.ts:329-378`), populated by ONE call in
   `build()` (:665-688). No second query, no print-only read model — section
   1.2 P1 says the sheet is one projection rendered twice, and a second
   read model recreates the split D89 retired.
2. **The "Spells" section in `sheetSections`**
   (`src/ui/screens/sheet/sheet-view.ts:455`). Contents are exactly section
   2.5's list and nothing else:

   > - one group-level Save DC / spell-attack line as described above;
   > - each spell's name;
   > - “Cantrip” or “Level N” (or “Level unknown” for a placeholder);
   > - exactly one **Prepared** or **Known** marker.

   And, verbatim, what is excluded: "No casting time, range, components,
   description, slot counts, access-mode prose, long-rest candidate list, or
   Wizard-state explanation appears in the compact section."
3. **Group headers, section 2.6.** "**A single-class caster renders no class
   group header.**" The section title and one statistics line are followed
   directly by the level/name-ordered spells. At two or more contributing
   classes every class group gets a visible class heading. `other_source`
   groups ALWAYS keep their source heading — an unlabelled Magic Initiate or
   lineage spell loses real provenance. The condition is the number of
   contributing CLASS groups, not the character's class count.
4. **Statistics once, section 2.4.** Statistics live on the group, never on a
   spell row. "D149's “stated once” means once per distinct mechanically valid
   casting basis, not “pick one basis and suppress the others.”" A normal class
   group renders one line (`Save DC 15 · Spell attack +7`). An absent ability
   renders one group-level sentence — "It does not print em dashes that look
   like zero." Two genuinely distinct persisted bases render one
   "Spellcasting statistics" block with each source-labelled basis once; never
   pick one arbitrarily, never repeat a pair per spell.
5. **You consume order; you never produce it.** Section 2.3's array is already
   grouped and sorted (class groups by name with branded-id tie-break, then
   `other_source` groups by source name; within a group level ascending,
   unknown level last, then exact name, then `SpellVersionId`). "Both screen
   and print consume this already ordered array." No `.sort()`, no
   `.filter()`, no regrouping, no dedupe in the view. If the array looks wrong,
   that is an SS-1 defect to report, not a view-side correction.
6. **Free text.** Spell names and source/class display names render through
   `freeTextSpan()` (`src/ui/free-text.ts:22`) or a `free_text: true`
   `SheetCell`, per the existing `printed_features` precedent
   (`sheet-view.ts:725-745`) and the hostile-class-name precedent at
   `tests/unit/ui/sheet-view.test.ts:993-1011`. Application-owned words
   ("Prepared", "Known", "Level 3", "Save DC") are ordinary cells. No
   `innerHTML` anywhere.
7. **`sheetFacts` stays closed** (`sheet-view.ts:919`). Section 2.1: "The prose
   and free-text names remain out of `sheetFacts()`. D149 asks for a
   player-facing reference, not a new agent-facing catalog dump." Not the
   names, not the prose, not a count, not a presence flag. D4 says that script
   block emits data, never instructions, and it already promises "no free text
   is included" (`sheet-view.ts:1273-1275`) — keep that sentence true.
8. **Sheet header Print button.** A labelled `.sheet-chrome` **Print character
   sheet** button in `renderSheet`'s header (`sheet-view.ts:1193-1209`), wired
   to `window.print()` by the sheet SCREEN (`src/ui/screens/sheet/screen.ts`),
   alongside the existing listener wiring at :70-94. D108: a real `<button>`
   with a real label, keyboard-operable, not colour-dependent. It WRITES
   NOTHING — screen.ts:7-15 says this screen does not write, and a print
   preference in storage is the SS-BROWSER-NO-WRITE mutation. The print CSS
   already hides `.sheet-chrome` (`sheet/styles.css:200-202`); rely on that
   rule, do not add a second. Note this button is the ONLY row of section 4.1's
   retirement table that is yours — the planner link and the build-report link
   in that same table are SS-4's.
9. **No appendix, no print-media work.** Section 2.5: "Screen never contains
   hidden full spell text. Full text exists in the transient JS projection but
   appendix DOM is created only when print media is active" — and that
   compositor is SS-3's. You do not touch `setSheetPrintContent`
   (`sheet-view.ts:1286-1364`) except not to break it. Creating appendix DOM
   during `renderSheet` is the named SS-SCREEN-PRINT mutation.
10. **Zero slot math** (section 1.2 P13). You read `sheet.spells` only. You do
    not read `class_progressions.slots`, do not compute effective caster level,
    do not count boxes, do not touch `resourceRows`
    (`sheet-view.ts:420-446`) or resource absence behavior. The D91-R/D143a
    whole-section rule is untouched, and its output must be identical before
    and after your change for the same fixture.
11. **CSS**, if you need any: `src/ui/screens/sheet/styles.css` only. NO
    `@page` rule — D122's single rule still lives in the legacy print CSS and
    moving it is SS-3's job (section 3.4). A second `@page` is a defect.

## Row-model note (read before you design the DOM)

`SheetSection` is `{ caption, rows }` and `SheetRow` is
`{ id, label, value, detail, resource_marking? }` (`sheet-view.ts:60-83`);
`renderSheet` renders every section as one `<dl>` of `dt`/`dd` pairs
(:1232-1265). A grouped list with class headings does not obviously fit that
shape. Two rules bound the answer, and you choose within them:

- Do NOT smuggle a group heading into a row LABEL string or a row id and call
  it a heading — a heading that is really a label cannot be asserted as one and
  cannot be styled as one.
- Do NOT build a parallel renderer for spells. If the typed row/section model
  needs extending, extend it in the type system so a wrong program fails to
  compile (AGENTS.md), keep `sheetSections` the single readable projection, and
  keep every other section's DOM byte-identical.

Whatever shape you pick, SS-3 will consume the SAME `SheetSpellGroup[]` for the
appendix, so nothing that only the view knows may be load-bearing.

## Tests and negative controls

Unit and DOM only (section 5's exit): `tests/unit/ui/sheet-view.test.ts`,
extending its `sheet()` factory at :57. Hostile fixtures of the existing kind
(:485-506, :993-1011) — a spell name and a source name each containing
`</span><img src=x onerror=...>`. Expectations are hand-authored from the
ruling and the fixture; never regenerate one from the projection under test.

Named negative controls, from section 6.1. Each mutation must kill the exact
named test:

| Assertion | Mutation | Test that must fail |
|---|---|---|
| **SS-MARKER** | `map-all-buckets-to-known`: remove the prepared/always-prepared arms | **“spell markers distinguish prepared, always prepared, and known access”** |
| **SS-SINGLE-HEADER** | `always-render-class-heading`: force the one-class heading | **“single-class spells omit only the redundant class group header”** |
| **SS-STATS-ONCE** | `render-stats-per-spell`: move statistics into the spell loop | **“normal spellcasting statistics render once at group level”** (count assertions) |
| **SS-MIXED-STATS** | `take-first-statistic`: collapse the group to its first route's statistic | **“mixed spellcasting bases remain distinct and render once each”** (second-basis assertion) |
| **SS-COMPACT-EXACT** | `leak-description-into-sheet`: append reference prose to compact rows | **“compact spell rows contain only D149 fields”** |
| **SS-TEXT-SAFE** | `append-spell-html`: replace text-node/free-text rendering with `innerHTML` | **“hostile spell text is visible inert and absent from sheet facts”** |
| **SS-NO-SLOT-MATH** (6.2, view half) | `derive-slot-count-from-selected-spells`: alter resources from selected spell levels | **“spell section does not alter D91 resource maxima”** |
| Print button writes nothing | wire the button to any storage/command call | your named button test — state its exact name |

SS-APPENDIX-ORDER and SS-MISSING-TEXT (6.1) and every 6.3 browser row belong
to SS-3/SS-4. Do not pre-build them.

## FILE OWNERSHIP — FF-C is live in another worktree

FF-C (wt/attunement) edits `src/queries/character-sheet-builder.ts`,
`src/ui/screens/sheet/sheet-view.ts`, `src/ui/screens/sheet/screen.ts`,
`src/ui/screens/sheet/styles.css` and `tests/unit/ui/sheet-view.test.ts` — the
same five files as you, and it also adds a `.sheet-chrome` header control. Do
not attempt to coordinate: write the smallest diff that satisfies your scope,
keep your additions contiguous rather than interleaved into FF-C's regions, and
NAME this collision in your report so the supervisor merges deliberately. Do
not import, anticipate, or reserve names for FF-C's appendix mechanism — SS-3
consumes it, you do not.

## Process rules (all mandatory)

1. Spec TABLE for every Playwright spec file in your merge base: Spec |
   Affected | Why — a bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44532`. Full
   vitest too. Paste real numbers.
4. Any test >1.5s alone gets a per-test timeout (20_000) with the measured
   alone-time in a comment. Never a config edit. Other lanes run suites
   concurrently; contention is the norm. Run ONE full vitest at a time.
5. No `any`/`@ts-ignore`/`@ts-expect-error`/`.skip`/`.todo`, no config edits
   (vite/vitest/playwright/tsconfig/package.json), no weakened assertions, no
   deleting a test to pass (a stated strict-superset replacement is the only
   legal removal), never regenerate an expectation from our own output.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails.
7. If the scope seems to require a forbidden area (frozen artifact, config,
   another unit's files) or seems infeasible as specified, STOP and report —
   that is a correct outcome.
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted; the spec table; files
created/modified; negative-control candidates with exact test names; which
SS-1/SS-2 boundary case you found; the spec-count discrepancy; the FF-C
collision.
