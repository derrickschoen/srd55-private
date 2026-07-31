/**
 * The one parser for the Class Features cell of all twelve bundled SRD class
 * tables. It reassembles wrapped cells before deriving typed entitlements.
 *
 * Sorcerer is the load-bearing layout case: "Ability Score" and "Improvement"
 * are printed on separate lines. Consumers must use this model rather than
 * scanning the extract or maintaining per-class level literals.
 */
import classLevelTables from '../../docs/srd/source/class-level-tables.txt?raw';
import {
  characterLevels,
  type CharacterLevel,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { FeatFeatureEvidence } from '../builder/level-up-wizard';

export const classFeatureEntitlementKinds = [
  'ability_score_improvement',
  'epic_boon',
  'expertise',
  'fighting_style_feature',
  'spellcasting_feature',
] as const;
export type ClassFeatureEntitlementKind =
  (typeof classFeatureEntitlementKinds)[number];

export interface SrdClassLevelFeatureCell {
  readonly class_name: string;
  readonly class_level: CharacterLevel;
  /** Whitespace-normalized, reassembled text from the one Features cell. */
  readonly feature_cell: string;
  /** Individual comma-separated names in their printed order. */
  readonly feature_names: readonly string[];
  readonly entitlements: readonly ClassFeatureEntitlementKind[];
}

export interface SrdClassLevelFeatures {
  readonly class_name: string;
  readonly levels: readonly SrdClassLevelFeatureCell[];
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
  readonly className: string;
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
    if (className === undefined || marker.index === undefined) {
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
  name: string,
): ClassFeatureEntitlementKind | null {
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

  return {
    class_name: section.className,
    levels: characterLevels.map((classLevel) => {
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
          .map(entitlementForName)
          .filter(
            (
              entitlement,
            ): entitlement is ClassFeatureEntitlementKind =>
              entitlement !== null,
          ),
      };
    }),
  };
}

export function parseSrdClassLevelFeatures(
  source: string = classLevelTables,
): SrdClassLevelFeatures[] {
  const parsed = tableSections(source).map(parseSection);
  if (parsed.length !== 12) {
    throw new SrdClassLevelFeaturesError(
      `expected twelve class tables, found ${String(parsed.length)}.`,
    );
  }
  return parsed;
}

const CLASS_LEVEL_FEATURES = new Map(
  parseSrdClassLevelFeatures().map((entry) => [entry.class_name, entry]),
);

export function classLevelFeaturesForClassName(
  className: string,
): SrdClassLevelFeatures | null {
  return CLASS_LEVEL_FEATURES.get(className) ?? null;
}

export function levelsWithClassFeatureEntitlement(
  className: string,
  entitlement: ClassFeatureEntitlementKind,
): ReadonlySet<number> | null {
  const features = classLevelFeaturesForClassName(className);
  if (features === null) {
    return null;
  }
  return new Set(
    features.levels
      .filter((entry) => entry.entitlements.includes(entitlement))
      .map((entry) => entry.class_level),
  );
}

/** Kept as the deliberately thin consumer named by the binding plan. */
export function asiLevelsForClassName(
  className: string,
): ReadonlySet<number> | null {
  return levelsWithClassFeatureEntitlement(
    className,
    'ability_score_improvement',
  );
}

export function epicBoonLevelsForClassName(
  className: string,
): ReadonlySet<number> | null {
  return levelsWithClassFeatureEntitlement(className, 'epic_boon');
}

export interface ProjectedBundledClass {
  readonly class_name: string;
  readonly class_level: CharacterLevel;
  /**
   * Null means no subclass. An unrecognised non-null key is imported content,
   * so a negative feature claim becomes unprovable rather than absent.
   */
  readonly subclass_content_key: ContentKey | null;
}

const BUNDLED_SPELLCASTING_SUBCLASS_KEYS = new Set<string>([
  '2024:subclass:ek',
  '2024:subclass:at',
]);

/**
 * Evidence for the only two feature prerequisites in the bundled feat corpus.
 *
 * Known classes and subclasses prove presence/absence from sourced bundled
 * content. Imported content makes a negative unprovable, while any known
 * positive remains proof.
 */
export function featFeatureEvidenceForProjectedClasses(
  classes: readonly ProjectedBundledClass[],
): FeatFeatureEvidence {
  let hasUnknownFeatureSource = false;
  let fightingStyle = false;
  let spellcasting = false;
  for (const held of classes) {
    const table = classLevelFeaturesForClassName(held.class_name);
    if (table === null) {
      hasUnknownFeatureSource = true;
      continue;
    }
    const cells = table.levels.filter(
      (cell) => cell.class_level <= held.class_level,
    );
    fightingStyle ||= cells.some((cell) =>
      cell.entitlements.includes('fighting_style_feature'),
    );
    spellcasting ||= cells.some((cell) =>
      cell.entitlements.includes('spellcasting_feature'),
    );
    if (held.subclass_content_key !== null) {
      if (
        BUNDLED_SPELLCASTING_SUBCLASS_KEYS.has(
          held.subclass_content_key,
        ) &&
        held.class_level >= 3
      ) {
        spellcasting = true;
      } else if (
        !BUNDLED_SPELLCASTING_SUBCLASS_KEYS.has(
          held.subclass_content_key,
        )
      ) {
        hasUnknownFeatureSource = true;
      }
    }
  }
  return {
    fighting_style: fightingStyle
      ? 'present'
      : hasUnknownFeatureSource
        ? 'unprovable'
        : 'absent',
    spellcasting: spellcasting
      ? 'present'
      : hasUnknownFeatureSource
        ? 'unprovable'
        : 'absent',
  };
}
