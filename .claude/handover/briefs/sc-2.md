# DISPATCH SC-2 — typed SRD subclass manifest/parser (M, MINT-FREE, PLAYWRIGHT_PORT=44541)

You are in <worktree assigned at dispatch>, fast-forwarded to main by the
supervisor. `.claude/decisions.md` is law and wins over every other guidance
file, including the binding plan below.

THE BINDING PLAN is `docs/design/2026-08-01-srd-subclass-seed.md`. BOUND:
section 2.2 (the new extract and what the parser rejects), section 2.3 (the
closed twelve, and why `>= 12` is not enough), section 4 in full (the
per-subclass mechanical inventory table and its closed totals), the unit row
**SC-2** in section 8, and the section-9.1 row for the new
`tests/unit/rules/srd-subclasses.test.ts`. Sections 1, 3, 5, 6, 7 are context
you build against — you implement none of them.

You write **no seed row, no schema change, no UI, no query**. SC-2 is a typed
manifest, a parser over the pinned extract, and the unit oracle that proves
them. Nothing in this unit touches a database.

## PRECONDITION — check this FIRST, before writing a line

**HARD PREREQUISITE: SC-1 must be MERGED TO MAIN.** SC-2's dependency cell in
section 8 is `SC-1`, and the plan's own dependency rationale is:

> The dependency order is intentional: no seed literal is reviewed before its
> extract/parser can fail, and no sheet expectation is changed before the
> catalog rows exist.

Verified by the supervisor at main `aa06973` when this brief was written:
`ls docs/srd/source/subclasses.txt` → **No such file or directory**. The
directory holds 31 registered `.txt` extracts and none of them is the subclass
slice. SC-1 had not merged.

Before anything else, prove in YOUR merge base that all of the following exist:

1. `docs/srd/source/subclasses.txt` on disk.
2. Its row in `docs/srd/SOURCE.md`'s per-extract table, carrying the printed
   pages and a SHA-256 that matches the committed bytes.
3. The required attribution notice verbatim at the top of the extract file
   (`docs/srd/SOURCE.md:184-189`: "Every file in `source/` carries the required
   notice verbatim at the top of the file").
4. A green `tests/unit/rules/srd-extract-provenance.test.ts` on your merge base
   — it asserts set equality in BOTH directions between the table and the
   directory (`:76-88`), so an unregistered extract already fails it.

**If the extract or its SOURCE row is absent: STOP and report, naming which.**
Do NOT create the extract yourself, do NOT slice `docs/srd/full/srd-5.2.1.txt`
into a private copy, and do NOT parse the full text directly as a workaround.
A blocked report is the CORRECT outcome (process rule 7). SC-1 owns the bytes
and the digest; you own the grammar that reads them.

## NOT YOURS

**SC-1** — the extract, the `SOURCE.md` row, the digest, and the provenance
test's named-coverage line. **SC-3** — every seed write: the twelve
definitions, the 58 feature rows, the 40 fixed-spell rules, the split
inventories in `bundledClassContentKeys()`, the repair guard, and every
bootstrap/collision test. **SC-4** — `SheetPrintedFeature.source`,
`subclass_feature` projection, the `partial_subclass_catalog` gap retirement,
the agent-reference rows, level-up availability. **SC-5** — identity/inventory
closure and the CI-3s handoff. **SC-6** — the regression sweep and the stale
comments in §9's last paragraph.

Concretely: you do not edit `src/rules/class-progression-lookup.ts`,
`src/db/bootstrap.ts`, `src/queries/character-sheet-builder.ts`,
`src/ui/**`, `src/rules/class-level-features-srd.ts`, or any test named in
section 9.1 other than your own new one. You add rows to no table.

**The D169 invented Monk subclass is NOT yours either** — see AMENDMENTS.

## AMENDMENTS — read this section, it is not boilerplate

**One ruling postdates the design doc, and it hits this unit's shape.**
Verified by commit order: the design doc is `083037b` (2026-08-02 09:01:23) and
D169-D172 landed at `582ecdc` (2026-08-02 09:55:40). Decisions win over
guidance files, so D169 binds you where it disagrees with the plan.

- **D169 amends OQ-1 and the plan's "additive fourteen" shape.** D169
  verbatim: "final bundled set = the twelve SRD subclasses PLUS ONE
  owner-original Monk subclass carrying a dense third-caster progression...
  EK and AT retire in the same unit that lands the
  replacement — retirement is a strict content swap, not a deletion-first."
  Its name, features and spell list "are DRAFTED by us and PRESENTED TO THE
  OWNER for approval before seeding."

  **CONSEQUENCES FOR SC-2, all five of them:**

  1. **Your manifest and parser cover the pinned SRD twelve, and only those.**
     The invented Monk subclass is original content, is not in SRD 5.2.1, and
     must never appear in `subclasses.txt`, in the SRD manifest, or in this
     unit's parser output. Putting owner-original content behind an SRD
     provenance digest would be a false provenance claim (F27: "a citation is
     not a checksum").
  2. **You draft nothing invented.** Not a name, not a feature list, not a
     spell list, not a placeholder key. That draft is owner-approval-gated and
     belongs to the replacement unit.
  3. **You retire nothing.** EK and AT stay exactly
     as they are; SC-2 writes no seed, so there is nothing to swap. Do not
     remove their keys from any list, do not mark them deprecated, do not add
     a "retiring" comment that a later reader will mistake for a decision.
  4. **Do not bake `14` — or `12 SRD + 2 legacy` — into a type, a constant or
     an assertion.** The plan's section 4 closes at "12 definitions, 58 feature
     name rows and 40 unconditional fixed-spell rules"; those three numbers are
     yours and are exact. The *bundled catalog total* is not: it is 14 today,
     it becomes 13 when the Monk replacement lands and EK/AT retire, and SC-2
     must not be the file that has to change for that. Your closed set is
     "**the twelve SRD subclass sections in the pinned extract, one per
     class**" — a statement about the extract, never about the catalog.
  5. Related trap, stated because the arithmetic invites it: D169's invented
     subclass is a **second Monk subclass**. It does not replace SRD Warrior of
     the Open Hand. "One per class" is a property of the SRD extract, not a
     uniqueness constraint on the class→subclass relation, and nothing you
     write may assume a class has at most one bundled subclass.

- **D152 is not a collision — do not stop on it.** "No class or subclass
  feature text is extracted for v1" governs feature PARAGRAPHS. Subclass
  headings, `Level N: Feature Name` headings and the printed spell tables are
  catalog/tabular facts the plan explicitly extracts (section 1, section 2.2).
  If you find yourself reasoning that D152 forbids the manifest, you have
  misread it. What D152 DOES bind on you: your parser must **reject** prose it
  is not expecting, so "names and tables only" is an input invariant rather
  than a review convention (section 2.2).

- **D162 and D165 do not reach this unit.** D162 (all three print appendices
  optional, remembered per character) is a print-surface ruling — SC-2 has no
  print surface. D165 gives walkthrough script 1 a subclass choice, which
  *consumes* this chain downstream; it adds nothing to SC-2. Neither is a
  reason to widen scope.

- **D153 does not put WebKit in your suite.** iOS Safari is a support target
  pending a supervisor-run WebKit spike; the playwright-config project that
  spike needs is owner-ordered supervisor scope. Your browser proofs are
  Chromium (D109). Adding a webkit project is a config edit and a re-dispatch.

- **D59/F6/F27 remain in force and are the reason SC-1 exists.** You consume a
  digest-pinned extract; you do not re-derive it, and you do not "fix" a line
  in it. If the extract is wrong, that is an SC-1 finding — report it, do not
  patch around it in the parser.

## MINT-FREE

You mint nothing: no migration, no share-wire version, no character-backup
document version, no character-state snapshot version, no column, no table, no
RPC method, no enum member in a persisted vocabulary. Frozen with an EMPTY diff
vs your merge base: migrations 0000-0027, wire v1-v17, existing `a7-v*`
snapshot assertions, `tests/unit/schema.test.ts`, and
`tests/unit/db/schema-signature.test.ts`. Section 9.2 is explicit about the
last two: "Any edit here would be evidence of an accidental mint." If your work
appears to need a registry number, a column, or a new RPC, that is a dispatch
error — STOP and report (process rule 6).

## FLOORS

`.claude/handover/lane-state.md` IN YOUR WORKTREE governs and is authoritative.
At writing its restart point read: vitest **3,232 exit 0 (201 files)**,
Playwright **93 exit 0 (20 spec FILES)**, build 0 — and it is already stale in
your favour: SS-1, W-D and P1-GH merged to main after that line was written, so
the real floor on your merge base is HIGHER. Meet or exceed whatever the file
says when you start. Note the correction recorded at `901584c`: the spec-FILE
count is **20**, not 22; an earlier lane-state line said 22 and was wrong.

## Scope

The unit row, quoted verbatim from section 8 (Implementation units) — its
deliverable and exit are the one cell:

> **SC-2 — typed manifest/parser** | M | SC-1 | **NO** | Closed one-per-class
> manifest; exact 58 headings, five spell-table inventories, four unconditional
> rule sets; conditional/choice cases are typed absences, not empty fallbacks.

1. **One new parser module, on the established SRD-parser shape.** The
   codebase's precedent is exact and you follow it rather than inventing a
   variant: a `src/rules/*-srd.ts` module that imports its extract with Vite's
   `?raw` and exposes a parse function whose source text is a DEFAULTED
   PARAMETER, so tests can feed it hostile input —
   `src/rules/feats-srd.ts:15` + `:328` (`parseSrdFeatDefinitions(extract =
   featsExtract)`) and `src/rules/class-level-features-srd.ts:9` + `:201`
   (`parseSrdClassLevelFeatures(source = classLevelTables)`). Match that shape.
   Errors go through a named error class, as
   `SrdClassResourcesError`/`SrdClassLevelFeaturesError` do — not bare
   `Error`, not a boolean, not a silent empty array.
2. **The `?raw` containment rule is load-bearing, not style.** Quoted from
   `src/builder/contracts.ts:24-27`:

   > From the EXTRACT-FREE module, never `origins-srd` (which imports the SRD
   > text via Vite's `?raw`): the seam is loaded by node-side test processes
   > through the command layer, and a `?raw` in its closure breaks their
   > transpilers — Playwright's whole suite failed collection on exactly this.

   So: your `?raw`-importing module must stay OUT of every Playwright spec's
   node-side executable import graph. If SC-3/SC-5 or any node-side seam needs
   the twelve content keys, those keys live in an **extract-free** module on
   `src/rules/origin-rules-edition.ts`'s precedent, and the parser imports the
   keys — never the reverse. Process rule 2 is the gate; this is how you pass
   it by construction instead of by luck.
3. **Closed one-per-class, asserted as a set.** Section 2.3: "The extraction
   test must assert the closed twelve-class set, not merely `length >= 12`;
   otherwise a duplicated section and a missing section can cancel out." The
   parser therefore rejects a missing class, a duplicate class and an unknown
   class name, and the returned value is keyed so that "which twelve" is
   checkable, not just "how many". `parseSrdClassLevelFeatures` throwing on
   `parsed.length !== 12` (`:205-208`) is the precedent for failing IN the
   parser; the set equality is additionally asserted in the test.
4. **Exactly 58 feature headings, in SRD order, with their levels.** Section 4
   fixes the per-class counts and they are the review oracle: Barbarian 4,
   Bard 4, Cleric 5, Druid 5, Fighter 6, Monk 4, Paladin 5, Ranger 5, Rogue 5,
   Sorcerer 5, Warlock 5, Wizard 5 = **58**. Each heading carries its printed
   `class_level` from the `Level N:` prefix. The parser rejects a level outside
   1-20, a duplicate feature name within a subclass, and a duplicate sort
   position (section 2.2). Order is the SRD's printed order across the whole
   subclass (section 5.1) — not alphabetical, not level-then-name.
5. **Five spell-table inventories, all parsed.** Life Domain, Circle of the
   Land, Oath of Devotion, Draconic Sorcery, Fiend Patron (section 2.2). A
   malformed spell row is a parse failure, not a skipped row. Circle of the
   Land's **24 entries (4 lands × 6 spells)** are parsed and present in the
   manifest as evidence even though they produce no active grant — section 4:
   "Record all 24 table entries in the parser manifest but defer grants until
   that choice has a typed capture path."
6. **Four unconditional rule sets = 40 fixed-spell rules.** Cleric/Life Domain
   10 (levels 3/5/7/9), Paladin/Oath of Devotion 10 (3/5/9/13/17),
   Sorcerer/Draconic Sorcery 10 (3/5/7/9), Warlock/Fiend Patron 10 (3/5/7/9).
   Section 5.1 fixes their shape: definition scope, `active_from_class_level`,
   `bucket='prepared'`, `always_prepared=true`, `with_slots=true` — the
   existing fixed-spell vocabulary (`src/domain/enums.ts:102-113`,
   `src/rules/origin-definitions-srd.ts:186-239`). SC-2 produces these as typed
   manifest values; **SC-3 writes them**, and SC-3 owns the hard failure on an
   unresolvable spell content key (section 5.1). If your manifest carries
   content keys as well as printed names, they are transcribed and reviewed by
   eye — never fuzzy-matched, never generated from a name by a slug function
   whose output nothing checks.
7. **Conditional/choice cases are TYPED ABSENCES, not empty fallbacks.** This
   is the sentence the unit row ends on and it is the whole point of the
   manifest being typed. Four cases, each named in section 4 with its reason:
   - **Circle of the Land** — 24 spells parsed, no grant emitted: no typed
     capture path exists for the renewable land choice, and dormant
     `active_if_config` rules "would silently show no spells".
   - **Bard / Magical Discoveries** — a union of three lists; "the current list
     rule resolves exactly one list" (`src/grants/grant-rule-planner.ts:75-105`),
     so no lossy rule is seeded.
   - **Fighter / Additional Fighting Style** — an open choice against a rule
     that requires a fixed `style_key` (`src/grants/grant-rule.ts:333-335`); no
     fabricated fixed choice.
   - **Wizard / Evocation Savant** — the spellbook-acquisition shape exists but
     its timing "is stated only in excluded feature prose; do not seed a
     remembered approximation."

   Each must be representable in the type system as *this specific deferral
   with its reason*, distinguishable from "this subclass grants nothing"
   (Barbarian, Monk, Rogue, Ranger legitimately grant nothing) and from "not
   yet parsed". A wrong program must fail to compile rather than produce a
   plausible empty array. `null`-as-absence and `[]`-as-none are the two
   values this project has repeatedly proven indistinguishable in practice —
   do not encode a deferral as either.
8. **No prose, and the parser proves it.** Section 2.2: the parser rejects
   "any non-heading prose outside the required notice". The pinned full text is
   two-column `pdftotext -layout` output — a Champion heading and unrelated
   Monk core-traits text share a physical line at
   `docs/srd/full/srd-5.2.1.txt:2968-3005`. That is exactly the leakage this
   rejection rule exists to catch if SC-1's slicing ever regresses.
9. **The attribution notice is expected input, not noise.** The extract carries
   the CC-BY notice verbatim at its top (`docs/srd/SOURCE.md:184-189`). Your
   grammar admits it explicitly and admits nothing else that is not a heading
   or a table row. Do not strip it, do not make the parser tolerant of
   "anything before the first heading".
10. **Pure and read-only.** No database handle, no clock, no I/O beyond the
    `?raw` import, no mutation of anything. Freeze what you return
    (`Object.freeze`, `readonly`) on the precedent already in
    `grant-rule-planner.ts`.

EXIT (the same row — this unit's deliverable cell IS its exit criterion):

> Closed one-per-class manifest; exact 58 headings, five spell-table
> inventories, four unconditional rule sets; conditional/choice cases are
> typed absences, not empty fallbacks.

Concretely, you are done when `tests/unit/rules/srd-subclasses.test.ts` proves
all four clauses against the committed extract, the negative controls below
kill the named tests, and the full suites are green at or above the floors.

## Tests

The new file, named by section 9.1:

> New `tests/unit/rules/srd-subclasses.test.ts` | Assert exact 12 classes, 58
> ordered headings, five spell tables, 40 unconditional grants and the typed
> deferred cases. | Yes: new independent oracle over committed extract. |
> Remove Champion; duplicate Thief; change one feature level; inject one prose
> line; change one spell. Each named test must fail.

**"Independent oracle" means the expectations are hand-enumerated from the
printed SRD and compared against the parser's output.** The precedent to copy
is `tests/unit/rules/srd-ability-score-generation-extract.test.ts`, whose
expectation blocks say "Hand-enumerated from ... These pairs are the oracle;
they are not generated from the extract." Never regenerate an expectation from
your own parser's output — that is process rule 5 and it is the single easiest
way to make this unit worthless.

Coverage the file must carry, each as its own named test:

- the closed twelve-class set (set equality, both directions — not a count);
- the 58 headings with names, levels and printed order, per class;
- each of the five spell tables, entry by entry, including Circle of the
  Land's 24;
- the 40 unconditional rules with their activation levels;
- each of the four typed deferrals, asserted as *that* deferral — a test that
  only checks "no grants emitted" cannot tell a deferral from a bug;
- the parser's rejections: missing class, duplicate class, unknown class, level
  out of 1-20, duplicate feature name, duplicate sort position, malformed spell
  row, stray prose. Feed these as strings to the defaulted parameter; do not
  mutate the committed extract on disk to test a rejection.

`tests/unit/rules/srd-extract-provenance.test.ts` is **SC-1's** row in section
9.1 — you do not edit it. If it is red on your merge base, that is a blocked
report, not something you fix.

You add **no** browser test and **no** integration test. SC-2 has no DB and no
UI surface. You still run both full suites (process rule 3).

## Negative controls — one per load-bearing assertion, with the failing test

Name each mutation and the exact test name it kills. The plan names five of
these; the rest follow from the scope items above.

| Assertion | Mutation | Test that must fail |
|---|---|---|
| Closed twelve, one per class | `remove-champion`: delete the Fighter section from the parser's input | your closed-set test (name it, e.g. **"parses exactly the twelve SRD subclass sections, one per class"**) |
| A duplicate cannot mask a deletion | `duplicate-thief`: repeat the Rogue section so the count stays 12 | the same closed-set test — this is precisely why section 2.3 forbids `length >= 12` |
| Headings carry their printed level | `shift-feature-level`: change one `Level N:` by one | your 58-heading test |
| Prose never enters the manifest | `inject-prose-line`: add one paragraph line inside a subclass section | your parser-rejection test for stray prose |
| Spell tables are exact | `swap-one-spell`: change one entry in the Life Domain table | your Life Domain table test |
| Deferrals are typed, not empty | `deferral-as-empty-array`: return `[]` for Circle of the Land instead of the typed deferral | your Circle-of-the-Land deferral test (an `[]`-tolerant test is the defect) |
| Circle evidence is retained | `drop-circle-entries`: parse the Circle table but discard its 24 entries | your Circle inventory test |
| Grant shape is unconditional | `gate-life-domain-on-config`: add an `active_if_config` to a Life Domain rule | your 40-unconditional-rules test |
| Ordering is the SRD's | `sort-features-alphabetically` | your 58-heading ordered test |
| The extract is the only input | `parse-full-srd-text`: point the parser at `docs/srd/full/srd-5.2.1.txt` | your parser-rejection tests (two-column leakage must not parse clean) |

## Process rules (all mandatory)

1. Spec TABLE for ALL Playwright spec files (**20** at writing): Spec |
   Affected | Why — a bare list is a re-dispatch. Expect every row to read
   "not affected"; say so per file, with the reason.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine). Scope item 2 is how
   you satisfy this; prove it in your report by naming what imports your new
   module.
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44541`. Full
   vitest too. Paste real numbers — not "green", the counts.
4. Other lanes run suites concurrently; contention is the norm. **At most ONE
   full suite of ANY kind machine-wide** (lane-state, 2026-08-02: a full vitest
   beside a full Playwright produced a false 3-red). Any test >1.5s alone gets
   a per-test timeout (20_000) with the MEASURED alone-time in a comment.
   **Never a config edit.**
5. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `.skip`, no `.todo`, no
   config edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (a stated strict-superset replacement
   is the only legal removal), never regenerate an expectation from our own
   output — expectations are hand-reviewed values.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails.
7. If the unit's scope seems to require touching a forbidden area (frozen
   artifact, config, another unit's files, the extract itself) or seems
   infeasible as specified, STOP and report the finding — that is a correct
   outcome.
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted (vitest and Playwright counts, build);
the 20-row spec table; files created/modified; the negative-control candidates
with exact test names; the `?raw` containment proof (what imports the new
module); and any place where the pinned extract disagreed with section 4's
inventory — that is an SC-1 finding and belongs in the record, not in a patch.
