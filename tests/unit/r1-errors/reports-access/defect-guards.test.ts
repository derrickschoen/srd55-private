import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SpellAccessMissingCharacterClassError,
  SpellAccessUnknownSelectionBucketError,
} from '../../../../src/access/spell-access-errors';
import {
  SpellAccessBuilder,
  type SpellAccessRoute,
} from '../../../../src/access/spell-access-builder';
import { registerFixtureContentIdentity } from '../../../helpers/content-identity';
import { DatabaseContext } from '../../../../src/db/database';
import type {
  SpellIdentityId,
  SpellVersionId,
} from '../../../../src/domain/ids';
import * as characterLevelModule from '../../../../src/rules/character-level';
import {
  BuildReportRitualRouteSpellbookEntryError,
  BuildReportUnknownAbilityError,
  BuildReportUnsupportedCasterFractionError,
} from '../../../../src/reports/build-report-errors';
import { BuildReportBuilder } from '../../../../src/reports/build-report-builder';
import { openTestDatabase } from '../../../helpers/open-db';

function defect(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a defect, but the call returned.');
}

async function withDatabase(
  run: (db: DatabaseContext) => void,
): Promise<void> {
  const connection: Database = await openTestDatabase();
  try {
    run(new DatabaseContext(connection));
  } finally {
    connection.close();
  }
}

function createCharacter(db: DatabaseContext): number {
  return db.exec("INSERT INTO characters (name) VALUES ('Error Probe')")
    .lastInsertId;
}

function createClass(
  db: DatabaseContext,
  spellcastingAbility: string | null = 'intelligence',
): number {
  const contentKey = `class:${crypto.randomUUID()}`;
  registerFixtureContentIdentity(db, {
    kind: 'class',
    contentKey,
    name: 'Error Probe Class',
    keyKind: 'bundled-stable',
  });
  return db.exec(
    `INSERT INTO class_definitions (
       content_key, name, rules_edition, spellcasting_ability,
       progression_type
     ) VALUES (?, 'Error Probe Class', '2024', ?, 'full')`,
    [contentKey, spellcastingAbility],
  ).lastInsertId;
}

function addClassLevel(
  db: DatabaseContext,
  characterId: number,
  classId: number,
  subclassId: number | null = null,
): void {
  db.exec(
    `INSERT INTO character_class_levels (
       character_id, class_definition_id, subclass_definition_id, level
     ) VALUES (?, ?, ?, 1)`,
    [characterId, classId, subclassId],
  );
}

function createSource(
  db: DatabaseContext,
  characterId: number,
  classId: number,
): number {
  return db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config
     ) VALUES (?, ?, 'class', ?, 'Error Probe Class', '{}')`,
    [characterId, crypto.randomUUID(), classId],
  ).lastInsertId;
}

function createSpell(db: DatabaseContext): SpellVersionId {
  const contentKey = `spell:${crypto.randomUUID()}`;
  registerFixtureContentIdentity(db, {
    kind: 'spell',
    contentKey,
    name: 'Error Probe Spell',
    keyKind: 'bundled-stable',
  });
  const identityId = db.exec(
    `INSERT INTO spell_identities (
       content_key, canonical_name, normalized_name
     ) VALUES (?, 'Error Probe Spell', 'error probe spell')`,
    [`identity:${contentKey}`],
  ).lastInsertId;
  return db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school
     ) VALUES (?, ?, 'Error Probe Spell', '2024', 1, 'Abjuration')`,
    [contentKey, identityId],
  ).lastInsertId as SpellVersionId;
}

function createSlot(
  db: DatabaseContext,
  characterId: number,
  sourceId: number,
  spellVersionId: SpellVersionId,
): number {
  return db.exec(
    `INSERT INTO spell_selection_slots (
       character_id, source_instance_id, slot_key, rule_key, ordinal,
       bucket, eligibility_kind, current_spell_version_id,
       selection_eligibility
     ) VALUES (?, ?, 'error-probe:1', 'error-probe', 1, 'known',
       'choice_from_list', ?, 'valid')`,
    [characterId, sourceId, spellVersionId],
  ).lastInsertId;
}

function createRoutableCharacter(db: DatabaseContext): {
  readonly character_id: number;
  readonly slot_id: number;
} {
  const characterId = createCharacter(db);
  const classId = createClass(db);
  addClassLevel(db, characterId, classId);
  const sourceId = createSource(db, characterId, classId);
  const spellVersionId = createSpell(db);
  const slotId = createSlot(db, characterId, sourceId, spellVersionId);
  return { character_id: characterId, slot_id: slotId };
}

const malformedRitualRoute: SpellAccessRoute = {
  spell_identity_id: 41 as SpellIdentityId,
  identity_name: 'Error Probe Spell',
  spell_name: 'Error Probe Spell',
  spell_catalog_layer: 'bundled',
  spell_content_key: 'spell:error-probe',
  rules_edition: '2024',
  spell_level: 1,
  ability_modifier: 3,
  attack_bonus: 5,
  save_dc: 13,
  origin: 'capability',
  casting_mode: 'ritual_only',
  spell_version_id: 71 as SpellVersionId,
  source_instance_id: 1,
  source_name: 'Wizard 1',
  source_catalog_layer: 'bundled',
  slot_id: null,
  slot_key: null,
  selection_key: null,
  bucket: null,
  always_prepared: false,
  is_selection: false,
  counts_against_limit: false,
  free_cast: null,
  spellcasting_ability: 'intelligence',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('build report defect guards', () => {
  it('tags a corrupt class spellcasting ability with its stored facts', async () => {
    await withDatabase((db) => {
      db.exec('PRAGMA ignore_check_constraints = ON');
      const characterId = createCharacter(db);
      const classId = createClass(db, 'luck');
      addClassLevel(db, characterId, classId);

      const error = defect(() => new BuildReportBuilder(db).build(characterId));
      expect(error).toBeInstanceOf(BuildReportUnknownAbilityError);
      expect(error).toMatchObject({
        source: 'class',
        value: 'luck',
      });
    });
  });

  it('tags an unsupported stored subclass caster contribution', async () => {
    await withDatabase((db) => {
      const characterId = createCharacter(db);
      const classId = createClass(db);
      const contentKey = `subclass:${crypto.randomUUID()}`;
      registerFixtureContentIdentity(db, {
        kind: 'subclass',
        contentKey,
        name: 'Error Probe Subclass',
        keyKind: 'bundled-stable',
      });
      const subclassId = db.exec(
        `INSERT INTO subclass_definitions (
           content_key, class_definition_id, name, rules_edition,
           spellcasting_ability, caster_fraction, caster_rounding
         ) VALUES (?, ?, 'Error Probe Subclass', '2024', 'intelligence',
           '1/4', 'sideways')`,
        [contentKey, classId],
      ).lastInsertId;
      addClassLevel(db, characterId, classId, subclassId);

      const error = defect(() => new BuildReportBuilder(db).build(characterId));
      expect(error).toBeInstanceOf(
        BuildReportUnsupportedCasterFractionError,
      );
      expect(error).toMatchObject({ fraction: '1/4', rounding: 'sideways' });
    });
  });

  it('tags a ritual-only route without spellbook provenance', async () => {
    await withDatabase((db) => {
      const characterId = createCharacter(db);
      const access = new SpellAccessBuilder(db);
      vi.spyOn(access, 'buildForCharacter').mockReturnValue([
        malformedRitualRoute,
      ]);

      const error = defect(() =>
        new BuildReportBuilder(db, access).build(characterId),
      );
      expect(error).toBeInstanceOf(
        BuildReportRitualRouteSpellbookEntryError,
      );
      expect(error).toMatchObject({ spell_version_id: 71 });
    });
  });
});

describe('spell access defect guards', () => {
  it('tags a corrupt stored slot bucket', async () => {
    await withDatabase((db) => {
      const { character_id: characterId, slot_id: slotId } =
        createRoutableCharacter(db);
      db.exec('PRAGMA ignore_check_constraints = ON');
      db.exec(
        "UPDATE spell_selection_slots SET bucket = 'corrupt' WHERE id = ?",
        [slotId],
      );

      const error = defect(() =>
        new SpellAccessBuilder(db).buildForCharacter(characterId),
      );
      expect(error).toBeInstanceOf(
        SpellAccessUnknownSelectionBucketError,
      );
      expect(error).toMatchObject({ bucket: 'corrupt' });
    });
  });

  it('tags a route whose character class disappears during construction', async () => {
    await withDatabase((db) => {
      const { character_id: characterId } = createRoutableCharacter(db);
      vi.spyOn(characterLevelModule, 'characterLevel')
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(null);

      const error = defect(() =>
        new SpellAccessBuilder(db).buildForCharacter(characterId),
      );
      expect(error).toBeInstanceOf(SpellAccessMissingCharacterClassError);
      expect(error).toMatchObject({ character_id: characterId });
    });
  });
});
