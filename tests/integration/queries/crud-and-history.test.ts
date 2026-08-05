import { createHash } from 'node:crypto';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CharacterCommandExecutor,
} from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { DatabaseContext } from '../../../src/db/database';
import { CatalogQueries } from '../../../src/queries/catalog-queries';
import { registerBundledStableContentIdentity } from '../../../src/catalog/content-registry';
import { CharacterCrud } from '../../../src/queries/character-crud';
import {
  OperationHistoryQueries,
} from '../../../src/queries/operation-history';
import { SavePointQueries } from '../../../src/queries/save-points';
import { openTestDatabase } from '../../helpers/open-db';
import type { ContentKey } from '../../../src/domain/ids';

function digest(db: DatabaseContext, tables: readonly string[]): string {
  const rows = tables.map((table) =>
    db.allRaw(`SELECT * FROM ${table} ORDER BY id`),
  );
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

describe('character CRUD, catalog, save points, and operation history', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => connection.close());

  it('creates a default character and deletes its complete persisted graph', () => {
    const crud = new CharacterCrud(
      db,
      () => '2026-07-23T10:00:00.000Z',
    );
    const character = crud.create({ name: 'Query Hero' });

    expect(character).toMatchObject({
      name: 'Query Hero',
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      rules_edition_preference: '2024',
      allow_legacy: false,
      revision: 0,
      created_at: '2026-07-23T10:00:00.000Z',
      updated_at: '2026-07-23T10:00:00.000Z',
    });
    db.exec(
      `INSERT INTO character_save_points (
         character_id, label, snapshot, schema_version
       ) VALUES (?, 'Delete me', '{}', 'a7-v1')`,
      [character.id],
    );
    expect(
      db.oneRaw(
        `SELECT name, strength, revision
         FROM characters WHERE id = ?`,
        [character.id],
      ),
    ).toEqual({ name: 'Query Hero', strength: 10, revision: 0 });

    expect(crud.delete(character.id)).toEqual({
      id: character.id,
      deleted: true,
    });
    expect(
      db.oneRaw('SELECT id FROM characters WHERE id = ?', [character.id]),
    ).toBeNull();
    expect(
      Number(
        db.scalar(
          'SELECT count(*) FROM character_save_points WHERE character_id = ?',
          [character.id],
        ),
      ),
    ).toBe(0);
    expect(crud.delete(character.id).deleted).toBe(false);
  });

  it('persists an exact save-point snapshot without projecting its state bytes', () => {
    const characterId = db.exec(
      `INSERT INTO characters (name, intelligence)
       VALUES ('Snapshot Hero', 17)`,
    ).lastInsertId;
    const savePoints = new SavePointQueries(
      db,
      undefined,
      () => '2026-07-23T11:00:00.000Z',
    );

    const point = savePoints.create(characterId, 'Before experiment');
    const stored = db.oneRaw(
      `SELECT character_id, label, snapshot, schema_version, created_at
       FROM character_save_points WHERE id = ?`,
      [point.id],
    );
    expect(stored).toMatchObject({
      character_id: characterId,
      label: 'Before experiment',
      // a7-v15: the version that carries LU-1 level-feat provenance.
      // The column and the JSON inside it must agree — the backup validator
      // refuses a save point that disagrees with itself, so both are asserted
      // here.
      schema_version: 'a7-v16',
      created_at: '2026-07-23T11:00:00.000Z',
    });
    expect(stored?.schema_version).not.toBe('a7-v15');
    expect(JSON.parse(String(stored?.snapshot))).toMatchObject({
      schema_version: 'a7-v16',
      character: { name: 'Snapshot Hero', intelligence: 17 },
      character_class_levels: [],
      character_source_instances: [],
      spell_selection_slots: [],
      wizard_spellbook_entries: [],
      warning_acknowledgements: [],
      character_weapons: [],
      character_attunement_slots: [],
    });
    expect(JSON.parse(String(stored?.snapshot)).schema_version)
      .not.toBe('a7-v15');

    expect(
      Number(
        db.scalar(
          'SELECT count(*) FROM character_save_points WHERE character_id = ?',
          [characterId],
        ),
      ),
    ).toBe(1);
  });

  it('decodes persisted operations and changes into reversible history DTOs', async () => {
    const characterId = db.exec(
      `INSERT INTO characters (name, wisdom)
       VALUES ('History Hero', 13)`,
    ).lastInsertId;
    const executor = new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity('Q60-history-integrity'),
      { clock: () => '2026-07-23T12:00:00.000Z' },
    );
    await executor.execute({
      character_id: characterId,
      operation_uuid: '60606060-6060-4060-8060-606060606060',
      expected_revision: 0,
      command: {
        type: 'update_ability',
        ability: 'wisdom',
        score: 18,
        reason: 'Query history',
      },
    });

    const history = new OperationHistoryQueries(db).read(characterId);
    expect(history.operations).toEqual([
      {
        id: expect.any(Number),
        operation_uuid: '60606060-6060-4060-8060-606060606060',
        expected_revision: 0,
        resulting_revision: 1,
        history_action: 'command',
        created_at: '2026-07-23T12:00:00.000Z',
      },
    ]);
    expect(history.changes).toEqual([
      expect.objectContaining({
        sequence: 1,
        operation_uuid: '60606060-6060-4060-8060-606060606060',
        entity_type: 'character',
        reason: 'Query history',
        action_type: 'update_ability',
        reversible: true,
        previous_value: expect.objectContaining({ wisdom: 13 }),
        new_value: expect.objectContaining({ wisdom: 18 }),
      }),
    ]);
    expect(
      db.oneRaw(
        `SELECT wisdom, revision
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({ wisdom: 18, revision: 1 });
    expect(
      db.oneRaw(
        `SELECT inverse_command, resulting_revision
         FROM character_operations WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      inverse_command:
        '{"type":"update_ability","ability":"wisdom","score":13}',
      resulting_revision: 1,
    });
  });

  it('returns deterministic decoded catalog DTOs without mutating catalog rows', () => {
    registerBundledStableContentIdentity(db, {
      kind: 'class', contentKey: '2024:class:wizard' as ContentKey, normalizedName: 'querymage',
    });
    registerBundledStableContentIdentity(db, {
      kind: 'feat', contentKey: '2024:feat:alert' as ContentKey, normalizedName: 'queryfeat',
    });
    const classId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, spellcasting_ability,
         progression_type
       ) VALUES ('2024:class:wizard', 'Query Mage', '2024',
                 'intelligence', 'full')`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable,
         prerequisites, grant_rules
       ) VALUES ('2024:feat:alert', 'Query Feat', '2024', 1,
                 '{"level":4}', '[]')`,
    );
    db.exec(
      `INSERT INTO catalog_content_identities
         (content_key, content_kind, key_kind, catalog_layer, normalized_name)
       VALUES ('external:class:test', 'class', 'legacy-opaque', 'external', 'externalclass'),
              ('external:feat:test', 'feat', 'legacy-opaque', 'external', 'externalfeat')`,
    );
    db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, progression_type, supports_ritual_casting)
       VALUES ('external:class:test', 'External Class', 'expanded', 'none', 0)`,
    );
    db.exec(
      `INSERT INTO feat_definitions
         (content_key, name, rules_edition, ability_points, repeatable)
       VALUES ('external:feat:test', 'External Feat', 'expanded', 0, 0)`,
    );
    const identityId = db.exec(
      `INSERT INTO spell_identities (
         content_key, canonical_name, normalized_name
       ) VALUES ('q60:identity:test', 'Query Bolt', 'query bolt')`,
    ).lastInsertId;
    const spellId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, components
       ) VALUES ('q60:spell:test', ?, 'Query Bolt', '2024', 1,
                 'Evocation', 'V, S')`,
      [identityId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO spell_list_memberships (
         spell_version_id, spell_list_key
       ) VALUES (?, 'Wizard'), (?, 'Artificer')`,
      [spellId, spellId],
    );
    db.exec(
      `INSERT INTO spell_version_tags (spell_version_id, tag)
       VALUES (?, 'damage'), (?, 'arcane')`,
      [spellId, spellId],
    );
    const before = digest(db, [
      'class_definitions',
      'feat_definitions',
      'spell_versions',
      'spell_list_memberships',
      'spell_version_tags',
    ]);

    const catalog = new CatalogQueries(db).read();

    expect(catalog.classes).toContainEqual(
      expect.objectContaining({
        id: classId,
        name: 'Query Mage',
        spellcasting_ability: 'intelligence',
        progression_type: 'full',
      }),
    );
    expect(catalog.classes.map((entry) => entry.name)).not.toContain('External Class');
    expect(catalog.sources.feat).toEqual([
      expect.objectContaining({
        name: 'Query Feat',
        repeatable: true,
        prerequisites: { level: 4 },
        grant_rules: [],
      }),
    ]);
    expect(catalog.sources.feat.map((entry) => entry.name)).not.toContain('External Feat');
    expect(catalog.spells).toEqual([
      expect.objectContaining({
        id: spellId,
        display_name: 'Query Bolt',
        components: 'V, S',
        lists: ['Artificer', 'Wizard'],
        tags: ['arcane', 'damage'],
      }),
    ]);
    expect(
      db.oneRaw(
        `SELECT content_key, is_active
         FROM spell_versions WHERE id = ?`,
        [spellId],
      ),
    ).toEqual({ content_key: 'q60:spell:test', is_active: 1 });
    expect(
      digest(db, [
        'class_definitions',
        'feat_definitions',
        'spell_versions',
        'spell_list_memberships',
        'spell_version_tags',
      ]),
    ).toBe(before);
  });
});
