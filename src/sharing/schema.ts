import { isSpellVersionKey } from '../catalog/catalog-key';
import {
  abilities,
  abilityAllocationMethods,
  armorCategories,
  armorDexBonuses,
  armorSlots,
  rulesEditions,
  skills,
  effectKinds,
  weaponMasteryProperties,
  weaponProficiencyCategories,
  type KnownAbilityAllocationMethod,
} from '../domain/enums';
import { characterLevel } from '../rules/character-level';
import { weaponMasterySelectionError } from '../domain/contracts/row-rules';
import type {
  VersatileWeaponDamage,
  WeaponDamage,
} from '../domain/weapon-damage';
import {
  isWeaponRangeKind,
  weaponRangeFromStorage,
  type WeaponRange,
} from '../domain/weapon-range';
import { CHARACTER_TEXT_LIMITS } from '../domain/character-limits';
import {
  WEAPON_RANGE_MAX_FEET,
  WEAPON_TEXT_LIMITS,
} from '../domain/weapon-limits';
import { LEGACY_TRAIT_EFFECT_KINDS } from '../rules/legacy-trait-effects';
import {
  ORIGIN_EFFECT_MAGNITUDE_MAX,
  ORIGIN_SPEED_MAX_FEET,
  ORIGIN_TEXT_LIMITS,
} from '../domain/origin-limits';
import {
  SHEET_ADJUSTMENT_BOUNDS,
  SHEET_ARMOR_MAX,
  SHEET_ROLL_BOUNDS,
  SHEET_SHARE_COUNTS,
  SHEET_TEXT_LIMITS,
} from '../domain/sheet-limits';
import {
  ABILITY_SCORE_MAX,
  ABILITY_SCORE_MIN,
} from '../builder/contracts';
import { CURRENT_CHARACTER_SHARE_VERSION } from './wire-schemas';

export const CHARACTER_SHARE_FORMAT =
  'dnd-multiclass-spells-character-share' as const;
export const CHARACTER_SHARE_VERSION = CURRENT_CHARACTER_SHARE_VERSION;

export const SHARE_LIMITS = Object.freeze({
  encodedCharacters: 131_072,
  compressedBytes: 98_304,
  decompressedBytes: 524_288,
  classes: 20,
  sources: 100,
  selections: 1_000,
  spellbook: 1_000,
  preferences: 1_000,
  overrides: 200,
  acknowledgements: 500,
  loadouts: 100,
  loadoutEntries: 1_000,
  placeholders: 1_000,
  /**
   * How many weapons one document may carry.
   *
   * `character_weapons` holds the longest free prose a share payload carries —
   * `other_properties` and `notes` are plain `TEXT`, where `loadouts[].name` is
   * the only other user-typed field here and is one short line. A count cap
   * stops a hostile document spending the whole decompressed budget on a single
   * section, and names the section when it fires. It matches the precedent set
   * by `loadouts` and `acknowledgements`, which the app does not bound either.
   *
   * 100 realistic weapons cost roughly 1.4 KB of fragment; the cap exists for
   * the pathological case, not the plausible one. It is NOT a promise that any
   * 100 weapons fit — 100 weapons of maximum-length high-entropy prose still
   * exceed `compressedBytes`, and honestly report that.
   *
   * The PER-FIELD lengths deliberately do not live here — see
   * `WEAPON_TEXT_LIMITS`. Owning them separately was a defect: a share-only
   * number drifted BELOW what the write boundary accepts, which made a
   * legitimately built character refuse to export.
   */
  weapons: 100,
  /**
   * How many species traits one document may carry.
   *
   * The nine printed species have between three and five. A hundred is far past
   * any hand-written list and exists for the same reason the `weapons` cap does:
   * to stop a hostile document spending the whole decompressed budget on one
   * section, and to name that section when it fires.
   *
   * There is no cap for the species or the background themselves — each is at
   * most ONE row per character, and the schema's UNIQUE index says so.
   */
  speciesTraits: 100,
  /**
   * How many effects one document may carry.
   *
   * Higher than `speciesTraits` because one trait may now grant several and a
   * feat, a subclass or a background may grant more; 200 is far past any
   * hand-built character and exists for the same reason every other cap does —
   * to stop a hostile document spending the whole decompressed budget on one
   * section, and to name that section when it fires.
   */
  effects: 200,
  /**
   * The two unbounded-by-cardinality sheet sections.
   *
   * DERIVED, NOT RE-TYPED. `SHEET_SHARE_COUNTS` is the same module the write
   * boundary and the schema read, which is the whole discipline
   * `src/domain/weapon-limits.ts` was created to enforce after a share cap
   * drifted below a write cap and made a legitimately built character
   * unshareable.
   *
   * `armor` and `sheetAdjustment` need no count here: the schema's UNIQUE
   * indexes bound them at two rows and one row per character, and the validator
   * refuses a duplicate slot outright rather than counting.
   */
  hitPointRolls: SHEET_SHARE_COUNTS.hitPointRolls,
  skillProficiencies: SHEET_SHARE_COUNTS.skillProficiencies,
  /**
   * How many skill grants one document may carry (wire v5). A real character
   * holds at most a few dozen — two per class plus a handful from origin
   * sources — so 200 is far past any hand-built character and exists for the
   * reason every other cap does: to stop a hostile document spending the
   * decompressed budget on one section, and to name that section when it
   * fires.
   */
  skillGrants: 200,
});

export interface ShareCharacter {
  readonly name: string;
  readonly strength?: number;
  readonly dexterity?: number;
  readonly constitution?: number;
  readonly intelligence?: number;
  readonly wisdom?: number;
  readonly charisma?: number;
  /**
   * D64's allocation signal, on the wire since v3. OPTIONAL MIRRORING THE
   * NULLABLE COLUMN (D6/D6b): absent means never allocated. It MUST travel
   * whenever it is set, because the exporter omits scores equal to 10 and the
   * importer refills them — without the signal an allocated all-10s character
   * (explicitly valid under D64) round-trips looking unallocated. That was a
   * live defect; v3 exists to close it.
   */
  readonly ability_allocation_method?: KnownAbilityAllocationMethod;
  readonly proficiency_bonus_override?: number;
  readonly rules_edition_preference?: string;
  readonly allow_legacy?: true;
  /**
   * `characters.notes` — THE ONLY FIELD IN THIS DOCUMENT THE SHARER CHOOSES
   * WHETHER TO SEND (Q12, ruled opt-in by the owner).
   *
   * Absent means the sharer did not opt in, OR the character has no note. The
   * two are deliberately the same on the wire: a document that distinguished
   * them would tell the recipient that a note exists and is being withheld,
   * which is a fact about private text and not one a link should carry.
   *
   * OPTIONAL, and the optionality mirrors the column exactly as every other
   * nullable column here does (D6/D6b). An EMPTY note does not travel either —
   * see `exportCharacterShare`, where the empty string and NULL are one state
   * because the recipient's column has no way to hold the difference.
   */
  readonly notes?: string;
}

export interface ShareClass {
  readonly id: number;
  readonly classKey: string;
  readonly subclassKey?: string;
  readonly level: number;
  readonly start: number;
  readonly ability?: string;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly subclassConfig?: Readonly<Record<string, unknown>>;
}

export interface ShareSource {
  readonly id: number;
  readonly type: 'feat' | 'species' | 'background';
  readonly key: string;
  readonly name?: string;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly acquired: number;
}

export interface ShareSelection {
  readonly ref: number;
  readonly ruleKey: string;
  readonly ordinal: number;
  readonly spellKey: string;
  readonly spellName?: string;
  readonly keep?: true;
}

/**
 * ONE SKILL CHOICE SLOT, AS IT TRAVELS (wire v5; skills plan §3.2/§3.6).
 *
 * `ref` names the granting source in the same `classes[].id` / `sources[].id`
 * reference space `selections[].ref` resolves through — provenance is the
 * point of this section, so unlike an effect there is NO source-less variant.
 *
 * `skill` OPTIONAL MIRRORING THE NULLABLE COLUMN (D6/D6b): absent means
 * GRANTED BUT UNFILLED, and it must survive the round trip or the recipient's
 * character loses the record of what it still owes. Orphaned grants do not
 * travel: a share carries the build as it stands, and the sources they hang
 * from are not in the document to be named — the same rule `selections` has
 * always followed.
 */
export interface ShareSkillGrant {
  readonly ref: number;
  readonly grantKey: string;
  readonly ordinal: number;
  readonly skill?: string;
}

export interface SharePreference {
  readonly spellKey: string;
  readonly favourite: boolean;
}

export interface ShareOverride {
  readonly ruleKey: string;
  readonly value: unknown;
}

export interface ShareLoadout {
  readonly name: string;
  readonly entries: readonly {
    readonly spellKey: string;
    readonly role: string;
  }[];
}

export interface SharePlaceholder {
  readonly spellKey: string;
  readonly spellName: string;
}

/**
 * ONE OF A CHARACTER'S WEAPONS, AS IT TRAVELS.
 *
 * FIELD NAMES ARE COLUMN NAMES except for `range`, deliberately.
 * `ShareCharacter` already follows the column-name convention
 * (`proficiency_bonus_override`, `rules_edition_preference`), and for the same
 * reason: these are the character's own row, not a catalog projection. Range
 * is the one structured value: `src/domain/weapon-range.ts` maps the storage
 * discriminator and its two payload columns into a tagged value once.
 *
 * WHAT IS OMITTED AND WHY. `id`, `character_id`, `created_at` and `updated_at`
 * — the same four a share document omits everywhere else. A share carries no
 * database identifiers and no timestamps.
 *
 * OPTIONALITY MIRRORS THE COLUMN, IT DOES NOT INVENT A NEW ONE (D6/D6b).
 * Nullable scalar columns are optional. Range is required because its storage
 * discriminator is required; `{ kind: 'none' }` is the explicit no-range state.
 * Every NOT NULL boolean flag is `true`-when-present, exactly as
 * `ShareCharacter.allow_legacy` is: absent means the column's default of 0.
 */
export interface ShareWeapon {
  readonly name: string;
  /**
   * D27's `simple | martial`. Optional, and the absence is the whole point.
   *
   * EVERY LINK MINTED BEFORE THIS COLUMN EXISTED CARRIES NO CATEGORY, and by
   * D11 part 2 the boundary tolerates: such a weapon imports as NOT STATED,
   * which is the same state a user's hand-typed weapon is in, and the sheet says
   * it cannot check that weapon. Rejecting the older payload — or, worse,
   * inventing `simple` for it — would be the data-loss failure AGENTS.md names,
   * on a link somebody has already sent.
   *
   * It is APPENDED to the wire tuple rather than inserted in the middle; see
   * the v1 weapon variants in `wire-schemas/v1.ts` for why that position is
   * load-bearing.
   */
  readonly proficiency_category?: string;
  readonly damage: WeaponDamage;
  readonly damage_type?: string;
  readonly versatile_damage: VersatileWeaponDamage;
  readonly ammunition_kind?: string;
  /** Frozen v1 wire-only field. Current documents use `range`. */
  readonly range_normal_feet?: number;
  /** Frozen v1 wire-only field. Current documents use `range`. */
  readonly range_long_feet?: number;
  readonly range: WeaponRange;
  readonly mastery_property?: string;
  readonly other_properties?: string;
  readonly notes?: string;
  readonly finesse?: true;
  readonly heavy?: true;
  readonly light?: true;
  readonly loading?: true;
  readonly reach?: true;
  readonly thrown?: true;
  readonly two_handed?: true;
  readonly ammunition?: true;
  readonly mastery_selected?: true;
  /**
   * WHICH RULE GRANTED THIS WEAPON — wire v6, the equipment-provenance column.
   *
   * Names a `classes[].id` / `sources[].id`, the SAME reference space
   * `selections[].ref` and `effects[].sourceRef` resolve through. Optional
   * because `source_instance_id` is nullable and NULL is the ordinary state:
   * a person put this here. Every link minted before v6 arrives without it,
   * which is the same truth — nothing but a person could have added those
   * rows. No subclass flag, deliberately: equipment is granted by a class root
   * or a background root, never by a subclass, and a flag nothing can set is a
   * field that reads as meaningful and is not.
   */
  readonly sourceRef?: number;
}

/** The `true`-when-present flags of a weapon, in wire order. */
export const SHARE_WEAPON_FLAGS = [
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'thrown',
  'two_handed',
  'ammunition',
  'mastery_selected',
] as const satisfies readonly (keyof ShareWeapon)[];

/** The nullable text columns of a weapon, in wire order. */
export const SHARE_WEAPON_TEXT = [
  'damage_type',
  'ammunition_kind',
] as const satisfies readonly (keyof ShareWeapon)[];

/**
 * ONE PIECE OF ARMOUR A CHARACTER RECORDED — worn or held.
 *
 * FIELD NAMES ARE COLUMN NAMES, for the reason `ShareWeapon` gives: by D1b the
 * whole row is portable as-is, holding no `armor_templates` id to translate.
 *
 * `slot` AND `category` BOTH TRAVEL AND NEITHER IS DERIVED FROM THE OTHER. The
 * pair can legitimately disagree — a Shield recorded in the worn slot — and
 * `armorClass` accepts that, counts the row by what it IS, and says the slots
 * are crossed. Dropping `slot` on the wire and re-deriving it from `category`
 * would silently repair an imported character instead of importing it (D11
 * part 2), and the recipient would never learn their sender had made the
 * mistake.
 *
 * `dex_bonus_max` is optional because it is meaningful only when
 * `dex_bonus = 'capped'` — and this validator enforces the pairing in BOTH
 * directions, exactly as `character_armor_dex_bonus_max_check` does, so a
 * document cannot reach the INSERT and abort the whole import with a raw
 * SQLITE_CONSTRAINT_CHECK naming nothing.
 */
export interface ShareArmor {
  readonly slot: string;
  readonly name: string;
  readonly category: string;
  readonly armor_class: number;
  readonly dex_bonus: string;
  readonly dex_bonus_max?: number;
  readonly strength_requirement?: number;
  readonly stealth_disadvantage?: true;
  readonly notes?: string;
  /** The granting source (wire v6) — `ShareWeapon.sourceRef`'s terms exactly. */
  readonly sourceRef?: number;
}

/**
 * ONE RECORDED HIT POINT ROLL — the one number on a sheet that cannot be
 * recomputed from anything else in the document.
 *
 * `className` IS CAMEL CASE AND THE OTHER TWO ARE NOT, and the split is the one
 * `ShareWeapon` documents: a camelCase name marks something that is NOT a
 * column but a key standing in for a database id. Here it is the reverse
 * direction of the same idea — `class_name` IS the column, but on the wire it
 * is also the only thing joining this row to the recipient's own class rows,
 * which have entirely different ids. Naming it as a key says so.
 */
export interface ShareHitPointRoll {
  readonly className: string;
  readonly classLevel: number;
  readonly value: number;
}

/**
 * The manual Armor Class adjustment, D12's escape hatch, as at most one object.
 *
 * A bare number would have been smaller on the wire and wrong: the note is what
 * makes an unexplained `+3` readable six months later, and an object leaves room
 * for it. `value` is REQUIRED inside the object — a present section with no
 * value would be a third way to spell zero.
 */
export interface ShareSheetAdjustment {
  readonly value: number;
  readonly note?: string;
}

/** The `true`-when-present flags of a shared armour row, in wire order. */
export const SHARE_ARMOR_FLAGS = [
  'stealth_disadvantage',
] as const satisfies readonly (keyof ShareArmor)[];

/** The enum-valued fields of a shared armour row, in wire order. */
export const SHARE_ARMOR_ENUMS = [
  'slot',
  'category',
  'dex_bonus',
] as const satisfies readonly (keyof ShareArmor)[];

/** The optional integer fields of a shared armour row, in wire order. */
export const SHARE_ARMOR_NUMBERS = [
  'dex_bonus_max',
  'strength_requirement',
] as const satisfies readonly (keyof ShareArmor)[];

export interface ShareSpecies {
  readonly name: string;
  readonly creature_type?: string;
  readonly size?: string;
  readonly base_speed_feet?: number;
  readonly notes?: string;
}

/**
 * A shared species trait.
 *
 * THE FIVE `effect_*` FIELDS ARE LEGACY AND DECODE-ONLY. The columns they came
 * from no longer exist, so this build never WRITES one; every link generated
 * from today on carries `null` in those five wire slots. They stay in the type,
 * in the frozen wire order and in the validator because a link somebody pasted
 * into a chat last week carries real values there, and dropping the fields
 * would either make that link fail to decode or silently discard the character's
 * resistances. `shareSpeciesTrait` accepts them against the HISTORICAL
 * vocabulary — including the retired `granted_spells` — and
 * `importCharacterShare` migrates them into `character_effects`.
 *
 * The wire order is NOT rewritten to reclaim the slots. Reordering or shrinking
 * the trait tuple would silently reinterpret element 13 of every link already in
 * the wild, which is the exact failure the positional format's version pinning
 * exists to avoid.
 */
export interface ShareSpeciesTrait {
  readonly name: string;
  readonly description?: string;
  readonly effect_kind?: string;
  readonly effect_damage_type?: string;
  readonly effect_hit_points_flat?: number;
  readonly effect_hit_points_per_level?: number;
  readonly effect_speed_bonus_feet?: number;
  readonly notes?: string;
}

/**
 * ONE OF THE CHARACTER'S OWN EFFECTS — the fifteenth root element in v1 and
 * the same index in v2.
 *
 * A NEW ROOT ELEMENT AND NOT A FOURTH MEMBER OF THE ORIGIN GROUP, deliberately.
 * Effects are no longer species-scoped — that severance is the whole point of
 * the inversion — so nesting them under the origin would re-create the coupling
 * being removed, and would change the meaning of element 13 for links already in
 * the wild. Version 1 freezes every arity it shipped; v2 preserves the index
 * and reaches older documents through its explicit adjacent migration.
 *
 * `sourceRef` names a `sources[].id` — the SAME reference space
 * `selections[].ref` uses — and is optional because `source_instance_id` is
 * nullable for the reason that column records at length: no bundled species can
 * have a source instance today, and a hand-typed one never will.
 *
 * `sourceSubclass` EXISTS BECAUSE ONE REF CAN MINT TWO SOURCE INSTANCES. A
 * `classes[]` entry carrying a `subclassKey` imports as a class source AND a
 * subclass source, and both are roots the document cannot tell apart with a ref
 * alone. `selections[].ref` does not care — it searches the descendants of both
 * — but an effect names exactly one row, and a Fighter's subclass feature
 * arriving attached to `Fighter 3` is a silently WRONG provenance rather than an
 * absent one. The flag says "the subclass root of that ref", is only ever
 * `true`, and is refused unless its ref really is a class carrying a subclass.
 *
 * There is no `sort_order`: ARRAY POSITION is the order, exactly as it is for
 * `speciesTraits`.
 */
export interface ShareEffect {
  readonly kind: string;
  readonly label: string;
  readonly damage_type?: string;
  readonly hit_points_flat?: number;
  readonly hit_points_per_level?: number;
  readonly speed_bonus_feet?: number;
  readonly sourceRef?: number;
  readonly sourceSubclass?: true;
  readonly notes?: string;
  /**
   * The `ability_increase` payload (v4, B2): present exactly when `kind` is
   * `ability_increase`, all three together, mirroring the table's CHECKs. FOR
   * THIS KIND `sourceRef` IS REQUIRED — the format's "an effect may travel
   * without its provenance" allowance does not extend to it, because the
   * schema's `character_effects_ability_increase_source_check` makes a
   * sourceless contribution unrepresentable and a document carrying one would
   * be an export our own importer refuses (D60's surviving defect, named in
   * plan §3.3).
   */
  readonly ability?: string;
  readonly amount?: number;
  readonly maximum?: number;
}

export interface ShareBackground {
  readonly name: string;
  readonly ability_score_1?: string;
  readonly ability_score_2?: string;
  readonly ability_score_3?: string;
  readonly feat_name?: string;
  readonly skill_proficiency_1?: string;
  readonly skill_proficiency_2?: string;
  readonly tool_proficiency?: string;
  readonly equipment_option_a?: string;
  readonly equipment_option_b?: string;
  readonly notes?: string;
}

/** The nullable text fields of a shared species, in wire order. */
export const SHARE_SPECIES_TEXT = [
  'creature_type',
  'size',
  'notes',
] as const satisfies readonly (keyof ShareSpecies)[];

/** The nullable text fields of a shared species trait, in wire order. */
export const SHARE_SPECIES_TRAIT_TEXT = [
  'description',
  'effect_kind',
  'effect_damage_type',
  'notes',
] as const satisfies readonly (keyof ShareSpeciesTrait)[];

/** The signed integer effect payloads of a trait, in wire order. */
export const SHARE_SPECIES_TRAIT_NUMBERS = [
  'effect_hit_points_flat',
  'effect_hit_points_per_level',
  'effect_speed_bonus_feet',
] as const satisfies readonly (keyof ShareSpeciesTrait)[];

/** The nullable text fields of a shared effect, in wire order. */
export const SHARE_EFFECT_TEXT = [
  'damage_type',
  'notes',
] as const satisfies readonly (keyof ShareEffect)[];

/** The signed integer payloads of a shared effect, in wire order. */
export const SHARE_EFFECT_NUMBERS = [
  'hit_points_flat',
  'hit_points_per_level',
  'speed_bonus_feet',
] as const satisfies readonly (keyof ShareEffect)[];

/** The nullable text fields of a shared background, in wire order. */
export const SHARE_BACKGROUND_TEXT = [
  'ability_score_1',
  'ability_score_2',
  'ability_score_3',
  'feat_name',
  'skill_proficiency_1',
  'skill_proficiency_2',
  'tool_proficiency',
  'equipment_option_a',
  'equipment_option_b',
  'notes',
] as const satisfies readonly (keyof ShareBackground)[];

const SHARE_BACKGROUND_TEXT_LIMITS: Readonly<
  Record<(typeof SHARE_BACKGROUND_TEXT)[number], number>
> = {
  ability_score_1: ORIGIN_TEXT_LIMITS.ability_score,
  ability_score_2: ORIGIN_TEXT_LIMITS.ability_score,
  ability_score_3: ORIGIN_TEXT_LIMITS.ability_score,
  feat_name: ORIGIN_TEXT_LIMITS.feat_name,
  skill_proficiency_1: ORIGIN_TEXT_LIMITS.skill_proficiency,
  skill_proficiency_2: ORIGIN_TEXT_LIMITS.skill_proficiency,
  tool_proficiency: ORIGIN_TEXT_LIMITS.tool_proficiency,
  equipment_option_a: ORIGIN_TEXT_LIMITS.equipment_option,
  equipment_option_b: ORIGIN_TEXT_LIMITS.equipment_option,
  notes: ORIGIN_TEXT_LIMITS.notes,
};

const SHARE_SPECIES_TEXT_LIMITS: Readonly<
  Record<(typeof SHARE_SPECIES_TEXT)[number], number>
> = {
  creature_type: ORIGIN_TEXT_LIMITS.creature_type,
  size: ORIGIN_TEXT_LIMITS.size,
  notes: ORIGIN_TEXT_LIMITS.notes,
};

const SHARE_EFFECT_TEXT_LIMITS: Readonly<
  Record<(typeof SHARE_EFFECT_TEXT)[number], number>
> = {
  damage_type: ORIGIN_TEXT_LIMITS.name,
  notes: ORIGIN_TEXT_LIMITS.notes,
};

const SHARE_SPECIES_TRAIT_TEXT_LIMITS: Readonly<
  Record<(typeof SHARE_SPECIES_TRAIT_TEXT)[number], number>
> = {
  description: ORIGIN_TEXT_LIMITS.description,
  // Bounded like any other string even though the value must then be one of
  // four enum members: the length check names the field, the enum check names
  // the vocabulary, and a 400 KB `effect_kind` should fail on the first.
  effect_kind: ORIGIN_TEXT_LIMITS.name,
  effect_damage_type: ORIGIN_TEXT_LIMITS.name,
  notes: ORIGIN_TEXT_LIMITS.notes,
};

export interface CharacterShareDocument {
  readonly format: typeof CHARACTER_SHARE_FORMAT;
  readonly version: typeof CHARACTER_SHARE_VERSION;
  readonly character: ShareCharacter;
  readonly classes: readonly ShareClass[];
  readonly sources: readonly ShareSource[];
  readonly selections: readonly ShareSelection[];
  readonly spellbook: readonly string[];
  readonly preferences: readonly SharePreference[];
  readonly overrides: readonly ShareOverride[];
  readonly acknowledgements?: readonly { readonly warning: string }[];
  readonly loadouts?: readonly ShareLoadout[];
  readonly placeholders?: readonly SharePlaceholder[];
  /**
   * OPTIONAL, AND THAT IS THE COMPATIBILITY GUARANTEE.
   *
   * Every share link generated before weapons travelled has no `weapons` key.
   * Making the field required would make each of those links unreadable, which
   * would be a far worse loss than the one this change closes. Absent means the
   * document predates weapons or the character has none — and both import to a
   * character with no weapons, which is correct in both cases.
   */
  readonly weapons?: readonly ShareWeapon[];
  /**
   * THE CHARACTER'S ORIGIN. Three optional sections for the same compatibility
   * reason `weapons` is optional: every link generated before origins travelled
   * has none of these keys, and making any of them required would make each of
   * those links unreadable.
   *
   * Three sections and not one nested object, because they are independently
   * absent — a character may have a background and no species — and a nested
   * object would need a fourth "present but empty" state to say so.
   *
   * `speciesTraits` carries no `sort_order`: the ARRAY POSITION is the printed
   * order, which is the one place a positional format is unambiguously the
   * right encoding of an ordering.
   */
  readonly species?: ShareSpecies;
  readonly speciesTraits?: readonly ShareSpeciesTrait[];
  readonly background?: ShareBackground;
  /**
   * THE CHARACTER'S OWN EFFECTS. Optional for the fourth time and on the same
   * compatibility guarantee: every link generated before this change carries no
   * `effects` key, and making it required would make each of those links
   * unreadable.
   *
   * Absent means one of two things and both import correctly: the link predates
   * the effect model, in which case any effects it carries are on its trait
   * rows and are migrated from there; or the character genuinely has none.
   */
  readonly effects?: readonly ShareEffect[];
  /**
   * THE FOUR STORED SHEET INPUTS. Optional for the third time and for the same
   * compatibility guarantee: every link generated before this change carries
   * none of these keys, and making any of them required would make each of
   * those links unreadable — a far larger loss than the one this change closes.
   *
   * Four keys rather than one nested object, because they are independently
   * absent: a character may have chosen skills and rolled no dice. A nested
   * object would need a fifth "present but empty" state to say so.
   *
   * `skillProficiencies` is a bare string list and NOT a list of objects: the
   * row has exactly one meaningful column, presence IS the value, and an object
   * wrapper would invite a `proficient: false` member that means nothing.
   */
  readonly armor?: readonly ShareArmor[];
  readonly hitPointRolls?: readonly ShareHitPointRoll[];
  readonly skillProficiencies?: readonly string[];
  readonly sheetAdjustment?: ShareSheetAdjustment;
  /**
   * THE SKILL GRANTS (wire v5) — the provenance source of truth
   * `skillProficiencies` above is now a derived projection of. Optional on
   * the same terms as every appended section: absent means the character has
   * none. There is no pre-v5 compatibility story here, because pre-v5
   * documents are RETIRED outright (D60, plan §3.2) — the v4→v5 migration
   * deliberately throws rather than fabricating attribution for bare skill
   * strings.
   */
  readonly skillGrants?: readonly ShareSkillGrant[];
}

export class ShareValidationError extends TypeError {
  constructor(message: string) {
    super(`Invalid character share: ${message}`);
    this.name = 'ShareValidationError';
  }
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ShareValidationError(`${label} must be an object.`);
  }
  return value as JsonRecord;
}

function exactKeys(
  value: JsonRecord,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      throw new ShareValidationError(`${label} is missing ${key}.`);
    }
  }
  const allowed = new Set([...required, ...optional]);
  const unexpected = keys.find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    throw new ShareValidationError(
      `${label} contains unknown field ${unexpected}.`,
    );
  }
}

function list(
  value: unknown,
  label: string,
  maximum: number,
): unknown[] {
  if (!Array.isArray(value)) {
    throw new ShareValidationError(`${label} must be a list.`);
  }
  if (value.length > maximum) {
    throw new ShareValidationError(
      `${label} exceeds the maximum count of ${maximum}.`,
    );
  }
  return value;
}

function text(
  value: unknown,
  label: string,
  maximum = 240,
): string {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > maximum
  ) {
    throw new ShareValidationError(
      `${label} must be a string of 1-${maximum} characters.`,
    );
  }
  return value;
}

function integer(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < minimum ||
    Number(value) > maximum
  ) {
    throw new ShareValidationError(
      `${label} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return Number(value);
}

function spellKey(value: unknown, label: string): string {
  const key = text(value, label, 200);
  const reserved = new Set(['__proto__', 'prototype', 'constructor']);
  if (
    !isSpellVersionKey(key) ||
    key
      .split(/[:.]/)
      .some((component) => reserved.has(component))
  ) {
    throw new ShareValidationError(`${label} has invalid spell-key grammar.`);
  }
  return key;
}

function jsonValue(value: unknown, label: string, depth = 0): unknown {
  if (depth > 8) {
    throw new ShareValidationError(`${label} exceeds maximum nesting.`);
  }
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    if (typeof value === 'string' && value.length > 2_000) {
      throw new ShareValidationError(`${label} contains an overlong string.`);
    }
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    if (value.length > 200) {
      throw new ShareValidationError(`${label} contains too many items.`);
    }
    return value.map((item, index) =>
      jsonValue(item, `${label}[${index}]`, depth + 1),
    );
  }
  const source = record(value, label);
  const entries = Object.entries(source);
  if (entries.length > 100) {
    throw new ShareValidationError(`${label} contains too many fields.`);
  }
  return Object.fromEntries(
    entries.map(([key, item]) => {
      const field = text(key, `${label} field name`, 100);
      if (
        field === '__proto__' ||
        field === 'prototype' ||
        field === 'constructor'
      ) {
        throw new ShareValidationError(
          `${label} field name '${field}' is reserved.`,
        );
      }
      return [field, jsonValue(item, `${label}.${field}`, depth + 1)];
    }),
  );
}

function config(
  value: unknown,
  label: string,
): Readonly<Record<string, unknown>> {
  const decoded = jsonValue(value, label);
  const result = record(decoded, label);
  const rejectDatabaseIds = (
    item: unknown,
    itemLabel: string,
  ): void => {
    if (Array.isArray(item)) {
      item.forEach((entry, index) =>
        rejectDatabaseIds(entry, `${itemLabel}[${index}]`),
      );
      return;
    }
    if (item === null || typeof item !== 'object') {
      return;
    }
    for (const [key, entry] of Object.entries(item)) {
      if (key === 'spell_version_id') {
        throw new ShareValidationError(
          `${itemLabel}.spell_version_id is a database identifier and is not allowed in a share document.`,
        );
      }
      rejectDatabaseIds(entry, `${itemLabel}.${key}`);
    }
  };
  rejectDatabaseIds(result, label);
  return result;
}

/**
 * A non-negative distance in feet, or absent.
 *
 * These are the frozen v1 wire fields, not current storage columns. The bound
 * is the SAME judgement the storage and write boundaries make — see
 * `WEAPON_RANGE_MAX_FEET`. Owning a separate number here would let the wire
 * validator refuse a range the app had already stored.
 */
function weaponRange(value: unknown, label: string): number {
  return integer(value, label, 0, WEAPON_RANGE_MAX_FEET);
}

function shareDamage(value: unknown, label: string): WeaponDamage {
  const damage = record(value, label);
  if (typeof damage.kind !== 'string') {
    throw new ShareValidationError(`${label}.kind must be a string.`);
  }
  switch (damage.kind) {
    case 'dice':
      exactKeys(damage, ['kind', 'dice'], [], label);
      return {
        kind: 'dice',
        dice: text(
          damage.dice,
          `${label}.dice`,
          WEAPON_TEXT_LIMITS.damage_dice,
        ),
      };
    case 'flat':
      exactKeys(damage, ['kind', 'amount'], [], label);
      return {
        kind: 'flat',
        amount: integer(
          damage.amount,
          `${label}.amount`,
          0,
          Number.MAX_SAFE_INTEGER,
        ),
      };
    case 'custom':
      exactKeys(damage, ['kind', 'text'], [], label);
      return {
        kind: 'custom',
        text: text(
          damage.text,
          `${label}.text`,
          WEAPON_TEXT_LIMITS.damage_custom,
        ),
      };
    case 'not_recorded':
      exactKeys(damage, ['kind'], [], label);
      return { kind: 'not_recorded' };
    default:
      throw new ShareValidationError(`${label}.kind is unsupported.`);
  }
}

function shareVersatileDamage(
  value: unknown,
  label: string,
): VersatileWeaponDamage {
  const row = record(value, label);
  if (row.kind === 'not_applicable') {
    exactKeys(row, ['kind'], [], label);
    return { kind: 'not_applicable' };
  }
  const damage = shareDamage(value, label);
  if (damage.kind === 'not_recorded') {
    throw new ShareValidationError(`${label}.kind is unsupported.`);
  }
  return damage;
}

function shareWeaponRange(value: unknown, label: string): WeaponRange {
  const row = record(value, label);
  if (!isWeaponRangeKind(row.kind)) {
    throw new ShareValidationError(`${label}.kind is unsupported.`);
  }
  switch (row.kind) {
    case 'none':
      exactKeys(row, ['kind'], [], label);
      return { kind: 'none' };
    case 'ranged': {
      exactKeys(row, ['kind', 'near_feet', 'far_feet'], [], label);
      const near = weaponRange(row.near_feet, `${label}.near_feet`);
      const far = row.far_feet === null
        ? null
        : weaponRange(row.far_feet, `${label}.far_feet`);
      try {
        return weaponRangeFromStorage(row.kind, near, far);
      } catch {
        throw new ShareValidationError(
          `${label} must have a far distance greater than or equal to its near distance.`,
        );
      }
    }
    case 'legacy': {
      exactKeys(row, ['kind', 'near_feet', 'far_feet'], [], label);
      const near = row.near_feet === null
        ? null
        : weaponRange(row.near_feet, `${label}.near_feet`);
      const far = weaponRange(row.far_feet, `${label}.far_feet`);
      try {
        return weaponRangeFromStorage(row.kind, near, far);
      } catch {
        throw new ShareValidationError(
          `${label} is not an exceptional v1 range pair.`,
        );
      }
    }
  }
}

function shareWeapon(
  value: unknown,
  label: string,
  knownSourceIds: ReadonlySet<number>,
): ShareWeapon {
  const row = record(value, label);
  exactKeys(
    row,
    ['name', 'damage', 'versatile_damage', 'range'],
    [
      'proficiency_category',
      ...SHARE_WEAPON_TEXT,
      'mastery_property',
      'other_properties',
      'notes',
      ...SHARE_WEAPON_FLAGS,
      'sourceRef',
    ],
    label,
  );
  const weapon: Record<string, unknown> = {
    name: text(row.name, `${label}.name`, WEAPON_TEXT_LIMITS.name),
    damage: shareDamage(row.damage, `${label}.damage`),
    versatile_damage: shareVersatileDamage(
      row.versatile_damage,
      `${label}.versatile_damage`,
    ),
    range: shareWeaponRange(row.range, `${label}.range`),
  };
  // D27. Checked against the enum here rather than passed through as text, for
  // the same reason `mastery_property` is: `character_weapons` has a CHECK on
  // this column, so a document carrying `martial_ranged` would otherwise reach
  // the INSERT and abort the whole import with a raw SQLITE_CONSTRAINT_CHECK
  // naming nothing.
  if (row.proficiency_category !== undefined) {
    const category = text(
      row.proficiency_category,
      `${label}.proficiency_category`,
      WEAPON_TEXT_LIMITS.name,
    );
    if (
      !weaponProficiencyCategories.includes(
        category as (typeof weaponProficiencyCategories)[number],
      )
    ) {
      throw new ShareValidationError(
        `${label}.proficiency_category is unsupported.`,
      );
    }
    weapon.proficiency_category = category;
  }
  for (const field of SHARE_WEAPON_TEXT) {
    if (row[field] !== undefined) {
      weapon[field] = text(
        row[field],
        `${label}.${field}`,
        WEAPON_TEXT_LIMITS[field],
      );
    }
  }
  if (row.mastery_property !== undefined) {
    const property = text(
      row.mastery_property,
      `${label}.mastery_property`,
      WEAPON_TEXT_LIMITS.mastery_property,
    );
    if (
      !weaponMasteryProperties.includes(
        property as (typeof weaponMasteryProperties)[number],
      )
    ) {
      throw new ShareValidationError(
        `${label}.mastery_property is unsupported.`,
      );
    }
    weapon.mastery_property = property;
  }
  // The two long free-text columns. The cap names the weapon and the field when
  // a hostile document sends 400 KB of prose, instead of letting it surface far
  // away as a compressed-byte overflow. It is the write boundary's own number,
  // so it can never refuse text this app itself allowed the user to store.
  for (const field of ['other_properties', 'notes'] as const) {
    if (row[field] !== undefined) {
      weapon[field] = text(
        row[field],
        `${label}.${field}`,
        WEAPON_TEXT_LIMITS[field],
      );
    }
  }
  for (const flag of SHARE_WEAPON_FLAGS) {
    if (row[flag] === undefined) {
      continue;
    }
    if (row[flag] !== true) {
      throw new ShareValidationError(
        `${label}.${flag} must be true when present.`,
      );
    }
    weapon[flag] = true;
  }
  // The database's own CHECK, applied at the boundary through the SAME rule the
  // portable backup and the quarantined-image audit use. Reaching the INSERT
  // with this pair would abort the whole import transaction with a raw
  // SQLITE_CONSTRAINT_CHECK naming nothing.
  const mastery = weaponMasterySelectionError(
    {
      mastery_selected: weapon.mastery_selected === true ? 1 : 0,
      mastery_property: weapon.mastery_property ?? null,
    },
    label,
  );
  if (mastery !== null) {
    throw new ShareValidationError(mastery);
  }
  // The equipment-provenance reference (wire v6): the SAME reference space
  // `selections[].ref` uses, checked the same way — a ref naming no source in
  // this document would import as a weapon pointing at nothing, which the
  // composite foreign key would then refuse mid-transaction.
  if (row.sourceRef !== undefined) {
    const ref = integer(row.sourceRef, `${label}.sourceRef`, 0, 119);
    if (!knownSourceIds.has(ref)) {
      throw new ShareValidationError(`${label}.sourceRef is unknown.`);
    }
    weapon.sourceRef = ref;
  }
  return weapon as unknown as ShareWeapon;
}

function originInteger(
  value: unknown,
  label: string,
  maximum: number,
  minimum: number,
): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new ShareValidationError(`${label} must be an integer.`);
  }
  if (value < minimum || value > maximum) {
    throw new ShareValidationError(
      `${label} must be between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}

/**
 * One armour row, held to EXACTLY the constraints `character_armor` declares.
 *
 * Applying the database's own CHECKs here rather than letting the INSERT do it
 * is the same call `shareWeapon` and `shareSpeciesTrait` already make: a
 * constraint violation inside the import transaction aborts the whole import
 * with a raw SQLITE_CONSTRAINT_CHECK naming nothing the recipient could act on,
 * and the transaction has by then already written unrelated rows.
 */
function shareArmor(
  value: unknown,
  label: string,
  knownSourceIds: ReadonlySet<number>,
): ShareArmor {
  const row = record(value, label);
  exactKeys(
    row,
    ['slot', 'name', 'category', 'armor_class', 'dex_bonus'],
    [...SHARE_ARMOR_NUMBERS, ...SHARE_ARMOR_FLAGS, 'notes', 'sourceRef'],
    label,
  );
  const armor: Record<string, unknown> = {
    name: text(row.name, `${label}.name`, SHEET_TEXT_LIMITS.armor_name),
  };
  const vocabularies: Readonly<
    Record<(typeof SHARE_ARMOR_ENUMS)[number], readonly string[]>
  > = {
    slot: armorSlots,
    category: armorCategories,
    dex_bonus: armorDexBonuses,
  };
  for (const field of SHARE_ARMOR_ENUMS) {
    const member = text(row[field], `${label}.${field}`, 40);
    if (!vocabularies[field].includes(member)) {
      throw new ShareValidationError(`${label}.${field} is unsupported.`);
    }
    armor[field] = member;
  }
  armor.armor_class = integer(
    row.armor_class,
    `${label}.armor_class`,
    1,
    SHEET_ARMOR_MAX.armor_class,
  );
  if (row.dex_bonus_max !== undefined) {
    // Lower bound 0, not 1: a cap of zero is a coherent house rule, and it is
    // the pairing with `capped` — not the magnitude — that the schema enforces.
    armor.dex_bonus_max = integer(
      row.dex_bonus_max,
      `${label}.dex_bonus_max`,
      0,
      SHEET_ARMOR_MAX.dex_bonus_max,
    );
  }
  if (row.strength_requirement !== undefined) {
    armor.strength_requirement = integer(
      row.strength_requirement,
      `${label}.strength_requirement`,
      1,
      SHEET_ARMOR_MAX.strength_requirement,
    );
  }
  for (const flag of SHARE_ARMOR_FLAGS) {
    if (row[flag] === undefined) {
      continue;
    }
    if (row[flag] !== true) {
      throw new ShareValidationError(
        `${label}.${flag} must be true when present.`,
      );
    }
    armor[flag] = true;
  }
  if (row.notes !== undefined) {
    armor.notes = text(
      row.notes,
      `${label}.notes`,
      SHEET_TEXT_LIMITS.armor_notes,
    );
  }
  // `character_armor_dex_bonus_max_check`, in both directions.
  if ((armor.dex_bonus === 'capped') !== (armor.dex_bonus_max !== undefined)) {
    throw new ShareValidationError(
      `${label}.dex_bonus_max is present exactly when dex_bonus is capped.`,
    );
  }
  // `character_armor_shield_check`. A Shield contributes a bonus and never a
  // Dexterity term, so a shield carrying one would be a field that reads as
  // meaningful and is ignored.
  if (armor.category === 'shield' && armor.dex_bonus !== 'none') {
    throw new ShareValidationError(
      `${label}.dex_bonus must be none for a shield.`,
    );
  }
  // The equipment-provenance reference (wire v6), on `shareWeapon`'s terms.
  if (row.sourceRef !== undefined) {
    const ref = integer(row.sourceRef, `${label}.sourceRef`, 0, 119);
    if (!knownSourceIds.has(ref)) {
      throw new ShareValidationError(`${label}.sourceRef is unknown.`);
    }
    armor.sourceRef = ref;
  }
  return armor as unknown as ShareArmor;
}

function shareHitPointRoll(
  value: unknown,
  label: string,
): ShareHitPointRoll {
  const row = record(value, label);
  exactKeys(row, ['className', 'classLevel', 'value'], [], label);
  return {
    className: text(
      row.className,
      `${label}.className`,
      SHEET_TEXT_LIMITS.class_name,
    ),
    classLevel: integer(row.classLevel, `${label}.classLevel`, 1, 20),
    // The bounds are the schema's own and the write boundary's own, from one
    // module — see `SHEET_ROLL_BOUNDS`.
    value: integer(
      row.value,
      `${label}.value`,
      SHEET_ROLL_BOUNDS.minimum,
      SHEET_ROLL_BOUNDS.maximum,
    ),
  };
}

function shareSheetAdjustment(
  value: unknown,
  label: string,
): ShareSheetAdjustment {
  const row = record(value, label);
  exactKeys(row, ['value'], ['note'], label);
  const magnitude = SHEET_ADJUSTMENT_BOUNDS.armorClassMagnitude;
  const adjustment: Record<string, unknown> = {
    value: integer(row.value, `${label}.value`, -magnitude, magnitude),
  };
  if (row.note !== undefined) {
    adjustment.note = text(
      row.note,
      `${label}.note`,
      SHEET_TEXT_LIMITS.adjustment_note,
    );
  }
  return adjustment as unknown as ShareSheetAdjustment;
}

function shareSpecies(value: unknown, label: string): ShareSpecies {
  const row = record(value, label);
  exactKeys(row, ['name'], [...SHARE_SPECIES_TEXT, 'base_speed_feet'], label);
  const species: Record<string, unknown> = {
    name: text(row.name, `${label}.name`, ORIGIN_TEXT_LIMITS.name),
  };
  for (const field of SHARE_SPECIES_TEXT) {
    if (row[field] !== undefined) {
      species[field] = text(
        row[field],
        `${label}.${field}`,
        SHARE_SPECIES_TEXT_LIMITS[field],
      );
    }
  }
  if (row.base_speed_feet !== undefined) {
    // Lower bound 1, not 0 — the same call `character_species_base_speed_check`
    // makes. A Speed of 0 is not "not decided yet"; the absent key is.
    species.base_speed_feet = originInteger(
      row.base_speed_feet,
      `${label}.base_speed_feet`,
      ORIGIN_SPEED_MAX_FEET,
      1,
    );
  }
  return species as unknown as ShareSpecies;
}

function shareSpeciesTrait(value: unknown, label: string): ShareSpeciesTrait {
  const row = record(value, label);
  exactKeys(
    row,
    ['name'],
    [...SHARE_SPECIES_TRAIT_TEXT, ...SHARE_SPECIES_TRAIT_NUMBERS],
    label,
  );
  const trait: Record<string, unknown> = {
    name: text(row.name, `${label}.name`, ORIGIN_TEXT_LIMITS.trait_name),
  };
  for (const field of SHARE_SPECIES_TRAIT_TEXT) {
    if (row[field] !== undefined) {
      trait[field] = text(
        row[field],
        `${label}.${field}`,
        SHARE_SPECIES_TRAIT_TEXT_LIMITS[field],
      );
    }
  }
  for (const field of SHARE_SPECIES_TRAIT_NUMBERS) {
    if (row[field] !== undefined) {
      trait[field] = originInteger(
        row[field],
        `${label}.${field}`,
        ORIGIN_EFFECT_MAGNITUDE_MAX,
        -ORIGIN_EFFECT_MAGNITUDE_MAX,
      );
    }
  }
  // THE CHECKS THE TRAIT TABLE USED TO CARRY, APPLIED AT THE BOUNDARY AGAINST
  // THE HISTORICAL VOCABULARY.
  //
  // `LEGACY_TRAIT_EFFECT_KINDS` and NOT `effectKinds`, and the difference is the
  // whole compatibility story. A link minted before this build can legitimately
  // say `granted_spells`; validating against the CURRENT three-member set would
  // reject it, which makes a link somebody already pasted into a chat
  // undecodable — the exact data loss this format exists to prevent. It is
  // accepted here and DROPPED at import (`splitLegacyTraitEffect`), which
  // leaves the character with precisely the spells they had, because the spell
  // half never lived here in the first place.
  //
  // The per-kind pairing checks below still run, so a legacy payload that is
  // internally incoherent is still refused rather than reaching an INSERT.
  const kind = trait.effect_kind;
  if (
    kind !== undefined &&
    !LEGACY_TRAIT_EFFECT_KINDS.includes(
      kind as (typeof LEGACY_TRAIT_EFFECT_KINDS)[number],
    )
  ) {
    throw new ShareValidationError(`${label}.effect_kind is unsupported.`);
  }
  if (trait.effect_damage_type !== undefined && kind !== 'damage_resistance') {
    throw new ShareValidationError(
      `${label}.effect_damage_type requires effect_kind damage_resistance.`,
    );
  }
  const hasHitPoints =
    trait.effect_hit_points_flat !== undefined ||
    trait.effect_hit_points_per_level !== undefined;
  if (hasHitPoints && kind !== 'hp_modifier') {
    throw new ShareValidationError(
      `${label} hit point effects require effect_kind hp_modifier.`,
    );
  }
  if (kind === 'hp_modifier' && !hasHitPoints) {
    throw new ShareValidationError(
      `${label} effect_kind hp_modifier requires a hit point value.`,
    );
  }
  if (trait.effect_speed_bonus_feet !== undefined && kind !== 'speed') {
    throw new ShareValidationError(
      `${label}.effect_speed_bonus_feet requires effect_kind speed.`,
    );
  }
  if (kind === 'speed' && trait.effect_speed_bonus_feet === undefined) {
    throw new ShareValidationError(
      `${label} effect_kind speed requires effect_speed_bonus_feet.`,
    );
  }
  return trait as unknown as ShareSpeciesTrait;
}

/**
 * One effect, held to EXACTLY the constraints `character_effects` declares.
 *
 * Applying the database's own CHECKs here rather than letting the INSERT do it
 * is the same call `shareWeapon`, `shareArmor` and `shareSpeciesTrait` already
 * make: reaching the INSERT with an unknown kind, or a payload belonging to a
 * different kind, aborts the whole import transaction with a raw
 * SQLITE_CONSTRAINT_CHECK naming nothing the user could act on.
 *
 * `effectKinds` and not the legacy list, because this section did not exist
 * before this build: no link in the wild can carry a `granted_spells` effect
 * HERE, and accepting one would be inventing tolerance for an artifact that
 * cannot exist.
 */
function shareEffect(
  value: unknown,
  label: string,
  knownSourceIds: ReadonlySet<number>,
  subclassRefs: ReadonlySet<number>,
): ShareEffect {
  const row = record(value, label);
  exactKeys(
    row,
    ['kind', 'label'],
    [
      ...SHARE_EFFECT_TEXT,
      ...SHARE_EFFECT_NUMBERS,
      'sourceRef',
      'sourceSubclass',
      'ability',
      'amount',
      'maximum',
    ],
    label,
  );
  const kind = row.kind;
  if (
    typeof kind !== 'string' ||
    !effectKinds.includes(kind as (typeof effectKinds)[number])
  ) {
    throw new ShareValidationError(`${label}.kind is unsupported.`);
  }
  const effect: Record<string, unknown> = {
    kind,
    // Non-empty, matching `character_effects.label`: an effect nobody can name
    // is an effect nobody can find to edit or delete.
    label: text(row.label, `${label}.label`, ORIGIN_TEXT_LIMITS.trait_name),
  };
  for (const field of SHARE_EFFECT_TEXT) {
    if (row[field] !== undefined) {
      effect[field] = text(
        row[field],
        `${label}.${field}`,
        SHARE_EFFECT_TEXT_LIMITS[field],
      );
    }
  }
  for (const field of SHARE_EFFECT_NUMBERS) {
    if (row[field] !== undefined) {
      effect[field] = originInteger(
        row[field],
        `${label}.${field}`,
        ORIGIN_EFFECT_MAGNITUDE_MAX,
        -ORIGIN_EFFECT_MAGNITUDE_MAX,
      );
    }
  }
  if (row.sourceRef !== undefined) {
    const ref = integer(row.sourceRef, `${label}.sourceRef`, 0, 119);
    // The SAME reference space `selections[].ref` uses, and checked the same
    // way: a ref naming no source in this document would import as an effect
    // pointing at nothing, which the composite foreign key would then refuse
    // mid-transaction with a message naming neither the effect nor the source.
    if (!knownSourceIds.has(ref)) {
      throw new ShareValidationError(`${label}.sourceRef is unknown.`);
    }
    effect.sourceRef = ref;
  }
  if (row.sourceSubclass !== undefined) {
    // Checked here rather than at import for the reason `sourceRef` is: the
    // import resolves a flagged ref to the SECOND root that ref minted, and a
    // flag naming a ref that mints only one would read `roots[1]` — `undefined`
    // — and quietly write the effect with no provenance at all. Refusing the
    // document says which effect is wrong; the silent version says nothing.
    if (row.sourceSubclass !== true) {
      throw new ShareValidationError(
        `${label}.sourceSubclass must be true when present.`,
      );
    }
    if (effect.sourceRef === undefined) {
      throw new ShareValidationError(
        `${label}.sourceSubclass requires a sourceRef.`,
      );
    }
    if (!subclassRefs.has(effect.sourceRef as number)) {
      throw new ShareValidationError(
        `${label}.sourceSubclass names a ref with no subclass.`,
      );
    }
    effect.sourceSubclass = true;
  }
  if (effect.damage_type !== undefined && kind !== 'damage_resistance') {
    throw new ShareValidationError(
      `${label}.damage_type requires kind damage_resistance.`,
    );
  }
  const hasHitPoints =
    effect.hit_points_flat !== undefined ||
    effect.hit_points_per_level !== undefined;
  if (hasHitPoints && kind !== 'hp_modifier') {
    throw new ShareValidationError(
      `${label} hit point payloads require kind hp_modifier.`,
    );
  }
  if (kind === 'hp_modifier' && !hasHitPoints) {
    throw new ShareValidationError(
      `${label} kind hp_modifier requires a hit point value.`,
    );
  }
  if (effect.speed_bonus_feet !== undefined && kind !== 'speed') {
    throw new ShareValidationError(
      `${label}.speed_bonus_feet requires kind speed.`,
    );
  }
  if (kind === 'speed' && effect.speed_bonus_feet === undefined) {
    throw new ShareValidationError(
      `${label} kind speed requires speed_bonus_feet.`,
    );
  }
  // The `ability_increase` payload (v4, B2), held to EXACTLY the table's own
  // CHECKs: the three fields together and only for this kind, an ability from
  // the closed six, a signed non-zero amount, a maximum inside the 1–30 range
  // `AbilityScore` can represent — and, unlike every other kind, a REQUIRED
  // `sourceRef`. The format's "travels without provenance" allowance does not
  // extend here: the table's required-source CHECK would make our own importer
  // refuse the document, and this validator runs on export too, so the refusal
  // happens while the character is still on the sender's screen.
  const abilityPayloadPresent =
    row.ability !== undefined ||
    row.amount !== undefined ||
    row.maximum !== undefined;
  if (abilityPayloadPresent && kind !== 'ability_increase') {
    throw new ShareValidationError(
      `${label} ability payloads require kind ability_increase.`,
    );
  }
  if (kind === 'ability_increase') {
    if (
      row.ability === undefined ||
      row.amount === undefined ||
      row.maximum === undefined
    ) {
      throw new ShareValidationError(
        `${label} kind ability_increase requires ability, amount and maximum.`,
      );
    }
    if (
      typeof row.ability !== 'string' ||
      !abilities.includes(row.ability as (typeof abilities)[number])
    ) {
      throw new ShareValidationError(`${label}.ability is unsupported.`);
    }
    effect.ability = row.ability;
    const amount = originInteger(
      row.amount,
      `${label}.amount`,
      ORIGIN_EFFECT_MAGNITUDE_MAX,
      -ORIGIN_EFFECT_MAGNITUDE_MAX,
    );
    if (amount === 0) {
      throw new ShareValidationError(`${label}.amount must not be zero.`);
    }
    effect.amount = amount;
    effect.maximum = originInteger(
      row.maximum,
      `${label}.maximum`,
      ABILITY_SCORE_MAX,
      ABILITY_SCORE_MIN,
    );
    if (effect.sourceRef === undefined) {
      throw new ShareValidationError(
        `${label} kind ability_increase requires a sourceRef.`,
      );
    }
  }
  return effect as unknown as ShareEffect;
}

function shareBackground(value: unknown, label: string): ShareBackground {
  const row = record(value, label);
  exactKeys(row, ['name'], [...SHARE_BACKGROUND_TEXT], label);
  const background: Record<string, unknown> = {
    name: text(row.name, `${label}.name`, ORIGIN_TEXT_LIMITS.name),
  };
  for (const field of SHARE_BACKGROUND_TEXT) {
    if (row[field] !== undefined) {
      background[field] = text(
        row[field],
        `${label}.${field}`,
        SHARE_BACKGROUND_TEXT_LIMITS[field],
      );
    }
  }
  return background as unknown as ShareBackground;
}

function assertUnique(
  values: readonly string[],
  label: string,
): void {
  if (new Set(values).size !== values.length) {
    throw new ShareValidationError(`${label} contains duplicate records.`);
  }
}

export function validateShareDocument(
  input: unknown,
): CharacterShareDocument {
  const source = record(input, 'document');
  exactKeys(
    source,
    [
      'format',
      'version',
      'character',
      'classes',
      'sources',
      'selections',
      'spellbook',
      'preferences',
      'overrides',
    ],
    [
      'acknowledgements',
      'loadouts',
      'placeholders',
      'weapons',
      'species',
      'speciesTraits',
      'background',
      'armor',
      'hitPointRolls',
      'skillProficiencies',
      'sheetAdjustment',
      'effects',
      'skillGrants',
    ],
    'document',
  );
  if (source.format !== CHARACTER_SHARE_FORMAT) {
    throw new ShareValidationError('format is unsupported.');
  }
  if (source.version !== CHARACTER_SHARE_VERSION) {
    throw new ShareValidationError('version is unsupported.');
  }

  const rawCharacter = record(source.character, 'character');
  exactKeys(
    rawCharacter,
    ['name'],
    [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
      'ability_allocation_method',
      'proficiency_bonus_override',
      'rules_edition_preference',
      'allow_legacy',
      'notes',
    ],
    'character',
  );
  const character: Record<string, unknown> = {
    name: text(rawCharacter.name, 'character.name', 120),
  };
  for (const ability of [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ] as const) {
    if (rawCharacter[ability] !== undefined) {
      character[ability] = integer(
        rawCharacter[ability],
        `character.${ability}`,
        1,
        30,
      );
    }
  }
  if (rawCharacter.ability_allocation_method !== undefined) {
    const method = text(
      rawCharacter.ability_allocation_method,
      'character.ability_allocation_method',
      40,
    );
    if (
      !abilityAllocationMethods.includes(
        method as (typeof abilityAllocationMethods)[number],
      )
    ) {
      throw new ShareValidationError(
        'character.ability_allocation_method is unsupported.',
      );
    }
    character.ability_allocation_method = method;
  }
  if (rawCharacter.proficiency_bonus_override !== undefined) {
    character.proficiency_bonus_override = integer(
      rawCharacter.proficiency_bonus_override,
      'character.proficiency_bonus_override',
      1,
      20,
    );
  }
  if (rawCharacter.rules_edition_preference !== undefined) {
    const edition = text(
      rawCharacter.rules_edition_preference,
      'character.rules_edition_preference',
      20,
    );
    if (!rulesEditions.includes(edition as (typeof rulesEditions)[number])) {
      throw new ShareValidationError(
        'character.rules_edition_preference is unsupported.',
      );
    }
    character.rules_edition_preference = edition;
  }
  if (rawCharacter.allow_legacy !== undefined) {
    if (rawCharacter.allow_legacy !== true) {
      throw new ShareValidationError(
        'character.allow_legacy must be true when present.',
      );
    }
    character.allow_legacy = true;
  }
  // Validated exactly as every other optional free-text field in this document
  // is — `text()` with a bound owned outside this module, so the share boundary
  // cannot drift below whatever write boundary the column eventually gets.
  if (rawCharacter.notes !== undefined) {
    character.notes = text(
      rawCharacter.notes,
      'character.notes',
      CHARACTER_TEXT_LIMITS.notes,
    );
  }

  const rawClasses = list(
    source.classes,
    'classes',
    SHARE_LIMITS.classes,
  );
  const classes = rawClasses.map((item, index): ShareClass => {
    const row = record(item, `classes[${index}]`);
    exactKeys(
      row,
      ['id', 'classKey', 'level', 'start'],
      ['subclassKey', 'ability', 'config', 'subclassConfig'],
      `classes[${index}]`,
    );
    const ability =
      row.ability === undefined
        ? undefined
        : text(row.ability, `classes[${index}].ability`, 20);
    if (
      ability !== undefined &&
      !abilities.includes(ability as (typeof abilities)[number])
    ) {
      throw new ShareValidationError(
        `classes[${index}].ability is unsupported.`,
      );
    }
    return {
      id: integer(row.id, `classes[${index}].id`, 0, 119),
      classKey: text(row.classKey, `classes[${index}].classKey`, 200),
      level: integer(row.level, `classes[${index}].level`, 1, 20),
      start: integer(row.start, `classes[${index}].start`, 1, 20),
      ...(row.subclassKey === undefined
        ? {}
        : {
            subclassKey: text(
              row.subclassKey,
              `classes[${index}].subclassKey`,
              200,
            ),
          }),
      ...(ability === undefined ? {} : { ability }),
      ...(row.config === undefined
        ? {}
        : { config: config(row.config, `classes[${index}].config`) }),
      ...(row.subclassConfig === undefined
        ? {}
        : {
            subclassConfig: config(
              row.subclassConfig,
              `classes[${index}].subclassConfig`,
            ),
          }),
    };
  });
  assertUnique(
    classes.map((item) => item.classKey),
    'classes',
  );
  const totalLevel = characterLevel(classes.map((item) => item.level));
  // No classes means the total is undetermined, and an absent total cannot
  // exceed the validation ceiling.
  if (totalLevel !== null && totalLevel > 20) {
    throw new ShareValidationError(
      'combined class levels must not exceed 20.',
    );
  }

  const allowedTypes = new Set(['feat', 'species', 'background']);
  const rawSources = list(
    source.sources,
    'sources',
    SHARE_LIMITS.sources,
  );
  const sources = rawSources.map((item, index): ShareSource => {
    const row = record(item, `sources[${index}]`);
    exactKeys(
      row,
      ['id', 'type', 'key', 'acquired'],
      ['name', 'config'],
      `sources[${index}]`,
    );
    const type = text(row.type, `sources[${index}].type`, 20);
    if (!allowedTypes.has(type)) {
      throw new ShareValidationError(
        `sources[${index}].type is unsupported.`,
      );
    }
    return {
      id: integer(row.id, `sources[${index}].id`, 0, 119),
      type: type as ShareSource['type'],
      key: text(row.key, `sources[${index}].key`, 200),
      ...(row.name === undefined
        ? {}
        : { name: text(row.name, `sources[${index}].name`, 120) }),
      acquired: integer(
        row.acquired,
        `sources[${index}].acquired`,
        1,
        20,
      ),
      ...(row.config === undefined
        ? {}
        : { config: config(row.config, `sources[${index}].config`) }),
    };
  });

  const ids = [...classes, ...sources].map((item) => item.id);
  if (
    new Set(ids).size !== ids.length ||
    [...ids].sort((a, b) => a - b).some((id, index) => id !== index)
  ) {
    throw new ShareValidationError(
      'class/source ids must be unique and contiguous from zero.',
    );
  }
  const knownIds = new Set(ids);
  // The refs that mint TWO source instances rather than one. Only a class entry
  // can, and only when it names a subclass; `sources[]` entries are always a
  // single root, so none of them is ever in here.
  const subclassRefs = new Set(
    classes
      .filter((item) => item.subclassKey !== undefined)
      .map((item) => item.id),
  );

  const selections = list(
    source.selections,
    'selections',
    SHARE_LIMITS.selections,
  ).map((item, index): ShareSelection => {
    const row = record(item, `selections[${index}]`);
    exactKeys(
      row,
      ['ref', 'ruleKey', 'ordinal', 'spellKey'],
      ['spellName', 'keep'],
      `selections[${index}]`,
    );
    const ref = integer(row.ref, `selections[${index}].ref`, 0, 119);
    if (!knownIds.has(ref)) {
      throw new ShareValidationError(
        `selections[${index}].ref is unknown.`,
      );
    }
    if (row.keep !== undefined && row.keep !== true) {
      throw new ShareValidationError(
        `selections[${index}].keep must be true when present.`,
      );
    }
    return {
      ref,
      ruleKey: text(
        row.ruleKey,
        `selections[${index}].ruleKey`,
        240,
      ),
      ordinal: integer(
        row.ordinal,
        `selections[${index}].ordinal`,
        1,
        1_000,
      ),
      spellKey: spellKey(
        row.spellKey,
        `selections[${index}].spellKey`,
      ),
      ...(row.spellName === undefined
        ? {}
        : {
            spellName: text(
              row.spellName,
              `selections[${index}].spellName`,
              120,
            ),
          }),
      ...(row.keep === true ? { keep: true as const } : {}),
    };
  });
  assertUnique(
    selections.map(
      (item) =>
        `${item.ref}\u0000${item.ruleKey}\u0000${item.ordinal}`,
    ),
    'selections',
  );

  const spellbook = list(
    source.spellbook,
    'spellbook',
    SHARE_LIMITS.spellbook,
  ).map((item, index) => spellKey(item, `spellbook[${index}]`));
  assertUnique(spellbook, 'spellbook');
  const preferences = list(
    source.preferences,
    'preferences',
    SHARE_LIMITS.preferences,
  ).map((item, index): SharePreference => {
    const row = record(item, `preferences[${index}]`);
    exactKeys(
      row,
      ['spellKey', 'favourite'],
      [],
      `preferences[${index}]`,
    );
    if (typeof row.favourite !== 'boolean') {
      throw new ShareValidationError(
        `preferences[${index}].favourite must be boolean.`,
      );
    }
    return {
      spellKey: spellKey(
        row.spellKey,
        `preferences[${index}].spellKey`,
      ),
      favourite: row.favourite,
    };
  });
  assertUnique(
    preferences.map((item) => item.spellKey),
    'preferences',
  );
  const overrides = list(
    source.overrides,
    'overrides',
    SHARE_LIMITS.overrides,
  ).map((item, index): ShareOverride => {
    const row = record(item, `overrides[${index}]`);
    exactKeys(row, ['ruleKey', 'value'], [], `overrides[${index}]`);
    return {
      ruleKey: text(
        row.ruleKey,
        `overrides[${index}].ruleKey`,
        240,
      ),
      value: jsonValue(row.value, `overrides[${index}].value`),
    };
  });
  assertUnique(
    overrides.map((item) => item.ruleKey),
    'overrides',
  );

  let acknowledgements:
    | CharacterShareDocument['acknowledgements']
    | undefined;
  if (source.acknowledgements !== undefined) {
    acknowledgements = list(
      source.acknowledgements,
      'acknowledgements',
      SHARE_LIMITS.acknowledgements,
    ).map((item, index) => {
      const row = record(item, `acknowledgements[${index}]`);
      exactKeys(row, ['warning'], [], `acknowledgements[${index}]`);
      return {
        warning: text(
          row.warning,
          `acknowledgements[${index}].warning`,
          500,
        ),
      };
    });
    assertUnique(
      acknowledgements.map((item) => item.warning),
      'acknowledgements',
    );
  }

  let totalEntries = 0;
  let loadouts: CharacterShareDocument['loadouts'] | undefined;
  if (source.loadouts !== undefined) {
    loadouts = list(
      source.loadouts,
      'loadouts',
      SHARE_LIMITS.loadouts,
    ).map((item, index): ShareLoadout => {
      const row = record(item, `loadouts[${index}]`);
      exactKeys(row, ['name', 'entries'], [], `loadouts[${index}]`);
      const entries = list(
        row.entries,
        `loadouts[${index}].entries`,
        SHARE_LIMITS.loadoutEntries,
      ).map((entry, entryIndex) => {
        totalEntries += 1;
        if (totalEntries > SHARE_LIMITS.loadoutEntries) {
          throw new ShareValidationError(
            `loadout entries exceed the maximum count of ${SHARE_LIMITS.loadoutEntries}.`,
          );
        }
        const entryRow = record(
          entry,
          `loadouts[${index}].entries[${entryIndex}]`,
        );
        exactKeys(
          entryRow,
          ['spellKey', 'role'],
          [],
          `loadouts[${index}].entries[${entryIndex}]`,
        );
        return {
          spellKey: spellKey(
            entryRow.spellKey,
            `loadouts[${index}].entries[${entryIndex}].spellKey`,
          ),
          role: text(
            entryRow.role,
            `loadouts[${index}].entries[${entryIndex}].role`,
            100,
          ),
        };
      });
      assertUnique(
        entries.map(
          (entry) => `${entry.spellKey}\u0000${entry.role}`,
        ),
        `loadouts[${index}].entries`,
      );
      return {
        name: text(row.name, `loadouts[${index}].name`, 120),
        entries,
      };
    });
  }

  let placeholders: CharacterShareDocument['placeholders'] | undefined;
  if (source.placeholders !== undefined) {
    placeholders = list(
      source.placeholders,
      'placeholders',
      SHARE_LIMITS.placeholders,
    ).map((item, index): SharePlaceholder => {
      const row = record(item, `placeholders[${index}]`);
      exactKeys(
        row,
        ['spellKey', 'spellName'],
        [],
        `placeholders[${index}]`,
      );
      return {
        spellKey: spellKey(
          row.spellKey,
          `placeholders[${index}].spellKey`,
        ),
        spellName: text(
          row.spellName,
          `placeholders[${index}].spellName`,
          120,
        ),
      };
    });
    assertUnique(
      placeholders.map((item) => item.spellKey),
      'placeholders',
    );
  }

  let weapons: CharacterShareDocument['weapons'] | undefined;
  if (source.weapons !== undefined) {
    weapons = list(source.weapons, 'weapons', SHARE_LIMITS.weapons).map(
      (item, index) => shareWeapon(item, `weapons[${index}]`, knownIds),
    );
    // NOT `assertUnique`. Two identical weapons is a normal thing to own — a
    // pair of daggers, a quiver of javelins — and each is its own row with its
    // own mastery flag. Every other section here is keyed by something the
    // database makes unique; weapons are not.
  }

  const species =
    source.species === undefined
      ? undefined
      : shareSpecies(source.species, 'species');
  let speciesTraits: CharacterShareDocument['speciesTraits'] | undefined;
  if (source.speciesTraits !== undefined) {
    speciesTraits = list(
      source.speciesTraits,
      'speciesTraits',
      SHARE_LIMITS.speciesTraits,
    ).map((item, index) => shareSpeciesTrait(item, `speciesTraits[${index}]`));
    // NOT `assertUnique`. Six of the nine species print a trait called
    // `Darkvision`, and a user's own list may legitimately repeat a name; the
    // schema's uniqueness is per-species on the CATALOG side only.
  }
  const background =
    source.background === undefined
      ? undefined
      : shareBackground(source.background, 'background');

  let effects: CharacterShareDocument['effects'] | undefined;
  if (source.effects !== undefined) {
    effects = list(source.effects, 'effects', SHARE_LIMITS.effects).map(
      (item, index) =>
        shareEffect(item, `effects[${index}]`, knownIds, subclassRefs),
    );
    // NOT `assertUnique`, for the reason `speciesTraits` gives one line up and
    // one more besides: a character may legitimately carry two identical
    // effects — two feats each granting Fire resistance is a real build — and
    // the schema's index on `(character_id)` is deliberately not unique.
  }

  let armor: CharacterShareDocument['armor'] | undefined;
  if (source.armor !== undefined) {
    // The count cap is 2 and not a `SHARE_LIMITS` entry, because the cap here
    // IS the cardinality: `character_armor_character_id_slot_unique` permits one
    // row per slot and there are two slots.
    armor = list(source.armor, 'armor', armorSlots.length).map((item, index) =>
      shareArmor(item, `armor[${index}]`, knownIds),
    );
    // UNLIKE weapons, this one IS unique-checked: the database makes it so, and
    // two rows claiming the worn slot would abort the import transaction on the
    // second INSERT rather than here where the field can be named.
    assertUnique(armor.map((item) => item.slot), 'armor');
  }

  let hitPointRolls: CharacterShareDocument['hitPointRolls'] | undefined;
  if (source.hitPointRolls !== undefined) {
    hitPointRolls = list(
      source.hitPointRolls,
      'hitPointRolls',
      SHARE_LIMITS.hitPointRolls,
    ).map((item, index) => shareHitPointRoll(item, `hitPointRolls[${index}]`));
    // Unique on the pair the schema's unique index is on, for the same reason.
    assertUnique(
      hitPointRolls.map(
        (item) => `${item.className}:${String(item.classLevel)}`,
      ),
      'hitPointRolls',
    );
  }

  let skillProficiencies:
    | CharacterShareDocument['skillProficiencies']
    | undefined;
  if (source.skillProficiencies !== undefined) {
    skillProficiencies = list(
      source.skillProficiencies,
      'skillProficiencies',
      SHARE_LIMITS.skillProficiencies,
    ).map((item, index) => {
      const skill = text(item, `skillProficiencies[${index}]`, 40);
      if (!skills.includes(skill as (typeof skills)[number])) {
        throw new ShareValidationError(
          `skillProficiencies[${index}] is unsupported.`,
        );
      }
      return skill;
    });
    assertUnique(skillProficiencies, 'skillProficiencies');
  }

  const sheetAdjustment =
    source.sheetAdjustment === undefined
      ? undefined
      : shareSheetAdjustment(source.sheetAdjustment, 'sheetAdjustment');

  let skillGrants: CharacterShareDocument['skillGrants'] | undefined;
  if (source.skillGrants !== undefined) {
    skillGrants = list(
      source.skillGrants,
      'skillGrants',
      SHARE_LIMITS.skillGrants,
    ).map((item, index): ShareSkillGrant => {
      const row = record(item, `skillGrants[${index}]`);
      exactKeys(
        row,
        ['ref', 'grantKey', 'ordinal'],
        ['skill'],
        `skillGrants[${index}]`,
      );
      const ref = integer(row.ref, `skillGrants[${index}].ref`, 0, 119);
      if (!knownIds.has(ref)) {
        throw new ShareValidationError(
          `skillGrants[${index}].ref is unknown.`,
        );
      }
      const skill =
        row.skill === undefined
          ? undefined
          : text(row.skill, `skillGrants[${index}].skill`, 40);
      if (
        skill !== undefined &&
        !skills.includes(skill as (typeof skills)[number])
      ) {
        throw new ShareValidationError(
          `skillGrants[${index}].skill is unsupported.`,
        );
      }
      return {
        ref,
        grantKey: text(row.grantKey, `skillGrants[${index}].grantKey`, 240),
        ordinal: integer(
          row.ordinal,
          `skillGrants[${index}].ordinal`,
          1,
          1_000,
        ),
        ...(skill === undefined ? {} : { skill }),
      };
    });
    assertUnique(
      skillGrants.map(
        (item) => `${item.ref}\u0000${item.grantKey}\u0000${item.ordinal}`,
      ),
      'skillGrants',
    );
    // Filled skills must be distinct across the document's grants: the
    // schema's partial unique index makes a character hold each proficiency
    // once from live grants, and refusing the duplicate HERE names the field
    // instead of aborting the import transaction with a raw constraint error.
    assertUnique(
      skillGrants
        .filter((item) => item.skill !== undefined)
        .map((item) => String(item.skill)),
      'skillGrants',
    );
  }

  return {
    format: CHARACTER_SHARE_FORMAT,
    version: CHARACTER_SHARE_VERSION,
    character: character as unknown as ShareCharacter,
    classes,
    sources,
    selections,
    spellbook,
    preferences,
    overrides,
    ...(acknowledgements === undefined ? {} : { acknowledgements }),
    ...(loadouts === undefined ? {} : { loadouts }),
    ...(placeholders === undefined ? {} : { placeholders }),
    ...(weapons === undefined ? {} : { weapons }),
    ...(species === undefined ? {} : { species }),
    ...(speciesTraits === undefined ? {} : { speciesTraits }),
    ...(background === undefined ? {} : { background }),
    ...(armor === undefined ? {} : { armor }),
    ...(hitPointRolls === undefined ? {} : { hitPointRolls }),
    ...(skillProficiencies === undefined ? {} : { skillProficiencies }),
    ...(sheetAdjustment === undefined ? {} : { sheetAdjustment }),
    ...(effects === undefined ? {} : { effects }),
    ...(skillGrants === undefined ? {} : { skillGrants }),
  };
}
