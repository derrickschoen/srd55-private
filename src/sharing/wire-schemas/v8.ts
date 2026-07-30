import { WIRE_SCHEMA_V7 } from './v7';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 8 — ARMOR CLASS, ITEMS AND ONE EFFECT VOCABULARY (AC-1, D72;
 * `docs/design/2026-07-29-armor-class-items-and-effects.md`, §1, §10).
 *
 * TWO CHANGES, BOTH ADDITIVE.
 *
 * The EFFECT tuple APPENDS five fields — `base`, `ability_1`, `ability_2`,
 * `allows_shield`, `weapon_scope` — taking its arity from 12 to 17. They carry
 * the `armor_class_formula` payload (base + up to two abilities +
 * `allows_shield`) and the weapon-scoped payload shared by
 * `attack_ability_override`, `weapon_attack_bonus` and `weapon_damage_bonus`.
 * Appended, never inserted — every earlier position keeps its meaning, which
 * is what lets the v7→v8 migration be a per-effect null-pad exactly as
 * v3→v4's `ability_increase` append was.
 *
 * The ROOT APPENDS one element, `items`, taking its arity from 17 to 18 — a
 * new list of `item` tuples for `character_items` (D72: things that only
 * modify, speaking through the effect vocabulary above rather than carrying
 * their own modifier columns). The v7→v8 migration null-pads this position
 * too: no pre-v8 document could carry an item.
 *
 * Every unchanged tuple is shared with the already-frozen v7 inventory.
 */
export const WIRE_SCHEMA_V8 = deepFreeze({
  version: 8,
  tuples: {
    ...WIRE_SCHEMA_V7.tuples,
    root: {
      arities: [18],
      fields: [
        ...WIRE_SCHEMA_V7.tuples.root.fields,
        {
          key: 'items',
          wireType: 'list',
          meaning: 'character-owned items; null when none',
        },
      ],
    },
    effect: {
      arities: [17],
      fields: [
        ...WIRE_SCHEMA_V7.tuples.effect.fields,
        {
          key: 'base',
          wireType: 'integer',
          meaning: 'armor_class_formula flat base',
        },
        {
          key: 'ability_1',
          wireType: 'string',
          meaning: 'armor_class_formula first ability',
        },
        {
          key: 'ability_2',
          wireType: 'string',
          meaning: 'armor_class_formula optional second ability',
        },
        {
          key: 'allows_shield',
          wireType: 'boolean',
          meaning: 'armor_class_formula shield eligibility',
        },
        {
          key: 'weapon_scope',
          wireType: 'string',
          meaning:
            'weapon scope for attack_ability_override / weapon_attack_bonus / weapon_damage_bonus',
        },
      ],
    },
    item: {
      arities: [5],
      fields: [
        { key: 'name', wireType: 'string', meaning: 'item name' },
        {
          key: 'description',
          wireType: 'string',
          meaning: 'item description',
        },
        {
          key: 'requires_attunement',
          wireType: 'boolean',
          meaning: 'whether the item needs attunement at all',
        },
        {
          key: 'attuned',
          wireType: 'boolean',
          meaning: 'whether the character has attuned to it',
        },
        {
          key: 'sourceRef',
          wireType: 'integer',
          meaning: 'share-local source reference; null when a person added it',
        },
      ],
    },
  },
} as const);

export type WireSchemaV8 = typeof WIRE_SCHEMA_V8;
