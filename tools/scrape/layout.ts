/**
 * Where the scraper's files go. One module, so there is one answer.
 *
 * `scraped/` is gitignored, but that is the DEFAULT, not the guard: `git add -f`
 * defeats a gitignore entry, and `git check-ignore` then stops reporting the
 * file at all, because a tracked file is never "ignored". The guard is
 * `tests/unit/tools/scraped-output-is-never-committed.test.ts`, which asks
 * `git ls-files` what is actually tracked and matches on the sentinel that every
 * name below carries.
 */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCRAPE_OUTPUT_DIRNAME, stampScrapedFilename } from './provenance';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export interface ScrapeLayout {
  readonly root: string;
  readonly cacheDir: string;
  readonly outDir: string;
  readonly queuePath: string;
  /** Tier 1: the catalog document `catalog.import` consumes as `documents`. */
  readonly tier1Path: string;
  /** Tier 2: body text, passed as `textDocuments`. Never merged into Tier 1. */
  readonly tier2Path: string;
  readonly reportPath: string;
}

export function scrapeLayout(
  root: string = join(repoRoot, SCRAPE_OUTPUT_DIRNAME),
  slice = 'spells',
): ScrapeLayout {
  const outDir = join(root, 'out');
  return {
    root,
    cacheDir: join(root, 'cache'),
    outDir,
    queuePath: join(root, stampScrapedFilename(`queue.${slice}.json`)),
    tier1Path: join(outDir, stampScrapedFilename(`${slice}.tier1.json`)),
    tier2Path: join(outDir, stampScrapedFilename(`${slice}.tier2.json`)),
    reportPath: join(outDir, stampScrapedFilename(`${slice}.report.json`)),
  };
}
