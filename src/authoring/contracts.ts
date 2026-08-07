import type {
  Ability,
  CharacterLevel,
  CreatureSize,
  CreatureType,
  GrantRuleKind,
  ProgressionType,
  RulesEdition,
  Skill,
  SpellSchool,
} from '../domain/enums';
import type {
  CharacterId,
  CharacterRevision,
  ContentKey,
} from '../domain/ids';
import type { JsonValue } from '../domain/models';
import type {
  CanonicalContentIdentityJson,
  ContentFingerprintDigest,
  ContentFingerprintScheme,
  ContentKind,
} from '../catalog/content-identity';
import type {
  CatalogContentLayer,
  CatalogContentMatchDecision,
} from '../catalog/content-registry';
import type { CatalogLayerDisclosure } from '../catalog/catalog-disclosure';
import type {
  AuthoringCharacterEffect,
  AuthoringDraftCharacterEffect,
  AuthoringDraftFeatureEffect,
  AuthoringFeatureEffect,
} from './effect-forms';
import type {
  ArchiveSetPlanToken,
  DraftRevision,
  HomebrewDraftItemUuid,
  HomebrewDraftUuid,
  PublishPlanToken,
  ReplacementPlanToken,
} from './ids';

export type {
  ArchiveSetPlanToken,
  DraftRevision,
  HomebrewDraftItemUuid,
  HomebrewDraftUuid,
  PublishPlanToken,
  ReplacementPlanToken,
} from './ids';

export const authoredContentKinds = [
  'species',
  'subclass',
  'background',
] as const;
export type AuthoredContentKind = (typeof authoredContentKinds)[number];

export interface ContentFingerprintReference<
  K extends ContentKind = ContentKind,
> {
  readonly kind: K;
  readonly scheme: ContentFingerprintScheme;
  readonly digest: ContentFingerprintDigest;
}

/**
 * Complete normalized GrantRule semantics after stored row ids have been
 * replaced by portable fingerprint references. The open field map is
 * deliberate: GrantRule preserves future extensions, so identity defaults to
 * including them rather than silently colliding until this DTO is revised.
 */
export interface AuthoringGrant {
  readonly kind: GrantRuleKind;
  readonly rule_key: string;
  readonly [field: string]: JsonValue | ContentFingerprintReference;
}

export type AuthoringDraftGrant =
  | {
      readonly kind: 'fixed_spell';
      readonly draft_item_uuid: HomebrewDraftItemUuid;
      readonly rule_key: string;
      readonly spell_content_key: ContentKey | null;
      readonly always_prepared: boolean;
    }
  | {
      readonly kind: 'choice_from_list';
      readonly draft_item_uuid: HomebrewDraftItemUuid;
      readonly rule_key: string;
      readonly list: string;
      readonly count: number | null;
      readonly maximum_spell_level: number | null;
    }
  | {
      readonly kind: 'choice_from_query';
      readonly draft_item_uuid: HomebrewDraftItemUuid;
      readonly rule_key: string;
      readonly schools: readonly SpellSchool[];
      readonly tags: readonly string[];
      readonly count: number | null;
      readonly minimum_spell_level: number | null;
      readonly maximum_spell_level: number | null;
    }
  | {
      readonly kind: 'skill_proficiency';
      readonly draft_item_uuid: HomebrewDraftItemUuid;
      readonly rule_key: string;
      readonly count: number | null;
      readonly skills: readonly Skill[];
    };

interface AuthoringDraftBase<K extends AuthoredContentKind> {
  readonly kind: K;
  readonly document_version: 1;
  readonly name: string;
  readonly rules_edition: RulesEdition | null;
  readonly reference_text: string;
}

export interface SpeciesAuthoringDraft
  extends AuthoringDraftBase<'species'> {
  readonly creature_type: string;
  readonly primary_size: string;
  readonly alternate_size: string | null;
  readonly walking_speed_feet: number | null;
  readonly traits: readonly SpeciesAuthoringDraftTrait[];
  readonly grants: readonly AuthoringDraftGrant[];
}

export interface SpeciesAuthoringDraftTrait {
  readonly draft_item_uuid: HomebrewDraftItemUuid;
  readonly name: string;
  readonly description: string;
  readonly effects: readonly AuthoringDraftCharacterEffect[];
}

export interface BackgroundAuthoringDraft
  extends AuthoringDraftBase<'background'> {
  readonly suggested_abilities: readonly Ability[];
  readonly default_origin_feat_content_key: ContentKey | null;
  /** Authored presentation text; null until a feat has been selected. */
  readonly default_origin_feat_display_name: string | null;
  readonly skill_proficiencies: readonly Skill[];
  readonly tool_reference_text: string | null;
  readonly equipment_option_a_description: string;
  readonly equipment_option_b_description: string;
  readonly equipment_option_a: readonly BackgroundAuthoringDraftEquipment[];
  readonly equipment_option_b: readonly BackgroundAuthoringDraftEquipment[];
  readonly effects: readonly AuthoringDraftCharacterEffect[];
}

export type BackgroundAuthoringDraftEquipment =
  | {
      readonly kind: 'gear';
      readonly draft_item_uuid: HomebrewDraftItemUuid;
      readonly quantity: number | null;
      readonly printed_name: string;
    }
  | {
      readonly kind: 'weapon' | 'armor';
      readonly draft_item_uuid: HomebrewDraftItemUuid;
      readonly quantity: number | null;
      readonly printed_name: string;
      readonly content_key: ContentKey | null;
    };

export type SubclassAuthoringDraftProgression =
  | { readonly mode: 'inherit_parent' }
  // Some installed subclasses carry caster contribution only on the root and
  // intentionally have no progression rows. Copy-from-published must preserve
  // that semantic state rather than laundering it into inherit_parent or a
  // fabricated dense schedule. HA-5 may present this as a non-editable copied
  // shape; it is part of the durable draft vocabulary from v1.
  | {
      readonly mode: 'root_only';
      readonly spellcasting_ability: Ability | null;
      readonly caster_fraction: '1' | '1/2' | '1/3' | null;
      readonly caster_rounding: 'up' | 'down' | null;
    }
  | {
      readonly mode: 'override';
      readonly spellcasting_ability: Ability | null;
      readonly caster_contribution: Exclude<ProgressionType, 'none'> | null;
      readonly rows: readonly SubclassAuthoringDraftProgressionRow[];
    };

export interface SubclassAuthoringDraftProgressionRow {
  readonly class_level: CharacterLevel;
  readonly cantrips_known: number | null;
  readonly prepared_or_known_count: number | null;
  readonly maximum_spell_level: number | null;
  readonly slot_counts: readonly number[];
  readonly grants: readonly AuthoringDraftGrant[];
}

export interface SubclassAuthoringDraftFeature {
  readonly draft_item_uuid: HomebrewDraftItemUuid;
  readonly class_level: CharacterLevel | null;
  readonly name: string;
  readonly description: string;
  readonly effects: readonly AuthoringDraftFeatureEffect[];
}

export interface SubclassAuthoringDraft
  extends AuthoringDraftBase<'subclass'> {
  readonly parent_class_content_key: ContentKey | null;
  readonly progression: SubclassAuthoringDraftProgression;
  readonly features: readonly SubclassAuthoringDraftFeature[];
}

export type HomebrewDraft =
  | SpeciesAuthoringDraft
  | SubclassAuthoringDraft
  | BackgroundAuthoringDraft;

interface PublishableHomebrewBase<K extends AuthoredContentKind> {
  readonly kind: K;
  readonly name: string;
  readonly rules_edition: RulesEdition;
  /** Stored in the matching definition root's nullable `notes` column. */
  readonly reference_text: string;
}

export interface SpeciesContentAggregate
  extends PublishableHomebrewBase<'species'> {
  readonly repeatable: boolean;
  readonly creature_type: CreatureType;
  readonly primary_size: CreatureSize;
  readonly alternate_size: CreatureSize | null;
  readonly walking_speed_feet: number;
  readonly traits: readonly SpeciesContentTrait[];
  readonly grants: readonly AuthoringGrant[];
}

export interface SpeciesContentTrait {
  readonly sort_order: number;
  readonly name: string;
  readonly description: string;
  readonly effects: readonly AuthoringCharacterEffect[];
}

export type BackgroundContentEquipment =
  | {
      readonly kind: 'gear';
      readonly sort_order: number;
      readonly quantity: number;
      readonly printed_name: string;
    }
  | {
      readonly kind: 'weapon';
      readonly sort_order: number;
      readonly quantity: number;
      readonly printed_name: string;
      readonly content: ContentFingerprintReference<'weapon'>;
    }
  | {
      readonly kind: 'armor';
      readonly sort_order: number;
      readonly quantity: number;
      readonly printed_name: string;
      readonly content: ContentFingerprintReference<'armor'>;
    };

export interface BackgroundContentAggregate
  extends PublishableHomebrewBase<'background'> {
  readonly repeatable: boolean;
  readonly grants: readonly (AuthoringGrant & {
    readonly kind: 'grant_source';
  })[];
  readonly suggested_abilities: readonly [Ability, Ability, Ability];
  readonly default_origin_feat_content_key: ContentKey;
  readonly default_origin_feat: ContentFingerprintReference<'feat'>;
  /**
   * Presentation metadata, deliberately outside the content-v1 payload. The
   * keyed fingerprint owns mechanics; this preserves qualifiers such as
   * "Magic Initiate (Cleric)" without splitting otherwise-identical identity.
   */
  readonly default_origin_feat_display_name: string;
  readonly skill_proficiencies: readonly [Skill, Skill];
  readonly tool_reference_text: string | null;
  readonly equipment_option_a_description: string;
  readonly equipment_option_b_description: string;
  readonly equipment_option_a: readonly BackgroundContentEquipment[];
  readonly equipment_option_b: readonly BackgroundContentEquipment[];
  readonly effects: readonly AuthoringCharacterEffect[];
}

export type SubclassRootOnlyProgression = {
  readonly mode: 'root_only';
  readonly spellcasting_ability: Ability | null;
} & (
  | {
      readonly caster_fraction: null;
      readonly caster_rounding: null;
    }
  | {
      readonly caster_fraction: '1';
      readonly caster_rounding: null;
    }
  | {
      readonly caster_fraction: '1/2' | '1/3';
      readonly caster_rounding: 'up' | 'down';
    }
);

export type SubclassContentProgression =
  | { readonly mode: 'inherit_parent' }
  | SubclassRootOnlyProgression
  | {
      readonly mode: 'override';
      readonly spellcasting_ability: Ability | null;
      readonly caster_contribution: Exclude<ProgressionType, 'none'>;
      readonly rows: DenseSubclassContentProgression;
    };

export interface SubclassContentProgressionRow {
  readonly class_level: CharacterLevel;
  readonly cantrips_known: number;
  readonly prepared_or_known_count: number;
  readonly maximum_spell_level: number;
  readonly slot_counts: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  readonly grants: readonly AuthoringGrant[];
}

type SubclassContentProgressionRowAt<L extends CharacterLevel> =
  Omit<SubclassContentProgressionRow, 'class_level'> & {
    readonly class_level: L;
  };

/**
 * The report reads the exact current level, so an override is the complete
 * ordered 1–20 schedule in the type—not an array a projector might guess over.
 */
export type DenseSubclassContentProgression = readonly [
  SubclassContentProgressionRowAt<1>,
  SubclassContentProgressionRowAt<2>,
  SubclassContentProgressionRowAt<3>,
  SubclassContentProgressionRowAt<4>,
  SubclassContentProgressionRowAt<5>,
  SubclassContentProgressionRowAt<6>,
  SubclassContentProgressionRowAt<7>,
  SubclassContentProgressionRowAt<8>,
  SubclassContentProgressionRowAt<9>,
  SubclassContentProgressionRowAt<10>,
  SubclassContentProgressionRowAt<11>,
  SubclassContentProgressionRowAt<12>,
  SubclassContentProgressionRowAt<13>,
  SubclassContentProgressionRowAt<14>,
  SubclassContentProgressionRowAt<15>,
  SubclassContentProgressionRowAt<16>,
  SubclassContentProgressionRowAt<17>,
  SubclassContentProgressionRowAt<18>,
  SubclassContentProgressionRowAt<19>,
  SubclassContentProgressionRowAt<20>,
];

export interface SubclassContentFeature {
  readonly class_level: CharacterLevel;
  readonly sort_order: number;
  readonly name: string;
  readonly description: string;
  readonly effects: readonly AuthoringFeatureEffect[];
}

export interface SubclassContentAggregate
  extends PublishableHomebrewBase<'subclass'> {
  readonly parent_class: ContentFingerprintReference<'class'>;
  readonly grants: readonly AuthoringGrant[];
  readonly progression: SubclassContentProgression;
  readonly features: readonly SubclassContentFeature[];
}

export type PublishableHomebrew =
  | SpeciesContentAggregate
  | SubclassContentAggregate
  | BackgroundContentAggregate;

export interface StoredHomebrewDraft {
  readonly draft_uuid: HomebrewDraftUuid;
  readonly content_kind: AuthoredContentKind;
  readonly document_version: number;
  readonly base_content_key: ContentKey | null;
  readonly revision: DraftRevision;
  readonly document: HomebrewDraft;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface HomebrewDraftSummary {
  readonly draft_uuid: HomebrewDraftUuid;
  readonly content_kind: AuthoredContentKind;
  readonly base_content_key: ContentKey | null;
  readonly revision: DraftRevision;
  readonly name: string;
  readonly updated_at: string;
}

export interface PublishedHomebrewSummary {
  readonly content_key: ContentKey;
  readonly content_kind: AuthoredContentKind;
  readonly name: string;
  readonly rules_edition: RulesEdition;
  readonly catalog_layer: 'external';
  readonly superseded_by: ContentKey | null;
}

export interface AuthoringLibrary {
  readonly published: readonly PublishedHomebrewSummary[];
  readonly drafts: readonly HomebrewDraftSummary[];
}

export interface ArchiveSetCharacter {
  readonly character_id: CharacterId;
  readonly character_revision: CharacterRevision;
  readonly character_name: string;
}

export interface ArchiveSetPlan {
  readonly token: ArchiveSetPlanToken;
  readonly operation: 'archive' | 'restore';
  readonly content_key: ContentKey;
  readonly content_kind: AuthoredContentKind;
  readonly content_name: string;
  readonly content_catalog_layer: CatalogLayerDisclosure;
  readonly rules_edition: RulesEdition;
  readonly archived_at: string | null;
  readonly characters: readonly ArchiveSetCharacter[];
}

export interface ArchivedHomebrewSet {
  readonly content_key: ContentKey;
  readonly content_kind: AuthoredContentKind;
  readonly content_name: string;
  readonly content_catalog_layer: CatalogLayerDisclosure;
  readonly rules_edition: RulesEdition;
  readonly archived_at: string;
  readonly characters: readonly ArchiveSetCharacter[];
}

export interface ArchiveSetResult {
  readonly content_key: ContentKey;
  readonly content_kind: AuthoredContentKind;
  readonly archived_at: string | null;
  readonly character_ids: readonly CharacterId[];
}

export interface PermanentPurgeResult {
  readonly requested_content_key: ContentKey;
  readonly content_kind: AuthoredContentKind;
  readonly purged_content_keys: readonly ContentKey[];
  readonly purged_character_ids: readonly CharacterId[];
}

export interface BackgroundAuthoringReferenceOption {
  readonly content_key: ContentKey;
  readonly name: string;
  readonly rules_edition: RulesEdition;
  readonly catalog_layer: CatalogLayerDisclosure;
}

/** Installed catalog rows the background draft may reference by content key. */
export interface BackgroundAuthoringReferences {
  readonly origin_feats: readonly BackgroundAuthoringReferenceOption[];
  readonly weapons: readonly BackgroundAuthoringReferenceOption[];
  readonly armors: readonly BackgroundAuthoringReferenceOption[];
}

/**
 * Facts authenticated by a publish token. They are intentionally not shared
 * with replacement tokens: a draft revision is not a character revision, and
 * canonical bytes are not an old/new reference pair.
 */
export interface PublishTokenFacts {
  readonly draft_uuid: HomebrewDraftUuid;
  readonly draft_revision: DraftRevision;
  readonly content_kind: AuthoredContentKind;
  readonly canonical_json: CanonicalContentIdentityJson;
  readonly candidate_content_keys: readonly ContentKey[];
  readonly candidate_identities: readonly ContentFingerprintReference[];
}

/**
 * Facts authenticated by a replacement token. Replacement never inherits
 * facts from publishing, even when offered immediately after a publish.
 */
export interface ReplacementTokenFacts {
  readonly content_kind: AuthoredContentKind;
  readonly old_content_key: ContentKey;
  readonly new_content_key: ContentKey;
  readonly character_id: CharacterId;
  readonly character_revision: CharacterRevision;
}

export type PublishReviewReason =
  | 'alias'
  | 'compatible-fingerprint'
  | 'srd-fallback'
  | 'metadata-conflict';

export interface PublishReviewItem {
  readonly candidate_content_key: ContentKey;
  readonly candidate_name: string;
  readonly candidate_catalog_layer: CatalogLayerDisclosure;
  readonly reason: PublishReviewReason;
  readonly default_decision: 'match';
}

export interface PublishPreview {
  readonly token: PublishPlanToken;
  readonly facts: PublishTokenFacts;
  readonly aggregate: PublishableHomebrew;
  readonly review: readonly PublishReviewItem[];
}

export type PublishDecision =
  | {
      readonly candidate_content_key: ContentKey;
      readonly decision: Extract<CatalogContentMatchDecision, 'match'>;
      readonly clone_name?: never;
    }
  | {
      readonly candidate_content_key: ContentKey;
      readonly decision: Extract<CatalogContentMatchDecision, 'clone'>;
      readonly clone_name: string;
    };

export type PublishResult =
  | {
      readonly outcome: 'created';
      readonly content_key: ContentKey;
      readonly name: string;
      readonly catalog_layer: 'external';
      readonly previous_key_usage_count: number;
    }
  | {
      readonly outcome: 'matched_existing';
      readonly content_key: ContentKey;
      readonly name: string;
      readonly catalog_layer: CatalogContentLayer;
      readonly previous_key_usage_count: number;
    };

export interface ContentUsage {
  readonly character_id: CharacterId;
  readonly character_revision: CharacterRevision;
  readonly character_name: string;
}

export interface ContentUsageList {
  readonly content_kind: AuthoredContentKind;
  readonly content_key: ContentKey;
  readonly usages: readonly ContentUsage[];
}

export interface ReplacementSetPlan {
  readonly old_content_key: ContentKey;
  readonly new_content_key: ContentKey;
  readonly replacements: readonly ReplacementPlan[];
}

export interface ReplacementSetCommit {
  readonly token: ReplacementPlanToken;
  readonly decisions: readonly ReplacementDecision[];
  readonly choices: readonly ReplacementChoiceSelection[];
}

export interface ReplacementSetResult {
  readonly old_content_key: ContentKey;
  readonly new_content_key: ContentKey;
  readonly replacements: readonly ReplacementResult[];
}

export interface ReplacementChange {
  readonly path: readonly (string | number)[];
  readonly label: string;
  readonly before: JsonValue;
  readonly after: JsonValue;
}

export interface ReplacementChoiceRequirement {
  readonly path: readonly (string | number)[];
  readonly label: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
}

interface ReplacementPlanBase<K extends AuthoredContentKind> {
  readonly kind: K;
  readonly token: ReplacementPlanToken;
  readonly facts: ReplacementTokenFacts & { readonly content_kind: K };
  readonly character_name: string;
  readonly changes: readonly ReplacementChange[];
  readonly required_choices: readonly ReplacementChoiceRequirement[];
  readonly review: readonly ReplacementReviewItem[];
}

export interface SpeciesReplacementPlan
  extends ReplacementPlanBase<'species'> {
  readonly replaces: readonly (
    | 'root_fields'
    | 'traits'
    | 'effects'
    | 'grants'
    | 'filled_choices'
  )[];
}

export interface BackgroundReplacementPlan
  extends ReplacementPlanBase<'background'> {
  readonly replaces: readonly (
    | 'ability_contributions'
    | 'skills'
    | 'origin_feat'
    | 'effects'
    | 'equipment'
  )[];
}

export interface SubclassReplacementPlan
  extends ReplacementPlanBase<'subclass'> {
  readonly replaces: readonly (
    | 'subclass_reference'
    | 'source'
    | 'generated_effects'
    | 'eligible_features'
  )[];
}

export type ReplacementPlan =
  | SpeciesReplacementPlan
  | BackgroundReplacementPlan
  | SubclassReplacementPlan;

export interface ReplacementChoiceSelection {
  readonly path: readonly (string | number)[];
  readonly value: string;
}

export interface ReplacementReviewItem {
  readonly candidate_content_key: ContentKey;
  readonly candidate_name: string;
  readonly candidate_catalog_layer: CatalogLayerDisclosure;
  readonly reason: PublishReviewReason | 'key-collision';
  readonly default_decision: 'match';
}

export interface ReplacementDecision {
  readonly candidate_content_key: ContentKey;
  readonly decision: Extract<CatalogContentMatchDecision, 'match'>;
}

export type ReplacementNotice =
  | {
      readonly kind: 'retargeted_selection_invalid';
      readonly table:
        | 'spell_selection_slots'
        | 'wizard_spellbook_entries'
        | 'character_skill_grants'
        | 'character_skill_expertise_grants';
      readonly source_path: readonly string[];
      readonly rule_key: string;
      readonly ordinal: number;
      readonly selected_value: number | Skill;
      readonly reason:
        | 'target_source_missing'
        | 'target_rule_missing'
        | 'target_rule_changed'
        | 'selection_ineligible';
      readonly detail: string | null;
    }
  | {
      readonly kind: 'retargeted_level_feat_invalid';
      readonly source_path: readonly string[];
      readonly character_level_feat_choice_id: number;
      readonly reason: 'target_source_missing';
    };

export interface ReplacementResult {
  readonly content_kind: AuthoredContentKind;
  readonly character_id: CharacterId;
  readonly character_revision: CharacterRevision;
  readonly old_content_key: ContentKey;
  readonly new_content_key: ContentKey;
  readonly notices: readonly ReplacementNotice[];
}

export type AuthoringValidationIssueCode =
  | 'required'
  | 'unknown_field'
  | 'invalid_type'
  | 'invalid_value'
  | 'out_of_range'
  | 'too_many_items'
  | 'too_long'
  | 'duplicate'
  | 'unresolved_reference';

export interface AuthoringValidationIssue {
  readonly path: readonly (string | number)[];
  readonly code: AuthoringValidationIssueCode;
  readonly message: string;
}

export type AuthoringErrorData =
  | {
      readonly reason: 'validation_failed';
      readonly issues: readonly AuthoringValidationIssue[];
    }
  | {
      readonly reason: 'stale_draft_revision';
      readonly draft_uuid: HomebrewDraftUuid;
      readonly expected_revision: DraftRevision;
      readonly actual_revision: DraftRevision;
    }
  | {
      readonly reason: 'draft_upgrade_required';
      readonly draft_uuid: HomebrewDraftUuid;
      readonly content_kind: AuthoredContentKind;
      readonly stored_version: number;
      readonly latest_supported_version: number;
      readonly recovery_available: true;
      /** Exact stored bytes; the UI may offer these as a recovery download. */
      readonly recovery_document_json: string;
    }
  | {
      readonly reason: 'stale_publish_plan';
      readonly draft_uuid: HomebrewDraftUuid;
    }
  | {
      readonly reason: 'content_key_collision';
      readonly content_key: ContentKey;
    }
  | {
      readonly reason: 'publish_refused';
      readonly refusal: string;
    }
  | {
      readonly reason: 'publish_review_required';
      readonly candidates: readonly ContentKey[];
    }
  | {
      readonly reason: 'stale_replacement_plan';
      readonly character_id: CharacterId;
      readonly expected_revision: CharacterRevision;
      readonly actual_revision: CharacterRevision;
    }
  | {
      readonly reason: 'stale_replacement_set_plan';
      readonly old_content_key: ContentKey;
      readonly new_content_key: ContentKey;
    }
  | {
      readonly reason: 'replacement_choices_required';
      readonly choices: readonly ReplacementChoiceRequirement[];
    }
  | {
      readonly reason: 'replacement_review_required';
      readonly candidates: readonly ContentKey[];
    }
  | {
      readonly reason: 'replacement_refused';
      readonly refusal:
        | 'ambiguous_target'
        | 'target_integrity_refused'
        | 'archived_reference'
        | 'character_reference_not_found'
        | 'unsupported_character_choices'
        | 'wrong_parent_class'
        | 'commit_failed';
    }
  | {
      readonly reason: 'stale_archive_set_plan';
      readonly content_key: ContentKey;
    }
  | {
      readonly reason: 'archive_set_refused';
      readonly refusal:
        | 'bundled_content'
        | 'already_archived_character'
        | 'incomplete_archive_set'
        | 'purge_requires_archive'
        | 'commit_failed';
    }
  | {
      readonly reason:
        | 'draft_not_found'
        | 'content_not_found'
        | 'character_not_found'
        | 'invalid_reference';
    };
