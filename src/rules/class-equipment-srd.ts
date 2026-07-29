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
 * WHICH PRINTED PLURAL BUNDLES ARE WEAPONS, DECLARED RATHER THAN MATCHED —
 * the class-side mirror of `DECLARED_WEAPON_EQUIPMENT` in `origins-srd.ts`
 * (starting-equipment plan §0b).
 *
 * D15 REFUSED DECIDING A MECHANICAL FACT BY MATCHING TEXT, and the background
 * side has already applied that refusal to THIS EXACT problem: a
 * strip-the-`s`-and-look-it-up resolver is a rule about spelling standing in
 * for a rule about weapons. So the plural links are written down. Before this
 * map existed, `parseEquipmentEntry` stripped the count, missed the plural in
 * the catalog, and fell through to `gear` — which seeded a catalog in which
 * **Bard option A mints zero weapons** and every 2-Daggers class loses its
 * actual weapons, wrong against the data while correct against the schema.
 *
 * THE THREE ENTRIES ARE THE EXTRACT'S OWN PLURALS, counted in
 * `docs/srd/source/class-starting-equipment.txt`: `Daggers` ("2 Daggers" ×5,
 * "5 Daggers"), `Handaxes` ("4 Handaxes"), `Javelins` ("8 Javelins",
 * "6 Javelins") — nine lines across the class list.
 *
 * NO DECLARED ENTRY MEANS THE ROW REMAINS GEAR, and that is pinned, not an
 * accident: `20 Arrows` (Fighter B, Ranger A, Rogue A) has the identical
 * printed shape and `Arrow` is NOT a weapon template — ammunition is not
 * tracked as a weapon — so it stays gear, as do `Quiver` and
 * `Druidic Focus (Quarterstaff)`, a qualified name that is not an item name.
 *
 * `assertClassEquipmentLinksAreExercised` checks the declared direction
 * against every parse, exactly as the background guard does: an entry the
 * extract stops printing throws by name instead of quietly becoming a no-op.
 *
 * A `Map` rather than an object literal, for the reason the background map
 * gives: these keys come from a parsed document.
 */
const DECLARED_WEAPON_EQUIPMENT = new Map<string, string>([
  ['Daggers', 'Dagger'],
  ['Handaxes', 'Handaxe'],
  ['Javelins', 'Javelin'],
]);

/**
 * Exact, case-sensitive printed-name links, LAYERED with the declared plural
 * map above.
 *
 * The exact lookup comes from the parsed catalogs, not a second list of
 * weapons and armour. A name occurring in both catalogs would be ambiguous
 * and therefore remains gear. Qualified names such as
 * `Druidic Focus (Quarterstaff)` do not equal a template name and remain
 * gear. Plurals are NOT resolved here — they resolve only through
 * `DECLARED_WEAPON_EQUIPMENT`, consulted second, so a declared plural can
 * never shadow a real printed template name.
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
  // The declared plural bundles, second: a printed name the catalog already
  // links exactly must keep its exact link, and a declared plural colliding
  // with a catalog name would be the ambiguity the null sentinel records.
  for (const [printed, weapon] of DECLARED_WEAPON_EQUIPMENT) {
    if (!links.has(printed)) {
      links.set(printed, {
        item_kind: 'weapon',
        content_key: weaponContentKey(weapon),
      });
    }
  }
  return links;
}

/**
 * EVERY DECLARED PLURAL LINK MUST BE PRODUCED BY THE PARSE — the mirror of
 * `assertEquipmentLinksAreExercised` in `origins-srd.ts`, and for the same
 * reason: a hand-written declaration the extract no longer prints is a silent
 * no-op, and a silent no-op in a seeder writes a catalog that looks complete.
 * If the extract is re-cut and `Javelins` moves or changes spelling, this
 * throws by name instead of quietly producing a `gear` row — and a silently
 * disarmed Barbarian.
 */
function assertClassEquipmentLinksAreExercised(
  sections: readonly SrdClassEquipment[],
): void {
  const weaponItemNames = new Set<string>();
  for (const section of sections) {
    for (const item of section.items) {
      if (item.item_kind === 'weapon') {
        weaponItemNames.add(item.item_name);
      }
    }
  }
  for (const [printed] of DECLARED_WEAPON_EQUIPMENT) {
    if (!weaponItemNames.has(printed)) {
      throw new SrdClassEquipmentError(
        `declared weapon equipment names ${printed}, which no class package prints.`,
      );
    }
  }
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
  assertClassEquipmentLinksAreExercised(sections);
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
