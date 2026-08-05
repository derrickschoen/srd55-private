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
import { normalizeContentIdentityName } from '../catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../catalog/content-registry';
import { encodePrimaryAbilityExpression } from '../domain/primary-ability';
import {
  parseSrdClassTraits,
  parseSrdExtraAttackGrants,
  parseSrdMartialArtsDice,
  SrdClassTraitsError,
} from './class-traits-srd';
import {
  multiclassSkillColumns,
  parseSrdMulticlassEntryGrants,
  SrdMulticlassEntryError,
} from './multiclass-entry-srd';
import {
  bundledArmorTemplates,
  BUNDLED_ARMOR_RULES_EDITION,
} from './armor-srd';
import {
  parseSrdNamedExtraAttackFeatures,
  BUNDLED_FEATURE_RULES_EDITION,
} from './extra-attack-srd';
import { skillAbilities } from './skills';
import {
  parseSrdUnarmoredDefenseFeatures,
  type SrdUnarmoredDefenseFeature,
} from './unarmored-defense-srd';

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

  if (!hasBundledNamedFeatures(db)) {
    return false;
  }

  if (!hasBundledClassFeatureEffects(db)) {
    return false;
  }

  // How many of the parsed classes this database actually carries. Compared
  // against the traits rows so a database with a partial class catalog is not
  // permanently reported unhealthy.
  const parsedTraits = parseSrdClassTraits();
  const names = parsedTraits.map((traits) => traits.class_name);
  const namePlaceholders = names.map(() => '?').join(', ');
  const known = Number(
    db.scalar<number>(
      `SELECT count(*) FROM class_definitions
        WHERE rules_edition = ?
          AND name IN (${namePlaceholders})`,
      [BUNDLED_FEATURE_RULES_EDITION, ...names],
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

  const storedPrimaryAbilities = new Map(
    db.all(
      `SELECT name, primary_ability_expression
         FROM class_definitions
        WHERE rules_edition = ?
          AND name IN (${namePlaceholders})`,
      [BUNDLED_FEATURE_RULES_EDITION, ...names],
      (row) => [
        String(row.name),
        row.primary_ability_expression === null
          ? null
          : String(row.primary_ability_expression),
      ] as const,
    ),
  );
  for (const traits of parsedTraits) {
    const stored = storedPrimaryAbilities.get(traits.class_name);
    if (
      stored !== undefined &&
      stored !==
        encodePrimaryAbilityExpression(
          traits.primary_ability_expression,
        )
    ) {
      return false;
    }
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
  if (gutted !== 0) {
    return false;
  }
  return hasBundledMulticlassEntryGrants(db);
}

/**
 * True when every class's MULTICLASS ENTRY subset is exactly what the extract
 * says.
 *
 * A COUNT WOULD NOT DO HERE, and this is the `hasBundledNamedFeatures` argument
 * rather than the `class_armor_training` one. Nine of twelve classes grant no
 * entry skill and three grant no entry armour at all, so "at least one flagged
 * row" is false for correct content and a non-empty demand would report a
 * healthy database as broken forever. But the VALUES are exact — the Barbarian
 * flags Shields and not Light — and a database in which every flag defaulted to
 * 0 would pass every existence check while telling a Fighter/Barbarian they have
 * no shield training. So the flagged SETS are compared, member for member.
 *
 * Three queries over the whole catalog rather than three per class: twelve
 * classes times three round trips on every boot is a cost this check does not
 * need to pay to say the same thing.
 *
 * SILENT ON A CLASS THIS DATABASE DOES NOT CARRY, exactly as the seeder is: a
 * name with no `class_definitions` row simply has no rows to compare.
 */
function hasBundledMulticlassEntryGrants(db: DatabaseContext): boolean {
  const classes = classIdsByName(db);
  const flagged = (table: string): Map<number, Set<string>> => {
    const found = new Map<number, Set<string>>();
    for (const row of db.all(
      `SELECT class_definition_id, category FROM ${table}
        WHERE granted_on_multiclass_entry = 1`,
      undefined,
      (entry) => ({
        classId: Number(entry.class_definition_id),
        category: String(entry.category),
      }),
    )) {
      const set = found.get(row.classId) ?? new Set<string>();
      set.add(row.category);
      found.set(row.classId, set);
    }
    return found;
  };
  const armor = flagged('class_armor_training');
  const weapons = flagged('class_weapon_proficiencies');
  const skills = new Map(
    db
      .all(
        `SELECT class_definition_id, multiclass_skill_choice_count,
                multiclass_skill_choice_pool
           FROM class_sheet_traits`,
        undefined,
        (row) => ({
          classId: Number(row.class_definition_id),
          count: Number(row.multiclass_skill_choice_count),
          pool: String(row.multiclass_skill_choice_pool),
        }),
      )
      .map((row) => [row.classId, row] as const),
  );

  for (const grant of parseSrdMulticlassEntryGrants()) {
    const classId = classes.get(grant.class_name);
    if (classId === undefined) {
      continue;
    }
    if (
      !sameMembers(armor.get(classId), grant.armor_categories) ||
      !sameMembers(weapons.get(classId), grant.weapon_categories)
    ) {
      return false;
    }
    const stored = skills.get(classId);
    const expected = multiclassSkillColumns(grant.skill_choice);
    if (
      stored === undefined ||
      stored.count !== expected.count ||
      stored.pool !== expected.pool
    ) {
      return false;
    }
  }
  return true;
}

/** Set equality, treating an absent set as the empty one. */
function sameMembers(
  stored: ReadonlySet<string> | undefined,
  expected: readonly string[],
): boolean {
  const held = stored ?? new Set<string>();
  return (
    held.size === expected.length && expected.every((value) => held.has(value))
  );
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
    seedClassFeatureEffects(db, timestamp);
    seedNamedFeatures(db, timestamp);
  });
}

function seedArmorTemplates(db: DatabaseContext, timestamp: string): void {
  for (const armor of bundledArmorTemplates()) {
    ensureBundledStableContentIdentity(db, {
      kind: 'armor',
      contentKey: armor.content_key,
      normalizedName: normalizeContentIdentityName(armor.name),
    });
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
  // THE ENTRY GRANTS ARE PARSED HERE, INSIDE THE TRANSACTION, AND CHECKED
  // AGAINST `traits` AS THEY ARE PARSED. `parseSrdMulticlassEntryGrants` throws
  // if any class's entry grant names an armour category or a weapon category its
  // own Core Traits row does not have — which is the invariant the per-row flag
  // depends on, since a category with no row has nothing to flag and would be
  // silently dropped rather than loudly refused.
  const entryGrants = new Map(
    parseSrdMulticlassEntryGrants(undefined, traits).map((grant) => [
      grant.class_name,
      grant,
    ]),
  );
  const extraAttacks = new Map(
    parseSrdExtraAttackGrants().map((grant) => [grant.class_name, grant.counts]),
  );
  const martialArts = parseSrdMartialArtsDice();
  // Touched so a broken Skills table fails the seed rather than failing later
  // at the first skill modifier a user asks for.
  skillAbilities();

  const classes = classIdsByName(db);

  for (const entry of traits) {
    const classId = classes.get(entry.class_name);
    if (classId === undefined) {
      // Not an error: a database whose class catalog does not carry this class
      // simply gets no sheet content for it, and the sheet says so.
      continue;
    }

    db.exec(
      `UPDATE class_definitions
          SET primary_ability_expression = ?, updated_at = ?
        WHERE id = ?`,
      [
        encodePrimaryAbilityExpression(
          entry.primary_ability_expression,
        ),
        timestamp,
        classId,
      ],
    );

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

    const entryGrant = entryGrants.get(entry.class_name);
    if (entryGrant === undefined) {
      // Unreachable while both parsers key on `SRD_CLASS_NAMES` — and asserted
      // rather than defaulted for exactly that reason. Falling back to "grants
      // nothing on entry" would turn a drift between the two extracts into a
      // multiclass character quietly losing a proficiency they have.
      throw new SrdMulticlassEntryError(
        `${entry.class_name} has a Core Traits block but no "As a Multiclass ` +
          'Character" clause. The two extracts have drifted.',
      );
    }
    const entrySkill = multiclassSkillColumns(entryGrant.skill_choice);

    // TOOL PROFICIENCIES ARE PARSED AND THEN DROPPED HERE, DELIBERATELY.
    // `entryGrant.tool_grants` holds the only two the twelve clauses print —
    // the Bard's "one Musical Instrument of your choice" and the Rogue's
    // "Thieves' Tools". Neither is seeded, and the reason is D26: a value earns
    // structure only if it changes a number on the sheet. This application has
    // no tool vocabulary, nothing computes a modifier from a tool, and a
    // nullable free-text column here would also flatten a real distinction —
    // the Bard's grant is a CHOICE and the Rogue's is a FIXED item.
    //
    // Dropped at the SEED rather than at the parse so the omission is visible:
    // the parser still reads them, so a reader can tell "the source grants no
    // tool" from "we chose not to model it", and the day tools are modelled the
    // content is already here.
    void entryGrant.tool_grants;

    db.exec(
      `INSERT INTO class_sheet_traits (
         class_definition_id, hit_die, skill_choice_count, skill_choice_from_any,
         multiclass_skill_choice_count, multiclass_skill_choice_pool,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(class_definition_id) DO UPDATE SET
         hit_die = excluded.hit_die,
         skill_choice_count = excluded.skill_choice_count,
         skill_choice_from_any = excluded.skill_choice_from_any,
         multiclass_skill_choice_count = excluded.multiclass_skill_choice_count,
         multiclass_skill_choice_pool = excluded.multiclass_skill_choice_pool,
         updated_at = excluded.updated_at`,
      [
        classId,
        entry.hit_die,
        entry.skill_choice_count,
        sqlBool(entry.skill_choice_from_any),
        entrySkill.count,
        entrySkill.pool,
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
           class_definition_id, category, granted_on_multiclass_entry,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          classId,
          category,
          sqlBool(entryGrant.armor_categories.includes(category)),
          timestamp,
          timestamp,
        ],
      );
    }
    for (const proficiency of entry.weapon_proficiencies) {
      db.exec(
        `INSERT INTO class_weapon_proficiencies (
           class_definition_id, category, property_qualifier,
           granted_on_multiclass_entry, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          classId,
          proficiency.category,
          proficiency.property_qualifier,
          sqlBool(entryGrant.weapon_categories.includes(proficiency.category)),
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

/**
 * THE TWO AUTOMATIC CLASS FORMULAS FROM
 * `docs/srd/source/unarmored-defense.txt`.
 *
 * UPSERT, NOT DELETE-THEN-INSERT: `character_effects.template_ref` names the
 * template row id, so preserving that id keeps generated-row identity stable
 * when bundled content is repaired or reseeded. Every sibling payload is
 * cleared on conflict so a corrupted row cannot retain mechanics belonging to
 * another effect kind.
 */
function seedClassFeatureEffects(
  db: DatabaseContext,
  timestamp: string,
): void {
  for (const feature of parseSrdUnarmoredDefenseFeatures()) {
    const classId = bundledClassId(db, feature.class_name);
    if (classId === null) {
      continue;
    }
    db.exec(
      `INSERT INTO class_feature_effects (
         class_definition_id, class_level, name, effect_kind,
         base, ability_1, ability_2, allows_shield, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(class_definition_id, name, class_level) DO UPDATE SET
         effect_kind = excluded.effect_kind,
         damage_type = NULL,
         hit_points_flat = NULL,
         hit_points_per_level = NULL,
         speed_bonus_feet = NULL,
         ability = NULL,
         amount = NULL,
         maximum = NULL,
         base = excluded.base,
         ability_1 = excluded.ability_1,
         ability_2 = excluded.ability_2,
         allows_shield = excluded.allows_shield,
         weapon_scope = NULL,
         attack_count = NULL,
         updated_at = excluded.updated_at`,
      [
        classId,
        feature.class_level,
        feature.name,
        feature.effect_kind,
        feature.base,
        feature.ability_1,
        feature.ability_2,
        sqlBool(feature.allows_shield),
        timestamp,
        timestamp,
      ],
    );
  }
}

/**
 * True when every bundled class this database carries has the exact formula
 * parsed from `docs/srd/source/unarmored-defense.txt`.
 */
function hasBundledClassFeatureEffects(db: DatabaseContext): boolean {
  for (const feature of parseSrdUnarmoredDefenseFeatures()) {
    const classId = bundledClassId(db, feature.class_name);
    if (classId === null) {
      continue;
    }
    const stored = db.allRaw(
      `SELECT class_level, name, effect_kind, damage_type, hit_points_flat,
              hit_points_per_level, speed_bonus_feet, ability, amount, maximum,
              base, ability_1, ability_2, allows_shield, weapon_scope,
              attack_count
       FROM class_feature_effects
      WHERE class_definition_id = ? AND name = ? AND class_level = ?`,
      [classId, feature.name, feature.class_level],
    );
    const row = stored[0];
    if (
      stored.length !== 1 ||
      row === undefined ||
      !sameClassFeatureEffect(row, feature)
    ) {
      return false;
    }
  }
  return true;
}

function sameClassFeatureEffect(
  row: Record<string, unknown>,
  feature: SrdUnarmoredDefenseFeature,
): boolean {
  return (
    Number(row['class_level']) === feature.class_level &&
    String(row['name']) === feature.name &&
    String(row['effect_kind']) === feature.effect_kind &&
    row['damage_type'] === null &&
    row['hit_points_flat'] === null &&
    row['hit_points_per_level'] === null &&
    row['speed_bonus_feet'] === null &&
    row['ability'] === null &&
    row['amount'] === null &&
    row['maximum'] === null &&
    Number(row['base']) === feature.base &&
    String(row['ability_1']) === feature.ability_1 &&
    String(row['ability_2']) === feature.ability_2 &&
    Number(row['allows_shield']) === sqlBool(feature.allows_shield) &&
    row['weapon_scope'] === null &&
    row['attack_count'] === null
  );
}

/**
 * THE TWO BUNDLED NAMED FEATURES (D19 §2).
 *
 * `docs/srd/source/extra-attack-other-sources.txt` is SRD 5.2 and therefore
 * bundleable, and these two rows are the only Extra Attack content in this
 * repository that the old `(class, level)` model could not hold. They are the
 * proof the D19 model works on SHIPPABLE content rather than only on a fixture:
 * the owner's subclass example is not free-licensed (D3, D19 §1) and no
 * subclass feature is seeded anywhere.
 *
 * DELETE-THEN-INSERT, BUT ONLY OVER THE CONTENT KEYS THIS SEEDER OWNS. The
 * class-content seeder above clears six tables per class with
 * `DELETE … WHERE class_definition_id = ?`, and that key is exactly what makes
 * it dangerous here: it would take a user's own Warlock feature with it. Keyed
 * on the two BUNDLED content keys instead, the clear can only ever remove rows
 * this seeder wrote, so it is as narrow as an upsert and strictly more
 * predictable.
 *
 * IT IS ALSO WHAT MAKES THE PASS ORDER-INDEPENDENT, which an upsert was not. If
 * a half-migrated row under the Devouring Blade key were sitting on the
 * Thirsting Blade NAME, seeding Thirsting Blade first would see an occupied
 * slot, yield it, and then seeding Devouring Blade would move that row off the
 * slot it had just yielded — leaving Thirsting Blade missing until a later
 * boot. Clearing both keys before writing either removes the interaction
 * entirely rather than reasoning about it.
 *
 * IT YIELDS A NAME SLOT A USER HOLDS, RATHER THAN CRASHING INTO IT.
 * `named_features` is ALSO unique on `(class_definition_id, name,
 * rules_edition)`, so a user who authored a 2024 Warlock feature of the same
 * name under a different content key would make this INSERT fail — and, because
 * the seed runs in ONE transaction, take the armour catalog and every class's
 * sheet content down with it on every boot. `upsertThirdCaster` settled the
 * policy for exactly this collision: the slot's holder wins. After the clear
 * above, any holder is by definition a row this seeder does not own, so the
 * test is simply "is the slot occupied".
 *
 * AND NOTHING IS LEFT PARKED WHERE THE PARSE NEVER PUT IT. Yielding used to
 * leave a stale row standing under the bundled content key, which the reader
 * would then have surfaced as sourced-looking content — a "would give 4
 * attacks" that is in no extract. The clear runs first and unconditionally, so
 * a yield removes the bundled row instead of abandoning it.
 *
 * THE PARENT CLASS IS RESOLVED BY `(name, rules_edition)`, NOT BY NAME ALONE.
 * `class_definitions` is unique on that PAIR, so a 2014 Warlock and a 2024
 * Warlock legitimately coexist, and a name-only lookup picks between them by
 * whichever row the query happened to return last. These two features are
 * printed under one edition; attaching them to the other one would surface an
 * invocation on a character who cannot take it and hide it from one who can.
 *
 * A CLASS THIS DATABASE DOES NOT CARRY GETS NO ROW, silently, exactly as the
 * class-content seeder treats a class with no `class_definitions` row.
 */
function seedNamedFeatures(db: DatabaseContext, timestamp: string): void {
  const features = parseSrdNamedExtraAttackFeatures();
  for (const feature of features) {
    db.exec('DELETE FROM named_features WHERE content_key = ?', [
      feature.content_key,
    ]);
  }

  for (const feature of features) {
    const classId = bundledClassId(db, feature.class_name);
    if (classId === null || nameSlotTaken(db, classId, feature.name)) {
      continue;
    }
    const featureId = db.exec(
      `INSERT INTO named_features (
         content_key, class_definition_id, name, rules_edition, prerequisite,
         description, class_level, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        feature.content_key,
        classId,
        feature.name,
        BUNDLED_FEATURE_RULES_EDITION,
        feature.prerequisite,
        feature.description,
        feature.class_level,
        timestamp,
        timestamp,
      ],
    ).lastInsertId;
    db.exec(
      `INSERT INTO named_feature_effects (
         named_feature_id, sort_order, effect_kind, attack_count,
         weapon_scope, created_at, updated_at
       ) VALUES (?, 1, 'extra_attack', ?, ?, ?, ?)`,
      [
        featureId,
        feature.attack_count,
        feature.weapon_scope,
        timestamp,
        timestamp,
      ],
    );
  }
}

/** The class of the bundled edition with this name, or `null`. */
function bundledClassId(db: DatabaseContext, className: string): number | null {
  const id = db.scalar<number>(
    'SELECT id FROM class_definitions WHERE name = ? AND rules_edition = ?',
    [className, BUNDLED_FEATURE_RULES_EDITION],
  );
  return id === null ? null : Number(id);
}

/** Whether `(class, name, edition)` is already held by some other row. */
function nameSlotTaken(
  db: DatabaseContext,
  classDefinitionId: number,
  name: string,
): boolean {
  return (
    db.scalar<number>(
      `SELECT id FROM named_features
       WHERE class_definition_id = ? AND name = ? AND rules_edition = ?`,
      [classDefinitionId, name, BUNDLED_FEATURE_RULES_EDITION],
    ) !== null
  );
}

function classIdsByName(db: DatabaseContext): Map<string, number> {
  return new Map(
    db
      .all(
        `SELECT id, name
           FROM class_definitions
          WHERE rules_edition = ?`,
        [BUNDLED_FEATURE_RULES_EDITION],
        (row) => ({
          id: Number(row.id),
          name: String(row.name),
        }),
      )
      .map((row) => [row.name, row.id] as const),
  );
}

/**
 * True when every bundled named feature is exactly where the parse would have
 * put it — or legitimately absent.
 *
 * CONDITIONED ON THE CLASS, WHICH THE ARMOUR CHECK ABOVE IS NOT, and the
 * difference is not inconsistency. An armour template stands alone; a named
 * feature has a NOT NULL foreign key to `class_definitions`, so a database with
 * no 2024 Warlock CANNOT hold Thirsting Blade and demanding it would report
 * such a database as broken forever, re-seeding on every boot and never
 * succeeding. That is the same trap `class_armor_training` is excluded from the
 * gutted-row check for.
 *
 * THE WHOLE ROW IS COMPARED, NOT JUST THE KEY, and that is stronger than the
 * armour check beside it on purpose. A key-only guard reports a database as
 * healthy when the row under that key says four attacks where the source says
 * two — and the sheet then prints a sourced-looking number that is in no
 * extract at all. Every column this seeder writes is compared.
 *
 * A YIELDED SLOT IS HEALTHY, AND ONLY WHEN THE YIELD IS COMPLETE. If a user
 * holds `(class, name, edition)` under their own key, the bundled row cannot be
 * placed and demanding it would loop forever — so its absence is accepted. What
 * is NOT accepted is a row still standing under the bundled content key while
 * the slot is yielded: that is content this application would surface as
 * sourced, sitting somewhere the parse never put it. `seedNamedFeatures` clears
 * it, and this is the claim that makes the clearing checkable.
 */
function hasBundledNamedFeatures(db: DatabaseContext): boolean {
  for (const feature of parseSrdNamedExtraAttackFeatures()) {
    const stored = db.all(
      `SELECT feature.class_definition_id, feature.name, feature.rules_edition,
              feature.prerequisite, feature.description, feature.class_level,
              effect.effect_kind, effect.attack_count,
              effect.weapon_scope
       FROM named_features AS feature
       LEFT JOIN named_feature_effects AS effect
         ON effect.named_feature_id = feature.id
        AND effect.sort_order = 1
       WHERE feature.content_key = ?`,
      [feature.content_key],
      (row) => [
        Number(row.class_definition_id),
        String(row.name),
        String(row.rules_edition),
        String(row.prerequisite),
        String(row.description),
        Number(row.class_level),
        row.effect_kind === null ? null : String(row.effect_kind),
        row.attack_count === null
          ? null
          : Number(row.attack_count),
        row.weapon_scope === null
          ? null
          : String(row.weapon_scope),
      ],
    );

    const classId = bundledClassId(db, feature.class_name);
    if (classId === null) {
      // No class to hang it on. Absent is correct; anything present is not.
      if (stored.length > 0) {
        return false;
      }
      continue;
    }

    if (stored.length === 0) {
      // Absent, which is right only if a row this seeder does not own is
      // holding the slot the bundled row would need.
      if (!nameSlotTaken(db, classId, feature.name)) {
        return false;
      }
      continue;
    }

    const expected = [
      classId,
      feature.name,
      BUNDLED_FEATURE_RULES_EDITION,
      feature.prerequisite,
      feature.description,
      feature.class_level,
      'extra_attack',
      feature.attack_count,
      feature.weapon_scope,
    ];
    if (
      stored.length !== 1 ||
      JSON.stringify(stored[0]) !== JSON.stringify(expected)
    ) {
      return false;
    }
  }
  return true;
}
