import { WIRE_SCHEMA_V15 } from './v15';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/** Version 16 — durable class-level feat and Epic Boon occurrences. */
export const WIRE_SCHEMA_V16 = deepFreeze({
  version: 16,
  tuples: {
    ...WIRE_SCHEMA_V15.tuples,
    root: {
      arities: [21],
      fields: [
        ...WIRE_SCHEMA_V15.tuples.root.fields,
        {
          key: 'levelFeatChoices',
          wireType: 'list',
          meaning: 'class-level feat and Epic Boon occurrences; null when none',
        },
      ],
    },
    levelFeatChoice: {
      arities: [4],
      fields: [
        {
          key: 'classRef',
          wireType: 'integer',
          meaning: 'share-local class reference',
        },
        {
          key: 'classLevel',
          wireType: 'integer',
          meaning: 'class level at which the occurrence was earned',
        },
        {
          key: 'choiceKind',
          wireType: 'string',
          meaning: 'asi_level_feat or epic_boon',
        },
        {
          key: 'featRef',
          wireType: 'integer',
          meaning: 'share-local feat source reference, or null while deferred',
        },
      ],
    },
  },
} as const);

export type WireSchemaV16 = typeof WIRE_SCHEMA_V16;
