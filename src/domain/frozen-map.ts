/**
 * MAPS NO HOLDER CAN CHANGE, for module-level data handed out by reference:
 * the SRD rule maps (the point-cost table, the skill-to-ability map, the
 * Martial Arts dice, the Extra Attack and Weapon Mastery counts) and the
 * simulation's registration manifests.
 *
 * `ReadonlyMap` is only a type. A `Map` typed `ReadonlyMap` still has `set`,
 * `delete` and `clear` at runtime, and `Object.freeze(new Map())` freezes the
 * object's own properties, not its entries, so `.set()` keeps working. A
 * caller that casts, or plain JavaScript, would change the rule for every later
 * caller in the process.
 *
 * So neither class here is a `Map`:
 *  - neither has a mutating method, and the compiler knows it: the types have
 *    no `set`, `delete` or `clear` key, so a mutation does not compile;
 *  - the entries live in a PRIVATE FIELD that no code outside the class can
 *    reach;
 *  - an instance is not a `Map`, so `Map.prototype.set.call(it, …)` throws
 *    instead of writing the hidden store;
 *  - each instance and each class prototype is frozen, so no method can be
 *    replaced, on one instance or for every instance at once;
 *  - `forEach` hands its callback the wrapper, never the private store;
 *  - every read calls the `Map` methods captured when this module loaded, so a
 *    later replacement of `Map.prototype.get` (or `entries`, …) is never handed
 *    the private store (D263.3: the captured-intrinsic boundary hardening
 *    stays; this is not a hostile-Proxy arms race).
 *
 * Both are nominal: a class with a private field admits only its own
 * instances, so a declaration typed `FrozenMap` cannot be handed a plain `Map`,
 * or a live view.
 */
const mapPrototype = Map.prototype as Map<unknown, unknown>;
const mapGetIntrinsic = mapPrototype.get;
const mapHasIntrinsic = mapPrototype.has;
const mapEntriesIntrinsic = mapPrototype.entries;
const mapKeysIntrinsic = mapPrototype.keys;
const mapValuesIntrinsic = mapPrototype.values;
const mapSizeDescriptor = Object.getOwnPropertyDescriptor(mapPrototype, 'size');

if (mapSizeDescriptor?.get === undefined) {
  throw new TypeError('Map.prototype.size getter is unavailable.');
}
const mapSizeIntrinsic = mapSizeDescriptor.get;

function sizeOf(backing: Map<unknown, unknown>): number {
  return Reflect.apply(mapSizeIntrinsic, backing, []) as number;
}

function getFrom<K, V>(backing: Map<K, V>, key: K): V | undefined {
  return Reflect.apply(mapGetIntrinsic, backing, [key]) as V | undefined;
}

function hasIn<K>(backing: Map<K, unknown>, key: K): boolean {
  return Reflect.apply(mapHasIntrinsic, backing, [key]) as boolean;
}

function entriesOf<K, V>(backing: Map<K, V>): MapIterator<[K, V]> {
  return Reflect.apply(mapEntriesIntrinsic, backing, []) as MapIterator<[K, V]>;
}

function keysOf<K>(backing: Map<K, unknown>): MapIterator<K> {
  return Reflect.apply(mapKeysIntrinsic, backing, []) as MapIterator<K>;
}

function valuesOf<V>(backing: Map<unknown, V>): MapIterator<V> {
  return Reflect.apply(mapValuesIntrinsic, backing, []) as MapIterator<V>;
}

/**
 * A SNAPSHOT: the entries are copied once, at construction, into a store only
 * this instance can read, so neither a holder nor whoever supplied the entries
 * can change it afterwards.
 */
export class FrozenMap<K, V> implements ReadonlyMap<K, V> {
  readonly #entries: Map<K, V>;

  constructor(entries: Iterable<readonly [K, V]>) {
    this.#entries = new Map(entries);
    Object.freeze(this);
  }

  get size(): number {
    return sizeOf(this.#entries);
  }

  get(key: K): V | undefined {
    return getFrom(this.#entries, key);
  }

  has(key: K): boolean {
    return hasIn(this.#entries, key);
  }

  forEach(
    callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of entriesOf(this.#entries)) {
      callback.call(thisArg, value, key, this);
    }
  }

  entries(): MapIterator<[K, V]> {
    return entriesOf(this.#entries);
  }

  keys(): MapIterator<K> {
    return keysOf(this.#entries);
  }

  values(): MapIterator<V> {
    return valuesOf(this.#entries);
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return entriesOf(this.#entries);
  }
}

/**
 * A LIVE VIEW of a `Map` its owner keeps private and still writes (the
 * simulation's attack-roll registrations): holders read the current entries
 * and cannot change them; only the owning module's writer can.
 */
export class ReadonlyMapView<K, V> implements ReadonlyMap<K, V> {
  readonly #backing: Map<K, V>;

  constructor(backing: Map<K, V>) {
    this.#backing = backing;
    Object.freeze(this);
  }

  get size(): number {
    return sizeOf(this.#backing);
  }

  get(key: K): V | undefined {
    return getFrom(this.#backing, key);
  }

  has(key: K): boolean {
    return hasIn(this.#backing, key);
  }

  forEach(
    callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of entriesOf(this.#backing)) {
      callback.call(thisArg, value, key, this);
    }
  }

  entries(): MapIterator<[K, V]> {
    return entriesOf(this.#backing);
  }

  keys(): MapIterator<K> {
    return keysOf(this.#backing);
  }

  values(): MapIterator<V> {
    return valuesOf(this.#backing);
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return entriesOf(this.#backing);
  }
}

Object.freeze(FrozenMap.prototype);
Object.freeze(FrozenMap);
Object.freeze(ReadonlyMapView.prototype);
Object.freeze(ReadonlyMapView);
