import {
  mkdtempSync, mkdirSync, rmSync, statSync, symlinkSync, writeFileSync,
} from '../../helpers/test-filesystem';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { bootstrapHandoff } from '../../../tools/vtt-handoff/bootstrap';
import { doctorReport } from '../../../tools/vtt-handoff/doctor';
import { publishCore } from '../../../tools/vtt-handoff/publish';
import {
  HANDOFF_LAYOUT, handoffPaths, inspectNodeModules, resolveHandoffRoot, uncPathFor,
  type RepositoryIdentityPolicy,
} from '../../../tools/vtt-handoff/paths';

function repository(): { readonly root: string; readonly policy: RepositoryIdentityPolicy } {
  const root = mkdtempSync(join(tmpdir(), 'vtt-handoff-bootstrap-'));
  mkdirSync(join(root, '.git'));
  writeFileSync(join(root, 'package.json'), '{"name":"srd-55","devDependencies":{"@types/node":"24.0.0"}}\n');
  writeFileSync(join(root, 'package-lock.json'), '{}\n');
  return { root, policy: { ownerCheckout: root, authorizedWorktrees: [] } };
}

describe('VTT handoff bootstrap and paths', () => {
  it('creates only the exchange layout and a pip-free venv command idempotently', () => {
    const fixture = repository();
    const handoffRoot = join(fixture.root, '.tmp', 'vtt-handoff');
    const run = vi.fn((_command: string, args: readonly string[]) => {
      mkdirSync(args.at(-1) ?? '', { recursive: true });
      return { status: 0 };
    });
    const options = {
      repositoryRoot: fixture.root, handoffRoot, runner: { run },
      commandExists: () => false, identityPolicy: fixture.policy,
    };
    const first = bootstrapHandoff(options);
    const second = bootstrapHandoff(options);
    expect(first.createdLayout).toBe(true);
    expect(second.createdLayout).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenNthCalledWith(
      1, 'python3', ['-m', 'venv', '--without-pip', join(fixture.root, '.tmp', 'vtt-tools-venv')],
    );
    for (const relative of HANDOFF_LAYOUT) expect(statSync(join(handoffRoot, relative)).isDirectory()).toBe(true);
    expect(run.mock.calls.flat().join(' ')).not.toMatch(/npm|install|pip3/u);
  });

  it('inspects actual outside, local-symlink, and dangling node_modules and never invokes Node installers', () => {
    for (const kind of ['outside', 'local', 'dangling'] as const) {
      const fixture = repository();
      const outside = mkdtempSync(join(tmpdir(), 'vtt-node-modules-outside-'));
      const target = kind === 'outside'
        ? outside
        : kind === 'local'
          ? join(fixture.root, 'local-dependencies')
          : join(fixture.root, 'missing-dependencies');
      if (kind === 'local') mkdirSync(target);
      symlinkSync(target, join(fixture.root, 'node_modules'), 'dir');
      const disposition = inspectNodeModules(fixture.root);
      expect(disposition).toMatchObject({
        status: 'shared_refused',
        reason: kind === 'dangling' ? 'dangling' : kind === 'outside' ? 'outside' : 'symlink',
        code: 'SHARED_NODE_MODULES_REFUSED', prerequisite: 'SUPERVISOR MATERIALIZES NODE_MODULES',
      });
      const run = vi.fn((_command: string, args: readonly string[]) => {
        mkdirSync(args.at(-1) ?? '', { recursive: true });
        return { status: 0 };
      });
      const result = bootstrapHandoff({
        repositoryRoot: fixture.root, handoffRoot: join(fixture.root, '.tmp', 'vtt-handoff'),
        identityPolicy: fixture.policy, runner: { run }, commandExists: () => false,
      });
      expect(result.nodeModules.status).toBe('shared_refused');
      expect(run.mock.calls.flat().join(' ')).not.toMatch(/npm|node|install/u);
    }
  });

  it('refuses repository lookalikes and unauthorized default publication roots', () => {
    const owner = repository();
    const lookalike = repository();
    const ownerPolicy = { ownerCheckout: owner.root, authorizedWorktrees: [] };
    expect(() => handoffPaths({
      repositoryRoot: lookalike.root, handoffRoot: join(lookalike.root, '.tmp', 'handoff'),
      identityPolicy: ownerPolicy,
    })).toThrow('UNAUTHORIZED_REPOSITORY_ROOT');

    const worktree = repository();
    const common = join(owner.root, '.git');
    const worktreeGit = join(owner.root, '.git', 'worktrees', 'authorized');
    mkdirSync(worktreeGit, { recursive: true });
    writeFileSync(join(worktreeGit, 'commondir'), '../..\n');
    rmSync(join(worktree.root, '.git'), { recursive: true });
    writeFileSync(join(worktree.root, '.git'), `gitdir: ${worktreeGit}\n`);
    const policy = { ownerCheckout: owner.root, authorizedWorktrees: [worktree.root] };
    expect(() => resolveHandoffRoot(worktree.root, undefined, policy)).toThrow('UNAUTHORIZED_DEFAULT_HANDOFF_ROOT');
    expect(() => publishCore({ repositoryRoot: worktree.root, identityPolicy: policy }))
      .toThrow('UNAUTHORIZED_DEFAULT_HANDOFF_ROOT');
    expect(resolveHandoffRoot(worktree.root, join(worktree.root, '.tmp', 'handoff'), policy))
      .toBe(join(worktree.root, '.tmp', 'handoff'));
  });

  it('requires an absolute override before resolving repository identity', () => {
    expect(() => resolveHandoffRoot(repository().root, 'relative/cache')).toThrow('VTT_HANDOFF_ROOT_NOT_ABSOLUTE');
  });

  it('distinguishes diagnostic completion from readiness and never invents Ubuntu', () => {
    const fixture = repository();
    const handoffRoot = join(fixture.root, '.tmp', 'handoff');
    const missing = doctorReport({
      repositoryRoot: fixture.root, handoffRoot, identityPolicy: fixture.policy,
      environment: {}, platform: 'linux',
      probe: { version: () => null, output: () => null },
    });
    expect(missing.completed).toBe(true);
    expect(missing.ready).toBe(false);
    expect(missing.platform.wslDistribution).toBeNull();
    expect(missing.failures).toContain('WSL_UBUNTU_REQUIRED');
    expect(missing.failures).toContain('TOOL_MISSING: node');
    expect(missing.failures).toContain('WSLPATH_UNAVAILABLE');

    mkdirSync(join(fixture.root, 'node_modules'));
    const ready = doctorReport({
      repositoryRoot: fixture.root, handoffRoot, identityPolicy: fixture.policy,
      environment: { WSL_DISTRO_NAME: 'Ubuntu' }, platform: 'linux',
      probe: {
        version: (command) => command === 'node' ? 'v23.1.0' : `${command} 1.0.0`,
        output: () => uncPathFor(handoffRoot, 'Ubuntu'),
      },
    });
    expect(ready.completed).toBe(true);
    expect(ready.ready).toBe(true);
    expect(ready.failures).toEqual([]);
    expect(ready.warnings).toEqual(['NODE_TYPES_MAJOR_DRIFT: runtime 23, @types/node 24']);
  });
});
