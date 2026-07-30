import { WIRE_SCHEMA_V11 } from './v11';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 12 — D86 CHARACTER ITEM QUANTITY.
 *
 * The ITEM tuple appends the positive integer quantity. Every v11 item meant
 * one possession because quantity did not yet exist, so the adjacent migration
 * fills exactly one without changing any earlier field position.
 */
export const WIRE_SCHEMA_V12 = deepFreeze({
  version: 12,
  tuples: {
    ...WIRE_SCHEMA_V11.tuples,
    item: {
      arities: [5],
      fields: [
        ...WIRE_SCHEMA_V11.tuples.item.fields,
        {
          key: 'quantity',
          wireType: 'integer',
          meaning: 'positive count of identical possessions in this row',
        },
      ],
    },
  },
} as const);

export type WireSchemaV12 = typeof WIRE_SCHEMA_V12;
