import {
  check,
  index,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  BackgroundTemplateId,
  CharacterBackgroundId,
  CharacterId,
  CharacterSpeciesId,
  CharacterSpeciesTraitId,
  ContentKey,
  SpeciesTemplateId,
  SpeciesTemplateTraitId,
} from '../../src/domain/ids';
import type {
  RulesEdition,
  SpeciesTraitEffectKind,
} from '../../src/domain/enums';
import {
  rulesEditions,
  speciesTraitEffectKinds,
} from '../../src/domain/enums';
import {
  datetime,
  integerAtLeast,
  laravelDefault,
  nullOrIntegerAtLeast,
  nullOrOneOf,
  oneOf,
  sqlText,
  varchar,
} from './columns';
import { characters } from './character';

/**
 * ORIGINS: species and backgrounds. Six NATIVE tables, in the same separate
 * inventory `db/schema/weapons.ts` established — the Laravel parity claim in
 * `tests/unit/schema.test.ts` is still made over the original 38 and is not
 * diluted by them.
 *
 * WHY THESE ARE NEW TABLES AND NOT COLUMNS ON `species_definitions`. That table
 * is one of THE LARAVEL 38. `laravelColumnMetadataHash` is computed over
 * exactly those tables' columns, types, nullability, defaults and order, so
 * adding one column to it moves the hash and breaks the parity claim BY DESIGN.
 * The only way through would be editing the frozen constant, which is the
 * weakened assertion this project does not do. Two further reasons stand on
 * their own: `species_definitions`, `background_definitions` and
 * `feat_definitions` are deliberately column-identical (the same migration
 * repeated), so widening one breaks a documented invariant and widening all
 * three drags feats into a change they have no part in; and both definition
 * tables are `backupReference: true` — a backup RESOLVES character rows against
 * them by content key, which is the live catalog link D1b exists to avoid.
 *
 * WHAT THE DEFINITION TABLES KEEP DOING. Everything they did before. Picking a
 * species does TWO things and they are deliberately different in kind:
 *
 *  1. it COPIES values into `character_species` / `character_species_traits`,
 *     after which the link is severed and every field is the character's own;
 *  2. it creates a `character_source_instances` row pointing at the
 *     `species_definitions` row, whose `grant_rules` mint spell selection
 *     slots through `src/grants/` — which IS a live catalog reference and must
 *     stay one.
 *
 * The two rows share a `content_key` and are seeded from the same parse. The
 * honest cost: editing the copied trait text does not change the granted
 * spells. That is correct — values are the character's, grants are the
 * catalog's — but it has to be said rather than discovered.
 *
 * WHAT THIS DOES NOT MODEL. No ability-score increase is applied anywhere: a
 * background's three abilities are recorded as NAMES, and the character's own
 * `characters.strength`..`charisma` stay the user's values (the template
 * suggests, the character owns). No skill proficiency, no tool proficiency and
 * no equipment beyond the printed text — skills belong to the class-sheet
 * track's model and are held here as free text until it arrives. Nothing here
 * derives a number for HP or AC; `hp_modifier` is DECLARED so that track's
 * derivation can consume it later without either track reaching into the
 * other's files.
 */

/* ==========================================================================
 * SPECIES — CATALOG SIDE
 * ========================================================================== */

/**
 * The SRD species catalog, seeded by parsing
 * `docs/srd/source/species-descriptions.txt`. Nine rows, and nine is the
 * complete set.
 *
 * CREATURE TYPE, SIZE AND SPEED ARE COLUMNS, NOT TRAITS, and that is the
 * source's own structure rather than a modelling preference: printed page 83
 * says a species has four parts — Creature Type, Size, Speed, and Special
 * Traits — and only the fourth produces trait rows.
 *
 * There is no `srd_group`-shaped grouping column. `weapon_templates` needs one
 * because its picker has 38 entries the source itself groups into four tables;
 * nine species are one flat list, and inventing a grouping the document does
 * not have would be a column that only ever drifts.
 */
export const species_templates = sqliteTable(
  'species_templates',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SpeciesTemplateId>(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition')
      .notNull()
      .default(laravelDefault('2024')),
    name: varchar()('name').notNull(),
    /**
     * NOT an enum, for the same reason `weapon_templates.damage_type` is not.
     * All nine SRD species are `Humanoid` and the document says so explicitly
     * ("Every species in Character Origins is Humanoid; playable non-Humanoid
     * species appear in other books"), so closing the vocabulary on one member
     * would encode a fact about THIS EXTRACT as a fact about the rules.
     */
    creature_type: varchar()('creature_type').notNull(),
    /**
     * The size word only — `Medium`, `Small` — never the printed height range.
     * The heights are flavour and are deliberately not modelled.
     *
     * Open vocabulary rather than a two-member enum. The extract prints only
     * Small and Medium because those are the only sizes NINE SPECIES use; the
     * other four sizes are real and live in the Rules Glossary, which is not in
     * this extract. A CHECK of `IN ('Small','Medium')` would state a rule the
     * source does not, and would refuse a homebrew species on the character's
     * own row (F6: a short sourced set, not an invented closed one).
     */
    size: varchar()('size').notNull(),
    /**
     * The SECOND size, when the species lets the player choose between two.
     *
     * Nullable, D6b limb 2 — the absence is the source's own. Seven of the nine
     * species print exactly one size; Human and Tiefling print two ("Medium
     * (about 4-7 feet tall) or Small (about 2-4 feet tall), chosen when you
     * select this species").
     *
     * There is deliberately no companion `size_is_choice` boolean: it is
     * derivable from this column and keeping both admits the impossible row
     * `size_is_choice = 1, alternate_size = NULL`. That is the same call
     * `character_weapons.versatile_damage_dice` already made.
     */
    alternate_size: varchar()('alternate_size'),
    /**
     * NOT NULL here where the character's copy is nullable: every one of the
     * nine prints a `Speed: NN feet` line, and eight of them print 30. The
     * Goliath's 35 is the reason this is parsed rather than defaulted.
     */
    base_speed_feet: integer('base_speed_feet').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * Safe here for the reason `weapon_templates_rules_edition_check` is safe:
     * this table is NATIVE, its only writer is the SRD seeder binding the
     * `'2024'` constant, and no catalog-import path can reach it.
     */
    check(
      'species_templates_rules_edition_check',
      oneOf('rules_edition', rulesEditions),
    ),
    /**
     * A species with no Speed cannot be copied onto a character usefully, and a
     * zero or negative one is a mis-parse rather than a species. The lower
     * bound goes through `integerAtLeast` because a bare `>= 1` accepts every
     * text value SQLite can store in the column (see `columns.ts`).
     */
    check('species_templates_base_speed_check', integerAtLeast('base_speed_feet', 1)),
    uniqueIndex('species_templates_content_key_unique').on(table.content_key),
    uniqueIndex('species_templates_name_rules_edition_unique').on(
      table.name,
      table.rules_edition,
    ),
  ],
);

/**
 * One printed Special Trait of one catalog species. Thirty-three rows across
 * the nine species: 5/4/5/3/3/4/3/3/3.
 *
 * A TRAIT IS FREE TEXT PLUS AN OPTIONAL MECHANICAL EFFECT. `description` always
 * carries the trait's printed paragraphs — including the choice table the
 * paragraph names, where there is one — and `effect_kind` is NULL for
 * twenty-six of the thirty-three. The shape is the weapon-property shape one
 * level up: booleans plus `other_properties` free text there, a closed
 * `effect_kind` plus `description` free text here.
 *
 * The payload columns are per-KIND and mutually exclusive, enforced below, so
 * the closed set is closed in SQLite and not only in TypeScript.
 */
export const species_template_traits = sqliteTable(
  'species_template_traits',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SpeciesTemplateTraitId>(),
    species_template_id: integer('species_template_id')
      .notNull()
      .$type<SpeciesTemplateId>()
      .references(() => species_templates.id, { onDelete: 'cascade' }),
    /**
     * Printed order, and it is load-bearing rather than cosmetic: a species'
     * traits are printed in a fixed order and a sheet that reshuffles them
     * reads as a different species. `character_weapons` has no such column
     * because nothing has ever asked to order a weapon list.
     */
    sort_order: integer('sort_order').notNull(),
    name: varchar()('name').notNull(),
    /**
     * NOT NULL here and nullable on the character's copy: every printed trait
     * has text, and a mis-parse writing an empty one is exactly what this
     * refuses.
     */
    description: sqlText()('description').notNull(),
    effect_kind: varchar<SpeciesTraitEffectKind>()('effect_kind'),
    /**
     * The resisted damage type, for `damage_resistance` only.
     *
     * NULL WITH `effect_kind = 'damage_resistance'` IS A REAL STATE, NOT A GAP:
     * the Dragonborn's Damage Resistance is "the damage type determined by your
     * Draconic Ancestry trait", a choice among ten the character makes. The
     * trait unconditionally grants A resistance; which one is not a property of
     * the species. D6b limb 2 — the absence is the source's own.
     *
     * Open vocabulary, not an enum, following
     * `spell_version_damage_types.damage_type`.
     */
    effect_damage_type: varchar()('effect_damage_type'),
    /**
     * `hp_modifier`: the flat Hit Point maximum bonus, and the per-level one.
     * Two columns rather than one because a trait may carry either shape, and
     * splitting them is what lets the other track's derivation consume this
     * without parsing English.
     *
     * Dwarven Toughness — the ONLY printed trait that writes them — is
     * `flat = 0, perLevel = 1`, NOT one of each. "Your Hit Point maximum
     * increases by 1, and it increases by 1 again whenever you gain a level"
     * makes the opening clause the level-1 grant, so the total is the
     * character's level. `flat = 1` alongside it counts level 1 twice; see
     * `src/rules/origins-srd.ts`, where that bug lived.
     *
     * Both nullable because both are meaningless for the other three kinds; the
     * CHECKs below make an `hp_modifier` row with neither, or a non-`hp_modifier`
     * row with either, unrepresentable.
     */
    effect_hit_points_flat: integer('effect_hit_points_flat'),
    effect_hit_points_per_level: integer('effect_hit_points_per_level'),
    /**
     * `speed`: a standing bonus to walking Speed in FEET, as a delta.
     *
     * A delta and not an absolute, because base Speed is already a column on
     * `species_templates` and an absolute here would be a second source for the
     * same number. No SRD species trait writes this column — see
     * `speciesTraitEffectKinds` for why, at length — so today it exists for a
     * character's own hand-written trait.
     */
    effect_speed_bonus_feet: integer('effect_speed_bonus_feet'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * The one that matters most in this file. An unrecognised `effect_kind`
     * reads as "some effect" to every branch that is not an exhaustive switch,
     * and as NOTHING to `src/rules/species-effects.ts`, which returns no effect
     * for a value it does not know. Either way the character quietly loses a
     * trait's mechanics with no error anywhere — the same silent-wrong
     * `class_weapon_mastery_grants_grant_check` was written against.
     *
     * The null limb is the DEFAULT case, not an edge: twenty-six of the
     * thirty-three printed traits are free text and have no kind at all.
     */
    check(
      'species_template_traits_effect_kind_check',
      nullOrOneOf('effect_kind', speciesTraitEffectKinds),
    ),
    /**
     * Every payload column belongs to exactly one kind, and none may be set
     * without it. Separate constraints rather than one compound: SQLite names
     * the constraint it rejected, and "which column was wrong" is the whole
     * diagnostic value.
     *
     * `IS` AND `IS NOT`, NOT `=` AND `<>`, AND THIS WAS MEASURED RATHER THAN
     * PREFERRED. Written as `effect_kind = 'damage_resistance'`, the whole
     * expression evaluates to NULL for the 27 free-text traits whose
     * `effect_kind` is NULL — and SQLite PASSES a CHECK that evaluates to NULL.
     * The constraint would then admit exactly the row it exists to refuse: a
     * free-text trait carrying an orphaned mechanical payload. The behavioural
     * cases in `tests/unit/schema-check-constraints.test.ts` caught it, and
     * every one of them is a `rejects` case on an `effect_kind: null` row.
     * SQLite's `IS` compares NULLs, so the null branch is decided rather than
     * unknown. Same trap `spell_versions_level_check` documents.
     */
    check(
      'species_template_traits_damage_type_kind_check',
      sql`effect_damage_type IS NULL OR effect_kind IS 'damage_resistance'`,
    ),
    check(
      'species_template_traits_hit_points_kind_check',
      sql`(effect_hit_points_flat IS NULL AND effect_hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'`,
    ),
    check(
      'species_template_traits_speed_kind_check',
      sql`effect_speed_bonus_feet IS NULL OR effect_kind IS 'speed'`,
    ),
    /**
     * The other direction: a kind that promises a number must carry one.
     * Without this an `hp_modifier` trait with both HP columns null derives a
     * zero, which is indistinguishable from a trait that was never mechanical
     * and costs the character an entitlement.
     *
     * `granted_spells` and `damage_resistance` are deliberately absent from
     * this list. `granted_spells` is a marker with no payload by design, and
     * `damage_resistance` with a null type is the Dragonborn.
     */
    check(
      'species_template_traits_hp_modifier_payload_check',
      sql`effect_kind IS NOT 'hp_modifier' OR effect_hit_points_flat IS NOT NULL OR effect_hit_points_per_level IS NOT NULL`,
    ),
    check(
      'species_template_traits_speed_payload_check',
      sql`effect_kind IS NOT 'speed' OR effect_speed_bonus_feet IS NOT NULL`,
    ),
    /** Printed order starts at 1 and is dense; 0 or a negative is a mis-parse. */
    check(
      'species_template_traits_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    uniqueIndex('species_template_traits_template_sort_unique').on(
      table.species_template_id,
      table.sort_order,
    ),
    /**
     * Two species may both print `Darkvision`, and six of the nine do — the
     * uniqueness is WITHIN a species, where a repeated trait name would mean
     * the two-column reconstruction joined the same paragraph twice.
     */
    uniqueIndex('species_template_traits_template_name_unique').on(
      table.species_template_id,
      table.name,
    ),
  ],
);

/* ==========================================================================
 * SPECIES — CHARACTER SIDE
 * ========================================================================== */

/**
 * The character's OWN species. At most one row per character.
 *
 * D1b, LITERALLY: this row holds VALUES and no `species_templates.id`. Picking
 * a template is a one-time column-wise copy (`speciesFromTemplate` in
 * `src/rules/origins.ts`), after which renaming the species, changing its Speed
 * or rewriting a trait cannot reach back into the catalog and the catalog
 * cannot reach forward into it. There is no re-sync affordance because there is
 * deliberately no link to re-sync.
 *
 * WHY A TABLE RATHER THAN COLUMNS ON `characters`. Not to delete a null — D6b
 * forbids extracting a 1:0..1 table for that alone. The species is separately
 * added and separately removed, it carries a variable-length trait list that
 * cannot be columns at all, and folding it in would put six always-null columns
 * on the aggregate root for every character who has not chosen one.
 *
 * `name` is NOT NULL and the ABSENCE of a species is the ABSENCE of the ROW,
 * which is why there is no half-null species: a row with no name could not be
 * shown in a list or told apart from no species at all.
 */
export const character_species = sqliteTable(
  'character_species',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterSpeciesId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    name: varchar()('name').notNull(),
    /**
     * Nullable HERE and NOT NULL on the template, and the difference is a
     * sourced fact rather than an inconsistency (D6b limbs 1 and 3): all nine
     * printed species state a creature type, a size and a Speed, and a user
     * inventing "my table's Half-Ogre" may type the name and come back to the
     * rest. Forbidding that turns adding a species into an all-or-nothing
     * modal. There is no sensible default and `''` would be a null in costume.
     */
    creature_type: varchar()('creature_type'),
    size: varchar()('size'),
    /**
     * No `alternate_size` on the character's row, deliberately. The template's
     * second size is an OFFER; the character has chosen, and recording the
     * option they did not take would be recording the catalog on a row whose
     * whole purpose is to be free of it.
     */
    base_speed_feet: integer('base_speed_feet'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * A character has ONE species. Enforced here rather than in a command,
     * because the writers are a command, a backup import, a share import and a
     * save-point restore, and only the schema is in front of all four.
     */
    uniqueIndex('character_species_character_id_unique').on(table.character_id),
    /**
     * Nullable, so the null limb is load-bearing — a half-entered species is a
     * first-class state. Zero and negative are still refused, because a Speed
     * of 0 is not "not decided yet", it is a decision the rules do not make.
     */
    check(
      'character_species_base_speed_check',
      nullOrIntegerAtLeast('base_speed_feet', 1),
    ),
  ],
);

/**
 * The character's OWN trait list. Copied from the template once, then theirs.
 *
 * Keyed on `character_id` rather than on `character_species.id`, and that is
 * the deliberate choice: it keeps the table in the `character_id`-filtered
 * backup pass beside `character_weapons` instead of needing the child-of-child
 * handling `spell_loadout_entries` requires, and it matches how the domain
 * behaves — these are the character's traits, and swapping species replaces the
 * list rather than re-parenting it. `ClearSpeciesCommand` deletes both rows
 * together; nothing else writes either.
 */
export const character_species_traits = sqliteTable(
  'character_species_traits',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterSpeciesTraitId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    sort_order: integer('sort_order').notNull(),
    name: varchar()('name').notNull(),
    /**
     * Nullable HERE and NOT NULL on the template (D6b limb 3): every printed
     * trait has text, and a user writing "Fleet of Foot" before writing what it
     * does is half-decided rather than invalid.
     */
    description: sqlText()('description'),
    effect_kind: varchar<SpeciesTraitEffectKind>()('effect_kind'),
    effect_damage_type: varchar()('effect_damage_type'),
    effect_hit_points_flat: integer('effect_hit_points_flat'),
    effect_hit_points_per_level: integer('effect_hit_points_per_level'),
    effect_speed_bonus_feet: integer('effect_speed_bonus_feet'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * The identical seven constraints the template carries, and identical on
     * purpose: the copy is column-wise, so a rule that holds for the catalog
     * row and not for the character's would let the copy itself produce a row
     * the schema refuses.
     */
    check(
      'character_species_traits_effect_kind_check',
      nullOrOneOf('effect_kind', speciesTraitEffectKinds),
    ),
    check(
      'character_species_traits_damage_type_kind_check',
      sql`effect_damage_type IS NULL OR effect_kind IS 'damage_resistance'`,
    ),
    check(
      'character_species_traits_hit_points_kind_check',
      sql`(effect_hit_points_flat IS NULL AND effect_hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'`,
    ),
    check(
      'character_species_traits_speed_kind_check',
      sql`effect_speed_bonus_feet IS NULL OR effect_kind IS 'speed'`,
    ),
    check(
      'character_species_traits_hp_modifier_payload_check',
      sql`effect_kind IS NOT 'hp_modifier' OR effect_hit_points_flat IS NOT NULL OR effect_hit_points_per_level IS NOT NULL`,
    ),
    check(
      'character_species_traits_speed_payload_check',
      sql`effect_kind IS NOT 'speed' OR effect_speed_bonus_feet IS NOT NULL`,
    ),
    check(
      'character_species_traits_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    /**
     * An index and NOT a unique index on `(character_id, sort_order)`. The
     * template's order is dense because the source's is; a user reordering
     * their own list mid-edit is not a corrupt row, and a uniqueness constraint
     * would make an ordinary two-step swap impossible without a temporary
     * value.
     */
    index('character_species_traits_character_id_index').on(table.character_id),
  ],
);

/* ==========================================================================
 * BACKGROUNDS
 * ========================================================================== */

/**
 * The SRD background catalog, seeded by parsing
 * `docs/srd/source/backgrounds.txt`. FOUR rows — Acolyte, Criminal, Sage,
 * Soldier — and four is the complete set. The 2024 Player's Handbook prints
 * sixteen; SRD 5.2.1 licenses four, and typing the other twelve would be
 * inventing content the licence does not cover.
 *
 * A BACKGROUND IS NOT SHAPED LIKE A SPECIES AND CANNOT SHARE ITS TABLE. Printed
 * page 83 gives a background exactly five parts — Ability Scores, Feat, Skill
 * Proficiencies, Tool Proficiency, Equipment — every one of them a fixed slot,
 * and gives it NO traits at all. A species is creature type, size, speed and a
 * variable-length trait list, and has no ability scores, no tool and no
 * equipment. One table for both would be two tables in a trench coat, each
 * row leaving the other's columns null.
 *
 * EVERY COLUMN IS TEXT AND NOTHING IS APPLIED. The three abilities are NAMES,
 * not increases: "increase one by 2 and another one by 1, or increase all three
 * by 1" is a choice the user makes, and `characters.strength`..`charisma` are
 * values the user already owns and edits directly. D1b applied literally — the
 * template SUGGESTS and the character keeps the value. The feat is a NAME; the
 * grant itself travels the existing `grant_source` rule on
 * `background_definitions.grant_rules`, not this column. The two skills are
 * text because the skills model belongs to the class-sheet track.
 */
export const background_templates = sqliteTable(
  'background_templates',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<BackgroundTemplateId>(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition')
      .notNull()
      .default(laravelDefault('2024')),
    name: varchar()('name').notNull(),
    /**
     * Three separate columns rather than a list, because the source prints
     * exactly three and the "+2/+1 or +1/+1/+1" rule is stated over three. A
     * child table would model a cardinality the document does not have.
     *
     * NOT the `abilities` enum: those members are the lowercase column names of
     * `characters`, and these are the printed words. Translating at parse time
     * would put a mapping between the extract and the row, which is what makes
     * a seed stop being diffable against its source.
     */
    ability_score_1: varchar()('ability_score_1').notNull(),
    ability_score_2: varchar()('ability_score_2').notNull(),
    ability_score_3: varchar()('ability_score_3').notNull(),
    /** The Origin feat's printed name, e.g. `Magic Initiate (Cleric)`. */
    feat_name: varchar()('feat_name').notNull(),
    skill_proficiency_1: varchar()('skill_proficiency_1').notNull(),
    skill_proficiency_2: varchar()('skill_proficiency_2').notNull(),
    /**
     * NOT NULL even though the Soldier's is "Choose one kind of Gaming Set":
     * the printed value IS that sentence, and storing it verbatim is what keeps
     * the row diffable against the extract. A `tool_is_choice` boolean would be
     * this project re-deciding what the document already wrote down.
     */
    tool_proficiency: varchar()('tool_proficiency').notNull(),
    /** "Choose A or B" — both packages, printed verbatim, applied to nothing. */
    equipment_option_a: sqlText()('equipment_option_a').notNull(),
    equipment_option_b: sqlText()('equipment_option_b').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'background_templates_rules_edition_check',
      oneOf('rules_edition', rulesEditions),
    ),
    uniqueIndex('background_templates_content_key_unique').on(table.content_key),
    uniqueIndex('background_templates_name_rules_edition_unique').on(
      table.name,
      table.rules_edition,
    ),
  ],
);

/**
 * The character's OWN background. At most one row per character, values only,
 * no template id — `character_species`' argument applies unchanged.
 *
 * Every field but `name` is nullable, and every one of them is D6b limb 3: a
 * user writing their own background fills these in over several sittings, and
 * the SRD's four are the only ones guaranteed to have all nine.
 */
export const character_background = sqliteTable(
  'character_background',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterBackgroundId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    name: varchar()('name').notNull(),
    ability_score_1: varchar()('ability_score_1'),
    ability_score_2: varchar()('ability_score_2'),
    ability_score_3: varchar()('ability_score_3'),
    feat_name: varchar()('feat_name'),
    skill_proficiency_1: varchar()('skill_proficiency_1'),
    skill_proficiency_2: varchar()('skill_proficiency_2'),
    tool_proficiency: varchar()('tool_proficiency'),
    equipment_option_a: sqlText()('equipment_option_a'),
    equipment_option_b: sqlText()('equipment_option_b'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('character_background_character_id_unique').on(
      table.character_id,
    ),
  ],
);
