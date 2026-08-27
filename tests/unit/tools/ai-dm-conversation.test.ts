import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  codexConversationArgs,
  parseConversationArgs,
  runConversation,
} from '../../../tools/ai-dm-conversation';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';

describe('AI-DM persistent conversation harness', () => {
  it('exercises the MCP server with a scripted dry-run client and no model', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--fixtures', 'tests/fixtures/arena-basis',
      '--rooms', '1',
      '--rounds', '2',
      '--out', outPath,
      '--codex-bin', 'definitely-not-a-model-binary',
      '--dry-run',
    ]);

    const rows = await runConversation(config);

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => [row.arm, row.round])).toEqual([
      ['M', 1], ['M', 2], ['C', 1], ['C', 2],
    ]);
    expect(rows.filter((row) => row.arm === 'C').every((row) => row.toolCalls > 0)).toBe(true);
    expect(rows.every((row) => row.tokens.input === 0 && row.tokens.output === 0)).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
  });

  it('places MCP config before every resume subcommand', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-args-'));
    const config = parseConversationArgs(['--rooms', '1', '--out', join(directory, 'rows.jsonl')]);
    const args = codexConversationArgs(config, 'C', resolveFixture(), 'session-123');
    const resumeIndex = args.indexOf('resume');
    expect(resumeIndex).toBeGreaterThan(args.findIndex((value) => value.startsWith('mcp_servers.engine.args=')));
    expect(args.slice(resumeIndex)).toEqual(['resume', 'session-123', '-']);
  });
});

function resolveFixture(): string {
  return join(process.cwd(), 'tests/fixtures/arena-basis/seed-3943001.json');
}
