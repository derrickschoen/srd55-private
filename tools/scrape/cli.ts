/**
 * The scraper's command line. THE ONLY module here that touches the network.
 *
 * It is never invoked by `npm run build`, and nothing under `src/` imports
 * anything in this directory — both facts are asserted by
 * `tests/unit/tools/scraper-is-never-in-the-bundle.test.ts` rather than left to
 * convention, the same way the drizzle boundary is.
 *
 *   npx vite-node tools/scrape/cli.ts -- fetch --namespace spell
 *   npx vite-node tools/scrape/cli.ts -- build [--list bard] [--allow-partial]
 *
 * `--list` is a BUILD flag, not a fetch one, and it makes the build partial: it
 * narrows which parsed pages are emitted, and an import is a full replacement,
 * so everything it filters out would be deactivated. It therefore requires
 * `--allow-partial`. See the completeness-gate note in build-catalog.ts.
 *
 * `fetch` only fills the cache; `build` only reads it. Splitting them is the
 * biggest politeness win available: a parser bug costs zero further requests to
 * fix, because the pages are already on disk.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { PageCache } from './cache';
import { buildCatalogDocuments, BuildRefused, type BuildFailure, type BuiltPage } from './build-catalog';
import {
  buildFeatDocuments,
  FeatBuildRefused,
  type BuiltFeatPage,
  type FeatBuildFailure,
} from './build-feat-catalog';
import {
  DEFAULT_DELAY_MS,
  httpTransport,
  PoliteFetcher,
  RateLimitAbort,
  SITEMAP_MAX_AGE_MS,
  USER_AGENT,
} from './fetcher';
import { scrapeLayout } from './layout';
import { parseFeatPage } from './parse-feat';
import { parseSpellPage } from './parse-spell';
import { CrawlQueue } from './queue';
import { inNamespace, pageName, parseSitemap } from './sitemap';
import type { RulesEdition } from '../../src/domain/enums';

/**
 * The namespaces `build` knows how to turn into documents, and which parser
 * handles each. `fetch` needs none of this — `commandFetch` below is already
 * generic over `--namespace`, since all it does is filter the sitemap and fill
 * the cache; it took zero code changes to fetch `feat:` pages (verified live,
 * 2026-08-13: `fetch --namespace feat --limit 3` filtered 177 sitemap entries
 * and cached three pages through the existing robots/rate-limit/cache path).
 * Only `build` is namespace-specific, because only `build` picks a parser.
 */
const BUILD_NAMESPACES = ['spell', 'feat'] as const;
type BuildNamespace = (typeof BUILD_NAMESPACES)[number];

function isBuildNamespace(value: string): value is BuildNamespace {
  return (BUILD_NAMESPACES as readonly string[]).includes(value);
}

const ORIGIN = 'http://dnd2024.wikidot.com';
const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;
const EDITION: RulesEdition = '2024';

interface Options {
  readonly command: string;
  readonly namespace: string;
  readonly list: string | null;
  readonly delayMs: number;
  readonly maxAgeMs: number;
  readonly offline: boolean;
  readonly allowPartial: boolean;
  readonly limit: number | null;
}

function parseArgs(argv: readonly string[]): Options {
  const [command = 'help', ...rest] = argv;
  const flags = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index] as string;
    if (!token.startsWith('--')) {
      continue;
    }
    const eq = token.indexOf('=');
    if (eq >= 0) {
      flags.set(token.slice(2, eq), token.slice(eq + 1));
    } else {
      const next = rest[index + 1];
      if (next === undefined || next.startsWith('--')) {
        flags.set(token.slice(2), 'true');
      } else {
        flags.set(token.slice(2), next);
        index += 1;
      }
    }
  }
  const number = (key: string, fallback: number): number => {
    const raw = flags.get(key);
    if (raw === undefined) {
      return fallback;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new Error(`--${key} must be a number, got "${raw}".`);
    }
    return value;
  };
  return {
    command,
    namespace: flags.get('namespace') ?? 'spell',
    list: flags.get('list') ?? null,
    // NOTE: there is no flag that goes below the floor. `--delay 10` is clamped
    // to MIN_DELAY_MS inside PoliteFetcher and the clamp is reported.
    delayMs: number('delay', DEFAULT_DELAY_MS),
    maxAgeMs: number('max-age-days', 30) * 24 * 60 * 60 * 1000,
    offline: flags.get('offline') === 'true',
    allowPartial: flags.get('allow-partial') === 'true',
    limit: flags.has('limit') ? number('limit', 0) : null,
  };
}

function log(line: string): void {
  process.stdout.write(`${line}\n`);
}

async function commandFetch(options: Options): Promise<number> {
  const layout = scrapeLayout(undefined, options.namespace);
  await mkdir(layout.cacheDir, { recursive: true });

  const fetcher = new PoliteFetcher({
    transport: httpTransport,
    cache: new PageCache(layout.cacheDir),
    delayMs: options.delayMs,
    maxAgeMs: options.maxAgeMs,
    offline: options.offline,
    log,
  });

  log(`user-agent: ${USER_AGENT}`);
  const robots = await fetcher.loadRobots(ORIGIN);
  log(
    `robots.txt: ${robots.groups.length} group(s), ` +
      `${robots.sitemaps.length} sitemap(s); delay ${fetcher.delayMs}ms`,
  );

  const queue = new CrawlQueue(layout.queuePath);
  await queue.load();

  const sitemap = await fetcher.fetchPage(SITEMAP_URL, {
    maxAgeMs: SITEMAP_MAX_AGE_MS,
  });
  if (sitemap.kind === 'robots-skipped') {
    log(`robots.txt disallows the sitemap itself — nothing to do. ${sitemap.reason}`);
    return 0;
  }
  if (sitemap.kind === 'failed') {
    log(`could not read the sitemap: ${sitemap.reason}`);
    return 1;
  }
  const entries = inNamespace(parseSitemap(sitemap.body), options.namespace);
  log(`sitemap: ${entries.length} page(s) in namespace "${options.namespace}"`);

  const selected =
    options.limit === null ? entries : entries.slice(0, options.limit);
  queue.seed(selected);
  await queue.save();

  let processed = 0;
  try {
    for (const item of queue.pending()) {
      const outcome = await fetcher.fetchPage(item.url, {
        sitemapLastmod: item.lastmod,
      });
      processed += 1;
      if (outcome.kind === 'robots-skipped') {
        queue.mark(item.url, 'robots-skipped', outcome.reason);
      } else if (outcome.kind === 'failed') {
        log(`FAIL ${item.url} — ${outcome.reason}`);
        queue.mark(item.url, 'failed', outcome.reason);
      } else {
        queue.mark(item.url, 'done', null);
        if (processed % 25 === 0) {
          log(`… ${processed}/${queue.items.length}`);
        }
      }
      await queue.save();
    }
  } catch (error) {
    await queue.save();
    if (error instanceof RateLimitAbort) {
      log(`ABORTED: ${error.message}`);
      return 2;
    }
    throw error;
  }

  const counts = queue.counts();
  log(
    `fetch done: ${counts.done} cached, ${counts.failed} failed, ` +
      `${counts['robots-skipped']} skipped by robots.txt, ` +
      `${counts.pending} pending; ${fetcher.requestCount} network request(s)`,
  );
  for (const skip of fetcher.robotsSkips) {
    log(`  robots.txt skip: ${skip.url} — ${skip.reason}`);
  }
  return 0;
}

async function commandBuildSpells(options: Options): Promise<number> {
  const layout = scrapeLayout(undefined, options.namespace);
  const queue = new CrawlQueue(layout.queuePath);
  if (!(await queue.load())) {
    log(`no queue at ${layout.queuePath} — run "fetch" first.`);
    return 1;
  }
  const cache = new PageCache(layout.cacheDir);

  const pages: BuiltPage[] = [];
  const parseFailures: BuildFailure[] = [];
  let filteredOut = 0;
  for (const item of queue.items) {
    if (item.state !== 'done') {
      continue;
    }
    const entry = await cache.read(item.url);
    if (entry === null) {
      parseFailures.push({ url: item.url, reason: 'cache entry missing' });
      continue;
    }
    const slug = pageName(item.url) ?? item.url;
    const parsed = parseSpellPage(entry.body, { edition: EDITION, slug });
    if (!parsed.ok) {
      parseFailures.push({ url: item.url, reason: parsed.reason });
      continue;
    }
    const record = parsed.value.record;
    if (options.list !== null) {
      const wanted = options.list.toLowerCase();
      if (!record.spellLists.some((entry_) => entry_.toLowerCase() === wanted)) {
        // COUNTED, not silently dropped. This count is what makes the build
        // declare itself partial; a filtered-out spell and a never-fetched one
        // are the same absent key to the importer, and both get tombstoned.
        filteredOut += 1;
        continue;
      }
    }
    pages.push({
      url: item.url,
      record,
      description: parsed.value.description,
    });
  }

  let output;
  try {
    output = buildCatalogDocuments({
      pages,
      queue: queue.items,
      parseFailures,
      allowPartial: options.allowPartial,
      // A `--list` filter narrows the OUTPUT, and a narrowed output is a partial
      // one — see the completeness-gate note in build-catalog.ts. Passing the
      // drop count rather than merely the flag keeps `--list` on a list that
      // happens to match everything from being reported as partial.
      ...(options.list === null
        ? {}
        : { filtered: { list: options.list, dropped: filteredOut } }),
    });
  } catch (error) {
    if (error instanceof BuildRefused) {
      log(`build refused.\n${error.message}`);
      return 1;
    }
    throw error;
  }

  await mkdir(layout.outDir, { recursive: true });
  await writeFile(layout.tier1Path, `${output.tier1}\n`, 'utf8');
  await writeFile(layout.tier2Path, `${output.tier2}\n`, 'utf8');
  await writeFile(
    layout.reportPath,
    `${JSON.stringify(output.report, null, 2)}\n`,
    'utf8',
  );
  log(`wrote ${output.report.recordCount} record(s):`);
  log(`  Tier 1  ${layout.tier1Path}`);
  log(`  Tier 2  ${layout.tier2Path}`);
  log(`  report  ${layout.reportPath}`);
  if (output.report.partial) {
    log('  NOTE: partial run. Importing this file would deactivate every');
    log('        previously imported spell that is missing from it.');
    const { filtered } = output.report;
    if (filtered !== null) {
      log(
        `        --list ${filtered.list} dropped ${filtered.dropped} parsed ` +
          'page(s) from this file.',
      );
    }
  }
  return 0;
}

/**
 * `--list` filters on `spellLists`, a field `ParsedFeatDocument` does not
 * have — feats have no spell-list equivalent to filter on — so it is refused
 * outright here rather than silently ignored. Silently ignoring it would let
 * `build --namespace feat --list bard` look like it did something.
 */
async function commandBuildFeats(options: Options): Promise<number> {
  if (options.list !== null) {
    log('--list has no meaning for --namespace feat (feats carry no spell list).');
    return 1;
  }
  const layout = scrapeLayout(undefined, options.namespace);
  const queue = new CrawlQueue(layout.queuePath);
  if (!(await queue.load())) {
    log(`no queue at ${layout.queuePath} — run "fetch" first.`);
    return 1;
  }
  const cache = new PageCache(layout.cacheDir);

  const pages: BuiltFeatPage[] = [];
  const parseFailures: FeatBuildFailure[] = [];
  for (const item of queue.items) {
    if (item.state !== 'done') {
      continue;
    }
    const entry = await cache.read(item.url);
    if (entry === null) {
      parseFailures.push({ url: item.url, reason: 'cache entry missing' });
      continue;
    }
    const slug = pageName(item.url) ?? item.url;
    const parsed = parseFeatPage(entry.body, { edition: EDITION, slug });
    if (!parsed.ok) {
      parseFailures.push({ url: item.url, reason: parsed.reason });
      continue;
    }
    pages.push({
      url: item.url,
      document: parsed.value.document,
      description: parsed.value.description,
    });
  }

  let output;
  try {
    output = buildFeatDocuments({
      pages,
      queue: queue.items,
      parseFailures,
      allowPartial: options.allowPartial,
    });
  } catch (error) {
    if (error instanceof FeatBuildRefused) {
      log(`build refused.\n${error.message}`);
      return 1;
    }
    throw error;
  }

  await mkdir(layout.outDir, { recursive: true });
  await writeFile(layout.tier1Path, `${output.tier1}\n`, 'utf8');
  await writeFile(layout.tier2Path, `${output.tier2}\n`, 'utf8');
  await writeFile(
    layout.reportPath,
    `${JSON.stringify(output.report, null, 2)}\n`,
    'utf8',
  );
  log(`wrote ${output.report.recordCount} record(s):`);
  log(`  Tier 1  ${layout.tier1Path}`);
  log(`  Tier 2  ${layout.tier2Path}`);
  log(`  report  ${layout.reportPath}`);
  // UNWIRED, NOT MERELY UNFINISHED — see build-feat-catalog.ts's file comment.
  // There is no importer for this shape yet, so "partial" here only ever means
  // "the crawl or the parse was incomplete", never "importing this would
  // deactivate something", because nothing imports it.
  log('  NOTE: this document shape has no import path yet (see');
  log('        tools/scrape/build-feat-catalog.ts for what is missing).');
  if (output.report.partial) {
    log('  NOTE: partial run — the crawl or the parse did not finish.');
  }
  return 0;
}

async function commandBuild(options: Options): Promise<number> {
  if (!isBuildNamespace(options.namespace)) {
    log(
      `build does not know namespace "${options.namespace}"; it knows ` +
        `${BUILD_NAMESPACES.join(', ')}.`,
    );
    return 1;
  }
  return options.namespace === 'feat'
    ? commandBuildFeats(options)
    : commandBuildSpells(options);
}

function usage(): number {
  log(
    [
      'Local-only scraper. Output is gitignored and sentinel-named; it is never',
      'part of the build and must never be committed.',
      '',
      '  fetch --namespace spell|feat [--limit N] [--delay 1500] [--max-age-days 30] [--offline]',
      '  build --namespace spell [--list bard] [--allow-partial]',
      '  build --namespace feat [--allow-partial]',
      '',
      '--list narrows the SPELL output, which makes it a PARTIAL build: an import',
      'is a full replacement, so every spell it filters out would be deactivated.',
      'It therefore requires --allow-partial, exactly as an unfinished crawl does.',
      '--list has no meaning for --namespace feat.',
      '',
      'feat build output has no import path yet — see',
      'tools/scrape/build-feat-catalog.ts for what is missing.',
      '',
      'There is no flag that ignores robots.txt and none that fetches faster',
      'than the 1000ms floor.',
    ].join('\n'),
  );
  return 1;
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  if (options.command === 'fetch') {
    return commandFetch(options);
  }
  if (options.command === 'build') {
    return commandBuild(options);
  }
  return usage();
}

process.exitCode = await main();
