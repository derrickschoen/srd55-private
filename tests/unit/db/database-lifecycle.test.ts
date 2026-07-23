import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import schema from '../../../src/db/schema.sql?raw';
import { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
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
      lifecycle.database.all('SELECT id, name FROM characters ORDER BY id'),
    ).toEqual([{ id: 1, name: 'Exported character' }]);
    expect(lifecycle.database.scalar('PRAGMA foreign_keys')).toBe(1);

    lifecycle.reopen();
    expect(
      lifecycle.database.all('SELECT id, name FROM characters ORDER BY id'),
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
      lifecycle.database.all('SELECT id, name FROM characters'),
    ).toEqual([{ id: 1, name: 'Protected character' }]);
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
      lifecycle.database.all('SELECT id, name FROM characters'),
    ).toEqual([{ id: 1, name: 'State before failed replacement' }]);
    expect(lifecycle.database.scalar('PRAGMA foreign_keys')).toBe(1);
  });
});
