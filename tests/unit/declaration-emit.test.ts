import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from '../helpers/test-filesystem';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execPath } from 'node:process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TSC = fileURLToPath(
  new URL('../../node_modules/typescript/bin/tsc', import.meta.url),
);
const PROBE_PROJECT = 'tests/fixtures/compiler-probe/tsconfig.json';
const NEGATIVE_PROBES = [
  'docs/type-probes/homebrew-unions.probe.ts',
  'docs/type-probes/homebrew-effect-registry.probe.ts',
  'docs/type-probes/party-pack-prevention.probe.ts',
] as const;

interface CompilerProbeResult {
  readonly diagnostics: string;
  readonly emittedDeclarations: number;
  readonly error: Error | undefined;
  readonly signal: NodeJS.Signals | null;
  readonly status: number | null;
}

function declarationCount(directory: string): number {
  return readdirSync(directory, { withFileTypes: true }).reduce(
    (count, entry) =>
      count +
      (entry.isDirectory()
        ? declarationCount(join(directory, entry.name))
        : Number(entry.name.endsWith('.d.ts'))),
    0,
  );
}

function expectedNegativeDiagnosticLocations(): string[] {
  return NEGATIVE_PROBES.flatMap((probe) =>
    readFileSync(`${PROJECT_ROOT}/${probe}`, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        /^export const /u.test(line) ? [`${probe}:${String(index + 1)}`] : [],
      ),
  ).sort();
}

function diagnosticLocations(diagnostics: string): string[] {
  return [
    ...diagnostics.matchAll(
      /^(?<file>[^\n(]+)\((?<line>\d+),\d+\): error/gmu,
    ),
  ]
    .map(
      (match) => `${String(match.groups?.file)}:${String(match.groups?.line)}`,
    )
    .sort();
}

/**
 * `tsc -b` and Vite can consume inferred types that TypeScript cannot name in
 * an emitted declaration. Keep a real declaration emit in the default suite so
 * an exported value cannot quietly expose a module-private symbol or type.
 */
describe('the app has an emit-safe public type surface', () => {
  const outputDirectory = mkdtempSync(
    join(tmpdir(), 'dnd-app-compiler-probe-'),
  );
  let compilerResult: CompilerProbeResult | undefined;

  beforeAll(() => {
    const result = spawnSync(
      execPath,
      [
        TSC,
        '--outDir',
        outputDirectory,
        '-p',
        PROBE_PROJECT,
      ],
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    compilerResult = {
      diagnostics: `${result.stdout}${result.stderr}`,
      emittedDeclarations: declarationCount(outputDirectory),
      error: result.error,
      signal: result.signal,
      status: result.status,
    };
  }, 60_000);

  afterAll(() => {
    rmSync(outputDirectory, { recursive: true });
  });

  function result(): CompilerProbeResult {
    if (compilerResult === undefined) {
      throw new Error('The shared compiler probe did not run.');
    }
    return compilerResult;
  }

  it('emits declarations for the public application surface', () => {
    const compiled = result();

    const remedy =
      'Declaration emit failed. Export every symbol and type referenced by ' +
      'an exported inferred type; do not weaken brands or suppress the error.';

    expect(compiled.error, `${remedy}\n${compiled.diagnostics}`).toBeUndefined();
    expect(compiled.signal, `${remedy}\n${compiled.diagnostics}`).toBeNull();
    const allowedDiagnostics = new Set(expectedNegativeDiagnosticLocations());
    expect(
      diagnosticLocations(compiled.diagnostics).filter(
        (location) => !allowedDiagnostics.has(location),
      ),
      `${remedy}\n${compiled.diagnostics}`,
    ).toEqual([]);
    expect(
      compiled.emittedDeclarations,
      'Declaration emit produced no useful output; check tsconfig.app.json.',
    ).toBeGreaterThan(100);
  });

  it('rejects every closed-union and registry probe', () => {
    const compiled = result();
    const expectedDiagnostics = expectedNegativeDiagnosticLocations();
    const negativeProbeNames = NEGATIVE_PROBES.map((probe) => `${probe}:`);
    const actualDiagnostics = diagnosticLocations(compiled.diagnostics).filter(
      (location) => negativeProbeNames.some((probe) => location.startsWith(probe)),
    );

    expect(compiled.status, compiled.diagnostics).not.toBe(0);
    expect(compiled.diagnostics).not.toContain('error TS2307');
    expect(actualDiagnostics, compiled.diagnostics).toEqual(expectedDiagnostics);
  });
});
