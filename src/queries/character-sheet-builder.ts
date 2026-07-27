import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  Ability,
  ArmorCategory,
  ArmorDexBonus,
  ArmorSlot,
  Skill,
} from '../domain/enums';
import {
  abilities,
  armorCategories,
  armorDexBonuses,
  armorSlots,
  isEnumValue,
  skills,
} from '../domain/enums';
import { AbilityScores } from '../rules/ability-scores';
import { SheetContentLookup } from '../rules/sheet-content-lookup';
import { SKILL_LABELS, abilityForSkill } from '../rules/skills';
import {
  armorClass,
  attacksPerAction,
  hitPointMaximum,
  initiative,
  martialArtsDice,
  passivePerception,
  savingThrowModifier,
  savingThrowProficiencies,
  sheetProficiencyBonus,
  skillModifier,
  totalCharacterLevel,
  type HitPointRolls,
  type SheetArmor,
  type SheetClass,
  type SheetWarning,
} from '../rules/sheet';
import {
  effectHitPoints,
  summariseEffects,
  walkingSpeedFeet,
  type EffectRow,
} from '../rules/species-effects';
import type { AttacksPerAction } from '../rules/extra-attack';
import { CharacterNotFoundError } from './character-crud';

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
 * forbids rendering a blank box that reads as "none", and this application has
 * no class feature text at all, subclass content for two classes of twelve, and
 * no way to know whether a character is proficient with a weapon. Each of those
 * is named here so the page can print the sentence rather than the silence.
 */

export interface SheetNumber {
  /** A stable machine key. Never localised, never reordered. */
  readonly id: string;
  readonly label: string;
  readonly value: number;
  /** How the number was reached, in the source's own terms. */
  readonly formula: string;
}

export interface SheetSkill extends SheetNumber {
  readonly skill: Skill;
  readonly ability: Ability;
  readonly proficient: boolean;
}

export interface SheetSave extends SheetNumber {
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
  readonly hit_die: number | null;
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
export interface SheetGap {
  readonly kind:
    | 'no_class_feature_text'
    | 'partial_subclass_catalog'
    | 'no_unarmored_defense'
    | 'no_expertise'
    | 'no_weapon_proficiency'
    | 'background_skills_are_text';
  readonly title: string;
  readonly detail: string;
}

export interface CharacterSheet {
  readonly character_id: number;
  readonly name: string;
  readonly total_level: number;
  readonly proficiency_bonus: SheetNumber;
  readonly ability_scores: readonly (SheetNumber & {
    readonly ability: Ability;
    readonly score: number;
  })[];
  readonly hit_points: SheetNumber;
  /** The species contribution, separately, and `null` when there is none. */
  readonly species_hit_points: SheetNumber | null;
  readonly armor_class: SheetNumber;
  readonly initiative: SheetNumber;
  readonly passive_perception: SheetNumber;
  readonly saves: readonly SheetSave[];
  readonly skills: readonly SheetSkill[];
  readonly attacks_per_action: AttacksPerAction;
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
  readonly armor: readonly SheetArmorRow[];
  readonly hit_point_rolls: readonly SheetHitPointRoll[];
  readonly armor_class_adjustment: number;
  readonly armor_class_adjustment_note: string | null;
  /** Degradations of a specific derivation, from `src/rules/sheet.ts`. */
  readonly warnings: readonly SheetWarning[];
  readonly gaps: readonly SheetGap[];
}

type Row = SqlRow;

/**
 * The gaps, stated once.
 *
 * EVERY ONE IS TRUE OF EVERY CHARACTER, which is why they are a constant rather
 * than a query: none depends on what this character has done. The two that
 * depend on the CATALOG — feature text and subclass coverage — are stated
 * unconditionally because both are absent for every character in every install
 * that has not imported extra content, and a check that happened to pass on a
 * Fighter would hide the fact that it fails on the other ten classes.
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
      'Two subclasses are bundled — Eldritch Knight and Arcane Trickster. A ' +
      'character of any other class has no subclass to choose here, so this ' +
      'sheet shows none rather than showing an empty list that reads as ' +
      '"no subclass taken".',
  },
  {
    kind: 'no_unarmored_defense',
    title: 'Unarmored Defense is not calculated',
    detail:
      'Barbarian and Monk Unarmored Defense replace the Armor Class formula, ' +
      'and neither feature text is among this application’s sources. Use ' +
      'the manual Armor Class adjustment and write down why; the sheet prints ' +
      'the note beside the number.',
  },
  {
    kind: 'no_expertise',
    title: 'Expertise is not applied',
    detail:
      'Rogue and Bard Expertise doubles the proficiency bonus on chosen ' +
      'skills. That feature text is not among this application’s ' +
      'sources, so every skill below adds the plain bonus once.',
  },
  {
    kind: 'no_weapon_proficiency',
    title: 'Weapon proficiency is not recorded',
    detail:
      'This application does not record which weapons a character is ' +
      'proficient with, nor whether a weapon is melee or ranged. Attack ' +
      'profiles therefore show both formulas and state that the proficiency ' +
      'bonus is included.',
  },
  {
    kind: 'background_skills_are_text',
    title: 'Background skill proficiencies are text, not mechanics',
    detail:
      'A background prints two skill proficiencies as words, and this ' +
      'application stores them as words. They are NOT counted in the skill ' +
      'modifiers below — tick the skill itself to count it.',
  },
]);

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

  constructor(private readonly db: DatabaseContext) {
    this.#content = new SheetContentLookup(db);
  }

  build(characterId: number): CharacterSheet {
    const character = this.db.one<Row>(
      `SELECT id, name, strength, dexterity, constitution, intelligence,
              wisdom, charisma, proficiency_bonus_override
       FROM characters WHERE id = ?`,
      [characterId],
    );
    if (character === null) {
      throw new CharacterNotFoundError(characterId);
    }
    const scores = AbilityScores.fromArray(character);
    const content = this.#content.forCharacter(characterId);
    const classes = this.#classes(characterId, content);
    const rolls = this.#rolls(characterId);
    const proficientSkills = this.#skillProficiencies(characterId);
    const stored = this.#armor(characterId);
    const armorRows = stored.rows;
    const adjustment = this.#adjustment(characterId);

    const bonus = sheetProficiencyBonus(
      classes,
      sqlNullableInteger(character, 'proficiency_bonus_override'),
    );
    const totalLevel = totalCharacterLevel(classes);

    const hitPoints = hitPointMaximum({ classes, scores, rolls: rolls.map });
    const worn = armorRows.find((row) => row.slot === 'worn') ?? null;
    const shield = armorRows.find((row) => row.slot === 'shield') ?? null;
    const ac = armorClass({
      armor: worn === null ? null : sheetArmor(worn),
      shield: shield === null ? null : sheetArmor(shield),
      scores,
      adjustment: adjustment.value,
    });
    const saves = savingThrowProficiencies(classes);

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
    const effectRows = this.db.all<Row>(
      `SELECT effect_kind, damage_type, hit_points_flat, hit_points_per_level,
              speed_bonus_feet, label
       FROM character_effects
       WHERE character_id = ?
       ORDER BY sort_order, id`,
      [characterId],
    ).map((row): EffectRow => ({
      effect_kind: sqlString(row, 'effect_kind'),
      damage_type: sqlNullableString(row, 'damage_type'),
      hit_points_flat: sqlNullableInteger(row, 'hit_points_flat'),
      hit_points_per_level: sqlNullableInteger(row, 'hit_points_per_level'),
      speed_bonus_feet: sqlNullableInteger(row, 'speed_bonus_feet'),
      label: sqlString(row, 'label'),
    }));
    const effects = summariseEffects(effectRows);
    const speciesHp = effectHitPoints(effectRows, totalLevel);
    const baseSpeed = this.db.one<Row>(
      `SELECT base_speed_feet FROM character_species WHERE character_id = ?`,
      [characterId],
    );

    return {
      character_id: characterId,
      name: sqlString(character, 'name'),
      total_level: totalLevel,
      proficiency_bonus: {
        id: 'proficiency_bonus',
        label: 'Proficiency bonus',
        value: bonus,
        formula:
          'From TOTAL character level, not from the level in any one class ' +
          `(multiclassing.txt). Total level ${String(totalLevel)}.`,
      },
      ability_scores: abilities.map((ability) => ({
        id: `ability:${ability}`,
        label: ability,
        ability,
        score: scores.score(ability).value,
        value: scores.score(ability).modifier(),
        formula: `(score − 10) / 2, rounded down.`,
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
        speciesHp === 0
          ? null
          : {
              id: 'species_hit_points',
              label: 'Species hit points',
              value: speciesHp,
              formula:
                'A species trait adds these on top of the class total. Shown ' +
                'apart because the two come from different sources.',
            },
      armor_class: {
        id: 'armor_class',
        label: 'Armor Class',
        value: ac.value,
        formula: armorClassFormula(worn, shield, adjustment.value),
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
        const ability = abilityForSkill(skill);
        return {
          id: `skill:${skill}`,
          label: SKILL_LABELS[skill],
          skill,
          ability,
          proficient,
          value: skillModifier({
            skill,
            scores,
            proficiencyBonus: bonus,
            proficient,
          }),
          formula: proficient
            ? `${ability} modifier + proficiency bonus.`
            : `${ability} modifier only.`,
        };
      }),
      attacks_per_action: attacksPerAction(content),
      martial_arts: martialArtsDice(content).map((die) => ({ ...die })),
      walking_speed_feet:
        baseSpeed === null
          ? null
          : walkingSpeedFeet(
              sqlNullableInteger(baseSpeed, 'base_speed_feet'),
              effectRows,
            ),
      damage_resistances: effects.damageResistances,
      unchosen_damage_resistances: effects.unchosenDamageResistances,
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
      hit_point_rolls: rolls.list,
      armor_class_adjustment: adjustment.value,
      armor_class_adjustment_note: adjustment.note,
      // The warning sets are CONCATENATED and not merged with `gaps`: these
      // describe a degradation of THIS character's derivation (crossed armour
      // slots, an unmet Strength requirement, no or several starting classes, an
      // assumed hit die, a roll no such die could show, a stored value outside
      // its own vocabulary), and belong beside the number they changed.
      warnings: [
        ...stored.warnings,
        ...hitPoints.warnings,
        ...ac.warnings,
        ...saves.warnings,
      ],
      gaps: SHEET_GAPS,
    };
  }

  #classes(
    characterId: number,
    content: readonly { readonly class_definition_id: number }[],
  ): readonly SheetClass[] {
    const rows = this.db.all<Row>(
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
    );
    return rows.map((row): SheetClass => {
      const classDefinitionId = sqlInteger(row, 'class_definition_id');
      const contentRow = content.find(
        (entry) => entry.class_definition_id === classDefinitionId,
      ) as
        | { readonly extra_attack_grants?: never; readonly martial_arts_dice?: never }
        | undefined;
      return {
        class_name: sqlString(row, 'class_name'),
        level: sqlInteger(row, 'class_level'),
        is_starting_class: sqlBoolean(row, 'is_starting_class'),
        // A CLASS WITH NO SHEET TRAITS ROW HAS NO HIT DIE, AND THAT ABSENCE IS
        // CARRIED RATHER THAN FILLED IN HERE. `class_sheet_traits` is seeded for
        // every printed class; a homebrew or imported class can arrive without
        // one. Substituting 8 at this construction site would make the guess
        // indistinguishable from a sourced die by the time anything read it —
        // the D21 lesson, that the reason belongs at the single place the number
        // is produced. `hitPointMaximum` substitutes `ASSUMED_HIT_DIE` and
        // returns an `assumed_hit_die` warning; the class line below prints
        // `null` and the page says the die is not recorded.
        hit_die: sqlNullableInteger(row, 'hit_die'),
        saving_throws: this.db
          .all<Row>(
            `SELECT ability FROM class_saving_throw_proficiencies
             WHERE class_definition_id = ? ORDER BY ability`,
            [classDefinitionId],
          )
          .map((entry) => sqlString(entry, 'ability'))
          .filter((ability): ability is Ability =>
            isEnumValue(abilities, ability),
          ),
        ...(contentRow ?? {}),
      };
    });
  }

  #rolls(characterId: number): {
    readonly map: HitPointRolls;
    readonly list: readonly SheetHitPointRoll[];
  } {
    const owned = new Set(
      this.db
        .all<Row>(
          `SELECT definition.name AS class_name
           FROM character_class_levels AS level
           JOIN class_definitions AS definition
             ON definition.id = level.class_definition_id
           WHERE level.character_id = ?`,
          [characterId],
        )
        .map((row) => sqlString(row, 'class_name')),
    );
    const rows = this.db.all<Row>(
      `SELECT class_name, class_level, rolled_value
       FROM character_hit_point_rolls
       WHERE character_id = ?
       ORDER BY class_name, class_level`,
      [characterId],
    );
    const map = new Map<string, Map<number, number>>();
    const list: SheetHitPointRoll[] = [];
    for (const row of rows) {
      const className = sqlString(row, 'class_name');
      const level = sqlInteger(row, 'class_level');
      const value = sqlInteger(row, 'rolled_value');
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

  #skillProficiencies(characterId: number): ReadonlySet<Skill> {
    return new Set(
      this.db
        .all<Row>(
          `SELECT skill FROM character_skill_proficiencies
           WHERE character_id = ? ORDER BY skill`,
          [characterId],
        )
        .map((row) => sqlString(row, 'skill'))
        .filter((skill): skill is Skill => isEnumValue(skills, skill)),
    );
  }

  #armor(characterId: number): {
    readonly rows: readonly SheetArmorRow[];
    readonly warnings: readonly SheetWarning[];
  } {
    const warnings: SheetWarning[] = [];
    const rows = this.db
      .all<Row>(
        `SELECT * FROM character_armor WHERE character_id = ? ORDER BY slot`,
        [characterId],
      )
      .map((row): SheetArmorRow => {
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
      });
    return { rows, warnings };
  }

  #adjustment(characterId: number): {
    readonly value: number;
    readonly note: string | null;
  } {
    const row = this.db.one<Row>(
      `SELECT armor_class_adjustment, armor_class_adjustment_note
       FROM character_sheet_adjustments WHERE character_id = ?`,
      [characterId],
    );
    // NO ROW MEANS ZERO, which is the same thing a stored 0 with no note would
    // mean — and the write command deletes the row in that case precisely so
    // there is only one representation to read.
    return row === null
      ? { value: 0, note: null }
      : {
          value: sqlInteger(row, 'armor_class_adjustment'),
          note: sqlNullableString(row, 'armor_class_adjustment_note'),
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

function armorClassFormula(
  worn: SheetArmorRow | null,
  shield: SheetArmorRow | null,
  adjustment: number,
): string {
  const parts: string[] = [];
  parts.push(
    worn === null
      ? 'Unarmoured: 10 + Dexterity modifier.'
      : `${worn.name}: base ${String(worn.armor_class)}, ${dexTermText(worn)}.`,
  );
  if (shield !== null) {
    parts.push(`${shield.name}: +${String(shield.armor_class)}.`);
  }
  if (adjustment !== 0) {
    parts.push(
      `Manual adjustment: ${adjustment > 0 ? '+' : ''}${String(adjustment)}.`,
    );
  }
  return parts.join(' ');
}

function dexTermText(armor: SheetArmorRow): string {
  switch (armor.dex_bonus) {
    case 'full':
      return 'plus the Dexterity modifier';
    case 'capped':
      return `plus the Dexterity modifier capped at ${String(
        armor.dex_bonus_max ?? 0,
      )}`;
    case 'none':
      return 'with no Dexterity term';
  }
}
