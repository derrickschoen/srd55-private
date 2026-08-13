/**
 * The small amount of HTML handling the parser needs.
 *
 * No DOM library, because adding a dependency for this would put a parser for
 * untrusted remote markup into the repository's dependency graph to save about
 * sixty lines. The target's page shell is machine-generated and regular; the
 * only judgement call is the div-balancing in {@link extractElementById}, which
 * is written to fail closed.
 */

const NAMED_ENTITIES: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', ' '],
  ['mdash', '—'],
  ['ndash', '–'],
  ['hellip', '…'],
  ['rsquo', '’'],
  ['lsquo', '‘'],
  ['rdquo', '”'],
  ['ldquo', '“'],
  ['times', '×'],
  ['deg', '°'],
]);

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/gu, (match, body: string) => {
    if (body.startsWith('#')) {
      const code = body.startsWith('#x') || body.startsWith('#X')
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES.get(body.toLowerCase()) ?? match;
  });
}

/** Tags to plain text, entities decoded, whitespace collapsed. */
export function toText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/gu, ''))
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Like {@link toText}, but each tag becomes a SPACE rather than nothing.
 *
 * Needed wherever adjacent elements carry separate values with no whitespace
 * between them in the markup — `<a>bard</a><a>evocation</a>`. Measured against
 * the live site: {@link toText} turned a tag list into `artificerconjuration`,
 * and the cross-check then reported a disagreement that was not there. Using it
 * for prose would be wrong, which is why this is a second function rather than a
 * change to the first.
 */
export function toSeparatedText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/gu, ' '))
    .replace(/\s+/gu, ' ')
    .trim();
}

/** Inner text of every `<em>` in a region, in document order. */
export function emphasisedTexts(html: string): string[] {
  const found: string[] = [];
  const scanner = /<em\b[^>]*>([\s\S]*?)<\/em>/giu;
  let match: RegExpExecArray | null;
  while ((match = scanner.exec(html)) !== null) {
    const text = toText(match[1] as string);
    if (text !== '') {
      found.push(text);
    }
  }
  return found;
}

/**
 * Extracts the inner HTML of the first element with the given id, balancing
 * nested tags of the same name.
 *
 * Returns null rather than a best guess when the element is absent or its
 * closing tag is missing. A truncated content region parses into a record that
 * looks fine and is wrong, which is the failure mode this whole parser is
 * arranged to avoid.
 */
export function extractElementById(
  html: string,
  tagName: string,
  id: string,
): string | null {
  const open = new RegExp(
    `<${tagName}\\b[^>]*\\bid\\s*=\\s*["']${id}["'][^>]*>`,
    'iu',
  );
  const match = open.exec(html);
  if (match === null) {
    return null;
  }
  const start = match.index + match[0].length;
  const scanner = new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'giu');
  scanner.lastIndex = start;
  let depth = 1;
  let step: RegExpExecArray | null;
  while ((step = scanner.exec(html)) !== null) {
    depth += step[1] === '/' ? -1 : 1;
    if (depth === 0) {
      return html.slice(start, step.index);
    }
  }
  return null;
}

/** Inner HTML of every element carrying the given class, in document order. */
export function extractByClass(html: string, className: string): string[] {
  const open = new RegExp(
    `<(\\w+)\\b[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`,
    'giu',
  );
  const found: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = open.exec(html)) !== null) {
    const tagName = match[1] as string;
    const region = extractBalanced(html, tagName, match.index + match[0].length);
    if (region !== null) {
      found.push(region);
    }
  }
  return found;
}

export function extractBalanced(
  html: string,
  tagName: string,
  start: number,
): string | null {
  const scanner = new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'giu');
  scanner.lastIndex = start;
  let depth = 1;
  let step: RegExpExecArray | null;
  while ((step = scanner.exec(html)) !== null) {
    depth += step[1] === '/' ? -1 : 1;
    if (depth === 0) {
      return html.slice(start, step.index);
    }
  }
  return null;
}

/** Top-level `<p>` blocks of a content region, as raw inner HTML. */
export function paragraphs(html: string): string[] {
  const found: string[] = [];
  const scanner = /<p\b[^>]*>/giu;
  let match: RegExpExecArray | null;
  while ((match = scanner.exec(html)) !== null) {
    const region = extractBalanced(html, 'p', match.index + match[0].length);
    if (region !== null) {
      found.push(region);
    }
  }
  return found;
}

/**
 * Top-level blocks among the given tag names, IN DOCUMENT ORDER, as raw inner
 * HTML paired with the (lowercased) tag that carried them.
 *
 * Generalises {@link paragraphs} to headings and tables: the subclass and
 * species pages interleave `<h3>`/`<h4>`/`<h5>` and `<table>` with `<p>` at the
 * same nesting depth (a class feature's name is its own `<h3>`, not a labelled
 * paragraph the way a feat benefit is), so a parser reading them needs the
 * heading boundaries in the same pass as the prose between them rather than
 * two separately-ordered lists it would have to re-interleave by hand.
 */
export function blocksOf(
  html: string,
  tagNames: readonly string[],
): { readonly tag: string; readonly html: string }[] {
  const found: { tag: string; html: string }[] = [];
  const scanner = new RegExp(`<(${tagNames.join('|')})\\b[^>]*>`, 'giu');
  let match: RegExpExecArray | null;
  while ((match = scanner.exec(html)) !== null) {
    const tag = (match[1] as string).toLowerCase();
    const region = extractBalanced(html, tag, match.index + match[0].length);
    if (region !== null) {
      found.push({ tag, html: region });
    }
  }
  return found;
}

export interface StrictBlock {
  readonly tag: string;
  readonly html: string;
}

export type StrictBlocksResult =
  | { readonly ok: true; readonly blocks: StrictBlock[] }
  | { readonly ok: false; readonly tag: string };

/**
 * Splits a content region into top-level blocks whose tag is one of
 * `knownTags`, IN DOCUMENT ORDER, and REFUSES — naming the offending tag —
 * the moment it meets a top-level element that is none of them.
 *
 * {@link blocksOf} only ever looks for the tags it is told to find, so a
 * tag it was not given is invisible to it — a silent drop, not a refusal.
 * That is fine for a caller that already folds "everything else" into the
 * nearest open block, but wrong for a caller whose "everything else" might
 * be a rules-bearing element (a `<table>`, a `<ul>`) it was never taught to
 * expect. This is that caller's tool: same balanced-tag walk as
 * {@link blocksOf}, but a top-level tag outside `knownTags` is a hard
 * failure instead of something that never got looked at.
 *
 * Only ELEMENT tags are inspected; plain text (or whitespace) between two
 * blocks is skipped without comment, since none of this project's pages
 * print rules text outside some block element. A tag nested INSIDE an
 * already-consumed block (an `<a>` inside a `<p>`, a `<tr>` inside a
 * `<table>`) is part of that block's own inner HTML and is never
 * independently inspected — this function only ever looks at the top
 * level.
 */
export function strictBlocksOf(
  html: string,
  knownTags: readonly string[],
): StrictBlocksResult {
  const known = new Set(knownTags.map((tag) => tag.toLowerCase()));
  const found: StrictBlock[] = [];
  const tagStart = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gu;
  let cursor = 0;
  for (;;) {
    tagStart.lastIndex = cursor;
    const match = tagStart.exec(html);
    if (match === null) {
      break;
    }
    const tag = (match[1] as string).toLowerCase();
    if (!known.has(tag)) {
      return { ok: false, tag };
    }
    const start = match.index + match[0].length;
    const scanner = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'giu');
    scanner.lastIndex = start;
    let depth = 1;
    let step: RegExpExecArray | null;
    let end: number | null = null;
    let content = '';
    while ((step = scanner.exec(html)) !== null) {
      depth += step[1] === '/' ? -1 : 1;
      if (depth === 0) {
        content = html.slice(start, step.index);
        end = step.index + step[0].length;
        break;
      }
    }
    if (end === null) {
      return { ok: false, tag: `${tag}> (unclosed)` };
    }
    found.push({ tag, html: content });
    cursor = end;
  }
  return { ok: true, blocks: found };
}

/** Splits a paragraph on `<br>` / `<br />` into its text lines. */
export function lines(paragraphHtml: string): string[] {
  return paragraphHtml
    .split(/<br\s*\/?>/giu)
    .map(toText)
    .filter((line) => line !== '');
}
