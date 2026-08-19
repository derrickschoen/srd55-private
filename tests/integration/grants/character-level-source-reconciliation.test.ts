import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import {
  reconcileCharacterLevelDependentSource,
  reconcileCharacterLevelDependentSources,
} from '../../../src/grants/character-level-source-reconciliation';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { openTestDatabase } from '../../helpers/open-db';

const dependentRule = (ruleKey: string) => ({
  kind: 'fixed_spell',
  rule_key: ruleKey,
  spell_version_key: `fixture:${ruleKey}`,
  bucket: 'known',
  active_from_character_level: 2,
});

const independentRule = (ruleKey: string) => ({
  kind: 'fixed_spell',
  rule_key: ruleKey,
  spell_version_key: `fixture:${ruleKey}`,
  bucket: 'known',
});

function configuredRule(ruleKey: string, grants: readonly Record<string, unknown>[]) {
  return {
    kind: 'configured_choice',
    rule_key: ruleKey,
    label: 'Fixture choice',
    config_key: 'fixture.choice',
    required: true,
    ability_choice: null,
    unknown_sheet_fields: [],
    projected_trait_names: [],
    options: [{
      value: 'chosen',
      label: 'Chosen',
      sheet: {},
      effects: [],
      grants,
      replaceable_spell_choice: null,
    }],
  };
}

describe('character-level source dependency reconciliation', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;
  let generated: number[];

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Reconciliation Matrix')",
    ).lastInsertId;
    generated = [];
    vi.spyOn(GrantRuleSlotGenerator.prototype, 'generateForSource')
      .mockImplementation((sourceId) => {
        generated.push(sourceId);
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    connection.close();
  });

  function identity(kind: 'class' | 'subclass' | 'feat', name: string): string {
    const contentKey = `fixture:${kind}:${crypto.randomUUID()}`;
    registerFixtureContentIdentity(db, {
      kind,
      contentKey,
      name,
      keyKind: 'bundled-stable',
    });
    return contentKey;
  }

  function classDefinition(name: string, rules: readonly Record<string, unknown>[]): number {
    const classId = db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, progression_type)
       VALUES (?, ?, '2024', 'none')`,
      [identity('class', name), name],
    ).lastInsertId;
    db.exec(
      `INSERT INTO class_progressions
         (class_definition_id, class_level, grant_rules)
       VALUES (?, 1, ?)`,
      [classId, JSON.stringify(rules)],
    );
    return classId;
  }

  function subclassDefinition(
    classId: number,
    name: string,
    rules: readonly Record<string, unknown>[],
  ): number {
    return db.exec(
      `INSERT INTO subclass_definitions
         (content_key, class_definition_id, name, rules_edition, grant_rules)
       VALUES (?, ?, ?, '2024', ?)`,
      [identity('subclass', name), classId, name, JSON.stringify(rules)],
    ).lastInsertId;
  }

  function featDefinition(name: string, rules: readonly Record<string, unknown>[]): number {
    return db.exec(
      `INSERT INTO feat_definitions
         (content_key, name, rules_edition, grant_rules)
       VALUES (?, ?, '2024', ?)`,
      [identity('feat', name), name, JSON.stringify(rules)],
    ).lastInsertId;
  }

  function source(
    sourceType: 'class' | 'subclass' | 'feat',
    definitionId: number | null,
    state: 'active' | 'tombstoned' = 'active',
    owner = characterId,
  ): number {
    return db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, state
       ) VALUES (?, ?, ?, ?, 'Matrix source', '{}', ?)`,
      [owner, crypto.randomUUID(), sourceType, definitionId, state],
    ).lastInsertId;
  }

  function ownClass(classId: number, subclassId: number | null = null): void {
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, subclass_definition_id, level)
       VALUES (?, ?, ?, 1)`,
      [characterId, classId, subclassId],
    );
  }

  it('pins class, subclass, and definition-ownership dependency states', () => {
    const ownedClass = classDefinition('Owned dependent class', [
      dependentRule('owned-class-level'),
    ]);
    const wrongClass = classDefinition('Unowned dependent class', [
      dependentRule('wrong-class-level'),
    ]);
    const subclass = subclassDefinition(ownedClass, 'Owned dependent subclass', [
      dependentRule('owned-subclass-level'),
    ]);
    ownClass(ownedClass, subclass);

    const cases = [
      { id: source('class', ownedClass), generated: true },
      { id: source('class', wrongClass), generated: false },
      { id: source('class', null), generated: false },
      { id: source('subclass', subclass), generated: true },
      { id: source('subclass', wrongClass), generated: false },
      { id: source('subclass', null), generated: false },
      { id: source('feat', null), generated: false },
    ];
    const generator = new GrantRuleSlotGenerator(db);

    for (const fixture of cases) {
      generated = [];
      reconcileCharacterLevelDependentSource(db, fixture.id, generator);
      expect(generated, `source ${String(fixture.id)}`).toEqual(
        fixture.generated ? [fixture.id] : [],
      );
    }

    generated = [];
    reconcileCharacterLevelDependentSource(db, 999_999, generator);
    expect(generated).toEqual([]);
  });

  it('reconciles only active dependent roots and configured nested grants for the addressed character', () => {
    const independentFeat = featDefinition('Independent feat', [
      independentRule('independent-root'),
    ]);
    const dependentFeat = featDefinition('Dependent feat', [
      independentRule('first-root'),
      dependentRule('dependent-root'),
    ]);
    const configuredDependentFeat = featDefinition('Configured dependent feat', [
      configuredRule('configured-dependent', [
        independentRule('nested-independent'),
        dependentRule('nested-dependent'),
      ]),
    ]);
    const configuredIndependentFeat = featDefinition('Configured independent feat', [
      configuredRule('configured-independent', [
        independentRule('only-nested-independent'),
      ]),
    ]);

    const expected = [
      source('feat', dependentFeat),
      source('feat', configuredDependentFeat),
    ];
    source('feat', independentFeat);
    source('feat', configuredIndependentFeat);
    source('feat', dependentFeat, 'tombstoned');

    const otherCharacter = db.exec(
      "INSERT INTO characters (name) VALUES ('Other reconciliation owner')",
    ).lastInsertId;
    source('feat', dependentFeat, 'active', otherCharacter);

    reconcileCharacterLevelDependentSources(db, characterId);

    expect(generated).toEqual(expected);
  });
});
