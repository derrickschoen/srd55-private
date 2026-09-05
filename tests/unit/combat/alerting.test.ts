import { describe, expect, it } from 'vitest';
import { defaultEncounterAlertingState, yellingDistance } from '../../../src/combat/alerting';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { damageType, dieSides, feet } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const fixedD20 = (face: number) => () => (face - 0.5) / 20;

function requiredAlerting(state: EncounterState) {
  if (state.alerting === undefined) throw new Error('Expected persisted D420 alerting state.');
  return state.alerting;
}

function attack(
  actor: ReturnType<typeof playerProfile>,
  target: ReturnType<typeof monsterProfile>,
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack',
    actor: actor.id,
    target: target.id,
    attackBonus: 100,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Force'),
        dice: { count: 0, sides: dieSides(6), modifier: 0 },
      }],
      critical: false,
      responses: [],
    },
  };
}

describe('D420 NPC help-calling', () => {
  it('normalizes a pre-D420 state with every roster combatant participating', () => {
    const pc = playerProfile('legacy-attacker', { initiativeBonus: 20 });
    const monster = monsterProfile('legacy-monster', { initiativeBonus: -20 });
    const created = createEncounter({
      bounds: { columns: 4, rows: 1 },
      combatants: [pc, monster],
      tokens: [placedToken(pc, 0), placedToken(monster, 2)],
    });
    const preD420Record = structuredClone(created) as unknown as Record<string, unknown>;
    delete preD420Record['alerting'];
    delete preD420Record['searchMemories'];
    const serialized = JSON.stringify(created);
    expect(serialized).toBe(JSON.stringify(preD420Record));
    const legacyRecord = JSON.parse(serialized) as unknown;

    const result = reduceEncounter(
      legacyRecord as EncounterState,
      { type: 'roll_initiative' },
      fixedD20(10),
    );

    expect(result.state.initiative.map((entry) => entry.combatant)).toEqual([pc.id, monster.id]);
    expect(result.state.searchMemories).toBeUndefined();
    expect(result.state.alerting).toBeUndefined();
  });

  it('treats an unlisted existing combatant as participating and emits no unconfigured help call', () => {
    const pc = playerProfile('unlisted-attacker', { initiativeBonus: 20 });
    const monster = monsterProfile('unlisted-monster', { initiativeBonus: -20 });
    const created = createEncounter({
      bounds: { columns: 4, rows: 1 },
      combatants: [pc, monster],
      tokens: [placedToken(pc, 0), placedToken(monster, 2)],
    });
    const defaultAlerting = defaultEncounterAlertingState([pc.id, monster.id]);
    const incompleteMembership: EncounterState = {
      ...created,
      alerting: {
        ...defaultAlerting,
        membership: defaultAlerting.membership.filter((entry) => entry.combatant === pc.id),
      },
    };
    const started = reduceEncounter(
      incompleteMembership,
      { type: 'roll_initiative' },
      fixedD20(10),
    ).state;
    const attacked = reduceEncounter(started, attack(pc, monster), fixedD20(10));

    expect(started.initiative.map((entry) => entry.combatant)).toEqual([pc.id, monster.id]);
    expect(attacked.events.some((event) => event.type === 'npc_called_for_help')).toBe(false);
  });

  it('joins exactly nearby NPCs within yelling distance and excludes one cell farther', () => {
    const pc = playerProfile('help-attacker', { initiativeBonus: 20 });
    const caller = monsterProfile('help-caller', { initiativeBonus: -20 });
    const inside = monsterProfile('help-inside');
    const outside = monsterProfile('help-outside');
    let state = createEncounter({
      bounds: { columns: 7, rows: 1 },
      alerting: {
        nearbyNpcIds: [inside.id, outside.id],
        yellingDistance: yellingDistance(feet(10)),
      },
      combatants: [pc, caller, inside, outside],
      tokens: [
        placedToken(pc, 0),
        placedToken(caller, 2),
        placedToken(inside, 4),
        placedToken(outside, 5),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(10)).state;
    const result = reduceEncounter(state, attack(pc, caller), fixedD20(10));

    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'npc_called_for_help',
      caller: caller.id,
      attacker: pc.id,
      origin: { column: 2, row: 0 },
      yellingDistance: { kind: 'yelling_distance', radius: 10 },
      soundPropagation: { kind: 'radial', occlusion: 'not_modeled' },
    }));
    expect(result.events.filter((event) => event.type === 'combatant_joined_encounter')).toEqual([
      expect.objectContaining({
        combatant: inside.id,
        calledBy: caller.id,
        distance: 10,
        initiative: { kind: 'callers_slot', slot: 1 },
      }),
    ]);
    expect(requiredAlerting(result.state).membership).toEqual([
      expect.objectContaining({ kind: 'participant', combatant: pc.id }),
      expect.objectContaining({ kind: 'participant', combatant: caller.id }),
      expect.objectContaining({ kind: 'participant', combatant: inside.id }),
      { kind: 'nearby_npc', combatant: outside.id },
    ]);
    expect(result.state.initiative.map((entry) => entry.combatant)).toEqual([
      pc.id,
      caller.id,
      inside.id,
    ]);
    const serialized = JSON.stringify(result.state);
    const roundTripped = JSON.parse(serialized) as unknown as EncounterState;
    expect(JSON.stringify(roundTripped)).toBe(serialized);
    expect(requiredAlerting(roundTripped)).toEqual(requiredAlerting(result.state));
  });

  it('measures a help call from the caller footprint rather than its anchor', () => {
    const pc = playerProfile('large-help-attacker', { initiativeBonus: 20 });
    const baseCaller = monsterProfile('large-help-caller', { initiativeBonus: -20 });
    const caller = {
      ...baseCaller,
      rules: { ...baseCaller.rules, sizeCategory: 'Large' as const },
    };
    const responder = monsterProfile('large-help-responder');
    let state = createEncounter({
      bounds: { columns: 7, rows: 2 },
      alerting: {
        nearbyNpcIds: [responder.id],
        yellingDistance: yellingDistance(feet(10)),
      },
      combatants: [pc, caller, responder],
      tokens: [placedToken(pc, 0), placedToken(caller, 2), placedToken(responder, 5)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(10)).state;

    const result = reduceEncounter(state, attack(pc, caller), fixedD20(10));

    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'combatant_joined_encounter',
      combatant: responder.id,
      calledBy: caller.id,
      distance: 10,
    }));
  });
});
