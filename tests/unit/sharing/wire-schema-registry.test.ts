import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeShareFragment } from '../../../src/sharing/codec';
import {
  SHARE_SCHEMAS,
  ShareWireRetirementError,
  type SupportedShareVersion,
} from '../../../src/sharing/wire-schemas';
import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  type CharacterShareDocument,
} from '../../../src/sharing/schema';

/**
 * A RETIRED fixture's fragment is still hand-frozen and still exercised: the
 * composed decode path runs its version's tuple checks and every migration up
 * to v4→v5, which THROWS `ShareWireRetirementError` by design (D60, skills
 * plan §3.2) — a pre-v5 document carries skills as bare strings with no
 * provenance, and migrating one would fabricate attribution. What each retired
 * fixture proves is therefore that its frozen schema still PARSES and that the
 * refusal is the deliberate, named one — not `version is unsupported.` and not
 * a malformed-document error.
 */
type FrozenFixture =
  | {
      readonly fragment: string;
      readonly expected: CharacterShareDocument;
    }
  | {
      readonly fragment: string;
      readonly retired: true;
    };

const VERSION_FIXTURES = {
  1: {
    fragment:
      'H4sIAAAAAAACA12NwQrCMBBEf6XseQNNFQ_5Ag-CHxByWJqVBtcqm5SCXy-1QWovwzDMm_EQ' +
      'x2gek5TUC-Vs8otFsukHUuoLq8kDKQNa9HCV2FzSeG_OrE_AcRLZiD3tk38J6H2L0LXd0X2_' +
      '3JzepLEOHdDugYWwCDemAhVcvCNhLRXrftWAfu3kIbFEWKOw2fsAKTM71e0AAAA',
    retired: true,
  },
  2: {
    // Independently compressed from the hand-authored v2 positional tuple,
    // never from `shareDocumentToPositional`.
    fragment:
      'H4sIAAAAAAAAA32QvQ7CMAyEX6Xy7KI2IIauLAzdGKMMUWNohZtUTioQT4_6IwQdWE726T7b' +
      'sgbnXd6PnLqGbYx5HIg55k1rxTaJJI-tFQJUqOE0ipBPWd35e3YmCYB-ZP6S8rh1fsWg1gW' +
      'CKtShmvdVj-5lxa2D9lhugYkoEa5kE6zgVFeWSdKKqU_UoF4yse2IHSyW-X8U6hUKctvR0_' +
      'YDU8UhpuUZgFCHmLLL3Bhj3opyo4o0AQAA',
    retired: true,
  },
  3: {
    // Independently compressed from this hand-authored v3 positional tuple.
    // Its six null score slots mean the wire's compressed default of 10; the
    // appended method is the allocation signal that must survive separately.
    fragment:
      'H4sIAAAAAAAAA4WKMQqAMBAEvyJXJyDqB-ws_EGwOJKDiGuUXPJ_wUYbEYaBgXEUUrB7RVk9WNXqKYBaHzmzL5KtRs5CpjeORuDwXCQ085q2ZpJ8kEkV-BF1bTe8T9o5VQYtxn3z7HcvFwNExNerAAAA',
    retired: true,
  },
  4: {
    // Independently compressed from a hand-authored v4 positional tuple. The
    // effect's last three positions are the B2 payload, and sourceRef 0 names
    // the background entry in the ordinary source reference space.
    fragment:
      'H4sIAAAAAAAAA5WPwQrCMAyGX2XknME2dnFXD_oEXkqRrC1dsWaStgffXnATh6AghD_hJ_8X' +
      'osCyra8l5mAipVSnm4sx1WYiIZOd1GkicYA9Kjj11X7mLGEsOcxcHZ3MgO0OucT4XaBruh6' +
      '2xpW4UASNSqNSDcJI5uJlLmxhWR_ezuALiV3z7bPpJfmqj3tqM8JhE_5H9IpVCmgMMeT7Ob' +
      'ARR8kBLtQqCwUO7H_gm_XjlMWxzxNgh12zwvUDG1MmbH4BAAA',
    retired: true,
  },
  5: {
    // Independently compressed from a hand-authored v5 positional tuple —
    // never from `shareDocumentToPositional`. The two skill-grant tuples are
    // the section v5 exists for: a FILLED class grant and an UNFILLED one
    // whose null selection must survive the wire as an absent field.
    fragment:
      'H4sIAAAAAAAC_22OzwrCMAzGX2Xk3MJW_xz2BB48eC9FQlewLMukXRV8emvdYRYhfITky_eL' +
      'hoEHOSVavCWMUca7I4rS3jCgXVyQMXcOxEFouIT54RjZuubseWxOLswgOBFtpDvWE1Ct2m99' +
      'MCEnJDBC6_a77gu9f_oXhmH17kRXRZl88VsV6p8URom_xtETQY4FDBYZPx_US7WSzBsBTpfd' +
      'GwEAAA',
    expected: {
      format: CHARACTER_SHARE_FORMAT,
      version: CHARACTER_SHARE_VERSION,
      character: {
        name: 'Provenance Link Hero',
        intelligence: 16,
        rules_edition_preference: '2024',
        ability_allocation_method: 'manual',
      },
      classes: [{
        id: 0,
        classKey: '2024:class:wizard',
        level: 3,
        start: 1,
      }],
      sources: [],
      selections: [],
      spellbook: [],
      preferences: [],
      overrides: [],
      skillGrants: [
        { ref: 0, grantKey: 'class_skill', ordinal: 1, skill: 'arcana' },
        { ref: 0, grantKey: 'class_skill', ordinal: 2 },
      ],
    },
  },
} satisfies Record<SupportedShareVersion, FrozenFixture>;

const HISTORICAL_SCHEMA_MODULE_SHA256 = {
  'v1.ts': '8a87e9cd8ee49c2beb42f9747dc24025c485fccb63d822179202df29080af449',
  'v2.ts': '32e662f3db38f09da5b17320b059c917d26e031456fd0f2c4cefb196a872b269',
} as const;

function allObjects(root: object): object[] {
  const seen = new Set<object>();
  const pending: object[] = [root];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === undefined || seen.has(value)) {
      continue;
    }
    seen.add(value);
    for (const child of Object.values(value)) {
      if (child !== null && typeof child === 'object') {
        pending.push(child);
      }
    }
  }
  return [...seen];
}

describe('the share-link wire schema registry', () => {
  it('has exactly the frozen-fixture keys and every schema is deeply frozen at runtime', () => {
    expect(Object.keys(SHARE_SCHEMAS)).toEqual(Object.keys(VERSION_FIXTURES));

    for (const schema of Object.values(SHARE_SCHEMAS)) {
      for (const value of allObjects(schema)) {
        expect(Object.isFrozen(value)).toBe(true);
        const mutationKey = '__wire_schema_mutation_probe__';
        try {
          Reflect.set(value, mutationKey, true);
        } catch {
          // A strict runtime may throw; a non-throwing runtime must still refuse.
        }
        expect(Object.hasOwn(value, mutationKey)).toBe(false);
      }
    }
  });

  it('decodes the current fixture and refuses every retired one BY NAME', async () => {
    for (const fixture of Object.values(VERSION_FIXTURES)) {
      if ('retired' in fixture) {
        // The refusal must be the DELIBERATE retirement (D60, skills plan
        // §3.2) — reaching it proves the frozen schema's tuple checks and
        // every migration below v5 still ran. A generic `version is
        // unsupported.` or a malformed-document error would mean the frozen
        // history itself broke, which this fixture exists to catch.
        await expect(
          decodeShareFragment(fixture.fragment),
        ).rejects.toThrow(ShareWireRetirementError);
        continue;
      }
      await expect(decodeShareFragment(fixture.fragment)).resolves.toEqual(
        fixture.expected,
      );
    }
  });

  it('keeps the hand-pinned v1 schema fingerprint unchanged', () => {
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(SHARE_SCHEMAS[1]))
      .digest('hex');
    expect(fingerprint).toBe(
      'ee4ebe02ba55326246287745e2b72010ffc0ebd982a651406a0ad350c951f0fb',
    );
  });

  it('keeps every historical schema module byte-for-byte unchanged', () => {
    for (const [file, expected] of Object.entries(
      HISTORICAL_SCHEMA_MODULE_SHA256,
    )) {
      const bytes = readFileSync(
        new URL(`../../../src/sharing/wire-schemas/${file}`, import.meta.url),
      );
      expect(
        createHash('sha256').update(bytes).digest('hex'),
        `${file} bytes changed`,
      ).toBe(expected);
    }
  });
});
