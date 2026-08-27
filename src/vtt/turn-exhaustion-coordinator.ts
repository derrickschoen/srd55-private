import type { CombatantId } from '../combat/values';
import type { AgentInvocation } from './agent-session';
import type { AgentSessionLifecycle } from './agent-session-lifecycle';
import type { RoundIntentProposalEnvelope } from './engine-envelopes';
import type { EngineStateCapsule } from './engine-state-capsule';
import {
  renderEnginePrompt,
  type AllowlistedRulesSource,
} from './mcp/engine-server';

export const MAX_INTENT_CORRECTIONS = 1 as const;

export type IntentFallbackResult = 'invalid' | 'invalidated' | 'absent';
export type IntentCorrectionResult = 'invalid' | 'invalidated' | 'no_response';

export interface IntentActorFailure {
  readonly actorId: CombatantId;
  readonly fallbackResult: IntentFallbackResult;
}

export interface AutoResolvedIntentMark {
  readonly runId: string;
  readonly branchId: string;
  readonly expectedRevision: number;
  readonly requestId: string;
  readonly actorId: CombatantId;
  readonly initialProposalId: string;
  readonly fallbackResult: IntentFallbackResult;
  readonly correctionResult: IntentCorrectionResult;
  readonly controllerResolutionDigest: string;
}

export type TurnExhaustionTransition =
  | {
      readonly kind: 'intent_fallback_resolved';
      readonly requestId: string;
      readonly proposalId: string;
      readonly actorId: CombatantId;
      readonly resolutionDigest: string;
    }
  | {
      readonly kind: 'intent_correction_requested';
      readonly requestId: string;
      readonly initialProposalId: string;
      readonly correctionNumber: typeof MAX_INTENT_CORRECTIONS;
      readonly actorFailures: readonly IntentActorFailure[];
    }
  | {
      readonly kind: 'intent_correction_resolved';
      readonly requestId: string;
      readonly proposalId: string;
      readonly actorIds: readonly CombatantId[];
    }
  | {
      readonly kind: 'intent_correction_failed';
      readonly requestId: string;
      readonly result: IntentCorrectionResult;
    }
  | ({ readonly kind: 'intent_auto_resolved' } & AutoResolvedIntentMark)
  | {
      readonly kind: 'intent_auto_resolution_failed';
      readonly requestId: string;
      readonly actorId: CombatantId;
      readonly reason: string;
    };

export interface TurnExhaustionPersistence {
  transitions(): readonly TurnExhaustionTransition[];
  record(transition: TurnExhaustionTransition): void;
}

export interface DeterministicIntentResolution {
  readonly actorId: CombatantId;
  readonly expectedRevision: number;
  readonly resolutionDigest: string;
}

export interface TurnExhaustionCorrectionRuntime {
  readonly capsule: EngineStateCapsule;
  readonly rules: AllowlistedRulesSource;
  readonly turnContext: unknown;
  readonly lifecycle: Pick<AgentSessionLifecycle, 'resumeCorrection'>;
  readonly invocation: AgentInvocation;
  readonly signal: AbortSignal;
  /** Makes the correction capsule authoritative before the resume is dispatched. */
  activateCapsule(): void;
  /** Removes at most one proposal from the host-owned spool for this request. */
  takeProposal(): RoundIntentProposalEnvelope | null;
}

export interface TurnExhaustionHost {
  authorize(proposal: RoundIntentProposalEnvelope): Promise<'authorized' | 'invalidated' | 'invalid'>;
  resolveDeterministically(actorId: CombatantId): Promise<DeterministicIntentResolution | null>;
  /** Applies the ordinary authoritative commands and the host-only mark as one host transaction. */
  applyAutoResolved(
    resolution: DeterministicIntentResolution,
    mark: AutoResolvedIntentMark,
  ): Promise<void>;
  pauseForDmAdjudication(input: {
    readonly requestId: string;
    readonly actorId: CombatantId;
    readonly reason: string;
  }): void;
}

export type InitialIntentAttempt =
  | {
      readonly kind: 'proposal';
      readonly proposal: RoundIntentProposalEnvelope;
    }
  | {
      readonly kind: 'exhausted';
      readonly requestId: string;
      readonly initialProposalId: string;
      readonly actorFailures: readonly IntentActorFailure[];
    };

export type TurnExhaustionOutcome =
  | { readonly kind: 'authorized'; readonly proposalId: string; readonly phase: 'initial' | 'correction' }
  | { readonly kind: 'auto_resolved'; readonly actorIds: readonly CombatantId[] }
  | { readonly kind: 'awaiting_dm_adjudication'; readonly actorId: CombatantId };

export interface ReconstructedTurnExhaustionState {
  readonly requestId: string;
  readonly stage:
    | 'fallback_resolved'
    | 'correction_requested'
    | 'correction_resolved'
    | 'auto_resolving'
    | 'auto_resolved'
    | 'awaiting_dm_adjudication';
  readonly correctionNumber: 0 | typeof MAX_INTENT_CORRECTIONS;
  readonly autoResolvedActorIds: readonly CombatantId[];
}

function exactActorFailures(failures: readonly IntentActorFailure[]): readonly IntentActorFailure[] {
  if (failures.length === 0) throw new RangeError('Intent exhaustion requires at least one actor.');
  const sorted = [...failures].sort((left, right) => left.actorId.localeCompare(right.actorId));
  if (sorted.some((entry, index) => entry.actorId === sorted[index - 1]?.actorId)) {
    throw new RangeError('Intent exhaustion actors must be unique.');
  }
  return sorted;
}

function exactProposalActors(
  proposal: RoundIntentProposalEnvelope,
  actors: readonly CombatantId[],
  phase: 'initial' | 'correction',
): boolean {
  if (proposal.phase !== phase || proposal.resolutions.some((entry) =>
    (phase === 'correction' && entry.intent.fallback !== null) ||
    (entry.selectedBranch === 'fallback' && entry.intent.fallback === null))) return false;
  const actual = proposal.resolutions.map((entry) => entry.intent.actorId).sort((left, right) => left.localeCompare(right));
  return new Set(actual).size === actual.length && actual.length === actors.length &&
    proposal.resolutions.every((entry) => validResolutionDigest(entry.resolutionDigest)) &&
    actual.every((actor, index) => actor === actors[index]);
}

function validResolutionDigest(digest: string): boolean {
  return /^[a-f\d]{64,128}$/u.test(digest);
}

export class TurnExhaustionCoordinator {
  constructor(private readonly persistence: TurnExhaustionPersistence) {}

  reconstruct(requestId: string): ReconstructedTurnExhaustionState | null {
    const transitions = this.persistence.transitions().filter((entry) => entry.requestId === requestId);
    if (transitions.length === 0) return null;
    const correctionRequested = transitions.find((entry) => entry.kind === 'intent_correction_requested');
    const correctionResolved = transitions.find((entry) => entry.kind === 'intent_correction_resolved');
    const correctionFailed = transitions.find((entry) => entry.kind === 'intent_correction_failed');
    const failed = transitions.find((entry) => entry.kind === 'intent_auto_resolution_failed');
    const autoResolved = transitions.flatMap((entry) => entry.kind === 'intent_auto_resolved' ? [entry.actorId] : []);
    const fallbackResolved = transitions.find((entry) => entry.kind === 'intent_fallback_resolved');
    let stage: ReconstructedTurnExhaustionState['stage'];
    if (failed !== undefined) stage = 'awaiting_dm_adjudication';
    else if (correctionResolved !== undefined) stage = 'correction_resolved';
    else if (correctionFailed !== undefined) {
      const required = correctionRequested?.kind === 'intent_correction_requested'
        ? correctionRequested.actorFailures.length
        : Number.POSITIVE_INFINITY;
      stage = autoResolved.length === required ? 'auto_resolved' : 'auto_resolving';
    } else if (correctionRequested !== undefined) stage = 'correction_requested';
    else if (fallbackResolved !== undefined) stage = 'fallback_resolved';
    else return null;
    return {
      requestId,
      stage,
      correctionNumber: correctionRequested === undefined ? 0 : MAX_INTENT_CORRECTIONS,
      autoResolvedActorIds: autoResolved.sort((left, right) => left.localeCompare(right)),
    };
  }

  async coordinate(input: {
    readonly initial: InitialIntentAttempt;
    readonly correction: TurnExhaustionCorrectionRuntime;
    readonly host: TurnExhaustionHost;
  }): Promise<TurnExhaustionOutcome> {
    if (input.initial.kind === 'proposal') {
      const proposal = input.initial.proposal;
      const actors = proposal.resolutions.map((entry) => entry.intent.actorId).sort((left, right) => left.localeCompare(right));
      if (!exactProposalActors(proposal, actors, 'initial')) {
        throw new RangeError('Initial round proposal actors are malformed.');
      }
      const authorization = await input.host.authorize(proposal);
      if (authorization === 'authorized') {
        for (const resolution of proposal.resolutions) {
          if (resolution.selectedBranch !== 'fallback') continue;
          this.persistence.record({
            kind: 'intent_fallback_resolved',
            requestId: proposal.requestId,
            proposalId: proposal.proposalId,
            actorId: resolution.intent.actorId,
            resolutionDigest: resolution.resolutionDigest,
          });
        }
        return { kind: 'authorized', proposalId: proposal.proposalId, phase: 'initial' };
      }
      return this.#correctAndResolve({
        requestId: proposal.requestId,
        initialProposalId: proposal.proposalId,
        actorFailures: actors.map((actorId) => ({
          actorId,
          fallbackResult: authorization === 'invalidated' ? 'invalidated' : 'invalid',
        })),
        correction: input.correction,
        host: input.host,
      });
    }
    return this.#correctAndResolve({
      ...input.initial,
      correction: input.correction,
      host: input.host,
    });
  }

  async #correctAndResolve(input: {
    readonly requestId: string;
    readonly initialProposalId: string;
    readonly actorFailures: readonly IntentActorFailure[];
    readonly correction: TurnExhaustionCorrectionRuntime;
    readonly host: TurnExhaustionHost;
  }): Promise<TurnExhaustionOutcome> {
    const failures = exactActorFailures(input.actorFailures);
    const actorIds = failures.map((entry) => entry.actorId);
    const capsuleRequest = input.correction.capsule.request;
    if (
      capsuleRequest === null || capsuleRequest.requestId !== input.requestId ||
      capsuleRequest.phase !== 'correction' ||
      capsuleRequest.correctionNumber !== MAX_INTENT_CORRECTIONS ||
      capsuleRequest.actors.length !== actorIds.length ||
      [...capsuleRequest.actors].sort((left, right) => left.localeCompare(right))
        .some((actor, index) => actor !== actorIds[index])
    ) throw new RangeError('Correction capsule does not describe the single complete correction round.');

    const prior = this.reconstruct(input.requestId);
    if (prior?.stage === 'correction_resolved') {
      const resolved = this.persistence.transitions().find((entry) =>
        entry.kind === 'intent_correction_resolved' && entry.requestId === input.requestId);
      if (resolved?.kind !== 'intent_correction_resolved') throw new Error('Correction reconstruction is inconsistent.');
      return { kind: 'authorized', proposalId: resolved.proposalId, phase: 'correction' };
    }
    if (prior?.stage === 'auto_resolved') {
      return { kind: 'auto_resolved', actorIds: prior.autoResolvedActorIds };
    }
    if (prior?.stage === 'awaiting_dm_adjudication') {
      const failed = this.persistence.transitions().find((entry) =>
        entry.kind === 'intent_auto_resolution_failed' && entry.requestId === input.requestId);
      if (failed?.kind !== 'intent_auto_resolution_failed') throw new Error('Adjudication reconstruction is inconsistent.');
      return { kind: 'awaiting_dm_adjudication', actorId: failed.actorId };
    }

    if (prior === null) {
      this.persistence.record({
        kind: 'intent_correction_requested',
        requestId: input.requestId,
        initialProposalId: input.initialProposalId,
        correctionNumber: MAX_INTENT_CORRECTIONS,
        actorFailures: failures,
      });
      input.correction.activateCapsule();
      const prompt = renderEnginePrompt(
        'correct_intent',
        input.correction.capsule,
        input.correction.rules,
        undefined,
        input.correction.turnContext,
      );
      await input.correction.lifecycle.resumeCorrection(
        { ...input.correction.invocation, prompt },
        input.correction.signal,
      );
    } else if (prior.stage !== 'correction_requested') {
      throw new Error(`Intent exhaustion chain cannot resume from ${prior.stage}.`);
    }

    const proposal = input.correction.takeProposal();
    let correctionResult: IntentCorrectionResult;
    if (proposal === null) correctionResult = 'no_response';
    else if (
      proposal.requestId !== input.requestId ||
      !exactProposalActors(proposal, actorIds, 'correction')
    ) correctionResult = 'invalid';
    else {
      const authorization = await input.host.authorize(proposal);
      if (authorization === 'authorized') {
        this.persistence.record({
          kind: 'intent_correction_resolved',
          requestId: input.requestId,
          proposalId: proposal.proposalId,
          actorIds,
        });
        return { kind: 'authorized', proposalId: proposal.proposalId, phase: 'correction' };
      }
      correctionResult = authorization;
    }
    if (prior?.stage !== 'auto_resolving') {
      this.persistence.record({ kind: 'intent_correction_failed', requestId: input.requestId, result: correctionResult });
    } else {
      const recorded = this.persistence.transitions().find((entry) =>
        entry.kind === 'intent_correction_failed' && entry.requestId === input.requestId);
      if (recorded?.kind !== 'intent_correction_failed') throw new Error('Auto-resolution reconstruction lacks its correction failure.');
      correctionResult = recorded.result;
    }

    const alreadyResolved = new Set(this.reconstruct(input.requestId)?.autoResolvedActorIds ?? []);
    for (const failure of failures) {
      if (alreadyResolved.has(failure.actorId)) continue;
      const resolution = await input.host.resolveDeterministically(failure.actorId);
      if (resolution === null || resolution.actorId !== failure.actorId ||
        !Number.isSafeInteger(resolution.expectedRevision) || resolution.expectedRevision < 1 ||
        !validResolutionDigest(resolution.resolutionDigest)) {
        const reason = 'The deterministic controller could not produce a legal command.';
        this.persistence.record({
          kind: 'intent_auto_resolution_failed',
          requestId: input.requestId,
          actorId: failure.actorId,
          reason,
        });
        input.host.pauseForDmAdjudication({ requestId: input.requestId, actorId: failure.actorId, reason });
        return { kind: 'awaiting_dm_adjudication', actorId: failure.actorId };
      }
      const mark: AutoResolvedIntentMark = {
        runId: input.correction.capsule.runId,
        branchId: input.correction.capsule.branchId,
        expectedRevision: resolution.expectedRevision,
        requestId: input.requestId,
        actorId: failure.actorId,
        initialProposalId: input.initialProposalId,
        fallbackResult: failure.fallbackResult,
        correctionResult,
        controllerResolutionDigest: resolution.resolutionDigest,
      };
      await input.host.applyAutoResolved(resolution, mark);
      this.persistence.record({ kind: 'intent_auto_resolved', ...mark });
    }
    return { kind: 'auto_resolved', actorIds };
  }
}
