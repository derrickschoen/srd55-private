import {
  check,
  index,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  ClassFeatureEffectId,
  ClassDefinitionId,
  ContentKey,
  NamedFeatureEffectId,
  NamedFeatureId,
  SubclassDefinitionId,
  SubclassFeatureEffectId,
  SubclassFeatureId,
} from '../../src/domain/ids';
import type {
  Ability,
  FeatureTemplateEffectKind,
  ExtraAttackWeaponScope,
  KnownDamageType,
  ProgressionType,
  RulesEdition,
} from '../../src/domain/enums';
import {
  abilities,
  damageTypes,
  extraAttackWeaponScopes,
  featureTemplateEffectKinds,
  progressionTypes,
} from '../../src/domain/enums';
import {
  datetime,
  integerAtLeast,
  nullOrIntegerAtLeast,
  nullOrOneOf,
  oneOf,
  sqlText,
  tinyint1,
  varchar,
} from './columns';
import { catalog_content_identities } from './catalog-content';

function featureEffectColumns() {
  return {
    effect_kind:
      varchar<FeatureTemplateEffectKind>()('effect_kind').notNull(),
    damage_type: varchar<KnownDamageType>()('damage_type'),
    hit_points_flat: integer('hit_points_flat'),
    hit_points_per_level: integer('hit_points_per_level'),
    speed_bonus_feet: integer('speed_bonus_feet'),
    ability: varchar<Ability>()('ability'),
    amount: integer('amount'),
    maximum: integer('maximum'),
    base: integer('base'),
    ability_1: varchar<Ability>()('ability_1'),
    ability_2: varchar<Ability>()('ability_2'),
    allows_shield: tinyint1('allows_shield'),
    weapon_scope:
      varchar<ExtraAttackWeaponScope>()('weapon_scope'),
    attack_count: integer('attack_count'),
  };
}

function featureEffectChecks(prefix: string) {
  return [
    check(`${prefix}_kind_check`, oneOf('effect_kind', featureTemplateEffectKinds)),
    check(`${prefix}_damage_type_check`, nullOrOneOf('damage_type', damageTypes)),
    check(
      `${prefix}_damage_type_kind_check`,
      sql`damage_type IS NULL OR effect_kind IS 'damage_resistance'`,
    ),
    check(
      `${prefix}_hit_points_kind_check`,
      sql`(hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'`,
    ),
    check(
      `${prefix}_speed_kind_check`,
      sql`speed_bonus_feet IS NULL OR effect_kind IS 'speed'`,
    ),
    check(
      `${prefix}_ability_kind_check`,
      sql`ability IS NULL OR effect_kind IN ('ability_increase', 'attack_ability_override')`,
    ),
    check(
      `${prefix}_amount_kind_check`,
      sql`amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')`,
    ),
    check(
      `${prefix}_maximum_kind_check`,
      sql`maximum IS NULL OR effect_kind IS 'ability_increase'`,
    ),
    check(
      `${prefix}_base_kind_check`,
      sql`base IS NULL OR effect_kind IS 'armor_class_formula'`,
    ),
    check(
      `${prefix}_ability_1_kind_check`,
      sql`ability_1 IS NULL OR effect_kind IS 'armor_class_formula'`,
    ),
    check(
      `${prefix}_ability_2_kind_check`,
      sql`ability_2 IS NULL OR effect_kind IS 'armor_class_formula'`,
    ),
    check(
      `${prefix}_allows_shield_kind_check`,
      sql`allows_shield IS NULL OR effect_kind IS 'armor_class_formula'`,
    ),
    check(
      `${prefix}_weapon_scope_kind_check`,
      sql`weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')`,
    ),
    check(
      `${prefix}_attack_count_kind_check`,
      sql`attack_count IS NULL OR effect_kind IS 'extra_attack'`,
    ),
    check(
      `${prefix}_hp_modifier_payload_check`,
      sql`effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL`,
    ),
    check(
      `${prefix}_speed_payload_check`,
      sql`effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL`,
    ),
    check(
      `${prefix}_ability_increase_payload_check`,
      sql`effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)`,
    ),
    check(
      `${prefix}_armor_class_bonus_payload_check`,
      sql`effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL`,
    ),
    check(
      `${prefix}_armor_class_formula_payload_check`,
      sql`effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)`,
    ),
    check(
      `${prefix}_attack_ability_override_payload_check`,
      sql`effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)`,
    ),
    check(
      `${prefix}_weapon_attack_bonus_payload_check`,
      sql`effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)`,
    ),
    check(
      `${prefix}_weapon_damage_bonus_payload_check`,
      sql`effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)`,
    ),
    check(
      `${prefix}_extra_attack_payload_check`,
      sql`effect_kind IS NOT 'extra_attack' OR (attack_count IS NOT NULL AND weapon_scope IS NOT NULL)`,
    ),
    check(`${prefix}_ability_check`, nullOrOneOf('ability', abilities)),
    check(
      `${prefix}_amount_check`,
      sql`amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)`,
    ),
    check(
      `${prefix}_maximum_check`,
      sql`maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)`,
    ),
    check(`${prefix}_base_check`, nullOrIntegerAtLeast('base', 1)),
    check(`${prefix}_ability_1_check`, nullOrOneOf('ability_1', abilities)),
    check(`${prefix}_ability_2_check`, nullOrOneOf('ability_2', abilities)),
    check(
      `${prefix}_weapon_scope_check`,
      nullOrOneOf('weapon_scope', extraAttackWeaponScopes),
    ),
    check(
      `${prefix}_attack_count_check`,
      nullOrIntegerAtLeast('attack_count', 2),
    ),
  ];
}

/**
 * CLASSES AND SUBCLASSES.
 *
 * `subclass_definitions` carries a redundant unique index on
 * `(id, class_definition_id)`. That is not decoration: it is the target of the
 * composite foreign key from `character_class_levels`, which exists so a
 * character cannot be given a subclass belonging to a different class.
 *
 * NOT MODELLED: whether `progression_type = 'none'` implies the four caster
 * columns are all null (or the converse). That correlation is unproven in both
 * directions, and asserting an unproven correlation is exactly the correctness
 * bug this work exists to avoid. They stay independently nullable.
 */

export const class_definitions = sqliteTable(
  'class_definitions',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<ClassDefinitionId>(),
    content_key: varchar<ContentKey>()('content_key')
      .notNull()
      .references(() => catalog_content_identities.content_key),
    name: varchar()('name').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition').notNull(),
    spellcasting_ability: varchar<Ability>()('spellcasting_ability'),
    progression_type: varchar<ProgressionType>()('progression_type')
      .notNull()
      .default('none'),
    caster_fraction: varchar()('caster_fraction'),
    caster_rounding: varchar()('caster_rounding'),
    prepares_or_knows: varchar()('prepares_or_knows'),
    supports_ritual_casting: tinyint1('supports_ritual_casting')
      .notNull()
      .default(false),
    ritual_casting_mode: varchar()('ritual_casting_mode'),
    primary_ability_expression: sqlText()('primary_ability_expression'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * The caster fraction, the multiclass slot table and every "is this class a
     * caster" branch resolve off `progression_type`. A value outside the closed
     * set falls through every one of them, producing a slot table that is
     * quietly wrong rather than absent. The sole writer
     * (`seedClassDefinition` in `src/rules/class-progression-lookup.ts`) binds
     * `ClassSeed.type`, which is typed `ProgressionType`.
     */
    check(
      'class_definitions_progression_type_check',
      oneOf('progression_type', progressionTypes),
    ),
    /**
     * Nullable, and the null is the sourced fact rather than a gap: a
     * non-casting class HAS no spellcasting ability. What is refused is a
     * non-member, which would compute a save DC off a column that does not
     * exist.
     *
     * NOT CONSTRAINED HERE: `rules_edition`. See the note on
     * `spell_versions.rules_edition`; the same argument applies to any catalog
     * table a future import can reach.
     */
    check(
      'class_definitions_spellcasting_ability_check',
      nullOrOneOf('spellcasting_ability', abilities),
    ),
    uniqueIndex('class_definitions_content_key_unique').on(table.content_key),
    index('class_definitions_name_rules_edition_index').on(
      table.name,
      table.rules_edition,
    ),
  ],
);

export const class_progressions = sqliteTable(
  'class_progressions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    class_level: integer('class_level').notNull(),
    cantrips_known: integer('cantrips_known')
      .notNull()
      .default(0),
    prepared_count: integer('prepared_count')
      .notNull()
      .default(0),
    slots: sqlText()('slots'),
    pact_slots: sqlText()('pact_slots'),
    grant_rules: sqlText()('grant_rules'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * A progression row is looked up by `WHERE class_level <= ?`, so a row at
     * level 0 or 21 is a row that either always matches or never does. The
     * seeder walks exactly 1..20.
     */
    check(
      'class_progressions_class_level_check',
      sql`class_level BETWEEN 1 AND 20`,
    ),
    uniqueIndex('class_progressions_class_definition_id_class_level_unique').on(
      table.class_definition_id,
      table.class_level,
    ),
  ],
);

export const subclass_definitions = sqliteTable(
  'subclass_definitions',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SubclassDefinitionId>(),
    content_key: varchar<ContentKey>()('content_key')
      .notNull()
      .references(() => catalog_content_identities.content_key),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    name: varchar()('name').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition').notNull(),
    spellcasting_ability: varchar<Ability>()('spellcasting_ability'),
    caster_fraction: varchar()('caster_fraction'),
    caster_rounding: varchar()('caster_rounding'),
    grant_rules: sqlText()('grant_rules'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('subclass_definitions_content_key_unique').on(
      table.content_key,
    ),
    index(
      'subclass_definitions_class_definition_id_name_rules_edition_index',
    ).on(table.class_definition_id, table.name, table.rules_edition),
    // The composite-FK companion: without this unique key the composite
    // reference from character_class_levels cannot be declared at all.
    uniqueIndex('subclass_definitions_id_class_definition_id_unique').on(
      table.id,
      table.class_definition_id,
    ),
  ],
);

export const subclass_progressions = sqliteTable(
  'subclass_progressions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    subclass_definition_id: integer('subclass_definition_id')
      .notNull()
      .$type<SubclassDefinitionId>()
      .references(() => subclass_definitions.id, { onDelete: 'cascade' }),
    class_level: integer('class_level').notNull(),
    cantrips_known: integer('cantrips_known')
      .notNull()
      .default(0),
    prepared_count: integer('prepared_count')
      .notNull()
      .default(0),
    max_spell_level: integer('max_spell_level')
      .notNull()
      .default(0),
    slots: sqlText()('slots'),
    grant_rules: sqlText()('grant_rules'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'subclass_progressions_class_level_check',
      sql`class_level BETWEEN 1 AND 20`,
    ),
    /**
     * `max_spell_level` becomes the `level_max` of a minted slot, so it is
     * bounded by the same 0..9 the slot's own window is. Zero is legitimate and
     * is the seeded value below the level a subclass gets spells at.
     */
    check(
      'subclass_progressions_max_spell_level_check',
      sql`max_spell_level BETWEEN 0 AND 9`,
    ),
    uniqueIndex(
      'subclass_progressions_subclass_definition_id_class_level_unique',
    ).on(table.subclass_definition_id, table.class_level),
  ],
);

/* ==========================================================================
 * CLASS FEATURES THAT ARE NOT CLASS TABLE ROWS (D19)
 *
 * `subclass_definitions` and `subclass_progressions` are EXCLUSIVELY about
 * spellcasting: between them they carry a spellcasting ability, a caster
 * fraction and rounding, cantrips known, a prepared count, a maximum spell
 * level and a slot table. Neither holds a feature, a level-gated benefit or one
 * line of printed text. That is why D19's owner case — "some subclasses add
 * Extra Attack at level 6" — has nowhere to live, and it is what the two tables
 * below add.
 *
 * BOTH TABLES ARE THE SAME SHAPE, AND IT IS D12'S: a NAME, a printed
 * DESCRIPTION that is always present, and a NULLABLE `effect_kind` from a set
 * closed in SQLite here and in TypeScript by an exhaustive switch. Most
 * features move no number. `species_template_traits` established the shape and
 * measured the proportion — 26 of its 33 rows carry no kind — and there is no
 * reason for a class feature to be modelled differently from a species trait
 * when both are "printed text, occasionally mechanical".
 *
 * WHAT IS NOT COPIED FROM D12, AND WHY, TWICE OVER:
 *
 *  1. A CLASS LEVEL. A species trait has no level; the whole of D19's request
 *     is "at level 6". Both tables therefore carry `class_level`, and it is the
 *     level IN THE GRANTING CLASS, never the total character level — the same
 *     distinction `class_extra_attack_grants` and `class_martial_arts_dice`
 *     already store and `src/rules/sheet.ts` already resolves. A Bard 5 /
 *     Fighter 1 is character level 6 and does NOT have a Bard level 6 feature.
 *  2. NO CHARACTER-SIDE COPY. `species_template_traits` has a D1b twin in
 *     `character_species_traits` because choosing a species COPIES it and
 *     severs the catalog link. A subclass is different in kind: it is a LIVE
 *     catalog reference — `character_class_levels.subclass_definition_id`, with
 *     a composite foreign key that stops a character holding a subclass of
 *     another class — and `subclass_definitions.grant_rules` already mints
 *     spell slots through that reference. Copying features onto the character
 *     would create a second source of truth for a subclass that is still
 *     joined, and the copy could not honour the composite key.
 * ========================================================================== */

/**
 * One printed feature of one subclass: free text, and occasionally a number.
 *
 * SHIPS EMPTY, DELIBERATELY. SRD 5.2 carries one subclass per class and not one
 * of them grants Extra Attack, so there is no bundled row here and
 * `src/rules/sheet-srd.ts` writes none. D3 and D19 §1 both say so: the MODEL is
 * the deliverable and the CONTENT is not free-licensed. The table is exercised
 * by an original homebrew fixture in `tests/fixtures/homebrew-subclass.ts`,
 * which is a test fixture and is never seeded.
 *
 * THIS TABLE IS ALSO WHERE THE SEEDER CANNOT REACH, AND THAT IS THE POINT.
 * `seedClassSheetContent` clears `class_extra_attack_grants` with
 * `DELETE … WHERE class_definition_id = ?` before every reseed, and
 * `ensureBundledSheetContent` runs at every boot. A homebrew subclass grant
 * parked on the SRD Bard's class id would be destroyed with no trace on the
 * first database the health guard judged unhealthy. Rows here are keyed on a
 * SUBCLASS, which no seeder deletes by.
 */
export const subclass_features = sqliteTable(
  'subclass_features',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SubclassFeatureId>(),
    subclass_definition_id: integer('subclass_definition_id')
      .notNull()
      .$type<SubclassDefinitionId>()
      .references(() => subclass_definitions.id, { onDelete: 'cascade' }),
    /**
     * The level IN THE SUBCLASS'S OWN CLASS at which the feature is gained.
     *
     * NOT NULL, and the alternative was considered rather than dismissed: a
     * feature with no level would be one gained on taking the subclass, which
     * is level 3 for every 2024 subclass and is a value, not an absence. D6b
     * limb 1 fails — no character can be built or imported with a subclass
     * feature whose level is undecided, because nobody decides it; the content
     * states it.
     */
    class_level: integer('class_level').notNull(),
    /**
     * Printed order within the subclass, load-bearing for the same reason
     * `species_template_traits.sort_order` is: features are printed in a fixed
     * order and a sheet that reshuffles them reads as different content.
     */
    sort_order: integer('sort_order').notNull(),
    name: varchar()('name').notNull(),
    /** NOT NULL: every printed feature has text, and an empty one is a parse bug. */
    description: sqlText()('description').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check('subclass_features_class_level_check', sql`class_level BETWEEN 1 AND 20`),
    check(
      'subclass_features_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    uniqueIndex('subclass_features_subclass_sort_unique').on(
      table.subclass_definition_id,
      table.sort_order,
    ),
    uniqueIndex('subclass_features_subclass_name_unique').on(
      table.subclass_definition_id,
      table.name,
    ),
  ],
);

/** Mechanical effects are rows, so one printed feature may grant many. */
export const subclass_feature_effects = sqliteTable(
  'subclass_feature_effects',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SubclassFeatureEffectId>(),
    subclass_feature_id: integer('subclass_feature_id')
      .notNull()
      .$type<SubclassFeatureId>()
      .references(() => subclass_features.id, { onDelete: 'cascade' }),
    sort_order: integer('sort_order').notNull(),
    ...featureEffectColumns(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    ...featureEffectChecks('subclass_feature_effects'),
    check(
      'subclass_feature_effects_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    uniqueIndex('subclass_feature_effects_feature_sort_unique').on(
      table.subclass_feature_id,
      table.sort_order,
    ),
  ],
);

/**
 * A NAMED, OPTIONAL FEATURE OF A CLASS THAT IS NEITHER A CLASS TABLE ROW NOR A
 * SUBCLASS — D19 case 2, and the one SRD 5.2 actually lets us bundle.
 *
 * Two rows are seeded from `docs/srd/source/extra-attack-other-sources.txt`.
 * They are the proof the model works on shippable content rather than only on a
 * fixture, and each one breaks the old model in a different place: the first
 * because its source is an invocation and not a class table, the second because
 * it UPGRADES the first rather than adding to it.
 *
 * WHAT THIS APPLICATION DOES NOT KNOW ABOUT THESE ROWS, AND STATES:
 *
 *  1. WHETHER THE CHARACTER HAS TAKEN ONE. There is no invocation table, no
 *     feat-feature table and no class-feature selection anywhere in
 *     `db/schema/`, so `character_class_levels` cannot say. The prerequisite is
 *     not a level either — it is "Level 5+ Warlock, Pact of the Blade", and the
 *     second half is a choice this schema does not record.
 *  2. WHICH WEAPON IS THE BONDED ONE, when a child effect's `weapon_scope`
 *     says the grant reaches only one.
 *
 * So a grant from this table is SURFACED against every attack profile and
 * applied to none, with both reasons printed. That is not a shortcoming hidden
 * in a comment: it is the `content_missing` posture `WeaponMasteryLookup`
 * established, and `prerequisite` exists as a NOT NULL column precisely so the
 * sentence the user reads is the source's own and not this application's
 * paraphrase.
 *
 * NOT DELETED-AND-REWRITTEN BY THE SEEDER. Rows are upserted on `content_key`,
 * so a user's own named feature on the same class is never collateral.
 */
export const named_features = sqliteTable(
  'named_features',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<NamedFeatureId>(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    /**
     * The class whose LEVEL the prerequisite counts — not the class that must
     * be the character's starting class, and not their total level. A
     * Fighter 5 / Warlock 4 does not meet "Level 5+ Warlock".
     */
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    name: varchar()('name').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition').notNull(),
    /**
     * The printed prerequisite line, verbatim, and NOT NULL.
     *
     * D6 asks what the null would mean before the column is declared nullable.
     * Here it would mean "this feature has no prerequisite", which for a row in
     * THIS table is never true: a feature belongs here BECAUSE it is optional
     * and conditional, and both bundled rows print a Prerequisite line. A
     * nullable column would let a parse that missed the line write NULL and
     * promise an unconditional grant, which is worse than throwing — and
     * `parseSrdNamedExtraAttackFeatures` does throw.
     *
     * It is also the only place the un-modelled half of the condition survives.
     * `class_level` holds "Level 5+ Warlock"; "Pact of the Blade" lives here
     * and nowhere else, and it is what the sheet prints when it explains why
     * the grant was not applied.
     */
    prerequisite: sqlText()('prerequisite').notNull(),
    description: sqlText()('description').notNull(),
    /** The level in `class_definition_id` at which the prerequisite is met. */
    class_level: integer('class_level').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check('named_features_class_level_check', sql`class_level BETWEEN 1 AND 20`),
    uniqueIndex('named_features_content_key_unique').on(table.content_key),
    /**
     * The same triple `subclass_definitions` is unique on, and for the same
     * reason: a user-authored feature and a bundled one may share a name only
     * if they belong to different classes or different editions, and the
     * seeder's upsert yields the slot rather than overwriting a key it does not
     * own.
     */
    uniqueIndex('named_features_class_name_rules_edition_unique').on(
      table.class_definition_id,
      table.name,
      table.rules_edition,
    ),
  ],
);

/** Mechanical effects of an optional feature; never auto-copied to a character. */
export const named_feature_effects = sqliteTable(
  'named_feature_effects',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<NamedFeatureEffectId>(),
    named_feature_id: integer('named_feature_id')
      .notNull()
      .$type<NamedFeatureId>()
      .references(() => named_features.id, { onDelete: 'cascade' }),
    sort_order: integer('sort_order').notNull(),
    ...featureEffectColumns(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    ...featureEffectChecks('named_feature_effects'),
    check(
      'named_feature_effects_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    uniqueIndex('named_feature_effects_feature_sort_unique').on(
      table.named_feature_id,
      table.sort_order,
    ),
  ],
);

/**
 * An automatic base-class feature. Unlike `named_features`, reaching
 * `class_level` is sufficient to gain it, so class sync copies its mechanical
 * row into `character_effects`.
 */
export const class_feature_effects = sqliteTable(
  'class_feature_effects',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<ClassFeatureEffectId>(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    class_level: integer('class_level').notNull(),
    name: varchar()('name').notNull(),
    ...featureEffectColumns(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    ...featureEffectChecks('class_feature_effects'),
    check(
      'class_feature_effects_class_level_check',
      sql`class_level BETWEEN 1 AND 20`,
    ),
    uniqueIndex('class_feature_effects_class_name_level_unique').on(
      table.class_definition_id,
      table.name,
      table.class_level,
    ),
  ],
);
