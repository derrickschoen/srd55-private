import { characterSourceCatalogResolution } from '../catalog/recorded-source-provenance';
import { sqlInteger, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';
import {
  characterSenses,
  type CharacterSenses,
  type SpeciesSenseSource,
} from '../rules/character-senses';
import { SRD_SPECIES_SENSES, type SrdSpeciesName } from '../rules/generated/species-srd-tables';
import { BUNDLED_ORIGIN_RULES_EDITION } from '../rules/origin-rules-edition';
import type { CharacterSheet } from './character-sheet-builder';

const SRD_SPECIES_NAMES = Object.keys(SRD_SPECIES_SENSES) as readonly SrdSpeciesName[];

/** The content key the species seeder mints for a bundled SRD species (`origins-srd.ts`). */
export function bundledSrdSpeciesContentKey(name: SrdSpeciesName): string {
  return `${BUNDLED_ORIGIN_RULES_EDITION}:species:${name.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-')}`;
}

/**
 * Which SRD species this character's copied species IS, established rather
 * than guessed: exactly one active species source, which the catalog
 * resolves to a BUNDLED SRD template, and whose copied name is still that
 * species' name. Anything else — no source, an authored or imported species,
 * a renamed copy — is `unsourced`, because nothing structured records its
 * senses.
 */
function speciesSenseSource(
  db: DatabaseContext,
  characterId: number,
  sheet: CharacterSheet,
): SpeciesSenseSource {
  const copiedName = db.scalar<string>(
    'SELECT name FROM character_species WHERE character_id = ?',
    [characterId],
  );
  if (copiedName === null) {
    return { kind: 'unsourced', detail: 'The character has no species, so no senses are sourced.' };
  }
  const sources = db.all(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND source_type = 'species' AND state = ?
     ORDER BY id`,
    [characterId, ACTIVE_SOURCE_INSTANCE_STATE],
    (row) => sqlInteger(row, 'id'),
  );
  const [sourceId] = sources;
  if (sources.length !== 1 || sourceId === undefined) {
    return {
      kind: 'unsourced',
      detail: `${copiedName} is not one catalog species source, so its senses are not recorded.`,
    };
  }
  const resolution = characterSourceCatalogResolution(db, sourceId, copiedName);
  const species = SRD_SPECIES_NAMES.find((name) =>
    name === copiedName && bundledSrdSpeciesContentKey(name) === resolution.content_key);
  if (resolution.catalog_layer !== 'bundled' || species === undefined) {
    return {
      kind: 'unsourced',
      detail: `${copiedName} is not a bundled SRD species, and no structured record states its senses.`,
    };
  }
  return {
    kind: 'srd_species',
    species,
    lineageDarkvision: sheet.lineage_darkvision === null
      ? null
      : sheet.lineage_darkvision.kind === 'known'
        ? { kind: 'known', value: sheet.lineage_darkvision.value }
        : { kind: 'unknown', detail: sheet.lineage_darkvision.detail },
  };
}

function heldFeatContentKeys(db: DatabaseContext, characterId: number): readonly string[] {
  return db.all(
    `SELECT definition.content_key
     FROM character_source_instances AS source
     JOIN feat_definitions AS definition
       ON definition.id = source.source_definition_id
     WHERE source.character_id = ? AND source.source_type = 'feat' AND source.state = ?
     ORDER BY source.id`,
    [characterId, ACTIVE_SOURCE_INSTANCE_STATE],
    (row) => sqlString(row, 'content_key'),
  );
}

/** The character's standing senses, composed from sourced facts only. */
export function readCharacterSenses(
  db: DatabaseContext,
  characterId: number,
  sheet: CharacterSheet,
): CharacterSenses {
  return characterSenses({
    species: speciesSenseSource(db, characterId, sheet),
    classLevels: sheet.classes.map((held) => ({ className: held.class_name, level: held.level })),
    featContentKeys: heldFeatContentKeys(db, characterId),
  });
}
