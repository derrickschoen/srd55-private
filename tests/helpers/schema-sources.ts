import schema from '../../src/db/schema.sql?raw';

/**
 * The schema artifacts the structural suites run against.
 *
 * These suites are parameterised over a source because, before the cutover, the
 * Drizzle-generated artifact existed as a SHADOW alongside the hand-written one
 * and BOTH were run through the same expectations — `tests/unit/schema.test.ts`
 * (columns, nullability, indexes, defaults, foreign keys and their actions),
 * `tests/unit/invariants.test.ts` (triggers, named CHECK, composite foreign
 * keys, PRAGMA state) and `tests/unit/schema-autoincrement.test.ts`.
 *
 * The parameterisation is deliberately NOT "compare the generated schema to
 * schema.sql": that comparison is self-referential and would only prove the two
 * agree with each other. The expectations in those suites are hand-written and
 * must stay that way — an expectation regenerated from `PRAGMA table_info`
 * reprints the artifact under test and cannot fail.
 *
 * Post-cutover the generated artifact IS `schema.sql`, so the list is one
 * entry. The shape is retained so a future candidate artifact can be run
 * through the same independent expectations the same way.
 */
export const schemaSources: ReadonlyArray<readonly [string, string]> = [
  ['schema.sql', schema],
];
