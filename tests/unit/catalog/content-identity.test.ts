import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  adjacentContentFingerprintCompatibilityRegistry,
  canonicalContentIdentityJson,
  canonicalOpenPassthroughValue,
  canonicalRuleText,
  contentFingerprintSchemeRegistry,
  contentIdentityOptional,
  contentIdentitySequence,
  contentIdentitySet,
  deriveContentIdentityV1,
  normalizeContentIdentityName,
  parseDerivedContentKeyV1,
  verifyStoredContentIdentityV1,
  type NormalizedContentName,
} from '../../../src/catalog/content-identity';
import {
  isSpellVersionKey,
  normalizeCatalogKeyComponent,
} from '../../../src/catalog/catalog-key';
import type {
  CharacterId,
  PartyPublicationId,
} from '../../../src/domain/ids';

describe('CI-NAME-REMOVE', () => {
  it('removes punctuation and separators instead of hyphenating them', () => {
    expect(normalizeContentIdentityName('Melf’s Acid Arrow')).toBe(
      'melfsacidarrow',
    );
    expect(normalizeContentIdentityName('MELFS ACID-ARROW')).toBe(
      'melfsacidarrow',
    );
    expect(normalizeCatalogKeyComponent('Melf’s Acid Arrow')).toBe(
      'melf-s-acid-arrow',
    );

    const punctuated = deriveContentIdentityV1({
      kind: 'spell',
      edition: '2024',
      name: 'Melf’s Acid Arrow',
      payload: {},
    });
    const separated = deriveContentIdentityV1({
      kind: 'spell',
      edition: '2024',
      name: 'MELFS ACID-ARROW',
      payload: {},
    });
    expect(punctuated.derivedKey).toBe(separated.derivedKey);
  });

  it('refuses a name with no retained letters or numbers', () => {
    expect(() => normalizeContentIdentityName('— + 👁️ —')).toThrow(
      'Content identity names must not be empty',
    );
  });

  it('keeps the legacy and v1 name components nominally distinct', () => {
    expectTypeOf(
      normalizeCatalogKeyComponent('Iron Will'),
    ).not.toMatchTypeOf<NormalizedContentName>();
  });
});

describe('PARTY-PUBLICATION-ID-BRANDED', () => {
  it('keeps publication ids nominally distinct from strings and character ids', () => {
    expectTypeOf<string>().not.toMatchTypeOf<PartyPublicationId>();
    expectTypeOf<CharacterId>().not.toMatchTypeOf<PartyPublicationId>();
    expectTypeOf<PartyPublicationId>().not.toMatchTypeOf<CharacterId>();
  });
});

describe('CI-NAME-UNICODE', () => {
  it('retains Unicode letters/numbers and folds canonical equivalents', () => {
    expect(normalizeContentIdentityName('日本語')).toBe('日本語');
    expect(normalizeContentIdentityName('Дракон ２')).toBe('дракон2');
    expect(normalizeContentIdentityName('日本語')).not.toBe(
      normalizeContentIdentityName('Дракон'),
    );
    expect(normalizeContentIdentityName("E\u0301lan's Aegis")).toBe(
      normalizeContentIdentityName("Élan's Aegis"),
    );
  });

  it('verifies and returns authoritative stored bytes without renormalizing a display name', () => {
    const simulatedNewerUcdLetter = '\u0378';
    expect(() =>
      normalizeContentIdentityName(simulatedNewerUcdLetter),
    ).toThrow();

    const canonicalJson =
      '{"edition":"2024","kind":"feat","normalizedName":"\u0378","payload":{},"scheme":"content-v1"}';
    const digest =
      'b1fc7b8a8871d7019c777e59ef1dd69a22106020b5ca64906126729408f57da5';
    const derivedKey =
      '2024:content.v1:b1fc7b8a8871d7019c777e59ef1dd69a22106020b5ca64906126729408f57da5';

    const stored = verifyStoredContentIdentityV1({
      canonicalJson,
      digest,
      derivedKey,
    });

    expect(stored.canonicalJson).toBe(canonicalJson);
    expect(stored.digest).toBe(digest);
    expect(stored.derivedKey).toBe(derivedKey);
  });
});

describe('canonical content identity values', () => {
  it('normalizes rule text and open passthrough values to NFC', () => {
    expect(
      canonicalRuleText('\r\n  Cafe\u0301  \rSecond\t \n \n'),
    ).toBe('  Café\nSecond');
    expect(canonicalRuleText('Case and punctuation: Stay!')).not.toBe(
      canonicalRuleText('case and punctuation stay'),
    );
    expect(canonicalOpenPassthroughValue('Chronomancy\u0301')).toBe(
      'Chronomancý',
    );
  });

  it('makes formatting-only prose variants agree and rule changes differ', () => {
    const deriveRule = (description: string) =>
      deriveContentIdentityV1({
        kind: 'feat',
        edition: '2024',
        name: 'Steadfast',
        payload: { description: canonicalRuleText(description) },
      });

    const unix = deriveRule('Stand firm.  \nKeep watch.\n');
    const windows = deriveRule('\r\nStand firm.\r\nKeep watch.\t\r\n');
    const changed = deriveRule('Stand firm.\nKeep moving.');

    expect(unix.canonicalJson).toBe(windows.canonicalJson);
    expect(unix.derivedKey).toBe(windows.derivedKey);
    expect(unix.derivedKey).not.toBe(changed.derivedKey);
  });

  it('makes omitted and explicit-null optionals agree while real values differ', () => {
    const deriveMinimumLevel = (minimumLevel: number | null | undefined) =>
      deriveContentIdentityV1({
        kind: 'feat',
        edition: '2024',
        name: 'Steadfast',
        payload: {
          minimumLevel: contentIdentityOptional(minimumLevel),
        },
      });

    const omitted = deriveMinimumLevel(undefined);
    const explicitNull = deriveMinimumLevel(null);
    const present = deriveMinimumLevel(1);

    expect(omitted.canonicalJson).toBe(explicitNull.canonicalJson);
    expect(omitted.derivedKey).toBe(explicitNull.derivedKey);
    expect(omitted.derivedKey).not.toBe(present.derivedKey);
  });

  it('orders object keys by code point, not UTF-16 code unit', () => {
    expect(
      canonicalContentIdentityJson({
        '\u{10000}': 'astral',
        '\uE000': 'bmp',
      }),
    ).toBe('{"":"bmp","𐀀":"astral"}');
  });

  it('uses UTF-16 canonical JSON order for sets, deduplicates them, and preserves sequences', () => {
    const setJson = canonicalContentIdentityJson(
      contentIdentitySet([
        { '\uE000': 1 },
        { '\u{10000}': 1 },
        { '\uE000': 1 },
      ]),
    );
    const sequenceJson = canonicalContentIdentityJson(
      contentIdentitySequence(['second', 'first', 'second']),
    );

    expect(setJson).toBe('[{"𐀀":1},{"":1}]');
    expect(sequenceJson).toBe('["second","first","second"]');
  });

  it('accepts only semantic JSON values and finite safe integers, normalizing negative zero', () => {
    expect(canonicalContentIdentityJson({ value: -0 })).toBe('{"value":0}');

    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => canonicalContentIdentityJson({ value })).toThrow(
        'finite safe integers',
      );
    }
    expect(() =>
      canonicalContentIdentityJson({ missing: undefined }),
    ).toThrow('canonical content identity value');
    expect(() => canonicalContentIdentityJson(new Date(0))).toThrow(
      'canonical content identity value',
    );
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => canonicalContentIdentityJson(circular)).toThrow(
      'circular reference',
    );
  });
});

describe('the content-v1 scheme and derived key grammar', () => {
  it('pins the closed v1 registry shape and empty predecessor registry', () => {
    expect(CONTENT_FINGERPRINT_SCHEME_V1).toBe('content-v1');
    expect(contentFingerprintSchemeRegistry).toEqual({
      'content-v1': {
        keySegment: 'content.v1',
        predecessor: null,
        scheme: 'content-v1',
      },
    });
    expect(adjacentContentFingerprintCompatibilityRegistry).toEqual({});
  });

  it('derives and parses a key accepted by the existing KEY_COMPONENT grammar', () => {
    const identity = deriveContentIdentityV1({
      kind: 'feat',
      edition: '2024',
      name: 'Iron Will',
      payload: {},
    });

    expect(isSpellVersionKey(identity.derivedKey)).toBe(true);
    expect(parseDerivedContentKeyV1(identity.derivedKey)).toEqual({
      derivedKey: identity.derivedKey,
      digest: identity.digest,
      edition: '2024',
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    });
    expect(
      parseDerivedContentKeyV1(
        `2024:content.v1:${identity.digest.toUpperCase()}`,
      ),
    ).toBeNull();
    expect(
      parseDerivedContentKeyV1(`2024:content-v1:${identity.digest}`),
    ).toBeNull();
  });

  it('refuses an edition outside the existing key-component grammar', () => {
    expect(() =>
      deriveContentIdentityV1({
        kind: 'feat',
        edition: '2024 revised',
        name: 'Iron Will',
        payload: {},
      }),
    ).toThrow('valid catalog key component');
  });
});
