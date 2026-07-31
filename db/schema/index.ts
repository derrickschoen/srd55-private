/**
 * The complete Drizzle schema.
 *
 * Every module under `db/schema/` MUST be re-exported here. Two things depend
 * on it:
 *
 *  - `scripts/compose-schema.ts` passes this namespace to drizzle-kit, so a
 *    table declared in an unreferenced module would silently never be emitted;
 *  - `src/domain/contracts/tables.ts` derives `AnyTableName` from it, so an
 *    unreferenced module would also escape scope classification.
 *
 * `tests/unit/schema-modules.test.ts` asserts that the set of `*.ts` files in
 * this directory equals the set re-exported here, so a new file that nothing
 * imports is a failing test rather than silence.
 */
export * from './catalog-classes';
export * from './catalog-content';
export * from './catalog-sources';
export * from './catalog-spells';
export * from './character';
export * from './origins';
export * from './relations';
export * from './columns';
export * from './equipment';
export * from './items';
export * from './sheet';
export * from './sheet-inputs';
export * from './weapons';
