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

import { SCRAPE_SENTINEL } from '../../../tools/scrape/provenance';
import {
  appShellCacheName,
  appShellUrl,
  serviceWorkerSource,
  type BuildAsset,
} from '../../../tools/pwa/service-worker';

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
  const complete: Record<string, string> = {
    'manifest.webmanifest': '{"name":"Test"}',
    'icons/app-icon.svg': '<svg/>',
    'icons/app-icon-192.png': 'png-192',
    'icons/app-icon-512.png': 'png-512',
    ...files,
  };
  complete['index.html'] =
    `${complete['index.html'] ?? ''}\n` +
    '<link rel="manifest" href="./manifest.webmanifest" />';
  const assets: BuildAsset[] = Object.entries(complete).map(
    ([fileName, source]) => ({ fileName, source }),
  );
  complete['service-worker.js'] = serviceWorkerSource(
    appShellCacheName(assets),
    ['./', ...assets.map((asset) => appShellUrl(asset.fileName))],
  );
  for (const [name, content] of Object.entries(complete)) {
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
const CLEAN =
  'window.staticApp = {};\n' +
  'const migration="migration-bundle-control:0000";\n' +
  'console.log("hello");\n';

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
    expect(run.stdout).toContain('7 files scanned');
  });

  it('fails when the PWA shell bytes no longer match the cache version', async () => {
    const root = distWith({ 'assets/index.js': CLEAN });
    writeFileSync(join(root, 'assets/index.js'), `${CLEAN}\nchanged`);

    const run = await scan(root);

    expect(run.code).toBe(1);
    expect(run.stderr).toContain('cache name is not the version');
  });

  it('fails when a required install artifact is missing', async () => {
    const root = distWith({ 'assets/index.js': CLEAN });
    rmSync(join(root, 'manifest.webmanifest'));

    const run = await scan(root);

    expect(run.code).toBe(1);
    expect(run.stderr).toContain(
      'required build artifact "manifest.webmanifest" is missing',
    );
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

  it('rejects the token meta tag the plugin injects into HTML', async () => {
    // A regression test, not a hypothetical. The scan previously forbade only
    // `x-ai-bridge-token`, which is NOT a substring of the meta tag below, so
    // this exact index.html — carrying a live per-session secret — was reported
    // "dist clean". That tag is the plugin's only build-reachable side effect,
    // and it is HTML rather than a JS module, which is how it was missed.
    const run = await scan(
      distWith({
        'index.html':
          '<meta name="ai-bridge-token" content="' +
          '4558de1d786d28b201324d1b8ed061fc9963fec036a91f8db1757379266d6c66">',
        'assets/index.js': CLEAN,
      }),
    );
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('ai-bridge-token');
    expect(run.stderr).toContain('index.html');
  });

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

  it('catches scraped content whose ONLY stamp is its filename', async () => {
    // The leak this closes was real and measured: copying one cached page into
    // public/ and running `npm run build` printed "dist clean: 10 files scanned,
    // control OK" and exited 0 while shipping real scraped rules text in dist/.
    // The scan matched contents only, and cached HTML — 84 of the 88 files the
    // scraper writes — carries the sentinel nowhere but its name, because
    // provenance.ts states it has nowhere else to put it without corrupting the
    // bytes the parser reads. The file body here is deliberately innocuous: if
    // the guard only reads contents, this passes.
    //
    // The sentinel is IMPORTED rather than written out, so this file stays off
    // the two-file allowlist in
    // tests/unit/tools/scraped-output-is-never-committed.test.ts. Spelling it
    // literally here made that guard fail — correctly; it exists to make any
    // widening of the allowlist a visible diff, and it caught this one.
    const run = await scan(
      distWith({
        'index.html': CLEAN,
        [`a1b2c3.${SCRAPE_SENTINEL}.html`]:
          '<html><body><p>Casting Time: Action</p></body></html>',
      }),
    );
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('FILENAME');
    expect(run.stderr).toContain(SCRAPE_SENTINEL);
  });

  it('still distinguishes a contents leak from a filename leak when it reports', async () => {
    // Guards against "fix" the filename check by simply always claiming the
    // filename: a body-only leak must still be reported as a contents leak.
    const run = await scan(
      distWith({
        'index.html': CLEAN,
        'assets/data.json': `{"_provenance":"${SCRAPE_SENTINEL}"}`,
      }),
    );
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('the contents of');
    expect(run.stderr).not.toContain('FILENAME');
  });
});

describe('the dist guard refuses to pass vacuously', () => {
  it('fails when the negative control is absent, rather than reporting clean', async () => {
    const run = await scan(distWith({ 'assets/index.js': 'nothing at all' }));
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('proves nothing');
  });

  it('fails when the embedded migration SQL control is absent', async () => {
    const run = await scan(
      distWith({ 'assets/index.js': 'window.staticApp = {};' }),
    );
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('migration SQL was not bundled');
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
