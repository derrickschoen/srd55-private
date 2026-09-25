import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VITE_RESOLVE_EXTENSIONS } from '../../../tools/engine-child-bundle';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from '../../helpers/test-filesystem';

/**
 * `scripts/check-no-js-beside-ts.mjs` is the lint-gate ban (D893) that lets the
 * engine child bundle skip a per-spawn shadowing check: a file that Vite
 * resolves before a sealed TypeScript input would change what vite-node runs
 * without changing a sealed byte.
 */
const CHECK = resolve('scripts/check-no-js-beside-ts.mjs');
const JAVASCRIPT_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx'] as const;
const TYPESCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'] as const;
type TypeScriptExtension = (typeof TYPESCRIPT_EXTENSIONS)[number];
const DIRECTORIES = ['src', 'tools', 'src/a/b', 'tools/c'] as const;

/**
 * What may follow the name x beside x plus each TypeScript extension ('' is
 * the file x itself): what Vite tries first when it resolves './x', then any
 * JavaScript extension.
 */
const BANNED_BESIDE: Readonly<Record<TypeScriptExtension, readonly string[]>> = {
  '.ts': ['', '.mjs', '.js', '.mts', /* JavaScript: */ '.cjs', '.jsx'],
  '.tsx': ['', '.mjs', '.js', '.mts', '.ts', '.jsx', /* JavaScript: */ '.cjs'],
  '.mts': ['', '.mjs', '.js', /* JavaScript: */ '.cjs', '.jsx'],
  // Vite never tries .cts for './x'.
  '.cts': [/* JavaScript: */ '.js', '.mjs', '.cjs', '.jsx'],
};

/** Every suffix the matrix puts beside every TypeScript extension. */
const SUFFIXES = ['', '.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.cjs', '.cts', '.d.ts', '.css'] as const;

/**
 * For d/index plus each of these extensions, './d' reaches the index file after
 * trying d plus each of Vite's extensions beside the directory, then
 * d/package.json. './d' never reaches d/index.cts.
 */
const INDEX_REACHED_AS_DIRECTORY = ['.ts', '.tsx', '.mts'] as const;
const BANNED_FOR_DIRECTORY = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '/package.json'] as const;
const DIRECTORY_SUFFIXES = [...BANNED_FOR_DIRECTORY, '.cjs', '.cts', '.css'] as const;

/**
 * A TypeScript file named like y.js.ts, beside another file: './y.js' tries y.js,
 * then y.ts and y.tsx, then y.js plus Vite's extensions.
 */
const JAVASCRIPT_NAMED: readonly (readonly [typescript: string, other: string, banned: boolean])[] = [
  ['y.js.ts', 'y.ts', true],
  ['y.js.ts', 'y.tsx', true],
  ['y.js.ts', 'y.mts', false],
  ['y.js.ts', 'y.cts', false],
  ['y.mjs.ts', 'y.mts', true],
  ['y.mjs.ts', 'y.ts', false],
  ['y.cjs.ts', 'y.cts', true],
  ['y.cjs.ts', 'y.ts', false],
  ['y.jsx.ts', 'y.tsx', true],
  ['y.jsx.ts', 'y.ts', false],
  ['y.js.tsx', 'y.ts', true],
  ['y.js.mts', 'y.tsx', true],
  // './y.js' never reaches y.js.cts.
  ['y.js.cts', 'y.ts', false],
];

/** Files the ban must leave alone; thirteen of them are TypeScript files under src/ or tools/. */
const CLEAN_TREE = [
  'src/engine.ts',
  'src/nested/deep/grid.ts',
  // A directory is not banned: './nested' tries nested.ts before the directory nested.
  'src/nested.ts',
  // Vite tries data.ts before data.json.
  'src/data.ts',
  'src/data.json',
  // Vite never tries .cts for './legacy', and .ts is not a JavaScript extension.
  'tools/legacy.ts',
  'tools/legacy.cts',
  'tools/serve.mjs',
  // A declaration file is named x.d, not x: the real tree has this pair in tools/vtt-handoff.
  'tools/serve-existing-dist.mjs',
  'tools/serve-existing-dist.d.mts',
  // Same name, other directory: not beside.
  'tools/engine.js',
  // A directory module whose neighbours Vite does not try for './mod'.
  'src/mod/index.ts',
  'src/mod.cts',
  'src/mod.css',
  // './other' never reaches other/index.cts, so other.ts takes nothing over.
  'src/other/index.cts',
  'src/other.ts',
  // A package.json beside a TypeScript file that is no directory's index (tools/sim has one).
  'tools/pkg/package.json',
  'tools/pkg/main.ts',
  // Beside a symbolic link to a directory (below): src/linked is no file.
  'src/linked.ts',
  // Outside src/ and tools/.
  'tests/probe.js',
  'tests/probe.ts',
] as const;

/** Symbolic links, as [path, target relative to the link's directory]. */
const CLEAN_LINKS: readonly (readonly [string, string])[] = [['src/linked', 'nested']];

function isTypeScriptExtension(suffix: string): suffix is TypeScriptExtension {
  return (TYPESCRIPT_EXTENSIONS as readonly string[]).includes(suffix);
}

function withCheckout<T>(
  files: readonly string[], run: (root: string) => T, links: readonly (readonly [string, string])[] = [],
): T {
  const root = mkdtempSync(join(tmpdir(), 'no-js-beside-ts-'));
  try {
    for (const file of files) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), `// ${file}\n`, 'utf8');
    }
    for (const [path, target] of links) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      symlinkSync(target, join(root, path));
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runCheck(root: string): { readonly status: number | null; readonly stdout: string; readonly errors: readonly string[] } {
  const result = spawnSync(process.execPath, [CHECK, '--root', root], { encoding: 'utf8' });
  return {
    status: result.status,
    stdout: result.stdout,
    errors: result.stderr.split('\n').filter((line) => line !== ''),
  };
}

const beside = (file: string, typescript: string): string => `no-js-beside-ts: ${file} is beside ${typescript}`;
const HINT_START = "Vite resolves './x' to the first of x, x.mjs, x.js, x.mts, x.ts, x.jsx and x.tsx that exists, and './d' to";

describe('no file beside a TypeScript file in src/ or tools/ that Vite resolves first, and no JavaScript file', () => {
  it('bans what the extension order the engine child bundle builds with resolves first, and every JavaScript extension', () => {
    const order: readonly string[] = VITE_RESOLVE_EXTENSIONS;
    const derived = TYPESCRIPT_EXTENSIONS.map((extension) => {
      const position = order.indexOf(extension);
      const resolvedFirst = position < 0 ? [] : ['', ...order.slice(0, position)];
      return [extension, [...new Set([...resolvedFirst, ...JAVASCRIPT_EXTENSIONS])].sort()];
    });

    expect(TYPESCRIPT_EXTENSIONS.map((extension) => [extension, [...BANNED_BESIDE[extension]].sort()])).toEqual(derived);
    expect(INDEX_REACHED_AS_DIRECTORY).toEqual(TYPESCRIPT_EXTENSIONS.filter((extension) => order.includes(extension)));
    expect(BANNED_FOR_DIRECTORY).toEqual([...order, '/package.json']);
  });

  it('passes a checkout with no banned file beside a TypeScript file', () => {
    const result = withCheckout(CLEAN_TREE, runCheck, CLEAN_LINKS);

    expect(result.errors).toEqual([]);
    expect(result.stdout).toBe('no-js-beside-ts: 13 TypeScript files under src/ and tools/, none with a banned file beside it\n');
    expect(result.status).toBe(0);
  });

  it('fails for exactly the banned files beside each TypeScript extension, in src/ and tools/, at any depth', () => {
    const planted: string[] = [];
    const expected: string[] = [];
    SUFFIXES.forEach((suffix, row) => {
      TYPESCRIPT_EXTENSIONS.forEach((typescript, column) => {
        if (suffix === typescript) return;
        const directory = DIRECTORIES[(row + column) % DIRECTORIES.length];
        const name = `${String(directory)}/planted-${String(row)}-${String(column)}`;
        planted.push(`${name}${typescript}`, `${name}${suffix}`);
        if (BANNED_BESIDE[typescript].includes(suffix)) expected.push(beside(`${name}${suffix}`, `${name}${typescript}`));
        // The pair the other way round, when the planted file is TypeScript too (x.ts beside x.tsx).
        if (isTypeScriptExtension(suffix) && BANNED_BESIDE[suffix].includes(typescript)) {
          expected.push(beside(`${name}${typescript}`, `${name}${suffix}`));
        }
      });
    });
    // The review's scenario C (x3 fix r3): src/engine.js created beside src/engine.ts.
    planted.push('src/engine.js');
    expected.push(beside('src/engine.js', 'src/engine.ts'));
    // Every banned file beside one TypeScript file is reported, and one file beside two against both.
    planted.push('tools/c/both.ts', 'tools/c/both.tsx', 'tools/c/both.js');
    expected.push(
      beside('tools/c/both.js', 'tools/c/both.ts'),
      beside('tools/c/both.js', 'tools/c/both.tsx'),
      beside('tools/c/both.ts', 'tools/c/both.tsx'),
    );
    // A symbolic link counts as the file it points to.
    planted.push('src/aliased.ts');
    expected.push(beside('src/aliased.js', 'src/aliased.ts'));

    const result = withCheckout([...CLEAN_TREE, ...planted], runCheck, [...CLEAN_LINKS, ['src/aliased.js', 'data.json']]);

    const [hint, ...reported] = [...result.errors].reverse();
    expect(hint).toContain(HINT_START);
    expect(expected).toHaveLength(30);
    expect([...reported].sort()).toEqual([...expected].sort());
    expect(result.stdout).toBe('');
    expect(result.status).toBe(1);
  });

  it("fails for what Vite resolves before a directory's index file, or before a TypeScript file named like y.js.ts", () => {
    const planted: string[] = [];
    const expected: string[] = [];
    TYPESCRIPT_EXTENSIONS.forEach((typescript, column) => {
      DIRECTORY_SUFFIXES.forEach((suffix, row) => {
        const directory = `${String(DIRECTORIES[(row + column) % DIRECTORIES.length])}/module-${String(row)}-${String(column)}`;
        const index = `${directory}/index${typescript}`;
        planted.push(index, `${directory}${suffix}`);
        if (!(INDEX_REACHED_AS_DIRECTORY as readonly string[]).includes(typescript)) return;
        if (suffix === '/package.json') expected.push(beside(`${directory}${suffix}`, index));
        else if ((BANNED_FOR_DIRECTORY as readonly string[]).includes(suffix)) {
          expected.push(beside(`${directory}${suffix}`, `${directory}/, the directory of ${index}`));
        }
      });
    });
    JAVASCRIPT_NAMED.forEach(([typescript, other, banned], row) => {
      const directory = `${String(DIRECTORIES[row % DIRECTORIES.length])}/named-${String(row)}`;
      planted.push(`${directory}/${typescript}`, `${directory}/${other}`);
      if (banned) expected.push(beside(`${directory}/${other}`, `${directory}/${typescript}`));
    });

    const result = withCheckout([...CLEAN_TREE, ...planted], runCheck, CLEAN_LINKS);

    const [hint, ...reported] = [...result.errors].reverse();
    expect(hint).toContain(HINT_START);
    expect(expected).toHaveLength(31);
    expect([...reported].sort()).toEqual([...expected].sort());
    expect(result.stdout).toBe('');
    expect(result.status).toBe(1);
  });

  it('fails, rather than passing, when src/ or tools/ cannot be read', () => {
    const result = withCheckout(['tools/serve.mjs'], runCheck);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/^no-js-beside-ts: src\/ could not be read under .*, so nothing in it was checked: ENOENT/u);
    expect(result.stdout).toBe('');
    expect(result.status).toBe(1);
  });
});
