import { WIRE_SCHEMA_V5 } from './v5';
import { WIRE_SCHEMA_V6 } from './v6';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 7 — EQUIPMENT PROVENANCE STRUCK (owner ruling D69,
 * `.claude/decisions.md`).
 *
 * v6 appended a `sourceRef` to the weapon tuple (21 → 22) and the armour
 * tuple (9 → 10) to carry which rule granted each row. Four hours after v6
 * minted, the owner rejected the premise: a weapon carries no provenance —
 * "I don't care where the greatsword came from." The database column is gone
 * (migration `0012`), so the current document model has no field for the
 * value, and a wire slot the exporter could only ever write as null would be
 * a field that reads as meaningful and is not.
 *
 * v7 therefore RESTORES the v5 weapon and armour tuples — the one time a
 * version's tuples shrink, and legal only because D41 is still honoured: v6
 * itself stays frozen and minted, and `migrateV6ToV7` in `./index.ts` DROPS
 * the appended slot rather than anything editing v6's shape. Dropping a
 * non-null `sourceRef` discards exactly the datum the owner struck; the row
 * itself survives as a plain weapon or armour row, which is D69's state for
 * every row.
 *
 * Every other tuple is shared with the already-frozen v6 inventory.
 */
export const WIRE_SCHEMA_V7 = deepFreeze({
  version: 7,
  tuples: {
    ...WIRE_SCHEMA_V6.tuples,
    weapon: WIRE_SCHEMA_V5.tuples.weapon,
    armor: WIRE_SCHEMA_V5.tuples.armor,
  },
} as const);

export type WireSchemaV7 = typeof WIRE_SCHEMA_V7;
