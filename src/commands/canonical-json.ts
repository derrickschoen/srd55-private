import type { JsonValue } from '../domain/models';

function unsupportedJson(value: unknown): never {
  throw new TypeError(
    `Value is not JSON serializable: ${Object.prototype.toString.call(value)}.`,
  );
}

function canonicalize(
  value: unknown,
  ancestors: ReadonlySet<object>,
): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return unsupportedJson(value);
    }
    return value;
  }

  if (typeof value !== 'object') {
    return unsupportedJson(value);
  }

  if (ancestors.has(value)) {
    throw new TypeError('Value is not JSON serializable: circular reference.');
  }

  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    return unsupportedJson(value);
  }

  const nestedAncestors = new Set(ancestors);
  nestedAncestors.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item, nestedAncestors));
  }

  const result: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = canonicalize(
      (value as Record<string, unknown>)[key],
      nestedAncestors,
    );
  }
  return result;
}

export function canonicalizeJson(value: unknown): JsonValue {
  return canonicalize(value, new Set());
}

export function canonicalJson(value: unknown): string {
  const encoded = JSON.stringify(canonicalizeJson(value));
  if (encoded === undefined) {
    return unsupportedJson(value);
  }
  return encoded;
}
