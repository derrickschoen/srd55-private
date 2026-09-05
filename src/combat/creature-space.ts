import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import type { GridBounds, GridCell } from './grid';
import { feet, type Feet } from './values';
import type { CombatantId } from './values';

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

/** Persisted traversal vocabulary. Opaque placements are rebuilt at decode boundaries. */
export type SerializedPlacementMode<Size extends KnownCreatureSize = KnownCreatureSize> =
  Size extends 'Tiny'
    ? { readonly kind: 'normal'; readonly actual: 'Tiny' }
    : Size extends 'Small'
      ? { readonly kind: 'normal'; readonly actual: 'Small' } |
        { readonly kind: 'squeezed'; readonly actual: 'Small'; readonly sizedFor: 'Tiny' }
      : Size extends 'Medium'
        ? { readonly kind: 'normal'; readonly actual: 'Medium' } |
          { readonly kind: 'squeezed'; readonly actual: 'Medium'; readonly sizedFor: 'Small' }
        : Size extends 'Large'
          ? { readonly kind: 'normal'; readonly actual: 'Large' } |
            { readonly kind: 'squeezed'; readonly actual: 'Large'; readonly sizedFor: 'Medium' }
          : Size extends 'Huge'
            ? { readonly kind: 'normal'; readonly actual: 'Huge' } |
              { readonly kind: 'squeezed'; readonly actual: 'Huge'; readonly sizedFor: 'Large' }
            : Size extends 'Gargantuan'
              ? { readonly kind: 'normal'; readonly actual: 'Gargantuan' } |
                { readonly kind: 'squeezed'; readonly actual: 'Gargantuan'; readonly sizedFor: 'Huge' }
              : never;

export interface SerializedTraversalPlacement<Size extends KnownCreatureSize = KnownCreatureSize> {
  readonly anchor: GridCell;
  readonly mode: SerializedPlacementMode<Size>;
}

export interface SerializedCreatureSpaceProjection {
  readonly position: GridCell;
  readonly effectiveSize: KnownCreatureSize;
  readonly placementMode: SerializedPlacementMode;
  readonly footprint: readonly GridCell[];
}

export type PlacementPurpose =
  | 'encounter_entry'
  | 'movement_transit'
  | 'voluntary_move_endpoint'
  | 'forced_move_endpoint'
  | 'teleport_endpoint'
  | 'summon_endpoint'
  | 'legendary_move_endpoint'
  | 'discretionary_size_change'
  | 'mandatory_size_change'
  | 'return_from_absence'
  | 'dm_pending_resolution';

const narrowOpeningIdBrand = Symbol('NarrowOpeningId');
export type NarrowOpeningId = string & { readonly [narrowOpeningIdBrand]: true };

const effectSequenceBrand = Symbol('EffectSequence');
export type EffectSequence = number & { readonly [effectSequenceBrand]: true };

export interface SizeStepOperation {
  readonly kind: 'size_step';
  readonly operation: 'enlarge' | 'reduce';
}

export interface NarrowOpeningRegion {
  readonly id: NarrowOpeningId;
  readonly sizedFor: KnownCreatureSize;
  readonly cells: readonly [GridCell, ...GridCell[]];
}

export type SharedSpaceProvenance =
  | 'tiny_capacity'
  | 'forced_movement'
  | 'dm_pending_resolution';

export interface SharedSpaceRelation {
  readonly first: CombatantId;
  readonly second: CombatantId;
  readonly provenance: SharedSpaceProvenance;
  readonly originatingId: string;
}

export type PlacementRefusal =
  | { readonly kind: 'outside_bounds' }
  | { readonly kind: 'blocked_cell'; readonly cell: GridCell }
  | { readonly kind: 'blocking_object'; readonly cell: GridCell }
  | { readonly kind: 'opening_required' }
  | { readonly kind: 'opening_mismatch' }
  | { readonly kind: 'creature_intersection'; readonly combatants: readonly CombatantId[] }
  | { readonly kind: 'tiny_capacity_exceeded' }
  | { readonly kind: 'no_legal_anchor' };

export type AutoRelocationResult<Size extends KnownCreatureSize> =
  | { readonly kind: 'placed'; readonly placement: TraversalPlacement<Size> }
  | { readonly kind: 'refused'; readonly refusal: Extract<PlacementRefusal, { readonly kind: 'no_legal_anchor' }> };

export function effectSequence(value: number): EffectSequence {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError('Effect sequences must be positive safe integers.');
  }
  return value as EffectSequence;
}

export function applySizeSteps(
  base: KnownCreatureSize,
  operations: readonly { readonly delta: 1 | -1; readonly appliedSequence: EffectSequence }[],
): KnownCreatureSize {
  const ordered = [...operations].sort((left, right) => left.appliedSequence - right.appliedSequence);
  if (new Set(ordered.map((operation) => operation.appliedSequence)).size !== ordered.length) {
    throw new TypeError('Size operations require unique persisted effect sequences.');
  }
  let index = creatureSizes.indexOf(base);
  for (const operation of ordered) {
    index = Math.max(0, Math.min(creatureSizes.length - 1, index + operation.delta));
  }
  const result = creatureSizes[index];
  if (result === undefined) throw new TypeError('Effective creature size could not be resolved.');
  return result;
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

/** Rebuilds and verifies an opaque space at a serialized projection boundary. */
export function decodeProjectedCreatureSpace(
  projection: SerializedCreatureSpaceProjection,
): CreatureSpace<KnownCreatureSize> {
  const sized = sizedCombatantState(projection.effectiveSize);
  const space = creatureSpace(sized, placementFromSerialized(sized, {
    anchor: projection.position,
    mode: projection.placementMode,
  }));
  if (
    projection.footprint.length !== space.cells.length ||
    projection.footprint.some((cell, index) => {
      const expected = space.cells[index];
      return expected === undefined || !sameGridCell(cell, expected);
    })
  ) {
    throw new TypeError('Projected footprint does not match its effective size, mode, and anchor.');
  }
  return space;
}

export function serializedPlacementMode<Size extends KnownCreatureSize>(
  mode: PlacementModeFor<Size>,
): SerializedPlacementMode<Size> {
  switch (mode.kind) {
    case 'normal':
      return { kind: 'normal', actual: mode.actual } as SerializedPlacementMode<Size>;
    case 'squeezed':
      return {
        kind: 'squeezed',
        actual: mode.pair.actual,
        sizedFor: mode.pair.sizedFor,
      } as SerializedPlacementMode<Size>;
  }
}

export function placementFromSerialized<Size extends KnownCreatureSize>(
  combatant: SizedCombatantState<Size>,
  value: SerializedTraversalPlacement<Size>,
): TraversalPlacement<Size> {
  if (value.mode.actual !== combatant.effectiveSize) {
    throw new TypeError('Serialized placement mode does not belong to the sized combatant.');
  }
  if (value.mode.kind === 'normal') {
    return placementFor(combatant, value.anchor, normalPlacementFor(combatant));
  }
  switch (combatant.effectiveSize) {
    case 'Tiny':
      throw new TypeError('Tiny creatures cannot use squeezed placement.');
    case 'Small': {
      const sized = sizedCombatantState('Small');
      const mode = squeezedPlacementFor(sized);
      if (value.mode.sizedFor !== mode.pair.sizedFor) throw new TypeError('Invalid Small squeeze pair.');
      return placementFor(sized, value.anchor, mode) as TraversalPlacement<Size>;
    }
    case 'Medium': {
      const sized = sizedCombatantState('Medium');
      const mode = squeezedPlacementFor(sized);
      if (value.mode.sizedFor !== mode.pair.sizedFor) throw new TypeError('Invalid Medium squeeze pair.');
      return placementFor(sized, value.anchor, mode) as TraversalPlacement<Size>;
    }
    case 'Large': {
      const sized = sizedCombatantState('Large');
      const mode = squeezedPlacementFor(sized);
      if (value.mode.sizedFor !== mode.pair.sizedFor) throw new TypeError('Invalid Large squeeze pair.');
      return placementFor(sized, value.anchor, mode) as TraversalPlacement<Size>;
    }
    case 'Huge': {
      const sized = sizedCombatantState('Huge');
      const mode = squeezedPlacementFor(sized);
      if (value.mode.sizedFor !== mode.pair.sizedFor) throw new TypeError('Invalid Huge squeeze pair.');
      return placementFor(sized, value.anchor, mode) as TraversalPlacement<Size>;
    }
    case 'Gargantuan': {
      const sized = sizedCombatantState('Gargantuan');
      const mode = squeezedPlacementFor(sized);
      if (value.mode.sizedFor !== mode.pair.sizedFor) throw new TypeError('Invalid Gargantuan squeeze pair.');
      return placementFor(sized, value.anchor, mode) as TraversalPlacement<Size>;
    }
  }
}

export function serializeTraversalPlacement<Size extends KnownCreatureSize>(
  placement: TraversalPlacement<Size>,
): SerializedTraversalPlacement<Size> {
  return Object.freeze({
    anchor: cell(placement.anchor.column, placement.anchor.row),
    mode: serializedPlacementMode(placement.mode),
  });
}

export function narrowOpeningId(value: string): NarrowOpeningId {
  if (value.trim().length === 0) throw new TypeError('Narrow-opening ids must be non-empty.');
  return value as NarrowOpeningId;
}

function rowMajor(left: GridCell, right: GridCell): number {
  return left.row - right.row || left.column - right.column;
}

function sameGridCell(left: GridCell, right: GridCell): boolean {
  return left.column === right.column && left.row === right.row;
}

export function narrowOpeningRegion(input: {
  readonly id: string;
  readonly sizedFor: KnownCreatureSize;
  readonly cells: readonly GridCell[];
  readonly bounds: GridBounds;
}): NarrowOpeningRegion {
  assertKnownCreatureSize(input.sizedFor);
  if (input.cells.length === 0) throw new TypeError('A narrow opening requires at least one cell.');
  const ordered = input.cells.map((entry) => cell(entry.column, entry.row)).sort(rowMajor);
  if (!ordered.every((entry) =>
    entry.column >= 0 && entry.column < input.bounds.columns &&
    entry.row >= 0 && entry.row < input.bounds.rows)) {
    throw new RangeError('Narrow-opening cells must be inside the encounter bounds.');
  }
  if (new Set(ordered.map(gridCellKey)).size !== ordered.length) {
    throw new TypeError('Narrow-opening cells must be unique.');
  }
  const remaining = new Set(ordered.map(gridCellKey));
  const frontier = [ordered[0] as GridCell];
  remaining.delete(gridCellKey(frontier[0] as GridCell));
  while (frontier.length > 0) {
    const current = frontier.pop() as GridCell;
    for (const candidate of ordered) {
      const orthogonallyAdjacent =
        Math.abs(candidate.column - current.column) + Math.abs(candidate.row - current.row) === 1;
      if (orthogonallyAdjacent && remaining.delete(gridCellKey(candidate))) frontier.push(candidate);
    }
  }
  if (remaining.size > 0) throw new TypeError('Narrow-opening cells must be orthogonally connected.');
  return Object.freeze({
    id: narrowOpeningId(input.id),
    sizedFor: input.sizedFor,
    cells: Object.freeze(ordered) as readonly [GridCell, ...GridCell[]],
  });
}

export function openingContainingSpace(
  space: CreatureSpace<KnownCreatureSize>,
  openings: readonly NarrowOpeningRegion[],
): NarrowOpeningRegion | null {
  if (space.mode.kind === 'normal') return null;
  const requiredSize = space.mode.pair.sizedFor;
  return openings.find((opening) =>
    opening.sizedFor === requiredSize &&
    space.cells.every((occupied) => opening.cells.some((entry) => sameGridCell(entry, occupied)))) ?? null;
}

export function newlyEnteredSpaceCells(
  source: CreatureSpace<KnownCreatureSize>,
  destination: CreatureSpace<KnownCreatureSize>,
): readonly GridCell[] {
  const sourceKeys = new Set(source.cells.map(gridCellKey));
  return destination.cells.filter((entry) => !sourceKeys.has(gridCellKey(entry)));
}

export function sharedSpaceRelation(input: {
  readonly left: CombatantId;
  readonly right: CombatantId;
  readonly provenance: SharedSpaceProvenance;
  readonly originatingId: string;
}): SharedSpaceRelation {
  if (input.left === input.right) throw new TypeError('Shared space requires two distinct combatants.');
  if (input.originatingId.trim().length === 0) {
    throw new TypeError('Shared-space provenance requires an originating id.');
  }
  const [first, second] = String(input.left).localeCompare(String(input.right)) < 0
    ? [input.left, input.right]
    : [input.right, input.left];
  return Object.freeze({ first, second, provenance: input.provenance, originatingId: input.originatingId });
}

/** D514: nearest anchor by Chebyshev distance, then row-major; never guess a placement. */
export function autoRelocatePlacement<Size extends KnownCreatureSize>(
  combatant: SizedCombatantState<Size>,
  previousAnchor: GridCell,
  mode: PlacementModeFor<Size>,
  bounds: GridBounds,
  isLegal: (space: CreatureSpace<Size>) => boolean,
): AutoRelocationResult<Size> {
  const candidates: GridCell[] = [];
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) candidates.push({ column, row });
  }
  candidates.sort((left, right) =>
    Math.max(Math.abs(left.column - previousAnchor.column), Math.abs(left.row - previousAnchor.row)) -
      Math.max(Math.abs(right.column - previousAnchor.column), Math.abs(right.row - previousAnchor.row)) ||
    rowMajor(left, right));
  for (const anchor of candidates) {
    const placement = placementFor(combatant, anchor, mode);
    const space = creatureSpace(combatant, placement);
    if (spaceFitsBounds(space, bounds) && isLegal(space)) return { kind: 'placed', placement };
  }
  return { kind: 'refused', refusal: { kind: 'no_legal_anchor' } };
}
