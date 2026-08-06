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
  ArmorTemplateId,
  BackgroundEquipmentItemId,
  BackgroundTemplateEffectId,
  BackgroundTemplateId,
  CharacterBackgroundId,
  CharacterEffectId,
  CharacterId,
  CharacterItemId,
  CharacterSpeciesId,
  CharacterSpeciesTraitId,
  CharacterWeaponId,
  ContentKey,
  SourceInstanceId,
  SpeciesTemplateId,
  SpeciesTemplateTraitEffectId,
  SpeciesTemplateTraitId,
  WeaponTemplateId,
} from '../../src/domain/ids';
import type {
  Ability,
  BackgroundEquipmentOption,
  CharacterEffectKind,
  CreatureSize,
  CreatureType,
  DamageType,
  EquipmentItemKind,
  ExtraAttackWeaponScope,
  RulesEdition,
  SpeciesTemplateEffectKind,
} from '../../src/domain/enums';
import {
  abilities,
  backgroundEquipmentOptions,
  characterEffectKinds,
  equipmentItemKinds,
  extraAttackWeaponScopes,
  rulesEditions,
  speciesTemplateEffectKinds,
} from '../../src/domain/enums';
import {
  datetime,
  equipmentItemPayload,
  integerAtLeast,
  nullOrIntegerAtLeast,
  nullOrOneOf,
  oneOf,
  sqlText,
  tinyint1,
  varchar,
} from './columns';
import { catalog_content_identities } from './catalog-content';
import { feat_definitions } from './catalog-sources';
import {
  characterEffectColumns,
  featureEffectChecks,
} from './catalog-classes';
import { character_source_instances, characters } from './character';
import { character_items } from './items';
import { armor_templates } from './sheet';
import { character_weapons, weapon_templates } from './weapons';

/**
 * ORIGINS: species and backgrounds, and the character's own EFFECTS. Nine
 * tables, inventoried alongside every other table in
 * `tests/unit/schema.test.ts`.
 *
 * The catalog declarations and character rows remain separate on purpose.
 * `species_template_trait_effects` declares what a CATALOG TEMPLATE GRANTS;
 * `character_effects` records what a CHARACTER HAS. Those are different
 * questions with different lifetimes, different portability rules and — the
 * decisive one — different meanings for the same null. Each table says so at
 * its own declaration.
 *
 * WHY THESE ARE NEW TABLES AND NOT COLUMNS ON `species_definitions`. The
 * original reason was that widening it moved the frozen parity hash; that hash
 * is retired (D7, F10) and is no longer a reason for anything. The two reasons
 * that never depended on it are the ones that decide it:
 * `species_definitions`, `background_definitions` and
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
    content_key: varchar<ContentKey>()('content_key')
      .notNull()
      .references(() => catalog_content_identities.content_key),
    rules_edition: varchar<RulesEdition>()('rules_edition')
      .notNull()
      .default('2024'),
    name: varchar()('name').notNull(),
    /**
     * Closed HERE: this catalog is written only by the bundled SRD seeder.
     * The character copy below uses the open `CreatureType`, so editing the
     * copied species to a homebrew type still preserves the user's value.
     */
    creature_type: varchar<CreatureType>()('creature_type').notNull(),
    /**
     * The size word only — `Medium`, `Small` — never the printed height range.
     * The heights are flavour and are deliberately not modelled.
     *
     * Closed over all SIX SRD sizes, not only the two used by the nine bundled
     * species. This table is seeder-only; the editable character copy below
     * uses the open `CreatureSize` and has no CHECK.
     */
    size: varchar<CreatureSize>()('size').notNull(),
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
    alternate_size: varchar<CreatureSize>()('alternate_size'),
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
    index('species_templates_name_rules_edition_index').on(
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
    effect_kind:
      varchar<CharacterEffectKind>()('effect_kind').notNull(),
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
     * Open HERE because the table also stores authored species. Known values
     * remain UI suggestions; authored spelling is stored byte-for-byte.
     */
    damage_type: varchar<DamageType>()('damage_type'),
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
     * the same call `weapon_templates.range_near_feet` makes ("a Longsword
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
    ability: varchar<Ability>()('ability'),
    amount: integer('amount'),
    maximum: integer('maximum'),
    base: integer('base'),
    ability_1: varchar<Ability>()('ability_1'),
    ability_2: varchar<Ability>()('ability_2'),
    allows_shield: tinyint1('allows_shield'),
    weapon_scope:
      varchar<ExtraAttackWeaponScope>()('weapon_scope'),
    label: varchar()('label').notNull(),
    notes: sqlText()('notes'),
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
    ...featureEffectChecks(
      'species_template_trait_effects',
      characterEffectKinds,
      'known-plus-passthrough',
      false,
    ),
    /* Kind ownership, payload completeness, and numeric ranges are shared by
     * the common helper above; its damage policy is intentionally per-table. */
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
    creature_type: varchar<CreatureType>()('creature_type'),
    size: varchar<CreatureSize>()('size'),
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
    /**
     * `CharacterEffectKind`, shared with authorable species/background
     * declarations. Feature templates use their own superset because only
     * those may declare `extra_attack`.
     */
    effect_kind: varchar<CharacterEffectKind>()('effect_kind').notNull(),
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
    damage_type: varchar<DamageType>()('damage_type'),
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
     * THREE KINDS SHARE THIS COLUMN NOW — `ability_increase`'S ORIGINAL
     * PAYLOAD (D63, B2: which ability, a signed non-zero `amount`, and the
     * increase's OWN `maximum`), `ability_override`'s D83 SET target, AND
     * `attack_ability_override`'s (D72: the
     * ability a weapon-scoped attack uses instead of the printed one — Pact of
     * the Blade). Reused rather than given a second column, per the dispatch's
     * own instruction: the two are the same shape — "one ability, closed six"
     * — and a second column would be F22's duplication for no different rule.
     * `amount` stays `ability_increase`-only. `maximum` is shared with
     * `ability_override` because both values are absolute ability-score
     * values bounded 1..30; for the override it means SET TO, not a cap.
     * Keeping it out of `amount` preserves the additive/SET distinction in
     * the row shape itself.
     *
     * All three nullable on D6b limb 2 — a resistance does not HAVE an
     * ability — with the CHECKs below making a row of one of these two kinds
     * without its own required subset unrepresentable, and a row of any other
     * kind with any of them unrepresentable.
     *
     * For `ability_increase`, `maximum` is per-CONTRIBUTION because the sources genuinely differ:
     * background increases stop at 20 (`docs/srd/source/backgrounds.txt:51`),
     * ASI feats at 20 (`feats.txt:67`), Epic Boons at 30. It is bounded 1–30
     * `ability_override` reuses that same range because its target becomes the
     * resolved score. It is CHARACTER-ONLY: no feature-template effect CHECK
     * is widened by D83 because the shipped corpus has no authorable feat or
     * species needing SET-to-score.
     *
     * Both uses are bounded 1–30 because `AbilityScore` throws outside that range
     * (`src/rules/ability-score.ts:4-13`) — a stored `max 32` on a high base
     * would drive a resolved total past 30 and turn a sheet into a stack
     * trace. `amount` is non-zero because a zero contribution is not a
     * contribution; it is a row that changes nothing and can never be noticed.
     */
    ability: varchar<Ability>()('ability'),
    /**
     * FOUR KINDS SHARE THIS COLUMN NOW (AC-1): `ability_increase`'s signed
     * contribution (unchanged), `armor_class_bonus`'s flat addend (Cloak of
     * the Armadillo, Ring of Shell), and `weapon_attack_bonus` /
     * `weapon_damage_bonus`'s flat weapon-scoped bonuses (a +1 weapon; a flat
     * damage bonus). All four are "one signed non-zero integer"; the CHECK
     * below stays `amount <> 0` for every one of them — a +0 bonus changes
     * nothing and can never be noticed, the same argument `ability_increase`
     * already made.
     */
    amount: integer('amount'),
    maximum: integer('maximum'),
    /**
     * THE `armor_class_formula` PAYLOAD (AC-1, D72, D74, D75): the flat base
     * (10 for the default floor, 13 for the Armadillo species, and so on) plus
     * up to two ability modifiers and whether a shield may be carried at all.
     * The floor formula (base 10, `ability_1` dexterity, `allows_shield` true)
     * is not stored anywhere — D75 makes it the resolver's own default,
     * AC-3's job — these columns exist only for formulas a source actually
     * grants.
     *
     * `ability_1` is REQUIRED wherever `base` is (every formula uses at least
     * one ability — the floor uses DEX alone); `ability_2` stays nullable
     * because a formula may use only one (Armadillo species: 13 + DEX) or two
     * (Monk: 10 + DEX + WIS; the Armadillo Paladin: 10 + CON + CHA).
     * `allows_shield` is a plain boolean and NOT nullable once the kind is
     * `armor_class_formula` — D75 needs an explicit true or false for every
     * formula in the competition, never an absence standing in for either.
     */
    base: integer('base'),
    ability_1: varchar<Ability>()('ability_1'),
    ability_2: varchar<Ability>()('ability_2'),
    allows_shield: tinyint1('allows_shield'),
    /**
     * THE WEAPON SCOPE (AC-1, D72), shared by THREE kinds:
     * `attack_ability_override`, `weapon_attack_bonus`, `weapon_damage_bonus`.
     * Deliberately typed `ExtraAttackWeaponScope` and not a second, new
     * vocabulary — `subclass_feature_effects.weapon_scope` /
     * `named_feature_effects.weapon_scope` already model exactly this
     * question ("does this reach every weapon, or one bonded/pact weapon this
     * application cannot resolve to a specific row") for Extra Attack grants,
     * and a modifier scoped the same way is the same question asked about a
     * different number. Reusing the array is the D72 "one vocabulary" rule
     * applied to a case the plan's own table did not spell out by name.
     */
    weapon_scope: varchar<ExtraAttackWeaponScope>()('weapon_scope'),
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
     * THE CHARACTER-OWNED ITEM OR WEAPON THAT GRANTS THIS EFFECT (AC-2b).
     *
     * Both are nullable because most effects come from a class, subclass,
     * species, feat, background, or a manual entry. They are independent:
     * Staff of the Armadillo is a weapon and may own an Armor Class bonus,
     * while Cloak of the Armadillo is an item. The composite references carry
     * `character_id` so an effect cannot name another character's equipment.
     * ON DELETE CASCADE makes the equipment row the lifecycle owner.
     */
    character_item_id: integer('character_item_id').$type<CharacterItemId>(),
    character_weapon_id: integer('character_weapon_id')
      .$type<CharacterWeaponId>(),
    /**
     * Stable identity of a generated template row. Hand-written effects leave
     * this NULL; command-side re-sync replaces only non-NULL rows.
     */
    template_ref: sqlText()('template_ref'),
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
    check(
      'character_effects_kind_check',
      oneOf('effect_kind', characterEffectKinds),
    ),
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
    /**
     * The `ability_increase` constraints (D63, B2), in the same two directions
     * as every kind above — payload columns belong to the kind, and the kind
     * requires its payload — plus one the other kinds do not have: THE KIND
     * REQUIRES A SOURCE. `source_instance_id` is nullable in general and
     * guided species copying writes NULL, so without the source CHECK a
     * contribution that forgot where it came from would be a stored row rather
     * than a refused one — and D63's "base plus contributions that know their
     * source" would be a convention, not an invariant.
     */
    check(
      'character_effects_ability_check',
      nullOrOneOf('ability', abilities),
    ),
    /**
     * WIDENED (AC-1): `ability` is now also `attack_ability_override`'s
     * payload — see the column's own comment for why the two kinds share it
     * rather than getting a second column each.
     */
    check(
      'character_effects_ability_kind_check',
      sql`ability IS NULL OR effect_kind IN ('ability_increase', 'ability_override', 'attack_ability_override')`,
    ),
    /**
     * WIDENED (AC-1): `amount` is now also `armor_class_bonus`'s flat addend
     * and `weapon_attack_bonus` / `weapon_damage_bonus`'s flat weapon-scoped
     * bonuses — see the column's own comment.
     */
    check(
      'character_effects_amount_kind_check',
      sql`amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')`,
    ),
    check(
      'character_effects_maximum_kind_check',
      sql`maximum IS NULL OR effect_kind IN ('ability_increase', 'ability_override')`,
    ),
    check(
      'character_effects_ability_increase_payload_check',
      sql`effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)`,
    ),
    check(
      'character_effects_ability_increase_source_check',
      sql`effect_kind IS NOT 'ability_increase' OR source_instance_id IS NOT NULL`,
    ),
    check(
      'character_effects_ability_override_payload_check',
      sql`effect_kind IS NOT 'ability_override' OR (ability IS NOT NULL AND maximum IS NOT NULL)`,
    ),
    check(
      'character_effects_amount_check',
      sql`amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)`,
    ),
    check(
      'character_effects_maximum_check',
      sql`maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)`,
    ),
    /**
     * THE FIVE NEW (AC-1) KIND-SCOPE CHECKS, in the same "column belongs to
     * kind" direction every existing one above already uses.
     */
    check(
      'character_effects_base_kind_check',
      sql`base IS NULL OR effect_kind IS 'armor_class_formula'`,
    ),
    check(
      'character_effects_ability_1_kind_check',
      sql`ability_1 IS NULL OR effect_kind IS 'armor_class_formula'`,
    ),
    check(
      'character_effects_ability_2_kind_check',
      sql`ability_2 IS NULL OR effect_kind IS 'armor_class_formula'`,
    ),
    check(
      'character_effects_allows_shield_kind_check',
      sql`allows_shield IS NULL OR effect_kind IS 'armor_class_formula'`,
    ),
    check(
      'character_effects_weapon_scope_kind_check',
      sql`weapon_scope IS NULL OR effect_kind IN ('attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')`,
    ),
    /**
     * THE FIVE NEW (AC-1) "KIND REQUIRES ITS PAYLOAD" CHECKS — the other
     * direction, one per new kind. `armor_class_formula` requires `base` and
     * `ability_1` and `allows_shield`; `ability_2` stays optional (a formula
     * may use one ability or two — see the column's own comment).
     */
    check(
      'character_effects_armor_class_bonus_payload_check',
      sql`effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL`,
    ),
    check(
      'character_effects_armor_class_formula_payload_check',
      sql`effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)`,
    ),
    check(
      'character_effects_attack_ability_override_payload_check',
      sql`effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)`,
    ),
    check(
      'character_effects_weapon_attack_bonus_payload_check',
      sql`effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)`,
    ),
    check(
      'character_effects_weapon_damage_bonus_payload_check',
      sql`effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)`,
    ),
    /** The three new columns' own value-domain CHECKs. */
    check('character_effects_base_check', nullOrIntegerAtLeast('base', 1)),
    check(
      'character_effects_ability_1_check',
      nullOrOneOf('ability_1', abilities),
    ),
    check(
      'character_effects_ability_2_check',
      nullOrOneOf('ability_2', abilities),
    ),
    check(
      'character_effects_weapon_scope_check',
      nullOrOneOf('weapon_scope', extraAttackWeaponScopes),
    ),
    check(
      'character_effects_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    index('character_effects_character_id_index').on(table.character_id),
    index('character_effects_character_item_id_index').on(
      table.character_item_id,
    ),
    index('character_effects_character_weapon_id_index').on(
      table.character_weapon_id,
    ),
    foreignKey({
      columns: [table.source_instance_id, table.character_id],
      foreignColumns: [
        character_source_instances.id,
        character_source_instances.character_id,
      ],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.character_item_id, table.character_id],
      foreignColumns: [character_items.id, character_items.character_id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.character_weapon_id, table.character_id],
      foreignColumns: [character_weapons.id, character_weapons.character_id],
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
 * EVERY PRINTED COLUMN IS TEXT. The three abilities are NAMES,
 * not increases: "increase one by 2 and another one by 1, or increase all three
 * by 1" is a choice the user makes, and `characters.strength`..`charisma` are
 * values the user already owns and edits directly. D1b applied literally — the
 * template SUGGESTS and the character keeps the value. The feat keeps both its
 * printed NAME and its content-key relation: the name is display text (and can
 * include a printed option such as `Magic Initiate (Cleric)`), while the key is
 * the identity that export, copy/edit, and guided defaults follow. The grant
 * itself travels the existing `grant_source` rule on
 * `background_definitions.grant_rules`. The two skills remain printed text.
 */
export const background_templates = sqliteTable(
  'background_templates',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<BackgroundTemplateId>(),
    content_key: varchar<ContentKey>()('content_key')
      .notNull()
      .references(() => catalog_content_identities.content_key),
    rules_edition: varchar<RulesEdition>()('rules_edition')
      .notNull()
      .default('2024'),
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
    /**
     * The exact installed Origin feat represented by `feat_name`.
     *
     * Nullable only for a migrated legacy row whose old name cannot be mapped
     * uniquely. New bundled and authored writers always provide it. Keeping
     * that absence visible is safer than binding an ambiguous homebrew name.
     */
    default_origin_feat_content_key: varchar<ContentKey>()(
      'default_origin_feat_content_key',
    ).references(() => feat_definitions.content_key),
    skill_proficiency_1: varchar()('skill_proficiency_1').notNull(),
    skill_proficiency_2: varchar()('skill_proficiency_2').notNull(),
    /**
     * NOT NULL even though the Soldier's is "Choose one kind of Gaming Set":
     * the printed value IS that sentence, and storing it verbatim is what keeps
     * the row diffable against the extract. A `tool_is_choice` boolean would be
     * this project re-deciding what the document already wrote down.
     */
    tool_proficiency: varchar()('tool_proficiency').notNull(),
    /**
     * "Choose A or B" — both packages, PRINTED VERBATIM.
     *
     * NO LONGER "applied to nothing", and no longer the only record of the
     * package: `background_equipment_items` now holds each package as a list of
     * quantity-plus-item rows, parsed from these two strings. These columns
     * STAY, and staying is the decision. They are the D12/Q4 passthrough limb —
     * `Gaming Set (same as above)` is a back-reference to a choice made on
     * another line of the same row, `Parchment (10 sheets)` counts a SUB-UNIT
     * rather than the item, and `Book (prayers)` is a subject qualifier. None of
     * the three is a quantity, none survives a strict quantity-plus-name
     * reading, and all three survive here.
     *
     * So the structured rows are what a reader COMPUTES from and these are what
     * a reader PRINTS, which is the same division `spell_versions.range` and
     * `range_feet` have one table over.
     */
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
    index('background_templates_name_rules_edition_index').on(
      table.name,
      table.rules_edition,
    ),
  ],
);

/** Ordered numeric mechanics granted directly by an authored background. */
export const background_template_effects = sqliteTable(
  'background_template_effects',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<BackgroundTemplateEffectId>(),
    background_template_id: integer('background_template_id')
      .notNull()
      .$type<BackgroundTemplateId>()
      .references(() => background_templates.id, { onDelete: 'cascade' }),
    sort_order: integer('sort_order').notNull(),
    ...characterEffectColumns<CharacterEffectKind, DamageType>(),
    label: varchar()('label').notNull(),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    ...featureEffectChecks(
      'background_template_effects',
      characterEffectKinds,
      'known-plus-passthrough',
      false,
    ),
    check(
      'background_template_effects_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    uniqueIndex('background_template_effects_template_sort_unique').on(
      table.background_template_id,
      table.sort_order,
    ),
    index('background_template_effects_background_template_id_index').on(
      table.background_template_id,
    ),
  ],
);

/**
 * ONE PRINTED LINE OF ONE BACKGROUND'S EQUIPMENT PACKAGE — the owner's ruling
 * that *"background equipment packages should be templates for a list of
 * quantity + item (name only unless weapon or armor)"*.
 *
 * A CHILD TABLE KEYED BY (TEMPLATE, OPTION, SORT ORDER), AND THE OPTION IS PART
 * OF THE KEY RATHER THAN A THIRD AND FOURTH COLUMN ON THE PARENT. The printed
 * line is "Choose A or B", so a package is a LIST and a background has TWO of
 * them; two more columns on `background_templates` is the shape that does not
 * survive a third option, and a list cannot live in a column at all.
 *
 * "NAME ONLY UNLESS WEAPON OR ARMOR", MADE STRUCTURAL. `item_kind` discriminates
 * and the payload CHECK below makes every other combination unstorable, so a
 * `weapon` line with no weapon and a `gear` line carrying an armour reference
 * are both refused by the database rather than caught by a reader.
 *
 * THE WEAPON AND ARMOUR LIMBS ARE REAL FOREIGN KEYS, AND D1b PERMITS IT.
 * `weapon_templates` and `armor_templates` both exist and both are CATALOG
 * tables, and so is this one — D1b's rule is that a CHARACTER stores values
 * with no live link back to a template, and nothing here is a character.
 * Nothing in this repository copies a background template onto a character
 * today (the species side has `speciesFromTemplate`; the background side has no
 * equivalent), and when that path is built it must read THROUGH this reference
 * and write values, exactly as the species copy does.
 *
 * NAMES ARE NOT MATCHED. The links are hand-DECLARED in
 * `src/rules/origins-srd.ts` and checked in both directions against the parse —
 * a declared link naming an item the extract does not print fails the seed, and
 * so does a content key `weapon_templates` does not hold. D15 refused deciding a
 * mechanical fact by matching text and this does not do it: `2 Daggers` is
 * plural and `Gaming Set (same as above)` is not an item name at all, so a
 * name-matching resolver would either miss the first or invent the second.
 *
 * BOOTSTRAP ORDER IS NOW LOAD-BEARING and `src/db/bootstrap.ts` says so: the
 * weapon and armour catalogs must be seeded before the origins catalog, or a
 * declared link has nothing to resolve against and the seed fails loudly.
 */
export const background_equipment_items = sqliteTable(
  'background_equipment_items',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<BackgroundEquipmentItemId>(),
    background_template_id: integer('background_template_id')
      .notNull()
      .$type<BackgroundTemplateId>()
      .references(() => background_templates.id, { onDelete: 'cascade' }),
    /** `a` or `b` — which of the two printed packages this line belongs to. */
    option: varchar<BackgroundEquipmentOption>()('option').notNull(),
    /** Printed order within the package, 1-based. */
    sort_order: integer('sort_order').notNull(),
    /**
     * HOW MANY, AND IT IS THE COUNT OF THE NAMED ITEM ONLY.
     *
     * `2 Daggers` is quantity 2, `20 Arrows` is quantity 20, and a line with no
     * leading numeral is quantity 1. `Parchment (10 sheets)` IS QUANTITY 1 — the
     * 10 counts sheets, a sub-unit, not parchments — and that distinction is
     * the reason this column is not simply "the first number on the line".
     *
     * A printed money line is ALSO quantity 1: `50 GP` is one textual package
     * line, on the same terms as a bedroll. Reading it as quantity 50 of an item
     * named `GP` would turn currency into tracked inventory, which D40 rejects.
     */
    quantity: integer('quantity').notNull(),
    /**
     * THE PRINTED NAME, VERBATIM, MINUS ONLY A LEADING QUANTITY. `Daggers`
     * stays plural, `Gaming Set (same as above)` keeps its back-reference and a
     * money line keeps its whole printed text (`50 GP`). Nothing is
     * singularised, expanded or resolved — the row beside it carries whatever
     * this application actually knows.
     */
    item_name: varchar()('item_name').notNull(),
    item_kind: varchar<EquipmentItemKind>()('item_kind').notNull(),
    weapon_template_id: integer('weapon_template_id')
      .$type<WeaponTemplateId>()
      .references(() => weapon_templates.id, { onDelete: 'restrict' }),
    armor_template_id: integer('armor_template_id')
      .$type<ArmorTemplateId>()
      .references(() => armor_templates.id, { onDelete: 'restrict' }),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'background_equipment_items_option_check',
      oneOf('option', backgroundEquipmentOptions),
    ),
    check(
      'background_equipment_items_item_kind_check',
      oneOf('item_kind', equipmentItemKinds),
    ),
    check(
      'background_equipment_items_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    check(
      'background_equipment_items_quantity_check',
      integerAtLeast('quantity', 1),
    ),
    /**
     * THE PAYLOAD CHECK — the constraint that makes `item_kind` mean something
     * rather than merely be recorded.
     *
     * Each structured kind names the ONE payload column it may carry and
     * requires the other one to be NULL. Without the negative half a gear row
     * could carry a weapon id as well, and a reader would have two answers to
     * "what is this line" with nothing to break the tie.
     *
     * `CASE … ELSE` RATHER THAN A CHAIN OF `IS` LIMBS: the `ELSE` arm is
     * `gear`, and it is also every value `item_kind` should not hold. So a row
     * whose kind is misspelled — refused by the CHECK above, but not on an
     * image created before these constraints existed (F11's point) — is still
     * required to carry no payload, rather than being handed the weapon limb by
     * a fall-through.
     */
    check(
      'background_equipment_items_payload_check',
      equipmentItemPayload(
        'item_kind',
        'weapon_template_id',
        'armor_template_id',
      ),
    ),
    uniqueIndex(
      'background_equipment_items_template_option_sort_order_unique',
    ).on(table.background_template_id, table.option, table.sort_order),
    index('background_equipment_items_background_template_id_index').on(
      table.background_template_id,
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
