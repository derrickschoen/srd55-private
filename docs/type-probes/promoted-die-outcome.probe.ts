/**
 * A negative compile probe run by `tests/unit/ui/dice.test.ts`.
 *
 * This file lives outside the compiled projects because its one statement must
 * fail: direct consumers construct a promoted outcome through the validating
 * seam instead of assigning an unrestricted number to `DiceConfig`.
 */
import type { DieUpgrade } from '../../src/ui/screens/planner/dice';

export const unrestrictedPromotion: Pick<DieUpgrade, 'promotedTo'> = {
  promotedTo: 8,
};
