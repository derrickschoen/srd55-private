# DISPATCH SC-3 — SRD subclass catalog seed and repair (M, MINT-FREE, PLAYWRIGHT_PORT=44542)

You are in <worktree assigned at dispatch>, fast-forwarded to main by the
supervisor. `.claude/decisions.md` is law and wins over every other guidance
file, including the binding plan below.

THE BINDING PLAN is `docs/design/2026-08-01-srd-subclass-seed.md`. BOUND:
section 1 (outcome and ruling chain), section 3 (existing row-shape
precedent), section 5.1 (ownership and ordering), section 5.2 (repair guard),
section 7 (persistence and MINT ruling), the unit row **SC-3** in section 8,
the section-9.1 rows for `class-progression.test.ts`, `bootstrap.test.ts`,
`bundled-content.spec.ts`, `subclass-provenance.test.ts`,
`homebrew-catalog-fixture.test.ts` and `catalog-import.spec.ts`, and **all of
section 9.2**. Sections 2 and 4 are SC-1/SC-2 territory: consume their extract
and manifest, do not re-derive a single spell, heading or level from the SRD
text yourself.

## PRECONDITION — check this FIRST, before writing a line

**HARD PREREQUISITE: SC-2 must be MERGED TO MAIN** (the section-8 dependency
column reads `SC-2` for this unit, and SC-2 depends on SC-1). Verified by the
supervisor at main `a0a5382` when this brief was written — at that commit
**neither exists**:

- `ls docs/srd/source/` returns **31** `.txt` extracts and **no**
  `subclasses.txt`;
- `grep -rln "subclasses.txt\|srdSubclass\|SrdSubclass" src tests
  docs/srd/SOURCE.md` returns **nothing**;
- `ls src/rules/ | grep -i subclass` returns **nothing**.

Before anything else, prove in YOUR merge base that all of the following exist:

1. `docs/srd/source/subclasses.txt`, registered with its SHA-256 in
   `docs/srd/SOURCE.md` and passing
   `tests/unit/rules/srd-extract-provenance.test.ts` (SC-1).
2. SC-2's typed manifest/parser module: the closed one-per-class manifest with
   **twelve** subclass entries, **58** ordered feature headings, the five spell
   tables, and the **four** unconditional fixed-rule sets — plus its typed
   deferred cases (Circle of the Land's 24 entries, Magical Discoveries,
   Additional Fighting Style, Evocation Savant) expressed as typed absences,
   not empty arrays.
3. `tests/unit/rules/srd-subclasses.test.ts` (SC-2's independent oracle) green
   in your merge base.

**If any of the three is absent: STOP and report, naming which one.** Do NOT
write your own manifest, do NOT hand-transcribe feature names or spell keys out
of `docs/srd/full/srd-5.2.1.txt`, and do NOT seed from a remembered list. A
blocked report is the CORRECT outcome (process rule 6). If SC-2 landed under
different symbol names, consume those names after a local seam audit and say so
in your report.

## NOT YOURS

**SC-1** (the extract, the SOURCE row, the digest). **SC-2** (the manifest,
the parser, its grammar rejections, `srd-subclasses.test.ts`). **SC-4** — the
entire level-up/sheet projection arm of section 5.3: `SheetPrintedFeature.source
= 'subclass_feature'`, the sheet-view labelling, deleting
`partial_subclass_catalog` from the gap union
(`src/queries/character-sheet-builder.ts:305-306`, `:502`), revising
`no_class_feature_text`, the agent-reference `modelled` row, and widening the
known-bundled set in `src/rules/class-level-features-srd.ts`. **SC-5**
(identity/inventory closure: the CI-2a trigger-state assertions and the CI-3s
handoff record of 12 inherit + 2 override). **SC-6** (full regression sweep and
the remaining stale-comment cleanups in section 9.1's closing paragraph:
`src/builder/level-up.ts:53-59`, `src/commands/level-up-class.ts:224-228`,
`tests/fixtures/homebrew-subclass.ts:3-33`,
`tests/fixtures/level-up-mutations.mjs:134-152`).

Also NOT yours, from other queues: the **D169 replacement unit** (see
AMENDMENTS), the **D165** walkthrough scripts, and the **D158/D167** homebrew
authoring forms.

Concretely: you touch no sheet builder, no sheet view, no level-up command, no
wizard, no agent reference, no gap union. You add rows and a guard.

## AMENDMENTS — read this section, it is not boilerplate

**One ruling postdates the design and it lands on this unit.** Verified by
commit order, not by date headings: the design is `083037b`
(2026-08-02 09:01:23 -0400) and D169-D172 are `582ecdc`
(2026-08-02 09:55:40 -0400); `git merge-base --is-ancestor 083037b 582ecdc`
confirms the design is the ancestor. Decisions win over guidance files, so
D169 binds you and the plan's section 10 does not.

### D169 — EK/AT retire, replaced by an invented third-caster Monk subclass

Owner's words, verbatim: **"Replace eldrich knight and trickster rogue with a
made up third caster monk sub."** The ruling body, verbatim in the parts that
govern you:

> Amends the SUBCL-SEED design's OQ-1 and its additive-14 shape: final bundled
> set = the twelve SRD subclasses PLUS ONE owner-original Monk subclass
> carrying a dense third-caster progression... Eldritch Knight and Arcane
> Trickster retire in the same unit that lands the replacement — retirement is
> a strict content swap, not a deletion-first... Its NAME, features, and spell
> list are DRAFTED by us and PRESENTED TO THE OWNER for approval before
> seeding.

**CONSEQUENCES FOR SC-3, all six of them:**

1. **Section 10's OQ-1 is CLOSED.** Do not re-ask it, do not carry it forward
   as open, and do not act on it. The design's own answer ("retain them,
   yielding 14") is superseded as the *permanent* shape.
2. **You still build exactly the additive-14 shape**, because the replacement
   is unapproved and unwritten: twelve SRD definitions added, Eldritch Knight
   and Arcane Trickster retained with all **40** progression rows. Your
   observable behavior is identical to the unamended design. D169 changes what
   you may *harden*, not what you seed.
3. **You retire nothing and invent nothing.** No EK/AT deletion, no
   deprecation flag, no Monk subclass, no name, no feature list, no spell
   list. Retirement plus replacement is one future unit gated on owner
   approval of invented content. Deletion-first is independently illegal here:
   a selected character holds a composite `NO ACTION` FK to a subclass
   definition (section 10, locally proved assumption 3).
4. **Structure so the swap is a content edit in ONE place.** The legacy
   override inventory is a single named constant carrying a comment that names
   D169 and says a future unit swaps its members. No production code may branch
   on "exactly two legacy keys", "exactly fourteen subclass definitions", or a
   hardcoded pair of content keys duplicated across modules. Where a guard or
   a reconciler needs a rule, state it **relatively**: every key in the
   override inventory has 20 progression rows; every key in the SRD inventory
   has zero. Never "the subclass table contains exactly two dense schedules"
   written as a literal in five places.
5. **Test literals stay literal.** 12, 58, 40 and 14 are hand-reviewed
   exact-state expectations that sections 2.3 and 5.2 demand, and process rule
   5 forbids deriving them from our own output — including from the production
   constants. Keep them written out in the tests. The swap unit updating those
   numbers later is a normal exact-state change; what must not happen is a
   *mechanism* that a thirteenth key or a retired key breaks.
6. **D80 still covers characters left on a retired key** (unmade-subclass
   warning + sheet gap). Nothing you write may assume every character's
   subclass key is bundled forever.

### Rulings that are already in the plan, restated so you do not re-derive them

- **D151** is the reason this unit exists and is why Champion and Thief are in
  scope even though Fighter and Rogue already have a bundled option. Ten-more
  is the undercount the plan closes (section 10).
- **D152** binds and the plan already encodes it: you seed feature **names**,
  `description=''`, and **no** `subclass_feature_effects` row. If you find
  yourself wanting to store a sentence of rules prose in `description` to make
  a projection nicer, you have misread it — and the projection is SC-4's
  anyway.
- **D59** is satisfied by consuming SC-1's pinned CC-BY extract. You copy no
  bytes from anywhere else.

### No other ruling in D147-D172 touches this unit

Checked one by one. D153 (WebKit) does not put a webkit project in your suite —
your browser proofs are Chromium (D109), and a playwright-config change is a
config edit and a re-dispatch. D159/D162 (print appendices) and D149 (spell
section) are the SPELL-SEC queue. D157/D163/D166 (party), D158/D167 (homebrew
forms), D161/D168/D172 (publish, mirror, org), D170/D171 (update prompt, bug
report) are all elsewhere. D165's "script 1 gains ... a subclass choice" is a
walkthrough unit that consumes SC-4, not you.

## MINT-FREE

You mint nothing: no migration, no share-wire version, no character-backup
document version, no character-state snapshot version, no column, no table, no
index, no trigger, no RPC method. Section 7 is explicit that catalog rows are
snapshot/backup/share **false**, so adding rows cannot change an `a7-v*`
snapshot shape, the candidate-audit table set, a backup wire shape or the
schema signature. Frozen with an EMPTY diff vs your merge base: migrations
0000-0027, wire v1-v17 (both verified present and frozen at `a0a5382`:
`drizzle/0027_character_flavor.sql`, `src/sharing/wire-schemas/v17.ts`),
existing `a7-v*` snapshot assertions, `tests/unit/schema.test.ts`,
`tests/unit/db/schema-signature.test.ts`. Section 9.2 says it plainly: **"Any
edit here would be evidence of an accidental mint."** If your work appears to
need a registry number, a column or a new RPC, that is a dispatch error — STOP
and report (process rule 6).

## FLOORS

`.claude/handover/lane-state.md` IN YOUR WORKTREE governs and is authoritative.
At writing it read: vitest **3,232** exit 0 (**201** files), Playwright **93**
exit 0 (**20 spec FILES** — the file recorded a supervisor correction that an
earlier "22 specs" line was wrong), build 0. Main has since merged W-D
(`9a00a8d`) and P1-GH (`a0a5382`), so your worktree's lane-state will read
higher than those numbers. Meet or exceed whatever it says when you start.

Concurrency rule, tightened 2026-08-02 and recorded in lane-state: **at most
ONE full suite of ANY kind machine-wide**; single-FILE vitest runs are the only
thing allowed beside a running suite. A full vitest beside a full Playwright
produced three false reds on W-D.

## Scope

The unit row, quoted verbatim from the section-8 table:

> **SC-3 — catalog seed and repair** | M | SC-2 | **NO** | Add twelve
> definitions, 58 empty-description feature rows and 40 fixed rules; retain 40
> legacy progression rows; exact repair catches tuple/grant corruption without
> touching imported rows.

1. **Consume the manifest; author no content.** Every definition, feature
   name, feature level, sort position and spell key comes from SC-2's typed
   manifest. Your module contains no SRD literal of its own. If the manifest
   cannot express something, that is SC-2's defect — report it, do not patch
   around it with a literal.
2. **A new module, not the legacy generator** (section 5.1): "Create one SRD
   subclass manifest/seeder module, separate from the legacy third-caster
   progression generator." Do not extend `seedClassProgressions`.
3. **Seed order is fixed**: "The application calls it immediately after
   `ensureBundledClassContent`, because every definition has a required parent
   class FK; fixed spell keys resolve lazily, so the spell catalog may still
   seed later." The call site is `applicationSeed` in `src/db/bootstrap.ts:52`
   — verified: `ensureBundledClassContent(db)` is its first statement, and
   `ensureBundledSpellContent(db)` is near the end. Your call goes immediately
   after the first, not at the end.
4. **Ownership and collision policy, section 5.1**: "The module owns only these
   twelve content keys and their descendants. It resolves the parent by bundled
   class content key, yields when the `(parent, name, edition)` slot belongs to
   another key, and never deletes rows belonging to a different key." The
   precedent is `upsertThirdCaster`
   (`src/rules/class-progression-lookup.ts:511-539`), verified at the line: it
   resolves `class_definitions` by `content_key`, reads the holder of
   `(class_definition_id, name, rules_edition)`, and returns `null` when
   `holder !== null && holder !== contentKey`. Copy that shape. Parent
   resolution by NAME is the defect that rule exists to kill.
5. **Caster fields, section 5.1.** For caster-parent subclasses
   `spellcasting_ability` repeats the parent ability "so a subclass source
   instance can calculate access for its fixed grants; the access reader asks
   the subclass definition directly and does not fall back to its parent."
   `caster_fraction` and `caster_rounding` stay `NULL`, which makes the build
   report inherit the base class progression. Martial-parent subclasses keep
   all three caster fields `NULL`.
6. **Zero progression rows for all twelve.** "All twelve definitions have
   **zero** `subclass_progressions` rows." Absence is the inherit-parent
   signal. A single row on an SRD key is a defect, not a harmless extra.
7. **Forty fixed-spell rules, at definition scope.** "Their fixed spell rules
   live at definition scope with `active_from_class_level`, `bucket='prepared'`,
   `always_prepared=true` and `with_slots=true`." Verified those exact field
   names exist in the parser (`src/grants/grant-rule.ts:441-486`) and that
   definition-scope rules are read by `rulesForSubclassSource`
   (`src/grants/source-rule-reader.ts:306-351`). Ten each for Life Domain,
   Oath of Devotion, Draconic Sorcery and Fiend Patron. **"Every referenced
   spell content key must resolve after full application seed; an unresolved
   key is a hard seed/test failure, not an omitted spell."**
8. **Fifty-eight feature rows.** "Feature rows use SRD order across the whole
   subclass, `class_level` from the heading, `name` from the heading and
   `description=''`. No `subclass_feature_effects` row is created." The schema
   enforces the shape independently — verified at
   `src/db/schema.sql:1492-1507`: `description TEXT NOT NULL`,
   `CHECK(class_level BETWEEN 1 AND 20)`, `CHECK(sort_order >= 1)`, and unique
   indexes on `(subclass_definition_id, sort_order)` and
   `(subclass_definition_id, name)`.
9. **The deferred cases stay deferred** (section 4 and its closing paragraph).
   Circle of the Land's 24 table entries are "parsed evidence but not active
   grants until its renewable land choice is captured"; Magical Discoveries,
   Additional Fighting Style and Evocation Savant "remain explicit unsupported
   choice/timing cases rather than plausible approximations." Seeding a dormant
   `active_if_config` rule that can never fire is the failure mode named in
   section 10 ("Silent approximate mechanics") — it shows the player no spells
   and reads as green.
10. **The repair guard, section 5.2 — this is half the unit.** "Do not append
    the twelve keys to the current `bundledClassContentKeys().subclasses`
    array. That array currently means 'definition plus 20 progression rows';
    doing so would make every legitimate inherit-parent subclass permanently
    incomplete." Verified at the line: `hasBundledClassContent`
    (`src/rules/class-progression-lookup.ts:218-256`) multiplies
    `keys.subclasses.length * PROGRESSION_LEVELS`, so appending twelve keys
    demands 280 progression rows where 40 exist and re-seeds on every open.
    Instead expose the two checked inventories section 5.2 names: all fourteen
    bundled subclass definition keys, and the two override-schedule keys. Then:
    "The new SRD guard compares exact owned definition fields, ordered feature
    name/level tuples and normalized definition grant rules for its twelve
    keys. A count-only check is insufficient: deleting one feature, swapping a
    level or changing one spell key leaves every table count plausible.
    Reconciliation delete/reinserts only owned feature descendants and upserts
    the owned definition; it must not sweep imported siblings."
11. **Fix only the comments your own diff falsifies.** Two are yours:
    - `src/rules/sheet-srd.ts:644-652` ends "no subclass feature is seeded
      anywhere" — false the moment you insert 58 rows.
    - the `hasBundledClassContent` doc comment
      (`src/rules/class-progression-lookup.ts:208-217`, the phrase at :214)
      says "a database
      holding the fourteen definition keys". **That fourteen is twelve CLASSES
      plus two SUBCLASSES**, a different fourteen from the design's fourteen
      subclass definitions. Two collidable fourteens in one neighborhood:
      disambiguate the one you touch, in words, or leave it strictly alone.
    Everything else in section 9.1's closing paragraph is SC-6's.
12. **Read-only outside the catalog.** No command semantics change, no sheet
    projection, no gap union, no wizard, no agent reference, no character
    state. Section 5.3's first two paragraphs are SC-4's; only its factual
    premises about what is seeded become true because of you.

EXIT (the same row, deliverable half, quoted verbatim):

> Add twelve definitions, 58 empty-description feature rows and 40 fixed rules;
> retain 40 legacy progression rows; exact repair catches tuple/grant
> corruption without touching imported rows.

## Two boundary rulings the supervisor made when writing this brief

Both are genuine overlaps in the design; do not renegotiate them mid-unit.

1. **The split inventories are YOURS, their identity assertions are SC-5's.**
   Section 5.2 puts the inventory split under the repair guard (yours), while
   SC-5's row reads "Split fourteen definition keys from two override keys."
   Ruling: SC-3 implements and consumes the two inventories, because the repair
   guard cannot function without them; SC-5 consumes what you built and adds
   the CI-2a trigger-state assertions and the CI-3s handoff classification (12
   inherit + 2 override). You write no `key_kind` claim, no fingerprint, and no
   handoff record.
2. **Section 6's "assert fourteen subclass identities" is SC-5's.** Your
   obligation is only that inserting twelve definitions does not fight the
   CI-2a `catalog_register_subclass_identity_before_insert` trigger — verified
   present at `src/db/schema.sql:1723-1737`, registering each new key as
   `legacy-opaque + external` with no fingerprint. If a key you insert aborts
   that trigger, that is a real finding: STOP and report it.

## Tests

Integration and unit coverage you own (exact files, from section 9.1):

- `tests/integration/rules/class-progression.test.ts` — amend
  **"persists twelve complete class tables and two complete subclass tables"**
  and **"persists base-class metadata with third-caster rules only on
  subclasses"** to expect 14 definitions, still 40 progression rows, the exact
  twelve new parent/name/caster tuples, 58 features and 40 fixed rules. **Keep
  "persists all third-caster preparation and slot breakpoints" unchanged** —
  it is the proof both dense schedules survived, and it is section 9.1's named
  reason the amendment is a strict superset.
- `tests/integration/db/bootstrap.test.ts` — fresh install
  (**"gives a brand new database the twelve SRD classes with full
  progressions"**), the collision case
  (**"yields a class name already claimed by user content instead of failing
  the boot"** — 13 when bundled Wizard is displaced, every seedable sibling
  kept), the repair case
  (**"repairs a database whose definitions survived but whose progressions did
  not"**), and **"bundled class content detection"**'s two tests. ADD the
  feature/grant corruption repair cases; name the new one on the existing
  precedent at `tests/integration/db/bootstrap.test.ts:338`
  (**"boot repair compares exact class-resource tuples and formulas, not counts
  alone"**) — use **"boot repair compares exact SRD subclass feature tuples and
  grant rules, not counts alone"**.
- `tests/integration/catalog/subclass-provenance.test.ts` —
  **"is distinguishable in the database, over the seed and the import
  together"** compares the imported key against the complete checked bundle,
  not a hand-written two-row list.
- `tests/integration/homebrew/homebrew-catalog-fixture.test.ts` —
  **"keeps its imported key distinguishable from every bundled one"** expects
  imported + 14, and **"refuses a parent class this catalog does not have"**
  expects 14 after the refused import.

Browser tests you own (Chromium, 20 spec files):

- `tests/browser/bundled-content.spec.ts` —
  **"a fresh OPFS install carries the bundled classes and keeps them across
  reset and reload"**: 14 definitions, 58 seeded features, 40 subclass
  progressions after reset/reload.
- `tests/browser/catalog-import.spec.ts` —
  **"a subclass import lands, survives a reload, and outlives a spell
  replacement"**: 15 definitions; **replace the global `subclass_features`
  length-2 check with a query SCOPED to the imported definition, and separately
  assert the 58 seed rows.** Section 9.1 is explicit that this "preserves the
  original imported-row subject instead of weakening it to a new global total"
  — a global count here would be a weakened assertion (process rule 5).

Section 9.2's four controls **do not change** and their unchangedness is part
of your report: `tests/unit/ui/level-up-wizard.test.ts`'s
**"keeps an empty subclass catalog traversable with a Continue action"**, every
`a7-v*` case in `tests/unit/db/candidate-audit.test.ts`, the `a7-v*`
literal/snapshot assertions in `tests/integration/backup/round-trip.test.ts`,
and `tests/unit/schema.test.ts` + `tests/unit/db/schema-signature.test.ts`.

## Negative controls — one per load-bearing assertion, with the failing test

| Assertion | Mutation | Test that must fail |
|---|---|---|
| Twelve definitions, exact tuples | `drop-champion-from-seed`: skip one manifest entry in the seed loop | **"persists twelve complete class tables and two complete subclass tables"** |
| 58 exact feature tuples | `shift-one-feature-level`: seed Frenzy at class level 4 | **"persists twelve complete class tables and two complete subclass tables"** |
| 40 exact fixed rules | `swap-one-fixed-spell-key`: change one Life Domain spell key | **"persists base-class metadata with third-caster rules only on subclasses"** |
| Unresolved spell key is fatal | `point-a-fixed-rule-at-a-missing-spell-key` | your seed-failure test (name it; a silently omitted spell is the defect) |
| SRD keys carry zero progression rows | `give-an-srd-subclass-one-progression-row` | **"persists twelve complete class tables and two complete subclass tables"** (the retained-40 assertion) |
| Both dense schedules survive | `delete-arcane-trickster-rows` | **"persists all third-caster preparation and slot breakpoints"** |
| Dense guard is not extended to inherit-parent keys | `append-srd-keys-to-dense-inventory`: push the twelve into `bundledClassContentKeys().subclasses` | **"leaves the bundled content untouched when it is already present"** (the guard demands 280 rows and re-seeds every open) |
| Repair is tuple-exact, not count-exact | `delete-one-feature-row-then-boot` and, separately, `rewrite-one-definition-grant-rule-then-boot` | **"boot repair compares exact SRD subclass feature tuples and grant rules, not counts alone"** |
| Reconciliation never sweeps imported siblings | `reconcile-features-by-definition-name`: delete features by name/parent instead of by owned content key | **"keeps its imported key distinguishable from every bundled one"** and the scoped assertion in **"a subclass import lands, survives a reload, and outlives a spell replacement"** |
| The imported-row subject is not weakened | `assert-global-subclass-feature-count`: restore a global length check in place of the scoped query | **"a subclass import lands, survives a reload, and outlives a spell replacement"** — delete the imported feature while all 58 seed rows survive; the scoped assertion must still fail |
| Collision yields rather than steals | `steal-claimed-subclass-slot`: upsert over a `(parent, name, edition)` slot held by another content key | **"yields a class name already claimed by user content instead of failing the boot"** |
| Storage path carries the rows | `skip-seed-on-reopen` | **"a fresh OPFS install carries the bundled classes and keeps them across reset and reload"** |
| Deferred cases stay deferred (D169-adjacent, section 10) | `seed-circle-of-the-land-grants`: activate the 24 parsed entries as `active_if_config` rules | your manifest-consumption test asserting exactly 40 fixed rules |

## Process rules (all mandatory)

1. Spec TABLE for ALL Playwright spec files (**20** at writing): Spec |
   Affected | Why — a bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44542`. Full
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

## One verified warning about line numbers

The design's `src/db/schema.sql` citations have DRIFTED — they predate FF-A's
migration 0027 (`character_flavor`), which inserted a table earlier in the
file. Section 7 cites `subclass_definitions` at `1411-1425`; it is actually at
**1417-1431** on `a0a5382`. Section 7 cites `subclass_features` at
`1486-1501`; it is actually at **1492-1504**. **Locate every schema symbol by
NAME, never by the design's line number**, and treat the same drift risk as
live for the `src/rules/`, `src/grants/` and test citations.

REPORT: what you did; real numbers pasted; the spec table over all 20 spec
files; files created/modified; negative-control candidates with exact test
names; the SC-2 seam audit (which manifest symbols you consumed, under what
names); confirmation that section 9.2's four controls are byte-unchanged; and
an explicit statement that you retired nothing and invented nothing under D169.
