import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { CharacterWeaponId } from '../../../src/domain/ids';
import {
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  sourceStableKey,
  targetSaveBonus,
  type SavingThrowDamageEvent,
} from '../../../src/simulation/contracts';
import {
  registerCharacterWeaponAttackClause,
  registeredAttackRollClauses,
  reviewedSaveSuccessClauses,
  saveSuccessOutcomeEvidenceManifest,
} from '../../../src/simulation/coverage';
import { foldSavingThrowEvent } from '../../../src/simulation/probability';
import { runtimeReadonlyMap } from '../../../src/simulation/runtime-readonly-map';

describe('round 18 captured Map intrinsics', () => {
  it('keeps get correct without exposing its backing through a poisoned prototype', () => {
    const view = runtimeReadonlyMap([['reviewed', 1] as const]);
    const originalGet = Map.prototype.get;
    let stolen: Map<unknown, unknown> | undefined;
    let result: number | undefined;
    Map.prototype.get = function <K, V>(this: Map<K, V>, key: K): V | undefined {
      stolen = this as unknown as Map<unknown, unknown>;
      return Reflect.apply(originalGet, this, [key]) as V | undefined;
    };
    try {
      result = view.get('reviewed');
    } finally {
      Map.prototype.get = originalGet;
    }
    if (stolen !== undefined) {
      stolen.set('forged', 950);
    }

    // The single registered fixture is reviewed -> 1; poisoning must neither
    // change that lookup nor receive a backing that could gain forged -> 950.
    expect(stolen).toBeUndefined();
    expect(result).toBe(1);
    // Deliberately exercise the runtime path with a key outside this Map's
    // literal-key contract; production callers cannot supply this value.
    expect(view.has('forged' as unknown as 'reviewed')).toBe(false);
  });

  it('keeps iteration correct without exposing its backing through poisoned entries', () => {
    const view = runtimeReadonlyMap([
      ['first', 1] as const,
      ['second', 2] as const,
    ]);
    const originalEntries = Map.prototype.entries;
    let stolen: Map<unknown, unknown> | undefined;
    let rows: [string, number][] = [];
    Map.prototype.entries = function <K, V>(
      this: Map<K, V>,
    ): MapIterator<[K, V]> {
      stolen = this as unknown as Map<unknown, unknown>;
      return Reflect.apply(originalEntries, this, []) as MapIterator<[K, V]>;
    };
    try {
      rows = [...view.entries()];
    } finally {
      Map.prototype.entries = originalEntries;
    }

    // The two hand-authored entries must survive poisoning in insertion order,
    // while the ambient replacement must never receive the private backing.
    expect(stolen).toBeUndefined();
    expect(rows).toEqual([['first', 1], ['second', 2]]);
  });
});

describe('round 18 deeply immutable registered state', () => {
  it('rejects nested Fireball mutation and preserves the canonical fold', () => {
    const fireball = reviewedSaveSuccessClauses.fireball;
    const clause = saveSuccessOutcomeEvidenceManifest.get(fireball.id);
    if (clause === undefined) {
      throw new Error('The reviewed Fireball clause is missing.');
    }
    const signature = clause.failed_damage_signature_slots[0]?.[0];
    if (signature === undefined) {
      throw new Error('The reviewed Fireball failed-damage signature is missing.');
    }
    const originalSignature = { ...signature };
    try {
      expect(() => Object.assign(signature, {
        dice_count: null,
        die_size: null,
        flat_modifier: 1000,
      })).toThrow(TypeError);
    } finally {
      if (!Object.isFrozen(signature)) {
        Object.assign(signature, originalSignature);
      }
    }

    const fire = damageType('Fire');
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-18:canonical-fireball'),
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
    const result = foldSavingThrowEvent(event, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [{ damage_type: fire, response: 'normal' }],
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error('The canonical Fireball fold must remain available.');
    }
    // DC 11 vs +0 fails on 1..10: 1/2 * E[8d6] +
    // 1/2 * E[floor(8d6/2)] = 1/2 * 28 + 1/2 * 13.75 = 20.875.
    expect(result.expected_damage).toBeCloseTo(20.875, 12);
  });

  it('stores a deeply frozen copy instead of the caller weapon object', () => {
    const originalStableKey = sourceStableKey('character-weapon:round-18');
    const source = {
      kind: 'character_weapon' as const,
      weapon_id: 1800 as CharacterWeaponId,
      stable_key: originalStableKey,
    };
    const registration = registerCharacterWeaponAttackClause(source);
    source.stable_key = sourceStableKey('character-weapon:mutated-after-registration');

    const registered = registeredAttackRollClauses.get(
      registration.attack_roll_clause_id,
    );
    // Registration received weapon 1800 with originalStableKey; mutating only
    // the caller afterward cannot alter that copied registered value.
    expect(registered?.source).toEqual({
      kind: 'character_weapon',
      weapon_id: 1800,
      stable_key: originalStableKey,
    });
    expect(registered?.source).not.toBe(source);
    expect(Object.isFrozen(registered)).toBe(true);
    expect(Object.isFrozen(registered?.source)).toBe(true);
  });

  it('preserves get, has, iteration, and size for frozen manifest values', () => {
    const fireball = reviewedSaveSuccessClauses.fireball;
    const entry = saveSuccessOutcomeEvidenceManifest.get(fireball.id);

    // The reviewed manifest contains exactly 79 clauses, one keyed by each
    // reviewed ID; freezing changes no lookup or enumeration cardinality.
    expect(saveSuccessOutcomeEvidenceManifest.size).toBe(79);
    expect(saveSuccessOutcomeEvidenceManifest.has(fireball.id)).toBe(true);
    expect(entry).toEqual(fireball);
    expect([...saveSuccessOutcomeEvidenceManifest]).toHaveLength(79);
  });
});
