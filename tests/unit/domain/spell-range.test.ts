import { describe, expect, it } from 'vitest';
import {
  ABSENT_SPELL_RANGE,
  decodeSpellRange,
  encodeSpellRange,
  parseSpellRange,
  type SpellRange,
} from '../../../src/domain/spell-range';

/**
 * THE PRINTED RANGE LINE, READ.
 *
 * EVERY INPUT BELOW IS A STRING THAT EXISTS IN THIS REPOSITORY OR IN THE SRD
 * TEXT IT SHIPS, and the two that matter most are not fixtures:
 *
 *  - `Self` is printed in `docs/srd/source/weapon-attack-cantrips.txt:15` and
 *    `:36`, the only verbatim spell text this repo carries;
 *  - `Touch` is the value in the project's own documented import example,
 *    `docs/CATALOG-IMPORT.md`.
 *
 * Neither is a distance, and a nullable feet column alone would have stored
 * NULL for both — and for a blank range line as well. Three facts, one storage
 * state. The tests that prove they are now three are the point of the file.
 */
describe('a printed spell range, parsed', () => {
  it('reads the two non-distance forms the bundled SRD and our own docs print', () => {
    // NOT `{ feet: 0 }` for either. A zero-foot range and "this spell has no
    // distance" are different facts, and the type has no `feet` field on these
    // kinds at all so the confusion is not expressible.
    expect(parseSpellRange('Self')).toEqual({ kind: 'self', area: null });
    expect(parseSpellRange('Touch')).toEqual({ kind: 'touch', area: null });
  });

  it('tells Self, Touch and an unrecorded range apart, which one column could not', () => {
    const self = encodeSpellRange(parseSpellRange('Self'));
    const touch = encodeSpellRange(parseSpellRange('Touch'));
    const unread = encodeSpellRange(parseSpellRange('Wherever the wind goes'));
    const blank = encodeSpellRange(parseSpellRange(null));

    expect(self.range_kind).toBe('self');
    expect(touch.range_kind).toBe('touch');
    expect(unread).toEqual(ABSENT_SPELL_RANGE);
    expect(blank).toEqual(ABSENT_SPELL_RANGE);
    // All four have no distance, which is exactly why the KIND has to carry
    // the difference.
    for (const columns of [self, touch, unread, blank]) {
      expect(columns.range_feet).toBeNull();
    }
    expect(self).not.toEqual(touch);
  });

  it('reads a distance and its unit word', () => {
    expect(parseSpellRange('60 feet')).toEqual({
      kind: 'ranged',
      feet: 60,
      area: null,
    });
    expect(parseSpellRange('30 feet')).toEqual({
      kind: 'ranged',
      feet: 30,
      area: null,
    });
    // The unit word is part of the stored string, so even the "easy" case
    // needs a parse — and the spellings a printed source uses vary.
    expect(parseSpellRange('90 ft.')).toEqual({
      kind: 'ranged',
      feet: 90,
      area: null,
    });
    expect(parseSpellRange('5-foot')).toEqual({
      kind: 'ranged',
      feet: 5,
      area: null,
    });
  });

  it('reads Self with an area as an origin AND a shape, with the number on the shape', () => {
    // THE CASE THE RULING HAD NO ROOM FOR. `Self (30-foot Cone)` carries an
    // origin and an area at once, and the 30 belongs to the CONE. Storing it as
    // the range would make a 30-foot cone indistinguishable from a 30-foot
    // range — so `range_feet` stays NULL here and `area_feet` carries it.
    const parsed = parseSpellRange('Self (30-foot Cone)');
    expect(parsed).toEqual({
      kind: 'self',
      area: { shape: 'cone', feet: 30 },
    });
    expect(encodeSpellRange(parsed)).toEqual({
      range_kind: 'self',
      range_feet: null,
      area_shape: 'cone',
      area_feet: 30,
    });
  });

  it('reads all four of the owner’s shapes, and the radius wording', () => {
    expect(parseSpellRange('Self (10-foot radius sphere)')).toEqual({
      kind: 'self',
      area: { shape: 'sphere', feet: 10 },
    });
    expect(parseSpellRange('Self (20-foot Cylinder)')).toEqual({
      kind: 'self',
      area: { shape: 'cylinder', feet: 20 },
    });
    // The owner's own example: "straight line (like lightning bolt)".
    expect(parseSpellRange('Self (100-foot Line)')).toEqual({
      kind: 'self',
      area: { shape: 'line', feet: 100 },
    });
    expect(parseSpellRange('Self (15-foot cone)')).toEqual({
      kind: 'self',
      area: { shape: 'cone', feet: 15 },
    });
  });

  it('normalises the dash and space a pdftotext extract uses', () => {
    // A `-layout` extract writes U+2011 and U+00A0 where a keyboard writes `-`
    // and a space. Without normalising, this stores nothing and the structure
    // silently never appears for the one source we actually ship.
    expect(parseSpellRange('Self (30‑foot Cone)')).toEqual({
      kind: 'self',
      area: { shape: 'cone', feet: 30 },
    });
    expect(parseSpellRange('60–feet')).toEqual({
      kind: 'ranged',
      feet: 60,
      area: null,
    });
  });

  it('reads the three other non-distance forms the SRD prints', () => {
    expect(parseSpellRange('Sight')).toEqual({ kind: 'sight', area: null });
    expect(parseSpellRange('Unlimited')).toEqual({
      kind: 'unlimited',
      area: null,
    });
    expect(parseSpellRange('Special')).toEqual({ kind: 'special', area: null });
  });

  it('converts miles, which are a distance in different units', () => {
    expect(parseSpellRange('1 mile')).toEqual({
      kind: 'ranged',
      feet: 5280,
      area: null,
    });
    expect(parseSpellRange('500 miles')).toEqual({
      kind: 'ranged',
      feet: 2_640_000,
      area: null,
    });
  });

  it('stores NOTHING rather than a guess for anything it cannot read whole', () => {
    // THE SAFETY PROPERTY OF THE WHOLE DESIGN. `spell_versions.range` accepts
    // any string at all — `nullableString` checks only `typeof` — so the parse
    // has to be total, and the honest total answer for an unreadable line is
    // "no structure". The author's text is untouched and still prints.
    for (const raw of [
      '',
      '   ',
      'Anywhere on this plane',
      'Sixty feet',
      '60 metres',
      'constructor',
      '__proto__',
      'Touch (30-foot cone)',
    ]) {
      expect(parseSpellRange(raw), raw).toBeNull();
      expect(encodeSpellRange(parseSpellRange(raw)), raw).toEqual(
        ABSENT_SPELL_RANGE,
      );
    }
  });

  it('KEEPS the self origin when the area word is outside the four-shape list', () => {
    // THE COLLAPSE `range_kind` EXISTS TO PREVENT, MEASURED ON THE FORM THAT
    // ACTUALLY PRINTS IT. Emanation and Cube are two of SRD 5.2.1's six areas of
    // effect and neither is a member of `spellAreaShapes`, so
    // `Self (15-foot Emanation)` — the printed Range line of a whole family of
    // self-origin spells — used to store four NULLs: the SAME storage state as
    // an author who left the Range line blank. `Self` was read unambiguously
    // and is now kept; only the unmodelled area is dropped, and it survives in
    // the verbatim `spell_versions.range` text that prints.
    for (const raw of [
      'Self (15-foot Emanation)',
      'Self (15-foot Cube)',
      'Self (10-foot Radius)',
      'Self (a big cone)',
      'Self (0-foot cone)',
      'Self (30-foot cube)',
    ]) {
      expect(parseSpellRange(raw), raw).toEqual({ kind: 'self', area: null });
      expect(encodeSpellRange(parseSpellRange(raw)), raw).toEqual({
        ...ABSENT_SPELL_RANGE,
        range_kind: 'self',
      });
      expect(
        encodeSpellRange(parseSpellRange(raw)),
        raw,
      ).not.toEqual(ABSENT_SPELL_RANGE);
    }
  });

  it('reads a thousands separator, which the components parser beside it already does', () => {
    // `parseSpellComponents` reads `worth 1,000+ GP`. Two parsers reading the
    // same author's printed text disagreeing about a comma is an inconsistency
    // that author cannot see.
    expect(parseSpellRange('1,000 feet')).toEqual({
      kind: 'ranged',
      feet: 1000,
      area: null,
    });
    expect(parseSpellRange('1,000 miles')).toEqual({
      kind: 'ranged',
      feet: 5_280_000,
      area: null,
    });
    expect(parseSpellRange('Self (1,000-foot Line)')).toEqual({
      kind: 'self',
      area: { shape: 'line', feet: 1000 },
    });
    // STRICT GROUPING. `1,00` is not 100 — a malformed separator means the line
    // was not understood, and guessing where the comma belongs is the shape of
    // guess this parser refuses.
    expect(parseSpellRange('1,00 feet')).toBeNull();
    expect(parseSpellRange('1,0000 feet')).toBeNull();
  });

  it('is not fooled by a prototype-named range, which a Map is what prevents', () => {
    // D33: an object literal returns a FUNCTION for `constructor`, and the
    // value would have walked past the guard. `range` is user-supplied text
    // with no vocabulary check, so both strings are reachable.
    expect(parseSpellRange('constructor')).toBeNull();
    expect(parseSpellRange('__proto__')).toBeNull();
    expect(parseSpellRange('toString')).toBeNull();
  });

  it('round-trips every shape it can produce through the four columns', () => {
    const cases: SpellRange[] = [
      { kind: 'self', area: null },
      { kind: 'touch', area: null },
      { kind: 'sight', area: null },
      { kind: 'unlimited', area: null },
      { kind: 'special', area: null },
      { kind: 'ranged', feet: 0, area: null },
      { kind: 'ranged', feet: 120, area: null },
      { kind: 'self', area: { shape: 'cone', feet: 15 } },
      { kind: 'ranged', feet: 150, area: { shape: 'sphere', feet: 20 } },
    ];
    for (const range of cases) {
      expect(decodeSpellRange(encodeSpellRange(range))).toEqual(range);
    }
  });

  it('reads a column set that describes no range as no range, rather than half a one', () => {
    // These are the states a hand-edited image can hold — F11's point, applied
    // to a table whose CHECKs were never applied to an existing image. Each one
    // must read as ABSENT, never as a partial range a consumer would print.
    expect(decodeSpellRange(ABSENT_SPELL_RANGE)).toBeNull();
    expect(
      decodeSpellRange({ ...ABSENT_SPELL_RANGE, range_kind: 'ranged' }),
    ).toBeNull();
    expect(
      decodeSpellRange({
        ...ABSENT_SPELL_RANGE,
        range_kind: 'touch',
        range_feet: 30,
      }),
    ).toBeNull();
    expect(
      decodeSpellRange({
        ...ABSENT_SPELL_RANGE,
        range_kind: 'self',
        area_shape: 'cone',
      }),
    ).toEqual({ kind: 'self', area: null });
    expect(
      decodeSpellRange({
        ...ABSENT_SPELL_RANGE,
        range_kind: 'ranged',
        range_feet: -1,
      }),
    ).toBeNull();
  });
});
