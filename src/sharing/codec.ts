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
  type ShareItem,
  type ShareSpecies,
  type ShareSpeciesTrait,
  type ShareWeapon,
  validateShareDocument,
} from './schema';
import {
  type VersatileWeaponDamage,
  type WeaponDamage,
} from '../domain/weapon-damage';
import {
  CURRENT_CHARACTER_SHARE_VERSION,
  MIGRATIONS,
  SHARE_SCHEMAS,
  type WireField,
} from './wire-schemas';
import type { WeaponRange } from '../domain/weapon-range';

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
const ROOT_PLACEHOLDERS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'placeholders',
);
const ROOT_SKILL_GRANTS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'skillGrants',
);
const ROOT_ITEMS_INDEX = fieldIndex(WIRE_SCHEMA.tuples.root.fields, 'items');
const ROOT_ATTUNEMENT_SLOTS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'attunementSlots',
);
const ROOT_EXPERTISE_GRANTS_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'expertiseGrants',
);
const ROOT_LEVEL_FEAT_CHOICES_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'levelFeatChoices',
);
const ROOT_PORTABLE_CONTENT_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'portableContent',
);
const ROOT_DOCUMENT_IDENTITY_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.root.fields,
  'documentIdentity',
);

const CHARACTER_TUPLE_LENGTHS = WIRE_SCHEMA.tuples.character.arities;
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
const ITEM_TUPLE_LENGTH = WIRE_SCHEMA.tuples.item.arities[0];
const ATTUNEMENT_SLOTS_TUPLE_LENGTH =
  WIRE_SCHEMA.tuples.attunementSlots.arities[0];
const ARMOR_TUPLE_LENGTH = WIRE_SCHEMA.tuples.armor.arities[0];
const HIT_POINT_ROLL_TUPLE_LENGTH =
  WIRE_SCHEMA.tuples.hitPointRoll.arities[0];
const LEVEL_FEAT_CHOICE_TUPLE_LENGTH =
  WIRE_SCHEMA.tuples.levelFeatChoice.arities[0];

const WEAPON_TUPLE_LENGTH =
  WIRE_SCHEMA.tuples.weapon.variants[0].arity;

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

const WEAPON_WIRE_FIELDS = fieldKeys(
  WIRE_SCHEMA.tuples.weapon.variants[0].fields,
);
const WEAPON_DAMAGE_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.weapon.variants[0].fields,
  'damage',
);
const WEAPON_VERSATILE_DAMAGE_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.weapon.variants[0].fields,
  'versatile_damage',
);
const WEAPON_RANGE_INDEX = fieldIndex(
  WIRE_SCHEMA.tuples.weapon.variants[0].fields,
  'range',
);
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

function weaponRangeToPositional(
  range: WeaponRange,
): readonly unknown[] {
  switch (range.kind) {
    case 'none':
      return ['none'];
    case 'ranged':
      return [range.kind, range.near_feet, range.far_feet];
    case 'legacy':
      throw new ShareValidationError(
        'weapons cannot freshly encode a decode-only legacy range.',
      );
  }
}

function weaponRangeFromPositional(
  value: unknown,
  label: string,
): unknown {
  if (!Array.isArray(value)) {
    throw new ShareValidationError(`${label} must be a tagged range tuple.`);
  }
  switch (value[0]) {
    case 'none':
      tuple(value, 1, label);
      return { kind: 'none' };
    case 'ranged':
    case 'legacy':
      tuple(value, 3, label);
      return {
        kind: value[0],
        near_feet: value[1],
        far_feet: value[2],
      };
    default:
      throw new ShareValidationError(`${label} kind is unsupported.`);
  }
}

function weaponWireValue(
  weapon: ShareWeapon,
  field: string,
): unknown {
  switch (field) {
    case 'name':
      return weapon.name;
    case 'damage_dice':
    case 'versatile_damage_dice':
      return null;
    case 'damage_type':
      return weapon.damage_type ?? null;
    case 'ammunition_kind':
      return weapon.ammunition_kind ?? null;
    case 'range':
      return weaponRangeToPositional(weapon.range);
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
    case 'damage':
      return damageToPositional(weapon.damage);
    case 'versatile_damage':
      return damageToPositional(weapon.versatile_damage);
    default:
      throw new Error(`Unknown weapon wire field ${field}.`);
  }
}

function weaponToPositional(weapon: ShareWeapon): unknown[] {
  return WEAPON_WIRE_FIELDS.map((field) =>
    weaponWireValue(weapon, field)
  );
}

function weaponFromPositional(value: unknown, label: string): unknown {
  const row = tuple(value, WEAPON_TUPLE_LENGTH, label);
  const weapon: Record<string, unknown> = { name: row[0] };
  WEAPON_WIRE_FIELDS.forEach((field, index) => {
    const item = row[index];
    if (
      field === 'damage_dice' ||
      field === 'versatile_damage_dice' ||
      field === 'damage' ||
      field === 'versatile_damage' ||
      field === 'range'
    ) {
      return;
    }
    if (item !== null) {
      weapon[field] = item;
    }
  });
  weapon.range = weaponRangeFromPositional(
    row[WEAPON_RANGE_INDEX],
    `${label}.range`,
  );
  weapon.damage = damageFromPositional(
    row[WEAPON_DAMAGE_INDEX],
    `${label}.damage`,
  );
  weapon.versatile_damage = damageFromPositional(
    row[WEAPON_VERSATILE_DAMAGE_INDEX],
    `${label}.versatile_damage`,
  );
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
 * Their positions do not move between v1 and v2.
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
      `wire ${label} exceeds the maximum count of ${maximum}.`,
    );
  }
}

export function shareDocumentToPositional(
  input: CharacterShareDocument,
): unknown[] {
  const document = validateShareDocument(input);
  const character = document.character;
  const characterWire = objectToPositional(
    character,
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
      spellbook: document.spellbook.map((row) =>
        objectToPositional(
          row,
          WIRE_SCHEMA.tuples.spellbookAcquisition.fields,
        )
      ),
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
      placeholders: document.placeholders?.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.placeholder.fields)
      ),
      skillGrants: document.skillGrants?.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.skillGrant.fields)
      ),
      items: document.items?.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.item.fields)
      ),
      attunementSlots: document.attunementSlots,
      expertiseGrants: document.expertiseGrants?.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.expertiseGrant.fields)
      ),
      levelFeatChoices: document.levelFeatChoices?.map((row) =>
        objectToPositional(row, WIRE_SCHEMA.tuples.levelFeatChoice.fields)
      ),
      portableContent: document.portableContent,
      documentIdentity: document.documentIdentity,
    },
    WIRE_SCHEMA.tuples.root.fields,
  );
}

function decodeCurrentWire(input: unknown): CharacterShareDocument {
  const root = variableTuple(input, ROOT_TUPLE_LENGTHS, 'wire document');
  const wireWeapons = root[ROOT_WEAPONS_INDEX];
  const wireOrigin = root[ROOT_ORIGIN_INDEX] === null
    ? null
    : tuple(root[ROOT_ORIGIN_INDEX], ORIGIN_TUPLE_LENGTH, 'wire origin');
  const wireSheet = root[ROOT_SHEET_INDEX] === null
    ? null
    : tuple(root[ROOT_SHEET_INDEX], SHEET_TUPLE_LENGTH, 'wire sheet');
  const wireEffects = root[ROOT_EFFECTS_INDEX];
  const wirePlaceholders = root[ROOT_PLACEHOLDERS_INDEX];
  const wireSkillGrants = root[ROOT_SKILL_GRANTS_INDEX];
  const wireItems = root[ROOT_ITEMS_INDEX];
  const wireExpertiseGrants = root[ROOT_EXPERTISE_GRANTS_INDEX];
  const wireLevelFeatChoices = root[ROOT_LEVEL_FEAT_CHOICES_INDEX];
  const wirePortableContent = root[ROOT_PORTABLE_CONTENT_INDEX];
  const wireDocumentIdentity = root[ROOT_DOCUMENT_IDENTITY_INDEX];
  const wireAttunementSlots =
    root[ROOT_ATTUNEMENT_SLOTS_INDEX] === null
      ? null
      : tuple(
          root[ROOT_ATTUNEMENT_SLOTS_INDEX],
          ATTUNEMENT_SLOTS_TUPLE_LENGTH,
          'wire attunementSlots',
        );
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
  if (wirePlaceholders !== null) {
    if (!Array.isArray(wirePlaceholders)) {
      throw new ShareValidationError(
        'wire placeholders must be a list.',
      );
    }
    assertListLimit(
      wirePlaceholders,
      SHARE_LIMITS.placeholders,
      'placeholders',
    );
  }
  if (wireSkillGrants !== null) {
    if (!Array.isArray(wireSkillGrants)) {
      throw new ShareValidationError(
        'wire skillGrants must be null or a list.',
      );
    }
    assertListLimit(wireSkillGrants, SHARE_LIMITS.skillGrants, 'skillGrants');
  }
  if (wireItems !== null) {
    if (!Array.isArray(wireItems)) {
      throw new ShareValidationError('wire items must be null or a list.');
    }
    assertListLimit(wireItems, SHARE_LIMITS.items, 'items');
  }
  if (wireExpertiseGrants !== null) {
    if (!Array.isArray(wireExpertiseGrants)) {
      throw new ShareValidationError(
        'wire expertiseGrants must be null or a list.',
      );
    }
    assertListLimit(
      wireExpertiseGrants,
      SHARE_LIMITS.expertiseGrants,
      'expertiseGrants',
    );
  }
  if (wireLevelFeatChoices !== null) {
    if (!Array.isArray(wireLevelFeatChoices)) {
      throw new ShareValidationError(
        'wire levelFeatChoices must be null or a list.',
      );
    }
    assertListLimit(
      wireLevelFeatChoices,
      SHARE_LIMITS.levelFeatChoices,
      'levelFeatChoices',
    );
  }
  const rawCharacter = fromPositional(
    character,
    character.length,
    fieldKeys(WIRE_SCHEMA.tuples.character.fields),
    'wire character',
  );

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
    spellbook: root[ROOT_SPELLBOOK_INDEX].map((value, index) =>
      fromPositional(
        value,
        WIRE_SCHEMA.tuples.spellbookAcquisition.arities[0],
        fieldKeys(WIRE_SCHEMA.tuples.spellbookAcquisition.fields),
        `wire spellbook[${index}]`,
      )
    ),
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
  if (wireAttunementSlots !== null) {
    raw.attunementSlots = [...wireAttunementSlots];
  }
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
  if (Array.isArray(wirePlaceholders)) {
    raw.placeholders = wirePlaceholders.map(
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
  }
  if (Array.isArray(wireEffects)) {
    raw.effects = wireEffects.map((value, index) =>
      effectFromPositional(value, `wire effects[${index}]`),
    );
  }
  if (Array.isArray(wireSkillGrants)) {
    raw.skillGrants = wireSkillGrants.map((value, index) =>
      fromPositional(
        value,
        WIRE_SCHEMA.tuples.skillGrant.arities[0],
        fieldKeys(WIRE_SCHEMA.tuples.skillGrant.fields),
        `wire skillGrants[${index}]`,
      ),
    );
  }
  if (Array.isArray(wireItems)) {
    raw.items = wireItems.map((value, index) =>
      fromPositional(
        value,
        ITEM_TUPLE_LENGTH,
        fieldKeys(WIRE_SCHEMA.tuples.item.fields),
        `wire items[${index}]`,
      ),
    );
  }
  if (Array.isArray(wireExpertiseGrants)) {
    raw.expertiseGrants = wireExpertiseGrants.map((value, index) =>
      fromPositional(
        value,
        WIRE_SCHEMA.tuples.expertiseGrant.arities[0],
        fieldKeys(WIRE_SCHEMA.tuples.expertiseGrant.fields),
        `wire expertiseGrants[${index}]`,
      )
    );
  }
  if (Array.isArray(wireLevelFeatChoices)) {
    raw.levelFeatChoices = wireLevelFeatChoices.map((value, index) =>
      fromPositional(
        value,
        LEVEL_FEAT_CHOICE_TUPLE_LENGTH,
        fieldKeys(WIRE_SCHEMA.tuples.levelFeatChoice.fields),
        `wire levelFeatChoices[${index}]`,
      )
    );
  }
  if (wirePortableContent !== null) {
    raw.portableContent = wirePortableContent;
  }
  if (wireDocumentIdentity !== null) {
    raw.documentIdentity = wireDocumentIdentity;
  }
  return validateShareDocument(raw);
}

/** Current-wire reference-only projection; character identity still travels. */
export function shareDocumentToReferencePositional(
  document: CharacterShareDocument,
): unknown[] {
  const positional = shareDocumentToPositional(document);
  positional[ROOT_PORTABLE_CONTENT_INDEX] = null;
  return positional;
}

export function positionalToShareDocument(
  input: unknown,
): CharacterShareDocument {
  if (!Array.isArray(input)) {
    variableTuple(
      input,
      SHARE_SCHEMAS[1].tuples.root.arities,
      'wire document',
    );
    throw new ShareValidationError('wire document must be a tuple.');
  }
  if (input[0] !== CHARACTER_SHARE_FORMAT) {
    throw new ShareValidationError('format is unsupported.');
  }
  // Migrations are ADJACENT and composed: a v1 link lifts 1→2, 2→3, 3→4, then
  // 4→5 — and 4→5 deliberately THROWS `ShareWireRetirementError` (D60, skills
  // plan §3.2): a pre-v5 document carries skills as bare strings with no
  // provenance, and migrating one would mean fabricating attribution. The
  // per-version tuple checks still run first, so a MALFORMED old document is
  // still refused as malformed rather than dignified as retired.
  const version = input[1];
  switch (version) {
    case 1:
      variableTuple(
        input,
        SHARE_SCHEMAS[1].tuples.root.arities,
        'wire document',
      );
      variableTuple(
        input[2],
        SHARE_SCHEMAS[1].tuples.character.arities,
        'wire character',
      );
      return decodeCurrentWire(
        MIGRATIONS[4](MIGRATIONS[3](MIGRATIONS[2](MIGRATIONS[1](input)))),
      );
    case 2:
      variableTuple(
        input,
        SHARE_SCHEMAS[2].tuples.root.arities,
        'wire document',
      );
      variableTuple(
        input[2],
        SHARE_SCHEMAS[2].tuples.character.arities,
        'wire character',
      );
      return decodeCurrentWire(
        MIGRATIONS[4](MIGRATIONS[3](MIGRATIONS[2](input))),
      );
    case 3:
      variableTuple(
        input,
        SHARE_SCHEMAS[3].tuples.root.arities,
        'wire document',
      );
      variableTuple(
        input[2],
        SHARE_SCHEMAS[3].tuples.character.arities,
        'wire character',
      );
      return decodeCurrentWire(MIGRATIONS[4](MIGRATIONS[3](input)));
    case 4:
      variableTuple(
        input,
        SHARE_SCHEMAS[4].tuples.root.arities,
        'wire document',
      );
      variableTuple(
        input[2],
        SHARE_SCHEMAS[4].tuples.character.arities,
        'wire character',
      );
      return decodeCurrentWire(MIGRATIONS[4](input));
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
    case 15:
    case 16:
    case 17:
    case 18: {
      let migrated: unknown = input;
      for (const [from, migration] of Object.entries(MIGRATIONS)) {
        if (Number(from) >= version) {
          migrated = migration(migrated);
        }
      }
      return decodeCurrentWire(migrated);
    }
    case 19:
      return decodeCurrentWire(input);
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

export type ShareEncodeResult =
  | { readonly kind: 'encoded'; readonly fragment: string }
  | {
      readonly kind: 'too_large';
      readonly maximumEncodedCharacters: number;
      readonly limit: 'compressed' | 'encoded';
    };

function encodedInput(
  document: CharacterShareDocument,
  referenceOnly = false,
): Uint8Array {
  const json = JSON.stringify(
    referenceOnly
      ? shareDocumentToReferencePositional(document)
      : shareDocumentToPositional(document),
  );
  const input = new TextEncoder().encode(json);
  if (input.byteLength > SHARE_LIMITS.decompressedBytes) {
    throw new ShareValidationError(
      `wire document exceeds the ${SHARE_LIMITS.decompressedBytes}-byte limit.`,
    );
  }
  return input;
}

function tryEncodeInput(
  input: Uint8Array,
): Promise<ShareEncodeResult> {
  return collectStream(
    new Blob([new Uint8Array(input).buffer])
      .stream()
      .pipeThrough(new CompressionStream('gzip')),
    SHARE_LIMITS.compressedBytes,
    'compressed document',
  ).then((compressed): ShareEncodeResult => {
    const encoded = bytesToBase64(compressed)
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/g, '');
    if (encoded.length > SHARE_LIMITS.encodedCharacters) {
      return {
        kind: 'too_large',
        maximumEncodedCharacters: SHARE_LIMITS.encodedCharacters,
        limit: 'encoded',
      };
    }
    return { kind: 'encoded', fragment: encoded };
  }).catch((error: unknown): ShareEncodeResult => {
    if (error instanceof ShareValidationError) {
      return {
        kind: 'too_large',
        maximumEncodedCharacters: SHARE_LIMITS.encodedCharacters,
        limit: 'compressed',
      };
    }
    throw error;
  });
}

export function tryEncodeShareFragment(
  document: CharacterShareDocument,
): Promise<ShareEncodeResult> {
  return tryEncodeInput(encodedInput(document));
}

export function tryEncodeReferenceOnlyShareFragment(
  document: CharacterShareDocument,
): Promise<ShareEncodeResult> {
  return tryEncodeInput(encodedInput(document, true));
}

export function encodeShareFragment(
  document: CharacterShareDocument,
): Promise<string> {
  return tryEncodeInput(encodedInput(document)).then((result) => {
    if (result.kind === 'too_large') {
      throw new ShareValidationError(
        result.limit === 'compressed'
          ? `compressed document exceeds the ${SHARE_LIMITS.compressedBytes}-byte limit.`
          : `fragment exceeds the ${result.maximumEncodedCharacters}-character limit.`,
      );
    }
    return result.fragment;
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
