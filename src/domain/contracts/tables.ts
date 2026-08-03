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
  /** Recipient-local catalog identity and match-review registry state. */
  | 'catalog_registry'
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
  | 'catalog_origin'
  /**
   * The SRD armour catalog. Its own member for the SAME reason `catalog_weapon`
   * is one, applied consistently: armour is not a weapon, so filing
   * `armor_templates` under `catalog_weapon` to avoid a one-line union change
   * would make the role field lie in exactly the way the line above refuses.
   *
   * The two are not merged into a `catalog_equipment` either. They share their
   * scope booleans today, but so do the seven `catalog_class` tables and the
   * three `catalog_source` ones; the role names what a table HOLDS, and no
   * consumer wants "weapons or armour" as one set.
   */
  | 'catalog_armor'
  /** Modifier-item definitions and their ordered mechanical effect graph. */
  | 'catalog_item'
  /** Non-secret local publication and repository-observation relationships. */
  | 'party_observation';

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
  character_level_feat_choices: {
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

  // A repository-path read model, not character truth. Its nullable
  // `character_id` associates the newest local clone for the roster but does
  // not make the row character-owned or portable with that character.
  party_document_states: {
    role: 'party_observation',
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

  /**
   * THE FOUR STORED SHEET INPUTS TRAVEL, AND ALL FOUR FLAGS ARE SET HERE IN THE
   * SAME CHANGE THAT CREATED THE TABLES. That sentence is the whole point of
   * this block.
   *
   * Leaving these at `false` produces NO COMPILE ERROR ANYWHERE. "Not portable"
   * is a legal classification — `change_log` and `character_operations` are
   * legitimately all-false above — so the type system cannot tell a deliberate
   * omission from a forgotten one. `character_weapons` sat that way, and the
   * symptom was a user's weapons missing from their own backup, missing from
   * every link they sent, and untouched by a save-point restore, with nothing
   * anywhere objecting. It is the ONLY failure mode in this file that ships.
   *
   * A character's armour vanishing from their own backup is that same defect
   * aimed at the data this project exists to protect, so the four flags are set
   * before the tables have a single writer.
   *
   * WHAT THE THREE PORTABILITY FLAGS COST, AND WHERE THE COST WAS PAID:
   *
   *  - `backup` put four names into the document's table set, which
   *    `assertExactKeys` makes part of the accepted shape. A file exported
   *    yesterday has none of them, so all four are named in
   *    `BACKUP_OPTIONAL_TABLES` and default to `[]` — an old backup still
   *    imports, and yields a character with nothing recorded, which is what that
   *    file honestly says.
   *  - `share` added ONE grouped element to the positional wire tuple, not four.
   *    The root grows one element per FEATURE (see `src/sharing/codec.ts`), and
   *    the decoder accepts a thirteen-element tuple as "no sheet inputs", so
   *    every link already in the wild still imports.
   *  - `snapshot` moved the snapshot schema from `a7-v3` to `a7-v4`. All four
   *    versions are still readable, and restoring an older one deliberately
   *    LEAVES these tables alone rather than emptying them: a snapshot that
   *    never recorded armour is not evidence that there was none.
   *
   * `backupReference` is false for the D1b reason `character_weapons` records:
   * a character's armour holds no `armor_templates` id, so a document has
   * nothing to resolve against the catalog and a reference kind for it could
   * never be populated.
   */
  character_armor: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  character_hit_point_rolls: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  character_skill_proficiencies: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  /**
   * THE SKILL GRANTS — the source of truth the flat table above is now a
   * projection of (skills-with-provenance plan, §3.2). All four
   * character-owned scopes are set IN THE SAME CHANGE THAT CREATED THE TABLE,
   * for the reason the sheet-input block above shouts: "not portable" is a
   * legal classification the type system cannot distinguish from a forgotten
   * one, and a grant that misses a backup silently degrades a character's
   * skills to unattributed rows on the next import.
   *
   * WHAT THE THREE PORTABILITY FLAGS COST, AND WHERE IT WAS PAID:
   *
   *  - `backup` puts the table in the document's set and therefore in
   *    `BACKUP_OPTIONAL_TABLES`, so a file exported before grants existed
   *    still imports; its projection rows are the only truth it has and are
   *    restored as-is (§3.2).
   *  - `share` MINTS WIRE v5 — a new root element carrying source ref, grant
   *    key, ordinal and the nullable selection — and pre-v5 documents are
   *    RETIRED per D60 via a v4→v5 migration that deliberately throws
   *    (§3.2): a bare skill string list carries no provenance, and inventing
   *    attribution would be fabricating user data.
   *  - `snapshot` moves the snapshot schema from `a7-v8` to `a7-v9` and
   *    freezes `A7_V8_TABLES` by hand FIRST — `character-state.ts` calls the
   *    alternative the most expensive mistake available.
   *
   * `backupReference` stays false: `source_instance_id` points at another
   * CHARACTER-OWNED row, which a backup remaps rather than resolves — the
   * same treatment `spell_selection_slots` and `character_effects` get.
   */
  character_skill_grants: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  character_skill_expertise_grants: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  character_sheet_adjustments: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    // Historical shell only. AC-4 migrates its retired payload into effects;
    // current share documents carry those effects and never this table.
    share: false,
    backupReference: false,
  },

  // --- catalog identity registry -----------------------------------------
  // Registry rows describe catalog content and recipient-local review
  // receipts. They are deliberately absent from every character-scoped
  // portability surface: a whole-database image retains them because it
  // retains every application table, while character JSON and shares do not.
  catalog_content_identities: {
    role: 'catalog_registry',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  catalog_content_fingerprints: {
    role: 'catalog_registry',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  catalog_content_aliases: {
    role: 'catalog_registry',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  catalog_content_match_decisions: {
    role: 'catalog_registry',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  catalog_data_migrations: {
    role: 'catalog_registry',
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
  /**
   * The SLOT levels at which a spell can be upcast. Catalog content on the same
   * five flags as every other `spell_versions` pivot, and the reasoning is the
   * same one `spell_versions` itself records: the catalog is REBUILT by the
   * recipient's own import, so nothing about it belongs in a portable document.
   *
   * `backupReference` STAYS FALSE, and it is worth saying why it is not
   * inherited from the parent. `spell_versions` carries it because a backup
   * resolves a character's spell rows against that table BY CONTENT KEY
   * (`SELECT id, content_key FROM "spell_versions" …`). Nothing a character owns
   * points at an upcast level, so there is nothing to resolve.
   */
  spell_version_upcast_levels: {
    role: 'catalog_spell',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  /**
   * The CHARACTER levels at which a cantrip's effect changes — the SRD's
   * Cantrip Upgrade. A sibling of `spell_version_upcast_levels` and classified
   * identically for identical reasons: catalog content, rebuilt by the
   * recipient's own import, referenced by nothing a character owns.
   *
   * `share: false` IS WHY D30's COLUMN-PORTABILITY GUARD DOES NOT APPLY HERE.
   * That test's `PROBES` map is keyed by `ShareTable | 'characters'`, and
   * neither this table nor `spell_versions` is a `ShareTable`, so the new
   * columns in this change have nothing to classify there. Said out loud rather
   * than left as an absence, because "no classification was needed" and
   * "somebody forgot to classify it" look identical in a diff.
   */
  spell_version_cantrip_upgrade_levels: {
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
  class_resources: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  class_resource_formulas: {
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
   * The two D19 class-feature tables, classified exactly as the progression
   * tables beside them and for the same reason: they are CATALOG CONTENT, so
   * nothing here is a character's own data, and a backup resolves nothing
   * against them.
   *
   * `backupReference: false` IS THE INTERESTING ONE, AND IT IS NOT AN OVERSIGHT.
   * A backup or a share already carries the character's SUBCLASS by content key
   * (`subclass_definitions.backupReference: true`), and a subclass feature is
   * reached only THROUGH that subclass. Making these reference kinds would mean
   * a backup naming individual features, which would fail to import against a
   * recipient whose copy of the same subclass has been revised — and would add
   * a `ReferenceKind` member, invalidating every existing backup document,
   * since `CharacterBackupReferences` is keyed by that union.
   *
   * `named_features` gets the same answer for a blunter reason: NOTHING POINTS
   * AT IT FROM A CHARACTER. There is no invocation selection anywhere in this
   * schema, which is precisely why a grant sourced from one of these rows is
   * surfaced against an attack profile rather than applied to it.
   */
  subclass_features: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  subclass_feature_effects: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  named_features: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  named_feature_effects: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  class_feature_effects: {
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

  /**
   * SHEET CORE (D11 part 1, D12). Seven class-content tables and the armour
   * catalog.
   *
   * All `catalog_class` except `armor_templates`, which is `catalog_armor` — its
   * own role, because armour is not a weapon and `catalog_weapon`'s own comment
   * is the argument for not reusing it. Its SCOPES are identical to
   * `weapon_templates`: by D1b a character stores VALUES and holds no template
   * id, so there is no id for a backup to resolve. NONE of these eight are
   * reference kinds, for exactly the reason the progression and mastery tables
   * are not.
   *
   * `snapshot: false` throughout because none of these is character state.
   * When the character-side armour and hit-point-roll tables land, THOSE will be
   * snapshot/backup/share tables; these stay catalog.
   */
  class_sheet_traits: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  class_saving_throw_proficiencies: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  class_skill_options: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  class_armor_training: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  class_weapon_proficiencies: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  class_extra_attack_grants: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  class_martial_arts_dice: {
    role: 'catalog_class',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  armor_templates: {
    role: 'catalog_armor',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  item_definitions: {
    role: 'catalog_item',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  item_definition_effects: {
    role: 'catalog_item',
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
  /**
   * The CATALOG half of the effect model, and it carries `species_template_traits`'
   * flags unchanged for the identical reason: it declares what a TEMPLATE
   * GRANTS, a character's own effect row holds no template effect id, and there
   * is nothing for a backup document to resolve. The CHARACTER half —
   * `character_effects` below — is all-true for the same three scopes
   * `character_species_traits` is, because it is the character's data.
   */
  species_template_trait_effects: {
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
  background_template_effects: {
    role: 'catalog_origin',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  /**
   * The structured equipment lines of a background TEMPLATE. All five flags
   * false, exactly as its parent — this is bundled SRD catalog content, seeded
   * from `docs/srd/source/backgrounds.txt` on every boot, and a portable
   * document that carried it would be shipping the recipient a copy of content
   * they already have.
   *
   * THE CHARACTER SIDE IS UNTOUCHED BY THIS TRACK AND THAT IS THE OWNER'S WORD:
   * the ruling says *"templates"*. `character_background.equipment_option_a`
   * and `_b` are still two free-text columns and still `verbatim` in the D30
   * portability map. NOTHING COPIES A TEMPLATE INTO A CHARACTER TODAY — the
   * species side has `speciesFromTemplate` and the background side has no
   * equivalent — so structuring the template changes nothing a user can see
   * yet. That gap is named rather than quietly closed with a schema change the
   * ruling did not ask for.
   */
  background_equipment_items: {
    role: 'catalog_origin',
    snapshot: false,
    backupDirect: false,
    backup: false,
    share: false,
    backupReference: false,
  },
  /**
   * Recipient-seeded class catalog content. It has no character id and no
   * character-owned values; shares and backups resolve the class catalog on
   * the recipient rather than carrying package rows.
   */
  class_equipment_items: {
    role: 'catalog_class',
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
  /**
   * The character's own effects, on the same three-true terms and with the same
   * costs paid in the same four places:
   *
   *  - `backup` puts it in the document's table set and therefore in
   *    `BACKUP_OPTIONAL_TABLES`, so a file exported before this table existed
   *    still imports;
   *  - `share` adds a FIFTEENTH root element to the positional wire tuple. The
   *    root already accepts 11, 12, 13 and 14 elements and grows by one per
   *    feature, so this is the established move rather than a format break, and
   *    `CHARACTER_SHARE_VERSION` stays pinned at 1;
   *  - `snapshot` moves the snapshot schema from `a7-v4` to `a7-v5` and freezes
   *    `A7_V4_TABLES` by hand. Not bumping would retroactively change what
   *    `a7-v4` claims to carry and break every save point already on disk.
   *
   * `backupReference` stays false: the row holds no catalog id. Its
   * `source_instance_id` points at another CHARACTER-OWNED row, which a backup
   * remaps rather than resolves — the same treatment `spell_selection_slots`
   * gets.
   */
  character_effects: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  /**
   * `character_items` (AC-1, D72), on the IDENTICAL three-true terms
   * `character_effects` carries just above and for the identical reason: an
   * item is the character's own data, so it belongs in the portable backup
   * document, in a shared link, and in the undo/redo snapshot.
   *
   *  - `backup` puts it in the document's table set and therefore in
   *    `BACKUP_OPTIONAL_TABLES`, so a file exported before this table existed
   *    still imports, and yields a character with no items — which is what
   *    that file honestly says, since no character owned one before this unit.
   *  - `share` adds an EIGHTEENTH root element to the positional wire tuple.
   *    Wire version 8 (D41) is minted for it.
   *  - `snapshot` moves the snapshot schema from `a7-v9` to `a7-v10` and
   *    freezes `A7_V9_TABLES` by hand FIRST, exactly as `character_skill_grants`
   *    did one version earlier.
   *
   * `backupReference` stays false: the row holds no catalog id. Its
   * `source_instance_id` points at another CHARACTER-OWNED row, which a
   * backup remaps rather than resolves — the same treatment
   * `character_effects` gets.
   */
  character_items: {
    role: 'character_owned',
    snapshot: true,
    backupDirect: true,
    backup: true,
    share: true,
    backupReference: false,
  },
  /**
   * D92's fixed three-position attunement row. It is character state and must
   * therefore travel through snapshots, backups, and shares with the items its
   * three composite references name.
   */
  character_attunement_slots: {
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
export type SpellDefinitionTable = TablesWithRole<'catalog_spell'>;

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
 * Every table that makes one spell definition complete.
 *
 * The portable character backup filters these tables down to the user-authored
 * spell versions the character actually references. Deriving membership from
 * the catalog role means a future spell-owned pivot cannot be added to the
 * schema while silently falling out of the artifact.
 */
export const SPELL_DEFINITION_TABLES = order<SpellDefinitionTable>()([
  'spell_identities',
  'spell_identity_aliases',
  'spell_versions',
  'spell_version_publications',
  'spell_list_memberships',
  'spell_version_tags',
  'spell_version_damage_types',
  'spell_version_conditions',
  'spell_version_attack_modes',
  'spell_version_save_abilities',
  'spell_version_upcast_levels',
  'spell_version_cantrip_upgrade_levels',
]);

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
  'armor_templates',
  'background_definitions',
  'background_equipment_items',
  'background_template_effects',
  'background_templates',
  'catalog_content_aliases',
  'catalog_content_fingerprints',
  'catalog_content_identities',
  'catalog_content_match_decisions',
  'catalog_data_migrations',
  'class_equipment_items',
  'change_log',
  'character_armor',
  'character_attunement_slots',
  'character_background',
  'character_class_levels',
  'character_effects',
  'character_hit_point_rolls',
  'character_items',
  'character_level_feat_choices',
  'character_operations',
  'character_rule_overrides',
  'character_save_points',
  'character_sheet_adjustments',
  'character_skill_grants',
  'character_skill_expertise_grants',
  'character_skill_proficiencies',
  'character_source_instances',
  'character_species',
  'character_species_traits',
  'character_spell_preferences',
  'character_weapons',
  'characters',
  'class_armor_training',
  'class_definitions',
  'class_extra_attack_grants',
  'class_feature_effects',
  'class_martial_arts_dice',
  'class_progressions',
  'class_resource_formulas',
  'class_resources',
  'class_saving_throw_proficiencies',
  'class_sheet_traits',
  'class_skill_options',
  'class_weapon_mastery_counts',
  'class_weapon_mastery_grants',
  'class_weapon_proficiencies',
  'feat_definitions',
  'item_definition_effects',
  'item_definitions',
  'named_features',
  'named_feature_effects',
  'party_document_states',
  'species_definitions',
  'species_template_trait_effects',
  'species_template_traits',
  'species_templates',
  'spell_identities',
  'spell_identity_aliases',
  'spell_list_memberships',
  'spell_loadout_entries',
  'spell_loadouts',
  'spell_selection_slots',
  'spell_version_attack_modes',
  'spell_version_cantrip_upgrade_levels',
  'spell_version_conditions',
  'spell_version_damage_types',
  'spell_version_publications',
  'spell_version_save_abilities',
  'spell_version_tags',
  'spell_version_upcast_levels',
  'spell_versions',
  'subclass_definitions',
  'subclass_feature_effects',
  'subclass_features',
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
  // Appended for the third time and for the third time never inserted: capture
  // order is stable output, and an existing snapshot's key order is part of
  // what `equalValues` compares in `CharacterState.diff`. The armour row comes
  // before the rolls and the rolls before the skills. The retired adjustment
  // table remains last as a historical snapshot shell.
  'character_armor',
  'character_hit_point_rolls',
  'character_skill_proficiencies',
  'character_sheet_adjustments',
  // Appended for the fourth time and for the fourth time never inserted:
  // capture order is stable output, and an existing snapshot's key order is
  // part of what `equalValues` compares in `CharacterState.diff`.
  //
  // It sits AFTER the origin tables rather than beside them because an effect
  // is no longer part of the species — that severance is the whole change —
  // and the restore pass must insert `character_source_instances` before this,
  // which the existing order already guarantees.
  'character_effects',
  // Appended, never inserted, for the fifth time and the same reason. It sits
  // last because it references `character_source_instances` (composite key),
  // which the existing order already inserts before this on restore.
  'character_skill_grants',
  'character_skill_expertise_grants',
  // Appended, never inserted, for the sixth time and the same reason
  // (AC-1, D72). It sits last for the identical reason `character_skill_grants`
  // does: it references `character_source_instances` (composite key), which
  // the existing order already inserts before this on restore.
  'character_items',
  'character_attunement_slots',
  'character_level_feat_choices',
]);

/**
 * Snapshot tables in an order safe to INSERT under `PRAGMA foreign_keys = ON`.
 *
 * Deliberately distinct from `CHARACTER_STATE_TABLES`: capture order is stable
 * serialized output, while insertion order is a dependency graph. AC-2b makes
 * effects children of items and weapons, so both equipment tables must exist
 * before an effect that names them is restored.
 */
export const CHARACTER_STATE_INSERT_ORDER = order<SnapshotTable>()([
  'character_class_levels',
  'character_source_instances',
  'character_level_feat_choices',
  'spell_selection_slots',
  'wizard_spellbook_entries',
  'warning_acknowledgements',
  'character_weapons',
  'character_species',
  'character_species_traits',
  'character_background',
  'character_armor',
  'character_hit_point_rolls',
  'character_skill_proficiencies',
  'character_sheet_adjustments',
  'character_skill_grants',
  'character_skill_expertise_grants',
  'character_items',
  'character_attunement_slots',
  'character_effects',
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
  // Effects are children of source instances, items and weapons. Deleting them
  // first makes the remaining order explicit rather than relying on cascades
  // to erase rows before their own delete step.
  'character_effects',
  // Slot rows reference items, so they must be gone before their occupants.
  'character_attunement_slots',
  // Weapons and items are no longer childless leaves (AC-2b): their owned
  // effects were deleted immediately above, so both parents are now safe.
  'character_weapons',
  'character_items',
  // Leaves too, and nothing references any of them — `character_hit_point_rolls`
  // deliberately has no foreign key to `character_class_levels` (see
  // `db/schema/sheet-inputs.ts`), so there is no edge here to respect and the
  // order within this group is free.
  'character_armor',
  'character_hit_point_rolls',
  'character_skill_proficiencies',
  'character_sheet_adjustments',
  // A leaf on the same terms as `character_effects`: no children, but it
  // references `character_source_instances` through the same composite key, so
  // it must be deleted before that table — which this position guarantees.
  'character_skill_grants',
  'character_skill_expertise_grants',
  'character_level_feat_choices',
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
  'character_armor',
  'character_hit_point_rolls',
  'character_skill_proficiencies',
  'character_sheet_adjustments',
  'character_effects',
  'character_skill_grants',
  'character_skill_expertise_grants',
  'character_items',
  'character_attunement_slots',
  'character_level_feat_choices',
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
  // The four historical sheet tables. Every backup file a user already holds
  // predates all four, and without these entries `assertExactKeys` would make
  // each of those files UNOPENABLE — loud, and inflicted on exactly the data
  // this format exists to protect. `[]` is the honest reading: that document
  // records no armour, no rolls, no skill choices and no legacy adjustment.
  'character_armor',
  'character_hit_point_rolls',
  'character_skill_proficiencies',
  'character_sheet_adjustments',
  // The character's own effects. Every backup file a user already holds
  // predates the table, and `[]` is the honest reading of one — those files
  // carry their effects on the `character_species_traits` rows instead, which
  // `src/rules/legacy-trait-effects.ts` migrates on the way in, so nothing is
  // lost by defaulting this key to empty.
  'character_effects',
  // The skill grants. Every backup file written before the provenance model
  // predates the table; `[]` is the honest reading of one, and its flat
  // `character_skill_proficiencies` rows are the only truth it has — they are
  // restored as-is rather than being reconciled against grants that were
  // never recorded (plan §3.2).
  'character_skill_grants',
  'character_skill_expertise_grants',
  // The character's own items (AC-1, D72). Every backup file a user already
  // holds predates the table, and `[]` is the honest reading of one: no
  // character owned an item before this unit, so there is nothing lost by
  // defaulting this key to empty.
  'character_items',
  'character_attunement_slots',
  'character_level_feat_choices',
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
  character_armor: 'character_armor',
  character_hit_point_rolls: 'character_hit_point_rolls',
  character_skill_proficiencies: 'character_skill_proficiencies',
  character_skill_grants: 'character_skill_grants',
  character_skill_expertise_grants: 'character_skill_expertise_grants',
  character_effects: 'character_effects',
  character_items: 'character_items',
  character_attunement_slots: 'character_attunement_slots',
  character_level_feat_choices: 'character_level_feat_choices',
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
  // Added on the same terms again: `CharacterState.diff` now emits a change per
  // row of each sheet-input table, and an entity type the diff can produce that
  // the log will not accept is a write that fails at runtime, mid-command.
  'character_armor',
  'character_hit_point_rolls',
  'character_skill_proficiencies',
  'character_sheet_adjustments',
  // Added on the same terms again: `CharacterState.diff` now emits a change per
  // effect row, and an entity type the diff can produce that the log will not
  // accept is a write that fails at runtime, mid-command.
  'character_effects',
  // Added on the same terms once more: the grants table is snapshot-scoped, so
  // `CharacterState.diff` emits a change per grant row.
  'character_skill_grants',
  'character_skill_expertise_grants',
  // Added on the same terms once more (AC-1, D72): the items table is
  // snapshot-scoped, so `CharacterState.diff` emits a change per item row.
  'character_items',
  'character_attunement_slots',
  'character_level_feat_choices',
] as const satisfies readonly ('character' | AnyTableName)[];

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
