export const HIDDEN_ROLL_CATEGORIES = [
  'death_saves',
  'monster_attack_rolls',
  'monster_saving_throws',
] as const;

export type HiddenRollCategory = (typeof HIDDEN_ROLL_CATEGORIES)[number];

export function isHiddenRollCategory(value: unknown): value is HiddenRollCategory {
  return typeof value === 'string' && HIDDEN_ROLL_CATEGORIES.some((category) => category === value);
}
