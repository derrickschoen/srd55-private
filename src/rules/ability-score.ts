import { AttackBonus } from './attack-bonus';
import { SaveDC } from './save-dc';

export class AbilityScore {
  readonly value: number;

  constructor(value: number) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 30) {
      throw new RangeError(
        `Ability score must be between 1 and 30, got ${String(value)}.`,
      );
    }
    this.value = value;
  }

  modifier(): number {
    return Math.floor((this.value - 10) / 2);
  }

  spellSaveDC(proficiencyBonus: number): SaveDC {
    return SaveDC.from(this, proficiencyBonus);
  }

  spellAttackBonus(proficiencyBonus: number): AttackBonus {
    return AttackBonus.from(this, proficiencyBonus);
  }
}
