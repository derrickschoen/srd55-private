/**
 * Stryker's related-test selection only sees a file as touching
 * `src/simulation/coverage.ts` when that file *statically* imports it. Every
 * module-evaluation probe below reaches the module through
 * `vi.resetModules()` + `vi.doMock()` + `await import(...)`, which is invisible
 * to that selection; without the side-effect import on the next line the kills
 * this file makes would be reported as survivors.
 */
import '../../../src/simulation/coverage';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { damageType, type DieSize } from '../../../src/domain/enums';
import {
  damageFlatModifier,
  positiveDiceCount,
  type DamageComponent,
  type DamageInstance,
  type NonEmptyReadonlyArray,
  type SaveSuccessClauseId,
  type SaveSuccessOutcome,
} from '../../../src/simulation/contracts';
import type {
  DerivedSaveDamageCoverage,
  SourceDamageOccurrence,
  SourceDerivedSaveClause,
} from '../../../src/simulation/spell-source-reader';
import {
  saveSuccessOutcomeEvidenceFailureReason,
  saveSuccessOutcomeEvidenceManifest,
} from '../../../src/simulation/coverage';

/**
 * Adversarial probes for the two algorithmic cores of
 * `src/simulation/coverage.ts`:
 *
 * 1. the clause-local roll-slot grouping and the bijective slot-assignment
 *    backtracker (`sourceDamageRollSlotGroups`, `sameDamageRollSlotGroups`,
 *    `damageSlotsAreBijective`), which run only at module evaluation while the
 *    reviewed clause table is bound to its source clauses, and
 * 2. the pool-kind / damage-type / remaining-amount matcher inside
 *    `damageMatchesSourceClause`, reachable at runtime through the exported
 *    `saveSuccessOutcomeEvidenceFailureReason`.
 *
 * The reviewed (declared) side of both comparisons is a private, code-owned
 * table that a test may not touch. Everything here therefore perturbs the
 * *source* side — the derived clause's `damage_occurrences`, or the caller's
 * damage instances — into shapes that are near-misses of the reviewed truth:
 * groups presented in non-canonical order, slot sets that agree only as a
 * prefix, assignments that are satisfiable in more than one way but legal in
 * only one, and pools whose remaining amount lands exactly on zero or one off
 * it.
 */

type Reader = typeof import('../../../src/simulation/spell-source-reader');
type Coverage = typeof import('../../../src/simulation/coverage');

const READER_PATH = '../../../src/simulation/spell-source-reader';

/** Re-importing the whole coverage module is not fast; each probe pays for one. */
const IMPORT_TIMEOUT_MS = 30_000;

afterEach(() => {
  vi.doUnmock(READER_PATH);
  vi.resetModules();
});

type OccurrenceRewrite = (
  occurrences: readonly SourceDamageOccurrence[],
) => readonly SourceDamageOccurrence[];

/**
 * Re-imports the coverage module with one spell's derived save clauses carrying
 * rewritten damage occurrences. Nothing else about the derivation changes, so
 * clause binding, discriminators and every other module-level invariant still
 * see the real corpus.
 */
async function importCoverageWithOccurrences(
  heading: string,
  rewrite: OccurrenceRewrite,
): Promise<Coverage> {
  vi.resetModules();
  vi.doMock(READER_PATH, async () => {
    const actual = await vi.importActual<Reader>(READER_PATH);
    return {
      ...actual,
      deriveSaveDamageCoverageFromBodies: (
        bodies: ReadonlyMap<string, string>,
      ): DerivedSaveDamageCoverage => {
        const derived = actual.deriveSaveDamageCoverageFromBodies(bodies);
        const clauses = derived.clauses_by_heading.get(heading);
        // A silently absent heading would turn every probe below into a
        // vacuous re-import of the untouched corpus.
        expect(clauses).toBeDefined();
        const rewritten = (clauses ?? []).map((clause: SourceDerivedSaveClause) => ({
          ...clause,
          damage_occurrences: rewrite(clause.damage_occurrences),
        }));
        const next = new Map(derived.clauses_by_heading);
        next.set(heading, rewritten);
        return { ...derived, clauses_by_heading: next };
      },
    };
  });
  return await import('../../../src/simulation/coverage');
}

function firstOccurrence(
  occurrences: readonly SourceDamageOccurrence[],
): SourceDamageOccurrence {
  const [first] = occurrences;
  if (first === undefined) {
    throw new Error('The fixture spell carries no damage occurrences.');
  }
  return first;
}

const FLAME_STRIKE_ROLL_GROUP_FAILURE =
  'srd-5.2.1:spell:flame-strike:save:damage damage-roll slot groups disagree with the clause-local source rolls.';
const DISINTEGRATE_ROLL_GROUP_FAILURE =
  'srd-5.2.1:spell:disintegrate:save:damage damage-roll slot groups disagree with the clause-local source rolls.';
const DISINTEGRATE_SLOT_BIJECTION_FAILURE =
  'srd-5.2.1:spell:disintegrate:save:damage failed-save damage slots do not bijectively match clause-local source occurrences';

const FLAME_STRIKE_ID =
  'srd-5.2.1:spell:flame-strike:save:damage' as SaveSuccessClauseId;
const DISINTEGRATE_ID =
  'srd-5.2.1:spell:disintegrate:save:damage' as SaveSuccessClauseId;
const VITRIOLIC_SPHERE_ID =
  'srd-5.2.1:spell:vitriolic-sphere:save:damage' as SaveSuccessClauseId;

/**
 * Flame Strike is the two-roll fixture: one Fire roll in slot 0, one Radiant
 * roll in slot 1, declared as the roll groups `[[0], [1]]`. Disintegrate is the
 * two-slots-in-one-roll fixture: `10d6` Force in slot 0 and a flat `40` Force
 * in slot 1, both inside roll 0, declared as `[[0, 1]]`.
 */
describe('clause-local roll-slot grouping', () => {
  it('accepts the real corpus, so every rejection below is a guard and not the harness', async () => {
    const coverage = await importCoverageWithOccurrences('Flame Strike', (o) => o);
    expect(coverage.saveSuccessOutcomeEvidenceManifest.has(FLAME_STRIKE_ID)).toBe(true);
    const flameStrike = coverage.saveSuccessOutcomeEvidenceManifest.get(FLAME_STRIKE_ID);
    expect(flameStrike?.failed_damage_roll_slot_groups).toStrictEqual([[0], [1]]);
  }, IMPORT_TIMEOUT_MS);

  it('sorts roll groups by roll index when the occurrences arrive with the later roll first', async () => {
    const coverage = await importCoverageWithOccurrences(
      'Flame Strike',
      (o) => [...o].reverse(),
    );
    const flameStrike = coverage.saveSuccessOutcomeEvidenceManifest.get(FLAME_STRIKE_ID);
    expect(flameStrike?.failed_damage_roll_slot_groups).toStrictEqual([[0], [1]]);
  }, IMPORT_TIMEOUT_MS);

  it('sorts the slots inside one roll when the higher slot index arrives first', async () => {
    const coverage = await importCoverageWithOccurrences(
      'Disintegrate',
      (o) => [...o].reverse(),
    );
    const disintegrate = coverage.saveSuccessOutcomeEvidenceManifest.get(DISINTEGRATE_ID);
    expect(disintegrate?.failed_damage_roll_slot_groups).toStrictEqual([[0, 1]]);
  }, IMPORT_TIMEOUT_MS);

  it('ignores a successful-save occurrence that would otherwise open a third failure roll', async () => {
    // Vitriolic Sphere is the only reviewed clause carrying a success-arm
    // occurrence. Moving it to a roll index no failure occurrence uses leaves
    // the failure grouping — and the success slots, which key on slot index —
    // untouched, so only the arm filter stands between it and a third group.
    const coverage = await importCoverageWithOccurrences('Vitriolic Sphere', (o) =>
      o.map((occurrence) =>
        occurrence.arm === 'success'
          ? { ...occurrence, roll_index: 2 }
          : occurrence,
      ),
    );
    const vitriolic = coverage.saveSuccessOutcomeEvidenceManifest.get(VITRIOLIC_SPHERE_ID);
    expect(vitriolic?.failed_damage_roll_slot_groups).toStrictEqual([[0], [1]]);
  }, IMPORT_TIMEOUT_MS);

  it('rejects a third source roll whose groups still match the declared ones as a prefix', async () => {
    // Source groups become [[0], [1], [0]]: the declared [[0], [1]] is an exact
    // prefix, and the repeated slot-0 signature is deduplicated away so the
    // slot-level bijection downstream still agrees. Only the group *count*
    // comparison can reject this.
    await expect(
      importCoverageWithOccurrences('Flame Strike', (o) => [
        ...o,
        { ...firstOccurrence(o), roll_index: 2 },
      ]),
    ).rejects.toThrow(FLAME_STRIKE_ROLL_GROUP_FAILURE);
  }, IMPORT_TIMEOUT_MS);

  it('rejects a source roll group that is one slot longer than the declared group it starts with', async () => {
    // Source groups become [[0, 1, 2]] against the declared [[0, 1]]: same
    // number of groups, and the declared group matches position by position for
    // its whole length. Only the per-group length comparison can reject this.
    await expect(
      importCoverageWithOccurrences('Disintegrate', (o) => [
        ...o,
        { ...firstOccurrence(o), slot_index: 2, kind: 'dice', count: 3, die: 4 },
      ]),
    ).rejects.toThrow(DISINTEGRATE_ROLL_GROUP_FAILURE);
  }, IMPORT_TIMEOUT_MS);

  it('rejects a source roll group of the right length whose second slot index differs', async () => {
    // Source groups become [[0, 2]] against the declared [[0, 1]]: same group
    // count, same group length, and the first position agrees. Renumbering the
    // flat slot leaves the slot-level bijection satisfiable, so only the
    // position-by-position comparison — over *every* position, not just one —
    // can reject this.
    await expect(
      importCoverageWithOccurrences('Disintegrate', (o) =>
        o.map((occurrence, index) =>
          index === 1 ? { ...occurrence, slot_index: 2 } : occurrence,
        ),
      ),
    ).rejects.toThrow(DISINTEGRATE_ROLL_GROUP_FAILURE);
  }, IMPORT_TIMEOUT_MS);
});

describe('bijective slot assignment against the reviewed declaration', () => {
  it('accepts a source whose only legal assignment is not the identity one', async () => {
    // Flame Strike's Fire roll is moved to roll 1 / slot 1 and its Radiant roll
    // to roll 0 / slot 0. The roll grouping is unchanged, but the declared slot
    // 0 (Fire) now matches only source slot 1 and declared slot 1 (Radiant)
    // only source slot 0, so the search has to walk past its first candidate.
    const coverage = await importCoverageWithOccurrences('Flame Strike', (o) =>
      o.map((occurrence, index) =>
        index === 0
          ? { ...occurrence, roll_index: 1, slot_index: 1 }
          : { ...occurrence, roll_index: 0, slot_index: 0 },
      ),
    );
    const flameStrike = coverage.saveSuccessOutcomeEvidenceManifest.get(FLAME_STRIKE_ID);
    expect(flameStrike?.failed_damage_signature_slots).toStrictEqual([
      [{ kind: 'dice', damage_type: 'Fire', count: 5, die: 6 }],
      [{ kind: 'dice', damage_type: 'Radiant', count: 5, die: 6 }],
    ]);
  }, IMPORT_TIMEOUT_MS);

  it('rejects a source that covers one declared slot twice and the other not at all', async () => {
    // Both source slots become `10d6` Force. The declared dice slot matches
    // either of them, so a search that may reuse a source slot, or that accepts
    // its first enterable candidate without checking the rest of the
    // assignment, reports a match; a bijection does not exist.
    await expect(
      importCoverageWithOccurrences('Disintegrate', (o) =>
        o.map((occurrence, index) =>
          index === 1
            ? {
                ...occurrence,
                kind: 'dice',
                count: 10,
                die: 6,
              }
            : occurrence,
        ),
      ),
    ).rejects.toThrow(DISINTEGRATE_SLOT_BIJECTION_FAILURE);
  }, IMPORT_TIMEOUT_MS);
});

/**
 * Disintegrate's failed-save declaration is the one reviewed shape that mixes a
 * dice slot and a flat slot of the *same* damage type inside a single roll
 * group, which is what makes it the adversarial fixture for the pool-kind
 * matcher: nothing but the kind test and the die-size test separates the two.
 */
describe('supplied-pool matching inside the damage signature matcher', () => {
  const dicePool = (count: number, die: DieSize): DamageComponent => ({
    kind: 'dice',
    pool: { count: positiveDiceCount(count), die },
  });
  const flatPool = (modifier: number): DamageComponent => ({
    kind: 'flat',
    modifier: damageFlatModifier(modifier),
  });

  function disintegrateDamage(
    components: NonEmptyReadonlyArray<DamageComponent>,
  ): readonly DamageInstance[] {
    const entry = saveSuccessOutcomeEvidenceManifest.get(DISINTEGRATE_ID);
    if (entry === undefined) {
      throw new Error('The reviewed Disintegrate clause is missing.');
    }
    return [{
      source: entry.effect_source,
      damage_type: damageType('Force'),
      components,
    }];
  }

  /**
   * Everything the reviewed clause asks for other than the damage itself is
   * read back off the clause, so the only reason any call below can fail is the
   * damage match.
   */
  function reasonForDisintegrate(damage: readonly DamageInstance[]): string | null {
    const entry = saveSuccessOutcomeEvidenceManifest.get(DISINTEGRATE_ID);
    if (entry === undefined || entry.kind === 'unavailable') {
      throw new Error('The reviewed Disintegrate clause is missing or unavailable.');
    }
    const outcome: SaveSuccessOutcome = { kind: 'none', evidence: entry.evidence };
    expect(entry.kind).toBe('none');
    return saveSuccessOutcomeEvidenceFailureReason(
      entry.effect_source,
      DISINTEGRATE_ID,
      outcome,
      entry.ability,
      damage,
      entry.duration,
      entry.fixed_save_dc ?? 15,
      entry.frequency,
    );
  }

  const GENERIC_REASON =
    'The cited evidence does not establish the none successful-save clause.';

  it('accepts the reviewed damage, draining both pools to exactly zero', () => {
    expect(
      reasonForDisintegrate(disintegrateDamage([dicePool(10, 6), flatPool(40)])),
    ).toBeNull();
  });

  it('refuses a single dice pool large enough to cover the flat slot as well', () => {
    // One `50d6` Force pool. The dice slot wants 10 of it and the flat slot
    // wants 40, which is exactly what is left — so only the flat signature's
    // insistence on a flat-kind pool stands between this and a false match.
    expect(
      reasonForDisintegrate(disintegrateDamage([dicePool(50, 6)])),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a single flat pool large enough to cover the dice slot as well', () => {
    // The mirror image: one flat `50` Force pool, of which the dice slot wants
    // 10 and the flat slot the remaining 40.
    expect(
      reasonForDisintegrate(disintegrateDamage([flatPool(50)])),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a dice pool of the wrong die size with the right count', () => {
    // `10d8` instead of `10d6`: the pool is dice-kind, the damage type agrees,
    // the count is exactly the required amount, and the flat pool beside it is
    // exactly right. Only the die-size comparison can refuse it.
    expect(
      reasonForDisintegrate(disintegrateDamage([dicePool(10, 8), flatPool(40)])),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a flat pool one point below the declared amount', () => {
    // The dice slot is fully funded but the flat pool holds 39 against a
    // declared 40: the remaining-amount check inside the slot matcher
    // (coverage.ts:1837, `(remaining[localIndex] ?? 0) >= amount`) is the only
    // clause that can refuse the assignment. A mutant forcing that check to
    // true accepts the underfunded pool and drives the remainder negative.
    expect(
      reasonForDisintegrate(disintegrateDamage([dicePool(10, 6), flatPool(39)])),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a flat pool one point above the declared amount', () => {
    // Every slot is assignable and the dice pool lands on exactly zero; the
    // flat pool is left holding 1, so the all-pools-consumed check at the leaf
    // is the only thing that can refuse it.
    expect(
      reasonForDisintegrate(disintegrateDamage([dicePool(10, 6), flatPool(41)])),
    ).toBe(GENERIC_REASON);
  });

  it('refuses a flat pool one point below the declared amount', () => {
    expect(
      reasonForDisintegrate(disintegrateDamage([dicePool(10, 6), flatPool(39)])),
    ).toBe(GENERIC_REASON);
  });

  /**
   * The subsumption proof for the one mutant still left standing on purpose:
   * `pool.kind === 'dice'` inside the dice arm. Supplied pools carry a die
   * exactly when they are dice-kind, by construction, so that clause is
   * redundant with the die comparison beside it and no input distinguishes
   * them.
   *
   * Its former partner — `signature.die_size === null` inside the flat arm —
   * is GONE rather than proven: the two-arm `DamageSignature` cannot express a
   * flat signature that also carries a die size, so there is no clause left to
   * mutate. What this test still pins is the fact that made the clause
   * redundant: every reviewed signature carries the amount fields of its own
   * arm and no others.
   */
  it('never reviews a damage signature carrying the other arm\'s amount fields', () => {
    let signatureCount = 0;
    for (const clause of saveSuccessOutcomeEvidenceManifest.values()) {
      const slots = [
        ...clause.failed_damage_signature_slots,
        ...clause.success_damage_signature_slots,
      ];
      for (const slot of slots) {
        for (const signature of slot) {
          signatureCount += 1;
          expect(Object.keys(signature).sort()).toStrictEqual(
            signature.kind === 'dice'
              ? ['count', 'damage_type', 'die', 'kind']
              : ['amount', 'damage_type', 'kind'],
          );
        }
      }
    }
    expect(signatureCount).toBeGreaterThan(0);
  });
});
