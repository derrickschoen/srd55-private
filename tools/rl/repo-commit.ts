import { readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

const COMMIT_HASH = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const GIT_REF = /^refs\/[A-Za-z0-9._\/-]+$/u;

async function gitDirectory(repositoryRoot: string): Promise<string> {
  const dotGit = resolve(repositoryRoot, '.git');
  const metadata = await stat(dotGit);
  if (metadata.isDirectory()) return dotGit;
  if (!metadata.isFile()) throw new TypeError(`${dotGit} is neither a Git directory nor a gitdir file.`);
  const source = (await readFile(dotGit, 'utf8')).trim();
  const match = /^gitdir:\s*(.+)$/u.exec(source);
  if (match === null || match[1] === undefined || match[1].trim().length === 0) {
    throw new TypeError(`${dotGit} is not a valid gitdir file.`);
  }
  const target = match[1].trim();
  return isAbsolute(target) ? resolve(target) : resolve(dirname(dotGit), target);
}

async function commonGitDirectory(gitDir: string): Promise<string> {
  try {
    const source = (await readFile(resolve(gitDir, 'commondir'), 'utf8')).trim();
    if (source.length === 0) throw new TypeError(`${gitDir}/commondir is empty.`);
    return isAbsolute(source) ? resolve(source) : resolve(gitDir, source);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return gitDir;
    throw error;
  }
}

function commitHash(source: string, label: string): string {
  const value = source.trim().toLowerCase();
  if (!COMMIT_HASH.test(value)) throw new TypeError(`${label} does not contain a valid commit hash.`);
  return value;
}

export async function readRepoCommit(repositoryRoot: string): Promise<string> {
  const gitDir = await gitDirectory(repositoryRoot);
  const head = (await readFile(resolve(gitDir, 'HEAD'), 'utf8')).trim();
  if (!head.startsWith('ref:')) return commitHash(head, `${gitDir}/HEAD`);
  const reference = head.slice('ref:'.length).trim();
  if (!GIT_REF.test(reference) || reference.split('/').some((part) => part === '..' || part.length === 0)) {
    throw new TypeError(`${gitDir}/HEAD contains an invalid ref.`);
  }
  const commonDir = await commonGitDirectory(gitDir);
  return commitHash(await readFile(resolve(commonDir, reference), 'utf8'), `${commonDir}/${reference}`);
}
