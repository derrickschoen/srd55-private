import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeShareFragment } from '../../../src/sharing/codec';
import {
  SHARE_SCHEMAS,
  type SupportedShareVersion,
} from '../../../src/sharing/wire-schemas';
import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  type CharacterShareDocument,
} from '../../../src/sharing/schema';

interface FrozenFixture {
  readonly fragment: string;
  readonly expected: CharacterShareDocument;
}

const VERSION_FIXTURES = {
  1: {
    fragment:
      'H4sIAAAAAAACA12NwQrCMBBEf6XseQNNFQ_5Ag-CHxByWJqVBtcqm5SCXy-1QWovwzDMm_EQ' +
      'x2gek5TUC-Vs8otFsukHUuoLq8kDKQNa9HCV2FzSeG_OrE_AcRLZiD3tk38J6H2L0LXd0X2_' +
      '3JzepLEOHdDugYWwCDemAhVcvCNhLRXrftWAfu3kIbFEWKOw2fsAKTM71e0AAAA',
    expected: {
      format: CHARACTER_SHARE_FORMAT,
      version: CHARACTER_SHARE_VERSION,
      character: {
        name: 'Old Link Hero',
        intelligence: 16,
      },
      classes: [{
        id: 0,
        classKey: '2024:class:wizard',
        level: 3,
        start: 1,
      }],
      sources: [{
        id: 1,
        type: 'feat',
        key: '2024:feat:alert',
        acquired: 2,
      }],
      selections: [],
      spellbook: ['2024:shield'],
      preferences: [],
      overrides: [],
    },
  },
  2: {
    // Independently compressed from the hand-authored v2 positional tuple,
    // never from `shareDocumentToPositional`.
    fragment:
      'H4sIAAAAAAAAA32QvQ7CMAyEX6Xy7KI2IIauLAzdGKMMUWNohZtUTioQT4_6IwQdWE726T7b' +
      'sgbnXd6PnLqGbYx5HIg55k1rxTaJJI-tFQJUqOE0ipBPWd35e3YmCYB-ZP6S8rh1fsWg1gW' +
      'CKtShmvdVj-5lxa2D9lhugYkoEa5kE6zgVFeWSdKKqU_UoF4yse2IHSyW-X8U6hUKctvR0_' +
      'YDU8UhpuUZgFCHmLLL3Bhj3opyo4o0AQAA',
    expected: {
      format: CHARACTER_SHARE_FORMAT,
      version: CHARACTER_SHARE_VERSION,
      character: {
        name: 'Current Link Hero',
        intelligence: 16,
      },
      classes: [{
        id: 0,
        classKey: '2024:class:wizard',
        level: 3,
        start: 1,
      }],
      sources: [{
        id: 1,
        type: 'feat',
        key: '2024:feat:alert',
        acquired: 2,
      }],
      selections: [],
      spellbook: ['2024:shield'],
      preferences: [],
      overrides: [],
      placeholders: [{
        spellKey: '2024:org.example:lost-spell',
        spellName: 'Lost Spell',
      }],
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

  it('decodes every independently frozen version fixture', async () => {
    for (const fixture of Object.values(VERSION_FIXTURES)) {
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
