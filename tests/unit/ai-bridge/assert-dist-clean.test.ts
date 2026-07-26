/**
 * A guard that has never been seen to fail is not a guard. These run the real
 * `tools/assert-dist-clean.mjs` against synthetic output directories and check
 * that it exits non-zero for each way the bridge could leak — and for the case
 * where the scan is pointed somewhere that proves nothing.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scanner = fileURLToPath(
  new URL('../../../tools/assert-dist-clean.mjs', import.meta.url),
);

const made: string[] = [];

afterEach(() => {
  while (made.length > 0) {
    const dir = made.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function distWith(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'assert-dist-clean-'));
  made.push(root);
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

function scan(root: string): Promise<Run> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [scanner, root],
      (error, stdout, stderr) => {
        const code =
          error === null
            ? 0
            : typeof (error as { code?: unknown }).code === 'number'
              ? ((error as { code: number }).code)
              : 1;
        resolve({ code, stdout, stderr });
      },
    );
  });
}

// A minimal stand-in for a real bundle: it contains the negative control and
// nothing forbidden.
const CLEAN = 'window.staticApp = {};\nconsole.log("hello");\n';

describe('the dist guard passes only a genuinely clean build', () => {
  it('passes and says how much it read', async () => {
    const run = await scan(distWith({ 'assets/index.js': CLEAN }));
    expect(run.code).toBe(0);
    expect(run.stdout).toContain('control OK');
  });

  it('reads nested directories, not just the top level', async () => {
    const run = await scan(
      distWith({
        'index.html': CLEAN,
        'assets/deep/nested/chunk.js': 'nothing to see',
      }),
    );
    expect(run.code).toBe(0);
    expect(run.stdout).toContain('2 files scanned');
  });
});

describe('the dist guard FAILS on every way the bridge could leak', () => {
  const leaks: Record<string, string> = {
    'the browser sentinel': 'var x="AI_BRIDGE_SENTINEL";',
    'the route prefix': 'fetch("/__ai/chat")',
    'the admission header': 'h["x-ai-bridge-token"]=t',
    'the spawn import': 'require("child_process")',
  };

  for (const [what, leaked] of Object.entries(leaks)) {
    it(`rejects ${what}`, async () => {
      const run = await scan(
        distWith({ 'assets/index.js': `${CLEAN}\n${leaked}` }),
      );
      expect(run.code).toBe(1);
      expect(run.stderr).toContain('leaked into the build output');
    });
  }

  it('finds a leak in a minified single line and in a nested chunk', async () => {
    const run = await scan(
      distWith({
        'index.html': CLEAN,
        'assets/x/y/worker.js': 'a=1;b=2;c="/__ai/chat";d=3;',
      }),
    );
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('/__ai/');
  });
});

describe('the dist guard refuses to pass vacuously', () => {
  it('fails when the negative control is absent, rather than reporting clean', async () => {
    const run = await scan(distWith({ 'assets/index.js': 'nothing at all' }));
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('proves nothing');
  });

  it('fails on a missing directory and on an empty one', async () => {
    const missing = await scan(join(tmpdir(), 'assert-dist-clean-nope-xyzzy'));
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain('does not exist');

    const empty = mkdtempSync(join(tmpdir(), 'assert-dist-clean-empty-'));
    made.push(empty);
    const run = await scan(empty);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('is empty');
  });
});
