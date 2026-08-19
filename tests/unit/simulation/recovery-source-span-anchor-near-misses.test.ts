import { describe, expect, it } from 'vitest';
import { assertReviewedResourceRecoverySourceDigests } from '../../../src/simulation/coverage';

/**
 * Near-miss probes for the resource-recovery *source span* anchor guards in
 * `src/simulation/coverage.ts` — the pair of guards around
 * `resourceRecoverySourceSpan`:
 *
 * 1. the line-anchor guard (`firstLine < 0 || lastLine < firstLine`), fed by a
 *    `findIndex` for the start anchor and a second `findIndex` restricted to
 *    `index >= firstLine` for the end anchor, and
 * 2. the column-anchor guard (`start < 0 || end < start`), fed by the joined
 *    column slice `lines.slice(firstLine, lastLine + 1).map(...).filter(...)`.
 *
 * Both run at module evaluation against the committed corpus, where every
 * anchor is present, ordered, and inside its reviewed column. That arm alone
 * cannot distinguish `>=` from `>`, `||` from `&&`, or a present slice/filter
 * from an absent one. Every test below therefore drives the exported entry
 * point with a synthetic corpus whose *only* deviation from a passing layout is
 * the one dimension the guard under test checks.
 *
 * The synthetic corpus reproduces the four reviewed spans verbatim, in their
 * reviewed columns, so it satisfies the same SHA-256 oracle the real corpus
 * does. Anything that changes the extracted span — an extra line pulled in, a
 * dropped filter, a slice that never happened — changes a digest and is
 * reported as drift.
 */

const RAGE_COLUMN = 68;
const CHANNEL_DIVINITY_COLUMN = 64;
const SORCEROUS_RESTORATION_COLUMN = 63;

/**
 * The reviewed `rage` span, copied verbatim from the committed corpus reading.
 * It is carried here so a single line can present the whole span at once, which
 * is the only geometry that makes `lastLine === firstLine` reachable.
 */
const RAGE_SPAN =
  'You regain one ex- pended use when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest.';

const ANCHORS_MISSING =
  /^rage resource-recovery source span drift: its reviewed anchors are missing\.$/u;
const COLUMN_SLICE_MISSING =
  /^rage resource-recovery source span drift: its reviewed column slice is missing\.$/u;

type SourceGeometry = {
  /** Presents the whole `rage` span on one line, so `lastLine === firstLine`. */
  readonly rageAnchorsOnOneLine?: boolean;
  /** Drops the `rage` start-anchor line, so `firstLine < 0`. */
  readonly rageStartAnchorAbsent?: boolean;
  /** Breaks the terminal `Rest.` into `Rest!`, so `lastLine < firstLine`. */
  readonly rageEndAnchorAbsent?: boolean;
  /** Keeps the start anchor on its line but left of the reviewed column. */
  readonly rageStartAnchorLeftOfColumn?: boolean;
  /** Puts the end anchor ahead of the start anchor inside the column slice. */
  readonly rageEndAnchorBeforeStart?: boolean;
  /** Straddles a decoy `rage` start anchor across two lines above the span. */
  readonly straddledDecoyAboveRage?: boolean;
  /** Inserts a line that is empty inside the `channel_divinity` column. */
  readonly blankColumnInsideChannelDivinity?: boolean;
};

function atColumn(column: number, text: string): string {
  return `${' '.repeat(column)}${text}`;
}

/**
 * `font_of_magic` is the only row with a bounded column (0–59), and it is
 * placed at line index 0 on purpose: `firstLine === 0` is the one input that
 * separates the reviewed `firstLine < 0` from a `firstLine <= 0` near miss.
 */
const fontOfMagicLines: readonly string[] = [
  'You regain all ex-',
  'pended Sorcery Points when you finish a Long Rest.',
];

const sorcerousRestorationLines: readonly string[] = [
  atColumn(SORCEROUS_RESTORATION_COLUMN, 'When you finish a Short Rest, you can regain ex-'),
  atColumn(SORCEROUS_RESTORATION_COLUMN, 'pended Sorcery Points, but no more than a number'),
  atColumn(SORCEROUS_RESTORATION_COLUMN, 'equal to half your Sorcerer level (round down). Once'),
  atColumn(SORCEROUS_RESTORATION_COLUMN, 'you use this feature, you can’t do so again until you'),
  atColumn(SORCEROUS_RESTORATION_COLUMN, 'finish a Long Rest.'),
];

function channelDivinityLines(geometry: SourceGeometry): readonly string[] {
  const head = atColumn(
    CHANNEL_DIVINITY_COLUMN,
    'You regain one of its expended uses when you finish',
  );
  const tail = [
    atColumn(CHANNEL_DIVINITY_COLUMN, 'a Short Rest, and you regain all expended uses when'),
    atColumn(CHANNEL_DIVINITY_COLUMN, 'you finish a Long Rest. You gain additional uses'),
  ];
  return geometry.blankColumnInsideChannelDivinity === true
    ? [head, '', ...tail]
    : [head, ...tail];
}

/**
 * Neither line carries the `rage` start anchor on its own, so the start-anchor
 * `findIndex` still lands on the real span. The join across the two lines does
 * synthesise the anchor, which is visible only if the `lines.slice(...)` that
 * restricts the join to the span's own lines is gone.
 */
const straddledDecoyLines: readonly string[] = [
  atColumn(RAGE_COLUMN, 'You regain one'),
  atColumn(RAGE_COLUMN, 'ex- pended use when you finish a Short Rest.'),
];

function rageLines(geometry: SourceGeometry): readonly string[] {
  if (geometry.rageEndAnchorBeforeStart === true) {
    return [atColumn(RAGE_COLUMN, 'Long Rest. You regain one ex-')];
  }
  if (geometry.rageAnchorsOnOneLine === true) {
    return [atColumn(RAGE_COLUMN, RAGE_SPAN)];
  }
  const startLine =
    geometry.rageStartAnchorLeftOfColumn === true
      ? atColumn(RAGE_COLUMN - 8, 'You regain one ex-')
      : atColumn(RAGE_COLUMN, 'You regain one ex-');
  const rest = [
    atColumn(RAGE_COLUMN, 'pended use when you finish a Short Rest, and you'),
    atColumn(RAGE_COLUMN, 'regain all expended uses when you finish a Long'),
    atColumn(RAGE_COLUMN, geometry.rageEndAnchorAbsent === true ? 'Rest!' : 'Rest.'),
  ];
  return geometry.rageStartAnchorAbsent === true ? rest : [startLine, ...rest];
}

/**
 * `rage` is laid out last on purpose. Its end anchor is the bare `Rest.`, which
 * every other row's `Long Rest.` also contains; putting `rage` last is what
 * makes "there is no later line carrying the end anchor" a controllable
 * property of the fixture.
 */
function buildSource(geometry: SourceGeometry = {}): string {
  return [
    ...fontOfMagicLines,
    '',
    ...sorcerousRestorationLines,
    '',
    ...channelDivinityLines(geometry),
    '',
    ...(geometry.straddledDecoyAboveRage === true ? straddledDecoyLines : []),
    ...rageLines(geometry),
  ].join('\n');
}

describe('resource-recovery source span anchor near misses', () => {
  it('accepts a synthetic corpus that reproduces every reviewed span', () => {
    expect(() =>
      assertReviewedResourceRecoverySourceDigests(buildSource()),
    ).not.toThrow();
  });

  it('accepts a span whose start anchor sits on the first line of the corpus', () => {
    const source = buildSource();
    expect(source.split('\n')[0]).toBe('You regain all ex-');

    expect(() =>
      assertReviewedResourceRecoverySourceDigests(source),
    ).not.toThrow();
  });

  it('accepts a span whose end anchor shares the line with its start anchor', () => {
    const source = buildSource({ rageAnchorsOnOneLine: true });
    const lines = source.split('\n');
    const anchorLine = lines.findIndex((line) =>
      line.includes('You regain one ex-'),
    );

    expect(anchorLine).toBe(lines.length - 1);
    expect(lines[anchorLine]).toContain('Rest.');

    expect(() =>
      assertReviewedResourceRecoverySourceDigests(source),
    ).not.toThrow();
  });

  it('refuses a corpus whose start anchor is absent', () => {
    expect(() =>
      assertReviewedResourceRecoverySourceDigests(
        buildSource({ rageStartAnchorAbsent: true }),
      ),
    ).toThrow(ANCHORS_MISSING);
  });

  it('refuses a corpus whose end anchor is absent below the start anchor', () => {
    const source = buildSource({ rageEndAnchorAbsent: true });
    const lines = source.split('\n');
    const anchorLine = lines.findIndex((line) =>
      line.includes('You regain one ex-'),
    );

    expect(
      lines.slice(anchorLine).some((line) => line.includes('Rest.')),
    ).toBe(false);

    expect(() =>
      assertReviewedResourceRecoverySourceDigests(source),
    ).toThrow(ANCHORS_MISSING);
  });

  it('refuses a start anchor that sits left of its reviewed column', () => {
    const source = buildSource({ rageStartAnchorLeftOfColumn: true });
    const lines = source.split('\n');
    const anchorLine = lines.findIndex((line) =>
      line.includes('You regain one ex-'),
    );

    expect(anchorLine).toBeGreaterThanOrEqual(0);
    expect(lines[anchorLine]?.slice(RAGE_COLUMN)).not.toContain(
      'You regain one ex-',
    );

    expect(() =>
      assertReviewedResourceRecoverySourceDigests(source),
    ).toThrow(COLUMN_SLICE_MISSING);
  });

  it('refuses a column slice whose end anchor precedes its start anchor', () => {
    const source = buildSource({ rageEndAnchorBeforeStart: true });
    const columnSlice = source
      .split('\n')
      .filter((line) => line.includes('You regain one ex-'))
      .map((line) => line.slice(RAGE_COLUMN))[0];

    expect(columnSlice).toBeDefined();
    expect(columnSlice?.indexOf('Rest.')).toBeLessThan(
      columnSlice?.indexOf('You regain one ex-') ?? -1,
    );

    expect(() =>
      assertReviewedResourceRecoverySourceDigests(source),
    ).toThrow(COLUMN_SLICE_MISSING);
  });

  it('reads the column slice only from the span’s own lines', () => {
    const source = buildSource({ straddledDecoyAboveRage: true });
    const lines = source.split('\n');

    // No single line carries the start anchor except the real span's own line.
    expect(
      lines.filter((line) => line.includes('You regain one ex-')),
    ).toHaveLength(1);
    // An unrestricted join, however, synthesises a decoy span above it.
    const unrestrictedColumn = lines
      .map((line) => line.slice(RAGE_COLUMN).trim())
      .filter((line) => line.length > 0)
      .join(' ');
    expect(unrestrictedColumn).toContain(
      'You regain one ex- pended use when you finish a Short Rest.',
    );

    expect(() =>
      assertReviewedResourceRecoverySourceDigests(source),
    ).not.toThrow();
  });

  it('drops lines that are empty inside the reviewed column', () => {
    const source = buildSource({ blankColumnInsideChannelDivinity: true });
    const lines = source.split('\n');
    const anchorLine = lines.findIndex((line) =>
      line.includes('You regain one of its expended uses when you finish'),
    );

    expect(lines[anchorLine + 1]).toBe('');

    expect(() =>
      assertReviewedResourceRecoverySourceDigests(source),
    ).not.toThrow();
  });
});
