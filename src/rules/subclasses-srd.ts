/**
 * The SRD subclass catalog is deliberately narrower than rules prose (D152):
 * it contains subclass names, feature headings and five printed spell tables.
 * This reader validates that selective grammar before exposing the twelve
 * class/name pairs. SC-2 owns the typed feature and table manifests.
 */
import subclassesExtract from '../../docs/srd/source/subclasses.txt?raw';

const BODY_MARKER = '--- Extracted catalog lines follow. ---';

const EXPECTED_HEADER = `This work includes material from the System Reference Document 5.2
("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.

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

`;

const BASE_CLASSES = [
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

const BASE_CLASS_SET = new Set<string>(BASE_CLASSES);

const REQUIRED_TABLE_MARKERS = [
  'Life Domain Spells',
  'Circle of the Land Spells',
  'Oath of Devotion Spells',
  'Draconic Spells',
  'Fiend Spells',
] as const;

const STANDALONE_TABLE_TITLES = new Set([
  'Life Domain Spells',
  'Arid Land',
  'Polar Land',
  'Temperate Land',
  'Tropical Land',
  'Oath of Devotion Spells',
  'Draconic Spells',
  'Fiend Spells',
]);

const LOGICAL_TABLE_BY_TITLE = new Map<string, string>([
  ['Life Domain Spells', 'Life Domain Spells'],
  ['Arid Land', 'Circle of the Land Spells'],
  ['Polar Land', 'Circle of the Land Spells'],
  ['Temperate Land', 'Circle of the Land Spells'],
  ['Tropical Land', 'Circle of the Land Spells'],
  ['Oath of Devotion Spells', 'Oath of Devotion Spells'],
  ['Draconic Spells', 'Draconic Spells'],
  ['Fiend Spells', 'Fiend Spells'],
]);

const TABLE_CLASS_BY_TITLE = new Map<string, string>([
  ['Life Domain Spells', 'Cleric'],
  ['Arid Land', 'Druid'],
  ['Polar Land', 'Druid'],
  ['Temperate Land', 'Druid'],
  ['Tropical Land', 'Druid'],
  ['Oath of Devotion Spells', 'Paladin'],
  ['Draconic Spells', 'Sorcerer'],
  ['Fiend Spells', 'Warlock'],
]);

const TABLE_HEADERS = new Set([
  'Cleric Prepared Spells',
  'Level',
  'Druid Level Circle Spells',
  'Paladin Level Spells',
  'Sorcerer',
  'Level Spells',
  'Warlock Level Spells',
]);

const SUBCLASS_HEADING =
  /^(?<className>[A-Za-z]+) Subclass:\s*(?<subclassName>.*)$/u;
const FEATURE_HEADING = /^Level (?<level>\d+): (?<featureName>\S.*)$/u;
const SUBCLASS_NAME_FRAGMENT =
  /^[A-Z][\p{L}’'-]*(?: (?:[A-Z][\p{L}’'-]*|of|the))*$/u;
const SPELL_WORD = "(?:\\p{Lu}[\\p{L}’'/-]*|and|from|of|to|with|without)";
const SPELL_NAME = `${SPELL_WORD}(?: ${SPELL_WORD})*`;
const SPELL_LIST = new RegExp(`^${SPELL_NAME}(?:, ${SPELL_NAME})*,?$`, 'u');
const TABLE_ROW = /^(?<level>\d+) (?<spells>\S.*)$/u;

interface ParsedSubclass {
  readonly className: string;
  readonly subclassName: string;
}

export class SrdSubclassError extends Error {
  constructor(message: string) {
    super(`SRD subclasses: ${message}`);
    this.name = 'SrdSubclassError';
  }
}

function normalizedTableLine(line: string): string {
  return line.replace(/\s+/gu, ' ').trim();
}

function isSubclassNameFragment(line: string): boolean {
  return SUBCLASS_NAME_FRAGMENT.test(line);
}

function tableMarkerForFeature(featureName: string): string | null {
  return featureName === 'Circle of the Land Spells' ? featureName : null;
}

/**
 * Parse and validate the selective extract. The return value intentionally has
 * only class and subclass names; ordered feature/table manifests belong to
 * SC-2 and are not pre-shaped here.
 */
export function parseSrdSubclassSections(
  extract: string = subclassesExtract,
): readonly ParsedSubclass[] {
  const markerIndex = extract.indexOf(`${BODY_MARKER}\n`);
  if (markerIndex === -1) {
    throw new SrdSubclassError('catalog body marker is missing.');
  }
  if (extract.slice(0, markerIndex) !== EXPECTED_HEADER) {
    throw new SrdSubclassError(
      'header must contain exactly the required notice and provenance lines.',
    );
  }

  const body = extract.slice(markerIndex + BODY_MARKER.length + 1);
  const lines = body.split('\n');
  const parsed: ParsedSubclass[] = [];
  const seenClasses = new Set<string>();
  const seenTableMarkers = new Set<string>();
  const tableRowCounts = new Map<string, number>();
  let seenFeatureHeadings = new Set<string>();
  let currentClass: string | null = null;
  let inSpellTable = false;
  let currentTable: string | null = null;
  let continuationExpected = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? '';
    if (line === '') {
      continue;
    }

    const subclass = SUBCLASS_HEADING.exec(line)?.groups;
    if (subclass !== undefined) {
      const className = subclass.className;
      let subclassName = subclass.subclassName;
      if (className === undefined || subclassName === undefined) {
        throw new SrdSubclassError('malformed subclass heading.');
      }
      if (!BASE_CLASS_SET.has(className)) {
        throw new SrdSubclassError(`unknown base class ${JSON.stringify(className)}.`);
      }
      if (seenClasses.has(className)) {
        throw new SrdSubclassError(`duplicate base class ${className}.`);
      }

      const nextLine = lines[index + 1]?.trim() ?? '';
      if (isSubclassNameFragment(nextLine)) {
        subclassName = `${subclassName} ${nextLine}`.trim();
        index += 1;
      }
      if (!isSubclassNameFragment(subclassName)) {
        throw new SrdSubclassError(
          `${className} has a missing or malformed subclass name.`,
        );
      }

      const expectedClass = BASE_CLASSES[parsed.length];
      if (className !== expectedClass) {
        throw new SrdSubclassError(
          `${className} is out of class order; expected ${String(expectedClass)}.`,
        );
      }

      seenClasses.add(className);
      currentClass = className;
      seenFeatureHeadings = new Set<string>();
      inSpellTable = false;
      currentTable = null;
      continuationExpected = false;
      parsed.push({ className, subclassName });
      continue;
    }

    const feature = FEATURE_HEADING.exec(line)?.groups;
    if (feature !== undefined) {
      if (currentClass === null) {
        throw new SrdSubclassError('feature heading appears before a subclass.');
      }
      const printedLevel = feature.level;
      const featureName = feature.featureName;
      if (printedLevel === undefined || featureName === undefined) {
        throw new SrdSubclassError('malformed feature heading.');
      }
      const level = Number(printedLevel);
      if (!Number.isSafeInteger(level) || level < 1 || level > 20) {
        throw new SrdSubclassError(`feature level ${printedLevel} is outside 1-20.`);
      }
      const featureHeadingKey = `${printedLevel}\u0000${featureName}`;
      if (seenFeatureHeadings.has(featureHeadingKey)) {
        throw new SrdSubclassError(
          `duplicate feature heading Level ${printedLevel}: ${featureName} in ${currentClass}.`,
        );
      }
      seenFeatureHeadings.add(featureHeadingKey);
      const tableMarker = tableMarkerForFeature(featureName);
      if (tableMarker !== null) {
        if (seenTableMarkers.has(tableMarker)) {
          throw new SrdSubclassError(`duplicate ${tableMarker} table.`);
        }
        seenTableMarkers.add(tableMarker);
      }
      inSpellTable = false;
      currentTable = null;
      continuationExpected = false;
      continue;
    }

    if (STANDALONE_TABLE_TITLES.has(line)) {
      const expectedClass = TABLE_CLASS_BY_TITLE.get(line);
      if (currentClass !== expectedClass) {
        throw new SrdSubclassError(
          `${line} table appears under ${String(currentClass)} instead of ${String(expectedClass)}.`,
        );
      }
      if (seenTableMarkers.has(line)) {
        throw new SrdSubclassError(`duplicate ${line} table.`);
      }
      if (REQUIRED_TABLE_MARKERS.includes(line as (typeof REQUIRED_TABLE_MARKERS)[number])) {
        seenTableMarkers.add(line);
      }
      inSpellTable = true;
      currentTable = LOGICAL_TABLE_BY_TITLE.get(line) ?? null;
      continuationExpected = false;
      continue;
    }

    if (!inSpellTable) {
      throw new SrdSubclassError(`unrecognised catalog line ${JSON.stringify(line)}.`);
    }

    const normalized = normalizedTableLine(line);
    if (TABLE_HEADERS.has(normalized)) {
      continuationExpected = false;
      continue;
    }
    const tableRow = TABLE_ROW.exec(normalized)?.groups;
    if (tableRow !== undefined) {
      const level = Number(tableRow.level);
      const spells = tableRow.spells;
      if (
        spells === undefined ||
        ![3, 5, 7, 9, 13, 17].includes(level) ||
        !SPELL_LIST.test(spells)
      ) {
        throw new SrdSubclassError(`malformed spell-table row ${JSON.stringify(line)}.`);
      }
      if (currentTable === null) {
        throw new SrdSubclassError('spell-table row has no table heading.');
      }
      tableRowCounts.set(currentTable, (tableRowCounts.get(currentTable) ?? 0) + 1);
      continuationExpected = spells.endsWith(',');
      continue;
    }
    if (continuationExpected && SPELL_LIST.test(normalized)) {
      continuationExpected = false;
      continue;
    }
    throw new SrdSubclassError(`unrecognised spell-table line ${JSON.stringify(line)}.`);
  }

  if (parsed.length !== BASE_CLASSES.length) {
    const missing = BASE_CLASSES.filter((className) => !seenClasses.has(className));
    throw new SrdSubclassError(`missing base classes: ${missing.join(', ')}.`);
  }
  for (const marker of REQUIRED_TABLE_MARKERS) {
    if (!seenTableMarkers.has(marker)) {
      throw new SrdSubclassError(`missing ${marker} table.`);
    }
    if ((tableRowCounts.get(marker) ?? 0) === 0) {
      throw new SrdSubclassError(`${marker} table has no spell rows.`);
    }
  }

  return parsed;
}

export const srdSubclassSections = parseSrdSubclassSections();
