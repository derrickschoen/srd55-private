import { mkdtemp, readFile, writeFile } from '../../helpers/test-filesystem-promises';
import { mkdirSync } from '../../helpers/test-filesystem';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IMPORT_GRAPH_UNSUPPORTED_FORMS,
  baselineAncestorArguments,
  branchTestDiffArguments,
  buildImportGraph,
  compareBaselineOwnership,
  extractRelativeImportSpecifiers,
  inventoryGateErrors,
  inventoryBaseArguments,
  missingRequiredSpecPaths,
  parseBaseline,
  parseInventoryArguments,
  parseNameStatus,
  parsePlanManifest,
  uncontrolledProducerPaths,
  reverseTestClosure,
} from '../../../tools/d584-contract-inventory';

describe('D584.4 elevation contract inventory', () => {
  it('extracts the exact ten-file Slice 1 ownership boundary from the plan', async () => {
    const plan = await readFile(
      join(process.cwd(), '.tmp-plans/2026-09-08-elevation-tiers.md'),
      'utf8',
    );
    const manifest = parsePlanManifest(plan);
    expect(manifest.filter((path) => [
      'src/combat/elevation.ts',
      'src/combat/movement-speeds.ts',
      'tests/unit/combat/elevation.test.ts',
      'tests/unit/combat/movement-speeds.test.ts',
      'tests/types/elevation-vocabulary.type-test.ts',
      'tools/d584-contract-inventory.ts',
      'tools/d586-mutation-contract.ts',
      'tests/unit/tools/d584-contract-inventory.test.ts',
      'tests/unit/tools/d586-mutation-contract.test.ts',
      'tests/fixtures/d586-elevation-mutants.json',
    ].includes(path))).toHaveLength(10);
  });

  it('requires every CLI output and provenance input explicitly', () => {
    expect(parseInventoryArguments([
      '--base', 'abc', '--baseline', '/tmp/base.tsv',
      '--plan', 'plan.md', '--out', '/tmp/out.json',
      '--runtime-out', '/tmp/runtime.txt',
    ])).toEqual({
      base: 'abc', baseline: '/tmp/base.tsv', plan: 'plan.md',
      out: '/tmp/out.json', runtimeOut: '/tmp/runtime.txt',
    });
    expect(() => parseInventoryArguments(['--base', 'abc'])).toThrow(
      'Missing required --baseline value.',
    );
  });

  it('parses clean and dirty baselines without absorbing malformed rows', () => {
    expect(parseBaseline([
      '# d586-elevation-owned-baseline-v1',
      'base\tabc',
      'head\tdef',
      'status\tclean',
      '',
    ].join('\n'))).toEqual({ base: 'abc', head: 'def', status: 'clean', paths: [] });
    expect(parseBaseline([
      'base\tabc', 'head\tdef', 'status\tdirty',
      'path\tsrc/existing.ts\tM\tdeadbeef\tcafebabe',
    ].join('\n')).paths).toEqual([{
      path: 'src/existing.ts', status: 'M', indexBlob: 'deadbeef',
      worktreeSha256: 'cafebabe',
    }]);
    expect(() => parseBaseline('base\tabc\nhead\tdef\nstatus\tclean\npath\tx\tM\ta\tb'))
      .toThrow('Baseline clean/dirty status disagrees');
  });

  it('keeps committed status and rename destinations distinct', () => {
    expect(parseNameStatus('M\tsrc/a.ts\nR100\tsrc/old.ts\tsrc/new.ts\n'))
      .toEqual([
        { status: 'M', path: 'src/a.ts' },
        { status: 'R100', path: 'src/new.ts' },
      ]);
    expect(branchTestDiffArguments('abc123')).toEqual([
      'diff', '--name-status', 'abc123...HEAD', '--', 'tests',
    ]);
    expect(inventoryBaseArguments('main')).toEqual([
      'merge-base', 'main', 'HEAD',
    ]);
    expect(baselineAncestorArguments('dispatch-head')).toEqual([
      'merge-base', '--is-ancestor', 'dispatch-head', 'HEAD',
    ]);
  });

  it('S1-IMPORT-AST accepts every supported syntax form and rejects comment and string decoys', async () => {
    const root = await mkdtemp(join(tmpdir(), 'd584-import-syntax-'));
    const producer = 'export interface Value { readonly n: number }\nexport const value = 1;\n';
    const fixtures = {
      'producer.ts': producer,
      'import-declaration.ts': "import /* split */ { value } from /* split */ './producer'; void value;\n",
      'export-declaration.ts': "export /* split */ { value } from /* split */ './producer';\n",
      'import-equals.ts': "import Producer = require /* split */ ('./producer'); void Producer;\n",
      'import-type.ts': "export type Imported = import /* split */ ('./producer').Value;\n",
      'dynamic-import.ts': "void import /* split */ ('./producer');\n",
      'decoys.ts': [
        'const prose = \"import { value } from \'./producer\'\";',
        'const exportProse = \"export { value } from \'./producer\'\";',
        'const equalsProse = \"import Producer = require(\'./producer\')\";',
        'const typeProse = \"type Imported = import(\'./producer\').Value\";',
        'const dynamicProse = \"void import(\'./producer\')\";',
        "// export { value } from './producer';",
        "// import Producer = require('./producer');",
        "// type Imported = import('./producer').Value;",
        "/* void import('./producer'); */",
        "const specifier = './producer';",
        'void import(specifier);',
        'void import(`./producer`);',
        'void prose; void exportProse; void equalsProse; void typeProse; void dynamicProse;',
        '',
      ].join('\n'),
    } as const;
    await Promise.all(Object.entries(fixtures).map(([path, source]) =>
      writeFile(join(root, path), source),
    ));
    const graph = await buildImportGraph(root, Object.keys(fixtures));
    for (const consumer of [
      'import-declaration.ts',
      'export-declaration.ts',
      'import-equals.ts',
      'import-type.ts',
      'dynamic-import.ts',
    ]) {
      expect(graph.importsByConsumer[consumer]).toEqual(['producer.ts']);
    }
    expect(graph.importsByConsumer['decoys.ts']).toBeUndefined();
    expect(extractRelativeImportSpecifiers('decoys.ts', fixtures['decoys.ts'])).toEqual([]);
    expect(IMPORT_GRAPH_UNSUPPORTED_FORMS).toEqual([
      'computed dynamic-import specifiers',
      'template-literal dynamic-import specifiers',
    ]);
  });

  it('S1-TRANSITIVE-CONTROL accepts producer re-exports that reach a runtime test', async () => {
    const root = await mkdtemp(join(tmpdir(), 'd584-import-graph-'));
    await Promise.all([
      writeFile(join(root, 'producer.ts'), 'export const value = 1;\n'),
      writeFile(join(root, 'consumer.ts'), "import { value } from './producer'; export const next = value + 1;\n"),
      writeFile(join(root, 'dependency.ts'), 'export const unrelated = 2;\n'),
      writeFile(join(root, 'tests.test.ts'), "import { next } from './consumer'; import { unrelated } from './dependency'; void next; void unrelated;\n"),
    ]);
    const graph = await buildImportGraph(root, [
      'producer.ts', 'consumer.ts', 'dependency.ts', 'tests.test.ts',
    ]);
    expect(graph.importsByConsumer['consumer.ts']).toEqual(['producer.ts']);
    expect(reverseTestClosure(graph, ['producer.ts'])).toEqual([]);

    mkdirSync(join(root, 'tests'));
    await writeFile(join(root, 'tests', 'direct.test.ts'), "import { next } from '../consumer'; void next;\n");
    const expanded = await buildImportGraph(root, [
      'producer.ts', 'consumer.ts', 'dependency.ts', 'tests.test.ts',
      'tests/direct.test.ts',
    ]);
    expect(reverseTestClosure(expanded, ['producer.ts']))
      .toEqual(['tests/direct.test.ts']);
    expect(uncontrolledProducerPaths(
      expanded,
      ['producer.ts'],
      ['tests/direct.test.ts'],
      [],
    )).toEqual([]);
    expect(reverseTestClosure(expanded, ['dependency.ts'])).toEqual([]);
  });

  it('S1-BASELINE-COLLISION preserves committed provenance and rejects owned drift', () => {
    const worktreeSha = 'a'.repeat(64);
    const baseline = [
      { path: 'src/owned.ts', status: 'M', indexBlob: '1'.repeat(40), worktreeSha256: worktreeSha },
      { path: 'src/unrelated.ts', status: 'M', indexBlob: '2'.repeat(40), worktreeSha256: worktreeSha },
    ];
    const comparisons = compareBaselineOwnership(baseline, [
      {
        path: 'src/owned.ts',
        indexBlob: '3'.repeat(40),
        indexBlobSha256: worktreeSha,
        worktreeSha256: 'b'.repeat(64),
      },
      {
        path: 'src/unrelated.ts',
        indexBlob: '2'.repeat(40),
        indexBlobSha256: 'c'.repeat(64),
        worktreeSha256: 'b'.repeat(64),
      },
    ], ['src/owned.ts']);
    expect(comparisons.map(({ path, state }) => ({ path, state }))).toEqual([
      { path: 'src/owned.ts', state: 'owned_collision' },
      { path: 'src/unrelated.ts', state: 'excluded_drift' },
    ]);

    const committed = compareBaselineOwnership([baseline[0]!], [{
      path: 'src/owned.ts',
      indexBlob: '3'.repeat(40),
      indexBlobSha256: worktreeSha,
      worktreeSha256: worktreeSha,
    }], ['src/owned.ts']);
    expect(committed[0]?.state).toBe('stable');
    expect(inventoryGateErrors({
      baselineCollisions: ['src/owned.ts'],
      missingRequiredSpecs: [],
      uncontrolledProducers: [],
    })).toEqual(['Owned baseline paths changed after dispatch: src/owned.ts']);
  });

  it('S1-MISSING-REQUIRED-SPEC fails for missing and staged or unstaged deleted specs', () => {
    const missing = missingRequiredSpecPaths(
      ['tests/present.test.ts', 'tests/missing.test.ts'],
      ['tests/present.test.ts', 'tests/deleted.test.ts'],
      ['tests/deleted.test.ts'],
    );
    expect(missing).toEqual([
      'tests/deleted.test.ts',
      'tests/missing.test.ts',
    ]);
    expect(inventoryGateErrors({
      baselineCollisions: [],
      missingRequiredSpecs: missing,
      uncontrolledProducers: [],
    })).toEqual([
      'Required specs are missing or deleted: tests/deleted.test.ts, tests/missing.test.ts',
    ]);
  });
});
