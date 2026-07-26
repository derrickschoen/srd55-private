/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * SEEDS THE SHEET-CORE CATALOG: the per-class content of `class_sheet_traits`
 * and its four set tables, the two per-level progressions, and the thirteen
 * armour templates.
 *
 * EVERY ROW COMES FROM A PARSE. `class-traits-srd.ts`, `armor-srd.ts` and
 * `skills.ts` read `docs/srd/source/`; this module only writes what they return.
 * There is no literal here that a reviewer cannot find in an extract, which is
 * the whole reason the content is parsed rather than typed.
 *
 * ONLY CLASSES THAT ALREADY EXIST GET ROWS. The seeder joins the parsed class
 * names to `class_definitions.name` and writes nothing for a name it does not
 * find, exactly as the weapon-mastery seeder does. A class this application does
 * not carry is not invented here.
 */
import type { DatabaseContext } from '../db/database';
import {
  parseSrdClassTraits,
  parseSrdExtraAttackGrants,
  parseSrdMartialArtsDice,
  SrdClassTraitsError,
} from './class-traits-srd';
import {
  bundledArmorTemplates,
  BUNDLED_ARMOR_RULES_EDITION,
} from './armor-srd';
import { skillAbilities } from './skills';

/** The class the Martial Arts progression belongs to. */
const MARTIAL_ARTS_CLASS = 'Monk';

function sqlBool(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * True when the sheet catalog is fully present.
 *
 * COUNTED, NOT MERELY EXISTENCE-CHECKED, for the reason
 * `hasBundledWeaponContent` gives: a database holding one traits row out of
 * twelve is broken, and an existence guard would call it healthy and never
 * repair it.
 *
 * THE SET TABLES ARE CHECKED TOO, not just the traits row. A traits row is the
 * record that a class was PARSED, so counting only those would report a database
 * with all twelve traits rows and an emptied `class_skill_options` as healthy and
 * never repair it — and re-seeding is the repair, since the set tables are
 * DELETE-then-INSERT per class.
 *
 * WHICH SET TABLES, MEASURED RATHER THAN ASSUMED. Only the two that carry at
 * least one row for every one of the twelve parsed classes, plus skill options
 * conditioned on the flag that makes them legitimately empty:
 *
 *  - saving throws: exactly 2 for all twelve;
 *  - weapon proficiencies: 1 or 2 for all twelve;
 *  - skill options: 6..10 for eleven, and ZERO for the Bard, whose source
 *    prints "Choose any 3 skills" with no list — which is exactly what
 *    `skill_choice_from_any` records, so the check reads that flag rather than
 *    demanding rows the source does not print.
 *
 * `class_armor_training` is deliberately NOT checked: Monk, Sorcerer and Wizard
 * print "Armor Training: None", so zero rows is their correct content and a
 * non-empty demand would report a healthy database as broken forever. Extra
 * Attack and Martial Arts are per-class by nature and excluded for the same
 * reason.
 */
export function hasBundledSheetContent(db: DatabaseContext): boolean {
  const armor = bundledArmorTemplates();
  const placeholders = armor.map(() => '?').join(', ');
  const armorPresent = Number(
    db.scalar<number>(
      `SELECT count(*) FROM armor_templates WHERE content_key IN (${placeholders})`,
      armor.map((entry) => entry.content_key),
    ) ?? 0,
  );
  if (armorPresent !== armor.length) {
    return false;
  }

  // How many of the parsed classes this database actually carries. Compared
  // against the traits rows so a database with a partial class catalog is not
  // permanently reported unhealthy.
  const names = parseSrdClassTraits().map((traits) => traits.class_name);
  const namePlaceholders = names.map(() => '?').join(', ');
  const known = Number(
    db.scalar<number>(
      `SELECT count(*) FROM class_definitions WHERE name IN (${namePlaceholders})`,
      names,
    ) ?? 0,
  );
  if (known === 0) {
    return false;
  }
  const traitRows = Number(
    db.scalar<number>('SELECT count(*) FROM class_sheet_traits') ?? 0,
  );
  if (traitRows < known) {
    return false;
  }

  const gutted = Number(
    db.scalar<number>(
      `SELECT count(*) FROM class_sheet_traits t
        WHERE NOT EXISTS (
                SELECT 1 FROM class_saving_throw_proficiencies s
                 WHERE s.class_definition_id = t.class_definition_id)
           OR NOT EXISTS (
                SELECT 1 FROM class_weapon_proficiencies w
                 WHERE w.class_definition_id = t.class_definition_id)
           OR (t.skill_choice_from_any = 0
               AND NOT EXISTS (
                SELECT 1 FROM class_skill_options k
                 WHERE k.class_definition_id = t.class_definition_id))`,
    ) ?? 0,
  );
  return gutted === 0;
}

/** Boot-time entry point. Returns whether it wrote anything. */
export function ensureBundledSheetContent(db: DatabaseContext): boolean {
  if (hasBundledSheetContent(db)) {
    return false;
  }
  seedSheetContent(db);
  return true;
}

export function seedSheetContent(db: DatabaseContext): void {
  const timestamp = new Date().toISOString();
  db.transaction(() => {
    seedArmorTemplates(db, timestamp);
    seedClassSheetContent(db, timestamp);
  });
}

function seedArmorTemplates(db: DatabaseContext, timestamp: string): void {
  for (const armor of bundledArmorTemplates()) {
    db.exec(
      `INSERT INTO armor_templates (
         content_key, rules_edition, name, category, armor_class, dex_bonus,
         dex_bonus_max, strength_requirement, stealth_disadvantage,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_key) DO UPDATE SET
         rules_edition = excluded.rules_edition,
         name = excluded.name,
         category = excluded.category,
         armor_class = excluded.armor_class,
         dex_bonus = excluded.dex_bonus,
         dex_bonus_max = excluded.dex_bonus_max,
         strength_requirement = excluded.strength_requirement,
         stealth_disadvantage = excluded.stealth_disadvantage,
         updated_at = excluded.updated_at`,
      [
        armor.content_key,
        BUNDLED_ARMOR_RULES_EDITION,
        armor.name,
        armor.category,
        armor.armor_class,
        armor.dex_bonus,
        armor.dex_bonus_max,
        armor.strength_requirement,
        sqlBool(armor.stealth_disadvantage),
        timestamp,
        timestamp,
      ],
    );
  }
}

function seedClassSheetContent(db: DatabaseContext, timestamp: string): void {
  // Parsed here rather than at module scope so a malformed extract throws
  // inside the seeding transaction and leaves nothing half-written.
  const traits = parseSrdClassTraits();
  const extraAttacks = new Map(
    parseSrdExtraAttackGrants().map((grant) => [grant.class_name, grant.counts]),
  );
  const martialArts = parseSrdMartialArtsDice();
  // Touched so a broken Skills table fails the seed rather than failing later
  // at the first skill modifier a user asks for.
  skillAbilities();

  const classes = new Map(
    db
      .all('SELECT id, name FROM class_definitions', undefined, (row) => ({
        id: Number(row.id),
        name: String(row.name),
      }))
      .map((row) => [row.name, row.id] as const),
  );

  for (const entry of traits) {
    const classId = classes.get(entry.class_name);
    if (classId === undefined) {
      // Not an error: a database whose class catalog does not carry this class
      // simply gets no sheet content for it, and the sheet says so.
      continue;
    }

    // Set tables are REPLACED wholesale rather than upserted row by row. An
    // extract that drops a skill from a class's list must remove that row, and
    // an upsert-only seeder would leave it behind forever.
    for (const table of [
      'class_saving_throw_proficiencies',
      'class_skill_options',
      'class_armor_training',
      'class_weapon_proficiencies',
      'class_extra_attack_grants',
      'class_martial_arts_dice',
    ]) {
      db.exec(`DELETE FROM ${table} WHERE class_definition_id = ?`, [classId]);
    }

    if (entry.skill_options.length === 0 && !entry.skill_choice_from_any) {
      throw new SrdClassTraitsError(
        `${entry.class_name} parsed to no skill options and is not a choose-any class.`,
      );
    }

    db.exec(
      `INSERT INTO class_sheet_traits (
         class_definition_id, hit_die, skill_choice_count, skill_choice_from_any,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(class_definition_id) DO UPDATE SET
         hit_die = excluded.hit_die,
         skill_choice_count = excluded.skill_choice_count,
         skill_choice_from_any = excluded.skill_choice_from_any,
         updated_at = excluded.updated_at`,
      [
        classId,
        entry.hit_die,
        entry.skill_choice_count,
        sqlBool(entry.skill_choice_from_any),
        timestamp,
        timestamp,
      ],
    );

    for (const ability of entry.saving_throws) {
      db.exec(
        `INSERT INTO class_saving_throw_proficiencies (
           class_definition_id, ability, created_at, updated_at
         ) VALUES (?, ?, ?, ?)`,
        [classId, ability, timestamp, timestamp],
      );
    }
    for (const skill of entry.skill_options) {
      db.exec(
        `INSERT INTO class_skill_options (
           class_definition_id, skill, created_at, updated_at
         ) VALUES (?, ?, ?, ?)`,
        [classId, skill, timestamp, timestamp],
      );
    }
    for (const category of entry.armor_training) {
      db.exec(
        `INSERT INTO class_armor_training (
           class_definition_id, category, created_at, updated_at
         ) VALUES (?, ?, ?, ?)`,
        [classId, category, timestamp, timestamp],
      );
    }
    for (const proficiency of entry.weapon_proficiencies) {
      db.exec(
        `INSERT INTO class_weapon_proficiencies (
           class_definition_id, category, property_qualifier, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          classId,
          proficiency.category,
          proficiency.property_qualifier,
          timestamp,
          timestamp,
        ],
      );
    }

    const counts = extraAttacks.get(entry.class_name);
    if (counts !== undefined) {
      for (const [level, attacks] of [...counts].sort((a, b) => a[0] - b[0])) {
        db.exec(
          `INSERT INTO class_extra_attack_grants (
             class_definition_id, class_level, attack_count, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?)`,
          [classId, level, attacks, timestamp, timestamp],
        );
      }
    }

    if (entry.class_name === MARTIAL_ARTS_CLASS) {
      for (const [level, die] of [...martialArts].sort((a, b) => a[0] - b[0])) {
        db.exec(
          `INSERT INTO class_martial_arts_dice (
             class_definition_id, class_level, martial_arts_die, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?)`,
          [classId, level, die, timestamp, timestamp],
        );
      }
    }
  }

  // Every class the Extra Attack extract names must have been seeded. A grant
  // block for a class the traits parse did not produce means the two extracts
  // have drifted, and silently dropping it would cost a character an attack.
  for (const name of extraAttacks.keys()) {
    if (!traits.some((entry) => entry.class_name === name)) {
      throw new SrdClassTraitsError(
        `${name} grants Extra Attack but has no Core Traits block.`,
      );
    }
  }
}
