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
import { backgroundEquipmentItemKinds } from '../../../src/domain/enums';
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

  it('has only the three live item kinds in its runtime vocabulary', () => {
    expect(backgroundEquipmentItemKinds).toEqual([
      'gear',
      'weapon',
      'armor',
    ]);
    expect(backgroundEquipmentItemKinds).not.toContain('coin');
  });

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

    // A leading numeral IS the count of the named item, AND IT IS STORED ONCE.
    // `2 Daggers` is two of `Daggers`, not two of `2 Daggers` — a name that
    // keeps the printed numeral states the count in both columns, and a
    // renderer trusting both prints `2 Daggers (×2)`. The printed line is
    // not lost: `background_templates.equipment_option_a` holds it verbatim.
    expect(criminal[0]).toMatchObject({ item_name: 'Daggers', quantity: 2 });
    expect(criminal[3]).toMatchObject({ item_name: 'Pouches', quantity: 2 });
    expect(soldier[2]).toMatchObject({ item_name: 'Arrows', quantity: 20 });

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
    // its printed PLURAL as the name — only the count moves to `quantity` —
    // and `Daggers` resolves to the singular `Dagger` template, which is why
    // the link is DECLARED and not name-matched (D15).
    const linked = backgroundEquipmentPackages(db)
      .flatMap((entry) => entry.items)
      .filter((item) => item.item_kind === 'weapon');
    expect(linked.map((item) => item.item_name).sort()).toEqual([
      'Daggers',
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
        linked.find((item) => item.item_name === 'Daggers')
          ?.weapon_template_id ?? -1,
      ]),
    ).toBe('Dagger');
  });

  it('records every printed money line as ordinary gear text', () => {
    // D40: the amount is the whole item name, like a bedroll. It is not a
    // quantity of GP and carries no second numeric money representation.
    for (const background of ['Acolyte', 'Criminal', 'Sage', 'Soldier']) {
      const optionB = packageFor(background, 'b').items;
      expect(optionB, background).toHaveLength(1);
      expect(optionB[0], background).toMatchObject({
        item_name: '50 GP',
        item_kind: 'gear',
        quantity: 1,
      });
    }
    expect(packageFor('Criminal', 'a').items.at(-1)).toMatchObject({
      item_name: '16 GP',
      item_kind: 'gear',
    });
    expect(packageFor('Soldier', 'a').items.at(-1)).toMatchObject({
      item_name: '14 GP',
      item_kind: 'gear',
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
    // ONE COUNT, NOT TWO. This read `2 Daggers (×2) — weapon` while the
    // parser kept the printed numeral in the name as well as in `quantity`.
    expect(
      describeBackgroundEquipmentItem(packageFor('Criminal', 'a').items[0]!),
    ).toBe('Daggers (×2) — weapon');
    expect(
      describeBackgroundEquipmentItem(packageFor('Sage', 'b').items[0]!),
    ).toBe('50 GP');
    expect(
      describeBackgroundEquipmentItem({
        option: 'a',
        sort_order: 1,
        quantity: 1,
        item_name: 'Chain Shirt',
        item_kind: 'armor',
        weapon_template_id: null,
        armor_template_id: 7,
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

  /**
   * THE TOLERANT DROP, PINNED RATHER THAN MERELY STATED.
   *
   * `backgroundEquipmentPackages` promises in its own docblock that a row whose
   * `option` or `item_kind` is outside its vocabulary is DROPPED rather than
   * carried into a typed result. D34 §1 is the record of exactly this shape
   * going wrong one method over: a docblock that STATES a degradation reads
   * like a guarantee, and the guard was neutered with the whole suite green.
   *
   * WHY THE TABLE IS REBUILT INSTEAD OF JUST WRITING A `tool`. The CHECK refuses
   * one, which is F11's point — a CHECK constrains no image created before it
   * existed and no hand-edited one, and this table's CHECKs are younger than
   * every database a user might still be carrying. The rebuilt table IS that
   * pre-CHECK image, and it is the only state in which the reader's guard is
   * reachable at all. Only what this test reads is recreated.
   */
  it('DROPS a row whose kind or option is outside the vocabulary, on a pre-CHECK image', () => {
    const templateId = db.scalar(
      "SELECT id FROM background_templates WHERE name = 'Acolyte'",
    ) as number;
    const before = backgroundEquipmentPackages(db).flatMap(
      (entry) => entry.items,
    ).length;
    db.exec(
      `ALTER TABLE background_equipment_items RENAME TO background_equipment_items_checked;
       CREATE TABLE background_equipment_items (
         id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
         background_template_id integer NOT NULL,
         option VARCHAR NOT NULL,
         sort_order integer NOT NULL,
         quantity integer NOT NULL,
         item_name VARCHAR NOT NULL,
         item_kind VARCHAR NOT NULL,
         weapon_template_id integer,
         armor_template_id integer,
         created_at DATETIME,
         updated_at DATETIME
       );
       INSERT INTO background_equipment_items
         SELECT * FROM background_equipment_items_checked;
       DROP TABLE background_equipment_items_checked;`,
    );
    db.exec(
      `INSERT INTO background_equipment_items (
         background_template_id, option, sort_order, quantity, item_name, item_kind
       ) VALUES (?, 'a', 90, 1, 'Thieves’ Tools', 'tool'),
               (?, 'c', 91, 1, 'Signal Whistle', 'gear')`,
      [templateId, templateId],
    );
    // Both corrupt rows really are there — otherwise this test would pass by
    // measuring nothing.
    expect(
      db.scalar(
        `SELECT COUNT(*) FROM background_equipment_items
          WHERE item_kind = 'tool' OR option = 'c'`,
      ),
    ).toBe(2);

    const items = backgroundEquipmentPackages(db).flatMap(
      (entry) => entry.items,
    );
    expect(items).toHaveLength(before);
    expect(items.map((item) => item.item_name)).not.toContain(
      'Signal Whistle',
    );
    expect(
      items.filter((item) => item.item_name === 'Thieves’ Tools'),
    ).toHaveLength(1);
    // The dropped `c` row does not mint a package of its own either — an
    // option outside the vocabulary must not become a third package heading.
    expect(
      backgroundEquipmentPackages(db).map((entry) => entry.option),
    ).not.toContain('c');
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
