/// <reference lib="webworker" />

import sqlite3InitModule, {
  type Database,
  type SAHPoolUtil,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import schema from './schema.sql?raw';

type RequestMessage = {
  id: number;
  method:
    | 'info'
    | 'reset'
    | 'writeCharacter'
    | 'countCharacters'
    | 'attemptTriggerViolation'
    | 'attemptForeignKeyViolation';
  params?: Record<string, unknown>;
};

type ResponseMessage =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

const scope = self as DedicatedWorkerGlobalScope;
let sqlite3: Sqlite3Static;
let sahPool: SAHPoolUtil;
let db: Database;

function scalar(sql: string): string | number | null {
  const value = db.selectValue(sql);
  return value === undefined ? null : (value as string | number | null);
}

function seedViolationFixture(prefix: string): {
  aliceId: number;
  bobId: number;
  bobSourceId: number;
  spellId: number;
} {
  return db.transaction(() => {
    db.exec({
      sql: `INSERT INTO spell_identities
        (content_key, canonical_name, normalized_name)
        VALUES (?, 'Worker Test Spell', 'worker test spell')`,
      bind: [`${prefix}:identity`],
    });
    const identityId = Number(scalar('SELECT last_insert_rowid()'));
    db.exec({
      sql: `INSERT INTO spell_versions
        (content_key, spell_identity_id, display_name, rules_edition, level, school)
        VALUES (?, ?, 'Worker Test Spell', '2024', 1, 'Evocation')`,
      bind: [`${prefix}:version`, identityId],
    });
    const spellId = Number(scalar('SELECT last_insert_rowid()'));

    db.exec({
      sql: "INSERT INTO characters (name) VALUES ('Worker Alice'), ('Worker Bob')",
    });
    const bobId = Number(scalar('SELECT last_insert_rowid()'));
    const aliceId = bobId - 1;

    db.exec({
      sql: `INSERT INTO character_source_instances
        (character_id, instance_uuid, source_type, display_name)
        VALUES (?, ?, 'feat', 'Worker Source')`,
      bind: [bobId, `${prefix}:source`],
    });
    const bobSourceId = Number(scalar('SELECT last_insert_rowid()'));

    return { aliceId, bobId, bobSourceId, spellId };
  });
}

function rejectionFrom(action: () => void): {
  rejected: boolean;
  message: string | null;
} {
  try {
    action();
    return { rejected: false, message: null };
  } catch (error) {
    return {
      rejected: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function initialize(): Promise<void> {
  sqlite3 = await sqlite3InitModule();
  sahPool = await sqlite3.installOpfsSAHPoolVfs({
    initialCapacity: 6,
    name: 'dnd-static-spike-sahpool',
    directory: '/dnd-static-spike-sahpool',
  });
  db = new sahPool.OpfsSAHPoolDb('/dnd-static-spike.sqlite3');

  // Per-connection prerequisites, deliberately before schema DDL or transactions.
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = DELETE;');
  if (
    Number(
      scalar(
        "SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name = 'characters'",
      ),
    ) === 0
  ) {
    db.exec(schema);
  }
}

const ready = initialize();

async function dispatch(message: RequestMessage): Promise<unknown> {
  await ready;
  const params = message.params ?? {};

  switch (message.method) {
    case 'info':
      return {
        sqliteVersion: scalar('SELECT sqlite_version()'),
        compileOptions: db.selectValues('PRAGMA compile_options'),
        foreignKeys: scalar('PRAGMA foreign_keys'),
        journalMode: scalar('PRAGMA journal_mode'),
        vfsName: db.dbVfsName(),
        filename: db.filename,
        crossOriginIsolated: globalThis.crossOriginIsolated,
        poolCapacity: sahPool.getCapacity(),
      };

    case 'reset':
      db.transaction(() => {
        db.exec(`
          DELETE FROM spell_selection_slots;
          DELETE FROM character_class_levels;
          DELETE FROM character_source_instances;
          DELETE FROM characters;
          DELETE FROM subclass_definitions;
          DELETE FROM class_definitions;
          DELETE FROM spell_versions;
          DELETE FROM spell_identities;
        `);
      });
      return { reset: true };

    case 'writeCharacter': {
      const name = String(params.name ?? '');
      db.transaction(() => {
        db.exec({
          sql: 'INSERT INTO characters (name) VALUES (?)',
          bind: [name],
        });
      });
      return { id: Number(scalar('SELECT last_insert_rowid()')), name };
    }

    case 'countCharacters':
      return Number(scalar('SELECT count(*) FROM characters'));

    case 'attemptTriggerViolation': {
      const prefix = `trigger-${crypto.randomUUID()}`;
      const fixture = seedViolationFixture(prefix);
      return rejectionFrom(() => {
        db.exec({
          sql: `INSERT INTO spell_selection_slots (
            character_id, source_instance_id, slot_key, rule_key, bucket,
            eligibility_kind, fixed_spell_version_id, current_spell_version_id
          ) VALUES (?, ?, ?, 'worker-rule', 'automatic', 'fixed_spell', ?, ?)`,
          bind: [
            fixture.bobId,
            fixture.bobSourceId,
            `${prefix}:slot`,
            fixture.spellId,
            fixture.spellId,
          ],
        });
      });
    }

    case 'attemptForeignKeyViolation': {
      const prefix = `fk-${crypto.randomUUID()}`;
      const fixture = seedViolationFixture(prefix);
      return rejectionFrom(() => {
        db.exec({
          sql: `INSERT INTO spell_selection_slots (
            character_id, source_instance_id, slot_key, rule_key, bucket,
            eligibility_kind
          ) VALUES (?, ?, ?, 'worker-rule', 'known', 'choice_from_list')`,
          bind: [
            fixture.aliceId,
            fixture.bobSourceId,
            `${prefix}:slot`,
          ],
        });
      });
    }
  }
}

scope.addEventListener('message', async (event: MessageEvent<RequestMessage>) => {
  const { id } = event.data;
  let response: ResponseMessage;
  try {
    response = { id, ok: true, result: await dispatch(event.data) };
  } catch (error) {
    response = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  scope.postMessage(response);
});
