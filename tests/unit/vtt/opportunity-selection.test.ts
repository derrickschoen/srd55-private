import { describe, expect, it } from 'vitest';
import { combatantId } from '../../../src/combat/values';
import { engineOptionId } from '../../../src/vtt/option-modeling';
import type { EngineOfferableOption } from '../../../src/vtt/turn-proposal';
import { exactRational } from '../../../src/vtt/intel/contracts';
import {
  actionEquivalents,
  OPTION_OUTCOME_POLICY,
} from '../../../src/vtt/intel/option-outcome';
import {
  applyOpportunityDominanceStages,
  compareOpportunityV2,
  CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY,
  selectOpportunity,
  type OpportunityDominanceStage,
  type OpportunityOptionEvaluation,
  type OpportunityOptionKind,
  type OpportunitySelectionPolicy,
  type ResolvedOpportunityOption,
  type UnresolvedOpportunityOption,
} from '../../../src/vtt/intel/opportunity-selection';

interface EvaluationValues {
  readonly kind?: OpportunityOptionKind;
  readonly family?: ResolvedOpportunityOption['family'];
  readonly damage?: number;
  readonly attacks?: number;
  readonly approach?: number;
  readonly actionSlots?: number;
  readonly resources?: number;
  readonly common?: number;
}

function option(id: string): EngineOfferableOption {
  return {
    optionId: engineOptionId(`option:${id}`),
    actorId: combatantId('combatant:synthetic-selector'),
    revision: 7,
    label: `Synthetic ${id}`,
    movement: {
      preference: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
      engagement: { stance: 'hold_position' },
    },
    actionSlots: [],
    resourceCostLabels: [],
    omittedRiders: [],
  };
}

function coordinate(value: number, objective: 'maximize' | 'minimize') {
  return { exact: exactRational(value, 1), objective } as const;
}

function resolved(id: string, values: EvaluationValues = {}): ResolvedOpportunityOption {
  const common = exactRational(values.common ?? 0, 1);
  const zero = actionEquivalents(exactRational(0, 1));
  const net = actionEquivalents(common);
  const family = values.family ?? 'legacy';
  return {
    status: 'resolved',
    option: option(id),
    kind: values.kind ?? 'offense',
    family,
    vector: {
      expected_damage_milli: coordinate(values.damage ?? 0, 'maximize'),
      attack_count: coordinate(values.attacks ?? 0, 'maximize'),
      approach_feet: coordinate(values.approach ?? 0, 'maximize'),
      action_slot_uses: coordinate(values.actionSlots ?? 0, 'maximize'),
      resource_costs: coordinate(values.resources ?? 0, 'minimize'),
    },
    commonVector: {
      net_action_equivalents: coordinate(values.common ?? 0, 'maximize'),
    },
    outcome: {
      status: 'resolved',
      policy: OPTION_OUTCOME_POLICY,
      family,
      evidence: { kind: 'known_no_effect' },
      ledger: {
        hostileKillActions: zero,
        hostileHpPressure: zero,
        hostileDisabledTurns: zero,
        hostileWakeActions: zero,
        friendlyDisabledTurns: zero,
        friendlyWakeActions: zero,
        positionalProgress: zero,
        resourcePenalty: zero,
        netActionEquivalents: net,
      },
    },
    summary: `Resolved ${id}`,
  };
}

function unresolved(
  id: string,
  kind: OpportunityOptionKind = 'offense',
): UnresolvedOpportunityOption {
  return {
    status: 'unresolved',
    option: option(id),
    kind,
    unresolvedMetrics: ['expected_damage_milli'],
    reasons: ['synthetic_unresolved'],
    summary: `Unresolved ${id}`,
  };
}

function ids(evaluations: readonly OpportunityOptionEvaluation[]): readonly string[] {
  return evaluations.map((evaluation) => evaluation.option.optionId);
}

describe('opportunity selection capability', () => {
  it('uses the first populated candidacy tier and falls back to all evaluations', () => {
    const offense = resolved('offense', { damage: 1 });
    const approach = resolved('approach', { kind: 'approach', damage: 1 });
    const strongerDodge = resolved('dodge', { kind: 'dodge', damage: 100 });
    const other = resolved('other', { kind: 'other', damage: 200 });

    expect(ids(CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY.candidates([
      strongerDodge,
      other,
      approach,
      offense,
    ]))).toEqual(['option:approach', 'option:offense']);
    expect(selectOpportunity(
      [strongerDodge, other, approach, offense],
      CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY,
    ).selected).toBe(offense);

    expect(ids(CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY.candidates([
      other,
      strongerDodge,
    ]))).toEqual(['option:dodge']);
    expect(ids(CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY.candidates([
      other,
      resolved('other-2', { kind: 'other' }),
    ]))).toEqual(['option:other', 'option:other-2']);
  });

  it('applies same-family dominance before cross-family dominance', () => {
    const a = resolved('a', { family: 'legacy', damage: 2, common: 1 });
    const b = resolved('b', { family: 'legacy', damage: 1, common: 3 });
    const c = resolved('c', { family: 'modeled_effect', damage: 0, common: 2 });
    const evaluations = [a, b, c] as const;

    const staged = selectOpportunity(
      evaluations,
      CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY,
    );
    expect(staged.frontier).toEqual([c]);

    const globalV2Stage: OpportunityDominanceStage<ResolvedOpportunityOption> = {
      competes: (alternative, candidate) =>
        alternative.option.optionId !== candidate.option.optionId,
      dominates: (alternative, candidate) =>
        compareOpportunityV2(alternative, candidate).relation === 'left_dominates',
    };
    expect(applyOpportunityDominanceStages(evaluations, [globalV2Stage])).toEqual([]);
  });

  it('retains unresolved candidates and resolves the whole frontier', () => {
    const unknown = unresolved('unknown');
    const known = resolved('known', { damage: 4, common: 4 });

    const selection = selectOpportunity(
      [unknown, known],
      CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY,
    );

    expect(selection.frontier).toEqual([unknown, known]);
    expect(selection.selected).toBe(known);
    expect(selection.resolution).toBe('contains_unresolved');
  });

  it('orders by every incumbent term and then offered option id', () => {
    const comparisons: readonly {
      readonly term: string;
      readonly preferred: OpportunityOptionEvaluation;
      readonly other: OpportunityOptionEvaluation;
    }[] = [
      {
        term: 'kind',
        preferred: resolved('kind-offense', { kind: 'offense' }),
        other: resolved('kind-approach', { kind: 'approach', damage: 100 }),
      },
      {
        term: 'kind: approach before Dodge',
        preferred: resolved('kind-approach-2', { kind: 'approach' }),
        other: resolved('kind-dodge', { kind: 'dodge', damage: 100 }),
      },
      {
        term: 'kind: Dodge before other',
        preferred: resolved('kind-dodge-2', { kind: 'dodge' }),
        other: resolved('kind-other', { kind: 'other', damage: 100 }),
      },
      {
        term: 'resolution',
        preferred: resolved('resolved'),
        other: unresolved('unresolved'),
      },
      {
        term: 'expected damage',
        preferred: resolved('damage-high', { damage: 2 }),
        other: resolved('damage-low', { damage: 1 }),
      },
      {
        term: 'attack count',
        preferred: resolved('attacks-high', { attacks: 2 }),
        other: resolved('attacks-low', { attacks: 1 }),
      },
      {
        term: 'approach feet',
        preferred: resolved('approach-high', { approach: 2 }),
        other: resolved('approach-low', { approach: 1 }),
      },
      {
        term: 'resource costs',
        preferred: resolved('resources-low', { resources: 1 }),
        other: resolved('resources-high', { resources: 2 }),
      },
      {
        term: 'option id',
        preferred: resolved('id-a'),
        other: resolved('id-b'),
      },
      {
        term: 'option id despite action slot uses',
        preferred: resolved('slots-a', { actionSlots: 0 }),
        other: resolved('slots-b', { actionSlots: 99 }),
      },
    ];

    for (const comparison of comparisons) {
      expect(
        CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY.compare(
          comparison.preferred,
          comparison.other,
        ),
        comparison.term,
      ).toBeLessThan(0);
      expect(
        CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY.compare(
          comparison.other,
          comparison.preferred,
        ),
        comparison.term,
      ).toBeGreaterThan(0);
    }
  });

  it('uses every supplied policy capability without mutating evaluations', () => {
    interface ToyEvaluation {
      readonly id: 'alpha' | 'beta' | 'gamma' | 'delta';
      readonly score: number;
    }
    const evaluations: readonly ToyEvaluation[] = Object.freeze([
      Object.freeze({ id: 'alpha', score: 100 }),
      Object.freeze({ id: 'beta', score: 90 }),
      Object.freeze({ id: 'gamma', score: 1 }),
      Object.freeze({ id: 'delta', score: 2 }),
    ]);
    const before = JSON.stringify(evaluations);
    const policy: OpportunitySelectionPolicy<ToyEvaluation> = {
      candidates: (values) => values.filter((value) => value.id !== 'alpha'),
      applyDominance: (values) => values.filter((value) => value.id !== 'beta'),
      compare: (left, right) => right.score - left.score,
      isUnresolved: (value) => value.id === 'gamma',
    };

    const selection = selectOpportunity(evaluations, policy);

    expect(selection.frontier.map((entry) => entry.id)).toEqual(['gamma', 'delta']);
    expect(selection.selected.id).toBe('delta');
    expect(selection.resolution).toBe('contains_unresolved');
    expect(JSON.stringify(evaluations)).toBe(before);
    expect(evaluations).toEqual([
      { id: 'alpha', score: 100 },
      { id: 'beta', score: 90 },
      { id: 'gamma', score: 1 },
      { id: 'delta', score: 2 },
    ]);
  });

  it('refuses an empty candidate set and an empty frontier', () => {
    const value = { id: 'input' };
    const basePolicy: OpportunitySelectionPolicy<typeof value> = {
      candidates: (evaluations) => evaluations,
      applyDominance: (candidates) => candidates,
      compare: () => 0,
      isUnresolved: () => false,
    };

    expect(() => selectOpportunity([value], {
      ...basePolicy,
      candidates: () => [],
    })).toThrow('Opportunity candidacy returned no candidates.');
    expect(() => selectOpportunity([value], {
      ...basePolicy,
      applyDominance: () => [],
    })).toThrow('Opportunity dominance returned an empty frontier.');
  });

  it('refuses candidacy or dominance output that is not a reference subset', () => {
    interface ToyEvaluation {
      readonly id: string;
    }
    const value: ToyEvaluation = { id: 'input' };
    const replacement: ToyEvaluation = { id: 'input' };
    const basePolicy: OpportunitySelectionPolicy<ToyEvaluation> = {
      candidates: (evaluations) => evaluations,
      applyDominance: (candidates) => candidates,
      compare: () => 0,
      isUnresolved: () => false,
    };

    expect(() => selectOpportunity([value], {
      ...basePolicy,
      candidates: () => [replacement],
    })).toThrow('Opportunity candidacy must return a reference subset of its input.');
    expect(() => selectOpportunity([value], {
      ...basePolicy,
      applyDominance: () => [replacement],
    })).toThrow('Opportunity dominance must return a reference subset of its input.');
  });
});
