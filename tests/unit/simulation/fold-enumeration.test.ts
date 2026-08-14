import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { CharacterWeaponId } from '../../../src/domain/ids';
import {
  attackRollModifier,
  damageFlatModifier,
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  sourceStableKey,
  targetArmorClass,
  targetSaveBonus,
  type AttackRollEvent,
  type DamageResponse,
  type RollState,
  type SavingThrowDamageEvent,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  publicProbabilityCoverageManifest,
  reviewedSaveEffectStableKeys,
  reviewedSaveSuccessClauses,
} from '../../../src/simulation/coverage';
import {
  foldAttackEvent,
  foldSavingThrowEvent,
} from '../../../src/simulation/probability';

const source: SourceRef = {
  kind: 'character_weapon',
  weapon_id: 9 as CharacterWeaponId,
  stable_key: sourceStableKey('weapon:9'),
};
const slashing = damageType('Slashing');

function respond(total: number, response: DamageResponse): number {
  switch (response) {
    case 'normal': return total;
    case 'resistant': return Math.floor(total / 2);
    case 'vulnerable': return total * 2;
    case 'resistant_and_vulnerable': return Math.floor(total / 2) * 2;
    case 'immune': return 0;
  }
}

// full enumeration of n dice of size d -> map total->probability
function dice(count: number, die: number): Map<number, number> {
  let m = new Map<number, number>([[0, 1]]);
  for (let i = 0; i < count; i += 1) {
    const n = new Map<number, number>();
    for (const [t, p] of m) {
      for (let f = 1; f <= die; f += 1) {
        n.set(t + f, (n.get(t + f) ?? 0) + p / die);
      }
    }
    m = n;
  }
  return m;
}

function d20Faces(state: RollState): number[] {
  if (state === 'normal') {
    return Array.from({ length: 20 }, (_, i) => i + 1);
  }
  const out: number[] = [];
  for (let a = 1; a <= 20; a += 1) {
    for (let b = 1; b <= 20; b += 1) {
      out.push(state === 'advantage' ? Math.max(a, b) : Math.min(a, b));
    }
  }
  return out;
}

describe('brute-force attack fold', () => {
  it('matches an independent per-face enumeration', () => {
    const hitDice = { count: 2, die: 8 as const };
    const bonusDice = { count: 1, die: 6 as const }; // ordinary on-hit rider
    const flat = -3;

    for (const state of ['normal', 'advantage', 'disadvantage'] as const) {
      for (const ac of [5, 14, 19]) {
        for (const response of
          ['normal', 'resistant', 'vulnerable', 'immune'] as const) {
          const event: AttackRollEvent = {
            kind: 'attack_roll',
            event_id: routineEventId('attack:probe'),
            source,
            attack_bonus: attackRollModifier(4),
            frequency: { kind: 'each_declared_event' },
            duration: { kind: 'instantaneous' },
            critical: {
              kind: 'natural_20',
              evidence: publicProbabilityCoverageManifest.critical_hit,
            },
            damage: [{
              source,
              damage_type: slashing,
              components: [
                {
                  kind: 'dice',
                  pool: { count: positiveDiceCount(hitDice.count), die: hitDice.die },
                  trigger: 'hit',
                },
                {
                  kind: 'dice',
                  pool: { count: positiveDiceCount(bonusDice.count), die: bonusDice.die },
                  trigger: 'hit',
                },
                {
                  kind: 'flat',
                  modifier: damageFlatModifier(flat),
                  trigger: 'hit',
                },
              ],
            }],
          };

          const faces = d20Faces(state);
          let expected = 0;
          for (const face of faces) {
            let crit = false;
            let hit = false;
            if (face === 1) { /* auto miss */ }
            else if (face === 20) { hit = true; crit = true; }
            else if (face + 4 >= ac) { hit = true; }
            if (!hit) continue;
            const pool = dice(crit ? hitDice.count * 2 : hitDice.count, hitDice.die);
            const bonusPool = dice(
              crit ? bonusDice.count * 2 : bonusDice.count,
              bonusDice.die,
            );
            let branch = 0;
            for (const [t1, p1] of pool) {
              for (const [t2, p2] of bonusPool) {
                branch += respond(Math.max(0, t1 + t2 + flat), response) * p1 * p2;
              }
            }
            expected += branch / faces.length;
          }

          const actual = foldAttackEvent(event, {
            armor_class: targetArmorClass(ac),
            roll_state: state,
            damage_responses: [{ damage_type: slashing, response }],
          });
          expect(actual.status).toBe('available');
          if (actual.status !== 'available') {
            throw new Error(actual.reason);
          }
          expect(
            actual.expected_damage,
            `${state} ac=${String(ac)} ${response}`,
          ).toBeCloseTo(expected, 10);
        }
      }
    }
  });
});

describe('brute-force save fold', () => {
  it('matches an independent per-face enumeration for half damage', () => {
    for (const state of ['normal', 'advantage', 'disadvantage'] as const) {
      for (const dc of [10, 15]) {
        for (const response of
          ['normal', 'resistant', 'vulnerable'] as const) {
          const event: SavingThrowDamageEvent = {
            kind: 'saving_throw_damage',
            event_id: routineEventId('save:probe'),
            source: {
              ...source,
              stable_key: reviewedSaveEffectStableKeys.fireball,
            },
            ability: 'dexterity',
            save_dc: saveDifficultyClass(dc),
            roll_state: state,
            frequency: { kind: 'each_declared_event' },
            duration: { kind: 'instantaneous' },
            damage_on_failed_save: [{
              source,
              damage_type: slashing,
              components: [{
                kind: 'dice',
                pool: { count: positiveDiceCount(3), die: 6 },
              }],
            }],
            on_success: {
              kind: 'half',
              evidence: reviewedSaveSuccessClauses.fireball.evidence,
            },
          };
          const faces = d20Faces(state);
          const pool = dice(3, 6);
          let expected = 0;
          for (const face of faces) {
            const success = face + 2 >= dc;
            let branch = 0;
            for (const [t, p] of pool) {
              const base = success ? Math.floor(t / 2) : t;
              branch += respond(base, response) * p;
            }
            expected += branch / faces.length;
          }
          const actual = foldSavingThrowEvent(event, {
            save_bonus: targetSaveBonus(2),
            damage_responses: [{ damage_type: slashing, response }],
          });
          expect(actual.status).toBe('available');
          if (actual.status !== 'available') {
            throw new Error(actual.reason);
          }
          expect(
            actual.expected_damage,
            `${state} dc=${String(dc)} ${response}`,
          ).toBeCloseTo(expected, 10);
          const summed = actual.contributions.reduce(
            (s, c) => s + c.expected_damage,
            0,
          );
          expect(summed, `contributions ${state} ${String(dc)} ${response}`)
            .toBeCloseTo(actual.expected_damage, 10);
        }
      }
    }
  });
});
