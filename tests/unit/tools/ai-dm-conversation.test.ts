import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  agentSessionIdFromCli,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import { parseConversationArgs, runConversation } from '../../../tools/ai-dm-conversation';
import { mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { encounterSessionId } from '../../../src/combat/values';
import {
  importSavedSession,
  MemoryBrowserSessionStore,
} from '../../../src/vtt/session-persistence';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

class RecordingConversationAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  readonly startInvocations: AgentInvocation[] = [];
  readonly resumeInvocations: AgentInvocation[] = [];

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.startInvocations.push(invocation);
    return this.completed(agentSessionIdFromCli('codex:SIMULATED-kb-session'));
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.resumeInvocations.push(invocation);
    return this.completed(binding.sessionId);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }

  private completed(sessionId: AgentTurnResult['sessionId']): AgentTurnResult {
    return { sessionId, finalText: 'SIMULATED', usage: null, exit: 'completed' };
  }
}

function pendingArenaReactionState(): EncounterState {
  const mover = playerProfile('arena-reaction-mover', { hitPoints: 100, initiativeBonus: 20 });
  const reactor = monsterProfile('arena-reaction-reactor', { hitPoints: 100, initiativeBonus: -20 });
  const started = reduceEncounter(createEncounter({
    bounds: { columns: 5, rows: 2 },
    combatants: [mover, reactor],
    tokens: [placedToken(mover, 1), placedToken(reactor, 0)],
    reactionPolicies: [{
      combatant: reactor.id,
      reactionKind: 'opportunity_attack',
      policy: 'ask',
    }],
  }), { type: 'roll_initiative' }, () => 0.5).state;
  return reduceEncounter(started, {
    type: 'move',
    actor: mover.id,
    path: [{ column: 2, row: 0 }],
    cause: 'voluntary',
  }, () => 0.5).state;
}

describe('AI-DM engine MCP conversation runner', () => {
  it.each([
    ['decline', 'decline'],
    ['take', 'accept'],
  ] as const)(
    'auto-resolves an unattended ask Reaction with the %s policy and authorizes the SIMULATED arena round',
    { timeout: 60_000 },
    async (askDefault, resolution) => {
      const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-reaction-${askDefault}-`));
      const store = new MemoryBrowserSessionStore();
      const config = parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
        '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
        '--reaction-ask-default', askDefault,
      ]);

      const result = await runConversation(config, {
        roomStates: [pendingArenaReactionState()],
        store,
      });

      expect(result.rows).toEqual([
        expect.objectContaining({ outcome: 'authorized', refusals: [], agentDispatched: true }),
      ]);
      expect(store.revisions(encounterSessionId('encounter:ai-dm-conversation'))
        .map((revision) => revision.transition))
        .toContainEqual(expect.objectContaining({
          kind: 'unattended_reaction_auto_resolved',
          configuredPolicy: 'ask',
          askDefault,
          resolution,
        }));
      const restored = new MemoryBrowserSessionStore();
      importSavedSession(restored, result.journalExport);
      expect(restored.revisions(encounterSessionId('encounter:ai-dm-conversation'))
        .map((revision) => revision.transition.kind))
        .toContain('unattended_reaction_auto_resolved');
    },
  );

  it('restores sticky side-wide guidance across a room transition and resolves a pending offer before dispatch', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-sticky-reaction-'));
    const store = new MemoryBrowserSessionStore();
    const config = parseConversationArgs([
      '--rooms', '2', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      '--reaction-ask-default', 'decline',
    ]);

    const result = await runConversation(config, {
      roomStates: [pendingArenaReactionState(), pendingArenaReactionState()],
      store,
      restoreAfterRound: 1,
      reactionGuidanceByRequest: {
        'room-1-round-1': { sideWide: { opportunity_attack: 'take' }, actors: [] },
      },
    });

    expect(result.restoredMidRun).toBe(true);
    expect(result.rows.map((row) => row.outcome)).toEqual(['authorized', 'authorized']);
    expect(result.rows.every((row) => row.agentDispatched)).toBe(true);
    const restoredStore = new MemoryBrowserSessionStore();
    importSavedSession(restoredStore, result.journalExport);
    const transitions = restoredStore.revisions(encounterSessionId('encounter:ai-dm-conversation'))
      .map((revision) => revision.transition);
    expect(transitions).toContainEqual(expect.objectContaining({
      kind: 'reaction_guidance_replaced',
      guidance: { sideWide: { opportunity_attack: 'take' }, actors: [] },
    }));
    expect(transitions).toContainEqual(expect.objectContaining({
      kind: 'reaction_guidance_auto_resolved',
      reactionKind: 'opportunity_attack', instruction: 'take',
      scope: { kind: 'side_wide' }, resolution: 'accept',
    }));
  });

  it('falls back to unattended toggle policy when sticky guidance does not cover the pending trigger', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-uncovered-reaction-'));
    const store = new MemoryBrowserSessionStore();
    const config = parseConversationArgs([
      '--rooms', '2', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      '--reaction-ask-default', 'decline',
    ]);

    const result = await runConversation(config, {
      roomStates: [pendingArenaReactionState(), pendingArenaReactionState()],
      store,
      reactionGuidanceByRequest: {
        'room-1-round-1': { sideWide: { hit_by_attack: 'take' }, actors: [] },
      },
    });

    expect(result.rows[1]).toEqual(expect.objectContaining({ outcome: 'authorized', agentDispatched: true }));
    expect(store.revisions(encounterSessionId('encounter:ai-dm-conversation'))
      .map((revision) => revision.transition))
      .toContainEqual(expect.objectContaining({
        kind: 'unattended_reaction_auto_resolved', reactionKind: 'opportunity_attack',
        configuredPolicy: 'ask', askDefault: 'decline', resolution: 'decline',
      }));
  });

  it('keeps one SIMULATED session across two rooms, one correction, and a browser restore', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--fixtures', 'tests/fixtures/arena-basis',
      '--rooms', '2',
      '--rounds', '2',
      '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary',
      '--dry-run',
    ]);

    const result = await runConversation(config, {
      exhaustInitial: ['room-1-round-1'],
      restoreAfterRound: 1,
    });

    expect(result.rows).toHaveLength(4);
    expect(result.rows.map((row) => row.outcome)).toEqual([
      'auto_resolved', 'authorized', 'authorized', 'authorized',
    ]);
    expect(result.rows.every((row) => row.refusals.length === 0)).toBe(true);
    expect(new Set(result.rows.map((row) => row.sessionIdHash)).size).toBe(1);
    expect(result.rows[0]?.toolCalls).toBe(3);
    expect(result.rows[0]?.agentDispatched).toBe(true);
    expect(result.rows[0]?.chainEvidence).toEqual({
      failedAttempts: expect.arrayContaining([
        expect.objectContaining({ attempt: 'primary' }),
        expect.objectContaining({ attempt: 'fallback' }),
        expect.objectContaining({ attempt: 'correction' }),
      ]),
      autoResolvedTrigger: expect.stringContaining('deterministic controller'),
    });
    expect(result.rows[0]?.proposalId).toBeNull();
    expect(result.rows[1]?.proposalId).toContain('round:');
    expect(result.rows[0]?.projectionRevision).toBeGreaterThan(result.rows[0]?.contextRevision ?? 0);
    expect(result.rows[1]?.contextRevision).toBe(result.rows[0]?.projectionRevision);
    expect(result.rows[2]?.contextRevision).toBeGreaterThan(result.rows[1]?.projectionRevision ?? 0);
    expect(result.binding.sessionId).toBe('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(result.binding.lastDispatchedRevision).toBeGreaterThan(result.binding.startedAtRevision);
    expect(result.restoredMidRun).toBe(true);
    expect(result.journalExport).toContain('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
  });

  it('runs a model-free stdio MCP dry-run smoke', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-smoke-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
    ]);

    const result = await runConversation(config);

    expect(result.rows).toEqual([
      expect.objectContaining({ outcome: 'authorized', toolCalls: 2, refusals: [], kbHash: null }),
    ]);
    expect(result.rows[0]?.tokens).toEqual({ input: 0, cachedInput: 0, output: 0, reasoning: 0 });
  });

  it('injects a KB only on cold start and attributes every output row to its bytes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-kb-'));
    const outPath = join(directory, 'rows.jsonl');
    const kbPath = join(directory, 'kb.txt');
    const kbText = 'SIMULATED KB: café tactics\n';
    writeFileSync(kbPath, kbText, 'utf8');
    const adapter = new RecordingConversationAdapter();
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--kb', kbPath,
    ]);

    const result = await runConversation(config, { adapter });
    const expectedHash = createHash('sha256').update(Buffer.from(kbText, 'utf8')).digest('hex');

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.startInvocations[0]?.instructions).toBe(kbText);
    expect(adapter.startInvocations[0]?.prompt).not.toContain(kbText);
    expect(adapter.resumeInvocations.length).toBeGreaterThan(0);
    expect(adapter.resumeInvocations.every((entry) => entry.instructions === null)).toBe(true);
    expect(adapter.resumeInvocations.every((entry) => !entry.prompt.includes(kbText))).toBe(true);
    expect(result.rows.every((row) => row.kbHash === expectedHash)).toBe(true);
    expect(JSON.parse(readFileSync(outPath, 'utf8').trim())).toEqual(
      expect.objectContaining({ kbHash: expectedHash }),
    );
  });

  it('admits only the active codex and claude-code adapters', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cli-'));
    const outPath = join(directory, 'rows.jsonl');
    expect(parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'claude-code']).cli)
      .toBe('claude-code');
    expect(() => parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'pi']))
      .toThrow('--cli must be codex or claude-code');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'tests/fixtures/arena-basis/seed-3943001.json',
    ]).kbPath).toBe(join(process.cwd(), 'tests/fixtures/arena-basis/seed-3943001.json'));
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'content/cc-by-sa/forbidden.txt',
    ])).toThrow('--kb cannot use content/cc-by-sa');
  });
});
