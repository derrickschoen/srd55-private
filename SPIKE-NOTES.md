# Static-only TypeScript persistence spike

All evidence below was produced on 2026-07-23 from this directory. The normal
green commands are:

```text
npm run test
npm run test:browser
npm run build
```

## Load-bearing assumptions

| Assumption | Disposition | Executed proof |
|---|---|---|
| `opfs-sahpool` works in a dedicated worker over plain Vite without COOP/COEP | **PROVED** | Playwright response had neither header, `crossOriginIsolated` was `false`, VFS reported `dnd-static-spike-sahpool`, and the test passed. |
| A sahpool commit survives a full page reload | **PROVED** | Playwright reset to 0 rows, inserted one character, observed 1, called `page.reload()`, initialized a new page/worker, and still observed 1. |
| WASM triggers run and `RAISE(ABORT)` crosses JS/RPC as an assertable exception | **PROVED** | Vitest observed `SQLITE_CONSTRAINT_TRIGGER` (1811) with the exact migration message for INSERT and UPDATE. Playwright observed the same message through worker RPC. |
| WASM enforces the two composite FKs used by this slice | **PROVED** | Vitest observed `SQLITE_CONSTRAINT_FOREIGNKEY` (787) for both cross-character source ownership and a subclass attached to the wrong class. Playwright also observed the source violation through RPC. |
| WASM enforces the assignment CHECK | **PROVED** | With both triggers dropped in the test connection to expose the next defense, Vitest observed `SQLITE_CONSTRAINT_CHECK` (275) naming `spell_slots_exclusive_assignment_check`. |
| Foreign keys are OFF by default and must be enabled on every connection | **PROVED** | A fresh in-memory `oo1.DB` returned `PRAGMA foreign_keys = 0`; after schema bootstrap it returned 1. The worker sets it before schema DDL/transactions and reports 1. |
| The worker has one connection and uses rollback journal | **PROVED** | The worker owns one module-level DB handle; browser runtime reported `journalMode: "delete"`, `foreignKeys: 1`, filename `/dnd-static-spike.sqlite3`. |

No load-bearing assumption was disproved.

The package README's generic OPFS example warns that the older `OpfsDb` route
needs COOP/COEP. This spike does not use that VFS: it explicitly installs
`opfs-sahpool`, which the executed plain-Vite test proved does not need those
headers.

## Schema slice

`src/db/schema.sql` is translated from:

- `2026_07_21_000100_create_catalog_tables.php`
- `2026_07_21_000200_create_character_tables.php`
- `2026_07_21_000300_add_spell_selection_eligibility.php`
- `2026_07_22_000600_guard_spell_slot_assignment.php`

Included tables:

- `spell_identities` and `spell_versions`: real FK targets for both spell
  assignment columns, so trigger/CHECK tests do not bypass catalog integrity.
- `class_definitions` and `subclass_definitions`: the latter retains the
  explicit `UNIQUE(id, class_definition_id)` parent key.
- `characters`, `character_source_instances`, and `character_class_levels`:
  real ownership parents; sources retain the explicit
  `UNIQUE(id, character_id)` index.
- `spell_selection_slots`: full migrated column shape, selection-eligibility
  additions, indexes, composite source FK, both exact SQLite triggers, and the
  exact exclusivity CHECK.

Other catalog, progression, spellbook, log, and preference tables were omitted
because none participates in the three exercised invariants.

The Laravel guard migration creates the two triggers on SQLite and uses its
named CHECK on non-SQLite drivers. The static schema intentionally contains
both defenses because the spike explicitly requires both; the CHECK test drops
the triggers only in its test connection so the CHECK is reached.

## Sensitivity transitions

Each guard below was physically deleted from `schema.sql`, its targeted Vitest
was re-run, the expected red result was observed, and the guard was restored.
The restored suite then passed 4/4.

1. **Triggers — green → red → restored green**
   - Baseline: INSERT and UPDATE each raised code 1811 with the exact
     `a spell slot cannot hold both...` ABORT message.
   - Delete INSERT trigger: targeted test failed because the DB instead reached
     the CHECK (code 275), proving the assertion distinguishes the trigger.
   - Restore INSERT, delete UPDATE trigger: INSERT still raised 1811, then the
     UPDATE assertion failed on code 275. Thus each trigger is behaviorally
     sensitivity-proven, not merely counted in `sqlite_schema`.
2. **Composite FKs — green → red → restored green**
   - Delete `(source_instance_id, character_id)` FK: targeted test failed
     `expected function to throw` at the cross-character slot insert.
   - Restore it, delete `(subclass_definition_id, class_definition_id)` FK:
     the first source check still raised 787, then the wrong-class subclass
     insert succeeded and the targeted test failed `expected function to throw`.
3. **CHECK — green → red → restored green**
   - Baseline (triggers dropped in that connection): invalid insert raised code
     275 naming the CHECK.
   - Delete the CHECK from `schema.sql`: the invalid insert succeeded and the
     targeted test failed `expected function to throw`.

## Browser durability and worker enforcement

`npm run test:browser` passed in Chromium in 1.8 seconds. The test proves:

- plain Vite headers and `crossOriginIsolated: false`;
- `opfs-sahpool` with an absolute database path;
- `foreign_keys=ON` and rollback journal `delete`;
- one committed row before reload and the same row after full reload;
- exact trigger rejection and composite-FK rejection through async worker RPC.

## SQLite build

- npm package (exactly pinned): `@sqlite.org/sqlite-wasm@3.53.0-build1`
- runtime `sqlite_version()`: `3.53.0`
- `PRAGMA compile_options`:

```text
ATOMIC_INTRINSICS=1
COMPILER=clang-23.0.0
DEFAULT_AUTOVACUUM
DEFAULT_CACHE_SIZE=-16384
DEFAULT_FILE_FORMAT=4
DEFAULT_JOURNAL_SIZE_LIMIT=-1
DEFAULT_MMAP_SIZE=0
DEFAULT_PAGE_SIZE=8192
DEFAULT_PCACHE_INITSZ=20
DEFAULT_RECURSIVE_TRIGGERS
DEFAULT_SECTOR_SIZE=4096
DEFAULT_SYNCHRONOUS=2
DEFAULT_WAL_AUTOCHECKPOINT=1000
DEFAULT_WAL_SYNCHRONOUS=2
DEFAULT_WORKER_THREADS=0
DIRECT_OVERFLOW_READ
DQS=0
ENABLE_API_ARMOR
ENABLE_BYTECODE_VTAB
ENABLE_COLUMN_METADATA
ENABLE_DBPAGE_VTAB
ENABLE_DBSTAT_VTAB
ENABLE_FTS5
ENABLE_MATH_FUNCTIONS
ENABLE_OFFSET_SQL_FUNC
ENABLE_PERCENTILE
ENABLE_PREUPDATE_HOOK
ENABLE_RTREE
ENABLE_SESSION
ENABLE_STMTVTAB
ENABLE_UNKNOWN_SQL_FUNCTION
MALLOC_SOFT_LIMIT=1024
MAX_ATTACHED=10
MAX_COLUMN=2000
MAX_COMPOUND_SELECT=500
MAX_DEFAULT_PAGE_SIZE=8192
MAX_EXPR_DEPTH=1000
MAX_FUNCTION_ARG=1000
MAX_LENGTH=1000000000
MAX_LIKE_PATTERN_LENGTH=50000
MAX_MMAP_SIZE=0
MAX_PAGE_COUNT=0xfffffffe
MAX_PAGE_SIZE=65536
MAX_SQL_LENGTH=1000000000
MAX_TRIGGER_DEPTH=1000
MAX_VARIABLE_NUMBER=32766
MAX_VDBE_OP=250000000
MAX_WORKER_THREADS=0
MUTEX_OMIT
OMIT_DEPRECATED
OMIT_LOAD_EXTENSION
OMIT_SHARED_CACHE
OMIT_UTF16
STRICT_SUBTYPE
SYSTEM_MALLOC
TEMP_STORE=2
THREADSAFE=0
USE_URI
```

Notably, `DEFAULT_FOREIGN_KEYS` is absent, matching the observed default OFF.

## Independent review

Round 1 used a separate fresh `codex exec --sandbox read-only` session. It
reported one medium and one related low finding: runtime codes were visible in
output but tests asserted only substrings, so "exact" in these notes was too
strong. Accepted and fixed: Vitest and Playwright now assert the complete
serialized trigger/FK/CHECK errors, including extended result codes. The
post-fix unit, browser, and build commands all passed. Round 2 found no
significant findings; there are no rejected or unresolved reviewer findings.
