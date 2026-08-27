export const HEALING_POTION_DRINK_THRESHOLD = 0.4;

export function shouldDrinkHealingPotion(input: {
  readonly currentHitPoints: number;
  readonly hitPointMaximum: number;
  readonly allyCastHealingIncoming: boolean;
}): boolean {
  if (input.hitPointMaximum < 1 || input.currentHitPoints < 0) {
    throw new RangeError('Healing-potion policy requires nonnegative Hit Points and a positive maximum.');
  }
  return !input.allyCastHealingIncoming &&
    input.currentHitPoints > 0 &&
    input.currentHitPoints / input.hitPointMaximum < HEALING_POTION_DRINK_THRESHOLD;
}
