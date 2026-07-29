import { describe, expect, it } from 'vitest';
import { GUIDED_LEVEL_ONE_STEP_ORDER } from '../../../src/builder/contracts';
import { deriveBuildStep } from '../../../src/builder/guided-creation';

describe('deriveBuildStep', () => {
  it('selects the first seam-ordered step when no class is present', () => {
    expect(
      deriveBuildStep({
        classChosen: false,
        speciesChosen: false,
        backgroundChosen: false,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[0],
    );
  });

  it('skips the undetectable abilities step and selects species when only a class is present', () => {
    expect(
      deriveBuildStep({
        classChosen: true,
        speciesChosen: false,
        backgroundChosen: false,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[2],
    );
  });

  it('selects background after both class and species are present', () => {
    expect(
      deriveBuildStep({
        classChosen: true,
        speciesChosen: true,
        backgroundChosen: false,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[3],
    );
  });

  it('selects skills after class, species, and background are present', () => {
    expect(
      deriveBuildStep({
        classChosen: true,
        speciesChosen: true,
        backgroundChosen: true,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[4],
    );
  });
});
