import {
  GLYPH_ADVANCE,
  GLYPH_HEIGHT,
  PIXEL_FONT_GLYPHS,
  normalizeLabelText,
} from './pixel-font';
import { neutral, paletteHex, type PaletteColorRef } from './palette';
import { type Bitmap, type Rgba } from './bitmap';

export const BOARD_CHROME_ART_SCALE = 2;
export const CREATURE_BADGE_NATIVE_WIDTH = 15;
export const CREATURE_BADGE_NATIVE_HEIGHT = 11;
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

export const CHROME_FRAME_DARK_INK: PaletteColorRef = neutral(0);
export const CHROME_FRAME_LIGHT_INK: PaletteColorRef = neutral(8);

interface PixelRun {
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

function runs(
  rows: readonly string[],
  originX = 0,
  originY = 0,
): readonly PixelRun[] {
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

function rectGroup(
  pixelRuns: readonly PixelRun[],
  fill: PaletteColorRef,
): string {
  return `<g fill="${paletteHex(fill)}">${pixelRuns
    .map(
      (run) =>
        `<rect x="${String(run.x)}" y="${String(run.y)}" width="${String(run.width)}" height="1"/>`,
    )
    .join('')}</g>`;
}

function rowMask(
  width: number,
  height: number,
  predicate: (x: number, y: number) => boolean,
): readonly string[] {
  return Object.freeze(
    Array.from({ length: height }, (_unused, y) =>
      Array.from({ length: width }, (_cell, x) =>
        predicate(x, y) ? '#' : '.',
      ).join(''),
    ),
  );
}

function sourcePixel(rows: readonly string[], x: number, y: number): boolean {
  return rows[y]?.[x] === '#';
}

function outerBoundaryRows(rows: readonly string[]): {
  readonly lit: readonly string[];
  readonly shadow: readonly string[];
  readonly opaque: readonly string[];
} {
  const sourceWidth = rows[0]?.length ?? 0;
  const width = sourceWidth + 2;
  const height = rows.length + 2;
  const boundary = (x: number, y: number): boolean => {
    if (sourcePixel(rows, x - 1, y - 1)) return false;
    return (
      sourcePixel(rows, x - 2, y - 1) ||
      sourcePixel(rows, x, y - 1) ||
      sourcePixel(rows, x - 1, y - 2) ||
      sourcePixel(rows, x - 1, y)
    );
  };
  const litSide = (x: number, y: number): boolean =>
    x + y < (width + height - 2) / 2;
  return {
    lit: rowMask(width, height, (x, y) => boundary(x, y) && litSide(x, y)),
    shadow: rowMask(width, height, (x, y) => boundary(x, y) && !litSide(x, y)),
    opaque: rowMask(
      width,
      height,
      (x, y) => boundary(x, y) || sourcePixel(rows, x - 1, y - 1),
    ),
  };
}

function generatedSvg(
  width: number,
  height: number,
  scale: number,
  layers: readonly string[],
): GeneratedChromeBitmap {
  if (!Number.isSafeInteger(scale) || scale < 1)
    throw new RangeError('Chrome pixel-art scale must be a positive integer.');
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

function hexRgba(hex: string): Rgba {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu);
  if (
    match?.[1] === undefined ||
    match[2] === undefined ||
    match[3] === undefined
  ) {
    throw new TypeError(`Generated chrome contains invalid colour ${hex}.`);
  }
  return {
    red: Number.parseInt(match[1], 16),
    green: Number.parseInt(match[2], 16),
    blue: Number.parseInt(match[3], 16),
    alpha: 255,
  };
}

/** Rasterizes the generated crisp-edge SVG at its declared integer CSS scale for review compositions. */
export function compositeGeneratedChromeBitmap(
  target: Bitmap,
  art: GeneratedChromeBitmap,
  originX: number,
  originY: number,
): void {
  const scale = art.cssWidth / art.nativeWidth;
  if (
    !Number.isSafeInteger(scale) ||
    scale < 1 ||
    art.cssHeight / art.nativeHeight !== scale
  ) {
    throw new RangeError(
      'Generated chrome bitmap must retain one integer scale on both axes.',
    );
  }
  for (const group of art.svg.matchAll(
    /<g fill="(#[0-9a-f]{6})">([\s\S]*?)<\/g>/gu,
  )) {
    if (group[1] === undefined || group[2] === undefined)
      throw new Error('Generated chrome group is incomplete.');
    const ink = hexRgba(group[1]);
    for (const rectangle of group[2].matchAll(
      /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"\/>/gu,
    )) {
      const x = Number(rectangle[1]);
      const y = Number(rectangle[2]);
      const width = Number(rectangle[3]);
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < width * scale; dx += 1) {
          target.blendRgba(
            originX + x * scale + dx,
            originY + y * scale + dy,
            ink,
          );
        }
      }
    }
  }
}

function numeralRows(number: number): readonly string[] {
  if (!Number.isSafeInteger(number) || number < 1 || number > 12) {
    throw new RangeError('Creature badge art supports numerals 1..12.');
  }
  const label = normalizeLabelText(String(number));
  return Array.from({ length: GLYPH_HEIGHT }, (_unused, y) =>
    Array.from(label)
      .map((digit, index) => {
        const glyph = PIXEL_FONT_GLYPHS.get(digit);
        if (glyph === undefined)
          throw new Error(`Pixel font has no badge digit ${digit}.`);
        const gap =
          index === label.length - 1
            ? ''
            : '.'.repeat(GLYPH_ADVANCE - glyph[0]!.length);
        return `${glyph[y]!}${gap}`;
      })
      .join(''),
  );
}

/** One generated, palette-closed badge image shared by the token and roster. */
export function renderCreatureBadgeBitmap(
  number: number,
  disc: PaletteColorRef,
  numeralInk: PaletteColorRef,
): CreatureBadgeBitmap {
  const frame = outerBoundaryRows(BADGE_ROWS);
  const digits = numeralRows(number);
  const width = digits[0]?.length ?? 0;
  const origin = {
    x: Math.floor((CREATURE_BADGE_NATIVE_WIDTH - width) / 2),
    y: Math.floor((CREATURE_BADGE_NATIVE_HEIGHT - digits.length) / 2),
  };
  return {
    ...generatedSvg(
      CREATURE_BADGE_NATIVE_WIDTH,
      CREATURE_BADGE_NATIVE_HEIGHT,
      BOARD_CHROME_ART_SCALE,
      [
        rectGroup(runs(BADGE_ROWS, 1, 1), disc),
        rectGroup(runs(frame.lit), CHROME_FRAME_LIGHT_INK),
        rectGroup(runs(frame.shadow), CHROME_FRAME_DARK_INK),
        rectGroup(runs(digits, origin.x, origin.y), numeralInk),
      ],
    ),
    opaqueRows: frame.opaque,
    numeralRows: digits,
    numeralOrigin: origin,
  };
}

function ringRows(size: number): readonly string[] {
  const shapeInset = (coordinate: number, shapeSize: number): number =>
    coordinate < 2 || coordinate >= shapeSize - 2
      ? 3
      : coordinate < 4 || coordinate >= shapeSize - 4
        ? 1
        : 0;
  return Object.freeze(
    Array.from({ length: size }, (_unused, y) => {
      const inset = shapeInset(y, size);
      return Array.from({ length: size }, (_cell, x) => {
        const outer = x >= inset && x < size - inset;
        const innerSize = size - 4;
        const innerInset =
          y >= 2 && y < size - 2 ? shapeInset(y - 2, innerSize) : 0;
        const inner =
          y >= 2 &&
          y < size - 2 &&
          x >= innerInset + 2 &&
          x < size - innerInset - 2;
        return outer && !inner ? '#' : '.';
      }).join('');
    }),
  );
}

/** A deliberately jagged, integer-scaled pixel ring; browsers never synthesize a curved edge. */
export function renderCreatureRingBitmap(
  ink: PaletteColorRef,
  nativeSize: number = CREATURE_RING_NATIVE_SIZE,
): GeneratedChromeBitmap {
  if (
    !Number.isSafeInteger(nativeSize) ||
    nativeSize < 9 ||
    nativeSize % 2 === 0
  ) {
    throw new RangeError(
      'Creature ring native size must be an odd integer of at least nine pixels.',
    );
  }
  const ring = ringRows(nativeSize);
  const boundary = rowMask(nativeSize, nativeSize, (x, y) => {
    if (!sourcePixel(ring, x, y)) return false;
    return (
      !sourcePixel(ring, x - 1, y) ||
      !sourcePixel(ring, x, y - 1) ||
      !sourcePixel(ring, x + 1, y) ||
      !sourcePixel(ring, x, y + 1)
    );
  });
  const litBoundary = rowMask(
    nativeSize,
    nativeSize,
    (x, y) => sourcePixel(boundary, x, y) && x + y < nativeSize - 1,
  );
  const shadowBoundary = rowMask(
    nativeSize,
    nativeSize,
    (x, y) => sourcePixel(boundary, x, y) && x + y >= nativeSize - 1,
  );
  return generatedSvg(nativeSize, nativeSize, BOARD_CHROME_ART_SCALE, [
    rectGroup(runs(ring), ink),
    rectGroup(runs(litBoundary), CHROME_FRAME_LIGHT_INK),
    rectGroup(runs(shadowBoundary), CHROME_FRAME_DARK_INK),
  ]);
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
const SQUARE_ROWS = Object.freeze(
  Array.from({ length: CHROME_SWATCH_NATIVE_SIZE }, () =>
    '#'.repeat(CHROME_SWATCH_NATIVE_SIZE),
  ),
);
const HP_ROWS = Object.freeze(['##########', '##########', '##########']);

export function renderChromeSwatchBitmap(
  ink: PaletteColorRef,
  shape: ChromeSwatchShape,
): GeneratedChromeBitmap {
  const rows = (() => {
    switch (shape) {
      case 'disc':
        return DISC_ROWS;
      case 'dashed-disc':
        return DASHED_DISC_ROWS;
      case 'square':
        return SQUARE_ROWS;
      case 'hp':
        return HP_ROWS;
    }
  })();
  return generatedSvg(rows[0]!.length, rows.length, BOARD_CHROME_ART_SCALE, [
    rectGroup(runs(rows), ink),
  ]);
}

/** High and low chrome inks used by every badge; exported so contrast tests pin both branches. */
export const BADGE_DARK_INK: PaletteColorRef = neutral(0);
export const BADGE_LIGHT_INK: PaletteColorRef = neutral(8);
