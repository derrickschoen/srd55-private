/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Typed catalog facts parsed from the pinned subclass extract. Feature prose
 * is deliberately outside this grammar: every body line must be a subclass
 * heading, a levelled feature heading, a spell-table label, or a spell row.
 */
import subclassesExtract from '../../docs/srd/source/subclasses.txt?raw';
import {
  characterLevels,
  type CharacterLevel,
} from '../domain/enums';
import { GrantRule } from '../grants/grant-rule';
import { SRD_ATTRIBUTION_NOTICE } from './srd-attribution';

export class SrdSubclassesError extends Error {
  constructor(message: string) {
    super(`SRD subclasses: ${message}`);
    this.name = 'SrdSubclassesError';
  }
}

export const srdSubclassClassNames = [
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

export type SrdSubclassClassName = (typeof srdSubclassClassNames)[number];

export const srdSubclassSpellTableNames = [
  'life_domain',
  'circle_of_the_land',
  'oath_of_devotion',
  'draconic_sorcery',
  'fiend_patron',
] as const;

export type SrdSubclassSpellTableName =
  (typeof srdSubclassSpellTableNames)[number];

export type SrdUnconditionalSpellTableName = Exclude<
  SrdSubclassSpellTableName,
  'circle_of_the_land'
>;

export const circleLandChoices = [
  'Arid Land',
  'Polar Land',
  'Temperate Land',
  'Tropical Land',
] as const;

export type CircleLandChoice = (typeof circleLandChoices)[number];

export interface SrdSubclassFeatureHeading {
  readonly name: string;
  readonly class_level: CharacterLevel;
  /** Zero-based order across the whole subclass, exactly as printed. */
  readonly sort_position: number;
}

export interface SrdSubclassSpellEntry {
  readonly printed_name: string;
  readonly spell_version_key: string;
  readonly active_from_class_level: CharacterLevel;
}

export interface SrdUnconditionalSpellTable {
  readonly kind: 'unconditional';
  readonly table_name: SrdUnconditionalSpellTableName;
  readonly entries: readonly SrdSubclassSpellEntry[];
}

export interface SrdCircleLandSpellChoice {
  readonly land: CircleLandChoice;
  readonly entries: readonly SrdSubclassSpellEntry[];
}

export interface SrdCircleLandSpellTable {
  readonly kind: 'renewable_choice';
  readonly table_name: 'circle_of_the_land';
  readonly choices: readonly SrdCircleLandSpellChoice[];
}

export type SrdSubclassSpellTable =
  | SrdUnconditionalSpellTable
  | SrdCircleLandSpellTable;

export interface SrdSubclassFixedSpellRule {
  readonly kind: 'fixed_spell';
  readonly rule_key: string;
  readonly spell_version_key: string;
  readonly bucket: 'prepared';
  readonly always_prepared: true;
  readonly with_slots: true;
  readonly active_from_class_level: CharacterLevel;
}

export interface SrdSubclassUnconditionalRuleSet {
  readonly class_name: 'Cleric' | 'Paladin' | 'Sorcerer' | 'Warlock';
  readonly subclass_name:
    | 'Life Domain'
    | 'Oath of Devotion'
    | 'Draconic Sorcery'
    | 'Fiend Patron';
  readonly spell_table: SrdUnconditionalSpellTableName;
  readonly rules: readonly SrdSubclassFixedSpellRule[];
}

export type SrdSubclassDeferral =
  | {
      readonly kind: 'magical_discoveries_multi_list_choice';
      readonly feature_name: 'Magical Discoveries';
      readonly reason: 'the_current_list_rule_resolves_exactly_one_list';
    }
  | {
      readonly kind: 'circle_land_renewable_choice';
      readonly feature_name: 'Circle of the Land Spells';
      readonly evidence_table: 'circle_of_the_land';
      readonly reason: 'the_renewable_land_choice_has_no_typed_capture_path';
    }
  | {
      readonly kind: 'additional_fighting_style_open_choice';
      readonly feature_name: 'Additional Fighting Style';
      readonly reason: 'the_rule_requires_a_fixed_style_key';
    }
  | {
      readonly kind: 'evocation_savant_timing_excluded';
      readonly feature_name: 'Evocation Savant';
      readonly reason: 'the_acquisition_timing_exists_only_in_excluded_feature_prose';
    };

export type SrdSubclassMechanicalOutcome =
  | {
      readonly kind: 'no_catalog_rule';
      readonly reason: 'the_extracted_catalog_facts_contain_no_spell_or_choice_rule';
    }
  | {
      readonly kind: 'unconditional_fixed_spells';
      readonly rule_set: SrdSubclassUnconditionalRuleSet;
    }
  | {
      readonly kind: 'deferred';
      readonly deferral: SrdSubclassDeferral;
    };

export interface SrdSubclassDefinition {
  readonly class_name: SrdSubclassClassName;
  readonly subclass_name: string;
  readonly features: readonly SrdSubclassFeatureHeading[];
  readonly mechanical_outcome: SrdSubclassMechanicalOutcome;
}

export interface SrdSubclassManifest {
  readonly by_class: Readonly<
    Record<SrdSubclassClassName, SrdSubclassDefinition>
  >;
  readonly spell_tables: readonly SrdSubclassSpellTable[];
  readonly unconditional_rule_sets: readonly SrdSubclassUnconditionalRuleSet[];
}

/** SC-1's provenance words are admitted exactly; line wrapping is immaterial. */
const REQUIRED_EXTRACT_PREAMBLE = `${SRD_ATTRIBUTION_NOTICE}

--- Selective subclass catalog extract: printed pages 30, 35, 40, 46, 49, 52,
    56-57, 61, 64, 69-70, 76 and 82. ---

D152 excludes class and subclass feature paragraphs. The body therefore omits
those paragraphs and neighbouring-column text, and keeps exactly subclass
headings, Level N feature headings, and the Life Domain, Circle of the Land,
Oath of Devotion, Draconic Sorcery and Fiend Patron spell tables.

RE-DERIVATION: read docs/srd/full/srd-5.2.1.txt as Unicode characters and emit
these fixed-width slices in this order:
- 1872-1916 right, characters 61-end (Barbarian)
- 2190-2203 left, characters 1-60; 2166-2199 right, characters 61-end (Bard)
- 2470-2488 left, characters 1-60; 2445-2494 right, characters 61-end (Cleric)
- 2789-2845 left, characters 1-60; then right, characters 61-end (Druid)
- 2968-3005 left, characters 1-60 (Fighter)
- 3130-3169 right, characters 61-end (Monk)
- 3364-3420 right, characters 64-end; 3425-3442 left, characters 1-60 (Paladin)
- 3649-3711 left, characters 1-60 (Ranger)
- 3827-3885 left, characters 1-60 (Rogue)
- 4167-4188 right, characters 56-end; 4194-4245 left, characters 1-60 (Sorcerer)
- 4586-4607 left, characters 1-60; 4565-4603 right, characters 61-end (Warlock)
- 4944-4959 left, characters 1-60; 4902-4944 right, characters 61-end (Wizard)

From each slice emit lines whose trimmed text is a Class Subclass heading or a
Level N heading. Also emit wrapped-name lines 1873, 2191, 2790, 3131 and 4168,
and these spell-table lines: 2453, 2455-2456, 2458, 2460, 2462, 2464, 2466;
2808-2810, 2812, 2814-2815, 2817, 2819, 2821-2822, 2824, 2826, 2828-2829,
2832, 2834, 2836-2837, 2839-2841, 2843-2845; 3390-3398; 4200, 4202, 4204,
4206-4207, 4209, 4211, 4213; and 4565-4571. Concatenate retained slices in
the segment order above without inserting blank body lines. Every retained
slice below is verbatim; omission is the only edit to source lines.

--- Extracted catalog lines follow. ---
`;

const EXTRACT_BODY_MARKER = '--- Extracted catalog lines follow. ---\n';

const EXPECTED_SUBCLASS_NAMES: Readonly<
  Record<SrdSubclassClassName, string>
> = {
  Barbarian: 'Path of the Berserker',
  Bard: 'College of Lore',
  Cleric: 'Life Domain',
  Druid: 'Circle of the Land',
  Fighter: 'Champion',
  Monk: 'Warrior of the Open Hand',
  Paladin: 'Oath of Devotion',
  Ranger: 'Hunter',
  Rogue: 'Thief',
  Sorcerer: 'Draconic Sorcery',
  Warlock: 'Fiend Patron',
  Wizard: 'Evoker',
};

const EXPECTED_FEATURE_COUNTS: Readonly<
  Record<SrdSubclassClassName, number>
> = {
  Barbarian: 4,
  Bard: 4,
  Cleric: 5,
  Druid: 5,
  Fighter: 6,
  Monk: 4,
  Paladin: 5,
  Ranger: 5,
  Rogue: 5,
  Sorcerer: 5,
  Warlock: 5,
  Wizard: 5,
};

const TABLE_CLASS: Readonly<
  Record<SrdSubclassSpellTableName, SrdSubclassClassName>
> = {
  life_domain: 'Cleric',
  circle_of_the_land: 'Druid',
  oath_of_devotion: 'Paladin',
  draconic_sorcery: 'Sorcerer',
  fiend_patron: 'Warlock',
};

const TABLE_TITLE = new Map<string, SrdUnconditionalSpellTableName>([
  ['Life Domain Spells', 'life_domain'],
  ['Oath of Devotion Spells', 'oath_of_devotion'],
  ['Draconic Spells', 'draconic_sorcery'],
  ['Fiend Spells', 'fiend_patron'],
]);

const EXPECTED_PHYSICAL_TABLE_HEADERS: Readonly<
  Record<SrdSubclassSpellTableName, readonly (readonly string[])[]>
> = {
  life_domain: [['Cleric Prepared Spells', 'Level']],
  circle_of_the_land: [
    ['Druid Level Circle Spells'],
    ['Druid Level Circle Spells'],
    ['Druid Level Circle Spells'],
    ['Druid Level Circle Spells'],
  ],
  oath_of_devotion: [['Paladin Level Spells']],
  draconic_sorcery: [['Sorcerer', 'Level Spells']],
  fiend_patron: [['Warlock Level Spells']],
};

const ALL_TABLE_HEADERS = new Set(
  Object.values(EXPECTED_PHYSICAL_TABLE_HEADERS).flat(2),
);

/**
 * The complete set printed at extract lines 58-62, 71-92, 114-120, 144-148,
 * and 157-161.
 */
const SPELL_TABLE_ACTIVATION_LEVELS = [3, 5, 7, 9, 13, 17] as const;

/**
 * Keys are transcribed explicitly from the official spell catalog. They are
 * not derived from the parsed names, so punctuation changes cannot silently
 * mint an unchecked key.
 */
export const srdSubclassSpellVersionKeyEntries = [
  ['Acid Splash', '2024:acid-splash'],
  ['Aid', '2024:aid'],
  ['Alter Self', '2024:alter-self'],
  ['Arcane Eye', '2024:arcane-eye'],
  ['Aura of Life', '2024:aura-of-life'],
  ['Beacon of Hope', '2024:beacon-of-hope'],
  ['Bless', '2024:bless'],
  ['Blight', '2024:blight'],
  ['Blur', '2024:blur'],
  ['Burning Hands', '2024:burning-hands'],
  ['Charm Monster', '2024:charm-monster'],
  ['Chromatic Orb', '2024:chromatic-orb'],
  ['Command', '2024:command'],
  ['Commune', '2024:commune'],
  ['Cone of Cold', '2024:cone-of-cold'],
  ['Cure Wounds', '2024:cure-wounds'],
  ['Death Ward', '2024:death-ward'],
  ['Dispel Magic', '2024:dispel-magic'],
  ['Dragon’s Breath', '2024:dragon-s-breath'],
  ['Fear', '2024:fear'],
  ['Fire Shield', '2024:fire-shield'],
  ['Fire Bolt', '2024:fire-bolt'],
  ['Fireball', '2024:fireball'],
  ['Flame Strike', '2024:flame-strike'],
  ['Fly', '2024:fly'],
  ['Fog Cloud', '2024:fog-cloud'],
  ['Freedom of Movement', '2024:freedom-of-movement'],
  ['Geas', '2024:geas'],
  ['Greater Restoration', '2024:greater-restoration'],
  ['Guardian of Faith', '2024:guardian-of-faith'],
  ['Hold Person', '2024:hold-person'],
  ['Ice Storm', '2024:ice-storm'],
  ['Insect Plague', '2024:insect-plague'],
  ['Legend Lore', '2024:legend-lore'],
  ['Lesser Restoration', '2024:lesser-restoration'],
  ['Lightning Bolt', '2024:lightning-bolt'],
  ['Mass Cure Wounds', '2024:mass-cure-wounds'],
  ['Mass Healing Word', '2024:mass-healing-word'],
  ['Misty Step', '2024:misty-step'],
  ['Polymorph', '2024:polymorph'],
  ['Protection from Evil and Good', '2024:protection-from-evil-and-good'],
  ['Ray of Frost', '2024:ray-of-frost'],
  ['Ray of Sickness', '2024:ray-of-sickness'],
  ['Revivify', '2024:revivify'],
  ['Scorching Ray', '2024:scorching-ray'],
  ['Shield of Faith', '2024:shield-of-faith'],
  ['Shocking Grasp', '2024:shocking-grasp'],
  ['Sleet Storm', '2024:sleet-storm'],
  ['Sleep', '2024:sleep'],
  ['Stinking Cloud', '2024:stinking-cloud'],
  ['Suggestion', '2024:suggestion'],
  ['Summon Dragon', '2024:summon-dragon'],
  ['Tree Stride', '2024:tree-stride'],
  ['Wall of Fire', '2024:wall-of-fire'],
  ['Wall of Stone', '2024:wall-of-stone'],
  ['Web', '2024:web'],
  ['Zone of Truth', '2024:zone-of-truth'],
] as const satisfies readonly (readonly [string, string])[];

const SPELL_VERSION_KEY = new Map<string, string>(
  srdSubclassSpellVersionKeyEntries,
);

interface RawSection {
  readonly class_name: SrdSubclassClassName;
  readonly initial_subclass_name: string;
  readonly lines: readonly string[];
}

interface ParsedSection {
  readonly class_name: SrdSubclassClassName;
  readonly subclass_name: string;
  readonly features: readonly SrdSubclassFeatureHeading[];
}

interface MutableSpellEntry extends SrdSubclassSpellEntry {
  readonly land?: CircleLandChoice;
}

interface MutablePhysicalSpellTable {
  readonly land?: CircleLandChoice;
  readonly headers: string[];
  row_count: number;
}

interface MutableSpellTable {
  readonly table_name: SrdSubclassSpellTableName;
  readonly class_name: SrdSubclassClassName;
  readonly physical_tables: MutablePhysicalSpellTable[];
  readonly entries: MutableSpellEntry[];
  readonly rows: { readonly level: CharacterLevel; readonly land?: CircleLandChoice }[];
  readonly circle_lands: CircleLandChoice[];
}

function isClassName(value: string): value is SrdSubclassClassName {
  return (srdSubclassClassNames as readonly string[]).includes(value);
}

function isCharacterLevel(value: number): value is CharacterLevel {
  return (characterLevels as readonly number[]).includes(value);
}

function isSpellTableActivationLevel(value: number): value is CharacterLevel {
  return (SPELL_TABLE_ACTIVATION_LEVELS as readonly number[]).includes(value);
}

function isCircleLand(value: string): value is CircleLandChoice {
  return (circleLandChoices as readonly string[]).includes(value);
}

function normalizedLine(line: string): string {
  return line.replace(/^\f+/u, '').trim().replace(/\s+/gu, ' ');
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

function extractBody(source: string): string {
  const bodyStart = source.indexOf(EXTRACT_BODY_MARKER);
  if (bodyStart === -1) {
    throw new SrdSubclassesError(
      'the required attribution and extract provenance preamble are absent or altered.',
    );
  }

  const preambleEnd = bodyStart + EXTRACT_BODY_MARKER.length;
  if (
    collapseWhitespace(source.slice(0, preambleEnd)) !==
    collapseWhitespace(REQUIRED_EXTRACT_PREAMBLE)
  ) {
    throw new SrdSubclassesError(
      'the required attribution and extract provenance preamble are absent or altered.',
    );
  }
  return source.slice(preambleEnd);
}

function rawSections(source: string): RawSection[] {
  const sections: RawSection[] = [];
  let current:
    | {
        class_name: SrdSubclassClassName;
        initial_subclass_name: string;
        lines: string[];
      }
    | undefined;
  const lines = extractBody(source).split('\n');

  for (const [index, rawLine] of lines.entries()) {
    const line = normalizedLine(rawLine);
    if (line === '') {
      if (index === lines.length - 1) {
        continue;
      }
      throw new SrdSubclassesError('the catalog body contains a blank or prose line.');
    }
    const heading =
      /^(?<className>[A-Za-z]+) Subclass:(?: (?<subclassName>.+))?$/u.exec(
        line,
      );
    if (heading !== null) {
      const className = heading.groups?.className;
      if (className === undefined || !isClassName(className)) {
        throw new SrdSubclassesError(
          `the catalog contains unknown class ${JSON.stringify(className ?? line)}.`,
        );
      }
      if (current !== undefined) {
        sections.push(current);
      }
      current = {
        class_name: className,
        initial_subclass_name: heading.groups?.subclassName?.trim() ?? '',
        lines: [],
      };
      continue;
    }
    if (current === undefined) {
      throw new SrdSubclassesError(
        `catalog content precedes the first subclass heading: ${JSON.stringify(line)}.`,
      );
    }
    current.lines.push(line);
  }
  if (current !== undefined) {
    sections.push(current);
  }
  if (sections.length === 0) {
    throw new SrdSubclassesError('the catalog contains no subclass sections.');
  }
  return sections;
}

function requiredSubclassName(
  section: RawSection,
): { readonly name: string; readonly body: readonly string[] } {
  const expected = EXPECTED_SUBCLASS_NAMES[section.class_name];
  let name = section.initial_subclass_name;
  let consumed = 0;
  while (name !== expected && consumed < section.lines.length) {
    const next = section.lines[consumed] as string;
    const candidate = name === '' ? next : `${name} ${next}`;
    if (!expected.startsWith(candidate)) {
      break;
    }
    name = candidate;
    consumed += 1;
  }
  if (name !== expected) {
    throw new SrdSubclassesError(
      `${section.class_name} subclass name is ${JSON.stringify(name)}, expected ${JSON.stringify(expected)}.`,
    );
  }
  return { name, body: section.lines.slice(consumed) };
}

function spellEntry(
  printedName: string,
  classLevel: CharacterLevel,
  land: CircleLandChoice | undefined,
): MutableSpellEntry {
  const key = SPELL_VERSION_KEY.get(printedName);
  if (key === undefined) {
    throw new SrdSubclassesError(
      `spell table names unregistered spell ${JSON.stringify(printedName)}.`,
    );
  }
  return Object.freeze({
    printed_name: printedName,
    spell_version_key: key,
    active_from_class_level: classLevel,
    ...(land === undefined ? {} : { land }),
  });
}

function parseSpellNames(
  text: string,
  classLevel: CharacterLevel,
  land: CircleLandChoice | undefined,
): readonly MutableSpellEntry[] {
  const withoutContinuation = text.replace(/,$/u, '');
  const names = withoutContinuation.split(',').map((name) => name.trim());
  if (names.length === 0 || names.some((name) => name === '')) {
    throw new SrdSubclassesError(
      `malformed spell row at level ${String(classLevel)}: ${JSON.stringify(text)}.`,
    );
  }
  return names.map((name) => spellEntry(name, classLevel, land));
}

function parseSection(
  section: RawSection,
  tables: MutableSpellTable[],
): ParsedSection {
  const named = requiredSubclassName(section);
  const features: SrdSubclassFeatureHeading[] = [];
  const featureNames = new Set<string>();
  let table: MutableSpellTable | undefined;
  let physicalTable: MutablePhysicalSpellTable | undefined;
  let currentLand: CircleLandChoice | undefined;
  let continuation:
    | { readonly level: CharacterLevel; readonly land: CircleLandChoice | undefined }
    | undefined;

  for (const line of named.body) {
    const feature = /^Level (?<level>\d+): (?<name>.+)$/u.exec(line);
    if (feature !== null) {
      if (continuation !== undefined) {
        throw new SrdSubclassesError(
          `${section.class_name} spell table ends with an incomplete row.`,
        );
      }
      const rawLevel = Number(feature.groups?.level);
      const featureName = feature.groups?.name?.trim();
      if (!isCharacterLevel(rawLevel)) {
        throw new SrdSubclassesError(
          `${section.class_name} feature level ${String(rawLevel)} is outside 1-20.`,
        );
      }
      if (featureName === undefined || featureName === '') {
        throw new SrdSubclassesError(
          `${section.class_name} has a feature heading with no name.`,
        );
      }
      if (featureNames.has(featureName)) {
        throw new SrdSubclassesError(
          `${section.class_name} repeats feature name ${JSON.stringify(featureName)}.`,
        );
      }
      featureNames.add(featureName);
      features.push(
        Object.freeze({
          name: featureName,
          class_level: rawLevel,
          sort_position: features.length,
        }),
      );
      continue;
    }

    const unconditionalTable = TABLE_TITLE.get(line);
    if (unconditionalTable !== undefined) {
      if (table !== undefined) {
        throw new SrdSubclassesError(
          `${section.class_name} contains more than one spell table.`,
        );
      }
      if (TABLE_CLASS[unconditionalTable] !== section.class_name) {
        throw new SrdSubclassesError(
          `${line} appears under ${section.class_name}.`,
        );
      }
      physicalTable = {
        headers: [],
        row_count: 0,
      };
      table = {
        table_name: unconditionalTable,
        class_name: section.class_name,
        physical_tables: [physicalTable],
        entries: [],
        rows: [],
        circle_lands: [],
      };
      tables.push(table);
      continue;
    }

    if (isCircleLand(line)) {
      if (section.class_name !== 'Druid') {
        throw new SrdSubclassesError(`${line} appears outside the Druid section.`);
      }
      if (table === undefined) {
        table = {
          table_name: 'circle_of_the_land',
          class_name: 'Druid',
          physical_tables: [],
          entries: [],
          rows: [],
          circle_lands: [],
        };
        tables.push(table);
      } else if (table.table_name !== 'circle_of_the_land') {
        throw new SrdSubclassesError(
          `${section.class_name} contains conflicting spell tables.`,
        );
      }
      if (table.circle_lands.includes(line)) {
        throw new SrdSubclassesError(
          `Circle of the Land repeats physical table title ${line}.`,
        );
      }
      table.circle_lands.push(line);
      currentLand = line;
      physicalTable = {
        land: line,
        headers: [],
        row_count: 0,
      };
      table.physical_tables.push(physicalTable);
      continue;
    }

    if (ALL_TABLE_HEADERS.has(line)) {
      if (table === undefined || physicalTable === undefined) {
        throw new SrdSubclassesError(
          `spell-table header ${JSON.stringify(line)} appears before a table title.`,
        );
      }
      if (physicalTable.row_count !== 0) {
        throw new SrdSubclassesError(
          `${table.table_name} header ${JSON.stringify(line)} appears after the first row of its physical table.`,
        );
      }
      physicalTable.headers.push(line);
      continue;
    }

    const row = /^(?<level>\d+) (?<spells>.+)$/u.exec(line);
    if (row !== null) {
      if (table === undefined || physicalTable === undefined) {
        throw new SrdSubclassesError(
          `spell row ${JSON.stringify(line)} appears before a table title.`,
        );
      }
      if (continuation !== undefined) {
        throw new SrdSubclassesError(
          `${section.class_name} starts a spell row before completing the previous row.`,
        );
      }
      const rawLevel = Number(row.groups?.level);
      const spells = row.groups?.spells;
      if (!isCharacterLevel(rawLevel) || spells === undefined) {
        throw new SrdSubclassesError(
          `malformed spell row ${JSON.stringify(line)}.`,
        );
      }
      if (!isSpellTableActivationLevel(rawLevel)) {
        throw new SrdSubclassesError(
          `spell-table activation level ${String(rawLevel)} is not printed in the pinned extract; expected one of ${SPELL_TABLE_ACTIVATION_LEVELS.join(', ')}.`,
        );
      }
      const physicalTableIndex = table.physical_tables.indexOf(physicalTable);
      const expectedHeaders =
        EXPECTED_PHYSICAL_TABLE_HEADERS[table.table_name][physicalTableIndex];
      if (
        expectedHeaders === undefined ||
        physicalTable.headers.length !== expectedHeaders.length ||
        physicalTable.headers.some(
          (header, index) => header !== expectedHeaders[index],
        )
      ) {
        throw new SrdSubclassesError(
          `${table.table_name} has malformed or missing table headers before a physical table row.`,
        );
      }
      if (table.table_name === 'circle_of_the_land' && currentLand === undefined) {
        throw new SrdSubclassesError('Circle spell row has no land choice.');
      }
      if (
        table.rows.some(
          (seen) => seen.level === rawLevel && seen.land === currentLand,
        )
      ) {
        throw new SrdSubclassesError(
          `${table.table_name} repeats level ${String(rawLevel)}${currentLand === undefined ? '' : ` for ${currentLand}`}.`,
        );
      }
      table.rows.push(
        Object.freeze({
          level: rawLevel,
          ...(currentLand === undefined ? {} : { land: currentLand }),
        }),
      );
      physicalTable.row_count += 1;
      table.entries.push(...parseSpellNames(spells, rawLevel, currentLand));
      if (spells.endsWith(',')) {
        continuation = { level: rawLevel, land: currentLand };
      }
      continue;
    }

    if (continuation !== undefined && table !== undefined) {
      table.entries.push(
        ...parseSpellNames(line, continuation.level, continuation.land),
      );
      continuation = line.endsWith(',') ? continuation : undefined;
      continue;
    }

    throw new SrdSubclassesError(
      `${section.class_name} contains non-heading prose or an unrecognised table row: ${JSON.stringify(line)}.`,
    );
  }

  if (continuation !== undefined) {
    throw new SrdSubclassesError(
      `${section.class_name} spell table ends with an incomplete row.`,
    );
  }
  return {
    class_name: section.class_name,
    subclass_name: named.name,
    features: Object.freeze(features),
  };
}

function validateSections(sections: readonly ParsedSection[]): void {
  const positionsByClass = new Map<SrdSubclassClassName, Set<number>>();
  for (const section of sections) {
    const positions = positionsByClass.get(section.class_name) ?? new Set<number>();
    for (const feature of section.features) {
      if (positions.has(feature.sort_position)) {
        throw new SrdSubclassesError(
          `${section.class_name} repeats feature sort position ${String(feature.sort_position)}.`,
        );
      }
      positions.add(feature.sort_position);
    }
    positionsByClass.set(section.class_name, positions);
  }

  const seen = new Set<SrdSubclassClassName>();
  for (const section of sections) {
    if (seen.has(section.class_name)) {
      throw new SrdSubclassesError(
        `the catalog repeats class ${section.class_name}.`,
      );
    }
    seen.add(section.class_name);
  }
  const missing = srdSubclassClassNames.filter((name) => !seen.has(name));
  if (missing.length !== 0) {
    throw new SrdSubclassesError(
      `the catalog is missing classes ${missing.join(', ')}.`,
    );
  }
  if (
    sections.length !== srdSubclassClassNames.length ||
    sections.some(
      (section, index) => section.class_name !== srdSubclassClassNames[index],
    )
  ) {
    throw new SrdSubclassesError(
      `expected the twelve classes in SRD order; found ${sections.map((section) => section.class_name).join(', ')}.`,
    );
  }

  let total = 0;
  for (const section of sections) {
    const expected = EXPECTED_FEATURE_COUNTS[section.class_name];
    if (section.features.length !== expected) {
      throw new SrdSubclassesError(
        `${section.class_name} has ${String(section.features.length)} feature headings, expected ${String(expected)}.`,
      );
    }
    total += section.features.length;
  }
  if (total !== 58) {
    throw new SrdSubclassesError(
      `expected 58 feature headings, found ${String(total)}.`,
    );
  }
}

function validateMutableTables(tables: readonly MutableSpellTable[]): void {
  if (
    tables.length !== srdSubclassSpellTableNames.length ||
    tables.some(
      (table, index) => table.table_name !== srdSubclassSpellTableNames[index],
    )
  ) {
    throw new SrdSubclassesError(
      `expected the five spell tables in SRD order; found ${tables.map((table) => table.table_name).join(', ')}.`,
    );
  }
  for (const table of tables) {
    const expectedPhysicalHeaders =
      EXPECTED_PHYSICAL_TABLE_HEADERS[table.table_name];
    if (
      table.physical_tables.length !== expectedPhysicalHeaders.length ||
      table.physical_tables.some((physical, physicalIndex) => {
        const expectedHeaders = expectedPhysicalHeaders[physicalIndex];
        return (
          expectedHeaders === undefined ||
          physical.headers.length !== expectedHeaders.length ||
          physical.headers.some(
            (header, headerIndex) => header !== expectedHeaders[headerIndex],
          )
        );
      })
    ) {
      throw new SrdSubclassesError(
        `${table.table_name} has malformed, missing, or misplaced physical table headers.`,
      );
    }
    const expectedEntries = table.table_name === 'circle_of_the_land' ? 24 : 10;
    if (table.entries.length !== expectedEntries) {
      throw new SrdSubclassesError(
        `${table.table_name} has ${String(table.entries.length)} spell entries, expected ${String(expectedEntries)}.`,
      );
    }
    if (
      table.table_name === 'circle_of_the_land' &&
      (table.circle_lands.length !== circleLandChoices.length ||
        table.circle_lands.some(
          (land, index) => land !== circleLandChoices[index],
        ))
    ) {
      throw new SrdSubclassesError(
        `Circle of the Land must contain the four land tables in printed order.`,
      );
    }
  }
}

function freezeSpellTables(
  mutable: readonly MutableSpellTable[],
): readonly SrdSubclassSpellTable[] {
  return Object.freeze(
    mutable.map((table): SrdSubclassSpellTable => {
      if (table.table_name !== 'circle_of_the_land') {
        return Object.freeze({
          kind: 'unconditional',
          table_name: table.table_name,
          entries: Object.freeze(
            table.entries.map((entry) =>
              Object.freeze({
                printed_name: entry.printed_name,
                spell_version_key: entry.spell_version_key,
                active_from_class_level: entry.active_from_class_level,
              }),
            ),
          ),
        });
      }
      const choices = circleLandChoices.map((land) => {
        const entries = table.entries
          .filter((entry) => entry.land === land)
          .map((entry) =>
            Object.freeze({
              printed_name: entry.printed_name,
              spell_version_key: entry.spell_version_key,
              active_from_class_level: entry.active_from_class_level,
            }),
          );
        if (entries.length !== 6) {
          throw new SrdSubclassesError(
            `${land} has ${String(entries.length)} spells, expected 6.`,
          );
        }
        return Object.freeze({ land, entries: Object.freeze(entries) });
      });
      return Object.freeze({
        kind: 'renewable_choice',
        table_name: 'circle_of_the_land',
        choices: Object.freeze(choices),
      });
    }),
  );
}

const RULE_SET_DETAILS: Readonly<
  Record<
    SrdUnconditionalSpellTableName,
    {
      readonly class_name: SrdSubclassUnconditionalRuleSet['class_name'];
      readonly subclass_name: SrdSubclassUnconditionalRuleSet['subclass_name'];
      readonly rule_prefix: string;
    }
  >
> = {
  life_domain: {
    class_name: 'Cleric',
    subclass_name: 'Life Domain',
    rule_prefix: 'life-domain',
  },
  oath_of_devotion: {
    class_name: 'Paladin',
    subclass_name: 'Oath of Devotion',
    rule_prefix: 'oath-of-devotion',
  },
  draconic_sorcery: {
    class_name: 'Sorcerer',
    subclass_name: 'Draconic Sorcery',
    rule_prefix: 'draconic-sorcery',
  },
  fiend_patron: {
    class_name: 'Warlock',
    subclass_name: 'Fiend Patron',
    rule_prefix: 'fiend-patron',
  },
};

function unconditionalRuleSets(
  tables: readonly SrdSubclassSpellTable[],
): readonly SrdSubclassUnconditionalRuleSet[] {
  const sets = tables.flatMap((table): SrdSubclassUnconditionalRuleSet[] => {
    if (table.kind !== 'unconditional') {
      return [];
    }
    const details = RULE_SET_DETAILS[table.table_name];
    const rules = table.entries.map((entry) => {
      const keyPart = entry.spell_version_key.split(':')[1];
      if (keyPart === undefined || keyPart === '') {
        throw new SrdSubclassesError(
          `${entry.printed_name} has malformed spell content key ${entry.spell_version_key}.`,
        );
      }
      const rule: SrdSubclassFixedSpellRule = Object.freeze({
        kind: 'fixed_spell',
        rule_key: `${details.rule_prefix}-${keyPart}`,
        spell_version_key: entry.spell_version_key,
        bucket: 'prepared',
        always_prepared: true,
        with_slots: true,
        active_from_class_level: entry.active_from_class_level,
      });
      GrantRule.fromObject(rule);
      return rule;
    });
    return [
      Object.freeze({
        class_name: details.class_name,
        subclass_name: details.subclass_name,
        spell_table: table.table_name,
        rules: Object.freeze(rules),
      }),
    ];
  });
  if (sets.length !== 4 || sets.reduce((sum, set) => sum + set.rules.length, 0) !== 40) {
    throw new SrdSubclassesError(
      'expected four unconditional rule sets containing exactly 40 fixed-spell rules.',
    );
  }
  return Object.freeze(sets);
}

function deferralForClass(
  className: 'Bard' | 'Druid' | 'Fighter' | 'Wizard',
): SrdSubclassDeferral {
  switch (className) {
    case 'Bard':
      return Object.freeze({
        kind: 'magical_discoveries_multi_list_choice',
        feature_name: 'Magical Discoveries',
        reason: 'the_current_list_rule_resolves_exactly_one_list',
      });
    case 'Druid':
      return Object.freeze({
        kind: 'circle_land_renewable_choice',
        feature_name: 'Circle of the Land Spells',
        evidence_table: 'circle_of_the_land',
        reason: 'the_renewable_land_choice_has_no_typed_capture_path',
      });
    case 'Fighter':
      return Object.freeze({
        kind: 'additional_fighting_style_open_choice',
        feature_name: 'Additional Fighting Style',
        reason: 'the_rule_requires_a_fixed_style_key',
      });
    case 'Wizard':
      return Object.freeze({
        kind: 'evocation_savant_timing_excluded',
        feature_name: 'Evocation Savant',
        reason: 'the_acquisition_timing_exists_only_in_excluded_feature_prose',
      });
  }
}

function mechanicalOutcome(
  section: ParsedSection,
  ruleSets: readonly SrdSubclassUnconditionalRuleSet[],
): SrdSubclassMechanicalOutcome {
  if (
    section.class_name === 'Bard' ||
    section.class_name === 'Druid' ||
    section.class_name === 'Fighter' ||
    section.class_name === 'Wizard'
  ) {
    const deferral = deferralForClass(section.class_name);
    if (!section.features.some((feature) => feature.name === deferral.feature_name)) {
      throw new SrdSubclassesError(
        `${section.class_name} is missing deferred feature ${deferral.feature_name}.`,
      );
    }
    return Object.freeze({ kind: 'deferred', deferral });
  }
  const ruleSet = ruleSets.find((candidate) => candidate.class_name === section.class_name);
  if (ruleSet !== undefined) {
    return Object.freeze({ kind: 'unconditional_fixed_spells', rule_set: ruleSet });
  }
  return Object.freeze({
    kind: 'no_catalog_rule',
    reason: 'the_extracted_catalog_facts_contain_no_spell_or_choice_rule',
  });
}

function requiredSection(
  sections: readonly ParsedSection[],
  className: SrdSubclassClassName,
): ParsedSection {
  const section = sections.find((candidate) => candidate.class_name === className);
  if (section === undefined) {
    throw new SrdSubclassesError(`the catalog is missing ${className}.`);
  }
  return section;
}

/** Parse the complete, closed SRD subclass manifest from the pinned extract. */
export function parseSrdSubclasses(
  source: string = subclassesExtract,
): SrdSubclassManifest {
  const tables: MutableSpellTable[] = [];
  const sections = rawSections(source).map((section) => parseSection(section, tables));
  validateSections(sections);
  validateMutableTables(tables);
  const spellTables = freezeSpellTables(tables);
  const ruleSets = unconditionalRuleSets(spellTables);

  const definition = (className: SrdSubclassClassName): SrdSubclassDefinition => {
    const section = requiredSection(sections, className);
    return Object.freeze({
      class_name: section.class_name,
      subclass_name: section.subclass_name,
      features: section.features,
      mechanical_outcome: mechanicalOutcome(section, ruleSets),
    });
  };

  const byClass = Object.freeze({
    Barbarian: definition('Barbarian'),
    Bard: definition('Bard'),
    Cleric: definition('Cleric'),
    Druid: definition('Druid'),
    Fighter: definition('Fighter'),
    Monk: definition('Monk'),
    Paladin: definition('Paladin'),
    Ranger: definition('Ranger'),
    Rogue: definition('Rogue'),
    Sorcerer: definition('Sorcerer'),
    Warlock: definition('Warlock'),
    Wizard: definition('Wizard'),
  });

  return Object.freeze({
    by_class: byClass,
    spell_tables: spellTables,
    unconditional_rule_sets: ruleSets,
  });
}
