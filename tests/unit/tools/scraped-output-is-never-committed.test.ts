import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  SCRAPE_OUTPUT_DIRNAME,
  SCRAPE_SENTINEL,
} from '../../../tools/scrape/provenance';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * The only two tracked files allowed to contain the sentinel, spelled out
 * longhand. A glob would let a third join them invisibly; written like this,
 * adding one is a diff a reviewer sees.
 *
 * - `provenance.ts` DEFINES it.
 * - `assert-dist-clean.mjs` must MATCH on it, and is plain `.mjs` run by bare
 *   node, so it cannot import the `.ts` module. That copy is checked for drift
 *   against the definition by both guard tests.
 *
 * Every other file that needs the value imports `SCRAPE_SENTINEL` — including
 * this one. Importing rather than restating is what keeps the list at two.
 */
const SENTINEL_ALLOWLIST: readonly string[] = [
  'tools/scrape/provenance.ts',
  'tools/assert-dist-clean.mjs',
];

function trackedFiles(): string[] {
  const stdout = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout.split('\0').filter((path) => path !== '');
}

function filesUnder(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...filesUnder(path));
    } else if (entry.isFile()) {
      found.push(path);
    }
  }
  return found;
}

/**
 * Scraped rules text is not free-licensed. D3: it "must never reach `dist/`, the
 * repository, an export, or a share link." `.gitignore` is the default that
 * keeps it out; this is the guard that proves it stayed out.
 *
 * Why `git ls-files` and not `git check-ignore`: demonstrated in a throwaway
 * repository before this was written. `git add -f scraped/spells.json` tracks the
 * file DESPITE the ignore rule, and from that moment `git check-ignore` exits 1
 * for it — a tracked file is never reported as ignored. So the tool that looks
 * like the right instrument goes quiet at exactly the moment the breach happens.
 * `git ls-files` enumerates what is actually tracked and cannot go quiet.
 *
 * Every assertion below names the offending paths. A guard that says only
 * "expected 3 to be 0" makes the reader re-derive the finding.
 */
describe('scraped output is never committed', () => {
  it('tracks nothing under the scraped output directory', () => {
    const tracked = trackedFiles();
    // Negative control, the same discipline as tools/assert-dist-clean.mjs: a
    // scan of zero files would pass every assertion below while proving nothing.
    expect(
      tracked.length,
      'git ls-files returned nothing, so this scan proves nothing',
    ).toBeGreaterThan(0);

    const offenders = tracked.filter(
      (path) =>
        path === SCRAPE_OUTPUT_DIRNAME ||
        path.startsWith(`${SCRAPE_OUTPUT_DIRNAME}/`),
    );
    expect(
      offenders,
      `these scraped files are tracked by git:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('tracks no path carrying the sentinel, wherever it was moved to', () => {
    // The path-only rule above is defeated by anything that moves a file out of
    // scraped/ — a stray `cp` or `mv` into src/data/, say. This one is not: the
    // sentinel rides in the filename, so it survives the move.
    const offenders = trackedFiles().filter(
      (path) => path.includes(SCRAPE_SENTINEL) && !SENTINEL_ALLOWLIST.includes(path),
    );
    expect(
      offenders,
      `these tracked paths are sentinel-named scraper output:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('tracks no file whose CONTENTS carry the sentinel, outside the allowlist', () => {
    const tracked = trackedFiles();
    expect(tracked.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const path of tracked) {
      if (SENTINEL_ALLOWLIST.includes(path)) {
        continue;
      }
      const absolute = join(repoRoot, path);
      if (!existsSync(absolute) || !statSync(absolute).isFile()) {
        continue;
      }
      // latin1 is a byte-faithful 1:1 mapping, so a binary file is searched
      // exactly rather than being mangled into replacement characters that could
      // hide an ASCII match straddling them.
      if (readFileSync(absolute, 'latin1').includes(SCRAPE_SENTINEL)) {
        offenders.push(path);
      }
    }
    expect(
      offenders,
      `these tracked files contain the sentinel:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('still carries the gitignore default and the allowlisted files exist', () => {
    const gitignore = readFileSync(join(repoRoot, '.gitignore'), 'utf8');
    expect(
      gitignore.split(/\r?\n/u).map((line) => line.trim()),
      '.gitignore no longer ignores the scraped output directory',
    ).toContain(`${SCRAPE_OUTPUT_DIRNAME}/`);

    // If an allowlisted path is deleted or renamed, the entry silently starts
    // exempting nothing — or worse, a future file at that path.
    for (const path of SENTINEL_ALLOWLIST) {
      expect(existsSync(join(repoRoot, path)), `${path} is allowlisted but absent`).toBe(
        true,
      );
    }
  });

  it('leaves no scraped artefact in dist/ when a build has run', () => {
    const dist = join(repoRoot, 'dist');
    if (!existsSync(dist)) {
      // Nothing to check, and saying so beats a vacuous pass. The build-chained
      // tools/assert-dist-clean.mjs covers the built case unconditionally.
      //
      // THAT DEFERRAL IS ONLY SOUND BECAUSE THE .mjs GUARD MATCHES FILENAMES.
      // It did not always: it tested contents only, so cached HTML — which
      // carries the sentinel nowhere but its name — sailed through a real build
      // while this test was skipping. In `test:all` (`npm run test && npm run
      // build`) vitest runs BEFORE the build, so on a clean checkout this
      // early return and that blind spot lined up and nothing caught the leak.
      // Both halves now check the name; keep it that way, or this return
      // becomes a hole again.
      return;
    }
    const files = filesUnder(dist);
    expect(files.length, 'dist/ exists but is empty').toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(repoRoot, file);
      if (
        rel.includes(SCRAPE_SENTINEL) ||
        readFileSync(file, 'latin1').includes(SCRAPE_SENTINEL)
      ) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      `these built files carry scraped provenance:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
