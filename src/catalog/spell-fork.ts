import { homebrewSpellKey } from './catalog-key';
import { normalizeCatalogName } from './catalog-normalize';
import type { DatabaseContext } from '../db/database';

const USER_CONTENT_OWNER = 'local.dnd-wt';
const REGISTERED_USER_CONTENT_OWNERS = new Set([USER_CONTENT_OWNER]);

export const FORK_NAME_REQUIRED_MESSAGE =
  'A copied spell must have a different name from its source.';

export interface ForkSpellParams {
  readonly sourceContentKey: string;
  readonly name?: string;
}

export interface ForkSpellResult {
  readonly spellVersionId: number;
  readonly contentKey: string;
  readonly displayName: string;
  readonly forkedFromContentKey: string;
}

const COPIED_PIVOTS = [
  {
    table: 'spell_version_publications',
    columns: ['source_book', 'source_page', 'source_reference'],
    timestamps: true,
  },
  {
    table: 'spell_list_memberships',
    columns: ['spell_list_key'],
    timestamps: true,
  },
  {
    table: 'spell_version_upcast_levels',
    columns: ['level'],
    timestamps: false,
  },
  {
    table: 'spell_version_cantrip_upgrade_levels',
    columns: ['level'],
    timestamps: false,
  },
  {
    table: 'spell_version_tags',
    columns: ['tag'],
    timestamps: false,
  },
  {
    table: 'spell_version_damage_types',
    columns: ['damage_type'],
    timestamps: false,
  },
  {
    table: 'spell_version_conditions',
    columns: ['condition_type'],
    timestamps: false,
  },
  {
    table: 'spell_version_attack_modes',
    columns: ['attack_mode'],
    timestamps: false,
  },
  {
    table: 'spell_version_save_abilities',
    columns: ['save_ability'],
    timestamps: false,
  },
] as const;

function copyPivots(
  db: DatabaseContext,
  sourceVersionId: number,
  forkVersionId: number,
  timestamp: string,
): void {
  for (const pivot of COPIED_PIVOTS) {
    const columns = pivot.columns.join(', ');
    if (pivot.timestamps) {
      db.exec(
        `INSERT INTO ${pivot.table} (
           spell_version_id, ${columns}, created_at, updated_at
         )
         SELECT ?, ${columns}, ?, ?
         FROM ${pivot.table}
         WHERE spell_version_id = ?`,
        [forkVersionId, timestamp, timestamp, sourceVersionId],
      );
    } else {
      db.exec(
        `INSERT INTO ${pivot.table} (spell_version_id, ${columns})
         SELECT ?, ${columns}
         FROM ${pivot.table}
         WHERE spell_version_id = ?`,
        [forkVersionId, sourceVersionId],
      );
    }
  }
}

/**
 * Copy one bundled SRD spell into an independent, user-authored catalog row.
 *
 * The source identity is deliberately not reused: the fork is a new spell,
 * not another printing of the bundled spell in the same rules edition.
 */
export function forkSrdSpell(
  db: DatabaseContext,
  params: ForkSpellParams,
): ForkSpellResult {
  const source = db.oneRaw(
    `SELECT *
     FROM spell_versions
     WHERE content_key = ? AND provenance = 'srd' AND is_active = 1`,
    [params.sourceContentKey],
  );
  if (source === null) {
    throw new Error('Bundled SRD spell not found.');
  }

  const sourceName = String(source.display_name);
  const displayName = params.name?.trim() || `${sourceName} (Copy)`;
  if (displayName === sourceName) {
    throw new Error(FORK_NAME_REQUIRED_MESSAGE);
  }

  return db.transaction(() => {
    const timestamp = new Date().toISOString();
    const uniquePart = crypto.randomUUID();
    const contentKey = homebrewSpellKey(
      String(source.rules_edition),
      USER_CONTENT_OWNER,
      uniquePart,
      REGISTERED_USER_CONTENT_OWNERS,
    );
    const identityId = db.exec(
      `INSERT INTO spell_identities (
         content_key, canonical_name, normalized_name, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?)`,
      [
        `user-spell:${uniquePart}`,
        displayName,
        normalizeCatalogName(displayName),
        timestamp,
        timestamp,
      ],
    ).lastInsertId;

    const spellVersionId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name,
         forked_from_content_key, rules_edition, level, school, ritual,
         concentration, casting_time, action_type, range, range_kind,
         range_feet, area_shape, area_feet, duration, components,
         material_component_summary, material_cost_copper, material_cost_kind,
         healing, short_summary, upcast_summary, cantrip_upgrade_summary,
         requires_mod_for_effect, effect_reliability_category, provenance,
         seed_version, is_active, created_at, updated_at
       )
       SELECT ?, ?, ?, content_key, rules_edition, level, school, ritual,
         concentration, casting_time, action_type, range, range_kind,
         range_feet, area_shape, area_feet, duration, components,
         material_component_summary, material_cost_copper, material_cost_kind,
         healing, short_summary, upcast_summary, cantrip_upgrade_summary,
         requires_mod_for_effect, effect_reliability_category, 'user',
         NULL, 1, ?, ?
       FROM spell_versions
       WHERE id = ?`,
      [
        contentKey,
        identityId,
        displayName,
        timestamp,
        timestamp,
        Number(source.id),
      ],
    ).lastInsertId;

    copyPivots(
      db,
      Number(source.id),
      spellVersionId,
      timestamp,
    );

    return {
      spellVersionId,
      contentKey,
      displayName,
      forkedFromContentKey: String(source.content_key),
    };
  });
}
