import { outlineRows } from './light-glyphs';
import { paletteHex, type PaletteColorRef } from './palette';

/**
 * An original 8×8-cell bitmap font (glyphs 5×7, one-column gap). Uppercase,
 * digits and a few marks; every glyph is drawn here, none is copied.
 */
export const GLYPH_CELL = 8;
export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
export const GLYPH_ADVANCE = 6;

const G = (...rows: readonly string[]): readonly string[] => {
  if (rows.length !== GLYPH_HEIGHT || rows.some((row) => row.length !== GLYPH_WIDTH || /[^#.]/u.test(row))) {
    throw new Error('Pixel-font glyphs are exactly 5×7 of # and .');
  }
  return Object.freeze(rows);
};

export const PIXEL_FONT_GLYPHS: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  ['A', G('.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#')],
  ['B', G('####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.')],
  ['C', G('.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.')],
  ['D', G('####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.')],
  ['E', G('#####', '#....', '#....', '####.', '#....', '#....', '#####')],
  ['F', G('#####', '#....', '#....', '####.', '#....', '#....', '#....')],
  ['G', G('.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.')],
  ['H', G('#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#')],
  ['I', G('#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####')],
  ['J', G('..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..')],
  ['K', G('#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#')],
  ['L', G('#....', '#....', '#....', '#....', '#....', '#....', '#####')],
  ['M', G('#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#')],
  ['N', G('#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#')],
  ['O', G('.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.')],
  ['P', G('####.', '#...#', '#...#', '####.', '#....', '#....', '#....')],
  ['Q', G('.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#')],
  ['R', G('####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#')],
  ['S', G('.####', '#....', '#....', '.###.', '....#', '....#', '####.')],
  ['T', G('#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..')],
  ['U', G('#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.')],
  ['V', G('#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..')],
  ['W', G('#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#')],
  ['X', G('#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#')],
  ['Y', G('#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..')],
  ['Z', G('#####', '....#', '...#.', '..#..', '.#...', '#....', '#####')],
  ['0', G('.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.')],
  ['1', G('..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.')],
  ['2', G('.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####')],
  ['3', G('####.', '....#', '....#', '.###.', '....#', '....#', '####.')],
  ['4', G('...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.')],
  ['5', G('#####', '#....', '#....', '####.', '....#', '....#', '####.')],
  ['6', G('.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.')],
  ['7', G('#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...')],
  ['8', G('.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.')],
  ['9', G('.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.')],
  [' ', G('.....', '.....', '.....', '.....', '.....', '.....', '.....')],
  ['-', G('.....', '.....', '.....', '#####', '.....', '.....', '.....')],
  ['.', G('.....', '.....', '.....', '.....', '.....', '.##..', '.##..')],
  [',', G('.....', '.....', '.....', '.....', '..##.', '..##.', '.#...')],
  ["'", G('.##..', '.##..', '..#..', '.....', '.....', '.....', '.....')],
  [':', G('.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....')],
  ['/', G('....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....')],
  ['(', G('..#..', '.#...', '#....', '#....', '#....', '.#...', '..#..')],
  [')', G('..#..', '...#.', '....#', '....#', '....#', '...#.', '..#..')],
  ['+', G('.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....')],
  ['=', G('.....', '.....', '#####', '.....', '#####', '.....', '.....')],
  ['!', G('..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..')],
  ['?', G('.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..')],
  ['&', G('.##..', '#..#.', '#..#.', '.##..', '#.#.#', '#..#.', '.##.#')],
  ['#', G('.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....')],
]);

/** Life-state marks rendered with the same font machinery. */
export const LIFE_GLYPHS = {
  living: G('.#.#.', '#####', '#####', '#####', '.###.', '..#..', '.....'),
  dying: G('.#.#.', '#.#.#', '#...#', '#...#', '.#.#.', '..#..', '.....'),
  stable: G('#####', '#...#', '#.#.#', '#...#', '#...#', '.#.#.', '..#..'),
  dead: G('.###.', '#####', '#.#.#', '#####', '.###.', '.#.#.', '.....'),
} as const;
export type LifeGlyph = keyof typeof LIFE_GLYPHS;

export const REPLACEMENT_GLYPH = '?';

/** Uppercases and swaps unsupported characters for `?`; never drops or shortens. */
export function normalizeLabelText(text: string): string {
  return Array.from(text.toLocaleUpperCase('en-US'), (character) =>
    PIXEL_FONT_GLYPHS.has(character) ? character : REPLACEMENT_GLYPH).join('');
}

export function textPixelWidth(text: string): number {
  return text.length === 0 ? 0 : text.length * GLYPH_ADVANCE - (GLYPH_ADVANCE - GLYPH_WIDTH);
}

export interface PixelTextLayout {
  readonly lines: readonly string[];
  /** Native (1×) pixel size of the whole block. */
  readonly width: number;
  readonly height: number;
}

export const LINE_GAP = 2;

/**
 * Wraps at spaces into at most `maxLines` lines. Text that would need more
 * lines is folded into the last line: wider, never cut.
 */
export function layoutPixelText(text: string, maxLines: number): PixelTextLayout {
  const normalized = normalizeLabelText(text).trim();
  const words = normalized.length === 0 ? [''] : normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current === '') {
      current = word;
      continue;
    }
    const joined = `${current} ${word}`;
    const lastLine = lines.length === maxLines - 1;
    if (!lastLine && textPixelWidth(joined) > balanceTarget(normalized, maxLines)) {
      lines.push(current);
      current = word;
    } else {
      current = joined;
    }
  }
  lines.push(current);
  return {
    lines,
    width: Math.max(...lines.map(textPixelWidth)),
    height: lines.length * GLYPH_HEIGHT + (lines.length - 1) * LINE_GAP,
  };
}

function balanceTarget(text: string, maxLines: number): number {
  return Math.max(textPixelWidth(text) / maxLines, GLYPH_ADVANCE * 6);
}

export interface PixelTextRender {
  readonly layout: PixelTextLayout;
  readonly svg: string;
  readonly dataUri: string;
  /** CSS pixel size after scaling. */
  readonly cssWidth: number;
  readonly cssHeight: number;
}

interface GlyphRun {
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

function glyphRuns(rows: readonly string[], originX: number, originY: number): readonly GlyphRun[] {
  const runs: GlyphRun[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== '#') { x += 1; continue; }
      let end = x + 1;
      while (row[end] === '#') end += 1;
      runs.push({ x: originX + x, y: originY + y, width: end - x });
      x = end;
    }
  });
  return runs;
}

function glyphFor(character: string): readonly string[] {
  const glyph = PIXEL_FONT_GLYPHS.get(character) ?? PIXEL_FONT_GLYPHS.get(REPLACEMENT_GLYPH);
  if (glyph === undefined) throw new Error('The replacement glyph is missing from the pixel font.');
  return glyph;
}

/** Renders laid-out text as crisp SVG rects; `scale` 2 is the board's 2× chrome. */
export function renderPixelText(
  layout: PixelTextLayout,
  ink: PaletteColorRef,
  scale: number,
): PixelTextRender {
  const runs: GlyphRun[] = [];
  layout.lines.forEach((line, lineIndex) => {
    const y = lineIndex * (GLYPH_HEIGHT + LINE_GAP);
    Array.from(line).forEach((character, index) => {
      runs.push(...glyphRuns(glyphFor(character), index * GLYPH_ADVANCE, y));
    });
  });
  const width = Math.max(1, layout.width);
  const height = Math.max(1, layout.height);
  const fill = paletteHex(ink);
  const rects = runs
    .map((run) => `<rect x="${String(run.x)}" y="${String(run.y)}" width="${String(run.width)}" height="1"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(width)} ${String(height)}" width="${String(width * scale)}" height="${String(height * scale)}" shape-rendering="crispEdges"><g fill="${fill}">${rects}</g></svg>`;
  return {
    layout,
    svg,
    dataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    cssWidth: width * scale,
    cssHeight: height * scale,
  };
}

/**
 * Renders one rectangular `#`/`.` bitmap as crisp SVG rects. With an
 * `outline` ink, every `.` pixel that touches a `#` (8-neighbourhood) is drawn
 * in that ink first, so the mark keeps a one-pixel ring on any background —
 * the same rule paintLightGlyph uses on the board tile.
 */
export function renderPixelGlyph(
  label: string,
  rows: readonly string[],
  ink: PaletteColorRef,
  scale: number,
  outline: PaletteColorRef | null = null,
): PixelTextRender {
  // outlineRows validates the grid; the ring is only drawn when an outline ink is given.
  const ring = outlineRows(rows);
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const layers: string[] = [];
  if (outline !== null) layers.push(rectGroup(glyphRuns(ring, 0, 0), paletteHex(outline)));
  const inset = outline === null ? 0 : 1;
  layers.push(rectGroup(glyphRuns(rows, inset, inset), paletteHex(ink)));
  const boxWidth = width + 2 * inset;
  const boxHeight = height + 2 * inset;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(boxWidth)} ${String(boxHeight)}" width="${String(boxWidth * scale)}" height="${String(boxHeight * scale)}" shape-rendering="crispEdges">${layers.join('')}</svg>`;
  return {
    layout: { lines: [label], width: boxWidth, height: boxHeight },
    svg,
    dataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    cssWidth: boxWidth * scale,
    cssHeight: boxHeight * scale,
  };
}

function rectGroup(runs: readonly GlyphRun[], fill: string): string {
  const rects = runs
    .map((run) => `<rect x="${String(run.x)}" y="${String(run.y)}" width="${String(run.width)}" height="1"/>`)
    .join('');
  return `<g fill="${fill}">${rects}</g>`;
}

export function renderLifeGlyph(glyph: LifeGlyph, ink: PaletteColorRef, scale: number): PixelTextRender {
  return renderPixelGlyph(glyph, LIFE_GLYPHS[glyph], ink, scale);
}
