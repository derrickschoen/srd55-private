import type {
  AuthoringGrant,
  BackgroundContentAggregate,
  SubclassContentAggregate,
} from '../authoring/contracts';
import type {
  AuthoringFeatureEffect,
} from '../authoring/effect-forms';
import { AUTHORING_DOCUMENT_LIMITS } from '../authoring/limits';
import { normalizeCatalogName } from '../catalog/catalog-normalize';
import {
  contentFingerprintReferenceKey,
  remapProjectionFingerprintReferences,
  type ContentImportDependencyTarget,
  type ContentImportNode,
  type ContentImportLineageDisclosure,
  type ContentImportPlan,
  type ContentImportProjection,
} from '../catalog/content-adoption';
import {
  certifyInstalledTargetReference,
  projectContentGraphInDependencyOrder,
  resolveContentReference,
} from '../catalog/content-registry';
import {
  assertedExternalContentKey,
  assertedExternalContentKeyFromDeclared,
  isAssertedExternalContentKey,
} from '../catalog/catalog-key';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  CONTENT_FINGERPRINT_SCHEME_V2,
  contentKinds,
  deriveContentIdentityForScheme,
  deriveContentIdentityV1,
  isContentFingerprintScheme,
  type ContentFingerprintDigest,
  type ContentFingerprintScheme,
  type ContentKind,
} from '../catalog/content-identity';
import {
  effectColumns,
  portableEquipmentContentImportNode,
  type EffectColumns,
} from '../catalog/equipment-importer';
import type {
  EquipmentContentAggregate,
} from '../catalog/equipment-content-projector-v1';
import {
  projectArmorContentV1,
  projectItemContentV1,
  projectWeaponContentV1,
} from '../catalog/equipment-content-projector-v1';
import { parseSourceCatalogRecord } from '../catalog/source-catalog-records';
import {
  projectClassContentV1,
  projectFeatContentV1,
} from '../catalog/source-content-projector-v1';
import {
  portableSourceContentImportNode,
  portableSpeciesContentImportNodeV2,
  portableStoredGrantRules,
  type SourceAggregate,
} from '../catalog/source-content-importer';
import {
  projectSpellContentAggregateV1,
  type SpellContentAggregateV1,
} from '../catalog/spell-content-projector-v1';
import {
  projectAuthoredContentAggregateV1,
  projectSpeciesContentAggregateV2,
} from '../catalog/stored-authored-content-projector-v1';
import {
  projectStoredContentV1,
  projectStoredPortableContentV1,
} from '../catalog/stored-content-projector-v1';
import { projectStoredPortableContentV2 } from '../catalog/stored-content-projector-v2';
import type { SpeciesProjectorAggregateV2 } from '../catalog/authored-content-projector-contract-v2';
import type { DatabaseContext } from '../db/database';
import type { CatalogContentKeyKind } from '../../db/schema/catalog-content';
import type { ContentKey } from '../domain/ids';
import { featureValueKeys } from '../domain/feature-values';
import { FEATURE_VALUE_CONTRIBUTION_LIMITS } from '../domain/contracts/feature-value-storage-limits';
import {
  decodeStoredSupersedesReference,
  decodeStoredValueExpression,
} from '../domain/contracts/row-rules';
import { BackupValidationError, assertExactKeys, backupRecord } from './backup-version';
import {
  CONTENT_PROVENANCE_LIMITS,
  recordContentProvenance,
  storedContentProvenance,
  type ContentProvenance,
} from '../catalog/content-provenance';

export const LIBRARY_EXPORT_FORMAT = 'dnd-multiclass-spells/library' as const;
export const LIBRARY_EXPORT_VERSION = 3 as const;
export const PRE_PROVENANCE_LIBRARY_EXPORT_VERSION = 2 as const;
export const LEGACY_LIBRARY_EXPORT_VERSION = 1 as const;

export const PORTABLE_CONTENT_LIMITS = Object.freeze({
  entries: 4_096,
  encodedBytes: 64 * 1_024 * 1_024,
  nesting: AUTHORING_DOCUMENT_LIMITS.maximumNesting,
});

export type PortableContentAggregateValue =
  | SourceAggregate
  | SpeciesProjectorAggregateV2
  | SubclassContentAggregate
  | EquipmentContentAggregate
  | SpellContentAggregateV1;

/** Spell lookup metadata is portable, but deliberately not fingerprinted. */
export interface PortableSpellIdentityMetadata {
  readonly canonical_name: string;
  readonly normalized_name: string;
  readonly aliases: readonly {
    readonly alias: string;
    readonly normalized_alias: string;
  }[];
}

export interface PortableContentAggregate {
  readonly kind: ContentKind;
  readonly content_key: string;
  readonly key_kind: 'asserted';
  readonly fingerprint_scheme: ContentFingerprintScheme;
  readonly fingerprint_digest: ContentFingerprintDigest;
  readonly aggregate: PortableContentAggregateValue;
  readonly spell_identity?: PortableSpellIdentityMetadata;
  /** Absent only on a historical v18/v6/v2-or-earlier document. */
  readonly provenance?: ContentProvenance;
}

/** Newly emitted portable content always carries an honest provenance value. */
export interface CurrentPortableContentAggregate extends PortableContentAggregate {
  readonly provenance: ContentProvenance;
}

export interface PortableContentSupersession {
  readonly content_kind: ContentKind;
  readonly superseded_content_key: string;
  readonly successor_content_key: string;
  readonly recorded_at: string;
}

export interface PortableContentLifecycle {
  readonly content_kind: ContentKind;
  readonly content_key: string;
  readonly archived_at: string | null;
}

export interface PortableContentBundle {
  readonly content: readonly PortableContentAggregate[];
  readonly supersessions: readonly PortableContentSupersession[];
}

export interface CurrentPortableContentBundle extends PortableContentBundle {
  readonly content: readonly CurrentPortableContentAggregate[];
}

interface LibraryExportBase {
  readonly format: typeof LIBRARY_EXPORT_FORMAT;
  readonly exported_at: string;
  readonly selection: 'all' | 'selected';
  readonly selected_content_keys: readonly string[];
  readonly content: readonly PortableContentAggregate[];
}

export type CurrentLibraryExportDocument = Omit<LibraryExportBase, 'content'> & {
  readonly version: typeof LIBRARY_EXPORT_VERSION;
  readonly content: readonly CurrentPortableContentAggregate[];
  readonly supersessions: readonly PortableContentSupersession[];
  readonly lifecycle: readonly PortableContentLifecycle[];
};

export type LibraryExportDocument =
  | CurrentLibraryExportDocument
  | (LibraryExportBase & (
  | {
      readonly version: typeof PRE_PROVENANCE_LIBRARY_EXPORT_VERSION;
      readonly supersessions: readonly PortableContentSupersession[];
      readonly lifecycle?: never;
    }
  | {
      readonly version: typeof LEGACY_LIBRARY_EXPORT_VERSION;
      readonly supersessions?: never;
      readonly lifecycle?: never;
    }
  ));

export interface PortableImportPreview {
  readonly new_by_kind: Readonly<Record<ContentKind, number>>;
  readonly matched_by_kind: Readonly<Record<ContentKind, number>>;
  readonly review_required_by_kind: Readonly<Record<ContentKind, number>>;
  readonly refused_by_kind: Readonly<Record<ContentKind, number>>;
}

export interface PortableImportPlan extends ContentImportPlan {
  readonly preview: PortableImportPreview;
  readonly incomingLineages: readonly ContentImportLineageDisclosure[];
}

function zeroKindCounts(): Record<ContentKind, number> {
  return Object.fromEntries(contentKinds.map((kind) => [kind, 0])) as Record<
    ContentKind,
    number
  >;
}

function portableAggregateName(entry: PortableContentAggregate): string {
  return entry.aggregate.name.trim() === '' ? 'UNKNOWN' : entry.aggregate.name;
}

function portableNodeId(kind: ContentKind, contentKey: string): string {
  return `portable:${kind}:${contentKey}`;
}

export function portableContentLineages(
  bundle: PortableContentBundle,
  usedContentKeys: ReadonlySet<string> = new Set<string>(),
): readonly ContentImportLineageDisclosure[] {
  const entries = new Map(bundle.content.map((entry) => [
    `${entry.kind}\u0000${entry.content_key}`,
    entry,
  ]));
  const successors = new Map(bundle.supersessions.map((edge) => [
    `${edge.content_kind}\u0000${edge.superseded_content_key}`,
    `${edge.content_kind}\u0000${edge.successor_content_key}`,
  ]));
  const predecessorKeys = new Set(successors.values());
  const visited = new Set<string>();
  const lineages: ContentImportLineageDisclosure[] = [];
  const appendLineage = (start: string): void => {
    const versions: { id: string; name: string; used_by_character: boolean }[] = [];
    let cursor: string | undefined = start;
    while (cursor !== undefined && !visited.has(cursor)) {
      const entry = entries.get(cursor);
      if (entry === undefined) break;
      visited.add(cursor);
      versions.push({
        id: portableNodeId(entry.kind, entry.content_key),
        name: portableAggregateName(entry),
        used_by_character: usedContentKeys.has(entry.content_key),
      });
      cursor = successors.get(cursor);
    }
    const first = entries.get(start);
    if (first !== undefined && versions.length > 0) {
      lineages.push(Object.freeze({
        kind: first.kind,
        versions: Object.freeze(versions.map((version) => Object.freeze(version))),
      }));
    }
  };
  for (const key of entries.keys()) {
    if (!predecessorKeys.has(key)) appendLineage(key);
  }
  for (const key of entries.keys()) {
    if (!visited.has(key)) appendLineage(key);
  }
  return Object.freeze(lineages);
}

/** Counted view over the authenticated CI-4a outcomes; it adds no install path. */
export function portableImportPlan(
  plan: ContentImportPlan,
  bundle?: PortableContentBundle,
): PortableImportPlan {
  const created = zeroKindCounts();
  const matched = zeroKindCounts();
  const reviews = zeroKindCounts();
  const refused = zeroKindCounts();
  const outcomeKind = (id: string): ContentKind => {
    const reviewed = plan.reviews.find((review) => review.id === id)?.kind;
    if (reviewed !== undefined) return reviewed;
    const kind = contentKinds.find((candidate) => id.startsWith(`portable:${candidate}:`));
    if (kind === undefined) {
      throw new BackupValidationError(`Portable import outcome '${id}' has no content kind.`);
    }
    return kind;
  };
  for (const outcome of plan.outcomes) {
    switch (outcome.kind) {
      case 'create': created[outcomeKind(outcome.id)] += 1; break;
      case 'match':
      case 'remembered-match':
      case 'remembered-clone': {
        matched[outcomeKind(outcome.id)] += 1;
        break;
      }
      case 'review': {
        reviews[outcomeKind(outcome.id)] += 1;
        break;
      }
      case 'refused': {
        refused[outcomeKind(outcome.id)] += 1;
        break;
      }
    }
  }
  const incomingLineages = bundle === undefined
    ? plan.incomingContent.map((entry) => Object.freeze({
        kind: entry.kind,
        versions: Object.freeze([Object.freeze({
          id: entry.id,
          name: entry.name,
          used_by_character: false,
        })]),
      }))
    : portableContentLineages(bundle);
  return Object.freeze({
    ...plan,
    incomingLineages,
    preview: Object.freeze({
      new_by_kind: Object.freeze(created),
      matched_by_kind: Object.freeze(matched),
      review_required_by_kind: Object.freeze(reviews),
      refused_by_kind: Object.freeze(refused),
    }),
  });
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  assertExactKeys(value, expected, label);
}

function jsonDepth(
  value: unknown,
  depth = 0,
  ancestors: WeakSet<object> = new WeakSet(),
): void {
  if (depth > PORTABLE_CONTENT_LIMITS.nesting) {
    throw new BackupValidationError(
      `Portable content exceeds ${String(PORTABLE_CONTENT_LIMITS.nesting)} nesting levels.`,
    );
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new BackupValidationError('Portable content numbers must be safe integers.');
    }
    return;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new BackupValidationError('Portable content must not contain cycles.');
    }
    ancestors.add(value);
    for (const member of value) jsonDepth(member, depth + 1, ancestors);
    ancestors.delete(value);
    return;
  }
  if (typeof value !== 'object') {
    throw new BackupValidationError('Portable content must contain only JSON values.');
  }
  if (ancestors.has(value)) {
    throw new BackupValidationError('Portable content must not contain cycles.');
  }
  ancestors.add(value);
  for (const member of Object.values(value)) {
    jsonDepth(member, depth + 1, ancestors);
  }
  ancestors.delete(value);
}

function aggregateTopLevelKeys(
  kind: ContentKind,
  scheme: ContentFingerprintScheme = CONTENT_FINGERPRINT_SCHEME_V1,
): readonly string[] {
  switch (kind) {
    case 'class':
      return [
        'kind', 'name', 'rules_edition', 'spellcasting_ability',
        'progression_type', 'caster_fraction', 'caster_rounding',
        'prepares_or_knows', 'supports_ritual_casting', 'ritual_casting_mode',
        'primary_ability_expression', 'notes', 'progressions', 'sheet_traits',
        'saving_throw_proficiencies', 'skill_options', 'armor_training',
        'weapon_proficiencies', 'extra_attack_grants', 'martial_arts_dice',
        'weapon_mastery_grants', 'weapon_mastery_counts', 'equipment_items',
        'resources', 'resource_formulas', 'feature_effects', 'named_features',
      ];
    case 'feat':
      return [
        'kind', 'name', 'rules_edition', 'category', 'min_level',
        'ability_points', 'ability_increase_abilities',
        'ability_increase_maximum', 'repeatable', 'prerequisites', 'grants',
        'notes',
      ];
    case 'species':
      return [
        'kind', 'name', 'rules_edition', 'reference_text', 'repeatable',
        scheme === CONTENT_FINGERPRINT_SCHEME_V2 ? 'source_rules' : 'grants',
        'creature_type', 'primary_size', 'alternate_size',
        'walking_speed_feet', 'traits',
      ];
    case 'background':
      return [
        'kind', 'name', 'rules_edition', 'reference_text', 'repeatable',
        'grants', 'suggested_abilities', 'default_origin_feat_content_key',
        'default_origin_feat', 'default_origin_feat_display_name',
        'skill_proficiencies', 'tool_reference_text',
        'equipment_option_a_description', 'equipment_option_b_description',
        'equipment_option_a', 'equipment_option_b', 'effects',
      ];
    case 'subclass':
      return [
        'kind', 'name', 'rules_edition', 'reference_text', 'parent_class',
        'grants', 'progression', 'features',
      ];
    case 'spell':
      return [
        'kind', 'name', 'rules_edition', 'spell_identity_key',
        'spell_version_key', 'level', 'school', 'ritual', 'concentration',
        'casting_time', 'action_type', 'range', 'range_kind', 'range_feet',
        'area_shape', 'area_feet', 'duration', 'components',
        'material_component_summary', 'material_cost_copper',
        'material_cost_kind', 'healing', 'short_summary', 'upcast_summary',
        'cantrip_upgrade_summary', 'requires_mod_for_effect',
        'effect_reliability_category', 'spell_lists', 'tags', 'attack_modes',
        'save_abilities', 'upcast_levels', 'cantrip_upgrade_levels',
      ];
    case 'weapon':
      return [
        'kind', 'name', 'rules_edition', 'srd_group', 'damage', 'damage_type',
        'versatile_damage', 'finesse', 'heavy', 'light', 'loading', 'reach',
        'thrown', 'two_handed', 'ammunition', 'ammunition_kind', 'range',
        'mastery_property', 'other_properties',
      ];
    case 'armor':
      return [
        'kind', 'name', 'rules_edition', 'category', 'armor_class',
        'dex_bonus', 'dex_bonus_max', 'strength_requirement',
        'stealth_disadvantage',
      ];
    case 'item':
      return [
        'kind', 'name', 'rules_edition', 'description',
        'requires_attunement', 'effects',
      ];
  }
}

function projectPortableAggregate(
  kind: ContentKind,
  aggregate: PortableContentAggregateValue,
  scheme: ContentFingerprintScheme = CONTENT_FINGERPRINT_SCHEME_V1,
): { readonly edition: string; readonly name: string; readonly payload: unknown } {
  const object = backupRecord(aggregate, `Portable ${kind} aggregate`);
  exactKeys(object, aggregateTopLevelKeys(kind, scheme), `Portable ${kind} aggregate`);
  if (object.kind !== kind) {
    throw new BackupValidationError(`Portable ${kind} aggregate kind disagrees with its envelope.`);
  }
  switch (kind) {
    case 'class': {
      const record = parseSourceCatalogRecord('class', { kind, aggregate: object });
      return {
        edition: record.aggregate.rules_edition,
        name: record.aggregate.name,
        payload: projectStoredPayloadSource(record.aggregate, 'class'),
      };
    }
    case 'feat': {
      const record = parseSourceCatalogRecord('feat', { kind, aggregate: object });
      return {
        edition: record.aggregate.rules_edition,
        name: record.aggregate.name,
        payload: projectStoredPayloadSource(record.aggregate, 'feat'),
      };
    }
    case 'species': {
      if (scheme === CONTENT_FINGERPRINT_SCHEME_V2) {
        const value = object as unknown as SpeciesProjectorAggregateV2;
        const projected = projectSpeciesContentAggregateV2(value);
        return {
          edition: value.rules_edition,
          name: value.name,
          payload: projected.payload,
        };
      }
      const record = parseSourceCatalogRecord('species', { kind, aggregate: object });
      return {
        edition: record.aggregate.rules_edition,
        name: record.aggregate.name,
        payload: projectAuthoredContentAggregateV1(record.aggregate).payload,
      };
    }
    case 'background': {
      const record = parseSourceCatalogRecord('background', { kind, aggregate: object });
      return {
        edition: record.aggregate.rules_edition,
        name: record.aggregate.name,
        payload: projectAuthoredContentAggregateV1(record.aggregate).payload,
      };
    }
    case 'subclass': {
      const value = object as unknown as SubclassContentAggregate;
      const projected = projectAuthoredContentAggregateV1(value);
      return { edition: value.rules_edition, name: value.name, payload: projected.payload };
    }
    case 'spell': {
      const value = object as unknown as SpellContentAggregateV1;
      const projected = projectSpellContentAggregateV1(value);
      return { edition: value.rules_edition, name: value.name, payload: projected.payload };
    }
    case 'weapon': {
      const value = object as unknown as Extract<EquipmentContentAggregate, { kind: 'weapon' }>;
      return { edition: value.rules_edition, name: value.name, payload: projectWeaponContentV1(value) };
    }
    case 'armor': {
      const value = object as unknown as Extract<EquipmentContentAggregate, { kind: 'armor' }>;
      return { edition: value.rules_edition, name: value.name, payload: projectArmorContentV1(value) };
    }
    case 'item': {
      const value = object as unknown as Extract<EquipmentContentAggregate, { kind: 'item' }>;
      return { edition: value.rules_edition, name: value.name, payload: projectItemContentV1(value) };
    }
  }
}

function portableSubclassTargetIdentity(target: Record<string, unknown>): string {
  if (target.kind === 'feature_dice_count') return `feature_dice_count\u0000${String(target.key)}`;
  const resource = backupRecord(target.resource, 'Portable subclass contribution resource');
  return `resource_maximum\u0000${String(resource.fact_key)}`;
}

function validatePortableSubclassContributions(
  aggregate: Record<string, unknown>,
  contentKey: ContentKey,
): void {
  if (!Array.isArray(aggregate.features)) {
    throw new BackupValidationError('Portable subclass aggregate features must be a list.');
  }
  const indexed = new Map<string, {
    readonly target: string;
    readonly supersedes: string | null;
    readonly activeFrom: number;
    readonly activeTo: number;
  }>();
  for (const [featureIndex, inputFeature] of aggregate.features.entries()) {
    const featureLabel = `Portable subclass feature[${String(featureIndex)}]`;
    const feature = backupRecord(inputFeature, featureLabel);
    const hasContributions = Object.hasOwn(feature, 'contributions');
    exactKeys(feature, [
      'class_level', 'sort_order', 'name', 'description', 'effects',
      ...(hasContributions ? ['contributions'] : []),
    ], featureLabel);
    if (!hasContributions) continue;
    if (!Array.isArray(feature.contributions)) {
      throw new BackupValidationError(`${featureLabel}.contributions must be a list.`);
    }
    for (const [contributionIndex, inputContribution] of feature.contributions.entries()) {
      const label = `${featureLabel}.contributions[${String(contributionIndex)}]`;
      const contribution = backupRecord(inputContribution, label);
      const hasSupersedes = Object.hasOwn(contribution, 'supersedes');
      exactKeys(contribution, [
        'kind', 'contribution_key', 'label', 'target', 'op',
        'active_from_level', 'active_to_level', 'value',
        ...(hasSupersedes ? ['supersedes'] : []),
      ], label);
      if (
        contribution.kind !== 'feature_value_contribution' ||
        typeof contribution.contribution_key !== 'string' ||
        [...contribution.contribution_key].length < 1 ||
        [...contribution.contribution_key].length > FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints ||
        typeof contribution.label !== 'string' ||
        [...contribution.label].length < 1 ||
        [...contribution.label].length > FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints ||
        contribution.op !== 'add' ||
        !Number.isSafeInteger(contribution.active_from_level) ||
        !Number.isSafeInteger(contribution.active_to_level) ||
        Number(contribution.active_from_level) < Number(feature.class_level) ||
        Number(contribution.active_from_level) < 1 ||
        Number(contribution.active_to_level) > 20 ||
        Number(contribution.active_from_level) > Number(contribution.active_to_level)
      ) {
        throw new BackupValidationError(`${label} is invalid.`);
      }
      const target = backupRecord(contribution.target, `${label}.target`);
      if (target.kind === 'feature_dice_count') {
        exactKeys(target, ['kind', 'key'], `${label}.target`);
        if (
          typeof target.key !== 'string' ||
          !(featureValueKeys as readonly string[]).includes(target.key)
        ) throw new BackupValidationError(`${label}.target is invalid.`);
      } else if (target.kind === 'resource_maximum') {
        exactKeys(target, ['kind', 'resource'], `${label}.target`);
        const resource = backupRecord(target.resource, `${label}.target.resource`);
        exactKeys(
          resource,
          ['fact_key', 'display_label', 'marking_shape'],
          `${label}.target.resource`,
        );
        if (
          resource.fact_key !== `${contentKey}\u0000${contribution.contribution_key}` ||
          typeof resource.fact_key !== 'string' ||
          [...resource.fact_key].length > FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints ||
          typeof resource.display_label !== 'string' ||
          [...resource.display_label].length < 1 ||
          [...resource.display_label].length > FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints ||
          (resource.marking_shape !== 'boxes' && resource.marking_shape !== 'remaining')
        ) throw new BackupValidationError(`${label}.target resource display configuration is invalid.`);
      } else {
        throw new BackupValidationError(`${label}.target kind is invalid.`);
      }
      decodeStoredValueExpression(
        JSON.stringify(contribution.value),
        `${label}.value`,
      );
      let supersedesKey: string | null = null;
      if (hasSupersedes) {
        const sourceRef = backupRecord(contribution.supersedes, `${label}.supersedes`);
        exactKeys(
          sourceRef,
          ['kind', 'content_key', 'contribution_key'],
          `${label}.supersedes`,
        );
        if (sourceRef.kind !== 'contribution') {
          throw new BackupValidationError(`${label}.supersedes kind is invalid.`);
        }
        const supersedes = decodeStoredSupersedesReference(JSON.stringify({
          content_key: sourceRef.content_key,
          contribution_key: sourceRef.contribution_key,
        }), `${label}.supersedes`);
        if (
          supersedes === null ||
          supersedes.content_key !== contentKey ||
          supersedes.contribution_key === contribution.contribution_key
        ) throw new BackupValidationError(`${label}.supersedes must name another contribution in this subclass.`);
        supersedesKey = String(supersedes.contribution_key);
      }
      if (indexed.has(contribution.contribution_key)) {
        throw new BackupValidationError('Portable subclass contribution keys must be unique throughout the aggregate.');
      }
      indexed.set(contribution.contribution_key, {
        target: portableSubclassTargetIdentity(target),
        supersedes: supersedesKey,
        activeFrom: Number(contribution.active_from_level),
        activeTo: Number(contribution.active_to_level),
      });
    }
  }
  for (const [key, contribution] of indexed) {
    if (contribution.supersedes === null) continue;
    const victim = indexed.get(contribution.supersedes);
    if (victim === undefined) {
      throw new BackupValidationError(`Portable subclass contribution '${key}' has a dangling supersedes reference.`);
    }
    if (victim.target !== contribution.target) {
      throw new BackupValidationError(`Portable subclass contribution '${key}' supersedes a different target.`);
    }
    if (
      victim.activeFrom > contribution.activeFrom ||
      victim.activeTo < contribution.activeTo
    ) {
      throw new BackupValidationError(`Portable subclass contribution '${key}' outlives the contribution it supersedes.`);
    }
  }
  for (const start of indexed.keys()) {
    const seen = new Set<string>();
    let key: string | null = start;
    while (key !== null) {
      if (seen.has(key)) {
        throw new BackupValidationError('Portable subclass contribution supersession contains a cycle.');
      }
      seen.add(key);
      key = indexed.get(key)?.supersedes ?? null;
    }
  }
}

function projectStoredPayloadSource(
  aggregate: SourceAggregate,
  kind: 'class' | 'feat',
): unknown {
  return kind === 'class'
    ? projectClassContentV1(
        aggregate as Extract<SourceAggregate, { kind: 'class' }>,
      )
    : projectFeatContentV1(
        aggregate as Extract<SourceAggregate, { kind: 'feat' }>,
      );
}

interface LocalPortableEntry {
  readonly marker: string;
  readonly kind: ContentKind;
  readonly localContentKey: ContentKey;
  readonly portableContentKey: ContentKey;
  readonly aggregate: PortableContentAggregateValue;
  readonly spellIdentity?: PortableSpellIdentityMetadata;
  readonly dependencies: readonly {
    readonly reference: {
      readonly kind: ContentKind;
      readonly scheme: ContentFingerprintScheme;
      readonly digest: ContentFingerprintDigest;
    };
    readonly marker: string;
    readonly contentKey: ContentKey;
  }[];
}

function portableAssertedKey(
  kind: ContentKind,
  contentKey: ContentKey,
  keyKind: CatalogContentKeyKind,
  aggregate: PortableContentAggregateValue,
): ContentKey {
  if (keyKind === 'asserted') {
    if (!isAssertedExternalContentKey(contentKey)) {
      throw new BackupValidationError(
        `External ${kind} key '${contentKey}' is not a portable asserted key.`,
      );
    }
    return contentKey;
  }
  if (keyKind !== 'derived') {
    throw new BackupValidationError(
      `External ${kind} '${contentKey}' has unsupported key kind '${keyKind}'.`,
    );
  }
  return assertedExternalContentKey(
    kind,
    aggregate.rules_edition,
    aggregate.name,
  );
}

/** D198 key projection for character references and library selection roots. */
export function portableContentKeyForExport(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
): ContentKey {
  const registry = db.oneRaw(
    `SELECT key_kind, catalog_layer FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [kind, contentKey],
  );
  if (registry === null) {
    throw new BackupValidationError(
      `Portable content root '${contentKey}' is missing.`,
    );
  }
  if (registry.catalog_layer === 'bundled') return contentKey;
  if (registry.catalog_layer !== 'external') {
    throw new BackupValidationError(
      `Portable content root '${contentKey}' has an unsupported catalog layer.`,
    );
  }
  const scheme = db.scalar<string>(
    `SELECT fingerprint_scheme FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ? AND fingerprint_role = 'current'`,
    [kind, contentKey],
  );
  if (!isContentFingerprintScheme(scheme)) {
    throw new BackupValidationError(`Portable content root '${contentKey}' has no supported current fingerprint.`);
  }
  const projected = scheme === CONTENT_FINGERPRINT_SCHEME_V1
    ? projectStoredPortableContentV1(db, kind, contentKey)
    : projectStoredPortableContentV2(db, kind, contentKey);
  return portableAssertedKey(
    kind,
    contentKey,
    String(registry.key_kind) as CatalogContentKeyKind,
    projected.aggregate as PortableContentAggregateValue,
  );
}

function localPortableEntry(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
): LocalPortableEntry {
  const registry = db.oneRaw(
    `SELECT key_kind, catalog_layer FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [kind, contentKey],
  );
  if (registry === null || registry.catalog_layer !== 'external') {
    throw new BackupValidationError(`Portable content root '${contentKey}' is not external ${kind} content.`);
  }
  const stored = db.oneRaw(
    `SELECT fingerprint_scheme, fingerprint_digest, canonical_json
     FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ? AND fingerprint_role = 'current'`,
    [kind, contentKey],
  );
  if (stored === null || !isContentFingerprintScheme(stored.fingerprint_scheme)) {
    throw new BackupValidationError(`Stored ${kind} '${contentKey}' has no supported current fingerprint.`);
  }
  const scheme = stored.fingerprint_scheme;
  const projected = scheme === CONTENT_FINGERPRINT_SCHEME_V1
    ? projectStoredPortableContentV1(db, kind, contentKey)
    : projectStoredPortableContentV2(db, kind, contentKey);
  const identity = deriveContentIdentityForScheme(scheme, {
    kind,
    edition: projected.aggregate.rules_edition,
    name: projected.aggregate.name,
    payload: projected.payload,
  });
  if (
    stored.fingerprint_scheme !== identity.envelope.scheme ||
    stored.fingerprint_digest !== identity.digest ||
    stored.canonical_json !== identity.canonicalJson
  ) {
    throw new BackupValidationError(`Stored ${kind} '${contentKey}' does not match its current fingerprint.`);
  }
  const aggregate = projected.aggregate as PortableContentAggregateValue;
  const spellIdentity = kind === 'spell'
    ? portableSpellIdentityMetadata(db, aggregate as SpellContentAggregateV1)
    : undefined;
  const portableContentKey = portableAssertedKey(
    kind,
    contentKey,
    String(registry.key_kind) as CatalogContentKeyKind,
    aggregate,
  );
  const dependencies = projected.references.flatMap((edge) => {
    const target = referencedExternalKey(db, edge.reference);
    return target === null
      ? []
      : [{
          reference: edge.reference,
          marker: `${edge.reference.kind}\u0000${target}`,
          contentKey: target,
        }];
  });
  return Object.freeze({
    marker: `${kind}\u0000${contentKey}`,
    kind,
    localContentKey: contentKey,
    portableContentKey,
    aggregate,
    ...(spellIdentity === undefined ? {} : { spellIdentity }),
    dependencies: Object.freeze(dependencies),
  });
}

function portableSpellIdentityMetadata(
  db: DatabaseContext,
  aggregate: SpellContentAggregateV1,
): PortableSpellIdentityMetadata {
  const identity = db.oneRaw(
    `SELECT id, canonical_name, normalized_name
     FROM spell_identities WHERE content_key = ?`,
    [aggregate.spell_identity_key],
  );
  if (identity === null) {
    throw new BackupValidationError(
      `Portable spell identity '${aggregate.spell_identity_key}' is missing.`,
    );
  }
  return Object.freeze({
    canonical_name: String(identity.canonical_name),
    normalized_name: String(identity.normalized_name),
    aliases: Object.freeze(db.allRaw(
      `SELECT alias, normalized_alias FROM spell_identity_aliases
       WHERE spell_identity_id = ? ORDER BY normalized_alias, alias`,
      [Number(identity.id)],
    ).map((row) => Object.freeze({
      alias: String(row.alias),
      normalized_alias: String(row.normalized_alias),
    }))),
  });
}

function referencedExternalKey(
  db: DatabaseContext,
  reference: { readonly kind: ContentKind; readonly scheme: string; readonly digest: string },
): ContentKey | null {
  const rows = db.allRaw(
    `SELECT identity.content_key, identity.catalog_layer
     FROM catalog_content_fingerprints AS fingerprint
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = fingerprint.content_kind
      AND identity.content_key = fingerprint.content_key
     WHERE fingerprint.content_kind = ? AND fingerprint.fingerprint_scheme = ?
       AND fingerprint.fingerprint_digest = ?
       AND fingerprint.fingerprint_role IN ('current', 'compatible')
     ORDER BY identity.content_key`,
    [reference.kind, reference.scheme, reference.digest],
  );
  if (rows.length !== 1) {
    throw new BackupValidationError(
      `Portable ${reference.kind} dependency '${reference.digest}' does not resolve uniquely.`,
    );
  }
  return rows[0]!.catalog_layer === 'external'
    ? String(rows[0]!.content_key) as ContentKey
    : null;
}

/** Exact external reference closure, in stable kind/key order. */
export function exportPortableContentClosure(
  db: DatabaseContext,
  roots: readonly { readonly kind: ContentKind; readonly contentKey: ContentKey }[],
): readonly CurrentPortableContentAggregate[] {
  const pending = [...roots];
  const seen = new Set<string>();
  const localEntries: LocalPortableEntry[] = [];
  while (pending.length > 0) {
    const root = pending.shift()!;
    const identity = db.oneRaw(
      `SELECT catalog_layer FROM catalog_content_identities
       WHERE content_kind = ? AND content_key = ?`,
      [root.kind, root.contentKey],
    );
    if (identity === null) {
      throw new BackupValidationError(`Portable content root '${root.contentKey}' is missing.`);
    }
    if (identity.catalog_layer !== 'external') continue;
    const marker = `${root.kind}\u0000${root.contentKey}`;
    if (seen.has(marker)) continue;
    seen.add(marker);
    for (const lineage of db.allRaw(
      `SELECT superseded_content_key, successor_content_key
       FROM catalog_content_supersessions
       WHERE content_kind = ?
         AND (superseded_content_key = ? OR successor_content_key = ?)
       ORDER BY superseded_content_key, successor_content_key`,
      [root.kind, root.contentKey, root.contentKey],
    )) {
      pending.push(
        {
          kind: root.kind,
          contentKey: String(lineage.superseded_content_key) as ContentKey,
        },
        {
          kind: root.kind,
          contentKey: String(lineage.successor_content_key) as ContentKey,
        },
      );
    }
    const entry = localPortableEntry(db, root.kind, root.contentKey);
    localEntries.push(entry);
    for (const dependency of entry.dependencies) {
      pending.push({
        kind: dependency.reference.kind,
        contentKey: dependency.contentKey,
      });
    }
  }
  const byMarker = new Map(localEntries.map((entry) => [entry.marker, entry]));
  const projectedTargets = new Map<string, ContentImportDependencyTarget>();
  let entries: readonly CurrentPortableContentAggregate[];
  try {
    entries = projectContentGraphInDependencyOrder(
      localEntries.map((entry) => ({
        key: entry.marker,
        dependencies: [...new Set(entry.dependencies.map(
          (dependency) => dependency.marker,
        ))],
      })),
      (marker) => {
        const local = byMarker.get(marker)!;
        const dependencies = new Map<string, ContentImportDependencyTarget>();
        for (const dependency of local.dependencies) {
          const target = projectedTargets.get(dependency.marker);
          if (target === undefined) {
            throw new BackupValidationError(
              `Portable dependency '${dependency.marker}' was not projected.`,
            );
          }
          dependencies.set(
            contentFingerprintReferenceKey(dependency.reference),
            target,
          );
        }
        let aggregate = remapProjectionFingerprintReferences(
          local.aggregate,
          dependencies,
        );
        if (local.kind === 'background') {
          const background = local.aggregate as BackgroundContentAggregate;
          aggregate = {
            ...aggregate,
            default_origin_feat_content_key:
              dependencies.get(contentFingerprintReferenceKey(
                background.default_origin_feat,
              ))?.contentKey ?? background.default_origin_feat_content_key,
          } as PortableContentAggregateValue;
        }
        if (local.kind === 'spell') {
          aggregate = {
            ...aggregate,
            spell_version_key: local.portableContentKey,
          } as PortableContentAggregateValue;
        }
        const current = db.scalar<string>(
          `SELECT fingerprint_scheme FROM catalog_content_fingerprints
           WHERE content_kind = ? AND content_key = ? AND fingerprint_role = 'current'`,
          [local.kind, local.localContentKey],
        );
        if (!isContentFingerprintScheme(current)) {
          throw new BackupValidationError('Portable source has no supported current scheme.');
        }
        const projected = projectPortableAggregate(local.kind, aggregate, current);
        const identity = deriveContentIdentityForScheme(current, {
          kind: local.kind,
          ...projected,
        });
        projectedTargets.set(local.marker, Object.freeze({
          contentKey: local.portableContentKey,
          kind: local.kind,
          scheme: identity.envelope.scheme,
          digest: identity.digest,
        }));
        return Object.freeze({
          kind: local.kind,
          content_key: local.portableContentKey,
          key_kind: 'asserted' as const,
          fingerprint_scheme: identity.envelope.scheme,
          fingerprint_digest: identity.digest,
          aggregate,
          provenance: storedContentProvenance(
            db,
            local.kind,
            local.localContentKey,
          ),
          ...(local.spellIdentity === undefined
            ? {}
            : { spell_identity: local.spellIdentity }),
        });
      },
    );
  } catch (error) {
    if (error instanceof BackupValidationError) throw error;
    throw new BackupValidationError(
      error instanceof Error ? error.message : String(error),
    );
  }
  const kindOrder = new Map(contentKinds.map((kind, index) => [kind, index]));
  entries = [...entries].sort((left, right) =>
    kindOrder.get(left.kind)! - kindOrder.get(right.kind)! ||
    left.content_key.localeCompare(right.content_key),
  );
  if (entries.length > PORTABLE_CONTENT_LIMITS.entries) {
    throw new BackupValidationError(
      `Portable content has ${String(entries.length)} entries; maximum is ${String(PORTABLE_CONTENT_LIMITS.entries)}.`,
    );
  }
  return Object.freeze(entries);
}

/** Portable aggregates plus every lineage edge wholly inside their closure. */
export function exportPortableContentBundle(
  db: DatabaseContext,
  roots: readonly { readonly kind: ContentKind; readonly contentKey: ContentKey }[],
): CurrentPortableContentBundle {
  const content = exportPortableContentClosure(db, roots);
  const markers = new Set(content.map(
    (entry) => `${entry.kind}\u0000${entry.content_key}`,
  ));
  const supersessions = db.allRaw(
    `SELECT content_kind, superseded_content_key, successor_content_key, recorded_at
     FROM catalog_content_supersessions
     ORDER BY content_kind, superseded_content_key, successor_content_key`,
  ).flatMap((row): PortableContentSupersession[] => {
    const kind = String(row.content_kind) as ContentKind;
    const superseded = String(row.superseded_content_key);
    const successor = String(row.successor_content_key);
    return markers.has(`${kind}\u0000${superseded}`) &&
        markers.has(`${kind}\u0000${successor}`)
      ? [{
          content_kind: kind,
          superseded_content_key: superseded,
          successor_content_key: successor,
          recorded_at: String(row.recorded_at),
        }]
      : [];
  });
  return Object.freeze({
    content,
    supersessions: Object.freeze(supersessions),
  });
}

function externalRoots(db: DatabaseContext): readonly {
  readonly kind: ContentKind;
  readonly contentKey: ContentKey;
}[] {
  return db.allRaw(
    `SELECT content_kind, content_key FROM catalog_content_identities
     WHERE catalog_layer = 'external' ORDER BY content_kind, content_key`,
  ).map((row) => ({
    kind: String(row.content_kind) as ContentKind,
    contentKey: String(row.content_key) as ContentKey,
  }));
}

export function exportLibraryDocument(
  db: DatabaseContext,
  selectedContentKeys?: readonly ContentKey[],
  exportedAt = new Date().toISOString(),
): CurrentLibraryExportDocument {
  const selection = selectedContentKeys === undefined ? 'all' : 'selected';
  const localKeys = selectedContentKeys === undefined
    ? externalRoots(db).map((root) => root.contentKey)
    : [...new Set(selectedContentKeys)].sort();
  const roots = selectedContentKeys === undefined
    ? externalRoots(db)
    : localKeys.map((contentKey) => {
        const row = db.oneRaw(
          `SELECT content_kind, catalog_layer FROM catalog_content_identities
           WHERE content_key = ?`,
          [contentKey],
        );
        if (row === null || row.catalog_layer !== 'external') {
          throw new BackupValidationError(`Selected library content '${contentKey}' is not external content.`);
        }
        return { kind: String(row.content_kind) as ContentKind, contentKey };
      });
  const portable = exportPortableContentBundle(db, roots);
  const content = portable.content;
  const keys = selection === 'all'
    ? content.map((entry) => entry.content_key).sort()
    : roots.map((root) => portableContentKeyForExport(
        db,
        root.kind,
        root.contentKey,
      )).sort();
  const document: CurrentLibraryExportDocument = {
    format: LIBRARY_EXPORT_FORMAT,
    version: LIBRARY_EXPORT_VERSION,
    exported_at: exportedAt,
    selection,
    selected_content_keys: Object.freeze(keys),
    content,
    supersessions: portable.supersessions,
    lifecycle: Object.freeze(content.map((entry) => {
      const candidates = db.allRaw(
        `SELECT identity.content_key, identity.archived_at
         FROM catalog_content_identities AS identity
         JOIN catalog_content_fingerprints AS fingerprint
           ON fingerprint.content_kind = identity.content_kind
          AND fingerprint.content_key = identity.content_key
         WHERE identity.content_kind = ?
           AND identity.catalog_layer = 'external'
           AND fingerprint.fingerprint_scheme = ?
           AND fingerprint.fingerprint_digest = ?
           AND fingerprint.fingerprint_role = 'current'
         ORDER BY identity.content_key`,
        [entry.kind, entry.fingerprint_scheme, entry.fingerprint_digest],
      ).filter((candidate) => portableContentKeyForExport(
        db,
        entry.kind,
        String(candidate.content_key) as ContentKey,
      ) === entry.content_key);
      if (candidates.length !== 1) {
        throw new BackupValidationError(
          `Portable lifecycle source '${entry.content_key}' does not resolve uniquely.`,
        );
      }
      const archivedAt = candidates[0]!.archived_at;
      return Object.freeze({
        content_kind: entry.kind,
        content_key: entry.content_key,
        archived_at: archivedAt === null ? null : String(archivedAt),
      });
    })),
  };
  validateLibraryDocument(document);
  return Object.freeze(document);
}

function validatedProvenance(input: unknown, label: string): ContentProvenance {
  const value = backupRecord(input, label);
  exactKeys(value, [
    'origin_kind', 'received', 'local_derivation',
    ...(Object.hasOwn(value, 'author_label') ? ['author_label'] : []),
    ...(Object.hasOwn(value, 'source_label') ? ['source_label'] : []),
    ...(Object.hasOwn(value, 'license_label') ? ['license_label'] : []),
    ...(Object.hasOwn(value, 'attribution_text') ? ['attribution_text'] : []),
  ], label);
  if (
    value.origin_kind !== 'authored_here' &&
    value.origin_kind !== 'built_in' &&
    value.origin_kind !== 'unknown'
  ) {
    throw new BackupValidationError(`${label}.origin_kind is unsupported.`);
  }
  if (typeof value.received !== 'boolean') {
    throw new BackupValidationError(`${label}.received must be boolean.`);
  }
  if (typeof value.local_derivation !== 'boolean') {
    throw new BackupValidationError(`${label}.local_derivation must be boolean.`);
  }
  const labels = ['author_label', 'source_label', 'license_label'] as const;
  for (const key of labels) {
    const member = value[key];
    if (
      member !== undefined &&
      (typeof member !== 'string' || member.length < 1 ||
        member.length > CONTENT_PROVENANCE_LIMITS.label)
    ) {
      throw new BackupValidationError(`${label}.${key} is invalid.`);
    }
  }
  if (
    value.attribution_text !== undefined &&
    (typeof value.attribution_text !== 'string' ||
      new TextEncoder().encode(value.attribution_text).byteLength < 1 ||
      new TextEncoder().encode(value.attribution_text).byteLength >
        CONTENT_PROVENANCE_LIMITS.attributionBytes)
  ) {
    throw new BackupValidationError(`${label}.attribution_text is invalid.`);
  }
  return Object.freeze({
    origin_kind: value.origin_kind,
    received: value.received,
    local_derivation: value.local_derivation,
    ...(typeof value.author_label === 'string'
      ? { author_label: value.author_label }
      : {}),
    ...(typeof value.source_label === 'string'
      ? { source_label: value.source_label }
      : {}),
    ...(typeof value.license_label === 'string'
      ? { license_label: value.license_label }
      : {}),
    ...(typeof value.attribution_text === 'string'
      ? { attribution_text: value.attribution_text }
      : {}),
  });
}

function validatedEntry(
  input: unknown,
  index: number,
  provenanceRequired: boolean,
): PortableContentAggregate {
  const value = backupRecord(input, `Portable content[${String(index)}]`);
  if (typeof value.kind !== 'string' || !(contentKinds as readonly string[]).includes(value.kind)) {
    throw new BackupValidationError(`Portable content[${String(index)}].kind is unsupported.`);
  }
  const kind = value.kind as ContentKind;
  exactKeys(value, [
    'kind', 'content_key', 'key_kind', 'fingerprint_scheme',
    'fingerprint_digest', 'aggregate',
    ...(kind === 'spell' ? ['spell_identity'] : []),
    ...(Object.hasOwn(value, 'provenance') ? ['provenance'] : []),
  ], `Portable content[${String(index)}]`);
  if (provenanceRequired && value.provenance === undefined) {
    throw new BackupValidationError(
      `Portable content[${String(index)}].provenance is required.`,
    );
  }
  if (typeof value.content_key !== 'string' || value.content_key.length === 0) {
    throw new BackupValidationError(`Portable content[${String(index)}].content_key must be non-empty text.`);
  }
  if (value.key_kind !== 'asserted') {
    throw new BackupValidationError(`Portable content[${String(index)}].key_kind must be asserted.`);
  }
  if (!isContentFingerprintScheme(value.fingerprint_scheme)) {
    throw new BackupValidationError(`Portable content[${String(index)}] uses an unsupported fingerprint scheme.`);
  }
  if (typeof value.fingerprint_digest !== 'string' || !/^[0-9a-f]{64}$/u.test(value.fingerprint_digest)) {
    throw new BackupValidationError(`Portable content[${String(index)}].fingerprint_digest is invalid.`);
  }
  if (!isAssertedExternalContentKey(value.content_key)) {
    throw new BackupValidationError(`Portable content[${String(index)}].content_key is not an asserted external key.`);
  }
  jsonDepth(value.aggregate);
  const aggregate = value.aggregate as PortableContentAggregateValue;
  if (kind === 'subclass') {
    validatePortableSubclassContributions(
      backupRecord(aggregate, 'Portable subclass aggregate'),
      value.content_key as ContentKey,
    );
  }
  const scheme = value.fingerprint_scheme;
  const projected = projectPortableAggregate(kind, aggregate, scheme);
  let expectedKey: ContentKey;
  try {
    expectedKey = assertedExternalContentKeyFromDeclared(
      kind,
      projected.edition,
      projected.name,
      value.content_key,
    );
  } catch {
    throw new BackupValidationError(
      `Portable content[${String(index)}].content_key cannot be derived from its aggregate.`,
    );
  }
  if (expectedKey !== value.content_key) {
    throw new BackupValidationError(
      `Portable content[${String(index)}].content_key does not match its aggregate kind, edition, and name.`,
    );
  }
  const identity = deriveContentIdentityForScheme(scheme, { kind, ...projected });
  if (identity.digest !== value.fingerprint_digest) {
    throw new BackupValidationError(`Portable content[${String(index)}] fingerprint does not match its aggregate.`);
  }
  const spellIdentity = kind === 'spell'
    ? validatedSpellIdentity(value.spell_identity, index)
    : undefined;
  const provenance = value.provenance === undefined
    ? undefined
    : validatedProvenance(
        value.provenance,
        `Portable content[${String(index)}].provenance`,
      );
  return Object.freeze({
    kind,
    content_key: value.content_key,
    key_kind: 'asserted',
    fingerprint_scheme: scheme,
    fingerprint_digest: value.fingerprint_digest as ContentFingerprintDigest,
    aggregate,
    ...(provenance === undefined ? {} : { provenance }),
    ...(spellIdentity === undefined ? {} : { spell_identity: spellIdentity }),
  });
}

function validatedSpellIdentity(
  input: unknown,
  index: number,
): PortableSpellIdentityMetadata {
  const label = `Portable content[${String(index)}].spell_identity`;
  const value = backupRecord(input, label);
  exactKeys(value, ['canonical_name', 'normalized_name', 'aliases'], label);
  if (
    typeof value.canonical_name !== 'string' ||
    value.canonical_name.trim() === ''
  ) {
    throw new BackupValidationError(`${label}.canonical_name must be non-empty text.`);
  }
  if (typeof value.normalized_name !== 'string' || value.normalized_name === '') {
    throw new BackupValidationError(`${label}.normalized_name must be non-empty text.`);
  }
  if (normalizeCatalogName(value.canonical_name) !== value.normalized_name) {
    throw new BackupValidationError(
      `${label}.normalized_name does not match canonical_name normalization.`,
    );
  }
  if (
    !Array.isArray(value.aliases) ||
    value.aliases.some((alias, aliasIndex) => {
      const row = backupRecord(alias, `${label}.aliases[${String(aliasIndex)}]`);
      exactKeys(row, ['alias', 'normalized_alias'], `${label}.aliases[${String(aliasIndex)}]`);
      return typeof row.alias !== 'string' || row.alias.trim() === '' ||
        typeof row.normalized_alias !== 'string' || row.normalized_alias === '' ||
        normalizeCatalogName(row.alias) !== row.normalized_alias;
    })
  ) {
    throw new BackupValidationError(
      `${label}.aliases must contain non-empty aliases with matching normalization.`,
    );
  }
  const aliases = value.aliases as Array<{
    readonly alias: string;
    readonly normalized_alias: string;
  }>;
  const normalized = aliases.map((alias) => alias.normalized_alias);
  if (new Set(normalized).size !== normalized.length) {
    throw new BackupValidationError(`${label}.aliases must be unique after normalization.`);
  }
  return Object.freeze({
    canonical_name: value.canonical_name,
    normalized_name: value.normalized_name,
    aliases: Object.freeze(aliases.map((alias) => Object.freeze({ ...alias }))),
  });
}

export function validatePortableContent(
  input: unknown,
  provenanceRequired = false,
): readonly PortableContentAggregate[] {
  if (!Array.isArray(input)) throw new BackupValidationError('Portable content must be a list.');
  if (input.length > PORTABLE_CONTENT_LIMITS.entries) {
    throw new BackupValidationError(`Portable content must contain at most ${String(PORTABLE_CONTENT_LIMITS.entries)} entries.`);
  }
  // Refuse cycles/hostile depth and encoded size before running any semantic
  // projector. Starting at -2 makes an entry's aggregate the same depth-zero
  // boundary used by validatedEntry below.
  jsonDepth(input, -2);
  const bytes = new TextEncoder().encode(JSON.stringify(input)).byteLength;
  if (bytes > PORTABLE_CONTENT_LIMITS.encodedBytes) {
    throw new BackupValidationError(`Portable content exceeds ${String(PORTABLE_CONTENT_LIMITS.encodedBytes)} bytes.`);
  }
  const entries = input.map((entry, index) =>
    validatedEntry(entry, index, provenanceRequired));
  const identities = new Set<string>();
  for (const entry of entries) {
    const marker = `${entry.kind}\u0000${entry.content_key}`;
    if (identities.has(marker)) throw new BackupValidationError(`Portable content repeats ${entry.kind} '${entry.content_key}'.`);
    identities.add(marker);
  }
  return Object.freeze(entries);
}

export function validatePortableContentBundle(
  input: unknown,
  provenanceRequired = false,
): PortableContentBundle {
  const value = backupRecord(input, 'Portable content bundle');
  exactKeys(value, ['content', 'supersessions'], 'Portable content bundle');
  const content = validatePortableContent(value.content, provenanceRequired);
  if (!Array.isArray(value.supersessions)) {
    throw new BackupValidationError('Portable content supersessions must be a list.');
  }
  const carried = new Set(content.map(
    (entry) => `${entry.kind}\u0000${entry.content_key}`,
  ));
  const seen = new Set<string>();
  const supersessions = value.supersessions.map((inputRow, index) => {
    const label = `Portable content supersessions[${String(index)}]`;
    const row = backupRecord(inputRow, label);
    exactKeys(row, [
      'content_kind', 'superseded_content_key', 'successor_content_key',
      'recorded_at',
    ], label);
    if (
      typeof row.content_kind !== 'string' ||
      !(contentKinds as readonly string[]).includes(row.content_kind) ||
      typeof row.superseded_content_key !== 'string' ||
      row.superseded_content_key === '' ||
      typeof row.successor_content_key !== 'string' ||
      row.successor_content_key === '' ||
      typeof row.recorded_at !== 'string' ||
      row.recorded_at === ''
    ) {
      throw new BackupValidationError(`${label} is invalid.`);
    }
    if (row.superseded_content_key === row.successor_content_key) {
      throw new BackupValidationError(`${label} must name distinct versions.`);
    }
    const kind = row.content_kind as ContentKind;
    if (
      !carried.has(`${kind}\u0000${row.superseded_content_key}`) ||
      !carried.has(`${kind}\u0000${row.successor_content_key}`)
    ) {
      throw new BackupValidationError(`${label} must name carried content.`);
    }
    const marker = `${kind}\u0000${row.superseded_content_key}`;
    if (seen.has(marker)) {
      throw new BackupValidationError(`${label} repeats a superseded version.`);
    }
    seen.add(marker);
    return Object.freeze({
      content_kind: kind,
      superseded_content_key: row.superseded_content_key,
      successor_content_key: row.successor_content_key,
      recorded_at: row.recorded_at,
    });
  });
  return Object.freeze({ content, supersessions: Object.freeze(supersessions) });
}

export function validateLibraryDocument(input: unknown): asserts input is LibraryExportDocument {
  const value = backupRecord(input, 'Library export');
  exactKeys(value, [
    'format', 'version', 'exported_at', 'selection',
    'selected_content_keys', 'content',
    ...(value.version === LIBRARY_EXPORT_VERSION ? ['supersessions', 'lifecycle'] :
      value.version === PRE_PROVENANCE_LIBRARY_EXPORT_VERSION ? ['supersessions'] : []),
  ], 'Library export');
  if (
    value.format !== LIBRARY_EXPORT_FORMAT ||
    value.version !== LIBRARY_EXPORT_VERSION &&
      value.version !== PRE_PROVENANCE_LIBRARY_EXPORT_VERSION &&
      value.version !== LEGACY_LIBRARY_EXPORT_VERSION
  ) {
    throw new BackupValidationError('Unsupported library export format or version.');
  }
  if (typeof value.exported_at !== 'string' || new Date(value.exported_at).toISOString() !== value.exported_at) {
    throw new BackupValidationError('Library export exported_at must be an ISO date string.');
  }
  if (value.selection !== 'all' && value.selection !== 'selected') {
    throw new BackupValidationError('Library export selection must be all or selected.');
  }
  if (!Array.isArray(value.selected_content_keys) || value.selected_content_keys.some(
    (key) => typeof key !== 'string' || key.length === 0,
  )) {
    throw new BackupValidationError('Library export selected_content_keys must be a text list.');
  }
  const selectedKeys = value.selected_content_keys as string[];
  if (
    new Set(selectedKeys).size !== selectedKeys.length ||
    selectedKeys.some((key, index) => index > 0 && selectedKeys[index - 1]!.localeCompare(key) >= 0)
  ) {
    throw new BackupValidationError('Library export selected_content_keys must be unique and sorted.');
  }
  const content = validatePortableContent(
    value.content,
    value.version === LIBRARY_EXPORT_VERSION,
  );
  validatePortableContentBundle({
    content,
    supersessions: value.supersessions ?? [],
  });
  const carriedKeys = new Set(content.map((entry) => entry.content_key));
  const carriedMarkers = new Set(content.map(
    (entry) => `${entry.kind}\u0000${entry.content_key}`,
  ));
  if (selectedKeys.some((key) => !carriedKeys.has(key))) {
    throw new BackupValidationError('Library export selected_content_keys must name carried content.');
  }
  if (value.version === LIBRARY_EXPORT_VERSION) {
    if (!Array.isArray(value.lifecycle) || value.lifecycle.length !== content.length) {
      throw new BackupValidationError('Library export lifecycle must name every carried entry.');
    }
    const lifecycleMarkers = new Set<string>();
    for (const [index, inputLifecycle] of value.lifecycle.entries()) {
      const lifecycle = backupRecord(
        inputLifecycle,
        `Library export lifecycle[${String(index)}]`,
      );
      exactKeys(
        lifecycle,
        ['content_kind', 'content_key', 'archived_at'],
        `Library export lifecycle[${String(index)}]`,
      );
      if (
        typeof lifecycle.content_kind !== 'string' ||
        !(contentKinds as readonly string[]).includes(lifecycle.content_kind) ||
        typeof lifecycle.content_key !== 'string' ||
        lifecycle.content_key.length === 0 ||
        lifecycle.archived_at !== null && (
          typeof lifecycle.archived_at !== 'string' ||
          !Number.isFinite(Date.parse(lifecycle.archived_at)) ||
          new Date(lifecycle.archived_at).toISOString() !== lifecycle.archived_at
        )
      ) {
        throw new BackupValidationError(
          `Library export lifecycle[${String(index)}] is invalid.`,
        );
      }
      const marker = `${lifecycle.content_kind}\u0000${lifecycle.content_key}`;
      if (!carriedMarkers.has(marker) || lifecycleMarkers.has(marker)) {
        throw new BackupValidationError(
          `Library export lifecycle[${String(index)}] must uniquely name carried content.`,
        );
      }
      lifecycleMarkers.add(marker);
    }
    if (lifecycleMarkers.size !== content.length) {
      throw new BackupValidationError('Library export lifecycle must name every carried entry.');
    }
  }
}

/** Restore library-only lifecycle after content targets have been resolved. */
export function restorePortableContentLifecycle(
  db: DatabaseContext,
  input: unknown,
  targets: ReadonlyMap<string, ContentKey>,
): void {
  validateLibraryDocument(input);
  const lifecycle = 'lifecycle' in input ? input.lifecycle : input.content.map((entry) => ({
    content_kind: entry.kind,
    content_key: entry.content_key,
    archived_at: null,
  }));
  for (const entry of lifecycle) {
    const target = targets.get(
      `${entry.content_kind}\u0000${entry.content_key}`,
    );
    // Lifecycle belongs to the recipient once an aggregate already exists.
    // Only identities created by this import receive the sender's state.
    if (target === undefined) continue;
    const updated = db.exec(
      `UPDATE catalog_content_identities SET archived_at = ?
       WHERE content_kind = ? AND content_key = ?`,
      [entry.archived_at, entry.content_kind, target],
    );
    if (updated.changes !== 1) {
      throw new BackupValidationError(
        `Library lifecycle target '${target}' is missing.`,
      );
    }
  }
}

function referenceContentKey(
  db: DatabaseContext,
  reference: { readonly kind: ContentKind; readonly scheme: string; readonly digest: string },
): ContentKey {
  const key = db.scalar<string>(
    `SELECT content_key FROM catalog_content_fingerprints
     WHERE content_kind = ? AND fingerprint_scheme = ?
       AND fingerprint_digest = ? AND fingerprint_role IN ('current', 'compatible')`,
    [reference.kind, reference.scheme, reference.digest],
  );
  if (key === null) throw new BackupValidationError(`Unresolved portable ${reference.kind} dependency '${reference.digest}'.`);
  return key as ContentKey;
}

function subclassCaster(progression: SubclassContentAggregate['progression']): {
  readonly ability: string | null;
  readonly fraction: string | null;
  readonly rounding: string | null;
} {
  if (progression.mode === 'inherit_parent') return { ability: null, fraction: null, rounding: null };
  if (progression.mode === 'root_only') {
    return {
      ability: progression.spellcasting_ability,
      fraction: progression.caster_fraction,
      rounding: progression.caster_rounding,
    };
  }
  const map = {
    full: ['1', null],
    half_up: ['1/2', 'up'],
    half_down: ['1/2', 'down'],
    third_up: ['1/3', 'up'],
    third_down: ['1/3', 'down'],
  } as const;
  if (progression.caster_contribution === 'pact') {
    throw new BackupValidationError('Portable subclass pact progression is not representable in storage.');
  }
  const [fraction, rounding] = map[progression.caster_contribution];
  return { ability: progression.spellcasting_ability, fraction, rounding };
}

function slotsJson(counts: readonly number[]): string {
  return JSON.stringify(Object.fromEntries(
    counts.flatMap((count, index) => count === 0 ? [] : [[String(index + 1), count]]),
  ));
}

function featureEffectValues(effect: AuthoringFeatureEffect) {
  const common: EffectColumns = effect.kind === 'extra_attack'
    ? {
        damage_type: null,
        hit_points_flat: null,
        hit_points_per_level: null,
        speed_bonus_feet: null,
        ability: null,
        amount: null,
        maximum: null,
        base: null,
        ability_1: null,
        ability_2: null,
        allows_shield: null,
        weapon_scope: null,
      }
    : effectColumns(effect);
  return {
    ...common,
    attack_count: effect.kind === 'extra_attack' ? effect.attack_count : null,
    weapon_scope: 'weapon_scope' in effect ? effect.weapon_scope : common.weapon_scope,
  };
}

function installSubclass(
  db: DatabaseContext,
  aggregate: SubclassContentAggregate,
  contentKey: ContentKey,
): void {
  if (db.scalar<number>('SELECT 1 FROM subclass_definitions WHERE content_key = ?', [contentKey]) === 1) return;
  const parentKey = referenceContentKey(db, aggregate.parent_class);
  const parentId = db.scalar<number>('SELECT id FROM class_definitions WHERE content_key = ?', [parentKey]);
  if (parentId === null) throw new BackupValidationError(`Portable subclass parent '${parentKey}' is unavailable.`);
  const caster = subclassCaster(aggregate.progression);
  const now = new Date().toISOString();
  const subclassId = db.exec(
    `INSERT INTO subclass_definitions (
       content_key, class_definition_id, name, rules_edition,
       spellcasting_ability, caster_fraction, caster_rounding, grant_rules,
       notes, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [contentKey, parentId, aggregate.name, aggregate.rules_edition,
      caster.ability, caster.fraction, caster.rounding,
      portableStoredGrantRules(db, aggregate.grants), aggregate.reference_text,
      now, now],
  ).lastInsertId;
  if (aggregate.progression.mode === 'override') {
    for (const row of aggregate.progression.rows) {
      db.exec(
        `INSERT INTO subclass_progressions (
           subclass_definition_id, class_level, cantrips_known, prepared_count,
           max_spell_level, slots, grant_rules, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [subclassId, row.class_level, row.cantrips_known,
          row.prepared_or_known_count, row.maximum_spell_level,
          slotsJson(row.slot_counts), portableStoredGrantRules(db, row.grants),
          now, now],
      );
    }
  }
  for (const feature of aggregate.features) {
    const featureId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, class_level, sort_order, name, description,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [subclassId, feature.class_level, feature.sort_order, feature.name,
        feature.description, now, now],
    ).lastInsertId;
    for (const effect of feature.effects) {
      const fields = featureEffectValues(effect);
      db.exec(
        `INSERT INTO subclass_feature_effects (
           subclass_feature_id, sort_order, effect_kind, damage_type,
           hit_points_flat, hit_points_per_level, speed_bonus_feet, ability,
           amount, maximum, base, ability_1, ability_2, allows_shield,
           weapon_scope, attack_count, label, notes, created_at, updated_at
         ) VALUES (${Array.from({ length: 20 }, () => '?').join(', ')})`,
        [featureId, effect.sort_order, effect.kind, fields.damage_type,
          fields.hit_points_flat, fields.hit_points_per_level,
          fields.speed_bonus_feet, fields.ability, fields.amount, fields.maximum,
          fields.base, fields.ability_1, fields.ability_2, fields.allows_shield,
          fields.weapon_scope, fields.attack_count, effect.label, effect.notes,
          now, now],
      );
    }
    for (const contribution of feature.contributions ?? []) {
      const target = contribution.target;
      if (
        target.kind === 'resource_maximum' &&
        typeof target.resource === 'string'
      ) {
        throw new BackupValidationError(
          'Portable subclass resource contributions require authored display configuration.',
        );
      }
      let targetKey: string;
      let resourceDisplayLabel: string | null;
      let resourceMarkingShape: string | null;
      if (target.kind === 'feature_dice_count') {
        targetKey = target.key;
        resourceDisplayLabel = null;
        resourceMarkingShape = null;
      } else {
        const resource = target.resource;
        if (typeof resource === 'string') {
          throw new BackupValidationError(
            'Portable subclass resource contributions require authored display configuration.',
          );
        }
        targetKey = resource.fact_key;
        resourceDisplayLabel = resource.display_label;
        resourceMarkingShape = resource.marking_shape;
      }
      db.exec(
        `INSERT INTO subclass_feature_value_contributions (
           subclass_feature_id, contribution_key, label, target_kind,
           target_key, op, active_from_level, active_to_level, value_json,
           supersedes_ref, resource_display_label, resource_marking_shape,
           created_at, updated_at
         ) VALUES (${Array.from({ length: 14 }, () => '?').join(', ')})`,
        [featureId, contribution.contribution_key, contribution.label,
          target.kind, targetKey, contribution.op,
          contribution.active_from_level, contribution.active_to_level,
          JSON.stringify(contribution.value),
          contribution.supersedes === undefined
            ? null
            : JSON.stringify({
                content_key: contribution.supersedes.content_key,
                contribution_key: contribution.supersedes.contribution_key,
              }),
          resourceDisplayLabel, resourceMarkingShape, now, now],
      );
    }
  }
}

function memberValue<T>(member: T | { readonly value: T }): T {
  return member !== null && typeof member === 'object' && 'value' in member
    ? member.value
    : member as T;
}

function installSpell(
  db: DatabaseContext,
  aggregate: SpellContentAggregateV1,
  metadata: PortableSpellIdentityMetadata,
  contentKey: ContentKey,
): void {
  const versionAlreadyInstalled = db.scalar<number>(
    'SELECT 1 FROM spell_versions WHERE content_key = ?',
    [contentKey],
  ) === 1;
  const now = new Date().toISOString();
  const existingIdentity = db.oneRaw(
    `SELECT id, canonical_name, normalized_name
     FROM spell_identities WHERE content_key = ?`,
    [aggregate.spell_identity_key],
  );
  let identityId: number;
  if (existingIdentity === null) {
    identityId = db.exec(
      `INSERT INTO spell_identities (
         content_key, canonical_name, normalized_name, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?)`,
      [aggregate.spell_identity_key, metadata.canonical_name,
        metadata.normalized_name, now, now],
    ).lastInsertId;
  } else {
    identityId = Number(existingIdentity.id);
    if (
      existingIdentity.canonical_name !== metadata.canonical_name ||
      existingIdentity.normalized_name !== metadata.normalized_name
    ) {
      throw new BackupValidationError(
        `Portable spell identity '${aggregate.spell_identity_key}' conflicts with local identity metadata.`,
      );
    }
  }
  for (const alias of metadata.aliases) {
    const existingAlias = db.oneRaw(
      `SELECT spell_identity_id, alias FROM spell_identity_aliases
       WHERE normalized_alias = ?`,
      [alias.normalized_alias],
    );
    if (existingAlias !== null) {
      if (
        Number(existingAlias.spell_identity_id) === identityId &&
        existingAlias.alias === alias.alias
      ) continue;
      throw new BackupValidationError(
        `Portable spell alias '${alias.alias}' conflicts with a local identity.`,
      );
    }
    db.exec(
      `INSERT INTO spell_identity_aliases (
         spell_identity_id, alias, normalized_alias, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?)`,
      [identityId, alias.alias, alias.normalized_alias, now, now],
    );
  }
  if (versionAlreadyInstalled) return;
  const versionId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition, level,
       school, ritual, concentration, casting_time, action_type, range,
       range_kind, range_feet, area_shape, area_feet, duration, components,
       material_component_summary, material_cost_copper, material_cost_kind,
       healing, short_summary, upcast_summary, cantrip_upgrade_summary,
       requires_mod_for_effect, effect_reliability_category, provenance,
       is_active, created_at, updated_at
     ) VALUES (${Array.from({ length: 30 }, () => '?').join(', ')})`,
    [contentKey, identityId, aggregate.name, aggregate.rules_edition,
      aggregate.level, aggregate.school, aggregate.ritual ? 1 : 0,
      aggregate.concentration ? 1 : 0, aggregate.casting_time,
      aggregate.action_type, aggregate.range, aggregate.range_kind,
      aggregate.range_feet, aggregate.area_shape, aggregate.area_feet,
      aggregate.duration, aggregate.components,
      aggregate.material_component_summary, aggregate.material_cost_copper,
      aggregate.material_cost_kind, aggregate.healing ? 1 : 0,
      aggregate.short_summary, aggregate.upcast_summary,
      aggregate.cantrip_upgrade_summary,
      aggregate.requires_mod_for_effect ? 1 : 0,
      aggregate.effect_reliability_category, 'import', 1, now, now],
  ).lastInsertId;
  const pivots = [
    ['spell_list_memberships', 'spell_list_key', aggregate.spell_lists],
    ['spell_version_tags', 'tag', aggregate.tags],
    ['spell_version_attack_modes', 'attack_mode', aggregate.attack_modes],
    ['spell_version_save_abilities', 'save_ability', aggregate.save_abilities],
    ['spell_version_upcast_levels', 'level', aggregate.upcast_levels],
    ['spell_version_cantrip_upgrade_levels', 'level', aggregate.cantrip_upgrade_levels],
  ] as const;
  for (const [table, column, members] of pivots) {
    for (const member of members) {
      db.exec(
        `INSERT INTO ${table} (spell_version_id, ${column}) VALUES (?, ?)`,
        [versionId, memberValue<string | number>(member as
          | string
          | number
          | { readonly value: string | number })],
      );
    }
  }
}

function portableNode(
  db: DatabaseContext,
  entry: PortableContentAggregate,
  allowReferenceKey = false,
): ContentImportNode {
  const withScheme = (node: ContentImportNode): ContentImportNode => {
    if (entry.fingerprint_scheme === CONTENT_FINGERPRINT_SCHEME_V1) {
      return node;
    }
    const stamp = (
      projection: ContentImportProjection,
    ): ContentImportProjection => ({
      ...projection,
      fingerprintScheme: entry.fingerprint_scheme,
    });
    return Object.freeze({
      ...node,
      projection: stamp(node.projection),
      ...(node.reproject === undefined
        ? {}
        : {
            reproject: (
              input: Parameters<NonNullable<ContentImportNode['reproject']>>[0],
            ) => stamp(node.reproject!(input)),
          }),
    });
  };
  const projected = projectPortableAggregate(
    entry.kind,
    entry.aggregate,
    entry.fingerprint_scheme,
  );
  const assertedKey = entry.content_key as ContentKey;
  if (!allowReferenceKey && !isAssertedExternalContentKey(assertedKey)) {
    throw new BackupValidationError(`Portable asserted key '${entry.content_key}' is invalid.`);
  }
  switch (entry.kind) {
    case 'class':
    case 'feat':
    case 'background':
      return withScheme(portableSourceContentImportNode(
        db,
        entry.aggregate as SourceAggregate,
        assertedKey,
      ));
    case 'species':
      return withScheme(entry.fingerprint_scheme === CONTENT_FINGERPRINT_SCHEME_V2
        ? portableSpeciesContentImportNodeV2(
            db,
            entry.aggregate as SpeciesProjectorAggregateV2,
            assertedKey,
          )
        : portableSourceContentImportNode(
            db,
            entry.aggregate as SourceAggregate,
            assertedKey,
          ));
    case 'weapon':
    case 'armor':
    case 'item':
      return withScheme(portableEquipmentContentImportNode(
        entry.aggregate as EquipmentContentAggregate,
        assertedKey,
      ));
    case 'subclass':
    case 'spell': {
      const spellIdentity = entry.kind === 'spell'
        ? entry.spell_identity
        : undefined;
      if (entry.kind === 'spell' && spellIdentity === undefined) {
        throw new BackupValidationError(
          `Portable spell '${entry.content_key}' is missing identity metadata.`,
        );
      }
      const build = (
          name: string,
          nextKey: ContentKey,
        dependencies: ReadonlyMap<string, ContentImportDependencyTarget>,
      ): ContentImportProjection => {
        const aggregate = remapProjectionFingerprintReferences(
          { ...entry.aggregate, name,
            ...(entry.kind === 'spell' ? { spell_version_key: nextKey } : {}) },
          dependencies,
        ) as SubclassContentAggregate | SpellContentAggregateV1;
        const current = projectPortableAggregate(
          entry.kind,
          aggregate,
          entry.fingerprint_scheme,
        );
        const localSubclass = entry.kind === 'subclass'
          ? db.oneRaw(
              'SELECT name, rules_edition FROM subclass_definitions WHERE content_key = ?',
              [nextKey],
            )
          : null;
        return {
          kind: entry.kind,
          edition: current.edition,
          name: current.name,
          assertedKey: nextKey,
          payload: current.payload,
          metadataConflict: localSubclass !== null && (
            localSubclass.name !== current.name ||
            localSubclass.rules_edition !== current.edition
          ),
          installExact: entry.kind === 'spell',
          projectStored: (database, contentKey) =>
            projectStoredContentV1(database, entry.kind, contentKey),
          install: (database, contentKey) => {
            if (entry.kind === 'subclass') {
              installSubclass(database, aggregate as SubclassContentAggregate, contentKey);
            } else {
              installSpell(
                database,
                aggregate as SpellContentAggregateV1,
                spellIdentity as PortableSpellIdentityMetadata,
                contentKey,
              );
            }
          },
        };
      };
      return withScheme(Object.freeze({
        id: `portable:${entry.kind}:${entry.content_key}`,
        projection: build(projected.name, assertedKey, new Map()),
        reproject: (
          input: Parameters<NonNullable<ContentImportNode['reproject']>>[0],
        ) => build(input.name, input.assertedKey, input.dependencies),
      }));
    }
  }
}

/**
 * The one immutable subclass installer used by portable import and HA-5
 * publishing. Keeping authoring on this node means preview and commit exercise
 * the same projection, dependency remap, and aggregate write as restore.
 */
export function portableSubclassContentImportNode(
  db: DatabaseContext,
  aggregate: SubclassContentAggregate,
  assertedKey: ContentKey,
): ContentImportNode<'subclass'> {
  const projected = projectAuthoredContentAggregateV1(aggregate);
  const identity = deriveContentIdentityV1({
    kind: 'subclass',
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload: projected.payload,
  });
  return portableNode(db, {
    kind: 'subclass',
    content_key: assertedKey,
    key_kind: 'asserted',
    fingerprint_scheme: identity.envelope.scheme,
    fingerprint_digest: identity.digest,
    aggregate,
    provenance: {
      origin_kind: 'authored_here', received: false, local_derivation: false,
    },
  }) as ContentImportNode<'subclass'>;
}

/**
 * Convert a recipient-local candidate into the CI-4a adoption shape for a
 * reference-only character share. The share contributes no aggregate bytes:
 * this projection exists only so the common Clone choice can copy and rename
 * the matched local aggregate. Match continues to resolve the incoming key.
 */
function projectedLocalContentReferenceImportNode(
  db: DatabaseContext,
  input: {
    readonly id: string;
    readonly kind: ContentKind;
    readonly incomingContentKey: ContentKey;
    readonly localContentKey: ContentKey;
    readonly allowRememberedDecision?: boolean;
  },
  source: 'cross-boundary' | 'installed-target',
): ContentImportNode {
  const scheme = db.scalar<string>(
    `SELECT fingerprint_scheme FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ?
       AND fingerprint_role = 'current'`,
    [input.kind, input.localContentKey],
  );
  if (!isContentFingerprintScheme(scheme)) {
    throw new BackupValidationError(
      `Stored ${input.kind} '${input.localContentKey}' has no supported current fingerprint.`,
    );
  }
  const stored = scheme === CONTENT_FINGERPRINT_SCHEME_V1
    ? projectStoredPortableContentV1(db, input.kind, input.localContentKey)
    : projectStoredPortableContentV2(db, input.kind, input.localContentKey);
  const aggregate = stored.aggregate as PortableContentAggregateValue;
  const identity = deriveContentIdentityForScheme(scheme, {
    kind: input.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload: stored.payload,
  });
  const certificate = source === 'installed-target'
    ? certifyInstalledTargetReference(db, {
        kind: input.kind,
        contentKey: input.localContentKey,
        fingerprint: {
          scheme: identity.envelope.scheme,
          digest: identity.digest,
          canonicalJson: identity.canonicalJson,
        },
      })
    : null;
  const base = portableNode(db, {
    kind: input.kind,
    content_key: input.incomingContentKey,
    key_kind: 'asserted',
    fingerprint_scheme: scheme,
    fingerprint_digest: identity.digest,
    aggregate,
    ...(input.kind === 'spell'
      ? {
          spell_identity: portableSpellIdentityMetadata(
            db,
            aggregate as SpellContentAggregateV1,
          ),
        }
      : {}),
  }, true);
  const withReference = (
    projection: ContentImportProjection,
  ): ContentImportProjection => Object.freeze({
    ...projection,
    ...(input.allowRememberedDecision === undefined
      ? {}
      : { allowRememberedDecision: input.allowRememberedDecision }),
    referenceOnly: certificate === null
      ? Object.freeze({
          source: 'cross-boundary' as const,
          contentKey: input.incomingContentKey,
        })
      : Object.freeze({
          source: 'installed-target' as const,
          contentKey: input.incomingContentKey,
          certificate,
        }),
  });
  return Object.freeze({
    id: input.id,
    projection: withReference(base.projection),
    reproject: (
      reprojection: Parameters<NonNullable<ContentImportNode['reproject']>>[0],
    ) => {
      const projected = base.reproject?.(reprojection) ?? {
        ...base.projection,
        name: reprojection.name,
        assertedKey: reprojection.assertedKey,
      };
      return reprojection.assertedKey === input.incomingContentKey
        ? withReference(projected)
        : projected;
    },
  });
}

/** Cross-user reference construction: local recomputation is not evidence. */
export function localContentReferenceImportNode(
  db: DatabaseContext,
  input: {
    readonly id: string;
    readonly kind: ContentKind;
    readonly incomingContentKey: ContentKey;
    readonly localContentKey: ContentKey;
    readonly allowRememberedDecision?: boolean;
  },
): ContentImportNode {
  return projectedLocalContentReferenceImportNode(db, input, 'cross-boundary');
}

/** Same-database construction certified from the complete installed aggregate. */
export function installedTargetContentReferenceImportNode(
  db: DatabaseContext,
  input: {
    readonly id: string;
    readonly kind: ContentKind;
    readonly incomingContentKey: ContentKey;
    readonly localContentKey: ContentKey;
    readonly allowRememberedDecision?: boolean;
  },
): ContentImportNode {
  const resolution = resolveContentReference(db, {
    kind: input.kind,
    contentKey: input.incomingContentKey,
  });
  if (
    resolution.kind === 'missing' ||
    resolution.kind === 'ambiguous' ||
    resolution.contentKey !== input.localContentKey
  ) {
    throw new BackupValidationError(
      `Installed ${input.kind} target '${input.localContentKey}' does not resolve from '${input.incomingContentKey}'.`,
    );
  }
  return projectedLocalContentReferenceImportNode(db, input, 'installed-target');
}

export function portableContentImportNodes(
  db: DatabaseContext,
  input: unknown,
): readonly ContentImportNode[] {
  return Object.freeze(validatePortableContent(input).map((entry) => portableNode(db, entry)));
}

/** Restore immutable recipient-local lineage after every aggregate is present. */
export function restorePortableContentSupersessions(
  db: DatabaseContext,
  input: unknown,
  targets: ReadonlyMap<string, ContentKey>,
): void {
  const bundle = validatePortableContentBundle(input);
  for (const entry of bundle.content) {
    const target = targets.get(
      `${entry.kind}\u0000${entry.content_key}`,
    ) ?? entry.content_key as ContentKey;
    const carried = entry.provenance ?? {
      origin_kind: 'unknown' as const,
      received: false,
      local_derivation: false,
    };
    recordContentProvenance(db, {
      kind: entry.kind,
      contentKey: target,
      provenance: Object.freeze({ ...carried, received: true }),
    });
  }
  for (const edge of bundle.supersessions) {
    const superseded = targets.get(
      `${edge.content_kind}\u0000${edge.superseded_content_key}`,
    ) ?? edge.superseded_content_key as ContentKey;
    const successor = targets.get(
      `${edge.content_kind}\u0000${edge.successor_content_key}`,
    ) ?? edge.successor_content_key as ContentKey;
    const existing = db.oneRaw(
      `SELECT successor_content_key, recorded_at
       FROM catalog_content_supersessions
       WHERE content_kind = ? AND superseded_content_key = ?`,
      [edge.content_kind, superseded],
    );
    if (existing !== null) {
      if (
        String(existing.successor_content_key) !== successor ||
        String(existing.recorded_at) !== edge.recorded_at
      ) {
        throw new BackupValidationError(
          `Portable ${edge.content_kind} lineage for '${superseded}' conflicts with the recipient.`,
        );
      }
      continue;
    }
    db.exec(
      `INSERT INTO catalog_content_supersessions (
         content_kind, superseded_content_key, successor_content_key, recorded_at
       ) VALUES (?, ?, ?, ?)`,
      [edge.content_kind, superseded, successor, edge.recorded_at],
    );
  }
}

export function libraryContentImportNodes(
  db: DatabaseContext,
  input: unknown,
): readonly ContentImportNode[] {
  validateLibraryDocument(input);
  return portableContentImportNodes(db, input.content);
}
