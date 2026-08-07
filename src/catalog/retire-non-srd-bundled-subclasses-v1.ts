import type { DatabaseContext } from '../db/database';

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

  const lineageDeleteGuard = db.scalar<string>(
    `SELECT sql FROM sqlite_schema
      WHERE type = 'trigger'
        AND name = 'catalog_content_supersessions_refuse_delete_before_delete'`,
  );
  if (lineageDeleteGuard === null) {
    throw new Error('Catalog supersession delete guard is missing.');
  }
  db.exec('DROP TRIGGER catalog_content_supersessions_refuse_delete_before_delete');
  db.exec(
    `DELETE FROM catalog_content_supersessions
      WHERE content_kind = 'subclass'
        AND (
          superseded_content_key IN (${placeholders})
          OR successor_content_key IN (${placeholders})
        )`,
    [...keys, ...keys],
  );
  db.exec(lineageDeleteGuard);

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
