import { describe, expect, it } from 'vitest';
import {
  canonicalContentIdentityJson,
} from '../../../src/catalog/content-identity';
import { parseSourceCatalogRecord } from '../../../src/catalog/source-catalog-records';
import { projectAuthoredContentAggregateV1 } from '../../../src/catalog/stored-authored-content-projector-v1';
import type { SpeciesContentAggregate } from '../../../src/authoring/contracts';
import { SourceCatalogSpeciesSensesError } from '../../../src/catalog/source-catalog-records-errors';
import {
  canonicalSpeciesSenses,
  decodeSpeciesSenses,
} from '../../../src/catalog/species-senses';

/**
 * The one rule every boundary applies to a species' stated senses (owner D923
 * Q10): a list of distinct engine senses (Blindsight, Darkvision, Tremorsense,
 * Truesight), each `{ kind, range_feet }` with a range from 1 to 1,000 feet.
 */
describe('a species sense statement', () => {
  it('accepts the empty statement and distinct in-range engine senses', () => {
    expect(decodeSpeciesSenses([])).toEqual({ ok: true, senses: [] });
    expect(decodeSpeciesSenses([
      { kind: 'darkvision', range_feet: 60 },
      { kind: 'tremorsense', range_feet: 1 },
      { kind: 'truesight', range_feet: 1_000 },
      { kind: 'blindsight', range_feet: 10 },
    ])).toEqual({
      ok: true,
      senses: [
        { kind: 'darkvision', range_feet: 60 },
        { kind: 'tremorsense', range_feet: 1 },
        { kind: 'truesight', range_feet: 1_000 },
        { kind: 'blindsight', range_feet: 10 },
      ],
    });
  });

  it('refuses every statement the engine could not run as written', () => {
    expect(decodeSpeciesSenses({ kind: 'darkvision', range_feet: 60 }))
      .toEqual({ ok: false, index: null, problem: 'not_a_list' });
    expect(decodeSpeciesSenses(['darkvision']))
      .toEqual({ ok: false, index: 0, problem: 'not_an_object' });
    expect(decodeSpeciesSenses([{ kind: 'darkvision', range_feet: 60, notes: 'x' }]))
      .toEqual({ ok: false, index: 0, problem: 'unknown_field' });
    expect(decodeSpeciesSenses([{ kind: 'darkvision' }]))
      .toEqual({ ok: false, index: 0, problem: 'unknown_field' });
    // Homebrew senses stay trait prose; the statement holds engine senses only.
    expect(decodeSpeciesSenses([{ kind: 'echolocation', range_feet: 60 }]))
      .toEqual({ ok: false, index: 0, problem: 'unknown_kind' });
    expect(decodeSpeciesSenses([{ kind: 'normal_sight', range_feet: 60 }]))
      .toEqual({ ok: false, index: 0, problem: 'unknown_kind' });
    expect(decodeSpeciesSenses([{ kind: 'darkvision', range_feet: 0 }]))
      .toEqual({ ok: false, index: 0, problem: 'range_out_of_bounds' });
    expect(decodeSpeciesSenses([{ kind: 'darkvision', range_feet: 1_001 }]))
      .toEqual({ ok: false, index: 0, problem: 'range_out_of_bounds' });
    expect(decodeSpeciesSenses([{ kind: 'darkvision', range_feet: 60.5 }]))
      .toEqual({ ok: false, index: 0, problem: 'range_out_of_bounds' });
    expect(decodeSpeciesSenses([{ kind: 'darkvision', range_feet: '60' }]))
      .toEqual({ ok: false, index: 0, problem: 'range_out_of_bounds' });
    expect(decodeSpeciesSenses([
      { kind: 'darkvision', range_feet: 60 },
      { kind: 'darkvision', range_feet: 120 },
    ])).toEqual({ ok: false, index: 1, problem: 'repeated_kind' });
    expect(decodeSpeciesSenses(Array.from({ length: 5 }, () => ({ kind: 'darkvision', range_feet: 60 }))))
      .toEqual({ ok: false, index: null, problem: 'too_many' });
  });

  it('is a set in identity: listing order is not a fact about the species', () => {
    const one = canonicalContentIdentityJson(canonicalSpeciesSenses([
      { kind: 'darkvision', range_feet: 60 },
      { kind: 'blindsight', range_feet: 10 },
    ]));
    const other = canonicalContentIdentityJson(canonicalSpeciesSenses([
      { kind: 'blindsight', range_feet: 10 },
      { kind: 'darkvision', range_feet: 60 },
    ]));
    expect(one).toBe(other);
    expect(one).toBe('[{"kind":"blindsight","range_feet":10},{"kind":"darkvision","range_feet":60}]');
  });

  it('refuses a portable species record whose statement is invalid, and admits one with none', () => {
    const aggregate = {
      kind: 'species',
      name: 'Portable Folk',
      rules_edition: 'expanded',
      reference_text: '',
      repeatable: false,
      creature_type: 'Humanoid',
      primary_size: 'Medium',
      alternate_size: null,
      walking_speed_feet: 30,
      grants: [],
      traits: [],
    };
    const record = (value: Record<string, unknown>) =>
      parseSourceCatalogRecord('species', { kind: 'species', visibility: 'listed', aggregate: value });
    expect(() => record(aggregate)).not.toThrow();
    expect(record({ ...aggregate, senses: [{ kind: 'darkvision', range_feet: 60 }] }).aggregate)
      .toMatchObject({ senses: [{ kind: 'darkvision', range_feet: 60 }] });
    expect(() => record({ ...aggregate, senses: [{ kind: 'darkvision', range_feet: 5_000 }] }))
      .toThrow(new SourceCatalogSpeciesSensesError('aggregate.senses', 0, 'range_out_of_bounds'));
  });

  it('projects a statement into identity only when the species states one', () => {
    const species = {
      kind: 'species',
      name: 'Projected Folk',
      rules_edition: 'expanded',
      reference_text: '',
      repeatable: false,
      creature_type: 'Humanoid',
      primary_size: 'Medium',
      alternate_size: null,
      walking_speed_feet: 30,
      traits: [],
      grants: [],
    } as unknown as SpeciesContentAggregate;
    const canonicalPayload = (aggregate: SpeciesContentAggregate) =>
      JSON.parse(canonicalContentIdentityJson(projectAuthoredContentAggregateV1(aggregate).payload)) as
        Readonly<Record<string, unknown>>;
    // Unstated: no key, so a fingerprint minted before the field keeps its bytes.
    expect(Object.hasOwn(canonicalPayload(species), 'senses')).toBe(false);
    // Stated: the key, even when empty — "normal sight only" is not "unstated".
    expect(canonicalPayload({ ...species, senses: [] }).senses).toEqual([]);
    expect(canonicalPayload({ ...species, senses: [{ kind: 'truesight', range_feet: 30 }] }).senses)
      .toEqual([{ kind: 'truesight', range_feet: 30 }]);
  });
});
