import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';

describe('AI-DM arena interleave integration', () => {
  it('completes two dry-run arms through the real scheduler and MCP server within a bounded time', { timeout: 30_000 }, () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-cli-interleave-'));
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
        '--seed', '5117001',
        '--basis', 'hard',
        '--out', outPath,
        '--interleave',
        '--arm', 'control:model-control:low',
        '--arm', 'candidate:model-candidate:medium',
        '--combat-model', 'monster_block_v1',
        '--initiative-profile', 'legacy',
        '--cli-bin', 'definitely-not-a-real-codex-binary',
        '--dry-run',
      ],
      { cwd: process.cwd(), encoding: 'utf8', env: environment, timeout: 25_000 },
    );

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('[arena] interleave scheduling started arms=2 rooms=1 reps=1');
    expect(result.stdout).toContain('[arena] dispatch room=1 rep=1 arm=control model=model-control effort=low');
    expect(result.stdout).toContain('[arena] dispatch room=1 rep=1 arm=candidate model=model-candidate effort=medium');
    const rows = readFileSync(outPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as {
      readonly room: number;
      readonly round: number;
      readonly arm: string;
    });
    expect(rows).toEqual([
      { room: 1, round: 1, arm: 'control' },
      { room: 1, round: 1, arm: 'candidate' },
    ].map((expected) => expect.objectContaining(expected)));
  });
});
