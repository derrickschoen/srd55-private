import { WIRE_SCHEMA_V17 } from './v17';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/** Version 18 — optional portable authored-content closure and lineage. */
export const WIRE_SCHEMA_V18 = deepFreeze({
  version: 18,
  tuples: {
    ...WIRE_SCHEMA_V17.tuples,
    root: {
      arities: [22],
      fields: [
        ...WIRE_SCHEMA_V17.tuples.root.fields,
        {
          key: 'portableContent',
          wireType: 'json',
          meaning: 'portable external-content aggregates and lineage; null when absent',
        },
      ],
    },
  },
} as const);

export type WireSchemaV18 = typeof WIRE_SCHEMA_V18;
