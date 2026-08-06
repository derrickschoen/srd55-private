import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  ClassProgressionLookup,
  seedClassProgressions,
} from '../../../src/rules/class-progression-lookup';
import {
  bundledSrdSubclassDefinitionContentKeys,
  ensureBundledSrdSubclassContent,
} from '../../../src/rules/srd-subclass-content';
import {
  ensureBundledVeteranSubclassContent,
  hasBundledVeteranSubclassContent,
} from '../../../src/rules/veteran-subclass-content';
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

const THIRD_CASTER_LEVELS = [
  [1, 0, 0, []],
  [2, 0, 0, []],
  [3, 3, 1, { 1: 2 }],
  [4, 4, 1, { 1: 3 }],
  [5, 4, 1, { 1: 3 }],
  [6, 4, 1, { 1: 3 }],
  [7, 5, 2, { 1: 4, 2: 2 }],
  [8, 6, 2, { 1: 4, 2: 2 }],
  [9, 6, 2, { 1: 4, 2: 2 }],
  [10, 7, 2, { 1: 4, 2: 3 }],
  [11, 8, 2, { 1: 4, 2: 3 }],
  [12, 8, 2, { 1: 4, 2: 3 }],
  [13, 9, 3, { 1: 4, 2: 3, 3: 2 }],
  [14, 10, 3, { 1: 4, 2: 3, 3: 2 }],
  [15, 10, 3, { 1: 4, 2: 3, 3: 2 }],
  [16, 11, 3, { 1: 4, 2: 3, 3: 3 }],
  [17, 11, 3, { 1: 4, 2: 3, 3: 3 }],
  [18, 11, 3, { 1: 4, 2: 3, 3: 3 }],
  [19, 12, 4, { 1: 4, 2: 3, 3: 3, 4: 1 }],
  [20, 13, 4, { 1: 4, 2: 3, 3: 3, 4: 1 }],
] as const;

function expectedThirdCasterRules(
  prefix: string,
  cantripsKnown: number,
  preparedCount: number,
  maximumSpellLevel: number,
): readonly Readonly<Record<string, unknown>>[] {
  return [
    ...(cantripsKnown === 0
      ? []
      : [
          {
            kind: 'choice_from_list',
            rule_key: `${prefix}-cantrips`,
            count: cantripsKnown,
            bucket: 'cantrip_known',
            list: 'Wizard',
            level_min: 0,
            level_max: 0,
            with_slots: false,
          },
        ]),
    ...(preparedCount === 0
      ? []
      : [
          {
            kind: 'choice_from_list',
            rule_key: `${prefix}-prepared`,
            count: preparedCount,
            bucket: 'prepared',
            list: 'Wizard',
            level_min: 1,
            level_max: maximumSpellLevel,
            with_slots: true,
          },
        ]),
  ];
}


describe('persisted class progression catalog', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    ensureBundledSrdSubclassContent(db);
    ensureBundledVeteranSubclassContent(db);
  });

  afterEach(() => {
    connection.close();
  });

  it('persists the bundled class and subclass catalogs at exact cardinality', () => {
    expect(db.scalar('SELECT count(*) FROM class_definitions')).toBe(12);
    expect(db.scalar('SELECT count(*) FROM class_progressions')).toBe(240);
    expect(db.scalar('SELECT count(*) FROM subclass_definitions')).toBe(15);
    expect(db.scalar('SELECT count(*) FROM subclass_progressions')).toBe(40);
    expect(db.scalar('SELECT count(*) FROM subclass_features')).toBe(70);
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

  it('pins the Veteran headings and its complete absence from spell machinery', () => {
    expect(hasBundledVeteranSubclassContent(db)).toBe(true);
    expect(
      db.oneRaw(
        `SELECT subclass.content_key, subclass.name, subclass.rules_edition,
                class.name AS class_name, subclass.spellcasting_ability,
                subclass.caster_fraction, subclass.caster_rounding,
                subclass.grant_rules, subclass.notes
           FROM subclass_definitions AS subclass
           JOIN class_definitions AS class
             ON class.id = subclass.class_definition_id
          WHERE subclass.content_key = '2024:subclass:veteran'`,
      ),
    ).toEqual({
      content_key: '2024:subclass:veteran',
      name: 'Veteran',
      rules_edition: '2024',
      class_name: 'Rogue',
      spellcasting_ability: null,
      caster_fraction: null,
      caster_rounding: null,
      grant_rules: null,
      notes: null,
    });
    expect(
      db.allRaw(
        `SELECT feature.class_level, feature.sort_order, feature.name,
                feature.description
           FROM subclass_features AS feature
           JOIN subclass_definitions AS subclass
             ON subclass.id = feature.subclass_definition_id
          WHERE subclass.content_key = '2024:subclass:veteran'
          ORDER BY feature.sort_order`,
      ),
    ).toEqual([
      { class_level: 3, sort_order: 1, name: 'Seasoned Professional', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 3, sort_order: 2, name: 'Too Old for This', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 3, sort_order: 3, name: 'Deuces Are Wild', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 3, sort_order: 4, name: 'Sure Strike', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 9, sort_order: 5, name: "Veteran's Strike", description: HEADING_ONLY_DESCRIPTION },
      { class_level: 9, sort_order: 6, name: 'Extensive Experience', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 13, sort_order: 7, name: 'Veteran Reflexes', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 13, sort_order: 8, name: 'Critical Instincts', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 13, sort_order: 9, name: 'Fighting Style', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 17, sort_order: 10, name: 'Master of Experience', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 17, sort_order: 11, name: 'Heightened Lethality', description: HEADING_ONLY_DESCRIPTION },
      { class_level: 17, sort_order: 12, name: 'Blindsight', description: HEADING_ONLY_DESCRIPTION },
    ]);
    expect(
      db.scalar(
        `SELECT count(*) FROM subclass_progressions
          WHERE subclass_definition_id = (
            SELECT id FROM subclass_definitions
             WHERE content_key = '2024:subclass:veteran'
          )`,
      ),
    ).toBe(0);
    expect(
      db.scalar(
        `SELECT count(*)
           FROM subclass_feature_effects AS effect
           JOIN subclass_features AS feature
             ON feature.id = effect.subclass_feature_id
           JOIN subclass_definitions AS subclass
             ON subclass.id = feature.subclass_definition_id
          WHERE subclass.content_key = '2024:subclass:veteran'`,
      ),
    ).toBe(0);
  });

  it('exactly repairs the Veteran aggregate without reallocating its stable root', () => {
    const veteranId = db.scalar<number>(
      `SELECT id FROM subclass_definitions
        WHERE content_key = '2024:subclass:veteran'`,
    );
    expect(veteranId).not.toBeNull();
    db.exec(
      `UPDATE subclass_features
          SET class_level = 16, description = 'prose must stay in the doc'
        WHERE subclass_definition_id = ? AND name = 'Blindsight'`,
      [veteranId],
    );
    db.exec(
      `INSERT INTO subclass_progressions (
         subclass_definition_id, class_level, cantrips_known,
         prepared_count, max_spell_level, slots
       ) VALUES (?, 1, 1, 1, 1, '[1]')`,
      [veteranId],
    );

    expect(hasBundledVeteranSubclassContent(db)).toBe(false);
    expect(ensureBundledVeteranSubclassContent(db)).toBe(true);
    expect(hasBundledVeteranSubclassContent(db)).toBe(true);
    expect(
      db.oneRaw(
        `SELECT subclass.id, feature.class_level, feature.sort_order,
                feature.description
           FROM subclass_definitions AS subclass
           JOIN subclass_features AS feature
             ON feature.subclass_definition_id = subclass.id
          WHERE subclass.content_key = '2024:subclass:veteran'
            AND feature.name = 'Blindsight'`,
      ),
    ).toEqual({
      id: veteranId,
      class_level: 17,
      sort_order: 12,
      description: HEADING_ONLY_DESCRIPTION,
    });
    expect(
      db.scalar(
        'SELECT count(*) FROM subclass_progressions WHERE subclass_definition_id = ?',
        [veteranId],
      ),
    ).toBe(0);
  });

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
      { name: 'AT', class_name: 'Rogue', spellcasting_ability: 'intelligence', caster_fraction: '1/3', caster_rounding: 'down' },
      { name: 'Champion', class_name: 'Fighter', spellcasting_ability: null, caster_fraction: null, caster_rounding: null },
      { name: 'Circle of the Land', class_name: 'Druid', spellcasting_ability: 'wisdom', caster_fraction: null, caster_rounding: null },
      { name: 'College of Lore', class_name: 'Bard', spellcasting_ability: 'charisma', caster_fraction: null, caster_rounding: null },
      { name: 'Draconic Sorcery', class_name: 'Sorcerer', spellcasting_ability: 'charisma', caster_fraction: null, caster_rounding: null },
      { name: 'EK', class_name: 'Fighter', spellcasting_ability: 'intelligence', caster_fraction: '1/3', caster_rounding: 'down' },
      { name: 'Evoker', class_name: 'Wizard', spellcasting_ability: 'intelligence', caster_fraction: null, caster_rounding: null },
      { name: 'Fiend Patron', class_name: 'Warlock', spellcasting_ability: 'charisma', caster_fraction: null, caster_rounding: null },
      { name: 'Hunter', class_name: 'Ranger', spellcasting_ability: 'wisdom', caster_fraction: null, caster_rounding: null },
      { name: 'Life Domain', class_name: 'Cleric', spellcasting_ability: 'wisdom', caster_fraction: null, caster_rounding: null },
      { name: 'Oath of Devotion', class_name: 'Paladin', spellcasting_ability: 'charisma', caster_fraction: null, caster_rounding: null },
      { name: 'Path of the Berserker', class_name: 'Barbarian', spellcasting_ability: null, caster_fraction: null, caster_rounding: null },
      { name: 'Thief', class_name: 'Rogue', spellcasting_ability: null, caster_fraction: null, caster_rounding: null },
      { name: 'Veteran', class_name: 'Rogue', spellcasting_ability: null, caster_fraction: null, caster_rounding: null },
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
    expect(persistedRules).toHaveLength(40);
    expect(persistedRules).toEqual(
      EXPECTED_SRD_FIXED_SPELL_RULES.map(
        ([subclassName, rulePrefix, activeFromClassLevel, spellSlug]) =>
          expectedSrdFixedSpellRule(
            subclassName,
            rulePrefix,
            activeFromClassLevel,
            spellSlug,
          ),
      ),
    );
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

  it('persists every legacy third-caster count, slot row, and complete grant-rule payload', () => {
    expect(
      db.allRaw(`
        SELECT subclass.name, progression.class_level,
          progression.cantrips_known, progression.prepared_count,
          progression.max_spell_level, progression.slots,
          progression.grant_rules
        FROM subclass_progressions progression
        JOIN subclass_definitions subclass
          ON subclass.id = progression.subclass_definition_id
        ORDER BY subclass.name, progression.class_level
      `).map((row) => ({
        ...row,
        slots: JSON.parse(String(row.slots)),
        grant_rules: JSON.parse(String(row.grant_rules)),
      })),
    ).toEqual(
      [
        ['AT', 'at', 3, 4],
        ['EK', 'ek', 2, 3],
      ].flatMap(
        ([name, prefix, startingCantrips, levelTenCantrips]) =>
          THIRD_CASTER_LEVELS.map(
            ([classLevel, preparedCount, maximumSpellLevel, slots]) => {
              const cantripsKnown =
                classLevel < 3
                  ? 0
                  : classLevel < 10
                    ? Number(startingCantrips)
                    : Number(levelTenCantrips);
              return {
                name,
                class_level: classLevel,
                cantrips_known: cantripsKnown,
                prepared_count: preparedCount,
                max_spell_level: maximumSpellLevel,
                slots,
                grant_rules: expectedThirdCasterRules(
                  String(prefix),
                  cantripsKnown,
                  preparedCount,
                  maximumSpellLevel,
                ),
              };
            },
          ),
      ),
    );
  });

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
