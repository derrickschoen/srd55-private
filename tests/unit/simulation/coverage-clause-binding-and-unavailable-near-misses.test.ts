import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import {
  positiveDiceCount,
  sourceStableKey,
  type DamageInstance,
  type EventFrequency,
  type PublicSourceRef,
  type SavingThrowDamageDuration,
  type SourceRef,
} from '../../../src/simulation/contracts';
import type {
  DerivedSaveDamageCoverage,
  SourceDamageOccurrence,
  SourceDerivedSaveClause,
} from '../../../src/simulation/spell-source-reader';
// Side-effect import of the module under test. The near-miss cases below all
// re-import it through `vi.resetModules()` + a dynamic import, and a file that
// ONLY imports dynamically is invisible to Stryker's vitest-runner
// "related tests" selection — it would never be run against the mutants it
// kills. This static import puts the file in the module graph.
import '../../../src/simulation/coverage';
import {
  automaticDamageEvidenceFailureReason,
  reviewedSaveSuccessClauses,
} from '../../../src/simulation/coverage';

/**
 * Near-miss probes for three guard families in `src/simulation/coverage.ts`.
 *
 * 1. CLAUSE UNIQUENESS AND SEMANTIC-ANCHOR BINDING (`reviewedSaveClause`,
 *    the block that turns a reviewed clause declaration into exactly one
 *    source-derived clause). A reviewed ID must select ONE source clause, must
 *    not re-use a clause another ID already owns, and — when its heading
 *    yields several clauses — must be pinned to a reviewed semantic anchor
 *    that actually occurs in the span it selected.
 *
 * 2. UNAVAILABLE-SOURCE REQUIREMENTS AND TRANSFORM DISAGREEMENT (the
 *    `sourceClause.success.status === 'unavailable' || …` branch). When a
 *    clause is published as unavailable, the reviewed damage requirements are
 *    carried ONLY if the success arm itself is available; when they are
 *    carried they must agree with the source on both arms' slots and on the
 *    successful-save roll transform.
 *
 * 3. ATTACK-ROLL/AUTOMATIC-DAMAGE EVIDENCE (`automaticDamageEvidenceFailureReason`).
 *    A registered save clause must refuse to authorize an automatic-damage
 *    fold, and every component of the citation — effect identity, evidence,
 *    duration, frequency, damage shape — has to be checked, each on its own.
 *
 * REACHING (1) AND (2). Both run once, at module evaluation, over the
 * committed reviewed tables. With the committed data every rejection arm is
 * unreachable, which is exactly why the mutants inside them survived. Two
 * seams open them:
 *
 *   - `sourceDerivedSaveClauses` is `deriveSaveDamageCoverageFromBodies(...)
 *     .clauses_by_heading`, so mocking the reader lets a test hand ONE heading
 *     a different set of source clauses while every other heading keeps its
 *     real ones.
 *   - `reviewedDamageRequirementsByClause[`${slug}:${key}`]` is a computed
 *     lookup, and eight reviewed clauses deliberately have no entry —
 *     `geas:recurring-damage` among them. Defining that key on
 *     `Object.prototype` supplies requirements for exactly that one clause.
 *     (Same technique, and the same cleanup, as
 *     `coverage-roll-slot-partition-near-misses.test.ts`.)
 *
 * WHY SEVERAL CASES ASSERT A *LATER* GUARD'S MESSAGE. Some near misses are
 * designed to get PAST the guard under test; the module then keeps evaluating
 * and is stopped by an independent oracle further down (the success-kind
 * oracle, or the damage-roll grouping oracle). Asserting that later message —
 * rather than "it threw" or "it loaded" — is what proves the guard under test
 * let the case through for the right reason, and it still fails loudly if a
 * mutated guard rejects the case early with its own text.
 */

type Reader = typeof import('../../../src/simulation/spell-source-reader');
type CatalogKey = typeof import('../../../src/catalog/catalog-key');

const READER_PATH = '../../../src/simulation/spell-source-reader';
const CATALOG_KEY_PATH = '../../../src/catalog/catalog-key';
const COVERAGE_PATH = '../../../src/simulation/coverage';

type ClauseMap = ReadonlyMap<string, readonly SourceDerivedSaveClause[]>;

/**
 * The reviewed requirement types are module-private, so an injected near miss
 * carries its own structurally-compatible shape.
 */
type NearMissSignature = {
  readonly damage_type: string;
  readonly dice_count: number | null;
  readonly die_size: number | null;
  readonly flat_modifier: number | null;
};

type NearMissRequirements = {
  readonly failed: readonly (readonly NearMissSignature[])[];
  readonly failed_roll_slot_groups?: readonly (readonly number[])[];
  readonly success?: readonly (readonly NearMissSignature[])[];
  readonly success_roll_transform?: 'none' | 'floor_half';
};

const PSYCHIC_5D10: NearMissSignature = {
  damage_type: 'Psychic',
  dice_count: 5,
  die_size: 10,
  flat_modifier: null,
};

const FIRE_1D6: NearMissSignature = {
  damage_type: 'Fire',
  dice_count: 1,
  die_size: 6,
  flat_modifier: null,
};

const GEAS_REQUIREMENTS_KEY = 'geas:recurring-damage';
const GEAS_CLAUSE_ID = 'srd-5.2.1:spell:geas:save:recurring-damage';

/**
 * Geas is published as unavailable because its save gates the Charmed
 * condition rather than the damage. Its reviewed availability, success-kind
 * and roll-grouping oracle rows are `unavailable`, `unavailable` and `[]`,
 * which is what makes the two "got past the guard" messages below predictable.
 */
const GEAS_KIND_ORACLE_MESSAGE =
  `${GEAS_CLAUSE_ID} source-derived success kind none disagrees with the independent reviewed oracle unavailable.`;

const GEAS_GROUPING_ORACLE_MESSAGE =
  `${GEAS_CLAUSE_ID} source-derived damage-roll groups disagree with the independent grouping oracle.`;

const INJECTED_TIMING_REASON =
  'Lane E injected timing unavailability for the unavailable-branch probes.';

function occurrence(
  overrides: Partial<SourceDamageOccurrence>,
): SourceDamageOccurrence {
  return {
    damage_type: 'Psychic',
    dice_count: 5,
    die_size: 10,
    flat_modifier: null,
    arm: 'failure',
    timing: 'on_save_resolution',
    roll_transform: 'none',
    start: 0,
    end: 1,
    slot_index: 0,
    roll_index: 0,
    ...overrides,
  };
}

function injectGeasRequirements(requirements: NearMissRequirements): void {
  Object.defineProperty(Object.prototype, GEAS_REQUIREMENTS_KEY, {
    value: requirements,
    configurable: true,
    enumerable: false,
    writable: true,
  });
}

function removeInjectedRequirements(): void {
  delete (Object.prototype as Record<string, unknown>)[GEAS_REQUIREMENTS_KEY];
}

type ImportOptions = {
  /** Rewrites the derived clause map before coverage reads it. */
  readonly clauses?: (base: ClauseMap) => ClauseMap;
  /**
   * Heading → the string whose normalized slug should be used in place of the
   * heading's own. This is the only seam that can give a reviewed clause an ID
   * that the reviewed semantic-anchor table does not carry.
   */
  readonly slugSourceByHeading?: ReadonlyMap<string, string>;
};

function mockModules(options: ImportOptions): void {
  const rewrite = options.clauses;
  if (rewrite !== undefined) {
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
  }
  const slugSources = options.slugSourceByHeading;
  if (slugSources !== undefined) {
    vi.doMock(CATALOG_KEY_PATH, async () => {
      const actual = await vi.importActual<CatalogKey>(CATALOG_KEY_PATH);
      return {
        ...actual,
        normalizeCatalogKeyComponent: (value: string) =>
          actual.normalizeCatalogKeyComponent(
            slugSources.get(value) ?? value,
          ),
      };
    });
  }
}

/**
 * Re-imports coverage under the supplied mocks and returns the message of the
 * `TypeError` its module evaluation threw. Completing without throwing is a
 * failure: a guard that has been weakened away stops rejecting, and that must
 * not read as a pass.
 */
async function moduleEvaluationMessage(
  options: ImportOptions,
): Promise<string> {
  vi.resetModules();
  mockModules(options);
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
    'Module evaluation completed without throwing, so no guard rejected the injected clause binding.',
  );
}

function withHeading(
  base: ClauseMap,
  heading: string,
  clauses: readonly SourceDerivedSaveClause[],
): ClauseMap {
  return new Map([...base, [heading, clauses]]);
}

function clausesFor(
  base: ClauseMap,
  heading: string,
): readonly SourceDerivedSaveClause[] {
  const clauses = base.get(heading);
  // Proving the heading is really there keeps a harness typo from silently
  // turning into "the guard rejected an empty candidate list".
  expect(clauses).toBeDefined();
  return clauses ?? [];
}

function onlyClause(
  base: ClauseMap,
  heading: string,
): SourceDerivedSaveClause {
  const clauses = clausesFor(base, heading);
  expect(clauses).toHaveLength(1);
  const [clause] = clauses;
  if (clause === undefined) {
    throw new Error(`${heading} has no derived source clause.`);
  }
  return clause;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  removeInjectedRequirements();
  vi.doUnmock(READER_PATH);
  vi.doUnmock(CATALOG_KEY_PATH);
  vi.resetModules();
});

describe('reviewed clause uniqueness and reuse', () => {
  it('refuses a heading that offers two candidates to an undiscriminated reviewed ID', async () => {
    // Shatter is reviewed WITHOUT a discriminator, so `matches` is the whole
    // candidate list. Two candidates must be refused for NOT SELECTING ONE —
    // a binder that just took the first candidate would instead reach the
    // "requires a clause discriminator" guard below it and report that, which
    // is a different, weaker diagnosis of the same table.
    expect(
      await moduleEvaluationMessage({
        clauses: (base) => {
          const clause = onlyClause(base, 'Shatter');
          return withHeading(base, 'Shatter', [clause, { ...clause }]);
        },
      }),
    ).toBe(
      'srd-5.2.1:spell:shatter:save:damage does not uniquely select one source-derived damage save clause for Shatter.',
    );
  });

  it('refuses a reviewed ID that re-uses the source clause another ID already owns', async () => {
    // Fireball is reviewed before Shatter, so handing Shatter the very same
    // clause OBJECT makes Shatter the second ID to claim it. Identity is the
    // point: the clause is a perfectly well-formed single candidate, and only
    // the consumed-clause set can tell that it is already spoken for.
    expect(
      await moduleEvaluationMessage({
        clauses: (base) =>
          withHeading(base, 'Shatter', [onlyClause(base, 'Fireball')]),
      }),
    ).toBe(
      'srd-5.2.1:spell:shatter:save:damage reuses a source clause already bound to another ID.',
    );
  });
});

describe('multi-clause semantic anchor binding', () => {
  /**
   * Conjure Elemental yields two clauses and is reviewed with damage-signature
   * discriminators (8d8 and 4d8). The discriminator reads
   * `failed_damage_signatures`, never the span, so rewriting the span leaves
   * the SELECTION untouched and isolates the anchor check.
   */
  function conjureElementalWithSpan(
    span: (original: string) => string,
  ): (base: ClauseMap) => ClauseMap {
    return (base) => {
      const clauses = clausesFor(base, 'Conjure Elemental');
      expect(clauses).toHaveLength(2);
      return withHeading(
        base,
        'Conjure Elemental',
        clauses.map((clause, index) =>
          index === 0 ? { ...clause, span: span(clause.span) } : clause,
        ),
      );
    };
  }

  it('refuses a multi-candidate clause whose selected span no longer carries its reviewed anchor', async () => {
    // '8d8 damage' becomes '8d8 force damage', which still names the same
    // roll and still matches the 8d8 discriminator, but no longer contains
    // the reviewed anchor substring.
    expect(
      await moduleEvaluationMessage({
        clauses: conjureElementalWithSpan((original) => {
          expect(original).toContain('8d8 damage');
          return original.replace('8d8 damage', '8d8 force damage');
        }),
      }),
    ).toBe(
      'srd-5.2.1:spell:conjure-elemental:save:initial-damage is not bound to its reviewed semantic source anchor.',
    );
  });

  it('refuses a multi-candidate clause that has no reviewed anchor at all', async () => {
    // The anchor table is keyed by reviewed clause ID, and the ID is built
    // from the heading's normalized slug. Renaming the slug gives a
    // multi-candidate clause an ID the table does not carry, which is the
    // "no anchor was ever reviewed" arm — distinct from the arm above, where
    // an anchor exists and simply does not occur in the span.
    expect(
      await moduleEvaluationMessage({
        slugSourceByHeading: new Map([
          ['Conjure Elemental', 'Conjure Elemental Lane E Unanchored'],
        ]),
      }),
    ).toBe(
      'srd-5.2.1:spell:conjure-elemental-lane-e-unanchored:save:initial-damage is not bound to its reviewed semantic source anchor.',
    );
  });

  it('refuses an unanchored multi-candidate clause whose span contains the word "undefined"', async () => {
    // Deliberately adversarial. `span.includes(anchor)` with a MISSING anchor
    // searches for the literal text "undefined", so a binder that dropped the
    // "no anchor was reviewed" test and relied on the span test alone would
    // still reject every real span — and would accept exactly this one. The
    // absent-anchor test has to carry the refusal on its own.
    expect(
      await moduleEvaluationMessage({
        slugSourceByHeading: new Map([
          ['Conjure Elemental', 'Conjure Elemental Lane E Unanchored'],
        ]),
        clauses: conjureElementalWithSpan(
          (original) => `${original} The spirit's type is undefined here.`,
        ),
      }),
    ).toBe(
      'srd-5.2.1:spell:conjure-elemental-lane-e-unanchored:save:initial-damage is not bound to its reviewed semantic source anchor.',
    );
  });
});

describe('unavailable-source requirements and transform agreement', () => {
  /**
   * Rewrites Geas — the reviewed clause with no committed requirements entry,
   * and therefore the one clause whose requirements a test can supply — into
   * the shape a particular arm of the unavailable branch needs.
   */
  function geas(
    overrides: Partial<SourceDerivedSaveClause>,
  ): (base: ClauseMap) => ClauseMap {
    return (base) => {
      const clause = onlyClause(base, 'Geas');
      expect(clause.success.status).toBe('unavailable');
      return withHeading(base, 'Geas', [{ ...clause, ...overrides }]);
    };
  }

  /** Success available, plus an independent timing gap that keeps the clause in
   * the unavailable branch no matter what the success arm says. */
  const successAvailableButTimingUnavailable: Partial<SourceDerivedSaveClause> = {
    success: { status: 'available', kind: 'none' },
    timing_unavailable_reason: INJECTED_TIMING_REASON,
  };

  const failureOnly: readonly SourceDamageOccurrence[] = [
    occurrence({ arm: 'failure' }),
  ];

  const failureAndSuccess: readonly SourceDamageOccurrence[] = [
    occurrence({ arm: 'failure' }),
    occurrence({
      arm: 'success',
      damage_type: 'Fire',
      dice_count: 1,
      die_size: 6,
      roll_index: 1,
    }),
  ];

  it('ignores reviewed requirements entirely when the success arm itself is unavailable', async () => {
    // Geas keeps its unavailable success arm. The injected requirements
    // deliberately DISAGREE with the source (Fire 1d6 against a Psychic 5d10
    // occurrence): carrying them would have to be rejected, and publishing
    // them would put slots on a clause that has no reviewed success arm. The
    // clause is instead published with no slots at all and evaluation runs on
    // to the independent grouping oracle, which is what the message proves.
    injectGeasRequirements({ failed: [[FIRE_1D6]] });
    expect(
      await moduleEvaluationMessage({
        clauses: geas({ damage_occurrences: failureOnly }),
      }),
    ).toBe(GEAS_GROUPING_ORACLE_MESSAGE);
  });

  it('refuses an available success arm that has no independently reviewed requirements', async () => {
    expect(
      await moduleEvaluationMessage({
        clauses: geas({
          ...successAvailableButTimingUnavailable,
          damage_occurrences: failureOnly,
        }),
      }),
    ).toBe(`${GEAS_CLAUSE_ID} has no independently reviewed damage requirements.`);
  });

  it('refuses carried failed-save slots that disagree with the source occurrences', async () => {
    // One failed slot either way, so the roll-slot grouping still matches;
    // only the SIGNATURE disagrees.
    injectGeasRequirements({ failed: [[FIRE_1D6]] });
    expect(
      await moduleEvaluationMessage({
        clauses: geas({
          ...successAvailableButTimingUnavailable,
          damage_occurrences: failureOnly,
        }),
      }),
    ).toBe(`${GEAS_CLAUSE_ID} unavailable failed-save damage slots disagree with the source.`);
  });

  it('refuses carried successful-save slots that disagree with the source occurrences', async () => {
    // The failed arm now agrees exactly, so the failed-arm guard passes and
    // only the success arm can reject: the source has no success occurrence
    // at all, and the requirements declare one.
    injectGeasRequirements({ failed: [[PSYCHIC_5D10]], success: [[FIRE_1D6]] });
    expect(
      await moduleEvaluationMessage({
        clauses: geas({
          ...successAvailableButTimingUnavailable,
          damage_occurrences: failureOnly,
        }),
      }),
    ).toBe(`${GEAS_CLAUSE_ID} unavailable successful-save damage slots disagree with the source.`);
  });

  it('refuses a carried successful-save transform the source does not show', async () => {
    // Both arms agree slot-for-slot. The source's success occurrence rolls
    // untransformed, so a declared `floor_half` is the only disagreement left.
    injectGeasRequirements({
      failed: [[PSYCHIC_5D10]],
      success: [[FIRE_1D6]],
      success_roll_transform: 'floor_half',
    });
    expect(
      await moduleEvaluationMessage({
        clauses: geas({
          ...successAvailableButTimingUnavailable,
          damage_occurrences: failureAndSuccess,
        }),
      }),
    ).toBe(`${GEAS_CLAUSE_ID} unavailable successful-save roll transform disagrees with the source.`);
  });

  it('accepts agreeing arms and reads the source transform from the SUCCESS occurrences only', async () => {
    // The failed occurrence carries `floor_half` and the success occurrence
    // does not, so the source transform is `none` and the declared `none`
    // agrees. A source transform read from the wrong arm — or from either arm
    // — would see `floor_half` here and reject a clause that is correct.
    // Getting past the transform guard lets evaluation reach the success-kind
    // oracle, whose message is what this asserts.
    injectGeasRequirements({
      failed: [[PSYCHIC_5D10]],
      success: [[FIRE_1D6]],
      success_roll_transform: 'none',
    });
    expect(
      await moduleEvaluationMessage({
        clauses: geas({
          ...successAvailableButTimingUnavailable,
          damage_occurrences: [
            occurrence({ arm: 'failure', roll_transform: 'floor_half' }),
            occurrence({
              arm: 'success',
              damage_type: 'Fire',
              dice_count: 1,
              die_size: 6,
              roll_index: 1,
              roll_transform: 'none',
            }),
          ],
        }),
      }),
    ).toBe(GEAS_KIND_ORACLE_MESSAGE);
  });
});

describe('automatic-damage evidence citation', () => {
  const fireball = reviewedSaveSuccessClauses.fireball;
  const effect: SourceRef = fireball.effect_source;
  const evidence: PublicSourceRef = fireball.evidence;
  const duration: SavingThrowDamageDuration = { kind: 'instantaneous' };
  const frequency: EventFrequency = { kind: 'each_declared_event' };

  function fireDamage(
    source: SourceRef,
    diceCount: number,
  ): readonly DamageInstance[] {
    return [{
      source,
      damage_type: damageType('Fire'),
      components: [{
        kind: 'dice',
        pool: { count: positiveDiceCount(diceCount), die: 6 },
      }],
    }];
  }

  const GENERIC_REASON =
    'The cited evidence does not establish this automatic-damage clause.';

  const REGISTERED_REASON =
    'Registered clause srd-5.2.1:spell:fireball:save:damage requires a saving throw and cannot authorize a final automatic-damage fold.';

  it('refuses a clause ID the manifest does not carry', () => {
    expect(
      automaticDamageEvidenceFailureReason(
        effect,
        // A well-formed ID for a spell that has no reviewed save clause.
        reviewedSaveSuccessClauses.fireball.id.replace(
          'fireball',
          'lane-e-unregistered',
        ) as typeof fireball.id,
        evidence,
        fireDamage(effect, 8),
        duration,
        frequency,
      ),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a fold whose effect identity is not the registered clause’s effect', () => {
    // The damage instances move WITH the effect, so the damage-shape check
    // still passes and only the effect-identity conjunct is false.
    const otherKey = sourceStableKey('srd-5.2.1:spell:lane-e-other-effect');
    const otherEffect: SourceRef = {
      kind: 'catalog_content',
      content_key: String(otherKey) as ContentKey,
      stable_key: otherKey,
    };
    expect(
      automaticDamageEvidenceFailureReason(
        otherEffect,
        fireball.id,
        evidence,
        fireDamage(otherEffect, 8),
        duration,
        frequency,
      ),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a fold citing a different SRD heading', () => {
    // Shatter's own reviewed evidence: the same bundled SRD path, a real
    // heading, and the wrong one for this clause.
    const shatterEvidence = reviewedSaveSuccessClauses.shatter.evidence;
    expect(shatterEvidence.kind).toBe('bundled_srd');
    expect(
      automaticDamageEvidenceFailureReason(
        effect,
        fireball.id,
        shatterEvidence,
        fireDamage(effect, 8),
        duration,
        frequency,
      ),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a fold whose duration is not the registered clause’s duration', () => {
    expect(
      automaticDamageEvidenceFailureReason(
        effect,
        fireball.id,
        evidence,
        fireDamage(effect, 8),
        { kind: 'includes_delayed_damage', delayed_until: 'end_of_target_next_turn' },
        frequency,
      ),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a fold whose frequency is not the registered clause’s frequency', () => {
    expect(
      automaticDamageEvidenceFailureReason(
        effect,
        fireball.id,
        evidence,
        fireDamage(effect, 8),
        duration,
        { kind: 'once_per_round', evidence },
      ),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a fold whose damage is one die short of the registered clause', () => {
    expect(
      automaticDamageEvidenceFailureReason(
        effect,
        fireball.id,
        evidence,
        fireDamage(effect, 7),
        duration,
        frequency,
      ),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a fully matching citation as a save clause rather than as bad evidence', () => {
    // Every conjunct holds. The refusal must therefore name the REGISTRATION
    // as the reason — a clause that requires a saving throw cannot authorize
    // an automatic fold — and not fall back on the generic evidence text.
    expect(
      automaticDamageEvidenceFailureReason(
        effect,
        fireball.id,
        evidence,
        fireDamage(effect, 8),
        duration,
        frequency,
      ),
    ).toBe(REGISTERED_REASON);
  });
});
