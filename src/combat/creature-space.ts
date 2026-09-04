import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import type { GridBounds, GridCell } from './grid';
import { feet, type Feet } from './values';

export type { KnownCreatureSize } from '../domain/enums';

type SizedCombatantStateBySize = {
  readonly [Size in KnownCreatureSize]: {
    readonly effectiveSize: Size;
  };
};

/** A combatant whose current mechanical size has already been established. */
export type SizedCombatantState<
  Size extends KnownCreatureSize = KnownCreatureSize,
> = SizedCombatantStateBySize[Size];

export type SqueezePair =
  | { readonly actual: 'Small'; readonly sizedFor: 'Tiny' }
  | { readonly actual: 'Medium'; readonly sizedFor: 'Small' }
  | { readonly actual: 'Large'; readonly sizedFor: 'Medium' }
  | { readonly actual: 'Huge'; readonly sizedFor: 'Large' }
  | { readonly actual: 'Gargantuan'; readonly sizedFor: 'Huge' };

export type SqueezePairFor<Size extends KnownCreatureSize> = Extract<
  SqueezePair,
  { readonly actual: Size }
>;

export type SqueezableCreatureSize = SqueezePair['actual'];
export type SqueezableSizedCombatantState = SizedCombatantState<SqueezableCreatureSize>;

const normalPlacementBrand = Symbol('NormalPlacement');
const squeezedPlacementBrand = Symbol('SqueezedPlacement');
const traversalPlacementBrand = Symbol('TraversalPlacement');
const creatureSpaceBrand = Symbol('CreatureSpace');
const brandPresent: true = true;

export interface NormalPlacement<Size extends KnownCreatureSize> {
  readonly kind: 'normal';
  readonly actual: Size;
  readonly [normalPlacementBrand]: true;
}

export interface SqueezedPlacement<Pair extends SqueezePair> {
  readonly kind: 'squeezed';
  readonly pair: Pair;
  readonly [squeezedPlacementBrand]: true;
}

export type PlacementModeFor<Size extends KnownCreatureSize> =
  | NormalPlacement<Size>
  | (Size extends SqueezableCreatureSize
      ? SqueezedPlacement<SqueezePairFor<Size>>
      : never);

export interface TraversalPlacement<
  Size extends KnownCreatureSize,
  Mode extends PlacementModeFor<Size> = PlacementModeFor<Size>,
> {
  readonly anchor: GridCell;
  readonly mode: Mode;
  readonly [traversalPlacementBrand]: true;
}

type OneCell = readonly [GridCell];
type FourCells = readonly [GridCell, GridCell, GridCell, GridCell];
type NineCells = readonly [
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
];
type SixteenCells = readonly [
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
];
type ExactFootprintCells = OneCell | FourCells | NineCells | SixteenCells;

export interface CreatureSpace<
  Size extends KnownCreatureSize,
  Mode extends PlacementModeFor<Size> = PlacementModeFor<Size>,
> {
  readonly actualSize: Size;
  readonly controlledAs: KnownCreatureSize;
  readonly anchor: GridCell;
  readonly mode: Mode;
  readonly cells: ExactFootprintCells;
  readonly [creatureSpaceBrand]: true;
}

export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

export interface MinimumSpaceLine {
  readonly distance: Feet;
  readonly sourceCell: GridCell;
  readonly targetCell: GridCell;
  readonly sourceCenter: GridPoint;
  readonly targetCenter: GridPoint;
}

const knownCreatureSizes: ReadonlySet<string> = new Set(creatureSizes);

function assertKnownCreatureSize(value: string): asserts value is KnownCreatureSize {
  if (!knownCreatureSizes.has(value)) {
    throw new TypeError(`Unknown mechanical creature size: ${value}`);
  }
}

function assertAnchor(anchor: GridCell): void {
  if (
    !Number.isSafeInteger(anchor.column) ||
    !Number.isSafeInteger(anchor.row) ||
    anchor.column < 0 ||
    anchor.row < 0
  ) {
    throw new RangeError('Creature-space anchors must use non-negative safe-integer coordinates.');
  }
}

function cell(column: number, row: number): GridCell {
  return Object.freeze({ column, row });
}

function unreachable(value: never): never {
  throw new TypeError(`Unreachable creature-space variant: ${String(value)}`);
}

export function sizedCombatantState<const Size extends KnownCreatureSize>(
  effectiveSize: Size,
): SizedCombatantState<Size>;
export function sizedCombatantState(
  effectiveSize: KnownCreatureSize,
): SizedCombatantState {
  assertKnownCreatureSize(effectiveSize);
  switch (effectiveSize) {
    case 'Tiny':
      return Object.freeze({ effectiveSize: 'Tiny' });
    case 'Small':
      return Object.freeze({ effectiveSize: 'Small' });
    case 'Medium':
      return Object.freeze({ effectiveSize: 'Medium' });
    case 'Large':
      return Object.freeze({ effectiveSize: 'Large' });
    case 'Huge':
      return Object.freeze({ effectiveSize: 'Huge' });
    case 'Gargantuan':
      return Object.freeze({ effectiveSize: 'Gargantuan' });
  }
  return unreachable(effectiveSize);
}

export function normalPlacementFor<const Combatant extends SizedCombatantState>(
  combatant: Combatant,
): NormalPlacement<Combatant['effectiveSize']> {
  assertKnownCreatureSize(combatant.effectiveSize);
  return Object.freeze({
    kind: 'normal',
    actual: combatant.effectiveSize,
    [normalPlacementBrand]: brandPresent,
  });
}

export function squeezedPlacementFor(
  combatant: SizedCombatantState<'Small'>,
): SqueezedPlacement<{ readonly actual: 'Small'; readonly sizedFor: 'Tiny' }>;
export function squeezedPlacementFor(
  combatant: SizedCombatantState<'Medium'>,
): SqueezedPlacement<{ readonly actual: 'Medium'; readonly sizedFor: 'Small' }>;
export function squeezedPlacementFor(
  combatant: SizedCombatantState<'Large'>,
): SqueezedPlacement<{ readonly actual: 'Large'; readonly sizedFor: 'Medium' }>;
export function squeezedPlacementFor(
  combatant: SizedCombatantState<'Huge'>,
): SqueezedPlacement<{ readonly actual: 'Huge'; readonly sizedFor: 'Large' }>;
export function squeezedPlacementFor(
  combatant: SizedCombatantState<'Gargantuan'>,
): SqueezedPlacement<{ readonly actual: 'Gargantuan'; readonly sizedFor: 'Huge' }>;
export function squeezedPlacementFor(
  combatant: SqueezableSizedCombatantState,
): SqueezedPlacement<SqueezePair> {
  assertKnownCreatureSize(combatant.effectiveSize);
  switch (combatant.effectiveSize) {
    case 'Small':
      return Object.freeze({
        kind: 'squeezed',
        pair: Object.freeze({ actual: 'Small', sizedFor: 'Tiny' }),
        [squeezedPlacementBrand]: brandPresent,
      });
    case 'Medium':
      return Object.freeze({
        kind: 'squeezed',
        pair: Object.freeze({ actual: 'Medium', sizedFor: 'Small' }),
        [squeezedPlacementBrand]: brandPresent,
      });
    case 'Large':
      return Object.freeze({
        kind: 'squeezed',
        pair: Object.freeze({ actual: 'Large', sizedFor: 'Medium' }),
        [squeezedPlacementBrand]: brandPresent,
      });
    case 'Huge':
      return Object.freeze({
        kind: 'squeezed',
        pair: Object.freeze({ actual: 'Huge', sizedFor: 'Large' }),
        [squeezedPlacementBrand]: brandPresent,
      });
    case 'Gargantuan':
      return Object.freeze({
        kind: 'squeezed',
        pair: Object.freeze({ actual: 'Gargantuan', sizedFor: 'Huge' }),
        [squeezedPlacementBrand]: brandPresent,
      });
  }
  throw new TypeError('Tiny creatures cannot use squeezed placement.');
}

function modeActualSize<Size extends KnownCreatureSize>(
  mode: PlacementModeFor<Size>,
): KnownCreatureSize {
  switch (mode.kind) {
    case 'normal':
      return mode.actual;
    case 'squeezed':
      return mode.pair.actual;
  }
}

function controlledSize<Size extends KnownCreatureSize>(
  mode: PlacementModeFor<Size>,
): KnownCreatureSize {
  switch (mode.kind) {
    case 'normal':
      return mode.actual;
    case 'squeezed':
      return mode.pair.sizedFor;
  }
}

export function placementFor<
  const Combatant extends SizedCombatantState,
  const Mode extends PlacementModeFor<NoInfer<Combatant['effectiveSize']>>,
>(
  combatant: Combatant,
  anchor: GridCell,
  mode: Mode,
): TraversalPlacement<Combatant['effectiveSize'], Mode> {
  assertKnownCreatureSize(combatant.effectiveSize);
  assertAnchor(anchor);
  if (modeActualSize(mode) !== combatant.effectiveSize) {
    throw new TypeError('Placement mode does not belong to the sized combatant.');
  }
  return Object.freeze({
    anchor: cell(anchor.column, anchor.row),
    mode,
    [traversalPlacementBrand]: brandPresent,
  });
}

function footprintCells(
  size: KnownCreatureSize,
  anchor: GridCell,
): ExactFootprintCells {
  const column = anchor.column;
  const row = anchor.row;
  switch (size) {
    case 'Tiny':
      return Object.freeze([cell(column, row)]);
    case 'Small':
      return Object.freeze([cell(column, row)]);
    case 'Medium':
      return Object.freeze([cell(column, row)]);
    case 'Large':
      return Object.freeze([
        cell(column, row),
        cell(column + 1, row),
        cell(column, row + 1),
        cell(column + 1, row + 1),
      ]);
    case 'Huge':
      return Object.freeze([
        cell(column, row),
        cell(column + 1, row),
        cell(column + 2, row),
        cell(column, row + 1),
        cell(column + 1, row + 1),
        cell(column + 2, row + 1),
        cell(column, row + 2),
        cell(column + 1, row + 2),
        cell(column + 2, row + 2),
      ]);
    case 'Gargantuan':
      return Object.freeze([
        cell(column, row),
        cell(column + 1, row),
        cell(column + 2, row),
        cell(column + 3, row),
        cell(column, row + 1),
        cell(column + 1, row + 1),
        cell(column + 2, row + 1),
        cell(column + 3, row + 1),
        cell(column, row + 2),
        cell(column + 1, row + 2),
        cell(column + 2, row + 2),
        cell(column + 3, row + 2),
        cell(column, row + 3),
        cell(column + 1, row + 3),
        cell(column + 2, row + 3),
        cell(column + 3, row + 3),
      ]);
  }
  return unreachable(size);
}

export function creatureSpace<
  const Combatant extends SizedCombatantState,
  const Mode extends PlacementModeFor<NoInfer<Combatant['effectiveSize']>>,
>(
  combatant: Combatant,
  placement: TraversalPlacement<Combatant['effectiveSize'], Mode>,
): CreatureSpace<Combatant['effectiveSize'], Mode> {
  assertKnownCreatureSize(combatant.effectiveSize);
  if (modeActualSize(placement.mode) !== combatant.effectiveSize) {
    throw new TypeError('Traversal placement does not belong to the sized combatant.');
  }
  const controlledAs = controlledSize(placement.mode);
  return Object.freeze({
    actualSize: combatant.effectiveSize,
    controlledAs,
    anchor: placement.anchor,
    mode: placement.mode,
    cells: footprintCells(controlledAs, placement.anchor),
    [creatureSpaceBrand]: brandPresent,
  });
}

export function gridCellKey(value: GridCell): string {
  if (!Number.isSafeInteger(value.column) || !Number.isSafeInteger(value.row)) {
    throw new RangeError('Grid-cell keys require safe-integer coordinates.');
  }
  return `${String(value.row)}:${String(value.column)}`;
}

export function spaceFitsBounds(
  space: CreatureSpace<KnownCreatureSize>,
  bounds: GridBounds,
): boolean {
  if (
    !Number.isSafeInteger(bounds.columns) ||
    !Number.isSafeInteger(bounds.rows) ||
    bounds.columns <= 0 ||
    bounds.rows <= 0
  ) {
    return false;
  }
  return space.cells.every((occupied) =>
    occupied.column >= 0 &&
    occupied.column < bounds.columns &&
    occupied.row >= 0 &&
    occupied.row < bounds.rows);
}

export function spaceTouchesCellSet(
  space: CreatureSpace<KnownCreatureSize>,
  cells: readonly GridCell[],
): boolean {
  const keys = new Set(cells.map(gridCellKey));
  return space.cells.some((occupied) => keys.has(gridCellKey(occupied)));
}

export function spacesIntersect(
  left: CreatureSpace<KnownCreatureSize>,
  right: CreatureSpace<KnownCreatureSize>,
): boolean {
  return spaceTouchesCellSet(left, right.cells);
}

function cellDistance(left: GridCell, right: GridCell): Feet {
  return feet(Math.max(
    Math.abs(left.column - right.column),
    Math.abs(left.row - right.row),
  ) * 5);
}

function centerOf(value: GridCell): GridPoint {
  return Object.freeze({ x: value.column + 0.5, y: value.row + 0.5 });
}

export function minimumSpaceLine(
  source: CreatureSpace<KnownCreatureSize>,
  target: CreatureSpace<KnownCreatureSize>,
): MinimumSpaceLine {
  const firstSource = source.cells[0];
  const firstTarget = target.cells[0];
  let selectedSource = firstSource;
  let selectedTarget = firstTarget;
  let selectedDistance = cellDistance(firstSource, firstTarget);

  for (const sourceCell of source.cells) {
    for (const targetCell of target.cells) {
      const distance = cellDistance(sourceCell, targetCell);
      if (distance < selectedDistance) {
        selectedSource = sourceCell;
        selectedTarget = targetCell;
        selectedDistance = distance;
      }
    }
  }

  return Object.freeze({
    distance: selectedDistance,
    sourceCell: selectedSource,
    targetCell: selectedTarget,
    sourceCenter: centerOf(selectedSource),
    targetCenter: centerOf(selectedTarget),
  });
}

export function minimumSpaceDistance(
  left: CreatureSpace<KnownCreatureSize>,
  right: CreatureSpace<KnownCreatureSize>,
): Feet {
  return minimumSpaceLine(left, right).distance;
}
