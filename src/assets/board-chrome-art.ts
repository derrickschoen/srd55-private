import { GLYPH_ADVANCE, GLYPH_HEIGHT, PIXEL_FONT_GLYPHS, normalizeLabelText } from './pixel-font';
import { neutral, paletteHex, type PaletteColorRef } from './palette';

export const BOARD_CHROME_ART_SCALE = 2;
export const CREATURE_BADGE_NATIVE_WIDTH = 13;
export const CREATURE_BADGE_NATIVE_HEIGHT = 9;
export const CREATURE_RING_NATIVE_SIZE = 25;
export const CHROME_SWATCH_NATIVE_SIZE = 7;

export interface GeneratedChromeBitmap {
  readonly dataUri: string;
  readonly svg: string;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly nativeWidth: number;
  readonly nativeHeight: number;
}

export interface CreatureBadgeBitmap extends GeneratedChromeBitmap {
  readonly opaqueRows: readonly string[];
  readonly numeralRows: readonly string[];
  readonly numeralOrigin: { readonly x: number; readonly y: number };
}

const BADGE_ROWS = Object.freeze([
  '.###########.',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '.###########.',
]);

interface PixelRun {
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

function runs(rows: readonly string[], originX = 0, originY = 0): readonly PixelRun[] {
  const result: PixelRun[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== '#') {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (row[end] === '#') end += 1;
      result.push({ x: originX + x, y: originY + y, width: end - x });
      x = end;
    }
  });
  return result;
}

function rectGroup(pixelRuns: readonly PixelRun[], fill: PaletteColorRef): string {
  return `<g fill="${paletteHex(fill)}">${pixelRuns.map((run) =>
    `<rect x="${String(run.x)}" y="${String(run.y)}" width="${String(run.width)}" height="1"/>`).join('')}</g>`;
}

function generatedSvg(
  width: number,
  height: number,
  scale: number,
  layers: readonly string[],
): GeneratedChromeBitmap {
  if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Chrome pixel-art scale must be a positive integer.');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(width)} ${String(height)}" width="${String(width * scale)}" height="${String(height * scale)}" shape-rendering="crispEdges">${layers.join('')}</svg>`;
  return {
    dataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    svg,
    cssWidth: width * scale,
    cssHeight: height * scale,
    nativeWidth: width,
    nativeHeight: height,
  };
}

function numeralRows(number: number): readonly string[] {
  if (!Number.isSafeInteger(number) || number < 1 || number > 12) {
    throw new RangeError('Creature badge art supports numerals 1..12.');
  }
  const label = normalizeLabelText(String(number));
  return Array.from({ length: GLYPH_HEIGHT }, (_unused, y) => Array.from(label).map((digit, index) => {
    const glyph = PIXEL_FONT_GLYPHS.get(digit);
    if (glyph === undefined) throw new Error(`Pixel font has no badge digit ${digit}.`);
    const gap = index === label.length - 1 ? '' : '.'.repeat(GLYPH_ADVANCE - glyph[0]!.length);
    return `${glyph[y]!}${gap}`;
  }).join(''));
}

/** One generated, palette-closed badge image shared by the token and roster. */
export function renderCreatureBadgeBitmap(
  number: number,
  disc: PaletteColorRef,
  numeralInk: PaletteColorRef,
): CreatureBadgeBitmap {
  const digits = numeralRows(number);
  const width = digits[0]?.length ?? 0;
  const origin = {
    x: Math.floor((CREATURE_BADGE_NATIVE_WIDTH - width) / 2),
    y: Math.floor((CREATURE_BADGE_NATIVE_HEIGHT - digits.length) / 2),
  };
  return {
    ...generatedSvg(CREATURE_BADGE_NATIVE_WIDTH, CREATURE_BADGE_NATIVE_HEIGHT, BOARD_CHROME_ART_SCALE, [
      rectGroup(runs(BADGE_ROWS), disc),
      rectGroup(runs(digits, origin.x, origin.y), numeralInk),
    ]),
    opaqueRows: BADGE_ROWS,
    numeralRows: digits,
    numeralOrigin: origin,
  };
}

function ringRows(): readonly string[] {
  const size = CREATURE_RING_NATIVE_SIZE;
  const shapeInset = (coordinate: number, shapeSize: number): number => coordinate < 2 || coordinate >= shapeSize - 2 ? 3
    : coordinate < 4 || coordinate >= shapeSize - 4 ? 1
      : 0;
  return Object.freeze(Array.from({ length: size }, (_unused, y) => {
    const inset = shapeInset(y, size);
    return Array.from({ length: size }, (_cell, x) => {
      const outer = x >= inset && x < size - inset;
      const innerSize = size - 4;
      const innerInset = y >= 2 && y < size - 2 ? shapeInset(y - 2, innerSize) : 0;
      const inner = y >= 2 && y < size - 2 && x >= innerInset + 2 && x < size - innerInset - 2;
      return outer && !inner ? '#' : '.';
    }).join('');
  }));
}

const CREATURE_RING_ROWS = ringRows();

/** A deliberately jagged, integer-scaled pixel ring; browsers never synthesize a curved edge. */
export function renderCreatureRingBitmap(ink: PaletteColorRef): GeneratedChromeBitmap {
  return generatedSvg(
    CREATURE_RING_NATIVE_SIZE,
    CREATURE_RING_NATIVE_SIZE,
    BOARD_CHROME_ART_SCALE,
    [rectGroup(runs(CREATURE_RING_ROWS), ink)],
  );
}

export type ChromeSwatchShape = 'disc' | 'dashed-disc' | 'square' | 'hp';

const DISC_ROWS = Object.freeze([
  '..###..',
  '.#####.',
  '#######',
  '#######',
  '#######',
  '.#####.',
  '..###..',
]);
const DASHED_DISC_ROWS = Object.freeze([
  '..#.#..',
  '.#...#.',
  '#.....#',
  '.......',
  '#.....#',
  '.#...#.',
  '..#.#..',
]);
const SQUARE_ROWS = Object.freeze(Array.from({ length: CHROME_SWATCH_NATIVE_SIZE }, () => '#'.repeat(CHROME_SWATCH_NATIVE_SIZE)));
const HP_ROWS = Object.freeze(['##########', '##########', '##########']);

export function renderChromeSwatchBitmap(
  ink: PaletteColorRef,
  shape: ChromeSwatchShape,
): GeneratedChromeBitmap {
  const rows = (() => {
    switch (shape) {
      case 'disc': return DISC_ROWS;
      case 'dashed-disc': return DASHED_DISC_ROWS;
      case 'square': return SQUARE_ROWS;
      case 'hp': return HP_ROWS;
    }
  })();
  return generatedSvg(rows[0]!.length, rows.length, BOARD_CHROME_ART_SCALE, [rectGroup(runs(rows), ink)]);
}

/** High and low chrome inks used by every badge; exported so contrast tests pin both branches. */
export const BADGE_DARK_INK: PaletteColorRef = neutral(0);
export const BADGE_LIGHT_INK: PaletteColorRef = neutral(8);
