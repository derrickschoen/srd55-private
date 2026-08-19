const mapPrototype = Map.prototype as Map<unknown, unknown>;
const mapGetIntrinsic = mapPrototype.get;
const mapHasIntrinsic = mapPrototype.has;
const mapEntriesIntrinsic = mapPrototype.entries;
const mapKeysIntrinsic = mapPrototype.keys;
const mapValuesIntrinsic = mapPrototype.values;
const mapIteratorIntrinsic = mapPrototype[Symbol.iterator];
const mapSizeDescriptor = Object.getOwnPropertyDescriptor(
  mapPrototype,
  'size',
);

if (mapSizeDescriptor?.get === undefined) {
  throw new TypeError('Map.prototype.size getter is unavailable.');
}
const mapSizeIntrinsic = mapSizeDescriptor.get;

function deepFreezeValue(value: unknown, seen: WeakSet<object>): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.enumerable === true) {
      deepFreezeValue(Reflect.get(value, key), seen);
    }
  }
  Object.freeze(value);
}

/**
 * Recursively freezes every own enumerable object or array reachable here.
 *
 * D263 boundary: this is an accident tripwire for our own future code, not a
 * hostile-caller guarantee. Deliberate in-process prototype reassignment and
 * post-hoc mutation of returned or minted objects remain caller-trusted, just
 * like mutation beyond the round-18 structural-copy boundary.
 */
export function deepFreeze<T>(value: T): T {
  deepFreezeValue(value, new WeakSet<object>());
  return value;
}

class RuntimeReadonlyMap<K, V> implements ReadonlyMap<K, V> {
  readonly #backing: Map<K, V>;

  constructor(backing: Map<K, V>) {
    this.#backing = backing;
  }

  get size(): number {
    return Reflect.apply(mapSizeIntrinsic, this.#backing, []) as number;
  }

  get(key: K): V | undefined {
    return Reflect.apply(mapGetIntrinsic, this.#backing, [key]) as V | undefined;
  }

  has(key: K): boolean {
    return Reflect.apply(mapHasIntrinsic, this.#backing, [key]) as boolean;
  }

  entries(): MapIterator<[K, V]> {
    return Reflect.apply(mapEntriesIntrinsic, this.#backing, []) as MapIterator<[K, V]>;
  }

  keys(): MapIterator<K> {
    return Reflect.apply(mapKeysIntrinsic, this.#backing, []) as MapIterator<K>;
  }

  values(): MapIterator<V> {
    return Reflect.apply(mapValuesIntrinsic, this.#backing, []) as MapIterator<V>;
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return Reflect.apply(
      mapIteratorIntrinsic,
      this.#backing,
      [],
    ) as MapIterator<[K, V]>;
  }

  forEach(
    callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    thisArg?: unknown,
  ): void {
    const entries = Reflect.apply(
      mapEntriesIntrinsic,
      this.#backing,
      [],
    ) as MapIterator<[K, V]>;
    for (const [key, value] of entries) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  set(_key: K, _value: V): never {
    throw new TypeError('Registration manifests are immutable.');
  }

  delete(_key: K): never {
    throw new TypeError('Registration manifests are immutable.');
  }

  clear(): never {
    throw new TypeError('Registration manifests are immutable.');
  }
}

export function runtimeReadonlyMap<K, V>(
  entries: Iterable<readonly [K, V]>,
): ReadonlyMap<K, V> {
  return new RuntimeReadonlyMap(new Map(entries));
}

/** The backing map must remain private to the module that owns its writer. */
export function runtimeReadonlyMapView<K, V>(
  backing: Map<K, V>,
): ReadonlyMap<K, V> {
  return new RuntimeReadonlyMap(backing);
}
