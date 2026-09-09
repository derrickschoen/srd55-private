import { describe, expect, it } from 'vitest';
import { inspectHeldoutLeakChanges } from '../../../tools/heldout-leak-check';

describe('held-out reserve leak wall', () => {
  const reserveDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const bindings = {
    reserveDigests: [reserveDigest],
    resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
  } as const;

  it.each([
    ['src/vtt/intel/opportunity-cost.ts', 'const roomSeed = 7_860_001;', 'ranking'],
    ['tools/ai-dm-system-prompt.ts', 'Use heldout-ordinary-v1 outcomes.', 'prompt'],
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

  it.each([
    "import type { HeldoutSlice } from '../vtt/heldout-evaluation';",
    "const protocol = await import('../vtt/heldout-evaluation');",
  ])('rejects static and dynamic protocol import %s outside evaluation tooling and tests', (addedText) => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/ui/repair-ranking.ts',
      addedText,
    }], 'B', bindings);

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
  });

  it('allows a tuning-only repair with no reserve identity or result', () => {
    const report = inspectHeldoutLeakChanges([{
      path: 'src/vtt/intel/opportunity-cost.ts',
      addedText: 'const remainingHitPointsWeight = 2;',
    }, {
      path: 'tests/fixtures/tuning/repair-a.json',
      addedText: '{"protocol":"heldout-development-v1","seed":7850001}',
    }], 'A', bindings);

    expect(report).toMatchObject({ checkedFiles: 2, findings: [] });
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
