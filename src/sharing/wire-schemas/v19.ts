import { WIRE_SCHEMA_V18 } from './v18';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value);
}

/** Version 19 — every carried aggregate discloses transfer provenance. */
export const WIRE_SCHEMA_V19 = deepFreeze({
  version: 19,
  tuples: {
    ...WIRE_SCHEMA_V18.tuples,
    root: {
      ...WIRE_SCHEMA_V18.tuples.root,
      fields: WIRE_SCHEMA_V18.tuples.root.fields.map((field) =>
        field.key === 'portableContent'
          ? {
              ...field,
              meaning: 'portable external-content aggregates, lineage, and provenance; null when absent',
            }
          : field
      ),
    },
  },
} as const);

export type WireSchemaV19 = typeof WIRE_SCHEMA_V19;
