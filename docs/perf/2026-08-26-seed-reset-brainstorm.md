# Avoiding repeated test database seeds and resets

Date: 2026-08-26  
Scope: read-only investigation plus this document. No test suite was run. One
small in-memory sqlite-wasm script was used to verify `data_version`,
`total_changes()`, savepoint rollback, and an explicit inner `COMMIT`.

## Recommendation in one page

Use a layered test database fixture:

1. Build or read a **digest-keyed seeded SQLite byte image** once in Vitest
   global setup, with separate keys for `full` and `test-core` profiles.
2. Each Vitest worker deserializes that image once and keeps one connection.
3. A normal write-capable test gets `SAVEPOINT test_fixture`; teardown uses
   `ROLLBACK TO test_fixture; RELEASE test_fixture`.
4. A declared read-only test gets `PRAGMA query_only = ON` and no transaction;
   teardown turns it off and verifies the connection is clean.
5. Tests whose subject is boot, seed, migration, replacement, serialization,
   transaction control, schema corruption, or connection poisoning keep a fresh
   isolated database/image. If an ordinary test closes the connection, leaks a
   statement, or destroys its savepoint with `COMMIT`, loudly discard the worker
   connection and deserialize the seed image again.

This is mechanisms **6 + 4 + 3**, with mechanism 2 used only as telemetry and a
defensive no-op hint. It composes naturally with the prototypes already in the
tree: the per-worker serialized image in `tests/helpers/open-db.ts:18-79` and
the shared read-only/savepoint lease in `tests/helpers/shared-db.ts:25-173`.

Do **not** lead with table+rowid cleanup. It is more machinery than a savepoint,
is less complete, and still needs a pristine image fallback. Also do not split
catalog and state databases in the performance lane: the current schema has
real state-to-catalog foreign keys, and catalog tables contain mutable external
and authored rows as well as bundled SRD rows.

For the running `wt/perf-cache` lane: adopt the existing shared lease for the
large ordinary seeded suites, retain `openSeededTestDatabase()` for exception
suites and multi-database tests, and add the digest-keyed on-disk byte image so
the first seed is paid neither per test nor per worker on a warm run. Benchmark
in three increments: image only, image + shared read-only leases, then image +
shared read/write savepoint leases. Do not add dirty-row restoration unless the
savepoint exception population proves large enough to justify it.

## Established facts

### What the baseline actually contains

The committed sample names 24 files in
`scripts/perf-sample-5pct.txt:1-24`; the captured run reports 24 files and 372
tests in 26.04 seconds (`reports/perf/baseline/vitest.log:2-9`, with the same
26.0-second wall value in `reports/perf/baseline/wall.txt:1`). The runner writes
one merged SQL profile from worker logs (`scripts/perf-sample-run.sh:12-35`).

The named hot operations alone cost 4.925 seconds of SQLite profile time:

| Operation | Calls | SQL time | Evidence |
|---|---:|---:|---|
| Full scan `catalog_content_fingerprints` | 1,193 | 2,022.13 ms | `reports/perf/baseline/sql-profile.json:3-6` |
| Full scan `catalog_content_identities` | 1,193 | 1,854.84 ms | `reports/perf/baseline/sql-profile.json:8-11` |
| Insert/upsert `spell_versions` | 4,407 | 835.60 ms | `reports/perf/baseline/sql-profile.json:13-16` |
| Insert `spell_list_memberships` | 11,375 | 205.97 ms | `reports/perf/baseline/sql-profile.json:48-51` |

The whole merged profile is 14,573.49 ms of SQLite time. A local aggregation
of the committed JSON classifies 3,920.08 ms / 75,905 calls as statements
starting with `INSERT`, `UPDATE`, `DELETE`, or `REPLACE`, and 10,651.80 ms as
`SELECT`/`PRAGMA`. Avoiding seed work therefore removes both writes and the
more expensive verification/projection reads around them.

`4,407 / 339 = 13`, so the spell-version traffic is exactly **thirteen
full-seed-equivalents** at 339 spells each (the repository independently
describes the 339 spell bodies at
`src/simulation/spell-source-parse-cache.ts:15-21`). That is a work-volume
equivalence, not proof that every invocation used the full profile: a
`test-core` pass contributes a subset to the same SQL counter. The sample
contains eight direct `applicationSeed()` call sites:
`tests/integration/backup/portable-content.test.ts:225,524,530,544,574,1218,1258`
and `tests/integration/queries/level-up-wizard.test.ts:380`. The remainder are
consistent with fixture/lifecycle seed builds. Some direct seed calls are the
subject of their tests and must remain; the generic fixture builds are the
avoidable portion.

### How tests currently open and seed databases

There are now three paths:

- `openTestDatabase()` initializes sqlite-wasm, opens a new `:memory:`
  connection, attaches SQL tracing, and executes the full schema unless asked
  not to (`tests/helpers/open-db.ts:29-47`). Every caller receives a fresh,
  unseeded database.
- `seededDatabaseImage()` opens a fresh database, runs `applicationSeed()`,
  exports it with `sqlite3_js_db_export()`, and memoizes the byte promise by
  seed profile on the **worker's `process` object**
  (`tests/helpers/open-db.ts:18-27,49-64`).
- `openSeededTestDatabase()` copies the cached bytes, deserializes them into an
  independently writable connection, prepares it, and returns the clone
  (`tests/helpers/open-db.ts:66-79`). `createSeededRpcHarness()` exposes the same
  path to RPC tests (`tests/helpers/rpc-harness.ts:148-165`).

The tests prove that two seeded-image callers are independently writable at
`tests/integration/helpers/seeded-database.test.ts:42-54`. The fresh-schema path
is intentionally retained for lifecycle and seeding tests
(`tests/helpers/open-db.ts:66-70`).

There is also a more aggressive shared-connection prototype. It caches one
connection on the worker's `process`, rejects overlapping leases, makes a
read-only lease `query_only`, and opens a savepoint for a writable lease
(`tests/helpers/shared-db.ts:25-39,107-136`). Teardown rolls the savepoint back,
restores `query_only`, and checks transaction/statement/connection state
(`tests/helpers/shared-db.ts:41-53,141-170`). It rebuilds from the seeded image
when poisoned (`tests/helpers/shared-db.ts:55-71,94-101`). Its tests cover nested
application transactions, explicit `COMMIT`, connection close, module graph
replacement, and leaked statements
(`tests/integration/helpers/shared-database.test.ts:33-141`).

Adoption is still narrow. The baseline sample uses seeded clones in
`level-up-class.test.ts:185`, the ordinary arm of
`level-up-wizard.test.ts:234-243`, and the test-core builder fixture at
`guided-skill-grants.test.ts:52-61`. Other sample suites still seed a fresh
database in `beforeEach`, e.g. weapon mastery
(`tests/integration/rules/weapon-mastery.test.ts:17-24`), sheet content
(`tests/integration/rules/sheet-content.test.ts:29-36`), and fill-skill-grant
(`tests/integration/commands/fill-skill-grant.test.ts:141-154`).

### Fresh database versus shared database

The default remains fresh **per helper call/test**. Seeded clones share only an
immutable byte image, not a connection. The shared lease is shared **within one
worker only**, one test at a time. Four parallel Vitest workers therefore mean
four independent connections and four independent savepoint stacks, not four
tests racing on one database. This remains true if the configured ceiling is
higher: the checked-in config currently says `maxWorkers: 8`
(`vitest.config.ts:45-56`). No sample or repository test declares
`it.concurrent`/`test.concurrent`.

Vitest module isolation is disabled (`vitest.config.ts:45-47`), while the
helpers deliberately keep their reusable state on `process` so it survives a
file/module graph boundary (`tests/helpers/open-db.ts:20-27` and
`tests/helpers/shared-db.ts:79-87`).

### Do tests commit writes, and can they be wrapped?

Today, most fixture writes are autocommitted because they run on fresh
connections. `DatabaseContext.transaction()` delegates to `TransactionRunner`
(`src/db/database.ts:91-100`); the runner starts a real transaction only at the
outermost level and automatically uses a nested savepoint when the connection
is already in a transaction (`src/db/transaction.ts:15-27`). Therefore ordinary
command/application transactions can run below one test-owned outer savepoint.
The shared-db test demonstrates exactly that and observes the inserted row
disappear after lease release
(`tests/integration/helpers/shared-database.test.ts:33-55`).

A repository-wide static search found no ordinary test issuing raw `COMMIT`;
the one deliberate example is the shared-helper poison test at
`tests/integration/helpers/shared-database.test.ts:57-87`. The migration tests
do deliberately issue transaction control, and `tests/unit/db/transaction.test.ts`
tests transaction semantics themselves. These, lifecycle open/reopen/reset,
schema/migration, and image import/export tests must keep isolated connections.

Other exceptions are tests that deliberately toggle `foreign_keys`, create or
drop triggers, corrupt catalog rows, close connections, leak statements, or
need two simultaneously independent databases. A savepoint can roll back
ordinary DML and transactional DDL, but wrapping a test that asserts autocommit
or transaction boundaries changes its subject; `PRAGMA foreign_keys` also
cannot be meaningfully toggled inside an active transaction. These tests should
opt out rather than make the shared fixture emulate them.

### sqlite-wasm restore APIs available in this checkout

The pinned package is `@sqlite.org/sqlite-wasm 3.53.0-build1`
(`package.json:35-40`). It exposes:

- `sqlite3_serialize()` and `sqlite3_deserialize()`
  (`node_modules/@sqlite.org/sqlite-wasm/dist/index.d.mts:5328-5376`);
- the convenient `sqlite3_js_db_export()` returning `Uint8Array`
  (`node_modules/@sqlite.org/sqlite-wasm/dist/index.d.mts:6265-6277`);
- OO1 `db.changes(true)` / C `sqlite3_total_changes[64]()`
  (`node_modules/@sqlite.org/sqlite-wasm/dist/index.d.mts:737-744,3141-3169`);
- the SQLite session/changeset extension, including session attach, changeset,
  invert, and apply APIs
  (`node_modules/@sqlite.org/sqlite-wasm/dist/index.d.mts:5385-5609,5618-6030`).

No `sqlite3_backup_*` API is declared or exported by this package build. The
supported byte-image path is serialize/export plus deserialize. The application
already implements safe ownership flags around `sqlite3_deserialize()` in
`openDatabaseImage()` (`src/db/database-lifecycle.ts:94-130`) and already uses
`sqlite3_js_db_export()` in the test image builder
(`tests/helpers/open-db.ts:55-61`). Prefer those proven wrappers over writing a
new backup binding.

For restore, opening a new connection from pristine bytes is safer than calling
`sqlite3_deserialize()` over a live leased connection: the declaration itself
warns of severe JavaScript allocation caveats
(`index.d.mts:5358-5361`), while closing/reopening also guarantees that prepared
statements and connection PRAGMAs cannot survive.

### Which data is immutable and which is mutable

The exhaustive role inventory is `TABLE_SCOPES`
(`src/domain/contracts/tables.ts:167-175`). It distinguishes:

- character root/owned state (`characters`, character classes, sources, spell
  choices, equipment, origins, effects, operations, logs, save points, and
  related rows), beginning at `tables.ts:175-305` and continuing at
  `tables.ts:353-478,1096+`;
- mutable local state outside a character: `party_document_states`,
  `vtt_session_revisions`, catalog drafts, archive membership, replacement
  choices, match decisions, aliases, supersessions, and migration markers
  (`tables.ts:307-317,480-579`);
- catalog roles for spells, classes, sources, weapons, armor, items, and origins
  (`tables.ts:581-703,705-868,870-1081`).

The important boundary is **not table-level immutability**. Bundled rows are
read-only during ordinary application use, but most catalog tables also accept
mutable external/homebrew/placeholder rows:

- `catalog_content_identities.catalog_layer` is explicitly `bundled` or
  `external` (`db/schema/catalog-content.ts:83-111`);
- `spell_versions` documents placeholder and homebrew/imported values
  (`db/schema/catalog-spells.ts:96-146`);
- durable authored drafts are user state
  (`db/schema/catalog-authoring.ts:26-86`);
- the baseline itself contains 1,196 inserts of asserted external catalog
  identities (`reports/perf/baseline/sql-profile.json:53-55`).

Even character state has enforced foreign keys into catalog tables:
`character_class_levels.class_definition_id -> class_definitions.id`
(`db/schema/character.ts:395-410`) and spell selection ids point to
`spell_versions.id` (`db/schema/character.ts:540-564`). Thus “read-only
catalog” is a classification of **bundled rows in a seeded baseline**, not a
set of tables that can simply be moved elsewhere without redesign.

### How many sample tests are pure-read?

Static expansion of the sample's `it.each` tables gives this conservative
classification:

- 190 of 372 cases (51.1%) are in files that never open a database at all.
  They already need no reset, so database skip detection cannot improve them.
- Of the remaining 182 database-touching cases, 21 validation cases in
  `tests/unit/backup/validation.test.ts` are pure in-memory document validation;
  only its database round-trip opens connections at lines 876-904. This yields
  a proven lower bound of **211/372 = 56.7%** sample cases issuing no database
  row write, but only **21/182 = 11.5%** of database-touching cases are proven
  pure without finer per-test instrumentation.
- Several catalog tests only read in the test body but seed in `beforeEach`.
  They are not write-free under the current fixture and, when the subject is
  the seeder, should not be reclassified merely to make the metric look better.

The right next measurement is per-test `db.changes(true)` deltas emitted by the
fixture, partitioned into no DB / DB read-only / DB write / poisoned fallback.
That provides the exact suite-wide fraction without changing behavior.

## Mechanism evaluation

Savings below use the committed baseline as the ceiling. The four named
operations total 4.925 seconds of SQLite time; total SQLite profile time is
14.573 seconds and wall time is 26.0 seconds. No mechanism can remove direct
seed calls from tests whose subject is seeding, repair, boot, or portability.

### 1. Dirty table+row tracking and differential cleanup/reseed

**Shape.** Start from one seeded worker connection. Record every changed table
and key, then restore only changed rows. There are three plausible recorders:

1. TEMP `AFTER INSERT/UPDATE/DELETE` triggers on every application table write
   old/new primary keys and, if restoration is desired, old row images into a
   TEMP change log.
2. Instrument `execute()` at `src/db/query.ts:67-87` to parse the statement and
   record affected tables/ids.
3. Use SQLite's compiled session extension to collect a changeset, invert it,
   and apply it at teardown.

**Correctness risk: high.** A `(table,rowid)` set is sufficient only for rows
inserted during a test. For an update, deleting the row loses the baseline; for
a delete, the original row is already gone. Correct restoration therefore
needs before-images or targeted authoritative reseeding. Targeted reseeding is
harder than it sounds because catalog aggregates span identity, provenance,
fingerprint, definition, child, and join tables with foreign-key order.
Character/session rows have no seeder at all and must be restored byte-for-byte.

Execute-layer tracking is not complete: tests and application code can call the
OO1 connection directly (`connection.exec`), a trigger can write other tables,
and cascades produce indirect changes. TEMP triggers are more complete but add
dozens of fixture triggers, interact with tests that inspect/create/drop
triggers, and must capture old/new composite primary keys, not assume every
logical identity is an integer rowid. They also need explicit treatment for
`sqlite_sequence`, schema DDL, TEMP state, attached databases, and PRAGMAs.

The session extension is the strongest version because it captures old/new
values below the execute layer and can invert a committed changeset. It still
does not replace a clean-image fallback: DDL is outside row changesets,
`sqlite_sequence`/tables without a usable PK need proof, inverse application
can hit FK/conflict ordering, and connection state is not restored.

**Expected saving.** When it works, it shares the same upper ceiling as
savepoint rollback: nearly all generic fixture seed work and the named 4.925 s
hotspot can disappear, leaving only intentional seed tests. Teardown cost grows
with changed rows and inverse application. It is not faster than native
`ROLLBACK TO` for tests that can remain inside a savepoint.

**Implementation size: XL.** Trigger generation/session bindings, exhaustive
table/key classification, before-image handling, cascade/sequence/DDL proof,
poison detection, and a large adversarial fixture test matrix.

**Composability.** Compose with 4/6 as the fallback pristine image and with 2
as a fast “no change” check. It does not make 3 better; it is an alternative
for tests that truly must commit. Recommendation: defer until measurements show
many important tests cannot use a savepoint.

### 2. Skip-reset detection with `PRAGMA data_version` or `total_changes()`

**Finding.** `PRAGMA data_version` is the wrong signal for a worker-local shared
connection. The in-memory probe observed it remain `1` after an autocommit
insert, an insert inside a savepoint, rollback, and explicit commit on the same
connection. It is intended to reveal commits by *other* connections.

`total_changes()` is usable as a monotonic write-attempt signal. sqlite-wasm
documents that it counts INSERT/UPDATE/DELETE changes, including trigger work
(`index.d.mts:3141-3169`). The probe observed 1 after an autocommit insert, 2
inside a savepoint, and still 2 after rollback. That persistence across rollback
is useful for telemetry: compare the value at lease start/end.

**Correctness risk: medium if advisory; high if authoritative.** It misses DDL
and connection-state mutations such as PRAGMAs, ATTACH, open statements, close,
and registered functions. A zero delta correctly means no changed rows, but
does not prove the connection is reusable. Keep the existing poison checks and
prefer a declared read-only mode enforced by `query_only`.

**Expected saving.** Alone, none of the 13 seed passes: it can only skip a reset
after a shared baseline already exists. The lower-bound sample says 56.7% of
all cases write no DB rows, but 51.1% never use a DB anyway; only 11.5% of
DB-touching cases are statically proven pure. Since a read-only lease already
does no rollback and `ROLLBACK TO` is cheap, expected incremental wall saving is
small. Its main value is exact adoption telemetry and catching a test declared
read-only that attempted a write.

**Implementation size: S** for telemetry, **M/L** if used to decide restoration
and therefore expanded to schema/pragma/statement poison checks.

**Composability.** Good with every shared-baseline mechanism. Use
`db.changes(true)` delta plus existing `databaseIsInTransaction`, open-statement,
`query_only`, connection-open, schema-version, and database-list checks. Do not
use `data_version` for same-connection test writes.

### 3. SAVEPOINT per test + ROLLBACK

**Shape.** One seeded connection per worker. Open a named savepoint before an
ordinary writable test. Application transactions become nested savepoints via
the existing `TransactionRunner`. Roll back and release after the test.

**Correctness risk: low for the eligible majority, explicit opt-out required.**
SQLite rollback restores inserts, updates, deletes, cascades, trigger effects,
DDL executed inside the transaction, and auto-increment state atomically. It
does not need to know which table or key changed. Four workers remain isolated
because each owns its connection. The current helper already rejects overlap
and rebuilds on connection close, leaked statements, lingering transaction,
query-only state, or an explicit `COMMIT` that destroyed the savepoint.

Risks are semantic rather than restoration gaps: a test observing autocommit,
durability, transaction boundaries, `foreign_keys` toggling, lifecycle replace,
or migration behavior cannot be placed inside the fixture transaction. Tests
that intentionally corrupt catalog rows are safe if their consumer can run
inside the same savepoint; tests that deliberately reopen/serialize the
corruption are exception-suite candidates.

**Expected saving.** It removes per-test schema/seed/clone work for adopted
suites. Relative to a serialize-per-test clone, the extra gain is connection
allocation, byte copy/deserialization, prepare, and close rather than the seed
SQL—the current byte-image cache already pays seed once per worker/profile.
Relative to fresh seeding, it can remove nearly all non-subject seed work,
including its proportional share of the 4.925 s named hotspot. If nine of the
thirteen observed full-seed-equivalents were generic, the named-hotspot ceiling is
about `9/13 * 4.925 = 3.41 s` SQLite time; the actual removable count must be
reported by seed-call/test attribution before claiming it.

**Implementation size: S/M.** The core helper already exists. Work is adoption,
an exception allowlist/API, cleanup checks, and perf attribution.

**Composability.** Best with 6 + 4. Read-only leases use 2 as telemetry; poisoned
leases reopen from 4/6. This is the primary reset mechanism.

### 4. Seed once, serialize, and deserialize a byte image per test

**Shape.** Build one pristine image, copy its `Uint8Array`, open a fresh
writable deserialized connection for every test, then close it. This is already
implemented in `openSeededTestDatabase()`.

**Correctness risk: low.** Every test receives an independent connection and
cannot leak committed rows, PRAGMAs, schema damage, statements, or transaction
state into the next test. It handles four workers naturally. It is the safest
default for tests that intentionally corrupt catalog/state and for source/
target tests needing multiple simultaneous images.

The risk is stale cache identity, not isolation. The image key must include the
schema, bundled corpus/expected digest, catalog data migrations, seed profile,
and seed implementation inputs. A bare process memo has no cross-run staleness
because the process dies, but mechanism 6 must validate this explicitly.

**Expected saving.** It eliminates repeated schema execution and seed SQL after
the first build per worker/profile, so almost all generic repeats of the named
4.925 s hotspot disappear. It still pays full image byte copy + deserialize +
connection preparation + close per test; none of that appears as SQL statement
time. It also still pays one cold seed in every worker/profile, which mechanism
6 can remove.

**Implementation size: already S/core complete; M for broad adoption.** RPC
harness support also already exists. Migration work is changing suitable
fixtures, not inventing serialization.

**Composability.** Excellent fallback for 3, and the natural consumer of 6.
Use it for exceptions and multiple-image tests rather than for every ordinary
write test once 3 is proven.

### 5. Split database: attached read-only catalog plus writable state

**Shape.** Seed a catalog database once per process, attach it read-only to each
small state database, and reset only state. A more elaborate variant puts
bundled rows in the attached database and external/authored rows in main, with
UNION views presenting one logical catalog.

**Correctness risk: very high in the present schema.** Current unqualified SQL
expects catalog tables in `main`. More importantly, state has real foreign keys
to catalog ids (`character_class_levels -> class_definitions`, spell selection,
spellbook/loadout/preference rows -> `spell_versions`). SQLite does not provide
ordinary cross-database foreign keys, so a physical split either loses database
enforcement or requires redesigning state to stable content keys plus
application checks.

Catalog tables are not wholly read-only: external/homebrew/placeholder rows
share them with bundled rows, and authoring/import/repair tests intentionally
write or corrupt them. A split therefore needs two catalog layers and views,
rewrites every direct DML site, decides id allocation across layers, and changes
whole-database backup/export. Read-only ATTACH also prevents catalog repair and
seed tests from using the ordinary fixture.

**Expected saving.** The theoretical ceiling is excellent: catalog inserts
occur once per process and state reset is tiny, eliminating most of the named
4.925 s work. In practice 3/4/6 achieve nearly the same test-fixture saving
without a production data-model migration. Query cost may also rise through
UNION views.

**Implementation size: XXL / architectural.** Schema, queries, foreign-key
semantics, backup, lifecycle, authoring/import, migrations, and tests all move.

**Composability.** 5 + 2 is natural for pure readers; 5 + 3 can rollback only
state; 5 + 6 caches the catalog image. Recommendation: reject for the perf lane.
Revisit only if production architecture independently chooses separate catalogs.

### 6. Digest-keyed on-disk seeded-image cache

**Shape.** Mirror the spell parse cache precedent. Vitest global setup computes
a cache key, reads a `.sqlite3` byte image from `/tmp` on a hit, or creates it
once and atomically renames a PID-suffixed partial file on a miss. It exposes
the path/key to workers via environment variables. Workers verify the key and
deserialize their own bytes/connections.

The precedent already:

- runs before workers (`vitest.config.ts:31-44`);
- keys exact input/implementation bytes and treats mismatch as a miss
  (`tests/helpers/spell-source-parse-cache-global-setup.ts:24-45,59-100`);
- scopes the filename by checkout realpath, uses a PID partial file, and atomic
  rename (`spell-source-parse-cache-global-setup.ts:49-57,82-95`).

The database cache key should include:

1. seed profile (`full`/`test-core`);
2. generated schema bytes or database schema checksum;
3. bundled content digest;
4. catalog data-migration registry checksum;
5. a hash of seed/projector implementation inputs (or a generated module-graph
   fingerprint), since behavior can change without schema/content bytes;
6. sqlite-wasm package/build version and any connection/image format knobs.

`applicationBootVerificationBuildKey()` already supplies schema checksum,
bundled digest, and data-migration checksum (`src/db/bootstrap.ts:268-296`), so
extend it rather than create a parallel hand-maintained version. Store key and
image SHA-256 in an envelope/sidecar, validate the candidate once when written,
and treat missing, malformed, checksum-failing, or deserialize-failing files as
cache misses. A content-addressed final filename plus atomic rename makes two
concurrent suite processes harmless; never let one process overwrite a file
another is reading.

**Correctness risk: low/medium with a complete key, high with an incomplete
key.** A stale seeded image can silently make seed tests cease testing their
subject. Therefore seed/lifecycle/repair tests must bypass it, and ordinary
consumers must only use images whose profile/key match. The cache is an
optimization: every error falls back to rebuild.

**Expected saving.** It removes the cold seed currently paid once per
worker/profile. With four workers and one full profile, a warm run removes four
full seed builds; global setup can also make a cold run build once instead of
four times. Against the 13 observed full-seed-equivalents, a four-pass warm
reduction has a rough named-hotspot ceiling of `4/13 * 4.925 = 1.52 s` SQLite
time, plus unlisted seed statements and parser/projection CPU. It does not
remove the eight explicit sample seed calls whose tests request them.

**Implementation size: M.** Most concurrency/key/cache patterns already exist;
database validation and seed-module fingerprinting are the substantive work.

**Composability.** Best with 4 and 3. This should be the perf lane's next
cross-worker/cross-run layer.

### 7. SQLite session changeset as the committed-write escape hatch

This is the strongest additional mechanism, but not the default. Attach a
SQLite session to every application table at test start, let a test commit,
obtain its changeset, invert it, and apply the inverse at teardown. Unlike
execute-layer tracking, it sees direct SQL and trigger effects and contains old
values for updates/deletes. The pinned wasm build exposes every required core
API.

**Correctness risk: medium/high.** It requires primary-key coverage proof,
conflict policy, FK ordering, `sqlite_sequence` handling, and independent
cleanup of DDL/PRAGMAs/connection state. Tests whose point is commit/reopen may
still need a separate connection. **Expected saving:** comparable to mechanism
1 for the small set that cannot remain in a savepoint, with overhead
proportional to changes. **Size:** L. **Composition:** only after 3, with 4/6 as
fallback. Prefer it over handwritten table+rowid triggers if committed-write
reuse becomes necessary.

### 8. Narrow seed profiles and fixture-specific base images

The tree already defines `ApplicationSeedProfile = 'full' | 'test-core'` and
selects a bounded test-core spell set (`src/db/application-seed-profile.ts:5-14`).
Keep extending this idea only where the required catalog closure can be derived
and verified. Cache a small number of named base images (schema-only,
test-core, full), not one opaque snapshot per test file.

**Correctness risk: medium.** An underseeded fixture can turn “content exists”
into an accidental assumption or make a query silently return less. Profiles
must be explicit at the fixture call, closure-derived, and tested against the
full profile for the behaviors they claim. **Expected saving:** reduces image
size/deserialization and cold build for builder/command suites, but cannot
replace full catalog tests. **Size:** S/M per profile. **Composition:** strong
with 3/4/6; current `test-core` is evidence, not a license for per-file bespoke
snapshots.

## Ranked decision matrix

| Rank | Mechanism | Isolation confidence | Expected baseline impact | Size | Decision |
|---:|---|---|---|---|---|
| 1 | 3: per-worker shared connection + savepoint rollback | High for eligible tests; explicit exceptions | Highest incremental gain after image cache; avoids per-test clone lifecycle and all repeat seeds | S/M (prototype exists) | Adopt broadly |
| 2 | 6: digest-keyed on-disk seeded image | High with complete key/fail-cold behavior | Removes up to four worker cold seeds on warm four-worker run; ~1.52 s named-hotspot ceiling | M | Implement in `wt/perf-cache` |
| 3 | 4: serialize/deserialize clone | Very high | Removes repeat seed SQL; retains per-test image-copy cost | Already exists; M adoption | Keep as fallback/default for exceptions |
| 4 | Read-only lease + 2 telemetry | High when `query_only` enforced | Small direct saving; valuable exact census and no-transaction reads | S | Adopt, but do not trust `data_version` |
| 5 | 8: small verified seed profiles | Medium/high with closure proof | Useful image/build-size reduction in builder/command suites | S/M | Continue selectively |
| 6 | 7: session changeset inverse | Medium after substantial proof | Helps only committed-write exceptions | L | Prototype only if exception data justifies |
| 7 | 1: hand-built dirty row tracking | Low/medium | Same ceiling as savepoint but more teardown work | XL | Do not lead with it |
| 8 | 5: split attached catalog/state DBs | Low without architectural redesign | Great theoretical ceiling, disproportionate correctness cost | XXL | Reject for perf lane |

## Proposed `wt/perf-cache` rollout and proof gates

1. **Instrument without changing fixture behavior.** Attribute every
   `applicationSeed` call and seeded-image build to worker/profile/test file;
   record image byte size, export/deserialize/open/close time, and per-lease
   `changes(true)` delta. Resolve the thirteen full-seed-equivalents into actual
   full/test-core invocations and classify each as generic or intentional.
2. **Land the digest-keyed image cache.** Build once in global setup, consume in
   workers, keep the current process memo as a fallback. Prove cold miss, warm
   hit, source/schema/profile invalidation, corrupt/truncated cache fallback,
   concurrent writer safety, and independent writable clones. Never route
   seed/boot/migration tests through the cached answer.
3. **Migrate read-only consumers.** Use shared `ro` leases with `query_only`.
   Teardown must verify open connection, autocommit, no statements, expected
   `query_only`, expected schema version/database list, and zero row-change
   delta. A violation is loud and rebuilds.
4. **Migrate ordinary single-database writers.** Use shared `rw` savepoint
   leases. Start with query/read-model, builder, command, UI, and VTT fixtures
   that do not test transaction/lifecycle semantics. The current helper already
   proves nested transactions and poison recovery.
5. **Keep an explicit exception path.** Fresh schema for schema/seed/migration/
   transaction tests; fresh seeded clone for corruption/reopen/serialization,
   multi-database source-target, explicit PRAGMA/DDL, or committed poison tests.
   Do not silently catch an exception test and continue on a contaminated
   shared connection.
6. **Compare three lanes against the same sample:** current seeded clone,
   digest-cache clone, and digest-cache shared savepoint. Report wall time,
   cumulative test time, total SQLite time, the four named hot operations,
   number of seed builds, deserializations, rollbacks, and poison rebuilds.
   Require identical test membership and assertions. A success should drive the
   4,407/11,375 insert counts toward only the intentional seed cases, while the
   1,193 full-table verification reads fall with them.
7. **Only then consider committed-write cleanup.** If poison/fresh-clone
   exceptions are both frequent and expensive, prototype SQLite session
   inversion before handwritten row triggers. Keep byte-image replacement as
   the oracle and compare full exported bytes after inverse restoration in an
   adversarial table/trigger/FK/sequence matrix.

The end state is not “never rebuild.” It is “ordinary tests never rebuild;
tests that prove rebuilding still do, and every unexpected escape from the
cheap path fails closed to a pristine image.”
