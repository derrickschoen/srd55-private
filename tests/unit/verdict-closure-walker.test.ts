import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildClosure,
  cachedVerdict,
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
 * walker cannot follow fails the file closed (an unresolved reason).
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

const FIXTURES: Readonly<Record<string, readonly string[]>> = {
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
  'glob-computed.ts': [
    "const pattern = ['./targets/', '*.ts'].join('');",
    'export const modules = import.meta.glob(pattern);',
  ],
  'glob-alias.ts': [
    'const discover = import.meta.glob;',
    "export const modules = discover('./targets/*.ts');",
  ],
  'glob-outside.ts': ["export const modules = import.meta.glob('../../../*.json');"],
  // beforeAll adds linked-entry/alias.ts -> ../targets/one.ts and linked-base -> targets.
  'linked-entry/real.ts': ["export const real = 'real';"],
  'glob-linked-entry.ts': ["export const modules = import.meta.glob('./linked-entry/*.ts');"],
  'glob-linked-base.ts': ["export const modules = import.meta.glob('./linked-base/*.ts');"],
  // The digest witnesses change these bytes, so they share nothing with the forms above.
  'witness-glob/entry.ts': ["export const modules = import.meta.glob('./handlers/*.ts', { eager: true });"],
  'witness-glob/handlers/move.ts': ["export const move = 'move';"],
  'witness-inline/entry.ts': ["import { CLIENT } from './client';", 'export const client = CLIENT;'],
  'witness-inline/client.ts': ["import { type Contract } from './contracts';", "export const CLIENT: Contract['name'] = 'client';"],
  'witness-inline/contracts.ts': ["export type Contract = { readonly name: string };", 'export const CONTRACT_VERSION = 1;'],
  'witness-dynamic/entry.ts': ["export const load = () => import('./data.json', { with: { type: 'json' } });"],
  'witness-dynamic/data.json': ['{ "version": 1 }'],
};

let probeDirectory = '';
let cacheRoot = '';

const probePath = (name: string): string => join(probeDirectory, name);
const repositoryName = (name: string): string =>
  relative(repositoryRoot, probePath(name)).split('\\').join('/');
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
  for (const [name, lines] of Object.entries(FIXTURES)) {
    mkdirSync(join(probeDirectory, name, '..'), { recursive: true });
    writeFileSync(probePath(name), `${lines.join('\n')}\n`, 'utf8');
  }
  symlinkSync('../targets/one.ts', probePath('linked-entry/alias.ts'));
  symlinkSync('targets', probePath('linked-base'));
  cacheRoot = mkdtempSync(join(tmpdir(), 'dnd-verdict-closure-walker-'));
});

afterAll(() => {
  rmSync(probeDirectory, { recursive: true, force: true });
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
      unresolved: unresolvedAs('glob-outside.ts', '<unsupported import.meta.glob ../../../*.json>'),
    });
  });

  it('fails closed a glob over a directory holding a symbolic link, which the inventory does not list', () => {
    expect(closureOf('glob-linked-entry.ts')).toEqual({
      closure: [],
      unresolved: unresolvedAs('glob-linked-entry.ts', '<unsupported import.meta.glob ./linked-entry/*.ts>'),
    });
  });

  it('fails closed a glob whose base is a symbolic link', () => {
    expect(closureOf('glob-linked-base.ts')).toEqual({
      closure: [],
      unresolved: unresolvedAs('glob-linked-base.ts', '<unsupported import.meta.glob ./linked-base/*.ts>'),
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
});
