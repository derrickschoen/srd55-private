import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../../../src/domain/source-markers';
import {
  ShareContentReferenceMissingError,
  ShareDocumentIdentityPersistenceError,
  ShareSelectedSpellVersionMissingError,
  ShareSourceConfigShapeError,
  ShareStoredWeaponRangeKindError,
} from '../../../src/sharing/character-share-errors';
import { exportCharacterShare } from '../../../src/sharing/character-share';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];

afterEach(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
});

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  return new DatabaseContext(connection);
}

function character(db: DatabaseContext): number {
  return db.exec(
    "INSERT INTO characters (name) VALUES ('Broken share fixture')",
  ).lastInsertId;
}

function guidedSpeciesSource(
  db: DatabaseContext,
  characterId: number,
  config: string | null,
): number {
  return db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state, notes
     ) VALUES (?, ?, 'species', NULL, 'Generated species', ?, 1, 'active', ?)`,
    [
      characterId,
      crypto.randomUUID(),
      config,
      GUIDED_SPECIES_SOURCE_MARKER,
    ],
  ).lastInsertId;
}

function thrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a defect error, but the call returned.');
}

describe('character share defect guards', () => {
  it('tags a corrupt source config shape', async () => {
    const db = await database();
    const characterId = character(db);
    guidedSpeciesSource(db, characterId, '[]');

    const error = thrown(() => exportCharacterShare(db, characterId));

    expect(error).toBeInstanceOf(ShareSourceConfigShapeError);
  });

  it('tags a missing content reference with its lookup facts', async () => {
    const db = await database();
    const characterId = character(db);
    guidedSpeciesSource(
      db,
      characterId,
      JSON.stringify({ spell_version_id: 404 }),
    );

    const error = thrown(() => exportCharacterShare(db, characterId));

    expect(error).toBeInstanceOf(ShareContentReferenceMissingError);
    expect(error).toMatchObject({
      table: 'spell_versions',
      reference_id: '404',
    });
  });

  it('tags a corrupt stored weapon range kind', async () => {
    const db = await database();
    const characterId = character(db);
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `INSERT INTO character_weapons (character_id, name, range_kind)
       VALUES (?, 'Impossible bow', 'teleporting')`,
      [characterId],
    );
    db.exec('PRAGMA ignore_check_constraints = OFF');

    const error = thrown(() => exportCharacterShare(db, characterId));

    expect(error).toBeInstanceOf(ShareStoredWeaponRangeKindError);
    expect(error).toMatchObject({ range_kind: 'teleporting' });
  });

  it('tags failure to persist a generated share identity', async () => {
    const db = await database();
    const characterId = character(db);
    db.exec(
      `CREATE TRIGGER discard_share_identity
       AFTER INSERT ON character_share_receipts
       BEGIN
         DELETE FROM character_share_receipts
         WHERE character_id = NEW.character_id;
       END`,
    );

    const error = thrown(() => exportCharacterShare(db, characterId));

    expect(error).toBeInstanceOf(ShareDocumentIdentityPersistenceError);
    expect(error).toMatchObject({ character_id: characterId });
  });

  it('tags a selected spell version missing from the export projection', async () => {
    const db = await database();
    const characterId = character(db);
    const sourceId = guidedSpeciesSource(db, characterId, null);
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(
      `INSERT INTO spell_selection_slots (
         character_id, source_instance_id, slot_key, rule_key, ordinal,
         bucket, eligibility_kind, current_spell_version_id, state,
         selection_eligibility
       ) VALUES (?, ?, 'broken-slot', 'broken-rule', 1, 'known', 'any',
                 404, 'active', 'valid')`,
      [characterId, sourceId],
    );
    db.exec('PRAGMA foreign_keys = ON');

    const error = thrown(() => exportCharacterShare(db, characterId));

    expect(error).toBeInstanceOf(ShareSelectedSpellVersionMissingError);
    expect(error).toMatchObject({ spell_version_id: 404 });
  });
});
