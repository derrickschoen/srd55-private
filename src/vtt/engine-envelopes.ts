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
import type { EngineTurnIntent } from './intent-resolver';
import type { ReactionGuidanceDeclaration } from './reaction-guidance';

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

export interface ProposedIntentResolution {
  readonly intent: EngineTurnIntent;
  readonly selectedBranch: 'primary' | 'fallback';
  readonly resolutionDigest: string;
  readonly summary: string;
}

export interface IntentProposalEnvelope extends EngineProposalBinding {
  readonly kind: 'intent_proposal';
  readonly proposalId: string;
  readonly resolution: ProposedIntentResolution;
  readonly reactionGuidance: ReactionGuidanceDeclaration | null;
}

export interface RoundIntentProposalEnvelope extends EngineProposalBinding {
  readonly kind: 'round_intent_proposal';
  readonly proposalId: string;
  readonly resolutions: readonly ProposedIntentResolution[];
  readonly reactionGuidance: ReactionGuidanceDeclaration | null;
}

export type EngineProposalEnvelope =
  | IntentProposalEnvelope
  | RoundIntentProposalEnvelope;

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
  if (capsule.request === null) throw new RangeError('No intent request is pending.');
  const actual = envelope.kind === 'intent_proposal'
    ? [envelope.resolution.intent.actorId]
    : envelope.resolutions.map((resolution) => resolution.intent.actorId);
  if (new Set(actual).size !== actual.length) throw new RangeError('Proposal actors must be unique.');
  if (envelope.kind === 'round_intent_proposal') {
    const expected = [...capsule.request.actors].sort((left, right) => left.localeCompare(right));
    const normalizedActual = [...actual].sort((left, right) => left.localeCompare(right));
    if (
      expected.length !== normalizedActual.length ||
      expected.some((actor, index) => actor !== normalizedActual[index])
    ) throw new RangeError('Round proposal must contain exactly the requested actors.');
  } else if (!capsule.request.actors.includes(actual[0] as CombatantId)) {
    throw new RangeError('Intent proposal actor is not pending.');
  }
  if (
    envelope.phase === 'correction' &&
    (envelope.kind === 'intent_proposal'
      ? envelope.resolution.intent.fallback !== null
      : envelope.resolutions.some((resolution) => resolution.intent.fallback !== null))
  ) throw new RangeError('Correction proposals cannot declare another fallback.');
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
