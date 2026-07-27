import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  SHARE_LIMITS,
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
import {
  versatileWeaponDamageFromLegacy,
  weaponDamageFromLegacy,
  type VersatileWeaponDamage,
  type WeaponDamage,
} from '../domain/weapon-damage';
import {
  CURRENT_CHARACTER_SHARE_VERSION,
  SHARE_SCHEMAS,
  type WireField,
} from './wire-schemas';

type Tuple = readonly unknown[];

const WIRE_SCHEMA = SHARE_SCHEMAS[CURRENT_CHARACTER_SHARE_VERSION];

function fieldKeys<Key extends string>(
  fields: readonly WireField<Key>[],
): readonly Key[] {
  return fields.map((field) => field.key);
}

function fieldIndex<Key extends string>(
  fields: readonly WireField<Key>[],
  key: Key,
): number {
  const index = fields.findIndex((field) => field.key === key);
  if (index < 0) {
    throw new Error(`Wire schema has no ${key} field.`);
  }
  return index;
}

function objectToPositional<T, Key extends keyof T & string>(
  value: T,
  fields: readonly WireField<Key>[],
): unknown[] {
  return fields.map((field) => value[field.key] ?? null);
}

const ROOT_TUPLE_LENGTHS = WIRE_SCHEMA.tuples.root.arities;
const ROOT_FORMAT_INDEX = fieldIndex(WIRE_SCHEMA.tuples.root.fields, 'format');
const ROOT_VERSION_INDEX = fieldIndex(WIRE_SCHEMA.tuples.root.fields, 'version');
const ROOT_CHARACTER_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'character',
);
const ROOT_CLASSES_INDEX = fieldIndex(WIRE_SCHEMA.tuples.root.fields, 'classes');
const ROOT_SOURCES_INDEX = fieldIndex(WIRE_SCHEMA.tuples.root.fields, 'sources');
const ROOT_SELECTIONS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'selections',
);
const ROOT_SPELLBOOK_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'spellbook',
);
const ROOT_PREFERENCES_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'preferences',
);
const ROOT_OVERRIDES_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'overrides',
);
const ROOT_ACKNOWLEDGEMENTS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'acknowledgements',
);
const ROOT_LOADOUTS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'loadouts',
);
const ROOT_WEAPONS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'weapons',
);
const ROOT_ORIGIN_INDEX = fieldIndex(WIRE_SCHEMA.tuples.root.fields, 'origin');
const ROOT_SHEET_INDEX = fieldIndex(WIRE_SCHEMA.tuples.root.fields, 'sheet');
const ROOT_EFFECTS_INDEX = fieldIndex(WIRE_SCHEMA.tuples.root.fields, 'effects');
const [
  LEGACY_ROOT_LENGTH,
  PRE_ORIGIN_ROOT_LENGTH,
  PRE_SHEET_ROOT_LENGTH,
  PRE_EFFECTS_ROOT_LENGTH,
] = ROOT_TUPLE_LENGTHS;

const CHARACTER_TUPLE_LENGTHS = WIRE_SCHEMA.tuples.character.arities;
const CHARACTER_PLACEHOLDERS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.character.fields,
  'placeholders',
);
const SHEET_TUPLE_LENGTH = WIRE_SCHEMA.tuples.sheet.arities[0];
const SHEET_ARMOR_INDEX = fieldIndex(WIRE_SCHEMA.tuples.sheet.fields, 'armor');
const SHEET_HIT_POINT_ROLLS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.sheet.fields,
  'hitPointRolls',
);
const SHEET_SKILL_PROFICIENCIES_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.sheet.fields,
  'skillProficiencies',
);
const SHEET_ADJUSTMENT_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.sheet.fields,
  'sheetAdjustment',
);

/** One worn item and one held item — `character_armor`'s own cardinality. */
const ARMOR_SLOT_COUNT = 2;

const ORIGIN_TUPLE_LENGTH = WIRE_SCHEMA.tuples.origin.arities[0];
const ORIGIN_SPECIES_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.origin.fields,
  'species',
);
const ORIGIN_SPECIES_TRAITS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.origin.fields,
  'speciesTraits',
);
const ORIGIN_BACKGROUND_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.origin.fields,
  'background',
);
const SPECIES_TUPLE_LENGTH = WIRE_SCHEMA.tuples.species.arities[0];
const SPECIES_TRAIT_TUPLE_LENGTH =
  WIRE_SCHEMA.tuples.speciesTrait.arities[0];
const BACKGROUND_TUPLE_LENGTH = WIRE_SCHEMA.tuples.background.arities[0];
const EFFECT_TUPLE_LENGTH = WIRE_SCHEMA.tuples.effect.arities[0];
const ARMOR_TUPLE_LENGTH = WIRE_SCHEMA.tuples.armor.arities[0];
const HIT_POINT_ROLL_TUPLE_LENGTH =
  WIRE_SCHEMA.tuples.hitPointRoll.arities[0];
const SHEET_ADJUSTMENT_TUPLE_LENGTH =
  WIRE_SCHEMA.tuples.sheetAdjustment.arities[0];

const WEAPON_TUPLE_LENGTHS =
  WIRE_SCHEMA.tuples.weapon.variants.map((variant) => variant.arity);
const WEAPON_TUPLE_LENGTH =
  WIRE_SCHEMA.tuples.weapon.variants.at(-1)?.arity;
if (WEAPON_TUPLE_LENGTH === undefined) {
  throw new Error('Wire schema v1 must define a current weapon variant.');
}

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
const WEAPON_LEGACY_WIRE_FIELDS = fieldKeys(
  WIRE_SCHEMA.tuples.weapon.variants[1].fields,
).slice(1);
const SPECIES_WIRE_FIELDS = fieldKeys(
  WIRE_SCHEMA.tuples.species.fields,
).slice(1);
const SPECIES_TRAIT_WIRE_FIELDS = fieldKeys(
  WIRE_SCHEMA.tuples.speciesTrait.fields,
).slice(1);
const BACKGROUND_WIRE_FIELDS = fieldKeys(
  WIRE_SCHEMA.tuples.background.fields,
).slice(1);
const EFFECT_WIRE_FIELDS = fieldKeys(
  WIRE_SCHEMA.tuples.effect.fields,
).slice(2);
const ARMOR_WIRE_FIELDS = fieldKeys(
  WIRE_SCHEMA.tuples.armor.fields,
).slice(1);
const OVERRIDE_RULE_KEY_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.override.fields,
  'ruleKey',
);
const OVERRIDE_VALUE_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.override.fields,
  'value',
);

function damageToPositional(
  damage: WeaponDamage | VersatileWeaponDamage,
): unknown[] {
  switch (damage.kind) {
    case 'dice':
      return ['dice', damage.dice];
    case 'flat':
      return ['flat', damage.amount];
    case 'custom':
      return ['custom', damage.text];
    case 'not_recorded':
      return ['not_recorded'];
    case 'not_applicable':
      return ['not_applicable'];
  }
}

function damageFromPositional(value: unknown, label: string): unknown {
  if (!Array.isArray(value) || (value.length !== 1 && value.length !== 2)) {
    throw new ShareValidationError(
      `${label} must be a damage tuple of length 1 or 2.`,
    );
  }
  const [kind, payload] = value;
  if (kind === 'not_recorded' || kind === 'not_applicable') {
    if (value.length !== 1) {
      throw new ShareValidationError(`${label} absence has no payload.`);
    }
    return { kind };
  }
  if (value.length !== 2) {
    throw new ShareValidationError(`${label} payload is required.`);
  }
  if (kind === 'dice') return { kind, dice: payload };
  if (kind === 'flat') return { kind, amount: payload };
  if (kind === 'custom') return { kind, text: payload };
  throw new ShareValidationError(`${label} kind is unsupported.`);
}

function legacyWireValue(weapon: ShareWeapon, field: string): unknown {
  switch (field) {
    case 'damage_dice':
    case 'versatile_damage_dice':
      return null;
    case 'damage_type':
      return weapon.damage_type ?? null;
    case 'ammunition_kind':
      return weapon.ammunition_kind ?? null;
    case 'range_normal_feet':
      return weapon.range_normal_feet ?? null;
    case 'range_long_feet':
      return weapon.range_long_feet ?? null;
    case 'mastery_property':
      return weapon.mastery_property ?? null;
    case 'other_properties':
      return weapon.other_properties ?? null;
    case 'notes':
      return weapon.notes ?? null;
    case 'finesse':
    case 'heavy':
    case 'light':
    case 'loading':
    case 'reach':
    case 'thrown':
    case 'two_handed':
    case 'ammunition':
    case 'mastery_selected':
      return weapon[field] ?? null;
    case 'proficiency_category':
      return weapon.proficiency_category ?? null;
    default:
      throw new Error(`Unknown weapon wire field ${field}.`);
  }
}

function weaponToPositional(weapon: ShareWeapon): unknown[] {
  return [
    weapon.name,
    ...WEAPON_LEGACY_WIRE_FIELDS.map((field) =>
      legacyWireValue(weapon, field),
    ),
    damageToPositional(weapon.damage),
    damageToPositional(weapon.versatile_damage),
  ];
}

function weaponFromPositional(value: unknown, label: string): unknown {
  const row = variableTuple(value, WEAPON_TUPLE_LENGTHS, label);
  let legacyDamage: string | null = null;
  let legacyVersatile: string | null = null;
  const weapon: Record<string, unknown> = { name: row[0] };
  WEAPON_LEGACY_WIRE_FIELDS.forEach((field, index) => {
    const item = row[index + 1];
    // `undefined` is a SHORT TUPLE — a link minted before D27 — and `null` is a
    // column this weapon genuinely has nothing in. Both leave the key absent,
    // which is what `ShareWeapon` optionality means, so the two cases need no
    // separate branch and neither can invent a value.
    if (field === 'damage_dice') {
      legacyDamage = item === null || item === undefined ? null : String(item);
    } else if (field === 'versatile_damage_dice') {
      legacyVersatile =
        item === null || item === undefined ? null : String(item);
    } else if (item !== null && item !== undefined) {
      weapon[field] = item;
    }
  });
  if (row.length === WEAPON_TUPLE_LENGTH) {
    weapon.damage = damageFromPositional(
      row[WEAPON_TUPLE_LENGTH - 2],
      `${label}.damage`,
    );
    weapon.versatile_damage = damageFromPositional(
      row[WEAPON_TUPLE_LENGTH - 1],
      `${label}.versatile_damage`,
    );
  } else {
    weapon.damage = weaponDamageFromLegacy(legacyDamage);
    weapon.versatile_damage =
      versatileWeaponDamageFromLegacy(legacyVersatile);
  }
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
    ...SPECIES_WIRE_FIELDS.map((field) => species[field] ?? null),
  ];
}

function speciesTraitToPositional(trait: ShareSpeciesTrait): unknown[] {
  return [
    trait.name,
    ...SPECIES_TRAIT_WIRE_FIELDS.map((field) => trait[field] ?? null),
  ];
}

/**
 * An effect's wire order, frozen. `kind` leads because it is what decides how
 * the payload is read, and `label` follows it because every other section in
 * this format leads with the thing a reader would call the row. The two
 * PROVENANCE slots go last, ref then flag: they are the only references here.
 * Their v1 positions never move; a future payload shape belongs to v2.
 *
 * `sourceSubclass` rides in its own slot rather than being folded into the ref
 * (a negative ref, a second numbering) because the ref space is shared with
 * `selections[].ref` and re-encoding it here would give one number two readings.
 */
function effectToPositional(effect: ShareEffect): unknown[] {
  return [
    effect.kind,
    effect.label,
    ...EFFECT_WIRE_FIELDS.map((field) => effect[field] ?? null),
  ];
}

function effectFromPositional(value: unknown, label: string): unknown {
  const row = tuple(value, EFFECT_TUPLE_LENGTH, label);
  const effect: Record<string, unknown> = { kind: row[0], label: row[1] };
  EFFECT_WIRE_FIELDS.forEach((field, index) => {
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
    ...BACKGROUND_WIRE_FIELDS.map((field) => background[field] ?? null),
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
    ...ARMOR_WIRE_FIELDS.map((field) => armor[field] ?? null),
  ];
}

function armorFromPositional(value: unknown, label: string): unknown {
  return fromPositional(
    value,
    ARMOR_TUPLE_LENGTH,
    fieldKeys(WIRE_SCHEMA.tuples.armor.fields),
    label,
  );
}

function hitPointRollToPositional(roll: ShareHitPointRoll): unknown[] {
  return [roll.className, roll.classLevel, roll.value];
}

function hitPointRollFromPositional(value: unknown, label: string): unknown {
  return fromPositional(
    value,
    HIT_POINT_ROLL_TUPLE_LENGTH,
    fieldKeys(WIRE_SCHEMA.tuples.hitPointRoll.fields),
    label,
  );
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
  return fromPositional(
    value,
    SHEET_ADJUSTMENT_TUPLE_LENGTH,
    fieldKeys(WIRE_SCHEMA.tuples.sheetAdjustment.fields),
    label,
  );
}

function fromPositional(
  value: unknown,
  length: number,
  fields: readonly string[],
  label: string,
): Record<string, unknown> {
  const row = tuple(value, length, label);
  const result: Record<string, unknown> = {};
  fields.forEach((field, index) => {
    const item = row[index];
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

export function shareDocumentToPositional(
  input: CharacterShareDocument,
): unknown[] {
  const document = validateShareDocument(input);
  const character = document.character;
  const characterWire = objectToPositional(
    {
      ...character,
      placeholders: document.placeholders?.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.placeholder.fields)
      ),
    },
    WIRE_SCHEMA.tuples.character.fields,
  );
  const originWire = objectToPositional(
    {
      species: document.species === undefined
        ? null
        : speciesToPositional(document.species),
      speciesTraits: document.speciesTraits?.map(speciesTraitToPositional),
      background: document.background === undefined
        ? null
        : backgroundToPositional(document.background),
    },
    WIRE_SCHEMA.tuples.origin.fields,
  );
  const sheetWire = objectToPositional(
    {
      armor: document.armor?.map(armorToPositional),
      hitPointRolls: document.hitPointRolls?.map(hitPointRollToPositional),
      skillProficiencies: document.skillProficiencies === undefined
        ? null
        : [...document.skillProficiencies],
      sheetAdjustment: document.sheetAdjustment === undefined
        ? null
        : sheetAdjustmentToPositional(document.sheetAdjustment),
    },
    WIRE_SCHEMA.tuples.sheet.fields,
  );
  return objectToPositional(
    {
      format: CHARACTER_SHARE_FORMAT,
      version: CHARACTER_SHARE_VERSION,
      character: characterWire,
      classes: document.classes.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.class.fields)
      ),
      sources: document.sources.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.source.fields)
      ),
      selections: document.selections.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.selection.fields)
      ),
      spellbook: [...document.spellbook],
      preferences: document.preferences.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.preference.fields)
      ),
      overrides: document.overrides.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.override.fields)
      ),
      acknowledgements: document.acknowledgements?.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.acknowledgement.fields)
      ),
      loadouts: document.loadouts?.map((row) =>
        objectToPositional(
          {
            name: row.name,
            entries: row.entries.map((entry) =>
              objectToPositional(
                entry,
                WIRE_SCHEMA.tuples.loadoutEntry.fields,
              )
            ),
          },
          WIRE_SCHEMA.tuples.loadout.fields,
        )
      ),
      weapons: document.weapons?.map(weaponToPositional),
      origin: originWire,
      sheet: sheetWire,
      effects: document.effects?.map(effectToPositional),
    },
    WIRE_SCHEMA.tuples.root.fields,
  );
}

function decodeWireV1(input: unknown): CharacterShareDocument {
  const root = variableTuple(input, ROOT_TUPLE_LENGTHS, 'wire document');
  // An eleven-element document predates weapons. `undefined`, not `null`: the
  // section is genuinely absent, and the object validator distinguishes the two.
  const wireWeapons =
    root.length === LEGACY_ROOT_LENGTH ? null : root[ROOT_WEAPONS_INDEX];
  // Eleven or twelve elements both predate the origin. `null` rather than a
  // three-element tuple of nulls, so the three sections stay genuinely ABSENT
  // and the object validator can tell "carried none" from "never carried".
  const wireOrigin =
    root.length === LEGACY_ROOT_LENGTH ||
    root.length === PRE_ORIGIN_ROOT_LENGTH
      ? null
      : tuple(root[ROOT_ORIGIN_INDEX], ORIGIN_TUPLE_LENGTH, 'wire origin');
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
      : tuple(root[ROOT_SHEET_INDEX], SHEET_TUPLE_LENGTH, 'wire sheet');
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
      : root[ROOT_EFFECTS_INDEX];
  const character = variableTuple(
    root[ROOT_CHARACTER_INDEX],
    CHARACTER_TUPLE_LENGTHS,
    'wire character',
  );
  if (!Array.isArray(root[ROOT_CLASSES_INDEX])) {
    throw new ShareValidationError('wire classes must be a list.');
  }
  if (!Array.isArray(root[ROOT_SOURCES_INDEX])) {
    throw new ShareValidationError('wire sources must be a list.');
  }
  if (!Array.isArray(root[ROOT_SELECTIONS_INDEX])) {
    throw new ShareValidationError('wire selections must be a list.');
  }
  if (!Array.isArray(root[ROOT_SPELLBOOK_INDEX])) {
    throw new ShareValidationError('wire spellbook must be a list.');
  }
  if (!Array.isArray(root[ROOT_PREFERENCES_INDEX])) {
    throw new ShareValidationError('wire preferences must be a list.');
  }
  if (!Array.isArray(root[ROOT_OVERRIDES_INDEX])) {
    throw new ShareValidationError('wire overrides must be a list.');
  }
  if (
    root[ROOT_ACKNOWLEDGEMENTS_INDEX] !== null &&
    !Array.isArray(root[ROOT_ACKNOWLEDGEMENTS_INDEX])
  ) {
    throw new ShareValidationError(
      'wire acknowledgements must be null or a list.',
    );
  }
  if (
    root[ROOT_LOADOUTS_INDEX] !== null &&
    !Array.isArray(root[ROOT_LOADOUTS_INDEX])
  ) {
    throw new ShareValidationError('wire loadouts must be null or a list.');
  }
  if (wireWeapons !== null && !Array.isArray(wireWeapons)) {
    throw new ShareValidationError('wire weapons must be null or a list.');
  }
  assertListLimit(root[ROOT_CLASSES_INDEX], SHARE_LIMITS.classes, 'classes');
  assertListLimit(root[ROOT_SOURCES_INDEX], SHARE_LIMITS.sources, 'sources');
  assertListLimit(
    root[ROOT_SELECTIONS_INDEX],
    SHARE_LIMITS.selections,
    'selections',
  );
  assertListLimit(
    root[ROOT_SPELLBOOK_INDEX],
    SHARE_LIMITS.spellbook,
    'spellbook',
  );
  assertListLimit(
    root[ROOT_PREFERENCES_INDEX],
    SHARE_LIMITS.preferences,
    'preferences',
  );
  assertListLimit(
    root[ROOT_OVERRIDES_INDEX],
    SHARE_LIMITS.overrides,
    'overrides',
  );
  if (root[ROOT_ACKNOWLEDGEMENTS_INDEX] !== null) {
    assertListLimit(
      root[ROOT_ACKNOWLEDGEMENTS_INDEX],
      SHARE_LIMITS.acknowledgements,
      'acknowledgements',
    );
  }
  if (root[ROOT_LOADOUTS_INDEX] !== null) {
    assertListLimit(
      root[ROOT_LOADOUTS_INDEX],
      SHARE_LIMITS.loadouts,
      'loadouts',
    );
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
      ['armor', wireSheet[SHEET_ARMOR_INDEX], ARMOR_SLOT_COUNT],
      [
        'hitPointRolls',
        wireSheet[SHEET_HIT_POINT_ROLLS_INDEX],
        SHARE_LIMITS.hitPointRolls,
      ],
      [
        'skillProficiencies',
        wireSheet[SHEET_SKILL_PROFICIENCIES_INDEX],
        SHARE_LIMITS.skillProficiencies,
      ],
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
    if (
      wireOrigin[ORIGIN_SPECIES_TRAITS_INDEX] !== null &&
      !Array.isArray(wireOrigin[ORIGIN_SPECIES_TRAITS_INDEX])
    ) {
      throw new ShareValidationError(
        'wire speciesTraits must be null or a list.',
      );
    }
    if (Array.isArray(wireOrigin[ORIGIN_SPECIES_TRAITS_INDEX])) {
      assertListLimit(
        wireOrigin[ORIGIN_SPECIES_TRAITS_INDEX],
        SHARE_LIMITS.speciesTraits,
        'speciesTraits',
      );
    }
  }
  if (character[CHARACTER_PLACEHOLDERS_INDEX] !== null) {
    if (!Array.isArray(character[CHARACTER_PLACEHOLDERS_INDEX])) {
      throw new ShareValidationError(
        'wire placeholders must be a list.',
      );
    }
    assertListLimit(
      character[CHARACTER_PLACEHOLDERS_INDEX],
      SHARE_LIMITS.placeholders,
      'placeholders',
    );
  }

  const rawCharacter = fromPositional(
    character,
    character.length,
    fieldKeys(WIRE_SCHEMA.tuples.character.fields).slice(0, character.length),
    'wire character',
  );
  delete rawCharacter.placeholders;

  const raw: Record<string, unknown> = {
    format: root[ROOT_FORMAT_INDEX],
    version: root[ROOT_VERSION_INDEX],
    character: rawCharacter,
    classes: root[ROOT_CLASSES_INDEX].map((value, index) =>
      fromPositional(
        value,
        WIRE_SCHEMA.tuples.class.arities[0],
        fieldKeys(WIRE_SCHEMA.tuples.class.fields),
        `wire classes[${index}]`,
      )
    ),
    sources: root[ROOT_SOURCES_INDEX].map((value, index) =>
      fromPositional(
        value,
        WIRE_SCHEMA.tuples.source.arities[0],
        fieldKeys(WIRE_SCHEMA.tuples.source.fields),
        `wire sources[${index}]`,
      )
    ),
    selections: root[ROOT_SELECTIONS_INDEX].map((value, index) =>
      fromPositional(
        value,
        WIRE_SCHEMA.tuples.selection.arities[0],
        fieldKeys(WIRE_SCHEMA.tuples.selection.fields),
        `wire selections[${index}]`,
      )
    ),
    spellbook: [...root[ROOT_SPELLBOOK_INDEX]],
    preferences: root[ROOT_PREFERENCES_INDEX].map((value, index) =>
      fromPositional(
        value,
        WIRE_SCHEMA.tuples.preference.arities[0],
        fieldKeys(WIRE_SCHEMA.tuples.preference.fields),
        `wire preferences[${index}]`,
      )
    ),
    overrides: root[ROOT_OVERRIDES_INDEX].map((value, index) => {
      const row = tuple(
        value,
        WIRE_SCHEMA.tuples.override.arities[0],
        `wire overrides[${index}]`,
      );
      return {
        ruleKey: row[OVERRIDE_RULE_KEY_INDEX],
        value: row[OVERRIDE_VALUE_INDEX],
      };
    }),
  };
  if (root[ROOT_ACKNOWLEDGEMENTS_INDEX] !== null) {
    raw.acknowledgements = root[ROOT_ACKNOWLEDGEMENTS_INDEX].map(
      (value, index) =>
        fromPositional(
          value,
          WIRE_SCHEMA.tuples.acknowledgement.arities[0],
          fieldKeys(WIRE_SCHEMA.tuples.acknowledgement.fields),
          `wire acknowledgements[${index}]`,
        ),
    );
  }
  if (root[ROOT_LOADOUTS_INDEX] !== null) {
    raw.loadouts = root[ROOT_LOADOUTS_INDEX].map((value, index) => {
      const row = tuple(
        value,
        WIRE_SCHEMA.tuples.loadout.arities[0],
        `wire loadouts[${index}]`,
      );
      if (!Array.isArray(row[1])) {
        throw new ShareValidationError(
          `wire loadouts[${index}].entries must be a list.`,
        );
      }
      return {
        name: row[0],
        entries: row[1].map((entry, entryIndex) => {
          return fromPositional(
            entry,
            WIRE_SCHEMA.tuples.loadoutEntry.arities[0],
            fieldKeys(WIRE_SCHEMA.tuples.loadoutEntry.fields),
            `wire loadouts[${index}].entries[${entryIndex}]`,
          );
        }),
      };
    });
  }
  if (character[CHARACTER_PLACEHOLDERS_INDEX] !== null) {
    raw.placeholders = character[CHARACTER_PLACEHOLDERS_INDEX].map(
      (value, index) =>
        fromPositional(
          value,
          WIRE_SCHEMA.tuples.placeholder.arities[0],
          fieldKeys(WIRE_SCHEMA.tuples.placeholder.fields),
          `wire placeholders[${index}]`,
        ),
    );
  }
  if (wireWeapons !== null) {
    raw.weapons = wireWeapons.map((value, index) =>
      weaponFromPositional(value, `wire weapons[${index}]`),
    );
  }
  if (wireOrigin !== null) {
    if (wireOrigin[ORIGIN_SPECIES_INDEX] !== null) {
      raw.species = fromPositional(
        wireOrigin[ORIGIN_SPECIES_INDEX],
        SPECIES_TUPLE_LENGTH,
        fieldKeys(WIRE_SCHEMA.tuples.species.fields),
        'wire species',
      );
    }
    if (Array.isArray(wireOrigin[ORIGIN_SPECIES_TRAITS_INDEX])) {
      raw.speciesTraits = wireOrigin[ORIGIN_SPECIES_TRAITS_INDEX].map(
        (value, index) =>
        fromPositional(
          value,
          SPECIES_TRAIT_TUPLE_LENGTH,
          fieldKeys(WIRE_SCHEMA.tuples.speciesTrait.fields),
          `wire speciesTraits[${index}]`,
        ),
      );
    }
    if (wireOrigin[ORIGIN_BACKGROUND_INDEX] !== null) {
      raw.background = fromPositional(
        wireOrigin[ORIGIN_BACKGROUND_INDEX],
        BACKGROUND_TUPLE_LENGTH,
        fieldKeys(WIRE_SCHEMA.tuples.background.fields),
        'wire background',
      );
    }
  }
  if (wireSheet !== null) {
    if (Array.isArray(wireSheet[SHEET_ARMOR_INDEX])) {
      raw.armor = wireSheet[SHEET_ARMOR_INDEX].map((value, index) =>
        armorFromPositional(value, `wire armor[${index}]`),
      );
    }
    if (Array.isArray(wireSheet[SHEET_HIT_POINT_ROLLS_INDEX])) {
      raw.hitPointRolls = wireSheet[SHEET_HIT_POINT_ROLLS_INDEX].map(
        (value, index) =>
        hitPointRollFromPositional(value, `wire hitPointRolls[${index}]`),
      );
    }
    if (Array.isArray(wireSheet[SHEET_SKILL_PROFICIENCIES_INDEX])) {
      raw.skillProficiencies = [
        ...wireSheet[SHEET_SKILL_PROFICIENCIES_INDEX],
      ];
    }
    if (wireSheet[SHEET_ADJUSTMENT_INDEX] !== null) {
      raw.sheetAdjustment = sheetAdjustmentFromPositional(
        wireSheet[SHEET_ADJUSTMENT_INDEX],
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

export function positionalToShareDocument(
  input: unknown,
): CharacterShareDocument {
  const root = variableTuple(input, ROOT_TUPLE_LENGTHS, 'wire document');
  if (root[ROOT_FORMAT_INDEX] !== CHARACTER_SHARE_FORMAT) {
    throw new ShareValidationError('format is unsupported.');
  }
  switch (root[ROOT_VERSION_INDEX]) {
    case 1:
      return decodeWireV1(root);
    default:
      throw new ShareValidationError('version is unsupported.');
  }
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
