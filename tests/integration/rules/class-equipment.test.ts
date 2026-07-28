import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import classEquipmentExtract from '../../../docs/srd/source/class-starting-equipment.txt?raw';
import { DatabaseContext } from '../../../src/db/database';
import {
  ensureBundledClassEquipment,
  parseSrdClassEquipment,
  SrdClassEquipmentError,
} from '../../../src/rules/class-equipment-srd';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { seedWeaponContent } from '../../../src/rules/weapons-srd';
import { equipmentItemKinds } from '../../../src/domain/enums';
import { openTestDatabase } from '../../helpers/open-db';

type ExpectedItem = readonly [
  quantity: number,
  itemName: string,
  itemKind: 'gear' | 'weapon' | 'armor',
];

/**
 * Hand-enumerated from docs/srd/source/class-starting-equipment.txt. This is
 * the oracle; no value is generated from the parser under test.
 */
const EXPECTED_CLASS_EQUIPMENT: Readonly<
  Record<string, Readonly<Record<string, readonly ExpectedItem[]>>>
> = {
  Barbarian: {
    a: [
      [1, 'Greataxe', 'weapon'],
      [4, 'Handaxes', 'gear'],
      [1, 'Explorer’s Pack', 'gear'],
      [1, '15 GP', 'gear'],
    ],
    b: [[1, '75 GP', 'gear']],
  },
  Bard: {
    a: [
      [1, 'Leather Armor', 'armor'],
      [2, 'Daggers', 'gear'],
      [1, 'Musical Instrument of your choice', 'gear'],
      [1, 'Entertainer’s Pack', 'gear'],
      [1, '19 GP', 'gear'],
    ],
    b: [[1, '90 GP', 'gear']],
  },
  Cleric: {
    a: [
      [1, 'Chain Shirt', 'armor'],
      [1, 'Shield', 'armor'],
      [1, 'Mace', 'weapon'],
      [1, 'Holy Symbol', 'gear'],
      [1, 'Priest’s Pack', 'gear'],
      [1, '7 GP', 'gear'],
    ],
    b: [[1, '110 GP', 'gear']],
  },
  Druid: {
    a: [
      [1, 'Leather Armor', 'armor'],
      [1, 'Shield', 'armor'],
      [1, 'Sickle', 'weapon'],
      [1, 'Druidic Focus (Quarterstaff)', 'gear'],
      [1, 'Explorer’s Pack', 'gear'],
      [1, 'Herbalism Kit', 'gear'],
      [1, '9 GP', 'gear'],
    ],
    b: [[1, '50 GP', 'gear']],
  },
  Fighter: {
    a: [
      [1, 'Chain Mail', 'armor'],
      [1, 'Greatsword', 'weapon'],
      [1, 'Flail', 'weapon'],
      [8, 'Javelins', 'gear'],
      [1, 'Dungeoneer’s Pack', 'gear'],
      [1, '4 GP', 'gear'],
    ],
    b: [
      [1, 'Studded Leather Armor', 'armor'],
      [1, 'Scimitar', 'weapon'],
      [1, 'Shortsword', 'weapon'],
      [1, 'Longbow', 'weapon'],
      [20, 'Arrows', 'gear'],
      [1, 'Quiver', 'gear'],
      [1, 'Dungeoneer’s Pack', 'gear'],
      [1, '11 GP', 'gear'],
    ],
    c: [[1, '155 GP', 'gear']],
  },
  Monk: {
    a: [
      [1, 'Spear', 'weapon'],
      [5, 'Daggers', 'gear'],
      [
        1,
        'Artisan’s Tools or Musical Instrument chosen for the tool proficiency above',
        'gear',
      ],
      [1, 'Explorer’s Pack', 'gear'],
      [1, '11 GP', 'gear'],
    ],
    b: [[1, '50 GP', 'gear']],
  },
  Paladin: {
    a: [
      [1, 'Chain Mail', 'armor'],
      [1, 'Shield', 'armor'],
      [1, 'Longsword', 'weapon'],
      [6, 'Javelins', 'gear'],
      [1, 'Holy Symbol', 'gear'],
      [1, 'Priest’s Pack', 'gear'],
      [1, '9 GP', 'gear'],
    ],
    b: [[1, '150 GP', 'gear']],
  },
  Ranger: {
    a: [
      [1, 'Studded Leather Armor', 'armor'],
      [1, 'Scimitar', 'weapon'],
      [1, 'Shortsword', 'weapon'],
      [1, 'Longbow', 'weapon'],
      [20, 'Arrows', 'gear'],
      [1, 'Quiver', 'gear'],
      [1, 'Druidic Focus (sprig of mistletoe)', 'gear'],
      [1, 'Explorer’s Pack', 'gear'],
      [1, '7 GP', 'gear'],
    ],
    b: [[1, '150 GP', 'gear']],
  },
  Rogue: {
    a: [
      [1, 'Leather Armor', 'armor'],
      [2, 'Daggers', 'gear'],
      [1, 'Shortsword', 'weapon'],
      [1, 'Shortbow', 'weapon'],
      [20, 'Arrows', 'gear'],
      [1, 'Quiver', 'gear'],
      [1, 'Thieves’ Tools', 'gear'],
      [1, 'Burglar’s Pack', 'gear'],
      [1, '8 GP', 'gear'],
    ],
    b: [[1, '100 GP', 'gear']],
  },
  Sorcerer: {
    a: [
      [1, 'Spear', 'weapon'],
      [2, 'Daggers', 'gear'],
      [1, 'Arcane Focus (crystal)', 'gear'],
      [1, 'Dungeoneer’s Pack', 'gear'],
      [1, '28 GP', 'gear'],
    ],
    b: [[1, '50 GP', 'gear']],
  },
  Warlock: {
    a: [
      [1, 'Leather Armor', 'armor'],
      [1, 'Sickle', 'weapon'],
      [2, 'Daggers', 'gear'],
      [1, 'Arcane Focus (orb)', 'gear'],
      [1, 'Book (occult lore)', 'gear'],
      [1, 'Scholar’s Pack', 'gear'],
      [1, '15 GP', 'gear'],
    ],
    b: [[1, '100 GP', 'gear']],
  },
  Wizard: {
    a: [
      [2, 'Daggers', 'gear'],
      [1, 'Arcane Focus (Quarterstaff)', 'gear'],
      [1, 'Robe', 'gear'],
      [1, 'Spellbook', 'gear'],
      [1, 'Scholar’s Pack', 'gear'],
      [1, '5 GP', 'gear'],
    ],
    b: [[1, '55 GP', 'gear']],
  },
};

function parserPackages(): Readonly<
  Record<string, Readonly<Record<string, readonly ExpectedItem[]>>>
> {
  return Object.fromEntries(
    parseSrdClassEquipment().map((equipment) => [
      equipment.class_name,
      Object.fromEntries(
        [...new Set(equipment.items.map((item) => item.option))].map(
          (option) => [
            option,
            equipment.items
              .filter((item) => item.option === option)
              .map(
                (item) =>
                  [item.quantity, item.item_name, item.item_kind] as const,
              ),
          ],
        ),
      ),
    ]),
  );
}

describe('SRD class starting equipment parser and seed', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedWeaponContent(db);
    seedSheetContent(db);
  });

  afterEach(() => connection.close());

  it('enumerates every class, every option, and every item against the extract', () => {
    expect(parserPackages()).toEqual(EXPECTED_CLASS_EQUIPMENT);
  });

  it('keeps all three Fighter options and the exact load-bearing quantities', () => {
    expect(Object.keys(parserPackages().Fighter ?? {})).toEqual(['a', 'b', 'c']);
    expect(parserPackages().Fighter?.a?.[3]).toEqual([
      8,
      'Javelins',
      'gear',
    ]);
    expect(parserPackages().Fighter?.b?.[4]).toEqual([
      20,
      'Arrows',
      'gear',
    ]);
  });

  it('rejects a printed numeric form it cannot parse instead of inventing quantity one', () => {
    const unreadable = classEquipmentExtract.replace(
      '8 Javelins',
      '8Javelins',
    );
    expect(unreadable).not.toBe(classEquipmentExtract);
    expect(() => parseSrdClassEquipment(unreadable)).toThrow(
      new SrdClassEquipmentError(
        'Fighter equipment option A has an unreadable quantity: 8Javelins',
      ),
    );
  });

  it('seeds the enumerated packages exactly', () => {
    expect(ensureBundledClassEquipment(db)).toBe(true);
    const rows = db.allRaw(
      `SELECT class.name AS class_name, item.option, item.sort_order,
              item.quantity, item.item_name, item.item_kind
       FROM class_equipment_items AS item
       JOIN class_definitions AS class
         ON class.id = item.class_definition_id
       ORDER BY class.id, item.option, item.sort_order`,
    );
    const actual = Object.fromEntries(
      Object.keys(EXPECTED_CLASS_EQUIPMENT).map((className) => [
        className,
        Object.fromEntries(
          Object.keys(EXPECTED_CLASS_EQUIPMENT[className] ?? {}).map(
            (option) => [
              option,
              rows
                .filter(
                  (row) =>
                    row.class_name === className && row.option === option,
                )
                .map(
                  (row) =>
                    [
                      Number(row.quantity),
                      String(row.item_name),
                      String(row.item_kind),
                    ] as const,
                ),
            ],
          ),
        ),
      ]),
    );
    expect(actual).toEqual(EXPECTED_CLASS_EQUIPMENT);
  });

  it('makes every exact link a real template reference and leaves non-exact names as gear', () => {
    ensureBundledClassEquipment(db);
    const linked = db.allRaw(
      `SELECT item.item_name, item.item_kind,
              weapon.name AS weapon_name, armor.name AS armor_name
       FROM class_equipment_items AS item
       LEFT JOIN weapon_templates AS weapon
         ON weapon.id = item.weapon_template_id
       LEFT JOIN armor_templates AS armor
         ON armor.id = item.armor_template_id
       WHERE item.item_kind <> 'gear'
       ORDER BY item.id`,
    );
    expect(linked.length).toBeGreaterThan(0);
    for (const row of linked) {
      const resolved =
        row.item_kind === 'weapon' ? row.weapon_name : row.armor_name;
      expect(resolved, String(row.item_name)).toBe(row.item_name);
    }
    for (const printedName of [
      'Handaxes',
      'Daggers',
      'Javelins',
      'Druidic Focus (Quarterstaff)',
      'Arcane Focus (Quarterstaff)',
    ]) {
      expect(
        db.allRaw(
          `SELECT item_kind, weapon_template_id, armor_template_id
           FROM class_equipment_items WHERE item_name = ?`,
          [printedName],
        ),
        printedName,
      ).toEqual(
        expect.arrayContaining([
          {
            item_kind: 'gear',
            weapon_template_id: null,
            armor_template_id: null,
          },
        ]),
      );
    }
  });

  it('stores every money line as printed gear and has no coin kind', () => {
    ensureBundledClassEquipment(db);
    const money = db.allRaw(
      `SELECT item_name, item_kind, quantity
       FROM class_equipment_items
       WHERE item_name LIKE '% GP'
       ORDER BY id`,
    );
    expect(money.map((row) => row.item_name)).toEqual([
      '15 GP',
      '75 GP',
      '19 GP',
      '90 GP',
      '7 GP',
      '110 GP',
      '9 GP',
      '50 GP',
      '4 GP',
      '11 GP',
      '155 GP',
      '11 GP',
      '50 GP',
      '9 GP',
      '150 GP',
      '7 GP',
      '150 GP',
      '8 GP',
      '100 GP',
      '28 GP',
      '50 GP',
      '15 GP',
      '100 GP',
      '5 GP',
      '55 GP',
    ]);
    expect(money.every((row) => row.item_kind === 'gear')).toBe(true);
    expect(money.every((row) => row.quantity === 1)).toBe(true);
    expect(equipmentItemKinds).toEqual(['gear', 'weapon', 'armor']);
    expect(equipmentItemKinds).not.toContain('coin');
  });

  it('is a no-op on the second ensure, preserving row ids and timestamps', () => {
    expect(ensureBundledClassEquipment(db)).toBe(true);
    const before = db.allRaw(
      `SELECT * FROM class_equipment_items
       ORDER BY class_definition_id, option, sort_order`,
    );
    expect(ensureBundledClassEquipment(db)).toBe(false);
    expect(
      db.allRaw(
        `SELECT * FROM class_equipment_items
         ORDER BY class_definition_id, option, sort_order`,
      ),
    ).toEqual(before);
  });

  it('repairs a missing Fighter C even when the total row count is unchanged', () => {
    ensureBundledClassEquipment(db);
    const beforeCount = db.scalar<number>(
      'SELECT count(*) FROM class_equipment_items',
    );
    db.exec(
      `UPDATE class_equipment_items
       SET option = 'b', sort_order = 9
       WHERE class_definition_id = (
         SELECT id FROM class_definitions WHERE name = 'Fighter'
       ) AND option = 'c'`,
    );
    expect(
      db.scalar<number>('SELECT count(*) FROM class_equipment_items'),
    ).toBe(beforeCount);
    expect(
      db.scalar<number>(
        `SELECT count(*)
         FROM class_equipment_items AS item
         JOIN class_definitions AS class
           ON class.id = item.class_definition_id
         WHERE class.name = 'Fighter' AND item.option = 'c'`,
      ),
    ).toBe(0);

    expect(ensureBundledClassEquipment(db)).toBe(true);
    expect(
      db.allRaw(
        `SELECT item.option, item.item_name
         FROM class_equipment_items AS item
         JOIN class_definitions AS class
           ON class.id = item.class_definition_id
         WHERE class.name = 'Fighter' AND item.option = 'c'`,
      ),
    ).toEqual([{ option: 'c', item_name: '155 GP' }]);
  });
});
