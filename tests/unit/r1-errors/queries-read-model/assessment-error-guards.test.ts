import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock(
  '../../../../src/rules/multiclass-prerequisite-gate',
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import('../../../../src/rules/multiclass-prerequisite-gate')
    >();
    return {
      ...actual,
      heldMulticlassPrerequisiteClasses: () => [
        {
          class_definition_id: 81,
          class_name: 'First held class',
          class_catalog_layer: 'bundled',
          stored_expression: 'strength >= 13',
        },
        {
          class_definition_id: 82,
          class_name: 'Second held class',
          class_catalog_layer: 'bundled',
          stored_expression: 'dexterity >= 13',
        },
      ],
      evaluateMulticlassPrerequisiteClasses: () => [],
      multiclassEntryAssessments: () => new Map(),
    };
  },
);

import { bundledSourceContentKeys } from '../../../../src/catalog/bundled-source-membership';
import { DatabaseContext } from '../../../../src/db/database';
import {
  CharacterWorkspaceBuilder,
  CharacterWorkspaceClassAssessmentMissingError,
} from '../../../../src/queries/character-workspace-builder';
import {
  MulticlassPrimaryAbilityAssessmentMissingError,
  MulticlassPrimaryAbilityQueries,
} from '../../../../src/queries/multiclass-primary-ability';
import { openTestDatabase } from '../../../helpers/open-db';

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected the assessment guard to throw, but it returned.');
}

interface WorkspaceInternals {
  availableClassOptions(characterId: number): readonly unknown[];
}

describe('query assessment tagged-error guards', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Missing assessment')",
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  it('tags a declared held-class prerequisite omitted by evaluation', () => {
    const error = thrownBy(() =>
      new MulticlassPrimaryAbilityQueries(db).build(characterId)
    );

    expect(error).toBeInstanceOf(
      MulticlassPrimaryAbilityAssessmentMissingError,
    );
    expect(error).toMatchObject({
      class_definition_id: 81,
      context: 'declared_prerequisite',
    });
  });

  it('tags a class option omitted by entry assessment', () => {
    const contentKey = bundledSourceContentKeys('class').at(0);
    if (contentKey === undefined) {
      expect.fail('The bundled class fixture list is empty.');
    }
    const originalAll = db.all.bind(db);
    vi.spyOn(db, 'all').mockImplementation((
      (sql, bindings, codec) =>
        sql.includes('FROM class_definitions AS definition')
          ? [codec({
              id: 83,
              content_key: contentKey,
              name: 'Unassessed option',
              catalog_layer: null,
            })]
          : originalAll(sql, bindings, codec)
    ) as DatabaseContext['all']);
    const builder = new CharacterWorkspaceBuilder(db);

    const error = thrownBy(() =>
      (builder as unknown as WorkspaceInternals).availableClassOptions(
        characterId,
      )
    );

    expect(error).toBeInstanceOf(
      CharacterWorkspaceClassAssessmentMissingError,
    );
    expect(error).toMatchObject({ class_definition_id: 83 });
  });
});
