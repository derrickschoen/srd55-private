import { describe, expect, it } from 'vitest';
import {
  CONCENTRATION_INTEL_POLICY,
  evaluateConcentrationZoneIntel,
  type ConcentrationZoneEvaluationInput,
} from '../../../src/combat/concentration-evaluator';
import type { PersistentArea } from '../../../src/combat/persistent-areas';
import {
  combatantId,
  encounterEffectId,
  feet,
  persistentAreaId,
} from '../../../src/combat/values';
import { feetPoint } from '../../../src/combat/templates';

const caster = combatantId('combatant:cleric');
const ally = combatantId('combatant:ally');

function baseInput(overrides: Partial<ConcentrationZoneEvaluationInput> = {}): ConcentrationZoneEvaluationInput {
  return {
    caster: { id: caster, constitutionSaveBonus: 3, state: 'active' },
    candidate: { spellId: 'bless', requiresConcentration: true },
    existingConcentration: [],
    damage: { kind: 'none' },
    zones: {
      grid: { bounds: { columns: 8, rows: 2 }, blockedCells: [] },
      zones: [],
      movements: [],
    },
    ...overrides,
  };
}

function fixedSphere(): PersistentArea {
  return {
    id: persistentAreaId('area:bless-zone'),
    sequence: 1,
    owner: caster,
    origin: { kind: 'fixed', point: feetPoint(5, 0) },
    shape: { kind: 'sphere', radius: feet(5) },
    duration: { kind: 'rounds', remaining: 10 },
    targetFilter: { kind: 'all' },
    difficultTerrain: false,
    material: null,
    hooks: [],
    movable: null,
    burningCells: [],
    burnedAwayCells: [],
    members: [],
    consumedTurnKeys: [],
  };
}

describe('concentration and represented-zone intel', () => {
  it('reports the exact existing Bless effect dropped by a second concentration spell', () => {
    const blessing = { kind: 'encounter_effect' as const, id: encounterEffectId('effect:bless'), label: 'Bless' };
    const verdict = evaluateConcentrationZoneIntel(baseInput({
      candidate: { spellId: 'hold-person', requiresConcentration: true },
      existingConcentration: [blessing],
    }));

    expect(verdict.policy).toBe(CONCENTRATION_INTEL_POLICY);
    expect(verdict.start).toEqual({
      status: 'resolved', kind: 'starts_concentration', dropped: [blessing],
    });
  });

  it('ends concentration when its caster is unconscious at zero hit points', () => {
    const verdict = evaluateConcentrationZoneIntel(baseInput({
      caster: { id: caster, constitutionSaveBonus: 3, state: 'unconscious' },
    }));

    expect(verdict.breakRisk.casterState).toEqual({
      status: 'resolved', kind: 'ends', reason: 'incapacitated_or_dead',
    });
  });

  it('computes the exact concentration break probability from damage and save bonus', () => {
    const verdict = evaluateConcentrationZoneIntel(baseInput({ damage: { kind: 'damage', amount: 22 } }));

    // DC 11; a +3 save succeeds on d20 faces 8 through 20: 13/20.
    expect(verdict.breakRisk.damage).toEqual({
      status: 'resolved',
      damage: 22,
      dc: 11,
      saveBonus: 3,
      success: { numerator: 13, denominator: 20 },
      failure: { numerator: 7, denominator: 20 },
    });
  });

  it('reports hand-stated entry and exit for a represented persistent zone', () => {
    const verdict = evaluateConcentrationZoneIntel(baseInput({
      zones: {
        grid: { bounds: { columns: 8, rows: 2 }, blockedCells: [] },
        zones: [{ area: fixedSphere(), anchorCells: null }],
        movements: [
          { combatantId: caster, from: [{ column: 1, row: 0 }], to: [{ column: 2, row: 0 }] },
          { combatantId: ally, from: [{ column: 2, row: 0 }], to: [{ column: 3, row: 0 }] },
        ],
      },
    }));

    expect(verdict.zones).toEqual({
      status: 'resolved',
      deltas: [{
        status: 'resolved',
        areaId: persistentAreaId('area:bless-zone'),
        membersBefore: [ally, caster],
        membersAfter: [caster],
        entered: [],
        exited: [ally],
      }],
    });
  });

  it('does not turn unrepresented zone state into an invented aura', () => {
    const verdict = evaluateConcentrationZoneIntel(baseInput({ zones: null }));

    expect(verdict.zones).toEqual({
      status: 'unresolved', reason: 'zone_state_not_mechanically_represented',
    });
  });
});
