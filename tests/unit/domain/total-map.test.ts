import { describe, expect, it } from 'vitest';
import { TotalMap } from '../../../src/domain/total-map';

interface Entry {
  readonly id: 'first' | 'second' | 'extra';
  readonly value: number;
}

const keyOf = (entry: Entry): Entry['id'] => entry.id;

describe('TotalMap', () => {
  it('provides total lookup after one exact-relation proof', () => {
    const index = TotalMap.from(
      [{ id: 'first', value: 1 }, { id: 'second', value: 2 }],
      ['first', 'second'],
      keyOf,
    );
    expect(index.at('first').value).toBe(1);
    expect(index.at('second').value).toBe(2);
  });

  it.each([
    {
      name: 'duplicate entry',
      values: [{ id: 'first', value: 1 }, { id: 'first', value: 2 }],
      required: ['first', 'second'],
      message: 'duplicate entries',
    },
    {
      name: 'duplicate required key',
      values: [{ id: 'first', value: 1 }],
      required: ['first', 'first'],
      message: 'repeat a required key',
    },
    {
      name: 'missing entry',
      values: [{ id: 'first', value: 1 }],
      required: ['first', 'second'],
      message: 'missing a required entry',
    },
    {
      name: 'extraneous entry',
      values: [{ id: 'first', value: 1 }, { id: 'extra', value: 3 }],
      required: ['first'],
      message: 'extraneous entry',
    },
  ] as const)('rejects a $name', ({ values, required, message }) => {
    expect(() => TotalMap.from(values, required, keyOf)).toThrow(message);
  });
});
