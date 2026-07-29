/**
 * WHICH LEVELS GRANT AN ABILITY SCORE IMPROVEMENT, PER CLASS — read from the
 * bundled SRD 5.2 level tables, never hardcoded (level-up plan §5).
 *
 * The plan's own history is the reason this module exists: revision 2 scoped
 * the increase to "level 4" and was wrong — ASI appears at 4, 8, 12 and 16
 * for ten classes, with the Fighter adding 6 and 14 and the Rogue adding 10.
 * A literal list in code is the same class of mistake as the plural-weapon
 * map D15 forbids: a mechanical fact decided by something other than the
 * data. The extract ships in the bundle
 * (`docs/srd/source/class-level-tables.txt`), so the fact is read from it,
 * exactly as `class-equipment-srd.ts` reads its own extract.
 *
 * WHY THE PARSE MUST HANDLE WRAPPED CELLS: the Sorcerer table prints
 * "Ability Score" and "Improvement" on TWO lines. A per-line substring scan
 * finds 47 occurrences of the phrase and misses all four Sorcerer levels —
 * which is precisely the silent wrong number this unit exists to close, so
 * the features CELL is reassembled per level from its column before the
 * phrase is tested.
 *
 * A class name the extract does not print (homebrew, or an unseeded edition)
 * has NO ASI data here, and `asiLevelsForClassName` says so with `null`
 * rather than an empty set: "the table names no ASI levels" and "there is no
 * table" are different facts, and the level-up command must not refuse — or
 * silently skip — an increase on the strength of data it does not have (D33).
 */
import classLevelTables from '../../docs/srd/source/class-level-tables.txt?raw';

const ASI_FEATURE_PHRASE = 'Ability Score Improvement';

const SECTION_MARKER =
  /^=== (?<className>[A-Za-z]+) Features table — printed page \d+ ===$/gm;

const LEVEL_ROW = /^\s*(?<level>[1-9]|1\d|20)\s+\+[2-6](?:\s|$)/;

interface TableSection {
  readonly className: string;
  readonly lines: readonly string[];
}

function tableSections(source: string): TableSection[] {
  const markers = [...source.matchAll(SECTION_MARKER)];
  if (markers.length === 0) {
    throw new Error('Class level-table extract has no class sections.');
  }
  return markers.map((marker, index) => {
    const className = marker.groups?.className;
    if (className === undefined || marker.index === undefined) {
      throw new Error('Class level-table extract has an unrecognised marker.');
    }
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? source.length;
    return { className, lines: source.slice(start, end).split('\n') };
  });
}

/**
 * The column bounds of the features cell, from the header line.
 *
 * The END is the first later column's own start — the next word beginning
 * after "Class Features" on the header line (`Rages`, `Points`, `Die`, …).
 * Slicing every row at that boundary is what keeps the other columns'
 * numbers out of the reassembled cell.
 */
function featuresColumnEnd(header: string): number {
  const start = header.indexOf('Class Features');
  const afterLabel = start + 'Class Features'.length;
  const next = /\S/.exec(header.slice(afterLabel));
  if (next === null) {
    throw new Error('Class level-table header has no column after Features.');
  }
  return afterLabel + next.index;
}

function asiLevelsFromSection(section: TableSection): ReadonlySet<number> {
  const header = section.lines.find(
    (line) => line.includes('Level') && line.includes('Class Features'),
  );
  if (header === undefined) {
    throw new Error(`${section.className} table has no level header.`);
  }
  const cellEnd = featuresColumnEnd(header);

  // Reassemble each level's features cell: the level row's own slice plus
  // every following continuation line's slice, until the next level row.
  const cells = new Map<number, string>();
  let currentLevel: number | null = null;
  for (const line of section.lines) {
    const row = LEVEL_ROW.exec(line);
    if (row !== null) {
      const level = Number(row.groups?.level);
      if (cells.has(level)) {
        throw new Error(
          `${section.className} table repeats level ${String(level)}.`,
        );
      }
      currentLevel = level;
      cells.set(level, line.slice(row[0].length, cellEnd));
      continue;
    }
    if (currentLevel !== null) {
      const continuation = line.slice(0, cellEnd).trim();
      if (continuation.length > 0) {
        cells.set(
          currentLevel,
          `${cells.get(currentLevel) ?? ''} ${continuation}`,
        );
      }
    }
  }

  const levels = [...cells.keys()].sort((a, b) => a - b);
  const expected = Array.from({ length: 20 }, (_, index) => index + 1);
  if (
    levels.length !== expected.length ||
    levels.some((level, index) => level !== expected[index])
  ) {
    throw new Error(
      `${section.className} table does not enumerate levels 1..20.`,
    );
  }

  return new Set(
    [...cells.entries()]
      .filter(([, cell]) =>
        cell.replace(/\s+/g, ' ').includes(ASI_FEATURE_PHRASE),
      )
      .map(([level]) => level)
      .sort((a, b) => a - b),
  );
}

function parseAsiLevels(): ReadonlyMap<string, ReadonlySet<number>> {
  return new Map(
    tableSections(classLevelTables).map((section) => [
      section.className,
      asiLevelsFromSection(section),
    ]),
  );
}

const ASI_LEVELS_BY_CLASS_NAME = parseAsiLevels();

/**
 * The levels at which the named class grants an Ability Score Improvement,
 * or `null` when the bundled tables do not print that class at all.
 */
export function asiLevelsForClassName(
  className: string,
): ReadonlySet<number> | null {
  return ASI_LEVELS_BY_CLASS_NAME.get(className) ?? null;
}
