import {
  assertedExternalContentKey,
  normalizeCatalogKeyComponent,
} from './catalog-key';
import { normalizeCatalogName } from './catalog-normalize';
import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import {
  commitContentImport,
  planContentImport,
  type ContentImportChoices,
  type ContentImportCommitResult,
  type ContentImportNode,
  type ContentImportPlan,
  type ContentImportPlanToken,
  type ContentImportProjection,
} from './content-adoption';
import {
  projectSpellContentAggregateV1,
  projectStoredSpellContentV1,
} from './spell-content-projector-v1';
import { ContentIdentityKeyRefusal } from './content-registry';

const USER_CONTENT_OWNER = 'local.dnd-wt';

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

export type ForkSpellImportResult = ForkSpellResult | ContentImportPlan;

export type ForkSpellCommitResult =
  | (Extract<ContentImportCommitResult, { readonly kind: 'committed' }> & {
      readonly spell: ForkSpellResult;
    })
  | Exclude<ContentImportCommitResult, { readonly kind: 'committed' }>;

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
function prepareSrdSpellFork(
  db: DatabaseContext,
  params: ForkSpellParams,
): {
  readonly node: ContentImportNode<'spell'>;
  readonly result: (contentKey: ContentKey) => ForkSpellResult;
} {
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

  const rulesEdition = String(source.rules_edition);
  const initialContentKey = assertedExternalContentKey(
    'spell',
    rulesEdition,
    displayName,
    USER_CONTENT_OWNER,
  );
  const sourceProjection = projectStoredSpellContentV1(
    db,
    String(source.content_key) as ContentKey,
  );
  let installed: ForkSpellResult | null = null;
  const buildProjection = (
    name: string,
    contentKey: ContentKey,
  ): ContentImportProjection<'spell'> => {
    const groupKey = `user-spell:${normalizeCatalogKeyComponent(name)}`;
    const desired = projectSpellContentAggregateV1({
      ...sourceProjection.aggregate,
      name,
      spell_identity_key: groupKey,
      spell_version_key: contentKey,
    });
    return {
      kind: 'spell',
      edition: rulesEdition,
      name,
      assertedKey: contentKey,
      payload: desired.payload,
      projectStored: (database, storedKey) => {
        const stored = projectStoredSpellContentV1(database, storedKey);
        return {
          kind: stored.kind,
          edition: stored.aggregate.rules_edition,
          name: stored.aggregate.name,
          payload: stored.payload,
        };
      },
      install: (database, installedKey, projection, phase) => {
    const timestamp = new Date().toISOString();
    const installedGroupKey =
      `user-spell:${normalizeCatalogKeyComponent(projection.name)}`;
    const identityId = database.exec(
      `INSERT INTO spell_identities (
         content_key, canonical_name, normalized_name, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?)`,
      [
        installedGroupKey,
        projection.name,
        normalizeCatalogName(projection.name),
        timestamp,
        timestamp,
      ],
    ).lastInsertId;

    const spellVersionId = database.exec(
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
        installedKey,
        identityId,
        projection.name,
        timestamp,
        timestamp,
        Number(source.id),
      ],
    ).lastInsertId;

    copyPivots(
      database,
      Number(source.id),
      spellVersionId,
      timestamp,
    );

    const stored = projectStoredSpellContentV1(database, installedKey);
    const expected = projectSpellContentAggregateV1({
      ...sourceProjection.aggregate,
      name: projection.name,
      spell_identity_key: installedGroupKey,
      spell_version_key: installedKey,
    });
    if (stored.payload.spell_version_key !== expected.payload.spell_version_key ||
      JSON.stringify(stored.payload) !== JSON.stringify(expected.payload)) {
      throw new ContentIdentityKeyRefusal('key_collision');
    }
    if (phase === 'commit') {
      installed = {
        spellVersionId,
        contentKey: installedKey,
        displayName: projection.name,
        forkedFromContentKey: String(source.content_key),
      };
    }
      },
    };
  };
  const node: ContentImportNode<'spell'> = {
    id: `spell-fork:${initialContentKey}`,
    projection: buildProjection(displayName, initialContentKey),
    reproject: ({ name, assertedKey }) => buildProjection(name, assertedKey),
  };
  return {
    node,
    result: (contentKey) => {
      if (installed !== null) return installed;
      const existing = db.oneRaw(
        'SELECT id, display_name FROM spell_versions WHERE content_key = ?',
        [contentKey],
      );
      if (existing === null) throw new ContentIdentityKeyRefusal('key_collision');
      return {
        spellVersionId: Number(existing.id),
        contentKey,
        displayName: String(existing.display_name),
        forkedFromContentKey: String(source.content_key),
      };
    },
  };
}

export function planSrdSpellFork(
  db: DatabaseContext,
  params: ForkSpellParams,
  choices: ContentImportChoices = Object.freeze({}),
): ContentImportPlan {
  const prepared = prepareSrdSpellFork(db, params);
  return planContentImport(db, [prepared.node], choices);
}

export function commitSrdSpellFork(
  db: DatabaseContext,
  params: ForkSpellParams,
  token: ContentImportPlanToken,
  choices: ContentImportChoices = Object.freeze({}),
): ForkSpellCommitResult {
  const prepared = prepareSrdSpellFork(db, params);
  const result = commitContentImport(db, {
    nodes: [prepared.node],
    token,
    choices,
  });
  if (result.kind !== 'committed') return result;
  const outcome = result.outcomes[0];
  if (outcome === undefined || outcome.kind === 'refused') {
    return { kind: 'refused', reason: 'entry_refused', outcomes: result.outcomes };
  }
  return Object.freeze({
    ...result,
    spell: prepared.result(outcome.contentKey),
  });
}

export function forkSrdSpell(
  db: DatabaseContext,
  params: ForkSpellParams,
): ForkSpellResult;
export function forkSrdSpell(
  db: DatabaseContext,
  params: ForkSpellParams,
): ForkSpellImportResult {
  const prepared = prepareSrdSpellFork(db, params);
  const plan = planContentImport(db, [prepared.node]);
  if (plan.reviews.length > 0 || plan.outcomes[0]?.kind === 'refused') return plan;
  const committed = commitContentImport(db, { nodes: [prepared.node], token: plan.token });
  if (committed.kind !== 'committed') {
    return committed.kind === 'stale-plan' ? committed.freshPlan : plan;
  }
  const outcome = committed.outcomes[0];
  if (outcome === undefined || outcome.kind === 'refused') return plan;
  return prepared.result(outcome.contentKey);
}
