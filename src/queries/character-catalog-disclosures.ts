import {
  GUIDED_BACKGROUND_SOURCE_MARKER,
  recordedEquipmentChoiceOption,
  resolveEquipmentBackgroundSource,
  resolveEquipmentClassSource,
  type ResolvedEquipmentSource,
} from '../builder/guided-creation';
import {
  catalogLayerDisclosure,
  type CharacterCatalogDisclosure,
} from '../catalog/catalog-disclosure';
import { characterSourceCatalogResolution } from '../catalog/recorded-source-provenance';
import {
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
} from '../db/codecs';
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

  const speciesCopy = db.one(
    `SELECT copied.name,
            source.id AS source_id
     FROM character_species AS copied
     LEFT JOIN character_source_instances AS source
       ON source.character_id = copied.character_id
      AND source.source_type = 'species'
      AND source.state = 'active'
      AND source.notes = ?
     WHERE copied.character_id = ?`,
    [GUIDED_SPECIES_SOURCE_MARKER, characterId],
    (row) => ({
      name: sqlString(row, 'name'),
      source_id: sqlNullableInteger(row, 'source_id'),
    }),
  );
  if (speciesCopy !== null) {
    const resolution = speciesCopy.source_id === null
      ? { content_key: null, catalog_layer: 'unknown' as const }
      : characterSourceCatalogResolution(
          db,
          speciesCopy.source_id,
          speciesCopy.name,
        );
    disclosures.push({
      kind: 'species',
      name: speciesCopy.name,
      ...resolution,
    });
  }

  const background = db.one(
    `SELECT copied.name, source.id AS source_id
     FROM character_background AS copied
     LEFT JOIN character_source_instances AS source
       ON source.character_id = copied.character_id
      AND source.source_type = 'background'
      AND source.state = 'active'
      AND source.notes = ?
     WHERE copied.character_id = ?`,
    [GUIDED_BACKGROUND_SOURCE_MARKER, characterId],
    (row) => ({
      name: sqlString(row, 'name'),
      source_id: sqlNullableInteger(row, 'source_id'),
    }),
  );
  if (background !== null) {
    const resolution = background.source_id === null
      ? { content_key: null, catalog_layer: 'unknown' as const }
      : characterSourceCatalogResolution(
          db,
          background.source_id,
          background.name,
        );
    disclosures.push({ kind: 'background', name: background.name, ...resolution });
  }

  const otherActiveSources = db.all(
    `SELECT source.id, source.source_type, source.display_name
     FROM character_source_instances AS source
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
      const sourceId = sqlInteger(row, 'id');
      return {
        kind,
        name: sqlString(row, 'display_name'),
        ...characterSourceCatalogResolution(db, sourceId),
      };
    },
  );
  disclosures.push(...otherActiveSources);

  const spells = db.all(
    `SELECT DISTINCT version.content_key, version.display_name AS name,
            identity.catalog_layer
     FROM spell_versions AS version
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'spell'
      AND identity.content_key = version.content_key
     WHERE version.id IN (
       SELECT COALESCE(slot.fixed_spell_version_id, slot.current_spell_version_id)
       FROM spell_selection_slots AS slot
       WHERE slot.character_id = ?
         AND COALESCE(slot.fixed_spell_version_id, slot.current_spell_version_id) IS NOT NULL
       UNION
       SELECT book.spell_version_id
       FROM wizard_spellbook_entries AS book
       WHERE book.character_id = ? AND book.spell_version_id IS NOT NULL
       UNION
       SELECT entry.spell_version_id
       FROM spell_loadout_entries AS entry
       JOIN spell_loadouts AS loadout ON loadout.id = entry.spell_loadout_id
       WHERE loadout.character_id = ?
     )
     ORDER BY version.display_name, version.content_key`,
    [characterId, characterId, characterId],
    (row): CharacterCatalogDisclosure => ({
      kind: 'spell',
      name: sqlString(row, 'name'),
      content_key: sqlString(row, 'content_key'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
  disclosures.push(...spells);

  const equipmentSources: readonly {
    readonly kind: 'class' | 'background';
    readonly source: ResolvedEquipmentSource | null;
  }[] = [
    { kind: 'class', source: resolveEquipmentClassSource(db, characterId) },
    {
      kind: 'background',
      source: resolveEquipmentBackgroundSource(db, characterId),
    },
  ];
  for (const { kind, source } of equipmentSources) {
    const option = recordedEquipmentChoiceOption(db, characterId, kind);
    if (source === null || option === null) continue;
    const ownerTable = kind === 'class'
      ? 'class_definitions'
      : 'background_templates';
    const itemTable = kind === 'class'
      ? 'class_equipment_items'
      : 'background_equipment_items';
    const ownerColumn = kind === 'class'
      ? 'class_definition_id'
      : 'background_template_id';
    const equipment = db.all(
      `SELECT item.item_kind,
              COALESCE(weapon.name, armor.name) AS name,
              COALESCE(weapon.content_key, armor.content_key) AS content_key,
              identity.catalog_layer
       FROM ${itemTable} AS item
       JOIN ${ownerTable} AS owner ON owner.id = item.${ownerColumn}
       LEFT JOIN weapon_templates AS weapon
         ON item.item_kind = 'weapon' AND weapon.id = item.weapon_template_id
       LEFT JOIN armor_templates AS armor
         ON item.item_kind = 'armor' AND armor.id = item.armor_template_id
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = item.item_kind
        AND identity.content_key = COALESCE(weapon.content_key, armor.content_key)
       WHERE owner.content_key = ? AND item.option = ?
         AND item.item_kind IN ('weapon', 'armor')
       ORDER BY item.item_kind, name, content_key`,
      [source.content_key, option],
      (row): CharacterCatalogDisclosure => {
        const equipmentKind = sqlString(row, 'item_kind');
        if (equipmentKind !== 'weapon' && equipmentKind !== 'armor') {
          throw new Error(`Unsupported equipment catalog kind "${equipmentKind}".`);
        }
        return {
          kind: equipmentKind,
          name: sqlString(row, 'name'),
          content_key: sqlString(row, 'content_key'),
          catalog_layer: catalogLayerDisclosure(
            sqlNullableString(row, 'catalog_layer'),
          ),
        };
      },
    );
    const seen = new Set(
      disclosures.map((entry) => `${entry.kind}:${entry.content_key ?? ''}`),
    );
    for (const entry of equipment) {
      const key = `${entry.kind}:${entry.content_key ?? ''}`;
      if (!seen.has(key)) {
        disclosures.push(entry);
        seen.add(key);
      }
    }
  }

  return disclosures;
}
