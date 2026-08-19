import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { applyEquipmentPackageChoice } from '../../../src/grants/equipment-grants';
import { EquipmentBackgroundProjectionKindError } from '../../../src/grants/equipment-grants-errors';
import { openTestDatabase } from '../../helpers/open-db';

vi.mock('../../../src/catalog/stored-content-projector-v1', () => ({
  projectStoredPortableContentV1: () => ({
    kind: 'species',
    aggregate: {},
  }),
  storedContentMatchesFingerprintReferenceV1: () => true,
}));

describe('background equipment projection owner guard', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => connection.close());

  it('refuses a non-background portable projection before reading package rows', () => {
    expect(() => applyEquipmentPackageChoice(db, {
      character_id: 91,
      content_key: 'fixture:wrong-projection-owner',
      kind: 'background',
      option: 'a',
    })).toThrow(EquipmentBackgroundProjectionKindError);
  });
});
