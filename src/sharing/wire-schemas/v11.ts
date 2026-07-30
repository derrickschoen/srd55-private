import { WIRE_SCHEMA_V10 } from './v10';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 11 — D92'S THREE ATTUNEMENT SLOTS.
 *
 * The ITEM tuple drops the historical `attuned` boolean. The ROOT appends one
 * fixed three-position tuple whose nullable values are zero-based references
 * into the items list. Capacity is therefore structural on the wire too: a
 * fourth position does not exist.
 */
export const WIRE_SCHEMA_V11 = deepFreeze({
  version: 11,
  tuples: {
    ...WIRE_SCHEMA_V10.tuples,
    root: {
      arities: [19],
      fields: [
        ...WIRE_SCHEMA_V10.tuples.root.fields,
        {
          key: 'attunementSlots',
          wireType: 'tuple',
          meaning:
            'exactly three nullable zero-based item references; null when empty',
        },
      ],
    },
    item: {
      arities: [4],
      fields: [
        WIRE_SCHEMA_V10.tuples.item.fields[0],
        WIRE_SCHEMA_V10.tuples.item.fields[1],
        WIRE_SCHEMA_V10.tuples.item.fields[2],
        WIRE_SCHEMA_V10.tuples.item.fields[4],
      ],
    },
    attunementSlots: {
      arities: [3],
      fields: [
        {
          key: 'slot1ItemRef',
          wireType: 'integer',
          meaning: 'zero-based item reference for attunement slot 1',
        },
        {
          key: 'slot2ItemRef',
          wireType: 'integer',
          meaning: 'zero-based item reference for attunement slot 2',
        },
        {
          key: 'slot3ItemRef',
          wireType: 'integer',
          meaning: 'zero-based item reference for attunement slot 3',
        },
      ],
    },
  },
} as const);

export type WireSchemaV11 = typeof WIRE_SCHEMA_V11;
