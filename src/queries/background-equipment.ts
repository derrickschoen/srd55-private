import { sqlInteger, sqlNullableInteger, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  equipmentItemKinds,
  backgroundEquipmentOptions,
  isEnumValue,
  type EquipmentItemKind,
  type BackgroundEquipmentOption,
} from '../domain/enums';

/**
 * THE STRUCTURED EQUIPMENT PACKAGES OF THE BUNDLED BACKGROUND CATALOG.
 *
 * WHAT THIS DOES *NOT* DO, SAID FIRST, BECAUSE IT IS THE HONEST LIMIT OF THIS
 * WHOLE INCREMENT: it does not put an item on a character. Nothing in this
 * repository copies a background template onto a character — the species side
 * has `speciesFromTemplate` and the background side has never had an
 * equivalent, and the only production writer of
 * `character_background.equipment_option_a` is SHARE IMPORT. The owner's ruling
 * says *"templates"*, so templates are what was built; the copy path is the
 * named gap.
 *
 * NEITHER EXPORT HAS A PRODUCTION IMPORTER, AND IT IS SAID HERE RATHER THAN
 * LEFT TO BE DISCOVERED. `grep -rn 'queries/background-equipment' src/` finds
 * nothing; the only caller is
 * `tests/integration/rules/background-equipment.test.ts`, and nothing from this
 * module reaches `dist`. The module is written AHEAD of its caller — which also
 * means the dist-clean build gate cannot see a defect in it, and one got past
 * that way (F18).
 *
 * WHAT IT IS FOR TODAY is being the reader that makes `item_kind` a decision
 * rather than a stored word. `describeBackgroundEquipmentItem` switches over the
 * kind EXHAUSTIVELY with no `default` arm, so a fifth kind cannot be added to
 * `equipmentItemKinds` without this file refusing to compile — which
 * is the D12 mechanism that makes "adding a KIND is a deliberate change" true
 * rather than aspirational. That half is a COMPILE-time fact and needs no
 * caller; the RUNTIME half — the tolerant drop below — does, and it is pinned
 * by a test that rebuilds the table without its CHECKs rather than merely
 * described (D34 §1).
 */
export interface BackgroundEquipmentItem {
  readonly option: BackgroundEquipmentOption;
  readonly sort_order: number;
  readonly quantity: number;
  readonly item_name: string;
  readonly item_kind: EquipmentItemKind;
  readonly weapon_template_id: number | null;
  readonly armor_template_id: number | null;
}

export interface BackgroundEquipmentPackage {
  readonly background_content_key: string;
  readonly background_name: string;
  readonly option: BackgroundEquipmentOption;
  readonly items: readonly BackgroundEquipmentItem[];
}

/**
 * ONE LINE AS A SENTENCE.
 *
 * THE SWITCH IS EXHAUSTIVE AND HAS NO `default` ARM. Each arm says what this
 * application actually knows about the line, and no arm invents anything:
 *
 *  - `weapon` and `armor` say that the line RESOLVES to a catalog row, which is
 *    the whole content of "unless weapon or armor";
 *  - `gear` says nothing beyond the name, which is "name only", and is correct.
 *
 * A quantity of 1 prints no count. `1 Robe` is not how the source writes it and
 * not how a player reads it.
 */
export function describeBackgroundEquipmentItem(
  item: BackgroundEquipmentItem,
): string {
  const counted =
    item.quantity === 1
      ? item.item_name
      : `${item.item_name} (×${String(item.quantity)})`;
  switch (item.item_kind) {
    case 'gear':
      return counted;
    case 'weapon':
      return `${counted} — weapon`;
    case 'armor':
      return `${counted} — armour`;
  }
}

/**
 * Every bundled background's two packages, ordered as printed.
 *
 * TOLERANT ON THE WAY OUT, per D11 part 2: a row whose `option` or `item_kind`
 * is not a member of its vocabulary is DROPPED rather than thrown on. Both
 * columns carry a CHECK, so this is reachable only from an image whose CHECKs
 * were never applied — F11's point — and a reader that threw there would make
 * the whole background catalog unreadable over one bad row.
 */
export function backgroundEquipmentPackages(
  db: DatabaseContext,
): BackgroundEquipmentPackage[] {
  const rows = db.all(
    `SELECT template.content_key AS background_content_key,
            template.name AS background_name,
            item.option, item.sort_order, item.quantity, item.item_name,
            item.item_kind, item.weapon_template_id, item.armor_template_id
     FROM background_equipment_items AS item
     JOIN background_templates AS template
       ON template.id = item.background_template_id
     ORDER BY template.name, item.option, item.sort_order`,
    undefined,
    (row) => ({
      background_content_key: sqlString(row, 'background_content_key'),
      background_name: sqlString(row, 'background_name'),
      option: sqlString(row, 'option'),
      sort_order: sqlInteger(row, 'sort_order'),
      quantity: sqlInteger(row, 'quantity'),
      item_name: sqlString(row, 'item_name'),
      item_kind: sqlString(row, 'item_kind'),
      weapon_template_id: sqlNullableInteger(row, 'weapon_template_id'),
      armor_template_id: sqlNullableInteger(row, 'armor_template_id'),
    }),
  );

  const packages: BackgroundEquipmentPackage[] = [];
  const items = new Map<string, BackgroundEquipmentItem[]>();
  for (const row of rows) {
    if (
      !isEnumValue(backgroundEquipmentOptions, row.option) ||
      !isEnumValue(equipmentItemKinds, row.item_kind)
    ) {
      continue;
    }
    const key = `${row.background_content_key}\u0000${row.option}`;
    let bucket = items.get(key);
    if (bucket === undefined) {
      bucket = [];
      items.set(key, bucket);
      packages.push({
        background_content_key: row.background_content_key,
        background_name: row.background_name,
        option: row.option,
        items: bucket,
      });
    }
    bucket.push({
      option: row.option,
      sort_order: row.sort_order,
      quantity: row.quantity,
      item_name: row.item_name,
      item_kind: row.item_kind,
      weapon_template_id: row.weapon_template_id,
      armor_template_id: row.armor_template_id,
    });
  }
  return packages;
}
