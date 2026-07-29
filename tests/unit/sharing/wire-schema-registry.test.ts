import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
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

/**
 * THE RESTORED PROPERTY (plan §3.2's rejected-alternative note, corrected).
 *
 * The plan defended keeping v1–v4's frozen fragment fixtures on the ground
 * that they are "the only proof those schemas still decode" — but the
 * composed path (`decodeShareFragment` → `positionalToShareDocument`) now
 * THROWS `ShareWireRetirementError` for every one of them before reaching
 * `decodeCurrentWire`, so that justification stopped being true the moment
 * v4→v5 became a deliberate throw. A fixture whose only exercise is "hits the
 * throw" no longer proves its OWN schema decodes anything — a schema with
 * scrambled field order would hit the identical throw, for the identical
 * reason, and this suite would not notice.
 *
 * This decodes each retired fixture's raw wire tuple using ONLY that
 * fixture's own frozen `SHARE_SCHEMAS[N]` field positions — never composing
 * through `MIGRATIONS`, never touching `positionalToShareDocument` — so the
 * decompression is a local, independent re-implementation of the fragment
 * format (gzip + base64url), not a reuse of the production decode path that
 * is exactly what throws.
 */
interface StructuralTupleSchema {
  readonly arities: readonly number[];
  readonly fields: readonly { readonly key: string }[];
}

function decodeStructural(
  value: unknown,
  schema: StructuralTupleSchema,
  label: string,
): Record<string, unknown> {
  if (!Array.isArray(value) || !schema.arities.includes(value.length)) {
    throw new Error(
      `${label} did not parse against its own frozen schema (arity ${
        Array.isArray(value) ? value.length : typeof value
      }, expected one of ${schema.arities.join(', ')}).`,
    );
  }
  const record: Record<string, unknown> = {};
  schema.fields.forEach((field, index) => {
    record[field.key] = value[index] ?? null;
  });
  return record;
}

/** Independent of `decodeShareFragment`'s own gzip/base64url handling. */
function decodeFragmentToRawPositional(fragment: string): unknown {
  const encoded = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const padded = encoded
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  const decompressed = gunzipSync(Buffer.from(padded, 'base64'));
  return JSON.parse(decompressed.toString('utf-8'));
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

  it('still parses every retired fixture against ITS OWN frozen schema, before migration composition', () => {
    // v1: the format marker, root list membership, and the character/class/
    // source field POSITIONS all still line up with the frozen v1 schema.
    {
      const schema = SHARE_SCHEMAS[1];
      const raw = decodeFragmentToRawPositional(
        VERSION_FIXTURES[1].fragment,
      ) as unknown[];
      const root = decodeStructural(raw, schema.tuples.root, 'v1 root');
      expect(root.format).toBe(CHARACTER_SHARE_FORMAT);
      expect(root.version).toBe(1);
      const character = decodeStructural(
        root.character,
        schema.tuples.character,
        'v1 character',
      );
      expect(character.name).toBe('Old Link Hero');
      expect(character.intelligence).toBe(16);
      const classes = (root.classes as unknown[]).map((row) =>
        decodeStructural(row, schema.tuples.class, 'v1 class')
      );
      expect(classes).toEqual([
        {
          id: 0,
          classKey: '2024:class:wizard',
          subclassKey: null,
          level: 3,
          start: 1,
          ability: null,
          config: null,
          subclassConfig: null,
        },
      ]);
      const sources = (root.sources as unknown[]).map((row) =>
        decodeStructural(row, schema.tuples.source, 'v1 source')
      );
      expect(sources).toEqual([
        {
          id: 1,
          type: 'feat',
          key: '2024:feat:alert',
          config: null,
          acquired: 2,
          name: null,
        },
      ]);
      expect(root.spellbook).toEqual(['2024:shield']);
    }

    // v2: placeholders moved to a trailing ROOT field (out of the character
    // tuple) — the fixture proves that field is still at ITS position.
    {
      const schema = SHARE_SCHEMAS[2];
      const raw = decodeFragmentToRawPositional(
        VERSION_FIXTURES[2].fragment,
      ) as unknown[];
      const root = decodeStructural(raw, schema.tuples.root, 'v2 root');
      expect(root.version).toBe(2);
      const character = decodeStructural(
        root.character,
        schema.tuples.character,
        'v2 character',
      );
      expect(character.name).toBe('Current Link Hero');
      expect(character.intelligence).toBe(16);
      const placeholders = (root.placeholders as unknown[]).map((row) =>
        decodeStructural(row, schema.tuples.placeholder, 'v2 placeholder')
      );
      expect(placeholders).toEqual([
        {
          spellKey: '2024:org.example:lost-spell',
          spellName: 'Lost Spell',
        },
      ]);
    }

    // v3: the character tuple APPENDS `ability_allocation_method` — the
    // fixture proves the appended position still decodes, not merely that
    // its arity is accepted.
    {
      const schema = SHARE_SCHEMAS[3];
      const raw = decodeFragmentToRawPositional(
        VERSION_FIXTURES[3].fragment,
      ) as unknown[];
      const root = decodeStructural(raw, schema.tuples.root, 'v3 root');
      expect(root.version).toBe(3);
      const character = decodeStructural(
        root.character,
        schema.tuples.character,
        'v3 character',
      );
      expect(character.name).toBe('Allocated Link Hero');
      expect(character.rules_edition_preference).toBe('2024');
      expect(character.ability_allocation_method).toBe('manual');
      expect(root.classes).toEqual([]);
      expect(root.effects).toEqual([]);
    }

    // v4: the effect tuple APPENDS the ability_increase payload, and origin
    // carries a nested background tuple — both must still decode positionally
    // through the frozen v4 schema alone.
    {
      const schema = SHARE_SCHEMAS[4];
      const raw = decodeFragmentToRawPositional(
        VERSION_FIXTURES[4].fragment,
      ) as unknown[];
      const root = decodeStructural(raw, schema.tuples.root, 'v4 root');
      expect(root.version).toBe(4);
      const character = decodeStructural(
        root.character,
        schema.tuples.character,
        'v4 character',
      );
      expect(character.name).toBe('V4 Contribution Hero');
      expect(character.strength).toBe(19);
      expect(character.ability_allocation_method).toBe('manual');
      const sources = (root.sources as unknown[]).map((row) =>
        decodeStructural(row, schema.tuples.source, 'v4 source')
      );
      expect(sources).toEqual([
        {
          id: 0,
          type: 'background',
          key: '2024:background:guard',
          config: null,
          acquired: 1,
          name: null,
        },
      ]);
      const origin = decodeStructural(
        root.origin,
        schema.tuples.origin,
        'v4 origin',
      );
      const background = decodeStructural(
        origin.background,
        schema.tuples.background,
        'v4 background',
      );
      expect(background.name).toBe('Guard');
      const effects = (root.effects as unknown[]).map((row) =>
        decodeStructural(row, schema.tuples.effect, 'v4 effect')
      );
      expect(effects).toEqual([
        {
          kind: 'ability_increase',
          label: 'Guard training',
          damage_type: null,
          notes: null,
          hit_points_flat: null,
          hit_points_per_level: null,
          speed_bonus_feet: null,
          sourceRef: 0,
          sourceSubclass: null,
          ability: 'strength',
          amount: 2,
          maximum: 20,
        },
      ]);
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
