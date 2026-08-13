/**
 * Wiki subclass page -> a standalone scraped subclass document.
 *
 * Same two design rules as `parse-spell.ts` and `parse-feat.ts`, restated here
 * because this parser earns them independently rather than inheriting them by
 * import.
 *
 * STRICT AND LOUD. Every page that does not yield every required field is a
 * hard failure carrying the reason, never a defaulted record. Subclass pages
 * are hand-edited, so some will not match; a parser that guesses at a
 * malformed page emits a plausible, wrong rule, which is strictly worse than
 * emitting nothing.
 *
 * CROSS-CHECK, DO NOT TRUST ONE SIGNAL. The page's own tag list is the one
 * signal this module has for "this is actually a subclass page, not the
 * class's `main` or `spell-list` neighbour" — see the namespace note below —
 * and a page missing the `subclass` tag FAILS rather than being parsed on the
 * hope that its shape happens to match anyway.
 *
 * NOTHING SCRAPED IS COMMITTED. The tests for this module run against
 * synthetic markup written by hand for the purpose, never a saved page.
 *
 * ---
 *
 * THERE IS NO `subclass:` NAMESPACE ON THE SITE. `tools/scrape/sitemap.ts`'s
 * file comment has the live sitemap facts: subclass pages are namespaced by
 * their PARENT CLASS (`fighter:champion`, `cleric:life-domain`, …), one
 * namespace per class, and every one of those namespaces also carries
 * `<class>:main` / `<class>:spell-list` / class-specific extra pages that are
 * NOT subclasses. That is why `parseSubclassPage` takes `parentClass` as an
 * OPTION rather than reading it off the page: three live samples
 * (`fighter:champion`, `cleric:life-domain`, `wizard:evoker`, fetched through
 * `PoliteFetcher` 2026-08-13, never saved anywhere this repository tracks)
 * carry exactly one page-tag each (`subclass`) and NO class-name tag and NO
 * printed class name anywhere in the body — the class is knowable only from
 * the URL, so the CLI resolves it with `subclassParentClassFromPageName`
 * (`sitemap.ts`) and passes it in, the same way it passes `edition`.
 *
 * THE FEATURE HEADING SHAPE, CONFIRMED ON ALL THREE SAMPLES: `<h3>Level
 * {n}: {Name}</h3>` immediately followed by one or more `<p>` (and,
 * `cleric:life-domain`, a `<table>`) describing it. `readFeatureBlocks` below
 * folds anything that is NOT itself a matching heading — a bare repeated
 * subheading (`cleric:life-domain` prints a SECOND, level-less `<h3>Life
 * Domain Spells</h3>` immediately before the domain-spells `<table>`, right
 * after the leveled heading of the same name) or a table — into the MOST
 * RECENTLY opened feature's `descriptionParagraphs`, as verbatim text, rather
 * than trying to model the domain-spells table as structured per-level spell
 * grants. That is the same "prose beats fabricated structure" call
 * `parse-feat.ts` makes for benefit paragraphs, applied to a table instead of
 * a sentence.
 *
 * ---
 *
 * THE IMPORT-SIDE GAP, NAMED RATHER THAN PAPERED OVER.
 *
 * `src/catalog/catalog-schema.ts` already has a `'subclass'` record kind
 * (`CatalogSubclassRecord`), but it is NOT the shape this module produces.
 * Two fields make that a hard gap rather than a rename:
 *
 * `parentClassKey` there is a CONTENT KEY (`2024:class:fighter`), never a
 * display name — the type's own comment explains why: a user-authored class
 * that happens to be named "Fighter" must not be able to adopt a subclass
 * meant for the bundled one. This module's `parentClass` is a display name
 * resolved from a URL namespace (see above), which is exactly the kind of
 * name a resolver is not supposed to key off of. Turning one into the other
 * needs a lookup this module has no business doing.
 *
 * `CatalogSubclassFeature.effect` is `ClassFeatureEffect | null` —
 * `src/rules/class-feature-effects.ts`'s own bounded, compile-checked union,
 * the same rules-engine vocabulary `parse-feat.ts`'s file comment describes
 * for `GrantRule`. Inferring one out of arbitrary wikidot prose is the same
 * plausible-and-wrong fabrication that module refuses, for the same reason: a
 * wrong effect moves a number on a character sheet, which is a strictly worse
 * failure mode than a wrong search facet. So every feature this module reads
 * keeps its `descriptionParagraphs` as verbatim prose and mints no `effect`
 * at all.
 *
 * Bridging either gap is future work for whoever wires a subclass import path
 * to the scraper.
 */
import type { RulesEdition } from '../../src/domain/enums';
import {
  homebrewSpellKey,
  normalizeCatalogKeyComponent,
} from '../../src/catalog/catalog-key';
import { SCRAPED_OWNER_NAMESPACE } from './provenance';
import {
  blocksOf,
  extractByClass,
  extractElementById,
  toSeparatedText,
  toText,
} from './html';

export interface SubclassFeature {
  readonly level: number;
  readonly name: string;
  /** Verbatim printed prose. Never structured — see the file-level comment. */
  readonly descriptionParagraphs: readonly string[];
}

export interface ParsedSubclassDocument {
  readonly identityKey: string;
  readonly versionKey: string;
  readonly name: string;
  readonly edition: RulesEdition;
  /** A display name (`"Fighter"`), NOT a content key. See the file comment. */
  readonly parentClass: string;
  /** In printed order. */
  readonly features: readonly SubclassFeature[];
  readonly sourceBooks: string[];
  /** The pages print no page number; null is the honest value, as elsewhere. */
  readonly sourcePage: number | null;
  readonly sourceSlug: string | null;
}

export interface ParsedSubclass {
  readonly document: ParsedSubclassDocument;
}

export type ParseResult =
  | { readonly ok: true; readonly value: ParsedSubclass }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): ParseResult {
  return { ok: false, reason };
}

/** The page's own normalised tag list, lowercased. Same technique as `parse-feat.ts`. */
function readPageTags(html: string): Set<string> {
  const regions = extractByClass(html, 'page-tags');
  const tags = new Set<string>();
  for (const region of regions) {
    for (const raw of toSeparatedText(region).split(/[\s,]+/u)) {
      const tag = raw.trim().toLowerCase();
      if (tag !== '') {
        tags.add(tag);
      }
    }
  }
  return tags;
}

const FEATURE_HEADING = /^Level\s+(\d+):\s*(.+)$/u;

interface MutableFeature {
  level: number;
  name: string;
  descriptionParagraphs: string[];
}

/**
 * Reads the ordered `<h3>`/`<p>`/`<table>` blocks of the content region into
 * features. Every block that is not a `Level {n}: {Name}` heading is folded
 * into the most recently opened feature as one more verbatim paragraph;
 * anything appearing before the FIRST such heading (the page's own title
 * line and flavour text — neither is required by this module's document
 * shape) is dropped rather than guessed into a feature that does not exist
 * yet. A `sourceBlock` is excluded by reference so it never becomes feature
 * prose.
 */
function readFeatures(
  blocks: readonly { readonly tag: string; readonly html: string }[],
  sourceBlock: { readonly tag: string; readonly html: string },
): MutableFeature[] {
  const features: MutableFeature[] = [];
  for (const block of blocks) {
    if (block === sourceBlock) {
      continue;
    }
    if (block.tag === 'h3') {
      const match = FEATURE_HEADING.exec(toText(block.html));
      if (match !== null) {
        features.push({
          level: Number(match[1]),
          name: (match[2] as string).trim(),
          descriptionParagraphs: [],
        });
        continue;
      }
    }
    const current = features[features.length - 1];
    if (current === undefined) {
      continue;
    }
    const text = toText(block.html);
    if (text !== '') {
      current.descriptionParagraphs.push(text);
    }
  }
  return features;
}

export interface ParseSubclassOptions {
  readonly edition: RulesEdition;
  /** Page name, used only for error messages and as `sourceSlug`. */
  readonly slug: string;
  /**
   * The parent class's display name, e.g. `"Fighter"`. Resolved by the
   * caller from the page's own URL namespace
   * (`subclassParentClassFromPageName` in `sitemap.ts`) — see the file
   * comment for why the page itself names no class at all.
   */
  readonly parentClass: string;
}

export function parseSubclassPage(
  html: string,
  options: ParseSubclassOptions,
): ParseResult {
  const content = extractElementById(html, 'div', 'page-content');
  if (content === null) {
    return fail('no <div id="page-content"> — page shell not recognised');
  }

  const pageTags = readPageTags(html);
  if (!pageTags.has('subclass')) {
    return fail(
      'page tags do not carry "subclass" — likely a class overview, spell ' +
        'list, or other non-subclass page sharing this namespace',
    );
  }

  const blocks = blocksOf(content, ['p', 'h3', 'table']);
  if (blocks.length === 0) {
    return fail('page content has no paragraphs or headings');
  }

  const sourceBlock = blocks.find(
    (block) => block.tag === 'p' && /^\s*Source\s*:/iu.test(toText(block.html)),
  );
  if (sourceBlock === undefined) {
    return fail('no "Source:" line');
  }
  const sourceBook = toText(sourceBlock.html).replace(
    /^\s*Source\s*:\s*/iu,
    '',
  );
  if (sourceBook === '') {
    return fail('"Source:" line names no book');
  }

  const features = readFeatures(blocks, sourceBlock);
  if (features.length === 0) {
    return fail('no "Level {n}: {name}" feature headings found');
  }

  const name = readName(html);
  if (name === null) {
    return fail('no page title');
  }

  const document: ParsedSubclassDocument = {
    // NAMESPACED, NOT OFFICIAL — same reasoning as `parse-feat.ts` and
    // `parse-spell.ts`; see either for the full argument.
    identityKey: `scraped-${normalizeCatalogKeyComponent(name)}`,
    versionKey: homebrewSpellKey(
      options.edition,
      SCRAPED_OWNER_NAMESPACE,
      name,
      new Set([SCRAPED_OWNER_NAMESPACE]),
    ),
    name,
    edition: options.edition,
    parentClass: options.parentClass,
    features: features.map((feature) => ({
      level: feature.level,
      name: feature.name,
      descriptionParagraphs: feature.descriptionParagraphs,
    })),
    sourceBooks: [sourceBook],
    sourcePage: null,
    sourceSlug: options.slug,
  };

  return { ok: true, value: { document } };
}

function readName(html: string): string | null {
  const titled = extractElementById(html, 'div', 'page-title');
  if (titled !== null) {
    const text = toText(titled);
    if (text !== '') {
      return text;
    }
  }
  const heading = /<title>([^<]*)<\/title>/iu.exec(html);
  if (heading === null) {
    return null;
  }
  const text = toText(heading[1] as string).split(' - ')[0]?.trim() ?? '';
  return text === '' ? null : text;
}
