export const abilities = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;
export type Ability = (typeof abilities)[number];

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
] as const;
export type GrantRuleKind = (typeof grantRuleKinds)[number];

export const slotStates = [
  'active',
  'orphaned',
  'discarded',
  'kept_override',
] as const;
export type SlotState = (typeof slotStates)[number];

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
 * THE CLOSED SET OF MECHANICAL EFFECTS A SPECIES TRAIT MAY CARRY.
 *
 * A species trait is FREE TEXT first. Twenty-six of the thirty-three traits
 * the SRD prints carry no mechanical effect at all and never will: the Elf's
 * four-hour Trance, all four Halfling traits, every Darkvision range. Those
 * rows have `effect_kind IS NULL`, and that is the DEFAULT rather than a gap.
 *
 * The seven that do carry one draw from these four members and nothing else.
 * Adding a MEMBER is a deliberate code change — a new value here widens the
 * `species_template_traits_effect_kind_check` CHECK at the next
 * `npm run db:schema`, forces a new branch in `src/rules/species-effects.ts`
 * (whose switch is exhaustive), and needs a payload column. Adding a TRAIT, by
 * contrast, is data: a line in `docs/srd/source/species-descriptions.txt` and
 * nothing else.
 *
 * WHY EXACTLY THESE FOUR — three are borne out by the extract, one is not:
 *
 *  - `damage_resistance` — Dwarven Resilience (Poison) and Dragonborn Damage
 *    Resistance (the type is the Draconic Ancestry choice, so the column stays
 *    null).
 *  - `hp_modifier` — Dwarven Toughness, and only Dwarven Toughness, seeded
 *    `flat = 0, perLevel = 1` so the total is the character's LEVEL. The Orc's
 *    Adrenaline Rush grants TEMPORARY Hit Points, which are not Hit Point
 *    maximum; folding it in here would be wrong in a way nobody notices.
 *  - `granted_spells` — Elven Lineage, Gnomish Lineage, Fiendish Legacy and
 *    Otherworldly Presence. A PURE MARKER carrying no payload on the trait row:
 *    the spells come from the source instance's grant rules
 *    (`species_definitions.grant_rules`, read by `src/grants/`), and this flag
 *    only tells a sheet which trait is the reason those slots exist.
 *
 *    IT POINTS AT NOTHING TODAY, and that is stated here rather than left to be
 *    discovered. No `species_definitions` row is seeded from this extract, so
 *    no species `character_source_instances` row exists and these four traits
 *    grant zero spells. Wiring them needs more than a seed: the level 3/5 gates
 *    are `active_from_class_level` rules, and `SourceRuleReader`
 *    (`classLevelForSource`) resolves that for a non-class source ONLY from a
 *    `class_level` value configured on the instance — it does not throw
 *    outright, it throws when that value is absent. A configured constant
 *    cannot follow a character's level as it rises, so a species source needs
 *    a level resolution the reader does not yet have. That is the real work,
 *    and it is not this track's.
 *  - `speed` — NO SRD SPECIES TRAIT USES IT, which is reported rather than
 *    hidden. Base walking Speed is a species-template COLUMN, not a trait,
 *    because the source lists it under "Parts of a Species" beside Creature
 *    Type and Size. Every speed CHANGE the nine species print is temporary or
 *    conditional — Draconic Flight and Large Form are level-gated and
 *    time-limited, and the Wood Elf's 35 feet belongs to a lineage sub-choice —
 *    so none is a standing modifier. The member exists for a character's own
 *    hand-written traits, where a flat bonus is exactly what a user means.
 *
 * ONE EFFECT PER TRAIT — A LIMIT OF THE MODEL, NOT A READING OF THE SOURCE.
 *
 * This said the effect is taken from the TRAIT'S OWN PARAGRAPH and never from
 * the choice table it points at, and offered Fiendish Legacy as the worked
 * example: its paragraph "says nothing about resistance". THAT JUSTIFICATION IS
 * WRONG and the extract is what disproves it. The paragraph
 * (`species-descriptions.txt:202-206`) reads "Choose a legacy from the Fiendish
 * Legacies table. You gain the level 1 benefit of the chosen legacy" — and
 * every legacy's level-1 benefit (`:233-238`) is a Resistance plus a cantrip.
 * The paragraph therefore DOES grant a resistance; it declines to name the
 * type, which is exactly what the Dragonborn's Damage Resistance paragraph does
 * ("the damage type determined by your Draconic Ancestry trait") and that one
 * is modelled, with a null type.
 *
 * So the two are structurally identical and the app treats them differently:
 * `unchosenDamageResistances` is 1 for a Dragonborn and 0 for a Tiefling, who
 * has one from level 1. The cause is not the paragraph rule — it is that
 * `effect_kind` is ONE COLUMN and Fiendish Legacy carries TWO effects.
 *
 * NOT SWAPPED, AND NOT REMODELLED, AND BOTH REFUSALS ARE DELIBERATE. Making the
 * trait `damage_resistance` would trade a silent resistance for a silent spell
 * grant — the same defect facing the other way. Recording both means a trait
 * carrying a SET of effects, which is a schema change to two tables plus a
 * positional share wire format whose version is deliberately pinned at 1
 * (`src/sharing/codec.ts`). That is an owner-level call on a model D12 defined,
 * and it is filed as one rather than patched under review; see
 * `.claude/pending-questions/`.
 *
 * The paragraph rule itself still holds where it was actually load-bearing: it
 * keeps the Wood Elf's 35 feet — a lineage sub-choice, not a species-wide
 * Speed — off the Elf template.
 */
export const speciesTraitEffectKinds = [
  'damage_resistance',
  'hp_modifier',
  'speed',
  'granted_spells',
] as const;
export type SpeciesTraitEffectKind = (typeof speciesTraitEffectKinds)[number];

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
