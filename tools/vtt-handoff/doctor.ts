import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { handoffPaths, inspectNodeModules } from './paths.ts';

function version(command: string, args: readonly string[] = ['--version']): string | null {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return result.stdout.trim() || result.stderr.trim() || null;
}

function output(command: string, args: readonly string[]): string | null {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function directNodeTypeMajor(repositoryRoot: string): number | null {
  const parsed: unknown = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || !('devDependencies' in parsed)) return null;
  const dependencies = parsed.devDependencies;
  if (typeof dependencies !== 'object' || dependencies === null || !('@types/node' in dependencies)) return null;
  const declared = dependencies['@types/node'];
  if (typeof declared !== 'string') return null;
  const match = declared.match(/(\d+)/u);
  return match === null ? null : Number(match[1]);
}

export function doctorReport(): Record<string, unknown> {
  const paths = handoffPaths();
  const node = version('node');
  const declaredNodeTypeMajor = directNodeTypeMajor(paths.repositoryRoot);
  const actualNodeMajor = node === null ? null : Number(node.match(/v?(\d+)/u)?.[1]);
  const warnings = actualNodeMajor !== null && declaredNodeTypeMajor !== null && actualNodeMajor !== declaredNodeTypeMajor
    ? [`NODE_TYPES_MAJOR_DRIFT: runtime ${String(actualNodeMajor)}, @types/node ${String(declaredNodeTypeMajor)}`]
    : [];
  const wslpath = output('wslpath', ['-w', paths.handoffRoot]);
  if (wslpath !== null && wslpath.toLowerCase() !== paths.uncDisplayPath.toLowerCase()) {
    warnings.push(`WSLPATH_MISMATCH: ${wslpath}`);
  }
  return {
    ok: true,
    platform: { linux: process.platform === 'linux', wslDistribution: paths.distribution },
    paths: { ...paths, wslpath, uncVerified: wslpath === null ? null : wslpath.toLowerCase() === paths.uncDisplayPath.toLowerCase() },
    tools: {
      jq: version('jq'),
      node,
      npm: version('npm'),
      python: version('python3'),
      uv: version('uv'),
    },
    lockfile: existsSync(join(paths.repositoryRoot, 'package-lock.json')),
    nodeModules: inspectNodeModules(paths.repositoryRoot),
    warnings,
  };
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(`${JSON.stringify(doctorReport(), null, process.argv.includes('--json') ? 2 : 0)}\n`);
}
