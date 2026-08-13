/**
 * The crawl frontier comes from the published sitemap rather than from walking
 * the link graph. That is both cheaper and politer: one document names every
 * page, and its per-URL `<lastmod>` is the only cache-invalidation signal the
 * target offers, since it sends `no-store` and a fresh ETag on every response.
 */
import { decodeEntities } from './html';

export interface SitemapEntry {
  readonly url: string;
  readonly lastmod: string | null;
}

export function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const urlBlock = /<url\b[^>]*>([\s\S]*?)<\/url>/giu;
  let match: RegExpExecArray | null;
  while ((match = urlBlock.exec(xml)) !== null) {
    const block = match[1] as string;
    const loc = /<loc>\s*([\s\S]*?)\s*<\/loc>/iu.exec(block);
    if (loc === null) {
      continue;
    }
    const url = decodeEntities((loc[1] as string).trim());
    if (url === '') {
      continue;
    }
    const lastmod = /<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/iu.exec(block);
    entries.push({
      url,
      lastmod: lastmod === null ? null : (lastmod[1] as string).trim(),
    });
  }
  return entries;
}

/**
 * The page name of a wiki URL: the last path segment, e.g. `spell:fireball`.
 * Returns null for a URL with no path.
 */
export function pageName(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const segment = parsed.pathname.split('/').filter((part) => part !== '').pop();
  return segment === undefined ? null : decodeURIComponent(segment);
}

/** Entries whose page name sits in the given namespace, e.g. `spell`. */
export function inNamespace(
  entries: readonly SitemapEntry[],
  namespace: string,
): SitemapEntry[] {
  const prefix = `${namespace}:`;
  return entries.filter((entry) => {
    const name = pageName(entry.url);
    return name !== null && name.startsWith(prefix);
  });
}

/**
 * THERE IS NO `subclass:` NAMESPACE ON dnd2024.wikidot.com. This was assumed
 * going in — the task brief that started this lane guessed it — and the live
 * sitemap (fetched once, 2026-08-13, 1708 `<loc>` entries) disproves it:
 * subclass pages are namespaced by their PARENT CLASS instead, one namespace
 * per class — `fighter:champion`, `cleric:life-domain`,
 * `sorcerer:draconic-bloodline`, and so on for the other ten core classes
 * plus `artificer:` (Eberron, not in the SRD class list `srdSubclassClassNames`
 * from `src/rules/srd-subclasses.ts` names, but a real namespace on the site
 * all the same).
 *
 * Every one of these thirteen namespaces ALSO carries non-subclass pages —
 * confirmed live: `<class>:main` (the class's own overview page) and
 * `<class>:spell-list` on every one of them, plus class-specific extras like
 * `sorcerer:metamagic` and `warlock:eldritch-invocations`. `parse-subclass.ts`
 * is what actually rejects those (its own page-tag check — see that module's
 * file comment) rather than this list trying to enumerate every non-subclass
 * slug on all thirteen namespaces, which is not a closed set this module can
 * see from the sitemap alone.
 *
 * ALSO CONFIRMED LIVE, NOT YET HANDLED ANYWHERE: several subclasses are
 * listed under more than one slug in the same namespace — e.g.
 * `sorcerer:draconic-bloodline`, `sorcerer:draconic` and
 * `sorcerer:draconic-sorcery` all read as the same Draconic Bloodline
 * sorcerer. A full crawl of the `sorcerer` namespace will therefore mint the
 * same `versionKey` from more than one URL, which is exactly the case
 * `build-subclass-catalog.ts`'s dedup-by-`versionKey` check (mirrored from
 * `build-feat-catalog.ts`) is written to catch — refusing the build with both
 * URLs named is the correct behaviour here, not a bug to route around, but it
 * IS a build a future `--allow-partial`-style alias list would have to solve
 * before a full crawl of any class namespace can complete unattended.
 */
export const SUBCLASS_PARENT_CLASS_NAMESPACES = [
  'artificer',
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
] as const;
export type SubclassParentClassNamespace =
  (typeof SUBCLASS_PARENT_CLASS_NAMESPACES)[number];

function isSubclassParentClassNamespace(
  value: string,
): value is SubclassParentClassNamespace {
  return (
    SUBCLASS_PARENT_CLASS_NAMESPACES as readonly string[]
  ).includes(value);
}

/**
 * The union of all thirteen parent-class namespaces above — the sitemap
 * filter the CLI's pseudo-namespace `subclass` expands to, since no single
 * real namespace does the job. See this module's file comment.
 */
export function inSubclassNamespaces(
  entries: readonly SitemapEntry[],
): SitemapEntry[] {
  return entries.filter((entry) => {
    const name = pageName(entry.url);
    if (name === null) {
      return false;
    }
    const namespace = name.split(':', 1)[0] as string;
    return (
      namespace !== name && isSubclassParentClassNamespace(namespace)
    );
  });
}

/**
 * Known non-subclass pages inside the thirteen parent-class namespaces,
 * skipped at QUEUE TIME — before `fetch` ever requests them — so the
 * documented default `fetch --namespace subclass` -> `build --namespace
 * subclass` flow can complete without `--allow-partial`. Two shapes:
 *
 * GLOBAL: `main` (the class's own overview page) and `spell-list`,
 * confirmed present in EVERY one of the thirteen namespaces (this module's
 * earlier file comment, live sitemap sample 2026-08-13).
 *
 * PER-NAMESPACE: class-specific extras confirmed live on that one
 * namespace only, from the same sample — `sorcerer:metamagic` and
 * `warlock:eldritch-invocations`.
 *
 * THIS LIST IS NOT EXHAUSTIVE, and does not try to be — this module's file
 * comment already explains why enumerating every non-subclass slug on all
 * thirteen namespaces is not something a sitemap-only view can do. A page
 * this list does not know about still reaches `fetch`, gets cached, and
 * then FAILS LOUDLY in `parse-subclass.ts`'s page-tag check when `build`
 * runs — exactly the behaviour this project wants for a page nobody
 * confirmed. Only the entries confirmed here skip that path, and the skip
 * is logged with a reason, never silent.
 */
const GLOBAL_SUBCLASS_NAMESPACE_AUXILIARY_SLUGS: ReadonlySet<string> =
  new Set(['main', 'spell-list']);

const PER_NAMESPACE_SUBCLASS_AUXILIARY_SLUGS: ReadonlyMap<
  SubclassParentClassNamespace,
  ReadonlySet<string>
> = new Map([
  ['sorcerer', new Set(['metamagic'])],
  ['warlock', new Set(['eldritch-invocations'])],
]);

export interface SubclassNamespaceSkip {
  readonly url: string;
  readonly reason: string;
}

export interface SubclassNamespacePartition {
  readonly included: SitemapEntry[];
  readonly skipped: SubclassNamespaceSkip[];
}

/**
 * `inSubclassNamespaces`, partitioned into pages worth queueing and pages
 * known in advance to be non-subclass auxiliary pages — see
 * `GLOBAL_SUBCLASS_NAMESPACE_AUXILIARY_SLUGS` and
 * `PER_NAMESPACE_SUBCLASS_AUXILIARY_SLUGS` above. The caller logs
 * `skipped` with its reasons rather than dropping it silently.
 */
export function partitionSubclassNamespaceEntries(
  entries: readonly SitemapEntry[],
): SubclassNamespacePartition {
  const included: SitemapEntry[] = [];
  const skipped: SubclassNamespaceSkip[] = [];
  for (const entry of inSubclassNamespaces(entries)) {
    // `inSubclassNamespaces` already proved `pageName` is non-null and its
    // namespace is one of the thirteen known ones.
    const name = pageName(entry.url) as string;
    const namespace = name.split(':', 1)[0] as SubclassParentClassNamespace;
    const slug = name.slice(namespace.length + 1);
    if (GLOBAL_SUBCLASS_NAMESPACE_AUXILIARY_SLUGS.has(slug)) {
      skipped.push({
        url: entry.url,
        reason: `known auxiliary page "${slug}" (confirmed on every class namespace)`,
      });
      continue;
    }
    const perNamespace = PER_NAMESPACE_SUBCLASS_AUXILIARY_SLUGS.get(namespace);
    if (perNamespace !== undefined && perNamespace.has(slug)) {
      skipped.push({
        url: entry.url,
        reason: `known auxiliary page "${namespace}:${slug}"`,
      });
      continue;
    }
    included.push(entry);
  }
  return { included, skipped };
}

/**
 * The parent class implied by a subclass page's own name, e.g.
 * `fighter:champion` -> `Fighter`. This is the ONLY reliable class signal a
 * subclass page carries — see `parse-subclass.ts`'s file comment for why the
 * page body and its tags do not name the class at all — so it is resolved
 * here, from the URL, rather than guessed from prose.
 */
export function subclassParentClassFromPageName(name: string): string | null {
  const namespace = name.split(':', 1)[0] as string;
  if (namespace === name || !isSubclassParentClassNamespace(namespace)) {
    return null;
  }
  return `${namespace.slice(0, 1).toUpperCase()}${namespace.slice(1)}`;
}
