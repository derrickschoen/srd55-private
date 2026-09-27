/**
 * A SECOND READER OF THE FULL SRD TEXT, FOR INDEPENDENT PINS.
 *
 * The rule index generator (scripts/srd/rule-index.ts) reads the SRD through
 * scripts/srd/srd-columns.ts: it measures each page's gutter by character,
 * splits every line there, and finds headings by the rows around them. A pin
 * derived through that code would agree with the generator by construction, so
 * the pins in tests/unit/rules/srd-rule-index.test.ts use this module instead.
 * It shares no code with the generator and reads differently:
 *
 * - `rawSegments`: a raw line cut into its runs of text (two or more spaces
 *   separate runs), each with its character column. No gutter is measured.
 * - `rawColumnRows`: a page's rows, left then right, a run belonging to the
 *   right column when it starts at character 55 or later. Every two-column
 *   page these pins read prints its right column from character 56 on, and a
 *   full-width table's cells reach character 54 at most (the Sorcerer
 *   Features table's last column, printed page 66, starts at 50).
 * - `rawHeadings`: a heading is a row holding ONE Title Case run with no
 *   sentence punctuation, after a finished sentence, a list item, a table row
 *   or another heading, and followed by the row its caller says a heading of
 *   that catalogue is followed by (prose, a `Cost:` line, a severity line …).
 * - `contentsEntries`: Contents read by its dot leaders and page numbers, a
 *   title wrapped over two lines joined by its column position.
 */

export interface RawSegment {
  readonly x: number;
  readonly text: string;
}

export interface RawRow {
  /** 1-based line number in the full text. */
  readonly line: number;
  readonly page: number;
  readonly column: 'left' | 'right';
  readonly segments: readonly string[];
}

const FOOTER = /^\s*(?:(\d+)\s+System Reference Document 5\.2\.1|System Reference Document 5\.2\.1\s+(\d+))\s*$/;
const RIGHT_COLUMN_FROM = 55;
const SMALL_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with', 'by', 'at', 'from', 'as', 'per', 'into', 'than']);

/** Each printed page's lines: the 0-based line indices after the previous footer, through its own. */
export function rawPages(lines: readonly string[]): ReadonlyMap<number, { readonly from: number; readonly to: number }> {
  const pages = new Map<number, { from: number; to: number }>();
  let from = 0;
  lines.forEach((line, index) => {
    const match = FOOTER.exec(line);
    if (match !== null) {
      pages.set(Number(match[1] ?? match[2]), { from, to: index });
      from = index + 1;
    }
  });
  return pages;
}

/** A raw line's runs of text and where each starts. */
export function rawSegments(line: string): RawSegment[] {
  const text = line.replaceAll('\f', ' ').replaceAll('\t', '    ');
  return [...text.matchAll(/\S(?:\S| (?! ))*/g)].map((match) => ({ x: match.index, text: match[0] }));
}

/** The rows of printed pages `first` to `last`, each page's left column before its right. */
export function rawColumnRows(lines: readonly string[], first: number, last: number): RawRow[] {
  const pages = rawPages(lines);
  const rows: RawRow[] = [];
  for (let page = first; page <= last; page += 1) {
    const range = pages.get(page);
    if (range === undefined) {
      throw new Error(`No printed page ${String(page)}.`);
    }
    const left: RawRow[] = [];
    const right: RawRow[] = [];
    for (let index = range.from; index < range.to; index += 1) {
      const segments = rawSegments(lines[index] ?? '');
      const leftRuns = segments.filter(({ x }) => x < RIGHT_COLUMN_FROM).map(({ text }) => text);
      const rightRuns = segments.filter(({ x }) => x >= RIGHT_COLUMN_FROM).map(({ text }) => text);
      if (leftRuns.length > 0) {
        left.push({ line: index + 1, page, column: 'left', segments: leftRuns });
      }
      if (rightRuns.length > 0) {
        right.push({ line: index + 1, page, column: 'right', segments: rightRuns });
      }
    }
    rows.push(...left, ...right);
  }
  return rows;
}

/** The rows strictly between the first row reading exactly `start` and the next row reading exactly `end`. */
export function rowsBetween(rows: readonly RawRow[], start: string, end: string): RawRow[] {
  const from = rows.findIndex(({ segments }) => segments.length === 1 && segments[0] === start);
  const to = rows.findIndex(({ segments }, index) => index > from && segments.length === 1 && segments[0] === end);
  if (from < 0 || to < 0) {
    throw new Error(`No rows between "${start}" and "${end}".`);
  }
  return rows.slice(from + 1, to);
}

/** Title Case, at most six words, small words lower-case after the first, an optional glossary tag or price. */
export function isTitle(text: string): boolean {
  const words = text
    .replace(/ \[(?:Action|Area of Effect|Attitude|Condition|Hazard)\]$/, '')
    .replace(/ \((?:\d[\d,]* GP|Varies)\)$/, '')
    .split(' ');
  return words.length <= 6
    && words.every((word, index) => (index > 0 && SMALL_WORDS.has(word)) || /^[A-Z0-9][A-Za-z0-9’'\-/]*$/.test(word));
}

/** Prose: a sentence starting with a capital or a quotation mark, four words or more. */
export function isProse(row: RawRow): boolean {
  const [first] = row.segments;
  return row.segments.length === 1 && first !== undefined && /^[A-Z“]/.test(first) && first.split(' ').length >= 4;
}

/**
 * The headings among `rows`: a row that is one Title Case run, whose next row
 * satisfies `followedBy`, and (unless `afterAnything`) whose previous row ends
 * a sentence, is a list item, a table row or itself a title.
 */
export function rawHeadings(
  rows: readonly RawRow[],
  followedBy: (next: RawRow) => boolean,
  afterAnything = false,
): RawRow[] {
  return rows.filter((row, index) => {
    const [text] = row.segments;
    if (row.segments.length !== 1 || text === undefined || !isTitle(text)) {
      return false;
    }
    const next = rows[index + 1];
    if (next === undefined || !followedBy(next)) {
      return false;
    }
    // The row above in the same column; a column's first row has none.
    const above = rows[index - 1];
    const previous = above !== undefined && above.page === row.page && above.column === row.column ? above : undefined;
    const before = previous?.segments[0];
    return afterAnything
      || previous === undefined
      || previous.segments.length > 1
      || before === undefined
      || /[.”):]$/.test(before)
      || before.startsWith('•')
      || isTitle(before);
  });
}

export interface ContentsEntry {
  readonly title: string;
  readonly page: number;
  readonly line: number;
  readonly x: number;
}

/**
 * The entries of Contents (printed page 2). A line is read left to right: each
 * entry ends at its dot leader and page number; text before an entry that is
 * separated from it by three or more spaces is a title fragment wrapped from
 * the line above in that column (`Monk Subclass: Warrior of the Open` / `Hand
 * ....52`), joined to the nearest entry below it at the same position. The
 * Index of Stat Blocks, which Contents' third column continues into, is not
 * Contents and is dropped from its label down.
 */
export function contentsEntries(lines: readonly string[]): ContentsEntry[] {
  const start = lines.findIndex((line) => /^\f\s*Contents\s/.test(line));
  const pages = rawPages(lines);
  const end = pages.get(2)?.to ?? -1;
  if (start < 0 || end < 0) {
    throw new Error('Contents (printed page 2) was not found.');
  }
  const pieces: { title: string; page: number | null; line: number; x: number }[] = [];
  for (let index = start; index < end; index += 1) {
    const line = (lines[index] ?? '').replaceAll('\f', ' ');
    let at = 0;
    const emit = (text: string, offset: number, page: number | null): void => {
      const runs = [...text.matchAll(/\S(?:\S| {1,2}(?! ))*/g)];
      runs.forEach((run, position) => {
        pieces.push({ title: run[0].trim(), page: position === runs.length - 1 ? page : null, line: index + 1, x: offset + run.index });
      });
    };
    for (const leader of line.matchAll(/\.+\s*(\d{1,3})(?=\s|$)/g)) {
      emit(line.slice(at, leader.index), at, Number(leader[1]));
      at = leader.index + leader[0].length;
    }
    emit(line.slice(at), at, null);
  }
  const label = pieces.find(({ title }) => title === 'Index of Stat');
  const entries = pieces.filter((piece): piece is { title: string; page: number; line: number; x: number } =>
    piece.page !== null && (label === undefined || piece.line < label.line || piece.x < label.x - 12));
  for (const fragment of pieces.filter(({ page, title }) => page === null && !['Contents', 'Index of Stat', 'Blocks'].includes(title))) {
    const below = entries
      .filter(({ line, x }) => line > fragment.line && line - fragment.line <= 2 && Math.abs(x - fragment.x) <= 3)
      .sort((a, b) => a.line - b.line)[0];
    if (below === undefined) {
      throw new Error(`Contents fragment "${fragment.title}" (line ${String(fragment.line)}) joins no entry.`);
    }
    below.title = `${fragment.title} ${below.title}`;
  }
  return entries.map(({ title, page, line, x }) => ({ title, page, line, x }));
}
