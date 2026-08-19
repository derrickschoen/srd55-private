import { describe, expect, it } from 'vitest';
// Side-effect import of the module under test. Stryker's vitest-runner selects
// the tests to run against a mutant from the module graph it observed during
// the dry run; a test file that reaches its subject only through a dynamic
// import is invisible to that selection and would never be run against the
// mutants it kills. This static import puts `spell-source-reader.ts` in this
// file's graph even though every case below already imports it statically.
import '../../../src/simulation/spell-source-reader';
import {
  deriveSaveDamageCoverageFromBodies,
  type SourceDerivedSaveDamageCandidate,
} from '../../../src/simulation/spell-source-reader';

/**
 * Near-miss probes for three decisions in `src/simulation/spell-source-reader.ts`.
 *
 * 1. GATE-CLAUSE ARM SELECTION (`gateDamageSaveClause`, the
 *    `damageOccurrences.filter((occurrence) => occurrence.arm === 'failure')`
 *    that builds `failed_damage_signatures`). A gate clause that also carries
 *    a `half the initial damage only` success arm must publish the FAILURE
 *    signatures only — not both arms, not the success arm, not none.
 *
 * 2. GATE/DIRECT CLAUSE OWNERSHIP (`sameClauseOwnership`). A gate clause is
 *    dropped as already-owned only when the co-located direct clause agrees on
 *    save position, save ability AND success status, and already carries every
 *    failed-damage signature the gate found. Each conjunct is probed with a
 *    body in which exactly that conjunct is the one that disagrees.
 *
 * 3. BROAD-SUSPECT WINDOW BOUNDARY (`broadDamageSaveSuspects`). The window
 *    grows while the candidate span is at most 1,800 characters; a span of
 *    exactly 1,800 is admitted and 1,801 is not.
 */

const CONSTITUTION_LEAD =
  'Each creature in the area makes a Constitution saving throw and takes 8d6 Necrotic damage if it failed save.';
const WISDOM_LEAD =
  'Each creature in the area makes a Wisdom saving throw and takes 8d6 Necrotic damage if it failed save.';

/**
 * The gate sentence. `dexterity` is deliberately lowercase: the gate pattern
 * and the direct-clause save scanner are both case-insensitive, so both bind
 * their save position here, while `sourceAbility` is case-SENSITIVE and
 * therefore reads the ability from the later `Wisdom saving throw`. That
 * asymmetry is what lets a gate and a direct clause share a `save_start` while
 * disagreeing about `ability`.
 */
const GATE_SENTENCE_UNAVAILABLE =
  'The target makes a dexterity saving throw and takes 4d6 Fire damage if it failed save, or has the Grappled condition until a Wisdom saving throw ends it.';

/**
 * Same sentence, reworded to `taking … damage on a failed save` so the DIRECT
 * clause proves its successful-save arm (`success.status === 'available'`).
 * A gate clause is always `unavailable`, so this is the status-only mismatch.
 */
const GATE_SENTENCE_AVAILABLE =
  'The target makes a dexterity saving throw, taking 4d6 Fire damage on a failed save, or has the Grappled condition until a Wisdom saving throw ends it.';

const GRAPPLE_DAMAGE_SENTENCE =
  'While it grapples the target, it deals Fire damage of 4d6 if the target failed save.';

const GRAPPLE_DAMAGE_SENTENCE_WITH_SUCCESS_ARM =
  'While it grapples the target, it deals Fire damage of 4d6 if the target failed save, and half the initial damage only on a successful save.';

function coverageFor(body: string): readonly SourceDerivedSaveDamageCandidate[] {
  return deriveSaveDamageCoverageFromBodies(new Map([['Probe Spell', body]]))
    .candidates;
}

/**
 * The gate clause is the one whose save position is the lowercase `dexterity`
 * phrase and whose ability came from the later `Wisdom` phrase. No direct
 * clause can hold that pair: the direct clause anchored at the same phrase
 * stops before `Wisdom saving throw`, so it inherits its ability instead.
 */
function gateClause(
  candidates: readonly SourceDerivedSaveDamageCandidate[],
  body: string,
): SourceDerivedSaveDamageCandidate {
  const saveStart = body.indexOf('dexterity saving throw');
  expect(saveStart).toBeGreaterThan(0);
  const matches = candidates.filter(
    (candidate) =>
      candidate.save_start === saveStart && candidate.ability === 'wisdom',
  );
  expect(matches).toHaveLength(1);
  const [gate] = matches;
  if (gate === undefined) {
    throw new Error('The gate clause probe found no gate clause.');
  }
  return gate;
}

describe('gate-clause failed-damage arm selection', () => {
  const body = [
    CONSTITUTION_LEAD,
    GATE_SENTENCE_UNAVAILABLE,
    GRAPPLE_DAMAGE_SENTENCE_WITH_SUCCESS_ARM,
  ].join(' ');

  it('carries both arms in `damage_occurrences` so the filter has work to do', () => {
    const gate = gateClause(coverageFor(body), body);
    expect(gate.damage_occurrences.map((occurrence) => occurrence.arm)).toEqual([
      'failure',
      'failure',
      'success',
    ]);
    // The success arm is a `floor_half` copy of the initial failure roll, so
    // the arm label is the ONLY thing separating it from the failure entries.
    expect(
      gate.damage_occurrences.map((occurrence) => occurrence.roll_transform),
    ).toEqual(['none', 'none', 'floor_half']);
  });

  it('publishes exactly the two failure signatures', () => {
    const gate = gateClause(coverageFor(body), body);
    expect(gate.failed_damage_signatures).toEqual([
      {
        damage_type: 'Fire',
        kind: 'dice',
        count: 4,
        die: 6,
      },
      {
        damage_type: 'Fire',
        kind: 'dice',
        count: 4,
        die: 6,
      },
    ]);
  });

  it('does not fall through to every occurrence, the success arm, or none', () => {
    const gate = gateClause(coverageFor(body), body);
    const failureCount = gate.damage_occurrences.filter(
      (occurrence) => occurrence.arm === 'failure',
    ).length;
    const successCount = gate.damage_occurrences.filter(
      (occurrence) => occurrence.arm === 'success',
    ).length;
    expect(failureCount).toBe(2);
    expect(successCount).toBe(1);
    // Three distinct near misses, each with a distinct arity: keeping every
    // occurrence (3), keeping the complement of the failure arm (1), and
    // keeping nothing (0).
    expect(gate.failed_damage_signatures).toHaveLength(failureCount);
    expect(gate.failed_damage_signatures).not.toHaveLength(
      failureCount + successCount,
    );
    expect(gate.failed_damage_signatures).not.toHaveLength(successCount);
    expect(gate.failed_damage_signatures).not.toHaveLength(0);
  });
});

describe('gate/direct clause ownership near misses', () => {
  /**
   * All four conjuncts agree, so the gate is dropped as already owned. Its
   * signature list is non-empty, so the `every(...)` conjunct is doing real
   * work here rather than passing vacuously.
   */
  it('drops the gate clause when every conjunct agrees', () => {
    const body = [
      WISDOM_LEAD,
      GATE_SENTENCE_UNAVAILABLE,
      GRAPPLE_DAMAGE_SENTENCE,
    ].join(' ');
    const coverage = deriveSaveDamageCoverageFromBodies(
      new Map([['Probe Spell', body]]),
    );
    expect(coverage.counts.before_deduplication).toBe(4);
    expect(coverage.counts.after_deduplication).toBe(3);
    const saveStart = body.indexOf('dexterity saving throw');
    const atSaveStart = coverage.candidates.filter(
      (candidate) => candidate.save_start === saveStart,
    );
    expect(atSaveStart).toHaveLength(1);
    expect(atSaveStart[0]?.ability).toBe('wisdom');
    expect(atSaveStart[0]?.success.status).toBe('unavailable');
  });

  it('drops a gate whose every signature matches some, not all, direct signatures', () => {
    // Two DISTINCT signatures on the shared span (4d6 Fire and 2d8 Cold).
    // Ownership requires every gate signature to match SOME direct signature
    // (spell-source-reader.ts:1152-1155); a mutant tightening the inner
    // `some` to `every` demands each gate signature match ALL direct
    // candidates, which no signature can once two distinct ones exist, so the
    // gate would wrongly survive deduplication.
    const twoDamageGateSentence =
      'The target makes a dexterity saving throw and takes 4d6 Fire damage and 2d8 Cold damage if it failed save, or has the Grappled condition until a Wisdom saving throw ends it.';
    const body = [WISDOM_LEAD, twoDamageGateSentence, GRAPPLE_DAMAGE_SENTENCE].join(' ');
    const coverage = deriveSaveDamageCoverageFromBodies(
      new Map([['Probe Spell', body]]),
    );
    const saveStart = body.indexOf('dexterity saving throw');
    const atSaveStart = coverage.candidates.filter(
      (candidate) => candidate.save_start === saveStart,
    );
    expect(atSaveStart).toHaveLength(1);
    expect(atSaveStart[0]?.failed_damage_signatures.length).toBe(2);
    expect(coverage.counts.after_deduplication).toBe(
      coverage.counts.before_deduplication - 1,
    );
  });

  it('keeps the gate clause when only the save ability disagrees', () => {
    const body = [
      CONSTITUTION_LEAD,
      GATE_SENTENCE_UNAVAILABLE,
      GRAPPLE_DAMAGE_SENTENCE,
    ].join(' ');
    const coverage = deriveSaveDamageCoverageFromBodies(
      new Map([['Probe Spell', body]]),
    );
    const saveStart = body.indexOf('dexterity saving throw');
    const atSaveStart = coverage.candidates.filter(
      (candidate) => candidate.save_start === saveStart,
    );
    // Same save position, same (unavailable) success status, and the gate's
    // signatures are all present on the direct clause — only the ability
    // differs, so the gate must survive.
    expect(atSaveStart).toHaveLength(2);
    expect(atSaveStart.map((candidate) => candidate.ability).sort()).toEqual([
      'constitution',
      'wisdom',
    ]);
    expect(
      atSaveStart.every(
        (candidate) => candidate.success.status === 'unavailable',
      ),
    ).toBe(true);
    expect(coverage.counts.before_deduplication).toBe(4);
    expect(coverage.counts.after_deduplication).toBe(4);
  });

  it('keeps the gate clause when only the success status disagrees', () => {
    const body = [
      WISDOM_LEAD,
      GATE_SENTENCE_AVAILABLE,
      GRAPPLE_DAMAGE_SENTENCE,
    ].join(' ');
    const coverage = deriveSaveDamageCoverageFromBodies(
      new Map([['Probe Spell', body]]),
    );
    const saveStart = body.indexOf('dexterity saving throw');
    const atSaveStart = coverage.candidates.filter(
      (candidate) => candidate.save_start === saveStart,
    );
    // Same save position and same ability this time; the direct clause proves
    // its successful-save arm while a gate clause never can.
    expect(atSaveStart).toHaveLength(2);
    expect(
      atSaveStart.every((candidate) => candidate.ability === 'wisdom'),
    ).toBe(true);
    expect(
      atSaveStart.map((candidate) => candidate.success.status).sort(),
    ).toEqual(['available', 'unavailable']);
    expect(coverage.counts.before_deduplication).toBe(4);
    expect(coverage.counts.after_deduplication).toBe(4);
  });
});

describe('broad damage-save suspect window boundary', () => {
  const TRIGGER_SENTENCE =
    'A creature makes a Dexterity saving throw and takes 6d6 Fire damage on a failed save';
  const TAIL_SENTENCE =
    'OMEGA trailing text that pushes the third boundary past the window limit';

  /**
   * Builds a three-sentence body whose SECOND sentence ends at exactly
   * `secondSentenceEnd`. The first sentence starts at offset 0, so that number
   * is also the candidate window length the growth loop compares to 1,800.
   */
  function bodyWithSecondSentenceEndingAt(secondSentenceEnd: number): string {
    const head = `${TRIGGER_SENTENCE}.`;
    const marker = 'MIDDLE ';
    const padLength = secondSentenceEnd - head.length - 2 - marker.length;
    expect(padLength).toBeGreaterThan(0);
    return `${head} ${marker}${'x'.repeat(padLength)}. ${TAIL_SENTENCE}.`;
  }

  it('admits a window of exactly 1,800 characters', () => {
    const body = bodyWithSecondSentenceEndingAt(1_800);
    const { broad_suspects: suspects } = deriveSaveDamageCoverageFromBodies(
      new Map([['Probe Spell', body]]),
    );
    expect(suspects).toHaveLength(1);
    expect(suspects[0]?.start).toBe(0);
    expect(suspects[0]?.end).toBe(1_800);
    expect(suspects[0]?.span).toContain('MIDDLE');
  });

  it('refuses the one-character-wider window of 1,801', () => {
    const body = bodyWithSecondSentenceEndingAt(1_801);
    const { broad_suspects: suspects } = deriveSaveDamageCoverageFromBodies(
      new Map([['Probe Spell', body]]),
    );
    expect(suspects).toHaveLength(1);
    expect(suspects[0]?.start).toBe(0);
    expect(suspects[0]?.end).toBe(`${TRIGGER_SENTENCE}.`.length);
    expect(suspects[0]?.span).not.toContain('MIDDLE');
  });
});
