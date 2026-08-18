import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseContext } from '../../../../src/db/database';
import {
  CharacterWorkspaceBuilder,
  CharacterWorkspaceSpellcastingAbilityError,
  CharacterWorkspaceStandaloneSourceTypeError,
} from '../../../../src/queries/character-workspace-builder';
import { openTestDatabase } from '../../../helpers/open-db';
import {
  createCharacterSheetSpellsFixture,
  type CharacterSheetSpellsFixture,
} from '../../../integration/queries/character-sheet-spells-fixture';

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected the workspace guard to throw, but it returned.');
}

interface WorkspaceInternals {
  removableSources(characterId: number): readonly unknown[];
}

describe('character workspace tagged-error guards', () => {
  let connection: Database;
  let db: DatabaseContext;
  let fixture: CharacterSheetSpellsFixture;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    fixture = createCharacterSheetSpellsFixture(db);
  });

  afterEach(() => connection.close());

  it('tags an unknown configured spellcasting ability', () => {
    db.exec(
      `UPDATE character_source_instances
       SET config = '{"spellcasting_ability":"luck"}'
       WHERE id = ?`,
      [fixture.sourceIds.cleric],
    );

    const error = thrownBy(() =>
      new CharacterWorkspaceBuilder(db).build(fixture.characterId)
    );

    expect(error).toBeInstanceOf(
      CharacterWorkspaceSpellcastingAbilityError,
    );
    expect(error).toMatchObject({ spellcasting_ability: 'luck' });
  });

  it('tags a standalone-source row with an unknown source type', () => {
    const originalAll = db.all.bind(db);
    vi.spyOn(db, 'all').mockImplementation((
      (sql, bindings, codec) =>
        sql.includes("source_type IN ('feat', 'species', 'background')")
          ? [codec({
              id: fixture.sourceIds.standalone,
              parent_source_instance_id: null,
              source_type: 'mystery',
              source_definition_id: null,
              display_name: 'Mystery source',
            })]
          : originalAll(sql, bindings, codec)
    ) as DatabaseContext['all']);
    const builder = new CharacterWorkspaceBuilder(db);

    const error = thrownBy(() =>
      (builder as unknown as WorkspaceInternals).removableSources(
        fixture.characterId,
      )
    );

    expect(error).toBeInstanceOf(
      CharacterWorkspaceStandaloneSourceTypeError,
    );
    expect(error).toMatchObject({ source_type: 'mystery' });
  });
});
