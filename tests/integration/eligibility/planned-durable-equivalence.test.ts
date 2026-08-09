import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import type {
  CharacterId,
  CharacterRevision,
  ClassDefinitionId,
  ClassLevel,
  GrantOrdinal,
  GrantRuleKey,
} from '../../../src/domain/ids';
import { EligibleSpellSearch } from '../../../src/eligibility/eligible-spell-search';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { LevelUpPlannedEligibleSpells } from '../../../src/queries/level-up-planned-eligible-spells';
import { openTestDatabase } from '../../helpers/open-db';
import { LevelUpClassCommand, LevelUpRefusal } from '../../../src/commands/level-up-class';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { AllocateAbilitiesCommand } from '../../../src/commands/allocate-abilities';
import { CharacterState } from '../../../src/character/character-state';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

describe('planned and durable spell eligibility', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => {
    connection.close();
  });

  it('returns byte-for-DTO identical candidates from one pure constraint', () => {
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Equivalence Wizard')",
    ).lastInsertId;
    new AllocateAbilitiesCommand(db, {
      type: 'allocate_abilities',
      method: 'manual',
      scores: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    }).apply(characterId);
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey: 'class:equivalence-wizard',
      name: 'Equivalence Wizard', keyKind: 'bundled-stable',
    });
    const classId = db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, progression_type)
       VALUES ('class:equivalence-wizard', 'Equivalence Wizard', '2024', 'full')`,
    ).lastInsertId;
    const rules = [{
      kind: 'choice_from_list',
      rule_key: 'stable-prepared',
      count: 2,
      bucket: 'prepared',
      list: 'Wizard',
      level_min: 1,
      level_max: 1,
    }];
    db.exec(
      `INSERT INTO class_progressions (
         class_definition_id, class_level, grant_rules
       ) VALUES (?, 1, ?)`,
      [classId, JSON.stringify(rules)],
    );
    db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level
       ) VALUES (?, ?, 1)`,
      [characterId, classId],
    );
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config
       ) VALUES (?, ?, 'class', ?, 'Equivalence Wizard 1', NULL)`,
      [characterId, crypto.randomUUID(), classId],
    ).lastInsertId;

    for (const [key, name, list] of [
      ['spell:alpha', 'Alpha Ward', 'Wizard'],
      ['spell:beta', 'Beta Ward', 'Wizard'],
      ['spell:cleric', 'Cleric Ward', 'Cleric'],
    ] as const) {
      registerFixtureContentIdentity(db, {
        kind: 'spell', contentKey: key, name, keyKind: 'bundled-stable',
      });
      const identityId = db.exec(
        `INSERT INTO spell_identities (
           content_key, canonical_name, normalized_name
         ) VALUES (?, ?, ?)`,
        [`identity:${key}`, name, name.toLowerCase()],
      ).lastInsertId;
      const versionId = db.exec(
        `INSERT INTO spell_versions (
           content_key, spell_identity_id, display_name, rules_edition,
           level, school, is_active
         ) VALUES (?, ?, ?, '2024', 1, 'Abjuration', 1)`,
        [key, identityId, name],
      ).lastInsertId;
      db.exec(
        `INSERT INTO spell_list_memberships (
           spell_version_id, spell_list_key
         ) VALUES (?, ?)`,
        [versionId, list],
      );
    }

    new GrantRuleSlotGenerator(db).generateForSource(sourceId);
    const slotId = Number(
      db.scalar(
        `SELECT id FROM spell_selection_slots
         WHERE source_instance_id = ? AND rule_key = 'stable-prepared'
           AND ordinal = 1`,
        [sourceId],
      ),
    );
    const durable = new EligibleSpellSearch(db).search(
      characterId,
      slotId,
      'Ward',
    );
    const planned = new LevelUpPlannedEligibleSpells(db).search({
      character_id: characterId as CharacterId,
      expected_revision: 0 as CharacterRevision,
      class_definition_id: classId as ClassDefinitionId,
      target_class_level: 2 as ClassLevel,
      locator: {
        source: { kind: 'selected_class' },
        rule_key: 'stable-prepared' as GrantRuleKey,
        ordinal: 1 as GrantOrdinal,
      },
      query: 'Ward',
    });

    expect(planned).toEqual(durable);
    expect(planned.map((spell) => spell.name)).toEqual([
      'Alpha Ward',
      'Beta Ward',
    ]);

    const selected = planned[0];
    if (selected === undefined) throw new Error('Expected an offered spell.');
    new LevelUpClassCommand(
      db,
      {
        type: 'level_up_class',
        class_definition_id: classId,
        target_level: 2,
        planned_subchoices: {
          skills: [],
          expertise: [],
          spells: [{
            kind: 'slot_selection',
            locator: {
              source: { kind: 'selected_class' },
              rule_key: 'stable-prepared',
              ordinal: 1,
            },
            spell_version_id: selected.id,
            mode: 'new',
          }],
        },
      },
      new CharacterCommandIntegrity('planned-durable-test-key'),
    ).apply(characterId);
    expect(
      new EligibleSpellSearch(db).search(characterId, slotId, 'Ward'),
    ).toEqual(planned);

    const clericId = Number(
      db.scalar(
        `SELECT id FROM spell_versions WHERE content_key = 'spell:cleric'`,
      ),
    );
    const nextPlanned = new LevelUpPlannedEligibleSpells(db).search({
      character_id: characterId as CharacterId,
      expected_revision: 0 as CharacterRevision,
      class_definition_id: classId as ClassDefinitionId,
      target_class_level: 3 as ClassLevel,
      locator: {
        source: { kind: 'selected_class' },
        rule_key: 'stable-prepared' as GrantRuleKey,
        ordinal: 2 as GrantOrdinal,
      },
      query: 'Cleric',
    });
    expect(nextPlanned).toEqual([]);
    const state = new CharacterState(db);
    const beforeRefusal = state.capture(characterId);
    let refusal: unknown;
    try {
      new LevelUpClassCommand(
        db,
        {
          type: 'level_up_class',
          class_definition_id: classId,
          target_level: 3,
          planned_subchoices: {
            skills: [],
            expertise: [],
            spells: [{
              kind: 'slot_selection',
              locator: {
                source: { kind: 'selected_class' },
                rule_key: 'stable-prepared',
                ordinal: 2,
              },
              spell_version_id: clericId,
              mode: 'new',
            }],
          },
        },
        new CharacterCommandIntegrity('planned-durable-test-key'),
      ).apply(characterId);
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(LevelUpRefusal);
    expect(refusal).toMatchObject({
      data: {
        reason: 'planned_subchoice_refused',
        issue: 'spell_not_eligible',
      },
    });
    expect(state.capture(characterId)).toEqual(beforeRefusal);
  });
});
