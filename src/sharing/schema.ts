import { isSpellVersionKey } from '../catalog/catalog-key';
import { abilities, rulesEditions } from '../domain/enums';

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
    ['acknowledgements', 'loadouts', 'placeholders'],
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
  };
}
