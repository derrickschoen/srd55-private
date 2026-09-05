import { describe, expect, it } from 'vitest';
import { bytesEqual, type Bitmap } from '../../../src/assets/bitmap';
import {
  BAND_SIDES,
  DOOR_STATES,
  FLOOR_VARIANTS,
  TILE_SIZE,
  TOKEN_ARCHETYPES,
  TOKEN_SIDES,
  WALL_PIECES,
  paintRecipe,
  renderPixelArtPng,
  tokenRecipe,
  type ArtRecipe,
  type BandSide,
  type WallPiece,
} from '../../../src/assets/pixel-art';
import { pngDimensions } from '../../../src/assets/png';
import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';

const wall = (piece: WallPiece): Bitmap => paintRecipe({ kind: 'wall', material: 'stone', piece });
const door = (side: BandSide, state: 'closed' | 'open'): Bitmap => paintRecipe({ kind: 'door', material: 'wood', side, state });

function expectEdge(label: string, left: Uint8Array, right: Uint8Array): void {
  expect(bytesEqual(left, right), label).toBe(true);
}

describe('D516 wall band and doors join seamlessly', () => {
  /**
   * Tiles sit on the native lattice, so the pixels that meet at a boundary are
   * the final column of the left tile and column 0
   * of the right tile: different columns of one continuous pattern. Seamless
   * therefore means a corner (or door) piece shows exactly what the straight
   * band shows at that same column/row, i.e. its edge treatment never deviates
   * from the band it continues.
   */
  it('every corner and door piece continues the straight band at the shared boundary', () => {
    const n = wall('n');
    const s = wall('s');
    const w = wall('w');
    const e = wall('e');
    const nw = wall('nw');
    const ne = wall('ne');
    const sw = wall('sw');
    const se = wall('se');
    const last = TILE_SIZE - 1;
    expectEdge('nw|n', nw.column(last), n.column(last));
    expectEdge('n|ne', ne.column(0), n.column(0));
    expectEdge('sw|s', sw.column(last), s.column(last));
    expectEdge('s|se', se.column(0), s.column(0));
    expectEdge('nw/w', nw.row(last), w.row(last));
    expectEdge('w/sw', sw.row(0), w.row(0));
    expectEdge('ne/e', ne.row(last), e.row(last));
    expectEdge('e/se', se.row(0), e.row(0));
    for (const state of DOOR_STATES) {
      expectEdge(`door-n|n ${state}`, door('n', state).column(0), n.column(0));
      expectEdge(`n|door-n ${state}`, door('n', state).column(last), n.column(last));
      expectEdge(`door-s|s ${state}`, door('s', state).column(0), s.column(0));
      expectEdge(`s|door-s ${state}`, door('s', state).column(last), s.column(last));
      expectEdge(`door-w/w ${state}`, door('w', state).row(0), w.row(0));
      expectEdge(`w/door-w ${state}`, door('w', state).row(last), w.row(last));
      expectEdge(`door-e/e ${state}`, door('e', state).row(0), e.row(0));
      expectEdge(`e/door-e ${state}`, door('e', state).row(last), e.row(last));
    }
    // The band is genuinely different from its corners away from the boundary.
    expect(bytesEqual(nw.column(0), n.column(0))).toBe(false);
    expect(bytesEqual(ne.column(last), n.column(last))).toBe(false);
  });

  it('gives each wall piece a distinct rim treatment and each door a distinct orientation', () => {
    const pieces = WALL_PIECES.map((piece) => Buffer.from(wall(piece).data).toString('base64'));
    expect(new Set(pieces).size).toBe(WALL_PIECES.length);
    const doors = BAND_SIDES.flatMap((side) => DOOR_STATES.map((state) => Buffer.from(door(side, state).data).toString('base64')));
    expect(new Set(doors).size).toBe(BAND_SIDES.length * DOOR_STATES.length);
  });

  it('floors are four distinct opaque slab layouts', () => {
    const floors = FLOOR_VARIANTS.map((variant) => paintRecipe({ kind: 'floor', material: 'stone', variant }));
    expect(new Set(floors.map((bitmap) => Buffer.from(bitmap.data).toString('base64'))).size).toBe(4);
    for (const floor of floors) {
      for (let index = 3; index < floor.data.length; index += 4) expect(floor.data[index]).toBe(255);
    }
  });
});

describe('D516 tokens', () => {
  const tokenRecipes: readonly ArtRecipe[] = [
    ...TOKEN_SIDES.flatMap((side) => TOKEN_ARCHETYPES.map((archetype): ArtRecipe => tokenRecipe(archetype, side))),
    { kind: 'token-dead', material: 'bone' },
  ];

  it('every token frame keeps a 1-px transparent margin and stands on a base plate', () => {
    for (const recipe of tokenRecipes) {
      const label = JSON.stringify(recipe);
      const bitmap = paintRecipe(recipe);
      for (let index = 0; index < TILE_SIZE; index += 1) {
        expect(bitmap.get(index, 0).alpha, `${label} top`).toBe(0);
        expect(bitmap.get(index, TILE_SIZE - 1).alpha, `${label} bottom`).toBe(0);
        expect(bitmap.get(0, index).alpha, `${label} left`).toBe(0);
        expect(bitmap.get(TILE_SIZE - 1, index).alpha, `${label} right`).toBe(0);
      }
      let annulus = 0;
      let opaque = 0;
      for (let y = 0; y < TILE_SIZE; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
          const dx = (x + 0.5 - 64) / 51;
          const dy = (y + 0.5 - 91) / 29;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 0.92 || distance > 0.99) continue;
          annulus += 1;
          if (bitmap.get(x, y).alpha === 255) opaque += 1;
        }
      }
      expect(opaque / annulus, `${label} plate`).toBeGreaterThan(0.97);
    }
  });

  it('party and foe plates differ while the bust is shared', () => {
    for (const archetype of TOKEN_ARCHETYPES) {
      const party = paintRecipe(tokenRecipe(archetype, 'party'));
      const foe = paintRecipe(tokenRecipe(archetype, 'foe'));
      expect(bytesEqual(party.data, foe.data)).toBe(false);
      expect(bytesEqual(party.row(110), foe.row(110))).toBe(false);
    }
    const archetypes = TOKEN_ARCHETYPES.map((archetype) => Buffer.from(paintRecipe(tokenRecipe(archetype, 'foe')).data).toString('base64'));
    expect(new Set(archetypes).size).toBe(TOKEN_ARCHETYPES.length);
  });
});

describe('D516 determinism', () => {
  it('renders identical bytes for identical inputs at native resolution', () => {
    for (const input of STARTER_ART_INPUTS) {
      const first = renderPixelArtPng(input.recipe);
      const second = renderPixelArtPng(input.recipe);
      expect(bytesEqual(first, second), input.id).toBe(true);
      expect(pngDimensions(first), input.id).toEqual({ width: TILE_SIZE, height: TILE_SIZE });
      expect(first.length, input.id).toBeLessThan(12_000);
    }
  });
});
