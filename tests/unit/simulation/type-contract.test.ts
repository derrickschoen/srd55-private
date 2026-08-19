import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const PROBE = 'docs/type-probes/dpr-simulation.probe.ts';

describe('DPR contracts reject interchangeable brands at compile time', () => {
  it('reports one diagnostic on every deliberately invalid statement', () => {
    const expectedLines = readFileSync(`${PROJECT_ROOT}${PROBE}`, 'utf8')
      .split('\n')
      .map((line, index) => ({ line, number: index + 1 }))
      .filter((entry) => entry.line.startsWith('export const '))
      .map((entry) => entry.number);
    expect(expectedLines.length).toBeGreaterThanOrEqual(12);

    let output = '';
    let stderr = '';
    try {
      execFileSync(
        execPath,
        [
          fileURLToPath(
            new URL('../../../node_modules/typescript/bin/tsc', import.meta.url),
          ),
          '--noEmit',
          '--strict',
          '--target',
          'ES2022',
          '--lib',
          'ES2022,DOM,WebWorker',
          '--module',
          'ESNext',
          '--moduleResolution',
          'Bundler',
          '--skipLibCheck',
          '--noUncheckedIndexedAccess',
          '--exactOptionalPropertyTypes',
          '--verbatimModuleSyntax',
          '--isolatedModules',
          '--moduleDetection',
          'force',
          'src/vite-env.d.ts',
          PROBE,
        ],
        { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'pipe' },
      );
    } catch (error: unknown) {
      const failure = error as { stdout?: string; stderr?: string };
      output = failure.stdout ?? '';
      stderr = failure.stderr ?? '';
    }
    expect(output, `probe compiled or tsc failed:\n${stderr}`).not.toBe('');
    expect(output).not.toContain('error TS2307');

    const unrelated = output
      .split('\n')
      .filter(
        (line) =>
          line.includes('error TS') &&
          !line.includes('dpr-simulation.probe.ts'),
      );
    expect(unrelated, stderr).toEqual([]);

    const actualLines = new Set(
      [...output.matchAll(/dpr-simulation\.probe\.ts\((?<line>\d+),\d+\): error/gu)]
        .map((match) => Number(match.groups?.line)),
    );
    expect([...actualLines].sort((left, right) => left - right)).toEqual(
      expectedLines,
    );
  }, 60_000);
});
