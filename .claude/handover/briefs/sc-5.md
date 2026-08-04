# DISPATCH SC-5 — subclass identity/inventory closure (S, MINT-FREE, <worktree assigned at dispatch>, PLAYWRIGHT_PORT=44544)

You are in <worktree assigned at dispatch>, fast-forwarded to main by the
supervisor. `.claude/decisions.md` is law and wins over every other guidance
file, including the binding plan below.

THE BINDING PLAN is `docs/design/2026-08-01-srd-subclass-seed.md`. BOUND:
the unit row **SC-5** in section 8, section **5.2** (repair guard / split
inventories), section **6** in full (identity-chain impact), section **7**
(persistence and MINT ruling), the section-9.1 rows for
`tests/integration/db/bootstrap.test.ts`,
`tests/integration/catalog/subclass-provenance.test.ts`,
`tests/integration/homebrew/homebrew-catalog-fixture.test.ts`,
`tests/browser/catalog-import.spec.ts` and `tests/browser/bundled-content.spec.ts`,
and section 9.2 in full (the controls that deliberately do not change).
Sections 1-4 are the extract/parser/inventory work of SC-1..SC-3 — build on
them, do not re-derive them.

## PRECONDITION — check this FIRST, before writing a line

**HARD PREREQUISITE: SC-3 must be MERGED into your merge base.** The section-8
dependency cell for SC-5 is `SC-3`, and every assertion you own reads rows SC-3
writes. Prove in YOUR merge base that all of the following exist:

1. The SRD subclass manifest/seeder module SC-2/SC-3 created (section 5.1: "one
   SRD subclass manifest/seeder module, separate from the legacy third-caster
   progression generator"), called after `ensureBundledClassContent`.
2. Twelve SRD `subclass_definitions` rows with **zero** `subclass_progressions`
   rows each, plus the two legacy dense keys still carrying 20 rows each
   (`2024:subclass:ek`, `2024:subclass:at`).
3. The 58 feature name/level rows with `description=''` and the 40 definition-scope
   fixed-spell rules.
4. Whatever SC-3 landed of section 5.2's "two checked inventories". **This is a
   seam, not a given** — see the SEAM AUDIT section below.

**If SC-3 is absent: STOP and report.** A blocked report is the CORRECT outcome.
Do NOT seed the twelve definitions yourself to unblock your own assertions, and
do NOT mint a second inventory beside SC-3's.

Verified by the supervisor at main `aa06973` when this brief was written, so you
can tell "SC-3 has not landed" from "SC-3 landed and I misread it":

- `src/rules/class-progression-lookup.ts:187` `bundledClassContentKeys()` still
  returns exactly `[EK_CONTENT_KEY, AT_CONTENT_KEY]`
  as `.subclasses`, and `hasBundledClassContent()` (same file, ~:216-255) uses
  that one array for BOTH the definition-presence check and the
  `subclasses.length * 20` progression check.
- `tests/integration/db/bootstrap.test.ts:38` still reads
  `const SRD_SUBCLASSES = ['AT', 'EK'] as const;`
- The only readers of `bundledClassContentKeys().subclasses` anywhere in the
  tree are `src/rules/class-progression-lookup.ts:220` and
  `tests/integration/db/bootstrap.test.ts:608,666`. Every other caller
  (`src/builder/guided-creation.ts:528`,
  `tests/integration/builder/guided-abilities.test.ts:72`,
  `tests/integration/builder/guided-creation.test.ts:34,275,353`) reads
  `.classes` only. **That short reader list is a supervisor-verified fact you
  may build on; re-confirm it in your merge base with one grep and paste it.**

## NOT YOURS

**SC-1** (the pinned `docs/srd/source/subclasses.txt` extract, the `SOURCE.md`
row and digest). **SC-2** (the typed manifest/parser, the exact-58/exact-12
parser controls, the typed deferred cases). **SC-3** (the catalog seed, the
definitions/features/fixed rules, the exact repair). **SC-4** (level-up options,
`SheetPrintedFeature.source`, the `partial_subclass_catalog` retirement, the
agent-reference rows). **SC-6** (the full regression sweep and the stale-comment
cleanup listed in section 9). **CI-3s itself** — you write no fingerprint, no
`bundled-stable` key kind, and no projector; you hand it an inventory.

**The D169 content swap is NOT yours** — see AMENDMENTS. You do not retire
EK or AT, and you do not seed the invented Monk
subclass.

Concretely: you add no seed row, you delete no seed row, you change no command
semantics, no sheet output and no level-up option list. SC-5 is an inventory,
typing and assertion unit.

## AMENDMENTS — read this section, it is not boilerplate

Rulings that postdate the binding plan, verified by commit order: the design doc
is `083037b`, and `582ecdc` (**D169-D172**) lands AFTER it (`git merge-base
--is-ancestor 582ecdc 083037b` → false; `582ecdc` is above `083037b` in
`git log`). D161-D168 (`65af4db`, `e9205bd`) all PRECEDE the doc. Of the four
newer rulings, **D170 (update prompt), D171 (bug-report button) and D172 (AI
panel in the public repo) touch nothing in this unit.** One does, and it hits
SC-5's unit row directly.

### D169 — the SC-5 row's numbers are pre-D169. Quoted verbatim:

> Owner's words: "Replace eldrich knight and trickster rogue with a made up
> third caster monk sub." Amends the SUBCL-SEED design's OQ-1 and its
> additive-14 shape: final bundled set = the twelve SRD subclasses PLUS ONE
> owner-original Monk subclass carrying a dense third-caster progression
> (keeping the third-caster machinery exercised, which was the argument for
> keeping EK/AT). EK and AT retire in the same unit
> that lands the replacement — retirement is a strict content swap, not a
> deletion-first. The invented subclass is original content (no licensing
> issue, D59). Its NAME, features, and spell list are DRAFTED by us and
> PRESENTED TO THE OWNER for approval before seeding — invented game content is
> owner-taste, not supervisor discretion. D80 covers characters left on EK/AT
> after retirement (unmade-subclass warning, sheet gap).

So the doc's section 8 SC-5 row ("fourteen definition keys", "two override
keys", "12 inherit + 2 override") and section 6's "fourteen subclass roots"
describe the **pre-D169 additive shape**. The post-D169 end state is **thirteen
definitions: twelve inherit-parent SRD roots plus ONE override root (the
invented Monk)** — and section 10's OQ-1 ("This design takes the
non-destructive, D151-complete default: retain them, yielding 14 definitions")
is answered and superseded.

**The swap has NOT happened and cannot happen in your lane.** D169 gates seeding
the invented subclass on owner approval of its name/features/spell list, and
`.claude/handover/lane-state.md` records that draft as still pending
("SUBCL invented-monk draft for owner approval (D169)"). Your merge base will
therefore hold EK/AT and the twelve SRD keys.

**CONSEQUENCE FOR YOU — this is the whole point of the unit:**

- Build the closure so the swap is a **one-place manifest edit**. No literal
  `14`, no literal `2`, no literal `12` anywhere in production code or in a test
  expectation that is not itself derived from the checked inventory.
- No closed two-member enum of override keys, no `expect(...).toHaveLength(14)`,
  no `toBe(2)` on a subclass count, no test whose name or comment asserts
  "exactly two dense schedules" as a permanent truth.
- Every count you assert is `inventory.length`, `overrideKeys.length * 20`, or
  an **explicit per-key tuple list read from the same inventory**. Section 5.2's
  reason stands unchanged and is why per-key beats count: "A count-only check is
  insufficient: deleting one feature, swapping a level or changing one spell key
  leaves every table count plausible."
- Assert against the set your merge base ACTUALLY seeds, and **state that set
  explicitly in your report** (which keys, which classification), so the swap
  unit can diff it.
- Where the design says "fourteen" or "two override", implement the SHAPE and
  amend the NUMBER, and say so in a code comment naming D169 — never silently.
- Section 6's "The 'exactly two dense bundled schedules' statement is real but
  narrower than 'exactly two bundled subclasses'" survives D169 with a smaller
  number: after the swap there is exactly ONE dense schedule. Nothing you write
  may make one-dense a code change rather than a manifest change.

D80 stays as-is: an available SRD option is not mandatory, omitting the subclass
still proceeds and warns. You add no retirement behavior and no migration for
characters sitting on EK/AT.

## SEAM AUDIT — do this before you write the inventory

Section 5.2's split inventories are described in the SEED design section, but
SC-5's row is what CLOSES them ("Split fourteen definition keys from two
override keys"). SC-3 may have landed part of the split already. **Audit first,
then close the gap — do not mint a second inventory.**

Report, explicitly: which of (a) the all-definitions inventory, (b) the
override-schedule inventory, (c) the per-key `override` / `inherit_parent`
classification, (d) the CI-2a trigger-state assertions, (e) the CI-3s handoff
already exist in your merge base, under what names, and which of them you added.
If SC-3 landed them under different symbol names, consume those names and say
so. If any section-9.1 row listed as yours below was already updated by SC-3 or
SC-4, verify it derives from the inventory and report it as pre-existing rather
than redoing it.

## MINT-FREE

You mint nothing. Section 7, quoted: "This work is **MINT-FREE**... Adding rows
therefore does not change an `a7-v*` snapshot shape, candidate-audit table set,
backup wire shape or schema signature. No migration, snapshot-version increment,
generated schema edit or frozen pre-Drizzle fixture edit is permitted in
SC-1..SC-6." Frozen with an EMPTY diff vs your merge base: migrations
0000-0027, wire v1-v17, existing `a7-v*` snapshot assertions, `src/db/schema.sql`,
`src/domain/contracts/generated/*`. No new table, column, index, trigger or RPC
method. If your work appears to need one, that is a dispatch error — STOP and
report (process rule 7).

Section 9.2 names four control sets that must have a **zero diff**, and an edit
to any of them is evidence of an accidental mint:
`tests/unit/schema.test.ts`, `tests/unit/db/schema-signature.test.ts`,
`tests/unit/db/candidate-audit.test.ts` (every `a7-v*` case),
`tests/integration/backup/round-trip.test.ts` `a7-v*` literals, and
`tests/unit/ui/level-up-wizard.test.ts` "keeps an empty subclass catalog
traversable with a Continue action".

## FLOORS

`.claude/handover/lane-state.md` IN YOUR WORKTREE governs and is authoritative;
it may be HIGHER than this brief by the time you start. At writing, its newest
restart point (2026-08-02-b, MAIN `a0a5382`) read:

> FLOORS: vitest 3,280 / 204 files; PW 93 tests / 20 spec files; build 0;
> migrations 0000-0027 frozen; wire v1-v17 frozen.

Supervisor-verified independently at `aa06973`: `ls tests/browser/*.spec.ts | wc -l`
= **20**. (An older line in the same file says 22 specs; that was corrected —
20 is right.) Meet or exceed whatever your worktree's copy says when you start.

## Scope

The unit row, quoted verbatim from section 8 (Implementation units):

> | **SC-5 — identity/inventory closure** | S | SC-3 | **NO** | Split fourteen
> definition keys from two override keys; CI-2a trigger state asserted; CI-3s
> handoff records 12 inherit + 2 override. |

1. **Two checked inventories, one owner.** Section 5.2, quoted:

   > Do not append the twelve keys to the current
   > `bundledClassContentKeys().subclasses` array. That array currently means
   > "definition plus 20 progression rows"; doing so would make every legitimate
   > inherit-parent subclass permanently incomplete... Instead expose two
   > checked inventories:
   > 1. all fourteen bundled subclass definition keys (twelve SRD plus two legacy);
   > 2. the two override-schedule keys (EK and AT).

   Implement that shape; the two numbers are amended by D169 as above. The
   definition inventory is what "is this key bundled?" reads; the override
   inventory is the ONLY thing multiplied by 20 in the boot guard.
   `hasBundledClassContent()` (`src/rules/class-progression-lookup.ts`, the
   `subclasses.length * PROGRESSION_LEVELS` arm) must read the override
   inventory for the progression count and the full inventory for definition
   presence. Both inventories derive from ONE manifest — a key present in the
   override list but absent from the definition list must be unrepresentable,
   not merely untested.

2. **Classification is typed and per-key, not counted.** Section 6, quoted:

   > Before CI-3s, its explicit checked seeder inventory must therefore contain
   > fourteen subclass roots and classify them as:
   > - two `override` aggregates with 20 progression rows; and
   > - twelve `inherit_parent` aggregates with zero progression rows, ordered
   >   feature graphs, and definition-level grant rules.

   Express `override | inherit_parent` as a discriminated union over the
   manifest, per AGENTS.md's "describe the rules engine in the type system": a
   key classified `inherit_parent` that carries progression rows, or `override`
   that carries none, must be a compile error or a checked-assertion failure —
   never a silently-passing count. Assert the classification per key against the
   actual database, both arms (exact 20 rows / exact 0 rows).

3. **CI-2a trigger state asserted.** Section 6, quoted:

   > CI-2a does **not** fingerprint subclasses and contains no executable
   > "exactly two" assumption. Its insert trigger registers every new subclass
   > identity as `legacy-opaque + external` and explicitly creates no
   > fingerprint... The new seed tests must nevertheless assert fourteen
   > subclass identities, all with the current trigger classification and no
   > fingerprint, so a premature key-kind claim cannot slip in.

   Concretely, for EVERY key in the definition inventory:
   `catalog_content_identities` holds exactly one row with
   `content_kind='subclass'`, `key_kind='legacy-opaque'`,
   `catalog_layer='external'` and `normalized_name = lower(name)` — that is what
   the trigger at `src/db/schema.sql:1723-1738`
   (`catalog_register_subclass_identity_before_insert`) writes; and
   `catalog_content_fingerprints` holds **zero** rows for that key in any
   scheme. Assert the fingerprint absence **scoped to the key**, never as a
   global `count(*) = 0` over the fingerprint table — other content kinds are
   not your subject and a global count is a control that will rot under CI-3s.
   Nothing in this unit writes `bundled-stable`; that key kind is D84/CI-3s's.

4. **CI-3s handoff, code first.** Section 6, quoted:

   > CI-3s is explicitly the unit that registers **every** bundled aggregate and
   > current/historical fingerprints... while the backfill inventory is required
   > to cover every bundled root. Landing this seed before CI-3s is therefore
   > the cheap path: CI-3s fingerprints the fourteen current aggregates once
   > instead of creating ten/twelve post-freeze historical additions.

   The handoff is the **exported, typed, checked inventory** CI-3s imports — not
   a prose paragraph. `docs/design/2026-07-30-content-identity.md:1198-1225`
   requires the backfill to "assert the explicit inventory covers every bundled
   root", and `:1287-1291` names CI-3s as the registrar. Ship the inventory in a
   place a projector can import (no test-only constant, no fixture). You may
   additionally append ONE short note to section 6 of the binding design doc
   recording the observed classification and the pending D169 swap; do not touch
   section 9 (SC-6 owns the doc cleanup list) and do not edit the
   content-identity design.

5. **Reconciliation never sweeps rows it does not own.** Section 5.2, quoted:

   > Reconciliation delete/reinserts only owned feature descendants and upserts
   > the owned definition; it must not sweep imported siblings.

   You are not writing the reconciler (SC-3 did), but the inventory you expose
   is what decides "owned". Prove with a test that an imported/homebrew subclass
   sitting beside the bundle is neither counted as bundled nor removed.

6. **The distinguishability tests read the inventory, not a hand-written list.**
   Section 9.1, quoted for
   `tests/integration/catalog/subclass-provenance.test.ts`: "Compare the
   imported key with the complete checked fourteen-key bundle, not a
   hand-written two-row list." Same for
   `tests/integration/homebrew/homebrew-catalog-fixture.test.ts`: "Expect
   imported + 14, and expect 14 after the refused import." Today both files
   hardcode a literal two-row expectation — `subclass-provenance.test.ts:113-123`
   lists `['2024:subclass:at', null]` and
   `['2024:subclass:ek', null]` inline;
   `homebrew-catalog-fixture.test.ts:540-548` repeats it, and `:612-614` asserts
   `scalar('SELECT count(*) AS n FROM subclass_definitions')` **`.toBe(2)`**.
   Replace the literals with inventory-derived expectations that keep the
   ORIGINAL SUBJECT: the imported key still resolves to owner
   `longroad.homebrew` and every bundled key still resolves to `null`. Preserving
   the subject while widening the comparison is a strict superset; replacing an
   owner assertion with a bare count is a weakened assertion and is forbidden.

7. **The two browser inventory proofs.** Section 9.1 for
   `tests/browser/bundled-content.spec.ts` ("Expect 14 definitions, 58 seeded
   features and 40 subclass progressions after reset/reload") — today
   `tests/browser/bundled-content.spec.ts:58` asserts
   `countRows(page, 'subclass_definitions')` `.toBe(2)`. And for
   `tests/browser/catalog-import.spec.ts`: "Expect 15 definitions. Replace the
   global `subclass_features` length 2 check with a query scoped to the imported
   definition, while separately asserting the 58 seed rows" — today
   `catalog-import.spec.ts:229-233` asserts `inspectRows('subclass_definitions')`
   `.toHaveLength(3)` and `:243-245` asserts a GLOBAL
   `inspectRows('subclass_features')` `.toHaveLength(2)`. Scope the imported-row
   assertion to the imported content key so it still fails when the imported
   feature is deleted while every seed feature survives; assert the seed totals
   separately, derived from the inventory. Both spec numbers are D169-sensitive:
   derive them, do not retype them.

8. **Read-only with respect to behavior.** No change to seeding output, level-up
   options, sheet projection, command semantics, or the D80 controls. If closing
   the inventory appears to require changing what gets seeded, that is SC-3's
   scope and a re-dispatch — STOP and report.

EXIT (the same row, deliverable half, quoted verbatim):

> Split fourteen definition keys from two override keys; CI-2a trigger state
> asserted; CI-3s handoff records 12 inherit + 2 override.

Amended by D169 exactly as stated above: the split and the assertions are the
exit; the numbers are whatever your merge base's manifest holds, derived and
reported, with the post-swap end state (12 inherit + 1 override) reachable by a
manifest edit alone.

## Negative controls — one per load-bearing assertion, with the failing test

| Assertion | Mutation | Test that must fail |
|---|---|---|
| The inventory is SPLIT, not appended | `append-srd-keys-to-subclasses-array`: put the SRD keys into the 20-row override array | **"reports missing content when only part of the catalog is present"** (`tests/integration/db/bootstrap.test.ts:605`) — the guard reports false on a healthy fresh database |
| Override keys are the ONLY thing multiplied by 20 | `multiply-all-definitions-by-twenty`: use the definition inventory in the progression arm of `hasBundledClassContent` | the same bootstrap test, plus **"repairs a database whose definitions survived but whose progressions did not"** |
| Classification is per-key, both arms | `flip-one-key-to-override`: classify one inherit-parent SRD key as `override` | your new classification test (name it, e.g. **"every bundled subclass root is override with twenty progression rows or inherit-parent with none"**) |
| Counts derive from the inventory, not literals | `drop-one-key-from-inventory`: remove one SRD key from the checked inventory | **"is distinguishable in the database, over the seed and the import together"** and **"keeps its imported key distinguishable from every bundled one"** — the exact owners comparison |
| No premature bundled-stable claim | `premature-bundled-stable`: write `key_kind='bundled-stable'` for one bundled subclass identity | your new CI-2a trigger-state test |
| No fingerprint before CI-3s | `seed-subclass-fingerprint`: insert a `content-v1` `current` fingerprint row for one bundled subclass key | the same test's scoped zero-fingerprint assertion |
| Imported siblings are not owned and not swept | `inventory-claims-imported-key`: include an owner-namespaced key in the definition inventory | **"ignores rows that belong to content outside the bundle"** (`tests/integration/db/bootstrap.test.ts`) and the two distinguishability tests |
| The imported browser row keeps its own subject | `unscope-imported-feature-count`: revert the scoped query to a global `subclass_features` count | **"a subclass import lands, survives a reload, and outlives a spell replacement"** — delete the imported feature, leave every seed feature, the scoped assertion still fails |
| The override schedule stays dense | `drop-one-override-progression-row` | **"a fresh OPFS install carries the bundled classes and keeps them across reset and reload"** and the bootstrap progression-count assertion |

Add a control for anything else load-bearing you introduce; the table is a floor.

## Process rules (all mandatory)

1. Spec TABLE for ALL Playwright spec files (**20** at writing): Spec | Affected
   | Why — a bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44544`. Full
   vitest too. Paste real numbers — not "green", the counts.
4. Other lanes run suites concurrently; contention is the norm. CONCURRENCY LAW
   from lane-state: at most ONE full suite of ANY kind machine-wide; single-FILE
   vitest runs are the only thing allowed beside a running suite. Any test >1.5s
   alone gets a per-test timeout (20_000) with the MEASURED alone-time in a
   comment. **Never a config edit**, and a `--testTimeout`/`--timeout` CLI
   override is NOT a gate result.
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

REPORT: what you did; real numbers pasted (vitest counts, Playwright counts,
build); the spec table over all 20 specs; files created/modified;
negative-control candidates with exact test names; the SEAM AUDIT (which of the
five closure pieces already existed, under what names, and which you added); the
EXACT bundled subclass key set and per-key classification your merge base holds,
so the D169 swap unit can diff it; and any place where you implemented the
design's SHAPE with a D169-amended NUMBER.
