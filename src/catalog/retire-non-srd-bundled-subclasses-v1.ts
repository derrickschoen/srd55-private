import type { DatabaseContext } from '../db/database';
import { withCatalogLineageDeleteGuardSuspended } from './catalog-lineage-delete-guard';

export const RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS = Object.freeze([
  '2024:subclass:ek',
  '2024:subclass:at',
  '2024:subclass:veteran',
] as const);

const placeholders = RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS
  .map(() => '?')
  .join(', ');

function retiredBundledIdentity(alias = ''): string {
  const prefix = alias.length === 0 ? '' : `${alias}.`;
  return `
    ${prefix}content_kind = 'subclass'
    AND ${prefix}key_kind = 'bundled-stable'
    AND ${prefix}catalog_layer = 'bundled'
    AND ${prefix}content_key IN (${placeholders})
  `;
}

function retiredSubclassJsonReference(document: string): string {
  return `EXISTS (
    SELECT 1
      FROM json_tree(${document}) AS reference
      JOIN subclass_definitions AS subclass
        ON reference.type = 'integer'
       AND reference.atom = subclass.id
      JOIN catalog_content_identities AS identity
        ON identity.content_kind = 'subclass'
       AND identity.content_key = subclass.content_key
     WHERE ${retiredBundledIdentity('identity')}
       AND (
         reference.key = 'subclass_definition_id'
         OR (
           reference.key = 'source_definition_id'
           AND EXISTS (
             SELECT 1
               FROM json_tree(${document}) AS discriminator
              WHERE discriminator.parent = reference.parent
                AND discriminator.key = 'source_type'
                AND discriminator.type = 'text'
                AND discriminator.atom = 'subclass'
           )
         )
       )
  )`;
}

/**
 * D217's one-time, narrowly scoped retirement. Character deletion is allowed
 * only here; ordinary catalog removal keeps its non-destructive contracts.
 */
export function retireNonSrdBundledSubclassesV1(db: DatabaseContext): void {
  const keys = [...RETIRED_BUNDLED_SUBCLASS_CONTENT_KEYS];

  db.exec(
    `DELETE FROM characters
      WHERE id IN (
        SELECT DISTINCT held.character_id
          FROM character_class_levels AS held
          JOIN subclass_definitions AS subclass
            ON subclass.id = held.subclass_definition_id
          JOIN catalog_content_identities AS identity
            ON identity.content_kind = 'subclass'
           AND identity.content_key = subclass.content_key
         WHERE ${retiredBundledIdentity('identity')}
      )`,
    keys,
  );

  // D217 permits deleting characters that still hold a retiring subclass.
  // Its narrower companion is history on a surviving character: an inverse
  // or save point that would restore the retired definition can never succeed,
  // so only those unusable entries are discarded. json_tree matches either the
  // class-level field or a polymorphic source row whose sibling discriminator
  // says "subclass", rather than treating arbitrary JSON text as an id.
  db.exec(
    `DELETE FROM character_operations AS operation
      WHERE ${retiredSubclassJsonReference('operation.inverse_command')}`,
    keys,
  );
  db.exec(
    `DELETE FROM character_save_points AS save_point
      WHERE ${retiredSubclassJsonReference('save_point.snapshot')}`,
    keys,
  );

  // A changed-away subclass source is tombstoned, not repointed: its identity
  // is historical provenance for the retired definition. Repointing it would
  // falsely claim Champion created those historical grants. Delete that source
  // graph instead; source-owned rows follow their declared FK/trigger cleanup.
  db.exec(
    `DELETE FROM character_source_instances
      WHERE source_type = 'subclass'
        AND source_definition_id IN (
          SELECT subclass.id
            FROM subclass_definitions AS subclass
            JOIN catalog_content_identities AS identity
              ON identity.content_kind = 'subclass'
             AND identity.content_key = subclass.content_key
           WHERE ${retiredBundledIdentity('identity')}
        )`,
    keys,
  );

  db.exec(
    `DELETE FROM catalog_content_drafts
      WHERE content_kind = 'subclass'
        AND base_content_key IN (
          SELECT content_key FROM catalog_content_identities
           WHERE ${retiredBundledIdentity()}
        )`,
    keys,
  );
  db.exec(
    `DELETE FROM catalog_content_match_decisions
      WHERE content_kind = 'subclass'
        AND target_content_key IN (
          SELECT content_key FROM catalog_content_identities
           WHERE ${retiredBundledIdentity()}
        )`,
    keys,
  );

  withCatalogLineageDeleteGuardSuspended(db, () => {
    db.exec(
      `DELETE FROM catalog_content_supersessions
        WHERE content_kind = 'subclass'
          AND (
            superseded_content_key IN (${placeholders})
            OR successor_content_key IN (${placeholders})
          )`,
      [...keys, ...keys],
    );
  });

  db.exec(
    `DELETE FROM subclass_definitions
      WHERE content_key IN (
        SELECT content_key FROM catalog_content_identities
         WHERE ${retiredBundledIdentity()}
      )`,
    keys,
  );
  db.exec(
    `DELETE FROM catalog_content_aliases
      WHERE content_kind = 'subclass'
        AND content_key IN (
          SELECT content_key FROM catalog_content_identities
           WHERE ${retiredBundledIdentity()}
        )`,
    keys,
  );
  db.exec(
    `DELETE FROM catalog_content_fingerprints
      WHERE content_kind = 'subclass'
        AND content_key IN (
          SELECT content_key FROM catalog_content_identities
           WHERE ${retiredBundledIdentity()}
        )`,
    keys,
  );
  db.exec(
    `DELETE FROM catalog_content_identities
      WHERE ${retiredBundledIdentity()}`,
    keys,
  );
}
