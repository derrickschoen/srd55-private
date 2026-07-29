import { describe, expect, it } from 'vitest';
import type {
  AbilityIncreaseContribution,
  GuidedAbilityScores,
} from '../../../src/builder/contracts';
import { resolveAbilities } from '../../../src/rules/ability-contributions';

const BASE_19: GuidedAbilityScores = {
  strength: 19,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

function increase(
  amount: number,
  maximum: number,
): AbilityIncreaseContribution {
  return {
    ability: 'strength',
    amount,
    maximum,
    source_instance_id: 1,
  };
}

describe('B2 ability contribution arithmetic', () => {
  it('B2-CAP applies each maximum in acquisition order, so reversing the grants deliberately changes the result', () => {
    const cappedThenOpen = resolveAbilities(BASE_19, [
      increase(2, 20),
      increase(1, 30),
    ]);
    const openThenCapped = resolveAbilities(BASE_19, [
      increase(1, 30),
      increase(2, 20),
    ]);

    // Plan §3.3 pins these two different literals. An uncapped sum produces
    // 22 in both orders, while sorting the contributions erases the distinction.
    expect(cappedThenOpen.strength.total).toBe(21);
    expect(openThenCapped.strength.total).toBe(20);
  });
});
