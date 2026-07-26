import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SCRAPE_SENTINEL } from '../../../tools/scrape/provenance';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

async function typeScriptFilesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await typeScriptFilesUnder(path)));
    } else if (entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

/**
 * The scraper is a standalone local tool. It must not be reachable from any Vite
 * entry graph, and `npm run build` must not invoke it.
 *
 * The direction of the dependency is deliberate and one-way: `tools/scrape/*`
 * imports FROM `src/catalog` — it validates its own output with the app's real
 * `parseCatalogDocuments` and forms keys with the app's real `officialSpellKey`,
 * which is how it emits the existing format rather than a lookalike. Nothing goes
 * the other way. This test asserts the one-way-ness, because an import edge in
 * the wrong direction is how a dev-only subgraph ends up in a bundle.
 *
 * Same shape as tests/unit/db/drizzle-is-build-time-only.test.ts: a cheap
 * edit-time source scan here, and a byte scan of the shipped output in
 * tools/assert-dist-clean.mjs, which `npm run build` chains.
 */
describe('the scraper is never in the bundle', () => {
  it('is not imported from anywhere under src/', async () => {
    const files = await typeScriptFilesUnder(join(repoRoot, 'src'));
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const [index, line] of source.split('\n').entries()) {
        // Any reference at all, type-only included. A `import type` edge would
        // not bundle anything, but it would make `tools/` part of the app's
        // conceptual surface, and the next edit turns it into a value import.
        if (/['"][^'"]*tools\/scrape[^'"]*['"]/.test(line)) {
          offenders.push(
            `${file.slice(repoRoot.length)}:${index + 1}: ${line.trim()}`,
          );
        }
      }
    }
    expect(
      offenders,
      `these files under src/ reference the scraper:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('is not invoked by any npm script other than the explicit one', async () => {
    const manifest = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };

    const offenders = Object.entries(manifest.scripts)
      .filter(([name]) => name !== 'scrape')
      .filter(([, body]) => body.includes('tools/scrape'))
      .map(([name, body]) => `${name}: ${body}`);
    expect(
      offenders,
      `these npm scripts invoke the scraper:\n${offenders.join('\n')}`,
    ).toEqual([]);

    // The positive half: `build` still chains the byte scan that would catch a
    // leak. Asserting only the absence would pass just as happily if the guard
    // had been removed from the build.
    expect(manifest.scripts.build).toContain('tools/assert-dist-clean.mjs');
  });

  it('has its sentinel in the dist byte scan, with the two copies in step', async () => {
    const guard = await readFile(
      join(repoRoot, 'tools/assert-dist-clean.mjs'),
      'utf8',
    );
    // The literal must be in the FORBIDDEN array, not merely somewhere in the
    // file — a mention in a comment would satisfy a naive `toContain`.
    const forbidden = /const FORBIDDEN = \[([\s\S]*?)\];/u.exec(guard);
    expect(forbidden, 'FORBIDDEN array not found in assert-dist-clean.mjs').not.toBe(
      null,
    );
    expect(
      (forbidden?.[1] ?? '').includes(`'${SCRAPE_SENTINEL}'`),
      'assert-dist-clean.mjs no longer forbids the scrape sentinel, so a ' +
        'scraped file dropped into public/ would ship',
    ).toBe(true);
  });

  it('reaches the network from exactly one module', async () => {
    const files = await typeScriptFilesUnder(join(repoRoot, 'tools/scrape'));
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const relativePath = file.slice(repoRoot.length);
      if (relativePath === 'tools/scrape/fetcher.ts') {
        continue;
      }
      const source = await readFile(file, 'utf8');
      for (const [index, line] of source.split('\n').entries()) {
        if (/\bfetch\s*\(/.test(line) || /node:https?\b/.test(line)) {
          offenders.push(`${relativePath}:${index + 1}: ${line.trim()}`);
        }
      }
    }
    // Everything goes through PoliteFetcher, so robots.txt, the rate limit and
    // the cache cannot be bypassed by a second code path that forgot them.
    expect(
      offenders,
      `these modules bypass PoliteFetcher:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
