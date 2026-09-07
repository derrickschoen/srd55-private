import { describe, expect, it } from 'vitest';
import { Bitmap, type Rgba } from '../../../src/assets/bitmap';
import {
  ART_MATERIALS,
  FLOOR_VARIANTS,
  MATERIAL_RESPONSES,
  TILE_SIZE,
  TOKEN_ARCHETYPES,
  paintRecipe,
  paintTokenBust,
  tokenRecipe,
  type ArtRecipe,
  type TokenArchetype,
} from '../../../src/assets/pixel-art';
import {
  NEUTRAL_STEPS,
  PALETTE_RAMPS,
  RAMP_STEPS,
  neutral,
  paletteRgb,
  ramp,
  type PaletteRamp,
  type PaletteColorRef,
} from '../../../src/assets/palette';
import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';

const EXPECTED_NATIVE_SIZE = 128;
/** Fine accents are deliberately sparse; four percent still rejects every 2x enlargement. */
const MIN_NATIVE_DETAIL_FRACTION = 0.04;
const TWO_BY_CHROME_OVERLAY_IDS = new Set([
  'art.map.overlay.light-glyph-bright.v1',
  'art.map.overlay.light-glyph-dim.v1',
  'art.map.overlay.light-glyph-dark.v1',
  'art.map.overlay.glyph-door-closed.v1',
  'art.map.overlay.glyph-door-open.v1',
  'art.map.overlay.glyph-blocked.v1',
  'art.map.overlay.glyph-fog.v1',
  'art.map.overlay.glyph-obscured.v1',
]);

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
  for (let y = 0; y < bitmap.height; y += 1)
    for (let x = 0; x < bitmap.width; x += 1) {
      const { red, green, blue, alpha } = bitmap.get(x, y);
      if (alpha > 0)
        unique.set(`${String(red)},${String(green)},${String(blue)}`, [
          red,
          green,
          blue,
        ]);
    }
  const colors = [...unique.values()];
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < colors.length; left += 1)
    for (let right = left + 1; right < colors.length; right += 1) {
      const a = colors[left]!;
      const b = colors[right]!;
      minimum = Math.min(
        minimum,
        Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
      );
    }
  return minimum;
}

function downscaleThenUpscale(bitmap: Bitmap): Bitmap {
  const rebuilt = new Bitmap(bitmap.width, bitmap.height);
  for (let y = 0; y < bitmap.height; y += 2) {
    for (let x = 0; x < bitmap.width; x += 2) {
      const sample = bitmap.get(x, y);
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1)
          rebuilt.blendRgba(x + dx, y + dy, sample);
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
      bitmap.data[index] !== rebuilt.data[index] ||
      bitmap.data[index + 1] !== rebuilt.data[index + 1] ||
      bitmap.data[index + 2] !== rebuilt.data[index + 2] ||
      alpha !== rebuilt.data[index + 3]
    )
      changed += 1;
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
        bitmap.get(x - 1, y),
        bitmap.get(x + 1, y),
        bitmap.get(x, y - 1),
        bitmap.get(x, y + 1),
      ];
      if (neighbours.every((candidate) => rgbaKey(candidate) !== key))
        islands += 1;
    }
  }
  return islands;
}

function sharedBustSilhouette(party: Bitmap, foe: Bitmap): readonly number[] {
  const cropBottom = Math.floor(party.height * 0.86);
  const bins = 16;
  const descriptor: number[] = [];
  for (let bin = 0; bin < bins; bin += 1) {
    const y0 = Math.floor((bin * cropBottom) / bins);
    const y1 = Math.floor(((bin + 1) * cropBottom) / bins);
    let left = party.width;
    let right = -1;
    let area = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = 0; x < party.width; x += 1) {
        const partyPixel = party.get(x, y);
        const foePixel = foe.get(x, y);
        if (partyPixel.alpha === 0 || rgbaKey(partyPixel) !== rgbaKey(foePixel))
          continue;
        if (rgbaKey(partyPixel) === colorKey({ ramp: 'neutral', step: 1 }))
          continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        area += 1;
      }
    }
    descriptor.push(
      left / party.width,
      (right + 1) / party.width,
      area / Math.max(1, (y1 - y0) * party.width),
    );
  }
  return descriptor;
}

function descriptorDistance(
  left: readonly number[],
  right: readonly number[],
): number {
  return (
    left.reduce(
      (sum, value, index) => sum + Math.abs(value - right[index]!),
      0,
    ) / left.length
  );
}

function colorKey(reference: PaletteColorRef, alpha = 255): string {
  const color = paletteRgb(reference);
  return rgbaKey({ ...color, alpha });
}

const PALETTE_RGB = new Set([
  ...PALETTE_RAMPS.flatMap((rampName) =>
    RAMP_STEPS.map((step) =>
      colorKey({ ramp: rampName, step }).split(',').slice(0, 3).join(','),
    ),
  ),
  ...NEUTRAL_STEPS.map((step) =>
    colorKey({ ramp: 'neutral', step }).split(',').slice(0, 3).join(','),
  ),
]);

function directionalCentroid(bitmap: Bitmap): {
  readonly highlight: number;
  readonly shadow: number;
} {
  const highlightKeys = new Set([
    colorKey(ramp('stone', 5)),
    colorKey(ramp('stone', 6)),
    colorKey(ramp('metal', 5)),
    colorKey(ramp('metal', 6)),
  ]);
  const shadowKeys = new Set([
    colorKey(ramp('stone', 0)),
    colorKey(ramp('stone', 1)),
    colorKey(ramp('metal', 0)),
    colorKey(ramp('metal', 1)),
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
  return {
    highlight: highlightSum / highlightCount,
    shadow: shadowSum / shadowCount,
  };
}

interface BustLightRegion {
  readonly bounds: readonly [number, number, number, number];
  readonly highlight: readonly PaletteColorRef[];
  readonly shadow: readonly PaletteColorRef[];
}

interface BustLightProfile {
  readonly head: BustLightRegion;
  readonly body: BustLightRegion;
}

const region = (
  bounds: readonly [number, number, number, number],
  highlight: readonly PaletteColorRef[],
  shadow: readonly PaletteColorRef[],
): BustLightRegion => ({ bounds, highlight, shadow });

const BUST_LIGHT_PROFILES: Readonly<Record<TokenArchetype, BustLightProfile>> =
  {
    fighter: {
      head: region([35, 15, 85, 68], [ramp('skin', 5)], [ramp('skin', 1)]),
      body: region([15, 66, 120, 108], [ramp('metal', 6)], [ramp('metal', 1)]),
    },
    wizard: {
      head: region([35, 30, 80, 70], [ramp('skin', 5)], [ramp('skin', 1)]),
      body: region(
        [20, 68, 105, 108],
        [ramp('cloth-cool', 6)],
        [ramp('cloth-cool', 1)],
      ),
    },
    cleric: {
      head: region([40, 25, 88, 70], [ramp('skin', 5)], [ramp('skin', 1)]),
      body: region(
        [20, 68, 108, 108],
        [ramp('cloth-warm', 6)],
        [ramp('cloth-warm', 1)],
      ),
    },
    rogue: {
      head: region([35, 30, 80, 72], [ramp('skin', 5)], [ramp('skin', 1)]),
      body: region([25, 68, 105, 108], [ramp('earth', 6)], [ramp('earth', 1)]),
    },
    ranger: {
      head: region([35, 30, 82, 72], [ramp('skin', 5)], [ramp('skin', 1)]),
      body: region([20, 68, 105, 108], [ramp('earth', 6)], [ramp('earth', 1)]),
    },
    brute: {
      head: region([28, 15, 90, 72], [ramp('skin', 5)], [ramp('skin', 1)]),
      body: region([5, 65, 120, 108], [ramp('skin', 6)], [ramp('skin', 1)]),
    },
    beast: {
      head: region([35, 20, 105, 72], [ramp('earth', 5)], [ramp('earth', 1)]),
      body: region([10, 65, 118, 108], [ramp('earth', 3)], [ramp('earth', 2)]),
    },
    undead: {
      head: region([35, 20, 82, 70], [neutral(8)], [neutral(7)]),
      body: region([25, 70, 100, 108], [ramp('stone', 6)], [ramp('stone', 1)]),
    },
    fiend: {
      head: region(
        [32, 18, 92, 72],
        [ramp('cloth-warm', 5)],
        [ramp('cloth-warm', 1)],
      ),
      body: region(
        [12, 65, 118, 108],
        [ramp('cloth-warm', 6)],
        [ramp('cloth-warm', 1)],
      ),
    },
    ooze: {
      head: region(
        [15, 15, 82, 85],
        [ramp('moss', 5), ramp('moss', 6)],
        [ramp('moss', 2)],
      ),
      body: region(
        [15, 60, 115, 118],
        [ramp('moss', 3), ramp('moss', 4)],
        [ramp('moss', 1), ramp('moss', 2)],
      ),
    },
    construct: {
      head: region([28, 15, 90, 68], [ramp('stone', 5)], [ramp('stone', 1)]),
      body: region(
        [15, 68, 115, 110],
        [ramp('metal', 5), ramp('metal', 6)],
        [ramp('metal', 3)],
      ),
    },
  };

function bustRegionCentroid(
  bitmap: Bitmap,
  regionDefinition: BustLightRegion,
  colors: readonly PaletteColorRef[],
): number {
  const keys = new Set(colors.map((color) => colorKey(color)));
  const [x0, y0, x1, y1] = regionDefinition.bounds;
  let position = 0;
  let count = 0;
  for (let y = y0; y <= y1; y += 1)
    for (let x = x0; x <= x1; x += 1) {
      if (!keys.has(rgbaKey(bitmap.get(x, y)))) continue;
      position += x + y;
      count += 1;
    }
  expect(count).toBeGreaterThan(0);
  return position / count;
}

interface MaterialPixel {
  readonly x: number;
  readonly y: number;
}

function largestRampComponent(
  bitmap: Bitmap,
  rampName: PaletteRamp,
): readonly MaterialPixel[] {
  const colors = new Set(RAMP_STEPS.map((step) => colorKey(ramp(rampName, step))));
  const visited = new Uint8Array(bitmap.width * bitmap.height);
  let largest: readonly MaterialPixel[] = [];
  for (let y = 0; y < bitmap.height; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      const start = y * bitmap.width + x;
      if (visited[start] === 1 || !colors.has(rgbaKey(bitmap.get(x, y))))
        continue;
      visited[start] = 1;
      const queue = [start];
      const component: MaterialPixel[] = [];
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor]!;
        const point = {
          x: index % bitmap.width,
          y: Math.floor(index / bitmap.width),
        };
        component.push(point);
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ] as const) {
          const neighbourX = point.x + dx;
          const neighbourY = point.y + dy;
          if (!bitmap.inside(neighbourX, neighbourY)) continue;
          const neighbour = neighbourY * bitmap.width + neighbourX;
          if (
            visited[neighbour] === 1 ||
            !colors.has(rgbaKey(bitmap.get(neighbourX, neighbourY)))
          )
            continue;
          visited[neighbour] = 1;
          queue.push(neighbour);
        }
      }
      if (component.length > largest.length) largest = component;
    }
  }
  expect(largest.length, `${rampName} largest material region`).toBeGreaterThan(
    0,
  );
  return largest;
}

function linearChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: Rgba): number {
  return (
    0.2126 * linearChannel(color.red) +
    0.7152 * linearChannel(color.green) +
    0.0722 * linearChannel(color.blue)
  );
}

function compositeCell(layers: readonly Bitmap[]): Bitmap {
  const result = new Bitmap(TILE_SIZE, TILE_SIZE);
  for (const layer of layers) {
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1)
        result.blendRgba(x, y, layer.get(x, y));
    }
  }
  return result;
}

function meanCellColor(bitmap: Bitmap): Rgba {
  const inset = 8;
  const sampleSize = (TILE_SIZE - 2 * inset) ** 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let y = inset; y < TILE_SIZE - inset; y += 1) {
    for (let x = inset; x < TILE_SIZE - inset; x += 1) {
      const pixel = bitmap.get(x, y);
      red += pixel.red;
      green += pixel.green;
      blue += pixel.blue;
    }
  }
  return {
    red: red / sampleSize,
    green: green / sampleSize,
    blue: blue / sampleSize,
    alpha: 255,
  };
}

function labColor(color: Rgba): readonly [number, number, number] {
  const red = linearChannel(color.red);
  const green = linearChannel(color.green);
  const blue = linearChannel(color.blue);
  const x = (0.4124564 * red + 0.3575761 * green + 0.1804375 * blue) / 0.95047;
  const y = 0.2126729 * red + 0.7151522 * green + 0.072175 * blue;
  const z = (0.0193339 * red + 0.119192 * green + 0.9503041 * blue) / 1.08883;
  const transform = (value: number): number => value > 216 / 24_389
    ? Math.cbrt(value)
    : ((24_389 / 27) * value + 16) / 116;
  return [
    116 * transform(y) - 16,
    500 * (transform(x) - transform(y)),
    200 * (transform(y) - transform(z)),
  ];
}

function cieDeltaE(left: Rgba, right: Rgba): number {
  const a = labColor(left);
  const b = labColor(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = ordered[Math.floor(ordered.length / 2)];
  if (middle === undefined) throw new Error('Cannot take the median of no pixels.');
  return middle;
}

function brighterChangedPixels(
  brighter: Bitmap,
  darker: Bitmap,
  brightest: PaletteColorRef,
): readonly MaterialPixel[] {
  const brightKey = colorKey(brightest);
  const points: MaterialPixel[] = [];
  for (let y = 0; y < brighter.height; y += 1) {
    for (let x = 0; x < brighter.width; x += 1) {
      if (
        rgbaKey(brighter.get(x, y)) === brightKey &&
        rgbaKey(darker.get(x, y)) !== brightKey
      )
        points.push({ x, y });
    }
  }
  return points;
}

function bitmapDifferencePixels(
  rendered: Bitmap,
  control: Bitmap,
): readonly MaterialPixel[] {
  const points: MaterialPixel[] = [];
  for (let y = 0; y < rendered.height; y += 1)
    for (let x = 0; x < rendered.width; x += 1) {
      if (rgbaKey(rendered.get(x, y)) !== rgbaKey(control.get(x, y)))
        points.push({ x, y });
    }
  return points;
}

function twoByUpscale(source: Bitmap): Bitmap {
  const result = new Bitmap(source.width * 2, source.height * 2);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const pixel = source.get(x, y);
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1)
          result.blendRgba(x * 2 + dx, y * 2 + dy, pixel);
      }
    }
  }
  return result;
}

describe('classic native-density and art-technique invariants', () => {
  it('Part 2(a): carries a closed material response on every recipe', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    expect(Object.keys(MATERIAL_RESPONSES).sort()).toEqual(
      [...ART_MATERIALS].sort(),
    );
    for (const input of STARTER_ART_INPUTS)
      expect(MATERIAL_RESPONSES[input.recipe.material]).toBeDefined();
    expect(MATERIAL_RESPONSES.metal.specular).toBe('single-cluster');
    expect(MATERIAL_RESPONSES.stone.specular).toBe('none');
    expect(MATERIAL_RESPONSES.cloth.mark).toBe('broad-fold');
    expect(MATERIAL_RESPONSES.skin.mark).toBe('warm-plane');
  });

  it('Part 2(a): consumes every material-response field while painting a physical asset', () => {
    const recipe = tokenRecipe('fighter', 'party');
    const baseline = paintRecipe(recipe);
    const response = MATERIAL_RESPONSES.metal;
    const mutations = [
      { ...response, specular: 'none' as const },
      { ...response, edge: 'soft' as const },
      { ...response, mark: 'broad-fold' as const },
    ];
    for (const mutation of mutations) {
      const rendered = paintRecipe(recipe, { metal: mutation });
      expect(
        rendered.data,
        `${response.material}:${mutation.specular}/${mutation.edge}/${mutation.mark}`,
      ).not.toEqual(baseline.data);
    }
  });

  it('Part 2(a): puts the metal specular cluster and hard rim on the upper-left of the largest metal region', () => {
    const recipe = tokenRecipe('fighter', 'party');
    const response = MATERIAL_RESPONSES.metal;
    const metal = paintRecipe(recipe);
    const matte = paintRecipe(recipe, {
      metal: { ...response, specular: 'none' },
    });
    const cluster = brighterChangedPixels(
      metal,
      matte,
      ramp('metal', 6),
    );
    expect(
      cluster.length,
      'metal specular cluster must contain at least six brightest pixels',
    ).toBeGreaterThanOrEqual(6);
    const region = largestRampComponent(matte, 'metal');
    const minX = Math.min(...region.map(({ x }) => x));
    const minY = Math.min(...region.map(({ y }) => y));
    const maxX = Math.max(...region.map(({ x }) => x));
    const maxY = Math.max(...region.map(({ y }) => y));
    const clusterX =
      cluster.reduce((sum, { x }) => sum + x, 0) / cluster.length;
    const clusterY =
      cluster.reduce((sum, { y }) => sum + y, 0) / cluster.length;
    expect(clusterX, 'metal cluster horizontal quadrant').toBeLessThan(
      minX + (maxX - minX) / 2,
    );
    expect(clusterY, 'metal cluster vertical quadrant').toBeLessThan(
      minY + (maxY - minY) / 2,
    );
    const materialMedian = median(
      region.map(({ x, y }) => relativeLuminance(matte.get(x, y))),
    );
    const clusterLuminance =
      cluster.reduce(
        (sum, { x, y }) => sum + relativeLuminance(metal.get(x, y)),
        0,
      ) / cluster.length;
    expect(
      clusterLuminance - materialMedian,
      'metal specular luminance above material median',
    ).toBeGreaterThan(0.2);

    const soft = paintRecipe(recipe, {
      metal: { ...response, specular: 'none', edge: 'soft' },
    });
    const rim = brighterChangedPixels(matte, soft, ramp('metal', 5));
    expect(rim.length, 'hard metal rim pixel count').toBeGreaterThan(20);
    const rimPosition =
      rim.reduce((sum, { x, y }) => sum + x + y, 0) / rim.length;
    const regionPosition =
      region.reduce((sum, { x, y }) => sum + x + y, 0) / region.length;
    expect(rimPosition, 'hard metal rim faces the key light').toBeLessThan(
      regionPosition,
    );
  });

  it('Part 2(a): keeps stone and cloth matte while proving their forced-gloss controls can carry a cluster', () => {
    const pillarRecipe = {
      kind: 'terrain',
      material: 'stone',
      object: 'pillar',
    } as const;
    const stone = paintRecipe(pillarRecipe);
    let stoneClusterPixels = 0;
    const stoneBright = colorKey(ramp('stone', 6));
    for (let y = 0; y < stone.height; y += 1)
      for (let x = 0; x < stone.width; x += 1)
        if (rgbaKey(stone.get(x, y)) === stoneBright) stoneClusterPixels += 1;
    expect(
      stoneClusterPixels,
      'matte stone must contain zero brightest-cluster pixels',
    ).toBe(0);
    const glossyStone = paintRecipe(pillarRecipe, {
      stone: { ...MATERIAL_RESPONSES.stone, specular: 'single-cluster' },
    });
    expect(
      brighterChangedPixels(glossyStone, stone, ramp('stone', 6)).length,
      'forced-gloss stone control must gain the six-pixel cluster',
    ).toBeGreaterThanOrEqual(6);

    const clothRecipe = tokenRecipe('wizard', 'party');
    const cloth = paintRecipe(clothRecipe);
    const glossyCloth = paintRecipe(clothRecipe, {
      cloth: { ...MATERIAL_RESPONSES.cloth, specular: 'single-cluster' },
    });
    expect(
      brighterChangedPixels(glossyCloth, cloth, ramp('cloth-cool', 6))
        .length,
      'forced-gloss cloth control must gain the six-pixel cluster',
    ).toBeGreaterThanOrEqual(6);
  });

  it('Part 2(a): gives cloth broad multi-row low-contrast folds instead of a sparkle', () => {
    const recipe = tokenRecipe('wizard', 'party');
    const cloth = paintRecipe(recipe);
    const control = paintRecipe(recipe, {
      cloth: { ...MATERIAL_RESPONSES.cloth, mark: 'glyph' },
    });
    const foldRows = new Set<number>();
    let foldPixels = 0;
    const foldColors = new Set([
      colorKey(ramp('cloth-cool', 2)),
      colorKey(ramp('cloth-cool', 3)),
      colorKey(ramp('cloth-cool', 4)),
    ]);
    for (let y = 0; y < cloth.height; y += 1) {
      for (let x = 0; x < cloth.width; x += 1) {
        if (
          rgbaKey(cloth.get(x, y)) === rgbaKey(control.get(x, y)) ||
          !foldColors.has(rgbaKey(cloth.get(x, y)))
        )
          continue;
        foldRows.add(y);
        foldPixels += 1;
      }
    }
    expect(foldRows.size, 'cloth fold row count').toBeGreaterThanOrEqual(15);
    expect(foldPixels, 'cloth fold pixel count').toBeGreaterThanOrEqual(100);
    expect(
      brighterChangedPixels(cloth, control, ramp('cloth-cool', 6)).length,
      'cloth fold sparkle count',
    ).toBe(0);
  });

  it('Part 2(a): gives matte stone, wood, and warm skin distinct large-scale mark grammars', () => {
    const cases = [
      {
        name: 'stone mortar',
        rendered: paintRecipe({
          kind: 'floor',
          material: 'stone',
          variant: 0,
        }),
        control: paintRecipe(
          { kind: 'floor', material: 'stone', variant: 0 },
          { stone: { ...MATERIAL_RESPONSES.stone, mark: 'glyph' } },
        ),
        minimumPixels: 70,
        minimumHorizontalSpan: 70,
        minimumRows: 25,
      },
      {
        name: 'wood grain',
        rendered: paintRecipe({
          kind: 'terrain',
          material: 'wood',
          object: 'crate',
        }),
        control: paintRecipe(
          { kind: 'terrain', material: 'wood', object: 'crate' },
          { wood: { ...MATERIAL_RESPONSES.wood, mark: 'glyph' } },
        ),
        minimumPixels: 100,
        minimumHorizontalSpan: 50,
        minimumRows: 15,
      },
      {
        name: 'skin warm planes',
        rendered: paintRecipe(tokenRecipe('brute', 'party')),
        control: paintRecipe(tokenRecipe('brute', 'party'), {
          skin: { ...MATERIAL_RESPONSES.skin, mark: 'glyph' },
        }),
        minimumPixels: 90,
        minimumHorizontalSpan: 50,
        minimumRows: 12,
      },
    ] as const;
    for (const materialCase of cases) {
      const points = bitmapDifferencePixels(
        materialCase.rendered,
        materialCase.control,
      );
      expect(points.length, `${materialCase.name} marked pixels`).toBeGreaterThanOrEqual(
        materialCase.minimumPixels,
      );
      expect(
        Math.max(...points.map(({ x }) => x)) -
          Math.min(...points.map(({ x }) => x)),
        `${materialCase.name} horizontal span`,
      ).toBeGreaterThanOrEqual(materialCase.minimumHorizontalSpan);
      expect(
        new Set(points.map(({ y }) => y)).size,
        `${materialCase.name} marked rows`,
      ).toBeGreaterThanOrEqual(materialCase.minimumRows);
    }
  });

  it('authors every generated class on the 128-pixel lattice without resampling', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    for (const input of STARTER_ART_INPUTS) {
      const bitmap = paintRecipe(input.recipe);
      expect([bitmap.width, bitmap.height], input.id).toEqual([
        EXPECTED_NATIVE_SIZE,
        EXPECTED_NATIVE_SIZE,
      ]);
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
      if (colors > COLOR_BUDGET[input.recipe.kind])
        overBudget.push(`${input.id}:${String(colors)}`);
      for (let index = 0; index < bitmap.data.length; index += 4) {
        if (bitmap.data[index + 3] === 0) continue;
        const rgb = `${String(bitmap.data[index])},${String(bitmap.data[index + 1])},${String(bitmap.data[index + 2])}`;
        if (!PALETTE_RGB.has(rgb)) outsidePalette.push(`${input.id}:${rgb}`);
      }
      if (
        input.recipe.kind === 'overlay' ||
        input.recipe.kind === 'fog' ||
        input.recipe.kind === 'shade'
      )
        continue;
      for (let index = 3; index < bitmap.data.length; index += 4) {
        const alpha = bitmap.data[index]!;
        if (alpha !== 0 && alpha !== 255)
          nonBinaryAlpha.push(`${input.id}:${String(index)}`);
      }
    }
    expect(overBudget).toEqual([]);
    expect(nonBinaryAlpha).toEqual([]);
    expect(outsidePalette).toEqual([]);
  });

  it('grounds every freestanding object with the one shared contact-shadow colour', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    const shadow = colorKey(neutral(1));
    for (const input of STARTER_ART_INPUTS.filter(
      ({ recipe }) =>
        recipe.kind === 'terrain' ||
        recipe.kind === 'token' ||
        recipe.kind === 'token-dead',
    )) {
      const bitmap = paintRecipe(input.recipe);
      let shadowPixels = 0;
      for (let y = 0; y < bitmap.height; y += 1)
        for (let x = 0; x < bitmap.width; x += 1) {
          if (rgbaKey(bitmap.get(x, y)) === shadow) shadowPixels += 1;
        }
      expect(shadowPixels, input.id).toBeGreaterThan(12);
    }
  });

  it('keeps every colour choice perceptibly separate from its neighbours', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    for (const input of STARTER_ART_INPUTS) {
      expect(
        minimumRgbDistance(paintRecipe(input.recipe)),
        input.id,
      ).toBeGreaterThanOrEqual(8);
    }
  });

  it('keeps structured texture in clusters instead of isolated speckle', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    for (const input of STARTER_ART_INPUTS.filter(({ recipe }) =>
      ['floor', 'wall', 'door', 'terrain'].includes(recipe.kind),
    )) {
      expect(
        isolatedColorIslands(paintRecipe(input.recipe)),
        input.id,
      ).toBeLessThanOrEqual(24);
    }
    const speckled = new Bitmap(128, 128);
    speckled.rect(0, 0, 128, 128, ramp('stone', 3));
    for (let index = 0; index < 40; index += 1)
      speckled.put(2 + index * 3, 17 + (index % 3) * 5, ramp('stone', 1));
    expect(isolatedColorIslands(speckled)).toBeGreaterThan(24);
  });

  it('uses exactly three inset opaque ridges for difficult terrain and a broad stone cross-brace for blocked cells', () => {
    const difficult = paintRecipe({
      kind: 'overlay',
      material: 'semantic',
      effect: 'difficult',
    });
    const ridgeInk = paletteRgb(ramp('earth', 6));
    const ridgeOutline = paletteRgb(neutral(0));
    const ridgeKey = rgbaKey({ ...ridgeInk, alpha: 255 });
    const outlineKey = rgbaKey({ ...ridgeOutline, alpha: 255 });
    const skeletonKeys = new Set([ridgeKey, outlineKey]);
    let ridgePixels = 0;
    let outlinePixels = 0;
    for (let y = 0; y < difficult.height; y += 1) {
      for (let x = 0; x < difficult.width; x += 1) {
        const pixelKey = rgbaKey(difficult.get(x, y));
        if (pixelKey === ridgeKey) ridgePixels += 1;
        if (pixelKey === outlineKey) outlinePixels += 1;
      }
    }
    expect(ridgePixels).toBeGreaterThanOrEqual(1_000);
    expect(outlinePixels).toBeGreaterThanOrEqual(500);

    const visited = new Uint8Array(TILE_SIZE * TILE_SIZE);
    let ridgeComponents = 0;
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const offset = y * TILE_SIZE + x;
        if (visited[offset] === 1 || !skeletonKeys.has(rgbaKey(difficult.get(x, y)))) continue;
        ridgeComponents += 1;
        const queue: Array<{ readonly x: number; readonly y: number }> = [{ x, y }];
        visited[offset] = 1;
        for (let index = 0; index < queue.length; index += 1) {
          const point = queue[index];
          if (point === undefined) throw new Error('Ridge component queue lost a point.');
          for (const [dx, dy] of [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0], [1, 0],
            [-1, 1], [0, 1], [1, 1],
          ] as const) {
            const nextX = point.x + dx;
            const nextY = point.y + dy;
            if (!difficult.inside(nextX, nextY)) continue;
            const nextOffset = nextY * TILE_SIZE + nextX;
            if (
              visited[nextOffset] === 1 ||
              !skeletonKeys.has(rgbaKey(difficult.get(nextX, nextY)))
            ) continue;
            visited[nextOffset] = 1;
            queue.push({ x: nextX, y: nextY });
          }
        }
      }
    }
    expect(ridgeComponents).toBe(3);
    for (const ridgeY of [34, 64, 94] as const) {
      for (const [x, y] of [
        [18, ridgeY + 7],
        [40, ridgeY - 7],
        [64, ridgeY + 7],
        [88, ridgeY - 7],
        [110, ridgeY + 7],
      ] as const) {
        expect(difficult.get(x, y)).toEqual({ ...ridgeInk, alpha: 255 });
      }
    }
    for (let coordinate = 0; coordinate < TILE_SIZE; coordinate += 1) {
      expect(difficult.get(coordinate, 0).alpha, 'top gutter').toBe(0);
      expect(difficult.get(coordinate, TILE_SIZE - 1).alpha, 'bottom gutter').toBe(0);
      expect(difficult.get(0, coordinate).alpha, 'left gutter').toBe(0);
      expect(difficult.get(TILE_SIZE - 1, coordinate).alpha, 'right gutter').toBe(0);
    }
    for (const variant of FLOOR_VARIANTS) {
      const floor = paintRecipe({ kind: 'floor', material: 'stone', variant });
      const rendered = meanCellColor(compositeCell([floor, difficult]));
      const plain = meanCellColor(floor);
      expect(
        Math.abs(relativeLuminance(rendered) - relativeLuminance(plain)),
        `difficult/plain-${String(variant)} luminance difference`,
      ).toBeGreaterThanOrEqual(0.015);
      expect(
        cieDeltaE(rendered, plain),
        `difficult/plain-${String(variant)} CIE76 deltaE`,
      ).toBeGreaterThanOrEqual(8.5);
    }

    const blocked = paintRecipe({
      kind: 'overlay',
      material: 'semantic',
      effect: 'blocked',
    });
    const braceKeys = new Set([
      colorKey(ramp('stone', 0)),
      colorKey(ramp('stone', 4)),
    ]);
    let bracePixels = 0;
    for (let y = 16; y <= 112; y += 1) {
      for (let x = 16; x <= 112; x += 1) {
        const onBrace = Math.abs(x - y) <= 5 || Math.abs(x + y - 128) <= 5;
        if (onBrace && braceKeys.has(rgbaKey(blocked.get(x, y))))
          bracePixels += 1;
      }
    }
    expect(bracePixels).toBeGreaterThan(700);
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
        expect(
          descriptorDistance(a.descriptor, b.descriptor),
          `${a.archetype}/${b.archetype}`,
        ).toBeGreaterThan(0.012);
      }
    }
  });

  it('places convex highlights toward the upper-left and shadows toward the lower-right', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    const pillar = paintRecipe({
      kind: 'terrain',
      material: 'stone',
      object: 'pillar',
    });
    const centroids = directionalCentroid(pillar);
    expect(centroids.highlight).toBeLessThan(centroids.shadow - 12);

    const pillow = new Bitmap(128, 128);
    pillow.disc(64, 64, 44, ramp('stone', 1));
    pillow.disc(64, 64, 32, ramp('stone', 3));
    pillow.disc(64, 64, 18, ramp('stone', 6));
    const rejected = directionalCentroid(pillow);
    expect(Math.abs(rejected.highlight - rejected.shadow)).toBeLessThan(1);
  });

  it('places every authored bust head and body highlight above-left of its shadow mass', () => {
    for (const archetype of TOKEN_ARCHETYPES) {
      const bitmap = paintTokenBust(archetype);
      const profile = BUST_LIGHT_PROFILES[archetype];
      for (const [mass, definition] of Object.entries(profile)) {
        const highlight = bustRegionCentroid(
          bitmap,
          definition,
          definition.highlight,
        );
        const shadow = bustRegionCentroid(
          bitmap,
          definition,
          definition.shadow,
        );
        expect(shadow - highlight, `${archetype} ${mass}`).toBeGreaterThan(12);
      }
    }
  });

  it('keeps physical art native-detailed while semantic chrome is an exact 2x rendering of its 64-pixel design', () => {
    expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
    for (const input of STARTER_ART_INPUTS) {
      const rendered = paintRecipe(input.recipe);
      if (TWO_BY_CHROME_OVERLAY_IDS.has(input.id)) {
        expect(nativeDetailFraction(rendered), input.id).toBe(0);
        const reduced = new Bitmap(64, 64);
        for (let y = 0; y < 64; y += 1) {
          for (let x = 0; x < 64; x += 1) {
            reduced.blendRgba(x, y, rendered.get(x * 2, y * 2));
          }
        }
        expect(rendered.data, `${input.id} exact 2x chrome`).toEqual(
          twoByUpscale(reduced).data,
        );
        continue;
      }
      expect(
        nativeDetailFraction(rendered),
        input.id,
      ).toBeGreaterThanOrEqual(MIN_NATIVE_DETAIL_FRACTION);
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
    for (let y = 0; y < token.height; y += 1)
      for (let x = 0; x < token.width; x += 1) {
        if (rgbaKey(token.get(x, y)) === pureBlack) pureBlackCount += 1;
      }
    expect(pureBlackCount).toBe(0);
    const lit = colorKey(ramp('metal', 3));
    const dark = colorKey(ramp('metal', 0));
    let litPosition = 0;
    let litCount = 0;
    let darkPosition = 0;
    let darkCount = 0;
    for (let y = 0; y < token.height; y += 1)
      for (let x = 0; x < token.width; x += 1) {
        const key = rgbaKey(token.get(x, y));
        if (key === lit) {
          litPosition += x + y;
          litCount += 1;
        }
        if (key === dark) {
          darkPosition += x + y;
          darkCount += 1;
        }
      }
    expect(litCount).toBeGreaterThan(0);
    expect(darkCount).toBeGreaterThan(0);
    expect(litPosition / litCount).toBeLessThan(darkPosition / darkCount);
  });
});
