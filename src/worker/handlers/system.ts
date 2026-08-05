import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import { assertedExternalContentKey } from '../../catalog/catalog-key';
import { normalizeContentIdentityName } from '../../catalog/content-identity';
import { registerAssertedPlaceholderContentIdentity } from '../../catalog/content-registry';
import { applicationTables } from '../../db/database-lifecycle';
import type { SqlRow } from '../../db/codecs';
import {
  defineRpcHandler,
  isEmptyParams,
  isRecord,
  type RpcHandler,
} from '../handler';

export interface SystemInfo {
  sqliteVersion: string;
  compileOptions: string[];
  foreignKeys: number;
  journalMode: string;
  vfsName: string;
  filename: string;
  crossOriginIsolated: boolean;
}

interface CharacterNameParams {
  name: string;
}

interface InspectRowsParams {
  table: (typeof applicationTables)[number];
  where?: Record<string, string | number | boolean | null>;
}

interface ReplaceDatabaseParams {
  bytes: Uint8Array;
}

function isCharacterNameParams(
  params: unknown,
): params is CharacterNameParams {
  return (
    isRecord(params) &&
    Object.keys(params).length === 1 &&
    typeof params.name === 'string' &&
    params.name.trim().length > 0 &&
    params.name.length <= 255
  );
}

function isInspectRowsParams(params: unknown): params is InspectRowsParams {
  if (
    !isRecord(params) ||
    !applicationTables.includes(
      params.table as (typeof applicationTables)[number],
    )
  ) {
    return false;
  }
  if (params.where === undefined) {
    return Object.keys(params).length === 1;
  }
  if (!isRecord(params.where) || Object.keys(params).length !== 2) {
    return false;
  }
  return Object.values(params.where).every(
    (value) =>
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean',
  );
}

function isReplaceDatabaseParams(
  params: unknown,
): params is ReplaceDatabaseParams {
  return (
    isRecord(params) &&
    Object.keys(params).length === 1 &&
    params.bytes instanceof Uint8Array
  );
}

function caughtRejection(action: () => void): {
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

function seedViolationFixture(
  context: Parameters<RpcHandler['handle']>[0],
  prefix: string,
): {
  aliceId: number;
  bobId: number;
  bobSourceId: number;
  spellId: number;
} {
  return context.db.transaction((db) => {
    const spellName = 'Worker Test Spell';
    const spellContentKey = assertedExternalContentKey(
      'spell',
      'worker',
      spellName,
      `fixture.${prefix}`,
    );
    registerAssertedPlaceholderContentIdentity(db, {
      contentKey: spellContentKey,
      normalizedName: normalizeContentIdentityName(spellName),
    });
    const identityId = db.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES (?, 'Worker Test Spell', 'worker test spell')`,
      [spellContentKey],
    ).lastInsertId;
    const spellId = db.exec(
      `INSERT INTO spell_versions
         (content_key, spell_identity_id, display_name, rules_edition, level, school)
       VALUES (?, ?, 'Worker Test Spell', '2024', 1, 'Evocation')`,
      [spellContentKey, identityId],
    ).lastInsertId;
    const aliceId = db.exec(
      "INSERT INTO characters (name) VALUES ('Worker Alice')",
    ).lastInsertId;
    const bobId = db.exec(
      "INSERT INTO characters (name) VALUES ('Worker Bob')",
    ).lastInsertId;
    const bobSourceId = db.exec(
      `INSERT INTO character_source_instances
         (character_id, instance_uuid, source_type, display_name)
       VALUES (?, ?, 'feat', 'Worker Source')`,
      [bobId, `${prefix}:source`],
    ).lastInsertId;
    return { aliceId, bobId, bobSourceId, spellId };
  });
}

export function createSystemHandlers(options: {
  includeInspectRows: boolean;
}): readonly RpcHandler[] {
  const common: RpcHandler[] = [
    defineRpcHandler('system.info', isEmptyParams, (context) => ({
      sqliteVersion: String(context.db.scalar('SELECT sqlite_version()')),
      compileOptions: context.db
        .allRaw('PRAGMA compile_options')
        .map((row) => String(Object.values(row)[0])),
      foreignKeys: Number(context.db.scalar('PRAGMA foreign_keys')),
      journalMode: String(context.db.scalar('PRAGMA journal_mode')),
      vfsName: context.db.connection.dbVfsName() ?? '',
      filename: context.lifecycle.filename,
      crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
    })),
    defineRpcHandler('system.reset', isEmptyParams, async (context) => {
      await context.lifecycle.reset();
      return { reset: true };
    }),
    defineRpcHandler(
      'system.writeCharacter',
      isCharacterNameParams,
      (context, params) => {
        const name = params.name.trim();
        const id = context.db.transaction(
          (db) =>
            db.exec('INSERT INTO characters (name) VALUES (?)', [name])
              .lastInsertId,
        );
        return { id, name };
      },
    ),
    defineRpcHandler(
      'system.countCharacters',
      isEmptyParams,
      (context) =>
        Number(context.db.scalar('SELECT count(*) FROM characters')),
    ),
    defineRpcHandler(
      'system.exportDatabase',
      isEmptyParams,
      (context) => context.lifecycle.exportBytes(),
    ),
    defineRpcHandler(
      'system.replaceDatabase',
      isReplaceDatabaseParams,
      async (context, params) => {
        await context.lifecycle.replace(params.bytes);
        return { replaced: true };
      },
    ),
    defineRpcHandler(
      'system.attemptTriggerViolation',
      isEmptyParams,
      (context) => {
        const prefix = `trigger-${crypto.randomUUID()}`;
        const fixture = seedViolationFixture(context, prefix);
        return caughtRejection(() => {
          context.db.exec(
            `INSERT INTO spell_selection_slots (
               character_id, source_instance_id, slot_key, rule_key, bucket,
               eligibility_kind, fixed_spell_version_id, current_spell_version_id
             ) VALUES (?, ?, ?, 'worker-rule', 'automatic', 'fixed_spell', ?, ?)`,
            [
              fixture.bobId,
              fixture.bobSourceId,
              `${prefix}:slot`,
              fixture.spellId,
              fixture.spellId,
            ],
          );
        });
      },
    ),
    defineRpcHandler(
      'system.attemptForeignKeyViolation',
      isEmptyParams,
      (context) => {
        const prefix = `fk-${crypto.randomUUID()}`;
        const fixture = seedViolationFixture(context, prefix);
        return caughtRejection(() => {
          context.db.exec(
            `INSERT INTO spell_selection_slots (
               character_id, source_instance_id, slot_key, rule_key, bucket,
               eligibility_kind
             ) VALUES (?, ?, ?, 'worker-rule', 'known', 'choice_from_list')`,
            [fixture.aliceId, fixture.bobSourceId, `${prefix}:slot`],
          );
        });
      },
    ),
  ];

  if (!options.includeInspectRows) {
    return Object.freeze(common);
  }

  return Object.freeze([
    ...common,
    defineRpcHandler(
      'system.inspectRows',
      isInspectRowsParams,
      (context, params) => {
        const columns = new Set(
          context.db
            .allRaw(`PRAGMA table_info("${params.table}")`)
            .map((row) => String(row.name)),
        );
        const filters = Object.entries(params.where ?? {});
        for (const [column] of filters) {
          if (!columns.has(column)) {
            throw new Error(
              `Unknown filter column "${column}" for ${params.table}.`,
            );
          }
        }
        const where =
          filters.length === 0
            ? ''
            : ` WHERE ${filters
                .map(([column]) => `"${column}" IS ?`)
                .join(' AND ')}`;
        const bind = filters.map(([, value]) => value as BindableValue);
        // Raw by definition: `system.inspectRows` reads an ARBITRARY table
        // named by the caller, so there is no column set to write a codec
        // against. The table name is checked against the schema by
        // `isInspectRowsParams`; the filter columns are checked against
        // `PRAGMA table_info` above.
        return context.db.allRaw(
          `SELECT * FROM "${params.table}"${where} ORDER BY rowid LIMIT 500`,
          bind,
        );
      },
    ),
  ]);
}

export const handlers = createSystemHandlers({
  includeInspectRows: !import.meta.env.PROD,
});
