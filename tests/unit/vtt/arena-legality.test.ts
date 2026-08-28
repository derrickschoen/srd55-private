import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import { validateArenaPlan } from '../../../src/vtt/arena-legality';
import type { RoundPlan } from '../../../src/vtt/dm-bridge/round-plan-contract';
import { generateRoom } from '../../../src/vtt/room-generator';
import { validateArenaPlan as validateThroughArenaHarness } from '../../../tools/ai-dm-arena';

function fixtureState(): EncounterState {
  const state = generateRoom(3_943_001).encounter.state;
  if (!state.combatants.some((subject) => subject.profile.kind === 'monster')) {
    throw new Error('Frozen arena fixture is missing its monster actors.');
  }
  return state;
}

describe('shared arena legality', () => {
  it('keeps the arena harness and extracted validator equivalent', () => {
    const state = fixtureState();
    const plan: RoundPlan = {
      kind: 'round_plan',
      protocolVersion: 2,
      encounterId: 'encounter:equivalence' as RoundPlan['encounterId'],
      requestId: 'request:equivalence',
      expectedRevision: state.revision,
      round: 1,
      monsters: state.combatants.flatMap((subject) =>
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
    expect(validateThroughArenaHarness(plan, state)).toEqual(
      validateArenaPlan(plan, state),
    );
  });
});
