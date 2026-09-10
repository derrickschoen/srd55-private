import { describe, expect, it } from 'vitest';
import type { CombatantId } from '../../../src/combat/values';
import { agentSessionIdFromCli } from '../../../src/vtt/agent-session';
import type {
  PlanAdjustmentProposalEnvelope,
  ProposedTurnResolution,
} from '../../../src/vtt/engine-envelopes';
import { engineActionId, engineOptionId } from '../../../src/vtt/turn-proposal';
import type { EngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
import { createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import {
  AdjustmentExhaustionCoordinator,
  type AdjustmentCorrectionRuntime,
  type AdjustmentExhaustionTransition,
  type InitialAdjustmentAttempt,
} from '../../../src/vtt/adjustment-exhaustion-coordinator';

function journal(initial: readonly AdjustmentExhaustionTransition[] = []) {
  const transitions = [...initial];
  return {
    transitions: () => transitions,
    record: (transition: AdjustmentExhaustionTransition) => { transitions.push(structuredClone(transition)); },
  };
}

function resolution(actorId: CombatantId, fallback = false): ProposedTurnResolution {
  const option = {
    optionId: engineOptionId(`option:${actorId}:dodge`), actorId, revision: 1, label: 'Dodge',
    movement: {
      preference: { willingness: 'none' as const, maximumFeet: 0, opportunityRisk: 'avoid' as const },
      engagement: { stance: 'hold_position' as const },
    },
    actionSlots: [{ slot: 'main' as const, use: { kind: 'dodge' as const } }],
    resourceCostLabels: [],
    omittedRiders: [],
  };
  return {
    proposal: {
      actorId, expectedRevision: 1, primaryOptionId: option.optionId,
      fallbackOptionId: fallback ? engineOptionId(`option:${actorId}:fallback`) : null,
      reason: 'Exercise the adjustment exhaustion fixture.',
      overrideJustification: null,
    },
    option,
    primaryOption: option,
    fallbackOption: fallback ? { ...option, optionId: engineOptionId(`option:${actorId}:fallback`) } : null,
    mechanics: {
      actorId, optionId: option.optionId, movementCostFeet: 0, path: [], finalPosition: { column: 0, row: 0 },
      actionSlots: [{ slot: 'main', kind: 'dodge', actionId: engineActionId('dodge'), spellId: null, targetIds: [], objectId: null, omittedRiders: [] }],
      omittedRiders: [],
    },
    selectedBranch: 'primary',
    resolutionDigest: 'c'.repeat(64),
    summary: 'The actor holds its position.',
  };
}

function proposal(input: {
  readonly capsule: EngineStateCapsule;
  readonly phase: 'initial' | 'correction';
  readonly actorId: CombatantId;
  readonly fallback?: boolean;
  readonly id: string;
}): PlanAdjustmentProposalEnvelope {
  const capsule = input.capsule;
  if (capsule.request === null || capsule.request.phase === 'speculative' || capsule.request.kind !== 'plan_adjustment') {
    throw new Error('Adjustment proposal fixture requires adjustment metadata.');
  }
  return {
    kind: 'plan_adjustment_turn_proposal',
    proposalId: input.id,
    runId: capsule.runId,
    branchId: capsule.branchId,
    requestId: capsule.request.requestId,
    expectedRevision: capsule.revision,
    stateDigest: capsule.digest,
    stateHandle: `engine-state:${capsule.digest}`,
    phase: input.phase,
    idempotencyKey: `idempotency:${input.id}`,
    baseline_plan_hash: capsule.request.baselinePlanHash,
    updates: [resolution(input.actorId, input.fallback)],
  };
}

async function fixture() {
  const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
  const actors = state.combatants
    .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
    .map((candidate) => candidate.profile.id)
    .sort();
  const first = actors[0];
  const second = actors[1];
  if (first === undefined || second === undefined) throw new Error('Adjustment coordinator fixture requires two monsters.');
  const metadata = (selected: readonly CombatantId[]) => ({
    parentPlanId: 'plan:adjustment-coordinator',
    baselinePlanHash: 'a'.repeat(64),
    triggerPcTurnId: 'pc-turn:adjustment-coordinator',
    beforeRevision: 1,
    afterRevision: 2,
    materialityReasonCodes: ['PROPOSAL_RESOLUTION_CHANGED'] as const,
    baselineProposalDigests: selected.map((actorId) => ({ actorId, proposalDigest: 'b'.repeat(64) })),
    adjustmentBudget: Math.min(selected.length, 2) as 1 | 2,
  });
  const initialRuntime = createEngineMcpRuntime(state, {
    requestKind: 'plan_adjustment',
    requestedActorIds: [first, second],
    planAdjustment: metadata([first, second]),
  });
  const correctionRuntime = createEngineMcpRuntime(state, {
    requestKind: 'plan_adjustment',
    requestedActorIds: [second],
    planAdjustment: metadata([second]),
    phase: 'correction',
    correctionNumber: 1,
  });
  const initial: InitialAdjustmentAttempt = {
    requestId: 'request:engine-mcp',
    baselinePlanHash: 'a'.repeat(64),
    openActorIds: [first, second],
    stagedProposal: proposal({ capsule: initialRuntime.feed.current(), phase: 'initial', actorId: first, fallback: true, id: 'proposal:staged' }),
    refusedActorIds: [second],
  };
  return { first, second, initial, initialRuntime, correctionRuntime };
}

function correction(
  capsule: EngineStateCapsule,
  queued: PlanAdjustmentProposalEnvelope[],
  dispatches: string[],
  activations: { value: number },
): AdjustmentCorrectionRuntime {
  return {
    capsule,
    rules: { get: () => null },
    turnContext: { request: { kind: 'plan_adjustment', phase: 'correction' } },
    lifecycle: {
      resumeCorrection: (invocation) => {
        dispatches.push(invocation.prompt);
        return Promise.resolve({
          resumeSessionId: agentSessionIdFromCli('SIMULATED-adjustment-session'),
          sessionId: null,
          finalText: '',
          usage: null,
          exit: 'completed' as const,
          processEvidence: null,
          engineCatalogEvidence: null,
          partialResultEvidence: { status: 'complete' as const, decodedEventCount: 0 },
        });
      },
    },
    invocation: {
      instructionSource: 'none',
      skill: null,
      runId: capsule.runId,
      prompt: 'must be replaced',
      model: 'SIMULATED-model',
      reasoningEffort: 'SIMULATED-effort',
      sessionProfile: 'test',
      callPhase: 'correction',
      output: { kind: 'tool_driven' },
      launcherToken: 'SIMULATED-launcher-token',
      timeoutMs: null,
    },
    signal: new AbortController().signal,
    activateCapsule: () => { activations.value += 1; },
    takeProposal: () => queued.shift() ?? null,
  };
}

describe('plan adjustment correction and exhaustion coordinator', () => {
  it('retains partial staging and combines one accepted correction without synthesizing Dodge', async () => {
    const f = await fixture();
    const transitions = journal();
    const dispatches: string[] = [];
    const activations = { value: 0 };
    const queued = [proposal({
      capsule: f.correctionRuntime.feed.current(),
      phase: 'correction',
      actorId: f.second,
      id: 'proposal:corrected',
    })];
    const coordinator = new AdjustmentExhaustionCoordinator(transitions);

    await expect(coordinator.coordinate({
      initial: f.initial,
      correction: correction(f.correctionRuntime.feed.current(), queued, dispatches, activations),
    })).resolves.toMatchObject({
      kind: 'adjusted',
      stagedActorIds: [f.first],
      correctedActorIds: [f.second],
      baselineActorIds: [],
      correctionResult: 'accepted',
    });
    expect(activations.value).toBe(1);
    expect(dispatches).toHaveLength(1);
    expect(dispatches[0]).toContain('Correct only the refused plan-adjustment actors once');
    expect(dispatches[0]).toContain('fallback_option_id must be null');
    expect(transitions.transitions().filter((entry) => entry.kind === 'adjustment_correction_requested')).toHaveLength(1);
  });

  it('preserves a structured-final correction prompt instead of rendering an engine-tool correction (mutation: overwrite indexed correction prompt)', async () => {
    const f = await fixture();
    const dispatches: string[] = [];
    const queued = [proposal({
      capsule: f.correctionRuntime.feed.current(),
      phase: 'correction',
      actorId: f.second,
      id: 'proposal:structured-correction',
    })];
    const base = correction(f.correctionRuntime.feed.current(), queued, dispatches, { value: 0 });
    const runtime: AdjustmentCorrectionRuntime = {
      ...base,
      invocation: {
        ...base.invocation,
        prompt: '[TURN_CONTEXT]\npre-rendered\n[DECISION_CATALOG]\nindexed',
        output: {
          kind: 'structured_final',
          schemaPath: '/tmp/SIMULATED-adjustment-final-schema.json',
          decisionEncoding: 'indices',
          engineTools: 'disabled',
        },
      },
    };

    await new AdjustmentExhaustionCoordinator(journal()).coordinate({ initial: f.initial, correction: runtime });

    expect(dispatches).toEqual(['[TURN_CONTEXT]\npre-rendered\n[DECISION_CATALOG]\nindexed']);
  });

  it('keeps refused actors on their baseline while preserving staged updates after correction failure', async () => {
    const f = await fixture();
    const coordinator = new AdjustmentExhaustionCoordinator(journal());
    const outcome = await coordinator.coordinate({
      initial: f.initial,
      correction: correction(f.correctionRuntime.feed.current(), [], [], { value: 0 }),
    });

    expect(outcome).toMatchObject({
      kind: 'adjusted',
      stagedActorIds: [f.first],
      correctedActorIds: [],
      baselineActorIds: [f.second],
      correctionResult: 'no_response',
    });
    expect(outcome.updates).toHaveLength(1);
    expect(outcome.updates[0]?.proposal.actorId).toBe(f.first);
  });

  it('does not consume a correction proposal staged before timeout and retains the authorized baseline', async () => {
    const f = await fixture();
    const queued = [proposal({
      capsule: f.correctionRuntime.feed.current(), phase: 'correction', actorId: f.second,
      id: 'proposal:staged-before-timeout',
    })];
    const runtime = correction(f.correctionRuntime.feed.current(), queued, [], { value: 0 });
    let proposalReads = 0;
    const outcome = await new AdjustmentExhaustionCoordinator(journal()).coordinate({
      initial: f.initial,
      correction: {
        ...runtime,
        lifecycle: { resumeCorrection: () => Promise.resolve({
          resumeSessionId: agentSessionIdFromCli('SIMULATED-adjustment-timeout'),
          sessionId: null, finalText: 'partial', usage: null, exit: 'timed_out' as const,
          timeoutMs: 1_000, processEvidence: null, engineCatalogEvidence: null,
          partialResultEvidence: {
            status: 'partial' as const, decodedEventCount: 1, finalTextFragment: 'partial',
            observedUsage: null, stagedInvocationIds: ['staged-adjustment'],
          },
        }) },
        takeProposal: () => { proposalReads += 1; return queued.shift() ?? null; },
      },
    });

    expect(outcome).toMatchObject({
      kind: 'adjusted', correctionResult: 'timed_out',
      stagedActorIds: [f.first], correctedActorIds: [], baselineActorIds: [f.second],
    });
    expect(proposalReads).toBe(0);
    expect(queued).toHaveLength(1);
  });

  it('leaves the complete baseline plan standing when no usable update survives', async () => {
    const f = await fixture();
    const initial = { ...f.initial, stagedProposal: null };
    const outcome = await new AdjustmentExhaustionCoordinator(journal()).coordinate({
      initial,
      correction: correction(f.correctionRuntime.feed.current(), [], [], { value: 0 }),
    });

    expect(outcome).toEqual({
      kind: 'baseline_kept',
      requestId: 'request:engine-mcp',
      baselinePlanHash: 'a'.repeat(64),
      updates: [],
      stagedActorIds: [],
      correctedActorIds: [],
      baselineActorIds: [f.first, f.second].sort(),
      correctionResult: 'no_response',
    });
  });

  it('rejects a correction fallback and exhausts to baseline for that actor', async () => {
    const f = await fixture();
    const malformed = proposal({
      capsule: f.correctionRuntime.feed.current(),
      phase: 'correction',
      actorId: f.second,
      fallback: true,
      id: 'proposal:invalid-correction',
    });
    const outcome = await new AdjustmentExhaustionCoordinator(journal()).coordinate({
      initial: f.initial,
      correction: correction(f.correctionRuntime.feed.current(), [malformed], [], { value: 0 }),
    });

    expect(outcome).toMatchObject({
      kind: 'adjusted',
      stagedActorIds: [f.first],
      correctedActorIds: [],
      baselineActorIds: [f.second],
      correctionResult: 'invalid',
    });
  });

  it('resumes after the correction-request transition without dispatching a second correction', async () => {
    const f = await fixture();
    const transitions = journal([{
      kind: 'adjustment_correction_requested',
      requestId: 'request:engine-mcp',
      baselinePlanHash: 'a'.repeat(64),
      correctionNumber: 1,
      refusedActorIds: [f.second],
    }]);
    const queued = [proposal({
      capsule: f.correctionRuntime.feed.current(),
      phase: 'correction',
      actorId: f.second,
      id: 'proposal:resumed-correction',
    })];
    const dispatches: string[] = [];
    const coordinator = new AdjustmentExhaustionCoordinator(transitions);
    const runtime = correction(f.correctionRuntime.feed.current(), queued, dispatches, { value: 0 });
    const first = await coordinator.coordinate({ initial: f.initial, correction: runtime });
    const replay = await coordinator.coordinate({ initial: f.initial, correction: runtime });

    expect(first.correctionResult).toBe('accepted');
    expect(replay).toEqual(first);
    expect(dispatches).toEqual([]);
    expect(transitions.transitions().filter((entry) => entry.kind === 'adjustment_completed')).toHaveLength(1);
  });
});
