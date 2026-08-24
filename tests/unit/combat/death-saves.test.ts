import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
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
  const started = reduceEncounter(
    state,
    { type: 'end_turn', actor: attacker.id },
    fixedD20(11),
  );
  const decision = started.state.pendingDecisions.find((candidate) =>
    candidate.kind === 'death_save');
  if (decision === undefined) throw new Error('Missing death-save pending decision.');
  const reduction = reduceEncounter(started.state, {
    type: 'resolve_pending_decision',
    decisionId: decision.id,
    optionId: 'roll',
  }, fixedD20(deathSaveFace));
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
  it('queues a closed death_save PendingDecision at the start of a dying PC turn', () => {
    // Start-of-turn Death Save: docs/srd/full/srd-5.2.1.txt:1084-1093,11633-11636.
    const fixture = dyingEncounter();
    const started = reduceEncounter(
      fixture.state,
      { type: 'end_turn', actor: fixture.attacker.id },
      fixedD20(11),
    );
    expect(started.events).toContainEqual(expect.objectContaining({
      type: 'pending_decision_queued',
      kind: 'death_save',
      combatant: fixture.patient.id,
    }));
    expect(started.state.pendingDecisions).toContainEqual(expect.objectContaining({
      kind: 'death_save',
      combatant: fixture.patient.id,
      options: [{ id: 'roll', label: 'Roll Death Save' }],
    }));
    expect(started.events.some((event) => event.type === 'death_save_resolved')).toBe(false);
  });

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
        stableRecovery: null,
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

  it('nat20_plain_success: a natural 20 restores exactly 1 HP and a playable conscious turn', () => {
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
    expect(finalEvent).toMatchObject({
      lifeState: life,
      stableRecovery: life === 'stable' ? '1d4_hours_outside_encounter' : null,
    });
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

  it('healing at 0 HP restores consciousness and clears a queued Death Save', () => {
    // Healing ends Unconsciousness and resets Death Saves: docs/srd/full/srd-5.2.1.txt:1081-1099.
    const fixture = dyingEncounter();
    let state = reduceEncounter(
      fixture.state,
      { type: 'end_turn', actor: fixture.attacker.id },
      fixedD20(11),
    ).state;
    expect(state.pendingDecisions).toContainEqual(expect.objectContaining({ kind: 'death_save' }));
    state = reduceEncounter({ ...state, activeCombatant: fixture.attacker.id }, {
      type: 'heal',
      actor: fixture.attacker.id,
      target: fixture.patient.id,
      amount: 1,
      cost: 'none',
    }, fixedD20(11)).state;
    expect(subject(state, fixture.patient)).toMatchObject({
      hitPoints: 1,
      life: 'living',
      deathSaves: null,
    });
    expect(state.pendingDecisions).toEqual([]);
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

  it('critical damage at 0 HP adds two failures while normal damage adds one', () => {
    const ordinary = dyingEncounter();
    const ordinaryState = reduceEncounter(
      ordinary.state,
      {
        type: 'force_save',
        actor: ordinary.attacker.id,
        target: ordinary.patient.id,
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
    const critical = dyingEncounter();
    const criticalState = reduceEncounter(
      critical.state,
      attack(critical.attacker, critical.patient, 1),
      fixedD20(20),
    ).state;
    expect(subject(ordinaryState, ordinary.patient)).toMatchObject({
      life: 'dying',
      deathSaves: { successes: 0, failures: 1 },
    });
    expect(subject(criticalState, critical.patient)).toMatchObject({
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

  it('massive_damage_remainder_boundary: exact-maximum remainder kills while one less leaves the character dying', () => {
    // SRD example: max 12, current 6, 18 damage leaves 12 and kills:
    // docs/srd/full/srd-5.2.1.txt:1062-1067.
    const applyExampleDamage = (amount: 17 | 18, fixtureName: string) => {
      const attacker = playerProfile(`${fixtureName}-attacker`, {
        initiativeBonus: 20,
        attacksPerAction: 2,
      });
      const patient = playerProfile(`${fixtureName}-patient`, {
        hitPoints: 12,
        initiativeBonus: -20,
      });
      let state = createEncounter({
        bounds: { columns: 3, rows: 2 },
        combatants: [attacker, patient],
        tokens: [placedToken(attacker, 0), placedToken(patient, 1)],
      });
      state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(11)).state;
      state = reduceEncounter(state, attack(attacker, patient, 6), fixedD20(11)).state;
      expect(subject(state, patient).hitPoints).toBe(6);
      const result = reduceEncounter(state, attack(attacker, patient, amount), fixedD20(11));
      const damageEvent = result.events.find((event) => event.type === 'damage_applied');
      return { result, damageEvent, patient };
    };

    const exact = applyExampleDamage(18, 'exact-boundary');
    expect(exact.damageEvent).toMatchObject({
      amount: 18,
      hitPointsBefore: 6,
      hitPointsAfter: 0,
      massiveDamage: true,
      lifeState: 'dead',
    });
    expect(subject(exact.result.state, exact.patient)).toMatchObject({
      hitPoints: 0,
      life: 'dead',
      deathSaves: null,
    });

    const oneBelow = applyExampleDamage(17, 'below-boundary-sibling');
    expect(oneBelow.damageEvent).toMatchObject({
      amount: 17,
      hitPointsBefore: 6,
      hitPointsAfter: 0,
      massiveDamage: false,
      lifeState: 'dying',
    });
    expect(subject(oneBelow.result.state, oneBelow.patient)).toMatchObject({
      hitPoints: 0,
      life: 'dying',
      deathSaves: { successes: 0, failures: 0 },
    });
  });

  it('massive_damage_ignored: kills at the exact massive-damage boundary while already at 0 HP', () => {
    const fixture = dyingEncounter();
    const result = reduceEncounter(
      fixture.state,
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
            dice: { count: 0, sides: dieSides(6), modifier: 10 },
          }],
          critical: false,
          responses: [],
        },
        onSuccess: 'none',
        cost: 'none',
      },
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

  it('override_unlogged: every explicit DM death override emits a D357 adjudicated ruling card', () => {
    const fixture = dyingEncounter();
    const commands = [
      { type: 'dm_stabilize', target: fixture.patient.id },
      { type: 'dm_revive_at_one_hit_point', target: fixture.patient.id },
      { type: 'dm_set_death_save_counts', target: fixture.patient.id, successes: 2, failures: 1 },
      { type: 'dm_mark_dead', target: fixture.patient.id },
    ] as const satisfies readonly EncounterCommand[];
    let state = fixture.state;
    const overrides: string[] = [];
    for (const command of commands) {
      const reduction = reduceEncounter(state, command, fixedD20(11));
      state = reduction.state;
      const ruling = reduction.events.find((event) => event.type === 'adjudicated');
      expect(ruling).toMatchObject({
        type: 'adjudicated',
        target: fixture.patient.id,
        subject: expect.stringMatching(/^dm-override:/u),
        consequence: expect.objectContaining({ kind: 'death_override' }),
      });
      if (ruling?.type === 'adjudicated' && ruling.consequence.kind === 'death_override') {
        overrides.push(ruling.consequence.override);
      }
    }
    expect(overrides).toEqual([
      'stabilize',
      'revive_at_one_hit_point',
      'set_death_save_counts',
      'mark_dead',
    ]);
    expect(subject(state, fixture.patient)).toMatchObject({ life: 'dead', hitPoints: 0, deathSaves: null });
  });

  it('hidden_roll_leaks: the toggle redacts only the number from PlayerView while DmView retains it', () => {
    const fixture = dyingEncounter();
    const resolved = startPatientTurn(fixture.state, fixture.attacker, 9).state;
    const dm = projectDmView(resolved);
    const shownState = reduceEncounter(resolved, {
      type: 'set_hide_death_save_rolls', hidden: false,
    }, fixedD20(11)).state;
    const hiddenState = reduceEncounter(resolved, {
      type: 'set_hide_death_save_rolls', hidden: true,
    }, fixedD20(11)).state;
    const shown = projectPlayerView(shownState, {
      seatId: 'seat:death-save',
      combatantId: fixture.patient.id,
    });
    const hidden = projectPlayerView(hiddenState, {
      seatId: 'seat:death-save',
      combatantId: fixture.patient.id,
    });
    const shownEvent = shown.recentEvents.find((event) => event.type === 'death_save_resolved');
    const hiddenEvent = hidden.recentEvents.find((event) => event.type === 'death_save_resolved');
    expect(shownEvent).toMatchObject({ rollVisibility: 'player_visible', roll: 9, lifeState: 'dying' });
    expect(hiddenEvent).toMatchObject({ rollVisibility: 'dm_only', lifeState: 'dying', failures: 1 });
    expect(hiddenEvent === undefined ? true : Object.hasOwn(hiddenEvent, 'roll')).toBe(false);
    expect(dm.state.eventLog.find((event) => event.type === 'death_save_resolved')).toMatchObject({ roll: 9 });
  });
});
