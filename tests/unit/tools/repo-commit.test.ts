import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { readRepoCommit } from '../../../tools/rl/repo-commit';
import { mkdirSync, mkdtempSync, writeFileSync } from '../../helpers/test-filesystem';

const NORMAL_COMMIT = '1234567890abcdef1234567890abcdef12345678';
const DETACHED_COMMIT = 'abcdef1234567890abcdef1234567890abcdef12';
const WORKTREE_COMMIT = 'fedcba0987654321fedcba0987654321fedcba09';

describe('repository commit reader', () => {
  it('reads a symbolic ref from a normal .git directory', async () => {
    const root = mkdtempSync(join(tmpdir(), 'repo-commit-normal-'));
    mkdirSync(join(root, '.git', 'refs', 'heads'), { recursive: true });
    writeFileSync(join(root, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf8');
    writeFileSync(join(root, '.git', 'refs', 'heads', 'main'), `${NORMAL_COMMIT}\n`, 'utf8');

    await expect(readRepoCommit(root)).resolves.toBe(NORMAL_COMMIT);
  });

  it('reads a detached HEAD directly', async () => {
    const root = mkdtempSync(join(tmpdir(), 'repo-commit-detached-'));
    mkdirSync(join(root, '.git'), { recursive: true });
    writeFileSync(join(root, '.git', 'HEAD'), `${DETACHED_COMMIT}\n`, 'utf8');

    await expect(readRepoCommit(root)).resolves.toBe(DETACHED_COMMIT);
  });

  it('follows a worktree gitdir file and its common ref directory', async () => {
    const root = mkdtempSync(join(tmpdir(), 'repo-commit-worktree-'));
    const common = join(root, 'metadata');
    const worktreeGitDir = join(common, 'worktrees', 'fixture');
    const checkout = join(root, 'checkout');
    mkdirSync(join(common, 'refs', 'heads'), { recursive: true });
    mkdirSync(worktreeGitDir, { recursive: true });
    mkdirSync(checkout, { recursive: true });
    writeFileSync(join(checkout, '.git'), 'gitdir: ../metadata/worktrees/fixture\n', 'utf8');
    writeFileSync(join(worktreeGitDir, 'HEAD'), 'ref: refs/heads/feature\n', 'utf8');
    writeFileSync(join(worktreeGitDir, 'commondir'), '../..\n', 'utf8');
    writeFileSync(join(common, 'refs', 'heads', 'feature'), `${WORKTREE_COMMIT}\n`, 'utf8');

    await expect(readRepoCommit(checkout)).resolves.toBe(WORKTREE_COMMIT);
  });
});
