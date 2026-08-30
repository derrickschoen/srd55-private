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

function isEnoent(error: unknown): error is Error & { readonly code: 'ENOENT' } {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function symbolicRefCommit(commonDir: string, reference: string): Promise<string> {
  const loosePath = resolve(commonDir, reference);
  let looseError: Error & { readonly code: 'ENOENT' };
  try {
    return commitHash(await readFile(loosePath, 'utf8'), loosePath);
  } catch (error) {
    if (!isEnoent(error)) throw error;
    looseError = error;
  }

  let packed: string;
  const packedPath = resolve(commonDir, 'packed-refs');
  try {
    packed = await readFile(packedPath, 'utf8');
  } catch (error) {
    if (isEnoent(error)) throw looseError;
    throw error;
  }
  for (const sourceLine of packed.split(/\r?\n/u)) {
    const line = sourceLine.trim();
    if (line.length === 0 || line.startsWith('#') || line.startsWith('^')) continue;
    const separator = line.search(/\s/u);
    if (separator < 1) continue;
    const hash = line.slice(0, separator);
    const packedReference = line.slice(separator).trim();
    if (packedReference === reference) return commitHash(hash, `${packedPath} entry for ${reference}`);
  }
  throw new TypeError(`${packedPath} does not contain ${reference}.`);
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
  return symbolicRefCommit(commonDir, reference);
}
