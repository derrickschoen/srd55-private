import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  exportCharacterBackup,
  importCharacterBackup,
  validateCharacterBackup,
  type CharacterBackupDocument,
} from '../../../src/backup/character-backup';
import {
  CHARACTER_BACKUP_FORMAT,
  CHARACTER_BACKUP_VERSION,
  PREVIOUS_CHARACTER_BACKUP_VERSION,
} from '../../../src/backup/backup-version';
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
         (content_key, spell_identity_id, display_name, rules_edition, level,
          school, provenance)
       VALUES ('dummy:spell', ?, 'Dummy', '2024', 0, 'Illusion', 'srd')`,
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
        school, provenance, is_active)
     VALUES ('2024:shield', ?, 'Shield', '2024', 1, 'Abjuration', 'srd', 1)`,
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
       allow_legacy, revision, alignment, appearance, backstory, notes,
       created_at, updated_at
     ) VALUES (
       'Backup Hero', 8, 14, 13, 18, 12, 10, 4, '2024', 1, 9,
       'Chaotic Good', 'Silver hair\nGreen eyes',
       'Raised near </script><the old tower>.', 'character note', ?, ?
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
       character_id, name, damage_kind, damage_dice, damage_type,
       versatile_damage_kind, versatile_damage_dice,
       finesse, light, thrown, ammunition_kind, range_kind, range_near_feet,
       range_far_feet, mastery_property, mastery_selected, other_properties,
       notes, attack_kind, created_at, updated_at
     ) VALUES (
       ?, 'Weathered Longsword', 'dice', '1d8', 'Slashing', 'dice', '1d10',
       0, 0, 1, 'bolt',
       'ranged', 20, 60, 'Sap', 1, 'Notched near the hilt', 'weapon note',
       'ranged', ?, ?
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
  // AN EFFECT WITH PROVENANCE. `source_instance_id` is the only column on
  // `character_effects` that must be REWRITTEN on import — it points at another
  // character-owned row whose id the import mints — so a fixture whose effects
  // all carried NULL would leave the remap untested in both the document and
  // the save-point rewrite.
  db.exec(
    `INSERT INTO character_effects (
       character_id, sort_order, effect_kind, damage_type, source_instance_id,
       label, notes, created_at, updated_at
     ) VALUES (
       ?, 1, 'damage_resistance', 'Poison', ?, 'Dwarven Resilience',
       'effect note', ?, ?
     )`,
    [characterId, sourceId, timestamp, timestamp],
  );
  db.exec(
    `INSERT INTO character_effects (
       character_id, sort_order, effect_kind, hit_points_per_level,
       label, created_at, updated_at
     ) VALUES (?, 2, 'hp_modifier', 1, 'Dwarven Toughness', ?, ?)`,
    [characterId, timestamp, timestamp],
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
     VALUES (?, 'Before experiment', ?, ?, ?, ?)`,
    [
      characterId,
      JSON.stringify(snapshot),
      snapshot.schema_version,
      timestamp,
      timestamp,
    ],
  );
  // The prior a7-v15 boundary stays historical; this fixture follows the
  // current snapshot value so the backup exercises the newly appended flavor.
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
    character: { ...snapshot.character },
  };
  const legacyCharacter = legacySnapshot.character;
  if (typeof legacyCharacter !== 'object' || legacyCharacter === null) {
    throw new Error('The legacy snapshot fixture has no character object.');
  }
  delete (legacyCharacter as Record<string, unknown>)
    .ability_allocation_method;
  delete (legacyCharacter as Record<string, unknown>).alignment;
  delete (legacyCharacter as Record<string, unknown>).appearance;
  delete (legacyCharacter as Record<string, unknown>).backstory;
  delete legacySnapshot.character_weapons;
  delete legacySnapshot.character_species;
  delete legacySnapshot.character_species_traits;
  delete legacySnapshot.character_background;
  delete legacySnapshot.character_armor;
  delete legacySnapshot.character_hit_point_rolls;
  delete legacySnapshot.character_skill_proficiencies;
  delete legacySnapshot.character_sheet_adjustments;
  delete legacySnapshot.character_effects;
  delete legacySnapshot.character_skill_grants;
  delete legacySnapshot.character_skill_expertise_grants;
  delete legacySnapshot.character_items;
  delete legacySnapshot.character_attunement_slots;
  delete legacySnapshot.character_level_feat_choices;
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
    character: db.oneRaw('SELECT * FROM characters WHERE id = ?', [characterId]),
    classLevels: db.allRaw(
      'SELECT * FROM character_class_levels WHERE character_id = ?',
      [characterId],
    ),
    sources: db.allRaw(
      'SELECT * FROM character_source_instances WHERE character_id = ?',
      [characterId],
    ),
    slots: db.allRaw(
      'SELECT * FROM spell_selection_slots WHERE character_id = ?',
      [characterId],
    ),
    spellbook: db.allRaw(
      'SELECT * FROM wizard_spellbook_entries WHERE character_id = ?',
      [characterId],
    ),
    preferences: db.allRaw(
      'SELECT * FROM character_spell_preferences WHERE character_id = ?',
      [characterId],
    ),
    overrides: db.allRaw(
      'SELECT * FROM character_rule_overrides WHERE character_id = ?',
      [characterId],
    ),
    acknowledgements: db.allRaw(
      'SELECT * FROM warning_acknowledgements WHERE character_id = ?',
      [characterId],
    ),
    savePoints: db.allRaw(
      'SELECT * FROM character_save_points WHERE character_id = ?',
      [characterId],
    ),
    loadouts: db.allRaw(
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
  it('default-fills quantity one in a historical item row and re-exports it', async () => {
    const source = await database();
    const sourceCharacterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Historical inventory')",
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_items (character_id, name, quantity)
       VALUES (?, 'Potion', 6)`,
      [sourceCharacterId],
    );
    const historical = structuredClone(
      exportCharacterBackup(
        source,
        sourceCharacterId,
        '2026-07-30T12:00:00.000Z',
      ),
    ) as CharacterBackupDocument;
    const historicalItem = historical.tables.character_items[0] as Record<
      string,
      unknown
    >;
    delete historicalItem.quantity;

    const target = await database();
    const imported = importCharacterBackup(target, historical);
    expect(
      target.oneRaw(
        'SELECT name, quantity FROM character_items WHERE character_id = ?',
        [imported.characterId],
      ),
    ).toEqual({ name: 'Potion', quantity: 1 });

    const reexported = exportCharacterBackup(
      target,
      imported.characterId,
      '2026-07-30T12:01:00.000Z',
    );
    expect(reexported.tables.character_items[0]).toMatchObject({
      name: 'Potion',
      quantity: 1,
    });
  });

  it('current flavor backup round-trips root text', async () => {
    const source = await database();
    const sourceCatalog = seedCatalog(source);
    const sourceCharacterId = seedCompleteCharacter(source, sourceCatalog);
    const first = exportCharacterBackup(
      source,
      sourceCharacterId,
      '2026-07-31T12:00:00.000Z',
    );

    const target = await database();
    seedCatalog(target, true);
    const imported = importCharacterBackup(target, first);
    const second = exportCharacterBackup(
      target,
      imported.characterId,
      '2026-07-31T12:01:00.000Z',
    );

    expect({
      alignment: second.character.alignment,
      appearance: second.character.appearance,
      backstory: second.character.backstory,
      notes: second.character.notes,
    }).toEqual({
      alignment: 'Chaotic Good',
      appearance: 'Silver hair\nGreen eyes',
      backstory: 'Raised near </script><the old tower>.',
      notes: 'character note',
    });
  });

  it('historical v2 flavor absence remains null', async () => {
    const source = await database();
    const sourceCatalog = seedCatalog(source);
    const sourceCharacterId = seedCompleteCharacter(source, sourceCatalog);
    const historical = structuredClone(
      exportCharacterBackup(
        source,
        sourceCharacterId,
        '2026-07-30T12:00:00.000Z',
      ),
    ) as unknown as Record<string, unknown>;
    historical.version = PREVIOUS_CHARACTER_BACKUP_VERSION;
    const root = historical.character as Record<string, unknown>;
    delete root.alignment;
    delete root.appearance;
    delete root.backstory;

    const target = await database();
    seedCatalog(target, true);
    const imported = importCharacterBackup(target, historical);
    expect(
      target.oneRaw(
        `SELECT alignment, appearance, backstory
         FROM characters WHERE id = ?`,
        [imported.characterId],
      ),
    ).toEqual({ alignment: null, appearance: null, backstory: null });
  });

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
      alignment: 'Chaotic Good',
      appearance: 'Silver hair\nGreen eyes',
      backstory: 'Raised near </script><the old tower>.',
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
      target.allRaw(
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
    const importedWeapons = target.allRaw(
      'SELECT * FROM character_weapons WHERE character_id = ? ORDER BY id',
      [characterId],
    );
    expect(importedWeapons).toHaveLength(2);
    expect(importedWeapons[0]).toMatchObject({
      character_id: characterId,
      name: 'Weathered Longsword',
      attack_kind: 'ranged',
      damage_kind: 'dice',
      damage_dice: '1d8',
      damage_flat: null,
      damage_custom: null,
      damage_type: 'Slashing',
      versatile_damage_kind: 'dice',
      versatile_damage_dice: '1d10',
      versatile_damage_flat: null,
      versatile_damage_custom: null,
      finesse: 0,
      light: 0,
      thrown: 1,
      ammunition_kind: 'bolt',
      range_kind: 'ranged',
      range_near_feet: 20,
      range_far_feet: 60,
      mastery_property: 'Sap',
      mastery_selected: 1,
      other_properties: 'Notched near the hilt',
      notes: 'weapon note',
      created_at: timestamp,
    });
    expect(importedWeapons[1]).toMatchObject({
      character_id: characterId,
      name: 'Half-entered club',
      attack_kind: null,
      damage_kind: 'not_recorded',
      damage_dice: null,
      damage_flat: null,
      damage_custom: null,
      damage_type: null,
      versatile_damage_kind: 'not_applicable',
      versatile_damage_dice: null,
      versatile_damage_flat: null,
      versatile_damage_custom: null,
      ammunition_kind: null,
      range_kind: 'none',
      range_near_feet: null,
      range_far_feet: null,
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
    expect(saved.schema_version).not.toBe('a7-v15');
    expect(saved.schema_version).toBe('a7-v16');
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
    // The effect's provenance is REMAPPED, not resolved: it points at the
    // source instance this import just minted, both in the live table and
    // inside the re-emitted save point. Left unrewritten it would name the
    // EXPORTING character's row — which the composite foreign key would then
    // refuse, mid-undo, long after the import looked successful.
    expect(saved.character_effects[0]).toMatchObject({
      character_id: characterId,
      source_instance_id: importedSource.id,
      damage_type: 'Poison',
      label: 'Dwarven Resilience',
    });
    expect(saved.character_effects[1]).toMatchObject({
      character_id: characterId,
      source_instance_id: null,
      effect_kind: 'hp_modifier',
      label: 'Dwarven Toughness',
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
      target.oneRaw(
        `SELECT intelligence FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({ intelligence: 18 });
    expect(
      target.allRaw(
        `SELECT warning_fingerprint, note
         FROM warning_acknowledgements WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([{ warning_fingerprint: 'warning:shield', note: 'ack note' }]);
    expect(
      target.allRaw(
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
      target.allRaw(
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

  it('imports and restores pre-AC-4 adjustment rows as manual bonus effects', async () => {
    const source = await database();
    const sourceCatalog = seedCatalog(source);
    const sourceCharacterId = seedCompleteCharacter(source, sourceCatalog);
    const document = structuredClone(
      exportCharacterBackup(
        source,
        sourceCharacterId,
        '2026-07-30T12:00:00.000Z',
      ),
    );
    const tables = document.tables as unknown as Record<string, unknown>;
    tables.character_sheet_adjustments = [{
      id: 700,
      character_id: sourceCharacterId,
      armor_class_adjustment: 4,
      armor_class_adjustment_note: 'Imported manual bonus',
      created_at: timestamp,
      updated_at: timestamp,
    }];

    const savePoint =
      document.tables.character_save_points[0] as Record<string, unknown>;
    const snapshot = JSON.parse(String(savePoint.snapshot)) as Record<
      string,
      unknown
    >;
    snapshot.character_sheet_adjustments = [{
      id: 701,
      character_id: sourceCharacterId,
      armor_class_adjustment: -2,
      armor_class_adjustment_note: null,
      created_at: timestamp,
      updated_at: timestamp,
    }];
    savePoint.snapshot = JSON.stringify(snapshot);

    const target = await database();
    seedCatalog(target);
    const { characterId } = importCharacterBackup(target, document);

    expect(
      target.oneRaw(
        `SELECT amount, label, source_instance_id, character_item_id,
                character_weapon_id, template_ref
         FROM character_effects
         WHERE character_id = ? AND label = 'Imported manual bonus'`,
        [characterId],
      ),
    ).toEqual({
      amount: 4,
      label: 'Imported manual bonus',
      source_instance_id: null,
      character_item_id: null,
      character_weapon_id: null,
      template_ref: null,
    });

    const stored = target.scalar<string>(
      `SELECT snapshot
       FROM character_save_points
       WHERE character_id = ? AND label = 'Before experiment'`,
      [characterId],
    );
    const importedSnapshot = JSON.parse(String(stored)) as Record<
      string,
      unknown
    >;
    expect(importedSnapshot.character_sheet_adjustments).toEqual([]);
    expect(
      importedSnapshot.character_effects as Array<Record<string, unknown>>,
    ).toContainEqual(
      expect.objectContaining({
        effect_kind: 'armor_class_bonus',
        amount: -2,
        label: 'Manual Armor Class adjustment',
        source_instance_id: null,
        character_item_id: null,
        character_weapon_id: null,
        template_ref: null,
      }),
    );

    new CharacterState(target).restore(characterId, importedSnapshot);
    expect(
      target.oneRaw(
        `SELECT amount, label
         FROM character_effects
         WHERE character_id = ?
           AND label = 'Manual Armor Class adjustment'`,
        [characterId],
      ),
    ).toEqual({
      amount: -2,
      label: 'Manual Armor Class adjustment',
    });
  });

  it('preserves both exceptional legacy ranges through backup and snapshot round trips', async () => {
    const source = await database();
    const sourceCharacterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Legacy range backup')",
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_weapons
         (character_id, name, range_kind, range_near_feet, range_far_feet)
       VALUES
         (?, 'Long only', 'legacy', NULL, 60),
         (?, 'Inverted', 'legacy', 60, 20)`,
      [sourceCharacterId, sourceCharacterId],
    );
    const document = exportCharacterBackup(
      source,
      sourceCharacterId,
      '2026-07-27T12:00:00.000Z',
    );

    const target = await database();
    const { characterId } = importCharacterBackup(target, document);
    const ranges = () =>
      target.allRaw(
        `SELECT name, range_kind, range_near_feet, range_far_feet
         FROM character_weapons WHERE character_id = ? ORDER BY id`,
        [characterId],
      );
    const expected = [
      {
        name: 'Long only',
        range_kind: 'legacy',
        range_near_feet: null,
        range_far_feet: 60,
      },
      {
        name: 'Inverted',
        range_kind: 'legacy',
        range_near_feet: 60,
        range_far_feet: 20,
      },
    ];
    expect(ranges()).toEqual(expected);

    const state = new CharacterState(target);
    const snapshot = state.capture(characterId);
    target.exec('DELETE FROM character_weapons WHERE character_id = ?', [
      characterId,
    ]);
    state.restore(characterId, snapshot);
    expect(ranges()).toEqual(expected);
  });

  it('migrates a pre-discriminator weapon row without losing damage or range values', async () => {
    const source = await database();
    const sourceCatalog = seedCatalog(source);
    const sourceCharacterId = seedCompleteCharacter(source, sourceCatalog);
    const document = structuredClone(
      exportCharacterBackup(
        source,
        sourceCharacterId,
        '2026-07-23T12:00:00.000Z',
      ),
    );
    const weapon = document.tables.character_weapons[0] as Record<
      string,
      unknown
    >;
    for (const column of [
      'damage_kind',
      'damage_flat',
      'damage_custom',
      'versatile_damage_kind',
      'versatile_damage_flat',
      'versatile_damage_custom',
    ]) {
      delete weapon[column];
    }
    const custom = '  damage from a saved campaign table  ';
    weapon.damage_dice = custom;
    weapon.versatile_damage_dice = null;
    delete weapon.range_kind;
    delete weapon.range_near_feet;
    delete weapon.range_far_feet;
    delete weapon.attack_kind;
    weapon.range_normal_feet = 60;
    weapon.range_long_feet = 20;

    const target = await database();
    seedCatalog(target, true);
    const imported = importCharacterBackup(target, document);

    expect(
      target.oneRaw(
        `SELECT damage_kind, damage_dice, damage_flat, damage_custom,
                versatile_damage_kind, versatile_damage_dice,
                versatile_damage_flat, versatile_damage_custom,
                range_kind, range_near_feet, range_far_feet, attack_kind
         FROM character_weapons
         WHERE character_id = ?
         ORDER BY id
         LIMIT 1`,
        [imported.characterId],
      ),
    ).toEqual({
      damage_kind: 'custom',
      damage_dice: null,
      damage_flat: null,
      damage_custom: custom,
      versatile_damage_kind: 'not_applicable',
      versatile_damage_dice: null,
      versatile_damage_flat: null,
      versatile_damage_custom: null,
      range_kind: 'legacy',
      range_near_feet: 60,
      range_far_feet: 20,
      attack_kind: null,
    });
  });

  it('rejects cross-character, unavailable-catalog, and constraint-corrupt documents without persisted writes', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const sourceCharacterId = seedCompleteCharacter(source, catalog);
    const document = exportCharacterBackup(source, sourceCharacterId);

    const target = await database();
    seedCatalog(target, true);
    target.exec("INSERT INTO characters (name) VALUES ('Protected target')");
    const before = target.allRaw('SELECT * FROM characters ORDER BY id');

    const crossed = structuredClone(document);
    (
      crossed.tables.character_spell_preferences[0] as Record<string, unknown>
    ).character_id = sourceCharacterId + 1;
    expect(() => importCharacterBackup(target, crossed)).toThrow(
      'belongs to another character.',
    );
    expect(target.allRaw('SELECT * FROM characters ORDER BY id')).toEqual(before);

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
    expect(target.allRaw('SELECT * FROM characters ORDER BY id')).toEqual(before);

    const constraintCorrupt = structuredClone(document);
    const originalOverride =
      constraintCorrupt.tables.character_rule_overrides[0]!;
    (
      constraintCorrupt.tables.character_rule_overrides as unknown as Array<
        Record<string, unknown>
      >
    ).push({ ...originalOverride, id: 999 });
    expect(() => importCharacterBackup(target, constraintCorrupt)).toThrow();
    expect(target.allRaw('SELECT * FROM characters ORDER BY id')).toEqual(before);
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
    "ability_allocation_method": null,
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
      target.oneRaw(
        `SELECT name, alignment, appearance, backstory, notes, revision
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      name: 'Archived Hero',
      alignment: null,
      appearance: null,
      backstory: null,
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
      'character_effects',
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
    const savePoint = target.oneRaw(
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
      `INSERT INTO character_weapons (
         character_id, name, damage_kind, damage_dice
       ) VALUES (?, 'Bought afterwards', 'dice', '1d6')`,
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
      target.allRaw(
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
      target.allRaw(
        'SELECT name FROM character_armor WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual([{ name: 'Bought afterwards' }]);
    expect(
      target.allRaw(
        'SELECT skill FROM character_skill_proficiencies WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual([{ skill: 'stealth' }]);
  });
});

/**
 * THE COLUMN THAT WAS DROPPED, AND EVERY FILE THAT STILL NAMES IT.
 *
 * `spell_selection_slots.orphaned_by_change_group_id` was dormant — zero
 * readers, zero writers, an INTEGER naming a VARCHAR uuid — and F10 removed it.
 * But backup export is `SELECT *`, so EVERY document this project has ever
 * written carries the key with a `null` value, and the row contracts are
 * `z.strictObject`. Without `RETIRED_ROW_COLUMNS` in `character-backup.ts` the
 * import of a user's own file fails outright with
 * `Unrecognized key: "orphaned_by_change_group_id"`.
 *
 * The fixture is built by RE-ADDING the key to a document this build exported,
 * which is exactly what the previous build's export produced. Both places it
 * appeared are covered — the document's own `spell_selection_slots` rows and
 * the `spell_selection_slots` rows inside a save-point snapshot — because they
 * take different code paths (`validateDocument` and `parseSnapshot`) and
 * fixing one and not the other is the mistake this guards.
 */
describe('a backup file written while the dormant orphan column existed', () => {
  function documentNamingTheRetiredColumn(): CharacterBackupDocument {
    return {
      format: CHARACTER_BACKUP_FORMAT,
      version: CHARACTER_BACKUP_VERSION,
      exported_at: '2026-07-23T12:00:00.000Z',
      source_character_id: 7,
      character: {
        id: 7,
        name: 'Orphan Column Hero',
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        ability_allocation_method: null,
        proficiency_bonus_override: null,
        rules_edition_preference: '2024',
        allow_legacy: 0,
        revision: 0,
        alignment: null,
        appearance: null,
        backstory: null,
        notes: null,
        created_at: null,
        updated_at: null,
      },
      tables: {
        character_class_levels: [],
        character_source_instances: [legacySourceRow()],
        spell_selection_slots: [legacySlotRow()],
        wizard_spellbook_entries: [],
        character_spell_preferences: [],
        character_rule_overrides: [],
        warning_acknowledgements: [],
        character_save_points: [
          {
            id: 14,
            character_id: 7,
            label: 'Before the column went',
            schema_version: 'a7-v1',
            snapshot: JSON.stringify({
              schema_version: 'a7-v1',
              character: {
                name: 'Orphan Column Hero',
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10,
                proficiency_bonus_override: null,
                rules_edition_preference: '2024',
                allow_legacy: 0,
                notes: null,
              },
              character_class_levels: [],
              character_source_instances: [legacySourceRow()],
              spell_selection_slots: [legacySlotRow()],
              wizard_spellbook_entries: [],
              warning_acknowledgements: [],
            }),
            created_at: null,
            updated_at: null,
          },
        ],
        spell_loadouts: [],
        spell_loadout_entries: [],
        character_weapons: [],
        character_species: [],
        character_species_traits: [],
        character_background: [],
        character_armor: [],
        character_hit_point_rolls: [],
        character_skill_proficiencies: [],
        character_sheet_adjustments: [],
        character_effects: [],
        character_skill_grants: [],
        character_skill_expertise_grants: [],
        character_items: [],
        character_attunement_slots: [],
        character_level_feat_choices: [],
      },
      references: {
        class_definitions: [{ id: 31, content_key: 'class:wizard' }],
        subclass_definitions: [],
        feat_definitions: [],
        species_definitions: [],
        background_definitions: [],
        spell_versions: [],
      },
      spell_definitions: {
        spell_identities: [],
        spell_identity_aliases: [],
        spell_versions: [],
        spell_version_publications: [],
        spell_list_memberships: [],
        spell_version_tags: [],
        spell_version_damage_types: [],
        spell_version_conditions: [],
        spell_version_attack_modes: [],
        spell_version_save_abilities: [],
        spell_version_upcast_levels: [],
        spell_version_cantrip_upgrade_levels: [],
      },
    };
  }

  function legacySourceRow(): Record<string, unknown> {
    return {
      id: 11,
      character_id: 7,
      instance_uuid: 'legacy-source',
      parent_source_instance_id: null,
      source_type: 'class',
      source_definition_id: 31,
      display_name: 'Wizard 1',
      config: '{}',
      acquired_at_character_level: 1,
      state: 'active',
      notes: null,
      created_at: null,
      updated_at: null,
    };
  }

  function legacySlotRow(): Record<string, unknown> {
    return {
      id: 12,
      character_id: 7,
      source_instance_id: 11,
      slot_key: 'legacy-source:prepared:1',
      rule_key: 'prepared',
      ordinal: 1,
      bucket: 'prepared',
      eligibility_kind: 'choice_from_query',
      fixed_spell_version_id: null,
      current_spell_version_id: null,
      label: null,
      spell_level_min: 0,
      spell_level_max: 9,
      allowed_spell_lists: null,
      allowed_schools: null,
      allowed_tags: null,
      always_prepared: 0,
      with_slots: 1,
      free_cast: null,
      counts_against_limit: 1,
      required: 0,
      is_locked: 0,
      state: 'active',
      orphan_reason_code: null,
      // THE RETIRED KEY. Every document written before F10 has it, and it is
      // always null: nothing ever wrote it.
      orphaned_by_change_group_id: null,
      orphaned_at: null,
      prior_config: null,
      override_note: null,
      sort_order: 1,
      notes: 'slot from the old build',
      created_at: null,
      updated_at: null,
      selection_collection: null,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
    };
  }

  it('still imports, and the slot lands with the key simply gone', async () => {
    const archived = documentNamingTheRetiredColumn();
    // The fixture really does carry the key — asserted rather than assumed, so
    // an edit that removes it cannot make the rest of this pass vacuously.
    const archivedSlot = archived.tables
      .spell_selection_slots[0] as Record<string, unknown>;
    expect(Object.hasOwn(archivedSlot, 'orphaned_by_change_group_id')).toBe(
      true,
    );
    // ...and the table it is about to be written to really does NOT have it.
    const target = await database();
    seedCatalog(target);
    expect(
      target
        .allRaw('SELECT name FROM pragma_table_info(?)', [
          'spell_selection_slots',
        ])
        .map((row) => row.name),
    ).not.toContain('orphaned_by_change_group_id');

    const { characterId } = importCharacterBackup(target, archived);
    const persisted = persistedCharacter(target, characterId);

    expect(persisted.character).toMatchObject({ name: 'Orphan Column Hero' });
    expect(persisted.slots).toHaveLength(1);
    expect(persisted.slots[0]).toMatchObject({
      character_id: characterId,
      rule_key: 'prepared',
      notes: 'slot from the old build',
    });
    expect(
      Object.hasOwn(persisted.slots[0]!, 'orphaned_by_change_group_id'),
    ).toBe(false);
  });

  it('restores its save point, whose snapshot names the column too', async () => {
    const target = await database();
    seedCatalog(target);
    const { characterId } = importCharacterBackup(
      target,
      documentNamingTheRetiredColumn(),
    );

    const stored = target.scalar(
      'SELECT snapshot FROM character_save_points WHERE character_id = ?',
      [characterId],
    );
    // The re-emitted snapshot must not carry it either, or the restore below
    // would build an INSERT naming a column the table no longer has.
    const snapshot = JSON.parse(String(stored)) as {
      spell_selection_slots: Array<Record<string, unknown>>;
    };
    expect(
      Object.hasOwn(
        snapshot.spell_selection_slots[0]!,
        'orphaned_by_change_group_id',
      ),
    ).toBe(false);

    new CharacterState(target).restore(characterId, JSON.parse(String(stored)));
    expect(
      target.allRaw(
        'SELECT rule_key FROM spell_selection_slots WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual([{ rule_key: 'prepared' }]);
  });

  it('still refuses a key that was never a column, so the strip is narrow', () => {
    const invented = documentNamingTheRetiredColumn();
    const slot = invented.tables.spell_selection_slots[0] as Record<
      string,
      unknown
    >;
    slot.orphaned_by_something_else = null;

    expect(() => {
      validateCharacterBackup(invented);
    }).toThrow(/Unrecognized key: "orphaned_by_something_else"/);
  });
});

describe('complete database backup', () => {
  it('restores the complete image including subclass reference text and rejects corrupt bytes without changing the live connection', async () => {
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
    lifecycle.database.exec(`
      INSERT INTO class_definitions (
        content_key, name, rules_edition, progression_type
      ) VALUES ('expanded:class:image', 'Image Class', 'expanded', 'none');
      INSERT INTO subclass_definitions (
        content_key, class_definition_id, name, rules_edition, notes
      ) VALUES (
        'expanded:subclass:image',
        (SELECT id FROM class_definitions WHERE content_key = 'expanded:class:image'),
        'Image Subclass', 'expanded', 'Non-empty subclass reference.'
      );
    `);
    const backup = await exportDatabaseBackup(
      lifecycle,
      '2026-07-23T12:00:00.000Z',
    );
    lifecycle.database.exec('DELETE FROM characters');
    lifecycle.database.exec('DELETE FROM spell_identities');
    lifecycle.database.exec(
      "DELETE FROM class_definitions WHERE content_key = 'expanded:class:image'",
    );

    await importDatabaseBackup(lifecycle, backup);
    expect(lifecycle.database.allRaw('SELECT name, notes FROM characters')).toEqual(
      [{ name: 'Image Hero', notes: 'kept' }],
    );
    expect(
      lifecycle.database.allRaw(
        'SELECT content_key, canonical_name, normalized_name FROM spell_identities',
      ),
    ).toEqual([
      {
        content_key: 'spell:fireball',
        canonical_name: 'Fireball',
        normalized_name: 'fireball',
      },
    ]);
    expect(lifecycle.database.allRaw(`
      SELECT name, notes FROM subclass_definitions
      WHERE content_key = 'expanded:subclass:image'
    `)).toEqual([{
      name: 'Image Subclass',
      notes: 'Non-empty subclass reference.',
    }]);

    const connection = lifecycle.database.connection;
    await expect(
      importDatabaseBackup(lifecycle, {
        ...backup,
        sqlite: new TextEncoder().encode('corrupt'),
      }),
    ).rejects.toThrow();
    expect(lifecycle.database.connection).toBe(connection);
    expect(lifecycle.database.allRaw('SELECT name, notes FROM characters')).toEqual(
      [{ name: 'Image Hero', notes: 'kept' }],
    );
  });
});
