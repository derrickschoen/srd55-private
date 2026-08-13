import { sqlInteger, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import {
  bundledSpeciesDefinitions,
  ensureBundledSpeciesDefinitions,
} from '../rules/origin-definitions-srd';
import {
  deriveContentIdentityV2FromNormalizedName,
  type NormalizedContentName,
} from './content-identity';
import { reconcileCurrentContentFingerprint } from './content-registry';
import {
  projectStoredSpeciesContentV2,
  storedAuthoredRegistryReferencesV1,
} from './stored-authored-content-projector-v1';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

const LINEAGE_KEYS = new Set([
  '2024:species:elf',
  '2024:species:gnome',
  '2024:species:tiefling',
]);

/**
 * Checksum-frozen U2-A data migration. Fresh images have no templates yet and
 * need no reconciliation; their ordinary seed writes v2 directly. Existing
 * images are reseeded, promoted, and regenerated in this one transaction.
 */
export function reconcileSpeciesLineageContentV2(db: DatabaseContext): void {
  const templateCount = db.scalar<number>(
    `SELECT COUNT(*) FROM species_templates
     WHERE content_key IN ('2024:species:elf', '2024:species:gnome',
                           '2024:species:tiefling')`,
  );
  if (templateCount !== 3) return;

  ensureBundledSpeciesDefinitions(db);
  const references = storedAuthoredRegistryReferencesV1(db);
  for (const definition of bundledSpeciesDefinitions()) {
    if (!LINEAGE_KEYS.has(definition.content_key)) continue;
    const projection = projectStoredSpeciesContentV2(
      db,
      definition.content_key as ContentKey,
      references,
    );
    const normalizedName = db.scalar<string>(
      `SELECT normalized_name FROM catalog_content_identities
       WHERE content_kind = 'species' AND content_key = ?`,
      [definition.content_key],
    );
    if (normalizedName === null) {
      throw new Error(`Bundled species '${definition.content_key}' has no identity.`);
    }
    const identity = deriveContentIdentityV2FromNormalizedName({
      kind: 'species',
      edition: projection.aggregate.rules_edition,
      normalizedName: normalizedName as NormalizedContentName,
      payload: projection.payload,
    });
    reconcileCurrentContentFingerprint(db, {
      kind: 'species',
      contentKey: definition.content_key as ContentKey,
      identity,
    });
  }

  const sources = db.all(
    `SELECT source.id, definition.content_key
     FROM character_source_instances AS source
     JOIN species_definitions AS definition
       ON definition.id = source.source_definition_id
     WHERE source.source_type = 'species' AND source.state = ?
       AND definition.content_key IN (
         '2024:species:elf', '2024:species:gnome', '2024:species:tiefling'
       )
     ORDER BY source.id`,
    [ACTIVE_SOURCE_INSTANCE_STATE],
    (row) => ({
      id: sqlInteger(row, 'id'),
      contentKey: sqlString(row, 'content_key'),
    }),
  );
  const generator = new GrantRuleSlotGenerator(db);
  for (const source of sources) {
    if (!LINEAGE_KEYS.has(source.contentKey)) {
      throw new Error(`Unexpected lineage source '${source.contentKey}'.`);
    }
    generator.generateForSource(source.id);
  }
}
