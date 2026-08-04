import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  reconcileBundledContentRegistryV1,
} from '../../../src/catalog/bundled-content-registry-v1';
import {
  ContentIdentityCollision,
  resolveContentReference,
} from '../../../src/catalog/content-registry';
import { CONTENT_FINGERPRINT_SCHEME_V1 } from '../../../src/catalog/content-identity';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import type { DatabaseContext } from '../../../src/db/database';
import type { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import type { ContentKey } from '../../../src/domain/ids';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const EXPECTED_BUNDLED_COUNTS = [
  { content_kind: 'armor', aggregate_count: 13 },
  { content_kind: 'background', aggregate_count: 4 },
  { content_kind: 'class', aggregate_count: 12 },
  { content_kind: 'feat', aggregate_count: 17 },
  { content_kind: 'species', aggregate_count: 9 },
  { content_kind: 'spell', aggregate_count: 339 },
  { content_kind: 'subclass', aggregate_count: 2 },
  { content_kind: 'weapon', aggregate_count: 38 },
] as const;

const MUTATED_SPELL_KEY = '2024:acid-arrow' as ContentKey;

describe('CI-3s bundled stable-key fingerprint registration', () => {
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

  afterEach(() => lifecycle.close());

  it('registers every real-boot bundled aggregate under its stable key with one current v1 fingerprint', () => {
    const registryCounts = db.allRaw(
      `SELECT content_kind, count(*) AS aggregate_count
       FROM catalog_content_identities
       WHERE key_kind = 'bundled-stable' AND catalog_layer = 'bundled'
       GROUP BY content_kind ORDER BY content_kind`,
    );
    const currentCounts = db.allRaw(
      `SELECT content_kind, count(*) AS aggregate_count
       FROM catalog_content_fingerprints
       WHERE fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'
       GROUP BY content_kind ORDER BY content_kind`,
    );

    expect(registryCounts).toEqual(EXPECTED_BUNDLED_COUNTS);
    expect(currentCounts).toEqual(EXPECTED_BUNDLED_COUNTS);
    expect(db.scalar(
      `SELECT count(*) FROM catalog_content_identities
       WHERE key_kind <> 'bundled-stable' OR catalog_layer <> 'bundled'`,
    )).toBe(0);
    expect(reconcileBundledContentRegistryV1(db)).toEqual({
      projected: 434,
      registered: 0,
      unchanged: 434,
      moved: 0,
    });
  });

  it('CI-SRD-KEY-FIRST preserves the stable key and row id when a mutated extraction moves its fingerprint', () => {
    const beforeRoot = db.oneRaw(
      `SELECT id, content_key FROM spell_versions WHERE content_key = ?`,
      [MUTATED_SPELL_KEY],
    );
    const beforeFingerprint = db.oneRaw(
      `SELECT fingerprint_digest, canonical_json
       FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'`,
      [MUTATED_SPELL_KEY],
    );
    expect(beforeRoot).not.toBeNull();
    expect(beforeFingerprint).not.toBeNull();

    // This row is the post-parser extraction fixture: only its bundled rule
    // prose changes, exactly as a corrected source extract would change it.
    db.exec(
      `UPDATE spell_versions
       SET short_summary = short_summary || ' Corrected extraction.'
       WHERE content_key = ?`,
      [MUTATED_SPELL_KEY],
    );
    const result = reconcileBundledContentRegistryV1(db);
    const afterRoot = db.oneRaw(
      `SELECT id, content_key FROM spell_versions WHERE content_key = ?`,
      [MUTATED_SPELL_KEY],
    );
    const fingerprints = db.allRaw(
      `SELECT fingerprint_digest, canonical_json, fingerprint_role
       FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
       ORDER BY fingerprint_role`,
      [MUTATED_SPELL_KEY],
    );

    expect(afterRoot).toEqual(beforeRoot);
    expect(result.moved).toBe(1);
    expect(fingerprints).toHaveLength(2);
    expect(fingerprints).toContainEqual({
      fingerprint_digest: beforeFingerprint!.fingerprint_digest,
      canonical_json: beforeFingerprint!.canonical_json,
      fingerprint_role: 'bundled-historical',
    });
    expect(fingerprints.find((row) => row.fingerprint_role === 'current')?.fingerprint_digest)
      .not.toBe(beforeFingerprint!.fingerprint_digest);
    expect(resolveContentReference(db, {
      kind: 'spell',
      contentKey: MUTATED_SPELL_KEY,
    })).toEqual({
      kind: 'exact',
      contentKey: MUTATED_SPELL_KEY,
      matchClass: 'stored-key',
      reviewRequired: false,
    });
  });

  it('CI-SRD-FALLBACK-REVIEW routes a bundled historical fingerprint to review without overwriting the row', () => {
    const historical = db.oneRaw(
      `SELECT fingerprint_digest FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'`,
      [MUTATED_SPELL_KEY],
    );
    expect(historical).not.toBeNull();
    db.exec(
      `UPDATE spell_versions
       SET short_summary = short_summary || ' Corrected extraction.'
       WHERE content_key = ?`,
      [MUTATED_SPELL_KEY],
    );
    reconcileBundledContentRegistryV1(db);
    const beforeResolution = db.oneRaw(
      `SELECT id, content_key, short_summary
       FROM spell_versions WHERE content_key = ?`,
      [MUTATED_SPELL_KEY],
    );
    const incoming =
      `2024:content.v1:${String(historical!.fingerprint_digest)}` as ContentKey;

    expect(resolveContentReference(db, {
      kind: 'spell',
      contentKey: incoming,
    })).toEqual({
      kind: 'fingerprint',
      contentKey: MUTATED_SPELL_KEY,
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      matchClass: 'srd-fallback',
      reviewRequired: true,
    });
    expect(db.oneRaw(
      `SELECT id, content_key, short_summary
       FROM spell_versions WHERE content_key = ?`,
      [MUTATED_SPELL_KEY],
    )).toEqual(beforeResolution);
  });

  it('reprojects bundled content with its authoritative stored normalized name', () => {
    const simulatedNewerUcdLetter = '\u0378';
    db.exec(
      `UPDATE catalog_content_identities SET normalized_name = ?
       WHERE content_kind = 'spell' AND content_key = ?`,
      [simulatedNewerUcdLetter, MUTATED_SPELL_KEY],
    );

    expect(reconcileBundledContentRegistryV1(db).moved).toBe(1);
    expect(db.scalar(
      `SELECT normalized_name FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [MUTATED_SPELL_KEY],
    )).toBe(simulatedNewerUcdLetter);
    expect(db.scalar<string>(
      `SELECT canonical_json FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'`,
      [MUTATED_SPELL_KEY],
    )).toContain(`"normalizedName":"${simulatedNewerUcdLetter}"`);
  });

  it('refuses damaged bundled fingerprint bytes instead of retaining false history', () => {
    db.exec(
      `UPDATE catalog_content_fingerprints SET canonical_json = 'damaged'
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'`,
      [MUTATED_SPELL_KEY],
    );

    expect(() => reconcileBundledContentRegistryV1(db))
      .toThrow(ContentIdentityCollision);
    expect(db.allRaw(
      `SELECT canonical_json, fingerprint_role
       FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?`,
      [MUTATED_SPELL_KEY],
    )).toEqual([{
      canonical_json: 'damaged',
      fingerprint_role: 'current',
    }]);
  });
});
