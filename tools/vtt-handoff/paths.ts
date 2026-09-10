import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export const OWNER_CHECKOUT = '/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static';
export const AUTHORIZED_WORKTREE = '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff';
export const AUTHORIZED_ART_WORKTREE = '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9';
export const HANDOFF_LAYOUT = [
  'contracts',
  'fixtures',
  'art/outbox',
  'art/inbox',
  'reports/claude',
  'reports/windows',
  'deliveries/windows',
] as const;

export interface RepositoryIdentityPolicy {
  readonly ownerCheckout: string;
  readonly authorizedWorktrees: readonly string[];
}

export const DEFAULT_REPOSITORY_IDENTITY_POLICY: RepositoryIdentityPolicy = {
  ownerCheckout: OWNER_CHECKOUT,
  authorizedWorktrees: [AUTHORIZED_WORKTREE, AUTHORIZED_ART_WORKTREE],
};

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

function commonGitDirectory(repositoryRoot: string): string {
  const dotGit = join(repositoryRoot, '.git');
  const stat = lstatSync(dotGit);
  if (stat.isDirectory()) return realpathSync(dotGit);
  if (!stat.isFile()) throw new Error('REPOSITORY_GIT_IDENTITY_INVALID');
  const match = readFileSync(dotGit, 'utf8').trim().match(/^gitdir:\s*(.+)$/u);
  if (match?.[1] === undefined) throw new Error('REPOSITORY_GIT_IDENTITY_INVALID');
  const worktreeGit = realpathSync(resolve(repositoryRoot, match[1]));
  const common = readFileSync(join(worktreeGit, 'commondir'), 'utf8').trim();
  return realpathSync(resolve(worktreeGit, common));
}

export function validateRepositoryRoot(
  repositoryRoot: string,
  policy: RepositoryIdentityPolicy = DEFAULT_REPOSITORY_IDENTITY_POLICY,
): string {
  const root = realpathSync(repositoryRoot);
  const owner = realpathSync(policy.ownerCheckout);
  let allowed = root === owner;
  if (!allowed) {
    for (const entry of policy.authorizedWorktrees) {
      let candidate: string;
      try {
        candidate = realpathSync(entry);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
      if (candidate === root) {
        allowed = true;
        break;
      }
    }
  }
  if (!allowed) throw new Error('UNAUTHORIZED_REPOSITORY_ROOT');
  if (packageNameAt(root) !== 'srd-55') throw new Error('REPOSITORY_PACKAGE_IDENTITY_INVALID');
  if (commonGitDirectory(root) !== commonGitDirectory(owner)) throw new Error('REPOSITORY_GIT_IDENTITY_INVALID');
  return root;
}

export function findRepositoryRoot(
  start = process.cwd(),
  policy: RepositoryIdentityPolicy = DEFAULT_REPOSITORY_IDENTITY_POLICY,
): string {
  let candidate = resolve(start);
  while (true) {
    if (packageNameAt(candidate) === 'srd-55' && existsSync(join(candidate, '.git'))) {
      return validateRepositoryRoot(candidate, policy);
    }
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error(`REPOSITORY_ROOT_NOT_FOUND: ${start}`);
    candidate = parent;
  }
}

export function resolveHandoffRoot(
  repositoryRoot = findRepositoryRoot(),
  override = process.env.VTT_HANDOFF_ROOT,
  policy: RepositoryIdentityPolicy = DEFAULT_REPOSITORY_IDENTITY_POLICY,
): string {
  if (override !== undefined && !isAbsolute(override)) throw new Error('VTT_HANDOFF_ROOT_NOT_ABSOLUTE');
  const repository = validateRepositoryRoot(repositoryRoot, policy);
  if (override !== undefined) return resolve(override);
  const owner = realpathSync(policy.ownerCheckout);
  if (repository !== owner) throw new Error('UNAUTHORIZED_DEFAULT_HANDOFF_ROOT');
  return join(owner, '.tmp', 'vtt-handoff');
}

export function detectDistribution(environment: NodeJS.ProcessEnv = process.env): string | null {
  const distribution = environment.WSL_DISTRO_NAME?.trim();
  return distribution === undefined || distribution.length === 0 ? null : distribution;
}

export function uncPathFor(linuxPath: string, distribution: string): string {
  const normalized = linuxPath.replaceAll('/', '\\');
  return `\\\\wsl.localhost\\${distribution}${normalized}`;
}

export function handoffPaths(options: {
  readonly repositoryRoot?: string;
  readonly handoffRoot?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly identityPolicy?: RepositoryIdentityPolicy;
} = {}): HandoffPaths {
  const policy = options.identityPolicy ?? DEFAULT_REPOSITORY_IDENTITY_POLICY;
  const repositoryRoot = options.repositoryRoot === undefined
    ? findRepositoryRoot(process.cwd(), policy)
    : validateRepositoryRoot(options.repositoryRoot, policy);
  const handoffRoot = resolveHandoffRoot(
    repositoryRoot,
    options.handoffRoot ?? options.environment?.VTT_HANDOFF_ROOT,
    policy,
  );
  const distribution = detectDistribution(options.environment);
  if (distribution !== 'Ubuntu') throw new Error('WSL_UBUNTU_REQUIRED');
  return { repositoryRoot, handoffRoot, distribution, uncDisplayPath: uncPathFor(handoffRoot, distribution) };
}

export interface NodeModulesDisposition {
  readonly status: 'absent' | 'local' | 'shared_refused';
  readonly path: string;
  readonly realPath: string | null;
  readonly reason?: 'symlink' | 'outside' | 'dangling';
  readonly code?: 'SHARED_NODE_MODULES_REFUSED';
  readonly prerequisite?: 'SUPERVISOR MATERIALIZES NODE_MODULES';
}

function refused(path: string, realPath: string | null, reason: 'symlink' | 'outside' | 'dangling'): NodeModulesDisposition {
  return {
    status: 'shared_refused', path, realPath, reason,
    code: 'SHARED_NODE_MODULES_REFUSED',
    prerequisite: 'SUPERVISOR MATERIALIZES NODE_MODULES',
  };
}

export function inspectNodeModules(repositoryRoot: string): NodeModulesDisposition {
  const path = join(repositoryRoot, 'node_modules');
  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { status: 'absent', path, realPath: null };
    throw error;
  }
  if (stat.isSymbolicLink()) {
    try {
      const realPath = realpathSync(path);
      const localPrefix = `${realpathSync(repositoryRoot)}/`;
      return refused(path, realPath, realPath.startsWith(localPrefix) ? 'symlink' : 'outside');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return refused(path, null, 'dangling');
      throw error;
    }
  }
  const realPath = realpathSync(path);
  const localPrefix = `${realpathSync(repositoryRoot)}/`;
  if (!realPath.startsWith(localPrefix)) return refused(path, realPath, 'outside');
  return { status: 'local', path, realPath };
}
