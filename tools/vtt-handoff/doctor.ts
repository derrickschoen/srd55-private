import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  handoffPaths, inspectNodeModules, type HandoffPaths, type NodeModulesDisposition,
  type RepositoryIdentityPolicy,
} from './paths.ts';

export interface DoctorProbe {
  version(command: string): string | null;
  output(command: string, args: readonly string[]): string | null;
}

const systemProbe: DoctorProbe = {
  version(command) {
    const result = spawnSync(command, ['--version'], { encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() || result.stderr.trim() || null : null;
  },
  output(command, args) {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
  },
};

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

export interface DoctorReport {
  readonly completed: true;
  readonly ready: boolean;
  readonly failures: readonly string[];
  readonly warnings: readonly string[];
  readonly platform: { readonly linux: boolean; readonly wslDistribution: string | null };
  readonly paths: (HandoffPaths & { readonly wslpath: string | null; readonly uncVerified: boolean }) | null;
  readonly tools: Readonly<Record<'jq' | 'node' | 'npm' | 'python' | 'uv', string | null>>;
  readonly lockfile: boolean;
  readonly nodeModules: NodeModulesDisposition | null;
}

export function doctorReport(options: {
  readonly repositoryRoot?: string;
  readonly handoffRoot?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly identityPolicy?: RepositoryIdentityPolicy;
  readonly probe?: DoctorProbe;
  readonly platform?: NodeJS.Platform;
} = {}): DoctorReport {
  const failures: string[] = [];
  const warnings: string[] = [];
  const probe = options.probe ?? systemProbe;
  const platform = options.platform ?? process.platform;
  const environment = options.environment ?? process.env;
  let paths: HandoffPaths | null = null;
  try {
    paths = handoffPaths({
      ...(options.repositoryRoot === undefined ? {} : { repositoryRoot: options.repositoryRoot }),
      ...(options.handoffRoot === undefined ? {} : { handoffRoot: options.handoffRoot }),
      environment,
      ...(options.identityPolicy === undefined ? {} : { identityPolicy: options.identityPolicy }),
    });
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'PATH_DISCOVERY_FAILED');
  }
  if (platform !== 'linux') failures.push('LINUX_REQUIRED');
  const toolVersions = {
    jq: probe.version('jq'), node: probe.version('node'), npm: probe.version('npm'),
    python: probe.version('python3'), uv: probe.version('uv'),
  };
  for (const required of ['jq', 'node', 'npm', 'python'] as const) {
    if (toolVersions[required] === null) failures.push(`TOOL_MISSING: ${required}`);
  }
  const lockfile = paths !== null && existsSync(join(paths.repositoryRoot, 'package-lock.json'));
  if (!lockfile) failures.push('PACKAGE_LOCK_MISSING');
  const nodeModules = paths === null ? null : inspectNodeModules(paths.repositoryRoot);
  if (nodeModules?.status !== 'local') failures.push(nodeModules?.code ?? 'NODE_MODULES_MISSING');
  const wslpath = paths === null ? null : probe.output('wslpath', ['-w', paths.handoffRoot]);
  const uncVerified = paths !== null && wslpath !== null &&
    wslpath.toLowerCase() === paths.uncDisplayPath.toLowerCase();
  if (!uncVerified) failures.push(wslpath === null ? 'WSLPATH_UNAVAILABLE' : `WSLPATH_MISMATCH: ${wslpath}`);
  const declaredNodeTypeMajor = paths === null ? null : directNodeTypeMajor(paths.repositoryRoot);
  const actualNodeMajor = toolVersions.node === null ? null : Number(toolVersions.node.match(/v?(\d+)/u)?.[1]);
  if (actualNodeMajor !== null && declaredNodeTypeMajor !== null && actualNodeMajor !== declaredNodeTypeMajor) {
    warnings.push(`NODE_TYPES_MAJOR_DRIFT: runtime ${String(actualNodeMajor)}, @types/node ${String(declaredNodeTypeMajor)}`);
  }
  return {
    completed: true, ready: failures.length === 0, failures, warnings,
    platform: { linux: platform === 'linux', wslDistribution: environment.WSL_DISTRO_NAME ?? null },
    paths: paths === null ? null : { ...paths, wslpath, uncVerified },
    tools: toolVersions, lockfile, nodeModules,
  };
}

if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
  const report = doctorReport();
  process.stdout.write(`${JSON.stringify(report, null, process.argv.includes('--json') ? 2 : 0)}\n`);
  if (!report.ready) process.exitCode = 1;
}
