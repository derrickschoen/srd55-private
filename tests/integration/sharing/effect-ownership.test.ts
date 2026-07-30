import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../../../src/builder/guided-creation';
import { DatabaseContext } from '../../../src/db/database';
import {
  exportCharacterShare,
  importCharacterShare,
} from '../../../src/sharing/character-share';
import { openTestDatabase } from '../../helpers/open-db';

describe('wire-v9 effect ownership', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => connection.close());

  it('round-trips generated-only species and equipment references by array index', () => {
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Armadillo')",
    ).lastInsertId;
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state, notes
       ) VALUES (
         ?, 'generated-species-source', 'species', NULL, 'Armadillo',
         '{"class_level":1}', 1, 'active', ?
       )`,
      [characterId, GUIDED_SPECIES_SOURCE_MARKER],
    ).lastInsertId;
    const weaponId = db.exec(
      `INSERT INTO character_weapons (
         character_id, name, damage_kind, versatile_damage_kind, range_kind
       ) VALUES (
         ?, 'Staff of the Armadillo', 'not_recorded', 'not_applicable', 'none'
       )`,
      [characterId],
    ).lastInsertId;
    const itemId = db.exec(
      `INSERT INTO character_items (
         character_id, name, requires_attunement, source_instance_id
       ) VALUES (?, 'Cloak of the Armadillo', 1, ?)`,
      [characterId, sourceId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, amount, source_instance_id,
         character_item_id, template_ref, label
       ) VALUES (
         ?, 1, 'armor_class_bonus', 1, ?, ?,
         'species_template_trait_effects:7', 'Cloak shell'
       )`,
      [characterId, sourceId, itemId],
    );
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, amount, weapon_scope,
         character_weapon_id, label
       ) VALUES (
         ?, 2, 'weapon_damage_bonus', 2, 'one_bonded_weapon', ?,
         'Staff edge'
       )`,
      [characterId, weaponId],
    );

    const document = exportCharacterShare(db, characterId);
    expect(document.sources).toEqual([{
      id: 0,
      type: 'species',
      name: 'Armadillo',
      config: { class_level: 1 },
      acquired: 1,
      generated: true,
    }]);
    expect(document.effects).toMatchObject([
      {
        label: 'Cloak shell',
        sourceRef: 0,
        itemRef: 0,
        template_ref: 'species_template_trait_effects:7',
      },
      {
        label: 'Staff edge',
        weaponRef: 0,
      },
    ]);

    const imported = importCharacterShare(db, document);
    const importedSource = db.oneRaw(
      `SELECT id, source_type, source_definition_id, notes
       FROM character_source_instances WHERE character_id = ?`,
      [imported.characterId],
    );
    expect(importedSource).toMatchObject({
      source_type: 'species',
      source_definition_id: null,
      notes: GUIDED_SPECIES_SOURCE_MARKER,
    });
    const importedItem = db.oneRaw(
      'SELECT id, source_instance_id FROM character_items WHERE character_id = ?',
      [imported.characterId],
    );
    const importedWeapon = db.oneRaw(
      'SELECT id FROM character_weapons WHERE character_id = ?',
      [imported.characterId],
    );
    expect(
      db.allRaw(
        `SELECT label, source_instance_id, character_item_id,
                character_weapon_id, template_ref
         FROM character_effects WHERE character_id = ? ORDER BY sort_order`,
        [imported.characterId],
      ),
    ).toEqual([
      {
        label: 'Cloak shell',
        source_instance_id: Number(importedSource?.id),
        character_item_id: Number(importedItem?.id),
        character_weapon_id: null,
        template_ref: 'species_template_trait_effects:7',
      },
      {
        label: 'Staff edge',
        source_instance_id: null,
        character_item_id: null,
        character_weapon_id: Number(importedWeapon?.id),
        template_ref: null,
      },
    ]);
  });
});
