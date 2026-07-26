import { describe, expect, it } from 'vitest';
import { parseSrdArmorTemplates } from '../../../src/rules/armor-srd';
import armorSource from '../../../docs/srd/source/armor-table.txt?raw';

/**
 * THE ORACLE IS THE EXTRACT, READ BY A HUMAN.
 *
 * Every number below was transcribed by reading
 * `docs/srd/source/armor-table.txt` by eye, not by running the parser. The rows
 * chosen are the ones that break different naive implementations: an armour
 * with no Dexterity term at all, one with a capped term, one with a Strength
 * requirement, and the Shield — whose AC cell is a BONUS rather than a base.
 */

const armor = parseSrdArmorTemplates();

function row(name: string) {
  const found = armor.find((entry) => entry.name === name);
  if (found === undefined) {
    throw new Error(`No parsed armour named ${name}.`);
  }
  return found;
}

describe('SRD armor table', () => {
  it('yields thirteen rows: TWELVE ARMOURS PLUS SHIELD', () => {
    // Counted from the extract by hand: Light 3 (Padded, Leather, Studded
    // Leather), Medium 5 (Hide, Chain Shirt, Scale Mail, Breastplate, Half
    // Plate), Heavy 4 (Ring Mail, Chain Mail, Splint, Plate), Shield 1.
    //
    // `docs/srd/SOURCE.md` described this as "13 armours plus Shield" — off by
    // one. This assertion is what stops the wrong number coming back, and it is
    // why the count is stated as 12 + 1 rather than as a bare 13.
    expect(armor).toHaveLength(13);
    const byCategory = (category: string) =>
      armor.filter((entry) => entry.category === category).length;
    expect(byCategory('light')).toBe(3);
    expect(byCategory('medium')).toBe(5);
    expect(byCategory('heavy')).toBe(4);
    expect(byCategory('shield')).toBe(1);
  });

  it('reads Light armour as an UNCAPPED Dexterity bonus', () => {
    // `Padded Armor  11 + Dex modifier  —  Disadvantage  8 lb.  5 GP`
    expect(row('Padded Armor')).toMatchObject({
      content_key: '2024:armor:padded-armor',
      category: 'light',
      armor_class: 11,
      dex_bonus: 'full',
      dex_bonus_max: null,
      strength_requirement: null,
      stealth_disadvantage: true,
    });
    // `Studded Leather Armor  12 + Dex modifier  —  —  13 lb.  45 GP`
    // A three-word name, which a greedy name pattern would run into the AC.
    expect(row('Studded Leather Armor')).toMatchObject({
      category: 'light',
      armor_class: 12,
      dex_bonus: 'full',
      stealth_disadvantage: false,
    });
  });

  it('reads Medium armour as a Dexterity bonus CAPPED at 2', () => {
    // `Half Plate Armor  15 + Dex modifier (max 2)  —  Disadvantage  40 lb.  750 GP`
    //
    // THE HAZARD: a parser that stops at `+ Dex modifier` silently drops the
    // cap and hands a high-Dexterity character several points of free AC.
    expect(row('Half Plate Armor')).toMatchObject({
      category: 'medium',
      armor_class: 15,
      dex_bonus: 'capped',
      dex_bonus_max: 2,
      strength_requirement: null,
      stealth_disadvantage: true,
    });
    // `Breastplate  14 + Dex modifier (max 2)  —  —  20 lb.  400 GP`
    // Same AC as Scale Mail but no Stealth penalty — the pair that catches a
    // parser reading the Stealth column off the wrong row.
    expect(row('Breastplate')).toMatchObject({
      armor_class: 14,
      dex_bonus: 'capped',
      dex_bonus_max: 2,
      stealth_disadvantage: false,
    });
    expect(row('Scale Mail')).toMatchObject({
      armor_class: 14,
      stealth_disadvantage: true,
    });
  });

  it('reads Heavy armour as having NO Dexterity term, and not a cap of zero', () => {
    // `Ring Mail  14  —  Disadvantage  40 lb.  30 GP` — a bare AC cell with no
    // `+ Dex` at all.
    //
    // THE HAZARD: modelling this as a cap of 0 is not merely inelegant, it is
    // WRONG — `min(dexModifier, 0)` subtracts for a negative modifier, so a
    // Dexterity 6 character would come out below the printed number.
    expect(row('Ring Mail')).toMatchObject({
      category: 'heavy',
      armor_class: 14,
      dex_bonus: 'none',
      dex_bonus_max: null,
      strength_requirement: null,
      stealth_disadvantage: true,
    });
    expect(row('Plate Armor')).toMatchObject({
      category: 'heavy',
      armor_class: 18,
      dex_bonus: 'none',
      dex_bonus_max: null,
      strength_requirement: 15,
      stealth_disadvantage: true,
    });
  });

  it('reads the Strength column, em-dash and all', () => {
    // `Chain Mail  16  Str 13  Disadvantage  55 lb.  75 GP`
    // `Splint Armor  17  Str 15  Disadvantage  60 lb.  200 GP`
    //
    // Exactly three of thirteen rows carry a requirement; the other ten print
    // U+2014, which is the source's own "none" and becomes a null.
    expect(row('Chain Mail').strength_requirement).toBe(13);
    expect(row('Splint Armor').strength_requirement).toBe(15);
    expect(row('Plate Armor').strength_requirement).toBe(15);
    expect(
      armor.filter((entry) => entry.strength_requirement !== null),
    ).toHaveLength(3);
    // Never zero: a zero would be the em-dash read as a number.
    for (const entry of armor) {
      expect(entry.strength_requirement, entry.name).not.toBe(0);
    }
  });

  it('reads the Shield as a BONUS with no Dexterity term', () => {
    // `Shield  +2  —  —  6 lb.  10 GP`, under its own `Shield (Utilize Action
    // to Don or Doff)` heading.
    //
    // THE HAZARD: the heading line and the row line both begin with the word
    // "Shield". Treating the row as a heading loses the armour; treating the
    // heading as a row invents one with no AC.
    expect(row('Shield')).toMatchObject({
      content_key: '2024:armor:shield',
      category: 'shield',
      armor_class: 2,
      dex_bonus: 'none',
      dex_bonus_max: null,
      strength_requirement: null,
      stealth_disadvantage: false,
    });
  });

  it('counts the Stealth penalty rows', () => {
    // Padded, Scale Mail, Half Plate, Ring Mail, Chain Mail, Splint, Plate.
    // Seven of thirteen, counted from the extract's Stealth column by eye.
    expect(
      armor.filter((entry) => entry.stealth_disadvantage).map((entry) => entry.name),
    ).toEqual([
      'Padded Armor',
      'Scale Mail',
      'Half Plate Armor',
      'Ring Mail',
      'Chain Mail',
      'Splint Armor',
      'Plate Armor',
    ]);
  });
});

/**
 * PROOF THAT THESE ASSERTIONS CAN FAIL — the same discipline as the class
 * traits test. A parse test that survives a change to its source is asserting
 * nothing.
 */
describe('the armour parse is load-bearing', () => {
  it('follows the extract when a base AC changes', () => {
    const mutated = armorSource.replace(
      'Plate Armor                     18',
      'Plate Armor                     19',
    );
    expect(mutated).not.toBe(armorSource);
    const parsed = parseSrdArmorTemplates(mutated);
    expect(parsed.find((entry) => entry.name === 'Plate Armor')?.armor_class).toBe(19);
    expect(parseSrdArmorTemplates().find((e) => e.name === 'Plate Armor')?.armor_class).toBe(18);
  });

  it('follows the extract when a Dexterity cap changes', () => {
    const mutated = armorSource.replace(
      'Half Plate Armor                15 + Dex modifier (max 2)',
      'Half Plate Armor                15 + Dex modifier (max 3)',
    );
    expect(mutated).not.toBe(armorSource);
    expect(
      parseSrdArmorTemplates(mutated).find((e) => e.name === 'Half Plate Armor')
        ?.dex_bonus_max,
    ).toBe(3);
  });

  it('throws when the Shield row is deleted', () => {
    const mutated = armorSource.replace(/^ +Shield +\+2.*$/m, '');
    expect(mutated).not.toBe(armorSource);
    expect(() => parseSrdArmorTemplates(mutated)).toThrow(/parsed 12/);
  });

  it('throws when an armour row is deleted', () => {
    const mutated = armorSource.replace(/^ +Chain Mail .*$/m, '');
    expect(mutated).not.toBe(armorSource);
    expect(() => parseSrdArmorTemplates(mutated)).toThrow(/expected 13 rows/);
  });
});
