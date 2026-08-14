import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type { CharacterId, CharacterItemId, SourceInstanceId } from '../../src/domain/ids';
import type {
  ContentKey,
  ItemDefinitionEffectId,
  ItemDefinitionId,
} from '../../src/domain/ids';
import type { DamageType, RulesEdition } from '../../src/domain/enums';
import { rulesEditions } from '../../src/domain/enums';
import {
  characterEffectKinds,
  type CharacterEffectKind,
} from '../../src/domain/effect-kinds';
import {
  datetime,
  integerAtLeast,
  oneOf,
  sqlText,
  tinyint1,
  varchar,
} from './columns';
import { character_source_instances, characters } from './character';
import { catalog_content_identities } from './catalog-content';
import {
  characterEffectColumns,
  featureEffectChecks,
} from './catalog-classes';

/* ==========================================================================
 * MODIFIER-ITEM DEFINITIONS — IMMUTABLE CATALOG VALUES COPIED ON PICK (CI-3c)
 * ========================================================================== */

export const item_definitions = sqliteTable(
  'item_definitions',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<ItemDefinitionId>(),
    content_key: varchar<ContentKey>()('content_key')
      .notNull()
      .references(() => catalog_content_identities.content_key),
    name: varchar()('name').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition').notNull(),
    description: sqlText()('description').notNull(),
    requires_attunement: tinyint1('requires_attunement')
      .notNull()
      .default(false),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'item_definitions_rules_edition_check',
      oneOf('rules_edition', rulesEditions),
    ),
    uniqueIndex('item_definitions_content_key_unique').on(table.content_key),
    index('item_definitions_name_index').on(table.name),
  ],
);

export const item_definition_effects = sqliteTable(
  'item_definition_effects',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<ItemDefinitionEffectId>(),
    item_definition_id: integer('item_definition_id')
      .notNull()
      .$type<ItemDefinitionId>()
      .references(() => item_definitions.id, { onDelete: 'cascade' }),
    sort_order: integer('sort_order').notNull(),
    ...characterEffectColumns<CharacterEffectKind, DamageType>(),
    label: varchar()('label').notNull(),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    ...featureEffectChecks(
      'item_definition_effects',
      characterEffectKinds,
      'known-plus-passthrough',
      false,
    ),
    check(
      'item_definition_effects_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    uniqueIndex('item_definition_effects_definition_sort_unique').on(
      table.item_definition_id,
      table.sort_order,
    ),
    index('item_definition_effects_definition_index').on(
      table.item_definition_id,
    ),
  ],
);

/* ==========================================================================
 * ITEMS — THE CHARACTER'S OWN, NON-MODIFYING THINGS (AC-1, D72)
 * ========================================================================== */

/**
 * A THING the character owns that only MODIFIES — Cloak of the Armadillo,
 * Ring of Shell, Staff of the Armadillo, an unattuned trinket that does
 * nothing yet. `character_armor` and `character_weapons` stay separate and are
 * NOT items: they carry mechanics nothing else has (dex caps, stealth,
 * damage dice, mastery) and are equipment, not modifiers (D72 §1).
 *
 * CARRIES NO `ac_change`, NO `to_hit_change`, NO `flat_damage_bonus` COLUMN —
 * D72 REJECTED THAT BY NAME (Option A). Every numeric change a thing on this
 * table grants is a `character_effects` row instead. AC-2b gives that effect
 * an explicit `(character_item_id, character_id)` reference back to this row.
 * The composite guard prevents a cross-character owner, and ON DELETE CASCADE
 * means removing the character's own item removes exactly the effects it
 * grants. `source_instance_id` remains a different relation: what granted the
 * ITEM, not which item owns an effect.
 *
 * NO `sort_order`. Unlike `character_effects` and `character_species_traits`,
 * the row shape names exactly five fields — name, description, quantity,
 * `requires_attunement`, `source_instance_id` — and does not ask
 * for a display order; a display surface (AC-B) can sort by name or id
 * without this unit inventing a column nothing yet reads.
 */
export const character_items = sqliteTable(
  'character_items',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterItemId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    /**
     * NOT NULL — an item nobody can name is an item nobody can find to edit
     * or delete, the identical argument `character_effects.label` makes.
     */
    name: varchar()('name').notNull(),
    /**
     * Nullable — D6b limb 1: a person may type a name before writing what the
     * thing does, exactly as `character_species_traits.description` allows.
     */
    description: sqlText()('description'),
    /**
     * How many identical possessions this row represents (D86). NOT NULL with
     * a default of one so an ordinary single possession stays concise, and a
     * positive-integer CHECK keeps zero/negative/fractional inventory states
     * out of both direct SQLite writes and future command paths.
     */
    quantity: integer('quantity').notNull().default(1),
    /**
     * Whether the item NEEDS attunement at all. NOT NULL with a `false`
     * default: Ring of Shell (D72 §9's own "proves attunement is not required"
     * fixture) is a real, common state and must not read as "unknown".
     */
    requires_attunement: tinyint1('requires_attunement')
      .notNull()
      .default(false),
    /**
     * WHAT GRANTED THIS, AS A LIVE REFERENCE — nullable on the identical D6b
     * limb 2 terms `character_effects.source_instance_id` carries at length
     * in `db/schema/origins.ts`: most items today are hand-added by a player,
     * so absence is the common case rather than an edge. The composite
     * `(source_instance_id, character_id)` reference is the same guard for
     * the same reason: a bare `source_instance_id` would pass
     * `PRAGMA foreign_key_check` while pointing at ANOTHER CHARACTER'S source
     * instance.
     */
    source_instance_id: integer('source_instance_id').$type<SourceInstanceId>(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    index('character_items_character_id_index').on(table.character_id),
    uniqueIndex('character_items_id_character_id_unique').on(
      table.id,
      table.character_id,
    ),
    foreignKey({
      columns: [table.source_instance_id, table.character_id],
      foreignColumns: [
        character_source_instances.id,
        character_source_instances.character_id,
      ],
    }).onDelete('cascade'),
    check(
      'character_items_quantity_check',
      integerAtLeast('quantity', 1),
    ),
  ],
);

/**
 * D92: ATTUNEMENT IS THREE COLUMNS, NOT AN UNBOUNDED CHILD LIST.
 *
 * Each character can have at most one row and that row has exactly three
 * nullable item positions. The three composite references prove that every
 * occupant belongs to the same character. Pairwise CHECKs make one item
 * occupying two slots unrepresentable as well.
 *
 * SQLite cannot apply `ON DELETE SET NULL` to only the item half of a
 * composite foreign key (setting `character_id` null would violate this
 * table's primary key), so `db/schema/triggers.sql` clears matching positions
 * before an item is deleted.
 */
export const character_attunement_slots = sqliteTable(
  'character_attunement_slots',
  {
    character_id: integer('character_id')
      .primaryKey()
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    slot_1_item_id: integer('slot_1_item_id').$type<CharacterItemId>(),
    slot_2_item_id: integer('slot_2_item_id').$type<CharacterItemId>(),
    slot_3_item_id: integer('slot_3_item_id').$type<CharacterItemId>(),
  },
  (table) => [
    foreignKey({
      columns: [table.slot_1_item_id, table.character_id],
      foreignColumns: [character_items.id, character_items.character_id],
    }),
    foreignKey({
      columns: [table.slot_2_item_id, table.character_id],
      foreignColumns: [character_items.id, character_items.character_id],
    }),
    foreignKey({
      columns: [table.slot_3_item_id, table.character_id],
      foreignColumns: [character_items.id, character_items.character_id],
    }),
    check(
      'character_attunement_slots_distinct_check',
      sql`
        (slot_1_item_id IS NULL OR slot_2_item_id IS NULL OR slot_1_item_id <> slot_2_item_id)
        AND (slot_1_item_id IS NULL OR slot_3_item_id IS NULL OR slot_1_item_id <> slot_3_item_id)
        AND (slot_2_item_id IS NULL OR slot_3_item_id IS NULL OR slot_2_item_id <> slot_3_item_id)
      `,
    ),
  ],
);
