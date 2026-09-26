import { combatantSpace, combatantSpaceAt } from './combat-rules';
import type { EncounterState } from './encounter';
import type { GridCell } from './grid';
import { coverRank, type CoverTier } from './terrain';
import type { CombatantId } from './values';
import type { WorldObject } from './world-objects';

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function compareCells(left: GridCell, right: GridCell): number {
  return left.row - right.row || left.column - right.column;
}

/** Retained for the frozen pre-D576 oracle and non-canonical historical callers. */
export function rasterizeInterveningCells(from: GridCell, to: GridCell): readonly GridCell[] {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));
  if (steps <= 1) return [];
  const result: GridCell[] = [];
  const seen = new Set<string>();
  for (let step = 1; step < steps; step += 1) {
    const cell = {
      column: Math.round(from.column + columnDelta * step / steps),
      row: Math.round(from.row + rowDelta * step / steps),
    };
    const key = cellKey(cell);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cell);
    }
  }
  return result;
}

export interface CornerPoint {
  readonly column: number;
  readonly row: number;
}

/** The four outer corners of a space, row-major: top-left, top-right, bottom-left, bottom-right. */
export type OuterCorners = readonly [CornerPoint, CornerPoint, CornerPoint, CornerPoint];

/** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */
export function outerCorners(cells: readonly GridCell[]): OuterCorners {
  const first = cells[0];
  if (first === undefined) throw new RangeError('A line query requires a non-empty space.');
  let minimumColumn = first.column;
  let maximumColumn = first.column + 1;
  let minimumRow = first.row;
  let maximumRow = first.row + 1;
  for (let index = 1; index < cells.length; index += 1) {
    const cell = cells[index];
    if (cell === undefined) continue;
    minimumColumn = Math.min(minimumColumn, cell.column);
    maximumColumn = Math.max(maximumColumn, cell.column + 1);
    minimumRow = Math.min(minimumRow, cell.row);
    maximumRow = Math.max(maximumRow, cell.row + 1);
  }
  return [
    { column: minimumColumn, row: minimumRow },
    { column: maximumColumn, row: minimumRow },
    { column: minimumColumn, row: maximumRow },
    { column: maximumColumn, row: maximumRow },
  ];
}

/**
 * A corner ray crosses only a cell interior; a boundary graze is not a crossing. This is the
 * definition walkCornerLine implements exactly; the engine no longer calls it per cell.
 */
export function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {
  const epsilon = 1e-9;
  let entry = 0;
  let exit = 1;
  const columnDelta = to.column - from.column;
  const minimumColumn = cell.column + epsilon;
  const maximumColumn = cell.column + 1 - epsilon;
  if (columnDelta === 0) {
    if (from.column <= minimumColumn || from.column >= maximumColumn) return false;
  } else {
    const first = (minimumColumn - from.column) / columnDelta;
    const second = (maximumColumn - from.column) / columnDelta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  const rowDelta = to.row - from.row;
  const minimumRow = cell.row + epsilon;
  const maximumRow = cell.row + 1 - epsilon;
  if (rowDelta === 0) {
    if (from.row <= minimumRow || from.row >= maximumRow) return false;
  } else {
    const first = (minimumRow - from.row) / rowDelta;
    const second = (maximumRow - from.row) / rowDelta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  return entry <= exit && exit > 0 && entry < 1;
}

/**
 * Visits, in source-to-target order, every cell whose open interior the segment between two
 * lattice points crosses (D576.3: a boundary graze or a pass through a grid corner is not a
 * crossing). Integer arithmetic only, an exact Amanatides-Woo traversal: the segment meets its
 * k-th vertical grid line at t = k / |dx| and its k-th horizontal one at t = k / |dy|, so the
 * next crossing is found by comparing nextColumn * |dy| with nextRow * |dx|. A tie is a lattice
 * point: the segment passes diagonally through that grid corner and only touches the two side
 * cells there, so both axes advance together. An axis-parallel or zero-length segment lies on
 * grid lines and crosses no interior. It visits |dx| + |dy| - gcd(|dx|, |dy|) cells, and the
 * cell centres' projections onto the segment strictly increase, which is the old
 * rasterizer's sort order.
 */
export function walkCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  visit: (column: number, row: number) => void,
): void {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  if (columnDelta === 0 || rowDelta === 0) return;
  const columnSpan = Math.abs(columnDelta);
  const rowSpan = Math.abs(rowDelta);
  const columnStep = columnDelta > 0 ? 1 : -1;
  const rowStep = rowDelta > 0 ? 1 : -1;
  // The first cell is the one the segment enters from its start corner.
  let column = columnDelta > 0 ? from.column : from.column - 1;
  let row = rowDelta > 0 ? from.row : from.row - 1;
  let nextColumn = 1;
  let nextRow = 1;
  for (;;) {
    visit(column, row);
    if (nextColumn >= columnSpan && nextRow >= rowSpan) return;
    const columnCrossing = nextColumn * rowSpan;
    const rowCrossing = nextRow * columnSpan;
    if (columnCrossing <= rowCrossing) {
      column += columnStep;
      nextColumn += 1;
    }
    if (rowCrossing <= columnCrossing) {
      row += rowStep;
      nextRow += 1;
    }
  }
}

/** Rasterizes a corner ray in source-to-target traversal order. */
export function rasterizeCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
): readonly GridCell[] {
  const crossed: GridCell[] = [];
  walkCornerLine(from, to, (column, row) => {
    for (const candidate of candidates) {
      if (candidate.column === column && candidate.row === row) crossed.push(candidate);
    }
  });
  return crossed;
}

/**
 * Every cell that some corner ray between two spaces crosses, with repeats. Every source a line
 * between those spaces can count lies on one of these cells, so a change confined to other cells
 * cannot change that line.
 */
export function visitCornerRayCells(
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
  visit: (column: number, row: number) => void,
): void {
  const targetCorners = outerCorners(targetCells);
  for (const sourceCorner of outerCorners(sourceCells)) {
    for (const targetCorner of targetCorners) walkCornerLine(sourceCorner, targetCorner, visit);
  }
}

export interface TerrainLineSource {
  readonly kind: 'blocked_cell' | 'world_object' | 'creature';
  readonly id: string;
  readonly tier: Exclude<CoverTier, 'none'>;
}

export interface TerrainCornerLineTrace {
  readonly targetCorner: CornerPoint;
  readonly interveningCells: readonly GridCell[];
  readonly tier: CoverTier;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
  readonly sources: readonly TerrainLineSource[];
  readonly firstBlockingCell: GridCell | null;
}

/**
 * What rules callers ask of a line: sight and cover between two spaces, plus the stable nearest
 * occupied cells that attack-position consumers read. Total Cover exactly when sight is blocked:
 * the chosen source corner's four lines all cross a sight-blocking source (D576.3), so the type
 * cannot pair Total Cover with clear sight or blocked sight with lesser cover.
 */
export type LineVerdict =
  | {
      readonly sourceCell: GridCell;
      readonly targetCell: GridCell;
      readonly tier: 'total';
      readonly blocksSight: true;
      readonly sourceIds: readonly string[];
    }
  | {
      readonly sourceCell: GridCell;
      readonly targetCell: GridCell;
      readonly tier: Exclude<CoverTier, 'total'>;
      readonly blocksSight: false;
      readonly sourceIds: readonly string[];
    };

/** The per-line evidence behind a verdict; the first blocking cell exists exactly when sight is blocked. */
export type TerrainLineTrace =
  | {
      /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */
      readonly sourceCell: GridCell;
      readonly targetCell: GridCell;
      readonly sourceCorner: CornerPoint;
      readonly lines: readonly TerrainCornerLineTrace[];
      readonly interveningCells: readonly GridCell[];
      readonly tier: 'total';
      readonly blocksSight: true;
      readonly sourceIds: readonly string[];
      readonly sources: readonly TerrainLineSource[];
      readonly firstBlockingCell: GridCell;
    }
  | {
      readonly sourceCell: GridCell;
      readonly targetCell: GridCell;
      readonly sourceCorner: CornerPoint;
      readonly lines: readonly TerrainCornerLineTrace[];
      readonly interveningCells: readonly GridCell[];
      readonly tier: Exclude<CoverTier, 'total'>;
      readonly blocksSight: false;
      readonly sourceIds: readonly string[];
      readonly sources: readonly TerrainLineSource[];
      readonly firstBlockingCell: null;
    };

function taggedSourceId(source: TerrainLineSource): string {
  switch (source.kind) {
    case 'blocked_cell': return `blocked:${source.id}`;
    case 'world_object': return `object:${source.id}`;
    case 'creature': return `creature:${source.id}`;
  }
}

/** One cell holding cover sources, in the canonical order: walls, then objects, then creatures. */
interface SourceCell {
  readonly cell: GridCell;
  readonly sources: readonly TerrainLineSource[];
}

/**
 * The largest bounding box of source cells, in cells, that the source index stores as a dense
 * array (256 x 256, say). The box is set by the two sources farthest apart, not by how many
 * sources there are: without this bound, a valid 65,536 x 65,536 encounter with walls in two
 * opposite corners asks for 2^32 slots and throws before any line is traced.
 */
const DENSE_SOURCE_GRID_MAX_CELLS = 65_536;

/**
 * Where the cover sources are, read once per visited cell.
 * - `dense`: a row-major array over the bounding box of every source cell, one array read per
 *   visited cell; cells outside the box hold no source.
 * - `sparse`, when that box holds more than DENSE_SOURCE_GRID_MAX_CELLS cells: the source cells
 *   by row, then by column, so memory follows the number of source cells, not their spread.
 */
type SourceGrid =
  | {
      readonly kind: 'dense';
      readonly minimumColumn: number;
      readonly minimumRow: number;
      readonly width: number;
      readonly height: number;
      readonly cells: readonly (SourceCell | undefined)[];
    }
  | {
      readonly kind: 'sparse';
      readonly rows: ReadonlyMap<number, ReadonlyMap<number, SourceCell>>;
    };

interface PlacedSource {
  readonly cell: GridCell;
  readonly source: TerrainLineSource;
}

interface BuildingSourceCell {
  readonly cell: GridCell;
  readonly sources: TerrainLineSource[];
}

function sourceGrid(placed: readonly PlacedSource[]): SourceGrid {
  if (placed.length === 0) return { kind: 'dense', minimumColumn: 0, minimumRow: 0, width: 0, height: 0, cells: [] };
  let minimumColumn = Number.POSITIVE_INFINITY;
  let minimumRow = Number.POSITIVE_INFINITY;
  let maximumColumn = Number.NEGATIVE_INFINITY;
  let maximumRow = Number.NEGATIVE_INFINITY;
  for (const { cell } of placed) {
    minimumColumn = Math.min(minimumColumn, cell.column);
    minimumRow = Math.min(minimumRow, cell.row);
    maximumColumn = Math.max(maximumColumn, cell.column);
    maximumRow = Math.max(maximumRow, cell.row);
  }
  const width = maximumColumn - minimumColumn + 1;
  const height = maximumRow - minimumRow + 1;
  if (width * height > DENSE_SOURCE_GRID_MAX_CELLS) return sparseSourceGrid(placed);
  const building: (BuildingSourceCell | undefined)[] = new Array<undefined>(width * height).fill(undefined);
  for (const { cell, source } of placed) {
    const index = (cell.row - minimumRow) * width + cell.column - minimumColumn;
    const existing = building[index];
    if (existing === undefined) building[index] = { cell: { ...cell }, sources: [source] };
    else existing.sources.push(source);
  }
  return { kind: 'dense', minimumColumn, minimumRow, width, height, cells: building };
}

function sparseSourceGrid(placed: readonly PlacedSource[]): SourceGrid {
  const rows = new Map<number, Map<number, BuildingSourceCell>>();
  for (const { cell, source } of placed) {
    let columns = rows.get(cell.row);
    if (columns === undefined) {
      columns = new Map<number, BuildingSourceCell>();
      rows.set(cell.row, columns);
    }
    const existing = columns.get(cell.column);
    if (existing === undefined) columns.set(cell.column, { cell: { ...cell }, sources: [source] });
    else existing.sources.push(source);
  }
  return { kind: 'sparse', rows };
}

function sourceAt(grid: SourceGrid, column: number, row: number): SourceCell | undefined {
  switch (grid.kind) {
    case 'dense': {
      const localColumn = column - grid.minimumColumn;
      const localRow = row - grid.minimumRow;
      if (localColumn < 0 || localRow < 0 || localColumn >= grid.width || localRow >= grid.height) return undefined;
      return grid.cells[localRow * grid.width + localColumn];
    }
    case 'sparse': return grid.rows.get(row)?.get(column);
  }
  // The return type admits `undefined` (no source in this cell), so without this check a new
  // SourceGrid kind would compile and find no source anywhere. Every kind returns above.
  grid satisfies never;
}

function terrainSources(state: EncounterState): PlacedSource[] {
  const placed: PlacedSource[] = [];
  for (const cell of state.blockedCells) {
    placed.push({ cell, source: { kind: 'blocked_cell', id: `${String(cell.column)},${String(cell.row)}`, tier: 'total' } });
  }
  for (const object of state.worldObjects) {
    if (object.blocking.cover === 'none') continue;
    for (const cell of object.footprint) {
      placed.push({ cell, source: { kind: 'world_object', id: String(object.id), tier: object.blocking.cover } });
    }
  }
  return placed;
}

/** Every placed creature that is not dead occupies its space as Half Cover (D514). */
function creatureSources(state: EncounterState): PlacedSource[] {
  const placed: PlacedSource[] = [];
  for (const candidate of state.combatants) {
    const id = candidate.profile.id;
    if (candidate.life === 'dead') continue;
    if (!state.tokens.some((token) => token.combatantId === id)) continue;
    for (const cell of combatantSpace(state, id).cells) {
      placed.push({ cell, source: { kind: 'creature', id: String(id), tier: 'half' } });
    }
  }
  return placed;
}

/**
 * What a corner trace may count as an obstruction. A trace that counts creatures must name the
 * creature the line originates from, because that creature's body is never an obstruction on its
 * own line: SRD 5.2.1 "Cover" (docs/srd/full/srd-5.2.1.txt:921-949) lets a target benefit from cover
 * "only when an attack or other effect originates on the opposite side of the cover", and the
 * originator's body holds the origin. This matters when the engine places the origin somewhere
 * hypothetical (`sourceAnchor`): the body goes with it, so the cells it occupies NOW are empty on
 * that line (owner ruling 2026-09-24, D888). The exclusion is by creature id, not by cell, so a Tiny
 * creature sharing the mover's current cell still gives cover.
 */
type LineObstructions =
  | { readonly kind: 'terrain' }
  | { readonly kind: 'terrain_and_creatures'; readonly originator: CombatantId };

interface StateSourceGrids {
  readonly terrain: SourceGrid;
  withCreatures?: SourceGrid;
}

/**
 * The one per-state memo left in cover: the source grid (every trace reads it, and rebuilding it
 * per trace doubles trace cost). Traces themselves are not memoized.
 */
const stateSourceGrids = new WeakMap<EncounterState, StateSourceGrids>();

function stateSourceGrid(state: EncounterState, obstructions: LineObstructions): SourceGrid {
  let grids = stateSourceGrids.get(state);
  if (grids === undefined) {
    grids = { terrain: sourceGrid(terrainSources(state)) };
    stateSourceGrids.set(state, grids);
  }
  switch (obstructions.kind) {
    case 'terrain': return grids.terrain;
    case 'terrain_and_creatures': {
      grids.withCreatures ??= sourceGrid([...terrainSources(state), ...creatureSources(state)]);
      return grids.withCreatures;
    }
  }
}

function uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {
  const seen = new Set<string>();
  const unique: { readonly id: string; readonly source: TerrainLineSource }[] = [];
  for (const source of sources) {
    const id = taggedSourceId(source);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push({ id, source });
  }
  return unique.sort((left, right) => left.id.localeCompare(right.id)).map((entry) => entry.source);
}

/**
 * The sources a line between two spaces can cross: the spaces' own cells never obstruct it, and
 * neither does the originating creature's body wherever it stands now.
 */
interface LineContext {
  readonly grid: SourceGrid;
  readonly sourceCells: readonly GridCell[];
  readonly targetCells: readonly GridCell[];
  /** The originating creature's source id, when creatures count. */
  readonly originator: string | null;
}

function lineContext(
  grid: SourceGrid,
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
  obstructions: LineObstructions,
): LineContext {
  switch (obstructions.kind) {
    case 'terrain': return { grid, sourceCells, targetCells, originator: null };
    case 'terrain_and_creatures': return { grid, sourceCells, targetCells, originator: String(obstructions.originator) };
  }
}

function isBodyOf(source: TerrainLineSource, originator: string): boolean {
  return source.kind === 'creature' && source.id === originator;
}

/** The cell with the originator's own body removed; undefined when nothing else obstructs there. */
function obstructingCell(entry: SourceCell, originator: string | null): SourceCell | undefined {
  if (originator === null || !entry.sources.some((source) => isBodyOf(source, originator))) return entry;
  const others = entry.sources.filter((source) => !isBodyOf(source, originator));
  return others.length === 0 ? undefined : { cell: entry.cell, sources: others };
}

function spaceContains(cells: readonly GridCell[], column: number, row: number): boolean {
  for (const cell of cells) if (cell.column === column && cell.row === row) return true;
  return false;
}

const TOTAL_RANK = coverRank('total');
const THREE_QUARTERS_RANK = coverRank('three_quarters');
const COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];

function tierOfRank(rank: number): CoverTier {
  const tier = COVER_TIER_BY_RANK[rank];
  if (tier === undefined) throw new RangeError(`No cover tier has rank ${String(rank)}.`);
  return tier;
}

/**
 * Walks one corner line and returns the rank of the strongest source it crosses (0 when it crosses
 * none). A line blocks sight exactly when that rank is Total's: only sight-blocking sources are
 * Total. When `crossed` is given, the crossed source cells are appended in traversal order.
 */
function scanCornerLine(context: LineContext, from: CornerPoint, to: CornerPoint, crossed?: SourceCell[]): number {
  let rank = 0;
  walkCornerLine(from, to, (column, row) => {
    const found = sourceAt(context.grid, column, row);
    if (found === undefined || spaceContains(context.sourceCells, column, row) ||
      spaceContains(context.targetCells, column, row)) return;
    const entry = obstructingCell(found, context.originator);
    if (entry === undefined) return;
    for (const source of entry.sources) {
      const sourceRank = coverRank(source.tier);
      if (sourceRank > rank) rank = sourceRank;
    }
    crossed?.push(entry);
  });
  return rank;
}

/** Number of obstructed lines to tier rank (D576.3): 0 none, 1-2 half, 3 three-quarters, 4 total. */
function countRank(obstructedLines: number): number {
  if (obstructedLines === 0) return coverRank('none');
  if (obstructedLines <= 2) return coverRank('half');
  if (obstructedLines === 3) return coverRank('three_quarters');
  return TOTAL_RANK;
}

interface CornerRanks {
  /** The source corner's cover: Total when all four lines block sight, else the clamped count. */
  readonly rank: number;
  /** The strongest tier any of its four lines crosses; the named sources are the ones of this rank. */
  readonly strongestLineRank: number;
}

/**
 * D576.3 for one source corner from its four line ranks: all four lines sight-blocked gives Total
 * with no sight; otherwise the obstructed-line count's tier, clamped by the strongest crossed tier
 * and by Three-Quarters.
 */
function cornerRanks(lineRanks: readonly number[]): CornerRanks {
  let blockedLines = 0;
  let obstructedLines = 0;
  let strongestLineRank = 0;
  for (const lineRank of lineRanks) {
    if (lineRank === TOTAL_RANK) blockedLines += 1;
    if (lineRank > 0) obstructedLines += 1;
    if (lineRank > strongestLineRank) strongestLineRank = lineRank;
  }
  const rank = blockedLines === 4
    ? TOTAL_RANK
    : Math.min(countRank(obstructedLines), strongestLineRank, THREE_QUARTERS_RANK);
  return { rank, strongestLineRank };
}

interface ChosenCorner {
  readonly corner: CornerPoint;
  readonly ranks: CornerRanks;
}

/** The least-protective source corner; ties go to the lower row, then the lower column. */
function chooseSourceCorner(context: LineContext, targetCorners: OuterCorners): ChosenCorner {
  let chosen: ChosenCorner | undefined;
  for (const corner of outerCorners(context.sourceCells)) {
    const ranks = cornerRanks(targetCorners.map((targetCorner) => scanCornerLine(context, corner, targetCorner)));
    if (chosen === undefined ||
      (ranks.rank - chosen.ranks.rank || corner.row - chosen.corner.row || corner.column - chosen.corner.column) < 0) {
      chosen = { corner, ranks };
    }
  }
  if (chosen === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  return chosen;
}

function nearestCells(
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
): { readonly sourceCell: GridCell; readonly targetCell: GridCell } {
  const sources = [...sourceCells].sort(compareCells);
  const targets = [...targetCells].sort(compareCells);
  const firstSource = sources[0];
  const firstTarget = targets[0];
  if (firstSource === undefined || firstTarget === undefined) {
    throw new RangeError('A line query requires non-empty source and target spaces.');
  }
  let selectedSource = firstSource;
  let selectedTarget = firstTarget;
  let selectedDistance = Number.POSITIVE_INFINITY;
  for (const sourceCell of sources) {
    for (const targetCell of targets) {
      const distance = Math.max(
        Math.abs(sourceCell.column - targetCell.column),
        Math.abs(sourceCell.row - targetCell.row),
      );
      if (distance < selectedDistance) {
        selectedSource = sourceCell;
        selectedTarget = targetCell;
        selectedDistance = distance;
      }
    }
  }
  return { sourceCell: selectedSource, targetCell: selectedTarget };
}

function cornerLineTrace(context: LineContext, from: CornerPoint, to: CornerPoint): TerrainCornerLineTrace {
  const crossed: SourceCell[] = [];
  const rank = scanCornerLine(context, from, to, crossed);
  const strongest = rank === 0
    ? []
    : crossed.flatMap((entry) => entry.sources.filter((source) => coverRank(source.tier) === rank));
  const firstBlocking = rank === TOTAL_RANK
    ? crossed.find((entry) => entry.sources.some((source) => source.tier === 'total'))
    : undefined;
  const sources = uniqueSources(strongest);
  return {
    targetCorner: { ...to },
    interveningCells: crossed.map((entry) => entry.cell),
    tier: tierOfRank(rank),
    blocksSight: rank === TOTAL_RANK,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell: firstBlocking === undefined ? null : { ...firstBlocking.cell },
  };
}

function traceSpaces(
  state: EncounterState,
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
  obstructions: LineObstructions,
): TerrainLineTrace {
  const nearest = nearestCells(sourceCells, targetCells);
  const context = lineContext(stateSourceGrid(state, obstructions), sourceCells, targetCells, obstructions);
  const targetCorners = outerCorners(targetCells);
  const { corner, ranks } = chooseSourceCorner(context, targetCorners);
  const lines = targetCorners.map((targetCorner) => cornerLineTrace(context, corner, targetCorner));
  const sources = ranks.rank === 0
    ? []
    : uniqueSources(lines
        .filter((line) => coverRank(line.tier) === ranks.strongestLineRank)
        .flatMap((line) => line.sources));
  const interveningCells = [...new Map(lines
    .flatMap((line) => line.interveningCells)
    .map((cell) => [cellKey(cell), cell] as const)).values()];
  const shared = {
    sourceCell: { ...nearest.sourceCell },
    targetCell: { ...nearest.targetCell },
    sourceCorner: { ...corner },
    lines,
    interveningCells,
  };
  if (ranks.rank === TOTAL_RANK) {
    const firstBlockingCell = lines[0]?.firstBlockingCell;
    if (firstBlockingCell === undefined || firstBlockingCell === null) {
      throw new RangeError('A sight-blocked line must name its first blocking cell.');
    }
    return {
      ...shared,
      tier: 'total',
      blocksSight: true,
      sourceIds: sources.map(taggedSourceId),
      sources,
      firstBlockingCell,
    };
  }
  return {
    ...shared,
    tier: lesserTierOfRank(ranks.rank),
    blocksSight: false,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell: null,
  };
}

const LESSER_TIER_BY_RANK = ['none', 'half', 'three_quarters'] as const satisfies readonly Exclude<CoverTier, 'total'>[];

function lesserTierOfRank(rank: number): Exclude<CoverTier, 'total'> {
  const tier = LESSER_TIER_BY_RANK[rank];
  if (tier === undefined) throw new RangeError('A line with sight cannot carry Total Cover.');
  return tier;
}

/**
 * The verdict fields of traceSpaces without building line objects: the chosen corner comes from
 * rank arithmetic alone, and the named sources are the unique ids, sorted, of the sources on that
 * corner's lines whose rank is its strongest line's rank.
 */
function verdictSpaces(
  state: EncounterState,
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
  obstructions: LineObstructions,
): LineVerdict {
  const nearest = nearestCells(sourceCells, targetCells);
  const context = lineContext(stateSourceGrid(state, obstructions), sourceCells, targetCells, obstructions);
  const targetCorners = outerCorners(targetCells);
  const { corner, ranks } = chooseSourceCorner(context, targetCorners);
  const ids = new Set<string>();
  if (ranks.rank > 0) {
    for (const targetCorner of targetCorners) {
      const crossed: SourceCell[] = [];
      scanCornerLine(context, corner, targetCorner, crossed);
      for (const entry of crossed) {
        for (const source of entry.sources) {
          if (coverRank(source.tier) === ranks.strongestLineRank) ids.add(taggedSourceId(source));
        }
      }
    }
  }
  const sourceIds = [...ids].sort((left, right) => left.localeCompare(right));
  const sourceCell = { ...nearest.sourceCell };
  const targetCell = { ...nearest.targetCell };
  return ranks.rank === TOTAL_RANK
    ? { sourceCell, targetCell, tier: 'total', blocksSight: true, sourceIds }
    : { sourceCell, targetCell, tier: lesserTierOfRank(ranks.rank), blocksSight: false, sourceIds };
}

/** The canonical corner-to-corner trace for two bare grid cells, terrain sources only. */
export function traceTerrainLine(
  state: EncounterState,
  sourceCell: GridCell,
  targetCell: GridCell,
): TerrainLineTrace {
  return traceSpaces(state, [sourceCell], [targetCell], { kind: 'terrain' });
}

/** Sight and cover between two bare grid cells, terrain sources only, without per-line evidence. */
export function terrainLineVerdict(
  state: EncounterState,
  sourceCell: GridCell,
  targetCell: GridCell,
): LineVerdict {
  return verdictSpaces(state, [sourceCell], [targetCell], { kind: 'terrain' });
}

export interface CreatureLineOptions {
  /**
   * Trace as if the source stood at this anchor. Its body moves with it: the cells it occupies
   * now do not obstruct the line (see LineObstructions).
   */
  readonly sourceAnchor?: GridCell;
}

function sourceSpaceCells(
  state: EncounterState,
  sourceId: CombatantId,
  options: CreatureLineOptions,
): readonly GridCell[] {
  return options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId).cells
    : combatantSpaceAt(state, sourceId, options.sourceAnchor).cells;
}

export function traceCombatantLine(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const sourceCells = sourceSpaceCells(state, sourceId, options);
  return traceSpaces(state, sourceCells, combatantSpace(state, targetId).cells, {
    kind: 'terrain_and_creatures', originator: sourceId,
  });
}

export function traceCombatantLineToCells(
  state: EncounterState,
  sourceId: CombatantId,
  targetCells: readonly GridCell[],
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  return traceSpaces(state, sourceSpaceCells(state, sourceId, options), targetCells, {
    kind: 'terrain_and_creatures', originator: sourceId,
  });
}

/** Sight and cover between two creatures, without the per-line evidence of traceCombatantLine. */
export function combatantLineVerdict(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureLineOptions = {},
): LineVerdict {
  const sourceCells = sourceSpaceCells(state, sourceId, options);
  return verdictSpaces(state, sourceCells, combatantSpace(state, targetId).cells, {
    kind: 'terrain_and_creatures', originator: sourceId,
  });
}

/** Sight and cover from a creature to cells, without the per-line evidence of traceCombatantLineToCells. */
export function combatantLineVerdictToCells(
  state: EncounterState,
  sourceId: CombatantId,
  targetCells: readonly GridCell[],
  options: CreatureLineOptions = {},
): LineVerdict {
  return verdictSpaces(state, sourceSpaceCells(state, sourceId, options), targetCells, {
    kind: 'terrain_and_creatures', originator: sourceId,
  });
}

/** Object-only cover between two cells (no walls, no creatures), from a bare object list. */
export function coverTierBetweenObjects(
  objects: readonly WorldObject[],
  from: GridCell,
  to: GridCell,
): CoverTier {
  const placed: PlacedSource[] = [];
  for (const object of objects) {
    if (object.blocking.cover === 'none') continue;
    for (const cell of object.footprint) {
      placed.push({ cell, source: { kind: 'world_object', id: String(object.id), tier: object.blocking.cover } });
    }
  }
  const context = lineContext(sourceGrid(placed), [from], [to], { kind: 'terrain' });
  return tierOfRank(chooseSourceCorner(context, outerCorners([to])).ranks.rank);
}

export type CreatureCoverOptions = CreatureLineOptions;

export interface CombatantCoverResult {
  readonly tier: CoverTier;
  readonly sourceIds: readonly string[];
}

export function coverBetweenCombatants(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureCoverOptions = {},
): CombatantCoverResult {
  const verdict = combatantLineVerdict(state, sourceId, targetId, options);
  return { tier: verdict.tier, sourceIds: verdict.sourceIds };
}
