/**
 * A relation whose constructor proves that the entries contain every required
 * key exactly once and contain no key outside that required set.
 */
export class TotalMap<Key, Value> {
  readonly #values: ReadonlyMap<Key, Value>;

  private constructor(values: ReadonlyMap<Key, Value>) {
    this.#values = values;
  }

  static from<Key, Value>(
    values: readonly Value[],
    requiredKeys: readonly Key[],
    keyOf: (value: Value) => Key,
  ): TotalMap<Key, Value> {
    const required = new Set<Key>();
    for (const key of requiredKeys) {
      if (required.has(key)) throw new TypeError('A total relation cannot repeat a required key.');
      required.add(key);
    }

    const indexed = new Map<Key, Value>();
    for (const value of values) {
      const key = keyOf(value);
      if (indexed.has(key)) throw new TypeError('A total relation cannot contain duplicate entries.');
      if (!required.has(key)) throw new TypeError('A total relation cannot contain an extraneous entry.');
      indexed.set(key, value);
    }
    for (const key of required) {
      if (!indexed.has(key)) throw new TypeError('A total relation is missing a required entry.');
    }
    return new TotalMap(indexed);
  }

  at(key: Key): Value {
    return this.#values.get(key) as Value;
  }
}
