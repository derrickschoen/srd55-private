/** Native 128-pixel procedural art for the classic board. */
import { Bitmap, bayer2, type Ink, type Rgba } from './bitmap';
import {
  CELL_GLYPHS,
  cellGlyphOrigin,
  type CellGlyphKind,
} from './board-glyphs';
import {
  LIGHT_GLYPHS,
  LIGHT_GLYPH_ORIGIN,
  type LightGlyphKind,
} from './light-glyphs';
import {
  NEUTRAL_STEPS,
  RAMP_STEPS,
  neutral,
  paletteRgb,
  ramp,
  type PaletteRamp,
  type RampStep,
} from './palette';
import { outlineRows, type PixelMark } from './pixel-mark';
import { encodePng } from './png';

export const TILE_SIZE = 128;
export const WALL_PIECES = [
  'n',
  's',
  'w',
  'e',
  'nw',
  'ne',
  'sw',
  'se',
] as const;
export type WallPiece = (typeof WALL_PIECES)[number];
export const BAND_SIDES = ['n', 's', 'w', 'e'] as const;
export type BandSide = (typeof BAND_SIDES)[number];
export const FLOOR_VARIANTS = [0, 1, 2, 3] as const;
export type FloorVariant = (typeof FLOOR_VARIANTS)[number];
export const DOOR_STATES = ['closed', 'open'] as const;
export type DoorState = (typeof DOOR_STATES)[number];
export const TERRAIN_OBJECTS = ['rubble', 'crate', 'pillar', 'hazard'] as const;
export type TerrainObject = (typeof TERRAIN_OBJECTS)[number];
export const LIGHT_GLYPH_EFFECTS = [
  'light-glyph-bright',
  'light-glyph-dim',
  'light-glyph-dark',
] as const;
export type LightGlyphEffect = (typeof LIGHT_GLYPH_EFFECTS)[number];
export const CELL_GLYPH_EFFECTS = [
  'glyph-door-closed',
  'glyph-door-open',
  'glyph-blocked',
  'glyph-fog',
  'glyph-obscured',
] as const;
export type CellGlyphEffect = (typeof CELL_GLYPH_EFFECTS)[number];
export const CELL_GLYPH_EFFECT_BY_KIND: Readonly<
  Record<CellGlyphKind, CellGlyphEffect>
> = Object.freeze({
  'door-closed': 'glyph-door-closed',
  'door-open': 'glyph-door-open',
  blocked: 'glyph-blocked',
  fog: 'glyph-fog',
  obscured: 'glyph-obscured',
});
export const OVERLAY_EFFECTS = [
  'difficult',
  'obscurement-light',
  'obscurement-heavy',
  'magical-darkness',
  'light-bright',
  'light-dim',
  'light-darkness',
  'blocked',
  'light-source',
  ...LIGHT_GLYPH_EFFECTS,
  ...CELL_GLYPH_EFFECTS,
] as const;
export type OverlayEffect = (typeof OVERLAY_EFFECTS)[number];
export const FOG_STATES = ['hidden', 'unexplored', 'revealed'] as const;
export type FogState = (typeof FOG_STATES)[number];
export const TOKEN_ARCHETYPES = [
  'fighter',
  'wizard',
  'cleric',
  'rogue',
  'ranger',
  'brute',
  'beast',
  'undead',
  'fiend',
  'ooze',
  'construct',
] as const;
export type TokenArchetype = (typeof TOKEN_ARCHETYPES)[number];
export const TOKEN_SIDES = ['party', 'foe'] as const;
export type TokenSide = (typeof TOKEN_SIDES)[number];

export const ART_MATERIALS = [
  'stone',
  'wood',
  'earth',
  'metal',
  'skin',
  'cloth',
  'bone',
  'gel',
  'shadow',
  'fog',
  'semantic',
] as const;
export type ArtMaterial = (typeof ART_MATERIALS)[number];
export interface MaterialResponse {
  readonly material: ArtMaterial;
  readonly mark:
    | 'mortar'
    | 'grain'
    | 'fracture'
    | 'specular-cluster'
    | 'broad-fold'
    | 'warm-plane'
    | 'joint'
    | 'internal-lobe'
    | 'contact'
    | 'hatch'
    | 'glyph';
  readonly specular: 'none' | 'single-cluster';
  readonly edge: 'hard' | 'soft' | 'translucent';
}
export type MaterialResponseFor<Material extends ArtMaterial> = Omit<
  MaterialResponse,
  'material'
> & {
  readonly material: Material;
};
export type MaterialResponseOverrides = Readonly<{
  [Material in ArtMaterial]?: MaterialResponseFor<Material>;
}>;
export const MATERIAL_RESPONSES: Readonly<{
  [Material in ArtMaterial]: MaterialResponseFor<Material>;
}> = Object.freeze({
  stone: { material: 'stone', mark: 'mortar', specular: 'none', edge: 'hard' },
  wood: { material: 'wood', mark: 'grain', specular: 'none', edge: 'hard' },
  earth: {
    material: 'earth',
    mark: 'fracture',
    specular: 'none',
    edge: 'hard',
  },
  metal: {
    material: 'metal',
    mark: 'specular-cluster',
    specular: 'single-cluster',
    edge: 'hard',
  },
  skin: {
    material: 'skin',
    mark: 'warm-plane',
    specular: 'none',
    edge: 'soft',
  },
  cloth: {
    material: 'cloth',
    mark: 'broad-fold',
    specular: 'none',
    edge: 'soft',
  },
  bone: { material: 'bone', mark: 'joint', specular: 'none', edge: 'hard' },
  gel: {
    material: 'gel',
    mark: 'internal-lobe',
    specular: 'single-cluster',
    edge: 'translucent',
  },
  shadow: {
    material: 'shadow',
    mark: 'contact',
    specular: 'none',
    edge: 'soft',
  },
  fog: {
    material: 'fog',
    mark: 'hatch',
    specular: 'none',
    edge: 'translucent',
  },
  semantic: {
    material: 'semantic',
    mark: 'glyph',
    specular: 'none',
    edge: 'hard',
  },
});
export type TokenMaterial =
  | 'metal'
  | 'cloth'
  | 'earth'
  | 'skin'
  | 'bone'
  | 'gel'
  | 'stone';
type TokenMaterialByArchetype = {
  readonly fighter: 'metal';
  readonly wizard: 'cloth';
  readonly cleric: 'cloth';
  readonly rogue: 'earth';
  readonly ranger: 'earth';
  readonly brute: 'skin';
  readonly beast: 'earth';
  readonly undead: 'bone';
  readonly fiend: 'skin';
  readonly ooze: 'gel';
  readonly construct: 'stone';
};
export type TokenRecipe = {
  readonly [Archetype in TokenArchetype]: {
    readonly kind: 'token';
    readonly material: TokenMaterialByArchetype[Archetype];
    readonly archetype: Archetype;
    readonly side: TokenSide;
  };
}[TokenArchetype];
export type TerrainRecipe =
  | {
      readonly kind: 'terrain';
      readonly material: 'earth';
      readonly object: 'rubble';
    }
  | {
      readonly kind: 'terrain';
      readonly material: 'wood';
      readonly object: 'crate';
    }
  | {
      readonly kind: 'terrain';
      readonly material: 'stone';
      readonly object: 'pillar';
    }
  | {
      readonly kind: 'terrain';
      readonly material: 'semantic';
      readonly object: 'hazard';
    };
export type ArtRecipe =
  | {
      readonly kind: 'floor';
      readonly material: 'stone';
      readonly variant: FloorVariant;
    }
  | {
      readonly kind: 'wall';
      readonly material: 'stone';
      readonly piece: WallPiece;
    }
  | {
      readonly kind: 'door';
      readonly material: 'wood';
      readonly side: BandSide;
      readonly state: DoorState;
    }
  | {
      readonly kind: 'shade';
      readonly material: 'shadow';
      readonly side: BandSide;
    }
  | TerrainRecipe
  | {
      readonly kind: 'overlay';
      readonly material: 'semantic';
      readonly effect: OverlayEffect;
    }
  | { readonly kind: 'fog'; readonly material: 'fog'; readonly state: FogState }
  | {
      readonly kind: 'focus';
      readonly material: 'semantic';
      readonly mark: 'active' | 'hidden';
    }
  | {
      readonly kind: 'event';
      readonly material: 'semantic';
      readonly mark: 'adjudicated';
    }
  | TokenRecipe
  | { readonly kind: 'token-dead'; readonly material: 'bone' };

export function terrainRecipe(object: TerrainObject): TerrainRecipe {
  switch (object) {
    case 'rubble':
      return { kind: 'terrain', material: 'earth', object };
    case 'crate':
      return { kind: 'terrain', material: 'wood', object };
    case 'pillar':
      return { kind: 'terrain', material: 'stone', object };
    case 'hazard':
      return { kind: 'terrain', material: 'semantic', object };
  }
}

export function tokenRecipe(
  archetype: TokenArchetype,
  side: TokenSide,
): TokenRecipe {
  switch (archetype) {
    case 'fighter':
      return { kind: 'token', material: 'metal', archetype, side };
    case 'wizard':
      return { kind: 'token', material: 'cloth', archetype, side };
    case 'cleric':
      return { kind: 'token', material: 'cloth', archetype, side };
    case 'rogue':
      return { kind: 'token', material: 'earth', archetype, side };
    case 'ranger':
      return { kind: 'token', material: 'earth', archetype, side };
    case 'brute':
      return { kind: 'token', material: 'skin', archetype, side };
    case 'beast':
      return { kind: 'token', material: 'earth', archetype, side };
    case 'undead':
      return { kind: 'token', material: 'bone', archetype, side };
    case 'fiend':
      return { kind: 'token', material: 'skin', archetype, side };
    case 'ooze':
      return { kind: 'token', material: 'gel', archetype, side };
    case 'construct':
      return { kind: 'token', material: 'stone', archetype, side };
  }
}

const STONE = (step: RampStep): Ink => ramp('stone', step);
const WOOD = (step: RampStep): Ink => ramp('wood', step);
const EARTH = (step: RampStep): Ink => ramp('earth', step);
const MOSS = (step: RampStep): Ink => ramp('moss', step);
const METAL = (step: RampStep): Ink => ramp('metal', step);
const SKIN = (step: RampStep): Ink => ramp('skin', step);
const WARM = (step: RampStep): Ink => ramp('cloth-warm', step);
const COOL = (step: RampStep): Ink => ramp('cloth-cool', step);
const translucent = (ink: Ink, alpha: number): Ink => ({ ...ink, alpha });
const SHARED_SHADOW = neutral(1);
interface Point {
  readonly x: number;
  readonly y: number;
}

function fillPolygon(bitmap: Bitmap, points: readonly Point[], ink: Ink): void {
  const minY = Math.max(0, Math.min(...points.map(({ y }) => y)));
  const maxY = Math.min(
    bitmap.height - 1,
    Math.max(...points.map(({ y }) => y)),
  );
  for (let y = minY; y <= maxY; y += 1) {
    const xs: number[] = [];
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index]!;
      const b = points[(index + 1) % points.length]!;
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y))
        xs.push(Math.round(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x)));
    }
    xs.sort((a, b) => a - b);
    for (let index = 0; index + 1 < xs.length; index += 2)
      bitmap.hLine(xs[index]!, xs[index + 1]!, y, ink);
  }
}
function outlinedLine(
  bitmap: Bitmap,
  points: readonly Point[],
  shadow: Ink,
  light: Ink,
): void {
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    bitmap.line(a.x + 1, a.y + 1, b.x + 1, b.y + 1, shadow);
    bitmap.line(a.x + 2, a.y + 1, b.x + 2, b.y + 1, shadow);
    bitmap.line(a.x, a.y, b.x, b.y, light);
    bitmap.line(a.x, a.y + 1, b.x, b.y + 1, light);
  }
}

interface Slab {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}
const slab = (x0: number, y0: number, x1: number, y1: number): Slab => ({
  x0,
  y0,
  x1,
  y1,
});
const FLOOR_LAYOUTS: Readonly<Record<FloorVariant, readonly Slab[]>> = {
  0: [
    slab(0, 0, 61, 61),
    slab(65, 0, 127, 61),
    slab(0, 65, 61, 127),
    slab(65, 65, 127, 127),
  ],
  1: [
    slab(0, 0, 77, 37),
    slab(81, 0, 127, 37),
    slab(0, 41, 35, 79),
    slab(39, 41, 101, 79),
    slab(105, 41, 127, 79),
    slab(0, 83, 57, 127),
    slab(61, 83, 127, 127),
  ],
  2: [
    slab(0, 0, 79, 77),
    slab(83, 0, 127, 35),
    slab(83, 39, 127, 77),
    slab(0, 81, 39, 127),
    slab(43, 81, 127, 127),
  ],
  3: [
    slab(0, 0, 37, 57),
    slab(0, 61, 37, 127),
    slab(41, 0, 87, 85),
    slab(41, 89, 87, 127),
    slab(91, 0, 127, 31),
    slab(91, 35, 127, 127),
  ],
};
function paintStoneSlab(bitmap: Bitmap, shape: Slab, variation: number): void {
  bitmap.rect(
    shape.x0,
    shape.y0,
    shape.x1 - shape.x0 + 1,
    shape.y1 - shape.y0 + 1,
    variation === 2 ? STONE(2) : STONE(3),
  );
  bitmap.hLine(shape.x0, shape.x1, shape.y0, STONE(4));
  bitmap.vLine(shape.x0, shape.y0, shape.y1, STONE(4));
  bitmap.hLine(shape.x0 + 1, shape.x1, shape.y1, STONE(1));
  bitmap.vLine(shape.x1, shape.y0 + 1, shape.y1, STONE(1));
  if (variation === 1)
    bitmap.line(
      shape.x0 + 7,
      shape.y0 + 8,
      Math.min(shape.x1 - 5, shape.x0 + 27),
      shape.y0 + 8,
      STONE(2),
    );
}
function crack(bitmap: Bitmap, points: readonly Point[]): void {
  outlinedLine(bitmap, points, STONE(4), STONE(1));
  for (const point of points.slice(1, -1)) {
    bitmap.line(point.x, point.y, point.x + 4, point.y + 6, STONE(1));
    bitmap.line(point.x + 1, point.y, point.x + 5, point.y + 6, STONE(1));
  }
}
function mossPatch(bitmap: Bitmap, x: number, y: number): void {
  const rows = [8, 13, 17, 19, 18, 14, 9] as const;
  rows.forEach((width, row) => {
    bitmap.hLine(x + row, x + row + width, y + row, MOSS(2));
    if (row > 2)
      bitmap.hLine(x + row + 4, x + row + width - 2, y + row + 1, MOSS(1));
  });
}
function paintFloor(bitmap: Bitmap, variant: FloorVariant): void {
  bitmap.fill(STONE(1));
  FLOOR_LAYOUTS[variant].forEach((shape, index) =>
    paintStoneSlab(bitmap, shape, (index + variant) % 3),
  );
  switch (variant) {
    case 0:
      crack(bitmap, [
        { x: 72, y: 68 },
        { x: 84, y: 80 },
        { x: 81, y: 92 },
        { x: 96, y: 106 },
        { x: 109, y: 112 },
      ]);
      return;
    case 1:
      mossPatch(bitmap, 12, 101);
      mossPatch(bitmap, 94, 12);
      return;
    case 2:
      fillPolygon(
        bitmap,
        [
          { x: 68, y: 69 },
          { x: 81, y: 67 },
          { x: 89, y: 78 },
          { x: 76, y: 87 },
          { x: 66, y: 80 },
        ],
        STONE(1),
      );
      bitmap.line(70, 70, 82, 69, STONE(4));
      return;
    case 3:
      crack(bitmap, [
        { x: 48, y: 8 },
        { x: 57, y: 22 },
        { x: 53, y: 39 },
      ]);
      mossPatch(bitmap, 99, 74);
      return;
  }
}

const COURSE_HEIGHT = 14;
const BRICK_WIDTH = 30;
function paintBrickCap(bitmap: Bitmap): void {
  bitmap.fill(STONE(2));
  for (let y = 0; y < TILE_SIZE; y += COURSE_HEIGHT) {
    bitmap.hLine(0, 127, Math.min(127, y + COURSE_HEIGHT - 1), STONE(0));
    const shift = (Math.floor(y / COURSE_HEIGHT) % 2) * 15;
    for (let x = -shift; x < TILE_SIZE; x += BRICK_WIDTH) {
      const left = Math.max(0, x);
      const right = Math.min(127, x + BRICK_WIDTH - 2);
      bitmap.hLine(left, right, y, STONE(4));
      bitmap.vLine(left, y, Math.min(127, y + COURSE_HEIGHT - 2), STONE(3));
      bitmap.vLine(
        right,
        y + 1,
        Math.min(127, y + COURSE_HEIGHT - 2),
        STONE(1),
      );
      if ((x + y) % 3 === 0)
        bitmap.line(
          left + 7,
          y + 5,
          Math.min(right - 5, left + 17),
          y + 5,
          STONE(3),
        );
    }
  }
}
function outerSides(piece: WallPiece): readonly BandSide[] {
  switch (piece) {
    case 'n':
      return ['n'];
    case 's':
      return ['s'];
    case 'w':
      return ['w'];
    case 'e':
      return ['e'];
    case 'nw':
      return ['n', 'w'];
    case 'ne':
      return ['n', 'e'];
    case 'sw':
      return ['s', 'w'];
    case 'se':
      return ['s', 'e'];
  }
}
export function wallFloorDistance(
  piece: WallPiece,
  x: number,
  y: number,
): number {
  const south = TILE_SIZE - y;
  const north = y + 1;
  const east = TILE_SIZE - x;
  const west = x + 1;
  switch (piece) {
    case 'n':
      return south;
    case 's':
      return north;
    case 'w':
      return east;
    case 'e':
      return west;
    case 'nw':
      return Math.max(east, south);
    case 'ne':
      return Math.max(west, south);
    case 'sw':
      return Math.max(east, north);
    case 'se':
      return Math.max(west, north);
  }
}
function paintWall(bitmap: Bitmap, piece: WallPiece): void {
  paintBrickCap(bitmap);
  const sides = outerSides(piece);
  for (let y = 0; y < TILE_SIZE; y += 1)
    for (let x = 0; x < TILE_SIZE; x += 1) {
      let ink: Ink | null = null;
      if (sides.includes('n') && y < 3) ink = y === 0 ? STONE(6) : STONE(5);
      if (sides.includes('w') && x < 3) ink = x === 0 ? STONE(6) : STONE(5);
      if (sides.includes('s') && y > 124) ink = y === 127 ? STONE(0) : STONE(1);
      if (sides.includes('e') && x > 124) ink = x === 127 ? STONE(0) : STONE(1);
      const distance = wallFloorDistance(piece, x, y);
      if (distance <= 2) ink = STONE(0);
      else if (distance <= 5) ink = STONE(1);
      if (ink !== null) bitmap.put(x, y, ink);
    }
}
function doorPut(
  bitmap: Bitmap,
  side: BandSide,
  x: number,
  y: number,
  ink: Ink,
): void {
  switch (side) {
    case 'n':
      bitmap.put(x, y, ink);
      return;
    case 's':
      bitmap.put(x, 127 - y, ink);
      return;
    case 'w':
      bitmap.put(y, x, ink);
      return;
    case 'e':
      bitmap.put(127 - y, x, ink);
      return;
  }
}
function paintDoor(bitmap: Bitmap, side: BandSide, state: DoorState): void {
  paintWall(bitmap, side);
  const start = 19;
  const end = 108;
  const top = 27;
  const bottom = 99;
  for (let y = top - 4; y <= bottom + 4; y += 1)
    for (const x of [
      start - 4,
      start - 3,
      start - 2,
      end + 2,
      end + 3,
      end + 4,
    ])
      doorPut(bitmap, side, x, y, x < start ? STONE(4) : STONE(1));
  if (state === 'open') {
    for (let y = top; y <= bottom; y += 1)
      for (let x = start; x <= end; x += 1)
        doorPut(bitmap, side, x, y, y < 45 ? WARM(4) : neutral(1));
    for (let y = top; y < 124; y += 1)
      for (let x = start; x <= start + 10; x += 1)
        doorPut(
          bitmap,
          side,
          x,
          y,
          x === start ? WOOD(5) : x === start + 10 ? WOOD(1) : WOOD(3),
        );
    doorPut(bitmap, side, start + 2, top + 3, WOOD(5));
    return;
  }
  for (let x = start; x <= end; x += 1) {
    const plank = Math.floor((x - start) / 12);
    const seam = (x - start) % 12 >= 10;
    for (let y = top; y <= bottom; y += 1) {
      let ink = seam ? WOOD(1) : WOOD(3);
      if (!seam && (x - start) % 12 <= 1) ink = WOOD(4);
      if (y === top) ink = WOOD(5);
      if (!seam && y === top + 15 + (plank % 3) * 17) ink = WOOD(2);
      doorPut(bitmap, side, x, y, ink);
    }
  }
  for (const bandY of [42, 81]) {
    for (let x = start; x <= end; x += 1) {
      doorPut(bitmap, side, x, bandY, METAL(5));
      doorPut(bitmap, side, x, bandY + 1, METAL(3));
      doorPut(bitmap, side, x, bandY + 2, METAL(3));
      doorPut(bitmap, side, x, bandY + 3, METAL(4));
    }
    for (const x of [27, 51, 75, 99]) {
      doorPut(bitmap, side, x, bandY, METAL(6));
      doorPut(bitmap, side, x + 1, bandY, METAL(6));
    }
  }
  for (let dy = -6; dy <= 6; dy += 1)
    for (let dx = -6; dx <= 6; dx += 1)
      if (dx * dx + dy * dy <= 31)
        doorPut(bitmap, side, 92 + dx, 63 + dy, METAL(3));
  doorPut(bitmap, side, 89, 60, METAL(6));
  doorPut(bitmap, side, 90, 60, METAL(6));
}
function paintShade(bitmap: Bitmap, side: BandSide): void {
  const alphas = [160, 160, 80, 80, 80] as const;
  alphas.forEach((alpha, offset) => {
    for (let along = 0; along < TILE_SIZE; along += 1) {
      const ink = translucent(SHARED_SHADOW, alpha);
      switch (side) {
        case 'n':
          bitmap.put(along, offset, ink);
          break;
        case 's':
          bitmap.put(along, 127 - offset, ink);
          break;
        case 'w':
          bitmap.put(offset, along, ink);
          break;
        case 'e':
          bitmap.put(127 - offset, along, ink);
          break;
      }
    }
  });
}

function contactShadow(
  bitmap: Bitmap,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  bitmap.ellipse(cx + 5, cy + 6, rx, ry, SHARED_SHADOW);
}
function stoneChunk(
  bitmap: Bitmap,
  x: number,
  y: number,
  width: number,
  height: number,
  base: PaletteRamp = 'earth',
): void {
  contactShadow(bitmap, x + width / 2, y + height / 2, width / 2, height / 2);
  fillPolygon(
    bitmap,
    [
      { x, y: y + 3 },
      { x: x + 5, y },
      { x: x + width - 4, y: y + 1 },
      { x: x + width, y: y + height - 4 },
      { x: x + width - 5, y: y + height },
      { x: x + 2, y: y + height - 2 },
    ],
    ramp(base, 2),
  );
  bitmap.line(x + 5, y + 1, x + width - 5, y + 2, ramp(base, 4));
  bitmap.line(
    x + width - 3,
    y + 4,
    x + width - 5,
    y + height - 3,
    ramp(base, 1),
  );
}
function paintRubble(bitmap: Bitmap): void {
  const chunks = [
    [13, 18, 27, 16],
    [55, 11, 20, 14],
    [88, 25, 25, 17],
    [21, 59, 18, 16],
    [66, 53, 31, 22],
    [11, 93, 23, 17],
    [48, 91, 16, 13],
    [84, 86, 28, 20],
    [41, 111, 24, 12],
  ] as const;
  for (const [x, y, width, height] of chunks)
    stoneChunk(bitmap, x, y, width, height);
  crack(bitmap, [
    { x: 38, y: 45 },
    { x: 55, y: 62 },
    { x: 51, y: 76 },
  ]);
}
function paintCrate(bitmap: Bitmap): void {
  contactShadow(bitmap, 67, 70, 43, 42);
  const x0 = 22;
  const y0 = 19;
  const size = 82;
  bitmap.rect(x0, y0, size, size, WOOD(3));
  for (let y = y0; y < y0 + size; y += 13) {
    bitmap.hLine(x0, x0 + size - 1, y, WOOD(4));
    bitmap.hLine(x0, x0 + size - 1, y + 11, WOOD(1));
    bitmap.line(x0 + 12, y + 5, x0 + 38, y + 5, WOOD(2));
    bitmap.line(x0 + 51, y + 8, x0 + 70, y + 8, WOOD(2));
  }
  bitmap.outline(x0, y0, size, size, WOOD(1));
  bitmap.hLine(x0 + 1, x0 + size - 2, y0 + 1, WOOD(5));
  bitmap.vLine(x0 + 1, y0 + 1, y0 + size - 2, WOOD(5));
  for (const [x, y] of [
    [x0, y0],
    [x0 + 70, y0],
    [x0, y0 + 70],
    [x0 + 70, y0 + 70],
  ] as const) {
    bitmap.rect(x, y, 12, 12, METAL(2));
    bitmap.rect(x + 2, y + 2, 8, 8, METAL(3));
  }
  bitmap.rect(x0 + 2, y0 + 2, 3, 2, METAL(6));
}
function paintPillar(bitmap: Bitmap): void {
  contactShadow(bitmap, 70, 73, 47, 43);
  bitmap.disc(64, 64, 47, STONE(1));
  bitmap.disc(61, 61, 43, STONE(3));
  bitmap.ellipse(53, 51, 28, 25, STONE(4));
  bitmap.ellipse(45, 43, 13, 11, STONE(5));
  bitmap.ellipse(83, 83, 19, 18, STONE(2));
  bitmap.ring(64, 64, 47, STONE(0));
  bitmap.ring(61, 61, 38, STONE(2));
  bitmap.line(39, 72, 55, 81, STONE(1));
  bitmap.line(55, 81, 65, 76, STONE(1));
}
function paintHazard(bitmap: Bitmap): void {
  contactShadow(bitmap, 68, 70, 52, 48);
  fillPolygon(
    bitmap,
    [
      { x: 11, y: 63 },
      { x: 24, y: 31 },
      { x: 53, y: 14 },
      { x: 91, y: 21 },
      { x: 116, y: 51 },
      { x: 106, y: 91 },
      { x: 72, y: 117 },
      { x: 31, y: 107 },
    ],
    WARM(2),
  );
  fillPolygon(
    bitmap,
    [
      { x: 25, y: 59 },
      { x: 39, y: 34 },
      { x: 65, y: 25 },
      { x: 94, y: 38 },
      { x: 103, y: 67 },
      { x: 86, y: 95 },
      { x: 55, y: 101 },
      { x: 34, y: 84 },
    ],
    WARM(4),
  );
  fillPolygon(
    bitmap,
    [
      { x: 45, y: 60 },
      { x: 55, y: 42 },
      { x: 76, y: 38 },
      { x: 92, y: 56 },
      { x: 85, y: 77 },
      { x: 65, y: 88 },
      { x: 47, y: 76 },
    ],
    WARM(5),
  );
  bitmap.ellipse(57, 52, 12, 10, WARM(6));
  bitmap.rect(50, 46, 4, 3, SKIN(6));
  for (const points of [
    [
      { x: 45, y: 48 },
      { x: 23, y: 20 },
      { x: 12, y: 17 },
    ],
    [
      { x: 88, y: 47 },
      { x: 108, y: 27 },
      { x: 118, y: 31 },
    ],
    [
      { x: 50, y: 82 },
      { x: 27, y: 105 },
      { x: 17, y: 116 },
    ],
    [
      { x: 86, y: 81 },
      { x: 108, y: 101 },
      { x: 116, y: 99 },
    ],
  ] as const)
    outlinedLine(bitmap, points, WARM(6), neutral(1));
}

function paintVeil(
  bitmap: Bitmap,
  ink: Ink,
  coverage: 1 | 2 | 3 | 4,
  inset: number,
): void {
  for (let y = inset; y < TILE_SIZE - inset; y += 1)
    for (let x = inset; x < TILE_SIZE - inset; x += 1)
      if (bayer2(x, y) < coverage) bitmap.put(x, y, ink);
}
function paintDifficult(bitmap: Bitmap): void {
  paintVeil(bitmap, translucent(EARTH(2), 65), 1, 3);
  for (const ridgeY of [22, 58, 94] as const) {
    for (const thickness of [-1, 0, 1] as const) {
      outlinedLine(
        bitmap,
        [
          { x: 6, y: ridgeY + 10 + thickness },
          { x: 28, y: ridgeY - 4 + thickness },
          { x: 52, y: ridgeY + 10 + thickness },
          { x: 76, y: ridgeY - 4 + thickness },
          { x: 100, y: ridgeY + 10 + thickness },
          { x: 121, y: ridgeY - 3 + thickness },
        ],
        translucent(EARTH(4), 175),
        translucent(EARTH(1), 210),
      );
    }
  }
}
function paintBlocked(bitmap: Bitmap): void {
  contactShadow(bitmap, 68, 71, 38, 35);
  bitmap.disc(64, 65, 36, STONE(1));
  bitmap.disc(60, 60, 31, STONE(3));
  bitmap.ellipse(49, 48, 17, 14, STONE(4));
  bitmap.ellipse(76, 77, 15, 13, STONE(2));
  bitmap.ring(64, 65, 36, STONE(0));
  crack(bitmap, [
    { x: 47, y: 51 },
    { x: 67, y: 72 },
    { x: 58, y: 91 },
  ]);
  for (const [x, y, width, height] of [
    [9, 91, 21, 14],
    [98, 80, 18, 13],
    [91, 13, 16, 12],
    [15, 21, 15, 11],
    [50, 107, 19, 12],
  ] as const)
    stoneChunk(bitmap, x, y, width, height, 'stone');
  for (const offset of [-2, -1, 0, 1, 2] as const) {
    bitmap.line(18 + offset, 18, 110 + offset, 110, STONE(offset < 0 ? 4 : 0));
    bitmap.line(110 + offset, 18, 18 + offset, 110, STONE(offset < 0 ? 4 : 0));
  }
}
function paintLightSource(bitmap: Bitmap): void {
  paintVeil(bitmap, translucent(WARM(5), 65), 1, 8);
  contactShadow(bitmap, 69, 95, 18, 8);
  bitmap.ellipse(65, 86, 17, 8, METAL(1));
  bitmap.ellipse(62, 81, 16, 7, METAL(3));
  bitmap.rect(60, 84, 6, 19, METAL(2));
  bitmap.rect(55, 101, 17, 4, METAL(1));
  bitmap.ellipse(62, 61, 13, 22, WARM(3));
  bitmap.ellipse(57, 53, 10, 17, WARM(5));
  bitmap.ellipse(54, 45, 6, 11, WARM(6));
  bitmap.rect(51, 37, 4, 5, SKIN(6));
  bitmap.rect(51, 80, 3, 2, METAL(6));
}
function stampMark(bitmap: Bitmap, mark: PixelMark, origin: Point): void {
  const scale = TILE_SIZE / 64;
  const stamp = (
    rows: readonly string[],
    x0: number,
    y0: number,
    ink: Ink,
  ): void =>
    rows.forEach((row, y) =>
      Array.from(row).forEach((cell, x) => {
        if (cell === '#')
          bitmap.rect(x0 + x * scale, y0 + y * scale, scale, scale, ink);
      }),
    );
  stamp(
    outlineRows(mark.rows),
    origin.x - scale,
    origin.y - scale,
    mark.outline,
  );
  stamp(mark.rows, origin.x, origin.y, mark.ink);
}
function paintLightGlyph(bitmap: Bitmap, kind: LightGlyphKind): void {
  const scale = TILE_SIZE / 64;
  stampMark(bitmap, LIGHT_GLYPHS[kind], {
    x: LIGHT_GLYPH_ORIGIN * scale,
    y: LIGHT_GLYPH_ORIGIN * scale,
  });
}
export const FOG_HATCH_PITCH = 6;
export const FOG_HATCH_ALPHA = 150;
function paintFogHatch(
  bitmap: Bitmap,
  pitch = FOG_HATCH_PITCH,
  thickness = 1,
): void {
  const scale = pitch / FOG_HATCH_PITCH;
  for (let y = 0; y < TILE_SIZE; y += 1)
    for (let x = 0; x < TILE_SIZE; x += 1) {
      if (
        scale === thickness && Number.isSafeInteger(scale)
          ? (Math.floor(x / scale) + Math.floor(y / scale)) % FOG_HATCH_PITCH === 0
          : (x + y) % pitch < thickness
      )
        bitmap.put(x, y, translucent(neutral(1), FOG_HATCH_ALPHA));
    }
}
function paintCellGlyph(bitmap: Bitmap, kind: CellGlyphKind): void {
  const scale = TILE_SIZE / 64;
  if (kind === 'fog') paintFogHatch(bitmap, FOG_HATCH_PITCH * scale, scale);
  stampMark(bitmap, CELL_GLYPHS[kind], cellGlyphOrigin(kind, TILE_SIZE));
}

function paintObscurement(bitmap: Bitmap, strength: 'light' | 'heavy'): void {
  const fillAlpha = strength === 'light' ? 120 : 180;
  const latticeAlpha = strength === 'light' ? 205 : 235;
  paintVeil(bitmap, translucent(COOL(3), fillAlpha), 1, 4);
  const pitch = 32;
  for (let offset = -TILE_SIZE; offset < TILE_SIZE * 2; offset += pitch) {
    for (const thickness of [0, 1] as const) {
      bitmap.line(
        offset + thickness,
        3,
        offset + TILE_SIZE - 7 + thickness,
        TILE_SIZE - 4,
        translucent(COOL(6), latticeAlpha),
      );
      bitmap.line(
        offset + thickness,
        TILE_SIZE - 4,
        offset + TILE_SIZE - 7 + thickness,
        3,
        translucent(COOL(5), latticeAlpha),
      );
    }
  }
}
function paintOverlay(bitmap: Bitmap, effect: OverlayEffect): void {
  switch (effect) {
    case 'difficult':
      paintDifficult(bitmap);
      return;
    case 'obscurement-light':
      paintObscurement(bitmap, 'light');
      return;
    case 'obscurement-heavy':
      paintObscurement(bitmap, 'heavy');
      return;
    case 'magical-darkness':
      paintVeil(bitmap, translucent(neutral(0), 235), 4, 0);
      paintFogHatch(bitmap);
      return;
    case 'light-bright':
      paintVeil(bitmap, translucent(WARM(6), 64), 3, 8);
      return;
    case 'light-dim':
      paintVeil(bitmap, translucent(WARM(5), 48), 2, 8);
      return;
    case 'light-darkness':
      paintVeil(bitmap, translucent(neutral(0), 175), 3, 5);
      return;
    case 'blocked':
      paintBlocked(bitmap);
      return;
    case 'light-source':
      paintLightSource(bitmap);
      return;
    case 'light-glyph-bright':
      paintLightGlyph(bitmap, 'sun');
      return;
    case 'light-glyph-dim':
      paintLightGlyph(bitmap, 'crescent');
      return;
    case 'light-glyph-dark':
      paintLightGlyph(bitmap, 'disc');
      return;
    case 'glyph-door-closed':
      paintCellGlyph(bitmap, 'door-closed');
      return;
    case 'glyph-door-open':
      paintCellGlyph(bitmap, 'door-open');
      return;
    case 'glyph-blocked':
      paintCellGlyph(bitmap, 'blocked');
      return;
    case 'glyph-fog':
      paintCellGlyph(bitmap, 'fog');
      return;
    case 'glyph-obscured':
      paintCellGlyph(bitmap, 'obscured');
      return;
  }
}
function paintFog(bitmap: Bitmap, state: FogState): void {
  switch (state) {
    case 'hidden':
      bitmap.fill(translucent(neutral(0), 250));
      paintFogHatch(bitmap);
      return;
    case 'unexplored':
      bitmap.fill(translucent(neutral(0), 242));
      for (let x = -128; x < 256; x += 17)
        bitmap.line(x, 0, x - 128, 128, translucent(neutral(2), 245));
      return;
    case 'revealed':
      for (let x = 2; x < TILE_SIZE; x += 7) {
        bitmap.put(x, 0, translucent(neutral(5), 120));
        bitmap.put(x + 3, 127, translucent(neutral(5), 120));
      }
      return;
  }
}

const PLATE_CENTER_X = 64;
const PLATE_CENTER_Y = 72;
const PLATE_RADIUS = 52;
function paintFocus(bitmap: Bitmap, mark: 'active' | 'hidden'): void {
  if (mark === 'active') {
    bitmap.ring(PLATE_CENTER_X, PLATE_CENTER_Y, PLATE_RADIUS + 3, MOSS(6));
    bitmap.ring(PLATE_CENTER_X, PLATE_CENTER_Y, PLATE_RADIUS + 4, MOSS(5));
    return;
  }
  for (let y = 0; y < TILE_SIZE; y += 1)
    for (let x = 0; x < TILE_SIZE; x += 1) {
      const dx = x - PLATE_CENTER_X;
      const dy = y - PLATE_CENTER_Y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < PLATE_RADIUS + 2 || distance >= PLATE_RADIUS + 4) continue;
      const segment = Math.floor(
        ((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 24,
      );
      if (segment % 2 === 0) bitmap.put(x, y, neutral(8));
    }
}
function paintAdjudicated(bitmap: Bitmap): void {
  bitmap.ring(PLATE_CENTER_X, PLATE_CENTER_Y, PLATE_RADIUS + 3, WARM(6));
  bitmap.ring(PLATE_CENTER_X, PLATE_CENTER_Y, PLATE_RADIUS + 4, WARM(5));
  for (const point of [
    { x: 64, y: 9 },
    { x: 64, y: 125 },
    { x: 5, y: 72 },
    { x: 122, y: 72 },
  ])
    bitmap.rect(point.x - 2, point.y - 2, 5, 5, WARM(6));
}
function paintPlate(bitmap: Bitmap, side: TokenSide | 'dead'): void {
  const plateY = 91;
  bitmap.ellipse(PLATE_CENTER_X + 5, plateY + 5, 51, 29, SHARED_SHADOW);
  const palette =
    side === 'party'
      ? COOL
      : side === 'foe'
        ? WARM
        : (step: RampStep): Ink =>
            neutral(Math.min(8, step + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
  bitmap.ellipse(PLATE_CENTER_X, plateY, 51, 29, palette(2));
  bitmap.ellipse(PLATE_CENTER_X - 4, plateY - 4, 46, 24, palette(3));
  bitmap.ellipse(PLATE_CENTER_X - 18, plateY - 9, 24, 13, palette(4));
  bitmap.ellipseRing(PLATE_CENTER_X, plateY, 51, 29, palette(0));
  bitmap.line(21, 76, 45, 66, palette(6));
  bitmap.line(45, 66, 70, 65, palette(6));
}
interface BustColors {
  readonly body: PaletteRamp;
  readonly flesh: PaletteRamp;
}
function shadedHead(
  layer: Bitmap,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  colors: BustColors,
): void {
  layer.ellipse(cx + 3, cy + 4, rx, ry, ramp(colors.flesh, 1));
  layer.ellipse(cx, cy, rx, ry, ramp(colors.flesh, 3));
  layer.ellipse(
    cx - Math.round(rx * 0.3),
    cy - Math.round(ry * 0.3),
    Math.round(rx * 0.55),
    Math.round(ry * 0.5),
    ramp(colors.flesh, 5),
  );
  layer.line(
    cx + rx - 2,
    cy - 2,
    cx + rx - 4,
    cy + ry - 4,
    ramp(colors.flesh, 2),
  );
}
function torso(
  layer: Bitmap,
  top: number,
  left: number,
  right: number,
  colors: BustColors,
): void {
  fillPolygon(
    layer,
    [
      { x: left + 9, y: 105 },
      { x: left, y: 78 },
      { x: left + 8, y: top + 9 },
      { x: 58, y: top },
      { x: right - 7, y: top + 5 },
      { x: right, y: 79 },
      { x: right - 5, y: 105 },
    ],
    ramp(colors.body, 2),
  );
  fillPolygon(
    layer,
    [
      { x: left + 5, y: 78 },
      { x: left + 12, y: top + 8 },
      { x: 59, y: top + 1 },
      { x: 57, y: 103 },
      { x: left + 10, y: 103 },
    ],
    ramp(colors.body, 3),
  );
  layer.line(left + 12, top + 10, 58, top + 2, ramp(colors.body, 6));
  layer.line(83, top + 9, right - 5, 80, ramp(colors.body, 1));
}
function eyePair(layer: Bitmap, cx: number, cy: number, ink: Ink): void {
  layer.rect(cx - 8, cy, 4, 3, ink);
  layer.rect(cx + 4, cy + 1, 4, 3, ink);
}
function bust(layer: Bitmap, archetype: TokenArchetype): void {
  switch (archetype) {
    case 'fighter': {
      const colors = { body: 'metal', flesh: 'skin' } as const;
      torso(layer, 70, 27, 105, colors);
      shadedHead(layer, 61, 48, 16, 18, colors);
      layer.ellipse(31, 76, 13, 11, METAL(4));
      layer.ellipse(99, 78, 12, 10, METAL(2));
      layer.ellipse(61, 39, 19, 12, METAL(3));
      layer.ellipse(57, 35, 14, 8, METAL(5));
      layer.hLine(42, 80, 43, METAL(1));
      layer.line(94, 91, 116, 50, WOOD(2));
      layer.line(95, 91, 117, 50, WOOD(2));
      layer.rect(109, 48, 5, 9, METAL(5));
      layer.rect(111, 49, 2, 2, METAL(6));
      eyePair(layer, 61, 49, neutral(0));
      return;
    }
    case 'wizard': {
      const colors = { body: 'cloth-cool', flesh: 'skin' } as const;
      torso(layer, 73, 32, 98, colors);
      shadedHead(layer, 58, 52, 14, 17, colors);
      fillPolygon(
        layer,
        [
          { x: 29, y: 42 },
          { x: 87, y: 42 },
          { x: 75, y: 35 },
          { x: 69, y: 8 },
          { x: 48, y: 30 },
        ],
        COOL(2),
      );
      fillPolygon(
        layer,
        [
          { x: 49, y: 30 },
          { x: 69, y: 8 },
          { x: 64, y: 37 },
        ],
        COOL(4),
      );
      layer.hLine(29, 87, 43, COOL(0));
      layer.rect(49, 28, 5, 5, SKIN(6));
      layer.vLine(61, 77, 103, COOL(5));
      eyePair(layer, 58, 53, neutral(0));
      return;
    }
    case 'cleric': {
      const colors = { body: 'cloth-warm', flesh: 'skin' } as const;
      torso(layer, 72, 31, 99, colors);
      shadedHead(layer, 63, 50, 15, 18, colors);
      fillPolygon(
        layer,
        [
          { x: 41, y: 61 },
          { x: 39, y: 35 },
          { x: 53, y: 18 },
          { x: 80, y: 21 },
          { x: 87, y: 48 },
          { x: 80, y: 66 },
          { x: 76, y: 47 },
          { x: 48, y: 47 },
        ],
        WARM(2),
      );
      layer.disc(66, 89, 8, SKIN(6));
      layer.ring(66, 89, 8, METAL(4));
      layer.rect(64, 84, 4, 11, METAL(6));
      layer.hLine(61, 71, 89, METAL(6));
      eyePair(layer, 63, 51, neutral(0));
      return;
    }
    case 'rogue': {
      const colors = { body: 'earth', flesh: 'skin' } as const;
      torso(layer, 73, 35, 94, colors);
      shadedHead(layer, 58, 53, 14, 17, colors);
      fillPolygon(
        layer,
        [
          { x: 34, y: 62 },
          { x: 37, y: 32 },
          { x: 55, y: 18 },
          { x: 77, y: 28 },
          { x: 83, y: 58 },
          { x: 73, y: 46 },
          { x: 48, y: 45 },
        ],
        COOL(1),
      );
      layer.rect(43, 54, 30, 10, neutral(1));
      layer.hLine(44, 72, 54, neutral(8));
      layer.line(89, 94, 111, 65, METAL(2));
      layer.line(90, 95, 112, 66, METAL(2));
      layer.rect(87, 92, 7, 6, EARTH(2));
      eyePair(layer, 58, 52, neutral(8));
      return;
    }
    case 'ranger': {
      const colors = { body: 'earth', flesh: 'skin' } as const;
      torso(layer, 72, 28, 97, colors);
      shadedHead(layer, 58, 52, 15, 17, colors);
      fillPolygon(
        layer,
        [
          { x: 37, y: 41 },
          { x: 43, y: 30 },
          { x: 65, y: 25 },
          { x: 83, y: 37 },
          { x: 72, y: 43 },
        ],
        EARTH(3),
      );
      layer.line(74, 27, 94, 8, MOSS(5));
      layer.line(75, 28, 95, 9, MOSS(3));
      for (let y = 24; y <= 102; y += 1) {
        const x = Math.round(101 + Math.sin(((y - 24) / 78) * Math.PI) * 10);
        layer.put(x, y, EARTH(3));
        layer.put(x + 1, y, EARTH(2));
      }
      layer.vLine(101, 24, 102, neutral(0));
      eyePair(layer, 58, 52, neutral(0));
      return;
    }
    case 'brute': {
      const colors = { body: 'skin', flesh: 'skin' } as const;
      torso(layer, 67, 18, 112, colors);
      layer.ellipse(23, 77, 16, 15, SKIN(3));
      layer.ellipse(105, 80, 17, 15, SKIN(2));
      shadedHead(layer, 58, 46, 22, 23, colors);
      layer.rect(42, 42, 34, 4, SKIN(1));
      layer.rect(50, 60, 20, 4, SKIN(1));
      layer.rect(47, 62, 4, 7, neutral(8));
      layer.rect(68, 62, 4, 7, neutral(8));
      layer.line(27, 76, 86, 106, EARTH(2));
      layer.line(28, 77, 87, 107, EARTH(1));
      eyePair(layer, 58, 48, neutral(0));
      return;
    }
    case 'beast': {
      const colors = { body: 'earth', flesh: 'earth' } as const;
      fillPolygon(
        layer,
        [
          { x: 20, y: 102 },
          { x: 24, y: 68 },
          { x: 45, y: 54 },
          { x: 88, y: 59 },
          { x: 108, y: 83 },
          { x: 101, y: 106 },
        ],
        EARTH(2),
      );
      fillPolygon(
        layer,
        [
          { x: 24, y: 68 },
          { x: 46, y: 55 },
          { x: 67, y: 58 },
          { x: 54, y: 100 },
          { x: 22, y: 101 },
        ],
        EARTH(3),
      );
      shadedHead(layer, 69, 50, 23, 18, colors);
      layer.ellipse(86, 59, 17, 10, EARTH(4));
      layer.rect(96, 57, 7, 5, neutral(0));
      fillPolygon(
        layer,
        [
          { x: 48, y: 40 },
          { x: 38, y: 13 },
          { x: 59, y: 32 },
        ],
        EARTH(3),
      );
      fillPolygon(
        layer,
        [
          { x: 78, y: 35 },
          { x: 93, y: 13 },
          { x: 91, y: 44 },
        ],
        EARTH(2),
      );
      eyePair(layer, 68, 48, SKIN(6));
      return;
    }
    case 'undead': {
      const colors = { body: 'stone', flesh: 'metal' } as const;
      torso(layer, 76, 37, 91, colors);
      layer.ellipse(59, 47, 16, 19, neutral(7));
      layer.ellipse(56, 42, 12, 13, neutral(8));
      layer.rect(43, 42, 8, 8, neutral(0));
      layer.rect(61, 40, 8, 9, neutral(0));
      layer.rect(48, 58, 20, 7, neutral(6));
      for (let x = 49; x <= 67; x += 4) layer.vLine(x, 59, 64, neutral(2));
      for (let x = 43; x <= 87; x += 9) layer.vLine(x, 84, 104, neutral(1));
      layer.put(45, 44, COOL(6));
      layer.put(64, 42, COOL(6));
      return;
    }
    case 'fiend': {
      const colors = { body: 'cloth-warm', flesh: 'cloth-warm' } as const;
      torso(layer, 69, 26, 102, colors);
      shadedHead(layer, 61, 49, 16, 19, colors);
      fillPolygon(
        layer,
        [
          { x: 50, y: 33 },
          { x: 34, y: 5 },
          { x: 54, y: 22 },
        ],
        neutral(2),
      );
      fillPolygon(
        layer,
        [
          { x: 72, y: 31 },
          { x: 91, y: 6 },
          { x: 79, y: 38 },
        ],
        neutral(3),
      );
      fillPolygon(
        layer,
        [
          { x: 27, y: 74 },
          { x: 15, y: 52 },
          { x: 39, y: 65 },
        ],
        METAL(2),
      );
      fillPolygon(
        layer,
        [
          { x: 98, y: 75 },
          { x: 115, y: 54 },
          { x: 88, y: 66 },
        ],
        METAL(1),
      );
      layer.rect(50, 61, 20, 3, neutral(0));
      layer.put(50, 64, neutral(8));
      layer.put(69, 64, neutral(8));
      eyePair(layer, 61, 49, SKIN(6));
      return;
    }
    case 'ooze': {
      layer.ellipse(67, 79, 43, 30, MOSS(2));
      layer.ellipse(59, 67, 34, 27, MOSS(3));
      layer.ellipse(47, 50, 21, 18, MOSS(4));
      layer.ellipse(36, 36, 11, 10, MOSS(5));
      layer.ellipse(29, 28, 5, 5, MOSS(6));
      layer.ellipse(87, 91, 17, 13, MOSS(1));
      layer.ellipse(35, 103, 8, 11, MOSS(3));
      layer.ellipse(98, 108, 7, 9, MOSS(2));
      layer.ring(79, 73, 7, MOSS(1));
      layer.ring(67, 92, 5, MOSS(1));
      layer.rect(27, 24, 3, 3, METAL(6));
      return;
    }
    case 'construct': {
      contactShadow(layer, 69, 83, 43, 32);
      layer.rect(24, 72, 81, 34, METAL(3));
      layer.rect(24, 72, 75, 8, METAL(4));
      layer.vLine(24, 72, 105, METAL(5));
      layer.rect(45, 61, 25, 12, STONE(2));
      layer.rect(35, 22, 48, 40, STONE(3));
      layer.hLine(35, 82, 22, STONE(5));
      layer.vLine(35, 22, 61, STONE(5));
      layer.rect(42, 38, 32, 7, neutral(0));
      layer.rect(45, 40, 27, 3, WARM(6));
      layer.rect(48, 54, 25, 3, STONE(1));
      for (const x of [32, 52, 72, 92]) layer.rect(x, 85, 4, 4, METAL(3));
      layer.rect(32, 85, 3, 2, METAL(6));
      return;
    }
  }
}
function outlineLayer(layer: Bitmap, dark: Ink, lit: Ink): void {
  const opaque = (x: number, y: number): boolean => layer.get(x, y).alpha > 0;
  const pixels: {
    readonly x: number;
    readonly y: number;
    readonly ink: Ink;
  }[] = [];
  for (let y = 1; y < TILE_SIZE - 1; y += 1)
    for (let x = 1; x < TILE_SIZE - 1; x += 1) {
      if (opaque(x, y)) continue;
      if (
        ![
          opaque(x - 1, y),
          opaque(x + 1, y),
          opaque(x, y - 1),
          opaque(x, y + 1),
        ].some(Boolean)
      )
        continue;
      pixels.push({ x, y, ink: x + y < TILE_SIZE ? lit : dark });
    }
  for (const pixel of pixels) layer.put(pixel.x, pixel.y, pixel.ink);
}
function outlineRamps(archetype: TokenArchetype): {
  readonly dark: Ink;
  readonly lit: Ink;
} {
  switch (archetype) {
    case 'fighter':
      return { dark: METAL(0), lit: METAL(3) };
    case 'construct':
      return { dark: neutral(0), lit: METAL(3) };
    case 'wizard':
      return { dark: COOL(0), lit: COOL(3) };
    case 'cleric':
    case 'fiend':
      return { dark: WARM(0), lit: WARM(3) };
    case 'rogue':
    case 'ranger':
    case 'beast':
      return { dark: EARTH(0), lit: EARTH(3) };
    case 'brute':
      return { dark: SKIN(0), lit: SKIN(3) };
    case 'undead':
      return { dark: neutral(1), lit: neutral(5) };
    case 'ooze':
      return { dark: MOSS(0), lit: MOSS(3) };
  }
}
function composite(target: Bitmap, layer: Bitmap): void {
  for (let y = 0; y < TILE_SIZE; y += 1)
    for (let x = 0; x < TILE_SIZE; x += 1) {
      const pixel = layer.get(x, y);
      if (pixel.alpha > 0) target.blendRgba(x, y, pixel);
    }
}
function pruneIsolatedColorPixels(bitmap: Bitmap): void {
  const key = (x: number, y: number): string => {
    const color = bitmap.get(x, y);
    return `${String(color.red)},${String(color.green)},${String(color.blue)},${String(color.alpha)}`;
  };
  const replacements: {
    readonly x: number;
    readonly y: number;
    readonly sourceX: number;
    readonly sourceY: number;
  }[] = [];
  for (let y = 0; y < TILE_SIZE; y += 1)
    for (let x = 0; x < TILE_SIZE; x += 1) {
      const color = bitmap.get(x, y);
      if (color.alpha === 0) continue;
      const own = key(x, y);
      const neighbours = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ] as const;
      if (neighbours.some(([nx, ny]) => key(nx, ny) === own)) continue;
      const source = neighbours.find(
        ([nx, ny]) => bitmap.get(nx, ny).alpha > 0,
      );
      if (source !== undefined)
        replacements.push({ x, y, sourceX: source[0], sourceY: source[1] });
    }
  for (const replacement of replacements)
    bitmap.blendRgba(
      replacement.x,
      replacement.y,
      bitmap.get(replacement.sourceX, replacement.sourceY),
    );
}
/** The authored bust layer without its side plate, exposed for composition invariants. */
export function paintTokenBust(archetype: TokenArchetype): Bitmap {
  const layer = new Bitmap(TILE_SIZE, TILE_SIZE);
  bust(layer, archetype);
  const outline = outlineRamps(archetype);
  outlineLayer(layer, outline.dark, outline.lit);
  return layer;
}
function paintToken(
  bitmap: Bitmap,
  archetype: TokenArchetype,
  side: TokenSide,
): void {
  paintPlate(bitmap, side);
  const layer = paintTokenBust(archetype);
  composite(bitmap, layer);
}
function paintDeadToken(bitmap: Bitmap): void {
  paintPlate(bitmap, 'dead');
  const layer = new Bitmap(TILE_SIZE, TILE_SIZE);
  layer.ellipse(70, 78, 34, 14, neutral(4));
  layer.ellipse(64, 72, 29, 11, neutral(6));
  layer.disc(27, 70, 12, neutral(6));
  layer.disc(23, 66, 8, neutral(7));
  layer.rect(47, 59, 7, 19, neutral(4));
  layer.rect(91, 86, 18, 6, neutral(4));
  layer.rect(96, 57, 16, 6, neutral(4));
  outlineLayer(layer, neutral(1), neutral(5));
  composite(bitmap, layer);
}

function recipeMaterialRamp(recipe: ArtRecipe): PaletteRamp | 'neutral' | null {
  switch (recipe.kind) {
    case 'floor':
    case 'wall':
      return 'stone';
    case 'door':
      return 'wood';
    case 'terrain':
      switch (recipe.object) {
        case 'rubble':
          return 'earth';
        case 'crate':
          return 'wood';
        case 'pillar':
          return 'stone';
        case 'hazard':
          return 'cloth-warm';
      }
    case 'token':
      switch (recipe.archetype) {
        case 'fighter':
          return 'metal';
        case 'wizard':
          return 'cloth-cool';
        case 'cleric':
          return 'cloth-warm';
        case 'rogue':
        case 'ranger':
        case 'beast':
          return 'earth';
        case 'brute':
          return 'skin';
        case 'undead':
          return 'neutral';
        case 'fiend':
          return 'cloth-warm';
        case 'ooze':
          return 'moss';
        case 'construct':
          return 'stone';
      }
    case 'token-dead':
      return 'neutral';
    case 'shade':
    case 'overlay':
    case 'fog':
    case 'focus':
    case 'event':
      return null;
  }
}

type MaterialRampName = PaletteRamp | 'neutral';

interface MaterialRegion {
  readonly pixels: readonly Point[];
  readonly membership: ReadonlySet<number>;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly centroidX: number;
  readonly centroidY: number;
}

function rgbKey(color: Pick<Rgba, 'red' | 'green' | 'blue'>): number {
  return color.red * 65_536 + color.green * 256 + color.blue;
}

function materialColorKeys(rampName: MaterialRampName): ReadonlySet<number> {
  const steps = rampName === 'neutral' ? NEUTRAL_STEPS : RAMP_STEPS;
  return new Set(
    steps.map((step) =>
      rgbKey(
        paletteRgb(
          rampName === 'neutral'
            ? neutral(step)
            : ramp(rampName, step as RampStep),
        ),
      ),
    ),
  );
}

function materialRegionIndex(bitmap: Bitmap, x: number, y: number): number {
  return y * bitmap.width + x;
}

function largestMaterialRegion(
  bitmap: Bitmap,
  rampName: MaterialRampName,
): MaterialRegion | null {
  const colors = materialColorKeys(rampName);
  const visited = new Uint8Array(bitmap.width * bitmap.height);
  let largest: readonly Point[] = [];
  for (let y = 0; y < bitmap.height; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      const start = materialRegionIndex(bitmap, x, y);
      const pixel = bitmap.get(x, y);
      if (
        visited[start] === 1 ||
        pixel.alpha !== 255 ||
        !colors.has(rgbKey(pixel))
      )
        continue;
      visited[start] = 1;
      const queue = [start];
      const component: Point[] = [];
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
          const neighbour = materialRegionIndex(
            bitmap,
            neighbourX,
            neighbourY,
          );
          if (visited[neighbour] === 1) continue;
          const neighbourPixel = bitmap.get(neighbourX, neighbourY);
          if (
            neighbourPixel.alpha !== 255 ||
            !colors.has(rgbKey(neighbourPixel))
          )
            continue;
          visited[neighbour] = 1;
          queue.push(neighbour);
        }
      }
      if (component.length > largest.length) largest = component;
    }
  }
  if (largest.length === 0) return null;
  const membership = new Set(
    largest.map(({ x, y }) => materialRegionIndex(bitmap, x, y)),
  );
  const minX = Math.min(...largest.map(({ x }) => x));
  const minY = Math.min(...largest.map(({ y }) => y));
  const maxX = Math.max(...largest.map(({ x }) => x));
  const maxY = Math.max(...largest.map(({ y }) => y));
  return {
    pixels: largest,
    membership,
    minX,
    minY,
    maxX,
    maxY,
    centroidX:
      largest.reduce((sum, { x }) => sum + x, 0) / largest.length,
    centroidY:
      largest.reduce((sum, { y }) => sum + y, 0) / largest.length,
  };
}

function regionContains(
  bitmap: Bitmap,
  region: MaterialRegion,
  x: number,
  y: number,
): boolean {
  return (
    bitmap.inside(x, y) &&
    region.membership.has(materialRegionIndex(bitmap, x, y))
  );
}

function materialInk(rampName: MaterialRampName, step: RampStep): Ink {
  return rampName === 'neutral' ? neutral(step) : ramp(rampName, step);
}

function regionAnchor(
  bitmap: Bitmap,
  region: MaterialRegion,
  pattern: readonly Point[],
  fractionX: number,
  fractionY: number,
): Point | null {
  const targetX = region.minX + (region.maxX - region.minX) * fractionX;
  const targetY = region.minY + (region.maxY - region.minY) * fractionY;
  let best: { readonly point: Point; readonly distance: number } | null = null;
  for (const point of region.pixels) {
    if (
      !pattern.every((offset) =>
        regionContains(
          bitmap,
          region,
          point.x + offset.x,
          point.y + offset.y,
        ),
      )
    )
      continue;
    const distance =
      Math.abs(point.x - targetX) + Math.abs(point.y - targetY);
    if (best === null || distance < best.distance)
      best = { point, distance };
  }
  return best?.point ?? null;
}

function stampMaterialPattern(
  bitmap: Bitmap,
  region: MaterialRegion,
  pattern: readonly Point[],
  fractionX: number,
  fractionY: number,
  ink: Ink,
): boolean {
  const anchor = regionAnchor(
    bitmap,
    region,
    pattern,
    fractionX,
    fractionY,
  );
  if (anchor === null) return false;
  for (const point of pattern)
    bitmap.put(anchor.x + point.x, anchor.y + point.y, ink);
  return true;
}

const MATERIAL_MARK_PIXELS: Readonly<
  Record<MaterialResponse['mark'], readonly Point[]>
> = {
  mortar: [
    ...Array.from({ length: 19 }, (_, index) => ({ x: index - 9, y: 0 })),
    ...Array.from({ length: 8 }, (_, index) => ({ x: 0, y: index + 1 })),
  ],
  grain: [
    ...Array.from({ length: 21 }, (_, index) => ({
      x: index - 10,
      y: index < 13 ? -2 : -1,
    })),
    ...Array.from({ length: 17 }, (_, index) => ({
      x: index - 8,
      y: index < 6 ? 2 : 3,
    })),
  ],
  fracture: [
    ...Array.from({ length: 15 }, (_, index) => ({
      x: index - 7,
      y: Math.floor((index - 7) / 2),
    })),
    { x: 2, y: 2 },
    { x: 3, y: 3 },
    { x: 4, y: 4 },
    { x: -3, y: -3 },
    { x: -4, y: -2 },
  ],
  'specular-cluster': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 0, y: 2 },
  ],
  'broad-fold': [
    ...Array.from({ length: 21 }, (_, index) => ({
      x: index - 10,
      y: Math.floor(index / 5) - 2,
    })),
    ...Array.from({ length: 21 }, (_, index) => ({
      x: index - 10,
      y: Math.floor(index / 5) - 1,
    })),
    ...Array.from({ length: 21 }, (_, index) => ({
      x: index - 10,
      y: Math.floor(index / 5),
    })),
  ],
  'warm-plane': [
    ...Array.from({ length: 10 }, (_, index) => ({ x: index - 5, y: -2 })),
    ...Array.from({ length: 12 }, (_, index) => ({ x: index - 6, y: -1 })),
    ...Array.from({ length: 12 }, (_, index) => ({ x: index - 6, y: 0 })),
    ...Array.from({ length: 9 }, (_, index) => ({ x: index - 5, y: 1 })),
  ],
  joint: [
    { x: 0, y: -2 },
    { x: 0, y: -1 },
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ],
  'internal-lobe': [
    { x: -2, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
  ],
  contact: [
    { x: -3, y: 1 },
    { x: -2, y: 1 },
    { x: -1, y: 1 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
  ],
  hatch: [
    { x: -2, y: 2 },
    { x: -1, y: 1 },
    { x: 0, y: 0 },
    { x: 1, y: -1 },
    { x: 2, y: -2 },
  ],
  glyph: [
    { x: 0, y: -2 },
    { x: 0, y: -1 },
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ],
};

const MATERIAL_MARK_TARGETS = [
  [0.28, 0.3],
  [0.58, 0.55],
  [0.73, 0.74],
] as const;

function paintBroadFolds(
  bitmap: Bitmap,
  region: MaterialRegion,
  rampName: MaterialRampName,
): void {
  const footprint = MATERIAL_MARK_PIXELS['broad-fold'];
  const highlight = materialInk(rampName, 4);
  const mid = materialInk(rampName, 3);
  const shadow = materialInk(rampName, 2);
  const anchors = new Set<number>();
  for (const [fractionX, fractionY] of MATERIAL_MARK_TARGETS) {
    const anchor = regionAnchor(
      bitmap,
      region,
      footprint,
      fractionX,
      fractionY,
    );
    if (anchor === null) continue;
    const anchorKey = materialRegionIndex(bitmap, anchor.x, anchor.y);
    if (anchors.has(anchorKey)) continue;
    anchors.add(anchorKey);
    for (let index = 0; index < 21; index += 1) {
      const x = anchor.x + index - 10;
      const y = anchor.y + Math.floor(index / 5) - 2;
      bitmap.put(x, y, highlight);
      bitmap.put(x, y + 1, mid);
      bitmap.put(x, y + 2, shadow);
    }
  }
}

function paintRepeatedMaterialMarks(
  bitmap: Bitmap,
  region: MaterialRegion,
  mark: Exclude<MaterialResponse['mark'], 'broad-fold' | 'specular-cluster'>,
  rampName: MaterialRampName,
  edge: MaterialResponse['edge'],
): void {
  const pattern = MATERIAL_MARK_PIXELS[mark];
  const ink = materialInk(rampName, edge === 'soft' ? 3 : 2);
  for (const [fractionX, fractionY] of MATERIAL_MARK_TARGETS)
    stampMaterialPattern(
      bitmap,
      region,
      pattern,
      fractionX,
      fractionY,
      ink,
    );
}

function paintHardLitRim(
  bitmap: Bitmap,
  region: MaterialRegion,
  rampName: MaterialRampName,
): void {
  const candidates = new Set<number>();
  for (const point of region.pixels) {
    if (point.x + point.y > region.centroidX + region.centroidY) continue;
    if (
      !regionContains(bitmap, region, point.x - 1, point.y) ||
      !regionContains(bitmap, region, point.x, point.y - 1)
    )
      candidates.add(materialRegionIndex(bitmap, point.x, point.y));
  }
  const ink = materialInk(rampName, 5);
  for (const point of region.pixels) {
    const index = materialRegionIndex(bitmap, point.x, point.y);
    if (!candidates.has(index)) continue;
    const connected = ([
      [point.x - 1, point.y],
      [point.x + 1, point.y],
      [point.x, point.y - 1],
      [point.x, point.y + 1],
    ] as const).some(
      ([x, y]) =>
        bitmap.inside(x, y) &&
        candidates.has(materialRegionIndex(bitmap, x, y)),
    );
    if (connected) bitmap.put(point.x, point.y, ink);
  }
}

function paintSpecularCluster(
  bitmap: Bitmap,
  region: MaterialRegion,
  rampName: MaterialRampName,
): void {
  stampMaterialPattern(
    bitmap,
    region,
    MATERIAL_MARK_PIXELS['specular-cluster'],
    0.28,
    0.28,
    materialInk(rampName, 6),
  );
}

function applyMaterialResponse(
  bitmap: Bitmap,
  response: MaterialResponse,
  rampName: MaterialRampName,
): void {
  const region = largestMaterialRegion(bitmap, rampName);
  if (region === null) return;
  if (response.mark === 'broad-fold')
    paintBroadFolds(bitmap, region, rampName);
  else if (response.mark !== 'specular-cluster')
    paintRepeatedMaterialMarks(
      bitmap,
      region,
      response.mark,
      rampName,
      response.edge,
    );
  if (response.material === 'metal' && response.edge === 'hard')
    paintHardLitRim(bitmap, region, rampName);
  if (response.specular === 'single-cluster') {
    paintSpecularCluster(bitmap, region, rampName);
  }
}

export function paintRecipe(
  recipe: ArtRecipe,
  overrides: MaterialResponseOverrides = {},
): Bitmap {
  const response =
    overrides[recipe.material] ?? MATERIAL_RESPONSES[recipe.material];
  const bitmap = new Bitmap(TILE_SIZE, TILE_SIZE);
  switch (recipe.kind) {
    case 'floor':
      paintFloor(bitmap, recipe.variant);
      break;
    case 'wall':
      paintWall(bitmap, recipe.piece);
      break;
    case 'door':
      paintDoor(bitmap, recipe.side, recipe.state);
      break;
    case 'shade':
      paintShade(bitmap, recipe.side);
      break;
    case 'terrain':
      switch (recipe.object) {
        case 'rubble':
          paintRubble(bitmap);
          break;
        case 'crate':
          paintCrate(bitmap);
          break;
        case 'pillar':
          paintPillar(bitmap);
          break;
        case 'hazard':
          paintHazard(bitmap);
          break;
      }
      break;
    case 'overlay':
      paintOverlay(bitmap, recipe.effect);
      break;
    case 'fog':
      paintFog(bitmap, recipe.state);
      break;
    case 'focus':
      paintFocus(bitmap, recipe.mark);
      break;
    case 'event':
      paintAdjudicated(bitmap);
      break;
    case 'token':
      paintToken(bitmap, recipe.archetype, recipe.side);
      break;
    case 'token-dead':
      paintDeadToken(bitmap);
      break;
  }
  if (
    recipe.kind === 'floor' ||
    recipe.kind === 'wall' ||
    recipe.kind === 'door' ||
    recipe.kind === 'terrain'
  )
    pruneIsolatedColorPixels(bitmap);
  const materialRamp = recipeMaterialRamp(recipe);
  if (materialRamp !== null)
    applyMaterialResponse(bitmap, response, materialRamp);
  return bitmap;
}
export function renderPixelArtPng(recipe: ArtRecipe): Uint8Array {
  const bitmap = paintRecipe(recipe);
  return encodePng(bitmap.width, bitmap.height, bitmap.data);
}
