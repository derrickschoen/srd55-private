import type { GridCell } from '../../combat/grid';
import type { CombatToken } from '../../combat/combatant';
import type { EncounterArtPackage } from '../encounter-package';
import { assetId } from '../../assets/ids';
import {
  encounterBoardRenderModel, encounterBoardTokenRenderModels,
  type EncounterBoardProjectionShape, type EncounterBoardWorldObject,
} from '../encounter-board';
import type { DmBoardProjection, PlayerBoardProjection } from '../encounter-projections';
import { logicalAssetId, type AssetIdMapping, type LogicalAssetRole } from './asset-id-map';
import type { SceneSnapshot, SceneWall } from './v1/contracts';

export interface GroundFootprint { readonly w: number; readonly h: number }
export interface GroundPoint { readonly x: number; readonly y: number; readonly z: number }

export function groundCenter(anchor: GridCell, footprint: GroundFootprint): GroundPoint {
  return { x: anchor.column + (footprint.w - 1) / 2, y: anchor.row + (footprint.h - 1) / 2, z: 0 };
}

export function groundAnchor(center: GroundPoint, footprint: GroundFootprint): GridCell | null {
  if (center.z !== 0) return null;
  const column = center.x - (footprint.w - 1) / 2;
  const row = center.y - (footprint.h - 1) / 2;
  return Number.isSafeInteger(column) && Number.isSafeInteger(row) ? { column, row } : null;
}

function footprintOf(cells: readonly GridCell[]): GroundFootprint {
  if (cells.length === 0) throw new Error('EMPTY_FOOTPRINT');
  const columns = cells.map((cell) => cell.column);
  const rows = cells.map((cell) => cell.row);
  const w = Math.max(...columns) - Math.min(...columns) + 1;
  const h = Math.max(...rows) - Math.min(...rows) + 1;
  if (cells.length !== w * h) throw new Error('NON_RECTANGULAR_FOOTPRINT');
  return { w, h };
}

export interface CanonicalTokenIdentityIndex {
  readonly byCombatantId: ReadonlyMap<string, string>;
}

export function canonicalTokenIdentityIndex(tokens: readonly CombatToken[]): CanonicalTokenIdentityIndex {
  const byCombatantId = new Map<string, string>();
  const tokenIds = new Set<string>();
  for (const token of tokens) {
    const combatantId = String(token.combatantId);
    const tokenId = String(token.id);
    if (byCombatantId.has(combatantId)) throw new Error(`DUPLICATE_CANONICAL_COMBATANT_ID: ${combatantId}`);
    if (tokenIds.has(tokenId)) throw new Error(`DUPLICATE_CANONICAL_TOKEN_ID: ${tokenId}`);
    byCombatantId.set(combatantId, tokenId);
    tokenIds.add(tokenId);
  }
  return { byCombatantId };
}

interface Edge {
  readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number;
}

function edgeKey(edge: Edge): string {
  return `${String(edge.x1)},${String(edge.y1)}:${String(edge.x2)},${String(edge.y2)}`;
}

function edgesOverlap(left: Edge, right: Edge): boolean {
  if (left.y1 === left.y2 && right.y1 === right.y2 && left.y1 === right.y1) {
    return Math.max(Math.min(left.x1, left.x2), Math.min(right.x1, right.x2)) <
      Math.min(Math.max(left.x1, left.x2), Math.max(right.x1, right.x2));
  }
  if (left.x1 === left.x2 && right.x1 === right.x2 && left.x1 === right.x1) {
    return Math.max(Math.min(left.y1, left.y2), Math.min(right.y1, right.y2)) <
      Math.min(Math.max(left.y1, left.y2), Math.max(right.y1, right.y2));
  }
  return false;
}

function edgesFor(cell: GridCell): readonly Edge[] {
  const left = cell.column - 0.5;
  const right = cell.column + 0.5;
  const top = cell.row - 0.5;
  const bottom = cell.row + 0.5;
  return [
    { x1: left, y1: top, x2: right, y2: top },
    { x1: right, y1: top, x2: right, y2: bottom },
    { x1: left, y1: bottom, x2: right, y2: bottom },
    { x1: left, y1: top, x2: left, y2: bottom },
  ];
}

function wallFromEdge(
  id: string,
  edge: Edge,
  blocksMovement: boolean,
  blocksVision: boolean,
  assetId: string,
): SceneWall {
  return {
    id,
    a: { x: edge.x1, y: edge.y1 },
    b: { x: edge.x2, y: edge.y2 },
    baseZ: 0,
    height: 1,
    blocksMovement,
    blocksVision,
    assetId,
  };
}

function allCells(bounds: { readonly columns: number; readonly rows: number }): readonly GridCell[] {
  const cells: GridCell[] = [];
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) cells.push({ column, row });
  }
  return cells;
}

function sortedCells(cells: readonly GridCell[]): [number, number][] {
  return [...new Map(cells.map((cell) => [
    `${String(cell.column)},${String(cell.row)}`, [cell.column, cell.row] as [number, number],
  ] as const)).values()].sort((left, right) => left[1] - right[1] || left[0] - right[0]);
}

function centroid(cells: readonly GridCell[]): { readonly x: number; readonly y: number; readonly radius: number } {
  if (cells.length === 0) return { x: 0, y: 0, radius: 0.5 };
  const x = cells.reduce((total, cell) => total + cell.column, 0) / cells.length;
  const y = cells.reduce((total, cell) => total + cell.row, 0) / cells.length;
  const radius = Math.max(...cells.map((cell) => Math.hypot(cell.column - x, cell.row - y))) + 0.5;
  return { x, y, radius };
}

export interface SnapshotAssetFallback extends AssetIdMapping {
  readonly entityId: string;
  readonly role: LogicalAssetRole;
}

export interface SceneSnapshotResult {
  readonly snapshot: SceneSnapshot;
  readonly assetFallbacks: readonly SnapshotAssetFallback[];
}

function mapAsset(
  sourceAssetId: string,
  role: LogicalAssetRole,
  entityId: string,
  fallbacks: SnapshotAssetFallback[],
): string {
  const mapping = logicalAssetId(sourceAssetId, role);
  if (mapping.fallbackUsed) fallbacks.push({ ...mapping, entityId, role });
  return mapping.assetId;
}

function projectedBoard(projection: DmBoardProjection | PlayerBoardProjection): EncounterBoardProjectionShape {
  return projection.audience === 'dm' ? projection.board : projection;
}

function artForCapturedBoard(
  board: EncounterBoardProjectionShape,
  art: EncounterArtPackage,
): EncounterArtPackage {
  const missing = board.combatants.filter((combatant) => art.combatantTokens[combatant.id] === undefined);
  if (missing.length === 0) return art;
  return {
    ...art,
    combatantTokens: {
      ...art.combatantTokens,
      ...Object.fromEntries(missing.map((combatant) => [
        combatant.id,
        assetId(`art.token.unmapped.${combatant.kind === 'player_character' ? 'player' : 'monster'}.v1`),
      ])),
    },
  };
}

export function sceneSnapshot(options: {
  readonly sceneId: string;
  readonly projection: DmBoardProjection | PlayerBoardProjection;
  readonly art: EncounterArtPackage;
  readonly tokenIdentities: CanonicalTokenIdentityIndex;
}): SceneSnapshotResult {
  const { projection, art } = options;
  const board = projectedBoard(projection);
  const capturedArt = artForCapturedBoard(board, art);
  const cells = encounterBoardRenderModel(board, capturedArt);
  const tokenModels = encounterBoardTokenRenderModels(board, capturedArt);
  const fallbacks: SnapshotAssetFallback[] = [];
  const tiles = cells.map((cell) => {
    const floor = cell.layers.find((layer) => layer.role === 'floor');
    if (floor === undefined) throw new Error(`MISSING_FLOOR_ASSET: ${cell.key}`);
    const id = `tile:${String(cell.column)}:${String(cell.row)}`;
    return { id, assetId: mapAsset(String(floor.assetId), 'floor', id, fallbacks), x: cell.column, y: cell.row, z: 0 };
  });

  const props = (board.worldObjects ?? []).filter((object) =>
    object.kind !== 'door' && object.terrainKind !== 'wall').map((object) => {
    const cell = cells.find((candidate) => candidate.column === object.position.column && candidate.row === object.position.row);
    const source = cell?.layers.find((layer) => layer.role === 'terrain')?.assetId;
    const mappingSource = `${object.name.toLowerCase()} ${source === undefined ? '' : String(source)}`.trim();
    return {
      id: String(object.id),
      assetId: mapAsset(mappingSource, 'prop', String(object.id), fallbacks),
      x: object.position.column, y: object.position.row, z: 0,
    };
  }).sort((left, right) => left.id.localeCompare(right.id));

  const tokens = tokenModels.map((token) => {
    const footprint = footprintOf(token.footprint);
    const center = groundCenter(token.position, footprint);
    const id = options.tokenIdentities.byCombatantId.get(String(token.id));
    if (id === undefined) throw new Error(`MISSING_CANONICAL_TOKEN_IDENTITY: ${String(token.id)}`);
    const role = token.kind === 'player_character' ? 'player-token' : 'monster-token';
    return {
      id,
      label: token.name,
      assetId: mapAsset(String(token.assetId), role, id, fallbacks),
      ...center,
      facing: 0,
      footprint,
    };
  }).sort((left, right) => left.id.localeCompare(right.id));

  const wallCells = new Map<string, { readonly cell: GridCell; readonly movement: boolean; readonly vision: boolean }>();
  const mergeWallCell = (cell: GridCell, movement: boolean, vision: boolean): void => {
    const key = `${String(cell.column)},${String(cell.row)}`;
    const existing = wallCells.get(key);
    wallCells.set(key, {
      cell,
      movement: movement || existing?.movement === true,
      vision: vision || existing?.vision === true,
    });
  };
  for (const cell of board.blockedCells ?? []) mergeWallCell(cell, true, true);
  for (const object of board.worldObjects ?? []) {
    if (object.kind === 'door' || object.terrainKind !== 'wall') continue;
    for (const cell of object.cells) mergeWallCell(cell, object.blocking.movement, object.blocking.lineOfSight);
  }

  const doors = (board.worldObjects ?? []).filter((object) => object.kind === 'door')
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const doorEdges = new Map<string, EncounterBoardWorldObject>();
  const doorCompanionEdges: Edge[] = [];
  const doorWalls: SceneWall[] = [];
  let cachedWallAssetId: string | null = null;
  const wallAssetId = (): string => {
    cachedWallAssetId ??= mapAsset(String(art.room.wall), 'wall', 'wall:logical-asset', fallbacks);
    return cachedWallAssetId;
  };
  const doorRows = doors.map((door) => {
    const edge = edgesFor(door.position)[0];
    if (edge === undefined) throw new Error('MISSING_DOOR_EDGE');
    const key = edgeKey(edge);
    if (doorEdges.has(key)) throw new Error('AMBIGUOUS_DOOR_GEOMETRY');
    doorEdges.set(key, door);
    doorCompanionEdges.push(edge);
    const wallId = `wall:door:${String(door.id)}`;
    doorWalls.push(wallFromEdge(wallId, edge, door.blocking.movement, door.blocking.lineOfSight, wallAssetId()));
    return {
      id: String(door.id), wallId,
      assetId: mapAsset(String(art.room.door), 'door', String(door.id), fallbacks),
      open: !door.blocking.movement,
    };
  });
  const perimeter = new Map<string, { readonly edge: Edge; readonly movement: boolean; readonly vision: boolean }>();
  for (const source of wallCells.values()) {
    for (const edge of edgesFor(source.cell)) {
      const key = edgeKey(edge);
      if (perimeter.has(key)) perimeter.delete(key);
      else perimeter.set(key, { edge, movement: source.movement, vision: source.vision });
    }
  }
  const regularWalls = [...perimeter.entries()]
    .filter(([_key, value]) => !doorCompanionEdges.some((doorEdge) => edgesOverlap(value.edge, doorEdge)))
    .map(([key, value]) =>
      wallFromEdge(`wall:${key}`, value.edge, value.movement, value.vision, wallAssetId()));
  const walls = [...regularWalls, ...doorWalls].sort((left, right) => left.id.localeCompare(right.id));

  const objectLights = (board.worldObjects ?? []).filter((object) => object.lightClass === 'light-source').map((object) => {
    const area = centroid(object.cells);
    return { id: `light:object:${String(object.id)}`, x: area.x, y: area.y, z: 0, color: '#FFD27F', intensity: 0.5, radius: area.radius, enabled: true };
  });
  const environmentLights = projection.audience === 'dm' ? projection.board.environmentLightRegions?.map((region) => {
    const area = centroid(region.cells);
    const style = region.level === 'bright'
      ? { color: '#FFF2CC', intensity: 1 }
      : region.level === 'dim'
        ? { color: '#FFD27F', intensity: 0.5 }
        : { color: '#000000', intensity: 0 };
    return { id: `light:environment:${region.id}`, x: area.x, y: area.y, z: 0, ...style, radius: area.radius, enabled: true };
  }) ?? [] : [];
  const lights = [...objectLights, ...environmentLights].sort((left, right) => left.id.localeCompare(right.id));

  const visibleCells = projection.audience === 'dm' ? allCells(board.bounds) : projection.visibleCells;
  const exploredCells = projection.audience === 'dm'
    ? visibleCells
    : [...projection.visibleCells, ...projection.lastSeen.map((entry) => entry.cell)];
  const revision = projection.audience === 'dm' ? projection.encounter.revision : projection.revision;
  return {
    snapshot: {
      sceneId: options.sceneId,
      revision,
      grid: { width: board.bounds.columns, height: board.bounds.rows, feetPerCell: 5 },
      tiles,
      props,
      tokens,
      walls,
      doors: doorRows,
      lights,
      vision: {
        mode: projection.audience === 'dm' ? 'all' : 'cells',
        visible: sortedCells(visibleCells),
        explored: sortedCells(exploredCells),
      },
    },
    assetFallbacks: fallbacks.sort((left, right) => left.entityId.localeCompare(right.entityId) || left.role.localeCompare(right.role)),
  };
}
