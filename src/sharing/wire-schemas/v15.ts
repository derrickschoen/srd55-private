import { WIRE_SCHEMA_V14 } from './v14';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 15 — SKILL EXPERTISE GRANT PROVENANCE.
 *
 * The appended root section carries each live expertise choice slot, including
 * an unfilled slot. Its source reference and stable logical address let import
 * fill a grant minted from the recipient's catalog without guessing.
 */
export const WIRE_SCHEMA_V15 = deepFreeze({
  version: 15,
  tuples: {
    ...WIRE_SCHEMA_V14.tuples,
    root: {
      arities: [20],
      fields: [
        ...WIRE_SCHEMA_V14.tuples.root.fields,
        {
          key: 'expertiseGrants',
          wireType: 'list',
          meaning: 'live sourced skill expertise choice slots; null when none',
        },
      ],
    },
    expertiseGrant: {
      arities: [5],
      fields: [
        {
          key: 'ref',
          wireType: 'integer',
          meaning: 'share-local granting source reference',
        },
        {
          key: 'grantKey',
          wireType: 'string',
          meaning: 'stable expertise grant key',
        },
        {
          key: 'ordinal',
          wireType: 'integer',
          meaning: 'one-based ordinal within the grant key',
        },
        {
          key: 'grantedAtClassLevel',
          wireType: 'integer',
          meaning: 'class level at which the grant was earned',
        },
        {
          key: 'skill',
          wireType: 'string',
          meaning: 'selected proficient skill, or null while unfilled',
        },
      ],
    },
  },
} as const);

export type WireSchemaV15 = typeof WIRE_SCHEMA_V15;
