# Test-suite value audit

Date: 2026-08-26  
Scope: read-only static audit; no suite was run. All runtime evidence is mined
from existing `.tmp-*.log` output and the two named mutation reports.

## Summary numbers and method

- The stated 469-file census is exact for `tests/**/*.test.ts`: 340 unit, 128
  integration, and 1 parity file. The complete requested surface is 537 files:
  those 469, 49 browser specs, 1 deep-link spec, 1 serving spec, 1 opt-in live
  test, 5 compile-only type tests, and 11 tool/script tests. `tests/contracts`
  contains a contract fixture, not an executable test.
- Static `grep -cE '(test|it)(\.(each|skip|todo|only))?\('` finds 5,433 test
  declaration lines. Existing full Vitest output expands `it.each` to 8,441
  cases over 466 files (`.tmp-order-dependence.log:7573-7576`). Ten shuffled
  runs took 94.96-166.54 seconds wall and 695.73-814.69 cumulative test-seconds
  (`.tmp-order-dependence.log:7576-15248`). The latest census has three more
  Vitest files, so these timings are estimates, not a fresh baseline.
- Existing per-file result lines cover 329 files. Taking each file's fastest
  successful observed result (to reduce loaded-machine/failure-timeout bias)
  assigns 77.7% of sampled test time to integration, 8.4% to `unit/db`, 6.7%
  to `unit/simulation`, 3.3% to `unit/ui`, and 3.9% to everything else. These
  are cumulative worker-time shares, not wall-clock percentages.
- The old tools simulator is a separate approximately 7-second lane: an
  existing 9-file run reports 6.95 seconds wall / 4.95 seconds test time
  (`.tmp-oaloop-perf.log:76146-76149`). Browser runtime is UNKNOWN: the only
  local baseline artifact stopped because port 4173 was occupied
  (`.tmp-browser-baseline.log`), and this audit did not touch that port.
- Mutation evidence is narrow but decisive. `shard-001/mutation.json` covers
  10 production files and names 193 test files; 767 mutants were killed. The
  simulation report covers 9 production files and names 38 test files; 1,849
  mutants were killed. Across them, 35 of 39 `unit/simulation` files contain
  at least one sole-killer test (254 sole-killer tests), and 25 integration
  files contain 62 sole-killer tests. Those tests are KEEP while their subject
  exists. Anything outside the reports is kill-value UNKNOWN and defaults KEEP.
- `CUT` below means a proposal for the later implementation pass. D388 cuts are
  conditional on deleting their old subject in Stage 5; they are not safe
  deletions in the current tree. `MERGE` means preserve the independent oracle
  while sharing setup or parameterizing cases.

## Per-section audit

Runtime share is of the default Vitest lane unless marked “separate” or
UNKNOWN. Candidate labels name the actionable exception; unlisted tests in a
row are KEEP/UNKNOWN.

| Section | Files | grep tests | Est. runtime share | Classification and evidence |
|---|---:|---:|---:|---|
| `tests/unit` root | 12 | 91 | 1.5-2.5% | MERGE the two compiler subprocesses in `declaration-emit.test.ts` and `authoring-contracts.test.ts`; otherwise KEEP/UNKNOWN (including cheap schema-generator format checks). |
| `unit/access` | 2 | 4 | <0.1% | KEEP: `assignment.test.ts` has 2/2 sole-killer tests (8 sole kills). |
| `unit/ai-bridge` | 6 | 120 | ~0.3% | KEEP/UNKNOWN; merge sibling CLI argument/refusal matrices only, without using the opt-in live oracle. |
| `unit/assets` | 2 | 14 | <0.1% | KEEP/UNKNOWN; static asset integrity is not otherwise covered. |
| `unit/authoring` | 1 | 10 | <0.1% | KEEP/UNKNOWN. |
| `unit/backup` | 1 | 22 | <0.1% | KEEP; mutation-covered but no sole-kill claim is needed to justify codec/adversarial coverage. |
| `unit/bridge` | 9 | 138 | <0.5% | KEEP/UNKNOWN; MERGE repeated fake transport envelopes across sibling files. |
| `unit/builder` | 2 | 14 | <0.1% | KEEP/UNKNOWN; one file is mutation-covered. |
| `unit/catalog` | 14 | 131 | <0.2% | KEEP/UNKNOWN; MERGE projector V1 fixture tables, not their independent expected bytes. |
| `unit/combat` | 27 | 270 | <0.5% | KEEP/UNKNOWN. These are the stronger shared-engine tests that replace old sim semantics under D388; do not trade them for sim cuts. |
| `unit/commands` | 2 | 14 | <0.1% | KEEP/UNKNOWN. |
| `unit/contracts` | 6 | 81 | <0.1% | KEEP/UNKNOWN; parameterize codec boundary pairs where fixtures are identical. |
| `unit/crypto` | 1 | 2 | <0.1% | KEEP/UNKNOWN; tiny independent known-vector cost. |
| `unit/db` | 21 | 211 | 6-9% | KEEP schema/migration/transaction oracles. MERGE repeated schema opens and the prefix-candidate pairs; cache schema bytes per worker. |
| `unit/docs` | 2 | 23 | <0.1% | KEEP/UNKNOWN; source-document guards are independent inputs. |
| `unit/domain` | 10 | 64 | ~0.1% | KEEP/UNKNOWN; merge branded-boundary tables where the constructor is shared. |
| `unit/duplicates` | 1 | 4 | <0.1% | KEEP/UNKNOWN; its subject is duplicate detection itself. |
| `unit/eligibility` | 2 | 9 | ~0.1% | KEEP: one sole-killer test; MERGE boundary rows inside `evaluate.test.ts`, preserving named invalid reasons. |
| `unit/grants` | 10 | 33 | <0.2% | KEEP: 8 sole-killer tests in `source-rule-reader-errors.test.ts`; merge only its formatter fixture construction. |
| `unit/licensing` | 1 | 8 | <0.1% | KEEP/UNKNOWN; legal/distribution oracle. |
| `unit/party` | 9 | 70 | <0.1% | KEEP/UNKNOWN; merge storage-adapter result matrices where the same fake is rebuilt. |
| `unit/pwa` | 6 | 31 | <0.1% | KEEP/UNKNOWN; build/manifest contracts are distinct from browser behavior. |
| `unit/queries` | 2 | 2 | <0.1% | KEEP; both integration-shaped SQL policies are mutation-covered. |
| `unit/r1-errors` | 16 | 159 | <0.5% | KEEP sole-killer rules formatter cases; MERGE all formatter siblings into typed `it.each` tables to avoid repeated imports/setup. |
| `unit/refusals` | 3 | 23 | <0.1% | KEEP/UNKNOWN; merge identical refusal envelope builders. |
| `unit/rpc` | 2 | 6 | ~0.1% | KEEP/UNKNOWN. |
| `unit/rules` | 36 | 645 | 1-2% | KEEP: 92 sole-killer tests across 7 files. Merge boundary matrices only; `sheet.test.ts`, attack cantrips/profiles, ability contributions, extra attack and multiclass proficiency are mutation locks. |
| `unit/sharing` | 7 | 87 | ~0.1% | KEEP/UNKNOWN; merge wire-version codec setup, never generated expectations. |
| `unit/simulation` | 39 | 430 | 5-7% | KEEP 254 sole-killer tests while code exists. D388 CUT only expected-value/request/route/fold tests whose production modules are deleted; relocate parser/evidence tests and their killers intact. |
| `unit/tools` | 13 | 137 | <0.2% | KEEP/UNKNOWN; merge filesystem/CLI fixture setup. |
| `unit/ui` | 33 | 444 | 3-4% | KEEP/UNKNOWN; MERGE repeated form-service DOM fixtures and use one parameterized render matrix where behavior is identical. |
| `unit/vtt` | 42 | 555 | <1% sampled | KEEP/UNKNOWN; these are the unified-engine/VTT semantic oracles. Mutation report coverage is not broad enough to cut any. |
| `integration` | 128 | 1,270 | 70-80% | Primary optimization target. KEEP all 62 sole-killer tests. MERGE/clone seeded images for authoring, builder, catalog, queries, rules and backup groups; do not share a mutable connection. |
| `parity` | 1 | 2 | <0.1% | KEEP: independent PHP/MVP parity until its subject is explicitly retired; no sole-kill data. |
| `browser` | 49 | 189 | separate, UNKNOWN | KEEP/UNKNOWN. Merge login/character/homebrew/VTT setup into worker-scoped fixtures; do not collapse distinct user journeys into unit assertions. |
| `contracts` | 0 | 0 | n/a | Not executable: `tests/contracts/party-storage-contract.ts` is a shared contract fixture. |
| `deep-link` | 1 | 2 | separate, UNKNOWN | KEEP/UNKNOWN; unique production-serving navigation seam. |
| `live` | 1 | 7 | opt-in, UNKNOWN | KEEP/UNKNOWN; real external CLI containment oracle, intentionally outside default timing. |
| `serving` | 1 | 1 | separate, UNKNOWN | KEEP/UNKNOWN; unique built-static serving check. |
| `types` | 5 | 0 | build-only, UNKNOWN | KEEP. These are positive compile-time regression oracles, not runtime re-assertions; e.g. `codec-required.type-test.ts` deliberately fails when codec parameters become optional. |
| `tools/sim` | 10 | 109 | separate, ~7 s | D388 conditional CUT old golden/draw/control-flow tests; migrate deterministic/resource/statistical semantics onto `src/combat`/analysis. `movement-adoption.test.ts` already tests the winner and stays. |
| `scripts/perf` | 1 | 1 | separate, UNKNOWN | KEEP/UNKNOWN; one explicit performance harness contract. |

## Top-20 cut list

Every item is one later-pass cut unit, ordered by confidence and likely avoided
work. All 20 are **D388 Stage-5 conditional**: delete only with the named old
implementation, after retained semantics have moved to shared-engine tests.
This avoids promoting mutation-UNKNOWN tests to CUT merely from appearance.

| # | Proposed cut | One-line reason / stronger replacement |
|---:|---|---|
| 1 | `tools/sim/golden-parity.test.ts` (whole file and `tools/sim/golden/*.json`) | Exact output and RNG-draw snapshots of deleted per-build control flow; D388 explicitly orders their retirement and replacement by reducer events/replay. |
| 2 | `tools/sim/deterministic.test.ts` “thrown Berserker … 49 draws” | Pins old loop draw count, not behavior; retain Rage/action/Vex semantics in `tests/unit/combat/*` and unified scenario events. |
| 3 | Same file, “thrown Open Hand … 11 draws” | Old branch-shape pin; unified engine event assertions are the stronger oracle. |
| 4 | Same file, “Hunter Nick … 32 draws” | Exact legacy RNG consumption is explicitly non-invariant under D388. |
| 5 | `tools/sim/gaps.test.ts` “Champion Savage Attacker … 23 draws” | Retire legacy draw census; keep one-per-turn Savage Attacker semantic coverage in shared combat. |
| 6 | Same file, “champion melee … expected draw map” | Tests loop ordering via consumption count; retained initiative/advantage/event behavior is stronger. |
| 7 | Same file, “championRanged … 13 draws” | Tests Vex carry through old loop bytes; migrate Vex state/event assertion, then cut. |
| 8 | Same file, “sorcwiz … 92 draws” | Innate Sorcery duration is valuable, exact old-board draw count is not. |
| 9 | `tools/sim/run.test.ts` default `N=2000` board-output test | Old CLI/board implementation is switched to unified batch API; test the new default once at its parser boundary. |
| 10 | Same file's four separate invalid-`N` tests | Replace with one `it.each(['not-a-number','0','-5','2'])`; identical subject/message/setup. |
| 11 | `tools/sim/identity.test.ts` byte-identical `monk(initManifest)` below L17 | Exact old result bytes are not an invariant; unified legal-action availability is stronger. |
| 12 | Same file's module-table non-mutation loop | Deletes with module-level old resource tables; unified encounter state/replay covers isolation. |
| 13 | `tests/unit/simulation/fold-enumeration.test.ts` (whole file) | Its expected-value fold engine is deleted; preserve independent enumeration only if retargeted to reducer outcome distributions. |
| 14 | `tests/unit/simulation/fold-composition.test.ts` (whole file) | Tests deleted analytical composition/result shapes; `src/combat` damage/save/event tests are the winner. It currently has sole-killer value, so cut only with production deletion. |
| 15 | Old request/route/headline cases in `tests/unit/simulation/contracts.test.ts` | Stage 4b replaces this surface, then Stage 5 deletes paths; new engine-backed app route tests supersede them. Six named sole-kill groups make the ordering mandatory. |
| 16 | Old expected-value-only cases in `tests/unit/simulation/probability.test.ts` | Delete analytical folds but migrate natural-1/20, critical, resistance and save-rounding cases to reducer statistics first; currently sole killers. |
| 17 | `tests/unit/simulation/type-contract.test.ts` imports of removed old paths | Replace with D388's exact TS2307 old-path removal probe plus new engine/analysis positive probes. |
| 18 | `tools/sim/gaps.test.ts` old `run.ts` CI/table-output test | Replace with unified batch/report tests: retain CI and common-random-number semantics, but cut assertions coupled to old board rows and formatting. |
| 19 | `tools/sim/deterministic.test.ts` old `homebrew.ts` exact three-round block | `tools/sim/homebrew.ts` is deleted; move each still-valid mechanic to shared combat/scenario events, then remove exact legacy trace/scalar assertions. |
| 20 | `tools/sim/srd-board.test.ts` “ranged/thrown posture identities have independent exact accounting” block | Exact results call deleted `sim.ts` build functions; replace with unified legal-action/event semantics and externally measured aggregate pins. |

## Merge groups

1. **Seeded authoring publishers.** `tests/integration/authoring/{species,
   background,subclass}-publisher.test.ts` build the same fresh schema and mostly
   the same bundled seed for 20/16/35 test declarations. Use a shared typed
   publisher fixture and clone `openSeededTestDatabase()` images. Keep the
   background complete-aggregate test (15 sole kills), the species exact
   retarget test (1), and the subclass levels/effects test (2) as separately
   named cases.
2. **Bundled installer cards.** The eight `it.each(v3MechanicsCards)` rows in
   `bundled-homebrew-installer.test.ts` each seed a database and install a small
   hidden catalog. Install the independent cards in one cloned seeded DB and
   parameterize projections; keep “Barbed Court … third-caster” isolated (19
   sole kills) and “ui-hidden … catalogs” isolated (3).
3. **Guided builder seed.** `tests/integration/builder/guided-{species,
   background,background-choices,abilities,equipment-step,skills-step,
   skill-grants,expertise-and-spells,creation}.test.ts` repeatedly construct
   application seed + character/source scaffolds. Clone a per-worker profile
   image and expose scenario builders; do not share connections. Existing logs
   put individual files at about 8-56 seconds.
4. **Character read models.** `tests/integration/queries/{character-sheet,
   character-sheet-resources,character-sheet-feature-values,
   character-sheet-spells,level-up-wizard,level-up-preview,
   list-and-workspace}.test.ts` should share one immutable seeded base and typed
   character factories. Preserve the 20 sole-killer tests across sheet,
   resources, spells, wizard and list/workspace as named cases.
5. **Catalog projector tables.** V1 source/stored/equipment projector tests in
   `tests/unit/catalog` and `tests/integration/catalog` rebuild equivalent
   definition/child rows. Move fixtures to one table-driven projector contract;
   expected aggregates remain hand-authored, never regenerated from output.
6. **Backup/share database pairs.** `tests/integration/backup/{portable-content,
   species-lineage-portability,round-trip,user-spells}.test.ts` and sharing
   round-trip/adversarial tests repeatedly open sender/recipient schemas. Cache
   schema/full/test-core bytes and clone two isolated images per case. The
   lineage file has four sole-killer tests (17 sole kills) and must not be
   collapsed into a smoke assertion.
7. **Formatter matrices.** `tests/unit/r1-errors/**` and
   `tests/unit/grants/source-rule-reader-errors.test.ts` repeat constructor and
   message setup. Convert siblings to typed `it.each` tables. Keep every current
   sole-killer row separately addressable for mutation mapping.
8. **Schema inventory.** `tests/unit/{schema,schema-relations,
   schema-autoincrement,schema-check-constraints,invariants}.test.ts` all open
   the same 150,793-byte schema. Use a per-worker schema image/connection
   factory and parameterized metadata tables. Do not merge generated-file
   freshness with live SQLite introspection: those are independent oracles.
9. **Compiler probes.** `declaration-emit.test.ts` (~15.1 seconds sampled) and
   the authoring negative probe in `authoring-contracts.test.ts` (~9.7 seconds
   file total) each spawn TypeScript. One probe project/invocation can emit the
   public declarations and collect the expected negative diagnostics, provided
   the assertions stay independent.
10. **Browser setup.** Homebrew authoring/import/publish specs, PHP parity specs,
    and VTT specs repeatedly establish app/database fixtures. Extend
    `tests/browser/fixtures/parallel-test.ts` with worker-scoped immutable setup
    and per-test storage reset. Merge setup, not journeys or accessibility
    assertions; runtime is UNKNOWN until a quiet-port baseline exists.

## Index and SQL recommendations

### Corrected current-state census

The premise that production has zero indexes is stale. TypeScript contains no
production `CREATE INDEX` string because DDL is generated, but
`src/db/schema.sql` currently contains **88 tables, 137 explicit indexes and 20
triggers**. It already includes the measured active-spell index and the four
relationship indexes at `src/db/schema.sql:759,1659-1661,1790`. The 2026-08-19
trial measured the slot reverse pair at -53.8%/-89.3%, source/state at -2.9%,
and parent traversal at -6.0%, while rejecting a `spell_loadouts(character_id)`
index that made endpoint latency 4% worse
(`docs/perf/2026-08-19-relationship-index-trials.md`). Do not add that rejected
index, and do not duplicate the landed ones.

### Remaining candidates (measure, then adopt only on endpoint wins)

| Priority | Table / columns | Query served | Expected effect / caution |
|---:|---|---|---|
| 1 | `wizard_spellbook_entries(spell_version_id, state, character_id, source_instance_id) WHERE spell_version_id IS NOT NULL` | Reverse arm in `src/catalog/catalog-importer.ts:1005-1023`; active membership in `src/access/spell-access-builder.ts:568-610,626-652` | Turns the remaining catalog reverse arm from scan to covering lookup and can cover membership. Write cost is a wide index; the character-first unique index still stays. |
| 2 | `spell_loadout_entries(spell_version_id, spell_loadout_id)` | Reverse arm in `catalog-importer.ts:1016-1018` and disclosure joins in `src/queries/character-{workspace-builder,catalog-disclosures}.ts` | Converts owner-first index scan to spell lookup. Measure because import checks are less frequent than reads. |
| 3 | `character_spell_preferences(spell_version_id, character_id)` | Final reverse arm in `catalog-importer.ts:1019-1021` | Converts character-first unique-index scan to covering spell lookup. Low absolute benefit likely; require scaled-corpus evidence. |
| 4 | `character_source_instances(character_id,state,source_type,display_name)` | Active-source listings in `spell-access-builder.ts:705-733` and related level-up/workspace reads | Extends the landed `(character_id,state)` prefix and can remove ordering work. Replace the shorter index only if writes and all consumers improve. |
| 5 | `character_skill_grants(character_id,source_instance_id,grant_key,ordinal)` and analogous expertise `(character_id,source_instance_id,granted_at_class_level,ordinal)` | Ordered resolution in `src/grants/skill-grants.ts:430-452,564-584` and `skill-expertise-grants.ts:130-150,281-301` | Removes temp ordering on grant-heavy characters. Two separate candidates; measure independently. |

The earlier rank-5 fingerprint proposal is no longer a candidate: the current
schema already has `catalog_content_fingerprints_content_key_index`
(`src/db/schema.sql:223`). The earlier rank-10 full catalog ordering index is
lower priority because the landed `(is_active,level,display_name)` index serves
interactive search; verify an actual full-browse endpoint before adding a
second spell-order index.

### Query rewrites before more indexes

1. **Eliminate ritual N+1.** `SpellAccessBuilder.wizardRoutes()` already selects
   `version.ritual` but then issues `SELECT EXISTS` on `spell_version_tags` for
   each legacy-false entry (`src/access/spell-access-builder.ts:626-673`). Add a
   projected `EXISTS`/join flag to the main entry query. Expected effect: up to
   one statement per spellbook entry removed; existing
   `(spell_version_id,tag)` uniqueness supplies the lookup.
2. **Short-circuit catalog references.** `CatalogImporter.#isReferenced()` uses
   one compound `UNION ALL` EXISTS across five arms
   (`src/catalog/catalog-importer.ts:1004-1025`). Once all reverse indexes are
   measured, use `EXISTS(...) OR EXISTS(...)` or independent early-return
   probes so SQLite can stop after the first hit and each arm has an obvious
   plan. Preserve exact reference semantics with an adversarial test for every
   arm.
3. **Batch projector child reads.** `spell-content-projector-v1.ts:565-570`
   executes six child-table queries for every spell. For bulk digest/import
   work, load each child table once for all requested version IDs and group in
   memory. This follows the landed spell-projection batch precedent recorded as
   250,677 to 35,798 family executions in
   `docs/perf/2026-08-19-trial-outcomes.md`.
4. **Reuse build-scoped decoded facts.** Do not reintroduce already-fixed N+1s:
   `spell-selection-eligibility.ts:95` batches version IDs, and
   `spell-access-builder.ts:408-477` now projects effective selection
   collection. Keep caches scoped to one build/read so writes cannot make them
   stale.

### Test database fixture efficiency

- `tests/helpers/open-db.ts:37-45` executes the complete 150 KB schema for every
  `openTestDatabase()` call. Static census: 133 calls across 96 test files.
  Cache one **schema-only exported byte image per worker** and clone its bytes
  for ordinary fresh DBs. Keep `applySchema:false`, schema lifecycle/migration,
  and DDL mutation tests on the real construction path.
- The right full-seed precedent already exists:
  `openSeededTestDatabase()` caches one schema+seed image per profile per worker
  and opens an isolated writable clone (`tests/helpers/open-db.ts:49-80`). It is
  used only 18 times across 15 files. Migrate seed-consuming tests—especially
  authoring publishers, bundled installer, class progression, guided species,
  catalog adoption and portable backup—to that helper where their subject is
  not `applicationSeed()` itself.
- Never cache/share a live mutable `Database` across files or tests. Cache
  bytes, clone bytes, then close each connection. This preserves transaction,
  rowid, foreign-key and order independence while avoiding schema/seed rebuilds.
- The design matches the existing `/tmp` spell-source parse cache in
  `tests/helpers/spell-source-parse-cache-global-setup.ts:53-141`: cache an
  immutable derivation keyed by all inputs, then revalidate/use isolated local
  state. For DB images, include schema bytes, seed profile and seed-code/content
  fingerprint in the key; a stale image must be a loud miss, never a fallback.

## Explicit risks and implementation gates

1. **Mutation-kill regression.** Before any non-D388 cut/merge, rerun the same
   mutation scope and prove every former sole-killed mutant is still killed by
   a retained named test. Test-name/ID remapping in Stryker means compare mutant
   location+replacement, not numeric test IDs. Current locks include 254
   `unit/simulation` and 62 integration sole-killer tests.
2. **D388 ordering.** Old sim tests become CUT only in the atomic Stage-5
   deletion. Parser/evidence/source-digest tests move and stay. Shared combat
   semantic tests and independently derived statistical controls must be green
   before old exact numbers/draw counts disappear.
3. **D280 history.** The earlier campaign requires zero unexplained survivors,
   and the post-merge bar is stricter for critical VTT modules. “Faster” is not
   an exclusion category. A merge that no longer kills a mutant is rejected or
   gets a new independently falsifiable oracle; never regenerate expectations
   from production output (`docs/perf/2026-08-19-d280-campaign-report.md`).
4. **Database isolation.** Image caching can hide schema/seed freshness bugs if
   keyed incompletely, or leak tests if the exported `Uint8Array` is not copied.
   Preserve `.slice()` on both cached export and each open, and keep explicit
   construction tests outside the cache.
5. **Index write cost and WASM memory.** Existing relationship trials measured
   +8.7% for 1,000 writes with four candidates. Every new index needs endpoint
   latency, full-scan/VM-step, bytes and alternating-order write measurements;
   EXPLAIN improvement alone is insufficient.
6. **Timing uncertainty.** Per-section shares mix historical revisions and
   targeted logs; browser is unmeasured. After the mutation lane and D388 work
   are quiet, capture one verbose default Vitest run, one tools/sim run, and one
   browser run as the implementation baseline before selecting the final cut.
