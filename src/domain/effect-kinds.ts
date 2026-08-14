import type {
  Ability,
  DamageType,
  ExtraAttackWeaponScope,
} from './enums';

/** Payload requiredness varies by boundary; the field set does not. */
export type EffectContext = 'authored' | 'equipment' | 'stored';

/**
 * The payload owned by every mechanical effect kind.
 *
 * Authored resistance effects must name their damage type. Equipment and
 * stored character effects may leave it unresolved, which is a real state and
 * not a fallback value.
 */
export interface EffectPayloadByKind<
  C extends EffectContext = 'authored',
> {
  readonly damage_resistance: {
    readonly damage_type:
      C extends 'authored' ? DamageType : DamageType | null;
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
    /**
     * The score to set, carried in the shared absolute-score column.
     *
     * `amount` stays additive-only. Reusing `maximum` keeps this value under
     * the existing 1..30 ability-score discipline without making a SET look
     * like an increment.
     */
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

export type EffectKindName = keyof EffectPayloadByKind;

export type EffectScope =
  | 'contribution'
  | 'character'
  | 'class_feature'
  | 'feature_template';

/**
 * Which effect vocabularies each payload belongs to.
 *
 * This is the sole membership declaration. The runtime arrays below derive
 * from it, so adding a payload without scopes (or a scoped kind without a
 * payload) is a compile error.
 */
export const EFFECT_KIND_SCOPES = {
  damage_resistance: ['contribution', 'character', 'feature_template'],
  hp_modifier: ['contribution', 'character', 'feature_template'],
  speed: ['contribution', 'character', 'feature_template'],
  // D63: ability increases are sourced additive contributions.
  ability_increase: ['contribution', 'character', 'feature_template'],
  // D83 excludes class/feat templates. D236 explicitly lets species templates
  // use the character vocabulary, including this kind.
  ability_override: ['character'],
  // D72: AC and weapon modifiers are one character-effect vocabulary, and
  // class/feat templates can declare the same mechanics.
  armor_class_bonus: ['character', 'feature_template'],
  armor_class_formula: ['character', 'feature_template'],
  attack_ability_override: ['character', 'feature_template'],
  weapon_attack_bonus: ['character', 'feature_template'],
  weapon_damage_bonus: ['character', 'feature_template'],
  // D18/D19: this remains the sole class-feature-only member; adding another
  // requires replacing the one-effect-per-feature model with a child table.
  extra_attack: ['class_feature', 'feature_template'],
} as const satisfies Readonly<
  Record<EffectKindName, readonly EffectScope[]>
>;

export type EffectOfScope<S extends EffectScope> = {
  [K in EffectKindName]:
    S extends (typeof EFFECT_KIND_SCOPES)[K][number] ? K : never;
}[EffectKindName];

function effectKindsOfScope<S extends EffectScope>(
  scope: S,
): readonly EffectOfScope<S>[] {
  const kinds = Object.keys(EFFECT_KIND_SCOPES) as EffectKindName[];
  return kinds.filter((kind): kind is EffectOfScope<S> =>
    (EFFECT_KIND_SCOPES[kind] as readonly EffectScope[]).includes(scope));
}

export const effectKinds = effectKindsOfScope('contribution');
export type EffectKind = EffectOfScope<'contribution'>;

export const characterEffectKinds = effectKindsOfScope('character');
export type CharacterEffectKind = EffectOfScope<'character'>;

export const classFeatureEffectKinds = effectKindsOfScope('class_feature');
export type ClassFeatureEffectKind = EffectOfScope<'class_feature'>;

export const featureTemplateEffectKinds =
  effectKindsOfScope('feature_template');
export type FeatureTemplateEffectKind = EffectOfScope<'feature_template'>;
