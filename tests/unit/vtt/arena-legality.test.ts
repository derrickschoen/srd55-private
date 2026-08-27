import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import type { GridCell } from '../../../src/combat/grid';
import type { MonsterAttackAction } from '../../../src/combat/statblock';
import type { CombatantId } from '../../../src/combat/values';
import {
  arenaMonsterActions,
  arenaPathCost,
  declareArenaIntent,
  validateArenaPlan,
} from '../../../src/vtt/arena-legality';
import type { RoundPlan } from '../../../src/vtt/dm-bridge/round-plan-contract';
import { generateRoom } from '../../../src/vtt/room-generator';
import { validateArenaPlan as validateThroughArenaHarness } from '../../../tools/ai-dm-arena';

function fixtureActors(): {
  readonly state: EncounterState;
  readonly actor: CombatantId;
  readonly ally: CombatantId;
  readonly target: CombatantId;
  readonly actions: readonly MonsterAttackAction[];
} {
  const state = generateRoom(3_943_001).encounter.state;
  const monsters = state.combatants.filter((subject) => subject.profile.kind === 'monster');
  const target = state.combatants.find((subject) => subject.profile.kind === 'player_character');
  const actor = monsters[1];
  const ally = monsters[0];
  if (actor === undefined || ally === undefined || target === undefined) {
    throw new Error('Frozen arena fixture is missing the legality actors.');
  }
  const actions = arenaMonsterActions(state, actor.profile.id)
    .filter((action): action is MonsterAttackAction => action.kind === 'attack');
  if (actions.length < 2) throw new Error('Legality actor requires melee and ranged attacks.');
  return {
    state,
    actor: actor.profile.id,
    ally: ally.profile.id,
    target: target.profile.id,
    actions,
  };
}

function positionedState(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
  actorPosition: GridCell,
  targetPosition: GridCell,
): EncounterState {
  return {
    ...state,
    blockedCells: [],
    worldObjects: [],
    environment: {
      ...state.environment,
      difficultTerrainRegions: [],
      movementRegions: [],
    },
    tokens: state.tokens.flatMap((token) => {
      if (token.combatantId === actor) return [{ ...token, position: actorPosition }];
      if (token.combatantId === target) return [{ ...token, position: targetPosition }];
      return [];
    }),
  };
}

describe('shared arena legality', () => {
  it('resolves a reachable intent to a deterministic path without mutating state', () => {
    const fixture = fixtureActors();
    const state = positionedState(fixture.state, fixture.actor, fixture.target, { column: 1, row: 1 }, { column: 4, row: 1 });
    const melee = fixture.actions.find((action) => action.delivery.kind === 'melee');
    if (melee === undefined) throw new Error('Fixture actor is missing its melee attack.');
    const before = JSON.stringify(state);

    const result = declareArenaIntent(state, fixture.actor, {
      action: melee.id,
      targetId: fixture.target,
      maxMovementFeet: 10,
      acceptMelee: true,
      fallback: null,
    });

    expect(result).toMatchObject({ legal: true });
    if (!result.legal) throw new Error(result.refusals.join('\n'));
    expect(result.resolvedPath).toHaveLength(1);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('uses a ranged fallback when the movement-capped melee primary cannot reach', () => {
    const fixture = fixtureActors();
    const state = positionedState(fixture.state, fixture.actor, fixture.target, { column: 1, row: 1 }, { column: 5, row: 1 });
    const melee = fixture.actions.find((action) => action.delivery.kind === 'melee');
    const ranged = fixture.actions.find((action) => action.delivery.kind === 'melee_or_ranged');
    if (melee === undefined || ranged === undefined) throw new Error('Fixture actor attack mix changed.');

    const result = declareArenaIntent(state, fixture.actor, {
      action: melee.id,
      targetId: fixture.target,
      maxMovementFeet: 0,
      acceptMelee: true,
      fallback: {
        action: ranged.id,
        targetId: fixture.target,
        maxMovementFeet: 0,
        acceptMelee: false,
      },
    });

    expect(result).toEqual({ legal: true, resolvedPath: [], finalPosition: { column: 1, row: 1 } });
  });

  it('rejects an occupied path destination', () => {
    const fixture = fixtureActors();
    const occupied = fixture.state.tokens.find((token) => token.combatantId === fixture.target)?.position;
    if (occupied === undefined) throw new Error('Fixture target is not placed.');
    expect(arenaPathCost(fixture.state, fixture.actor, occupied)).toBeNull();
  });

  it('rejects side-confused intents before path resolution', () => {
    const fixture = fixtureActors();
    const action = fixture.actions[0];
    if (action === undefined) throw new Error('Fixture actor has no attack.');
    const result = declareArenaIntent(fixture.state, fixture.actor, {
      action: action.id,
      targetId: fixture.ally,
      maxMovementFeet: 30,
      acceptMelee: true,
      fallback: null,
    });
    expect(result).toEqual({
      legal: false,
      refusals: [`${fixture.actor}: target is on the actor's side`],
    });
  });

  it('keeps the arena harness and extracted validator equivalent', () => {
    const fixture = fixtureActors();
    const plan: RoundPlan = {
      kind: 'round_plan',
      protocolVersion: 2,
      encounterId: 'encounter:equivalence' as RoundPlan['encounterId'],
      requestId: 'request:equivalence',
      expectedRevision: fixture.state.revision,
      round: 1,
      monsters: fixture.state.combatants.flatMap((subject) =>
        subject.profile.kind === 'monster' && subject.life !== 'dead'
          ? [{
              monsterId: subject.profile.id,
              program: {
                kind: 'action' as const,
                action: {
                  kind: 'attack' as const,
                  target: { kind: 'nearest_enemy' as const },
                },
              },
            }]
          : []),
    };
    expect(validateThroughArenaHarness(plan, fixture.state)).toEqual(
      validateArenaPlan(plan, fixture.state),
    );
  });
});
