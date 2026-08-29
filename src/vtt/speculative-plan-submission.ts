import { canonicalJson } from '../commands/canonical-json';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import {
  engineStateHandle,
  type EngineStateCapsule,
  type ReadonlyStateCapsuleSource,
} from './engine-state-capsule';
import type { EngineTargetSelector } from './engine-query-port';
import type { EngineTurnIntent } from './intent-resolver';
import type {
  QueuedSpeculativePlanEnvelope,
  SpeculativePlanSink,
  SpeculativeRoundPlanV2,
} from './speculative-plan-types';

function sameActorSet(left: readonly CombatantId[], right: readonly CombatantId[]): boolean {
  const normalizedLeft = [...left].sort((a, b) => a.localeCompare(b));
  const normalizedRight = [...right].sort((a, b) => a.localeCompare(b));
  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((actor, index) => actor === normalizedRight[index]);
}

function selectorsInIntent(intent: EngineTurnIntent): readonly EngineTargetSelector[] {
  const branches = [intent, ...(intent.fallback === null ? [] : [intent.fallback])];
  return branches.flatMap((branch) => [
    ...('target' in branch.choice && branch.choice.target !== null ? [branch.choice.target] : []),
    ...(branch.engagement.anchor === undefined || branch.engagement.anchor === null
      ? []
      : [branch.engagement.anchor]),
  ]);
}

function selectorAdvertised(capsule: EngineStateCapsule, selector: EngineTargetSelector): boolean {
  if (selector.kind === 'combatant') {
    return capsule.projection.combatants.some((combatant) => combatant.id === selector.combatantId);
  }
  if (selector.kind === 'enemy_threatening_ally') {
    return capsule.projection.combatants.some((combatant) => combatant.id === selector.allyId);
  }
  return true;
}

function intentAdvertised(capsule: EngineStateCapsule, intent: EngineTurnIntent): boolean {
  const actor = capsule.projection.combatants.find((combatant) => combatant.id === intent.actorId);
  if (actor === undefined || selectorsInIntent(intent).some((selector) => !selectorAdvertised(capsule, selector))) {
    return false;
  }
  const branches = [intent, ...(intent.fallback === null ? [] : [intent.fallback])];
  return branches.every((branch) => {
    switch (branch.choice.kind) {
      case 'attack':
      case 'use_action': {
        const actionId = branch.choice.actionId;
        return actor.actions.some((action) => action.actionId === actionId);
      }
      case 'cast_spell': return actor.actions.some((action) => action.kind === 'spellcasting');
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'end_turn': return true;
    }
  });
}

/** Increment-1 prediction sink: validates original capsule bytes and stores no executable resolution. */
export function submitSpeculativeRoundPlan(
  source: ReadonlyStateCapsuleSource,
  sink: SpeculativePlanSink,
  plan: SpeculativeRoundPlanV2,
): QueuedSpeculativePlanEnvelope {
  const capsule = source.read({
    runId: plan.runId,
    stateHandle: plan.stateHandle,
    expectedRevision: plan.sourceRevision,
  });
  const request = capsule.request;
  if (request === null || request.phase !== 'speculative') throw new RangeError('SPECULATIVE_REQUEST_MISMATCH');
  if (capsule.branchId !== plan.encounterBranchId || capsule.digest !== plan.sourceDigest ||
    engineStateHandle(capsule) !== plan.stateHandle || request.requestId !== plan.requestId ||
    request.targetRoom !== plan.targetRoom || request.targetMonsterRound !== plan.targetMonsterRound ||
    request.refreshGeneration !== plan.refreshGeneration) {
    throw new RangeError('SPECULATIVE_BINDING_MISMATCH');
  }
  if (plan.branches.length !== request.scenarios.length || plan.branches.some((branch, index) => {
    const scenario = request.scenarios[index];
    return scenario === undefined || branch.scenarioId !== scenario.scenarioId ||
      !sameActorSet(branch.intents.map((intent) => intent.actorId), request.actors) ||
      branch.intents.some((intent) => !intentAdvertised(capsule, intent));
  })) throw new RangeError('SPECULATIVE_BRANCH_CONTRACT_MISMATCH');
  if (plan.reactionGuidance?.actors.some((entry) => !request.actors.includes(entry.actorId)) === true) {
    throw new RangeError('SPECULATIVE_REACTION_GUIDANCE_ACTOR_MISMATCH');
  }
  const envelope: QueuedSpeculativePlanEnvelope = {
    ...structuredClone(plan),
    status: 'QUEUED-SPECULATIVE',
    speculativePlanId: `speculative:${sha256(canonicalJson(plan)).slice(0, 48)}`,
    actorIds: [...request.actors],
    scenarioMenu: structuredClone(request.scenarioMenu),
    scenarios: structuredClone(request.scenarios),
  };
  sink.append(structuredClone(envelope));
  if (source.read({
    runId: plan.runId,
    stateHandle: plan.stateHandle,
    expectedRevision: plan.sourceRevision,
  }).digest !== capsule.digest) {
    throw new Error('Speculative submission mutated its read-only source capsule.');
  }
  return envelope;
}
