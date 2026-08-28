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
import { validateArenaPlan } from '../../../src/vtt/arena-legality';
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
  resumeCalls = 0;
  readonly resumePrompts: string[] = [];

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(_invocation: AgentInvocation): Promise<AgentTurnResult> {
    return {
      sessionId: agentSessionIdFromCli('codex-arena-usage'),
      finalText: '',
      usage: null,
      exit: 'completed',
    };
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    const usages = [
      { input_tokens: 101, cached_input_tokens: 31, output_tokens: 17, reasoning_output_tokens: 7 },
      { input_tokens: 203, cached_input_tokens: 41, output_tokens: 29, reasoning_output_tokens: 11 },
      { input_tokens: 307, cached_input_tokens: 43, output_tokens: 31, reasoning_output_tokens: 13 },
    ] as const;
    const usage = usages[this.resumeCalls];
    if (usage === undefined) throw new Error('Unexpected fake Codex resume.');
    this.resumeCalls += 1;
    this.resumePrompts.push(invocation.prompt);
    const decoded = decodeCodexTurn(
      `${JSON.stringify({ type: 'turn.completed', usage })}\n`,
      binding.sessionId,
    );
    return {
      sessionId: agentSessionIdFromCli(decoded.sessionId),
      finalText: decoded.finalText,
      usage: decoded.usage,
      exit: 'completed',
    };
  }

  classifyFailure(): 'unknown' { return 'unknown'; }
}

describe('AI-DM arena', () => {
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
    ]);

    const rows = await runArena(config);

    expect(rows).toHaveLength(4);
    expect(rows.every((row) =>
      row.outcome === 'authorized' && row.refusals.length === 0 &&
      row.projectionRevision > row.contextRevision)).toBe(true);
    expect(rows.every((row) => row.agentDispatched)).toBe(true);
    expect(rows.every((row) => row.flapRetries === 0 && !row.serviceNull)).toBe(true);
    expect(rows.every((row) => row.chainEvidence.autoResolvedTrigger === null)).toBe(true);
    expect(rows.every((row) => row.chainEvidence.failedAttempts.every((attempt) =>
      attempt.rejectionReasons.length > 0))).toBe(true);
    expect(rows[1]?.contextRevision).toBe(rows[0]?.projectionRevision);
    const kbHash = createHash('sha256').update(Buffer.from(kbText, 'utf8')).digest('hex');
    expect(rows.every((row) => row.kbHash === kbHash)).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n').every((line) =>
      (JSON.parse(line) as { readonly kbHash?: unknown }).kbHash === kbHash)).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
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
    ]);

    const rows = await runArena(config, { adapter });

    expect(adapter.resumeCalls).toBe(3);
    expect(adapter.resumePrompts[0]).not.toContain('[SERVICE_RETRY]');
    expect(adapter.resumePrompts.slice(1).every((prompt) =>
      prompt.includes('[SERVICE_RETRY]') && prompt.includes('Retry the same round now.'))).toBe(true);
    expect(rows).toEqual([
      expect.objectContaining({
        outcome: 'service_null',
        kbHash: null,
        agentDispatched: true,
        flapRetries: 2,
        serviceNull: true,
        chainEvidence: { failedAttempts: [], autoResolvedTrigger: null },
        tokens: { input: 611, cachedInput: 115, output: 77, reasoning: 31 },
      }),
    ]);
    expect(JSON.parse(readFileSync(outPath, 'utf8').trim())).toEqual(
      expect.objectContaining({
        flapRetries: 2, serviceNull: true,
        tokens: { input: 611, cachedInput: 115, output: 77, reasoning: 31 },
      }),
    );
  });

  it('distinguishes a SIMULATED zero-dispatch round from an agent planning failure', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-zero-dispatch-'));
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--dry-run',
    ]);

    const [row] = await runArena(config, { failBeforeDispatch: ['room-1-round-1'] });

    expect(row).toEqual(expect.objectContaining({
      outcome: 'refused', agentDispatched: false, toolCalls: 0,
      chainEvidence: { failedAttempts: [], autoResolvedTrigger: null },
      refusals: ['SIMULATED host failure before agent dispatch.'],
    }));
  });

  it('records the engine actual primary and fallback rejection strings in chain evidence', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-chain-evidence-'));
    const config = parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'arena.jsonl'), '--dry-run',
    ]);

    const [row] = await runArena(config, { invalidInitial: ['room-1-round-1'] });

    expect(row).toEqual(expect.objectContaining({
      outcome: 'auto_resolved', agentDispatched: true,
      chainEvidence: {
        failedAttempts: expect.arrayContaining([
          expect.objectContaining({
            attempt: 'primary',
            rejectionReasons: expect.arrayContaining([
              expect.stringContaining('spell intent resolution is not yet available'),
            ]),
          }),
          expect.objectContaining({
            attempt: 'fallback',
            rejectionReasons: expect.arrayContaining([
              expect.stringContaining('spell intent resolution is not yet available'),
            ]),
          }),
        ]),
        autoResolvedTrigger: expect.stringContaining('deterministic controller'),
      },
    }));
    expect(row?.chainEvidence.failedAttempts.flatMap((entry) => entry.rejectionReasons)
      .some((reason) => reason.startsWith('No engine rejection'))).toBe(false);
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
