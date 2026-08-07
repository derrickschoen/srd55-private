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
    ]);
  });
});
