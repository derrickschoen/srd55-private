import { describe, expect, it } from 'vitest';
// Side-effect import: registers this file in vitest's module graph so Stryker's
// vitest-runner "related tests" selection includes it for mutants in
// `spell-source-reader.ts`. A file that only reached the module through a
// dynamic import inside a test body would be invisible to that selection.
import '../../../src/simulation/spell-source-reader';
import {
  deriveSaveDamageCoverageFromBodies,
  sourceDamageSignatures,
} from '../../../src/simulation/spell-source-reader';

/**
 * Near-miss probes for the three damage-group boundary computations in
 * `src/simulation/spell-source-reader.ts`:
 *
 *   1. `damageOccurrenceGroups`'s closing `filter(...).sort(...)` — the
 *      merge/dedup of a type-less group against a typed group that starts at
 *      the same index, and the re-sort that puts the four pattern families
 *      (forward dice, flat, reverse dice, fallbacks) back into source order.
 *   2. `sourceDamageOccurrences`'s "one roll" marker scoping — the half-open
 *      intervals `[previousMarkerEnd, markerStart]` (groups the marker looks
 *      back at) and `[markerEnd, nextMarkerStart)` (groups it looks forward
 *      at).
 *   3. The roll-boundary and timing-window decisions — `group.start >=
 *      previous.end`, the same-slice/same-marker roll merge, and the timing
 *      window that ends at the next group's start, or failing that at the
 *      sentence end.
 *
 * FIXTURES ARE SYNTHETIC AND HAND-DERIVED. Every body below is written so that
 * the interesting index relation is exact — a group that starts at offset 0 of
 * its slice, a group that starts on the character after the previous group's
 * last, a group nested inside another group's span, a sentence that ends
 * without a period. Each expectation is derived from the fixture text by hand
 * in the comment above it and, where an offset is asserted, recomputed in the
 * test with `indexOf` against the fixture rather than read back from the
 * parser.
 *
 * HOW THE PARSER IS DRIVEN. `damageOccurrenceGroups` and
 * `sourceDamageOccurrences` are module-private. The exported
 * `sourceDamageSignatures` is a direct wrapper over the former, so cluster 1
 * is probed through it. Clusters 2 and 3 need the occurrence records
 * (slot/roll indexes and timing), which surface on the derived save-damage
 * clause, so they are probed through `deriveSaveDamageCoverageFromBodies` over
 * a one-entry body map — the same driving pattern the review-round tests use.
 *
 * SKIPPED-EQUIVALENT mutants (no vacuous test is written for these; the
 * subsumption proofs are recorded at the bottom of this file).
 */

const HEADING = 'Boundary Fixture';

type ProbeOccurrence = {
  readonly slot_index: number;
  readonly roll_index: number;
  readonly timing: string;
  readonly start: number;
  readonly end: number;
};

function failureOccurrences(body: string): readonly ProbeOccurrence[] {
  const clause = deriveSaveDamageCoverageFromBodies(new Map([[HEADING, body]]))
    .clauses_by_heading.get(HEADING)?.[0];
  if (clause === undefined) {
    throw new Error(`The boundary fixture derived no save-damage clause: ${body}`);
  }
  return clause.damage_occurrences
    .filter((occurrence) => occurrence.arm === 'failure')
    .map((occurrence) => ({
      slot_index: occurrence.slot_index,
      roll_index: occurrence.roll_index,
      timing: occurrence.timing,
      start: occurrence.start,
      end: occurrence.end,
    }));
}

function slotsAndRolls(
  occurrences: readonly ProbeOccurrence[],
): readonly (readonly [number, number])[] {
  return occurrences.map((occurrence) => [occurrence.slot_index, occurrence.roll_index] as const);
}

describe('damage-group merge and dedup at a shared start index', () => {
  /**
   * The forward dice pattern (`\d+d\d+ ... damage`) reads "2d6 damage" with no
   * damage type between the dice and the word `damage`, so it contributes a
   * group at the index of "2d6" whose single signature is type-less. The
   * reverse pattern (`<type> damage ... \d+d\d+`) then reads "Fire damage is
   * dealt: each target takes 2d6" and contributes a Fire group anchored on the
   * SAME "2d6" — it is not suppressed as directly-owned, because the forward
   * group carried no type and so never claimed the dice.
   *
   * Two groups, one start index, one of them type-less: the type-less one is
   * the parse artifact and must be dropped, leaving 2d6 Fire.
   */
  it('drops the type-less group that a typed group already covers at the same start', () => {
    const span = 'Fire damage is dealt: each target takes 2d6 damage';

    expect(sourceDamageSignatures(span)).toStrictEqual([
      { dice_count: 2, die_size: 6, flat_modifier: null, damage_type: 'Fire' },
    ]);
  });

  /**
   * The same two shapes, but now at DIFFERENT start indexes: "2d6 damage" is
   * type-less at the index of "2d6", and "3d8 Fire damage" is a typed group at
   * the index of "3d8". Nothing anchors the two together, so the type-less
   * group is real damage the source did not type, and both survive.
   *
   * This is the near miss for a dedup that drops a type-less group whenever
   * ANY typed group exists, rather than one that starts at the same index.
   */
  it('keeps a type-less group when the typed group starts somewhere else', () => {
    const span = 'each target takes 2d6 damage and 3d8 Fire damage';
    expect(span.indexOf('2d6')).not.toBe(span.indexOf('3d8'));

    expect(sourceDamageSignatures(span)).toStrictEqual([
      { dice_count: 2, die_size: 6, flat_modifier: null, damage_type: null },
      { dice_count: 3, die_size: 8, flat_modifier: null, damage_type: 'Fire' },
    ]);
  });

  /**
   * Push order versus source order. The forward dice pattern runs first and
   * appends "3d8 Cold damage" then "4d10 Acid damage"; the flat pattern runs
   * second and appends "7 Fire damage", which stands EARLIEST in the text. So
   * the pushed order is [3d8, 4d10, 7-flat] while the source order is
   * [7-flat, 3d8, 4d10].
   *
   * Three groups are the minimum that separates "sorted ascending by start"
   * from both of its near misses: dropping the sort leaves [3d8, 4d10, flat],
   * and a comparator that adds the two starts instead of subtracting them
   * makes every comparison positive, which reverses the pushed order to
   * [flat, 4d10, 3d8]. Ascending-by-start is the only ordering that is neither
   * of those.
   */
  it('sorts groups from different pattern families back into source order', () => {
    const span =
      'each target takes 7 Fire damage and then 3d8 Cold damage and then 4d10 Acid damage';
    expect(span.indexOf('7 Fire')).toBeLessThan(span.indexOf('3d8'));
    expect(span.indexOf('3d8')).toBeLessThan(span.indexOf('4d10'));

    expect(sourceDamageSignatures(span)).toStrictEqual([
      { dice_count: null, die_size: null, flat_modifier: 7, damage_type: 'Fire' },
      { dice_count: 3, die_size: 8, flat_modifier: null, damage_type: 'Cold' },
      { dice_count: 4, die_size: 10, flat_modifier: null, damage_type: 'Acid' },
    ]);
  });
});

describe('one-roll marker interval boundaries', () => {
  /**
   * The clause span starts on the dice, so the first group starts at offset 0
   * of its slice — exactly the `previousMarkerEnd` the first marker gets when
   * there is no marker before it. The look-back window is inclusive of that
   * offset, so BOTH groups precede the marker "as one damage roll", both are
   * scoped to it, and they therefore share one damage roll.
   *
   * Hand derivation on the span
   * "3d6 Fire damage and 2d8 Cold damage as one damage roll are dealt ...":
   *   group 0 = "3d6 Fire damage" at [0, 15)
   *   group 1 = "2d8 Cold damage" at [20, 35)
   *   marker  = "as one damage roll" at 36, so both ends (15, 35) <= 36
   *   the text between group 1 and the marker is a single space, not a comma,
   *   so the look-back result is used rather than the look-forward one.
   * Two slots (the groups are separate damage entries) but one roll index.
   */
  it('scopes a group that starts at offset 0 of its slice to the first marker', () => {
    const body =
      '3d6 Fire damage and 2d8 Cold damage as one damage roll are dealt on a failed save ' +
      'to each target of the Dexterity saving throw.';
    expect(body.indexOf('3d6')).toBe(0);

    expect(slotsAndRolls(failureOccurrences(body))).toStrictEqual([
      [0, 0],
      [1, 0],
    ]);
  });

  /**
   * A comma between the preceding group and the marker means the marker is an
   * aside about what FOLLOWS it, not a summary of what came before, so the
   * look-forward window `[markerEnd, nextMarkerStart)` is used instead.
   *
   * Hand derivation on the span
   * "Each target takes 1d6 Fire damage, as one damage roll, plus 2d8 Cold damage ...":
   *   group 0 = "1d6 Fire damage" at [18, 33)
   *   marker  = "as one damage roll" at [35, 53)
   *   group 1 = "2d8 Cold damage" at [60, 75)
   * Only group 1 starts at or after 53, so only group 1 is scoped; group 0 is
   * left unscoped and the two groups keep separate rolls.
   *
   * The gap between the marker's start (35) and group 0's start (18) is 17
   * characters, one less than the marker's own length of 18 — so a window that
   * measured backwards from the marker start, or that ignored the lower bound
   * altogether, would sweep group 0 in and merge the two rolls.
   */
  it('excludes the group before a comma-delimited marker from its forward window', () => {
    const body =
      'Each target takes 1d6 Fire damage, as one damage roll, plus 2d8 Cold damage ' +
      'on a failed save of the Dexterity saving throw.';
    const markerStart = body.indexOf('as one damage roll');
    expect(markerStart - body.indexOf('1d6')).toBe(17);
    expect('as one damage roll'.length).toBe(18);

    expect(slotsAndRolls(failureOccurrences(body))).toStrictEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  /**
   * Two markers. The first marker's forward window must stop at the second
   * marker's start; groups beyond the second marker belong to neither.
   *
   * Hand derivation on the span
   * "Each target takes 1d6 Fire damage, as one damage roll, plus 2d8 Cold damage
   *  as one damage roll, then 3d10 Acid damage and 4d4 Force damage ...":
   *   group 0 = "1d6 Fire damage"  — before marker 0, comma-delimited
   *   marker 0 = "as one damage roll" (comma before it -> forward window)
   *   group 1 = "2d8 Cold damage"   — inside [marker0End, marker1Start)
   *   marker 1 = "as one damage roll" (space before it -> look-back window,
   *              which finds group 1 and re-scopes it to marker 1)
   *   group 2 = "3d10 Acid damage"  — after marker 1, unscoped
   *   group 3 = "4d4 Force damage"  — after marker 1, unscoped
   * Rolls: group 0 unscoped -> 0; group 1 changes scope -> 1; groups 2 and 3
   * are unscoped, and an unscoped group never merges with anything, so they
   * take 2 and 3. Four groups, four slots, four rolls.
   *
   * If the first marker's forward window ran to the end of the slice instead
   * of stopping at the next marker, groups 2 and 3 would both land in marker
   * 0's scope and would collapse into a single roll.
   */
  it('stops the first marker forward window at the second marker', () => {
    const body =
      'Each target takes 1d6 Fire damage, as one damage roll, plus 2d8 Cold damage ' +
      'as one damage roll, then 3d10 Acid damage and 4d4 Force damage ' +
      'on a failed save of the Dexterity saving throw.';
    expect(body.indexOf('3d10')).toBeGreaterThan(body.lastIndexOf('as one damage roll'));

    expect(slotsAndRolls(failureOccurrences(body))).toStrictEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  /**
   * Marker scopes are numbered PER SLICE, so the first marker of the second
   * sentence carries the same ordinal (0) as the first marker of the first
   * sentence. Two groups in different sentences that are each scoped to their
   * own sentence's first marker therefore agree on the scope number and
   * disagree on the slice — and they must not be merged into one damage roll,
   * because nothing in the source says the two sentences share a roll.
   *
   * Hand derivation: each sentence contributes one group ("1d6 Fire damage",
   * "2d8 Cold damage"), each sentence has exactly one marker directly after
   * its group with a space (not a comma) in between, so each group is scoped
   * to ordinal 0 of its own slice. Different slices -> separate rolls.
   */
  it('does not merge equal marker ordinals that come from different slices', () => {
    const body =
      'Each target makes a Dexterity saving throw, taking 1d6 Fire damage as one damage roll ' +
      'on a failed save. The target takes 2d8 Cold damage as one damage roll on a failed save.';

    expect(slotsAndRolls(failureOccurrences(body))).toStrictEqual([
      [0, 0],
      [1, 1],
    ]);
  });
});

describe('sentence-end and next-group timing boundaries', () => {
  /**
   * Exact adjacency. The forward dice pattern stops at the first `damage` it
   * can reach, so "1d4 damage2d6 Fire damage" is read as two matches whose
   * ranges touch: the first ends on the character that the second starts on.
   *
   * Hand derivation on the span
   * "Each target makes a Dexterity saving throw, taking 1d4 damage2d6 Fire damage
   *  on a failed save.":
   *   group 0 = "1d4 damage"      at [51, 61)
   *   group 1 = "2d6 Fire damage" at [61, 76)
   * `group1.start === group0.end`, and the roll boundary is inclusive of that
   * equality, so group 1 opens a new roll. A boundary that required a strict
   * gap would treat the touching groups as one roll.
   */
  it('opens a new roll for a group that starts on the previous group last index', () => {
    const body =
      'Each target makes a Dexterity saving throw, taking 1d4 damage2d6 Fire damage ' +
      'on a failed save.';
    const occurrences = failureOccurrences(body);

    expect(occurrences[0]?.end).toBe(body.indexOf('2d6'));
    expect(occurrences[1]?.start).toBe(body.indexOf('2d6'));
    expect(slotsAndRolls(occurrences)).toStrictEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  /**
   * Nested groups. "2d6 plus 7 Fire damage" is one forward-dice group running
   * from the dice to the word `damage`, and "7 Fire damage" is a flat-damage
   * group nested inside it — same end, later start.
   *
   * Hand derivation on the span
   * "Each target makes a Constitution saving throw, taking 2d6 plus 7 Fire damage
   *  at the end of its next turn on a failed save.":
   *   group 0 = "2d6 plus 7 Fire damage" at [54, 76)
   *   group 1 = "7 Fire damage"          at [63, 76)
   * Group 0's timing window runs from its own end (76) to the NEXT group's
   * start (63) — an inverted, therefore empty, window. An empty window carries
   * no delayed-timing phrase, so group 0 resolves on the save. Group 1 is
   * last, so its window falls back to the sentence end and does read
   * "at the end of its next turn".
   *
   * The near miss is a window that fell back to the sentence end even when a
   * next group exists: that would hand group 0 the delayed phrase as well.
   */
  it('reads an empty timing window when the next group starts inside this one', () => {
    const body =
      'Each target makes a Constitution saving throw, taking 2d6 plus 7 Fire damage ' +
      'at the end of its next turn on a failed save.';
    const occurrences = failureOccurrences(body);

    expect(occurrences[1]?.start).toBeLessThan(occurrences[0]?.end ?? -1);
    expect(occurrences.map((occurrence) => occurrence.timing)).toStrictEqual([
      'on_save_resolution',
      'end_of_target_next_turn',
    ]);
  });

  /**
   * The last sentence of this body has no terminating period, so there is no
   * sentence end after the group and the timing window has to run to the end
   * of the span. The delayed-timing phrase is the last thing in the body, so
   * a window that stopped even one character short would read
   * "at the end of its next tur" and fall back to on-save timing.
   *
   * Hand derivation: the only group is "1d6 Fire damage"; the text after it is
   * exactly " at the end of its next turn", which is the delayed timing.
   */
  it('reads the timing phrase to the end of an unterminated final sentence', () => {
    const body =
      'Each target makes a Dexterity saving throw. Failure: The target takes ' +
      '1d6 Fire damage at the end of its next turn';
    expect(body.endsWith('turn')).toBe(true);
    expect(body.indexOf('.', body.indexOf('1d6'))).toBe(-1);

    expect(failureOccurrences(body).map((occurrence) => occurrence.timing)).toStrictEqual([
      'end_of_target_next_turn',
    ]);
  });
});

/**
 * SKIPPED-EQUIVALENT MUTANTS
 * ==========================
 *
 * Three structural facts about the parser make a family of boundary mutants
 * unobservable. Each is proved from the code, not from a test run, and each
 * proof names every place the mutated value is read.
 *
 * LEMMA A (group signatures are homogeneous and non-empty). Every group is
 * built with either a one-element signature list, or `(types.length === 0 ?
 * [null] : types).map(...)` — a list of one null type, or a list of one or
 * more non-null types. No group ever mixes a null and a non-null damage type,
 * and no group has an empty signature list. Therefore, over a group's
 * signatures, `every(t === null)`, `some(t === null)` and `!some(t !== null)`
 * all agree, and so do `some(t !== null)` and `every(t !== null)`.
 *   - `group.signatures.every(t === null)` -> `some`: EQUIVALENT by Lemma A.
 *   - `candidate.signatures.some(t !== null)` -> `every`: EQUIVALENT by Lemma A.
 *
 * LEMMA B (a group always starts on a digit). All five group producers anchor
 * `start` on the first digit of a dice or flat-damage expression, and all of
 * them end on a word character — the last letter of `damage`, or the last
 * digit of a dice expression.
 *
 * LEMMA C (a one-roll marker never abuts a digit). The marker pattern is
 * `\b(?:as\s+)?one(?:\s+damage)?\s+roll\b`. It contains no digits, and its two
 * word boundaries force the character immediately before its start and the
 * character immediately after its end to be non-word characters — in
 * particular, not digits. With Lemma B: no group starts inside a marker, no
 * group starts exactly at a marker's end, and no group ends exactly at a
 * marker's start.
 *
 * Marker-interval mutants that Lemmas B and C make unobservable:
 *   - `markerEnd = markerStart + (marker[0]?.length ?? 0)` -> `&& 0`
 *     (markerEnd collapses to markerStart). `markerEnd` is read in exactly one
 *     place, `group.start >= markerEnd`. The two values differ only for a
 *     group starting inside the marker text, which Lemma C forbids.
 *   - the same collapse for `previousMarkerEnd`, read only in
 *     `group.start >= previousMarkerEnd`: same argument.
 *   - `group.end <= markerStart` -> `<`: differs only at equality, forbidden
 *     by Lemma C.
 *   - `group.start >= markerEnd` -> `>`: differs only at equality, forbidden
 *     by Lemma C.
 *   - `group.start < nextMarkerStart` -> `<=`: differs only at equality.
 *     `nextMarkerStart` is either a marker start (forbidden by Lemma C) or the
 *     slice length, which no group start can equal because every group is
 *     non-empty.
 *   - `marker[0]?.length` -> `marker[0].length` and the same on
 *     `previousMarker[0]`: both operands come from `matchAll`, whose results
 *     always have a defined element 0, so the optional chain never
 *     short-circuits and the two expressions have the same value.
 *
 * `preceding.length === 0 ? undefined : occurrenceGroups[preceding.at(-1)]`
 * -> condition `false`: with `preceding` empty, `preceding[preceding.length -
 * 1]` is `preceding[-1]`, which is `undefined`, and `occurrenceGroups[
 * undefined]` is `undefined` as well. Both branches produce `undefined`, so
 * `lastPreceding` is unchanged. EQUIVALENT.
 *
 * `previous === undefined ? '' : span.slice(...)` -> `'Stryker was here!'`:
 * the bridge is read only by `/\bor\s*$/iu.test(bridge)`, and its value is
 * used only when `previous !== undefined` — the branch that is not mutated —
 * because `index === 0` short-circuits the slot update and `previous !==
 * undefined` guards the roll update. In addition the injected literal does not
 * end in a standalone `or`, so even the regex verdict is unchanged.
 * EQUIVALENT.
 *
 * `index === 0 || !sharesAlternativeSlot` -> `false || !sharesAlternativeSlot`
 * (mutating the LEFT operand alone): the body of that `if` assigns `nextSlot =
 * index === 0 ? 0 : nextSlot + 1`. For `index === 0` it assigns 0, which is
 * the value `nextSlot` already holds from its initializer, so skipping the
 * body at index 0 changes nothing. EQUIVALENT. (Mutating the whole condition
 * to `false` is a different mutant, and it is killed above: every fixture with
 * two or more groups asserts strictly increasing slot indexes.)
 *
 * `sentenceEnd < 0 ? span.length : sentenceEnd` -> condition `true` (always
 * take `span.length`): the timing window is only ever tested with
 * `/^\s*at the end of its next turn/iu`, an anchored prefix test, so widening
 * the window's END can only matter if the narrower window truncated the
 * phrase. Truncation at `sentenceEnd` requires a `.` between the group's end
 * and the end of the phrase; the phrase contains no `.`, and if the `.` came
 * before the phrase then the narrow window starts with `.` and the wide window
 * starts with the same `.` — both fail the anchor. So the two windows always
 * agree on the verdict. EQUIVALENT.
 *
 * `sentenceEnd < 0` -> `sentenceEnd <= 0`: differs only when `sentenceEnd ===
 * 0`, i.e. `span.indexOf('.', group.end) === 0`, which needs `group.end === 0`
 * — impossible, because every group is non-empty and starts at a
 * non-negative index. EQUIVALENT.
 *
 * `candidate !== group && ...` -> `true && ...` (mutating the LEFT operand
 * alone): the enclosing `some(...)` is only reached for a group whose
 * signatures are all type-less (Lemma A makes the first disjunct of the filter
 * true otherwise), and for `candidate === group` the third conjunct
 * `candidate.signatures.some(t !== null)` is then false. Admitting the group
 * as its own candidate therefore cannot make the `some` true. EQUIVALENT.
 *
 * `candidate.signatures.some(t !== null)` -> `true` (via the inner `t !== null`
 * -> `true`, which holds for the non-empty list of Lemma A): the dedup would
 * then drop a type-less group whenever ANY OTHER group starts at the same
 * index. Two distinct type-less groups cannot share a start: the forward dice
 * pattern is the only producer of type-less groups that can fire more than
 * once, and `matchAll` yields non-overlapping matches at distinct indexes,
 * while the two type-less fallbacks each fire only when no group exists at
 * all. So the only same-start pairing is type-less against typed, which the
 * unmutated code drops as well. EQUIVALENT.
 *
 * `signature.damage_type === null` -> `true` inside the filter's first
 * disjunct (making `every(...)` true and the disjunct false for every group):
 * the filter then keeps a group only when no OTHER group starts at its index
 * with a typed signature. For a type-less group that is the unmutated
 * behaviour. For a typed group it would be a change — but it requires two
 * typed groups at one start index, which cannot happen: a forward-dice group
 * that carried a type registers its dice as directly owned, and the reverse
 * pattern skips any dice already owned; flat groups start on `<digits> <type>`
 * and dice groups on `<digits>d`, which cannot be the same character run; and
 * `matchAll` never yields two matches of one pattern at one index. EQUIVALENT.
 */
