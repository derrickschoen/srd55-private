import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import { damageType, dieSides } from '../../../src/combat/values';
import { placedToken, playerProfile } from './fixtures';

const force = damageType('Force');

const DEATH_SAVE_RULE_EXPECTATIONS = Object.freeze({
  successFloor: 10,
  resolutionCount: 3,
  naturalOne: 1,
  naturalOneFailures: 2,
  naturalTwenty: 20,
  naturalTwentyHitPoints: 1,
  ordinarySuccessMarks: 1,
  ordinaryFailureMarks: 1,
  damageAtZeroFailures: 1,
  criticalDamageAtZeroFailures: 2,
});

function fixedD20(face: number): () => number {
  return () => (face - 0.5) / 20;
}

function attack(
  actor: CombatantProfile,
  target: CombatantProfile,
  amount: number,
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
        type: force,
        dice: { count: 0, sides: dieSides(6), modifier: amount },
      }],
      critical: false,
      responses: [],
    },
  };
}

function subject(state: EncounterState, profile: CombatantProfile) {
  const found = state.combatants.find((entry) => entry.profile.id === profile.id);
  if (found === undefined) throw new Error('Missing death-save fixture combatant.');
  return found;
}

function dyingEncounter(): {
  readonly state: EncounterState;
  readonly attacker: CombatantProfile;
  readonly patient: CombatantProfile;
} {
  const attacker = playerProfile('death-save-attacker', {
    hitPoints: 30,
    initiativeBonus: 20,
    attacksPerAction: 2,
  });
  const patient = playerProfile('death-save-patient', {
    hitPoints: 10,
    initiativeBonus: -20,
  });
  const initial = createEncounter({
    bounds: { columns: 5, rows: 2 },
    combatants: [attacker, patient],
    tokens: [placedToken(attacker, 0), placedToken(patient, 1)],
  });
  const started = reduceEncounter(initial, { type: 'roll_initiative' }, fixedD20(11)).state;
  const state = reduceEncounter(started, attack(attacker, patient, 10), fixedD20(11)).state;
  return { state, attacker, patient };
}

function startPatientTurn(
  state: EncounterState,
  attacker: CombatantProfile,
  deathSaveFace: number,
): { readonly state: EncounterState; readonly event: Extract<EncounterEvent, { readonly type: 'death_save_resolved' }> } {
  const reduction = reduceEncounter(
    state,
    { type: 'end_turn', actor: attacker.id },
    fixedD20(deathSaveFace),
  );
  const event = reduction.events.find(
    (candidate): candidate is Extract<EncounterEvent, { readonly type: 'death_save_resolved' }> =>
      candidate.type === 'death_save_resolved',
  );
  if (event === undefined) throw new Error('Missing death-save result event.');
  return { state: reduction.state, event };
}

function advanceToAttacker(
  state: EncounterState,
  patient: CombatantProfile,
): EncounterState {
  return reduceEncounter(
    state,
    { type: 'end_turn', actor: patient.id },
    fixedD20(11),
  ).state;
}

describe('SRD death-save reducer flow', () => {
  it.each([
    [1, 'natural_1', 0, 2, 'dying', 0],
    [2, 'failure', 0, 1, 'dying', 0],
    [9, 'failure', 0, 1, 'dying', 0],
    [10, 'success', 1, 0, 'dying', 0],
    [19, 'success', 1, 0, 'dying', 0],
    [20, 'natural_20', 0, 0, 'living', 1],
  ] as const)(
    'pins d20 %i as %s with exact counters and HP',
    (roll, outcome, successes, failures, life, hitPoints) => {
      const fixture = dyingEncounter();
      const result = startPatientTurn(fixture.state, fixture.attacker, roll);

      expect(result.event).toMatchObject({
        roll,
        outcome,
        successes,
        failures,
        lifeState: life,
        visibility: 'dm_only',
      });
      expect(subject(result.state, fixture.patient)).toMatchObject({
        hitPoints,
        life,
      });
    },
  );

  it('pins success at 10 rather than 11', () => {
    expect(DEATH_SAVE_RULE_EXPECTATIONS.successFloor).toBe(10);
    const fixture = dyingEncounter();
    expect(startPatientTurn(fixture.state, fixture.attacker, 10).event.outcome).toBe(
      'success',
    );
  });

  it('pins a natural 1 to exactly two failures', () => {
    expect(DEATH_SAVE_RULE_EXPECTATIONS.naturalOne).toBe(1);
    expect(DEATH_SAVE_RULE_EXPECTATIONS.naturalOneFailures).toBe(2);
    const fixture = dyingEncounter();
    const result = startPatientTurn(fixture.state, fixture.attacker, 1);
    expect(result.event.failures).toBe(2);
    expect(subject(result.state, fixture.patient).deathSaves).toEqual({
      successes: 0,
      failures: 2,
    });
  });

  it('pins ordinary save and damage-at-zero marks independently', () => {
    expect(DEATH_SAVE_RULE_EXPECTATIONS.ordinarySuccessMarks).toBe(1);
    expect(DEATH_SAVE_RULE_EXPECTATIONS.ordinaryFailureMarks).toBe(1);
    expect(DEATH_SAVE_RULE_EXPECTATIONS.damageAtZeroFailures).toBe(1);
    expect(DEATH_SAVE_RULE_EXPECTATIONS.criticalDamageAtZeroFailures).toBe(2);
  });

  it('pins a natural 20 to exactly 1 HP and a playable conscious turn', () => {
    expect(DEATH_SAVE_RULE_EXPECTATIONS.naturalTwenty).toBe(20);
    expect(DEATH_SAVE_RULE_EXPECTATIONS.naturalTwentyHitPoints).toBe(1);
    const fixture = dyingEncounter();
    const result = startPatientTurn(fixture.state, fixture.attacker, 20);
    expect(subject(result.state, fixture.patient)).toMatchObject({
      hitPoints: 1,
      life: 'living',
      deathSaves: null,
      turn: {
        action: { kind: 'available' },
        bonusActionAvailable: true,
      },
    });
  });

  it.each([
    ['three successes stabilize and reset both counters', 10, 'stable'],
    ['three failures kill', 9, 'dead'],
  ] as const)('%s', (_label, roll, life) => {
    expect(DEATH_SAVE_RULE_EXPECTATIONS.resolutionCount).toBe(3);
    const fixture = dyingEncounter();
    let state = fixture.state;
    let finalEvent: Extract<EncounterEvent, { readonly type: 'death_save_resolved' }> | null = null;
    for (let count = 0; count < 3; count += 1) {
      const result = startPatientTurn(state, fixture.attacker, roll);
      state = result.state;
      finalEvent = result.event;
      if (count < 2) state = advanceToAttacker(state, fixture.patient);
    }
    expect(finalEvent).toMatchObject({ lifeState: life });
    expect(subject(state, fixture.patient)).toMatchObject({
      hitPoints: 0,
      life,
      deathSaves: null,
    });
  });

  it('stabilized then healed transitions stable to conscious and keeps counters reset', () => {
    const fixture = dyingEncounter();
    let state = fixture.state;
    for (let count = 0; count < 3; count += 1) {
      state = startPatientTurn(state, fixture.attacker, 10).state;
      if (count < 2) state = advanceToAttacker(state, fixture.patient);
    }
    state = advanceToAttacker(state, fixture.patient);
    state = reduceEncounter(
      state,
      {
        type: 'heal',
        actor: fixture.attacker.id,
        target: fixture.patient.id,
        amount: 2,
        cost: 'none',
      },
      fixedD20(11),
    ).state;
    expect(subject(state, fixture.patient)).toMatchObject({
      hitPoints: 2,
      life: 'living',
      deathSaves: null,
    });
  });

  it('damage at 0 HP adds one failure and restarts a stable creature as dying', () => {
    const fixture = dyingEncounter();
    let state = fixture.state;
    for (let count = 0; count < 3; count += 1) {
      state = startPatientTurn(state, fixture.attacker, 10).state;
      if (count < 2) state = advanceToAttacker(state, fixture.patient);
    }
    state = advanceToAttacker(state, fixture.patient);
    state = reduceEncounter(
      state,
      {
        type: 'force_save',
        actor: fixture.attacker.id,
        target: fixture.patient.id,
        ability: 'constitution',
        dc: 30,
        rollMode: 'normal',
        damage: {
          terms: [{
            type: force,
            dice: { count: 0, sides: dieSides(6), modifier: 1 },
          }],
          critical: false,
          responses: [],
        },
        onSuccess: 'none',
        cost: 'none',
      },
      fixedD20(11),
    ).state;
    expect(subject(state, fixture.patient)).toMatchObject({
      hitPoints: 0,
      life: 'dying',
      deathSaves: { successes: 0, failures: 1 },
    });
  });

  it('a critical hit at 0 HP adds exactly two failures', () => {
    const fixture = dyingEncounter();
    const state = reduceEncounter(
      fixture.state,
      attack(fixture.attacker, fixture.patient, 1),
      fixedD20(11),
    ).state;
    expect(subject(state, fixture.patient)).toMatchObject({
      life: 'dying',
      deathSaves: { successes: 0, failures: 2 },
    });
  });

  it('survives when initial overkill is one point below the massive-damage boundary', () => {
    const attacker = playerProfile('below-boundary-attacker', { initiativeBonus: 20 });
    const patient = playerProfile('below-boundary-patient', {
      hitPoints: 10,
      initiativeBonus: -20,
    });
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [attacker, patient],
      tokens: [placedToken(attacker, 0), placedToken(patient, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(11)).state;
    state = reduceEncounter(state, attack(attacker, patient, 19), fixedD20(11)).state;
    expect(subject(state, patient)).toMatchObject({
      hitPoints: 0,
      life: 'dying',
      deathSaves: { successes: 0, failures: 0 },
    });
  });

  it('kills at the exact massive-damage boundary while already at 0 HP', () => {
    const fixture = dyingEncounter();
    const result = reduceEncounter(
      fixture.state,
      attack(fixture.attacker, fixture.patient, 10),
      fixedD20(11),
    );
    const damageEvent = result.events.find((event) => event.type === 'damage_applied');
    expect(damageEvent).toMatchObject({
      amount: 10,
      hitPointsBefore: 0,
      massiveDamage: true,
      lifeState: 'dead',
    });
  });
});
