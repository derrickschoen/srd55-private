import { sqlString, type SqlRow } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { sha256 } from '../crypto/sha256';
import { isEnumValue } from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import {
  canonicalContentIdentityJson,
  contentKinds,
  type ContentKind,
} from './content-identity';
import {
  EXPECTED_BUNDLED_AGGREGATE_DIGESTS_V1,
  EXPECTED_BUNDLED_CONTENT_DIGEST_V1,
} from './bundled-content-digest-v1.expected';

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

interface DigestSliceV1 {
  readonly kind: ContentKind;
  readonly table: string;
  readonly sql: string;
  readonly omit?: readonly string[];
  readonly nameColumn?: string;
}

interface MutableAggregateV1 {
  readonly kind: ContentKind;
  readonly contentKey: ContentKey;
  name: string | undefined;
  readonly tables: Map<string, SqlRow[]>;
}

export interface CanonicalBundledAggregateV1 {
  readonly kind: ContentKind;
  readonly contentKey: ContentKey;
  readonly tables: readonly {
    readonly table: string;
    readonly rows: readonly SqlRow[];
  }[];
}

export interface BundledContentDigestPassV1 {
  readonly digest: string;
  readonly aggregates: readonly CanonicalBundledAggregateV1[];
  readonly names: ReadonlyMap<string, string>;
}

export interface BundledContentDigestMismatchV1 {
  readonly catalog_layer: 'bundled';
  readonly kind: ContentKind;
  readonly contentKey: ContentKey;
  readonly name: string;
  readonly reason: 'changed' | 'missing' | 'unexpected';
}

const BUNDLED_IDENTITY_FILTER =
  "registry.key_kind = 'bundled-stable' AND registry.catalog_layer = 'bundled'";

/**
 * A digest cannot match the build when it does not even have the build's
 * number of bundled aggregates. This one-row gate keeps fresh, quarantined,
 * and permanently name-blocked databases out of the canonicalization pass;
 * equal counts still take the digest so substitutions and byte drift remain
 * tamper-evident on every plausible healthy boot.
 */
export function bundledContentCouldMatchBuildV1(
  db: DatabaseContext,
): boolean {
  const aggregateCount = db.scalar<number>(
    `SELECT count(*) FROM catalog_content_identities AS registry
     WHERE ${BUNDLED_IDENTITY_FILTER}`,
  );
  return aggregateCount === EXPECTED_BUNDLED_AGGREGATE_DIGESTS_V1.length;
}

function owned(
  kind: ContentKind,
  table: string,
  rootTable: string,
  ownerColumn: string,
  options: {
    readonly omit?: readonly string[];
    readonly extraSelect?: string;
    readonly extraJoin?: string;
    readonly nameColumn?: string;
  } = {},
): DigestSliceV1 {
  const extraSelect = options.extraSelect === undefined
    ? ''
    : `, ${options.extraSelect}`;
  const extraJoin = options.extraJoin ?? '';
  return Object.freeze({
    kind,
    table,
    sql:
      `SELECT root.content_key AS digest_owner_key, child.*${extraSelect} ` +
      `FROM ${table} AS child ` +
      `JOIN ${rootTable} AS root ON root.id = child.${ownerColumn} ` +
      `JOIN catalog_content_identities AS registry ` +
      `ON registry.content_kind = '${kind}' ` +
      `AND registry.content_key = root.content_key ${extraJoin} ` +
      `WHERE ${BUNDLED_IDENTITY_FILTER}`,
    omit: Object.freeze([ownerColumn, ...(options.omit ?? [])]),
    ...(options.nameColumn === undefined
      ? {}
      : { nameColumn: options.nameColumn }),
  });
}

function root(
  kind: ContentKind,
  table: string,
  options: {
    readonly omit?: readonly string[];
    readonly extraSelect?: string;
    readonly extraJoin?: string;
    readonly nameColumn?: string;
  } = {},
): DigestSliceV1 {
  const extraSelect = options.extraSelect === undefined
    ? ''
    : `, ${options.extraSelect}`;
  const extraJoin = options.extraJoin ?? '';
  return Object.freeze({
    kind,
    table,
    sql:
      `SELECT child.content_key AS digest_owner_key, child.*${extraSelect} ` +
      `FROM ${table} AS child ` +
      `JOIN catalog_content_identities AS registry ` +
      `ON registry.content_kind = '${kind}' ` +
      `AND registry.content_key = child.content_key ${extraJoin} ` +
      `WHERE ${BUNDLED_IDENTITY_FILTER}`,
    omit: Object.freeze(options.omit ?? []),
    ...(options.nameColumn === undefined
      ? {}
      : { nameColumn: options.nameColumn }),
  });
}

/**
 * The complete persisted-byte boundary of the v1 digest. Every descriptor is
 * a batch query: one read per table, never one read per aggregate. Root and
 * child rows retain every column except storage-local ids/timestamps. Numeric
 * foreign keys are replaced by the stable `digest_ref_*` values selected here.
 */
const DIGEST_SLICES_V1: readonly DigestSliceV1[] = Object.freeze([
  root('weapon', 'weapon_templates', { nameColumn: 'name' }),
  root('armor', 'armor_templates', { nameColumn: 'name' }),
  root('item', 'item_definitions', { nameColumn: 'name' }),
  owned('item', 'item_definition_effects', 'item_definitions', 'item_definition_id'),

  root('spell', 'spell_versions', {
    omit: ['spell_identity_id'],
    extraSelect: 'identity.content_key AS digest_ref_spell_identity_key',
    extraJoin: 'JOIN spell_identities AS identity ON identity.id = child.spell_identity_id',
    nameColumn: 'display_name',
  }),
  owned('spell', 'spell_list_memberships', 'spell_versions', 'spell_version_id'),
  owned('spell', 'spell_version_tags', 'spell_versions', 'spell_version_id'),
  owned('spell', 'spell_version_attack_modes', 'spell_versions', 'spell_version_id'),
  owned('spell', 'spell_version_save_abilities', 'spell_versions', 'spell_version_id'),
  owned('spell', 'spell_version_upcast_levels', 'spell_versions', 'spell_version_id'),
  owned('spell', 'spell_version_cantrip_upgrade_levels', 'spell_versions', 'spell_version_id'),

  root('class', 'class_definitions', { nameColumn: 'name' }),
  owned('class', 'class_progressions', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_sheet_traits', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_saving_throw_proficiencies', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_skill_options', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_armor_training', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_weapon_proficiencies', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_extra_attack_grants', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_martial_arts_dice', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_weapon_mastery_grants', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_weapon_mastery_counts', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_resources', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_resource_formulas', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_feature_effects', 'class_definitions', 'class_definition_id'),
  owned('class', 'class_equipment_items', 'class_definitions', 'class_definition_id', {
    omit: ['weapon_template_id', 'armor_template_id'],
    extraSelect:
      'weapon.content_key AS digest_ref_weapon_key, ' +
      'armor.content_key AS digest_ref_armor_key',
    extraJoin:
      'LEFT JOIN weapon_templates AS weapon ON weapon.id = child.weapon_template_id ' +
      'LEFT JOIN armor_templates AS armor ON armor.id = child.armor_template_id',
  }),
  owned('class', 'named_features', 'class_definitions', 'class_definition_id'),
  Object.freeze({
    kind: 'class',
    table: 'named_feature_effects',
    sql:
      'SELECT root.content_key AS digest_owner_key, child.*, ' +
      'feature.class_level AS digest_parent_class_level, ' +
      'feature.name AS digest_parent_name ' +
      'FROM named_feature_effects AS child ' +
      'JOIN named_features AS feature ON feature.id = child.named_feature_id ' +
      'JOIN class_definitions AS root ON root.id = feature.class_definition_id ' +
      "JOIN catalog_content_identities AS registry ON registry.content_kind = 'class' " +
      `AND registry.content_key = root.content_key WHERE ${BUNDLED_IDENTITY_FILTER}`,
    omit: Object.freeze(['named_feature_id']),
  }),

  root('feat', 'feat_definitions', { nameColumn: 'name' }),

  root('subclass', 'subclass_definitions', {
    omit: ['class_definition_id'],
    extraSelect: 'parent.content_key AS digest_ref_parent_class_key',
    extraJoin: 'JOIN class_definitions AS parent ON parent.id = child.class_definition_id',
    nameColumn: 'name',
  }),
  owned('subclass', 'subclass_progressions', 'subclass_definitions', 'subclass_definition_id'),
  owned('subclass', 'subclass_features', 'subclass_definitions', 'subclass_definition_id'),
  Object.freeze({
    kind: 'subclass',
    table: 'subclass_feature_effects',
    sql:
      'SELECT root.content_key AS digest_owner_key, child.*, ' +
      'feature.class_level AS digest_parent_class_level, ' +
      'feature.sort_order AS digest_parent_sort_order, ' +
      'feature.name AS digest_parent_name ' +
      'FROM subclass_feature_effects AS child ' +
      'JOIN subclass_features AS feature ON feature.id = child.subclass_feature_id ' +
      'JOIN subclass_definitions AS root ON root.id = feature.subclass_definition_id ' +
      "JOIN catalog_content_identities AS registry ON registry.content_kind = 'subclass' " +
      `AND registry.content_key = root.content_key WHERE ${BUNDLED_IDENTITY_FILTER}`,
    omit: Object.freeze(['subclass_feature_id']),
  }),

  root('species', 'species_definitions', { nameColumn: 'name' }),
  root('species', 'species_templates', { nameColumn: 'name' }),
  owned('species', 'species_template_traits', 'species_templates', 'species_template_id'),
  Object.freeze({
    kind: 'species',
    table: 'species_template_trait_effects',
    sql:
      'SELECT root.content_key AS digest_owner_key, child.*, ' +
      'trait.sort_order AS digest_parent_sort_order, ' +
      'trait.name AS digest_parent_name ' +
      'FROM species_template_trait_effects AS child ' +
      'JOIN species_template_traits AS trait ON trait.id = child.species_template_trait_id ' +
      'JOIN species_templates AS root ON root.id = trait.species_template_id ' +
      "JOIN catalog_content_identities AS registry ON registry.content_kind = 'species' " +
      `AND registry.content_key = root.content_key WHERE ${BUNDLED_IDENTITY_FILTER}`,
    omit: Object.freeze(['species_template_trait_id']),
  }),

  root('background', 'background_definitions', { nameColumn: 'name' }),
  root('background', 'background_templates', {
    omit: ['default_origin_feat_content_key'],
    extraSelect:
      'child.default_origin_feat_content_key AS digest_ref_default_origin_feat_key',
    nameColumn: 'name',
  }),
  owned('background', 'background_template_effects', 'background_templates', 'background_template_id'),
  owned('background', 'background_equipment_items', 'background_templates', 'background_template_id', {
    omit: ['weapon_template_id', 'armor_template_id'],
    extraSelect:
      'weapon.content_key AS digest_ref_weapon_key, ' +
      'armor.content_key AS digest_ref_armor_key',
    extraJoin:
      'LEFT JOIN weapon_templates AS weapon ON weapon.id = child.weapon_template_id ' +
      'LEFT JOIN armor_templates AS armor ON armor.id = child.armor_template_id',
  }),
]);

function compareCanonical(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function aggregateLocator(kind: ContentKind, contentKey: string): string {
  return `${kind}\u0000${contentKey}`;
}

function canonicalRow(row: SqlRow, omitted: ReadonlySet<string>): SqlRow {
  const normalized: Record<string, SqlRow[string]> = {};
  for (const [column, value] of Object.entries(row)) {
    if (
      column === 'digest_owner_key' || column === 'digest_owner_kind' ||
      column === 'id' || column === 'created_at' || column === 'updated_at' ||
      omitted.has(column)
    ) {
      continue;
    }
    if (typeof value === 'bigint' || value instanceof Uint8Array) {
      throw new TypeError(
        `Bundled digest cannot canonicalize ${column}'s stored value.`,
      );
    }
    normalized[column] = value;
  }
  return Object.freeze(normalized);
}

function pushTableRow(
  aggregate: MutableAggregateV1,
  table: string,
  row: SqlRow,
): void {
  const rows = aggregate.tables.get(table);
  if (rows === undefined) {
    aggregate.tables.set(table, [row]);
  } else {
    rows.push(row);
  }
}

function bundledAggregates(db: DatabaseContext): readonly MutableAggregateV1[] {
  const aggregates = new Map<string, MutableAggregateV1>();
  const identities = db.allRaw(
    `SELECT * FROM catalog_content_identities
     WHERE key_kind = 'bundled-stable' AND catalog_layer = 'bundled'`,
  );
  for (const identity of identities) {
    const rawKind = sqlString(identity, 'content_kind');
    if (!isEnumValue(contentKinds, rawKind)) {
      throw new TypeError(`Bundled digest found unknown kind '${rawKind}'.`);
    }
    const contentKey = sqlString(identity, 'content_key') as ContentKey;
    const aggregate: MutableAggregateV1 = {
      kind: rawKind,
      contentKey,
      name: undefined,
      tables: new Map(),
    };
    pushTableRow(
      aggregate,
      'catalog_content_identities',
      canonicalRow(identity, new Set()),
    );
    aggregates.set(aggregateLocator(rawKind, contentKey), aggregate);
  }

  for (const fingerprint of db.allRaw(
    `SELECT fingerprint.*
     FROM catalog_content_fingerprints AS fingerprint
     JOIN catalog_content_identities AS registry
       ON registry.content_kind = fingerprint.content_kind
      AND registry.content_key = fingerprint.content_key
     WHERE registry.key_kind = 'bundled-stable'
       AND registry.catalog_layer = 'bundled'
       AND fingerprint.fingerprint_scheme = 'content-v1'
       AND fingerprint.fingerprint_role = 'current'`,
  )) {
    const rawKind = sqlString(fingerprint, 'content_kind');
    if (!isEnumValue(contentKinds, rawKind)) {
      throw new TypeError(`Bundled digest found unknown kind '${rawKind}'.`);
    }
    const contentKey = sqlString(fingerprint, 'content_key');
    const aggregate = aggregates.get(aggregateLocator(rawKind, contentKey));
    if (aggregate === undefined) {
      throw new TypeError(
        `Bundled digest fingerprint ${rawKind} '${contentKey}' has no identity.`,
      );
    }
    pushTableRow(
      aggregate,
      'catalog_content_fingerprints',
      canonicalRow(fingerprint, new Set()),
    );
  }

  for (const slice of DIGEST_SLICES_V1) {
    const omitted = new Set(slice.omit ?? []);
    for (const row of db.allRaw(slice.sql)) {
      const contentKey = sqlString(row, 'digest_owner_key');
      const aggregate = aggregates.get(
        aggregateLocator(slice.kind, contentKey),
      );
      if (aggregate === undefined) {
        throw new TypeError(
          `Bundled digest ${slice.table} row has no ${slice.kind} identity ` +
            `for '${contentKey}'.`,
        );
      }
      if (slice.nameColumn !== undefined) {
        const name = sqlString(row, slice.nameColumn);
        if (aggregate.name !== undefined && aggregate.name !== name) {
          throw new TypeError(
            `Bundled digest ${slice.kind} '${contentKey}' has inconsistent names.`,
          );
        }
        aggregate.name = name;
      }
      pushTableRow(
        aggregate,
        slice.table,
        canonicalRow(row, omitted),
      );
    }
  }
  return Object.freeze([...aggregates.values()]);
}

/**
 * Canonicalization rule (D229): tables sort by literal table name; each
 * table's normalized rows sort by their canonical JSON bytes; aggregates sort
 * by the closed kind order above and then by literal UTF-16 content-key bytes.
 * Object members use content-v1's Unicode-code-point key ordering. No locale,
 * insertion order, row id, or unordered SQL iteration enters the digest.
 */
export function bundledContentDigestPassV1(
  db: DatabaseContext,
): BundledContentDigestPassV1 {
  const mutable = [...bundledAggregates(db)].sort((left, right) =>
    KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
    compareCanonical(left.contentKey, right.contentKey),
  );
  const names = new Map<string, string>();
  const aggregates = mutable.map((aggregate): CanonicalBundledAggregateV1 => {
    names.set(
      aggregateLocator(aggregate.kind, aggregate.contentKey),
      aggregate.name ?? aggregate.contentKey,
    );
    const tables = [...aggregate.tables.entries()]
      .sort(([left], [right]) => compareCanonical(left, right))
      .map(([table, rows]) => ({
        table,
        rows: Object.freeze(rows
          .map((row) => ({
            row,
            canonical: canonicalContentIdentityJson(row),
          }))
          .sort((left, right) => compareCanonical(left.canonical, right.canonical))
          .map(({ row }) => row)),
      }));
    return Object.freeze({
      kind: aggregate.kind,
      contentKey: aggregate.contentKey,
      tables: Object.freeze(tables),
    });
  });
  const frozenAggregates = Object.freeze(aggregates);
  return Object.freeze({
    digest: sha256(canonicalContentIdentityJson(frozenAggregates)),
    aggregates: frozenAggregates,
    names,
  });
}

export function bundledContentDigestMatchesBuildV1(
  pass: BundledContentDigestPassV1,
): boolean {
  return pass.digest === EXPECTED_BUNDLED_CONTENT_DIGEST_V1;
}

export function bundledContentDigestMismatchesV1(
  pass: BundledContentDigestPassV1,
): readonly BundledContentDigestMismatchV1[] {
  const expected = new Map(
    EXPECTED_BUNDLED_AGGREGATE_DIGESTS_V1.map((entry) => [
      aggregateLocator(entry.kind, entry.contentKey),
      entry,
    ]),
  );
  const mismatches: BundledContentDigestMismatchV1[] = [];
  for (const aggregate of pass.aggregates) {
    const locator = aggregateLocator(aggregate.kind, aggregate.contentKey);
    const pinned = expected.get(locator);
    const digest = sha256(canonicalContentIdentityJson(aggregate));
    if (pinned === undefined) {
      mismatches.push({
        catalog_layer: 'bundled',
        kind: aggregate.kind,
        contentKey: aggregate.contentKey,
        name: pass.names.get(locator) ?? aggregate.contentKey,
        reason: 'unexpected',
      });
      continue;
    }
    expected.delete(locator);
    if (digest !== pinned.digest) {
      mismatches.push({
        catalog_layer: 'bundled',
        kind: aggregate.kind,
        contentKey: aggregate.contentKey,
        name: pinned.name,
        reason: 'changed',
      });
    }
  }
  for (const pinned of expected.values()) {
    if (!isEnumValue(contentKinds, pinned.kind)) {
      throw new TypeError(`Pinned bundled digest has unknown kind '${pinned.kind}'.`);
    }
    mismatches.push({
      catalog_layer: 'bundled',
      kind: pinned.kind,
      contentKey: pinned.contentKey as ContentKey,
      name: pinned.name,
      reason: 'missing',
    });
  }
  return Object.freeze(mismatches.sort((left, right) =>
    KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
    compareCanonical(left.contentKey, right.contentKey),
  ));
}
