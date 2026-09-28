import { describe, expect, it } from 'vitest';
import { FrozenMap, ReadonlyMapView } from '../../../src/domain/frozen-map';

/**
 * A MAP NO HOLDER CAN CHANGE (fix round 3, P2). Every attempt below is one a
 * caller holding the value could make without editing this repository; each
 * must throw a TypeError, and the map must read exactly what it read before.
 */
type Attempts = Readonly<Record<string, string>>;

function outcome(run: () => unknown): string {
  try {
    run();
    return 'no error';
  } catch (error) {
    return error instanceof TypeError ? 'TypeError' : `other: ${String(error)}`;
  }
}

/**
 * Tries every way to change `map` from outside, writing `wrong` at `key`. A
 * change that unexpectedly lands is undone before returning, because test
 * files share workers (`isolate: false`) and a replaced prototype method would
 * outlive this test.
 */
function tryToChange<K, V>(map: ReadonlyMap<K, V>, key: K, wrong: V): Attempts {
  const loose = map as unknown as Map<K, V> & Record<string, unknown>;
  const prototype = Object.getPrototypeOf(map) as Record<string, unknown>;
  const originalGet = prototype.get;
  const attempts = {
    set: outcome(() => loose.set(key, wrong)),
    delete: outcome(() => loose.delete(key)),
    clear: outcome(() => { loose.clear(); }),
    'Map.prototype.set.call': outcome(() => Map.prototype.set.call(map as never, key, wrong)),
    'Map.prototype.delete.call': outcome(() => Map.prototype.delete.call(map as never, key)),
    'Map.prototype.clear.call': outcome(() => { Map.prototype.clear.call(map as never); }),
    'assign an own get': outcome(() => { loose.get = () => wrong; }),
    'define an own get': outcome(() => Object.defineProperty(map, 'get', { value: () => wrong })),
    'replace the prototype get': outcome(() => { prototype.get = () => wrong; }),
    'swap the prototype': outcome(() => Object.setPrototypeOf(map, Map.prototype)),
  };
  if (Object.getPrototypeOf(map) !== prototype) {
    Object.setPrototypeOf(map, prototype);
  }
  if (Object.hasOwn(map, 'get')) {
    Reflect.deleteProperty(map, 'get');
  }
  if (prototype.get !== originalGet) {
    prototype.get = originalGet;
  }
  return attempts;
}

const EVERY_ATTEMPT_REFUSED: Attempts = {
  set: 'TypeError',
  delete: 'TypeError',
  clear: 'TypeError',
  'Map.prototype.set.call': 'TypeError',
  'Map.prototype.delete.call': 'TypeError',
  'Map.prototype.clear.call': 'TypeError',
  'assign an own get': 'TypeError',
  'define an own get': 'TypeError',
  'replace the prototype get': 'TypeError',
  'swap the prototype': 'TypeError',
};

describe('FrozenMap', () => {
  it('refuses every attempt to change it, and still reads what it read', () => {
    const costs = new FrozenMap<number, number>([[8, 0], [15, 9]]);
    expect(tryToChange(costs, 15, 8)).toEqual(EVERY_ATTEMPT_REFUSED);
    expect([...costs]).toEqual([[8, 0], [15, 9]]);
    expect(costs.get(15)).toBe(9);
    expect(costs.size).toBe(2);
  });

  it('copies its entries, so whoever supplied them cannot change it afterwards', () => {
    const source = new Map<number, number>([[8, 0], [15, 9]]);
    const costs = new FrozenMap(source);
    source.set(15, 8);
    source.set(16, 10);
    source.delete(8);
    expect([...costs.entries()]).toEqual([[8, 0], [15, 9]]);
  });

  it('hands forEach callers the wrapper, never its private store', () => {
    const costs = new FrozenMap<number, number>([[8, 0], [15, 9]]);
    const holders: unknown[] = [];
    const seen: [number, number][] = [];
    costs.forEach((value, key, holder) => {
      holders.push(holder);
      seen.push([key, value]);
    });
    expect(seen).toEqual([[8, 0], [15, 9]]);
    expect(holders).toHaveLength(2);
    expect(holders.every((holder) => holder === costs)).toBe(true);
  });

  it('reads through the Map methods captured at load, not a later replacement', () => {
    const costs = new FrozenMap<number, number>([[15, 9]]);
    const originalGet = Map.prototype.get;
    let handed: unknown;
    Map.prototype.get = function <K, V>(this: Map<K, V>, key: K): V | undefined {
      handed = this;
      return Reflect.apply(originalGet, this, [key]) as V | undefined;
    };
    let read: number | undefined;
    try {
      read = costs.get(15);
    } finally {
      Map.prototype.get = originalGet;
    }
    expect(handed).toBeUndefined();
    expect(read).toBe(9);
  });

  it('keeps its keys, values and iteration in insertion order', () => {
    const dice = new FrozenMap<number, number>([[5, 8], [1, 6]]);
    expect([...dice.keys()]).toEqual([5, 1]);
    expect([...dice.values()]).toEqual([8, 6]);
    expect(dice.has(1)).toBe(true);
    expect(dice.has(2)).toBe(false);
    expect(dice.get(2)).toBeUndefined();
  });
});

describe('ReadonlyMapView', () => {
  it('reads its owner\'s later writes, and refuses every attempt by a holder to change it', () => {
    const backing = new Map<string, number>([['first', 1]]);
    const view = new ReadonlyMapView(backing);
    expect(tryToChange(view, 'first', 950)).toEqual(EVERY_ATTEMPT_REFUSED);
    backing.set('second', 2);
    expect([...view]).toEqual([['first', 1], ['second', 2]]);
    const holders: unknown[] = [];
    view.forEach((_value, _key, holder) => holders.push(holder));
    expect(holders.every((holder) => holder === view)).toBe(true);
  });
});
