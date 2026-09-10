import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  HANDOFF_LAYOUT, handoffPaths, inspectNodeModules,
  type NodeModulesDisposition, type RepositoryIdentityPolicy,
} from './paths.ts';

export interface CommandRunner {
  run(command: string, args: readonly string[]): { readonly status: number | null };
}

function systemRunner(cacheDirectory: string): CommandRunner {
  return {
    run(command, args) {
      const result = spawnSync(command, args, {
        stdio: 'inherit',
        env: { ...process.env, UV_CACHE_DIR: cacheDirectory },
      });
      return { status: result.status };
    },
  };
}

export interface BootstrapResult {
  readonly root: string;
  readonly createdLayout: boolean;
  readonly venv: 'existing' | 'uv' | 'python-without-pip';
  readonly nodeModules: NodeModulesDisposition;
}

export function bootstrapHandoff(options: {
  readonly repositoryRoot?: string;
  readonly handoffRoot?: string;
  readonly runner?: CommandRunner;
  readonly commandExists?: (command: string) => boolean;
  readonly nodeModulesInspector?: (repositoryRoot: string) => NodeModulesDisposition;
  readonly identityPolicy?: RepositoryIdentityPolicy;
} = {}): BootstrapResult {
  const paths = handoffPaths({
    ...(options.repositoryRoot === undefined ? {} : { repositoryRoot: options.repositoryRoot }),
    ...(options.handoffRoot === undefined ? {} : { handoffRoot: options.handoffRoot }),
    ...(options.identityPolicy === undefined ? {} : { identityPolicy: options.identityPolicy }),
  });
  const runner = options.runner ?? systemRunner(join(paths.repositoryRoot, '.tmp', 'uv-cache'));
  const commandExists = options.commandExists ?? ((command: string) =>
    spawnSync('sh', ['-c', `command -v ${command}`], { stdio: 'ignore' }).status === 0);
  let createdLayout = false;
  for (const relative of HANDOFF_LAYOUT) {
    const destination = join(paths.handoffRoot, relative);
    if (!existsSync(destination)) createdLayout = true;
    mkdirSync(destination, { recursive: true });
  }
  const venvPath = join(paths.repositoryRoot, '.tmp', 'vtt-tools-venv');
  let venv: BootstrapResult['venv'] = 'existing';
  if (!existsSync(venvPath)) {
    mkdirSync(join(paths.repositoryRoot, '.tmp'), { recursive: true });
    if (commandExists('uv')) {
      if (runner.run('uv', ['venv', venvPath]).status !== 0) throw new Error('PYTHON_VENV_FAILED');
      venv = 'uv';
    } else {
      if (runner.run('python3', ['-m', 'venv', '--without-pip', venvPath]).status !== 0) {
        throw new Error('PYTHON_VENV_FAILED');
      }
      venv = 'python-without-pip';
    }
  }
  return {
    root: paths.handoffRoot,
    createdLayout,
    venv,
    nodeModules: (options.nodeModulesInspector ?? inspectNodeModules)(paths.repositoryRoot),
  };
}

if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
  process.stdout.write(`${JSON.stringify(bootstrapHandoff())}\n`);
}
