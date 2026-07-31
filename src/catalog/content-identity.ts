import type { Brand } from '../domain/ids';
import type { ContentKey } from '../domain/ids';
import { sha256 } from '../crypto/sha256';
import { isCatalogKeyComponent } from './catalog-key';

/**
 * THE FROZEN CONTENT-V1 IDENTITY KERNEL.
 *
 * New names are normalized with the JavaScript runtime's Unicode tables:
 * NFKD and Unicode property escapes intentionally follow that engine's UCD.
 * Cross-engine convergence is therefore best-effort, not an integrity rule.
 *
 * The first successful derivation is the stability boundary. Once persisted,
 * the content key, normalized name, canonical envelope bytes, and digest are
 * authoritative. Stored content must be checked by hashing its stored
 * canonical bytes; boot, audit, export, and integrity paths must never
 * renormalize its display name under the current engine and compare that result
 * with the stored identity. `verifyStoredContentIdentityV1` embodies that
 * boundary: it verifies bytes → digest → key and returns the exact bytes
 * without parsing or reprojecting them.
 *
 * Projectors, rather than this generic serializer, own semantic field shape:
 * optional fields must pass through `contentIdentityOptional`, empty
 * collections must be emitted, rule prose and open passthrough strings must use
 * their canonicalizers, and ids/timestamps/provenance must never be projected.
 */

export type NormalizedContentName = Brand<
  string,
  'NormalizedContentNameV1'
>;
export type CanonicalRuleText = Brand<string, 'CanonicalRuleTextV1'>;
export type CanonicalOpenPassthroughValue = Brand<
  string,
  'CanonicalOpenPassthroughValueV1'
>;
export type ContentFingerprintScheme = Brand<
  'content-v1',
  'ContentFingerprintScheme'
>;
export type ContentFingerprintDigest = Brand<
  string,
  'ContentFingerprintDigest'
>;
export type DerivedContentKey = Brand<ContentKey, 'DerivedContentKey'>;
export type CanonicalContentIdentityJson = Brand<
  string,
  'CanonicalContentIdentityJson'
>;

export const contentKinds = [
  'class',
  'subclass',
  'feat',
  'species',
  'background',
  'spell',
  'weapon',
  'armor',
  'item',
] as const;
export type ContentKind = (typeof contentKinds)[number];

export const CONTENT_FINGERPRINT_SCHEME_V1 =
  'content-v1' as ContentFingerprintScheme;

export interface ContentFingerprintSchemeDefinition {
  readonly scheme: ContentFingerprintScheme;
  readonly keySegment: 'content.v1';
  readonly predecessor: null;
}

export const contentFingerprintSchemeRegistry = Object.freeze({
  'content-v1': Object.freeze({
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    keySegment: 'content.v1',
    predecessor: null,
  }),
}) satisfies Readonly<
  Record<'content-v1', ContentFingerprintSchemeDefinition>
>;

/**
 * Content-v1 has no predecessor. A future scheme adds only its adjacent,
 * lossless compatibility projector here; it must not alter the v1 entry above.
 */
export const adjacentContentFingerprintCompatibilityRegistry = Object.freeze(
  {},
) satisfies Readonly<
  Partial<Record<'content-v1', (value: unknown) => unknown>>
>;

export const contentIdentityCollectionKind: unique symbol = Symbol(
  'contentIdentityCollectionKind',
);

export interface ContentIdentitySet<T> {
  readonly [contentIdentityCollectionKind]: 'set';
  readonly values: readonly T[];
}

export interface ContentIdentitySequence<T> {
  readonly [contentIdentityCollectionKind]: 'sequence';
  readonly values: readonly T[];
}

export type ContentIdentityCollection<T> =
  | ContentIdentitySet<T>
  | ContentIdentitySequence<T>;

export interface ContentIdentityEnvelopeV1<K extends ContentKind, P> {
  readonly scheme: ContentFingerprintScheme;
  readonly kind: K;
  readonly edition: string;
  readonly normalizedName: NormalizedContentName;
  readonly payload: P;
}

export interface DerivedContentIdentityV1<K extends ContentKind, P> {
  readonly envelope: ContentIdentityEnvelopeV1<K, P>;
  readonly canonicalJson: CanonicalContentIdentityJson;
  readonly digest: ContentFingerprintDigest;
  readonly derivedKey: DerivedContentKey;
}

export interface ParsedDerivedContentKeyV1 {
  readonly edition: string;
  readonly scheme: ContentFingerprintScheme;
  readonly digest: ContentFingerprintDigest;
  readonly derivedKey: DerivedContentKey;
}

export interface StoredContentIdentityV1 {
  readonly canonicalJson: CanonicalContentIdentityJson;
  readonly digest: ContentFingerprintDigest;
  readonly derivedKey: DerivedContentKey;
}

const SHA256_LOWERCASE_HEX = /^[0-9a-f]{64}$/;

function unsupportedCanonicalValue(value: unknown): never {
  throw new TypeError(
    `Value is not a canonical content identity value: ${Object.prototype.toString.call(value)}.`,
  );
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftCodePoints = Array.from(left, (value) => value.codePointAt(0)!);
  const rightCodePoints = Array.from(right, (value) => value.codePointAt(0)!);
  const length = Math.min(leftCodePoints.length, rightCodePoints.length);

  for (let index = 0; index < length; index += 1) {
    const difference = leftCodePoints[index]! - rightCodePoints[index]!;
    if (difference !== 0) {
      return difference;
    }
  }
  return leftCodePoints.length - rightCodePoints.length;
}

function nestedAncestors(
  ancestors: ReadonlySet<object>,
  value: object,
): ReadonlySet<object> {
  if (ancestors.has(value)) {
    throw new TypeError(
      'Value is not a canonical content identity value: circular reference.',
    );
  }
  const nested = new Set(ancestors);
  nested.add(value);
  return nested;
}

function isMarkedCollection(
  value: object,
): value is ContentIdentityCollection<unknown> {
  return contentIdentityCollectionKind in value;
}

function serializeCanonicalValue(
  value: unknown,
  ancestors: ReadonlySet<object>,
): string {
  if (value === null || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
      throw new TypeError(
        'Canonical content identity numbers must be finite safe integers.',
      );
    }
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    return unsupportedCanonicalValue(value);
  }

  const nested = nestedAncestors(ancestors, value);

  if (isMarkedCollection(value)) {
    const serialized = Array.from(value.values, (item) =>
      serializeCanonicalValue(item, nested),
    );
    if (value[contentIdentityCollectionKind] === 'set') {
      // Deliberately ECMAScript's default UTF-16 code-unit comparator.
      serialized.sort();
      const unique = serialized.filter(
        (item, index) => index === 0 || item !== serialized[index - 1],
      );
      return `[${unique.join(',')}]`;
    }
    return `[${serialized.join(',')}]`;
  }

  if (Array.isArray(value)) {
    const serialized = Array.from(value, (item) =>
      serializeCanonicalValue(item, nested),
    );
    return `[${serialized.join(',')}]`;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return unsupportedCanonicalValue(value);
  }
  if (
    Object.getOwnPropertySymbols(value).some((symbol) =>
      Object.prototype.propertyIsEnumerable.call(value, symbol),
    )
  ) {
    return unsupportedCanonicalValue(value);
  }

  const record = value as Record<string, unknown>;
  const members = Object.keys(record)
    .sort(compareUnicodeCodePoints)
    .map(
      (key) =>
        `${JSON.stringify(key)}:${serializeCanonicalValue(record[key], nested)}`,
    );
  return `{${members.join(',')}}`;
}

export function normalizeContentIdentityName(
  name: string,
): NormalizedContentName {
  const normalized = name
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
  if (normalized === '') {
    throw new TypeError('Content identity names must not be empty.');
  }
  return normalized as NormalizedContentName;
}

export function canonicalRuleText(value: string): CanonicalRuleText {
  const lines = value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/gu, ''));
  while (lines[0] === '') {
    lines.shift();
  }
  while (lines.at(-1) === '') {
    lines.pop();
  }
  return lines.join('\n') as CanonicalRuleText;
}

export function canonicalOpenPassthroughValue(
  value: string,
): CanonicalOpenPassthroughValue {
  return value.normalize('NFC') as CanonicalOpenPassthroughValue;
}

export function contentIdentityOptional<T>(
  value: T | undefined,
): T | null {
  return value === undefined ? null : value;
}

export function contentIdentitySet<T>(
  values: readonly T[],
): ContentIdentitySet<T> {
  return Object.freeze({
    [contentIdentityCollectionKind]: 'set' as const,
    values: Object.freeze([...values]),
  });
}

export function contentIdentitySequence<T>(
  values: readonly T[],
): ContentIdentitySequence<T> {
  return Object.freeze({
    [contentIdentityCollectionKind]: 'sequence' as const,
    values: Object.freeze([...values]),
  });
}

export function canonicalContentIdentityJson(
  value: unknown,
): CanonicalContentIdentityJson {
  return serializeCanonicalValue(value, new Set()) as CanonicalContentIdentityJson;
}

export function deriveContentIdentityV1<K extends ContentKind, P>(input: {
  readonly kind: K;
  readonly edition: string;
  readonly name: string;
  readonly payload: P;
}): DerivedContentIdentityV1<K, P> {
  if (!isCatalogKeyComponent(input.edition)) {
    throw new TypeError(
      `Content identity edition '${input.edition}' must be a valid catalog key component.`,
    );
  }

  const envelope: ContentIdentityEnvelopeV1<K, P> = Object.freeze({
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    kind: input.kind,
    edition: input.edition,
    normalizedName: normalizeContentIdentityName(input.name),
    payload: input.payload,
  });
  const canonicalJson = canonicalContentIdentityJson(envelope);
  const digest = sha256(canonicalJson) as ContentFingerprintDigest;
  const derivedKey =
    `${input.edition}:content.v1:${digest}` as DerivedContentKey;

  return Object.freeze({
    envelope,
    canonicalJson,
    digest,
    derivedKey,
  });
}

export function parseDerivedContentKeyV1(
  value: string,
): ParsedDerivedContentKeyV1 | null {
  const parts = value.split(':');
  if (parts.length !== 3) {
    return null;
  }
  const [edition, keySegment, digest] = parts as [string, string, string];
  if (
    !isCatalogKeyComponent(edition) ||
    keySegment !== 'content.v1' ||
    !SHA256_LOWERCASE_HEX.test(digest)
  ) {
    return null;
  }
  return Object.freeze({
    edition,
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    digest: digest as ContentFingerprintDigest,
    derivedKey: value as DerivedContentKey,
  });
}

export function verifyStoredContentIdentityV1(input: {
  readonly canonicalJson: string;
  readonly digest: string;
  readonly derivedKey: string;
}): StoredContentIdentityV1 {
  const parsedKey = parseDerivedContentKeyV1(input.derivedKey);
  if (
    parsedKey === null ||
    !SHA256_LOWERCASE_HEX.test(input.digest) ||
    parsedKey.digest !== input.digest ||
    sha256(input.canonicalJson) !== input.digest
  ) {
    throw new TypeError(
      'Stored content-v1 canonical bytes, digest, and derived key do not agree.',
    );
  }

  return Object.freeze({
    canonicalJson: input.canonicalJson as CanonicalContentIdentityJson,
    digest: input.digest as ContentFingerprintDigest,
    derivedKey: input.derivedKey as DerivedContentKey,
  });
}
