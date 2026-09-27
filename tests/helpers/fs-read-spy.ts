import { syncBuiltinESMExports } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * What a synchronous action read through node:fs, sorted and absolute, by the
 * observation the verdict recorder (`verdict-fs-recorder-setup.mjs`) makes of
 * each read: `contents` for readFile, open for reading and createReadStream
 * (its `file:`), `listings` for readdir (`directory:`), `existence` for every
 * other read (`path:`). A read by file descriptor is `<file descriptor>`.
 */
export interface FileReads {
  readonly contents: readonly string[];
  readonly existence: readonly string[];
  readonly listings: readonly string[];
}

/** The read functions the verdict recorder patches, on `fs` and on `fs.promises`. */
const FS_READS = [
  'access', 'accessSync', 'createReadStream', 'existsSync', 'lstat', 'lstatSync', 'open', 'openSync',
  'readFile', 'readFileSync', 'readdir', 'readdirSync', 'realpath', 'realpathSync', 'stat', 'statSync',
] as const;
const PROMISE_READS = ['access', 'lstat', 'open', 'readFile', 'readdir', 'realpath', 'stat'] as const;

function kindOf(operation: string): keyof FileReads {
  if (operation.endsWith('readdir') || operation.endsWith('readdirSync')) return 'listings';
  if (
    operation.endsWith('readFile') || operation.endsWith('readFileSync') || operation.endsWith('open') ||
    operation.endsWith('openSync') || operation === 'createReadStream'
  ) return 'contents';
  return 'existence';
}

function pathOf(input: unknown): string {
  if (typeof input === 'number') return '<file descriptor>';
  if (input !== null && typeof input === 'object' && 'fd' in input) return '<file descriptor>';
  return resolve(input instanceof URL ? fileURLToPath(input) : String(input));
}

/**
 * Runs `action` with every node:fs read the verdict recorder observes wrapped,
 * including the live ESM bindings of modules that imported them by name, and
 * restores the functions it found (the recorder's own, when it is active).
 */
export function observeFileReads<T>(action: () => T): { readonly result: T; readonly reads: FileReads } {
  const fs = process.getBuiltinModule('node:fs');
  const seen = { contents: new Set<string>(), existence: new Set<string>(), listings: new Set<string>() };
  const restores: (() => void)[] = [];
  const wrap = (target: Record<string, unknown>, name: string, operation: string): void => {
    const found = target[name];
    if (typeof found !== 'function') throw new TypeError(`node:fs has no read function ${operation}.`);
    target[name] = (...args: unknown[]): unknown => {
      const opens = operation.endsWith('open') || operation.endsWith('openSync');
      const flags = String(args[1] ?? 'r');
      if (!opens || flags.includes('r') || flags.includes('+')) seen[kindOf(operation)].add(pathOf(args[0]));
      return Reflect.apply(found, target, args);
    };
    restores.push(() => { target[name] = found; });
  };
  for (const name of FS_READS) wrap(fs as unknown as Record<string, unknown>, name, name);
  for (const name of PROMISE_READS) wrap(fs.promises as unknown as Record<string, unknown>, name, `promises.${name}`);
  syncBuiltinESMExports();
  try {
    const result = action();
    return {
      result,
      reads: {
        contents: [...seen.contents].sort(), existence: [...seen.existence].sort(), listings: [...seen.listings].sort(),
      },
    };
  } finally {
    for (const restore of restores.reverse()) restore();
    syncBuiltinESMExports();
  }
}
