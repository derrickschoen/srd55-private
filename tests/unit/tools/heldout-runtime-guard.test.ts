import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
import {
  discoverHeldoutRuntimeValueEdges,
  heldoutRuntimeNprocLimit,
  parseHeldoutWorkerReport,
} from '../../../tools/heldout-runtime-guard';
import { inspectHeldoutCandidateTree, inspectHeldoutLeakChanges } from '../../../tools/heldout-leak-check';

const bindings = {
  reserveDigests: ['0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'],
  resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
} as const;

function validWorkerReport(): unknown {
  return {
    protocol: 'heldout-runtime-v1',
    slice: 'F',
    completed: true,
    eligibleFiles: 1,
    astInspectedFiles: 1,
    configurationLoad: [{
      file: '<preflight>',
      kind: 'preflight',
      project: null,
      environment: 'isolation',
      status: 'loaded',
      errorClass: null,
      runtimeRoot: '/opt/node',
      runtimeVersion: 'v24.13.0',
    }],
    resolution: [{
      configuration: 'vite.config.mjs',
      project: null,
      environment: 'client',
      phase: 'resolve',
      conditions: ['browser'],
      seed: 'src/main.ts',
      specifier: './ordinary',
      importer: '<candidate>/src/main.ts',
      resolvedId: '<candidate>/src/ordinary.ts',
      source: 'graph',
      status: 'clean',
    }],
    seedAssignments: [{
      seed: 'src/main.ts',
      configuration: 'vite.config.mjs',
      project: null,
      environment: 'client',
    }],
    findings: [],
  };
}

describe('held-out runtime guard pure contracts', () => {
  it.each([
    [554, 2_048],
    [2_000, 3_024],
  ] as const)('derives a load-aware UID task ceiling from %i tasks', (tasks, expected) => {
    expect(heldoutRuntimeNprocLimit(tasks)).toBe(expected);
  });

  it.each([
    ['direct require', "require('#policy')", 'require', '#policy'],
    ['require alias', "const load=require;load('#policy')", 'require', '#policy'],
    ['constant concatenation', "import('#'+'policy')", 'dynamic_import', '#policy'],
    ['import-meta resolver', "import.meta.resolve('#policy')", 'import_meta_resolve', '#policy'],
    ['resolver alias', "const locate=import.meta.resolve;locate('#policy')", 'import_meta_resolve', '#policy'],
  ] as const)('retains the %s runtime value edge', (_label, source, kind, specifier) => {
    expect(discoverHeldoutRuntimeValueEdges('src/consumer.ts', source)).toContainEqual({ kind, specifier });
  });

  it('marks an aliased import.meta.glob call for fail-closed runtime handling', () => {
    expect(discoverHeldoutRuntimeValueEdges(
      'src/consumer.ts',
      "const glob=import.meta.glob;glob('./ordinary.ts')",
    )).toContainEqual({ kind: 'aliased_import_meta_glob', specifier: './ordinary.ts' });
  });

  it('keeps erased type-only edges out of runtime traversal', () => {
    expect(discoverHeldoutRuntimeValueEdges(
      'src/consumer.ts',
      "import type {Value} from './types';export type {Other} from './other-types';",
    )).toEqual([]);
  });

  it('accepts a complete, slice-matched worker report', () => {
    expect(parseHeldoutWorkerReport(validWorkerReport(), 'F')).toMatchObject({ completed: true, slice: 'F' });
  });

  it.each([
    ['wrong slice', { slice: 'B' }],
    ['missing completion', { completed: false }],
    ['malformed load row', { configurationLoad: [42] }],
    ['malformed resolution discriminant', { resolution: [{ status: 'made-up' }] }],
    ['malformed assignment row', { seedAssignments: [null] }],
    ['unknown top-level field', { extra: 'not-validated' }],
  ] as const)('rejects a %s response', (_label, replacement) => {
    const report = validWorkerReport();
    if (report === null || typeof report !== 'object') throw new TypeError('Invalid test report.');
    expect(() => parseHeldoutWorkerReport({ ...report, ...replacement }, 'F')).toThrow();
  });

  it('exempts both runtime guard implementation files in combined static candidate inspection', () => {
    const paths = ['tools/heldout-runtime-guard.ts', 'tools/heldout-runtime-guard-worker.mjs'];
    const report = inspectHeldoutLeakChanges(paths.map((path) => ({
      path,
      addedText: readFileSync(path, 'utf8'),
      sourceText: readFileSync(path, 'utf8'),
    })), 'F', bindings);

    expect(report.astInspectedFiles).toBe(2);
    expect(report.findings).toEqual([]);
  });

  it('applies retained Rule N inspection to an unchanged extended configuration', () => {
    const root = mkdtempSync(join(tmpdir(), 'heldout-static-candidate-'));
    try {
      mkdirSync(join(root, 'tools'));
      writeFileSync(join(root, 'vitest.config.mjs'),
        "export default {test:{projects:[{extends:'./tools/project.config.mjs'}]}};");
      writeFileSync(join(root, 'tools/project.config.mjs'), [
        "import {createRequire} from 'node:module';",
        'const box={load:createRequire(import.meta.url)};',
        'export default {};',
      ].join('\n'));
      const report = inspectHeldoutCandidateTree(root, 'F', bindings);

      expect(report.astInspectedFiles).toBe(2);
      expect(report.findings).toContainEqual(expect.objectContaining({
        path: 'tools/project.config.mjs',
        kind: 'loader_reference_escaped',
      }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
