import { describe, expect, it } from 'vitest';
import {
  speciesHitPoints,
  speciesWalkingSpeedFeet,
  summariseSpeciesEffects,
  type NamedSpeciesTraitEffect,
} from '../../../src/rules/species-effects';
import { speciesTraitEffectKinds } from '../../../src/domain/enums';
import { parseSrdSpeciesTemplates } from '../../../src/rules/origins-srd';

/**
 * EVERY MECHANICAL KIND IS PROVED TWICE: once that it TAKES EFFECT, and once
 * that a FREE-TEXT trait with the same words in it does NOT.
 *
 * The second half is the one that matters. The whole design rests on prose
 * staying prose — the Orc's Adrenaline Rush says "Temporary Hit Points", the
 * Goliath's Large Form says "your Speed increases by 10 feet", the Dwarf's
 * Stonecunning says "Resistance" nowhere but reads mechanical — and a
 * derivation that started reading the text would quietly turn all of them into
 * numbers. The paired assertions are what make "free text stays free text" a
 * checkable claim rather than a stated intention.
 */

function trait(
  name: string,
  overrides: Partial<NamedSpeciesTraitEffect> = {},
): NamedSpeciesTraitEffect {
  return {
    name,
    effect_kind: null,
    effect_damage_type: null,
    effect_hit_points_flat: null,
    effect_hit_points_per_level: null,
    effect_speed_bonus_feet: null,
    ...overrides,
  };
}

/** The printed traits, so the pairs below use the real rows the seeder writes. */
const srd = parseSrdSpeciesTemplates();

function srdTraits(speciesName: string): NamedSpeciesTraitEffect[] {
  const found = srd.find((entry) => entry.name === speciesName);
  if (found === undefined) {
    throw new Error(`No parsed species named ${speciesName}.`);
  }
  return found.traits.map((entry) => ({
    name: entry.name,
    effect_kind: entry.effect_kind,
    effect_damage_type: entry.effect_damage_type,
    effect_hit_points_flat: entry.effect_hit_points_flat,
    effect_hit_points_per_level: entry.effect_hit_points_per_level,
    effect_speed_bonus_feet: entry.effect_speed_bonus_feet,
  }));
}

describe('damage_resistance', () => {
  it('takes effect: a typed resistance reaches the summary', () => {
    const summary = summariseSpeciesEffects(srdTraits('Dwarf'));
    expect(summary.damageResistances).toEqual(['Poison']);
    expect(summary.unchosenDamageResistances).toBe(0);
  });

  it('takes effect: an untyped one is counted, not dropped', () => {
    // The Dragonborn resists SOMETHING; which type is the Draconic Ancestry
    // choice. Dropping it would show a sheet no resistance at all, which is the
    // wrong answer in the other direction.
    const summary = summariseSpeciesEffects(srdTraits('Dragonborn'));
    expect(summary.damageResistances).toEqual([]);
    expect(summary.unchosenDamageResistances).toBe(1);
  });

  it('does NOT take effect from prose: Halfling and Orc resist nothing', () => {
    // The Orc's Relentless Endurance is about dropping to 1 Hit Point and the
    // Halfling's Brave is about the Frightened condition. Both read defensive;
    // neither is a resistance.
    for (const name of ['Halfling', 'Orc', 'Human', 'Goliath']) {
      const summary = summariseSpeciesEffects(srdTraits(name));
      expect(summary.damageResistances, name).toEqual([]);
      expect(summary.unchosenDamageResistances, name).toBe(0);
    }
  });

  it('KNOWN GAP: the Tiefling’s resistance is recorded nowhere', () => {
    // NOT a passing behaviour — a defect pinned so it cannot be forgotten.
    //
    // Every Tiefling has a Resistance from level 1: Fiendish Legacy grants "the
    // level 1 benefit of the chosen legacy" and all three legacies' level-1
    // benefit is a Resistance (Poison / Necrotic / Fire) plus a cantrip. The
    // Dragonborn's equally unnamed resistance IS modelled, so the summary is
    // asymmetric between two structurally identical traits.
    //
    // The cause is that `effect_kind` is one column and the trait has two
    // effects; swapping it to `damage_resistance` would only move which half is
    // invisible. See `speciesTraitEffectKinds` and the pending question.
    const tiefling = summariseSpeciesEffects(srdTraits('Tiefling'));
    expect(tiefling.damageResistances).toEqual([]);
    expect(tiefling.unchosenDamageResistances).toBe(0);
    // The resistance IS in the trait's text, which is the only place it lives.
    // Read from the parse rather than the summary's view, which drops it.
    const legacy = srd
      .find((entry) => entry.name === 'Tiefling')
      ?.traits.find((entry) => entry.name === 'Fiendish Legacy');
    expect(legacy?.description).toContain('Resistance to Poison damage');
  });

  it('does NOT take effect from a free-text trait that says "Resistance"', () => {
    // The exact adversarial case: the printed words, no kind. Nothing may make
    // this a resistance.
    const summary = summariseSpeciesEffects([
      trait('Dwarven Resilience'),
      trait('Prose'),
    ]);
    expect(summary.damageResistances).toEqual([]);
    expect(summary.unchosenDamageResistances).toBe(0);
  });
});

describe('hp_modifier', () => {
  it('takes effect: Dwarven Toughness totals the character’s level', () => {
    const dwarf = srdTraits('Dwarf');
    // "Your Hit Point maximum increases by 1, and it increases by 1 again
    // whenever you gain a level." The opening clause IS the level-1 grant and
    // the second covers levels 2..N, so the total is the LEVEL. This asserted
    // level + 1 until the review caught it: a trait whose text says +1 was
    // handing a level-1 Dwarf +2.
    expect(speciesHitPoints(dwarf, 1)).toBe(1);
    expect(speciesHitPoints(dwarf, 5)).toBe(5);
    expect(speciesHitPoints(dwarf, 20)).toBe(20);
  });

  it('does NOT take effect: the Orc gains no Hit Point maximum', () => {
    // Adrenaline Rush grants TEMPORARY Hit Points. They are not Hit Point
    // maximum, and a sheet that added them to maximum would be wrong in a way
    // nobody notices until a long rest.
    const orc = srdTraits('Orc');
    expect(
      orc.find((entry) => entry.name === 'Adrenaline Rush')?.effect_kind,
    ).toBeNull();
    for (const level of [1, 5, 20]) {
      expect(speciesHitPoints(orc, level)).toBe(0);
    }
  });

  it('does NOT take effect: every species but the Dwarf contributes zero', () => {
    for (const entry of srd) {
      const expected = entry.name === 'Dwarf' ? 5 : 0;
      expect(speciesHitPoints(srdTraits(entry.name), 5), entry.name).toBe(
        expected,
      );
    }
  });

  it('refuses a level below 1 rather than inventing an answer', () => {
    expect(() => speciesHitPoints(srdTraits('Dwarf'), 0)).toThrow(RangeError);
    expect(() => speciesHitPoints(srdTraits('Dwarf'), 1.5)).toThrow(RangeError);
  });
});

describe('speed', () => {
  it('takes effect: a standing bonus raises the walking Speed', () => {
    // No SRD species trait carries this kind — see `speciesTraitEffectKinds` —
    // so the row here is the one a USER writes on their own species, which is
    // exactly what the member exists for.
    const traits = [
      trait('Fleet of Foot', {
        effect_kind: 'speed',
        effect_speed_bonus_feet: 5,
      }),
    ];
    expect(speciesWalkingSpeedFeet(30, traits)).toBe(35);
    expect(summariseSpeciesEffects(traits).speedBonusFeet).toBe(5);
  });

  it('takes effect: a penalty applies and is clamped at zero', () => {
    const traits = [
      trait('Cursed Gait', {
        effect_kind: 'speed',
        effect_speed_bonus_feet: -100,
      }),
    ];
    expect(speciesWalkingSpeedFeet(30, traits)).toBe(0);
  });

  it('does NOT take effect: Large Form leaves the Goliath at 35', () => {
    // "your Speed increases by 10 feet" — for 10 minutes, from character level
    // 5, once per Long Rest. Not a standing modifier.
    const goliath = srdTraits('Goliath');
    expect(speciesWalkingSpeedFeet(35, goliath)).toBe(35);
  });

  it('does NOT take effect: no printed species trait moves any Speed', () => {
    for (const entry of srd) {
      expect(
        summariseSpeciesEffects(srdTraits(entry.name)).speedBonusFeet,
        entry.name,
      ).toBe(0);
      expect(
        speciesWalkingSpeedFeet(entry.base_speed_feet, srdTraits(entry.name)),
        entry.name,
      ).toBe(entry.base_speed_feet);
    }
  });

  it('answers null for a species whose Speed the user has not decided', () => {
    expect(speciesWalkingSpeedFeet(null, srdTraits('Elf'))).toBeNull();
  });
});

describe('granted_spells', () => {
  it('takes effect: the marker names the traits, and carries no payload', () => {
    // The MARKER is the effect. The spells themselves come from
    // `species_definitions.grant_rules` through `src/grants/`; a payload here
    // would be the parallel path the design forbids.
    expect(
      summariseSpeciesEffects(srdTraits('Tiefling')).grantedSpellTraits,
    ).toEqual(['Fiendish Legacy', 'Otherworldly Presence']);
    expect(
      summariseSpeciesEffects(srdTraits('Elf')).grantedSpellTraits,
    ).toEqual(['Elven Lineage']);
    const summary = summariseSpeciesEffects(srdTraits('Gnome'));
    expect(summary.grantedSpellTraits).toEqual(['Gnomish Lineage']);
    // No number moved.
    expect(summary.hitPointsFlat).toBe(0);
    expect(summary.speedBonusFeet).toBe(0);
    expect(summary.damageResistances).toEqual([]);
  });

  it('does NOT take effect: a free-text trait naming a cantrip marks nothing', () => {
    // The Dragonborn's Breath Weapon and the Elf's Trance both describe magic
    // and grant no spell.
    expect(
      summariseSpeciesEffects(srdTraits('Dragonborn')).grantedSpellTraits,
    ).toEqual([]);
    expect(
      summariseSpeciesEffects(srdTraits('Halfling')).grantedSpellTraits,
    ).toEqual([]);
  });
});

describe('the closed set itself', () => {
  it('has a meaning for every declared kind and for nothing else', () => {
    // Walks the ENUM, so a member added without a branch in the derivation
    // fails here as well as failing to compile.
    for (const kind of speciesTraitEffectKinds) {
      const payload: Partial<NamedSpeciesTraitEffect> =
        kind === 'hp_modifier'
          ? { effect_hit_points_flat: 1 }
          : kind === 'speed'
            ? { effect_speed_bonus_feet: 1 }
            : kind === 'damage_resistance'
              ? { effect_damage_type: 'Fire' }
              : {};
      expect(() =>
        summariseSpeciesEffects([trait('T', { effect_kind: kind, ...payload })]),
      ).not.toThrow();
    }
    expect(speciesTraitEffectKinds).toEqual([
      'damage_resistance',
      'hp_modifier',
      'speed',
      'granted_spells',
    ]);
  });

  it('treats an unrecognised kind as free text rather than guessing', () => {
    // The database refuses such a row; if one arrives anyway — a hand-edited
    // image — the derivation must not invent a meaning for it.
    const summary = summariseSpeciesEffects([
      trait('Impossible', {
        effect_kind: 'ability_score_increase',
        effect_hit_points_flat: 99,
      }),
    ]);
    expect(summary.hitPointsFlat).toBe(0);
    expect(summary.grantedSpellTraits).toEqual([]);
  });

  it('sums several traits of the same kind rather than taking the last', () => {
    const summary = summariseSpeciesEffects([
      trait('One', { effect_kind: 'hp_modifier', effect_hit_points_flat: 1 }),
      trait('Two', {
        effect_kind: 'hp_modifier',
        effect_hit_points_per_level: 2,
      }),
      trait('Three', { effect_kind: 'speed', effect_speed_bonus_feet: 5 }),
      trait('Four', { effect_kind: 'speed', effect_speed_bonus_feet: 5 }),
      trait('Five', {
        effect_kind: 'damage_resistance',
        effect_damage_type: 'Fire',
      }),
      trait('Six', {
        effect_kind: 'damage_resistance',
        effect_damage_type: 'Cold',
      }),
    ]);
    expect(summary).toMatchObject({
      hitPointsFlat: 1,
      hitPointsPerLevel: 2,
      speedBonusFeet: 10,
      damageResistances: ['Fire', 'Cold'],
    });
  });
});
