import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import {
  expectedEventDamage,
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  targetSaveBonus,
  type SavingThrowDamageEvent,
} from '../../../src/simulation/contracts';
import { reviewedSaveSuccessClauses } from '../../../src/simulation/coverage';
import {
  composeRoundDamageFolds,
  foldSavingThrowEvent,
  type DamageEventFold,
} from '../../../src/simulation/probability';

describe('round 20 available-fold identity boundary', () => {
  it('refuses a spread copy of a minted fold with forged damage', () => {
    const fireball = reviewedSaveSuccessClauses.fireball;
    const fire = damageType('Fire');
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-20:fireball-fold-forgery'),
      source: fireball.effect_source,
      ability: fireball.ability,
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: fireball.frequency,
      duration: fireball.duration,
      save_success_clause_id: fireball.id,
      damage_on_failed_save: [{
        source: fireball.effect_source,
        damage_type: fire,
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(8), die: 6 },
        }],
      }],
      on_success: { kind: 'half', evidence: fireball.evidence },
    };
    const legitimate = foldSavingThrowEvent(event, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [{ damage_type: fire, response: 'normal' }],
    });

    expect(legitimate.status).toBe('available');
    if (legitimate.status !== 'available') {
      throw new Error('The reviewed Fireball fold must remain available.');
    }
    expect(legitimate.expected_damage).toBeCloseTo(20.875, 12);
    expect(Object.isFrozen(legitimate)).toBe(true);
    expect(Object.getOwnPropertySymbols(legitimate)).toEqual([]);

    const composed = composeRoundDamageFolds([legitimate]);
    expect(composed.status).toBe('available');
    if (composed.status === 'available') {
      expect(composed.expected_damage).toBeCloseTo(20.875, 12);
    }

    const forged = {
      ...legitimate,
      expected_damage: expectedEventDamage(950),
    } as unknown as DamageEventFold;

    expect(() => composeRoundDamageFolds([forged])).toThrow(
      /must be minted by a registered event-fold path/iu,
    );
  });
});
