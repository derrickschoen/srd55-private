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
