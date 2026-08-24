import { WIRE_SCHEMA_V20 } from './v20';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value);
}

/** Version 21 — explicit optional-class-feature selections on the character. */
export const WIRE_SCHEMA_V21 = deepFreeze({
  version: 21,
  tuples: {
    ...WIRE_SCHEMA_V20.tuples,
    character: {
      arities: [16],
      fields: [
        ...WIRE_SCHEMA_V20.tuples.character.fields,
        {
          key: 'optional_feature_selections',
          wireType: 'list',
          meaning: 'stable content keys of optional class features selected by the character; empty means none selected',
        },
      ],
    },
  },
} as const);

export type WireSchemaV21 = typeof WIRE_SCHEMA_V21;
