import type { GridCell } from './grid';
import type { CombatantId, ItemId } from './values';

export type ItemMaterial =
  | { readonly kind: 'known'; readonly name: 'metal' }
  | { readonly kind: 'other'; readonly name: string };

export type ItemEquipMode =
  | { readonly kind: 'held'; readonly handCapacity: 1 | 2; readonly droppable: true }
  | { readonly kind: 'worn'; readonly droppable: false };

export interface EquipmentItemDefinition {
  readonly id: ItemId;
  readonly sourceId: string;
  readonly recordId: string;
  readonly name: string;
  readonly materials: readonly ItemMaterial[];
  readonly equip: ItemEquipMode;
}

/**
 * Two-handed equipment owns the whole hand state. It cannot be represented in
 * one hand, and no second held item can coexist with this variant.
 */
export type HandEquipment =
  | { readonly kind: 'empty' }
  | { readonly kind: 'one_handed'; readonly items: readonly [ItemId] | readonly [ItemId, ItemId] }
  | { readonly kind: 'two_handed'; readonly item: ItemId };

export interface CombatantEquipment {
  readonly combatant: CombatantId;
  readonly hands: HandEquipment;
  /** An unordered set, serialized in stable item-id order. */
  readonly worn: readonly ItemId[];
  readonly carried: readonly ItemId[];
}

export interface GroundItem {
  readonly item: ItemId;
  readonly position: GridCell;
}

/** Explicit contact supplements contact implied by holding, wearing, or sharing a dropped item's cell. */
export interface ItemPhysicalContact {
  readonly item: ItemId;
  readonly combatant: CombatantId;
}

export type ObjectInteractionMode = 'free' | 'utilize_action';

/**
 * SRD 5.2.1 permits one free object interaction per turn; another requires
 * the Utilize action (docs/srd/full/srd-5.2.1.txt:796-803).
 */
export const FREE_OBJECT_INTERACTIONS_PER_TURN = 1 as const;

export type EquipmentRefusalCode =
  | 'unknown_item'
  | 'item_not_carried'
  | 'item_not_equipped'
  | 'item_not_on_ground'
  | 'item_not_at_actor_cell'
  | 'hand_capacity_exceeded'
  | 'equip_location_mismatch'
  | 'material_mismatch'
  | 'form_equipment_unavailable'
  | 'cannot_drop'
  | 'free_interaction_spent'
  | 'utilize_action_unavailable';
