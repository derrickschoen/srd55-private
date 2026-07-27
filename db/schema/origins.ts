import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  BackgroundTemplateId,
  CharacterBackgroundId,
  CharacterEffectId,
  CharacterId,
  CharacterSpeciesId,
  CharacterSpeciesTraitId,
  ContentKey,
  SourceInstanceId,
  SpeciesTemplateId,
  SpeciesTemplateTraitEffectId,
  SpeciesTemplateTraitId,
} from '../../src/domain/ids';
import type { EffectKind, RulesEdition } from '../../src/domain/enums';
import { effectKinds, rulesEditions } from '../../src/domain/enums';
import {
  datetime,
  integerAtLeast,
  laravelDefault,
  nullOrIntegerAtLeast,
  oneOf,
  sqlText,
  varchar,
} from './columns';
import { character_source_instances, characters } from './character';

/**
 * ORIGINS: species and backgrounds, and the character's own EFFECTS. Eight
 * NATIVE tables, in the same separate inventory `db/schema/weapons.ts`
 * established — the Laravel parity claim in
 * `tests/unit/schema.test.ts` is still made over the original 38 and is not
 * diluted by them.
 *
 * TWO OF THE EIGHT ARE THE EFFECT MODEL, AND THEY ARE TWO ON PURPOSE.
 * `species_template_trait_effects` declares what a CATALOG TEMPLATE GRANTS;
 * `character_effects` records what a CHARACTER HAS. Those are different
 * questions with different lifetimes, different portability rules and — the
 * decisive one — different meanings for the same null. Each table says so at
 * its own declaration.
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
 * A TRAIT IS FREE TEXT, AND NOTHING ELSE. `description` carries the trait's
 * printed paragraphs, including the choice table the paragraph names where
 * there is one.
 *
 * THE FIVE `effect_*` COLUMNS THAT USED TO BE HERE ARE GONE, AND THAT IS THE
 * INVERSION. They made a trait the thing an effect hung from, which forced
 * exactly one effect per trait — a limit of the model that the source does not
 * have. Fiendish Legacy's own paragraph grants a Resistance AND a cantrip; the
 * single `effect_kind` column could hold one of them, so whichever was chosen
 * the other became invisible, and the app ended up recording the Dragonborn's
 * unnamed resistance while dropping the Tiefling's identical one.
 *
 * A catalog trait now DECLARES A LIST (`species_template_trait_effects` below),
 * and two effects is an ordinary row count rather than a special case.
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
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
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

/**
 * WHAT A CATALOG TRAIT GRANTS. Zero, one or several rows per printed trait.
 *
 * THIS IS THE CATALOG HALF AND IT IS DELIBERATELY NOT THE SAME TABLE AS
 * `character_effects`. The two answer different questions and the difference is
 * not stylistic:
 *
 *  - a row here belongs to a CONTENT KEY, is replaced wholesale by a re-seed,
 *    never travels in a backup or a share link, and IS the provenance;
 *  - a row in `character_effects` belongs to a CHARACTER, is edited by the user
 *    and never re-synced (D1b), travels in all three portability arms, and
 *    POINTS AT its provenance.
 *
 * The decisive asymmetry is what a null `damage_type` MEANS. Here it means "the
 * source declines to name the type" — the Dragonborn's Damage Resistance is
 * "the damage type determined by your Draconic Ancestry trait", and Fiendish
 * Legacy's is whichever legacy the player picks. On the character's row it
 * means "this player has not decided yet", which is a completeness item. One
 * table holding both would make those two facts read identically, and telling
 * them apart is the whole point of keeping them separate.
 *
 * `effect_kind` IS `NOT NULL` HERE, where it was nullable on the trait row it
 * replaced, and that is the direct consequence of the inversion: a trait with
 * no mechanical effect is now the ABSENCE OF A ROW rather than a row with five
 * nulls in it. Twenty-six of the thirty-three printed traits have no row at
 * all, which is the same fact stated without a null.
 */
export const species_template_trait_effects = sqliteTable(
  'species_template_trait_effects',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SpeciesTemplateTraitEffectId>(),
    species_template_trait_id: integer('species_template_trait_id')
      .notNull()
      .$type<SpeciesTemplateTraitId>()
      .references(() => species_template_traits.id, { onDelete: 'cascade' }),
    /**
     * Declared order within the trait. Load-bearing for the same reason the
     * trait's own `sort_order` is: the copy onto a character preserves it, and
     * a sheet that reshuffled a trait's two effects would read differently.
     */
    sort_order: integer('sort_order').notNull(),
    effect_kind: varchar<EffectKind>()('effect_kind').notNull(),
    /**
     * The resisted damage type, for `damage_resistance` only.
     *
     * NULLABLE, D6b LIMB 2 — THE ABSENCE IS THE SOURCE'S OWN. Two of the three
     * printed resistances decline to name a type: the Dragonborn's is "the
     * damage type determined by your Draconic Ancestry trait" (one of ten) and
     * the Tiefling's is the chosen legacy's (one of three). The trait
     * unconditionally grants A resistance; which one is not a property of the
     * species, and there is no default that would not be an invention.
     *
     * Open vocabulary, not an enum, following
     * `spell_version_damage_types.damage_type`.
     */
    damage_type: varchar()('damage_type'),
    /**
     * `hp_modifier`: the flat Hit Point maximum bonus, and the per-level one.
     * Two columns rather than one because an effect may carry either shape, and
     * splitting them is what lets the class-sheet track's derivation consume
     * this without parsing English.
     *
     * Dwarven Toughness — the ONLY printed trait that writes them — is
     * `flat = 0, perLevel = 1`, NOT one of each. "Your Hit Point maximum
     * increases by 1, and it increases by 1 again whenever you gain a level"
     * makes the opening clause the level-1 grant, so the total is the
     * character's level. `flat = 1` alongside it counts level 1 twice; see
     * `src/rules/origins-srd.ts`, where that bug lived.
     *
     * Both nullable, D6b LIMB 2 — the absence is real and not an unset value,
     * the same call `weapon_templates.range_normal_feet` makes ("a Longsword
     * has no range. Not 'unset' — it does not have one"). A
     * `damage_resistance` effect does not HAVE a hit point number; there is
     * nothing to fill in later. The CHECKs below make an `hp_modifier` row with
     * neither, and a non-`hp_modifier` row with either, unrepresentable, so the
     * null is never ambiguous between "not applicable" and "not decided".
     */
    hit_points_flat: integer('hit_points_flat'),
    hit_points_per_level: integer('hit_points_per_level'),
    /**
     * `speed`: a standing bonus to walking Speed in FEET, as a delta.
     *
     * Nullable on the same limb 2 terms. A delta and not an absolute, because
     * base Speed is already a column on `species_templates` and an absolute
     * here would be a second source for the same number. No SRD species trait
     * writes this column — see `effectKinds` for why, at length — so today it
     * exists for a character's own hand-written trait.
     */
    speed_bonus_feet: integer('speed_bonus_feet'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * `oneOf` rather than `nullOrOneOf`, because the column is NOT NULL here.
     * An unrecognised kind reads as "some effect" to every branch that is not
     * an exhaustive switch, and as NOTHING to `src/rules/species-effects.ts`,
     * which returns no effect for a value it does not know — the character
     * quietly loses a trait's mechanics with no error anywhere.
     */
    check(
      'species_template_trait_effects_kind_check',
      oneOf('effect_kind', effectKinds),
    ),
    /**
     * Every payload column belongs to exactly one kind, and none may be set
     * without it. Separate constraints rather than one compound: SQLite names
     * the constraint it rejected, and "which column was wrong" is the whole
     * diagnostic value.
     *
     * `IS` AND `IS NOT`, NOT `=` AND `<>`, AND THIS WAS MEASURED RATHER THAN
     * PREFERRED. Written as `effect_kind = 'damage_resistance'`, the whole
     * expression evaluates to NULL whenever `effect_kind` is NULL — and SQLite
     * PASSES a CHECK that evaluates to NULL, so the constraint would admit
     * exactly the orphaned payload it exists to refuse. `effect_kind` is NOT
     * NULL on this table so the trap cannot spring here TODAY, but the
     * character-side table below carries the identical constraints and the
     * copy between them is column-wise; writing the two differently is how the
     * pair drifts. Same trap `spell_versions_level_check` documents.
     */
    check(
      'species_template_trait_effects_damage_type_kind_check',
      sql`damage_type IS NULL OR effect_kind IS 'damage_resistance'`,
    ),
    check(
      'species_template_trait_effects_hit_points_kind_check',
      sql`(hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'`,
    ),
    check(
      'species_template_trait_effects_speed_kind_check',
      sql`speed_bonus_feet IS NULL OR effect_kind IS 'speed'`,
    ),
    /**
     * The other direction: a kind that promises a number must carry one.
     * Without this an `hp_modifier` effect with both HP columns null derives a
     * zero, which is indistinguishable from an effect that was never mechanical
     * and costs the character an entitlement.
     *
     * `damage_resistance` is deliberately absent from this list — a resistance
     * with a null type is the Dragonborn and the Tiefling, and it is a REAL
     * state rather than an incomplete one.
     */
    check(
      'species_template_trait_effects_hp_modifier_payload_check',
      sql`effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL`,
    ),
    check(
      'species_template_trait_effects_speed_payload_check',
      sql`effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL`,
    ),
    /** Declared order starts at 1 and is dense; 0 or a negative is a mis-parse. */
    check(
      'species_template_trait_effects_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    uniqueIndex('species_template_trait_effects_trait_sort_unique').on(
      table.species_template_trait_id,
      table.sort_order,
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
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
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
 * EFFECTS — THE CHARACTER'S OWN
 * ========================================================================== */

/**
 * WHAT THE CHARACTER HAS. One row per mechanical effect they carry.
 *
 * THE INVERSION, IN ONE TABLE. An effect used to be five columns on a species
 * trait row, which made "a trait with two effects" unrepresentable and made
 * every effect a SPECIES effect by construction. An effect now belongs to the
 * CHARACTER and carries a reference to whatever granted it, so:
 *
 *  - a trait granting two effects is two rows and no longer a special case;
 *  - a feat, a subclass or a background can grant one without a second model —
 *    `character_source_instances.source_type` already names all five kinds;
 *  - the sheet asks ONE question of ONE table with no join.
 *
 * KEYED ON `character_id` AND NOT ON `character_species_traits.id`, and that is
 * deliberate for the two reasons the trait table's own comment gives: it keeps
 * this table in the flat `character_id`-filtered backup and snapshot passes
 * instead of needing the child-of-child handling `spell_loadout_entries`
 * requires, and it lets an effect from a feat exist on a character with no
 * species at all. The trait a species effect came from is recorded in `label`,
 * which is text — see below for why that is not a severed foreign key.
 */
export const character_effects = sqliteTable(
  'character_effects',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterEffectId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    /**
     * The character's own order. An `index` and not a `uniqueIndex` on
     * `(character_id, sort_order)`, for the reason `character_species_traits`
     * records: a user reordering their own list mid-edit is not a corrupt row,
     * and uniqueness would make an ordinary two-step swap impossible.
     */
    sort_order: integer('sort_order').notNull(),
    effect_kind: varchar<EffectKind>()('effect_kind').notNull(),
    /**
     * The resisted damage type, for `damage_resistance` only.
     *
     * NULLABLE, AND THE LIMB IS DIFFERENT FROM THE TEMPLATE'S. On
     * `species_template_trait_effects` a null type is D6b limb 2 — the SOURCE
     * declines to name it. Here it is D6b limb 1: UNDECIDED IS A REAL STATE.
     * The Dragonborn's resistance type is the Draconic Ancestry choice and the
     * Tiefling's is the legacy choice, and until the player makes it the
     * character genuinely has "a resistance, type not yet chosen". That is a
     * completeness item — something the USER must decide — and it is now
     * ADDRESSABLE: it is a row with a `label`, where the old model could only
     * count it (`unchosenDamageResistances` was an integer, because a trait
     * carrying an anonymous resistance had nothing else to offer).
     */
    damage_type: varchar()('damage_type'),
    /**
     * The `hp_modifier` payload. Both nullable on D6b LIMB 2 — a resistance
     * does not HAVE a hit point number, so the absence is real rather than
     * unset — with the CHECKs below making an `hp_modifier` row with neither,
     * and a non-`hp_modifier` row with either, unrepresentable.
     */
    hit_points_flat: integer('hit_points_flat'),
    hit_points_per_level: integer('hit_points_per_level'),
    /** The `speed` payload, nullable on the same limb 2 terms. */
    speed_bonus_feet: integer('speed_bonus_feet'),
    /**
     * WHAT GRANTED THIS, AS A LIVE REFERENCE. Nullable, D6b LIMB 2 — THE
     * ABSENCE IS REAL AND NOT AN UNSET VALUE — and today it is the COMMON state
     * rather than an edge. (Limb 1 joins it on the day the other half of
     * picking a species is built: an effect from a species the app COULD link
     * and has not yet is undecided rather than absent, and this column holds
     * both without changing.)
     *
     * Nothing in `src/` writes `species_definitions`: the table is empty after
     * a full application seed, `AddSourceCommand` looks a definition up by id
     * and throws when it is absent, and the planner's species picker is fed
     * from it and offers an empty list. So a character who picked a BUNDLED SRD
     * species has no species `character_source_instances` row to point at, and
     * a character who typed their own species by hand never will have one. A
     * NOT NULL column here would make the whole model unusable until the other
     * half of "picking a species" — which was designed and never built — is
     * finished, and would still refuse the hand-typed case forever.
     *
     * `label` below is NOT a substitute for this and is not a denormalised
     * copy of it: the two answer different questions, and an effect may
     * legitimately have both.
     *
     * THE REFERENCE IS COMPOSITE, `(source_instance_id, character_id)`, copying
     * `spell_selection_slots` exactly. A bare `source_instance_id` passes
     * `PRAGMA foreign_key_check` while pointing at ANOTHER CHARACTER'S source
     * instance; including `character_id` in the tuple is what makes the
     * database refuse that, and it is why `character_source_instances` carries
     * a `(id, character_id)` unique index that is otherwise redundant. With a
     * NULL in the tuple SQLite's default MATCH SIMPLE satisfies the constraint,
     * which is exactly the "no source instance" case above.
     *
     * ON DELETE cascade: removing the feat removes what the feat granted. An
     * effect outliving its own source is a mechanic the character no longer
     * has, showing on the sheet with nothing to explain it.
     */
    source_instance_id: integer('source_instance_id').$type<SourceInstanceId>(),
    /**
     * WHAT TO CALL THIS ON A SHEET — the granting trait's name, the feat's
     * name, whatever the user typed. NOT NULL.
     *
     * This is not provenance and does not pretend to be. It cannot survive a
     * rename of the thing it names and it resolves to nothing; that is why
     * `source_instance_id` exists beside it rather than instead of it. What it
     * IS is the only way to say "the resistance from Fiendish Legacy whose type
     * you have not chosen" to a user, and the sheet has no other way to name an
     * effect at all — the old model borrowed the trait row's `name`, which is
     * precisely the coupling being removed here.
     *
     * NOT NULL rather than nullable, because an effect nobody can name is an
     * effect nobody can find to edit or delete. `''` would be a null in
     * costume, which is what `nonEmptyText` in the row contract refuses.
     */
    label: varchar()('label').notNull(),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * The identical per-kind constraints `species_template_trait_effects`
     * carries, and identical ON PURPOSE: the copy from catalog to character is
     * column-wise, so a rule that held for the catalog row and not for the
     * character's would let the copy itself produce a row the schema refuses.
     * `IS`/`IS NOT` rather than `=`/`<>` for the reason stated at length there.
     */
    check('character_effects_kind_check', oneOf('effect_kind', effectKinds)),
    check(
      'character_effects_damage_type_kind_check',
      sql`damage_type IS NULL OR effect_kind IS 'damage_resistance'`,
    ),
    check(
      'character_effects_hit_points_kind_check',
      sql`(hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'`,
    ),
    check(
      'character_effects_speed_kind_check',
      sql`speed_bonus_feet IS NULL OR effect_kind IS 'speed'`,
    ),
    check(
      'character_effects_hp_modifier_payload_check',
      sql`effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL`,
    ),
    check(
      'character_effects_speed_payload_check',
      sql`effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL`,
    ),
    check(
      'character_effects_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    index('character_effects_character_id_index').on(table.character_id),
    foreignKey({
      columns: [table.source_instance_id, table.character_id],
      foreignColumns: [
        character_source_instances.id,
        character_source_instances.character_id,
      ],
    }).onDelete('cascade'),
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
