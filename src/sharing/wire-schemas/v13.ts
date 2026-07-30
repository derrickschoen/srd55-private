import { WIRE_SCHEMA_V12 } from './v12';

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

/**
 * Version 13 — D83 ABILITY SCORE OVERRIDES.
 *
 * No tuple gains a field: `ability_override` reuses the effect tuple's
 * `ability` and `maximum` positions. The mint records an accepted-value change
 * in `effect.kind`; a v12 document cannot claim the new value merely because
 * its tuple happens to have the same arity.
 */
export const WIRE_SCHEMA_V13 = deepFreeze({
  version: 13,
  tuples: WIRE_SCHEMA_V12.tuples,
} as const);

export type WireSchemaV13 = typeof WIRE_SCHEMA_V13;
