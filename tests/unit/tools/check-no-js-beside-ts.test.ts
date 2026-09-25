import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VITE_RESOLVE_EXTENSIONS } from '../../../tools/engine-child-bundle';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';

/**
 * `scripts/check-no-js-beside-ts.mjs` is the lint-gate ban (D893) that lets the
 * engine child bundle skip a per-spawn shadowing check: a same-named file that
 * Vite resolves before a sealed TypeScript input would change what vite-node
 * runs without changing a sealed byte.
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

/** Files the ban must leave alone; seven of them are TypeScript files under src/ or tools/. */
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
  // Outside src/ and tools/.
  'tests/probe.js',
  'tests/probe.ts',
] as const;

function isTypeScriptExtension(suffix: string): suffix is TypeScriptExtension {
  return (TYPESCRIPT_EXTENSIONS as readonly string[]).includes(suffix);
}

function withCheckout<T>(files: readonly string[], run: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'no-js-beside-ts-'));
  try {
    for (const file of files) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), `// ${file}\n`, 'utf8');
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

describe('no file beside a TypeScript file in src/ or tools/ that Vite resolves first, and no JavaScript file', () => {
  it('bans what the extension order the engine child bundle builds with resolves first, and every JavaScript extension', () => {
    const order: readonly string[] = VITE_RESOLVE_EXTENSIONS;
    const derived = TYPESCRIPT_EXTENSIONS.map((extension) => {
      const position = order.indexOf(extension);
      const resolvedFirst = position < 0 ? [] : ['', ...order.slice(0, position)];
      return [extension, [...new Set([...resolvedFirst, ...JAVASCRIPT_EXTENSIONS])].sort()];
    });

    expect(TYPESCRIPT_EXTENSIONS.map((extension) => [extension, [...BANNED_BESIDE[extension]].sort()])).toEqual(derived);
  });

  it('passes a checkout with no banned file beside a TypeScript file', () => {
    const result = withCheckout(CLEAN_TREE, runCheck);

    expect(result.errors).toEqual([]);
    expect(result.stdout).toBe(
      'no-js-beside-ts: 7 TypeScript files under src/ and tools/, none with a banned same-named file beside it\n',
    );
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

    const result = withCheckout([...CLEAN_TREE, ...planted], runCheck);

    const [hint, ...reported] = [...result.errors].reverse();
    expect(hint).toContain("Vite resolves './x' to the first of x, x.mjs, x.js, x.mts, x.ts, x.jsx and x.tsx that exists");
    expect(expected).toHaveLength(29);
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
