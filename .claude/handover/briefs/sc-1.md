# DISPATCH SC-1 — pinned SRD subclass extract + SOURCE registration (S, MINT-FREE, PLAYWRIGHT_PORT=44540)

You are in /home/vagrant/PhpstormProjects/dnd-wt-resp (branch wt/resp), fast-forwarded to main by the
supervisor. `.claude/decisions.md` is law and wins over every other guidance
file, including the binding plan below.

THE BINDING PLAN is `docs/design/2026-08-01-srd-subclass-seed.md`. BOUND:
section 1 (outcome and ruling chain), section 2 in full (2.1 current source
state, 2.2 the new extract, 2.3 the verified count), the unit row **SC-1** in
section 8, and the section-9.1 rows for
`tests/unit/rules/srd-extract-provenance.test.ts` and the new
`tests/unit/rules/srd-subclasses.test.ts`. Section 7 (persistence/MINT ruling)
binds you as a prohibition. Sections 3, 4, 5, 6 and the rest of 9 describe
SC-2..SC-6 — read them for context, build none of them.

## NOT YOURS

**SC-2** (the typed one-per-class manifest/parser, the exact 58 ordered feature
headings, the five parsed spell-table inventories, the four unconditional rule
sets, the typed deferred cases). **SC-3** (any seed row, any definition, any
`subclass_features` insert, the repair guard, the split inventories in §5.2).
**SC-4** (`SheetPrintedFeature.source`, the `partial_subclass_catalog`
retirement, agent-reference rows, level-up projection). **SC-5** (identity /
CI-2a trigger assertions / CI-3s handoff). **SC-6** (regression sweep, stale
comments in `src/builder/level-up.ts`, `src/commands/level-up-class.ts`,
`src/rules/sheet-srd.ts`, `tests/fixtures/homebrew-subclass.ts`).

Concretely: you write **no** SQL, **no** seeder, **no** row, **no** grant rule,
**no** UI change. You touch `docs/srd/source/`, `docs/srd/SOURCE.md`, one new
`src/rules/` reader module, and two test files. Nothing else.

## AMENDMENTS — read this section, it is not boilerplate

**A D-ruling POSTDATES the design doc and wins over it.** Verified by commit
time, not by memory: the SUBCL-SEED design is `083037b` (2026-08-02 09:01:23
-0400); D169-D172 are `582ecdc` (2026-08-02 09:55:40 -0400). `git merge-base
--is-ancestor 083037b 582ecdc` is true. So:

- **D169 amends the design's OQ-1 and its additive-fourteen shape.** D169
  verbatim: *"Replace eldrich knight and trickster rogue with a made up third
  caster monk sub."* The ruling records: "final bundled set = the twelve SRD
  subclasses PLUS ONE owner-original Monk subclass carrying a dense
  third-caster progression... EK and AT retire in
  the same unit that lands the replacement — retirement is a strict content
  swap, not a deletion-first. The invented subclass is original content (no
  licensing issue, D59). Its NAME, features, and spell list are DRAFTED by us
  and PRESENTED TO THE OWNER for approval before seeding."

  **CONSEQUENCE FOR YOU, stated three ways because each is a different way to
  get it wrong:**

  1. **SC-1 is unaffected in scope.** You extract the twelve SRD sections. The
     design's §1 "fourteen bundled subclass definitions" and §10's OQ-1
     ("retain them, yielding 14") are now WRONG as a statement of the final
     bundle — but SC-1 seeds nothing, so no line of your work depends on the
     final count. Do not "fix" the count anywhere; that is SC-3/SC-5's problem
     under a re-planned design.
  2. **You touch no EK or AT row, comment, test or
     seed literal.** Not to retire them, not to renumber them, not to update a
     stale count comment about them. Their retirement is a strict content swap
     owned by the unit that lands the owner-approved replacement, and a
     deletion-first is exactly what D169 forbids. If you find yourself editing
     `src/rules/class-progression-lookup.ts:727-765`, you are out of scope —
     STOP and report (process rule 7).
  3. **The invented Monk subclass NEVER enters `docs/srd/source/`.** Every file
     in that directory carries the CC-BY notice claiming its body is SRD 5.2.1
     material (`docs/srd/SOURCE.md:184-189`). Putting owner-original content
     under that notice would make the notice a false claim — a D59/D43
     licensing defect, not a tidiness issue. The extract contains **Warrior of
     the Open Hand and nothing else for Monk.** Its "exactly one section per
     base class" property is a property of the SRD document and stays true
     forever precisely because invented content lives elsewhere; do not
     later loosen that assertion to "accommodate" the Monk unit.

- **D152 binds you and is the reason this extract has an unusual shape.** D152
  verbatim (`.claude/decisions.md:201-206`): "No class or subclass feature text
  is extracted for v1; the sheet's stated-gap sentence remains the honest
  answer." Feature **headings** are catalog facts; feature **paragraphs** are
  not, and must not appear in your file. See "The hazard the design does not
  fully price" below — this is the hard part of the unit.

- **D151 is the mandate and it is a closed twelve, not "the ten empty ones."**
  D151 verbatim (`.claude/decisions.md:208-214`): "The SRD 5.2.1 subclass for
  every class is extracted and seeded before the D106 gate, as a normal
  pinned-extract unit (F6/F27 discipline)." Champion and Thief are in your
  twelve even though Fighter and Rogue already have a different bundled option.

- **The design's `.claude/decisions.md` line citations are STALE.** It cites
  D151 at `:92-98` and D152 at `:85-90`. Those lines now hold D164 and D163 —
  decisions.md gained D161-D172 above them. The correct anchors today are
  **D152 at `:201-206`** and **D151 at `:208-214`**. Cite headings, not line
  numbers, in anything you write. The rulings themselves are unchanged; only
  the offsets moved.

- **D162, D159, D170, D171, D172 do not touch this unit.** They govern print
  appendices, the update prompt, a bug-report button and the AI panel. If you
  find yourself reasoning that a print ruling constrains an SRD extract, you
  have misread it.

## MINT-FREE

Section 7 of the plan: "No migration, snapshot-version increment, generated
schema edit or frozen pre-Drizzle fixture edit is permitted in SC-1..SC-6."
You mint nothing: no migration, no wire version, no backup document version, no
snapshot version, no column, no table, no RPC method, no enum member. Frozen
with an **EMPTY diff** vs your merge base: `drizzle/` in full, `src/db/schema.sql`,
`src/domain/contracts/generated/*`, wire schemas, existing `a7-v*` snapshot
assertions, `tests/unit/schema.test.ts`, `tests/unit/db/schema-signature.test.ts`.
Section 9.2 says it plainly: "Any edit here would be evidence of an accidental
mint." If your work appears to need a registry number, a column or a schema
change, that is a dispatch error — STOP and report (process rule 7).

## FLOORS

`.claude/handover/lane-state.md` **IN YOUR WORKTREE** governs and is
authoritative. At the time this brief was written its newest recorded state was:

> RESTART POINT 2026-08-02 ... MAIN a00455a+ (FF-A merged; post-merge vitest
> 201/3,232; PW floor 93). 0027/v17 now FROZEN.

So: **vitest 3,232 exit 0 (201 files), Playwright 93 exit 0 (20 spec FILES),
build 0.** Frozen: migrations 0000-0027, wire v1-v17, existing `a7-v*`
assertions — vs your merge base.

Two corrections you must apply rather than trust this paragraph:

- Main has moved past `a00455a` (it is `aa06973` at writing, P1-GH merged) and
  **204 `*.test.ts` files exist on disk**, so the real vitest floor is higher
  than 201/3,232. Read lane-state in your worktree and meet what it says.
- The spec-file count is **20**, not 22. lane-state records a supervisor
  correction on exactly this point; an earlier line saying 22 was wrong and was
  caught by codex's floor check. Your spec table has **20 rows**.

## Scope

The unit row, quoted verbatim from section 8 (Implementation units):

> | **SC-1 — pinned subclass extract** | S | none | **NO** | Add names/levels/spell tables only, required notice, SOURCE row and digest; provenance and exact-12 parser controls pass. |

The mechanics, quoted verbatim from section 2.2 (New extract):

> SC-1 creates `docs/srd/source/subclasses.txt` from the committed full text. It
> contains, in the SRD's class order:
>
> - each `Class Subclass: Name` heading;
> - every `Level N: Feature Name` heading belonging to that subclass; and
> - the Life Domain, Circle of the Land, Oath of Devotion, Draconic Sorcery and
>   Fiend Patron spell tables.
>
> Those are catalog/tabular facts, not the feature paragraphs D152 excludes. The
> extract carries the required notice because every source extract must carry it
> (`docs/srd/SOURCE.md:184-189`). `docs/srd/SOURCE.md` gains one row recording the
> printed pages (30, 35, 40, 46, 49, 52, 56-57, 61, 64, 69, 76 and 82), the exact
> scope, and the new file's SHA-256

and from section 2.3 (Verified count):

> The pinned SRD source contains exactly **twelve** subclass sections—one for each
> base class. ... The extraction test must assert the closed twelve-class set, not
> merely `length >= 12`; otherwise a duplicated section and a missing section can
> cancel out.

Concretely:

1. **Derive from the COMMITTED full text, not a download.** `docs/srd/SOURCE.md:169-182`
   records `docs/srd/full/srd-5.2.1.txt` as the entire `pdftotext -layout`
   output, SHA-256 `e69e053879d96e8e5568a6807212875ab1dfa1e4059cd14444c0a33f5fba95f2`,
   2,146,883 bytes, and says "a new slice is now checked against a COMMITTED
   source, not a download." Do not fetch the PDF. Verify that hash yourself
   before slicing — one `sha256sum`, pasted in your report.

2. **Twelve sections, in the SRD's class order.** Verified by the supervisor
   with `grep -n "Subclass:" docs/srd/full/srd-5.2.1.txt`: exactly twelve body
   occurrences, at lines 1872 (Barbarian / Path of the Berserker), 2190 (Bard /
   College of Lore), 2470 (Cleric: Life Domain), 2789 (Druid / Circle of the
   Land), 2968 (Fighter: Champion), 3130 (Monk: Warrior of the Open Hand), 3364
   (Paladin: Oath of Devotion), 3649 (Ranger: Hunter), 3827 (Rogue: Thief),
   4167 (Sorcerer / Draconic Sorcery), 4586 (Warlock: Fiend Patron), 4944
   (Wizard: Evoker). The remaining `Subclass:` hits (lines 40-62, 101-125) are
   the table of contents and are NOT sections. **Re-derive these yourself** —
   they are the supervisor's numbers, and the design doc's own section ranges
   (e.g. it cites Warlock at 4565-4607 and Wizard at 4902-4959) are spread
   ranges that start before the heading. Record the ACTUAL line ranges you
   sliced in the extract's header, on the `backgrounds.txt` precedent: "The
   body below is `srd.txt` lines 4947-5012 verbatim".

3. **The required notice, verbatim, at the top of the file.** Not paraphrased,
   not shortened, no additional attribution to the licensor
   (`docs/srd/ATTRIBUTION.md:7-22`). The exact five-line wording already exists
   as a constant at `src/rules/srd-attribution.ts:6-11` and as the header of
   every file in `docs/srd/source/` — copy it from one of those, do not retype
   it.

4. **One SOURCE.md row, in the existing table format.** `` `source/subclasses.txt` ``
   | scope description | pages `30, 35, 40, 46, 49, 52, 56-57, 61, 64, 69, 76, 82`
   | the file's SHA-256 in backticks. The row must parse against the regex the
   provenance test uses (`tests/unit/rules/srd-extract-provenance.test.ts:41-42`):
   four pipe-delimited cells, file name in backticks, 64 hex digits in
   backticks. **Verify the printed page numbers against the page footers inside
   your sliced ranges** ("40   System Reference Document 5.2.1" is what a footer
   looks like) rather than trusting the design's list.

5. **A minimal extract reader, on the existing precedent, and no more.** Put it
   at `src/rules/subclasses-srd.ts` following
   `src/rules/feats-srd.ts:15`, `src/rules/armor-srd.ts:28` and
   `src/rules/ability-score-generation-srd.ts:21`: a `?raw` import of the
   extract plus a parser. **SC-1's reader does exactly three things:**
   (a) splits the extract into its twelve labelled sections and exposes the
   class + subclass name of each; (b) validates the grammar — every non-blank
   body line is either a `Class Subclass:` heading (possibly wrapped, see
   below), a `Level N:` heading with `1 <= N <= 20`, or a line belonging to one
   of the five spell tables; (c) rejects a missing class, a duplicate class, an
   unknown class, a malformed level, and any prose line. It throws on a bad
   extract before anything downstream can read it — §2.2: "the parser must fail
   before seed writes."

   **What SC-1's reader must NOT do:** no typed per-class manifest, no ordered
   feature-name tuples, no parsed spell-table inventory, no grant-rule shaping,
   no exported type that SC-2 would have to replace. §8 gives all of that to
   SC-2. Leave the seam open; do not stub it, and do not invent a shape SC-2
   must then unpick.

6. **Read-only, catalog-free.** No database, no seeder, no bootstrap change, no
   row. This unit ends at "the bytes are pinned and a parser can prove their
   grammar."

## EXIT (the same row, quoted verbatim)

> Add names/levels/spell tables only, required notice, SOURCE row and digest;
> provenance and exact-12 parser controls pass.

## THE HAZARD THE DESIGN DOES NOT FULLY PRICE — read before slicing

The supervisor verified all four of these against the tree. Each one can turn a
plausible-looking extract into a wrong one.

### (a) The full text is two-column INTERLEAVED, and the columns swap sides

`docs/srd/SOURCE.md:176-182`: "Two-column pages interleave their columns on each
line in that file, so the extracts in `source/` remain the readable,
column-sliced references." This is not a general warning here — it hits your
exact lines. Real lines from the committed file:

```
3130:       Patient Defense. When you expend a Focus Point       Monk Subclass: Warrior of the
3364:     Spell                           School          Special   Paladin Subclass: Oath of Devotion
4167:     Telekinesis                Transmutation     C       Sorcerer Subclass: Draconic
4944:     Wizard Subclass: Evoker                                 with that spell on the turn you cast it.
```

The subclass content is in the RIGHT column at 3130/3364/4167 and in the LEFT
column at 4944, with unrelated base-class prose and spell-list table rows in the
other column of the same physical line. A line-range slice carries that foreign
text into your file, where it is (i) not the subclass, (ii) feature/table prose
D152 excludes, and (iii) fatal to your own grammar validator.

`docs/srd/SOURCE.md:32-38` states the rule: slice by **CHARACTER, not byte**
(the SRD uses curly quotes and `cut -c` on bytes produces invalid UTF-8), and
stop at the **real** column boundary. Both mistakes were made and caught in this
repo before. `background-descriptions.txt` was deleted because a hyphenated
`Calligrapher-` bled across the gutter (`docs/srd/SOURCE.md:135-152`).

### (b) Five of the twelve headings WRAP across two lines

The design writes the heading as if it were one line (``each `Class Subclass:
Name` heading``). It is not. Barbarian (1872-1873), Bard (2190-2191), Druid
(2789-2790), Monk (3130-3131) and Sorcerer (4167-4168) print the class on one
line and the subclass name on the next. Your reader must join them; an extract
or a parser that only sees `Barbarian Subclass:` has lost the name "Path of the
Berserker" and will still count twelve sections. Pin the twelve **names**, not
just twelve section starts.

### (c) This extract is SELECTIVE, and every existing extract is CONTIGUOUS

Every current file in `docs/srd/source/` is a verbatim contiguous slice.
`class-core-traits.txt` even says so in its own header:

> LAYOUT: the SRD is set in two columns and 'pdftotext -layout' preserves
> both, so unrelated text from the neighbouring column appears to the right
> of some lines. Nothing has been edited out; read the left column.

**You cannot write that sentence.** D152 forbids the feature paragraphs, and in
these sections the paragraphs sit in the SAME column as the headings you want —
so "nothing has been edited out" would be false. Yours is the first extract in
the repository where material is deliberately omitted.

That is allowed (the design orders it), but it changes what provenance means,
so it costs you an explicit obligation the design does not spell out:

- The extract header must state, in plain words, **that lines were omitted, why
  (D152), and exactly which line classes were kept** — subclass headings,
  `Level N:` headings, and the five named spell tables.
- It must record a **re-derivation rule** precise enough that a reader holding
  `docs/srd/full/srd-5.2.1.txt` can reproduce your file byte-for-byte: the line
  ranges, the character-column boundary used per range, and the keep-predicate.
  `docs/srd/SOURCE.md:24-31` promises re-derivability; a selective slice keeps
  that promise only if the selection is written down.
- **Kept lines stay verbatim.** Omission is the only edit. No re-wrapping, no
  de-hyphenation, no normalising whitespace inside a kept line, no
  reconstructing a wrapped heading into one line **in the file** (join it in the
  parser, not in the bytes) unless you state that edit in the header the way
  `class-starting-equipment.txt` states "with PDF line wrapping and
  discretionary hyphenation removed".

If you conclude the selective shape cannot be made honestly re-derivable, that
is a finding — STOP and report it (process rule 7). Do not paper over it.

### (d) `?raw` and the Playwright rule

`src/rules/subclasses-srd.ts` will carry a Vite `?raw` import, and process rule
2 forbids one being reachable from a Playwright spec's node-side EXECUTABLE
import graph. This is a live constraint here, documented in the tree at
`tests/browser/character-sheet.spec.ts:81-84`:

> The SRD seeder reads `docs/srd/source/*.txt` through Vite's `?raw` import,
> which Playwright's own transform cannot load — and transcribing the two facts
> this page depends on makes them an oracle rather than a re-read of the
> parser's output.

So: no Playwright spec imports your module node-side. Your consumers are unit
tests (which run under Vitest/Vite and can). Say in your spec table which of the
20 specs, if any, gained an import — the answer should be none.

## Tests

Both of these are Vitest. **You add no Playwright test.** You still run the full
Playwright suite (process rule 3) because the floor must be met.

1. **`tests/unit/rules/srd-extract-provenance.test.ts`** — amend, per §9.1:
   "Name `subclasses.txt` as required coverage in addition to automatic hash/set
   equality." The existing named-coverage test is `covers the two extracts the
   origins catalog is parsed from` (`:96-105`), which pins
   `species-descriptions.txt` and `backgrounds.txt` by name. Add a sibling test
   for your file. **Do not edit or rename the existing four tests** — the
   `>= 9` floor, the per-file digest loop, the both-directions set equality and
   the two-extract coverage all stay exactly as they are; yours joins them.
   Strengthening is legal, weakening is not.

2. **New `tests/unit/rules/srd-subclasses.test.ts`** — the closed-twelve oracle.
   Model it on `tests/unit/rules/srd-feats-extract.test.ts`, whose comment
   states the rule you must follow: *"Hand-enumerated from the Feat Descriptions
   section on printed pages 87-88 of SRD 5.2.1. These literals are the oracle;
   they are not generated from the extract."* Your twelve class→subclass-name
   literals are hand-read from the printed source. **Never regenerate them from
   your own parser's output** (process rule 5).

   SC-1's assertions: the closed twelve `(class, subclass name)` set; the notice
   verbatim; the five spell tables present by heading; the grammar rejections
   (prose line, duplicate class, unknown class, level 0 / level 21, malformed
   heading). SC-2 extends this same file with the 58 ordered feature headings,
   the parsed table inventories and the 40 grants.

**STATED GAP you must name in your report rather than close:** §8 assigns
"exact 58 headings" to **SC-2**, so SC-1 pins the twelve sections but does NOT
pin the total feature-heading count. That leaves a real window — a dropped
`Level N:` line inside a correctly-bounded section passes every SC-1 assertion.
Do not close it by importing SC-2's manifest, and do not leave it unsaid:
report "58-heading count OWED TO SC-2" explicitly. This is the same hazard §2.3
names one level up ("a duplicated section and a missing section can cancel
out") and it deserves to be visible at handoff.

## Negative controls — one per load-bearing assertion, with the failing test

Exact test names are required. Where the test is new, the name below is the
name to use.

| Assertion | Mutation | Test that must fail |
|---|---|---|
| The extract's bytes are pinned | `flip-one-extracted-byte`: change one character in `subclasses.txt` without touching its SOURCE row | **"matches the committed bytes of every listed extract"** |
| An extract with no row has no provenance | `commit-extract-without-source-row`: add the file, omit the table row | **"leaves no extract on disk without a row in the table"** |
| A row with no file is a claim about absent bytes | `row-without-file`: add the row, delete the file | **"leaves no extract on disk without a row in the table"** |
| The subclass extract is covered BY NAME, not incidentally | `drop-subclasses-row`: remove only the `subclasses.txt` row while every other row stays valid | **"covers the subclass catalog extract by name"** (new) |
| Exactly twelve sections, closed set | `remove-champion`: delete the Fighter section — and, separately, `duplicate-thief`: repeat the Rogue section so the count still reads twelve | **"the subclass extract carries exactly the twelve SRD subclass sections"** (new), on both mutations |
| Wrapped headings are joined, names are pinned | `truncate-wrapped-heading`: keep only `Barbarian Subclass:` and drop `Path of the Berserker` | **"the subclass extract carries exactly the twelve SRD subclass sections"** (new) |
| D152 — no feature prose in the extract | `inject-feature-paragraph`: reinstate one sentence of Frenzy's body text | **"the subclass extract carries headings and spell tables only"** (new) |
| No neighbouring-column bleed | `reinstate-column-bleed`: restore the `Patient Defense. When you expend a Focus Point` fragment onto the Monk heading line | **"the subclass extract carries headings and spell tables only"** (new) |
| Feature levels are 1-20 | `level-zero-heading`: rewrite one heading as `Level 0:` — and separately `Level 21:` | **"the subclass extract rejects a feature level outside 1-20"** (new) |
| Unknown / duplicate class rejected | `unknown-class-heading`: rewrite one heading's class to `Artificer` | **"the subclass extract rejects an unknown or duplicated class"** (new) |
| The five spell tables survive the slice | `drop-life-domain-table`: remove the Life Domain Spells table rows, leaving its heading | **"the subclass extract carries the five printed subclass spell tables"** (new) |
| The CC-BY notice is verbatim | `shorten-notice`: drop the licence URL line from the file header | **"the subclass extract carries the required notice verbatim"** (new) |

## Process rules (all mandatory)

1. Spec TABLE for **ALL 20** Playwright spec files: Spec | Affected | Why — a
   bare list is a re-dispatch. (Expect 20 unaffected rows; state that, per file.)
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine). See hazard (d).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44540`. Full
   vitest too. Paste real numbers — not "green", the counts, and the exit codes.
4. Other lanes run suites concurrently; contention is the norm. Any test >1.5s
   alone gets a per-test timeout (20_000) with the MEASURED alone-time in a
   comment. **Never a config edit.**
5. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `.skip`, no `.todo`, no
   config edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (a stated strict-superset replacement
   is the only legal removal), and never regenerate an expectation from our own
   output — expectations are hand-reviewed values. The twelve subclass names in
   particular are hand-read from the printed source, never from your parser.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails.
7. If the unit's scope seems to require touching a forbidden area (frozen
   artifact, config, another unit's files, EK/AT rows) or seems infeasible as
   specified, STOP and report the finding — that is a correct outcome.
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted (vitest, Playwright, build, exit
codes); the 20-row spec table; files created/modified; the `sha256sum` of
`docs/srd/full/srd-5.2.1.txt` you verified and of the new extract; the exact
line ranges and column boundaries you sliced, per section; the re-derivation
rule you recorded; negative-control candidates with exact test names; and the
named gap owed to SC-2 (the 58-heading count).
