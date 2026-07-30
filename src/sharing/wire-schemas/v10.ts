import { WIRE_SCHEMA_V9 } from './v9';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 10 — MANUAL ARMOR CLASS ADJUSTMENT RETIRED (AC-4, D72).
 *
 * The SHEET tuple drops its fourth field, `sheetAdjustment`, because every
 * numeric change now travels through the EFFECT tuple. The adjacent v9→v10
 * migration preserves every non-zero historical adjustment by appending one
 * manual `armor_class_bonus` effect; zero, including zero with a note, appends
 * nothing.
 *
 * The historical `sheetAdjustment` tuple schema remains in the inherited
 * inventory solely so frozen v1–v9 documents can be described and migrated.
 * It is unreachable from v10's three-field SHEET tuple.
 */
export const WIRE_SCHEMA_V10 = deepFreeze({
  version: 10,
  tuples: {
    ...WIRE_SCHEMA_V9.tuples,
    sheet: {
      arities: [3],
      fields: [
        WIRE_SCHEMA_V9.tuples.sheet.fields[0],
        WIRE_SCHEMA_V9.tuples.sheet.fields[1],
        WIRE_SCHEMA_V9.tuples.sheet.fields[2],
      ],
    },
  },
} as const);

export type WireSchemaV10 = typeof WIRE_SCHEMA_V10;
