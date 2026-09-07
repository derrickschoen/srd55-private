import type { GridCell } from './grid';

export const TERRAIN_KINDS = ['open', 'half_cover', 'three_quarters_cover', 'wall'] as const;
export type TerrainKind = (typeof TERRAIN_KINDS)[number];
export type CoverTier = 'none' | 'half' | 'three_quarters' | 'total';
export type TerrainPassability = 'open' | 'difficult' | 'blocked';

/** The four canonical profiles over the existing persisted blocking triple. */
export type CanonicalWorldObjectBlocking =
  | { readonly movement: false; readonly lineOfSight: false; readonly cover: 'none' }
  | { readonly movement: false; readonly lineOfSight: false; readonly cover: 'half' }
  | { readonly movement: true; readonly lineOfSight: false; readonly cover: 'three_quarters' }
  | { readonly movement: true; readonly lineOfSight: true; readonly cover: 'total' };

/** Transitional decoded wire input; Increment 1b closes schemas to the canonical subtype. */
export interface WorldObjectBlockingWire {
  readonly movement: boolean;
  readonly lineOfSight: boolean;
  readonly cover: CoverTier;
}

export interface TerrainProfile {
  readonly coverTier: CoverTier;
  readonly passability: TerrainPassability;
  readonly blocksSight: boolean;
  readonly blocking: CanonicalWorldObjectBlocking;
}

export const TERRAIN_PROFILES = Object.freeze({
  open: Object.freeze({
    coverTier: 'none', passability: 'open', blocksSight: false,
    blocking: Object.freeze({ movement: false, lineOfSight: false, cover: 'none' }),
  }),
  half_cover: Object.freeze({
    coverTier: 'half', passability: 'difficult', blocksSight: false,
    blocking: Object.freeze({ movement: false, lineOfSight: false, cover: 'half' }),
  }),
  three_quarters_cover: Object.freeze({
    coverTier: 'three_quarters', passability: 'blocked', blocksSight: false,
    blocking: Object.freeze({ movement: true, lineOfSight: false, cover: 'three_quarters' }),
  }),
  wall: Object.freeze({
    coverTier: 'total', passability: 'blocked', blocksSight: true,
    blocking: Object.freeze({ movement: true, lineOfSight: true, cover: 'total' }),
  }),
} as const satisfies Readonly<Record<TerrainKind, TerrainProfile>>);

export function terrainProfile(kind: TerrainKind): TerrainProfile {
  return TERRAIN_PROFILES[kind];
}

export function terrainBlocking(kind: TerrainKind): CanonicalWorldObjectBlocking {
  return TERRAIN_PROFILES[kind].blocking;
}

export function terrainKindOfBlocking(blocking: CanonicalWorldObjectBlocking): TerrainKind {
  switch (blocking.cover) {
    case 'none': return 'open';
    case 'half': return 'half_cover';
    case 'three_quarters': return 'three_quarters_cover';
    case 'total': return 'wall';
  }
}

export function coverRank(tier: CoverTier): number {
  switch (tier) {
    case 'none': return 0;
    case 'half': return 1;
    case 'three_quarters': return 2;
    case 'total': return 3;
  }
}

export function passabilityRank(passability: TerrainPassability): number {
  switch (passability) {
    case 'open': return 0;
    case 'difficult': return 1;
    case 'blocked': return 2;
  }
}

export interface TerrainWorldObject {
  readonly id: string;
  readonly footprint: readonly GridCell[];
  readonly blocking: WorldObjectBlockingWire;
}

export interface TerrainState {
  readonly blockedCells: readonly GridCell[];
  readonly worldObjects: readonly TerrainWorldObject[];
}

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

export function terrainPassabilityAt(state: TerrainState, cell: GridCell): TerrainPassability {
  const key = cellKey(cell);
  if (state.blockedCells.some((candidate) => cellKey(candidate) === key)) return 'blocked';
  let passability: TerrainPassability = 'open';
  for (const object of state.worldObjects) {
    if (!object.footprint.some((candidate) => cellKey(candidate) === key)) continue;
    const candidate = TERRAIN_PROFILES[terrainKindOfWireBlocking(object.blocking)].passability;
    if (candidate === 'blocked') return 'blocked';
    if (candidate === 'difficult') passability = 'difficult';
  }
  return passability;
}

export function terrainWallCells(state: TerrainState): readonly GridCell[] {
  const cells = [
    ...state.blockedCells,
    ...state.worldObjects.flatMap((object) =>
      terrainKindOfWireBlocking(object.blocking) === 'wall' ? object.footprint : []),
  ];
  return [...new Map(cells.map((cell) => [cellKey(cell), cell] as const)).values()];
}

/** Runtime interpretation during the 1a/1b atomic seam; cover is the stable wire discriminant. */
export function terrainKindOfWireBlocking(blocking: WorldObjectBlockingWire): TerrainKind {
  switch (blocking.cover) {
    case 'none': return 'open';
    case 'half': return 'half_cover';
    case 'three_quarters': return 'three_quarters_cover';
    case 'total': return 'wall';
  }
}
