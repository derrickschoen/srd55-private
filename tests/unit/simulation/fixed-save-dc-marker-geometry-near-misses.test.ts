import { describe, expect, it } from 'vitest';
// Side-effect import: registers this file against the module under test in
// vitest's module graph so Stryker's vitest-runner "related tests" selection
// includes it. The assertions below use the named import on the next line.
import '../../../src/simulation/spell-source-reader';
import { sourceFixedSaveDc, sourceSentences } from '../../../src/simulation/spell-source-reader';

/**
 * Near-miss probes for the two geometric halves of the fixed-save-DC reader in
 * `src/simulation/spell-source-reader.ts`:
 *
 *   CLUSTER 1 — `dcVocabularyNumericCandidates()`, the marker/number distance
 *   geometry that decides WHICH `DC` / `D.C.` / `Difficulty Class` marker a
 *   numeral belongs to, what span the resulting candidate covers, and in what
 *   order the candidates are reported.
 *
 *   CLUSTER 2 — `sourceFixedSaveDc()`'s interval algebra over the recognized
 *   fixed-DC ranges: the OVERLAP test that drops a recognized range owned by an
 *   ability check, and the CONTAINMENT test that decides whether a numeric
 *   candidate is covered by a recognized range or is an unrepresentable
 *   leftover.
 *
 * WHY THE FIXTURES LOOK THE WAY THEY DO. Both clusters are pure interval
 * arithmetic, so a fixture only discriminates if it differs from a valid SRD
 * sentence in exactly the measured dimension: a marker one token further away
 * than the other marker, a numeral abutting `D.C.` with no space, a candidate
 * whose span pokes one character past a recognized range, two intervals that
 * touch at a single index without overlapping. Real SRD prose (see
 * `docs/srd/source/spell-descriptions.txt`, and the corpus controls in
 * `review-round-12/13/14/15.test.ts`) never prints these shapes, which is
 * precisely why they were unreachable from the corpus tests. Every fixture
 * below keeps SRD layout conventions — "<Ability> saving throw", "DC <n>",
 * "D.C.", "Difficulty Class", one sentence per period — and bends exactly one.
 *
 * DERIVATION DISCIPLINE. Every expectation below is derived by hand from the
 * fixture text and the algorithm, and the derivation is written out in the
 * test. Nothing here was read back out of the implementation's output.
 *
 * Two facts used repeatedly in the derivations:
 *
 *   (F-a) A marker match and a numeral match can never overlap: the marker
 *         alternatives are `DC`, `D.C.` and `Difficulty Class`, none of which
 *         contains a digit, and the numeral pattern is `\b\d+\b`.
 *   (F-b) `candidate.start = min(marker.start, number.start)` and
 *         `candidate.end = max(marker.end, number.end)`, so a candidate's span
 *         always begins at a marker's `D` or at a digit and always ends one
 *         past a marker's last character or one past a digit.
 *
 * SKIPPED-EQUIVALENT. Ten of the twenty-six surviving mutants in these two
 * regions cannot be observed by ANY input, so no test is written for them; a
 * test that appeared to cover them would be covering something else. The
 * subsumption argument for each:
 *
 *   707, 712, 838 `match[0]?.length` -> `match[0].length`. Element 0 of a
 *     successful `RegExp` match is always the matched substring, never
 *     `undefined`, so the guard never fires and neither form can throw.
 *
 *   720 `candidate.end <= numberStart` -> `<`. The two forms differ only at
 *     `candidate.end === numberStart`, and there the mutant falls through to
 *     the second test, `candidate.start >= numberEnd`. From
 *     `marker.start < marker.end = numberStart < numberEnd` that test is false,
 *     so the mutant yields 0 — the same value the original computes as
 *     `numberStart - candidate.end`.
 *
 *   722 `candidate.start >= numberEnd` -> `true`, and -> `>`. This test is
 *     reached only when `candidate.end > numberStart`, which by (F-a) means the
 *     marker lies wholly after the numeral, i.e. `candidate.start >= numberEnd`
 *     already holds. So the test is constantly true when evaluated (making
 *     `-> true` equivalent and the `: 0` arm dead), and its boundary case
 *     `candidate.start === numberEnd` yields 0 under both `>=` (via
 *     `candidate.start - numberEnd`) and `>` (via the dead arm).
 *
 *   738 `sentence.slice(start, end).trim()` -> without `.trim()`. By (F-b) the
 *     slice's first and last characters are always a letter or a digit, so
 *     `trim()` is the identity on it.
 *
 *   743 `left.start - right.start` -> `+`. This is the tiebreak used only when
 *     two candidates share a marker distance. Candidate starts are
 *     non-decreasing in generation order: suppose numeral j came after numeral
 *     i but `start_j < start_i`; then j's marker begins before numeral i, hence
 *     ends before i's marker does, and a short case analysis on whether i's
 *     marker precedes or follows numeral i shows i's marker would have been
 *     strictly closer to numeral j than j's chosen marker — contradicting the
 *     choice. Two candidates can also never share BOTH a distance and a start.
 *     So for every pair the original returns a strictly positive value exactly
 *     where the mutant does, and the sorted order is identical.
 *
 *   748 replacement `''` -> `"Stryker was here!"`. The replaced text is
 *     `spell save DC`, which contains no save-bearing vocabulary, so no match
 *     is lost by either form. `\bspell save DC\b` forces the characters
 *     flanking the replaced region to be non-word characters or string edges,
 *     so in the deletion form the seam is two adjacent non-word characters —
 *     and no alternative of the save-bearing pattern contains two adjacent
 *     non-word characters, so no match can span the seam. In the substitution
 *     form the inserted words contain none of the vocabulary either. Neither
 *     form can create or destroy a match.
 *
 *   845 `candidate.start < range.end` -> `<=`. The two differ only at
 *     `candidate.start === range.end`. Every recognized pattern ends on
 *     `\d+\b` or `throw\b`, so `range.end` indexes a non-word character or the
 *     end of the sentence, while by (F-b) `candidate.start` indexes a letter or
 *     a digit. The equality is unreachable. (The mirrored `range.start <
 *     candidate.end` -> `<=` IS reachable — `D.C.` ends on a period — and is
 *     killed by the last test in this file.)
 */

describe('fixed save DC marker geometry (cluster 1: dcVocabularyNumericCandidates)', () => {
  it('binds a numeral to the near preceding marker rather than a far trailing one', () => {
    // Layout: one numeral, two markers. `DC` sits one space BEFORE `15`;
    // `Difficulty Class` sits far AFTER it.
    //
    //   "...against DC 15 as printed in the stated Difficulty Class table."
    //
    // Preceding-marker distance  = 15.start - DC.end                 = 1
    // Trailing-marker distance   = DifficultyClass.start - 15.end    = 26
    //                              (" as printed in the stated " = 26 chars)
    //
    // The preceding marker wins, so the candidate is "DC 15", which sits
    // wholly inside the range recognized by the
    // "<Ability> saving throw against DC <n>" pattern (that range runs from
    // "Dexterity" through "15"). Nothing is left unrepresented, so the reader
    // reports the fixed DC.
    const wording =
      'A creature makes a Dexterity saving throw against DC 15 as printed ' +
      'in the stated Difficulty Class table.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({ status: 'available', value: 15 });

    // Control for the same sentence with the trailing marker removed: the
    // binding above is a property of the geometry, not of the trailing text.
    expect(sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw against DC 15 as printed in the stated table.',
    )).toEqual({ status: 'available', value: 15 });
  });

  it('binds a numeral to the near trailing marker rather than a far preceding one', () => {
    // Mirror of the previous case: the near marker is now AFTER the numeral.
    //
    //   "...against the DC listed here, and the 15 D.C. printed later..."
    //
    // Preceding-marker distance = 15.start - DC.end   = 22
    //                             (" listed here, and the " = 22 chars)
    // Trailing-marker distance  = D.C..start - 15.end = 1
    //
    // The trailing marker wins, so the candidate spans "15 D.C." — numeral
    // first, marker last. No recognized fixed-DC pattern matches this sentence
    // ("against the DC listed" is not "against a DC <n>"), so the candidate is
    // an unrepresentable leftover and is quoted verbatim in the refusal. The
    // doubled period is the candidate's own trailing "D.C." plus the message's
    // full stop.
    const wording =
      'A creature makes a Dexterity saving throw against the DC listed here, ' +
      'and the 15 D.C. printed later governs the effect.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: 15 D.C..',
    });
  });

  it('reports a trailing-marker candidate ahead of a farther preceding-marker candidate', () => {
    // Two candidates, and only their marker distances decide which one is
    // quoted:
    //
    //   "...the 15 D.C. governs it, and the Difficulty Class of 20 also appears."
    //
    //   candidate "15 D.C."              distance = D.C..start - 15.end = 1
    //   candidate "Difficulty Class of 20" distance = 20.start - Class.end = 4
    //                                                 (" of " = 4 chars)
    //
    // Neither is covered by a recognized pattern, so the FIRST in distance
    // order — the trailing-marker candidate at distance 1 — is the one quoted.
    const wording =
      'A creature makes a Dexterity saving throw, the 15 D.C. governs it, ' +
      'and the Difficulty Class of 20 also appears.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: 15 D.C..',
    });
  });

  it('orders two zero-distance abutting D.C. candidates by position, not by width', () => {
    // `D.C.` is the one marker spelling that can abut a numeral with no
    // separator, because its match has no trailing word boundary to satisfy
    // (`DC\b` and `Difficulty Class\b` both do, and a digit cannot follow a
    // word boundary that ends on a letter). Both candidates therefore have
    // marker distance exactly 0:
    //
    //   "...is D.C.7 or D.C.12 as written."
    //
    //   candidate "D.C.7"   distance = 7.start  - D.C..end = 0
    //   candidate "D.C.12"  distance = 12.start - D.C..end = 0
    //
    // With the distances tied, position breaks the tie, so the EARLIER
    // candidate "D.C.7" is quoted — even though it is the narrower one and the
    // later candidate carries the wider numeral. The differing numeral widths
    // are deliberate: they make "earliest wins" distinguishable from any
    // width-derived ordering.
    const wording =
      'A creature makes a Dexterity saving throw, and the printed statistic ' +
      'is D.C.7 or D.C.12 as written.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: D.C.7.',
    });
  });
});

describe('fixed save DC candidate ranges (cluster 2: recognized-range algebra)', () => {
  it('refuses a candidate that begins before the recognized range', () => {
    // "Each of the 3 creatures makes a DC 15 Dexterity saving throw."
    //
    // Recognized range: the "DC <n> <Ability> saving throw" pattern matches
    // "DC 15 Dexterity saving throw" — it starts at "DC" and ends after
    // "throw".
    //
    // Two numeric candidates:
    //   "DC 15"                  spans [DC.start, 15.end]  — inside the range.
    //   "3 creatures makes a DC" spans [3.start,  DC.end]  — its numeral sits
    //       BEFORE the range starts, so it starts before range.start while
    //       ending inside the range. Containment needs BOTH bounds, so this
    //       candidate is not covered and the reader refuses rather than
    //       silently reading 15 out of a sentence it does not fully account
    //       for.
    const wording = 'Each of the 3 creatures makes a DC 15 Dexterity saving throw.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: 3 creatures makes a DC.',
    });
  });

  it('refuses a candidate that extends past the end of the recognized range', () => {
    // Mirror of the previous case, with the stray numeral moved AFTER the
    // recognized range instead of before it:
    //
    //   "A creature makes a DC 15 Dexterity saving throw, and 4 of them are pushed."
    //
    // Recognized range: "DC 15 Dexterity saving throw" (ends after "throw").
    // The stray numeral "4" binds to the same "DC" marker — the only one in
    // the sentence — so its candidate spans
    // ["DC".start .. "4".end] = "DC 15 Dexterity saving throw, and 4". That
    // candidate starts exactly AT range.start but ends past range.end, so
    // again containment fails on one bound only and the reader refuses.
    const wording =
      'A creature makes a DC 15 Dexterity saving throw, and 4 of them are pushed.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({
      status: 'unavailable',
      reason:
        'The source fixed save DC syntax is not representable: ' +
        'DC 15 Dexterity saving throw, and 4.',
    });
  });

  it('keeps a recognized range when a check-owned candidate lies entirely after it', () => {
    // A save DC and an ability-check DC in one sentence. The check-owned
    // candidate "DC 12" is disjoint from — and strictly after — the range
    // recognized for the saving throw ("Dexterity saving throw against a DC of
    // 15"). Disjoint means the check's DC must NOT suppress the save's DC, so
    // the fixed DC survives.
    //
    //   candidate "DC 12"    starts after the recognized range ends.
    //   candidate "DC of 15" is contained in the recognized range.
    //
    // "DC 12" is check-owned by the parenthetical rule: the text before it is
    // "...Strength (Athletics) check against your spell save DC (", whose tail
    // names the spell save DC as the check's own statistic.
    const wording =
      'A creature makes a Dexterity saving throw against a DC of 15, and a ' +
      'Strength (Athletics) check against your spell save DC (DC 12) ends the effect.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({ status: 'available', value: 15 });
  });

  it('keeps a recognized range when a check-owned candidate lies entirely before it', () => {
    // Same two intervals as the previous test with their order swapped, so the
    // disjointness is now witnessed on the other side: the check-owned
    // candidate "DC 12" ends before the recognized range for
    // "Dexterity saving throw against a DC of 15" begins.
    const wording =
      'After a Strength (Athletics) check against your spell save DC (DC 12), ' +
      'the creature makes a Dexterity saving throw against a DC of 15.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({ status: 'available', value: 15 });
  });

  it('keeps a recognized range that begins at the exact index a check-owned candidate ends', () => {
    // The touching-but-not-overlapping boundary case. `D.C.` ends on a period,
    // which is a non-word character, so a recognized pattern's leading word
    // boundary can be satisfied at the very next index — the only spelling in
    // the vocabulary that lets a candidate's end index and a recognized range's
    // start index coincide. (`DC` and `Difficulty Class` both require a
    // non-word character after them, and every recognized pattern begins on a
    // word character.)
    //
    //   "An ability check against 12 D.C.Dexterity saving throw against a DC of 15."
    //                            ^^^^^^^^^^                                        \
    //                            check-owned candidate "12 D.C." ends here ---------+
    //                                    ^ recognized range starts here (same index)
    //
    // Deliberately degenerate layout: the SRD would print a space after the
    // abbreviation. The missing space is the whole point — it is what places
    // the two intervals in exact contact. The sentence still parses as ONE
    // sentence, because a period followed immediately by a letter or digit is
    // not a sentence stop.
    //
    // "12 D.C." is check-owned by the "check against" rule (the text before it
    // is "An ability check against "). Half-open intervals touching at a point
    // do not overlap, so the recognized range survives and "DC of 15" — which
    // it contains — is reported.
    const wording =
      'An ability check against 12 D.C.Dexterity saving throw against a DC of 15.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({ status: 'available', value: 15 });
  });
});
