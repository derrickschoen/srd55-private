import { WIRE_SCHEMA_V13 } from './v13';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 14 — GF-1 SPELL ACQUISITION PROVENANCE.
 *
 * A selection appends the class level at which its mutable choice was made.
 * Spellbook strings become acquisition tuples so an unfilled Wizard grant and
 * its logical source/rule/ordinal address survive a share independently of a
 * selected spell.
 */
export const WIRE_SCHEMA_V14 = deepFreeze({
  version: 14,
  tuples: {
    ...WIRE_SCHEMA_V13.tuples,
    selection: {
      arities: [7],
      fields: [
        ...WIRE_SCHEMA_V13.tuples.selection.fields,
        {
          key: 'acquiredAtClassLevel',
          wireType: 'integer',
          meaning: 'class level at which this selection was acquired',
        },
      ],
    },
    spellbookAcquisition: {
      arities: [6],
      fields: [
        {
          key: 'ref',
          wireType: 'integer',
          meaning: 'share-local granting source reference',
        },
        {
          key: 'ruleKey',
          wireType: 'string',
          meaning: 'grant rule key',
        },
        {
          key: 'ordinal',
          wireType: 'integer',
          meaning: 'acquisition ordinal',
        },
        {
          key: 'acquiredAtClassLevel',
          wireType: 'integer',
          meaning: 'Wizard class level at acquisition',
        },
        {
          key: 'spellKey',
          wireType: 'string',
          meaning: 'selected spell key when filled',
        },
        {
          key: 'spellName',
          wireType: 'string',
          meaning: 'selected placeholder fallback name',
        },
      ],
    },
  },
} as const);

export type WireSchemaV14 = typeof WIRE_SCHEMA_V14;
