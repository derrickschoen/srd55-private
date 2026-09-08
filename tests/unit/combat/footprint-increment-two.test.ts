import { describe, expect, it } from 'vitest';
import { sharedSpaceRelation } from '../../../src/combat/creature-space';
import { createEncounter, encounterMovementWorld, reduceEncounter } from '../../../src/combat/encounter';
import { referencePartySpellSlots } from '../../../src/combat/spells/resources';
import { damageType } from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

function sizedMonster(key: string, sizeCategory: 'Tiny' | 'Large', initiativeBonus = 0) {
  const profile = monsterProfile(key, { initiativeBonus });
  return { ...profile, rules: { ...profile.rules, sizeCategory } };
}

describe('creature-space Increment 2 integration', () => {
  it('charges a Large creature difficult terrain when exactly one newly entered cell is difficult', () => {
    const mover = sizedMonster('large-difficult-entry', 'Large', 100);
    const state = createEncounter({
      bounds: { columns: 4, rows: 2 },
      combatants: [mover],
      tokens: [placedToken(mover, 0, 0)],
      environment: {
        lightRegions: [],
        difficultTerrainRegions: [{ id: 'difficult:new-tail', cells: [{ column: 2, row: 1 }] }],
        obscurementRegions: [],
        narrowOpeningRegions: [],
        movementRegions: [],
      },
    });

    expect(encounterMovementWorld(state).traversal(
      mover.id,
      { column: 0, row: 0 },
      { column: 1, row: 0 },
    )).toEqual({ kind: 'enterable', cost: 10, canEnd: true });
  });

  it('charges a Large creature normal terrain when a difficult cell is retained but no difficult cell is entered', () => {
    const mover = sizedMonster('large-retained-difficult', 'Large', 100);
    const state = createEncounter({
      bounds: { columns: 4, rows: 2 },
      combatants: [mover],
      tokens: [placedToken(mover, 0, 0)],
      environment: {
        lightRegions: [],
        difficultTerrainRegions: [{ id: 'difficult:retained', cells: [{ column: 1, row: 1 }] }],
        obscurementRegions: [],
        narrowOpeningRegions: [],
        movementRegions: [],
      },
    });

    expect(encounterMovementWorld(state).traversal(
      mover.id,
      { column: 0, row: 0 },
      { column: 1, row: 0 },
    )).toEqual({ kind: 'enterable', cost: 5, canEnd: true });
  });

  it('rejects a Large destination whose non-anchor footprint cells leave the grid', () => {
    const mover = sizedMonster('large-outside-grid', 'Large', 100);
    const state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [mover],
      tokens: [placedToken(mover, 1, 0)],
    });

    expect(encounterMovementWorld(state).traversal(
      mover.id,
      { column: 1, row: 0 },
      { column: 2, row: 0 },
    )).toEqual({ kind: 'blocked', reason: 'creature footprint is outside the grid' });
  });

  it('fires an entry hazard only for newly entered cells of a Large creature', () => {
    const mover = sizedMonster('large-entry-hazard', 'Large', 100);
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 },
      combatants: [mover],
      tokens: [placedToken(mover, 0, 0)],
      environment: {
        lightRegions: [],
        difficultTerrainRegions: [],
        obscurementRegions: [],
        narrowOpeningRegions: [],
        movementRegions: [{
          id: 'hazard:retained-and-entered',
          source: mover.id,
          cells: [{ column: 1, row: 1 }, { column: 2, row: 1 }],
          entry: 'allowed',
          damage: {
            damageType: damageType('Piercing'),
            dice: { count: 1, sides: 4, modifier: 0 },
            unitFeet: 5,
            partialUnit: 'completed_units_only',
          },
        }],
      },
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0).state;
    const before = state.combatants[0]?.hitPoints;

    const moved = reduceEncounter(state, {
      type: 'move', actor: mover.id, path: [{ column: 1, row: 0 }], cause: 'voluntary',
    }, () => 0);

    expect(moved.state.combatants[0]?.hitPoints).toBe(before === undefined ? undefined : before - 1);
    expect(moved.events.filter((event) => event.type === 'damage_applied')).toHaveLength(1);
  });

  it('persists explicit Tiny shared-space provenance and refuses an unproven overlap', () => {
    const first = sizedMonster('tiny-first', 'Tiny');
    const second = sizedMonster('tiny-second', 'Tiny');
    const tokens = [placedToken(first, 1, 1), placedToken(second, 1, 1)];
    const relation = sharedSpaceRelation({
      left: first.id,
      right: second.id,
      provenance: 'tiny_capacity',
      originatingId: 'setup:tiny-cell-1-1',
    });
    const state = createEncounter({
      bounds: { columns: 3, rows: 3 },
      combatants: [first, second],
      tokens,
      sharedSpaceRelations: [relation],
    });

    expect(JSON.parse(JSON.stringify(state.sharedSpaceRelations))).toEqual([{
      first: 'combatant:tiny-first',
      second: 'combatant:tiny-second',
      provenance: 'tiny_capacity',
      originatingId: 'setup:tiny-cell-1-1',
    }]);
    expect(() => createEncounter({
      bounds: { columns: 3, rows: 3 }, combatants: [first, second], tokens,
    })).toThrow('exact shared-space provenance');
  });

  it('blocks movement when only a non-anchor destination footprint cell is blocked', () => {
    const mover = sizedMonster('large-mover', 'Large', 100);
    let state = createEncounter({
      bounds: { columns: 4, rows: 3 },
      combatants: [mover],
      tokens: [placedToken(mover, 0, 0)],
      blockedCells: [{ column: 2, row: 0 }],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    expect(() => reduceEncounter(state, {
      type: 'move', actor: mover.id, path: [{ column: 1, row: 0 }], cause: 'voluntary',
    }, () => 0.5)).toThrow('blocked');
  });

  it('auto-relocates a growth transition to the nearest legal row-major anchor', () => {
    const caster = playerProfile('growth-caster', {
      initiativeBonus: 100,
      spellSlots: referencePartySpellSlots('Wizard'),
    });
    const target = monsterProfile('growth-target');
    let state = createEncounter({
      bounds: { columns: 3, rows: 3 },
      combatants: [caster, target],
      tokens: [placedToken(caster, 0, 0), placedToken(target, 2, 2)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const result = reduceEncounter(state, {
      type: 'cast_spell',
      actor: caster.id,
      spellId: 'enlarge-reduce',
      slotLevel: 2,
      castAsRitual: false,
      casterLevel: 3,
      attackBonus: 5,
      saveDc: 13,
      spellcastingModifier: 3,
      targets: [target.id],
      area: null,
      weaponAttack: null,
      selectedOption: { kind: 'size_step', operation: 'enlarge' },
    }, () => 0.5);

    expect(result.state.tokens.find((token) => token.combatantId === target.id)?.position)
      .toEqual({ column: 1, row: 1 });
    expect(result.state.tokens.find((token) => token.combatantId === target.id)?.placementMode)
      .toEqual({ kind: 'normal', actual: 'Large' });
  });

  it('returns a typed no-legal-anchor refusal without mutating the encounter', () => {
    const caster = playerProfile('blocked-growth-caster', {
      initiativeBonus: 100,
      spellSlots: referencePartySpellSlots('Wizard'),
    });
    const target = monsterProfile('blocked-growth-target');
    let state = createEncounter({
      bounds: { columns: 2, rows: 2 },
      combatants: [caster, target],
      tokens: [placedToken(caster, 0, 0), placedToken(target, 1, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const before = canonicalJson(state);
    expect(() => reduceEncounter(state, {
      type: 'cast_spell', actor: caster.id, spellId: 'enlarge-reduce', slotLevel: 2,
      castAsRitual: false, casterLevel: 3, attackBonus: 5, saveDc: 13,
      spellcastingModifier: 3, targets: [target.id], area: null, weaponAttack: null,
      selectedOption: { kind: 'size_step', operation: 'enlarge' },
    }, () => 0.5)).toThrow('no_legal_anchor');
    expect(canonicalJson(state)).toBe(before);
  });
});
