import { WIRE_SCHEMA_V2 } from './v2';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 3 changes exactly one position: the character tuple APPENDS
 * `ability_allocation_method` (D64's allocation signal), taking its arity from
 * 11 to 12.
 *
 * THE SIGNAL MUST TRAVEL, AND THIS VERSION IS WHY. The exporter omits scores
 * equal to 10 and the importer refills `?? 10` — deliberate compression, but
 * with no signal on the wire an ALLOCATED all-10s character round-tripped
 * looking unallocated, and D64 makes all 10s an explicitly valid allocation.
 * Carrying the method is the fix: the scores may compress away, the fact that
 * someone chose them may not.
 *
 * Appended, never inserted — every earlier position keeps its meaning, which
 * is what lets the v2→v3 migration be a single null-pad. Every unchanged
 * tuple is shared with the already-frozen v2 inventory.
 */
export const WIRE_SCHEMA_V3 = deepFreeze({
  version: 3,
  tuples: {
    ...WIRE_SCHEMA_V2.tuples,
    character: {
      arities: [12],
      fields: [
        ...WIRE_SCHEMA_V2.tuples.character.fields,
        {
          key: 'ability_allocation_method',
          wireType: 'string',
          meaning: 'how the six base scores were allocated; null when never allocated',
        },
      ],
    },
  },
} as const);

export type WireSchemaV3 = typeof WIRE_SCHEMA_V3;
