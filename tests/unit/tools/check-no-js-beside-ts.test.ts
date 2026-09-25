import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';

/**
 * `scripts/check-no-js-beside-ts.mjs` is the lint-gate ban (D893) that lets the
 * engine child bundle skip a per-spawn shadowing check: Vite resolves './x' to
 * x.mjs or x.js before x.ts, so a JavaScript file beside a sealed TypeScript
 * input would change what vite-node runs without changing a sealed byte.
 */
const CHECK = resolve('scripts/check-no-js-beside-ts.mjs');
const JAVASCRIPT_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx'] as const;
const TYPESCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'] as const;
const DIRECTORIES = ['src', 'tools', 'src/a/b', 'tools/c'] as const;

/** Files the ban must leave alone; three of them are JavaScript files under src/ or tools/. */
const CLEAN_TREE = [
  'src/engine.ts',
  'src/nested/deep/grid.ts',
  'tools/serve.mjs',
  // A declaration file is named x.d, not x: the real tree has this pair in tools/vtt-handoff.
  'tools/serve-existing-dist.mjs',
  'tools/serve-existing-dist.d.mts',
  // Same name, other directory: not a sibling.
  'tools/engine.js',
  // Outside src/ and tools/.
  'tests/probe.js',
  'tests/probe.ts',
] as const;

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

describe('no .js beside a same-named .ts in src/ and tools/', () => {
  it('passes a checkout whose JavaScript files have no same-named TypeScript sibling', () => {
    const result = withCheckout(CLEAN_TREE, runCheck);

    expect(result.errors).toEqual([]);
    expect(result.stdout).toBe(
      'no-js-beside-ts: 3 JavaScript files under src/ and tools/, none beside a same-named TypeScript file\n',
    );
    expect(result.status).toBe(0);
  });

  it('fails for every JavaScript extension beside every TypeScript extension, in src/ and tools/, at any depth', () => {
    const planted: string[] = [];
    const expected: string[] = [];
    JAVASCRIPT_EXTENSIONS.forEach((javascript, row) => {
      TYPESCRIPT_EXTENSIONS.forEach((typescript, column) => {
        const directory = DIRECTORIES[(row + column) % DIRECTORIES.length];
        const name = `${String(directory)}/planted-${String(row)}-${String(column)}`;
        planted.push(`${name}${typescript}`, `${name}${javascript}`);
        expected.push(`no-js-beside-ts: ${name}${javascript} is beside ${name}${typescript}`);
      });
    });
    // The review's scenario C (x3 fix r3): src/engine.js created beside src/engine.ts.
    planted.push('src/engine.js');
    expected.push('no-js-beside-ts: src/engine.js is beside src/engine.ts');
    // One JavaScript file beside two TypeScript files is reported against both.
    planted.push('tools/c/both.ts', 'tools/c/both.tsx', 'tools/c/both.js');
    expected.push(
      'no-js-beside-ts: tools/c/both.js is beside tools/c/both.ts',
      'no-js-beside-ts: tools/c/both.js is beside tools/c/both.tsx',
    );

    const result = withCheckout([...CLEAN_TREE, ...planted], runCheck);

    const [hint, ...reported] = [...result.errors].reverse();
    expect(hint).toContain("Vite resolves './x' to x.mjs or x.js before x.ts");
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
