import { canonicalJson } from '../commands/canonical-json';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import { engineStateHandle, type EngineStateCapsule, type ReadonlyStateCapsuleSource } from './engine-state-capsule';
import type { EngineTurnProposal } from './intent-resolver';
import type { QueuedSpeculativePlanEnvelope, SpeculativePlanSink, SpeculativeRoundPlanV2 } from './speculative-plan-types';

function sameActorSet(left: readonly CombatantId[], right: readonly CombatantId[]): boolean {
  const normalizedLeft = [...left].sort((a, b) => a.localeCompare(b));
  const normalizedRight = [...right].sort((a, b) => a.localeCompare(b));
  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((actor, index) => actor === normalizedRight[index]);
}

function proposalAdvertised(capsule: EngineStateCapsule, proposal: EngineTurnProposal): boolean {
  const actor = capsule.projection.combatants.find((combatant) => combatant.id === proposal.actorId);
  if (actor === undefined || proposal.expectedRevision !== capsule.revision) return false;
  const optionIds = new Set(actor.options.map((option) => option.optionId));
  return optionIds.has(proposal.primaryOptionId) &&
    (proposal.fallbackOptionId === null || optionIds.has(proposal.fallbackOptionId));
}

/** Validates original capsule bytes and queues only revision-bound offered composite options. */
export function submitSpeculativeRoundPlan(
  source: ReadonlyStateCapsuleSource,
  sink: SpeculativePlanSink,
  plan: SpeculativeRoundPlanV2,
): QueuedSpeculativePlanEnvelope {
  const capsule = source.read({ runId: plan.runId, stateHandle: plan.stateHandle, expectedRevision: plan.sourceRevision });
  const request = capsule.request;
  if (request === null || request.phase !== 'speculative') throw new RangeError('SPECULATIVE_REQUEST_MISMATCH');
  if (capsule.branchId !== plan.encounterBranchId || capsule.digest !== plan.sourceDigest ||
    engineStateHandle(capsule) !== plan.stateHandle || request.requestId !== plan.requestId ||
    request.targetRoom !== plan.targetRoom || request.targetMonsterRound !== plan.targetMonsterRound ||
    request.refreshGeneration !== plan.refreshGeneration) throw new RangeError('SPECULATIVE_BINDING_MISMATCH');
  if (plan.branches.length !== request.scenarios.length || plan.branches.some((branch, index) => {
    const scenario = request.scenarios[index];
    return scenario === undefined || branch.scenarioId !== scenario.scenarioId ||
      !sameActorSet(branch.proposals.map((proposal) => proposal.actorId), request.actors) ||
      branch.proposals.some((proposal) => !proposalAdvertised(capsule, proposal));
  })) throw new RangeError('SPECULATIVE_BRANCH_CONTRACT_MISMATCH');
  if (plan.reactionGuidance?.actors.some((entry) => !request.actors.includes(entry.actorId)) === true) {
    throw new RangeError('SPECULATIVE_REACTION_GUIDANCE_ACTOR_MISMATCH');
  }
  const envelope: QueuedSpeculativePlanEnvelope = {
    ...structuredClone(plan), status: 'QUEUED-SPECULATIVE',
    speculativePlanId: `speculative:${sha256(canonicalJson(plan)).slice(0, 48)}`,
    actorIds: [...request.actors], scenarioMenu: structuredClone(request.scenarioMenu),
    scenarios: structuredClone(request.scenarios),
  };
  sink.append(structuredClone(envelope));
  if (source.read({ runId: plan.runId, stateHandle: plan.stateHandle, expectedRevision: plan.sourceRevision }).digest !== capsule.digest) {
    throw new Error('Speculative submission mutated its read-only source capsule.');
  }
  return envelope;
}
