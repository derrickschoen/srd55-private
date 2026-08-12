import { WIRE_SCHEMA_V19 } from './v19';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value);
}

/** Version 20 — stable sender-scoped character document identity. */
export const WIRE_SCHEMA_V20 = deepFreeze({
  version: 20,
  tuples: {
    ...WIRE_SCHEMA_V19.tuples,
    root: {
      arities: [23],
      fields: [
        ...WIRE_SCHEMA_V19.tuples.root.fields,
        {
          key: 'documentIdentity',
          wireType: 'json',
          meaning: 'stable sender document id and sender character revision; null for historical shares',
        },
      ],
    },
  },
} as const);

export type WireSchemaV20 = typeof WIRE_SCHEMA_V20;
