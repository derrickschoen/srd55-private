import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import {
  agentSessionIdFromCli,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import { decodeCodexTurn } from '../../../src/vtt/agent-adapters/codex';
import type { RoundPlan } from '../../../src/vtt/dm-bridge/round-plan-contract';
import { generateRoom } from '../../../src/vtt/room-generator';
import { createEngineMcpRuntime, freshMonsterPlanningState } from '../../../src/vtt/mcp/entrypoint';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { validateArenaPlan } from '../../../src/vtt/arena-legality';
import { SNIPPET_REGISTRY } from '../../../src/vtt/snippet-registry-runtime';
import {
  parseArenaArgs,
  runArena,
} from '../../../tools/ai-dm-arena';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from '../../helpers/test-filesystem';

class FakeCodexUsageAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  modelCalls = 0;
  readonly prompts: string[] = [];

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    return this.completed(agentSessionIdFromCli('codex-arena-usage'), invocation);
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    return this.completed(binding.sessionId, invocation);
  }

  private completed(
    sessionId: AgentTurnResult['resumeSessionId'],
    invocation: AgentInvocation,
  ): AgentTurnResult {
    const usages = [
      { input_tokens: 101, cached_input_tokens: 31, output_tokens: 17, reasoning_output_tokens: 7 },
      { input_tokens: 203, cached_input_tokens: 41, output_tokens: 29, reasoning_output_tokens: 11 },
      { input_tokens: 307, cached_input_tokens: 43, output_tokens: 31, reasoning_output_tokens: 13 },
    ] as const;
    const usage = usages[this.modelCalls];
    if (usage === undefined) throw new Error('Unexpected fake Codex model call.');
    this.modelCalls += 1;
    this.prompts.push(invocation.prompt);
    const decoded = decodeCodexTurn(
      `${JSON.stringify({ type: 'turn.completed', usage })}\n`,
      sessionId,
    );
    return {
      resumeSessionId: agentSessionIdFromCli(decoded.sessionId),
      sessionId: decoded.sessionId,
      finalText: decoded.finalText,
      usage: decoded.usage,
      exit: 'completed',
    };
  }

  classifyFailure(): 'unknown' { return 'unknown'; }
}

class OrderingNullAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  starts = 0;

  constructor(
    private readonly label: string,
    private readonly ordering: string[],
    private readonly beforeStart: () => Promise<void> | void = () => undefined,
  ) {}

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(): Promise<AgentTurnResult> {
    this.starts += 1;
    this.ordering.push(this.label);
    await this.beforeStart();
    return {
      resumeSessionId: agentSessionIdFromCli(`ordering-${this.label}-${String(this.starts)}`),
      sessionId: null,
      finalText: '',
      usage: null,
      exit: 'completed',
    };
  }

  async resume(binding: AgentSessionBinding): Promise<AgentTurnResult> {
    return {
      resumeSessionId: binding.sessionId, sessionId: null,
      finalText: '', usage: null, exit: 'completed',
    };
  }

  classifyFailure(): 'unknown' { return 'unknown'; }
}

const LEGACY_BLOCK_ARGS = [
  '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
] as const;

describe('AI-DM arena', () => {
  it('defaults to initiative segments while retaining the explicit legacy block selection', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-combat-model-'));
    const common = [
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--dry-run',
    ] as const;

    const defaults = parseArenaArgs(common);
    expect(defaults.combatModel).toBe('initiative_segments_v1');
    expect(defaults.initiativeProfile).toBe('derived_v1');
    const block = parseArenaArgs([
      ...common, '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
    ]);
    expect(block.combatModel).toBe('monster_block_v1');
    expect(block.initiativeProfile).toBe('legacy');
    const incompatible = parseArenaArgs([
      ...common, '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'legacy',
    ]);
    await expect(runArena(incompatible)).rejects.toThrow(
      'initiative_segments_v1 fixture constraint: room 1 must declare config.initiativeMode="per_combatant"',
    );
    expect(() => parseArenaArgs([...common, '--combat-model', 'unknown-model']))
      .toThrow('--combat-model must be monster_block_v1 or initiative_segments_v1');
  });

  it('parses plain and per-arm escalation forms while retaining global fallback', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-arm-parse-'));
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--interleave',
      '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
      '--escalation-model', 'global-escalation', '--escalation-effort', 'medium',
      '--arm', 'plain:model-plain:low',
      '--arm', 'tiered:model-tiered:high:arm-escalation:xhigh',
    ]);

    expect(config.arms).toEqual([
      {
        label: 'plain', model: 'model-plain', effort: 'low',
        escalationModel: null, escalationEffort: null, combatModel: 'monster_block_v1',
      },
      {
        label: 'tiered', model: 'model-tiered', effort: 'high',
        escalationModel: 'arm-escalation', escalationEffort: 'xhigh',
        combatModel: 'monster_block_v1',
      },
    ]);
    expect(config).toMatchObject({
      escalationModel: 'global-escalation', escalationEffort: 'medium',
    });
  });

  it('parses an opt-in initiative profile and independent arm combat models', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-arm-combat-model-'));
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--interleave',
      '--initiative-profile', 'derived_v1',
      '--arm', 'block:model-block:low',
      '--arm', 'segments:model-segments:low',
      '--arm-combat-model', 'block:monster_block_v1',
      '--arm-combat-model', 'segments:initiative_segments_v1',
    ]);

    expect(config.initiativeProfile).toBe('derived_v1');
    expect(config.arms.map(({ label, combatModel }) => ({ label, combatModel }))).toEqual([
      { label: 'block', combatModel: 'monster_block_v1' },
      { label: 'segments', combatModel: 'initiative_segments_v1' },
    ]);
    expect(() => parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'bad.jsonl'), '--initiative-profile', 'synthetic',
    ])).toThrow('--initiative-profile must be legacy or derived_v1');
  });

  it('rejects partial per-arm escalation suffixes and invalid escalation effort', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-arm-invalid-'));
    const common = [
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--interleave',
      '--arm', 'plain:model-plain:low',
    ] as const;

    expect(() => parseArenaArgs([
      ...common, '--arm', 'partial:model-tiered:high:arm-escalation',
    ])).toThrow('--arm must use label:model:effort[:escalationModel:escalationEffort] syntax.');
    expect(() => parseArenaArgs([
      ...common, '--arm', 'bad-effort:model-tiered:high:arm-escalation:max',
    ])).toThrow('--arm escalation effort must be low, medium, high, or xhigh.');
  });

  it('renders and validates a multi-round dry run without spawning a model', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-dry-'));
    const outPath = join(directory, 'arena.jsonl');
    const kbPath = join(directory, 'kb.txt');
    const kbText = 'SIMULATED arena knowledge base\n';
    writeFileSync(kbPath, kbText, 'utf8');
    const config = parseArenaArgs([
      '--rooms', '2',
      '--reps', '2',
      '--seed', '3943001',
      '--effort', 'low',
      '--out', outPath,
      '--kb', kbPath,
      '--cli-bin', 'definitely-not-a-real-codex-binary',
      '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const rows = await runArena(config);

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.basis === 'standard' && row.arm === 'single')).toBe(true);
    expect(rows.every((row) =>
      row.outcome === 'authorized' && row.refusals.length === 0 &&
      row.projectionRevision > row.contextRevision)).toBe(true);
    expect(rows.every((row) => row.agentDispatched)).toBe(true);
    expect(rows.every((row) => row.sessionId === null && row.escalationSessionId === null)).toBe(true);
    expect(rows.every((row) =>
      typeof row.plannedBy === 'object' && row.plannedBy?.model === 'gpt-5.6-sol' &&
      row.plannedBy.effort === 'low' &&
      !row.escalated && row.escalationModel === null)).toBe(true);
    expect(rows.every((row) => row.flapRetries === 0 && !row.serviceNull)).toBe(true);
    expect(rows.every((row) => row.chainEvidence.autoResolvedTrigger === null)).toBe(true);
    expect(rows.every((row) => row.chainEvidence.failedAttempts.every((attempt) =>
      attempt.rejectionReasons.length > 0))).toBe(true);
    expect(rows[0]?.authorizedPlan?.map((entry) => entry.actorId)).toEqual([
      'combatant:generated-3943001-monster-1',
      'combatant:generated-3943001-monster-2',
      'combatant:generated-3943001-monster-3',
    ]);
    expect(rows[0]?.authorizedPlan?.every((entry) =>
      entry.acceptedProposal['actor_id'] === entry.actorId &&
      typeof entry.acceptedProposal['expected_revision'] === 'number' &&
      typeof entry.acceptedProposal['primary_option_id'] === 'string' &&
      entry.acceptedProposal['override_justification'] === null &&
      entry.resolutionSummary.actionSlots.length > 0)).toBe(true);
    expect(rows[0]?.authorizedPlan?.map((entry) => entry.resolutionSummary.actionSlots[0]?.actionId))
      .toEqual(['dagger', 'light-hammer', 'longbow']);
    expect(rows[0]?.authorizedPlan?.map((entry) => entry.selectedBranch))
      .toEqual(['primary', 'primary', 'primary']);
    expect(rows[0]?.roundNarrative).toContain('combatant:generated-3943001-monster-1 expands Dagger');
    expect(rows[1]?.contextRevision).toBe(rows[0]?.projectionRevision);
    const kbHash = createHash('sha256').update(Buffer.from(kbText, 'utf8')).digest('hex');
    expect(rows.every((row) => row.kbHash === kbHash)).toBe(true);
    expect(rows.every((row) => /^[0-9a-f]{40}$/u.test(row.repoCommit))).toBe(true);
    expect(rows[0]?.turnContextGranularity).toBe('full');
    expect(rows[1]?.turnContextGranularity).toBe('turn_delta');
    const firstTurnContext = JSON.parse(rows[0]?.rawTurnContext ?? '') as unknown;
    expect(firstTurnContext).toMatchObject({
      granularity: 'full',
      team_plan_frontier: {
        policy: 'team-scorer-v1',
        frontier_resolution: 'contains_unresolved',
        candidates: [
          { candidate_id: 'focus_fire', status: 'unresolved' },
          { candidate_id: 'basic_advance', status: 'unresolved' },
        ],
        removed: [],
      },
    });
    expect(firstTurnContext).not.toHaveProperty('suggested_plan');
    expect(JSON.parse(rows[1]?.rawTurnContext ?? '')).toMatchObject({
      granularity: 'turn_delta',
      anchor: { base_revision: rows[0]?.contextRevision },
    });
    expect(new TextEncoder().encode(rows[0]?.rawTurnContext).byteLength).toBeLessThanOrEqual(32 * 1024);
    expect(new TextEncoder().encode(rows[1]?.rawTurnContext).byteLength).toBeLessThanOrEqual(32 * 1024);
    expect(rows.every((row) =>
      row.snippetHash === SNIPPET_REGISTRY.snippetHash &&
      row.snippetSetHash === SNIPPET_REGISTRY.snippetSetHash)).toBe(true);
    expect(rows[0]?.suggestedPlay).toEqual({
      name: 'focus_fire',
      hash: SNIPPET_REGISTRY.expand('focus_fire',
        createEngineMcpRuntime(generateRoom(3_943_001).encounter.state).feed.current()).definition.snippetHash,
    });
    expect(rows[0]?.suggestionAdopted).toBe('edited');
    expect(readFileSync(outPath, 'utf8').trim().split('\n').every((line) =>
      (JSON.parse(line) as { readonly kbHash?: unknown }).kbHash === kbHash)).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n').every((line) => {
      const row = JSON.parse(line) as { readonly snippetHash?: unknown; readonly snippetSetHash?: unknown };
      return row.snippetHash === SNIPPET_REGISTRY.snippetHash &&
        row.snippetSetHash === SNIPPET_REGISTRY.snippetSetHash;
    })).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
  });

  it('runs configured arms round-robin for every room-rep unit with basis and arm tags', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-interleaved-'));
    const ordering: string[] = [];
    const config = parseArenaArgs([
      '--rooms', '2', '--reps', '2', '--seed', '5117001',
      '--basis', 'hard', '--out', join(directory, 'arena.jsonl'),
      '--interleave',
      ...LEGACY_BLOCK_ARGS,
      '--arm', 'control:model-control:low',
      '--arm', 'candidate:model-candidate:high',
    ]);

    const rows = await runArena(config, {
      adapterByArm: {
        control: new OrderingNullAdapter('control', ordering),
        candidate: new OrderingNullAdapter('candidate', ordering),
      },
    });

    expect(ordering).toEqual([
      'control', 'candidate',
      'control', 'candidate',
      'control', 'candidate',
      'control', 'candidate',
    ]);
    expect(rows.map(({ room, round, arm }) => ({ room, round, arm }))).toEqual([
      { room: 1, round: 1, arm: 'control' },
      { room: 1, round: 1, arm: 'candidate' },
      { room: 1, round: 2, arm: 'control' },
      { room: 1, round: 2, arm: 'candidate' },
      { room: 2, round: 1, arm: 'control' },
      { room: 2, round: 1, arm: 'candidate' },
      { room: 2, round: 2, arm: 'control' },
      { room: 2, round: 2, arm: 'candidate' },
    ]);
    expect(rows.every((row) => row.basis === 'hard')).toBe(true);
    expect(rows.map((row) => row.seed)).toEqual([
      5_117_001, 5_117_001, 5_117_001, 5_117_001,
      5_117_002, 5_117_002, 5_117_002, 5_117_002,
    ]);
    expect(readFileSync(config.outPath, 'utf8').trim().split('\n').map((line) => {
      const row = JSON.parse(line) as { readonly basis: unknown; readonly arm: unknown };
      return { basis: row.basis, arm: row.arm };
    })).toEqual(rows.map((row) => ({ basis: row.basis, arm: row.arm })));
  });

  it('fills the arm ring before awaiting an arm whose startup depends on its peer', { timeout: 5_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-interleave-ring-'));
    const ordering: string[] = [];
    let releaseControl: () => void = () => undefined;
    const candidateStarted = new Promise<void>((resolvePromise) => { releaseControl = resolvePromise; });
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '5117001',
      '--basis', 'hard', '--out', join(directory, 'arena.jsonl'),
      '--interleave',
      ...LEGACY_BLOCK_ARGS,
      '--arm', 'control:model-control:low',
      '--arm', 'candidate:model-candidate:high',
    ]);

    const rows = await runArena(config, {
      adapterByArm: {
        control: new OrderingNullAdapter('control', ordering, () => candidateStarted),
        candidate: new OrderingNullAdapter('candidate', ordering, () => { releaseControl(); }),
      },
    });

    expect(ordering).toEqual(['control', 'candidate']);
    expect(rows.map(({ arm }) => arm)).toEqual(['control', 'candidate']);
  });

  it('applies escalation to only the configured arm and attributes the resulting row', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-arm-escalation-'));
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--interleave', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
      '--arm', 'plain:model-plain:low',
      '--arm', 'tiered:model-tiered:high:model-escalation:xhigh',
    ]);

    const rows = await runArena(config, { invalidInitial: ['room-1-round-1'] });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.objectContaining({
      arm: 'plain',
      plannedBy: { model: 'model-plain', effort: 'low' },
      escalated: false,
      escalationModel: null,
    }));
    expect(rows[1]).toEqual(expect.objectContaining({
      arm: 'tiered',
      plannedBy: { model: 'model-escalation', effort: 'xhigh' },
      escalated: true,
      escalationModel: 'model-escalation',
    }));
  });

  it('classifies exact, edited, and ignored responses to the inline suggestion from structural bookkeeping', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-suggestion-'));
    const cases = ['as_is', 'edited', 'ignored'] as const;

    for (const response of cases) {
      const config = parseArenaArgs([
        '--rooms', '1', '--reps', '1', '--seed', '3943003', '--effort', 'low',
        '--out', join(directory, `${response}.jsonl`), '--dry-run',
        ...LEGACY_BLOCK_ARGS,
      ]);
      const rows = await runArena(config, {
        suggestionResponseByRequest: { 'room-1-round-1': response },
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        outcome: 'authorized',
        suggestedPlay: { name: 'basic_advance' },
        suggestionAdopted: response,
      });
    }
  });

  it('adopts the frozen room-two focus draft as complete legal options', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-aggressive-room-two-'));
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943002', '--effort', 'low',
      '--out', join(directory, 'as-is.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const rows = await runArena(config, {
      suggestionResponseByRequest: { 'room-1-round-1': 'as_is' },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      outcome: 'authorized',
      suggestedPlay: { name: 'focus_fire' },
      suggestionAdopted: 'as_is',
    });
    expect(rows[0]?.authorizedPlan?.map((entry) => ({
      actorId: entry.actorId,
      selectedBranch: entry.selectedBranch,
      actionIds: entry.resolutionSummary.actionSlots.map((slot) => slot.actionId),
      movementFeet: entry.resolutionSummary.movementFeet,
    }))).toEqual([
      {
        actorId: 'combatant:generated-3943002-monster-1',
        selectedBranch: 'primary',
        actionIds: ['dash'],
        movementFeet: 40,
      },
      {
        actorId: 'combatant:generated-3943002-monster-2',
        selectedBranch: 'primary',
        actionIds: ['dash'],
        movementFeet: 35,
      },
    ]);
    const planningState = freshMonsterPlanningState(generateRoom(3_943_002).encounter.state);
    const dashMechanics = rows[0]?.authorizedPlan?.map((entry) => {
      const expectedRevision = entry.acceptedProposal.expected_revision;
      if (typeof expectedRevision !== 'number') {
        throw new TypeError(`Frozen room-two revision is absent for ${entry.actorId}.`);
      }
      const options = availableEngineActorOptions(
        planningState,
        entry.actorId,
        undefined,
        expectedRevision,
      );
      const option = options.find((candidate) => candidate.optionId === entry.resolutionSummary.optionId);
      if (option === undefined) throw new Error(`Frozen room-two option is absent for ${entry.actorId}.`);
      const resolution = resolveEngineActorOption(planningState, option);
      if (!resolution.valid) throw new Error(`Frozen room-two option is illegal for ${entry.actorId}.`);
      return {
        actorId: entry.actorId,
        movementFeet: resolution.mechanics.movementCostFeet,
        finalPosition: resolution.mechanics.finalPosition,
        pathCells: resolution.mechanics.path.length,
      };
    });
    // Monster 1 takes eight ordinary 5-foot cells from (11,0), and Monster 2
    // takes seven from (10,0); both closest-reachable paths end at (3,3).
    expect(dashMechanics).toEqual([
      {
        actorId: 'combatant:generated-3943002-monster-1',
        movementFeet: 40, finalPosition: { column: 3, row: 3 }, pathCells: 8,
      },
      {
        actorId: 'combatant:generated-3943002-monster-2',
        movementFeet: 35, finalPosition: { column: 3, row: 3 }, pathCells: 7,
      },
    ]);
  });

  it('runs as a vite-node --dry-run CLI without contacting the model binary', { timeout: 30_000 }, () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-cli-'));
    const outPath = join(directory, 'arena.jsonl');
    const environment = { ...process.env };
    delete environment.FORCE_COLOR;
    delete environment.NO_COLOR;
    delete environment.VITEST;
    const result = spawnSync(
      process.execPath,
      [
        'node_modules/vite-node/vite-node.mjs',
        'tools/ai-dm-arena.ts',
        '--rooms', '1',
        '--reps', '1',
        '--seed', '3943001',
        '--effort', 'low',
        '--out', outPath,
        '--cli-bin', 'definitely-not-a-real-codex-binary',
        '--dry-run',
      ],
      { cwd: process.cwd(), encoding: 'utf8', env: environment },
    );

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(1);
  });

  it('runs through vite-node with a retained -- separator instead of exiting silently', { timeout: 30_000 }, () => {
    const environment = { ...process.env };
    delete environment.FORCE_COLOR;
    delete environment.NO_COLOR;
    delete environment.VITEST;
    const result = spawnSync(
      process.execPath,
      [
        'node_modules/vite-node/vite-node.mjs',
        'tools/ai-dm-arena.ts',
        '--',
        '--rooms', '1',
        '--reps', '1',
        '--seed', '3943001',
      ],
      { cwd: process.cwd(), encoding: 'utf8', env: environment },
    );

    expect(`${result.stdout}${result.stderr}`).toContain('--out is required.');
    expect(result.status).not.toBe(0);
  });

  it('rejects the CC-BY-SA content tree as a KB source before reading it', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-kb-wall-'));
    expect(() => parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--kb', 'content/cc-by-sa/forbidden.txt',
    ])).toThrow('--kb cannot use content/cc-by-sa');
  });

  it('sums live-shape Codex usage across service-null retries into the arena row', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-usage-'));
    const outPath = join(directory, 'arena.jsonl');
    const adapter = new FakeCodexUsageAdapter();
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001', '--out', outPath,
      ...LEGACY_BLOCK_ARGS,
    ]);

    const rows = await runArena(config, { adapter });

    expect(adapter.modelCalls).toBe(3);
    expect(adapter.prompts[0]).not.toContain('[SERVICE_RETRY]');
    expect(adapter.prompts.slice(1).every((prompt) =>
      prompt.includes('[SERVICE_RETRY]') && prompt.includes('Retry the same round now.'))).toBe(true);
    expect(rows).toEqual([
      expect.objectContaining({
        outcome: 'service_null',
        sessionId: 'codex-arena-usage',
        escalationSessionId: null,
        kbHash: null,
        agentDispatched: true,
        flapRetries: 2,
        serviceNull: true,
        callsPerRound: 3,
        authorizedPlan: null,
        roundNarrative: null,
        chainEvidence: { failedAttempts: [], autoResolvedTrigger: null, correctionFinalText: null },
        tokens: { input: 611, cachedInput: 115, output: 77, reasoning: 31 },
      }),
    ]);
    expect(JSON.parse(readFileSync(outPath, 'utf8').trim())).toEqual(
      expect.objectContaining({
        flapRetries: 2, serviceNull: true, callsPerRound: 3,
        sessionId: 'codex-arena-usage', escalationSessionId: null,
        tokens: { input: 611, cachedInput: 115, output: 77, reasoning: 31 },
      }),
    );
  });

  it('distinguishes a SIMULATED zero-dispatch round from an agent planning failure', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-zero-dispatch-'));
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--dry-run',
      '--escalation-model', 'gpt-escalation', '--escalation-effort', 'high',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const [row] = await runArena(config, { failBeforeDispatch: ['room-1-round-1'] });

    expect(row).toEqual(expect.objectContaining({
      outcome: 'refused', agentDispatched: false, toolCalls: 0, callsPerRound: 0,
      plannedBy: null, escalated: false, escalationModel: null,
      authorizedPlan: null, roundNarrative: null,
      chainEvidence: { failedAttempts: [], autoResolvedTrigger: null, correctionFinalText: null },
      refusals: ['SIMULATED host failure before agent dispatch.'],
    }));
  });

  it('records the engine actual unavailable-option rejection strings in chain evidence', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-chain-evidence-'));
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--dry-run',
      '--escalation-model', 'gpt-escalation', '--escalation-effort', 'high',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const [row] = await runArena(config, {
      invalidInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    });

    expect(row).toEqual(expect.objectContaining({
      outcome: 'authorized', agentDispatched: true,
      plannedBy: null, plannerLabel: 'engine_default', escalated: true, escalationModel: 'gpt-escalation',
      authorizedPlan: expect.any(Array),
      roundNarrative: expect.any(String),
      chainEvidence: {
        failedAttempts: expect.arrayContaining([
          expect.objectContaining({
            attempt: 'primary',
            rejectionReasons: expect.arrayContaining([
              expect.stringContaining('primary option was not offered'),
            ]),
          }),
          expect.objectContaining({
            attempt: 'fallback',
            rejectionReasons: expect.arrayContaining([
              expect.stringContaining('fallback option was not offered'),
            ]),
          }),
        ]),
        autoResolvedTrigger: expect.stringContaining('engine auto-submitted'),
        correctionFinalText: 'SIMULATED — proposal delivered through engine MCP spool',
      },
    }));
    expect(row?.chainEvidence.failedAttempts.flatMap((entry) => entry.rejectionReasons)
      .some((reason) => reason.startsWith('No engine rejection'))).toBe(false);
    expect(row?.chainEvidence.failedAttempts.every((entry) => entry.declaredProposal !== null)).toBe(true);
  });

  it('rejects occupied movement and more than one slot-spending action on a path', () => {
    const state = generateRoom(3_943_001).encounter.state;
    const monster = state.combatants.find((subject) => subject.profile.kind === 'monster');
    const playerToken = state.tokens.find((token) =>
      state.combatants.some((subject) =>
        subject.profile.kind === 'player_character' && subject.profile.id === token.combatantId));
    if (monster === undefined || playerToken === undefined) throw new Error('Arena fixture is missing combatants.');
    const plan: RoundPlan = {
      kind: 'round_plan',
      protocolVersion: 2,
      encounterId: encounterSessionId('encounter:legality-probe'),
      requestId: 'request:legality-probe',
      expectedRevision: state.revision,
      round: 1,
      monsters: [{
        monsterId: monster.profile.id,
        program: {
          kind: 'action',
          action: {
            kind: 'retreat_toward',
            destination: playerToken.position,
          },
          riders: [{
            kind: 'on_critical_hit',
            followUpAction: {
              kind: 'cast_spell',
              spellId: 'fixture-second-slot',
              target: { kind: 'nearest_enemy' },
            },
          }],
        },
      }],
    };
    const twoSlotPlan: RoundPlan = {
      ...plan,
      monsters: [{
        monsterId: monster.profile.id,
        program: {
          kind: 'action',
          action: {
            kind: 'cast_spell',
            spellId: 'fixture-first-slot',
            target: { kind: 'nearest_enemy' },
          },
          riders: [{
            kind: 'on_critical_hit',
            followUpAction: {
              kind: 'cast_spell',
              spellId: 'fixture-second-slot',
              target: { kind: 'nearest_enemy' },
            },
          }],
        },
      }],
    };

    expect(validateArenaPlan(plan, state)).toContain(
      `${monster.profile.id}: destination is blocked, occupied, or unreachable`,
    );
    expect(validateArenaPlan(twoSlotPlan, state)).toContain(
      `${monster.profile.id}: program can spend more than one slot`,
    );
  });
});
