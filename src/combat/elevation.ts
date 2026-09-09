import type { KnownCreatureSize } from '../domain/enums';
import type { Brand } from '../domain/ids';
import type { GridCell } from './grid';
import type { Feet } from './values';

export const GROUND_ELEVATION_TIERS = ['pit', 'floor', 'raised'] as const;
export type GroundElevationTier = (typeof GROUND_ELEVATION_TIERS)[number];

export const ELEVATION_TIERS = [
  'pit',
  'floor',
  'raised',
  'flying',
] as const;
export type ElevationTier = (typeof ELEVATION_TIERS)[number];

export type TokenAltitude =
  | { readonly kind: 'grounded' }
  | { readonly kind: 'flying' };

export type ElevationFeet = Brand<number, 'ElevationFeet'>;

export type HeightSelection =
  | { readonly kind: 'project_default' }
  | { readonly kind: 'override'; readonly feet: Feet };

export type HeightResolution =
  | { readonly kind: 'resolved'; readonly feet: Feet }
  | {
      readonly kind: 'unresolved';
      readonly reason: 'creature_height_required';
    };

export interface ElevationRegion {
  readonly id: string;
  readonly tier: 'pit' | 'raised';
  readonly cells: readonly GridCell[];
}

export interface WaterRegion {
  readonly id: string;
  readonly cells: readonly GridCell[];
}

export interface ElevationLayout {
  readonly kind: 'elevation_tiers_v1';
  readonly defaultTier: 'floor';
  readonly regions: readonly ElevationRegion[];
  readonly waterRegions: readonly WaterRegion[];
}

export interface ProjectHeightDefaults {
  readonly tierBaseFeet: Readonly<Record<ElevationTier, ElevationFeet>>;
  readonly creatureHeightFeet: Readonly<Record<KnownCreatureSize, Feet>>;
  readonly obstacleHeightFeet: Readonly<
    Record<'half_cover' | 'three_quarters_cover' | 'wall', Feet>
  >;
}

/** Establishes the finite half-foot invariant for tier base elevations. */
export function elevationFeet(value: number): ElevationFeet {
  if (!Number.isFinite(value) || !Number.isInteger(value * 2)) {
    throw new RangeError(
      'ElevationFeet must be a finite number in half-foot increments.',
    );
  }
  return value as ElevationFeet;
}

function sameCell(left: GridCell, right: GridCell): boolean {
  return left.column === right.column && left.row === right.row;
}

/** Resolves a cell independently of water, which is orthogonal to elevation. */
export function groundElevationAt(
  layout: ElevationLayout,
  cell: GridCell,
): GroundElevationTier {
  let resolved: GroundElevationTier = layout.defaultTier;
  for (const region of layout.regions) {
    if (!region.cells.some((candidate) => sameCell(candidate, cell))) {
      continue;
    }
    if (resolved !== layout.defaultTier && resolved !== region.tier) {
      throw new RangeError(
        `Grid cell ${String(cell.column)},${String(cell.row)} belongs to conflicting elevation tiers.`,
      );
    }
    resolved = region.tier;
  }
  return resolved;
}
