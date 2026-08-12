import type { SqlRow } from '../db/codecs';
import {
  sqlInteger,
  sqlNullableString,
  sqlString,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { CharacterId, ContentKey } from '../domain/ids';
import type { JsonValue } from '../domain/models';
import { skills, spellSchool, type RulesEdition, type Skill } from '../domain/enums';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  type ContentKind,
} from '../catalog/content-identity';
import {
  readStoredAuthoredContentAggregateV1,
  storedAuthoredRegistryReferencesV1,
} from '../catalog/stored-authored-content-projector-v1';
import type {
  SpeciesProjectorAggregateV1,
  SpeciesProjectorCharacterEffectV1,
} from '../catalog/authored-content-projector-contract-v1';
import type {
  AuthoredContentKind,
  AuthoringErrorData,
  AuthoringDraftGrant,
  AuthoringGrant,
  AuthoringLibrary,
  BackgroundAuthoringReferences,
  SpellGrantAuthoringReferences,
  BackgroundAuthoringDraft,
  BackgroundAuthoringDraftEquipment,
  BackgroundContentAggregate,
  ContentFingerprintReference,
  ContentUsage,
  ContentUsageList,
  DraftRevision,
  HomebrewDraft,
  HomebrewDraftSummary,
  PublishedHomebrewSummary,
  PublishDecision,
  PublishPreview,
  PublishResult,
  ReplacementChoiceSelection,
  ReplacementDecision,
  ReplacementPlan,
  ReplacementResult,
  ReplacementSetCommit,
  ReplacementSetPlan,
  ReplacementSetResult,
  SpeciesAuthoringDraft,
  StoredHomebrewDraft,
  SubclassAuthoringDraft,
  SubclassAuthoringDraftContribution,
  SubclassContentAggregate,
  SubclassFeatureValueContribution,
} from './contracts';
import { catalogLayerDisclosure } from '../catalog/catalog-disclosure';
import { selectableCatalogContentSql } from '../queries/selectable-catalog-content';
import type {
  AuthoringCharacterEffect,
  AuthoringDraftCharacterEffect,
  AuthoringDraftFeatureEffect,
  AuthoringFeatureEffect,
} from './effect-forms';
import {
  decodeStoredDraft,
  DraftCodecError,
  encodeCurrentDraft,
} from './draft-codecs';
import type { HomebrewDraftItemUuid, HomebrewDraftUuid } from './ids';
import type { PublishPlanToken } from './ids';
import {
  commitSpeciesPublish,
  previewSpeciesPublish,
  publishTokenDraftUuid,
  SpeciesPublishError,
  SpeciesSemanticValidationError,
} from './species-publisher';
import {
  BackgroundPublishError,
  BackgroundSemanticValidationError,
  commitBackgroundPublish,
  previewBackgroundPublish,
} from './background-publisher';
import {
  commitSubclassPublish,
  previewSubclassPublish,
  SubclassPublishError,
  SubclassSemanticValidationError,
} from './subclass-publisher';
import type { ReplacementPlanToken } from './ids';
import {
  commitReferenceRetarget,
  previewReferenceRetarget,
  ReferenceRetargetError,
} from './reference-retarget';

interface DraftRow {
  readonly draft_uuid: HomebrewDraftUuid;
  readonly content_kind: AuthoredContentKind;
  readonly document_version: number;
  readonly base_content_key: ContentKey | null;
  readonly revision: DraftRevision;
  readonly document_json: string;
  readonly created_at: string;
  readonly updated_at: string;
}

interface PublishedRow {
  readonly content_key: ContentKey;
  readonly content_kind: AuthoredContentKind;
  readonly name: string;
  readonly rules_edition: PublishedHomebrewSummary['rules_edition'];
  readonly superseded_by: ContentKey | null;
}

export class AuthoringServiceError extends Error {
  constructor(
    message: string,
    readonly data: AuthoringErrorData,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AuthoringServiceError';
  }
}

export interface CatalogAuthoringServiceOptions {
  readonly randomUuid?: () => string;
  readonly now?: () => string;
}

function authoredKind(value: string): AuthoredContentKind {
  switch (value) {
    case 'species':
    case 'subclass':
    case 'background':
      return value;
  }
  throw new TypeError(`Stored draft has unknown content kind "${value}".`);
}

function draftRow(row: SqlRow): DraftRow {
  return {
    draft_uuid: sqlString(row, 'draft_uuid') as HomebrewDraftUuid,
    content_kind: authoredKind(sqlString(row, 'content_kind')),
    document_version: sqlInteger(row, 'document_version'),
    base_content_key: sqlNullableString(row, 'base_content_key') as ContentKey | null,
    revision: sqlInteger(row, 'revision') as DraftRevision,
    document_json: sqlString(row, 'document_json'),
    created_at: sqlString(row, 'created_at'),
    updated_at: sqlString(row, 'updated_at'),
  };
}

function publishedRow(row: SqlRow): PublishedRow {
  const edition = rulesEdition(sqlString(row, 'rules_edition'));
  return {
    content_key: sqlString(row, 'content_key') as ContentKey,
    content_kind: authoredKind(sqlString(row, 'content_kind')),
    name: sqlString(row, 'name'),
    rules_edition: edition,
    superseded_by: sqlNullableString(row, 'superseded_by') as ContentKey | null,
  };
}

function rulesEdition(edition: string): RulesEdition {
  if (edition !== '2014' && edition !== '2024' && edition !== 'expanded') {
    throw new TypeError(`Published content has unknown rules edition "${edition}".`);
  }
  return edition;
}

function validationError(error: DraftCodecError): AuthoringServiceError {
  return new AuthoringServiceError('Draft validation failed.', {
    reason: 'validation_failed',
    issues: error.issues,
  }, { cause: error });
}

function publishServiceError(error: unknown): never {
  if (error instanceof SpeciesSemanticValidationError) {
    throw new AuthoringServiceError('Species publish validation failed.', {
      reason: 'validation_failed',
      issues: error.issues,
    }, { cause: error });
  }
  if (error instanceof SpeciesPublishError) {
    throw new AuthoringServiceError(error.message, error.data, { cause: error });
  }
  if (error instanceof BackgroundSemanticValidationError) {
    throw new AuthoringServiceError('Background publish validation failed.', {
      reason: 'validation_failed',
      issues: error.issues,
    }, { cause: error });
  }
  if (error instanceof BackgroundPublishError) {
    throw new AuthoringServiceError(error.message, error.data, { cause: error });
  }
  if (error instanceof SubclassSemanticValidationError) {
    throw new AuthoringServiceError('Subclass publish validation failed.', {
      reason: 'validation_failed',
      issues: error.issues,
    }, { cause: error });
  }
  if (error instanceof SubclassPublishError) {
    throw new AuthoringServiceError(error.message, error.data, { cause: error });
  }
  throw error;
}

function replacementServiceError(error: unknown): never {
  if (error instanceof ReferenceRetargetError) {
    throw new AuthoringServiceError(error.message, error.data, { cause: error });
  }
  throw error;
}

function itemUuid(randomUuid: () => string): HomebrewDraftItemUuid {
  return randomUuid() as HomebrewDraftItemUuid;
}

function emptyDraft(kind: AuthoredContentKind): HomebrewDraft {
  const common = {
    document_version: 1 as const,
    name: '',
    rules_edition: null,
    reference_text: '',
  };
  switch (kind) {
    case 'species':
      return {
        kind,
        ...common,
        creature_type: '',
        primary_size: '',
        alternate_size: null,
        walking_speed_feet: null,
        traits: [],
        grants: [],
      };
    case 'background':
      return {
        kind,
        ...common,
        suggested_abilities: [],
        default_origin_feat_content_key: null,
        default_origin_feat_display_name: null,
        skill_proficiencies: [],
        tool_reference_text: null,
        equipment_option_a_description: '',
        equipment_option_b_description: '',
        equipment_option_a: [],
        equipment_option_b: [],
        effects: [],
      };
    case 'subclass':
      return {
        kind,
        ...common,
        parent_class_content_key: null,
        progression: { mode: 'inherit_parent' },
        features: [],
      };
  }
}

function draftCharacterEffect(
  effect: AuthoringCharacterEffect | SpeciesProjectorCharacterEffectV1,
  randomUuid: () => string,
): AuthoringDraftCharacterEffect {
  const { sort_order: _sortOrder, ...payload } = effect;
  return { ...payload, draft_item_uuid: itemUuid(randomUuid) } as AuthoringDraftCharacterEffect;
}

function draftFeatureEffect(
  effect: AuthoringFeatureEffect,
  randomUuid: () => string,
): AuthoringDraftFeatureEffect {
  const { sort_order: _sortOrder, ...payload } = effect;
  return { ...payload, draft_item_uuid: itemUuid(randomUuid) } as AuthoringDraftFeatureEffect;
}

function draftFeatureValueContribution(
  contribution: SubclassFeatureValueContribution,
  parentClassKey: ContentKey,
  randomUuid: () => string,
): SubclassAuthoringDraftContribution {
  const editableTarget = contribution.target.kind === 'feature_dice_count'
    ? { kind: 'feature_dice_count' as const, key: contribution.target.key }
    : typeof contribution.target.resource === 'string'
      ? { kind: 'preserved' as const, target: contribution.target }
      : {
          kind: 'resource_maximum' as const,
          display_label: contribution.target.resource.display_label,
          marking_shape: contribution.target.resource.marking_shape,
        };
  const expression = contribution.value;
  let value: SubclassAuthoringDraftContribution['value'];
  if (expression.kind === 'const') {
    value = { kind: 'constant', amount: expression.amount };
  } else if (
    expression.kind === 'scale' &&
    expression.source.kind === 'class_level' &&
    expression.source.class_content_key === parentClassKey
  ) {
    value = {
      kind: 'class_level_scale',
      multiply: expression.multiply ?? 1,
      divide: expression.divide ?? 1,
      round: expression.round,
    };
  } else if (
    expression.kind === 'table' &&
    expression.level_source.kind === 'class_level' &&
    expression.level_source.class_content_key === parentClassKey &&
    expression.rows[0].from <= contribution.active_from_level &&
    expression.rows.at(-1)!.to >= contribution.active_to_level
  ) {
    value = {
      kind: 'breakpoint_table',
      rows: expression.rows.map((row) => ({
        draft_item_uuid: itemUuid(randomUuid),
        from: row.from,
        to: row.to,
        amount: row.amount,
      })),
    };
  } else {
    value = { kind: 'preserved', expression };
  }
  return {
    kind: contribution.kind,
    draft_item_uuid: itemUuid(randomUuid),
    contribution_key: contribution.contribution_key,
    label: contribution.label,
    target: editableTarget,
    op: contribution.op,
    active_from_level: contribution.active_from_level,
    active_to_level: contribution.active_to_level,
    value,
    supersedes_contribution_key:
      contribution.supersedes?.contribution_key ?? null,
  };
}

function stringValue(value: JsonValue | ContentFingerprintReference | undefined, label: string): string {
  if (typeof value !== 'string') throw new TypeError(`${label} must be text.`);
  return value;
}

function nullableIntegerValue(
  value: JsonValue | ContentFingerprintReference | undefined,
  label: string,
): number | null {
  if (value === null) return null;
  if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be an integer or null.`);
  return value as number;
}

function nullableStringArray(
  value: JsonValue | ContentFingerprintReference | undefined,
  label: string,
): readonly string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
    throw new TypeError(`${label} must be a text array.`);
  }
  return value;
}

function skillArray(
  value: JsonValue | ContentFingerprintReference | undefined,
  label: string,
): readonly Skill[] {
  const values = nullableStringArray(value, label);
  if (!values.every((entry) => (skills as readonly string[]).includes(entry))) {
    throw new TypeError(`${label} must contain only known skills.`);
  }
  return values as readonly Skill[];
}

function fingerprintReference(
  value: JsonValue | ContentFingerprintReference | undefined,
  kind: ContentKind,
  label: string,
): ContentFingerprintReference {
  if (
    value === null || typeof value !== 'object' || Array.isArray(value) ||
    Reflect.get(value, 'kind') !== kind ||
    Reflect.get(value, 'scheme') !== CONTENT_FINGERPRINT_SCHEME_V1 ||
    typeof Reflect.get(value, 'digest') !== 'string'
  ) {
    throw new TypeError(`${label} must be a ${kind} fingerprint reference.`);
  }
  return value as unknown as ContentFingerprintReference;
}

export class CatalogAuthoringService {
  readonly #randomUuid: () => string;
  readonly #now: () => string;

  constructor(
    readonly db: DatabaseContext,
    options: CatalogAuthoringServiceOptions = {},
  ) {
    this.#randomUuid = options.randomUuid ?? (() => crypto.randomUUID());
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  #draftRow(draftUuid: HomebrewDraftUuid): DraftRow | null {
    return this.db.one(
      `SELECT draft_uuid, content_kind, document_version, base_content_key,
              revision, document_json, created_at, updated_at
       FROM catalog_content_drafts WHERE draft_uuid = ?`,
      [draftUuid],
      draftRow,
    );
  }

  #notFound(draftUuid: HomebrewDraftUuid): AuthoringServiceError {
    return new AuthoringServiceError(`Draft "${draftUuid}" was not found.`, {
      reason: 'draft_not_found',
    });
  }

  #decode(row: DraftRow): StoredHomebrewDraft {
    let decoded;
    try {
      decoded = decodeStoredDraft(
        row.content_kind,
        row.document_version,
        row.document_json,
      );
    } catch (error) {
      if (error instanceof DraftCodecError) throw validationError(error);
      throw error;
    }
    if (decoded.status === 'upgrade_required') {
      throw new AuthoringServiceError('This draft requires a newer build.', {
        reason: 'draft_upgrade_required',
        draft_uuid: row.draft_uuid,
        content_kind: row.content_kind,
        stored_version: decoded.stored_version,
        latest_supported_version: decoded.latest_supported_version,
        recovery_available: true,
        recovery_document_json: decoded.recovery_json,
      });
    }
    return Object.freeze({
      draft_uuid: row.draft_uuid,
      content_kind: row.content_kind,
      document_version: decoded.current_version,
      base_content_key: row.base_content_key,
      revision: row.revision,
      document: decoded.document,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  #contentKeyFor(reference: ContentFingerprintReference): ContentKey {
    const keys = this.db.all(
      `SELECT content_key FROM catalog_content_fingerprints
       WHERE content_kind = ? AND fingerprint_scheme = ?
         AND fingerprint_digest = ? AND fingerprint_role = 'current'
       ORDER BY content_key`,
      [reference.kind, reference.scheme, reference.digest],
      (row) => sqlString(row, 'content_key') as ContentKey,
    );
    if (keys.length !== 1) {
      throw new AuthoringServiceError(
        `Published ${reference.kind} reference does not resolve uniquely.`,
        { reason: 'invalid_reference' },
      );
    }
    return keys[0]!;
  }

  #draftGrant(grant: AuthoringGrant): AuthoringDraftGrant {
    const common = {
      draft_item_uuid: itemUuid(this.#randomUuid),
      rule_key: grant.rule_key,
    };
    switch (grant.kind) {
      case 'fixed_spell':
        return {
          kind: grant.kind,
          ...common,
          spell_content_key: this.#contentKeyFor(
            fingerprintReference(grant.spell, 'spell', `grant ${grant.rule_key}.spell`),
          ),
          always_prepared: grant.always_prepared === true,
        } as const;
      case 'choice_from_list':
        return {
          kind: grant.kind,
          ...common,
          list: stringValue(grant.list, `grant ${grant.rule_key}.list`),
          count: nullableIntegerValue(grant.count, `grant ${grant.rule_key}.count`),
          minimum_spell_level: nullableIntegerValue(
            grant.level_min,
            `grant ${grant.rule_key}.minimum_spell_level`,
          ),
          maximum_spell_level: nullableIntegerValue(
            grant.level_max,
            `grant ${grant.rule_key}.maximum_spell_level`,
          ),
        } as const;
      case 'choice_from_query':
        return {
          kind: grant.kind,
          ...common,
          schools: nullableStringArray(
            grant.schools,
            `grant ${grant.rule_key}.schools`,
          ).map(spellSchool),
          tags: nullableStringArray(grant.tags, `grant ${grant.rule_key}.tags`),
          count: nullableIntegerValue(grant.count, `grant ${grant.rule_key}.count`),
          minimum_spell_level: nullableIntegerValue(
            grant.level_min,
            `grant ${grant.rule_key}.minimum_spell_level`,
          ),
          maximum_spell_level: nullableIntegerValue(
            grant.level_max,
            `grant ${grant.rule_key}.maximum_spell_level`,
          ),
        } as const;
      case 'skill_proficiency':
        return {
          kind: grant.kind,
          ...common,
          count: nullableIntegerValue(grant.count, `grant ${grant.rule_key}.count`),
          skills: skillArray(grant.skills, `grant ${grant.rule_key}.skills`),
        } as const;
      case 'grant_source':
      case 'capability':
      case 'spellbook_acquisition':
      case 'fighting_style':
      case 'weapon_mastery':
        throw new AuthoringServiceError(
          `Published grant kind "${grant.kind}" is not editable by the v1 draft form.`,
          { reason: 'invalid_reference' },
        );
    }
  }

  #speciesDraft(aggregate: SpeciesProjectorAggregateV1): SpeciesAuthoringDraft {
    if ('definition_state' in aggregate) {
      throw new AuthoringServiceError(
        'A template-only species cannot be copied until its definition is installed.',
        { reason: 'invalid_reference' },
      );
    }
    if (aggregate.repeatable) {
      throw new AuthoringServiceError('Repeatable species are not editable by the v1 draft form.', { reason: 'invalid_reference' });
    }
    return {
      kind: 'species',
      document_version: 1,
      name: aggregate.name,
      rules_edition: aggregate.rules_edition,
      reference_text: aggregate.reference_text,
      creature_type: aggregate.creature_type,
      primary_size: aggregate.primary_size,
      alternate_size: aggregate.alternate_size,
      walking_speed_feet: aggregate.walking_speed_feet,
      traits: aggregate.traits.map((trait) => ({
        draft_item_uuid: itemUuid(this.#randomUuid),
        name: trait.name,
        description: trait.description,
        effects: trait.effects.map((effect) => draftCharacterEffect(effect, this.#randomUuid)),
      })),
      grants: aggregate.grants.map((grant) => this.#draftGrant(grant)),
    };
  }

  #backgroundEquipment(
    equipment: BackgroundContentAggregate['equipment_option_a'][number],
  ): BackgroundAuthoringDraftEquipment {
    const common = {
      draft_item_uuid: itemUuid(this.#randomUuid),
      quantity: equipment.quantity,
      printed_name: equipment.printed_name,
    };
    switch (equipment.kind) {
      case 'gear':
        return { kind: equipment.kind, ...common };
      case 'weapon':
      case 'armor':
        return {
          kind: equipment.kind,
          ...common,
          content_key: this.#contentKeyFor(equipment.content),
        };
    }
  }

  #backgroundDraft(aggregate: BackgroundContentAggregate): BackgroundAuthoringDraft {
    if (aggregate.repeatable) {
      throw new AuthoringServiceError('Repeatable backgrounds are not editable by the v1 draft form.', { reason: 'invalid_reference' });
    }
    if (aggregate.grants.some((grant) => grant.kind !== 'grant_source')) {
      throw new AuthoringServiceError('This background has root grants the v1 form cannot preserve.', { reason: 'invalid_reference' });
    }
    return {
      kind: 'background',
      document_version: 1,
      name: aggregate.name,
      rules_edition: aggregate.rules_edition,
      reference_text: aggregate.reference_text,
      suggested_abilities: aggregate.suggested_abilities,
      default_origin_feat_content_key: aggregate.default_origin_feat_content_key,
      default_origin_feat_display_name: aggregate.default_origin_feat_display_name,
      skill_proficiencies: aggregate.skill_proficiencies,
      tool_reference_text: aggregate.tool_reference_text,
      equipment_option_a_description: aggregate.equipment_option_a_description,
      equipment_option_b_description: aggregate.equipment_option_b_description,
      equipment_option_a: aggregate.equipment_option_a.map((item) => this.#backgroundEquipment(item)),
      equipment_option_b: aggregate.equipment_option_b.map((item) => this.#backgroundEquipment(item)),
      effects: aggregate.effects.map((effect) => draftCharacterEffect(effect, this.#randomUuid)),
    };
  }

  #subclassDraft(aggregate: SubclassContentAggregate): SubclassAuthoringDraft {
    if (aggregate.grants.length > 0) {
      throw new AuthoringServiceError('This subclass has root grants the v1 form cannot preserve.', { reason: 'invalid_reference' });
    }
    let progression: SubclassAuthoringDraft['progression'];
    switch (aggregate.progression.mode) {
      case 'inherit_parent':
        progression = { mode: 'inherit_parent' };
        break;
      case 'root_only':
        progression = { ...aggregate.progression };
        break;
      case 'override':
        progression = {
          mode: 'override',
          spellcasting_ability: aggregate.progression.spellcasting_ability,
          caster_contribution: aggregate.progression.caster_contribution,
          rows: aggregate.progression.rows.map((row) => ({
            class_level: row.class_level,
            cantrips_known: row.cantrips_known,
            prepared_or_known_count: row.prepared_or_known_count,
            maximum_spell_level: row.maximum_spell_level,
            slot_counts: row.slot_counts,
            grants: row.grants.map((grant) => this.#draftGrant(grant)),
          })),
        };
        break;
    }
    const parentClassContentKey = this.#contentKeyFor(aggregate.parent_class);
    return {
      kind: 'subclass',
      document_version: 1,
      name: aggregate.name,
      rules_edition: aggregate.rules_edition,
      reference_text: aggregate.reference_text,
      parent_class_content_key: parentClassContentKey,
      progression,
      features: aggregate.features.map((feature) => ({
        draft_item_uuid: itemUuid(this.#randomUuid),
        class_level: feature.class_level,
        name: feature.name,
        description: feature.description,
        effects: feature.effects.map((effect) => draftFeatureEffect(effect, this.#randomUuid)),
        ...((feature.contributions ?? []).length === 0
          ? {}
          : {
              contributions: feature.contributions!.map((contribution) =>
                draftFeatureValueContribution(
                  contribution,
                  parentClassContentKey,
                  this.#randomUuid,
                )),
            }),
      })),
    };
  }

  #copyDocument(kind: AuthoredContentKind, contentKey: ContentKey): HomebrewDraft {
    const references = storedAuthoredRegistryReferencesV1(this.db);
    switch (kind) {
      case 'species':
        return this.#speciesDraft(readStoredAuthoredContentAggregateV1(this.db, {
          kind,
          contentKey,
          references,
        }));
      case 'background':
        return this.#backgroundDraft(readStoredAuthoredContentAggregateV1(this.db, {
          kind,
          contentKey,
          references,
        }));
      case 'subclass':
        return this.#subclassDraft(readStoredAuthoredContentAggregateV1(this.db, {
          kind,
          contentKey,
          references,
        }));
    }
  }

  list(): AuthoringLibrary {
    const published: PublishedHomebrewSummary[] = this.db.all(
      `SELECT identity.content_key, identity.content_kind,
              CASE identity.content_kind
                WHEN 'species' THEN species.name
                WHEN 'background' THEN background.name
                WHEN 'subclass' THEN subclass.name
              END AS name,
              CASE identity.content_kind
                WHEN 'species' THEN species.rules_edition
                WHEN 'background' THEN background.rules_edition
                WHEN 'subclass' THEN subclass.rules_edition
              END AS rules_edition,
              supersession.successor_content_key AS superseded_by
       FROM catalog_content_identities AS identity
       LEFT JOIN species_definitions AS species
         ON identity.content_kind = 'species' AND species.content_key = identity.content_key
       LEFT JOIN background_definitions AS background
         ON identity.content_kind = 'background' AND background.content_key = identity.content_key
       LEFT JOIN subclass_definitions AS subclass
         ON identity.content_kind = 'subclass' AND subclass.content_key = identity.content_key
       LEFT JOIN catalog_content_supersessions AS supersession
         ON supersession.content_kind = identity.content_kind
        AND supersession.superseded_content_key = identity.content_key
       WHERE identity.catalog_layer = 'external'
         AND identity.archived_at IS NULL
         AND identity.content_kind IN ('species', 'background', 'subclass')
         AND (
           species.content_key IS NOT NULL
           OR background.content_key IS NOT NULL
           OR subclass.content_key IS NOT NULL
         )
       ORDER BY identity.content_kind, name, identity.content_key`,
      undefined,
      publishedRow,
    ).map((row) => ({ ...row, catalog_layer: 'external' as const }));

    const rows = this.db.all(
      `SELECT draft_uuid, content_kind, document_version, base_content_key,
              revision, document_json, created_at, updated_at
       FROM catalog_content_drafts
       ORDER BY updated_at DESC, draft_uuid`,
      undefined,
      draftRow,
    );
    const drafts: HomebrewDraftSummary[] = rows.map((row) => {
      let name = 'Upgrade required';
      try {
        const decoded = decodeStoredDraft(row.content_kind, row.document_version, row.document_json);
        if (decoded.status === 'ready') name = decoded.document.name;
      } catch (error) {
        if (!(error instanceof DraftCodecError)) throw error;
        name = 'Unreadable draft';
      }
      return {
        draft_uuid: row.draft_uuid,
        content_kind: row.content_kind,
        base_content_key: row.base_content_key,
        revision: row.revision,
        name,
        updated_at: row.updated_at,
      };
    });
    return Object.freeze({ published: Object.freeze(published), drafts: Object.freeze(drafts) });
  }

  backgroundReferences(): BackgroundAuthoringReferences {
    const references = (
      table: 'feat_definitions' | 'weapon_templates' | 'armor_templates',
      kind: 'feat' | 'weapon' | 'armor',
      extraPredicate?: string,
    ) => this.db.all(
      `SELECT definition.content_key, definition.name, definition.rules_edition,
              identity.catalog_layer
       FROM ${table} AS definition
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = '${kind}'
        AND identity.content_key = definition.content_key
       WHERE ${selectableCatalogContentSql(kind, 'definition.content_key')}
       ${extraPredicate === undefined ? '' : `AND ${extraPredicate}`}
       ORDER BY definition.name, definition.rules_edition,
                definition.content_key`,
      undefined,
      (row) => ({
        content_key: sqlString(row, 'content_key') as ContentKey,
        name: sqlString(row, 'name'),
        rules_edition: rulesEdition(sqlString(row, 'rules_edition')),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      }),
    );
    return Object.freeze({
      origin_feats: Object.freeze(references(
        'feat_definitions',
        'feat',
        "definition.category = 'origin'",
      )),
      weapons: Object.freeze(references('weapon_templates', 'weapon')),
      armors: Object.freeze(references('armor_templates', 'armor')),
    });
  }

  spellGrantReferences(): SpellGrantAuthoringReferences {
    const spells = this.db.all(
      `SELECT version.content_key, version.display_name, version.rules_edition,
              version.level, identity.catalog_layer
       FROM spell_versions AS version
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'spell'
        AND identity.content_key = version.content_key
       WHERE ${selectableCatalogContentSql('spell', 'version.content_key')}
       ORDER BY version.display_name, version.rules_edition, version.level,
                version.content_key`,
      undefined,
      (row) => ({
        content_key: sqlString(row, 'content_key') as ContentKey,
        name: sqlString(row, 'display_name'),
        rules_edition: sqlString(row, 'rules_edition') as RulesEdition,
        level: sqlInteger(row, 'level'),
        catalog_layer: catalogLayerDisclosure(sqlNullableString(row, 'catalog_layer')),
      }),
    );
    const lists = this.db.all(
      `SELECT DISTINCT membership.spell_list_key
       FROM spell_list_memberships AS membership
       JOIN spell_versions AS version ON version.id = membership.spell_version_id
       WHERE ${selectableCatalogContentSql('spell', 'version.content_key')}
       ORDER BY membership.spell_list_key`,
      undefined,
      (row) => sqlString(row, 'spell_list_key'),
    );
    return Object.freeze({
      spells: Object.freeze(spells),
      lists: Object.freeze(lists),
    });
  }

  createDraft(input: {
    readonly content_kind: AuthoredContentKind;
    readonly base_content_key?: ContentKey;
  }): StoredHomebrewDraft {
    const document = input.base_content_key === undefined
      ? emptyDraft(input.content_kind)
      : this.#copyDocument(input.content_kind, input.base_content_key);
    let encoded;
    try {
      encoded = encodeCurrentDraft(input.content_kind, document);
    } catch (error) {
      if (error instanceof DraftCodecError) throw validationError(error);
      throw error;
    }
    const draftUuid = this.#randomUuid() as HomebrewDraftUuid;
    const timestamp = this.#now();
    this.db.exec(
      `INSERT INTO catalog_content_drafts (
         draft_uuid, content_kind, document_version, base_content_key,
         revision, document_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        draftUuid,
        input.content_kind,
        encoded.version,
        input.base_content_key ?? null,
        encoded.json,
        timestamp,
        timestamp,
      ],
    );
    return this.readDraft(draftUuid);
  }

  readDraft(draftUuid: HomebrewDraftUuid): StoredHomebrewDraft {
    const row = this.#draftRow(draftUuid);
    if (row === null) throw this.#notFound(draftUuid);
    return this.#decode(row);
  }

  saveDraft(input: {
    readonly draft_uuid: HomebrewDraftUuid;
    readonly expected_revision: DraftRevision;
    readonly document: HomebrewDraft;
  }): StoredHomebrewDraft {
    return this.db.transaction(() => {
      const row = this.#draftRow(input.draft_uuid);
      if (row === null) throw this.#notFound(input.draft_uuid);
      if (row.revision !== input.expected_revision) {
        throw new AuthoringServiceError('Draft revision is stale.', {
          reason: 'stale_draft_revision',
          draft_uuid: row.draft_uuid,
          expected_revision: input.expected_revision,
          actual_revision: row.revision,
        });
      }
      // This check is deliberately before encoding the caller's document: an
      // older build may recover or discard a future row, but can never save
      // current-shaped bytes over it.
      this.#decode(row);
      let encoded;
      try {
        encoded = encodeCurrentDraft(row.content_kind, input.document);
      } catch (error) {
        if (error instanceof DraftCodecError) throw validationError(error);
        throw error;
      }
      const nextRevision = (Number(row.revision) + 1) as DraftRevision;
      const result = this.db.exec(
        `UPDATE catalog_content_drafts
         SET document_version = ?, revision = ?, document_json = ?, updated_at = ?
         WHERE draft_uuid = ? AND revision = ?`,
        [
          encoded.version,
          nextRevision,
          encoded.json,
          this.#now(),
          row.draft_uuid,
          row.revision,
        ],
      );
      if (result.changes !== 1) {
        const actual = this.#draftRow(row.draft_uuid);
        if (actual === null) throw this.#notFound(row.draft_uuid);
        throw new AuthoringServiceError('Draft revision is stale.', {
          reason: 'stale_draft_revision',
          draft_uuid: row.draft_uuid,
          expected_revision: input.expected_revision,
          actual_revision: actual.revision,
        });
      }
      return this.readDraft(row.draft_uuid);
    });
  }

  discardDraft(draftUuid: HomebrewDraftUuid, expectedRevision: DraftRevision): void {
    this.db.transaction(() => {
      const row = this.#draftRow(draftUuid);
      if (row === null) throw this.#notFound(draftUuid);
      if (row.revision !== expectedRevision) {
        throw new AuthoringServiceError('Draft revision is stale.', {
          reason: 'stale_draft_revision',
          draft_uuid: row.draft_uuid,
          expected_revision: expectedRevision,
          actual_revision: row.revision,
        });
      }
      const result = this.db.exec(
        'DELETE FROM catalog_content_drafts WHERE draft_uuid = ? AND revision = ?',
        [draftUuid, expectedRevision],
      );
      if (result.changes !== 1) throw this.#notFound(draftUuid);
    });
  }

  previewPublish(input: {
    readonly draft_uuid: HomebrewDraftUuid;
    readonly expected_revision: DraftRevision;
  }): PublishPreview {
    const draft = this.readDraft(input.draft_uuid);
    if (draft.revision !== input.expected_revision) {
      throw new AuthoringServiceError('Draft revision is stale.', {
        reason: 'stale_draft_revision',
        draft_uuid: draft.draft_uuid,
        expected_revision: input.expected_revision,
        actual_revision: draft.revision,
      });
    }
    try {
      switch (draft.content_kind) {
        case 'species':
          return previewSpeciesPublish(this.db, draft);
        case 'background':
          return previewBackgroundPublish(this.db, draft);
        case 'subclass':
          return previewSubclassPublish(this.db, draft);
      }
    } catch (error) {
      return publishServiceError(error);
    }
  }

  commitPublish(input: {
    readonly token: PublishPlanToken;
    readonly decisions: readonly PublishDecision[];
  }): PublishResult {
    const draftUuid = publishTokenDraftUuid(input.token);
    if (draftUuid === null) {
      throw new AuthoringServiceError('Publish token is invalid.', {
        reason: 'invalid_reference',
      });
    }
    const row = this.#draftRow(draftUuid);
    if (row === null) {
      throw new AuthoringServiceError('The publish plan is stale.', {
        reason: 'stale_publish_plan',
        draft_uuid: draftUuid,
      });
    }
    const draft = this.#decode(row);
    const previousKeyUsageCount = draft.base_content_key === null
      ? 0
      : this.usages(draft.base_content_key).usages.length;
    try {
      switch (draft.content_kind) {
        case 'species':
          return commitSpeciesPublish(
            this.db, draft, input.token, input.decisions, previousKeyUsageCount,
          );
        case 'background':
          return commitBackgroundPublish(
            this.db, draft, input.token, input.decisions, previousKeyUsageCount,
          );
        case 'subclass':
          return commitSubclassPublish(
            this.db, draft, input.token, input.decisions, previousKeyUsageCount,
          );
      }
    } catch (error) {
      return publishServiceError(error);
    }
  }

  usages(contentKey: ContentKey): ContentUsageList {
    const identity = this.db.one(
      `SELECT content_kind FROM catalog_content_identities
       WHERE content_key = ? AND content_kind IN ('species', 'background', 'subclass')`,
      [contentKey],
      (row) => authoredKind(sqlString(row, 'content_kind')),
    );
    if (identity === null) {
      throw new AuthoringServiceError(`Content "${contentKey}" was not found.`, { reason: 'content_not_found' });
    }
    const usageCodec = (row: SqlRow): ContentUsage => ({
      character_id: sqlInteger(row, 'character_id') as ContentUsage['character_id'],
      character_revision: sqlInteger(row, 'character_revision') as ContentUsage['character_revision'],
      character_name: sqlString(row, 'character_name'),
    });
    let usages: ContentUsage[];
    switch (identity) {
      case 'species':
      case 'background': {
        const definitionTable = identity === 'species' ? 'species_definitions' : 'background_definitions';
        usages = this.db.all(
          `SELECT DISTINCT character.id AS character_id,
                  character.revision AS character_revision,
                  character.name AS character_name
           FROM characters AS character
           JOIN character_source_instances AS source ON source.character_id = character.id
           JOIN ${definitionTable} AS definition ON definition.id = source.source_definition_id
           WHERE source.source_type = ? AND definition.content_key = ?
             AND source.state = 'active'
           ORDER BY character.id`,
          [identity, contentKey],
          usageCodec,
        );
        break;
      }
      case 'subclass':
        usages = this.db.all(
          `SELECT DISTINCT character.id AS character_id,
                  character.revision AS character_revision,
                  character.name AS character_name
           FROM characters AS character
           JOIN character_class_levels AS class_level ON class_level.character_id = character.id
           JOIN subclass_definitions AS subclass ON subclass.id = class_level.subclass_definition_id
           WHERE subclass.content_key = ?
           ORDER BY character.id`,
          [contentKey],
          usageCodec,
        );
        break;
    }
    return Object.freeze({
      content_kind: identity,
      content_key: contentKey,
      usages: Object.freeze(usages),
    });
  }

  previewReplacement(input: {
    readonly old_content_key: ContentKey;
    readonly new_content_key: ContentKey;
    readonly character_id: CharacterId;
  }): ReplacementPlan {
    try {
      return previewReferenceRetarget(this.db, input);
    } catch (error) {
      return replacementServiceError(error);
    }
  }

  commitReplacement(input: {
    readonly token: ReplacementPlanToken;
    readonly decisions: readonly ReplacementDecision[];
    readonly choices: readonly ReplacementChoiceSelection[];
  }): ReplacementResult {
    try {
      return commitReferenceRetarget(this.db, input);
    } catch (error) {
      return replacementServiceError(error);
    }
  }

  previewReplacementSet(input: {
    readonly old_content_key: ContentKey;
    readonly new_content_key: ContentKey;
  }): ReplacementSetPlan {
    const usages = this.usages(input.old_content_key);
    const archivedAt = this.db.scalar<string>(
      `SELECT archived_at FROM catalog_content_identities
       WHERE content_kind = ? AND content_key = ?`,
      [usages.content_kind, usages.content_key],
    );
    if (archivedAt !== null) {
      throw new AuthoringServiceError(
        'Archived content cannot be replaced across its usages.',
        {
          reason: 'replacement_refused',
          refusal: 'archived_reference',
        },
      );
    }
    return Object.freeze({
      old_content_key: input.old_content_key,
      new_content_key: input.new_content_key,
      replacements: Object.freeze(usages.usages.map((usage) =>
        this.previewReplacement({
          old_content_key: input.old_content_key,
          new_content_key: input.new_content_key,
          character_id: usage.character_id,
        }))),
    });
  }

  commitReplacementSet(input: {
    readonly old_content_key: ContentKey;
    readonly new_content_key: ContentKey;
    readonly replacements: readonly ReplacementSetCommit[];
  }): ReplacementSetResult {
    return this.db.transaction(() => {
      const fresh = this.previewReplacementSet(input);
      if (
        fresh.replacements.length !== input.replacements.length ||
        fresh.replacements.some((plan, index) =>
          plan.token !== input.replacements[index]?.token)
      ) {
        throw new AuthoringServiceError('The replacement-set plan is stale.', {
          reason: 'stale_replacement_set_plan',
          old_content_key: input.old_content_key,
          new_content_key: input.new_content_key,
        });
      }
      const replacements = input.replacements.map((replacement, index) => {
        const reviewed = fresh.replacements[index];
        if (reviewed === undefined) throw new Error('Replacement-set plan is incomplete.');
        // Each CI-7 commit may legitimately change global catalog/import-plan
        // facts used by the next token. The set preview above authenticates the
        // exact reviewed members; refresh only the transport token immediately
        // before composing the existing commit seam inside this transaction.
        const current = this.previewReplacement({
          old_content_key: reviewed.facts.old_content_key,
          new_content_key: reviewed.facts.new_content_key,
          character_id: reviewed.facts.character_id,
        });
        if (
          current.review.length !== reviewed.review.length ||
          current.review.some((candidate, reviewIndex) =>
            candidate.candidate_content_key !==
              reviewed.review[reviewIndex]?.candidate_content_key)
        ) {
          throw new AuthoringServiceError('The replacement-set review changed.', {
            reason: 'invalid_reference',
          });
        }
        return this.commitReplacement({ ...replacement, token: current.token });
      });
      return Object.freeze({
        old_content_key: input.old_content_key,
        new_content_key: input.new_content_key,
        replacements: Object.freeze(replacements),
      });
    });
  }
}
