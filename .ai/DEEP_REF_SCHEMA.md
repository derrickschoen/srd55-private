# Deep Reference: Schema, Contracts and Table Scopes

> Parent: [CODEBASE_GUIDE.md](guidelines/CODEBASE_GUIDE.md)
>
> If this file disagrees with `.claude/decisions.md`, decisions.md wins and this
> file is the bug.

---

## 1. The schema is authored in TypeScript. The SQL is generated.

```
db/schema/*.ts   ──  npm run db:schema  ──▶  src/db/schema.sql
db/schema/*.ts   ──  npm run db:contracts ─▶  src/domain/contracts/generated/column-facts.ts
```

**`src/db/schema.sql` is a GENERATED FILE and hand-editing it is the single most
common way to break this repository.** Its first four lines say so, and
`tests/unit/schema-generation.test.ts` fails the moment it drifts from what
`db/schema/*.ts` would produce.

The schema modules under `db/schema/`:

Published content lifecycle state begins at
`db/schema/catalog-content.ts`: `catalog_content_identities` and
`catalog_content_supersessions`; portable manifests deliberately project the
aggregate, not recipient-local archive or immutable-version-lineage metadata.

| File | Holds |
|---|---|
| `catalog-authoring.ts` | Durable incomplete homebrew drafts (whole-database only) |
| `catalog-classes.ts` | Classes, subclasses, their progressions and sheet traits |
| `catalog-sources.ts` | Feats, species, background DEFINITIONS (spell-grant sources) |
| `catalog-spells.ts` | Spell identities, versions, publications, pivots |
| `character.ts` | The character aggregate: root, class levels, source instances, slots |
| `origins.ts` | Species and background TEMPLATES (bags of values a character copies) |
| `sheet.ts` | Class sheet traits and the derived-sheet support tables |
| `sheet-inputs.ts` | The four stored sheet inputs: armour, hit-point rolls, skill proficiencies, AC adjustment |
| `weapons.ts` | SRD weapon templates and character weapons |
| `columns.ts` | The column primitives (`varchar`, `sqlText`, `datetime`, `tinyint1`) |
| `relations.ts` | Drizzle relation blocks |
| `index.ts` | Re-exports EVERY module above. Not optional — see below |
| `triggers.sql` | The two hand-authored triggers |

`db/schema/origins.ts`:

- `background_templates` (`:988`) stores the printed background template and
  its nullable migrated/default Origin-feat content key. New writers always
  supply the key; null represents only an ambiguous legacy name that migration
  0037 could not bind without guessing.

### `index.ts` is load-bearing

Every module under `db/schema/` must be re-exported from `db/schema/index.ts`.
`scripts/compose-schema.ts` passes that namespace to drizzle-kit, and
`src/domain/contracts/tables.ts` derives `AnyTableName` from it — so a table in
an unreferenced module would be emitted nowhere AND escape scope classification.
`tests/unit/schema-modules.test.ts` asserts the file set equals the export set,
so a new unreferenced file is a failing test rather than silence.

### Why the artifact is COMPOSED rather than a raw drizzle-kit export

Two things are outside what Drizzle can represent
(`scripts/compose-schema.ts:8-24`):

- **prelude** — `PRAGMA foreign_keys = ON;`. Test helpers execute the artifact
  directly and the reset path builds a fresh connection, so omitting it would
  silently disable cascade behaviour.
- **postlude** — the two named triggers from `db/schema/triggers.sql`:
  `spell_slots_exclusive_assignment_insert` and `..._update`, which enforce that
  a slot never holds both a fixed grant and a user selection.

### The purity split that stops the freshness tests being self-fulfilling

`scripts/compose-schema.ts` and `scripts/compose-row-contracts.ts` **compose and
never write.** `scripts/build-schema.ts` and `scripts/build-row-contracts.ts` are
the only writers. The tests import the COMPOSER and compare against the artifact
checked into git, so a test can never regenerate the file it is checking.

Same shape, same reason, in both directions. If you add a third generated
artifact, keep the split.

---

## 2. Row contracts — the untrusted-bytes boundary

`src/domain/contracts/`:

| File | What it is |
|---|---|
| `generated/column-facts.ts` | GENERATED. Per-column facts: does the column exist, is it `notNull`, could drizzle-zod type it |
| `generated/reference-facts.ts` | GENERATED. Catalog tables a backup resolves references against |
| `rows.ts` | The Zod contracts. `COLUMN_REFINEMENTS` (`:419`), `NARROWED_REFINEMENTS` (`:502`), `rowContractError` (`:1566`) |
| `row-rules.ts` | Cross-column rules a per-column contract cannot express |
| `json-columns.ts` | WHICH text columns hold serialized JSON, and what SHAPE each reader needs |
| `tables.ts` | The table inventory and scope classification — §3 below |

**Nullability is DERIVED, never asserted by hand.** `column-facts.ts` reads
`column.notNull` through drizzle-zod. A contract that refuses a null the column
permits is a data-loss bug — it makes a user's own backup unrestorable — which
is the failure mode D6/D6b are about and the one D8 records codex checking for
and not finding.

**A `z.any()` never reaches a contract.** drizzle-zod degrades every
`customType` column to `z.any()`; the refinement map in `rows.ts` is
`satisfies Record<DegradedColumnKey, …>`, so an unrefined degraded column is a
compile error rather than a silently unchecked column.

**A JSON column's contract is its SHAPE, not "parses as JSON".** `json-columns.ts`
opens with the proof: `allowed_spell_lists = '{}'` is valid JSON, passes a syntax
check, and silently deletes a slot's spell restrictions because every reader
returns `[]` for a non-array. Syntax is the wrong contract in both directions.

**F8 is the standing finding here** — 223 of 332 columns are degraded to
`z.any()` to protect the Laravel declared-type mimicry in `db/schema/columns.ts`,
and D7 retired that goal. One line, cited: read F8 for the whole argument and the
recommended first move. Do not restate it.

---

## 3. Table scopes — why adding a table is a compile error

`src/domain/contracts/tables.ts` is the answer to a real defect: the table lists
used to be hand-maintained in at least four places that did not know about each
other, and adding a table told you nothing about whether it belonged in
snapshots, backups, shares, both or neither.

`TABLE_SCOPES` (`:173`) classifies EVERY table with:

| Field | Meaning |
|---|---|
| `role` | Semantic role, including `catalog_draft` for whole-database-only incomplete authoring state |
| `snapshot` | In `CHARACTER_STATE_TABLES` — undo/redo |
| `backupDirect` | In `directCharacterTables` — the `character_id`-keyed pass |
| `backup` | In `backupTableNames` — the portable-character document |
| `share` | In the share export/import payload |
| `backupReference` | In `ReferenceKind` — a catalog table backups resolve against |

**Five independent booleans, not one role**, because the verified membership
matrix has five distinct patterns: `character_save_points` is backed up but never
shared, and `spell_loadout_entries` is backed up and shared but cannot be backed
up DIRECTLY.

Two mechanisms make this stick, and they are worth knowing by name:

1. **`satisfies { [N in AnyTableName]: ScopesFor<N> }`** — declaring a table in
   `db/schema/` is `TS1360, property is missing` until it is classified here.
2. **`backupDirect` is compile-gated on a `character_id` column.** The direct
   pass selects `WHERE character_id = ?`, so `backupDirect: true` on a table
   without that column is `Type 'true' is not assignable to type 'false'`. That
   fact previously lived only in a reviewer's head.

Derived from the classification: `SnapshotTable` (`:1162`), `BackupTable` (`:1164`),
`ShareTable` (`:1165`), and the ordered constants `CHARACTER_STATE_TABLES`
(`:1368`), `DELETE_ORDER` (`:1453`), `BACKUP_TABLES` (`:1520`), `SHARE_TABLES`
(`:1613`).

**Classification is not the same as working.** That was Q8's bug, and D24 records
the discipline that replaced it: each arm gets its own test — a column-for-column
backup round trip, a share round trip through the compressed fragment, and a
save-point restore. [RECIPES.md](RECIPES.md) §3 is that checklist.

---

## 4. The character root is NOT covered by the table loop

`characters` is classified all-false. The root is serialized through its own
path in `src/character/character-state.ts`: `CHARACTER_STATE_COLUMNS` (`:395`) for
snapshots, and `document.character` for backups. **A new column on `characters`
therefore does NOT get picked up by any of the table-scope machinery.** It has to
be added to `CHARACTER_STATE_COLUMNS` by hand, and to the backup and share paths
by hand. This is the sharpest edge in the whole schema story — see
[RECIPES.md](RECIPES.md) §3.

---

## 5. Constraints live in the database, not only in the types

The schema carries CHECK constraints, unique indexes, foreign keys with
`ON DELETE CASCADE`, and the two triggers. `tests/unit/invariants.test.ts`
exercises them against a real in-memory SQLite by asserting on the exact SQLite
error strings — including the trigger's own message, which is why the trigger
text and the test are coupled on purpose.

Foreign-key enforcement is asserted at connection time. In
`src/db/database.ts`, `prepareConnection` (`:21`) runs the pragmas and THROWS if
`PRAGMA foreign_keys` does not come back `1`. It is not assumed to have worked.
