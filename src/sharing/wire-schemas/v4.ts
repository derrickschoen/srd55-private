import { WIRE_SCHEMA_V3 } from './v3';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 4 changes exactly one tuple: the effect APPENDS the
 * `ability_increase` payload — `ability`, `amount`, `maximum` — taking its
 * arity from 9 to 12. B2's contribution layer (D63): base is what the player
 * allocated, an increase is an additive contribution that knows its source and
 * its own cap, and all three fields must survive the wire or a round trip
 * resolves to a different number than the character it left.
 *
 * Appended, never inserted — every earlier position keeps its meaning, which
 * is what lets the v3→v4 migration be a per-effect null-pad. The two
 * provenance slots (`sourceRef`, `sourceSubclass`) therefore KEEP positions 7
 * and 8 rather than staying last: "last" was a v1 layout fact, not a contract,
 * and moving them would silently reinterpret every link in the wild.
 *
 * PROVENANCE IS REQUIRED ON THE WIRE FOR `ability_increase`. The format's
 * documented allowance — an effect whose owner is unreachable still travels,
 * merely without its provenance — does NOT extend to this kind: the schema's
 * `character_effects_ability_increase_source_check` makes a sourceless
 * contribution unrepresentable, so a document carrying one would be an export
 * its own importer refuses, which is the precise defect D60 warns survives its
 * own narrowing. `shareEffect` in `../schema.ts` enforces it in both
 * directions — export refuses to build the document, import refuses to accept
 * it.
 *
 * Every unchanged tuple is shared with the already-frozen v3 inventory.
 */
export const WIRE_SCHEMA_V4 = deepFreeze({
  version: 4,
  tuples: {
    ...WIRE_SCHEMA_V3.tuples,
    effect: {
      arities: [12],
      fields: [
        ...WIRE_SCHEMA_V3.tuples.effect.fields,
        {
          key: 'ability',
          wireType: 'string',
          meaning: 'increased ability, for ability_increase',
        },
        {
          key: 'amount',
          wireType: 'integer',
          meaning: 'signed non-zero increase amount',
        },
        {
          key: 'maximum',
          wireType: 'integer',
          meaning: 'the increase’s own score cap, 1–30',
        },
      ],
    },
  },
} as const);

export type WireSchemaV4 = typeof WIRE_SCHEMA_V4;
