import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  engineDispatchPhaseForCallPhase,
  type AgentInvocation,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import { parseConversationArgs, runConversation } from '../../../tools/ai-dm-conversation';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';
import { type EncounterState } from '../../../src/combat/encounter';
import { armorClass, feet } from '../../../src/combat/values';
import { type EngineMcpLauncherManifest } from '../../../src/vtt/mcp/entrypoint';
import { alternatingInitiativeRoom } from '../../fixtures/initiative-segments/alternating-room';
import { createScriptedPartyPlan } from '../../../src/vtt/scripted-party-round';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import { runConversationWithPartyPolicy } from './ai-dm-conversation-fixtures';

const ALL_OPTIONS_TEST_RENDERER_ARGS = [
  '--renderer-profile', JSON.stringify({
    ...DEFAULT_RENDERER_PROFILE,
    rows: 'off',
    movement: 'material_only',
    threats: 'counts_exception_ids',
    rare: 'triggered',
    knowledge: 'relevance_gated',
    frontier: 'off',
    failures: 'headline_codes',
    adverts: 'full',
    misc: 'merged',
    optionDetail: 'top2_stubs',
  }),
] as const;

describe('AI-DM engine MCP conversation runner', () => {
  it('skips the D443-style adjustment when material bookkeeping changed but the retained plan stayed legal and non-dominated (mutation: always dispatch)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-symmetric-material-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    const base = await alternatingInitiativeRoom({ fragileMonsterCount: 1 });
    const symmetricMaterialState: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) => {
        switch (combatant.profile.id) {
          case 'combatant:cleric':
            return {
              ...combatant,
              profile: {
                ...combatant.profile,
                rules: { ...combatant.profile.rules, attacksPerAction: 1 },
              },
            };
          case 'combatant:generated-3943001-monster-1':
            return {
              ...combatant,
              hitPoints: 1,
              profile: {
                ...combatant.profile,
                rules: {
                  ...combatant.profile.rules,
                  armorClass: armorClass(0),
                  hitPointMaximum: 1,
                },
              },
            };
          default: return combatant;
        }
      }),
      tokens: base.tokens.map((token) => token.combatantId === 'combatant:generated-3943001-monster-1'
        ? { ...token, position: { column: 4, row: 7 } }
        : token),
    };

    // Cleric and monster-1 are adjacent, so the symmetric evaluator ranks its
    // unknown-AC melee attack (rank 2) ahead of force_save (rank 3). Monster-1
    // has AC 0 and 1 HP; the generic attack is +7 and 1d8 + 4, so the fixed
    // transcript's non-natural-1 hit deals at least 5 and changes the open set [m1,m2,m3]
    // to [m2,m3]. That is hand-computed OPEN_MONSTER_SET_CHANGED materiality.
    const result = await runConversationWithPartyPolicy('symmetric_evaluator_v1', config, {
      roomStates: [symmetricMaterialState],
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'keep' },
    });
    const row = result.rows[0];
    const firstTurn = row?.pcTurns?.[0];
    const adjustment = row?.adjustments?.[0];

    expect(row?.partyPolicyHash).toBe(createScriptedPartyPlan(symmetricMaterialState, {
      decisionPolicy: 'symmetric_evaluator_v1',
    }).policyHash);
    expect(firstTurn?.actor).toBe('combatant:cleric');
    expect(firstTurn?.commandSequence).toHaveLength(1);
    expect(firstTurn?.commandSequence.every((command) =>
      command.type === 'attack' && command.target === 'combatant:generated-3943001-monster-1')).toBe(true);
    expect(firstTurn?.material).toBe(true);
    expect(firstTurn?.materialityReasons).toEqual(['LIFE_STATE_CHANGED', 'OPEN_MONSTER_SET_CHANGED']);
    expect(row?.adjustments).toHaveLength(1);
    expect(adjustment?.trigger).toBe('combatant:cleric');
    expect(adjustment?.triggerPcTurnOrdinal).toBe(1);
    expect(adjustment?.reasons).toEqual(['LIFE_STATE_CHANGED', 'OPEN_MONSTER_SET_CHANGED']);
    expect(adjustment?.skipped).toBe('no_material_change');
    expect(row?.roundTotals.adjustmentCalls).toBe(0);
    expect(row?.speculations).toContainEqual(expect.objectContaining({
      status: 'adopted', proposed: true, adopted: true, discarded: false,
    }));
  });

  it('dispatches an adjustment when the retained primary becomes illegal', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-illegal-primary-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      mutateBeforeAdjustmentPreflight: (state) => ({
        ...state,
        revision: state.revision + 1,
        combatants: state.combatants.map((combatant) =>
          combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
      }),
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'keep' },
    });
    const adjustment = result.rows[0]?.adjustments[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Expected an illegal retained primary to dispatch adjustment planning.');
    }
    expect(adjustment.preflight).toBe('retained_plan_illegal');
    expect(result.rows[0]?.roundTotals.adjustmentCalls).toBe(1);
  });

  it('rejects a speculative context actor mismatch before model dispatch', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-speculation-context-mismatch-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    let speculationDispatches = 0;
    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      mutateSpeculativeContext: (context) => ({ ...context, actors: [] }),
      onSpeculationDispatchStart: () => { speculationDispatches += 1; },
    });
    const row = result.rows[0];
    expect(speculationDispatches).toBe(0);
    expect(row?.speculations.length).toBeGreaterThan(0);
    expect(row?.speculations.every((entry) =>
      entry.status === 'discarded' && entry.discardReason === 'context_actor_set_mismatch')).toBe(true);
    expect(row?.refusals.some((message) => message.includes('SPECULATIVE_BRANCH_CONTRACT_MISMATCH'))).toBe(false);
    expect(row?.outcome).toBe('authorized');
  });

  it('never authorizes a row when execution throws before its first completed turn (mutation: authorized before the loop)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-execution-failed-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      mutateSpeculativeContext: () => {
        throw new Error('SIMULATED execution fixture failure.');
      },
    });
    const row = result.rows[0];
    expect(row).toMatchObject({
      outcome: 'execution_failed',
      executionErrorClass: 'other',
      planner: 'model',
      pcTurns: [],
      monsterSegments: [],
    });
    expect(row?.refusals).toEqual(['SIMULATED execution fixture failure.']);
    expect(result.rows.some((entry) => entry.outcome === 'authorized' && entry.refusals.length > 0)).toBe(false);
  });

  it('records partial_execution when execution throws after a completed PC turn', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-partial-execution-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      mutateBeforeSpeculationBoundary: () => {
        throw new Error('SIMULATED unresolved boundary decision.');
      },
    });
    const row = result.rows[0];
    expect(row?.outcome).toBe('partial_execution');
    expect(row?.executionErrorClass).toBe('unresolved_boundary_decision');
    expect(row?.pcTurns.length).toBeGreaterThan(0);
    expect(row?.refusals).toEqual(['SIMULATED unresolved boundary decision.']);
  });

  it('discards speculation when the actual board invalidates the planned option structure', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-speculation-material-change-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    let mutated = false;
    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      mutateBeforeSpeculationBoundary: (state) => {
        if (mutated) return state;
        mutated = true;
        return {
          ...state,
          revision: state.revision + 1,
          combatants: state.combatants.map((combatant) => combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
        };
      },
    });

    expect(result.rows[0]?.speculations).toContainEqual(expect.objectContaining({
      status: 'discarded', proposed: true, adopted: false, discarded: true,
      discardReason: expect.stringMatching(/^(?:no_scenario_match|option_mapping_failed|proposal_validation_failed)$/u),
      decision: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
    }));
    expect(result.rows[0]?.refusals).not.toContainEqual(expect.stringContaining('SPECULATION_RECALC_REQUIRED'));
  });

  it('aborts the cell when speculation recalculation infrastructure fails after staging output', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-recalc-infrastructure-'));
    let mutated = false;
    let policyMs = 0;
    let observedRecalculationExit: AgentTurnResult['exit'] | null = null;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      mutateBeforeSpeculationBoundary: (state) => {
        if (mutated) return state;
        mutated = true;
        return {
          ...state,
          revision: state.revision + 1,
          combatants: state.combatants.map((combatant) => combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
        };
      },
      failSpeculationRecalculation: true,
      simulatedInProcessDispatchDelayMs: 10,
      forceSpeculationRecalculationForTest: true,
      policyNow: () => policyMs,
      onSpeculationRecalculationResultObservedForTest: (turn) => {
        observedRecalculationExit = turn.exit;
        policyMs = 180_000;
      },
    });
    expect(observedRecalculationExit).toBe('infrastructure_failed');
    expect(result.rows[0]).toMatchObject({
      outcome: 'infrastructure_failed',
      failingDispatch: {
        phase: 'speculation_recalculation', exit: 'infrastructure_failed',
        engineCatalogEvidence: { status: 'absent' },
        turnContextDelivery: { status: 'infrastructure_absent' },
      },
    });
    expect(result.rows[0]?.monsterSegments).toEqual([]);
  });

  it.each([
    ['end-of-round', { endRoundAfterSpeculationStartForTest: true }],
    ['exception-cleanup', { failAfterSpeculationStartForTest: true }],
  ] as const)('retains diagnosed speculative infrastructure at the %s join', async (_join, seam) => {
    const directory = mkdtempSync(join(tmpdir(), `d569-speculation-${_join}-join-`));
    let policyMs = 0;
    let observedSpeculationExit: AgentTurnResult['exit'] | null = null;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      failSpeculationInfrastructure: true,
      simulatedInProcessDispatchDelayMs: 1,
      policyNow: () => policyMs,
      onSpeculationResultObservedForTest: (turn) => {
        observedSpeculationExit = turn.exit;
        policyMs = 180_000;
      },
      ...seam,
    });
    expect(observedSpeculationExit).toBe('infrastructure_failed');
    expect(result.rows[0]).toMatchObject({
      outcome: 'infrastructure_failed',
      failingDispatch: {
        phase: 'speculative', exit: 'infrastructure_failed',
        engineCatalogEvidence: { status: 'absent' },
        turnContextDelivery: { status: 'infrastructure_absent' },
      },
    });
  });

  it('terminates incomplete speculation with a failed rebase without repeating the initiative loop', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-failed-rebase-terminal-'));
    let iterations = 0;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      stagedSpeculationTimeout: true,
      forceSpeculationRecalculationForTest: true,
      simulatedInProcessDispatchDelayMs: 1,
      onInitiativeIterationForTest: () => {
        iterations += 1;
        if (iterations > 20) throw new Error('Initiative loop repeated after terminal speculation transition.');
      },
    });
    expect(iterations).toBeLessThanOrEqual(20);
    expect(result.rows[0]).toMatchObject({
      outcome: 'refused', fallbackReason: 'timeout', planner: 'model', monsterSegments: [],
    });
    expect(result.rows[0]?.speculations).toContainEqual(expect.objectContaining({
      status: 'discarded', discarded: true, discardReason: 'budget_expired',
    }));
  });

  it('aborts speculative planning at the D407 pacing deadline', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-speculation-budget-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      speculationBudgetMs: 5,
      speculationDispatchDelayMs: 25,
    });
    const expired = result.rows[0]?.speculations.find((entry) =>
      entry.status === 'discarded' && entry.discardReason === 'budget_expired');

    expect(expired).toEqual(expect.objectContaining({
      status: 'discarded', budgetMs: 5, proposed: true, adopted: false, discarded: true,
      planningWallMs: expect.any(Number), boundaryWaitMs: expect.any(Number),
    }));
    expect(expired?.status === 'discarded' ? expired.planningWallMs : Number.POSITIVE_INFINITY)
      .toBeLessThan(1_000);
  });

  it('discards a speculative proposal staged before timeout without authorizing it', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-staged-timeout-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      stagedSpeculationTimeout: true,
      simulatedInProcessDispatchDelayMs: 1,
    });
    expect(result.rows[0]?.speculations).toContainEqual(expect.objectContaining({
      status: 'discarded', adopted: false, discarded: true, discardReason: 'budget_expired',
    }));
    expect(result.rows[0]?.outcome).not.toBe('infrastructure_failed');
    expect(result.rows[0]?.monsterSegments.flatMap((segment) => segment.actors).length).toBeGreaterThan(0);
  });

  it('does not spend a second adjustment flap budget when preflight finds no material plan change', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-independent-flaps-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const base = await alternatingInitiativeRoom({ fragileMonsterCount: 2 });
    const independentFlapState: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) => ({
        ...combatant,
        profile: {
          ...combatant.profile,
          rules: {
            ...combatant.profile.rules,
            initiativeBonus: combatant.profile.id === 'combatant:cleric'
              ? 100
              : combatant.profile.id === 'combatant:fighter'
                ? 70
                : combatant.profile.id === 'combatant:wizard'
                  ? 40
                  : 0,
            ...(combatant.profile.id === 'combatant:fighter'
              ? { attacksPerAction: 1 }
              : {}),
            ...(combatant.profile.id === 'combatant:generated-3943001-monster-2'
              ? { armorClass: armorClass(0) }
              : {}),
          },
        },
      })),
      tokens: base.tokens.map((token) =>
        token.combatantId === 'combatant:generated-3943001-monster-1'
          ? { ...token, position: { column: 5, row: 4 } }
          : token),
    };
    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [independentFlapState],
      flapPrimaryByRequest: {
        'room-1-round-1-pc-turn-1': 1,
        'room-1-round-1-pc-turn-2': 1,
      },
      mutateBeforeAdjustmentPreflight: (state) => ({
        ...state,
        revision: state.revision + 1,
        combatants: state.combatants.map((combatant) =>
          combatant.profile.id === 'combatant:generated-3943001-monster-1'
            ? {
                ...combatant,
                profile: {
                  ...combatant.profile,
                  rules: { ...combatant.profile.rules, speed: feet(0) },
                },
              }
            : combatant),
      }),
    });

    expect(result.rows[0]?.adjustments?.slice(0, 2)).toEqual([
      expect.objectContaining({ flapRetries: 1, outcome: 'baseline_kept' }),
      expect.objectContaining({ skipped: 'no_material_change' }),
    ]);
  });

  it('runs one adjustment correction and retains the corrected replacement', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-correction-'));
    const phaseInvocations: AgentInvocation[] = [];
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'invalid' },
      simulatedInProcessDispatchDelayMs: 10,
      speculationDispatchDelayMs: 50,
      onAgentInvocation: (invocation) => { phaseInvocations.push(invocation); },
    });

    expect(result.rows[0]?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome: 'adjusted',
      flapRetries: 0,
    }));
    expect(result.rows[0]?.callsPerRound).toBeGreaterThanOrEqual(3);
    expect(new Set(phaseInvocations.map((invocation) => invocation.callPhase))).toEqual(new Set([
      'initial', 'speculation', 'adjustment', 'correction',
    ]));
    const dispatchIds = phaseInvocations.map((invocation) => invocation.engineDispatchId);
    expect(dispatchIds.every((dispatchId) => dispatchId !== undefined)).toBe(true);
    expect(new Set(dispatchIds).size).toBe(dispatchIds.length);
    for (const invocation of phaseInvocations) {
      const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
      expect(manifest).toMatchObject({
        readinessSpoolPath: expect.stringMatching(/-engine-readiness\.jsonl$/u),
        dispatchId: invocation.engineDispatchId,
      });
      expect(manifest.dispatchPhase).toBe(engineDispatchPhaseForCallPhase(invocation.callPhase));
    }
  });

  it('stamps speculation recalculation launchers with the speculative dispatch phase', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-recalc-phase-'));
    const invocations: AgentInvocation[] = [];
    let mutated = false;
    await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      mutateBeforeSpeculationBoundary: (state) => {
        if (mutated) return state;
        mutated = true;
        return { ...state, revision: state.revision + 1 };
      },
      forceSpeculationRecalculationForTest: true,
      simulatedInProcessDispatchDelayMs: 1,
      onAgentInvocation: (invocation) => { invocations.push(invocation); },
    });
    const recalculation = invocations.find((invocation) => invocation.callPhase === 'speculation_recalculation');
    if (recalculation === undefined) throw new Error('Speculation recalculation was not dispatched.');
    const manifest = JSON.parse(readFileSync(recalculation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    expect(manifest.dispatchPhase).toBe('speculative');
    expect(manifest.dispatchPhase).toBe(engineDispatchPhaseForCallPhase(recalculation.callPhase));
  });

  it('keeps the baseline after three adjustment service nulls and continues the round', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-service-null-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      flapPrimaryByRequest: { 'room-1-round-1-pc-turn-1': 3 },
    });

    expect(result.rows[0]?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome: 'service_null',
      flapRetries: 2,
    }));
    expect(result.rows[0]?.pcTurns).toHaveLength(3);
    expect(result.rows[0]?.monsterSegments?.flatMap((segment) => segment.actors).length)
      .toBeGreaterThan(0);
  });

  it('ignores a staged adjustment proposal after timeout and retains the authorized baseline', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-staged-timeout-'));
    const result = await runConversationWithPartyPolicy('heuristic_v0', parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]), {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      stagedAdjustmentTimeout: ['room-1-round-1-pc-turn-1'],
      simulatedInProcessDispatchDelayMs: 10,
      speculationDispatchDelayMs: 50,
    });
    const adjustment = result.rows[0]?.adjustments?.[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Timed-out adjustment was not recorded.');
    }
    expect(adjustment).toMatchObject({
      outcome: 'service_null', proposalId: null, changedActors: [], flapRetries: 0,
    });
    expect(adjustment.resultPlanHash).toBe(adjustment.baselinePlanHash);
    expect(result.rows[0]?.monsterSegments.flatMap((segment) => segment.actors).length).toBeGreaterThan(0);
  });

  it('records adjustment timeout evidence before applying the expired round deadline', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-expired-evidence-'));
    let policyMs = 0;
    let observedAdjustmentExit: AgentTurnResult['exit'] | null = null;
    const result = await runConversationWithPartyPolicy('heuristic_v0', parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]), {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      stagedAdjustmentTimeout: ['room-1-round-1-pc-turn-1'],
      simulatedInProcessDispatchDelayMs: 1,
      speculationDispatchDelayMs: 1,
      policyNow: () => policyMs,
      onAdjustmentResultObservedForTest: (turn) => {
        observedAdjustmentExit = turn.exit;
        policyMs = 180_000;
      },
    });
    const adjustment = result.rows[0]?.adjustments?.[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Expired adjustment timeout was not recorded.');
    }
    expect(observedAdjustmentExit).toBe('timed_out');
    expect(adjustment).toMatchObject({
      outcome: 'service_null', proposalId: null, changedActors: [], flapRetries: 0,
    });
    expect(adjustment.resultPlanHash).toBe(adjustment.baselinePlanHash);
    expect(result.rows[0]).toMatchObject({
      outcome: 'refused', roundWallTimedOut: true, monsterSegments: [],
    });
  });

  it('ignores an adjustment correction proposal staged before timeout and retains the authorized baseline', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-correction-staged-timeout-'));
    const result = await runConversationWithPartyPolicy('heuristic_v0', parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]), {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'invalid' },
      stagedAdjustmentCorrectionTimeout: ['room-1-round-1-pc-turn-1'],
      simulatedInProcessDispatchDelayMs: 10,
      speculationDispatchDelayMs: 50,
    });
    const adjustment = result.rows[0]?.adjustments?.[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Timed-out adjustment correction was not recorded.');
    }
    expect(adjustment).toMatchObject({
      outcome: 'baseline_kept', proposalId: null, changedActors: [], flapRetries: 0,
      correctionChain: expect.objectContaining({ result: 'timed_out', proposalId: null }),
    });
    expect(adjustment.resultPlanHash).toBe(adjustment.baselinePlanHash);
    expect(result.rows[0]?.monsterSegments.flatMap((segment) => segment.actors).length).toBeGreaterThan(0);
  });

  it('treats adjustment correction no-response as protocol exhaustion, not a flap', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-correction-exhaustion-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'invalid' },
      failCorrection: ['room-1-round-1-pc-turn-1'],
    });

    expect(result.rows[0]?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome: 'baseline_kept',
      flapRetries: 0,
    }));
    expect(result.rows[0]?.monsterSegments?.flatMap((segment) => segment.actors).length)
      .toBeGreaterThan(0);
  });
});
