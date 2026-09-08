import { combatantsAreAllies } from './allies';
import { combatantConditions, combatantSpace, combatantSpaceAt } from './combat-rules';
import { isIncapacitated } from './conditions';
import {
  type CreatureSpace,
  newlyEnteredSpaceCells,
  openingContainingSpace,
  spaceFitsBounds,
} from './creature-space';
import type { EncounterCombatantState, EncounterState } from './encounter';
import type { GridCell } from './grid';
import type { MovementWorld } from './movement';
import { persistentAreaContains } from './persistent-areas';
import { feet, type CombatantId } from './values';
import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import { terrainPassabilityAt } from './terrain';

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function ignoresDifficultTerrain(state: EncounterState, id: CombatantId): boolean {
  return state.effects.some((effect) => effect.targets.includes(id) && effect.payload.kind === 'movement_modifier' &&
    'modeGrants' in effect.payload && (effect.payload.difficultTerrainImmunity ||
      effect.payload.modeGrants.some((grant) => grant.mode === 'flying')));
}

const movementWorldCache = new WeakMap<EncounterState, MovementWorld<CombatantId>>();

/** One state-space adapter shared by reducer validation and every path planner. */
export function encounterMovementWorld(state: EncounterState): MovementWorld<CombatantId> {
  const cached = movementWorldCache.get(state);
  if (cached !== undefined) return cached;

  const blockedCellKeys = new Set(state.blockedCells.map(cellKey));
  for (const object of state.worldObjects) {
    for (const cell of object.footprint) {
      if (terrainPassabilityAt(state, cell) === 'blocked') blockedCellKeys.add(cellKey(cell));
    }
  }
  for (const region of state.environment.movementRegions ?? []) {
    if (region.entry === 'blocked') region.cells.forEach((cell) => blockedCellKeys.add(cellKey(cell)));
  }
  const difficultCellKeys = new Set(
    state.environment.difficultTerrainRegions.flatMap((region) => region.cells.map(cellKey)),
  );
  for (const object of state.worldObjects) {
    for (const cell of object.footprint) {
      if (terrainPassabilityAt(state, cell) === 'difficult') difficultCellKeys.add(cellKey(cell));
    }
  }
  const combatantsById = new Map(state.combatants.map((combatant) => [combatant.profile.id, combatant] as const));
  const stationarySpaces = new Map(
    state.tokens.map((token) => [token.combatantId, combatantSpace(state, token.combatantId)] as const),
  );
  const occupants = state.tokens.flatMap((token) => {
    const combatant = combatantsById.get(token.combatantId);
    const space = stationarySpaces.get(token.combatantId);
    return combatant === undefined || combatant.life === 'dead' || space === undefined
      ? []
      : [{ combatant, space, cellKeys: new Set(space.cells.map(cellKey)) }];
  });
  const spaceAtCache = new Map<string, CreatureSpace<KnownCreatureSize>>();
  const spaceAt = (actorId: CombatantId, anchor: GridCell): CreatureSpace<KnownCreatureSize> => {
    const key = `${actorId}:${cellKey(anchor)}`;
    const existing = spaceAtCache.get(key);
    if (existing !== undefined) return existing;
    const resolved = combatantSpaceAt(state, actorId, anchor);
    spaceAtCache.set(key, resolved);
    return resolved;
  };
  const ignoresDifficult = new Map(
    state.combatants.map((combatant) => [
      combatant.profile.id,
      ignoresDifficultTerrain(state, combatant.profile.id),
    ] as const),
  );

  const world: MovementWorld<CombatantId> = {
    bounds: state.bounds,
    occupiedCells: (actorId, anchor) => spaceAt(actorId, anchor).cells,
    canTraverseStep: (actorId, _from, to) => {
      const destination = spaceAt(actorId, to);
      if (!spaceFitsBounds(destination, state.bounds)) return false;
      if (destination.mode.kind === 'squeezed') {
        return openingContainingSpace(destination, state.environment.narrowOpeningRegions) !== null;
      }
      const actualIndex = creatureSizes.indexOf(destination.actualSize);
      return !state.environment.narrowOpeningRegions.some((opening) => {
        const openingIndex = creatureSizes.indexOf(opening.sizedFor);
        return actualIndex > openingIndex && destination.cells.some((occupied) =>
          opening.cells.some((entry) => cellKey(entry) === cellKey(occupied)));
      });
    },
    traversal: (actorId, from, to) => {
      const sourceSpace = spaceAt(actorId, from);
      const destinationSpace = spaceAt(actorId, to);
      if (!spaceFitsBounds(destinationSpace, state.bounds)) {
        return { kind: 'blocked', reason: 'creature footprint is outside the grid' };
      }
      const enteredCells = newlyEnteredSpaceCells(sourceSpace, destinationSpace);
      if (destinationSpace.cells.some((occupied) => blockedCellKeys.has(cellKey(occupied)))) {
        return { kind: 'blocked', reason: 'blocked cell' };
      }
      const overlappingOccupants = occupants.filter((occupant) =>
        occupant.combatant.profile.id !== actorId &&
        destinationSpace.cells.some((cell) => occupant.cellKeys.has(cellKey(cell))));
      const actorSize = destinationSpace.actualSize;
      const canPassOccupant = (occupant: EncounterCombatantState): boolean => {
        if (combatantsAreAllies(state, actorId, occupant.profile.id)) return true;
        if (isIncapacitated(combatantConditions(state, occupant.profile.id))) return true;
        const occupantSize = stationarySpaces.get(occupant.profile.id)?.actualSize;
        if (occupantSize === undefined) return false;
        if (occupantSize === 'Tiny') return true;
        return Math.abs(creatureSizes.indexOf(actorSize) - creatureSizes.indexOf(occupantSize)) >= 2;
      };
      if (overlappingOccupants.some((occupant) => !canPassOccupant(occupant.combatant))) {
        return { kind: 'blocked', reason: 'creature space cannot be traversed' };
      }
      const creatureSpaceIsDifficult = overlappingOccupants.some((occupant) =>
        !combatantsAreAllies(state, actorId, occupant.combatant.profile.id) &&
        occupant.space.actualSize !== 'Tiny');
      const difficult = ignoresDifficult.get(actorId) !== true && (creatureSpaceIsDifficult || enteredCells.some((entered) =>
        difficultCellKeys.has(cellKey(entered))) || state.persistentAreas.some((area) => {
        if (!area.difficultTerrain) return false;
        const origin = area.origin;
        const anchor = origin.kind === 'anchored'
          ? state.tokens.find((candidate) => candidate.combatantId === origin.combatant)?.position ?? null
          : origin.kind === 'anchored_to_object'
            ? state.worldObjects.find((object) => object.id === origin.object)?.position ?? null
            : null;
        return enteredCells.some((entered) => persistentAreaContains(area, entered, anchor, state));
      }));
      const tinyCapacity = actorSize === 'Tiny' && overlappingOccupants.every((occupant) =>
        occupant.space.actualSize === 'Tiny') && overlappingOccupants.length < 4;
      return {
        kind: 'enterable',
        cost: feet(difficult ? 10 : 5),
        canEnd: overlappingOccupants.length === 0 || tinyCapacity,
      };
    },
  };
  movementWorldCache.set(state, world);
  return world;
}
