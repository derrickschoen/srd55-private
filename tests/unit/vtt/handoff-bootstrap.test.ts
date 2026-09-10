import { mkdtempSync, mkdirSync, statSync, writeFileSync } from '../../helpers/test-filesystem';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { bootstrapHandoff } from '../../../tools/vtt-handoff/bootstrap';
import { HANDOFF_LAYOUT, inspectNodeModules, resolveHandoffRoot } from '../../../tools/vtt-handoff/paths';

function repository(): string {
  const root = mkdtempSync(join(tmpdir(), 'vtt-handoff-bootstrap-'));
  mkdirSync(join(root, '.git'));
  writeFileSync(join(root, 'package.json'), '{"name":"srd-55"}\n');
  return root;
}

describe('VTT handoff bootstrap', () => {
  it('creates only the exchange layout and a pip-free venv command idempotently', () => {
    const root = repository();
    const handoffRoot = join(root, '.tmp', 'vtt-handoff');
    const run = vi.fn((_command: string, args: readonly string[]) => {
      mkdirSync(args.at(-1) ?? '', { recursive: true });
      return { status: 0 };
    });
    const first = bootstrapHandoff({ repositoryRoot: root, handoffRoot, runner: { run }, commandExists: () => false });
    const second = bootstrapHandoff({ repositoryRoot: root, handoffRoot, runner: { run }, commandExists: () => false });
    expect(first.createdLayout).toBe(true);
    expect(second.createdLayout).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenNthCalledWith(1, 'python3', ['-m', 'venv', '--without-pip', join(root, '.tmp', 'vtt-tools-venv')]);
    for (const relative of HANDOFF_LAYOUT) expect(statSync(join(handoffRoot, relative)).isDirectory()).toBe(true);
    expect(run.mock.calls.flat().join(' ')).not.toMatch(/npm|install|pip3/u);
  });

  it('refuses shared node_modules without invoking an installer', () => {
    const root = repository();
    const run = vi.fn(() => ({ status: 0 }));
    const result = bootstrapHandoff({
      repositoryRoot: root,
      handoffRoot: join(root, '.tmp', 'vtt-handoff'),
      runner: { run },
      commandExists: () => true,
      nodeModulesInspector: (repositoryRoot) => ({
        status: 'shared_refused',
        path: join(repositoryRoot, 'node_modules'),
        realPath: '/outside/shared/node_modules',
        code: 'SHARED_NODE_MODULES_REFUSED',
        prerequisite: 'SUPERVISOR MATERIALIZES NODE_MODULES',
      }),
    });
    expect(result.nodeModules).toMatchObject({
      status: 'shared_refused', code: 'SHARED_NODE_MODULES_REFUSED',
      prerequisite: 'SUPERVISOR MATERIALIZES NODE_MODULES',
    });
    expect(run.mock.calls.flat().join(' ')).not.toMatch(/npm|install/u);
    expect(inspectNodeModules(root).status).toBe('absent');
  });

  it('requires an absolute override', () => {
    expect(() => resolveHandoffRoot(repository(), 'relative/cache')).toThrow('VTT_HANDOFF_ROOT_NOT_ABSOLUTE');
  });
});
