import { WIRE_SCHEMA_V1 } from './v1';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 2 changes exactly two positions from v1:
 *
 * - a weapon's two nullable range integers become one tagged range tuple;
 * - placeholders leave the character tuple and are appended to the root.
 *
 * Every unchanged tuple is shared with the already-frozen v1 inventory. The
 * changed tuples are new literals so their order remains independently visible.
 */
export const WIRE_SCHEMA_V2 = deepFreeze({
  version: 2,
  tuples: {
    ...WIRE_SCHEMA_V1.tuples,
    root: {
      arities: [16],
      fields: [
        ...WIRE_SCHEMA_V1.tuples.root.fields,
        {
          key: 'placeholders',
          wireType: 'list',
          meaning: 'unknown spell metadata',
        },
      ],
    },
    character: {
      arities: [11],
      fields: [
        WIRE_SCHEMA_V1.tuples.character.fields[0],
        WIRE_SCHEMA_V1.tuples.character.fields[1],
        WIRE_SCHEMA_V1.tuples.character.fields[2],
        WIRE_SCHEMA_V1.tuples.character.fields[3],
        WIRE_SCHEMA_V1.tuples.character.fields[4],
        WIRE_SCHEMA_V1.tuples.character.fields[5],
        WIRE_SCHEMA_V1.tuples.character.fields[6],
        WIRE_SCHEMA_V1.tuples.character.fields[7],
        WIRE_SCHEMA_V1.tuples.character.fields[8],
        WIRE_SCHEMA_V1.tuples.character.fields[9],
        WIRE_SCHEMA_V1.tuples.character.fields[11],
      ],
    },
    weapon: {
      variants: [
        {
          arity: 21,
          meaning: 'v2 weapon with one tagged range value',
          fields: [
            ...WIRE_SCHEMA_V1.tuples.weapon.variants[2].fields.slice(0, 5),
            {
              key: 'range',
              wireType: 'tuple',
              meaning: 'tagged weapon range',
            },
            ...WIRE_SCHEMA_V1.tuples.weapon.variants[2].fields.slice(7),
          ],
        },
      ],
    },
    weaponRange: {
      variants: [
        {
          arity: 1,
          meaning: 'melee weapon with no range',
          fields: [
            {
              key: 'kind',
              wireType: 'literal',
              meaning: 'none discriminator',
            },
          ],
        },
        {
          arity: 3,
          meaning: 'ranged weapon with required near and nullable far distance',
          fields: [
            {
              key: 'kind',
              wireType: 'literal',
              meaning: 'ranged discriminator',
            },
            {
              key: 'near',
              wireType: 'integer',
              meaning: 'near range in feet',
            },
            {
              key: 'far',
              wireType: 'integer',
              meaning: 'far range in feet',
            },
          ],
        },
        {
          arity: 3,
          meaning: 'decode-only preservation of an unrepresentable v1 pair',
          fields: [
            {
              key: 'kind',
              wireType: 'literal',
              meaning: 'legacy discriminator',
            },
            {
              key: 'normal',
              wireType: 'integer',
              meaning: 'v1 normal range in feet',
            },
            {
              key: 'long',
              wireType: 'integer',
              meaning: 'v1 long range in feet',
            },
          ],
        },
      ],
    },
  },
} as const);

export type WireSchemaV2 = typeof WIRE_SCHEMA_V2;
