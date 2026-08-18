export class ProficiencyCharacterLevelIntegerError extends TypeError {
  override readonly name =
    'ProficiencyCharacterLevelIntegerError' as const;
  constructor(readonly character_level: number) {
    super('Character level must be an integer.');
  }
}

export function proficiencyBonus(characterLevel: number): number {
  if (!Number.isSafeInteger(characterLevel)) {
    throw new ProficiencyCharacterLevelIntegerError(characterLevel);
  }
  return Math.floor((characterLevel - 1) / 4) + 2;
}
