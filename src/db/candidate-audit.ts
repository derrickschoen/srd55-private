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
  armorDexBonusPairError,
  effectPayloadKindError,
  slotExclusiveAssignmentError,
  uniqueRowIdError,
  weaponMasterySelectionError,
} from '../domain/contracts/row-rules';
import {
  JSON_COLUMNS,
  JSON_COLUMN_KEYS,
  jsonColumnError,
  jsonColumnLocation,
} from '../domain/contracts/json-columns';
import {
  CHARACTER_SNAPSHOT_SCHEMA_VERSION,
  snapshotCharacterColumnsFor,
  snapshotSchemaVersion,
  snapshotTablesFor,
} from '../character/character-state';
import { FOREIGN_KEY_FACTS } from '../domain/contracts/generated/reference-facts';
import { domainSourceTypes } from '../domain/enums';
import { splitLegacyTraitEffect } from '../rules/legacy-trait-effects';
import { migrateLegacyWeaponDamageRow } from '../domain/weapon-damage';
import { migrateLegacyWeaponRangeRow } from '../domain/weapon-range';
import { fillHistoricalRowColumns } from '../domain/contracts/historical-row-columns';
import {
  legacyArmorClassAdjustmentError,
  splitLegacyArmorClassAdjustment,
} from '../rules/legacy-armor-class-adjustment';

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
 *
 * SECURITY BOUNDARY.
 * This pass rejects manifest members that are structurally impossible or
 * inconsistent with live relations. It does not authenticate an imported
 * image and cannot detect a forged allocation history. In particular,
 * `sqlite_sequence` is candidate-owned evidence: its usable high-water mark is
 * retained as a corruption signal, never treated as proof of provenance.
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
const ARCHIVE_MEMBER_TABLE = 'catalog_content_archive_members' satisfies AnyTableName;

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
 * Returns a usable allocator high-water mark, or null when the candidate does
 * not carry one we can safely interpret. An absent row, a reset/non-positive
 * value, a non-number, an unsafe integer, or a value below a live character id
 * all make the detector unavailable. None is converted to zero: doing that
 * falsely refuses legitimately deleted archive members.
 */
function characterAllocationHighWater(db: Database): number | null {
  const value = db.selectValue(
    "SELECT seq FROM sqlite_sequence WHERE name = 'characters'",
  );
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    return null;
  }
  const liveMaximum = db.selectValue('SELECT max(id) FROM characters');
  if (
    typeof liveMaximum === 'number' &&
    Number.isSafeInteger(liveMaximum) &&
    value < liveMaximum
  ) {
    return null;
  }
  return value;
}

/**
 * An archive manifest intentionally has no character foreign key: deleting an
 * archived character must leave the promise behind so restore can name the
 * missing member. Whole-image import therefore validates the semantics SQLite
 * cannot express.
 *
 * This pass rejects manifest members that are structurally impossible or
 * inconsistent with live relations. It does not authenticate an imported
 * image and cannot detect a forged allocation history. When the candidate has
 * a usable `characters` allocator high-water mark, ids above it are rejected
 * as corruption. When that candidate-owned signal is unavailable, live
 * relation checks still run but historical allocation is deliberately not
 * inferred.
 */
function auditArchiveManifests(db: Database): void {
  const characterHighWater = characterAllocationHighWater(db);
  const rows: ReadonlyArray<Record<string, SqlValue>> = db.selectObjects(
    `SELECT member.rowid AS row_id,
            member.content_kind,
            member.content_key,
            member.character_id,
            member.archived_at AS member_archived_at,
            identity.archived_at AS content_archived_at,
            character.id AS current_character_id,
            character.archived_at AS character_archived_at,
            CASE member.content_kind
              WHEN 'species' THEN EXISTS (
                SELECT 1
                FROM character_source_instances AS source
                JOIN species_definitions AS definition
                  ON definition.id = source.source_definition_id
                WHERE source.character_id = member.character_id
                  AND source.source_type = 'species'
                  AND source.state = 'active'
                  AND definition.content_key = member.content_key
              )
              WHEN 'background' THEN EXISTS (
                SELECT 1
                FROM character_source_instances AS source
                JOIN background_definitions AS definition
                  ON definition.id = source.source_definition_id
                WHERE source.character_id = member.character_id
                  AND source.source_type = 'background'
                  AND source.state = 'active'
                  AND definition.content_key = member.content_key
              )
              WHEN 'subclass' THEN EXISTS (
                SELECT 1
                FROM character_class_levels AS level
                JOIN subclass_definitions AS definition
                  ON definition.id = level.subclass_definition_id
                WHERE level.character_id = member.character_id
                  AND definition.content_key = member.content_key
              )
            END AS references_manifested_creation
     FROM ${quoted(ARCHIVE_MEMBER_TABLE)} AS member
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = member.content_kind
      AND identity.content_key = member.content_key
     LEFT JOIN characters AS character ON character.id = member.character_id
     ORDER BY member.content_kind, member.content_key, member.character_id`,
  );
  for (const row of rows) {
    const label = `Candidate database ${ARCHIVE_MEMBER_TABLE} rowid ${String(
      row.row_id,
    )}`;
    if (row.content_archived_at !== row.member_archived_at) {
      throw new CandidateAuditError(
        `${label} does not match the manifested creation archive timestamp.`,
      );
    }
    const characterId = Number(row.character_id);
    if (row.current_character_id === null) {
      if (
        characterHighWater !== null &&
        characterId > characterHighWater
      ) {
        throw new CandidateAuditError(
          `${label} names character ${String(characterId)}, which this database ` +
            'has never allocated.',
        );
      }
      continue;
    }
    if (row.character_archived_at !== row.member_archived_at) {
      throw new CandidateAuditError(
        `${label} names character ${String(characterId)} with a different ` +
          'archive timestamp.',
      );
    }
    if (Number(row.references_manifested_creation) !== 1) {
      throw new CandidateAuditError(
        `${label} names character ${String(characterId)}, which does not ` +
          'reference the manifested creation.',
      );
    }
  }
}

/**
 * The character-owned tables whose `character_id` is NOT backed by a foreign key
 * to `characters` — i.e. the tables for which {@link auditCharacterOwnership} is
 * the ONLY thing standing between a candidate image and an orphan row.
 *
 * Derived from the generated foreign-key facts rather than asserted, and
 * **EMPTY on the schema as it stands**. That emptiness is the honest statement
 * of what the ownership pass buys today: NOTHING. It is not a second opinion
 * about anything; `PRAGMA foreign_key_check` — which `auditIntegrity` runs
 * first, and which `validateDatabaseConnection` has already run before that —
 * reaches every orphan this pass could find, and reaches it first.
 *
 * `tests/unit/db/candidate-audit.test.ts` asserts this list is empty, so the
 * claim above is checked rather than commented. The day someone adds a
 * character-owned table without that foreign key, the list stops being empty,
 * the test fails, and whoever reads it learns that the pass has become load
 * bearing.
 */
export const UNENFORCED_OWNERSHIP_TABLES: readonly OwnedWithCharacterId[] =
  CHARACTER_OWNED_TABLES.filter(
    (table) =>
      !FOREIGN_KEY_FACTS.some(
        (fact) =>
          fact.table === table &&
          fact.target === 'characters' &&
          (fact.columns as readonly string[]).includes('character_id'),
      ),
  );

/**
 * Every character-owned row belongs to a character that exists.
 *
 * WHAT THIS PASS CURRENTLY BUYS, STATED SO NOBODY OVER-READS IT: nothing.
 * {@link UNENFORCED_OWNERSHIP_TABLES} is empty, so on this schema every orphan
 * it could report is already refused by `PRAGMA foreign_key_check` in
 * `auditIntegrity`, one pass earlier — and by `validateDatabaseConnection`
 * before the audit is even entered. It has never rejected an image that would
 * otherwise have been accepted, and deleting it today would turn no test red
 * except the one below that calls it directly.
 *
 * WHY IT IS KEPT ANYWAY, AS FUTURE-PROOFING AND NOT AS A GUARANTEE: the audit is
 * contracted on the CLASSIFICATION, not on the foreign keys.
 * `character_source_instances.source_definition_id` is proof that this schema
 * does declare references with no FK behind them, so a character-owned table
 * added the same way would be covered here with no edit. It is scanned over the
 * whole of `CHARACTER_OWNED_TABLES` rather than over the (empty) unenforced
 * subset deliberately: a pass that iterates an empty list is a pass no test can
 * exercise, and `tests/unit/db/candidate-audit.test.ts` calls this function
 * directly on a real orphan to prove the mechanism works.
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
 * Relations whose existence/ownership SQLite can prove, but whose domain
 * meaning it cannot: an occurrence may only name a class level already held,
 * and its optional source must actually be a feat source.
 */
function auditLevelFeatChoices(db: Database): void {
  const futureOccurrence = firstRow(
    db,
    `SELECT choice.id AS id, choice.class_level AS class_level,
            held.level AS held_level
     FROM character_level_feat_choices AS choice
     JOIN character_class_levels AS held
       ON held.id = choice.character_class_level_id
      AND held.character_id = choice.character_id
     WHERE choice.class_level > held.level
     LIMIT 1`,
  );
  if (futureOccurrence !== undefined) {
    throw new CandidateAuditError(
      `Candidate database has character_level_feat_choices id ${String(
        futureOccurrence.id,
      )} at class level ${String(futureOccurrence.class_level)}, but the ` +
        `referenced class is held only at level ${String(
          futureOccurrence.held_level,
        )}.`,
    );
  }

  const nonFeatSource = firstRow(
    db,
    `SELECT choice.id AS id, source.source_type AS source_type
     FROM character_level_feat_choices AS choice
     JOIN character_source_instances AS source
       ON source.id = choice.feat_source_instance_id
      AND source.character_id = choice.character_id
     WHERE choice.feat_source_instance_id IS NOT NULL
       AND source.source_type != 'feat'
     LIMIT 1`,
  );
  if (nonFeatSource !== undefined) {
    throw new CandidateAuditError(
      `Candidate database has character_level_feat_choices id ${String(
        nonFeatSource.id,
      )} referencing a ${String(nonFeatSource.source_type)} source instead of ` +
        `a feat source.`,
    );
  }
}

/**
 * Walks a child → parent map looking for a node that is its own ancestor.
 *
 * Shared by the live-table pass and the in-snapshot pass so the two cannot
 * disagree about what a cycle is.
 *
 * LINEAR, AND WHY IT HAD TO BECOME SO. The obvious version — a fresh visited set
 * per start node — re-walks the whole ancestor chain from every key, which is
 * O(N²) on the one shape an attacker controls completely: a single parent chain.
 * Measured on this code before the change, with a chain of N source instances in
 * one image and the identical rows with no parent as the linear control:
 *
 *     N       chained     control    excess
 *     3,000   116.9 ms     3.3 ms     113.5 ms
 *     6,000   628.9 ms     5.2 ms     623.7 ms
 *    12,000  3,349.0 ms    9.5 ms   3,339.5 ms
 *    24,000 16,574.1 ms   18.8 ms  16,555.4 ms
 *
 * — 4.96× to 5.49× per doubling, and a single 5.6 MB image with a 50,000-long
 * chain blocked the audit for 80.5 SECONDS. `validateBytes` is synchronous and
 * runs inside the one dedicated worker (`src/main.ts`), so that is 80 seconds
 * during which every other RPC is queued behind it. `auditSavePointSnapshots`
 * calls this once per save point as well, so the attacker also gets a free
 * (1 + K) multiplier by adding save points.
 *
 * `settled` is the fix: a node is added to it once its whole ancestor chain has
 * been proved to terminate, and any later walk that reaches a settled node
 * stops. Every node is therefore pushed onto a path at most once and the total
 * work is O(N). It cannot hide a cycle: a node only becomes settled on a walk
 * that ENDED — a walk that reaches a cycle throws instead, so no node on a
 * cyclic chain is ever settled, and the id reported is the same one the
 * per-start version reported.
 *
 * `tests/unit/db/candidate-audit.test.ts` counts map lookups rather than
 * measuring time, so the guard fails deterministically rather than depending on
 * how loaded the machine is.
 */
export function assertNoParentCycle(
  parents: ReadonlyMap<number, number>,
  describe: (id: number) => string,
): void {
  const settled = new Set<number>();
  for (const start of parents.keys()) {
    if (settled.has(start)) {
      continue;
    }
    const path: number[] = [];
    const onPath = new Set<number>();
    let current: number | undefined = start;
    while (current !== undefined && !settled.has(current)) {
      if (onPath.has(current)) {
        throw new CandidateAuditError(describe(current));
      }
      onPath.add(current);
      path.push(current);
      current = parents.get(current);
    }
    for (const node of path) {
      settled.add(node);
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
 * THE THREE RULES THE ROW CONTRACT CANNOT SEE, AND WHY REJECTING IS SAFE HERE.
 * A per-row contract validates one row against one column list, so it is blind
 * to a rule about a LIST of rows and to a rule about two columns TOGETHER. All
 * of those exist, all were already implemented for the portable document, and
 * all are now imported from `../domain/contracts/row-rules.ts` rather than
 * written twice:
 *
 *  1. two snapshot rows sharing one `id`. `restore` re-inserts them verbatim
 *     into a table whose `id` is a PRIMARY KEY, so undo dies with
 *     `SQLITE_CONSTRAINT_PRIMARYKEY`;
 *  2. a `spell_selection_slots` row carrying BOTH `fixed_spell_version_id` and
 *     `current_spell_version_id`. The live table cannot hold that pair — named
 *     CHECK `spell_slots_exclusive_assignment_check` plus the triggers in
 *     `db/schema/triggers.sql` — so the row can only exist inside the JSON, and
 *     undo dies with `SQLITE_CONSTRAINT_TRIGGER`;
 *  3. a `character_weapons` row with `mastery_selected` set and no
 *     `mastery_property`. Named CHECK
 *     `character_weapons_mastery_requires_property_check`, so again the live
 *     table cannot hold the pair and undo would die with
 *     `SQLITE_CONSTRAINT_CHECK`.
 *
 * These are REJECTED rather than skipped, and the D6b data-loss objection does
 * not apply to any of them, because none can occur in an image this application
 * produced: a snapshot is `SELECT * … WHERE character_id = ? ORDER BY id` over
 * a table with a PRIMARY KEY, and the other two pairs are refused by the storage
 * layer on every INSERT and UPDATE. An image containing one was hand-made.
 *
 * WHAT IS DELIBERATELY NOT CHECKED: AN INACTIVE SPELL VERSION.
 * `CharacterState.validateSnapshot` also refuses a snapshot whose slot or
 * spellbook rows reference a `spell_versions` row with `is_active = 0`. The
 * audit does NOT mirror that one, and the asymmetry is the point: unlike the two
 * above, this state IS reachable in a legitimate user's own database.
 * `CatalogImporter` tombstones a version — `SET is_active = 0`
 * (`src/catalog/catalog-importer.ts:266`) — whenever a re-import stops naming
 * its `content_key`, and every save point captured before that keeps referencing
 * it. Rejecting the image would mean a user who imported a catalog update could
 * no longer restore their own backup: the whole database refused over save
 * points that predate a catalog change. That is exactly the destructive failure
 * D6b names.
 *
 * The skip is inert, for the same reason the schema-version skip is:
 * `CharacterState.restore` calls `validateSnapshot` BEFORE it opens the
 * transaction, so the snapshot cannot become an INSERT — undo declines and the
 * character's rows are untouched. `tests/unit/db/candidate-audit.test.ts` proves
 * both halves: the audit accepts the image, and the restore refuses the snapshot
 * without changing a row.
 *
 * THE SCHEMA-VERSION GATE, AND WHY IT SKIPS RATHER THAN REJECTS.
 * `CharacterState.restore` refuses any snapshot whose `schema_version` is not
 * one this build can READ (`CHARACTER_SNAPSHOT_SCHEMA_VERSIONS`), before it
 * touches a single row, so a snapshot with any other version CANNOT become an
 * INSERT and is inert. Rejecting the whole image for one unreadable save point
 * would take a legitimate user's entire database away over a save point the
 * application already declines to restore — the data-loss failure D6b warns
 * about, in audit form. So an unknown version skips the snapshot, and the
 * coverage claim is exact: every snapshot that can reach an INSERT is audited,
 * for every rule whose violation this application could not itself have
 * produced. A hostile document gains nothing by setting a wrong version, because
 * that is precisely the value that makes the snapshot unusable.
 *
 * A READABLE-BUT-OLDER version is a different case and is NOT skipped. `a7-v1`
 * still restores, so its rows still become INSERTs and still have to be audited
 * — against the tables `a7-v1` carries, which is what `snapshotTablesFor`
 * supplies. Auditing it against today's table set instead would reject the image
 * for a `character_weapons` key that no `a7-v1` snapshot has ever had.
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
    const version = snapshotSchemaVersion(snapshot.schema_version);
    if (version === null) {
      continue;
    }
    // EVERY READABLE VERSION IS AUDITED, AT ITS OWN TABLE SET.
    //
    // The skip above is for versions `restore` cannot use at all. A version it
    // CAN use must be audited, and must be audited against the tables that
    // version carries — holding an `a7-v1` snapshot to the `a7-v2` table set
    // would reject a legitimate user's whole database over a save point that
    // predates weapons, which is the D6b failure this pass exists to avoid.
    const tables = snapshotTablesFor(version);
    // Columns, like tables, are audited at the VERSION'S OWN set: a pre-v8
    // save point predates `ability_allocation_method`, and holding it to
    // today's column list would reject a legitimate user's whole database.
    const characterError = rowContractError(
      'characters',
      snapshot.character,
      `${label}.character`,
      snapshotCharacterColumnsFor(version),
    );
    if (characterError !== null) {
      throw new CandidateAuditError(characterError);
    }
    for (const table of tables) {
      const rows = snapshot[table];
      if (!Array.isArray(rows)) {
        throw new CandidateAuditError(`${label}.${table} must be a list.`);
      }
      for (const [index, row] of rows.entries()) {
        const rowLabel = `${label}.${table}[${index}]`;
        // A save point written before the effect model was inverted carries the
        // five retired `effect_*` keys on every trait row, and the row contract
        // is `z.strictObject`. Auditing the STRIPPED row is the same call
        // `validateCharacterRows` makes for a backup document, and for the same
        // reason: the image is a user's own database and refusing it over a key
        // this build simply stopped using would take the app away rather than
        // protect it. `CharacterState.restore` migrates the payload.
        const legacy =
          table === 'character_species_traits'
            ? splitLegacyTraitEffect(row as Record<string, unknown>)
            : null;
        // Hold every row to the same reconciliation `CharacterState.restore`
        // will apply. Otherwise the audit can refuse a historical row over a
        // nullable column it predates even though restore accepts that row.
        const migrated =
          table === 'character_weapons'
            ? migrateLegacyWeaponRangeRow(
                migrateLegacyWeaponDamageRow(
                  row as Record<string, unknown>,
                ),
              )
            : (row as Record<string, unknown>);
        if (table === 'character_sheet_adjustments') {
          const adjustmentError = legacyArmorClassAdjustmentError(
            migrated,
            rowLabel,
          );
          if (adjustmentError !== null) {
            throw new CandidateAuditError(adjustmentError);
          }
        }
        const retired =
          table === 'character_sheet_adjustments'
            ? splitLegacyArmorClassAdjustment(migrated)?.row ?? migrated
            : table === 'character_items' && Object.hasOwn(migrated, 'attuned')
              ? Object.fromEntries(
                  Object.entries(migrated).filter(([key]) => key !== 'attuned'),
                )
            : migrated;
        const reconciled = fillHistoricalRowColumns(
          table,
          retired,
          version !== CHARACTER_SNAPSHOT_SCHEMA_VERSION,
        );
        const error = rowContractError(
          table,
          legacy?.row ?? reconciled,
          rowLabel,
        );
        if (error !== null) {
          throw new CandidateAuditError(error);
        }
        if (legacy?.effect != null) {
          // The migrated payload, held to the rules of the table
          // `CharacterState.restore` is about to insert it into — the same
          // check `validateCharacterRows` makes for a backup document, for the
          // reason this file already gives for weapons and armour.
          const payload = effectPayloadKindError(legacy.effect, rowLabel);
          if (payload !== null) {
            throw new CandidateAuditError(payload);
          }
        }
        if (table === 'character_effects') {
          const payload = effectPayloadKindError(
            reconciled,
            rowLabel,
          );
          if (payload !== null) {
            throw new CandidateAuditError(payload);
          }
        }
        const rowOwner = (row as Record<string, unknown>).character_id;
        if (rowOwner !== owner) {
          throw new CandidateAuditError(
            `${rowLabel} belongs to character ` +
              `${String(rowOwner)}, but the save point belongs to character ` +
              `${String(owner)}.`,
          );
        }
        if (table === 'spell_selection_slots') {
          const exclusivity = slotExclusiveAssignmentError(
            row as Record<string, unknown>,
            rowLabel,
          );
          if (exclusivity !== null) {
            throw new CandidateAuditError(exclusivity);
          }
        }
        if (table === 'character_weapons') {
          const mastery = weaponMasterySelectionError(
            row as Record<string, unknown>,
            rowLabel,
          );
          if (mastery !== null) {
            throw new CandidateAuditError(mastery);
          }
        }
        if (table === 'character_armor') {
          const pairing = armorDexBonusPairError(
            row as Record<string, unknown>,
            rowLabel,
          );
          if (pairing !== null) {
            throw new CandidateAuditError(pairing);
          }
        }
      }
      const duplicateId = uniqueRowIdError(
        rows as readonly Record<string, unknown>[],
        `${label}.${table}`,
        new Set<number>(),
      );
      if (duplicateId !== null) {
        throw new CandidateAuditError(duplicateId);
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
  { name: 'archive-manifests', run: auditArchiveManifests },
  { name: 'character-ownership', run: auditCharacterOwnership },
  { name: 'cross-character-references', run: auditCrossCharacterReferences },
  { name: 'polymorphic-sources', run: auditPolymorphicSources },
  { name: 'level-feat-choices', run: auditLevelFeatChoices },
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
