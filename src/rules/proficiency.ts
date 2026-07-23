export function proficiencyBonus(characterLevel: number): number {
  if (!Number.isSafeInteger(characterLevel)) {
    throw new TypeError('Character level must be an integer.');
  }
  return Math.floor((characterLevel - 1) / 4) + 2;
}
