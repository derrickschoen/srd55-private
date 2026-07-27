import {
  check,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  ArmorTemplateId,
  ClassDefinitionId,
  ContentKey,
} from '../../src/domain/ids';
import type {
  Ability,
  ArmorCategory,
  ArmorDexBonus,
  MulticlassSkillPool,
  RulesEdition,
  Skill,
  WeaponProficiencyCategory,
} from '../../src/domain/enums';
import {
  abilities,
  armorCategories,
  armorDexBonuses,
  multiclassSkillPools,
  rulesEditions,
  skills,
  weaponProficiencyCategories,
} from '../../src/domain/enums';
import {
  datetime,
  integerAtLeast,
  nullOrIntegerAtLeast,
  oneOf,
  tinyint1,
  varchar,
} from './columns';
import { class_definitions } from './catalog-classes';

/**
 * THE DERIVABLE SHEET CORE (D11 part 1, D12).
 *
 * Eight NATIVE tables holding the per-class and armour content that a character
 * sheet's numbers are computed FROM. Every row is parsed out of a file in
 * `docs/srd/source/` by `src/rules/class-traits-srd.ts` or
 * `src/rules/armor-srd.ts`; nothing here is hand-transcribed and nothing here is
 * recalled.
 *
 * WHAT IS STORED HERE IS CONTENT, NOT A CHARACTER'S NUMBERS. Hit points, armor
 * class, saving throw and skill modifiers, initiative and passive Perception are
 * DERIVED at read time by `src/rules/sheet.ts` and are stored nowhere — D11's
 * rule, and the reason is that a stored copy becomes a second source of truth
 * that drifts from the first the moment an ability score changes.
 *
 * WHY THESE ARE NOT COLUMNS ON `class_progressions`. Every fact here except the
 * two progression tables at the end is LEVEL-INVARIANT: a Barbarian's hit die is
 * D12 at every level. `class_progressions` is keyed `(class_definition_id,
 * class_level)` and resolved `WHERE class_level <= ?`, so putting a hit die
 * there means twenty identical rows per class — 240 duplicated rows — and a
 * resolver that returns a stale one from a gappy seed. The level-invariant facts
 * are keyed by class alone.
 *
 * WHY THESE ARE NOT COLUMNS ON `class_definitions`. Two reasons, and the second
 * is the load-bearing one. First, three of the five are SETS (a class has two
 * saving throws, up to ten skill options, up to three armour categories) and a
 * set is rows, not a `saving_throw_1`/`saving_throw_2` sibling pair — that pair
 * is precisely the correlated-null smell D6 names, is order-dependent, and turns
 * "is this class proficient in Dexterity saves" into a two-column OR. Second,
 * `class_sheet_traits` being a SEPARATE 1:1 table means the ROW'S EXISTENCE is
 * the record that this class's Core Traits table was parsed at all. That buys a
 * null-free `hit_die INTEGER NOT NULL`: on `class_definitions` the column would
 * have to be nullable, and its null would stand for OUR TRANSCRIPTION STATE
 * rather than for anything in the domain — the migration-artifact nullability D6
 * forbids in a contract, and the same argument that split
 * `class_weapon_mastery_grants` from `class_weapon_mastery_counts`.
 *
 * THE TRAP THAT DESIGN CLOSES. "Armor Training: None" (Monk, Sorcerer, Wizard —
 * all three print the word) and "we never parsed this class" both render as ZERO
 * rows in `class_armor_training`. They are different facts and a sheet must not
 * confuse them. With a `class_sheet_traits` row present, zero armour rows means
 * None; with no traits row, it means unparsed. One table's existence
 * disambiguates all four of the set tables at once, so no `*_none` marker row
 * and no `is_sourced` flag is needed on any of them.
 */

/**
 * The pool member meaning "this class grants no skill on multiclass entry", and
 * the ones that do, DERIVED from the enum rather than restated.
 *
 * Splitting the vocabulary here rather than writing two literal lists into the
 * CHECK is what makes a new pool member widen the constraint on the next
 * `npm run db:schema` instead of quietly falling outside both limbs and being
 * refused by a constraint nobody remembered to update.
 */
const NO_MULTICLASS_SKILL_POOL = 'none' satisfies MulticlassSkillPool;
const GRANTING_MULTICLASS_SKILL_POOLS: readonly MulticlassSkillPool[] =
  multiclassSkillPools.filter((pool) => pool !== NO_MULTICLASS_SKILL_POOL);

/**
 * One row per class whose Core Traits table has been parsed.
 *
 * PRESENCE IS MEANINGFUL. A class with no row here is one this application holds
 * no sheet content for, and the sheet says so rather than showing zeroes. That
 * is F4's rule and the same answer `class_weapon_mastery_grants` gives with
 * `counts_unsourced`.
 *
 * NULL-FREE BY CONSTRUCTION: every class printed in
 * `docs/srd/source/class-core-traits.txt` has all three of these values, so
 * there is no absence to represent.
 */
export const class_sheet_traits = sqliteTable(
  'class_sheet_traits',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    /**
     * The die size, as an integer: `D12 per Barbarian level` becomes 12.
     *
     * Constrained to the four sizes that appear, not merely to "positive". A
     * D7 would be a mis-parse, and the whole point of a CHECK on catalog
     * content is that a mis-parse fails the seed instead of writing twelve
     * plausible-looking wrong rows.
     */
    hit_die: integer('hit_die').notNull(),
    /**
     * `Choose 2:` / `Choose 3:` / `Choose 4:` — how many skills the class
     * grants at level 1.
     */
    skill_choice_count: integer('skill_choice_count').notNull(),
    /**
     * The Bard, and the reason this column exists: `Choose any 3 skills`, with
     * NO list. Without this flag the Bard is either unrepresentable or gets a
     * fabricated ten-skill list, and `class_skill_options` holding zero Bard
     * rows would otherwise be indistinguishable from a mis-parse.
     */
    skill_choice_from_any: tinyint1('skill_choice_from_any')
      .notNull()
      .default(false),
    /**
     * THE MULTICLASS ENTRY SKILL GRANT — how many skills this class grants to a
     * character who ENTERS it as a second or later class, and from where.
     *
     * TWO SCALARS AND NOT A FLAG ON `class_skill_options`, and the Bard is the
     * whole reason. Armour training and weapon proficiency use a per-row flag
     * because in both cases the entry grant is a SUBSET of the initial grant,
     * and a boolean per row expresses a subset exactly. The Bard's entry grant
     * — "proficiency in one skill of your choice"
     * (`docs/srd/source/multiclass-entry-grants.txt:37-38`) — is not a subset of
     * the Bard's own options rows, because the Bard HAS none: its Core Traits
     * table prints "Choose any 3 skills" with no list. A flag over zero rows
     * cannot say "any of the eighteen".
     *
     * THREE OF TWELVE CLASSES GRANT ONE. Bard (any), Ranger (its own list,
     * L116-117) and Rogue (its own list, L128-129). Every other class's clause
     * names no skill at all, so both columns default to the `none`/0 pair.
     *
     * `multiclass_skill_choice_pool` IS WHAT MAKES BARD AND RANGER DIFFERENT
     * ROWS rather than the same row with a lie in it. Both grant exactly one
     * skill; they differ only in what they may pick it from, and the count
     * alone cannot record that difference.
     */
    multiclass_skill_choice_count: integer('multiclass_skill_choice_count')
      .notNull()
      .default(0),
    multiclass_skill_choice_pool: varchar<MulticlassSkillPool>()(
      'multiclass_skill_choice_pool',
    )
      .notNull()
      .default('none'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * `hit_die IN (6, 8, 10, 12)` is written out rather than built from an enum
     * because the values are integers and `oneOf` quotes its members — a
     * `hit_die IN ('6', …)` would be a CHECK that parses and, given SQLite's
     * type ordering, means something subtly different.
     *
     * The `typeof` limb is the D13 finding: a bare `IN` list over integers does
     * reject text, but `skill_choice_count >= 1` alone would not, since every
     * TEXT value compares greater than every number in SQLite.
     */
    check(
      'class_sheet_traits_check',
      sql`typeof(\`hit_die\`) = 'integer' AND \`hit_die\` IN (6, 8, 10, 12) AND ${integerAtLeast(
        'skill_choice_count',
        1,
      )}`,
    ),
    /**
     * THE PAIR IS TIED IN BOTH DIRECTIONS, so neither half can be written
     * without the other and the incoherent combinations are UNSTORABLE rather
     * than merely unwritten:
     *
     *  - `none` forces a count of exactly 0 — a class that grants no entry skill
     *    cannot also owe the character one;
     *  - `class_list` and `any` force a count of at least 1 — a pool with
     *    nothing to draw is the same fact as `none` said twice, and two ways to
     *    spell one fact is what makes a completeness check ambiguous.
     *
     * The `typeof` limb is the D13 finding again: without it the text `'2'`
     * satisfies `>= 1`, because every TEXT value compares greater than every
     * number in SQLite.
     *
     * WHAT THIS CANNOT ENFORCE, stated rather than implied: that a
     * `class_list` class actually HAS `class_skill_options` rows. SQLite has no
     * cross-table CHECK. `seedClassSheetContent` refuses the parse instead, and
     * `tests/unit/rules/multiclass-entry-srd.test.ts` pins it.
     */
    check(
      'class_sheet_traits_multiclass_skill_choice_check',
      sql`typeof(\`multiclass_skill_choice_count\`) = 'integer' AND ((${oneOf(
        'multiclass_skill_choice_pool',
        [NO_MULTICLASS_SKILL_POOL],
      )} AND \`multiclass_skill_choice_count\` = 0) OR (${oneOf(
        'multiclass_skill_choice_pool',
        GRANTING_MULTICLASS_SKILL_POOLS,
      )} AND \`multiclass_skill_choice_count\` >= 1))`,
    ),
    uniqueIndex('class_sheet_traits_class_definition_id_unique').on(
      table.class_definition_id,
    ),
  ],
);

/**
 * The two saving throws a class grants, one row each.
 *
 * A SET, DELIBERATELY, NOT A PAIR OF COLUMNS. N happens to be exactly 2 in all
 * twelve rows the source prints, which is an argument for
 * `saving_throw_1`/`saving_throw_2` right up until it is not: the shape of the
 * fact is a set, the pair is order-dependent for something with no order, and
 * membership is a join rather than an OR over two columns.
 *
 * MULTICLASS NOTE, because it is the thing a reader will want and it is NOT
 * expressed here: a multiclass character gets saving throw proficiencies from
 * the FIRST class only. `docs/srd/source/multiclassing.txt` says a character
 * gains "only some of the new class's starting proficiencies, as detailed in
 * each class's description", and no class's "As a Multiclass Character" bullet
 * in `class-core-traits.txt` lists saving throws. That rule lives in
 * `src/rules/sheet.ts`, not in the schema, because it is about a CHARACTER's
 * class list rather than about a class.
 */
export const class_saving_throw_proficiencies = sqliteTable(
  'class_saving_throw_proficiencies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    ability: varchar<Ability>()('ability').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * An unrecognised ability reads as "not proficient" to every lookup that is
     * not an exhaustive switch, which silently costs the character their
     * proficiency bonus on a save. Same failure shape as
     * `class_weapon_mastery_grants.grant`, same answer.
     */
    check(
      'class_saving_throw_proficiencies_ability_check',
      oneOf('ability', abilities),
    ),
    uniqueIndex(
      'class_saving_throw_proficiencies_class_definition_id_ability_unique',
    ).on(table.class_definition_id, table.ability),
  ],
);

/**
 * The skills a class offers to CHOOSE FROM — not the ones a character has.
 *
 * `class_sheet_traits.skill_choice_count` says how many of these a character
 * picks. A character's actual picks are not modelled by this change; see the
 * module note in `src/rules/sheet.ts` about what is derived from inputs versus
 * what is persisted.
 *
 * ZERO ROWS IS MEANINGFUL AND ONLY FOR THE BARD, whose table prints "Choose any
 * 3 skills" with no list at all. `skill_choice_from_any` is what says so; zero
 * rows without that flag set is a mis-parse and the seeder refuses it.
 */
export const class_skill_options = sqliteTable(
  'class_skill_options',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    skill: varchar<Skill>()('skill').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check('class_skill_options_skill_check', oneOf('skill', skills)),
    uniqueIndex(
      'class_skill_options_class_definition_id_skill_unique',
    ).on(table.class_definition_id, table.skill),
  ],
);

/**
 * Which armour categories a class is trained in.
 *
 * `shield` is one of them, exactly as it is a category of the source's own Armor
 * table — the Core Traits tables say "Light and Medium armor and Shields" as one
 * training statement, so splitting Shields into a separate boolean would be
 * modelling one sourced fact in two shapes.
 *
 * ZERO ROWS means "Armor Training: None", which the Monk, Sorcerer and Wizard
 * tables print in those words — PROVIDED a `class_sheet_traits` row exists. See
 * the module note; that is the whole reason the traits table is separate.
 */
export const class_armor_training = sqliteTable(
  'class_armor_training',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    category: varchar<ArmorCategory>()('category').notNull(),
    /**
     * Does a character who ENTERS this class by multiclassing get this row?
     *
     * A FLAG ON THE EXISTING ROW, NOT A PARALLEL TABLE, AND THE INVARIANT IS
     * WHY. `docs/srd/source/multiclass-entry-grants.txt` grants on entry a
     * SUBSET of what the Core Traits table grants a character who started in
     * the class, and a boolean per row is exactly what a subset is. A second
     * table could hold a category the class does not train in at all — the
     * Barbarian entering with Heavy armour — and nothing would refuse it. Here
     * that row simply does not exist to be flagged.
     *
     * BARBARIAN IS THE ROW THAT PROVES THE SUBSET IS NOT "DROP THE TOP TIER":
     * its Core Traits row is Light, Medium and Shields, and its entry clause
     * (L24-25) grants Shields ALONE. Shields is therefore flagged and Light and
     * Medium are not, which a hierarchy of tiers could not express.
     *
     * SIX CLASSES FLAG EVERY ROW THEY HAVE, so the subset is not a PROPER
     * subset: Bard, Cleric, Druid, Ranger, Rogue and Warlock grant on entry
     * exactly the armour training their Core Traits table grants. That is a
     * fact about the source, not a defect in this model.
     */
    granted_on_multiclass_entry: tinyint1('granted_on_multiclass_entry')
      .notNull()
      .default(false),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'class_armor_training_category_check',
      oneOf('category', armorCategories),
    ),
    uniqueIndex(
      'class_armor_training_class_definition_id_category_unique',
    ).on(table.class_definition_id, table.category),
  ],
);

/**
 * Weapon proficiency, WITH the qualifier that two classes need.
 *
 * A bare `simple | martial` set is a lie about two of twelve classes: the Monk
 * has "Simple weapons and Martial weapons that have the Light property" and the
 * Rogue "…that have the Finesse or Light property". Recording those as plain
 * `martial` would tell a character they are proficient with a Greataxe.
 *
 * `property_qualifier` is the same shape as `character_weapons.other_properties`
 * — the free-text limb the weapons track landed for the Lance's "Two-Handed
 * (unless mounted)". It is DISPLAYED, not interpreted: this application does not
 * evaluate "Finesse or Light" against a weapon, and saying so is better than a
 * parser that pretends to.
 */
export const class_weapon_proficiencies = sqliteTable(
  'class_weapon_proficiencies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    category: varchar<WeaponProficiencyCategory>()('category').notNull(),
    /**
     * NULL for ten of twelve classes, and the null is D6b limb 2 — the SRD
     * genuinely prints no qualification on "Simple and Martial weapons". An
     * empty string here would be a null wearing a costume, and a `qualified`
     * boolean beside it would admit the impossible row
     * `qualified = 1, qualifier = NULL`.
     */
    property_qualifier: varchar()('property_qualifier'),
    /**
     * Does a character who ENTERS this class by multiclassing get this row?
     *
     * The companion of `class_armor_training.granted_on_multiclass_entry`, and
     * the flag carries the qualifier with it for free — which is the second
     * reason a parallel entry-grants table was rejected. A copy of the Monk's
     * "Light" or the Rogue's "Finesse or Light" living in two tables is two
     * strings free to drift, with nothing keeping them in step.
     *
     * FOUR CLASSES SET IT, ALL FOR `martial` AND NEVER FOR `simple`. Barbarian
     * (L24-25), Fighter (L77-79), Paladin (L102-103) and Ranger (L115-116) each
     * grant "proficiency with Martial weapons" on entry; the word "Simple" does
     * not occur anywhere in the entry extract. A reader who assumed Martial
     * implies Simple would over-grant all four — the Barbarian's `simple` row
     * exists in this table and is deliberately left unflagged.
     *
     * NOTE that neither of the two qualified rows is ever flagged: the Monk's
     * entry clause grants no weapons at all (L88-89) and the Rogue's grants
     * none either (L126-131). So no entry grant in the SRD carries a qualifier
     * today. The column still travels with the flag, because the model must
     * hold an imported class whose entry grant does.
     */
    granted_on_multiclass_entry: tinyint1('granted_on_multiclass_entry')
      .notNull()
      .default(false),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'class_weapon_proficiencies_category_check',
      oneOf('category', weaponProficiencyCategories),
    ),
    uniqueIndex(
      'class_weapon_proficiencies_class_definition_id_category_unique',
    ).on(table.class_definition_id, table.category),
  ],
);

/**
 * How many attacks the Attack action grants, per class per level.
 *
 * ABSOLUTE TOTALS, NOT INCREMENTS — 2, 3 and 4, resolved
 * `WHERE class_level <= ? ORDER BY class_level DESC LIMIT 1`, exactly as
 * `class_weapon_mastery_counts` is. A partially-seeded table then degrades to a
 * stale-but-real number rather than to a wrong one, and no running sum can
 * double-count.
 *
 * THE TOTALS ARE SOURCED, NOT INFERRED FROM THE FEATURE NAMES.
 * `docs/srd/source/attack-class-features.txt` carries the Fighter's own words:
 * Extra Attack is "attack twice instead of once", Two Extra Attacks is "attack
 * three times", Three Extra Attacks is "attack four times". Deriving 3 from the
 * words "Two Extra Attacks" would have been arithmetic on a feature's NAME.
 *
 * MULTICLASS: THESE DO NOT SUM. `docs/srd/source/multiclassing.txt` — "If you
 * gain the Extra Attack feature from more than one class, the features don't
 * stack. You can't make more than two attacks with this feature unless you have
 * a feature that says you can." So a Fighter 5 / Ranger 5 has TWO attacks, not
 * three, and the combinator in `src/rules/sheet.ts` is `max`, not `sum`.
 */
export const class_extra_attack_grants = sqliteTable(
  'class_extra_attack_grants',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    class_level: integer('class_level').notNull(),
    /** Total attacks on the Attack action at this level, not extra attacks. */
    attack_count: integer('attack_count').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * `attack_count >= 2`: a row here EXISTS because a class granted Extra
     * Attack, and the smallest thing that feature can mean is two attacks. A
     * row saying 1 would be a parse that found the wrong line.
     *
     * The level limb is a plain `BETWEEN`, matching
     * `class_weapon_mastery_counts`: `BETWEEN` already rejects text on its
     * upper limb where a bare `>=` does not.
     */
    check(
      'class_extra_attack_grants_check',
      sql`class_level BETWEEN 1 AND 20 AND ${integerAtLeast('attack_count', 2)}`,
    ),
    uniqueIndex(
      'class_extra_attack_grants_class_definition_id_class_level_unique',
    ).on(table.class_definition_id, table.class_level),
  ],
);

/**
 * The Monk's Martial Arts die, per level.
 *
 * Stored as the die SIZE, so `1d8` is 8 — the `d` is a constant of the column,
 * and an integer is what a comparison and a CHECK can actually hold.
 *
 * One row per level 1..20, parsed from the Martial Arts column of the Monk
 * Features table. A short or gappy parse throws in the seeder rather than
 * leaving a level silently unresolved.
 */
export const class_martial_arts_dice = sqliteTable(
  'class_martial_arts_dice',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    class_level: integer('class_level').notNull(),
    martial_arts_die: integer('martial_arts_die').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'class_martial_arts_dice_check',
      sql`class_level BETWEEN 1 AND 20 AND typeof(\`martial_arts_die\`) = 'integer' AND \`martial_arts_die\` IN (4, 6, 8, 10, 12)`,
    ),
    uniqueIndex(
      'class_martial_arts_dice_class_definition_id_class_level_unique',
    ).on(table.class_definition_id, table.class_level),
  ],
);

/**
 * The SRD armour catalog: thirteen rows — TWELVE ARMOURS PLUS SHIELD.
 *
 * (Three Light, five Medium, four Heavy, one Shield. `docs/srd/SOURCE.md` said
 * "13 armours plus Shield" until this change; it was off by one, and the row
 * count is asserted in the test so the wrong number cannot come back.)
 *
 * D1b, THE SAME MECHANISM AS `weapon_templates`. These PRE-FILL editable fields.
 * A character stores the resulting VALUES and never a reference to a template
 * row, so there is no upgrade-in-place problem and no live link to maintain.
 *
 * NOT MODELLED: weight and cost. They are encumbrance and economy and this
 * application has no inventory — the identical call `weapon_templates` made,
 * for the identical reason.
 */
export const armor_templates = sqliteTable(
  'armor_templates',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<ArmorTemplateId>(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition')
      .notNull()
      .default('2024'),
    name: varchar()('name').notNull(),
    category: varchar<ArmorCategory>()('category').notNull(),
    /**
     * MEANING DEPENDS ON `category`, AND THAT IS DELIBERATE. For `light`,
     * `medium` and `heavy` this is the BASE Armor Class the table prints. For
     * `shield` it is the BONUS the table prints as `+2`.
     *
     * The alternative — a separate `shield_bonus` column, or an
     * `armor_class_role` discriminator — was rejected because the role is
     * already fully determined by `category`, so a second column carrying it
     * could disagree with the first and there would be no way to tell which was
     * right.
     *
     * THAT REJECTION IS ONLY HONEST IF CONSUMERS ACTUALLY DISPATCH, so they do:
     * `armorClassFrom` in `src/rules/sheet.ts` switches on `category` with no
     * `default` arm, which makes a new category a compile error rather than a
     * silent miscalculation, and `SheetArmor` carries `category` as a REQUIRED
     * field so a Shield cannot be passed where body armour is expected without
     * the dispatch noticing.
     */
    armor_class: integer('armor_class').notNull(),
    dex_bonus: varchar<ArmorDexBonus>()('dex_bonus').notNull(),
    /**
     * Only meaningful, and only non-NULL, when `dex_bonus = 'capped'` — tied to
     * it by a CHECK below, so the pair cannot disagree. The null is D6b limb 2:
     * Light armour prints `+ Dex modifier` with no cap and Heavy armour prints
     * no Dex term at all, so for ten of thirteen rows there IS no cap value in
     * the source to hold. Storing 0 for the Heavy rows would be actively wrong
     * (see `armorDexBonuses`).
     */
    dex_bonus_max: integer('dex_bonus_max'),
    /**
     * The `Str 13` / `Str 15` column. NULL where the table prints an em-dash,
     * which is ten of thirteen rows — the source's own "no requirement", D6b
     * limb 2 again.
     *
     * NOT ENFORCED ANYWHERE. The SRD's consequence is a speed reduction, and
     * this application does not model speed. It is carried so the sheet can
     * WARN, which is what D12 said a manual AC field could never do.
     */
    strength_requirement: integer('strength_requirement'),
    stealth_disadvantage: tinyint1('stealth_disadvantage')
      .notNull()
      .default(false),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check('armor_templates_category_check', oneOf('category', armorCategories)),
    check(
      'armor_templates_dex_bonus_check',
      oneOf('dex_bonus', armorDexBonuses),
    ),
    /**
     * THE PAIR CONSTRAINT, and the one genuinely load-bearing CHECK in this
     * table. `dex_bonus = 'capped'` and `dex_bonus_max IS NOT NULL` must agree
     * in BOTH directions, so neither a capped row without its cap nor an
     * uncapped row carrying a stray cap can exist. Without it the nullable
     * column would be a correlated-null pair of exactly the kind D6 treats as a
     * smell; with it, it is a discriminated union the database enforces.
     */
    check(
      'armor_templates_dex_bonus_max_check',
      sql`(\`dex_bonus\` = 'capped') = (\`dex_bonus_max\` IS NOT NULL) AND (${nullOrIntegerAtLeast(
        'dex_bonus_max',
        0,
      )})`,
    ),
    /**
     * A Shield contributes a bonus and never a Dexterity term; the source's
     * Shield row prints an em-dash in both the Strength and Stealth columns and
     * `+2` for AC. Pinning it here means a mis-parse that files the Shield as
     * base AC 2 fails the seed rather than quietly halving somebody's armour.
     */
    check(
      'armor_templates_shield_check',
      sql`\`category\` <> 'shield' OR \`dex_bonus\` = 'none'`,
    ),
    check(
      'armor_templates_armor_class_check',
      integerAtLeast('armor_class', 1),
    ),
    check(
      'armor_templates_strength_requirement_check',
      nullOrIntegerAtLeast('strength_requirement', 1),
    ),
    /**
     * Safe here for the reason `weapon_templates` gives: this table is NATIVE,
     * its only writer is the SRD seeder binding the `'2024'` constant, and no
     * import path can reach it.
     */
    check(
      'armor_templates_rules_edition_check',
      oneOf('rules_edition', rulesEditions),
    ),
    uniqueIndex('armor_templates_content_key_unique').on(table.content_key),
  ],
);
