import type {
  AuthoringGrant,
  ContentFingerprintReference,
} from '../authoring/contracts';
import type { Ability, DamageType } from '../domain/enums';
import type {
  CanonicalAuthoringGrantV1,
  SpeciesProjectorPayloadV1,
  SpeciesTemplateOnlyProjectorPayloadV1,
  SpeciesTwoHalfProjectorPayloadV1,
  SpeciesTemplateOnlyAggregateV1,
  SpeciesTwoHalfProjectorAggregateV1,
} from './authored-content-projector-contract-v1';
import type {
  CanonicalOpenPassthroughValue,
  CanonicalRuleText,
  ContentIdentitySequence,
} from './content-identity';

export type PortableConfiguredChoiceEffectV2 =
  | Readonly<{
      kind: 'speed';
      label: string;
      speed_bonus_feet: number;
    }>
  | Readonly<{
      kind: 'damage_resistance';
      label: string;
      damage_type: DamageType;
    }>;

export interface PortableReplaceableSpellChoiceV2 {
  readonly config_key: string;
  readonly label: string;
  readonly required: true;
  readonly spell_list: string;
  readonly spell_level: 0;
  readonly initial_spell: ContentFingerprintReference<'spell'>;
  readonly display_on_sheet: true;
}

export interface PortableConfiguredChoiceOptionV2 {
  readonly value: string;
  readonly label: string;
  readonly sheet: Readonly<{ darkvision_feet?: number }>;
  readonly effects: readonly PortableConfiguredChoiceEffectV2[];
  readonly grants: readonly AuthoringGrant[];
  readonly replaceable_spell_choice: PortableReplaceableSpellChoiceV2 | null;
}

export interface PortableConfiguredChoiceRuleV2 {
  readonly kind: 'configured_choice';
  readonly rule_key: string;
  readonly label: string;
  readonly config_key: string;
  readonly required: true;
  readonly ability_choice: null | Readonly<{
    config_key: string;
    options: readonly Ability[];
  }>;
  readonly unknown_sheet_fields: readonly string[];
  readonly projected_trait_names: readonly string[];
  readonly options: readonly PortableConfiguredChoiceOptionV2[];
}

export type PortableSourceRuleV2 =
  | AuthoringGrant
  | PortableConfiguredChoiceRuleV2;

export interface CanonicalConfiguredChoiceOptionV2
  extends Omit<PortableConfiguredChoiceOptionV2, 'label' | 'effects' | 'grants'> {
  readonly label: CanonicalRuleText;
  readonly effects: ContentIdentitySequence<
    | Extract<PortableConfiguredChoiceEffectV2, { readonly kind: 'speed' }>
    | (Omit<
        Extract<PortableConfiguredChoiceEffectV2, { readonly kind: 'damage_resistance' }>,
        'damage_type'
      > & { readonly damage_type: CanonicalOpenPassthroughValue })
  >;
  readonly grants: ContentIdentitySequence<CanonicalAuthoringGrantV1>;
}

export interface CanonicalConfiguredChoiceRuleV2
  extends Omit<PortableConfiguredChoiceRuleV2, 'label' | 'options'> {
  readonly label: CanonicalRuleText;
  readonly options: ContentIdentitySequence<CanonicalConfiguredChoiceOptionV2>;
}

export type CanonicalSourceRuleV2 =
  | CanonicalAuthoringGrantV1
  | CanonicalConfiguredChoiceRuleV2;

export type SpeciesProjectorAggregateV2 =
  | SpeciesTemplateOnlyAggregateV1
  | (Omit<SpeciesTwoHalfProjectorAggregateV1, 'grants'> & {
      readonly source_rules: readonly PortableSourceRuleV2[];
    });

export type SpeciesTwoHalfProjectorPayloadV2 = Omit<
  SpeciesTwoHalfProjectorPayloadV1,
  'grants'
> & {
  readonly source_rules: ContentIdentitySequence<CanonicalSourceRuleV2>;
};

export type SpeciesProjectorPayloadV2 =
  | SpeciesTwoHalfProjectorPayloadV2
  | SpeciesTemplateOnlyProjectorPayloadV1;

export interface SpeciesProjectorContractV2 {
  readonly kind: 'species';
  readonly aggregate: SpeciesProjectorAggregateV2;
  readonly payload: SpeciesProjectorPayloadV2;
  readonly references: readonly {
    readonly role: 'grant.fixed_spell' | 'grant.source_definition';
    readonly reference: ContentFingerprintReference;
  }[];
}

export type _V1SpeciesPayloadRemainsDistinct = Exclude<
  SpeciesProjectorPayloadV1,
  SpeciesProjectorPayloadV2
>;
