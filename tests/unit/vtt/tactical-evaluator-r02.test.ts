import { describe, expect, it } from 'vitest';
import { evaluateMonsterTacticalAttack, type EncounterState } from '../../../src/combat/encounter';
import type { MonsterAttackAction } from '../../../src/combat/statblock';
import { combatantId } from '../../../src/combat/values';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import type { GeneratedRoom } from '../../../src/vtt/room-generator';
import { declareTestInputs } from '../../helpers/test-inputs';

const inputs = declareTestInputs({
  fixtures: ['tests/fixtures/arena-basis-hard/seed-5117009.json'],
});

const FIGHTER = combatantId('combatant:fighter');
const SCOUTS = [
  combatantId('combatant:generated-5117009-monster-3'),
  combatantId('combatant:generated-5117009-monster-5'),
] as const;

function frozenState(): EncounterState {
  return (JSON.parse(inputs.fixtures.readText(
    'tests/fixtures/arena-basis-hard/seed-5117009.json',
  )) as GeneratedRoom).encounter.state;
}

describe('R02-like canonical tactical query', () => {
  it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', () => {
    const state = frozenState();
    const rows = SCOUTS.map((scoutId) => {
      const action = canonicalEngineQueryPort.actions(state, scoutId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === 'longbow');
      if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
      const reach = canonicalEngineQueryPort.reach(state, {
        actorId: scoutId,
        targetId: FIGHTER,
        actionId: action.id,
      });
      const evaluation = canonicalEngineQueryPort.tacticalAttack(
        state,
        scoutId,
        FIGHTER,
        action.id,
      );
      if (evaluation === null) throw new Error(`${scoutId} tactical evaluation is absent.`);
      // The executor-side state adapter must produce the exact same canonical verdict.
      expect(evaluateMonsterTacticalAttack(state, action, scoutId, FIGHTER)).toEqual(evaluation);
      return {
        scoutId,
        minimumMovementFeet: reach.legal ? 0 : null,
        range: evaluation.range,
        rollMode: evaluation.rollMode,
        probabilities: evaluation.probabilities,
        damage: evaluation.damage,
        consequences: evaluation.consequences,
        policy: evaluation.policy,
      };
    });

    for (const row of rows) {
      // Fixture positions differ by 18 columns and at most 3 rows: Chebyshev 18 * 5 = 90 ft.
      expect(row.minimumMovementFeet).toBe(0);
      expect(row.range).toEqual({
        status: 'resolved', distanceFeet: 90, band: 'normal', legal: true,
      });
      expect(row.rollMode).toMatchObject({
        mode: 'normal',
        reasons: ['unconscious_advantage', 'prone_ranged_disadvantage'],
      });
      // +4 vs AC 18 hits on 14..20: 7/20, with 1/20 critical.
      expect(row.probabilities).toEqual({
        status: 'resolved', hit: 0.35, critical: 0.05, miss: 0.65,
      });
      // Longbow 1d8+2 averages 6.5; critical 2d8+2 averages 11.
      expect(row.damage).toEqual({
        status: 'resolved',
        normalHitAverage: 6.5,
        criticalHitAverage: 11,
        expectedDamage: 2.5,
      });
      expect(row.consequences).toEqual({
        deathFailureOnHit: true,
        failuresOnHit: 1,
        failuresOnCritical: 2,
        automaticCriticalOnHit: false,
        automaticCriticalMaximumDistanceFeet: 5,
      });
      expect(row.policy).toBe('tactical-evaluator-v1');
    }
  });
});
