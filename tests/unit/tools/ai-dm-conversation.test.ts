import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { parseConversationArgs, runConversation } from '../../../tools/ai-dm-conversation';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';

describe('AI-DM engine MCP conversation runner', () => {
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
      expect.objectContaining({ outcome: 'authorized', toolCalls: 2, refusals: [] }),
    ]);
    expect(result.rows[0]?.tokens).toEqual({ input: 0, cachedInput: 0, output: 0, reasoning: 0 });
  });

  it('admits only the active codex and claude-code adapters', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cli-'));
    const outPath = join(directory, 'rows.jsonl');
    expect(parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'claude-code']).cli)
      .toBe('claude-code');
    expect(() => parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'pi']))
      .toThrow('--cli must be codex or claude-code');
  });
});
