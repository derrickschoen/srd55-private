# DISPATCH SC-6 — full regression and docs cleanup (S, MINT-FREE, <worktree assigned at dispatch>, PLAYWRIGHT_PORT=44545)

You are in `<worktree assigned at dispatch>` (the supervisor fills this line in
when it dispatches you; if it still reads that literal when you start, STOP and
ask). `.claude/decisions.md` is law and wins over every other guidance file,
**including the binding plan below** — and for this unit that is not a formality:
see AMENDMENTS.

THE BINDING PLAN is `docs/design/2026-08-01-srd-subclass-seed.md`. If it is not
in your tree you were dispatched to the wrong worktree: STOP and report.

BOUND: the section-8 unit row **SC-6** and the dependency column above it;
**section 9 in full** — 9.1's fourteen-row table of tests that change plus its
closing production/test-comment paragraph, and 9.2's four controls that
deliberately do not change; **section 7**, the MINT-FREE ruling and the four
schema facts it rests on. Sections 1-6 are the units before you. SC-6 **proves
they landed as ruled**; it re-derives none of them and re-plans none of them.

## PRECONDITION — check this FIRST, before touching a test

SC-6 depends on **SC-1..SC-5, all of them**. A closeout run against a tree where
the seed never landed is F19's zero from an instrument pointed at nothing.
Verified by the supervisor on main `a0a5382` when this brief was written — every
one of these was still in its PRE-SC state:

1. `docs/srd/source/subclasses.txt` — **ABSENT** (31 extracts on disk, none of
   them a subclass extract), and `docs/srd/SOURCE.md` carries no row for it.
   That is SC-1.
2. No SRD subclass manifest/parser module and no `tests/unit/rules/srd-subclasses.test.ts`.
   That is SC-2.
3. `bundledClassContentKeys()` at `src/rules/class-progression-lookup.ts:187-195`
   still returns exactly `['2024:subclass:ek',
   '2024:subclass:at']`, and `hasBundledClassContent()` still
   demands `subclasses.length * 20` progression rows
   (`src/rules/class-progression-lookup.ts:209-257`). That is SC-3 + SC-5.
4. `SheetPrintedFeature.source` in `src/queries/character-sheet-builder.ts` is
   still `'background' | 'species_trait'`, and `partial_subclass_catalog` is
   still in the gap union (`:305-306`) and still emitted (`:502`). That is SC-4.

Prove each of the four has moved in **your own merge base**. If any still holds,
SC-1..SC-5 are not all in your base: **STOP and report, naming which one.** Do
not implement the missing unit to unblock yourself, and do not run a closeout on
a partial base and call it green.

## NOT YOURS — every adjacent unit, named

- **SC-1** (the pinned extract, the `SOURCE.md` row and digest) — you verify it,
  you do not create or re-cut it.
- **SC-2** (the typed manifest/parser, the closed one-per-class set, the typed
  deferred cases) — you write no parser and no manifest.
- **SC-3** (definitions, feature rows, fixed spell rules, the repair guard) —
  you write no seeder and you repair nothing.
- **SC-4** (`subclass_feature` on `SheetPrintedFeature`, the projection, the
  view label, retiring `partial_subclass_catalog`, the agent-reference row) —
  you write no projection and no renderer.
- **SC-5** (split inventories, CI-2a trigger-state assertions, the CI-3s
  handoff) — you write no inventory constant.
- **The D169 EK/AT-for-Monk swap unit** (see AMENDMENTS) — you retire nothing,
  you invent no subclass, and you do not draft or approve owner-original game
  content.
- **CI-3s** and the whole CI/HA mint chain; **the D165 walkthrough scripts**
  (script 1 gains a subclass choice — a later unit, and its absence is not an
  SC-6 gap); **D158**'s spell form/fork; **W-MC-1..6**; **SS-1..SS-5**;
  **P0..P7**. None of these are SC-6 and none are gaps you report against
  SC-1..SC-5.

Concretely: SC-6 adds no production code. If closing a gap needs a production
change, that is an SC-1..SC-5 defect — report it as a fix dispatch, do not
absorb it (process rule 7).

## AMENDMENTS TO THE BINDING PLAN — rulings newer than the doc. These WIN.

The doc is dated **2026-08-01**. Everything from D162 up was recorded
**2026-08-02**, i.e. after it. Read this section; it is not boilerplate.

### D169 — the design's own arithmetic is superseded. This is the big one.

Owner's words, verbatim: *"Replace eldrich knight and trickster rogue with a
made up third caster monk sub."* D169 continues, verbatim:

> Amends the SUBCL-SEED design's OQ-1 and its additive-14 shape: final bundled
> set = the twelve SRD subclasses PLUS ONE owner-original Monk subclass carrying
> a dense third-caster progression (keeping the third-caster machinery
> exercised, which was the argument for keeping EK/AT). EK and
> AT retire in the same unit that lands the replacement —
> retirement is a strict content swap, not a deletion-first. … Its NAME,
> features, and spell list are DRAFTED by us and PRESENTED TO THE OWNER for
> approval before seeding … D80 covers characters left on EK/AT after
> retirement (unmade-subclass warning, sheet gap).

**§10's OQ-1 is ANSWERED, and answered the other way.** The doc's stated default
— *"This design takes the non-destructive, D151-complete default: retain them,
yielding 14 definitions"* — is dead. So is every count literal derived from it.
Non-exhaustively, these numbers in the bound sections are STALE:

| Doc says | D169 makes it |
|---|---|
| §1's "**fourteen bundled subclass definitions: twelve SRD definitions plus the two existing definitions**" | twelve SRD + one owner-original Monk = **thirteen** |
| §9.1 "Expect 14 definitions, still 40 progression rows" | thirteen definitions; **20** subclass progression rows (one dense schedule, not two) |
| §9.1 / §3 "two complete subclass tables", "two dense schedules", "two override keys" | **one** of each |
| §9.1 bootstrap "expect 14 on a fresh DB, 13 when bundled Wizard is displaced" | 13 and 12 |
| §9.1 `catalog-import.spec.ts` "Expect 15 definitions" | 14 |
| §9.1 homebrew "Expect imported + 14 … 14 after the refused import" | imported + 13, and 13 |
| §6 "fourteen subclass roots … two `override` … twelve `inherit_parent`" | thirteen roots, **one** override, twelve inherit_parent |
| §4 "58 feature name rows and 40 unconditional fixed-spell rules" | 58 + the Monk subclass's rows, and 40 + whatever its approved spell list carries |

**CONSEQUENCE FOR YOU, and it is a hard rule: SC-6 takes no count from the
design document.** Every exact-state number you assert or update comes from
SC-5's split checked inventories and SC-3's seeded content **as they exist in
your merge base**, cross-checked against SC-1..SC-5's reports — never from the
plan's prose. A test that encodes "14" because §9 printed "14" is a defect this
brief exists to prevent.

**The swap is owner-gated and may not have landed.** The invented Monk
subclass's name, features and spell list require owner approval *before
seeding*. So your merge base is in exactly one of three states. Determine which,
say so in your report, and act accordingly:

- **(a) Swap landed** (EK/AT gone, Monk subclass seeded, one dense schedule):
  proceed; every count you touch is measured against that tree.
- **(b) Swap not landed, base is additive-14** (EK/AT still present, no Monk
  subclass): the §9 exact-state updates you are asked to make would encode
  counts D169 has already invalidated. **STOP and report** — that is a dispatch
  collision, not something to absorb, and a stale count committed here costs a
  second pass over every one of these files. Do NOT retire EK/AT yourself to
  "fix" it: D169 says retirement rides with the replacement, and the replacement
  is owner-approval-gated content you are not authorized to invent.
- **(c) Anything else** (EK/AT retired but no replacement; a Monk subclass
  present that no report ties to an owner approval): **STOP and report**, naming
  what you found. A tree with a deletion-first retirement contradicts D169's
  "strict content swap" in so many words.

**One second-order collision, so you do not walk into it mid-sweep.** §9.1
instructs "Keep the third-caster breakpoint test unchanged", and §9.2 keeps the
"Existing EK/AT slot, access, level-up and multiclass
tests … No change except stale global-count comments." Under D169 those tests'
**subject retires**. Their disposition belongs to the swap unit, which must
re-point them at the replacement Monk schedule as a strict content swap — it is
NOT SC-6's to re-point, and it is NOT SC-6's to delete. In state (a) they should
already be re-pointed and green; if they are not, that is a finding you name.

**Do not rewrite the design doc's unit tables or its §4/§6/§9 counts.**
Re-planning SUBCL-SEED around D169 is the supervisor's, not a closeout's. If you
touch `docs/design/2026-08-01-srd-subclass-seed.md` at all it is ONE dated
amendment paragraph recording that D169 supersedes OQ-1 and the 14/40/two-dense
shape — no silent renumbering of a merged design.

**D80 still governs the characters left behind.** If the swap did land, a
character still pointing at EK/AT is an unmade-subclass warning and a sheet gap,
not an error and not a migration. That behaviour is the swap unit's to prove;
if no test in your base proves it, that is a finding you name, not a test you
write (it needs production behaviour you do not own).

### The rest, shorter

- **D162 (2026-08-02)** makes all three print appendices optional with
  per-character remembered preferences. You touch `tests/unit/ui/sheet-view.test.ts`
  for the subclass-feature row only. Do not assert anything about the print
  control's option set, and do not treat a print preference row appearing in a
  character write as a violation of any assertion you add.
- **D159 (2026-08-01)** adds a future verbose-calculation appendix. Same
  consequence at your altitude: assert nothing that closes the appendix set, and
  do not report its absence as a gap.
- **D152 is bound by the doc and stays bound.** No class or subclass feature
  *prose* is extracted or printed; reached feature **names** and the four
  supported spell tables are catalog facts. "Spell prose prints but feature
  prose does not" is settled, not an inconsistency to raise. Your job here is to
  prove SC-4 did not leak prose — including that it did not reuse the generic
  "No description is recorded" sentence, which §5.3 forbids by name.
- **D153 (2026-08-01): your browser matrix is Chromium (D109).** The WebKit
  spike is an owner-ordered SUPERVISOR task with owner-ordered config scope.
  Adding a `webkit` project is the config edit process rule 5 forbids.
- **D148: the D106 gate HOLDS in full.** A green SC-6 closes the SUBCL-SEED
  chain and nothing else. It is not a publish-readiness statement and does not
  authorize a sitting.
- Not touching you, so do not spend time on them: D161, D163, D164, D166, D167,
  D168, D170, D171, D172.

## MINT-FREE

Section 7 is explicit: *"No migration, snapshot-version increment, generated
schema edit or frozen pre-Drizzle fixture edit is permitted in SC-1..SC-6."*
You mint nothing and you change nothing mintable. Frozen with an **EMPTY diff**
vs your merge base:

- `drizzle/0000-0027*.sql`, `db/schema/**`, `src/db/schema.sql`
- `src/sharing/wire-schemas/v1..v17`
- `src/backup/backup-version.ts` (`DATABASE_BACKUP_VERSION = 1`,
  `CHARACTER_BACKUP_VERSION = 3`)
- `src/character/character-state.ts` (`CHARACTER_SNAPSHOT_SCHEMA_VERSION = 'a7-v16'`)
- every existing `a7-v*` assertion

Those version values were read by the supervisor at `a0a5382`. **Verify them in
your own merge base and use yours** — do not trust this brief's numbers over the
tree. If your closeout appears to need a table, a column, a version or a
migration, that is a dispatch error: STOP and report (process rule 6/7).

The four §9.2 controls are the mechanical proof of this, and a diff in any of
them is *evidence of an accidental mint*, not a number to update:
`tests/unit/schema.test.ts` (the 75-table count and the two frozen pre-Drizzle
hashes), `tests/unit/db/schema-signature.test.ts:60-84`,
`tests/unit/db/candidate-audit.test.ts` (every `a7-v*` case; its `A7_V1_TABLES`
is a hand-written historical fact — five character-state tables — and catalog
seed rows are not in it), and `tests/integration/backup/round-trip.test.ts`'s
`a7-v*` literals.

## FLOORS

`.claude/handover/lane-state.md` **in your worktree** governs and is
authoritative — read it, never go below it. At writing its restart point read:
**vitest 3,232 / 201 files; Playwright 93; build 0; migrations 0000-0027; wire
v1-v17; existing a7-v\* assertions.**

Reconciliation, so you do not stop on it: main has moved past that line
(`a0a5382`, P1-GH merged). The supervisor counted **204** `*.test.ts` files and
**20** files under `tests/browser/` in the main worktree when writing this. Note
also lane-state's own correction: an earlier line there says "22 specs" and is
**wrong** — the spec-FILE count is 20; the 92/93-test floor is the verified
number. Count both in your own tree, use the **higher** of (your count,
lane-state) as the floor, and NAME the discrepancy in your report. Do not
silently pick one and do not treat it as a missing-file finding.

## Scope

The unit row, quoted verbatim from section 8 (Unit | Size | Depends on | MINT |
Deliverable / exit):

> **SC-6 — full regression and docs cleanup** | S | SC-1..SC-5 | **NO** |
> Exact-state tests and stale comments listed in §9 updated;
> schema/snapshot/candidate controls unchanged; focused unit/integration/browser
> suites pass.

That row is both your Scope and your EXIT. Concretely:

1. **The four commands, in this order, with real numbers pasted for each:**
   `npm run typecheck`, `npm test`, `npm run build`, `npm run test:browser`
   (Playwright on `PLAYWRIGHT_PORT=44545`). "Green" is not a number.
2. **Make the typecheck zero trustworthy.** `npm run typecheck` is `tsc -b`, and
   both projects write build info to a machine-global path shared by every
   worktree on this box — `tsconfig.app.json:15`
   (`/tmp/dnd-multiclass-spells-static-app.tsbuildinfo`) and
   `tsconfig.node.json:14` (`…-node.tsbuildinfo`). A concurrent lane can hand
   you a cached 0. Run `npx tsc -b --force` and paste that. A CLI flag is not a
   config edit; both tsconfigs stay untouched.
3. **Sweep §9.1's fourteen rows and close each one.** For every row: state
   whether the owning unit (SC-1..SC-5) already made the change, and if it did
   not, make it here — *provided it is a test/comment change*. Each row also
   carries a "Strict-superset ruling" column; where §9 says the change is a
   strict superset, **prove it**: name the surviving assertion and show the old
   subject is still asserted. Two rows are explicitly subject-gone deletions
   (`partial_subclass_catalog`; the agent-reference `partial` → `modelled`
   subclass row) — for those, prove the *retained* half survives:
   `no_class_feature_text` remains, and the separate `class features: partial`
   row remains.
4. **The one weakening trap §9 names, do not fall into it.**
   `tests/browser/catalog-import.spec.ts` currently checks a global
   `subclass_features` length of 2. Replacing it with a new global total is a
   WEAKENED assertion. §9.1 requires the original subject preserved: scope the
   query to the **imported** definition, and assert the seeded feature-row count
   separately. Test name today: **"a subclass import lands, survives a reload,
   and outlives a spell replacement"**.
5. **Stale comments, the five sites §9 names**, each verified present by the
   supervisor at `a0a5382`:
   - `src/builder/level-up.ts:53-59` — "Only two subclasses are seeded (Eldritch
     Knight, AT), so a level-3 refusal would dead-end ten of
     twelve classes". False after SC-3; **and its two named subclasses are the
     retiring pair under D169.**
   - `src/commands/level-up-class.ts:224-228` — same false premise, same fix.
   - `src/rules/sheet-srd.ts:644-652` — "no subclass feature is seeded
     anywhere". False after SC-3.
   - `tests/fixtures/homebrew-subclass.ts:3-33` — its claim that nothing in
     `src/` writes a `subclass_features` row.
   - `tests/fixtures/level-up-mutations.mjs:134-152` — the `subclass-refusal`
     mutation's rationale: "a Wizard (unseeded subclass)" becomes "available but
     omitted". **The mutation text itself stays byte-equivalent** — only the
     comment changes, and the control must still kill its test.
   Correct the *premise*; do not delete the reasoning. §9's closing line: "No
   fixture prose is deleted merely to make a test pass." Every one of these
   comments carries a ruling (D70/D80/D3/D19) that survives the count change.
6. **Any comment you correct must not re-encode a D169-stale count.** The
   simplest example is in your own scope-5 list, and there is another at
   `src/rules/class-progression-lookup.ts:210-217` ("a database holding the
   fourteen definition keys" — twelve classes plus two subclasses). Prefer
   wording that names the inventory constant rather than a literal.
7. **Mint manifest.** Produce an explicit pre/post checksum manifest over every
   path in MINT-FREE above and report no changes. Use file checksums and say
   which tool; that proof does not require Git.
8. **Docs cleanup, bounded.** `docs/srd/SOURCE.md` must list the new extract
   with its pages, scope and digest (SC-1's, verified by you). Beyond that, docs
   cleanup here means the stale comments in scope 5 and — at most — the single
   dated D169 amendment paragraph described in AMENDMENTS. It does not mean
   rewriting the merged design.
9. **Owner questions.** §10 records exactly one, OQ-1, and **D169 answered it.**
   Record that in your report. If your sweep produces a *new* owner question,
   name it, do not answer it yourself, and do not declare the exit met.

## Negative controls — one per load-bearing assertion, with the exact failing test

SC-6 is a proving unit, so its controls are the §9.1 candidates **applied and
inverted one at a time**: apply the exact mutation, run the named test, record
the exact failing test name and count, then **invert the exact edit** to restore
(F19: `git checkout <path>` restores to HEAD, not to what you were holding — and
`COMMON.md` forbids git commands in a dispatch worktree anyway), then re-run
green. A control that kills a *different* test than the one named is a finding,
not a pass.

Names below are the exact names in the tree at `a0a5382`. Rows marked *(SC-n's
name)* are tests SC-1..SC-5 create or rename — take the exact merged name from
that unit's report, paste it in your report, and if you cannot find it, say so
rather than inventing one.

| ID | Mutation | Test that must fail |
|---|---|---|
| SC-EXTRACT-BYTES | change one byte of `docs/srd/source/subclasses.txt` without its SOURCE digest | **"matches the committed bytes of every listed extract"** |
| SC-EXTRACT-LISTED | delete the extract's `SOURCE.md` row, leaving the file | **"leaves no extract on disk without a row in the table"** |
| SC-EXACT-12 | remove Champion; separately duplicate Thief; separately change one feature level; separately inject one prose line; separately change one spell key | *(SC-2's names)* in `tests/unit/rules/srd-subclasses.test.ts` — five separate runs, five named failures |
| SC-SEED-EXACT | delete one seeded definition or one feature row; separately alter one fixed-spell grant | *(SC-3's renamed name)* — today **"persists twelve complete class tables and two complete subclass tables"** |
| SC-DENSE-INTACT | delete one row from the surviving dense third-caster schedule | **"persists all third-caster preparation and slot breakpoints"** — §9.1 keeps it unchanged, but under D169 its subject is the replacement subclass, not EK/AT (see AMENDMENTS) |
| SC-REPAIR-EXACT | delete one feature row, or replace one fixed spell key, **without changing any count** | **"repairs a database whose definitions survived but whose progressions did not"** plus SC-3's added corruption case *(SC-3's name)* |
| SC-FRESH-INSTALL | drop one seeded definition from the fresh-install expectation | **"gives a brand new database the twelve SRD classes with full progressions"** |
| SC-FRESH-OPFS | make reset/reload duplicate or erase the new rows | **"a fresh OPFS install carries the bundled classes and keeps them across reset and reload"** |
| SC-IMPORT-SCOPED | delete the **imported** subclass feature while all seeded features survive | **"a subclass import lands, survives a reload, and outlives a spell replacement"** — the scoped assertion, which a global count would have missed |
| SC-IMPORT-DISTINCT | give one bundled key an imported owner-shaped key | **"is distinguishable in the database, over the seed and the import together"** |
| SC-HOMEBREW-INVENTORY | drop one bundled key from the checked inventory | **"keeps its imported key distinguishable from every bundled one"** |
| SC-D80-OMIT | the existing `subclass-refusal` mutation from `tests/fixtures/level-up-mutations.mjs` | **"proceeds through level 3 without a subclass — the choice is owed, never refused (D70)"** |
| SC-EMPTY-CATALOG | *(no mutation — a no-change control)* | **"keeps an empty subclass catalog traversable with a Continue action"** must be green and its diff EMPTY; §9.2 forbids changing it |
| SC-LEVEL-FILTER | print a level-6 feature name for a level-3 character | *(SC-4's name)* in `tests/integration/queries/character-sheet.test.ts`; the retained gap assertion lives in **"names application-wide gaps without adding language/tool noise"** |
| SC-NO-GENERIC-NULL | route subclass null text through the generic "No description is recorded" branch | *(SC-4's name)* in `tests/unit/ui/sheet-view.test.ts` |
| SC-AGENT-REF-SPLIT | mark `class features` `modelled` as well | **"states what the application models, including what only the sheet derives"** (`tests/unit/ui/agent-reference.test.ts`), and the browser row assertion in `tests/browser/agent-reference.spec.ts` |
| SC-FEAT-EVIDENCE | remove one new key from the known-bundled set, so Champion returns `unprovable` | **"it counts bundled subclass Spellcasting and withholds imported subclass negatives"** |
| SC-MINT-FROZEN | *(no mutation — a no-change control)* | `tests/unit/schema.test.ts` and `tests/unit/db/schema-signature.test.ts` green with an EMPTY diff; a needed edit here is an accidental mint, and a STOP |

## Process rules (all mandatory)

1. Spec **TABLE** for ALL Playwright spec files (20 at writing): Spec |
   Affected | Why — a bare list is a re-dispatch. Every file in
   `tests/browser/`, including the ones this chain never touches.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44545`. Full
   vitest too. Paste real numbers — the counts, not "green".
4. Other lanes run suites concurrently; contention is the norm. Any test >1.5s
   alone gets a per-test timeout (20_000) with the **measured** alone-time in a
   comment. **Never a config edit.** Machine-wide rule (lane-state, 2026-08-02):
   **at most ONE full suite of ANY kind at a time** — a full vitest beside a full
   Playwright produces false reds too; single-FILE vitest runs are the only thing
   allowed beside a running suite.
5. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `.skip`, no `.todo`, no
   config edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (a stated strict-superset replacement
   is the only legal removal), never regenerate an expectation from our own
   output — expectations are hand-reviewed values.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails. For SC-6 that is the table above, plus a control
   for anything you add.
7. If the scope seems to require touching a forbidden area (a frozen artifact,
   a config, another unit's files) or seems infeasible as specified — and the
   D169 state-(b) collision above is the most likely instance — **STOP and
   report the finding. That is a correct outcome, not a failure.**
8. Use Python, not shell, for any text search whose pattern contains `*`,
   backticks or `$`; the shell mangles them and returns a false zero.
9. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted for all four commands; the spec table;
which of the three D169 base states you found and how you determined it; the
§9.1 fourteen-row sweep with, per row, who made the change and the strict-
superset proof; the five stale-comment sites; the control results with exact
failing test names; the mint manifest and the tool used; the floor/spec-count
discrepancy; files created/modified; and every gap you found in SC-1..SC-5
stated as a finding rather than absorbed.
