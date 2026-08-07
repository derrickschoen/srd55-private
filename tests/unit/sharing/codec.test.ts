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
import {
  MIGRATIONS,
  SHARE_SCHEMAS,
  ShareWireRetirementError,
} from '../../../src/sharing/wire-schemas';

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
    alignment: 'Neutral Good',
    appearance: 'A silver cloak and a weathered staff.',
    backstory: 'Studied the old wards beneath Waterdeep.',
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
      acquiredAtClassLevel: 5,
    },
    {
      ref: 1,
      ruleKey: 'homebrew',
      ordinal: 1,
      spellKey: '2024:com.example.spells:starward-aegis',
      spellName: 'Starward Aegis',
    },
  ],
  spellbook: [{
    ref: 0,
    ruleKey: 'wizard-spellbook',
    ordinal: 1,
    acquiredAtClassLevel: 1,
    spellKey: '2024:shield',
  }],
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
    {
      kind: 'armor_class_bonus',
      label: 'Ring of Protection, house ruled.',
      amount: 3,
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
  // The three stored sheet inputs. Both armour slots are filled, and the worn
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
  // THE V5 SECTION (S-A, skills-with-provenance): one FILLED class grant and
  // one UNFILLED one, so the wire pin below sees a real value in the skill
  // slot AND proves the null/absent selection survives. `ref: 0` is
  // `classes[0].id` — the same reference space `selections[].ref` uses.
  skillGrants: [
    { ref: 0, grantKey: 'class_skill', ordinal: 1, skill: 'arcana' },
    { ref: 0, grantKey: 'class_skill', ordinal: 2 },
  ],
  expertiseGrants: [{
    ref: 0,
    grantKey: 'class_expertise_1',
    ordinal: 1,
    grantedAtClassLevel: 1,
    skill: 'arcana',
  }],
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

/**
 * RETARGETING HELPERS FOR THE RETIREMENT (D60, skills plan §3.2).
 *
 * `positionalToShareDocument`/`decodeShareFragment` now throw
 * `ShareWireRetirementError` for every pre-v5 wire — deliberately, per the
 * v4→v5 migration in `src/sharing/wire-schemas/index.ts`. Every fixture below
 * that used to assert a FULL decoded document from a v1-v4 wire has a
 * two-part surviving subject: (a) the composed path refuses it BY NAME, and
 * (b) the actual migration/validation behaviour the fixture was pinning is
 * still real, unretired production code, reachable by composing the
 * exported adjacent `MIGRATIONS` up to (but not including) the deliberate
 * v4→v5 throw. These helpers exercise (b) directly, independent of
 * `positionalToShareDocument`.
 */

/** Raw fragment → raw positional array, independent of `decodeShareFragment` (which now throws for every pre-v5 version). */
function rawPositionalFromFragment(fragment: string): unknown {
  return JSON.parse(
    new TextDecoder().decode(gunzipSync(independentBase64urlDecode(fragment))),
  ) as unknown;
}

/** Composes the SAME adjacent migrations the codec uses, stopping one step short of the deliberate v4→v5 retirement throw. */
function migrateV1WireToV4(wire: unknown): unknown {
  return MIGRATIONS[3](MIGRATIONS[2](MIGRATIONS[1](wire)));
}

/** Hand-lifts v4's unchanged source tuples to v9's appended marker slot. */
function appendV9SourceMarker(root: unknown[]): void {
  root[4] = (root[4] as unknown[][]).map((source) => [...source, null]);
  root.push(null); // v11 attunementSlots
}

function rewriteV14SpellAcquisitions(root: unknown[]): void {
  root[5] = (root[5] as unknown[]).map((selection) => [
    ...(selection as unknown[]),
    null,
  ]);
  root[6] = (root[6] as unknown[]).map((spell) => [
    null,
    null,
    null,
    null,
    spell,
    null,
  ]);
}

/** Hand-lifts the frozen v16 character tuple with D104's three null absences. */
function appendV17Flavor(root: unknown[]): void {
  root[2] = [...(root[2] as unknown[]), null, null, null];
}

interface StructuralTupleSchema {
  readonly arities: readonly number[];
  readonly fields: readonly { readonly key: string }[];
}
interface StructuralVariantSchema {
  readonly variants: readonly {
    readonly arity: number;
    readonly fields: readonly { readonly key: string }[];
  }[];
}

/** Decodes a single-shape tuple positionally, by field NAME rather than index — reused from the same pattern in `wire-schema-registry.test.ts`. */
function decodeStructural(
  value: unknown,
  schema: StructuralTupleSchema,
  label: string,
): Record<string, unknown> {
  if (!Array.isArray(value) || !schema.arities.includes(value.length)) {
    throw new Error(
      `${label} did not parse against its frozen schema (arity ${
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

/** As `decodeStructural`, for a tuple whose SHAPE varies by arity (weapon, damage). */
function decodeVariant(
  value: unknown,
  schema: StructuralVariantSchema,
  label: string,
): Record<string, unknown> {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a tuple.`);
  }
  const variant = schema.variants.find(
    (candidate) => candidate.arity === value.length,
  );
  if (!variant) {
    throw new Error(`${label} has an unrecognised arity ${value.length}.`);
  }
  const record: Record<string, unknown> = {};
  variant.fields.forEach((field, index) => {
    record[field.key] = value[index] ?? null;
  });
  return record;
}

/**
 * A migrated weapon range wire tuple, decoded positionally. `rangeToWire` in
 * `src/sharing/wire-schemas/index.ts` writes `[kind, near_feet, far_feet]` for
 * BOTH the `ranged` and `legacy` limbs — the wire schema's field labels
 * ('near'/'far' vs 'normal'/'long') are documentation only, not a positional
 * difference — so one positional reader covers every kind.
 */
function decodeMigratedWeaponRange(tuple: unknown): unknown {
  if (!Array.isArray(tuple)) {
    throw new Error('migrated weapon range must be a tuple.');
  }
  if (tuple.length === 1) {
    return { kind: tuple[0] };
  }
  if (tuple.length === 3) {
    return {
      kind: tuple[0],
      near_feet: tuple[1] ?? null,
      far_feet: tuple[2] ?? null,
    };
  }
  throw new Error(`migrated weapon range has an unexpected arity ${tuple.length}.`);
}

/** A migrated damage/versatile_damage wire tuple, mapped to the domain shape (`{kind:'dice',dice}`, not the wire's generic `{kind,payload}`). */
function decodeMigratedDamage(tuple: unknown, label: string): unknown {
  const decoded = decodeVariant(tuple, SHARE_SCHEMAS[4].tuples.damage, label);
  switch (decoded.kind) {
    case 'dice':
      return { kind: 'dice', dice: decoded.payload };
    case 'flat':
      return { kind: 'flat', amount: decoded.payload };
    case 'custom':
      return { kind: 'custom', text: decoded.payload };
    default:
      return { kind: decoded.kind };
  }
}

/** The subset of a migrated weapon tuple's fields these fixtures actually assert on. */
function decodeMigratedWeapon(tuple: unknown): {
  readonly name: unknown;
  readonly damage: unknown;
  readonly versatile_damage: unknown;
  readonly range: unknown;
} {
  const record = decodeVariant(
    tuple,
    SHARE_SCHEMAS[4].tuples.weapon,
    'migrated weapon',
  );
  return {
    name: record.name,
    damage: decodeMigratedDamage(record.damage, 'migrated weapon.damage'),
    versatile_damage: decodeMigratedDamage(
      record.versatile_damage,
      'migrated weapon.versatile_damage',
    ),
    range: decodeMigratedWeaponRange(record.range),
  };
}

/** The migrated `origin` tuple's three slots, each null when absent — exactly `decodeCurrentWire`'s own absence rule, applied one schema version early. */
function decodeMigratedOrigin(tuple: unknown): {
  readonly species: Record<string, unknown> | null;
  readonly speciesTraits: readonly Record<string, unknown>[] | null;
  readonly background: Record<string, unknown> | null;
} {
  const origin = decodeStructural(
    tuple,
    SHARE_SCHEMAS[4].tuples.origin,
    'migrated origin',
  );
  const species =
    origin.species === null
      ? null
      : decodeStructural(
          origin.species,
          SHARE_SCHEMAS[4].tuples.species,
          'migrated species',
        );
  const speciesTraits =
    origin.speciesTraits === null
      ? null
      : (origin.speciesTraits as unknown[]).map((trait) =>
          decodeStructural(
            trait,
            SHARE_SCHEMAS[4].tuples.speciesTrait,
            'migrated species trait',
          )
        );
  const background =
    origin.background === null
      ? null
      : decodeStructural(
          origin.background,
          SHARE_SCHEMAS[4].tuples.background,
          'migrated background',
        );
  return { species, speciesTraits, background };
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

/**
 * THE COMPLETE DOCUMENT, RE-EXPRESSED AT V5 (plan §3.2/§3.6, D60).
 *
 * `COMPLETE_V1_WIRE` above is now RETIRED — the composed decode path throws
 * `ShareWireRetirementError` for every pre-v5 version, by design. Its own
 * test below is retargeted to prove exactly that, BY NAME.
 *
 * The subject `COMPLETE_V1_WIRE` and the old "version-4 golden" test actually
 * served — that a fully-populated wire tuple decodes/encodes losslessly,
 * position by position — still holds, just one version later. This is built
 * the SAME way the old version-4 golden was: the positions unaffected by any
 * version bump are SLICED directly from the hand-authored v1 literal, and
 * only the positions that actually changed (the character tuple's appended
 * method slot, the weapon tuples' typed range, the effect tuples' appended
 * ability_increase payload, and the new trailing `skillGrants` root element)
 * are written out by hand. Nothing here is produced by
 * `shareDocumentToPositional` — that would make this test circular.
 */
const COMPLETE_V5_WIRE = [
  'dnd-multiclass-spells-character-share',
  5,
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
  COMPLETE_V1_WIRE[14].map((effect) => [...effect, null, null, null]),
  [[
    '2024:com.example.spells:starward-aegis',
    'Starward Aegis',
  ]],
  // Element 16: the S-A skillGrants section. One FILLED class grant, one
  // UNFILLED — the null selection is the defended value the table exists
  // for, and it must survive the wire as an absent field, not a crash.
  [
    [0, 'class_skill', 1, 'arcana'],
    [0, 'class_skill', 2, null],
  ],
];

/**
 * THE COMPLETE DOCUMENT, RE-EXPRESSED AT V6 (starting-equipment plan §2,
 * E-A). Built the way `COMPLETE_V5_WIRE` itself was: every position a bump
 * does not touch is SLICED from the frozen v5 literal, and only what v6
 * actually changes is written out — the version slot, and one appended
 * `sourceRef` slot on every weapon tuple (21 → 22) and every armour tuple
 * (9 → 10). Null in every one of them is the truth of this document: all of
 * its rows were hand-added, and NULL means a person put this here. Nothing
 * here is produced by `shareDocumentToPositional` — that would make the
 * layout pin circular.
 */
const COMPLETE_V6_WIRE = [
  COMPLETE_V5_WIRE[0],
  6,
  ...COMPLETE_V5_WIRE.slice(2, 11),
  (COMPLETE_V5_WIRE[11] as unknown[][]).map((weapon) => [...weapon, null]),
  COMPLETE_V5_WIRE[12],
  [
    ((COMPLETE_V5_WIRE[13] as unknown[])[0] as unknown[][]).map((armor) => [
      ...armor,
      null,
    ]),
    ...(COMPLETE_V5_WIRE[13] as unknown[]).slice(1),
  ],
  ...COMPLETE_V5_WIRE.slice(14),
];

/**
 * THE COMPLETE DOCUMENT, RE-EXPRESSED AT V7 (owner ruling D69: equipment
 * provenance struck). v7 restores the v5 weapon and armour tuples — the
 * `sourceRef` slot v6 appended is DROPPED by `migrateV6ToV7` — so the v7
 * wire differs from the frozen v5 literal in exactly one position: the
 * version slot. Written out that way rather than generated, so the layout
 * pin below stays non-circular.
 */
const COMPLETE_V7_WIRE = [
  COMPLETE_V5_WIRE[0],
  7,
  ...COMPLETE_V5_WIRE.slice(2),
];

/**
 * THE COMPLETE DOCUMENT, RE-EXPRESSED AT V8 (AC-1, D72). Built the way every
 * earlier version was: every position a bump does not touch is SLICED from
 * the frozen v7 literal, and only what v8 actually changes is written out —
 * the version slot, five appended nulls on every EFFECT tuple (`complete`
 * sets none of the new AC-1 payload fields), and a trailing `null` ROOT
 * element for `items` (`complete` owns none). Nothing here is produced by
 * `shareDocumentToPositional` — that would make the layout pin circular.
 */
const COMPLETE_V8_WIRE = [
  COMPLETE_V7_WIRE[0],
  8,
  ...COMPLETE_V7_WIRE.slice(2, 14),
  (COMPLETE_V7_WIRE[14] as unknown[][]).map((effect) => [
    ...effect,
    null,
    null,
    null,
    null,
    null,
  ]),
  ...COMPLETE_V7_WIRE.slice(15),
  null,
];

/**
 * THE COMPLETE DOCUMENT, RE-EXPRESSED AT V9 (AC-2b, D72). The source tuple
 * appends the generated-only marker and every effect tuple appends the item
 * index, weapon index, and generated template reference. This fixture owns
 * none of those values, so all four new positions are hand-written nulls.
 */
const COMPLETE_V9_WIRE = [
  COMPLETE_V8_WIRE[0],
  9,
  ...COMPLETE_V8_WIRE.slice(2, 4),
  (COMPLETE_V8_WIRE[4] as unknown[][]).map((source) => [...source, null]),
  ...COMPLETE_V8_WIRE.slice(5, 14),
  (COMPLETE_V8_WIRE[14] as unknown[][]).map((effect) => [
    ...effect,
    null,
    null,
    null,
  ]),
  ...COMPLETE_V8_WIRE.slice(15),
];

/**
 * THE COMPLETE DOCUMENT, RE-EXPRESSED AT V10 (AC-4, D72). The adjustment
 * leaves the fourth sheet slot and becomes the final ordinary effect tuple.
 */
const COMPLETE_V10_WIRE = [
  COMPLETE_V9_WIRE[0],
  10,
  ...COMPLETE_V9_WIRE.slice(2, 13),
  (COMPLETE_V9_WIRE[13] as unknown[]).slice(0, 3),
  [
    ...(COMPLETE_V9_WIRE[14] as unknown[][]),
    [
      'armor_class_bonus',
      'Ring of Protection, house ruled.',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      3,
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
  ...COMPLETE_V9_WIRE.slice(15),
];

/** D92: item tuples lose `attuned`; the root gains three fixed slots. */
const COMPLETE_V11_WIRE = [
  COMPLETE_V10_WIRE[0],
  11,
  ...COMPLETE_V10_WIRE.slice(2),
  null,
];

/** D86: item tuples append quantity; this complete fixture owns no items. */
const COMPLETE_V12_WIRE = [
  COMPLETE_V11_WIRE[0],
  12,
  ...COMPLETE_V11_WIRE.slice(2),
];

/** D83: accepted-kind mint only; every tuple position is unchanged. */
const COMPLETE_V13_WIRE = [
  COMPLETE_V12_WIRE[0],
  13,
  ...COMPLETE_V12_WIRE.slice(2),
];

/** GF-1: selection level appended; spellbook strings become acquisitions. */
const COMPLETE_V14_WIRE = [
  COMPLETE_V13_WIRE[0],
  14,
  ...COMPLETE_V13_WIRE.slice(2, 5),
  [
    [
      ...((COMPLETE_V13_WIRE[5] as unknown[][])[0] as unknown[]),
      5,
    ],
    [
      ...((COMPLETE_V13_WIRE[5] as unknown[][])[1] as unknown[]),
      null,
    ],
  ],
  [[0, 'wizard-spellbook', 1, 1, '2024:shield', null]],
  ...COMPLETE_V13_WIRE.slice(7),
];

/** GF-2: append Expertise grants; this fixture has none. */
const COMPLETE_V15_WIRE = [
  COMPLETE_V14_WIRE[0],
  15,
  ...COMPLETE_V14_WIRE.slice(2),
  [[0, 'class_expertise_1', 1, 1, 'arcana']],
];

/** LU-1: v16 preserves every frozen v15 position and appends choices. */
const COMPLETE_V16_WIRE = [
  COMPLETE_V15_WIRE[0],
  16,
  ...COMPLETE_V15_WIRE.slice(2),
  null,
];

/** D104: append flavor after every frozen v16 character position. */
const COMPLETE_V17_WIRE = [
  COMPLETE_V16_WIRE[0],
  17,
  [
    ...((COMPLETE_V16_WIRE[2] as unknown[]) ?? []),
    'Neutral Good',
    'A silver cloak and a weathered staff.',
    'Studied the old wards beneath Waterdeep.',
  ],
  ...COMPLETE_V16_WIRE.slice(3),
];
/** HA-12: v18 appends portable content; this fixture has none. */
const COMPLETE_V18_WIRE = [...COMPLETE_V17_WIRE.slice(0, 1), 18,
  ...COMPLETE_V17_WIRE.slice(2), null];

/** The honest v13 migration: old wire carried neither provenance field. */
const MIGRATED_COMPLETE_V15_WIRE = [
  COMPLETE_V13_WIRE[0],
  15,
  ...COMPLETE_V13_WIRE.slice(2, 5),
  (COMPLETE_V13_WIRE[5] as unknown[][]).map((selection) => [
    ...selection,
    null,
  ]),
  [['2024:shield']].map(([spell]) => [
    null,
    null,
    null,
    null,
    spell,
    null,
  ]),
  ...COMPLETE_V13_WIRE.slice(7),
  null,
];
const MIGRATED_COMPLETE_V16_WIRE = [
  MIGRATED_COMPLETE_V15_WIRE[0],
  16,
  ...MIGRATED_COMPLETE_V15_WIRE.slice(2),
  null,
];
const MIGRATED_COMPLETE_V17_WIRE = [
  MIGRATED_COMPLETE_V16_WIRE[0],
  17,
  [
    ...((MIGRATED_COMPLETE_V16_WIRE[2] as unknown[]) ?? []),
    null,
    null,
    null,
  ],
  ...MIGRATED_COMPLETE_V16_WIRE.slice(3),
];
const MIGRATED_COMPLETE_V18_WIRE = [
  ...MIGRATED_COMPLETE_V17_WIRE.slice(0, 1),
  18,
  ...MIGRATED_COMPLETE_V17_WIRE.slice(2),
  null,
];

const {
  expertiseGrants: currentExpertiseGrants,
  character: currentCharacter,
  ...completeBeforeExpertise
} = complete;
void currentExpertiseGrants;
const {
  alignment: currentAlignment,
  appearance: currentAppearance,
  backstory: currentBackstory,
  ...characterBeforeFlavor
} = currentCharacter;
void currentAlignment;
void currentAppearance;
void currentBackstory;

const migratedComplete: CharacterShareDocument = {
  ...completeBeforeExpertise,
  character: characterBeforeFlavor,
  selections: complete.selections.map((selection) => ({
    ref: selection.ref,
    ruleKey: selection.ruleKey,
    ordinal: selection.ordinal,
    spellKey: selection.spellKey,
    ...(selection.spellName === undefined
      ? {}
      : { spellName: selection.spellName }),
    ...(selection.keep === undefined ? {} : { keep: selection.keep }),
  })),
  spellbook: [{ spellKey: '2024:shield' }],
};

const V13_ABILITY_OVERRIDE_WIRE = [
  CHARACTER_SHARE_FORMAT,
  13,
  ['V13 Override Hero', 18, null, null, null, null, null, null, null, null, null, null],
  [],
  [],
  [],
  [],
  [],
  [],
  null,
  null,
  null,
  [null, null, null],
  [null, null, null],
  [[
    'ability_override',
    'Belt of Giant Strength',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'strength',
    null,
    24,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]],
  null,
  null,
  null,
  null,
];

describe('character-share positional codec', () => {
  it('refuses the hand-authored complete version-1 positional golden BY NAME', () => {
    // D60: pre-v5 documents are RETIRED, not migrated. This fixture stays
    // frozen and unmodified — the point is that reaching this exact,
    // deliberate error proves every v1-v4 tuple check and migration still ran
    // underneath, rather than the codec breaking earlier for an unrelated
    // reason.
    expect(() => positionalToShareDocument(COMPLETE_V1_WIRE)).toThrow(
      ShareWireRetirementError,
    );
  });

  it('keeps a hand-authored complete version-5 positional golden readable', () => {
    // Through the 5→6 null-pad and the 6→7 drop: a v5 document predates
    // equipment minting, so its rows arrive with no provenance anywhere —
    // the same document it always meant.
    expect(positionalToShareDocument(COMPLETE_V5_WIRE)).toEqual(
      migratedComplete,
    );
  });

  it('keeps a hand-authored complete version-6 positional golden readable', () => {
    // Through the 6→7 drop (D69): the appended null sourceRef slots come
    // off, and the document decodes to the same plain rows.
    expect(positionalToShareDocument(COMPLETE_V6_WIRE)).toEqual(
      migratedComplete,
    );
  });

  it('keeps a hand-authored complete version-7 positional golden readable', () => {
    // Through the 7→8 null-pad (AC-1, D72): five trailing nulls on every
    // effect tuple and a trailing null root element, decoding to the same
    // document it always meant.
    expect(positionalToShareDocument(COMPLETE_V7_WIRE)).toEqual(
      migratedComplete,
    );
  });

  it('keeps a hand-authored complete version-8 positional golden readable', () => {
    expect(positionalToShareDocument(COMPLETE_V8_WIRE)).toEqual(
      migratedComplete,
    );
  });

  it('pins v18 as frozen v17 plus one appended portable-content absence', () => {
    expect(shareDocumentToPositional(complete)).toEqual(COMPLETE_V18_WIRE);
  });

  it('accepts ability_override only in a hand-frozen v13 document', () => {
    expect(positionalToShareDocument(V13_ABILITY_OVERRIDE_WIRE)).toEqual({
      format: CHARACTER_SHARE_FORMAT,
      version: CHARACTER_SHARE_VERSION,
      character: { name: 'V13 Override Hero', strength: 18 },
      classes: [],
      sources: [],
      selections: [],
      spellbook: [],
      preferences: [],
      overrides: [],
      effects: [{
        kind: 'ability_override',
        label: 'Belt of Giant Strength',
        ability: 'strength',
        maximum: 24,
      }],
    });
    const falselyVersioned = [...V13_ABILITY_OVERRIDE_WIRE];
    falselyVersioned[1] = 12;
    expect(() => positionalToShareDocument(falselyVersioned)).toThrow(
      'wire effect kind is unsupported in v12.',
    );
  });

  it('migrates v10 item booleans into exactly three slots and explicitly drops the fourth', () => {
    const v10 = new Array<unknown>(18).fill(null);
    v10[0] = CHARACTER_SHARE_FORMAT;
    v10[1] = 10;
    v10[17] = [
      ['First', null, true, true, null],
      ['Second', null, true, true, null],
      ['Third', null, true, true, null],
      ['Fourth loses attunement', null, true, true, null],
    ];

    const migrated = MIGRATIONS[10](v10) as unknown[];

    expect(migrated).toHaveLength(19);
    expect(migrated[1]).toBe(11);
    expect(migrated[17]).toEqual([
      ['First', null, true, null],
      ['Second', null, true, null],
      ['Third', null, true, null],
      ['Fourth loses attunement', null, true, null],
    ]);
    expect(migrated[18]).toEqual([0, 1, 2]);
  });

  it('migrates a v11 item without quantity to v12 quantity one', () => {
    const v11 = new Array<unknown>(19).fill(null);
    v11[0] = CHARACTER_SHARE_FORMAT;
    v11[1] = 11;
    v11[17] = [['Potion', null, false, null]];

    const migrated = MIGRATIONS[11](v11) as unknown[];

    expect(migrated).toHaveLength(19);
    expect(migrated[1]).toBe(12);
    expect(migrated[17]).toEqual([
      ['Potion', null, false, null, 1],
    ]);
  });

  it('migrates v12 to v13 without changing any existing tuple field', () => {
    const migrated = MIGRATIONS[12](COMPLETE_V12_WIRE) as unknown[];
    expect(migrated).toEqual(COMPLETE_V13_WIRE);
  });

  it('migrates v13 acquisitions through v18 without inventing later rows', () => {
    const migrated = MIGRATIONS[17](MIGRATIONS[16](MIGRATIONS[15](
      MIGRATIONS[14](MIGRATIONS[13](COMPLETE_V13_WIRE)),
    ))) as unknown[];
    expect(migrated).toEqual(MIGRATED_COMPLETE_V18_WIRE);
    expect(positionalToShareDocument(COMPLETE_V13_WIRE)).toEqual(
      migratedComplete,
    );
  });

  it('migrates a v15 document to v16 with feat choices absent, not invented', () => {
    const migrated = MIGRATIONS[15](COMPLETE_V15_WIRE) as unknown[];
    expect(migrated).toHaveLength(21);
    expect(migrated[1]).toBe(16);
    expect(migrated[20]).toBeNull();
    expect(positionalToShareDocument(COMPLETE_V15_WIRE)).not.toHaveProperty(
      'levelFeatChoices',
    );
  });

  it('v16 migrates flavor by trailing nulls only', () => {
    const migrated = MIGRATIONS[16](COMPLETE_V16_WIRE) as unknown[];
    expect(migrated).toEqual([
      COMPLETE_V16_WIRE[0],
      17,
      [...(COMPLETE_V16_WIRE[2] as unknown[]), null, null, null],
      ...COMPLETE_V16_WIRE.slice(3),
    ]);
  });

  it('accepts only an explicit feat source ref for a level-feat choice', () => {
    expect(() => validateShareDocument({
      ...complete,
      levelFeatChoices: [{
        classRef: 0,
        classLevel: 4,
        choiceKind: 'asi_level_feat',
        featRef: 0,
      }],
    })).toThrow(
      'levelFeatChoices[0].featRef is not a feat source reference.',
    );

    expect(validateShareDocument({
      ...complete,
      levelFeatChoices: [{
        classRef: 0,
        classLevel: 4,
        choiceKind: 'asi_level_feat',
        featRef: 1,
      }],
    }).levelFeatChoices).toEqual([{
      classRef: 0,
      classLevel: 4,
      choiceKind: 'asi_level_feat',
      featRef: 1,
    }]);
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
      18,
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
        null, // v3 allocation signal retained by v4: absent means never allocated.
        null, // alignment
        null, // appearance
        null, // backstory
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
      [[1, 'feat', '2024:feat:alert', null, 1, null, null]],
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
      // The sheet element, on identical terms: always written, three nulls, each
      // decoding to an absent key.
      [null, null, null],
      // Element 14, the character's own effects: always written, `null` when
      // there are none, decoding to an absent key like every section above.
      // NOT a group — effects are one section, and a nested tuple here would
      // suggest a structure they do not have.
      null,
      // Element 15: placeholders moved out of the character tuple in v2.
      null,
      // Element 16: the S-A skillGrants section (v5). `null`, not `[]`, on
      // the same terms as every other always-written, absent-decodes-to-
      // absent-key section above.
      null,
      // Element 17: the AC-1 (D72) items section (v8), on the identical terms.
      null,
      // Element 18: D92's exact three attunement positions.
      null,
      // Element 19: GF-2's expertise grant section.
      null,
      // Element 20: LU-1's durable class-level feat occurrences.
      null,
      // Element 21: HA-12 portable content, absent for this SRD-only link.
      null,
    ]);
    expect(positional).toHaveLength(22);
    expect((positional[2] as unknown[]).length).toBe(15);
    expect((positional[3] as unknown[][])[0]).toHaveLength(8);
    expect((positional[4] as unknown[][])[0]).toHaveLength(7);
    expect(positional[12]).toHaveLength(3);
    expect(positional[13]).toHaveLength(3);
    expect(minimal).not.toHaveProperty('weapons');
    expect(minimal).not.toHaveProperty('species');
    expect(minimal).not.toHaveProperty('speciesTraits');
    expect(minimal).not.toHaveProperty('background');
    expect(minimal).not.toHaveProperty('armor');
    expect(minimal).not.toHaveProperty('hitPointRolls');
    expect(minimal).not.toHaveProperty('skillProficiencies');
    expect(minimal).not.toHaveProperty('sheetAdjustment');
    expect(minimal).not.toHaveProperty('effects');
    expect(minimal).not.toHaveProperty('skillGrants');
    expect(minimal).not.toHaveProperty('items');
    expect(minimal).not.toHaveProperty('portableContent');
    await expect(
      decodeShareFragment(await encodeShareFragment(minimal)),
    ).resolves.toEqual(minimal);
  });

  it('rejects every non-version-4 character, class, and source arity', () => {
    const positional = shareDocumentToPositional(complete);
    const cases: Array<[number, number, RegExp]> = [
      [2, 14, /wire character must be a tuple of length 15/],
      [2, 16, /wire character must be a tuple of length 15/],
      [3, 7, /wire classes\[0\] must be a tuple of length 8/],
      [3, 9, /wire classes\[0\] must be a tuple of length 8/],
      [4, 6, /wire sources\[0\] must be a tuple of length 7/],
      [4, 8, /wire sources\[0\] must be a tuple of length 7/],
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
    ).rejects.toThrow(/wire character must be a tuple of length 15/);

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

  it('refuses the fragment BY NAME — pre-v5 links are retired, not migrated (D60)', async () => {
    await expect(
      decodeShareFragment(PRE_DAMAGE_UNION_FRAGMENT),
    ).rejects.toThrow(ShareWireRetirementError);
  });

  it('migrates every old primary and versatile damage state losslessly', () => {
    // The composed decode now refuses every pre-v5 link (above), but the
    // v1→v2 damage/range conversion this fixture exists to pin is still real,
    // unretired production code — reachable one step short of the deliberate
    // v4→v5 throw. Weapon field positions per `WIRE_SCHEMA_V2`: `range` is
    // index 5, `damage` is index 19, `versatile_damage` is index 20.
    const rawWire = rawPositionalFromFragment(PRE_DAMAGE_UNION_FRAGMENT);
    const migratedRoot = MIGRATIONS[1](rawWire) as unknown[];
    const weapons = migratedRoot[11] as unknown[][];
    expect(weapons.map((weapon) => weapon[19])).toEqual([
      ['dice', '1d6'],
      ['custom', 'the table decides: 2 × level'],
      ['not_recorded'],
    ]);
    expect(weapons.map((weapon) => weapon[20])).toEqual([
      ['dice', '1d8'],
      ['custom', 'double proficiency, no rounding'],
      ['not_applicable'],
    ]);
    expect(weapons.map((weapon) => weapon[5])).toEqual([
      ['none'],
      ['none'],
      ['none'],
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
    'refuses the %s v1 range fragment BY NAME, though its frozen v1→v2 migration still classifies it losslessly',
    async (_name, fragment, expectedRange) => {
      // (a) D60: the composed path refuses every pre-v5 link, by name.
      await expect(decodeShareFragment(fragment)).rejects.toThrow(
        ShareWireRetirementError,
      );
      // (b) The actual v1→v2 range conversion this fixture pins is still
      // real, unretired production code — reachable one step short of the
      // deliberate v4→v5 throw.
      const rawWire = rawPositionalFromFragment(fragment);
      const migratedRoot = MIGRATIONS[1](rawWire) as unknown[];
      const weapons = migratedRoot[11] as unknown[][];
      expect(decodeMigratedWeaponRange(weapons[0]?.[5])).toEqual(expectedRange);
    },
  );

  it.each(V1_RANGE_BOUNDARY_FRAGMENTS)(
    'refuses the v1 %s boundary fragment BY NAME, though its frozen v1→v2 migration still classifies it losslessly',
    async (_name, fragment, expectedRange) => {
      await expect(decodeShareFragment(fragment)).rejects.toThrow(
        ShareWireRetirementError,
      );
      const rawWire = rawPositionalFromFragment(fragment);
      const migratedRoot = MIGRATIONS[1](rawWire) as unknown[];
      const weapons = migratedRoot[11] as unknown[][];
      expect(decodeMigratedWeaponRange(weapons[0]?.[5])).toEqual(expectedRange);
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

  it('enforces the placeholder cap at the v5 root position', () => {
    // Retargeted to v5 (D60): a v2-tagged document now hits the deliberate
    // v4→v5 retirement throw before `decodeCurrentWire`'s own list-limit
    // check ever runs, so the cap can only be exercised, honestly, through a
    // document the composed path does not refuse. The cap check itself is
    // unmoved, unweakened production code (`assertListLimit`); only the
    // fixture's version tag changes.
    const hostile = [
      CHARACTER_SHARE_FORMAT,
      5,
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
      null,
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

  it('refuses the fragment BY NAME, though it still migrates with no sheet section at all', async () => {
    // (a) D60: refused, by name.
    await expect(decodeShareFragment(PRE_SHEET_FRAGMENT)).rejects.toThrow(
      ShareWireRetirementError,
    );
    // (b) The claim this fixture pins — the sections that existed when this
    // link was minted still arrive, and the sections that did not stay
    // ABSENT rather than becoming empty — is still true of the frozen
    // migration chain, one step short of the deliberate v4→v5 throw.
    const migratedRoot = migrateV1WireToV4(
      rawPositionalFromFragment(PRE_SHEET_FRAGMENT),
    ) as unknown[];
    const root = decodeStructural(
      migratedRoot,
      SHARE_SCHEMAS[4].tuples.root,
      'migrated root',
    );
    const character = decodeStructural(
      root.character,
      SHARE_SCHEMAS[4].tuples.character,
      'migrated character',
    );
    expect(character.name).toBe('Pre-Sheet Hero');
    const classes = (root.classes as unknown[]).map((row) =>
      decodeStructural(row, SHARE_SCHEMAS[4].tuples.class, 'migrated class')
    );
    expect(classes[0]?.classKey).toBe('2024:class:fighter');
    // The sections that DID exist when this link was minted still arrive.
    const weapons = (root.weapons as unknown[]).map(decodeMigratedWeapon);
    expect(weapons[0]?.name).toBe('Handaxe');
    expect(weapons[0]?.damage).toEqual({ kind: 'dice', dice: '1d6' });
    expect(weapons[0]?.versatile_damage).toEqual({ kind: 'not_applicable' });
    const origin = decodeMigratedOrigin(root.origin);
    expect(origin.species?.name).toBe('Dwarf');
    expect(origin.background?.name).toBe('Soldier');
    // ABSENT, NOT EMPTY. The link never said anything about the sheet
    // section (armour, rolls, skills, the adjustment) — the migrated root's
    // `sheet` slot is `null`, not a tuple of nulls.
    expect(root.sheet).toBeNull();
  });

  it('the current codec still treats an explicit null-tuple sheet the same as an absent one', () => {
    // Re-expressed at v5 (D60): "a fourteenth element of four nulls means the
    // same as no fourteenth element at all" is `decodeCurrentWire`'s own
    // absence rule, unmoved and unretired by S-A — but the composed chain no
    // longer reaches that domain-level decode for a v1-tagged document, so
    // the claim is verified directly against the CURRENT, unretired version
    // instead of through the retired migration chain (which is a structural
    // pass-through and does not itself collapse null-tuples to null — that
    // collapsing is `decodeCurrentWire`'s job, reachable only at v5).
    const migratedRoot = migrateV1WireToV4(
      rawPositionalFromFragment(PRE_SHEET_FRAGMENT),
    ) as unknown[];
    const currentWithoutSheet = [...migratedRoot];
    currentWithoutSheet[1] = CHARACTER_SHARE_VERSION;
    appendV17Flavor(currentWithoutSheet);
    appendV9SourceMarker(currentWithoutSheet);
    rewriteV14SpellAcquisitions(currentWithoutSheet);
    currentWithoutSheet.push(null); // skillGrants, absent
    currentWithoutSheet.push(null); // items, absent (AC-1, D72)
    currentWithoutSheet.push(null); // expertiseGrants, absent (GF-2)
    currentWithoutSheet.push(null); // levelFeatChoices, absent (LU-1)
    currentWithoutSheet.push(null); // portableContent, absent (HA-12)
    // NOT re-expressed at v6/v7: v6 appended a sourceRef slot to the weapon
    // tuples and v7 (D69) removed it again, so the current weapon tuple is
    // the v5 shape this migrated root already carries.
    const currentWithNullTupleSheet = [...currentWithoutSheet];
    currentWithNullTupleSheet[13] = [null, null, null];
    expect(positionalToShareDocument(currentWithNullTupleSheet)).toEqual(
      positionalToShareDocument(currentWithoutSheet),
    );
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

  it('refuses the fragment BY NAME, though it still migrates keeping the retired vocabulary readable', async () => {
    // (a) D60: refused, by name.
    await expect(decodeShareFragment(PRE_EFFECTS_FRAGMENT)).rejects.toThrow(
      ShareWireRetirementError,
    );
    // (b) THE PAYLOAD ARRIVES INTACT, on the trait rows where this link put
    // it, one step short of the deliberate v4→v5 throw. The migration chain
    // does not validate vocabulary — `importCharacterShare` does — so what
    // the document says is exactly what it said when it was minted, even
    // though `effectKinds` no longer has `granted_spells` as a member.
    const migratedRoot = migrateV1WireToV4(
      rawPositionalFromFragment(PRE_EFFECTS_FRAGMENT),
    ) as unknown[];
    const root = decodeStructural(
      migratedRoot,
      SHARE_SCHEMAS[4].tuples.root,
      'migrated root',
    );
    const character = decodeStructural(
      root.character,
      SHARE_SCHEMAS[4].tuples.character,
      'migrated character',
    );
    expect(character.name).toBe('Pre-Effects Hero');
    const origin = decodeMigratedOrigin(root.origin);
    expect(origin.species?.name).toBe('Tiefling');
    expect(origin.speciesTraits?.[0]).toMatchObject({
      name: 'Fiendish Legacy',
      // ACCEPTED, not rejected, even though `effectKinds` no longer has this
      // member. Validating a link minted last week against this week's
      // vocabulary is how you make somebody's pasted URL undecodable.
      effect_kind: 'granted_spells',
    });
    expect(origin.speciesTraits?.[1]).toMatchObject({
      effect_kind: 'hp_modifier',
      effect_hit_points_flat: 0,
      effect_hit_points_per_level: 1,
    });
    expect(origin.speciesTraits?.[2]).toMatchObject({
      effect_kind: 'damage_resistance',
      effect_damage_type: 'Poison',
    });
    // ABSENT, NOT EMPTY. The link never mentioned effects, and the migrated
    // root's `effects` slot is `null`, not an empty list — which is exactly
    // wrong, since three of its traits carry a payload.
    expect(root.effects).toBeNull();
  });

  it('migrates identically whether or not the fifteenth element is present', () => {
    // A fifteen-element tuple with a null effects slot and a fourteen-element
    // tuple must mean the same thing all the way through the frozen migration
    // chain, or a character shared today and the same character shared last
    // month would import differently the moment v5 stops retiring them.
    const migratedOld = migrateV1WireToV4(
      rawPositionalFromFragment(PRE_EFFECTS_FRAGMENT),
    );
    const migratedNew = migrateV1WireToV4([
      ...(rawPositionalFromFragment(PRE_EFFECTS_FRAGMENT) as unknown[]),
      null,
    ]);
    expect(migratedNew).toEqual(migratedOld);
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

  it('refuses the fragment BY NAME, though it still migrates as a document with no weapons section at all', async () => {
    // (a) D60: refused, by name.
    await expect(decodeShareFragment(LEGACY_FRAGMENT)).rejects.toThrow(
      ShareWireRetirementError,
    );
    // (b) The claim this fixture pins is still true one step short of the
    // deliberate v4→v5 throw.
    const migratedRoot = migrateV1WireToV4(
      rawPositionalFromFragment(LEGACY_FRAGMENT),
    ) as unknown[];
    const root = decodeStructural(
      migratedRoot,
      SHARE_SCHEMAS[4].tuples.root,
      'migrated root',
    );
    const character = decodeStructural(
      root.character,
      SHARE_SCHEMAS[4].tuples.character,
      'migrated character',
    );
    expect(character.name).toBe('Old Link Hero');
    expect(character.intelligence).toBe(16);
    const classes = (root.classes as unknown[]).map((row) =>
      decodeStructural(row, SHARE_SCHEMAS[4].tuples.class, 'migrated class')
    );
    expect(classes[0]?.classKey).toBe('2024:class:wizard');
    expect(root.spellbook).toEqual(['2024:shield']);
    // Absent, not an empty list. The link never said anything about weapons.
    expect(root.weapons).toBeNull();
  });

  /**
   * Every one of the following is re-expressed at v5 (D60): the composed
   * decode no longer reaches `decodeCurrentWire`'s own absence handling for a
   * v1-tagged document, but that handling is unmoved, unretired production
   * code, and the fixture's real subject — "a trailing section written as
   * all-nulls (or padded away entirely) means the same as it being absent" —
   * is verified directly against it. The starting point in each case is the
   * fully migrated (one step short of the v4→v5 throw), then hand-bumped to
   * v5, `LEGACY_FRAGMENT` — never anything produced by
   * `shareDocumentToPositional`.
   */
  it('a v5 document treats a null-tuple origin and sheet the same as their absence', () => {
    const migratedRoot = migrateV1WireToV4(
      rawPositionalFromFragment(LEGACY_FRAGMENT),
    ) as unknown[];
    const baseline = [...migratedRoot];
    baseline[1] = CHARACTER_SHARE_VERSION;
    appendV17Flavor(baseline);
    appendV9SourceMarker(baseline);
    rewriteV14SpellAcquisitions(baseline);
    baseline.push(null); // skillGrants
    baseline.push(null); // items (AC-1, D72)
    baseline.push(null); // expertiseGrants (GF-2)
    baseline.push(null); // levelFeatChoices (LU-1)
    baseline.push(null); // portableContent (HA-12)
    const decodedBaseline = positionalToShareDocument(baseline);

    const withNullTupleOrigin = [...baseline];
    withNullTupleOrigin[12] = [null, null, null];
    expect(positionalToShareDocument(withNullTupleOrigin)).toEqual(
      decodedBaseline,
    );

    const withNullTupleSheet = [...baseline];
    withNullTupleSheet[13] = [null, null, null];
    expect(positionalToShareDocument(withNullTupleSheet)).toEqual(
      decodedBaseline,
    );

    const withBothNullTuples = [...baseline];
    withBothNullTuples[12] = [null, null, null];
    withBothNullTuples[13] = [null, null, null];
    expect(positionalToShareDocument(withBothNullTuples)).toEqual(
      decodedBaseline,
    );
  });

  it('a v5 document with weapons but a null-tuple origin records the weapons and no origin keys', () => {
    // The intermediate format, which is what every link generated between the
    // weapons change and the origins change looked like. It must decode with
    // a `weapons` key (recorded as explicitly empty) and no origin keys at
    // all — not three empty ones.
    const migratedRoot = migrateV1WireToV4(
      rawPositionalFromFragment(LEGACY_FRAGMENT),
    ) as unknown[];
    const withWeapons = [...migratedRoot];
    withWeapons[1] = CHARACTER_SHARE_VERSION;
    appendV17Flavor(withWeapons);
    appendV9SourceMarker(withWeapons);
    rewriteV14SpellAcquisitions(withWeapons);
    withWeapons[11] = []; // weapons: explicitly recorded as none
    withWeapons.push(null); // skillGrants
    withWeapons.push(null); // items (AC-1, D72)
    withWeapons.push(null); // expertiseGrants (GF-2)
    withWeapons.push(null); // levelFeatChoices (LU-1)
    withWeapons.push(null); // portableContent (HA-12)
    const decoded = positionalToShareDocument(withWeapons);
    expect(decoded.weapons).toEqual([]);
    expect(decoded).not.toHaveProperty('species');
    expect(decoded).not.toHaveProperty('speciesTraits');
    expect(decoded).not.toHaveProperty('background');
  });

  it('a v5 document with weapons and a null-tuple origin, but no sheet section, records no sheet keys', () => {
    // Every link generated between the origins change and the sheet-inputs
    // change looks like this. It must decode with no sheet keys at all, not
    // with four empty ones: "recorded no armour" and "never carried armour"
    // are the same import here, and the absent key is what keeps them from
    // being told apart wrongly.
    const migratedRoot = migrateV1WireToV4(
      rawPositionalFromFragment(LEGACY_FRAGMENT),
    ) as unknown[];
    const withOrigin = [...migratedRoot];
    withOrigin[1] = CHARACTER_SHARE_VERSION;
    appendV17Flavor(withOrigin);
    appendV9SourceMarker(withOrigin);
    rewriteV14SpellAcquisitions(withOrigin);
    withOrigin[11] = []; // weapons: explicitly recorded as none
    withOrigin[12] = [null, null, null]; // origin: explicit null-tuple
    withOrigin.push(null); // skillGrants
    withOrigin.push(null); // items (AC-1, D72)
    withOrigin.push(null); // expertiseGrants (GF-2)
    withOrigin.push(null); // levelFeatChoices (LU-1)
    withOrigin.push(null); // portableContent (HA-12)
    const decoded = positionalToShareDocument(withOrigin);
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

  it.each(frozen)(
    'refuses the %s fragment BY NAME, though its migrated character still carries no note',
    async (_name, fragment) => {
      // (a) D60: refused, by name.
      await expect(decodeShareFragment(fragment)).rejects.toThrow(
        ShareWireRetirementError,
      );
      // (b) ABSENT, NOT EMPTY AND NOT NULL, one step short of the deliberate
      // v4→v5 throw. The link never said anything about a note, and any
      // present value would be this build inventing one.
      const migratedRoot = migrateV1WireToV4(
        rawPositionalFromFragment(fragment),
      ) as unknown[];
      const root = decodeStructural(
        migratedRoot,
        SHARE_SCHEMAS[4].tuples.root,
        'migrated root',
      );
      const character = decodeStructural(
        root.character,
        SHARE_SCHEMAS[4].tuples.character,
        'migrated character',
      );
      expect(character.notes).toBeNull();
    },
  );

  it('migrates identically whether or not the twelfth CHARACTER element is present', () => {
    // A twelve-element character with a `null` note and an eleven-element one
    // must mean the same thing all the way through the frozen migration
    // chain, or a character shared today and the same character shared last
    // month would import differently the moment v5 stops retiring them.
    const rawWire = rawPositionalFromFragment(LEGACY_FRAGMENT) as unknown[];
    const migratedOld = migrateV1WireToV4(rawWire);
    const padded = [...rawWire];
    padded[2] = [...(rawWire[2] as unknown[]), null];
    const migratedNew = migrateV1WireToV4(padded);
    expect(migratedNew).toEqual(migratedOld);
  });

  it('a v5 document still reads the twelfth CHARACTER element when a link actually carries one', () => {
    // The other direction, and the reason the padding test above is not
    // enough on its own: an element that is accepted and then ignored would
    // pass it. Re-expressed at v5 (D60): the composed chain no longer reaches
    // `decodeCurrentWire` for a v1-tagged document, so the final document
    // shape is checked directly against the current, unretired version.
    const rawWire = rawPositionalFromFragment(LEGACY_FRAGMENT) as unknown[];
    const withNote = [...rawWire];
    withNote[2] = [
      ...(rawWire[2] as unknown[]),
      'Sent on purpose, by a sharer who opted in.',
    ];
    const migratedRoot = migrateV1WireToV4(withNote) as unknown[];
    migratedRoot[1] = CHARACTER_SHARE_VERSION;
    appendV17Flavor(migratedRoot);
    appendV9SourceMarker(migratedRoot);
    rewriteV14SpellAcquisitions(migratedRoot);
    migratedRoot.push(null); // skillGrants
    migratedRoot.push(null); // items (AC-1, D72)
    migratedRoot.push(null); // expertiseGrants (GF-2)
    migratedRoot.push(null); // levelFeatChoices (LU-1)
    migratedRoot.push(null); // portableContent (HA-12)
    const decoded = positionalToShareDocument(migratedRoot);
    expect(decoded.character.notes).toBe(
      'Sent on purpose, by a sharer who opted in.',
    );
    // ...and nothing before it moved. `placeholders` sits at a different
    // ROOT position entirely and is the element an inserted — rather than
    // appended — note would have shifted.
    expect(decoded.character.name).toBe('Old Link Hero');
    expect(decoded.character.intelligence).toBe(16);
    expect(decoded).not.toHaveProperty('placeholders');
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
