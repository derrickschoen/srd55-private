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
  | 'catalog_source'
  /**
   * The SRD weapon catalog. Its own member rather than `catalog_source`: a
   * weapon template is not a feat, species or background, and labelling it one
   * to avoid a one-line union change would make the role field lie.
   */
  | 'catalog_weapon'
  /**
   * The SRD species and background TEMPLATE catalog. Its own member for the
   * reason `catalog_weapon` is one: a species template is NOT a
   * `species_definitions` row and labelling it one would make the role lie.
   * The two live side by side and mean different things — the definition is a
   * spell-grant SOURCE a character instance points at and a backup resolves by
   * content key; the template is a bag of VALUES a character copies once and
   * then owns. Collapsing the roles would make `TablesWithRole<'catalog_source'>`
   * — the type `SOURCE_DEFINITION_TABLE` is checked against — start admitting
   * tables no `source_type` can ever name.
   */
  | 'catalog_origin';

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

  /**
   * WEAPONS TRAVEL. The gap this entry used to record is closed.
   *
   * A character's weapons are their own data, so they are in the portable
   * backup document, in a shared character link, and in the undo/redo snapshot
   * — all four of the character-owned scopes a `character_id`-keyed table can
   * hold. `backupReference` stays false for the reason `weapon_templates`
   * records below: by D1b a character's weapon holds NO template id, so a
   * document has nothing to resolve against the catalog and a reference kind
   * for it could never be populated.
   *
   * WHAT THE THREE `true`s COST, AND WHERE THE COST WAS PAID. Turning a flag on
   * here is the compile gate, not the work:
   *
   *  - `backup` added `character_weapons` to the document's table set, which
   *    `assertExactKeys` made part of the accepted shape. A file exported before
   *    this change has no such key, so `validateDocument` treats the table as
   *    OPTIONAL and defaults it to `[]` — an old backup still imports, and
   *    yields a character with no weapons, which is what that file honestly
   *    says. See `BACKUP_OPTIONAL_TABLES` below.
   *  - `share` added a `weapons` section to the share document and a twelfth
   *    element to the positional wire tuple. The decoder accepts an
   *    eleven-element tuple as "no weapons", so every link already in the wild
   *    still imports.
   *  - `snapshot` moved the snapshot schema from `a7-v1` to `a7-v2`. Both
   *    versions are still accepted: an `a7-v1` snapshot does not carry the
   *    weapons key, and restoring one deliberately LEAVES the character's
   *    weapons alone rather than deleting them, because a snapshot that never
   *    recorded weapons is not evidence that there were none.
   *
   * Undo/redo covered weapon changes before this through the explicit inverse
   * commands in `src/commands/weapons.ts`, and still does; the snapshot scope
   * adds save-point restore on top of that, not in place of it.
   */
  character_weapons: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
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

  /**
   * `backupReference: false`, and this is the classification the design flagged
   * as uncertain. Settled by reading `ReferenceKind`'s own definition: a
   * reference kind is "a catalog table backups RESOLVE CHARACTER ROWS AGAINST
   * BY ID". By D1b a character's weapon holds no template id — the picker
   * copies values and the link is severed — so there is no id for a backup to
   * resolve and nothing for the kind to do. Setting it true would add a key to
   * `CharacterBackupReferences` that no document could ever populate.
   */
  weapon_templates: {
    role: 'catalog_weapon',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  // Mastery content is class catalog: same role as the progression tables, and
  // not reference kinds for the same reason they are not.
  class_weapon_mastery_grants: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  class_weapon_mastery_counts: {
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

  // --- the origins catalog -------------------------------------------------
  /**
   * All five flags false, and `backupReference: false` is the load-bearing one.
   * It is the SAME argument `weapon_templates` records, from `ReferenceKind`'s
   * own definition: a reference kind is a catalog table backups RESOLVE
   * CHARACTER ROWS AGAINST BY ID, and by D1b a character's species holds no
   * template id — the picker copies values and the link is severed. There is
   * nothing for a document to resolve. Setting it true would add a key to
   * `CharacterBackupReferences` that no document could ever populate.
   *
   * `species_definitions` and `background_definitions` above stay
   * `backupReference: true` and that is not a contradiction: those are the
   * SPELL-GRANT sources a `character_source_instances` row genuinely points at
   * by id, and a backup genuinely re-resolves them by content key. The two
   * halves of picking a species have different portability rules because they
   * are different things.
   */
  species_templates: {
    role: 'catalog_origin',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  species_template_traits: {
    role: 'catalog_origin',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  background_templates: {
    role: 'catalog_origin',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },

  // --- the character's own origin ------------------------------------------
  /**
   * The identical five flags `character_weapons` carries, and for the identical
   * reason: a character's species is THEIR data, so it belongs in the portable
   * backup document, in a shared link, and in the undo/redo snapshot — all four
   * of the character-owned scopes a `character_id`-keyed table can hold — while
   * `backupReference` stays false because the row holds no catalog id.
   *
   * WHAT THE THREE `true`s COST, AND WHERE IT WAS PAID. Turning a flag on here
   * is the compile gate, not the work:
   *
   *  - `backup` put these tables in the document's table set, which
   *    `assertExactKeys` makes part of the accepted shape. A file exported
   *    before this change has no such key, so `validateDocument` treats them as
   *    OPTIONAL and defaults each to `[]` — an old backup still imports and
   *    yields a character with no species, which is what that file honestly
   *    says. See `BACKUP_OPTIONAL_TABLES` below.
   *  - `share` added `species`, `speciesTraits` and `background` sections to
   *    the share document and three elements to the positional wire tuple. The
   *    decoder accepts a twelve-element tuple as "no origin", so every link
   *    already in the wild still imports.
   *  - `snapshot` moved the snapshot schema from `a7-v2` to `a7-v3`. All three
   *    versions are still readable: an `a7-v2` snapshot does not carry the
   *    origin keys, and restoring one deliberately LEAVES the character's
   *    species alone rather than deleting it, because a snapshot that never
   *    recorded a species is not evidence that there was none.
   */
  character_species: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  character_species_traits: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  character_background: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
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
  'background_templates',
  'change_log',
  'character_background',
  'character_class_levels',
  'character_operations',
  'character_rule_overrides',
  'character_save_points',
  'character_source_instances',
  'character_species',
  'character_species_traits',
  'character_spell_preferences',
  'character_weapons',
  'characters',
  'class_definitions',
  'class_progressions',
  'class_weapon_mastery_counts',
  'class_weapon_mastery_grants',
  'feat_definitions',
  'species_definitions',
  'species_template_traits',
  'species_templates',
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
  'weapon_templates',
  'wizard_spellbook_entries',
]);

/** The tables captured in an undo/redo snapshot, in capture order. */
export const CHARACTER_STATE_TABLES = order<SnapshotTable>()([
  'character_class_levels',
  'character_source_instances',
  'spell_selection_slots',
  'wizard_spellbook_entries',
  'warning_acknowledgements',
  // Appended, not inserted: capture order is stable output, and an existing
  // snapshot's key order is part of what `equalValues` compares in
  // `CharacterState.diff`.
  'character_weapons',
  // Appended for the same reason, and in this order because a species and its
  // traits read as one thing: the species row first, its traits after it.
  'character_species',
  'character_species_traits',
  'character_background',
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
  // No table references `character_weapons`, so it has no children and can go
  // first alongside the other leaves.
  'character_weapons',
  // Leaves too. `character_species_traits` is keyed on `character_id` and NOT
  // on `character_species.id` — see `db/schema/origins.ts` — so there is no
  // parent-before-child edge between the two and the order between them is
  // free. They are listed together because they are deleted together.
  'character_species_traits',
  'character_species',
  'character_background',
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
  'character_weapons',
  'character_species',
  'character_species_traits',
  'character_background',
]);

/** Every table in the portable-character backup document. */
export const BACKUP_TABLES = order<BackupTable>()([
  ...BACKUP_DIRECT_TABLES,
  'spell_loadout_entries',
]);

/**
 * The backup tables a document exported by an OLDER BUILD cannot contain.
 *
 * `assertExactKeys` makes the table set part of the accepted document shape, so
 * every table added after `CHARACTER_BACKUP_VERSION` 1 shipped would otherwise
 * make every file a user already holds unreadable. Naming them here lets
 * `validateDocument` require the rest and default these to `[]`.
 *
 * This is NOT a licence to treat the table as optional data. An export written
 * by THIS build always contains the key; the default only ever applies to a
 * file written before the table existed, where `[]` is the honest reading —
 * that document carries no weapons, so the character it restores has none.
 *
 * The list is hand-maintained and append-only by nature: which tables predate a
 * given format version is a historical fact, and nothing in the schema records
 * it. `satisfies` at least keeps a renamed or unbacked-up table from lingering.
 */
export const BACKUP_OPTIONAL_TABLES = [
  'character_weapons',
  'character_species',
  'character_species_traits',
  'character_background',
] as const satisfies readonly BackupTable[];

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
  character_weapons: 'character_weapons',
  character_species: 'character_species',
  character_species_traits: 'character_species_traits',
  character_background: 'character_background',
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
  // Added because `CharacterState.diff` now emits a change per weapon row, and
  // an entity type the diff can produce that the log will not accept is a write
  // that fails at runtime. The tuple stays INDEPENDENT of `SnapshotTable` — this
  // is a decision about the log's vocabulary that happens to follow the same
  // change, not a derivation.
  'character_weapons',
  // Added for the same reason and on the same terms: `CharacterState.diff`
  // now emits a change per origin row, and an entity type the diff can produce
  // that the log will not accept is a write that fails at runtime.
  'character_species',
  'character_species_traits',
  'character_background',
] as const satisfies readonly ('character' | AnyTableName)[];

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
