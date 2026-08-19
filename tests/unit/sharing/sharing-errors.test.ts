import { describe, expect, it } from 'vitest';
import type { ContentKey } from '../../../src/domain/ids';
import {
  ShareCommittedImportResultMissingError,
  ShareContentReferenceMissingError,
  ShareDocumentIdentityPersistenceError,
  ShareSelectedSpellVersionMissingError,
  ShareSourceConfigShapeError,
  ShareSpellCompatibilityInvariantError,
  ShareStoredWeaponRangeKindError,
} from '../../../src/sharing/character-share-errors';
import {
  fieldIndex,
  ShareWeaponWireFieldUnhandledError,
  ShareWireSchemaFieldMissingError,
  weaponWireValue,
} from '../../../src/sharing/codec';
import {
  assertShareWireSchemaRequiredFields,
  ShareWireSchemaRequiredFieldError,
  type WireField,
} from '../../../src/sharing/wire-schemas';
import type { ShareWeapon } from '../../../src/sharing/schema';

/** The one place sharing's defect-error sentences are asserted (D274/D276). */
describe('sharing error formatters', () => {
  it('ShareSourceConfigShapeError formats the invalid stored shape', () => {
    const error = new ShareSourceConfigShapeError();

    expect(error.message).toBe('Source config must be an object.');
    expect(error.name).toBe('ShareSourceConfigShapeError');
    expect(error).toBeInstanceOf(Error);
  });

  it('ShareContentReferenceMissingError formats its lookup facts', () => {
    const error = new ShareContentReferenceMissingError(
      'spell_versions',
      '42',
    );

    expect(error.message).toBe('Missing spell_versions reference 42.');
    expect(error.name).toBe('ShareContentReferenceMissingError');
    expect(error).toMatchObject({
      table: 'spell_versions',
      reference_id: '42',
    });
  });

  it('ShareStoredWeaponRangeKindError formats the stored kind', () => {
    const error = new ShareStoredWeaponRangeKindError('teleporting');

    expect(error.message).toBe('Unknown weapon range kind "teleporting".');
    expect(error.name).toBe('ShareStoredWeaponRangeKindError');
    expect(error.range_kind).toBe('teleporting');
    expect(error).toBeInstanceOf(TypeError);
  });

  it('ShareDocumentIdentityPersistenceError carries the character id', () => {
    const error = new ShareDocumentIdentityPersistenceError(17);

    expect(error.message).toBe(
      'Character share identity could not be persisted.',
    );
    expect(error.name).toBe('ShareDocumentIdentityPersistenceError');
    expect(error.character_id).toBe(17);
  });

  it('ShareSelectedSpellVersionMissingError carries the missing id', () => {
    const error = new ShareSelectedSpellVersionMissingError(29);

    expect(error.message).toBe('A selected spell version does not exist.');
    expect(error.name).toBe('ShareSelectedSpellVersionMissingError');
    expect(error.spell_version_id).toBe(29);
  });

  it('ShareSpellCompatibilityInvariantError carries the content key', () => {
    const contentKey = '2024:spell:missing' as ContentKey;
    const error = new ShareSpellCompatibilityInvariantError(contentKey);

    expect(error.message).toBe(
      'Missing spells become placeholders, not compatibility issues.',
    );
    expect(error.name).toBe('ShareSpellCompatibilityInvariantError');
    expect(error.content_key).toBe(contentKey);
  });

  it('ShareCommittedImportResultMissingError carries the document id', () => {
    const error = new ShareCommittedImportResultMissingError('share-17');

    expect(error.message).toBe(
      'Committed share import did not create a character.',
    );
    expect(error.name).toBe('ShareCommittedImportResultMissingError');
    expect(error.document_id).toBe('share-17');
  });

  it('ShareWireSchemaFieldMissingError formats the required field', () => {
    const error = new ShareWireSchemaFieldMissingError('character');

    expect(error.message).toBe('Wire schema has no character field.');
    expect(error.name).toBe('ShareWireSchemaFieldMissingError');
    expect(error.field).toBe('character');
  });

  it('ShareWeaponWireFieldUnhandledError formats the unexpected field', () => {
    const error = new ShareWeaponWireFieldUnhandledError('weight');

    expect(error.message).toBe('Unknown weapon wire field weight.');
    expect(error.name).toBe('ShareWeaponWireFieldUnhandledError');
    expect(error.field).toBe('weight');
  });

  it.each([
    [12, ['effects'], 'wire v12 schema is missing a required field.'],
    [19, ['version'], 'wire v19 schema is missing the version field.'],
  ] as const)(
    'ShareWireSchemaRequiredFieldError formats v%s',
    (version, requiredFields, message) => {
      const error = new ShareWireSchemaRequiredFieldError(
        version,
        requiredFields,
      );

      expect(error.message).toBe(message);
      expect(error.name).toBe('ShareWireSchemaRequiredFieldError');
      expect(error).toMatchObject({
        version,
        required_fields: requiredFields,
      });
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(TypeError);
    },
  );
});

function thrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a defect error, but the call returned.');
}

describe('sharing codec defect guards', () => {
  it('tags a required field missing from a code-owned codec schema', () => {
    const fields: readonly WireField<'format' | 'version'>[] = [
      {
        key: 'format',
        wireType: 'literal',
        meaning: 'share format',
      },
    ];

    const error = thrown(() => fieldIndex(fields, 'version'));

    expect(error).toBeInstanceOf(ShareWireSchemaFieldMissingError);
    expect(error).toMatchObject({ field: 'version' });
  });

  it('tags a weapon schema field the encoder does not implement', () => {
    const weapon: ShareWeapon = {
      name: 'Guard probe',
      damage: { kind: 'not_recorded' },
      versatile_damage: { kind: 'not_applicable' },
      range: { kind: 'none' },
    };

    const error = thrown(() => weaponWireValue(weapon, 'weight'));

    expect(error).toBeInstanceOf(ShareWeaponWireFieldUnhandledError);
    expect(error).toMatchObject({ field: 'weight' });
  });

  it('tags missing adjacent-migration fields with every missing key', () => {
    const error = thrown(() =>
      assertShareWireSchemaRequiredFields(12, {
        effects: -1,
        version: 1,
        'effect.kind': -1,
      }),
    );

    expect(error).toBeInstanceOf(ShareWireSchemaRequiredFieldError);
    expect(error).toMatchObject({
      version: 12,
      required_fields: ['effects', 'effect.kind'],
    });
  });
});
