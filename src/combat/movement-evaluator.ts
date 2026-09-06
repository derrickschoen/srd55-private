import { adjacentCells, type GridCell } from './grid';
import {
  findPath,
  findPathToAny,
  planMovement,
  type MovementCause,
  type MovementWorld,
  type PathResult,
  type ReachSource,
} from './movement';
import {
  evaluateTacticalAttack,
  TACTICAL_EVALUATOR_POLICY,
  type TacticalAttackEvaluation,
  type TacticalAttackInput,
  type TacticalUnresolvedReason,
} from './tactical-evaluator';
import { feet, type CombatantId, type Feet } from './values';

export const MOVEMENT_EVALUATOR_POLICY = 'movement-eval-v2' as const;

export type MovementHazardKind =
  | 'burning_surface'
  | 'persistent_area_damage'
  | 'environmental_hazard';

export type MovementAttackContextUnresolvedReason =
  | 'attack_context_unresolved'
  | 'cover_unresolved'
  | 'visibility_unresolved';

export interface MovementEvaluationInput {
  readonly policy: typeof MOVEMENT_EVALUATOR_POLICY;
  readonly actorId: CombatantId;
  readonly start: GridCell;
  readonly candidates: readonly GridCell[];
  readonly world: MovementWorld<CombatantId>;
  readonly speedPerTurn: Feet | null;
  readonly currentMovementRemaining: Feet;
  /** Availability assumptions are explicit inputs to the static-snapshot ETA projection. */
  readonly projection: {
    readonly currentAttackActionAvailable: boolean;
    readonly currentDashAvailable: boolean;
    readonly futureAttackActionAvailable: boolean;
    readonly futureDashAvailable: boolean;
  };
  readonly opportunityAttackRisk:
    | {
        readonly status: 'resolved';
        readonly cause: MovementCause;
        /** Sources must already satisfy encounter-specific sight and suppression gates. */
        readonly reachSources: readonly ReachSource<CombatantId>[];
      }
    | {
        readonly status: 'unresolved';
        readonly reason: 'opportunity_attack_eligibility_unresolved';
      };
  readonly hazards:
    | {
        readonly status: 'resolved';
        readonly cells: readonly {
          readonly cell: GridCell;
          readonly kind: MovementHazardKind;
        }[];
      }
    | {
        readonly status: 'unresolved';
        readonly reason: 'hazard_membership_unresolved';
      };
  readonly attackAt: (position: GridCell) =>
    | {
        readonly status: 'resolved';
        readonly input: TacticalAttackInput;
      }
    | {
        readonly status: 'unresolved';
        readonly reason: MovementAttackContextUnresolvedReason;
      };
}

type MovementAttackVerdict =
  | {
      readonly status: 'resolved';
      readonly tacticalPolicy: typeof TACTICAL_EVALUATOR_POLICY;
      readonly evaluation: TacticalAttackEvaluation;
    }
  | {
      readonly status: 'unresolved';
      readonly reason: MovementAttackContextUnresolvedReason;
    };

type MovementMetricIssue = {
  readonly phase: 'before' | 'after';
  readonly reasons: readonly (
    | MovementAttackContextUnresolvedReason
    | TacticalUnresolvedReason
  )[];
};

type MovementNumericDelta =
  | {
      readonly status: 'resolved';
      readonly before: number;
      readonly after: number;
      readonly delta: number;
    }
  | {
      readonly status: 'unresolved';
      readonly before: number | null;
      readonly after: number | null;
      readonly issues: readonly MovementMetricIssue[];
    };

type MovementPathRisk =
  | {
      readonly status: 'resolved';
      readonly atRisk: boolean;
      readonly cells: readonly GridCell[];
      readonly reactorIds: readonly CombatantId[];
    }
  | {
      readonly status: 'unresolved';
      readonly reason: 'opportunity_attack_eligibility_unresolved';
    };

type MovementHazardRisk =
  | {
      readonly status: 'resolved';
      readonly atRisk: boolean;
      readonly annotations: readonly {
        readonly cell: GridCell;
        readonly kinds: readonly MovementHazardKind[];
      }[];
    }
  | {
      readonly status: 'unresolved';
      readonly reason: 'hazard_membership_unresolved';
    };

type MovementCandidateEvaluation = {
  readonly destination: GridCell;
  readonly path:
    | {
        readonly status: 'found';
        readonly cells: readonly GridCell[];
        readonly cost: Feet;
        readonly opportunityAttackRisk: MovementPathRisk;
        readonly hazardRisk: MovementHazardRisk;
      }
    | {
        readonly status: 'unreachable';
      };
  readonly before: MovementAttackVerdict;
  readonly after: MovementAttackVerdict;
  readonly deltas: {
    readonly hitProbability: MovementNumericDelta;
    readonly expectedDamage: MovementNumericDelta;
  };
  readonly semantic:
    | {
        readonly status: 'resolved';
        readonly kind:
          | 'move_5_to_normal_range'
          | 'move_within_speed_to_enable_attack'
          | 'maintain_range'
          | 'other_reposition';
      }
    | {
        readonly status: 'unresolved';
        readonly reason:
          | 'destination_unreachable'
          | 'attack_context_unresolved'
          | 'attack_range_unresolved'
          | 'effective_speed_unresolved';
      };
};

type EarliestAttackTurn =
  | {
      readonly status: 'resolved';
      /** Zero is the current turn; one is the actor's next turn. */
      readonly turns: number;
      readonly movementCost: Feet;
      readonly attackOrigin: GridCell;
      readonly path: readonly GridCell[];
    }
  | {
      readonly status: 'unreachable';
      readonly reason:
        | 'no_reachable_attack_origin'
        | 'movement_speed_zero'
        | 'future_attack_action_unavailable';
    }
  | {
      readonly status: 'unresolved';
      readonly reason:
        | 'attack_context_unresolved'
        | 'attack_range_unresolved'
        | 'effective_speed_unresolved';
    };

export interface MovementEvaluation {
  readonly policy: typeof MOVEMENT_EVALUATOR_POLICY;
  readonly actorId: CombatantId;
  readonly start: GridCell;
  readonly candidates: readonly MovementCandidateEvaluation[];
  readonly earliestAttackTurn: EarliestAttackTurn;
}

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function sameCell(left: GridCell, right: GridCell): boolean {
  return left.column === right.column && left.row === right.row;
}

/**
 * Any least-cost route on this finite grid has a simple representative. This
 * bound lets the canonical bounded pathfinder search every such route without
 * inventing a caller-selected distance cap.
 */
function exhaustivePathCostBound(
  world: MovementWorld<CombatantId>,
  actorId: CombatantId,
): Feet {
  let maximumStepCost = 0;
  for (let row = 0; row < world.bounds.rows; row += 1) {
    for (let column = 0; column < world.bounds.columns; column += 1) {
      const from = { column, row };
      for (const to of adjacentCells(world.bounds, from)) {
        if (!world.canTraverseStep(actorId, from, to)) continue;
        const traversal = world.traversal(actorId, from, to);
        if (traversal.kind === 'enterable') {
          maximumStepCost = Math.max(maximumStepCost, traversal.cost);
        }
      }
    }
  }
  const cellCount = world.bounds.columns * world.bounds.rows;
  return feet(Math.max(0, cellCount - 1) * maximumStepCost);
}

function tacticalVerdict(
  input: MovementEvaluationInput,
  position: GridCell,
  cache: Map<string, MovementAttackVerdict>,
): MovementAttackVerdict {
  const key = cellKey(position);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const context = input.attackAt(position);
  const verdict: MovementAttackVerdict = context.status === 'unresolved'
    ? context
    : {
        status: 'resolved',
        tacticalPolicy: TACTICAL_EVALUATOR_POLICY,
        evaluation: evaluateTacticalAttack(context.input),
      };
  cache.set(key, verdict);
  return verdict;
}

function metricValue(
  verdict: MovementAttackVerdict,
  metric: 'hitProbability' | 'expectedDamage',
): { readonly value: number | null; readonly reasons: readonly (
  | MovementAttackContextUnresolvedReason
  | TacticalUnresolvedReason
)[] } {
  if (verdict.status === 'unresolved') {
    return { value: null, reasons: [verdict.reason] };
  }
  if (metric === 'hitProbability') {
    return verdict.evaluation.probabilities.status === 'resolved'
      ? { value: verdict.evaluation.probabilities.hit, reasons: [] }
      : {
          value: null,
          reasons: [verdict.evaluation.probabilities.reason],
        };
  }
  return verdict.evaluation.damage.status === 'resolved'
    ? { value: verdict.evaluation.damage.expectedDamage, reasons: [] }
    : { value: null, reasons: [verdict.evaluation.damage.reason] };
}

function numericDelta(
  before: MovementAttackVerdict,
  after: MovementAttackVerdict,
  metric: 'hitProbability' | 'expectedDamage',
): MovementNumericDelta {
  const beforeMetric = metricValue(before, metric);
  const afterMetric = metricValue(after, metric);
  if (beforeMetric.value !== null && afterMetric.value !== null) {
    return {
      status: 'resolved',
      before: beforeMetric.value,
      after: afterMetric.value,
      delta: afterMetric.value - beforeMetric.value,
    };
  }
  return {
    status: 'unresolved',
    before: beforeMetric.value,
    after: afterMetric.value,
    issues: [
      ...(beforeMetric.reasons.length === 0
        ? []
        : [{ phase: 'before' as const, reasons: beforeMetric.reasons }]),
      ...(afterMetric.reasons.length === 0
        ? []
        : [{ phase: 'after' as const, reasons: afterMetric.reasons }]),
    ],
  };
}

function pathRisks(
  input: MovementEvaluationInput,
  path: Extract<PathResult, { readonly kind: 'found' }>,
): {
  readonly opportunityAttackRisk: MovementPathRisk;
  readonly hazardRisk: MovementHazardRisk;
} {
  let opportunityAttackRisk: MovementPathRisk;
  if (input.opportunityAttackRisk.status === 'unresolved') {
    opportunityAttackRisk = input.opportunityAttackRisk;
  } else {
    const plan = planMovement(input.world, {
      actorId: input.actorId,
      start: input.start,
      path: path.cells,
      budgetRemaining: path.cost,
      cause: input.opportunityAttackRisk.cause,
      reachSources: input.opportunityAttackRisk.reachSources,
    });
    if (plan.kind === 'illegal') {
      throw new Error(`Canonical path produced an illegal movement plan: ${plan.reason}.`);
    }
    const cells: GridCell[] = [];
    const reactorIds: CombatantId[] = [];
    const seenReactors = new Set<CombatantId>();
    for (const step of plan.steps) {
      if (step.beforeLeaving.length > 0) cells.push(step.from);
      for (const window of step.beforeLeaving) {
        if (!seenReactors.has(window.reactorId)) {
          seenReactors.add(window.reactorId);
          reactorIds.push(window.reactorId);
        }
      }
    }
    opportunityAttackRisk = {
      status: 'resolved',
      atRisk: reactorIds.length > 0,
      cells,
      reactorIds,
    };
  }

  let hazardRisk: MovementHazardRisk;
  if (input.hazards.status === 'unresolved') {
    hazardRisk = input.hazards;
  } else {
    const hazardsByCell = new Map<string, {
      readonly cell: GridCell;
      readonly kinds: Set<MovementHazardKind>;
    }>();
    let previousAnchor = input.start;
    for (const anchor of path.cells) {
      const previousCells = input.world.occupiedCells(input.actorId, previousAnchor);
      const enteredCells = input.world.occupiedCells(input.actorId, anchor)
        .filter((cell) => !previousCells.some((previous) => sameCell(cell, previous)));
      for (const cell of enteredCells) {
        for (const hazard of input.hazards.cells) {
          if (!sameCell(cell, hazard.cell)) continue;
          const key = cellKey(cell);
          const existing = hazardsByCell.get(key);
          if (existing === undefined) {
            hazardsByCell.set(key, {
              cell: { ...cell },
              kinds: new Set([hazard.kind]),
            });
          } else {
            existing.kinds.add(hazard.kind);
          }
        }
      }
      previousAnchor = anchor;
    }
    const annotations = [...hazardsByCell.values()].map((annotation) => ({
      cell: annotation.cell,
      kinds: [...annotation.kinds],
    }));
    hazardRisk = {
      status: 'resolved',
      atRisk: annotations.length > 0,
      annotations,
    };
  }
  return { opportunityAttackRisk, hazardRisk };
}

function semanticVerdict(
  input: MovementEvaluationInput,
  path: PathResult,
  before: MovementAttackVerdict,
  after: MovementAttackVerdict,
): MovementCandidateEvaluation['semantic'] {
  if (path.kind === 'unreachable') {
    return { status: 'unresolved', reason: 'destination_unreachable' };
  }
  if (before.status === 'unresolved' || after.status === 'unresolved') {
    return { status: 'unresolved', reason: 'attack_context_unresolved' };
  }
  if (
    before.evaluation.range.status === 'unresolved' ||
    after.evaluation.range.status === 'unresolved'
  ) {
    return { status: 'unresolved', reason: 'attack_range_unresolved' };
  }
  if (
    path.cost <= feet(5) &&
    before.evaluation.range.band === 'long' &&
    after.evaluation.range.band === 'normal'
  ) {
    return { status: 'resolved', kind: 'move_5_to_normal_range' };
  }
  if (
    !before.evaluation.range.legal &&
    after.evaluation.range.legal
  ) {
    if (input.speedPerTurn === null) {
      return { status: 'unresolved', reason: 'effective_speed_unresolved' };
    }
    if (path.cost <= input.speedPerTurn) {
      return { status: 'resolved', kind: 'move_within_speed_to_enable_attack' };
    }
  }
  if (
    before.evaluation.range.legal &&
    after.evaluation.range.legal &&
    before.evaluation.range.band === after.evaluation.range.band
  ) {
    return { status: 'resolved', kind: 'maintain_range' };
  }
  return { status: 'resolved', kind: 'other_reposition' };
}

function turnsToAttackAfterCost(
  input: MovementEvaluationInput,
  cost: Feet,
): number | 'speed_zero' | 'future_action_unavailable' | 'speed_unresolved' {
  if (
    input.projection.currentAttackActionAvailable &&
    cost <= input.currentMovementRemaining
  ) return 0;
  if (!input.projection.futureAttackActionAvailable) {
    return 'future_action_unavailable';
  }
  if (cost === feet(0)) return 1;
  if (input.speedPerTurn === null) return 'speed_unresolved';
  if (input.speedPerTurn === feet(0)) return 'speed_zero';

  const currentDashMovement =
    input.projection.currentAttackActionAvailable &&
    input.projection.currentDashAvailable
      ? input.speedPerTurn
      : feet(0);
  const costAfterCurrentTurn = Math.max(
    0,
    cost - input.currentMovementRemaining - currentDashMovement,
  );
  if (costAfterCurrentTurn <= input.speedPerTurn) return 1;
  const preparationTurnMovement = input.speedPerTurn *
    (input.projection.futureDashAvailable ? 2 : 1);
  return 1 + Math.ceil(
    (costAfterCurrentTurn - input.speedPerTurn) / preparationTurnMovement,
  );
}

function earliestAttackTurn(
  input: MovementEvaluationInput,
  maximumCost: Feet,
  cache: Map<string, MovementAttackVerdict>,
): EarliestAttackTurn {
  const knownLegal = (cell: GridCell): boolean => {
    const verdict = tacticalVerdict(input, cell, cache);
    return verdict.status === 'resolved' &&
      verdict.evaluation.range.status === 'resolved' &&
      verdict.evaluation.range.legal &&
      !verdict.evaluation.unresolved.includes('target_has_total_cover');
  };
  const unresolved = (cell: GridCell): boolean => {
    const verdict = tacticalVerdict(input, cell, cache);
    return verdict.status === 'unresolved' ||
      verdict.evaluation.range.status === 'unresolved';
  };
  const legalPath = findPathToAny(input.world, {
    actorId: input.actorId,
    start: input.start,
    maximumCost,
    isGoal: knownLegal,
  });
  const unresolvedPath = findPathToAny(input.world, {
    actorId: input.actorId,
    start: input.start,
    maximumCost,
    isGoal: unresolved,
  });

  const legalTurns = legalPath.kind === 'found'
    ? turnsToAttackAfterCost(input, legalPath.cost)
    : null;
  const unresolvedTurns = unresolvedPath.kind === 'found'
    ? turnsToAttackAfterCost(input, unresolvedPath.cost)
    : null;
  if (
    unresolvedPath.kind === 'found' &&
    (legalPath.kind === 'unreachable' ||
      (typeof unresolvedTurns === 'number' &&
        typeof legalTurns === 'number' &&
        unresolvedTurns < legalTurns))
  ) {
    const verdict = tacticalVerdict(
      input,
      unresolvedPath.cells.at(-1) ?? input.start,
      cache,
    );
    return {
      status: 'unresolved',
      reason: verdict.status === 'unresolved'
        ? 'attack_context_unresolved'
        : 'attack_range_unresolved',
    };
  }
  if (legalPath.kind === 'unreachable' || legalTurns === null) {
    return { status: 'unreachable', reason: 'no_reachable_attack_origin' };
  }
  if (legalTurns === 'speed_unresolved') {
    return { status: 'unresolved', reason: 'effective_speed_unresolved' };
  }
  if (legalTurns === 'speed_zero') {
    return { status: 'unreachable', reason: 'movement_speed_zero' };
  }
  if (legalTurns === 'future_action_unavailable') {
    return { status: 'unreachable', reason: 'future_attack_action_unavailable' };
  }
  return {
    status: 'resolved',
    turns: legalTurns,
    movementCost: legalPath.cost,
    attackOrigin: legalPath.cells.at(-1) ?? input.start,
    path: legalPath.cells,
  };
}

/** Pure semantic movement and static-snapshot attack-arrival evaluation. */
export function evaluateMovementOptions(
  input: MovementEvaluationInput,
): MovementEvaluation {
  const maximumCost = exhaustivePathCostBound(input.world, input.actorId);
  const cache = new Map<string, MovementAttackVerdict>();
  const before = tacticalVerdict(input, input.start, cache);
  const candidates = input.candidates.map((destination): MovementCandidateEvaluation => {
    const path = findPath(input.world, {
      actorId: input.actorId,
      start: input.start,
      goal: destination,
      maximumCost,
    });
    const after = tacticalVerdict(input, destination, cache);
    return {
      destination: { ...destination },
      path: path.kind === 'unreachable'
        ? { status: 'unreachable' }
        : {
            status: 'found',
            cells: path.cells,
            cost: path.cost,
            ...pathRisks(input, path),
          },
      before,
      after,
      deltas: {
        hitProbability: numericDelta(before, after, 'hitProbability'),
        expectedDamage: numericDelta(before, after, 'expectedDamage'),
      },
      semantic: semanticVerdict(input, path, before, after),
    };
  });
  return {
    policy: MOVEMENT_EVALUATOR_POLICY,
    actorId: input.actorId,
    start: { ...input.start },
    candidates,
    earliestAttackTurn: earliestAttackTurn(input, maximumCost, cache),
  };
}
