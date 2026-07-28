import { describe, expect, it } from 'vitest';
import { GUIDED_LEVEL_ONE_STEP_ORDER } from '../../../src/builder/contracts';
import { deriveBuildStep } from '../../../src/builder/guided-creation';

describe('deriveBuildStep', () => {
  it('selects the first seam-ordered step when no class is present', () => {
    expect(deriveBuildStep({ classChosen: false })).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[0],
    );
  });

  it('selects the next seam-ordered step when a class is present', () => {
    expect(deriveBuildStep({ classChosen: true })).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[1],
    );
  });
});
