/**
 * Independent oracle for blind legal movement (PERF-02 x1r).
 *
 * One FROZEN reference `findPath` per grid cell per required actor, row-major,
 * with the budget the canonical `path` query uses when `maximumFeet` is given:
 * min(maximumFeet, columns * rows * 10). Only the bounded search is modelled,
 * because blind legal movement keeps only the legal answers and the bounded
 * search alone decides them. It shares no search code with src/combat/movement.ts;
 * the movement world itself is the live encounter world, as it is for every
 * other reference-movement differential.
 */
import type { EncounterState } from '../../src/combat/encounter';
import { encounterMovementWorld } from '../../src/combat/encounter-movement-world';
import { feet } from '../../src/combat/values';
import type {
  BlindResolvedActorMovement,
  BlindResolvedMovementCell,
} from '../../src/vtt/blind-turn-context';
import type { EngineStateCapsule } from '../../src/vtt/engine-state-capsule';
import { findPath as referenceFindPath } from './reference-movement';

export function referenceLegalMovement(
  state: EncounterState,
  capsule: EngineStateCapsule,
): readonly BlindResolvedActorMovement[] {
  const required = capsule.request?.actors ?? [];
  return required.map((actorId): BlindResolvedActorMovement => {
    const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
    if (actor === undefined) throw new Error(`Reference legal movement cannot bind actor ${String(actorId)}.`);
    const placed = state.combatants.some((candidate) => candidate.profile.id === actorId);
    const start = state.tokens.find((token) => token.combatantId === actorId)?.position;
    const cells: BlindResolvedMovementCell[] = [];
    if (placed && start !== undefined) {
      const world = encounterMovementWorld(state);
      const maximumCost = feet(Math.min(actor.movementRemainingFeet, state.bounds.columns * state.bounds.rows * 10));
      for (let row = 0; row < state.bounds.rows; row += 1) {
        for (let column = 0; column < state.bounds.columns; column += 1) {
          const result = referenceFindPath(world, { actorId, start, goal: { column, row }, maximumCost });
          if (result.kind === 'found') {
            cells.push({
              label: `${String(column)},${String(row)}`,
              cell: { column, row },
              costFeet: result.cost,
              path: result.cells,
            });
          }
        }
      }
    }
    return { actorId: String(actorId), movementBudgetFeet: actor.movementRemainingFeet, cells };
  });
}
