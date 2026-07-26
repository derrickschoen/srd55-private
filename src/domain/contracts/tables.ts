import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type * as schema from '../../../db/schema/index';
import type {
  DomainSourceType,
  StandaloneSourceType,
} from '../enums';

/**
 * THE TABLE INVENTORY, DERIVED FROM THE SCHEMA.
 *
 * Every import in this module is `import type`. Drizzle is a build-time
 * dependency and `verbatimModuleSyntax` erases these entirely — the emitted
 * JavaScript imports nothing from `db/schema`. The rollup guard in
 * vite.config.ts enforces that for both entry graphs.
 *
 * WHY THIS EXISTS. Before it, the table lists were hand-maintained in at least
 * four places that did not know about each other:
 *
 *   - `applicationTables` (38 names) in `src/db/database-lifecycle.ts` — the
 *     file that VALIDATES database images;
 *   - `CHARACTER_STATE_TABLES` (5 names) in `src/character/character-state.ts`;
 *   - `directCharacterTables` / `backupTableNames` / `referenceKinds` in
 *     `src/backup/character-backup.ts`;
 *   - the share export/import table set in `src/sharing/character-share.ts`.
 *
 * Adding a table told you nothing about whether it belonged in snapshots,
 * backups, shares, both or neither, and no test would have caught the
 * omission. Now a new table is a COMPILE ERROR until it is classified.
 */

type SchemaModule = typeof schema;

/**
 * The name of every table declared anywhere under `db/schema/`.
 *
 * Derived from the module namespace, so declaring a table is the only thing
 * needed to make it appear here — and `tests/unit/schema-modules.test.ts`
 * guarantees no module escapes the namespace.
 */
export type AnyTableName = {
  [K in keyof SchemaModule]: SchemaModule[K] extends SQLiteTable<infer Config>
    ? Config['name']
    : never;
}[keyof SchemaModule];

/**
 * The Drizzle table declaration for a given table name.
 *
 * Written as a mapped filter over the namespace rather than as
 * `Extract<…, SQLiteTable<{ name: N; … }>>`. The `Extract` form looks right and
 * is silently `never` for EVERY table: `SQLiteTable`'s config carries a
 * `columns` record, and no real declaration is assignable to a literal
 * `columns: never`. A `never` satisfies every `extends` check vacuously, so a
 * binding built on it would typecheck while asserting nothing —
 * `_TableForResolves` below is what keeps that from happening again.
 */
export type TableFor<N extends AnyTableName> = {
  [K in keyof SchemaModule]: SchemaModule[K] extends SQLiteTable<infer Config>
    ? Config['name'] extends N
      ? SchemaModule[K]
      : never
    : never;
}[keyof SchemaModule];

/** The column names of a given table, as a union of string literals. */
export type ColumnNamesOf<N extends AnyTableName> = {
  [K in keyof SchemaModule]: SchemaModule[K] extends SQLiteTable<infer Config>
    ? Config['name'] extends N
      ? Extract<keyof Config['columns'], string>
      : never
    : never;
}[keyof SchemaModule];

/** True when the table has a `character_id` column. */
export type HasCharacterId<N extends AnyTableName> =
  'character_id' extends ColumnNamesOf<N> ? true : false;

export type TableRole =
  /** `characters` — the aggregate root, serialized via its own path. */
  | 'character_root'
  /** Cascades from a character, directly or through another owned table. */
  | 'character_owned'
  /** The spell catalog. */
  | 'catalog_spell'
  /** Classes, subclasses and their progressions. */
  | 'catalog_class'
  /** Feats, species, backgrounds. */
  | 'catalog_source';

/**
 * The scopes a table can participate in.
 *
 * These are FIVE INDEPENDENT BOOLEANS, not a single role, because the verified
 * membership matrix has five distinct patterns and a flat role cannot express
 * them. In particular `character_save_points` is backed up but never shared,
 * and `spell_loadout_entries` is backed up and shared but cannot be backed up
 * DIRECTLY. Collapsing these would silently change what a backup or a share
 * contains.
 */
export interface TableScopes {
  readonly role: TableRole;
  /** Appears in `CHARACTER_STATE_TABLES` (undo/redo snapshots). */
  readonly snapshot: boolean;
  /** Appears in `directCharacterTables` — the `character_id`-keyed pass. */
  readonly backupDirect: boolean;
  /** Appears in `backupTableNames` (the portable-character document). */
  readonly backup: boolean;
  /** Appears in the share export/import payload. */
  readonly share: boolean;
  /** Appears in `ReferenceKind` — a catalog table backups resolve against. */
  readonly backupReference: boolean;
}

/**
 * `backupDirect` is COMPILE-GATED on the presence of a `character_id` column.
 *
 * The direct-backup pass selects `WHERE character_id = ?`, so a table without
 * that column cannot participate — which is the real reason
 * `spell_loadout_entries` is excluded, a fact that previously lived only in a
 * reviewer's head. Setting `backupDirect: true` on such a table is now
 * `Type 'true' is not assignable to type 'false'`.
 */
type ScopesFor<N extends AnyTableName> = Omit<TableScopes, 'backupDirect'> & {
  readonly backupDirect: HasCharacterId<N> extends true ? boolean : false;
};

/**
 * THE EXHAUSTIVE CLASSIFICATION.
 *
 * `satisfies { [N in AnyTableName]: ScopesFor<N> }` is what makes adding a
 * table to `db/schema/` a compile error (TS1360, "property is missing") until
 * it is classified here. `as const` preserves the literal booleans so the
 * derived unions below stay narrow.
 */
export const TABLE_SCOPES = {
  // --- the character aggregate ------------------------------------------
  // `characters` is all-false: the root is serialized through its own path
  // (CHARACTER_STATE_COLUMNS / document.character), never through a table loop.
  characters: {
    role: 'character_root',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  character_class_levels: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  character_source_instances: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  spell_selection_slots: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  wizard_spellbook_entries: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  warning_acknowledgements: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  character_spell_preferences: {
    role: 'character_owned',
    snapshot: false,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  character_rule_overrides: {
    role: 'character_owned',
    snapshot: false,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  spell_loadouts: {
    role: 'character_owned',
    snapshot: false,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  // Backed up, but NOT shared: a save point is private undo history, not part
  // of the build another person receives.
  character_save_points: {
    role: 'character_owned',
    snapshot: false,
    backupDirect: true,
    backup: true,
    share: false,
    backupReference: false,
  },
  // No `character_id` column — it reaches the character only through
  // `spell_loadouts`. `backupDirect` is therefore not merely false, it is
  // UNTYPEABLE as true.
  spell_loadout_entries: {
    role: 'character_owned',
    snapshot: false,
    backupDirect: false,
    backup: true,
    share: true,
    backupReference: false,
  },
  // Journals. Neither travels with a character: the audit log is append-only
  // local history and the operation log is optimistic-concurrency state.
  change_log: {
    role: 'character_owned',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  character_operations: {
    role: 'character_owned',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },

  // --- the spell catalog -------------------------------------------------
  spell_identities: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  spell_identity_aliases: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  // The one catalog table a backup resolves character rows against by id.
  spell_versions: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: true,
  },
  spell_version_publications: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  spell_list_memberships: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  spell_version_tags: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  spell_version_damage_types: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  spell_version_conditions: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  spell_version_attack_modes: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  spell_version_save_abilities: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },

  // --- classes -----------------------------------------------------------
  class_definitions: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: true,
  },
  subclass_definitions: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: true,
  },
  // The progression tables are catalog_class but are NOT reference kinds — a
  // backup never resolves a row against them. Deriving ReferenceKind from the
  // role would have silently added them and invalidated every existing backup
  // document, since CharacterBackupReferences is keyed by ReferenceKind.
  class_progressions: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  subclass_progressions: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },

  // --- standalone sources -------------------------------------------------
  feat_definitions: {
    role: 'catalog_source',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: true,
  },
  species_definitions: {
    role: 'catalog_source',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: true,
  },
  background_definitions: {
    role: 'catalog_source',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: true,
  },
} as const satisfies { [N in AnyTableName]: ScopesFor<N> };

type Scopes = typeof TABLE_SCOPES;

/** Every table whose given boolean scope is `true`. */
export type TablesWith<S extends keyof TableScopes> = {
  [N in keyof Scopes]: Scopes[N][S & keyof Scopes[N]] extends true ? N : never;
}[keyof Scopes];

/** Every table with the given role. */
export type TablesWithRole<R extends TableRole> = {
  [N in keyof Scopes]: Scopes[N]['role'] extends R ? N : never;
}[keyof Scopes];

export type SnapshotTable = TablesWith<'snapshot'>;
export type BackupDirectTable = TablesWith<'backupDirect'>;
export type BackupTable = TablesWith<'backup'>;
export type ShareTable = TablesWith<'share'>;
export type ReferenceKind = TablesWith<'backupReference'>;

// --- compile-checked invariants ------------------------------------------
// These are `never`-assertions, not tests: they fail `tsc -b`, which fails
// `npm run build`.

type Expect<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Exactly one aggregate root, and it is `characters`.
 *
 * BOTH halves are needed. `TablesWithRole<'character_root'> extends 'characters'`
 * alone is satisfied by ZERO roots as well as by one, because the union is then
 * `never` and `never extends 'characters'` is true. The second clause rules
 * that out; the first still rules out a second or different root.
 */
export type _OneRoot = Expect<
  TablesWithRole<'character_root'> extends 'characters'
    ? 'characters' extends TablesWithRole<'character_root'>
      ? true
      : false
    : false
>;

/**
 * `TableFor` resolves to a real declaration, not `never`.
 *
 * This is the assertion the `Extract`-based first draft would have failed. It
 * is not decoration: every planned column-level binding narrows through
 * `TableFor`, and a `never` there makes all of them vacuous.
 */
export type _TableForResolves = Expect<
  TableFor<'characters'> extends SQLiteTable
    ? IsNever<TableFor<'characters'>> extends true
      ? false
      : true
    : false
>;

/** ...and it resolves to a DIFFERENT declaration per name. */
export type _TableForDiscriminates = Expect<
  TableFor<'characters'> extends TableFor<'spell_versions'> ? false : true
>;
/** Everything snapshotted is also backed up. */
export type _SnapshotSubsetOfBackup = Expect<
  IsNever<Exclude<SnapshotTable, BackupTable>>
>;
/** Everything backed up directly is also backed up. */
export type _DirectSubsetOfBackup = Expect<
  IsNever<Exclude<BackupDirectTable, BackupTable>>
>;
/** Only character-owned tables can be backed up directly. */
export type _DirectIsCharacterOwned = Expect<
  IsNever<Exclude<BackupDirectTable, TablesWithRole<'character_owned'>>>
>;
/** Every directly-backed-up table really does have a character_id column. */
export type _DirectHasCharacterId = Expect<
  IsNever<
    {
      [N in BackupDirectTable]: HasCharacterId<N> extends true ? never : N;
    }[BackupDirectTable]
  >
>;
/** Everything shared is character-scoped. */
export type _ShareIsCharacterScoped = Expect<
  IsNever<Exclude<ShareTable, TablesWithRole<'character_owned'>>>
>;

/**
 * A helper that builds a runtime tuple whose MEMBERSHIP is exhaustive over a
 * derived union and whose ORDER is chosen by hand.
 *
 * Ordering matters for deletion (foreign keys) and cannot be derived from a
 * boolean flag; membership can and must be. Omitting a member is a compile
 * error; naming a non-member is a compile error; naming a member twice is not
 * caught here and is caught by the runtime tests instead.
 */
export function order<Member extends string>() {
  return <const T extends readonly Member[]>(
    members: T & ([Member] extends [T[number]] ? unknown : never),
  ): T => members;
}

/**
 * Every table in the database, in the order `PRAGMA`-level validation reports
 * them. Replaces the hand-typed transcription that lived in
 * `database-lifecycle.ts` — the file that validates database images, which is
 * the worst possible place for a list to silently fall behind the schema.
 *
 * Thirty tables since the eight Laravel-only ones were dropped;
 * `tests/unit/contracts/table-scopes.test.ts` transcribes the intended list
 * independently rather than reading it from here.
 */
export const APPLICATION_TABLES = order<AnyTableName>()([
  'background_definitions',
  'change_log',
  'character_class_levels',
  'character_operations',
  'character_rule_overrides',
  'character_save_points',
  'character_source_instances',
  'character_spell_preferences',
  'characters',
  'class_definitions',
  'class_progressions',
  'feat_definitions',
  'species_definitions',
  'spell_identities',
  'spell_identity_aliases',
  'spell_list_memberships',
  'spell_loadout_entries',
  'spell_loadouts',
  'spell_selection_slots',
  'spell_version_attack_modes',
  'spell_version_conditions',
  'spell_version_damage_types',
  'spell_version_publications',
  'spell_version_save_abilities',
  'spell_version_tags',
  'spell_versions',
  'subclass_definitions',
  'subclass_progressions',
  'warning_acknowledgements',
  'wizard_spellbook_entries',
]);

/** The tables captured in an undo/redo snapshot, in capture order. */
export const CHARACTER_STATE_TABLES = order<SnapshotTable>()([
  'character_class_levels',
  'character_source_instances',
  'spell_selection_slots',
  'wizard_spellbook_entries',
  'warning_acknowledgements',
]);

/**
 * Snapshot tables in an order safe to DELETE under
 * `PRAGMA foreign_keys = ON`: children before parents.
 *
 * This is topological, not derivable from a flag, so the ORDER stays hand-
 * chosen while MEMBERSHIP is compile-checked. The order itself is exercised by
 * an integration test that deletes a fully-populated character.
 */
export const DELETE_ORDER = order<SnapshotTable>()([
  'warning_acknowledgements',
  'wizard_spellbook_entries',
  'spell_selection_slots',
  'character_source_instances',
  'character_class_levels',
]);

/** Tables the portable-character backup writes with a `character_id` filter. */
export const BACKUP_DIRECT_TABLES = order<BackupDirectTable>()([
  'character_class_levels',
  'character_source_instances',
  'spell_selection_slots',
  'wizard_spellbook_entries',
  'character_spell_preferences',
  'character_rule_overrides',
  'warning_acknowledgements',
  'character_save_points',
  'spell_loadouts',
]);

/** Every table in the portable-character backup document. */
export const BACKUP_TABLES = order<BackupTable>()([
  ...BACKUP_DIRECT_TABLES,
  'spell_loadout_entries',
]);

/** The catalog tables a backup document resolves references against. */
export const REFERENCE_KINDS = order<ReferenceKind>()([
  'class_definitions',
  'subclass_definitions',
  'feat_definitions',
  'species_definitions',
  'background_definitions',
  'spell_versions',
]);

/**
 * The tables that carry a shared character, as a NAME MAP.
 *
 * A map rather than an ordered tuple because `character-share.ts` has no loop
 * over tables: export and import are hand-written statements whose order comes
 * from the document's own structure, and there is no bulk-delete pass, so there
 * is nothing for an order to encode. What the sharing module needs is
 * by-name access — and that is exactly what makes the classification
 * load-bearing there.
 *
 * The type is `{ readonly [N in ShareTable]: N }`, so:
 *
 *  - marking a table `share: true` without teaching `character-share.ts` about
 *    it fails to compile here (TS2739, "missing the following properties");
 *  - naming a table that is NOT share-scoped fails to compile (TS2322);
 *  - `tests/unit/contracts/share-tables.test.ts` closes the third direction by
 *    reading the sharing module's source and asserting that every share table
 *    is reached through this map and that no unshared character table appears
 *    in its SQL at all.
 *
 * Before this the `share` flag was pure documentation: `ShareTable` was
 * referenced only by a compile assertion, and the ~12 table names in
 * `character-share.ts` were written out as bare string literals with no link
 * to the classification in either direction.
 */
export const SHARE_TABLES: { readonly [N in ShareTable]: N } = {
  character_class_levels: 'character_class_levels',
  character_source_instances: 'character_source_instances',
  spell_selection_slots: 'spell_selection_slots',
  wizard_spellbook_entries: 'wizard_spellbook_entries',
  warning_acknowledgements: 'warning_acknowledgements',
  character_spell_preferences: 'character_spell_preferences',
  character_rule_overrides: 'character_rule_overrides',
  spell_loadouts: 'spell_loadouts',
  spell_loadout_entries: 'spell_loadout_entries',
};

/**
 * The polymorphic source maps stay MAPS, constrained on both axes.
 *
 * A role-filtered union cannot answer "which table does `'species'` mean" —
 * that is a lookup, not a filter. What the derivation adds is that the map
 * must be exhaustive over the source-type union AND may only name a table the
 * schema actually declares with the right scope. Both were untyped
 * `Record<string, …>` before.
 */
export const SOURCE_DEFINITION_TABLE = {
  feat: 'feat_definitions',
  species: 'species_definitions',
  background: 'background_definitions',
} as const satisfies Record<StandaloneSourceType, TablesWithRole<'catalog_source'>>;

export const SOURCE_REFERENCE_KIND = {
  class: 'class_definitions',
  subclass: 'subclass_definitions',
  feat: 'feat_definitions',
  species: 'species_definitions',
  background: 'background_definitions',
} as const satisfies Record<DomainSourceType, ReferenceKind>;

/**
 * The vocabulary the audit log's WRITE side may use.
 *
 * Deliberately an INDEPENDENT tuple rather than `'character' | SnapshotTable`.
 * Tying it to the snapshot scope would mean that reclassifying a table for
 * backup reasons silently changed what the audit log accepts — a coupling
 * between two unrelated concerns. `satisfies` still forces every entry to name
 * a table that exists.
 *
 * The READ side stays `string`: `change_log` is append-only and historical
 * rows written under an older vocabulary must remain parseable forever.
 */
export const AUDIT_ENTITY_TYPES = [
  'character',
  'character_class_levels',
  'character_source_instances',
  'spell_selection_slots',
  'wizard_spellbook_entries',
  'warning_acknowledgements',
] as const satisfies readonly ('character' | AnyTableName)[];

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
