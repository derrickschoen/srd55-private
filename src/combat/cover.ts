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

function objectOccupiesCell(object: WorldObject, cell: GridCell): boolean {
  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));
}

export interface CornerPoint {
  readonly column: number;
  readonly row: number;
}

/** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */
export function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {
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

/** A corner ray crosses only a cell interior; a boundary graze is not a crossing. */
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

function lineProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const magnitudeSquared = columnDelta * columnDelta + rowDelta * rowDelta;
  if (magnitudeSquared === 0) return 0;
  return (
    (cell.column + 0.5 - from.column) * columnDelta +
    (cell.row + 0.5 - from.row) * rowDelta
  ) / magnitudeSquared;
}

/** Rasterizes a corner ray in source-to-target traversal order. */
export function rasterizeCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
): readonly GridCell[] {
  const crossed: GridCell[] = [];
  for (const cell of candidates) {
    if (cornerLineCrossesCell(from, to, cell)) crossed.push(cell);
  }
  if (crossed.length > 1) {
    crossed.sort((left, right) =>
      lineProgress(from, to, left) - lineProgress(from, to, right) || compareCells(left, right));
  }
  return crossed;
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

export interface TerrainLineTrace {
  /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */
  readonly sourceCell: GridCell;
  readonly targetCell: GridCell;
  readonly sourceCorner: CornerPoint;
  readonly lines: readonly TerrainCornerLineTrace[];
  readonly interveningCells: readonly GridCell[];
  readonly tier: CoverTier;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
  readonly sources: readonly TerrainLineSource[];
  readonly firstBlockingCell: GridCell | null;
}

export interface TerrainLineOptions {
  readonly sourceId?: CombatantId;
  readonly targetId?: CombatantId;
  readonly includeCreatures?: boolean;
}

function taggedSourceId(source: TerrainLineSource): string {
  switch (source.kind) {
    case 'blocked_cell': return `blocked:${source.id}`;
    case 'world_object': return `object:${source.id}`;
    case 'creature': return `creature:${source.id}`;
  }
}

interface TerrainSourceCell {
  readonly cell: GridCell;
  readonly sources: TerrainLineSource[];
}

function addSource(
  sourceCells: Map<string, TerrainSourceCell>,
  cell: GridCell,
  source: TerrainLineSource,
  exclusions: ReadonlySet<string>,
): void {
  const key = cellKey(cell);
  if (exclusions.has(key)) return;
  const existing = sourceCells.get(key);
  if (existing === undefined) {
    sourceCells.set(key, { cell: { ...cell }, sources: [source] });
  } else {
    existing.sources.push(source);
  }
}

interface TerrainSourceIndexes {
  readonly terrain: ReadonlyMap<string, TerrainSourceCell>;
  withCreatures?: ReadonlyMap<string, TerrainSourceCell>;
}

const terrainSourceIndexes = new WeakMap<EncounterState, TerrainSourceIndexes>();
const terrainLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();
const combatantLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();
const terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();
const equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();
const EQUIVALENT_TRACE_CACHE_LIMIT = 4_096;

function terrainSourceSignature(
  state: EncounterState,
  includeCreatures: boolean,
  indexedSources: ReadonlyMap<string, TerrainSourceCell>,
): string {
  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();
  const cached = stateSignatures.get(includeCreatures);
  if (cached !== undefined) return cached;
  const signature = [...indexedSources].map(([key, entry]) =>
    `${key}=${entry.sources.map((source) => `${taggedSourceId(source)}:${source.tier}`).join(',')}`)
    .join('|');
  stateSignatures.set(includeCreatures, signature);
  if (!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);
  return signature;
}

function retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {
  equivalentTerrainLineTraces.set(key, trace);
  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;
  const oldest = equivalentTerrainLineTraces.keys().next().value;
  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);
}

function buildTerrainSourceIndex(
  state: EncounterState,
  includeCreatures: boolean,
  terrain?: ReadonlyMap<string, TerrainSourceCell>,
): ReadonlyMap<string, TerrainSourceCell> {
  const sourceCells: Map<string, TerrainSourceCell> = terrain === undefined
    ? new Map<string, TerrainSourceCell>()
    : new Map([...terrain].map(([key, entry]) => [key, {
        cell: { ...entry.cell }, sources: [...entry.sources],
      }] as const));
  const exclusions = new Set<string>();
  if (terrain === undefined) {
    for (const cell of state.blockedCells) {
      addSource(sourceCells, cell, {
        kind: 'blocked_cell', id: `${String(cell.column)},${String(cell.row)}`, tier: 'total',
      }, exclusions);
    }
    for (const object of state.worldObjects) {
      if (object.blocking.cover === 'none') continue;
      for (const cell of object.footprint) {
        addSource(sourceCells, cell, {
          kind: 'world_object', id: String(object.id), tier: object.blocking.cover,
        }, exclusions);
      }
    }
  }
  if (!includeCreatures) return sourceCells;
  for (const candidate of state.combatants) {
    const id = candidate.profile.id;
    if (candidate.life === 'dead') continue;
    if (!state.tokens.some((token) => token.combatantId === id)) continue;
    for (const cell of combatantSpace(state, id).cells) {
      addSource(sourceCells, cell, { kind: 'creature', id: String(id), tier: 'half' }, exclusions);
    }
  }
  return sourceCells;
}

function indexedTerrainSources(
  state: EncounterState,
  includeCreatures: boolean,
): ReadonlyMap<string, TerrainSourceCell> {
  const cached = terrainSourceIndexes.get(state);
  if (cached !== undefined) {
    if (!includeCreatures) return cached.terrain;
    const withCreatures = cached.withCreatures ?? buildTerrainSourceIndex(state, true, cached.terrain);
    cached.withCreatures = withCreatures;
    return withCreatures;
  }
  const terrain = buildTerrainSourceIndex(state, false);
  const entry: TerrainSourceIndexes = { terrain };
  terrainSourceIndexes.set(state, entry);
  if (!includeCreatures) return terrain;
  const withCreatures = buildTerrainSourceIndex(state, true, terrain);
  entry.withCreatures = withCreatures;
  return withCreatures;
}

function uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {
  return sources
    .filter((source, index, all) =>
      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)
    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
}

function traceCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],
): TerrainCornerLineTrace {
  const interveningCells = rasterizeCornerLine(from, to, candidates);
  let tier: CoverTier = 'none';
  let strongest: TerrainLineSource[] = [];
  let firstBlockingCell: GridCell | null = null;
  for (const cell of interveningCells) {
    for (const source of sourcesAt(cell)) {
      if (source.tier === 'total' && firstBlockingCell === null) firstBlockingCell = { ...cell };
      const comparison = coverRank(source.tier) - coverRank(tier);
      if (comparison > 0) {
        tier = source.tier;
        strongest = [source];
      } else if (comparison === 0) {
        strongest.push(source);
      }
    }
  }
  const sources = uniqueSources(strongest);
  return {
    targetCorner: { ...to },
    interveningCells,
    tier,
    blocksSight: firstBlockingCell !== null,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell,
  };
}

const COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];

function countTier(obstructedLineCount: number): CoverTier {
  if (obstructedLineCount === 0) return 'none';
  if (obstructedLineCount <= 2) return 'half';
  if (obstructedLineCount === 3) return 'three_quarters';
  return 'total';
}

function aggregateCornerLines(
  sourceCorner: CornerPoint,
  lines: readonly TerrainCornerLineTrace[],
  sourceCell: GridCell,
  targetCell: GridCell,
): TerrainLineTrace {
  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);
  const obstructed = lines.filter((line) => line.tier !== 'none');
  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>
    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');
  const tier = blocksSight
    ? 'total'
    : COVER_TIER_BY_RANK[Math.min(
        coverRank(countTier(obstructed.length)),
        coverRank(strongestLineTier),
        coverRank('three_quarters'),
      )] ?? 'none';
  const sources = tier === 'none'
    ? []
    : uniqueSources(obstructed
        .filter((line) => line.tier === strongestLineTier)
        .flatMap((line) => line.sources));
  const interveningCells = [...new Map(lines
    .flatMap((line) => line.interveningCells)
    .map((cell) => [cellKey(cell), cell] as const)).values()];
  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;
  return {
    sourceCell: { ...sourceCell },
    targetCell: { ...targetCell },
    sourceCorner: { ...sourceCorner },
    lines,
    interveningCells,
    tier,
    blocksSight,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,
  };
}

function compareCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
  return Number(left.blocksSight) - Number(right.blocksSight) ||
    coverRank(left.tier) - coverRank(right.tier) ||
    left.sourceCorner.row - right.sourceCorner.row ||
    left.sourceCorner.column - right.sourceCorner.column;
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

function traceSpaces(
  state: EncounterState,
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
  options: TerrainLineOptions,
): TerrainLineTrace {
  const traceKey = `${options.includeCreatures === true ? 'creatures' : 'terrain'}:${sourceCells
    .map(cellKey).join(';')}->${targetCells.map(cellKey).join(';')}`;
  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  const cached = stateTraces.get(traceKey);
  if (cached !== undefined) return cached;
  if (!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);
  const nearest = nearestCells(sourceCells, targetCells);
  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));
  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);
  const equivalentTraceKey = `${terrainSourceSignature(
    state,
    options.includeCreatures === true,
    indexedSources,
  )}\0${traceKey}`;
  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);
  if (equivalent !== undefined) {
    stateTraces.set(traceKey, equivalent);
    return equivalent;
  }
  const sourceCorners = outerCorners(sourceCells);
  const targetCorners = outerCorners(targetCells);
  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);
  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);
  const minimumColumn = Math.min(...cornerColumns);
  const maximumColumn = Math.max(...cornerColumns);
  const minimumRow = Math.min(...cornerRows);
  const maximumRow = Math.max(...cornerRows);
  const candidates = [...indexedSources.values()]
    .filter((entry) => !exclusions.has(cellKey(entry.cell)) &&
      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&
      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)
    .map((entry) => entry.cell);
  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
    sourceCorner,
    targetCorners.map((targetCorner) => traceCornerLine(
      sourceCorner,
      targetCorner,
      candidates,
      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],
    )),
    nearest.sourceCell,
    nearest.targetCell,
  ));
  const first = traces[0];
  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  const selected = traces.reduce(
    (best, candidate) => compareCornerTraces(candidate, best) < 0 ? candidate : best,
    first,
  );
  stateTraces.set(traceKey, selected);
  retainEquivalentTrace(equivalentTraceKey, selected);
  return selected;
}

/** The canonical 2014 corner-to-corner trace for two bare grid cells. */
export function traceTerrainLine(
  state: EncounterState,
  sourceCell: GridCell,
  targetCell: GridCell,
  options: TerrainLineOptions = {},
): TerrainLineTrace {
  return traceSpaces(state, [sourceCell], [targetCell], options);
}

export interface CreatureLineOptions {
  readonly sourceAnchor?: GridCell;
}

export function traceCombatantLine(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const traceKey = `${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined
    ? 'current'
    : cellKey(options.sourceAnchor)}`;
  const cached = combatantLineTraces.get(state)?.get(traceKey);
  if (cached !== undefined) return cached;
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {
    sourceId, targetId, includeCreatures: true,
  });
  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  stateTraces.set(traceKey, trace);
  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
  return trace;
}

export function traceCombatantLineToCells(
  state: EncounterState,
  sourceId: CombatantId,
  targetCells: readonly GridCell[],
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const traceKey = `${String(sourceId)}->cells:${targetCells.map(cellKey).join(';')}@${options.sourceAnchor === undefined
    ? 'current'
    : cellKey(options.sourceAnchor)}`;
  const cached = combatantLineTraces.get(state)?.get(traceKey);
  if (cached !== undefined) return cached;
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const trace = traceSpaces(state, source.cells, targetCells, { sourceId, includeCreatures: true });
  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  stateTraces.set(traceKey, trace);
  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
  return trace;
}

export function coverTierBetweenObjects(
  objects: readonly WorldObject[],
  from: GridCell,
  to: GridCell,
): CoverTier {
  const exclusions = new Set([cellKey(from), cellKey(to)]);
  const candidates = [...new Map(objects
    .flatMap((object) => object.footprint)
    .filter((cell) => !exclusions.has(cellKey(cell)))
    .map((cell) => [cellKey(cell), cell] as const)).values()];
  const sourceCell = { ...from };
  const targetCell = { ...to };
  const targetCorners = outerCorners([to]);
  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(
    sourceCorner,
    targetCorners.map((targetCorner) => traceCornerLine(
      sourceCorner,
      targetCorner,
      candidates,
      (cell) => objects.flatMap((object): readonly TerrainLineSource[] =>
        objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
          ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]
          : []),
    )),
    sourceCell,
    targetCell,
  ));
  const first = traces[0];
  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  return traces.reduce((best, candidate) => compareCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;
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
  const trace = traceCombatantLine(state, sourceId, targetId, options);
  return { tier: trace.tier, sourceIds: trace.sourceIds };
}
