import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { validateArenaPlan } from '../../../src/vtt/arena-legality';
import { SNIPPET_REGISTRY } from '../../../src/vtt/snippet-registry-runtime';
import { engineActionId, engineSpellId } from '../../../src/vtt/turn-proposal';
import {
  circumstanceFeatureVectorSchema,
  DEFAULT_RENDERER_PROFILE,
  RENDERER_POLICY_VERSION,
} from '../../../src/vtt/renderer-profile';
import {
  basisFixturesPath,
  extractArenaProbeVerdict,
  mapConversationKbReads,
  parseArenaArgs,
  runArena,
} from '../../../tools/ai-dm-arena';
import {
  mkdtempSync,
  readFileSync,
} from '../../helpers/test-filesystem';
import type { RepoRelativeKbPath } from '../../../src/vtt/knowledge-base-contract';
import type { KbReadRecord } from '../../../src/vtt/mcp/knowledge-base';

const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';

function objectValue(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

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

class InProcessArenaAdapter implements AgentSessionAdapter {
  readonly kind = 'local-openai' as const;
  #starts = 0;

  async probe() { return { present: true, version: 'SIMULATED-in-process' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.#starts += 1;
    return this.#dispatch(
      agentSessionIdFromCli(`local-openai:SIMULATED-arena-${String(this.#starts)}`),
      invocation,
    );
  }

  async resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
  ): Promise<AgentTurnResult> {
    return this.#dispatch(binding.sessionId, invocation);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }

  #dispatch(
    sessionId: AgentTurnResult['resumeSessionId'],
    invocation: AgentInvocation,
  ): AgentTurnResult {
    const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    const tools = invocation.toolSession;
    if (tools === undefined) throw new Error('SIMULATED in-process arena dispatch omitted its tool session.');
    if (manifest.phase === 'speculative') return this.#completed(sessionId);

    const context = objectValue(tools.execute('engine.get_turn_context', {
      run_id: manifest.runId,
      expected_revision: manifest.revision,
      scope: 'round',
      ...(manifest.turnContextDeltaBase === undefined
        ? { granularity: 'full' }
        : { granularity: 'turn_delta', since_revision: manifest.turnContextDeltaBase.revision }),
    }), 'SIMULATED in-process turn context');
    const stateRef = context['granularity'] === 'turn_delta'
      ? objectValue(
          objectValue(context['anchor'], 'SIMULATED delta anchor')['state_ref'],
          'SIMULATED delta state ref',
        )
      : objectValue(context['state_ref'], 'SIMULATED full state ref');
    const plays = context['applicable_plays'];
    const firstPlay = Array.isArray(plays) ? objectValue(plays[0], 'SIMULATED applicable play') : null;
    const playName = firstPlay?.['name'];
    if (typeof playName !== 'string') throw new Error('SIMULATED in-process turn context offered no play.');
    const expansion = objectValue(
      tools.execute('engine.propose_from_play', { play_name: playName }),
      'SIMULATED play expansion',
    );
    if (!Array.isArray(expansion['proposals'])) {
      throw new Error('SIMULATED play expansion omitted proposals.');
    }
    tools.execute('engine.submit_round_proposals', {
      state_ref: stateRef,
      request_id: manifest.requestId,
      phase: manifest.phase,
      idempotency_key: `SIMULATED-in-process-${manifest.requestId}-${manifest.phase}`,
      proposals: expansion['proposals'],
    });
    return this.#completed(sessionId);
  }

  #completed(sessionId: AgentTurnResult['resumeSessionId']): AgentTurnResult {
    return {
      resumeSessionId: sessionId,
      sessionId: null,
      finalText: 'SIMULATED in-process arena proposal',
      usage: null,
      exit: 'completed',
    };
  }
}

const LEGACY_BLOCK_ARGS = [
  '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
] as const;

describe('AI-DM arena', () => {
  it('maps rows with zero, one, and two KB reads without losing hashes or order (mutation: omit arena kbReads)', () => {
    const records: readonly KbReadRecord[] = [
      {
        subject: 'actions',
        repoRelativePath: 'tests/fixtures/ai-dm-kb/actions.md' as RepoRelativeKbPath,
        sha256: '1'.repeat(64), byteCount: 101, ordinal: 1, callPhase: 'initial',
      },
      {
        subject: 'spells',
        repoRelativePath: 'tests/fixtures/ai-dm-kb/spells.md' as RepoRelativeKbPath,
        sha256: '2'.repeat(64), byteCount: 202, ordinal: 2, callPhase: 'correction',
      },
    ];

    expect([0, 1, 2].map((count) => mapConversationKbReads({ kbReads: records.slice(0, count) })))
      .toEqual([[], [records[0]], records]);
  });

  it.each([
    ['standard', 'tests/fixtures/arena-basis'],
    ['hard', 'tests/fixtures/arena-basis-hard'],
    ['brutal', 'tests/fixtures/arena-basis-brutal'],
    ['scenario', 'tests/fixtures/arena-scenarios'],
  ] as const)('maps the %s basis to its frozen fixture directory', (basis, directory) => {
    expect(basisFixturesPath({ cwd: process.cwd(), basis }))
      .toBe(join(process.cwd(), directory));
  });

  it('parses both scripted-party policies, defaults to symmetric, and rejects unknown policies', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-party-policy-parse-'));
    const common = [
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--dry-run',
    ] as const;

    expect(parseArenaArgs(common).partyPolicy).toBe('symmetric_evaluator_v1');
    expect(parseArenaArgs(common).intelMode).toBe('full');
    expect(parseArenaArgs([...common, '--intel-mode', 'off']).intelMode).toBe('off');
    expect(() => parseArenaArgs([...common, '--intel-mode', 'partial']))
      .toThrow('--intel-mode must be full or off.');
    expect(parseArenaArgs([...common, '--party-policy', 'heuristic_v0']).partyPolicy)
      .toBe('heuristic_v0');
    expect(parseArenaArgs([...common, '--party-policy', 'symmetric_evaluator_v1']).partyPolicy)
      .toBe('symmetric_evaluator_v1');
    expect(parseArenaArgs([...common, '--basis', 'brutal']).basis).toBe('brutal');
    expect(() => parseArenaArgs([...common, '--basis', 'nightmare']))
      .toThrow('--basis must be standard, hard, brutal, or scenario.');
    expect(() => parseArenaArgs([...common, '--party-policy', 'unknown-policy']))
      .toThrow('--party-policy must be heuristic_v0 or symmetric_evaluator_v1.');
  });

  it('runs the frozen control probe through the arena and emits a deterministic mechanical verdict', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-hypnotic-pattern-probe-'));
    const run = async (name: string) => {
      const [row] = await runArena(parseArenaArgs([
        '--rooms', '1', '--reps', '1', '--seed', '432', '--basis', 'scenario', '--dry-run',
        '--out', join(directory, `${name}.jsonl`),
      ]));
      if (row === undefined) throw new Error('Scenario arena produced no row.');
      return row;
    };
    const first = await run('first');
    const second = await run('second');

    expect(first.probeVerdict).toEqual({
      scenario: 'hypnotic-pattern-cc',
      chose_control: true,
      selected_instead: null,
    });
    expect(first.sessionId).toBeNull();
    expect(first.escalationSessionId).toBeNull();
    expect(extractArenaProbeVerdict(first.basis, first.authorizedPlan)).toEqual(first.probeVerdict);
    if (first.authorizedPlan === null) throw new Error('Scenario arena omitted its authorized plan.');
    const controlPlan = first.authorizedPlan.map((entry) => entry.actorId !== 'combatant:d432-incubus'
      ? entry
      : {
          ...entry,
          resolutionSummary: {
            ...entry.resolutionSummary,
            actionSlots: [{
              slot: 'main' as const,
              kind: 'cast_spell' as const,
              actionId: engineActionId('spellcasting'),
              spellId: engineSpellId('hypnotic-pattern'),
              targetIds: [],
              objectId: null,
              omittedRiders: [],
            }],
          },
        });
    expect(extractArenaProbeVerdict('scenario', controlPlan)).toEqual({
      scenario: 'hypnotic-pattern-cc',
      chose_control: true,
      selected_instead: null,
    });
    expect(second.probeVerdict).toEqual(first.probeVerdict);
    expect(second.startingRoomDigest).toBe(first.startingRoomDigest);
    expect(second.rawTurnContext).toBe(first.rawTurnContext);

    const context = objectValue(JSON.parse(first.rawTurnContext) as unknown, 'scenario turn context');
    const actors = context['actors'];
    if (!Array.isArray(actors)) throw new TypeError('Scenario turn context omitted actors.');
    const actor = actors.map((entry) => objectValue(entry, 'scenario actor'))
      .find((entry) => entry['actor_id'] === 'combatant:d432-incubus');
    if (actor === undefined || !Array.isArray(actor['options'])) {
      throw new Error('Scenario turn context omitted Incubus options.');
    }
    const labels = actor['options'].map((entry) => objectValue(entry, 'scenario option')['label']);
    expect(labels).toContain(
      'spellcasting/hypnotic-pattern (1/1) [30-ft cube -> combatant:d432-cleric, combatant:d432-fighter, combatant:d432-rogue, combatant:d432-wizard]',
    );
    expect(labels).toContain('Restless Touch + Restless Touch -> combatant:d432-wizard');
  });

  it('propagates hidden options exactly once with the engine-state knowledge marker', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-hidden-options-'));
    const [row] = await runArena(parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001', '--dry-run',
      '--out', join(directory, 'arena.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]));
    if (row === undefined) throw new Error('Hidden-option arena produced no row.');

    expect(row.knowledgeModel).toBe('engine_state');
    expect(row.hiddenOptions.length).toBeGreaterThan(0);
    expect(new Set(row.hiddenOptions.map((option) => option.humanOptionId)).size)
      .toBe(row.hiddenOptions.length);
    expect(row.hiddenOptions).toContainEqual(expect.objectContaining({
      declaredOption: { kind: 'standard_action', action: 'disengage' },
      reason: { kind: 'disengage_without_movement', action: 'disengage' },
    }));
  });

  it('threads inline renderer-profile JSON through dry-run rows while keeping arena metadata', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-renderer-profile-'));
    const profiles = [
      { ...DEFAULT_RENDERER_PROFILE, nullFields: 'omit' as const },
      { ...DEFAULT_RENDERER_PROFILE, attribution: 'stamped' as const },
      { ...DEFAULT_RENDERER_PROFILE, format: 'caveman_prose' as const },
      { ...DEFAULT_RENDERER_PROFILE, format: 'regular_prose' as const },
    ] as const;

    for (const [index, profile] of profiles.entries()) {
      const config = parseArenaArgs([
        '--rooms', '1', '--reps', '1', '--seed', '3943001', '--dry-run',
        '--out', join(directory, `profile-${String(index)}.jsonl`),
        '--renderer-profile', JSON.stringify(profile),
        ...LEGACY_BLOCK_ARGS,
      ]);
      const [row] = await runArena(config);
      if (row === undefined) throw new Error('Renderer-profile dry run produced no row.');

      expect(config.rendererProfile).toEqual(profile);
      expect(row.rendererAttribution).toEqual({
        policyVersion: RENDERER_POLICY_VERSION,
        profile,
      });
      expect(circumstanceFeatureVectorSchema.safeParse(row.circumstanceFeatures).success).toBe(true);
      if (profile.format === 'structured') {
        const modelVisibleContext = objectValue(JSON.parse(row.rawTurnContext), 'raw turn context');
        if (profile.attribution === 'off') {
          expect(modelVisibleContext).not.toHaveProperty('renderer_attribution');
        } else {
          expect(modelVisibleContext['renderer_attribution']).toEqual({
            policy_version: RENDERER_POLICY_VERSION,
          });
        }
      } else {
        expect(row.rawTurnContext).toMatch(/[Rr]evision \d+/u);
        expect(row.rawTurnContext).toMatch(/\[option:\d+:[0-9a-f]+\]/u);
        expect(() => JSON.parse(row.rawTurnContext)).toThrow();
        expect(row.circumstanceFeatures.pre_trim_bytes)
          .toBeGreaterThanOrEqual(new TextEncoder().encode(row.rawTurnContext).byteLength);
      }
    }
  });

  it('suppresses every intel context surface while attributing off rows and preserving full bytes', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-intel-mode-'));
    const common = [
      '--rooms', '1', '--reps', '1', '--seed', '3943001', '--dry-run',
      '--capture-rl-data', ...LEGACY_BLOCK_ARGS,
    ] as const;
    const defaultPath = join(directory, 'default.jsonl');
    const fullPath = join(directory, 'full.jsonl');
    const offPath = join(directory, 'off.jsonl');
    const [defaultRow] = await runArena(parseArenaArgs([
      ...common, '--out', defaultPath,
    ]));
    const [explicitFullRow] = await runArena(parseArenaArgs([
      ...common, '--out', fullPath, '--intel-mode', 'full',
    ]));
    const [offRow] = await runArena(parseArenaArgs([
      ...common, '--out', offPath, '--intel-mode', 'off',
    ]));
    if (defaultRow === undefined || explicitFullRow === undefined || offRow === undefined) {
      throw new Error('Intel-mode fixture did not produce all three rows.');
    }

    expect(defaultRow.rawTurnContext).toBe(explicitFullRow.rawTurnContext);
    expect(defaultRow.intelMode).toBe('full');
    expect(explicitFullRow.intelMode).toBe('full');
    expect(offRow).toEqual(expect.objectContaining({ intelMode: 'off', engineIntel: null }));
    expect(offRow.rendererAttribution).toEqual({
      policyVersion: RENDERER_POLICY_VERSION,
      profile: DEFAULT_RENDERER_PROFILE,
    });
    expect(circumstanceFeatureVectorSchema.safeParse(offRow.circumstanceFeatures).success).toBe(true);
    expect(offRow.rlData).toEqual(expect.objectContaining({
      intelPolicyVersions: { intel_mode: 'off' },
      engineIntel: null,
    }));
    expect(JSON.parse(readFileSync(offPath, 'utf8').trim())).toEqual(expect.objectContaining({
      intelMode: 'off',
      engineIntel: null,
      rendererAttribution: {
        policyVersion: RENDERER_POLICY_VERSION,
        profile: DEFAULT_RENDERER_PROFILE,
      },
      circumstanceFeatures: offRow.circumstanceFeatures,
      rlData: expect.objectContaining({ intelPolicyVersions: { intel_mode: 'off' } }),
    }));

    const context = JSON.parse(offRow.rawTurnContext) as unknown;
    const keys = new Set<string>();
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (typeof value !== 'object' || value === null) return;
      for (const [key, child] of Object.entries(value)) {
        keys.add(key);
        visit(child);
      }
    };
    visit(context);
    const forbiddenIntelKeys = [
      'intel',
      'movement',
      'concentration',
      'opportunity_cost',
      'team_plan_frontier',
      'materiality',
      'known_failure_modes',
      'actor_knowledge',
      'reaction_spend_hold',
      'legendary_windows',
      'recovery_capabilities',
      'search_memory',
      'alert_state',
    ] as const;
    expect(forbiddenIntelKeys.filter((key) => keys.has(key))).toEqual([]);
    expect(context).toMatchObject({
      granularity: 'full',
      actors: expect.arrayContaining([expect.objectContaining({
        actor_id: expect.any(String),
        status: expect.any(Object),
        options: expect.arrayContaining([expect.objectContaining({ expectation: null })]),
      })]),
      applicable_plays: expect.any(Array),
      suggested_plan: expect.objectContaining({
        play_name: 'focus_fire',
        proposals: expect.any(Array),
      }),
    });
  });

  it('threads each party policy through a SIMULATED arena row with distinct hashes and plans', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-party-policy-thread-'));
    const rows: Awaited<ReturnType<typeof runArena>>[number][] = [];

    for (const policy of ['heuristic_v0', 'symmetric_evaluator_v1'] as const) {
      const config = parseArenaArgs([
        '--rooms', '1', '--reps', '1', '--seed', '3943001',
        '--out', join(directory, `${policy}.jsonl`), '--dry-run',
        '--party-policy', policy,
      ]);
      const [row] = await runArena(config);
      if (row === undefined) throw new Error(`SIMULATED ${policy} arena produced no row.`);
      rows.push(row);
    }

    const [heuristic, symmetric] = rows;
    expect(heuristic?.partyPolicyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(symmetric?.partyPolicyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(heuristic?.partyPolicyHash).not.toBe(symmetric?.partyPolicyHash);
    expect(heuristic?.teamPlans.party?.planHash).not.toBe(symmetric?.teamPlans.party?.planHash);
    expect(heuristic?.teamPlans.party?.programs).not.toEqual(symmetric?.teamPlans.party?.programs);
  });

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
    const config = parseArenaArgs([
      '--rooms', '2',
      '--reps', '2',
      '--seed', '3943001',
      '--effort', 'low',
      '--out', outPath,
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
    expect(rows[1]?.contextRevision).toBe(rows[0]?.contextRevision);
    expect(rows[1]?.projectionRevision).toBe(rows[0]?.projectionRevision);
    expect(rows[1]?.startingRoomDigest).toBe(rows[0]?.startingRoomDigest);
    expect(rows.every((row) => row.kbHash === DEFAULT_KB_HASH)).toBe(true);
    expect(rows.every((row) => /^[0-9a-f]{40}$/u.test(row.repoCommit))).toBe(true);
    expect(rows.every((row) => row.turnContextGranularity === 'full')).toBe(true);
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
      granularity: 'full',
      state_ref: { expected_revision: rows[1]?.contextRevision },
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
      (JSON.parse(line) as { readonly kbHash?: unknown }).kbHash === DEFAULT_KB_HASH)).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n').every((line) => {
      const row = JSON.parse(line) as { readonly snippetHash?: unknown; readonly snippetSetHash?: unknown };
      return row.snippetHash === SNIPPET_REGISTRY.snippetHash &&
        row.snippetSetHash === SNIPPET_REGISTRY.snippetSetHash;
    })).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
  });

  describe('brutal room-4 full-intel regression', () => {
    it('reloads the fixture and full context for each of three SIMULATED reps', async () => {
      const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-room-4-full-intel-'));
      const rows = await runArena(parseArenaArgs([
        '--rooms', '1',
        '--reps', '3',
        '--seed', '6203004',
        '--basis', 'brutal',
        '--intel-mode', 'full',
        '--cli', 'local-openai',
        '--local-base-url', 'http://SIMULATED.invalid',
        '--local-model', 'SIMULATED-model',
        '--out', join(directory, 'arena.jsonl'),
      ]), { adapter: new InProcessArenaAdapter() });

      expect(rows).toHaveLength(3);
      expect(rows.map((row) => ({
        round: row.round,
        outcome: row.outcome,
        granularity: row.turnContextGranularity,
        contextRevision: row.contextRevision,
        startingRoomDigest: row.startingRoomDigest,
        failedAttempts: row.chainEvidence.failedAttempts,
      }))).toEqual([
        {
          round: 1, outcome: 'authorized', granularity: 'full', contextRevision: 3,
          startingRoomDigest: rows[0]?.startingRoomDigest, failedAttempts: [],
        },
        {
          round: 2, outcome: 'authorized', granularity: 'full', contextRevision: 3,
          startingRoomDigest: rows[0]?.startingRoomDigest, failedAttempts: [],
        },
        {
          round: 3, outcome: 'authorized', granularity: 'full', contextRevision: 3,
          startingRoomDigest: rows[0]?.startingRoomDigest, failedAttempts: [],
        },
      ]);
    });
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

  it('retains ordered per-call usage while summing only aggregate tokens (mutation: summing call usage)', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-usage-'));
    const outPath = join(directory, 'arena.jsonl');
    const adapter = new FakeCodexUsageAdapter();
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001', '--out', outPath,
      ...LEGACY_BLOCK_ARGS,
    ]);

    const rows = await runArena(config, { adapter });

    expect(rows[0]?.refusals).toEqual([]);
    expect(adapter.modelCalls).toBe(3);
    expect(adapter.prompts[0]).not.toContain('[SERVICE_RETRY]');
    expect(adapter.prompts.slice(1).every((prompt) =>
      prompt.includes('[SERVICE_RETRY]') && prompt.includes('Retry the same round now.'))).toBe(true);
    expect(rows).toEqual([
      expect.objectContaining({
        outcome: 'service_null',
        sessionId: 'codex-arena-usage',
        escalationSessionId: null,
        kbHash: DEFAULT_KB_HASH,
        agentDispatched: true,
        flapRetries: 2,
        serviceNull: true,
        callsPerRound: 3,
        authorizedPlan: null,
        roundNarrative: null,
        chainEvidence: { failedAttempts: [], autoResolvedTrigger: null, correctionFinalText: null },
        tokens: { input: 611, cachedInput: 115, output: 77, reasoning: 31 },
        callUsage: [
          { input: 101, cachedInput: 31, output: 17, reasoning: 7, callPhase: 'initial', ordinal: 1 },
          { input: 203, cachedInput: 41, output: 29, reasoning: 11, callPhase: 'initial', ordinal: 2 },
          { input: 307, cachedInput: 43, output: 31, reasoning: 13, callPhase: 'initial', ordinal: 3 },
        ],
      }),
    ]);
    expect(JSON.parse(readFileSync(outPath, 'utf8').trim())).toEqual(
      expect.objectContaining({
        flapRetries: 2, serviceNull: true, callsPerRound: 3,
        sessionId: 'codex-arena-usage', escalationSessionId: null,
        tokens: { input: 611, cachedInput: 115, output: 77, reasoning: 31 },
        callUsage: [
          { input: 101, cachedInput: 31, output: 17, reasoning: 7, callPhase: 'initial', ordinal: 1 },
          { input: 203, cachedInput: 41, output: 29, reasoning: 11, callPhase: 'initial', ordinal: 2 },
          { input: 307, cachedInput: 43, output: 31, reasoning: 13, callPhase: 'initial', ordinal: 3 },
        ],
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

  it('keeps the model-free one-round arena behavior unchanged except required call usage fields', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-d1-regression-'));
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const [row] = await runArena(config);

    expect(row).toEqual(expect.objectContaining({
      knowledgeModel: 'engine_state',
      room: 1,
      round: 1,
      outcome: 'authorized',
      agentDispatched: true,
      callsPerRound: 1,
      tokens: { input: 0, cachedInput: 0, output: 0, reasoning: 0 },
      callUsage: [],
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
