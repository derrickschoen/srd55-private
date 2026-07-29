import { WIRE_SCHEMA_V5 } from './v5';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 6 — EQUIPMENT PROVENANCE (plan
 * `docs/design/2026-07-29-starting-equipment.md`, §2, dispatch E-A).
 *
 * The WEAPON tuple appends one element, `sourceRef` — the granting source in
 * the same `classes[].id` / `sources[].id` reference space `selections[].ref`
 * and `effects[].sourceRef` resolve through — taking its arity from 21 to 22.
 * The ARMOR tuple appends the same element, 9 to 10. Null is "a person put
 * this here", which is the wire form of the nullable
 * `source_instance_id` column: every hand-added row and every row that
 * predates the equipment step genuinely has no granting rule.
 *
 * The recorded package CHOICE travels separately and for free: it lives in the
 * granting source instance's `config`, which has been on the wire since v1
 * (`v1.ts`, the source tuple's `config` field). Only the ROW provenance needed
 * a wire change, and appending is the only legal shape — every earlier
 * position keeps its meaning.
 *
 * UNLIKE v5, THIS IS NOT A RETIREMENT. Every pre-v6 document predates minting,
 * so a null `sourceRef` on migration is the literal truth of those documents —
 * nothing but a person could have put a weapon there — and `migrateV5ToV6` in
 * `./index.ts` appends it without fabricating anything.
 *
 * Every unchanged tuple is shared with the already-frozen v5 inventory.
 */
export const WIRE_SCHEMA_V6 = deepFreeze({
  version: 6,
  tuples: {
    ...WIRE_SCHEMA_V5.tuples,
    weapon: {
      variants: [
        {
          arity: 22,
          meaning: 'v6 weapon with appended equipment-provenance source ref',
          fields: [
            ...WIRE_SCHEMA_V5.tuples.weapon.variants[0].fields,
            {
              key: 'sourceRef',
              wireType: 'integer',
              meaning:
                'granting source in the classes/sources reference space; null when a person added the weapon',
            },
          ],
        },
      ],
    },
    armor: {
      arities: [10],
      fields: [
        ...WIRE_SCHEMA_V5.tuples.armor.fields,
        {
          key: 'sourceRef',
          wireType: 'integer',
          meaning:
            'granting source in the classes/sources reference space; null when a person added the armour',
        },
      ],
    },
  },
} as const);

export type WireSchemaV6 = typeof WIRE_SCHEMA_V6;
