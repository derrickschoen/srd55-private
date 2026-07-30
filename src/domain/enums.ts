export const abilities = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;
export type Ability = (typeof abilities)[number];

/**
 * How a character's six base ability scores were allocated (D64). NULL in the
 * column means never allocated — the method doubles as the allocation signal,
 * so there is no second thing to keep in step.
 *
 * The seam (`src/builder/contracts.ts`) declares the same union as
 * `AbilityAllocationMethod`; the seam is supervisor-owned, so the runtime
 * vocabulary lives here and `src/builder/guided-creation.ts` proves the two
 * identical at compile time.
 */
export const abilityAllocationMethods = [
  'standard_array',
  'point_buy',
  'manual',
] as const;
export type KnownAbilityAllocationMethod =
  (typeof abilityAllocationMethods)[number];

export const progressionTypes = [
  'full',
  'half_up',
  'half_down',
  'third_up',
  'third_down',
  'pact',
  'none',
] as const;
export type ProgressionType = (typeof progressionTypes)[number];

export const rulesEditions = ['2014', '2024', 'expanded'] as const;
export type RulesEdition = (typeof rulesEditions)[number];

/** Every level a feat prerequisite can name in the 1–20 character ladder. */
export const characterLevels = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const;
export type CharacterLevel = (typeof characterLevels)[number];

/**
 * Ability-score points carried by one feat.
 *
 * This is points rather than increases: 2 can mean either one +2 or two +1s.
 */
export const featAbilityPoints = [0, 1, 2] as const;
export type FeatAbilityPoints = (typeof featAbilityPoints)[number];

/**
 * The one grouping the product needs to distinguish on bundled feats.
 *
 * Open for homebrew on the same known-plus-passthrough terms as spell schools:
 * a user-authored grouping must survive even though bundled content writes only
 * `origin`.
 */
export type FeatGrouping =
  | 'origin'
  | PassthroughVocabulary<'FeatGrouping'>;

export const slotBuckets = [
  'cantrip_known',
  'prepared',
  'known',
  'spellbook',
  'automatic',
] as const;
export type SlotBucket = (typeof slotBuckets)[number];

export const duplicateCategories = [
  'none',
  'conflicting_version',
  'wasteful',
  'redundant_intentional',
] as const;
export type DuplicateCategory = (typeof duplicateCategories)[number];

export const grantRuleKinds = [
  'fixed_spell',
  'choice_from_list',
  'choice_from_query',
  'grant_source',
  'capability',
  'spellbook_acquisition',
  'fighting_style',
  'weapon_mastery',
  'skill_proficiency',
] as const;
export type GrantRuleKind = (typeof grantRuleKinds)[number];

export const slotStates = [
  'active',
  'orphaned',
  'discarded',
  'kept_override',
] as const;
export type SlotState = (typeof slotStates)[number];

/**
 * The lifecycle of one skill grant (`character_skill_grants.state`).
 *
 * TWO members, not `slotStates`' four: a skill grant has no fixed/`discarded`
 * variant and no `kept_override` — the only lifecycle event a grant has is its
 * source tombstoning, which orphans it, and reactivation, which revives it
 * (plan §3.8). Sharing `slotStates` would let a writer store `discarded` on a
 * row no reader ever counts, which is the silent-disable failure the slot
 * state's own CHECK comment warns about.
 */
export const skillGrantStates = ['active', 'orphaned'] as const;
export type SkillGrantState = (typeof skillGrantStates)[number];

export const selectionEligibilities = [
  'valid',
  'invalid',
  'unselected',
] as const;
export type SelectionEligibility = (typeof selectionEligibilities)[number];

export const castingModes = [
  'at_will',
  'slots_and_free_cast',
  'with_slots',
  'free_cast_only',
  'granted',
  'ritual_only',
  'available_on_long_rest',
] as const;
export type CastingMode = (typeof castingModes)[number];

export const domainSourceTypes = [
  'class',
  'subclass',
  'feat',
  'species',
  'background',
] as const;
export type DomainSourceType = (typeof domainSourceTypes)[number];
export type AddableSourceType = Exclude<DomainSourceType, 'subclass'>;
export type StandaloneSourceType = Extract<
  DomainSourceType,
  'feat' | 'species' | 'background'
>;

/**
 * The eight weapon mastery properties, taken from the mastery column of
 * `docs/srd/source/weapons-table.txt` rather than from anyone's memory. All
 * eight appear there, so the list is closed on evidence.
 *
 * The NAME is modelled and displayed. What each property DOES is rules text
 * this application deliberately does not import (D3): recording a choice does
 * not require rendering its effect.
 */
export const weaponMasteryProperties = [
  'Cleave',
  'Graze',
  'Nick',
  'Push',
  'Sap',
  'Slow',
  'Topple',
  'Vex',
] as const;
export type WeaponMasteryProperty = (typeof weaponMasteryProperties)[number];

/**
 * What this application knows about one class's Weapon Mastery allowance.
 *
 * `counts_unsourced` is the load-bearing member: the class grants the feature
 * and we do NOT hold its numbers. Collapsing it into `not_granted`, or seeding
 * a plausible number in its place, is the silent-wrong this vocabulary exists
 * to prevent.
 */
export const weaponMasteryGrants = [
  'not_granted',
  'counts_known',
  'counts_unsourced',
] as const;
export type WeaponMasteryGrant = (typeof weaponMasteryGrants)[number];

/**
 * The four headings the source's own weapons table uses. A picker grouping on
 * the catalog row only; never copied onto a character's weapon.
 */
export const srdWeaponGroups = [
  'simple_melee',
  'simple_ranged',
  'martial_melee',
  'martial_ranged',
] as const;
export type SrdWeaponGroup = (typeof srdWeaponGroups)[number];

/**
 * Whether a character-owned weapon uses the melee or ranged attack formula.
 *
 * The character copy stores this as a value, never as a template reference.
 * `null` is the third state at use sites: NOT RECORDED, with no fallback from
 * range or property columns.
 */
export const weaponAttackKinds = ['melee', 'ranged'] as const;
export type WeaponAttackKind = (typeof weaponAttackKinds)[number];

/**
 * The eighteen skills, from the Skills table in
 * `docs/srd/source/skills-table.txt`. That table is the source that CLOSES this
 * vocabulary, and it had to be extracted for the purpose.
 *
 * DO NOT CLOSE THIS SET FROM THE CLASS LISTS. The twelve Core Traits tables
 * between them name only seventeen of these — `performance` appears in no
 * class's skill list at all. A set "closed on evidence" the way
 * `weaponMasteryProperties` is closed would have been seventeen skills and
 * silently wrong, and nothing would have failed. It is closed on the printed
 * SKILLS TABLE instead, which is the list the rules actually define.
 *
 * Snake case rather than the source's display casing, unlike
 * `weaponMasteryProperties`: `Sleight of Hand` and `Animal Handling` contain
 * spaces, and `enumLiteral` in `db/schema/columns.ts` refuses a value that is
 * not a bare identifier — a CHECK constraint cannot hold it. `SKILL_LABELS` in
 * `src/rules/skills.ts` carries the display strings.
 */
export const skills = [
  'acrobatics',
  'animal_handling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleight_of_hand',
  'stealth',
  'survival',
] as const;
export type Skill = (typeof skills)[number];

/**
 * The four headings of the source's own Armor table
 * (`docs/srd/source/armor-table.txt`). `shield` is a category there, not a
 * separate concept, and keeping it one makes `armor_templates` a faithful
 * image of the extract's thirteen rows.
 */
export const armorCategories = ['light', 'medium', 'heavy', 'shield'] as const;
export type ArmorCategory = (typeof armorCategories)[number];

/**
 * How a piece of armour combines the wearer's Dexterity modifier.
 *
 * THREE MEMBERS, NOT A NUMERIC CAP, AND THE THIRD IS WHY. Modelling Heavy
 * armour as "cap of 0" is wrong and quietly costs a character AC: `min(dexMod,
 * 0)` SUBTRACTS for a negative modifier, so a Dexterity 6 character in Chain
 * Mail would come out at 14 when the table says a flat 16. `none` means the
 * Dexterity modifier is not part of the calculation at all, which is what the
 * Heavy rows of the table actually print.
 */
export const armorDexBonuses = ['full', 'capped', 'none'] as const;
export type ArmorDexBonus = (typeof armorDexBonuses)[number];

/**
 * WHERE A CHARACTER PUT A PIECE OF ARMOUR — not what it is.
 *
 * Two members because a body wears one thing and holds one thing, which is the
 * cardinality `character_armor`'s unique index encodes. This is DELIBERATELY
 * NOT `ArmorCategory`: `armorClass` in `src/rules/sheet.ts` decides what a row
 * contributes from its `category` alone, and emits `armor_slot_mismatch` when
 * the slot disagrees. Deriving one from the other would make a crossed pair
 * unrepresentable and so silently discard an imported character that carried
 * one, instead of accepting it and saying so (D11 part 2).
 */
export const armorSlots = ['worn', 'shield'] as const;
export type ArmorSlot = (typeof armorSlots)[number];

/* ==========================================================================
 * OPEN SRD VOCABULARIES
 * ========================================================================== */

/**
 * A KNOWN SET WITH A PASSTHROUGH LIMB.
 *
 * This repository already used the D12/Q4 shape for structured text, but only
 * as TWO COLUMNS: the raw spell `range` survives beside the recognised
 * `range_kind`. There was no scalar open-vocabulary type to reuse. This is the
 * one scalar pattern for all five vocabularies below.
 *
 * Known literals remain literals, so switches and pickers can reason about the
 * SRD set. An unknown string must cross an explicit decoder and receives a
 * vocabulary-specific brand, so a custom damage type cannot be passed where a
 * custom school belongs merely because both are strings. The brand changes no
 * stored value; the passthrough is byte-for-byte.
 */
export declare const passthroughVocabulary: unique symbol;
export type PassthroughVocabulary<Name extends string> = string & {
  readonly [passthroughVocabulary]: Name;
};

/**
 * The eight schools in the SRD 5.2.1 Schools of Magic table.
 *
 * OPEN because `CatalogRecord.school` comes from a user-imported catalog
 * document (`src/catalog/catalog-schema.ts`), including the committed homebrew
 * fixtures. Closing the database column would reject a homebrew school.
 */
export const spellSchools = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
] as const;
export type KnownSpellSchool = (typeof spellSchools)[number];
export type SpellSchool =
  | KnownSpellSchool
  | PassthroughVocabulary<'SpellSchool'>;
export const spellSchool = (value: string): SpellSchool =>
  value as SpellSchool;

/** The thirteen entries in the SRD 5.2.1 Damage Types table. */
export const damageTypes = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
] as const;
export type KnownDamageType = (typeof damageTypes)[number];
export type DamageType =
  | KnownDamageType
  | PassthroughVocabulary<'DamageType'>;
export const damageType = (value: string): DamageType =>
  value as DamageType;

/** The fifteen conditions named by the SRD 5.2.1 Condition glossary entry. */
export const conditionTypes = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
] as const;
export type KnownConditionType = (typeof conditionTypes)[number];
export type ConditionType =
  | KnownConditionType
  | PassthroughVocabulary<'ConditionType'>;
export const conditionType = (value: string): ConditionType =>
  value as ConditionType;

/** The fourteen entries in the SRD 5.2.1 Creature Type glossary entry. */
export const creatureTypes = [
  'Aberration',
  'Beast',
  'Celestial',
  'Construct',
  'Dragon',
  'Elemental',
  'Fey',
  'Fiend',
  'Giant',
  'Humanoid',
  'Monstrosity',
  'Ooze',
  'Plant',
  'Undead',
] as const;
export type KnownCreatureType = (typeof creatureTypes)[number];
export type CreatureType =
  | KnownCreatureType
  | PassthroughVocabulary<'CreatureType'>;
export const creatureType = (value: string): CreatureType =>
  value as CreatureType;

/** The six categories in the SRD 5.2.1 Size glossary entry. */
export const creatureSizes = [
  'Tiny',
  'Small',
  'Medium',
  'Large',
  'Huge',
  'Gargantuan',
] as const;
export type KnownCreatureSize = (typeof creatureSizes)[number];
export type CreatureSize =
  | KnownCreatureSize
  | PassthroughVocabulary<'CreatureSize'>;
export const creatureSize = (value: string): CreatureSize =>
  value as CreatureSize;

/**
 * The two weapon-proficiency categories the Core Traits tables name.
 *
 * NOT the whole story on its own, and `class_weapon_proficiencies` carries a
 * qualifier column for that reason: the Monk has "Martial weapons that have the
 * Light property" and the Rogue "Martial weapons that have the Finesse or Light
 * property". A bare `simple | martial` pair is a lie about two of twelve
 * classes.
 */
export const weaponProficiencyCategories = ['simple', 'martial'] as const;
export type WeaponProficiencyCategory =
  (typeof weaponProficiencyCategories)[number];

/**
 * Where the skill a class grants ON MULTICLASS ENTRY may be chosen FROM.
 *
 * Three members because the source prints three shapes, and the third is why a
 * boolean would not do. From `docs/srd/source/multiclass-entry-grants.txt`:
 *
 *  - `none` — nine classes grant no skill on entry at all;
 *  - `class_list` — the Ranger's "one skill of your choice FROM THE RANGER'S
 *    SKILL LIST" (L116-117) and the Rogue's identical clause (L128-129), both
 *    of which resolve against that class's own `class_skill_options` rows;
 *  - `any` — the Bard's "one skill of your choice" (L37-38), with NO
 *    class-list qualifier, drawn from the whole Skills table.
 *
 * THE BARD IS WHY THIS IS NOT A FLAG ON `class_skill_options`. Its entry grant
 * is not a subset of its own options — the Bard HAS no options rows, because
 * its Core Traits table prints "Choose any 3 skills" with no list. A per-row
 * flag can express a subset and nothing else, so the pool has to be a scalar
 * beside the count. `none` carries a count of 0 and the CHECK on
 * `class_sheet_traits` ties the two together, so "pool none, count 1" and
 * "pool any, count 0" are both unstorable.
 */
export const multiclassSkillPools = ['none', 'class_list', 'any'] as const;
export type MulticlassSkillPool = (typeof multiclassSkillPools)[number];

/* ==========================================================================
 * DICE
 * ========================================================================== */

/**
 * THE DIE VOCABULARY. The owner's own list, verbatim: *"Do we have an enum for
 * dice type? We only should have 4,6,8,10,12,20,100."*
 *
 * Until this existed the set lived ONCE, as a loop literal in a UI file
 * (`src/ui/screens/planner/dice.ts`), and four other places re-stated a
 * different subset of it by hand. F12 named that; this is the type it asked
 * for.
 *
 * NO SRD FILE CLOSES THIS SET AND NONE COULD. `docs/srd/source/` is class,
 * weapon and species content — it prints the dice that particular rules USE, so
 * it can close `hitDieSizes` and `martialArtsDieSizes` below but never the
 * vocabulary itself. This list is therefore the OWNER'S, and is recorded as
 * such rather than dressed up with a citation it does not have. `d2` and `d3`
 * are absent because the owner left them out; that is a judgement, not a
 * sourcing claim.
 *
 * NOT A SIZE, AND SO NOT THIS TYPE — three things that look like they belong
 * here and do not:
 *
 *  - A DAMAGE VALUE. `WeaponDamage` distinguishes rolled dice, a flat number,
 *    custom text, and an unrecorded value. The source's own Blowgun does `1`
 *    damage with no die at all (`docs/srd/source/weapons-table.txt:46`),
 *    Shillelagh's level-17 step is `2d6`
 *    (`weapon-attack-cantrips.txt:53-54`) and True Strike varies the COUNT at a
 *    fixed d6 (`:29`). A size cannot hold any of the three.
 *  - A ROLLED FACE. `character_hit_point_rolls.rolled_value` is 1..12 from
 *    `SHEET_ROLL_BOUNDS`; its ceiling merely HAPPENS to equal a die size.
 *  - A COUNT of dice. `DiceConfig.basicDice` is 1..20 and is not a vocabulary.
 *
 * @see hitDieSizes for the sourced subset a class's Hit Point Die may take.
 */
export const dieSizes = [4, 6, 8, 10, 12, 20, 100] as const;
export type DieSize = (typeof dieSizes)[number];

/**
 * THE HIT DIE — the size printed in a class's Core Traits row.
 *
 * `docs/srd/source/class-core-traits.txt` prints twelve classes and four sizes:
 * D12 Barbarian (L21); D10 Fighter, Paladin, Ranger (L125, L176, L202); D8
 * Bard, Cleric, Druid, Monk, Rogue, Warlock (L46, L72, L99, L151, L229, L279);
 * D6 Sorcerer, Wizard (L255, L306). No class has a d4 and none has a d20, so
 * this is CLOSED ON EVIDENCE the way `weaponMasteryProperties` is — not on a
 * memory of the game.
 *
 * `satisfies readonly DieSize[]` IS THE SUBSET RELATION, STATED. Writing `7`
 * here does not compile, and neither does a size the vocabulary above does not
 * contain. That is the whole reason the two lists are declared in one file.
 */
export const hitDieSizes = [6, 8, 10, 12] as const satisfies readonly DieSize[];
export type HitDieSize = (typeof hitDieSizes)[number];

/**
 * THE MONK'S MARTIAL ARTS DIE — a DIFFERENT SUBJECT with, as it happens, the
 * same four members.
 *
 * `docs/srd/source/attack-class-features.txt:15-35` is the whole twenty-row
 * Martial Arts column: 1d6 at levels 1-4, 1d8 at 5-10, 1d10 at 11-16, 1d12 at
 * 17-20. Counted from the extract rather than recalled — those twenty rows hold
 * four `1d6`, six `1d8`, six `1d10` and four `1d12`, and the string `1d4` does
 * not occur ANYWHERE in the file. L52 states the feature's floor in prose as
 * well: "You can roll 1d6 in place of the normal damage".
 *
 * **THE 4 THAT WAS HERE UNTIL NOW WAS UNSOURCED.** Both the CHECK on
 * `class_martial_arts_dice` and the parse guard in `class-traits-srd.ts`
 * admitted `4`, which is the 2014 edition's level-1 Monk die and is not in the
 * bundled 5.2 extract. F12 read the two CHECKs as differing legitimately by
 * that value; measured against the source they do not — they differ by exactly
 * the one value neither subject has. The CHECK's own stated purpose is that "a
 * mis-parse fails the seed instead of writing twelve plausible-looking wrong
 * rows", and an extra rung at the bottom of the ladder defeats it at the first
 * row of the table.
 *
 * **STILL A SEPARATE DECLARATION FROM `hitDieSizes`, AND F12 IS RIGHT ABOUT
 * THAT.** Two lists with equal members are not one list. A d20 hit die and a
 * d20 Martial Arts die would be wrong for different reasons, they are sourced
 * from different tables, and if 2014-edition content is ever bundled this one
 * gains a `4` while the other does not. Merging them would make that a shared
 * edit.
 *
 * **THE LIMIT OF THIS, SAID PLAINLY.** TypeScript is structural, so
 * `HitDieSize` and `MartialArtsDieSize` are the same type today and mixing them
 * up compiles. What `satisfies` buys is real and narrower: each list is checked
 * to be a subset of `DieSize`, and a typo in either fails to compile. Making
 * them nominally distinct needs a phantom brand on a numeric literal, which was
 * rejected — every construction site would need a cast, `$type<>()` would carry
 * a non-primitive into drizzle-zod's contract derivation, and the mix-up it
 * would catch cannot currently produce a wrong number, because the two sets are
 * member-for-member equal.
 */
export const martialArtsDieSizes = [
  6, 8, 10, 12,
] as const satisfies readonly DieSize[];
export type MartialArtsDieSize = (typeof martialArtsDieSizes)[number];

/**
 * Membership tests for the three lists above.
 *
 * Separate from {@link isEnumValue} because that one takes `readonly string[]`
 * and these vocabularies are integers — the same reason `oneOf` in
 * `db/schema/columns.ts` cannot build these CHECKs and `integerOneOf` exists
 * beside it.
 *
 * THESE ARE THE RUNTIME HALF OF THE TYPE, AND THEY ARE WHERE THE GUARD MOVED
 * TO. `fixedHitPointsPerLevel` used to test `hitDie >= 2` at the point of USE,
 * which admitted every integer and returned 4.5 hit points per level for a d7.
 * A closed parameter type makes that call a compile error, and the runtime
 * question — "is this integer off the disk actually a hit die?" — belongs at
 * the boundary where the untrusted integer arrives instead.
 */
export function isDieSize(candidate: number): candidate is DieSize {
  return (dieSizes as readonly number[]).includes(candidate);
}

export function isHitDieSize(candidate: number): candidate is HitDieSize {
  return (hitDieSizes as readonly number[]).includes(candidate);
}

export function isMartialArtsDieSize(
  candidate: number,
): candidate is MartialArtsDieSize {
  return (martialArtsDieSizes as readonly number[]).includes(candidate);
}

export const freeCastRecoveries = [
  'long_rest',
  'short_rest',
  'dawn',
  'at_will',
] as const;
export type FreeCastRecovery = (typeof freeCastRecoveries)[number];

export const freeCastPoolScopes = ['per_spell', 'shared'] as const;
export type FreeCastPoolScope = (typeof freeCastPoolScopes)[number];

/**
 * THE CLOSED SET OF MECHANICAL EFFECTS A CHARACTER CAN CARRY.
 *
 * NOT `speciesTraitEffectKinds`, AND THE RENAME IS THE POINT. The old name
 * encoded the defect this model was inverted to remove: an effect used to be a
 * group of five columns ON A SPECIES TRAIT ROW, so the vocabulary was named
 * after the only thing that could hold one. Effects now live in
 * `character_effects`, keyed on the CHARACTER and carrying a reference to
 * whatever granted them — a species trait today, a feat, a subclass or a
 * background tomorrow (`character_source_instances.source_type` already names
 * all five). Nothing about `damage_resistance` was ever specific to a species.
 *
 * THREE MEMBERS, AND `granted_spells` IS GONE. It was a marker with no payload
 * whose only output, `grantedSpellTraits`, had ZERO production consumers: the
 * spells themselves are minted from `species_definitions.grant_rules` by
 * `src/grants/` and surfaced with their provenance by
 * `src/access/spell-access-builder.ts`, which already answers "what cantrips,
 * and from where" through `SpellAccessRoute.casting_mode === 'at_will'`.
 * Keeping a second, parallel record of the same fact is the duplication
 * `src/rules/origins.ts` refuses in its own words ("Reuse before inventing"),
 * and deleting it is what DISSOLVES the Tiefling case rather than patching it:
 * Fiendish Legacy stops being a two-effect trait the moment the spell half is
 * not an effect, and becomes a plain `damage_resistance` with a null type —
 * structurally identical to the Dragonborn's, which is exactly the asymmetry
 * the pinned acceptance test complained about.
 *
 * The retirement is NOT a wire-format narrowing that can reject anything. A
 * share link minted before this build can legitimately carry
 * `effect_kind: 'granted_spells'` on a trait; `LEGACY_TRAIT_EFFECT_KINDS` in
 * `src/rules/legacy-trait-effects.ts` keeps that vocabulary readable forever
 * and DROPS the member on the way in. Rejecting it would make an existing link
 * undecodable, which is the data loss the codec exists to prevent.
 *
 * Adding a member is still a deliberate code change: a new value widens the
 * `effect_kind` CHECK on BOTH effect tables at the next `npm run db:schema`,
 * forces a new branch in `src/rules/species-effects.ts` (whose switch is
 * exhaustive over this union), and needs a payload column. Adding a TRAIT, by
 * contrast, is data — a line in `docs/srd/source/species-descriptions.txt`.
 *
 * WHY EXACTLY THESE THREE — two are borne out by the extract, one is not:
 *
 *  - `damage_resistance` — Dwarven Resilience (Poison), Dragonborn Damage
 *    Resistance and Tiefling Fiendish Legacy (both leave the type null,
 *    because in both cases the type is a choice the character has not made
 *    and the SOURCE ITSELF declines to name it).
 *  - `hp_modifier` — Dwarven Toughness, and only Dwarven Toughness, seeded
 *    `flat = 0, perLevel = 1` so the total is the character's LEVEL. The Orc's
 *    Adrenaline Rush grants TEMPORARY Hit Points, which are not Hit Point
 *    maximum; folding it in here would be wrong in a way nobody notices.
 *  - `speed` — NO SRD SPECIES TRAIT USES IT, which is reported rather than
 *    hidden. Base walking Speed is a species-template COLUMN, not a trait,
 *    because the source lists it under "Parts of a Species" beside Creature
 *    Type and Size. Every speed CHANGE the nine species print is temporary or
 *    conditional — Draconic Flight and Large Form are level-gated and
 *    time-limited, and the Wood Elf's 35 feet belongs to a lineage sub-choice —
 *    so none is a standing modifier. The member exists for a character's own
 *    hand-written traits, where a flat bonus is exactly what a user means.
 *
 * ONE TRAIT MAY NOW GRANT SEVERAL EFFECTS, AND THAT IS THE WHOLE INVERSION.
 * The old model's stated limit — "ONE EFFECT PER TRAIT — A LIMIT OF THE MODEL,
 * NOT A READING OF THE SOURCE" — is gone, not because the reading changed but
 * because an effect no longer hangs off a trait row. A catalog trait declares
 * a LIST of effects (`species_template_trait_effects`) and a character records
 * a LIST of effects (`character_effects`); "two effects" is no longer a special
 * case that needs a column to be stolen from one half or the other.
 */
/**
 * `ability_increase` — THE CONTRIBUTION LAYER (D63, B2).
 *
 * Base is what the player allocated; an ability increase is an ADDITIVE
 * contribution on top of it, carrying the ability, a signed non-zero amount and
 * its own maximum (backgrounds stop at 20, Epic Boons at 30 — the payload says
 * which, bounded 1–30 because `AbilityScore` throws outside that range).
 *
 * UNLIKE THE OTHER THREE KINDS, IT REQUIRES A NON-NULL `source_instance_id`,
 * enforced by a kind-specific CHECK on `character_effects`. The column is
 * nullable in general and guided species copying writes NULL, so without the
 * CHECK D63's "a contribution knows where it came from" would be a convention
 * rather than an invariant.
 *
 * IT IS ALSO UNREPRESENTABLE ON `species_template_trait_effects`, by its own
 * CHECK there. No 2024 SRD species grants a standing ability increase (that
 * moved to backgrounds), and the catalog-to-character copy writes a NULL
 * source — which the character-side CHECK above refuses — so admitting the
 * kind at the catalog would seed rows the copy could never deliver.
 */
export const effectKinds = [
  'damage_resistance',
  'hp_modifier',
  'speed',
  'ability_increase',
] as const;
export type EffectKind = (typeof effectKinds)[number];

/**
 * `character_effects`' OWN, WIDER vocabulary (AC-1,
 * `docs/design/2026-07-29-armor-class-items-and-effects.md` §1, D72).
 *
 * A SUPERSET OF `effectKinds`, NOT A REPLACEMENT OF IT, AND THE TWO MUST STAY
 * SEPARATE ARRAYS. `species_template_trait_effects` shares `effectKinds`'
 * CHECK today and must go on refusing these five kinds until AC-2 does the
 * work of widening it on purpose — neither table can produce them (no
 * `character_effects` row copies FROM the template with one of these kinds,
 * and no producer exists yet regardless), so a template row admitting one
 * would be schema slack with nothing behind it. Union-ing the constants would
 * widen BOTH tables' CHECKs from one edit, which is exactly the silent
 * coupling `character_effects_kind_check`'s own comment warns against days
 * before this: two tables sharing one CHECK because a query happened to filter
 * both the same way is how an invariant stops being one.
 *
 * The five new members close the Armor Class gap `sheet.ts:754-759` names in
 * its own comment — Unarmored Defense and every other alternative AC formula
 * — plus the weapon- and attack-scoped modifiers D72 groups with it under one
 * vocabulary rather than a second, item-only one (D72's Option B, rejected):
 *
 *  - `armor_class_bonus` — a flat addend (Cloak of the Armadillo, Ring of
 *    Shell, and AC-4's migrated manual Armor Class adjustments).
 *  - `armor_class_formula` — base + up to two ability modifiers +
 *    `allows_shield` (Monk, Barbarian, the Armadillo Paladin's 10+CON+CHA, the
 *    Armadillo species' 13+DEX).
 *  - `attack_ability_override` — a weapon-scoped ability substitution (Pact of
 *    the Blade).
 *  - `weapon_attack_bonus` / `weapon_damage_bonus` — weapon-scoped flat
 *    addends (a +1 weapon; a flat damage bonus).
 *
 * `character_effects.effect_kind` is retyped `CharacterEffectKind` in
 * `db/schema/origins.ts`; `species_template_trait_effects.effect_kind` KEEPS
 * `EffectKind`, unchanged, on purpose.
 */
export const characterEffectKinds = [
  ...effectKinds,
  'armor_class_bonus',
  'armor_class_formula',
  'attack_ability_override',
  'weapon_attack_bonus',
  'weapon_damage_bonus',
] as const;
export type CharacterEffectKind = (typeof characterEffectKinds)[number];

/**
 * WHAT GRANTED AN EXTRA ATTACK — the closed set D19 says the model needs.
 *
 * `class_extra_attack_grants` can express only the first member, because it is
 * keyed on `(class_definition_id, class_level)` and a class table row is the
 * only thing that shape can hold. The other two are real and sourced:
 *
 *  - `subclass` — a subclass feature at a level in its own class. NOT in SRD
 *    5.2, which carries one subclass per class and no Extra Attack among them,
 *    so D3 governs: the MODEL ships, the CONTENT does not.
 *  - `feature`  — a named, optional feature that is neither a class table row
 *    nor a subclass: `docs/srd/source/extra-attack-other-sources.txt` carries
 *    two, and they are bundled.
 *
 * THIS IS A DISCRIMINATOR OVER THREE TABLES, NOT A COLUMN. Each source keeps
 * its own table with a NOT NULL foreign key — `class_extra_attack_grants`,
 * `subclass_features`, `named_features` — which is D6's "extract a variant
 * table" applied rather than quoted. A single table with three nullable ids
 * would have needed correlated-null CHECKs in both directions AND would have
 * lost its uniqueness guarantee, because SQLite treats NULLs as distinct in a
 * UNIQUE index: `(1, 6, NULL)` can be inserted twice under
 * `UNIQUE(class_definition_id, class_level, subclass_definition_id)`. Measured,
 * not assumed. Keeping the tables apart also keeps a homebrew subclass grant
 * out of the table `src/rules/sheet-srd.ts` clears with
 * `DELETE … WHERE class_definition_id = ?` on every reseed.
 */
export const extraAttackGrantSources = ['class', 'subclass', 'feature'] as const;
export type ExtraAttackGrantSource = (typeof extraAttackGrantSources)[number];

/**
 * WHICH WEAPONS AN EXTRA ATTACK GRANT REACHES.
 *
 * `docs/srd/source/extra-attack-other-sources.txt`: "You gain the Extra Attack
 * feature FOR YOUR PACT WEAPON ONLY." A grant is therefore not always a fact
 * about the character; it can be a fact about one weapon, and the model has to
 * be able to say which.
 *
 * `one_bonded_weapon` IS NAMED FOR WHAT IT MEANS, NOT FOR THE SRD FEATURE THAT
 * USES IT. The scope is "one specific weapon the character has bound to
 * themselves", and the bundled feature that uses it calls that weapon a pact
 * weapon. A homebrew feature scoped to an oath-blade or a familiar's talon is
 * the same shape, and a member named after one feature would have invited a
 * second member meaning the same thing.
 *
 * THIS APPLICATION CANNOT RESOLVE `one_bonded_weapon`, AND SAYS SO RATHER THAN
 * GUESSING. `character_weapons` holds no bond, no attunement and — by D1b — no
 * link to any catalog row; grepping `src/` and `db/` for `pact` finds only Pact
 * Magic spell-slot machinery and not one weapon-related occurrence. So a scoped
 * grant is SURFACED against every profile and applied to none, which is the
 * `content_missing` posture `WeaponMasteryLookup` established: a state, never a
 * number.
 */
export const extraAttackWeaponScopes = [
  'any_weapon',
  'one_bonded_weapon',
] as const;
export type ExtraAttackWeaponScope = (typeof extraAttackWeaponScopes)[number];

/**
 * A CLASS FEATURE IS FREE TEXT PLUS AN OPTIONAL MECHANICAL EFFECT — D12's
 * species-trait shape, one level over, and closed the same way twice.
 *
 * `subclass_features` and `named_features` both carry `description NOT NULL`
 * and a NULLABLE `effect_kind` from this set. Most features move no number and
 * have no kind at all; that is the DEFAULT case here exactly as it is for
 * species traits, where 26 of 33 printed traits carry `effect_kind IS NULL`.
 *
 * CLOSED IN SQLITE BY `nullOrOneOf`, AND IN TYPESCRIPT BY AN EXHAUSTIVE SWITCH
 * in `src/rules/class-feature-effects.ts`. Adding a member here stops that file
 * compiling until the new kind is given a meaning, which is the D12 mechanism
 * that makes "adding a mechanical KIND is a deliberate change, adding a feature
 * is not" true rather than aspirational.
 *
 * ONE EFFECT PER FEATURE, AND THE LIMIT IS STATED RATHER THAN INHERITED. D18
 * measured that limit as a real defect on the species side — the Tiefling's
 * Fiendish Legacy grants a resistance AND a cantrip, and one column can hold
 * only one. It is not a defect HERE YET, and the reason is arithmetic rather
 * than optimism: this set has exactly ONE member, so "two effects on one
 * feature" is not expressible at all and cannot be silently lost. The day a
 * second member is added, the child table D18 already named as the real fix is
 * the change to make, before any content uses it.
 */
export const classFeatureEffectKinds = ['extra_attack'] as const;
export type ClassFeatureEffectKind = (typeof classFeatureEffectKinds)[number];

/**
 * Every effect a class, subclass, or optional named feature template can
 * describe. `extra_attack` remains catalog-live, while the nine
 * `characterEffectKinds` are copied into `character_effects` by class sync.
 */
export const featureTemplateEffectKinds = [
  ...characterEffectKinds,
  ...classFeatureEffectKinds,
] as const;
export type FeatureTemplateEffectKind =
  (typeof featureTemplateEffectKinds)[number];

/**
 * Species templates can produce the pre-AC effects plus the AC formula D72
 * assigns to a species. `ability_increase` remains refused by the table's
 * source-required invariant.
 */
export const speciesTemplateEffectKinds = [
  ...effectKinds,
  'armor_class_formula',
] as const;
export type SpeciesTemplateEffectKind =
  (typeof speciesTemplateEffectKinds)[number];

export const effectReliabilityCategories = [
  'attack_roll',
  'saving_throw',
  'fixed_effect',
  'modifier_scaled',
  'ritual_utility',
  'mixed',
] as const;
export type EffectReliabilityCategory =
  (typeof effectReliabilityCategories)[number];

/* ==========================================================================
 * STRUCTURED SPELL VALUES
 * ========================================================================== */

/**
 * WHERE A SPELL'S EFFECT ORIGINATES — the half of a printed Range line that is
 * NOT a distance.
 *
 * THE OWNER RULED "store distance as a number of feet", AND THIS EXISTS BECAUSE
 * THE RULING HAS NOWHERE TO PUT TWO VALUES THAT ARE NOT DISTANCES. Both are in
 * this repository already, and neither is a fixture:
 *
 *  - `Self` is printed in the BUNDLED SRD extract twice —
 *    `docs/srd/source/weapon-attack-cantrips.txt:15` (True Strike) and `:36`
 *    (Shillelagh). Those two blocks are the only verbatim spell text this repo
 *    ships, and both of them would have stored NULL feet.
 *  - `Touch` is the value in this project's OWN documented example record,
 *    `docs/CATALOG-IMPORT.md:34`, which a user is told to copy.
 *
 * Without this column `Self`, `Touch` and "the author left Range blank" all
 * collapse into one nullable integer holding NULL — three different facts, one
 * storage state. That is the data-loss shape D12/Q4 names, on a column whose
 * only writers accept any string at all.
 *
 * THE OPEN LIMB IS `spell_versions.range` ITSELF, WHICH IS UNTOUCHED AND STILL
 * HOLDS THE AUTHOR'S TEXT VERBATIM. This is known-set-plus-passthrough with the
 * passthrough already in place: an unrecognised Range line leaves all four
 * structured columns NULL and loses nothing, because the printed card renders
 * the raw string and always has. So a homebrew `Range: Anywhere on this plane`
 * is stored, displayed and never rejected.
 *
 * `sight` and `unlimited` are the SRD's two other standard non-distance forms
 * and `special` is its escape hatch; none of the three occurs in this
 * repository today, which is stated rather than hidden. They are here because
 * the vocabulary is a reading of the printed Range line's grammar, not a
 * census of the strings we happen to hold — and a member this application never
 * writes costs nothing, where a MISSING member silently degrades to NULL.
 */
export const spellRangeKinds = [
  'self',
  'touch',
  'ranged',
  'sight',
  'unlimited',
  'special',
] as const;
export type SpellRangeKind = (typeof spellRangeKinds)[number];

/**
 * THE OWNER'S SHAPE LIST, VERBATIM: *"there are spheres, cylinders, cones,
 * straight line (like lightning bolt)"*.
 *
 * `line` IS SPELLED FOR THE SHAPE, NOT FOR THE OWNER'S EXAMPLE — the same rule
 * `extraAttackWeaponScopes` applies to `one_bonded_weapon`. A member named
 * `lightning_bolt` would have invited a second member meaning the same thing.
 *
 * WHAT A SINGLE `area_feet` CANNOT HOLD, MEASURED RATHER THAN WAVED AT. The
 * only SRD 5.2 text in this repository that names an area shape is
 * `docs/srd/source/species-descriptions.txt:78`, the Dragonborn's Breath
 * Weapon: *"either a 15-foot Cone or a 30-foot Line that is 5 feet wide"*. A
 * LINE therefore carries a length AND a width, and a CYLINDER a radius AND a
 * height. This model stores ONE dimension per area and the second is left in
 * the verbatim `range` text, where it is displayed and not lost.
 *
 * That is a deliberate stop, not an oversight: under D26 the sheet is a
 * reference, and the number a player compares is the one they measure on the
 * table. A width column would be NULL for every sphere and every cone this
 * application can ever hold, and no number on the sheet moves when it is
 * filled in.
 */
export const spellAreaShapes = ['sphere', 'cylinder', 'cone', 'line'] as const;
export type SpellAreaShape = (typeof spellAreaShapes)[number];

/**
 * IS A MATERIAL COMPONENT'S PRINTED PRICE A FLOOR OR AN EXACT AMOUNT?
 *
 * TWO MEMBERS BECAUSE THE SRD PRINTS A `+` AND AN INTEGER COLUMN DROPS IT. The
 * bundled True Strike component reads *"a weapon with which you have
 * proficiency and that is worth 1+ CP"*
 * (`docs/srd/source/weapon-attack-cantrips.txt:16-17`). Storing `1` alone and
 * printing "1 cp" states as a fact ("this component costs one copper piece")
 * something the source does not say ("at least one copper piece"), which is
 * exactly what D24 forbids.
 *
 * `exact` is the member no bundled row reaches — every SRD material price is a
 * `+` form. It exists for a homebrew author who writes `worth 25 GP` with no
 * plus, which the parser reads as exact, and for the same reason `sight` is in
 * `spellRangeKinds`: the alternative is not "one fewer member", it is silently
 * calling a homebrew exact price a minimum.
 */
export const materialCostKinds = ['exact', 'minimum'] as const;
export type MaterialCostKind = (typeof materialCostKinds)[number];

/*
 * `upcastScales` USED TO LIVE HERE AND ITS SUBJECT IS GONE — recorded rather
 * than silently removed, because the removal is a ruling and not a tidy-up.
 *
 * It was `['slot_level', 'character_level']`, a discriminant on
 * `spell_versions` saying which kind of level `spell_version_upcast_levels`
 * counted in. The owner has since ruled that upcasting is measured in SLOT
 * levels only, and that a cantrip's ladder is a different mechanic —
 * *"Separate concept, own table"*. So the two meanings are two tables
 * (`spell_version_upcast_levels`, bounded 1..9, and
 * `spell_version_cantrip_upgrade_levels`, bounded 1..20), each with its own
 * text column, and there is no longer one column for a discriminant to select
 * the meaning of. The SRD citations this comment carried moved to the new
 * table's docblock in `db/schema/catalog-spells.ts`, which is where a reader
 * now needs them.
 */

/* ==========================================================================
 * STARTING EQUIPMENT
 * ========================================================================== */

/**
 * WHICH OF THE TWO PRINTED PACKAGES AN EQUIPMENT LINE BELONGS TO.
 *
 * The source prints *"Choose A or B"* and `background_templates` already holds
 * the two halves as two NOT NULL columns. This is that same choice, expressed
 * as a discriminant on the LINE, because a list cannot be split across two
 * columns. Two members, not an open string: the extract's own grammar
 * (`EQUIPMENT_CHOICE` in `src/rules/origins-srd.ts`) admits exactly `(A)` and
 * `(B)`, and a third would fail the parse before it could reach a row.
 */
export const backgroundEquipmentOptions = ['a', 'b'] as const;
export type BackgroundEquipmentOption =
  (typeof backgroundEquipmentOptions)[number];

/**
 * WHICH OF THE PRINTED CLASS PACKAGES AN EQUIPMENT LINE BELONGS TO.
 *
 * Eleven classes print A/B and Fighter prints A/B/C. This vocabulary is
 * deliberately separate from `backgroundEquipmentOptions`: widening the
 * background's source grammar to accommodate the Fighter would permit a
 * background option the background extract cannot contain.
 */
export const classEquipmentOptions = ['a', 'b', 'c'] as const;
export type ClassEquipmentOption = (typeof classEquipmentOptions)[number];

/**
 * THE OWNER'S RULING, MADE STRUCTURAL AND SHARED BY BACKGROUND AND CLASS
 * PACKAGES: *"a list of quantity + item (name only unless weapon or armor)"*.
 *
 * `gear` IS "NAME ONLY" AND IS THE MAJORITY. Robe, Crowbar, Healer's Kit,
 * Parchment (10 sheets) — all name, no mechanics, exactly as D26 wants.
 *
 * `weapon` AND `armor` ARE THE RULING'S "UNLESS", AND THEY CARRY A CATALOG
 * REFERENCE RATHER THAN COPIED STATISTICS. `weapon_templates` and
 * `armor_templates` already exist and this is a TEMPLATE table, so a real
 * foreign key is available and correct. D1b is not violated and is not even
 * engaged: its rule is that a CHARACTER stores values with no live link back to
 * a template, and nothing here is a character. When the copy-to-character path
 * is built it must read through this reference and write VALUES, the way
 * `speciesFromTemplate` already does.
 *
 * MONEY IS ORDINARY `gear` TEXT, per D40. Option B for all four backgrounds is
 * exactly `50 GP`; it is quantity 1 with that whole printed string as its name,
 * on the same terms as a bedroll. There is no denomination or numeric value in
 * this domain because the owner explicitly dropped coin tracking.
 *
 * NO BUNDLED ROW REACHES `armor`, AND THAT IS STATED RATHER THAN DISCOVERED.
 * The four licensed packages hold four weapon entries (Quarterstaff, 2 Daggers,
 * Spear, Shortbow), ammunition, clothing and money text, and NO ARMOUR — `Robe` and
 * `Traveler's Clothes` are clothing, which `armor_templates` does not carry.
 * The member and its CHECK arm are exercised by direct insertion in
 * `tests/integration/rules/background-equipment.test.ts`, both the accepting
 * and the refusing case, so the branch is not merely unreached-and-unproven.
 */
export const equipmentItemKinds = ['gear', 'weapon', 'armor'] as const;
export type EquipmentItemKind = (typeof equipmentItemKinds)[number];

export function isUsableSlotState(state: SlotState): boolean {
  return state === 'active' || state === 'kept_override';
}

export function definitionTableForSourceType(
  sourceType: DomainSourceType,
): `${DomainSourceType}_definitions` {
  return `${sourceType}_definitions`;
}

export function grantRuleMintsSlots(kind: GrantRuleKind): boolean {
  return (
    kind === 'fixed_spell' ||
    kind === 'choice_from_list' ||
    kind === 'choice_from_query'
  );
}

export function grantRuleRequiresBucket(kind: GrantRuleKind): boolean {
  return grantRuleMintsSlots(kind) || kind === 'spellbook_acquisition';
}

export function isDuplicateWarning(category: DuplicateCategory): boolean {
  return category !== 'none';
}

export function isEnumValue<const T extends readonly string[]>(
  values: T,
  candidate: unknown,
): candidate is T[number] {
  return typeof candidate === 'string' && values.includes(candidate);
}
