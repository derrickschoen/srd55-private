import { describe, expect, it } from 'vitest';
import speciesExtract from '../../../docs/srd/source/species-descriptions.txt?raw';
import { sha256 } from '../../../src/crypto/sha256';
import {
  CHOICE_DETERMINED_RESISTANCE_TRAITS,
  effectHitPoints,
  resolveChoiceDeterminedResistances,
  summariseEffects,
  walkingSpeedFeet,
  type ChoiceResolvableEffect,
  type EffectRow,
} from '../../../src/rules/species-effects';
import { effectKinds } from '../../../src/domain/enums';
import speciesSource from '../../../docs/srd/source/species-descriptions.txt?raw';
import { parseSrdSpeciesTemplates } from '../../../src/rules/origins-srd-reader';

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
 *
 * WHAT CHANGED WITH THE INVERSION. These tests used to build TRAIT rows and ask
 * a summary to find the effects hidden in their columns. They now build EFFECT
 * rows, because that is what the model holds — and the difference is visible in
 * the fixture helper below, which reads a trait's `effects` LIST rather than
 * five fields off the trait itself. A trait that grants nothing produces no row
 * at all, where it used to produce a row with five nulls in it.
 */

function effect(
  label: string,
  overrides: Partial<EffectRow> = {},
): EffectRow {
  return {
    label,
    effect_kind: 'damage_resistance',
    damage_type: null,
    hit_points_flat: null,
    hit_points_per_level: null,
    speed_bonus_feet: null,
    ...overrides,
  };
}

/** The printed traits, so the pairs below use the real rows the seeder writes. */
const srd = parseSrdSpeciesTemplates(speciesSource);

/**
 * Every effect one printed species grants, flattened and labelled exactly as
 * `effectsFromTemplate` labels them when a character picks that species: with
 * the granting trait's own name.
 */
function srdEffects(speciesName: string): EffectRow[] {
  const found = srd.find((entry) => entry.name === speciesName);
  if (found === undefined) {
    throw new Error(`No parsed species named ${speciesName}.`);
  }
  return found.traits.flatMap((trait) =>
    trait.effects.map((entry) => ({
      label: trait.name,
      effect_kind: entry.effect_kind,
      damage_type: entry.damage_type,
      hit_points_flat: entry.hit_points_flat,
      hit_points_per_level: entry.hit_points_per_level,
      speed_bonus_feet: entry.speed_bonus_feet,
    })),
  );
}

describe('damage_resistance', () => {
  it('takes effect: a typed resistance reaches the summary', () => {
    const summary = summariseEffects(srdEffects('Dwarf'));
    expect(summary.damageResistances).toEqual(['Poison']);
    expect(summary.unchosenDamageResistances).toEqual([]);
  });

  it('takes effect: an untyped one is NAMED, not dropped and not merely counted', () => {
    // The Dragonborn resists SOMETHING; which type is the Draconic Ancestry
    // choice. Dropping it would show a sheet no resistance at all, which is the
    // wrong answer in the other direction.
    //
    // The label is what the inversion bought. The old model could only say
    // "1 unchosen resistance", because the effect lived on a trait row and had
    // no name of its own; the sheet can now say WHICH grant is waiting.
    const summary = summariseEffects(srdEffects('Dragonborn'));
    expect(summary.damageResistances).toEqual([]);
    expect(summary.unchosenDamageResistances).toEqual(['Damage Resistance']);
  });

  it('does NOT take effect from prose: Halfling and Orc resist nothing', () => {
    // The Orc's Relentless Endurance is about dropping to 1 Hit Point and the
    // Halfling's Brave is about the Frightened condition. Both read defensive;
    // neither is a resistance.
    for (const name of ['Halfling', 'Orc', 'Human', 'Goliath']) {
      const summary = summariseEffects(srdEffects(name));
      expect(summary.damageResistances, name).toEqual([]);
      expect(summary.unchosenDamageResistances, name).toEqual([]);
    }
  });

  it('the Tiefling’s resistance IS recorded, alongside the cantrip', () => {
    // THIS TEST WAS THE PINNED DEFECT. It read `KNOWN GAP: the Tiefling's
    // resistance is recorded nowhere` and asserted the empty summary, because
    // `effect_kind` was one column and Fiendish Legacy grants two things: its
    // paragraph (`species-descriptions.txt:202-206`) reads "Choose a legacy
    // from the Fiendish Legacies table. You gain the level 1 benefit of the
    // chosen legacy", and every legacy's level-1 benefit (`:233-238`) is a
    // Resistance PLUS a cantrip. The column held the spell marker, so every
    // Tiefling's resistance was invisible while the Dragonborn's identically
    // unnamed one was recorded.
    //
    // Both halves are now accounted for, and they are accounted for in
    // DIFFERENT PLACES on purpose — which is the actual fix, not a wider
    // column.
    const tiefling = summariseEffects(srdEffects('Tiefling'));

    // HALF ONE: THE RESISTANCE, recorded, named, and waiting on the player.
    expect(tiefling.unchosenDamageResistances).toEqual(['Fiendish Legacy']);
    expect(tiefling.damageResistances).toEqual([]);

    // ...and it is now STRUCTURALLY IDENTICAL to the Dragonborn's, which is the
    // asymmetry the old test complained about. Two species whose paragraphs
    // both grant a resistance without naming its type now read the same way.
    const dragonborn = summariseEffects(srdEffects('Dragonborn'));
    expect(tiefling.unchosenDamageResistances).toHaveLength(
      dragonborn.unchosenDamageResistances.length,
    );

    // HALF TWO: THE CANTRIP, which is deliberately NOT an effect and never was.
    // The vocabulary cannot express a spell grant at all — `granted_spells` was
    // a marker with no payload and no production consumer, and the spells it
    // marked come from `species_definitions.grant_rules` through `src/grants/`,
    // surfaced with their provenance by `SpellAccessBuilder`. Building a second
    // record of them here is the parallel storage the design forbids.
    expect(effectKinds).not.toContain('granted_spells');
    expect([...effectKinds]).toEqual([
      'damage_resistance',
      'hp_modifier',
      'speed',
      'ability_increase',
    ]);

    // And the cantrip is still in the trait's own text, which is where the
    // source puts it and where the reader finds it.
    const legacy = srd
      .find((entry) => entry.name === 'Tiefling')
      ?.traits.find((entry) => entry.name === 'Fiendish Legacy');
    expect(legacy?.description).toContain('Resistance to Poison damage');
    // The Poison legacy's own row, cantrip and all, verbatim from the table
    // the paragraph names — so the grant the model does not record is still in
    // front of the reader.
    expect(legacy?.description).toContain('Poison Spray');
    expect(legacy?.description).toContain('cantrip');
    // ONE effect from a trait the source gives two grants: the resistance is
    // modelled, the spell half is the grant system's and is not duplicated.
    expect(legacy?.effects).toHaveLength(1);
    expect(legacy?.effects[0]).toMatchObject({
      effect_kind: 'damage_resistance',
      damage_type: null,
    });
  });

  it('a trait CAN now grant two effects, which is what the model could not do', () => {
    // Not an SRD case — no printed trait grants two of the three surviving
    // kinds — so this is the shape proof rather than a content one. Under the
    // old model these two rows were unrepresentable: one `effect_kind` column
    // per trait meant one of them had to be silently dropped, which is exactly
    // how the Tiefling's resistance was lost.
    const summary = summariseEffects([
      effect('Infernal Legacy', { damage_type: 'Fire' }),
      effect('Infernal Legacy', {
        effect_kind: 'hp_modifier',
        hit_points_per_level: 1,
      }),
    ]);
    expect(summary.damageResistances).toEqual(['Fire']);
    expect(summary.hitPointsPerLevel).toBe(1);
  });

  it('does NOT take effect from a free-text trait that says "Resistance"', () => {
    // The exact adversarial case: the printed words, no effect row. A trait
    // whose prose says "Resistance" grants nothing, because granting is a row
    // and prose is not.
    const dwarf = srd.find((entry) => entry.name === 'Dwarf');
    const stonecunning = dwarf?.traits.find(
      (entry) => entry.name === 'Stonecunning',
    );
    expect(stonecunning?.effects).toEqual([]);
    expect(summariseEffects([])).toMatchObject({
      damageResistances: [],
      unchosenDamageResistances: [],
    });
  });
});

describe('hp_modifier', () => {
  it('takes effect: Dwarven Toughness totals the character’s level', () => {
    const dwarf = srdEffects('Dwarf');
    // "Your Hit Point maximum increases by 1, and it increases by 1 again
    // whenever you gain a level." The opening clause IS the level-1 grant and
    // the second covers levels 2..N, so the total is the LEVEL. This asserted
    // level + 1 until the review caught it: a trait whose text says +1 was
    // handing a level-1 Dwarf +2.
    expect(effectHitPoints(dwarf, 1)).toBe(1);
    expect(effectHitPoints(dwarf, 5)).toBe(5);
    expect(effectHitPoints(dwarf, 20)).toBe(20);
  });

  it('does NOT take effect: the Orc gains no Hit Point maximum', () => {
    // Adrenaline Rush grants TEMPORARY Hit Points. They are not Hit Point
    // maximum, and a sheet that added them to maximum would be wrong in a way
    // nobody notices until a long rest.
    const orc = srd.find((entry) => entry.name === 'Orc');
    expect(
      orc?.traits.find((entry) => entry.name === 'Adrenaline Rush')?.effects,
    ).toEqual([]);
    for (const level of [1, 5, 20]) {
      expect(effectHitPoints(srdEffects('Orc'), level)).toBe(0);
    }
  });

  it('does NOT take effect: every species but the Dwarf contributes zero', () => {
    for (const entry of srd) {
      const expected = entry.name === 'Dwarf' ? 5 : 0;
      expect(effectHitPoints(srdEffects(entry.name), 5), entry.name).toBe(
        expected,
      );
    }
  });

  it('refuses a level below 1 rather than inventing an answer', () => {
    expect(() => effectHitPoints(srdEffects('Dwarf'), 0)).toThrow(RangeError);
    expect(() => effectHitPoints(srdEffects('Dwarf'), 1.5)).toThrow(RangeError);
  });
});

describe('speed', () => {
  it('takes effect: a standing bonus raises the walking Speed', () => {
    // No SRD species trait carries this kind — see `effectKinds` — so the row
    // here is the one a USER writes on their own species, which is exactly what
    // the member exists for.
    const effects = [
      effect('Fleet of Foot', {
        effect_kind: 'speed',
        speed_bonus_feet: 5,
      }),
    ];
    expect(walkingSpeedFeet(30, effects)).toBe(35);
    expect(summariseEffects(effects).speedBonusFeet).toBe(5);
  });

  it('applies the unmet armour Strength requirement after standing effects', () => {
    const effects = [
      effect('Fleet of Foot', {
        effect_kind: 'speed',
        speed_bonus_feet: 5,
      }),
    ];
    // Base 30 + 5 standing bonus − 10 armour penalty = 25.
    expect(walkingSpeedFeet(30, effects, 10)).toBe(25);
    // The closed zero arm is a real negative control, not an omitted argument.
    expect(walkingSpeedFeet(30, effects, 0)).toBe(35);
  });

  it('takes effect: a penalty applies and is clamped at zero', () => {
    const effects = [
      effect('Cursed Gait', {
        effect_kind: 'speed',
        speed_bonus_feet: -100,
      }),
    ];
    expect(walkingSpeedFeet(30, effects)).toBe(0);
  });

  it('does NOT take effect: Large Form leaves the Goliath at 35', () => {
    // "your Speed increases by 10 feet" — for 10 minutes, from character level
    // 5, once per Long Rest. Not a standing modifier.
    expect(walkingSpeedFeet(35, srdEffects('Goliath'))).toBe(35);
  });

  it('does NOT take effect: no printed species trait moves any Speed', () => {
    for (const entry of srd) {
      expect(
        summariseEffects(srdEffects(entry.name)).speedBonusFeet,
        entry.name,
      ).toBe(0);
      expect(
        walkingSpeedFeet(entry.base_speed_feet, srdEffects(entry.name)),
        entry.name,
      ).toBe(entry.base_speed_feet);
    }
  });

  it('answers null for a species whose Speed the user has not decided', () => {
    expect(walkingSpeedFeet(null, srdEffects('Elf'))).toBeNull();
  });
});

describe('granted spells are the grant system’s, not this model’s', () => {
  it('no printed trait declares a spell effect, because there is no such kind', () => {
    // The four traits that used to carry the `granted_spells` marker — Elven
    // Lineage, Gnomish Lineage, Fiendish Legacy, Otherworldly Presence — are
    // the reason this describes block exists. Three of them now declare NO
    // effect at all, and the fourth declares its resistance.
    //
    // Nothing was lost by removing the marker: its only output was a list of
    // trait names that no production code read, and the spells themselves have
    // always come from `species_definitions.grant_rules` through `src/grants/`.
    // `src/access/spell-access-builder.ts` reports them per spell with
    // `source_instance_id`, `source_name` and `casting_mode: 'at_will'` for a
    // cantrip — which already answers "what cantrips, and from where" with more
    // than the marker ever could.
    for (const name of ['Elven Lineage', 'Gnomish Lineage', 'Otherworldly Presence']) {
      const trait = srd
        .flatMap((entry) => entry.traits)
        .find((entry) => entry.name === name);
      expect(trait, name).toBeDefined();
      expect(trait?.effects, name).toEqual([]);
    }
  });

  it('does NOT take effect: a free-text trait naming a cantrip declares nothing', () => {
    // The Dragonborn's Breath Weapon and the Elf's Trance both describe magic
    // and grant no spell.
    for (const name of ['Breath Weapon', 'Trance']) {
      const trait = srd
        .flatMap((entry) => entry.traits)
        .find((entry) => entry.name === name);
      expect(trait?.effects, name).toEqual([]);
    }
  });
});

describe('the closed set itself', () => {
  it('has a meaning for every declared kind and for nothing else', () => {
    // Walks the ENUM, so a member added without a branch in the derivation
    // fails here as well as failing to compile.
    for (const kind of effectKinds) {
      const payload: Partial<EffectRow> =
        kind === 'hp_modifier'
          ? { hit_points_flat: 1 }
          : kind === 'speed'
            ? { speed_bonus_feet: 1 }
            : kind === 'damage_resistance'
              ? { damage_type: 'Fire' }
              : {};
      expect(() =>
        summariseEffects([effect('E', { effect_kind: kind, ...payload })]),
      ).not.toThrow();
    }
    expect([...effectKinds]).toEqual([
      'damage_resistance',
      'hp_modifier',
      'speed',
      'ability_increase',
    ]);
  });

  it('treats an unrecognised kind as nothing rather than guessing', () => {
    // The database refuses such a row; if one arrives anyway — a hand-edited
    // image — the derivation must not invent a meaning for it. `granted_spells`
    // is the value this actually sees in the wild: retired from the vocabulary,
    // still legal in a share link written last week, and dropped rather than
    // rejected on the way in.
    for (const kind of ['ability_score_increase', 'granted_spells']) {
      const summary = summariseEffects([
        effect('Impossible', { effect_kind: kind, hit_points_flat: 99 }),
      ]);
      expect(summary.hitPointsFlat, kind).toBe(0);
      expect(summary.damageResistances, kind).toEqual([]);
      expect(summary.unchosenDamageResistances, kind).toEqual([]);
    }
  });

  it('sums several effects of the same kind rather than taking the last', () => {
    const summary = summariseEffects([
      effect('One', { effect_kind: 'hp_modifier', hit_points_flat: 1 }),
      effect('Two', { effect_kind: 'hp_modifier', hit_points_per_level: 2 }),
      effect('Three', { effect_kind: 'speed', speed_bonus_feet: 5 }),
      effect('Four', { effect_kind: 'speed', speed_bonus_feet: 5 }),
      effect('Five', { damage_type: 'Fire' }),
      effect('Six', { damage_type: 'Cold' }),
      effect('Seven'),
      effect('Eight'),
    ]);
    expect(summary).toMatchObject({
      hitPointsFlat: 1,
      hitPointsPerLevel: 2,
      speedBonusFeet: 10,
      damageResistances: ['Fire', 'Cold'],
      // Two unchosen resistances from two different grants, each named. The old
      // model returned the number 2 here and could say no more than that.
      unchosenDamageResistances: ['Seven', 'Eight'],
    });
  });
});

describe('a made species choice names the resistance its source left unnamed (PC-EXPORT-TRUTH)', () => {
  // The Dragonborn's Damage Resistance: "the damage type determined by your
  // Draconic Ancestry trait" (species-descriptions.txt:91-93). The species
  // copy holds ONE untyped effect; the made choice inserts ONE typed one.
  const untyped = (source: number): ChoiceResolvableEffect & { readonly id: string } => ({
    id: `untyped-${String(source)}`,
    effect_kind: 'damage_resistance',
    damage_type: null,
    source_instance_id: source,
    template_ref: 'species_template_trait_effects:3',
  });
  const typed = (source: number): ChoiceResolvableEffect & { readonly id: string } => ({
    id: `typed-${String(source)}`,
    effect_kind: 'damage_resistance',
    damage_type: 'Fire',
    source_instance_id: source,
    template_ref: 'configured_choice:dragonborn-draconic-ancestry:Red:0',
  });
  const ids = (effects: readonly { readonly id: string }[]) => effects.map((effect) => effect.id);
  // The stated relation (CHOICE_DETERMINED_RESISTANCE_TRAITS): Draconic
  // Ancestry names the Damage Resistance trait's copied effect, ref :3.
  const dragonbornChoice = (made: boolean) => ({
    source_instance_id: 4,
    made,
    rule_key: 'dragonborn-draconic-ancestry',
    determined_effect_refs: ['species_template_trait_effects:3'],
  });

  it('resolves a made choice: the untyped effect of the same source is the one the typed effect names', () => {
    expect(ids(resolveChoiceDeterminedResistances(
      [untyped(4), typed(4)],
      dragonbornChoice(true),
    ))).toEqual(['typed-4']);
  });

  it('keeps the unnamed resistance while the choice is unmade, or when no choice owns it', () => {
    expect(ids(resolveChoiceDeterminedResistances(
      [untyped(4), typed(4)],
      dragonbornChoice(false),
    ))).toEqual(['untyped-4', 'typed-4']);
    expect(ids(resolveChoiceDeterminedResistances([untyped(4)], null))).toEqual(['untyped-4']);
  });

  it('resolves only the exact one-to-one case, and only on the choice\'s own source', () => {
    // Two untyped grants and one choice: which one it settles is not stated.
    expect(ids(resolveChoiceDeterminedResistances(
      [untyped(4), { ...untyped(4), id: 'second-untyped-4' }, typed(4)],
      dragonbornChoice(true),
    ))).toEqual(['untyped-4', 'second-untyped-4', 'typed-4']);
    // A made choice that inserted no typed effect settles nothing.
    expect(ids(resolveChoiceDeterminedResistances(
      [untyped(4)],
      dragonbornChoice(true),
    ))).toEqual(['untyped-4']);
    // Another source's unnamed resistance is not this choice's to name.
    expect(ids(resolveChoiceDeterminedResistances(
      [untyped(9), typed(4)],
      dragonbornChoice(true),
    ))).toEqual(['untyped-9', 'typed-4']);
  });
});

describe('a made choice names only the grant its stated relation names (PC-EXPORT-TRUTH fix 1)', () => {
  // codex r1 P2: "any one unnamed resistance and one configured-choice
  // resistance from the same source" was read as ONE grant. The relation is
  // now stated: the bundled species trait whose Resistance the choice
  // determines, by its copied template effect ref, and the choice's own rule.
  const unnamed = (id: string, templateRef: string): ChoiceResolvableEffect & { readonly id: string } => ({
    id,
    effect_kind: 'damage_resistance',
    damage_type: null,
    source_instance_id: 4,
    template_ref: templateRef,
  });
  const chosen = (ruleKey: string): ChoiceResolvableEffect & { readonly id: string } => ({
    id: `chosen-${ruleKey}`,
    effect_kind: 'damage_resistance',
    damage_type: 'Fire',
    source_instance_id: 4,
    template_ref: `configured_choice:${ruleKey}:Red:0`,
  });
  const ids = (effects: readonly { readonly id: string }[]) => effects.map((effect) => effect.id);

  it('keeps an authored species\' independent unnamed resistance beside a choice granting Fire', () => {
    // No bundled relation is stated for an authored species, so the choice's
    // Fire is ADDED and the independent grant stays unnamed: the sheet keeps
    // refusing rather than silently losing it.
    expect(ids(resolveChoiceDeterminedResistances(
      [unnamed('independent', 'species_template_trait_effects:77'), chosen('authored-choice')],
      {
        source_instance_id: 4,
        made: true,
        rule_key: 'authored-choice',
        determined_effect_refs: [],
      },
    ))).toEqual(['independent', 'chosen-authored-choice']);
  });

  it('names only the related trait\'s effect, and only from the related choice', () => {
    // The Dragonborn's Damage Resistance trait effect is ref :3; an unnamed
    // resistance on any OTHER trait is not the one Draconic Ancestry names.
    expect(ids(resolveChoiceDeterminedResistances(
      [unnamed('other-trait', 'species_template_trait_effects:77'), chosen('dragonborn-draconic-ancestry')],
      {
        source_instance_id: 4,
        made: true,
        rule_key: 'dragonborn-draconic-ancestry',
        determined_effect_refs: ['species_template_trait_effects:3'],
      },
    ))).toEqual(['other-trait', 'chosen-dragonborn-draconic-ancestry']);
    // A typed resistance from another rule is not this choice's answer.
    expect(ids(resolveChoiceDeterminedResistances(
      [unnamed('related', 'species_template_trait_effects:3'), chosen('some-other-rule')],
      {
        source_instance_id: 4,
        made: true,
        rule_key: 'dragonborn-draconic-ancestry',
        determined_effect_refs: ['species_template_trait_effects:3'],
      },
    ))).toEqual(['related', 'chosen-some-other-rule']);
    // The related pair resolves.
    expect(ids(resolveChoiceDeterminedResistances(
      [unnamed('related', 'species_template_trait_effects:3'), chosen('dragonborn-draconic-ancestry')],
      {
        source_instance_id: 4,
        made: true,
        rule_key: 'dragonborn-draconic-ancestry',
        determined_effect_refs: ['species_template_trait_effects:3'],
      },
    ))).toEqual(['chosen-dragonborn-draconic-ancestry']);
  });

  it('states each relation from its printed span (hash pinned; the phrases read by hand)', () => {
    const lines = speciesExtract.split('\n');
    const spanText = (span: string): string => {
      const match = /:(\d+)-(\d+)$/u.exec(span);
      if (match === null) throw new Error(`Bad span ${span}`);
      return lines.slice(Number(match[1]) - 1, Number(match[2])).join('\n');
    };
    expect(CHOICE_DETERMINED_RESISTANCE_TRAITS.map((relation) => [
      relation.species,
      relation.trait,
      relation.choiceRuleKey,
      sha256(spanText(relation.span)),
    ])).toEqual([
      ['Dragonborn', 'Damage Resistance', 'dragonborn-draconic-ancestry',
        '351112b69dade778b9432f3f407b59c14d4e3550144f6d2dc62206a5c31f1749'],
      ['Tiefling', 'Fiendish Legacy', 'tiefling-lineage',
        'db8ff58e143ba1ac8264b7beb0acdb01487c140779f6ec91d74b45ce7332baa5'],
    ]);
    // Two-column extract: the trait's words are in the span's left or right column.
    expect(spanText(CHOICE_DETERMINED_RESISTANCE_TRAITS[0].span)).toContain('Damage Resistance. You have Resistance to the');
    expect(spanText(CHOICE_DETERMINED_RESISTANCE_TRAITS[1].span)).toContain('level 1 benefit of the chosen legacy.');
  });
});
