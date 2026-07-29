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
    // The opt-in note (Q12). A REAL value rather than an absence, so the layout
    // below pins the position AND what occupies it — a `null` here would pin
    // only the arity, and the arity is the half that was never in doubt.
    notes: 'Retired the staff after Waterdeep.',
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
  // pin below sees a real value in each of the twenty slots. The second is a
  // HALF-ENTERED weapon — a name and nothing else, which `character_weapons`
  // permits and the planner produces the moment "Add weapon" is pressed. It is
  // here so the round trip proves absence survives as absence rather than being
  // filled in with empty strings or zeroes (D6b).
  weapons: [
    {
      name: 'Dagger of Warning',
      proficiency_category: 'simple',
      damage: { kind: 'dice', dice: '1d4' },
      damage_type: 'Piercing',
      versatile_damage: { kind: 'dice', dice: '1d6' },
      ammunition_kind: 'bolt',
      range: { kind: 'ranged', near_feet: 20, far_feet: 60 },
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
    {
      name: 'Unfinished club',
      damage: { kind: 'not_recorded' },
      versatile_damage: { kind: 'not_applicable' },
      range: { kind: 'none' },
    },
  ],
  // THE ORIGIN, WITH EVERY SLOT FILLED SO THE WIRE PIN SEES A REAL VALUE IN
  // EACH. The trait list holds one of each mechanical kind plus a free-text
  // trait, so the pin proves all four payload slots and the empty case travel.
  species: {
    name: 'Dwarf',
    creature_type: 'Humanoid',
    size: 'Medium',
    base_speed_feet: 30,
    notes: 'Rewritten after session four.',
  },
  speciesTraits: [
    {
      name: 'Dwarven Resilience',
      description: 'You have Resistance to Poison damage.',
      effect_kind: 'damage_resistance',
      effect_damage_type: 'Poison',
      notes: 'From the template.',
    },
    {
      name: 'Dwarven Toughness',
      description: 'Your Hit Point maximum increases by 1.',
      effect_kind: 'hp_modifier',
      effect_hit_points_flat: 1,
      effect_hit_points_per_level: 1,
    },
    {
      name: 'Fleet of Foot',
      description: 'A trait this player wrote themselves.',
      effect_kind: 'speed',
      effect_speed_bonus_feet: 5,
    },
    {
      name: 'Elven Lineage',
      effect_kind: 'granted_spells',
    },
    // The free-text majority — 26 of the 33 printed traits look like this.
    { name: 'Stonecunning' },
  ],
  // THE CHARACTER'S OWN EFFECTS, one of each kind plus the untyped resistance,
  // so the pin sees a real value in every payload slot and in the reference.
  // The FIRST is the case the whole inversion exists for: a resistance whose
  // type the player has not chosen, NAMED by the grant that gave it, which the
  // old model could only count.
  effects: [
    {
      kind: 'damage_resistance',
      label: 'Fiendish Legacy',
      // The SAME reference space `selections[].ref` uses, so an effect and the
      // spells from one feat name the same source instance.
      sourceRef: 1,
    },
    {
      kind: 'damage_resistance',
      label: 'Dwarven Resilience',
      damage_type: 'Poison',
      notes: 'From the template.',
    },
    {
      kind: 'hp_modifier',
      label: 'Dwarven Toughness',
      hit_points_flat: 1,
      hit_points_per_level: 1,
    },
    {
      kind: 'speed',
      label: 'Fleet of Foot',
      speed_bonus_feet: 5,
    },
    // GRANTED BY THE SUBCLASS, NOT THE CLASS. `classes[0]` names a subclass, so
    // ref 0 mints TWO source instances on import; without the flag this effect
    // would come back attached to `Wizard 5` — a real row, and the wrong one.
    {
      kind: 'hp_modifier',
      label: 'Arcane Ward',
      hit_points_per_level: 2,
      sourceRef: 0,
      sourceSubclass: true,
    },
  ],
  background: {
    name: 'Soldier',
    ability_score_1: 'Strength',
    ability_score_2: 'Dexterity',
    ability_score_3: 'Constitution',
    feat_name: 'Savage Attacker',
    skill_proficiency_1: 'Athletics',
    skill_proficiency_2: 'Intimidation',
    tool_proficiency: 'Choose one kind of Gaming Set',
    equipment_option_a: 'Spear, Shortbow, 20 Arrows, 14 GP',
    equipment_option_b: '50 GP',
    notes: 'Retired from the watch.',
  },
  // The four stored sheet inputs. Both armour slots are filled, and the worn
  // one is `capped` so that the paired `dex_bonus_max` really travels.
  armor: [
    {
      slot: 'worn',
      name: 'Half Plate Armor',
      category: 'medium',
      armor_class: 15,
      dex_bonus: 'capped',
      dex_bonus_max: 2,
      strength_requirement: 15,
      stealth_disadvantage: true,
      notes: 'Repainted after the barrow.',
    },
    {
      slot: 'shield',
      name: 'Shield',
      category: 'shield',
      armor_class: 2,
      dex_bonus: 'none',
    },
  ],
  hitPointRolls: [
    { className: 'Wizard', classLevel: 2, value: 4 },
    { className: 'Wizard', classLevel: 3, value: 6 },
  ],
  skillProficiencies: ['arcana', 'perception'],
  sheetAdjustment: { value: 3, note: 'Ring of Protection, house ruled.' },
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

const COMPLETE_V1_WIRE = [
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
        // LAST, AND IT MUST STAY LAST. Everything before it is the frozen order
        // every pre-Q12 link was written in; an appended element is invisible to
        // a decoder that stops one earlier, and inserting it anywhere before
        // `placeholders` would decode an old link's placeholder list as a note.
        'Retired the staff after Waterdeep.',
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
      // Element 11: weapons. The first twenty slots remain frozen. The retired
      // free-text damage slots are null and the two discriminated damage tuples
      // are appended last.
      //
      // THE CATEGORY IS LAST AND THAT POSITION IS THE FORMAT. It was appended
      // rather than put beside `name` so that a link minted before D27, which
      // is nineteen slots long, still has every index meaning what it meant.
      // Inserting it anywhere earlier would shift the eighteen fields after it
      // and decode an old link's damage dice into its damage type.
      [
        [
          'Dagger of Warning',
          null,
          'Piercing',
          null,
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
          'simple',
          ['dice', '1d4'],
          ['dice', '1d6'],
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
          null,
          ['not_recorded'],
          ['not_applicable'],
        ],
      ],
      // Element 12: the origin, as ONE grouped tuple of three independently
      // nullable slots — species, its traits, background. The trait tuples are
      // eight slots each: name, the four text fields, then the three signed
      // effect payloads. Array position is the printed order; there is no
      // sort_order on the wire.
      [
        ['Dwarf', 'Humanoid', 'Medium', 'Rewritten after session four.', 30],
        [
          [
            'Dwarven Resilience',
            'You have Resistance to Poison damage.',
            'damage_resistance',
            'Poison',
            'From the template.',
            null,
            null,
            null,
          ],
          [
            'Dwarven Toughness',
            'Your Hit Point maximum increases by 1.',
            'hp_modifier',
            null,
            null,
            1,
            1,
            null,
          ],
          [
            'Fleet of Foot',
            'A trait this player wrote themselves.',
            'speed',
            null,
            null,
            null,
            null,
            5,
          ],
          [
            'Elven Lineage',
            null,
            'granted_spells',
            null,
            null,
            null,
            null,
            null,
          ],
          ['Stonecunning', null, null, null, null, null, null, null],
        ],
        [
          'Soldier',
          'Strength',
          'Dexterity',
          'Constitution',
          'Savage Attacker',
          'Athletics',
          'Intimidation',
          'Choose one kind of Gaming Set',
          'Spear, Shortbow, 20 Arrows, 14 GP',
          '50 GP',
          'Retired from the watch.',
        ],
      ],
      // Element 13: the SHEET, as ONE grouped tuple of four independently
      // nullable slots — armour, hit point rolls, skill proficiencies, the
      // manual adjustment. The root grows one element per FEATURE, not one per
      // table, which is why four tables cost one position.
      //
      // An armour row is nine slots: name, the three enums, the base or bonus,
      // the two optional integers, the one true-when-present flag, and notes.
      [
        [
          [
            'Half Plate Armor',
            'worn',
            'medium',
            'capped',
            15,
            2,
            15,
            true,
            'Repainted after the barrow.',
          ],
          [
            'Shield',
            'shield',
            'shield',
            'none',
            2,
            null,
            null,
            null,
            null,
          ],
        ],
        [
          ['Wizard', 2, 4],
          ['Wizard', 3, 6],
        ],
        ['arcana', 'perception'],
        [3, 'Ring of Protection, house ruled.'],
      ],
      // Element 14: the character's own EFFECTS, as a flat list and NOT a
      // fourth slot in the origin group above. Effects are no longer
      // species-scoped, so nesting them under the origin would re-create the
      // coupling this model was inverted to remove — and would change what
      // element 12 means for every link already in the wild.
      //
      // Nine slots each: kind, label, the two text fields, the three signed
      // integers, then the two provenance slots — the source reference, and the
      // flag that says WHICH of the two roots that reference mints. The last
      // row is the only one that sets it, and it is why the slot exists: ref 0
      // is a class carrying a subclass, so the number alone names two rows.
      [
        [
          'damage_resistance',
          'Fiendish Legacy',
          null,
          null,
          null,
          null,
          null,
          1,
          null,
        ],
        [
          'damage_resistance',
          'Dwarven Resilience',
          'Poison',
          'From the template.',
          null,
          null,
          null,
          null,
          null,
        ],
        [
          'hp_modifier',
          'Dwarven Toughness',
          null,
          null,
          1,
          1,
          null,
          null,
          null,
        ],
        ['speed', 'Fleet of Foot', null, null, null, null, 5, null, null],
        [
          'hp_modifier',
          'Arcane Ward',
          null,
          null,
          null,
          2,
          null,
          0,
          true,
        ],
      ],
    ] as const;

describe('character-share positional codec', () => {
  it('keeps the hand-authored complete version-1 positional golden readable', () => {
    expect(positionalToShareDocument(COMPLETE_V1_WIRE)).toEqual(complete);
  });

  it('pins the hand-authored complete version-3 wire layout element by element', () => {
    const version3Golden = [
      'dnd-multiclass-spells-character-share',
      3,
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
        'Retired the staff after Waterdeep.', null,
      ],
      COMPLETE_V1_WIRE[3],
      COMPLETE_V1_WIRE[4],
      COMPLETE_V1_WIRE[5],
      COMPLETE_V1_WIRE[6],
      COMPLETE_V1_WIRE[7],
      COMPLETE_V1_WIRE[8],
      COMPLETE_V1_WIRE[9],
      COMPLETE_V1_WIRE[10],
      [
        [
          'Dagger of Warning',
          null,
          'Piercing',
          null,
          'bolt',
          ['ranged', 20, 60],
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
          'simple',
          ['dice', '1d4'],
          ['dice', '1d6'],
        ],
        [
          'Unfinished club',
          null,
          null,
          null,
          null,
          ['none'],
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
          ['not_recorded'],
          ['not_applicable'],
        ],
      ],
      COMPLETE_V1_WIRE[12],
      COMPLETE_V1_WIRE[13],
      COMPLETE_V1_WIRE[14],
      [[
        '2024:com.example.spells:starward-aegis',
        'Starward Aegis',
      ]],
    ];

    expect(shareDocumentToPositional(complete)).toEqual(version3Golden);
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
      3,
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
        // The opt-in note, on the same terms as every section below: ALWAYS
        // written, `null` when the sharer did not opt in or there is nothing to
        // send, decoding to an absent key.
        null,
        null, // v3 allocation signal: absent means never allocated.
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
      // The origin element is ALWAYS written, with `null` in each of its three
      // slots, so this build's output has one shape rather than eight. Each
      // null decodes to an ABSENT key for the same reason weapons does.
      [null, null, null],
      // The sheet element, on identical terms: always written, four nulls, each
      // decoding to an absent key.
      [null, null, null, null],
      // Element 14, the character's own effects: always written, `null` when
      // there are none, decoding to an absent key like every section above.
      // NOT a group — effects are one section, and a nested tuple here would
      // suggest a structure they do not have.
      null,
      // Element 15: placeholders moved out of the character tuple in v2.
      null,
    ]);
    expect(positional).toHaveLength(16);
    expect((positional[2] as unknown[]).length).toBe(12);
    expect((positional[3] as unknown[][])[0]).toHaveLength(8);
    expect((positional[4] as unknown[][])[0]).toHaveLength(6);
    expect(positional[12]).toHaveLength(3);
    expect(positional[13]).toHaveLength(4);
    expect(minimal).not.toHaveProperty('weapons');
    expect(minimal).not.toHaveProperty('species');
    expect(minimal).not.toHaveProperty('speciesTraits');
    expect(minimal).not.toHaveProperty('background');
    expect(minimal).not.toHaveProperty('armor');
    expect(minimal).not.toHaveProperty('hitPointRolls');
    expect(minimal).not.toHaveProperty('skillProficiencies');
    expect(minimal).not.toHaveProperty('sheetAdjustment');
    expect(minimal).not.toHaveProperty('effects');
    await expect(
      decodeShareFragment(await encodeShareFragment(minimal)),
    ).resolves.toEqual(minimal);
  });

  it('rejects every non-version-3 character, class, and source arity', () => {
    const positional = shareDocumentToPositional(complete);
    const cases: Array<[number, number, RegExp]> = [
      [2, 11, /wire character must be a tuple of length 12/],
      [2, 13, /wire character must be a tuple of length 12/],
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
    ).rejects.toThrow(/wire character must be a tuple of length 12/);

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
 * A LINK MINTED BY THE LAST BUILD BEFORE WEAPON DAMAGE BECAME A UNION.
 *
 * `PRE_DAMAGE_UNION_FRAGMENT` is the literal output of `encodeShareFragment`
 * from `main` at d31468bd897a921a14551a908bd34888a7d72f2e. It was minted once
 * in a temporary archive of that commit from the hand-written document below,
 * then pasted here. It is not generated by this branch's encoder at test time.
 *
 * Every weapon is twenty elements: the nineteen original slots plus D27's
 * appended proficiency category. That is the exact arity `main` ships today,
 * and therefore the arity of links users have already pasted into chats.
 */
const PRE_DAMAGE_UNION_FRAGMENT =
  'H4sIAAAAAAAAA62RMWoDMRBFryKmlopNEYzLJIVLQ3AltpiVxt6BkbSMpASfJAfKxUKW' +
  'hBR2igTD8KsP7zHfQ8zRpS6Ng2Ctri4kUl2YUTE0UldnVAI7WA97JfeECU_kDplLNjv' +
  'SAjZ3kb_HaP3F_TS8hz1qJZyEzPNCqGBhiPdfNBji5r_gqwGV0yIEo_WwK4kmpVfzIB' +
  'gJLLSZTFtNIgWOVLfmzry_GaEXkm-jWPpnY9Fy5MCUw9maXIyWniPn021tE2pjlFX3k' +
  'I-cuc4UzaP06aag3740Wn-x5tWN1_wAO46oLWUCAAA';

const PRE_DAMAGE_UNION_WEAPONS = [
  [
    'Parseable Spear',
    '1d6',
    null,
    '1d8',
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
    'simple',
  ],
  [
    'Homebrew Blade',
    'the table decides: 2 × level',
    null,
    'double proficiency, no rounding',
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
    'martial',
  ],
  [
    'Unfinished Club',
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
    'simple',
  ],
];

const PRE_DAMAGE_UNION_WIRE = [
  'dnd-multiclass-spells-character-share',
  1,
  [
    'Pre-Damage-Union Hero',
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
  [],
  [],
  [],
  [],
  [],
  [],
  null,
  null,
  PRE_DAMAGE_UNION_WEAPONS,
  [null, null, null],
  [null, null, null, null],
  null,
];

describe('a share link generated before weapon damage became a union', () => {
  it('contains the frozen twenty-element weapon tuples emitted by main', () => {
    for (const weapon of PRE_DAMAGE_UNION_WEAPONS) {
      expect(weapon).toHaveLength(20);
    }
    const decodedWire = JSON.parse(
      new TextDecoder().decode(
        gunzipSync(independentBase64urlDecode(PRE_DAMAGE_UNION_FRAGMENT)),
      ),
    ) as unknown;
    expect(decodedWire).toEqual(PRE_DAMAGE_UNION_WIRE);
  });

  it('migrates every old primary and versatile damage state losslessly', async () => {
    const decoded = await decodeShareFragment(PRE_DAMAGE_UNION_FRAGMENT);
    expect(decoded.weapons).toEqual([
      {
        name: 'Parseable Spear',
        proficiency_category: 'simple',
        damage: { kind: 'dice', dice: '1d6' },
        versatile_damage: { kind: 'dice', dice: '1d8' },
        range: { kind: 'none' },
      },
      {
        name: 'Homebrew Blade',
        proficiency_category: 'martial',
        damage: {
          kind: 'custom',
          text: 'the table decides: 2 × level',
        },
        versatile_damage: {
          kind: 'custom',
          text: 'double proficiency, no rounding',
        },
        range: { kind: 'none' },
      },
      {
        name: 'Unfinished Club',
        proficiency_category: 'simple',
        damage: { kind: 'not_recorded' },
        versatile_damage: { kind: 'not_applicable' },
        range: { kind: 'none' },
      },
    ]);
  });
});

/**
 * Five literal fragments independently compressed from hand-written v1
 * positional documents. None was produced by the current encoder.
 */
const V1_RANGE_FRAGMENTS = [
  [
    'none',
    'H4sIAAAAAAAAA52NsQrDMAxEf6Votod-SJeuQhRVFolBVYzk_H8pFDpkSuF4w_G4Q2je6mu32cU4s-ZQs6yycrBMjZorh0K5FoQ7-6KXW1-CfULx3ewUqOAhPwMRfHP9Y_ccPjfzESpbNG1A34LHsC78NAUiojfhWuwEGQEAAA',
    { kind: 'none' },
  ],
  [
    'near-only',
    'H4sIAAAAAAAAA5WNsQoCQQxEf0VS74L6Hza2IUjMhruFmF2ye4V_byNYeM3B8IrhMYNQvOTXZrOK8Rh5dDUbWVYOlqmRx8qhkC4J4c6-6OlWl2CfkHwzOwRK-JefgQiuHLm5vffHr-fjn7tA8DYfodKiaAH6Fty7VeGnKRARfQBcrXFWHAEAAA',
    { kind: 'ranged', near_feet: 20, far_feet: null },
  ],
  [
    'ordinary',
    'H4sIAAAAAAAAA5WNsQrDMAxEf6VotiHt0L_o0lWIotoiMaiykZ2hf9-lUGiyBI43HI87hGw5vlYdJSn3HnsT1R7Tws5piMe-sAuEc0C4s81yupXZ2QYEW1UPgQJu8jMQoXouxv7e375M4Todf_0HgtXxcEnVs2Sgb8GtaUn8VAEiog9vxLJrGQEAAA',
    { kind: 'ranged', near_feet: 20, far_feet: 60 },
  ],
  [
    'long-only',
    'H4sIAAAAAAAAA5WNwQoCMQxEf0VybkEv_oWXvYYgsQ3dQkxL2j34914WBAVhYXiH4TGDkC3H56azJuUx4uiiOmJa2TlN8ThWdoFwCQgLW5HTrRZnmxBsUz0ECviTj4EI2qzEZvr6M349Hz_-BoK1eXdJzbNkoL3g3rUmfqgAEdEb5ydbUhwBAAA',
    { kind: 'legacy', near_feet: null, far_feet: 60 },
  ],
  [
    'inverted',
    'H4sIAAAAAAAAA5WNsQoCQQxEf0VS78Jp4V_Y2IYgMRvuFmJuye75_TaCoDYHwyuGxwxC8ZIfm40qxr3n3tSsZ1k4WIZG7guHQjomhCv7rIdLnYN9QPLNbBco4U8-BiJUf2oMLf-3z1M6Tftfv4Hg67iFyhpFC9C74NasCt9NgYjoBQFYHvQZAQAA',
    { kind: 'legacy', near_feet: 60, far_feet: 20 },
  ],
] as const;

/**
 * Boundary fragments hand-authored in the frozen v1 tuple layout and then
 * independently gzipped. These are additions to, not replacements for, the
 * five state fixtures above.
 */
const V1_RANGE_BOUNDARY_FRAGMENTS = [
  [
    'equal distances',
    'H4sIAAAAAAAAA5WNQQoCMQxFryJZt6AewSPMNgSJTXAGYlvTduHtB0EQdDYDj7f4fP5HkCzxMawvybi12KqatZhmdk5dPbaZXSGcAsLE-a6HSxlZ2F8Q8jDbJQr4x7eBCPocbNvD5-Ob3Ze_QsilX11TcVEB-gRcqy2Jb6ZARLQCiVU3tRcBAAA',
    { kind: 'ranged', near_feet: 20, far_feet: 20 },
  ],
  [
    'smallest inverted pair',
    'H4sIAAAAAAAAA5WNQQoCMQxFryJZt-C4c-sR3JYgsQ1OIZOWpCPM7d0IgroZ-LzF58FLULTEZZVRs5B79M4iHvNMRnmwRZ_JGMIUElxJH3y4tFUL2QZBV5FdwJB-9jFSAl9IhH3Eqk-2weV_5HQM03l__hsJtI2bcW5WuAC-D-pdaqa7MCAivgAgvUoTIwEAAA',
    { kind: 'legacy', near_feet: 20, far_feet: 19 },
  ],
  [
    'zero near distance',
    'H4sIAAAAAAAAA5WNMQrDMAxFr1I025AuPUCPkFWIotoiCaiyke2hPX2WQqHtEvi84fP4HyFbjo-hfUvKrcVWRbXFtLJz6uKxrewC4RwQZrZFTtcyLLM_IdhQPQQK-JOPgQgm7PElXv6PT-EyHX_9BoKVfnNJxbNkoHfBteqW-K4CREQ7rBzhzhoBAAA',
    { kind: 'ranged', near_feet: 0, far_feet: 60 },
  ],
  [
    'zero far distance',
    'H4sIAAAAAAAAA5WNQQpCMQxEryJZN6BX8AhuQ5DYRv-HmJa0Xejp3QiCgvBheIvhMUNQvOB92lizSe_Ym5p1zIuE5KGBfZFQSIdEcBK_6e5YpxeJBySfZpvAiX7yMYjgKoFPjfpne7_99hsEXsc5NNcoWoDfhbRma5aLKTAzvwCOLPZ1GwEAAA',
    { kind: 'legacy', near_feet: null, far_feet: 0 },
  ],
  [
    'near distance ceiling',
    'H4sIAAAAAAAAA5WNsQrDMAxEf6VotqH5hX5CVyOKKovEoMpGtof-fSkEOjRLjuMNx3GXIFuOr6mjsFLvsTdR7ZE3cuIhHvtGLhCWkOBOtsrlVqdl8jcEm6qngCH9-ddICUzII0vRYuvx_nL96vz1IRJYHQ8Xrp4lA-4BtaaF6akCiIgffLGWmyQBAAA',
    { kind: 'ranged', near_feet: 100_000, far_feet: null },
  ],
  [
    'far distance ceiling',
    'H4sIAAAAAAAAA5WNwQoCMQxEf0VybmHXT_ATvIYgMY27hdiWtHvw70UQBPWyw_AOwzCDkEqK981GFuPeY29q1qOs7CxDPfaVXSHMAeHMZdHDqW4lsT8glM1sFyjgjz8NRLixR9FsuSz_549TmKeX9p9_A6HUcXGV6kkT0Dvg1iwLX02BiOgJt18DByEBAAA',
    { kind: 'ranged', near_feet: 20, far_feet: 100_000 },
  ],
] as const;

describe('the adjacent v1-to-v2 migration', () => {
  it.each(V1_RANGE_FRAGMENTS)(
    'carries the hand-authored %s v1 range fragment losslessly',
    async (_name, fragment, expectedRange) => {
      const decoded = await decodeShareFragment(fragment);
      expect(decoded.weapons?.[0]?.range).toEqual(expectedRange);
    },
  );

  it.each(V1_RANGE_BOUNDARY_FRAGMENTS)(
    'classifies the hand-authored v1 %s boundary losslessly',
    async (_name, fragment, expectedRange) => {
      const decoded = await decodeShareFragment(fragment);
      expect(decoded.weapons?.[0]?.range).toEqual(expectedRange);
    },
  );

  it('refuses to freshly encode the migration-only legacy limb', () => {
    const document = validateShareDocument({
      format: CHARACTER_SHARE_FORMAT,
      version: CHARACTER_SHARE_VERSION,
      character: { name: 'Legacy cannot be minted' },
      classes: [],
      sources: [],
      selections: [],
      spellbook: [],
      preferences: [],
      overrides: [],
      weapons: [{
        name: 'Old bow',
        damage: { kind: 'not_recorded' },
        versatile_damage: { kind: 'not_applicable' },
        range: { kind: 'legacy', near_feet: null, far_feet: 60 },
      }],
    });

    expect(() => shareDocumentToPositional(document)).toThrow(
      /decode-only legacy range/,
    );
  });

  it('enforces the placeholder cap at the v2 root position', () => {
    const hostile = [
      CHARACTER_SHARE_FORMAT,
      2,
      [
        'Hostile placeholders',
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
      [],
      [],
      [],
      [],
      [],
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      Array.from(
        { length: SHARE_LIMITS.placeholders + 1 },
        (_, index) => [
          `2024:org.example:hostile-placeholder-${String(index)}`,
          `Placeholder ${String(index)}`,
        ],
      ),
    ];

    expect(() => positionalToShareDocument(hostile)).toThrow(
      /placeholders exceeds the maximum count of 1000/,
    );
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

/**
 * A SHARE LINK GENERATED BEFORE THE SHEET INPUTS TRAVELLED.
 *
 * `PRE_SHEET_FRAGMENT` is a literal base64url string, minted ONCE from the
 * hand-written thirteen-element tuple below and pasted here. It is the shape of
 * every link generated between the origins change and this one — which is to
 * say, the links people are pasting into chats today.
 *
 * IT IS NOT PRODUCED BY `shareDocumentToPositional`, and that is the whole
 * point. A fixture generated by the code under test tracks the format wherever
 * it goes: it would have fourteen elements the moment this build ran, and the
 * suite would quietly start testing the new format against itself while the
 * regression it exists to catch — the day a fourteenth element becomes
 * mandatory and every link in the wild stops decoding — sailed past.
 */
const PRE_SHEET_FRAGMENT =
  'H4sIAAAAAAACA3VQ20oDQQz9lSHPWdnZVpG-CT7si1BYEWQpEneyOwNzKXPR-vfSdlml' +
  'VgghIeecnKQH5VXlis1msJRSlfZsbaoGTZGGzLFKmiIDSuxhG7nqNHMWLccAKBuUtyjX' +
  'KGuUK7xHX6y9SDvs-xqhqZv15rRhM5pJZ45wxqxRXjKOFIkwMmWYmcd6Q5ZjnmnNAv0V' +
  'Pzp9Dy15RQcGBKnuAKGzlLTxE1xzifDCh-uTHAv_3y6G4fGT4ggIbXHkg1GA8MTKFDfL' +
  'ruoF9sFePIcyac8pAcJrKFG0JottMD4LRwfjihPGD5EpcRLvX0LeAILev7mgzGiW951S' +
  'Pf_waAS6YNVpDl2O7Kes_9wFD1lbzmZI108-a-2-ARz1CkIcAgAA';
const PRE_SHEET_WIRE = [
  'dnd-multiclass-spells-character-share',
  1,
  ['Pre-Sheet Hero', 12, 15, 14, 10, 13, 8, null, null, null, null],
  [[0, '2024:class:fighter', null, 4, 1, null, null, null]],
  [[1, 'feat', '2024:feat:alert', null, 2, null]],
  [],
  [],
  [],
  [],
  null,
  null,
  [['Handaxe', '1d6', 'Slashing', null, null, null, null, 'Vex', null, null,
    null, null, true, null, null, true, null, null, null]],
  [
    ['Dwarf', 'Humanoid', 'Medium', null, 30],
    [['Dwarven Toughness', 'Your Hit Point maximum increases by 1.',
      'hp_modifier', null, null, 0, 1, null]],
    ['Soldier', 'Strength', null, null, null, 'Athletics', null, null, null,
      null, null],
  ],
];

describe('a share link generated before the sheet inputs travelled', () => {
  it('is thirteen elements, and the frozen fragment really contains them', () => {
    // THE LOAD-BEARING GUARD, copied from the eleven-element suite below and
    // for the same reason: if the literal above were ever regenerated from
    // current code it would have fourteen elements, and this fails rather than
    // the suite quietly starting to test the new format against itself.
    expect(PRE_SHEET_WIRE).toHaveLength(13);
    const decodedWire = JSON.parse(
      new TextDecoder().decode(
        gunzipSync(independentBase64urlDecode(PRE_SHEET_FRAGMENT)),
      ),
    ) as unknown;
    expect(decodedWire).toEqual(PRE_SHEET_WIRE);
  });

  it('still decodes, with no sheet section at all', async () => {
    const decoded = await decodeShareFragment(PRE_SHEET_FRAGMENT);
    expect(decoded.character.name).toBe('Pre-Sheet Hero');
    expect(decoded.classes[0]?.classKey).toBe('2024:class:fighter');
    // The sections that DID exist when this link was minted still arrive.
    expect(decoded.weapons?.[0]?.name).toBe('Handaxe');
    expect(decoded.weapons?.[0]?.damage).toEqual({
      kind: 'dice',
      dice: '1d6',
    });
    expect(decoded.weapons?.[0]?.versatile_damage).toEqual({
      kind: 'not_applicable',
    });
    expect(decoded.species?.name).toBe('Dwarf');
    expect(decoded.background?.name).toBe('Soldier');
    // ABSENT, NOT EMPTY. The link never said anything about armour, rolls,
    // skills or an adjustment, and an empty list would be this build putting
    // words in its mouth.
    for (const key of [
      'armor',
      'hitPointRolls',
      'skillProficiencies',
      'sheetAdjustment',
    ]) {
      expect(Object.hasOwn(decoded, key)).toBe(false);
    }
  });

  it('decodes identically whether or not the fourteenth element is present', async () => {
    // A fourteen-element tuple with four nulls and a thirteen-element tuple
    // must mean the same thing, or a character shared today and the same
    // character shared last month would import differently.
    const decodedOld = await decodeShareFragment(PRE_SHEET_FRAGMENT);
    const decodedNew = await decodeShareFragment(
      nodeFragment([...PRE_SHEET_WIRE, [null, null, null, null]]),
    );
    expect(decodedNew).toEqual(decodedOld);
  });
});

/**
 * A REAL LINK FROM THE BUILD BEFORE THE EFFECT MODEL WAS INVERTED.
 *
 * FOURTEEN elements, and its mechanical payload is written where that build
 * wrote it: on the TRAIT ROWS, five slots into each trait tuple. This build
 * writes `null` in those five slots and puts the effects in element 14 instead,
 * so this fixture is the only thing standing between a user's pasted link and
 * silent data loss.
 *
 * HAND-BUILT, AND NOT PRODUCED BY `shareDocumentToPositional`. A fixture
 * generated by the code under test tracks the format wherever it goes: it would
 * have fifteen elements and empty effect slots the moment this build ran, and
 * the suite would quietly start testing the new format against itself while the
 * regression it exists to catch sailed past. The fragment below is the gzip of
 * the literal, produced by Node's zlib rather than by the encoder.
 *
 * THE THREE TRAITS ARE CHOSEN, NOT ARBITRARY:
 *
 *  - `Fiendish Legacy` carries `granted_spells`, RETIRED from the vocabulary.
 *    It must decode (rejecting would make this link unreadable) and must NOT
 *    become an effect (there is no such kind, and the spells it marked come
 *    from the grant system);
 *  - `Dwarven Toughness` carries the two-column HP payload, which must survive
 *    as an `hp_modifier` effect;
 *  - `Ancestral Guard` carries a typed resistance, which must survive as one.
 */
const PRE_EFFECTS_FRAGMENT =
  'H4sIAAAAAAAAA3WRW2scMQyF_4rQs6aMN1so-1Zo2n1IILR5KUNZFFszY_DIwZdt8-_L' +
  'XLq0yxaMEPY5-tBxh05dM9VQvA2cc5NfJYTc2JET2yKpySMnQTLU4VOS5r7vxZYMR0kR' +
  'yezIvCezJ9OSuaMPpDWEq_KDuq4l3LW7_WFhHHo_jEUSrpo9mWvHbDGEvXDBzTn3Bw6S' +
  'ymbbXaR_nSt81-Gzlz54HZDwWCfW6B0SPorzddom3bUzDz97UefzCA8ysH1Dwu-xwsBe' +
  'oYwCQc4SwMCLqPS-QOyXazvGLAph8bxDwiGxFnGnNUi8lcifWPDTT05nUXiOdRhVcl6h' +
  'CY6-wFP0WmDiX36qE3i1SThLhpc3MDNofD1N0fneX5JcSrvFOc__qFZySRzgS-XktpVG' +
  'Pgt8lexzYbUCJc6sHBUcTzzIPHztTumiQsJVdHOjGfatRBVbVZe0_7f2P7-8WW8-_gaX' +
  'JLFOmgIAAA';

const PRE_EFFECTS_WIRE = [
  'dnd-multiclass-spells-character-share',
  1,
  ['Pre-Effects Hero', 12, 15, 14, 10, 13, 8, null, null, null, null],
  [[0, '2024:class:fighter', null, 4, 1, null, null, null]],
  [[1, 'feat', '2024:feat:alert', null, 2, null]],
  [],
  [],
  [],
  [],
  null,
  null,
  null,
  [
    ['Tiefling', 'Humanoid', 'Medium', null, 30],
    [
      ['Fiendish Legacy', 'You gain the level 1 benefit of the chosen legacy.',
        'granted_spells', null, null, null, null, null],
      ['Dwarven Toughness', 'Your Hit Point maximum increases by 1.',
        'hp_modifier', null, null, 0, 1, null],
      ['Ancestral Guard', 'You have Resistance to Poison damage.',
        'damage_resistance', 'Poison', null, null, null, null],
      ['Stonecunning', null, null, null, null, null, null, null],
    ],
    null,
  ],
  [null, null, null, null],
];

describe('a share link generated before the effect model was inverted', () => {
  it('is fourteen elements, and the frozen fragment really contains them', () => {
    // THE LOAD-BEARING GUARD. If the literal above were ever regenerated from
    // current code it would have fifteen elements and no trait payload, and
    // this fails rather than the suite quietly testing the new format against
    // itself.
    expect(PRE_EFFECTS_WIRE).toHaveLength(14);
    const decodedWire = JSON.parse(
      new TextDecoder().decode(
        gunzipSync(independentBase64urlDecode(PRE_EFFECTS_FRAGMENT)),
      ),
    ) as unknown;
    expect(decodedWire).toEqual(PRE_EFFECTS_WIRE);
  });

  it('still decodes, keeping the retired vocabulary readable', async () => {
    const decoded = await decodeShareFragment(PRE_EFFECTS_FRAGMENT);
    expect(decoded.character.name).toBe('Pre-Effects Hero');
    expect(decoded.species?.name).toBe('Tiefling');
    // THE PAYLOAD ARRIVES INTACT, on the trait rows where this link put it.
    // The decoder does not migrate — `importCharacterShare` does — so what the
    // document says is exactly what it said when it was minted.
    expect(decoded.speciesTraits?.[0]).toMatchObject({
      name: 'Fiendish Legacy',
      // ACCEPTED, not rejected, even though `effectKinds` no longer has this
      // member. Validating a link minted last week against this week's
      // vocabulary is how you make somebody's pasted URL undecodable.
      effect_kind: 'granted_spells',
    });
    expect(decoded.speciesTraits?.[1]).toMatchObject({
      effect_kind: 'hp_modifier',
      effect_hit_points_flat: 0,
      effect_hit_points_per_level: 1,
    });
    expect(decoded.speciesTraits?.[2]).toMatchObject({
      effect_kind: 'damage_resistance',
      effect_damage_type: 'Poison',
    });
    // ABSENT, NOT EMPTY. The link never mentioned effects, and an empty list
    // would be this build claiming the character had none — which is exactly
    // wrong, since three of its traits carry one.
    expect(Object.hasOwn(decoded, 'effects')).toBe(false);
  });

  it('decodes identically whether or not the fifteenth element is present', async () => {
    // A fifteen-element tuple with a null effects slot and a fourteen-element
    // tuple must mean the same thing, or a character shared today and the same
    // character shared last month would import differently.
    const decodedOld = await decodeShareFragment(PRE_EFFECTS_FRAGMENT);
    const decodedNew = await decodeShareFragment(
      nodeFragment([...PRE_EFFECTS_WIRE, null]),
    );
    expect(decodedNew).toEqual(decodedOld);
  });
});

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

  it('decodes identically at every one of the four accepted lengths', async () => {
    // The same claim, carried forward to the sheet element: eleven, twelve with
    // a null, thirteen with a null and three nulls, and fourteen with a null,
    // three nulls and four nulls must ALL be the same document. Anything else
    // means a link's meaning changed under the person who sent it.
    const decodedOld = await decodeShareFragment(LEGACY_FRAGMENT);
    for (const wire of [
      [...LEGACY_WIRE, null],
      [...LEGACY_WIRE, null, [null, null, null]],
      [...LEGACY_WIRE, null, [null, null, null], [null, null, null, null]],
    ]) {
      expect(await decodeShareFragment(nodeFragment(wire))).toEqual(decodedOld);
    }
  });

  it('decodes a thirteen-element link — origin but no sheet — as recording none', async () => {
    // Every link generated between the origins change and this one looks like
    // this. It must decode with no sheet keys at all, not with four empty ones:
    // "recorded no armour" and "never carried armour" are the same import here,
    // and the absent key is what keeps them from being told apart wrongly.
    const withOrigin = [...LEGACY_WIRE, [], [null, null, null]];
    const decoded = await decodeShareFragment(nodeFragment(withOrigin));
    expect(decoded.weapons).toEqual([]);
    expect(decoded).not.toHaveProperty('armor');
    expect(decoded).not.toHaveProperty('hitPointRolls');
    expect(decoded).not.toHaveProperty('skillProficiencies');
    expect(decoded).not.toHaveProperty('sheetAdjustment');
  });

  it('still refuses a length that is neither', async () => {
    // Tolerance is exactly four lengths wide, not "any length". Ten elements
    // and sixteen elements are both malformed and must stay refused.
    for (const wire of [
      LEGACY_WIRE.slice(0, 10),
      [...LEGACY_WIRE, null, null, null, null, null],
    ]) {
      await expect(
        decodeShareFragment(nodeFragment(wire)),
      ).rejects.toThrow(
        /wire document must be a tuple of length 11 or 12 or 13 or 14/,
      );
    }
  });

  it('decodes a twelve-element link — weapons but no origin — as having none', async () => {
    // The intermediate format, which is what every link generated between the
    // weapons change and this one looks like. It must decode with a `weapons`
    // key and no origin keys at all, not with three empty ones.
    const withWeapons = [...LEGACY_WIRE, []];
    const decoded = await decodeShareFragment(nodeFragment(withWeapons));
    expect(decoded.weapons).toEqual([]);
    expect(decoded).not.toHaveProperty('species');
    expect(decoded).not.toHaveProperty('speciesTraits');
    expect(decoded).not.toHaveProperty('background');
  });
});

/**
 * A SHARE LINK GENERATED BEFORE A CHARACTER'S OWN NOTES COULD TRAVEL (Q12).
 *
 * THE ROOT TUPLE IS NOT WHERE THIS GREW. Every previous section of this format
 * appended to the ROOT, which has tolerated a short tuple since links existed.
 * The character's note appends to the CHARACTER element, which was `tuple(…,
 * 11, …)` — EXACT — right up until this change. That is the weapon tuple's
 * defect exactly (D33/F18): an exact-length reader plus an appended field means
 * every link already in somebody's chat history stops decoding.
 *
 * So the fixtures below are the three frozen links this file already holds,
 * asked a question none of them was minted to answer: is their character
 * element still readable now that a longer one exists? All three are literal
 * base64url strings that nothing regenerates, which is what makes the answer
 * mean anything.
 */
describe('a share link generated before a character note could travel', () => {
  const frozen = [
    ['pre-weapons', LEGACY_FRAGMENT, LEGACY_WIRE],
    ['pre-sheet', PRE_SHEET_FRAGMENT, PRE_SHEET_WIRE],
    ['pre-effects', PRE_EFFECTS_FRAGMENT, PRE_EFFECTS_WIRE],
  ] as const;

  it.each(frozen)(
    'the %s fixture really carries the pre-Q12 eleven-element character',
    (_name, _fragment, wire) => {
      // THE LOAD-BEARING GUARD, on the same terms as its siblings above: if any
      // of these literals were ever regenerated from current code its character
      // element would have twelve elements, and this fails rather than the file
      // quietly testing the new arity against itself.
      expect(wire[2]).toHaveLength(11);
    },
  );

  it.each(frozen)('the %s link still decodes, with no note', async (
    _name,
    fragment,
  ) => {
    const decoded = await decodeShareFragment(fragment);
    // ABSENT, NOT EMPTY AND NOT NULL. The link never said anything about a
    // note, and any present value would be this build inventing one.
    expect(Object.hasOwn(decoded.character, 'notes')).toBe(false);
    expect(decoded.character.notes).toBeUndefined();
  });

  it('decodes identically whether or not the twelfth CHARACTER element is present', async () => {
    // A twelve-element character with a `null` note and an eleven-element one
    // must mean the same thing, or a character shared today and the same
    // character shared last month would import differently.
    const decodedOld = await decodeShareFragment(LEGACY_FRAGMENT);
    const padded: unknown[] = [...LEGACY_WIRE];
    padded[2] = [...(LEGACY_WIRE[2] as unknown[]), null];
    expect(await decodeShareFragment(nodeFragment(padded))).toEqual(decodedOld);
  });

  it('reads the twelfth CHARACTER element when a link actually carries one', async () => {
    // The other direction, and the reason the padding test above is not enough
    // on its own: an element that is accepted and then ignored would pass it.
    const withNote: unknown[] = [...LEGACY_WIRE];
    withNote[2] = [
      ...(LEGACY_WIRE[2] as unknown[]),
      'Sent on purpose, by a sharer who opted in.',
    ];
    const decoded = await decodeShareFragment(nodeFragment(withNote));
    expect(decoded.character.notes).toBe(
      'Sent on purpose, by a sharer who opted in.',
    );
    // ...and nothing before it moved. `placeholders` sits at index 10 and is
    // the element an inserted — rather than appended — note would have shifted.
    expect(decoded.character.name).toBe('Old Link Hero');
    expect(decoded.character.intelligence).toBe(16);
    expect(Object.hasOwn(decoded, 'placeholders')).toBe(false);
  });

  it('refuses a character arity that is neither eleven nor twelve', async () => {
    // Tolerance is exactly two lengths wide, not "any length".
    for (const character of [
      (LEGACY_WIRE[2] as unknown[]).slice(0, 10),
      [...(LEGACY_WIRE[2] as unknown[]), null, null],
    ]) {
      const wire: unknown[] = [...LEGACY_WIRE];
      wire[2] = character;
      await expect(
        decodeShareFragment(nodeFragment(wire)),
      ).rejects.toThrow(/wire character must be a tuple of length 11 or 12/);
    }
  });
});
