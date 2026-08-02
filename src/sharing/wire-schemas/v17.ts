import { WIRE_SCHEMA_V16 } from './v16';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/** Version 17 — optional character flavor text, appended after notes. */
export const WIRE_SCHEMA_V17 = deepFreeze({
  version: 17,
  tuples: {
    ...WIRE_SCHEMA_V16.tuples,
    character: {
      arities: [15],
      fields: [
        ...WIRE_SCHEMA_V16.tuples.character.fields,
        {
          key: 'alignment',
          wireType: 'string',
          meaning: 'opt-in open-text alignment; null when absent',
        },
        {
          key: 'appearance',
          wireType: 'string',
          meaning: 'opt-in appearance prose; null when absent',
        },
        {
          key: 'backstory',
          wireType: 'string',
          meaning: 'opt-in backstory prose; null when absent',
        },
      ],
    },
  },
} as const);

export type WireSchemaV17 = typeof WIRE_SCHEMA_V17;
