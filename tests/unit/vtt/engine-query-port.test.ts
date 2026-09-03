import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import type { GridCell } from '../../../src/combat/grid';
import { combatantId, statblockId, type CombatantId } from '../../../src/combat/values';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { availableEngineActorOptions, pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
import { engineOptionId } from '../../../src/vtt/turn-proposal';
import { generateRoom } from '../../../src/vtt/room-generator';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { engineActorOptions } from '../../../src/vtt/turn-option-registry';

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
  return freshMonsterPlanningState({
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
  });
}

describe('canonical engine query port', () => {
  it('offers a modeled base attack despite an unresolved rider and partitions idle Disengage', () => {
    const generated = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 5, row: 0 }],
    ]));
    const state: EncounterState = {
      ...generated,
      combatants: generated.combatants.map((combatant) => combatant.profile.id === ACTOR_ID && combatant.profile.kind === 'monster'
        ? { ...combatant, profile: { ...combatant.profile, statblockId: statblockId('statblock:black-pudding') } }
        : combatant),
    };

    expect(canonicalEngineQueryPort.actions(state, ACTOR_ID).map((action) => action.id))
      .toEqual(['dissolving-pseudopod']);
    const options = availableEngineActorOptions(state, ACTOR_ID);
    expect(options.map(({ label }) => label)).toEqual([
      'Dash',
      'Dissolving Pseudopod -> combatant:fighter',
      'Dodge',
      'End Turn',
    ]);
    expect(options.flatMap(({ actionSlots }) => actionSlots.map(({ use }) => use.kind))).toEqual([
      'dash', 'attack', 'dodge', 'end_turn',
    ]);
    expect(engineActorOptions(state, ACTOR_ID).humanOnly).toContainEqual(expect.objectContaining({
      label: 'Disengage',
      noModeledEffect: { kind: 'disengage_without_movement', action: 'disengage' },
    }));
  });

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

  it('withholds Dash when an enclosed actor has no endpoint closer to its target', () => {
    const generated = placedState(
      SEED,
      new Map<CombatantId, GridCell>([
        [ACTOR_ID, { column: 0, row: 0 }],
        [TARGET_ID, { column: 20, row: 0 }],
      ]),
      [],
      1,
    );
    const state: EncounterState = {
      ...generated,
      blockedCells: [{ column: 1, row: 0 }],
    };

    expect(canonicalEngineQueryPort.approach(state, {
      actorId: ACTOR_ID,
      target: { column: 20, row: 0 },
      movement: 'dash',
      maximumFeet: 60,
    })).toEqual({ legal: false, code: 'destination_unreachable' });
    expect(availableEngineActorOptions(state, ACTOR_ID).map(({ label }) => label))
      .toEqual(['Dodge', 'End Turn']);
    expect(engineActorOptions(state, ACTOR_ID).humanOnly).toContainEqual(expect.objectContaining({
      label: 'Disengage',
      noModeledEffect: { kind: 'disengage_without_movement', action: 'disengage' },
    }));
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
        expect(canonical).toEqual({
          legal: true,
          distanceFeet: 10,
          rangeFeet: 10,
          rangeBand: 'melee',
          normalRangeFeet: 10,
          longRangeFeet: null,
        });
      } else {
        // Four grid intervals are 20 feet, exactly Light Hammer's normal thrown range.
        expect(canonical).toEqual({
          legal: true,
          distanceFeet: 20,
          rangeFeet: 20,
          rangeBand: 'normal',
          normalRangeFeet: 20,
          longRangeFeet: 60,
        });
      }
    }
  });

  it('keeps normal and long range distinct in the authoritative reach query', () => {
    const state = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 5, row: 0 }],
    ]));
    // Five grid intervals are 25 feet: beyond 20 normal, within 60 long.
    expect(canonicalEngineQueryPort.reach(state, {
      actorId: ACTOR_ID,
      targetId: TARGET_ID,
      actionId: 'light-hammer',
    })).toEqual({
      legal: true,
      distanceFeet: 25,
      rangeFeet: 20,
      rangeBand: 'long',
      normalRangeFeet: 20,
      longRangeFeet: 60,
    });
  });

  it('derives fallback behavior independently from fixed geometry', () => {
    const state = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 4, row: 0 }],
    ]));

    const fallback = availableEngineActorOptions(state, ACTOR_ID).find((option) =>
      option.actionSlots.some((slot) => slot.use.kind === 'attack' && slot.use.actionId === 'light-hammer'));
    if (fallback === undefined) throw new Error('Fixture omitted the Light Hammer option.');
    const resolved = pureTurnProposalResolver.resolve(state, {
      actorId: ACTOR_ID, expectedRevision: state.revision,
      primaryOptionId: engineOptionId('option:missing-grab'), fallbackOptionId: fallback.optionId,
      reason: 'Exercise the engine query proposal fixture.',
      overrideJustification: null,
    });

    // A missing revision-bound primary falls through to the offered Light Hammer option at 20 feet.
    expect(resolved).toMatchObject({
      valid: true,
      selectedBranch: 'fallback',
      mechanics: { movementCostFeet: 0, actionSlots: [{ actionId: 'light-hammer', targetIds: [TARGET_ID] }] },
    });
  });

  it('moves into melee before attacking when the declared stance and willingness permit it', () => {
    const state = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 4, row: 0 }],
    ]));

    const grab = availableEngineActorOptions(state, ACTOR_ID).find((option) =>
      option.actionSlots.some((slot) => slot.use.kind === 'attack' && slot.use.actionId === 'grab'));
    if (grab === undefined) throw new Error('Fixture omitted the Grab option.');
    const resolved = pureTurnProposalResolver.resolve(state, {
      actorId: ACTOR_ID, expectedRevision: state.revision,
      primaryOptionId: grab.optionId, fallbackOptionId: null,
      reason: 'Exercise the engine query grab fixture.', overrideJustification: null,
    });

    expect(resolved).toMatchObject({
      valid: true,
      selectedBranch: 'primary',
      mechanics: { movementCostFeet: 10, actionSlots: [{ actionId: 'grab', targetIds: [TARGET_ID] }] },
    });
  });

  it('refuses a declared dead target with a distinct code', () => {
    const placed = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 1, row: 0 }],
    ]));
    const state: EncounterState = {
      ...placed,
      combatants: placed.combatants.map((candidate) => candidate.profile.id === TARGET_ID
        ? { ...candidate, hitPoints: 0, life: 'dead', deathAt: { round: 1, initiativeIndex: 0 } }
        : candidate),
    };

    expect(pureTurnProposalResolver.resolve(state, {
      actorId: ACTOR_ID, expectedRevision: state.revision,
      primaryOptionId: engineOptionId('option:dead-target-grab'), fallbackOptionId: null,
      reason: 'Exercise the engine query resolution fixture.',
      overrideJustification: null,
    })).toEqual({
      valid: false,
      selectedBranch: 'none',
      refusals: [{
        branch: 'primary',
        code: 'OPTION_NOT_OFFERED',
        summary: `${ACTOR_ID}: primary option was not offered at revision ${String(state.revision)}`,
      }],
    });
  });
});
