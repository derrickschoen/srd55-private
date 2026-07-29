import { describe, expect, it } from 'vitest';
import { GUIDED_LEVEL_ONE_STEP_ORDER } from '../../../src/builder/contracts';
import { deriveBuildStep } from '../../../src/builder/guided-creation';

describe('deriveBuildStep', () => {
  it('selects the first seam-ordered step when no class is present', () => {
    expect(
      deriveBuildStep({
        classChosen: false,
        abilitiesAllocated: false,
        speciesChosen: false,
        backgroundChosen: false,
        skillsFilled: false,
        equipmentChosen: false,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[0],
    );
  });

  it('selects abilities when only a class is present', () => {
    expect(
      deriveBuildStep({
        classChosen: true,
        abilitiesAllocated: false,
        speciesChosen: false,
        backgroundChosen: false,
        skillsFilled: false,
        equipmentChosen: false,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[1],
    );
  });

  it('selects background after abilities and species are complete', () => {
    expect(
      deriveBuildStep({
        classChosen: true,
        abilitiesAllocated: true,
        speciesChosen: true,
        backgroundChosen: false,
        skillsFilled: false,
        equipmentChosen: false,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[3],
    );
  });

  it('selects skills after class, species, and background are present', () => {
    expect(
      deriveBuildStep({
        classChosen: true,
        abilitiesAllocated: true,
        speciesChosen: true,
        backgroundChosen: true,
        skillsFilled: false,
        equipmentChosen: false,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[4],
    );
  });

  it('selects equipment once every class skill ordinal is filled (S-C)', () => {
    // The `skills: false` literal is DELETED, not reworded: the evidence
    // field is the per-grant predicate, so a fully-filled character rests on
    // the equipment step rather than being pinned to skills forever.
    expect(
      deriveBuildStep({
        classChosen: true,
        abilitiesAllocated: true,
        speciesChosen: true,
        backgroundChosen: true,
        skillsFilled: true,
        equipmentChosen: false,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[5],
    );
  });

  it('rests on equipment when every step, equipment included, is complete (E-B)', () => {
    // The `equipment: false` literal — the last pinned entry of the record —
    // is DELETED, not reworded. The contract has no "done" member, so a
    // fully complete character rests on the final step; the step's own read
    // carries `complete`, which is where "done" becomes visible.
    expect(
      deriveBuildStep({
        classChosen: true,
        abilitiesAllocated: true,
        speciesChosen: true,
        backgroundChosen: true,
        skillsFilled: true,
        equipmentChosen: true,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[5],
    );
  });

  it('holds an earlier step even when equipment evidence is already true', () => {
    // The walk is D55's order, not a completeness count: recorded equipment
    // never papers over an unfilled skills step.
    expect(
      deriveBuildStep({
        classChosen: true,
        abilitiesAllocated: true,
        speciesChosen: true,
        backgroundChosen: true,
        skillsFilled: false,
        equipmentChosen: true,
      }),
    ).toBe(
      GUIDED_LEVEL_ONE_STEP_ORDER[4],
    );
  });
});
