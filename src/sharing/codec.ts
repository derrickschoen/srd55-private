import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  SHARE_LIMITS,
  ShareValidationError,
  type CharacterShareDocument,
  validateShareDocument,
} from './schema';

type Tuple = readonly unknown[];

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
  ];
}

export function positionalToShareDocument(
  input: unknown,
): CharacterShareDocument {
  const root = tuple(input, 11, 'wire document');
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
