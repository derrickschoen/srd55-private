/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE PER-CLASS SHEET CONTENT IS PARSED, NOT TRANSCRIBED — the same arrangement
 * `src/rules/weapons-srd.ts` established, for the same reason: a parse is
 * diffable against the extract, and a value that is not in the extract cannot
 * reach the database.
 *
 * THE COLUMN PROBLEM, MEASURED. `docs/srd/source/class-core-traits.txt` carries
 * a note saying to read the LEFT column. THAT NOTE IS WRONG FOR FIVE OF THE
 * TWELVE CLASSES. Measuring the column at which `Hit Point Die` begins in each
 * class's block:
 *
 *     Barbarian  6    Bard   7    Cleric  9    Druid   7
 *     Fighter    6    Monk  64    Paladin 6    Ranger 63
 *     Rogue     63    Sorcerer 67 Warlock 64   Wizard  6
 *
 * Monk, Ranger, Rogue, Sorcerer and Warlock have their Core Traits table in the
 * RIGHT column with the bleed on the left. Three further hazards follow from
 * the same layout and each breaks a different naive parser:
 *
 *  - `Hit Point Die` occurs SEVENTEEN times for twelve classes. Barbarian,
 *    Cleric, Druid and Fighter each carry a second one, bleeding in from the
 *    facing column's "As a Multiclass Character" bullet. A line-oriented parse
 *    reads a bullet as a table row.
 *  - The Warlock's left column is the SORCERER's Draconic Spells table — levels
 *    and spell names. Any "scan from the left" or "the line has digits"
 *    heuristic ingests it as Warlock content.
 *  - `Tool Proficiencies` exists for four classes only and sits BETWEEN Weapon
 *    Proficiencies and Armor Training, so any positional "N lines after" parse
 *    breaks on exactly those four.
 *
 * THE ANSWER IS COLUMN-AWARE EXTRACTION. Each block is located by its
 * `Core <Class> Traits` heading; that heading's own start column is the table's
 * left edge, and only text at or right of that edge is read. This is correct for
 * BOTH placements without needing to know which one applies, and it kills the
 * bleed, the duplicate labels and the neighbouring table at once. Fields are
 * then keyed by LABEL rather than by offset, so the optional Tool Proficiencies
 * row cannot shift anything.
 *
 * FAILS LOUDLY. A missing field, an unknown skill, an unknown ability, a die
 * outside the four printed sizes, or a class count other than twelve all throw.
 * Skipping the unrecognised would turn an extraction change into a silently
 * short catalog.
 */
import coreTraitsExtract from '../../docs/srd/source/class-core-traits.txt?raw';
import attackFeaturesExtract from '../../docs/srd/source/attack-class-features.txt?raw';
import {
  skills,
  weaponProficiencyCategories,
  type Ability,
  type ArmorCategory,
  type Skill,
  type WeaponProficiencyCategory,
} from '../domain/enums';

export class SrdClassTraitsError extends Error {
  constructor(message: string) {
    super(`SRD class traits: ${message}`);
    this.name = 'SrdClassTraitsError';
  }
}

/** The twelve classes the extract prints, in the order it prints them. */
export const SRD_CLASS_NAMES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
] as const;

export interface SrdWeaponProficiency {
  readonly category: WeaponProficiencyCategory;
  /** `Light`-style qualification, verbatim; null where the source prints none. */
  readonly property_qualifier: string | null;
}

export interface SrdClassTraits {
  readonly class_name: string;
  readonly hit_die: number;
  readonly saving_throws: readonly Ability[];
  readonly skill_choice_count: number;
  readonly skill_choice_from_any: boolean;
  readonly skill_options: readonly Skill[];
  readonly armor_training: readonly ArmorCategory[];
  readonly weapon_proficiencies: readonly SrdWeaponProficiency[];
}

const SECTION = /^=== Core (?<className>[A-Za-z]+) Traits ===$/;

/**
 * The labels that begin a field, in the source's own wording. `Saving Throw`
 * and not `Saving Throws`: the label wraps as `Saving Throw` / `Proficiencies`
 * across two lines in every one of the twelve tables.
 */
const FIELD_LABELS = [
  'Primary Ability',
  'Hit Point Die',
  'Saving Throw',
  'Skill Proficiencies',
  'Weapon Proficiencies',
  'Tool Proficiencies',
  'Armor Training',
  'Starting Equipment',
] as const;
type FieldLabel = (typeof FIELD_LABELS)[number];

/** Labels whose absence from a block is a parse failure rather than a variant. */
const REQUIRED_FIELDS: readonly FieldLabel[] = [
  'Hit Point Die',
  'Saving Throw',
  'Skill Proficiencies',
  'Weapon Proficiencies',
  'Armor Training',
];

const ABILITY_WORDS: Readonly<Record<string, Ability>> = {
  Strength: 'strength',
  Dexterity: 'dexterity',
  Constitution: 'constitution',
  Intelligence: 'intelligence',
  Wisdom: 'wisdom',
  Charisma: 'charisma',
};

/**
 * Display spelling to enum member. Built from `skills` so the two cannot drift:
 * `sleight_of_hand` becomes `Sleight Of Hand`, which is then matched
 * case-insensitively against the source's `Sleight of Hand`.
 */
const SKILL_BY_DISPLAY: ReadonlyMap<string, Skill> = new Map(
  skills.map((skill) => [skill.replace(/_/g, ' '), skill] as const),
);

/**
 * Normalises the five non-ASCII code points the extract uses.
 *
 * Measured, not guessed: `class-core-traits.txt` contains exactly U+2019, U+201C,
 * U+201D, U+2022 and U+2026. A right single quote appears inside class names in
 * prose (`Barbarian’s`), so leaving it would make a label comparison fail on a
 * character nobody can see in a diff.
 */
function normalise(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '*')
    .replace(/…/g, '...');
}

/**
 * The lines of one `=== Core X Traits ===` block, and nothing from its
 * neighbours.
 */
function blocks(extract: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const raw of normalise(extract).split('\n')) {
    const section = SECTION.exec(raw.trim())?.groups;
    if (section !== undefined) {
      current = [];
      found.set(section.className as string, current);
      continue;
    }
    current?.push(raw);
  }
  return found;
}

/**
 * The column at which this class's Core Traits TABLE begins.
 *
 * Taken from the `Core <Class> Traits` heading line inside the block, which is
 * the table's own title and therefore sits at the table's left edge whichever
 * column the table landed in. This single measurement is what makes the parse
 * immune to the left/right placement, and it is why the file's own "read the
 * left column" note can be ignored rather than obeyed.
 */
function tableColumn(className: string, lines: readonly string[]): number {
  const heading = `Core ${className} Traits`;
  for (const line of lines) {
    const at = line.indexOf(heading);
    if (at !== -1) {
      return at;
    }
  }
  throw new SrdClassTraitsError(
    `${className} block has no "${heading}" title line to take a column from.`,
  );
}

/**
 * How far right of the table's left edge a run of text can start and still
 * belong to the table.
 *
 * MEASURED ACROSS ALL TWELVE BLOCKS, not chosen for roundness. Two populations
 * exist and they do not overlap:
 *
 *  - the table's own VALUE column, offset 24..29 from the table's left edge
 *    (Cleric is the widest at 7 -> 36; the right-placed tables sit at 63 -> 86);
 *  - the FACING PAGE COLUMN, offset 61..67 (Paladin is the narrowest at 5 -> 66).
 *
 * Any threshold in 30..60 separates them. 45 is taken as the midpoint so that
 * neither population is near the edge. Right-placed tables have no facing column
 * to their right at all, so no bound is found for them and the slice runs to the
 * end of the line — which is correct, and is why this needs no knowledge of
 * which of the two placements a given class got.
 */
const FACING_COLUMN_MIN_OFFSET = 45;

/** Positions where a run of text begins: line start, or after two spaces. */
function runStarts(line: string): number[] {
  const starts: number[] = [];
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === ' ') {
      continue;
    }
    if (i === 0 || (i >= 2 && line[i - 1] === ' ' && line[i - 2] === ' ')) {
      starts.push(i);
    }
  }
  return starts;
}

/**
 * The column at which the FACING page column begins, or the end of every line
 * when the table is itself the right-hand column.
 *
 * Without this bound a left-placed table swallows the facing column's prose —
 * the Barbarian's `Skill Proficiencies` value would continue into "As a
 * Barbarian, you gain the following class features", which is exactly what the
 * first run of this parser did and what made it throw.
 */
function facingColumn(lines: readonly string[], table: number): number {
  let found = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    for (const start of runStarts(line)) {
      if (start >= table + FACING_COLUMN_MIN_OFFSET && start < found) {
        found = start;
      }
    }
  }
  return found;
}

/**
 * Field label to its accumulated text, read from `column` rightwards only.
 *
 * A slice ending in `-` joins the next with NO space (`Mar-` + `tial`); anything
 * else joins with one (`Sleight` + `of Hand`). The Rogue's skill list needs both
 * forms in a single field, which is why neither rule can be dropped.
 */
function fields(
  className: string,
  lines: readonly string[],
  column: number,
  rightEdge: number,
): Map<FieldLabel, string> {
  const values = new Map<FieldLabel, string>();
  let active: FieldLabel | null = null;

  for (const line of lines) {
    // Read the table's own column WINDOW and nothing else. Everything outside
    // it belongs to the facing page column: the "As a Multiclass Character"
    // bullets that put a second `Hit Point Die` in four blocks, the Champion
    // prose beside the Monk, and the Sorcerer's Draconic Spells table beside the
    // Warlock. Clipping on both sides is what removes all three at once.
    const slice =
      line.length <= column ? '' : line.slice(column, Number.isFinite(rightEdge) ? rightEdge : undefined);
    const text = slice.trim();
    if (text === '') {
      continue;
    }

    const label = FIELD_LABELS.find((candidate) => text.startsWith(candidate));
    if (label !== undefined) {
      active = label;
      const rest = text.slice(label.length).trim();
      values.set(label, rest);
      continue;
    }
    if (active === null) {
      continue;
    }
    // `Saving Throw` wraps onto a bare `Proficiencies` line in every block. It
    // is part of the label, not part of the value, so it must not be appended.
    if (text === 'Proficiencies') {
      continue;
    }
    const sofar = values.get(active) ?? '';
    values.set(
      active,
      sofar.endsWith('-') ? `${sofar.slice(0, -1)}${text}` : `${sofar} ${text}`.trim(),
    );
  }

  for (const required of REQUIRED_FIELDS) {
    if (!values.has(required)) {
      throw new SrdClassTraitsError(
        `${className} block has no "${required}" row.`,
      );
    }
  }
  return values;
}

/** `D12 per Barbarian level` -> 12. */
function hitDie(className: string, text: string): number {
  const match = /^D(?<size>\d+)\b/.exec(text);
  const size = match === null ? Number.NaN : Number(match.groups?.size);
  if (![6, 8, 10, 12].includes(size)) {
    throw new SrdClassTraitsError(
      `${className} hit die ${JSON.stringify(text)} is not one of D6, D8, D10, D12.`,
    );
  }
  return size;
}

/** `Strength and Constitution` -> two abilities. */
function savingThrows(className: string, text: string): Ability[] {
  const parsed = text
    .split(/\s+and\s+|,\s*/)
    .map((word) => word.trim())
    .filter((word) => word !== '')
    .map((word) => {
      const ability = ABILITY_WORDS[word];
      if (ability === undefined) {
        throw new SrdClassTraitsError(
          `${className} saving throw ${JSON.stringify(word)} is not an ability.`,
        );
      }
      return ability;
    });
  if (parsed.length === 0) {
    throw new SrdClassTraitsError(`${className} has no saving throws.`);
  }
  return parsed;
}

interface ParsedSkills {
  readonly count: number;
  readonly fromAny: boolean;
  readonly options: Skill[];
}

/**
 * Three printed shapes, and all three must be handled:
 *
 *   `Choose 2: Animal Handling, Athletics, ...`   eight classes
 *   `Choose any 3 skills (see "Playing the Game")` Bard — NO list at all
 *   `Choose 3: Animal Handling, ...`               Ranger (3), Rogue (4)
 */
function skillChoice(className: string, text: string): ParsedSkills {
  const chooseAny = /^Choose any (?<count>\d+) skills?\b/.exec(text)?.groups;
  if (chooseAny !== undefined) {
    return { count: Number(chooseAny.count), fromAny: true, options: [] };
  }

  const listed = /^Choose (?<count>\d+):\s*(?<list>.+)$/.exec(text)?.groups;
  if (listed === undefined) {
    throw new SrdClassTraitsError(
      `${className} skill proficiencies ${JSON.stringify(text)} matches no known shape.`,
    );
  }

  const options = (listed.list as string)
    // The list's final separator is `, or ` — strip the `or` without disturbing
    // a skill name, none of which contains the word.
    .replace(/,?\s+or\s+/g, ', ')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
    .map((entry) => {
      const skill = SKILL_BY_DISPLAY.get(entry.toLowerCase());
      const exact = [...SKILL_BY_DISPLAY.entries()].find(
        ([display]) => display.toLowerCase() === entry.toLowerCase(),
      );
      const resolved = skill ?? exact?.[1];
      if (resolved === undefined) {
        throw new SrdClassTraitsError(
          `${className} lists skill ${JSON.stringify(entry)}, which is not in the Skills table.`,
        );
      }
      return resolved;
    });

  if (options.length === 0) {
    throw new SrdClassTraitsError(`${className} skill list parsed to nothing.`);
  }
  return { count: Number(listed.count), fromAny: false, options };
}

/**
 * `Light and Medium armor and Shields` -> light, medium, shield.
 * `None` -> no categories, which is a SOURCED fact for Monk, Sorcerer and
 * Wizard and is why the traits row's existence has to carry "we parsed this".
 */
function armorTraining(className: string, text: string): ArmorCategory[] {
  if (/^None\b/.test(text)) {
    return [];
  }
  const categories: ArmorCategory[] = [];
  if (/\bLight\b/.test(text)) categories.push('light');
  if (/\bMedium\b/.test(text)) categories.push('medium');
  if (/\bHeavy\b/.test(text)) categories.push('heavy');
  if (/\bShields?\b/.test(text)) categories.push('shield');
  if (categories.length === 0) {
    throw new SrdClassTraitsError(
      `${className} armor training ${JSON.stringify(text)} named no category and did not say None.`,
    );
  }
  return categories;
}

/**
 * `Simple and Martial weapons` -> two unqualified entries.
 * `Simple weapons and Martial weapons that have the Light property` -> the
 * martial entry keeps `Light` as its qualifier.
 *
 * The qualifier is preserved VERBATIM and is never interpreted. Recording the
 * Monk as plainly `martial` would tell a player they are proficient with a
 * Greataxe, and pretending to evaluate "Finesse or Light" against a weapon is a
 * feature this application does not have.
 */
function weaponProficiencies(
  className: string,
  text: string,
): SrdWeaponProficiency[] {
  const found: SrdWeaponProficiency[] = [];
  for (const category of weaponProficiencyCategories) {
    const word = category === 'simple' ? 'Simple' : 'Martial';
    const index = text.indexOf(word);
    if (index === -1) {
      continue;
    }
    const after = text.slice(index + word.length);
    const qualified = /^\s+weapons that have the\s+(?<qualifier>.+?)\s+propert/.exec(
      after,
    )?.groups;
    found.push({
      category,
      property_qualifier:
        qualified === undefined ? null : (qualified.qualifier as string).trim(),
    });
  }
  if (found.length === 0) {
    throw new SrdClassTraitsError(
      `${className} weapon proficiencies ${JSON.stringify(text)} named neither Simple nor Martial.`,
    );
  }
  return found;
}

/**
 * Parses `docs/srd/source/class-core-traits.txt`.
 *
 * Exported so the test can check it against rows a human read out of the same
 * file by eye — the oracle is the extract, never this function's output.
 */
export function parseSrdClassTraits(
  extract: string = coreTraitsExtract,
): SrdClassTraits[] {
  const found = blocks(extract);
  const names = [...found.keys()];
  const expected = [...SRD_CLASS_NAMES];
  if (names.length !== expected.length ||
      names.some((name) => !expected.includes(name as never))) {
    throw new SrdClassTraitsError(
      `expected the twelve classes ${expected.join(', ')}, found ${names.length}: ${names.join(', ')}.`,
    );
  }

  return expected.map((className) => {
    const lines = found.get(className) as string[];
    const column = tableColumn(className, lines);
    const values = fields(className, lines, column, facingColumn(lines, column));
    const get = (label: FieldLabel): string => values.get(label) as string;

    const skillChoiceResult = skillChoice(className, get('Skill Proficiencies'));
    return {
      class_name: className,
      hit_die: hitDie(className, get('Hit Point Die')),
      saving_throws: savingThrows(className, get('Saving Throw')),
      skill_choice_count: skillChoiceResult.count,
      skill_choice_from_any: skillChoiceResult.fromAny,
      skill_options: skillChoiceResult.options,
      armor_training: armorTraining(className, get('Armor Training')),
      weapon_proficiencies: weaponProficiencies(
        className,
        get('Weapon Proficiencies'),
      ),
    };
  });
}

/* ==========================================================================
 * EXTRA ATTACK AND MARTIAL ARTS — `attack-class-features.txt`
 * ========================================================================== */

export interface SrdExtraAttackGrant {
  readonly class_name: string;
  /** Level -> TOTAL attacks on the Attack action, never extra attacks. */
  readonly counts: ReadonlyMap<number, number>;
}

/**
 * The three feature names that grant attacks, and what each says the TOTAL is.
 *
 * SOURCED, NOT ARITHMETIC ON THE NAME. `attack-class-features.txt` carries the
 * Fighter's own wording for all three: Extra Attack is "attack twice instead of
 * once", Two Extra Attacks is "attack three times", Three Extra Attacks is
 * "attack four times". Reading 3 out of the words "Two Extra Attacks" would have
 * been inference; this is transcription of a printed sentence.
 *
 * Ordered longest-first so `Extra Attack` cannot shadow `Two Extra Attacks`.
 */
const ATTACK_FEATURES: readonly (readonly [string, number])[] = [
  ['Three Extra Attacks', 4],
  ['Two Extra Attacks', 3],
  ['Extra Attack', 2],
];

const CLASS_TABLE_BLOCK = /^--- (?<className>[A-Za-z]+) Features table \(page/;
/** A class-table row: level, proficiency bonus, then the Class Features cell. */
const FEATURE_ROW = /^\s+(?<level>\d{1,2})\s+\+\d+\s+(?<features>\S.*)$/;

/**
 * Parses the Extra Attack section of
 * `docs/srd/source/attack-class-features.txt`.
 *
 * ONLY THE CLASS-LABELLED BLOCKS ARE READ. An earlier version of that extract
 * carried these rows with no class names at all, so attributing them would have
 * meant recognising "Tactical Shift" as a Fighter feature from memory — the
 * exact fabrication the provenance record exists to stop. The section was
 * re-extracted with each class's table title above its own rows, and this parser
 * keys on that title and nothing else.
 */
export function parseSrdExtraAttackGrants(
  extract: string = attackFeaturesExtract,
): SrdExtraAttackGrant[] {
  const grants: SrdExtraAttackGrant[] = [];
  let className: string | null = null;
  let counts = new Map<number, number>();

  const flush = (): void => {
    if (className === null) {
      return;
    }
    if (counts.size === 0) {
      throw new SrdClassTraitsError(
        `${className} Extra Attack block contains no granting row.`,
      );
    }
    grants.push({ class_name: className, counts });
    className = null;
    counts = new Map();
  };

  for (const raw of normalise(extract).split('\n')) {
    const block = CLASS_TABLE_BLOCK.exec(raw)?.groups;
    if (block !== undefined) {
      flush();
      className = block.className as string;
      continue;
    }
    // A `===` heading ends the labelled region; the multiclass prose that
    // follows must not be scanned for rows.
    if (raw.startsWith('===')) {
      flush();
      continue;
    }
    if (className === null) {
      continue;
    }
    const row = FEATURE_ROW.exec(raw)?.groups;
    if (row === undefined) {
      continue;
    }
    const featureText = row.features as string;
    const matched = ATTACK_FEATURES.find(([name]) => featureText.includes(name));
    if (matched === undefined) {
      continue;
    }
    const level = Number(row.level);
    if (level < 1 || level > 20) {
      throw new SrdClassTraitsError(
        `${className} Extra Attack row has out-of-range level ${level}.`,
      );
    }
    if (counts.has(level)) {
      throw new SrdClassTraitsError(
        `${className} Extra Attack block repeats level ${level}.`,
      );
    }
    counts.set(level, matched[1]);
  }
  flush();

  if (grants.length === 0) {
    throw new SrdClassTraitsError('extra attack extract produced no classes.');
  }
  return grants;
}

const MARTIAL_ARTS_SECTION = /^=== Monk Features table/;
/** Level, proficiency bonus, features, then the Martial Arts die at the right. */
const MARTIAL_ARTS_ROW = /^\s+(?<level>\d{1,2})\s+\+\d+\s+\D.*?1d(?<die>\d+)\s*$/;

/**
 * Parses the Martial Arts column of the Monk Features table.
 *
 * The die is the LAST cell of that extract's rows, so the pattern anchors on the
 * level and proficiency bonus at the left and takes the trailing `1dN` at the
 * right — the same shape `parseWeaponMasteryProgressions` uses, and anchoring on
 * the proficiency bonus is again what keeps the page footer out of the parse.
 */
export function parseSrdMartialArtsDice(
  extract: string = attackFeaturesExtract,
): ReadonlyMap<number, number> {
  const lines = normalise(extract).split('\n');
  const start = lines.findIndex((line) => MARTIAL_ARTS_SECTION.test(line));
  if (start === -1) {
    throw new SrdClassTraitsError('no Monk Features table section.');
  }
  const dice = new Map<number, number>();
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('===')) {
      break;
    }
    const row = MARTIAL_ARTS_ROW.exec(line)?.groups;
    if (row === undefined) {
      continue;
    }
    const level = Number(row.level);
    const die = Number(row.die);
    if (![4, 6, 8, 10, 12].includes(die)) {
      throw new SrdClassTraitsError(
        `Martial Arts die 1d${String(die)} at level ${String(level)} is not a die size.`,
      );
    }
    if (dice.has(level)) {
      throw new SrdClassTraitsError(
        `Monk Features table repeats level ${String(level)}.`,
      );
    }
    dice.set(level, die);
  }
  for (let level = 1; level <= 20; level += 1) {
    if (!dice.has(level)) {
      throw new SrdClassTraitsError(
        `Monk Features table is missing level ${String(level)}.`,
      );
    }
  }
  return dice;
}
