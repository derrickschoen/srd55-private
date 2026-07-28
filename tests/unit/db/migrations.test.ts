import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Database,
  Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import {
  DatabaseLifecycle,
  databaseSchemaSignature,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import type { DatabaseContext } from '../../../src/db/database';
import {
  DATABASE_MIGRATIONS,
  databaseSchemaChecksum,
  type DatabaseMigration,
} from '../../../src/db/migrations';
import { sha256 } from '../../../src/crypto/sha256';
import { verifyMigrations } from '../../../scripts/verify-migrations';
import { bootDatabase } from '../../../src/worker/boot';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const FIRST_INDEX =
  'CREATE INDEX migration_probe_first ON characters(name);';
const SECOND_INDEX =
  'CREATE INDEX migration_probe_second ON characters(notes);';
const REFERENCED_TABLES = `
CREATE TABLE migration_parent (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE migration_child (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER NOT NULL
    REFERENCES migration_parent(id) ON DELETE RESTRICT
);`;
const REBUILT_REFERENCED_TABLES = `
CREATE TABLE "migration_parent" (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rebuilt INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE migration_child (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER NOT NULL
    REFERENCES migration_parent(id) ON DELETE RESTRICT
);`;
const REBUILD_REFERENCED_PARENT = `
CREATE TABLE "__new_migration_parent" (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rebuilt INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "__new_migration_parent" (id, name)
  SELECT id, name FROM migration_parent;
DROP TABLE migration_parent;
ALTER TABLE "__new_migration_parent" RENAME TO migration_parent;`;

let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

function migration(
  id: string,
  sql: string,
  resultSchemaChecksum: string,
): DatabaseMigration {
  return Object.freeze({
    id,
    sql,
    checksum: sha256(sql),
    resultSchemaChecksum,
  });
}

function schemaChecksum(sql: string): string {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(sql);
    return databaseSchemaChecksum(databaseSchemaSignature(db));
  } finally {
    db.close();
  }
}

function schemaSignature(sql: string): string {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(sql);
    return databaseSchemaSignature(db);
  } finally {
    db.close();
  }
}

function image(sql: string): Uint8Array {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(sql);
    return sqlite3.capi.sqlite3_js_db_export(db).slice();
  } finally {
    db.close();
  }
}

const SCHEMA_BEFORE_COIN_RETIREMENT = DATABASE_MIGRATIONS
  .slice(0, 4)
  .map((entry) => entry.sql)
  .join('\n');

const SCHEMA_BEFORE_WEAPON_ATTACK_KIND = DATABASE_MIGRATIONS
  .slice(0, 6)
  .map((entry) => entry.sql)
  .join('\n');

const HISTORICAL_BACKGROUND_ROWS = `
INSERT INTO background_templates (
  id, content_key, rules_edition, name,
  ability_score_1, ability_score_2, ability_score_3, feat_name,
  skill_proficiency_1, skill_proficiency_2, tool_proficiency,
  equipment_option_a, equipment_option_b
) VALUES
  (1, '2024:background:acolyte', '2024', 'Acolyte',
   'Intelligence', 'Wisdom', 'Charisma', 'Magic Initiate (Cleric)',
   'Insight', 'Religion', 'Calligrapher’s Supplies', 'A', '50 GP'),
  (2, '2024:background:criminal', '2024', 'Criminal',
   'Dexterity', 'Constitution', 'Intelligence', 'Alert',
   'Sleight of Hand', 'Stealth', 'Thieves’ Tools', 'A', '50 GP'),
  (3, '2024:background:sage', '2024', 'Sage',
   'Constitution', 'Intelligence', 'Wisdom', 'Magic Initiate (Wizard)',
   'Arcana', 'History', 'Calligrapher’s Supplies', 'A', '50 GP'),
  (4, '2024:background:soldier', '2024', 'Soldier',
   'Strength', 'Dexterity', 'Constitution', 'Savage Attacker',
   'Athletics', 'Intimidation', 'Choose one kind of Gaming Set', 'A', '50 GP');
INSERT INTO background_equipment_items (
  id, background_template_id, option, sort_order, quantity, item_name,
  item_kind, coin_copper
) VALUES
  (101, 1, 'a', 1, 1, 'stale', 'coin', 800),
  (102, 1, 'b', 1, 1, 'stale', 'coin', 5000),
  (201, 2, 'a', 1, 1, 'stale', 'coin', 1600),
  (202, 2, 'b', 1, 1, 'stale', 'coin', 5000),
  (301, 3, 'a', 1, 1, 'stale', 'coin', 800),
  (302, 3, 'b', 1, 1, 'stale', 'coin', 5000),
  (401, 4, 'a', 1, 1, 'stale', 'coin', 1400),
  (402, 4, 'b', 1, 1, 'stale', 'coin', 5000);`;

async function storageHolding(sql: string): Promise<MemoryDatabaseStorage> {
  const storage = new MemoryDatabaseStorage(sqlite3);
  await storage.replaceFile(image(sql));
  return storage;
}

class ProbedStorage extends MemoryDatabaseStorage {
  migrationExecutions = 0;

  override open(): Database {
    const db = super.open();
    db.createFunction('migration_probe', () => {
      this.migrationExecutions += 1;
      return null;
    });
    return db;
  }
}

function probedRegistry(targetSchema: string): readonly DatabaseMigration[] {
  return Object.freeze([
    migration('0000_test_current', schema, schemaChecksum(schema)),
    migration(
      '0001_test_probe',
      `SELECT migration_probe();\n${FIRST_INDEX}`,
      schemaChecksum(targetSchema),
    ),
  ]);
}

describe('database migration chain', () => {
  it('builds the exact fresh-schema signature from empty', async () => {
    const result = await verifyMigrations(sqlite3);

    expect(result.migrationCount).toBe(DATABASE_MIGRATIONS.length);
    expect(result.signature).toBe(schemaSignature(schema));
  });

  it('backfills every template group without inferring custom or ranged-distance rows', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_WEAPON_ATTACK_KIND}
       INSERT INTO characters (id, name) VALUES (1, 'Attack-kind migration');
       INSERT INTO weapon_templates (
         content_key, name, srd_group, damage_kind, damage_dice, damage_type,
         thrown, ammunition, range_kind, range_near_feet, range_far_feet,
         mastery_property
       ) VALUES
         ('test:spear', 'Spear', 'simple_melee', 'dice', '1d6', 'Piercing',
          1, 0, 'ranged', 20, 60, 'Sap'),
         ('test:shortbow', 'Shortbow', 'simple_ranged', 'dice', '1d6',
          'Piercing', 0, 1, 'ranged', 20, 60, 'Vex'),
         ('test:glaive', 'Glaive', 'martial_melee', 'dice', '1d10',
          'Slashing', 0, 0, 'none', NULL, NULL, 'Graze'),
         ('test:longbow', 'Longbow', 'martial_ranged', 'dice', '1d8',
          'Piercing', 0, 1, 'ranged', 150, 600, 'Slow');
       INSERT INTO character_weapons (
         character_id, name, proficiency_category, damage_kind, damage_dice,
         damage_type, finesse, heavy, light, loading, reach, thrown,
         two_handed, ammunition, ammunition_kind, range_kind, range_near_feet,
         range_far_feet, mastery_property, other_properties
       )
       SELECT
         1, name,
         CASE srd_group
           WHEN 'simple_melee' THEN 'simple'
           WHEN 'simple_ranged' THEN 'simple'
           WHEN 'martial_melee' THEN 'martial'
           WHEN 'martial_ranged' THEN 'martial'
         END,
         damage_kind, damage_dice, damage_type, finesse, heavy, light, loading,
         reach, thrown, two_handed, ammunition, ammunition_kind, range_kind,
         range_near_feet, range_far_feet, mastery_property, other_properties
       FROM weapon_templates;
       INSERT INTO character_weapons (
         character_id, name, proficiency_category, damage_kind, damage_dice,
         damage_type, thrown, range_kind, range_near_feet, range_far_feet,
         mastery_property
       ) VALUES (
         1, 'Custom thrown range twin', 'simple', 'dice', '1d6', 'Piercing',
         1, 'ranged', 20, 60, 'Sap'
       );`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    lifecycle.open();

    expect(
      lifecycle.database.allRaw(
        `SELECT name, attack_kind
         FROM character_weapons
         ORDER BY id`,
      ),
    ).toEqual([
      { name: 'Spear', attack_kind: 'melee' },
      { name: 'Shortbow', attack_kind: 'ranged' },
      { name: 'Glaive', attack_kind: 'melee' },
      { name: 'Longbow', attack_kind: 'ranged' },
      { name: 'Custom thrown range twin', attack_kind: null },
    ]);
    lifecycle.close();
  });

  it('maps all five historical weapon range pairs without losing a value', async () => {
    const storage = await storageHolding(
      `${DATABASE_MIGRATIONS[0]!.sql}
       INSERT INTO characters (id, name) VALUES (1, 'Range migration');
       INSERT INTO character_weapons
         (id, character_id, name, range_normal_feet, range_long_feet)
       VALUES
         (1, 1, 'None', NULL, NULL),
         (2, 1, 'Near only', 20, NULL),
         (3, 1, 'Ordinary', 20, 60),
         (4, 1, 'Long only', NULL, 60),
         (5, 1, 'Inverted', 60, 20);`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    lifecycle.open();

    expect(
      lifecycle.database.allRaw(
        `SELECT id, range_kind, range_near_feet, range_far_feet
         FROM character_weapons ORDER BY id`,
      ),
    ).toEqual([
      { id: 1, range_kind: 'none', range_near_feet: null, range_far_feet: null },
      { id: 2, range_kind: 'ranged', range_near_feet: 20, range_far_feet: null },
      { id: 3, range_kind: 'ranged', range_near_feet: 20, range_far_feet: 60 },
      { id: 4, range_kind: 'legacy', range_near_feet: null, range_far_feet: 60 },
      { id: 5, range_kind: 'legacy', range_near_feet: 60, range_far_feet: 20 },
    ]);
    lifecycle.close();
  });

  it('renders every historical background coin row as its exact GP gear line and round-trips the migrated database', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_COIN_RETIREMENT}\n${HISTORICAL_BACKGROUND_ROWS}`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();

    const expected = [
      { background: 'Acolyte', option: 'a', item_name: '8 GP', item_kind: 'gear' },
      { background: 'Acolyte', option: 'b', item_name: '50 GP', item_kind: 'gear' },
      { background: 'Criminal', option: 'a', item_name: '16 GP', item_kind: 'gear' },
      { background: 'Criminal', option: 'b', item_name: '50 GP', item_kind: 'gear' },
      { background: 'Sage', option: 'a', item_name: '8 GP', item_kind: 'gear' },
      { background: 'Sage', option: 'b', item_name: '50 GP', item_kind: 'gear' },
      { background: 'Soldier', option: 'a', item_name: '14 GP', item_kind: 'gear' },
      { background: 'Soldier', option: 'b', item_name: '50 GP', item_kind: 'gear' },
    ];
    const read = (database: DatabaseContext) =>
      database.allRaw(
        `SELECT template.name AS background, item.option, item.item_name,
                item.item_kind
         FROM background_equipment_items AS item
         JOIN background_templates AS template
           ON template.id = item.background_template_id
         ORDER BY template.id, item.option`,
      );
    expect(read(lifecycle.database)).toEqual(expected);
    expect(
      lifecycle.database.allRaw(
        `SELECT name, equipment_option_b
         FROM background_templates ORDER BY id`,
      ),
    ).toEqual([
      { name: 'Acolyte', equipment_option_b: '50 GP' },
      { name: 'Criminal', equipment_option_b: '50 GP' },
      { name: 'Sage', equipment_option_b: '50 GP' },
      { name: 'Soldier', equipment_option_b: '50 GP' },
    ]);

    const migratedBytes = await lifecycle.exportBytes();
    const imported = new DatabaseLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
      schema,
    );
    imported.open();
    await imported.replace(migratedBytes);
    expect(read(imported.database)).toEqual(expected);
    expect(await imported.exportBytes()).toEqual(migratedBytes);
    imported.close();
    lifecycle.close();
  });

  it('aborts on an unrenderable historical copper value, naming the row and preserving the image', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_COIN_RETIREMENT}
       ${HISTORICAL_BACKGROUND_ROWS}
       UPDATE background_equipment_items
       SET coin_copper = 5050
       WHERE id = 302;`,
    );
    const before = await storage.exportFile();
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    expect(() => lifecycle.open()).toThrow(
      'background_equipment_items id 302 coin_copper=5050 cannot be rendered as whole GP',
    );
    expect(await storage.exportFile()).toEqual(before);
  });

  it('renders a large whole-GP value without clamping it', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_COIN_RETIREMENT}
       ${HISTORICAL_BACKGROUND_ROWS}
       UPDATE background_equipment_items
       SET coin_copper = 12345678900
       WHERE id = 101;`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    lifecycle.open();

    expect(
      lifecycle.database.scalar(
        'SELECT item_name FROM background_equipment_items WHERE id = 101',
      ),
    ).toBe('123456789 GP');
    lifecycle.close();
  });

  it.each([
    ['range_normal_feet', '100001'],
    ['range_normal_feet', '-1'],
    ['range_normal_feet', '1.5'],
    ['range_long_feet', '100001'],
    ['range_long_feet', '-1'],
    ['range_long_feet', '1.5'],
  ] as const)(
    'refuses historical %s=%s and leaves the image byte-identical',
    async (column, value) => {
      const storage = await storageHolding(
        `${DATABASE_MIGRATIONS[0]!.sql}
         INSERT INTO characters (id, name) VALUES (1, 'Range preflight');
         INSERT INTO character_weapons (id, character_id, name, ${column})
         VALUES (37, 1, 'Outlier', ${value});`,
      );
      const before = await storage.exportFile();
      const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

      expect(() => lifecycle.open()).toThrow(
        `character_weapons id 37 ${column}=${value}`,
      );

      expect(await storage.exportFile()).toEqual(before);
    },
  );

  it('does not execute migrations for a current image, after proving the probe is live', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const registry = probedRegistry(targetSchema);

    const oldStorage = new ProbedStorage(sqlite3);
    await oldStorage.replaceFile(image(schema));
    const oldLifecycle = new DatabaseLifecycle(
      sqlite3,
      oldStorage,
      targetSchema,
      () => undefined,
      registry,
    );
    oldLifecycle.open();
    expect(oldStorage.migrationExecutions).toBe(1);
    oldLifecycle.close();

    const currentStorage = new ProbedStorage(sqlite3);
    await currentStorage.replaceFile(image(targetSchema));
    const currentLifecycle = new DatabaseLifecycle(
      sqlite3,
      currentStorage,
      targetSchema,
      () => undefined,
      registry,
    );
    currentLifecycle.open();
    expect(currentStorage.migrationExecutions).toBe(0);
    currentLifecycle.close();
  });

  it('does not execute migrations for an empty image', () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const storage = new ProbedStorage(sqlite3);
    const probe = storage.open();
    probe.exec('SELECT migration_probe()');
    probe.close();
    expect(storage.migrationExecutions).toBe(1);
    storage.migrationExecutions = 0;

    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      probedRegistry(targetSchema),
    );

    lifecycle.open();

    expect(storage.migrationExecutions).toBe(0);
    lifecycle.close();
  });

  it('keeps a child row and its reference intact while rebuilding its parent table', async () => {
    const sourceSchema = `${schema}\n${REFERENCED_TABLES}\n`;
    const targetSchema = `${schema}\n${REBUILT_REFERENCED_TABLES}\n`;
    const registry = Object.freeze([
      migration(
        '0000_test_referenced_tables',
        REFERENCED_TABLES,
        schemaChecksum(sourceSchema),
      ),
      migration(
        '0001_test_rebuild_referenced_parent',
        REBUILD_REFERENCED_PARENT,
        schemaChecksum(targetSchema),
      ),
    ]);
    const storage = await storageHolding(
      `${sourceSchema}
       INSERT INTO migration_parent (id, name) VALUES (7, 'Longbow');
       INSERT INTO migration_child (id, parent_id) VALUES (1, 7);`,
    );
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      registry,
    );

    lifecycle.open();

    expect(
      lifecycle.database.allRaw(
        `SELECT child.id, child.parent_id, parent.name, parent.rebuilt
         FROM migration_child AS child
         JOIN migration_parent AS parent ON parent.id = child.parent_id`,
      ),
    ).toEqual([{
      id: 1,
      parent_id: 7,
      name: 'Longbow',
      rebuilt: 1,
    }]);
    lifecycle.close();
  });

  it('leaves an unknown signature at schema_mismatch', async () => {
    const storage = await storageHolding(
      `${schema}\nCREATE INDEX unregistered_schema_change ON characters(id);\n`,
    );
    const boot = bootDatabase(
      new DatabaseLifecycle(sqlite3, storage, schema),
    );

    expect(boot.status).toBe('schema_mismatch');
    if (boot.status !== 'schema_mismatch') {
      throw new Error('unreachable');
    }
    expect(boot.detail).toBe(
      'Database image schema does not match the application schema.',
    );
  });

  it('rolls a mid-chain failure back to the original signature and bytes', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n${SECOND_INDEX}\n`;
    const registry = Object.freeze([
      migration('0000_test_current', schema, schemaChecksum(schema)),
      migration(
        '0001_test_first',
        FIRST_INDEX,
        schemaChecksum(`${schema}\n${FIRST_INDEX}\n`),
      ),
      migration(
        '0002_test_failure',
        `${SECOND_INDEX}\nSELECT value FROM migration_failure_injected;`,
        schemaChecksum(targetSchema),
      ),
    ]);
    const storage = await storageHolding(schema);
    const original = await storage.exportFile();
    const originalDb = openDatabaseImage(sqlite3, original);
    const originalSignature = databaseSchemaSignature(originalDb);
    originalDb.close();
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      registry,
    );

    expect(() => lifecycle.open()).toThrow('migration_failure_injected');

    const after = await storage.exportFile();
    expect(after).toEqual(original);
    const inspect = openDatabaseImage(sqlite3, after);
    try {
      expect(databaseSchemaSignature(inspect)).toBe(originalSignature);
      expect(
        inspect.selectValue(
          `SELECT count(*) FROM sqlite_schema
           WHERE name IN ('migration_probe_first', 'migration_probe_second')`,
        ),
      ).toBe(0);
    } finally {
      inspect.close();
    }
  });

  it('migrates once and performs no second migration after reopen', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const storage = new ProbedStorage(sqlite3);
    await storage.replaceFile(image(schema));
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      probedRegistry(targetSchema),
    );

    lifecycle.open();
    expect(storage.migrationExecutions).toBe(1);
    lifecycle.reopen();
    expect(storage.migrationExecutions).toBe(1);
    lifecycle.close();
  });

  it('migrates a known-old import while quarantined and exports it stably', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const registry = Object.freeze([
      migration('0000_test_current', schema, schemaChecksum(schema)),
      migration(
        '0001_test_import',
        FIRST_INDEX,
        schemaChecksum(targetSchema),
      ),
    ]);
    const storage = await storageHolding(targetSchema);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      registry,
    );
    lifecycle.open();

    const old = openDatabaseImage(sqlite3, image(schema), {
      readonly: false,
    });
    let oldBytes: Uint8Array;
    try {
      old.exec("INSERT INTO characters (name) VALUES ('Migrated import')");
      oldBytes = sqlite3.capi.sqlite3_js_db_export(old).slice();
    } finally {
      old.close();
    }

    await lifecycle.replace(oldBytes);
    const firstExport = await lifecycle.exportBytes();
    lifecycle.reopen();
    const secondExport = await lifecycle.exportBytes();

    expect(secondExport).toEqual(firstExport);
    expect(
      lifecycle.database.allRaw('SELECT name FROM characters'),
    ).toEqual([{ name: 'Migrated import' }]);
    expect(
      lifecycle.database.scalar(
        `SELECT count(*) FROM sqlite_schema
         WHERE type = 'index' AND name = 'migration_probe_first'`,
      ),
    ).toBe(1);
    lifecycle.close();
  });

  it('rejects a checksum mismatch before touching the image', () => {
    const shipped = DATABASE_MIGRATIONS[0]!;
    const corrupted = Object.freeze([
      {
        ...shipped,
        sql: `${shipped.sql}\nSELECT 1;`,
      },
    ]);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
      schema,
      () => undefined,
      corrupted,
    );

    expect(() => lifecycle.open()).toThrow(
      `Database migration "${shipped.id}" checksum mismatch`,
    );
  });
});
