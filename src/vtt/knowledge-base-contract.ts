import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { KB_SUBJECTS, type KbSubject } from './knowledge-base-subjects';

export { KB_SUBJECTS, type KbSubject } from './knowledge-base-subjects';

declare const repoRelativeKbPathBrand: unique symbol;
export type RepoRelativeKbPath = string & {
  readonly [repoRelativeKbPathBrand]: 'RepoRelativeKbPath';
};

export const DEFAULT_AI_DM_KB_ROOT = 'tests/fixtures/ai-dm-kb/ai-dm-core.md' as const;
export const AI_DM_KB_FIXTURE_DIRECTORY = 'tests/fixtures/ai-dm-kb' as const;
export const AI_DM_KB_ROOT_TARGET_BYTES = 3_072 as const;
export const AI_DM_KB_ROOT_HARD_BYTES = 4_096 as const;
export const AI_DM_KB_STARTUP_HARD_BYTES = 4_608 as const;

const LEGACY_SINGLE_FILE_NAMES = ['k5.txt', 'k6.txt', 'k7-close.txt'] as const;

export interface KbComponent {
  readonly repoRelativePath: RepoRelativeKbPath;
  readonly absolutePath: string;
  readonly text: string;
  readonly byteCount: number;
  readonly sha256: string;
}

export interface AiDmKbBundle {
  readonly kind: 'bundle';
  readonly root: KbComponent;
  readonly tactics: KbComponent;
  readonly subjects: Readonly<Record<KbSubject, KbComponent>>;
  readonly componentSha256: {
    readonly root: string;
    readonly tactics: string;
    readonly subjects: Readonly<Record<KbSubject, string>>;
  };
  /** Exact cold-start text after repo-relative index paths become operator-readable absolute paths. */
  readonly startupInstructions: string;
  /** Relocation-stable hash of the source root bytes, separator, and tactics bytes. */
  readonly combinedStartupHash: string;
}

export interface LegacySingleFileKnowledgeBase {
  readonly kind: 'legacy_single_file';
  readonly file: KbComponent;
  readonly startupInstructions: string;
  readonly combinedStartupHash: string;
}

export type LoadedAiDmKnowledgeBase = AiDmKbBundle | LegacySingleFileKnowledgeBase;

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pathIsInside(parent: string, candidate: string): boolean {
  const fromParent = relative(resolve(parent), resolve(candidate));
  return fromParent === '' || (!fromParent.startsWith('..') && !isAbsolute(fromParent));
}

function lexicalRepoRelativePath(candidate: string): RepoRelativeKbPath {
  if (candidate.length === 0 || isAbsolute(candidate) || /^[a-zA-Z]:[\\/]/u.test(candidate) ||
    candidate.includes('\\')) {
    throw new TypeError(`KB index path must be repo-relative: ${candidate || '<empty>'}.`);
  }
  const segments = candidate.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new TypeError(`KB index path cannot contain empty or traversal segments: ${candidate}.`);
  }
  if (!candidate.startsWith(`${AI_DM_KB_FIXTURE_DIRECTORY}/`)) {
    throw new TypeError(`KB index path must stay under ${AI_DM_KB_FIXTURE_DIRECTORY}: ${candidate}.`);
  }
  return candidate as RepoRelativeKbPath;
}

async function resolveFixturePath(
  cwd: string,
  fixtureDirectory: string,
  candidate: string,
): Promise<{ readonly repoRelativePath: RepoRelativeKbPath; readonly absolutePath: string }> {
  const repoRelativePath = lexicalRepoRelativePath(candidate);
  const requestedPath = resolve(cwd, repoRelativePath);
  if (!pathIsInside(fixtureDirectory, requestedPath)) {
    throw new TypeError(`KB index path escapes its fixture directory: ${candidate}.`);
  }
  let absolutePath: string;
  try {
    absolutePath = await realpath(requestedPath);
  } catch {
    throw new TypeError(`KB index path does not exist: ${candidate}.`);
  }
  if (!pathIsInside(fixtureDirectory, absolutePath)) {
    throw new TypeError(`KB index path escapes its fixture directory through a symlink: ${candidate}.`);
  }
  return { repoRelativePath, absolutePath };
}

async function loadComponent(
  cwd: string,
  fixtureDirectory: string,
  candidate: string,
): Promise<KbComponent> {
  const resolved = await resolveFixturePath(cwd, fixtureDirectory, candidate);
  const bytes = await readFile(resolved.absolutePath);
  return {
    ...resolved,
    text: bytes.toString('utf8'),
    byteCount: bytes.byteLength,
    sha256: sha256(bytes),
  };
}

function subjectFromPath(candidate: RepoRelativeKbPath): KbSubject {
  const filename = basename(candidate);
  const subject = filename.endsWith('.md') ? filename.slice(0, -3) : '';
  const matched = KB_SUBJECTS.find((entry) => entry === subject);
  if (matched === undefined) throw new TypeError(`KB index contains unknown subject path: ${candidate}.`);
  return matched;
}

function indexedSubjectPaths(rootText: string): Readonly<Record<KbSubject, RepoRelativeKbPath>> {
  const matches = [...rootText.matchAll(/^- `([^`]+)` —/gmu)];
  if (matches.length !== KB_SUBJECTS.length) {
    throw new TypeError(`KB root must index exactly ${String(KB_SUBJECTS.length)} subjects.`);
  }
  const indexed = new Map<KbSubject, RepoRelativeKbPath>();
  for (const match of matches) {
    const candidate = lexicalRepoRelativePath(match[1] ?? '');
    const subject = subjectFromPath(candidate);
    if (indexed.has(subject)) throw new TypeError(`KB root contains duplicate subject ${subject}.`);
    indexed.set(subject, candidate);
  }
  const missing = KB_SUBJECTS.find((subject) => !indexed.has(subject));
  if (missing !== undefined) throw new TypeError(`KB root does not index subject ${missing}.`);
  const required = (subject: KbSubject): RepoRelativeKbPath => {
    const candidate = indexed.get(subject);
    if (candidate === undefined) throw new TypeError(`KB root does not index subject ${subject}.`);
    return candidate;
  };
  return {
    actions: required('actions'),
    movement: required('movement'),
    targeting: required('targeting'),
    spells: required('spells'),
    conditions: required('conditions'),
    reactions: required('reactions'),
    protocol: required('protocol'),
  };
}

function replaceIndexedPaths(
  rootText: string,
  subjects: Readonly<Record<KbSubject, KbComponent>>,
): string {
  return KB_SUBJECTS.reduce((text, subject) => {
    const component = subjects[subject];
    return text.replaceAll(component.repoRelativePath, component.absolutePath);
  }, rootText);
}

async function loadBundle(cwd: string, rootAbsolutePath: string): Promise<AiDmKbBundle> {
  const fixtureDirectory = await realpath(resolve(cwd, AI_DM_KB_FIXTURE_DIRECTORY));
  const expectedRoot = await realpath(resolve(cwd, DEFAULT_AI_DM_KB_ROOT));
  if (rootAbsolutePath !== expectedRoot) {
    throw new TypeError(`Bundled --kb root must be ${DEFAULT_AI_DM_KB_ROOT}.`);
  }
  const root = await loadComponent(cwd, fixtureDirectory, DEFAULT_AI_DM_KB_ROOT);
  if (root.byteCount > AI_DM_KB_ROOT_TARGET_BYTES) {
    throw new TypeError(`KB root exceeds its ${String(AI_DM_KB_ROOT_TARGET_BYTES)}-byte cap.`);
  }
  if (root.byteCount >= AI_DM_KB_ROOT_HARD_BYTES) {
    throw new TypeError(`KB root reaches its ${String(AI_DM_KB_ROOT_HARD_BYTES)}-byte hard stop.`);
  }
  const indexed = indexedSubjectPaths(root.text);
  const [actions, movement, targeting, spells, conditions, reactions, protocol, tactics] =
    await Promise.all([
      loadComponent(cwd, fixtureDirectory, indexed.actions),
      loadComponent(cwd, fixtureDirectory, indexed.movement),
      loadComponent(cwd, fixtureDirectory, indexed.targeting),
      loadComponent(cwd, fixtureDirectory, indexed.spells),
      loadComponent(cwd, fixtureDirectory, indexed.conditions),
      loadComponent(cwd, fixtureDirectory, indexed.reactions),
      loadComponent(cwd, fixtureDirectory, indexed.protocol),
      loadComponent(cwd, fixtureDirectory, `${AI_DM_KB_FIXTURE_DIRECTORY}/tactics.md`),
    ]);
  const subjects = { actions, movement, targeting, spells, conditions, reactions, protocol };
  const rawStartup = `${root.text}\n\n${tactics.text}`;
  if (Buffer.byteLength(rawStartup, 'utf8') > AI_DM_KB_STARTUP_HARD_BYTES) {
    throw new TypeError(`KB startup pair exceeds its ${String(AI_DM_KB_STARTUP_HARD_BYTES)}-byte hard stop.`);
  }
  return {
    kind: 'bundle',
    root,
    tactics,
    subjects,
    componentSha256: {
      root: root.sha256,
      tactics: tactics.sha256,
      subjects: {
        actions: actions.sha256,
        movement: movement.sha256,
        targeting: targeting.sha256,
        spells: spells.sha256,
        conditions: conditions.sha256,
        reactions: reactions.sha256,
        protocol: protocol.sha256,
      },
    },
    startupInstructions: `${replaceIndexedPaths(root.text, subjects)}\n\n${tactics.text}`,
    combinedStartupHash: sha256(rawStartup),
  };
}

async function loadLegacySingleFile(
  cwd: string,
  fixtureDirectory: string,
  rootAbsolutePath: string,
): Promise<LegacySingleFileKnowledgeBase> {
  const name = basename(rootAbsolutePath);
  if (!LEGACY_SINGLE_FILE_NAMES.some((candidate) => candidate === name)) {
    throw new TypeError('--kb must name ai-dm-core.md or a historical k5/k6/k7 fixture.');
  }
  if (dirname(rootAbsolutePath) !== fixtureDirectory) {
    throw new TypeError('Historical single-file KBs must come from tests/fixtures/ai-dm-kb.');
  }
  const file = await loadComponent(cwd, fixtureDirectory, `${AI_DM_KB_FIXTURE_DIRECTORY}/${name}`);
  return {
    kind: 'legacy_single_file',
    file,
    startupInstructions: file.text,
    combinedStartupHash: file.sha256,
  };
}

export async function loadAiDmKnowledgeBase(
  cwd: string,
  rootPath: string,
): Promise<LoadedAiDmKnowledgeBase> {
  const resolvedCwd = resolve(cwd);
  const fixtureDirectory = await realpath(resolve(resolvedCwd, AI_DM_KB_FIXTURE_DIRECTORY));
  let rootAbsolutePath: string;
  try {
    rootAbsolutePath = await realpath(resolve(resolvedCwd, rootPath));
  } catch {
    throw new TypeError(`--kb path does not exist: ${rootPath}.`);
  }
  if (!pathIsInside(fixtureDirectory, rootAbsolutePath)) {
    throw new TypeError(`--kb must stay under ${AI_DM_KB_FIXTURE_DIRECTORY}.`);
  }
  return basename(rootAbsolutePath) === 'ai-dm-core.md'
    ? loadBundle(resolvedCwd, rootAbsolutePath)
    : loadLegacySingleFile(resolvedCwd, fixtureDirectory, rootAbsolutePath);
}
