/**
 * READING ORDER FOR THE TWO-COLUMN FULL SRD TEXT.
 *
 * `docs/srd/full/srd-5.2.1.txt` is `pdftotext -layout` output: a two-column
 * page interleaves its columns on every line, so a heading in the right column
 * shares a line with prose from the left one. This module reconstructs reading
 * order (each page's left column, then its right column) while keeping every
 * row's ORIGINAL line number, so an index span still points into the committed
 * file.
 *
 * The gutter is measured per page, by character (never byte: the text is full
 * of curly quotes, and `docs/srd/SOURCE.md` records the byte-slicing mistake).
 * A text line of a two-column page has exactly two runs of text separated by a
 * gap; the most common start of the second run is the right column's margin,
 * and the gutter is the leftmost start within three characters of that mode
 * (an indented paragraph starts two past the margin). A page with no such line
 * is one column or a full-page table, and its rows keep the whole line.
 *
 * A line is split at the whitespace run that covers the gutter. A line whose
 * text crosses the gutter (a full-width table row, a chapter title) stays whole
 * in the left column, which is where its first cell reads.
 */

export type StreamColumn = 'left' | 'right' | 'whole';

export interface StreamRow {
  /** The printed page number from the page's running footer. */
  readonly page: number;
  readonly column: StreamColumn;
  /** 1-based line number in the full text. */
  readonly line: number;
  /** The row's text, trimmed. Never empty. */
  readonly text: string;
  /** Characters past its column's usual left margin (0 for most prose). */
  readonly indent: number;
}

const PAGE_FOOTER =
  /^\s*(?:(\d+)\s+System Reference Document 5\.2\.1|System Reference Document 5\.2\.1\s+(\d+))\s*$/;

interface RawPage {
  readonly printed: number;
  readonly lines: readonly { readonly line: number; readonly text: string }[];
}

export class SrdColumnsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SrdColumnsError';
  }
}

/** The page's running-footer number, or throws: every printed page has one. */
function printedNumber(lines: readonly { readonly text: string }[], at: number): number {
  for (const { text } of lines) {
    const match = PAGE_FOOTER.exec(text);
    if (match !== null) {
      return Number(match[1] ?? match[2]);
    }
  }
  throw new SrdColumnsError(`The page starting at line ${String(at)} has no running footer.`);
}

function pagesOf(text: string): RawPage[] {
  const pages: RawPage[] = [];
  let current: { line: number; text: string }[] = [];
  const flush = (): void => {
    if (current.some((row) => row.text.trim() !== '')) {
      pages.push({ printed: printedNumber(current, current[0]?.line ?? 0), lines: current });
    }
    current = [];
  };
  text.split('\n').forEach((raw, index) => {
    let body = raw;
    if (body.startsWith('\f')) {
      flush();
      body = body.slice(1);
    }
    // A tab is one character wide in the layout; count it as one space so a
    // column position is a character position.
    current.push({ line: index + 1, text: body.replaceAll('\t', ' ') });
  });
  flush();
  return pages;
}

/** The start positions of the runs of text on a line (runs split at 2+ spaces). */
function runsOf(text: string): { readonly start: number; readonly end: number }[] {
  return [...text.matchAll(/\S+(?: \S+)*/g)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

/**
 * Where the second run of text starts, counted over the page's lines whose
 * first run starts at the left margin. `exactlyTwo` keeps only lines of
 * exactly two runs (plain two-column prose).
 */
function secondRunStarts(page: RawPage, exactlyTwo: boolean): Map<number, number> {
  const starts = new Map<number, number>();
  for (const { text } of page.lines) {
    if (PAGE_FOOTER.test(text)) {
      continue;
    }
    const runs = runsOf(text);
    const [first, second] = runs;
    if (first === undefined || second === undefined || (exactlyTwo && runs.length !== 2)) {
      continue;
    }
    if (first.start > 10 || second.start < 40 || second.start > 100 || second.start - first.end < 2) {
      continue;
    }
    starts.set(second.start, (starts.get(second.start) ?? 0) + 1);
  }
  return starts;
}

/** The mode of the two-run starts, moved left to the first start within three of it. */
function gutterByMode(page: RawPage): number | null {
  const starts = secondRunStarts(page, true);
  let mode: number | null = null;
  for (const [position, count] of starts) {
    const best = mode === null ? 0 : (starts.get(mode) ?? 0);
    if (mode === null || count > best || (count === best && position < mode)) {
      mode = position;
    }
  }
  if (mode === null) {
    return null;
  }
  for (let position = mode - 3; position <= mode; position += 1) {
    if ((starts.get(position) ?? 0) > 0) {
      return position;
    }
  }
  return mode;
}

/**
 * The leftmost frequent start of a second run: the right column's margin even
 * when a table inside the right column makes a later start the most common.
 */
function gutterByMargin(page: RawPage): number | null {
  const starts = secondRunStarts(page, false);
  const window = (position: number): number =>
    (starts.get(position) ?? 0) + (starts.get(position + 1) ?? 0) + (starts.get(position + 2) ?? 0);
  let most = 0;
  for (let position = 40; position <= 100; position += 1) {
    most = Math.max(most, window(position));
  }
  if (most < 3) {
    return null;
  }
  for (let position = 40; position <= 100; position += 1) {
    if (window(position) >= Math.max(3, most * 0.1)) {
      for (let at = position; at <= position + 2; at += 1) {
        if ((starts.get(at) ?? 0) > 0) {
          return at;
        }
      }
    }
  }
  return null;
}

/** Lines whose text runs through `gutter` without a space on either side of it. */
function crossings(page: RawPage, gutter: number): number {
  return page.lines.filter(({ text }) => text.length > gutter && text[gutter - 1] !== ' ' && text[gutter] !== ' ').length;
}

/**
 * The page's gutter, or `null` for a page with no two-column prose (a full-page
 * table or Contents). Two measures disagree on pages where a table sits inside
 * one column; the one fewer lines cross wins, and on a tie the leftmost.
 */
function gutterOf(page: RawPage): number | null {
  const byMode = gutterByMode(page);
  if (byMode === null) {
    return null;
  }
  const byMargin = gutterByMargin(page);
  if (byMargin === null) {
    return byMode;
  }
  const modeCrossings = crossings(page, byMode);
  const marginCrossings = crossings(page, byMargin);
  if (marginCrossings !== modeCrossings) {
    return marginCrossings < modeCrossings ? byMargin : byMode;
  }
  return Math.min(byMode, byMargin);
}

interface Piece {
  readonly line: number;
  readonly text: string;
  readonly start: number;
}

function splitLine(line: number, text: string, gutter: number): { left: Piece | null; right: Piece | null } {
  if (text.trim() === '') {
    return { left: null, right: null };
  }
  const piece = (from: number, to: number): Piece | null => {
    const slice = text.slice(from, to);
    const trimmed = slice.trim();
    if (trimmed === '') {
      return null;
    }
    return { line, text: trimmed, start: from + (slice.length - slice.trimStart().length) };
  };
  if (text.length <= gutter - 1 || text.slice(gutter - 1).trim() === '') {
    return { left: piece(0, text.length), right: null };
  }
  const gaps = [...text.matchAll(/ {2,}/g)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
  const cut =
    gaps.find((gap) => gap.start <= gutter - 1 && gutter - 1 < gap.end) ??
    gaps.find((gap) => Math.abs(gap.end - gutter) <= 4);
  if (cut === undefined) {
    if (text.slice(0, gutter).trim() === '') {
      return { left: null, right: piece(gutter, text.length) };
    }
    return { left: piece(0, text.length), right: null };
  }
  return { left: piece(0, cut.start), right: piece(cut.end, text.length) };
}

/** The most common start position of a column's pieces: its left margin. */
function marginOf(pieces: readonly Piece[]): number {
  const counts = new Map<number, number>();
  for (const { start } of pieces) {
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  let margin = 0;
  let best = -1;
  for (const [start, count] of counts) {
    if (count > best || (count === best && start < margin)) {
      margin = start;
      best = count;
    }
  }
  return margin;
}

/**
 * Every non-blank row of the full text in reading order, footers dropped.
 * Pages keep document order; within a page the left column precedes the right.
 */
export function srdReadingOrder(text: string): readonly StreamRow[] {
  const rows: StreamRow[] = [];
  for (const page of pagesOf(text)) {
    const body = page.lines.filter(({ text: line }) => !PAGE_FOOTER.test(line));
    const gutter = gutterOf(page);
    if (gutter === null) {
      const pieces = body.flatMap(({ line, text: raw }) => {
        const trimmed = raw.trim();
        return trimmed === '' ? [] : [{ line, text: trimmed, start: raw.length - raw.trimStart().length }];
      });
      const margin = marginOf(pieces);
      for (const piece of pieces) {
        rows.push({ page: page.printed, column: 'whole', line: piece.line, text: piece.text, indent: Math.max(0, piece.start - margin) });
      }
      continue;
    }
    const left: Piece[] = [];
    const right: Piece[] = [];
    for (const { line, text: raw } of body) {
      const split = splitLine(line, raw, gutter);
      if (split.left !== null) {
        left.push(split.left);
      }
      if (split.right !== null) {
        right.push(split.right);
      }
    }
    for (const [column, pieces] of [['left', left], ['right', right]] as const) {
      const margin = marginOf(pieces);
      for (const piece of pieces) {
        rows.push({ page: page.printed, column, line: piece.line, text: piece.text, indent: Math.max(0, piece.start - margin) });
      }
    }
  }
  return rows;
}
