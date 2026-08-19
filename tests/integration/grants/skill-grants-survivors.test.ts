import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SKILL_GRANT_KEYS } from '../../../src/builder/contracts';
import { DatabaseContext } from '../../../src/db/database';
import { skills, type Skill } from '../../../src/domain/enums';
import {
  classSkillGrantsFilled,
  fillSkillGrant,
  mintFilledSkillGrants,
  resolveSkillGrants,
  SkillGrantDuplicateSelectionError,
  SkillGrantDuplicateSourceSkillError,
  SkillGrantRefusal,
  StoredSkillGrantSkillError,
  StoredSkillGrantStateError,
  syncClassSkillGrants,
  syncSpeciesSkillGrants,
  syncToolAlternativeSkillGrants,
  unfilledSpeciesSkillGrants,
  type SkillGrantSource,
} from '../../../src/grants/skill-grants';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { openTestDatabase } from '../../helpers/open-db';

function caught(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected the operation to throw.');
}

describe('skill grant survivor state tables', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Skill Matrix')",
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  function identity(kind: 'class' | 'species' | 'feat', name: string, key?: string): string {
    const contentKey = key ?? `fixture:${kind}:${crypto.randomUUID()}`;
    registerFixtureContentIdentity(db, {
      kind,
      contentKey,
      name,
      keyKind: 'bundled-stable',
    });
    return contentKey;
  }

  function source(
    sourceType: 'class' | 'species' | 'feat' | 'background',
    sourceDefinitionId: number | null = null,
  ): SkillGrantSource {
    const id = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, state
       ) VALUES (?, ?, ?, ?, 'Skill fixture', '{}', 'active')`,
      [characterId, crypto.randomUUID(), sourceType, sourceDefinitionId],
    ).lastInsertId;
    return { id, characterId, sourceType, sourceDefinitionId };
  }

  function grant(
    owner: SkillGrantSource,
    grantKey: string,
    ordinal: number,
    skill: Skill | null,
    state: 'active' | 'orphaned' = 'active',
  ): number {
    return db.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal, skill, state,
         orphan_reason_code, orphaned_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        owner.id,
        grantKey,
        ordinal,
        skill,
        state,
        state === 'orphaned' ? 'fixture_orphan' : null,
        state === 'orphaned' ? '2040-01-01T00:00:00.000Z' : null,
      ],
    ).lastInsertId;
  }

  function classDefinition(
    name: string,
    traits: {
      readonly count: number;
      readonly fromAny?: boolean;
      readonly multiclassCount?: number;
      readonly multiclassPool?: 'none' | 'class_list' | 'any';
    } | null,
    options: readonly Skill[] = [],
  ): number {
    const classId = db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, progression_type)
       VALUES (?, ?, '2024', 'none')`,
      [identity('class', name), name],
    ).lastInsertId;
    if (traits !== null) {
      db.exec(
        `INSERT INTO class_sheet_traits (
           class_definition_id, hit_die, skill_choice_count,
           skill_choice_from_any, multiclass_skill_choice_count,
           multiclass_skill_choice_pool
         ) VALUES (?, 8, ?, ?, ?, ?)`,
        [
          classId,
          traits.count,
          traits.fromAny === true ? 1 : 0,
          traits.multiclassCount ?? 0,
          traits.multiclassPool ?? 'none',
        ],
      );
    }
    for (const skill of options) {
      db.exec(
        'INSERT INTO class_skill_options (class_definition_id, skill) VALUES (?, ?)',
        [classId, skill],
      );
    }
    return classId;
  }

  function ownClass(
    classId: number,
    starting: boolean,
  ): void {
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, 1, ?)`,
      [characterId, classId, starting ? 1 : 0],
    );
  }

  function speciesDefinition(
    name: string,
    contentKey: string,
    rules: readonly Record<string, unknown>[] = [],
  ): number {
    return db.exec(
      `INSERT INTO species_definitions
         (content_key, name, rules_edition, grant_rules)
       VALUES (?, ?, '2024', ?)`,
      [identity('species', name, contentKey), name, JSON.stringify(rules)],
    ).lastInsertId;
  }

  function featDefinition(
    name: string,
    rules: readonly Record<string, unknown>[],
  ): number {
    return db.exec(
      `INSERT INTO feat_definitions
         (content_key, name, rules_edition, grant_rules)
       VALUES (?, ?, '2024', ?)`,
      [identity('feat', name), name, JSON.stringify(rules)],
    ).lastInsertId;
  }

  function rows(owner: SkillGrantSource): unknown[] {
    return db.allRaw(
      `SELECT grant_key, ordinal, skill, state, orphan_reason_code,
              orphaned_at
       FROM character_skill_grants
       WHERE source_instance_id = ? ORDER BY grant_key, ordinal`,
      [owner.id],
    );
  }

  it('refuses corrupt persisted skill and state discriminants by structured type', () => {
    const owner = source('feat');
    const id = grant(owner, 'corrupt', 1, 'arcana');
    db.exec('PRAGMA ignore_check_constraints = ON');

    db.exec("UPDATE character_skill_grants SET skill = 'chronomancy' WHERE id = ?", [id]);
    expect(caught(() => resolveSkillGrants(db, characterId))).toEqual(
      expect.objectContaining<Partial<StoredSkillGrantSkillError>>({
        name: 'StoredSkillGrantSkillError',
        skill: 'chronomancy',
      }),
    );

    db.exec("UPDATE character_skill_grants SET skill = 'arcana', state = 'future' WHERE id = ?", [id]);
    expect(caught(() => resolveSkillGrants(db, characterId))).toEqual(
      expect.objectContaining<Partial<StoredSkillGrantStateError>>({
        name: 'StoredSkillGrantStateError',
        state: 'future',
      }),
    );
  });

  it('pins tool-alternative cardinality, nulls, uniqueness, ownership, and row transitions', () => {
    const owner = source('feat');
    syncToolAlternativeSkillGrants(db, owner, 'tools-or-skills', 2, ['arcana']);
    expect(rows(owner)).toEqual([{
      grant_key: 'tools-or-skills',
      ordinal: 1,
      skill: 'arcana',
      state: 'active',
      orphan_reason_code: null,
      orphaned_at: null,
    }]);

    syncToolAlternativeSkillGrants(db, owner, 'tools-or-skills', 2, [
      'arcana',
      'history',
    ]);
    expect(rows(owner).map((row) => ({
      ordinal: (row as { ordinal: number }).ordinal,
      skill: (row as { skill: string }).skill,
      state: (row as { state: string }).state,
    }))).toEqual([
      { ordinal: 1, skill: 'arcana', state: 'active' },
      { ordinal: 2, skill: 'history', state: 'active' },
    ]);

    expect(() => syncToolAlternativeSkillGrants(
      db,
      owner,
      'tools-or-skills',
      2,
      ['arcana', 'history', null],
    )).toThrow(RangeError);
    const duplicate = caught(() => syncToolAlternativeSkillGrants(
      db,
      owner,
      'tools-or-skills',
      2,
      ['arcana', 'arcana'],
    ));
    expect(duplicate).toBeInstanceOf(SkillGrantDuplicateSelectionError);
    expect(duplicate).toMatchObject({ grant_key: 'tools-or-skills' });

    syncToolAlternativeSkillGrants(db, owner, 'tools-or-skills', 2, [
      'nature',
      null,
    ]);
    expect(rows(owner)).toEqual([
      {
        grant_key: 'tools-or-skills',
        ordinal: 1,
        skill: 'nature',
        state: 'active',
        orphan_reason_code: null,
        orphaned_at: null,
      },
      expect.objectContaining({
        grant_key: 'tools-or-skills',
        ordinal: 2,
        skill: 'history',
        state: 'orphaned',
        orphan_reason_code: 'rule_no_longer_active',
      }),
    ]);

    const other = source('background');
    grant(other, 'held-elsewhere', 1, 'insight');
    const refusal = caught(() => syncToolAlternativeSkillGrants(
      db,
      owner,
      'tools-or-skills',
      2,
      ['insight'],
    ));
    expect(refusal).toBeInstanceOf(SkillGrantRefusal);
    expect(refusal).toMatchObject({
      reason: 'skill_already_held',
      skill: 'insight',
    });
  });

  it('reconciles class entitlements across insert, revive, collision, orphan, and absent definitions', () => {
    const classId = classDefinition(
      'Two-skill class',
      { count: 2 },
      ['arcana', 'history', 'nature'],
    );
    ownClass(classId, true);
    const owner = source('class', classId);
    const revivedId = grant(owner, SKILL_GRANT_KEYS.classSkill, 1, 'arcana', 'orphaned');
    const staleId = grant(owner, SKILL_GRANT_KEYS.classSkill, 3, null);

    syncClassSkillGrants(db, owner);
    expect(rows(owner)).toEqual([
      {
        grant_key: SKILL_GRANT_KEYS.classSkill,
        ordinal: 1,
        skill: 'arcana',
        state: 'active',
        orphan_reason_code: null,
        orphaned_at: null,
      },
      {
        grant_key: SKILL_GRANT_KEYS.classSkill,
        ordinal: 2,
        skill: null,
        state: 'active',
        orphan_reason_code: null,
        orphaned_at: null,
      },
      expect.objectContaining({
        grant_key: SKILL_GRANT_KEYS.classSkill,
        ordinal: 3,
        skill: null,
        state: 'orphaned',
        orphan_reason_code: 'rule_no_longer_active',
      }),
    ]);
    expect(Number(db.scalar('SELECT id FROM character_skill_grants WHERE source_instance_id = ? AND ordinal = 1', [owner.id]))).toBe(revivedId);
    expect(Number(db.scalar('SELECT id FROM character_skill_grants WHERE source_instance_id = ? AND ordinal = 3', [owner.id]))).toBe(staleId);

    const other = source('background');
    db.exec(
      "UPDATE character_skill_grants SET state = 'orphaned' WHERE id = ?",
      [revivedId],
    );
    grant(other, 'other-owner', 1, 'arcana');
    syncClassSkillGrants(db, owner);
    expect(db.oneRaw(
      'SELECT state, skill, orphan_reason_code, orphaned_at FROM character_skill_grants WHERE id = ?',
      [revivedId],
    )).toEqual({
      state: 'active',
      skill: null,
      orphan_reason_code: null,
      orphaned_at: null,
    });

    const missingLevelClass = classDefinition('Missing level class', { count: 1 });
    const missingLevelSource = source('class', missingLevelClass);
    grant(missingLevelSource, SKILL_GRANT_KEYS.classSkill, 1, null);
    syncClassSkillGrants(db, missingLevelSource);
    expect(rows(missingLevelSource)).toEqual([
      expect.objectContaining({ state: 'orphaned', orphan_reason_code: 'rule_no_longer_active' }),
    ]);

    const missingTraitsClass = classDefinition('Missing traits class', null);
    ownClass(missingTraitsClass, true);
    const missingTraitsSource = source('class', missingTraitsClass);
    grant(missingTraitsSource, SKILL_GRANT_KEYS.classSkill, 1, null);
    syncClassSkillGrants(db, missingTraitsSource);
    expect(rows(missingTraitsSource)).toEqual([
      expect.objectContaining({ state: 'orphaned', orphan_reason_code: 'rule_no_longer_active' }),
    ]);

    const noDefinitionSource = source('feat');
    grant(noDefinitionSource, SKILL_GRANT_KEYS.classSkill, 1, null);
    syncClassSkillGrants(db, noDefinitionSource);
    expect(rows(noDefinitionSource)).toEqual([
      expect.objectContaining({ state: 'orphaned', orphan_reason_code: 'rule_no_longer_active' }),
    ]);
  });

  it('treats a corrupted multiclass none-pool count as zero', () => {
    const classId = classDefinition('None-pool multiclass', { count: 1 });
    ownClass(classId, false);
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `UPDATE class_sheet_traits
       SET multiclass_skill_choice_count = 2,
           multiclass_skill_choice_pool = 'none'
       WHERE class_definition_id = ?`,
      [classId],
    );
    const owner = source('class', classId);
    syncClassSkillGrants(db, owner);
    expect(rows(owner)).toEqual([]);
  });

  it('derives bundled and authored species pools, dynamic keys, and held-skill subtraction exactly', () => {
    const humanId = speciesDefinition(
      'Human fixture',
      '2024:species:human',
    );
    const humanSource = source('species', humanId);
    syncSpeciesSkillGrants(db, humanSource);

    const heldSource = source('background');
    grant(heldSource, 'held', 1, 'arcana');
    expect(unfilledSpeciesSkillGrants(db, characterId)).toEqual([{
      grant_id: Number(db.scalar(
        'SELECT id FROM character_skill_grants WHERE source_instance_id = ?',
        [humanSource.id],
      )),
      source_instance_id: humanSource.id,
      grant_key: SKILL_GRANT_KEYS.speciesSkillful,
      ordinal: 1,
      available: skills.filter((skill) => skill !== 'arcana'),
    }]);

    const authoredRules = [{
      kind: 'skill_proficiency',
      rule_key: 'authored-lore',
      count: 1,
      skills: ['history', 'nature'],
    }];
    const authoredId = speciesDefinition(
      'Authored skill species',
      'fixture:species:authored-skill',
      authoredRules,
    );
    const authoredSource = source('species', authoredId);
    grant(authoredSource, 'retired-authored-key', 1, null);
    syncSpeciesSkillGrants(db, authoredSource);
    expect(rows(authoredSource)).toEqual([
      {
        grant_key: 'authored-lore',
        ordinal: 1,
        skill: null,
        state: 'active',
        orphan_reason_code: null,
        orphaned_at: null,
      },
      expect.objectContaining({
        grant_key: 'retired-authored-key',
        ordinal: 1,
        state: 'orphaned',
        orphan_reason_code: 'rule_no_longer_active',
      }),
    ]);
    expect(
      unfilledSpeciesSkillGrants(db, characterId)
        .find((entry) => entry.source_instance_id === authoredSource.id),
    ).toEqual({
      grant_id: Number(db.scalar(
        "SELECT id FROM character_skill_grants WHERE source_instance_id = ? AND grant_key = 'authored-lore'",
        [authoredSource.id],
      )),
      source_instance_id: authoredSource.id,
      grant_key: 'authored-lore',
      ordinal: 1,
      available: ['history', 'nature'],
    });
  });

  it('pins class resolver shapes, completion, named/any pools, clear, and every fill refusal boundary', () => {
    const namedClass = classDefinition(
      'Named pool class',
      { count: 1 },
      ['arcana', 'history'],
    );
    ownClass(namedClass, true);
    const namedSource = source('class', namedClass);
    syncClassSkillGrants(db, namedSource);
    const namedGrantId = Number(db.scalar(
      'SELECT id FROM character_skill_grants WHERE source_instance_id = ?',
      [namedSource.id],
    ));
    expect(resolveSkillGrants(db, characterId).unfilledClassGrants).toEqual([{
      grant_id: namedGrantId,
      source_instance_id: namedSource.id,
      grant_key: SKILL_GRANT_KEYS.classSkill,
      ordinal: 1,
      class_definition_id: namedClass,
      class_name: 'Named pool class',
      class_catalog_layer: 'bundled',
      available: ['arcana', 'history'],
    }]);
    expect(classSkillGrantsFilled(db, characterId)).toBe(false);

    expect(caught(() => fillSkillGrant(db, characterId, 999_999, 'arcana')))
      .toMatchObject({ reason: 'grant_not_found', skill: null });
    expect(caught(() => fillSkillGrant(db, characterId, namedGrantId, 'nature')))
      .toMatchObject({ reason: 'skill_not_in_pool', skill: 'nature' });

    fillSkillGrant(db, characterId, namedGrantId, 'arcana');
    expect(resolveSkillGrants(db, characterId).skills).toEqual(['arcana']);
    expect(classSkillGrantsFilled(db, characterId)).toBe(true);
    expect(caught(() => fillSkillGrant(db, characterId, namedGrantId, 'history')))
      .toMatchObject({ reason: 'grant_already_filled', skill: 'arcana' });
    fillSkillGrant(db, characterId, namedGrantId, null);
    expect(db.oneRaw(
      'SELECT skill, state FROM character_skill_grants WHERE id = ?',
      [namedGrantId],
    )).toEqual({ skill: null, state: 'active' });

    const holder = source('background');
    grant(holder, 'held', 1, 'history');
    expect(caught(() => fillSkillGrant(db, characterId, namedGrantId, 'history')))
      .toMatchObject({ reason: 'skill_already_held', skill: 'history' });

    db.exec(
      "UPDATE character_skill_grants SET state = 'orphaned' WHERE id = ?",
      [namedGrantId],
    );
    expect(caught(() => fillSkillGrant(db, characterId, namedGrantId, 'arcana')))
      .toMatchObject({ reason: 'grant_not_found', skill: null });

    const anyClass = classDefinition('Any pool class', { count: 1, fromAny: true });
    ownClass(anyClass, true);
    const anySource = source('class', anyClass);
    syncClassSkillGrants(db, anySource);
    const anyGrantId = Number(db.scalar(
      'SELECT id FROM character_skill_grants WHERE source_instance_id = ?',
      [anySource.id],
    ));
    fillSkillGrant(db, characterId, anyGrantId, 'survival');
    expect(db.scalar('SELECT skill FROM character_skill_grants WHERE id = ?', [anyGrantId]))
      .toBe('survival');

    const toolFeatId = featDefinition('Tool alternative feat', [{
      kind: 'skill_proficiency',
      rule_key: 'tool-alternative',
      count: 1,
      allows_tool_instead: true,
    }]);
    const toolSource = source('feat', toolFeatId);
    const toolGrantId = grant(toolSource, 'tool-alternative', 1, null);
    fillSkillGrant(db, characterId, toolGrantId, 'athletics');
    expect(db.scalar('SELECT skill FROM character_skill_grants WHERE id = ?', [toolGrantId]))
      .toBe('athletics');

    const missingDefinitionSource = source('class', 999_999);
    const missingDefinitionGrant = grant(
      missingDefinitionSource,
      SKILL_GRANT_KEYS.classSkill,
      1,
      null,
    );
    expect(
      resolveSkillGrants(db, characterId).unfilledClassGrants
        .find((entry) => entry.grant_id === missingDefinitionGrant),
    ).toEqual({
      grant_id: missingDefinitionGrant,
      source_instance_id: missingDefinitionSource.id,
      grant_key: SKILL_GRANT_KEYS.classSkill,
      ordinal: 1,
      class_definition_id: 999_999,
      class_name: null,
      class_catalog_layer: 'unknown',
      available: [],
    });
    expect(caught(() => fillSkillGrant(
      db,
      characterId,
      missingDefinitionGrant,
      'arcana',
    ))).toMatchObject({ reason: 'skill_not_in_pool', skill: 'arcana' });
  });

  it('pins duplicate source lists, exact ordinals, and cross-source ownership', () => {
    const owner = source('background');
    const duplicate = caught(() => mintFilledSkillGrants(
      db,
      characterId,
      owner.id,
      'printed-background',
      ['arcana', 'arcana'],
    ));
    expect(duplicate).toBeInstanceOf(SkillGrantDuplicateSourceSkillError);
    expect(duplicate).toMatchObject({ skill: 'arcana' });
    expect(rows(owner)).toEqual([{
      grant_key: 'printed-background',
      ordinal: 1,
      skill: 'arcana',
      state: 'active',
      orphan_reason_code: null,
      orphaned_at: null,
    }]);
    db.exec('DELETE FROM character_skill_grants WHERE source_instance_id = ?', [owner.id]);

    mintFilledSkillGrants(
      db,
      characterId,
      owner.id,
      'printed-background',
      ['arcana', 'history'],
    );
    expect(rows(owner).map((row) => ({
      ordinal: (row as { ordinal: number }).ordinal,
      skill: (row as { skill: string }).skill,
      state: (row as { state: string }).state,
    }))).toEqual([
      { ordinal: 1, skill: 'arcana', state: 'active' },
      { ordinal: 2, skill: 'history', state: 'active' },
    ]);

    const other = source('background');
    expect(caught(() => mintFilledSkillGrants(
      db,
      characterId,
      other.id,
      'other-background',
      ['history'],
    ))).toMatchObject({ reason: 'skill_already_held', skill: 'history' });
    expect(rows(other)).toEqual([]);
  });
});
