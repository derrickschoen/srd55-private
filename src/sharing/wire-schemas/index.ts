import { WIRE_SCHEMA_V1 } from './v1';

/**
 * Any change to tuple field order, meaning, membership, or accepted value
 * domain requires a new schema version, an adjacent migration, and a
 * hand-frozen fragment fixture. Never edit an existing version.
 */
export const CURRENT_CHARACTER_SHARE_VERSION = 1 as const;

/**
 * Any change to tuple field order, meaning, membership, or accepted value
 * domain requires a new schema version, an adjacent migration, and a
 * hand-frozen fragment fixture. Never edit an existing version.
 */
export const SHARE_SCHEMAS = Object.freeze({
  1: WIRE_SCHEMA_V1,
} as const);

export type SupportedShareVersion = keyof typeof SHARE_SCHEMAS;

type HistoricalVersion =
  Exclude<SupportedShareVersion, typeof CURRENT_CHARACTER_SHARE_VERSION>;

export type AdjacentMigrations = Readonly<{
  [Version in HistoricalVersion]: (
    document: unknown,
  ) => unknown;
}>;

export const MIGRATIONS = Object.freeze({}) satisfies AdjacentMigrations;

export { WIRE_SCHEMA_V1 } from './v1';
export type { WireField, WireSchemaV1 } from './v1';
