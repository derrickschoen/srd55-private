/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Seeds each class's starting-equipment packages. They are parsed from
 * `docs/srd/source/class-starting-equipment.txt` (linked against the weapon and
 * armour parses) AT BUILD TIME by `class-equipment-srd-reader.ts` and read
 * here from the generated artifact (`generated/class-equipment-srd.ts`, written
 * by `npm run srd:artifacts`). This module imports no SRD text.
 */
import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import { classEquipmentOptions } from '../domain/enums';
import { rowContractError } from '../domain/contracts/rows';
import { deepFreeze } from '../domain/deep-freeze';
import { resolveEquipmentTemplateId } from './equipment-packages';
import {
  SrdClassEquipmentError,
  type SrdClassEquipment,
} from './class-equipment-srd-reader';
import { classContentKey } from './class-progression-lookup';
import { BUNDLED_SRD_CLASS_EQUIPMENT } from './generated/class-equipment-srd';

const CLASS_EQUIPMENT: readonly SrdClassEquipment[] = deepFreeze(
  BUNDLED_SRD_CLASS_EQUIPMENT,
);

/** The twelve classes' parsed starting-equipment packages, in extract order. */
export function bundledSrdClassEquipment(): readonly SrdClassEquipment[] {
  return CLASS_EQUIPMENT;
}

export function hasBundledClassEquipment(db: DatabaseContext): boolean {
  for (const equipment of CLASS_EQUIPMENT) {
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
    for (const equipment of CLASS_EQUIPMENT) {
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
