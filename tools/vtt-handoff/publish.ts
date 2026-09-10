import { randomBytes } from 'node:crypto';
import {
  closeSync, constants, existsSync, fsyncSync, linkSync, mkdirSync, openSync,
  readFileSync, unlinkSync, writeSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handoffPaths, type RepositoryIdentityPolicy } from './paths.ts';

interface PublicationEntry {
  readonly path: string;
  readonly bytes: Buffer;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function json(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function corePayloads(repositoryRoot: string): readonly PublicationEntry[] {
  const source = (relative: string): Buffer => readFileSync(join(repositoryRoot, relative));
  return [
    { path: 'contracts/v1/protocol.schema.json', bytes: source('contracts/vtt-handoff/v1/protocol.schema.json') },
    { path: 'contracts/v1/art.schema.json', bytes: source('contracts/vtt-handoff/v1/art.schema.json') },
    { path: 'contracts/v1/contracts.d.ts', bytes: source('contracts/vtt-handoff/v1/contracts.d.ts') },
    { path: 'fixtures/scenes/two-room.v1.json', bytes: source('fixtures/scenes/two-room.v1.json') },
    { path: 'fixtures/scenes/two-room.snapshots.v1.json', bytes: source('fixtures/scenes/two-room.snapshots.v1.json') },
  ];
}

function publicationEntries(repositoryRoot: string): readonly PublicationEntry[] {
  const payloads = corePayloads(repositoryRoot);
  const readmeBytes = Buffer.from(
    '# VTT handoff contracts/v1\n\nCore schemas, types, and scene fixtures are ready. Transcript examples are pending and are not published.\n',
  );
  const manifestBytes = json({
    schemaVersion: 1,
    bundle: 'contracts/v1',
    entries: payloads.map((entry) => ({
      path: entry.path, sha256: sha256(entry.bytes), length: entry.bytes.length,
    })),
  });
  return [
    ...payloads,
    { path: 'contracts/v1/README.md', bytes: readmeBytes },
    { path: 'contracts/v1/manifest.json', bytes: manifestBytes },
    { path: 'contracts/v1/READY.json', bytes: json({ core: 'ready', examples: 'pending' }) },
  ];
}

function exampleEntries(repositoryRoot: string): readonly PublicationEntry[] {
  const fixture = readFileSync(join(repositoryRoot, 'fixtures/protocol/examples.v1.json'));
  const payload = { path: 'fixtures/protocol/examples.v1.json', bytes: fixture };
  return [
    payload,
    {
      path: 'contracts/v1/manifest.entries/examples.json',
      bytes: json({
        schemaVersion: 1,
        bundle: 'contracts/v1',
        entries: [{ path: payload.path, sha256: sha256(payload.bytes), length: payload.bytes.length }],
      }),
    },
    {
      path: 'contracts/v1/examples.READY.json',
      bytes: json({ core: 'ready', examples: 'ready' }),
    },
  ];
}

function syncDirectory(directory: string): void {
  const handle = openSync(directory, 'r');
  try { fsyncSync(handle); } finally { closeSync(handle); }
}

function createNoReplace(
  destination: string,
  bytes: Buffer,
  nonce: () => string,
  beforeFinalPlacement?: (destination: string) => void,
): void {
  mkdirSync(dirname(destination), { recursive: true });
  const partial = `${destination}.partial.${nonce()}`;
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW;
  let handle: number;
  try {
    handle = openSync(partial, flags, 0o644);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`PARTIAL_PUBLICATION_COLLISION: ${destination}`);
    }
    throw error;
  }
  try {
    writeSync(handle, bytes);
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  try {
    beforeFinalPlacement?.(destination);
    linkSync(partial, destination);
    syncDirectory(dirname(destination));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`IMMUTABLE_BUNDLE_CONFLICT: ${destination}`);
    }
    throw error;
  } finally {
    unlinkSync(partial);
  }
}

function assertEntry(entry: PublicationEntry, root: string, sealed: boolean): 'present' | 'missing' {
  const destination = join(root, entry.path);
  if (!existsSync(destination)) {
    if (sealed) throw new Error(`INCONSISTENT_SEALED_BUNDLE: missing ${entry.path}`);
    return 'missing';
  }
  if (!readFileSync(destination).equals(entry.bytes)) {
    if (sealed) throw new Error(`INCONSISTENT_SEALED_BUNDLE: conflict ${entry.path}`);
    throw new Error(`IMMUTABLE_BUNDLE_CONFLICT: ${entry.path}`);
  }
  return 'present';
}

export interface PublishResult {
  readonly root: string;
  readonly status: 'published' | 'verified' | 'unchanged';
  readonly files: number;
}

export interface PublishHooks {
  readonly afterCreate?: (relativePath: string) => void;
  readonly beforeFinalPlacement?: (destination: string) => void;
  readonly nonce?: () => string;
}

export function publishCore(options: {
  readonly repositoryRoot?: string;
  readonly handoffRoot?: string;
  readonly check?: boolean;
  readonly identityPolicy?: RepositoryIdentityPolicy;
  readonly hooks?: PublishHooks;
} = {}): PublishResult {
  const paths = handoffPaths({
    ...(options.repositoryRoot === undefined ? {} : { repositoryRoot: options.repositoryRoot }),
    ...(options.handoffRoot === undefined ? {} : { handoffRoot: options.handoffRoot }),
    ...(options.identityPolicy === undefined ? {} : { identityPolicy: options.identityPolicy }),
  });
  const entries = publicationEntries(paths.repositoryRoot);
  const readyPath = join(paths.handoffRoot, 'contracts/v1/READY.json');
  const check = options.check ?? false;
  if (check) {
    const sealed = existsSync(readyPath);
    for (const entry of entries) {
      if (assertEntry(entry, paths.handoffRoot, sealed) === 'missing') {
        throw new Error(`IMMUTABLE_BUNDLE_MISSING: ${entry.path}`);
      }
    }
    return { root: paths.handoffRoot, status: 'verified', files: entries.length };
  }

  mkdirSync(paths.handoffRoot, { recursive: true });
  const lockPath = join(paths.handoffRoot, '.contracts-v1.publish.lock');
  let lock: number;
  try {
    lock = openSync(lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('PUBLICATION_IN_PROGRESS');
    throw error;
  }
  try {
    closeSync(lock);
    const sealed = existsSync(readyPath);
    const states = entries.map((entry) => assertEntry(entry, paths.handoffRoot, sealed));
    if (sealed) return { root: paths.handoffRoot, status: 'unchanged', files: entries.length };
    const nonce = options.hooks?.nonce ?? (() => `${String(process.pid)}.${randomBytes(12).toString('hex')}`);
    let created = 0;
    for (const [index, entry] of entries.entries()) {
      if (states[index] === 'present') continue;
      createNoReplace(
        join(paths.handoffRoot, entry.path),
        entry.bytes,
        nonce,
        options.hooks?.beforeFinalPlacement,
      );
      created += 1;
      options.hooks?.afterCreate?.(entry.path);
    }
    return {
      root: paths.handoffRoot, status: created === 0 ? 'unchanged' : 'published', files: entries.length,
    };
  } finally {
    unlinkSync(lockPath);
    syncDirectory(paths.handoffRoot);
  }
}

export function publishExamples(options: {
  readonly repositoryRoot?: string;
  readonly handoffRoot?: string;
  readonly check?: boolean;
  readonly identityPolicy?: RepositoryIdentityPolicy;
  readonly hooks?: PublishHooks;
} = {}): PublishResult {
  const paths = handoffPaths({
    ...(options.repositoryRoot === undefined ? {} : { repositoryRoot: options.repositoryRoot }),
    ...(options.handoffRoot === undefined ? {} : { handoffRoot: options.handoffRoot }),
    ...(options.identityPolicy === undefined ? {} : { identityPolicy: options.identityPolicy }),
  });
  publishCore({
    repositoryRoot: paths.repositoryRoot,
    handoffRoot: paths.handoffRoot,
    check: true,
    ...(options.identityPolicy === undefined ? {} : { identityPolicy: options.identityPolicy }),
  });
  const entries = exampleEntries(paths.repositoryRoot);
  const readyPath = join(paths.handoffRoot, 'contracts/v1/examples.READY.json');
  const check = options.check ?? false;
  if (check) {
    const sealed = existsSync(readyPath);
    for (const entry of entries) {
      if (assertEntry(entry, paths.handoffRoot, sealed) === 'missing') {
        throw new Error(`IMMUTABLE_BUNDLE_MISSING: ${entry.path}`);
      }
    }
    return { root: paths.handoffRoot, status: 'verified', files: entries.length };
  }

  const lockPath = join(paths.handoffRoot, '.contracts-v1.examples.publish.lock');
  let lock: number;
  try {
    lock = openSync(lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('PUBLICATION_IN_PROGRESS');
    throw error;
  }
  try {
    closeSync(lock);
    const sealed = existsSync(readyPath);
    const states = entries.map((entry) => assertEntry(entry, paths.handoffRoot, sealed));
    if (sealed) return { root: paths.handoffRoot, status: 'unchanged', files: entries.length };
    const nonce = options.hooks?.nonce ?? (() => `${String(process.pid)}.${randomBytes(12).toString('hex')}`);
    let created = 0;
    for (const [index, entry] of entries.entries()) {
      if (states[index] === 'present') continue;
      createNoReplace(
        join(paths.handoffRoot, entry.path),
        entry.bytes,
        nonce,
        options.hooks?.beforeFinalPlacement,
      );
      created += 1;
      options.hooks?.afterCreate?.(entry.path);
    }
    return {
      root: paths.handoffRoot, status: created === 0 ? 'unchanged' : 'published', files: entries.length,
    };
  } finally {
    unlinkSync(lockPath);
    syncDirectory(paths.handoffRoot);
  }
}

if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
  const coreOnly = process.argv.includes('--core') && !process.argv.includes('--examples');
  const examplesOnly = process.argv.includes('--examples') && !process.argv.includes('--core');
  const check = process.argv.includes('--check');
  if (coreOnly) {
    process.stdout.write(`${JSON.stringify(publishCore({ check }))}\n`);
  } else if (examplesOnly) {
    process.stdout.write(`${JSON.stringify(publishExamples({ check }))}\n`);
  } else {
    const core = publishCore({ check });
    const examples = publishExamples({ check });
    process.stdout.write(`${JSON.stringify({ core, examples })}\n`);
  }
}
