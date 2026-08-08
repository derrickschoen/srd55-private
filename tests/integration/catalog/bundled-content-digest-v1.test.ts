import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bundledContentDigestMatchesBuildV1,
  bundledContentDigestMismatchesV1,
  bundledContentDigestPassV1,
} from '../../../src/catalog/bundled-content-digest-v1';
import { EXPECTED_BUNDLED_CONTENT_DIGEST_V1 } from '../../../src/catalog/bundled-content-digest-v1.expected';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import type { DatabaseContext } from '../../../src/db/database';
import type { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const ACID_ARROW_KEY = '2024:acid-arrow';

describe('D229 bundled content digest boot verification', () => {
  let lifecycle: DatabaseLifecycle;
  let db: DatabaseContext;

  beforeEach(async () => {
    const sqlite3 = await getSqlite3();
    lifecycle = createApplicationLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
    );
    lifecycle.open();
    db = lifecycle.database;
  });

  afterEach(() => {
    lifecycle.close();
    vi.restoreAllMocks();
  });

  it('pins the canonical kind/key/table/row ordering independently of SQL row order', () => {
    const before = bundledContentDigestPassV1(db);
    const membership = db.oneRaw(
      `SELECT membership.spell_version_id, membership.spell_list_key
       FROM spell_list_memberships AS membership
       JOIN spell_versions AS spell ON spell.id = membership.spell_version_id
       ORDER BY spell.content_key, membership.spell_list_key LIMIT 1`,
    );
    expect(membership).not.toBeNull();

    db.exec(
      `DELETE FROM spell_list_memberships
       WHERE spell_version_id = ? AND spell_list_key = ?`,
      [
        Number(membership!.spell_version_id),
        String(membership!.spell_list_key),
      ],
    );
    db.exec(
      `INSERT INTO spell_list_memberships (spell_version_id, spell_list_key)
       VALUES (?, ?)`,
      [
        Number(membership!.spell_version_id),
        String(membership!.spell_list_key),
      ],
    );
    const after = bundledContentDigestPassV1(db);

    expect(before.digest).toBe(EXPECTED_BUNDLED_CONTENT_DIGEST_V1);
    expect(after.digest).toBe(before.digest);
    expect(after.aggregates).toHaveLength(444);
  });

  it('detects one corrupted aggregate and returns to the pinned digest after an exact restore', () => {
    const before = db.scalar<string>(
      'SELECT short_summary FROM spell_versions WHERE content_key = ?',
      [ACID_ARROW_KEY],
    );
    expect(before).not.toBeNull();

    db.exec(
      `UPDATE spell_versions SET short_summary = short_summary || ?
       WHERE content_key = ?`,
      [' D229 negative control.', ACID_ARROW_KEY],
    );
    const corrupted = bundledContentDigestPassV1(db);

    expect(bundledContentDigestMatchesBuildV1(corrupted)).toBe(false);
    expect(bundledContentDigestMismatchesV1(corrupted)).toEqual([{
      catalog_layer: 'bundled',
      kind: 'spell',
      contentKey: ACID_ARROW_KEY,
      name: 'Acid Arrow',
      reason: 'changed',
    }]);

    db.exec(
      'UPDATE spell_versions SET short_summary = ? WHERE content_key = ?',
      [before, ACID_ARROW_KEY],
    );
    const restored = bundledContentDigestPassV1(db);

    expect(restored.digest).toBe(EXPECTED_BUNDLED_CONTENT_DIGEST_V1);
    expect(bundledContentDigestMismatchesV1(restored)).toEqual([]);
  });

  it('names a corrupted aggregate during boot fallback, repairs it, then takes the green pass', () => {
    const before = db.scalar<string>(
      'SELECT short_summary FROM spell_versions WHERE content_key = ?',
      [ACID_ARROW_KEY],
    );
    expect(before).not.toBeNull();
    db.exec(
      `UPDATE spell_versions SET short_summary = short_summary || ?
       WHERE content_key = ?`,
      [' D229 boot fallback control.', ACID_ARROW_KEY],
    );
    const warned = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    lifecycle.reopen();
    db = lifecycle.database;

    expect(warned).toHaveBeenCalledWith(
      'Bundled content digest mismatch; running named per-aggregate ' +
        "verification for spell 'Acid Arrow' (2024:acid-arrow).",
    );
    expect(db.scalar<string>(
      'SELECT short_summary FROM spell_versions WHERE content_key = ?',
      [ACID_ARROW_KEY],
    )).toBe(before);
    expect(bundledContentDigestMatchesBuildV1(
      bundledContentDigestPassV1(db),
    )).toBe(true);

    warned.mockClear();
    lifecycle.reopen();
    db = lifecycle.database;

    expect(warned).not.toHaveBeenCalledWith(
      expect.stringContaining('Bundled content digest mismatch'),
    );
    expect(db.scalar<number>('SELECT total_changes()')).toBe(0);
  });
});
