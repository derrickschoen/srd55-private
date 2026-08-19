import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { CharacterWeaponId, ContentKey } from '../../../src/domain/ids';
import {
  attackRollModifier,
  damageFlatModifier,
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  saveSuccessClauseId,
  sourceStableKey,
  targetArmorClass,
  targetSaveBonus,
  type AttackRollEvent,
  type AutomaticDamageEvent,
  type SavingThrowDamageEvent,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  assertReviewedSpellBodyDigest,
  expandedCriticalHitEvidenceManifest,
  publicProbabilityCoverageManifest,
  registerCharacterWeaponAttackClause,
  registeredAttackRollClauses,
  reviewedSaveSuccessClauses,
  saveSuccessOutcomeEvidenceManifest,
} from '../../../src/simulation/coverage';
import {
  foldAttackEvent,
  foldAutomaticDamageEvent,
  foldSavingThrowEvent,
} from '../../../src/simulation/probability';
import { spellBodyDigestInputsByHeading } from '../../../src/simulation/spell-source-reader';

const spellExtract = readFileSync('docs/srd/source/spell-descriptions.txt', 'utf8');

describe('round 17 save-aware automatic-damage boundary', () => {
  const fireball = reviewedSaveSuccessClauses.fireball;
  const fire = damageType('Fire');
  const failedDamage = [{
    source: fireball.effect_source,
    damage_type: fire,
    components: [{
      kind: 'dice' as const,
      pool: { count: positiveDiceCount(8), die: 6 as const },
    }],
  }] as const;

  it('refuses the reviewer Fireball call on the final automatic fold', () => {
    const event: AutomaticDamageEvent = {
      kind: 'automatic_damage',
      event_id: routineEventId('round-17:automatic-fireball'),
      source: fireball.effect_source,
      damage_clause_id: fireball.id,
      evidence: fireball.evidence,
      frequency: fireball.frequency,
      duration: { kind: 'instantaneous' },
      damage: failedDamage,
    };

    const result = foldAutomaticDamageEvent(event, [
      { damage_type: fire, response: 'normal' },
    ]);
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
  });

  it('keeps the same Fireball available on the save-aware fold', () => {
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-17:save-aware-fireball'),
      source: fireball.effect_source,
      ability: fireball.ability,
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: fireball.frequency,
      duration: fireball.duration,
      save_success_clause_id: fireball.id,
      damage_on_failed_save: failedDamage,
      on_success: { kind: 'half', evidence: fireball.evidence },
    };

    const result = foldSavingThrowEvent(event, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [{ damage_type: fire, response: 'normal' }],
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error('The reviewed Fireball save fold must remain available.');
    }
    // DC 11 vs +0 fails on 1..10: 1/2 * E[8d6] + 1/2 * E[floor(8d6/2)]
    // = 1/2 * 28 + 1/2 * 13.75 = 20.875.
    expect(result.expected_damage).toBeCloseTo(20.875, 12);
  });
});

describe('round 17 weapon rider registration boundary', () => {
  it('refuses the reviewer unregistered catalog rider instead of returning 950', () => {
    const weapon: SourceRef & { readonly kind: 'character_weapon' } = {
      kind: 'character_weapon',
      weapon_id: 999 as CharacterWeaponId,
      stable_key: sourceStableKey('character-weapon:999'),
    };
    const registration = registerCharacterWeaponAttackClause(weapon);
    const riderKey = sourceStableKey('catalog:unregistered-rider');
    const rider: SourceRef = {
      kind: 'catalog_content',
      content_key: String(riderKey) as ContentKey,
      stable_key: riderKey,
    };
    const force = damageType('Force');
    const event: AttackRollEvent = {
      kind: 'attack_roll',
      event_id: routineEventId('round-17:phantom-weapon-rider'),
      source: weapon,
      ...registration,
      attack_bonus: attackRollModifier(100),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      critical: {
        kind: 'natural_20',
        evidence: publicProbabilityCoverageManifest.critical_hit,
      },
      damage: [{
        source: rider,
        damage_type: force,
        components: [{
          kind: 'flat',
          modifier: damageFlatModifier(1000),
          trigger: 'hit',
        }],
      }],
    };

    const result = foldAttackEvent(event, {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: [{ damage_type: force, response: 'normal' }],
    });
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
  });

  it('refuses a registered weapon B rider in weapon A\'s event', () => {
    const weapon: SourceRef & { readonly kind: 'character_weapon' } = {
      kind: 'character_weapon',
      weapon_id: 1000 as CharacterWeaponId,
      stable_key: sourceStableKey('character-weapon:1000'),
    };
    const rider: SourceRef & { readonly kind: 'character_weapon' } = {
      kind: 'character_weapon',
      weapon_id: 1001 as CharacterWeaponId,
      stable_key: sourceStableKey('character-weapon:1001'),
    };
    const registration = registerCharacterWeaponAttackClause(weapon);
    registerCharacterWeaponAttackClause(rider);
    const force = damageType('Force');
    const event: AttackRollEvent = {
      kind: 'attack_roll',
      event_id: routineEventId('round-17:registered-weapon-rider'),
      source: weapon,
      ...registration,
      attack_bonus: attackRollModifier(100),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      critical: {
        kind: 'natural_20',
        evidence: publicProbabilityCoverageManifest.critical_hit,
      },
      damage: [{
        source: rider,
        damage_type: force,
        components: [{
          kind: 'flat',
          modifier: damageFlatModifier(1000),
          trigger: 'hit',
        }],
      }],
    };

    const result = foldAttackEvent(event, {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: [{ damage_type: force, response: 'normal' }],
    });
    // The event source is weapon 1000 while the damage source is weapon 1001;
    // the second registration binds no rider formula, so the gate fails closed.
    expect(result.status).toBe('unavailable');
    expect(result).toMatchObject({
      reason: 'Every attack damage instance must use the attack event source; unreviewed rider sources are unavailable.',
    });
    expect(result).not.toHaveProperty('expected_damage');
  });

  it('accepts multiple damage instances sourced by the attack weapon', () => {
    const weapon: SourceRef & { readonly kind: 'character_weapon' } = {
      kind: 'character_weapon',
      weapon_id: 1003 as CharacterWeaponId,
      stable_key: sourceStableKey('character-weapon:1003'),
    };
    const registration = registerCharacterWeaponAttackClause(weapon);
    const force = damageType('Force');
    const fire = damageType('Fire');
    const event: AttackRollEvent = {
      kind: 'attack_roll',
      event_id: routineEventId('round-18:multi-instance-weapon-damage'),
      source: weapon,
      ...registration,
      attack_bonus: attackRollModifier(100),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      critical: {
        kind: 'natural_20',
        evidence: publicProbabilityCoverageManifest.critical_hit,
      },
      damage: [
        {
          source: weapon,
          damage_type: force,
          components: [{
            kind: 'flat',
            modifier: damageFlatModifier(1000),
            trigger: 'hit',
          }],
        },
        {
          source: weapon,
          damage_type: fire,
          components: [{
            kind: 'flat',
            modifier: damageFlatModifier(10),
            trigger: 'hit',
          }],
        },
      ],
    };

    const result = foldAttackEvent(event, {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: [
        { damage_type: force, response: 'normal' },
        { damage_type: fire, response: 'normal' },
      ],
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error('The registered multi-instance weapon fold must remain available.');
    }
    // Natural 1 misses; the other 19 faces deal both flat components, and the
    // critical face does not double either: 19/20 * (1000 + 10) = 959.5.
    expect(result.expected_damage).toBeCloseTo(959.5, 12);
  });
});

describe('round 17 runtime-immutable registration manifests', () => {
  it('makes the reviewer cast-and-set throw without changing read behavior', () => {
    const fireball = reviewedSaveSuccessClauses.fireball;
    const fakeId = saveSuccessClauseId('review-round-17:unreviewed-save-clause');
    const mutable = saveSuccessOutcomeEvidenceManifest as Map<
      typeof fakeId,
      typeof fireball
    >;

    expect(saveSuccessOutcomeEvidenceManifest.size).toBe(79);
    expect(saveSuccessOutcomeEvidenceManifest.has(fireball.id)).toBe(true);
    const registeredFireball = saveSuccessOutcomeEvidenceManifest.get(fireball.id);
    // Round-18 finding 3 removed the reference-liveness assertion: registered
    // rows are compared by value and must expose only deeply frozen state.
    expect(registeredFireball).toEqual(fireball);
    expect(Object.isFrozen(registeredFireball)).toBe(true);
    expect(Object.isFrozen(registeredFireball?.failed_damage_signature_slots))
      .toBe(true);
    expect(Object.isFrozen(registeredFireball?.failed_damage_signature_slots[0]))
      .toBe(true);
    expect(Object.isFrozen(registeredFireball?.failed_damage_signature_slots[0]?.[0]))
      .toBe(true);
    expect([...saveSuccessOutcomeEvidenceManifest]).toHaveLength(79);
    expect(() => mutable.set(fakeId, fireball)).toThrow();
    expect(saveSuccessOutcomeEvidenceManifest.has(fakeId)).toBe(false);
  });

  it('keeps the expanded-critical manifest readable but not mutable', () => {
    const entry = expandedCriticalHitEvidenceManifest.get(19);
    if (entry === undefined) {
      throw new Error('Missing reviewed 19+ critical-hit entry.');
    }
    const mutable = expandedCriticalHitEvidenceManifest as Map<number, typeof entry>;
    expect([...expandedCriticalHitEvidenceManifest.keys()]).toEqual([19, 18]);
    expect(() => mutable.clear()).toThrow();
    expect(() => mutable.delete(19)).toThrow();
    expect(() => mutable.set(17, entry)).toThrow();
    expect(expandedCriticalHitEvidenceManifest.size).toBe(2);
  });

  it('exposes registered attacks through a live immutable view', () => {
    const weapon: SourceRef & { readonly kind: 'character_weapon' } = {
      kind: 'character_weapon',
      weapon_id: 1002 as CharacterWeaponId,
      stable_key: sourceStableKey('character-weapon:1002'),
    };
    const registration = registerCharacterWeaponAttackClause(weapon);
    const entry = registeredAttackRollClauses.get(
      registration.attack_roll_clause_id,
    );
    if (entry === undefined) {
      throw new Error('Registration did not reach the public read view.');
    }
    const mutable = registeredAttackRollClauses as Map<
      typeof registration.attack_roll_clause_id,
      typeof entry
    >;
    const fakeId = 'review-round-17:direct-attack-mutation' as
      typeof registration.attack_roll_clause_id;

    expect(registeredAttackRollClauses.has(registration.attack_roll_clause_id))
      .toBe(true);
    expect([...registeredAttackRollClauses].some(([id]) =>
      id === registration.attack_roll_clause_id)).toBe(true);
    expect(() => mutable.set(fakeId, entry)).toThrow();
    expect(() => mutable.delete(registration.attack_roll_clause_id)).toThrow();
    expect(() => mutable.clear()).toThrow();
    expect(registeredAttackRollClauses.get(registration.attack_roll_clause_id))
      .toBe(entry);
  });
});

describe('round 17 heading-derived save-clause identities', () => {
  it('has no independently swappable spellSlug construction input', () => {
    const source = readFileSync('src/simulation/coverage.ts', 'utf8');
    expect(source).not.toMatch(/spellSlug/u);
  });

  it('makes the Dream and Dissonant Whispers heading swap fail its digest guards', () => {
    const bodies = spellBodyDigestInputsByHeading(spellExtract);
    const dreamBody = bodies.get('Dream');
    const whispersBody = bodies.get('Dissonant Whispers');
    if (dreamBody === undefined || whispersBody === undefined) {
      throw new Error('Missing Dream or Dissonant Whispers digest input.');
    }
    expect(() => assertReviewedSpellBodyDigest(
      'dream',
      reviewedSaveSuccessClauses.dream.id,
      whispersBody,
    )).toThrow(/spell body digest mismatch/iu);
    expect(() => assertReviewedSpellBodyDigest(
      'dissonant_whispers',
      reviewedSaveSuccessClauses.dissonant_whispers.id,
      dreamBody,
    )).toThrow(/spell body digest mismatch/iu);
  });

  it('preserves the complete pre-round-17 set of 79 clause IDs', () => {
    expect(Object.values(reviewedSaveSuccessClauses).map((clause) => clause.id))
      .toEqual([
        'srd-5.2.1:spell:acid-splash:save:damage',
        'srd-5.2.1:spell:arcane-hand:save:grasping-hand-damage',
        'srd-5.2.1:spell:befuddlement:save:damage',
        'srd-5.2.1:spell:bestow-curse:save:curse-damage',
        'srd-5.2.1:spell:black-tentacles:save:damage',
        'srd-5.2.1:spell:blade-barrier:save:damage',
        'srd-5.2.1:spell:blight:save:damage',
        'srd-5.2.1:spell:burning-hands:save:damage',
        'srd-5.2.1:spell:call-lightning:save:damage',
        'srd-5.2.1:spell:chain-lightning:save:damage',
        'srd-5.2.1:spell:circle-of-death:save:damage',
        'srd-5.2.1:spell:cloudkill:save:damage',
        'srd-5.2.1:spell:cone-of-cold:save:damage',
        'srd-5.2.1:spell:conjure-animals:save:damage',
        'srd-5.2.1:spell:conjure-celestial:save:damage',
        'srd-5.2.1:spell:conjure-elemental:save:initial-damage',
        'srd-5.2.1:spell:conjure-elemental:save:repeat-damage',
        'srd-5.2.1:spell:conjure-woodland-beings:save:damage',
        'srd-5.2.1:spell:contagion:save:damage',
        'srd-5.2.1:spell:contact-other-plane:save:damage',
        'srd-5.2.1:spell:control-water:save:damage',
        'srd-5.2.1:spell:delayed-blast-fireball:save:damage',
        'srd-5.2.1:spell:disintegrate:save:damage',
        'srd-5.2.1:spell:dissonant-whispers:save:damage',
        'srd-5.2.1:spell:dragon-s-breath:save:damage',
        'srd-5.2.1:spell:dream:save:damage',
        'srd-5.2.1:spell:earthquake:save:collapse-damage',
        'srd-5.2.1:spell:enlarge-reduce:save:weapon-damage',
        'srd-5.2.1:spell:ensnaring-strike:save:recurring-damage',
        'srd-5.2.1:spell:faithful-hound:save:damage',
        'srd-5.2.1:spell:finger-of-death:save:damage',
        'srd-5.2.1:spell:fireball:save:damage',
        'srd-5.2.1:spell:fire-storm:save:damage',
        'srd-5.2.1:spell:flame-strike:save:damage',
        'srd-5.2.1:spell:flaming-sphere:save:damage',
        'srd-5.2.1:spell:freezing-sphere:save:damage',
        'srd-5.2.1:spell:geas:save:recurring-damage',
        'srd-5.2.1:spell:glyph-of-warding:save:explosive-runes',
        'srd-5.2.1:spell:guardian-of-faith:save:damage',
        'srd-5.2.1:spell:harm:save:damage',
        'srd-5.2.1:spell:hellish-rebuke:save:damage',
        'srd-5.2.1:spell:ice-knife:save:explosion-damage',
        'srd-5.2.1:spell:ice-storm:save:damage',
        'srd-5.2.1:spell:incendiary-cloud:save:damage',
        'srd-5.2.1:spell:inflict-wounds:save:damage',
        'srd-5.2.1:spell:insect-plague:save:damage',
        'srd-5.2.1:spell:lightning-bolt:save:damage',
        'srd-5.2.1:spell:meteor-swarm:save:damage',
        'srd-5.2.1:spell:mind-spike:save:damage',
        'srd-5.2.1:spell:moonbeam:save:damage',
        'srd-5.2.1:spell:phantasmal-force:save:recurring-damage',
        'srd-5.2.1:spell:phantasmal-killer:save:initial-damage',
        'srd-5.2.1:spell:phantasmal-killer:save:repeat-damage',
        'srd-5.2.1:spell:prismatic-spray:save:damaging-rays',
        'srd-5.2.1:spell:prismatic-wall:save:damaging-layers',
        'srd-5.2.1:spell:ray-of-enfeeblement:save:damage-reduction',
        'srd-5.2.1:spell:sacred-flame:save:damage',
        'srd-5.2.1:spell:searing-smite:save:recurring-damage',
        'srd-5.2.1:spell:shatter:save:damage',
        'srd-5.2.1:spell:spirit-guardians:save:damage',
        'srd-5.2.1:spell:storm-of-vengeance:save:initial-thunder-damage',
        'srd-5.2.1:spell:storm-of-vengeance:save:lightning-damage',
        'srd-5.2.1:spell:summon-dragon:save:breath-weapon',
        'srd-5.2.1:spell:sunbeam:save:damage',
        'srd-5.2.1:spell:sunburst:save:damage',
        'srd-5.2.1:spell:symbol:save:death-damage',
        'srd-5.2.1:spell:thunderwave:save:damage',
        'srd-5.2.1:spell:tsunami:save:initial-damage',
        'srd-5.2.1:spell:tsunami:save:ongoing-damage',
        'srd-5.2.1:spell:vicious-mockery:save:damage',
        'srd-5.2.1:spell:vitriolic-sphere:save:damage',
        'srd-5.2.1:spell:wall-of-fire:save:damage',
        'srd-5.2.1:spell:wall-of-ice:save:initial-damage',
        'srd-5.2.1:spell:wall-of-ice:save:frigid-air-damage',
        'srd-5.2.1:spell:wall-of-thorns:save:piercing-damage',
        'srd-5.2.1:spell:wall-of-thorns:save:slashing-damage',
        'srd-5.2.1:spell:weird:save:initial-damage',
        'srd-5.2.1:spell:weird:save:repeat-damage',
        'srd-5.2.1:spell:wind-wall:save:damage',
      ]);
  });
});
