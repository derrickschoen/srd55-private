/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Class starting equipment is parsed from its dedicated, untruncated extract.
 * Package splitting and quantity semantics are shared with background
 * equipment; this module adds only the class-section grammar and exact catalog
 * linking.
 */
import classEquipmentExtract from '../../docs/srd/source/class-starting-equipment.txt?raw';
import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import {
  classEquipmentOptions,
  type ClassEquipmentOption,
} from '../domain/enums';
import { rowContractError } from '../domain/contracts/rows';
import { armorContentKey, bundledArmorTemplates } from './armor-srd';
import {
  parseEquipmentPackage,
  resolveEquipmentTemplateId,
  type EquipmentCatalogLink,
  type ParsedEquipmentItem,
} from './equipment-packages';
import { SRD_CLASS_NAMES } from './class-traits-srd';
import {
  bundledWeaponTemplates,
  weaponContentKey,
} from './weapons-srd';
import { classContentKey } from './class-progression-lookup';

export class SrdClassEquipmentError extends Error {
  constructor(message: string) {
    super(`SRD class equipment: ${message}`);
    this.name = 'SrdClassEquipmentError';
  }
}

export type SrdClassEquipmentItem =
  ParsedEquipmentItem<ClassEquipmentOption>;

export interface SrdClassEquipment {
  readonly class_name: string;
  readonly items: readonly SrdClassEquipmentItem[];
}

const SECTION = /^=== (?<className>[A-Za-z]+) Starting Equipment ===$/;
const TWO_OPTIONS =
  /^Choose A or B:\s*\(A\)\s*(?<a>.+);\s*or\s*\(B\)\s*(?<b>.+)$/u;
const THREE_OPTIONS =
  /^Choose A, B, or C:\s*\(A\)\s*(?<a>.+);\s*\(B\)\s*(?<b>.+);\s*or\s*\(C\)\s*(?<c>.+)$/u;

/**
 * Exact, case-sensitive printed-name links only.
 *
 * The lookup comes from the parsed catalogs, not a second list of weapons and
 * armour. A name occurring in both catalogs would be ambiguous and therefore
 * remains gear. Plurals such as `Javelins` and qualified names such as
 * `Druidic Focus (Quarterstaff)` do not equal a template name and remain gear.
 */
function exactCatalogLinks(): ReadonlyMap<string, EquipmentCatalogLink | null> {
  const links = new Map<string, EquipmentCatalogLink | null>();
  const add = (name: string, link: EquipmentCatalogLink): void => {
    links.set(name, links.has(name) ? null : link);
  };
  for (const weapon of bundledWeaponTemplates()) {
    add(weapon.name, {
      item_kind: 'weapon',
      content_key: weaponContentKey(weapon.name),
    });
  }
  for (const armor of bundledArmorTemplates()) {
    add(armor.name, {
      item_kind: 'armor',
      content_key: armorContentKey(armor.name),
    });
  }
  return links;
}

function parseOptions(
  className: string,
  printed: string,
  links: ReadonlyMap<string, EquipmentCatalogLink | null>,
): SrdClassEquipmentItem[] {
  const three = THREE_OPTIONS.exec(printed)?.groups;
  const two = TWO_OPTIONS.exec(printed)?.groups;
  const packages: readonly [ClassEquipmentOption, string][] =
    three === undefined
      ? two === undefined
        ? []
        : [
            ['a', two.a as string],
            ['b', two.b as string],
          ]
      : [
          ['a', three.a as string],
          ['b', three.b as string],
          ['c', three.c as string],
        ];
  if (packages.length === 0) {
    throw new SrdClassEquipmentError(
      `${className} has an unreadable equipment choice: ${printed}`,
    );
  }
  if (className === 'Fighter' ? packages.length !== 3 : packages.length !== 2) {
    throw new SrdClassEquipmentError(
      `${className} must have ${className === 'Fighter' ? 'three' : 'two'} options; found ${packages.length}.`,
    );
  }

  return packages.flatMap(([option, equipment]) =>
    parseEquipmentPackage(
      className,
      option,
      equipment.trim(),
      (name) => links.get(name) ?? null,
      (message) => new SrdClassEquipmentError(message),
    ),
  );
}

export function parseSrdClassEquipment(
  extract: string = classEquipmentExtract,
): SrdClassEquipment[] {
  const sections: SrdClassEquipment[] = [];
  const lines = extract.split('\n');
  const links = exactCatalogLinks();
  for (let index = 0; index < lines.length; index += 1) {
    const section = SECTION.exec((lines[index] ?? '').trim())?.groups;
    if (section === undefined) {
      continue;
    }
    const className = section.className as string;
    const printed = (lines[index + 1] ?? '').trim();
    if (!printed.startsWith('Choose ')) {
      throw new SrdClassEquipmentError(
        `${className} section has no equipment choice line.`,
      );
    }
    sections.push({
      class_name: className,
      items: parseOptions(className, printed, links),
    });
  }

  const actualNames = sections.map((section) => section.class_name);
  if (
    actualNames.length !== SRD_CLASS_NAMES.length ||
    actualNames.some((name, index) => name !== SRD_CLASS_NAMES[index])
  ) {
    throw new SrdClassEquipmentError(
      `extract must name ${SRD_CLASS_NAMES.join(', ')} in order; found ${actualNames.join(', ')}.`,
    );
  }
  return sections;
}

export function hasBundledClassEquipment(db: DatabaseContext): boolean {
  for (const equipment of parseSrdClassEquipment()) {
    const classId = db.scalar(
      'SELECT id FROM class_definitions WHERE content_key = ?',
      [classContentKey(equipment.class_name)],
    );
    // `seedClassProgressions` yields a name/edition collision to user content;
    // a bundled package must not attach itself to that unrelated class row.
    if (typeof classId !== 'number') {
      continue;
    }
    const rows = db.allRaw(
      `SELECT item.option, item.sort_order, item.quantity, item.item_name,
              item.item_kind, weapon.content_key AS weapon_content_key,
              armor.content_key AS armor_content_key
       FROM class_equipment_items AS item
       LEFT JOIN weapon_templates AS weapon
         ON weapon.id = item.weapon_template_id
       LEFT JOIN armor_templates AS armor
         ON armor.id = item.armor_template_id
       WHERE item.class_definition_id = ?
       ORDER BY item.option, item.sort_order`,
      [classId],
    );
    if (rows.length !== equipment.items.length) {
      return false;
    }
    for (const [index, expected] of equipment.items.entries()) {
      const actual = rows[index];
      if (
        actual === undefined ||
        actual.option !== expected.option ||
        actual.sort_order !== expected.sort_order ||
        actual.quantity !== expected.quantity ||
        actual.item_name !== expected.item_name ||
        actual.item_kind !== expected.item_kind ||
        actual.weapon_content_key !== expected.weapon_content_key ||
        actual.armor_content_key !== expected.armor_content_key
      ) {
        return false;
      }
    }
  }
  return true;
}

/** Boot-time entry point. Returns false without writing when content is whole. */
export function ensureBundledClassEquipment(db: DatabaseContext): boolean {
  if (hasBundledClassEquipment(db)) {
    return false;
  }
  seedClassEquipment(db);
  return true;
}

export function seedClassEquipment(db: DatabaseContext): void {
  const timestamp = new Date().toISOString();
  db.transaction(() => {
    for (const equipment of parseSrdClassEquipment()) {
      const classId = db.scalar(
        'SELECT id FROM class_definitions WHERE content_key = ?',
        [classContentKey(equipment.class_name)],
      );
      if (typeof classId !== 'number') {
        continue;
      }
      db.exec(
        'DELETE FROM class_equipment_items WHERE class_definition_id = ?',
        [classId],
      );
      for (const item of equipment.items) {
        const row = {
          class_definition_id: classId,
          option: item.option,
          sort_order: item.sort_order,
          quantity: item.quantity,
          item_name: item.item_name,
          item_kind: item.item_kind,
          weapon_template_id: resolveEquipmentTemplateId(
            db,
            'weapon_templates',
            item.weapon_content_key,
            equipment.class_name,
            (message) => new SrdClassEquipmentError(message),
          ),
          armor_template_id: resolveEquipmentTemplateId(
            db,
            'armor_templates',
            item.armor_content_key,
            equipment.class_name,
            (message) => new SrdClassEquipmentError(message),
          ),
          created_at: timestamp,
          updated_at: timestamp,
        };
        const contract = rowContractError(
          'class_equipment_items',
          { id: 1, ...row },
          'Bundled class_equipment_items row',
        );
        if (contract !== null) {
          throw new SrdClassEquipmentError(contract);
        }
        const columns = Object.keys(row);
        db.exec(
          `INSERT INTO class_equipment_items (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`,
          Object.values(row) as BindableValue[],
        );
      }
    }
  });
}

/** Runtime vocabulary pin used by schema/parser tests. */
export const CLASS_EQUIPMENT_OPTIONS = classEquipmentOptions;
