import { GUIDED_BACKGROUND_SOURCE_MARKER } from '../builder/guided-creation';
import {
  catalogLayerDisclosure,
  type CharacterCatalogDisclosure,
} from '../catalog/catalog-disclosure';
import { sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../domain/source-markers';

/**
 * Catalog provenance for content actually applied to one character.
 *
 * The identity registry is the only layer authority. LEFT JOINs are
 * intentional: an imported or damaged image can retain applied character data
 * after its registry fact becomes unreadable, and that must render `unknown`
 * rather than being silently omitted or guessed from a key/name.
 */
export function characterCatalogDisclosures(
  db: DatabaseContext,
  characterId: number,
): readonly CharacterCatalogDisclosure[] {
  const classes = db.all(
    `SELECT level.id AS level_id,
            class.name AS class_name,
            class.content_key AS class_content_key,
            class_identity.catalog_layer AS class_catalog_layer,
            subclass.name AS subclass_name,
            subclass.content_key AS subclass_content_key,
            subclass_identity.catalog_layer AS subclass_catalog_layer
     FROM character_class_levels AS level
     JOIN class_definitions AS class
       ON class.id = level.class_definition_id
     LEFT JOIN catalog_content_identities AS class_identity
       ON class_identity.content_kind = 'class'
      AND class_identity.content_key = class.content_key
     LEFT JOIN subclass_definitions AS subclass
       ON subclass.id = level.subclass_definition_id
     LEFT JOIN catalog_content_identities AS subclass_identity
       ON subclass_identity.content_kind = 'subclass'
      AND subclass_identity.content_key = subclass.content_key
     WHERE level.character_id = ?
     ORDER BY class.name, level.id`,
    [characterId],
    (row) => ({
      level_id: sqlInteger(row, 'level_id'),
      class_name: sqlString(row, 'class_name'),
      class_content_key: sqlString(row, 'class_content_key'),
      class_catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'class_catalog_layer'),
      ),
      subclass_name: sqlNullableString(row, 'subclass_name'),
      subclass_content_key: sqlNullableString(row, 'subclass_content_key'),
      subclass_catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'subclass_catalog_layer'),
      ),
    }),
  );

  const disclosures: CharacterCatalogDisclosure[] = [];
  for (const row of classes) {
    disclosures.push({
      kind: 'class',
      name: row.class_name,
      content_key: row.class_content_key,
      catalog_layer: row.class_catalog_layer,
    });
    if (row.subclass_name !== null) {
      disclosures.push({
        kind: 'subclass',
        name: row.subclass_name,
        content_key: row.subclass_content_key,
        catalog_layer: row.subclass_catalog_layer,
      });
    }
  }

  const species = db.one(
    `SELECT copied.name,
            definition.content_key,
            identity.catalog_layer
     FROM character_species AS copied
     LEFT JOIN character_source_instances AS source
       ON source.character_id = copied.character_id
      AND source.source_type = 'species'
      AND source.state = 'active'
      AND source.notes = ?
     LEFT JOIN species_definitions AS definition
       ON definition.id = source.source_definition_id
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'species'
      AND identity.content_key = definition.content_key
     WHERE copied.character_id = ?`,
    [GUIDED_SPECIES_SOURCE_MARKER, characterId],
    (row): CharacterCatalogDisclosure => ({
      kind: 'species',
      name: sqlString(row, 'name'),
      content_key: sqlNullableString(row, 'content_key'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
  if (species !== null) disclosures.push(species);

  const background = db.one(
    `SELECT copied.name,
            definition.content_key,
            identity.catalog_layer
     FROM character_background AS copied
     LEFT JOIN character_source_instances AS source
       ON source.character_id = copied.character_id
      AND source.source_type = 'background'
      AND source.state = 'active'
      AND source.notes = ?
     LEFT JOIN background_definitions AS definition
       ON definition.id = source.source_definition_id
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'background'
      AND identity.content_key = definition.content_key
     WHERE copied.character_id = ?`,
    [GUIDED_BACKGROUND_SOURCE_MARKER, characterId],
    (row): CharacterCatalogDisclosure => ({
      kind: 'background',
      name: sqlString(row, 'name'),
      content_key: sqlNullableString(row, 'content_key'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
  if (background !== null) disclosures.push(background);

  const otherActiveSources = db.all(
    `SELECT source.id, source.source_type, source.display_name,
            COALESCE(feat.content_key, species.content_key,
                     background.content_key) AS content_key,
            identity.catalog_layer
     FROM character_source_instances AS source
     LEFT JOIN feat_definitions AS feat
       ON source.source_type = 'feat'
      AND feat.id = source.source_definition_id
     LEFT JOIN species_definitions AS species
       ON source.source_type = 'species'
      AND species.id = source.source_definition_id
     LEFT JOIN background_definitions AS background
       ON source.source_type = 'background'
      AND background.id = source.source_definition_id
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = source.source_type
      AND identity.content_key = COALESCE(
            feat.content_key, species.content_key, background.content_key
          )
     WHERE source.character_id = ?
       AND source.state = 'active'
       AND source.source_type IN ('feat', 'species', 'background')
       AND NOT (
         (source.source_type = 'species' AND source.notes = ?)
         OR (source.source_type = 'background' AND source.notes = ?)
       )
     ORDER BY source.source_type, source.display_name, source.id`,
    [
      characterId,
      GUIDED_SPECIES_SOURCE_MARKER,
      GUIDED_BACKGROUND_SOURCE_MARKER,
    ],
    (row): CharacterCatalogDisclosure => {
      const kind = sqlString(row, 'source_type');
      if (kind !== 'feat' && kind !== 'species' && kind !== 'background') {
        throw new Error(`Unsupported catalog source kind "${kind}".`);
      }
      return {
        kind,
        name: sqlString(row, 'display_name'),
        content_key: sqlNullableString(row, 'content_key'),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      };
    },
  );
  disclosures.push(...otherActiveSources);

  return disclosures;
}
