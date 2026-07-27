import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { seedOriginContent } from '../../../src/rules/origins-srd';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { seedWeaponContent } from '../../../src/rules/weapons-srd';
import {
  backgroundEquipmentPackages,
  describeBackgroundEquipmentItem,
} from '../../../src/queries/background-equipment';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * BACKGROUND EQUIPMENT AS A LIST OF QUANTITY + ITEM.
 *
 * The owner's ruling: *"Background equipment packages should be templates for a
 * list of quantity + item (name only unless weapon or armor)."*
 *
 * WHAT THIS SUITE DELIBERATELY DOES NOT ASSERT, because it does not exist:
 * anything about a CHARACTER. Nothing copies a background template onto a
 * character in this repository, so structuring the template changes nothing a
 * user can see yet. The ruling says "templates"; the copy path is the named
 * gap, not a silent one.
 */
describe('the bundled background equipment packages, structured', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    // The order `src/db/bootstrap.ts` uses, and it is now load-bearing: a
    // background's Spear is a reference to the weapon catalog's Spear.
    seedWeaponContent(db);
    seedSheetContent(db);
    seedOriginContent(db);
  });

  afterEach(() => connection.close());

  function packageFor(background: string, option: 'a' | 'b') {
    const found = backgroundEquipmentPackages(db).find(
      (entry) => entry.background_name === background && entry.option === option,
    );
    expect(found, `${background} option ${option}`).toBeDefined();
    return found as NonNullable<typeof found>;
  }

  it('splits all four licensed packages, in printed order', () => {
    // Eight packages: four backgrounds, two options each. Four is the complete
    // licensed set — SRD 5.2.1 carries Acolyte, Criminal, Sage and Soldier.
    const packages = backgroundEquipmentPackages(db);
    expect(packages).toHaveLength(8);
    expect(
      packageFor('Acolyte', 'a').items.map((item) => item.item_name),
    ).toEqual([
      'Calligrapher’s Supplies',
      'Book (prayers)',
      'Holy Symbol',
      'Parchment (10 sheets)',
      'Robe',
      '8 GP',
    ]);
    expect(packageFor('Acolyte', 'a').items.map((item) => item.sort_order)).toEqual(
      [1, 2, 3, 4, 5, 6],
    );
  });

  it('reads a leading numeral as a quantity, and a parenthetical count as NOT one', () => {
    const criminal = packageFor('Criminal', 'a').items;
    const soldier = packageFor('Soldier', 'a').items;
    const acolyte = packageFor('Acolyte', 'a').items;

    // A leading numeral IS the count of the named item.
    expect(criminal[0]).toMatchObject({ item_name: '2 Daggers', quantity: 2 });
    expect(criminal[3]).toMatchObject({ item_name: '2 Pouches', quantity: 2 });
    expect(soldier[2]).toMatchObject({ item_name: '20 Arrows', quantity: 20 });

    // `Parchment (10 sheets)` counts a SUB-UNIT. Reading the 10 as a quantity
    // would say the package contains ten parchments; it contains one, of ten
    // sheets. The Sage's says eight, so the two backgrounds differ in it and a
    // shared constant would have been wrong for one of them.
    expect(acolyte[3]).toMatchObject({
      item_name: 'Parchment (10 sheets)',
      quantity: 1,
    });
    expect(packageFor('Sage', 'a').items[3]).toMatchObject({
      item_name: 'Parchment (8 sheets)',
      quantity: 1,
    });
  });

  it('links the four weapon entries to real weapon_templates rows, plural and all', () => {
    // "NAME ONLY UNLESS WEAPON OR ARMOR", made structural. `2 Daggers` keeps
    // its printed plural as the NAME and resolves to the singular `Dagger`
    // template — which is why the link is DECLARED and not name-matched (D15).
    const linked = backgroundEquipmentPackages(db)
      .flatMap((entry) => entry.items)
      .filter((item) => item.item_kind === 'weapon');
    expect(linked.map((item) => item.item_name).sort()).toEqual([
      '2 Daggers',
      'Quarterstaff',
      'Shortbow',
      'Spear',
    ]);
    for (const item of linked) {
      expect(item.weapon_template_id, item.item_name).not.toBeNull();
      expect(
        db.scalar('SELECT name FROM weapon_templates WHERE id = ?', [
          item.weapon_template_id,
        ]),
        item.item_name,
      ).toBeTypeOf('string');
    }
    expect(
      db.scalar('SELECT name FROM weapon_templates WHERE id = ?', [
        linked.find((item) => item.item_name === '2 Daggers')
          ?.weapon_template_id ?? -1,
      ]),
    ).toBe('Dagger');
  });

  it('records money as COIN with a copper amount, not as an inventory item', () => {
    // Every option A ends in coin and option B is coin ALONE for all four.
    // Under a strict quantity-plus-name reading, option B would be a package
    // with zero items or an item literally named `GP` with a quantity of 50.
    for (const background of ['Acolyte', 'Criminal', 'Sage', 'Soldier']) {
      const optionB = packageFor(background, 'b').items;
      expect(optionB, background).toHaveLength(1);
      expect(optionB[0], background).toMatchObject({
        item_name: '50 GP',
        item_kind: 'coin',
        quantity: 1,
        coin_copper: 5000,
      });
    }
    expect(packageFor('Criminal', 'a').items.at(-1)).toMatchObject({
      item_name: '16 GP',
      item_kind: 'coin',
      coin_copper: 1600,
    });
    expect(packageFor('Soldier', 'a').items.at(-1)).toMatchObject({
      item_name: '14 GP',
      coin_copper: 1400,
    });
  });

  it('keeps the three parenthetical forms a quantity+name reading cannot hold', () => {
    // NONE of these is a quantity, and all three survive because the ITEM NAME
    // is stored verbatim. `Gaming Set (same as above)` is the hard one: it is
    // not an item name at all, it is a back-reference to the Soldier's own
    // Tool Proficiency line ("Choose one kind of Gaming Set").
    const names = backgroundEquipmentPackages(db)
      .flatMap((entry) => entry.items)
      .map((item) => item.item_name);
    expect(names).toContain('Book (prayers)');
    expect(names).toContain('Book (history)');
    expect(names).toContain('Gaming Set (same as above)');
    expect(
      db.scalar(
        "SELECT tool_proficiency FROM background_templates WHERE name = 'Soldier'",
      ),
    ).toBe('Choose one kind of Gaming Set');
  });

  it('keeps the verbatim printed package beside the structured rows', () => {
    // THE PASSTHROUGH LIMB. The structured rows are what a reader computes
    // from; these two columns are what a reader prints, and they still say
    // exactly what the extract says.
    expect(
      db.scalar(
        "SELECT equipment_option_a FROM background_templates WHERE name = 'Soldier'",
      ),
    ).toBe(
      'Spear, Shortbow, 20 Arrows, Gaming Set (same as above), Healer’s Kit, ' +
        'Quiver, Traveler’s Clothes, 14 GP',
    );
  });

  it('re-seeding replaces the lines rather than accumulating them', () => {
    const before = backgroundEquipmentPackages(db).flatMap((p) => p.items).length;
    seedOriginContent(db);
    expect(
      backgroundEquipmentPackages(db).flatMap((p) => p.items),
    ).toHaveLength(before);
  });

  it('describes each kind, and prints no count for a quantity of one', () => {
    expect(
      describeBackgroundEquipmentItem(packageFor('Acolyte', 'a').items[4]!),
    ).toBe('Robe');
    expect(
      describeBackgroundEquipmentItem(packageFor('Criminal', 'a').items[0]!),
    ).toBe('2 Daggers (×2) — weapon');
    expect(
      describeBackgroundEquipmentItem(packageFor('Sage', 'b').items[0]!),
    ).toBe('50 GP (5000 cp)');
    expect(
      describeBackgroundEquipmentItem({
        option: 'a',
        sort_order: 1,
        quantity: 1,
        item_name: 'Chain Shirt',
        item_kind: 'armor',
        weapon_template_id: null,
        armor_template_id: 7,
        coin_copper: null,
      }),
    ).toBe('Chain Shirt — armour');
  });
});

describe('the armour limb, which no licensed package reaches', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedWeaponContent(db);
    seedSheetContent(db);
    seedOriginContent(db);
  });

  afterEach(() => connection.close());

  /**
   * THE FOUR LICENSED PACKAGES CONTAIN NO ARMOUR — `Robe` and
   * `Traveler's Clothes` are clothing, which the source's own thirteen-row
   * Armor table does not carry. So the owner's "unless weapon or ARMOR" limb
   * would otherwise ship with no row that reaches it, which is the untestable
   * branch D34 rejected for a different feature.
   *
   * It is exercised here by direct insertion instead: both the accept and the
   * refuse, so the limb is proved to work AND proved to be constrained.
   */
  it('stores an armour line, and the reader carries the link', () => {
    const templateId = db.scalar(
      "SELECT id FROM background_templates WHERE name = 'Acolyte'",
    );
    const armorId = db.scalar(
      "SELECT id FROM armor_templates WHERE name = 'Chain Shirt'",
    );
    expect(armorId).toBeTypeOf('number');
    db.exec(
      `INSERT INTO background_equipment_items (
         background_template_id, option, sort_order, quantity, item_name,
         item_kind, armor_template_id
       ) VALUES (?, 'a', 99, 1, 'Chain Shirt', 'armor', ?)`,
      [templateId as number, armorId as number],
    );
    const stored = backgroundEquipmentPackages(db)
      .flatMap((entry) => entry.items)
      .find((item) => item.item_kind === 'armor');
    expect(stored).toMatchObject({
      item_name: 'Chain Shirt',
      item_kind: 'armor',
      armor_template_id: armorId,
      weapon_template_id: null,
      coin_copper: null,
    });
  });

  it('refuses an armour line with no armour, so the kind cannot be decorative', () => {
    const templateId = db.scalar(
      "SELECT id FROM background_templates WHERE name = 'Acolyte'",
    );
    expect(() =>
      db.exec(
        `INSERT INTO background_equipment_items (
           background_template_id, option, sort_order, quantity, item_name,
           item_kind
         ) VALUES (?, 'a', 98, 1, 'Chain Shirt', 'armor')`,
        [templateId as number],
      ),
    ).toThrow(/background_equipment_items_payload_check/u);
  });
});

describe('the seed order the weapon link now requires', () => {
  let connection: Database;

  afterEach(() => connection.close());

  it('fails LOUDLY, by name, when the weapon catalog has not been seeded', async () => {
    // `src/db/bootstrap.ts` used to say "the origins catalog references no
    // other table". That stopped being true when a background's Spear became a
    // reference to the weapon catalog's Spear, and this is the assertion that
    // makes the reordering a requirement rather than a preference.
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    expect(() => {
      seedOriginContent(db);
      // The Criminal is the first background whose package holds a weapon, so
      // its Dagger is the key that fails first.
    }).toThrow(
      /Criminal equipment names 2024:weapon:dagger, which weapon_templates does not hold/u,
    );
  });
});
