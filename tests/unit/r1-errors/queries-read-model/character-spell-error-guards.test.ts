import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  SpellIdentityId,
  SpellVersionId,
} from '../../../../src/domain/ids';
import type { SpellAccessRoute } from '../../../../src/access/spell-access-builder';
import { SpellAccessBuilder } from '../../../../src/access/spell-access-builder';
import { DatabaseContext } from '../../../../src/db/database';
import {
  CharacterSpellFactsMissingError,
  CharacterSpellLevelError,
  CharacterSpellRouteStatisticsError,
  CharacterSpellSectionBuilder,
} from '../../../../src/queries/character-spell-section-builder';
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
  return expect.fail(
    'Expected the spell-section guard to throw, but it returned.',
  );
}

function route(
  fixture: CharacterSheetSpellsFixture,
  overrides: Partial<SpellAccessRoute> = {},
): SpellAccessRoute {
  return {
    spell_identity_id: 1 as SpellIdentityId,
    identity_name: 'Direct Beacon',
    spell_name: 'Direct Beacon',
    spell_catalog_layer: 'bundled',
    spell_content_key: 'test:spell:direct-beacon',
    rules_edition: '2024',
    spell_level: 1,
    ability_modifier: 3,
    attack_bonus: 5,
    save_dc: 13,
    origin: 'slot',
    casting_mode: 'with_slots',
    spell_version_id: fixture.spellIds.directBeacon as SpellVersionId,
    source_instance_id: fixture.sourceIds.cleric,
    source_name: 'Cleric',
    source_catalog_layer: 'bundled',
    slot_id: null,
    slot_key: 'test-slot',
    selection_key: null,
    bucket: 'prepared',
    always_prepared: false,
    is_selection: true,
    counts_against_limit: true,
    free_cast: null,
    spellcasting_ability: 'wisdom',
    ...overrides,
  };
}

function accessReturning(
  routes: readonly SpellAccessRoute[],
): SpellAccessBuilder {
  return {
    buildForCharacter: () => routes,
  } as unknown as SpellAccessBuilder;
}

describe('character spell-section tagged-error guards', () => {
  let connection: Database;
  let db: DatabaseContext;
  let fixture: CharacterSheetSpellsFixture;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    fixture = createCharacterSheetSpellsFixture(db);
  });

  afterEach(() => connection.close());

  it('tags a stored spell level outside the level and placeholder domains', () => {
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec('UPDATE spell_versions SET level = 10 WHERE id = ?', [
      fixture.spellIds.directBeacon,
    ]);

    const error = thrownBy(() =>
      new CharacterSpellSectionBuilder(
        db,
        accessReturning([route(fixture)]),
      ).build(fixture.characterId)
    );

    expect(error).toBeInstanceOf(CharacterSpellLevelError);
    expect(error).toMatchObject({ spell_level: 10 });
  });

  it('tags an evaluated route whose statistics are incomplete', () => {
    const incomplete = route(fixture, { attack_bonus: null });
    const error = thrownBy(() =>
      new CharacterSpellSectionBuilder(
        db,
        accessReturning([incomplete]),
      ).build(fixture.characterId)
    );

    expect(error).toBeInstanceOf(CharacterSpellRouteStatisticsError);
    expect(error).toMatchObject({
      spell_version_id: fixture.spellIds.directBeacon,
    });
  });

  it('tags a selected route whose spell facts are absent', () => {
    const missingVersionId = 987_654 as SpellVersionId;
    const error = thrownBy(() =>
      new CharacterSpellSectionBuilder(
        db,
        accessReturning([
          route(fixture, { spell_version_id: missingVersionId }),
        ]),
      ).build(fixture.characterId)
    );

    expect(error).toBeInstanceOf(CharacterSpellFactsMissingError);
    expect(error).toMatchObject({
      spell_version_id: missingVersionId,
      destination: 'selected_spell',
    });
  });

  it('tags a spellbook entry whose spell facts projection is absent', () => {
    const originalAll = db.all.bind(db);
    vi.spyOn(db, 'all').mockImplementation((
      (sql, bindings, codec) =>
        sql.includes('FROM spell_versions AS version')
          ? []
          : originalAll(sql, bindings, codec)
    ) as DatabaseContext['all']);

    const error = thrownBy(() =>
      new CharacterSpellSectionBuilder(
        db,
        accessReturning([]),
      ).build(fixture.characterId)
    );

    expect(error).toBeInstanceOf(CharacterSpellFactsMissingError);
    expect(error).toMatchObject({
      destination: 'spellbook',
      spell_version_id: expect.any(Number),
    });
  });
});
