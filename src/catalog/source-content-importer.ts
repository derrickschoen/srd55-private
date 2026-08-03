import type { DatabaseContext } from '../db/database';
import type {
  AuthoringCharacterEffect,
} from '../authoring/effect-forms';
import type {
  AuthoringGrant,
  BackgroundContentAggregate,
  ContentFingerprintReference,
  SpeciesContentAggregate,
} from '../authoring/contracts';
import type { ContentKey } from '../domain/ids';
import { CONTENT_FINGERPRINT_SCHEME_V1, deriveContentIdentityV1 } from './content-identity';
import {
  ContentIdentityCollision,
  registerDerivedContentIdentity,
  resolveContentAggregate,
} from './content-registry';
import { effectColumns } from './equipment-importer';
import type {
  CatalogBackgroundRecord,
  CatalogClassRecord,
  CatalogFeatRecord,
  CatalogSpeciesRecord,
} from './source-catalog-records';
import {
  projectClassContentV1,
  projectFeatContentV1,
  projectStoredClassContentV1,
  projectStoredFeatContentV1,
  type FeatContentAggregateV1,
} from './source-content-projector-v1';
import {
  projectAuthoredContentAggregateV1,
  projectStoredAuthoredContentV1,
  storedAuthoredRegistryReferencesV1,
} from './stored-authored-content-projector-v1';

export interface SourceContentImportCounters {
  readonly classes_matched: number;
  readonly feats_created: number;
  readonly feats_matched: number;
  readonly species_created: number;
  readonly species_matched: number;
  readonly backgrounds_created: number;
  readonly backgrounds_matched: number;
}

export class SourceContentImportReviewRequired extends Error {
  constructor(kind: 'class' | 'feat' | 'species' | 'background', name: string) {
    super(`${kind} '${name}' matched reviewable catalog content; import requires an explicit match or clone decision.`);
    this.name = 'SourceContentImportReviewRequired';
  }
}

export class ExternalClassImportRefused extends Error {
  constructor(name: string) {
    super(`Class '${name}' is not installed. D133 makes classes bundled-only; catalog import may match a bundled class but cannot create a class.`);
    this.name = 'ExternalClassImportRefused';
  }
}

export class UnresolvedSourceContentReference extends Error {
  constructor(kind: string, digest: string) {
    super(`Catalog ${kind} fingerprint '${digest}' does not resolve uniquely.`);
    this.name = 'UnresolvedSourceContentReference';
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

function referenceKey(
  db: DatabaseContext,
  reference: ContentFingerprintReference,
): ContentKey {
  const rows = db.allRaw(
    `SELECT identity.content_key
     FROM catalog_content_fingerprints AS fingerprint
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = fingerprint.content_kind
      AND identity.content_key = fingerprint.content_key
     WHERE fingerprint.content_kind = ?
       AND fingerprint.fingerprint_scheme = ?
       AND fingerprint.fingerprint_digest = ?
       AND fingerprint.fingerprint_role IN ('current', 'compatible')
     ORDER BY identity.content_key`,
    [reference.kind, reference.scheme, reference.digest],
  ).map((row) => String(row.content_key) as ContentKey);
  if (rows.length !== 1) throw new UnresolvedSourceContentReference(reference.kind, reference.digest);
  return rows[0]!;
}

function isReference(value: unknown): value is ContentFingerprintReference {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    'kind' in value && 'scheme' in value && 'digest' in value &&
    typeof value.kind === 'string' &&
    value.scheme === CONTENT_FINGERPRINT_SCHEME_V1 &&
    typeof value.digest === 'string';
}

function storedGrant(db: DatabaseContext, grant: AuthoringGrant): Readonly<Record<string, unknown>> {
  if (grant.rule_key !== grant.rule_key.trim()) {
    throw new TypeError(`Grant rule key '${grant.rule_key}' contains surrounding whitespace.`);
  }
  const stored: Record<string, unknown> = { ...grant };
  const spell = stored.spell;
  if (spell !== undefined) {
    if (!isReference(spell) || spell.kind !== 'spell') {
      throw new TypeError(`Grant '${grant.rule_key}' spell reference is invalid.`);
    }
    stored.spell_version_key = referenceKey(db, spell);
    delete stored.spell;
  }
  const source = stored.source_definition;
  if (source !== undefined) {
    if (!isReference(source) || !['class', 'subclass', 'feat', 'species', 'background'].includes(source.kind)) {
      throw new TypeError(`Grant '${grant.rule_key}' source definition reference is invalid.`);
    }
    if (source.kind !== grant.source_type) {
      throw new TypeError(
        `Grant '${grant.rule_key}' source definition kind must match source_type.`,
      );
    }
    stored.source_definition_key = referenceKey(db, source);
    delete stored.source_definition;
  }
  return stored;
}

function storedGrants(db: DatabaseContext, grants: readonly AuthoringGrant[]): string {
  return JSON.stringify(grants.map((grant) => storedGrant(db, grant)));
}

function insertEffects(
  db: DatabaseContext,
  table: 'species_template_trait_effects' | 'background_template_effects',
  parentColumn: 'species_template_trait_id' | 'background_template_id',
  parentId: number,
  effects: readonly AuthoringCharacterEffect[],
): void {
  const now = timestamp();
  for (const [index, effect] of effects.entries()) {
    const fields = effectColumns(effect);
    db.exec(
      `INSERT INTO ${table} (
         ${parentColumn}, sort_order, effect_kind, damage_type,
         hit_points_flat, hit_points_per_level, speed_bonus_feet, ability,
         amount, maximum, base, ability_1, ability_2, allows_shield,
         weapon_scope, label, notes, created_at, updated_at
       ) VALUES (${Array.from({ length: 19 }, () => '?').join(', ')})`,
      [
        parentId, index + 1, effect.kind, fields.damage_type,
        fields.hit_points_flat, fields.hit_points_per_level,
        fields.speed_bonus_feet, fields.ability, fields.amount, fields.maximum,
        fields.base, fields.ability_1, fields.ability_2, fields.allows_shield,
        fields.weapon_scope, effect.label, effect.notes, now, now,
      ],
    );
  }
}

function idForReference(
  db: DatabaseContext,
  reference: ContentFingerprintReference<'weapon' | 'armor'>,
): number {
  const key = referenceKey(db, reference);
  const table = reference.kind === 'weapon' ? 'weapon_templates' : 'armor_templates';
  const id = db.scalar<number>(`SELECT id FROM ${table} WHERE content_key = ?`, [key]);
  if (id === null) throw new UnresolvedSourceContentReference(reference.kind, reference.digest);
  return id;
}

function assertStored(
  incomingCanonical: string,
  storedCanonical: string,
): void {
  if (incomingCanonical !== storedCanonical) throw new ContentIdentityCollision();
}

function insertFeat(db: DatabaseContext, aggregate: FeatContentAggregateV1, contentKey: ContentKey): void {
  const now = timestamp();
  db.exec(
    `INSERT INTO feat_definitions (
       content_key, name, rules_edition, category, min_level, ability_points,
       ability_increase_abilities, ability_increase_maximum, repeatable,
       prerequisites, grant_rules, notes, created_at, updated_at
     ) VALUES (${Array.from({ length: 14 }, () => '?').join(', ')})`,
    [
      contentKey, aggregate.name, aggregate.rules_edition, aggregate.category,
      aggregate.min_level, aggregate.ability_points,
      aggregate.ability_increase_abilities === null
        ? null
        : JSON.stringify(aggregate.ability_increase_abilities),
      aggregate.ability_increase_maximum, aggregate.repeatable,
      aggregate.prerequisites.length === 0 ? null : JSON.stringify(aggregate.prerequisites),
      storedGrants(db, aggregate.grants), aggregate.notes, now, now,
    ],
  );
}

function insertSpecies(db: DatabaseContext, aggregate: SpeciesContentAggregate, contentKey: ContentKey): void {
  const now = timestamp();
  db.exec(
    `INSERT INTO species_definitions
       (content_key, name, rules_edition, repeatable, grant_rules, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [contentKey, aggregate.name, aggregate.rules_edition, aggregate.repeatable, storedGrants(db, aggregate.grants), aggregate.reference_text, now, now],
  );
  const templateId = db.exec(
    `INSERT INTO species_templates
       (content_key, rules_edition, name, creature_type, size, alternate_size,
        base_speed_feet, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [contentKey, aggregate.rules_edition, aggregate.name, aggregate.creature_type, aggregate.primary_size, aggregate.alternate_size, aggregate.walking_speed_feet, now, now],
  ).lastInsertId;
  for (const [traitIndex, trait] of aggregate.traits.entries()) {
    const traitId = db.exec(
      `INSERT INTO species_template_traits
         (species_template_id, sort_order, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [templateId, traitIndex + 1, trait.name, trait.description, now, now],
    ).lastInsertId;
    insertEffects(db, 'species_template_trait_effects', 'species_template_trait_id', traitId, trait.effects);
  }
}

function insertBackground(db: DatabaseContext, aggregate: BackgroundContentAggregate, contentKey: ContentKey): void {
  const now = timestamp();
  const featKey = referenceKey(db, aggregate.default_origin_feat);
  const featName = db.scalar<string>('SELECT name FROM feat_definitions WHERE content_key = ?', [featKey]);
  if (featName === null) throw new UnresolvedSourceContentReference('feat', aggregate.default_origin_feat.digest);
  const featKeys = db.allRaw(
    `SELECT content_key FROM feat_definitions
     WHERE name = ? AND rules_edition = ? ORDER BY content_key`,
    [featName, aggregate.rules_edition],
  ).map((row) => String(row.content_key));
  if (featKeys.length !== 1 || featKeys[0] !== featKey) {
    // background_templates stores only the printed feat name. Until that seam
    // can carry a fingerprint, an ambiguous name cannot faithfully preserve
    // the document's selected feat.
    throw new UnresolvedSourceContentReference('feat', aggregate.default_origin_feat.digest);
  }
  db.exec(
    `INSERT INTO background_definitions
       (content_key, name, rules_edition, repeatable, grant_rules, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [contentKey, aggregate.name, aggregate.rules_edition, aggregate.repeatable, storedGrants(db, aggregate.grants), aggregate.reference_text, now, now],
  );
  const templateId = db.exec(
    `INSERT INTO background_templates (
       content_key, rules_edition, name, ability_score_1, ability_score_2,
       ability_score_3, feat_name, skill_proficiency_1, skill_proficiency_2,
       tool_proficiency, equipment_option_a, equipment_option_b, created_at, updated_at
     ) VALUES (${Array.from({ length: 14 }, () => '?').join(', ')})`,
    [
      contentKey, aggregate.rules_edition, aggregate.name,
      ...aggregate.suggested_abilities, featName, ...aggregate.skill_proficiencies,
      aggregate.tool_reference_text ?? '', aggregate.equipment_option_a_description,
      aggregate.equipment_option_b_description, now, now,
    ],
  ).lastInsertId;
  for (const [option, items] of [['a', aggregate.equipment_option_a], ['b', aggregate.equipment_option_b]] as const) {
    for (const [itemIndex, item] of items.entries()) {
      const weaponId = item.kind === 'weapon' ? idForReference(db, item.content) : null;
      const armorId = item.kind === 'armor' ? idForReference(db, item.content) : null;
      db.exec(
        `INSERT INTO background_equipment_items (
           background_template_id, option, sort_order, quantity, item_name,
           item_kind, weapon_template_id, armor_template_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [templateId, option, itemIndex + 1, item.quantity, item.printed_name, item.kind, weaponId, armorId, now, now],
      );
    }
  }
  insertEffects(db, 'background_template_effects', 'background_template_id', templateId, aggregate.effects);
}

function findStoredMatch(
  db: DatabaseContext,
  kind: 'class' | 'feat',
  canonicalJson: string,
): ContentKey | null {
  const table = kind === 'class' ? 'class_definitions' : 'feat_definitions';
  const references = storedAuthoredRegistryReferencesV1(db);
  const matches = db.allRaw(`SELECT content_key FROM ${table} ORDER BY content_key`)
    .map((row) => String(row.content_key) as ContentKey)
    .filter((contentKey) => {
      const projection = kind === 'class'
        ? projectStoredClassContentV1(db, contentKey, references)
        : projectStoredFeatContentV1(db, contentKey, references);
      const identity = deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      });
      return identity.canonicalJson === canonicalJson;
    });
  return matches.length === 1 ? matches[0]! : null;
}

function rootMetadataConflict(
  db: DatabaseContext,
  kind: 'class' | 'feat' | 'species' | 'background',
  contentKey: ContentKey,
  name: string,
  edition: string,
): boolean {
  const table = kind === 'class'
    ? 'class_definitions'
    : kind === 'feat'
      ? 'feat_definitions'
      : kind === 'species'
        ? 'species_definitions'
        : 'background_definitions';
  const row = db.oneRaw(
    `SELECT name, rules_edition FROM ${table} WHERE content_key = ?`,
    [contentKey],
  );
  return row !== null && (row.name !== name || row.rules_edition !== edition);
}

function importClass(db: DatabaseContext, record: CatalogClassRecord): void {
  const aggregate = record.aggregate;
  const payload = projectClassContentV1(aggregate);
  const identity = deriveContentIdentityV1({ kind: 'class', edition: aggregate.rules_edition, name: aggregate.name, payload });
  const resolved = resolveContentAggregate(db, {
    kind: 'class',
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload,
    metadataConflict: rootMetadataConflict(
      db, 'class', identity.derivedKey, aggregate.name, aggregate.rules_edition,
    ),
  });
  if (resolved.resolution.kind === 'exact' && !resolved.resolution.reviewRequired) {
    const stored = projectStoredClassContentV1(
      db,
      resolved.resolution.contentKey,
      storedAuthoredRegistryReferencesV1(db),
    );
    const storedIdentity = deriveContentIdentityV1({
      kind: stored.kind,
      edition: stored.aggregate.rules_edition,
      name: stored.aggregate.name,
      payload: stored.payload,
    });
    assertStored(identity.canonicalJson, storedIdentity.canonicalJson);
    return;
  }
  if (resolved.resolution.kind !== 'missing') throw new SourceContentImportReviewRequired('class', aggregate.name);
  if (findStoredMatch(db, 'class', identity.canonicalJson) !== null) return;
  throw new ExternalClassImportRefused(aggregate.name);
}

function importCreatable(
  db: DatabaseContext,
  record: CatalogFeatRecord | CatalogSpeciesRecord | CatalogBackgroundRecord,
): boolean {
  const aggregate = record.aggregate;
  const payload = aggregate.kind === 'feat'
    ? projectFeatContentV1(aggregate)
    : projectAuthoredContentAggregateV1(aggregate).payload;
  const identity = deriveContentIdentityV1({
    kind: aggregate.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload,
  });
  const resolved = resolveContentAggregate(db, {
    kind: aggregate.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload,
    metadataConflict: rootMetadataConflict(
      db,
      aggregate.kind,
      identity.derivedKey,
      aggregate.name,
      aggregate.rules_edition,
    ),
  });
  if (resolved.resolution.kind === 'exact') {
    if (resolved.resolution.matchClass !== 'trivial-self-match') {
      throw new SourceContentImportReviewRequired(aggregate.kind, aggregate.name);
    }
    const references = storedAuthoredRegistryReferencesV1(db);
    const stored = aggregate.kind === 'feat'
      ? projectStoredFeatContentV1(db, resolved.resolution.contentKey, references)
      : projectStoredAuthoredContentV1(db, { kind: aggregate.kind, contentKey: resolved.resolution.contentKey, references });
    const storedIdentity = deriveContentIdentityV1({ kind: stored.kind, edition: stored.aggregate.rules_edition, name: stored.aggregate.name, payload: stored.payload });
    assertStored(resolved.identity.canonicalJson, storedIdentity.canonicalJson);
    return false;
  }
  if (resolved.resolution.kind !== 'missing') throw new SourceContentImportReviewRequired(aggregate.kind, aggregate.name);
  const registered = registerDerivedContentIdentity(db, { kind: aggregate.kind, edition: aggregate.rules_edition, name: aggregate.name, payload });
  switch (aggregate.kind) {
    case 'feat': insertFeat(db, aggregate, registered.derivedKey); break;
    case 'species': insertSpecies(db, aggregate, registered.derivedKey); break;
    case 'background': insertBackground(db, aggregate, registered.derivedKey); break;
  }
  const references = storedAuthoredRegistryReferencesV1(db);
  const stored = aggregate.kind === 'feat'
    ? projectStoredFeatContentV1(db, registered.derivedKey, references)
    : projectStoredAuthoredContentV1(db, {
        kind: aggregate.kind,
        contentKey: registered.derivedKey,
        references,
      });
  const storedIdentity = deriveContentIdentityV1({
    kind: stored.kind,
    edition: stored.aggregate.rules_edition,
    name: stored.aggregate.name,
    payload: stored.payload,
  });
  assertStored(registered.canonicalJson, storedIdentity.canonicalJson);
  return true;
}

export function importSourceContentRecords(
  db: DatabaseContext,
  records: {
    readonly classes: readonly CatalogClassRecord[];
    readonly feats: readonly CatalogFeatRecord[];
    readonly species: readonly CatalogSpeciesRecord[];
    readonly backgrounds: readonly CatalogBackgroundRecord[];
  },
): SourceContentImportCounters {
  const counters = {
    classes_matched: 0,
    feats_created: 0,
    feats_matched: 0,
    species_created: 0,
    species_matched: 0,
    backgrounds_created: 0,
    backgrounds_matched: 0,
  };
  for (const record of records.classes) {
    importClass(db, record);
    counters.classes_matched += 1;
  }
  for (const record of records.feats) {
    counters[importCreatable(db, record) ? 'feats_created' : 'feats_matched'] += 1;
  }
  for (const record of records.species) {
    counters[importCreatable(db, record) ? 'species_created' : 'species_matched'] += 1;
  }
  for (const record of records.backgrounds) {
    counters[importCreatable(db, record) ? 'backgrounds_created' : 'backgrounds_matched'] += 1;
  }
  return counters;
}
