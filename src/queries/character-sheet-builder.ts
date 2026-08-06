import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  Ability,
  ArmorCategory,
  ArmorDexBonus,
  ArmorSlot,
  HitDieSize,
  Skill,
  WeaponProficiencyCategory,
} from '../domain/enums';
import {
  abilities,
  armorCategories,
  armorDexBonuses,
  armorSlots,
  isEnumValue,
  skills,
  weaponProficiencyCategories,
} from '../domain/enums';
import {
  resolveCharacterAbilities,
  resolvedTotals,
} from '../rules/ability-contributions';
import type { AbilityOverrideOutcome } from '../builder/contracts';
import { AbilityScores } from '../rules/ability-scores';
import { SheetContentLookup } from '../rules/sheet-content-lookup';
import { SKILL_LABELS, abilityForSkill } from '../rules/skills';
import { activeGrantedSkills } from '../grants/skill-grants';
import {
  activeExpertiseSkills,
  resolveSkillExpertiseGrants,
} from '../grants/skill-expertise-grants';
import {
  armorClass,
  attacksPerAction,
  hitDieOrAbsent,
  hitPointMaximum,
  initiative,
  martialArtsDice,
  passivePerception,
  resolveSheetResources,
  savingThrowModifier,
  savingThrowProficiencies,
  sheetProficiencyBonus,
  skillModifier,
  type HitPointRolls,
  type ArmorClassBonusCandidate,
  type ArmorClassExclusionReason,
  type ArmorClassFormula,
  type ArmorClassFormulaCandidate,
  type ArmorClassResult,
  type ArmorClassSourceCategory,
  type EquippedArmor,
  type ResolvedArmorClassFormula,
  type SheetArmor,
  type SheetClass,
  type SheetWarning,
  type SheetResourceMaximum,
} from '../rules/sheet';
import {
  readEligibleCharacterEffects,
  type EligibleCharacterEffect,
} from '../rules/eligible-character-effects';
import { characterLevel } from '../rules/character-level';
import {
  characterProficiencies,
  type ProficiencyWeapon,
  type WeaponProficiencyVerdict,
} from '../rules/multiclass-proficiency';
import {
  effectHitPoints,
  summariseEffects,
  walkingSpeedFeet,
  type EffectRow,
} from '../rules/species-effects';
import type { AttacksPerAction } from '../rules/extra-attack';
import { recordedEquipmentPackages } from '../builder/equipment-step';
import { CharacterNotFoundError } from './character-crud';
import {
  PrintAppendixPreferenceQueries,
  type PrintAppendixPreferences,
} from './print-appendix-preferences';
import {
  ClassProficiencyLookup,
  EMPTY_CLASS_PROFICIENCIES,
} from './class-proficiency-lookup';
import {
  CharacterSpellSectionBuilder,
  type CharacterSpellSection,
} from './character-spell-section-builder';

/**
 * THE CHARACTER SHEET, ASSEMBLED AND THROWN AWAY.
 *
 * NOTHING IN THIS FILE IS STORED. Every number below is computed on each read
 * from the ability scores, the class levels, the sourced class content and the
 * four stored inputs of `db/schema/sheet-inputs.ts`. D11 part 1 is why: a
 * stored Armor Class drifts from the Dexterity score the moment either moves,
 * and there is then no way to tell which of the two is right.
 *
 * IT IS ONE PROJECTION, RENDERED TWICE. `src/ui/screens/sheet/sheet-view.ts`
 * turns this object into the readable page AND into the D4 machine-readable
 * block, from this one value — the lesson of the D20 defect, where one screen
 * built two lists independently and the test that covered it could not fail.
 * Every displayed value and its adjacent control comes from here.
 *
 * IT STATES WHAT IT LACKS. `gaps` is not decoration and not an error list: F4
 * forbids rendering a blank box that reads as "none". Most gaps are
 * application-wide; the languages/tools gap is selected only when this
 * character carries printed prose that grants one, because D102 says a
 * disclosure on an unaffected character is noise. Each selected gap is named
 * here so the page can print the sentence rather than the silence.
 */

export interface SheetNumber {
  /** A stable machine key. Never localised, never reordered. */
  readonly id: string;
  readonly label: string;
  readonly value: number;
  /** How the number was reached, in the source's own terms. */
  readonly formula: string;
}

export interface SheetAbilityOverrideTerm {
  /** User- or source-authored name; the view must mark it as free text. */
  readonly label: string;
  readonly set_to: number;
  readonly outcome: AbilityOverrideOutcome;
}

export interface SheetAbilityScore extends SheetNumber {
  readonly ability: Ability;
  readonly score: number;
  readonly base_score: number;
  readonly increased_score: number;
  readonly override_terms: readonly SheetAbilityOverrideTerm[];
}

export interface UndeterminedSheetNumber
  extends Omit<SheetNumber, 'value'> {
  readonly value: number | null;
}

export interface SheetSkill extends UndeterminedSheetNumber {
  readonly skill: Skill;
  readonly ability: Ability;
  readonly proficient: boolean;
  readonly expertise: boolean;
}

export interface SheetSave extends UndeterminedSheetNumber {
  readonly ability: Ability;
  readonly proficient: boolean;
}

/** One recorded piece of armour, exactly as stored. */
export interface SheetArmorRow {
  readonly slot: ArmorSlot;
  readonly name: string;
  readonly category: ArmorCategory;
  readonly armor_class: number;
  readonly dex_bonus: ArmorDexBonus;
  readonly dex_bonus_max: number | null;
  readonly strength_requirement: number | null;
  readonly stealth_disadvantage: boolean;
  readonly notes: string | null;
}

/** One modifier-only item, including the attunement state that gates its effects. */
export interface SheetItemRow {
  readonly name: string;
  readonly description: string | null;
  readonly requires_attunement: boolean;
  readonly attuned: boolean;
}

/**
 * Printed source prose the sheet preserves without interpreting.
 *
 * D102 deliberately keeps language and tool proficiencies out of the character
 * model. This is therefore readable free text only: it never enters
 * `sheetFacts`, never appears as a proficiency line, and never drives a number.
 */
export interface SheetPrintedFeature {
  readonly source: 'background' | 'species_trait';
  readonly source_name: string | null;
  readonly name: string;
  readonly text: string | null;
}

export interface SheetArmorClassFormula {
  /** User/catalog-authored display label; never copied into structured JSON. */
  readonly label: string;
  readonly source: ArmorClassSourceCategory;
  /** Closed-vocabulary/numeric expression, such as `13 + DEX`. */
  readonly expression: string;
  /** Absent for excluded formulas, which eligibility prevents us from scoring. */
  readonly total: number | null;
}

export interface SheetArmorClassExclusion {
  readonly formula: SheetArmorClassFormula;
  readonly reason: ArmorClassExclusionReason;
}

export interface SheetArmorClassTieBreak {
  readonly winner: SheetArmorClassFormula;
  readonly losers: readonly SheetArmorClassFormula[];
  readonly rule: 'source_precedence_then_label';
}

/**
 * The transient, source-carrying explanation of the final Armor Class.
 *
 * Labels remain separate from the numeric/closed-vocabulary fields so the view
 * can mark every imported or hand-written label as unverified free text.
 */
export interface SheetArmorClass extends SheetNumber {
  readonly winner: SheetArmorClassFormula;
  readonly shields: readonly {
    readonly label: string;
    readonly amount: number;
  }[];
  readonly bonuses: readonly {
    readonly label: string;
    readonly amount: number;
  }[];
  readonly excluded: readonly SheetArmorClassExclusion[];
  readonly tie_break: SheetArmorClassTieBreak | null;
}

export interface SheetHitPointRoll {
  readonly class_name: string;
  readonly class_level: number;
  readonly rolled_value: number;
  /**
   * Whether a class of this name is one the character currently has.
   *
   * `false` is the ORPHAN case `db/schema/sheet-inputs.ts` accepts as the price
   * of keying a roll on a class name: the roll survives the class row being
   * deleted, and `hitPointMaximum` simply does not read it. Saying so here is
   * what keeps that from being a number quietly missing from a player's hit
   * points.
   */
  readonly applies: boolean;
}

export interface SheetClassLine {
  readonly class_name: string;
  readonly level: number;
  /**
   * `null` when this application holds no hit die for the class — see
   * `SheetClass.hit_die`. The page prints the absence; it does not print the
   * assumption as though it were the class's own die.
   */
  readonly hit_die: HitDieSize | null;
  readonly is_starting_class: boolean;
  readonly subclass_name: string | null;
  readonly saving_throws: readonly Ability[];
}

/**
 * Something the sheet cannot show, named.
 *
 * `kind` is a stable key so a reader can tell the four apart without parsing
 * prose; `detail` is the sentence a person reads. These are NOT completeness
 * items — see `src/queries/character-completeness.ts`, which reports what the
 * USER has left undone. These report what the APPLICATION does not hold, and
 * they are true of every character equally.
 */
/**
 * WHAT THIS CHARACTER IS PROFICIENT WITH, and what could not be decided (D28).
 *
 * `armor_training` and `weapon_proficiencies` are the UNION across every class:
 * the class they STARTED in contributed its full Core Traits row, every later
 * class only its multiclass entry subset. `classes` names which class
 * contributed which, and `via` says which of the two roles it played — so the
 * asymmetry is visible on the page rather than only in the code.
 */
export interface SheetProficiencies {
  readonly armor_training: readonly ArmorCategory[];
  readonly weapon_proficiencies: readonly {
    readonly class_name: string;
    readonly category: WeaponProficiencyCategory;
    /** Printed verbatim. Evaluated only as the set union D28 §2 describes. */
    readonly property_qualifier: string | null;
  }[];
  readonly classes: readonly {
    readonly class_name: string;
    readonly via: 'initial' | 'multiclass_entry';
  }[];
  /** One per weapon the character owns, in the order they were added. */
  readonly weapons: readonly {
    readonly name: string;
    readonly verdict: WeaponProficiencyVerdict;
  }[];
}

export interface SheetGap {
  readonly kind:
    | 'no_class_feature_text'
    | 'partial_subclass_catalog'
    | 'expertise_choice_unfilled'
    | 'expertise_proficiency_removed'
    | 'languages_and_tools_not_modelled'
    | 'weapon_reach_not_recorded'
    | 'gear_not_itemised';
  readonly title: string;
  readonly detail: string;
}

/**
 * One recorded starting-equipment package, for the D33/D65 line: the sheet
 * SAYS gear is not itemised rather than implying an empty inventory, and the
 * recorded package name shows with its contents from the rules tables. The
 * contents arrive display-filtered — no coin line, because no purse is ever
 * granted (D56).
 */
export interface SheetEquipmentPackage {
  readonly kind: 'class' | 'background';
  readonly source_name: string;
  readonly option: string;
  readonly contents: readonly {
    readonly item_name: string;
    readonly quantity: number;
  }[];
}

export interface CharacterFlavor {
  readonly alignment: string | null;
  readonly appearance: string | null;
  readonly backstory: string | null;
  readonly notes: string | null;
}

export interface CharacterSheet {
  readonly character_id: number;
  readonly name: string;
  readonly total_level: number | null;
  readonly proficiency_bonus: UndeterminedSheetNumber;
  readonly ability_scores: readonly SheetAbilityScore[];
  readonly hit_points: SheetNumber;
  /** The species contribution, separately, and `null` when there is none. */
  readonly species_hit_points: UndeterminedSheetNumber | null;
  readonly armor_class: SheetArmorClass;
  readonly initiative: SheetNumber;
  readonly passive_perception: UndeterminedSheetNumber;
  readonly saves: readonly SheetSave[];
  readonly skills: readonly SheetSkill[];
  readonly attacks_per_action: AttacksPerAction;
  readonly resources: readonly SheetResourceMaximum[];
  readonly spells: CharacterSpellSection;
  readonly martial_arts: readonly {
    readonly class_name: string;
    readonly class_level: number;
    readonly die: number;
  }[];
  readonly walking_speed_feet: number | null;
  readonly damage_resistances: readonly string[];
  /**
   * The LABELS of resistances whose TYPE the character has yet to choose.
   *
   * Kept out of the list above, because a Dragonborn genuinely resists
   * something and a sheet showing nothing would be wrong in the other
   * direction.
   *
   * A LIST OF NAMES WHERE THIS WAS A COUNT. The old model stored an effect on a
   * trait row, so two traits each granting an unnamed resistance were
   * indistinguishable and the sheet could only say "plus 2 whose type this
   * application does not record". An effect row carries its own label, so the
   * page can now name the grant the user has to go and decide.
   */
  readonly unchosen_damage_resistances: readonly string[];
  readonly classes: readonly SheetClassLine[];
  readonly proficiencies: SheetProficiencies;
  readonly armor: readonly SheetArmorRow[];
  readonly items: readonly SheetItemRow[];
  /** Printed background/species prose; deliberately absent from `sheetFacts`. */
  readonly printed_features: readonly SheetPrintedFeature[];
  /** Character-authored prose; deliberately absent from `sheetFacts`. */
  readonly flavor: CharacterFlavor;
  /** D162 UI state; never part of the character's structured sheet facts. */
  readonly print_appendix_preferences: PrintAppendixPreferences;
  readonly hit_point_rolls: readonly SheetHitPointRoll[];
  /** The recorded package choices, D33's answer to a blank inventory (D65). */
  readonly equipment_packages: readonly SheetEquipmentPackage[];
  /** Degradations of a specific derivation, from `src/rules/sheet.ts`. */
  readonly warnings: readonly SheetWarning[];
  readonly gaps: readonly SheetGap[];
}

/**
 * The codecs this builder reads through.
 *
 * They are named and hoisted rather than written inline at the call site for the
 * ones used more than once, and because a codec with a name is a place to say
 * what a column MEANS — see `hit_die` below, which is the whole D24 finding in
 * one nullable field.
 */

interface SheetCharacterRow {
  readonly id: number;
  readonly name: string;
  /**
   * BASE scores, as stored. The sheet computes with the RESOLVED totals —
   * base plus `ability_increase` contributions (D63) — built in `build()`
   * through the one resolver every score reader shares
   * (`src/rules/ability-contributions.ts`). Kept as the raw record here
   * because the resolver needs base, not an `AbilityScores`.
   */
  readonly base_abilities: Readonly<Record<Ability, number>>;
  readonly proficiency_bonus_override: number | null;
  readonly alignment: string | null;
  readonly appearance: string | null;
  readonly backstory: string | null;
  readonly notes: string | null;
}

const sheetCharacter: RowCodec<SheetCharacterRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  name: sqlString(row, 'name'),
  base_abilities: Object.fromEntries(
    abilities.map((ability) => [ability, sqlInteger(row, ability)]),
  ) as Record<Ability, number>,
  proficiency_bonus_override: sqlNullableInteger(
    row,
    'proficiency_bonus_override',
  ),
  alignment: sqlNullableString(row, 'alignment'),
  appearance: sqlNullableString(row, 'appearance'),
  backstory: sqlNullableString(row, 'backstory'),
  notes: sqlNullableString(row, 'notes'),
});

interface SheetClassJoinRow {
  readonly class_definition_id: number;
  readonly class_level: number;
  readonly is_starting_class: boolean;
  readonly class_name: string;
  /**
   * NULL when the class has no `class_sheet_traits` row — a homebrew or
   * imported class. The absence lives in the type so it cannot be filled in by
   * accident downstream; `hitPointMaximum` substitutes `ASSUMED_HIT_DIE` and
   * says so in a warning. See D24.
   *
   * `HitDieSize | null` AND NOT `number | null`, WHICH MAKES THE CODEC BELOW
   * THE PLACE THE SET IS RE-ESTABLISHED. The column carries `IN (6, 8, 10, 12)`
   * — and F11 is the finding that a contract which merely trusts a CHECK is not
   * a contract, because the CHECK is absent from any image created before it
   * and from any hand-edited one. So the value is TESTED here rather than
   * assumed here.
   */
  readonly hit_die: HitDieSize | null;
}

/**
 * The same sentence about the same subject, said once.
 *
 * The KEY IS THE WHOLE WARNING — code and message — because the code alone is
 * not a subject: `weapon_not_proficient` is one code and a character may have
 * three weapons it is true of, and collapsing those to one would hide two of
 * them. Two warnings whose message is byte-for-byte identical are the same
 * fact, and the only way to produce a pair of those is for two derivations to
 * have gone through one resolver.
 */
function distinctWarnings(
  warnings: readonly SheetWarning[],
): readonly SheetWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}\u0000${warning.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * AN INTEGER THAT IS NOT A HIT DIE IS READ AS NO HIT DIE, AND THE SHEET SAYS SO.
 *
 * The rule and its reasons live with the domain, on `hitDieOrAbsent` in
 * `src/rules/sheet.ts`, beside the `ASSUMED_HIT_DIE` substitution it feeds. It
 * is applied HERE because this is the boundary an untrusted integer crosses —
 * the same shape as `saving_throws` below, which has filtered unknown abilities
 * out at this codec since the sheet existed.
 */
const sheetClassRow: RowCodec<SheetClassJoinRow> = (row) => ({
  class_definition_id: sqlInteger(row, 'class_definition_id'),
  class_level: sqlInteger(row, 'class_level'),
  is_starting_class: sqlBoolean(row, 'is_starting_class'),
  class_name: sqlString(row, 'class_name'),
  hit_die: hitDieOrAbsent(sqlNullableInteger(row, 'hit_die')),
});

/**
 * The gap vocabulary, stated once.
 *
 * Most entries are true of every character. The D102 languages/tools entry is
 * the one conditional member: it is selected only when stored background or
 * species feature prose actually mentions such a grant. `SHEET_GAPS` remains
 * the complete vocabulary so F15 can bind every agent-facing enumeration to
 * these stable kinds; `sheetGaps` chooses which entries this character reads.
 */
export const SHEET_GAPS: readonly SheetGap[] = Object.freeze([
  {
    kind: 'no_class_feature_text',
    title: 'Class features are not printed',
    detail:
      'This application seeds no class feature text and no subclass feature ' +
      'text beyond two Warlock invocations, so the features section of a ' +
      'printed sheet is not reproduced here. What is missing is the prose; ' +
      'the numbers below do not depend on it.',
  },
  {
    kind: 'partial_subclass_catalog',
    title: 'Subclass coverage is partial',
    detail:
      'Fifteen subclasses are bundled: one SRD subclass for every core class, ' +
      'the legacy EK and AT, and the owner-authored ' +
      'Veteran. This is a curated catalog rather than exhaustive subclass ' +
      'coverage.',
  },
  {
    kind: 'languages_and_tools_not_modelled',
    title: 'Languages and tool proficiencies are not modelled',
    detail:
      'This application does not record language or tool proficiency choices ' +
      'as character facts and does not apply them mechanically. Read the ' +
      'printed background and species feature text above for the grants this ' +
      'character has.',
  },
  {
    // RENAMED AND REWRITTEN BY D27/D28, NOT DELETED. Half of what this gap said
    // is no longer true — a weapon now carries `simple | martial`, and the
    // Proficiencies section above says which classes grant what — but the OTHER
    // half is unchanged and is still the reason attack profiles print two
    // formulas: nothing records whether a weapon is melee or ranged.
    kind: 'weapon_reach_not_recorded',
    title: 'Whether a weapon is melee or ranged is not recorded',
    detail:
      'A weapon carries its simple/martial category, so the Proficiencies ' +
      'section can say whether a class of this character’s grants it. What is ' +
      'still not recorded is whether the weapon is MELEE or RANGED, and the ' +
      'attack formula branches on exactly that — so attack profiles show both ' +
      'formulas. Both agree with the Proficiencies section about the ' +
      'proficiency bonus: a weapon no class of this character grants does not ' +
      'get it, and the profile says why.',
  },
  // `background_skills_are_text` LIVED HERE AND IS DELETED, NOT REWORDED
  // (skills-with-provenance §3.5): it told a person to hand-tick background
  // skills through `set_skill_proficiency`, a command the surface now refuses,
  // and S-B made background skills real FILLED grants the modifiers count.
  // The disclosure existed only while the choice was untracked.
  {
    // D65, stated in the ruling's own terms so the sheet can say it too. TRUE
    // OF EVERY CHARACTER — no gear table exists under that ruling — which is
    // what qualifies it for this constant list; the recorded package and its
    // contents are per-character facts and print under "What is recorded".
    kind: 'gear_not_itemised',
    title: 'Gear is not itemised',
    detail:
      'Starting equipment is recorded as a package choice, and only its ' +
      'weapons and armour become tracked items. Other gear is shown from ' +
      'the rules tables and is not tracked individually: a used torch ' +
      'cannot be ticked off, a crowbar cannot be dropped, and nothing ' +
      'outside the package can be carried here. No gold is granted — ' +
      'equipment is the package only, with no gold alternative.',
  },
]);

const LANGUAGE_OR_TOOL_GAP_KIND =
  'languages_and_tools_not_modelled' as const;
const LANGUAGE_OR_TOOL_WORD = /\b(?:languages?|tools?)\b/iu;

/**
 * Select the D102 disclosure without turning its source prose into a fact.
 *
 * The text check is intentionally narrow and local. D102 forbids minting a
 * structured language/tool grant, while also requiring the gap only when the
 * character carries granting prose. This predicate decides disclosure
 * presence; it never awards a proficiency or changes a derived value.
 */
function mentionsLanguageOrTool(text: string | null): boolean {
  return text !== null && LANGUAGE_OR_TOOL_WORD.test(text);
}

export function sheetGaps(
  hasLanguageOrToolGrantText: boolean,
): readonly SheetGap[] {
  return hasLanguageOrToolGrantText
    ? SHEET_GAPS
    : SHEET_GAPS.filter(
        (gap) => gap.kind !== LANGUAGE_OR_TOOL_GAP_KIND,
      );
}

function expertiseGaps(
  db: DatabaseContext,
  characterId: number,
): readonly SheetGap[] {
  const grants = resolveSkillExpertiseGrants(db, characterId);
  const gaps: SheetGap[] = [];
  if (grants.some((grant) => grant.state === 'active' && grant.skill === null)) {
    gaps.push({
      kind: 'expertise_choice_unfilled',
      title: 'Expertise choice still needed',
      detail:
        'A sourced Expertise choice is still unfilled. The character remains ' +
        'saved, and no skill receives the extra proficiency bonus yet.',
    });
  }
  if (
    grants.some(
      (grant) =>
        grant.state === 'orphaned' &&
        grant.orphan_reason_code === 'underlying_proficiency_removed',
    )
  ) {
    gaps.push({
      kind: 'expertise_proficiency_removed',
      title: 'Expertise no longer has an underlying proficiency',
      detail:
        'A chosen Expertise skill lost its last active proficiency grant. ' +
        'The choice is retained, warned, and no longer doubles the bonus.',
    });
  }
  return gaps;
}

/**
 * Reads one stored enum column, SAYING SO when the stored value is not in the
 * vocabulary.
 *
 * The substitution is what `src/commands/sheet-inputs.ts` promises: a row whose
 * value its own CHECK forbids — only reachable from a database image predating
 * the constraint — must stay readable rather than making the character
 * unopenable, and "the sheet then states the degradation". This is that
 * statement. Without it a crossed `category` would recompute Armor Class as
 * Light armour, with full Dexterity, and print the wrong number as fact.
 *
 * The warning is APPENDED, never returned in place of the value, because a
 * degraded sheet is still a sheet the player needs to read.
 */
function enumOr<T extends string>(
  values: readonly T[],
  value: string,
  fallback: T,
  onFallback: (rejected: string, substituted: T) => void,
): T {
  if (isEnumValue(values, value)) {
    return value as T;
  }
  onFallback(value, fallback);
  return fallback;
}

export class CharacterSheetBuilder {
  readonly #content: SheetContentLookup;
  readonly #spells: CharacterSpellSectionBuilder;

  constructor(private readonly db: DatabaseContext) {
    this.#content = new SheetContentLookup(db);
    this.#spells = new CharacterSpellSectionBuilder(db);
  }

  /**
   * The narrow read used by the equip preview.
   *
   * It deliberately does not build classes, hit points, gaps, or any other
   * sheet section. A pending armour command must not become unwriteable because
   * an unrelated sheet section contains incomplete imported content.
   */
  armorClassValue(characterId: number): number {
    const character = this.#character(characterId);
    const scores = this.#scores(characterId, character);
    const armorRows = this.#armor(characterId).rows;
    const effects = readEligibleCharacterEffects(
      this.db,
      characterId,
      'display',
    );
    return resolveSheetArmorClass(scores, armorRows, effects).result.value;
  }

  build(characterId: number): CharacterSheet {
    const character = this.#character(characterId);
    const resolvedAbilities = resolveCharacterAbilities(
      this.db,
      characterId,
      character.base_abilities,
    );
    const scores = AbilityScores.fromArray(resolvedTotals(resolvedAbilities));
    const content = this.#content.forCharacter(characterId);
    const classes = this.#classes(characterId, content);
    const rolls = this.#rolls(characterId);
    const printedFeatures = this.#printedFeatures(characterId);
    const proficientSkills = this.#skillProficiencies(characterId);
    const expertiseSkills = new Set(
      activeExpertiseSkills(this.db, characterId),
    );
    const stored = this.#armor(characterId);
    const armorRows = stored.rows;

    const bonus = sheetProficiencyBonus(
      classes,
      character.proficiency_bonus_override,
    );
    const totalLevel = characterLevel(classes.map((entry) => entry.level));
    const resources = resolveSheetResources(content, {
      charisma: {
        status: 'present',
        modifier: scores.score('charisma').modifier(),
      },
      wisdom: {
        status: 'present',
        modifier: scores.score('wisdom').modifier(),
      },
    });
    const spells = this.#spells.build(characterId);

    const hitPoints = hitPointMaximum({ classes, scores, rolls: rolls.map });
    const eligibleEffectRows = readEligibleCharacterEffects(
      this.db,
      characterId,
      'display',
    );
    const acResolution = resolveSheetArmorClass(
      scores,
      armorRows,
      eligibleEffectRows,
    );
    const ac = acResolution.result;
    const saves = savingThrowProficiencies(classes);
    // D28's union, and its warnings. It reuses the SAME `startingClass` the
    // saving throws above go through — which is why the two can disagree about
    // what they GRANT while agreeing about which class came first. Saving throws
    // are the starting class ALONE; proficiency is the union in which the
    // starting class merely contributes more.
    const proficiencies = characterProficiencies({
      classes,
      weapons: this.#proficiencyWeapons(characterId),
      wornArmor: armorRows.map((row) => ({
        name: row.name,
        category: row.category,
      })),
    });

    // ONE READ OF ONE TABLE, WITH NO JOIN, which is what the effect model was
    // inverted for. This used to select six columns off
    // `character_species_traits` and hand the whole trait list — free text and
    // all — to a summary that ignored most of it. The sheet asks "what does
    // this character have"; that is now literally the query, and an effect from
    // a feat or a subclass would arrive here with no change at all.
    //
    // The effect contribution to Hit Points is a SEPARATE number by design
    // (`src/rules/species-effects.ts`), and this is the only caller in `src/`
    // that puts it beside `hitPointMaximum`. A sheet printing the maximum alone
    // shows a Dwarf's hit points short by their level, so the two are shown as
    // two numbers and the page adds them where a reader can see both.
    // Reads `character_effects` rather than the trait table: D22 inverted the
    // model so an effect belongs to the CHARACTER and names its source, which
    // is what lets one trait carry both a resistance and a cantrip.
    const effectRows = eligibleEffectRows.map(
      (effect): EffectRow => ({
        effect_kind: effect.effect_kind,
        damage_type: effect.damage_type,
        hit_points_flat: effect.hit_points_flat,
        hit_points_per_level: effect.hit_points_per_level,
        speed_bonus_feet: effect.speed_bonus_feet,
        label: effect.label,
      }),
    );
    const effects = summariseEffects(effectRows);
    const hasSpeciesHitPoints =
      effects.hitPointsFlat !== 0 || effects.hitPointsPerLevel !== 0;
    const speciesHp =
      totalLevel === null
        ? effects.hitPointsPerLevel === 0
          ? effects.hitPointsFlat
          : null
        : effectHitPoints(effectRows, totalLevel);
    const baseSpeed = this.db.one(
      `SELECT base_speed_feet FROM character_species WHERE character_id = ?`,
      [characterId],
      // Wrapped rather than returned bare, because `one` already uses `null`
      // for NO ROW and `base_speed_feet` is itself nullable. Collapsing the two
      // would make "this character has no species" indistinguishable from "the
      // species records no speed", and only the first should read as absent.
      (row) => ({ feet: sqlNullableInteger(row, 'base_speed_feet') }),
    );

    return {
      character_id: characterId,
      name: character.name,
      total_level: totalLevel,
      proficiency_bonus: {
        id: 'proficiency_bonus',
        label: 'Proficiency bonus',
        value: bonus,
        formula:
          totalLevel === null
            ? 'Undetermined because this character has no class levels.'
            : 'From TOTAL character level, not from the level in any one class ' +
              `(multiclassing.txt). Total level ${String(totalLevel)}.`,
      },
      ability_scores: abilities.map((ability) => ({
        id: `ability:${ability}`,
        label: ability,
        ability,
        score: scores.score(ability).value,
        value: scores.score(ability).modifier(),
        formula: `(score − 10) / 2, rounded down.`,
        base_score: resolvedAbilities[ability].base,
        increased_score: resolvedAbilities[ability].increased,
        override_terms: resolvedAbilities[ability].overrides.map(
          (override) => ({
            label: override.label,
            set_to: override.set_to,
            outcome: override.outcome,
          }),
        ),
      })),
      hit_points: {
        id: 'hit_points',
        label: 'Hit point maximum',
        value: hitPoints.maximum,
        formula:
          'The starting class contributes its full hit die at level 1; every ' +
          'other level adds the recorded roll, or the printed fixed value ' +
          '(die / 2 + 1) when nothing was rolled. The Constitution modifier ' +
          'is added per level. Species hit points are shown separately.',
      },
      species_hit_points:
        !hasSpeciesHitPoints
          ? null
          : {
              id: 'species_hit_points',
              label: 'Species hit points',
              value: speciesHp,
              formula:
                speciesHp === null
                  ? 'Undetermined because this species effect scales with a character level that is undetermined.'
                  : 'A species trait adds these on top of the class total. Shown ' +
                    'apart because the two come from different sources.',
            },
      armor_class: {
        id: 'armor_class',
        label: 'Armor Class',
        value: ac.value,
        formula:
          'Conditions are checked before eligible base formulas compete; ' +
          'shields and flat effects are then added to the winner.',
        winner: armorClassFormulaSummary(ac.winner),
        shields: armorRows
          .filter((row) => row.category === 'shield')
          .map((row) => ({ label: row.name, amount: row.armor_class })),
        bonuses: acResolution.bonuses.map((entry) => ({ ...entry })),
        excluded: ac.excluded.map((entry) => ({
          formula: armorClassFormulaSummary(entry.formula),
          reason: entry.reason,
        })),
        tie_break:
          ac.tie_break === null
            ? null
            : {
                winner: armorClassFormulaSummary(ac.tie_break.winner),
                losers: ac.tie_break.losers.map(armorClassFormulaSummary),
                rule: ac.tie_break.rule,
              },
      },
      initiative: {
        id: 'initiative',
        label: 'Initiative',
        value: initiative(scores),
        formula: 'The Dexterity modifier (sheet-math.txt).',
      },
      passive_perception: {
        id: 'passive_perception',
        label: 'Passive Perception',
        value: passivePerception({
          scores,
          proficiencyBonus: bonus,
          proficient: proficientSkills.has('perception'),
          expertise: expertiseSkills.has('perception'),
        }),
        formula: '10 + the Wisdom (Perception) check modifier.',
      },
      saves: abilities.map((ability): SheetSave => {
        const proficient = saves.abilities.has(ability);
        return {
          id: `save:${ability}`,
          label: `${ability} save`,
          ability,
          proficient,
          value: savingThrowModifier({
            ability,
            scores,
            proficiencyBonus: bonus,
            proficient,
          }),
          formula: proficient
            ? 'Ability modifier + proficiency bonus.'
            : 'Ability modifier only.',
        };
      }),
      skills: skills.map((skill): SheetSkill => {
        const proficient = proficientSkills.has(skill);
        const expertise = expertiseSkills.has(skill);
        const ability = abilityForSkill(skill);
        return {
          id: `skill:${skill}`,
          label: SKILL_LABELS[skill],
          skill,
          ability,
          proficient,
          expertise,
          value: skillModifier({
            skill,
            scores,
            proficiencyBonus: bonus,
            proficient,
            expertise,
          }),
          formula: expertise
            ? `${ability} modifier + twice the proficiency bonus.`
            : proficient
              ? `${ability} modifier + proficiency bonus.`
            : `${ability} modifier only.`,
        };
      }),
      attacks_per_action: attacksPerAction(content),
      resources,
      spells,
      martial_arts: martialArtsDice(content).map((die) => ({ ...die })),
      walking_speed_feet:
        baseSpeed === null
          ? null
          : walkingSpeedFeet(
              baseSpeed.feet,
              effectRows,
              ac.speed_penalty_feet,
            ),
      damage_resistances: effects.damageResistances,
      unchosen_damage_resistances: effects.unchosenDamageResistances,
      proficiencies: {
        armor_training: [...proficiencies.armor_training],
        weapon_proficiencies: proficiencies.weapon_proficiencies.map(
          (entry) => ({ ...entry }),
        ),
        classes: proficiencies.grants.map((grant) => ({
          class_name: grant.class_name,
          via: grant.via,
        })),
        weapons: proficiencies.weapons.map((entry) => ({ ...entry })),
      },
      classes: classes.map((entry): SheetClassLine => ({
        class_name: entry.class_name,
        level: entry.level,
        hit_die: entry.hit_die,
        is_starting_class: entry.is_starting_class,
        subclass_name:
          content.find((row) => row.class_name === entry.class_name)?.subclass
            ?.name ?? null,
        saving_throws: entry.saving_throws,
      })),
      armor: armorRows,
      items: this.#items(characterId),
      printed_features: printedFeatures.features,
      flavor: {
        alignment: character.alignment,
        appearance: character.appearance,
        backstory: character.backstory,
        notes: character.notes,
      },
      print_appendix_preferences: new PrintAppendixPreferenceQueries(
        this.db,
      ).read(characterId),
      hit_point_rolls: rolls.list,
      // Read through E-B's one recorded-package reader — the same source
      // resolution, choice reader and coin-line display filter the equipment
      // step uses — so the sheet's package line and the step cannot disagree
      // (D33, D65; plan §4).
      equipment_packages: recordedEquipmentPackages(this.db, characterId),
      // The warning sets are CONCATENATED and not merged with `gaps`: these
      // describe a degradation of THIS character's derivation (crossed armour
      // slots, an unmet Strength requirement, no or several starting classes, an
      // assumed hit die, a roll no such die could show, a stored value outside
      // its own vocabulary), and belong beside the number they changed.
      // THREE OF THE FIVE ARMS CARRY `startingClass`'S DEGRADATION WARNINGS,
      // because three of them go through it: `hitPointMaximum`,
      // `savingThrowProficiencies` and `classProficiencyGrants`. The filter here
      // used to compare `proficiencies` against `saves` ALONE, so a character
      // with no starting class flagged read "No class is marked as this
      // character's starting class" TWICE — once from hit points and once from
      // saves — which is the very thing the filter was written to prevent and a
      // review measured it still happening.
      //
      // Deduplicated across the WHOLE list rather than between two named arms,
      // on `code`+`message` and not on `code`: two weapons that are both not
      // proficient are two facts and print twice; the same sentence about the
      // same subject is one fact, and a page saying it twice reads as two
      // different problems. Order is preserved, so each survivor still sits
      // where the arm that produced it put it.
      warnings: distinctWarnings([
        ...stored.warnings,
        ...hitPoints.warnings,
        ...ac.warnings,
        ...saves.warnings,
        ...proficiencies.warnings,
      ]),
      gaps: [
        ...sheetGaps(printedFeatures.has_language_or_tool_grant_text),
        ...expertiseGaps(this.db, characterId),
      ],
    };
  }

  #character(characterId: number): SheetCharacterRow {
    const character = this.db.one(
      `SELECT id, name, strength, dexterity, constitution, intelligence,
              wisdom, charisma, proficiency_bonus_override,
              alignment, appearance, backstory, notes
       FROM characters WHERE id = ?`,
      [characterId],
      sheetCharacter,
    );
    if (character === null) {
      throw new CharacterNotFoundError(characterId);
    }
    return character;
  }

  #scores(
    characterId: number,
    character: SheetCharacterRow,
  ): AbilityScores {
    // THE RESOLVED TOTALS, NOT BASE — reader one of the four (plan §3.4, §6).
    // Every computed score consumer uses this one result.
    return AbilityScores.fromArray(
      resolvedTotals(
        resolveCharacterAbilities(
          this.db,
          characterId,
          character.base_abilities,
        ),
      ),
    );
  }

  #classes(
    characterId: number,
    content: readonly { readonly class_definition_id: number }[],
  ): readonly SheetClass[] {
    const rows = this.db.all(
      `SELECT level.class_definition_id AS class_definition_id,
              level.level AS class_level,
              level.is_starting_class AS is_starting_class,
              definition.name AS class_name,
              traits.hit_die AS hit_die
       FROM character_class_levels AS level
       JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       LEFT JOIN class_sheet_traits AS traits
         ON traits.class_definition_id = level.class_definition_id
       WHERE level.character_id = ?
       ORDER BY definition.name, level.id`,
      [characterId],
      sheetClassRow,
    );
    // ONE QUERY EACH RATHER THAN ONE PER CLASS. The saving-throw subquery below
    // is an N+1 already; three more of the same shape would make it 4xN on every
    // sheet read. Both of these are scoped to the character's own classes, so
    // they read the same rows the loop would have.
    //
    // AND THE READER LIVES OUTSIDE THIS CLASS NOW, because the weapons panel
    // asks the same question and a second copy of these two queries would be a
    // second answer. See `ClassProficiencyLookup`.
    const proficiencies = new ClassProficiencyLookup(this.db).sources(
      characterId,
    );
    return rows.map((row): SheetClass => {
      const classDefinitionId = row.class_definition_id;
      const contentRow = content.find(
        (entry) => entry.class_definition_id === classDefinitionId,
      ) as
        | { readonly extra_attack_grants?: never; readonly martial_arts_dice?: never }
        | undefined;
      return {
        class_name: row.class_name,
        level: row.class_level,
        is_starting_class: row.is_starting_class,
        // A CLASS WITH NO SHEET TRAITS ROW HAS NO HIT DIE, AND THAT ABSENCE IS
        // CARRIED RATHER THAN FILLED IN HERE. `class_sheet_traits` is seeded for
        // every printed class; a homebrew or imported class can arrive without
        // one. Substituting 8 at this construction site would make the guess
        // indistinguishable from a sourced die by the time anything read it —
        // the D21 lesson, that the reason belongs at the single place the number
        // is produced. `hitPointMaximum` substitutes `ASSUMED_HIT_DIE` and
        // returns an `assumed_hit_die` warning; the class line below prints
        // `null` and the page says the die is not recorded.
        hit_die: row.hit_die,
        // BOTH GRANTS TRAVEL, UNRESOLVED. Which one applies depends on whether
        // this class is the one the character STARTED in, and that is not a fact
        // about the class — `classProficiencyGrants` resolves it once, from
        // `startingClass`, for the whole character. A builder that resolved it
        // here would be the second resolver the brief forbids.
        proficiencies:
          proficiencies.get(classDefinitionId) ?? EMPTY_CLASS_PROFICIENCIES,
        saving_throws: this.db
          .all(
            `SELECT ability FROM class_saving_throw_proficiencies
             WHERE class_definition_id = ? ORDER BY ability`,
            [classDefinitionId],
            (entry) => sqlString(entry, 'ability'),
          )
          .filter((ability): ability is Ability =>
            isEnumValue(abilities, ability),
          ),
        ...(contentRow ?? {}),
      };
    });
  }

  /**
   * The character's weapons, reduced to the three columns a proficiency question
   * reads.
   *
   * NOT `WeaponQueries.characterWeapons`, and not because that reader is wrong:
   * it builds attack profiles and a whole panel, and a sheet asking "is this
   * character proficient" has no business paying for that. The narrow type is
   * also what stops this path guessing a category from a damage die.
   */
  #proficiencyWeapons(characterId: number): readonly ProficiencyWeapon[] {
    return this.db.all(
      `SELECT name, proficiency_category, finesse, light
       FROM character_weapons WHERE character_id = ? ORDER BY id`,
      [characterId],
      (row): ProficiencyWeapon => {
        const category = sqlNullableString(row, 'proficiency_category');
        return {
          name: sqlString(row, 'name'),
          // NOT STATED on anything unrecognised — never `simple`. D27's null is
          // the state the sheet knows how to say out loud.
          proficiency_category: isEnumValue(
            weaponProficiencyCategories,
            category,
          )
            ? (category as WeaponProficiencyCategory)
            : null,
          finesse: sqlBoolean(row, 'finesse'),
          light: sqlBoolean(row, 'light'),
        };
      },
    );
  }

  #rolls(characterId: number): {
    readonly map: HitPointRolls;
    readonly list: readonly SheetHitPointRoll[];
  } {
    const owned = new Set(
      this.db.all(
        `SELECT definition.name AS class_name
         FROM character_class_levels AS level
         JOIN class_definitions AS definition
           ON definition.id = level.class_definition_id
         WHERE level.character_id = ?`,
        [characterId],
        (row) => sqlString(row, 'class_name'),
      ),
    );
    const rows = this.db.all(
      `SELECT class_name, class_level, rolled_value
       FROM character_hit_point_rolls
       WHERE character_id = ?
       ORDER BY class_name, class_level`,
      [characterId],
      (row) => ({
        class_name: sqlString(row, 'class_name'),
        class_level: sqlInteger(row, 'class_level'),
        rolled_value: sqlInteger(row, 'rolled_value'),
      }),
    );
    const map = new Map<string, Map<number, number>>();
    const list: SheetHitPointRoll[] = [];
    for (const row of rows) {
      const className = row.class_name;
      const level = row.class_level;
      const value = row.rolled_value;
      let perClass = map.get(className);
      if (perClass === undefined) {
        perClass = new Map<number, number>();
        map.set(className, perClass);
      }
      perClass.set(level, value);
      list.push({
        class_name: className,
        class_level: level,
        rolled_value: value,
        applies: owned.has(className),
      });
    }
    return { map, list };
  }

  /**
   * THE SHEET READS GRANTS, NEVER THE PROJECTION (skills plan §3.2, S-A).
   *
   * `character_skill_proficiencies` still exists — as a derived transport
   * projection with one deriving writer — but a stale projection must be
   * invisible here for the grants table to be the source of truth in fact.
   * Only ACTIVE grants count: a removed class's orphaned grants keep their
   * remembered selection without keeping the proficiency (§3.8).
   */
  #skillProficiencies(characterId: number): ReadonlySet<Skill> {
    return new Set(activeGrantedSkills(this.db, characterId));
  }

  #armor(characterId: number): {
    readonly rows: readonly SheetArmorRow[];
    readonly warnings: readonly SheetWarning[];
  } {
    const warnings: SheetWarning[] = [];
    const rows = this.db.all(
      `SELECT * FROM character_armor WHERE character_id = ? ORDER BY slot`,
      [characterId],
      // The decoder was already written — it was just standing one method call
      // to the right, as `.map`. In the codec slot it runs on the same rows and
      // the same closure still collects `warnings`, but the raw row now has no
      // name outside it.
      (row): SheetArmorRow => {
        const name = sqlString(row, 'name');
        const note = (column: string) =>
          (rejected: string, substituted: string) => {
            warnings.push({
              code: 'armor_value_out_of_vocabulary',
              message:
                `The stored ${column} of “${name}” is “${rejected}”, which is not a ` +
                `value this application knows. It has been read as “${substituted}”, ` +
                'so any number below that depends on it is an approximation.',
            });
          };
        return {
          slot: enumOr(armorSlots, sqlString(row, 'slot'), 'worn', note('slot')),
          name,
          category: enumOr(
            armorCategories,
            sqlString(row, 'category'),
            'light',
            note('armour category'),
          ),
          armor_class: sqlInteger(row, 'armor_class'),
          dex_bonus: enumOr(
            armorDexBonuses,
            sqlString(row, 'dex_bonus'),
            'none',
            note('Dexterity bonus rule'),
          ),
          dex_bonus_max: sqlNullableInteger(row, 'dex_bonus_max'),
          strength_requirement: sqlNullableInteger(row, 'strength_requirement'),
          stealth_disadvantage: sqlBoolean(row, 'stealth_disadvantage'),
          notes: sqlNullableString(row, 'notes'),
        };
      },
    );
    return { rows, warnings };
  }

  #items(characterId: number): readonly SheetItemRow[] {
    return this.db.all(
      `SELECT item.name, item.description, item.requires_attunement,
              CASE
                WHEN item.id IN (
                  slots.slot_1_item_id,
                  slots.slot_2_item_id,
                  slots.slot_3_item_id
                ) THEN 1
                ELSE 0
              END AS attuned
       FROM character_items AS item
       LEFT JOIN character_attunement_slots AS slots
         ON slots.character_id = item.character_id
       WHERE item.character_id = ?
       ORDER BY item.name, item.id`,
      [characterId],
      (row): SheetItemRow => ({
        name: sqlString(row, 'name'),
        description: sqlNullableString(row, 'description'),
        requires_attunement: sqlBoolean(row, 'requires_attunement'),
        attuned: sqlBoolean(row, 'attuned'),
      }),
    );
  }

  #printedFeatures(characterId: number): {
    readonly features: readonly SheetPrintedFeature[];
    readonly has_language_or_tool_grant_text: boolean;
  } {
    const features: SheetPrintedFeature[] = [];
    let hasLanguageOrToolGrantText = false;
    const background = this.db.one(
      `SELECT name, tool_proficiency, notes
       FROM character_background
       WHERE character_id = ?`,
      [characterId],
      (row) => ({
        name: sqlString(row, 'name'),
        tool_proficiency: sqlNullableString(row, 'tool_proficiency'),
        notes: sqlNullableString(row, 'notes'),
      }),
    );
    if (background !== null) {
      if (
        background.tool_proficiency !== null &&
        background.tool_proficiency.trim() !== ''
      ) {
        features.push({
          source: 'background',
          source_name: background.name,
          name: 'Tool Proficiency',
          text: background.tool_proficiency,
        });
        hasLanguageOrToolGrantText = true;
      }
      if (background.notes !== null && background.notes.trim() !== '') {
        features.push({
          source: 'background',
          source_name: background.name,
          name: 'Background notes',
          text: background.notes,
        });
        hasLanguageOrToolGrantText ||= mentionsLanguageOrTool(
          background.notes,
        );
      }
    }

    const speciesTraits = this.db.all(
      `SELECT species.name AS species_name,
              trait.name AS trait_name,
              trait.description AS trait_description
       FROM character_species_traits AS trait
       LEFT JOIN character_species AS species
         ON species.character_id = trait.character_id
       WHERE trait.character_id = ?
       ORDER BY trait.sort_order, trait.id`,
      [characterId],
      (row) => ({
        species_name: sqlNullableString(row, 'species_name'),
        trait_name: sqlString(row, 'trait_name'),
        trait_description: sqlNullableString(row, 'trait_description'),
      }),
    );
    for (const trait of speciesTraits) {
      features.push({
        source: 'species_trait',
        source_name: trait.species_name,
        name: trait.trait_name,
        text: trait.trait_description,
      });
      hasLanguageOrToolGrantText ||=
        mentionsLanguageOrTool(trait.trait_name) ||
        mentionsLanguageOrTool(trait.trait_description);
    }

    return {
      features,
      has_language_or_tool_grant_text: hasLanguageOrToolGrantText,
    };
  }
}

function sheetArmor(row: SheetArmorRow): SheetArmor {
  return {
    name: row.name,
    category: row.category,
    armor_class: row.armor_class,
    dex_bonus: row.dex_bonus,
    dex_bonus_max: row.dex_bonus_max,
    strength_requirement: row.strength_requirement,
    stealth_disadvantage: row.stealth_disadvantage,
  };
}

function armorClassFormulas(
  effects: readonly EligibleCharacterEffect[],
): ArmorClassFormulaCandidate[] {
  return effects
    .filter((effect) => effect.effect_kind === 'armor_class_formula')
    .map((effect): ArmorClassFormulaCandidate => {
      if (
        effect.base === null ||
        effect.ability_1 === null ||
        effect.allows_shield === null
      ) {
        throw new Error(
          `Armor Class formula effect ${String(effect.id)} has an incomplete payload.`,
        );
      }
      return {
        kind: 'ability_formula',
        label: effect.label,
        source: armorClassSource(effect),
        base: effect.base,
        ability_1: effect.ability_1,
        ability_2: effect.ability_2,
        allows_shield: effect.allows_shield,
      };
    });
}

function armorClassBonuses(
  effects: readonly EligibleCharacterEffect[],
): ArmorClassBonusCandidate[] {
  return effects
    .filter((effect) => effect.effect_kind === 'armor_class_bonus')
    .map((effect): ArmorClassBonusCandidate => {
      if (effect.amount === null) {
        throw new Error(
          `Armor Class bonus effect ${String(effect.id)} has no amount.`,
        );
      }
      return { label: effect.label, amount: effect.amount };
    });
}

function resolveSheetArmorClass(
  scores: AbilityScores,
  armorRows: readonly SheetArmorRow[],
  effects: readonly EligibleCharacterEffect[],
): {
  readonly result: ArmorClassResult;
  readonly bonuses: readonly ArmorClassBonusCandidate[];
} {
  const bonuses = armorClassBonuses(effects);
  return {
    result: armorClass({
      equipment: armorRows.map(
        (row): EquippedArmor => ({
          slot: row.slot,
          armor: sheetArmor(row),
        }),
      ),
      formulas: armorClassFormulas(effects),
      bonuses,
      scores,
    }),
    bonuses,
  };
}

function armorClassSource(
  effect: EligibleCharacterEffect,
): Exclude<ArmorClassSourceCategory, 'worn_armor'> {
  if (effect.character_item_id !== null) {
    return 'item';
  }
  if (effect.character_weapon_id !== null) {
    return 'weapon';
  }
  return effect.source_type ?? 'manual';
}

function armorClassFormulaSummary(
  resolved: ResolvedArmorClassFormula,
): SheetArmorClassFormula;
function armorClassFormulaSummary(
  formula: ArmorClassFormulaCandidate,
): SheetArmorClassFormula;
function armorClassFormulaSummary(
  value: ResolvedArmorClassFormula | ArmorClassFormulaCandidate,
): SheetArmorClassFormula {
  const formula = 'formula' in value ? value.formula : value;
  return {
    label: formula.label,
    source: formula.source,
    expression: armorClassExpression(formula),
    total: 'total' in value ? value.total : null,
  };
}

function armorClassExpression(formula: ArmorClassFormula): string {
  if (formula.kind === 'ability_formula') {
    return [
      String(formula.base),
      abilityAbbreviation(formula.ability_1),
      ...(formula.ability_2 === null
        ? []
        : [abilityAbbreviation(formula.ability_2)]),
    ].join(' + ');
  }
  switch (formula.armor.dex_bonus) {
    case 'full':
      return `${String(formula.armor.armor_class)} + DEX`;
    case 'capped':
      return (
        `${String(formula.armor.armor_class)} + DEX ` +
        `(maximum ${String(formula.armor.dex_bonus_max ?? 0)})`
      );
    case 'none':
      return String(formula.armor.armor_class);
  }
}

function abilityAbbreviation(ability: Ability): string {
  switch (ability) {
    case 'strength':
      return 'STR';
    case 'dexterity':
      return 'DEX';
    case 'constitution':
      return 'CON';
    case 'intelligence':
      return 'INT';
    case 'wisdom':
      return 'WIS';
    case 'charisma':
      return 'CHA';
  }
}
