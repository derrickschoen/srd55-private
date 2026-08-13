/**
 * The tables in this file are derived from the System Reference Document 5.2.1
 * and ship inside the bundle, so they carry the same obligation as any bundled
 * data file: see SRD_ATTRIBUTION_NOTICE in ./srd-attribution, which the running
 * application renders, and docs/srd/ATTRIBUTION.md.
 */
import type { CasterContribution } from './caster-contribution';
import { maxPreparableLevel } from './progression-type';
import { proficiencyBonus } from './proficiency';

export type SpellSlotCounts = Readonly<Record<number, number>>;

export interface PactMagicSlots {
  readonly count: number;
  readonly level: number;
}

/**
 * SRD 5.2.1's Multiclass Spellcaster table, indexed by caster level minus one.
 *
 * This is exported as the single licensed input for derived fractional-caster
 * schedules. A subclass may state its own fraction, but must never transcribe
 * a separate slot ladder when this table can derive it.
 */
export const MULTICLASS_SPELLCASTER_TABLE = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
] as const;

const PACT_SLOT_TABLE = [
  [1, 1],
  [2, 1],
  [2, 2],
  [2, 2],
  [2, 3],
  [2, 3],
  [2, 4],
  [2, 4],
  [2, 5],
  [2, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [3, 5],
  [4, 5],
  [4, 5],
  [4, 5],
  [4, 5],
] as const;

export function casterLevel(
  contributions: readonly CasterContribution[],
): number {
  return contributions.reduce(
    (total, contribution) => total + contribution.casterLevels(),
    0,
  );
}

export function slotsForCasterLevel(level: number): SpellSlotCounts {
  if (!Number.isSafeInteger(level)) {
    throw new TypeError('Caster level must be an integer.');
  }
  if (level < 1) {
    return {};
  }

  const row = MULTICLASS_SPELLCASTER_TABLE[Math.min(level, 20) - 1]!;
  return Object.fromEntries(
    row.flatMap((count, index) =>
      count > 0 ? [[index + 1, count] as const] : [],
    ),
  );
}

export function slots(
  contributions: readonly CasterContribution[],
): SpellSlotCounts {
  return slotsForCasterLevel(casterLevel(contributions));
}

export function pactMagic(
  contributions: readonly CasterContribution[],
): PactMagicSlots | null {
  const warlockLevels = contributions.reduce(
    (total, contribution) =>
      contribution.isPactCaster()
        ? total + contribution.classLevel
        : total,
    0,
  );
  if (warlockLevels < 1) {
    return null;
  }

  const [count, level] = PACT_SLOT_TABLE[Math.min(warlockLevels, 20) - 1]!;
  return { count, level };
}

export function maxPreparableLevelForClass(
  contribution: CasterContribution,
): number {
  return maxPreparableLevel(
    contribution.progression,
    contribution.classLevel,
  );
}

export class SpellSlots {
  static casterLevel = casterLevel;
  static slotsForCasterLevel = slotsForCasterLevel;
  static slots = slots;
  static pactMagic = pactMagic;
  static maxPreparableLevelForClass = maxPreparableLevelForClass;
  static proficiencyBonus = proficiencyBonus;
}
