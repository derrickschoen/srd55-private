import { createHash } from 'node:crypto';
import {
  closeSync, constants, fstatSync, fsyncSync, mkdirSync, openSync, readSync, realpathSync,
  linkSync, unlinkSync, writeSync,
} from 'node:fs';
import { join, resolve, sep } from 'node:path';

export interface FileIdentity {
  readonly device: bigint;
  readonly inode: bigint;
  readonly size: number;
  readonly sha256: string;
}

export interface AnchoredFile {
  readonly bytes: Buffer;
  readonly identity: FileIdentity;
  readonly canonicalPath: string;
}

export interface SafeFileHooks {
  readonly beforeChildOpen?: (parentRelativePath: string, component: string) => void;
  readonly afterDirectoryOpen?: (relativePath: string) => void;
  readonly onFileRead?: (canonicalPath: string) => void;
}

/*
 * Node has no openat binding. Linux staging therefore depends on /proc/self/fd:
 * every child is opened beneath a retained parent descriptor, then fstat and
 * proc-fd realpath are checked. Doctor refuses staging when that mount is absent.
 */

function fail(code: string, detail: string): never {
  throw new Error(`${code}: ${detail}`);
}

export function assertProcFdAvailable(): void {
  if (process.platform !== 'linux') fail('LINUX_REQUIRED', process.platform);
  let handle: number;
  try {
    handle = openSync('/proc/self/fd', constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  } catch {
    fail('PROC_SELF_FD_UNAVAILABLE', '/proc/self/fd');
  }
  closeSync(handle);
}

export function safeRelativeComponents(relativePath: string): readonly string[] {
  if (relativePath.length === 0 || relativePath.length > 4_096 || relativePath.includes('\\') || relativePath.startsWith('/') ||
    /^[A-Za-z]:/u.test(relativePath) || relativePath.includes('\0')) {
    fail('UNSAFE_RELATIVE_PATH', relativePath);
  }
  const components = relativePath.split('/');
  if (components.length > 64 || components.some((component) =>
    component.length === 0 || component.length > 255 || component === '.' || component === '..')) {
    fail('UNSAFE_RELATIVE_PATH', relativePath);
  }
  return components;
}

function procChild(parent: number, component: string): string {
  return `/proc/self/fd/${String(parent)}/${component}`;
}

function procCanonical(handle: number): string {
  const canonical = realpathSync(`/proc/self/fd/${String(handle)}`);
  if (canonical.endsWith(' (deleted)')) fail('ANCHORED_PATH_DELETED', canonical);
  return canonical;
}

interface OpenParent {
  readonly handle: number;
  readonly handles: readonly number[];
  readonly canonicalRoot: string;
  readonly expectedParent: string;
}

function closeParent(parent: OpenParent): void {
  for (const handle of [...parent.handles].reverse()) closeSync(handle);
}

function openParent(root: string, components: readonly string[], hooks?: SafeFileHooks): OpenParent {
  assertProcFdAvailable();
  const absoluteRoot = resolve(root);
  const rootHandle = openSync(absoluteRoot, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  let handle = rootHandle;
  const handles = [rootHandle];
  const canonicalRoot = procCanonical(rootHandle);
  if (canonicalRoot !== absoluteRoot) {
    closeSync(rootHandle);
    fail('ANCHORED_ROOT_MISMATCH', root);
  }
  let expectedParent = canonicalRoot;
  let relativePath = '';
  hooks?.afterDirectoryOpen?.(relativePath);
  try {
    for (const component of components) {
      hooks?.beforeChildOpen?.(relativePath, component);
      const child = openSync(procChild(handle, component), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      const stat = fstatSync(child, { bigint: true });
      const expected = join(expectedParent, component);
      if (!stat.isDirectory() || procCanonical(child) !== expected) {
        closeSync(child);
        fail('ANCHORED_DIRECTORY_MISMATCH', expected);
      }
      handle = child;
      handles.push(child);
      expectedParent = expected;
      relativePath = relativePath.length === 0 ? component : `${relativePath}/${component}`;
      hooks?.afterDirectoryOpen?.(relativePath);
    }
    return { handle, handles, canonicalRoot, expectedParent };
  } catch (error) {
    for (const retained of [...handles].reverse()) closeSync(retained);
    throw error;
  }
}

function readBounded(handle: number, size: number): Buffer {
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(handle, bytes, offset, size - offset, offset);
    if (count === 0) fail('ANCHORED_FILE_SHORT_READ', String(size));
    offset += count;
  }
  const extra = Buffer.alloc(1);
  if (readSync(handle, extra, 0, 1, size) !== 0) fail('ANCHORED_FILE_GREW', String(size));
  return bytes;
}

export function readAnchoredFile(
  root: string,
  relativePath: string,
  maximumBytes: number,
  hooks?: SafeFileHooks,
): AnchoredFile {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) fail('INVALID_FILE_BOUND', String(maximumBytes));
  const components = safeRelativeComponents(relativePath);
  const filename = components.at(-1);
  if (filename === undefined) fail('UNSAFE_RELATIVE_PATH', relativePath);
  const parent = openParent(root, components.slice(0, -1), hooks);
  let handle: number | null = null;
  try {
    hooks?.beforeChildOpen?.(components.slice(0, -1).join('/'), filename);
    handle = openSync(
      procChild(parent.handle, filename),
      constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
    );
    const before = fstatSync(handle, { bigint: true });
    if (!before.isFile()) fail('REGULAR_FILE_REQUIRED', relativePath);
    if (before.size > BigInt(maximumBytes) || before.size > BigInt(Number.MAX_SAFE_INTEGER)) {
      fail('FILE_SIZE_LIMIT', relativePath);
    }
    const expected = join(parent.expectedParent, filename);
    const canonicalPath = procCanonical(handle);
    if (canonicalPath !== expected || !canonicalPath.startsWith(`${parent.canonicalRoot}${sep}`)) {
      fail('ANCHORED_FILE_MISMATCH', relativePath);
    }
    hooks?.onFileRead?.(canonicalPath);
    const bytes = readBounded(handle, Number(before.size));
    const after = fstatSync(handle, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs) {
      fail('ANCHORED_FILE_CHANGED', relativePath);
    }
    return {
      bytes,
      canonicalPath,
      identity: {
        device: before.dev,
        inode: before.ino,
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    };
  } finally {
    if (handle !== null) closeSync(handle);
    closeParent(parent);
  }
}

export function sameFileIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.device === right.device && left.inode === right.inode && left.size === right.size && left.sha256 === right.sha256;
}

/** Creates trusted staging directories through retained parent descriptors. */
export function ensureAnchoredDirectory(root: string, relativePath: string): void {
  const components = safeRelativeComponents(relativePath);
  let parent = openParent(root, []);
  try {
    for (const component of components) {
      const childPath = procChild(parent.handle, component);
      try {
        mkdirSync(childPath, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      const next = openSync(childPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      const expected = join(parent.expectedParent, component);
      if (!fstatSync(next).isDirectory() || procCanonical(next) !== expected) {
        closeSync(next);
        fail('ANCHORED_DIRECTORY_MISMATCH', expected);
      }
      parent = {
        handle: next,
        handles: [...parent.handles, next],
        canonicalRoot: parent.canonicalRoot,
        expectedParent: expected,
      };
    }
  } finally {
    closeParent(parent);
  }
}

export function createAnchoredDirectoryExclusive(root: string, relativePath: string): void {
  const components = safeRelativeComponents(relativePath);
  const name = components.at(-1);
  if (name === undefined) fail('UNSAFE_RELATIVE_PATH', relativePath);
  const parent = openParent(root, components.slice(0, -1));
  try {
    try {
      mkdirSync(procChild(parent.handle, name), { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') fail('DESTINATION_COLLISION', relativePath);
      throw error;
    }
    const child = openSync(procChild(parent.handle, name), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    try {
      if (!fstatSync(child).isDirectory() || procCanonical(child) !== join(parent.expectedParent, name)) {
        fail('ANCHORED_DIRECTORY_MISMATCH', relativePath);
      }
    } finally {
      closeSync(child);
    }
  } finally {
    closeParent(parent);
  }
}

export function createAnchoredFileExclusive(root: string, relativePath: string, bytes: Buffer): FileIdentity {
  const components = safeRelativeComponents(relativePath);
  const filename = components.at(-1);
  if (filename === undefined) fail('UNSAFE_RELATIVE_PATH', relativePath);
  const parent = openParent(root, components.slice(0, -1));
  let handle: number | null = null;
  try {
    handle = openSync(
      procChild(parent.handle, filename),
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    let offset = 0;
    while (offset < bytes.length) offset += writeSync(handle, bytes, offset, bytes.length - offset, offset);
    fsyncSync(handle);
    const stat = fstatSync(handle, { bigint: true });
    if (!stat.isFile() || Number(stat.size) !== bytes.length || procCanonical(handle) !== join(parent.expectedParent, filename)) {
      fail('ANCHORED_DESTINATION_MISMATCH', relativePath);
    }
    return {
      device: stat.dev,
      inode: stat.ino,
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') fail('DESTINATION_COLLISION', relativePath);
    throw error;
  } finally {
    if (handle !== null) closeSync(handle);
    closeParent(parent);
  }
}

export function promoteAnchoredPartial(
  root: string,
  partialPath: string,
  destinationPath: string,
  beforePromotion?: (destinationPath: string) => void,
): void {
  const partialComponents = safeRelativeComponents(partialPath);
  const destinationComponents = safeRelativeComponents(destinationPath);
  const partialName = partialComponents.at(-1);
  const destinationName = destinationComponents.at(-1);
  if (partialName === undefined || destinationName === undefined ||
    JSON.stringify(partialComponents.slice(0, -1)) !== JSON.stringify(destinationComponents.slice(0, -1))) {
    fail('ANCHORED_RENAME_PARENT_MISMATCH', destinationPath);
  }
  const parent = openParent(root, partialComponents.slice(0, -1));
  try {
    beforePromotion?.(destinationPath);
    linkSync(procChild(parent.handle, partialName), procChild(parent.handle, destinationName));
    fsyncSync(parent.handle);
    unlinkSync(procChild(parent.handle, partialName));
    fsyncSync(parent.handle);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') fail('DESTINATION_COLLISION', destinationPath);
    throw error;
  } finally {
    closeParent(parent);
  }
}

export function unlinkAnchoredFile(root: string, relativePath: string): void {
  const components = safeRelativeComponents(relativePath);
  const filename = components.at(-1);
  if (filename === undefined) fail('UNSAFE_RELATIVE_PATH', relativePath);
  const parent = openParent(root, components.slice(0, -1));
  try {
    unlinkSync(procChild(parent.handle, filename));
  } finally {
    closeParent(parent);
  }
}
