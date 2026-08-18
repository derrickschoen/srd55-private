import type { AbilityScore } from './ability-score';

export class AttackBonusIntegerError extends TypeError {
  override readonly name = 'AttackBonusIntegerError' as const;
  constructor(readonly value: number) {
    super(`Attack bonus must be an integer, got ${String(value)}.`);
  }
}

export class AttackBonusProficiencyBonusIntegerError extends TypeError {
  override readonly name =
    'AttackBonusProficiencyBonusIntegerError' as const;
  constructor(readonly proficiency_bonus: number) {
    super('Proficiency bonus must be an integer.');
  }
}

export class AttackBonus {
  constructor(readonly value: number) {
    if (!Number.isSafeInteger(value)) {
      throw new AttackBonusIntegerError(value);
    }
  }

  static from(
    abilityScore: AbilityScore,
    proficiencyBonus: number,
  ): AttackBonus {
    if (!Number.isSafeInteger(proficiencyBonus)) {
      throw new AttackBonusProficiencyBonusIntegerError(proficiencyBonus);
    }
    if (proficiencyBonus < 0) {
      throw new RangeError('Proficiency bonus cannot be negative.');
    }

    return new AttackBonus(abilityScore.modifier() + proficiencyBonus);
  }
}
