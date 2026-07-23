import type { AbilityScore } from './ability-score';

export class AttackBonus {
  constructor(readonly value: number) {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(
        `Attack bonus must be an integer, got ${String(value)}.`,
      );
    }
  }

  static from(
    abilityScore: AbilityScore,
    proficiencyBonus: number,
  ): AttackBonus {
    if (!Number.isSafeInteger(proficiencyBonus)) {
      throw new TypeError('Proficiency bonus must be an integer.');
    }
    if (proficiencyBonus < 0) {
      throw new RangeError('Proficiency bonus cannot be negative.');
    }

    return new AttackBonus(abilityScore.modifier() + proficiencyBonus);
  }
}
