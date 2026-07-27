import {
  check,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  ClassDefinitionId,
  ContentKey,
  NamedFeatureId,
  SubclassDefinitionId,
  SubclassFeatureId,
} from '../../src/domain/ids';
import type {
  Ability,
  ClassFeatureEffectKind,
  ExtraAttackWeaponScope,
  ProgressionType,
  RulesEdition,
} from '../../src/domain/enums';
import {
  abilities,
  classFeatureEffectKinds,
  extraAttackWeaponScopes,
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
    content_key: varchar<ContentKey>()('content_key').notNull(),
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
    uniqueIndex('class_definitions_name_rules_edition_unique').on(
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
    content_key: varchar<ContentKey>()('content_key').notNull(),
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
    uniqueIndex(
      'subclass_definitions_class_definition_id_name_rules_edition_unique',
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
    /**
     * NULLABLE ON D6b LIMB 2, AND THIS IS THE LIMB'S CLEAREST CASE: the SRD
     * cannot be represented without it. A subclass prints features that move no
     * number at all, and a NULL here is what says so — not a gap, not an
     * "undecided", and not a value waiting to be filled in. D12 measured the
     * same absence at 26 of 33 on the species side.
     *
     * The two payload columns below are nullable for a DIFFERENT reason and it
     * is not a limb of D6b at all: they are meaningless for a feature with no
     * kind, and the CHECKs make a row with either an orphaned payload or a
     * payload-less kind unrepresentable. That is D6's "extract a variant" answer
     * given inside one table, which `species_template_traits` established.
     */
    effect_kind: varchar<ClassFeatureEffectKind>()('effect_kind'),
    /**
     * `extra_attack`: the TOTAL attacks the Attack action gives, absolute and
     * never an increment — the same convention `class_extra_attack_grants`
     * stores and for the same two reasons. It resolves as "the greatest
     * granting level at or below this one" rather than a running sum, so a
     * partial parse degrades to a stale-but-real number; and the multiclass
     * combinator is `max`, which only works on absolutes.
     */
    effect_attack_count: integer('effect_attack_count'),
    effect_weapon_scope: varchar<ExtraAttackWeaponScope>()(
      'effect_weapon_scope',
    ),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check('subclass_features_class_level_check', sql`class_level BETWEEN 1 AND 20`),
    check(
      'subclass_features_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    /**
     * An unrecognised `effect_kind` reads as "some effect" to anything that is
     * not an exhaustive switch and as NOTHING to
     * `src/rules/class-feature-effects.ts`, so the character silently loses the
     * feature's mechanics with no error anywhere. The null limb is the DEFAULT
     * case here, not an edge: a feature that is only text is the common one.
     */
    check(
      'subclass_features_effect_kind_check',
      nullOrOneOf('effect_kind', classFeatureEffectKinds),
    ),
    check(
      'subclass_features_effect_weapon_scope_check',
      nullOrOneOf('effect_weapon_scope', extraAttackWeaponScopes),
    ),
    /**
     * `attack_count >= 2`: a row carrying this effect EXISTS because a feature
     * granted Extra Attack, and the smallest thing that feature can mean is two
     * attacks. A 1 is a parse that found the wrong line — the same limb
     * `class_extra_attack_grants_check` carries.
     */
    check(
      'subclass_features_effect_attack_count_check',
      nullOrIntegerAtLeast('effect_attack_count', 2),
    ),
    /**
     * Payload ⇒ kind, then kind ⇒ payload, in both directions and with `IS`
     * rather than `=`.
     *
     * `IS` IS LOAD-BEARING AND WAS MEASURED ON THE SPECIES SIDE FIRST: written
     * as `effect_kind = 'extra_attack'`, the whole expression evaluates to NULL
     * for every text-only feature, and SQLite PASSES a CHECK that evaluates to
     * NULL. The constraint would then admit exactly the row it exists to
     * refuse — a free-text feature carrying an orphaned mechanical payload.
     */
    check(
      'subclass_features_attack_count_kind_check',
      sql`effect_attack_count IS NULL OR effect_kind IS 'extra_attack'`,
    ),
    check(
      'subclass_features_weapon_scope_kind_check',
      sql`effect_weapon_scope IS NULL OR effect_kind IS 'extra_attack'`,
    ),
    /**
     * The other direction: a kind that promises a number must carry one, AND
     * must carry its scope. A scope-less `extra_attack` row would have to be
     * defaulted to `any_weapon` by every reader, and a grant that is silently
     * widened from one weapon to all of them is the exact wrong answer D19 §3
     * describes.
     */
    check(
      'subclass_features_extra_attack_payload_check',
      sql`effect_kind IS NOT 'extra_attack' OR (effect_attack_count IS NOT NULL AND effect_weapon_scope IS NOT NULL)`,
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
 *  2. WHICH WEAPON IS THE BONDED ONE, when `effect_weapon_scope` says the grant
 *     reaches only one.
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
    /** Nullable on D6b limb 2, exactly as `subclass_features.effect_kind` is. */
    effect_kind: varchar<ClassFeatureEffectKind>()('effect_kind'),
    effect_attack_count: integer('effect_attack_count'),
    effect_weapon_scope: varchar<ExtraAttackWeaponScope>()(
      'effect_weapon_scope',
    ),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check('named_features_class_level_check', sql`class_level BETWEEN 1 AND 20`),
    check(
      'named_features_effect_kind_check',
      nullOrOneOf('effect_kind', classFeatureEffectKinds),
    ),
    check(
      'named_features_effect_weapon_scope_check',
      nullOrOneOf('effect_weapon_scope', extraAttackWeaponScopes),
    ),
    check(
      'named_features_effect_attack_count_check',
      nullOrIntegerAtLeast('effect_attack_count', 2),
    ),
    check(
      'named_features_attack_count_kind_check',
      sql`effect_attack_count IS NULL OR effect_kind IS 'extra_attack'`,
    ),
    check(
      'named_features_weapon_scope_kind_check',
      sql`effect_weapon_scope IS NULL OR effect_kind IS 'extra_attack'`,
    ),
    check(
      'named_features_extra_attack_payload_check',
      sql`effect_kind IS NOT 'extra_attack' OR (effect_attack_count IS NOT NULL AND effect_weapon_scope IS NOT NULL)`,
    ),
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
