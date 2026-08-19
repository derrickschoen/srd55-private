import { gridDistance, type GridCell } from './grid';
import type { Feet } from './values';

export type AttackRange =
  | { readonly kind: 'melee'; readonly reach: Feet }
  | {
      readonly kind: 'ranged';
      readonly normal: Feet;
      readonly long: Feet;
    };

export type AttackRangeVerdict =
  | { readonly kind: 'legal'; readonly rollMode: 'normal' }
  | { readonly kind: 'legal'; readonly rollMode: 'disadvantage' }
  | { readonly kind: 'illegal'; readonly reason: 'out_of_range' };

export function attackRangeVerdict(
  attacker: GridCell,
  target: GridCell,
  range: AttackRange,
): AttackRangeVerdict {
  const distance = gridDistance(attacker, target);
  if (range.kind === 'melee') {
    return distance <= range.reach
      ? { kind: 'legal', rollMode: 'normal' }
      : { kind: 'illegal', reason: 'out_of_range' };
  }
  if (distance <= range.normal) {
    return { kind: 'legal', rollMode: 'normal' };
  }
  if (distance <= range.long) {
    return { kind: 'legal', rollMode: 'disadvantage' };
  }
  return { kind: 'illegal', reason: 'out_of_range' };
}
