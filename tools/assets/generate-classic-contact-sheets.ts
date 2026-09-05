import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Bitmap } from '../../src/assets/bitmap';
import { PIXEL_FONT_GLYPHS } from '../../src/assets/pixel-font';
import { neutral, ramp } from '../../src/assets/palette';
import { TILE_SIZE, paintRecipe, tokenRecipe } from '../../src/assets/pixel-art';
import { encodePng } from '../../src/assets/png';
import { STARTER_ART_INPUTS } from '../../src/assets/starter-art-inputs';

const GAP = 8;
const COLUMNS = 10;

function composite(target: Bitmap, source: Bitmap, originX: number, originY: number): void {
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    const pixel = source.get(x, y);
    if (pixel.alpha > 0) target.blendRgba(originX + x, originY + y, pixel);
  }
}

function badge(target: Bitmap, originX: number, originY: number): void {
  target.rect(originX + 1, originY, 24, 18, ramp('moss', 0));
  target.rect(originX, originY + 2, 26, 14, ramp('moss', 0));
  const numeral = PIXEL_FONT_GLYPHS.get('1');
  if (numeral === undefined) throw new Error('Pixel font lacks numeral 1.');
  numeral.forEach((row, y) => Array.from(row).forEach((cell, x) => {
    if (cell === '#') target.rect(originX + 10 + x * 2, originY + 2 + y * 2, 2, 2, neutral(8));
  }));
}

function cellComposite(target: Bitmap, originX: number, originY: number, index: number): void {
  const floor = paintRecipe({ kind: 'floor', material: 'stone', variant: (index % 4) as 0 | 1 | 2 | 3 });
  const overlay = paintRecipe({ kind: 'overlay', material: 'semantic', effect: index === 0 ? 'light-bright' : index === 1 ? 'difficult' : index === 2 ? 'obscurement-heavy' : 'glyph-fog' });
  const archetype = ['fighter', 'wizard', 'beast', 'construct'][index] as 'fighter' | 'wizard' | 'beast' | 'construct';
  const token = paintRecipe(tokenRecipe(archetype, index < 2 ? 'party' : 'foe'));
  const ring = paintRecipe({ kind: 'focus', material: 'semantic', mark: index % 2 === 0 ? 'active' : 'hidden' });
  composite(target, floor, originX, originY);
  composite(target, overlay, originX, originY);
  composite(target, token, originX, originY);
  composite(target, ring, originX, originY);
  badge(target, originX + Math.floor((TILE_SIZE - 26) / 2), originY + 2);
}

function renderContactSheet(): Bitmap {
  const inventoryRows = Math.ceil(STARTER_ART_INPUTS.length / COLUMNS);
  const inventoryTop = TILE_SIZE * 4 + GAP * 8;
  const compositesTop = inventoryTop + inventoryRows * (TILE_SIZE + GAP) + GAP * 2;
  const width = GAP * 2 + COLUMNS * TILE_SIZE + (COLUMNS - 1) * GAP;
  const height = compositesTop + TILE_SIZE + GAP * 2;
  const sheet = new Bitmap(width, height);
  sheet.fill(neutral(0));

  for (let variant = 0; variant < 4; variant += 1) composite(sheet, paintRecipe({ kind: 'floor', material: 'stone', variant: variant as 0 | 1 | 2 | 3 }), GAP + variant * TILE_SIZE, GAP);

  const wallPieces = ['nw', 'n', 'ne', 'w', 'n', 'e', 'sw', 's', 'se'] as const;
  wallPieces.forEach((piece, index) => composite(sheet, paintRecipe({ kind: 'wall', material: 'stone', piece }), GAP + (index % 3) * TILE_SIZE, TILE_SIZE + GAP * 3 + Math.floor(index / 3) * TILE_SIZE));

  STARTER_ART_INPUTS.forEach((input, index) => composite(sheet, paintRecipe(input.recipe), GAP + (index % COLUMNS) * (TILE_SIZE + GAP), inventoryTop + Math.floor(index / COLUMNS) * (TILE_SIZE + GAP)));
  for (let index = 0; index < 4; index += 1) cellComposite(sheet, GAP + index * TILE_SIZE, compositesTop, index);
  return sheet;
}

const iterationFlag = process.argv.indexOf('--iteration');
const iteration = iterationFlag === -1 ? '1' : process.argv[iterationFlag + 1];
if (iteration === undefined || !/^[1-9][0-9]*$/u.test(iteration)) throw new Error('--iteration requires a positive integer.');
const outputDirectory = resolve('test-results/classic-contact-sheets');
mkdirSync(outputDirectory, { recursive: true });
const outputPath = resolve(outputDirectory, `iteration-${iteration}.png`);
const bitmap = renderContactSheet();
writeFileSync(outputPath, encodePng(bitmap.width, bitmap.height, bitmap.data));
process.stdout.write(`${outputPath} ${String(bitmap.width)}x${String(bitmap.height)}\n`);
