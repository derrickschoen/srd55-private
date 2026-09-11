import type { CombatantId } from '../combat/values';
import type { AgentInvocation } from './agent-session';
import type { AgentDispatchDeadline } from './agent-session-lifecycle';
import type { RoundTurnProposalEnvelope } from './engine-envelopes';
import type { EngineStateCapsule } from './engine-state-capsule';
import {
  renderEnginePrompt,
  type AllowlistedRulesSource,
} from './mcp/engine-server';

export const MAX_PROPOSAL_CORRECTIONS = 1 as const;

export type ProposalFallbackResult = 'invalid' | 'invalidated' | 'absent';
export type ProposalCorrectionResult = 'invalid' | 'invalidated' | 'no_response';

export interface ProposalActorFailure {
  readonly actorId: CombatantId;
  readonly fallbackResult: ProposalFallbackResult;
}

export interface AutoResolvedProposalMark {
  readonly runId: string;
  readonly branchId: string;
  readonly expectedRevision: number;
  readonly requestId: string;
  readonly actorId: CombatantId;
  readonly initialProposalId: string;
  readonly fallbackResult: ProposalFallbackResult;
  readonly correctionResult: ProposalCorrectionResult;
  readonly controllerResolutionDigest: string;
}

export type TurnExhaustionTransition =
  | {
      readonly kind: 'proposal_fallback_resolved';
      readonly requestId: string;
      readonly proposalId: string;
      readonly actorId: CombatantId;
      readonly resolutionDigest: string;
    }
  | {
      readonly kind: 'proposal_correction_requested';
      readonly requestId: string;
      readonly initialProposalId: string;
      readonly correctionNumber: typeof MAX_PROPOSAL_CORRECTIONS;
      readonly actorFailures: readonly ProposalActorFailure[];
    }
  | {
      readonly kind: 'proposal_correction_resolved';
      readonly requestId: string;
      readonly proposalId: string;
      readonly actorIds: readonly CombatantId[];
    }
  | {
      readonly kind: 'proposal_correction_failed';
      readonly requestId: string;
      readonly result: ProposalCorrectionResult;
    }
  | ({ readonly kind: 'proposal_auto_resolved' } & AutoResolvedProposalMark)
  | {
      readonly kind: 'proposal_auto_resolution_failed';
      readonly requestId: string;
      readonly actorId: CombatantId;
      readonly reason: string;
    };

export interface TurnExhaustionPersistence {
  transitions(): readonly TurnExhaustionTransition[];
  record(transition: TurnExhaustionTransition): void;
}

export interface DeterministicProposalResolution {
  readonly actorId: CombatantId;
  readonly expectedRevision: number;
  readonly resolutionDigest: string;
}

export interface TurnExhaustionCorrectionRuntime {
  readonly capsule: EngineStateCapsule;
  readonly rules: AllowlistedRulesSource;
  readonly turnContext: unknown;
  readonly lifecycle: {
    resumeCorrection(
      invocation: AgentInvocation,
      deadline: AgentDispatchDeadline,
    ): Promise<CorrectionTurnObservation>;
  };
  readonly invocation: AgentInvocation;
  /** Makes the correction capsule authoritative before the resume is dispatched. */
  activateCapsule(): void;
  /** Removes at most one proposal from the host-owned spool for this request. */
  takeProposal(): RoundTurnProposalEnvelope | null;
  /** True only when this correction produced explicit engine/structured validation evidence. */
  validationFailureObserved(): boolean;
}

export type ProposalEscalationTrigger = 'refusal' | 'validation_failures';

export interface TurnExhaustionEscalationRuntime {
  /** Trigger already observed before correction; correction can independently refuse. */
  readonly trigger: ProposalEscalationTrigger | null;
  readonly capsule: EngineStateCapsule;
  readonly rules: AllowlistedRulesSource;
  readonly turnContext: unknown;
  readonly lifecycle: {
    startEscalation(
      invocation: AgentInvocation,
      deadline: AgentDispatchDeadline,
    ): Promise<CorrectionTurnObservation>;
  };
  readonly invocation: AgentInvocation;
  activateCapsule(trigger: ProposalEscalationTrigger): void;
  takeProposal(): RoundTurnProposalEnvelope | null;
}

export interface TurnExhaustionHost {
  authorize(proposal: RoundTurnProposalEnvelope): Promise<'authorized' | 'invalidated' | 'invalid'>;
  resolveDeterministically(actorId: CombatantId): Promise<DeterministicProposalResolution | null>;
  /** Applies the ordinary authoritative commands and the host-only mark as one host transaction. */
  applyAutoResolved(
    resolution: DeterministicProposalResolution,
    mark: AutoResolvedProposalMark,
  ): Promise<void>;
  pauseForDmAdjudication(input: {
    readonly requestId: string;
    readonly actorId: CombatantId;
    readonly reason: string;
  }): void;
}

type CorrectionTurnObservation =
  | { readonly exit: 'completed'; readonly finalText: string }
  | { readonly exit: 'cancelled' | 'timed_out' }
  | { readonly exit: 'infrastructure_failed'; readonly component: 'engine_mcp_startup' };

function explicitlyRefusedTurn(turn: CorrectionTurnObservation): boolean {
  if (turn.exit !== 'completed') return false;
  const text = turn.finalText.trim();
  return /^(?:(?:i|we)\s+)?(?:(?:must|have to)\s+)?(?:refuse|decline)\b/iu.test(text) ||
    /^(?:(?:i|we)\s+)?(?:cannot|can't|am unable to|are unable to)\b/iu.test(text);
}

export type InitialProposalAttempt =
  | {
      readonly kind: 'proposal';
      readonly proposal: RoundTurnProposalEnvelope;
    }
  | {
      readonly kind: 'exhausted';
      readonly requestId: string;
      readonly initialProposalId: string;
      readonly actorFailures: readonly ProposalActorFailure[];
    };

export type TurnExhaustionOutcome =
  | { readonly kind: 'authorized'; readonly proposalId: string; readonly phase: 'initial' | 'correction' }
  | { readonly kind: 'auto_resolved'; readonly actorIds: readonly CombatantId[] }
  | { readonly kind: 'awaiting_dm_adjudication'; readonly actorId: CombatantId }
  | {
      readonly kind: 'refused';
      readonly reason: 'host_authorization_failed' | 'round_deadline_expired' | 'no_proposal' | 'resolver_rejected' | 'correction_cancelled' | 'correction_timeout';
      readonly attemptConsumed: true;
    }
  | { readonly kind: 'infrastructure_failed'; readonly component: 'engine_mcp_startup' };

function roundDeadlineRefusal(): Extract<TurnExhaustionOutcome, { readonly kind: 'refused' }> {
  return { kind: 'refused', reason: 'round_deadline_expired', attemptConsumed: true };
}

export type AuthorizationFailurePolicy =
  | { readonly kind: 'correct_with_dm_protocol' }
  | { readonly kind: 'refuse_blind' };

export type CorrectionPromptRenderer = typeof renderEnginePrompt;

export interface ReconstructedTurnExhaustionState {
  readonly requestId: string;
  readonly stage:
    | 'fallback_resolved'
    | 'correction_requested'
    | 'correction_resolved'
    | 'auto_resolving'
    | 'auto_resolved'
    | 'awaiting_dm_adjudication';
  readonly correctionNumber: 0 | typeof MAX_PROPOSAL_CORRECTIONS;
  readonly autoResolvedActorIds: readonly CombatantId[];
}

function exactActorFailures(failures: readonly ProposalActorFailure[]): readonly ProposalActorFailure[] {
  if (failures.length === 0) throw new RangeError('Proposal exhaustion requires at least one actor.');
  const sorted = [...failures].sort((left, right) => left.actorId.localeCompare(right.actorId));
  if (sorted.some((entry, index) => entry.actorId === sorted[index - 1]?.actorId)) {
    throw new RangeError('Proposal exhaustion actors must be unique.');
  }
  return sorted;
}

function exactProposalActors(
  proposal: RoundTurnProposalEnvelope,
  actors: readonly CombatantId[],
  phase: 'initial' | 'correction',
): boolean {
  if (proposal.phase !== phase || proposal.resolutions.some((entry) =>
    (phase === 'correction' && entry.proposal.fallbackOptionId !== null) ||
    (entry.selectedBranch === 'fallback' && entry.proposal.fallbackOptionId === null))) return false;
  const actual = proposal.resolutions.map((entry) => entry.proposal.actorId).sort((left, right) => left.localeCompare(right));
  return new Set(actual).size === actual.length && actual.length === actors.length &&
    proposal.resolutions.every((entry) => validResolutionDigest(entry.resolutionDigest)) &&
    actual.every((actor, index) => actor === actors[index]);
}

function validResolutionDigest(digest: string): boolean {
  return /^[a-f\d]{64,128}$/u.test(digest);
}

export class TurnExhaustionCoordinator {
  constructor(
    private readonly persistence: TurnExhaustionPersistence,
    private readonly renderCorrection: CorrectionPromptRenderer = renderEnginePrompt,
  ) {}

  reconstruct(requestId: string): ReconstructedTurnExhaustionState | null {
    const transitions = this.persistence.transitions().filter((entry) => entry.requestId === requestId);
    if (transitions.length === 0) return null;
    const correctionRequested = transitions.find((entry) => entry.kind === 'proposal_correction_requested');
    const correctionResolved = transitions.find((entry) => entry.kind === 'proposal_correction_resolved');
    const correctionFailed = transitions.find((entry) => entry.kind === 'proposal_correction_failed');
    const failed = transitions.find((entry) => entry.kind === 'proposal_auto_resolution_failed');
    const autoResolved = transitions.flatMap((entry) => entry.kind === 'proposal_auto_resolved' ? [entry.actorId] : []);
    const fallbackResolved = transitions.find((entry) => entry.kind === 'proposal_fallback_resolved');
    let stage: ReconstructedTurnExhaustionState['stage'];
    if (failed !== undefined) stage = 'awaiting_dm_adjudication';
    else if (correctionResolved !== undefined) stage = 'correction_resolved';
    else if (correctionFailed !== undefined) {
      const required = correctionRequested?.kind === 'proposal_correction_requested'
        ? correctionRequested.actorFailures.length
        : Number.POSITIVE_INFINITY;
      stage = autoResolved.length === required ? 'auto_resolved' : 'auto_resolving';
    } else if (correctionRequested !== undefined) stage = 'correction_requested';
    else if (fallbackResolved !== undefined) stage = 'fallback_resolved';
    else return null;
    return {
      requestId,
      stage,
      correctionNumber: correctionRequested === undefined ? 0 : MAX_PROPOSAL_CORRECTIONS,
      autoResolvedActorIds: autoResolved.sort((left, right) => left.localeCompare(right)),
    };
  }

  async coordinate(input: {
    readonly initial: InitialProposalAttempt;
    readonly correction: TurnExhaustionCorrectionRuntime;
    readonly escalation?: TurnExhaustionEscalationRuntime | null;
    readonly deadline?: AgentDispatchDeadline;
    readonly host: TurnExhaustionHost;
    readonly authorizationFailurePolicy?: AuthorizationFailurePolicy;
  }): Promise<TurnExhaustionOutcome> {
    if (input.initial.kind === 'proposal') {
      const proposal = input.initial.proposal;
      const actors = proposal.resolutions.map((entry) => entry.proposal.actorId).sort((left, right) => left.localeCompare(right));
      if (!exactProposalActors(proposal, actors, 'initial')) {
        throw new RangeError('Initial round proposal actors are malformed.');
      }
      if (input.deadline?.acceptsCompletion() === false) {
        return roundDeadlineRefusal();
      }
      const authorization = await input.host.authorize(proposal);
      if (authorization === 'authorized') {
        for (const resolution of proposal.resolutions) {
          if (resolution.selectedBranch !== 'fallback') continue;
          this.persistence.record({
            kind: 'proposal_fallback_resolved',
            requestId: proposal.requestId,
            proposalId: proposal.proposalId,
            actorId: resolution.proposal.actorId,
            resolutionDigest: resolution.resolutionDigest,
          });
        }
        return { kind: 'authorized', proposalId: proposal.proposalId, phase: 'initial' };
      }
      if (input.authorizationFailurePolicy?.kind === 'refuse_blind') {
        return { kind: 'refused', reason: 'host_authorization_failed', attemptConsumed: true };
      }
      if (input.deadline === undefined) {
        throw new Error('Proposal correction requires a conversation round deadline.');
      }
      return this.#correctAndResolve({
        requestId: proposal.requestId,
        initialProposalId: proposal.proposalId,
        actorFailures: actors.map((actorId) => ({
          actorId,
          fallbackResult: authorization === 'invalidated' ? 'invalidated' : 'invalid',
        })),
        correction: input.correction,
        escalation: input.escalation ?? null,
        deadline: input.deadline,
        host: input.host,
      });
    }
    if (input.authorizationFailurePolicy?.kind === 'refuse_blind') {
      return {
        kind: 'refused',
        reason: input.initial.actorFailures.some((failure) => failure.fallbackResult !== 'absent')
          ? 'resolver_rejected'
          : 'no_proposal',
        attemptConsumed: true,
      };
    }
    if (input.deadline === undefined) {
      throw new Error('Proposal correction requires a conversation round deadline.');
    }
    return this.#correctAndResolve({
      ...input.initial,
      correction: input.correction,
      escalation: input.escalation ?? null,
      deadline: input.deadline,
      host: input.host,
    });
  }

  async #correctAndResolve(input: {
    readonly requestId: string;
    readonly initialProposalId: string;
    readonly actorFailures: readonly ProposalActorFailure[];
    readonly correction: TurnExhaustionCorrectionRuntime;
    readonly escalation: TurnExhaustionEscalationRuntime | null;
    readonly deadline: AgentDispatchDeadline;
    readonly host: TurnExhaustionHost;
  }): Promise<TurnExhaustionOutcome> {
    const failures = exactActorFailures(input.actorFailures);
    const actorIds = failures.map((entry) => entry.actorId);
    const capsuleRequest = input.correction.capsule.request;
    if (
      capsuleRequest === null || capsuleRequest.requestId !== input.requestId ||
      capsuleRequest.phase !== 'correction' ||
      capsuleRequest.correctionNumber !== MAX_PROPOSAL_CORRECTIONS ||
      capsuleRequest.actors.length !== actorIds.length ||
      [...capsuleRequest.actors].sort((left, right) => left.localeCompare(right))
        .some((actor, index) => actor !== actorIds[index])
    ) throw new RangeError('Correction capsule does not describe the single complete correction round.');

    const prior = this.reconstruct(input.requestId);
    if (prior?.stage === 'correction_resolved') {
      const resolved = this.persistence.transitions().find((entry) =>
        entry.kind === 'proposal_correction_resolved' && entry.requestId === input.requestId);
      if (resolved?.kind !== 'proposal_correction_resolved') throw new Error('Correction reconstruction is inconsistent.');
      return { kind: 'authorized', proposalId: resolved.proposalId, phase: 'correction' };
    }
    if (prior?.stage === 'auto_resolved') {
      return { kind: 'auto_resolved', actorIds: prior.autoResolvedActorIds };
    }
    if (prior?.stage === 'awaiting_dm_adjudication') {
      const failed = this.persistence.transitions().find((entry) =>
        entry.kind === 'proposal_auto_resolution_failed' && entry.requestId === input.requestId);
      if (failed?.kind !== 'proposal_auto_resolution_failed') throw new Error('Adjudication reconstruction is inconsistent.');
      return { kind: 'awaiting_dm_adjudication', actorId: failed.actorId };
    }

    let correctionResult: ProposalCorrectionResult = 'no_response';
    let correctionValidationFailed = false;
    let correctionExplicitRefusal = false;
    let correctedProposal: RoundTurnProposalEnvelope | null = null;
    if (prior === null) {
      this.persistence.record({
        kind: 'proposal_correction_requested',
        requestId: input.requestId,
        initialProposalId: input.initialProposalId,
        correctionNumber: MAX_PROPOSAL_CORRECTIONS,
        actorFailures: failures,
      });
      const directEscalation = input.escalation?.trigger === 'refusal'
        ? input.escalation
        : null;
      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
      if (directEscalation === null) {
        input.correction.activateCapsule();
        const prompt = input.correction.invocation.output.kind === 'structured_final'
          ? input.correction.invocation.prompt
          : this.renderCorrection(
              'correct_proposal',
              input.correction.capsule,
              input.correction.rules,
              undefined,
              input.correction.turnContext,
            );
        const correctionTurn = await input.correction.lifecycle.resumeCorrection(
          { ...input.correction.invocation, prompt },
          input.deadline,
        );
        switch (correctionTurn.exit) {
          case 'completed':
            correctionExplicitRefusal = explicitlyRefusedTurn(correctionTurn);
            if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
            correctedProposal = input.correction.takeProposal();
            break;
          case 'cancelled':
            return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
          case 'timed_out':
            return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
          case 'infrastructure_failed':
            return { kind: 'infrastructure_failed', component: correctionTurn.component };
        }
      } else {
        directEscalation.activateCapsule('refusal');
        const prompt = correctionPrompt(directEscalation);
        const escalationTurn = await directEscalation.lifecycle.startEscalation(
          { ...directEscalation.invocation, prompt },
          input.deadline,
        );
        switch (escalationTurn.exit) {
          case 'completed':
            if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
            correctedProposal = directEscalation.takeProposal();
            break;
          case 'cancelled':
            return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
          case 'timed_out':
            return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
          case 'infrastructure_failed':
            return { kind: 'infrastructure_failed', component: escalationTurn.component };
        }
      }
    } else if (prior.stage !== 'correction_requested') {
      throw new Error(`Proposal exhaustion chain cannot resume from ${prior.stage}.`);
    } else {
      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
      correctedProposal = input.correction.takeProposal();
    }

    let proposal = correctedProposal;
    if (proposal === null) {
      correctionResult = 'no_response';
      correctionValidationFailed = input.correction.validationFailureObserved();
    }
    else if (
      proposal.requestId !== input.requestId ||
      !exactProposalActors(proposal, actorIds, 'correction')
    ) {
      correctionResult = 'invalid';
      correctionValidationFailed = true;
    }
    else {
      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
      const authorization = await input.host.authorize(proposal);
      if (authorization === 'authorized') {
        this.persistence.record({
          kind: 'proposal_correction_resolved',
          requestId: input.requestId,
          proposalId: proposal.proposalId,
          actorIds,
        });
        return { kind: 'authorized', proposalId: proposal.proposalId, phase: 'correction' };
      } else {
        correctionResult = authorization;
        correctionValidationFailed = true;
      }
    }

    const correctionEscalationTrigger: ProposalEscalationTrigger | null = correctionExplicitRefusal
      ? 'refusal'
      : input.escalation?.trigger === 'validation_failures' && correctionValidationFailed
        ? 'validation_failures'
        : null;
    if (input.escalation !== undefined && input.escalation !== null && correctionEscalationTrigger !== null) {
      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
      input.escalation.activateCapsule(correctionEscalationTrigger);
      const prompt = correctionPrompt(input.escalation);
      const escalationTurn = await input.escalation.lifecycle.startEscalation(
        { ...input.escalation.invocation, prompt },
        input.deadline,
      );
      switch (escalationTurn.exit) {
        case 'completed': break;
        case 'cancelled':
          return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
        case 'timed_out':
          return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
        case 'infrastructure_failed':
          return { kind: 'infrastructure_failed', component: escalationTurn.component };
      }
      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
      proposal = input.escalation.takeProposal();
      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
      if (proposal !== null && proposal.requestId === input.requestId &&
        exactProposalActors(proposal, actorIds, 'correction')) {
        const authorization = await input.host.authorize(proposal);
        if (authorization === 'authorized') {
          this.persistence.record({
            kind: 'proposal_correction_resolved',
            requestId: input.requestId,
            proposalId: proposal.proposalId,
            actorIds,
          });
          return { kind: 'authorized', proposalId: proposal.proposalId, phase: 'correction' };
        }
        correctionResult = authorization;
      } else {
        correctionResult = proposal === null ? 'no_response' : 'invalid';
      }
    }
    if (prior?.stage !== 'auto_resolving') {
      this.persistence.record({ kind: 'proposal_correction_failed', requestId: input.requestId, result: correctionResult });
    } else {
      const recorded = this.persistence.transitions().find((entry) =>
        entry.kind === 'proposal_correction_failed' && entry.requestId === input.requestId);
      if (recorded?.kind !== 'proposal_correction_failed') throw new Error('Auto-resolution reconstruction lacks its correction failure.');
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
          kind: 'proposal_auto_resolution_failed',
          requestId: input.requestId,
          actorId: failure.actorId,
          reason,
        });
        input.host.pauseForDmAdjudication({ requestId: input.requestId, actorId: failure.actorId, reason });
        return { kind: 'awaiting_dm_adjudication', actorId: failure.actorId };
      }
      const mark: AutoResolvedProposalMark = {
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
      this.persistence.record({ kind: 'proposal_auto_resolved', ...mark });
    }
    return { kind: 'auto_resolved', actorIds };
  }
}

function correctionPrompt(
  runtime: Pick<TurnExhaustionCorrectionRuntime, 'invocation' | 'capsule' | 'rules' | 'turnContext'>,
): string {
  return runtime.invocation.output.kind === 'structured_final'
    ? runtime.invocation.prompt
    : renderEnginePrompt(
        'correct_proposal',
        runtime.capsule,
        runtime.rules,
        undefined,
        runtime.turnContext,
      );
}
