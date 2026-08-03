import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import schema from '../../../src/db/schema.sql?raw';
import {
  DatabaseLifecycle,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import {
  getSqlite3,
  MemoryDatabaseStorage,
} from '../../helpers/open-db';

let lifecycle: DatabaseLifecycle;
let storage: MemoryDatabaseStorage;

beforeEach(async () => {
  const sqlite3 = await getSqlite3();
  storage = new MemoryDatabaseStorage(sqlite3);
  lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
  lifecycle.open();
});

afterEach(() => {
  lifecycle.close();
});

describe('database lifecycle', () => {
  it('whole-database backup preserves modifier definitions and non-empty effect children generically', async () => {
    lifecycle.database.exec(
      `INSERT INTO item_definitions (
         content_key, name, rules_edition, description, requires_attunement
       ) VALUES (
         'expanded:legacy:backup-belt', 'Backup Belt', 'expanded',
         'Definition text', 1
       );
       INSERT INTO item_definition_effects (
         item_definition_id, sort_order, effect_kind, ability, maximum,
         label, notes
       ) VALUES (
         1, 1, 'ability_override', 'strength', 23,
         'Backup strength', 'Non-empty effect note'
       );`,
    );
    const exported = await lifecycle.exportBytes();
    lifecycle.database.exec(
      "DELETE FROM item_definitions WHERE content_key = 'expanded:legacy:backup-belt'",
    );

    await lifecycle.replace(exported);

    expect(lifecycle.database.oneRaw(
      `SELECT definition.content_key, definition.description,
              definition.requires_attunement, effect.sort_order,
              effect.effect_kind, effect.ability, effect.maximum,
              effect.label, effect.notes
       FROM item_definitions AS definition
       JOIN item_definition_effects AS effect
         ON effect.item_definition_id = definition.id
       WHERE definition.content_key = 'expanded:legacy:backup-belt'`,
    )).toEqual({
      content_key: 'expanded:legacy:backup-belt',
      description: 'Definition text',
      requires_attunement: 1,
      sort_order: 1,
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 23,
      label: 'Backup strength',
      notes: 'Non-empty effect note',
    });
  });

  it('replaces the complete image, re-enables foreign keys, and survives reopen', async () => {
    lifecycle.database.exec(
      "INSERT INTO characters (name) VALUES ('Exported character')",
    );
    const exported = await lifecycle.exportBytes();
    lifecycle.database.exec(
      "INSERT INTO characters (name) VALUES ('Discarded character')",
    );

    await lifecycle.replace(exported);

    expect(
      lifecycle.database.allRaw('SELECT id, name FROM characters ORDER BY id'),
    ).toEqual([{ id: 1, name: 'Exported character' }]);
    expect(lifecycle.database.scalar('PRAGMA foreign_keys')).toBe(1);

    lifecycle.reopen();
    expect(
      lifecycle.database.allRaw('SELECT id, name FROM characters ORDER BY id'),
    ).toEqual([{ id: 1, name: 'Exported character' }]);
    expect(lifecycle.database.scalar('PRAGMA foreign_keys')).toBe(1);
  });

  it('rejects an invalid image before closing or changing persisted state', async () => {
    lifecycle.database.exec(
      "INSERT INTO characters (name) VALUES ('Protected character')",
    );
    const originalConnection = lifecycle.database.connection;

    await expect(
      lifecycle.replace(new TextEncoder().encode('not a sqlite database')),
    ).rejects.toThrow();

    expect(lifecycle.database.connection).toBe(originalConnection);
    expect(lifecycle.database.connection.isOpen()).toBe(true);
    expect(
      lifecycle.database.allRaw('SELECT id, name FROM characters'),
    ).toEqual([{ id: 1, name: 'Protected character' }]);
  });

  it('rejects a structurally incompatible SQLite image before changing live state', async () => {
    lifecycle.database.exec(
      "INSERT INTO characters (name) VALUES ('Schema-protected character')",
    );
    const originalConnection = lifecycle.database.connection;
    const exported = await lifecycle.exportBytes();
    const sqlite3 = await getSqlite3();
    const incompatible = openDatabaseImage(sqlite3, exported, {
      readonly: false,
    });
    let incompatibleBytes: Uint8Array;
    try {
      incompatible.exec('ALTER TABLE characters DROP COLUMN notes');
      incompatibleBytes =
        sqlite3.capi.sqlite3_js_db_export(incompatible).slice();
    } finally {
      incompatible.close();
    }

    await expect(lifecycle.replace(incompatibleBytes)).rejects.toThrow(
      'Database image schema does not match the application schema.',
    );

    expect(lifecycle.database.connection).toBe(originalConnection);
    expect(lifecycle.database.connection.isOpen()).toBe(true);
    expect(
      lifecycle.database.allRaw('SELECT id, name FROM characters'),
    ).toEqual([{ id: 1, name: 'Schema-protected character' }]);
  });

  it('restores the prior image and a usable connection after storage replacement fails', async () => {
    lifecycle.database.exec(
      "INSERT INTO characters (name) VALUES ('Recovery character')",
    );
    const candidate = await lifecycle.exportBytes();
    lifecycle.database.exec(
      "UPDATE characters SET name = 'State before failed replacement' WHERE id = 1",
    );
    storage.failNextReplacement = true;

    await expect(lifecycle.replace(candidate)).rejects.toThrow(
      'Injected storage replacement failure.',
    );

    expect(
      lifecycle.database.allRaw('SELECT id, name FROM characters'),
    ).toEqual([{ id: 1, name: 'State before failed replacement' }]);
    expect(lifecycle.database.scalar('PRAGMA foreign_keys')).toBe(1);
  });
});
