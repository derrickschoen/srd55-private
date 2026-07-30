import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
} from 'drizzle-orm/sqlite-core';
import type { CharacterId, CharacterItemId, SourceInstanceId } from '../../src/domain/ids';
import { datetime, sqlText, tinyint1, varchar } from './columns';
import { character_source_instances, characters } from './character';

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
 * table grants is a `character_effects` row instead, referencing this row's
 * `character_source_instances` companion the same way any other effect does.
 * An item and its effects are linked only by a shared `label` a person reads
 * and, where the effect actually has one, a shared `source_instance_id` — the
 * SAME severed-by-design relationship `character_effects.label` already has
 * with the trait that named it (`db/schema/origins.ts`). There is deliberately
 * no foreign key from an effect to the item row that "granted" it: nothing in
 * this unit copies one into the other (AC-2/AC-3), and inventing a link this
 * dispatch does not populate would be schema slack with nothing behind it.
 *
 * NO `sort_order`. Unlike `character_effects` and `character_species_traits`,
 * the plan's own row shape names exactly five fields — name, description,
 * `requires_attunement`, `attuned`, `source_instance_id` — and does not ask
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
     * Whether the item NEEDS attunement at all. NOT NULL with a `false`
     * default: Ring of Shell (D72 §9's own "proves attunement is not required"
     * fixture) is a real, common state and must not read as "unknown".
     */
    requires_attunement: tinyint1('requires_attunement')
      .notNull()
      .default(false),
    /**
     * Whether the CHARACTER has attuned to it. NOT NULL with a `false`
     * default, and deliberately NOT constrained to `requires_attunement`
     * being true: D73 §2's attunement gate is AC-3's job (out of scope here),
     * and a stray `attuned = true` on an item that does not require it is
     * inert data, not a wrong number — nothing in this unit reads it.
     */
    attuned: tinyint1('attuned').notNull().default(false),
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
    foreignKey({
      columns: [table.source_instance_id, table.character_id],
      foreignColumns: [
        character_source_instances.id,
        character_source_instances.character_id,
      ],
    }).onDelete('cascade'),
  ],
);
