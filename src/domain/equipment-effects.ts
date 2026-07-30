import type {
  Ability,
  DamageType,
  ExtraAttackWeaponScope,
} from './enums';

interface NamedEquipmentEffect {
  readonly label: string;
  readonly notes: string | null;
  /** Internal inverse fields; ordinary authoring leaves both absent. */
  readonly effect_id?: number;
  readonly sort_order?: number;
}

export type EquipmentEffectInput =
  | (NamedEquipmentEffect & {
      readonly effect_kind: 'damage_resistance';
      readonly damage_type: DamageType | null;
    })
  | (NamedEquipmentEffect & {
      readonly effect_kind: 'hp_modifier';
      readonly hit_points_flat: number | null;
      readonly hit_points_per_level: number | null;
    })
  | (NamedEquipmentEffect & {
      readonly effect_kind: 'speed';
      readonly speed_bonus_feet: number;
    })
  | (NamedEquipmentEffect & {
      readonly effect_kind: 'ability_increase';
      readonly ability: Ability;
      readonly amount: number;
      readonly maximum: number;
    })
  | (NamedEquipmentEffect & {
      readonly effect_kind: 'armor_class_bonus';
      readonly amount: number;
    })
  | (NamedEquipmentEffect & {
      readonly effect_kind: 'armor_class_formula';
      readonly base: number;
      readonly ability_1: Ability;
      readonly ability_2: Ability | null;
      readonly allows_shield: boolean;
    })
  | (NamedEquipmentEffect & {
      readonly effect_kind: 'attack_ability_override';
      readonly ability: Ability;
      readonly weapon_scope: ExtraAttackWeaponScope;
    })
  | (NamedEquipmentEffect & {
      readonly effect_kind: 'weapon_attack_bonus' | 'weapon_damage_bonus';
      readonly amount: number;
      readonly weapon_scope: ExtraAttackWeaponScope;
    });
