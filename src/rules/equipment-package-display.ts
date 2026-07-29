import type { DatabaseContext } from '../db/database';
import type { EquipmentItemKind } from '../domain/enums';
import { equipmentItemKinds, isEnumValue } from '../domain/enums';
import { isEquipmentMoneyLine } from './equipment-packages';

/**
 * READ-TIME VIEWS OF THE SEEDED EQUIPMENT PACKAGES — dispatch E-B of
 * `docs/design/2026-07-29-starting-equipment.md` (§0c, §3.4, §4, §7).
 *
 * The rules tables (`class_equipment_items`, `background_equipment_items`)
 * are the ONLY source these functions read: gear renders from them at read
 * time and is never owned (D65), so the equipment step and the sheet both
 * come here rather than growing private copies of the option grammar.
 *
 * TWO FILTERS, TWO CODE PATHS, DELIBERATELY (plan §6). Revision 2 had them
 * as one control and the second half was unfalsifiable by the first's
 * mutation:
 *
 *  - {@link offerableEquipmentPackageOptions} decides WHICH OPTIONS the step
 *    presents — a gold-only option ("75 GP", every background's option B) is
 *    never offered, because D56 removed the gold path from the product;
 *  - {@link displayableEquipmentLines} decides WHAT AN OFFERED OPTION SHOWS —
 *    an in-package coin line ("and 4 GP" at the end of Fighter A) is a gear
 *    row the seed legitimately carries, and rendering it would show a purse
 *    §3 says we never grant.
 *
 * Both recognise coin lines through the parser's own exported predicate, so
 * the seed-time classification and the read-time filters cannot drift.
 */

/** One seeded package line, as the rules tables carry it. */
export interface EquipmentPackageLine {
  readonly item_name: string;
  readonly quantity: number;
  readonly item_kind: EquipmentItemKind;
}

/** One printed option: its letter and its seeded lines, in printed order. */
export interface EquipmentPackageOption {
  readonly option: string;
  readonly lines: readonly EquipmentPackageLine[];
}

/**
 * Every seeded option for one class or background, grouped by letter and
 * ordered as printed. An owner the tables do not know — a homebrew class, an
 * imported background — yields the empty list rather than a throw: read-time
 * display must not make a character unopenable, and "no bundled package"
 * is a true statement about such an owner.
 */
export function readEquipmentPackageOptions(
  db: DatabaseContext,
  kind: 'class' | 'background',
  contentKey: string,
): readonly EquipmentPackageOption[] {
  const [table, ownerColumn, ownerId] =
    kind === 'class'
      ? [
          'class_equipment_items',
          'class_definition_id',
          db.scalar('SELECT id FROM class_definitions WHERE content_key = ?', [
            contentKey,
          ]),
        ]
      : [
          'background_equipment_items',
          'background_template_id',
          db.scalar(
            'SELECT id FROM background_templates WHERE content_key = ?',
            [contentKey],
          ),
        ];
  if (typeof ownerId !== 'number') {
    return [];
  }
  const rows = db.allRaw(
    `SELECT option, item_name, quantity, item_kind
     FROM ${table}
     WHERE ${ownerColumn} = ?
     ORDER BY option, sort_order`,
    [ownerId],
  );
  const grouped = new Map<string, EquipmentPackageLine[]>();
  for (const row of rows) {
    const option = String(row.option);
    const kindValue = String(row.item_kind);
    if (!isEnumValue(equipmentItemKinds, kindValue)) {
      throw new Error(
        `Equipment item "${String(row.item_name)}" carries unknown ` +
          `item_kind "${kindValue}".`,
      );
    }
    const lines = grouped.get(option) ?? [];
    lines.push({
      item_name: String(row.item_name),
      quantity: Number(row.quantity),
      item_kind: kindValue,
    });
    grouped.set(option, lines);
  }
  return [...grouped.entries()].map(([option, lines]) => ({ option, lines }));
}

/**
 * THE GOLD-ONLY OPTION FILTER (D56, plan §0c) — the E-NO-GOLD-OFFERED site.
 *
 * Every class's last printed option is bare GP and every background's option
 * B is "50 GP"; none of them is offered. Once they are suppressed, 11 of 12
 * classes and every background have exactly ONE offerable option and the
 * step is a confirmation, not a choice — Fighter (A and B) is the only class
 * where two survive. An option with no lines at all is not "gold-only"; it
 * simply does not exist in the read above.
 */
export function offerableEquipmentPackageOptions(
  options: readonly EquipmentPackageOption[],
): readonly EquipmentPackageOption[] {
  return options.filter(
    (candidate) =>
      !candidate.lines.every((line) => isEquipmentMoneyLine(line.item_name)),
  );
}

/**
 * THE COIN-LINE DISPLAY FILTER (D56, plan §0c) — the E-NO-GOLD-SHOWN site.
 *
 * An offered option's trailing coin line ("4 GP" in Fighter A, "11 GP" in
 * Fighter B) is a seeded gear row and must not render: §4's sheet and the
 * step's contents list would otherwise both show a purse that §3 says is
 * never granted. Everything else — including gear, which is displayed but
 * never owned — passes through unchanged.
 */
export function displayableEquipmentLines(
  lines: readonly EquipmentPackageLine[],
): readonly EquipmentPackageLine[] {
  return lines.filter((line) => !isEquipmentMoneyLine(line.item_name));
}
