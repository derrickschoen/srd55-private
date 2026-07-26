import schema from '../../src/db/schema.sql?raw';

/**
 * The schema artifacts the parity and invariant suites run against.
 *
 * These suites are parameterised over a source because, before the cutover,
 * the Drizzle-generated artifact existed as a SHADOW alongside the
 * hand-written one and BOTH were run through the entire existing oracle —
 * `tests/unit/schema.test.ts` (Laravel parity), `tests/unit/invariants.test.ts`
 * (triggers, named CHECK, composite foreign keys, PRAGMA state) and
 * `tests/unit/schema-autoincrement.test.ts`. That is what proved parity
 * BEFORE anything depended on the generated file.
 *
 * The parameterisation is deliberately NOT "compare the generated schema to
 * schema.sql": that comparison is self-referential and would only prove the
 * two agree with each other, never that either agrees with Laravel. The
 * expectations in those suites are transcribed from the Laravel migrations and
 * must stay that way.
 *
 * Post-cutover the generated artifact IS `schema.sql`, so the list is one
 * entry. The shape is retained so a future candidate artifact can be run
 * through the same independent oracle the same way.
 */
export const schemaSources: ReadonlyArray<readonly [string, string]> = [
  ['schema.sql', schema],
];
