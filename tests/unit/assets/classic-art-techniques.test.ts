import { describe, expect, it } from 'vitest';
import { Bitmap, type Rgba } from '../../../src/assets/bitmap';
import {
  ART_MATERIALS,
  MATERIAL_RESPONSES,
  TILE_SIZE,
  TOKEN_ARCHETYPES,
  paintRecipe,
  tokenRecipe,
  type ArtRecipe,
} from '../../../src/assets/pixel-art';
import {
  NEUTRAL_STEPS,
  PALETTE_RAMPS,
  RAMP_STEPS,
  neutral,
  paletteRgb,
  ramp,
  type PaletteColorRef,
} from '../../../src/assets/palette';
import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';

const EXPECTED_NATIVE_SIZE = 128;
/** Fine accents are deliberately sparse; four percent still rejects every 2x enlargement. */
const MIN_NATIVE_DETAIL_FRACTION = 0.04;

type AssetClass = ArtRecipe['kind'];

const COLOR_BUDGET: Readonly<Record<AssetClass, number>> = {
  floor: 6,
  wall: 7,
  door: 16,
  shade: 2,
  terrain: 16,
  overlay: 10,
  fog: 4,
  focus: 3,
  event: 3,
  token: 20,
  'token-dead': 10,
};

function rgbaKey(color: Rgba): string {
  return `${String(color.red)},${String(color.green)},${String(color.blue)},${String(color.alpha)}`;
}

function opaquePixelCount(bitmap: Bitmap): number {
  let count = 0;
  for (let index = 3; index < bitmap.data.length; index += 4) {
    if (bitmap.data[index]! > 0) count += 1;
  }
  return count;
}

function distinctColors(bitmap: Bitmap): number {
  const colors = new Set<string>();
  for (let y = 0; y < bitmap.height; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      const color = bitmap.get(x, y);
      if (color.alpha > 0) colors.add(rgbaKey(color));
    }
  }
  return colors.size;
}

function minimumRgbDistance(bitmap: Bitmap): number {
  const unique = new Map<string, readonly [number, number, number]>();
  for (let y = 0; y < bitmap.height; y += 1) for (let x = 0; x < bitmap.width; x += 1) {
    const { red, green, blue, alpha } = bitmap.get(x, y);
    if (alpha > 0) unique.set(`${String(red)},${String(green)},${String(blue)}`, [red, green, blue]);
  }
  const colors = [...unique.values()];
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < colors.length; left += 1) for (let right = left + 1; right < colors.length; right += 1) {
    const a = colors[left]!;
    const b = colors[right]!;
    minimum = Math.min(minimum, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  }
  return minimum;
}

function downscaleThenUpscale(bitmap: Bitmap): Bitmap {
  const rebuilt = new Bitmap(bitmap.width, bitmap.height);
  for (let y = 0; y < bitmap.height; y += 2) {
    for (let x = 0; x < bitmap.width; x += 2) {
      const sample = bitmap.get(x, y);
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) rebuilt.blendRgba(x + dx, y + dy, sample);
      }
    }
  }
  return rebuilt;
}

function nativeDetailFraction(bitmap: Bitmap): number {
  const rebuilt = downscaleThenUpscale(bitmap);
  let changed = 0;
  for (let index = 0; index < bitmap.data.length; index += 4) {
    const alpha = bitmap.data[index + 3]!;
    if (alpha === 0 && rebuilt.data[index + 3] === 0) continue;
    if (
      bitmap.data[index] !== rebuilt.data[index]
      || bitmap.data[index + 1] !== rebuilt.data[index + 1]
      || bitmap.data[index + 2] !== rebuilt.data[index + 2]
      || alpha !== rebuilt.data[index + 3]
    ) changed += 1;
  }
  return changed / Math.max(1, opaquePixelCount(bitmap));
}

function isolatedColorIslands(bitmap: Bitmap): number {
  let islands = 0;
  for (let y = 0; y < bitmap.height; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      const color = bitmap.get(x, y);
      if (color.alpha === 0) continue;
      const key = rgbaKey(color);
      const neighbours = [
        bitmap.get(x - 1, y), bitmap.get(x + 1, y),
        bitmap.get(x, y - 1), bitmap.get(x, y + 1),
      ];
      if (neighbours.every((candidate) => rgbaKey(candidate) !== key)) islands += 1;
    }
  }
  return islands;
}

function sharedBustSilhouette(party: Bitmap, foe: Bitmap): readonly number[] {
  const cropBottom = Math.floor(party.height * 0.86);
  const bins = 16;
  const descriptor: number[] = [];
  for (let bin = 0; bin < bins; bin += 1) {
    const y0 = Math.floor(bin * cropBottom / bins);
    const y1 = Math.floor((bin + 1) * cropBottom / bins);
    let left = party.width;
    let right = -1;
    let area = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = 0; x < party.width; x += 1) {
        const partyPixel = party.get(x, y);
        const foePixel = foe.get(x, y);
        if (partyPixel.alpha === 0 || rgbaKey(partyPixel) !== rgbaKey(foePixel)) continue;
        if (rgbaKey(partyPixel) === colorKey({ ramp: 'neutral', step: 1 })) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        area += 1;
      }
    }
    descriptor.push(left / party.width, (right + 1) / party.width, area / Math.max(1, (y1 - y0) * party.width));
  }
  return descriptor;
}

function descriptorDistance(left: readonly number[], right: readonly number[]): number {
  return left.reduce((sum, value, index) => sum + Math.abs(value - right[index]!), 0) / left.length;
}

function colorKey(reference: PaletteColorRef, alpha = 255): string {
  const color = paletteRgb(reference);
  return rgbaKey({ ...color, alpha });
}

const PALETTE_RGB = new Set([
  ...PALETTE_RAMPS.flatMap((rampName) => RAMP_STEPS.map((step) => colorKey({ ramp: rampName, step }).split(',').slice(0, 3).join(','))),
  ...NEUTRAL_STEPS.map((step) => colorKey({ ramp: 'neutral', step }).split(',').slice(0, 3).join(',')),
]);

function directionalCentroid(bitmap: Bitmap): { readonly highlight: number; readonly shadow: number } {
  const highlightKeys = new Set([
    colorKey(ramp('stone', 5)), colorKey(ramp('stone', 6)),
    colorKey(ramp('metal', 5)), colorKey(ramp('metal', 6)),
  ]);
  const shadowKeys = new Set([
    colorKey(ramp('stone', 0)), colorKey(ramp('stone', 1)),
    colorKey(ramp('metal', 0)), colorKey(ramp('metal', 1)),
  ]);
  let highlightSum = 0;
  let highlightCount = 0;
  let shadowSum = 0;
  let shadowCount = 0;
  for (let y = 0; y < bitmap.height; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      const key = rgbaKey(bitmap.get(x, y));
      if (highlightKeys.has(key)) {
        highlightSum += x + y;
        highlightCount += 1;
      }
      if (shadowKeys.has(key)) {
        shadowSum += x + y;
        shadowCount += 1;
      }
    }
  }
  expect(highlightCount).toBeGreaterThan(0);
  expect(shadowCount).toBeGreaterThan(0);
  return { highlight: highlightSum / highlightCount, shadow: shadowSum / shadowCount };
}

function twoByUpscale(source: Bitmap): Bitmap {
  const result = new Bitmap(source.width * 2, source.height * 2);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const pixel = source.get(x, y);
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) result.blendRgba(x * 2 + dx, y * 2 + dy, pixel);
      }
    }
  }
  return result;
}

describe('classic native-density and art-technique invariants', () => {
  it('Part 2(a): carries a closed material response on every recipe', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    expect(Object.keys(MATERIAL_RESPONSES).sort()).toEqual([...ART_MATERIALS].sort());
    for (const input of STARTER_ART_INPUTS) expect(MATERIAL_RESPONSES[input.recipe.material]).toBeDefined();
    expect(MATERIAL_RESPONSES.metal.specular).toBe('single-cluster');
    expect(MATERIAL_RESPONSES.stone.specular).toBe('none');
    expect(MATERIAL_RESPONSES.cloth.mark).toBe('broad-fold');
    expect(MATERIAL_RESPONSES.skin.mark).toBe('warm-plane');
  });

  it('authors every generated class on the 128-pixel lattice without resampling', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    for (const input of STARTER_ART_INPUTS) {
      const bitmap = paintRecipe(input.recipe);
      expect([bitmap.width, bitmap.height], input.id).toEqual([EXPECTED_NATIVE_SIZE, EXPECTED_NATIVE_SIZE]);
    }
  });

  it('uses compact declared colour budgets with binary alpha outside semantic overlays', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    const overBudget: string[] = [];
    const nonBinaryAlpha: string[] = [];
    const outsidePalette: string[] = [];
    for (const input of STARTER_ART_INPUTS) {
      const bitmap = paintRecipe(input.recipe);
      const colors = distinctColors(bitmap);
      if (colors > COLOR_BUDGET[input.recipe.kind]) overBudget.push(`${input.id}:${String(colors)}`);
      for (let index = 0; index < bitmap.data.length; index += 4) {
        if (bitmap.data[index + 3] === 0) continue;
        const rgb = `${String(bitmap.data[index])},${String(bitmap.data[index + 1])},${String(bitmap.data[index + 2])}`;
        if (!PALETTE_RGB.has(rgb)) outsidePalette.push(`${input.id}:${rgb}`);
      }
      if (input.recipe.kind === 'overlay' || input.recipe.kind === 'fog' || input.recipe.kind === 'shade') continue;
      for (let index = 3; index < bitmap.data.length; index += 4) {
        const alpha = bitmap.data[index]!;
        if (alpha !== 0 && alpha !== 255) nonBinaryAlpha.push(`${input.id}:${String(index)}`);
      }
    }
    expect(overBudget).toEqual([]);
    expect(nonBinaryAlpha).toEqual([]);
    expect(outsidePalette).toEqual([]);
  });

  it('grounds every freestanding object with the one shared contact-shadow colour', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    const shadow = colorKey(neutral(1));
    for (const input of STARTER_ART_INPUTS.filter(({ recipe }) =>
      recipe.kind === 'terrain' || recipe.kind === 'token' || recipe.kind === 'token-dead')) {
      const bitmap = paintRecipe(input.recipe);
      let shadowPixels = 0;
      for (let y = 0; y < bitmap.height; y += 1) for (let x = 0; x < bitmap.width; x += 1) {
        if (rgbaKey(bitmap.get(x, y)) === shadow) shadowPixels += 1;
      }
      expect(shadowPixels, input.id).toBeGreaterThan(12);
    }
  });

  it('keeps every colour choice perceptibly separate from its neighbours', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    for (const input of STARTER_ART_INPUTS) {
      expect(minimumRgbDistance(paintRecipe(input.recipe)), input.id).toBeGreaterThanOrEqual(8);
    }
  });

  it('keeps structured texture in clusters instead of isolated speckle', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    for (const input of STARTER_ART_INPUTS.filter(({ recipe }) => ['floor', 'wall', 'door', 'terrain'].includes(recipe.kind))) {
      expect(isolatedColorIslands(paintRecipe(input.recipe)), input.id).toBeLessThanOrEqual(24);
    }
    const speckled = new Bitmap(128, 128);
    speckled.rect(0, 0, 128, 128, ramp('stone', 3));
    for (let index = 0; index < 40; index += 1) speckled.put(2 + index * 3, 17 + (index % 3) * 5, ramp('stone', 1));
    expect(isolatedColorIslands(speckled)).toBeGreaterThan(24);
  });

  it('gives every archetype a measurably distinct alpha-mask silhouette', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    const silhouettes = TOKEN_ARCHETYPES.map((archetype) => ({
      archetype,
      descriptor: sharedBustSilhouette(
        paintRecipe(tokenRecipe(archetype, 'party')),
        paintRecipe(tokenRecipe(archetype, 'foe')),
      ),
    }));
    for (let left = 0; left < silhouettes.length; left += 1) {
      for (let right = left + 1; right < silhouettes.length; right += 1) {
        const a = silhouettes[left]!;
        const b = silhouettes[right]!;
        expect(descriptorDistance(a.descriptor, b.descriptor), `${a.archetype}/${b.archetype}`).toBeGreaterThan(0.012);
      }
    }
  });

  it('places convex highlights toward the upper-left and shadows toward the lower-right', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    const pillar = paintRecipe({ kind: 'terrain', material: 'stone', object: 'pillar' });
    const centroids = directionalCentroid(pillar);
    expect(centroids.highlight).toBeLessThan(centroids.shadow - 12);

    const pillow = new Bitmap(128, 128);
    pillow.disc(64, 64, 44, ramp('stone', 1));
    pillow.disc(64, 64, 32, ramp('stone', 3));
    pillow.disc(64, 64, 18, ramp('stone', 6));
    const rejected = directionalCentroid(pillow);
    expect(Math.abs(rejected.highlight - rejected.shadow)).toBeLessThan(1);
  });

  it('contains native one-pixel decisions that cannot be reconstructed through 64 pixels', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    for (const input of STARTER_ART_INPUTS) {
      expect(nativeDetailFraction(paintRecipe(input.recipe)), input.id).toBeGreaterThanOrEqual(MIN_NATIVE_DETAIL_FRACTION);
    }

    const low = new Bitmap(64, 64);
    low.rect(5, 5, 54, 54, ramp('stone', 3));
    low.line(8, 8, 50, 40, ramp('stone', 5));
    expect(nativeDetailFraction(twoByUpscale(low))).toBe(0);
  });

  it('Part 2(g): keeps outlines selective, palette-contained, and lighter on the key-facing contour', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    const token = paintRecipe(tokenRecipe('fighter', 'party'));
    const pureBlack = rgbaKey({ red: 0, green: 0, blue: 0, alpha: 255 });
    let pureBlackCount = 0;
    for (let y = 0; y < token.height; y += 1) for (let x = 0; x < token.width; x += 1) {
      if (rgbaKey(token.get(x, y)) === pureBlack) pureBlackCount += 1;
    }
    expect(pureBlackCount).toBe(0);
    const lit = colorKey(ramp('metal', 3));
    const dark = colorKey(ramp('metal', 0));
    let litPosition = 0;
    let litCount = 0;
    let darkPosition = 0;
    let darkCount = 0;
    for (let y = 0; y < token.height; y += 1) for (let x = 0; x < token.width; x += 1) {
      const key = rgbaKey(token.get(x, y));
      if (key === lit) { litPosition += x + y; litCount += 1; }
      if (key === dark) { darkPosition += x + y; darkCount += 1; }
    }
    expect(litCount).toBeGreaterThan(0);
    expect(darkCount).toBeGreaterThan(0);
    expect(litPosition / litCount).toBeLessThan(darkPosition / darkCount);
  });
});
