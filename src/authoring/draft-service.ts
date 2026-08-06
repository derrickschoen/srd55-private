import type { SqlRow } from '../db/codecs';
import {
  sqlInteger,
  sqlNullableString,
  sqlString,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import type { JsonValue } from '../domain/models';
import { skills, spellSchool, type Skill } from '../domain/enums';
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
  SpeciesAuthoringDraft,
  StoredHomebrewDraft,
  SubclassAuthoringDraft,
  SubclassContentAggregate,
} from './contracts';
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
  const edition = sqlString(row, 'rules_edition');
  if (edition !== '2014' && edition !== '2024' && edition !== 'expanded') {
    throw new TypeError(`Published content has unknown rules edition "${edition}".`);
  }
  return {
    content_key: sqlString(row, 'content_key') as ContentKey,
    content_kind: authoredKind(sqlString(row, 'content_kind')),
    name: sqlString(row, 'name'),
    rules_edition: edition,
  };
}

function validationError(error: DraftCodecError): AuthoringServiceError {
  return new AuthoringServiceError('Draft validation failed.', {
    reason: 'validation_failed',
    issues: error.issues,
  }, { cause: error });
}

function speciesPublishServiceError(error: unknown): never {
  if (error instanceof SpeciesSemanticValidationError) {
    throw new AuthoringServiceError('Species publish validation failed.', {
      reason: 'validation_failed',
      issues: error.issues,
    }, { cause: error });
  }
  if (error instanceof SpeciesPublishError) {
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
          maximum_spell_level: nullableIntegerValue(
            grant.maximum_spell_level,
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
            grant.minimum_spell_level,
            `grant ${grant.rule_key}.minimum_spell_level`,
          ),
          maximum_spell_level: nullableIntegerValue(
            grant.maximum_spell_level,
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
      default_origin_feat_content_key: this.#contentKeyFor(aggregate.default_origin_feat),
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
    return {
      kind: 'subclass',
      document_version: 1,
      name: aggregate.name,
      rules_edition: aggregate.rules_edition,
      reference_text: aggregate.reference_text,
      parent_class_content_key: this.#contentKeyFor(aggregate.parent_class),
      progression,
      features: aggregate.features.map((feature) => ({
        draft_item_uuid: itemUuid(this.#randomUuid),
        class_level: feature.class_level,
        name: feature.name,
        description: feature.description,
        effects: feature.effects.map((effect) => draftFeatureEffect(effect, this.#randomUuid)),
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
              END AS rules_edition
       FROM catalog_content_identities AS identity
       LEFT JOIN species_definitions AS species
         ON identity.content_kind = 'species' AND species.content_key = identity.content_key
       LEFT JOIN background_definitions AS background
         ON identity.content_kind = 'background' AND background.content_key = identity.content_key
       LEFT JOIN subclass_definitions AS subclass
         ON identity.content_kind = 'subclass' AND subclass.content_key = identity.content_key
       WHERE identity.catalog_layer = 'external'
         AND identity.content_kind IN ('species', 'background', 'subclass')
         AND (
           species.content_key IS NOT NULL
           OR background.content_key IS NOT NULL
           OR subclass.content_key IS NOT NULL
         )
       ORDER BY identity.content_kind, name, identity.content_key`,
      undefined,
      publishedRow,
    ).map((row) => ({ ...row, catalog_layer: 'external' as const, superseded_by: null }));

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
      return previewSpeciesPublish(this.db, draft);
    } catch (error) {
      return speciesPublishServiceError(error);
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
      return commitSpeciesPublish(
        this.db,
        draft,
        input.token,
        input.decisions,
        previousKeyUsageCount,
      );
    } catch (error) {
      return speciesPublishServiceError(error);
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
}
