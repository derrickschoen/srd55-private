import { describe, expect, it } from 'vitest';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import {
  ACTOR_KNOWLEDGE_POLICY,
  projectActorKnowledge,
  type ActorTargetKnowledge,
} from '../../../src/vtt/intel/actor-knowledge';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

function encounter(overrides: Partial<Pick<
  Parameters<typeof createEncounter>[0],
  'blockedCells' | 'foggedCells'
>> = {}): {
  readonly state: EncounterState;
  readonly actor: ReturnType<typeof monsterProfile>;
  readonly target: ReturnType<typeof playerProfile>;
} {
  const actor = monsterProfile('actor-knowledge-monster');
  const target = playerProfile('actor-knowledge-player');
  return {
    actor,
    target,
    state: createEncounter({
      bounds: { columns: 5, rows: 1 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0), placedToken(target, 2)],
      ...overrides,
    }),
  };
}

function onlyTarget(state: EncounterState, actor: ReturnType<typeof monsterProfile>): ActorTargetKnowledge {
  const projection = projectActorKnowledge(state, actor.id);
  expect(projection.policy).toBe(ACTOR_KNOWLEDGE_POLICY);
  expect(projection.targets).toHaveLength(1);
  const target = projection.targets[0];
  if (target === undefined) throw new Error('Expected exactly one projected target.');
  return target;
}

describe('actor-knowledge-v1', () => {
  it('projects a visible target as perceived with its current position', () => {
    const setup = encounter();

    expect(onlyTarget(setup.state, setup.actor)).toEqual({
      kind: 'perceived',
      targetId: setup.target.id,
      position: { column: 2, row: 0 },
    });
  });

  it('redacts a hidden target rather than exposing its position', () => {
    const setup = encounter();
    const hidden: EncounterState = {
      ...setup.state,
      hiddenCombatants: [{ combatant: setup.target.id, stealthTotal: 18, edition: '2024' }],
    };

    const target = onlyTarget(hidden, setup.actor);
    expect(target).toMatchObject({ kind: 'unknown', targetId: setup.target.id });
    expect('position' in target).toBe(false);
  });

  it('redacts a target in fog even when ordinary detection could see its cell', () => {
    const setup = encounter({ foggedCells: [{ column: 2, row: 0 }] });

    expect(onlyTarget(setup.state, setup.actor)).toMatchObject({
      kind: 'unknown',
      targetId: setup.target.id,
    });
  });

  it('records missing last-seen memory as a typed unresolved basis', () => {
    const setup = encounter();
    const hidden: EncounterState = {
      ...setup.state,
      hiddenCombatants: [{ combatant: setup.target.id, stealthTotal: 18, edition: '2024' }],
    };

    expect(onlyTarget(hidden, setup.actor)).toEqual({
      kind: 'unknown',
      targetId: setup.target.id,
      lastSeen: {
        status: 'unresolved',
        reason: 'last_seen_position_not_modeled',
      },
    });
  });
});
