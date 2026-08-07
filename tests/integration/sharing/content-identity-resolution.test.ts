import type { Database } from '@sqlite.org/sqlite-wasm';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  registerAssertedContentIdentity,
  registerContentAlias,
  registerContentFingerprint,
  registerDerivedContentIdentity,
  rememberContentMatchDecision,
  resolveContentReference,
} from '../../../src/catalog/content-registry';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  deriveContentIdentityV1,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import { projectStoredContentV1 } from '../../../src/catalog/stored-content-projector-v1';
import { spellProjectorV1Vectors } from '../../unit/catalog/fixtures/spell-projector-v1-vectors';
import { DatabaseContext } from '../../../src/db/database';
import { applicationSeed } from '../../../src/db/bootstrap';
import type { ContentKey } from '../../../src/domain/ids';
import {
  commitCharacterShareImport,
  importCharacterShare,
  previewCharacterShare,
} from '../../../src/sharing/character-share';
import {
  positionalToShareDocument,
  shareDocumentToReferencePositional,
} from '../../../src/sharing/codec';
import type { CharacterShareDocument } from '../../../src/sharing/schema';
import { openTestDatabase } from '../../helpers/open-db';
import {
  FROZEN_IDENTITY_REFERENCE_DIGESTS,
  FROZEN_V10_IDENTITY_REFERENCE_FRAGMENT,
  FROZEN_V17_IDENTITY_REFERENCE_FRAGMENT,
  FROZEN_V17_MATCHING_DIGEST_REFERENCE_FRAGMENT,
  IDENTITY_REFERENCE_KEYS,
} from '../../fixtures/character-share-identity-wires';

const AETHER_KEY = IDENTITY_REFERENCE_KEYS.asserted as ContentKey;

let connection: Database;
let db: DatabaseContext;

function installAetherDefinition(
  contentKey: ContentKey,
  spellIdentityKey: string,
): void {
  const identityId = db.exec(
    `INSERT INTO spell_identities (
       content_key, canonical_name, normalized_name
     ) VALUES (?, 'Aether Lance', 'aether lance')`,
    [spellIdentityKey],
  ).lastInsertId;
  const versionId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition, level,
       school, ritual, concentration, casting_time, action_type, range,
       range_kind, range_feet, area_shape, area_feet, duration, components,
       material_component_summary, material_cost_copper, material_cost_kind,
       healing, short_summary, upcast_summary, cantrip_upgrade_summary,
       requires_mod_for_effect, effect_reliability_category, provenance
     ) VALUES (?, ?, 'Aether Lance', 'expanded', 2, 'Chronomancy', 0, 1,
       '1 bonus action\r\n ', 'Bonus Action', 'Self (30-foot Cone)', 'self',
       NULL, 'cone', 30, 'Concentration, up to 1 minute',
       'V, S, M (a prism worth 25+ GP)', 'a prism worth 25+ GP', 2500,
       'minimum', 0, 'A line of force.  \r\n',
       'Slot 3–5: +2; slot 6+: +3.', NULL, 1, 'modifier_scaled', 'import')`,
    [contentKey, identityId],
  ).lastInsertId;
  for (const value of ['Wizard', 'Artificer']) {
    db.exec(
      'INSERT INTO spell_list_memberships (spell_version_id, spell_list_key) VALUES (?, ?)',
      [versionId, value],
    );
  }
  for (const value of ['force', 'concentration']) {
    db.exec(
      'INSERT INTO spell_version_tags (spell_version_id, tag) VALUES (?, ?)',
      [versionId, value],
    );
  }
  db.exec(
    "INSERT INTO spell_version_attack_modes (spell_version_id, attack_mode) VALUES (?, 'ranged_spell')",
    [versionId],
  );
  db.exec(
    "INSERT INTO spell_version_save_abilities (spell_version_id, save_ability) VALUES (?, 'Dexterity')",
    [versionId],
  );
  for (const level of [3, 6]) {
    db.exec(
      'INSERT INTO spell_version_upcast_levels (spell_version_id, level) VALUES (?, ?)',
      [versionId, level],
    );
  }
}

function installAetherLance(): void {
  const vector = spellProjectorV1Vectors[0]!;
  registerAssertedContentIdentity(db, {
    kind: 'spell',
    edition: vector.aggregate.rules_edition,
    name: vector.aggregate.name,
    payload: vector.payload,
    assertedKey: AETHER_KEY,
  });
  installAetherDefinition(AETHER_KEY, 'aether-lance');
  registerContentAlias(db, {
    kind: 'spell',
    aliasKey: IDENTITY_REFERENCE_KEYS.legacyAlias as ContentKey,
    contentKey: AETHER_KEY,
    aliasKind: 'declared-legacy',
  });
}

function installDerivedAetherLance(): ContentKey {
  const vector = spellProjectorV1Vectors[0]!;
  const identity = registerDerivedContentIdentity(db, {
    kind: 'spell',
    edition: vector.aggregate.rules_edition,
    name: vector.aggregate.name,
    payload: vector.payload,
  });
  installAetherDefinition(identity.derivedKey, 'aether-lance-derived');
  return identity.derivedKey;
}

function frozenWire(fragment: string): {
  readonly compressed: Buffer;
  readonly original: Buffer;
  readonly raw: unknown;
  readonly document: CharacterShareDocument;
} {
  const compressed = Buffer.from(fragment, 'base64url');
  const original = gunzipSync(compressed);
  const raw: unknown = JSON.parse(original.toString('utf8'));
  return Object.freeze({
    compressed,
    original,
    raw,
    document: positionalToShareDocument(raw),
  });
}

function structuralKeys(value: unknown, keys = new Set<string>()): ReadonlySet<string> {
  if (Array.isArray(value)) {
    for (const child of value) structuralKeys(child, keys);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      keys.add(key);
      structuralKeys(child, keys);
    }
  }
  return keys;
}

function oneSpellDocument(key: string, name: string): CharacterShareDocument {
  const decoded = frozenWire(FROZEN_V17_IDENTITY_REFERENCE_FRAGMENT).document;
  return Object.freeze({
    ...decoded,
    character: Object.freeze({ name }),
    spellbook: Object.freeze([{ spellKey: key }]),
  });
}

function importedSpellKey(characterId: number): string {
  return db.scalar<string>(
    `SELECT spell.content_key
     FROM wizard_spellbook_entries AS entry
     JOIN spell_versions AS spell ON spell.id = entry.spell_version_id
     WHERE entry.character_id = ?`,
    [characterId],
  ) ?? 'missing';
}

beforeEach(async () => {
  connection = await openTestDatabase();
  db = new DatabaseContext(connection);
  applicationSeed(db);
  installAetherLance();
});

afterEach(() => connection.close());

describe('CI-SHARE-REFERENCE', () => {
  it('pins literal compressed fixture bytes and parses their original bytes as reference-only', () => {
    const captures = [
      ['v10', FROZEN_V10_IDENTITY_REFERENCE_FRAGMENT],
      ['v17', FROZEN_V17_IDENTITY_REFERENCE_FRAGMENT],
      ['matchingDigestV17', FROZEN_V17_MATCHING_DIGEST_REFERENCE_FRAGMENT],
    ] as const;
    for (const [name, fragment] of captures) {
      const wire = frozenWire(fragment);
      expect(createHash('sha256').update(wire.compressed).digest('hex'))
        .toBe(FROZEN_IDENTITY_REFERENCE_DIGESTS[name].compressed);
      expect(createHash('sha256').update(wire.original).digest('hex'))
        .toBe(FROZEN_IDENTITY_REFERENCE_DIGESTS[name].original);
      const keys = structuralKeys(wire.document);
      expect(keys.has('aggregate')).toBe(false);
      expect(keys.has('canonical_json')).toBe(false);
      expect(Object.hasOwn(wire.document, 'content')).toBe(false);
    }

    const v10 = frozenWire(FROZEN_V10_IDENTITY_REFERENCE_FRAGMENT).document;
    const v17 = frozenWire(FROZEN_V17_IDENTITY_REFERENCE_FRAGMENT).document;
    expect(v10.spellbook.map((row) => row.spellKey)).toEqual(
      Object.values(IDENTITY_REFERENCE_KEYS),
    );
    expect(v17.spellbook.map((row) => row.spellKey)).toEqual(
      Object.values(IDENTITY_REFERENCE_KEYS),
    );
  });

  it('keeps bundled and matching-digest exact keys silent but reviews unevidenced and divergent external keys', () => {
    const stable = previewCharacterShare(
      db,
      oneSpellDocument(IDENTITY_REFERENCE_KEYS.stable, 'Stable'),
    );
    const asserted = previewCharacterShare(
      db,
      oneSpellDocument(IDENTITY_REFERENCE_KEYS.asserted, 'Asserted'),
    );
    const alias = previewCharacterShare(
      db,
      oneSpellDocument(IDENTITY_REFERENCE_KEYS.legacyAlias, 'Alias'),
    );
    const fallback = previewCharacterShare(
      db,
      oneSpellDocument(
        IDENTITY_REFERENCE_KEYS.fingerprintFallback,
        'Fallback',
      ),
    );

    expect(stable).toMatchObject({ placeholderCount: 0, adoptionPlan: { reviews: [] } });
    expect(asserted.adoptionPlan.reviews).toEqual([
      expect.objectContaining({
        incomingFingerprint: null,
        matchClass: 'key-collision',
        targetContentKey: AETHER_KEY,
        conflictDetails: [expect.objectContaining({
          field: 'Rules identity',
          incomingValue: 'not supplied by reference',
        })],
      }),
    ]);
    expect(alias.adoptionPlan.reviews).toEqual([
      expect.objectContaining({ matchClass: 'alias', targetContentKey: AETHER_KEY }),
    ]);
    expect(fallback.adoptionPlan.reviews).toEqual([
      expect.objectContaining({
        matchClass: 'compatible-fingerprint',
        targetContentKey: AETHER_KEY,
      }),
    ]);

    const derivedKey = installDerivedAetherLance();
    expect(derivedKey).toBe(IDENTITY_REFERENCE_KEYS.fingerprintFallback);
    const matching = previewCharacterShare(
      db,
      frozenWire(FROZEN_V17_MATCHING_DIGEST_REFERENCE_FRAGMENT).document,
    );
    expect(matching).toMatchObject({
      placeholderCount: 0,
      adoptionPlan: {
        reviews: [],
      },
    });
    expect(resolveContentReference(db, {
      kind: 'spell',
      contentKey: derivedKey,
    })).toEqual({
      kind: 'exact',
      contentKey: derivedKey,
      matchClass: 'stored-key',
      reviewRequired: false,
    });

    const matchingWire = frozenWire(FROZEN_V17_MATCHING_DIGEST_REFERENCE_FRAGMENT);
    const emitted = Buffer.from(JSON.stringify(
      shareDocumentToReferencePositional(matchingWire.document),
    ));
    expect(emitted.equals(matchingWire.original)).toBe(true);

    const stored = projectStoredContentV1(db, 'spell', derivedKey);
    const divergentIdentity = deriveContentIdentityV1({
      kind: stored.kind,
      edition: stored.edition,
      name: stored.name,
      payload: stored.payload,
    });
    expect(divergentIdentity.digest).not.toBe(
      IDENTITY_REFERENCE_KEYS.fingerprintFallback.split(':').at(-1),
    );
    db.exec(
      `DELETE FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?`,
      [derivedKey],
    );
    registerContentFingerprint(db, {
      kind: 'spell',
      contentKey: derivedKey,
      scheme: divergentIdentity.envelope.scheme,
      digest: divergentIdentity.digest,
      canonicalJson: divergentIdentity.canonicalJson,
      role: 'current',
    });
    const divergent = previewCharacterShare(
      db,
      frozenWire(FROZEN_V17_MATCHING_DIGEST_REFERENCE_FRAGMENT).document,
    );
    expect(divergent.adoptionPlan.reviews).toEqual([
      expect.objectContaining({
        matchClass: 'key-collision',
        targetContentKey: derivedKey,
      }),
    ]);
  });

  it('remembers a reviewed fallback match and routes both imports to the local candidate', () => {
    const document = oneSpellDocument(
      IDENTITY_REFERENCE_KEYS.fingerprintFallback,
      'Remember fallback',
    );
    const preview = previewCharacterShare(db, document);
    const id = preview.adoptionPlan.reviews[0]!.id;
    const choices = { [id]: { decision: 'match' as const } };
    const committed = commitCharacterShareImport(
      db,
      document,
      preview.adoptionPlan.token,
      choices,
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') return;
    expect(importedSpellKey(committed.result.characterId)).toBe(AETHER_KEY);

    const repeated = previewCharacterShare(db, document);
    expect(repeated.adoptionPlan.reviews).toEqual([]);
    expect(repeated.adoptionPlan.outcomes).toEqual([
      expect.objectContaining({ kind: 'remembered-match', contentKey: AETHER_KEY }),
    ]);
  });

  it('does not reuse a backup fingerprint receipt for a share alias and does reuse the share receipt', () => {
    const localDigest = db.scalar<string>(
      `SELECT fingerprint_digest FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_scheme = 'content-v1' AND fingerprint_role = 'current'`,
      [AETHER_KEY],
    ) as ContentFingerprintDigest;
    rememberContentMatchDecision(db, {
      kind: 'spell',
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      digest: localDigest,
      decision: 'clone',
      targetContentKey: IDENTITY_REFERENCE_KEYS.stable as ContentKey,
    });

    const document = oneSpellDocument(
      IDENTITY_REFERENCE_KEYS.legacyAlias,
      'Scoped share receipt',
    );
    const preview = previewCharacterShare(db, document);
    expect(preview.adoptionPlan.reviews).toEqual([
      expect.objectContaining({
        incomingFingerprint: null,
        matchClass: 'alias',
        targetContentKey: AETHER_KEY,
      }),
    ]);
    expect(preview.adoptionPlan.outcomes).not.toEqual([
      expect.objectContaining({ kind: 'remembered-clone' }),
    ]);

    const reviewId = preview.adoptionPlan.reviews[0]!.id;
    const choices = { [reviewId]: { decision: 'match' as const } };
    const committed = commitCharacterShareImport(
      db,
      document,
      preview.adoptionPlan.token,
      choices,
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') return;
    expect(importedSpellKey(committed.result.characterId)).toBe(AETHER_KEY);
    expect(db.scalar<number>(
      'SELECT count(*) FROM catalog_content_match_decisions',
    )).toBe(2);

    const repeated = previewCharacterShare(db, document);
    expect(repeated.adoptionPlan.reviews).toEqual([]);
    expect(repeated.adoptionPlan.outcomes).toEqual([
      expect.objectContaining({ kind: 'remembered-match', contentKey: AETHER_KEY }),
    ]);
  });

  it('clones the local fallback candidate, remembers it, and leaves the candidate unchanged', () => {
    const document = oneSpellDocument(
      IDENTITY_REFERENCE_KEYS.fingerprintFallback,
      'Clone fallback',
    );
    const preview = previewCharacterShare(db, document);
    const id = preview.adoptionPlan.reviews[0]!.id;
    const choices = {
      [id]: { decision: 'clone' as const, cloneName: 'Aether Lance Private' },
    };
    const replanned = previewCharacterShare(db, document, choices);
    const committed = commitCharacterShareImport(
      db,
      document,
      replanned.adoptionPlan.token,
      choices,
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') return;
    const cloneKey = importedSpellKey(committed.result.characterId);
    expect(cloneKey).toBe('expanded:content.spell:aether-lance-private');
    expect(db.scalar<string>(
      'SELECT display_name FROM spell_versions WHERE content_key = ?',
      [AETHER_KEY],
    )).toBe('Aether Lance');

    const repeated = previewCharacterShare(db, document);
    expect(repeated.adoptionPlan.reviews).toEqual([]);
    expect(repeated.adoptionPlan.outcomes).toEqual([
      expect.objectContaining({ kind: 'remembered-clone', contentKey: cloneKey }),
    ]);
  });

  it('reuses one placeholder when the same missing spell share is imported twice', () => {
    const missingKey = '2024:content.spell:not-installed';
    const document = oneSpellDocument(missingKey, 'Missing');
    expect(previewCharacterShare(db, document)).toMatchObject({
      placeholderCount: 1,
      adoptionPlan: { reviews: [] },
    });
    const first = importCharacterShare(db, document);
    const placeholderId = db.scalar<number>(
      'SELECT id FROM spell_versions WHERE content_key = ?',
      [missingKey],
    );
    expect(importedSpellKey(first.characterId)).toBe(missingKey);

    expect(previewCharacterShare(db, document)).toMatchObject({
      placeholderCount: 0,
      adoptionPlan: { reviews: [], outcomes: [] },
    });
    const second = importCharacterShare(db, document);
    expect(second.characterId).not.toBe(first.characterId);
    expect(importedSpellKey(second.characterId)).toBe(missingKey);
    expect(db.allRaw(
      `SELECT id, provenance FROM spell_versions WHERE content_key = ?`,
      [missingKey],
    )).toEqual([{ id: placeholderId, provenance: 'placeholder' }]);
    expect(db.scalar<number>(
      `SELECT count(*) FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [missingKey],
    )).toBe(1);
    expect(db.scalar<number>(
      'SELECT count(*) FROM catalog_content_match_decisions',
    )).toBe(0);
  });

  it('refuses an alias candidate that cannot supply the local clone projection', () => {
    db.exec(
      `DELETE FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?`,
      [AETHER_KEY],
    );
    expect(() => previewCharacterShare(
      db,
      oneSpellDocument(IDENTITY_REFERENCE_KEYS.legacyAlias, 'Damaged alias'),
    )).toThrow(/cannot be reviewed safely/);
    expect(db.scalar<number>(
      `SELECT count(*) FROM characters WHERE name = 'Damaged alias'`,
    )).toBe(0);
  });
});
