import type { AssetId } from '../assets/ids';
import type { CombatantId } from '../combat/values';
import type { EncounterArtPackage } from './encounter-package';

export interface EncounterBoardCombatant {
  readonly id: CombatantId;
  readonly name: string;
  readonly kind: 'player_character' | 'monster';
  readonly position: { readonly column: number; readonly row: number };
}

export interface EncounterBoardProjectionShape {
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly combatants: readonly EncounterBoardCombatant[];
  readonly highlightedCombatant: CombatantId | null;
  readonly adjudicatedTargets: readonly CombatantId[];
  /** Omit this property entirely for player projections. */
  readonly foggedCells?: readonly { readonly column: number; readonly row: number }[];
}

export type EncounterBoardLayerRole = 'floor' | 'wall' | 'door' | 'terrain' | 'fog';

export interface EncounterBoardLayer {
  readonly role: EncounterBoardLayerRole;
  readonly assetId: AssetId;
}

export interface EncounterBoardTokenModel extends EncounterBoardCombatant {
  readonly assetId: AssetId;
  readonly focusAssetId: AssetId | null;
  readonly adjudicatedAssetId: AssetId | null;
}

export interface EncounterBoardCellModel {
  readonly key: string;
  readonly column: number;
  readonly row: number;
  readonly layers: readonly EncounterBoardLayer[];
  readonly token: EncounterBoardTokenModel | null;
}

function cellKey(cell: { readonly column: number; readonly row: number }): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

export function encounterBoardRenderModel(
  projection: EncounterBoardProjectionShape,
  art: EncounterArtPackage,
): readonly EncounterBoardCellModel[] {
  if (
    projection.bounds.columns !== art.room.columns ||
    projection.bounds.rows !== art.room.rows
  ) {
    throw new Error(`Encounter bounds do not match art package ${art.id}.`);
  }
  const combatants = new Map(projection.combatants.map((entry) => [cellKey(entry.position), entry] as const));
  const terrain = new Map(art.terrain.map((entry) => [cellKey(entry.cell), entry.asset] as const));
  const fog = new Set(projection.foggedCells?.map(cellKey) ?? []);
  const adjudicated = new Set(projection.adjudicatedTargets);
  const cells: EncounterBoardCellModel[] = [];

  for (let row = 0; row < projection.bounds.rows; row += 1) {
    for (let column = 0; column < projection.bounds.columns; column += 1) {
      const key = cellKey({ column, row });
      const layers: EncounterBoardLayer[] = [{ role: 'floor', assetId: art.room.floor }];
      const perimeter = row === 0 || row === projection.bounds.rows - 1 || column === 0 || column === projection.bounds.columns - 1;
      if (perimeter) {
        layers.push(
          column === art.room.doorCell.column && row === art.room.doorCell.row
            ? { role: 'door', assetId: art.room.door }
            : { role: 'wall', assetId: art.room.wall },
        );
      }
      const terrainAsset = terrain.get(key);
      if (terrainAsset !== undefined) layers.push({ role: 'terrain', assetId: terrainAsset });
      if (fog.has(key)) layers.push({ role: 'fog', assetId: art.fog.hidden });

      const combatant = combatants.get(key);
      let token: EncounterBoardTokenModel | null = null;
      if (combatant !== undefined) {
        const asset = art.combatantTokens[combatant.id];
        if (asset === undefined) throw new Error(`Art package ${art.id} has no token for ${combatant.id}.`);
        token = {
          ...combatant,
          assetId: asset,
          focusAssetId: combatant.id === projection.highlightedCombatant ? art.ui.activePc : null,
          adjudicatedAssetId: adjudicated.has(combatant.id) ? art.ui.adjudicated : null,
        };
      }
      cells.push(Object.freeze({ key, column, row, layers: Object.freeze(layers), token }));
    }
  }
  return Object.freeze(cells);
}
