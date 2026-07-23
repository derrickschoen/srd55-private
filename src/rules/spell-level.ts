export class SpellLevel {
  readonly value: number;

  constructor(value: number) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 9) {
      throw new RangeError(
        `Spell level must be between 0 and 9, got ${String(value)}.`,
      );
    }
    this.value = value;
  }

  isCantrip(): boolean {
    return this.value === 0;
  }
}
