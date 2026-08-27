import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import type { GridCell } from '../../../src/combat/grid';
import { combatantId, type CombatantId } from '../../../src/combat/values';
import { arenaPathCost, arenaReachCheck } from '../../../src/vtt/arena-legality';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { pureIntentResolver, resolvePrototypeIntent } from '../../../src/vtt/intent-resolver';
import { generateRoom } from '../../../src/vtt/room-generator';
import { intentTranscript } from '../../fixtures/mcp-migration/intent-transcript';
import { movementTranscript } from '../../fixtures/mcp-migration/movement-transcript';
import { reachTranscript } from '../../fixtures/mcp-migration/reach-transcript';

function placedState(
  seed: number,
  positions: ReadonlyMap<CombatantId, GridCell>,
  difficultCells: readonly GridCell[] = [],
  rows?: number,
): EncounterState {
  const state = generateRoom(seed).encounter.state;
  return {
    ...state,
    bounds: rows === undefined ? state.bounds : { ...state.bounds, rows },
    blockedCells: [],
    worldObjects: [],
    persistentAreas: [],
    environment: {
      ...state.environment,
      difficultTerrainRegions: difficultCells.length === 0
        ? []
        : [{ id: 'mcp-migration-difficult', cells: difficultCells }],
      movementRegions: [],
    },
    tokens: state.tokens.flatMap((token) => {
      const position = positions.get(token.combatantId);
      return position === undefined ? [] : [{ ...token, position }];
    }),
  };
}

describe('engine query migration characterization', () => {
  it('preserves canonical path legality and hand-computed movement costs', () => {
    const actorId = combatantId(movementTranscript.actorId);
    const occupantId = combatantId(movementTranscript.occupantId);
    for (const call of movementTranscript.calls) {
      const positions = new Map<CombatantId, GridCell>([[actorId, call.actor]]);
      if ('occupant' in call) positions.set(occupantId, call.occupant);
      const state = placedState(
        movementTranscript.seed,
        positions,
        call.difficultCells,
        call.case === 'difficult_terrain' ? 1 : undefined,
      );
      const prototype = arenaPathCost(state, actorId, call.destination, call.maximumFeet);
      const canonical = canonicalEngineQueryPort.path(state, {
        actorId,
        destination: call.destination,
        movement: call.movement,
        ...(call.movement === 'normal' ? { maximumFeet: call.maximumFeet } : {}),
      });

      if (call.case === 'normal_move') {
        // Two ordinary five-foot entries: 2 * 5 = 10 feet.
        expect(prototype?.cost).toBe(10);
        expect(canonical).toMatchObject({ legal: true, costFeet: 10, budgetFeet: 30 });
      } else if (call.case === 'difficult_terrain') {
        // A one-row board forces two difficult entries: 2 * (5 * 2) = 20 feet.
        expect(prototype?.cost).toBe(20);
        expect(canonical).toMatchObject({ legal: true, costFeet: 20, budgetFeet: 30 });
      } else if (call.case === 'dash') {
        // Seven ordinary entries cost 35 feet; Dash supplies the second 30-foot budget.
        expect(prototype?.cost).toBe(35);
        expect(canonical).toMatchObject({ legal: true, costFeet: 35, budgetFeet: 60 });
      } else {
        // A hostile living creature occupies the requested endpoint.
        expect(prototype).toBeNull();
        expect(canonical).toEqual({ legal: false, code: 'destination_unreachable' });
      }
      expect(canonical.legal ? canonical.costFeet : null).toBe(prototype?.cost ?? null);
    }
  });

  it('preserves hand-computed melee reach and thrown normal range', () => {
    const actorId = combatantId(reachTranscript.actorId);
    const targetId = combatantId(reachTranscript.targetId);
    for (const call of reachTranscript.calls) {
      const state = placedState(reachTranscript.seed, new Map<CombatantId, GridCell>([
        [actorId, call.actor],
        [targetId, call.target],
      ]));
      const prototype = arenaReachCheck(state, actorId, targetId, call.actionId);
      const canonical = canonicalEngineQueryPort.reach(state, {
        actorId,
        targetId,
        actionId: call.actionId,
      });
      if (call.case === 'melee_reach') {
        // Two grid intervals are 10 feet, exactly the Bugbear Warrior's Grab reach.
        expect(prototype).toEqual({ legal: true, distanceFeet: 10, rangeFeet: 10 });
        expect(canonical).toEqual({ legal: true, distanceFeet: 10, rangeFeet: 10 });
      } else {
        // Four grid intervals are 20 feet, exactly Light Hammer's normal thrown range.
        expect(prototype).toEqual({ legal: true, distanceFeet: 20, rangeFeet: 20 });
        expect(canonical).toEqual({ legal: true, distanceFeet: 20, rangeFeet: 20 });
      }
    }
  });

  it('consumes the frozen intent input while deriving fallback behavior independently', () => {
    const actorId = combatantId(intentTranscript.actorId);
    const targetId = combatantId(intentTranscript.targetId);
    const state = placedState(intentTranscript.seed, new Map<CombatantId, GridCell>([
      [actorId, intentTranscript.actor],
      [targetId, intentTranscript.target],
    ]));

    const prototype = resolvePrototypeIntent(state, actorId, intentTranscript.intent);
    const resolved = pureIntentResolver.resolve(state, {
      actorId,
      choice: {
        kind: 'attack',
        actionId: 'grab',
        target: { kind: 'combatant', combatantId: targetId },
      },
      movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'accept_if_needed' },
      engagement: { stance: 'close_to_melee' },
      fallback: {
        choice: {
          kind: 'attack',
          actionId: 'light-hammer',
          target: { kind: 'combatant', combatantId: targetId },
        },
        movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'accept_if_needed' },
        engagement: { stance: 'maintain_range' },
      },
    });

    // Grab reaches 10 feet, not the hand-computed 20; Light Hammer reaches 20 with zero movement.
    expect(prototype).toEqual({ legal: true, resolvedPath: [], finalPosition: { column: 0, row: 0 } });
    expect(resolved).toMatchObject({
      valid: true,
      selectedBranch: 'fallback',
      mechanics: { movementCostFeet: 0, actionId: 'light-hammer', targetId },
    });
  });
});
