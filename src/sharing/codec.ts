import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  SHARE_ARMOR_ENUMS,
  SHARE_ARMOR_FLAGS,
  SHARE_ARMOR_NUMBERS,
  SHARE_BACKGROUND_TEXT,
  SHARE_EFFECT_NUMBERS,
  SHARE_EFFECT_TEXT,
  SHARE_LIMITS,
  SHARE_SPECIES_TEXT,
  SHARE_SPECIES_TRAIT_NUMBERS,
  SHARE_SPECIES_TRAIT_TEXT,
  SHARE_WEAPON_FLAGS,
  SHARE_WEAPON_TEXT,
  ShareValidationError,
  type CharacterShareDocument,
  type ShareArmor,
  type ShareBackground,
  type ShareEffect,
  type ShareHitPointRoll,
  type ShareSheetAdjustment,
  type ShareSpecies,
  type ShareSpeciesTrait,
  type ShareWeapon,
  validateShareDocument,
} from './schema';

type Tuple = readonly unknown[];

/**
 * THE ROOT TUPLE HAS FIVE ACCEPTED LENGTHS, AND THAT IS ON PURPOSE.
 *
 * A share link is a URL fragment somebody has already pasted into a chat, a
 * wiki or a bookmark. Appending an element while demanding an exact length would
 * make every one of those links a decode error — the exact data loss this
 * arrangement exists to prevent, inflicted on a larger set of people.
 *
 * So eleven elements is still a valid document carrying no weapons, no origin
 * and no sheet inputs; twelve carries weapons and neither of the other two;
 * thirteen adds the origin; fourteen adds the sheet inputs; fifteen is what
 * this build writes. `CHARACTER_SHARE_VERSION` deliberately stays at 1: a
 * version bump buys nothing here and would reject every old link on the way in.
 *
 * THE FIFTEENTH ELEMENT IS THE CHARACTER'S EFFECTS, AND IT IS A ROOT ELEMENT
 * RATHER THAN A FOURTH SLOT IN THE ORIGIN GROUP. Effects are no longer
 * species-scoped — that severance is the whole point of the inversion — so
 * nesting them under the origin would re-create the coupling being removed, and
 * it would change what element 13 means for links already in the wild.
 *
 * The growth is the ESTABLISHED move here, not a format break: this format has
 * already grown 11 -> 12 -> 13 -> 14 with the version pinned, and the frozen
 * hand-built fixtures in `tests/unit/sharing/codec.test.ts` are what prove each
 * older length still decodes rather than merely asserting it.
 *
 * THE ORIGIN IS ONE ELEMENT, NOT THREE, AND THE SHEET IS ONE ELEMENT, NOT FOUR.
 * Three sections travel in the first and four in the second, but each group is a
 * single nested tuple so the root grows by one per FEATURE rather than one per
 * table. The members are independently nullable inside their group, which is
 * what the document type needs. Effects need no group: they are one section.
 */
const ROOT_TUPLE_LENGTHS = [11, 12, 13, 14, 15] as const;

const LEGACY_ROOT_LENGTH = 11;
const PRE_ORIGIN_ROOT_LENGTH = 12;
const PRE_SHEET_ROOT_LENGTH = 13;
const PRE_EFFECTS_ROOT_LENGTH = 14;

/**
 * How many elements the grouped sheet element holds: armour, hit point rolls,
 * skill proficiencies, the manual adjustment.
 */
const SHEET_TUPLE_LENGTH = 4;

/** One worn item and one held item — `character_armor`'s own cardinality. */
const ARMOR_SLOT_COUNT = 2;

/** How many elements the grouped origin element holds. */
const ORIGIN_TUPLE_LENGTH = 3;

/** How many elements one species, trait and background occupy on the wire. */
const SPECIES_TUPLE_LENGTH = 1 + SHARE_SPECIES_TEXT.length + 1;
const SPECIES_TRAIT_TUPLE_LENGTH =
  1 + SHARE_SPECIES_TRAIT_TEXT.length + SHARE_SPECIES_TRAIT_NUMBERS.length;
const BACKGROUND_TUPLE_LENGTH = 1 + SHARE_BACKGROUND_TEXT.length;

/**
 * How many elements one effect occupies on the wire: kind, label, payload, then
 * the two provenance slots — the ref and the flag that says which of the two
 * roots that ref minted.
 */
const EFFECT_TUPLE_LENGTH =
  2 + SHARE_EFFECT_TEXT.length + SHARE_EFFECT_NUMBERS.length + 2;

/** How many elements one armour row, one roll and the adjustment occupy. */
const ARMOR_TUPLE_LENGTH =
  1 + SHARE_ARMOR_ENUMS.length + 1 + SHARE_ARMOR_NUMBERS.length +
  SHARE_ARMOR_FLAGS.length + 1;
const HIT_POINT_ROLL_TUPLE_LENGTH = 3;
const SHEET_ADJUSTMENT_TUPLE_LENGTH = 2;

/**
 * How many elements one weapon occupies on the wire — BOTH LENGTHS.
 *
 * THE WEAPON TUPLE HAD NO BACKWARD TOLERANCE AND NEEDED IT. `weaponFromPositional`
 * used the exact-length `tuple()`, unlike the document level, which has used
 * `variableTuple()` since links existed. So adding D27's `proficiency_category`
 * to `ShareWeapon` would have made EVERY EXISTING LINK CONTAINING A WEAPON fail
 * to decode — the data-loss failure AGENTS.md names, on links already sent, and
 * nothing in the suite covered it because the frozen-fragment guards D24
 * describes cover the DOCUMENT tuple and not this one.
 *
 * THE ANSWER IS THE ONE THE DOCUMENT ALREADY USES: accept both arities and read
 * the new field only when it is there. `LEGACY` is the arity every link minted
 * before D27 has; `CURRENT` is one longer.
 *
 * THE NEW FIELD IS APPENDED, NOT INSERTED, and that is not cosmetic. The wire
 * order IS the format: putting the category after `name` would shift all
 * eighteen fields that follow it, so an old link would decode its damage dice
 * into its damage type and import a plausible, silently wrong weapon. Appended,
 * an old link's every index still means what it meant.
 */
const WEAPON_TUPLE_LENGTH_LEGACY =
  1 + SHARE_WEAPON_TEXT.length + 3 + 2 + SHARE_WEAPON_FLAGS.length;
const WEAPON_TUPLE_LENGTH = WEAPON_TUPLE_LENGTH_LEGACY + 1;
const WEAPON_TUPLE_LENGTHS: readonly number[] = [
  WEAPON_TUPLE_LENGTH_LEGACY,
  WEAPON_TUPLE_LENGTH,
];

function tuple(
  value: unknown,
  length: number,
  label: string,
): Tuple {
  if (!Array.isArray(value) || value.length !== length) {
    throw new ShareValidationError(
      `${label} must be a tuple of length ${length}.`,
    );
  }
  return value;
}

function variableTuple(
  value: unknown,
  lengths: readonly number[],
  label: string,
): Tuple {
  if (!Array.isArray(value) || !lengths.includes(value.length)) {
    throw new ShareValidationError(
      `${label} must be a tuple of length ${lengths.join(' or ')}.`,
    );
  }
  return value;
}

/**
 * A weapon's wire order, frozen.
 *
 * Positional encoding trades self-description for size, so the order is part of
 * the format: name, the four short text columns, the two ranges, the mastery
 * property, the two long free-text columns, the nine flags, and — appended by
 * D27 — the proficiency category. Reordering this silently reinterprets every
 * link ever generated.
 */
const WEAPON_WIRE_FIELDS = [
  ...SHARE_WEAPON_TEXT,
  'range_normal_feet',
  'range_long_feet',
  'mastery_property',
  'other_properties',
  'notes',
  ...SHARE_WEAPON_FLAGS,
  // LAST, AND IT MUST STAY LAST. Everything before it is the frozen order every
  // pre-D27 link was written in; an appended field is invisible to a decoder
  // that stops one element earlier.
  'proficiency_category',
] as const satisfies readonly (keyof ShareWeapon)[];

function weaponToPositional(weapon: ShareWeapon): unknown[] {
  return [
    weapon.name,
    ...WEAPON_WIRE_FIELDS.map((field) => weapon[field] ?? null),
  ];
}

function weaponFromPositional(value: unknown, label: string): unknown {
  const row = variableTuple(value, WEAPON_TUPLE_LENGTHS, label);
  const weapon: Record<string, unknown> = { name: row[0] };
  WEAPON_WIRE_FIELDS.forEach((field, index) => {
    const item = row[index + 1];
    // `undefined` is a SHORT TUPLE — a link minted before D27 — and `null` is a
    // column this weapon genuinely has nothing in. Both leave the key absent,
    // which is what `ShareWeapon` optionality means, so the two cases need no
    // separate branch and neither can invent a value.
    if (item !== null && item !== undefined) {
      weapon[field] = item;
    }
  });
  return weapon;
}

/**
 * The origin's wire order, frozen. Reordering any of these three silently
 * reinterprets every link generated after this build.
 *
 * `speciesTraits` carries no sort order: ARRAY POSITION is the printed order.
 */
function speciesToPositional(species: ShareSpecies): unknown[] {
  return [
    species.name,
    ...SHARE_SPECIES_TEXT.map((field) => species[field] ?? null),
    species.base_speed_feet ?? null,
  ];
}

function speciesTraitToPositional(trait: ShareSpeciesTrait): unknown[] {
  return [
    trait.name,
    ...SHARE_SPECIES_TRAIT_TEXT.map((field) => trait[field] ?? null),
    ...SHARE_SPECIES_TRAIT_NUMBERS.map((field) => trait[field] ?? null),
  ];
}

/**
 * An effect's wire order, frozen. `kind` leads because it is what decides how
 * the payload is read, and `label` follows it because every other section in
 * this format leads with the thing a reader would call the row. The two
 * PROVENANCE slots go last, ref then flag: they are the only references here,
 * and keeping them at the end means a future payload column appends in front of
 * them rather than displacing them.
 *
 * `sourceSubclass` rides in its own slot rather than being folded into the ref
 * (a negative ref, a second numbering) because the ref space is shared with
 * `selections[].ref` and re-encoding it here would give one number two readings.
 */
function effectToPositional(effect: ShareEffect): unknown[] {
  return [
    effect.kind,
    effect.label,
    ...SHARE_EFFECT_TEXT.map((field) => effect[field] ?? null),
    ...SHARE_EFFECT_NUMBERS.map((field) => effect[field] ?? null),
    effect.sourceRef ?? null,
    effect.sourceSubclass ?? null,
  ];
}

function effectFromPositional(value: unknown, label: string): unknown {
  const row = tuple(value, EFFECT_TUPLE_LENGTH, label);
  const effect: Record<string, unknown> = { kind: row[0], label: row[1] };
  const fields = [
    ...SHARE_EFFECT_TEXT,
    ...SHARE_EFFECT_NUMBERS,
    'sourceRef',
    'sourceSubclass',
  ] as const;
  fields.forEach((field, index) => {
    const item = row[index + 2];
    if (item !== null) {
      effect[field] = item;
    }
  });
  return effect;
}

function backgroundToPositional(background: ShareBackground): unknown[] {
  return [
    background.name,
    ...SHARE_BACKGROUND_TEXT.map((field) => background[field] ?? null),
  ];
}

/**
 * The sheet inputs' wire order, frozen. Reordering any of these silently
 * reinterprets every link generated after this build.
 *
 * `name` leads an armour row the way it leads a weapon and a species, so the
 * three read the same way; the enums follow because they are what decide how
 * the numbers are read.
 */
function armorToPositional(armor: ShareArmor): unknown[] {
  return [
    armor.name,
    ...SHARE_ARMOR_ENUMS.map((field) => armor[field]),
    armor.armor_class,
    ...SHARE_ARMOR_NUMBERS.map((field) => armor[field] ?? null),
    ...SHARE_ARMOR_FLAGS.map((flag) => armor[flag] ?? null),
    armor.notes ?? null,
  ];
}

function armorFromPositional(value: unknown, label: string): unknown {
  const row = tuple(value, ARMOR_TUPLE_LENGTH, label);
  const armor: Record<string, unknown> = { name: row[0] };
  const fields = [
    ...SHARE_ARMOR_ENUMS,
    'armor_class',
    ...SHARE_ARMOR_NUMBERS,
    ...SHARE_ARMOR_FLAGS,
    'notes',
  ] as const;
  fields.forEach((field, index) => {
    const item = row[index + 1];
    if (item !== null) {
      armor[field] = item;
    }
  });
  return armor;
}

function hitPointRollToPositional(roll: ShareHitPointRoll): unknown[] {
  return [roll.className, roll.classLevel, roll.value];
}

function hitPointRollFromPositional(value: unknown, label: string): unknown {
  const row = tuple(value, HIT_POINT_ROLL_TUPLE_LENGTH, label);
  return { className: row[0], classLevel: row[1], value: row[2] };
}

function sheetAdjustmentToPositional(
  adjustment: ShareSheetAdjustment,
): unknown[] {
  return [adjustment.value, adjustment.note ?? null];
}

function sheetAdjustmentFromPositional(
  value: unknown,
  label: string,
): unknown {
  const row = tuple(value, SHEET_ADJUSTMENT_TUPLE_LENGTH, label);
  const adjustment: Record<string, unknown> = { value: row[0] };
  if (row[1] !== null) {
    adjustment.note = row[1];
  }
  return adjustment;
}

function fromPositional(
  value: unknown,
  length: number,
  fields: readonly string[],
  label: string,
): Record<string, unknown> {
  const row = tuple(value, length, label);
  const result: Record<string, unknown> = { name: row[0] };
  fields.forEach((field, index) => {
    const item = row[index + 1];
    if (item !== null) {
      result[field] = item;
    }
  });
  return result;
}

function assertListLimit(
  value: readonly unknown[],
  maximum: number,
  label: string,
): void {
  if (value.length > maximum) {
    throw new ShareValidationError(
      `${label} exceeds the maximum count of ${maximum}.`,
    );
  }
}

function nullable<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

export function shareDocumentToPositional(
  input: CharacterShareDocument,
): unknown[] {
  const document = validateShareDocument(input);
  const character = document.character;
  return [
    CHARACTER_SHARE_FORMAT,
    CHARACTER_SHARE_VERSION,
    [
      character.name,
      character.strength ?? null,
      character.dexterity ?? null,
      character.constitution ?? null,
      character.intelligence ?? null,
      character.wisdom ?? null,
      character.charisma ?? null,
      character.proficiency_bonus_override ?? null,
      character.rules_edition_preference ?? null,
      character.allow_legacy ?? null,
      document.placeholders?.map((row) => [
        row.spellKey,
        row.spellName,
      ]) ?? null,
    ],
    document.classes.map((row) => [
      row.id,
      row.classKey,
      row.subclassKey ?? null,
      row.level,
      row.start,
      row.ability ?? null,
      row.config ?? null,
      row.subclassConfig ?? null,
    ]),
    document.sources.map((row) => [
      row.id,
      row.type,
      row.key,
      row.config ?? null,
      row.acquired,
      row.name ?? null,
    ]),
    document.selections.map((row) => [
      row.ref,
      row.ruleKey,
      row.ordinal,
      row.spellKey,
      row.spellName ?? null,
      row.keep ?? null,
    ]),
    [...document.spellbook],
    document.preferences.map((row) => [
      row.spellKey,
      row.favourite,
    ]),
    document.overrides.map((row) => [row.ruleKey, row.value]),
    document.acknowledgements?.map((row) => [row.warning]) ?? null,
    document.loadouts?.map((row) => [
      row.name,
      row.entries.map((entry) => [entry.spellKey, entry.role]),
    ]) ?? null,
    // Element 11. Always written, `null` when the character has no weapons, so
    // this build's output has one shape rather than two.
    document.weapons?.map(weaponToPositional) ?? null,
    // Element 12, on the same terms: always written, and `null` in each of its
    // three slots when the character has no species, no traits or no background.
    [
      document.species === undefined
        ? null
        : speciesToPositional(document.species),
      document.speciesTraits?.map(speciesTraitToPositional) ?? null,
      document.background === undefined
        ? null
        : backgroundToPositional(document.background),
    ],
    // Element 13, the SHEET group, on the same terms as the origin group:
    // always written, and `null` in each of its four slots when the character
    // recorded nothing of that kind.
    [
      document.armor?.map(armorToPositional) ?? null,
      document.hitPointRolls?.map(hitPointRollToPositional) ?? null,
      document.skillProficiencies === undefined
        ? null
        : [...document.skillProficiencies],
      document.sheetAdjustment === undefined
        ? null
        : sheetAdjustmentToPositional(document.sheetAdjustment),
    ],
    // Element 14, the character's own EFFECTS. Always written, `null` when the
    // character has none, so this build's output has one shape rather than two.
    document.effects?.map(effectToPositional) ?? null,
  ];
}

export function positionalToShareDocument(
  input: unknown,
): CharacterShareDocument {
  const root = variableTuple(input, ROOT_TUPLE_LENGTHS, 'wire document');
  // An eleven-element document predates weapons. `undefined`, not `null`: the
  // section is genuinely absent, and the object validator distinguishes the two.
  const wireWeapons =
    root.length === LEGACY_ROOT_LENGTH ? null : root[11];
  // Eleven or twelve elements both predate the origin. `null` rather than a
  // three-element tuple of nulls, so the three sections stay genuinely ABSENT
  // and the object validator can tell "carried none" from "never carried".
  const wireOrigin =
    root.length === LEGACY_ROOT_LENGTH ||
    root.length === PRE_ORIGIN_ROOT_LENGTH
      ? null
      : tuple(root[12], ORIGIN_TUPLE_LENGTH, 'wire origin');
  // Eleven, twelve and thirteen elements all predate the sheet inputs. `null`
  // rather than a four-element tuple of nulls, so the four sections stay
  // genuinely ABSENT and the object validator can tell "recorded none" from
  // "never carried any" — the difference between importing a character with no
  // armour and importing a link that never mentioned armour.
  const wireSheet =
    root.length === LEGACY_ROOT_LENGTH ||
    root.length === PRE_ORIGIN_ROOT_LENGTH ||
    root.length === PRE_SHEET_ROOT_LENGTH
      ? null
      : tuple(root[13], SHEET_TUPLE_LENGTH, 'wire sheet');
  // Eleven through fourteen elements all predate the effect model. `null`
  // rather than an empty list, so the section stays genuinely ABSENT and the
  // object validator can tell "carried none" from "never carried any" — the
  // difference between importing a character with no effects and importing a
  // link whose effects are still written on its trait rows, which is exactly
  // what `splitLegacyTraitEffect` then migrates.
  const wireEffects =
    root.length === LEGACY_ROOT_LENGTH ||
    root.length === PRE_ORIGIN_ROOT_LENGTH ||
    root.length === PRE_SHEET_ROOT_LENGTH ||
    root.length === PRE_EFFECTS_ROOT_LENGTH
      ? null
      : root[14];
  if (root[0] !== CHARACTER_SHARE_FORMAT) {
    throw new ShareValidationError('format is unsupported.');
  }
  if (root[1] !== CHARACTER_SHARE_VERSION) {
    throw new ShareValidationError('version is unsupported.');
  }
  const character = tuple(root[2], 11, 'wire character');
  if (!Array.isArray(root[3])) {
    throw new ShareValidationError('wire classes must be a list.');
  }
  if (!Array.isArray(root[4])) {
    throw new ShareValidationError('wire sources must be a list.');
  }
  if (!Array.isArray(root[5])) {
    throw new ShareValidationError('wire selections must be a list.');
  }
  if (!Array.isArray(root[6])) {
    throw new ShareValidationError('wire spellbook must be a list.');
  }
  if (!Array.isArray(root[7])) {
    throw new ShareValidationError('wire preferences must be a list.');
  }
  if (!Array.isArray(root[8])) {
    throw new ShareValidationError('wire overrides must be a list.');
  }
  if (root[9] !== null && !Array.isArray(root[9])) {
    throw new ShareValidationError(
      'wire acknowledgements must be null or a list.',
    );
  }
  if (root[10] !== null && !Array.isArray(root[10])) {
    throw new ShareValidationError('wire loadouts must be null or a list.');
  }
  if (wireWeapons !== null && !Array.isArray(wireWeapons)) {
    throw new ShareValidationError('wire weapons must be null or a list.');
  }
  assertListLimit(root[3], SHARE_LIMITS.classes, 'classes');
  assertListLimit(root[4], SHARE_LIMITS.sources, 'sources');
  assertListLimit(root[5], SHARE_LIMITS.selections, 'selections');
  assertListLimit(root[6], SHARE_LIMITS.spellbook, 'spellbook');
  assertListLimit(root[7], SHARE_LIMITS.preferences, 'preferences');
  assertListLimit(root[8], SHARE_LIMITS.overrides, 'overrides');
  if (root[9] !== null) {
    assertListLimit(
      root[9],
      SHARE_LIMITS.acknowledgements,
      'acknowledgements',
    );
  }
  if (root[10] !== null) {
    assertListLimit(root[10], SHARE_LIMITS.loadouts, 'loadouts');
  }
  if (wireWeapons !== null) {
    assertListLimit(wireWeapons, SHARE_LIMITS.weapons, 'weapons');
  }
  if (wireEffects !== null) {
    if (!Array.isArray(wireEffects)) {
      throw new ShareValidationError('wire effects must be null or a list.');
    }
    assertListLimit(wireEffects, SHARE_LIMITS.effects, 'effects');
  }
  if (wireSheet !== null) {
    const lists = [
      // Two, because there are two slots and the schema's unique index says so.
      // The object validator then names the duplicate slot; this only stops a
      // hostile document spending the decompressed budget before it gets there.
      ['armor', wireSheet[0], ARMOR_SLOT_COUNT],
      ['hitPointRolls', wireSheet[1], SHARE_LIMITS.hitPointRolls],
      ['skillProficiencies', wireSheet[2], SHARE_LIMITS.skillProficiencies],
    ] as const;
    for (const [name, value, maximum] of lists) {
      if (value === null) {
        continue;
      }
      if (!Array.isArray(value)) {
        throw new ShareValidationError(
          `wire ${name} must be null or a list.`,
        );
      }
      assertListLimit(value, maximum, name);
    }
  }
  if (wireOrigin !== null) {
    if (wireOrigin[1] !== null && !Array.isArray(wireOrigin[1])) {
      throw new ShareValidationError(
        'wire speciesTraits must be null or a list.',
      );
    }
    if (Array.isArray(wireOrigin[1])) {
      assertListLimit(
        wireOrigin[1],
        SHARE_LIMITS.speciesTraits,
        'speciesTraits',
      );
    }
  }
  if (character[10] !== null) {
    if (!Array.isArray(character[10])) {
      throw new ShareValidationError(
        'wire placeholders must be a list.',
      );
    }
    assertListLimit(
      character[10],
      SHARE_LIMITS.placeholders,
      'placeholders',
    );
  }

  const raw: Record<string, unknown> = {
    format: root[0],
    version: root[1],
    character: {
      name: character[0],
      ...(nullable(character[1]) === undefined
        ? {}
        : { strength: character[1] }),
      ...(nullable(character[2]) === undefined
        ? {}
        : { dexterity: character[2] }),
      ...(nullable(character[3]) === undefined
        ? {}
        : { constitution: character[3] }),
      ...(nullable(character[4]) === undefined
        ? {}
        : { intelligence: character[4] }),
      ...(nullable(character[5]) === undefined
        ? {}
        : { wisdom: character[5] }),
      ...(nullable(character[6]) === undefined
        ? {}
        : { charisma: character[6] }),
      ...(nullable(character[7]) === undefined
        ? {}
        : { proficiency_bonus_override: character[7] }),
      ...(nullable(character[8]) === undefined
        ? {}
        : { rules_edition_preference: character[8] }),
      ...(nullable(character[9]) === undefined
        ? {}
        : { allow_legacy: character[9] }),
    },
    classes: root[3].map((value, index) => {
      const row = tuple(value, 8, `wire classes[${index}]`);
      return {
        id: row[0],
        classKey: row[1],
        ...(row[2] === null ? {} : { subclassKey: row[2] }),
        level: row[3],
        start: row[4],
        ...(row[5] === null ? {} : { ability: row[5] }),
        ...(row[6] === null ? {} : { config: row[6] }),
        ...(row[7] === null
          ? {}
          : { subclassConfig: row[7] }),
      };
    }),
    sources: root[4].map((value, index) => {
      const row = tuple(value, 6, `wire sources[${index}]`);
      return {
        id: row[0],
        type: row[1],
        key: row[2],
        ...(row[3] === null ? {} : { config: row[3] }),
        acquired: row[4],
        ...(row[5] === null ? {} : { name: row[5] }),
      };
    }),
    selections: root[5].map((value, index) => {
      const row = tuple(value, 6, `wire selections[${index}]`);
      return {
        ref: row[0],
        ruleKey: row[1],
        ordinal: row[2],
        spellKey: row[3],
        ...(row[4] === null ? {} : { spellName: row[4] }),
        ...(row[5] === null ? {} : { keep: row[5] }),
      };
    }),
    spellbook: [...root[6]],
    preferences: root[7].map((value, index) => {
      const row = tuple(value, 2, `wire preferences[${index}]`);
      return { spellKey: row[0], favourite: row[1] };
    }),
    overrides: root[8].map((value, index) => {
      const row = tuple(value, 2, `wire overrides[${index}]`);
      return { ruleKey: row[0], value: row[1] };
    }),
  };
  if (root[9] !== null) {
    raw.acknowledgements = root[9].map((value, index) => {
      const row = tuple(
        value,
        1,
        `wire acknowledgements[${index}]`,
      );
      return { warning: row[0] };
    });
  }
  if (root[10] !== null) {
    raw.loadouts = root[10].map((value, index) => {
      const row = tuple(value, 2, `wire loadouts[${index}]`);
      if (!Array.isArray(row[1])) {
        throw new ShareValidationError(
          `wire loadouts[${index}].entries must be a list.`,
        );
      }
      return {
        name: row[0],
        entries: row[1].map((entry, entryIndex) => {
          const entryRow = tuple(
            entry,
            2,
            `wire loadouts[${index}].entries[${entryIndex}]`,
          );
          return { spellKey: entryRow[0], role: entryRow[1] };
        }),
      };
    });
  }
  if (character[10] !== null) {
    raw.placeholders = character[10].map((value, index) => {
      const row = tuple(value, 2, `wire placeholders[${index}]`);
      return { spellKey: row[0], spellName: row[1] };
    });
  }
  if (wireWeapons !== null) {
    raw.weapons = wireWeapons.map((value, index) =>
      weaponFromPositional(value, `wire weapons[${index}]`),
    );
  }
  if (wireOrigin !== null) {
    if (wireOrigin[0] !== null) {
      raw.species = fromPositional(
        wireOrigin[0],
        SPECIES_TUPLE_LENGTH,
        [...SHARE_SPECIES_TEXT, 'base_speed_feet'],
        'wire species',
      );
    }
    if (Array.isArray(wireOrigin[1])) {
      raw.speciesTraits = wireOrigin[1].map((value, index) =>
        fromPositional(
          value,
          SPECIES_TRAIT_TUPLE_LENGTH,
          [...SHARE_SPECIES_TRAIT_TEXT, ...SHARE_SPECIES_TRAIT_NUMBERS],
          `wire speciesTraits[${index}]`,
        ),
      );
    }
    if (wireOrigin[2] !== null) {
      raw.background = fromPositional(
        wireOrigin[2],
        BACKGROUND_TUPLE_LENGTH,
        [...SHARE_BACKGROUND_TEXT],
        'wire background',
      );
    }
  }
  if (wireSheet !== null) {
    if (Array.isArray(wireSheet[0])) {
      raw.armor = wireSheet[0].map((value, index) =>
        armorFromPositional(value, `wire armor[${index}]`),
      );
    }
    if (Array.isArray(wireSheet[1])) {
      raw.hitPointRolls = wireSheet[1].map((value, index) =>
        hitPointRollFromPositional(value, `wire hitPointRolls[${index}]`),
      );
    }
    if (Array.isArray(wireSheet[2])) {
      raw.skillProficiencies = [...wireSheet[2]];
    }
    if (wireSheet[3] !== null) {
      raw.sheetAdjustment = sheetAdjustmentFromPositional(
        wireSheet[3],
        'wire sheetAdjustment',
      );
    }
  }
  if (Array.isArray(wireEffects)) {
    raw.effects = wireEffects.map((value, index) =>
      effectFromPositional(value, `wire effects[${index}]`),
    );
  }
  return validateShareDocument(raw);
}

function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    result += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(result);
}

function base64ToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) {
    throw new ShareValidationError('fragment is not valid base64url.');
  }
  const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(
    Math.ceil(value.length / 4) * 4,
    '=',
  );
  let decoded: string;
  try {
    decoded = atob(padded);
  } catch {
    throw new ShareValidationError('fragment is not valid base64url.');
  }
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function collectStream(
  stream: ReadableStream<Uint8Array>,
  maximum: number,
  label: string,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      length += result.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new ShareValidationError(
          `${label} exceeds the ${maximum}-byte limit.`,
        );
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

function assertJsonNesting(text: string): void {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const character of text) {
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        quoted = false;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === '[' || character === '{') {
      depth += 1;
      if (depth > 16) {
        throw new ShareValidationError(
          'wire document exceeds maximum nesting.',
        );
      }
    } else if (character === ']' || character === '}') {
      depth -= 1;
      if (depth < 0) {
        throw new ShareValidationError('wire document is malformed.');
      }
    }
  }
}

export function encodeShareFragment(
  document: CharacterShareDocument,
): Promise<string> {
  const json = JSON.stringify(shareDocumentToPositional(document));
  const input = new TextEncoder().encode(json);
  if (input.byteLength > SHARE_LIMITS.decompressedBytes) {
    throw new ShareValidationError(
      `wire document exceeds the ${SHARE_LIMITS.decompressedBytes}-byte limit.`,
    );
  }
  const stream = new Blob([input])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return collectStream(
    stream,
    SHARE_LIMITS.compressedBytes,
    'compressed document',
  ).then((compressed) => {
    const encoded = bytesToBase64(compressed)
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/g, '');
    if (encoded.length > SHARE_LIMITS.encodedCharacters) {
      throw new ShareValidationError(
        `fragment exceeds the ${SHARE_LIMITS.encodedCharacters}-character limit.`,
      );
    }
    return encoded;
  });
}

export async function decodeShareFragment(
  fragment: string,
): Promise<CharacterShareDocument> {
  const encoded = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  if (encoded.length > SHARE_LIMITS.encodedCharacters) {
    throw new ShareValidationError(
      `fragment exceeds the ${SHARE_LIMITS.encodedCharacters}-character limit.`,
    );
  }
  const compressed = base64ToBytes(encoded);
  if (compressed.byteLength > SHARE_LIMITS.compressedBytes) {
    throw new ShareValidationError(
      `compressed document exceeds the ${SHARE_LIMITS.compressedBytes}-byte limit.`,
    );
  }
  let decompressed: Uint8Array;
  try {
    decompressed = await collectStream(
      new Blob([new Uint8Array(compressed).buffer])
        .stream()
        .pipeThrough(new DecompressionStream('gzip')),
      SHARE_LIMITS.decompressedBytes,
      'decompressed document',
    );
  } catch (error) {
    if (error instanceof ShareValidationError) {
      throw error;
    }
    throw new ShareValidationError('fragment is not valid gzip data.');
  }
  let json: string;
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(
      decompressed,
    );
  } catch {
    throw new ShareValidationError('wire document is not valid UTF-8.');
  }
  assertJsonNesting(json);
  let positional: unknown;
  try {
    positional = JSON.parse(json);
  } catch {
    throw new ShareValidationError('wire document is not valid JSON.');
  }
  return positionalToShareDocument(positional);
}
