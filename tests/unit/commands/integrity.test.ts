import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterAll, describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  CanonicalJsonCircularReferenceError,
  CanonicalJsonUnsupportedValueError,
} from '../../../src/commands/canonical-json-errors';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import {
  CharacterCommandIntegrityError,
  CommandIntegrityKeyRequiredError,
} from '../../../src/commands/integrity-errors';
import { DatabaseContext } from '../../../src/db/database';
import schema from '../../../src/db/schema.sql?raw';
import { getSqlite3 } from '../../helpers/open-db';

const key = 'mutation-contract-secret';
const openDatabases: Database[] = [];

function defect(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a defect, but the call returned.');
}

async function rejected(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a defect, but the promise resolved.');
}

async function openDb(): Promise<DatabaseContext> {
  const sqlite3 = await getSqlite3();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  openDatabases.push(connection);
  connection.exec(schema);
  return new DatabaseContext(connection);
}

afterAll(() => {
  for (const database of openDatabases) {
    database.close();
  }
});

describe('canonical command JSON', () => {
  it('sorts every nested object while retaining list order and unescaped Unicode/slashes', () => {
    expect(
      canonicalJson({
        z: 'é/',
        a: {
          b: 2,
          a: [
            { y: true, x: null },
            { second: 2, first: 1 },
          ],
        },
      }),
    ).toBe(
      '{"a":{"a":[{"x":null,"y":true},{"first":1,"second":2}],"b":2},"z":"é/"}',
    );

    const unsupported = defect(() => canonicalJson({ value: Number.NaN }));
    expect(unsupported).toBeInstanceOf(CanonicalJsonUnsupportedValueError);
    expect(unsupported).toMatchObject({ value_tag: '[object Number]' });

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(defect(() => canonicalJson(circular))).toBeInstanceOf(
      CanonicalJsonCircularReferenceError,
    );
  });
});

describe('destructive inverse integrity', () => {
  it('matches the PHP canonical HMAC vector and verifies reordered objects', async () => {
    const integrity = new CharacterCommandIntegrity(key);
    const command = {
      z: 'é/',
      a: { b: 2, a: [{ y: true, x: null }] },
    };

    const signed = await integrity.attach(42, command);
    expect(signed.integrity).toBe(
      '018d063fab9a6875c23ef9db44897bdb6938948ae917d5e21b61e92d0e5e6229',
    );
    await expect(integrity.assertValid(42, signed)).resolves.toBeUndefined();

    await expect(
      integrity.assertValid(42, {
        a: { a: [{ x: null, y: true }], b: 2 },
        z: 'é/',
        integrity: signed.integrity,
      }),
    ).resolves.toBeUndefined();
  });

  it('persists the signed inverse exactly and rejects tampering, another character, or another key', async () => {
    const database = await openDb();
    const characterId = database.exec(
      "INSERT INTO characters (name) VALUES ('Integrity character')",
    ).lastInsertId;
    const integrity = new CharacterCommandIntegrity(key);
    const signed = await integrity.attach(characterId, {
      type: 'set_slot',
      slot_id: 17,
      mode: 'restore',
      state: {
        state: 'active',
        override_note: null,
        selection_invalid_reason: null,
        current_spell_version_id: 9,
        selection_eligibility: 'valid',
      },
    });

    database.exec(
      `INSERT INTO character_operations (
        character_id, operation_uuid, expected_revision, resulting_revision,
        inverse_command
      ) VALUES (?, ?, ?, ?, ?)`,
      [characterId, 'integrity-operation', 0, 1, JSON.stringify(signed)],
    );

    const storedJson = database.scalar(
      'SELECT inverse_command FROM character_operations WHERE operation_uuid = ?',
      ['integrity-operation'],
    );
    expect(storedJson).toBe(JSON.stringify(signed));
    const stored = JSON.parse(String(storedJson)) as Record<string, unknown>;
    await expect(
      integrity.assertValid(characterId, stored),
    ).resolves.toBeUndefined();

    const storedState = stored.state as Record<string, unknown>;
    const tampered = await rejected(() =>
      integrity.assertValid(characterId, {
        ...stored,
        state: { ...storedState, state: 'discarded' },
      }),
    );
    expect(tampered).toBeInstanceOf(CharacterCommandIntegrityError);
    expect(tampered).toMatchObject({ character_id: characterId });

    const anotherCharacter = await rejected(() =>
      integrity.assertValid(characterId + 1, stored),
    );
    expect(anotherCharacter).toBeInstanceOf(CharacterCommandIntegrityError);
    expect(anotherCharacter).toMatchObject({
      character_id: characterId + 1,
    });

    const anotherKey = await rejected(() =>
      new CharacterCommandIntegrity('different-key').assertValid(
        characterId,
        stored,
      ),
    );
    expect(anotherKey).toBeInstanceOf(CharacterCommandIntegrityError);
    expect(anotherKey).toMatchObject({ character_id: characterId });

    expect(
      database.allRaw(
        `SELECT character_id, operation_uuid, expected_revision,
                resulting_revision, inverse_command
         FROM character_operations`,
      ),
    ).toEqual([
      {
        character_id: characterId,
        operation_uuid: 'integrity-operation',
        expected_revision: 0,
        resulting_revision: 1,
        inverse_command: JSON.stringify(signed),
      },
    ]);
  });

  it('requires a non-empty key and rejects missing or malformed signatures', async () => {
    expect(defect(() => new CharacterCommandIntegrity(''))).toBeInstanceOf(
      CommandIntegrityKeyRequiredError,
    );

    const integrity = new CharacterCommandIntegrity(key);
    const missing = await rejected(() =>
      integrity.assertValid(42, { type: 'restore_snapshot' }),
    );
    expect(missing).toBeInstanceOf(CharacterCommandIntegrityError);
    expect(missing).toMatchObject({ character_id: 42 });

    const malformed = await rejected(() =>
      integrity.assertValid(42, {
        type: 'restore_snapshot',
        integrity: 'not-a-signature',
      }),
    );
    expect(malformed).toBeInstanceOf(CharacterCommandIntegrityError);
    expect(malformed).toMatchObject({ character_id: 42 });

    const signed = await integrity.attach(42, {
      type: 'restore_snapshot',
      snapshot: {},
    });
    const uppercase = await rejected(() =>
      integrity.assertValid(42, {
        ...signed,
        integrity: signed.integrity.toUpperCase(),
      }),
    );
    expect(uppercase).toBeInstanceOf(CharacterCommandIntegrityError);
    expect(uppercase).toMatchObject({ character_id: 42 });
  });
});
