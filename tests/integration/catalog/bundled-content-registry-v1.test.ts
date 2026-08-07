import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  bundledContentManifestV1,
  reconcileBundledContentRegistryV1,
  reconcileBundledContentRegistryWithStoredProjectionsV1,
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
import { ensureBundledSpellContent } from '../../../src/rules/spells-srd';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const INDEPENDENT_ROOT_ANCHORS = [
  // These root names are hand-pinned against their stated provenance, while
  // every content_key is the repository's edition/kind/slug convention (not
  // text transcribed from the SRD). None of these literals may be generated
  // from the manifest or persisted rows.
  // SRD weapon names: docs/srd/source/weapons-table.txt:10-11.
  { content_kind: 'weapon', content_key: '2024:weapon:club', root_name: 'Club' },
  {
    content_kind: 'weapon',
    content_key: '2024:weapon:dagger',
    root_name: 'Dagger',
  },
  // SRD armor names: docs/srd/source/armor-table.txt:12-13.
  {
    content_kind: 'armor',
    content_key: '2024:armor:padded-armor',
    root_name: 'Padded Armor',
  },
  {
    content_kind: 'armor',
    content_key: '2024:armor:leather-armor',
    root_name: 'Leather Armor',
  },
  // SRD spell names: docs/srd/source/spell-descriptions.txt:18-19 and 3414-3415.
  {
    content_kind: 'spell',
    content_key: '2024:acid-arrow',
    root_name: 'Acid Arrow',
  },
  { content_kind: 'spell', content_key: '2024:fireball', root_name: 'Fireball' },
  // SRD class names: docs/srd/source/class-level-tables.txt:10-12 and 35-37.
  {
    content_kind: 'class',
    content_key: '2024:class:barbarian',
    root_name: 'Barbarian',
  },
  { content_kind: 'class', content_key: '2024:class:bard', root_name: 'Bard' },
  // SRD feat names: docs/srd/source/feats.txt:28-29 and 37-38.
  { content_kind: 'feat', content_key: '2024:feat:alert', root_name: 'Alert' },
  {
    content_kind: 'feat',
    content_key: '2024:feat:magic-initiate',
    root_name: 'Magic Initiate',
  },
  // SRD subclass names: docs/srd/source/subclasses.txt:40-165.
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:path-of-the-berserker',
    root_name: 'Path of the Berserker',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:college-of-lore',
    root_name: 'College of Lore',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:life-domain',
    root_name: 'Life Domain',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:circle-of-the-land',
    root_name: 'Circle of the Land',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:champion',
    root_name: 'Champion',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:warrior-of-the-open-hand',
    root_name: 'Warrior of the Open Hand',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:oath-of-devotion',
    root_name: 'Oath of Devotion',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:hunter',
    root_name: 'Hunter',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:thief',
    root_name: 'Thief',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:draconic-sorcery',
    root_name: 'Draconic Sorcery',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:fiend-patron',
    root_name: 'Fiend Patron',
  },
  {
    content_kind: 'subclass',
    content_key: '2024:subclass:evoker',
    root_name: 'Evoker',
  },
  // SRD species names: docs/srd/source/species-descriptions.txt:47-57.
  {
    content_kind: 'species',
    content_key: '2024:species:dragonborn',
    root_name: 'Dragonborn',
  },
  {
    content_kind: 'species',
    content_key: '2024:species:dwarf',
    root_name: 'Dwarf',
  },
  // SRD background names: docs/srd/source/backgrounds.txt:74-84.
  {
    content_kind: 'background',
    content_key: '2024:background:acolyte',
    root_name: 'Acolyte',
  },
  {
    content_kind: 'background',
    content_key: '2024:background:criminal',
    root_name: 'Criminal',
  },
] as const;

const MUTATED_SPELL_KEY = '2024:acid-arrow' as ContentKey;
const DAMAGED_SPELL_KEY = '2024:fireball' as ContentKey;

function anchoredRootName(
  db: DatabaseContext,
  anchor: (typeof INDEPENDENT_ROOT_ANCHORS)[number],
): string | null {
  let sql: string;
  switch (anchor.content_kind) {
    case 'weapon':
      sql = 'SELECT name FROM weapon_templates WHERE content_key = ?';
      break;
    case 'armor':
      sql = 'SELECT name FROM armor_templates WHERE content_key = ?';
      break;
    case 'spell':
      sql = 'SELECT display_name FROM spell_versions WHERE content_key = ?';
      break;
    case 'class':
      sql = 'SELECT name FROM class_definitions WHERE content_key = ?';
      break;
    case 'feat':
      sql = 'SELECT name FROM feat_definitions WHERE content_key = ?';
      break;
    case 'subclass':
      sql = 'SELECT name FROM subclass_definitions WHERE content_key = ?';
      break;
    case 'species':
      sql = 'SELECT name FROM species_templates WHERE content_key = ?';
      break;
    case 'background':
      sql = 'SELECT name FROM background_templates WHERE content_key = ?';
      break;
  }
  return db.scalar<string>(sql, [anchor.content_key]);
}

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
    const expectedEnumeration = bundledContentManifestV1().map((entry) => ({
      content_kind: entry.kind,
      content_key: entry.contentKey,
    }));
    const registryEnumeration = db.allRaw(
      `SELECT content_kind, content_key
       FROM catalog_content_identities
       WHERE key_kind = 'bundled-stable' AND catalog_layer = 'bundled'
       ORDER BY CASE content_kind
         WHEN 'weapon' THEN 0 WHEN 'armor' THEN 1 WHEN 'item' THEN 2
         WHEN 'spell' THEN 3 WHEN 'class' THEN 4 WHEN 'feat' THEN 5
         WHEN 'subclass' THEN 6 WHEN 'species' THEN 7
         WHEN 'background' THEN 8 END,
         content_key`,
    );
    const currentEnumeration = db.allRaw(
      `SELECT fingerprint.content_kind, fingerprint.content_key
       FROM catalog_content_fingerprints AS fingerprint
       INNER JOIN catalog_content_identities AS identity
         ON identity.content_kind = fingerprint.content_kind
        AND identity.content_key = fingerprint.content_key
       WHERE fingerprint.fingerprint_scheme = 'content-v1'
         AND fingerprint.fingerprint_role = 'current'
         AND identity.key_kind = 'bundled-stable'
         AND identity.catalog_layer = 'bundled'
       ORDER BY CASE fingerprint.content_kind
         WHEN 'weapon' THEN 0 WHEN 'armor' THEN 1 WHEN 'item' THEN 2
         WHEN 'spell' THEN 3 WHEN 'class' THEN 4 WHEN 'feat' THEN 5
         WHEN 'subclass' THEN 6 WHEN 'species' THEN 7
         WHEN 'background' THEN 8 END,
         fingerprint.content_key`,
    );

    expect(registryEnumeration).toEqual(expectedEnumeration);
    expect(currentEnumeration).toEqual(expectedEnumeration);
    for (const anchor of INDEPENDENT_ROOT_ANCHORS) {
      expect(registryEnumeration).toContainEqual({
        content_kind: anchor.content_kind,
        content_key: anchor.content_key,
      });
      expect(anchoredRootName(db, anchor)).toBe(anchor.root_name);
    }
    expect(db.scalar(
      `SELECT count(*) FROM catalog_content_identities
       WHERE key_kind <> 'bundled-stable' OR catalog_layer <> 'bundled'`,
    )).toBe(0);
    expect(reconcileBundledContentRegistryV1(db)).toEqual({
      projected: 444,
      orphaned: 0,
      refused: 0,
      registered: 0,
      unchanged: 444,
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

  it('refuses a derived fingerprint key when its bundled historical canonical bytes are damaged', () => {
    const historicalDigest = db.scalar<string>(
      `SELECT fingerprint_digest FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'`,
      [MUTATED_SPELL_KEY],
    );
    expect(historicalDigest).not.toBeNull();
    db.exec(
      `UPDATE spell_versions
       SET short_summary = short_summary || ' Corrected extraction.'
       WHERE content_key = ?`,
      [MUTATED_SPELL_KEY],
    );
    reconcileBundledContentRegistryV1(db);
    db.exec(
      `UPDATE catalog_content_fingerprints SET canonical_json = 'damaged'
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_digest = ?
         AND fingerprint_role = 'bundled-historical'`,
      [MUTATED_SPELL_KEY, historicalDigest],
    );
    const incoming =
      `2024:content.v1:${historicalDigest}` as ContentKey;

    expect(() => resolveContentReference(db, {
      kind: 'spell',
      contentKey: incoming,
    })).toThrow(ContentIdentityCollision);
  });

  it('reports an absent registered root as orphaned without changing its identity or fingerprints', () => {
    const beforeIdentity = db.oneRaw(
      `SELECT content_kind, content_key, key_kind, catalog_layer, normalized_name
       FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [MUTATED_SPELL_KEY],
    );
    const beforeFingerprints = db.allRaw(
      `SELECT fingerprint_digest, canonical_json, fingerprint_role
       FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
       ORDER BY fingerprint_role, fingerprint_digest`,
      [MUTATED_SPELL_KEY],
    );
    db.exec(
      'DELETE FROM spell_versions WHERE content_key = ?',
      [MUTATED_SPELL_KEY],
    );

    expect(reconcileBundledContentRegistryV1(db)).toEqual({
      projected: 443,
      orphaned: 1,
      refused: 0,
      registered: 0,
      unchanged: 443,
      moved: 0,
    });
    expect(db.oneRaw(
      `SELECT content_kind, content_key, key_kind, catalog_layer, normalized_name
       FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [MUTATED_SPELL_KEY],
    )).toEqual(beforeIdentity);
    expect(db.allRaw(
      `SELECT fingerprint_digest, canonical_json, fingerprint_role
       FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
       ORDER BY fingerprint_role, fingerprint_digest`,
      [MUTATED_SPELL_KEY],
    )).toEqual(beforeFingerprints);
  });

  it('reconciles a template-only species aggregate', () => {
    expect(db.scalar(
      `SELECT count(*) FROM species_definitions
       WHERE content_key = '2024:species:dragonborn'`,
    )).toBe(0);

    expect(reconcileBundledContentRegistryV1(db)).toEqual({
      projected: 444,
      orphaned: 0,
      refused: 0,
      registered: 0,
      unchanged: 444,
      moved: 0,
    });
  });

  it('reconciles agreeing definition and template species halves', () => {
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable
       ) VALUES ('2024:species:dragonborn', 'Dragonborn', '2024', 0)`,
    );

    expect(reconcileBundledContentRegistryV1(db)).toEqual({
      projected: 444,
      orphaned: 0,
      refused: 0,
      registered: 0,
      unchanged: 443,
      moved: 1,
    });
  });

  it('reports a definition-only species aggregate as orphaned before projection', () => {
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable
       ) VALUES ('2024:species:dragonborn', 'Dragonborn', '2024', 0)`,
    );
    db.exec(
      `DELETE FROM species_templates
       WHERE content_key = '2024:species:dragonborn'`,
    );

    expect(reconcileBundledContentRegistryV1(db)).toEqual({
      projected: 443,
      orphaned: 1,
      refused: 0,
      registered: 0,
      unchanged: 443,
      moved: 0,
    });
  });

  it('reports a template-only background aggregate as orphaned before projection', () => {
    db.exec(
      `DELETE FROM background_definitions
       WHERE content_key = '2024:background:acolyte'`,
    );

    expect(reconcileBundledContentRegistryV1(db)).toEqual({
      projected: 443,
      orphaned: 1,
      refused: 0,
      registered: 0,
      unchanged: 443,
      moved: 0,
    });
  });

  it('reports a definition-only background aggregate as orphaned before projection', () => {
    db.exec(
      `DELETE FROM background_templates
       WHERE content_key = '2024:background:acolyte'`,
    );

    expect(reconcileBundledContentRegistryV1(db)).toEqual({
      projected: 443,
      orphaned: 1,
      refused: 0,
      registered: 0,
      unchanged: 443,
      moved: 0,
    });
  });

  it('keeps disagreement between present aggregate halves fatal', () => {
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable
       ) VALUES ('2024:species:dragonborn', 'Not Dragonborn', '2024', 0)`,
    );

    expect(() => reconcileBundledContentRegistryV1(db)).toThrow(
      "Bundled species '2024:species:dragonborn' has inconsistent root names.",
    );
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
    const beforeIdentity = db.oneRaw(
      `SELECT * FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [MUTATED_SPELL_KEY],
    );
    const beforeFingerprints = db.allRaw(
      `SELECT * FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
       ORDER BY fingerprint_scheme, fingerprint_digest, fingerprint_role`,
      [MUTATED_SPELL_KEY],
    );

    expect(reconcileBundledContentRegistryV1(db)).toEqual({
      projected: 443,
      orphaned: 0,
      refused: 1,
      registered: 0,
      unchanged: 443,
      moved: 0,
    });
    expect(db.oneRaw(
      `SELECT * FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [MUTATED_SPELL_KEY],
    )).toEqual(beforeIdentity);
    expect(db.allRaw(
      `SELECT * FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
       ORDER BY fingerprint_scheme, fingerprint_digest, fingerprint_role`,
      [MUTATED_SPELL_KEY],
    )).toEqual(beforeFingerprints);
  });

  it('repairs seed-stale content while refusing damaged bytes elsewhere in the same pass', () => {
    const staleCurrent = db.oneRaw(
      `SELECT fingerprint_digest, canonical_json
       FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'`,
      [MUTATED_SPELL_KEY],
    );
    expect(staleCurrent).not.toBeNull();
    const descriptions = readFileSync(
      new URL('../../../docs/srd/source/spell-descriptions.txt', import.meta.url),
      'utf8',
    );
    const shippedSentence = 'within range and bursts in a spray of acid.';
    const correctedSentence =
      'within range and bursts in a corrected spray of acid.';
    expect(descriptions.split(shippedSentence)).toHaveLength(2);
    db.exec(
      `UPDATE catalog_content_fingerprints SET canonical_json = 'damaged'
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'`,
      [DAMAGED_SPELL_KEY],
    );
    const beforeRefusedIdentity = db.oneRaw(
      `SELECT * FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [DAMAGED_SPELL_KEY],
    );
    const beforeRefusedFingerprints = db.allRaw(
      `SELECT * FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
       ORDER BY fingerprint_scheme, fingerprint_digest, fingerprint_role`,
      [DAMAGED_SPELL_KEY],
    );

    const reconciliation =
      reconcileBundledContentRegistryWithStoredProjectionsV1(db);
    const result = ensureBundledSpellContent(
      db,
      reconciliation.storedProjections,
      {
        descriptionExtract: descriptions.replace(
          shippedSentence,
          correctedSentence,
        ),
      },
    );
    expect(result).toMatchObject({ healthy: 337, updated: 1, refused: 1 });
    const repairedFingerprints = db.allRaw(
      `SELECT fingerprint_digest, canonical_json, fingerprint_role
       FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
       ORDER BY fingerprint_role, fingerprint_digest`,
      [MUTATED_SPELL_KEY],
    );
    expect(repairedFingerprints).toHaveLength(2);
    expect(repairedFingerprints).toContainEqual({
      fingerprint_digest: staleCurrent!.fingerprint_digest,
      canonical_json: staleCurrent!.canonical_json,
      fingerprint_role: 'bundled-historical',
    });
    const repairedCurrent = repairedFingerprints.find(
      (row) => row.fingerprint_role === 'current',
    );
    expect(repairedCurrent?.fingerprint_digest)
      .not.toBe(staleCurrent!.fingerprint_digest);
    expect(repairedCurrent?.canonical_json)
      .toContain('corrected spray of acid.');
    expect(db.oneRaw(
      `SELECT * FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [DAMAGED_SPELL_KEY],
    )).toEqual(beforeRefusedIdentity);
    expect(db.allRaw(
      `SELECT * FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
       ORDER BY fingerprint_scheme, fingerprint_digest, fingerprint_role`,
      [DAMAGED_SPELL_KEY],
    )).toEqual(beforeRefusedFingerprints);
  });

  it('BOOT-SEEDER-STORED-DRIFT heals stored prose whose registry fingerprint was untouched', () => {
    const beforeSummary = db.scalar<string>(
      `SELECT short_summary FROM spell_versions WHERE content_key = ?`,
      [MUTATED_SPELL_KEY],
    );
    const beforeCurrent = db.oneRaw(
      `SELECT fingerprint_digest, canonical_json
       FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'`,
      [MUTATED_SPELL_KEY],
    );
    expect(beforeSummary).not.toBeNull();
    expect(beforeCurrent).not.toBeNull();
    const drift = ' Stored drift that must not survive boot.';
    db.exec(
      `UPDATE spell_versions SET short_summary = short_summary || ?
       WHERE content_key = ?`,
      [drift, MUTATED_SPELL_KEY],
    );
    expect(db.scalar<string>(
      `SELECT fingerprint_digest FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_role = 'current'`,
      [MUTATED_SPELL_KEY],
    )).toBe(beforeCurrent!.fingerprint_digest);

    lifecycle.reopen();
    db = lifecycle.database;

    expect(db.scalar<string>(
      `SELECT short_summary FROM spell_versions WHERE content_key = ?`,
      [MUTATED_SPELL_KEY],
    )).toBe(beforeSummary);
    const afterFingerprints = db.allRaw(
      `SELECT fingerprint_digest, canonical_json, fingerprint_role
       FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
       ORDER BY fingerprint_role, fingerprint_digest`,
      [MUTATED_SPELL_KEY],
    );
    expect(afterFingerprints).toHaveLength(2);
    expect(afterFingerprints).toContainEqual({
      fingerprint_digest: beforeCurrent!.fingerprint_digest,
      canonical_json: beforeCurrent!.canonical_json,
      fingerprint_role: 'current',
    });
    const reviewedDrift = afterFingerprints.find(
      (fingerprint) => fingerprint.fingerprint_role === 'bundled-historical',
    );
    expect(reviewedDrift?.fingerprint_digest)
      .not.toBe(beforeCurrent!.fingerprint_digest);
    expect(reviewedDrift?.canonical_json).toContain(drift.trim());
  });

  it('BOOT-SEEDER-UNCHANGED-CONTROL writes nothing on an unchanged real boot', () => {
    lifecycle.reopen();
    db = lifecycle.database;

    expect(db.scalar<number>('SELECT total_changes()')).toBe(0);
  });
});
