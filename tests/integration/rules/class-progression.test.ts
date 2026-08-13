import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  ClassProgressionLookup,
  seedClassProgressions,
} from '../../../src/rules/class-progression-lookup';
import { applicationSeed } from '../../../src/db/bootstrap';
import { BUNDLED_HOMEBREW_CATALOG } from '../../../src/authoring/bundled-homebrew-catalog';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';
import {
  bundledSrdSubclassDefinitionContentKeys,
} from '../../../src/rules/srd-subclass-content';
import {
  HEADING_ONLY_DESCRIPTION,
} from '../../../src/domain/subclass-feature-description';
import {
  parseSrdSubclasses,
  srdSubclassClassNames,
} from '../../../src/rules/srd-subclasses';
import { openTestDatabase } from '../../helpers/open-db';

function expectedSrdFixedSpellRule(
  subclassName: string,
  rulePrefix: string,
  activeFromClassLevel: number,
  spellSlug: string,
): Readonly<Record<string, unknown>> {
  return {
    subclass_name: subclassName,
    rule: {
      kind: 'fixed_spell',
      rule_key: `${rulePrefix}-${spellSlug}`,
      spell_version_key: `2024:${spellSlug}`,
      bucket: 'prepared',
      always_prepared: true,
      with_slots: true,
      active_from_class_level: activeFromClassLevel,
      count: 1,
      free_cast: null,
    },
  };
}

/**
 * The one non-spell subclass grant rule the SRD seed carries: Champion's
 * level-7 Additional Fighting Style, in the exact NORMALISED shape
 * `GrantRule.fromObject` persists (defaulted `count`, `always_prepared`,
 * `with_slots` and `free_cast` included).
 */
const EXPECTED_CHAMPION_ADDITIONAL_FIGHTING_STYLE_RULE = {
  subclass_name: 'Champion',
  rule: {
    kind: 'grant_source',
    rule_key: 'champion-additional-fighting-style',
    source_type: 'feat',
    definition_key_config: 'additional_fighting_style_key',
    child_config_config: 'additional_fighting_style_config',
    active_from_class_level: 7,
    count: 1,
    always_prepared: false,
    with_slots: true,
    free_cast: null,
  },
} as const;

const EXPECTED_SRD_FIXED_SPELL_RULES = [
  ['Draconic Sorcery', 'draconic-sorcery', 3, 'alter-self'],
  ['Draconic Sorcery', 'draconic-sorcery', 3, 'chromatic-orb'],
  ['Draconic Sorcery', 'draconic-sorcery', 3, 'command'],
  ['Draconic Sorcery', 'draconic-sorcery', 3, 'dragon-s-breath'],
  ['Draconic Sorcery', 'draconic-sorcery', 5, 'fear'],
  ['Draconic Sorcery', 'draconic-sorcery', 5, 'fly'],
  ['Draconic Sorcery', 'draconic-sorcery', 7, 'arcane-eye'],
  ['Draconic Sorcery', 'draconic-sorcery', 7, 'charm-monster'],
  ['Draconic Sorcery', 'draconic-sorcery', 9, 'legend-lore'],
  ['Draconic Sorcery', 'draconic-sorcery', 9, 'summon-dragon'],
  ['Fiend Patron', 'fiend-patron', 3, 'burning-hands'],
  ['Fiend Patron', 'fiend-patron', 3, 'command'],
  ['Fiend Patron', 'fiend-patron', 3, 'scorching-ray'],
  ['Fiend Patron', 'fiend-patron', 3, 'suggestion'],
  ['Fiend Patron', 'fiend-patron', 5, 'fireball'],
  ['Fiend Patron', 'fiend-patron', 5, 'stinking-cloud'],
  ['Fiend Patron', 'fiend-patron', 7, 'fire-shield'],
  ['Fiend Patron', 'fiend-patron', 7, 'wall-of-fire'],
  ['Fiend Patron', 'fiend-patron', 9, 'geas'],
  ['Fiend Patron', 'fiend-patron', 9, 'insect-plague'],
  ['Life Domain', 'life-domain', 3, 'aid'],
  ['Life Domain', 'life-domain', 3, 'bless'],
  ['Life Domain', 'life-domain', 3, 'cure-wounds'],
  ['Life Domain', 'life-domain', 3, 'lesser-restoration'],
  ['Life Domain', 'life-domain', 5, 'mass-healing-word'],
  ['Life Domain', 'life-domain', 5, 'revivify'],
  ['Life Domain', 'life-domain', 7, 'aura-of-life'],
  ['Life Domain', 'life-domain', 7, 'death-ward'],
  ['Life Domain', 'life-domain', 9, 'greater-restoration'],
  ['Life Domain', 'life-domain', 9, 'mass-cure-wounds'],
  ['Oath of Devotion', 'oath-of-devotion', 3, 'protection-from-evil-and-good'],
  ['Oath of Devotion', 'oath-of-devotion', 3, 'shield-of-faith'],
  ['Oath of Devotion', 'oath-of-devotion', 5, 'aid'],
  ['Oath of Devotion', 'oath-of-devotion', 5, 'zone-of-truth'],
  ['Oath of Devotion', 'oath-of-devotion', 9, 'beacon-of-hope'],
  ['Oath of Devotion', 'oath-of-devotion', 9, 'dispel-magic'],
  ['Oath of Devotion', 'oath-of-devotion', 13, 'freedom-of-movement'],
  ['Oath of Devotion', 'oath-of-devotion', 13, 'guardian-of-faith'],
  ['Oath of Devotion', 'oath-of-devotion', 17, 'commune'],
  ['Oath of Devotion', 'oath-of-devotion', 17, 'flame-strike'],
] as const;

const SPELL_STUDENT_LEVELS = [
  [1, 0, 0, 0, {}],
  [2, 0, 0, 0, {}],
  [3, 1, 1, 1, { 1: 2 }],
  [4, 1, 1, 1, { 1: 2 }],
  [5, 1, 1, 1, { 1: 2 }],
  [6, 1, 1, 1, { 1: 3 }],
  [7, 1, 2, 1, { 1: 3 }],
  [8, 1, 2, 1, { 1: 3 }],
  [9, 1, 2, 2, { 1: 4, 2: 2 }],
  [10, 1, 2, 2, { 1: 4, 2: 2 }],
  [11, 2, 3, 2, { 1: 4, 2: 2 }],
  [12, 2, 3, 2, { 1: 4, 2: 3 }],
  [13, 2, 3, 2, { 1: 4, 2: 3 }],
  [14, 2, 3, 2, { 1: 4, 2: 3 }],
  [15, 2, 4, 3, { 1: 4, 2: 3, 3: 2 }],
  [16, 2, 4, 3, { 1: 4, 2: 3, 3: 2 }],
  [17, 2, 4, 3, { 1: 4, 2: 3, 3: 2 }],
  [18, 2, 4, 3, { 1: 4, 2: 3, 3: 3 }],
  [19, 2, 5, 3, { 1: 4, 2: 3, 3: 3 }],
  [20, 2, 5, 3, { 1: 4, 2: 3, 3: 3 }],
] as const;

function expectedSpellStudentGrantRules(
  classLevel: number,
  cantripsKnown: number,
  spellsKnown: number,
  maximumSpellLevel: number,
): readonly Record<string, unknown>[] {
  if (classLevel < 3) return [];
  return [
    {
      kind: 'choice_from_list',
      rule_key: 'spell-student-cantrips',
      list: 'Wizard',
      count: cantripsKnown,
      bucket: 'known',
      level_min: 0,
      level_max: 0,
      always_prepared: false,
      with_slots: true,
      free_cast: null,
    },
    {
      kind: 'choice_from_list',
      rule_key: 'spell-student-spells',
      list: 'Wizard',
      count: spellsKnown,
      bucket: 'known',
      level_min: 1,
      level_max: maximumSpellLevel,
      always_prepared: false,
      with_slots: true,
      free_cast: null,
    },
  ];
}


describe('persisted class progression catalog', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    applicationSeed(db);
  });

  afterEach(() => {
    connection.close();
  });

  it('persists the bundled class and subclass catalogs at exact cardinality', () => {
    expect(db.scalar('SELECT count(*) FROM class_definitions')).toBe(12);
    expect(db.scalar('SELECT count(*) FROM class_progressions')).toBe(240);
    expect(db.scalar('SELECT count(*) FROM subclass_definitions')).toBe(12);
    expect(db.scalar('SELECT count(*) FROM subclass_progressions')).toBe(0);
    expect(db.scalar('SELECT count(*) FROM subclass_features')).toBe(58);
    expect(db.scalar('SELECT count(*) FROM subclass_feature_effects')).toBe(0);

    const classCoverage = db.allRaw(`
      SELECT class.name, count(*) AS rows, min(class_level) AS first_level,
        max(class_level) AS last_level
      FROM class_progressions progression
      JOIN class_definitions class ON class.id = progression.class_definition_id
      GROUP BY class.id
      ORDER BY class.name
    `);
    expect(classCoverage).toHaveLength(12);
    expect(classCoverage.every((row) =>
      row.rows === 20 && row.first_level === 1 && row.last_level === 20,
    )).toBe(true);

    const parsed = parseSrdSubclasses();
    expect(
      db.allRaw(`
        SELECT class.name AS class_name, subclass.name AS subclass_name,
          feature.class_level, feature.sort_order, feature.name,
          feature.description
        FROM subclass_features AS feature
        JOIN subclass_definitions AS subclass
          ON subclass.id = feature.subclass_definition_id
        JOIN class_definitions AS class
          ON class.id = subclass.class_definition_id
        WHERE subclass.content_key IN (${bundledSrdSubclassDefinitionContentKeys().map(() => '?').join(', ')})
        ORDER BY class.name, feature.sort_order
      `, [...bundledSrdSubclassDefinitionContentKeys()]),
    ).toEqual(
      srdSubclassClassNames.flatMap((className) => {
        const definition = parsed.by_class[className];
        return definition.features.map((feature) => ({
          class_name: className,
          subclass_name: definition.subclass_name,
          class_level: feature.class_level,
          sort_order: feature.sort_position + 1,
          name: feature.name,
          description: HEADING_ONLY_DESCRIPTION,
        }));
      }),
    );
  });

  it('publishes Veteran as full external homebrew with its exact feature schedule', () => {
    const catalog = BUNDLED_HOMEBREW_CATALOG.filter(
      (entry) => entry.catalog_key === 'veteran',
    );
    const plan = planBundledHomebrewInstall(db, catalog);
    expect(plan.entries).toEqual([
      expect.objectContaining({ name: 'Veteran', outcome: 'create' }),
    ]);
    expect(commitBundledHomebrewInstall(db, plan.token, catalog)).toMatchObject({
      kind: 'committed',
      outcomes: [{
        kind: 'create',
        contentKey: '2024:content.subclass:veteran-bundled-revision-3',
      }],
    });
    expect(
      db.allRaw(
        `SELECT feature.class_level, feature.sort_order, feature.name,
                length(feature.description) > 0 AS has_description
           FROM subclass_features AS feature
           JOIN subclass_definitions AS subclass
             ON subclass.id = feature.subclass_definition_id
          WHERE subclass.content_key = '2024:content.subclass:veteran-bundled-revision-3'
          ORDER BY feature.sort_order`,
      ),
    ).toEqual([
      { class_level: 3, sort_order: 1, name: 'Seasoned Professional', has_description: 1 },
      { class_level: 3, sort_order: 2, name: 'Old Training', has_description: 1 },
      { class_level: 3, sort_order: 3, name: 'Deeper Cuts', has_description: 1 },
      { class_level: 3, sort_order: 4, name: 'Old Reserves', has_description: 1 },
      { class_level: 3, sort_order: 5, name: 'Too Old for This', has_description: 1 },
      { class_level: 3, sort_order: 6, name: 'Deuces Are Wild', has_description: 1 },
      { class_level: 3, sort_order: 7, name: 'Sure Strike', has_description: 1 },
      { class_level: 9, sort_order: 8, name: "Veteran's Strike", has_description: 1 },
      { class_level: 9, sort_order: 9, name: 'Extensive Experience', has_description: 1 },
      { class_level: 13, sort_order: 10, name: 'Veteran Reflexes', has_description: 1 },
      { class_level: 13, sort_order: 11, name: 'Critical Instincts', has_description: 1 },
      { class_level: 13, sort_order: 12, name: 'Fighting Style', has_description: 1 },
      { class_level: 17, sort_order: 13, name: 'Master of Experience', has_description: 1 },
      { class_level: 17, sort_order: 14, name: 'Heightened Lethality', has_description: 1 },
      { class_level: 17, sort_order: 15, name: 'Blindsight', has_description: 1 },
    ]);
    expect(
      db.oneRaw(
        `SELECT subclass.spellcasting_ability, subclass.caster_fraction,
                (SELECT count(*) FROM subclass_progressions AS progression
                  WHERE progression.subclass_definition_id = subclass.id)
                  AS progression_rows,
                (SELECT count(*)
                   FROM subclass_feature_effects AS effect
                   JOIN subclass_features AS feature
                     ON feature.id = effect.subclass_feature_id
                  WHERE feature.subclass_definition_id = subclass.id)
                  AS feature_effect_rows,
                (SELECT count(*)
                   FROM subclass_feature_value_contributions AS contribution
                   JOIN subclass_features AS feature
                     ON feature.id = contribution.subclass_feature_id
                  WHERE feature.subclass_definition_id = subclass.id)
                  AS feature_value_contribution_rows
           FROM subclass_definitions AS subclass
          WHERE subclass.content_key = '2024:content.subclass:veteran-bundled-revision-3'`,
      ),
    ).toEqual({
      spellcasting_ability: null,
      caster_fraction: null,
      progression_rows: 0,
      feature_effect_rows: 0,
      feature_value_contribution_rows: 3,
    });
  }, 20_000);

  it('reinstalling external Veteran preserves its root and complete feature graph', () => {
    const catalog = BUNDLED_HOMEBREW_CATALOG.filter(
      (entry) => entry.catalog_key === 'veteran',
    );
    const first = planBundledHomebrewInstall(db, catalog);
    commitBundledHomebrewInstall(db, first.token, catalog);
    const before = db.allRaw(
      `SELECT subclass.id AS subclass_id, feature.id AS feature_id,
              feature.class_level, feature.sort_order, feature.name,
              feature.description
         FROM subclass_definitions AS subclass
         JOIN subclass_features AS feature
           ON feature.subclass_definition_id = subclass.id
        WHERE subclass.content_key = '2024:content.subclass:veteran-bundled-revision-3'
        ORDER BY feature.sort_order`,
    );

    const second = planBundledHomebrewInstall(db, catalog);
    expect(second.entries.map((entry) => entry.outcome)).toEqual([
      'matched_existing',
    ]);
    commitBundledHomebrewInstall(db, second.token, catalog);
    expect(
      db.allRaw(
        `SELECT subclass.id AS subclass_id, feature.id AS feature_id,
                feature.class_level, feature.sort_order, feature.name,
                feature.description
           FROM subclass_definitions AS subclass
           JOIN subclass_features AS feature
             ON feature.subclass_definition_id = subclass.id
          WHERE subclass.content_key = '2024:content.subclass:veteran-bundled-revision-3'
          ORDER BY feature.sort_order`,
      ),
    ).toEqual(before);
  }, 20_000);

  it('marks every SC-3 feature description with the D152 heading-only constant', () => {
    expect(HEADING_ONLY_DESCRIPTION).toBe('');
    const contentKeys = bundledSrdSubclassDefinitionContentKeys();
    const rows = db.allRaw(
      `SELECT feature.description
         FROM subclass_features AS feature
         JOIN subclass_definitions AS subclass
           ON subclass.id = feature.subclass_definition_id
        WHERE subclass.content_key IN (${contentKeys.map(() => '?').join(', ')})`,
      [...contentKeys],
    );

    expect(rows).toHaveLength(58);
    expect(rows.every(
      (row) => row.description === HEADING_ONLY_DESCRIPTION,
    )).toBe(true);
  });

  it('persists base-class metadata with third-caster rules only on subclasses', () => {
    expect(
      db.allRaw(`
        SELECT name, spellcasting_ability, progression_type, caster_fraction,
          caster_rounding
        FROM class_definitions
        ORDER BY name
      `),
    ).toEqual([
      { name: 'Barbarian', spellcasting_ability: null, progression_type: 'none', caster_fraction: null, caster_rounding: null },
      { name: 'Bard', spellcasting_ability: 'charisma', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
      { name: 'Cleric', spellcasting_ability: 'wisdom', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
      { name: 'Druid', spellcasting_ability: 'wisdom', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
      { name: 'Fighter', spellcasting_ability: null, progression_type: 'none', caster_fraction: null, caster_rounding: null },
      { name: 'Monk', spellcasting_ability: null, progression_type: 'none', caster_fraction: null, caster_rounding: null },
      { name: 'Paladin', spellcasting_ability: 'charisma', progression_type: 'half_up', caster_fraction: '1/2', caster_rounding: 'up' },
      { name: 'Ranger', spellcasting_ability: 'wisdom', progression_type: 'half_up', caster_fraction: '1/2', caster_rounding: 'up' },
      { name: 'Rogue', spellcasting_ability: null, progression_type: 'none', caster_fraction: null, caster_rounding: null },
      { name: 'Sorcerer', spellcasting_ability: 'charisma', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
      { name: 'Warlock', spellcasting_ability: 'charisma', progression_type: 'pact', caster_fraction: null, caster_rounding: null },
      { name: 'Wizard', spellcasting_ability: 'intelligence', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
    ]);

    expect(
      db.allRaw(`
        SELECT subclass.name, class.name AS class_name, subclass.spellcasting_ability,
          subclass.caster_fraction, subclass.caster_rounding
        FROM subclass_definitions subclass
        JOIN class_definitions class ON class.id = subclass.class_definition_id
        ORDER BY subclass.name
      `),
    ).toEqual([
      { name: 'Champion', class_name: 'Fighter', spellcasting_ability: null, caster_fraction: null, caster_rounding: null },
      { name: 'Circle of the Land', class_name: 'Druid', spellcasting_ability: 'wisdom', caster_fraction: null, caster_rounding: null },
      { name: 'College of Lore', class_name: 'Bard', spellcasting_ability: 'charisma', caster_fraction: null, caster_rounding: null },
      { name: 'Draconic Sorcery', class_name: 'Sorcerer', spellcasting_ability: 'charisma', caster_fraction: null, caster_rounding: null },
      { name: 'Evoker', class_name: 'Wizard', spellcasting_ability: 'intelligence', caster_fraction: null, caster_rounding: null },
      { name: 'Fiend Patron', class_name: 'Warlock', spellcasting_ability: 'charisma', caster_fraction: null, caster_rounding: null },
      { name: 'Hunter', class_name: 'Ranger', spellcasting_ability: 'wisdom', caster_fraction: null, caster_rounding: null },
      { name: 'Life Domain', class_name: 'Cleric', spellcasting_ability: 'wisdom', caster_fraction: null, caster_rounding: null },
      { name: 'Oath of Devotion', class_name: 'Paladin', spellcasting_ability: 'charisma', caster_fraction: null, caster_rounding: null },
      { name: 'Path of the Berserker', class_name: 'Barbarian', spellcasting_ability: null, caster_fraction: null, caster_rounding: null },
      { name: 'Thief', class_name: 'Rogue', spellcasting_ability: null, caster_fraction: null, caster_rounding: null },
      { name: 'Warrior of the Open Hand', class_name: 'Monk', spellcasting_ability: null, caster_fraction: null, caster_rounding: null },
    ]);

    const persistedRules = db
      .allRaw(`
        SELECT subclass.name, subclass.grant_rules
        FROM subclass_definitions AS subclass
        WHERE subclass.grant_rules IS NOT NULL
        ORDER BY subclass.name
      `)
      .flatMap((row) => {
        const decoded: unknown = JSON.parse(String(row.grant_rules));
        if (!Array.isArray(decoded)) {
          throw new TypeError('Persisted subclass grant rules are not an array.');
        }
        return decoded.map((rule) => ({
          subclass_name: String(row.name),
          rule,
        }));
      });
    // 40 fixed-spell rules, unchanged, plus ONE new rule: Champion's level-7
    // "Additional Fighting Style" ("You gain another Fighting Style feat of
    // your choice", SRD 5.2.1 printed page 52). Champion sorts first by name,
    // so it leads the ordered list; the fixed-spell expectations are untouched.
    expect(persistedRules).toHaveLength(41);
    expect(persistedRules).toEqual([
      EXPECTED_CHAMPION_ADDITIONAL_FIGHTING_STYLE_RULE,
      ...EXPECTED_SRD_FIXED_SPELL_RULES.map(
        ([subclassName, rulePrefix, activeFromClassLevel, spellSlug]) =>
          expectedSrdFixedSpellRule(
            subclassName,
            rulePrefix,
            activeFromClassLevel,
            spellSlug,
          ),
      ),
    ]);
  });

  it.each([
    ['Bard', 1, 2, 4, { 1: 2 }, []],
    ['Bard', 4, 3, 7, { 1: 4, 2: 3 }, []],
    ['Bard', 10, 4, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Bard', 20, 4, 22, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Cleric', 1, 3, 4, { 1: 2 }, []],
    ['Cleric', 4, 4, 7, { 1: 4, 2: 3 }, []],
    ['Cleric', 10, 5, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Cleric', 20, 5, 22, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Druid', 1, 2, 4, { 1: 2 }, []],
    ['Druid', 4, 3, 7, { 1: 4, 2: 3 }, []],
    ['Druid', 10, 4, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Druid', 20, 4, 22, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Sorcerer', 1, 4, 2, { 1: 2 }, []],
    ['Sorcerer', 2, 4, 4, { 1: 3 }, []],
    ['Sorcerer', 3, 4, 6, { 1: 4, 2: 2 }, []],
    ['Sorcerer', 4, 5, 7, { 1: 4, 2: 3 }, []],
    ['Sorcerer', 10, 6, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Sorcerer', 20, 6, 22, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Wizard', 1, 3, 4, { 1: 2 }, []],
    ['Wizard', 4, 4, 7, { 1: 4, 2: 3 }, []],
    ['Wizard', 10, 5, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Wizard', 14, 5, 18, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, []],
    ['Wizard', 16, 5, 21, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, []],
    ['Wizard', 20, 5, 25, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Paladin', 1, 0, 2, { 1: 2 }, []],
    ['Paladin', 3, 0, 4, { 1: 3 }, []],
    ['Paladin', 5, 0, 6, { 1: 4, 2: 2 }, []],
    ['Paladin', 17, 0, 14, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, []],
    ['Paladin', 20, 0, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Ranger', 1, 0, 2, { 1: 2 }, []],
    ['Ranger', 3, 0, 4, { 1: 3 }, []],
    ['Ranger', 5, 0, 6, { 1: 4, 2: 2 }, []],
    ['Ranger', 17, 0, 14, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, []],
    ['Ranger', 20, 0, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Warlock', 1, 2, 2, [], { count: 1, level: 1 }],
    ['Warlock', 2, 2, 3, [], { count: 2, level: 1 }],
    ['Warlock', 3, 2, 4, [], { count: 2, level: 2 }],
    ['Warlock', 4, 3, 5, [], { count: 2, level: 2 }],
    ['Warlock', 5, 3, 6, [], { count: 2, level: 3 }],
    ['Warlock', 9, 3, 10, [], { count: 2, level: 5 }],
    ['Warlock', 10, 4, 10, [], { count: 2, level: 5 }],
    ['Warlock', 11, 4, 11, [], { count: 3, level: 5 }],
    ['Warlock', 17, 4, 14, [], { count: 4, level: 5 }],
    ['Warlock', 20, 4, 15, [], { count: 4, level: 5 }],
    ['Barbarian', 1, 0, 0, [], []],
    ['Barbarian', 20, 0, 0, [], []],
    ['Fighter', 1, 0, 0, [], []],
    ['Fighter', 20, 0, 0, [], []],
    ['Monk', 1, 0, 0, [], []],
    ['Monk', 20, 0, 0, [], []],
    ['Rogue', 1, 0, 0, [], []],
    ['Rogue', 20, 0, 0, [], []],
  ])(
    'persists %s level %i caster breakpoints',
    (name, level, cantrips, prepared, slots, pact) => {
      const row = db.oneRaw(`
        SELECT progression.cantrips_known, progression.prepared_count,
          progression.slots, progression.pact_slots
        FROM class_progressions progression
        JOIN class_definitions class ON class.id = progression.class_definition_id
        WHERE class.name = ? AND progression.class_level = ?
      `, [name, level]);

      expect(row).not.toBeNull();
      expect(row!.cantrips_known).toBe(cantrips);
      expect(row!.prepared_count).toBe(prepared);
      expect(JSON.parse(String(row!.slots))).toEqual(slots);
      expect(JSON.parse(String(row!.pact_slots))).toEqual(pact);
    },
  );

  it('persists order, wizard, and Mystic Arcanum grant rules', () => {
    const rulesFor = (name: string, level: number): Record<string, unknown>[] => {
      const encoded = db.scalar<string>(`
        SELECT progression.grant_rules
        FROM class_progressions progression
        JOIN class_definitions class ON class.id = progression.class_definition_id
        WHERE class.name = ? AND progression.class_level = ?
      `, [name, level]);
      return JSON.parse(encoded!);
    };

    expect(rulesFor('Cleric', 1).find((rule) =>
      rule.rule_key === 'cleric-divine-order-cantrip',
    )).toMatchObject({
      count: 1,
      list: '$config.divine_order.chosen_list',
      active_if_config: {
        key: 'divine_order.chosen_option',
        equals: 'Thaumaturge',
      },
    });
    expect(rulesFor('Druid', 1).find((rule) =>
      rule.rule_key === 'druid-primal-order-cantrip',
    )).toMatchObject({
      count: 1,
      list: '$config.primal_order.chosen_list',
      active_if_config: {
        key: 'primal_order.chosen_option',
        equals: 'Magician',
      },
    });
    expect(rulesFor('Wizard', 1).map((rule) => rule.rule_key)).toEqual([
      'wizard-cantrips',
      'wizard-prepared',
      'wizard-spellbook',
      'ritual-adept',
    ]);

    for (const [level, prepared, arcanumLevels] of [
      [11, 11, [6]],
      [12, 11, [6]],
      [13, 12, [6, 7]],
      [14, 12, [6, 7]],
      [15, 13, [6, 7, 8]],
      [16, 13, [6, 7, 8]],
      [17, 14, [6, 7, 8, 9]],
      [18, 14, [6, 7, 8, 9]],
      [19, 15, [6, 7, 8, 9]],
      [20, 15, [6, 7, 8, 9]],
    ] as const) {
      const rules = rulesFor('Warlock', level);
      expect(
        rules.find((rule) => rule.rule_key === 'warlock-prepared'),
      ).toMatchObject({
        count: prepared,
        level_min: 1,
        level_max: 5,
        with_slots: true,
      });
      expect(
        rules
          .filter((rule) =>
            String(rule.rule_key).startsWith('warlock-mystic-arcanum-'),
          )
          .map((rule) => rule.level_min),
        `Warlock ${level} persisted Arcanum levels`,
      ).toEqual(arcanumLevels);
    }
  });

  // Measured alone at 1.75s; 20s retains contention headroom.
  it('persists every Spell Student third-caster count and SRD-derived slot row through the publish route', () => {
    const catalog = BUNDLED_HOMEBREW_CATALOG.filter(
      (entry) => entry.catalog_key === 'spell-student',
    );
    const plan = planBundledHomebrewInstall(db, catalog);
    expect(commitBundledHomebrewInstall(db, plan.token, catalog)).toMatchObject({
      kind: 'committed',
      outcomes: [{
        kind: 'create',
        contentKey: '2024:content.subclass:spell-student-bundled-revision-2',
      }],
    });
    expect(
      db.allRaw(`
        SELECT subclass.name, progression.class_level,
          progression.cantrips_known, progression.prepared_count,
          progression.max_spell_level, progression.slots,
          progression.grant_rules
        FROM subclass_progressions progression
        JOIN subclass_definitions subclass
          ON subclass.id = progression.subclass_definition_id
        WHERE subclass.content_key = '2024:content.subclass:spell-student-bundled-revision-2'
        ORDER BY progression.class_level
      `).map((row) => ({
        ...row,
        slots: JSON.parse(String(row.slots)),
        grant_rules: JSON.parse(String(row.grant_rules)),
      })),
    ).toEqual(
      SPELL_STUDENT_LEVELS.map(
        ([classLevel, cantripsKnown, preparedCount, maximumSpellLevel, slots]) => ({
          name: 'Spell Student (Bundled revision 2)',
          class_level: classLevel,
          cantrips_known: cantripsKnown,
          prepared_count: preparedCount,
          max_spell_level: maximumSpellLevel,
          slots,
          grant_rules: expectedSpellStudentGrantRules(
            classLevel,
            cantripsKnown,
            preparedCount,
            maximumSpellLevel,
          ),
        }),
      ),
    );
  }, 20_000);

  it('looks up the persisted class-table count independently of ability score', () => {
    const wizardId = Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', ['Wizard']),
    );
    const characterIds = [8, 20].map((intelligence) => {
      const result = db.exec(
        'INSERT INTO characters (name, intelligence) VALUES (?, ?)',
        [`Intelligence ${intelligence}`, intelligence],
      );
      db.exec(`
        INSERT INTO character_class_levels
          (character_id, class_definition_id, level)
        VALUES (?, ?, 1)
      `, [result.lastInsertId, wizardId]);
      return result.lastInsertId;
    });
    const lookup = new ClassProgressionLookup(db);

    expect(
      characterIds.map((characterId) =>
        lookup.preparedCountForCharacterClass(characterId, wizardId),
      ),
    ).toEqual([4, 4]);
  });

  it('rejects a lookup when the persisted character lacks the class', () => {
    const wizardId = Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', ['Wizard']),
    );
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('No Wizard')",
    ).lastInsertId;
    const lookup = new ClassProgressionLookup(db);

    expect(() =>
      lookup.preparedCountForCharacterClass(characterId, wizardId),
    ).toThrow(`Character ${characterId} does not have class ${wizardId}.`);
    expect(
      db.scalar(
        'SELECT count(*) FROM character_class_levels WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
  });

  it('rejects a lookup when the persisted class level lacks a progression row', () => {
    const wizardId = Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', ['Wizard']),
    );
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Epic Wizard')",
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels
        (character_id, class_definition_id, level)
       VALUES (?, ?, 21)`,
      [characterId, wizardId],
    );
    const lookup = new ClassProgressionLookup(db);

    expect(() =>
      lookup.preparedCountForCharacterClass(characterId, wizardId),
    ).toThrow(`Class ${wizardId} has no progression row at level 21.`);
    expect(
      db.scalar(
        `SELECT level FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, wizardId],
      ),
    ).toBe(21);
  });

  it('upserts idempotently while retaining persisted row identities', () => {
    const before = db.allRaw(`
      SELECT class.content_key, progression.class_level, progression.id
      FROM class_progressions progression
      JOIN class_definitions class ON class.id = progression.class_definition_id
      ORDER BY class.content_key, progression.class_level
    `);

    seedClassProgressions(db);

    expect(db.scalar('SELECT count(*) FROM class_progressions')).toBe(240);
    expect(
      db.allRaw(`
        SELECT class.content_key, progression.class_level, progression.id
        FROM class_progressions progression
        JOIN class_definitions class ON class.id = progression.class_definition_id
        ORDER BY class.content_key, progression.class_level
      `),
    ).toEqual(before);
  });
});
