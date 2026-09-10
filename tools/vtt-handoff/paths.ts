import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export const OWNER_CHECKOUT = '/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static';
export const HANDOFF_LAYOUT = [
  'contracts',
  'fixtures',
  'art/outbox',
  'art/inbox',
  'reports/claude',
  'reports/windows',
  'deliveries/windows',
] as const;

export interface HandoffPaths {
  readonly repositoryRoot: string;
  readonly handoffRoot: string;
  readonly distribution: string;
  readonly uncDisplayPath: string;
}

function packageNameAt(directory: string): string | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || !('name' in parsed)) return null;
    return typeof parsed.name === 'string' ? parsed.name : null;
  } catch {
    return null;
  }
}

export function findRepositoryRoot(start = process.cwd()): string {
  let candidate = resolve(start);
  while (true) {
    if (packageNameAt(candidate) === 'srd-55' && existsSync(join(candidate, '.git'))) return candidate;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error(`REPOSITORY_ROOT_NOT_FOUND: ${start}`);
    candidate = parent;
  }
}

export function resolveHandoffRoot(
  repositoryRoot = findRepositoryRoot(),
  override = process.env.VTT_HANDOFF_ROOT,
): string {
  if (override !== undefined) {
    if (!isAbsolute(override)) throw new Error('VTT_HANDOFF_ROOT_NOT_ABSOLUTE');
    return resolve(override);
  }
  const ownerReal = existsSync(OWNER_CHECKOUT) ? realpathSync(OWNER_CHECKOUT) : OWNER_CHECKOUT;
  if (ownerReal !== OWNER_CHECKOUT || packageNameAt(ownerReal) !== 'srd-55') {
    throw new Error('OWNER_CHECKOUT_LOOKALIKE_REFUSED');
  }
  return join(ownerReal, '.tmp', 'vtt-handoff');
}

export function detectDistribution(environment: NodeJS.ProcessEnv = process.env): string {
  return environment.WSL_DISTRO_NAME?.trim() || 'Ubuntu';
}

export function uncPathFor(linuxPath: string, distribution = detectDistribution()): string {
  const normalized = linuxPath.replaceAll('/', '\\');
  return `\\\\wsl.localhost\\${distribution}${normalized}`;
}

export function handoffPaths(options: {
  readonly repositoryRoot?: string;
  readonly handoffRoot?: string;
  readonly environment?: NodeJS.ProcessEnv;
} = {}): HandoffPaths {
  const repositoryRoot = options.repositoryRoot ?? findRepositoryRoot();
  const handoffRoot = resolveHandoffRoot(repositoryRoot, options.handoffRoot ?? options.environment?.VTT_HANDOFF_ROOT);
  const distribution = detectDistribution(options.environment);
  return { repositoryRoot, handoffRoot, distribution, uncDisplayPath: uncPathFor(handoffRoot, distribution) };
}

export interface NodeModulesDisposition {
  readonly status: 'absent' | 'local' | 'shared_refused';
  readonly path: string;
  readonly realPath: string | null;
  readonly code?: 'SHARED_NODE_MODULES_REFUSED';
  readonly prerequisite?: 'SUPERVISOR MATERIALIZES NODE_MODULES';
}

export function inspectNodeModules(repositoryRoot: string): NodeModulesDisposition {
  const path = join(repositoryRoot, 'node_modules');
  if (!existsSync(path)) return { status: 'absent', path, realPath: null };
  const stat = lstatSync(path);
  const realPath = realpathSync(path);
  const localPrefix = `${realpathSync(repositoryRoot)}/`;
  if (stat.isSymbolicLink() || !realPath.startsWith(localPrefix)) {
    return {
      status: 'shared_refused', path, realPath,
      code: 'SHARED_NODE_MODULES_REFUSED',
      prerequisite: 'SUPERVISOR MATERIALIZES NODE_MODULES',
    };
  }
  return { status: 'local', path, realPath };
}
