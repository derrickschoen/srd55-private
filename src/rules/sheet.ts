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
import { abilityForSkill } from './skills';
import type { ArmorCategory, ArmorDexBonus } from '../domain/enums';
import type { AttacksPerAction, ExtraAttackGrant } from './extra-attack';
import { resolveAttacksPerAction } from './extra-attack';

/**
 * A class NAME, a LEVEL in it, and the per-level content keyed on that level.
 *
 * Split out of `SheetClass` so the functions that need nothing else —
 * `totalCharacterLevel`, `attacksPerAction`, `martialArtsDice` — can be handed
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
  readonly martial_arts_dice?: ReadonlyMap<number, number>;
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
  readonly hit_die: number | null;
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
 * the initial grant of the same category. Unreachable in SRD 5.2 — the two
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
export const ASSUMED_HIT_DIE = 8;

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
    | 'armor_not_trained';
  readonly message: string;
}

export interface HitPointResult {
  readonly maximum: number;
  readonly warnings: readonly SheetWarning[];
}

export interface ArmorClassResult {
  readonly value: number;
  readonly warnings: readonly SheetWarning[];
}

/**
 * Total character level — the SUM across classes, floored at 1.
 *
 * Matches what `spell-access-builder.ts` and `build-report-builder.ts` already
 * compute, deliberately: a sheet that derived a different total would print a
 * save DC disagreeing with the planner on the same screen.
 */
export function totalCharacterLevel(
  classes: readonly SheetClassLevels[],
): number {
  return Math.max(
    1,
    classes.reduce((sum, entry) => sum + entry.level, 0),
  );
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
 * for the same reason as `totalCharacterLevel`: one number on the screen.
 */
export function sheetProficiencyBonus(
  classes: readonly SheetClass[],
  override: number | null = null,
): number {
  return override ?? proficiencyBonus(totalCharacterLevel(classes));
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
  readonly warnings: readonly SheetWarning[];
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
 */
export function fixedHitPointsPerLevel(hitDie: number): number {
  if (!Number.isSafeInteger(hitDie) || hitDie < 2) {
    throw new RangeError(`Hit die must be an integer of at least 2, got ${String(hitDie)}.`);
  }
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
  const warnings: SheetWarning[] = [...starting.warnings];

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
 * Armor Class.
 *
 * UNARMOURED: `10 + Dexterity modifier`. `docs/srd/source/sheet-math.txt`:
 * "Without armor or a shield, your base Armor Class is 10 plus your Dexterity
 * modifier", and `skills-table.txt` prints the same as "Base AC = 10 + the
 * creature's Dexterity modifier".
 *
 * ARMOURED: the base the Armor table prints, plus the Dexterity term that row
 * allows — `docs/srd/source/armor-table.txt`. Light armour adds the modifier
 * uncapped, Medium adds it capped at 2, Heavy adds NOTHING.
 *
 * HEAVY ARMOUR IS `none`, NOT A CAP OF ZERO, and the difference is a real bug
 * avoided: `Math.min(dexModifier, 0)` SUBTRACTS for a negative modifier, so a
 * Dexterity 6 character in Chain Mail would come out at 14 where the table says
 * a flat 16.
 *
 * WHAT THIS DOES NOT MODEL, and says so rather than guessing: Unarmored Defense
 * (Barbarian, Monk) and any other class feature offering an alternative
 * calculation. `docs/srd/source/multiclassing.txt` is explicit that a character
 * with several such features picks ONE, and the feature text for neither class
 * is in `docs/srd/source/`. The manual adjustment is the honest escape hatch
 * until it is.
 *
 * THE ROLE OF A ROW IS DECIDED BY `category`, NOT BY WHICH ARGUMENT IT ARRIVES
 * IN. `armorClassFrom` below is the exhaustive dispatch the schema comment on
 * `armor_templates.armor_class` promises. Passing a Shield as `armor` is a real
 * reachable mistake once persistence lands — the two are the same TypeScript
 * shape — and reading its `+2` as a base Armor Class would silently halve
 * somebody's defence. Here it contributes its bonus over the unarmoured base and
 * the sheet SAYS the slots are crossed, which is D11 part 2 applied to a value
 * this module was already given.
 */
export function armorClass(input: {
  readonly armor?: SheetArmor | null;
  readonly shield?: SheetArmor | null;
  readonly scores: AbilityScores;
  readonly adjustment?: number;
}): ArmorClassResult {
  const dexModifier = input.scores.score('dexterity').modifier();
  const warnings: SheetWarning[] = [];

  let base: number | null = null;
  let bonus = 0;

  for (const slot of ['armor', 'shield'] as const) {
    const row = input[slot] ?? null;
    if (row === null) {
      continue;
    }
    const contribution = armorClassFrom(row, dexModifier);
    if (contribution.base === null) {
      bonus += contribution.bonus;
    } else {
      // Two rows both claiming to be worn armour cannot both apply; the SRD has
      // no rule for layering, so the better of the two is used and stated.
      base = base === null ? contribution.base : Math.max(base, contribution.base);
    }
    if ((contribution.base === null) !== (slot === 'shield')) {
      warnings.push({
        code: 'armor_slot_mismatch',
        message:
          `${row.name} is ${row.category === 'shield' ? 'a Shield' : `${row.category} armor`}, ` +
          `but it is recorded in the ${slot === 'shield' ? 'shield' : 'worn armor'} slot. ` +
          'It has been counted according to what it is, not where it was put.',
      });
    }
    const required = row.strength_requirement;
    if (required !== null && input.scores.score('strength').value < required) {
      warnings.push({
        code: 'strength_requirement_unmet',
        message:
          `${row.name} requires Strength ${String(required)}; this character has ` +
          `${String(input.scores.score('strength').value)}, so their speed is reduced by 10 feet.`,
      });
    }
  }

  const value = (base ?? 10 + dexModifier) + bonus;
  return { value: value + (input.adjustment ?? 0), warnings };
}

/**
 * What one row contributes, decided by `category` and by nothing else.
 *
 * `base` is the Armor Class the row SETS, replacing the unarmoured `10 + Dex`;
 * `bonus` is what it ADDS on top of whatever base applies. Exactly one of the
 * two is meaningful per category, which is why `base` is nullable here and
 * nowhere else: `null` means "this row is not worn armour", a fact about the
 * category rather than missing data (D6b limb 1).
 *
 * THE SWITCH IS EXHAUSTIVE OVER `ArmorCategory` with no `default`, so adding a
 * category to the vocabulary is a compile error here rather than a silent
 * miscalculation — which is the guarantee `armor_templates.armor_class` is
 * documented as relying on.
 */
function armorClassFrom(
  row: SheetArmor,
  dexModifier: number,
): { readonly base: number | null; readonly bonus: number } {
  switch (row.category) {
    case 'light':
    case 'medium':
    case 'heavy':
      return { base: row.armor_class + dexterityTerm(row, dexModifier), bonus: 0 };
    case 'shield':
      // The Shield row's `armor_class` is the `+2` BONUS the table prints, not
      // a base — the one place the column changes meaning.
      return { base: null, bonus: row.armor_class };
  }
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
  readonly proficiencyBonus: number;
  readonly proficient: boolean;
}): number {
  return proficientModifier(
    input.scores,
    input.ability,
    input.proficiencyBonus,
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
 * EXPERTISE IS NOT MODELLED. Rogue and Bard Expertise doubles the bonus for
 * chosen skills; that feature's text is not in `docs/srd/source/` and this
 * application says nothing about it rather than inventing it (F4's rule).
 */
export function skillModifier(input: {
  readonly skill: Skill;
  readonly scores: AbilityScores;
  readonly proficiencyBonus: number;
  readonly proficient: boolean;
}): number {
  return proficientModifier(
    input.scores,
    abilityForSkill(input.skill),
    input.proficiencyBonus,
    input.proficient,
  );
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
  readonly proficiencyBonus: number;
  readonly proficient: boolean;
}): number {
  return (
    10 +
    skillModifier({
      skill: 'perception',
      scores: input.scores,
      proficiencyBonus: input.proficiencyBonus,
      proficient: input.proficient,
    })
  );
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
  readonly die: number;
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
 * on `totalCharacterLevel`, which is 13. One `level` variable serving both is
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
    let bestLevel: number | null = null;
    let bestDie = 0;
    for (const [level, die] of dice) {
      if (level <= entry.level && (bestLevel === null || level > bestLevel)) {
        bestLevel = level;
        bestDie = die;
      }
    }
    if (bestLevel !== null) {
      resolved.push({
        class_name: entry.class_name,
        class_level: entry.level,
        die: bestDie,
      });
    }
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
