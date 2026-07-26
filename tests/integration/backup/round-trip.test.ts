import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  exportCharacterBackup,
  importCharacterBackup,
  type CharacterBackupDocument,
} from '../../../src/backup/character-backup';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
} from '../../../src/backup/database-backup';
import {
  CharacterState,
  CHARACTER_STATE_TABLES,
} from '../../../src/character/character-state';
import { DatabaseContext } from '../../../src/db/database';
import { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import schema from '../../../src/db/schema.sql?raw';
import {
  getSqlite3,
  MemoryDatabaseStorage,
  openTestDatabase,
} from '../../helpers/open-db';

const opened: Database[] = [];
const lifecycles: DatabaseLifecycle[] = [];
const timestamp = '2026-07-23 12:00:00';

interface CatalogIds {
  classId: number;
  spellId: number;
}

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  opened.push(connection);
  return new DatabaseContext(connection);
}

function seedCatalog(db: DatabaseContext, withPadding = false): CatalogIds {
  if (withPadding) {
    const dummyIdentity = db.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES ('dummy:identity', 'Dummy', 'dummy')`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO spell_versions
         (content_key, spell_identity_id, display_name, rules_edition, level, school)
       VALUES ('dummy:spell', ?, 'Dummy', '2024', 0, 'Illusion')`,
      [dummyIdentity],
    );
    db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES ('dummy:class', 'Dummy', '2024')`,
    );
  }
  const identityId = db.exec(
    `INSERT INTO spell_identities
       (content_key, canonical_name, normalized_name)
     VALUES ('spell:shield', 'Shield', 'shield')`,
  ).lastInsertId;
  const spellId = db.exec(
    `INSERT INTO spell_versions
       (content_key, spell_identity_id, display_name, rules_edition, level,
        school, is_active)
     VALUES ('2024:shield', ?, 'Shield', '2024', 1, 'Abjuration', 1)`,
    [identityId],
  ).lastInsertId;
  const classId = db.exec(
    `INSERT INTO class_definitions
       (content_key, name, rules_edition, spellcasting_ability,
        progression_type)
     VALUES ('class:wizard', 'Wizard', '2024', 'intelligence', 'full')`,
  ).lastInsertId;
  return { classId, spellId };
}

function seedCompleteCharacter(
  db: DatabaseContext,
  catalog: CatalogIds,
): number {
  const characterId = db.exec(
    `INSERT INTO characters (
       name, strength, dexterity, constitution, intelligence, wisdom,
       charisma, proficiency_bonus_override, rules_edition_preference,
       allow_legacy, revision, notes, created_at, updated_at
     ) VALUES (
       'Backup Hero', 8, 14, 13, 18, 12, 10, 4, '2024', 1, 9,
       'character note', ?, ?
     )`,
    [timestamp, timestamp],
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_class_levels (
       character_id, class_definition_id, level, is_starting_class, notes,
       created_at, updated_at
     ) VALUES (?, ?, 4, 1, 'class note', ?, ?)`,
    [characterId, catalog.classId, timestamp, timestamp],
  );
  const sourceId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, notes, created_at,
       updated_at
     ) VALUES (
       ?, 'original-source-uuid', 'class', ?, 'Wizard 4',
       '{"school":"abjuration"}', 1, 'source note', ?, ?
     )`,
    [characterId, catalog.classId, timestamp, timestamp],
  ).lastInsertId;
  db.exec(
    `INSERT INTO spell_selection_slots (
       character_id, source_instance_id, slot_key, rule_key, ordinal, bucket,
       eligibility_kind, current_spell_version_id, label, spell_level_min,
       spell_level_max, allowed_spell_lists, state, override_note, notes,
       selection_collection, selection_eligibility, created_at, updated_at
     ) VALUES (
       ?, ?, 'original-source-uuid:prepared:1', 'prepared', 1, 'prepared',
       'choice_from_query', ?, 'Prepared 1', 1, 2, '["Wizard"]',
       'kept_override', 'intentional', 'slot note', 'wizard_spellbook',
       'valid', ?, ?
     )`,
    [characterId, sourceId, catalog.spellId, timestamp, timestamp],
  );
  db.exec(
    `INSERT INTO wizard_spellbook_entries
       (character_id, spell_version_id, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [characterId, catalog.spellId, timestamp, timestamp],
  );
  db.exec(
    `INSERT INTO character_spell_preferences
       (character_id, spell_version_id, favourite, notes, created_at, updated_at)
     VALUES (?, ?, 1, 'preference note', ?, ?)`,
    [characterId, catalog.spellId, timestamp, timestamp],
  );
  db.exec(
    `INSERT INTO character_rule_overrides
       (character_id, rule_key, value, note, created_at, updated_at)
     VALUES (?, 'prepared_formula', '{"count":7}', 'override note', ?, ?)`,
    [characterId, timestamp, timestamp],
  );
  db.exec(
    `INSERT INTO warning_acknowledgements
       (character_id, warning_fingerprint, note, created_at, updated_at)
     VALUES (?, 'warning:shield', 'ack note', ?, ?)`,
    [characterId, timestamp, timestamp],
  );
  // Two weapons: one fully described with a selected mastery, one half-entered
  // (a name and nothing else, which the schema permits and the planner creates
  // the moment "Add weapon" is pressed). The second is the one that catches an
  // importer quietly substituting '' or 0 for a null column.
  db.exec(
    `INSERT INTO character_weapons (
       character_id, name, damage_dice, damage_type, versatile_damage_dice,
       finesse, light, thrown, ammunition_kind, range_normal_feet,
       range_long_feet, mastery_property, mastery_selected, other_properties,
       notes, created_at, updated_at
     ) VALUES (
       ?, 'Weathered Longsword', '1d8', 'Slashing', '1d10', 0, 0, 1, 'bolt',
       20, 60, 'Sap', 1, 'Notched near the hilt', 'weapon note', ?, ?
     )`,
    [characterId, timestamp, timestamp],
  );
  db.exec(
    `INSERT INTO character_weapons (character_id, name, created_at, updated_at)
     VALUES (?, 'Half-entered club', ?, ?)`,
    [characterId, timestamp, timestamp],
  );
  const historicalSourceId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, parent_source_instance_id, source_type,
       source_definition_id, display_name, notes, created_at, updated_at
     ) VALUES (
       ?, 'historical-source-uuid', ?, 'class', ?, 'Historical Wizard',
       'save-point only source', ?, ?
     )`,
    [characterId, sourceId, catalog.classId, timestamp, timestamp],
  ).lastInsertId;
  db.exec(
    `INSERT INTO spell_selection_slots (
       character_id, source_instance_id, slot_key, rule_key, bucket,
       eligibility_kind, current_spell_version_id, notes, created_at,
       updated_at
     ) VALUES (
       ?, ?, 'historical-source-uuid:known:1', 'known', 'known',
       'choice_from_list', ?, 'save-point only slot', ?, ?
     )`,
    [
      characterId,
      historicalSourceId,
      catalog.spellId,
      timestamp,
      timestamp,
    ],
  );
  const loadoutId = db.exec(
    `INSERT INTO spell_loadouts
       (character_id, name, notes, created_at, updated_at)
     VALUES (?, 'Exploration', 'loadout note', ?, ?)`,
    [characterId, timestamp, timestamp],
  ).lastInsertId;
  db.exec(
    `INSERT INTO spell_loadout_entries
       (spell_loadout_id, spell_version_id, role, created_at, updated_at)
     VALUES (?, ?, 'emergency', ?, ?)`,
    [loadoutId, catalog.spellId, timestamp, timestamp],
  );
  const snapshot = new CharacterState(db).capture(characterId);
  db.exec(
    `INSERT INTO character_save_points
       (character_id, label, snapshot, schema_version, created_at, updated_at)
     VALUES (?, 'Before experiment', ?, 'a7-v4', ?, ?)`,
    [characterId, JSON.stringify(snapshot), timestamp, timestamp],
  );
  // A SECOND SAVE POINT IN THE OLD SNAPSHOT FORMAT.
  //
  // Built by REMOVING the weapons key from a live capture and relabelling it,
  // which is exactly the shape `a7-v1` had — never by asking current code for an
  // `a7-v1` snapshot, because nothing can produce one any more. It exists so the
  // export → import round trip below runs over a database that holds a save
  // point predating weapons, which is what every real user upgrading to this
  // build will have.
  const legacySnapshot: Record<string, unknown> = {
    ...(snapshot as unknown as Record<string, unknown>),
    schema_version: 'a7-v1',
  };
  delete legacySnapshot.character_weapons;
  delete legacySnapshot.character_species;
  delete legacySnapshot.character_species_traits;
  delete legacySnapshot.character_background;
  delete legacySnapshot.character_armor;
  delete legacySnapshot.character_hit_point_rolls;
  delete legacySnapshot.character_skill_proficiencies;
  delete legacySnapshot.character_sheet_adjustments;
  db.exec(
    `INSERT INTO character_save_points
       (character_id, label, snapshot, schema_version, created_at, updated_at)
     VALUES (?, 'Older format', ?, 'a7-v1', ?, ?)`,
    [characterId, JSON.stringify(legacySnapshot), timestamp, timestamp],
  );
  db.exec(
    'DELETE FROM character_source_instances WHERE id = ?',
    [historicalSourceId],
  );
  return characterId;
}

function persistedCharacter(db: DatabaseContext, characterId: number) {
  return {
    character: db.one('SELECT * FROM characters WHERE id = ?', [characterId]),
    classLevels: db.all(
      'SELECT * FROM character_class_levels WHERE character_id = ?',
      [characterId],
    ),
    sources: db.all(
      'SELECT * FROM character_source_instances WHERE character_id = ?',
      [characterId],
    ),
    slots: db.all(
      'SELECT * FROM spell_selection_slots WHERE character_id = ?',
      [characterId],
    ),
    spellbook: db.all(
      'SELECT * FROM wizard_spellbook_entries WHERE character_id = ?',
      [characterId],
    ),
    preferences: db.all(
      'SELECT * FROM character_spell_preferences WHERE character_id = ?',
      [characterId],
    ),
    overrides: db.all(
      'SELECT * FROM character_rule_overrides WHERE character_id = ?',
      [characterId],
    ),
    acknowledgements: db.all(
      'SELECT * FROM warning_acknowledgements WHERE character_id = ?',
      [characterId],
    ),
    savePoints: db.all(
      'SELECT * FROM character_save_points WHERE character_id = ?',
      [characterId],
    ),
    loadouts: db.all(
      'SELECT * FROM spell_loadouts WHERE character_id = ?',
      [characterId],
    ),
  };
}

afterEach(() => {
  for (const lifecycle of lifecycles.splice(0)) {
    lifecycle.close();
  }
  for (const connection of opened.splice(0)) {
    if (connection.isOpen()) {
      connection.close();
    }
  }
});

describe('portable character backup', () => {
  it('round-trips every user-authored surface using target catalog keys and restorable save points', async () => {
    const source = await database();
    const sourceCatalog = seedCatalog(source);
    const sourceCharacterId = seedCompleteCharacter(source, sourceCatalog);
    const document = exportCharacterBackup(
      source,
      sourceCharacterId,
      '2026-07-23T12:00:00.000Z',
    );
    const importedDocument = structuredClone(document);
    const exportedSavePoint =
      importedDocument.tables.character_save_points[0] as Record<string, unknown>;
    const reorderedSnapshot = JSON.parse(
      String(exportedSavePoint.snapshot),
    ) as {
      character_source_instances: Array<Record<string, unknown>>;
    };
    reorderedSnapshot.character_source_instances.reverse();
    exportedSavePoint.snapshot = JSON.stringify(reorderedSnapshot);

    const target = await database();
    const targetCatalog = seedCatalog(target, true);
    target.exec("INSERT INTO characters (name) VALUES ('Existing target')");
    const { characterId } = importCharacterBackup(target, importedDocument);
    const persisted = persistedCharacter(target, characterId);

    expect(characterId).toBe(2);
    expect(persisted.character).toMatchObject({
      name: 'Backup Hero',
      intelligence: 18,
      allow_legacy: 1,
      revision: 9,
      notes: 'character note',
      created_at: timestamp,
    });
    expect(persisted.classLevels).toEqual([
      expect.objectContaining({
        character_id: characterId,
        class_definition_id: targetCatalog.classId,
        level: 4,
        notes: 'class note',
      }),
    ]);
    const importedSource = persisted.sources[0]!;
    expect(importedSource).toMatchObject({
      character_id: characterId,
      source_definition_id: targetCatalog.classId,
      config: '{"school":"abjuration"}',
      notes: 'source note',
    });
    expect(importedSource.instance_uuid).not.toBe('original-source-uuid');
    expect(persisted.slots).toEqual([
      expect.objectContaining({
        character_id: characterId,
        source_instance_id: importedSource.id,
        slot_key: `${String(importedSource.instance_uuid)}:prepared:1`,
        current_spell_version_id: targetCatalog.spellId,
        state: 'kept_override',
        override_note: 'intentional',
        notes: 'slot note',
      }),
    ]);
    expect(persisted.spellbook).toEqual([
      expect.objectContaining({
        character_id: characterId,
        spell_version_id: targetCatalog.spellId,
      }),
    ]);
    expect(persisted.preferences).toEqual([
      expect.objectContaining({
        favourite: 1,
        notes: 'preference note',
        spell_version_id: targetCatalog.spellId,
      }),
    ]);
    expect(persisted.overrides).toEqual([
      expect.objectContaining({
        rule_key: 'prepared_formula',
        value: '{"count":7}',
        note: 'override note',
      }),
    ]);
    expect(persisted.acknowledgements).toEqual([
      expect.objectContaining({
        warning_fingerprint: 'warning:shield',
        note: 'ack note',
      }),
    ]);
    expect(persisted.loadouts).toEqual([
      expect.objectContaining({
        name: 'Exploration',
        notes: 'loadout note',
      }),
    ]);
    expect(
      target.all(
        `SELECT entry.role, entry.spell_version_id
         FROM spell_loadout_entries AS entry
         JOIN spell_loadouts AS loadout ON loadout.id = entry.spell_loadout_id
         WHERE loadout.character_id = ?`,
        [characterId],
      ),
    ).toEqual([
      { role: 'emergency', spell_version_id: targetCatalog.spellId },
    ]);

    // WEAPONS SURVIVE THE DOCUMENT.
    //
    // Column by column rather than `toMatchObject`, because the interesting
    // failure is a field quietly LOST or DEFAULTED, which a partial match would
    // not see. The half-entered weapon keeps every null as a null: nothing on
    // the way through is entitled to decide what its damage die was.
    const importedWeapons = target.all(
      'SELECT * FROM character_weapons WHERE character_id = ? ORDER BY id',
      [characterId],
    );
    expect(importedWeapons).toHaveLength(2);
    expect(importedWeapons[0]).toMatchObject({
      character_id: characterId,
      name: 'Weathered Longsword',
      damage_dice: '1d8',
      damage_type: 'Slashing',
      versatile_damage_dice: '1d10',
      finesse: 0,
      light: 0,
      thrown: 1,
      ammunition_kind: 'bolt',
      range_normal_feet: 20,
      range_long_feet: 60,
      mastery_property: 'Sap',
      mastery_selected: 1,
      other_properties: 'Notched near the hilt',
      notes: 'weapon note',
      created_at: timestamp,
    });
    expect(importedWeapons[1]).toMatchObject({
      character_id: characterId,
      name: 'Half-entered club',
      damage_dice: null,
      damage_type: null,
      versatile_damage_dice: null,
      ammunition_kind: null,
      range_normal_feet: null,
      range_long_feet: null,
      mastery_property: null,
      mastery_selected: 0,
      other_properties: null,
      notes: null,
    });

    const saved = JSON.parse(
      String(persisted.savePoints[0]!.snapshot),
    ) as Record<string, any>;
    // The current-format save point carries the weapons, re-keyed to the rows
    // that were just written, so restoring it puts back the same two weapons.
    expect(saved.schema_version).toBe('a7-v4');
    expect(saved.character_weapons.map((row: { name: string }) => row.name)).toEqual([
      'Weathered Longsword',
      'Half-entered club',
    ]);
    expect(saved.character_weapons.map((row: { id: number }) => row.id)).toEqual(
      importedWeapons.map((row) => row.id),
    );
    for (const row of saved.character_weapons) {
      expect(row.character_id).toBe(characterId);
    }

    // THE OLD-FORMAT SAVE POINT COMES OUT AS AN OLD-FORMAT SAVE POINT.
    //
    // Not upgraded, not backfilled with `character_weapons: []`. Backfilling
    // would claim the character owned no weapons at that moment — which is not
    // what an `a7-v1` snapshot says, and restoring the claim would delete two
    // real weapons.
    const legacySaved = JSON.parse(
      String(persisted.savePoints[1]!.snapshot),
    ) as Record<string, unknown>;
    expect(persisted.savePoints[1]!.schema_version).toBe('a7-v1');
    expect(legacySaved.schema_version).toBe('a7-v1');
    expect(Object.hasOwn(legacySaved, 'character_weapons')).toBe(false);
    expect(saved.character_source_instances[0]).toMatchObject({
      character_id: characterId,
      id: importedSource.id,
      instance_uuid: importedSource.instance_uuid,
      source_definition_id: targetCatalog.classId,
    });
    expect(saved.character_source_instances[1]).toMatchObject({
      character_id: characterId,
      parent_source_instance_id: importedSource.id,
      source_definition_id: targetCatalog.classId,
    });
    expect(saved.spell_selection_slots[0]).toMatchObject({
      character_id: characterId,
      source_instance_id: importedSource.id,
      current_spell_version_id: targetCatalog.spellId,
    });

    const postImportSourceId = target.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name
       ) VALUES (1, 'post-import-source', 'class', ?, 'Post import source')`,
      [targetCatalog.classId],
    ).lastInsertId;
    expect(postImportSourceId).toBeGreaterThan(
      Math.max(
        ...saved.character_source_instances.map((row: { id: number }) => row.id),
      ),
    );

    target.exec(
      `UPDATE characters SET intelligence = 6 WHERE id = ?`,
      [characterId],
    );
    target.exec(
      `DELETE FROM warning_acknowledgements WHERE character_id = ?`,
      [characterId],
    );
    new CharacterState(target).restore(characterId, saved);
    expect(
      target.one(
        `SELECT intelligence FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({ intelligence: 18 });
    expect(
      target.all(
        `SELECT warning_fingerprint, note
         FROM warning_acknowledgements WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([{ warning_fingerprint: 'warning:shield', note: 'ack note' }]);
    expect(
      target.all(
        `SELECT instance_uuid, notes
         FROM character_source_instances
         WHERE character_id = ?
         ORDER BY id`,
        [characterId],
      ),
    ).toEqual([
      expect.objectContaining({ notes: 'source note' }),
      expect.objectContaining({ notes: 'save-point only source' }),
    ]);
    expect(
      target.all(
        `SELECT notes, current_spell_version_id
         FROM spell_selection_slots
         WHERE character_id = ?
         ORDER BY id`,
        [characterId],
      ),
    ).toEqual([
      expect.objectContaining({
        notes: 'slot note',
        current_spell_version_id: targetCatalog.spellId,
      }),
      expect.objectContaining({
        notes: 'save-point only slot',
        current_spell_version_id: targetCatalog.spellId,
      }),
    ]);
  });

  it('rejects cross-character, unavailable-catalog, and constraint-corrupt documents without persisted writes', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const sourceCharacterId = seedCompleteCharacter(source, catalog);
    const document = exportCharacterBackup(source, sourceCharacterId);

    const target = await database();
    seedCatalog(target, true);
    target.exec("INSERT INTO characters (name) VALUES ('Protected target')");
    const before = target.all('SELECT * FROM characters ORDER BY id');

    const crossed = structuredClone(document);
    (
      crossed.tables.character_spell_preferences[0] as Record<string, unknown>
    ).character_id = sourceCharacterId + 1;
    expect(() => importCharacterBackup(target, crossed)).toThrow(
      'belongs to another character.',
    );
    expect(target.all('SELECT * FROM characters ORDER BY id')).toEqual(before);

    const unavailable = structuredClone(document);
    (
      unavailable.references.spell_versions[0] as unknown as Record<
        string,
        unknown
      >
    ).content_key = '2024:not-installed';
    expect(() => importCharacterBackup(target, unavailable)).toThrow(
      'requires unavailable active spell_versions content_key',
    );
    expect(target.all('SELECT * FROM characters ORDER BY id')).toEqual(before);

    const constraintCorrupt = structuredClone(document);
    const originalOverride =
      constraintCorrupt.tables.character_rule_overrides[0]!;
    (
      constraintCorrupt.tables.character_rule_overrides as unknown as Array<
        Record<string, unknown>
      >
    ).push({ ...originalOverride, id: 999 });
    expect(() => importCharacterBackup(target, constraintCorrupt)).toThrow();
    expect(target.all('SELECT * FROM characters ORDER BY id')).toEqual(before);
    for (const table of [
      ...CHARACTER_STATE_TABLES,
      'character_spell_preferences',
      'character_rule_overrides',
      'character_save_points',
      'spell_loadouts',
    ]) {
      expect(
        target.scalar(
          `SELECT count(*) FROM "${table}" WHERE character_id > 1`,
        ),
      ).toBe(0);
    }
  });
});

/**
 * A BACKUP FILE WRITTEN BEFORE WEAPONS TRAVELLED, IMPORTED FOR REAL.
 *
 * Hand-frozen, byte for byte: ten table keys with no `character_weapons`, and a
 * save point whose snapshot is an `a7-v1` object with five table keys. Nothing
 * here is produced by `exportCharacterBackup` — a fixture generated from current
 * code tracks the format wherever it goes and could never catch the regression
 * this guards against, which is precisely the day somebody makes the new table
 * mandatory and every downloaded file stops opening.
 *
 * The unit suite proves this validates; this proves it lands in a database.
 */
const FROZEN_V1_BACKUP_JSON = `{
  "format": "dnd-multiclass-spells/character",
  "version": 1,
  "exported_at": "2026-05-01T09:30:00.000Z",
  "source_character_id": 3,
  "character": {
    "id": 3,
    "name": "Archived Hero",
    "strength": 11,
    "dexterity": 16,
    "constitution": 12,
    "intelligence": 17,
    "wisdom": 9,
    "charisma": 13,
    "proficiency_bonus_override": null,
    "rules_edition_preference": "2024",
    "allow_legacy": 0,
    "notes": "written before weapons travelled",
    "revision": 4,
    "created_at": "2026-04-02 08:00:00",
    "updated_at": "2026-05-01 09:00:00"
  },
  "tables": {
    "character_class_levels": [],
    "character_source_instances": [],
    "spell_selection_slots": [],
    "wizard_spellbook_entries": [],
    "character_spell_preferences": [],
    "character_rule_overrides": [],
    "warning_acknowledgements": [],
    "character_save_points": [
      {
        "id": 21,
        "character_id": 3,
        "label": "Archived checkpoint",
        "schema_version": "a7-v1",
        "snapshot": "{\\"schema_version\\":\\"a7-v1\\",\\"character\\":{\\"name\\":\\"Archived Hero\\",\\"strength\\":11,\\"dexterity\\":16,\\"constitution\\":12,\\"intelligence\\":17,\\"wisdom\\":9,\\"charisma\\":13,\\"proficiency_bonus_override\\":null,\\"rules_edition_preference\\":\\"2024\\",\\"allow_legacy\\":0,\\"notes\\":\\"written before weapons travelled\\"},\\"character_class_levels\\":[],\\"character_source_instances\\":[],\\"spell_selection_slots\\":[],\\"wizard_spellbook_entries\\":[],\\"warning_acknowledgements\\":[]}",
        "created_at": "2026-04-10 12:00:00",
        "updated_at": "2026-04-10 12:00:00"
      }
    ],
    "spell_loadouts": [],
    "spell_loadout_entries": []
  },
  "references": {
    "class_definitions": [],
    "subclass_definitions": [],
    "feat_definitions": [],
    "species_definitions": [],
    "background_definitions": [],
    "spell_versions": []
  }
}`;

describe('an already-downloaded backup file', () => {
  it('imports into a build that carries weapons, as a character with none', async () => {
    const target = await database();
    const archived = JSON.parse(FROZEN_V1_BACKUP_JSON) as Record<
      string,
      unknown
    >;
    expect(
      Object.hasOwn(archived.tables as object, 'character_weapons'),
    ).toBe(false);

    const { characterId } = importCharacterBackup(target, archived);

    expect(
      target.one('SELECT name, notes, revision FROM characters WHERE id = ?', [
        characterId,
      ]),
    ).toEqual({
      name: 'Archived Hero',
      notes: 'written before weapons travelled',
      revision: 4,
    });
    // Absence of weapons is not corruption: the file says nothing about
    // weapons, and a character with no weapons is exactly what it describes.
    expect(
      target.scalar(
        'SELECT count(*) FROM character_weapons WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
    // The same claim for every table added since, including the four stored
    // sheet inputs. `[]` is the honest reading of a file that never mentioned
    // them, and this is the assertion that fails on the day somebody makes one
    // of them mandatory and every downloaded file stops opening.
    for (const table of [
      'character_species',
      'character_species_traits',
      'character_background',
      'character_armor',
      'character_hit_point_rolls',
      'character_skill_proficiencies',
      'character_sheet_adjustments',
    ]) {
      expect(Object.hasOwn(archived.tables as object, table)).toBe(false);
      expect(
        target.scalar(
          `SELECT count(*) FROM "${table}" WHERE character_id = ?`,
          [characterId],
        ),
        `${table} is empty after importing a file that never mentioned it`,
      ).toBe(0);
    }

    // The old save point survives unchanged and unupgraded.
    const savePoint = target.one(
      `SELECT label, schema_version, snapshot
       FROM character_save_points WHERE character_id = ?`,
      [characterId],
    );
    expect(savePoint).toMatchObject({
      label: 'Archived checkpoint',
      schema_version: 'a7-v1',
    });
    const snapshot = JSON.parse(String(savePoint?.snapshot)) as Record<
      string,
      unknown
    >;
    expect(snapshot.schema_version).toBe('a7-v1');
    expect(Object.hasOwn(snapshot, 'character_weapons')).toBe(false);
    expect(Object.hasOwn(snapshot, 'character_armor')).toBe(false);
  });

  it('re-exports what it imported, still readable by this build', async () => {
    // The export path re-parses its own stored save points, so an `a7-v1` one
    // must survive going back OUT as well as coming in. Getting this wrong
    // makes a character that holds an old save point impossible to export at
    // all — a worse failure than the import one, because it is silent until the
    // user needs the file.
    const target = await database();
    const { characterId } = importCharacterBackup(
      target,
      JSON.parse(FROZEN_V1_BACKUP_JSON),
    );
    const reexported = exportCharacterBackup(
      target,
      characterId,
      '2026-07-24T00:00:00.000Z',
    );
    expect(reexported.tables.character_weapons).toEqual([]);
    expect(reexported.tables.character_armor).toEqual([]);
    expect(reexported.tables.character_hit_point_rolls).toEqual([]);
    expect(reexported.tables.character_skill_proficiencies).toEqual([]);
    expect(reexported.tables.character_sheet_adjustments).toEqual([]);
    expect(reexported.tables.character_save_points).toHaveLength(1);
    expect(
      reexported.tables.character_save_points[0] as Record<string, unknown>,
    ).toMatchObject({ schema_version: 'a7-v1' });
  });

  it('restores its old save point without deleting weapons added since', async () => {
    // The case the version bump exists for. The user imports an old backup,
    // then adds a weapon, then rolls back to the old save point. An `a7-v1`
    // snapshot never recorded weapons, so it has no opinion about them —
    // treating its silence as "there were none" would destroy the new weapon.
    const target = await database();
    const { characterId } = importCharacterBackup(
      target,
      JSON.parse(FROZEN_V1_BACKUP_JSON),
    );
    target.exec(
      `INSERT INTO character_weapons (character_id, name, damage_dice)
       VALUES (?, 'Bought afterwards', '1d6')`,
      [characterId],
    );
    target.exec('UPDATE characters SET name = ? WHERE id = ?', [
      'Renamed since',
      characterId,
    ]);

    const stored = target.scalar<string>(
      'SELECT snapshot FROM character_save_points WHERE character_id = ?',
      [characterId],
    );
    new CharacterState(target).restore(characterId, JSON.parse(String(stored)));

    // The snapshot DID record the name, so the name is rolled back.
    expect(
      target.scalar('SELECT name FROM characters WHERE id = ?', [characterId]),
    ).toBe('Archived Hero');
    // It did not record weapons, so the weapon is still there.
    expect(
      target.all(
        'SELECT name FROM character_weapons WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual([{ name: 'Bought afterwards' }]);
  });

  it('restores its old save point without deleting armour added since', async () => {
    // The same case, one version further on, and the reason `a7-v4` was minted
    // rather than folded into `a7-v3`: an `a7-v1` snapshot has no opinion about
    // armour either, so a suit bought after the import must survive the
    // rollback. Had the version not moved, every save point already on a user's
    // disk would have started claiming to carry armour it never saw.
    const target = await database();
    const { characterId } = importCharacterBackup(
      target,
      JSON.parse(FROZEN_V1_BACKUP_JSON),
    );
    target.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus
       ) VALUES (?, 'worn', 'Bought afterwards', 'light', 11, 'full')`,
      [characterId],
    );
    target.exec(
      `INSERT INTO character_skill_proficiencies (character_id, skill)
       VALUES (?, 'stealth')`,
      [characterId],
    );

    const stored = target.scalar<string>(
      'SELECT snapshot FROM character_save_points WHERE character_id = ?',
      [characterId],
    );
    new CharacterState(target).restore(characterId, JSON.parse(String(stored)));

    expect(
      target.all(
        'SELECT name FROM character_armor WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual([{ name: 'Bought afterwards' }]);
    expect(
      target.all(
        'SELECT skill FROM character_skill_proficiencies WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual([{ skill: 'stealth' }]);
  });
});

describe('complete database backup', () => {
  it('restores the complete image and rejects corrupt bytes without changing the live connection', async () => {
    const sqlite3 = await getSqlite3();
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
      schema,
    );
    lifecycles.push(lifecycle);
    lifecycle.open();
    lifecycle.database.exec(
      "INSERT INTO characters (name, notes) VALUES ('Image Hero', 'kept')",
    );
    // A non-character table, to prove a whole-image round trip carries more
    // than the character graph. This used to be `cache`, one of the eight
    // Laravel-only tables; `spell_identities` is a better stand-in anyway,
    // because it is data the application actually reads.
    lifecycle.database.exec(
      `INSERT INTO spell_identities (content_key, canonical_name, normalized_name)
       VALUES ('spell:fireball', 'Fireball', 'fireball')`,
    );
    const backup = await exportDatabaseBackup(
      lifecycle,
      '2026-07-23T12:00:00.000Z',
    );
    lifecycle.database.exec('DELETE FROM characters');
    lifecycle.database.exec('DELETE FROM spell_identities');

    await importDatabaseBackup(lifecycle, backup);
    expect(lifecycle.database.all('SELECT name, notes FROM characters')).toEqual(
      [{ name: 'Image Hero', notes: 'kept' }],
    );
    expect(
      lifecycle.database.all(
        'SELECT content_key, canonical_name, normalized_name FROM spell_identities',
      ),
    ).toEqual([
      {
        content_key: 'spell:fireball',
        canonical_name: 'Fireball',
        normalized_name: 'fireball',
      },
    ]);

    const connection = lifecycle.database.connection;
    await expect(
      importDatabaseBackup(lifecycle, {
        ...backup,
        sqlite: new TextEncoder().encode('corrupt'),
      }),
    ).rejects.toThrow();
    expect(lifecycle.database.connection).toBe(connection);
    expect(lifecycle.database.all('SELECT name, notes FROM characters')).toEqual(
      [{ name: 'Image Hero', notes: 'kept' }],
    );
  });
});
