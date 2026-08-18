import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../../src/db/database';
import {
  CharacterAllocationMethodError,
  CharacterCrud,
} from '../../../../src/queries/character-crud';
import {
  CharacterSheetArmorClassBonusPayloadError,
  CharacterSheetArmorClassFormulaPayloadError,
  CharacterSheetBuilder,
} from '../../../../src/queries/character-sheet-builder';
import {
  CharacterSpellSelectionBucketError,
  sheetSpellMarker,
} from '../../../../src/queries/character-spell-section-builder';
import {
  MulticlassPrimaryAbilityAssessmentMissingError,
  multiclassAssessmentForClass,
} from '../../../../src/queries/multiclass-primary-ability';
import {
  OperationHistoryEnvelopeError,
  OperationHistoryQueries,
} from '../../../../src/queries/operation-history';
import {
  SourceConfigurationShapeError,
  jsonRecord,
} from '../../../../src/queries/source-config';
import {
  WeaponGroupError,
  WeaponQueries,
  WeaponRangeKindError,
} from '../../../../src/queries/weapons';
import type { SlotBucket } from '../../../../src/domain/enums';
import {
  acquireSharedDb,
  type SharedDbLease,
} from '../../../helpers/shared-db';
import { registerFixtureContentIdentity } from '../../../helpers/content-identity';

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected the query guard to throw, but it returned.');
}

describe('query read-model tagged-error guards', () => {
  let db: DatabaseContext;
  let lease: SharedDbLease;

  beforeEach(async () => {
    lease = await acquireSharedDb({ mode: 'rw' });
    db = lease.db;
  });

  afterEach(async () => lease.release());

  it('tags a corrupt character allocation method with its column and value', () => {
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Corrupt allocation')",
    ).lastInsertId;
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `UPDATE characters
       SET ability_allocation_method = 'rolled'
       WHERE id = ?`,
      [characterId],
    );

    const error = thrownBy(() => new CharacterCrud(db).get(characterId));

    expect(error).toBeInstanceOf(CharacterAllocationMethodError);
    expect(error).toMatchObject({
      column: 'ability_allocation_method',
      allocation_method: 'rolled',
    });
  });

  it.each([
    ['null', 'null'],
    ['list', '[]'],
    ['scalar', '3'],
  ] as const)('tags a decoded source configuration %s shape', (_case, json) => {
    const error = thrownBy(() => jsonRecord(json));

    expect(error).toBeInstanceOf(SourceConfigurationShapeError);
    expect(error).toMatchObject({ name: 'SourceConfigurationShapeError' });
  });

  it('tags a forged spell-selection bucket with the rejected value', () => {
    const error = thrownBy(() =>
      sheetSpellMarker({
        origin: 'slot',
        bucket: 'future-bucket' as SlotBucket,
        always_prepared: false,
      })
    );

    expect(error).toBeInstanceOf(CharacterSpellSelectionBucketError);
    expect(error).toMatchObject({ bucket: 'future-bucket' });
  });

  it('tags a missing held-class assessment with its lookup context', () => {
    const error = thrownBy(() => multiclassAssessmentForClass([], 37));

    expect(error).toBeInstanceOf(
      MulticlassPrimaryAbilityAssessmentMissingError,
    );
    expect(error).toMatchObject({
      class_definition_id: 37,
      context: 'held_class',
    });
  });

  it('tags an invalid stored operation envelope', () => {
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Broken history')",
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_operations (
         character_id, operation_uuid, expected_revision, resulting_revision,
         inverse_command
       ) VALUES (?, 'broken-history', 0, 1, ?)`,
      [
        characterId,
        JSON.stringify({
          type: 'internal_operation_undo',
          action: 'repeat',
        }),
      ],
    );

    const error = thrownBy(() =>
      new OperationHistoryQueries(db).read(characterId)
    );

    expect(error).toBeInstanceOf(OperationHistoryEnvelopeError);
    expect(error).toMatchObject({ name: 'OperationHistoryEnvelopeError' });
  });

  it.each([
    ['formula', 'armor_class_formula'],
    ['bonus', 'armor_class_bonus'],
  ] as const)('tags an incomplete Armor Class %s effect', (caseName, kind) => {
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Broken armor')",
    ).lastInsertId;
    db.exec('PRAGMA ignore_check_constraints = ON');
    const effectId = db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, label
       ) VALUES (?, 1, ?, 'Incomplete Armor Class effect')`,
      [characterId, kind],
    ).lastInsertId;

    const error = thrownBy(() =>
      new CharacterSheetBuilder(db).armorClassValue(characterId)
    );

    const ExpectedError =
      caseName === 'formula'
        ? CharacterSheetArmorClassFormulaPayloadError
        : CharacterSheetArmorClassBonusPayloadError;
    expect(error).toBeInstanceOf(ExpectedError);
    expect(error).toMatchObject({ effect_id: effectId });
  });

  it('tags an unknown stored character-weapon range kind', () => {
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Broken weapon range')",
    ).lastInsertId;
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `INSERT INTO character_weapons (character_id, name, range_kind)
       VALUES (?, 'Phase blade', 'teleporting')`,
      [characterId],
    );

    const error = thrownBy(() =>
      new WeaponQueries(db).characterWeapons(characterId)
    );

    expect(error).toBeInstanceOf(WeaponRangeKindError);
    expect(error).toMatchObject({ range_kind: 'teleporting' });
  });

  it('tags an unknown stored weapon-template group', () => {
    registerFixtureContentIdentity(db, {
      kind: 'weapon',
      contentKey: 'expanded:content.weapon:siege-tool',
      name: 'Siege Tool',
      keyKind: 'asserted',
    });
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `INSERT INTO weapon_templates (
         content_key, name, srd_group, damage_kind, damage_type,
         mastery_property
       ) VALUES (
         'expanded:content.weapon:siege-tool', 'Siege Tool', 'siege',
         'not_recorded', 'Bludgeoning', 'Vex'
       )`,
    );

    const error = thrownBy(() => new WeaponQueries(db).templates());

    expect(error).toBeInstanceOf(WeaponGroupError);
    expect(error).toMatchObject({ weapon_group: 'siege' });
  });
});
