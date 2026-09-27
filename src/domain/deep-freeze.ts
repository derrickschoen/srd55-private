/**
 * Recursively freezes every own enumerable object or array reachable from
 * `value` and returns it.
 *
 * For module-level data that is handed out by reference, such as the bundled
 * SRD catalogs the build generates: a caller that mutates what it was given
 * would otherwise change the catalog for every later caller in the process.
 */
export function deepFreeze<T>(value: T): T {
  freeze(value, new WeakSet<object>());
  return value;
}

function freeze(value: unknown, seen: WeakSet<object>): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.enumerable === true) {
      freeze(Reflect.get(value, key), seen);
    }
  }
  Object.freeze(value);
}
