# Static TypeScript Port Build Progress

## 2026-07-23 — Increment 1: Complete final SQLite schema

Status: done

### Files

- Added `BUILD-PLAN.md`: 25 ordered, independently verifiable increments for
  the complete static port.
- Replaced the Phase-1 slice in `src/db/schema.sql` with the final state of all
  migrations: 38 tables, exact ordered columns/types/nullability/defaults,
  all 59 stable named indexes (including unique indexes), primary/unique
  constraints, foreign keys/actions, final Wizard and eligibility shapes, the
  defense-in-depth assignment CHECK, and both assignment triggers.
- Added `tests/unit/schema.test.ts`: four metadata and persisted-state tests.

### Oracle verification

- Ran the actual Laravel migrations through ddev against an in-memory SQLite
  database, then compared every `PRAGMA table_info` field and every named index
  to the WASM schema. Final comparison result: `[]` (no differences).
- The comparison exposed and led to fixes for primary-key nullability, stable
  unique-index names, three eligibility-column positions, boolean declared
  types/default literals, and three framework column types.

### Tests

- `npm test`: 2 files, 8 Unit tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- `npm run test:browser`: 1 Playwright e2e passed in Chromium, including OPFS
  reload persistence and Worker-enforced trigger/foreign-key guards.

### Sensitivity transitions

- Green → removed `NOT NULL` from `users.id` → inventory test failed at
  `NOT NULL columns for users` (missing `id`) → restored → green.
- Green → renamed `users_email_unique` → index test failed at the exact named
  index map → restored → green.
- Green → changed parent-source `ON DELETE SET NULL` to `CASCADE` → foreign-key
  metadata test failed on the action and persisted-state test failed because
  the child row was deleted instead of retained with a null parent → restored
  → green.
- Earlier pre-oracle checks also observed table-inventory and collection-index
  renames fail at their exact assertions.

### Review

- Self-review round 1 found significant parity gaps that the first tests did
  not cover: unnamed unique indexes, nullable primary-key metadata, and wrong
  final eligibility-column order. All were fixed; the metadata hash/nullability
  and exact named-index assertions were added.
- Fresh `codex exec --sandbox read-only` was attempted twice but failed before
  creating a session (`~/.codex/installation_id`: read-only filesystem).
- The repository-prescribed Claude fallback was attempted three ways (normal,
  bounded, and files-on-stdin/no-tools); each timed out without findings.
- Completed external reviewer rounds: 0. Unresolved code findings: none known.
  Unresolved infrastructure finding: no separate reviewer could complete in
  this managed filesystem. No reviewer result was invented or rejected.

Codex session id: `019f90fd-91eb-72f0-a629-74d1f9ec8183`

## 2026-07-23 — Increment 2: Catalog and persistence primitives

Status: done

### Files

- Added the synchronous `DatabaseContext` query API, strict row/boolean/JSON
  codecs, nested-safe transactions, and reusable in-memory test database/RPC
  harnesses.
- Added byte export, read-only candidate validation, recoverable OPFS replacement,
  reset, close/reopen, and per-connection foreign-key setup.
- Froze the PHP enum values, database/domain rows, command payload union,
  presentation read models, open-ended RPC envelopes/client/handlers, and
  discovery-based Worker/UI composition contracts.
- Added the non-production persisted-row inspector, Worker request serialization,
  base application shell, tool/cache configuration, and RPC documentation.

### Tests

- `npm test`: 4 files, 18 Unit tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- `npm run test:browser`: 2 Playwright tests passed.
- Browser assertions read stored `characters` rows before and after reload/image
  replacement; lifecycle Unit tests likewise assert the reopened stored rows.

### Sensitivity transitions

- Green → `encodeBoolean(true)` persisted `0` → codec test failed at stored
  `allowLegacy: false` → restored.
- Green → bypassed transaction/savepoint wrappers → nested row remained and outer
  failed row remained → both persisted-state assertions failed → restored.
- Green → bypassed image replacement/recovery → replacement retained the discarded
  row and injected failure did not reject → restored.
- Green → bypassed candidate prevalidation → invalid-image test failed because the
  live connection was unnecessarily replaced → restored.
- Green → removed registry sorting/duplicate rejection/discovery dispatch and
  production inspection gating → all four registry assertions failed → restored.
- Green → enabled SAH-pool `clearOnInit` → reload assertion received no stored
  character → restored.
- Green → bypassed lifecycle replacement in the Worker → browser assertion retained
  the row that should have been removed by image replacement → restored.
- Restored full Unit, build, and browser suites passed.

### Review

- Self-review found and fixed the worktree's external read-only `node_modules`
  serving/cache issue, serialized Worker requests around async lifecycle operations,
  candidate validation before closing the live connection, production exclusion of
  `system.inspectRows`, defensive cloning of rows/bytes, and an eager-registry import
  in the reusable RPC harness that could discover peer modules during parallel work.
- The user explicitly requested self-critique and prohibited spawning Codex; no
  external agent was launched. Unresolved findings: none known.

## 2026-07-23 — Integrated Wave 0 review

### Increment 1 review evidence

- Independently reviewed `2c4d00c3a1fc3614b1995d00bb5d3d86adf993ad..HEAD`.
  The merged path inventory is wholly B00-owned.
- Rechecked the 38-table schema, column metadata hash, defaults, named/unnamed
  uniqueness, foreign-key shapes/actions, CHECK, triggers, and persisted cascade,
  SET NULL, and rejection behavior against the ten migration and four feature-test
  oracles. No unresolved schema-parity gap remains.

### Increment 2 review evidence

- Fixed row-contract parity: both persisted `caster_fraction` values are strings
  (`1`, `1/2`, or `1/3`), and `orphaned_by_change_group_id` is numeric.
- Fixed lifecycle validation that previously accepted structurally altered SQLite
  images when their table/trigger inventory remained present. Replacement now checks
  the complete normalized table/index/trigger schema before closing the live database.
- Added persisted lifecycle coverage proving a real exported image with a dropped
  column is rejected while the original connection and character row remain intact.
- Final verification: `npm test` — 4 files, 19 tests passed; `npm run build` passed;
  `npm run test:browser` — 2 Chromium tests passed; `git diff --check` passed.

### Increment 2 sensitivity evidence

- Green → bypassed the complete-schema signature guard → targeted lifecycle test
  failed at `rejects.toThrow` because replacement resolved → restored → targeted
  lifecycle/invariant run passed (11 tests).
- Green → encoded `true` as SQLite `0` → codec persistence test failed at the exact
  stored `allowLegacy` assertion (`false` received) → restored → full Unit, build,
  and browser gates passed.

## 2026-07-23 — Integrated Wave 1 review

### Review increment W1-R1

- Independently reviewed `6b9d164d2ff046eb77fad026c138a7ed6be545ae..HEAD`
  across R10, G10, E10, D10, V10, and S10 against every cited PHP domain,
  seeder, Unit, Feature, and abuse-test oracle.
- Rechecked assertion sensitivity, SQLite-backed invariants, deterministic ordering
  and fingerprints, active-catalog guards, cross-character ownership, and atomic
  snapshot restore. No unresolved parity or ownership finding remains.
- Fixed the one discovered integration defect: V10's hexadecimal decoder exposed
  `Uint8Array<ArrayBufferLike>` to Web Crypto and failed the TypeScript build.
  Returning its concrete `ArrayBuffer` preserves runtime behavior and satisfies the
  `BufferSource` contract.

### Test increment W1-T1

- `npm test`: 13 files, 131 tests passed.
- Programmatic Vitest Integration include: 3 files, 83 tests passed, including all
  persisted class progression, eligibility, and character-state cases.
- `npm run build`: TypeScript and Vite production build passed after the V10 fix.
- Focused integrity verification: 1 file, 4 tests passed.

### Sensitivity increment W1-S1

- Green → removed eligible-search character ownership from the slot lookup → the
  cross-character test failed at its intended `toThrow` assertion → restored →
  targeted test passed.
- Green → bypassed `CharacterState`'s restore transaction → the injected ID conflict
  left changed metadata and deleted child rows, failing the exact persisted-state
  rollback equality → restored → targeted Integration test passed.

## 2026-07-23 — Integrated Wave 2 review

### Review increment W2-R1

- Independently reviewed
  `a0d7fdda053508710d0a06f889208aedde02ec70..HEAD` for G20, C20, and B20 against
  every cited PHP domain, migration, seeder, Feature test, and `BUILD-PLAN.md`.
  The merged path inventory contains only chunk-owned files.
- Rechecked stable grant/source reconciliation, persisted eligibility and orphan
  history, catalog reference preservation/activity refresh, dry-run atomicity,
  complete-image recovery, portable ownership/reference remapping, and RPC
  discovery. No unresolved parity, persistence, assertion, or ownership finding
  remains.
- Fixed B20 save-point portability: cyclic historical source graphs are now
  rejected during document validation, and valid save-point sources are
  canonicalized parent-first before persistence. Previously, a child-first
  document imported but its retained save point later failed foreign-key checks
  during `CharacterState.restore()`.

### Test increment W2-T1

- `npm test`: 15 files, 140 Unit tests passed.
- Programmatic Vitest Integration include: 5 owned files, 19 tests passed.
- `npm run build`: TypeScript and production Vite build passed.
- Owned browser verification: 2 Chromium tests passed.
- `git diff --check` passed; generated build/test artifacts were removed.

### Sensitivity increment W2-S1

- Green → bypassed historical source-cycle validation → the targeted backup Unit
  test failed at its exact `toThrow` assertion → restored → targeted test passed.
- Green → preserved incoming child-first save-point source order → the Integration
  test failed at the persisted snapshot assertion because row 0 was the child
  instead of the mapped parent → restored → targeted test passed.

## 2026-07-23 — Integrated Wave 3 review

### Review increment W3-R1

- Independently reviewed
  `53e8f0242468dd0b193a44f9ccede11dd286afc5..HEAD` for A30 against every
  cited PHP domain, Unit, Feature, and guard oracle. The merged path inventory
  contains only A30-owned files.
- Rechecked assignment exclusivity, live eligibility, active source/version
  filters, `kept_override`, casting modes/math, source ability resolution,
  Wizard ritual suppression, route provenance, deduplication, and read-only
  SQLite behavior. No unresolved implementation parity finding remains.
- Strengthened insensitive tests to isolate every route-key field and pin routes
  to exact persisted slot, source, spell-version, and spellbook-entry IDs. Added
  SQLite coverage for subclass ability lookup, proficiency override, cantrip
  casting precedence, and the oracle's non-Wizard prepared-ritual overlap.

### Test increment W3-T1

- Focused access verification: 2 Unit files, 4 tests passed; 1 Integration file,
  4 SQLite tests passed.
- `npm test`: 17 files, 144 Unit tests passed.
- Programmatic Vitest Integration include: 9 files, 106 tests passed.
- `npm run build`: TypeScript and production Vite build passed.
- `git diff --check` passed; no generated artifact or sensitivity mutation
  remains in the worktree.

### Sensitivity increment W3-S1

- Green → omitted `source_instance_id` from route identity → the isolated
  `source instance` assertion failed → restored → targeted Unit test passed.
- Green → disabled subclass-definition ability lookup → the persisted subclass
  test received null ability/modifier/attack/DC at its exact route assertion →
  restored → targeted Integration test passed.

## 2026-07-23 — Integrated Wave 4 review

### Review increment W4-R1

- Independently reviewed
  `cb8402c1d63cbbd7c388e2e8e81c8d61d7fe5fb8..HEAD` for C41, C42, C43, and R40
  against every named PHP command, report, Feature, guard, abuse, progression,
  and seeder oracle. The merged path inventory contains only chunk-owned files.
- Rechecked persisted ownership and locks, active eligibility, orphan diagnostics,
  timestamps and prior state, signed/revalidated inverses, audit-diff inputs,
  source/class regeneration and rollback, warning fingerprints/invalidation,
  snapshot reference validation, deterministic report ordering, slot pools,
  Wizard splits, acknowledgements, invalid selections, and exact callouts.
- No unresolved implementation parity or ownership finding remains. Strengthened
  R40's insensitive coverage by asserting all base-class abilities/subclass values
  and hashing every persisted SQLite table (including `sqlite_sequence`) before
  and after report construction instead of only character-owned rows.

### Test increment W4-T1

- Focused Wave 4 Integration run: 4 files, 25 tests passed.
- `npm test`: 17 files, 144 Unit tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- `git diff --check` passed.

### Sensitivity increment W4-S1

- Green → removed the base-class spellcasting-ability fallback → the golden report
  failed at the new exact Paladin/Ranger/Warlock/Wizard ability assertion →
  restored → targeted test passed.
- Green → introduced a write to `class_definitions` during report construction →
  the expanded whole-database read-only hash assertion failed → restored →
  targeted test passed.

## 2026-07-23 — Integrated Wave 5 review

### Review increment W5-R1

- Independently reviewed
  `058d3f7427f6c648c15cd445dfeb30ea74d00be0..HEAD` for X50 and P50 against
  every named PHP executor, factory, conflict, controller, printable builder,
  Vue, Feature, guard, and abuse oracle. The merged path inventory contains only
  chunk-owned files.
- Rechecked all thirteen factory variants, validation/integrity boundaries,
  synchronous transactional writes, revision/replay ordering, cross-character
  UUID rejection, exact-slot stale merges, signed/persisted inverses, grouped
  audit rows, RPC persistence/reload, printable grouping/facts/stats/modes,
  Wizard splits, long-rest exclusions, text degradation, and read-only behavior.
- No unresolved implementation parity or ownership finding remains. Strengthened
  insensitive assertions for distinct per-operation audit groups, exact
  persisted signed slot inverses, group-level casting stats, persisted spell
  IDs/edition, and the complete Wizard explanation.

### Test increment W5-T1

- Focused Wave 5 Integration run: 3 files, 12 tests passed.
- `npm test`: 33 files, 287 tests passed.
- `npm run typecheck`: passed.
- Owned Chromium RPC verification: 1 test passed.
- `git diff --check` passed.

### Sensitivity increment W5-S1

- Green → forced all operations to reuse one valid audit group UUID → the new
  persisted distinct-group assertion failed with 1 instead of 2 → restored →
  focused and full suites passed.
- Green → removed source-group attack bonuses while retaining spell-level stats
  → the new persisted Cleric group assertion failed with null instead of 4 →
  restored → focused and full suites passed.

## 2026-07-23 — Integrated Wave 6 review

### Review increment W6-R1

- Independently reviewed
  `019ec41e91a32216c91bac4ac6a1dd194cd73d26..HEAD` for Q60 against every
  named character/query builder, controller, and Feature-test oracle. The
  merged path inventory contains only Q60-owned files.
- Fixed the shared-client scope gap: `QueriesClient` now composes the existing
  typed catalog import/mutation client alongside catalog reads and character
  CRUD, preserving the single integration surface required by Q60.
- Replaced permissive RPC smoke checks with exact endpoint/DTO assertions and a
  whole-SQLite before/after hash covering character, list, workspace,
  eligibility, catalog, report, printable, and history reads.

### Test increment W6-T1

- Focused Q60 Integration run: 3 files, 10 tests passed.
- `npm test`: 36 files, 297 tests passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed.

### Sensitivity increment W6-S1

- Green → forced the newly composed catalog client import into dry-run mode →
  the new test failed at its intended persisted `spell_versions` assertion
  (`null` instead of the exact imported row) → restored → targeted, focused,
  and full suites passed.

## 2026-07-23 — Integrated Wave 7 review

### Review increment W7-R1

- Independently reviewed
  `69e2c9dd304aaa1cf76f2de023cc987a5a3cbf9a..HEAD` for U70, U71, and U72
  against every named PHP/Vue oracle. The merged inventory contains only
  chunk-owned files.
- Fixed U71 parity gaps: restored the oracle's selected-spell/manual dice
  profiles, profile-specific inputs, exact metrics, effect eligibility,
  replayable traces and assumptions; added Pact Magic and Wizard spellbook
  states to the live report; restored exact destructive/save-point wording;
  and exposed the stale-revision reload state.
- Fixed profile fields whose semantic `hidden` state was overridden by planner
  flex CSS. Strengthened the compressed dice assertions to cover the omitted
  oracle probability-mass, critical, cap, defense, and trace branches.
- Added a real SQLite browser fixture that persists warning acknowledgement,
  override, clear, eligible replacement selection, and source creation, then
  reloads and rechecks stored rows. No unresolved parity, persistence,
  assertion-sensitivity, or ownership finding remains.

### Test increment W7-T1

- `npm test`: 40 files, 312 tests passed.
- `npm run build`: TypeScript and Vite production build passed.
- Relevant Chromium run: 6 tests passed across character list, planner,
  reports, and print; final post-review planner rerun: 2 tests passed.
- Report/print tests retained whole-database hash/export comparisons proving
  presentation is read-only. `git diff --check` passed.

### Sensitivity increment W7-S1

- Green → renamed the live Pact Magic label → the new browser parity workflow
  failed at the exact `Pact Magic: 2 × level 3` visibility assertion → restored
  → the workflow passed.
- Green → suppressed stale revision-conflict state → the new Unit test failed
  at `session.stale` (`false` instead of `true`) while its durable-state
  assertions remained intact → restored → focused and full suites passed.

## 2026-07-23 — Integrated Wave 8 review

### Review increment W8-R1

- Independently reviewed
  `cd95e5675ac36b58c81c90637a023cc1922b2cb0..HEAD` and the six PHP Unit
  oracle files plus all 28 frozen Feature workflows. The merged inventory
  contains only T80/T81-owned files.
- Fixed diluted parity assertions for exact character/list/workspace state,
  assignment inverses, class/source/audit changes, reports, printable facts,
  catalog pivots, and portable backups. Workflow 18 now creates its standalone
  source; workflow 21 covers both PHP dataset branches; warning undo now
  restores; failed backup imports prove byte-identical state.
- No unresolved parity, persisted-SQLite, sensitivity, or ownership finding
  remains.

### Test increment W8-T1

- `npm test`: 41 files, 314 tests passed.
- `npm run typecheck`: passed.
- Final owned Chromium run: 28/28 workflows passed.
- Manifest count remained exactly 28; `git diff --check` passed; nothing is
  staged and no generated artifact or sensitivity mutation remains.

### Sensitivity increment W8-S1

- Green → changed the exact T80 six-class report name expectation → filtered
  Vitest failed at `report.character` with the persisted original name →
  restored → filtered case passed.
- Green → changed workflow 18's first expected persisted list constraint from
  Wizard to Cleric → filtered Chromium failed at `allowed_spell_lists` with
  the stored Wizard value → restored → filtered workflow passed.

## 2026-07-23 — Integrated Wave 9 review

### Review increment W9-R1

- Independently reviewed
  `1d6b43cf6fbf530cfe90296fa151867d804403c4..HEAD`; the merged inventory
  contains only S90-owned `PARITY-AUDIT.md` and `progress/S90.md`.
- Recounted 10 migrations, 56 PHP domain files, 24 PHP test/support files, 23
  prior progress shards, 57 PHP Unit cases/map rows, and 28 fixed browser
  workflows/map rows. Rechecked persisted-row/image assertions, fresh-profile
  durability, accessibility/print smoke, and all aggregate increment evidence.
- Queried the migrated PHP-oracle SQLite database read-only: excluding the
  migration ledger it has 38 tables, 59 named indexes, two triggers, no
  foreign-key violations, and metadata hash
  `fa0e4e9f2af9531e8b66b296660b5db7e28a5c6c2ceda00859c904fe6a4d1b11`.
  No unresolved parity, persistence, assertion-sensitivity, or ownership
  finding remains.

### Test increment W9-T1

- `npm test`: 41 files, 314 tests passed.
- Focused schema metadata/persistence: 1 file, 4 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; 35 modules transformed; generated `dist/` removed.
- `npm run test:browser`: 39 Chromium tests passed serially with one worker in
  3.7 minutes, including 28/28 parity workflows and the fresh-profile journey.

### Sensitivity increment W9-S1

- In an isolated temporary archive, returned `UnassignedSpellSlot` for a
  persisted selected reference. Filtered T80 failed at its intended
  `UserSpellSelection` instance assertion; restoration returned it green.
- In the same archive, stored a null selected spell ID. Filtered T81 workflow
  28 failed at its intended persisted `current_spell_version_id` assertion;
  restoration returned it green.
- The archive and failure trace were removed; repository production/test files
  were never changed and no mutation or generated artifact remains.

PORT COMPLETE
