import { WIRE_SCHEMA_V8 } from './v8';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 9 — EFFECT EQUIPMENT OWNERSHIP AND GENERATED SPECIES SOURCES
 * (AC-2b, D72).
 *
 * The EFFECT tuple appends three fields. `itemRef` and `weaponRef` are
 * ZERO-BASED ARRAY INDEXES into this document's own `items` and `weapons`
 * arrays. They are deliberately not database ids: every other character-owned
 * tuple omits ids, and an array index is local to the document and therefore
 * stable under import remapping. `template_ref` preserves AC-2a's generated-row
 * identity so a later command-side re-sync replaces rather than duplicates it.
 *
 * The SOURCE tuple appends `generated`. A guided species apply always creates
 * a real source instance so its generated effects have a structural species
 * owner, but that source can have `source_definition_id = NULL` when no
 * `species_definitions` row exists. V8 could only encode catalog-backed
 * sources: exporting the generated-only row tried to translate NULL through a
 * catalog key. In v9 the exact generated-only shape is
 * `type = species`, `key = null`, `generated = true`; import recreates the
 * nullable-definition source and carries its effects verbatim. No database
 * schema extension is needed, and no catalog identity is invented.
 */
export const WIRE_SCHEMA_V9 = deepFreeze({
  version: 9,
  tuples: {
    ...WIRE_SCHEMA_V8.tuples,
    source: {
      arities: [7],
      fields: [
        ...WIRE_SCHEMA_V8.tuples.source.fields,
        {
          key: 'generated',
          wireType: 'boolean',
          meaning:
            'true only for a generated species source with no catalog key',
        },
      ],
    },
    effect: {
      arities: [20],
      fields: [
        ...WIRE_SCHEMA_V8.tuples.effect.fields,
        {
          key: 'itemRef',
          wireType: 'integer',
          meaning: 'zero-based index into this document items array',
        },
        {
          key: 'weaponRef',
          wireType: 'integer',
          meaning: 'zero-based index into this document weapons array',
        },
        {
          key: 'template_ref',
          wireType: 'string',
          meaning: 'stable generated template-row identity',
        },
      ],
    },
  },
} as const);

export type WireSchemaV9 = typeof WIRE_SCHEMA_V9;
