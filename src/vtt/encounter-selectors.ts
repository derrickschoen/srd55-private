import type { AreaTemplate } from '../combat/templates';
import { affectedCellsAmong } from '../combat/templates';
import type { GridCell } from '../combat/grid';
import { terrainProfile, terrainWallCells } from '../combat/terrain';
import type { DmBoardProjection, PlayerBoardProjection } from './encounter-projections';

export interface DmWorldObjectLabel {
  readonly objectId: string;
  readonly text: string;
}

export function dmWorldObjectLabel(
  projection: DmBoardProjection,
  objectId: string,
): DmWorldObjectLabel | null {
  const object = projection.board.worldObjects?.find((candidate) => String(candidate.id) === objectId);
  if (object === undefined) return null;
  const profile = terrainProfile(object.terrainKind);
  return {
    objectId,
    text: `${object.name} — movement ${profile.passability}; sight ${profile.blocksSight ? 'blocked' : 'open'}; anchor (${String(object.position.column)},${String(object.position.row)}); footprint ${object.cells.map((cell) => `(${String(cell.column)},${String(cell.row)})`).join(' ')}`,
  };
}

export type PlayerAffectedCellPreview =
  | { readonly kind: 'available'; readonly cellKeys: readonly string[] }
  | { readonly kind: 'unavailable'; readonly reason: 'no_visible_geometry' };

export function previewAffectedCellKeys(
  projection: PlayerBoardProjection,
  area: AreaTemplate,
): PlayerAffectedCellPreview {
  if (projection.visibleCells.length === 0) {
    return { kind: 'unavailable', reason: 'no_visible_geometry' };
  }
  const walls = terrainWallCells({
    blockedCells: projection.blockedCells,
    worldObjects: projection.worldObjects.map((object) => ({
      id: object.id,
      footprint: object.cells,
      blocking: object.blocking,
    })),
  });
  const cells = affectedCellsAmong(
    { bounds: projection.bounds, blockedCells: walls },
    area,
    projection.visibleCells,
  );
  return {
    kind: 'available',
    cellKeys: cells.map((cell) => `${String(cell.column)},${String(cell.row)}`),
  };
}

export type OfferedDestinationMatch =
  | { readonly kind: 'matched'; readonly offeredActionId: string }
  | { readonly kind: 'unavailable'; readonly reason: 'no_current_offer' }
  | { readonly kind: 'illegal' }
  | { readonly kind: 'ambiguous'; readonly offeredActionIds: readonly string[] };

function sameCell(left: GridCell | undefined, right: GridCell): boolean {
  return left?.column === right.column && left.row === right.row;
}

export function matchOfferedMoveDestination(
  projection: PlayerBoardProjection,
  actorId: string,
  destination: GridCell,
): OfferedDestinationMatch {
  const pending = projection.pendingRequest;
  if (pending === null || String(pending.actorId) !== actorId) {
    return { kind: 'unavailable', reason: 'no_current_offer' };
  }
  const matches = pending.legalActions.flatMap((action, index) =>
    action.type === 'move' && String(action.actor) === actorId && sameCell(action.path.at(-1), destination)
      ? [pending.offeredActionIds[index]]
      : []).filter((id): id is string => id !== undefined);
  if (matches.length === 0) return { kind: 'illegal' };
  if (matches.length > 1) return { kind: 'ambiguous', offeredActionIds: matches };
  const offeredActionId = matches[0];
  return offeredActionId === undefined
    ? { kind: 'illegal' }
    : { kind: 'matched', offeredActionId };
}
