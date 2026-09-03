import type { CombatantId } from '../combat/values';
import type { DmIntelCapture, DmTargetIntelRow } from './dm-tactical-intel';

export interface DecisionTraceResolutionSummary {
  readonly optionId: string;
  readonly movementFeet: number;
  readonly actionSlots: readonly unknown[];
}

export interface DecisionTraceRow {
  readonly authorizedPlan: readonly {
    readonly actorId: CombatantId;
    readonly reason: string;
    readonly resolutionSummary: DecisionTraceResolutionSummary;
  }[] | null;
  readonly engineIntel: DmIntelCapture | null;
}

export interface DecisionTraceExpectation {
  readonly optionId: string;
  readonly hitProbability: number | null;
  readonly expectedDamage: number | null;
}

export interface ActorDecisionTrace {
  readonly actorId: CombatantId;
  readonly reason: string;
  readonly chosenOptionId: string;
  readonly engineExpected: {
    readonly chosen: DecisionTraceExpectation | null;
    readonly better: DecisionTraceExpectation | null;
  };
  readonly executed: DecisionTraceResolutionSummary;
}

function expectation(row: DmTargetIntelRow): DecisionTraceExpectation | null {
  return row.optionId === null ? null : {
    optionId: row.optionId,
    hitProbability: row.hitProbability,
    expectedDamage: row.expectedDamage,
  };
}

function expectationScore(value: DecisionTraceExpectation): readonly [number, number] {
  return [value.expectedDamage ?? -1, value.hitProbability ?? -1];
}

function compareExpectation(left: DecisionTraceExpectation, right: DecisionTraceExpectation): number {
  const [leftDamage, leftHit] = expectationScore(left);
  const [rightDamage, rightHit] = expectationScore(right);
  return rightDamage - leftDamage || rightHit - leftHit || left.optionId.localeCompare(right.optionId);
}

function isStrictlyBetter(candidate: DecisionTraceExpectation, chosen: DecisionTraceExpectation): boolean {
  const [candidateDamage, candidateHit] = expectationScore(candidate);
  const [chosenDamage, chosenHit] = expectationScore(chosen);
  return candidateDamage > chosenDamage || (candidateDamage === chosenDamage && candidateHit > chosenHit);
}

/** Joins stored decision reasons, exact selected options, engine expectations, and execution evidence. */
export function buildDecisionTrace(row: DecisionTraceRow): readonly ActorDecisionTrace[] {
  if (row.authorizedPlan === null) return [];
  return row.authorizedPlan.map((plan) => {
    const intelRows = row.engineIntel?.actors.find((actor) => actor.actorId === plan.actorId)?.rows ?? [];
    const expectations = intelRows.flatMap((intelRow) => {
      const value = expectation(intelRow);
      return value === null ? [] : [value];
    });
    const chosen = expectations.find((value) => value.optionId === plan.resolutionSummary.optionId) ?? null;
    const better = chosen === null
      ? null
      : [...expectations]
          .filter((value) => value.optionId !== chosen.optionId && isStrictlyBetter(value, chosen))
          .sort(compareExpectation)[0] ?? null;
    return {
      actorId: plan.actorId,
      reason: plan.reason,
      chosenOptionId: plan.resolutionSummary.optionId,
      engineExpected: { chosen, better },
      executed: plan.resolutionSummary,
    };
  });
}
