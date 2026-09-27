import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildClosure,
  cachedVerdict,
  globalSalt,
  moduleInventory,
  storeVerdict,
  type ObservationRecord,
} from '../../scripts/test-affected.mjs';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from '../helpers/test-filesystem';

/*
 * The verdict cache's closure walker (scripts/test-affected.mjs), one fixture
 * per import form (VERDICT-SOUND, D915). test:affected reuses a stored green
 * while the bytes of every module in the test's closure are unchanged, so a
 * module the test loads at runtime but the walker leaves out can change under
 * a reused green. Every form the transform loads is in the closure; a form the
 * walker cannot follow fails the file closed (an unresolved reason). A reused
 * green's closure is not rebuilt, so a path added later (a file or a symbolic
 * link) must change the module inventory, which keys every verdict. A Node
 * built-in is the same module bare or node:, and one that runs code where the
 * recorder records nothing (a child process, a worker thread) fails closed.
 *
 * Both tsconfigs set verbatimModuleSyntax, so only the type-marked forms are
 * erased: `import type`, `export type ... from`. `import { type A } from './a'`
 * is emitted as `import {} from './a'` and loads a. The runtime cross-check
 * below imports those fixtures through this Vitest's own transform and sees
 * which modules evaluate.
 */

const repositoryRoot = realpathSync(process.cwd());
const SALT = 'verdict-closure-walker';
const LOADS = 'dnd.verdict-closure-walker.loads';

/** A module that says when it is evaluated. */
const loaded = (name: string): string =>
  `(globalThis as unknown as Record<symbol, string[] | undefined>)[Symbol.for('${LOADS}')]?.push('${name}');`;
const shape = (name: string): string[] => [
  'export type Shape = { readonly size: number };',
  `export const ${name.replace('-', '_')} = '${name}';`,
  `export default '${name}';`,
  loaded(name),
];

/**
 * A module per way of loading a Node built-in whose effects the recorder cannot
 * see (a child process, a worker thread), and the node: name its reason carries.
 * A bare specifier loads the same module as its node: form.
 */
const EFFECT_BUILTINS: readonly (readonly [name: string, source: string, builtin: string])[] = [
  ['builtins/import-child_process.ts', "import { spawnSync } from 'child_process';", 'node:child_process'],
  ['builtins/import-node-child_process.ts', "import { spawnSync } from 'node:child_process';", 'node:child_process'],
  ['builtins/require-child_process.ts', "const { spawnSync } = require('child_process');", 'node:child_process'],
  ['builtins/dynamic-child_process.ts', "export const load = () => import('child_process');", 'node:child_process'],
  ['builtins/export-child_process.ts', "export { spawnSync } from 'child_process';", 'node:child_process'],
  ['builtins/import-equals-child_process.cts', "import childProcess = require('child_process');", 'node:child_process'],
  [
    'builtins/get-builtin-child_process.ts',
    "export const childProcess = process.getBuiltinModule('child_process');",
    'node:child_process',
  ],
  [
    'builtins/create-require-child_process.ts',
    [
      "import { createRequire } from 'node:module';",
      'const require = createRequire(import.meta.url);',
      "export const childProcess = require('child_process');",
    ].join('\n'),
    'node:child_process',
  ],
  ['builtins/import-worker_threads.ts', "import { Worker } from 'worker_threads';", 'node:worker_threads'],
  ['builtins/import-node-worker_threads.ts', "import { Worker } from 'node:worker_threads';", 'node:worker_threads'],
  ['builtins/import-cluster.ts', "import cluster from 'cluster';", 'node:cluster'],
  ['builtins/import-node-cluster.ts', "import cluster from 'node:cluster';", 'node:cluster'],
];

const FIXTURES: Readonly<Record<string, readonly string[]>> = {
  ...Object.fromEntries(EFFECT_BUILTINS.map(([name, source]) => [name, [source]])),
  'builtins/fs-outside.ts': [
    "import { readFileSync } from 'fs';",
    "export const hostname = () => readFileSync('/etc/hostname', 'utf8');",
  ],
  'builtins/node-fs-outside.ts': [
    "import { readFileSync } from 'node:fs';",
    "export const hostname = () => readFileSync('/etc/hostname', 'utf8');",
  ],
  'builtins/get-builtin-fs.ts': ["export const fs = process.getBuiltinModule('node:fs');"],
  'builtins/get-builtin-computed.ts': ['export const load = (name: string) => process.getBuiltinModule(name);'],
  'builtins/get-builtin-alias.ts': [
    'const { getBuiltinModule } = process;',
    "export const childProcess = getBuiltinModule('child_process');",
  ],
  'builtins/create-require-renamed.ts': [
    "import { createRequire } from 'node:module';",
    'const load = createRequire(import.meta.url);',
    "export const childProcess = load('child_process');",
  ],
  'builtins/create-require-elsewhere.ts': [
    "import { createRequire } from 'node:module';",
    "const require = createRequire('/elsewhere/package.json');",
    "export const typescript = require('typescript');",
  ],
  'builtins/create-require-aliased.ts': [
    "import { createRequire as make } from 'node:module';",
    'const load = make(import.meta.url);',
    "export const childProcess = load('child_process');",
  ],
  'shape-a.ts': shape('shape-a'),
  'shape-b.ts': shape('shape-b'),
  'shape-c.ts': shape('shape-c'),
  'shape-d.ts': shape('shape-d'),
  'shape-e.ts': shape('shape-e'),
  'data.json': ['{ "size": 1 }'],
  'targets/one.ts': [loaded('targets/one')],
  'targets/two.ts': [loaded('targets/two')],
  'targets/notes.txt': ['not a module'],
  'parent-targets/three.ts': [loaded('parent-targets/three')],
  'import-type.ts': [
    "import type { Shape } from './shape-a';",
    'export const size = (shape: Shape): number => shape.size;',
  ],
  'inline-type.ts': [
    "import { type Shape } from './shape-b';",
    'export const size = (shape: Shape): number => shape.size;',
  ],
  'default-and-inline-type.ts': [
    "import name, { type Shape } from './shape-c';",
    'export const size = (shape: Shape): number => shape.size;',
    'export const named = name;',
  ],
  'export-type.ts': ["export type { Shape } from './shape-d';"],
  'export-inline-type.ts': ["export { type Shape } from './shape-e';"],
  'import-equals.cts': ["import shape = require('./shape-a');", 'export = shape;'],
  'dynamic-options.ts': ["export const load = () => import('./data.json', { with: { type: 'json' } });"],
  'dynamic-computed.ts': ["export const load = (name: string) => import(name, { with: { type: 'json' } });"],
  'glob.ts': ["export const modules = import.meta.glob('./targets/*.ts', { eager: true });"],
  'nested/glob-parent.ts': ["export const modules = import.meta.glob('../parent-targets/*.ts', { eager: true });"],
  'glob-array.ts': [
    "export const modules = import.meta.glob(['./targets/one.ts', './targets/*.txt'], { query: '?raw' });",
  ],
  'glob-negated.ts': ["export const modules = import.meta.glob(['./targets/*.ts', '!./targets/two.ts']);"],
  'glob-braces.ts': ["export const modules = import.meta.glob('./targets/{one,two}.ts');"],
  'glob-base.ts': ["export const modules = import.meta.glob('./one.ts', { base: './targets' });"],
  'glob-spread-options.ts': ["export const modules = import.meta.glob('./one.ts', { ...{ base: './targets' } });"],
  'glob-computed.ts': [
    "const pattern = ['./targets/', '*.ts'].join('');",
    'export const modules = import.meta.glob(pattern);',
  ],
  'glob-alias.ts': [
    'const discover = import.meta.glob;',
    "export const modules = discover('./targets/*.ts');",
  ],
  // The digest witnesses change these bytes, so they share nothing with the forms above.
  'witness-glob/entry.ts': ["export const modules = import.meta.glob('./handlers/*.ts', { eager: true });"],
  'witness-glob/handlers/move.ts': ["import { TABLE } from '../table';", 'export const move = TABLE;'],
  'witness-glob/table.ts': ["export const TABLE = 'move';"],
  'witness-inline/entry.ts': ["import { CLIENT } from './client';", 'export const client = CLIENT;'],
  'witness-inline/client.ts': ["import { type Contract } from './contracts';", "export const CLIENT: Contract['name'] = 'client';"],
  'witness-inline/contracts.ts': ["export type Contract = { readonly name: string };", 'export const CONTRACT_VERSION = 1;'],
  'witness-dynamic/entry.ts': ["export const load = () => import('./data.json', { with: { type: 'json' } });"],
  'witness-dynamic/data.json': ['{ "version": 1 }'],
  // The link witness adds witness-link/handlers/extra.ts -> ../extra.ts once its green is stored.
  'witness-link/entry.ts': ["export const modules = import.meta.glob('./handlers/*.ts', { eager: true });"],
  'witness-link/handlers/move.ts': ["export const move = 'move';"],
  'witness-link/extra.ts': ["export const extra = 'extra';"],
  // The inventory tests add and retarget inventory/alias.ts.
  'inventory/one.ts': ["export const one = 'one';"],
  'inventory/two.ts': ["export const two = 'two';"],
};

/**
 * Symbolic links, in a directory of their own: a glob over the fixtures above
 * must never meet one, or it would fail closed for that reason instead.
 * beforeAll adds entry/alias.ts -> ../real-targets/one.ts, base -> real-targets
 * and link-lib/a.ts -> ../real-lib/a.ts.
 */
const LINK_FIXTURES: Readonly<Record<string, readonly string[]>> = {
  'real-targets/one.ts': ["export const one = 'one';", loaded('real-targets/one')],
  'entry/real.ts': ["export const real = 'real';", loaded('entry/real')],
  'glob-linked-entry.ts': ["export const modules = import.meta.glob('./entry/*.ts', { eager: true });"],
  'glob-linked-base.ts': ["export const modules = import.meta.glob('./base/*.ts');"],
  'real-lib/a.ts': ["import './b';", loaded('real-lib/a')],
  'real-lib/b.ts': [loaded('real-lib/b')],
  'link-lib/b.ts': [loaded('link-lib/b')],
  'through-link.ts': ["import './link-lib/a';"],
};

let probeDirectory = '';
let linkDirectory = '';
/** Inside the repository but outside every module inventory root (beforeAll writes glob-outside.ts). */
let outsideDirectory = '';
let outsidePattern = '';
let cacheRoot = '';

const probePath = (name: string): string => join(probeDirectory, name);
const linkPath = (name: string): string => join(linkDirectory, name);
const repositoryPath = (path: string): string => relative(repositoryRoot, path).split('\\').join('/');
const repositoryName = (name: string): string => repositoryPath(probePath(name));
const closureOf = (name: string): { closure: readonly string[]; unresolved: readonly string[] } =>
  buildClosure(probePath(name));
const names = (...files: string[]): string[] =>
  files.map(repositoryName).sort((left, right) => left.localeCompare(right));
const unresolvedAs = (name: string, reason: string): string[] => [`${repositoryName(name)} -> ${reason}`];

const NOTHING_OBSERVED: ObservationRecord = {
  version: 2,
  testFile: '',
  observedInputs: [],
  externalInputs: [],
  environmentInputs: [],
  environmentEnumerated: false,
};

beforeAll(() => {
  const parent = join(repositoryRoot, 'tests/test-input-boundary-probes');
  mkdirSync(parent, { recursive: true });
  probeDirectory = mkdtempSync(`${parent}/closure-walker-`);
  linkDirectory = mkdtempSync(`${parent}/closure-walker-links-`);
  for (const [directory, fixtures] of [[probeDirectory, FIXTURES], [linkDirectory, LINK_FIXTURES]] as const) {
    for (const [name, lines] of Object.entries(fixtures)) {
      mkdirSync(join(directory, name, '..'), { recursive: true });
      writeFileSync(join(directory, name), `${lines.join('\n')}\n`, 'utf8');
    }
  }
  symlinkSync('../real-targets/one.ts', linkPath('entry/alias.ts'));
  symlinkSync('real-targets', linkPath('base'));
  symlinkSync('../real-lib/a.ts', linkPath('link-lib/a.ts'));
  for (const module of ['fs/promises', 'node:fs/promises']) {
    writeFileSync(
      probePath(`builtins/${module.replace(/[:/]/gu, '-')}-data.ts`),
      `import { readFile } from '${module}';\nexport const data = () => readFile('${repositoryName('data.json')}', 'utf8');\n`,
      'utf8',
    );
  }
  mkdirSync(join(repositoryRoot, '.tmp'), { recursive: true });
  outsideDirectory = mkdtempSync(join(repositoryRoot, '.tmp/closure-walker-outside-'));
  writeFileSync(join(outsideDirectory, 'data.json'), '{}\n', 'utf8');
  outsidePattern = `../../../${repositoryPath(outsideDirectory)}/*.json`;
  writeFileSync(probePath('glob-outside.ts'), `export const modules = import.meta.glob('${outsidePattern}');\n`, 'utf8');
  cacheRoot = mkdtempSync(join(tmpdir(), 'dnd-verdict-closure-walker-'));
});

afterAll(() => {
  rmSync(probeDirectory, { recursive: true, force: true });
  rmSync(linkDirectory, { recursive: true, force: true });
  rmSync(outsideDirectory, { recursive: true, force: true });
  rmSync(cacheRoot, { recursive: true, force: true });
});

describe('the closure walker: import and export declarations', () => {
  it('leaves out a module reached only through import type, which is erased', () => {
    expect(closureOf('import-type.ts')).toEqual({ closure: [], unresolved: [] });
  });

  it('keeps a module whose bindings are all inline type, which verbatimModuleSyntax loads', () => {
    expect(closureOf('inline-type.ts')).toEqual({ closure: names('shape-b.ts'), unresolved: [] });
  });

  it('keeps a module imported for a default binding beside inline type bindings', () => {
    expect(closureOf('default-and-inline-type.ts')).toEqual({ closure: names('shape-c.ts'), unresolved: [] });
  });

  it('leaves out a module reached only through export type ... from, which is erased', () => {
    expect(closureOf('export-type.ts')).toEqual({ closure: [], unresolved: [] });
  });

  it('keeps a module re-exported through inline type bindings, which verbatimModuleSyntax loads', () => {
    expect(closureOf('export-inline-type.ts')).toEqual({ closure: names('shape-e.ts'), unresolved: [] });
  });

  it('keeps a module a CommonJS TypeScript module loads through import = require', () => {
    expect(closureOf('import-equals.cts')).toEqual({ closure: names('shape-a.ts'), unresolved: [] });
  });
});

describe('the closure walker: dynamic import()', () => {
  it('follows the first argument of an import() that has an options argument', () => {
    expect(closureOf('dynamic-options.ts')).toEqual({ closure: names('data.json'), unresolved: [] });
  });

  it('fails closed a computed import() that has an options argument', () => {
    expect(closureOf('dynamic-computed.ts'))
      .toEqual({ closure: [], unresolved: unresolvedAs('dynamic-computed.ts', '<computed dynamic import>') });
  });
});

describe('the closure walker: import.meta.glob', () => {
  it('keeps every file an eager glob matches, and only those', () => {
    expect(closureOf('glob.ts'))
      .toEqual({ closure: names('targets/one.ts', 'targets/two.ts'), unresolved: [] });
  });

  it('resolves a glob that climbs out of the importer directory', () => {
    expect(closureOf('nested/glob-parent.ts'))
      .toEqual({ closure: names('parent-targets/three.ts'), unresolved: [] });
  });

  it('keeps the matches of every pattern in an array, modules and text alike', () => {
    expect(closureOf('glob-array.ts'))
      .toEqual({ closure: names('targets/notes.txt', 'targets/one.ts'), unresolved: [] });
  });

  it('never lets a negative pattern remove a file, which could only lose an input', () => {
    expect(closureOf('glob-negated.ts'))
      .toEqual({ closure: names('targets/one.ts', 'targets/two.ts'), unresolved: [] });
  });

  it('fails closed a pattern with brace syntax the walker does not match', () => {
    expect(closureOf('glob-braces.ts')).toEqual({
      closure: [],
      unresolved: unresolvedAs('glob-braces.ts', '<unsupported import.meta.glob ./targets/{one,two}.ts>'),
    });
  });

  it('fails closed a glob whose base option moves the patterns', () => {
    expect(closureOf('glob-base.ts')).toEqual({
      closure: [],
      unresolved: unresolvedAs('glob-base.ts', '<unsupported import.meta.glob option base>'),
    });
  });

  it('fails closed options it cannot read, which could hide a base', () => {
    expect(closureOf('glob-spread-options.ts')).toEqual({
      closure: [],
      unresolved: unresolvedAs('glob-spread-options.ts', '<computed import.meta.glob options>'),
    });
  });

  it('fails closed a computed pattern', () => {
    expect(closureOf('glob-computed.ts'))
      .toEqual({ closure: [], unresolved: unresolvedAs('glob-computed.ts', '<computed import.meta.glob>') });
  });

  it('fails closed an import.meta.glob that is referenced but not called', () => {
    expect(closureOf('glob-alias.ts'))
      .toEqual({ closure: [], unresolved: unresolvedAs('glob-alias.ts', '<import.meta.glob not called directly>') });
  });

  it('fails closed a glob outside the module inventory, where a new match would change no salt', () => {
    expect(closureOf('glob-outside.ts')).toEqual({
      closure: [],
      unresolved: unresolvedAs('glob-outside.ts', `<unsupported import.meta.glob ${outsidePattern}>`),
    });
  });

  it('fails closed a glob over a directory holding a symbolic link, which the inventory does not list', () => {
    const entry = linkPath('glob-linked-entry.ts');
    expect(buildClosure(entry)).toEqual({
      closure: [],
      unresolved: [`${repositoryPath(entry)} -> <unsupported import.meta.glob ./entry/*.ts>`],
    });
  });

  it('fails closed a glob whose base is a symbolic link', () => {
    const entry = linkPath('glob-linked-base.ts');
    expect(buildClosure(entry)).toEqual({
      closure: [],
      unresolved: [`${repositoryPath(entry)} -> <unsupported import.meta.glob ./base/*.ts>`],
    });
  });
});

describe('the closure walker: symbolic links', () => {
  it('fails closed a module reached through a symbolic link, whose imports resolve from its real directory', () => {
    expect(buildClosure(linkPath('through-link.ts')).unresolved)
      .toEqual([`${repositoryPath(linkPath('link-lib/a.ts'))} -> <module reached through a symbolic link>`]);
  });
});

describe('the closure walker: Node built-ins', () => {
  it.each(EFFECT_BUILTINS)('%s fails closed as an effect the recorder cannot see', (name, _source, builtin) => {
    expect(closureOf(name)).toEqual({ closure: [], unresolved: unresolvedAs(name, `<external behavior via ${builtin}>`) });
  });

  it.each([['builtins/fs-outside.ts'], ['builtins/node-fs-outside.ts']])(
    '%s fails closed a read outside the repository convention',
    (name) => {
      expect(closureOf(name)).toEqual({
        closure: [],
        unresolved: unresolvedAs(name, '<filesystem input outside repository convention: /etc/hostname>'),
      });
    },
  );

  it.each([['builtins/fs-promises-data.ts'], ['builtins/node-fs-promises-data.ts']])(
    '%s keeps the repository file it reads',
    (name) => {
      expect(closureOf(name)).toEqual({ closure: names('data.json'), unresolved: [] });
    },
  );

  it('follows process.getBuiltinModule of a built-in the recorder sees', () => {
    expect(closureOf('builtins/get-builtin-fs.ts')).toEqual({ closure: [], unresolved: [] });
  });

  it('fails closed a computed process.getBuiltinModule', () => {
    expect(closureOf('builtins/get-builtin-computed.ts')).toEqual({
      closure: [],
      unresolved: unresolvedAs('builtins/get-builtin-computed.ts', '<computed process.getBuiltinModule>'),
    });
  });

  it('fails closed a getBuiltinModule that is not called as process.getBuiltinModule', () => {
    expect(closureOf('builtins/get-builtin-alias.ts')).toEqual({
      closure: [],
      unresolved: unresolvedAs('builtins/get-builtin-alias.ts', '<process.getBuiltinModule not called directly>'),
    });
  });

  it.each([
    ['builtins/create-require-renamed.ts'],
    ['builtins/create-require-elsewhere.ts'],
    ['builtins/create-require-aliased.ts'],
  ])('%s fails closed a loader that is not require from the importer', (name) => {
    expect(closureOf(name)).toEqual({
      closure: [],
      unresolved: unresolvedAs(name, '<createRequire not bound to require>'),
    });
  });
});

describe('the closure walker agrees with the transform Vitest runs', () => {
  it.each([
    ['import-type.ts', []],
    ['inline-type.ts', ['shape-b']],
    ['default-and-inline-type.ts', ['shape-c']],
    ['export-type.ts', []],
    ['export-inline-type.ts', ['shape-e']],
    ['glob.ts', ['targets/one', 'targets/two']],
    ['nested/glob-parent.ts', ['parent-targets/three']],
  ])('%s evaluates exactly the modules in its closure', async (entry, expected) => {
    const loads: string[] = [];
    (globalThis as unknown as Record<symbol, string[] | undefined>)[Symbol.for(LOADS)] = loads;
    try {
      await import(/* @vite-ignore */ probePath(entry));
    } finally {
      delete (globalThis as unknown as Record<symbol, string[] | undefined>)[Symbol.for(LOADS)];
    }

    expect(loads.sort()).toEqual(expected);
    expect(closureOf(entry).closure).toEqual(names(...expected.map((name) => `${name}.ts`)));
  });

  // Why the walker fails closed on links: what Vitest loads through one.
  it.each([
    ['glob-linked-entry.ts', ['entry/real', 'real-targets/one']],
    ['through-link.ts', ['real-lib/a', 'real-lib/b']],
  ])('%s loads through its symbolic link: a glob follows it, imports resolve from the real directory', async (entry, expected) => {
    const loads: string[] = [];
    (globalThis as unknown as Record<symbol, string[] | undefined>)[Symbol.for(LOADS)] = loads;
    try {
      await import(/* @vite-ignore */ linkPath(entry));
    } finally {
      delete (globalThis as unknown as Record<symbol, string[] | undefined>)[Symbol.for(LOADS)];
    }

    expect(loads.sort()).toEqual(expected);
  });
});

describe('a stored green is not reused once a module the test loads changes', () => {
  function storeGreen(entry: string): void {
    const graph = closureOf(entry);
    expect(graph.unresolved).toEqual([]);
    expect(storeVerdict({ testFile: probePath(entry), graph, record: NOTHING_OBSERVED, testCount: 1, salt: SALT, cacheRoot }))
      .toBeTypeOf('string');
    expect(cachedVerdict(probePath(entry), SALT, cacheRoot)?.testCount).toBe(1);
  }

  function changeBytes(name: string, change: () => void): void {
    const original = readFileSync(probePath(name), 'utf8');
    writeFileSync(probePath(name), `${original}// changed\n`, 'utf8');
    try {
      change();
    } finally {
      writeFileSync(probePath(name), original, 'utf8');
    }
  }

  it('glob: a file an eager import.meta.glob loads', () => {
    storeGreen('witness-glob/entry.ts');
    changeBytes('witness-glob/handlers/move.ts', () => {
      expect(cachedVerdict(probePath('witness-glob/entry.ts'), SALT, cacheRoot)).toBeUndefined();
    });
    expect(cachedVerdict(probePath('witness-glob/entry.ts'), SALT, cacheRoot)?.testCount).toBe(1);
  });

  it('glob: a module that a file an eager import.meta.glob loads imports', () => {
    storeGreen('witness-glob/entry.ts');
    changeBytes('witness-glob/table.ts', () => {
      expect(cachedVerdict(probePath('witness-glob/entry.ts'), SALT, cacheRoot)).toBeUndefined();
    });
    expect(cachedVerdict(probePath('witness-glob/entry.ts'), SALT, cacheRoot)?.testCount).toBe(1);
  });

  it('inline type: a module another module imports only through inline type bindings', () => {
    storeGreen('witness-inline/entry.ts');
    changeBytes('witness-inline/contracts.ts', () => {
      expect(cachedVerdict(probePath('witness-inline/entry.ts'), SALT, cacheRoot)).toBeUndefined();
    });
    expect(cachedVerdict(probePath('witness-inline/entry.ts'), SALT, cacheRoot)?.testCount).toBe(1);
  });

  it('dynamic import with options: the file it imports', () => {
    storeGreen('witness-dynamic/entry.ts');
    changeBytes('witness-dynamic/data.json', () => {
      expect(cachedVerdict(probePath('witness-dynamic/entry.ts'), SALT, cacheRoot)).toBeUndefined();
    });
    expect(cachedVerdict(probePath('witness-dynamic/entry.ts'), SALT, cacheRoot)?.testCount).toBe(1);
  });

  // Keyed on the real global salt: the stored closure is not rebuilt, so only
  // the module inventory can see a path added after the green was stored.
  // Paths other test files add or remove meanwhile can only make the two salts
  // differ more; they cannot fail this test.
  it('link: a symbolic link added under a glob base after the green was stored', () => {
    const entry = probePath('witness-link/entry.ts');
    const graph = buildClosure(entry);
    expect(graph).toEqual({ closure: names('witness-link/handlers/move.ts'), unresolved: [] });
    const salt = globalSalt();
    expect(storeVerdict({ testFile: entry, graph, record: NOTHING_OBSERVED, testCount: 1, salt, cacheRoot }))
      .toBeTypeOf('string');
    expect(cachedVerdict(entry, salt, cacheRoot)?.testCount).toBe(1);

    const link = probePath('witness-link/handlers/extra.ts');
    symlinkSync('../extra.ts', link);
    try {
      expect(cachedVerdict(entry, globalSalt(), cacheRoot)).toBeUndefined();
    } finally {
      rmSync(link);
    }
  });
});

describe('the module inventory that keys the global salt', () => {
  const inventory = (): string => moduleInventory([probePath('inventory')]);
  const alias = (): string => probePath('inventory/alias.ts');

  it('changes when a file is added', () => {
    const before = inventory();
    writeFileSync(probePath('inventory/three.ts'), "export const three = 'three';\n", 'utf8');
    try {
      expect(inventory()).not.toBe(before);
    } finally {
      rmSync(probePath('inventory/three.ts'));
    }
    expect(inventory()).toBe(before);
  });

  it('changes when a symbolic link is added', () => {
    const before = inventory();
    symlinkSync('one.ts', alias());
    try {
      expect(inventory()).not.toBe(before);
    } finally {
      rmSync(alias());
    }
    expect(inventory()).toBe(before);
  });

  it('changes when a symbolic link is given a new target', () => {
    symlinkSync('one.ts', alias());
    try {
      const toOne = inventory();
      rmSync(alias());
      symlinkSync('two.ts', alias());
      expect(inventory()).not.toBe(toOne);
    } finally {
      rmSync(alias(), { force: true });
    }
  });
});
