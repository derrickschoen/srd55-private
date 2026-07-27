import {
  check,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  CharacterArmorId,
  CharacterHitPointRollId,
  CharacterId,
  CharacterSheetAdjustmentId,
  CharacterSkillProficiencyId,
} from '../../src/domain/ids';
import type {
  ArmorCategory,
  ArmorDexBonus,
  ArmorSlot,
  Skill,
} from '../../src/domain/enums';
import {
  armorCategories,
  armorDexBonuses,
  armorSlots,
  skills,
} from '../../src/domain/enums';
import { SHEET_ADJUSTMENT_BOUNDS, SHEET_ROLL_BOUNDS } from '../../src/domain/sheet-limits';
import {
  datetime,
  integerAtLeast,
  nullOrIntegerAtLeast,
  oneOf,
  sqlText,
  tinyint1,
  varchar,
} from './columns';
import { characters } from './character';

/**
 * THE FOUR STORED SHEET INPUTS — and NOTHING ELSE.
 *
 * `src/rules/sheet.ts` opens by naming what a character sheet genuinely stores
 * as opposed to derives: a per-level HIT POINT ROLL, the ARMOUR worn and the
 * SHIELD held, the MANUAL ARMOR CLASS ADJUSTMENT, and (implied by
 * `skillModifier`'s `proficient` parameter, which had no source) the SKILL
 * PROFICIENCIES the player chose. Those four are inputs a die or a person
 * supplied and this application cannot recompute. Every other number on a sheet
 * — hit point maximum, Armor Class, saving throws, skill modifiers, initiative,
 * passive Perception, attacks per action — is derived live from these plus the
 * ability scores and the class levels, and D11 part 1 forbids storing any of
 * them: a stored Armor Class drifts from the Dexterity score the moment either
 * moves, and there is then no way to tell which is right.
 *
 * WHY FOUR TABLES AND NOT ONE. Each has a different cardinality per character
 * and a different key, and merging any two would require a nullable column that
 * stands for "this row is the other kind" — the correlated-null shape D6 rejects:
 *
 *  - `character_armor` — at most one row per SLOT, so at most two.
 *  - `character_hit_point_rolls` — one row per (class, level in that class).
 *  - `character_skill_proficiencies` — one row per skill, presence IS the value.
 *  - `character_sheet_adjustments` — at most ONE row per character.
 *
 * EVERY ONE OF THE FOUR IS `snapshot`, `backupDirect`, `backup` AND `share` IN
 * `src/domain/contracts/tables.ts`, SET IN THE SAME CHANGE THAT CREATES THEM.
 * That is the Q8 lesson stated as a rule rather than a hope: `character_weapons`
 * shipped with all four flags false, no compile error anywhere, and the symptom
 * was a user's weapons missing from their own backup. A character's armour
 * vanishing from their own backup is the same defect, and it is the one this
 * project exists to prevent.
 */

/**
 * The armour a character wears and the shield they hold — as VALUES (D1b).
 *
 * NO `armor_template_id`. Picking one of the thirteen `armor_templates` rows is
 * a one-time column-wise COPY, after which every field is the character's own;
 * the fillable columns are therefore deliberately identical in name and type to
 * that table's, so the copy needs no mapping and a user may then edit a suit of
 * Half Plate into whatever their table agreed on.
 *
 * `slot` IS NOT `category`, AND CONFLATING THEM WOULD DELETE A REAL WARNING.
 * `slot` is WHERE THE USER PUT IT; `category` is WHAT IT IS. `armorClass` in
 * `src/rules/sheet.ts` dispatches on `category` alone and emits an
 * `armor_slot_mismatch` warning when the two disagree — a Shield recorded in the
 * worn slot still contributes its `+2` bonus and the sheet SAYS the slots are
 * crossed. Deriving the slot from the category would make that state
 * unrepresentable and silently discard an import that carried it, which is
 * exactly the D11 part 2 tolerance this schema is supposed to preserve.
 *
 * THE UNIQUE INDEX IS ON `(character_id, slot)` and not on the category: one
 * worn item and one held item is the cardinality a body has.
 */
export const character_armor = sqliteTable(
  'character_armor',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterArmorId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    slot: varchar<ArmorSlot>()('slot').notNull(),
    name: varchar()('name').notNull(),
    /**
     * REQUIRED, and it is the field that gives `armor_class` its meaning — the
     * promise `armor_templates.armor_class` is documented as relying on. For
     * `light`, `medium` and `heavy` the column is a BASE Armor Class; for
     * `shield` it is an ADDITIVE BONUS. `armorClassFrom` is an exhaustive
     * switch over this with no `default` arm, so a new category is a compile
     * error rather than a silent miscalculation.
     */
    category: varchar<ArmorCategory>()('category').notNull(),
    armor_class: integer('armor_class').notNull(),
    dex_bonus: varchar<ArmorDexBonus>()('dex_bonus').notNull(),
    /**
     * Non-NULL exactly when `dex_bonus = 'capped'`, tied by the CHECK below.
     * The null is D6b limb 2 — the source's own absence: Light armour prints
     * `+ Dex modifier` with no cap and Heavy armour prints no Dex term at all,
     * so for ten of the thirteen printed rows there is no cap value to hold.
     *
     * THE PAIRED CHECK IS LOAD-BEARING HERE IN A WAY IT IS NOT ON THE TEMPLATE.
     * `dexterityTerm` reads `armor.dex_bonus_max ?? 0` on the `capped` arm and
     * documents that `?? 0` as unreachable for a seeded row. Without the same
     * CHECK on the character's own copy — which a share link, a backup file and
     * a hand-edited image can all reach — it becomes reachable, and a Light suit
     * would silently degrade to Heavy behaviour.
     */
    dex_bonus_max: integer('dex_bonus_max'),
    /**
     * The `Str 13` / `Str 15` column, NULL where the table prints an em-dash.
     * Carried so the sheet can WARN (`strength_requirement_unmet`), which is
     * precisely what D12 said a bare manual AC field could never do.
     */
    strength_requirement: integer('strength_requirement'),
    stealth_disadvantage: tinyint1('stealth_disadvantage')
      .notNull()
      .default(false),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check('character_armor_slot_check', oneOf('slot', armorSlots)),
    check('character_armor_category_check', oneOf('category', armorCategories)),
    check(
      'character_armor_dex_bonus_check',
      oneOf('dex_bonus', armorDexBonuses),
    ),
    /** Identical to `armor_templates_dex_bonus_max_check`, and for the reason
     * given on the column: this is the copy the `?? 0` fallback would otherwise
     * become reachable through. */
    check(
      'character_armor_dex_bonus_max_check',
      sql`(\`dex_bonus\` = 'capped') = (\`dex_bonus_max\` IS NOT NULL) AND ${nullOrIntegerAtLeast(
        'dex_bonus_max',
        0,
      )}`,
    ),
    /**
     * A Shield contributes a BONUS and never a Dexterity term — the source's
     * Shield row prints `+2` for AC and an em-dash in the Strength and Stealth
     * columns. Without this, a shield row could carry `dex_bonus = 'full'`,
     * a value `armorClassFrom` ignores entirely: a field that reads as
     * meaningful and is not.
     */
    check(
      'character_armor_shield_check',
      sql`\`category\` <> 'shield' OR \`dex_bonus\` = 'none'`,
    ),
    check(
      'character_armor_armor_class_check',
      integerAtLeast('armor_class', 1),
    ),
    check(
      'character_armor_strength_requirement_check',
      nullOrIntegerAtLeast('strength_requirement', 1),
    ),
    uniqueIndex('character_armor_character_id_slot_unique').on(
      table.character_id,
      table.slot,
    ),
  ],
);

/**
 * One hit point roll a player made, keyed by CLASS and by the level IN THAT
 * CLASS.
 *
 * A DIE ROLL IS THE ONE NUMBER ON A SHEET THIS APPLICATION CANNOT RECOMPUTE.
 * `HitPointRolls` in `src/rules/sheet.ts` is
 * `class name -> level in that class -> value`, because hit dice differ per
 * class: a Fighter 5 / Wizard 3 rolls d10s for the Fighter levels and d6s for
 * the Wizard levels, and `docs/srd/source/multiclassing.txt` says to track dice
 * of different types separately.
 *
 * AN ABSENT ROW, NOT A NULLABLE COLUMN (D6b limb 1). No roll means "use the
 * printed fixed value" — `fixedHitPointsPerLevel`, `die / 2 + 1` — which is a
 * legitimate steady state for a character who never rolled, and for EVERY
 * character imported from a payload written before this table existed. There is
 * therefore no `| null` anywhere in this table to propagate into the derivation.
 *
 * KEYED ON `class_name`, A STRING, AND NOT ON `character_class_levels.id`.
 * That is a decision with a cost, taken deliberately:
 *
 *  - a foreign key would need `ON DELETE CASCADE`, and `update-class.ts` deletes
 *    a class row outright when its level is cleared. The player's physical dice
 *    roll would be destroyed by an edit they made to fix a typo.
 *  - a share link and a backup carry no class-level ids the recipient could
 *    reuse; the class rows are re-created with new ids on import, and a
 *    name-keyed roll needs no remapping pass at all.
 *
 * THE COST IS AN ORPHAN, AND IT IS SURFACED RATHER THAN HIDDEN. A roll whose
 * `class_name` matches no class the character currently has is simply not read
 * by `hitPointMaximum`, and `unrecordedHitPointRolls` in
 * `src/queries/character-completeness.ts` reports it as an outstanding item
 * naming the class. Silence there would be a number quietly missing from a
 * player's hit points.
 */
export const character_hit_point_rolls = sqliteTable(
  'character_hit_point_rolls',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterHitPointRollId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    class_name: varchar()('class_name').notNull(),
    /** The level in THIS class, never the total character level. */
    class_level: integer('class_level').notNull(),
    rolled_value: integer('rolled_value').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * `class_level BETWEEN 1 AND 20` matches every other class-level bound in
     * this schema. `rolled_value` goes through `integerAtLeast` for the reason
     * `columns.ts` measured: `BETWEEN` already rejects text on its upper limb, a
     * bare `>= 1` does not reject it at all.
     *
     * The upper bound on the roll is the largest hit die in the source (d12)
     * and lives in `src/domain/sheet-limits.ts`, so the database, the write
     * boundary and the share boundary read ONE number. A roll of 1 is
     * legitimate on every die; a roll of 0 is not a roll.
     */
    check(
      'character_hit_point_rolls_check',
      sql`\`class_level\` BETWEEN 1 AND 20 AND ${integerAtLeast(
        'rolled_value',
        SHEET_ROLL_BOUNDS.minimum,
      )} AND \`rolled_value\` <= ${sql.raw(String(SHEET_ROLL_BOUNDS.maximum))}`,
    ),
    uniqueIndex(
      'character_hit_point_rolls_character_id_class_name_class_level_unique',
    ).on(table.character_id, table.class_name, table.class_level),
  ],
);

/**
 * One skill the character is proficient in. PRESENCE IS THE VALUE.
 *
 * There is no `proficient` boolean, and its absence is the point: a row with
 * `proficient = 0` would be a null wearing a costume — indistinguishable in
 * meaning from no row, and a second way to say the same thing that two writers
 * could disagree about.
 *
 * WHAT THIS DOES NOT MODEL, AND SAYS SO. Where the proficiency CAME FROM — a
 * class's "choose 2 from" list, a background, a feat — is not recorded. This
 * application cannot derive it: `class_sheet_traits.skill_choice_from_any`
 * exists precisely because the Bard chooses any three with no list, and
 * `background_templates.skill_proficiency_1/2` are the PRINTED WORDS as free
 * text, deliberately not `Skill` enum members (`db/schema/origins.ts`), so they
 * cannot be mapped here without inventing a translation this project chose not
 * to build. The character's skill set is therefore ONE FLAT SET the user
 * confirms, and the sheet states that a background's printed skills are text it
 * has not counted. Expertise is likewise absent — that feature's text is not in
 * `docs/srd/source/`.
 */
export const character_skill_proficiencies = sqliteTable(
  'character_skill_proficiencies',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterSkillProficiencyId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    skill: varchar<Skill>()('skill').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * The eighteen skills of `docs/srd/source/skills-table.txt`. Closed, not
     * open: `abilityForSkill` is an exhaustive map over exactly this
     * vocabulary, and a nineteenth value would have no ability to be checked
     * with — it would read as "no modifier at all" to any non-exhaustive
     * branch, which costs the character a bonus with no error anywhere.
     */
    check('character_skill_proficiencies_skill_check', oneOf('skill', skills)),
    uniqueIndex(
      'character_skill_proficiencies_character_id_skill_unique',
    ).on(table.character_id, table.skill),
  ],
);

/**
 * The manual Armor Class adjustment — D12's deliberate escape hatch.
 *
 * ONE SIGNED INTEGER PER CHARACTER, and it exists because two real features
 * cannot be computed here: Unarmored Defense (Barbarian, Monk) and every other
 * class feature offering an alternative calculation. Neither feature's text is
 * in `docs/srd/source/`, so `armorClass` refuses to guess, and without this
 * column a Barbarian's sheet would be wrong with no recourse at all.
 *
 * AT MOST ONE ROW, AND AN ABSENT ROW MEANS ZERO. Both readings are identical by
 * construction rather than by convention: the write command deletes the row when
 * the adjustment is set back to 0 with no note, so "nothing recorded" has ONE
 * representation and an imported pre-sheet payload produces literally no row.
 *
 * `armor_class_adjustment_note` IS NOT DECORATION. An unexplained `+3` on a
 * sheet is indistinguishable from a typo six months later. The note is where
 * "Unarmored Defense (Barbarian): +Con" is written down, and the sheet prints it
 * beside the number. It is nullable because a player may adjust without
 * explaining, which is D6b limb 1 — a half-decided state this schema treats as
 * first class rather than forcing into a modal.
 */
export const character_sheet_adjustments = sqliteTable(
  'character_sheet_adjustments',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterSheetAdjustmentId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    armor_class_adjustment: integer('armor_class_adjustment')
      .notNull()
      .default(0),
    armor_class_adjustment_note: varchar()('armor_class_adjustment_note'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * SIGNED, so this cannot use `integerAtLeast`: a negative adjustment is
     * legitimate (a cursed item, a house rule) and refusing it would invent a
     * rule the source does not state. The `typeof` limb is still needed for the
     * reason `columns.ts` measured — SQLite orders every TEXT value above every
     * number, so a lower bound alone rejects nothing — and the symmetric bound
     * comes from `src/domain/sheet-limits.ts` so the database, the write
     * boundary and the share boundary hold to ONE number rather than three that
     * can drift apart. That drift was the sub-bug inside Q8: a share cap below
     * a write cap makes a character the app will let you build and then refuse
     * to share.
     */
    check(
      'character_sheet_adjustments_armor_class_adjustment_check',
      sql`typeof(\`armor_class_adjustment\`) = 'integer' AND \`armor_class_adjustment\` BETWEEN ${sql.raw(
        String(-SHEET_ADJUSTMENT_BOUNDS.armorClassMagnitude),
      )} AND ${sql.raw(String(SHEET_ADJUSTMENT_BOUNDS.armorClassMagnitude))}`,
    ),
    /**
     * UNIQUE and not a plain index, and there is no second index beside it: the
     * unique index already serves every `WHERE character_id = ?` read, and the
     * uniqueness is the cardinality claim — at most one adjustment row per
     * character is what makes "absent means zero" a total reading rather than
     * a guess about which of several rows to believe.
     */
    uniqueIndex(
      'character_sheet_adjustments_character_id_unique',
    ).on(table.character_id),
  ],
);
