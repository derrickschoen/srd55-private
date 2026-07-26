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
