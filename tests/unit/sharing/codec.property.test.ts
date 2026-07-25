import { inspect } from 'node:util';
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
  type CharacterShareDocument,
  validateShareDocument,
} from '../../../src/sharing/schema';

type Random = () => number;
type JsonObject = Record<string, unknown>;

const TEXT_VALUES = [
  'x',
  'short ASCII',
  'tab\tline\nquote"slash\\',
  'e\u0301',
  '🧙',
  'a\r\nb\u0000c',
] as const;

const JSON_LEAVES = [
  null,
  false,
  true,
  0,
  -0,
  -7,
  9,
  0.5,
  -1.25,
  Number.MIN_VALUE,
  1e308,
  'x',
  'tab\tline\nquote"slash\\braces[{()}]🧙',
] as const;

function mulberry32(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function integer(random: Random, maximum: number): number {
  return Math.floor(random() * maximum);
}

function pick<T>(random: Random, values: readonly T[]): T {
  return values[integer(random, values.length)] as T;
}

function textValue(random: Random, suffix = ''): string {
  return `${pick(random, TEXT_VALUES)}${suffix}`;
}

function spellKey(index: number): string {
  return index % 2 === 0
    ? `2024:spell-${index}`
    : `2024:example.test:spell-${index}`;
}

function jsonValue(random: Random, depth = 0): unknown {
  if (depth >= 3 || random() < 0.58) {
    return pick(random, JSON_LEAVES);
  }
  if (random() < 0.5) {
    return Array.from(
      { length: integer(random, 4) },
      () => jsonValue(random, depth + 1),
    );
  }
  return Object.fromEntries(
    Array.from({ length: integer(random, 4) }, (_, index) => [
      `field-${depth}-${index}`,
      jsonValue(random, depth + 1),
    ]),
  );
}

function optionalConfig(
  random: Random,
): Readonly<Record<string, unknown>> | undefined {
  const mode = integer(random, 3);
  if (mode === 0) {
    return undefined;
  }
  if (mode === 1) {
    return {};
  }
  return {
    value: jsonValue(random),
    nested: { escaped: textValue(random) },
  };
}

function generateDocument(seed: number): CharacterShareDocument {
  const random = mulberry32(seed);
  const classCount = integer(random, 5);
  const sourceCount = integer(random, 6);
  const ownerCount = classCount + sourceCount;
  let remainingLevels = 20;
  const classes = Array.from({ length: classCount }, (_, index) => {
    const remainingClasses = classCount - index;
    const maximum = remainingLevels - (remainingClasses - 1);
    const level = 1 + integer(random, Math.min(8, maximum));
    remainingLevels -= level;
    const config = optionalConfig(random);
    const subclassConfig = optionalConfig(random);
    return {
      id: index,
      classKey: `class-${seed}-${index}`,
      level,
      start: 1 + integer(random, 20),
      ...(random() < 0.5
        ? {}
        : { subclassKey: textValue(random, `-${seed}-${index}`) }),
      ...(random() < 0.5
        ? {}
        : {
            ability: pick(random, [
              'strength',
              'dexterity',
              'constitution',
              'intelligence',
              'wisdom',
              'charisma',
            ] as const),
          }),
      ...(config === undefined ? {} : { config }),
      ...(subclassConfig === undefined ? {} : { subclassConfig }),
    };
  });
  const sources = Array.from({ length: sourceCount }, (_, index) => {
    const config = optionalConfig(random);
    return {
      id: classCount + index,
      type: pick(random, ['feat', 'species', 'background'] as const),
      key: `source-${seed}-${index}`,
      acquired: 1 + integer(random, 20),
      ...(random() < 0.34 ? {} : { name: textValue(random) }),
      ...(config === undefined ? {} : { config }),
    };
  });
  const selectionCount =
    ownerCount === 0 ? 0 : integer(random, Math.min(20, ownerCount * 4) + 1);
  const identities = new Set<string>();
  const selections = Array.from({ length: selectionCount }, (_, index) => {
    const ref = integer(random, ownerCount);
    let ruleKey = textValue(random, `-rule-${index}`);
    let ordinal = 1 + integer(random, 8);
    while (identities.has(`${ref}\u0000${ruleKey}\u0000${ordinal}`)) {
      ruleKey += '-x';
      ordinal += 1;
    }
    identities.add(`${ref}\u0000${ruleKey}\u0000${ordinal}`);
    return {
      ref,
      ruleKey,
      ordinal,
      spellKey: spellKey(index),
      ...(random() < 0.5 ? {} : { spellName: textValue(random) }),
      ...(random() < 0.5 ? {} : { keep: true as const }),
    };
  });
  const spellbook = Array.from(
    { length: integer(random, 7) },
    (_, index) => spellKey(100 + index),
  );
  const preferences = Array.from(
    { length: integer(random, 7) },
    (_, index) => ({
      spellKey: spellKey(200 + index),
      favourite: random() < 0.5,
    }),
  );
  const overrides = Array.from(
    { length: integer(random, 7) },
    (_, index) => ({
      ruleKey: textValue(random, `-override-${index}`),
      value: jsonValue(random),
    }),
  );
  const acknowledgementMode = integer(random, 3);
  const loadoutMode = integer(random, 3);
  const placeholderMode = integer(random, 3);
  const loadoutCount = loadoutMode === 2 ? 1 + integer(random, 4) : 0;
  let loadoutEntryIndex = 0;
  const loadouts = Array.from({ length: loadoutCount }, (_, loadoutIndex) => ({
    name: textValue(random, `-loadout-${loadoutIndex}`),
    entries: Array.from(
      { length: integer(random, 7) },
      (_, entryIndex) => ({
        spellKey: spellKey(300 + loadoutEntryIndex++),
        role: textValue(random, `-role-${entryIndex}`),
      }),
    ),
  }));
  const ability = (): number => pick(random, [1, 1, 10, 10, 30, 30]);
  const character: CharacterShareDocument['character'] = {
    name: textValue(random),
    ...(random() < 0.5 ? {} : { strength: ability() }),
    ...(random() < 0.5 ? {} : { dexterity: ability() }),
    ...(random() < 0.5 ? {} : { constitution: ability() }),
    ...(random() < 0.5 ? {} : { intelligence: ability() }),
    ...(random() < 0.5 ? {} : { wisdom: ability() }),
    ...(random() < 0.5 ? {} : { charisma: ability() }),
    ...(random() < 0.5
      ? {}
      : { proficiency_bonus_override: pick(random, [1, 10, 20]) }),
    ...(random() < 0.5
      ? {}
      : {
          rules_edition_preference: pick(random, ['2014', '2024']),
        }),
    ...(random() < 0.5 ? {} : { allow_legacy: true }),
  };
  return validateShareDocument({
    format: CHARACTER_SHARE_FORMAT,
    version: CHARACTER_SHARE_VERSION,
    character,
    classes,
    sources,
    selections,
    spellbook,
    preferences,
    overrides,
    ...(acknowledgementMode === 0
      ? {}
      : {
          acknowledgements:
            acknowledgementMode === 1
              ? []
              : Array.from(
                  { length: 1 + integer(random, 5) },
                  (_, index) => ({
                    warning: textValue(random, `-warning-${index}`),
                  }),
                ),
        }),
    ...(loadoutMode === 0 ? {} : { loadouts }),
    ...(placeholderMode === 0
      ? {}
      : {
          placeholders:
            placeholderMode === 1
              ? []
              : Array.from(
                  { length: 1 + integer(random, 5) },
                  (_, index) => ({
                    spellKey: spellKey(400 + index),
                    spellName: textValue(random),
                  }),
                ),
        }),
  });
}

async function propertyFailure(
  document: CharacterShareDocument,
): Promise<Error | null> {
  try {
    const expected = validateShareDocument(document);
    expect(
      positionalToShareDocument(shareDocumentToPositional(document)),
    ).toEqual(expected);
    expect(
      await decodeShareFragment(await encodeShareFragment(document)),
    ).toEqual(expected);
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

function removeOwners(
  document: CharacterShareDocument,
  removed: ReadonlySet<number>,
): CharacterShareDocument {
  const survivingIds = [...document.classes, ...document.sources]
    .map((owner) => owner.id)
    .filter((id) => !removed.has(id))
    .sort((left, right) => left - right);
  const rewritten = new Map(
    survivingIds.map((id, index) => [id, index] as const),
  );
  return validateShareDocument({
    ...document,
    classes: document.classes
      .filter((row) => !removed.has(row.id))
      .map((row) => ({ ...row, id: rewritten.get(row.id) })),
    sources: document.sources
      .filter((row) => !removed.has(row.id))
      .map((row) => ({ ...row, id: rewritten.get(row.id) })),
    selections: document.selections.flatMap((row) => {
      const ref = rewritten.get(row.ref);
      return ref === undefined ? [] : [{ ...row, ref }];
    }),
  });
}

function halves<T>(values: readonly T[]): readonly T[][] {
  if (values.length === 0) {
    return [];
  }
  const midpoint = Math.ceil(values.length / 2);
  return [
    values.slice(0, midpoint),
    values.slice(midpoint),
    [],
  ].filter(
    (candidate, index, candidates) =>
      candidate.length < values.length &&
      candidates.findIndex(
        (other) =>
          other.length === candidate.length &&
          other.every((value, valueIndex) => value === candidate[valueIndex]),
      ) === index,
  );
}

function jsonShrinks(value: unknown): readonly unknown[] {
  if (typeof value === 'number') {
    return [0, 1, -1, 10, 30].filter(
      (candidate) => !Object.is(candidate, value),
    );
  }
  if (typeof value === 'string') {
    return value === 'x' ? [] : ['x'];
  }
  if (Array.isArray(value)) {
    return [
      ...halves(value),
      ...value.flatMap((item, index) =>
        jsonShrinks(item).map((shrunk) => [
          ...value.slice(0, index),
          shrunk,
          ...value.slice(index + 1),
        ]),
      ),
    ];
  }
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const entries = Object.entries(value);
  const removed = halves(entries).map((candidate) =>
    Object.fromEntries(candidate),
  );
  const renamed = entries.flatMap(([key, item], index) =>
    key === 'x' || Object.hasOwn(value, 'x')
      ? []
      : [
          Object.fromEntries([
            ...entries.slice(0, index),
            ['x', item],
            ...entries.slice(index + 1),
          ]),
        ],
  );
  const values = entries.flatMap(([key, item], index) =>
    jsonShrinks(item).map((shrunk) =>
      Object.fromEntries([
        ...entries.slice(0, index),
        [key, shrunk],
        ...entries.slice(index + 1),
      ]),
    ),
  );
  return [...removed, ...renamed, ...values];
}

function optionalFieldShrinks(
  document: CharacterShareDocument,
): CharacterShareDocument[] {
  const result: CharacterShareDocument[] = [];
  const omit = (
    source: object,
    key: string,
  ): JsonObject =>
    Object.fromEntries(
      Object.entries(source).filter(([field]) => field !== key),
    );
  for (const key of [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
    'proficiency_bonus_override',
    'rules_edition_preference',
    'allow_legacy',
  ]) {
    if (Object.hasOwn(document.character, key)) {
      result.push(
        validateShareDocument({
          ...document,
          character: omit(document.character, key),
        }),
      );
    }
  }
  for (const key of ['acknowledgements', 'loadouts', 'placeholders']) {
    if (Object.hasOwn(document, key)) {
      result.push(validateShareDocument(omit(document, key)));
    }
  }
  document.classes.forEach((row, index) => {
    for (const key of [
      'subclassKey',
      'ability',
      'config',
      'subclassConfig',
    ]) {
      if (Object.hasOwn(row, key)) {
        const classes = [...document.classes];
        classes[index] = omit(row, key) as unknown as typeof row;
        result.push(validateShareDocument({ ...document, classes }));
      }
    }
  });
  document.sources.forEach((row, index) => {
    for (const key of ['name', 'config']) {
      if (Object.hasOwn(row, key)) {
        const sources = [...document.sources];
        sources[index] = omit(row, key) as unknown as typeof row;
        result.push(validateShareDocument({ ...document, sources }));
      }
    }
  });
  document.selections.forEach((row, index) => {
    for (const key of ['spellName', 'keep']) {
      if (Object.hasOwn(row, key)) {
        const selections = [...document.selections];
        selections[index] = omit(row, key) as unknown as typeof row;
        result.push(validateShareDocument({ ...document, selections }));
      }
    }
  });
  return result;
}

function collectionShrinks(
  document: CharacterShareDocument,
): CharacterShareDocument[] {
  const result: CharacterShareDocument[] = [];
  for (const group of [
    document.classes.map((row) => row.id),
    document.sources.map((row) => row.id),
  ]) {
    for (const kept of halves(group)) {
      const keep = new Set(kept);
      const removed = new Set(group.filter((id) => !keep.has(id)));
      result.push(removeOwners(document, removed));
    }
  }
  for (const key of [
    'selections',
    'spellbook',
    'preferences',
    'overrides',
    'acknowledgements',
    'loadouts',
    'placeholders',
  ] as const) {
    const collection = document[key];
    if (collection === undefined) {
      continue;
    }
    for (const candidate of halves(
      collection as readonly unknown[],
    )) {
      result.push(
        validateShareDocument({ ...document, [key]: candidate }),
      );
    }
  }
  document.loadouts?.forEach((loadout, index) => {
    for (const entries of halves(loadout.entries)) {
      const loadouts = [...(document.loadouts ?? [])];
      loadouts[index] = { ...loadout, entries };
      result.push(validateShareDocument({ ...document, loadouts }));
    }
  });
  return result;
}

function jsonFieldShrinks(
  document: CharacterShareDocument,
): CharacterShareDocument[] {
  const result: CharacterShareDocument[] = [];
  const shrinkConfig = (
    collection: 'classes' | 'sources',
    index: number,
    key: 'config' | 'subclassConfig',
    value: Readonly<Record<string, unknown>>,
  ): void => {
    for (const shrunk of jsonShrinks(value)) {
      if (
        shrunk === null ||
        typeof shrunk !== 'object' ||
        Array.isArray(shrunk)
      ) {
        continue;
      }
      const rows = [...document[collection]];
      rows[index] = {
        ...rows[index],
        [key]: shrunk,
      } as (typeof rows)[number];
      result.push(
        validateShareDocument({ ...document, [collection]: rows }),
      );
    }
  };
  document.classes.forEach((row, index) => {
    if (row.config !== undefined) {
      shrinkConfig('classes', index, 'config', row.config);
    }
    if (row.subclassConfig !== undefined) {
      shrinkConfig(
        'classes',
        index,
        'subclassConfig',
        row.subclassConfig,
      );
    }
  });
  document.sources.forEach((row, index) => {
    if (row.config !== undefined) {
      shrinkConfig('sources', index, 'config', row.config);
    }
  });
  document.overrides.forEach((row, index) => {
    for (const value of jsonShrinks(row.value)) {
      const overrides = [...document.overrides];
      overrides[index] = { ...row, value };
      result.push(validateShareDocument({ ...document, overrides }));
    }
  });
  return result;
}

function contractNumberShrinks(
  document: CharacterShareDocument,
): CharacterShareDocument[] {
  const result: CharacterShareDocument[] = [];
  document.classes.forEach((row, index) => {
    for (const field of ['level', 'start'] as const) {
      if (row[field] === 1) {
        continue;
      }
      const classes = [...document.classes];
      classes[index] = { ...row, [field]: 1 };
      try {
        result.push(validateShareDocument({ ...document, classes }));
      } catch {
        // The combined-level constraint can invalidate an intermediate shrink.
      }
    }
  });
  document.sources.forEach((row, index) => {
    if (row.acquired !== 1) {
      const sources = [...document.sources];
      sources[index] = { ...row, acquired: 1 };
      result.push(validateShareDocument({ ...document, sources }));
    }
  });
  document.selections.forEach((row, index) => {
    if (row.ordinal !== 1) {
      const selections = [...document.selections];
      selections[index] = { ...row, ordinal: 1 };
      try {
        result.push(validateShareDocument({ ...document, selections }));
      } catch {
        // A rewritten ordinal may collide with another slot identity.
      }
    }
  });
  return result;
}

function stringShrinks(
  document: CharacterShareDocument,
): CharacterShareDocument[] {
  const result: CharacterShareDocument[] = [];
  const visit = (
    value: unknown,
    path: readonly (string | number)[] = [],
  ): void => {
    if (typeof value === 'string') {
      const field = path.at(-1);
      if (
        value === 'x' ||
        field === 'format' ||
        field === 'type' ||
        field === 'ability' ||
        field === 'rules_edition_preference'
      ) {
        return;
      }
      const replacement = field === 'spellKey' ? '2024:x' : 'x';
      const clone = structuredClone(document) as unknown as JsonObject;
      let target: unknown = clone;
      for (const segment of path.slice(0, -1)) {
        target =
          typeof segment === 'number'
            ? (target as unknown[])[segment]
            : (target as JsonObject)[segment];
      }
      if (typeof field === 'number') {
        (target as unknown[])[field] = replacement;
      } else if (typeof field === 'string') {
        (target as JsonObject)[field] = replacement;
      }
      try {
        result.push(validateShareDocument(clone));
      } catch {
        // Candidate collisions are invalid domain shrinks and are discarded.
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, index]));
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        visit(item, [...path, key]);
      }
    }
  };
  visit(document);
  return result;
}

async function shrinkFailure(
  original: CharacterShareDocument,
): Promise<CharacterShareDocument> {
  let current = original;
  const seen = new Set<string>();
  const fingerprint = (document: CharacterShareDocument): string =>
    JSON.stringify(document, (_key, value) =>
      typeof value === 'number' && Object.is(value, -0)
        ? '__negative_zero__'
        : value,
    );
  seen.add(fingerprint(current));
  while (true) {
    const candidates = [
      ...collectionShrinks(current),
      ...optionalFieldShrinks(current),
      ...jsonFieldShrinks(current),
      ...contractNumberShrinks(current),
      ...stringShrinks(current),
    ];
    let smaller: CharacterShareDocument | undefined;
    for (const candidate of candidates) {
      const key = fingerprint(candidate);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      try {
        validateShareDocument(candidate);
      } catch {
        continue;
      }
      if ((await propertyFailure(candidate)) !== null) {
        smaller = candidate;
        break;
      }
    }
    if (smaller === undefined) {
      return current;
    }
    current = smaller;
  }
}

describe('character-share seeded codec property', () => {
  it('round-trips every validator-valid generated document through both codec paths', async () => {
    const replay = process.env.SHARE_PROPERTY_SEED;
    const seeds =
      replay === undefined
        ? Array.from({ length: 500 }, (_, index) => index + 1)
        : [Number.parseInt(replay, 10)];
    for (const seed of seeds) {
      const document = generateDocument(seed);
      const failure = await propertyFailure(document);
      if (failure === null) {
        continue;
      }
      const shrunk = await shrinkFailure(document);
      console.error(`\n========== FAILING SHARE PROPERTY SEED: ${seed} ==========`);
      console.error(
        `Replay with: SHARE_PROPERTY_SEED=${seed} npm test -- tests/unit/sharing/codec.property.test.ts`,
      );
      console.error('Shrunk counterexample:');
      console.error(inspect(shrunk, { depth: null, compact: false }));
      throw new Error(
        `Share codec property failed for seed ${seed}.\n${failure.stack ?? failure.message}`,
      );
    }
  });
});
