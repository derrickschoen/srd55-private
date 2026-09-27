import { describe, expect, it } from 'vitest';
import { bundledSrdSpellDescriptions } from '../../../src/rules/spells-srd';
import {
  parseSrdCastingTime,
  parseSrdSpellComponents,
  parseSrdSpellDuration,
  parseSrdSpellRange,
  SrdSpellError,
  type SrdSpellDescription,
} from '../../../src/rules/spells-srd-reader';

/**
 * THE TYPED SPELL FACTS (D918): casting time, range, components and duration
 * are read once, at build time, into closed values beside the printed text.
 *
 * Every expectation below was read off `docs/srd/source/spell-descriptions.txt`
 * by eye — the spell's printed Casting Time, Range, Components and Duration
 * lines — and written in the typed form by hand; none is this parser's output.
 * The two conversions come from the domain, not from recall: a mile is 5,280
 * feet (`spell-range.ts`, FEET_PER_MILE) and a gold piece is 100 copper
 * (`coin.ts`).
 */
function spell(name: string): SrdSpellDescription {
  const found = bundledSrdSpellDescriptions().find((entry) => entry.name === name);
  if (found === undefined) {
    throw new Error(`No bundled spell named ${name}.`);
  }
  return found;
}

describe('typed spell facts, read off the extract by hand', () => {
  it('Plant Growth: two ways to cast, each with its mode', () => {
    // "Casting Time: Action (Overgrowth) or 8 hours (Enrichment)"
    expect(spell('Plant Growth').casting_time_value).toEqual({
      options: [
        { unit: 'action', trigger: null, mode: 'Overgrowth' },
        { unit: 'hour', amount: 8, mode: 'Enrichment' },
      ],
      ritual: false,
    });
    expect(spell('Plant Growth').range_value).toEqual({ kind: 'ranged', feet: 150, area: null });
    expect(spell('Plant Growth').duration_value).toEqual({ kind: 'instantaneous' });
  });

  it('Counterspell: a Reaction keeps its printed trigger, and S alone is somatic only', () => {
    expect(spell('Counterspell').casting_time_value).toEqual({
      options: [{
        unit: 'reaction',
        trigger: 'which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components',
        mode: null,
      }],
      ritual: false,
    });
    expect(spell('Counterspell').action_type).toBe('Reaction');
    expect(spell('Counterspell').components_value).toEqual({
      verbal: false,
      somatic: true,
      material: null,
      cost: null,
    });
  });

  it('Detect Magic: a Ritual action with a concentration duration', () => {
    // "Action or Ritual", "Self", "Concentration, up to 10 minutes"
    expect(spell('Detect Magic').casting_time_value).toEqual({
      options: [{ unit: 'action', trigger: null, mode: null }],
      ritual: true,
    });
    expect(spell('Detect Magic').range_value).toEqual({ kind: 'self', area: null });
    expect(spell('Detect Magic').duration_value).toEqual({
      kind: 'timed',
      amount: 10,
      unit: 'minute',
      concentration: true,
      up_to: true,
    });
  });

  it('Protection from Evil and Good: the printed comma-less concentration, and a consumed material floor', () => {
    // "Concentration up to 10 minutes"; "M (a flask of Holy Water worth 25+ GP, which the spell consumes)"
    expect(spell('Protection from Evil and Good').duration_value).toEqual({
      kind: 'timed',
      amount: 10,
      unit: 'minute',
      concentration: true,
      up_to: true,
    });
    expect(spell('Protection from Evil and Good').concentration).toBe(true);
    expect(spell('Protection from Evil and Good').components_value).toEqual({
      verbal: true,
      somatic: true,
      material: 'a flask of Holy Water worth 25+ GP, which the spell consumes',
      cost: { copper: 2500, kind: 'minimum' },
    });
  });

  it('Etherealness: an "Up to" duration without concentration', () => {
    expect(spell('Etherealness').duration_value).toEqual({
      kind: 'timed',
      amount: 8,
      unit: 'hour',
      concentration: false,
      up_to: true,
    });
    expect(spell('Etherealness').concentration).toBe(false);
  });

  it('Project Image and Tsunami: miles become feet, rounds and days stay their unit', () => {
    expect(spell('Project Image').range_value).toEqual({ kind: 'ranged', feet: 2_640_000, area: null });
    expect(spell('Project Image').duration_value).toEqual({
      kind: 'timed',
      amount: 1,
      unit: 'day',
      concentration: true,
      up_to: true,
    });
    expect(spell('Tsunami').range_value).toEqual({ kind: 'ranged', feet: 5_280, area: null });
    expect(spell('Tsunami').duration_value).toEqual({
      kind: 'timed',
      amount: 6,
      unit: 'round',
      concentration: true,
      up_to: true,
    });
    expect(spell('Tsunami').casting_time_value).toEqual({
      options: [{ unit: 'minute', amount: 1, mode: null }],
      ritual: false,
    });
  });

  it('Symbol, Mirage Arcane and Dream: triggered, sight and special', () => {
    expect(spell('Symbol').duration_value).toEqual({ kind: 'until_dispelled', or_triggered: true });
    expect(spell('Symbol').components_value.cost).toEqual({ copper: 100_000, kind: 'minimum' });
    expect(spell('Mirage Arcane').range_value).toEqual({ kind: 'sight', area: null });
    expect(spell('Mirage Arcane').duration_value).toEqual({
      kind: 'timed',
      amount: 10,
      unit: 'day',
      concentration: false,
      up_to: false,
    });
    expect(spell('Dream').range_value).toEqual({ kind: 'special', area: null });
  });
});

describe('the SRD vocabularies are closed: a printed value outside them fails the build', () => {
  it.each([
    ['a day-long casting time', () => parseSrdCastingTime('Probe', '1 day')],
    ['a bare trigger', () => parseSrdCastingTime('Probe', 'which you take when you fall')],
    ['a free action', () => parseSrdCastingTime('Probe', 'Free Action')],
    ['a permanent duration', () => parseSrdSpellDuration('Probe', 'Permanent')],
    ['a duration in weeks', () => parseSrdSpellDuration('Probe', '2 weeks')],
    ['a Material flag with no clause', () => parseSrdSpellComponents('Probe', 'V, M')],
    ['flags out of order', () => parseSrdSpellComponents('Probe', 'S, V')],
    ['a clause with no Material flag', () => parseSrdSpellComponents('Probe', 'V (a feather)')],
    ['an unreadable range', () => parseSrdSpellRange('Probe', 'Anywhere on this plane')],
  ])('refuses %s', (_label, parse) => {
    expect(parse).toThrow(SrdSpellError);
  });

  it('reads every bundled spell, so the 339 printed values all sit inside the vocabularies', () => {
    const spells = bundledSrdSpellDescriptions();
    expect(spells).toHaveLength(339);
    for (const entry of spells) {
      expect(entry.ritual, entry.name).toBe(entry.casting_time_value.ritual);
      expect(entry.concentration, entry.name).toBe(
        entry.duration_value.kind === 'timed' && entry.duration_value.concentration,
      );
      expect(entry.components_value.verbal || entry.components_value.somatic || entry.components_value.material !== null, entry.name).toBe(true);
    }
  });
});
