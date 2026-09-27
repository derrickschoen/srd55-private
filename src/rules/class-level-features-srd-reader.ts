/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * The one parser for the Class Features cell of all twelve bundled SRD class
 * tables. It reassembles wrapped cells before deriving typed entitlements.
 *
 * Sorcerer is the load-bearing layout case: "Ability Score" and "Improvement"
 * are printed on separate lines. Consumers must use this model rather than
 * scanning the extract or maintaining per-class level literals.
 *
 * THE PARSE RUNS AT BUILD TIME, NOT AT RUNTIME. This module takes the extract
 * as an argument and imports no SRD text. `npm run srd:artifacts` runs the
 * parser over `docs/srd/source/class-level-tables.txt` and commits the result
 * as `generated/class-level-features-srd.ts`, which the runtime reads through
 * `class-level-features-srd.ts`; that module imports only this file's types
 * and error class. `class-level-features-srd-generation.test.ts` re-runs the
 * parser over the extract and fails on any byte difference.
 */
import {
  characterLevels,
  type CharacterLevel,
} from '../domain/enums';
import {
  perCharacterLevel,
  type PerCharacterLevel,
} from '../domain/per-level';
import { isSrdClassName, type SrdClassName } from './srd-class-names';

export const classFeatureEntitlementKinds = [
  'ability_score_improvement',
  'epic_boon',
  'expertise',
  'fighting_style_feature',
  'spellcasting_feature',
  'subclass_choice',
] as const;
export type ClassFeatureEntitlementKind =
  (typeof classFeatureEntitlementKinds)[number];

export interface SrdClassLevelFeatureCell {
  readonly class_name: SrdClassName;
  readonly class_level: CharacterLevel;
  /** Whitespace-normalized, reassembled text from the one Features cell. */
  readonly feature_cell: string;
  /** Individual comma-separated names in their printed order. */
  readonly feature_names: readonly string[];
  readonly entitlements: readonly ClassFeatureEntitlementKind[];
}

export interface SrdClassLevelFeatures {
  readonly class_name: SrdClassName;
  /** One cell per class level: index `level - 1`. */
  readonly levels: PerCharacterLevel<SrdClassLevelFeatureCell>;
}

export class SrdClassLevelFeaturesError extends Error {
  constructor(message: string) {
    super(`SRD class level features: ${message}`);
    this.name = 'SrdClassLevelFeaturesError';
  }
}

const SECTION_MARKER =
  /^=== (?<className>[A-Za-z]+) Features table — printed page \d+ ===$/gm;
const LEVEL_ROW = /^\s*(?<level>[1-9]|1\d|20)\s+\+[2-6](?:\s|$)/;

function isCharacterLevel(value: number): value is CharacterLevel {
  return (characterLevels as readonly number[]).includes(value);
}

interface TableSection {
  readonly className: SrdClassName;
  readonly lines: readonly string[];
}

function tableSections(source: string): TableSection[] {
  const markers = [...source.matchAll(SECTION_MARKER)];
  if (markers.length === 0) {
    throw new SrdClassLevelFeaturesError(
      'class level-table extract has no class sections.',
    );
  }
  return markers.map((marker, index) => {
    const className = marker.groups?.className;
    if (
      className === undefined ||
      marker.index === undefined ||
      !isSrdClassName(className)
    ) {
      throw new SrdClassLevelFeaturesError(
        'class level-table extract has an unrecognised marker.',
      );
    }
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? source.length;
    return { className, lines: source.slice(start, end).split('\n') };
  });
}

function featureColumns(
  className: string,
  lines: readonly string[],
): { readonly end: number } {
  const header = lines.find(
    (line) => line.includes('Level') && line.includes('Class Features'),
  );
  if (header === undefined) {
    throw new SrdClassLevelFeaturesError(
      `${className} table has no level header.`,
    );
  }
  const start = header.indexOf('Class Features');
  const afterLabel = start + 'Class Features'.length;
  const next = /\S/.exec(header.slice(afterLabel));
  if (start < 0 || next === null) {
    throw new SrdClassLevelFeaturesError(
      `${className} table has no column after Class Features.`,
    );
  }
  return { end: afterLabel + next.index };
}

function entitlementForName(
  className: string,
  name: string,
): ClassFeatureEntitlementKind | null {
  if (name === `${className} Subclass`) {
    return 'subclass_choice';
  }
  switch (name) {
    case 'Ability Score Improvement':
      return 'ability_score_improvement';
    case 'Epic Boon':
      return 'epic_boon';
    case 'Expertise':
      return 'expertise';
    case 'Fighting Style':
      return 'fighting_style_feature';
    case 'Spellcasting':
      return 'spellcasting_feature';
    default:
      return null;
  }
}

function parseSection(section: TableSection): SrdClassLevelFeatures {
  const columns = featureColumns(section.className, section.lines);
  const cells = new Map<CharacterLevel, string>();
  let currentLevel: CharacterLevel | null = null;
  let currentCellStart: number | null = null;

  for (const line of section.lines) {
    const row = LEVEL_ROW.exec(line);
    if (row !== null) {
      const rawLevel = Number(row.groups?.level);
      if (!isCharacterLevel(rawLevel)) {
        throw new SrdClassLevelFeaturesError(
          `${section.className} table has out-of-range level ${String(rawLevel)}.`,
        );
      }
      if (cells.has(rawLevel)) {
        throw new SrdClassLevelFeaturesError(
          `${section.className} table repeats level ${String(rawLevel)}.`,
        );
      }
      currentLevel = rawLevel;
      currentCellStart = row[0].length;
      cells.set(rawLevel, line.slice(currentCellStart, columns.end));
      continue;
    }

    if (currentLevel !== null && currentCellStart !== null) {
      const continuation = line.slice(currentCellStart, columns.end).trim();
      if (continuation !== '') {
        cells.set(
          currentLevel,
          `${cells.get(currentLevel) ?? ''} ${continuation}`,
        );
      }
    }
  }

  if (
    cells.size !== characterLevels.length ||
    characterLevels.some((level) => !cells.has(level))
  ) {
    throw new SrdClassLevelFeaturesError(
      `${section.className} table does not enumerate levels 1..20.`,
    );
  }

  const levels = perCharacterLevel(characterLevels.map((classLevel) => {
    const featureCell = (cells.get(classLevel) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    const featureNames =
      featureCell === '—'
        ? []
        : featureCell
            .split(',')
            .map((name) => name.trim())
            .filter((name) => name !== '');
    return {
      class_name: section.className,
      class_level: classLevel,
      feature_cell: featureCell,
      feature_names: featureNames,
      entitlements: featureNames
        .map((name) => entitlementForName(section.className, name))
        .filter(
          (
            entitlement,
          ): entitlement is ClassFeatureEntitlementKind =>
            entitlement !== null,
        ),
    };
  }));
  /* c8 ignore next 5 -- characterLevels has twenty members by definition. */
  if (levels === null) {
    throw new SrdClassLevelFeaturesError(
      `${section.className} table does not enumerate levels 1..20.`,
    );
  }
  return { class_name: section.className, levels };
}

export function parseSrdClassLevelFeatures(
  source: string,
): SrdClassLevelFeatures[] {
  const parsed = tableSections(source).map(parseSection);
  if (parsed.length !== 12) {
    throw new SrdClassLevelFeaturesError(
      `expected twelve class tables, found ${String(parsed.length)}.`,
    );
  }
  return parsed;
}
