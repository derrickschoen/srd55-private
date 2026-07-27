import { describe, expect, it } from 'vitest';
import {
  ABSENT_SPELL_COMPONENTS,
  decodeSpellComponents,
  encodeSpellComponents,
  parseSpellComponents,
} from '../../../src/domain/spell-components';
import { coinDenominations, copperPerCoin, copperValue } from '../../../src/domain/coin';

/**
 * A SPELL'S MATERIAL COMPONENT: A COST IN COPPER PLUS TEXT.
 *
 * THE CLAIM THIS FILE EXISTS TO MAKE FALSIFIABLE is that adding a typed cost
 * costs no V/S/M. `spell_versions.components` is untouched and still holds the
 * printed line, so the test that matters most is the one asserting that a line
 * with NO cost still yields a material and no invented price — and that a line
 * with no material at all yields nothing rather than zero.
 */
describe('coin, in copper pieces', () => {
  it('pins all five rates, because none of them is in a bundled extract', () => {
    // `docs/srd/source/` holds fourteen extracts and NONE is the Coinage table.
    // These five numbers are a declared constant, not a sourced one, and that
    // is exactly why a silent edit to them must fail here.
    expect(coinDenominations).toEqual(['cp', 'sp', 'ep', 'gp', 'pp']);
    expect(copperPerCoin('cp')).toBe(1);
    expect(copperPerCoin('sp')).toBe(10);
    expect(copperPerCoin('ep')).toBe(50);
    expect(copperPerCoin('gp')).toBe(100);
    expect(copperPerCoin('pp')).toBe(1000);
  });

  it('refuses an amount it cannot represent rather than rounding one', () => {
    expect(copperValue(8, 'gp')).toBe(800);
    expect(copperValue(0, 'gp')).toBe(0);
    expect(copperValue(1.5, 'gp')).toBeNull();
    expect(copperValue(-1, 'gp')).toBeNull();
    expect(copperValue(Number.NaN, 'gp')).toBeNull();
    expect(copperValue(Number.MAX_SAFE_INTEGER, 'pp')).toBeNull();
  });
});

describe('a printed components line, parsed', () => {
  it('reads the bundled SRD’s own two component lines', () => {
    // `docs/srd/source/weapon-attack-cantrips.txt:37` — Shillelagh.
    expect(parseSpellComponents('V, S, M (mistletoe)')).toEqual({
      cost: null,
      material: 'mistletoe',
    });
    // `:16-17` — True Strike. THE `+` IS THE WHOLE REASON `MaterialCostKind`
    // EXISTS: an integer column alone stores 1 and drops it, and printing
    // "1 cp" then states as a fact what the source states as a floor.
    expect(
      parseSpellComponents(
        'S, M (a weapon with which you have proficiency and that is worth 1+ CP)',
      ),
    ).toEqual({
      cost: { copper: 1, kind: 'minimum' },
      material:
        'a weapon with which you have proficiency and that is worth 1+ CP',
    });
  });

  it('keeps a material with NO cost, which is the overwhelming majority', () => {
    // MEASURED, NOT ASSUMED: of every components value in this repository, all
    // but one carry no price at all. A model that only had room for a cost
    // would have had nothing to store for any of them.
    for (const raw of [
      'V, S, M (a shard of cooled lamp glass)',
      'S, M (a rag and a little rosin)',
      'M (a pinch of soot)',
    ]) {
      const parsed = parseSpellComponents(raw);
      expect(parsed.cost, raw).toBeNull();
      expect(parsed.material, raw).not.toBe('');
    }
  });

  it('stores NOTHING for a line with no material clause — not a zero cost', () => {
    // D24: absence is not zero. `V, S` has no material and no price, and
    // storing `material_cost_copper = 0` would say the component is free.
    for (const raw of ['V', 'V, S', 'S', null, '', 'V, S, M ()']) {
      expect(parseSpellComponents(raw), String(raw)).toEqual({
        cost: null,
        material: null,
      });
      expect(
        encodeSpellComponents(parseSpellComponents(raw)),
        String(raw),
      ).toEqual(ABSENT_SPELL_COMPONENTS);
    }
  });

  it('distinguishes a floor from an exact price, in both directions', () => {
    expect(parseSpellComponents('M (a diamond worth 300+ GP)').cost).toEqual({
      copper: 30_000,
      kind: 'minimum',
    });
    // No `+`: a homebrew author who writes an exact price gets one. Calling it
    // a minimum would be as wrong as calling `1+ CP` exact.
    expect(parseSpellComponents('M (a ruby worth 25 GP)').cost).toEqual({
      copper: 2500,
      kind: 'exact',
    });
  });

  it('reads every denomination, and a thousands separator', () => {
    expect(parseSpellComponents('M (a pearl worth 100 GP)').cost?.copper).toBe(
      10_000,
    );
    expect(parseSpellComponents('M (a chip worth 5 SP)').cost?.copper).toBe(50);
    expect(parseSpellComponents('M (a bar worth 2 PP)').cost?.copper).toBe(2000);
    expect(parseSpellComponents('M (an ingot worth 1 EP)').cost?.copper).toBe(50);
    expect(
      parseSpellComponents('M (a statuette worth 1,000+ GP)').cost,
    ).toEqual({ copper: 100_000, kind: 'minimum' });
  });

  it('looks for the price INSIDE the material clause and nowhere else', () => {
    // A flavour sentence outside `M (…)` is not a material price, and reading
    // the whole line would let one mint a cost the author never stated.
    expect(
      parseSpellComponents('V (spoken words worth 500 GP to a collector), S')
        .cost,
    ).toBeNull();
    // The clause must also be the tail of the line: a half-read line yields no
    // structure rather than a partial one.
    expect(parseSpellComponents('M (a candle), V').material).toBeNull();
  });

  it('round-trips through the three columns, and reads half a cost as none', () => {
    const parsed = parseSpellComponents('V, S, M (a diamond worth 300+ GP)');
    const columns = encodeSpellComponents(parsed);
    expect(columns).toEqual({
      material_cost_copper: 30_000,
      material_cost_kind: 'minimum',
      material_component_summary: 'a diamond worth 300+ GP',
    });
    expect(decodeSpellComponents(columns)).toEqual(parsed);

    // Reachable only off an image whose CHECKs were never applied (F11). Half
    // a cost must read as NO cost — printing "300 cp" without knowing whether
    // it is a floor is the thing the pair exists to prevent.
    expect(
      decodeSpellComponents({ ...columns, material_cost_kind: null }).cost,
    ).toBeNull();
    expect(
      decodeSpellComponents({ ...columns, material_cost_copper: null }).cost,
    ).toBeNull();
    expect(
      decodeSpellComponents({ ...columns, material_cost_kind: 'about' as never })
        .cost,
    ).toBeNull();
    // ...and the TEXT survives every one of those, because it is a different
    // fact and losing it would be losing the author's words over our own
    // inability to read a number.
    expect(
      decodeSpellComponents({ ...columns, material_cost_kind: null }).material,
    ).toBe('a diamond worth 300+ GP');
  });
});
