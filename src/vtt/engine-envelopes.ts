import type {
  CombatantId,
  EncounterBranchId,
  EncounterSessionId,
} from '../combat/values';
import {
  verifyEngineStateCapsule,
  type EngineStateReference,
  type ReadonlyStateCapsuleSource,
} from './engine-state-capsule';
import type {
  EngineOfferableOption,
  EngineTurnProposal,
  ResolvedTurnMechanics,
} from './intent-resolver';
import type { ReactionGuidanceDeclaration } from './reaction-guidance';
import type { DmIntelCapture } from './dm-tactical-intel';

export interface EngineProposalBinding {
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly stateDigest: string;
  readonly stateHandle: string;
  readonly phase: 'initial' | 'correction';
  readonly idempotencyKey: string;
}

export interface ProposedTurnResolution {
  readonly proposal: EngineTurnProposal;
  readonly option: EngineOfferableOption;
  readonly primaryOption: EngineOfferableOption;
  readonly fallbackOption: EngineOfferableOption | null;
  readonly mechanics: ResolvedTurnMechanics;
  readonly selectedBranch: 'primary' | 'fallback';
  readonly offerEnvironmentDigest: string;
  readonly resolutionDigest: string;
  readonly summary: string;
  /** Blind intent resolutions must fail closed if their exact primary offer becomes unavailable. */
  readonly strictNoFallback?: true;
}

export interface TurnProposalEnvelope extends EngineProposalBinding {
  readonly kind: 'turn_proposal';
  readonly proposalId: string;
  readonly resolution: ProposedTurnResolution;
  readonly reactionGuidance: ReactionGuidanceDeclaration | null;
}

export interface RoundTurnProposalEnvelope extends EngineProposalBinding {
  readonly kind: 'round_turn_proposal';
  readonly proposalId: string;
  readonly resolutions: readonly ProposedTurnResolution[];
  /** Optional round-level rationale retained verbatim for decision tracing. */
  readonly rationale: string | null;
  readonly reactionGuidance: ReactionGuidanceDeclaration | null;
  /** Validated wire arguments retained for opt-in model-training provenance. */
  readonly submittedArguments?: Readonly<Record<string, unknown>>;
  /** Full-precision offered-set provenance; never rendered into model context. */
  readonly intelCapture?: DmIntelCapture;
}

export interface PlanAdjustmentProposalEnvelope extends EngineProposalBinding {
  readonly kind: 'plan_adjustment_turn_proposal';
  readonly proposalId: string;
  readonly baseline_plan_hash: string;
  /** Omitted open actors retain their baseline proposal; [] explicitly keeps the entire baseline. */
  readonly updates: readonly ProposedTurnResolution[];
  /** Validated wire arguments retained for opt-in model-training provenance. */
  readonly submittedArguments?: Readonly<Record<string, unknown>>;
  /** Full-precision offered-set provenance; never rendered into model context. */
  readonly intelCapture?: DmIntelCapture;
}

export type EngineProposalEnvelope =
  | TurnProposalEnvelope
  | RoundTurnProposalEnvelope
  | PlanAdjustmentProposalEnvelope;

export interface NarrationEnvelope {
  readonly kind: 'narration';
  readonly narrationId: string;
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly stateDigest: string;
  readonly stateHandle: string;
  readonly idempotencyKey: string;
  readonly voice:
    | 'cinematic_visible_rolls'
    | 'terse_tactical'
    | 'rules_explicit'
    | 'terse_rule_citing_validation';
  readonly text: string;
  readonly audience: 'shared' | 'dm_only';
  readonly ruleReferences: readonly {
    readonly ruleId: string;
    readonly sourceLocator: string;
  }[];
}

export interface ProposalSink {
  append(envelope: EngineProposalEnvelope): void;
}

export interface NarrationSink {
  append(envelope: NarrationEnvelope): void;
}

function exactBinding(
  source: ReadonlyStateCapsuleSource,
  envelope: EngineProposalEnvelope | NarrationEnvelope,
): { readonly reference: EngineStateReference; readonly digest: string } {
  const reference: EngineStateReference = {
    runId: envelope.runId,
    stateHandle: envelope.stateHandle,
    expectedRevision: envelope.expectedRevision,
  };
  const capsule = source.read(reference);
  if (capsule.branchId !== envelope.branchId || capsule.digest !== envelope.stateDigest) {
    throw new RangeError('Proposal binding does not match the current branch and state digest.');
  }
  if (capsule.request === null || capsule.request.requestId !== envelope.requestId) {
    throw new RangeError('Proposal binding does not match the current request.');
  }
  if ('phase' in envelope && capsule.request.phase !== envelope.phase) {
    throw new RangeError('Proposal phase does not match the current request.');
  }
  return { reference, digest: capsule.digest };
}

function assertProposalActors(
  source: ReadonlyStateCapsuleSource,
  reference: EngineStateReference,
  envelope: EngineProposalEnvelope,
): void {
  const capsule = source.read(reference);
  const request = capsule.request;
  if (request === null) throw new RangeError('No turn-proposal request is pending.');
  const actual = envelope.kind === 'turn_proposal'
    ? [envelope.resolution.proposal.actorId]
    : envelope.kind === 'round_turn_proposal'
      ? envelope.resolutions.map((resolution) => resolution.proposal.actorId)
      : envelope.updates.map((resolution) => resolution.proposal.actorId);
  if (new Set(actual).size !== actual.length) throw new RangeError('Proposal actors must be unique.');
  if (envelope.kind === 'round_turn_proposal') {
    if (request.phase === 'speculative' || request.kind === 'plan_adjustment') {
      throw new RangeError('Round proposal requires a round-plan request.');
    }
    const expected = [...request.actors].sort((left, right) => left.localeCompare(right));
    const normalizedActual = [...actual].sort((left, right) => left.localeCompare(right));
    if (
      expected.length !== normalizedActual.length ||
      expected.some((actor, index) => actor !== normalizedActual[index])
    ) throw new RangeError('Round proposal must contain exactly the requested actors.');
  } else if (envelope.kind === 'plan_adjustment_turn_proposal') {
    if (request.phase === 'speculative' || request.kind !== 'plan_adjustment') {
      throw new RangeError('Plan adjustment proposal requires a plan-adjustment request.');
    }
    if (envelope.baseline_plan_hash !== request.baselinePlanHash) {
      throw new RangeError('Plan adjustment proposal does not match the baseline plan hash.');
    }
    if (actual.length > request.adjustmentBudget ||
      actual.some((actor) => !request.actors.includes(actor))) {
      throw new RangeError('Plan adjustment updates must be unique open actors within the adjustment budget.');
    }
  } else if (!request.actors.includes(actual[0] as CombatantId)) {
    throw new RangeError('Turn proposal actor is not pending.');
  }
  if (
    envelope.phase === 'correction' &&
    (envelope.kind === 'turn_proposal'
      ? envelope.resolution.proposal.fallbackOptionId !== null
      : envelope.kind === 'round_turn_proposal'
        ? envelope.resolutions.some((resolution) => resolution.proposal.fallbackOptionId !== null)
        : envelope.updates.some((resolution) => resolution.proposal.fallbackOptionId !== null))
  ) throw new RangeError('Correction proposals cannot declare another fallback option.');
}

/** Queue a closed proposal without exposing the capsule projection to the sink. */
export function submitEngineProposal(
  source: ReadonlyStateCapsuleSource,
  sink: ProposalSink,
  envelope: EngineProposalEnvelope,
): void {
  const before = exactBinding(source, envelope);
  assertProposalActors(source, before.reference, envelope);
  sink.append(structuredClone(envelope));
  const after = source.read(before.reference);
  if (
    after.digest !== before.digest ||
    !verifyEngineStateCapsule(after)
  ) throw new Error('Proposal submission mutated the read-only state capsule.');
}

/** Narration is a separate presentation queue and never shares a mechanics payload. */
export function submitEngineNarration(
  source: ReadonlyStateCapsuleSource,
  sink: NarrationSink,
  envelope: NarrationEnvelope,
): void {
  const before = exactBinding(source, envelope);
  if (envelope.text.length < 1 || envelope.text.length > 12_000) {
    throw new RangeError('Narration text must contain 1 to 12,000 characters.');
  }
  if (envelope.ruleReferences.length > 20) {
    throw new RangeError('Narration can cite at most 20 rules.');
  }
  sink.append(structuredClone(envelope));
  if (source.read(before.reference).digest !== before.digest) {
    throw new Error('Narration submission mutated the read-only state capsule.');
  }
}
