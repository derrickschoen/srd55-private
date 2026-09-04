import { describe, expect, it } from 'vitest';
import { combatantId } from '../../../src/combat/values';
import { TACTICAL_EVALUATOR_POLICY } from '../../../src/combat/tactical-evaluator';
import { ENGINE_FAILURE_MODES_POLICY } from '../../../src/vtt/engine-failure-modes';
import {
  DM_INTEL_CAPTURE_POLICY,
  DM_INTEL_QUERY_POLICY,
  DM_TURN_INTEL_POLICY,
  type DmTargetIntelRow,
} from '../../../src/vtt/dm-tactical-intel';
import { buildDecisionTrace, type DecisionTraceRow } from '../../../src/vtt/decision-trace';
import { engineOptionId } from '../../../src/vtt/turn-proposal';

const ACTOR = combatantId('combatant:trace-monster');
const TARGET = combatantId('combatant:trace-target');
const CHOSEN = engineOptionId('option:trace:chosen');
const BETTER = engineOptionId('option:trace:better');

function intelRow(optionId: typeof CHOSEN, hitProbability: number, expectedDamage: number): DmTargetIntelRow {
  return {
    policy: DM_TURN_INTEL_POLICY,
    evaluatorPolicy: TACTICAL_EVALUATOR_POLICY,
    actorId: ACTOR,
    targetId: TARGET,
    optionId,
    actionId: 'trace-attack',
    attackCount: 1,
    kind: 'offense',
    visible: true,
    cover: 'none',
    distanceFeet: 5,
    rangeBand: 'melee',
    rangeLegal: true,
    rollMode: 'normal',
    rollModeReasons: [],
    hitProbability,
    criticalProbability: 0.05,
    expectedDamage,
    deathFailureOnHit: false,
    failuresOnHit: 0,
    failuresOnCritical: 0,
    automaticCriticalMaximumDistanceFeet: null,
    minimumMovementFeet: 0,
    unresolvedReasons: [],
    omittedRiders: [],
    featureSupportFlags: [],
  };
}

describe('decision trace', () => {
  it('joins the selected intel row and its better alternative (mutation: trace helper reads the wrong option)', () => {
    const resolutionSummary = { optionId: CHOSEN, movementFeet: 5, actionSlots: [] } as const;
    const row: DecisionTraceRow = {
      authorizedPlan: [{
        actorId: ACTOR,
        reason: 'Close on the wounded target before it can receive healing.',
        resolutionSummary,
      }],
      engineIntel: {
        policy: DM_INTEL_CAPTURE_POLICY,
        policyVersions: {
          evaluator: TACTICAL_EVALUATOR_POLICY,
          renderer: DM_TURN_INTEL_POLICY,
          query: DM_INTEL_QUERY_POLICY,
          capture: DM_INTEL_CAPTURE_POLICY,
          initiative: 'initiative-intel-v1',
          failureModes: ENGINE_FAILURE_MODES_POLICY,
        },
        actors: [{
          actorId: ACTOR,
          offeredOptionIds: [CHOSEN, BETTER],
          rows: [intelRow(CHOSEN, 0.45, 6), intelRow(BETTER, 0.7, 11)],
        }],
      },
    };

    expect(buildDecisionTrace(row)).toEqual([{
      actorId: ACTOR,
      reason: 'Close on the wounded target before it can receive healing.',
      chosenOptionId: CHOSEN,
      engineExpected: {
        chosen: { optionId: CHOSEN, hitProbability: 0.45, expectedDamage: 6 },
        better: { optionId: BETTER, hitProbability: 0.7, expectedDamage: 11 },
      },
      executed: resolutionSummary,
    }]);
  });
});
