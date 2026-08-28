import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import type { GridCell } from '../../../src/combat/grid';
import { combatantId, type CombatantId } from '../../../src/combat/values';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { pureIntentResolver } from '../../../src/vtt/intent-resolver';
import { generateRoom } from '../../../src/vtt/room-generator';

const SEED = 3_943_001;
const ACTOR_ID = combatantId('combatant:generated-3943001-monster-2');
const TARGET_ID = combatantId('combatant:fighter');

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
        : [{ id: 'engine-query-difficult', cells: difficultCells }],
      movementRegions: [],
    },
    tokens: state.tokens.flatMap((token) => {
      const position = positions.get(token.combatantId);
      return position === undefined ? [] : [{ ...token, position }];
    }),
  };
}

describe('canonical engine query port', () => {
  it('returns independently hand-computed path legality and movement costs', () => {
    const occupantId = TARGET_ID;
    const calls = [
      { case: 'normal_move', actor: { column: 0, row: 0 }, destination: { column: 2, row: 0 }, difficultCells: [], maximumFeet: 30, movement: 'normal' },
      { case: 'difficult_terrain', actor: { column: 0, row: 0 }, destination: { column: 2, row: 0 }, difficultCells: [{ column: 1, row: 0 }, { column: 2, row: 0 }], maximumFeet: 30, movement: 'normal' },
      { case: 'dash', actor: { column: 0, row: 0 }, destination: { column: 7, row: 0 }, difficultCells: [], maximumFeet: 60, movement: 'dash' },
      { case: 'occupied_endpoint', actor: { column: 0, row: 0 }, occupant: { column: 2, row: 0 }, destination: { column: 2, row: 0 }, difficultCells: [], maximumFeet: 30, movement: 'normal' },
    ] as const;
    for (const call of calls) {
      const positions = new Map<CombatantId, GridCell>([[ACTOR_ID, call.actor]]);
      if ('occupant' in call) positions.set(occupantId, call.occupant);
      const state = placedState(
        SEED,
        positions,
        call.difficultCells,
        call.case === 'difficult_terrain' ? 1 : undefined,
      );
      const canonical = canonicalEngineQueryPort.path(state, {
        actorId: ACTOR_ID,
        destination: call.destination,
        movement: call.movement,
        ...(call.movement === 'normal' ? { maximumFeet: call.maximumFeet } : {}),
      });

      if (call.case === 'normal_move') {
        // Two ordinary five-foot entries: 2 * 5 = 10 feet.
        expect(canonical).toMatchObject({ legal: true, costFeet: 10, budgetFeet: 30 });
      } else if (call.case === 'difficult_terrain') {
        // A one-row board forces two difficult entries: 2 * (5 * 2) = 20 feet.
        expect(canonical).toMatchObject({ legal: true, costFeet: 20, budgetFeet: 30 });
      } else if (call.case === 'dash') {
        // Seven ordinary entries cost 35 feet; Dash supplies the second 30-foot budget.
        expect(canonical).toMatchObject({ legal: true, costFeet: 35, budgetFeet: 60 });
      } else {
        // A hostile living creature occupies the requested endpoint.
        expect(canonical).toEqual({ legal: false, code: 'destination_unreachable' });
      }
    }
  });

  it('returns independently hand-computed melee reach and thrown normal range', () => {
    const calls = [
      { case: 'melee_reach', actionId: 'grab', actor: { column: 0, row: 0 }, target: { column: 2, row: 0 } },
      { case: 'thrown_range', actionId: 'light-hammer', actor: { column: 0, row: 0 }, target: { column: 4, row: 0 } },
    ] as const;
    for (const call of calls) {
      const state = placedState(SEED, new Map<CombatantId, GridCell>([
        [ACTOR_ID, call.actor],
        [TARGET_ID, call.target],
      ]));
      const canonical = canonicalEngineQueryPort.reach(state, {
        actorId: ACTOR_ID,
        targetId: TARGET_ID,
        actionId: call.actionId,
      });
      if (call.case === 'melee_reach') {
        // Two grid intervals are 10 feet, exactly the Bugbear Warrior's Grab reach.
        expect(canonical).toEqual({ legal: true, distanceFeet: 10, rangeFeet: 10 });
      } else {
        // Four grid intervals are 20 feet, exactly Light Hammer's normal thrown range.
        expect(canonical).toEqual({ legal: true, distanceFeet: 20, rangeFeet: 20 });
      }
    }
  });

  it('derives fallback behavior independently from fixed geometry', () => {
    const state = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 4, row: 0 }],
    ]));

    const resolved = pureIntentResolver.resolve(state, {
      actorId: ACTOR_ID,
      choice: {
        kind: 'attack',
        actionId: 'grab',
        target: { kind: 'combatant', combatantId: TARGET_ID },
      },
      movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'accept_if_needed' },
      engagement: { stance: 'close_to_melee' },
      fallback: {
        choice: {
          kind: 'attack',
          actionId: 'light-hammer',
          target: { kind: 'combatant', combatantId: TARGET_ID },
        },
        movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'accept_if_needed' },
        engagement: { stance: 'maintain_range' },
      },
    });

    // Grab reaches 10 feet, not the hand-computed 20; Light Hammer reaches 20 with zero movement.
    expect(resolved).toMatchObject({
      valid: true,
      selectedBranch: 'fallback',
      mechanics: { movementCostFeet: 0, actionId: 'light-hammer', targetId: TARGET_ID },
    });
  });
});
