import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import schema from '../../../src/db/schema.sql?raw';
import { BUNDLED_HOMEBREW_CATALOG } from '../../../src/authoring/bundled-homebrew-catalog';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';
import { normalizeContentIdentityName } from '../../../src/catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../../../src/catalog/content-registry';
import {
  RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS,
} from '../../../src/catalog/retire-non-srd-bundled-subclasses-v1';
import { runCatalogDataMigrations } from '../../../src/catalog/catalog-data-migrations';
import { CharacterState } from '../../../src/character/character-state';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { sha256 } from '../../../src/crypto/sha256';
import { applicationSeed, createApplicationLifecycle } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import type { ContentKey } from '../../../src/domain/ids';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const lifecycles: DatabaseLifecycle[] = [];
let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

afterEach(() => {
  while (lifecycles.length > 0) lifecycles.pop()?.close();
});

function track(lifecycle: DatabaseLifecycle): DatabaseLifecycle {
  lifecycles.push(lifecycle);
  return lifecycle;
}

function oldApplicationLifecycle(): DatabaseLifecycle {
  const lifecycle = track(new DatabaseLifecycle(
    sqlite3,
    new MemoryDatabaseStorage(sqlite3),
    schema,
    applicationSeed,
    undefined,
    [],
  ));
  lifecycle.open();
  return lifecycle;
}

function lineageDeleteGuard(db: DatabaseContext): string {
  const sql = db.scalar<string>(
    `SELECT sql FROM sqlite_schema
      WHERE type = 'trigger'
        AND name = 'catalog_content_supersessions_refuse_delete_before_delete'`,
  );
  if (sql === null) throw new Error('The 0039 lineage delete guard is missing.');
  return sql;
}

function retirementMarker(db: DatabaseContext): Record<string, unknown> | null {
  return db.oneRaw(
    `SELECT id, scheme, checksum
       FROM catalog_data_migrations
      WHERE id = 'retire_non_srd_bundled_subclasses_v1'`,
  );
}

class FailAfterGuardSuspensionDatabase extends DatabaseContext {
  #guardWasDropped = false;

  override exec(
    sql: string,
    bind?: Parameters<DatabaseContext['exec']>[1],
  ): ReturnType<DatabaseContext['exec']> {
    if (
      this.#guardWasDropped &&
      sql.includes('DELETE FROM catalog_content_supersessions')
    ) {
      throw new Error('Injected failure after 0039 guard suspension.');
    }
    const result = super.exec(sql, bind);
    if (
      sql.trim() ===
        'DROP TRIGGER catalog_content_supersessions_refuse_delete_before_delete'
    ) {
      this.#guardWasDropped = true;
    }
    return result;
  }
}

function installExternalVeteran(db: DatabaseContext): ContentKey {
  const catalog = BUNDLED_HOMEBREW_CATALOG.filter(
    (entry) => entry.catalog_key === 'veteran',
  );
  const plan = planBundledHomebrewInstall(db, catalog);
  const result = commitBundledHomebrewInstall(db, plan.token, catalog);
  if (result.kind !== 'committed' || result.outcomes[0]?.kind !== 'create') {
    throw new Error('External Veteran fixture did not publish.');
  }
  return result.outcomes[0].contentKey;
}

function externalVeteranGraph(db: DatabaseContext, contentKey: ContentKey) {
  return db.oneRaw(
    `SELECT subclass.id, subclass.content_key, subclass.name,
            subclass.notes, identity.key_kind, identity.catalog_layer,
            fingerprint.fingerprint_digest,
            (SELECT count(*) FROM subclass_features AS feature
              WHERE feature.subclass_definition_id = subclass.id) AS features
       FROM subclass_definitions AS subclass
       JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'subclass'
        AND identity.content_key = subclass.content_key
       JOIN catalog_content_fingerprints AS fingerprint
         ON fingerprint.content_kind = 'subclass'
        AND fingerprint.content_key = subclass.content_key
        AND fingerprint.fingerprint_role = 'current'
      WHERE subclass.content_key = ?`,
    [contentKey],
  );
}

function installRetiringFixtureGraph(
  db: DatabaseContext,
  externalVeteranKey: ContentKey,
): readonly string[] {
  const characterNames: string[] = [];
  RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS.forEach((contentKey, index) => {
    const parentKey = index === 0
      ? '2024:class:fighter'
      : '2024:class:rogue';
    const parentId = Number(db.scalar(
      'SELECT id FROM class_definitions WHERE content_key = ?',
      [parentKey],
    ));
    ensureBundledStableContentIdentity(db, {
      kind: 'subclass',
      contentKey,
      normalizedName: normalizeContentIdentityName(
        `Retiring bundled fixture ${String(index + 1)}`,
      ),
    });
    const subclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition,
         spellcasting_ability, caster_fraction, caster_rounding
       ) VALUES (?, ?, ?, '2024', 'intelligence', '1/3', 'down')`,
      [contentKey, parentId, `Retiring bundled fixture ${String(index + 1)}`],
    ).lastInsertId;
    const featureId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, class_level, sort_order, name, description
       ) VALUES (?, 3, 1, 'Retiring feature', 'Retiring fixture prose.')`,
      [subclassId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO subclass_feature_effects (
         subclass_feature_id, sort_order, effect_kind, amount, label
       ) VALUES (?, 1, 'armor_class_bonus', 1, 'Retiring effect')`,
      [featureId],
    );
    db.exec(
      `INSERT INTO subclass_progressions (
         subclass_definition_id, class_level, cantrips_known,
         prepared_count, max_spell_level, slots, grant_rules
       ) VALUES (?, 3, 1, 1, 1, '{"1":2}', '[]')`,
      [subclassId],
    );

    const fingerprint = sha256(`retiring fingerprint ${String(index + 1)}`);
    db.exec(
      `INSERT INTO catalog_content_fingerprints (
         content_kind, fingerprint_scheme, fingerprint_digest,
         canonical_json, content_key, fingerprint_role
       ) VALUES ('subclass', 'content-v1', ?, '{}', ?, 'current')`,
      [fingerprint, contentKey],
    );
    db.exec(
      `INSERT INTO catalog_content_aliases (
         content_kind, alias_key, content_key, alias_kind
       ) VALUES ('subclass', ?, ?, 'bundled-legacy')`,
      [`retiring-alias-${String(index + 1)}`, contentKey],
    );
    db.exec(
      `INSERT INTO catalog_content_match_decisions (
         content_kind, incoming_fingerprint_scheme,
         incoming_fingerprint_digest, decision, target_content_key
       ) VALUES ('subclass', 'content-v1', ?, 'match', ?)`,
      [sha256(`retiring decision ${String(index + 1)}`), contentKey],
    );
    db.exec(
      `INSERT INTO catalog_content_drafts (
         draft_uuid, content_kind, document_version, base_content_key,
         document_json
       ) VALUES (?, 'subclass', 1, ?, '{}')`,
      [`retiring-draft-${String(index + 1)}`, contentKey],
    );
    db.exec(
      `INSERT INTO catalog_content_supersessions (
         content_kind, superseded_content_key, successor_content_key
       ) VALUES ('subclass', ?, ?)`,
      [contentKey, externalVeteranKey],
    );

    const characterName = `Retirement Character ${String(index + 1)}`;
    characterNames.push(characterName);
    const characterId = db.exec(
      'INSERT INTO characters (name) VALUES (?)',
      [characterName],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, subclass_definition_id,
         level, is_starting_class
       ) VALUES (?, ?, ?, 3, 1)`,
      [characterId, parentId, subclassId],
    );
    db.exec(
      `INSERT INTO character_operations (
         character_id, operation_uuid, expected_revision,
         resulting_revision, inverse_command
       ) VALUES (?, ?, 0, 1, '{}')`,
      [characterId, `retiring-operation-${String(index + 1)}`],
    );
  });
  return characterNames;
}

describe('one-time non-SRD bundled subclass retirement', () => {
  // Measured alone at 3.8s; 20s retains contention headroom.
  it('upgrades an old image atomically, deletes attached characters, and preserves SRD and external Veteran content', async () => {
    const old = oldApplicationLifecycle();
    const externalVeteranKey = installExternalVeteran(old.database);
    const externalBefore = externalVeteranGraph(old.database, externalVeteranKey);
    const characterNames = installRetiringFixtureGraph(
      old.database,
      externalVeteranKey,
    );
    const fighterId = Number(old.database.scalar(
      "SELECT id FROM class_definitions WHERE content_key = '2024:class:fighter'",
    ));
    const championId = Number(old.database.scalar(
      "SELECT id FROM subclass_definitions WHERE content_key = '2024:subclass:champion'",
    ));
    const retiredEKId = Number(old.database.scalar(
      "SELECT id FROM subclass_definitions WHERE content_key = '2024:subclass:ek'",
    ));
    const survivorId = old.database.exec(
      "INSERT INTO characters (name) VALUES ('SRD Survivor')",
    ).lastInsertId;
    old.database.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, subclass_definition_id,
         level, is_starting_class
       ) VALUES (?, ?, ?, 3, 1)`,
      [survivorId, fighterId, retiredEKId],
    );
    const retiringSnapshot = new CharacterState(old.database).capture(survivorId);
    old.database.exec(
      `UPDATE character_class_levels
          SET subclass_definition_id = ?
        WHERE character_id = ? AND class_definition_id = ?`,
      [championId, survivorId, fighterId],
    );
    old.database.exec(
      `UPDATE characters
          SET revision = 2, notes = 'After safe history entry'
        WHERE id = ?`,
      [survivorId],
    );
    const championSnapshot = new CharacterState(old.database).capture(survivorId);
    old.database.exec(
      `INSERT INTO character_operations (
         character_id, operation_uuid, expected_revision,
         resulting_revision, inverse_command
       ) VALUES
         (?, 'survivor-retiring-inverse', 0, 1, ?),
         (?, 'survivor-safe-inverse', 1, 2, ?)`,
      [
        survivorId,
        JSON.stringify({
          type: 'internal_snapshot_restore',
          snapshot: retiringSnapshot,
        }),
        survivorId,
        JSON.stringify({
          type: 'internal_flavor_restore',
          alignment: null,
          appearance: null,
          backstory: null,
          notes: 'Before safe history entry',
        }),
      ],
    );
    old.database.exec(
      `INSERT INTO character_save_points (
         character_id, label, snapshot, schema_version
       ) VALUES
         (?, 'Retiring subclass snapshot', ?, ?),
         (?, 'Champion snapshot', ?, ?)`,
      [
        survivorId,
        JSON.stringify(retiringSnapshot),
        retiringSnapshot.schema_version,
        survivorId,
        JSON.stringify(championSnapshot),
        championSnapshot.schema_version,
      ],
    );
    const guardBefore = lineageDeleteGuard(old.database);
    const bytes = await old.exportBytes();
    old.close();

    const upgraded = track(createApplicationLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
    ));
    upgraded.open();
    await upgraded.replace(bytes);
    const db = upgraded.database;
    const placeholders = RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS
      .map(() => '?')
      .join(', ');

    expect(db.allRaw(
      `SELECT name FROM characters
        WHERE name IN (${characterNames.map(() => '?').join(', ')})`,
      characterNames,
    )).toEqual([]);
    expect(db.scalar(
      `SELECT count(*) FROM character_operations
        WHERE operation_uuid LIKE 'retiring-operation-%'`,
    )).toBe(0);
    expect(db.oneRaw(
      `SELECT character.name, subclass.content_key
         FROM characters AS character
         JOIN character_class_levels AS held
           ON held.character_id = character.id
         JOIN subclass_definitions AS subclass
           ON subclass.id = held.subclass_definition_id
        WHERE character.name = 'SRD Survivor'`,
    )).toEqual({
      name: 'SRD Survivor',
      content_key: '2024:subclass:champion',
    });
    expect(db.allRaw(
      `SELECT operation_uuid FROM character_operations
        WHERE character_id = ? ORDER BY operation_uuid`,
      [survivorId],
    )).toEqual([{ operation_uuid: 'survivor-safe-inverse' }]);
    expect(db.allRaw(
      `SELECT label FROM character_save_points
        WHERE character_id = ? ORDER BY label`,
      [survivorId],
    )).toEqual([{ label: 'Champion snapshot' }]);
    for (const table of [
      'subclass_definitions',
      'catalog_content_identities',
      'catalog_content_fingerprints',
      'catalog_content_aliases',
    ] as const) {
      expect(db.scalar(
        `SELECT count(*) FROM ${table}
          WHERE content_key IN (${placeholders})`,
        [...RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS],
      ), table).toBe(0);
    }
    expect(db.scalar(
      `SELECT count(*) FROM catalog_content_drafts
        WHERE base_content_key IN (${placeholders})`,
      [...RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS],
    )).toBe(0);
    expect(db.scalar(
      `SELECT count(*) FROM catalog_content_match_decisions
        WHERE target_content_key IN (${placeholders})`,
      [...RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS],
    )).toBe(0);
    expect(db.scalar(
      `SELECT count(*) FROM catalog_content_supersessions
        WHERE superseded_content_key IN (${placeholders})
           OR successor_content_key IN (${placeholders})`,
      [
        ...RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS,
        ...RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS,
      ],
    )).toBe(0);

    expect(externalVeteranGraph(db, externalVeteranKey)).toEqual(externalBefore);
    expect(db.scalar(
      `SELECT count(*) FROM subclass_definitions AS subclass
        JOIN catalog_content_identities AS identity
          ON identity.content_kind = 'subclass'
         AND identity.content_key = subclass.content_key
       WHERE identity.catalog_layer = 'bundled'`,
    )).toBe(12);
    expect(db.scalar('SELECT count(*) FROM class_definitions')).toBe(12);
    expect(db.connection.selectObject('PRAGMA foreign_key_check')).toBeUndefined();
    expect(lineageDeleteGuard(db)).toBe(guardBefore);

    const undo = await new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity('retirement-history-test-key'),
    ).undo({
      character_id: survivorId as never,
      operation_uuid: 'survivor-safe-inverse',
      expected_revision: 2 as never,
    });
    expect(undo).toMatchObject({ status: 'applied', revision: 3 });
    expect(db.scalar('SELECT notes FROM characters WHERE id = ?', [survivorId]))
      .toBe('Before safe history entry');

    const markerBefore = db.oneRaw(
      `SELECT id, scheme, checksum, applied_at
         FROM catalog_data_migrations
        WHERE id = 'retire_non_srd_bundled_subclasses_v1'`,
    );
    expect(markerBefore).not.toBeNull();
    upgraded.reopen();
    expect(upgraded.database.oneRaw(
      `SELECT id, scheme, checksum, applied_at
         FROM catalog_data_migrations
        WHERE id = 'retire_non_srd_bundled_subclasses_v1'`,
    )).toEqual(markerBefore);
  }, 20_000);

  it('rolls the exact 0039 delete guard back when execution fails after suspension', () => {
    const old = oldApplicationLifecycle();
    const guardBefore = lineageDeleteGuard(old.database);
    const injected = new FailAfterGuardSuspensionDatabase(
      old.database.connection,
    );

    expect(() => runCatalogDataMigrations(injected)).toThrow(
      'Injected failure after 0039 guard suspension.',
    );
    expect(lineageDeleteGuard(old.database)).toBe(guardBefore);
    expect(retirementMarker(old.database)).toBeNull();
  }, 20_000);

  it('rolls the exact 0039 delete guard and marker back on a forced FK-check failure', () => {
    const old = oldApplicationLifecycle();
    const db = old.database;
    const guardBefore = lineageDeleteGuard(db);
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(
      `INSERT INTO character_rule_overrides (
         character_id, rule_key, value
       ) VALUES (999999, 'forced-retirement-fk-failure', '1')`,
    );
    db.exec('PRAGMA foreign_keys = ON');

    expect(() => runCatalogDataMigrations(db)).toThrow(
      /foreign-key check failed for table character_rule_overrides/,
    );
    expect(lineageDeleteGuard(db)).toBe(guardBefore);
    expect(retirementMarker(db)).toBeNull();
  }, 20_000);
});
