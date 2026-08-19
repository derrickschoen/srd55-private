import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../../src/commands/canonical-json';
import {
  CanonicalJsonCircularReferenceError,
  CanonicalJsonUnsupportedValueError,
} from '../../../../src/commands/canonical-json-errors';

function defect(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected canonical JSON to reject the value.');
}

describe('canonical JSON tagged error formatters', () => {
  it('formats an unsupported runtime value', () => {
    const error = new CanonicalJsonUnsupportedValueError('[object Symbol]');

    expect(error).toBeInstanceOf(TypeError);
    expect(error).toMatchObject({
      name: 'CanonicalJsonUnsupportedValueError',
      value_tag: '[object Symbol]',
      message: 'Value is not JSON serializable: [object Symbol].',
    });
  });

  it('formats a circular reference', () => {
    const error = new CanonicalJsonCircularReferenceError();

    expect(error).toBeInstanceOf(TypeError);
    expect(error).toMatchObject({
      name: 'CanonicalJsonCircularReferenceError',
      message: 'Value is not JSON serializable: circular reference.',
    });
  });
});

describe('canonical JSON defect guards', () => {
  it('reports the unsupported runtime tag as structured data', () => {
    const error = defect(() => canonicalJson(Symbol('unsupported')));

    expect(error).toBeInstanceOf(CanonicalJsonUnsupportedValueError);
    expect(error).toMatchObject({ value_tag: '[object Symbol]' });
  });

  it('reports circular data with its dedicated class', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(defect(() => canonicalJson(circular))).toBeInstanceOf(
      CanonicalJsonCircularReferenceError,
    );
  });
});
