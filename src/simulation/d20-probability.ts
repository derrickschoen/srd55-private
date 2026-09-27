import {
  probability,
  type AttackRollModifier,
  type ExpandedCriticalMinimumRoll,
  type Probability,
  type RollState,
  type SavingThrowDamageEvent,
  type TargetArmorClass,
  type TargetSaveBonus,
} from './contracts';

/**
 * The d20 folds: closed probability mass over one selected d20 face.
 *
 * They live apart from `probability.ts` because combat code needs them and
 * nothing else from the simulation layer. `probability.ts` binds each fold to
 * its bundled-SRD citation (`probabilityFoldCitations`, minted by
 * `coverage.ts`); importing that binding would drag the whole coverage
 * manifest, its reviewed clause tables and the spell-source reader into every
 * engine child and app chunk that only wants a hit chance. The citations
 * below name the rule each fold implements; the compile-time citation binding
 * stays in `probability.ts`, whose own folds call these.
 */

export type AttackRollProbabilities = {
  /** Includes critical hits. */
  readonly hit: Probability;
  readonly critical: Probability;
  readonly miss: Probability;
};

/**
 * Closed probability mass for the selected d20 face. Tests derive the same
 * mass independently by enumerating all 20 or 400 ordered raw rolls.
 *
 * Bundled SRD `Advantage/Disadvantage`: use the higher/lower of two d20s.
 * @see publicProbabilityCoverageManifest.advantage_and_disadvantage
 */
export function selectedD20FaceProbability(
  face: number,
  state: RollState,
): Probability {
  if (!Number.isInteger(face) || face < 1 || face > 20) {
    throw new RangeError('A d20 face must be an integer from 1 to 20.');
  }
  return probability(selectedD20FaceWeight(face, state) / 400);
}

function selectedD20FaceWeight(face: number, state: RollState): number {
  switch (state) {
    case 'normal':
      return 20;
    case 'advantage':
      return 2 * face - 1;
    case 'disadvantage':
      return 41 - 2 * face;
  }
}

/**
 * Bundled SRD `They Don't Stack`: same-side grants still use two dice and any
 * mixture of Advantage and Disadvantage resolves to a normal roll.
 */
export function resolveRollState(
  advantageSources: number,
  disadvantageSources: number,
): RollState {
  if (
    !Number.isInteger(advantageSources) ||
    advantageSources < 0 ||
    !Number.isInteger(disadvantageSources) ||
    disadvantageSources < 0
  ) {
    throw new RangeError('Roll-state source counts must be nonnegative integers.');
  }
  if (advantageSources > 0 && disadvantageSources > 0) {
    return 'normal';
  }
  if (advantageSources > 0) {
    return 'advantage';
  }
  if (disadvantageSources > 0) {
    return 'disadvantage';
  }
  return 'normal';
}

/**
 * Bundled SRD `Attack Rolls` and `Rolling 20 or 1`: compare total to AC, but a
 * natural 1 always misses and a natural 20 always hits and is critical.
 * Automatic outcomes are deliberately confined to this attack-specific fold.
 */
export function attackRollProbabilities(
  attackBonus: AttackRollModifier,
  armorClass: TargetArmorClass,
  state: RollState,
  criticalMinimumRoll: 20 | ExpandedCriticalMinimumRoll = 20,
): AttackRollProbabilities {
  // Cited by `probabilityFoldCitations.attack_roll` and
  // `.natural_one_and_twenty`, both type-checked as bundled SRD content.
  let hitWeight = 0;
  let criticalWeight = 0;
  for (let face = 1; face <= 20; face += 1) {
    const weight = selectedD20FaceWeight(face, state);
    if (face === 1) {
      continue;
    }
    if (face >= criticalMinimumRoll) {
      hitWeight += weight;
      criticalWeight += weight;
      continue;
    }
    if (face + attackBonus >= armorClass) {
      hitWeight += weight;
    }
  }
  const hit = hitWeight / 400;
  const critical = criticalWeight / 400;
  return {
    hit: probability(hit),
    critical: probability(critical),
    miss: probability((400 - hitWeight) / 400),
  };
}

/**
 * Bundled SRD `Saving Throws` plus the general D20 Test comparison: a save
 * succeeds when total meets or exceeds DC. `Rolling 20 or 1` speaks only about
 * ATTACK ROLLS, so this fold intentionally has no automatic face outcomes.
 */
export function saveSuccessProbability(
  saveDc: SavingThrowDamageEvent['save_dc'],
  saveBonus: TargetSaveBonus,
  state: RollState,
): Probability {
  // Cited by `probabilityFoldCitations.saving_throw`, type-checked as bundled
  // SRD content.
  let successWeight = 0;
  for (let face = 1; face <= 20; face += 1) {
    if (face + saveBonus >= saveDc) {
      successWeight += selectedD20FaceWeight(face, state);
    }
  }
  return probability(successWeight / 400);
}
