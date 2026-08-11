import {
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { StandaloneSourceType } from '../domain/enums';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from './catalog-disclosure';

/**
 * Reads the immutable template key recorded when guided content was copied to
 * a character. Invalid or legacy config has no asserted provenance.
 */
export function recordedSourceContentKey(config: string | null): string | null {
  if (config === null || config === '') return null;
  try {
    const decoded: unknown = JSON.parse(config);
    if (
      decoded === null ||
      typeof decoded !== 'object' ||
      Array.isArray(decoded) ||
      !Object.hasOwn(decoded, 'source_content_key')
    ) {
      return null;
    }
    const contentKey = Reflect.get(decoded, 'source_content_key');
    return typeof contentKey === 'string' && contentKey !== ''
      ? contentKey
      : null;
  } catch {
    return null;
  }
}

export interface CharacterSourceCatalogResolution {
  readonly content_key: string | null;
  readonly catalog_layer: CatalogLayerDisclosure;
}

interface CharacterSourceProvenanceRow {
  readonly id: number;
  readonly source_type: StandaloneSourceType;
  readonly source_definition_id: number | null;
  readonly display_name: string;
  readonly config: string | null;
}

function definitionTable(sourceType: StandaloneSourceType): string {
  switch (sourceType) {
    case 'feat': return 'feat_definitions';
    case 'species': return 'species_definitions';
    case 'background': return 'background_definitions';
  }
}

/**
 * One catalog-resolution seam for an applied standalone source.
 *
 * A guided species may intentionally have no definition row. In that case its
 * immutable recorded template key is accepted only when the installed template
 * still has the copied display name; the identity registry remains the sole
 * authority for the layer. Every other missing link is honest `unknown`.
 */
export function characterSourceCatalogResolution(
  db: DatabaseContext,
  sourceInstanceId: number,
  expectedDisplayName?: string,
): CharacterSourceCatalogResolution {
  const source = db.one(
    `SELECT id, source_type, source_definition_id, display_name, config
     FROM character_source_instances
     WHERE id = ?`,
    [sourceInstanceId],
    (row): CharacterSourceProvenanceRow => {
      const sourceType = sqlString(row, 'source_type');
      if (
        sourceType !== 'feat' &&
        sourceType !== 'species' &&
        sourceType !== 'background'
      ) {
        throw new TypeError(
          `Source ${String(sourceInstanceId)} is not a standalone catalog source.`,
        );
      }
      return {
        id: sqlInteger(row, 'id'),
        source_type: sourceType,
        source_definition_id: sqlNullableInteger(row, 'source_definition_id'),
        display_name: sqlString(row, 'display_name'),
        config: sqlNullableString(row, 'config'),
      };
    },
  );
  if (
    source === null ||
    (
      expectedDisplayName !== undefined &&
      source.display_name !== expectedDisplayName
    )
  ) {
    return { content_key: null, catalog_layer: 'unknown' };
  }

  if (source.source_definition_id !== null) {
    const definition = db.one(
      `SELECT definition.content_key, identity.catalog_layer
       FROM ${definitionTable(source.source_type)} AS definition
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = ?
        AND identity.content_key = definition.content_key
       WHERE definition.id = ?`,
      [source.source_type, source.source_definition_id],
      (row) => ({
        content_key: sqlString(row, 'content_key'),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      }),
    );
    return definition ?? { content_key: null, catalog_layer: 'unknown' };
  }

  if (source.source_type !== 'species') {
    return { content_key: null, catalog_layer: 'unknown' };
  }
  const recordedContentKey = recordedSourceContentKey(source.config);
  if (recordedContentKey === null) {
    return { content_key: null, catalog_layer: 'unknown' };
  }
  return db.one(
    `SELECT template.content_key, identity.catalog_layer
     FROM species_templates AS template
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'species'
      AND identity.content_key = template.content_key
     WHERE template.content_key = ? AND template.name = ?`,
    [recordedContentKey, source.display_name],
    (row) => ({
      content_key: sqlString(row, 'content_key'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  ) ?? { content_key: null, catalog_layer: 'unknown' };
}
