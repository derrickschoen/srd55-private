import { readFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  decodeShareFragment,
  encodeShareFragment,
  positionalToShareDocument,
  shareDocumentToPositional,
} from '../../../src/sharing/codec';
import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  SHARE_LIMITS,
  type CharacterShareDocument,
  validateShareDocument,
} from '../../../src/sharing/schema';

const complete: CharacterShareDocument = {
  format: CHARACTER_SHARE_FORMAT,
  version: CHARACTER_SHARE_VERSION,
  character: {
    name: 'Mira',
    strength: 8,
    dexterity: 14,
    constitution: 13,
    intelligence: 18,
    wisdom: 12,
    charisma: 10,
    proficiency_bonus_override: 4,
    rules_edition_preference: '2014',
    allow_legacy: true,
  },
  classes: [
    {
      id: 0,
      classKey: '2024:class:wizard',
      subclassKey: '2024:subclass:abjurer',
      level: 5,
      start: 1,
      ability: 'intelligence',
      config: { school: 'Abjuration' },
      subclassConfig: { ward: 'active' },
    },
  ],
  sources: [
    {
      id: 1,
      type: 'feat',
      key: '2024:feat:magic-initiate',
      name: 'Magic Initiate: Wizard',
      config: { chosen_list: 'Wizard' },
      acquired: 5,
    },
  ],
  selections: [
    {
      ref: 0,
      ruleKey: 'prepared',
      ordinal: 1,
      spellKey: '2024:shield',
      keep: true,
    },
    {
      ref: 1,
      ruleKey: 'homebrew',
      ordinal: 1,
      spellKey: '2024:com.example.spells:starward-aegis',
      spellName: 'Starward Aegis',
    },
  ],
  spellbook: ['2024:shield'],
  preferences: [{ spellKey: '2024:shield', favourite: true }],
  overrides: [{ ruleKey: 'prepared', value: { count: 7 } }],
  acknowledgements: [{ warning: 'warning:shield' }],
  loadouts: [
    {
      name: 'Defense',
      entries: [{ spellKey: '2024:shield', role: 'defense' }],
    },
  ],
  placeholders: [
    {
      spellKey: '2024:com.example.spells:starward-aegis',
      spellName: 'Starward Aegis',
    },
  ],
  // TWO WEAPONS ON PURPOSE. The first sets every optional field, so the wire
  // pin below sees a real value in each of the nineteen slots. The second is a
  // HALF-ENTERED weapon — a name and nothing else, which `character_weapons`
  // permits and the planner produces the moment "Add weapon" is pressed. It is
  // here so the round trip proves absence survives as absence rather than being
  // filled in with empty strings or zeroes (D6b).
  weapons: [
    {
      name: 'Dagger of Warning',
      damage_dice: '1d4',
      damage_type: 'Piercing',
      versatile_damage_dice: '1d6',
      ammunition_kind: 'bolt',
      range_normal_feet: 20,
      range_long_feet: 60,
      mastery_property: 'Nick',
      other_properties: 'Silvered; hums near goblins',
      notes: 'Taken from the barrow.',
      finesse: true,
      heavy: true,
      light: true,
      loading: true,
      reach: true,
      thrown: true,
      two_handed: true,
      ammunition: true,
      mastery_selected: true,
    },
    { name: 'Unfinished club' },
  ],
};

async function arbitraryFragment(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const compressed = new Uint8Array(
    await new Response(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer(),
  );
  let binary = '';
  for (const byte of compressed) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function independentBase64urlDecode(value: string): Uint8Array {
  let bits = 0;
  let bitCount = 0;
  const bytes: number[] = [];
  for (const character of value) {
    const digit = BASE64URL_ALPHABET.indexOf(character);
    if (digit < 0) {
      throw new TypeError(`Invalid base64url character ${character}.`);
    }
    bits = bits * 64 + digit;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes.push(Math.floor(bits / 2 ** bitCount) & 0xff);
      bits %= 2 ** bitCount;
    }
  }
  if (bitCount > 0 && bits !== 0) {
    throw new TypeError('Invalid non-zero base64url padding bits.');
  }
  return Uint8Array.from(bytes);
}

function independentBase64urlEncode(bytes: Uint8Array): string {
  let bits = 0;
  let bitCount = 0;
  let encoded = '';
  for (const byte of bytes) {
    bits = bits * 256 + byte;
    bitCount += 8;
    while (bitCount >= 6) {
      bitCount -= 6;
      encoded += BASE64URL_ALPHABET[Math.floor(bits / 2 ** bitCount) & 63];
      bits %= 2 ** bitCount;
    }
  }
  if (bitCount > 0) {
    encoded += BASE64URL_ALPHABET[(bits << (6 - bitCount)) & 63];
  }
  return encoded;
}

function nodeFragment(value: unknown): string {
  return independentBase64urlEncode(
    gzipSync(new TextEncoder().encode(JSON.stringify(value))),
  );
}

function deterministicNoise(length: number): string {
  let state = 0x9e3779b9;
  let result = '';
  for (let index = 0; index < length; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    result += String.fromCharCode(33 + ((state >>> 0) % 90));
  }
  return result;
}

describe('character-share positional codec', () => {
  it('pins the complete version-1 wire layout element by element', () => {
    expect(shareDocumentToPositional(complete)).toEqual([
      'dnd-multiclass-spells-character-share',
      1,
      [
        'Mira',
        8,
        14,
        13,
        18,
        12,
        10,
        4,
        '2014',
        true,
        [
          [
            '2024:com.example.spells:starward-aegis',
            'Starward Aegis',
          ],
        ],
      ],
      [
        [
          0,
          '2024:class:wizard',
          '2024:subclass:abjurer',
          5,
          1,
          'intelligence',
          { school: 'Abjuration' },
          { ward: 'active' },
        ],
      ],
      [
        [
          1,
          'feat',
          '2024:feat:magic-initiate',
          { chosen_list: 'Wizard' },
          5,
          'Magic Initiate: Wizard',
        ],
      ],
      [
        [0, 'prepared', 1, '2024:shield', null, true],
        [
          1,
          'homebrew',
          1,
          '2024:com.example.spells:starward-aegis',
          'Starward Aegis',
          null,
        ],
      ],
      ['2024:shield'],
      [['2024:shield', true]],
      [['prepared', { count: 7 }]],
      [['warning:shield']],
      [['Defense', [['2024:shield', 'defense']]]],
      // Element 11: weapons. Nineteen slots per weapon — name, the four short
      // text columns, the two ranges, the mastery property, the two long
      // free-text columns, then the nine flags — with `null` for every field the
      // weapon does not set.
      [
        [
          'Dagger of Warning',
          '1d4',
          'Piercing',
          '1d6',
          'bolt',
          20,
          60,
          'Nick',
          'Silvered; hums near goblins',
          'Taken from the barrow.',
          true,
          true,
          true,
          true,
          true,
          true,
          true,
          true,
          true,
        ],
        [
          'Unfinished club',
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      ],
    ]);
  });

  it('round-trips object, positional, gzip, and base64url forms', async () => {
    const positional = shareDocumentToPositional(complete);
    expect(JSON.stringify(positional)).not.toContain('"character":');
    expect(positionalToShareDocument(positional)).toEqual(complete);
    const encoded = await encodeShareFragment(complete);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    await expect(decodeShareFragment(encoded)).resolves.toEqual(complete);
  });

  it('matches an independent Node gzip and hand-written base64url oracle in both directions', async () => {
    const projected = shareDocumentToPositional(complete);
    const fragment = await encodeShareFragment(complete);
    const recovered = JSON.parse(
      new TextDecoder().decode(
        gunzipSync(independentBase64urlDecode(fragment)),
      ),
    ) as unknown;
    expect(recovered).toEqual(projected);

    await expect(
      decodeShareFragment(nodeFragment(projected)),
    ).resolves.toEqual(validateShareDocument(complete));
  });

  it('keeps scanner punctuation inside escaped strings semantically inert', async () => {
    const punctuation =
      'literal [{ brackets }] braces }{ quote \\" slash \\\\ end';
    const positional = shareDocumentToPositional({
      ...complete,
      character: { ...complete.character, name: punctuation },
    });
    await expect(
      decodeShareFragment(nodeFragment(positional)),
    ).resolves.toMatchObject({
      character: { name: punctuation },
    });
  });

  it('distinguishes high-entropy from repetitive payloads near the compressed cap', async () => {
    const overrides = (value: (index: number) => string) =>
      Array.from({ length: 200 }, (_, index) => ({
        ruleKey: `rule-${index}`,
        value: value(index),
      }));
    const noise = deterministicNoise(200 * 400);
    const highEntropy = {
      ...complete,
      overrides: overrides((index) =>
        noise.slice(index * 400, (index + 1) * 400),
      ),
    };
    const repetitive = {
      ...complete,
      overrides: overrides(() => 'x'.repeat(400)),
    };
    const highFragment = await encodeShareFragment(highEntropy);
    const repetitiveFragment = await encodeShareFragment(repetitive);
    const highCompressed =
      independentBase64urlDecode(highFragment).byteLength;
    const repetitiveCompressed =
      independentBase64urlDecode(repetitiveFragment).byteLength;

    expect(highCompressed).toBeGreaterThan(
      SHARE_LIMITS.compressedBytes * 0.5,
    );
    expect(highCompressed).toBeLessThan(SHARE_LIMITS.compressedBytes);
    expect(repetitiveCompressed).toBeLessThan(
      SHARE_LIMITS.compressedBytes * 0.1,
    );
    expect(highCompressed).toBeGreaterThan(repetitiveCompressed * 20);
  });

  it('counts decompressed UTF-8 bytes rather than JavaScript string length', async () => {
    const codeUnits = 280_000;
    const ascii = 'a'.repeat(codeUnits);
    const emoji = '🧙'.repeat(codeUnits / 2);
    expect(ascii.length).toBe(emoji.length);
    await expect(decodeShareFragment(nodeFragment(ascii))).rejects.toThrow(
      /wire document must be a tuple of length 11/,
    );
    await expect(decodeShareFragment(nodeFragment(emoji))).rejects.toThrow(
      /decompressed document exceeds/,
    );
  });

  it('runs the encoded guard before the compressed guard when both limits are exceeded', async () => {
    const oversizedCompressed = new Uint8Array(
      SHARE_LIMITS.compressedBytes + 1,
    );
    const fragment = independentBase64urlEncode(oversizedCompressed);
    expect(fragment.length).toBeGreaterThan(
      SHARE_LIMITS.encodedCharacters,
    );
    await expect(decodeShareFragment(fragment)).rejects.toThrow(
      /fragment exceeds/,
    );
  });

  it('runs the decompressed guard before nesting validation when both could reject', async () => {
    const oversizedDeepText =
      '['.repeat(17) + '"x'.padEnd(SHARE_LIMITS.decompressedBytes + 1, 'x');
    await expect(
      decodeShareFragment(
        independentBase64urlEncode(
          gzipSync(new TextEncoder().encode(oversizedDeepText)),
        ),
      ),
    ).rejects.toThrow(/decompressed document exceeds/);
  });

  it('pins null optional positions and fixed record arities', async () => {
    const minimal: CharacterShareDocument = {
      format: CHARACTER_SHARE_FORMAT,
      version: CHARACTER_SHARE_VERSION,
      character: { name: 'Ten' },
      classes: [
        {
          id: 0,
          classKey: '2024:class:wizard',
          level: 1,
          start: 1,
        },
      ],
      sources: [
        {
          id: 1,
          type: 'feat',
          key: '2024:feat:alert',
          acquired: 1,
        },
      ],
      selections: [],
      spellbook: [],
      preferences: [],
      overrides: [],
    };
    const positional = shareDocumentToPositional(minimal);
    expect(positional).toEqual([
      'dnd-multiclass-spells-character-share',
      1,
      [
        'Ten',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
      [
        [
          0,
          '2024:class:wizard',
          null,
          1,
          1,
          null,
          null,
          null,
        ],
      ],
      [[1, 'feat', '2024:feat:alert', null, 1, null]],
      [],
      [],
      [],
      [],
      null,
      null,
      // Weapons: `null`, not `[]`. A character with no weapons and a document
      // written before weapons travelled decode to the same thing — a document
      // with no `weapons` key at all — which is what makes an old link readable.
      null,
    ]);
    expect(positional).toHaveLength(12);
    expect((positional[2] as unknown[]).length).toBe(11);
    expect((positional[3] as unknown[][])[0]).toHaveLength(8);
    expect((positional[4] as unknown[][])[0]).toHaveLength(6);
    expect(minimal).not.toHaveProperty('weapons');
    await expect(
      decodeShareFragment(await encodeShareFragment(minimal)),
    ).resolves.toEqual(minimal);
  });

  it('rejects every non-version-1 character, class, and source arity', () => {
    const positional = shareDocumentToPositional(complete);
    const cases: Array<[number, number, RegExp]> = [
      [2, 10, /wire character must be a tuple of length 11/],
      [2, 12, /wire character must be a tuple of length 11/],
      [3, 7, /wire classes\[0\] must be a tuple of length 8/],
      [3, 9, /wire classes\[0\] must be a tuple of length 8/],
      [4, 5, /wire sources\[0\] must be a tuple of length 6/],
      [4, 7, /wire sources\[0\] must be a tuple of length 6/],
    ];

    for (const [position, length, message] of cases) {
      const malformed = structuredClone(positional);
      if (position === 2) {
        const record = (malformed[position] as unknown[]).slice(0, length);
        while (record.length < length) {
          record.push(null);
        }
        malformed[position] = record;
      } else {
        const rows = malformed[position] as unknown[][];
        const record = rows[0]?.slice(0, length) ?? [];
        while (record.length < length) {
          record.push(null);
        }
        rows[0] = record;
      }
      expect(() => positionalToShareDocument(malformed)).toThrow(message);
    }
  });

  it('preserves a source name through the complete link transport', async () => {
    const decoded = await decodeShareFragment(
      await encodeShareFragment(complete),
    );
    expect(decoded.sources[0]?.name).toBe('Magic Initiate: Wizard');
  });

  it('keeps the documented minimal example valid', () => {
    const example = JSON.parse(
      readFileSync(
        new URL(
          '../../../docs/sharing/minimal-share-example.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ) as unknown;
    expect(validateShareDocument(example)).toEqual(example);
  });

  it('rejects oversized encoded and streamed decompressed input', async () => {
    await expect(
      decodeShareFragment('a'.repeat(SHARE_LIMITS.encodedCharacters + 1)),
    ).rejects.toThrow(/fragment exceeds/);

    const bomb = 'x'.repeat(SHARE_LIMITS.decompressedBytes + 1);
    await expect(
      decodeShareFragment(await arbitraryFragment(bomb)),
    ).rejects.toThrow(/decompressed document exceeds/);
  });

  it('rejects bad versions, wrong tuple lengths, and record over-counts', async () => {
    const positional = shareDocumentToPositional(complete);
    const badVersion = [...positional];
    badVersion[1] = 999;
    await expect(
      decodeShareFragment(await arbitraryFragment(badVersion)),
    ).rejects.toThrow(/version is unsupported/);

    const wrongTuple = [...positional];
    wrongTuple[2] = ['Mira'];
    await expect(
      decodeShareFragment(await arbitraryFragment(wrongTuple)),
    ).rejects.toThrow(/wire character must be a tuple of length 11/);

    const overCount = [...positional];
    overCount[6] = Array.from(
      { length: SHARE_LIMITS.spellbook + 1 },
      () => '2024:shield',
    );
    await expect(
      decodeShareFragment(await arbitraryFragment(overCount)),
    ).rejects.toThrow(/spellbook exceeds the maximum count/);
  });
});

/**
 * A SHARE LINK GENERATED BEFORE WEAPONS TRAVELLED.
 *
 * `LEGACY_FRAGMENT` is a literal base64url string — an actual link, of the kind
 * that is sitting in somebody's chat history right now. It was minted once from
 * the hand-written eleven-element tuple below and pasted here; it is never
 * recomputed, so nothing in `src/` can move it. `LEGACY_WIRE` is that same
 * document written out by hand, so a reader can see what the bytes contain
 * without decoding them, and so the two can be checked against each other.
 *
 * Both must keep decoding. A link is not something a user can re-export.
 */
const LEGACY_FRAGMENT =
  'H4sIAAAAAAACA12NwQrCMBBEf6XseQNNFQ_5Ag-CHxByWJqVBtcqm5SCXy-1QWovwzDMm_EQ' +
  'x2gek5TUC-Vs8otFsukHUuoLq8kDKQNa9HCV2FzSeG_OrE_AcRLZiD3tk38J6H2L0LXd0X2_' +
  '3JzepLEOHdDugYWwCDemAhVcvCNhLRXrftWAfu3kIbFEWKOw2fsAKTM71e0AAAA';

const LEGACY_WIRE = [
  'dnd-multiclass-spells-character-share',
  1,
  ['Old Link Hero', null, null, null, 16, null, null, null, null, null, null],
  [[0, '2024:class:wizard', null, 3, 1, null, null, null]],
  [[1, 'feat', '2024:feat:alert', null, 2, null]],
  [],
  ['2024:shield'],
  [],
  [],
  null,
  null,
];

describe('a share link generated before weapons travelled', () => {
  it('is eleven elements, and the frozen fragment really contains them', async () => {
    // Guards the fixture itself: if the literal above were ever regenerated
    // from current code it would have twelve elements, and this fails rather
    // than the suite quietly starting to test the new format against itself.
    expect(LEGACY_WIRE).toHaveLength(11);
    const decodedWire = JSON.parse(
      new TextDecoder().decode(
        gunzipSync(independentBase64urlDecode(LEGACY_FRAGMENT)),
      ),
    ) as unknown;
    expect(decodedWire).toEqual(LEGACY_WIRE);
  });

  it('still decodes, as a document with no weapons section at all', async () => {
    const decoded = await decodeShareFragment(LEGACY_FRAGMENT);
    expect(decoded.character.name).toBe('Old Link Hero');
    expect(decoded.character.intelligence).toBe(16);
    expect(decoded.classes[0]?.classKey).toBe('2024:class:wizard');
    expect(decoded.spellbook).toEqual(['2024:shield']);
    // Absent, not an empty list. The link never said anything about weapons.
    expect(Object.hasOwn(decoded, 'weapons')).toBe(false);
    expect(decoded.weapons).toBeUndefined();
  });

  it('decodes identically whether or not the twelfth element is present', async () => {
    // A twelve-element tuple with `null` weapons and an eleven-element tuple
    // must mean the same thing, or a character shared today and the same
    // character shared last month would import differently.
    const decodedOld = await decodeShareFragment(LEGACY_FRAGMENT);
    const decodedNew = await decodeShareFragment(
      nodeFragment([...LEGACY_WIRE, null]),
    );
    expect(decodedNew).toEqual(decodedOld);
  });

  it('still refuses a length that is neither', async () => {
    // Tolerance is exactly two lengths wide, not "any length". Ten elements and
    // thirteen elements are both malformed and must stay refused.
    for (const wire of [
      LEGACY_WIRE.slice(0, 10),
      [...LEGACY_WIRE, null, null],
    ]) {
      await expect(
        decodeShareFragment(nodeFragment(wire)),
      ).rejects.toThrow(/wire document must be a tuple of length 11 or 12/);
    }
  });
});
