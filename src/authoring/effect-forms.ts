import type {
  Ability,
  CharacterEffectKind,
  DamageType,
  ExtraAttackWeaponScope,
  FeatureTemplateEffectKind,
} from '../domain/enums';
import type { HomebrewDraftItemUuid } from './ids';
import { AUTHORING_NUMERIC_LIMITS } from './limits';

interface EffectPayloadByKind {
  readonly damage_resistance: {
    readonly damage_type: DamageType;
  };
  readonly hp_modifier: {
    readonly hit_points_flat: number | null;
    readonly hit_points_per_level: number | null;
  };
  readonly speed: {
    readonly speed_bonus_feet: number;
  };
  readonly ability_increase: {
    readonly ability: Ability;
    readonly amount: number;
    readonly maximum: number;
  };
  readonly ability_override: {
    readonly ability: Ability;
    readonly maximum: number;
  };
  readonly armor_class_bonus: {
    readonly amount: number;
  };
  readonly armor_class_formula: {
    readonly base: number;
    readonly ability_1: Ability;
    readonly ability_2: Ability | null;
    readonly allows_shield: boolean;
  };
  readonly attack_ability_override: {
    readonly ability: Ability;
    readonly weapon_scope: ExtraAttackWeaponScope;
  };
  readonly weapon_attack_bonus: {
    readonly amount: number;
    readonly weapon_scope: ExtraAttackWeaponScope;
  };
  readonly weapon_damage_bonus: {
    readonly amount: number;
    readonly weapon_scope: ExtraAttackWeaponScope;
  };
  readonly extra_attack: {
    readonly attack_count: number;
    readonly weapon_scope: ExtraAttackWeaponScope;
  };
}

export type AuthorableEffectKind = keyof EffectPayloadByKind;

type EffectPayload<K extends AuthorableEffectKind> =
  EffectPayloadByKind[K];

interface PublishedEffectBase<K extends AuthorableEffectKind> {
  readonly kind: K;
  readonly label: string;
  readonly notes: string | null;
  readonly sort_order: number;
}

type PublishedEffect<K extends AuthorableEffectKind> =
  K extends AuthorableEffectKind
    ? PublishedEffectBase<K> & EffectPayload<K>
    : never;

export type AuthoringCharacterEffect = PublishedEffect<CharacterEffectKind>;
export type AuthoringFeatureEffect =
  PublishedEffect<FeatureTemplateEffectKind>;

interface DraftEffectBase<K extends AuthorableEffectKind> {
  readonly kind: K;
  readonly draft_item_uuid: HomebrewDraftItemUuid;
  readonly label: string;
  readonly notes: string | null;
}

type NullableDraftPayload<K extends AuthorableEffectKind> = {
  readonly [P in keyof EffectPayload<K>]: EffectPayload<K>[P] | null;
};

type DraftEffect<K extends AuthorableEffectKind> =
  K extends AuthorableEffectKind
    ? DraftEffectBase<K> & NullableDraftPayload<K>
    : never;

/**
 * Draft effects stay discriminated while allowing an owned field to be
 * incomplete. Unknown effect kinds and fields are still outside the type.
 */
export type AuthoringDraftCharacterEffect =
  DraftEffect<CharacterEffectKind>;
export type AuthoringDraftFeatureEffect =
  DraftEffect<FeatureTemplateEffectKind>;

type EffectPayloadField<K extends AuthorableEffectKind> =
  Extract<keyof EffectPayload<K>, string>;

export type EffectFormControl =
  | 'ability'
  | 'boolean'
  | 'damage_type'
  | 'integer'
  | 'weapon_scope';

interface EffectFormFieldBase<
  K extends AuthorableEffectKind = AuthorableEffectKind,
> {
  readonly key: EffectPayloadField<K>;
  readonly label: string;
  readonly required: boolean;
}

export type EffectFormFieldDefinition<
  K extends AuthorableEffectKind = AuthorableEffectKind,
> =
  | (EffectFormFieldBase<K> & {
      readonly control: Exclude<EffectFormControl, 'integer'>;
    })
  | (EffectFormFieldBase<K> & {
      readonly control: 'integer';
      readonly minimum: number;
      readonly maximum: number;
      readonly non_zero: boolean;
    });

export interface EffectFormDefinition<
  K extends AuthorableEffectKind = AuthorableEffectKind,
> {
  readonly kind: K;
  readonly label: string;
  readonly fields: readonly EffectFormFieldDefinition<K>[];
  readonly at_least_one_of: readonly EffectPayloadField<K>[];
}

export type CharacterEffectFormRegistry = {
  readonly [K in CharacterEffectKind]: EffectFormDefinition<K>;
};

export type FeatureOnlyEffectKind = Exclude<
  FeatureTemplateEffectKind,
  CharacterEffectKind
>;

export type FeatureOnlyEffectFormRegistry = {
  readonly [K in FeatureOnlyEffectKind]: EffectFormDefinition<K>;
};

export const CHARACTER_EFFECT_FORM = Object.freeze({
  damage_resistance: {
    kind: 'damage_resistance',
    label: 'Damage resistance',
    at_least_one_of: [],
    fields: [
      {
        key: 'damage_type',
        label: 'Damage type',
        control: 'damage_type',
        required: true,
      },
    ],
  },
  hp_modifier: {
    kind: 'hp_modifier',
    label: 'Hit point modifier',
    at_least_one_of: ['hit_points_flat', 'hit_points_per_level'],
    fields: [
      {
        key: 'hit_points_flat',
        label: 'Flat hit points',
        control: 'integer',
        required: false,
        minimum: -AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        non_zero: false,
      },
      {
        key: 'hit_points_per_level',
        label: 'Hit points per character level',
        control: 'integer',
        required: false,
        minimum: -AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        non_zero: false,
      },
    ],
  },
  speed: {
    kind: 'speed',
    label: 'Speed bonus',
    at_least_one_of: [],
    fields: [
      {
        key: 'speed_bonus_feet',
        label: 'Feet',
        control: 'integer',
        required: true,
        minimum: -AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        non_zero: false,
      },
    ],
  },
  ability_increase: {
    kind: 'ability_increase',
    label: 'Ability increase',
    at_least_one_of: [],
    fields: [
      {
        key: 'ability',
        label: 'Ability',
        control: 'ability',
        required: true,
      },
      {
        key: 'amount',
        label: 'Amount',
        control: 'integer',
        required: true,
        minimum: -AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        non_zero: true,
      },
      {
        key: 'maximum',
        label: 'Maximum score',
        control: 'integer',
        required: true,
        minimum: AUTHORING_NUMERIC_LIMITS.minimumAbilityScore,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumAbilityScore,
        non_zero: true,
      },
    ],
  },
  ability_override: {
    kind: 'ability_override',
    label: 'Ability override',
    at_least_one_of: [],
    fields: [
      {
        key: 'ability',
        label: 'Ability',
        control: 'ability',
        required: true,
      },
      {
        key: 'maximum',
        label: 'Set-to score',
        control: 'integer',
        required: true,
        minimum: AUTHORING_NUMERIC_LIMITS.minimumAbilityScore,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumAbilityScore,
        non_zero: true,
      },
    ],
  },
  armor_class_bonus: {
    kind: 'armor_class_bonus',
    label: 'Armor Class bonus',
    at_least_one_of: [],
    fields: [
      {
        key: 'amount',
        label: 'Amount',
        control: 'integer',
        required: true,
        minimum: -AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        non_zero: true,
      },
    ],
  },
  armor_class_formula: {
    kind: 'armor_class_formula',
    label: 'Armor Class formula',
    at_least_one_of: [],
    fields: [
      {
        key: 'base',
        label: 'Base',
        control: 'integer',
        required: true,
        minimum: 1,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        non_zero: true,
      },
      {
        key: 'ability_1',
        label: 'First ability',
        control: 'ability',
        required: true,
      },
      {
        key: 'ability_2',
        label: 'Second ability',
        control: 'ability',
        required: false,
      },
      {
        key: 'allows_shield',
        label: 'Allows a shield',
        control: 'boolean',
        required: true,
      },
    ],
  },
  attack_ability_override: {
    kind: 'attack_ability_override',
    label: 'Attack ability override',
    at_least_one_of: [],
    fields: [
      {
        key: 'ability',
        label: 'Ability',
        control: 'ability',
        required: true,
      },
      {
        key: 'weapon_scope',
        label: 'Weapon scope',
        control: 'weapon_scope',
        required: true,
      },
    ],
  },
  weapon_attack_bonus: {
    kind: 'weapon_attack_bonus',
    label: 'Weapon attack bonus',
    at_least_one_of: [],
    fields: [
      {
        key: 'amount',
        label: 'Amount',
        control: 'integer',
        required: true,
        minimum: -AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        non_zero: true,
      },
      {
        key: 'weapon_scope',
        label: 'Weapon scope',
        control: 'weapon_scope',
        required: true,
      },
    ],
  },
  weapon_damage_bonus: {
    kind: 'weapon_damage_bonus',
    label: 'Weapon damage bonus',
    at_least_one_of: [],
    fields: [
      {
        key: 'amount',
        label: 'Amount',
        control: 'integer',
        required: true,
        minimum: -AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        non_zero: true,
      },
      {
        key: 'weapon_scope',
        label: 'Weapon scope',
        control: 'weapon_scope',
        required: true,
      },
    ],
  },
} as const satisfies CharacterEffectFormRegistry);

export const FEATURE_ONLY_EFFECT_FORM = Object.freeze({
  extra_attack: {
    kind: 'extra_attack',
    label: 'Extra Attack',
    at_least_one_of: [],
    fields: [
      {
        key: 'attack_count',
        label: 'Total attacks',
        control: 'integer',
        required: true,
        minimum: AUTHORING_NUMERIC_LIMITS.minimumAttackCount,
        maximum: AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
        non_zero: true,
      },
      {
        key: 'weapon_scope',
        label: 'Weapon scope',
        control: 'weapon_scope',
        required: true,
      },
    ],
  },
} as const satisfies FeatureOnlyEffectFormRegistry);
