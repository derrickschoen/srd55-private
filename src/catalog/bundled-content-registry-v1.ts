import { sqlString } from '../db/codecs';
import { sha256 } from '../crypto/sha256';
import type { DatabaseContext } from '../db/database';
import { isEnumValue } from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import { bundledBackgroundDefinitions } from '../rules/background-definitions-srd';
import { bundledClassContentKeys } from '../rules/class-progression-lookup';
import { bundledFeatDefinitions } from '../rules/feats-srd';
import { bundledSpeciesDefinitions } from '../rules/origin-definitions-srd';
import {
  bundledBackgroundTemplates,
  bundledSpeciesTemplates,
} from '../rules/origins-srd';
import { bundledArmorTemplates } from '../rules/armor-srd';
import { parseSrdSpellDescriptions } from '../rules/spells-srd';
import { bundledWeaponTemplates } from '../rules/weapons-srd';
import { bundledSubclassDefinitionContentKeys } from '../rules/srd-subclass-content';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  contentKinds,
  deriveContentIdentityV1FromNormalizedName,
  normalizeContentIdentityName,
  type ContentFingerprintDigest,
  type ContentKind,
  type DerivedContentIdentityV1,
  type NormalizedContentName,
} from './content-identity';
import {
  ContentIdentityCollision,
  registerContentFingerprint,
} from './content-registry';
import { projectStoredEquipmentContentV1 } from './equipment-content-projector-v1';
import { projectStoredSpellContentV1 } from './spell-content-projector-v1';
import {
  projectStoredClassContentV1,
  projectStoredFeatContentV1,
} from './source-content-projector-v1';
import {
  projectStoredAuthoredContentV1,
  storedAuthoredRegistryReferencesV1,
} from './stored-authored-content-projector-v1';

interface BundledManifestEntryV1 {
  readonly kind: ContentKind;
  readonly contentKey: ContentKey;
}

export interface BundledContentRegistryResultV1 {
  readonly projected: number;
  readonly orphaned: number;
  readonly refused: number;
  readonly registered: number;
  readonly unchanged: number;
  readonly moved: number;
}

const KIND_ORDER: Readonly<Record<ContentKind, number>> = Object.freeze({
  weapon: 0,
  armor: 1,
  item: 2,
  spell: 3,
  class: 4,
  feat: 5,
  subclass: 6,
  species: 7,
  background: 8,
});

let staticManifest: readonly BundledManifestEntryV1[] | undefined;

/**
 * The stable-key manifest is constructed from the exact exported collections
 * consumed by the production seeders. It never hand-lists a key. Species and
 * background deliberately union their definition/template halves into one
 * aggregate key; item has no bundled source collection today.
 */
export function bundledContentManifestV1(): readonly BundledManifestEntryV1[] {
  staticManifest ??= Object.freeze([
    ...bundledWeaponTemplates().map((row) => ({
      kind: 'weapon' as const,
      contentKey: row.content_key as ContentKey,
    })),
    ...bundledArmorTemplates().map((row) => ({
      kind: 'armor' as const,
      contentKey: row.content_key as ContentKey,
    })),
    ...parseSrdSpellDescriptions().map((row) => ({
      kind: 'spell' as const,
      contentKey: row.content_key as ContentKey,
    })),
    ...bundledClassContentKeys().classes.map((contentKey) => ({
      kind: 'class' as const,
      contentKey: contentKey as ContentKey,
    })),
    ...bundledFeatDefinitions().map((row) => ({
      kind: 'feat' as const,
      contentKey: row.content_key as ContentKey,
    })),
    ...bundledSubclassDefinitionContentKeys().map((contentKey) => ({
      kind: 'subclass' as const,
      contentKey: contentKey as ContentKey,
    })),
    ...[
      ...bundledSpeciesDefinitions(),
      ...bundledSpeciesTemplates(),
    ].map((row) => ({
      kind: 'species' as const,
      contentKey: row.content_key as ContentKey,
    })),
    ...[
      ...bundledBackgroundDefinitions(),
      ...bundledBackgroundTemplates(),
    ].map((row) => ({
      kind: 'background' as const,
      contentKey: row.content_key as ContentKey,
    })),
  ].filter(
    (entry, index, entries) => entries.findIndex((candidate) =>
      candidate.kind === entry.kind && candidate.contentKey === entry.contentKey,
    ) === index,
  ).sort((left, right) =>
    KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
    left.contentKey.localeCompare(right.contentKey),
  ));
  return staticManifest;
}

type AggregateRootInspectionV1 =
  | { readonly outcome: 'reconcile'; readonly name: string }
  | { readonly outcome: 'orphaned' };

function queriedRootNames(
  db: DatabaseContext,
  sql: string,
  contentKey: ContentKey,
): readonly string[] {
  return db.all(sql, [contentKey], (row) => sqlString(row, 'name'));
}

function singleRootSql(kind: ContentKind): string | null {
  switch (kind) {
    case 'class':
      return 'SELECT name FROM class_definitions WHERE content_key = ?';
    case 'subclass':
      return 'SELECT name FROM subclass_definitions WHERE content_key = ?';
    case 'feat':
      return 'SELECT name FROM feat_definitions WHERE content_key = ?';
    case 'species':
    case 'background':
      return null;
    case 'spell':
      return 'SELECT display_name AS name FROM spell_versions WHERE content_key = ?';
    case 'weapon':
      return 'SELECT name FROM weapon_templates WHERE content_key = ?';
    case 'armor':
      return 'SELECT name FROM armor_templates WHERE content_key = ?';
    case 'item':
      return 'SELECT name FROM item_definitions WHERE content_key = ?';
  }
}

function inspectAggregateRoot(
  db: DatabaseContext,
  entry: BundledManifestEntryV1,
): AggregateRootInspectionV1 {
  const sql = singleRootSql(entry.kind);
  let halves: readonly (readonly string[])[] = sql === null
    ? []
    : [queriedRootNames(db, sql, entry.contentKey)];
  let compositionCanProject: (presentHalves: readonly boolean[]) => boolean =
    (presentHalves) => presentHalves[0] === true;
  if (entry.kind === 'species') {
    halves = [
      queriedRootNames(
        db,
        'SELECT name FROM species_definitions WHERE content_key = ?',
        entry.contentKey,
      ),
      queriedRootNames(
        db,
        'SELECT name FROM species_templates WHERE content_key = ?',
        entry.contentKey,
      ),
    ];
    compositionCanProject = (presentHalves) => presentHalves[1] === true;
  }
  if (entry.kind === 'background') {
    halves = [
      queriedRootNames(
        db,
        'SELECT name FROM background_definitions WHERE content_key = ?',
        entry.contentKey,
      ),
      queriedRootNames(
        db,
        'SELECT name FROM background_templates WHERE content_key = ?',
        entry.contentKey,
      ),
    ];
    compositionCanProject = (presentHalves) =>
      presentHalves[0] === true && presentHalves[1] === true;
  }
  const distinctNames = [...new Set(halves.flat())];
  if (distinctNames.length > 1) {
    throw new TypeError(
      `Bundled ${entry.kind} '${entry.contentKey}' has inconsistent root names.`,
    );
  }
  const presentHalves = halves.map((half) => half.length > 0);
  if (
    distinctNames.length === 0 ||
    !compositionCanProject(presentHalves)
  ) {
    return Object.freeze({ outcome: 'orphaned' });
  }
  return Object.freeze({ outcome: 'reconcile', name: distinctNames[0]! });
}

function allBundledCandidates(
  db: DatabaseContext,
): readonly BundledManifestEntryV1[] {
  const entries = new Map(
    bundledContentManifestV1().map((entry) => [
      `${entry.kind}\u0000${entry.contentKey}`,
      entry,
    ]),
  );
  for (const row of db.allRaw(
    `SELECT content_kind, content_key
     FROM catalog_content_identities
     WHERE key_kind = 'bundled-stable' AND catalog_layer = 'bundled'`,
  )) {
    const kind = sqlString(row, 'content_kind');
    if (!isEnumValue(contentKinds, kind)) {
      throw new TypeError(`Bundled registry row has unknown kind '${kind}'.`);
    }
    const entry = {
      kind,
      contentKey: sqlString(row, 'content_key') as ContentKey,
    };
    entries.set(`${entry.kind}\u0000${entry.contentKey}`, entry);
  }
  return Object.freeze([...entries.values()].sort((left, right) =>
    KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
    left.contentKey.localeCompare(right.contentKey),
  ));
}

function ensureBundledRegistryRoot(
  db: DatabaseContext,
  entry: BundledManifestEntryV1,
  name: string,
): void {
    const registry = db.oneRaw(
      `SELECT content_kind, key_kind, catalog_layer
       FROM catalog_content_identities WHERE content_key = ?`,
      [entry.contentKey],
    );
    if (registry === null || registry.content_kind !== entry.kind) {
      throw new TypeError(
        `Bundled ${entry.kind} '${entry.contentKey}' has no matching registry root.`,
      );
    }
    const keyKind = sqlString(registry, 'key_kind');
    const layer = sqlString(registry, 'catalog_layer');
    if (
      (keyKind !== 'legacy-opaque' || layer !== 'external') &&
      (keyKind !== 'bundled-stable' || layer !== 'bundled')
    ) {
      throw new TypeError(
        `Bundled ${entry.kind} '${entry.contentKey}' is registered as ${keyKind}/${layer}.`,
      );
    }
    if (keyKind === 'legacy-opaque') {
      db.exec(
        `UPDATE catalog_content_identities
         SET key_kind = 'bundled-stable', catalog_layer = 'bundled',
             normalized_name = ?
         WHERE content_kind = ? AND content_key = ?`,
        [normalizeContentIdentityName(name), entry.kind, entry.contentKey],
      );
    }
}

function projectBundledIdentityV1(
  db: DatabaseContext,
  entry: BundledManifestEntryV1,
): DerivedContentIdentityV1<ContentKind, unknown> {
  const references = storedAuthoredRegistryReferencesV1(db);
  let projection: {
    readonly kind: ContentKind;
    readonly aggregate: { readonly name: string; readonly rules_edition: string };
    readonly payload: unknown;
  };
  switch (entry.kind) {
    case 'class':
      projection = projectStoredClassContentV1(db, entry.contentKey, references);
      break;
    case 'subclass':
    case 'species':
    case 'background':
      projection = projectStoredAuthoredContentV1(db, {
        kind: entry.kind,
        contentKey: entry.contentKey,
        references,
      });
      break;
    case 'feat':
      projection = projectStoredFeatContentV1(db, entry.contentKey, references);
      break;
    case 'spell':
      projection = projectStoredSpellContentV1(db, entry.contentKey);
      break;
    case 'weapon':
      projection = projectStoredEquipmentContentV1(db, {
        kind: 'weapon',
        contentKey: entry.contentKey,
      });
      break;
    case 'armor':
      projection = projectStoredEquipmentContentV1(db, {
        kind: 'armor',
        contentKey: entry.contentKey,
      });
      break;
    case 'item':
      projection = projectStoredEquipmentContentV1(db, {
        kind: 'item',
        contentKey: entry.contentKey,
      });
      break;
  }
  const normalizedName = db.scalar<string>(
    `SELECT normalized_name FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [entry.kind, entry.contentKey],
  );
  if (normalizedName === null || normalizedName === '') {
    throw new TypeError(
      `Bundled ${entry.kind} '${entry.contentKey}' has no authoritative normalized name.`,
    );
  }
  return deriveContentIdentityV1FromNormalizedName({
    kind: projection.kind,
    edition: projection.aggregate.rules_edition,
    normalizedName: normalizedName as NormalizedContentName,
    payload: projection.payload,
  });
}

function reconcileCurrentFingerprint(
  db: DatabaseContext,
  entry: BundledManifestEntryV1,
  identity: DerivedContentIdentityV1<ContentKind, unknown>,
): 'registered' | 'unchanged' | 'moved' {
  const current = db.oneRaw(
    `SELECT fingerprint_digest, canonical_json
     FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ?
       AND fingerprint_scheme = ? AND fingerprint_role = 'current'`,
    [entry.kind, entry.contentKey, CONTENT_FINGERPRINT_SCHEME_V1],
  );
  const currentDigest = current === null
    ? null
    : sqlString(current, 'fingerprint_digest');
  const currentCanonical = current === null
    ? null
    : sqlString(current, 'canonical_json');
  if (
    currentDigest !== null && currentCanonical !== null &&
    sha256(currentCanonical) !== currentDigest
  ) {
    throw new ContentIdentityCollision();
  }
  if (currentDigest === identity.digest) {
    if (currentCanonical !== identity.canonicalJson) {
      throw new ContentIdentityCollision();
    }
    return 'unchanged';
  }

  if (current !== null) {
    db.exec(
      `UPDATE catalog_content_fingerprints
       SET fingerprint_role = 'bundled-historical'
       WHERE content_kind = ? AND content_key = ?
         AND fingerprint_scheme = ? AND fingerprint_role = 'current'`,
      [entry.kind, entry.contentKey, CONTENT_FINGERPRINT_SCHEME_V1],
    );
  }

  const prior = db.oneRaw(
    `SELECT canonical_json
     FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ?
       AND fingerprint_scheme = ? AND fingerprint_digest = ?`,
    [
      entry.kind,
      entry.contentKey,
      CONTENT_FINGERPRINT_SCHEME_V1,
      identity.digest,
    ],
  );
  if (prior !== null) {
    const priorCanonical = sqlString(prior, 'canonical_json');
    if (
      sha256(priorCanonical) !== identity.digest ||
      priorCanonical !== identity.canonicalJson
    ) {
      throw new ContentIdentityCollision();
    }
    db.exec(
      `UPDATE catalog_content_fingerprints
       SET fingerprint_role = 'current'
       WHERE content_kind = ? AND content_key = ?
         AND fingerprint_scheme = ? AND fingerprint_digest = ?`,
      [
        entry.kind,
        entry.contentKey,
        CONTENT_FINGERPRINT_SCHEME_V1,
        identity.digest,
      ],
    );
  } else {
    registerContentFingerprint(db, {
      kind: entry.kind,
      contentKey: entry.contentKey,
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      digest: identity.digest as ContentFingerprintDigest,
      canonicalJson: identity.canonicalJson,
      role: 'current',
    });
  }
  return current === null ? 'registered' : 'moved';
}

/**
 * Promote and fingerprint every reconcilable seeder-owned aggregate. Each
 * aggregate is reconciled atomically: a known identity collision rolls back
 * only that aggregate, counts it as refused, and leaves its registry rows
 * untouched. Missing or incomplete roots are counted as orphaned and also
 * left untouched. Any other error aborts the whole pass. Stable root keys are
 * never updated. A changed live projection demotes the old bytes to
 * bundled-historical and installs the new projection as current.
 */
export function reconcileBundledContentRegistryV1(
  db: DatabaseContext,
): BundledContentRegistryResultV1 {
  return db.transaction(() => {
    const entries = allBundledCandidates(db);
    let projected = 0;
    let orphaned = 0;
    let refused = 0;
    let registered = 0;
    let unchanged = 0;
    let moved = 0;
    for (const entry of entries) {
      try {
        const result = db.transaction(() => {
          const root = inspectAggregateRoot(db, entry);
          if (root.outcome === 'orphaned') {
            return 'orphaned' as const;
          }
          ensureBundledRegistryRoot(db, entry, root.name);
          const identity = projectBundledIdentityV1(db, entry);
          return reconcileCurrentFingerprint(db, entry, identity);
        });
        if (result === 'orphaned') {
          orphaned += 1;
          continue;
        }
        projected += 1;
        if (result === 'registered') registered += 1;
        if (result === 'unchanged') unchanged += 1;
        if (result === 'moved') moved += 1;
      } catch (error) {
        if (!(error instanceof ContentIdentityCollision)) {
          throw error;
        }
        refused += 1;
      }
    }
    return Object.freeze({
      projected,
      orphaned,
      refused,
      registered,
      unchanged,
      moved,
    });
  });
}
