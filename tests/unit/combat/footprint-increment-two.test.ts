import { describe, expect, it } from 'vitest';
import { sharedSpaceRelation } from '../../../src/combat/creature-space';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { referencePartySpellSlots } from '../../../src/combat/spells/resources';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

function sizedMonster(key: string, sizeCategory: 'Tiny' | 'Large', initiativeBonus = 0) {
  const profile = monsterProfile(key, { initiativeBonus });
  return { ...profile, rules: { ...profile.rules, sizeCategory } };
}

describe('creature-space Increment 2 integration', () => {
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
