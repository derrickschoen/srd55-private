import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  BOARD_IMAGE_SCALE_STARTUP_INSTRUCTION,
  UI_FEEDBACK_STARTUP_INSTRUCTION,
  parseConversationArgs,
  conversationStartupInstructions,
  runConversation,
  structuredFinalDecisionPhase,
} from '../../../tools/ai-dm-conversation';
import { buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';
import { type EncounterState } from '../../../src/combat/encounter';
import { type EngineMcpLauncherManifest } from '../../../src/vtt/mcp/entrypoint';
import { MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION } from '../../../src/vtt/mcp/engine-server';
import { alternatingInitiativeRoom } from '../../fixtures/initiative-segments/alternating-room';
import {
  AI_DM_KB_FIXTURE_DIRECTORY,
  DEFAULT_AI_DM_KB_ROOT,
  KB_SUBJECTS,
} from '../../../src/vtt/knowledge-base-contract';
import { declareTestInputs } from '../../helpers/test-inputs';
import { sha256 } from '../../../src/crypto/sha256';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import {
  DEFAULT_KB_HASH,
  runConversationWithPartyPolicy,
  RecordingConversationAdapter,
  objectValue,
  BoilerplateThenValidStructuredFinalAdapter,
  SerializedRoundTripAdapter,
  oversizedTurnContextState,
} from './ai-dm-conversation-fixtures';

const kbInputs = declareTestInputs({ fixtures: [
  'tests/fixtures/ai-dm-kb/ai-dm-core.md',
  'tests/fixtures/ai-dm-kb/tactics.md',
  'tests/fixtures/ai-dm-skills/engine-submission/SKILL.md',
] });
const LEGACY_BLOCK_ARGS = [
  '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
] as const;
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
  it('records when the configured turn-context trimmer fired', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-context-trim-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [oversizedTurnContextState()],
    });

    expect(result.rows[0]).toEqual(expect.objectContaining({ contextTruncated: true }));
    const rawTurnContext = result.rows[0]?.rawTurnContext;
    if (rawTurnContext === undefined || rawTurnContext === null) throw new Error('Trimmed row omitted its raw turn context.');
    const turnContext = objectValue(JSON.parse(rawTurnContext) as unknown, 'trimmed turn context');
    expect(new TextEncoder().encode(rawTurnContext).byteLength)
      .toBeLessThanOrEqual(config.turnContextMaximumBytes);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      turnContextMaximumBytes: config.turnContextMaximumBytes,
      preTrimBytes: expect.any(Number),
      postTrimBytes: expect.any(Number),
      optionsOmittedForSize: expect.any(Number),
      optionsOmittedForSizeByActor: expect.any(Array),
    }));
    expect(turnContext).toMatchObject({
      granularity: 'full',
      context_trimmed: true,
      compact_fallback: true,
      team_plan_frontier: {
        policy: 'team-scorer-v1',
        frontier_resolution: 'fully_resolved',
        detail_level: 'omitted',
        frontier_candidate_count: 2,
        removed_candidate_count: 0,
        reason: 'context_size_limit',
      },
    });
    const frontier = objectValue(turnContext['team_plan_frontier'], 'trimmed team plan frontier');
    expect(frontier).not.toHaveProperty('candidates');
    expect(frontier).not.toHaveProperty('removed');
    expect(turnContext).not.toHaveProperty('renderer_defect');
    const actors = turnContext['actors'];
    if (!Array.isArray(actors)) throw new Error('Compact fallback omitted actors.');
    expect(actors).toHaveLength(45);
    expect(actors.every((value) => {
      const options = objectValue(value, 'compact fallback actor')['options'];
      return Array.isArray(options) && options.length === 2 && options.every((option) =>
        /^k\d+$/u.test(String(objectValue(option, 'compact fallback option')['option_id'])));
    })).toBe(true);
  });

  it('injects the root and tactics pair byte-for-byte only on cold start and attributes its hash', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-kb-'));
    const outPath = join(directory, 'rows.jsonl');
    const root = kbInputs.fixtures.readText('tests/fixtures/ai-dm-kb/ai-dm-core.md');
    const tactics = kbInputs.fixtures.readText('tests/fixtures/ai-dm-kb/tactics.md');
    const resolvedRoot = KB_SUBJECTS.reduce<string>((text, subject) => text.replaceAll(
      `${AI_DM_KB_FIXTURE_DIRECTORY}/${subject}.md`,
      resolve(process.cwd(), AI_DM_KB_FIXTURE_DIRECTORY, `${subject}.md`),
    ), root);
    const kbInstructions = `${resolvedRoot}\n\n${tactics}`;
    const startupInstructions = `${kbInstructions}\n\n## Monster knowledge\n${MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION}`;
    const adapter = new RecordingConversationAdapter();
    const config = parseConversationArgs([
      '--rooms', '3', '--rounds', '1', '--out', outPath, '--kb', DEFAULT_AI_DM_KB_ROOT,
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, { adapter });

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.startInvocations[0]?.instructions).toBe(startupInstructions);
    expect(adapter.startInvocations[0]?.prompt).not.toContain(startupInstructions);
    if (config.instructionSource !== 'kb') throw new Error('Explicit KB config lost its instruction source.');
    expect(adapter.resumeInvocations.length).toBeGreaterThan(0);
    expect(adapter.resumeInvocations.every((entry) => entry.instructions === null)).toBe(true);
    expect(adapter.resumeInvocations.every((entry) => !entry.prompt.includes(startupInstructions))).toBe(true);
    const injectedText = [
      ...adapter.startInvocations.map((entry) => entry.instructions ?? ''),
      ...adapter.resumeInvocations.map((entry) => entry.instructions ?? ''),
    ].join('\n');
    expect(injectedText.split(startupInstructions).length - 1).toBe(1);

    expect(adapter.resumeInvocations.some((entry) =>
      entry.prompt.startsWith('[ROOM_TRANSITION]'))).toBe(false);

    const initialRoundInvocations = [...adapter.startInvocations, ...adapter.resumeInvocations].filter((entry) =>
      entry.launcherToken.includes('-initial-launcher.json'));
    expect(initialRoundInvocations).toHaveLength(9);
    expect(initialRoundInvocations.every((entry) => {
      const manifest = JSON.parse(readFileSync(entry.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
      return entry.prompt.includes('granularity "full"') &&
        manifest.turnContextDeltaBase === undefined;
    })).toBe(true);
    expect(result.rows.every((row) => row.kbHash === DEFAULT_KB_HASH)).toBe(true);
    expect([...adapter.startInvocations, ...adapter.resumeInvocations].every((entry) =>
      entry.instructionSource === 'kb' && entry.skill === null && entry.kbPath === config.kbPath,
    )).toBe(true);
    expect(result.rows.every((row) =>
      row.instructionSource === 'kb' && row.skillName === null && row.skillHash === null,
    )).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line)))
      .toHaveLength(3);
  });

  it.each([
    ['default', 'advice', 'off', []],
    ['blind', 'blind', 'png', ['General primer']],
    ['png', 'advice', 'png', [BOARD_IMAGE_SCALE_STARTUP_INSTRUCTION, UI_FEEDBACK_STARTUP_INSTRUCTION]],
  ] as const)('%s startup instructions end with one monster-knowledge section after the KB and mode text', (
    _mode,
    dmMode,
    boardImageMode,
    modeInstructions,
  ) => {
    const kbInstructions = 'SIMULATED root\n\nSIMULATED tactics';
    const startupInstructions = conversationStartupInstructions(kbInstructions, dmMode, boardImageMode);
    const suffix = `## Monster knowledge\n${MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION}`;

    expect(startupInstructions.startsWith(kbInstructions)).toBe(true);
    expect(startupInstructions.endsWith(suffix)).toBe(true);
    expect(startupInstructions.split('## Monster knowledge').length - 1).toBe(1);
    expect(startupInstructions.split(MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION).length - 1).toBe(1);
    expect(modeInstructions.every((instruction) =>
      startupInstructions.indexOf(instruction) > startupInstructions.indexOf(kbInstructions) &&
      startupInstructions.indexOf(instruction) < startupInstructions.indexOf(suffix))).toBe(true);
  });

  it('threads a selected skill through every invocation and hashes the exact fixture bytes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-skill-'));
    const adapter = new RecordingConversationAdapter();
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--instruction-source', 'skill', '--skill', 'engine-submission',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, { adapter });
    const invocations = [...adapter.startInvocations, ...adapter.resumeInvocations];
    expect(invocations.length).toBeGreaterThan(0);
    expect(invocations.every((entry) =>
      entry.instructionSource === 'skill' && entry.skill === 'engine-submission' && entry.kbPath === null,
    )).toBe(true);
    expect(result.rows).toEqual([expect.objectContaining({
      outcome: 'service_null',
      instructionSource: 'skill',
      skillName: 'engine-submission',
      skillHash: sha256(kbInputs.fixtures.readText(
        'tests/fixtures/ai-dm-skills/engine-submission/SKILL.md',
      )),
    })]);
  });

  it.each([
    ['none', []],
    ['kb', ['--instruction-source', 'kb', '--kb', DEFAULT_AI_DM_KB_ROOT]],
    ['skill', ['--instruction-source', 'skill', '--skill', 'dm-round']],
  ] as const)('runs a model-free %s instruction-source smoke through a SIMULATED adapter', async (
    source,
    sourceArgs,
  ) => {
    const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-${source}-smoke-`));
    const adapter = new SerializedRoundTripAdapter('attack');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...sourceArgs,
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, { adapter });
    expect(result.rows).toEqual([expect.objectContaining({
      outcome: 'authorized',
      instructionSource: source,
      skillName: source === 'skill' ? 'dm-round' : null,
      skillHash: source === 'skill' ? expect.stringMatching(/^[0-9a-f]{64}$/u) : null,
    })]);
    expect([...adapter.startInvocations, ...adapter.resumeInvocations].every((entry) =>
      entry.instructionSource === source,
    )).toBe(true);
  });

  it('starts the persistent SIMULATED session with the first round plan in one model dispatch', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cold-plan-'));
    const outPath = join(directory, 'rows.jsonl');
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--dry-run',
      ...LEGACY_BLOCK_ARGS,
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]));

    expect(result.rows[0]).toEqual(expect.objectContaining({
      outcome: 'authorized', agentDispatched: true, callsPerRound: 1,
      combatModel: 'monster_block_v1',
      roundProtocolVersion: 3,
      partyPolicyHash: null,
      materialityPolicyHash: null,
      adjustmentBudget: 0,
      pcTurns: [],
      adjustments: [],
      monsterSegments: [],
    }));
    expect(result.rows[0]?.startingRoomDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.rows[0]?.teamPlans).toEqual({
      party: null,
      monsters: expect.objectContaining({ initialProposalId: expect.any(String) }),
    });
    expect(result.rows[0]?.roundTotals).toEqual(expect.objectContaining({
      initialCalls: 1,
      adjustmentCalls: 0,
      correctionCalls: 0,
      serviceNullAdjustments: 0,
      tokens: result.rows[0]?.tokens,
    }));
    expect(result.rows[0]).not.toHaveProperty('chosenOptionIndices');
    expect(JSON.parse(readFileSync(outPath, 'utf8'))).not.toHaveProperty('chosenOptionIndices');
  });

  it('queues a schema-final indexed decision through the same engine round path (mutation: parse valid final output but do not queue it)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]));
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index transport produced no row.');

    expect(row).toMatchObject({
      outcome: 'authorized',
      decisionTransport: 'final_indices',
      firstDecisionAccepted: true,
      decisionAttempts: 1,
      decisionRejectionCodes: [],
      normalizationCodes: [],
      serviceNull: false,
    });
    expect(row.toolCalls).toBe(0);
    expect(row.rawTurnContext).not.toContain('context_not_requested');
    expect(row.authorizedPlan).not.toBeNull();
    if (row.chosenOptionIndices === undefined) {
      throw new Error('Final-index row omitted chosen option indices.');
    }
    expect(row.chosenOptionIndices.length).toBeGreaterThan(0);
    expect(row.chosenOptionIndices.every((selection) => selection.primaryOptionIndex === 0)).toBe(true);
    expect(row.authorizedPlan?.every((entry) => entry.reason ===
      'The engine recommendation preserves the current tactical objective.')).toBe(true);
  });

  it('rejects audited boilerplate at structured-final ingress before accepting a substantive correction', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-reason-gate-'));
    const adapter = new BoilerplateThenValidStructuredFinalAdapter();
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), { adapter });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index reason-gate run produced no row.');

    expect(adapter.decisionAttempts).toBe(2);
    expect(row).toMatchObject({
      outcome: 'authorized',
      firstDecisionAccepted: false,
      decisionAttempts: 2,
      decisionRejectionCodes: ['REASON_REQUIRED'],
      normalizationCodes: ['REASON_REQUIRED'],
      toolCalls: 0,
    });
    expect(row.authorizedPlan).not.toBeNull();
    expect(row.authorizedPlan?.every((entry) =>
      entry.reason === 'Hold the doorway so the injured scout can disengage safely.')).toBe(true);
    if (row.chosenOptionIndices === undefined) {
      throw new Error('Corrected final-index row omitted chosen option indices.');
    }
    expect(row.chosenOptionIndices.every((selection) => selection.fallbackOptionIndex === null)).toBe(true);
    expect(JSON.stringify(row.authorizedPlan)).not.toContain('Use the offered legal option for this actor.');
  });

  it('censors a cancelled structured-final turn as decision_timeout (mutation: classify cancelled final output as decision_missing)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-timeout-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), { timeoutInitial: ['room-1-round-1'] });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index timeout produced no row.');
    expect(row.decisionRejectionCodes).toContain('decision_timeout');
    expect(row.decisionRejectionCodes).not.toContain('decision_missing');
  });

  it('records the actor chosen index for recommendation-anchor measurement (mutation: omit chosen index from final row)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-indices-'));
    const outPath = join(directory, 'rows.jsonl');
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]));
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index row is absent.');
    expect(row.chosenOptionIndices).toEqual(row.authorizedPlan?.map((entry) => ({
      actorId: entry.actorId, primaryOptionIndex: 0, fallbackOptionIndex: 1,
    })));
    expect(JSON.parse(readFileSync(outPath, 'utf8'))).toEqual(expect.objectContaining({
      chosenOptionIndices: row.authorizedPlan?.map((entry) => ({
        actorId: entry.actorId, primaryOptionIndex: 0, fallbackOptionIndex: 1,
      })),
    }));
  });

  it('passes a persisted final-index row through packet validation', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-packet-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--dry-run',
      '--transport', 'final_indices', '--combat-model', 'initiative_segments_v1',
    ]);
    await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
    });
    const persisted = objectValue(JSON.parse(readFileSync(outPath, 'utf8')) as unknown, 'persisted arena row');
    const packet = buildRerunPacket([
      { ...persisted, seed: 3_943_001, arm: 'indexed-a' },
      { ...persisted, seed: 3_943_001, arm: 'indexed-b' },
    ], 1, { seeds: [3_943_001], reps: 1 });

    expect(packet.answerKey.entries).toHaveLength(2);
    expect(packet.answerKey.entries.every((entry) =>
      entry.rowEra === 'post_shift' &&
      entry.decisionTransport === 'final_indices' &&
      entry.chosenOptionIndices.length > 0)).toBe(true);
  });

  it('records no chosen indices when no final-index decision is accepted', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-exhausted-'));
    const outPath = join(directory, 'rows.jsonl');
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), {
      exhaustInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Exhausted final-index run produced no row.');

    expect(row).toMatchObject({
      outcome: 'authorized',
      decisionTransport: 'final_indices',
      firstDecisionAccepted: false,
      chosenOptionIndices: [],
      planner: 'engine_default',
    });
    expect(JSON.parse(readFileSync(outPath, 'utf8'))).toEqual(expect.objectContaining({
      decisionTransport: 'final_indices',
      chosenOptionIndices: [],
    }));
  });

  it('rejects speculative structured-final dispatch at the typed phase boundary (mutation: pass speculative through as a decision phase)', () => {
    expect(structuredFinalDecisionPhase('initial')).toBe('initial');
    expect(structuredFinalDecisionPhase('correction')).toBe('correction');
    expect(() => structuredFinalDecisionPhase('speculative'))
      .toThrow('Structured-final decisions are unavailable for speculative dispatch.');
  });

  it('records a missing final decision explicitly and repairs it with the same indexed correction shape (mutation: classify final absence as service_null)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-correction-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), { exhaustInitial: ['room-1-round-1'] });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index correction produced no row.');

    expect(row.refusals).toEqual([]);
    expect(row).toMatchObject({
      outcome: 'authorized',
      firstDecisionAccepted: false,
      decisionAttempts: 2,
      decisionRejectionCodes: ['decision_missing'],
      normalizationCodes: [],
      serviceNull: false,
    });
    expect(row.chainEvidence.correctionFinalText).toContain('catalogDigest');
  });

  it('uses the same indexed final contract for a G2-preflighted adjustment (mutation: send an adjustment through MCP)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-adjustment-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run', '--transport', 'final_indices',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);
    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      mutateBeforeAdjustmentPreflight: (state) => ({
        ...state,
        revision: state.revision + 1,
        combatants: state.combatants.map((combatant) =>
          combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
      }),
    });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index adjustment run produced no row.');

    expect(row).toMatchObject({
      outcome: 'authorized',
      decisionTransport: 'final_indices',
      serviceNull: false,
      decisionRejectionCodes: [],
      normalizationCodes: [],
    });
    expect(row.adjustments).toHaveLength(1);
    expect(row.adjustments[0]).toMatchObject({
      outcome: 'adjusted',
      requestId: 'request:room-1-round-1-pc-turn-1',
      toolCalls: 0,
      modelCalls: 1,
    });
    expect(row.decisionAttempts).toBe(2);
  });

  it('repairs an indexed adjustment through the same correction ingress (mutation: use a tool-driven adjustment correction)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-adjustment-correction-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run', '--transport', 'final_indices',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);
    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      exhaustInitial: ['room-1-round-1-pc-turn-1'],
      mutateBeforeAdjustmentPreflight: (state) => ({
        ...state,
        revision: state.revision + 1,
        combatants: state.combatants.map((combatant) =>
          combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
      }),
    });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index adjustment correction run produced no row.');

    expect(row).toMatchObject({
      outcome: 'authorized',
      decisionTransport: 'final_indices',
      decisionAttempts: 3,
      decisionRejectionCodes: ['decision_missing'],
      normalizationCodes: [],
      serviceNull: false,
    });
    expect(row.adjustments[0]).toMatchObject({
      outcome: 'adjusted',
      correctionChain: expect.objectContaining({ result: 'accepted' }),
      toolCalls: 0,
      modelCalls: 2,
    });
  });

  it('directs K6 to consume an inline suggestion without fetching the same play again', () => {
    const k6 = readFileSync('tests/fixtures/ai-dm-kb/k6.txt', 'utf8');

    expect(k6).toContain('If suggested_plan is present, use its proposals directly');
    expect(k6).toContain('do not call engine.propose_from_play');
    expect(k6).toContain('Only when suggested_plan is absent');
  });

  it('admits the active process and local OpenAI conversation adapters', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cli-'));
    const outPath = join(directory, 'rows.jsonl');
    const defaults = parseConversationArgs(['--rooms', '1', '--out', outPath]);
    expect(defaults.combatModel).toBe('initiative_segments_v1');
    expect(defaults.initiativeProfile).toBe('derived_v1');
    expect(defaults.intelMode).toBe('full');
    expect(defaults.overridePolicy).toBe('typed_reason');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--override-policy', 'strict',
    ]).overridePolicy).toBe('strict');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--override-policy', 'free_text',
    ])).toThrow('--override-policy must be strict or typed_reason');
    expect(defaults.decisionTransport).toBe('mcp_minimal');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--transport', 'final_indices',
    ]).decisionTransport).toBe('final_indices');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--transport', 'final_ids',
    ])).toThrow('--transport must be mcp_minimal or final_indices');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'claude-code', '--transport', 'final_indices',
    ])).toThrow('final_indices currently requires --cli codex');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--intel-mode', 'off',
    ]).intelMode).toBe('off');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--intel-mode', 'partial',
    ])).toThrow('--intel-mode must be full or off.');
    const block = parseConversationArgs([
      '--rooms', '1', '--out', outPath,
      '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
    ]);
    expect(block.combatModel).toBe('monster_block_v1');
    expect(block.initiativeProfile).toBe('legacy');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--combat-model', 'unknown-model',
    ])).toThrow('--combat-model must be monster_block_v1 or initiative_segments_v1');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--initiative-profile', 'synthetic',
    ])).toThrow('--initiative-profile must be legacy or derived_v1');
    expect(parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'claude-code']).cli)
      .toBe('claude-code');
    expect(() => parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'pi']))
      .toThrow('--cli must be codex, claude-code, or local-openai');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'local-openai',
      '--local-base-url', 'http://127.0.0.1:11434/v1', '--local-model', 'llama-SIMULATED',
    ])).toEqual(expect.objectContaining({
      cli: 'local-openai', model: 'llama-SIMULATED', cliBin: '',
      localOpenAi: {
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'llama-SIMULATED',
        thinkMode: 'off',
      },
    }));
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'local-openai',
      '--local-base-url', 'http://127.0.0.1:11434/v1', '--local-model', 'llama-SIMULATED',
      '--local-think', 'on',
    ]).localOpenAi?.thinkMode).toBe('on');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'local-openai',
      '--local-base-url', 'http://127.0.0.1:11434/v1', '--local-model', 'llama-SIMULATED',
      '--local-think', 'sometimes',
    ])).toThrow('--local-think must be on or off');
    expect(parseConversationArgs(['--rooms', '1', '--out', outPath])).toEqual(expect.objectContaining({
      instructionSource: 'none', skill: null,
    }));
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'tests/fixtures/arena-basis/seed-3943001.json',
    ])).toThrow('--kb must name a root under tests/fixtures/ai-dm-kb');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath,
      '--escalation-model', 'gpt-escalation', '--escalation-effort', 'xhigh',
    ])).toEqual(expect.objectContaining({
      escalationModel: 'gpt-escalation', escalationEffort: 'xhigh',
    }));
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--escalation-model', 'gpt-escalation',
    ])).toThrow('--escalation-model and --escalation-effort must be supplied together');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'content/cc-by-sa/forbidden.txt',
    ])).toThrow('--kb cannot use content/cc-by-sa');
  });

  it('parses the D569 mode, repair, attempt, fact, cap, timeout, and judge-model combinations', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-blind-parse-'));
    const outPath = join(directory, 'rows.jsonl');
    const common = ['--rooms', '1', '--out', outPath, '--dm-mode', 'blind'] as const;

    expect(parseConversationArgs(common)).toEqual(expect.objectContaining({
      dmMode: 'blind', dmModeExplicit: true, blindRepairArm: 'code_only',
      blindMaxAttempts: 3, blindFacts: false, midRoundAdjustmentsEnabled: false,
      turnContextMaximumBytes: 65_536, timeoutMs: 240_000,
      instructionSource: 'kb', boardImageMode: 'png',
    }));
    expect(parseConversationArgs([
      ...common, '--cli', 'claude-code', '--model', 'claude-opus-5',
      '--blind-repair-arm', 'minimal_legal_alternative', '--blind-max-attempts', '2',
      '--blind-facts', 'on',
    ])).toEqual(expect.objectContaining({
      cli: 'claude-code', model: 'claude-opus-5',
      blindRepairArm: 'minimal_legal_alternative', blindMaxAttempts: 2, blindFacts: true,
    }));
    expect(parseConversationArgs([
      ...common, '--cli', 'codex', '--model', 'gpt-5.6-sol', '--effort', 'high',
    ])).toEqual(expect.objectContaining({ cli: 'codex', model: 'gpt-5.6-sol', effort: 'high' }));
    expect(() => parseConversationArgs([...common, '--transport', 'final_indices']))
      .toThrow('--board-image png requires --transport mcp_minimal');
    expect(() => parseConversationArgs([...common, '--board-image', 'off']))
      .toThrow('Blind mode requires MCP-minimal');
    expect(() => parseConversationArgs([...common, '--turn-context-max-bytes', '65535']))
      .toThrow('Blind mode requires MCP-minimal');
    expect(() => parseConversationArgs([...common, '--blind-max-attempts', '4'])).toThrow();
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--blind-facts', 'on',
    ])).toThrow('require --dm-mode blind');
  });

  it('derives per-combatant initiative for standalone fixtures and rejects an explicit legacy profile', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-fixture-constraint-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'derived.jsonl'), '--dry-run',
    ]));
    expect(result.rows[0]?.combatModel).toBe('initiative_segments_v1');
    expect(result.rows[0]).not.toHaveProperty('dmMode');
    expect(result.rows[0]).not.toHaveProperty('blindIntentText');
    expect(result.rows[0]).not.toHaveProperty('blindIngressAudit');

    const incompatible = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'legacy.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'legacy', '--dry-run',
    ]);
    await expect(runConversation(incompatible)).rejects.toThrow(
      'initiative_segments_v1 fixture constraint: room 1 must declare config.initiativeMode="per_combatant"',
    );
  });

  it('walks an alternating initiative fixture without waking the DM for HP-only drift', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-no-drift-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
    });
    const row = result.rows[0];

    expect(row).toEqual(expect.objectContaining({
      combatModel: 'initiative_segments_v1',
      roundProtocolVersion: 3,
      outcome: 'authorized',
      adjustments: [],
      callsPerRound: 2,
      adjustmentBudget: 2,
    }));
    expect(row?.partyPolicyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(row?.materialityPolicyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(row?.teamPlans.party).toEqual(expect.objectContaining({
      planId: expect.any(String),
      planHash: expect.any(String),
      sharedObjective: 'defeat_the_hostile_team',
      programs: expect.any(Array),
    }));
    expect(row?.teamPlans.monsters).toEqual(expect.objectContaining({
      initialProposalId: expect.any(String),
      initialProposalHash: expect.any(String),
      authorizedProposals: expect.any(Array),
    }));
    expect(row?.initiativeOrder).toHaveLength(6);
    expect(row?.initiativeOrder).toEqual([
      'combatant:cleric',
      'combatant:generated-3943001-monster-3',
      'combatant:fighter',
      'combatant:wizard',
      'combatant:generated-3943001-monster-2',
      'combatant:generated-3943001-monster-1',
    ]);
    expect(row?.pcTurns).toHaveLength(3);
    expect(row?.pcTurns?.every((turn) => !turn.material)).toBe(true);
    expect(row?.pcTurns?.every((turn) =>
      turn.initiativeIndex >= 0 && turn.afterRevision > turn.beforeRevision &&
      turn.plannedProgramHash.length === 64 && turn.executedProgramHash.length === 64 &&
      turn.commandSequence.length > 0 && turn.adherenceReasons.length > 0)).toBe(true);
    expect(row?.monsterSegments?.map((segment) => segment.actors)).toEqual([
      ['combatant:generated-3943001-monster-3'],
      [
        'combatant:generated-3943001-monster-2',
        'combatant:generated-3943001-monster-1',
      ],
    ]);
    expect(row?.monsterSegments?.every((segment) =>
      Array.isArray(segment.deviationResolutions) &&
      segment.initiativeIndexes.length === segment.actors.length &&
      segment.afterRevision > segment.beforeRevision && segment.appliedPlanHash.length === 64)).toBe(true);
    expect(row?.roundTotals).toEqual(expect.objectContaining({
      initialCalls: 1,
      adjustmentCalls: 0,
      correctionCalls: 0,
      serviceNullAdjustments: 0,
    }));
    expect(row?.speculations).toContainEqual(expect.objectContaining({
      status: 'adopted', proposed: true, adopted: true, discarded: false,
      budgetMs: 60_000,
      branchCount: expect.any(Number),
      planningWallMs: expect.any(Number),
      boundaryWaitMs: expect.any(Number),
      source: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
      decision: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
    }));
  });

  it('ends a three-round room as party_defeated when all PCs are dead entering the party segment', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-party-defeated-'));
    const base = await alternatingInitiativeRoom();
    const defeated: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) =>
        combatant.profile.kind === 'player_character'
          ? { ...combatant, hitPoints: 0, life: 'dead' as const, deathSaves: null }
          : combatant),
    };
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversation(config, { roomStates: [defeated] });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.terminalOutcome).toEqual({
      kind: 'encounter_over', result: 'party_defeated',
    });
    expect(result.rows[0]?.refusals).toEqual([]);
  });

  it('runs three rounds with a one-round party program by recording typed default turns', { timeout: 180_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-party-default-'));
    const base = await alternatingInitiativeRoom({ monsterHitPoints: 10_000 });
    const durable: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) => combatant.profile.kind === 'player_character'
        ? {
            ...combatant,
            hitPoints: 10_000,
            profile: {
              ...combatant.profile,
              rules: { ...combatant.profile.rules, hitPointMaximum: 10_000 },
            },
          }
        : combatant),
    };
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversation(config, {
      roomStates: [durable],
      mutateScriptedPartyPlan: (plan, context) => context.round === 1
        ? plan
        : { ...plan, programs: [] },
    });

    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((row) => row.partyDefaultTurn)).toEqual([false, true, true]);
    expect(result.rows.flatMap((row) => row.refusals)).toEqual([]);
    expect(result.rows.slice(1).flatMap((row) => row.pcTurns)
      .every((turn) => turn.partyDefaultTurn !== null)).toBe(true);
  });

  it.each([
    ['keep', 'baseline_kept'],
    ['change', 'adjusted'],
  ] as const)('dispatches when a superior option appears and records adjustment choice %s', { timeout: 30_000 }, async (response, outcome) => {
    const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-segments-${response}-`));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--capture-rl-data', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': response },
    });
    const row = result.rows[0];
    const adjustment = row?.adjustments[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Expected a dispatched adjustment fixture.');
    }

    expect(adjustment).toEqual(expect.objectContaining({
      preflight: 'superior_option_appeared',
      outcome,
      granularity: 'turn_delta',
      flapRetries: 0,
      triggerPcTurnOrdinal: 1,
      triggerInitiativeIndex: 0,
      requestId: 'request:room-1-round-1-pc-turn-1',
      openActors: expect.any(Array),
      proposalId: expect.any(String),
      baselinePlanHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      resultPlanHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      changedActors: expect.any(Array),
      correctionSessionId: null,
      usage: expect.objectContaining({ input: expect.any(Number) }),
      toolCalls: expect.any(Number),
      modelCalls: 1,
      refusals: [],
      correctionChain: null,
      rlData: expect.any(Array),
    }));
    expect(adjustment.stateBinding).toEqual({
      request: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
      result: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
    });
    expect(adjustment.rawContext).toContain('"granularity":"turn_delta"');
    expect(row?.rlData).toEqual(expect.objectContaining({
      format: 'arena-rl-capture-v2',
      task: 'round_plan',
      submissionTool: 'engine.submit_round_proposals',
      roundProtocolVersion: 3,
      engineIntel: expect.objectContaining({
        policy: 'dm-intel-capture-v2-creature-space',
        policyVersions: expect.objectContaining({
          evaluator: 'tactical-evaluator-v3',
          renderer: 'dm-turn-intel-v2-creature-space',
          query: 'dm-intel-query-v2-creature-space',
          capture: 'dm-intel-capture-v2-creature-space',
        }),
        actors: expect.arrayContaining([expect.objectContaining({
          offeredOptionIds: expect.any(Array),
          rows: expect.any(Array),
        })]),
      }),
    }));
    expect(row?.engineIntel).toEqual(row?.rlData?.engineIntel);
    expect(adjustment.rlData[0]).toEqual(expect.objectContaining({
      format: 'arena-rl-capture-v2',
      task: 'plan_adjustment',
      submissionTool: 'engine.submit_plan_adjustment',
      parentPlanId: expect.any(String),
    }));
    expect(adjustment.reasons).toContain('OPEN_MONSTER_SET_CHANGED');
    expect(row?.adjustments).toHaveLength(1);
    expect(row?.roundTotals.adjustmentCalls).toBe(1);
    expect(row?.monsterSegments?.flatMap((segment) => segment.actors)).toHaveLength(2);
  });
});
