// Category 6: run.ts CLI harness. run.ts is a top-level script (it calls
// `main(n)` at import time, driven by `process.argv[2]`), so this exercises
// it via dynamic import with a controlled argv, which is the closest thing
// to an "import-level test" for a script with no exported entry point.
// board is a genuine board run — a large N would be slow and noisy for a
// unit test, so we use the smallest legal N (3) purely to prove the script
// runs to completion without throwing.
//
// Each case calls vi.resetModules() first to defeat Vitest's module cache —
// otherwise the second import of './run.ts' would resolve to the
// already-evaluated module instead of re-running main(). (A query-string
// cache-busting import specifier was tried first but Vite's TS transform
// doesn't reliably recognize `import { type X, ... }` syntax once a query
// string is attached to the specifier — see the report for this finding.)
import { afterEach, describe, expect, it, vi } from 'vitest';

function setArgv2(v: string | undefined): void {
  if (v === undefined) {
    process.argv = process.argv.slice(0, 2);
  } else {
    process.argv = [...process.argv.slice(0, 2), v];
  }
}

async function runCli(argv2: string | undefined): Promise<void> {
  const original = process.argv.slice();
  setArgv2(argv2);
  vi.resetModules();
  try {
    await import('./run.ts');
  } finally {
    process.argv = original;
  }
}

describe('run.ts N validation (F20)', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  afterEach(() => {
    logSpy.mockClear();
  });

  it('throws for a non-numeric N', async () => {
    await expect(runCli('not-a-number')).rejects.toThrow(/N must be an integer >= 3/);
  });

  it('throws for N below the minimum (0)', async () => {
    await expect(runCli('0')).rejects.toThrow(/N must be an integer >= 3/);
  });

  it('throws for a negative N', async () => {
    await expect(runCli('-5')).rejects.toThrow(/N must be an integer >= 3/);
  });

  it('throws for N=2 (one below the documented floor)', async () => {
    await expect(runCli('2')).rejects.toThrow(/N must be an integer >= 3/);
  });

  it('does NOT throw for N=3 (the documented floor) and prints the board', async () => {
    await expect(runCli('3')).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalled();
    // Sanity: the board's own header text appears somewhere in the output.
    const allOutput = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(allOutput).toContain('DAMAGE DEALT');
  });

  it('defaults to N=2000 when no argv is supplied (does not throw)', async () => {
    await expect(runCli(undefined)).resolves.toBeUndefined();
  });
});
