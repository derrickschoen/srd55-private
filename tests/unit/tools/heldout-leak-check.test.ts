import { describe, expect, it } from 'vitest';
import {
  inspectHeldoutLeakChanges,
  moduleSpecifiers,
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
