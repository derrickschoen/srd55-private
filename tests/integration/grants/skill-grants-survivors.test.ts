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

  it('revives an orphaned tool-alternative skill without re-orphaning it', () => {
    const owner = source('feat');
    const grantId = grant(
      owner,
      'tools-or-skills',
      1,
      'nature',
      'orphaned',
    );

    syncToolAlternativeSkillGrants(
      db,
      owner,
      'tools-or-skills',
      1,
      ['nature'],
    );

    expect(db.oneRaw(
      `SELECT id, skill, state, orphan_reason_code, orphaned_at
       FROM character_skill_grants WHERE id = ?`,
      [grantId],
    )).toEqual({
      id: grantId,
      skill: 'nature',
      state: 'active',
      orphan_reason_code: null,
      orphaned_at: null,
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

  it('pins each tool-alternative row transition and leaves a true no-op untouched', () => {
    // Type-level lifecycle contract: active rows carry the selected skill;
    // omitted ordinals become orphaned; every stale lifecycle field is cleared
    // when an addressed row is made active again.
    const owner = source('feat');
    const firstId = grant(owner, 'tools-or-skills', 1, 'arcana');
    const secondId = grant(owner, 'tools-or-skills', 2, 'history');
    db.exec(
      "UPDATE character_skill_grants SET updated_at = '2000-01-01T00:00:00.000Z' WHERE id = ?",
      [firstId],
    );

    syncToolAlternativeSkillGrants(db, owner, 'tools-or-skills', 2, [
      'arcana',
      'history',
    ]);
    expect(db.scalar(
      'SELECT updated_at FROM character_skill_grants WHERE id = ?',
      [firstId],
    )).toBe('2000-01-01T00:00:00.000Z');

    db.exec(
      `UPDATE character_skill_grants
       SET state = 'orphaned', orphan_reason_code = NULL,
           orphaned_at = NULL, updated_at = '2001-01-01T00:00:00.000Z'
       WHERE id = ?`,
      [firstId],
    );
    syncToolAlternativeSkillGrants(db, owner, 'tools-or-skills', 2, [
      'arcana',
      'history',
    ]);
    expect(db.oneRaw(
      `SELECT state, skill, orphan_reason_code, orphaned_at
       FROM character_skill_grants WHERE id = ?`,
      [firstId],
    )).toEqual({
      state: 'active',
      skill: 'arcana',
      orphan_reason_code: null,
      orphaned_at: null,
    });

    db.exec(
      `UPDATE character_skill_grants
       SET orphan_reason_code = 'stale_reason', orphaned_at = NULL
       WHERE id = ?`,
      [firstId],
    );
    syncToolAlternativeSkillGrants(db, owner, 'tools-or-skills', 2, [
      'arcana',
      'history',
    ]);
    expect(db.scalar(
      'SELECT orphan_reason_code FROM character_skill_grants WHERE id = ?',
      [firstId],
    )).toBeNull();

    db.exec(
      `UPDATE character_skill_grants
       SET orphaned_at = '2002-01-01T00:00:00.000Z'
       WHERE id = ?`,
      [firstId],
    );
    syncToolAlternativeSkillGrants(db, owner, 'tools-or-skills', 2, [
      'arcana',
      'history',
    ]);
    expect(db.scalar(
      'SELECT orphaned_at FROM character_skill_grants WHERE id = ?',
      [firstId],
    )).toBeNull();

    syncToolAlternativeSkillGrants(db, owner, 'tools-or-skills', 2, ['arcana']);
    expect(db.oneRaw(
      `SELECT state, orphan_reason_code FROM character_skill_grants
       WHERE id = ?`,
      [secondId],
    )).toEqual({
      state: 'orphaned',
      orphan_reason_code: 'rule_no_longer_active',
    });
  });

  it('gates class reconciliation by source kind and preserves no-op timestamps', () => {
    // Type-level source contract: only a class source with a definition can
    // mint class_skill ordinals; active desired and orphaned stale rows are
    // reconciliation no-ops, including their timestamps.
    const classId = classDefinition('One-skill class', { count: 1 }, ['arcana']);
    ownClass(classId, true);

    const wrongKind = source('feat', classId);
    grant(wrongKind, SKILL_GRANT_KEYS.classSkill, 1, null);
    syncClassSkillGrants(db, wrongKind);
    expect(rows(wrongKind)).toEqual([
      expect.objectContaining({
        state: 'orphaned',
        orphan_reason_code: 'rule_no_longer_active',
      }),
    ]);

    const owner = source('class', classId);
    const activeId = grant(owner, SKILL_GRANT_KEYS.classSkill, 1, null);
    const orphanedId = grant(
      owner,
      SKILL_GRANT_KEYS.classSkill,
      2,
      null,
      'orphaned',
    );
    db.exec(
      `UPDATE character_skill_grants SET updated_at =
       CASE id WHEN ? THEN '2003-01-01T00:00:00.000Z'
               ELSE '2004-01-01T00:00:00.000Z' END
       WHERE id IN (?, ?)`,
      [activeId, activeId, orphanedId],
    );
    syncClassSkillGrants(db, owner);
    expect(db.allRaw(
      `SELECT id, state, updated_at FROM character_skill_grants
       WHERE id IN (?, ?) ORDER BY id`,
      [activeId, orphanedId],
    )).toEqual([
      {
        id: activeId,
        state: 'active',
        updated_at: '2003-01-01T00:00:00.000Z',
      },
      {
        id: orphanedId,
        state: 'orphaned',
        updated_at: '2004-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('uses the multiclass any-skill pool rather than the starting-class flag', () => {
    // Type-level entitlement contract: entered classes read the multiclass
    // count/pool columns, not the starting-class skill_choice_from_any column.
    const classId = classDefinition('Any-skill multiclass', {
      count: 1,
      fromAny: false,
      multiclassCount: 1,
      multiclassPool: 'any',
    }, ['arcana']);
    ownClass(classId, false);
    const owner = source('class', classId);

    syncClassSkillGrants(db, owner);
    const unfilled = resolveSkillGrants(db, characterId).unfilledClassGrants;
    expect(unfilled).toHaveLength(1);
    expect(unfilled[0]).toMatchObject({
      source_instance_id: owner.id,
      grant_key: SKILL_GRANT_KEYS.multiclassSkill,
      ordinal: 1,
      available: [...skills],
    });
  });

  it('sorts held skills and excludes filled, orphaned, and definitionless grants', () => {
    // ResolvedSkillGrants is a closed projection contract: `skills` is sorted
    // and unique, while only active, unfilled, class-owned rows are outstanding.
    const background = source('background');
    grant(background, 'printed', 1, 'history');
    grant(background, 'printed', 2, 'arcana');

    const definitionless = source('class');
    grant(definitionless, SKILL_GRANT_KEYS.classSkill, 1, null);
    const orphaned = source('class');
    grant(orphaned, SKILL_GRANT_KEYS.classSkill, 1, null, 'orphaned');

    const classId = classDefinition('Filled class', { count: 1 }, ['nature']);
    ownClass(classId, true);
    const filled = source('class', classId);
    grant(filled, SKILL_GRANT_KEYS.classSkill, 1, 'nature');

    const resolved = resolveSkillGrants(db, characterId);
    expect(resolved.skills).toEqual(['arcana', 'history', 'nature']);
    expect(resolved.unfilledClassGrants).toEqual([]);
    expect(classSkillGrantsFilled(db, characterId)).toBe(true);
  });

  it('matches an authored species pool by both rule kind and rule key', () => {
    // GrantRule's closed kind plus stable rule_key identify one authored pool;
    // a different skill rule cannot supply the addressed grant's choices.
    const definitionId = speciesDefinition(
      'Two-rule species',
      'fixture:species:two-skill-rules',
      [
        {
          kind: 'skill_proficiency',
          rule_key: 'other-pool',
          count: 1,
          skills: ['nature'],
        },
        {
          kind: 'skill_proficiency',
          rule_key: 'target-pool',
          count: 1,
          skills: ['history'],
        },
      ],
    );
    const owner = source('species', definitionId);
    const grantId = grant(owner, 'target-pool', 1, null);

    expect(unfilledSpeciesSkillGrants(db, characterId)).toEqual([{
      grant_id: grantId,
      source_instance_id: owner.id,
      grant_key: 'target-pool',
      ordinal: 1,
      available: ['history'],
    }]);
  });

  it('proves an external row cannot carry a bundled-stable species key', () => {
    // Schema contract: bundled-stable keys and catalog layer are correlated.
    // This proves the state needed to distinguish the bundled-layer predicate
    // cannot reach speciesSkillPool through a valid persisted row.
    speciesDefinition('Bundled Human', '2024:species:human');
    expect(() => db.exec(
      `UPDATE catalog_content_identities SET catalog_layer = 'external'
       WHERE content_kind = 'species' AND content_key = '2024:species:human'`,
    )).toThrowError(/catalog_content_identities_key_layer_check/);
  });

  it('refuses non-tool rules and preserves the structured refusal name', () => {
    // GrantRule contract: a skill rule only opens the all-skills pool when the
    // literal allows_tool_instead flag is true, and refusals retain their name.
    const featId = featDefinition('Non-tool feat', [
      {
        kind: 'skill_proficiency',
        rule_key: 'other-tool-rule',
        count: 1,
        allows_tool_instead: true,
      },
      {
        kind: 'skill_proficiency',
        rule_key: 'not-a-tool-rule',
        count: 1,
        allows_tool_instead: false,
      },
    ]);
    const owner = source('feat', featId);
    const grantId = grant(owner, 'not-a-tool-rule', 1, null);
    const refusal = caught(() =>
      fillSkillGrant(db, characterId, grantId, 'athletics'));

    expect(refusal).toEqual(expect.objectContaining<Partial<SkillGrantRefusal>>({
      name: 'SkillGrantRefusal',
      reason: 'skill_not_in_pool',
      skill: 'athletics',
    }));
    expect(db.scalar(
      'SELECT skill FROM character_skill_grants WHERE id = ?',
      [grantId],
    )).toBeNull();
  });

  it('clearing an already-unfilled grant is a literal no-op', () => {
    // Fill command contract: null means "make unfilled"; an already-null row
    // is unchanged and does not acquire a fresh updated_at value.
    const owner = source('feat');
    const grantId = grant(owner, 'already-empty', 1, null);
    db.exec(
      "UPDATE character_skill_grants SET updated_at = '2005-01-01T00:00:00.000Z' WHERE id = ?",
      [grantId],
    );

    fillSkillGrant(db, characterId, grantId, null);
    expect(db.scalar(
      'SELECT updated_at FROM character_skill_grants WHERE id = ?',
      [grantId],
    )).toBe('2005-01-01T00:00:00.000Z');
  });

  it('requires a class-level row even when multiclass traits would otherwise mint', () => {
    // ClassEntitlement contract: no character_class_levels row means no
    // entitlement, even if the definition advertises a nonzero entered pool.
    const classId = classDefinition('Unowned multiclass', {
      count: 1,
      multiclassCount: 1,
      multiclassPool: 'any',
    });
    const owner = source('class', classId);

    syncClassSkillGrants(db, owner);
    expect(rows(owner)).toEqual([]);
  });

  it('does not discover species rules through a non-species source', () => {
    // SkillGrantSource's sourceType discriminator is authoritative; a numeric
    // definition id from another source kind cannot opt into species grants.
    const definitionId = speciesDefinition(
      'Species behind feat source',
      '2024:species:human',
    );
    const owner = source('feat', definitionId);
    syncSpeciesSkillGrants(db, owner);
    expect(rows(owner)).toEqual([]);
  });

  it('rejects colliding authored rule keys before kind lookup', () => {
    // The parser's unique rule-key contract makes a same-key wrong-kind rule
    // unreachable at speciesSkillPool's kind-and-key predicate.
    const definitionId = speciesDefinition(
      'Colliding rule kinds',
      'fixture:species:colliding-rule-kinds',
      [
        {
          kind: 'weapon_mastery',
          rule_key: 'shared-key',
          count: 1,
          selection_pool: 'simple',
        },
        {
          kind: 'skill_proficiency',
          rule_key: 'shared-key',
          count: 1,
          skills: ['history'],
        },
      ],
    );
    const owner = source('species', definitionId);
    grant(owner, 'shared-key', 1, null);

    expect(caught(() => unfilledSpeciesSkillGrants(db, characterId))).toEqual(
      expect.objectContaining({
        name: 'SourceGrantRuleKeyError',
        rule_key: 'shared-key',
      }),
    );
  });

  it('ignores non-skill species rules during skill-grant discovery', () => {
    // GrantRule is a closed discriminated union: only skill_proficiency can
    // mint a character_skill_grants row, even when another kind has a count.
    const definitionId = speciesDefinition(
      'Weapon mastery species',
      'fixture:species:weapon-mastery-only',
      [{
        kind: 'weapon_mastery',
        rule_key: 'not-a-skill',
        count: 1,
        selection_pool: 'simple',
      }],
    );
    const owner = source('species', definitionId);
    syncSpeciesSkillGrants(db, owner);
    expect(rows(owner)).toEqual([]);
  });

  it('excludes an orphaned unfilled grant with an otherwise valid class owner', () => {
    // ResolvedSkillGrants includes only active unfilled class ordinals; valid
    // provenance does not revive an explicitly orphaned lifecycle state.
    const classId = classDefinition('Orphan owner', { count: 1 }, ['arcana']);
    ownClass(classId, true);
    const owner = source('class', classId);
    grant(owner, SKILL_GRANT_KEYS.classSkill, 1, null, 'orphaned');

    expect(resolveSkillGrants(db, characterId).unfilledClassGrants).toEqual([]);
  });

  it('requires every authored species skill to be a known Skill member', () => {
    // Skill[] is closed at the rule-reader boundary. A missing list and a
    // mixed known/unknown list both yield no fillable species choice.
    const missingId = speciesDefinition(
      'Missing configured pool',
      'fixture:species:missing-pool',
      [{
        kind: 'skill_proficiency',
        rule_key: 'missing-pool',
        count: 1,
      }],
    );
    const missingSource = source('species', missingId);
    grant(missingSource, 'missing-pool', 1, null);

    const mixedId = speciesDefinition(
      'Mixed configured pool',
      'fixture:species:mixed-pool',
      [{
        kind: 'skill_proficiency',
        rule_key: 'mixed-pool',
        count: 1,
        skills: ['arcana', 'chronomancy'],
      }],
    );
    const mixedSource = source('species', mixedId);
    grant(mixedSource, 'mixed-pool', 1, null);

    expect(unfilledSpeciesSkillGrants(db, characterId)).toEqual([]);
  });

  it('excludes both filled and orphaned species grants from unfilled choices', () => {
    // UnfilledSpeciesSkillGrant is exactly active + null skill + valid pool;
    // each dropped clause admits a row whose lifecycle or fill state forbids it.
    const definitionId = speciesDefinition('Human states', '2024:species:human');
    const owner = source('species', definitionId);
    grant(owner, SKILL_GRANT_KEYS.speciesSkillful, 1, 'arcana');
    grant(owner, SKILL_GRANT_KEYS.speciesSkillful, 2, null, 'orphaned');

    expect(unfilledSpeciesSkillGrants(db, characterId)).toEqual([]);
  });
});
