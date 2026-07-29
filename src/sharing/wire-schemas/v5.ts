import { WIRE_SCHEMA_V4 } from './v4';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 5 — SKILLS WITH PROVENANCE (plan
 * `docs/design/2026-07-29-skills-with-provenance.md`, §3.2/§3.6, S-A).
 *
 * The root APPENDS one element, `skillGrants`, taking its arity from 16 to 17.
 * Each entry is a new four-element `skillGrant` tuple: the source reference
 * (the same `classes[].id` / `sources[].id` space `selections[].ref` resolves
 * through), the grant key, the ordinal, and the NULLABLE selection — null is
 * "granted but unfilled", and it must survive the wire or a round-tripped
 * character loses the record of what it still owes.
 *
 * The sheet tuple's `skillProficiencies` slot KEEPS its position and meaning:
 * it now carries the derived projection, which is the same distinct-skill list
 * it always carried. Appended, never inserted — every earlier position keeps
 * its meaning.
 *
 * V5 IS ALSO WHERE PRE-V5 DOCUMENTS ARE RETIRED (D60). A bare skill string
 * list carries no source, grant key or ordinal, and inventing attribution
 * would be fabricating user data — so the v4→v5 migration in `./index.ts`
 * deliberately throws `ShareWireRetirementError` rather than guessing. The
 * frozen v1–v4 schemas and their fragment fixtures stay untouched: the
 * refusal lives in the migration, not in the registry's history.
 *
 * Every unchanged tuple is shared with the already-frozen v4 inventory.
 */
export const WIRE_SCHEMA_V5 = deepFreeze({
  version: 5,
  tuples: {
    ...WIRE_SCHEMA_V4.tuples,
    root: {
      arities: [17],
      fields: [
        ...WIRE_SCHEMA_V4.tuples.root.fields,
        {
          key: 'skillGrants',
          wireType: 'list',
          meaning: 'skill choice slots with provenance; null when none',
        },
      ],
    },
    skillGrant: {
      arities: [4],
      fields: [
        {
          key: 'ref',
          wireType: 'integer',
          meaning: 'granting source, in the classes/sources reference space',
        },
        {
          key: 'grantKey',
          wireType: 'string',
          meaning: 'stable grant identity within its source',
        },
        {
          key: 'ordinal',
          wireType: 'integer',
          meaning: 'which of the grant’s slots this is, 1-based',
        },
        {
          key: 'skill',
          wireType: 'string',
          meaning: 'the chosen skill; null when granted but unfilled',
        },
      ],
    },
  },
} as const);

export type WireSchemaV5 = typeof WIRE_SCHEMA_V5;
