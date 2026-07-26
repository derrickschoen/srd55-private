import { isSpellVersionKey } from '../catalog/catalog-key';
import {
  abilities,
  rulesEditions,
  weaponMasteryProperties,
} from '../domain/enums';
import { weaponMasterySelectionError } from '../domain/contracts/row-rules';
import {
  WEAPON_RANGE_MAX_FEET,
  WEAPON_TEXT_LIMITS,
} from '../domain/weapon-limits';

export const CHARACTER_SHARE_FORMAT =
  'dnd-multiclass-spells-character-share' as const;
export const CHARACTER_SHARE_VERSION = 1 as const;

export const SHARE_LIMITS = Object.freeze({
  encodedCharacters: 131_072,
  compressedBytes: 98_304,
  decompressedBytes: 524_288,
  classes: 20,
  sources: 100,
  selections: 1_000,
  spellbook: 1_000,
  preferences: 1_000,
  overrides: 200,
  acknowledgements: 500,
  loadouts: 100,
  loadoutEntries: 1_000,
  placeholders: 1_000,
  /**
   * How many weapons one document may carry.
   *
   * `character_weapons` holds the longest free prose a share payload carries —
   * `other_properties` and `notes` are plain `TEXT`, where `loadouts[].name` is
   * the only other user-typed field here and is one short line. A count cap
   * stops a hostile document spending the whole decompressed budget on a single
   * section, and names the section when it fires. It matches the precedent set
   * by `loadouts` and `acknowledgements`, which the app does not bound either.
   *
   * 100 realistic weapons cost roughly 1.4 KB of fragment; the cap exists for
   * the pathological case, not the plausible one. It is NOT a promise that any
   * 100 weapons fit — 100 weapons of maximum-length high-entropy prose still
   * exceed `compressedBytes`, and honestly report that.
   *
   * The PER-FIELD lengths deliberately do not live here — see
   * `WEAPON_TEXT_LIMITS`. Owning them separately was a defect: a share-only
   * number drifted BELOW what the write boundary accepts, which made a
   * legitimately built character refuse to export.
   */
  weapons: 100,
});

export interface ShareCharacter {
  readonly name: string;
  readonly strength?: number;
  readonly dexterity?: number;
  readonly constitution?: number;
  readonly intelligence?: number;
  readonly wisdom?: number;
  readonly charisma?: number;
  readonly proficiency_bonus_override?: number;
  readonly rules_edition_preference?: string;
  readonly allow_legacy?: true;
}

export interface ShareClass {
  readonly id: number;
  readonly classKey: string;
  readonly subclassKey?: string;
  readonly level: number;
  readonly start: number;
  readonly ability?: string;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly subclassConfig?: Readonly<Record<string, unknown>>;
}

export interface ShareSource {
  readonly id: number;
  readonly type: 'feat' | 'species' | 'background';
  readonly key: string;
  readonly name?: string;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly acquired: number;
}

export interface ShareSelection {
  readonly ref: number;
  readonly ruleKey: string;
  readonly ordinal: number;
  readonly spellKey: string;
  readonly spellName?: string;
  readonly keep?: true;
}

export interface SharePreference {
  readonly spellKey: string;
  readonly favourite: boolean;
}

export interface ShareOverride {
  readonly ruleKey: string;
  readonly value: unknown;
}

export interface ShareLoadout {
  readonly name: string;
  readonly entries: readonly {
    readonly spellKey: string;
    readonly role: string;
  }[];
}

export interface SharePlaceholder {
  readonly spellKey: string;
  readonly spellName: string;
}

/**
 * ONE OF A CHARACTER'S WEAPONS, AS IT TRAVELS.
 *
 * FIELD NAMES ARE COLUMN NAMES, deliberately. `ShareCharacter` already does
 * this (`proficiency_bonus_override`, `rules_edition_preference`), and for the
 * same reason: these are the character's own row, not a re-modelled projection
 * of it. The camelCase names elsewhere in this module (`classKey`, `spellKey`)
 * name things that are NOT columns — content keys that replace database ids.
 * A weapon has no id to replace: by D1b it holds no template reference, so the
 * whole row is portable as-is.
 *
 * WHAT IS OMITTED AND WHY. `id`, `character_id`, `created_at` and `updated_at`
 * — the same four a share document omits everywhere else. A share carries no
 * database identifiers and no timestamps.
 *
 * OPTIONALITY MIRRORS THE COLUMN, IT DOES NOT INVENT A NEW ONE (D6/D6b). Every
 * nullable column is an optional field, so a half-entered weapon — a name and
 * nothing else, which this schema treats as a first-class state — survives a
 * round trip as exactly that rather than being coerced to empty strings or
 * rejected. Every NOT NULL boolean flag is `true`-when-present, exactly as
 * `ShareCharacter.allow_legacy` is: absent means the column's default of 0.
 */
export interface ShareWeapon {
  readonly name: string;
  readonly damage_dice?: string;
  readonly damage_type?: string;
  readonly versatile_damage_dice?: string;
  readonly ammunition_kind?: string;
  readonly range_normal_feet?: number;
  readonly range_long_feet?: number;
  readonly mastery_property?: string;
  readonly other_properties?: string;
  readonly notes?: string;
  readonly finesse?: true;
  readonly heavy?: true;
  readonly light?: true;
  readonly loading?: true;
  readonly reach?: true;
  readonly thrown?: true;
  readonly two_handed?: true;
  readonly ammunition?: true;
  readonly mastery_selected?: true;
}

/** The `true`-when-present flags of a weapon, in wire order. */
export const SHARE_WEAPON_FLAGS = [
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'thrown',
  'two_handed',
  'ammunition',
  'mastery_selected',
] as const satisfies readonly (keyof ShareWeapon)[];

/** The nullable text columns of a weapon, in wire order. */
export const SHARE_WEAPON_TEXT = [
  'damage_dice',
  'damage_type',
  'versatile_damage_dice',
  'ammunition_kind',
] as const satisfies readonly (keyof ShareWeapon)[];

export interface CharacterShareDocument {
  readonly format: typeof CHARACTER_SHARE_FORMAT;
  readonly version: typeof CHARACTER_SHARE_VERSION;
  readonly character: ShareCharacter;
  readonly classes: readonly ShareClass[];
  readonly sources: readonly ShareSource[];
  readonly selections: readonly ShareSelection[];
  readonly spellbook: readonly string[];
  readonly preferences: readonly SharePreference[];
  readonly overrides: readonly ShareOverride[];
  readonly acknowledgements?: readonly { readonly warning: string }[];
  readonly loadouts?: readonly ShareLoadout[];
  readonly placeholders?: readonly SharePlaceholder[];
  /**
   * OPTIONAL, AND THAT IS THE COMPATIBILITY GUARANTEE.
   *
   * Every share link generated before weapons travelled has no `weapons` key.
   * Making the field required would make each of those links unreadable, which
   * would be a far worse loss than the one this change closes. Absent means the
   * document predates weapons or the character has none — and both import to a
   * character with no weapons, which is correct in both cases.
   */
  readonly weapons?: readonly ShareWeapon[];
}

export class ShareValidationError extends TypeError {
  constructor(message: string) {
    super(`Invalid character share: ${message}`);
    this.name = 'ShareValidationError';
  }
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ShareValidationError(`${label} must be an object.`);
  }
  return value as JsonRecord;
}

function exactKeys(
  value: JsonRecord,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      throw new ShareValidationError(`${label} is missing ${key}.`);
    }
  }
  const allowed = new Set([...required, ...optional]);
  const unexpected = keys.find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    throw new ShareValidationError(
      `${label} contains unknown field ${unexpected}.`,
    );
  }
}

function list(
  value: unknown,
  label: string,
  maximum: number,
): unknown[] {
  if (!Array.isArray(value)) {
    throw new ShareValidationError(`${label} must be a list.`);
  }
  if (value.length > maximum) {
    throw new ShareValidationError(
      `${label} exceeds the maximum count of ${maximum}.`,
    );
  }
  return value;
}

function text(
  value: unknown,
  label: string,
  maximum = 240,
): string {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > maximum
  ) {
    throw new ShareValidationError(
      `${label} must be a string of 1-${maximum} characters.`,
    );
  }
  return value;
}

function integer(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < minimum ||
    Number(value) > maximum
  ) {
    throw new ShareValidationError(
      `${label} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return Number(value);
}

function spellKey(value: unknown, label: string): string {
  const key = text(value, label, 200);
  const reserved = new Set(['__proto__', 'prototype', 'constructor']);
  if (
    !isSpellVersionKey(key) ||
    key
      .split(/[:.]/)
      .some((component) => reserved.has(component))
  ) {
    throw new ShareValidationError(`${label} has invalid spell-key grammar.`);
  }
  return key;
}

function jsonValue(value: unknown, label: string, depth = 0): unknown {
  if (depth > 8) {
    throw new ShareValidationError(`${label} exceeds maximum nesting.`);
  }
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    if (typeof value === 'string' && value.length > 2_000) {
      throw new ShareValidationError(`${label} contains an overlong string.`);
    }
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    if (value.length > 200) {
      throw new ShareValidationError(`${label} contains too many items.`);
    }
    return value.map((item, index) =>
      jsonValue(item, `${label}[${index}]`, depth + 1),
    );
  }
  const source = record(value, label);
  const entries = Object.entries(source);
  if (entries.length > 100) {
    throw new ShareValidationError(`${label} contains too many fields.`);
  }
  return Object.fromEntries(
    entries.map(([key, item]) => {
      const field = text(key, `${label} field name`, 100);
      if (
        field === '__proto__' ||
        field === 'prototype' ||
        field === 'constructor'
      ) {
        throw new ShareValidationError(
          `${label} field name '${field}' is reserved.`,
        );
      }
      return [field, jsonValue(item, `${label}.${field}`, depth + 1)];
    }),
  );
}

function config(
  value: unknown,
  label: string,
): Readonly<Record<string, unknown>> {
  const decoded = jsonValue(value, label);
  const result = record(decoded, label);
  const rejectDatabaseIds = (
    item: unknown,
    itemLabel: string,
  ): void => {
    if (Array.isArray(item)) {
      item.forEach((entry, index) =>
        rejectDatabaseIds(entry, `${itemLabel}[${index}]`),
      );
      return;
    }
    if (item === null || typeof item !== 'object') {
      return;
    }
    for (const [key, entry] of Object.entries(item)) {
      if (key === 'spell_version_id') {
        throw new ShareValidationError(
          `${itemLabel}.spell_version_id is a database identifier and is not allowed in a share document.`,
        );
      }
      rejectDatabaseIds(entry, `${itemLabel}.${key}`);
    }
  };
  rejectDatabaseIds(result, label);
  return result;
}

/**
 * A non-negative distance in feet, or absent.
 *
 * `range_normal_feet` / `range_long_feet` are nullable integers with no CHECK,
 * so the schema itself permits any integer. The bound is a boundary judgement,
 * and it is the SAME judgement the write boundary makes — see
 * `WEAPON_RANGE_MAX_FEET`. Owning a separate number here is what let this
 * refuse a range the app had already stored.
 */
function weaponRange(value: unknown, label: string): number {
  return integer(value, label, 0, WEAPON_RANGE_MAX_FEET);
}

function shareWeapon(value: unknown, label: string): ShareWeapon {
  const row = record(value, label);
  exactKeys(
    row,
    ['name'],
    [
      ...SHARE_WEAPON_TEXT,
      'range_normal_feet',
      'range_long_feet',
      'mastery_property',
      'other_properties',
      'notes',
      ...SHARE_WEAPON_FLAGS,
    ],
    label,
  );
  const weapon: Record<string, unknown> = {
    name: text(row.name, `${label}.name`, WEAPON_TEXT_LIMITS.name),
  };
  for (const field of SHARE_WEAPON_TEXT) {
    if (row[field] !== undefined) {
      weapon[field] = text(
        row[field],
        `${label}.${field}`,
        WEAPON_TEXT_LIMITS[field],
      );
    }
  }
  for (const field of ['range_normal_feet', 'range_long_feet'] as const) {
    if (row[field] !== undefined) {
      weapon[field] = weaponRange(row[field], `${label}.${field}`);
    }
  }
  if (row.mastery_property !== undefined) {
    const property = text(
      row.mastery_property,
      `${label}.mastery_property`,
      WEAPON_TEXT_LIMITS.mastery_property,
    );
    if (
      !weaponMasteryProperties.includes(
        property as (typeof weaponMasteryProperties)[number],
      )
    ) {
      throw new ShareValidationError(
        `${label}.mastery_property is unsupported.`,
      );
    }
    weapon.mastery_property = property;
  }
  // The two long free-text columns. The cap names the weapon and the field when
  // a hostile document sends 400 KB of prose, instead of letting it surface far
  // away as a compressed-byte overflow. It is the write boundary's own number,
  // so it can never refuse text this app itself allowed the user to store.
  for (const field of ['other_properties', 'notes'] as const) {
    if (row[field] !== undefined) {
      weapon[field] = text(
        row[field],
        `${label}.${field}`,
        WEAPON_TEXT_LIMITS[field],
      );
    }
  }
  for (const flag of SHARE_WEAPON_FLAGS) {
    if (row[flag] === undefined) {
      continue;
    }
    if (row[flag] !== true) {
      throw new ShareValidationError(
        `${label}.${flag} must be true when present.`,
      );
    }
    weapon[flag] = true;
  }
  // The database's own CHECK, applied at the boundary through the SAME rule the
  // portable backup and the quarantined-image audit use. Reaching the INSERT
  // with this pair would abort the whole import transaction with a raw
  // SQLITE_CONSTRAINT_CHECK naming nothing.
  const mastery = weaponMasterySelectionError(
    {
      mastery_selected: weapon.mastery_selected === true ? 1 : 0,
      mastery_property: weapon.mastery_property ?? null,
    },
    label,
  );
  if (mastery !== null) {
    throw new ShareValidationError(mastery);
  }
  return weapon as unknown as ShareWeapon;
}

function assertUnique(
  values: readonly string[],
  label: string,
): void {
  if (new Set(values).size !== values.length) {
    throw new ShareValidationError(`${label} contains duplicate records.`);
  }
}

export function validateShareDocument(
  input: unknown,
): CharacterShareDocument {
  const source = record(input, 'document');
  exactKeys(
    source,
    [
      'format',
      'version',
      'character',
      'classes',
      'sources',
      'selections',
      'spellbook',
      'preferences',
      'overrides',
    ],
    ['acknowledgements', 'loadouts', 'placeholders', 'weapons'],
    'document',
  );
  if (source.format !== CHARACTER_SHARE_FORMAT) {
    throw new ShareValidationError('format is unsupported.');
  }
  if (source.version !== CHARACTER_SHARE_VERSION) {
    throw new ShareValidationError('version is unsupported.');
  }

  const rawCharacter = record(source.character, 'character');
  exactKeys(
    rawCharacter,
    ['name'],
    [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
      'proficiency_bonus_override',
      'rules_edition_preference',
      'allow_legacy',
    ],
    'character',
  );
  const character: Record<string, unknown> = {
    name: text(rawCharacter.name, 'character.name', 120),
  };
  for (const ability of [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ] as const) {
    if (rawCharacter[ability] !== undefined) {
      character[ability] = integer(
        rawCharacter[ability],
        `character.${ability}`,
        1,
        30,
      );
    }
  }
  if (rawCharacter.proficiency_bonus_override !== undefined) {
    character.proficiency_bonus_override = integer(
      rawCharacter.proficiency_bonus_override,
      'character.proficiency_bonus_override',
      1,
      20,
    );
  }
  if (rawCharacter.rules_edition_preference !== undefined) {
    const edition = text(
      rawCharacter.rules_edition_preference,
      'character.rules_edition_preference',
      20,
    );
    if (!rulesEditions.includes(edition as (typeof rulesEditions)[number])) {
      throw new ShareValidationError(
        'character.rules_edition_preference is unsupported.',
      );
    }
    character.rules_edition_preference = edition;
  }
  if (rawCharacter.allow_legacy !== undefined) {
    if (rawCharacter.allow_legacy !== true) {
      throw new ShareValidationError(
        'character.allow_legacy must be true when present.',
      );
    }
    character.allow_legacy = true;
  }

  const rawClasses = list(
    source.classes,
    'classes',
    SHARE_LIMITS.classes,
  );
  const classes = rawClasses.map((item, index): ShareClass => {
    const row = record(item, `classes[${index}]`);
    exactKeys(
      row,
      ['id', 'classKey', 'level', 'start'],
      ['subclassKey', 'ability', 'config', 'subclassConfig'],
      `classes[${index}]`,
    );
    const ability =
      row.ability === undefined
        ? undefined
        : text(row.ability, `classes[${index}].ability`, 20);
    if (
      ability !== undefined &&
      !abilities.includes(ability as (typeof abilities)[number])
    ) {
      throw new ShareValidationError(
        `classes[${index}].ability is unsupported.`,
      );
    }
    return {
      id: integer(row.id, `classes[${index}].id`, 0, 119),
      classKey: text(row.classKey, `classes[${index}].classKey`, 200),
      level: integer(row.level, `classes[${index}].level`, 1, 20),
      start: integer(row.start, `classes[${index}].start`, 1, 20),
      ...(row.subclassKey === undefined
        ? {}
        : {
            subclassKey: text(
              row.subclassKey,
              `classes[${index}].subclassKey`,
              200,
            ),
          }),
      ...(ability === undefined ? {} : { ability }),
      ...(row.config === undefined
        ? {}
        : { config: config(row.config, `classes[${index}].config`) }),
      ...(row.subclassConfig === undefined
        ? {}
        : {
            subclassConfig: config(
              row.subclassConfig,
              `classes[${index}].subclassConfig`,
            ),
          }),
    };
  });
  assertUnique(
    classes.map((item) => item.classKey),
    'classes',
  );
  if (
    classes.reduce((total, item) => total + item.level, 0) > 20
  ) {
    throw new ShareValidationError(
      'combined class levels must not exceed 20.',
    );
  }

  const allowedTypes = new Set(['feat', 'species', 'background']);
  const rawSources = list(
    source.sources,
    'sources',
    SHARE_LIMITS.sources,
  );
  const sources = rawSources.map((item, index): ShareSource => {
    const row = record(item, `sources[${index}]`);
    exactKeys(
      row,
      ['id', 'type', 'key', 'acquired'],
      ['name', 'config'],
      `sources[${index}]`,
    );
    const type = text(row.type, `sources[${index}].type`, 20);
    if (!allowedTypes.has(type)) {
      throw new ShareValidationError(
        `sources[${index}].type is unsupported.`,
      );
    }
    return {
      id: integer(row.id, `sources[${index}].id`, 0, 119),
      type: type as ShareSource['type'],
      key: text(row.key, `sources[${index}].key`, 200),
      ...(row.name === undefined
        ? {}
        : { name: text(row.name, `sources[${index}].name`, 120) }),
      acquired: integer(
        row.acquired,
        `sources[${index}].acquired`,
        1,
        20,
      ),
      ...(row.config === undefined
        ? {}
        : { config: config(row.config, `sources[${index}].config`) }),
    };
  });

  const ids = [...classes, ...sources].map((item) => item.id);
  if (
    new Set(ids).size !== ids.length ||
    [...ids].sort((a, b) => a - b).some((id, index) => id !== index)
  ) {
    throw new ShareValidationError(
      'class/source ids must be unique and contiguous from zero.',
    );
  }
  const knownIds = new Set(ids);

  const selections = list(
    source.selections,
    'selections',
    SHARE_LIMITS.selections,
  ).map((item, index): ShareSelection => {
    const row = record(item, `selections[${index}]`);
    exactKeys(
      row,
      ['ref', 'ruleKey', 'ordinal', 'spellKey'],
      ['spellName', 'keep'],
      `selections[${index}]`,
    );
    const ref = integer(row.ref, `selections[${index}].ref`, 0, 119);
    if (!knownIds.has(ref)) {
      throw new ShareValidationError(
        `selections[${index}].ref is unknown.`,
      );
    }
    if (row.keep !== undefined && row.keep !== true) {
      throw new ShareValidationError(
        `selections[${index}].keep must be true when present.`,
      );
    }
    return {
      ref,
      ruleKey: text(
        row.ruleKey,
        `selections[${index}].ruleKey`,
        240,
      ),
      ordinal: integer(
        row.ordinal,
        `selections[${index}].ordinal`,
        1,
        1_000,
      ),
      spellKey: spellKey(
        row.spellKey,
        `selections[${index}].spellKey`,
      ),
      ...(row.spellName === undefined
        ? {}
        : {
            spellName: text(
              row.spellName,
              `selections[${index}].spellName`,
              120,
            ),
          }),
      ...(row.keep === true ? { keep: true as const } : {}),
    };
  });
  assertUnique(
    selections.map(
      (item) =>
        `${item.ref}\u0000${item.ruleKey}\u0000${item.ordinal}`,
    ),
    'selections',
  );

  const spellbook = list(
    source.spellbook,
    'spellbook',
    SHARE_LIMITS.spellbook,
  ).map((item, index) => spellKey(item, `spellbook[${index}]`));
  assertUnique(spellbook, 'spellbook');
  const preferences = list(
    source.preferences,
    'preferences',
    SHARE_LIMITS.preferences,
  ).map((item, index): SharePreference => {
    const row = record(item, `preferences[${index}]`);
    exactKeys(
      row,
      ['spellKey', 'favourite'],
      [],
      `preferences[${index}]`,
    );
    if (typeof row.favourite !== 'boolean') {
      throw new ShareValidationError(
        `preferences[${index}].favourite must be boolean.`,
      );
    }
    return {
      spellKey: spellKey(
        row.spellKey,
        `preferences[${index}].spellKey`,
      ),
      favourite: row.favourite,
    };
  });
  assertUnique(
    preferences.map((item) => item.spellKey),
    'preferences',
  );
  const overrides = list(
    source.overrides,
    'overrides',
    SHARE_LIMITS.overrides,
  ).map((item, index): ShareOverride => {
    const row = record(item, `overrides[${index}]`);
    exactKeys(row, ['ruleKey', 'value'], [], `overrides[${index}]`);
    return {
      ruleKey: text(
        row.ruleKey,
        `overrides[${index}].ruleKey`,
        240,
      ),
      value: jsonValue(row.value, `overrides[${index}].value`),
    };
  });
  assertUnique(
    overrides.map((item) => item.ruleKey),
    'overrides',
  );

  let acknowledgements:
    | CharacterShareDocument['acknowledgements']
    | undefined;
  if (source.acknowledgements !== undefined) {
    acknowledgements = list(
      source.acknowledgements,
      'acknowledgements',
      SHARE_LIMITS.acknowledgements,
    ).map((item, index) => {
      const row = record(item, `acknowledgements[${index}]`);
      exactKeys(row, ['warning'], [], `acknowledgements[${index}]`);
      return {
        warning: text(
          row.warning,
          `acknowledgements[${index}].warning`,
          500,
        ),
      };
    });
    assertUnique(
      acknowledgements.map((item) => item.warning),
      'acknowledgements',
    );
  }

  let totalEntries = 0;
  let loadouts: CharacterShareDocument['loadouts'] | undefined;
  if (source.loadouts !== undefined) {
    loadouts = list(
      source.loadouts,
      'loadouts',
      SHARE_LIMITS.loadouts,
    ).map((item, index): ShareLoadout => {
      const row = record(item, `loadouts[${index}]`);
      exactKeys(row, ['name', 'entries'], [], `loadouts[${index}]`);
      const entries = list(
        row.entries,
        `loadouts[${index}].entries`,
        SHARE_LIMITS.loadoutEntries,
      ).map((entry, entryIndex) => {
        totalEntries += 1;
        if (totalEntries > SHARE_LIMITS.loadoutEntries) {
          throw new ShareValidationError(
            `loadout entries exceed the maximum count of ${SHARE_LIMITS.loadoutEntries}.`,
          );
        }
        const entryRow = record(
          entry,
          `loadouts[${index}].entries[${entryIndex}]`,
        );
        exactKeys(
          entryRow,
          ['spellKey', 'role'],
          [],
          `loadouts[${index}].entries[${entryIndex}]`,
        );
        return {
          spellKey: spellKey(
            entryRow.spellKey,
            `loadouts[${index}].entries[${entryIndex}].spellKey`,
          ),
          role: text(
            entryRow.role,
            `loadouts[${index}].entries[${entryIndex}].role`,
            100,
          ),
        };
      });
      assertUnique(
        entries.map(
          (entry) => `${entry.spellKey}\u0000${entry.role}`,
        ),
        `loadouts[${index}].entries`,
      );
      return {
        name: text(row.name, `loadouts[${index}].name`, 120),
        entries,
      };
    });
  }

  let placeholders: CharacterShareDocument['placeholders'] | undefined;
  if (source.placeholders !== undefined) {
    placeholders = list(
      source.placeholders,
      'placeholders',
      SHARE_LIMITS.placeholders,
    ).map((item, index): SharePlaceholder => {
      const row = record(item, `placeholders[${index}]`);
      exactKeys(
        row,
        ['spellKey', 'spellName'],
        [],
        `placeholders[${index}]`,
      );
      return {
        spellKey: spellKey(
          row.spellKey,
          `placeholders[${index}].spellKey`,
        ),
        spellName: text(
          row.spellName,
          `placeholders[${index}].spellName`,
          120,
        ),
      };
    });
    assertUnique(
      placeholders.map((item) => item.spellKey),
      'placeholders',
    );
  }

  let weapons: CharacterShareDocument['weapons'] | undefined;
  if (source.weapons !== undefined) {
    weapons = list(source.weapons, 'weapons', SHARE_LIMITS.weapons).map(
      (item, index) => shareWeapon(item, `weapons[${index}]`),
    );
    // NOT `assertUnique`. Two identical weapons is a normal thing to own — a
    // pair of daggers, a quiver of javelins — and each is its own row with its
    // own mastery flag. Every other section here is keyed by something the
    // database makes unique; weapons are not.
  }

  return {
    format: CHARACTER_SHARE_FORMAT,
    version: CHARACTER_SHARE_VERSION,
    character: character as unknown as ShareCharacter,
    classes,
    sources,
    selections,
    spellbook,
    preferences,
    overrides,
    ...(acknowledgements === undefined ? {} : { acknowledgements }),
    ...(loadouts === undefined ? {} : { loadouts }),
    ...(placeholders === undefined ? {} : { placeholders }),
    ...(weapons === undefined ? {} : { weapons }),
  };
}
