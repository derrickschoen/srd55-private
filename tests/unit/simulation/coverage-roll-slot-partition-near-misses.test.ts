import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Side-effect import: registers this file in vitest's module graph so
// Stryker's vitest-runner "related tests" selection includes it. The tests
// themselves re-import via vi.resetModules() + dynamic import.
import '../../../src/simulation/coverage';

/**
 * Near-miss probes for the roll-slot-group PARTITION guard in
 * `src/simulation/coverage.ts` — the guard that requires the failed-save
 * damage-roll slot groups of a reviewed clause to partition that clause's
 * failed damage slots exactly once each:
 *
 *   groupedSlotIndexes.length !== requirements.failed.length ||
 *   new Set(groupedSlotIndexes).size !== requirements.failed.length ||
 *   groupedSlotIndexes.some((index) => index < 0 || index >= requirements.failed.length)
 *
 * REACHING IT. The guard runs once, at module evaluation, over
 * `reviewedDamageRequirementsByClause` — a module-private `const` object
 * literal in the same file. Nothing the guard reads crosses a module boundary,
 * so the reader-mocking pattern used by
 * `coverage-corpus-and-suspect-guards.test.ts` cannot reach it: mocking the
 * source reader changes the *source-derived* clause, never the *reviewed*
 * requirements, and `failedRollSlotGroups()` derives the groups from the same
 * reviewed entry the guard measures them against. With the committed table the
 * failure arm is unreachable, which is exactly why every mutant inside it
 * survived.
 *
 * The one seam that does exist is the lookup itself. The requirements are read
 * with a computed property access, `reviewedDamageRequirementsByClause[
 * `${slug}:${key}`]`, and EIGHT reviewed clauses deliberately have no entry —
 * `geas:recurring-damage` among them. For those keys the access falls through
 * the prototype chain, so defining the key on `Object.prototype` makes
 * `requirements` a defined object of our choosing for exactly one clause,
 * leaving the other seventy-eight clauses reading their real committed
 * entries. Each test below installs one deliberately-malformed partition,
 * re-imports the module, and asserts the exact diagnostic; the property is
 * removed and the module registry reset after every test.
 *
 * ISOLATION. The guard is a three-clause disjunction, so a near miss that
 * trips two clauses at once cannot tell them apart. Every case is therefore
 * built so that exactly one clause is true wherever that is possible: an
 * over-long grouping whose distinct indexes still cover every slot (count
 * only), a same-length grouping that repeats or shares a slot (distinctness
 * only), and an in-count, all-distinct grouping that names a slot index which
 * does not exist (range only), including the `index === failed.length`
 * boundary that separates `>=` from `>`.
 *
 * NEGATIVE CONTROLS. Two groupings that DO partition the slots — the same two
 * slots in reverse group order, and both slots inside a single group — are
 * asserted to get past this guard and be rejected by the NEXT guard instead,
 * with its own distinct message. Without them, a guard that rejected every
 * injected shape would look identical to a correct one.
 */

const UNCLAIMED_REQUIREMENTS_KEY = 'geas:recurring-damage';

const CLAUSE_ID = 'srd-5.2.1:spell:geas:save:recurring-damage';

const PARTITION_MESSAGE =
  `${CLAUSE_ID} damage-roll slot groups do not partition its failed-save slots.`;

/**
 * The message of the guard that runs immediately AFTER the partition guard. A
 * near miss that partitions correctly must reach this one, and asserting the
 * text (rather than merely "it threw") is what keeps the two apart.
 */
const SOURCE_DISAGREEMENT_MESSAGE =
  `${CLAUSE_ID} damage-roll slot groups disagree with the clause-local source rolls.`;

const COVERAGE_PATH = '../../../src/simulation/coverage';

/**
 * The reviewed requirement types are module-private, so a near miss has to
 * carry its own structurally-compatible shape. Only `failed.length` and
 * `failed_roll_slot_groups` are read before the partition guard decides; the
 * signature contents are real Geas values so nothing downstream sees nonsense
 * in the cases that get past the guard.
 */
type NearMissSignature =
  | {
      readonly kind: 'dice';
      readonly damage_type: string;
      readonly count: number;
      readonly die: number;
    }
  | {
      readonly kind: 'flat';
      readonly damage_type: string;
      readonly amount: number;
    };

type NearMissRequirements = {
  readonly failed: readonly (readonly NearMissSignature[])[];
  readonly failed_roll_slot_groups?: readonly (readonly number[])[];
};

const PSYCHIC_5D10: NearMissSignature = {
  damage_type: 'Psychic',
  kind: 'dice',
  count: 5,
  die: 10,
};

const slot: readonly NearMissSignature[] = [PSYCHIC_5D10];

function injectRequirements(requirements: NearMissRequirements): void {
  Object.defineProperty(Object.prototype, UNCLAIMED_REQUIREMENTS_KEY, {
    value: requirements,
    configurable: true,
    enumerable: false,
    writable: true,
  });
}

function removeInjectedRequirements(): void {
  delete (Object.prototype as Record<string, unknown>)[
    UNCLAIMED_REQUIREMENTS_KEY
  ];
}

/**
 * Re-imports `coverage.ts` with the injected requirements in place and returns
 * the message of the `TypeError` its module evaluation threw. Returning
 * normally is itself a failure: a guard that has been weakened away stops
 * throwing, and that must not read as a pass.
 */
async function moduleEvaluationMessage(
  requirements: NearMissRequirements,
): Promise<string> {
  injectRequirements(requirements);
  vi.resetModules();
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
    'Module evaluation completed without throwing, so no guard rejected the injected roll-slot groups.',
  );
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  removeInjectedRequirements();
  vi.resetModules();
});

describe('roll-slot-group partition guard near misses', () => {
  it('evaluates the committed module cleanly when nothing is injected', async () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        Object.prototype,
        UNCLAIMED_REQUIREMENTS_KEY,
      ),
    ).toBe(false);
    vi.resetModules();
    const coverage = await import(COVERAGE_PATH);
    expect(
      Object.keys(coverage.reviewedSaveEffectStableKeys).length,
    ).toBeGreaterThan(0);
    expect(
      Object.values(coverage.reviewedSaveEffectStableKeys),
    ).toContain('srd-5.2.1:spell:geas');
  });

  it('rejects groups that omit one of the failed slots', async () => {
    expect(
      await moduleEvaluationMessage({
        failed: [slot, slot],
        failed_roll_slot_groups: [[0]],
      }),
    ).toBe(PARTITION_MESSAGE);
  });

  it('rejects an over-long grouping even when its distinct indexes cover every slot', async () => {
    // [0], [1], [1] — three grouped indexes for two slots, but the distinct
    // set is still exactly {0, 1}. Only the COUNT clause is true here.
    expect(
      await moduleEvaluationMessage({
        failed: [slot, slot],
        failed_roll_slot_groups: [[0], [1], [1]],
      }),
    ).toBe(PARTITION_MESSAGE);
  });

  it('rejects two groups that both roll the same slot', async () => {
    // [0], [0] — the right NUMBER of grouped indexes for two slots, so only
    // the distinctness clause is true.
    expect(
      await moduleEvaluationMessage({
        failed: [slot, slot],
        failed_roll_slot_groups: [[0], [0]],
      }),
    ).toBe(PARTITION_MESSAGE);
  });

  it('rejects two groups that share a slot while leaving another ungrouped', async () => {
    // Three slots, grouped as [0, 1] and [1]: three grouped indexes, so the
    // count clause is false, and slot 2 is never rolled.
    expect(
      await moduleEvaluationMessage({
        failed: [slot, slot, slot],
        failed_roll_slot_groups: [[0, 1], [1]],
      }),
    ).toBe(PARTITION_MESSAGE);
  });

  it('rejects a group naming a slot index past the end of the failed slots', async () => {
    // [0], [5] — two distinct grouped indexes for two slots, so only the
    // range clause is true.
    expect(
      await moduleEvaluationMessage({
        failed: [slot, slot],
        failed_roll_slot_groups: [[0], [5]],
      }),
    ).toBe(PARTITION_MESSAGE);
  });

  it('rejects a group naming the index one past the last slot', async () => {
    // [0], [2] with two slots. The last valid index is 1, so `index >=
    // failed.length` must reject 2; a guard testing `index > failed.length`
    // would accept it.
    expect(
      await moduleEvaluationMessage({
        failed: [slot, slot],
        failed_roll_slot_groups: [[0], [2]],
      }),
    ).toBe(PARTITION_MESSAGE);
  });

  it('rejects a group naming a negative slot index', async () => {
    // [0], [-1] — count and distinctness both hold, so only `index < 0`
    // rejects this.
    expect(
      await moduleEvaluationMessage({
        failed: [slot, slot],
        failed_roll_slot_groups: [[0], [-1]],
      }),
    ).toBe(PARTITION_MESSAGE);
  });

  it('accepts a valid partition whose groups are in reverse slot order', async () => {
    // [1], [0] partitions the two slots exactly once each. The partition guard
    // must let it through — it is the NEXT guard, comparing against the
    // clause-local source rolls, that rejects it.
    expect(
      await moduleEvaluationMessage({
        failed: [slot, slot],
        failed_roll_slot_groups: [[1], [0]],
      }),
    ).toBe(SOURCE_DISAGREEMENT_MESSAGE);
  });

  it('accepts a valid partition that rolls both slots in one group', async () => {
    expect(
      await moduleEvaluationMessage({
        failed: [slot, slot],
        failed_roll_slot_groups: [[0, 1]],
      }),
    ).toBe(SOURCE_DISAGREEMENT_MESSAGE);
  });
});
