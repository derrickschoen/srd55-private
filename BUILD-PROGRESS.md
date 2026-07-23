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
