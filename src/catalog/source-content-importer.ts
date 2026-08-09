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
import {
  CONTENT_FINGERPRINT_SCHEME_V2,
  isContentFingerprintScheme,
} from './content-identity';
import { assertedExternalContentKey } from './catalog-key';
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
  type FeatContentAggregateV1,
} from './source-content-projector-v1';
import {
  projectAuthoredContentAggregateV1,
  projectSpeciesContentAggregateV2,
} from './stored-authored-content-projector-v1';
import {
  contentFingerprintReferenceKey,
  remapProjectionFingerprintReferences,
  type ContentImportConflictDetail,
  type ContentImportDependencyTarget,
  type ContentImportNode,
  type ContentImportProjection,
} from './content-adoption';
import { projectStoredContentV1 } from './stored-content-projector-v1';
import { projectStoredContentV2 } from './stored-content-projector-v2';
import type {
  PortableConfiguredChoiceRuleV2,
  PortableSourceRuleV2,
  SpeciesProjectorAggregateV2,
} from './authored-content-projector-contract-v2';

export interface SourceContentImportCounters {
  readonly classes_matched: number;
  readonly feats_created: number;
  readonly feats_matched: number;
  readonly species_created: number;
  readonly species_matched: number;
  readonly backgrounds_created: number;
  readonly backgrounds_matched: number;
}

export type MutableSourceContentImportCounters = {
  -readonly [K in keyof SourceContentImportCounters]: SourceContentImportCounters[K];
};

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
    `SELECT DISTINCT identity.content_key
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
  if (rows.length === 1) return rows[0]!;
  throw new UnresolvedSourceContentReference(reference.kind, reference.digest);
}

function isReference(value: unknown): value is ContentFingerprintReference {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    'kind' in value && 'scheme' in value && 'digest' in value &&
    typeof value.kind === 'string' &&
    isContentFingerprintScheme(value.scheme) &&
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

/** Resolve portable fingerprint edges back to target-local stored keys. */
export function portableStoredGrantRules(
  db: DatabaseContext,
  grants: readonly AuthoringGrant[],
): string {
  return storedGrants(db, grants);
}

function storedConfiguredChoiceV2(
  db: DatabaseContext,
  rule: PortableConfiguredChoiceRuleV2,
): Readonly<Record<string, unknown>> {
  return {
    ...rule,
    options: rule.options.map((option) => ({
      ...option,
      grants: option.grants.map((grant) => storedGrant(db, grant)),
      replaceable_spell_choice: option.replaceable_spell_choice === null
        ? null
        : {
            config_key: option.replaceable_spell_choice.config_key,
            label: option.replaceable_spell_choice.label,
            required: true,
            spell_list: option.replaceable_spell_choice.spell_list,
            spell_level: 0,
            initial_spell_version_key: referenceKey(
              db,
              option.replaceable_spell_choice.initial_spell,
            ),
            display_on_sheet: true,
          },
    })),
  };
}

export function portableStoredSourceRulesV2(
  db: DatabaseContext,
  rules: readonly PortableSourceRuleV2[],
): string {
  return JSON.stringify(rules.map((rule) =>
    rule.kind === 'configured_choice'
      ? storedConfiguredChoiceV2(db, rule)
      : storedGrant(db, rule)));
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

function insertSpeciesV2(
  db: DatabaseContext,
  aggregate: SpeciesProjectorAggregateV2,
  contentKey: ContentKey,
): void {
  if ('definition_state' in aggregate) {
    throw new TypeError('A template-only species cannot be installed as a definition.');
  }
  const now = timestamp();
  db.exec(
    `INSERT INTO species_definitions
       (content_key, name, rules_edition, repeatable, grant_rules, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contentKey,
      aggregate.name,
      aggregate.rules_edition,
      aggregate.repeatable,
      portableStoredSourceRulesV2(db, aggregate.source_rules ?? []),
      aggregate.reference_text,
      now,
      now,
    ],
  );
  const templateId = db.exec(
    `INSERT INTO species_templates
       (content_key, rules_edition, name, creature_type, size, alternate_size,
        base_speed_feet, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [contentKey, aggregate.rules_edition, aggregate.name, aggregate.creature_type,
      aggregate.primary_size, aggregate.alternate_size,
      aggregate.walking_speed_feet, now, now],
  ).lastInsertId;
  for (const [traitIndex, trait] of aggregate.traits.entries()) {
    const traitId = db.exec(
      `INSERT INTO species_template_traits
         (species_template_id, sort_order, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [templateId, traitIndex + 1, trait.name, trait.description, now, now],
    ).lastInsertId;
    const effects = trait.effects.map((effect): AuthoringCharacterEffect => {
      if (effect.kind === 'damage_resistance' && effect.damage_type === null) {
        throw new TypeError('Portable v2 species resistance effects must name a damage type.');
      }
      return effect as AuthoringCharacterEffect;
    });
    insertEffects(
      db,
      'species_template_trait_effects',
      'species_template_trait_id',
      traitId,
      effects,
    );
  }
}

function insertBackground(db: DatabaseContext, aggregate: BackgroundContentAggregate, contentKey: ContentKey): void {
  const now = timestamp();
  const featKey = referenceKey(db, aggregate.default_origin_feat);
  if (featKey !== aggregate.default_origin_feat_content_key) {
    throw new UnresolvedSourceContentReference('feat', aggregate.default_origin_feat.digest);
  }
  const featCategory = db.scalar<string>(
    'SELECT category FROM feat_definitions WHERE content_key = ?',
    [featKey],
  );
  if (featCategory !== 'origin') {
    throw new UnresolvedSourceContentReference('Origin feat', aggregate.default_origin_feat.digest);
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
       ability_score_3, feat_name, default_origin_feat_content_key,
       skill_proficiency_1, skill_proficiency_2,
       tool_proficiency, equipment_option_a, equipment_option_b, created_at, updated_at
     ) VALUES (${Array.from({ length: 15 }, () => '?').join(', ')})`,
    [
      contentKey, aggregate.rules_edition, aggregate.name,
      ...aggregate.suggested_abilities, aggregate.default_origin_feat_display_name, featKey,
      ...aggregate.skill_proficiencies,
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

function backgroundDisplayConflict(
  db: DatabaseContext,
  contentKey: ContentKey,
  incomingDisplayName: string,
): ContentImportConflictDetail | null {
  const localDisplayName = db.scalar<string>(
    `SELECT feat_name FROM background_templates WHERE content_key = ?`,
    [contentKey],
  );
  if (localDisplayName === null || localDisplayName === incomingDisplayName) {
    return null;
  }
  return Object.freeze({
    field: 'Default Origin feat display name',
    incomingValue: incomingDisplayName,
    localValue: localDisplayName,
  });
}

export type SourceAggregate =
  | CatalogClassRecord['aggregate']
  | CatalogFeatRecord['aggregate']
  | CatalogSpeciesRecord['aggregate']
  | CatalogBackgroundRecord['aggregate'];

function sourcePayload(aggregate: SourceAggregate): unknown {
  switch (aggregate.kind) {
    case 'class': return projectClassContentV1(aggregate);
    case 'feat': return projectFeatContentV1(aggregate);
    case 'species':
    case 'background': return projectAuthoredContentAggregateV1(aggregate).payload;
  }
}

function emptySourceCounters(): MutableSourceContentImportCounters {
  return {
    classes_matched: 0,
    feats_created: 0,
    feats_matched: 0,
    species_created: 0,
    species_matched: 0,
    backgrounds_created: 0,
    backgrounds_matched: 0,
  };
}

/** One complete semantic source aggregate entering through the CI-4a seam. */
export function portableSourceContentImportNode(
  db: DatabaseContext,
  aggregate: SourceAggregate,
  assertedKey: ContentKey,
  declaredAlias?: ContentKey,
): ContentImportNode {
  const counters = emptySourceCounters();
  const build = (
    name: string,
    nextKey: ContentKey,
    dependencies: ReadonlyMap<string, ContentImportDependencyTarget>,
  ): ContentImportProjection => {
    const remappedReferences = remapProjectionFingerprintReferences(
      { ...aggregate, name },
      dependencies,
    ) as SourceAggregate;
    const remapped = aggregate.kind === 'background'
      ? {
          ...remappedReferences,
          default_origin_feat_content_key:
            dependencies.get(contentFingerprintReferenceKey(
              aggregate.default_origin_feat,
            ))?.contentKey ?? aggregate.default_origin_feat_content_key,
        }
      : remappedReferences;
    const projection = sourceProjectionForDatabase(
      db,
      remapped,
      nextKey,
      counters,
    );
    return declaredAlias === undefined
      ? projection
      : { ...projection, declaredAlias };
  };
  return Object.freeze({
    id: `portable:${aggregate.kind}:${assertedKey}`,
    projection: build(aggregate.name, assertedKey, new Map()),
    reproject: (input: Parameters<NonNullable<ContentImportNode['reproject']>>[0]) =>
      build(input.name, input.assertedKey, input.dependencies),
  });
}

export function portableSpeciesContentImportNodeV2(
  db: DatabaseContext,
  aggregate: SpeciesProjectorAggregateV2,
  assertedKey: ContentKey,
): ContentImportNode<'species'> {
  const counters = emptySourceCounters();
  const build = (
    name: string,
    nextKey: ContentKey,
    dependencies: ReadonlyMap<string, ContentImportDependencyTarget>,
  ): ContentImportProjection<'species'> => {
    const remapped = remapProjectionFingerprintReferences(
      { ...aggregate, name },
      dependencies,
    ) as SpeciesProjectorAggregateV2;
    const projected = projectSpeciesContentAggregateV2(remapped);
    return {
      kind: 'species',
      fingerprintScheme: CONTENT_FINGERPRINT_SCHEME_V2,
      edition: remapped.rules_edition,
      name: remapped.name,
      assertedKey: nextKey,
      payload: projected.payload,
      metadataConflict: rootMetadataConflict(
        db,
        'species',
        nextKey,
        remapped.name,
        remapped.rules_edition,
      ),
      projectStored: (database, contentKey) => {
        const stored = projectStoredContentV2(database, 'species', contentKey);
        return { ...stored, kind: 'species' as const };
      },
      install: (database, contentKey, _projection, phase) => {
        if (
          database.scalar<number>(
            'SELECT 1 FROM species_definitions WHERE content_key = ?',
            [contentKey],
          ) !== 1
        ) {
          insertSpeciesV2(database, remapped, contentKey);
          if (phase === 'commit') counters.species_created += 1;
        }
      },
    };
  };
  return Object.freeze({
    id: `portable:species:${assertedKey}`,
    projection: build(aggregate.name, assertedKey, new Map()),
    reproject: (
      input: Parameters<NonNullable<ContentImportNode['reproject']>>[0],
    ) => build(input.name, input.assertedKey, input.dependencies),
  });
}

function sourceProjection(
  aggregate: SourceAggregate,
  assertedKey: ContentKey,
  counters: MutableSourceContentImportCounters,
): ContentImportProjection {
  return {
    kind: aggregate.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    assertedKey,
    payload: sourcePayload(aggregate),
    projectStored: (database, contentKey) =>
      projectStoredContentV1(database, aggregate.kind, contentKey),
    install: (database, contentKey, _projection, phase) => {
      const table = aggregate.kind === 'class'
        ? 'class_definitions'
        : aggregate.kind === 'feat'
          ? 'feat_definitions'
          : aggregate.kind === 'species'
            ? 'species_definitions'
            : 'background_definitions';
      if (database.scalar<number>(
        `SELECT 1 FROM ${table} WHERE content_key = ?`,
        [contentKey],
      ) === 1) return;
      switch (aggregate.kind) {
        case 'class': throw new ExternalClassImportRefused(aggregate.name);
        case 'feat': insertFeat(database, aggregate, contentKey); break;
        case 'species': insertSpecies(database, aggregate, contentKey); break;
        case 'background': insertBackground(database, aggregate, contentKey); break;
      }
      if (phase === 'commit') {
        const counter = aggregate.kind === 'feat'
          ? 'feats_created'
          : aggregate.kind === 'species'
            ? 'species_created'
            : 'backgrounds_created';
        counters[counter] += 1;
      }
    },
  };
}

function sourceProjectionForDatabase(
  db: DatabaseContext,
  aggregate: SourceAggregate,
  assertedKey: ContentKey,
  counters: MutableSourceContentImportCounters,
): ContentImportProjection {
  const projection = sourceProjection(aggregate, assertedKey, counters);
  const displayConflict = aggregate.kind === 'background'
    ? backgroundDisplayConflict(
        db,
        assertedKey,
        aggregate.default_origin_feat_display_name,
      )
    : null;
  return {
    ...projection,
    metadataConflict: rootMetadataConflict(
      db,
      aggregate.kind,
      assertedKey,
      aggregate.name,
      aggregate.rules_edition,
    ) || displayConflict !== null,
    ...(displayConflict === null
      ? {}
      : { conflictDetails: Object.freeze([displayConflict]) }),
  };
}

export function sourceContentImportNodes(
  db: DatabaseContext,
  records: {
    readonly classes: readonly CatalogClassRecord[];
    readonly feats: readonly CatalogFeatRecord[];
    readonly species: readonly CatalogSpeciesRecord[];
    readonly backgrounds: readonly CatalogBackgroundRecord[];
  },
  counters: MutableSourceContentImportCounters,
): readonly ContentImportNode[] {
  const aggregates: readonly SourceAggregate[] = [
    ...records.classes.map((record) => record.aggregate),
    ...records.feats.map((record) => record.aggregate),
    ...records.species.map((record) => record.aggregate),
    ...records.backgrounds.map((record) => record.aggregate),
  ];
  return Object.freeze(aggregates.map((aggregate) => {
    const assertedKey = assertedExternalContentKey(
      aggregate.kind,
      aggregate.rules_edition,
      aggregate.name,
    );
    const build = (
      name: string,
      nextKey: ContentKey,
      dependencies: ReadonlyMap<string, ContentImportDependencyTarget>,
    ): ContentImportProjection => {
      const renamed = remapProjectionFingerprintReferences(
        { ...aggregate, name },
        dependencies,
      ) as SourceAggregate;
      return sourceProjectionForDatabase(db, renamed, nextKey, counters);
    };
    const reproject: NonNullable<ContentImportNode['reproject']> =
      ({ name, assertedKey: nextKey, dependencies }) =>
        build(name, nextKey, dependencies);
    const node: ContentImportNode = Object.freeze({
      id: `${aggregate.kind}:${assertedKey}`,
      projection: build(aggregate.name, assertedKey, new Map()),
      reproject,
    });
    return node;
  }));
}
