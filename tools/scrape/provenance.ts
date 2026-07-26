/**
 * The containment vocabulary for the scraper. Everything else in
 * `tools/scrape/` imports its output paths from here, so there is exactly one
 * place that decides where scraped bytes may land and exactly one literal the
 * guards match on.
 *
 * THE SENTINEL RIDES IN TWO PLACES, BECAUSE EITHER ONE ALONE HAS A HOLE.
 *
 * *In the filename.* A path travels with the bytes: `cp`, `mv`, an over-broad
 * `git add -A` all preserve the name, so the guards keep matching after a file
 * has been moved somewhere a path-based rule would have missed. This covers the
 * cached HTML, which has nowhere else to carry a stamp without corrupting the
 * very bytes the parser reads — and it is why `tools/assert-dist-clean.mjs`
 * matches basenames as well as contents, since for 84 of the 88 files the
 * scraper writes the name is the ONLY place the stamp lives.
 *
 * *In the contents.* The filename stops protecting a file the instant someone
 * renames it, and a renamed Tier 1 document is otherwise indistinguishable from
 * hand-written homebrew. The queue and the report carry a `provenance` field
 * outright. The catalog documents were the hard case and turned out to be
 * solvable: `parseCatalogDocuments` requires a BARE top-level array, so there is
 * no envelope for a header — but `catalogRecord` builds its result from named
 * fields and silently drops every key it does not know. So each record carries
 * `_provenance`, which is greppable on disk and cannot reach the database, an
 * export or a share link. That was verified against the real parser, not
 * assumed, and `buildCatalogDocuments` re-proves it on every build by reparsing
 * its own output and refusing to emit if the stamp survived.
 *
 * The two fields that WOULD have survived the parse — `tags` and `sourceSlug` —
 * are both persisted, so stamping either would have pushed the sentinel into
 * precisely the places D3 says imported rules text must never reach.
 *
 * EVERY file the scraper writes carries it: cached HTML, the queue, the run
 * report and the catalog documents. That uniformity is what lets the guard state
 * one rule instead of enumerating output kinds.
 */

/**
 * The literal both guards match on.
 *
 * Only two tracked files may contain it: this module, and the guard test that
 * asserts the rule. That allowlist is written out longhand in
 * `tests/unit/tools/scraped-output-is-never-committed.test.ts` so that adding a
 * third is a visible diff rather than a silent widening.
 */
export const SCRAPE_SENTINEL = 'NOT-FREE-LICENSED-DO-NOT-COMMIT';

/**
 * The owner namespace every scraped record's version key is minted under.
 *
 * THIS IS THE ONE PROVENANCE MARK THAT IS MEANT TO SURVIVE THE IMPORT, and it
 * exists because `_provenance` deliberately does not. The sentinel above is inert
 * by construction — the catalog parser drops it — which is right for a string
 * that must never reach an export, but on its own it left the tool's actual
 * product unmarked where it lands: scraped rules text in
 * `spell_versions.short_summary`, under keys like `2024:homunculus-servant`
 * formed by the two-part OFFICIAL grammar and therefore indistinguishable from
 * content this project legitimately bundles. An inert marker made that harder to
 * notice rather than safer.
 *
 * A version key is not rules text, and unlike the sentinel it is *supposed* to
 * travel: it is the identity, and `isSpellVersionKey`'s three-part form exists
 * precisely to say "this came from somewhere other than the official list". So
 * `2024:scraped.wikidot:homunculus-servant` makes a scraped row self-identifying
 * wherever it ends up — a database row, a backup export, a share link's
 * `content_key` — while carrying no non-free prose at all. The hand-written
 * homebrew fixture insists on this grammar for exactly this reason; the scraper
 * now takes its own advice.
 */
export const SCRAPED_OWNER_NAMESPACE = 'scraped.wikidot';

/**
 * The single gitignored directory every scraped byte lands in. Relative to the
 * repository root, and resolved by the CLI. There is deliberately no flag that
 * redirects it: the output location is not a thing the operator gets to move,
 * because the guards' path rule is written against this one name.
 */
export const SCRAPE_OUTPUT_DIRNAME = 'scraped';

/**
 * Stamps the sentinel into a filename immediately before its extension:
 * `spells.json` becomes `spells.NOT-FREE-LICENSED-DO-NOT-COMMIT.json`.
 *
 * The extension is preserved so editors and `jq` still recognise the file — a
 * stamp that broke tooling would be a stamp people route around.
 */
export function stampScrapedFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) {
    return `${filename}.${SCRAPE_SENTINEL}`;
  }
  return `${filename.slice(0, dot)}.${SCRAPE_SENTINEL}${filename.slice(dot)}`;
}

/** True when a path component was produced by {@link stampScrapedFilename}. */
export function isScrapedFilename(filename: string): boolean {
  return filename.includes(SCRAPE_SENTINEL);
}
