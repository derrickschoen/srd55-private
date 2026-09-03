import type { CombatantId } from '../combat/values';
import type { AgentInvocation } from './agent-session';
import type { AgentSessionLifecycle } from './agent-session-lifecycle';
import type {
  PlanAdjustmentProposalEnvelope,
  ProposedTurnResolution,
} from './engine-envelopes';
import type { EngineStateCapsule } from './engine-state-capsule';
import {
  renderEnginePrompt,
  type AllowlistedRulesSource,
} from './mcp/engine-server';

export const MAX_ADJUSTMENT_CORRECTIONS = 1 as const;

export type AdjustmentCorrectionResult = 'accepted' | 'invalid' | 'no_response' | 'not_required';

export interface AdjustmentCompletion {
  readonly kind: 'adjusted' | 'baseline_kept';
  readonly requestId: string;
  readonly baselinePlanHash: string;
  /** The complete usable patch. Actors absent here retain their baseline proposal. */
  readonly updates: readonly ProposedTurnResolution[];
  readonly stagedActorIds: readonly CombatantId[];
  readonly correctedActorIds: readonly CombatantId[];
  readonly baselineActorIds: readonly CombatantId[];
  readonly correctionResult: AdjustmentCorrectionResult;
}

export type AdjustmentExhaustionTransition =
  | {
      readonly kind: 'adjustment_correction_requested';
      readonly requestId: string;
      readonly baselinePlanHash: string;
      readonly correctionNumber: typeof MAX_ADJUSTMENT_CORRECTIONS;
      readonly refusedActorIds: readonly CombatantId[];
    }
  | {
      readonly kind: 'adjustment_completed';
      readonly requestId: string;
      readonly outcome: AdjustmentCompletion;
    };

export interface AdjustmentExhaustionPersistence {
  transitions(): readonly AdjustmentExhaustionTransition[];
  record(transition: AdjustmentExhaustionTransition): void;
}

export interface InitialAdjustmentAttempt {
  readonly requestId: string;
  readonly baselinePlanHash: string;
  readonly openActorIds: readonly CombatantId[];
  /** Valid updates staged by the MCP surface; null means no usable update was submitted. */
  readonly stagedProposal: PlanAdjustmentProposalEnvelope | null;
  /** Only these rejected update actors are eligible for the single correction request. */
  readonly refusedActorIds: readonly CombatantId[];
}

export interface AdjustmentCorrectionRuntime {
  readonly capsule: EngineStateCapsule;
  readonly rules: AllowlistedRulesSource;
  readonly turnContext: unknown;
  readonly lifecycle: Pick<AgentSessionLifecycle, 'resumeCorrection'>;
  readonly invocation: AgentInvocation;
  readonly signal: AbortSignal;
  activateCapsule(): void;
  takeProposal(): PlanAdjustmentProposalEnvelope | null;
}

function exactActors(actors: readonly CombatantId[], label: string, allowEmpty = false): readonly CombatantId[] {
  if ((!allowEmpty && actors.length === 0) || new Set(actors).size !== actors.length) {
    throw new RangeError(`${label} actors must be ${allowEmpty ? '' : 'non-empty and '}unique.`);
  }
  return [...actors].sort((left, right) => left.localeCompare(right));
}

function validResolutionDigest(digest: string): boolean {
  return /^[a-f\d]{64,128}$/u.test(digest);
}

function exactProposal(
  proposal: PlanAdjustmentProposalEnvelope,
  input: {
    readonly requestId: string;
    readonly baselinePlanHash: string;
    readonly phase: 'initial' | 'correction';
    readonly allowedActorIds: readonly CombatantId[];
  },
): boolean {
  if (
    proposal.requestId !== input.requestId ||
    proposal.baseline_plan_hash !== input.baselinePlanHash ||
    proposal.phase !== input.phase
  ) return false;
  const actual = proposal.updates.map((entry) => entry.proposal.actorId);
  return new Set(actual).size === actual.length &&
    actual.every((actorId) => input.allowedActorIds.includes(actorId)) &&
    proposal.updates.every((entry) =>
      validResolutionDigest(entry.resolutionDigest) &&
      (entry.selectedBranch !== 'fallback' || entry.proposal.fallbackOptionId !== null) &&
      (input.phase !== 'correction' || entry.proposal.fallbackOptionId === null));
}

function completion(input: {
  readonly initial: InitialAdjustmentAttempt;
  readonly staged: readonly ProposedTurnResolution[];
  readonly corrected: readonly ProposedTurnResolution[];
  readonly correctionResult: AdjustmentCorrectionResult;
}): AdjustmentCompletion {
  const updates = [...input.staged, ...input.corrected];
  const updated = new Set(updates.map((entry) => entry.proposal.actorId));
  return {
    kind: updates.length === 0 ? 'baseline_kept' : 'adjusted',
    requestId: input.initial.requestId,
    baselinePlanHash: input.initial.baselinePlanHash,
    updates,
    stagedActorIds: input.staged.map((entry) => entry.proposal.actorId).sort((left, right) => left.localeCompare(right)),
    correctedActorIds: input.corrected.map((entry) => entry.proposal.actorId).sort((left, right) => left.localeCompare(right)),
    baselineActorIds: input.initial.openActorIds.filter((actorId) => !updated.has(actorId)).sort((left, right) => left.localeCompare(right)),
    correctionResult: input.correctionResult,
  };
}

export class AdjustmentExhaustionCoordinator {
  constructor(private readonly persistence: AdjustmentExhaustionPersistence) {}

  reconstruct(requestId: string): AdjustmentCompletion | null {
    const completed = this.persistence.transitions().find((entry) =>
      entry.kind === 'adjustment_completed' && entry.requestId === requestId);
    if (completed?.kind !== 'adjustment_completed') return null;
    return completed.outcome;
  }

  async coordinate(input: {
    readonly initial: InitialAdjustmentAttempt;
    readonly correction: AdjustmentCorrectionRuntime | null;
  }): Promise<AdjustmentCompletion> {
    const openActors = exactActors(input.initial.openActorIds, 'Open adjustment');
    const refusedActors = exactActors(input.initial.refusedActorIds, 'Refused adjustment', true);
    const adjustmentBudget = Math.min(openActors.length, 2);
    if (refusedActors.some((actorId) => !openActors.includes(actorId))) {
      throw new RangeError('Adjustment correction actors must belong to the original open actor set.');
    }
    if (!/^[0-9a-f]{64}$/u.test(input.initial.baselinePlanHash)) {
      throw new TypeError('Adjustment baseline plan hash must be canonical.');
    }
    const staged = input.initial.stagedProposal?.updates ?? [];
    if (input.initial.stagedProposal !== null && !exactProposal(input.initial.stagedProposal, {
      requestId: input.initial.requestId,
      baselinePlanHash: input.initial.baselinePlanHash,
      phase: 'initial',
      allowedActorIds: openActors,
    })) throw new RangeError('Staged adjustment proposal is malformed.');
    if (staged.length > adjustmentBudget) {
      throw new RangeError('Staged adjustment proposal exceeds the original adjustment budget.');
    }
    if (staged.some((entry) => refusedActors.includes(entry.proposal.actorId))) {
      throw new RangeError('A staged adjustment actor cannot also be refused.');
    }

    const reconstructed = this.reconstruct(input.initial.requestId);
    if (reconstructed !== null) return reconstructed;

    if (refusedActors.length === 0) {
      const outcome = completion({
        initial: input.initial,
        staged,
        corrected: [],
        correctionResult: 'not_required',
      });
      this.persistence.record({ kind: 'adjustment_completed', requestId: outcome.requestId, outcome });
      return outcome;
    }
    if (input.correction === null) {
      const outcome = completion({
        initial: input.initial,
        staged,
        corrected: [],
        correctionResult: 'no_response',
      });
      this.persistence.record({ kind: 'adjustment_completed', requestId: outcome.requestId, outcome });
      return outcome;
    }

    const request = input.correction.capsule.request;
    if (
      request === null || request.phase !== 'correction' || request.kind !== 'plan_adjustment' ||
      request.requestId !== input.initial.requestId ||
      request.baselinePlanHash !== input.initial.baselinePlanHash ||
      request.correctionNumber !== MAX_ADJUSTMENT_CORRECTIONS ||
      exactActors(request.actors, 'Correction capsule').some((actorId, index) => actorId !== refusedActors[index]) ||
      request.actors.length !== refusedActors.length
    ) throw new RangeError('Correction capsule does not describe exactly the refused adjustment actors.');

    const priorRequested = this.persistence.transitions().find((entry) =>
      entry.kind === 'adjustment_correction_requested' && entry.requestId === input.initial.requestId);
    if (priorRequested?.kind === 'adjustment_correction_requested' && (
      priorRequested.baselinePlanHash !== input.initial.baselinePlanHash ||
      priorRequested.correctionNumber !== MAX_ADJUSTMENT_CORRECTIONS ||
      priorRequested.refusedActorIds.length !== refusedActors.length ||
      [...priorRequested.refusedActorIds].sort((left, right) => left.localeCompare(right))
        .some((actorId, index) => actorId !== refusedActors[index])
    )) throw new Error('Persisted adjustment correction request does not match the resumed chain.');
    if (priorRequested === undefined) {
      this.persistence.record({
        kind: 'adjustment_correction_requested',
        requestId: input.initial.requestId,
        baselinePlanHash: input.initial.baselinePlanHash,
        correctionNumber: MAX_ADJUSTMENT_CORRECTIONS,
        refusedActorIds: refusedActors,
      });
      input.correction.activateCapsule();
      const prompt = input.correction.invocation.output.kind === 'structured_final'
        ? input.correction.invocation.prompt
        : renderEnginePrompt(
            'correct_proposal',
            input.correction.capsule,
            input.correction.rules,
            undefined,
            input.correction.turnContext,
          );
      await input.correction.lifecycle.resumeCorrection({
        ...input.correction.invocation,
        prompt,
      }, input.correction.signal);
    }

    const proposal = input.correction.takeProposal();
    const accepted = proposal !== null && staged.length + proposal.updates.length <= adjustmentBudget && exactProposal(proposal, {
      requestId: input.initial.requestId,
      baselinePlanHash: input.initial.baselinePlanHash,
      phase: 'correction',
      allowedActorIds: refusedActors,
    });
    const outcome = completion({
      initial: input.initial,
      staged,
      corrected: accepted ? proposal.updates : [],
      correctionResult: proposal === null ? 'no_response' : accepted ? 'accepted' : 'invalid',
    });
    this.persistence.record({ kind: 'adjustment_completed', requestId: outcome.requestId, outcome });
    return outcome;
  }
}
