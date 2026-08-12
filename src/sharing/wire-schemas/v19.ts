import { WIRE_SCHEMA_V18 } from './v18';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value);
}

/** Version 19 — stable sender-scoped character document identity. */
export const WIRE_SCHEMA_V19 = deepFreeze({
  version: 19,
  tuples: {
    ...WIRE_SCHEMA_V18.tuples,
    root: {
      arities: [23],
      fields: [
        ...WIRE_SCHEMA_V18.tuples.root.fields,
        {
          key: 'documentIdentity',
          wireType: 'json',
          meaning: 'stable sender document id and sender character revision; null for historical shares',
        },
      ],
    },
  },
} as const);

export type WireSchemaV19 = typeof WIRE_SCHEMA_V19;
