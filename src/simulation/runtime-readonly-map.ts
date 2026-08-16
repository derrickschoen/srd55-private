class RuntimeReadonlyMap<K, V> implements ReadonlyMap<K, V> {
  readonly #backing: Map<K, V>;

  constructor(backing: Map<K, V>) {
    this.#backing = backing;
  }

  get size(): number {
    return this.#backing.size;
  }

  get(key: K): V | undefined {
    return this.#backing.get(key);
  }

  has(key: K): boolean {
    return this.#backing.has(key);
  }

  entries() {
    return this.#backing.entries();
  }

  keys() {
    return this.#backing.keys();
  }

  values() {
    return this.#backing.values();
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  forEach(
    callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this.#backing) {
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
