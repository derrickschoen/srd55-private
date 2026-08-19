#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const runnerMarker = 'DB_SIZE_AUDIT_VITE_NODE';

// The lifecycle's catalog-data migrations and application seed import
// TypeScript and raw SQL through Vite. Keep this directly runnable with Node
// while executing those real paths rather than reproducing either one here.
if (process.env[runnerMarker] !== '1') {
  const viteNode = fileURLToPath(
    new URL('../../node_modules/.bin/vite-node', import.meta.url),
  );
  const configDirectory = mkdtempSync(join(tmpdir(), 'db-size-audit-vite-'));
  const configPath = join(configDirectory, 'vite.config.mjs');
  writeFileSync(configPath, 'export default {};\n');
  try {
    const child = spawnSync(
      viteNode,
      ['--config', configPath, scriptPath, ...process.argv.slice(2)],
      {
        cwd: process.cwd(),
        env: { ...process.env, [runnerMarker]: '1' },
        stdio: 'inherit',
      },
    );
    if (child.error !== undefined) throw child.error;
    process.exitCode = child.status ?? 1;
  } finally {
    rmSync(configDirectory, { recursive: true, force: true });
  }
  process.exit(process.exitCode);
}

const [{ default: sqlite3InitModule }, { applicationSeed }, databaseModule,
  databaseLifecycleModule, catalogDataMigrationModule, queryModule,
  { default: schema }] = await Promise.all([
  import('@sqlite.org/sqlite-wasm'),
  import('../../src/db/bootstrap.ts'),
  import('../../src/db/database.ts'),
  import('../../src/db/database-lifecycle.ts'),
  import('../../src/catalog/catalog-data-migrations.ts'),
  import('../../src/db/query.ts'),
  import('../../src/db/schema.sql?raw'),
]);
const { DatabaseContext, prepareConnection } = databaseModule;
const { openDatabaseImage } = databaseLifecycleModule;
const { runCatalogDataMigrations } = catalogDataMigrationModule;
const { registerSqliteQueryEngine } = queryModule;

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const bytes = (value) => Number(value ?? 0);
const number = (value) => Number(value);
const formatBytes = (value) => `${value.toLocaleString('en-US')} B`;

function scalar(db, sql, bind) {
  return db.scalar(sql, bind);
}

function rows(db, sql, bind) {
  return db.allRaw(sql, bind);
}

function schemaTables(db) {
  return rows(
    db,
    `SELECT name
       FROM sqlite_schema
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name`,
  ).map((row) => String(row.name));
}

function tableColumns(db, table) {
  return rows(db, `PRAGMA table_info(${quoteIdentifier(table)})`).map((row) => ({
    name: String(row.name),
    type: String(row.type),
  }));
}

function dbstatObjects(db) {
  return rows(
    db,
    `SELECT stat.name,
            schema_object.type,
            schema_object.tbl_name,
            SUM(stat.pgsize) AS allocated_bytes,
            SUM(stat.payload) AS payload_bytes,
            COUNT(*) AS pages
       FROM dbstat AS stat
       LEFT JOIN sqlite_schema AS schema_object ON schema_object.name = stat.name
      GROUP BY stat.name, schema_object.type, schema_object.tbl_name
      ORDER BY allocated_bytes DESC, stat.name`,
  );
}

function measuredTables(db) {
  const tables = schemaTables(db);
  const metrics = new Map(tables.map((table) => [table, {
    table,
    rows: number(scalar(db, `SELECT COUNT(*) FROM ${quoteIdentifier(table)}`)),
    allocated_bytes: 0,
    payload_bytes: 0,
    pages: 0,
    index_bytes: 0,
  }]));
  let schemaBytes = 0;

  for (const object of dbstatObjects(db)) {
    const objectName = String(object.name);
    const tableName = object.tbl_name === null ? null : String(object.tbl_name);
    const allocatedBytes = bytes(object.allocated_bytes);
    if (objectName === 'sqlite_schema') {
      schemaBytes += allocatedBytes;
      continue;
    }
    const metric = tableName === null ? undefined : metrics.get(tableName);
    if (metric === undefined) continue;
    metric.allocated_bytes += allocatedBytes;
    metric.payload_bytes += bytes(object.payload_bytes);
    metric.pages += number(object.pages);
    if (String(object.type) === 'index') metric.index_bytes += allocatedBytes;
  }

  return {
    schema_bytes: schemaBytes,
    tables: [...metrics.values()].sort((left, right) =>
      right.allocated_bytes - left.allocated_bytes ||
      left.table.localeCompare(right.table)),
  };
}

function measuredColumns(db, tables) {
  return tables.map(({ table, allocated_bytes: allocatedBytes }) => {
    const columns = tableColumns(db, table).map(({ name, type }) => ({
      column: name,
      declared_type: type,
      value_bytes: bytes(scalar(
        db,
        `SELECT COALESCE(SUM(LENGTH(CAST(${quoteIdentifier(name)} AS BLOB))), 0)
           FROM ${quoteIdentifier(table)}`,
      )),
      non_null_values: number(scalar(
        db,
        `SELECT COUNT(${quoteIdentifier(name)}) FROM ${quoteIdentifier(table)}`,
      )),
    }));
    const measuredValueBytes = columns.reduce(
      (total, column) => total + column.value_bytes,
      0,
    );
    return {
      table,
      allocated_bytes: allocatedBytes,
      measured_value_bytes: measuredValueBytes,
      columns: columns.sort((left, right) =>
        right.value_bytes - left.value_bytes ||
        left.column.localeCompare(right.column)),
    };
  });
}

function largestValues(db, tables, limit) {
  const candidates = [];
  for (const { table } of tables) {
    for (const { name: column } of tableColumns(db, table)) {
      const largest = rows(
        db,
        `SELECT rowid AS row_id,
                LENGTH(CAST(${quoteIdentifier(column)} AS BLOB)) AS value_bytes,
                typeof(${quoteIdentifier(column)}) AS storage_type,
                substr(CAST(${quoteIdentifier(column)} AS TEXT), 1, 120) AS preview
           FROM ${quoteIdentifier(table)}
          WHERE ${quoteIdentifier(column)} IS NOT NULL
          ORDER BY value_bytes DESC, rowid
          LIMIT ?`,
        [limit],
      );
      for (const value of largest) {
        candidates.push({
          table,
          column,
          row_id: number(value.row_id),
          value_bytes: bytes(value.value_bytes),
          storage_type: String(value.storage_type),
          preview: String(value.preview).replaceAll(/\s+/gu, ' ').trim(),
        });
      }
    }
  }
  return candidates.sort((left, right) =>
    right.value_bytes - left.value_bytes ||
    left.table.localeCompare(right.table) ||
    left.column.localeCompare(right.column) ||
    left.row_id - right.row_id).slice(0, limit);
}

function timestampColumns(db) {
  return schemaTables(db).flatMap((table) =>
    tableColumns(db, table)
      .filter(({ name }) => name.endsWith('_at'))
      .map(({ name }) => {
        const info = rows(
          db,
          `PRAGMA table_info(${quoteIdentifier(table)})`,
        ).find((row) => String(row.name) === name);
        return {
          table,
          column: name,
          not_null: number(info?.notnull) === 1,
          value_bytes: bytes(scalar(
            db,
            `SELECT COALESCE(SUM(LENGTH(CAST(${quoteIdentifier(name)} AS BLOB))), 0)
               FROM ${quoteIdentifier(table)}`,
          )),
          non_null_values: number(scalar(
            db,
            `SELECT COUNT(${quoteIdentifier(name)}) FROM ${quoteIdentifier(table)}`,
          )),
        };
      }),
  );
}

function seedProfile(db, tableMetrics) {
  const fingerprintGroups = rows(
    db,
    `SELECT fingerprint_scheme, fingerprint_role, COUNT(*) AS rows,
            SUM(LENGTH(CAST(canonical_json AS BLOB))) AS canonical_json_bytes
       FROM catalog_content_fingerprints
      GROUP BY fingerprint_scheme, fingerprint_role
      ORDER BY fingerprint_scheme, fingerprint_role`,
  ).map((row) => ({
    fingerprint_scheme: String(row.fingerprint_scheme),
    fingerprint_role: String(row.fingerprint_role),
    rows: number(row.rows),
    canonical_json_bytes: bytes(row.canonical_json_bytes),
  }));
  const provenanceGroups = rows(
    db,
    `SELECT identity.catalog_layer, provenance.origin_kind,
            provenance.received, provenance.local_derivation, COUNT(*) AS rows
       FROM catalog_content_provenance AS provenance
       JOIN catalog_content_identities AS identity
         ON identity.content_kind = provenance.content_kind
        AND identity.content_key = provenance.content_key
      GROUP BY identity.catalog_layer, provenance.origin_kind,
               provenance.received, provenance.local_derivation
      ORDER BY identity.catalog_layer, provenance.origin_kind`,
  ).map((row) => ({
    catalog_layer: String(row.catalog_layer),
    origin_kind: String(row.origin_kind),
    received: number(row.received),
    local_derivation: number(row.local_derivation),
    rows: number(row.rows),
  }));
  const grantRuleGroups = rows(
    db,
    `SELECT grant_rules, COUNT(*) AS uses,
            LENGTH(CAST(grant_rules AS BLOB)) AS value_bytes
       FROM class_progressions
      WHERE grant_rules IS NOT NULL
      GROUP BY grant_rules`,
  );
  const canonicalRows = rows(
    db,
    'SELECT canonical_json FROM catalog_content_fingerprints',
  );
  const encoder = new TextEncoder();
  let jsonWhitespaceBytes = 0;
  for (const row of canonicalRows) {
    const raw = String(row.canonical_json);
    const minified = JSON.stringify(JSON.parse(raw));
    jsonWhitespaceBytes += encoder.encode(raw).byteLength -
      encoder.encode(minified).byteLength;
  }
  const emptyTables = tableMetrics.filter((table) => table.rows === 0);
  return {
    fingerprint_groups: fingerprintGroups,
    provenance_groups: provenanceGroups,
    fingerprint_json_whitespace_bytes: jsonWhitespaceBytes,
    inactive_spell_versions: number(scalar(
      db,
      'SELECT COUNT(*) FROM spell_versions WHERE is_active <> 1',
    )),
    spell_identities_without_versions: number(scalar(
      db,
      `SELECT COUNT(*) FROM spell_identities AS identity
        WHERE NOT EXISTS (
          SELECT 1 FROM spell_versions AS version
           WHERE version.spell_identity_id = identity.id
        )`,
    )),
    spell_identities_with_multiple_versions: number(scalar(
      db,
      `SELECT COUNT(*) FROM (
         SELECT spell_identity_id
           FROM spell_versions
          GROUP BY spell_identity_id
         HAVING COUNT(*) > 1
       )`,
    )),
    foreign_key_violations: rows(db, 'PRAGMA foreign_key_check').length,
    empty_tables: emptyTables.length,
    empty_table_allocated_bytes: emptyTables.reduce(
      (total, table) => total + table.allocated_bytes,
      0,
    ),
    class_progression_grant_rules: {
      rows_with_value: grantRuleGroups.reduce(
        (total, row) => total + number(row.uses),
        0,
      ),
      distinct_values: grantRuleGroups.length,
      current_value_bytes: grantRuleGroups.reduce(
        (total, row) => total + number(row.uses) * bytes(row.value_bytes),
        0,
      ),
      one_copy_each_bytes: grantRuleGroups.reduce(
        (total, row) => total + bytes(row.value_bytes),
        0,
      ),
    },
  };
}

function counterfactual(sqlite3, image, name, statements) {
  const connection = openDatabaseImage(sqlite3, image, { readonly: false });
  try {
    prepareConnection(connection);
    for (const statement of statements) connection.exec(statement);
    connection.exec('VACUUM');
    return {
      name,
      image_bytes: sqlite3.capi.sqlite3_js_db_export(connection).byteLength,
    };
  } finally {
    connection.close();
  }
}

function seededAtPageSize(sqlite3, schema, pageSize) {
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    connection.exec(`PRAGMA page_size = ${String(pageSize)}`);
    prepareConnection(connection);
    connection.exec(schema);
    const db = new DatabaseContext(connection);
    runCatalogDataMigrations(db);
    applicationSeed(db);
    return {
      name: `${String(pageSize / 1024)} KiB SQLite pages`,
      image_bytes: sqlite3.capi.sqlite3_js_db_export(connection).byteLength,
      page_size: number(connection.selectValue('PRAGMA page_size')),
      page_count: number(connection.selectValue('PRAGMA page_count')),
    };
  } finally {
    connection.close();
  }
}

function printText(report) {
  process.stdout.write(
    `Seeded application database: ${formatBytes(report.image_bytes)} ` +
      `(${String(report.page_count)} pages x ${String(report.page_size)} B)\n` +
      `Rows: ${report.total_rows.toLocaleString('en-US')} across ` +
      `${String(report.tables.length)} application tables; ` +
      `freelist: ${formatBytes(report.freelist_bytes)}\n\n` +
      'Per-table allocated bytes (table b-tree plus indexes):\n',
  );
  for (const table of report.tables) {
    process.stdout.write(
      `${table.table}\t${String(table.rows)} rows\t` +
        `${String(table.allocated_bytes)} B\t` +
        `${String(table.payload_bytes)} payload B\t` +
        `${String(table.index_bytes)} index B\n`,
    );
  }

  process.stdout.write('\nPer-column logical value bytes for top 10 tables:\n');
  for (const table of report.column_bytes
    .filter((candidate) => candidate.measured_value_bytes > 0)
    .slice(0, 10)) {
    process.stdout.write(
      `${table.table}\t${String(table.measured_value_bytes)} measured value B\n`,
    );
    for (const column of table.columns) {
      const share = table.measured_value_bytes === 0
        ? 0
        : column.value_bytes / table.measured_value_bytes * 100;
      process.stdout.write(
        `  ${column.column}\t${String(column.value_bytes)} B\t` +
          `${share.toFixed(1)}%\n`,
      );
    }
  }

  process.stdout.write('\nTop 20 largest individual values:\n');
  for (const value of report.largest_values) {
    process.stdout.write(
      `${String(value.value_bytes)} B\t${value.table}.${value.column}` +
        ` rowid=${String(value.row_id)}\t${JSON.stringify(value.preview)}\n`,
    );
  }

  process.stdout.write('\nIsolated packed-image counterfactuals:\n');
  for (const candidate of report.counterfactuals) {
    const saved = report.counterfactual_baseline_bytes - candidate.image_bytes;
    process.stdout.write(
      `${candidate.name}\t${String(candidate.image_bytes)} B\t` +
        `${String(saved)} B saved vs packed baseline\n`,
    );
  }
}

const json = process.argv.includes('--json');
const sqlite3 = await sqlite3InitModule();
registerSqliteQueryEngine(sqlite3);
const connection = new sqlite3.oo1.DB(':memory:', 'c');
try {
  prepareConnection(connection);
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  runCatalogDataMigrations(db);
  applicationSeed(db);

  // Serialize exactly the post-seed image. No VACUUM is applied: this is the
  // image a clone implementation would receive from sqlite3_js_db_export().
  const image = sqlite3.capi.sqlite3_js_db_export(connection).slice();
  const tableMeasurement = measuredTables(db);
  const columnBytes = measuredColumns(db, tableMeasurement.tables);
  const timestamps = timestampColumns(db);
  const pageSize = number(scalar(db, 'PRAGMA page_size'));
  const pageCount = number(scalar(db, 'PRAGMA page_count'));
  const freelistCount = number(scalar(db, 'PRAGMA freelist_count'));
  const report = {
    generated_at: new Date().toISOString(),
    measurement: {
      seed: 'catalog data migrations, then src/db/bootstrap.ts applicationSeed(full)',
      serialization: 'sqlite3_js_db_export before VACUUM',
      table_bytes: 'dbstat allocated pages, including each table index',
      column_bytes: 'SUM(LENGTH(CAST(column AS BLOB)))',
    },
    image_bytes: image.byteLength,
    page_size: pageSize,
    page_count: pageCount,
    schema_bytes: tableMeasurement.schema_bytes,
    freelist_pages: freelistCount,
    freelist_bytes: freelistCount * pageSize,
    total_rows: tableMeasurement.tables.reduce(
      (total, table) => total + table.rows,
      0,
    ),
    tables: tableMeasurement.tables,
    column_bytes: columnBytes,
    largest_values: largestValues(db, tableMeasurement.tables, 20),
    timestamp_columns: timestamps,
    seed_profile: seedProfile(db, tableMeasurement.tables),
  };

  const timestampStatements = timestamps
    .filter((column) => column.non_null_values > 0)
    .map((column) =>
      `UPDATE ${quoteIdentifier(column.table)} ` +
      `SET ${quoteIdentifier(column.column)} = ` +
      `${column.not_null ? "'0'" : 'NULL'}`,
    );
  const packedBaseline = counterfactual(
    sqlite3,
    image,
    'packed baseline (VACUUM only)',
    [],
  );
  report.counterfactual_baseline_bytes = packedBaseline.image_bytes;
  report.counterfactuals = [
    packedBaseline,
    seededAtPageSize(sqlite3, schema, 4096),
    seededAtPageSize(sqlite3, schema, 2048),
    counterfactual(
      sqlite3,
      image,
      'omit bundled fingerprint canonical_json values',
      ["UPDATE catalog_content_fingerprints SET canonical_json = ''"],
    ),
    counterfactual(
      sqlite3,
      image,
      'omit bundled provenance rows',
      [
        `DELETE FROM catalog_content_provenance
          WHERE (content_kind, content_key) IN (
            SELECT content_kind, content_key
              FROM catalog_content_identities
             WHERE catalog_layer = 'bundled'
          )`,
      ],
    ),
    counterfactual(
      sqlite3,
      image,
      'remove/minimize seeded timestamps',
      timestampStatements,
    ),
    counterfactual(
      sqlite3,
      image,
      'omit spell-list membership timestamps',
      [
        `UPDATE spell_list_memberships
            SET created_at = NULL, updated_at = NULL`,
      ],
    ),
    counterfactual(
      sqlite3,
      image,
      'normalize repeated class progression grant_rules (lower bound)',
      [
        `CREATE TABLE audit_class_progression_grant_rules (
           id INTEGER PRIMARY KEY,
           grant_rules TEXT NOT NULL UNIQUE
         )`,
        `INSERT INTO audit_class_progression_grant_rules (grant_rules)
         SELECT DISTINCT grant_rules FROM class_progressions
          WHERE grant_rules IS NOT NULL`,
        'UPDATE class_progressions SET grant_rules = NULL',
      ],
    ),
  ];

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printText(report);
  }
} finally {
  connection.close();
}
