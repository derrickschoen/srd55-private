import { posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from '../../helpers/test-filesystem';
import {
  HELDOUT_LEAK_AST_OUT_OF_SCOPE,
  HELDOUT_LEAK_FLOW_AUDIT,
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

const reserveDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const bindings = {
  reserveDigests: [reserveDigest],
  resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
} as const;

const actualSourceFiles = repositorySourcesUnder('src');
const emptyImportsPackageSource = '{"imports":{}}';
const actualViteConfigSource = readFileSync('vite.config.ts', 'utf8');
const actualVitestConfigSource = readFileSync('vitest.config.ts', 'utf8');
const actualTreeConfigChange = [{
  path: 'package.json',
  addedText: emptyImportsPackageSource,
  sourceText: emptyImportsPackageSource,
}, {
  path: 'vite.config.ts',
  addedText: actualViteConfigSource,
  sourceText: actualViteConfigSource,
}, {
  path: 'vitest.config.ts',
  addedText: actualVitestConfigSource,
  sourceText: actualVitestConfigSource,
}] as const;
const actualTreeReport = inspectHeldoutLeakChanges(actualTreeConfigChange, 'F', bindings, {
  packageJsonFiles: { 'package.json': emptyImportsPackageSource },
  candidateFiles: Object.keys(actualSourceFiles),
  candidateSourceFiles: actualSourceFiles,
});
const injectedActualSourceFiles = {
  ...actualSourceFiles,
  'src/ui/injected-heldout-leak.ts': "export * from '../vtt/heldout-evaluation';",
};
const injectedActualTreeReport = inspectHeldoutLeakChanges(actualTreeConfigChange, 'F', bindings, {
  packageJsonFiles: { 'package.json': emptyImportsPackageSource },
  candidateFiles: Object.keys(injectedActualSourceFiles),
  candidateSourceFiles: injectedActualSourceFiles,
});

describe('held-out reserve leak wall', () => {

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
        'loader-valued expressions are require, module.require, importScripts, Worker or SharedWorker (bare or global-qualified), require.resolve, import.meta.resolve, import.meta.glob, createRequire from module built-ins and its result, worker_threads.Worker, and exact aliases',
        'Rule N1 permits import.meta and module/worker namespaces only as direct member receivers or exact plain-const aliases',
        'Rule N2 permits browser globals to transfer inertly and validates Worker, SharedWorker, and importScripts members at use by symbol-proven global provenance',
        'a loader-valued expression is allowed only as a direct callee with a constant specifier, a receiver leading to a recognized member call, or the whole initializer of a non-exported plain-identifier const alias',
        'Rule C interprets Vite and Vitest aliases only as strict literals in the exact-node graph reached from export default, symbol-proven defineConfig or mergeConfig, factory returns, conditional branches, and same-file const object/array composition',
        'Rule C uses no flow tracking: each tracked-const reference is classified by its maximal constant-key address, including whether its path crosses resolve, test, or alias, the addressed subtree, and its immediate syntactic position',
        'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
        'Rule C records every configuration placement prefix for a binding and composes each prefix with descendant and const-alias paths; any semantic placement makes the reference alias-capable',
        'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
        'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
        'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
        'reachable object spreads require tracked const literals; computed keys, accessors, methods, and nonliteral resolve, test, or alias values fail closed, while unrelated nonliteral values are opaque',
        'root vite*.config.* and vitest*.config.* entry points are inspected, including symbol-proven defineConfig and mergeConfig imports from Vite or Vitest',
        'resolution configuration changes re-inspect consumers; unresolved configuration makes every encountered consumer edge unresolved',
        'every eligible candidate file receives the full AST and symbol inspection pass without a textual pre-gate',
      ],
      failsClosed: [
        'every other position of a loader-valued expression is loader_reference_escaped from one generic check',
        'every disallowed Rule N1 namespace position and every non-symbol-proven Rule N2 loader-member use is loader_reference_escaped from the same generic check',
        'a nonliteral Vite or Vitest alias, unreachable alias/resolve/test property, or invalid reachable-const reference is unresolved configuration under Rule C',
        'tracked configuration references with nonconstant addresses or mutation targets fail closed; alias-bearing subtrees also fail closed when returned, stored outside the visited graph, passed, exported, templated, awaited, yielded, or otherwise escaped',
        'unresolved targets, options, package conditions, globs, aliases, URL schemes, and data modules are findings',
      ],
      outOfScope: [
        'eval executable strings',
        'new Function executable strings',
        'custom loader implementations',
        'Vite plugin config hooks',
        'runtime-generated code',
      ],
    });
  });

  it('documents every audited expression-flow position without a silent case', () => {
    expect(HELDOUT_LEAK_FLOW_AUDIT.map((entry) => entry.position)).toEqual([
      'declaration initializer',
      'member receiver',
      'assignment',
      'destructuring declaration',
      'destructuring assignment',
      'parameter default',
      'return',
      'yield',
      'throw',
      'await or promise resolution',
      'template substitution',
      'spread',
      'property value',
      'array element',
      'call argument',
      'constructor argument',
      'call receiver',
      'conditional, logical, or comma expression',
      'class field or heritage',
      'export',
      'for-of head',
      'for-in head',
      'tagged template',
    ]);
    for (const entry of HELDOUT_LEAK_FLOW_AUDIT) {
      expect(entry.loaderValues).toContain('Rule N');
      expect(entry.configurationReferences).toContain('Rule C');
      expect(`${entry.loaderValues} ${entry.configurationReferences}`).not.toContain('unhandled');
    }
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

  it('keeps an ambient-declared CommonJS require bound to the runtime loader', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.cts',
      addedText: [
        'export {};',
        'declare const require: (specifier: string) => unknown;',
        'const load = require;',
        "load('../src/vtt/heldout-evaluation.ts');",
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('does not track a real runtime shadow of CommonJS require', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.cts',
      addedText: [
        'export {};',
        'const require = (_specifier: string) => 0;',
        'const load = require;',
        "load('../src/vtt/heldout-evaluation.ts');",
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
    ['comment-separated import.meta resolver', [
      'const locate = import /* gap */ .meta.resolve;',
      "locate('../vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_resolution'],
    ['Unicode-escaped require alias', [
      'const load = requ\\u0069re;',
      "load('../src/vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_import'],
  ] as const)('tracks a %s without textual source gating', (_label, addedText, kind) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind }));
    expect(report.astInspectedFiles).toBe(1);
  });

  it('treats the expression in a class extends heritage clause as runtime code', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.cjs',
      addedText: [
        'class C extends (',
        "  [require.resolve][0]('../src/vtt/heldout-evaluation.ts'),",
        '  Object',
        ') {}',
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
    ['Module namespace member chain', [
      "import * as M from 'node:module';",
      'const make = M.Module.createRequire;',
      'const load = make(import.meta.url);',
      "load.resolve('../src/vtt/heldout-evaluation.ts');",
    ].join('\n'), 'tools/probe.mts', 'protocol_resolution'],
    ['default module namespace member chain', [
      "import * as M from 'node:module';",
      'const make = M.default.createRequire;',
      'const load = make(import.meta.url);',
      "load.resolve('../src/vtt/heldout-evaluation.ts');",
    ].join('\n'), 'tools/probe.mts', 'protocol_resolution'],
    ['default worker namespace member chain', [
      "import * as Threads from 'node:worker_threads';",
      'const Spawn = Threads.default.Worker;',
      "new Spawn('../src/vtt/heldout-evaluation.ts');",
    ].join('\n'), 'tools/probe.mts', 'protocol_import'],
    ['non-constant computed module member', [
      "import * as M from 'node:module';",
      "const key = 'Module';",
      'const make = M[key].createRequire;',
    ].join('\n'), 'tools/probe.mts', 'loader_reference_escaped'],
  ] as const)('preserves or rejects %s', (_label, addedText, path, kind) => {
    const report = inspectHeldoutLeakChanges([{ path, addedText }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind }));
  });

  it('rejects namespace re-exports and follows their provenance into a local consumer', () => {
    const bridgeSource = "export * as M from 'node:module';";
    const consumerSource = [
      "import { M } from './bridge';",
      'const load = M.createRequire(import.meta.url);',
      "load.resolve('../vtt/heldout-evaluation.ts');",
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/bridge.ts',
      addedText: bridgeSource,
      sourceText: bridgeSource,
    }, {
      path: 'src/ui/consumer.ts',
      addedText: consumerSource,
      sourceText: consumerSource,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/bridge.ts',
      kind: 'loader_reference_escaped',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/consumer.ts',
      kind: 'protocol_resolution',
    }));
  });

  it.each([
    ['namespace export', "export * as M from 'node:module';", true],
    ['Module export', "export { Module } from 'node:module';", true],
    ['default export', "export { default } from 'node:module';", true],
    ['createRequire export', "export { createRequire } from 'node:module';", true],
    ['inert builtinModules export', "export { builtinModules } from 'node:module';", false],
  ] as const)('classifies %s at the re-export site', (_label, addedText, escaped) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/bridge.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings.some((finding) => finding.kind === 'loader_reference_escaped'))
      .toBe(escaped);
  });

  it.each([
    ['computed browser-global member', [
      "const key = 'Worker';",
      "new window[key]('../src/vtt/heldout-evaluation.ts');",
    ].join('\n')],
    ['computed import.meta alias member', [
      'const meta = import.meta;',
      "const key = 'resolve';",
      "meta[key]('../src/vtt/heldout-evaluation.ts');",
    ].join('\n')],
  ] as const)('fails closed on a non-constant %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['typeof-window parameter', 'root: typeof window'],
    ['Window parameter', 'root: Window'],
  ] as const)('fails closed on a computed loader member from a %s', (_label, parameter) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText: [
        `function spawn(${parameter}, key: 'Worker') {`,
        "  new root[key]('../src/vtt/heldout-evaluation.ts');",
        '}',
        "spawn(window, 'Worker');",
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each(([
    ['import.meta', '', 'import.meta', 'resolver'],
    ['window', '', 'window', 'worker'],
    ['self', '', 'self', 'worker'],
    ['globalThis', '', 'globalThis', 'worker'],
    ['node:module namespace', "import * as M from 'node:module';", 'M', 'factory'],
    ['worker_threads namespace', "import * as Threads from 'node:worker_threads';", 'Threads', 'worker'],
  ] as const).flatMap(([label, setup, initializer, use]) => ([1, 2] as const).map((hops) =>
    [label, hops, setup, initializer, use] as const)))
  ('preserves full %s provenance through %i alias hop(s)',
  (_label, hops, setup, initializer, use) => {
    const active = hops === 1 ? 'root1' : 'root2';
    const useLines = use === 'resolver'
      ? [`const locate = ${active}.resolve;`,
        "locate('../src/vtt/heldout-evaluation.ts');"]
      : use === 'factory'
        ? [`const make = ${active}.createRequire;`, 'const load = make(import.meta.url);',
          "load.resolve('../src/vtt/heldout-evaluation.ts');"]
        : [`const Spawn = ${active}.Worker;`,
          "new Spawn('../src/vtt/heldout-evaluation.ts');"];
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText: [
        setup,
        `const root1 = ${initializer};`,
        ...(hops === 2 ? ['const root2 = root1;'] : []),
        ...useLines,
      ].filter((line) => line.length > 0).join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: use === 'resolver' || use === 'factory' ? 'protocol_resolution' : 'protocol_import',
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
    ['import.meta', "const key = 'resolve'; const { [key]: locate } = import.meta;"],
    ['a module namespace', [
      "import * as M from 'node:module';",
      "const key = 'createRequire'; const { [key]: factory } = M;",
    ].join('\n')],
    ['the window namespace', "const key = 'Worker'; const { [key]: Spawn } = window;"],
  ] as const)('fails closed on a non-constant computed binding from %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it('tracks a constant computed namespace member as an exact alias', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: [
        "const { ['resolve']: locate } = import.meta;",
        "locate('../vtt/heldout-evaluation.ts');",
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_resolution',
    }));
  });

  it('recursively tracks constant nested namespace destructuring', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: [
        "const { default: { createRequire: make } } = await import('node:module');",
        'const load = make(import.meta.url);',
        "load.resolve('../vtt/heldout-evaluation.ts');",
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_resolution',
    }));
  });

  it('fails closed on a nested namespace binding with a non-constant key', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText: [
        "const key = 'createRequire';",
        "const { default: { [key]: make } } = await import('node:module');",
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['typed browser-global parameter', [
      'function spawn(root: typeof window) {',
      "  const { 'Worker': Spawn } = root;",
      "  new Spawn('../src/vtt/heldout-evaluation.ts');",
      '}',
      'spawn(window);',
    ].join('\n'), 'protocol_import'],
    ['non-constant typed-global extraction', [
      'function spawn(root: Window, key: string) {',
      '  const { [key]: Spawn } = root;',
      '  return Spawn;',
      '}',
    ].join('\n'), 'loader_reference_escaped'],
    ['unknown-source loader-key extraction', [
      'function spawn(root: object) {',
      "  const { 'Worker': Spawn } = root;",
      '  return Spawn;',
      '}',
    ].join('\n'), 'loader_reference_escaped'],
  ] as const)('guards %s destructuring', (_label, addedText, kind) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind }));
  });

  it.each([
    ['loader key plus rest from a boxed source', [
      'const box = { w: window };',
      "const { 'Worker': Spawn, ...rest } = box.w;",
      "new Spawn('../src/vtt/heldout-evaluation.ts');",
      'void rest;',
    ].join('\n'), true],
    ['untyped JavaScript parameter loader key', [
      "function spawn({ 'Worker': Spawn }) {",
      "  new Spawn('../src/vtt/heldout-evaluation.ts');",
      '}',
      'spawn(window);',
    ].join('\n'), true],
    ['inert browser-global member', 'const { addEventListener } = window;', false],
  ] as const)('classifies %s destructuring structurally', (_label, addedText, escaped) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.js',
      addedText,
    }], 'F', bindings);

    expect(report.findings.some((finding) => finding.kind === 'loader_reference_escaped'))
      .toBe(escaped);
  });

  it.each([
    ['awaited namespace alias', [
      'const meta = await import.meta;',
      "meta.resolve('../src/vtt/heldout-evaluation.ts');",
    ].join('\n')],
    ['awaited namespace receiver',
      "(await import.meta).resolve('../src/vtt/heldout-evaluation.ts');"],
  ] as const)('rejects %s under Rule N1', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['awaited createRequire result', [
      "import { createRequire } from 'node:module';",
      'const load = await createRequire(import.meta.url);',
      "load.resolve('../src/vtt/heldout-evaluation.ts');",
    ].join('\n')],
    ['awaited require loader', [
      'const load = await require;',
      "load('../src/vtt/heldout-evaluation.ts');",
    ].join('\n')],
  ] as const)('rejects %s as a loader escape', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it('permits only awaited dynamic import of a built-in namespace', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText: [
        "const M = await import('node:module');",
        'const load = M.createRequire(import.meta.url);',
        "load.resolve('../src/vtt/heldout-evaluation.ts');",
      ].join('\n'),
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_resolution',
    }));
    expect(report.findings).not.toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['import.meta object assignment', [
      'let locate;',
      '({ resolve: locate } = import.meta);',
      "locate('../src/vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_resolution'],
    ['node:module object assignment', [
      "import * as M from 'node:module';",
      'let make;',
      '({ createRequire: make } = M);',
      'const load = make(import.meta.url);',
      "load.resolve('../src/vtt/heldout-evaluation.ts');",
    ].join('\n'), 'protocol_resolution'],
    ['window object assignment', [
      'let Spawn;',
      '({ Worker: Spawn } = window);',
      "new Spawn('../src/vtt/heldout-evaluation.ts');",
    ].join('\n'), 'loader_reference_escaped'],
    ['import.meta array assignment', 'let value; [value] = import.meta;',
      'loader_reference_escaped'],
    ['node:module array assignment', [
      "import * as M from 'node:module';",
      'let value; [value] = M;',
    ].join('\n'), 'loader_reference_escaped'],
    ['window array assignment', [
      'let value; [value] = [window];',
      "new value.Worker('../src/vtt/heldout-evaluation.ts');",
    ].join('\n'),
      'loader_reference_escaped'],
  ] as const)('handles %s', (_label, addedText, kind) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind }));
  });

  it.each([
    ['nested assignment pattern', [
      "import * as M from 'node:module';",
      'let make;',
      '({ default: { createRequire: make } } = M);',
      'const load = make(import.meta.url);',
      "load.resolve('../src/vtt/heldout-evaluation.ts');",
    ].join('\n')],
    ['for-of assignment head', [
      'let locate;',
      'for ({ resolve: locate } of [import.meta]) {',
      "  locate('../src/vtt/heldout-evaluation.ts');",
      '}',
    ].join('\n')],
    ['parameter-default binding pattern', [
      'function inspect({ resolve: locate } = import.meta) {',
      "  return locate('../src/vtt/heldout-evaluation.ts');",
      '}',
    ].join('\n')],
  ] as const)('tracks a resolver through %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_resolution',
    }));
  });

  it.each([
    ['createRequire', "export { createRequire } from 'node:module';", true],
    ['require-like loader', "export { require } from 'node:module';", true],
    ['builtinModules', "export { builtinModules } from 'node:module';", false],
    ['isBuiltin', "export { isBuiltin } from 'module';", false],
  ] as const)('classifies the %s built-in re-export by exported name',
  (_label, addedText, loaderValued) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/tuning/repair-ranking.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings.some((finding) => finding.kind === 'loader_reference_escaped'))
      .toBe(loaderValued);
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

  it('uses one prepared AST/checker pair while recursively inspecting a data module', () => {
    const inlineSource = [
      "import { createRequire as make } from 'node:module';",
      "const load = make('file:///tmp/probe.mjs');",
      "load.resolve('/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts');",
    ].join('\n');
    const encoded = Buffer.from(inlineSource, 'utf8').toString('base64');
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText: `void import('data:text/javascript;base64,${encoded}');`,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'protocol_resolution',
    }));
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

  it.each([
    ['whole-variable reassignment', [
      'let alias = {};',
      "alias = { '@policy': './src/vtt/heldout-evaluation.ts' };",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['property assignment', [
      'const alias = {};',
      "alias['@policy'] = './src/vtt/heldout-evaluation.ts';",
      'export default { resolve: { alias } };',
    ].join('\n')],
  ] as const)('fails closed on Vite alias %s', (_label, configSource) => {
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
      path: 'vite.config.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['write through an exact reference', [
      'const alias = {};',
      'const edit = alias;',
      "edit['@policy'] = './src/vtt/heldout-evaluation.ts';",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['array push', [
      'const alias = [];',
      "alias.push({ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' });",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['Object.assign', [
      'const alias = {};',
      "Object.assign(alias, { '@policy': './src/vtt/heldout-evaluation.ts' });",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['call-argument escape', [
      'const alias = {};',
      'mutateAliases(alias);',
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['mutation after object-spread transfer', [
      'const alias = {};',
      'const edit = { ...alias };',
      "edit['@policy'] = './src/vtt/heldout-evaluation.ts';",
      'export default { resolve: { alias } };',
    ].join('\n')],
  ] as const)('invalidates Vite alias discovery after %s', (_label, configSource) => {
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

  it.each([
    ['returned reference', [
      'const alias = {};',
      'function exposeAlias() { return alias; }',
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['called closure write', [
      'const alias = {};',
      "const writeAlias = () => { alias['@policy'] = './src/vtt/heldout-evaluation.ts'; };",
      'writeAlias();',
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['class-field storage', [
      'const alias = {};',
      'class AliasBox { value = alias; }',
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['call-expression receiver write', [
      'const alias = {};',
      'function getAlias() { return alias; }',
      "getAlias()['@policy'] = './src/vtt/heldout-evaluation.ts';",
      'export default { resolve: { alias } };',
    ].join('\n')],
  ] as const)('fails Vite alias discovery for a configuration reference in %s',
  (_label, configSource) => {
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

  it.each([
    ['object-property transfer', [
      'const alias = {};',
      'const box = { value: alias };',
      "box.value['@policy'] = './src/vtt/heldout-evaluation.ts';",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['array-element transfer', [
      'const alias = [];',
      'const box = [alias];',
      "box[0].push({ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' });",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['nested literal transfer', [
      'const alias = {};',
      'const box = { nested: [{ value: alias }] };',
      "box.nested[0].value['@policy'] = './src/vtt/heldout-evaluation.ts';",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['untrackable call-result transfer', [
      'const alias = { nested: { value: loadAliases() } };',
      'export default { resolve: { alias } };',
    ].join('\n')],
  ] as const)('invalidates Vite alias discovery after %s', (_label, configSource) => {
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

  it.each([
    ['boxed import.meta namespace', [
      'const box = { meta: import.meta };',
      "box.meta.resolve('../src/vtt/heldout-evaluation.ts');",
    ].join('\n')],
    ['smuggled browser-global loader member', [
      'const box = { w: window };',
      "new box.w.Worker('../src/vtt/heldout-evaluation.ts');",
    ].join('\n')],
  ] as const)('applies Rule N to %s', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'tools/probe.mts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'loader_reference_escaped',
    }));
  });

  it.each([
    ['constructor injection', [
      'class UsesWindow { constructor(readonly root = window) {} }',
      'const use = new UsesWindow(window);',
      'use.root.addEventListener;',
    ].join('\n')],
    ['parameter default', [
      'function locationOf(root = window) { return root.location.href; }',
      'locationOf();',
    ].join('\n')],
    ['conditional storage', [
      'const root = Math.random() > 0.5 ? window : self;',
      'root.addEventListener;',
    ].join('\n')],
  ] as const)('keeps Rule N2 %s inert for non-loader members', (_label, addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/global-injection-control.ts',
      addedText,
    }], 'F', bindings);

    expect(report.findings).toEqual([]);
  });

  it.each([
    ['computed-property transfer', [
      'const alias: Record<string, string> = {};',
      "const box = { ['value']: alias };",
      "box.value['@policy'] = './src/vtt/heldout-evaluation.ts';",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['for-of assignment head', [
      'const alias: Record<string, string> = {};',
      "for (alias['@policy'] of ['./src/vtt/heldout-evaluation.ts']) {}",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['for-in assignment head', [
      'const alias: Record<string, string> = {};',
      "for (alias['@policy'] in { './src/vtt/heldout-evaluation.ts': true }) {}",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['constructor argument', [
      'const alias = {};',
      'new Update(alias);',
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['fill-style receiver mutation', [
      "const alias = [{ find: '@safe', replacement: './safe.ts' }];",
      "alias.fill({ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' });",
      'export default { resolve: { alias } };',
    ].join('\n')],
    ['locally shadowed defineConfig', [
      "const alias = { '@safe': './safe.ts' };",
      "function defineConfig(value) { value.resolve.alias['@policy'] = './src/vtt/heldout-evaluation.ts'; return value; }",
      'export default defineConfig({ resolve: { alias } });',
    ].join('\n')],
  ] as const)('applies Rule C to %s', (_label, configSource) => {
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
      path: 'vite.config.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['reachable getter', [
      'export default {',
      '  get resolve() {',
      "    return { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } };",
      '  },',
      '};',
    ].join('\n')],
    ['opaque side-effect reference', [
      'const shared = { resolve: { alias: {} } };',
      'export default {',
      '  ...shared,',
      "  sideEffect: shared.resolve.alias['@policy'] = './src/vtt/heldout-evaluation.ts',",
      '};',
    ].join('\n')],
    ['named export outside the reachable set', [
      'const shared = { resolve: { alias: {} } };',
      'export { shared };',
      'export default shared;',
    ].join('\n')],
  ] as const)('fails exact-node Rule C for %s', (_label, configSource) => {
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

  it.each([
    ['assignment inside an opaque plugin array', [
      'const shared = { resolve: { alias: {} } };',
      'export default {',
      '  ...shared,',
      "  plugins: [(shared.resolve.alias['@policy'] = './src/vtt/heldout-evaluation.ts', false)],",
      '};',
    ].join('\n'), true],
    ['tracked const passed to a helper inside an opaque plugin array', [
      'const shared = { resolve: { alias: {} } };',
      'export default { ...shared, plugins: [helper(shared)] };',
    ].join('\n'), true],
    ['property read inside an opaque plugin array', [
      'const shared = { resolve: { alias: {} }, plugins: [] };',
      'export default { ...shared, plugins: [shared.plugins.length] };',
    ].join('\n'), false],
    ['array spread read inside an opaque plugin array', [
      'const shared = { resolve: { alias: {} }, plugins: [] };',
      'export default { ...shared, plugins: [...shared.plugins] };',
    ].join('\n'), false],
    ['plain calls inside an opaque plugin array', [
      'export default { plugins: [foo(), bar({ x: 1 })] };',
    ].join('\n'), false],
    ['plain-const alias of a non-alias-bearing subtree', [
      'const shared = { resolve: { alias: {} }, plugins: [] };',
      'const p = shared.plugins;',
      'export default { ...shared, plugins: [...p] };',
    ].join('\n'), false],
    ['let alias of an alias-bearing subtree', [
      'const shared = { resolve: { alias: {} }, plugins: [] };',
      'let p = shared;',
      'export default shared;',
      'void p;',
    ].join('\n'), true],
    ['plain-const alias escaped through a call', [
      'const shared = { resolve: { alias: {} }, plugins: [] };',
      'const q = shared.resolve;',
      'use(q);',
      'export default shared;',
    ].join('\n'), true],
  ] as const)('classifies %s with the Rule C addressed-subtree guard',
  (_label, configSource, unresolved) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings.some((finding) => finding.path === 'vite.config.ts' &&
      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
  });

  it.each([
    ['resolve.alias address', 'vite.config.ts', [
      'const shared = { resolve: { alias: {} } };',
      'const p = shared.resolve.alias;',
      "Object.assign(p, { '@policy': './src/vtt/heldout-evaluation.ts' });",
      'export default shared;',
    ].join('\n')],
    ['test.alias address', 'vitest.config.ts', [
      'const shared = { test: { alias: {} } };',
      'const p = shared.test.alias;',
      "Object.assign(p, { '@policy': './src/vtt/heldout-evaluation.ts' });",
      'export default shared;',
    ].join('\n')],
    ['identifier bound at resolve', 'vite.config.ts', [
      'const r = {};',
      'export default { resolve: r };',
      'use(r);',
    ].join('\n')],
    ['identifier bound at test', 'vitest.config.ts', [
      'const t = {};',
      'export default { test: t };',
      'use(t);',
    ].join('\n')],
  ] as const)('fails closed when %s escapes', (_label, path, configSource) => {
    const report = inspectHeldoutLeakChanges([{
      path,
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      path,
      kind: 'unresolved_module_edge',
    }));
  });

  it('fails closed for a nonliteral Vitest test container', () => {
    const configSource = [
      'function makeTestConfig() {',
      '  const t = Object.create(null);',
      "  t.alias = { '@policy': './src/vtt/heldout-evaluation.ts' };",
      '  return t;',
      '}',
      'export default { test: makeTestConfig() };',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vitest.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'vitest.config.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it('discovers a literal alias inside a Vitest test container', () => {
    const configSource = [
      "export default { test: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };",
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vitest.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings, {
      candidateSourceFiles: {
        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
      },
    });

    expect(report.findings).not.toContainEqual(expect.objectContaining({
      path: 'vitest.config.ts',
      kind: 'unresolved_module_edge',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/unchanged-policy-consumer.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['instanceof on an alias-bearing root', [
      'const shared = { resolve: { alias: {} } };',
      'shared instanceof receiver;',
      'export default shared;',
    ].join('\n'), true],
    ['strict equality on an alias-bearing root', [
      'const shared = { resolve: { alias: {} } };',
      'shared === other;',
      'export default shared;',
    ].join('\n'), false],
    ['instanceof on a non-alias-bearing subtree', [
      'const shared = { resolve: { alias: {} }, plugins: [] };',
      'shared.plugins instanceof Array;',
      'export default shared;',
    ].join('\n'), false],
  ] as const)('classifies %s by comparison semantics', (_label, configSource, unresolved) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings.some((finding) => finding.path === 'vite.config.ts' &&
      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
  });

  it.each([
    ['void-only use', 'void p;', false],
    ['call-argument use', 'use(p);', true],
  ] as const)('classifies a permitted const alias with %s', (_label, use, unresolved) => {
    const configSource = [
      'const shared = { resolve: { alias: {} } };',
      'const p = shared;',
      use,
      'export default shared;',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings.some((finding) => finding.path === 'vite.config.ts' &&
      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
  });

  it.each([
    ['shorthand resolve', 'vite.config.mjs', [
      'const resolve = {};',
      'install(resolve);',
      'export default { resolve };',
    ].join('\n')],
    ['shorthand test', 'vitest.config.mjs', [
      'const test = {};',
      'install(test);',
      'export default { test };',
    ].join('\n')],
    ['spread inside test', 'vitest.config.mjs', [
      'const parts = {};',
      'install(parts);',
      'export default { test: { ...parts } };',
    ].join('\n')],
    ['spread inside resolve', 'vite.config.mjs', [
      'const parts = {};',
      'install(parts);',
      'export default { resolve: { ...parts } };',
    ].join('\n')],
  ] as const)('treats %s as an alias-capable binding position', (_label, path, configSource) => {
    const report = inspectHeldoutLeakChanges([{
      path,
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      path,
      kind: 'unresolved_module_edge',
    }));
  });

  it('discovers a shorthand resolve binding without treating its declaration as an escape', () => {
    const configSource = [
      "const resolve = { alias: { '@x': '/lit' } };",
      'export default { resolve };',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.mjs',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings, {
      candidateSourceFiles: {
        'src/ui/alias-capability-control.ts': "import value from '@x';",
      },
    });

    expect(report.findings).not.toContainEqual(expect.objectContaining({
      path: 'vite.config.mjs',
      kind: 'unresolved_module_edge',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/alias-capability-control.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['direct root', [
      'const shared = {};',
      'install(shared);',
      'export default shared;',
    ].join('\n'), true],
    ['root spread', [
      'const shared = {};',
      'install(shared);',
      'export default { ...shared };',
    ].join('\n'), true],
    ['defineConfig callback root spread', [
      "import { defineConfig } from 'vite';",
      'const shared = {};',
      'install(shared);',
      'export default defineConfig(() => ({ ...shared }));',
    ].join('\n'), true],
    ['plugins value', [
      'const plugins = [];',
      'install(plugins);',
      'export default { plugins };',
    ].join('\n'), false],
    ['build value', [
      'const build = {};',
      'install(build);',
      'export default { build };',
    ].join('\n'), false],
  ] as const)('classifies %s by positional root capability', (_label, configSource, unresolved) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings.some((finding) => finding.path === 'vite.config.ts' &&
      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
  });

  it.each([
    ['resolve alias-array entry', 'vite.config.mjs', [
      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
      "install(rules['0']);",
      'export default { resolve: { alias: rules } };',
    ].join('\n')],
    ['const alias of a resolve alias-array entry', 'vite.config.mjs', [
      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
      "const entry = rules['0'];",
      'install(entry);',
      'export default { resolve: { alias: rules } };',
    ].join('\n')],
    ['test alias-array entry', 'vitest.config.mjs', [
      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
      'install(rules[0]);',
      'export default { test: { alias: rules } };',
    ].join('\n')],
    ['spread alias-array entry source', 'vite.config.mjs', [
      "const entries = [{ find: '@a', replacement: '/lit' }];",
      'export default { resolve: { alias: [...entries] } };',
      'install(entries[0]);',
    ].join('\n')],
    ['entry from a multiply placed alias array', 'vite.config.mjs', [
      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
      'install(rules[0]);',
      'export default { plugins: rules, resolve: { alias: rules } };',
    ].join('\n')],
  ] as const)('fails closed for %s using its semantic placement prefix',
  (_label, path, configSource) => {
    const report = inspectHeldoutLeakChanges([{
      path,
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({
      path,
      kind: 'unresolved_module_edge',
    }));
  });

  it('discovers an unescaped alias-array binding at its semantic placement', () => {
    const configSource = [
      "const rules = [{ find: '@x', replacement: '/lit' }];",
      'export default { resolve: { alias: rules } };',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.mjs',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings, {
      candidateSourceFiles: {
        'src/ui/placement-prefix-control.ts': "import value from '@x';",
      },
    });

    expect(report.findings).not.toContainEqual(expect.objectContaining({
      path: 'vite.config.mjs',
      kind: 'unresolved_module_edge',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/placement-prefix-control.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it('keeps an escaped plugin-list entry non-alias-capable', () => {
    const configSource = [
      "const list = [{ name: 'p' }];",
      'install(list[0]);',
      'export default { plugins: list };',
    ].join('\n');
    const report = inspectHeldoutLeakChanges([{
      path: 'vite.config.mjs',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings);

    expect(report.findings).toEqual([]);
  });

  it('interprets a symbol-proven defineConfig callback, conditional, and const spread', () => {
    const configSource = [
      "import { defineConfig } from 'vite';",
      "const core = { base: '/' };",
      "const shared = { ...core, resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };",
      "export default defineConfig(({ command }) => command === 'serve' ? { ...shared } : shared);",
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

    expect(report.findings).not.toContainEqual(expect.objectContaining({
      path: 'vite.config.ts',
      kind: 'unresolved_module_edge',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/unchanged-policy-consumer.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['direct Vitest defineConfig', [
      "import { defineConfig } from 'vitest/config';",
      "export default defineConfig({ resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } });",
    ].join('\n')],
    ['Vitest mergeConfig union', [
      "import { defineConfig, mergeConfig } from 'vitest/config';",
      "const base = { resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };",
      'export default defineConfig(mergeConfig(base, { test: { globals: true } }));',
    ].join('\n')],
  ] as const)('discovers aliases through %s', (_label, configSource) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'vitest.config.ts',
      addedText: configSource,
      sourceText: configSource,
    }], 'F', bindings, {
      candidateSourceFiles: {
        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
      },
    });

    expect(report.findings).not.toContainEqual(expect.objectContaining({
      path: 'vitest.config.ts',
      kind: 'unresolved_module_edge',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({
      path: 'src/ui/unchanged-policy-consumer.ts',
      kind: 'unresolved_module_edge',
    }));
  });

  it.each([
    ['reachable const referenced elsewhere', [
      'const shared = { resolve: { alias: {} } };',
      'consume(shared);',
      'export default shared;',
    ].join('\n')],
    ['reachable identifier initialized by a call', [
      'const shared = makeConfig();',
      'export default shared;',
    ].join('\n')],
    ['alias property outside the reachable set', [
      'const stray = { alias: {} };',
      'export default {};',
    ].join('\n')],
  ] as const)('fails Rule C for %s', (_label, configSource) => {
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
      "export default { resolve: { alias: [{ find: /^@policy$/, replacement: './src/vtt/heldout-evaluation.ts' }] } };",
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

  it('reports zero findings for the actual Vite and Vitest configs plus the actual src tree', () => {
    expect(Object.keys(actualSourceFiles)).toHaveLength(674);
    expect(actualTreeReport.checkedFiles).toBe(Object.keys(actualSourceFiles).length + 3);
    expect(actualTreeReport.astInspectedFiles).toBe(Object.keys(actualSourceFiles).length + 2);
    expect(actualTreeReport.findings).toEqual([]);
  });

  it('still reports an injected leak in configuration-reinspection mode', () => {
    expect(injectedActualTreeReport.astInspectedFiles)
      .toBe(Object.keys(injectedActualSourceFiles).length + 2);
    expect(injectedActualTreeReport.findings).toEqual([expect.objectContaining({
      path: 'src/ui/injected-heldout-leak.ts',
      kind: 'protocol_import',
    })]);
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
      'Vite plugin config hooks',
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
