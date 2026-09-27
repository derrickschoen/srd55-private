import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { transformWithEsbuild } from 'vite';
import { describe, expect, it } from 'vitest';
import {
  buildModuleGraph,
  classifyModuleReference,
  closure,
  cycles,
  EVALUATION,
  expandGlob,
  moduleReferences,
  parseModule,
  pathTo,
  resolveModuleSpecifier,
  type Evaluation,
  type GraphHost,
  type ModuleReference,
} from '../../../scripts/runtime-import-edges.mjs';

/**
 * `scripts/runtime-import-edges.mjs` is the one definition of a runtime import
 * edge (D915), used by the import-boundary guard and the import censuses; the
 * verdict cache switches to it once RECORDER-A and IMPORT-GUARD have both
 * landed (D919). Its claims are checked here against the transformer that
 * actually runs this repository: Vite's own `transformWithEsbuild`, which
 * reads the tsconfig that owns each file (both projects set
 * `verbatimModuleSyntax`).
 */

function only(statement: string): ModuleReference {
  const references = moduleReferences(parseModule('src/probe.ts', statement));
  expect(references).toHaveLength(1);
  const [reference] = references;
  if (reference === undefined) throw new Error('unreachable');
  return reference;
}

/** Whether Vite keeps a reference to './m' when it transforms `statement` in `file`. */
async function viteKeepsModule(statement: string, file: string): Promise<boolean> {
  const { code } = await transformWithEsbuild(statement, resolve(file), { sourcemap: false });
  return /["']\.\/m["']/u.test(code);
}

const STATIC_FORMS: readonly (readonly [statement: string, evaluation: Evaluation, inlineTypeOnly: boolean])[] = [
  ["import type { A } from './m';", 'erased', false],
  ["import type A from './m';", 'erased', false],
  ["import type * as A from './m';", 'erased', false],
  ["export type { A } from './m';", 'erased', false],
  ["export type * from './m';", 'erased', false],
  ["export type * as A from './m';", 'erased', false],
  ["import { type A } from './m';", 'static', true],
  ["import { type A, type B as C } from './m';", 'static', true],
  ["export { type A } from './m';", 'static', true],
  ["export { type A, type B as C } from './m';", 'static', true],
  ["import { type A, b } from './m';", 'static', false],
  ["import a, { type B } from './m';", 'static', false],
  ["import {} from './m';", 'static', false],
  ["import './m';", 'static', false],
  ["import a from './m';", 'static', false],
  ["import * as m from './m';", 'static', false],
  ["import { b } from './m';", 'static', false],
  ["export * from './m';", 'static', false],
  ["export * as m from './m';", 'static', false],
  ["export { b } from './m';", 'static', false],
];

describe('the runtime-edge classifier', () => {
  it.each(STATIC_FORMS)('classifies %s as %s, as Vite transforms it in src/ and tests/', async (statement, evaluation, inlineTypeOnly) => {
    const reference = only(statement);
    expect(reference.evaluation).toBe(evaluation);
    expect(reference.inlineTypeOnly).toBe(inlineTypeOnly);
    const kept = evaluation !== EVALUATION.ERASED;
    expect(await viteKeepsModule(statement, 'src/import-edge-probe.ts')).toBe(kept);
    expect(await viteKeepsModule(statement, 'tests/unit/tools/import-edge-probe.ts')).toBe(kept);
  });

  it('classifies calls: dynamic imports and require run later, an eager glob loads with the module', () => {
    expect(only("export const m = () => import('./m');").evaluation).toBe('dynamic');
    const withOptions = only("export const m = () => import('./m.json', { with: { type: 'json' } });");
    expect([withOptions.syntax, withOptions.evaluation, withOptions.specifiers.map((specifier) => specifier.getText())])
      .toEqual(['dynamic-import', 'dynamic', ["'./m.json'"]]);
    expect(only("const m = require('./m');").evaluation).toBe('dynamic');
    const lazy = only("export const all = import.meta.glob('./x/*.ts');");
    expect([lazy.syntax, lazy.evaluation, lazy.glob?.supported]).toEqual(['glob', 'dynamic', true]);
    const eager = only("export const all = import.meta.glob(['./x/*.ts', '!./x/y.ts'], { eager: true, query: '?raw', import: 'default' });");
    expect([eager.evaluation, eager.glob?.eager, eager.glob?.query, eager.specifiers.length]).toEqual(['static', true, 'raw', 2]);
    const computed = only("export const all = import.meta.glob('./x/*.ts', { ...options });");
    expect([computed.evaluation, computed.glob?.supported]).toEqual(['static', false]);
    // Vite expands only a direct call, so `import.meta.glob` passed as a value fails closed.
    const passed = only('register(import.meta.glob);');
    expect([passed.syntax, passed.evaluation, passed.glob?.supported, passed.specifiers.length])
      .toEqual(['glob', 'static', false, 0]);
    expect(only("export const url = new URL('./m.wasm', import.meta.url);").evaluation).toBe('asset');
  });

  it('ignores look-alikes that load nothing', () => {
    const source = parseModule('src/probe.ts', [
      'export const url = import.meta.url;',
      "export const other = helpers.glob('./x/*.ts');",
      "export const named = importMeta.glob('./x/*.ts');",
      "export const deeper = import.meta.env.glob('./x/*.ts');",
      "export const notMeta = new URL('./m', base);",
      'export { local };',
      'const local = 1;',
    ].join('\n'));
    expect(moduleReferences(source)).toEqual([]);
    expect(classifyModuleReference(source)).toBeUndefined();
  });
});

describe('specifier resolution and the graph', () => {
  const files: Readonly<Record<string, string>> = {
    'src/a.ts': [
      "import { b } from './b.js';",
      "import { type C } from './c';",
      "import type { D } from './d';",
      "import text from '../docs/x.txt?raw';",
      "import { index } from './dir';",
      "export const later = () => import('./lazy');",
      "export const handlers = import.meta.glob('./handlers/**/*.ts', { eager: true });",
    ].join('\n'),
    'src/b.ts': "import { a } from './a';\nexport const b = 1;\n",
    'src/c.ts': 'export type C = 1;\n',
    'src/d.ts': "import { a } from './a';\nexport type D = 1;\n",
    'src/dir/index.ts': 'export const index = 1;\n',
    'src/lazy.ts': 'export const lazy = 1;\n',
    'src/handlers/one.ts': 'export const one = 1;\n',
    'src/handlers/deep/two.ts': 'export const two = 1;\n',
    'src/handlers/readme.md': '# not code\n',
    'docs/x.txt': 'text',
    'node_modules/pkg/index.js': 'export const pkg = 1;\n',
  };
  const names = Object.keys(files);
  const host: GraphHost = {
    isFile: (path) => Object.hasOwn(files, path),
    readFile: (path) => files[path] ?? '',
    filesBelow: (directory) => names.filter((name) => name.startsWith(`${directory}/`)),
  };

  it('resolves specifiers as Vite does for this repository', () => {
    const isFile = host.isFile;
    expect(resolveModuleSpecifier('src/a.ts', './b', isFile)).toEqual({ kind: 'module', id: 'src/b.ts', file: 'src/b.ts' });
    expect(resolveModuleSpecifier('src/a.ts', './b.js', isFile)).toEqual({ kind: 'module', id: 'src/b.ts', file: 'src/b.ts' });
    expect(resolveModuleSpecifier('src/a.ts', './dir', isFile)).toEqual({ kind: 'module', id: 'src/dir/index.ts', file: 'src/dir/index.ts' });
    expect(resolveModuleSpecifier('src/a.ts', './dir/', isFile)).toEqual({ kind: 'module', id: 'src/dir/index.ts', file: 'src/dir/index.ts' });
    expect(resolveModuleSpecifier('src/a.ts', '../docs/x.txt?raw', isFile))
      .toEqual({ kind: 'resource', id: 'docs/x.txt?raw', file: 'docs/x.txt' });
    expect(resolveModuleSpecifier('src/a.ts', './missing', isFile)).toEqual({ kind: 'unresolved', id: './missing' });
    expect(resolveModuleSpecifier('src/a.ts', 'node:fs', isFile)).toEqual({ kind: 'external', id: 'node:fs' });
    expect(resolveModuleSpecifier('src/a.ts', 'zod', isFile)).toEqual({ kind: 'external', id: 'zod' });
    expect(resolveModuleSpecifier('src/a.ts', '../../outside', isFile)).toEqual({ kind: 'unresolved', id: '../../outside' });
    expect(resolveModuleSpecifier('src/a.ts', '../node_modules/pkg/index.js', isFile))
      .toEqual({ kind: 'external', id: 'node_modules/pkg/index.js' });
    expect(expandGlob('src/a.ts', ['./handlers/**/*.ts'], host.filesBelow))
      .toEqual(['src/handlers/deep/two.ts', 'src/handlers/one.ts']);
    expect(expandGlob('src/a.ts', ['./handlers/*.ts'], host.filesBelow)).toEqual(['src/handlers/one.ts']);
    expect(expandGlob('src/a.ts', ['./handlers/{one,two}.ts'], host.filesBelow)).toBeUndefined();
  });

  it('builds closures and cycles from runtime edges only', () => {
    const graph = buildModuleGraph(['src/a.ts'], host);
    const loaded = [...closure(graph, 'src/a.ts', ['static']).keys()].sort();
    expect(loaded).toEqual([
      'docs/x.txt?raw',
      'src/a.ts',
      'src/b.ts',
      'src/c.ts',
      'src/dir/index.ts',
      'src/handlers/deep/two.ts',
      'src/handlers/one.ts',
    ]);
    const runtime = closure(graph, 'src/a.ts', ['static', 'dynamic']);
    expect(runtime.has('src/lazy.ts')).toBe(true);
    expect(runtime.has('src/d.ts')).toBe(false);
    expect(pathTo(runtime, 'src/c.ts')).toEqual(['src/a.ts:2', 'src/c.ts']);
    expect(cycles(graph, ['static'])).toEqual([['src/a.ts', 'src/b.ts']]);
    expect(graph.inlineTypeOnly).toEqual([{ file: 'src/a.ts', line: 2, syntax: 'import', specifier: './c' }]);
    expect(graph.unresolved).toEqual([]);
    const passedGlob = buildModuleGraph(['src/g.ts'], {
      isFile: (path) => path === 'src/g.ts',
      readFile: () => "export const all = import.meta.glob('./x/*.ts');\nregister(import.meta.glob);\n",
      filesBelow: () => [],
    });
    expect(passedGlob.unresolved).toEqual([{ file: 'src/g.ts', line: 2, specifier: '<import.meta.glob>', evaluation: 'static' }]);
  });

  it('resolves a specifier held in a module-scope constant, unless the name is declared twice', () => {
    const constantFiles: Readonly<Record<string, string>> = {
      'tests/t.ts': [
        "const LAZY_PATH = './lazy';",
        "const SHADOWED = './lazy';",
        'export const load = () => import(LAZY_PATH);',
        'export const other = (SHADOWED: string) => import(SHADOWED);',
      ].join('\n'),
      'tests/lazy.ts': 'export const lazy = 1;\n',
    };
    const graph = buildModuleGraph(['tests/t.ts'], {
      isFile: (path) => Object.hasOwn(constantFiles, path),
      readFile: (path) => constantFiles[path] ?? '',
      filesBelow: () => [],
    });
    expect(graph.edges.get('tests/t.ts')).toEqual([
      { to: 'tests/lazy.ts', evaluation: 'dynamic', syntax: 'dynamic-import', line: 3, inlineTypeOnly: false },
    ]);
    expect(graph.unresolved).toEqual([{ file: 'tests/t.ts', line: 4, specifier: '<non-literal>', evaluation: 'dynamic' }]);
  });

  it('keeps a cycle apart from a module both cycles merely import', () => {
    const cyclic: Readonly<Record<string, string>> = {
      'src/leaf.ts': 'export const leaf = 1;\n',
      'src/p.ts': "import { q } from './q';\nexport const p = 1;\n",
      'src/q.ts': "import { p } from './p';\nimport { leaf } from './leaf';\nexport const q = 1;\n",
      'src/r.ts': "import { leaf } from './leaf';\nimport { s } from './s';\nexport const r = 1;\n",
      'src/s.ts': "import { r } from './r';\nexport const s = 1;\n",
    };
    const cyclicNames = Object.keys(cyclic);
    const graph = buildModuleGraph(cyclicNames, {
      isFile: (path) => Object.hasOwn(cyclic, path),
      readFile: (path) => cyclic[path] ?? '',
      filesBelow: (directory) => cyclicNames.filter((name) => name.startsWith(`${directory}/`)),
    });
    expect(cycles(graph, ['static'])).toEqual([['src/p.ts', 'src/q.ts'], ['src/r.ts', 'src/s.ts']]);
  });
});

describe('the import-boundary guard', () => {
  it('passes its self-test: every rule green on a clean fixture and red on each planted violation', () => {
    const result = spawnSync(process.execPath, ['scripts/check-import-boundaries.mjs', '--self-test'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    for (const rule of ['R0', 'R1', 'R2', 'R3', 'R4', 'R5']) {
      expect(result.stdout).toMatch(new RegExp(`^${rule} green 0 finding\\(s\\)`, 'mu'));
      expect(result.stdout).toMatch(new RegExp(`^${rule} red {3}[1-9]\\d* finding\\(s\\)`, 'mu'));
    }
    expect(result.stdout).toContain('fixtures and the --update ratchet passed');
  });
});
