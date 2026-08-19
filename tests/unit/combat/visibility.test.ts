import { describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { projectEncounter } from '../../../src/combat/visibility';
import { damageType, dieSides } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const fixedD20 = (face: number) => () => (face - 0.5) / 20;

describe('player and DM encounter projections', () => {
  it('omits hidden death-save results, fog facts, and DM-only fields from player objects', () => {
    const pc = playerProfile('viewer', { initiativeBonus: -20, hitPoints: 10 });
    const monster = monsterProfile('fogged', { initiativeBonus: 20 });
    let state = createEncounter({
      bounds: { columns: 5, rows: 2 },
      blockedCells: [{ column: 4, row: 0 }],
      foggedCells: [{ column: 3, row: 0 }, { column: 4, row: 0 }],
      dmNotes: ['The east square contains a hidden mechanism.'],
      combatants: [pc, monster],
      tokens: [placedToken(pc, 0), placedToken(monster, 3)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(11)).state;
    const foggedTurn = projectEncounter(state, {
      kind: 'player',
      combatantId: pc.id,
    });
    expect(foggedTurn.activeCombatant).toBeNull();
    const attack: Extract<EncounterCommand, { readonly type: 'attack' }> = {
      type: 'attack',
      actor: monster.id,
      target: pc.id,
      attackBonus: 100,
      criticalFloor: 20,
      rollMode: 'normal',
      attackerCanSeeTarget: true,
      targetCanSeeAttacker: true,
      damage: {
        terms: [{
          type: damageType('Force'),
          dice: { count: 0, sides: dieSides(6), modifier: 10 },
        }],
        critical: false,
        responses: [],
      },
    };
    state = reduceEncounter(state, attack, fixedD20(11)).state;
    state = reduceEncounter(
      state,
      { type: 'end_turn', actor: monster.id },
      fixedD20(9),
    ).state;

    const player = projectEncounter(state, {
      kind: 'player',
      combatantId: pc.id,
    });
    const dm = projectEncounter(state, { kind: 'dm' });
    const serializedPlayer = JSON.parse(JSON.stringify(player)) as unknown;
    const playerCombatant = player.combatants.find((entry) => entry.id === pc.id);

    expect(player.combatants.map((entry) => entry.id)).toEqual([pc.id]);
    expect(player.blockedCells).toEqual([]);
    expect(player.recentEvents.some((event) => event.type === 'death_save_resolved')).toBe(false);
    expect('dmOnly' in player).toBe(false);
    expect(playerCombatant === undefined ? true : 'rules' in playerCombatant).toBe(false);
    expect(playerCombatant === undefined ? true : 'deathSaves' in playerCombatant).toBe(false);
    expect(JSON.stringify(serializedPlayer)).not.toContain('hidden mechanism');
    expect(JSON.stringify(serializedPlayer)).not.toContain('foggedCells');
    expect(JSON.stringify(serializedPlayer)).not.toContain('death_save_resolved');

    expect(dm.combatants.map((entry) => entry.id)).toEqual([pc.id, monster.id]);
    expect(dm.blockedCells).toEqual([{ column: 4, row: 0 }]);
    expect(dm.dmOnly).toEqual({
      foggedCells: [{ column: 3, row: 0 }, { column: 4, row: 0 }],
      notes: ['The east square contains a hidden mechanism.'],
    });
    expect(dm.recentEvents.find((event) => event.type === 'death_save_resolved')).toMatchObject({
      roll: 9,
      failures: 1,
      visibility: 'dm_only',
    });
  });
});
