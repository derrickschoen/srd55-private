import { describe, expect, it } from 'vitest';
import { combatantId } from '../../../src/combat/values';
import { exactRational } from '../../../src/vtt/intel/contracts';
import {
  classifyWastedTurn,
  compareTeamPlanV1,
  compareTeamPlanV2,
  renderTeamPlanFrontier,
  scoreTeamPlanEvaluations,
  teamCommonVector,
  teamPlanVector,
  type ResolvedTeamPlanEvaluation,
  type TeamPlanCandidate,
  type TeamPlanEvaluation,
  type WastedTurnMarker,
} from '../../../src/vtt/intel/team-scorer';
import { engineOptionId, type EngineActorOption } from '../../../src/vtt/turn-proposal';

function candidate(candidateId: string): TeamPlanCandidate {
  return { candidateId, label: `Plan ${candidateId}`, proposals: [] };
}

function resolved(
  candidateId: string,
  metrics: {
    readonly lethality: readonly [number, number];
    readonly objectiveProgress: number;
    readonly resourceConservation: number;
    readonly dyingPcRemoval: readonly [number, number];
    readonly wastedTurn: number;
  },
  markers: readonly WastedTurnMarker[] = [],
): ResolvedTeamPlanEvaluation {
  return {
    status: 'resolved',
    candidate: candidate(candidateId),
    family: 'legacy',
    commonVector: teamCommonVector({
      netActionEquivalents: exactRational(metrics.objectiveProgress, 1),
      dyingPcRemoval: exactRational(...metrics.dyingPcRemoval),
      wastedTurn: exactRational(metrics.wastedTurn, 1),
    }),
    outcomes: [],
    vector: teamPlanVector({
      lethality: exactRational(...metrics.lethality),
      objectiveProgress: exactRational(metrics.objectiveProgress, 1),
      resourceConservation: exactRational(metrics.resourceConservation, 1),
      dyingPcRemoval: exactRational(...metrics.dyingPcRemoval),
      wastedTurn: exactRational(metrics.wastedTurn, 1),
    }),
    markers,
  };
}

describe('team plan Pareto scorer', () => {
  it('keeps V2 byte-identical to V1 for every legacy pair', () => {
    const legacy = [
      resolved('alpha', {
        lethality: [3, 4], objectiveProgress: 2, resourceConservation: 1,
        dyingPcRemoval: [0, 1], wastedTurn: 0,
      }),
      resolved('beta', {
        lethality: [1, 2], objectiveProgress: 1, resourceConservation: 2,
        dyingPcRemoval: [0, 1], wastedTurn: 0,
      }),
      resolved('tradeoff', {
        lethality: [1, 1], objectiveProgress: 0, resourceConservation: 0,
        dyingPcRemoval: [1, 1], wastedTurn: 1,
      }),
    ];
    for (const left of legacy) {
      for (const right of legacy) {
        expect(compareTeamPlanV2(left, right)).toEqual(compareTeamPlanV1(left, right));
      }
    }
  });

  it('removes a plan that is hand-computed worse on three axes and no better on the rest', () => {
    const winning = resolved('winning', {
      lethality: [3, 4], objectiveProgress: 2, resourceConservation: 1,
      dyingPcRemoval: [0, 1], wastedTurn: 0,
    });
    const dominated = resolved('dominated', {
      lethality: [1, 2], objectiveProgress: 1, resourceConservation: 2,
      dyingPcRemoval: [0, 1], wastedTurn: 0,
    });

    const report = scoreTeamPlanEvaluations([dominated, winning]);

    expect(report.policy).toBe('team-scorer-v1');
    expect(report.frontier.map((entry) => entry.candidate.candidateId)).toEqual(['winning']);
    expect(report.removed).toHaveLength(1);
    expect(report.removed[0]).toMatchObject({
      candidate: { candidate: { candidateId: 'dominated' } },
      dominatedBy: { candidate: { candidateId: 'winning' } },
      comparison: {
        relation: 'left_dominates',
        perMetric: {
          lethality: 'left_better',
          objective_progress: 'left_better',
          resource_conservation: 'left_better',
          dying_pc_removal: 'equal',
          wasted_turn: 'equal',
        },
      },
    });
  });

  it('keeps the otherwise-identical plan that removes a dying PC', () => {
    const ignoresDyingPc = resolved('ignore-dying-pc', {
      lethality: [1, 2], objectiveProgress: 1, resourceConservation: 0,
      dyingPcRemoval: [0, 1], wastedTurn: 0,
    });
    const removesDyingPc = resolved('remove-dying-pc', {
      lethality: [1, 2], objectiveProgress: 1, resourceConservation: 0,
      dyingPcRemoval: [1, 2], wastedTurn: 0,
    });

    const report = scoreTeamPlanEvaluations([ignoresDyingPc, removesDyingPc]);

    expect(report.frontier.map((entry) => entry.candidate.candidateId))
      .toEqual(['remove-dying-pc']);
    expect(report.removed[0]?.comparison.perMetric.dying_pc_removal).toBe('left_better');
  });

  it('dominates a zero-feet Dash with an attack and renders the typed wasted-turn reason', () => {
    const dashOption: EngineActorOption = {
      actorId: combatantId('combatant:blocked-dasher'),
      optionId: engineOptionId('option:dash-zero-feet'),
      revision: 1,
      label: 'Dash 0 feet',
      movement: {
        preference: { willingness: 'freely', opportunityRisk: 'accept_if_needed' },
        engagement: { stance: 'close_to_melee' },
      },
      actionSlots: [{ slot: 'main', use: { kind: 'dash' } }],
      resourceCostLabels: [],
    };
    const marker = classifyWastedTurn(dashOption, 0, true);
    if (marker === null) throw new Error('Zero-feet Dash was not classified as a wasted turn.');
    expect(classifyWastedTurn(dashOption, 0, false)).toBeNull();
    const zeroFeetDash = resolved('zero-feet-dash', {
      lethality: [0, 1], objectiveProgress: 0, resourceConservation: 0,
      dyingPcRemoval: [0, 1], wastedTurn: 1,
    }, [marker]);
    const attack = resolved('attack', {
      lethality: [1, 4], objectiveProgress: 1, resourceConservation: 0,
      dyingPcRemoval: [0, 1], wastedTurn: 0,
    });

    const report = scoreTeamPlanEvaluations([zeroFeetDash, attack]);

    expect(report.frontier.map((entry) => entry.candidate.candidateId)).toEqual(['attack']);
    expect(report.removed[0]?.comparison.perMetric.wasted_turn).toBe('left_better');
    expect(renderTeamPlanFrontier(report)).toMatchObject({
      removed: [{
        candidate_id: 'zero-feet-dash',
        dominated_by_candidate_id: 'attack',
        better_metrics: expect.arrayContaining(['lethality', 'objective_progress', 'wasted_turn']),
        dominance_vector: {
          wasted_turn: {
            exact: { numerator: 1, denominator: 1 },
            objective: 'minimize',
          },
        },
        markers: [{
          kind: 'wasted_turn',
          actor_id: 'combatant:blocked-dasher',
          option_id: 'option:dash-zero-feet',
          reason: 'zero_feet_dash',
        }],
      }],
    });
  });

  it('retains an unresolved candidate in the frontier', () => {
    const resolvedAlternative = resolved('resolved', {
      lethality: [1, 1], objectiveProgress: 3, resourceConservation: 0,
      dyingPcRemoval: [1, 1], wastedTurn: 0,
    });
    const unresolved: TeamPlanEvaluation = {
      status: 'unresolved',
      candidate: candidate('unresolved-spell-plan'),
      unresolvedMetrics: ['lethality'],
      reasons: ['option_outcome_unresolved'],
    };

    const report = scoreTeamPlanEvaluations([resolvedAlternative, unresolved]);

    expect(report.frontier.map((entry) => entry.candidate.candidateId))
      .toEqual(['resolved', 'unresolved-spell-plan']);
    expect(report.removed).toEqual([]);
    expect(report.frontierResolution).toBe('contains_unresolved');
  });

  it('renders progressively smaller typed frontier representations for byte-pressure trimming', () => {
    const retained = resolved('retained', {
      lethality: [1, 2], objectiveProgress: 1, resourceConservation: 0,
      dyingPcRemoval: [0, 1], wastedTurn: 0,
    });
    const removed = resolved('removed', {
      lethality: [1, 4], objectiveProgress: 0, resourceConservation: 1,
      dyingPcRemoval: [0, 1], wastedTurn: 1,
    }, [{
      kind: 'wasted_turn',
      actorId: combatantId('combatant:trimmed-actor'),
      optionId: engineOptionId('option:trimmed-waste'),
      reason: 'no_effect_turn',
    }]);
    const report = scoreTeamPlanEvaluations([removed, retained]);

    expect(renderTeamPlanFrontier(report, 'candidate_summary')).toEqual({
      policy: 'team-scorer-v1',
      frontier_resolution: 'fully_resolved',
      detail_level: 'candidate_summary',
      candidates: [{
        candidate_id: 'retained', label: 'Plan retained', status: 'resolved', wasted_turn_count: 0,
      }],
      removed: [{
        candidate_id: 'removed', dominated_by_candidate_id: 'retained',
        better_metrics: ['lethality', 'objective_progress', 'resource_conservation', 'wasted_turn'],
        wasted_turn_count: 1,
      }],
    });
    expect(renderTeamPlanFrontier(report, 'summary')).toEqual({
      policy: 'team-scorer-v1',
      frontier_resolution: 'fully_resolved',
      detail_level: 'summary',
      frontier_candidate_ids: ['retained'],
      removed_candidate_ids: ['removed'],
    });
    expect(renderTeamPlanFrontier(report, 'omitted')).toEqual({
      policy: 'team-scorer-v1',
      frontier_resolution: 'fully_resolved',
      detail_level: 'omitted',
      frontier_candidate_count: 1,
      removed_candidate_count: 1,
      reason: 'context_size_limit',
    });
  });
});
