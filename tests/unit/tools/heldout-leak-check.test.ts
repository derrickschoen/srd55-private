import { posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from '../../helpers/test-filesystem';
import {
  HELDOUT_LEAK_AST_OUT_OF_SCOPE,
  HELDOUT_MODULE_SPECIFIER_POLICY,
  changesFromGitNameStatus,
  inspectHeldoutLeakChanges,
  moduleSpecifiers,
  parseGitNameStatusZ,
} from '../../../tools/heldout-leak-check';

const PLAIN_IMPORT_FACTORIES = [
  (suffix: string) => `import { heldoutSideHp } from '../vtt/heldout-evaluation${suffix}';`,
  (suffix: string) => `import { heldoutSideHp as sideHp } from "../vtt/heldout-evaluation${suffix}";`,
  (suffix: string) => `import type { HeldoutSlice } from '../vtt/heldout-evaluation${suffix}';`,
  (suffix: string) => `import heldout from '../vtt/heldout-evaluation${suffix}';`,
  (suffix: string) => `import * as heldout from '../vtt/heldout-evaluation${suffix}';`,
  (suffix: string) => `import '../vtt/heldout-evaluation${suffix}';`,
  (suffix: string) => `import "../vtt/heldout-evaluation${suffix}";`,
  (suffix: string) => `export { heldoutSideHp } from '../vtt/heldout-evaluation${suffix}';`,
  (suffix: string) => `export type { HeldoutSlice } from '../vtt/heldout-evaluation${suffix}';`,
  (suffix: string) => `export * from '../vtt/heldout-evaluation${suffix}';`,
  (suffix: string) => `const protocol = import('../vtt/heldout-evaluation${suffix}');`,
  (suffix: string) => `const protocol = import("../vtt/heldout-evaluation${suffix}");`,
  (suffix: string) => `const protocol = import(\`../vtt/heldout-evaluation${suffix}\`);`,
  (suffix: string) => `const protocol = require('../vtt/heldout-evaluation${suffix}');`,
] as const;

const PLAIN_IMPORT_VARIANTS = PLAIN_IMPORT_FACTORIES.flatMap((factory, factoryIndex) =>
  ['', '.js', '.ts'].map((suffix) => [
    `plain import variant ${String(factoryIndex + 1)}${suffix || '-extensionless'}`,
    factory(suffix),
  ] as const));

function repositorySourcesUnder(directory: string): Readonly<Record<string, string>> {
  const sources: Record<string, string> = {};
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = posix.join(current, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u.test(path) &&
        !/\.d\.(?:ts|mts|cts)$/u.test(path)) sources[path] = readFileSync(path, 'utf8');
    }
  };
  visit(directory);
  return sources;
}

describe('held-out reserve leak wall', () => {
  const reserveDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const bindings = {
    reserveDigests: [reserveDigest],
    resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
  } as const;

  it.each([
    ['src/vtt/intel/opportunity-cost.ts', 'const roomSeed = 7_860_001;', 'ranking'],
    ['tools/ai-dm-system-prompt.ts', "const prompt = 'Use heldout-ordinary-v1 outcomes.';", 'prompt'],
    ['tools/tuning/repair-a.ts', 'const combatSeed = 8_860_001;', 'tuning'],
    ['tools/tuning/repair-a.ts',
      "const rows = '/home/vagrant/dnd-slim-runs/heldout-a-encounters.jsonl';", 'result path'],
    ['tools/tuning/repair-a.ts', `const reserveDigest = '${reserveDigest}';`, 'digest'],
  ])('rejects a reserve reference in %s', (path, addedText) => {
    const report = inspectHeldoutLeakChanges([{ path, addedText }], 'A', bindings);

    expect(report.findings).toEqual([expect.objectContaining({
      path,
      kind: 'reserve_reference',
    })]);
  });

  it('retains the 42 plain import variants', () => {
    expect(PLAIN_IMPORT_VARIANTS).toHaveLength(42);
  });

  it.each(PLAIN_IMPORT_VARIANTS)('rejects %s outside evaluation tooling and tests', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText,
    }], 'B', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['round-2 template-literal dynamic import',
      'const protocol = import(`../vtt/heldout-evaluation`);'],
    ['round-2 .js-suffixed import',
      "import { heldoutSideHp } from '../vtt/heldout-evaluation.js';"],
    ['round-2 side-effect import',
      "import '../vtt/heldout-evaluation';"],
  ] as const)('rejects %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'B', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['dynamic import comment bypass',
      'const protocol = await import /* x */ (`../vtt/heldout-evaluation`);'],
    ['side-effect import comment bypass', "import /* x */ '../vtt/heldout-evaluation';"],
    ['from comment bypass',
      "import { heldoutSideHp } from /* x */ '../vtt/heldout-evaluation';"],
    ['require comment bypass',
      'const protocol = require /* x */ ("../vtt/heldout-evaluation");'],
  ] as const)('rejects %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'C', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('rejects a dynamic import with an attributes/options argument', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: [
        "const protocol = import('../vtt/heldout-evaluation', {",
        "  with: { type: 'json' },",
        '});',
      ].join('\n'),
    }], 'B', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['parenthesized dynamic-import argument',
      "const protocol = import(('../vtt/heldout-evaluation'));"],
    ['parenthesized require argument',
      "const protocol = require(('../vtt/heldout-evaluation'));"],
    ['parenthesized require callee',
      "const protocol = (require)('../vtt/heldout-evaluation');"],
    ['as-wrapped argument',
      "const protocol = import(('../vtt/heldout-evaluation' as string));"],
    ['satisfies-wrapped argument',
      "const protocol = require(('../vtt/heldout-evaluation' satisfies string));"],
    ['non-null-wrapped require callee',
      "const protocol = (require!)('../vtt/heldout-evaluation');"],
  ] as const)('rejects %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'B', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['string-literal substitution',
      "const protocol = import(`../vtt/${'heldout-evaluation'}`);"],
    ['no-substitution-template substitution',
      'const protocol = require(`../vtt/${`heldout-evaluation`}`);'],
    ['constant concatenation substitution',
      "const protocol = import(`../vtt/${'heldout-' + 'evaluation'}`);"],
    ['multiple constant substitutions',
      "const protocol = import(`../${'vtt'}/${'heldout-' + `evaluation`}`);"],
  ] as const)('resolves and rejects a substitution template with %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'C', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
    expect(report.findings).not.toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
  });

  it.each([
    ['dynamic-import template substitution',
      "const target = 'heldout-evaluation'; void import(`../vtt/${target}`);"],
    ['dynamic-import expression',
      "const target = '../vtt/heldout-evaluation'; void import(target);"],
    ['require expression',
      "const target = '../vtt/heldout-evaluation'; void require(target);"],
  ] as const)('fails closed on unresolved %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'D', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['require.resolve', "const path = require.resolve('../vtt/heldout-evaluation');"],
    ['import.meta.resolve',
      "const path = import.meta.resolve('../vtt/heldout-evaluation');"],
  ] as const)('rejects a held-out %s resolution edge', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'E', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_resolution',
    }));
  });

  it.each([
    ['require bracket resolver',
      "const path = require['resolve']('../vtt/heldout-evaluation');"],
    ['import.meta bracket resolver',
      "const path = import.meta['resolve']('../vtt/heldout-evaluation');"],
    ['require constant-concatenation key',
      "const path = require['re' + 'solve']('../vtt/heldout-evaluation');"],
    ['import.meta constant-template key',
      "const path = import.meta[`${'re'}solve`]('../vtt/heldout-evaluation');"],
  ] as const)('rejects a held-out %s resolution edge', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_resolution',
    }));
    expect(report.findings).not.toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['require bracket resolver target', [
      "const target = '../vtt/heldout-evaluation';",
      "const path = require['resolve'](target);",
    ].join('\n')],
    ['import.meta bracket resolver target', [
      "const target = '../vtt/heldout-evaluation';",
      "const path = import.meta['resolve'](target);",
    ].join('\n')],
    ['require bracket key', [
      "const key = 'resolve';",
      "const path = require[key]('../vtt/heldout-evaluation');",
    ].join('\n')],
    ['import.meta bracket key', [
      "const key = 'resolve';",
      "const path = import.meta[key]('../vtt/heldout-evaluation');",
    ].join('\n')],
  ] as const)('fails closed on an unresolved %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it('enumerates module-specifier normalization and finding policy', () => {
    expect(HELDOUT_MODULE_SPECIFIER_POLICY).toEqual({
      normalized: [
        'query and fragment suffixes are removed for module identity and retained for finding detail',
        'repeated and trailing slashes are collapsed',
        'dot and parent path segments are resolved lexically',
        'a trailing index, index.js, or index.ts resolves to its containing module path',
        'a trailing .js or .ts extension resolves to the extensionless module identity',
        'file URLs use fileURLToPath semantics, including percent-decoding, before identity comparison',
        'package #imports use exact-first Node pattern ordering in the nearest candidate package.json',
        'literal filesystem Vite globs support base, leading **, *, **, ?, arrays, exclusions, and query options',
      ],
      meaningChangingQueries: [
        'raw', 'url', 'inline', 'worker', 'sharedworker', 'init', 'import', 'no-inline',
      ],
      findings: [
        'a normalized held-out import is a protocol_import',
        'a normalized held-out resolver call is a protocol_resolution',
        'a recognized non-constant module edge is an unresolved_module_edge',
        'an undecodable or unknown-scheme edge and an unresolved package #import fail closed',
        'a known loader reference escaping recognized call syntax is loader_reference_escaped',
      ],
      interpreted: [
        'loader-valued expressions are built-in loaders, their load/resolve/glob members, createRequire factories and results, workers, script loaders, and exact plain const aliases',
        'namespace roots such as window, self, globalThis, import.meta, and module namespaces are inspected only to derive loader-valued members and are never findings themselves',
        'a loader-valued expression is allowed only as a recognized direct callee/receiver with a statically resolved target or the whole initializer of a non-exported plain const alias',
        'resolution configuration changes invalidate candidate consumers for reinspection',
      ],
      failsClosed: [
        'every other position of a loader-valued expression is loader_reference_escaped from one generic check',
        'unresolved targets, options, package conditions, globs, aliases, URL schemes, and data modules are findings',
      ],
      outOfScope: [
        'eval executable strings',
        'new Function executable strings',
        'custom loader implementations',
        'runtime-generated code',
      ],
    });
  });

  it.each([
    ['trailing slash', "import '../vtt/heldout-evaluation/';"],
    ['dot segment', "import '../vtt/./heldout-evaluation';"],
    ['index resolution', "import '../vtt/heldout-evaluation/index.ts';"],
  ] as const)('rejects a held-out import after %s normalization', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['?raw', "import source from '../vtt/heldout-evaluation.ts?raw';"],
    ['?url', "const url = import('../vtt/heldout-evaluation?url');"],
    ['?worker', "const Worker = require('../vtt/heldout-evaluation.js?worker');"],
    ['#frag', "export * from '../vtt/heldout-evaluation#frag';"],
    ['?raw#x', "import type Source from '../vtt/heldout-evaluation.ts?raw#x';"],
  ] as const)('rejects and records a held-out import with %s', (suffix, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_import',
      detail: expect.stringContaining(suffix),
    }));
  });

  it('does not report a non-held-out module with a meaning-changing query', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: "import source from '../vtt/public-evaluation.ts?raw';",
    }], 'F', bindings);

    expect(report.findings).toEqual([]);
  });

  it('decodes a percent-encoded file URL before comparing module identity', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "void import('file:///repo/src/vtt/%68eldout-evaluation.ts');",
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['exact lazy glob', "const modules = import.meta.glob('../vtt/heldout-evaluation.ts');"],
    ['wildcard eager glob',
      "const modules = import.meta.glob('../vtt/heldout-*.ts', { eager: true });"],
    ['array glob with query', [
      "const modules = import.meta.glob(['../vtt/public.ts', '../vtt/heldout-*.ts'], {",
      "  query: '?raw',",
      '});',
    ].join('\n')],
    ['glob with object query options', [
      "const modules = import.meta.glob('../vtt/heldout-*.ts', {",
      "  query: { raw: 'true', worker: false },",
      '  eager: false,',
      '});',
    ].join('\n')],
  ] as const)('rejects a held-out module matched by %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText,
    }], 'F', bindings, {
      candidateFiles: ['src/vtt/public.ts', 'src/vtt/heldout-evaluation.ts'],
    });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('applies negative Vite glob patterns before recording edges', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: [
        "const modules = import.meta.glob(['../vtt/*.ts', '!../vtt/heldout-*.ts']);",
      ].join('\n'),
    }], 'F', bindings, {
      candidateFiles: ['src/vtt/public.ts', 'src/vtt/heldout-evaluation.ts'],
    });

    expect(report.findings).toEqual([]);
  });

  it('records a Vite glob query option on the matched held-out edge', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: [
        "const modules = import.meta.glob('../vtt/heldout-*.ts', { query: '?raw' });",
      ].join('\n'),
    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_import',
      detail: expect.stringContaining('?raw'),
    }));
  });

  it('fails closed on a non-constant Vite glob pattern', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "const modules = import.meta.glob(patterns, { eager: false });",
    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it('honours a literal Vite glob base relative to the importer', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: [
        "import.meta.glob('./heldout-evaluation.ts', { base: '../vtt', eager: true });",
      ].join('\n'),
    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('keeps a leading ** Vite glob candidate-rooted even when base is present', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "import.meta.glob('**/heldout-evaluation.ts', { base: './', eager: true });",
    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('evaluates literal object spreads in Vite glob options', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: [
        "import.meta.glob('./heldout-evaluation.ts', {",
        "  ...{ base: '../vtt' }, eager: true,",
        '});',
      ].join('\n'),
    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('tracks an exact import.meta.glob alias into a recognized glob call', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: [
        'const discover = import.meta.glob;',
        "discover('../vtt/heldout-*.ts', { eager: true });",
      ].join('\n'),
    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['identifier spread', "const options = { base: '../vtt' }; import.meta.glob('./x.ts', { ...options });"],
    ['computed option key', "import.meta.glob('./x.ts', { ['base']: '../vtt' });"],
    ['non-constant base', "import.meta.glob('./x.ts', { base: globBase });"],
  ] as const)('fails closed on Vite glob options with a non-literal %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText,
    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it('treats a leading ** Vite glob as candidate-rooted', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "import.meta.glob('**/heldout-evaluation.ts');",
    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['extglob', "import.meta.glob('../vtt/@(heldout-evaluation).ts');"],
    ['package-import glob', "import.meta.glob('#policy/*.ts');"],
    ['alias glob', "import.meta.glob('@policy/*.ts');"],
  ] as const)('fails closed instead of silently missing an unsupported %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText,
    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['Worker', [
      "new Worker(new URL('../vtt/heldout-evaluation.ts', import.meta.url), { type: 'module' });",
    ].join('\n')],
    ['SharedWorker', [
      "new SharedWorker(new URL('../vtt/heldout-evaluation.ts', import.meta.url), { type: 'module' });",
    ].join('\n')],
    ['importScripts', "importScripts('../vtt/heldout-evaluation.ts');"],
  ] as const)('rejects a literal %s loading edge', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['Worker', "new Worker(new URL(workerPath, import.meta.url), { type: 'module' });"],
    ['SharedWorker', "new SharedWorker(workerUrl);"],
    ['importScripts', 'importScripts(scriptUrl);'],
  ] as const)('fails closed on a non-literal %s loading edge', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['createRequire receiver', [
      "import { createRequire } from 'node:module';",
      "createRequire(import.meta.url).resolve('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_resolution'],
    ['destructured createRequire receiver', [
      "const { createRequire: makeRequire } = require('node:module');",
      "makeRequire(import.meta.url)('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_import'],
    ['renamed loader alias', [
      'const load = require;',
      "load('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_import'],
    ['destructured resolver alias', [
      'const { resolve: locate } = require;',
      "locate('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_resolution'],
    ['comma resolver', "(0, require.resolve)('../vtt/heldout-evaluation.ts');", 'loader_reference_escaped'],
    ['resolver call',
      "require.resolve.call(require, '../vtt/heldout-evaluation.ts');", 'protocol_resolution'],
    ['resolver apply',
      "require.resolve.apply(require, ['../vtt/heldout-evaluation.ts']);", 'protocol_resolution'],
    ['Reflect.apply',
      "Reflect.apply(require.resolve, require, ['../vtt/heldout-evaluation.ts']);", 'protocol_resolution'],
    ['module.require', "module.require('../vtt/heldout-evaluation.ts');", 'protocol_import'],
  ] as const)('rejects held-out access through %s', (_label, addedText, expectedKind) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: expectedKind }));
  });

  it('fails closed when bind lets a known resolver reference escape', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: 'const lateResolve = require.resolve.bind(require);',
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it('fails closed when a tracked loader alias receives a non-constant target', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: 'const load = require; load(target);',
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['node:module namespace import', [
      "import * as M from 'node:module';",
      "M.createRequire(import.meta.url).resolve('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_resolution'],
    ['prefixless module default import', [
      "import M from 'module';",
      "M.createRequire(import.meta.url)('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_import'],
    ['prefixless CommonJS module namespace', [
      "const M = require('module');",
      "M.createRequire(import.meta.url)('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_import'],
    ['destructured import.meta resolver', [
      'const { resolve: locate } = import.meta;',
      "locate('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_resolution'],
    ['computed destructured resolver', [
      "const { ['resolve']: locate } = import.meta;",
      "locate('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_resolution'],
    ['element-access Reflect.apply', [
      "Reflect['apply'](require.resolve, undefined, ['../vtt/heldout-evaluation.ts']);",
    ].join('\n'), 'protocol_resolution'],
    ['conditional loader alias', [
      'const load = true ? require : require;',
      "load('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'loader_reference_escaped'],
  ] as const)('rejects held-out access through %s', (_label, addedText, expectedKind) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: expectedKind }));
  });

  it('tracks loader bindings by symbol rather than identifier spelling', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: [
        'function useOrdinaryLoader(require: (path: string) => unknown) {',
        "  return require('./ordinary-module');",
        '}',
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toEqual([]);
  });

  it('fails closed when a createRequire factory reference escapes through an object', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: [
        "import { createRequire } from 'node:module';",
        'const escaped = { createRequire };',
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it('fails closed when a loader enters an uninterpreted conditional alias', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: 'const escaped = condition ? require : ordinaryFunction;',
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it('fails closed when tracked resolvers enter a nullish expression', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.cjs',
      addedText: [
        'const locate = require.resolve ?? require.resolve;',
        "locate('../src/vtt/heldout-evaluation.ts');",
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['module namespace alias', [
      "import * as M from 'node:module';",
      'const N = M;',
      "N.createRequire(import.meta.url).resolve('../vtt/heldout-evaluation.ts');",
    ].join('\n')],
    ['inline CommonJS module factory', [
      "require('node:module').createRequire(__filename).resolve('../vtt/heldout-evaluation.ts');",
    ].join('\n')],
    ['await-import destructured factory', [
      "const { createRequire } = await import('node:module');",
      "createRequire(import.meta.url).resolve('../vtt/heldout-evaluation.ts');",
    ].join('\n')],
    ['await-import destructured default module', [
      "const { default: M } = await import('node:module');",
      "M.createRequire(import.meta.url).resolve('../vtt/heldout-evaluation.ts');",
    ].join('\n')],
  ] as const)('tracks %s through to the held-out edge', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_resolution',
    }));
  });

  it.each([
    ['named export', 'const load = require; export { load };'],
    ['default export', 'const load = require; export default load;'],
    ['exported alias declaration', 'export const load = require;'],
    ['bound script loader', 'const loadScripts = self.importScripts.bind(self);'],
    ['builtin re-export', "export { createRequire } from 'node:module';"],
  ] as const)('fails closed when a tracked loader escapes through %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['a nested object-array value', 'const escaped = { nested: [require] };'],
    ['a spread argument payload', 'ordinaryFunction(...[require.resolve]);'],
    ['tagged-template invocation', 'const escaped = require.resolve`policy`;'],
  ] as const)('default-denies the unenumerated loader use in %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['call', "require.resolve.call(require, '../vtt/heldout-evaluation.ts');"],
    ['apply', "require.resolve.apply(require, ['../vtt/heldout-evaluation.ts']);"],
    ['bind', 'const locate = require.resolve.bind(require);'],
    ['computed member access', "require['resolve']('../vtt/heldout-evaluation.ts');"],
  ] as const)('default-denies tracked loader .%s-style indirection', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['plain object binding pattern', 'const { resolve: locate } = require;'],
    ['computed binding key', "const key = 'resolve'; const { [key]: locate } = require;"],
    ['object-rest binding', 'const { ...escaped } = require;'],
    ['exported plain alias', 'export const load = require;'],
    ['exported destructuring', 'export const { resolve: locate } = import.meta;'],
  ] as const)('rejects loader-valued alias initialization through %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['an object property', 'const box = { load: createRequire(import.meta.url) };'],
    ['a return value', 'function build() { return createRequire(import.meta.url); }'],
    ['a default export', 'export default createRequire(import.meta.url);'],
    ['another call argument', 'consume(createRequire(import.meta.url));'],
  ] as const)('rejects a createRequire result escaping through %s', (_label, use) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: ["import { createRequire } from 'node:module';", use].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it('seeds a module namespace imported with import-equals in a .cts file', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.cts',
      addedText: [
        "import M = require('node:module');",
        "M.createRequire(__filename).resolve('../src/vtt/heldout-evaluation.ts');",
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_resolution',
    }));
  });

  it('does not classify ordinary namespace-root properties as loader values', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/ordinary-runtime.ts',
      addedText: [
        "window.addEventListener('load', () => undefined);",
        'if (import.meta.env.DEV) console.info(import.meta.url);',
        'void self.location;',
        'void globalThis.console;',
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toEqual([]);
  });

  it.each([
    ['Worker alias', [
      'const Spawn = Worker;',
      "new Spawn(new URL('../vtt/heldout-evaluation.ts', import.meta.url), { type: 'module' });",
    ].join('\n')],
    ['globalThis.Worker',
      "new globalThis.Worker(new URL('../vtt/heldout-evaluation.ts', import.meta.url));"],
    ['qualified SharedWorker',
      "new self.SharedWorker(new URL('../vtt/heldout-evaluation.ts', import.meta.url));"],
    ['renamed Node worker import', [
      "import { Worker as Thread } from 'node:worker_threads';",
      "new Thread('../vtt/heldout-evaluation.ts');",
    ].join('\n')],
    ['self.importScripts', "self.importScripts('../vtt/heldout-evaluation.ts');"],
    ['aliased importScripts', [
      'const loadScripts = self.importScripts;',
      "loadScripts('../vtt/heldout-evaluation.ts');",
    ].join('\n')],
  ] as const)('rejects held-out access through %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('decodes and recursively inspects a base64 JavaScript data module', () => {
    const inlineSource = "export * from 'file:///repo/src/vtt/heldout-evaluation.ts';";
    const encoded = Buffer.from(inlineSource, 'utf8').toString('base64');
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: `void import('data:text/javascript;base64,${encoded}');`,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('decodes and recursively inspects a percent-encoded JavaScript data module', () => {
    const inlineSource = "export * from '../vtt/heldout-evaluation.ts';";
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: `void import("data:text/javascript,${encodeURIComponent(inlineSource)}");`,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('trims loader-significant whitespace before decoding a data module', () => {
    const inlineSource = "export * from 'file:///repo/src/vtt/heldout-evaluation.ts';";
    const encoded = Buffer.from(inlineSource, 'utf8').toString('base64');
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: `void import(' data:text/javascript;base64,${encoded}');`,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it.each([
    ['unknown scheme', "void import('custom-loader:heldout-evaluation');"],
    ['undecodable data module', "void import('data:text/javascript,%ZZ');"],
  ] as const)('fails closed on an %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['JavaScript @import tag', 'src/ui/repair-ranking.js',
      "/** @import { HeldoutSlice } from '../vtt/heldout-evaluation' */"],
    ['TypeScript JSDoc import type', 'src/ui/repair-ranking.ts',
      "/** @type {import('../vtt/heldout-evaluation').HeldoutSlice} */\nconst value = {};"],
  ] as const)('rejects a %s', (_label, path, addedText) => {
    const report = inspectHeldoutLeakChanges([{ path, addedText }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('resolves a leading package #import through the nearest candidate package map', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "void import('#heldout');",
    }], 'F', bindings, {
      packageJsonFiles: {
        'package.json': JSON.stringify({
          imports: { '#heldout': './src/vtt/heldout-evaluation.ts' },
        }),
      },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('fails closed when a leading package #import cannot be resolved', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "void import('#not-mapped');",
    }], 'F', bindings, { packageJsonFiles: { 'package.json': '{"imports":{}}' } });

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it('selects an exact package import before an earlier wildcard', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "void import('#heldout');",
    }], 'F', bindings, {
      packageJsonFiles: {
        'package.json': JSON.stringify({
          imports: {
            '#*': './src/vtt/party-pack.ts',
            '#heldout': './src/vtt/heldout-evaluation.ts',
          },
        }),
      },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('orders overlapping package patterns by longest prefix and then suffix', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "void import('#policy/heldout-evaluation');",
    }], 'F', bindings, {
      packageJsonFiles: {
        'package.json': JSON.stringify({
          imports: {
            '#policy/*': './src/vtt/party-pack.ts',
            '#policy/heldout-*': './src/vtt/heldout-*.ts',
          },
        }),
      },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('fails closed on an ambiguous exact package target without falling back to a wildcard', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "void import('#policy');",
    }], 'F', bindings, {
      packageJsonFiles: {
        'package.json': JSON.stringify({
          imports: {
            '#*': './src/vtt/party-pack.ts',
            '#policy': {
              import: './src/vtt/heldout-evaluation.ts',
              default: './src/vtt/party-pack.ts',
            },
          },
        }),
      },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it('fails closed when ambiguity occurs inside a nested package condition', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: "void import('#policy');",
    }], 'F', bindings, {
      packageJsonFiles: {
        'package.json': JSON.stringify({
          imports: {
            '#policy': {
              import: {
                browser: './src/vtt/heldout-evaluation.ts',
                default: './src/vtt/party-pack.ts',
              },
              default: './src/vtt/party-pack.ts',
            },
          },
        }),
      },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'unresolved_module_edge',
    }));
  });

  it('re-inspects an unchanged #imports consumer after a package-only configuration change', () => {
    const packageSource = JSON.stringify({
      imports: { '#policy': './src/vtt/heldout-evaluation.ts' },
    });
    const report = inspectHeldoutLeakChanges([{
      path: 'package.json',
      addedText: packageSource,
      sourceText: packageSource,
    }], 'F', bindings, {
      packageJsonFiles: { 'package.json': packageSource },
      candidateSourceFiles: {
        'src/ui/unchanged-policy-consumer.ts': "import policy from '#policy';",
      },
    });

    expect(report).toMatchObject({ checkedFiles: 2 });
    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/unchanged-policy-consumer.ts',
      kind: 'protocol_import',
    }));
  });

  it('fails closed on an unchanged configured-alias consumer after resolution config changes', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: "export default { resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };",
    }], 'F', bindings, {
      candidateSourceFiles: {
        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
      },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/unchanged-policy-consumer.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['shorthand literal object', [
      "const alias = { '@policy': './src/vtt/heldout-evaluation.ts' };",
      'export default { resolve: { alias } };',
    ].join('\n'), "import policy from '@policy';", 'src/ui/unchanged-policy-consumer.ts'],
    ['identifier array with find/replacement', [
      "const alias = [{ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' }];",
      'export default { resolve: { alias } };',
    ].join('\n'), "import policy from '@policy';", 'src/ui/unchanged-policy-consumer.ts'],
    ['spread literal alias array', [
      "const baseAliases = [{ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' }];",
      'export default { resolve: { alias: [...baseAliases] } };',
    ].join('\n'), "import policy from '@policy';", 'src/ui/unchanged-policy-consumer.ts'],
    ['non-literal alias source', [
      'const alias = loadAliases();',
      'export default { resolve: { alias } };',
    ].join('\n'), "import policy from './public-policy';", 'vite.config.ts'],
    ['regex alias applied to a relative specifier', [
      "const alias = [{ find: /^\\.\\/public-policy$/, replacement: './src/vtt/heldout-evaluation.ts' }];",
      'export default { resolve: { alias } };',
    ].join('\n'), "import policy from './public-policy';", 'src/ui/unchanged-policy-consumer.ts'],
  ] as const)('discovers and fails closed for Vite alias configuration using %s',
  (_label, configSource, consumerSource, expectedPath) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings, {
      candidateSourceFiles: {
        'src/ui/unchanged-policy-consumer.ts': consumerSource,
      },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({
      path: expectedPath,
      kind: 'unresolved_module_edge',
    }));
  });

  it('fails the Vite config itself when its alias source is non-literal', () => {
    const configSource = [
      'const alias = loadAliases();',
      'export default { resolve: { alias } };',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'vite.config.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it('resolves Vite alias identifiers by symbol when another scope shadows the spelling', () => {
    const configSource = [
      "const alias = { '@policy': './src/vtt/heldout-evaluation.ts' };",
      'function shadow() { const alias = {}; return alias; }',
      'export default { resolve: { alias } };',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings, {
      candidateSourceFiles: {
        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
      },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/unchanged-policy-consumer.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it('honours literal spread overrides inside a Vite alias entry', () => {
    const configSource = [
      'const alias = [{',
      "  find: '@safe', replacement: '/safe.ts',",
      "  ...{ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' },",
      '}];',
      'export default { resolve: { alias } };',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings, {
      candidateSourceFiles: {
        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
      },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/unchanged-policy-consumer.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it('fails the Vite config on a non-literal spread inside an alias entry', () => {
    const configSource = [
      'const overrides = loadOverrides();',
      "const alias = [{ find: '@safe', replacement: '/safe.ts', ...overrides }];",
      'export default { resolve: { alias } };',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'vite.config.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it('applies a regex alias only to matching specifiers', () => {
    const configSource = [
      "const alias = [{ find: /^@policy$/, replacement: './src/vtt/heldout-evaluation.ts' }];",
      'export default { resolve: { alias } };',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings, {
      candidateSourceFiles: {
        'src/ui/ordinary-consumer.ts': "import ordinary from './ordinary-module';",
      },
    });

    expect(report.findings).toEqual([]);
  });

  it('reports zero findings when a configuration change reinspects the actual src tree', () => {
    const candidateSourceFiles = repositorySourcesUnder('src');
    const packageSource = '{"imports":{}}';
    const report = inspectHeldoutLeakChanges([{
      path: 'package.json',
      addedText: packageSource,
      sourceText: packageSource,
    }], 'F', bindings, {
      packageJsonFiles: { 'package.json': packageSource },
      candidateFiles: Object.keys(candidateSourceFiles),
      candidateSourceFiles,
    });

    expect(Object.keys(candidateSourceFiles).length).toBeGreaterThan(100);
    expect(report.checkedFiles).toBe(Object.keys(candidateSourceFiles).length + 1);
    expect(report.findings).toEqual([]);
  });

  it('still reports an injected leak in configuration-reinspection mode', () => {
    const candidateSourceFiles = {
      'src/ui/clean-consumer.ts': "import ordinary from './ordinary-module';",
      'src/ui/injected-heldout-leak.ts': "export * from '../vtt/heldout-evaluation';",
    };
    const packageSource = '{"imports":{}}';
    const report = inspectHeldoutLeakChanges([{
      path: 'package.json',
      addedText: packageSource,
      sourceText: packageSource,
    }], 'F', bindings, {
      packageJsonFiles: { 'package.json': packageSource },
      candidateFiles: Object.keys(candidateSourceFiles),
      candidateSourceFiles,
    });

    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/injected-heldout-leak.ts',
      kind: 'protocol_import',
    }));
  });

  it('skips declaration-only files during configuration-wide inspection', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'package.json',
      addedText: '{"imports":{}}',
    }], 'F', bindings, {
      packageJsonFiles: { 'package.json': '{"imports":{}}' },
      candidateSourceFiles: {
        'src/vite-env.d.ts': 'declare module "*.svg" { const source: string; export default source; }',
        'src/ui/clean.ts': 'export const clean = true;',
      },
    });

    expect(report).toMatchObject({ checkedFiles: 3, findings: [] });
  });

  it('uses NUL-delimited Git records so rename-only and quoted paths are inspected', () => {
    const nameStatus = [
      'R100', 'tests/fixture.ts', 'src/quoted "fixture".ts',
      'M', 'src/path\nwith-newline.ts',
      '',
    ].join('\0');
    const sources: Readonly<Record<string, string>> = {
      'src/quoted "fixture".ts': "export * from '../vtt/heldout-evaluation';",
      'src/path\nwith-newline.ts': 'export const clean = true;',
    };
    const changes = changesFromGitNameStatus(
      nameStatus,
      (path) => sources[path] ?? '',
      () => '',
    );
    const report = inspectHeldoutLeakChanges(changes, 'F', bindings);

    expect(parseGitNameStatusZ(nameStatus)).toEqual([
      { status: 'R100', previousPath: 'tests/fixture.ts', path: 'src/quoted "fixture".ts' },
      { status: 'M', path: 'src/path\nwith-newline.ts' },
    ]);
    expect(report).toMatchObject({ checkedFiles: 2 });
    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/quoted "fixture".ts',
      kind: 'protocol_import',
    }));
  });

  it('documents executable eval and new Function strings as outside AST edge discovery', () => {
    expect(HELDOUT_LEAK_AST_OUT_OF_SCOPE).toEqual([
      'eval executable strings',
      'new Function executable strings',
      'custom loader implementations',
      'runtime-generated code',
    ]);
    expect(moduleSpecifiers('tools/tuning/repair-ranking.ts', [
      "eval(\"import('../vtt/heldout-evaluation')\");",
      "new Function(\"return require('../vtt/heldout-evaluation')\");",
    ].join('\n'))).toEqual([]);
  });

  it('enumerates import-equals and import-type edges without matching prose or comments', () => {
    expect(moduleSpecifiers('src/ui/repair-ranking.ts', [
      "import Protocol = require /* x */ ('../vtt/heldout-evaluation');",
      "type ProtocolShape = import /* x */ ('../vtt/heldout-evaluation').HeldoutSlice;",
      "const prose = \"import('../vtt/heldout-evaluation')\";",
      "// require('../vtt/heldout-evaluation');",
    ].join('\n'))).toEqual(['../vtt/heldout-evaluation']);
  });

  it('fails closed when a candidate source file is unparsable', () => {
    expect(() => inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: "import { heldoutSideHp from '../vtt/heldout-evaluation';",
    }], 'A', bindings)).toThrow('Held-out leak inspection could not parse');
  });

  it('reports zero findings on a clean tree and non-zero after one injected edge', () => {
    const cleanChanges = [{
      path: 'src/vtt/intel/opportunity-cost.ts',
      addedText: 'const remainingHitPointsWeight = 2;',
    }, {
      path: 'tests/fixtures/tuning/repair-a.json',
      addedText: '{"protocol":"heldout-development-v1","seed":7850001}',
    }] as const;
    const clean = inspectHeldoutLeakChanges(cleanChanges, 'A', bindings);
    const injected = inspectHeldoutLeakChanges([...cleanChanges, {
      path: 'tools/tuning/injected-edge.ts',
      addedText: "export * from '../src/vtt/heldout-evaluation';",
    }], 'A', bindings);

    expect(clean).toMatchObject({ checkedFiles: 2, findings: [] });
    expect(injected.findings).toHaveLength(1);
    expect(injected.findings[0]).toMatchObject({ kind: 'protocol_import' });
  });

  it('refuses malformed digest bindings', () => {
    expect(() => inspectHeldoutLeakChanges([], 'A', {
      reserveDigests: ['not-a-sha256'],
      resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
    })).toThrow('Held-out reserve digests must be SHA-256 values.');
  });

  it('records the exact reserve digest and result path bindings in its report', () => {
    expect(inspectHeldoutLeakChanges([], 'A', bindings)).toMatchObject({
      reserveDigests: bindings.reserveDigests,
      resultPaths: bindings.resultPaths,
    });
  });
});
