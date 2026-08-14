import type {
  CharacterEffectKind,
  EffectPayloadByKind,
} from './effect-kinds';

/** Maximum ordered effects accepted on one weapon or item command/catalog row. */
export const EQUIPMENT_EFFECT_COUNT_MAX = 200;

interface NamedEquipmentEffect {
  readonly label: string;
  readonly notes: string | null;
  /** Internal inverse fields; ordinary authoring leaves both absent. */
  readonly effect_id?: number;
  readonly sort_order?: number;
}

type EquipmentEffectOfKind<K extends CharacterEffectKind> =
  K extends CharacterEffectKind
    ? NamedEquipmentEffect &
      { readonly effect_kind: K } &
      EffectPayloadByKind<'equipment'>[K]
    : never;

export type EquipmentEffectInput =
  EquipmentEffectOfKind<CharacterEffectKind>;
