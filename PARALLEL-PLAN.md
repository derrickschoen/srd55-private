# Static-app parallel execution plan

Status: dependency-aware parallel execution partition for `BUILD-PLAN.md`. It preserves
all 25 increments' scope and exit criteria but, as requested, supersedes their serial
numeric execution order with the explicit dependency graph below.

## 1. Non-negotiable execution rules

1. `app/Domain/`, `database/migrations/`, `database/seeders/`, `tests/`, and the
   existing Vue screens are read-only parity or presentation oracles. No static-port
   session may modify them. `static-app/` remains gitignored and must not be committed.
2. The launcher must finish a wave, stop all of its writers, and run its serial gate
   before starting the next wave. A dependency means the depended-on wave is green, not
   merely that its files happen to exist.
3. Ownership is per file, not per directory. A session may create or edit only the exact
   files assigned to its chunk below. It may read any completed file. It may not create
   barrel files, manifests, shared fixtures, or “small helper” files outside its list.
4. Wave 0 starts only after the current increment-1/schema writer has stopped. B00 adopts
   the then-current files; it does not replace completed schema work. The observed
   starting point on 2026-07-23 is 38 `CREATE TABLE`s, 23 named indexes, two triggers,
   the sqlite-wasm spike, and no `BUILD-PROGRESS.md`.
5. Only B00 may change `schema.sql`, dependency/config files, shared domain contracts,
   database primitives, the Worker dispatcher/registry, or the UI bootstrap/router.
   If a later chunk discovers a required change to one of those files, it stops and
   records a change request. The launcher schedules a B00-owner maintenance pass alone
   between waves, then reruns affected gates. The requesting chunk never edits the file.
6. Dependencies are frozen after B00. No parallel chunk runs `npm install`, edits a
   package/tsconfig/Vite/Vitest/Playwright file, or changes a lockfile.
7. Parallel sessions may run only targeted Vitest files that they own, with
   `STATIC_APP_CACHE_DIR=/tmp/static-app-<chunk>/vite` and
   `TMPDIR=/tmp/static-app-<chunk>/tmp`; B00 configures Vite/Vitest to honor the first
   variable. Snapshot creation/update is forbidden. They must not import
   `src/worker/registry.ts`, `src/db/worker.ts`, `src/ui/app.ts`, or `src/main.ts`, and
   must not start a dev server, run `tsc -b`, make a production build, or run Playwright
   concurrently. Those operations can discover half-written convention modules or
   write shared caches, `*.tsbuildinfo`, `dist/`, `test-results/`, or browser state.
   Full tests/builds/registry/UI discovery/Playwright are serial wave gates after every
   writer and process in the wave has stopped.
8. Every behavior test must be sensitivity-proven: green; deliberately revert or bypass
   the production behavior; observe failure at the intended assertion; restore; green.
   Persistence behavior asserts stored rows/constraints, not only report or UI output.
   Each chunk records the exact commands, mutation, failing assertion, and restored run
   in its owned `progress/<id>.md`. No sensitivity mutation occurs during parallel
   authoring. At the barrier the launcher stops all writers/test processes, resumes
   exactly one production-file owner, performs failure/restore/clean-diff verification,
   then moves to the next owner.
9. Parallel chunks do not edit `BUILD-PROGRESS.md`. The B00 owner is resumed alone after
   every wave to copy immutable completed progress shards into separately labelled
   BUILD-PLAN increment sections; provisional evidence is labelled but not marked green
   until every exit criterion is available. This is an explicit integration point
   required to preserve the existing per-increment evidence contract without concurrent
   append corruption.
10. Reviews and integration fixes respect ownership. A reviewer reports findings; the
    original owner is resumed to patch its files. A wave integrator never “quick-fixes”
    another chunk's file.
11. Every medium/high-complexity chunk receives a fresh read-only reviewer after its
    writer stops. Read-only reviews may run concurrently. The launcher then schedules a
    disjoint correction subwave (or B00 alone for shared files), reruns the reviewer with
    rejection rationale, and stops after consensus or three rounds. A wave is not green
    until its reviews are resolved.

### Ordering interpretation and increment checkpoints

The old table is serially numbered, but a safe parallel port needs a dependency partial
order. In particular, the PHP generator constructor requires eligibility, and
`SpellAccessBuilder` requires the generator's active-rule behavior; blindly retaining
5-before-6 or 7-before-5 would require disposable stubs or later shared rewrites. This
plan therefore moves prerequisites earlier while retaining every exit criterion:

| BUILD-PLAN increment | Owner/checkpoint |
|---|---|
| 1–2 | B00, two separately green/evidenced checkpoints |
| 3 | R10 |
| 4 | G10 |
| 5 | G20 |
| 6 | E10 |
| 7 | A30 |
| 8 | D10 |
| 9 | R40 |
| 10 | P50 |
| 11 | V10 |
| 12 | C41 implementation; checkpoint closes only after X50 verifies persisted audit effects |
| 13 | C42 |
| 14 | C43 |
| 15–16 | X50, two separately green/evidenced checkpoints |
| 17 | Q60 |
| 18 | C20 |
| 19 | B20 |
| 20 | U70 |
| 21 | U71 |
| 22 | U72 |
| 23 | T80 |
| 24 | T81 |
| 25 | S90 |

At each wave gate every owner contributes its unique targeted suite and sensitivity
proof, followed by one full serial `npm test` integration gate (plus the required
browser suite for persistence increments). The full result is referenced by each
concurrently completed increment, while targeted assertions/mutations provide
checkpoint attribution; repeating an identical full run is not treated as independent
evidence.

## 2. Backbone — Wave 0, one serial session

### B00 — schema, contracts, storage, composition skeletons

**Purpose.** Finish BUILD-PLAN increments 1–2 as the shared, frozen substrate. Preserve
and verify the current 38-table schema against all migrations, including the final
selection-eligibility and subclass/operation/simplified-Wizard state, assignment CHECK,
two exact ABORT triggers, indexes, unique constraints, composite foreign keys/actions,
and defaults. Add typed synchronous SQLite primitives, transactions, codecs, all shared
domain enums/DTOs/command payload unions, and stable Worker/UI composition contracts.
Keep every SQLite engine call synchronous inside the Worker and enable foreign keys for
every connection. B00 also completes dependency/config setup needed by every later
chunk; no later install is allowed.

**PHP oracle.**

- All ten files in `database/migrations/`.
- `app/Domain/Catalog/CatalogSource.php`.
- `app/Domain/Characters/{SelectionEligibility,SlotState,SourceType}.php`.
- `app/Domain/Grants/{FreeCastPoolScope,FreeCastRecovery,GrantRuleKind,SlotBucket}.php`.
- `app/Domain/Rules/{Ability,CastingMode,EffectReliabilityCategory,RulesEdition}.php`.
- `app/Domain/Spells/DuplicateCategory.php`.
- `tests/Feature/{SchemaConstraintsTest,StackHealthTest,WizardPreparationUpgradeMigrationTest,WizardSpellbookSimplificationMigrationTest}.php`.
- `resources/js/types.ts` is the read-only presentation-contract cross-check.

**Exact owned files.**

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `vitest.config.ts`
- `playwright.config.ts`
- `index.html`
- `src/vite-env.d.ts`
- `src/main.ts`
- `src/db/schema.sql`
- `src/db/database.ts`
- `src/db/query.ts`
- `src/db/codecs.ts`
- `src/db/transaction.ts`
- `src/db/database-lifecycle.ts`
- `src/domain/enums.ts`
- `src/domain/models.ts`
- `src/domain/command-contracts.ts`
- `src/domain/read-models.ts`
- `src/rpc/protocol.ts`
- `src/rpc/client.ts`
- `src/worker/handler.ts`
- `src/worker/registry.ts`
- `src/worker/handlers/system.ts`
- `src/db/worker.ts`
- `src/ui/screen.ts`
- `src/ui/router.ts`
- `src/ui/app.ts`
- `src/ui/dom.ts`
- `src/ui/styles/base.css`
- `docs/RPC-CONTRACT.md`
- `tests/helpers/open-db.ts`
- `tests/helpers/rpc-harness.ts`
- `tests/unit/schema.test.ts`
- `tests/unit/invariants.test.ts`
- `tests/unit/db/database-lifecycle.test.ts`
- `tests/unit/rpc/registry.test.ts`
- `tests/browser/persistence.spec.ts`
- `tests/browser/database-lifecycle.spec.ts`
- `BUILD-PROGRESS.md`
- `progress/B00.md`

**Stable interfaces frozen by the B00 gate.**

- `DatabaseContext` owns the one Worker-local synchronous database and exposes typed
  `exec`, `one`, `all`, `scalar`, and nested-safe `transaction` operations.
- `DatabaseLifecycle` freezes whole-database byte export, temporary in-memory
  validation, failure-safe OPFS replacement, close/reopen, foreign-key re-enable, and
  recovery semantics. B00 proves replacement and rollback across a reload before B20 is
  allowed to consume it; B20 implements format/product policy, not connection surgery.
- Shared enums, command payloads, row/read models, `RpcRequest`, `RpcResponse`,
  `CommandImplementation`, `RpcError`, `RpcClient`, `HandlerContext`, `RpcHandler`, and
  `ScreenModule` are complete and compile-tested before parallel work starts.
- The contracts contain no global command-handler or query-method union that later
  chunks must extend. Method-specific params/results live beside their handler and are
  exposed through a typed client wrapper owned by that same chunk.
- Tests may import `tests/helpers/open-db.ts` and `tests/helpers/rpc-harness.ts`, but may
  not edit them. Slice-specific factories live in slice-owned test files.
- `system.inspectRows` is available only in non-production builds, accepts a frozen
  allow-list of table names plus equality filters, and returns cloned row DTOs. Browser
  tests use it to assert persisted state; the production build registry test proves the
  method is absent.
- Vite/Vitest cache location is derived from `STATIC_APP_CACHE_DIR`; B00 tests the
  per-chunk override and installs every dependency later slices need.

## 3. Parallel chunks by wave

Oracle files may appear in more than one chunk because they are read-only. Owned files
must never appear twice.

### Wave 1 — independent foundations after B00

#### R10 — rules value objects and slot math

**Scope.** Port abilities/scores/modifiers, attack/save values, bounded spell levels,
progression behavior, proficiency, class progression lookup, per-class
round-before-sum caster contributions, shared multiclass slots, Pact slots, and property
cases. **Dependencies:** B00 only.

**PHP oracle:** all files in `app/Domain/Rules/`; `database/seeders/ClassProgressionSeeder.php`;
`tests/Unit/{DomainTypesTest,MulticlassSlotsTest,RulesPropertyTest}.php`;
`tests/Feature/{ClassProgressionSeederTest,SubclassProgressionTest,PactApexSeederTest}.php`.

**Exact owned files:** `src/rules/ability-score.ts`,
`src/rules/ability-scores.ts`, `src/rules/attack-bonus.ts`,
`src/rules/save-dc.ts`, `src/rules/spell-level.ts`,
`src/rules/progression-type.ts`, `src/rules/caster-contribution.ts`,
`src/rules/spell-slots.ts`, `src/rules/proficiency.ts`,
`src/rules/class-progression-lookup.ts`,
`tests/unit/rules/value-objects.test.ts`,
`tests/unit/rules/multiclass-slots.test.ts`,
`tests/unit/rules/properties.test.ts`,
`tests/integration/rules/class-progression.test.ts`, `progress/R10.md`.

#### G10 — grant-rule DSL

**Scope.** Parse, normalize, validate, and serialize all six actual PHP rule kinds
(`fixed_spell`, `choice_from_list`, `choice_from_query`, `spellbook_acquisition`,
`capability`, `grant_source`), including source-config activation and free-cast/pool
metadata. The older BUILD-PLAN wording “choice_from_school”/“nested_source” maps to the
PHP names above; do not invent a seventh/eighth kind. **Dependencies:** B00 only.

**PHP oracle:** `app/Domain/Grants/{FreeCast,FreeCastPoolScope,FreeCastRecovery,GrantRule,GrantRuleKind,SlotBucket}.php`;
`tests/Unit/GrantRuleTest.php`; grant-rule assertions in
`tests/Feature/GuardCoverageTest.php`; `database/seeders/ContentDefinitionSeeder.php`.

**Exact owned files:** `src/grants/free-cast.ts`, `src/grants/grant-rule.ts`,
`tests/unit/grants/grant-rule.test.ts`, `progress/G10.md`.

#### E10 — selection eligibility and eligible search

**Scope.** Evaluate and persist `valid`, `invalid`, or `unselected`; enforce active
catalog version, edition/legacy, list, school, tag, level, and collection predicates;
refresh retained selections; perform literal, stable, capped eligible search; and port
direct selection service ownership/active guards. **Dependencies:** B00 only.

**PHP oracle:** `app/Domain/Spells/{SpellSelectionEligibility,SpellSelectionService}.php`;
`app/Domain/Characters/EligibleSpellSearch.php`;
`tests/Feature/CharacterWorkspaceTest.php`; G1/G2/G3 eligibility cases in
`tests/Feature/GuardCoverageTest.php`; A2/A3 in
`tests/Feature/Api/CharacterWriteSurfaceAbuseTest.php`.

**Exact owned files:** `src/eligibility/spell-selection-eligibility.ts`,
`src/eligibility/eligible-spell-search.ts`,
`src/eligibility/spell-selection-service.ts`,
`tests/unit/eligibility/evaluate.test.ts`,
`tests/unit/eligibility/search.test.ts`,
`tests/integration/eligibility/persistence.test.ts`, `progress/E10.md`.

#### D10 — duplicate detection

**Scope.** Classify same-version wasteful/intentional overlap and cross-version
conflicts by spell identity, preserve same-name/different-identity separation, sort the
complete contract, calculate severity/explanation, and reproduce deterministic SHA-256
warning fingerprints. Acknowledgement persistence belongs to C43. **Dependencies:** B00
only; tests use route DTO fixtures, not A30.

**PHP oracle:** `app/Domain/Spells/{DuplicateCategory,DuplicateWarningDetector}.php`;
`tests/Unit/DuplicateWarningDetectorTest.php`; duplicate fixtures in
`tests/Feature/BuildReportTest.php`.

**Exact owned files:** `src/duplicates/duplicate-warning-detector.ts`,
`tests/unit/duplicates/detector.test.ts`, `progress/D10.md`.

#### V10 — command validation and integrity

**Scope.** Validate the closed command payload union, reject unknown/ill-typed fields,
validate every enum/mode and restore row, canonicalize nested objects, and sign/verify
destructive inverse payloads with deterministic Web Crypto HMAC-SHA-256 behavior.
Command construction/execution is later. **Dependencies:** B00 only.

**PHP oracle:** `app/Domain/Characters/Commands/{CharacterCommandPayloadValidator,CharacterCommandIntegrity}.php`;
`tests/Unit/CharacterCommandPayloadValidatorTest.php`;
`tests/Feature/{CharacterCommandIntegrityTest,CharacterCommandFactoryTest}.php`; A1/A5
in `tests/Feature/Api/CharacterWriteSurfaceAbuseTest.php`.

**Exact owned files:** `src/commands/payload-validator.ts`,
`src/commands/canonical-json.ts`, `src/commands/integrity.ts`,
`tests/unit/commands/payload-validator.test.ts`,
`tests/unit/commands/integrity.test.ts`, `progress/V10.md`.

#### S10 — character state capture/restore/diff

**Scope.** Capture every restorable table, validate snapshot version/ownership/row
shape/active spell references before deletion, restore atomically with IDs/timestamps,
and produce deterministic row diffs. **Dependencies:** B00 only.

**PHP oracle:** `app/Domain/Characters/CharacterState.php`;
state/snapshot/save-point cases in `tests/Feature/CharacterWorkspaceTest.php`; A5 cases
in `tests/Feature/Api/CharacterWriteSurfaceAbuseTest.php`.

**Exact owned files:** `src/character/character-state.ts`,
`tests/integration/character/state.test.ts`, `progress/S10.md`.

**Wave-1 zero-dependency check.** R10, G10, E10, D10, V10, and S10 import only B00
contracts/primitives. None imports another Wave-1 owned path.

### Wave 2 — independent storage slices

#### G20 — grant-rule slot generator

**Scope.** Read active class/subclass/static/progression rules and transactionally
materialize/reconcile stable keyed slots, nested sources, capabilities, and simplified
Wizard acquisitions. Preserve/reactivate IDs and selections, orphan removed structures
with exact reasons/prior config, enforce distinct configurable sources, and refresh
persisted eligibility. **Dependencies:** B00, G10, E10.

**PHP oracle:** `app/Domain/Grants/GrantRuleSlotGenerator.php`;
`app/Domain/Characters/SourceType.php`;
`tests/Feature/GrantRuleSlotGeneratorTest.php`; generator/revalidation cases in
`tests/Feature/{CharacterWorkspaceTest,GuardCoverageTest}.php`;
`database/seeders/{ClassProgressionSeeder,ContentDefinitionSeeder}.php`.

**Exact owned files:** `src/grants/grant-rule-slot-generator.ts`,
`src/grants/source-rule-reader.ts`,
`tests/integration/grants/slot-generator.test.ts`,
`tests/integration/grants/nested-sources.test.ts`,
`tests/integration/grants/wizard-acquisitions.test.ts`, `progress/G20.md`.

#### C20 — catalog JSON import

**Scope.** Document and validate browser JSON, merge identities/aliases/edition
versions, import optional Tier-2 text, sync all publications/pivots, preserve referenced
metadata, tombstone/reactivate absent records, refresh affected selections, support
dry-run diff, and roll back on any record error. Export a typed `catalog.*` client and
self-registering handler module. **Dependencies:** B00, E10.

**PHP oracle:** `app/Domain/Catalog/{CatalogImporter,CatalogSource}.php`;
`app/Console/Commands/CatalogImportCommand.php`; `tests/Feature/CatalogImportTest.php`;
catalog removal cases in `tests/Feature/GuardCoverageTest.php`;
`database/migrations/2026_07_21_000100_create_catalog_tables.php`.

**Exact owned files:** `src/catalog/catalog-importer.ts`,
`src/catalog/catalog-schema.ts`, `src/catalog/catalog-normalize.ts`,
`src/catalog/client.ts`, `src/worker/handlers/catalog.ts`,
`docs/CATALOG-IMPORT.md`, `tests/unit/catalog/schema.test.ts`,
`tests/integration/catalog/import.test.ts`,
`tests/browser/catalog-import.spec.ts`, `progress/C20.md`.

#### B20 — database and portable character backup

**Scope.** Version, export, validate, and atomically import a complete SQLite database
and a portable per-character document containing sources, slots, spellbook,
preferences, overrides, acknowledgements, and save points. Preserve user content and
reject incompatible/corrupt/cross-character data before writes. Export a typed
`backup.*` client and self-registering handler module. **Dependencies:** B00, S10.

**PHP oracle:** `app/Domain/Characters/CharacterState.php`; snapshot/save-point cases in
`tests/Feature/CharacterWorkspaceTest.php`; all character/catalog migrations define the
data contract. BUILD-PLAN increment 19 is authoritative where PHP has no backup feature.

**Exact owned files:** `src/backup/backup-version.ts`,
`src/backup/database-backup.ts`, `src/backup/character-backup.ts`,
`src/backup/client.ts`, `src/worker/handlers/backup.ts`,
`docs/BACKUP-FORMATS.md`, `tests/unit/backup/validation.test.ts`,
`tests/integration/backup/round-trip.test.ts`,
`tests/browser/backup.spec.ts`, `progress/B20.md`.

**Wave-2 zero-dependency check.** G20, C20, and B20 depend on different completed
Wave-1 outputs. None imports another Wave-2 owned path.

### Wave 3 — spell access after grant generation

#### A30 — spell-access and route builder

**Scope.** Port assignment hydration plus prepared/known/fixed/free-cast/capability/
Wizard ritual routes, casting math, route-key deduplication, source ability resolution,
and `kept_override`. Exclude inactive versions even when eligibility is stale. The
grant generator's completed active-rule reader is a real dependency, so A30 is
deliberately not parallel with G20. **Dependencies:** B00, R10, G10, G20.

**PHP oracle:** `app/Domain/Spells/{SpellAccessBuilder,SpellSlotAssignment,SpellSlotAssignmentFactory,FixedSpellGrant,UserSpellSelection,UnassignedSpellSlot}.php`;
access/ritual/inactive-route cases in
`tests/Feature/{BuildReportTest,GrantRuleSlotGeneratorTest,GuardCoverageTest}.php`;
`tests/Unit/DomainTypesTest.php`.

**Exact owned files:** `src/access/spell-slot-assignment.ts`,
`src/access/spell-slot-assignment-factory.ts`,
`src/access/spell-access-builder.ts`, `src/access/route-key.ts`,
`tests/unit/access/assignment.test.ts`,
`tests/unit/access/route-key.test.ts`,
`tests/integration/access/spell-access.test.ts`, `progress/A30.md`.

### Wave 4 — independent consumers of routes

C41–C43 jointly form the requested “13 commands” domain slice. They are split only at
the existing BUILD-PLAN 12/13/14 boundary so each owns disjoint implementation/test
files and receives an independent checkpoint/review.

#### C41 — commands 1–5: ability and four slot modes

**Scope.** Implement `apply`/`inverse` for `update_ability` and `set_slot` select, clear,
keep-override, and restore. Enforce ownership, lock, active/eligibility, exact orphan
reason, prior state/timestamps, revalidation on inverse, and persisted audit-diff
inputs. **Dependencies:** B00, V10, E10.

**PHP oracle:** `app/Domain/Characters/Commands/{UpdateAbilityCommand,SetSlotCommand}.php`;
ability/slot/undo cases in `tests/Feature/CharacterWorkspaceTest.php`; slot inverse and
ownership cases in `tests/Feature/{GuardCoverageTest,Api/CharacterWriteSurfaceAbuseTest}.php`.

**Exact owned files:** `src/commands/update-ability.ts`,
`src/commands/set-slot/shared.ts`, `src/commands/set-slot/select.ts`,
`src/commands/set-slot/clear.ts`, `src/commands/set-slot/keep-override.ts`,
`src/commands/set-slot/restore.ts`,
`tests/integration/commands/ability-and-slot.test.ts`, `progress/C41.md`.

#### C42 — commands 6–9: rules and sources

**Scope.** Implement `apply`/`inverse` for `update_character_rules`,
`update_source_config`, `add_source`, and `remove_source`, including regeneration,
nested sources, configurable-source validation, stable orphan/reactivation behavior,
snapshot inverse, and atomic rollback. **Dependencies:** B00, V10, S10, G20, E10.

**PHP oracle:** `app/Domain/Characters/Commands/{UpdateCharacterRulesCommand,UpdateSourceConfigCommand,AddSourceCommand,RemoveSourceCommand}.php`;
rules/config/add/remove/nested cases in
`tests/Feature/{CharacterWorkspaceTest,GuardCoverageTest}.php`; source ownership cases in
`tests/Feature/Api/CharacterWriteSurfaceAbuseTest.php`.

**Exact owned files:** `src/commands/update-character-rules.ts`,
`src/commands/update-source-config.ts`, `src/commands/add-source.ts`,
`src/commands/remove-source.ts`,
`tests/integration/commands/rules-and-sources.test.ts`, `progress/C42.md`.

#### C43 — commands 10–13: warnings, class, and snapshot restore

**Scope.** Implement `apply`/`inverse` for warning acknowledge/delete, `update_class`,
and `restore_snapshot`, including live warning validation/fingerprint ownership,
acknowledgement invalidation, subclass/class constraints, regeneration, active snapshot
references, stable restored rows, and atomic rollback. **Dependencies:** B00, V10, S10,
G20, A30, D10.

**PHP oracle:** `app/Domain/Characters/Commands/{AcknowledgeWarningCommand,UpdateClassCommand,RestoreSnapshotCommand}.php`;
warning/class/snapshot cases in `tests/Feature/{CharacterWorkspaceTest,GuardCoverageTest}.php`;
restore/integrity abuse cases in
`tests/Feature/Api/CharacterWriteSurfaceAbuseTest.php`.

**Exact owned files:** `src/commands/acknowledge-warning.ts`,
`src/commands/delete-warning-acknowledgement.ts`,
`src/commands/update-class.ts`, `src/commands/restore-snapshot.ts`,
`tests/integration/commands/warnings-class-and-snapshot.test.ts`,
`progress/C43.md`.

#### R40 — build-report builder

**Scope.** Build the exact character/caster summary, independently rounded
contributions, shared and Pact pools, source sections, spellbook/preparation split,
access routes, duplicate warnings/acknowledgements, invalid selections, preparation
callout, and deterministic order. Assert that building is read-only. **Dependencies:**
B00, R10, A30, D10.

**PHP oracle:** `app/Domain/Reports/BuildReportBuilder.php`;
`tests/Feature/{BuildReportTest,SubclassProgressionTest,PactApexSeederTest}.php`;
`database/seeders/{SeedCharacterSeeder,PactApexSeeder}.php`.

**Exact owned files:** `src/reports/build-report-builder.ts`,
`src/reports/build-report-ordering.ts`,
`tests/integration/reports/build-report.test.ts`,
`tests/integration/reports/build-report-fixture.ts`, `progress/R40.md`.

**Wave-4 zero-dependency check.** C41, C42, C43, and R40 share only B00/earlier-wave
contracts. No command chunk imports another command chunk, and R40 imports no command
implementation.

### Wave 5 — independent execution and printable consumers

#### X50 — command factory, revision executor, and command RPC

**Scope.** Construct all thirteen variants, run the validated command in one
transaction, enforce expected revision, UUID idempotency and cross-character replay
guards, support the narrowly allowed stale-slot merge, persist inverse command and
grouped audit rows, increment once, and roll back completely. Export typed
`commands.execute` client/handler without editing the registry. **Dependencies:** B00,
V10, S10, C41, C42, C43.

**PHP oracle:** `app/Domain/Characters/{CharacterCommandExecutor,RevisionConflict}.php`;
`app/Domain/Characters/Commands/CharacterCommandFactory.php`;
`app/Http/Controllers/CharacterMutationController.php`;
`tests/Feature/{CharacterCommandFactoryTest,CharacterCommandIntegrityTest,CharacterWorkspaceTest,GuardCoverageTest}.php`;
A1/A4/A5 in `tests/Feature/Api/CharacterWriteSurfaceAbuseTest.php`.

**Exact owned files:** `src/commands/character-command-factory.ts`,
`src/commands/character-command-executor.ts`,
`src/commands/revision-conflict.ts`, `src/commands/audit-log.ts`,
`src/commands/client.ts`, `src/worker/handlers/commands.ts`,
`tests/integration/commands/executor.test.ts`,
`tests/integration/commands/idempotency.test.ts`,
`tests/browser/command-rpc.spec.ts`, `progress/X50.md`.

#### P50 — printable-list builder

**Scope.** Build reference/full printable data with grouping, route annotations,
mechanically relevant stats, free-cast wording, facts/descriptions, rituals, Wizard
prepared/ritual-only states, long-rest swap sections, completeness degradation, and
deterministic ordering. **Dependencies:** B00, A30, R40.

**PHP oracle:** `app/Domain/Reports/PrintableSpellListBuilder.php`;
`tests/Feature/PrintableSpellListTest.php`; `resources/js/pages/Characters/Print.vue` as
the read-only presentation oracle.

**Exact owned files:** `src/reports/printable-spell-list-builder.ts`,
`src/reports/printable-ordering.ts`,
`tests/integration/reports/printable-list.test.ts`,
`tests/integration/reports/printable-list-fixture.ts`, `progress/P50.md`.

**Wave-5 zero-dependency check.** X50 does not import printable/report files; P50 does
not import command/executor files.

### Wave 6 — serial query/read-model RPC composition

#### Q60 — character/catalog/workspace/report/history query RPC

**Scope.** Port character list/workspace builders and expose typed methods for character
and catalog CRUD/read operations, eligible spells, save points, build reports,
printable data, and operation/history queries. Return DTOs only; never leak sqlite-wasm
objects. This is one chunk because the query handler and its client surface are a shared
integration point used by every UI screen. **Dependencies:** B00, E10, R40, X50, P50.

**PHP oracle:** `app/Domain/Characters/{CharacterListBuilder,CharacterWorkspaceBuilder,EligibleSpellSearch}.php`;
`app/Http/Controllers/{CharacterController,EligibleSpellController,SavePointController,BuildReportController,CharacterPrintController}.php`;
list/workspace/query cases in `tests/Feature/CharacterWorkspaceTest.php`;
`tests/Feature/BuildReportTest.php`.

**Exact owned files:** `src/queries/character-list-builder.ts`,
`src/queries/character-workspace-builder.ts`,
`src/queries/character-crud.ts`, `src/queries/catalog-queries.ts`,
`src/queries/save-points.ts`, `src/queries/operation-history.ts`,
`src/queries/client.ts`, `src/worker/handlers/queries.ts`,
`tests/integration/queries/list-and-workspace.test.ts`,
`tests/integration/queries/crud-and-history.test.ts`,
`tests/integration/queries/rpc.test.ts`, `progress/Q60.md`.

### Wave 7 — three independent UI screen plugins

Every screen exports a `ScreenModule` from its own `screen.ts`. It uses only the frozen
B00 router/DOM APIs and completed typed clients. It must not import another Wave-7
screen. Styles are slice-local.

#### U70 — application shell and character list

**Scope.** Implement the home/application frame, durable-storage status, character
create/open/delete, catalog import and database/character backup entry points, loading,
empty, confirmation, and error states. **Dependencies:** B00, C20, B20, Q60.

**PHP/presentation oracle:** `app/Domain/Characters/CharacterListBuilder.php`;
`app/Http/Controllers/CharacterController.php`;
`tests/Feature/{StackHealthTest,CharacterWorkspaceTest}.php`;
`resources/js/components/AppShell.vue`; `resources/js/pages/Characters/Index.vue`.

**Exact owned files:** `src/ui/screens/character-list/screen.ts`,
`src/ui/screens/character-list/character-list.ts`,
`src/ui/screens/character-list/import-backup-controls.ts`,
`src/ui/screens/character-list/styles.css`,
`tests/unit/ui/character-list.test.ts`,
`tests/browser/character-list.spec.ts`, `progress/U70.md`.

#### U71 — spreadsheet-grid planner

**Scope.** Port the workspace grid, class/ability/rules/source editors, filters,
eligible spell picker, invalid/orphan/override flows, undo/redo/save points, warnings,
dice helper, responsive layout, and keyboard/focus behavior. It consumes the report DTO
but not U72's presentation. **Dependencies:** B00, X50, Q60.

**PHP/presentation oracle:** `app/Domain/Characters/CharacterWorkspaceBuilder.php`;
`tests/Feature/CharacterWorkspaceTest.php`;
`resources/js/pages/Characters/Workspace.vue`;
`resources/js/components/{SpellCombobox,BuildReportPanel,DiceRoller}.vue`;
`resources/js/stores/character.ts`; `resources/js/lib/{dice.ts,dice.test.mjs}`.

**Exact owned files:** `src/ui/screens/planner/screen.ts`,
`src/ui/screens/planner/planner-grid.ts`,
`src/ui/screens/planner/editors.ts`,
`src/ui/screens/planner/spell-picker.ts`,
`src/ui/screens/planner/history.ts`,
`src/ui/screens/planner/warnings.ts`, `src/ui/screens/planner/dice.ts`,
`src/ui/screens/planner/styles.css`, `tests/unit/ui/planner.test.ts`,
`tests/unit/ui/dice.test.ts`, `tests/browser/planner.spec.ts`,
`progress/U71.md`.

#### U72 — report and print screens

**Scope.** Render build report and both printable modes, exact incomplete-data warning,
source/route/duplicate annotations, and accessible print CSS without mutating state.
**Dependencies:** B00, Q60.

**PHP/presentation oracle:** `app/Domain/Reports/{BuildReportBuilder,PrintableSpellListBuilder}.php`;
`tests/Feature/{BuildReportTest,PrintableSpellListTest}.php`;
`resources/js/pages/{BuildReport.vue,Characters/Print.vue}`;
`resources/js/components/BuildReportPanel.vue`.

**Exact owned files:** `src/ui/screens/build-report/screen.ts`,
`src/ui/screens/build-report/build-report.ts`,
`src/ui/screens/build-report/styles.css`,
`src/ui/screens/print/screen.ts`, `src/ui/screens/print/printable-list.ts`,
`src/ui/screens/print/styles.css`, `tests/unit/ui/reports.test.ts`,
`tests/browser/reports-and-print.spec.ts`, `progress/U72.md`.

**Wave-7 zero-dependency check.** U70, U71, and U72 share only B00 APIs and completed
clients. Their source, CSS, unit tests, browser tests, and evidence shards are disjoint.

### Wave 8 — independent parity-test ports

#### T80 — complete PHP Unit parity audit

**Scope.** Re-base all 57 evaluated PHP Unit cases onto TS value objects and synchronous
SQLite boundaries. Maintain a case-by-case mapping, add only missing cross-slice tests
in this owned parity file, and identify the exact production mutations needed to prove
each material branch. T80 never edits production: after the parallel T80/T81 authors
stop, the launcher resumes each production owner alone to perform/restore the mutation
while running T80's test. After restoration and a clean diff, T80 is resumed alone to
record the owner, command, intended assertion failure, restoration, and final green run
in T80's own map/shard; earlier owner shards remain immutable. **Dependencies:** all
B00–Q60 domain/storage chunks.

**PHP oracle:** every file in `tests/Unit/` plus the domain classes each test imports.

**Exact owned files:** `tests/parity/php-unit-parity.test.ts`,
`tests/parity/PHP-UNIT-MAP.md`, `tests/parity/PHP-UNIT-SENSITIVITY.md`,
`progress/T80.md`.

#### T81 — selected 28 feature-to-e2e workflows

**Scope.** Re-base the selected 28 end-to-end workflows on Worker RPC plus stored OPFS
state: mutations, reports, import, both backups, reload, revision/concurrency, and UI
flows. Each mutation checks persisted state through a test-only RPC query supplied by
the B00 harness, never only the rendered view. Do not edit production or other tests;
findings and sensitivity mutations return to owners in the same serial post-authoring
protocol as T80, and T81 alone records the resulting evidence in its owned map/shard.
**Dependencies:** all implementation chunks through U72.

**PHP oracle:** selected cases in every `tests/Feature/` file, with primary coverage from
`CharacterWorkspaceTest.php`, `BuildReportTest.php`, `PrintableSpellListTest.php`,
`CatalogImportTest.php`, `GuardCoverageTest.php`, and
`Api/CharacterWriteSurfaceAbuseTest.php`.

**Exact owned files:** `tests/browser/php-feature-parity.spec.ts`,
`tests/browser/fixtures/php-parity.ts`, `tests/parity/PHP-FEATURE-MAP.md`,
`tests/parity/PHP-FEATURE-SENSITIVITY.md`, `progress/T81.md`.

**Wave-8 zero-dependency check.** T80 does not import T81 fixtures/files; T81 does not
import T80. Both test completed production only.

**Fixed T81 workflow manifest (exactly 28).** T81 may not substitute a different case
without a control-plan revision performed before its writer starts.

1. `CharacterWorkspaceTest.php` — “serves the seeded character list and editable workspace”
2. `CharacterWorkspaceTest.php` — “builds the complete character list card contract in deterministic order”
3. `CharacterWorkspaceTest.php` — “builds the complete workspace editing contract for the seeded character”
4. `CharacterWorkspaceTest.php` — “returns an exact eligible-spell DTO and treats wildcard characters literally”
5. `CharacterWorkspaceTest.php` — “captures every restorable character table and reports exact state differences”
6. `CharacterWorkspaceTest.php` — “creates and opens an empty character without additional setup”
7. `CharacterWorkspaceTest.php` — “changes one slot while leaving every other slot byte-identical”
8. `CharacterWorkspaceTest.php` — “undo restores the prior spell selection”
9. `CharacterWorkspaceTest.php` — “clears, overrides, and reselects a slot with exact persisted state”
10. `CharacterWorkspaceTest.php` — “round-trips a named save point through the mutation path”
11. `CharacterWorkspaceTest.php` — “changing an ability score recomputes only mechanically relevant casting math”
12. `CharacterWorkspaceTest.php` — “returns the exact mutation envelope, inverse, operation, and reversible audit contract”
13. `CharacterWorkspaceTest.php` — “adding a class level generates new slots without disturbing existing slots”
14. `CharacterWorkspaceTest.php` — “undoes a structural class change through its snapshot inverse”
15. `CharacterWorkspaceTest.php` — “rejects stale revisions and replays an operation idempotently”
16. `CharacterWorkspaceTest.php` — “round-trips character rules and rejects legacy selection while legacy rules are disabled”
17. `CharacterWorkspaceTest.php` — “round-trips source configuration with one audit group and rejects unsupported Magic Initiate lists”
18. `CharacterWorkspaceTest.php` — “updates a standalone Magic Initiate source and regenerates its slot constraints”
19. `CharacterWorkspaceTest.php` — “adds a class source through the command with its level, DSL slots, and spellbook atomically”
20. `CharacterWorkspaceTest.php` — “adds species and background roots with nested Magic Initiate chains and rejects non-repeatable duplicates”
21. `CharacterWorkspaceTest.php` — “removes a root source through the command and cascades to its nested feat”
22. `CharacterWorkspaceTest.php` — “round-trips warning acknowledgement with idempotent replay and grouped audit rows”
23. `CharacterWorkspaceTest.php` — “merges a stale slot edit only when intervening operations left that slot untouched”
24. `BuildReportTest.php` — “builds the golden read-only report values and duplicate classifications”
25. `PrintableSpellListTest.php` — “builds Mutt printable sources with complete facts and only the mechanically relevant number”
26. `CatalogImportTest.php` — “imports the real index into identities versions publications and normalized pivots idempotently”
27. Static-only increment 19 — whole-database and portable-character export/import round-trip, corrupt-version rollback, and reload
28. Static-only increment 25 — fresh-profile catalog import → create/use → export → reload durability journey

### Wave 9 — final serial audit and evidence aggregation

#### S90 — full parity/durability audit

**Scope.** With no other writer running, run Unit + all browser/e2e suites, typecheck,
production build, fresh-profile import/use/export/reload, schema metadata diff,
oracle-coverage check, accessibility smoke, and final sensitivity review. Verify B00's
already-aggregated progress evidence against every immutable shard. If a failure
requires code/test changes, stop S90, resume the owning chunk alone, then rerun S90; S90
never edits the owner's file.
**Dependencies:** every prior chunk.

**Oracle:** `BUILD-PLAN.md`, all migrations, all `app/Domain/`, all PHP tests, the
selected Vue presentation files, and every progress shard.

**Exact owned files:** `PARITY-AUDIT.md`, `progress/S90.md`.

## 4. RPC registry integration protocol

The registry collision is removed by convention rather than by concurrent manifest
editing:

1. B00 alone owns `src/worker/registry.ts`. It eagerly discovers
   `./handlers/**/*.ts` using Vite `import.meta.glob`.
2. Every discovered module exports a named `handlers` array. Each entry is created with
   B00's `defineRpcHandler(method, validateParams, handle)` and therefore has a method
   string, runtime parameter validator, and synchronous-DB `HandlerContext`.
3. B00 owns `system.*`; C20 owns `catalog.*`; B20 owns `backup.*`; X50 owns
   `commands.execute`; Q60 owns `queries.*`. Their exact handler filenames are in the
   ownership map. A chunk adds methods only inside its one owned handler module.
4. Registry startup sorts modules by path, rejects duplicate method names, and builds a
   read-only map. Unknown methods and invalid params return the frozen structured error
   envelope. The Worker owns initialization/reset/lifecycle and supplies the single
   foreign-key-enabled database context to every handler.
5. `RpcClient.call<P, R>(method, params)` is the stable transport. Each handler-owning
   chunk exports a typed wrapper from its own client file. There is intentionally no
   shared global method union or handwritten import list to update.
6. `tests/unit/rpc/registry.test.ts` proves discovery and duplicate rejection. The B00
   gate also proves that adding a temporary convention-compliant handler makes it
   callable without modifying registry/Worker/client. The temporary file is removed
   before B00 completes.
7. During a parallel wave, chunks test their handler module directly and never import or
   start the registry/Worker. Because eager discovery would include a peer's
   partially-written module, the registry and dev server are exercised only at the
   serial barrier after all handler writers/processes have stopped.

The UI uses the analogous B00-owned `src/ui/app.ts` glob for
`./screens/**/screen.ts`. Each U70–U72 chunk contributes unique screen modules without
editing `main.ts`, the router, or a screen manifest. UI chunks unit-test their own
render functions directly; no chunk imports/starts the glob-owning app until the Wave-7
serial gate.

## 5. File-ownership map and explicit integration points

The lists below are exhaustive for planned source, test, documentation, and evidence
files. There are no implied directory or wildcard rights.

| Owner | Files |
|---|---|
| B00 | `package.json`; `package-lock.json`; `tsconfig.json`; `tsconfig.app.json`; `tsconfig.node.json`; `vite.config.ts`; `vitest.config.ts`; `playwright.config.ts`; `index.html`; `src/vite-env.d.ts`; `src/main.ts`; `src/db/schema.sql`; `src/db/database.ts`; `src/db/query.ts`; `src/db/codecs.ts`; `src/db/transaction.ts`; `src/db/database-lifecycle.ts`; `src/domain/enums.ts`; `src/domain/models.ts`; `src/domain/command-contracts.ts`; `src/domain/read-models.ts`; `src/rpc/protocol.ts`; `src/rpc/client.ts`; `src/worker/handler.ts`; `src/worker/registry.ts`; `src/worker/handlers/system.ts`; `src/db/worker.ts`; `src/ui/screen.ts`; `src/ui/router.ts`; `src/ui/app.ts`; `src/ui/dom.ts`; `src/ui/styles/base.css`; `docs/RPC-CONTRACT.md`; `tests/helpers/open-db.ts`; `tests/helpers/rpc-harness.ts`; `tests/unit/schema.test.ts`; `tests/unit/invariants.test.ts`; `tests/unit/db/database-lifecycle.test.ts`; `tests/unit/rpc/registry.test.ts`; `tests/browser/persistence.spec.ts`; `tests/browser/database-lifecycle.spec.ts`; `BUILD-PROGRESS.md`; `progress/B00.md` |
| R10 | `src/rules/ability-score.ts`; `src/rules/ability-scores.ts`; `src/rules/attack-bonus.ts`; `src/rules/save-dc.ts`; `src/rules/spell-level.ts`; `src/rules/progression-type.ts`; `src/rules/caster-contribution.ts`; `src/rules/spell-slots.ts`; `src/rules/proficiency.ts`; `src/rules/class-progression-lookup.ts`; `tests/unit/rules/value-objects.test.ts`; `tests/unit/rules/multiclass-slots.test.ts`; `tests/unit/rules/properties.test.ts`; `tests/integration/rules/class-progression.test.ts`; `progress/R10.md` |
| G10 | `src/grants/free-cast.ts`; `src/grants/grant-rule.ts`; `tests/unit/grants/grant-rule.test.ts`; `progress/G10.md` |
| E10 | `src/eligibility/spell-selection-eligibility.ts`; `src/eligibility/eligible-spell-search.ts`; `src/eligibility/spell-selection-service.ts`; `tests/unit/eligibility/evaluate.test.ts`; `tests/unit/eligibility/search.test.ts`; `tests/integration/eligibility/persistence.test.ts`; `progress/E10.md` |
| D10 | `src/duplicates/duplicate-warning-detector.ts`; `tests/unit/duplicates/detector.test.ts`; `progress/D10.md` |
| V10 | `src/commands/payload-validator.ts`; `src/commands/canonical-json.ts`; `src/commands/integrity.ts`; `tests/unit/commands/payload-validator.test.ts`; `tests/unit/commands/integrity.test.ts`; `progress/V10.md` |
| S10 | `src/character/character-state.ts`; `tests/integration/character/state.test.ts`; `progress/S10.md` |
| G20 | `src/grants/grant-rule-slot-generator.ts`; `src/grants/source-rule-reader.ts`; `tests/integration/grants/slot-generator.test.ts`; `tests/integration/grants/nested-sources.test.ts`; `tests/integration/grants/wizard-acquisitions.test.ts`; `progress/G20.md` |
| C20 | `src/catalog/catalog-importer.ts`; `src/catalog/catalog-schema.ts`; `src/catalog/catalog-normalize.ts`; `src/catalog/client.ts`; `src/worker/handlers/catalog.ts`; `docs/CATALOG-IMPORT.md`; `tests/unit/catalog/schema.test.ts`; `tests/integration/catalog/import.test.ts`; `tests/browser/catalog-import.spec.ts`; `progress/C20.md` |
| B20 | `src/backup/backup-version.ts`; `src/backup/database-backup.ts`; `src/backup/character-backup.ts`; `src/backup/client.ts`; `src/worker/handlers/backup.ts`; `docs/BACKUP-FORMATS.md`; `tests/unit/backup/validation.test.ts`; `tests/integration/backup/round-trip.test.ts`; `tests/browser/backup.spec.ts`; `progress/B20.md` |
| A30 | `src/access/spell-slot-assignment.ts`; `src/access/spell-slot-assignment-factory.ts`; `src/access/spell-access-builder.ts`; `src/access/route-key.ts`; `tests/unit/access/assignment.test.ts`; `tests/unit/access/route-key.test.ts`; `tests/integration/access/spell-access.test.ts`; `progress/A30.md` |
| C41 | `src/commands/update-ability.ts`; `src/commands/set-slot/shared.ts`; `src/commands/set-slot/select.ts`; `src/commands/set-slot/clear.ts`; `src/commands/set-slot/keep-override.ts`; `src/commands/set-slot/restore.ts`; `tests/integration/commands/ability-and-slot.test.ts`; `progress/C41.md` |
| C42 | `src/commands/update-character-rules.ts`; `src/commands/update-source-config.ts`; `src/commands/add-source.ts`; `src/commands/remove-source.ts`; `tests/integration/commands/rules-and-sources.test.ts`; `progress/C42.md` |
| C43 | `src/commands/acknowledge-warning.ts`; `src/commands/delete-warning-acknowledgement.ts`; `src/commands/update-class.ts`; `src/commands/restore-snapshot.ts`; `tests/integration/commands/warnings-class-and-snapshot.test.ts`; `progress/C43.md` |
| R40 | `src/reports/build-report-builder.ts`; `src/reports/build-report-ordering.ts`; `tests/integration/reports/build-report.test.ts`; `tests/integration/reports/build-report-fixture.ts`; `progress/R40.md` |
| X50 | `src/commands/character-command-factory.ts`; `src/commands/character-command-executor.ts`; `src/commands/revision-conflict.ts`; `src/commands/audit-log.ts`; `src/commands/client.ts`; `src/worker/handlers/commands.ts`; `tests/integration/commands/executor.test.ts`; `tests/integration/commands/idempotency.test.ts`; `tests/browser/command-rpc.spec.ts`; `progress/X50.md` |
| P50 | `src/reports/printable-spell-list-builder.ts`; `src/reports/printable-ordering.ts`; `tests/integration/reports/printable-list.test.ts`; `tests/integration/reports/printable-list-fixture.ts`; `progress/P50.md` |
| Q60 | `src/queries/character-list-builder.ts`; `src/queries/character-workspace-builder.ts`; `src/queries/character-crud.ts`; `src/queries/catalog-queries.ts`; `src/queries/save-points.ts`; `src/queries/operation-history.ts`; `src/queries/client.ts`; `src/worker/handlers/queries.ts`; `tests/integration/queries/list-and-workspace.test.ts`; `tests/integration/queries/crud-and-history.test.ts`; `tests/integration/queries/rpc.test.ts`; `progress/Q60.md` |
| U70 | `src/ui/screens/character-list/screen.ts`; `src/ui/screens/character-list/character-list.ts`; `src/ui/screens/character-list/import-backup-controls.ts`; `src/ui/screens/character-list/styles.css`; `tests/unit/ui/character-list.test.ts`; `tests/browser/character-list.spec.ts`; `progress/U70.md` |
| U71 | `src/ui/screens/planner/screen.ts`; `src/ui/screens/planner/planner-grid.ts`; `src/ui/screens/planner/editors.ts`; `src/ui/screens/planner/spell-picker.ts`; `src/ui/screens/planner/history.ts`; `src/ui/screens/planner/warnings.ts`; `src/ui/screens/planner/dice.ts`; `src/ui/screens/planner/styles.css`; `tests/unit/ui/planner.test.ts`; `tests/unit/ui/dice.test.ts`; `tests/browser/planner.spec.ts`; `progress/U71.md` |
| U72 | `src/ui/screens/build-report/screen.ts`; `src/ui/screens/build-report/build-report.ts`; `src/ui/screens/build-report/styles.css`; `src/ui/screens/print/screen.ts`; `src/ui/screens/print/printable-list.ts`; `src/ui/screens/print/styles.css`; `tests/unit/ui/reports.test.ts`; `tests/browser/reports-and-print.spec.ts`; `progress/U72.md` |
| T80 | `tests/parity/php-unit-parity.test.ts`; `tests/parity/PHP-UNIT-MAP.md`; `tests/parity/PHP-UNIT-SENSITIVITY.md`; `progress/T80.md` |
| T81 | `tests/browser/php-feature-parity.spec.ts`; `tests/browser/fixtures/php-parity.ts`; `tests/parity/PHP-FEATURE-MAP.md`; `tests/parity/PHP-FEATURE-SENSITIVITY.md`; `progress/T81.md` |
| S90 | `PARITY-AUDIT.md`; `progress/S90.md` |

**Existing immutable/excluded paths.** `BUILD-PLAN.md`, `SPIKE-NOTES.md`, and this
`PARALLEL-PLAN.md` are control inputs and are not execution-chunk write targets.
`node_modules/`, `dist/`, `test-results/`, `playwright-report/`, coverage output, and
`*.tsbuildinfo` are generated artifacts, not owned source. `node_modules/.vite/`,
`.vitest/`, Vite/Vitest transform caches, and test snapshots are included in this rule.
Parallel targeted tests use their chunk-specific `/tmp` cache only and may not update
snapshots. Shared generated paths may be written only by the serial wave gate and may be
deleted/rebuilt only there.

**Flagged integration points.**

- Schema/database primitives/shared enums and DTOs: B00 only.
- Dependencies and every tool config/lockfile: B00 only.
- Worker initialization, dispatch, and handler discovery: B00 only; handler modules are
  directory-discovered and slice-owned.
- UI entrypoint/router/screen discovery/base CSS: B00 only; screens and screen CSS are
  slice-owned.
- Query RPC surface: Q60 is intentionally a single later chunk.
- Command construction/revision/RPC: X50 is intentionally a single later chunk.
- `BUILD-PROGRESS.md`: B00 only and updated by that owner at serial wave gates; chunks
  write disjoint shards.
- Full build, Playwright output, OPFS browser database, and TypeScript build info:
  serial wave gates only.

## 6. Concurrency manifest for the launcher

The following is the machine-facing launch order. A driver must paste the named chunk's
scope, oracle, dependencies, and exact owned-file list from sections 2–3 into its
session prompt, plus the global rules.

1. **Wave 0 — `[B00]` (serial).** Complete/adopt the schema and build the frozen shared
   TS/database/RPC/UI foundation, including byte-level database lifecycle. Own only the
   B00 paths in the ownership map. Gate: separate increment-1 and increment-2 evidence,
   schema metadata/constraint tests, lifecycle replacement/rollback, RPC registry
   convention test, persistence reload, `npm test`, `npm run build`, then browser tests
   alone.
2. **Wave 1 — `[R10, G10, E10, D10, V10, S10]` (six concurrent sessions).**
   R10 ports rule values/slot math; G10 ports the grant DSL; E10 ports eligibility,
   refresh/search/selection; D10 ports duplicate classification/fingerprints; V10 ports
   payload validation/integrity; S10 ports character snapshot state. Each session owns
   exactly its row in the ownership map and depends only on B00. Gate: targeted and full
   Unit/integration tests, then build; resume owners alone for sensitivity evidence.
3. **Wave 2 — `[G20, C20, B20]` (three concurrent sessions).** G20 implements stable
   transactional grant materialization; C20 implements catalog JSON import plus its
   client/handler/docs; B20 implements whole-database and portable-character backup plus
   its client/handler/docs. They own their map rows and have no same-wave imports. Gate:
   full Unit/integration/build, then the three owned browser specs serially against fresh
   browser profiles.
4. **Wave 3 — `[A30]` (serial dependency bridge).** Port assignment and spell-access
   route construction after G20 is stable. Own only A30 paths. Gate: access tests, full
   Unit/integration, build, and sensitivity proof.
5. **Wave 4 — `[C41, C42, C43, R40]` (four concurrent sessions).** C41 implements
   commands 1–5, C42 commands 6–9, C43 commands 10–13, and R40 the read-only build
   report. They share only completed contracts/dependencies, never command source files.
   Gate: checkpoint-specific targeted/sensitivity evidence for increments 9, 13, and 14
   plus provisional increment-12 implementation evidence; then one full serial
   integration test/build. Do not mark increment 12 green yet because audit persistence
   does not exist until X50.
6. **Wave 5 — `[X50, P50]` (two concurrent sessions).** X50 implements command
   factory/revision/idempotency/audit plus its RPC module; P50 implements printable data.
   They have no same-wave import. Gate: checkpoint-specific tests for increment 10,
   increment 12's now-persisted command audit effects, and increments 15/16; then one
   full serial integration/build, X50 browser RPC alone, and serialized sensitivity
   passes. Only this gate closes increment 12.
7. **Wave 6 — `[Q60]` (serial integration surface).** Build all query/read-model
   operations and their single typed RPC client/handler. Own only Q60 paths. Gate:
   query/integration tests, full test/build, registry discovery check, sensitivity.
8. **Wave 7 — `[U70, U71, U72]` (three concurrent sessions).** U70 builds list/shell/
   import-backup UI, U71 the planner, U72 report/print. Each adds only convention-loaded
   screens and local CSS/tests; no UI chunk imports another. Gate: Unit/build first,
   then each owned browser spec serially with a fresh profile; run keyboard/print
   sensitivity checks while each owner is resumed alone.
9. **Wave 8 — `[T80, T81]` (two concurrent sessions).** T80 audits/ports all PHP Unit
   cases into its one parity test/map; T81 ports the selected 28 workflows into its
   browser parity test/fixture/map. Neither edits production or the other's tests. Gate:
   Unit parity, then browser parity alone, then sensitivity evidence review.
10. **Wave 9 — `[S90]` (serial).** Verify aggregated evidence and perform the full parity,
    durability, schema, build, accessibility, fresh-profile, and sensitivity audit.
    Own only `PARITY-AUDIT.md` and `progress/S90.md`; verify the B00-owned
    `BUILD-PROGRESS.md` and route every needed fix back to the prior file owner before
    rerunning.

At each gate the launcher should mechanically compare all files changed/created by a
session with that chunk's ownership row. Any unexpected path is a hard failure even if
tests pass. It then runs one fresh read-only review per medium/high-complexity chunk,
routes accepted findings back to owners, reruns up to three rounds, executes sensitivity
mutations one owner at a time with all other processes stopped, and finally resumes B00
alone to append that wave's increment-labelled evidence to `BUILD-PROGRESS.md`.
