import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { encodePrimaryAbilityExpression } from '../../../src/domain/primary-ability';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { CharacterWorkspaceBuilder } from '../../../src/queries/character-workspace-builder';
import { LevelUpStateQuery } from '../../../src/queries/level-up-state';
import {
  MulticlassPrimaryAbilityQueries,
} from '../../../src/queries/multiclass-primary-ability';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { openTestDatabase } from '../../helpers/open-db';
import { registerAssertedFixtureContentIdentity } from '../../helpers/content-identity';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';

describe('shared multiclass primary-ability query seam', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function holdClass(name: string, level: number, starting: boolean): void {
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, ?, ?)`,
      [characterId, classId(name), level, starting ? 1 : 0],
    );
  }

  function enterClass(name: string): void {
    new UpdateClassCommand(
      db,
      { type: 'update_class', class_definition_id: classId(name) },
      new CharacterCommandIntegrity('multiclass-primary-ability-test-key'),
    ).apply(characterId);
  }

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    characterId = db.exec(
      `INSERT INTO characters (
         name, ability_allocation_method,
         strength, dexterity, constitution, intelligence, wisdom, charisma
       ) VALUES ('D96 seam', 'manual', 10, 10, 10, 10, 13, 10)`,
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  it('is not applicable to one class even when that class score is below 13', () => {
    holdClass('Wizard', 1, true);

    expect(new MulticlassPrimaryAbilityQueries(db).build(characterId)).toEqual([
      expect.objectContaining({
        class_name: 'Wizard',
        status: 'not_applicable',
        evaluation: null,
        warning: null,
      }),
    ]);
    expect(
      new CharacterWorkspaceBuilder(db).build(characterId).available_classes
        .find((option) => option.name === 'Wizard')?.multiclass_entry,
    ).toEqual({ status: 'not_applicable', refusal: null });
  });

  it('refuses an unmet class before admission and diagnoses an imported illegal multiclass', () => {
    enterClass('Cleric');
    expect(() => enterClass('Wizard')).toThrow(
      'Cannot add Wizard. Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.',
    );
    expect(
      db.scalar(
        `SELECT COUNT(*) FROM character_class_levels AS level
         JOIN class_definitions AS definition
           ON definition.id = level.class_definition_id
         WHERE level.character_id = ? AND definition.name = 'Wizard'`,
        [characterId],
      ),
    ).toBe(0);

    // Imported/legacy images can still contain an illegal multiclass. The
    // reader diagnoses that tolerated state without turning it into a writer.
    holdClass('Wizard', 1, false);
    const wizardSourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (?, ?, 'class', ?, 'Wizard 1',
         '{"spellcasting_ability":"intelligence"}', 2, 'active')`,
      [characterId, crypto.randomUUID(), classId('Wizard')],
    ).lastInsertId;
    new GrantRuleSlotGenerator(db).generateForSource(wizardSourceId);

    const assessments = new MulticlassPrimaryAbilityQueries(db).build(
      characterId,
    );
    expect(
      assessments.map((assessment) => ({
        class_name: assessment.class_name,
        status: assessment.status,
        warning: assessment.warning?.detail ?? null,
      })),
    ).toEqual([
      { class_name: 'Cleric', status: 'met', warning: null },
      {
        class_name: 'Wizard',
        status: 'unmet',
        warning:
          'Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.',
      },
    ]);

    const workspace = new CharacterWorkspaceBuilder(db).build(characterId);
    expect(
      workspace.classes.find((entry) => entry.name === 'Cleric')
        ?.multiclass_prerequisite_warning,
    ).toBeNull();
    expect(
      workspace.classes.find((entry) => entry.name === 'Wizard')
        ?.multiclass_prerequisite_warning,
    ).toMatchObject({
      kind: 'multiclass_primary_ability_unmet',
      class_name: 'Wizard',
      class_catalog_layer: 'bundled',
      detail:
        'Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.',
    });

    const levelUp = new LevelUpStateQuery(db).build(characterId);
    expect(levelUp.kind).toBe('ready');
    if (levelUp.kind !== 'ready') {
      throw new Error('The imported multiclass did not produce a readable state.');
    }
    const wizard = levelUp.class_options.find(
      (option) => option.name === 'Wizard',
    );
    expect(wizard).toMatchObject({
      guideability: 'guideable',
      multiclass_prerequisite_warning: {
        kind: 'multiclass_primary_ability_unmet',
        class_name: 'Wizard',
        class_catalog_layer: 'bundled',
      },
    });
    expect(levelUp.character.warnings).toContainEqual(
      expect.objectContaining({
        kind: 'multiclass_primary_ability_unmet',
        class_name: 'Wizard',
        class_catalog_layer: 'bundled',
      }),
    );

    expect(new CharacterSheetBuilder(db).build(characterId).warnings).toContainEqual({
      code: 'multiclass_primary_ability_unmet',
      message:
        'Wizard multiclass ability minimum not met — SRD · bundled layer. Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10. Raise the named score before adding another class, or remove Wizard if it was added outside the default rules path.',
    });
  });

  it('admits an eligible multiclass through the same command gate', () => {
    db.exec(
      `UPDATE characters
       SET strength = 13, intelligence = 13
       WHERE id = ?`,
      [characterId],
    );
    enterClass('Fighter');
    expect(() => enterClass('Wizard')).not.toThrow();
    expect(
      db.allRaw(
        `SELECT definition.name
         FROM character_class_levels AS level
         JOIN class_definitions AS definition
           ON definition.id = level.class_definition_id
         WHERE level.character_id = ?
         ORDER BY level.id`,
        [characterId],
      ).map((row) => String(row.name)),
    ).toEqual(['Fighter', 'Wizard']);
  });

  it('admits an otherwise blocked update_class entry only through the exact per-character house rule', () => {
    enterClass('Cleric');
    expect(() => enterClass('Wizard')).toThrow(
      'Cannot add Wizard. Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.',
    );

    db.exec(
      `INSERT INTO character_rule_overrides (character_id, rule_key, value)
       VALUES (?, 'ignore_multiclass_prerequisites', 'true')`,
      [characterId],
    );

    const waived = new CharacterWorkspaceBuilder(db).build(characterId);
    expect(
      waived.available_classes.find((option) => option.name === 'Wizard')
        ?.multiclass_entry,
    ).toEqual({
      status: 'waived',
      refusal: null,
      explanation: 'House rule: prerequisites waived.',
    });
    expect(() => enterClass('Wizard')).not.toThrow();
    expect(
      waived.multiclass_prerequisite_house_rule,
    ).toEqual({ status: 'on' });
    expect(
      new CharacterSheetBuilder(db).build(characterId).warnings.map(
        (warning) => warning.code,
      ),
    ).toContain('multiclass_primary_ability_unmet');
  });

  it('treats an absent authored prerequisite as no requirement while enforcing every declared class requirement', () => {
    const contentKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'class',
      edition: 'expanded',
      name: 'Freeform',
    });
    const freeformId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type,
         primary_ability_expression
       ) VALUES (?, 'Freeform', 'expanded', 'none', NULL)`,
      [contentKey],
    ).lastInsertId;
    db.exec(
      `INSERT INTO class_progressions (
         class_definition_id, class_level, grant_rules
       ) VALUES (?, 1, '[]')`,
      [freeformId],
    );

    enterClass('Cleric');
    expect(() => enterClass('Freeform')).not.toThrow();
    expect(
      new MulticlassPrimaryAbilityQueries(db).build(characterId).find(
        (assessment) => assessment.class_name === 'Freeform',
      ),
    ).toMatchObject({
      status: 'not_applicable',
      evaluation: null,
      warning: null,
    });

    db.exec(
      `UPDATE class_definitions
       SET primary_ability_expression = '   '
       WHERE id = ?`,
      [freeformId],
    );
    expect(
      new MulticlassPrimaryAbilityQueries(db).build(characterId).find(
        (assessment) => assessment.class_name === 'Freeform',
      ),
    ).toMatchObject({
      status: 'not_applicable',
      evaluation: null,
      warning: null,
    });

    // Blank Freeform contributes no invented requirement, but it does not
    // excuse the candidate Wizard's declared Intelligence minimum.
    expect(() => enterClass('Wizard')).toThrow(
      'Cannot add Wizard. Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.',
    );

    // Non-empty malformed content is different: the held class now has a
    // declared requirement that cannot be verified, so entry remains closed.
    db.exec(
      `UPDATE class_definitions
       SET primary_ability_expression = '{broken'
       WHERE id = ?`,
      [freeformId],
    );
    expect(() => enterClass('Wizard')).toThrow(
      'Cannot add Wizard. Freeform has a stored primary-ability expression this application cannot read, so its multiclass minimum cannot be judged. Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.',
    );
  });

  it('checks the current-class side and clears both surfaces at the exact threshold', () => {
    db.exec(
      `UPDATE characters SET intelligence = 13, wisdom = 10 WHERE id = ?`,
      [characterId],
    );
    holdClass('Cleric', 1, true);
    holdClass('Wizard', 4, false);

    const first = new MulticlassPrimaryAbilityQueries(db).build(characterId);
    expect(first.map((assessment) => [assessment.class_name, assessment.status]))
      .toEqual([
        ['Cleric', 'unmet'],
        ['Wizard', 'met'],
      ]);
    expect(first[0]?.warning?.detail).toBe(
      'Cleric requires Wisdom 13 to multiclass; its current score is Wisdom 10.',
    );

    db.exec('UPDATE characters SET wisdom = 13 WHERE id = ?', [characterId]);
    const met = new MulticlassPrimaryAbilityQueries(db).build(characterId);
    expect(met.map((assessment) => assessment.status)).toEqual(['met', 'met']);
    expect(met.map((assessment) => assessment.warning)).toEqual([null, null]);
    expect(
      new CharacterWorkspaceBuilder(db).build(characterId).classes.map(
        (entry) => entry.multiclass_prerequisite_warning,
      ),
    ).toEqual([null, null]);
    expect(
      new CharacterSheetBuilder(db).build(characterId).warnings.map(
        (warning) => warning.code,
      ),
    ).not.toContain('multiclass_primary_ability_unmet');
  });

  it.each([
    { strength: 13, dexterity: 8 },
    { strength: 8, dexterity: 13 },
  ])('accepts either side of Fighter one_of: $strength/$dexterity', ({
    strength,
    dexterity,
  }) => {
    db.exec(
      `UPDATE characters
       SET strength = ?, dexterity = ?, intelligence = 13
       WHERE id = ?`,
      [strength, dexterity, characterId],
    );
    holdClass('Fighter', 1, true);
    holdClass('Wizard', 1, false);

    expect(
      new MulticlassPrimaryAbilityQueries(db).build(characterId).map(
        (assessment) => [assessment.class_name, assessment.status],
      ),
    ).toEqual([
      ['Fighter', 'met'],
      ['Wizard', 'met'],
    ]);
  });

  it('evaluates a homebrew expression and distinguishes an unknown expression from a pass', () => {
    const homebrewContentKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'class',
      edition: 'expanded',
      name: 'Chronomancer',
    });
    const homebrewId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type,
         primary_ability_expression
       ) VALUES (?, 'Chronomancer', 'expanded', 'none', ?)`,
      [
        homebrewContentKey,
        encodePrimaryAbilityExpression({
          kind: 'all_of',
          abilities: ['charisma'],
        }),
      ],
    ).lastInsertId;
    holdClass('Wizard', 1, true);
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, 1, 0)`,
      [characterId, homebrewId],
    );

    const sourced = new MulticlassPrimaryAbilityQueries(db).build(characterId);
    expect(
      sourced.find((assessment) => assessment.class_name === 'Chronomancer'),
    ).toMatchObject({
      status: 'unmet',
      warning: {
        class_catalog_layer: 'external',
        detail:
          'Chronomancer requires Charisma 13 to multiclass; its current score is Charisma 10.',
      },
    });

    db.exec(
      `UPDATE class_definitions
       SET primary_ability_expression = NULL
       WHERE id = ?`,
      [homebrewId],
    );
    expect(
      new MulticlassPrimaryAbilityQueries(db)
        .build(characterId)
        .find((assessment) => assessment.class_name === 'Chronomancer'),
    ).toMatchObject({
      status: 'not_applicable',
      evaluation: null,
      warning: null,
    });

    db.exec(
      `UPDATE class_definitions
       SET primary_ability_expression = '{broken'
       WHERE id = ?`,
      [homebrewId],
    );
    expect(
      new MulticlassPrimaryAbilityQueries(db)
        .build(characterId)
        .find((assessment) => assessment.class_name === 'Chronomancer'),
    ).toMatchObject({
      status: 'unprovable',
      warning: {
        kind: 'multiclass_primary_ability_unprovable',
        detail:
          'Chronomancer has a stored primary-ability expression this application cannot read, so its multiclass minimum cannot be judged.',
      },
    });
  });
});
