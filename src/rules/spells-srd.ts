/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * The bundled SRD spell catalog: every spell description and class-list
 * membership, parsed from the SRD extracts AT BUILD TIME by
 * `spells-srd-reader.ts` and read here from the generated artifact
 * (`generated/spells-srd.ts`, written by `npm run srd:artifacts`). This module
 * imports no SRD text.
 */
import { normalizeCatalogName } from '../catalog/catalog-normalize';
import {
  ContentIdentityCollision,
  ensureBundledStableContentIdentity,
  reconcileCurrentContentFingerprintV1,
} from '../catalog/content-registry';
import {
  deriveContentIdentityV1FromNormalizedName,
  normalizeContentIdentityName,
  type DerivedContentIdentityV1,
  type NormalizedContentName,
} from '../catalog/content-identity';
import {
  projectSpellContentAggregateV1,
  projectStoredSpellContentV1,
} from '../catalog/spell-content-projector-v1';
import type { BundledStoredProjectionV1 } from '../catalog/bundled-content-registry-v1';
import { sha256 } from '../crypto/sha256';
import { sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { encodeSpellComponents } from '../domain/spell-components';
import { encodeSpellRange } from '../domain/spell-range';
import type { ContentKey } from '../domain/ids';
import { deepFreeze } from '../domain/deep-freeze';
import {
  BUNDLED_SPELL_RULES_EDITION,
  BUNDLED_SPELL_SEED_VERSION,
  SrdSpellError,
  type SrdSpellDescription,
  type SrdSpellListMembership,
} from './spells-srd-reader';
import { BUNDLED_SRD_SPELL_CATALOG } from './generated/spells-srd';

const BUNDLED_SPELL_DESCRIPTIONS: readonly SrdSpellDescription[] = deepFreeze(
  BUNDLED_SRD_SPELL_CATALOG.descriptions,
);
const BUNDLED_SPELL_LIST_MEMBERSHIPS: readonly SrdSpellListMembership[] =
  deepFreeze(BUNDLED_SRD_SPELL_CATALOG.memberships);

/** All enumerated SRD spell descriptions, in extract order. */
export function bundledSrdSpellDescriptions(): readonly SrdSpellDescription[] {
  return BUNDLED_SPELL_DESCRIPTIONS;
}

/** Every class-list membership, list by list in extract order. */
export function bundledSrdSpellListMemberships(): readonly SrdSpellListMembership[] {
  return BUNDLED_SPELL_LIST_MEMBERSHIPS;
}

function sqlBool(value: boolean): number {
  return value ? 1 : 0;
}

function placeholders(values: readonly unknown[]): string {
  return values.map(() => '?').join(', ');
}

function hasBundledSpellCardinality(
  db: DatabaseContext,
  source: ValidatedBundledSpellSource,
): boolean {
  const { spells, memberships } = source;
  const keys = spells.map((spell) => spell.content_key);
  const present = Number(
    db.scalar(
      `SELECT count(*) FROM spell_versions
       WHERE provenance = 'srd'
         AND is_active = 1
         AND content_key IN (${placeholders(keys)})`,
      keys,
    ) ?? 0,
  );
  if (present !== spells.length) {
    return false;
  }
  return (
    Number(
      db.scalar(
        `SELECT count(*)
         FROM spell_list_memberships AS membership
         INNER JOIN spell_versions AS version
           ON version.id = membership.spell_version_id
         WHERE version.provenance = 'srd'
           AND version.content_key IN (${placeholders(keys)})`,
        keys,
      ) ?? 0,
    ) === memberships.length
  );
}

/**
 * What one seed pass installs. Absent fields mean the bundled catalog; tests
 * pass a re-parsed or edited catalog to model a build that ships different
 * source text.
 */
export interface BundledSpellSeedSources {
  readonly descriptions?: readonly SrdSpellDescription[];
  readonly memberships?: readonly SrdSpellListMembership[];
  readonly includedContentKeys?: ReadonlySet<ContentKey>;
}

export type BundledSpellSeedRefusalReason =
  | 'user-owned-key'
  | 'registry-owned-elsewhere'
  | 'current-fingerprint-integrity'
  | 'replacement-refused';

export type BundledSpellSeedEntryOutcome =
  | {
      readonly kind: 'healthy' | 'updated';
      readonly contentKey: ContentKey;
    }
  | {
      readonly kind: 'refused';
      readonly contentKey: ContentKey;
      readonly reason: BundledSpellSeedRefusalReason;
    };

export interface BundledSpellSeedResult {
  readonly outcomes: readonly BundledSpellSeedEntryOutcome[];
  readonly healthy: number;
  readonly updated: number;
  readonly refused: number;
}

interface ValidatedBundledSpellSource {
  readonly spells: readonly SrdSpellDescription[];
  readonly memberships: readonly SrdSpellListMembership[];
  readonly membershipsByName: ReadonlyMap<
    string,
    readonly SrdSpellListMembership[]
  >;
}

class BundledSpellSeedEntryRefusal extends Error {
  constructor(readonly reason: BundledSpellSeedRefusalReason) {
    super(reason);
    this.name = 'BundledSpellSeedEntryRefusal';
  }
}

function bundledSpellSource(
  sources: BundledSpellSeedSources = Object.freeze({}),
): ValidatedBundledSpellSource {
  const parsedSpells = sources.descriptions ?? BUNDLED_SPELL_DESCRIPTIONS;
  const parsedMemberships = sources.memberships ?? BUNDLED_SPELL_LIST_MEMBERSHIPS;
  const byName = new Map(parsedSpells.map((spell) => [spell.name, spell]));
  const includedNames = new Set(parsedSpells
    .filter((spell) =>
      sources.includedContentKeys?.has(spell.content_key as ContentKey) ?? true
    )
    .map((spell) => spell.name));
  const membershipsByName = new Map<string, SrdSpellListMembership[]>();
  for (const membership of parsedMemberships) {
    if (!byName.has(membership.spell_name)) {
      throw new SrdSpellError(
        `${membership.spell_list_key} lists ${membership.spell_name}, which has no description.`,
      );
    }
    if (includedNames.has(membership.spell_name)) {
      membershipsByName.set(membership.spell_name, [
        ...(membershipsByName.get(membership.spell_name) ?? []),
        membership,
      ]);
    }
  }
  const spells = parsedSpells.filter((spell) => includedNames.has(spell.name));
  const memberships = parsedMemberships.filter((membership) =>
    includedNames.has(membership.spell_name)
  );
  return Object.freeze({ spells, memberships, membershipsByName });
}

function seedSpellIdentityV1(
  spell: SrdSpellDescription,
  memberships: readonly SrdSpellListMembership[],
): DerivedContentIdentityV1<'spell', unknown> {
  const range = encodeSpellRange(spell.range_value);
  const components = encodeSpellComponents(spell.components_value);
  const projection = projectSpellContentAggregateV1({
    kind: 'spell',
    name: spell.name,
    rules_edition: BUNDLED_SPELL_RULES_EDITION,
    spell_identity_key: spell.identity_key,
    spell_version_key: spell.content_key,
    level: spell.level,
    school: spell.school,
    ritual: spell.ritual,
    concentration: spell.concentration,
    casting_time: spell.casting_time,
    action_type: spell.action_type,
    range: spell.range,
    ...range,
    duration: spell.duration,
    components: spell.components,
    ...components,
    healing: false,
    short_summary: spell.description,
    upcast_summary: null,
    cantrip_upgrade_summary: null,
    requires_mod_for_effect: false,
    effect_reliability_category: 'fixed_effect',
    spell_lists: memberships.map((membership) => ({
      value: membership.spell_list_key,
    })),
    tags: [],
    attack_modes: [],
    save_abilities: [],
    upcast_levels: [],
    cantrip_upgrade_levels: [],
  });
  return deriveContentIdentityV1FromNormalizedName({
    kind: 'spell',
    edition: BUNDLED_SPELL_RULES_EDITION,
    normalizedName: normalizeContentIdentityName(spell.name),
    payload: projection.payload,
  });
}

function writeBundledSpell(
  db: DatabaseContext,
  spell: SrdSpellDescription,
  memberships: readonly SrdSpellListMembership[],
  timestamp: string,
): number {
  const collision = db.oneRaw(
    `SELECT id, provenance FROM spell_versions WHERE content_key = ?`,
    [spell.content_key],
  );
  if (collision !== null && collision.provenance !== 'srd') {
    throw new SrdSpellError(
      `cannot seed ${spell.content_key}: the key already belongs to provenance ${JSON.stringify(collision.provenance)}.`,
    );
  }

  db.exec(
    `INSERT INTO spell_identities (
       content_key, canonical_name, normalized_name, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(content_key) DO NOTHING`,
    [
      spell.identity_key,
      spell.name,
      normalizeCatalogName(spell.name),
      timestamp,
      timestamp,
    ],
  );
  const identity = db.oneRaw(
    `SELECT id, canonical_name, normalized_name
     FROM spell_identities WHERE content_key = ?`,
    [spell.identity_key],
  );
  if (
    identity === null ||
    identity.canonical_name !== spell.name ||
    identity.normalized_name !== normalizeCatalogName(spell.name)
  ) {
    throw new SrdSpellError(
      `identity key ${spell.identity_key} belongs to different spell data.`,
    );
  }

  const range = encodeSpellRange(spell.range_value);
  const components = encodeSpellComponents(spell.components_value);
  ensureBundledStableContentIdentity(db, {
    kind: 'spell',
    contentKey: spell.content_key,
    normalizedName: normalizeContentIdentityName(spell.name),
  });
  db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, ritual, concentration, casting_time, action_type,
       range, range_kind, range_feet, area_shape, area_feet,
       duration, components, material_component_summary,
       material_cost_copper, material_cost_kind, short_summary,
       provenance, seed_version, is_active, created_at, updated_at
     ) VALUES (
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
       'srd', ?, 1, ?, ?
     )
     ON CONFLICT(content_key) DO UPDATE SET
       spell_identity_id = excluded.spell_identity_id,
       display_name = excluded.display_name,
       rules_edition = excluded.rules_edition,
       level = excluded.level,
       school = excluded.school,
       ritual = excluded.ritual,
       concentration = excluded.concentration,
       casting_time = excluded.casting_time,
       action_type = excluded.action_type,
       range = excluded.range,
       range_kind = excluded.range_kind,
       range_feet = excluded.range_feet,
       area_shape = excluded.area_shape,
       area_feet = excluded.area_feet,
       duration = excluded.duration,
       components = excluded.components,
       material_component_summary = excluded.material_component_summary,
       material_cost_copper = excluded.material_cost_copper,
       material_cost_kind = excluded.material_cost_kind,
       short_summary = excluded.short_summary,
       seed_version = excluded.seed_version,
       is_active = 1,
       updated_at = excluded.updated_at
     WHERE spell_versions.provenance = 'srd'`,
    [
      spell.content_key,
      Number(identity.id),
      spell.name,
      BUNDLED_SPELL_RULES_EDITION,
      spell.level,
      spell.school,
      sqlBool(spell.ritual),
      sqlBool(spell.concentration),
      spell.casting_time,
      spell.action_type,
      spell.range,
      range.range_kind,
      range.range_feet,
      range.area_shape,
      range.area_feet,
      spell.duration,
      spell.components,
      components.material_component_summary,
      components.material_cost_copper,
      components.material_cost_kind,
      spell.description,
      BUNDLED_SPELL_SEED_VERSION,
      timestamp,
      timestamp,
    ],
  );
  const versionId = Number(
    db.scalar(
      `SELECT id FROM spell_versions
       WHERE content_key = ? AND provenance = 'srd'`,
      [spell.content_key],
    ),
  );
  if (!Number.isSafeInteger(versionId) || versionId < 1) {
    throw new SrdSpellError(`failed to seed ${spell.content_key}.`);
  }
  db.exec(
    'DELETE FROM spell_list_memberships WHERE spell_version_id = ?',
    [versionId],
  );
  for (const membership of memberships) {
    db.exec(
      `INSERT INTO spell_list_memberships (
         spell_version_id, spell_list_key, created_at, updated_at
       ) VALUES (?, ?, ?, ?)`,
      [versionId, membership.spell_list_key, timestamp, timestamp],
    );
  }
  return versionId;
}

/**
 * D205/D208 permit replacing development-era bundled registrations. The
 * pre-fix spell registrar stored catalog-lookup names in the content registry,
 * so remove only those mismatched spell fingerprints and remembered matches
 * before the normal registry pass recreates them from the corrected name.
 */
function repairBundledSpellIdentityRegistrations(
  db: DatabaseContext,
  spells: readonly SrdSpellDescription[],
): void {
  db.transaction(() => {
    for (const spell of spells) {
      const registration = db.oneRaw(
        `SELECT key_kind, catalog_layer, normalized_name
         FROM catalog_content_identities
         WHERE content_kind = 'spell' AND content_key = ?`,
        [spell.content_key],
      );
      const normalizedName = normalizeContentIdentityName(spell.name);
      if (
        registration === null ||
        registration.key_kind !== 'bundled-stable' ||
        registration.catalog_layer !== 'bundled' ||
        registration.normalized_name === normalizedName
      ) {
        continue;
      }
      db.exec(
        `DELETE FROM catalog_content_match_decisions
         WHERE content_kind = 'spell'
           AND (
             target_content_key = ? OR
             incoming_fingerprint_digest IN (
               SELECT fingerprint_digest
               FROM catalog_content_fingerprints
               WHERE content_kind = 'spell' AND content_key = ?
             )
           )`,
        [spell.content_key, spell.content_key],
      );
      db.exec(
        `DELETE FROM catalog_content_fingerprints
         WHERE content_kind = 'spell' AND content_key = ?`,
        [spell.content_key],
      );
      db.exec(
        `UPDATE catalog_content_identities
         SET normalized_name = ?
         WHERE content_kind = 'spell' AND content_key = ?`,
        [normalizedName, spell.content_key],
      );
    }
  });
}

function reconcileBundledSpellEntry(
  db: DatabaseContext,
  spell: SrdSpellDescription,
  memberships: readonly SrdSpellListMembership[],
  storedProjection: BundledStoredProjectionV1 | undefined,
): BundledSpellSeedEntryOutcome {
  const contentKey = spell.content_key as ContentKey;
  try {
    return db.transaction(() => {
      const root = db.oneRaw(
        'SELECT provenance FROM spell_versions WHERE content_key = ?',
        [contentKey],
      );
      if (root !== null && sqlString(root, 'provenance') !== 'srd') {
        return Object.freeze({
          kind: 'refused' as const,
          contentKey,
          reason: 'user-owned-key' as const,
        });
      }
      const registry = db.oneRaw(
        `SELECT content_kind, key_kind, catalog_layer, normalized_name
         FROM catalog_content_identities WHERE content_key = ?`,
        [contentKey],
      );
      if (registry !== null) {
        const isBundled =
          sqlString(registry, 'content_kind') === 'spell' &&
          sqlString(registry, 'key_kind') === 'bundled-stable' &&
          sqlString(registry, 'catalog_layer') === 'bundled';
        if (!isBundled) {
          return Object.freeze({
            kind: 'refused' as const,
            contentKey,
            reason: 'registry-owned-elsewhere' as const,
          });
        }
      }

      const normalizedName = registry === null
        ? null
        : sqlString(registry, 'normalized_name') as NormalizedContentName;
      const desired = normalizedName === null
        ? null
        : seedSpellIdentityV1(spell, memberships);
      if (
        desired !== null &&
        storedProjection !== undefined &&
        storedProjection.identity.digest === desired.digest &&
        storedProjection.identity.canonicalJson === desired.canonicalJson &&
        root !== null
      ) {
        return Object.freeze({ kind: 'healthy' as const, contentKey });
      }
      if (storedProjection === undefined && root !== null) {
        const current = db.oneRaw(
          `SELECT fingerprint_digest, canonical_json
           FROM catalog_content_fingerprints
           WHERE content_kind = 'spell' AND content_key = ?
             AND fingerprint_scheme = 'content-v1'
             AND fingerprint_role = 'current'`,
          [contentKey],
        );
        if (
          current !== null &&
          sha256(sqlString(current, 'canonical_json')) !==
            sqlString(current, 'fingerprint_digest')
        ) {
          throw new BundledSpellSeedEntryRefusal(
            'current-fingerprint-integrity',
          );
        }
        throw new BundledSpellSeedEntryRefusal('replacement-refused');
      }

      try {
        writeBundledSpell(db, spell, memberships, new Date().toISOString());
      } catch (error) {
        if (error instanceof SrdSpellError) {
          throw new BundledSpellSeedEntryRefusal('replacement-refused');
        }
        throw error;
      }
      const installedRegistry = db.oneRaw(
        `SELECT key_kind, catalog_layer, normalized_name
         FROM catalog_content_identities
         WHERE content_kind = 'spell' AND content_key = ?`,
        [contentKey],
      );
      if (installedRegistry === null) {
        throw new BundledSpellSeedEntryRefusal('replacement-refused');
      }
      const authoritativeName = sqlString(
        installedRegistry,
        'normalized_name',
      ) as NormalizedContentName;
      const installed = projectStoredSpellContentV1(db, contentKey);
      const installedIdentity = deriveContentIdentityV1FromNormalizedName({
        kind: 'spell',
        edition: installed.aggregate.rules_edition,
        normalizedName: authoritativeName,
        payload: installed.payload,
      });
      const installedDesired = seedSpellIdentityV1(
        spell,
        memberships,
      );
      if (
        installedIdentity.digest !== installedDesired.digest ||
        installedIdentity.canonicalJson !== installedDesired.canonicalJson
      ) {
        throw new BundledSpellSeedEntryRefusal('replacement-refused');
      }
      try {
        reconcileCurrentContentFingerprintV1(db, {
          kind: 'spell',
          contentKey,
          identity: installedDesired,
        });
      } catch (error) {
        if (error instanceof ContentIdentityCollision) {
          throw new BundledSpellSeedEntryRefusal(
            'current-fingerprint-integrity',
          );
        }
        throw error;
      }
      return Object.freeze({ kind: 'updated' as const, contentKey });
    });
  } catch (error) {
    if (error instanceof BundledSpellSeedEntryRefusal) {
      return Object.freeze({
        kind: 'refused',
        contentKey,
        reason: error.reason,
      });
    }
    throw error;
  }
}

/**
 * Compare every shipped spell projection with the stored identities computed
 * by this boot's general bundled reconciliation. Equality therefore means the
 * source, live stored aggregate, and reconciled registry current bytes agree.
 * A difference replaces only the SRD aggregate, validates that write with one
 * new projection, then moves registry history in the same nested transaction.
 */
export function ensureBundledSpellContent(
  db: DatabaseContext,
  storedProjections: readonly BundledStoredProjectionV1[],
  sources: BundledSpellSeedSources = Object.freeze({}),
): BundledSpellSeedResult {
  const source = bundledSpellSource(sources);
  const storedByKey = new Map(
    storedProjections.filter((projection) => projection.kind === 'spell')
      .map((projection) => [projection.contentKey, projection]),
  );
  const outcomes = source.spells.map((spell) => reconcileBundledSpellEntry(
    db,
    spell,
    source.membershipsByName.get(spell.name) ?? Object.freeze([]),
    storedByKey.get(spell.content_key as ContentKey),
  ));
  return Object.freeze({
    outcomes: Object.freeze(outcomes),
    healthy: outcomes.filter((outcome) => outcome.kind === 'healthy').length,
    updated: outcomes.filter((outcome) => outcome.kind === 'updated').length,
    refused: outcomes.filter((outcome) => outcome.kind === 'refused').length,
  });
}

/**
 * Repair pre-fix bundled spell registrations, then install only absent roots
 * before the general registry pass. Present roots are deliberately never
 * rewritten here: reconciliation must observe their actual stored state before
 * the source-wins seeder runs.
 */
export function installMissingBundledSpellContent(
  db: DatabaseContext,
  sources: BundledSpellSeedSources = Object.freeze({}),
): void {
  const source = bundledSpellSource(sources);
  repairBundledSpellIdentityRegistrations(db, source.spells);
  if (hasBundledSpellCardinality(db, source)) {
    return;
  }
  const timestamp = new Date().toISOString();
  // One seed pass is one durable transaction. OPFS commits are materially
  // expensive, and committing once per missing spell made a real browser boot
  // pay that cost hundreds of times. This also restores the seed pass's atomic
  // failure semantics: either every absent bundled root is installed for the
  // projector, or none is.
  db.transaction(() => {
    for (const spell of source.spells) {
      if (db.oneRaw(
        'SELECT 1 FROM spell_versions WHERE content_key = ?',
        [spell.content_key],
      ) !== null) {
        continue;
      }
      writeBundledSpell(
        db,
        spell,
        source.membershipsByName.get(spell.name) ?? Object.freeze([]),
        timestamp,
      );
    }
  });
}

/** Remove projection-only bundled spells from a fresh test-profile image. */
export function removeBundledSpellContent(
  db: DatabaseContext,
  contentKeys: ReadonlySet<ContentKey>,
): void {
  db.transaction(() => {
    for (const contentKey of contentKeys) {
      const identityId = db.scalar<number>(
        `SELECT spell_identity_id FROM spell_versions
         WHERE content_key = ? AND provenance = 'srd'`,
        [contentKey],
      );
      db.exec(
        `DELETE FROM spell_versions
         WHERE content_key = ? AND provenance = 'srd'`,
        [contentKey],
      );
      if (identityId !== null) {
        db.exec(
          `DELETE FROM spell_identities
           WHERE id = ?
             AND NOT EXISTS (
               SELECT 1 FROM spell_versions WHERE spell_identity_id = ?
             )`,
          [identityId, identityId],
        );
      }
      db.exec(
        `DELETE FROM catalog_content_identities
         WHERE content_kind = 'spell' AND content_key = ?
           AND key_kind = 'bundled-stable' AND catalog_layer = 'bundled'`,
        [contentKey],
      );
    }
  });
}

/**
 * Seed only keys owned by this bundle.
 *
 * A pre-existing non-SRD version under an official key is USER DATA. Silently
 * converting it to `srd` would overwrite that data; silently skipping it would
 * claim the complete bundled layer exists when it does not. The seed therefore
 * refuses the collision transactionally and leaves the existing row untouched.
 */
export function seedSpellContent(db: DatabaseContext): void {
  const source = bundledSpellSource();
  repairBundledSpellIdentityRegistrations(db, source.spells);
  if (hasBundledSpellCardinality(db, source)) {
    return;
  }

  db.transaction(() => {
    const timestamp = new Date().toISOString();
    const versionIds = new Map<string, number>();
    for (const spell of source.spells) {
      versionIds.set(spell.name, writeBundledSpell(
        db,
        spell,
        Object.freeze([]),
        timestamp,
      ));
    }
    // Preserve the independently printed class-list order in row ids. The
    // content-v1 projector treats membership as a set, but exports and source
    // provenance tests deliberately retain the source document's ordering.
    for (const membership of source.memberships) {
      const versionId = versionIds.get(membership.spell_name);
      if (versionId === undefined) {
        throw new SrdSpellError(
          `${membership.spell_name} has no seeded version id.`,
        );
      }
      db.exec(
        `INSERT INTO spell_list_memberships (
           spell_version_id, spell_list_key, created_at, updated_at
         ) VALUES (?, ?, ?, ?)`,
        [versionId, membership.spell_list_key, timestamp, timestamp],
      );
    }
  });
}
