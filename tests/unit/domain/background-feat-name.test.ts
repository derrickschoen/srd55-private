import { describe, expect, it } from 'vitest';
import { backgroundFeatBaseName } from '../../../src/domain/background-feat-name';

describe('backgroundFeatBaseName', () => {
  it('parses the base and option in one decision', () => {
    expect(backgroundFeatBaseName('  Magic Initiate (Cleric)  ')).toEqual({
      base: 'Magic Initiate',
      option: 'Cleric',
    });
  });

  it('returns a trimmed base and no option for an unqualified label', () => {
    expect(backgroundFeatBaseName('  Alert  ')).toEqual({
      base: 'Alert',
      option: null,
    });
  });
});
