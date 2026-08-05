import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ContentIdentityCollision,
  forgetContentMatchDecision,
  projectContentGraphInDependencyOrder,
  registerBundledStableContentIdentity,
  registerContentAlias,
  registerContentFingerprint,
  registerDerivedContentIdentity,
  rememberContentMatchDecision,
  rememberedContentMatchDecision,
  resolveContentAggregate,
  resolveContentReference,
} from '../../../src/catalog/content-registry';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  type CanonicalContentIdentityJson,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { APPLICATION_TABLES } from '../../../src/domain/contracts/tables';
import { openTestDatabase } from '../../helpers/open-db';
import {
  assertedExternalContentKey,
  assertedExternalContentKeyFromDeclared,
  isAssertedExternalContentKey,
} from '../../../src/catalog/catalog-key';

const ABC_DIGEST =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const ABC_CANONICAL = 'abc' as CanonicalContentIdentityJson;
const HAND_PINNED_FEAT = {
  kind: 'feat' as const,
  edition: '2024',
  name: 'Iron Will',
  payload: {
    description: 'Stand firm.',
    minimumLevel: null,
    repeatable: false,
    tags: [] as readonly string[],
  },
};
const HAND_PINNED_FEAT_KEY =
  '2024:content.v1:d334236f1f1190cd326854b0bdee3fd7d1eeafd527367062aa7f93b2b491e6b7' as ContentKey;

let connection: Database;
let db: DatabaseContext;

beforeEach(async () => {
  connection = await openTestDatabase();
  db = new DatabaseContext(connection);
});

afterEach(() => {
  connection.close();
});

function bundled(
  contentKey: string,
  kind: 'feat' | 'spell' = 'feat',
): ContentKey {
  const key = contentKey as ContentKey;
  registerBundledStableContentIdentity(db, {
    kind,
    contentKey: key,
    normalizedName: contentKey.replaceAll(':', ''),
  });
  return key;
}

function addAbcFingerprint(
  contentKey: ContentKey,
  kind: 'feat' | 'spell' = 'feat',
): void {
  registerContentFingerprint(db, {
    kind,
    contentKey,
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    digest: ABC_DIGEST as ContentFingerprintDigest,
    canonicalJson: ABC_CANONICAL,
    role: 'compatible',
  });
}

describe('catalog content registry resolution', () => {
  it('keeps the asserted-key SQL CHECK exactly aligned with the shared normalizer grammar', () => {
    const emitted = [
      assertedExternalContentKey('item', '2024', 'Clockwork Ægis'),
      assertedExternalContentKey('feat', 'Expanded Rules', 'Iron--Will', 'com.example.brews'),
      assertedExternalContentKeyFromDeclared('spell', '2024', 'True Strike', '2024:true-strike'),
    ];
    for (const [index, contentKey] of emitted.entries()) {
      expect(isAssertedExternalContentKey(contentKey), contentKey).toBe(true);
      expect(() => db.exec(
        `INSERT INTO catalog_content_identities
           (content_key, content_kind, key_kind, catalog_layer, normalized_name)
         VALUES (?, 'item', 'asserted', 'external', ?)`,
        [contentKey, `emitted${String(index)}`],
      ), contentKey).not.toThrow();
    }

    // Residual delta: EMPTY. These are representatives of every broader form
    // the former SQL approximation accepted beyond the normalizer.
    const formerlySqlOnly = [
      '2024:owner:name:extra',
      '2024:owner:name',
      '2024.bad:name',
      '2024:owner.name.bad',
      '2024:owner.-name:thing',
      '2024-:name',
      '2024:-name',
    ];
    for (const contentKey of formerlySqlOnly) {
      expect(isAssertedExternalContentKey(contentKey), contentKey).toBe(false);
      expect(() => db.exec(
        `INSERT INTO catalog_content_identities
           (content_key, content_kind, key_kind, catalog_layer, normalized_name)
         VALUES (?, 'item', 'asserted', 'external', 'sql-only')`,
        [contentKey],
      ), contentKey).toThrow('catalog_content_identities_key_layer_check');
    }
  });

  it('classifies the exact derived key and bytes as a trivial self-match without a receipt', () => {
    const identity = registerDerivedContentIdentity(db, HAND_PINNED_FEAT);
    expect(identity.derivedKey).toBe(HAND_PINNED_FEAT_KEY);

    const result = resolveContentAggregate(db, HAND_PINNED_FEAT);

    expect(result.resolution).toEqual({
      kind: 'exact',
      contentKey: HAND_PINNED_FEAT_KEY,
      matchClass: 'trivial-self-match',
      reviewRequired: false,
    });
    expect(
      db.scalar('SELECT count(*) FROM catalog_content_match_decisions'),
    ).toBe(0);
  });

  it('keeps an exact metadata conflict review-required', () => {
    registerDerivedContentIdentity(db, HAND_PINNED_FEAT);

    expect(
      resolveContentAggregate(db, {
        ...HAND_PINNED_FEAT,
        metadataConflict: true,
      }).resolution,
    ).toEqual({
      kind: 'exact',
      contentKey: HAND_PINNED_FEAT_KEY,
      matchClass: 'metadata-conflict',
      reviewRequired: true,
    });
  });

  it('uses exact stored key before an ambiguous alias or fingerprint', () => {
    const exactKey = bundled('2024:feat:exact');
    const otherKey = bundled('2024:feat:other');
    registerContentAlias(db, {
      kind: 'feat',
      aliasKey: exactKey,
      contentKey: otherKey,
      aliasKind: 'bundled-legacy',
    });
    addAbcFingerprint(otherKey);

    expect(
      resolveContentReference(db, {
        kind: 'feat',
        contentKey: exactKey,
      }),
    ).toEqual({
      kind: 'exact',
      contentKey: exactKey,
      matchClass: 'stored-key',
      reviewRequired: false,
    });
  });

  it('returns every target of an ambiguous alias and never chooses one', () => {
    const first = bundled('2024:feat:first');
    const second = bundled('2024:feat:second');
    const alias = '2014:feat:shared' as ContentKey;
    for (const contentKey of [second, first]) {
      registerContentAlias(db, {
        kind: 'feat',
        aliasKey: alias,
        contentKey,
        aliasKind: 'bundled-legacy',
      });
    }

    expect(resolveContentReference(db, { kind: 'feat', contentKey: alias })).toEqual({
      kind: 'ambiguous',
      candidates: [first, second],
      at: 'alias',
      reviewRequired: false,
    });
  });

  it('returns every target at the strongest matching fingerprint', () => {
    const first = bundled('2024:feat:first');
    const second = bundled('2024:feat:second');
    addAbcFingerprint(first);
    addAbcFingerprint(second);
    const key =
      `2024:content.v1:${ABC_DIGEST}` as ContentKey;

    expect(resolveContentReference(db, { kind: 'feat', contentKey: key })).toEqual({
      kind: 'ambiguous',
      candidates: [first, second],
      at: 'fingerprint',
      reviewRequired: false,
    });
  });

  it('refuses an ambiguous fingerprint when the second matching row is damaged', () => {
    const first = bundled('2024:feat:first');
    const second = bundled('2024:feat:second');
    addAbcFingerprint(first);
    addAbcFingerprint(second);
    db.exec(
      `UPDATE catalog_content_fingerprints SET canonical_json = 'damaged'
       WHERE content_kind = 'feat' AND content_key = ?
         AND fingerprint_scheme = 'content-v1'
         AND fingerprint_digest = ?`,
      [second, ABC_DIGEST],
    );
    const key = `2024:content.v1:${ABC_DIGEST}` as ContentKey;

    expect(() => resolveContentReference(db, {
      kind: 'feat',
      contentKey: key,
    })).toThrow(ContentIdentityCollision);
  });

  it('labels a unique bundled fingerprint fallback as review-required', () => {
    const srdKey = bundled('2024:magic-missile', 'spell');
    addAbcFingerprint(srdKey, 'spell');
    const incoming =
      `2024:content.v1:${ABC_DIGEST}` as ContentKey;

    expect(
      resolveContentReference(db, {
        kind: 'spell',
        contentKey: incoming,
      }),
    ).toEqual({
      kind: 'fingerprint',
      contentKey: srdKey,
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      matchClass: 'srd-fallback',
      reviewRequired: true,
    });
  });

  it('refuses digest-equal but byte-different fingerprint content', () => {
    const target = bundled('2024:feat:collision');
    addAbcFingerprint(target);

    expect(() =>
      resolveContentAggregate(db, {
        kind: 'feat',
        edition: '2024',
        name: 'Different bytes',
        payload: { value: 1 },
        compatibleFingerprints: [
          {
            scheme: CONTENT_FINGERPRINT_SCHEME_V1,
            digest: ABC_DIGEST as ContentFingerprintDigest,
            canonicalJson: 'not abc' as CanonicalContentIdentityJson,
          },
        ],
      }),
    ).toThrow(ContentIdentityCollision);
  });

  it('allows same-name/different-properties roots to coexist', () => {
    const first = registerDerivedContentIdentity(db, {
      kind: 'feat',
      edition: '2024',
      name: 'Shared Name',
      payload: { repeatable: false },
    });
    const second = registerDerivedContentIdentity(db, {
      kind: 'feat',
      edition: '2024',
      name: 'Shared Name',
      payload: { repeatable: true },
    });

    db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable
       ) VALUES (?, 'Shared Name', '2024', 0),
                (?, 'Shared Name', '2024', 1)`,
      [first.derivedKey, second.derivedKey],
    );

    expect(
      db.scalar(
        `SELECT count(*) FROM feat_definitions
         WHERE name = 'Shared Name' AND rules_edition = '2024'`,
      ),
    ).toBe(2);
  });
});

describe('catalog registry controls', () => {
  it('keeps new registration on the closed derived/bundled paths', () => {
    registerDerivedContentIdentity(db, HAND_PINNED_FEAT);
    bundled('2024:feat:bundled');

    expect(
      db.allRaw(
        `SELECT key_kind, catalog_layer
         FROM catalog_content_identities
         ORDER BY key_kind`,
      ),
    ).toEqual([
      { key_kind: 'bundled-stable', catalog_layer: 'bundled' },
      { key_kind: 'derived', catalog_layer: 'external' },
    ]);
  });

  it('refuses to attach an aggregate root to a key registered for another kind', () => {
    const featKey = bundled('2024:shared-root-key');

    expect(() =>
      db.exec(
        `INSERT INTO class_definitions (
           content_key, name, rules_edition
         ) VALUES (?, 'Wrong Kind', '2024')`,
        [featKey],
      ),
    ).toThrow('class content key is registered for another kind');
    expect(
      db.scalar(
        `SELECT count(*) FROM class_definitions
         WHERE content_key = ?`,
        [featKey],
      ),
    ).toBe(0);
  });

  it('refuses a cyclic dependency graph before projection or registry writes', () => {
    let projectionCount = 0;
    expect(() =>
      projectContentGraphInDependencyOrder(
        [
          { key: 'class', dependencies: ['subclass'] },
          { key: 'subclass', dependencies: ['class'] },
        ],
        () => {
          projectionCount += 1;
          return registerDerivedContentIdentity(db, HAND_PINNED_FEAT);
        },
      ),
    ).toThrow('contains a cycle');
    expect(projectionCount).toBe(0);
    expect(
      db.scalar('SELECT count(*) FROM catalog_content_identities'),
    ).toBe(0);
  });

  it('forgets exactly one receipt and changes no character or content row', () => {
    const first = bundled('2024:feat:first');
    const second = bundled('2024:feat:second');
    db.exec("INSERT INTO characters (name) VALUES ('Registry scope control')");
    rememberContentMatchDecision(db, {
      kind: 'feat',
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      digest: ABC_DIGEST as ContentFingerprintDigest,
      decision: 'match',
      targetContentKey: first,
    });
    const secondDigest =
      'cb8379ac2098aa165029e3938a51da0bcecfc008fd6795f401178647f96c5b34' as ContentFingerprintDigest;
    rememberContentMatchDecision(db, {
      kind: 'feat',
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      digest: secondDigest,
      decision: 'clone',
      targetContentKey: second,
    });
    const before = Object.fromEntries(
      APPLICATION_TABLES.map((table) => [
        table,
        db.scalar<number>(`SELECT count(*) FROM "${table}"`),
      ]),
    );

    expect(
      forgetContentMatchDecision(db, {
        kind: 'feat',
        scheme: CONTENT_FINGERPRINT_SCHEME_V1,
        digest: ABC_DIGEST as ContentFingerprintDigest,
      }),
    ).toBe(true);

    for (const table of APPLICATION_TABLES) {
      const expected =
        table === 'catalog_content_match_decisions'
          ? Number(before[table]) - 1
          : before[table];
      expect(
        db.scalar<number>(`SELECT count(*) FROM "${table}"`),
        table,
      ).toBe(expected);
    }
    expect(
      rememberedContentMatchDecision(db, {
        kind: 'feat',
        scheme: CONTENT_FINGERPRINT_SCHEME_V1,
        digest: secondDigest,
      }),
    ).toEqual({ decision: 'clone', targetContentKey: second });
  });

  it('enforces closed vocabularies, key/layer pairings, and canonical-byte hashes', () => {
    const target = bundled('2024:feat:hash-check');
    const rejectedRows = [
      {
        constraint: 'catalog_content_identities_content_kind_check',
        sql: `INSERT INTO catalog_content_identities
          (content_key, content_kind, key_kind, catalog_layer, normalized_name)
          VALUES ('bad:kind', 'vehicle', 'legacy-opaque', 'external', 'bad')`,
      },
      {
        constraint: 'catalog_content_identities_key_kind_check',
        sql: `INSERT INTO catalog_content_identities
          (content_key, content_kind, key_kind, catalog_layer, normalized_name)
          VALUES ('bad:key-kind', 'feat', 'guessed', 'external', 'bad')`,
      },
      {
        constraint: 'catalog_content_identities_catalog_layer_check',
        sql: `INSERT INTO catalog_content_identities
          (content_key, content_kind, key_kind, catalog_layer, normalized_name)
          VALUES ('bad:catalog-layer', 'feat', 'legacy-opaque', 'local', 'bad')`,
      },
      {
        constraint: 'catalog_content_identities_normalized_name_check',
        sql: `INSERT INTO catalog_content_identities
          (content_key, content_kind, key_kind, catalog_layer, normalized_name)
          VALUES ('bad:name', 'feat', 'legacy-opaque', 'external', '')`,
      },
      {
        constraint: 'catalog_content_identities_key_layer_check',
        sql: `INSERT INTO catalog_content_identities
          (content_key, content_kind, key_kind, catalog_layer, normalized_name)
          VALUES ('bad:layer', 'feat', 'legacy-opaque', 'bundled', 'bad')`,
      },
      {
        constraint: 'catalog_content_identities_key_layer_check',
        sql: `INSERT INTO catalog_content_identities
          (content_key, content_kind, key_kind, catalog_layer, normalized_name)
          VALUES ('2024:content.v1:short', 'feat', 'derived', 'external', 'bad')`,
      },
      {
        constraint: 'catalog_content_identities_key_layer_check',
        sql: `INSERT INTO catalog_content_identities
          (content_key, content_kind, key_kind, catalog_layer, normalized_name)
          VALUES ('bad:edition:content.v1:${ABC_DIGEST}', 'feat',
                  'derived', 'external', 'bad')`,
      },
      {
        constraint: 'catalog_content_fingerprints_content_kind_check',
        sql: `INSERT INTO catalog_content_fingerprints
          (content_kind, fingerprint_scheme, fingerprint_digest,
           canonical_json, content_key, fingerprint_role)
          VALUES ('vehicle', 'content-v1', '${ABC_DIGEST}', 'abc',
                  '${target}', 'compatible')`,
      },
      {
        constraint: 'catalog_content_fingerprints_scheme_check',
        sql: `INSERT INTO catalog_content_fingerprints
          (content_kind, fingerprint_scheme, fingerprint_digest,
           canonical_json, content_key, fingerprint_role)
          VALUES ('feat', 'content-v2', '${ABC_DIGEST}', 'abc',
                  '${target}', 'compatible')`,
      },
      {
        constraint: 'catalog_content_fingerprints_digest_check',
        sql: `INSERT INTO catalog_content_fingerprints
          (content_kind, fingerprint_scheme, fingerprint_digest,
           canonical_json, content_key, fingerprint_role)
          VALUES ('feat', 'content-v1', 'ABC', 'abc',
                  '${target}', 'compatible')`,
      },
      {
        constraint: 'catalog_content_fingerprints_role_check',
        sql: `INSERT INTO catalog_content_fingerprints
          (content_kind, fingerprint_scheme, fingerprint_digest,
           canonical_json, content_key, fingerprint_role)
          VALUES ('feat', 'content-v1', '${ABC_DIGEST}', 'abc',
                  '${target}', 'preferred')`,
      },
      {
        constraint: 'catalog_content_aliases_content_kind_check',
        sql: `INSERT INTO catalog_content_aliases
          (content_kind, alias_key, content_key, alias_kind)
          VALUES ('vehicle', 'old:key', '${target}', 'declared-legacy')`,
      },
      {
        constraint: 'catalog_content_aliases_alias_kind_check',
        sql: `INSERT INTO catalog_content_aliases
          (content_kind, alias_key, content_key, alias_kind)
          VALUES ('feat', 'old:key', '${target}', 'guessed')`,
      },
      {
        constraint: 'catalog_content_match_decisions_content_kind_check',
        sql: `INSERT INTO catalog_content_match_decisions
          (content_kind, incoming_fingerprint_scheme,
           incoming_fingerprint_digest, decision, target_content_key)
          VALUES ('vehicle', 'content-v1', '${ABC_DIGEST}', 'match',
                  '${target}')`,
      },
      {
        constraint: 'catalog_content_match_decisions_scheme_check',
        sql: `INSERT INTO catalog_content_match_decisions
          (content_kind, incoming_fingerprint_scheme,
           incoming_fingerprint_digest, decision, target_content_key)
          VALUES ('feat', 'content-v2', '${ABC_DIGEST}', 'match',
                  '${target}')`,
      },
      {
        constraint: 'catalog_content_match_decisions_digest_check',
        sql: `INSERT INTO catalog_content_match_decisions
          (content_kind, incoming_fingerprint_scheme,
           incoming_fingerprint_digest, decision, target_content_key)
          VALUES ('feat', 'content-v1', 'ABC', 'match', '${target}')`,
      },
      {
        constraint: 'catalog_content_match_decisions_decision_check',
        sql: `INSERT INTO catalog_content_match_decisions
          (content_kind, incoming_fingerprint_scheme,
           incoming_fingerprint_digest, decision, target_content_key)
          VALUES ('feat', 'content-v1', '${ABC_DIGEST}', 'ignore',
                  '${target}')`,
      },
    ] as const;
    for (const rejected of rejectedRows) {
      expect(
        () => db.exec(rejected.sql),
        rejected.constraint,
      ).toThrow(rejected.constraint);
    }

    expect(() =>
      registerContentFingerprint(db, {
        kind: 'feat',
        contentKey: target,
        scheme: CONTENT_FINGERPRINT_SCHEME_V1,
        digest: ABC_DIGEST as ContentFingerprintDigest,
        canonicalJson: 'different' as CanonicalContentIdentityJson,
        role: 'current',
      }),
    ).toThrow('do not agree');
  });
});
