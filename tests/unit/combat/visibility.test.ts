import { describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import {
  dmVisibleEncounter,
  projectDmView,
  projectPlayerView,
} from '../../../src/combat/visibility';
import { damageType, dieSides } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const fixedD20 = (face: number) => () => (face - 0.5) / 20;

function hiddenDeathSaveState(): EncounterState {
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
  return reduceEncounter(state, { type: 'end_turn', actor: monster.id }, fixedD20(9)).state;
}

describe('D359 encounter views', () => {
  it('omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell', () => {
    const state = hiddenDeathSaveState();
    const pc = state.combatants.find((subject) => subject.profile.kind === 'player_character');
    if (pc === undefined) throw new Error('Visibility fixture has no player seat.');

    const fogged = projectPlayerView(state, {
      seatId: 'seat:west',
      combatantId: pc.profile.id,
    });
    const revealed = projectPlayerView({
      ...state,
      foggedCells: [{ column: 4, row: 0 }],
    }, {
      seatId: 'seat:west',
      combatantId: pc.profile.id,
    });

    expect(fogged.cells).toContainEqual({ column: 2, row: 0 });
    expect(fogged.cells).not.toContainEqual({ column: 3, row: 0 });
    expect(fogged.combatants.map((entry) => entry.name)).not.toContain('fogged');
    expect(revealed.cells).toContainEqual({ column: 3, row: 0 });
    expect(revealed.combatants.map((entry) => entry.name)).toContain('fogged');
  });

  it('omits hidden death-save results, fog facts, and DM-only fields from player objects', () => {
    const state = hiddenDeathSaveState();
    const pc = state.combatants.find((subject) => subject.profile.kind === 'player_character');
    if (pc === undefined) throw new Error('Visibility fixture has no player seat.');
    const player = projectPlayerView(state, {
      seatId: 'seat:west',
      combatantId: pc.profile.id,
    });
    const dm = dmVisibleEncounter(projectDmView(state));
    const serializedPlayer = JSON.stringify(player);

    expect(serializedPlayer).not.toContain('hidden mechanism');
    expect(serializedPlayer).not.toContain('foggedCells');
    expect(serializedPlayer).not.toContain('death_save_resolved');
    expect(dm.dmOnly.notes).toContain('The east square contains a hidden mechanism.');
    expect(dm.recentEvents.find((event) => event.type === 'death_save_resolved')).toMatchObject({
      roll: 9,
      failures: 1,
      visibility: 'dm_only',
    });
  });

  it('gates owned details per seat and produces distinguishing views over the same state', () => {
    const west = playerProfile('west-seat');
    const east = playerProfile('east-seat');
    const state = createEncounter({
      bounds: { columns: 5, rows: 1 },
      foggedCells: [{ column: 4, row: 0 }],
      combatants: [west, east],
      tokens: [placedToken(west, 0), placedToken(east, 4)],
    });

    const westView = projectPlayerView(state, {
      seatId: 'seat:west',
      combatantId: west.id,
    });
    const eastView = projectPlayerView(state, {
      seatId: 'seat:east',
      combatantId: east.id,
    });

    expect(westView.combatants.map((entry) => entry.id)).toEqual([west.id]);
    expect(eastView.combatants.map((entry) => entry.id)).toEqual([west.id, east.id]);
    expect(westView.ownedCombatants.map((entry) => entry.id)).toEqual([west.id]);
    expect(eastView.ownedCombatants.map((entry) => entry.id)).toEqual([east.id]);
    expect(westView.seat).toMatchObject({ seatId: 'seat:west', combatantId: west.id });
    expect(eastView.seat).toMatchObject({ seatId: 'seat:east', combatantId: east.id });
  });
});
