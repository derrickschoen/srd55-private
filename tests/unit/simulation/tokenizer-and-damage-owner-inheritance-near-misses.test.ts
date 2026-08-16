import { describe, expect, it } from 'vitest';
// Side-effect import of the module under test: it registers this file in
// vitest's module graph even for the assertions that go through the named
// imports below, so Stryker's vitest-runner "related tests" selection sees
// this file as covering src/simulation/spell-source-reader.ts. A file that
// only reached the module through a dynamic import would be invisible to that
// selection and every mutant it kills would still be reported as survived.
import '../../../src/simulation/spell-source-reader';
import { damageType } from '../../../src/domain/enums';
import {
  deriveSaveDamageCoverageFromBodies,
  sourceSentences,
  type SourceDamageOccurrence,
  type SourceDerivedSaveClause,
} from '../../../src/simulation/spell-source-reader';

/**
 * Near-miss probes for two neighbouring regions of
 * `src/simulation/spell-source-reader.ts`:
 *
 * CLUSTER 1 — the damage-owner loop in `directDamageSaveClauses`
 * (`leading`/`span` derivation, the `directDamage` admission test, the
 * inherited-signature choice, and the inherited-vs-direct occurrence choice).
 * This region was recently reshaped into the `DirectDamageOwner` discriminated
 * union, so the arms themselves are now compiler-enforced; what survived is the
 * residual *runtime* arithmetic and predicate around them.
 *
 * CLUSTER 2 — the sentence tokenizer `sourceSentences`: which characters end a
 * sentence, where the emitted sentence stops, and whether a final fragment with
 * no terminal punctuation is emitted at all.
 *
 * WHY THESE MUTANTS SURVIVED. Both regions are mostly exercised through the
 * committed SRD corpus, where the interesting inputs are *absent*: no reviewed
 * spell needs a clause whose leading whitespace differs from its trailing
 * whitespace, none inherits occurrences across a clause that also owns damage
 * directly, and the corpus bodies always end in a period, so the final-fragment
 * branch never fires. Every fixture below is therefore a hand-built body that
 * puts exactly one of those conditions in play.
 *
 * DERIVATION DISCIPLINE. No expected value here was read off the parser's
 * output. Offsets are written as `indexOf` into the fixture STRING (the
 * fixture is the specification of where the text sits), lengths as
 * `'…'.length` of the matched literal, and the accompanying comment states
 * which line of the reader produces the value. Where a hand derivation and the
 * implementation could disagree, the comment says what the reader must do,
 * not what it happens to do.
 *
 * ONE PROVEN-EQUIVALENT MUTANT is deliberately not tested; see
 * "SKIPPED-EQUIVALENT" below the tokenizer fixtures.
 */

const HEADING = 'Near-Miss Probe';

function clausesOf(body: string): readonly SourceDerivedSaveClause[] {
  return deriveSaveDamageCoverageFromBodies(new Map([[HEADING, body]]))
    .clauses_by_heading.get(HEADING) ?? [];
}

function clauseAt(body: string, index: number): SourceDerivedSaveClause {
  const clause = clausesOf(body)[index];
  if (clause === undefined) {
    throw new Error(
      `The probe body has no derived clause at index ${index}; it has ${clausesOf(body).length}.`,
    );
  }
  return clause;
}

/**
 * The one 8d6 Fire occurrence every inheritance fixture below starts from.
 * `start`/`end` are supplied per fixture because they are absolute offsets into
 * that fixture's body; everything else is fixed by the dice pattern in
 * `damageOccurrenceGroups` (`(\d+)d(\d+)…\bdamage`), which captures the count
 * and the die size and reads the type out of the text between them.
 */
function fireOccurrence(start: number): SourceDamageOccurrence {
  return {
    dice_count: 8,
    die_size: 6,
    flat_modifier: null,
    damage_type: damageType('Fire'),
    arm: 'failure',
    // Nothing follows the dice group with "at the end of its next turn", so the
    // timing stays the default resolution timing.
    timing: 'on_save_resolution',
    roll_transform: 'none',
    start,
    // The group's `end` is the end of the whole dice match, i.e. through the
    // word "damage" — not the end of the dice expression alone.
    end: start + '8d6 Fire damage'.length,
    slot_index: 0,
    roll_index: 0,
  };
}

/* ------------------------------------------------------------------ *
 * CLUSTER 1 — damage-owner inheritance, offsets and admission
 * ------------------------------------------------------------------ */

/**
 * FIXTURE A. Two save matches: an owner that holds 8d6 Fire directly, and a
 * repeat clause that owns no damage of its own and must inherit both the
 * signature and the *occurrence offsets* of the first.
 *
 * The lead sentence before the first save exists so the first owner's span
 * starts after a period and therefore has ONE leading space — `leading` is 1,
 * not 0, which is what makes the `start + leading` arithmetic observable.
 *
 * The body ends WITHOUT trailing whitespace, so the second owner's raw span has
 * one leading space and zero trailing spaces. That asymmetry is the whole point
 * of the fixture: `rawSpan.length - rawSpan.trimStart().length` is 1 while
 * `rawSpan.length - rawSpan.trimEnd().length` is 0.
 */
const INHERITED_OFFSETS_BODY =
  'The spell erupts in flame. ' +
  'A creature in the area must make a Constitution saving throw. ' +
  'On a failed save, it takes 8d6 Fire damage. ' +
  'The target repeats the save at the end of each of its turns and takes the Fire damage again on a failed save.';

/**
 * FIXTURE B. The repeat clause ALSO carries damage of its own (4d6 Cold). The
 * inherited signature must lose to the clause's own signature — the inheritance
 * is a fallback for an empty derivation, not a preference.
 */
const REPEAT_WITH_OWN_SIGNATURE_BODY =
  'The spell erupts in flame. ' +
  'A creature in the area must make a Constitution saving throw. ' +
  'On a failed save, it takes 8d6 Fire damage. ' +
  'The target repeats the save at the end of each of its turns. ' +
  'On a failed save, it takes 4d6 Cold damage and takes the Fire damage again.';

/**
 * FIXTURE C. Three owners. The middle one does not repeat, so it must both use
 * and PUBLISH its own occurrences; the third one repeats and therefore inherits
 * from the middle clause, never from the first. Without the third clause the
 * middle clause's choice is unobservable, because a non-repeating owner
 * re-derives its occurrences from its own widened span at the end of the
 * function regardless of what the loop chose.
 */
const RELAY_BODY =
  'The spell erupts in flame. ' +
  'A creature in the area must make a Constitution saving throw. ' +
  'On a failed save, it takes 8d6 Fire damage. ' +
  'A creature that ends its turn in the smoke must make a Constitution saving throw. ' +
  'On a failed save, it takes 3d6 Poison damage. ' +
  'The target repeats the save at the end of each of its turns and takes the Poison damage again on a failed save.';

/**
 * FIXTURE D. The first owner has a success arm — "half the initial damage
 * only" adds a second, `floor_half`, `success`-arm occurrence — and the repeat
 * clause inherits from it. Only the FAILURE occurrences may cross; a repeat
 * clause that inherited the success arm would double-count the half-damage
 * roll.
 */
const SUCCESS_ARM_INHERITANCE_BODY =
  'The spell erupts in flame. ' +
  'A creature in the area must make a Constitution saving throw. ' +
  'On a failed save, it takes 8d6 Fire damage. ' +
  'On a successful save, the creature takes half the initial damage only. ' +
  'The target repeats the save at the end of each of its turns and takes the Fire damage again on a failed save.';

/**
 * FIXTURE E. The FIRST owner both holds damage directly and repeats it, so it
 * publishes occurrences while the inherited list is still empty. The second
 * clause owns nothing and must receive them.
 */
const FIRST_OWNER_REPEATS_BODY =
  'The spell erupts in flame. ' +
  'A creature in the area must make a Constitution saving throw. ' +
  'On a failed save, it takes 8d6 Fire damage and takes the Fire damage again on each later turn. ' +
  'The target repeats the save at the end of each of its turns and takes the Fire damage again on a failed save.';

/**
 * FIXTURE F. A second save that inflicts a condition rather than damage. It is
 * a save match, and the loop walks it, but it must not become a damage owner.
 */
const CONDITION_ONLY_SECOND_SAVE_BODY =
  'The spell erupts in flame. ' +
  'A creature in the area must make a Constitution saving throw. ' +
  'On a failed save, it takes 8d6 Fire damage. ' +
  'Each creature in the area must succeed on a Wisdom saving throw or have the Frightened condition.';

/**
 * FIXTURE G. A repeat clause with NOTHING to inherit: the only earlier save is
 * a condition save, so no signature was ever published. "Repeats damage" plus
 * an empty inherited list is not damage, and the body must yield no clause at
 * all.
 */
const REPEAT_WITH_NOTHING_INHERITED_BODY =
  'Each creature in the area must succeed on a Wisdom saving throw or have the Frightened condition. ' +
  'The target repeats the save at the end of each of its turns and takes the Fire damage again on a failed save.';

describe('damage-owner inheritance near misses', () => {
  it('starts each owner at its first non-space character, measured from the front', () => {
    const first = clauseAt(INHERITED_OFFSETS_BODY, 0);
    const second = clauseAt(INHERITED_OFFSETS_BODY, 1);

    // Each owner's span begins one character after the period that precedes its
    // save, plus the single space that follows that period — i.e. exactly at
    // the first word of its own sentence.
    expect(first.start).toBe(INHERITED_OFFSETS_BODY.indexOf('A creature in the area'));
    expect(second.start).toBe(INHERITED_OFFSETS_BODY.indexOf('The target repeats'));

    // The first owner's span is widened up to the next owner's SAVE MATCH
    // ("repeats the save"), then right-trimmed — so it stops after "The target"
    // and keeps no trailing space.
    expect(first.span).toBe(
      'A creature in the area must make a Constitution saving throw. ' +
      'On a failed save, it takes 8d6 Fire damage. ' +
      'The target',
    );
    expect(first.end).toBe(first.start + first.span.length);

    // The last owner runs to the end of the body, which has no trailing space
    // to trim.
    expect(second.span).toBe(
      'The target repeats the save at the end of each of its turns and takes the Fire damage again on a failed save.',
    );
    expect(second.end).toBe(INHERITED_OFFSETS_BODY.length);
  });

  it('carries the inherited occurrence offsets, which point back into the first clause', () => {
    const second = clauseAt(INHERITED_OFFSETS_BODY, 1);

    // The repeat clause has no dice of its own, so its occurrence is the first
    // clause's, offsets included: it addresses the "8d6 Fire damage" that sits
    // in the EARLIER sentence, not anything inside the repeat clause's span.
    expect(second.damage_occurrences).toEqual([
      fireOccurrence(INHERITED_OFFSETS_BODY.indexOf('8d6 Fire damage')),
    ]);
    // Stated separately because it is the property the offset arithmetic is
    // for: the inherited occurrence lies strictly before this clause starts.
    expect(second.damage_occurrences[0]?.end).toBeLessThan(second.start);

    expect(second.failed_damage_signatures).toEqual([
      { dice_count: 8, die_size: 6, flat_modifier: null, damage_type: damageType('Fire') },
    ]);
  });

  it('gives the first clause its own signature rather than an inherited one', () => {
    // Nothing precedes the first owner, so an implementation that always took
    // the inherited list would hand it an empty one.
    expect(clauseAt(INHERITED_OFFSETS_BODY, 0).failed_damage_signatures).toEqual([
      { dice_count: 8, die_size: 6, flat_modifier: null, damage_type: damageType('Fire') },
    ]);
  });

  it('prefers a repeat clause OWN signature over the inherited one', () => {
    const second = clauseAt(REPEAT_WITH_OWN_SIGNATURE_BODY, 1);

    // 4d6 Cold is derived from this clause's own failed-save sentence, so the
    // inherited 8d6 Fire must not be substituted for it.
    expect(second.failed_damage_signatures).toEqual([
      { dice_count: 4, die_size: 6, flat_modifier: null, damage_type: damageType('Cold') },
    ]);
  });

  it('relays occurrences from the immediately preceding owner, not the first one', () => {
    const third = clauseAt(RELAY_BODY, 2);

    // The middle owner published 3d6 Poison; that is what the repeat clause
    // inherits. Inheriting 8d6 Fire would mean the middle clause failed to
    // overwrite the published list with its own occurrences.
    expect(third.damage_occurrences).toEqual([
      {
        dice_count: 3,
        die_size: 6,
        flat_modifier: null,
        damage_type: damageType('Poison'),
        arm: 'failure',
        timing: 'on_save_resolution',
        roll_transform: 'none',
        start: RELAY_BODY.indexOf('3d6 Poison damage'),
        end: RELAY_BODY.indexOf('3d6 Poison damage') + '3d6 Poison damage'.length,
        slot_index: 0,
        roll_index: 0,
      },
    ]);
  });

  it('inherits only the failure arm across a repeat clause', () => {
    const first = clauseAt(SUCCESS_ARM_INHERITANCE_BODY, 0);
    const second = clauseAt(SUCCESS_ARM_INHERITANCE_BODY, 1);

    // Control: the source clause really does carry two arms, so the repeat
    // clause below is dropping something rather than never having had it.
    expect(first.damage_occurrences.map((occurrence) => occurrence.arm))
      .toEqual(['failure', 'success']);

    expect(second.damage_occurrences).toEqual([
      fireOccurrence(SUCCESS_ARM_INHERITANCE_BODY.indexOf('8d6 Fire damage')),
    ]);
  });

  it('publishes occurrences from an owner that repeats damage it also holds directly', () => {
    const second = clauseAt(FIRST_OWNER_REPEATS_BODY, 1);

    // The first owner repeats, but with an empty inherited list it must fall
    // back to its own derivation and publish THAT, or this clause receives
    // nothing.
    expect(second.damage_occurrences).toEqual([
      fireOccurrence(FIRST_OWNER_REPEATS_BODY.indexOf('8d6 Fire damage')),
    ]);
  });

  it('does not make a condition-only save into a damage owner', () => {
    const clauses = clausesOf(CONDITION_ONLY_SECOND_SAVE_BODY);

    expect(clauses).toHaveLength(1);
    expect(clauses[0]?.ability).toBe('constitution');
  });

  it('does not make a repeat clause an owner when nothing was inherited', () => {
    // "takes the Fire damage again" is present, but no earlier clause ever
    // published a signature, so there is no damage to repeat.
    expect(clausesOf(REPEAT_WITH_NOTHING_INHERITED_BODY)).toEqual([]);
    expect(
      deriveSaveDamageCoverageFromBodies(
        new Map([[HEADING, REPEAT_WITH_NOTHING_INHERITED_BODY]]),
      ).counts.before_deduplication,
    ).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * CLUSTER 2 — sentence tokenizer boundaries
 * ------------------------------------------------------------------ */

/**
 * SKIPPED-EQUIVALENT: `for (let index = 0; index < span.length; …)` mutated to
 * `index <= span.length`.
 *
 * PROOF. The extra iteration runs with `index === span.length`. String index
 * access past the end yields `undefined`, and the loop body's only use of that
 * value is the three strict equality tests `character === '!'`,
 * `character === '?'` and `character === '.'`. `undefined` is strictly equal to
 * no string, so `isStop` is `false` and the body takes the `continue` before
 * reaching either statement that mutates state (`sentences.push` on the stop
 * path and the `start` reassignment after it). The iteration therefore leaves
 * `sentences` and `start` exactly as it found them, and the loop then exits.
 * This holds for the empty span too, where the mutant runs one iteration
 * instead of none. A test cannot distinguish the two programs; writing one
 * would only assert that the tokenizer works, which the tests below already do.
 */

describe('sentence tokenizer boundary near misses', () => {
  it('ends a sentence on an exclamation mark, keeping the mark in the text', () => {
    const span = 'The creature takes 2d6 Fire damage! It then falls Prone.';
    const bang = span.indexOf('!');

    // The emitted sentence runs THROUGH the terminator: `end` is one past the
    // '!' and the next sentence starts there, so the two sentences tile the
    // span with no character dropped and none repeated.
    expect(sourceSentences(span)).toEqual([
      { start: 0, end: bang + 1, text: 'The creature takes 2d6 Fire damage!' },
      { start: bang + 1, end: span.length, text: ' It then falls Prone.' },
    ]);
  });

  it('ends a sentence on a question mark, keeping the mark in the text', () => {
    const span = 'Did the target fail? It takes 4d8 Cold damage.';
    const query = span.indexOf('?');

    expect(sourceSentences(span)).toEqual([
      { start: 0, end: query + 1, text: 'Did the target fail?' },
      { start: query + 1, end: span.length, text: ' It takes 4d8 Cold damage.' },
    ]);
  });

  it('ends a sentence on a period and emits a final fragment with no terminator', () => {
    const span = 'A creature must make a Dexterity saving throw. On a failed save it takes 6d6';
    const period = span.indexOf('.');

    // The trailing fragment has no terminal punctuation. It is still a
    // sentence: dropping it would silently hide the damage text at the end of
    // a span from every consumer that scans sentences.
    expect(sourceSentences(span)).toEqual([
      { start: 0, end: period + 1, text: 'A creature must make a Dexterity saving throw.' },
      { start: period + 1, end: span.length, text: ' On a failed save it takes 6d6' },
    ]);
  });

  it('emits no empty fragment when the span ends exactly on a terminator', () => {
    const span = 'It takes 1d10 Radiant damage.';

    // `start` lands on `span.length` after the final period, so the
    // final-fragment branch must not fire — an empty trailing sentence here
    // would be an artefact, not a sentence.
    expect(sourceSentences(span)).toEqual([
      { start: 0, end: span.length, text: span },
    ]);
  });

  it('treats a whole span with no terminator as one sentence', () => {
    // CONTROL for the final-fragment branch: with no stop character at all the
    // fragment is emitted by the nonemptiness fallback instead of by that
    // branch, so this input canNOT distinguish the branch's presence. It is
    // here to pin the boundary of what the fragment tests above prove.
    const span = 'The target takes 1d4 Force damage';

    expect(sourceSentences(span)).toEqual([
      { start: 0, end: span.length, text: span },
    ]);
  });

  it('does not split on the periods inside an abbreviation', () => {
    // CONTROL for the period arm: both periods in "e.g." are non-terminal —
    // the first is followed by a letter, the second by a comma and a letter —
    // so a tokenizer that stopped on every period would cut this span into
    // three.
    const span = 'A creature (e.g., a Zombie) takes 3d6 Radiant damage.';

    expect(sourceSentences(span)).toEqual([
      { start: 0, end: span.length, text: span },
    ]);
  });
});
