/**
 * THE DERIVED SHEET. Nothing in this module is stored.
 *
 * D11 part 1: hit points, armor class, saving throw and skill modifiers,
 * initiative and passive Perception are COMPUTED from ability scores, class
 * levels and the sourced content in `db/schema/sheet.ts`. Storing any of them
 * would create a second source of truth that drifts from the first the moment a
 * Constitution score changes — the reasoning D6d applies to nullable columns,
 * one level up.
 *
 * WHAT IS GENUINELY STORED, AND WHY EACH IS NOT DERIVABLE:
 *
 *  - a per-level HIT POINT ROLL. A die roll is information this application
 *    cannot recompute. Absence of a roll means "use the printed fixed value",
 *    which is a legitimate steady state for a character who never rolled — D6b
 *    limb 1 — so it is modelled as an ABSENT ENTRY rather than a nullable
 *    column, and there is no `| null` to propagate.
 *  - which ARMOUR is worn and whether a SHIELD is held. Given, not derived.
 *  - the MANUAL AC ADJUSTMENT. Given, and D12 keeps it deliberately.
 *
 * Those three are INPUTS to the functions below. This module is pure: it reads
 * no database and holds no state, so every number here can be checked against a
 * hand computation in a test. Persisting them is a separate change with its own
 * backup, share and snapshot surface; see the note at the end of this file.
 *
 * EVERY FORMULA HERE IS SOURCED. The provenance is cited per function against a
 * file in `docs/srd/source/`, because six of these numbers had no source in this
 * repository at all until `skills-table.txt`, `sheet-math.txt` and
 * `multiclassing.txt` were extracted for them.
 */
import type {
  Ability,
  Skill,
  WeaponProficiencyCategory,
} from '../domain/enums';
import type { AbilityScores } from './ability-scores';
import { AttackBonus } from './attack-bonus';
import { proficiencyBonus } from './proficiency';
import { characterLevel } from './character-level';
import { abilityForSkill } from './skills';
import type {
  ArmorCategory,
  ArmorDexBonus,
  ArmorSlot,
  HitDieSize,
  MartialArtsDieSize,
} from '../domain/enums';
import { isHitDieSize } from '../domain/enums';
import type { AttacksPerAction, ExtraAttackGrant } from './extra-attack';
import { resolveAttacksPerAction } from './extra-attack';
import {
  classFormulaResourceLabel,
  classResourceLabel,
  resourceFormulaAbilities,
  type ClassFormulaResourceKind,
  type ClassResourceFormula,
  type ClassResourceKind,
  type PositiveInteger,
  type PositiveResourceMaximum,
  type ResourceFormulaAbility,
} from '../domain/class-resources';
import type {
  ClassDefinitionId,
  ClassLevel,
  ContentKey,
  SpellLevel,
} from '../domain/ids';
import { classResourceFormulaExpression } from '../domain/class-resource-value-expression';
import { evaluateValue } from '../domain/value-expression';
import { CasterContribution } from './caster-contribution';
import { isProgressionType } from './progression-type';
import { casterLevel, pactMagic, slots } from './spell-slots';

/**
 * A class NAME, a LEVEL in it, and the per-level content keyed on that level.
 *
 * Split out of `SheetClass` so the functions that need nothing else —
 * `characterLevel`, `attacksPerAction`, `martialArtsDice` — can be handed
 * the classes a caller actually has. The attack-profile derivation reads class
 * levels and their level-keyed content and has no business knowing a hit die or
 * a saving throw list; requiring them would have made that caller invent both.
 *
 * `extra_attack_grants` IS A LIST AND NOT A `level -> count` MAP, AND D19 IS
 * WHY. A map could only express a class-table row: a grant now also carries the
 * SOURCE that gave it, and the WEAPON SCOPE it reaches, and neither fits in a
 * key or a value. The list still hangs off ONE class, because a grant's
 * prerequisite level is always a level in one class. `martial_arts_dice` stays
 * a map, because a Martial Arts die genuinely is level -> die SIZE, exactly as
 * `class_martial_arts_dice` stores it.
 *
 * BOTH ARE KEYED ON THE LEVEL IN *THIS* CLASS, never on total character level,
 * because that is what the tables store and what the features say. See
 * `martialArtsDice` for why the distinction is load-bearing.
 */
export interface SheetClassLevels {
  readonly class_name: string;
  readonly level: number;
  readonly extra_attack_grants?: readonly ExtraAttackGrant[];
  readonly martial_arts_dice?: ReadonlyMap<number, MartialArtsDieSize>;
}

/**
 * One class a character has levels in, joined to that class's sheet content.
 */
export interface SheetClass extends SheetClassLevels {
  /**
   * The class's hit die, or `null` when this application does not hold one.
   *
   * NULL HERE IS NOT A DEFAULT IN DISGUISE (D6b). `class_sheet_traits` is seeded
   * for every printed class, but a homebrew or imported class can arrive without
   * that row, and the die is then genuinely UNKNOWN. `hitPointMaximum`
   * substitutes `ASSUMED_HIT_DIE` and emits an `assumed_hit_die` warning naming
   * the class; it does not quietly produce a number indistinguishable from a
   * sourced one. Keeping the absence in the TYPE is what forces every reader —
   * including the D4 machine-readable projection — to decide what to say for it,
   * rather than one construction site choosing 8 on everyone's behalf.
   */
  readonly hit_die: HitDieSize | null;
  readonly is_starting_class: boolean;
  readonly saving_throws: readonly Ability[];
  /**
   * What this class grants, UNRESOLVED — the rows plus the flag that says which
   * of them a multiclass entry gets (D28 §3).
   *
   * NOT a single resolved set. "What does this class grant a character who
   * started in it" and "what does it grant a character who dipped into it" have
   * different answers for nine of twelve classes, and the class row cannot know
   * which applies — that depends on the CHARACTER's `is_starting_class`.
   * Carrying the rows and resolving once, in `classProficiencyGrants`, is what
   * keeps the choice from being made independently at each consumer.
   *
   * IT IS ONE ROW LIST AND NOT TWO SETS, which is a correction: it WAS two, and
   * the two could disagree. See `ClassProficiencySources`.
   */
  readonly proficiencies: ClassProficiencySources;
}

/**
 * One weapon-proficiency grant, with the qualifier the SRD prints for two of
 * the twelve classes.
 *
 * The qualifier is carried VERBATIM from `class_weapon_proficiencies
 * .property_qualifier` and is interpreted by exactly one function —
 * `weaponProficiency` in `src/rules/multiclass-proficiency.ts` — which reads it
 * as the SET UNION D28 §2 says it is. Nothing else may parse it.
 */
export interface ClassWeaponProficiency {
  readonly category: WeaponProficiencyCategory;
  readonly property_qualifier: string | null;
}

/** What one class grants, in one of its two roles. */
export interface ClassProficiencies {
  readonly armor_training: readonly ArmorCategory[];
  readonly weapon_proficiencies: readonly ClassWeaponProficiency[];
}

/** Which of the two roles a class is filling for a character. */
export type ProficiencyVia = 'initial' | 'multiclass_entry';

/**
 * One row of a class's grant tables, carrying the flag that decides whether a
 * character who MULTICLASSED into the class gets it too.
 *
 * The shape `class_armor_training` and `class_weapon_proficiencies` are actually
 * stored in: one row per (class, category), plus `granted_on_multiclass_entry`.
 */
export interface ClassGrantRow<TGrant> {
  readonly grant: TGrant;
  readonly on_entry: boolean;
}

/**
 * BOTH of a class's grants, unresolved — ONE ROW LIST WITH A FLAG, which is what
 * makes the subset invariant STRUCTURAL rather than promised.
 *
 * IT WAS TWO INDEPENDENT `ClassProficiencies`, AND A REVIEW WAS RIGHT ABOUT WHAT
 * THAT COST. The invariant held only because
 * `CharacterSheetBuilder#classProficiencies` happened to filter both lists out
 * of the same rows; a second constructor — a test helper, a homebrew-class
 * importer — could build an `on_entry` naming a category `initial` does not, and
 * it would compile. That is precisely the D25 question. The answer the branch
 * already gave for the DATABASE — the entry set is read off the SAME rows, so a
 * category the class does not train in has no row to flag and can appear in
 * neither list — is now the answer the TYPE gives: there is one list, and
 * `on_entry` selects a sub-list of it.
 *
 * THE PRICE, STATED RATHER THAN DISCOVERED: one row carries one
 * `property_qualifier`, so an entry grant cannot be qualified differently from
 * the initial grant of the same category. Unreachable in SRD 5.2.1 — the two
 * qualified rows (Monk `Light`, Rogue `Finesse or Light`) are not entry grants,
 * and the four flagged Martial rows carry no qualifier — but a real limit on an
 * imported class. `db/schema/sheet.ts` says the same beside the column.
 */
export interface ClassProficiencySources {
  readonly armor_training: readonly ClassGrantRow<ArmorCategory>[];
  readonly weapon_proficiencies: readonly ClassGrantRow<ClassWeaponProficiency>[];
}

function grantsFor<TGrant>(
  rows: readonly ClassGrantRow<TGrant>[],
  via: ProficiencyVia,
): readonly TGrant[] {
  switch (via) {
    case 'initial':
      return rows.map((row) => row.grant);
    case 'multiclass_entry':
      return rows.filter((row) => row.on_entry).map((row) => row.grant);
  }
}

/**
 * The rows one role actually gets — THE ONLY WAY TO READ a
 * `ClassProficiencySources`.
 *
 * `initial` takes every row; `multiclass_entry` takes the flagged ones.
 * Exhaustive, no `default` arm, and written once so the two roles cannot be
 * resolved differently in two places.
 */
export function classProficienciesFor(
  rows: ClassProficiencySources,
  via: ProficiencyVia,
): ClassProficiencies {
  return {
    armor_training: grantsFor(rows.armor_training, via),
    weapon_proficiencies: grantsFor(rows.weapon_proficiencies, via),
  };
}

/**
 * WHAT ONE CLASS ACTUALLY GAVE *THIS* CHARACTER — the resolved grant.
 *
 * A DIFFERENT TYPE FROM `ClassProficiencySources`, DELIBERATELY, and this is the
 * D25 point of the whole partition. It has no `initial` and no `on_entry`, so a
 * consumer holding one PHYSICALLY CANNOT read the full Core Traits row off a
 * class the character merely dipped into. The resolution happens once, in
 * `classProficiencyGrants`, and a second resolver would not typecheck against
 * anything that consumes this.
 *
 * `via` is carried so a warning can say WHY a class contributed what it did,
 * rather than a consumer re-deriving it from `is_starting_class` and getting a
 * different answer when `startingClass` has degraded.
 */
export interface ClassProficiencyGrant extends ClassProficiencies {
  readonly class_name: string;
  readonly via: ProficiencyVia;
}

/**
 * The die assumed for a class whose hit die this application does not hold.
 *
 * 8 is the MODE of the twelve printed classes, not the median of the four sizes
 * — `class-core-traits.txt` uses d6, d8, d10 and d12, whose median is 9, and
 * Bard, Cleric, Druid, Monk, Rogue and Warlock all print d8. Six of twelve is
 * the best available guess and the arithmetic is checkable.
 *
 * It remains a GUESS. Every number derived from it carries an `assumed_hit_die`
 * warning naming the class, because a hit point maximum computed from an
 * invented die is not a fact about the character.
 */
export const ASSUMED_HIT_DIE: HitDieSize = 8;

/**
 * A STORED INTEGER THAT IS NOT A HIT DIE IS READ AS NO HIT DIE.
 *
 * The one place `HitDieSize` has to be re-established at runtime, and it lives
 * here rather than in the query builder that calls it because the DEGRADATION
 * is a sheet rule, not a decoding detail — it is the same rule `ASSUMED_HIT_DIE`
 * above and the `assumed_hit_die` warning already implement, extended from "no
 * row" to "a row we cannot read".
 *
 * WHY THE COLUMN'S CHECK IS NOT ENOUGH ON ITS OWN — F11's finding, applied.
 * `class_sheet_traits_check` refuses anything but 6, 8, 10 and 12, but a CHECK
 * constrains no image created before it existed (see the header of
 * `db/schema/columns.ts`) and no hand-edited `.sqlite3`. A reader that trusts a
 * CHECK is not a contract.
 *
 * WHY NULL RATHER THAN A THROW OR A PASSTHROUGH:
 *
 *  - THROWING would lose the whole character over one catalog cell. D11 part 2:
 *    the builder blocks, the reader tolerates and states.
 *  - PASSING IT THROUGH is what F12 measured. A stored 7 reaches
 *    `fixedHitPointsPerLevel` and yields 4.5 hit points per level — a real,
 *    plausible, wrong number, which is the failure this change exists to make
 *    unrepresentable.
 *
 * THE PRICE, STATED RATHER THAN GLOSSED: the sheet cannot then tell "this class
 * has no `class_sheet_traits` row" from "its row holds a value the CHECK
 * forbids". Both read as absent and the warning says the die is not recorded —
 * true in both cases, but one bit of information is dropped. Separating them
 * needs a warning code that carries the rejected value, through a codec with no
 * channel for one.
 */
export function hitDieOrAbsent(stored: number | null): HitDieSize | null {
  return stored !== null && isHitDieSize(stored) ? stored : null;
}

/**
 * A character's armour or shield, as VALUES — never a template reference (D1b).
 *
 * `category` IS REQUIRED, and it is the field that gives `armor_class` its
 * meaning: for `light`, `medium` and `heavy` that column is a BASE Armor Class,
 * for `shield` it is an ADDITIVE BONUS. The schema comment on
 * `armor_templates.armor_class` justifies overloading one column on the promise
 * that consumers dispatch on `category`; omitting it here would make that
 * promise unkeepable, because a Shield and a suit of Plate would be structurally
 * identical types and could be swapped without a compile error.
 */
export interface SheetArmor {
  readonly name: string;
  readonly category: ArmorCategory;
  readonly armor_class: number;
  readonly dex_bonus: ArmorDexBonus;
  readonly dex_bonus_max: number | null;
  readonly strength_requirement: number | null;
  readonly stealth_disadvantage: boolean;
}

/**
 * A warning the sheet states rather than hides.
 *
 * D11 part 2: the builder BLOCKS an illegal choice, but anything already
 * persisted — an import, a share link, a character whose starting class was
 * deleted — is ACCEPTED and flagged. These functions therefore never throw on
 * incoherent input; they degrade to a stated approximation.
 */
export interface SheetWarning {
  readonly code:
    | 'no_starting_class'
    | 'several_starting_classes'
    | 'strength_requirement_unmet'
    | 'armor_slot_mismatch'
    /** A class whose hit die is not held; `ASSUMED_HIT_DIE` was used. */
    | 'assumed_hit_die'
    /** A recorded roll larger than the class's own die, counted in full. */
    | 'roll_exceeds_hit_die'
    /** A stored armour column holding a value its own vocabulary excludes. */
    | 'armor_value_out_of_vocabulary'
    /**
     * The levels across this character's classes add up to more than 20.
     *
     * F11'S SECOND HALF, AND IT IS A WARNING RATHER THAN A REFUSAL ON PURPOSE.
     * The per-row bound (1..20 per class) belongs in the row contract, where a
     * hand-edited backup meets it — no version of this application emits a
     * class level outside that range, so rejecting one costs nobody anything.
     * The COMBINED total is different: a document whose classes sum to 25 is
     * still a whole character, and refusing it at the boundary would lose that
     * character in order to state a number. D11 part 2 exactly: the guided
     * builder BLOCKS the choice (`add-source.ts` and `update-class.ts` both
     * throw "A character cannot exceed level 20"), the boundary TOLERATES it,
     * and the sheet SAYS so beside the numbers it changed.
     */
    | 'total_level_exceeds_maximum'
    /*
     * THE FOUR D28 CODES. All four WARN and none refuses: anyone may carry any
     * weapon and record any armour, and what is withheld is the proficiency
     * BONUS, never the row. The set is CLOSED and has no `default` reader, so a
     * fifth is a deliberate edit here rather than a string appearing in a
     * message somewhere.
     *
     * THE SUBJECT IS IN THE PROSE AND NOT IN A FIELD, matching all seven codes
     * above. That is a real limitation — a consumer cannot group these by weapon
     * without parsing English — and it is left as it is because widening
     * `SheetWarning` for one family would make the other seven carry a field
     * they have no subject for.
     */
    /** A weapon whose category no class of this character's grants. */
    | 'weapon_not_proficient'
    /** A weapon with no `simple | martial` recorded, so nothing can be checked. */
    | 'weapon_category_not_stated'
    /** A grant qualified by words this application does not evaluate. */
    | 'weapon_proficiency_qualifier_unread'
    /** Armour recorded that no class of this character's trains them in. */
    | 'armor_not_trained'
    /** D96: a held class's sourced multiclass ability minimum is unmet. */
    | 'multiclass_primary_ability_unmet'
    /** D33: a held class's stored multiclass expression cannot be judged. */
    | 'multiclass_primary_ability_unprovable';
  readonly message: string;
}

export type StartingClassWarning = SheetWarning & {
  readonly code: 'no_starting_class' | 'several_starting_classes';
};

export interface HitPointResult {
  readonly maximum: number;
  readonly warnings: readonly SheetWarning[];
}

export interface ArmorClassResult {
  readonly value: number;
  readonly warnings: readonly SheetWarning[];
  /** The eligible base formula selected before shields and flat bonuses. */
  readonly winner: ResolvedArmorClassFormula;
  /** Broken-condition formulas, never scored and never tie-broken. */
  readonly excluded: readonly ExcludedArmorClassFormula[];
  /** Present only when source precedence or label order selected among equals. */
  readonly tie_break: ArmorClassTieBreak | null;
  /** The one non-stacking penalty the Strength warning says is in force. */
  readonly speed_penalty_feet: 0 | 10;
}

/**
 * Every category the clone-stable AC tie-break can receive, in precedence
 * order. Database ids and acquisition order are deliberately absent (D62).
 */
export const ARMOR_CLASS_SOURCE_PRECEDENCE = [
  'worn_armor',
  'species',
  'subclass',
  'class',
  'feat',
  'background',
  'item',
  'weapon',
  'manual',
] as const;
export type ArmorClassSourceCategory =
  (typeof ARMOR_CLASS_SOURCE_PRECEDENCE)[number];

/** One persisted `armor_class_formula` after its source category is derived. */
export interface ArmorClassFormulaCandidate {
  readonly kind: 'ability_formula';
  readonly label: string;
  readonly source: Exclude<ArmorClassSourceCategory, 'worn_armor'>;
  readonly base: number;
  readonly ability_1: Ability;
  readonly ability_2: Ability | null;
  readonly allows_shield: boolean;
}

/** One flat addend. It never competes with a base formula. */
export interface ArmorClassBonusCandidate {
  readonly label: string;
  readonly amount: number;
}

/** One stored armour row together with the slot in which it was recorded. */
export interface EquippedArmor {
  readonly slot: ArmorSlot;
  readonly armor: SheetArmor;
}

export interface WornArmorClassFormula {
  readonly kind: 'worn_armor';
  readonly label: string;
  readonly source: 'worn_armor';
  readonly armor: SheetArmor;
}

export type ArmorClassFormula =
  | ArmorClassFormulaCandidate
  | WornArmorClassFormula;

export interface ResolvedArmorClassFormula {
  readonly formula: ArmorClassFormula;
  readonly total: number;
}

export type ArmorClassExclusionReason =
  | {
      readonly kind: 'wearing_armor';
      readonly armor_name: string;
    }
  | {
      readonly kind: 'shield_not_allowed';
      readonly shield_name: string;
    };

export interface ExcludedArmorClassFormula {
  readonly formula: ArmorClassFormulaCandidate;
  readonly reason: ArmorClassExclusionReason;
}

export const ARMOR_CLASS_TIE_BREAK_RULE =
  'source_precedence_then_label' as const;

export interface ArmorClassTieBreak {
  readonly winner: ResolvedArmorClassFormula;
  readonly losers: readonly ResolvedArmorClassFormula[];
  readonly rule: typeof ARMOR_CLASS_TIE_BREAK_RULE;
}

/**
 * The highest total character level the rules describe.
 *
 * `docs/srd/source/multiclassing.txt`: "you can't take a level in a class if
 * that would cause your total character level to exceed 20." It is also the
 * ceiling of every `class_level BETWEEN 1 AND 20` CHECK in the schema and of the
 * `classLevel` row contract — but this constant states the CHARACTER rule, which
 * is a different fact from the per-class one and is what `characterLevel`
 * is measured against.
 *
 * FOUR OTHER SITES STILL WRITE THE LITERAL — `add-source.ts:220`/`:244`,
 * `update-class.ts:111`/`:122`, `src/sharing/schema.ts:1482` and
 * `classLevel` in `src/domain/contracts/rows.ts`. They are not imported from
 * here: the contracts layer sits below `src/rules/` and importing upward would
 * invert it, and the two command modules belong to another track. Collapsing
 * them is a real follow-up and is recorded rather than half-done.
 */
export const MAXIMUM_CHARACTER_LEVEL = 20;

/**
 * WHAT THE SHEET SAYS ABOUT A CHARACTER WHOSE CLASS LEVELS DO NOT ADD UP.
 *
 * The one rule about total level that the row contracts deliberately do NOT
 * enforce. `character_class_levels.level` is bounded 1..20 per row at the backup
 * boundary (F11, `classLevel` in `src/domain/contracts/rows.ts`), but the SUM
 * across a character's classes is not, because refusing a document over it would
 * lose a whole character to state a number. So it is stated here instead — D11
 * part 2, the same shape as `no_starting_class` and `assumed_hit_die`.
 *
 * IT TAKES `SheetClassLevels` AND NOT `SheetClass`, matching
 * `StartingClassCandidate` and `ProficiencyClassCandidate`: the question needs a
 * level and nothing else, and a caller that had to invent a hit die and a
 * saving-throw list to ask it would eventually write a second copy instead.
 *
 * THE NUMBERS ARE NOT CLAMPED, and that is the decision. Capping the total at 20
 * would silently rewrite what the character records — the same reasoning
 * `hitPointMaximum` gives for counting an over-large roll in full. Every derived
 * number is computed from the total AS RECORDED and the warning says which
 * numbers those are, so a reader can see both what the sheet did and why it is
 * not a legal character.
 */
export function totalLevelWarnings(
  classes: readonly SheetClassLevels[],
): readonly SheetWarning[] {
  const total = characterLevel(classes.map((entry) => entry.level));
  if (total === null) {
    // No classes cannot exceed the maximum; the absent total is displayed as
    // undetermined by the sheet instead of being converted to a number here.
    return [];
  }
  if (total <= MAXIMUM_CHARACTER_LEVEL) {
    return [];
  }
  return [
    {
      code: 'total_level_exceeds_maximum',
      message:
        `This character has ${String(total)} levels across ` +
        `${String(classes.length)} ${classes.length === 1 ? 'class' : 'classes'}, ` +
        `and a character cannot exceed level ${String(MAXIMUM_CHARACTER_LEVEL)}. ` +
        'The proficiency bonus, the hit point maximum and the multiclass spell ' +
        `slots below were all computed from ${String(total)} as recorded, not ` +
        `from ${String(MAXIMUM_CHARACTER_LEVEL)}. Lower a class level to make ` +
        'the sheet legal.',
    },
  ];
}

/**
 * The character's proficiency bonus.
 *
 * FROM TOTAL LEVEL, NOT PER CLASS. `docs/srd/source/multiclassing.txt`: "Your
 * Proficiency Bonus is based on your total character level, not your level in a
 * particular class… if you are a level 3 Fighter / level 2 Rogue, you have the
 * Proficiency Bonus of a level 5 character, which is +3."
 *
 * The override is resolved the way the two existing call sites resolve it, and
 * for the same reason as `characterLevel`: one number on the screen.
 */
export function sheetProficiencyBonus(
  classes: readonly SheetClass[],
  override: number | null = null,
): number | null {
  const level = characterLevel(classes.map((entry) => entry.level));
  if (level === null) {
    // D42 requires both level and proficiency to remain undetermined for a
    // class-less character, even when a stale override is present.
    return null;
  }
  return override ?? proficiencyBonus(level);
}

/**
 * The LEAST a row must carry to be resolved against.
 *
 * WIDENED IN PLACE RATHER THAN COPIED, which is the brief's own instruction and
 * the reason `startingClass` is generic. Three consumers now need the answer —
 * hit points, saving throws and the proficiency union in `src/rules/` — and a
 * FOURTH lives in the query layer, where `character-completeness.ts` must know
 * which class's full skill count applies. That fourth caller holds neither a hit
 * die nor a proficiency set and should not have to invent them to ask the
 * question; giving it a second resolver instead is exactly what produces two
 * disagreeing answers to "which class did this character start as".
 *
 * The generic PRESERVES the caller's own row type, so `hitPointMaximum` still
 * gets a `SheetClass` back and can compare it by identity.
 */
export interface StartingClassCandidate {
  readonly class_name: string;
  readonly is_starting_class: boolean;
}

/**
 * The class that gets the level-1 Hit Point maximum, plus any warning.
 *
 * `docs/srd/source/multiclassing.txt`: "You gain the level 1 Hit Points for a
 * class only when your total character level is 1." So exactly one class — the
 * one the character started as — contributes the maximum, and every other level
 * of every class contributes the per-level value.
 *
 * THREE DEFECTS IN `is_starting_class` MAKE THIS NON-TRIVIAL, and all three are
 * reachable today rather than hypothetical:
 *
 *  1. the column has no uniqueness or existence constraint;
 *  2. `update-class.ts` deletes a class row without promoting a replacement, so
 *     deleting the starting class of a multiclass character leaves NO starting
 *     class at all;
 *  3. share import writes the flag per row with no cross-row check, so an
 *     imported character may have several.
 *
 * Per D11 part 2 the import behaviour is CORRECT — the boundary tolerates — so
 * it is this function's job to degrade rather than throw. It picks
 * deterministically and says what it did.
 */
export function startingClass<T extends StartingClassCandidate>(
  classes: readonly T[],
): {
  readonly chosen: T | null;
  readonly warnings: readonly StartingClassWarning[];
} {
  const flagged = classes.filter((entry) => entry.is_starting_class);
  if (flagged.length === 1) {
    return { chosen: flagged[0] as T, warnings: [] };
  }
  if (classes.length === 0) {
    return { chosen: null, warnings: [] };
  }
  if (flagged.length === 0) {
    return {
      chosen: classes[0] as T,
      warnings: [
        {
          code: 'no_starting_class',
          message:
            'No class is marked as this character\'s starting class, so the ' +
            `level 1 Hit Point maximum has been applied to ${String(classes[0]?.class_name)}. ` +
            'Set a starting class to make this exact.',
        },
      ],
    };
  }
  return {
    chosen: flagged[0] as T,
    warnings: [
      {
        code: 'several_starting_classes',
        message:
          `${String(flagged.length)} classes are marked as the starting class, which is not a ` +
          `state the builder can produce. ${String(flagged[0]?.class_name)} has been used for ` +
          'the level 1 Hit Point maximum.',
      },
    ],
  };
}

/**
 * THE LEAST A ROW MUST CARRY to be resolved into a grant.
 *
 * Narrower than `SheetClass`, for the same reason `startingClass` is generic:
 * the weapons panel resolves this question too, and it holds no hit die and no
 * saving-throw list. Requiring a whole `SheetClass` there would have made that
 * caller invent both — or, worse, write a second resolver.
 */
export interface ProficiencyClassCandidate extends StartingClassCandidate {
  readonly proficiencies: ClassProficiencySources;
}

/**
 * WHAT EACH OF A CHARACTER'S CLASSES ACTUALLY GRANTED THEM — D28 §3.
 *
 * The class the character STARTED in contributes its FULL Core Traits row; every
 * later class contributes only its multiclass ENTRY subset. That asymmetry is
 * the whole rule, and it is the reason the sheet's saving throws and its weapon
 * proficiencies must not be copied from one another: saving throws come from the
 * starting class ALONE, while proficiencies are a UNION in which the starting
 * class merely contributes more.
 *
 * IT REUSES `startingClass` AND DOES NOT RE-RESOLVE. Two independent answers to
 * "which class did this character start as" that disagree is worse than either,
 * and this application already has that resolver — including the three reachable
 * defects its own comment enumerates. Widened in place rather than duplicated.
 *
 * WHEN THAT RESOLVER DEGRADES, THE UNION IS STILL A UNION. `startingClass` never
 * returns nothing when there are classes: it picks, and says it picked. So a
 * character with no starting class flagged still gets a full grant from exactly
 * one class and an entry grant from the rest — the same SHAPE as a coherent
 * character, with a warning recording that WHICH class got the full row was
 * arbitrary. Refusing to compute a union here would cost such a character every
 * proficiency they have in order to punish a flag they cannot see.
 *
 * THE RETURN TYPE IS `ClassProficiencyGrant`, WHICH HAS NO ROWS AND NO FLAG, so
 * no caller can look past this decision and read the wrong half.
 */
export function classProficiencyGrants(
  classes: readonly ProficiencyClassCandidate[],
): {
  readonly grants: readonly ClassProficiencyGrant[];
  readonly warnings: readonly SheetWarning[];
} {
  const { chosen, warnings } = startingClass(classes);
  const grants = classes.map((entry): ClassProficiencyGrant => {
    // IDENTITY, not `is_starting_class`, exactly as `hitPointMaximum` compares
    // it. When several rows are flagged, `startingClass` picks ONE; comparing
    // the flag instead would hand the full Core Traits row to every flagged
    // class and over-grant precisely the character the warning is about.
    const via: ProficiencyVia =
      chosen === entry ? 'initial' : 'multiclass_entry';
    return {
      class_name: entry.class_name,
      via,
      ...classProficienciesFor(entry.proficiencies, via),
    };
  });
  return { grants, warnings };
}

/**
 * The per-level Hit Point value taken when a die is NOT rolled.
 *
 * `docs/srd/source/sheet-math.txt` prints these per class in the Fixed Hit
 * Points by Class table: Barbarian 7, Fighter/Paladin/Ranger 6,
 * Bard/Cleric/Druid/Monk/Rogue/Warlock 5, Sorcerer/Wizard 4 — which is exactly
 * `die / 2 + 1` for d12, d10, d8 and d6 respectively.
 *
 * The FORMULA is used rather than a per-class table because the hit die is
 * already sourced per class from the Core Traits tables and a second per-class
 * table would be a second thing to keep in step. The equivalence is not
 * assumed: `tests/unit/rules/sheet.test.ts` asserts this function against all
 * four printed values, transcribed by hand from that table.
 *
 * THE PARAMETER IS THE GUARD NOW, AND THE GUARD IT REPLACED WAS WRONG FOR THE
 * SUBJECT. This took a `number` and threw below 2, which admits every integer
 * above it: F12 measured `d7 -> 4.5`, `d13 -> 7.5`, `d1001 -> 501.5` hit points
 * per level. The paragraph above already writes the closed set out in PROSE —
 * "for d12, d10, d8 and d6 respectively" — while the signature said `number`.
 * The prose knew what the type did not, which is the gap D25 exists to close.
 * With `HitDieSize` the wrong call does not run; it does not compile.
 *
 * SO NO RUNTIME CHECK IS KEPT HERE, AND THAT IS A DECISION RATHER THAN AN
 * OMISSION. A guard here could only fire for a value TypeScript never let
 * through — "code justified by what it protects", the shape AGENTS.md says to
 * remove. What the old guard reached for is nonetheless real: an integer
 * arriving off the disk IS untrusted, and F11 is exactly the finding that a
 * contract trusting a CHECK is no contract. So the runtime test MOVED to the
 * boundary where such an integer actually arrives — `sheetClassRow` in
 * `src/queries/character-sheet-builder.ts` re-establishes `HitDieSize` with
 * `isHitDieSize` at the read, where a value the CHECK would have refused
 * becomes a stated ABSENCE instead of a fractional hit point maximum.
 */
export function fixedHitPointsPerLevel(hitDie: HitDieSize): number {
  return hitDie / 2 + 1;
}

/**
 * A hit point roll the player entered, keyed by the level it was rolled for.
 *
 * Keyed by CLASS NAME and CLASS LEVEL because hit dice are per class: a level 5
 * Fighter / level 3 Wizard rolls d10s for Fighter levels and d6s for Wizard
 * levels, and `docs/srd/source/multiclassing.txt` says to track dice of
 * different types separately.
 */
export type HitPointRolls = ReadonlyMap<string, ReadonlyMap<number, number>>;

/**
 * Hit point maximum.
 *
 * Level 1 of the starting class is the MAXIMUM of that class's die plus the
 * Constitution modifier — `docs/srd/source/sheet-math.txt`, Level 1 Hit Points
 * by Class: Barbarian "12 + Con. modifier", Fighter/Paladin/Ranger 10, the six
 * d8 classes 8, Sorcerer/Wizard 6. Every other level adds the rolled value, or
 * the fixed value when nothing was rolled, plus the Constitution modifier.
 *
 * THE MINIMUM OF 1 APPLIES ONLY TO LEVELS AFTER THE FIRST, because that is
 * where the source states it: "Roll that die, add your Constitution modifier to
 * the roll, and add the total (minimum of 1) to your Hit Point maximum." The
 * Level 1 table prints no such floor, so none is invented here.
 *
 * CONSTITUTION IS READ LIVE. A character whose Constitution changes sees every
 * level's contribution move with it, which is the whole reason this is computed
 * rather than stored.
 *
 * TWO DEGRADATIONS ARE STATED HERE RATHER THAN HIDDEN, both D11 part 2:
 *
 *  - a class with NO HIT DIE (`hit_die === null`) contributes `ASSUMED_HIT_DIE`,
 *    and says so. Returning a maximum with no warning would put an invented
 *    number into the sheet AND into the D4 machine-readable block, which is the
 *    one place meant to be trusted without reading the prose.
 *  - a ROLL LARGER THAN THE CLASS'S OWN DIE is counted IN FULL and flagged.
 *    Counting it is deliberate: `character_hit_point_rolls` is keyed on a class
 *    NAME, so `SHEET_ROLL_BOUNDS.maximum` can only bound at 12 (the largest die
 *    printed) and this is the first place the die is actually known. Clamping it
 *    would silently rewrite a number the player typed; refusing it would make an
 *    imported character unopenable. It is flagged only where the die is KNOWN —
 *    an assumed d8 cannot convict a roll of 11 of anything.
 */
export function hitPointMaximum(input: {
  readonly classes: readonly SheetClass[];
  readonly scores: AbilityScores;
  readonly rolls?: HitPointRolls;
}): HitPointResult {
  const conModifier = input.scores.score('constitution').modifier();
  const starting = startingClass(input.classes);
  const chosen = starting.chosen;
  // THE TOTAL-LEVEL WARNING IS RAISED HERE, AND THE PLACE IS A DECISION.
  //
  // `CharacterSheetBuilder` concatenates five warning arms and this is the only
  // one that sees the class LEVELS, so it is the arm through which a total-level
  // warning can reach the sheet at all. It is also the honest one: this loop is
  // what actually spends the excess, adding a per-level contribution for every
  // level past 20, so the warning sits "beside the number it changed" — the rule
  // the builder's own comment states for this list.
  const warnings: SheetWarning[] = [
    ...totalLevelWarnings(input.classes),
    ...starting.warnings,
  ];

  let maximum = 0;
  for (const entry of input.classes) {
    const rolled = input.rolls?.get(entry.class_name);
    const die = entry.hit_die ?? ASSUMED_HIT_DIE;
    if (entry.hit_die === null) {
      warnings.push({
        code: 'assumed_hit_die',
        message:
          `No hit die is recorded for ${entry.class_name}, so d${String(ASSUMED_HIT_DIE)} ` +
          'was assumed for its levels. The hit point maximum below is an ' +
          'estimate, not this class’s printed value.',
      });
    }
    for (let level = 1; level <= entry.level; level += 1) {
      const isFirstLevelOfCharacter = chosen === entry && level === 1;
      if (isFirstLevelOfCharacter) {
        maximum += die + conModifier;
        continue;
      }
      const roll = rolled?.get(level);
      if (roll !== undefined && entry.hit_die !== null && roll > entry.hit_die) {
        warnings.push({
          code: 'roll_exceeds_hit_die',
          message:
            `A roll of ${String(roll)} is recorded for ${entry.class_name} level ` +
            `${String(level)}, which a d${String(entry.hit_die)} cannot show. It has been ` +
            'counted in full — correct it on the sheet if it was a typo.',
        });
      }
      const base = roll ?? fixedHitPointsPerLevel(die);
      maximum += Math.max(1, base + conModifier);
    }
  }
  return { maximum, warnings };
}

/**
 * Armor Class: eligibility first, value second (D72–D75).
 *
 * The floor is a real candidate — 10 + Dexterity, shield-compatible — and is
 * present on every call. Worn armour, the floor, and every supplied
 * `armor_class_formula` compete for ONE base. Shields and flat bonuses are
 * addends after that competition, but a shield first excludes every formula
 * that forbids it.
 *
 * BROKEN CONDITIONS EXCLUDE OUTRIGHT. Wearing body armour excludes every
 * unarmoured ability formula, including the floor; carrying a shield excludes
 * a formula whose `allows_shield` is false. Excluded formulas are returned as
 * data for AC-B, but never receive a total and never enter the sort.
 *
 * The tie-break uses only structural/source categories and labels. It never
 * consults a database id, source_instance_id, or acquisition order, so cloning
 * a character cannot change the winner when ids are remapped (D62).
 *
 * Equipment is still interpreted by CATEGORY rather than slot. A crossed
 * Shield is a shield bonus; crossed body armour is a worn-armour candidate.
 * The existing mismatch and Strength warnings therefore survive unchanged.
 */
export function armorClass(input: {
  readonly equipment: readonly EquippedArmor[];
  readonly formulas: readonly ArmorClassFormulaCandidate[];
  readonly bonuses: readonly ArmorClassBonusCandidate[];
  readonly scores: AbilityScores;
}): ArmorClassResult {
  const dexModifier = input.scores.score('dexterity').modifier();
  const warnings: SheetWarning[] = [];
  const wornArmor: WornArmorClassFormula[] = [];
  const shields: SheetArmor[] = [];
  let strengthRequirementUnmet = false;

  for (const equipped of input.equipment) {
    const row = equipped.armor;
    if (row.category === 'shield') {
      shields.push(row);
    } else {
      wornArmor.push({
        kind: 'worn_armor',
        label: row.name,
        source: 'worn_armor',
        armor: row,
      });
    }
    if ((row.category === 'shield') !== (equipped.slot === 'shield')) {
      warnings.push({
        code: 'armor_slot_mismatch',
        message:
          `${row.name} is ${row.category === 'shield' ? 'a Shield' : `${row.category} armor`}, ` +
          `but it is recorded in the ${equipped.slot === 'shield' ? 'shield' : 'worn armor'} slot. ` +
          'It has been counted according to what it is, not where it was put.',
      });
    }
    const required = row.strength_requirement;
    if (required !== null && input.scores.score('strength').value < required) {
      strengthRequirementUnmet = true;
      warnings.push({
        code: 'strength_requirement_unmet',
        message:
          `${row.name} requires Strength ${String(required)}; this character has ` +
          `${String(input.scores.score('strength').value)}, so their speed is reduced by 10 feet.`,
      });
    }
  }

  const floor: ArmorClassFormulaCandidate = {
    kind: 'ability_formula',
    label: 'Unarmoured',
    source: 'manual',
    base: 10,
    ability_1: 'dexterity',
    ability_2: null,
    allows_shield: true,
  };
  const unarmouredFormulas = [floor, ...input.formulas];
  const excluded: ExcludedArmorClassFormula[] = [];
  const eligible: ResolvedArmorClassFormula[] = wornArmor.map((formula) => ({
    formula,
    total:
      formula.armor.armor_class +
      dexterityTerm(formula.armor, dexModifier),
  }));
  const wornArmorName = wornArmor[0]?.label;
  const shieldName = shields[0]?.name;

  for (const formula of unarmouredFormulas) {
    if (wornArmorName !== undefined) {
      excluded.push({
        formula,
        reason: { kind: 'wearing_armor', armor_name: wornArmorName },
      });
      continue;
    }
    if (shieldName !== undefined && !formula.allows_shield) {
      excluded.push({
        formula,
        reason: { kind: 'shield_not_allowed', shield_name: shieldName },
      });
      continue;
    }
    eligible.push({
      formula,
      total:
        formula.base +
        input.scores.score(formula.ability_1).modifier() +
        (formula.ability_2 === null
          ? 0
          : input.scores.score(formula.ability_2).modifier()),
    });
  }

  // The floor is eligible whenever there is no worn armour, and every worn
  // armour row is eligible otherwise. The list therefore cannot be empty.
  eligible.sort(compareResolvedArmorClassFormulas);
  const winner = eligible[0];
  if (winner === undefined) {
    throw new Error('Armor Class has no eligible base formula.');
  }
  const tied = eligible.filter(
    (candidate) =>
      candidate !== winner && candidate.total === winner.total,
  );
  const shieldBonus = shields.reduce(
    (total, shield) => total + shield.armor_class,
    0,
  );
  const flatBonus = input.bonuses.reduce(
    (total, bonus) => total + bonus.amount,
    0,
  );

  return {
    value: winner.total + shieldBonus + flatBonus,
    warnings,
    winner,
    excluded,
    tie_break:
      tied.length === 0
        ? null
        : {
            winner,
            losers: tied,
            rule: ARMOR_CLASS_TIE_BREAK_RULE,
          },
    speed_penalty_feet: strengthRequirementUnmet ? 10 : 0,
  };
}

function compareResolvedArmorClassFormulas(
  left: ResolvedArmorClassFormula,
  right: ResolvedArmorClassFormula,
): number {
  const valueDifference = right.total - left.total;
  if (valueDifference !== 0) {
    return valueDifference;
  }
  const sourceDifference =
    ARMOR_CLASS_SOURCE_PRECEDENCE.indexOf(left.formula.source) -
    ARMOR_CLASS_SOURCE_PRECEDENCE.indexOf(right.formula.source);
  if (sourceDifference !== 0) {
    return sourceDifference;
  }
  if (left.formula.label < right.formula.label) {
    return -1;
  }
  if (left.formula.label > right.formula.label) {
    return 1;
  }
  return 0;
}

/** The Dexterity contribution of one armour row. Exhaustive over the vocabulary. */
function dexterityTerm(armor: SheetArmor, dexModifier: number): number {
  switch (armor.dex_bonus) {
    case 'full':
      return dexModifier;
    case 'capped':
      // `dex_bonus_max` is non-null exactly when `dex_bonus` is `capped`, tied
      // by a CHECK on the table. The `?? 0` is unreachable for a seeded row and
      // is here so a hand-edited image degrades to Heavy-like behaviour rather
      // than to NaN.
      return Math.min(dexModifier, armor.dex_bonus_max ?? 0);
    case 'none':
      return 0;
  }
}

/**
 * A saving throw modifier: ability modifier, plus the proficiency bonus when
 * the character is proficient.
 *
 * `docs/srd/source/skills-table.txt`: "You add your Proficiency Bonus to your
 * saving throw if you have proficiency in that kind of save."
 *
 * PROFICIENCIES COME FROM THE FIRST CLASS ONLY. `multiclassing.txt`: "When you
 * gain your first level in a class other than your initial class, you gain only
 * some of the new class's starting proficiencies, as detailed in each class's
 * description" — and no class's "As a Multiclass Character" bullet in
 * `class-core-traits.txt` lists saving throws. A Fighter 5 / Wizard 3 is
 * therefore proficient in Strength and Constitution saves, NOT in Intelligence
 * and Wisdom as well.
 */
export function savingThrowProficiencies(
  classes: readonly SheetClass[],
): { readonly abilities: ReadonlySet<Ability>; readonly warnings: readonly SheetWarning[] } {
  const { chosen, warnings } = startingClass(classes);
  return {
    abilities: new Set(chosen?.saving_throws ?? []),
    warnings,
  };
}

/**
 * `abilityModifier + (proficient ? proficiencyBonus : 0)`.
 *
 * The proficient branch goes through `AttackBonus.from`, which is already
 * exactly this arithmetic and is already reviewed — it is named for spell
 * attacks but computes `modifier + proficiencyBonus` and permits a negative
 * result. Reusing it rather than writing a third copy is the point.
 *
 * NOT `SaveDC.from`, which cannot serve here: it refuses a value below 1, and a
 * legitimate skill modifier is negative — Strength 1 and no proficiency is −5.
 */
function proficientModifier(
  scores: AbilityScores,
  ability: Ability,
  bonus: number,
  proficient: boolean,
): number {
  const score = scores.score(ability);
  return proficient
    ? AttackBonus.from(score, bonus).value
    : score.modifier();
}

export function savingThrowModifier(input: {
  readonly ability: Ability;
  readonly scores: AbilityScores;
  readonly proficiencyBonus: number | null;
  readonly proficient: boolean;
}): number | null {
  if (input.proficient && input.proficiencyBonus === null) {
    return null;
  }
  return proficientModifier(
    input.scores,
    input.ability,
    // A non-proficient save does not use proficiency at all, so the absent
    // value cannot affect this branch.
    input.proficiencyBonus === null ? 0 : input.proficiencyBonus,
    input.proficient,
  );
}

/**
 * A skill modifier.
 *
 * `docs/srd/source/skills-table.txt`: "If a creature is proficient in a skill,
 * the creature applies its Proficiency Bonus to ability checks involving that
 * skill", and the Skills table supplies which ability each skill uses.
 *
 * Expertise applies the same proficiency bonus a second time. The caller may
 * set it only for a trained skill backed by an active Expertise grant.
 */
export function skillModifier(input: {
  readonly skill: Skill;
  readonly scores: AbilityScores;
  readonly proficiencyBonus: number | null;
  readonly proficient: boolean;
  readonly expertise?: boolean;
}): number | null {
  if (input.proficient && input.proficiencyBonus === null) {
    return null;
  }
  const ordinary = proficientModifier(
    input.scores,
    abilityForSkill(input.skill),
    // A non-proficient skill does not use proficiency at all, so the absent
    // value cannot affect this branch.
    input.proficiencyBonus === null ? 0 : input.proficiencyBonus,
    input.proficient,
  );
  return input.proficient && input.expertise
    ? ordinary + (input.proficiencyBonus ?? 0)
    : ordinary;
}

/**
 * Initiative — the Dexterity modifier.
 *
 * `docs/srd/source/sheet-math.txt`: "Initiative. Write your Dexterity modifier
 * in the space for Initiative on your character sheet."
 *
 * Advantage on Initiative (the Champion's Remarkable Athlete) is not a modifier
 * and is not represented here.
 */
export function initiative(scores: AbilityScores): number {
  return scores.score('dexterity').modifier();
}

/**
 * Passive Perception — `10 + the Wisdom (Perception) check modifier`.
 *
 * `docs/srd/source/sheet-math.txt` prints both the formula and a worked example
 * that this is checked against in the test: Wisdom 15 with Perception
 * proficiency and a +2 bonus gives 14.
 */
export function passivePerception(input: {
  readonly scores: AbilityScores;
  readonly proficiencyBonus: number | null;
  readonly proficient: boolean;
  readonly expertise?: boolean;
}): number | null {
  const modifier = skillModifier({
    skill: 'perception',
    scores: input.scores,
    proficiencyBonus: input.proficiencyBonus,
    proficient: input.proficient,
    ...(input.expertise === undefined
      ? {}
      : { expertise: input.expertise }),
  });
  return modifier === null ? null : 10 + modifier;
}

/**
 * How many attacks the Attack action gives, and what could not be counted.
 *
 * THE FEATURES DO NOT STACK, AND THIS IS THE MULTICLASS CASE THIS APPLICATION
 * SPECIALISES IN. `docs/srd/source/multiclassing.txt`: "If you gain the Extra
 * Attack feature from more than one class, the features don't stack. You can't
 * make more than two attacks with this feature unless you have a feature that
 * says you can (such as the Fighter's Two Extra Attacks feature)."
 *
 * So the combinator is `max`, never `sum`. A Fighter 5 / Ranger 5 makes TWO
 * attacks, not three — summing per-class grants is the plausible-looking bug
 * this function exists to not have. A Fighter 11 / Ranger 5 makes three,
 * because the Fighter's own feature is the one that says it can.
 *
 * THE RULE ITSELF, AND EVERYTHING D19 ADDED TO IT, LIVES IN
 * `src/rules/extra-attack.ts` — sources, weapon scopes and the grants this
 * application cannot resolve. This function is the sheet's door onto it, kept
 * here because `SheetClassLevels` is the sheet's type and every caller already
 * holds one. It RETURNS A RESULT AND NOT A BARE NUMBER: a Warlock's pact-weapon
 * grant is real and unappliable at once, and a function that could only return
 * a number would have had to choose between hiding it and inventing it.
 */
export function attacksPerAction(
  classes: readonly SheetClassLevels[],
): AttacksPerAction {
  return resolveAttacksPerAction(classes);
}

/** One class's Martial Arts die, resolved at that class's level. */
export interface MartialArtsDie {
  readonly class_name: string;
  readonly class_level: number;
  /** The die SIZE — `8` for `1d8`, matching `class_martial_arts_dice`. */
  readonly die: MartialArtsDieSize;
}

/**
 * The Martial Arts die, resolved PER CLASS AT THE LEVEL IN THAT CLASS.
 *
 * `docs/srd/source/attack-class-features.txt`: "You can roll 1d6 in place of
 * the normal damage of your Unarmed Strike or Monk weapons. This die changes as
 * you gain MONK LEVELS, as shown in the Martial Arts column of the Monk
 * Features table" — and that table is keyed on the Monk's own level.
 *
 * THIS IS THE LEVEL THE CANTRIP UPGRADES DO NOT USE, and the difference is a
 * real number on a real sheet rather than a pedantic distinction. A Monk 3 /
 * Fighter 10 has a d6 here — Monk level 3 — while a cantrip of theirs upgrades
 * on `characterLevel`, which is 13. One `level` variable serving both is
 * the bug this pair of functions exists to make impossible.
 *
 * RETURNS ONE ENTRY PER GRANTING CLASS, never a single combined die. Only the
 * Monk has this feature in `docs/srd/source/`, so in practice the list is empty
 * or holds one entry; combining two with `max` (or anything else) would be this
 * application inventing a multiclass rule the source does not state, which is
 * exactly what `attacksPerAction` has a sourced answer for and this does not.
 *
 * Resolved as the greatest row at or below the class level, matching how the
 * rows are stored: one absolute die per level, never an increment.
 */
export function martialArtsDice(
  classes: readonly SheetClassLevels[],
): readonly MartialArtsDie[] {
  const resolved: MartialArtsDie[] = [];
  for (const entry of classes) {
    const dice = entry.martial_arts_dice;
    if (dice === undefined) {
      continue;
    }
    // THE LEVEL AND THE DIE MOVE TOGETHER, IN ONE VARIABLE. They used to be
    // two, seeded `null` and `0` — and `0` is not a die size, so the pair could
    // be read apart in a state no Martial Arts die has ever been in. One
    // nullable record makes "no row at or below this level" the only absence
    // there is, and `MartialArtsDieSize` has no zero to pick as a placeholder.
    let best: { readonly level: number; readonly die: MartialArtsDieSize } | null =
      null;
    for (const [level, die] of dice) {
      if (level <= entry.level && (best === null || level > best.level)) {
        best = { level, die };
      }
    }
    if (best !== null) {
      resolved.push({
        class_name: entry.class_name,
        class_level: entry.level,
        die: best.die,
      });
    }
  }
  return resolved;
}

export type SheetResourceKind =
  | ClassResourceKind
  | ClassFormulaResourceKind
  | 'spell_slot'
  | 'pact_slot';

export type SheetResourceComputation =
  | {
      readonly kind: 'level_table';
      readonly class_level: ClassLevel;
    }
  | Extract<ClassResourceFormula, { readonly kind: 'fixed_count' }>
  | Extract<
      ClassResourceFormula,
      { readonly kind: 'fixed_count_by_class_level' }
    >
  | (Extract<
      ClassResourceFormula,
      { readonly kind: 'ability_modifier_minimum_one' }
    > & { readonly resolved_modifier: number })
  | Extract<ClassResourceFormula, { readonly kind: 'class_level_multiple' }>
  | {
      readonly kind: 'shared_spell_slots';
      readonly effective_caster_level: ClassLevel;
    }
  | {
      readonly kind: 'pact_magic';
      readonly class_level: ClassLevel;
      readonly spell_level: SpellLevel;
    };

export type SheetResourceMaximum =
  | {
      readonly status: 'computed';
      readonly id: string;
      readonly kind: SheetResourceKind;
      readonly class_definition_id: ClassDefinitionId | null;
      /** Catalog display text. It remains free text in the readable projection. */
      readonly class_name: string | null;
      readonly class_level: ClassLevel | null;
      readonly spell_level: SpellLevel | null;
      readonly maximum: PositiveResourceMaximum;
      readonly computation: SheetResourceComputation;
    }
  | {
      readonly status: 'absent';
      readonly id: string;
      readonly kind: SheetResourceKind | null;
      /** Present only when the detail names one catalog class. */
      readonly class_name: string | null;
      readonly reason:
        | 'resource_catalog_not_recorded'
        | 'resource_level_row_missing_or_invalid'
        | 'resource_formula_missing_or_invalid'
        | 'resource_formula_class_level_missing_or_invalid'
        | 'resource_formula_ability_input_missing_or_invalid'
        | 'feature_text_maximum_not_modelled'
        | 'spell_progression_missing_or_invalid';
      readonly detail: string;
    };

export type SheetResourceCatalog =
  | { readonly status: 'not_recorded' }
  | {
      readonly status: 'recorded';
      readonly expected_ladder_kinds: readonly ClassResourceKind[];
      readonly expected_formula_kinds: readonly ClassFormulaResourceKind[];
      readonly has_unmodelled_feature_maxima: boolean;
    };

export type SheetSpellProgressionRow =
  | { readonly status: 'missing' }
  | {
      readonly status: 'present';
      readonly slots: unknown;
      readonly pact_slots: unknown;
    };

/** The corruption-preserving catalog input to the pure resource resolver. */
export interface SheetResourceClassInput {
  readonly class_definition_id: ClassDefinitionId;
  readonly class_content_key: ContentKey;
  readonly class_name: string;
  readonly class_level: unknown;
  readonly catalog: SheetResourceCatalog;
  readonly ladder_rows: readonly {
    readonly resource_kind: unknown;
    readonly maximum: unknown;
  }[];
  readonly formula_rows: readonly {
    readonly resource_kind: unknown;
    /** `null` means the stored discriminator/payload failed closed decoding. */
    readonly formula: ClassResourceFormula | null;
  }[];
  readonly base_spellcasting: {
    readonly progression_type: unknown;
    readonly progression_row: SheetSpellProgressionRow;
  };
  readonly subclass_spellcasting: {
    readonly caster_fraction: unknown;
    readonly caster_rounding: unknown;
    readonly progression_row: SheetSpellProgressionRow;
  } | null;
}

export type SheetResourceAbilityInput =
  | { readonly status: 'present'; readonly modifier: unknown }
  | { readonly status: 'absent' };

export type SheetResourceAbilityInputs = Readonly<
  Record<ResourceFormulaAbility, SheetResourceAbilityInput>
>;

function sheetClassLevel(value: unknown): ClassLevel | null {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 20
    ? (value as ClassLevel)
    : null;
}

function positiveResourceMaximum(
  value: unknown,
): PositiveResourceMaximum | null {
  return Number.isSafeInteger(value) && Number(value) >= 1
    ? (value as PositiveResourceMaximum)
    : null;
}

function storedResourceMaximum(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : null;
}

function spellLevel(value: number): SpellLevel {
  if (!Number.isSafeInteger(value) || value < 1 || value > 9) {
    throw new TypeError(`Spell level ${String(value)} is outside 1..9.`);
  }
  return value as SpellLevel;
}

function absentResource(
  id: string,
  className: string | null,
  kind: SheetResourceKind | null,
  reason: Extract<SheetResourceMaximum, { status: 'absent' }>['reason'],
  detail: string,
): Extract<SheetResourceMaximum, { status: 'absent' }> {
  return {
    status: 'absent',
    id,
    kind,
    class_name: className,
    reason,
    detail,
  };
}

function resolvedFormula(
  formula: ClassResourceFormula,
  classContentKey: ContentKey,
  classLevel: ClassLevel,
  abilities: SheetResourceAbilityInputs,
):
  | { readonly status: 'not_acquired' }
  | {
      readonly status: 'computed';
      readonly maximum: PositiveResourceMaximum;
      readonly computation: SheetResourceComputation;
    }
  | { readonly status: 'ability_absent'; readonly ability: ResourceFormulaAbility } {
  const provided = classResourceFormulaExpression(
    formula,
    classContentKey,
    classLevel,
  );
  if (provided.kind === 'not_acquired') {
    return { status: 'not_acquired' };
  }
  const abilityModifiers = new Map<Ability, number>();
  for (const ability of resourceFormulaAbilities) {
    const input = abilities[ability];
    if (input.status === 'present' && Number.isSafeInteger(input.modifier)) {
      abilityModifiers.set(ability, Number(input.modifier));
    }
  }
  const evaluated = evaluateValue(provided.value, {
    // Adapter output can only read the owning class or one of the two formula
    // abilities. These other required context fields are therefore present by
    // type but unreachable through the adapter's closed output union.
    character_level: classLevel,
    proficiency_bonus: 1 as PositiveInteger,
    class_levels: new Map([[classContentKey, classLevel]]),
    ability_modifiers: abilityModifiers,
  });
  if (evaluated.kind === 'unavailable') {
    if (
      formula.kind === 'ability_modifier_minimum_one' &&
      evaluated.reason === 'missing_ability'
    ) {
      return { status: 'ability_absent', ability: formula.ability };
    }
    throw new TypeError(
      `A decoded class-resource formula evaluated as ${evaluated.reason}.`,
    );
  }
  const maximum = positiveResourceMaximum(evaluated.value);
  if (maximum === null) {
    if (formula.kind === 'ability_modifier_minimum_one') {
      return { status: 'ability_absent', ability: formula.ability };
    }
    throw new TypeError(
      'A decoded class-resource formula produced an invalid maximum.',
    );
  }
  return {
    status: 'computed',
    maximum,
    computation:
      formula.kind === 'ability_modifier_minimum_one'
        ? {
            ...formula,
            resolved_modifier: abilityModifiers.get(formula.ability) as number,
          }
        : formula,
  };
}

type DecodedSlots =
  | { readonly status: 'valid'; readonly value: Readonly<Record<number, number>> }
  | { readonly status: 'invalid' };

function decodedSlots(stored: unknown): DecodedSlots {
  if (typeof stored !== 'string') {
    return { status: 'invalid' };
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(stored);
  } catch {
    return { status: 'invalid' };
  }
  if (Array.isArray(decoded)) {
    return decoded.length === 0
      ? { status: 'valid', value: {} }
      : { status: 'invalid' };
  }
  if (decoded === null || typeof decoded !== 'object') {
    return { status: 'invalid' };
  }
  const value: Record<number, number> = {};
  for (const [key, count] of Object.entries(decoded)) {
    if (!/^[1-9]$/.test(key) || !Number.isSafeInteger(count) || Number(count) < 1) {
      return { status: 'invalid' };
    }
    value[Number(key)] = Number(count);
  }
  return { status: 'valid', value };
}

type DecodedPact =
  | {
      readonly status: 'valid';
      readonly count: PositiveResourceMaximum;
      readonly level: SpellLevel;
    }
  | { readonly status: 'invalid' };

function decodedPact(stored: unknown): DecodedPact {
  if (typeof stored !== 'string') {
    return { status: 'invalid' };
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(stored);
  } catch {
    return { status: 'invalid' };
  }
  if (
    decoded === null ||
    Array.isArray(decoded) ||
    typeof decoded !== 'object' ||
    Object.keys(decoded).sort().join(',') !== 'count,level'
  ) {
    return { status: 'invalid' };
  }
  const record = decoded as Record<string, unknown>;
  const count = positiveResourceMaximum(record.count);
  if (
    count === null ||
    !Number.isSafeInteger(record.level) ||
    Number(record.level) < 1 ||
    Number(record.level) > 5
  ) {
    return { status: 'invalid' };
  }
  return {
    status: 'valid',
    count,
    level: spellLevel(Number(record.level)),
  };
}

function subclassProgressionType(
  fraction: unknown,
  rounding: unknown,
): 'none' | 'invalid' | 'full' | 'half_up' | 'half_down' | 'third_up' | 'third_down' {
  if (fraction === null && rounding === null) {
    return 'none';
  }
  if (fraction === '1' && rounding === null) {
    return 'full';
  }
  if (fraction === '1/2' && rounding === 'up') {
    return 'half_up';
  }
  if (fraction === '1/2' && rounding === 'down') {
    return 'half_down';
  }
  if (fraction === '1/3' && rounding === 'up') {
    return 'third_up';
  }
  if (fraction === '1/3' && rounding === 'down') {
    return 'third_down';
  }
  return 'invalid';
}

function spellAbsence(
  detail: string,
  entry: SheetResourceClassInput | null = null,
  scope: 'base' | 'subclass' = 'base',
): Extract<SheetResourceMaximum, { readonly status: 'absent' }> {
  return absentResource(
    entry === null
      ? 'resource:spell-progression-absent'
      : `resource:${String(entry.class_definition_id)}:${scope}-spell-progression-absent`,
    entry?.class_name ?? null,
    null,
    'spell_progression_missing_or_invalid',
    detail,
  );
}

type ComputedSheetResourceMaximum = Extract<
  SheetResourceMaximum,
  { readonly status: 'computed' }
>;

type SpellSlotSection =
  | {
      readonly status: 'computed';
      readonly rows: readonly ComputedSheetResourceMaximum[];
    }
  | {
      readonly status: 'absent';
      readonly absence: Extract<
        SheetResourceMaximum,
        { readonly status: 'absent' }
      >;
    };

function resolveSpellSlotSection(
  classes: readonly SheetResourceClassInput[],
): SpellSlotSection {
  const sharedBase: Array<{
    readonly contribution: CasterContribution;
    readonly slots: Readonly<Record<number, number>>;
  }> = [];
  const sharedSubclass: CasterContribution[] = [];
  const pactContributions: Array<{
    readonly class_definition_id: ClassDefinitionId;
    readonly class_name: string;
    readonly class_level: ClassLevel;
    readonly contribution: CasterContribution;
    readonly exact: Extract<DecodedPact, { readonly status: 'valid' }>;
  }> = [];
  let absence: Extract<
    SheetResourceMaximum,
    { readonly status: 'absent' }
  > | null = null;

  for (const entry of classes) {
    const classLevel = sheetClassLevel(entry.class_level);
    if (!isProgressionType(entry.base_spellcasting.progression_type)) {
      absence ??= spellAbsence(
        ' has a missing or invalid spell progression type.',
        entry,
      );
    } else {
      const baseType = entry.base_spellcasting.progression_type;
      if (baseType !== 'none') {
        if (
          classLevel === null ||
          entry.base_spellcasting.progression_row.status === 'missing'
        ) {
          absence ??= spellAbsence(
            ' has a missing or invalid progression row at its current class level.',
            entry,
          );
        } else {
          const contribution = new CasterContribution(
            entry.class_name,
            classLevel,
            baseType,
          );
          if (baseType === 'pact') {
            const exact = decodedPact(
              entry.base_spellcasting.progression_row.pact_slots,
            );
            if (exact.status === 'invalid') {
              absence ??= spellAbsence(
                ' has missing or invalid Pact Magic slot content.',
                entry,
              );
            } else {
              pactContributions.push({
                class_definition_id: entry.class_definition_id,
                class_name: entry.class_name,
                class_level: classLevel,
                contribution,
                exact,
              });
            }
          } else {
            const exact = decodedSlots(
              entry.base_spellcasting.progression_row.slots,
            );
            if (
              exact.status === 'invalid' ||
              (Object.keys(exact.value).length > 0) !==
                (contribution.casterLevels() > 0)
            ) {
              absence ??= spellAbsence(
                ' has missing or invalid shared spell-slot content.',
                entry,
              );
            } else {
              sharedBase.push({ contribution, slots: exact.value });
            }
          }
        }
      }
    }

    if (entry.subclass_spellcasting !== null) {
      const subclassType = subclassProgressionType(
        entry.subclass_spellcasting.caster_fraction,
        entry.subclass_spellcasting.caster_rounding,
      );
      if (subclassType === 'invalid') {
        absence ??= spellAbsence(
          "'s subclass has a missing or invalid spell progression type.",
          entry,
          'subclass',
        );
      } else if (subclassType !== 'none') {
        if (
          classLevel === null ||
          entry.subclass_spellcasting.progression_row.status === 'missing'
        ) {
          absence ??= spellAbsence(
            "'s subclass has a missing or invalid progression row at its current class level.",
            entry,
            'subclass',
          );
        } else {
          const contribution = new CasterContribution(
            `${entry.class_name} subclass`,
            classLevel,
            subclassType,
          );
          const exact = decodedSlots(
            entry.subclass_spellcasting.progression_row.slots,
          );
          if (
            exact.status === 'invalid' ||
            (Object.keys(exact.value).length > 0) !==
              (contribution.casterLevels() > 0)
          ) {
            absence ??= spellAbsence(
              "'s subclass has missing or invalid shared spell-slot content.",
              entry,
              'subclass',
            );
          } else {
            sharedSubclass.push(contribution);
          }
        }
      }
    }
  }

  if (absence !== null) {
    return { status: 'absent', absence };
  }

  const rows: ComputedSheetResourceMaximum[] = [];
  const sharedContributions = [
    ...sharedBase.map((entry) => entry.contribution),
    ...sharedSubclass,
  ];
  let sharedSlots: Readonly<Record<number, number>>;
  if (sharedBase.length === 1 && sharedSubclass.length === 0) {
    const soleBase = sharedBase[0];
    if (soleBase === undefined) {
      throw new TypeError('The sole shared caster contribution is missing.');
    }
    sharedSlots = soleBase.slots;
  } else {
    sharedSlots = slots(sharedContributions);
  }
  const effectiveLevel = casterLevel(sharedContributions);
  const typedEffectiveLevel =
    effectiveLevel === 0 ? null : sheetClassLevel(effectiveLevel);
  for (const [levelText, maximumValue] of Object.entries(sharedSlots)) {
    const level = spellLevel(Number(levelText));
    const maximum = positiveResourceMaximum(maximumValue);
    if (maximum === null || typedEffectiveLevel === null) {
      return {
        status: 'absent',
        absence: spellAbsence(
          'The shared spell-slot result is missing or invalid.',
        ),
      };
    }
    rows.push({
      status: 'computed',
      id: `resource:spell-slot:${String(level)}`,
      kind: 'spell_slot',
      class_definition_id: null,
      class_name: null,
      class_level: null,
      spell_level: level,
      maximum,
      computation: {
        kind: 'shared_spell_slots',
        effective_caster_level: typedEffectiveLevel,
      },
    });
  }

  if (pactContributions.length === 1) {
    const pact = pactContributions[0];
    if (pact === undefined) {
      throw new TypeError('The sole Pact caster contribution is missing.');
    }
    rows.push({
      status: 'computed',
      id: 'resource:pact-slot',
      kind: 'pact_slot',
      class_definition_id: pact.class_definition_id,
      class_name: pact.class_name,
      class_level: pact.class_level,
      spell_level: pact.exact.level,
      maximum: pact.exact.count,
      computation: {
        kind: 'pact_magic',
        class_level: pact.class_level,
        spell_level: pact.exact.level,
      },
    });
  } else if (pactContributions.length > 1) {
    const combined = pactMagic(
      pactContributions.map((entry) => entry.contribution),
    );
    const combinedLevel = sheetClassLevel(
      pactContributions.reduce(
        (sum, entry) => sum + Number(entry.class_level),
        0,
      ),
    );
    const maximum = positiveResourceMaximum(combined?.count);
    if (combined === null || combinedLevel === null || maximum === null) {
      return {
        status: 'absent',
        absence: spellAbsence(
          'The combined Pact Magic result is missing or invalid.',
        ),
      };
    }
    const level = spellLevel(combined.level);
    rows.push({
      status: 'computed',
      id: 'resource:pact-slot',
      kind: 'pact_slot',
      class_definition_id: null,
      class_name: null,
      class_level: combinedLevel,
      spell_level: level,
      maximum,
      computation: {
        kind: 'pact_magic',
        class_level: combinedLevel,
        spell_level: level,
      },
    });
  }

  return { status: 'computed', rows };
}

/** Compute every sourced resource maximum without storing spending state. */
export function resolveSheetResources(
  classes: readonly SheetResourceClassInput[],
  abilities: SheetResourceAbilityInputs,
): readonly SheetResourceMaximum[] {
  const resolved: SheetResourceMaximum[] = [];
  let showFeatureTextDisclosure = false;

  for (const entry of classes) {
    const classLevel = sheetClassLevel(entry.class_level);
    if (entry.catalog.status === 'not_recorded') {
      resolved.push(
        absentResource(
          `resource:${String(entry.class_definition_id)}:catalog`,
          entry.class_name,
          null,
          'resource_catalog_not_recorded',
          'Resource maxima are not recorded for this class.',
        ),
      );
      continue;
    }
    showFeatureTextDisclosure ||= entry.catalog.has_unmodelled_feature_maxima;

    for (const kind of entry.catalog.expected_ladder_kinds) {
      const id = `resource:${String(entry.class_definition_id)}:${kind}`;
      const row = entry.ladder_rows.find((candidate) => candidate.resource_kind === kind);
      const storedMaximum =
        row === undefined ? null : storedResourceMaximum(row.maximum);
      if (classLevel === null || storedMaximum === null) {
        resolved.push(
          absentResource(
            id,
            entry.class_name,
            kind,
            'resource_level_row_missing_or_invalid',
            `${classResourceLabel(kind)} maximum is unavailable because the level ${String(entry.class_level)} source row is missing or invalid.`,
          ),
        );
        continue;
      }
      if (storedMaximum === 0) {
        continue;
      }
      const maximum = positiveResourceMaximum(storedMaximum);
      if (maximum === null) {
        throw new TypeError('A positive stored resource maximum failed validation.');
      }
      resolved.push({
        status: 'computed',
        id,
        kind,
        class_definition_id: entry.class_definition_id,
        class_name: entry.class_name,
        class_level: classLevel,
        spell_level: null,
        maximum,
        computation: { kind: 'level_table', class_level: classLevel },
      });
    }

    for (const kind of entry.catalog.expected_formula_kinds) {
      const id = `resource:${String(entry.class_definition_id)}:${kind}`;
      if (classLevel === null) {
        resolved.push(
          absentResource(
            id,
            entry.class_name,
            kind,
            'resource_formula_class_level_missing_or_invalid',
            `${classFormulaResourceLabel(kind)} maximum is unavailable because its owning class level is missing or invalid.`,
          ),
        );
        continue;
      }
      const row = entry.formula_rows.find((candidate) => candidate.resource_kind === kind);
      if (row === undefined || row.formula === null) {
        resolved.push(
          absentResource(
            id,
            entry.class_name,
            kind,
            'resource_formula_missing_or_invalid',
            `${classFormulaResourceLabel(kind)} maximum is unavailable because its formula is missing or invalid.`,
          ),
        );
        continue;
      }
      const formula = resolvedFormula(
        row.formula,
        entry.class_content_key,
        classLevel,
        abilities,
      );
      if (formula.status === 'not_acquired') {
        continue;
      }
      if (formula.status === 'ability_absent') {
        const ability =
          formula.ability === 'charisma' ? 'Charisma' : 'Wisdom';
        resolved.push(
          absentResource(
            id,
            entry.class_name,
            kind,
            'resource_formula_ability_input_missing_or_invalid',
            `${classFormulaResourceLabel(kind)} maximum is unavailable because the resolved ${ability} modifier is missing or invalid.`,
          ),
        );
        continue;
      }
      resolved.push({
        status: 'computed',
        id,
        kind,
        class_definition_id: entry.class_definition_id,
        class_name: entry.class_name,
        class_level: classLevel,
        spell_level: null,
        maximum: formula.maximum,
        computation: formula.computation,
      });
    }
  }

  if (showFeatureTextDisclosure) {
    resolved.push(
      absentResource(
        'resource:feature-text-not-modelled',
        null,
        null,
        'feature_text_maximum_not_modelled',
        'Mystic Arcanum and Signature Spells are per-spell single uses, not one shared resource maximum.',
      ),
    );
  }

  const spellSection = resolveSpellSlotSection(classes);
  if (spellSection.status === 'absent') {
    resolved.push(spellSection.absence);
  } else {
    resolved.push(...spellSection.rows);
  }

  return resolved;
}

/**
 * NOT IN THIS MODULE, DELIBERATELY, AND NOT HALF-BUILT:
 *
 *  - PERSISTENCE of the three stored inputs (worn armour, shield, manual
 *    adjustment, per-level rolls). A character-scoped table has a 36-file
 *    surface here — backup, share, snapshot, delete order, row contracts,
 *    candidate audit, commands and the browser tests — and a character's armour
 *    that did not survive a backup would be a data-loss bug rather than a
 *    partial feature. It is the next change, and these functions already take
 *    those values as parameters so it needs no reshaping of this module.
 *  - CLASS FEATURE TEXT and the ten missing subclass sets (D11 part 1 excludes
 *    both).
 *  - UNARMORED DEFENSE for Barbarian and Monk: the feature text is not in
 *    `docs/srd/source/`, so the sheet stays silent instead of guessing.
 *  - EXPERTISE, and the attack profiles of D14/D15, which need this foundation
 *    first.
 */
