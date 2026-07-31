import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SHEET_GAPS } from '../../../src/queries/character-sheet-builder';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * AN ANCHOR THAT RESOLVES IS NOT A CLAIM THAT IS TRUE.
 *
 * `ai-reference-anchors-resolve.test.ts` proves every `.ai/` anchor points at
 * something real. It says nothing about whether the sentence around the anchor
 * is CORRECT, so a doc can cite a live symbol, describe it wrongly, and stay
 * green forever. F15 is that failure, measured: `.ai/DEEP_REF_DOMAIN.md`
 * enumerated `SHEET_GAPS` and named one gap that does not exist ("no weapon
 * proficiency") while missing one that does (`weapon_reach_not_recorded`). Both
 * lists were six items long, which is why it survived review — a reader
 * checking the COUNT saw agreement, and only an item-by-item comparison caught
 * it.
 *
 * This is D30's shape applied to prose. D30 made a column's portability a
 * DECISION taken in the diff that adds the column, by deriving the key space
 * from the schema so an unclassified column cannot compile. Here the key space
 * is `SHEET_GAPS` itself: a doc's enumeration is compared, IN ORDER, against
 * the constant, so adding, removing or renaming a gap fails until every doc
 * that enumerates them moves in the same diff.
 *
 * ## WHAT THIS GUARD DOES NOT COVER — read this before trusting it
 *
 * It binds the ENUMERATION, not the PROSE. Three limitations, stated plainly
 * because an overclaimed guard is worse than a narrow one:
 *
 *  1. **A gloss can be false and this test passes.** Writing
 *     `` `gear_not_itemised` — every item is fully tracked `` satisfies
 *     every check here. What the guard forces is that the gloss SITS BESIDE the
 *     key it describes and is touched in the diff that changes the gap. Nothing
 *     compares a sentence to behaviour, and nothing here could.
 *  2. **Only `SHEET_GAPS` is bound.** The other agent-facing enumeration —
 *     `COVERAGE` in `src/ui/screens/planner/agent-reference.ts`, which is where
 *     F15's first instance lived — is NOT derived from anything a test can
 *     check, because "this concept has no columns in the schema" is a claim
 *     about the whole database that only a person can make. Its entries are
 *     pinned by assertion in `tests/unit/ui/agent-reference.test.ts` and by
 *     nothing stronger.
 *  3. **It only sees `.ai/`.** `.claude/` is deliberately out of scope for the
 *     same reason the anchors test gives: it is an append-only chronological
 *     record, and rewriting a past entry to satisfy a lint would be falsifying
 *     the log.
 *
 * The rule that makes (1) bite as hard as it can: a `.ai/` document that names
 * ANY gap kind must carry the marked list. So the way to write about a gap is
 * to enumerate all of them first — an author cannot mention one in passing and
 * leave the enumeration somewhere else, drifting.
 */

/**
 * The opt-in marker. A document declares "the list below IS the gap
 * enumeration" by carrying this line before it.
 *
 * An HTML comment rather than a heading or a fenced block: it is invisible when
 * the markdown is rendered, it cannot be mistaken for prose, and it survives
 * the list being reordered or re-worded around it.
 */
const MARKER = '<!-- SHEET_GAPS -->';

interface GapBullet {
  readonly kind: string;
  readonly gloss: string;
}

interface MarkedList {
  readonly bullets: readonly GapBullet[];
  /** Bullets in the marked region that are not `` - `key` — gloss ``. */
  readonly malformed: readonly string[];
}

/**
 * Read the marked list out of one markdown document.
 *
 * Used by the real check AND by the self-test below, so the self-test proves
 * that THIS parser fails on a disagreeing document rather than proving that
 * some parallel re-implementation would.
 */
function markedList(source: string): MarkedList | null {
  const at = source.indexOf(MARKER);
  if (at === -1) {
    return null;
  }
  const bullets: GapBullet[] = [];
  const malformed: string[] = [];
  const lines = source.slice(at + MARKER.length).split('\n').slice(1);
  const collected: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      // A blank line before the list starts is allowed; one after it ends it.
      if (collected.length > 0) break;
      continue;
    }
    if (line.startsWith('- ')) {
      collected.push(line.slice(2).trim());
      continue;
    }
    if (line.startsWith('  ') && collected.length > 0) {
      collected[collected.length - 1] += ` ${line.trim()}`;
      continue;
    }
    break;
  }
  for (const bullet of collected) {
    // `key` — a gloss of at least a clause. The em dash is required so the key
    // cannot be listed bare: a key with no description is the shape that let
    // the old prose drift out of sight of the thing it described.
    const parsed = /^`([a-z0-9_]+)`\s+—\s+(\S.*)$/u.exec(bullet);
    if (parsed === null || parsed[2]!.length < 20) {
      malformed.push(bullet);
      continue;
    }
    bullets.push({ kind: parsed[1]!, gloss: parsed[2]! });
  }
  return { bullets, malformed };
}

function trackedAiDocs(): string[] {
  return execFileSync('git', ['ls-files', '-z', '.ai'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
    .split('\0')
    .filter((path) => path.endsWith('.md'));
}

function read(doc: string): string {
  return readFileSync(join(repoRoot, doc), 'utf8');
}

describe('.ai claims agree with the code they describe', () => {
  const docs = trackedAiDocs();
  const kinds = SHEET_GAPS.map((gap) => gap.kind);

  it('has documents to check', () => {
    // The same vacuity guard the anchors test carries: a renamed directory
    // would otherwise make every assertion below pass on an empty list.
    expect(docs.length).toBeGreaterThan(5);
    expect(docs).toContain('.ai/DEEP_REF_DOMAIN.md');
  });

  it('states each gap exactly once, so a rename cannot pass unnoticed', () => {
    // A property of the constant itself, checked before it is used as an
    // oracle: two entries sharing a `kind` would make the doc comparison below
    // satisfiable by a list that is missing one of them.
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds.length).toBeGreaterThan(0);
  });

  it('binds every marked gap enumeration to SHEET_GAPS, in order', () => {
    const enumerating = docs.filter((doc) => read(doc).includes(MARKER));
    // At least one doc must enumerate them, or this test guards nothing.
    expect(
      enumerating,
      `no .ai document carries ${MARKER}; the gap enumeration is unguarded`,
    ).not.toEqual([]);

    for (const doc of enumerating) {
      const list = markedList(read(doc))!;
      expect(list.malformed, `${doc}: bullets must read \`kind\` — gloss`).toEqual(
        [],
      );
      expect(
        list.bullets.map((bullet) => bullet.kind),
        `${doc}: the gap list disagrees with SHEET_GAPS`,
      ).toEqual(kinds);
    }
  });

  it('refuses a gap kind named outside a marked enumeration', () => {
    // Otherwise a second document could describe the gaps in prose, name one of
    // them, and drift with nothing watching. Naming one means enumerating all.
    const stray = docs
      .filter((doc) => !read(doc).includes(MARKER))
      .flatMap((doc) => {
        const source = read(doc);
        return kinds
          .filter((kind) => new RegExp(`\\b${kind}\\b`, 'u').test(source))
          .map((kind) => `${doc} names \`${kind}\` but carries no ${MARKER}`);
      });
    expect(stray).toEqual([]);
  });

  it('catches a document whose enumeration disagrees', () => {
    // The guard's own test, in the shape the anchors test uses: prove the
    // comparison can FAIL, against documents built here rather than against the
    // tree — otherwise a parser that returned an empty list would look green.
    const document = (listed: readonly string[]): string =>
      `${MARKER}\n\n${listed
        .map((kind) => `- \`${kind}\` — a gloss long enough to be a sentence.`)
        .join('\n')}\n`;

    const truthful = markedList(document(kinds))!;
    expect(truthful.bullets.map((bullet) => bullet.kind)).toEqual(kinds);

    // Renamed: F15's exact defect — a gap named that does not exist, and one
    // missing that does, with the COUNT still matching.
    const renamed: string[] = [...kinds];
    renamed[renamed.indexOf('weapon_reach_not_recorded')] =
      'no_weapon_proficiency';
    const drifted = markedList(document(renamed))!;
    expect(drifted.bullets).toHaveLength(kinds.length);
    expect(drifted.bullets.map((bullet) => bullet.kind)).not.toEqual(kinds);

    // Dropped, added, and reordered: each has to be caught too.
    expect(
      markedList(document(kinds.slice(1)))!.bullets.map((b) => b.kind),
    ).not.toEqual(kinds);
    expect(
      markedList(document([...kinds, 'no_encumbrance']))!.bullets.map(
        (b) => b.kind,
      ),
    ).not.toEqual(kinds);
    expect(
      markedList(document([...kinds].reverse()))!.bullets.map((b) => b.kind),
    ).not.toEqual(kinds);

    // A bare key with no gloss is malformed, not silently accepted.
    expect(markedList(`${MARKER}\n\n- \`${kinds[0]!}\`\n`)!.malformed).toEqual([
      `\`${kinds[0]!}\``,
    ]);
    // And a document with no marker is not an empty enumeration.
    expect(markedList('nothing to see')).toBeNull();
  });
});
