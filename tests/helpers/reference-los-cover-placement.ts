/**
 * Frozen copy of the los_cover_v1 terrain placement in src/vtt/room-generator.ts at ff70ec48 (lines
 * 1133-1399, cellIsInside through applyLosCoverTerrainProfile, plus its cellKey), tracing with the frozen
 * pre-walk cover code in reference-cover.ts: the plain search that re-traces every line of every
 * candidate. PERF-02 cover6 differential reference for the incremental placement. Do not edit;
 * the only change is `export` on applyLosCoverTerrainProfile.
 */
import type { EncounterCombatantState, EncounterState } from '../../src/combat/encounter';
import { combatantSpace } from '../../src/combat/combat-rules';
import type { GridBounds, GridCell } from '../../src/combat/grid';
import { terrainBlocking, type CoverTier } from '../../src/combat/terrain';
import { armorClass, worldObjectId } from '../../src/combat/values';
import type { GeneratedCoverObject, GeneratedRoom, RoomTerrainFeature } from '../../src/vtt/room-generator';
import { traceCombatantLine, traceCombatantLineToCells } from './reference-cover';

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function cellIsInside(dimensions: GridBounds, cell: GridCell): boolean {
  return cell.column >= 0 && cell.column < dimensions.columns &&
    cell.row >= 0 && cell.row < dimensions.rows;
}

function featureFootprintCandidates(dimensions: GridBounds): readonly (readonly GridCell[])[] {
  const candidates: GridCell[][] = [];
  const shapes = [
    [{ column: 0, row: 0 }],
    [{ column: 0, row: -1 }, { column: 0, row: 0 }],
    [{ column: -1, row: 0 }, { column: 0, row: 0 }],
    [{ column: 0, row: -1 }, { column: 0, row: 0 }, { column: 0, row: 1 }],
    [{ column: -1, row: 0 }, { column: 0, row: 0 }, { column: 1, row: 0 }],
  ] as const;
  for (let row = 1; row < dimensions.rows - 1; row += 1) {
    for (let column = 1; column < dimensions.columns - 1; column += 1) {
      for (const shape of shapes) {
        const footprint = shape.map((offset) => ({
          column: column + offset.column,
          row: row + offset.row,
        }));
        if (footprint.every((cell) => cellIsInside(dimensions, cell))) candidates.push(footprint);
      }
    }
  }
  return candidates;
}

function generatedCoverObject<TerrainKind extends 'half_cover' | 'three_quarters_cover'>(
  seed: number,
  terrainKind: TerrainKind,
  footprint: readonly GridCell[],
): GeneratedCoverObject<TerrainKind> {
  const position = footprint[0];
  if (position === undefined) throw new RangeError('Generated cover must occupy at least one cell.');
  const blocking = terrainBlocking(terrainKind) as GeneratedCoverObject<TerrainKind>['blocking'];
  return {
    id: worldObjectId(`world-object:generated-${String(seed)}-${terrainKind}`),
    name: terrainKind === 'half_cover' ? 'Low Stone Barricade' : 'Arrow-Slit Bulwark',
    kind: 'cover',
    terrainKind,
    position,
    footprint,
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking,
    createdRevision: 0,
  };
}

function livingOpposingPairs(state: EncounterState): readonly {
  readonly source: EncounterCombatantState;
  readonly target: EncounterCombatantState;
}[] {
  const party = state.combatants.filter((combatant) =>
    combatant.life === 'living' && combatant.profile.kind === 'player_character');
  const monsters = state.combatants.filter((combatant) =>
    combatant.life === 'living' && combatant.profile.kind === 'monster');
  return [
    ...party.flatMap((source) => monsters.map((target) => ({ source, target }))),
    ...monsters.flatMap((source) => party.map((target) => ({ source, target }))),
  ];
}

function traceHasAuthoredSource(
  state: EncounterState,
  tier: CoverTier,
  authoredSourceIds: ReadonlySet<string>,
): boolean {
  return livingOpposingPairs(state).some(({ source, target }) => {
    const trace = traceCombatantLine(state, source.profile.id, target.profile.id);
    return trace.tier === tier && trace.sourceIds.some((id) => authoredSourceIds.has(id));
  });
}

function hasOpenOpposingRay(state: EncounterState): boolean {
  if (livingOpposingPairs(state).some(({ source, target }) =>
    traceCombatantLine(state, source.profile.id, target.profile.id).tier === 'none')) return true;
  const occupied = occupiedCombatantCells(state);
  return state.combatants.some((source) => {
    if (source.life !== 'living' || !state.tokens.some((token) =>
      token.combatantId === source.profile.id)) return false;
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const target = { column, row };
        if (!occupied.has(cellKey(target)) &&
          traceCombatantLineToCells(state, source.profile.id, [target]).tier === 'none') return true;
      }
    }
    return false;
  });
}

function traceToCellHasAuthoredSource(
  state: EncounterState,
  tier: CoverTier,
  authoredSourceIds: ReadonlySet<string>,
): boolean {
  const occupied = occupiedCombatantCells(state);
  return state.combatants.some((source) => {
    if (source.life !== 'living' || !state.tokens.some((token) =>
      token.combatantId === source.profile.id)) return false;
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const target = { column, row };
        if (occupied.has(cellKey(target))) continue;
        const trace = traceCombatantLineToCells(state, source.profile.id, [target]);
        if (trace.tier === tier && trace.sourceIds.some((id) => authoredSourceIds.has(id))) {
          return true;
        }
      }
    }
    return false;
  });
}

function occupiedCombatantCells(state: EncounterState): ReadonlySet<string> {
  return new Set(state.combatants.flatMap((combatant) => {
    if (combatant.life === 'dead' || !state.tokens.some((token) =>
      token.combatantId === combatant.profile.id)) return [];
    return combatantSpace(state, combatant.profile.id).cells.map(cellKey);
  }));
}

function footprintIsAvailable(
  footprint: readonly GridCell[],
  occupied: ReadonlySet<string>,
  authored: ReadonlySet<string>,
  blocked: boolean,
): boolean {
  const keys = footprint.map(cellKey);
  if (new Set(keys).size !== keys.length || keys.some((key) => occupied.has(key) || authored.has(key))) {
    return false;
  }
  if (!blocked) return true;
  return footprint.every((cell) => {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if (authored.has(cellKey({
          column: cell.column + columnOffset,
          row: cell.row + rowOffset,
        }))) return false;
      }
    }
    return true;
  });
}

function withCoverObject<TerrainKind extends 'half_cover' | 'three_quarters_cover'>(
  state: EncounterState,
  object: GeneratedCoverObject<TerrainKind>,
): EncounterState {
  return { ...state, worldObjects: [...state.worldObjects, object] };
}

function findCoverPlacement<TerrainKind extends 'half_cover' | 'three_quarters_cover'>(
  state: EncounterState,
  seed: number,
  terrainKind: TerrainKind,
  occupied: ReadonlySet<string>,
  authored: ReadonlySet<string>,
  preserves: (candidate: EncounterState) => boolean,
): {
  readonly state: EncounterState;
  readonly object: GeneratedCoverObject<TerrainKind>;
} {
  const tier = terrainKind === 'half_cover' ? 'half' : 'three_quarters';
  for (const footprint of featureFootprintCandidates(state.bounds)) {
    if (!footprintIsAvailable(footprint, occupied, authored, terrainKind === 'three_quarters_cover')) {
      continue;
    }
    const object = generatedCoverObject(seed, terrainKind, footprint);
    const candidate = withCoverObject(state, object);
    const sourceId = `object:${String(object.id)}`;
    if (traceHasAuthoredSource(candidate, tier, new Set([sourceId])) && preserves(candidate)) {
      return { state: candidate, object };
    }
  }
  throw new RangeError(`los_cover_v1 could not place exercised ${terrainKind} for seed ${String(seed)}.`);
}

function findWallPlacement(
  state: EncounterState,
  seed: number,
  occupied: ReadonlySet<string>,
  authored: ReadonlySet<string>,
  halfSourceId: string,
  threeQuartersSourceId: string,
): { readonly state: EncounterState; readonly cells: readonly GridCell[] } {
  for (const footprint of featureFootprintCandidates(state.bounds)) {
    if (!footprintIsAvailable(footprint, occupied, authored, true)) continue;
    const candidate = { ...state, blockedCells: footprint };
    const wallSourceIds = new Set(footprint.map((cell) => `blocked:${cellKey(cell)}`));
    if (
      traceToCellHasAuthoredSource(candidate, 'total', wallSourceIds) &&
      traceHasAuthoredSource(candidate, 'half', new Set([halfSourceId])) &&
      traceHasAuthoredSource(candidate, 'three_quarters', new Set([threeQuartersSourceId])) &&
      hasOpenOpposingRay(candidate)
    ) return { state: candidate, cells: footprint };
  }
  throw new RangeError(`los_cover_v1 could not place an exercised wall for seed ${String(seed)}.`);
}

export function applyLosCoverTerrainProfile(room: GeneratedRoom): GeneratedRoom {
  const seed = room.spec.seed;
  const baseState: EncounterState = {
    ...room.encounter.state,
    blockedCells: [],
    worldObjects: room.encounter.state.worldObjects.filter((object) => object.blocking.cover === 'none'),
  };
  const occupied = occupiedCombatantCells(baseState);
  const authored = new Set<string>();
  const half = findCoverPlacement(
    baseState,
    seed,
    'half_cover',
    occupied,
    authored,
    () => true,
  );
  half.object.footprint.forEach((cell) => authored.add(cellKey(cell)));
  const halfSourceId = `object:${String(half.object.id)}`;
  const threeQuarters = findCoverPlacement(
    half.state,
    seed,
    'three_quarters_cover',
    occupied,
    authored,
    (candidate) => traceHasAuthoredSource(
      candidate,
      'half',
      new Set([halfSourceId]),
    ),
  );
  threeQuarters.object.footprint.forEach((cell) => authored.add(cellKey(cell)));
  const threeQuartersSourceId = `object:${String(threeQuarters.object.id)}`;
  const wall = findWallPlacement(
    threeQuarters.state,
    seed,
    occupied,
    authored,
    halfSourceId,
    threeQuartersSourceId,
  );
  const wallId = `wall:generated-${String(seed)}-los-cover-v1`;
  const terrain: RoomTerrainFeature[] = [
    ...room.spec.terrain.filter((feature) =>
      feature.kind !== 'cover-object' && feature.kind !== 'wall'),
    { kind: 'cover-object', object: threeQuarters.object },
    { kind: 'cover-object', object: half.object },
    { kind: 'wall', id: wallId, terrainKind: 'wall', cells: wall.cells },
  ];
  const { hardFeatures: _legacyHardFeatures, ...legacySpec } = room.spec;
  return {
    spec: {
      ...legacySpec,
      terrainProfile: 'los_cover_v1',
      terrain,
      blockedCells: wall.cells,
    },
    encounter: {
      ...room.encounter,
      state: wall.state,
    },
  };
}
