import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { damageType, type DieSize } from '../../../src/domain/enums';
import {
  positiveDiceCount,
  type DamageInstance,
  type EventFrequency,
  type PublicSourceRef,
  type SaveSuccessOutcome,
  type SavingThrowDamageDuration,
  type SourceRef,
} from '../../../src/simulation/contracts';
import type {
  DerivedSaveDamageCoverage,
  SourceDamageOccurrence,
  SourceDerivedSaveClause,
} from '../../../src/simulation/spell-source-reader';
// Side-effect import of the module under test. The module-evaluation cases
// below reach it only through `vi.resetModules()` + a dynamic import, and a
// file that ONLY imports dynamically is invisible to Stryker's vitest-runner
// "related tests" selection — it would never be run against the mutants it
// kills. This static import puts the file in the module graph.
import '../../../src/simulation/coverage';
import {
  reviewedSaveSuccessClauses,
  saveSuccessOutcomeEvidenceFailureReason,
} from '../../../src/simulation/coverage';

/**
 * Near-miss probes for two guard families in `src/simulation/coverage.ts`.
 *
 * 1. AVAILABLE-BRANCH SUCCESS ROLL TRANSFORM plus the two module-evaluation
 *    oracle loops that run over the finished reviewed table (success kind,
 *    availability, damage-roll grouping, fixed save DC).
 *
 * 2. THE EVIDENCE CONJUNCTION in `saveSuccessOutcomeEvidenceFailureReason` —
 *    the unavailable short circuit, the duration and frequency comparisons it
 *    delegates to, and the successful-save arm's transform/damage pair.
 *
 * REACHING (1). Every committed reviewed clause agrees with every oracle, so
 * each rejection arm is unreachable with the committed data — which is exactly
 * why the mutants inside them survived. The seam is the one demonstrated in
 * `coverage-clause-binding-and-unavailable-near-misses.test.ts`: mocking
 * `deriveSaveDamageCoverageFromBodies` lets a test hand ONE heading a rewritten
 * source clause while every other heading keeps its real one.
 *
 * WHY VITRIOLIC SPHERE. It is the only reviewed clause with a successful-save
 * damage arm, and the only one whose reviewed requirements declare
 * `success_roll_transform: 'floor_half'`. It is published as unavailable for a
 * TIMING reason only (its second damage lands at the end of the target's next
 * turn); its success arm, fixed save DC, frequency and repetitions are all
 * available. Clearing `timing_unavailable_reason` therefore moves it — and
 * nothing else — into the available branch, where the transform agreement check
 * at coverage.ts:1155-1160 lives.
 *
 * WHY THE PASSING CASES ASSERT A *LATER* GUARD'S MESSAGE. A clause that gets
 * past the transform check keeps evaluating and is stopped by an independent
 * oracle further down (availability, since the reviewed oracle still publishes
 * Vitriolic Sphere as unavailable). Asserting that later message — rather than
 * "it threw" — is what proves the guard under test let the case through for the
 * right reason, and it still fails loudly if a mutated guard rejects the case
 * early with its own text.
 */

type Reader = typeof import('../../../src/simulation/spell-source-reader');

const READER_PATH = '../../../src/simulation/spell-source-reader';
const COVERAGE_PATH = '../../../src/simulation/coverage';

type ClauseMap = ReadonlyMap<string, readonly SourceDerivedSaveClause[]>;

const VITRIOLIC_HEADING = 'Vitriolic Sphere';
const VITRIOLIC_ID = 'srd-5.2.1:spell:vitriolic-sphere:save:damage';

const VITRIOLIC_AVAILABILITY_MESSAGE =
  `${VITRIOLIC_ID} source-derived availability disagrees with the independent reviewed oracle.`;

const VITRIOLIC_TRANSFORM_MESSAGE =
  `${VITRIOLIC_ID} successful-save roll transform does not match the source clause.`;

/**
 * Rewrites the derived clause map so exactly one heading yields a modified
 * clause, then re-imports coverage and returns the message its module
 * evaluation threw. Completing without throwing is a failure: a guard that has
 * been weakened away stops rejecting, and that must not read as a pass.
 */
async function moduleEvaluationMessage(
  rewrite: (base: ClauseMap) => ClauseMap,
): Promise<string> {
  vi.resetModules();
  vi.doMock(READER_PATH, async () => {
    const actual = await vi.importActual<Reader>(READER_PATH);
    return {
      ...actual,
      deriveSaveDamageCoverageFromBodies: (
        bodies: ReadonlyMap<string, string>,
      ): DerivedSaveDamageCoverage => {
        const derived = actual.deriveSaveDamageCoverageFromBodies(bodies);
        return {
          ...derived,
          clauses_by_heading: rewrite(derived.clauses_by_heading),
        };
      },
    };
  });
  try {
    await import(COVERAGE_PATH);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(TypeError);
    if (error instanceof Error) {
      return error.message;
    }
    throw new Error('Module evaluation threw a TypeError without a message.');
  }
  throw new Error(
    'Module evaluation completed without throwing, so no guard rejected the injected clause.',
  );
}

/**
 * Applies `overrides` to Vitriolic Sphere's single derived source clause.
 * Proving the heading really carries one clause, with both arms present, keeps
 * a harness typo from silently turning into "the guard rejected an empty
 * candidate".
 */
function vitriolicSphere(
  overrides: (clause: SourceDerivedSaveClause) => Partial<SourceDerivedSaveClause>,
): (base: ClauseMap) => ClauseMap {
  return (base) => {
    const clauses = base.get(VITRIOLIC_HEADING);
    expect(clauses).toBeDefined();
    expect(clauses).toHaveLength(1);
    const [clause] = clauses ?? [];
    if (clause === undefined) {
      throw new Error('Vitriolic Sphere has no derived source clause.');
    }
    expect(clause.success.status).toBe('available');
    expect(clause.timing_unavailable_reason).not.toBeNull();
    expect(
      clause.damage_occurrences.some((occurrence) => occurrence.arm === 'success'),
    ).toBe(true);
    expect(
      clause.damage_occurrences.some((occurrence) => occurrence.arm === 'failure'),
    ).toBe(true);
    return new Map([
      ...base,
      [VITRIOLIC_HEADING, [{ ...clause, ...overrides(clause) }]],
    ]);
  };
}

/** Clearing the timing gap is what moves the clause into the available branch. */
const timingAvailable: Partial<SourceDerivedSaveClause> = {
  timing_unavailable_reason: null,
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock(READER_PATH);
  vi.resetModules();
});

describe('available-branch successful-save roll transform', () => {
  it('reads the source transform from a success occurrence that only SOME occurrence carries', async () => {
    // Committed occurrences, moved into the available branch: two failed-save
    // occurrences roll untransformed and the successful-save occurrence rolls
    // floor_half, which is what the reviewed requirements declare. The source
    // transform therefore has to be read with `some` — an `every` over all
    // occurrences sees the untransformed failed-save rolls and reports `none`,
    // and so does a predicate that has been emptied out or inverted. Each of
    // those rejects a clause that is correct, with the transform message this
    // test's expectation excludes.
    expect(
      await moduleEvaluationMessage(vitriolicSphere(() => timingAvailable)),
    ).toBe(VITRIOLIC_AVAILABILITY_MESSAGE);
  });

  it('refuses a declared floor_half transform that no SUCCESS occurrence carries', async () => {
    // The floor_half rolls move to the FAILED arm and the successful-save
    // occurrence rolls untransformed. Nothing else changes: the slot indexes,
    // roll indexes and signatures are untouched, so both bijection checks and
    // the roll-grouping check still pass, and the declared `floor_half` is the
    // only disagreement left.
    //
    // A predicate that accepts either arm (`||`), one pinned true, or an
    // equality flipped to `!==` all see the failed-save floor_half rolls and
    // report `floor_half`, which agrees with the declaration and lets a wrong
    // clause through. So does deleting the `if` that raises this message.
    expect(
      await moduleEvaluationMessage(
        vitriolicSphere((clause) => ({
          ...timingAvailable,
          damage_occurrences: clause.damage_occurrences.map(
            (occurrence): SourceDamageOccurrence => ({
              ...occurrence,
              roll_transform: occurrence.arm === 'success' ? 'none' : 'floor_half',
            }),
          ),
        })),
      ),
    ).toBe(VITRIOLIC_TRANSFORM_MESSAGE);
  });
});

describe('module-evaluation oracle loops over the finished reviewed table', () => {
  it('refuses a source-derived success kind the reviewed kind oracle does not carry', async () => {
    // The clause stays unavailable (its timing gap is untouched), so only the
    // published success KIND changes: `half` where the independent oracle
    // reviewed `sourced_damage`. Both arms' slots and the transform still
    // agree with the source, so nothing upstream can reject it.
    expect(
      await moduleEvaluationMessage(
        vitriolicSphere(() => ({ success: { status: 'available', kind: 'half' } })),
      ),
    ).toBe(
      `${VITRIOLIC_ID} source-derived success kind half disagrees with the independent reviewed oracle sourced_damage.`,
    );
  });

  it('refuses a source-derived fixed save DC the reviewed DC oracle does not carry', async () => {
    // Publishing a fixed DC of 15 leaves the success kind, the availability and
    // both grouping checks agreeing, so the first loop passes end to end and
    // only the SECOND loop — the fixed-save-DC oracle — can reject. Emptying
    // that loop's body, or forcing its comparison false, loses the rejection.
    expect(
      await moduleEvaluationMessage(
        vitriolicSphere(() => ({ fixed_save_dc: { status: 'available', value: 15 } })),
      ),
    ).toBe(
      `${VITRIOLIC_ID} source-derived fixed save DC 15 disagrees with the independent reviewed oracle null.`,
    );
  });
});

describe('successful-save evidence conjunction', () => {
  const vitriolic = reviewedSaveSuccessClauses.vitriolic_sphere;
  const blackTentacles = reviewedSaveSuccessClauses.black_tentacles;
  const tsunamiOngoing = reviewedSaveSuccessClauses.tsunami_ongoing;
  const geas = reviewedSaveSuccessClauses.geas;

  const VITRIOLIC_REASON =
    'The delayed damage occurs at the end of the target’s next turn; round scheduling is not representable.';
  const GEAS_REASON =
    'The save gates another effect; the source does not make the numeric expression failed-save damage.';
  const SOURCED_DAMAGE_GENERIC =
    'The cited evidence does not establish the sourced_damage successful-save clause.';
  const NONE_GENERIC =
    'The cited evidence does not establish the none successful-save clause.';

  const delayed: SavingThrowDamageDuration = {
    kind: 'includes_delayed_damage',
    delayed_until: 'end_of_target_next_turn',
  };
  const instantaneous: SavingThrowDamageDuration = { kind: 'instantaneous' };

  function dice(
    source: SourceRef,
    count: number,
    die: DieSize,
    type: string,
  ): DamageInstance {
    return {
      source,
      damage_type: damageType(type),
      components: [{
        kind: 'dice',
        pool: { count: positiveDiceCount(count), die },
      }],
    };
  }

  const acid = (count: number): DamageInstance =>
    dice(vitriolic.effect_source, count, 4, 'Acid');

  /** Vitriolic Sphere's two failed-save rolls: 10d4 then another 5d4. */
  const vitriolicFailed: readonly DamageInstance[] = [acid(10), acid(5)];

  function vitriolicOutcome(
    overrides: {
      readonly roll_transform?: 'none' | 'floor_half';
      readonly damage?: readonly [DamageInstance, ...DamageInstance[]];
    } = {},
  ): SaveSuccessOutcome {
    return {
      kind: 'sourced_damage',
      evidence: vitriolic.evidence,
      damage: overrides.damage ?? [acid(10)],
      roll_transform: overrides.roll_transform ?? 'floor_half',
    };
  }

  /**
   * A citation that agrees with the reviewed Vitriolic Sphere clause on every
   * conjunct. Because that clause carries a non-null `unavailable_reason`, a
   * full match returns THAT reason rather than `null` — which is what makes
   * every near miss below observable: one conjunct false swaps the reason for
   * the generic text.
   */
  function vitriolicReason(
    overrides: {
      readonly ability?: 'strength' | 'dexterity';
      readonly duration?: SavingThrowDamageDuration;
      readonly outcome?: SaveSuccessOutcome;
    } = {},
  ): string | null {
    return saveSuccessOutcomeEvidenceFailureReason(
      vitriolic.effect_source,
      vitriolic.id,
      overrides.outcome ?? vitriolicOutcome(),
      overrides.ability ?? 'dexterity',
      vitriolicFailed,
      overrides.duration ?? delayed,
      15,
      { kind: 'each_declared_event' },
    );
  }

  it('accepts a citation agreeing on every conjunct and reports the clause’s own unavailability', () => {
    // The control for every near miss below. It also proves the reviewed
    // clause is published unavailable for a reason of its own rather than
    // because some conjunct silently fails.
    expect(vitriolicReason()).toBe(VITRIOLIC_REASON);
  });

  it('refuses a citation whose ability is not the reviewed clause’s ability', () => {
    expect(vitriolicReason({ ability: 'strength' })).toBe(SOURCED_DAMAGE_GENERIC);
  });

  it('refuses an instantaneous citation of a clause whose damage is partly delayed', () => {
    // Vitriolic Sphere is the only reviewed clause with a delayed-damage
    // duration, so this is the only direction in which the duration comparison
    // can be probed: the citation claims `instantaneous`, the reviewed clause
    // says `includes_delayed_damage`.
    //
    // The direction matters. The comparison's second half asks whether the LEFT
    // side is instantaneous, so a kind check pinned true, dropped, or loosened
    // to `||` all accept this pair — an instantaneous citation would be allowed
    // to fold a clause whose second damage roll lands a turn later.
    expect(vitriolicReason({ duration: instantaneous })).toBe(SOURCED_DAMAGE_GENERIC);
  });

  it('refuses a successful-save arm rolled untransformed where the source halves it', () => {
    // The success damage is exactly right (10d4 Acid, the initial roll); only
    // the transform is wrong. Full damage on a successful save is the plausible
    // wrong value, not an absent one.
    expect(vitriolicReason({ outcome: vitriolicOutcome({ roll_transform: 'none' }) }))
      .toBe(SOURCED_DAMAGE_GENERIC);
  });

  it('refuses a successful-save arm that halves the wrong number of dice', () => {
    // Mirror image of the case above: the transform is right and the damage is
    // one die short. A conjunction loosened to `||` accepts this, because the
    // correct transform alone would carry the whole successful-save arm.
    expect(vitriolicReason({ outcome: vitriolicOutcome({ damage: [acid(9)] }) }))
      .toBe(SOURCED_DAMAGE_GENERIC);
  });

  it('reports an unavailable reviewed clause’s own reason before weighing the citation', () => {
    // Geas is reviewed as `unavailable`, and no `SaveSuccessOutcome` kind can
    // ever equal `unavailable`, so a citation of it can never match the
    // conjunction below. Falling through would therefore always report the
    // generic text, and substituting the module's fallback sentence would lose
    // the reviewed reason — the one that says WHY this clause cannot fold.
    expect(
      saveSuccessOutcomeEvidenceFailureReason(
        geas.effect_source,
        geas.id,
        { kind: 'none', evidence: geas.evidence },
        'wisdom',
        [dice(geas.effect_source, 5, 10, 'Psychic')],
        instantaneous,
        15,
        { kind: 'each_declared_event' },
      ),
    ).toBe(GEAS_REASON);
  });

  describe('event frequency', () => {
    const blackTentaclesEvidence: PublicSourceRef = blackTentacles.evidence;

    function blackTentaclesReason(frequency: EventFrequency): string | null {
      return saveSuccessOutcomeEvidenceFailureReason(
        blackTentacles.effect_source,
        blackTentacles.id,
        { kind: 'none', evidence: blackTentaclesEvidence },
        'strength',
        [dice(blackTentacles.effect_source, 3, 6, 'Bludgeoning')],
        instantaneous,
        15,
        frequency,
      );
    }

    function tsunamiReason(frequency: EventFrequency): string | null {
      return saveSuccessOutcomeEvidenceFailureReason(
        tsunamiOngoing.effect_source,
        tsunamiOngoing.id,
        { kind: 'none', evidence: tsunamiOngoing.evidence },
        'strength',
        [dice(tsunamiOngoing.effect_source, 5, 10, 'Bludgeoning')],
        instantaneous,
        15,
        frequency,
      );
    }

    it('accepts the reviewed once-per-turn frequency', () => {
      // Black Tentacles is available, so a full match returns null. The control
      // that makes the near miss below meaningful.
      expect(
        blackTentaclesReason({
          kind: 'once_per_turn',
          turn: 'target',
          evidence: blackTentaclesEvidence,
        }),
      ).toBeNull();
    });

    it('refuses a once-per-turn citation pinned to the wrong turn', () => {
      // The kind and the evidence are the reviewed ones; only the TURN differs.
      // Black Tentacles limits the save to once per turn for the CREATURE in
      // the area, not for the caster, and a fold that counted the caster's turn
      // instead would trigger on a different schedule.
      expect(
        blackTentaclesReason({
          kind: 'once_per_turn',
          turn: 'source',
          evidence: blackTentaclesEvidence,
        }),
      ).toBe(NONE_GENERIC);
    });

    it('accepts the reviewed once-per-round frequency', () => {
      expect(
        tsunamiReason({
          kind: 'once_per_round',
          evidence: tsunamiOngoing.evidence,
        }),
      ).toBeNull();
    });

    it('refuses a once-per-round citation that cites a different SRD heading', () => {
      // Fireball's own reviewed evidence: the same bundled SRD path, a real
      // heading, and the wrong one for this clause.
      expect(
        tsunamiReason({
          kind: 'once_per_round',
          evidence: reviewedSaveSuccessClauses.fireball.evidence,
        }),
      ).toBe(NONE_GENERIC);
    });
  });
});
