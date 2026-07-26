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
