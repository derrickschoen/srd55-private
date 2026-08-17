/**
 * Stryker's related-test selection only sees a test file as touching
 * `src/simulation/spell-source-reader.ts` when the file *statically* imports
 * that module. The named imports below are already static, but the
 * side-effect import on the next line is kept deliberately and must not be
 * removed: earlier waves lost kills in files that reached the module only
 * through `await import(...)`, which that selection cannot see.
 */
import '../../../src/simulation/spell-source-reader';

import { describe, expect, it } from 'vitest';
import {
  deriveSaveDamageCoverageFromBodies,
  sourceDamageSignatures,
  spellBodyDigestInputsFromFullLayout,
  spellDescriptionsFromFullLayout,
} from '../../../src/simulation/spell-source-reader';

/**
 * Page-layout parser probes for `spell-source-reader`'s full-`pdftotext
 * -layout` reader and for the offset arithmetic of its damage scanner.
 *
 * Everything here is a synthetic SRD-shaped page stream built by the helpers
 * below. Every expected value is derived by hand from the fixture — column
 * indexes are counted off the documented per-column maps, and the two error
 * strings are transcribed from the parser's specification, never captured from
 * a run.
 *
 * The fixtures are deliberately *geometric*: the gutter probes place printed
 * glyphs at the exact columns that decide which candidate gutters survive
 * `splitSafe`, so a parser that widens or narrows its safe-column test by one
 * column reads the page in a different reading order and produces a different
 * body.
 */

/** Transcribed from the reader's re-pin workflow sentence. */
const REPIN =
  'To re-pin a legitimate SRD revision, inspect the changed spell pages, ' +
  'update the reviewed page range/count and committed readable extract, and ' +
  'record a justification naming what changed and why.';

/** The shortest line the reader accepts as printed spell metadata. */
const SPELL_METADATA_LINE = 'Level 1 Evocation (';

/** Ordinary pages print their right column starting at this column. */
const RIGHT_COLUMN_START = 40;

function spellTag(spell: number): string {
  return String(spell).padStart(3, '0');
}

function headingLine(spell: number): string {
  return `Spell ${spellTag(spell)}`;
}

/**
 * Exactly 20 characters: `body ` (5) + tag (3) + ` ` (1) + 11 padding glyphs.
 * One 20-character cell in the right column is what fixes an ordinary page's
 * printed width at 40 + 20 = 60 columns.
 */
function bodyLine(spell: number): string {
  return `body ${spellTag(spell)} ${'x'.repeat(11)}`;
}

function spellBlock(spell: number): readonly string[] {
  return [headingLine(spell), SPELL_METADATA_LINE, bodyLine(spell)];
}

/**
 * Footers are printed indented, the way `pdftotext -layout` emits a
 * right-of-centre footer. The reader must trim before it recognises one.
 */
function footerLine(page: number): string {
  return `    ${String(page)} System Reference Document 5.2.1`;
}

function twoColumnRows(
  left: readonly string[],
  right: readonly string[],
): readonly string[] {
  const rows = Math.max(left.length, right.length);
  return Array.from({ length: rows }, (_unused, row) => {
    const leftCell = left[row] ?? '';
    const rightCell = right[row] ?? '';
    return `${leftCell.padEnd(RIGHT_COLUMN_START, ' ')}${rightCell}`.trimEnd();
  });
}

/**
 * An ordinary two-column page. Column map of every printed row:
 *
 *   cols  0-19 : left cell  (headings are 9 wide, metadata 19, bodies 20)
 *   cols 20-39 : always blank
 *   cols 40-59 : right cell (same three widths)
 *
 * Printed width is 60, so `findGutter` searches columns
 * floor(60*0.35)=21 .. floor(60*0.65)=39. Columns 21..38 are safe (their
 * three probed columns all fall inside the blank band 20..39); column 39 is
 * not, because column 40 carries the right cell. That is 18 candidates, and
 * the median index floor(18/2)=9 selects column 30 — comfortably inside the
 * blank band, so both columns are sliced whole.
 */
function contentPage(
  page: number,
  spells: readonly number[],
  dropFirstHeading = false,
): string {
  const leftCount = Math.ceil(spells.length / 2);
  const blocks = spells.map((spell) => spellBlock(spell));
  const left = blocks.slice(0, leftCount).flat();
  const right = blocks.slice(leftCount).flat();
  const leftLines = dropFirstHeading ? left.slice(1) : left;
  return [...twoColumnRows(leftLines, right), footerLine(page)].join('\n');
}

function trailingPage(page: number, lines: readonly string[]): string {
  return [...lines, footerLine(page)].join('\n');
}

/** Five spells per page, with the last page taking whatever is left. */
function spellsByPage(
  total: number,
  pageCount: number,
  perPage: number,
): readonly (readonly number[])[] {
  const groups: number[][] = [];
  let next = 1;
  for (let page = 0; page < pageCount; page += 1) {
    const take = page === pageCount - 1 ? total - next + 1 : perPage;
    groups.push(Array.from({ length: take }, (_unused, index) => next + index));
    next += take;
  }
  return groups;
}

/** Pages 107..174 carry all 339 spells; page 175 is the probe page. */
const CONTENT_PAGE_COUNT = 68;
const SPELL_TOTAL = 339;

function completeLayout(
  probeLines: readonly string[],
  options: { readonly dropFirstHeading?: boolean; readonly spells?: number } = {},
): string {
  const spells = options.spells ?? SPELL_TOTAL;
  const groups = spellsByPage(spells, CONTENT_PAGE_COUNT, 5);
  const pages = groups.map((pageSpells, index) =>
    contentPage(
      107 + index,
      pageSpells,
      index === 0 && options.dropFirstHeading === true,
    ),
  );
  return [...pages, trailingPage(175, probeLines)].join('\f');
}

/**
 * Probe page for the `splitSafe` window. Column map (printed width 40, so the
 * search window is floor(40*0.35)=14 .. floor(40*0.65)=26):
 *
 *   0-4 ALPHA | 5-12 blank | 13 B | 14-15 blank | 16 C | 17-18 blank |
 *   19 D | 20-21 blank | 22-23 QQ | 24-26 blank | 27-39 OMEGARIGHTXYZ
 *
 * Probing columns c-1, c, c+1 leaves exactly one safe column, 25 (24/25/26 are
 * blank), so the gutter is 25 and the row splits as
 * `ALPHA        B  C  D  QQ` | `OMEGARIGHTXYZ`.
 *
 * Dropping the c-1 probe makes {14, 17, 20, 24, 25} safe — median 20.
 * Dropping the c+1 probe makes {15, 18, 21, 25, 26} safe — median 21.
 * Both of those cut before `QQ`, moving it into the right column.
 */
const SPLIT_SAFE_PROBE = `ALPHA${' '.repeat(8)}B  C  D  QQ   OMEGARIGHTXYZ`;

/**
 * Probe page for the *upper bound* of the gutter search. Column map (printed
 * width 40 again, window 14..26):
 *
 *   0-4 GAMMA | 5-12 blank | 13 B | 14-16 blank | 17-24 PQRSTUVW |
 *   25-27 blank | 28-39 ZETARIGHTXYZ
 *
 * Safe columns are 15 (14/15/16 blank) and 26 (25/26/27 blank). Two
 * candidates, so the median index floor(2/2)=1 selects 26 — the window's last
 * column — and the row splits as `GAMMA        B   PQRSTUVW` |
 * `ZETARIGHTXYZ`. A search that stops one column short keeps only 15, whose
 * split moves `PQRSTUVW` into the right column.
 */
const WINDOW_END_PROBE = `GAMMA${' '.repeat(8)}B   PQRSTUVW   ZETARIGHTXYZ`;

/**
 * Spell 339 is the last spell printed on page 174, so the probe page's two
 * column slices are appended to its body in reading order: left slice first,
 * then right slice, each trimmed and joined by a single space.
 */
const SPELL_339_WITH_SPLIT_SAFE_PROBE =
  `${SPELL_METADATA_LINE} ${bodyLine(339)} ` +
  `ALPHA${' '.repeat(8)}B  C  D  QQ OMEGARIGHTXYZ`;

const SPELL_339_WITH_WINDOW_END_PROBE =
  `${SPELL_METADATA_LINE} ${bodyLine(339)} ` +
  `GAMMA${' '.repeat(8)}B   PQRSTUVW ZETARIGHTXYZ`;

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error: unknown) {
    return error;
  }
  return null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : `not an error: ${String(error)}`;
}

describe('two-column gutter geometry', () => {
  it('slices at the median safe column, not one column to either side', () => {
    const descriptions = spellDescriptionsFromFullLayout(
      completeLayout([SPLIT_SAFE_PROBE]),
    );

    expect(descriptions.size).toBe(339);
    expect(descriptions.get('Spell 339')).toBe(SPELL_339_WITH_SPLIT_SAFE_PROBE);
  });

  it('searches through the last column of the gutter window', () => {
    const descriptions = spellDescriptionsFromFullLayout(
      completeLayout([WINDOW_END_PROBE]),
    );

    expect(descriptions.size).toBe(339);
    expect(descriptions.get('Spell 339')).toBe(SPELL_339_WITH_WINDOW_END_PROBE);
  });

  it('reads ordinary pages column-wise, left column before right', () => {
    const digests = spellBodyDigestInputsFromFullLayout(
      completeLayout([SPLIT_SAFE_PROBE]),
    );

    // Spells 1-3 print in page 107's left column, 4-5 in its right column;
    // each body runs from its metadata line to the next spell's heading.
    expect(digests.get('Spell 001')).toBe(
      `${SPELL_METADATA_LINE} ${bodyLine(1)}`,
    );
    expect(digests.get('Spell 004')).toBe(
      `${SPELL_METADATA_LINE} ${bodyLine(4)}`,
    );
    expect(digests.get('Spell 006')).toBe(
      `${SPELL_METADATA_LINE} ${bodyLine(6)}`,
    );
  });
});

describe('page footer and out-of-range page handling', () => {
  it('rejects spell metadata on an out-of-range page whose footer prints first', () => {
    // Page 106's footer is line 0 of the page, and the metadata beneath it is
    // indented. Both the footer search and the metadata scan must trim.
    const strayPage = [footerLine(106), `      ${SPELL_METADATA_LINE}`].join('\n');
    const layout = [strayPage, completeLayout([SPLIT_SAFE_PROBE])].join('\f');

    const error = thrownBy(() => spellDescriptionsFromFullLayout(layout));

    expect(error).toBeInstanceOf(TypeError);
    expect(messageOf(error)).toBe(
      'Found spell metadata outside the reviewed SRD spell pages 107-175 on ' +
        `page 106. ${REPIN}`,
    );
  });

  it('starts the reading order empty, so leading metadata has no heading', () => {
    // Page 107's left column opens on a metadata line with nothing printed
    // above it.
    const layout = completeLayout([SPLIT_SAFE_PROBE], { dropFirstHeading: true });

    const error = thrownBy(() => spellDescriptionsFromFullLayout(layout));

    expect(error).toBeInstanceOf(TypeError);
    expect(messageOf(error)).toBe(
      'Bundled spell metadata has no preceding heading.',
    );
  });
});

describe('page census', () => {
  it('rejects a corpus whose last reviewed page is missing', () => {
    const groups = spellsByPage(SPELL_TOTAL, CONTENT_PAGE_COUNT, 5);
    const layout = groups
      .map((pageSpells, index) => contentPage(107 + index, pageSpells))
      .join('\f');
    // Hand-built from the page list above: 107..174, 68 pages, none missing
    // in the middle, so only the count is wrong.
    const read = Array.from({ length: 68 }, (_unused, index) =>
      String(107 + index),
    ).join(', ');

    const error = thrownBy(() => spellDescriptionsFromFullLayout(layout));

    expect(error).toBeInstanceOf(TypeError);
    expect(messageOf(error)).toBe(
      `Expected complete SRD spell pages 107-175; read ${read}. ${REPIN}`,
    );
  });

  it('rejects 69 reviewed pages that are not 107..175 in order', () => {
    // 69 pages: 107 printed twice, then 108..174. The count is right; the
    // sequence is not, and it is wrong only from the second page onwards.
    const pageNumbers = [107, ...Array.from(
      { length: 68 },
      (_unused, index) => 107 + index,
    )];
    const groups = spellsByPage(4 * pageNumbers.length, pageNumbers.length, 4);
    const layout = pageNumbers
      .map((page, index) => contentPage(page, groups[index] ?? []))
      .join('\f');
    const read = pageNumbers.map((page) => String(page)).join(', ');

    const error = thrownBy(() => spellDescriptionsFromFullLayout(layout));

    expect(error).toBeInstanceOf(TypeError);
    expect(messageOf(error)).toBe(
      `Expected complete SRD spell pages 107-175; read ${read}. ${REPIN}`,
    );
  });

  it('rejects a complete page range that prints the wrong spell count', () => {
    const layout = completeLayout([SPLIT_SAFE_PROBE], { spells: 338 });

    const error = thrownBy(() => spellDescriptionsFromFullLayout(layout));

    expect(error).toBeInstanceOf(TypeError);
    expect(messageOf(error)).toBe(
      'Expected 339 SRD spell descriptions on pages 107-175; read 338. ' +
        REPIN,
    );
  });
});

describe('damage source-range containment', () => {
  it('drops a reverse-order type whose dice start inside an owned range', () => {
    // "2d8" starts at index 33; the forward scan owns [33, 36). The
    // reverse-order scan re-finds the same dice at 33, which is inside the
    // owned range, so it contributes nothing.
    const span = 'Fire damage: each creature takes 2d8 Fire damage.';

    expect(sourceDamageSignatures(span)).toStrictEqual([
      { dice_count: 2, die_size: 8, flat_modifier: null, damage_type: 'Fire' },
    ]);
  });

  it('keeps a reverse-order type whose dice start before every owned range', () => {
    // "2d10" at index 12 is never owned by the forward scan (a full stop
    // separates it from the word "damage"); "5d6" at 35 is, giving [35, 38).
    // 12 lies before that range on both ends of the containment test.
    const span = 'Fire damage 2d10. The target takes 5d6 Fire damage.';

    expect(sourceDamageSignatures(span)).toStrictEqual([
      { dice_count: 2, die_size: 10, flat_modifier: null, damage_type: 'Fire' },
      { dice_count: 5, die_size: 6, flat_modifier: null, damage_type: 'Fire' },
    ]);
  });

  it('keeps a reverse-order type whose dice start after every owned range', () => {
    // "2d6" at 17 is owned as [17, 20). The reverse-order scan reaches "4d8"
    // at 43, which is past the end of that range.
    const span = 'A creature takes 2d6 Fire damage, and then 4d8.';

    expect(sourceDamageSignatures(span)).toStrictEqual([
      { dice_count: 2, die_size: 6, flat_modifier: null, damage_type: 'Fire' },
      { dice_count: 4, die_size: 8, flat_modifier: null, damage_type: 'Fire' },
    ]);
  });
});

describe('damage occurrence offsets', () => {
  it('ignores a flat amount whose three preceding characters carry dice', () => {
    // The flat scan finds "5 Fire damage" at index 23; the three characters
    // before it are "d6 ", so the amount belongs to the printed dice
    // expression and is not a second, flat damage amount.
    const span = 'The creature takes 1d6 5 Fire damage.';

    expect(sourceDamageSignatures(span)).toStrictEqual([
      { dice_count: 1, die_size: 6, flat_modifier: null, damage_type: 'Fire' },
    ]);
  });

  it('orders a flat amount by its printed offset, not by zero', () => {
    // "2d6" starts at 17, the flat "4 Fire damage" at 48. Reported order is
    // by printed offset, so the dice come first.
    const span = 'The target takes 2d6 Cold damage. It then takes 4 Fire damage.';

    expect(sourceDamageSignatures(span)).toStrictEqual([
      { dice_count: 2, die_size: 6, flat_modifier: null, damage_type: 'Cold' },
      { dice_count: null, die_size: null, flat_modifier: 4, damage_type: 'Fire' },
    ]);
  });

  it('reports a flat amount span from its own offset and match length', () => {
    // Body column map:
    //   0-43  "Each creature makes a Dexterity saving throw"
    //   44    "."
    //   45    " "            <- the failure sentence starts here
    //   46-53 "Failure:"
    //   74    "7"            <- the flat amount
    //   81-86 "damage"
    //   87    "."            <- one past the end of "7 Fire damage"
    const body =
      'Each creature makes a Dexterity saving throw. ' +
      'Failure: The creature takes 7 Fire damage.';
    const coverage = deriveSaveDamageCoverageFromBodies(
      new Map([['Probe', body]]),
    );

    expect(coverage.candidates).toHaveLength(1);
    expect(coverage.candidates.map((clause) => clause.damage_occurrences))
      .toStrictEqual([[
        {
          damage_type: 'Fire',
          dice_count: null,
          die_size: null,
          flat_modifier: 7,
          arm: 'failure',
          timing: 'on_save_resolution',
          roll_transform: 'none',
          start: 74,
          end: 87,
          slot_index: 0,
          roll_index: 0,
        },
      ]]);
  });
});
