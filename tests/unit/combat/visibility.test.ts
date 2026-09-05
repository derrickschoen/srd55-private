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
import type { KnownCreatureSize } from '../../../src/domain/enums';

const fixedD20 = (face: number) => () => (face - 0.5) / 20;

function hiddenDeathSaveState(): EncounterState {
  const pc = playerProfile('viewer', { initiativeBonus: -20, hitPoints: 10 });
  const monster = monsterProfile('fogged', { initiativeBonus: 20 });
  let state = createEncounter({
    hideDeathSaveRolls: true,
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
  state = reduceEncounter(state, { type: 'end_turn', actor: monster.id }, fixedD20(11)).state;
  const decision = state.pendingDecisions.find((candidate) => candidate.kind === 'death_save');
  if (decision === undefined) throw new Error('Visibility fixture has no death-save decision.');
  return reduceEncounter(state, {
    type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'roll',
  }, fixedD20(9)).state;
}

describe('D359 encounter views', () => {
  it.each([
    ['Tiny', [{ column: 2, row: 2 }]],
    ['Small', [{ column: 2, row: 2 }]],
    ['Medium', [{ column: 2, row: 2 }]],
    ['Large', [
      { column: 2, row: 2 }, { column: 3, row: 2 },
      { column: 2, row: 3 }, { column: 3, row: 3 },
    ]],
    ['Huge', [
      { column: 2, row: 2 }, { column: 3, row: 2 }, { column: 4, row: 2 },
      { column: 2, row: 3 }, { column: 3, row: 3 }, { column: 4, row: 3 },
      { column: 2, row: 4 }, { column: 3, row: 4 }, { column: 4, row: 4 },
    ]],
    ['Gargantuan', [
      { column: 2, row: 2 }, { column: 3, row: 2 }, { column: 4, row: 2 }, { column: 5, row: 2 },
      { column: 2, row: 3 }, { column: 3, row: 3 }, { column: 4, row: 3 }, { column: 5, row: 3 },
      { column: 2, row: 4 }, { column: 3, row: 4 }, { column: 4, row: 4 }, { column: 5, row: 4 },
      { column: 2, row: 5 }, { column: 3, row: 5 }, { column: 4, row: 5 }, { column: 5, row: 5 },
    ]],
  ] as const)('clones the exact row-major %s footprint into player and DM projections', (size, footprint) => {
    const viewer = playerProfile(`projection-viewer-${size}`);
    const baseTarget = monsterProfile(`projection-target-${size}`);
    const target = { ...baseTarget, rules: { ...baseTarget.rules, sizeCategory: size as KnownCreatureSize } };
    const state = createEncounter({
      bounds: { columns: 8, rows: 8 },
      combatants: [viewer, target],
      tokens: [placedToken(viewer, 0, 0), placedToken(target, 2, 2)],
    });
    const player = projectPlayerView(state, { seatId: 'seat:projection', combatantId: viewer.id });
    const dm = dmVisibleEncounter(projectDmView(state));
    expect(player.combatants.find((entry) => entry.id === target.id)).toMatchObject({
      placementStatus: 'placed', effectiveSize: size, placementMode: { kind: 'normal', actual: size }, footprint,
    });
    expect(dm.combatants.find((entry) => entry.id === target.id)).toMatchObject({
      placementStatus: 'placed', effectiveSize: size, placementMode: { kind: 'normal', actual: size }, footprint,
    });
    const projected = player.combatants.find((entry) => entry.id === target.id);
    const canonicalToken = state.tokens.find((entry) => entry.combatantId === target.id);
    if (projected?.placementStatus !== 'placed' || canonicalToken === undefined) throw new Error('Placed projection fixture failed.');
    (canonicalToken.position as { column: number }).column = 7;
    expect(projected.position).toEqual({ column: 2, row: 2 });
  });

  it('projects a legal squeezed mode and filters hidden geometry before handling partial fog', () => {
    const viewer = playerProfile('projection-squeeze-viewer');
    const baseTarget = monsterProfile('projection-squeeze-target');
    const target = { ...baseTarget, rules: { ...baseTarget.rules, sizeCategory: 'Large' as const } };
    const created = createEncounter({
      bounds: { columns: 6, rows: 4 },
      foggedCells: [{ column: 3, row: 1 }, { column: 2, row: 2 }, { column: 3, row: 2 }],
      combatants: [viewer, target],
      tokens: [placedToken(viewer, 0, 0), placedToken(target, 2, 1)],
    });
    const squeezed: EncounterState = {
      ...created,
      tokens: created.tokens.map((token) => token.combatantId === target.id
        ? { ...token, placementMode: { kind: 'squeezed', actual: 'Large', sizedFor: 'Medium' } }
        : token),
    };
    expect(projectPlayerView(squeezed, { seatId: 'seat:squeeze', combatantId: viewer.id }).combatants
      .find((entry) => entry.id === target.id)).toMatchObject({
        placementStatus: 'placed', effectiveSize: 'Large',
        placementMode: { kind: 'squeezed', actual: 'Large', sizedFor: 'Medium' },
        footprint: [{ column: 2, row: 1 }],
      });

    const hidden = {
      ...created,
      hiddenCombatants: [{ combatant: target.id, stealthTotal: 20, edition: '2024' as const }],
    };
    const player = projectPlayerView(hidden, { seatId: 'seat:hidden', combatantId: viewer.id });
    const dm = dmVisibleEncounter(projectDmView(hidden));
    expect(player.combatants.some((entry) => entry.id === target.id)).toBe(false);
    expect(JSON.stringify(player)).not.toContain(String(target.id));
    expect(dm.combatants.find((entry) => entry.id === target.id)).toMatchObject({
      placementStatus: 'placed', hiddenFromPlayers: true,
      footprint: [
        { column: 2, row: 1 }, { column: 3, row: 1 },
        { column: 2, row: 2 }, { column: 3, row: 2 },
      ],
    });
  });
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

  it('omits hidden death-save results, fog facts, and DM-only fields from player objects while exposing a redacted result', () => {
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
    expect(player.recentEvents.find((event) => event.type === 'death_save_resolved')).toMatchObject({
      rollVisibility: 'dm_only',
      failures: 1,
      lifeState: 'dying',
    });
    expect(serializedPlayer).not.toContain('"roll":9');
    expect(dm.dmOnly.notes).toContain('The east square contains a hidden mechanism.');
    expect(dm.recentEvents.find((event) => event.type === 'death_save_resolved')).toMatchObject({
      roll: 9,
      failures: 1,
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
