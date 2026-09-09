import { mkdtemp, readFile, writeFile } from '../../helpers/test-filesystem-promises';
import { mkdirSync } from '../../helpers/test-filesystem';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildImportGraph,
  parseBaseline,
  parseInventoryArguments,
  parseNameStatus,
  parsePlanManifest,
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
  });

  it('follows producer-to-consumer imports transitively without widening through dependencies', async () => {
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
  });
});
