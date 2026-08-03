import type {
  AuthoringGrant,
  BackgroundContentAggregate,
  ContentFingerprintReference,
  SpeciesContentAggregate,
  SubclassContentAggregate,
} from '../authoring/contracts';
import type { DomainSourceType, GrantRuleKind } from '../domain/enums';
import type { JsonValue } from '../domain/models';
import type {
  AuthoringCharacterEffect,
  AuthoringFeatureEffect,
} from '../authoring/effect-forms';
import type {
  CanonicalOpenPassthroughValue,
  CanonicalRuleText,
  ContentIdentitySequence,
  ContentIdentitySet,
  ContentKind,
} from './content-identity';

/** The three complete creations whose content-v1 projections HA-1 freezes. */
export type AuthoredProjectorKind = 'species' | 'background' | 'subclass';

export type AuthoredProjectorAggregate<K extends AuthoredProjectorKind> =
  K extends 'species'
    ? SpeciesContentAggregate
    : K extends 'background'
      ? BackgroundContentAggregate
      : SubclassContentAggregate;

/**
 * Vocabulary used by CI-5's per-character transitive closure. Each edge is a
 * verified same-scheme fingerprint reference, never a database id or alias.
 */
/** One semantic edge, with role and target kind coupled in the type system. */
export type AuthoredContentReferenceV1 =
  | {
      readonly role: 'grant.fixed_spell';
      readonly reference: ContentFingerprintReference<'spell'>;
    }
  | {
      readonly role: 'grant.source_definition';
      readonly reference: ContentFingerprintReference<DomainSourceType>;
    }
  | {
      readonly role: 'background.default_origin_feat';
      readonly reference: ContentFingerprintReference<'feat'>;
    }
  | {
      readonly role: 'background.equipment.weapon';
      readonly reference: ContentFingerprintReference<'weapon'>;
    }
  | {
      readonly role: 'background.equipment.armor';
      readonly reference: ContentFingerprintReference<'armor'>;
    }
  | {
      readonly role: 'subclass.parent_class';
      readonly reference: ContentFingerprintReference<'class'>;
    };

export type AuthoredContentReferenceRole =
  AuthoredContentReferenceV1['role'];

export type AuthoredProjectorReferenceV1<K extends AuthoredProjectorKind> =
  K extends 'species'
    ? Extract<
        AuthoredContentReferenceV1,
        { readonly role: 'grant.fixed_spell' | 'grant.source_definition' }
      >
    : K extends 'background'
      ? Extract<
          AuthoredContentReferenceV1,
          {
            readonly role:
              | 'background.default_origin_feat'
              | 'background.equipment.weapon'
              | 'background.equipment.armor'
              | 'grant.source_definition';
          }
        >
      : Extract<
          AuthoredContentReferenceV1,
          {
            readonly role:
              | 'grant.fixed_spell'
              | 'grant.source_definition'
              | 'subclass.parent_class';
          }
        >;

/**
 * Tables grouped as one creation for D138 archive/delete cascades. CI-3a/3b
 * install exactly one group and CI-5 walks references between groups.
 */
export type AuthoredCreationOwnedTable =
  | 'species_definitions'
  | 'species_templates'
  | 'species_template_traits'
  | 'species_template_trait_effects'
  | 'background_definitions'
  | 'background_templates'
  | 'background_equipment_items'
  | 'background_template_effects'
  | 'subclass_definitions'
  | 'subclass_progressions'
  | 'subclass_features'
  | 'subclass_feature_effects';

export interface AuthoredProjectorContractV1<
  K extends AuthoredProjectorKind,
  P,
> {
  readonly kind: K;
  readonly aggregate: AuthoredProjectorAggregate<K>;
  readonly payload: P;
  readonly references: readonly AuthoredProjectorReferenceV1<K>[];
}

type CanonicalizedEffect<E extends AuthoringCharacterEffect | AuthoringFeatureEffect> =
  E extends { readonly kind: 'damage_resistance' }
    ? Omit<E, 'damage_type' | 'notes' | 'sort_order'> & {
        readonly damage_type: CanonicalOpenPassthroughValue;
        readonly notes: CanonicalRuleText | null;
      }
    : Omit<E, 'notes' | 'sort_order'> & {
        readonly notes: CanonicalRuleText | null;
      };

export type CanonicalCharacterEffectV1 = CanonicalizedEffect<AuthoringCharacterEffect>;
export type CanonicalFeatureEffectV1 = CanonicalizedEffect<AuthoringFeatureEffect>;

/**
 * Grant order is meaningful, while eligibility-list members are mathematical
 * sets. The open field map mirrors GrantRule's extension-preserving parser.
 */
export interface CanonicalAuthoringGrantV1 {
  readonly kind: GrantRuleKind;
  readonly rule_key: string;
  readonly [field: string]:
    | JsonValue
    | ContentFingerprintReference
    | CanonicalRuleText
    | ContentIdentitySet<JsonValue>;
}

export interface CanonicalSpeciesTraitV1 {
  readonly name: string;
  readonly description: CanonicalRuleText;
  readonly effects: ContentIdentitySequence<CanonicalCharacterEffectV1>;
}

export interface SpeciesProjectorPayloadV1 {
  readonly reference_text: CanonicalRuleText;
  readonly repeatable: boolean;
  readonly grants: ContentIdentitySequence<CanonicalAuthoringGrantV1>;
  readonly creature_type: CanonicalOpenPassthroughValue;
  readonly primary_size: CanonicalOpenPassthroughValue;
  readonly alternate_size: CanonicalOpenPassthroughValue | null;
  readonly walking_speed_feet: number;
  readonly traits: ContentIdentitySequence<CanonicalSpeciesTraitV1>;
}

export type CanonicalBackgroundEquipmentV1 =
  Omit<BackgroundContentAggregate['equipment_option_a'][number], 'sort_order'>;

export interface BackgroundProjectorPayloadV1 {
  readonly reference_text: CanonicalRuleText;
  readonly repeatable: boolean;
  readonly grants: ContentIdentitySequence<CanonicalAuthoringGrantV1>;
  readonly suggested_abilities: BackgroundContentAggregate['suggested_abilities'];
  readonly default_origin_feat: ContentFingerprintReference<'feat'>;
  readonly skill_proficiencies: BackgroundContentAggregate['skill_proficiencies'];
  readonly tool_reference_text: CanonicalRuleText | null;
  readonly equipment_option_a_description: CanonicalRuleText;
  readonly equipment_option_b_description: CanonicalRuleText;
  readonly equipment_option_a: ContentIdentitySequence<CanonicalBackgroundEquipmentV1>;
  readonly equipment_option_b: ContentIdentitySequence<CanonicalBackgroundEquipmentV1>;
  readonly effects: ContentIdentitySequence<CanonicalCharacterEffectV1>;
}

export type SubclassProgressionProjectionV1 =
  | { readonly mode: 'inherit_parent' }
  | Extract<
      SubclassContentAggregate['progression'],
      { readonly mode: 'root_only' }
    >
  | {
      readonly mode: 'override';
      readonly spellcasting_ability: Extract<
        SubclassContentAggregate['progression'],
        { readonly mode: 'override' }
      >['spellcasting_ability'];
      readonly caster_contribution: Extract<
        SubclassContentAggregate['progression'],
        { readonly mode: 'override' }
      >['caster_contribution'];
      readonly rows: ContentIdentitySequence<
        {
          readonly class_level: SubclassContentAggregate['features'][number]['class_level'];
          readonly cantrips_known: number;
          readonly prepared_or_known_count: number;
          readonly maximum_spell_level: number;
          readonly slot_counts: readonly [
            number, number, number, number, number,
            number, number, number, number,
          ];
          readonly grants: ContentIdentitySequence<
            CanonicalAuthoringGrantV1
          >;
        }
      >;
    };

export interface CanonicalSubclassFeatureV1 {
  readonly class_level: SubclassContentAggregate['features'][number]['class_level'];
  readonly name: string;
  readonly description: CanonicalRuleText;
  readonly effects: ContentIdentitySequence<CanonicalFeatureEffectV1>;
}

export interface SubclassProjectorPayloadV1 {
  readonly reference_text: CanonicalRuleText;
  readonly parent_class: ContentFingerprintReference<'class'>;
  readonly grants: ContentIdentitySequence<CanonicalAuthoringGrantV1>;
  readonly progression: SubclassProgressionProjectionV1;
  readonly features: ContentIdentitySequence<CanonicalSubclassFeatureV1>;
}

export type AuthoredProjectorPayloadV1<K extends AuthoredProjectorKind> =
  K extends 'species'
    ? SpeciesProjectorPayloadV1
    : K extends 'background'
      ? BackgroundProjectorPayloadV1
      : SubclassProjectorPayloadV1;

export interface AuthoredProjectorInventoryEntryV1<
  K extends AuthoredProjectorKind,
> {
  readonly kind: K;
  readonly ownedTables: readonly AuthoredCreationOwnedTable[];
  readonly outboundReferenceRoles: readonly AuthoredContentReferenceRole[];
}

/** Closed inventory consumed by installers, closure export, and cascade plans. */
export const AUTHORED_PROJECTOR_INVENTORY_V1 = {
  species: {
    kind: 'species',
    ownedTables: [
      'species_definitions',
      'species_templates',
      'species_template_traits',
      'species_template_trait_effects',
    ],
    outboundReferenceRoles: [
      'grant.fixed_spell',
      'grant.source_definition',
    ],
  },
  background: {
    kind: 'background',
    ownedTables: [
      'background_definitions',
      'background_templates',
      'background_equipment_items',
      'background_template_effects',
    ],
    outboundReferenceRoles: [
      'background.default_origin_feat',
      'background.equipment.weapon',
      'background.equipment.armor',
      'grant.source_definition',
    ],
  },
  subclass: {
    kind: 'subclass',
    ownedTables: [
      'subclass_definitions',
      'subclass_progressions',
      'subclass_features',
      'subclass_feature_effects',
    ],
    outboundReferenceRoles: [
      'grant.fixed_spell',
      'grant.source_definition',
      'subclass.parent_class',
    ],
  },
} as const satisfies {
  readonly [K in AuthoredProjectorKind]: AuthoredProjectorInventoryEntryV1<K>;
};

/** Compile-time closure: no unrelated content kind can enter these contracts. */
export type _AuthoredReferenceKinds = Extract<
  ContentKind,
  | 'spell'
  | 'feat'
  | 'weapon'
  | 'armor'
  | 'class'
  | 'subclass'
  | 'species'
  | 'background'
>;
