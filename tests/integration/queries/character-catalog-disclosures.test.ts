import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GUIDED_BACKGROUND_SOURCE_MARKER } from '../../../src/builder/guided-creation';
import { DatabaseContext } from '../../../src/db/database';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../../../src/domain/source-markers';
import { characterCatalogDisclosures } from '../../../src/queries/character-catalog-disclosures';
import { openTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

describe('character catalog provenance', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => connection.close());

  it('reads every applied layer from the registry and says unknown when no identity is available', () => {
    const identities = [
      { kind: 'class' as const, contentKey: '2024:class:fighter', name: 'Fighter', keyKind: 'bundled-stable' as const },
      { kind: 'subclass' as const, contentKey: 'expanded:content.subclass:hostile', name: 'External Subclass', keyKind: 'asserted' as const },
      { kind: 'feat' as const, contentKey: 'expanded:content.feat:hostile', name: 'External Feat', keyKind: 'asserted' as const },
      { kind: 'background' as const, contentKey: 'expanded:content.background:hostile', name: 'External Background', keyKind: 'asserted' as const },
      { kind: 'spell' as const, contentKey: 'expanded:content.spell:hostile', name: 'External Spell', keyKind: 'asserted' as const },
      { kind: 'weapon' as const, contentKey: 'expanded:content.weapon:hostile', name: 'External Weapon', keyKind: 'asserted' as const },
      { kind: 'armor' as const, contentKey: 'expanded:content.armor:hostile', name: 'External Armor', keyKind: 'asserted' as const },
    ];
    for (const identity of identities) registerFixtureContentIdentity(db, identity);

    const classId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type,
         supports_ritual_casting
       ) VALUES ('2024:class:fighter', 'Fighter', '2024', 'none', 0)`,
    ).lastInsertId;
    const subclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition
       ) VALUES ('expanded:content.subclass:hostile', ?, 'External Subclass', 'expanded')`,
      [classId],
    ).lastInsertId;
    const backgroundId = db.exec(
      `INSERT INTO background_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES ('expanded:content.background:hostile', 'External Background', 'expanded', 0, '[]')`,
    ).lastInsertId;
    const featId = db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES ('expanded:content.feat:hostile', 'External Feat', 'expanded', 0, '[]')`,
    ).lastInsertId;
    const characterId = db.exec(
      `INSERT INTO characters (name) VALUES ('Layer Reader')`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, subclass_definition_id,
         level, is_starting_class
       ) VALUES (?, ?, ?, 3, 1)`,
      [characterId, classId, subclassId],
    );
    db.exec(
      `INSERT INTO character_species (character_id, name)
       VALUES (?, 'Unregistered Species')`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state, notes
       ) VALUES (?, 'species-layer-reader', 'species', NULL,
                 'Unregistered Species', '{}', 1, 'active', ?)`,
      [characterId, GUIDED_SPECIES_SOURCE_MARKER],
    );
    db.exec(
      `INSERT INTO character_background (character_id, name)
       VALUES (?, 'External Background')`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state, notes
       ) VALUES (?, 'background-layer-reader', 'background', ?,
                 'External Background', '{}', 1, 'active', ?)`,
      [characterId, backgroundId, GUIDED_BACKGROUND_SOURCE_MARKER],
    );
    db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (?, 'feat-layer-reader', 'feat', ?,
                 'External Feat', '{}', 1, 'active')`,
      [characterId, featId],
    );
    db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (?, 'class-equipment-layer-reader', 'class', ?, 'Fighter',
                 '{"equipment_choice":{"kind":"class","option":"a"}}',
                 1, 'active')`,
      [characterId, classId],
    );
    const spellIdentityId = db.exec(
      `INSERT INTO spell_identities (content_key, canonical_name, normalized_name)
       VALUES ('expanded:spell-identity:hostile', 'External Spell', 'externalspell')`,
    ).lastInsertId;
    const spellVersionId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, is_active
       ) VALUES (
         'expanded:content.spell:hostile', ?,
         '</strong><img data-ha10-spell-disclosure src=x>',
         'expanded', 1, 'Evocation', 1
       )`,
      [spellIdentityId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO wizard_spellbook_entries (
         character_id, spell_version_id, selection_eligibility
       ) VALUES (?, ?, 'valid')`,
      [characterId, spellVersionId],
    );
    const weaponId = db.exec(
      `INSERT INTO weapon_templates (
         content_key, rules_edition, name, srd_group, damage_kind, damage_dice,
         damage_type, versatile_damage_kind, mastery_property
       ) VALUES (
         'expanded:content.weapon:hostile', 'expanded',
         '</option><img data-ha10-weapon-disclosure src=x>',
         'simple_melee', 'dice', '1d6', 'Bludgeoning', 'not_applicable', 'Sap'
       )`,
    ).lastInsertId;
    const armorId = db.exec(
      `INSERT INTO armor_templates (
         content_key, rules_edition, name, category, armor_class, dex_bonus,
         stealth_disadvantage
       ) VALUES (
         'expanded:content.armor:hostile', 'expanded',
         '</li><img data-ha10-armor-disclosure src=x>',
         'light', 12, 'full', 0
       )`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO class_equipment_items (
         class_definition_id, option, sort_order, quantity, item_name,
         item_kind, weapon_template_id
       ) VALUES (?, 'a', 1, 1, 'External Weapon', 'weapon', ?)`,
      [classId, weaponId],
    );
    db.exec(
      `INSERT INTO class_equipment_items (
         class_definition_id, option, sort_order, quantity, item_name,
         item_kind, armor_template_id
       ) VALUES (?, 'a', 2, 1, 'External Armor', 'armor', ?)`,
      [classId, armorId],
    );

    expect(characterCatalogDisclosures(db, characterId)).toEqual([
      {
        kind: 'class', name: 'Fighter', content_key: '2024:class:fighter',
        catalog_layer: 'bundled',
      },
      {
        kind: 'subclass', name: 'External Subclass',
        content_key: 'expanded:content.subclass:hostile', catalog_layer: 'external',
      },
      {
        kind: 'species', name: 'Unregistered Species', content_key: null,
        catalog_layer: 'unknown',
      },
      {
        kind: 'background', name: 'External Background',
        content_key: 'expanded:content.background:hostile', catalog_layer: 'external',
      },
      {
        kind: 'feat', name: 'External Feat',
        content_key: 'expanded:content.feat:hostile', catalog_layer: 'external',
      },
      {
        kind: 'spell',
        name: '</strong><img data-ha10-spell-disclosure src=x>',
        content_key: 'expanded:content.spell:hostile', catalog_layer: 'external',
      },
      {
        kind: 'armor', name: '</li><img data-ha10-armor-disclosure src=x>',
        content_key: 'expanded:content.armor:hostile', catalog_layer: 'external',
      },
      {
        kind: 'weapon', name: '</option><img data-ha10-weapon-disclosure src=x>',
        content_key: 'expanded:content.weapon:hostile', catalog_layer: 'external',
      },
    ]);
  });
});
