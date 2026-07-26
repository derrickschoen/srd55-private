import type { Database, SqlValue } from '@sqlite.org/sqlite-wasm';
import {
  APPLICATION_TABLES,
  TABLE_SCOPES,
  SOURCE_REFERENCE_KIND,
  type AnyTableName,
  type HasCharacterId,
  type TablesWithRole,
} from '../domain/contracts/tables';
import { COLUMN_FACTS } from '../domain/contracts/generated/column-facts';
import { rowContractError } from '../domain/contracts/rows';
import {
  JSON_COLUMNS,
  JSON_COLUMN_KEYS,
  jsonColumnError,
  jsonColumnLocation,
} from '../domain/contracts/json-columns';
import {
  CHARACTER_SNAPSHOT_SCHEMA_VERSION,
  CHARACTER_STATE_COLUMNS,
  CHARACTER_STATE_TABLES,
} from '../character/character-state';
import { FOREIGN_KEY_FACTS } from '../domain/contracts/generated/reference-facts';
import { domainSourceTypes } from '../domain/enums';

/**
 * THE SEMANTIC AUDIT OF A QUARANTINED CANDIDATE DATABASE.
 *
 * Whole-image restore (`DatabaseLifecycle.replace`) previously accepted a
 * candidate on STRUCTURE alone: the tables and triggers were present and the
 * schema signature matched. Structure is not meaning. An image can have exactly
 * the right `CREATE TABLE` statements and still contain slots belonging to a
 * character that does not exist, or one character's source instance parented to
 * another character's row — and once it replaces live storage, every query in
 * the application is reading it.
 *
 * WHAT SQLITE ALREADY PROVES, AND WHERE IT STOPS.
 * `PRAGMA foreign_key_check` proves a referenced ROW EXISTS. It says nothing
 * about WHOSE row it is. The schema has exactly one single-column reference
 * between two character-owned tables —
 * `character_source_instances.parent_source_instance_id` — and a candidate that
 * points it at another character's source passes `foreign_key_check`,
 * `quick_check` and the schema-signature comparison untouched. That is the hole
 * this audit closes, and `spell_selection_slots` shows the schema's own remedy:
 * its reference tuple includes `character_id`, so the database enforces
 * ownership for it and the audit has nothing left to find.
 *
 * THE SECOND CHANNEL, WHICH IS NOT A TABLE.
 * Contamination does not only travel through columns. A save point stores a
 * whole JSON snapshot of one character, and `CharacterState.restore` REWRITES
 * `character_id` on every row it re-inserts. So a save point belonging to
 * character 1 whose embedded rows belong to character 2 is a delayed transfer of
 * another character's rows, triggered when the user presses undo — invisible to
 * every SQL-level check because it is text inside one column. `auditSavePoint`
 * therefore checks embedded ownership, embedded row shape and the embedded
 * source-parent graph, which is exactly what the portable backup's
 * `validateCharacterRows` and `topologicalSources` do for a document.
 *
 * WHY IT IS DERIVED.
 * The table set comes from `TABLE_SCOPES` (role) and the generated column facts
 * (does the table have `character_id`); the reference set comes from the
 * generated foreign-key facts; the JSON columns come from the one classification
 * in `src/domain/contracts/json-columns.ts` that the portable-backup contracts
 * also use. A table or a reference added to `db/schema/` enters this audit with
 * no edit here — the failure mode of a hand-listed audit is that it silently
 * keeps passing while covering less.
 *
 * WHERE IT RUNS.
 * `DatabaseLifecycle.validateBytes`, against the in-memory read-only copy —
 * i.e. while the candidate is still quarantined and before `replaceFile` is
 * called. It deliberately does NOT run on `open()`: that is the user's own live
 * database, and failing it at boot would take away the app rather than protect
 * it.
 */

export class CandidateAuditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateAuditError';
  }
}

type CharacterOwnedTable = TablesWithRole<'character_owned'>;

/** Character-owned tables that carry the owning `character_id` themselves. */
type OwnedWithCharacterId = {
  [N in CharacterOwnedTable]: HasCharacterId<N> extends true ? N : never;
}[CharacterOwnedTable];

function hasCharacterIdColumn(table: AnyTableName): boolean {
  return Object.hasOwn(COLUMN_FACTS[table], 'character_id');
}

function isOwnedWithCharacterId(
  table: AnyTableName,
): table is OwnedWithCharacterId {
  return (
    TABLE_SCOPES[table].role === 'character_owned' && hasCharacterIdColumn(table)
  );
}

/**
 * Derived, not transcribed. `tests/unit/db/candidate-audit.test.ts` pins the
 * expected membership as an independent oracle so a classification mistake in
 * `TABLE_SCOPES` cannot quietly shrink the audit.
 */
export const CHARACTER_OWNED_TABLES: readonly OwnedWithCharacterId[] =
  APPLICATION_TABLES.filter(isOwnedWithCharacterId);

/**
 * The references this audit must check for cross-character contamination.
 *
 * A reference qualifies when both ends are character-owned tables that carry
 * `character_id`, and the reference tuple does NOT already include
 * `character_id` — because when it does, SQLite is enforcing ownership itself
 * and re-checking it would be theatre.
 */
export const CONTAMINABLE_REFERENCES = FOREIGN_KEY_FACTS.filter(
  (fact) =>
    isOwnedWithCharacterId(fact.table) &&
    isOwnedWithCharacterId(fact.target) &&
    !(fact.columns as readonly string[]).includes('character_id'),
);

/**
 * THE TWO PLACES THIS AUDIT NAMES A TABLE BY HAND, AND WHY.
 *
 * Which table carries a POLYMORPHIC reference, and which table stores whole
 * snapshots as text, are facts about how a column is INTERPRETED. Nothing in the
 * schema declares either — `source_definition_id` is an integer with no foreign
 * key and `snapshot` is TEXT — so neither set can be derived the way
 * `CHARACTER_OWNED_TABLES` and `CONTAMINABLE_REFERENCES` are. The honest
 * consequence, recorded rather than hidden: a SECOND polymorphic reference or a
 * second snapshot column added to the schema would not be audited until it is
 * named here. `satisfies AnyTableName` at least turns a renamed or removed table
 * into a compile error instead of a query that silently never matches.
 */
const POLYMORPHIC_SOURCE_TABLE = 'character_source_instances' satisfies AnyTableName;
const SAVE_POINT_TABLE = 'character_save_points' satisfies AnyTableName;

function quoted(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

/**
 * `bind` is passed only when there is something to bind: sqlite-wasm rejects an
 * empty bind array against a statement with no parameters
 * ("This statement has no bindable parameters").
 */
function firstRow(
  db: Database,
  sql: string,
  bind?: readonly SqlValue[],
): Record<string, SqlValue> | undefined {
  const row =
    bind === undefined ? db.selectObject(sql) : db.selectObject(sql, [...bind]);
  return row as Record<string, SqlValue> | undefined;
}

function auditIntegrity(db: Database): void {
  // Also asserted by `validateDatabaseConnection`. Repeated here deliberately:
  // an audit that assumes somebody else ran the pragmas is an audit whose
  // guarantee depends on its call site, and this one is called on untrusted
  // bytes.
  const integrity = db.selectValue('PRAGMA quick_check');
  if (integrity !== 'ok') {
    throw new CandidateAuditError(
      `Candidate database failed PRAGMA quick_check: ${String(integrity)}.`,
    );
  }
  const violation = firstRow(db, 'PRAGMA foreign_key_check');
  if (violation !== undefined) {
    throw new CandidateAuditError(
      `Candidate database failed PRAGMA foreign_key_check in table ` +
        `${String(violation.table)} (rowid ${String(violation.rowid)}).`,
    );
  }
}

/**
 * Every character-owned row belongs to a character that exists.
 *
 * MEASURED CAVEAT, so nobody over-reads this pass: in the schema as it stands
 * every one of these `character_id` columns carries a foreign key, so
 * `PRAGMA foreign_key_check` reaches an orphan first and this pass never fires
 * on the current schema — `tests/unit/db/candidate-audit.test.ts` calls it
 * directly to prove it can. It is kept because the audit is contracted on the
 * CLASSIFICATION, not on the FKs: `character_source_instances.source_definition_id`
 * is proof that this schema does declare unenforced references, and a future
 * character-owned table without an FK on `character_id` would be covered here
 * with no edit.
 */
export function auditCharacterOwnership(db: Database): void {
  for (const table of CHARACTER_OWNED_TABLES) {
    const orphan = firstRow(
      db,
      `SELECT owned.rowid AS orphan_rowid, owned.character_id AS character_id
       FROM ${quoted(table)} AS owned
       LEFT JOIN characters ON characters.id = owned.character_id
       WHERE characters.id IS NULL
       LIMIT 1`,
    );
    if (orphan !== undefined) {
      throw new CandidateAuditError(
        `Candidate database has ${table} rowid ${String(
          orphan.orphan_rowid,
        )} owned by character ${String(
          orphan.character_id,
        )}, which does not exist.`,
      );
    }
  }
}

function auditCrossCharacterReferences(db: Database): void {
  for (const reference of CONTAMINABLE_REFERENCES) {
    const join = reference.columns
      .map(
        (column, index) =>
          `target.${quoted(
            reference.targetColumns[index] ?? 'id',
          )} = source.${quoted(column)}`,
      )
      .join(' AND ');
    // `IS NOT`, not `<>`. Every `character_id` in this schema is NOT NULL today,
    // but `<>` evaluates to NULL — and therefore does not match — the moment
    // either side is null, so a future character-owned table with a nullable
    // `character_id` would join here and silently pass. SQLite's `IS NOT` is the
    // null-safe comparison and costs nothing.
    const contaminated = firstRow(
      db,
      `SELECT source.rowid AS source_rowid,
              source.character_id AS source_character,
              target.character_id AS target_character
       FROM ${quoted(reference.table)} AS source
       JOIN ${quoted(reference.target)} AS target ON ${join}
       WHERE target.character_id IS NOT source.character_id
       LIMIT 1`,
    );
    if (contaminated !== undefined) {
      throw new CandidateAuditError(
        `Candidate database has ${reference.table} rowid ${String(
          contaminated.source_rowid,
        )} owned by character ${String(
          contaminated.source_character,
        )} referencing ${reference.target} through ` +
          `${reference.columns.join(', ')}, which belongs to character ` +
          `${String(contaminated.target_character)}.`,
      );
    }
  }
}

/**
 * The one reference in the schema with no foreign key to enforce it.
 *
 * `character_source_instances.source_definition_id` is POLYMORPHIC: which
 * `*_definitions` table it points into is decided at runtime by `source_type`,
 * which SQL cannot express — so `foreign_key_check` has nothing to check and a
 * candidate can name a definition id that does not exist anywhere.
 */
function auditPolymorphicSources(db: Database): void {
  const unknownType = firstRow(
    db,
    `SELECT id, source_type
     FROM ${quoted(POLYMORPHIC_SOURCE_TABLE)}
     WHERE source_type NOT IN (${domainSourceTypes.map(() => '?').join(', ')})
     LIMIT 1`,
    [...domainSourceTypes],
  );
  if (unknownType !== undefined) {
    throw new CandidateAuditError(
      `Candidate database has ${POLYMORPHIC_SOURCE_TABLE} id ${String(
        unknownType.id,
      )} with unsupported source_type ${JSON.stringify(
        unknownType.source_type,
      )}.`,
    );
  }

  for (const [sourceType, definitionTable] of Object.entries(
    SOURCE_REFERENCE_KIND,
  )) {
    const dangling = firstRow(
      db,
      `SELECT source.id AS id, source.source_definition_id AS definition_id
       FROM ${quoted(POLYMORPHIC_SOURCE_TABLE)} AS source
       LEFT JOIN ${quoted(definitionTable)} AS definition
         ON definition.id = source.source_definition_id
       WHERE source.source_type = ?
         AND source.source_definition_id IS NOT NULL
         AND definition.id IS NULL
       LIMIT 1`,
      [sourceType],
    );
    if (dangling !== undefined) {
      throw new CandidateAuditError(
        `Candidate database has ${POLYMORPHIC_SOURCE_TABLE} id ${String(
          dangling.id,
        )} of type ${sourceType} referencing ${definitionTable} id ` +
          `${String(dangling.definition_id)}, which does not exist.`,
      );
    }
  }
}

/**
 * Walks a child → parent map looking for a node that is its own ancestor.
 *
 * Shared by the live-table pass and the in-snapshot pass so the two cannot
 * disagree about what a cycle is.
 */
function assertNoParentCycle(
  parents: ReadonlyMap<number, number>,
  describe: (id: number) => string,
): void {
  for (const start of parents.keys()) {
    const seen = new Set<number>([start]);
    let current = parents.get(start);
    while (current !== undefined) {
      if (seen.has(current)) {
        throw new CandidateAuditError(describe(current));
      }
      seen.add(current);
      current = parents.get(current);
    }
  }
}

/**
 * A source instance that is its own ancestor.
 *
 * `parent_source_instance_id` is a self-reference, so a cycle is a perfectly
 * valid foreign-key graph and an infinite loop for every consumer that walks
 * it. The portable-backup validator already refuses one
 * (`topologicalSources`); a whole-image restore had no equivalent.
 */
function auditSourceParentGraph(db: Database): void {
  const rows: ReadonlyArray<Record<string, SqlValue>> = db.selectObjects(
    `SELECT id, parent_source_instance_id AS parent
     FROM ${quoted(POLYMORPHIC_SOURCE_TABLE)}
     WHERE parent_source_instance_id IS NOT NULL`,
  );
  assertNoParentCycle(
    new Map(rows.map((row) => [Number(row.id), Number(row.parent)])),
    (id) =>
      `Candidate database has a ${POLYMORPHIC_SOURCE_TABLE} parent cycle ` +
      `reaching id ${String(id)}.`,
  );
}

/**
 * Every classified JSON column of every live table decodes to what its readers
 * require.
 *
 * WHY THIS IS A SEPARATE PASS FROM THE ROW CONTRACTS. The row contracts run over
 * rows inside a save-point snapshot, because those become INSERT statements. The
 * LIVE tables of a candidate image were never inspected at all, and several of
 * them hold JSON that only a reader ever parses: `character_operations`
 * .inverse_command, `change_log.previous_value` / `new_value`,
 * `character_rule_overrides.value`, `character_source_instances.config` and the
 * slot JSON. A candidate carrying garbage in any of those installs cleanly and
 * then throws at the point of use — `parseInverse`, `operation-history`,
 * `jsonRecord` — long after the restore, where the user has no way to connect
 * the failure to the image they imported.
 *
 * The classification and the verdict both come from
 * `src/domain/contracts/json-columns.ts`, the same module the portable-backup
 * contracts use, so an image and a document cannot be held to different
 * standards.
 */
function auditJsonColumns(db: Database): void {
  for (const key of JSON_COLUMN_KEYS) {
    const { table, column } = jsonColumnLocation(key);
    const fact = JSON_COLUMNS[key];
    const rows: ReadonlyArray<Record<string, SqlValue>> = db.selectObjects(
      `SELECT rowid AS row_id, ${quoted(column)} AS value
       FROM ${quoted(table)}
       WHERE ${quoted(column)} IS NOT NULL`,
    );
    for (const row of rows) {
      const error = jsonColumnError(fact, row.value);
      if (error !== null) {
        throw new CandidateAuditError(
          `Candidate database ${table} rowid ${String(
            row.row_id,
          )} column ${column} ${error}.`,
        );
      }
    }
  }
}

/**
 * The source-parent graph INSIDE one snapshot.
 *
 * `CharacterState.restore` deletes the character's rows and re-inserts exactly
 * what the snapshot holds, so a parent the snapshot does not contain is a
 * reference that cannot be satisfied, and a cycle is the same infinite loop it
 * is in a table. The portable backup enforces both through `topologicalSources`
 * — a parent that is never emitted stalls the sort and is reported as a cycle;
 * this reports the two cases separately because it can.
 */
function auditSnapshotSourceGraph(
  rows: readonly unknown[],
  label: string,
): void {
  const ids = new Set<number>(
    rows.map((row) => Number((row as Record<string, unknown>).id)),
  );
  const parents = new Map<number, number>();
  for (const [index, value] of rows.entries()) {
    const row = value as Record<string, unknown>;
    const parent = row.parent_source_instance_id;
    if (parent === null || parent === undefined) {
      continue;
    }
    const parentId = Number(parent);
    if (!ids.has(parentId)) {
      throw new CandidateAuditError(
        `${label}.character_source_instances[${index}] has parent ` +
          `${String(parentId)}, which the snapshot does not contain.`,
      );
    }
    parents.set(Number(row.id), parentId);
  }
  assertNoParentCycle(
    parents,
    (id) =>
      `${label}.character_source_instances has a parent cycle reaching id ` +
      `${String(id)}.`,
  );
}

/**
 * Save-point snapshots are stored JSON that later becomes INSERT statements.
 *
 * `CharacterState.restore` builds its column list from `Object.keys(row)` of
 * whatever the snapshot holds, exactly as the portable backup's
 * `insertPortableRow` does — so a candidate image whose save points carry
 * malformed rows is the same hazard as a malformed backup document, just
 * deferred until the user presses undo. The rows are checked here with the same
 * contracts, while the image is still quarantined.
 *
 * OWNERSHIP IS THE POINT, NOT JUST SHAPE. `restore` re-inserts every embedded
 * row with `character_id` OVERWRITTEN to the character being restored. A save
 * point owned by character 1 that embeds character 2's rows therefore MOVES
 * those rows on undo, and no SQL check can see it because the evidence is text
 * inside a column. The portable backup already refuses this through
 * `assertOwnedRows`; this is the same rule for an image.
 *
 * THE SCHEMA-VERSION GATE, AND WHY IT SKIPS RATHER THAN REJECTS.
 * `CharacterState.restore` refuses any snapshot whose `schema_version` is not
 * the current one, before it touches a single row, so a snapshot with any other
 * version CANNOT become an INSERT and is inert. Rejecting the whole image for
 * one stale save point would take a legitimate user's entire database away over
 * a save point the application already declines to restore — the data-loss
 * failure D6b warns about, in audit form. So a version mismatch skips the
 * snapshot, and the coverage claim is exact: every snapshot that can reach an
 * INSERT is audited. A hostile document gains nothing by setting a wrong
 * version, because that is precisely the value that makes the snapshot unusable.
 */
function auditSavePointSnapshots(db: Database): void {
  const savePoints: ReadonlyArray<Record<string, SqlValue>> = db.selectObjects(
    `SELECT id, character_id, snapshot
     FROM ${quoted(SAVE_POINT_TABLE)}
     ORDER BY id`,
  );
  for (const savePoint of savePoints) {
    const owner = Number(savePoint.character_id);
    const label = `Candidate database ${SAVE_POINT_TABLE} id ${String(
      savePoint.id,
    )} snapshot`;
    let decoded: unknown;
    try {
      decoded = JSON.parse(String(savePoint.snapshot));
    } catch {
      throw new CandidateAuditError(`${label} is not valid JSON.`);
    }
    if (decoded === null || typeof decoded !== 'object') {
      throw new CandidateAuditError(`${label} is not an object.`);
    }
    const snapshot = decoded as Record<string, unknown>;
    if (snapshot.schema_version !== CHARACTER_SNAPSHOT_SCHEMA_VERSION) {
      continue;
    }
    const characterError = rowContractError(
      'characters',
      snapshot.character,
      `${label}.character`,
      CHARACTER_STATE_COLUMNS,
    );
    if (characterError !== null) {
      throw new CandidateAuditError(characterError);
    }
    for (const table of CHARACTER_STATE_TABLES) {
      const rows = snapshot[table];
      if (!Array.isArray(rows)) {
        throw new CandidateAuditError(`${label}.${table} must be a list.`);
      }
      for (const [index, row] of rows.entries()) {
        const error = rowContractError(
          table,
          row,
          `${label}.${table}[${index}]`,
        );
        if (error !== null) {
          throw new CandidateAuditError(error);
        }
        const rowOwner = (row as Record<string, unknown>).character_id;
        if (rowOwner !== owner) {
          throw new CandidateAuditError(
            `${label}.${table}[${index}] belongs to character ` +
              `${String(rowOwner)}, but the save point belongs to character ` +
              `${String(owner)}.`,
          );
        }
      }
    }
    auditSnapshotSourceGraph(
      snapshot.character_source_instances as readonly unknown[],
      label,
    );
  }
}

/**
 * The passes, in order. Integrity runs first: a corrupt page would make every
 * later query report the wrong thing.
 */
export const AUDIT_PASSES = [
  { name: 'integrity', run: auditIntegrity },
  { name: 'character-ownership', run: auditCharacterOwnership },
  { name: 'cross-character-references', run: auditCrossCharacterReferences },
  { name: 'polymorphic-sources', run: auditPolymorphicSources },
  { name: 'source-parent-graph', run: auditSourceParentGraph },
  { name: 'json-columns', run: auditJsonColumns },
  { name: 'save-point-snapshots', run: auditSavePointSnapshots },
] as const satisfies readonly {
  name: string;
  run: (db: Database) => void;
}[];

/**
 * Audits a candidate database image for semantic corruption.
 *
 * Throws {@link CandidateAuditError} on the first problem found, naming the
 * table and the row. Reads only — safe against a read-only deserialized image.
 */
export function auditCandidateDatabase(db: Database): void {
  for (const pass of AUDIT_PASSES) {
    pass.run(db);
  }
}
