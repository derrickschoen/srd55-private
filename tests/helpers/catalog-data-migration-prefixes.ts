import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import migrationProbeSource from '../fixtures/catalog-data-migration-probe.ts?raw';
import {
  runCatalogDataMigrationProbe,
} from '../fixtures/catalog-data-migration-probe';
import type { CatalogDataMigration } from '../../src/catalog/catalog-data-migrations';
import { CONTENT_FINGERPRINT_SCHEME_V1 } from '../../src/catalog/content-identity';
import { DATABASE_MIGRATIONS } from '../../src/db/migrations';
import type { DatabaseContext } from '../../src/db/database';

export const RECORDED_SCHEMA_PREFIX_IDS = [
  '0000_skinny_lionheart',
  '0001_weapon_range_add',
  '0002_weapon_range_drop',
  '0003_spell_fork',
  '0004_retire_coin',
  '0005_class_equipment',
  '0006_weapon_attack_kind',
  '0007_feat_model',
  '0008_ability_allocation_method',
  '0009_ability_increase',
  '0010_character_skill_grants',
  '0011_equipment_provenance',
  '0012_remove_equipment_provenance',
  '0013_armor_class_items_and_effects',
  '0014_feature_effect_production',
  '0015_effect_equipment_ownership',
  '0016_retire_armor_class_adjustment',
  '0017_attunement_slots',
  '0018_character_items_quantity',
  '0019_ability_override',
  '0020_content_identity_registry',
  '0021_catalog_data_migrations',
  '0022_planned_spell_grants',
  '0023_skill_expertise_grants',
  '0024_feat_application_model',
  '0025_character_level_feat_choices',
  '0026_class_resources',
  '0027_character_flavor',
  '0028_authorable_effect_storage',
  '0029_party_document_states',
  '0030_subclass_reference_text',
  '0031_item_definitions',
  '0032_character_archive',
  '0033_asserted_content_keys',
  '0034_remove_legacy_opaque',
  '0035_catalog_content_drafts',
  '0036_catalog_content_archive',
] as const;

export const PREFIX_MIGRATION_ID = 'test_catalog_prefix_probe';
export const PREFIX_MIGRATION_CHECKSUM =
  '604ff0d0a8bd0e5e1edb779e43165206295ad3bbcf0f78e5ab315b091cdf449d';
export const PREFIX_DATA_MIGRATIONS: readonly CatalogDataMigration[] =
  Object.freeze([
    Object.freeze({
      id: PREFIX_MIGRATION_ID,
      projectorScheme: CONTENT_FINGERPRINT_SCHEME_V1,
      source: migrationProbeSource,
      checksum: PREFIX_MIGRATION_CHECKSUM,
      run: runCatalogDataMigrationProbe,
    }),
  ]);

let prefixImages: readonly Uint8Array[] | undefined;

/**
 * Hand-built historical images. The character row is inserted at prefix 0000
 * and carried through each subsequently shipped SQL migration; expectations
 * never come from application output.
 */
export function recordedSchemaPrefixImages(
  sqlite3: Sqlite3Static,
): readonly Uint8Array[] {
  if (prefixImages !== undefined) {
    return prefixImages;
  }

  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  const images: Uint8Array[] = [];
  try {
    for (const [index, migration] of DATABASE_MIGRATIONS.entries()) {
      connection.exec(migration.sql);
      if (index === 0) {
        connection.exec(
          `INSERT INTO characters (name)
           VALUES ('CI-2b prefix fixture')`,
        );
      }
      images.push(
        sqlite3.capi.sqlite3_js_db_export(connection).slice(),
      );
    }
    prefixImages = images;
    return prefixImages;
  } finally {
    connection.close();
  }
}

export function appliedPrefixMarkerRows(
  db: DatabaseContext,
): readonly Record<string, unknown>[] {
  return db.allRaw(
    `SELECT id, scheme, checksum
     FROM catalog_data_migrations`,
  );
}

export function migratedPrefixCharacterRows(
  db: DatabaseContext,
): readonly Record<string, unknown>[] {
  return db.allRaw(
    `SELECT name, notes
     FROM characters
     WHERE name = 'CI-2b prefix fixture'`,
  );
}
