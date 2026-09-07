import { combatantSpace, combatantSpaceAt } from './combat-rules';
import type { CreatureSpace } from './creature-space';
import type { EncounterState } from './encounter';
import type { GridCell } from './grid';
import {
  coverRank,
  passabilityRank,
  terrainKindOfWireBlocking,
  terrainProfile,
  type CoverTier,
  type TerrainPassability,
} from './terrain';
import type { CombatantId } from './values';
import type { WorldObject } from './world-objects';
import type { KnownCreatureSize } from '../domain/enums';

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function compareCells(left: GridCell, right: GridCell): number {
  return left.row - right.row || left.column - right.column;
}

/** The deterministic cell-line rasterizer shared by sight and cover. */
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

export interface TerrainLineSource {
  readonly kind: 'blocked_cell' | 'world_object' | 'creature';
  readonly id: string;
  readonly tier: Exclude<CoverTier, 'none'>;
  readonly passability: Exclude<TerrainPassability, 'open'>;
}

export interface TerrainLineTrace {
  readonly sourceCell: GridCell;
  readonly targetCell: GridCell;
  readonly interveningCells: readonly GridCell[];
  readonly tier: CoverTier;
  readonly blocksSight: boolean;
  readonly passability: TerrainPassability;
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

function livingCreatureSourcesAt(
  state: EncounterState,
  cell: GridCell,
  options: TerrainLineOptions,
): readonly TerrainLineSource[] {
  if (options.includeCreatures !== true) return [];
  return state.combatants.flatMap((candidate): readonly TerrainLineSource[] => {
    const id = candidate.profile.id;
    if (candidate.life === 'dead' || id === options.sourceId || id === options.targetId) return [];
    if (!state.tokens.some((token) => token.combatantId === id)) return [];
    return combatantSpace(state, id).cells.some((occupied) => cellKey(occupied) === cellKey(cell))
      ? [{ kind: 'creature', id: String(id), tier: 'half', passability: 'difficult' }]
      : [];
  });
}

/** One canonical centre-to-centre trace. Endpoints are excluded by the rasterizer. */
export function traceTerrainLine(
  state: EncounterState,
  sourceCell: GridCell,
  targetCell: GridCell,
  options: TerrainLineOptions = {},
): TerrainLineTrace {
  const interveningCells = rasterizeInterveningCells(sourceCell, targetCell);
  let tier: CoverTier = 'none';
  let passability: TerrainPassability = 'open';
  let strongest: TerrainLineSource[] = [];
  let firstBlockingCell: GridCell | null = null;
  for (const cell of interveningCells) {
    const cellSources: TerrainLineSource[] = [];
    if (state.blockedCells.some((candidate) => cellKey(candidate) === cellKey(cell))) {
      cellSources.push({
        kind: 'blocked_cell', id: `${String(cell.column)},${String(cell.row)}`,
        tier: 'total', passability: 'blocked',
      });
    }
    for (const object of state.worldObjects) {
      if (!objectOccupiesCell(object, cell)) continue;
      const objectTier = object.blocking.cover;
      if (objectTier !== 'none') {
        const objectPassability = terrainProfile(terrainKindOfWireBlocking(object.blocking)).passability;
        if (objectPassability === 'open') continue;
        cellSources.push({
          kind: 'world_object', id: String(object.id), tier: objectTier,
          passability: objectPassability,
        });
      }
    }
    cellSources.push(...livingCreatureSourcesAt(state, cell, options));
    for (const source of cellSources) {
      if (passabilityRank(source.passability) > passabilityRank(passability)) {
        passability = source.passability;
      }
      const comparison = coverRank(source.tier) - coverRank(tier);
      if (comparison > 0) {
        tier = source.tier;
        strongest = [source];
      } else if (comparison === 0) {
        strongest.push(source);
      }
    }
    if (firstBlockingCell === null && cellSources.some((source) => source.tier === 'total')) {
      firstBlockingCell = { ...cell };
    }
  }
  const sources = strongest
    .filter((source, index, all) => all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)
    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
  return {
    sourceCell: { ...sourceCell },
    targetCell: { ...targetCell },
    interveningCells,
    tier,
    blocksSight: tier === 'total',
    passability,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell,
  };
}

export interface CreatureLineOptions {
  readonly sourceAnchor?: GridCell;
}

function compareTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
  return Number(left.blocksSight) - Number(right.blocksSight) ||
    coverRank(left.tier) - coverRank(right.tier) ||
    compareCells(left.sourceCell, right.sourceCell) ||
    compareCells(left.targetCell, right.targetCell) ||
    left.sourceIds.join('\0').localeCompare(right.sourceIds.join('\0'));
}

function leastObstructedTrace(
  state: EncounterState,
  source: CreatureSpace<KnownCreatureSize>,
  targetCells: readonly GridCell[],
  sourceId: CombatantId,
  targetId?: CombatantId,
): TerrainLineTrace {
  const sourceCells = [...source.cells].sort(compareCells);
  const targets = [...targetCells].sort(compareCells);
  const traces = sourceCells.flatMap((from) => targets.map((to) =>
    traceTerrainLine(state, from, to, {
      sourceId,
      ...(targetId === undefined ? {} : { targetId }),
      includeCreatures: true,
    })));
  const first = traces[0];
  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  return traces.reduce((best, candidate) => compareTraces(candidate, best) < 0 ? candidate : best, first);
}

export function traceCombatantLine(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  return leastObstructedTrace(state, source, combatantSpace(state, targetId).cells, sourceId, targetId);
}

export function traceCombatantLineToCells(
  state: EncounterState,
  sourceId: CombatantId,
  targetCells: readonly GridCell[],
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  return leastObstructedTrace(state, source, targetCells, sourceId);
}

export function coverTierBetweenObjects(
  objects: readonly WorldObject[],
  from: GridCell,
  to: GridCell,
): CoverTier {
  let cover: CoverTier = 'none';
  for (const cell of rasterizeInterveningCells(from, to)) {
    for (const object of objects) {
      if (objectOccupiesCell(object, cell) && coverRank(object.blocking.cover) > coverRank(cover)) {
        cover = object.blocking.cover;
      }
    }
  }
  return cover;
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
