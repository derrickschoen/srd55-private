import type { AbilityScore } from './ability-score';

export class SaveDCProficiencyBonusIntegerError extends TypeError {
  override readonly name = 'SaveDCProficiencyBonusIntegerError' as const;
  constructor(readonly proficiency_bonus: number) {
    super('Proficiency bonus must be an integer.');
  }
}

export class SaveDC {
  constructor(readonly value: number) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`Save DC must be positive, got ${String(value)}.`);
    }
  }

  static from(abilityScore: AbilityScore, proficiencyBonus: number): SaveDC {
    if (!Number.isSafeInteger(proficiencyBonus)) {
      throw new SaveDCProficiencyBonusIntegerError(proficiencyBonus);
    }
    if (proficiencyBonus < 0) {
      throw new RangeError('Proficiency bonus cannot be negative.');
    }

    return new SaveDC(8 + abilityScore.modifier() + proficiencyBonus);
  }
}
