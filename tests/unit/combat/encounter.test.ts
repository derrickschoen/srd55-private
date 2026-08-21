import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { damageType, dieSides, effectStackingIdentity } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const force = damageType('Force');

function damage(amount: number) {
  return {
    terms: [{ type: force, dice: { count: 0, sides: dieSides(6), modifier: amount } }],
    critical: false,
    responses: [],
  } as const;
}

function attack(
  actor: CombatantProfile,
  target: CombatantProfile,
  amount = 1,
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
    damage: damage(amount),
  };
}

function start(
  profiles: readonly CombatantProfile[],
  columns = profiles.map((_, index) => index * 2),
): EncounterState {
  const setup = createEncounter({
    bounds: { columns: 20, rows: 3 },
    combatants: profiles,
    tokens: profiles.map((profile, index) =>
      placedToken(profile, columns[index] ?? index * 2, 1),
    ),
  });
  return reduceEncounter(setup, { type: 'roll_initiative' }, () => 0.5).state;
}

function stateOf(state: EncounterState, profile: CombatantProfile) {
  const found = state.combatants.find((entry) => entry.profile.id === profile.id);
  if (found === undefined) throw new Error(`Missing fixture combatant ${profile.id}.`);
  return found;
}

describe('encounter reducer authority and action economy', () => {
  it('requires exactly one identity-matched board token for every rules profile', () => {
    const pc = playerProfile('identity');
    expect(() =>
      createEncounter({
        bounds: { columns: 2, rows: 2 },
        combatants: [pc],
        tokens: [],
      }),
    ).toThrow('exactly one matching board token');
  });

  it('rejects an otherwise valid action from a non-active PC', () => {
    const active = playerProfile('active', { initiativeBonus: 10 });
    const inactive = playerProfile('inactive', { initiativeBonus: 0 });
    const monster = monsterProfile('monster', { initiativeBonus: -10 });
    const state = start([active, inactive, monster]);

    expect(state.activeCombatant).toBe(active.id);
    expect(() =>
      reduceEncounter(
        state,
        {
          type: 'apply_effect',
          actor: inactive.id,
          cost: 'none',
          effect: {
            targets: [monster.id],
            duration: { kind: 'permanent' },
            concentration: false,
            stackingIdentity: effectStackingIdentity('inactive-pc-control'),
            stacking: 'coexist',
            repeatedSave: null,
            payload: { kind: 'condition', condition: 'Blinded' },
          },
        },
        () => 0.5,
      ),
    ).toThrow('is not the active combatant');
    expect(state.revision).toBe(1);
  });

  it('advances initiative when an active combatant was killed by a reaction during its turn', () => {
    const active = monsterProfile('reaction-casualty', { initiativeBonus: 10 });
    const next = playerProfile('reaction-survivor', { initiativeBonus: 0 });
    const started = start([active, next]);
    const killed: EncounterState = {
      ...started,
      combatants: started.combatants.map((combatant) =>
        combatant.profile.id === active.id
          ? { ...combatant, hitPoints: 0, life: 'dead', deathSaves: null }
          : combatant),
    };

    const advanced = reduceEncounter(killed, { type: 'end_turn', actor: active.id }, () => 0.5);

    expect(advanced.state.activeCombatant).toBe(next.id);
    expect(advanced.events.map((event) => event.type)).toContain('turn_ended');
    expect(advanced.events.map((event) => event.type)).toContain('turn_started');
  });

  it('splits movement around other choices through the shared movement kernel', () => {
    const pc = playerProfile('mover', { initiativeBonus: 10 });
    const monster = monsterProfile('far', { initiativeBonus: -10 });
    let state = start([pc, monster], [0, 10]);

    state = reduceEncounter(
      state,
      { type: 'move', actor: pc.id, path: [{ column: 1, row: 1 }, { column: 2, row: 1 }], cause: 'voluntary' },
      () => 0.5,
    ).state;
    state = reduceEncounter(
      state,
      { type: 'move', actor: pc.id, path: [{ column: 3, row: 1 }], cause: 'voluntary' },
      () => 0.5,
    ).state;

    expect(stateOf(state, pc).turn.movement).toEqual({ speed: 30, spent: 15, remaining: 15 });
    expect(state.tokens.find((token) => token.combatantId === pc.id)?.position).toEqual({
      column: 3,
      row: 1,
    });
  });

  it('tracks action, Bonus Action, Reaction, and Dash movement independently', () => {
    const pc = playerProfile('resources', { initiativeBonus: 10 });
    const monster = monsterProfile('other', { initiativeBonus: -10 });
    let state = start([pc, monster], [0, 10]);

    state = reduceEncounter(
      state,
      { type: 'spend_bonus_action', actor: pc.id, purpose: 'fixture feature' },
      () => 0.5,
    ).state;
    state = reduceEncounter(
      state,
      { type: 'spend_reaction', actor: pc.id, purpose: 'fixture reaction' },
      () => 0.5,
    ).state;
    state = reduceEncounter(state, { type: 'dash', actor: pc.id }, () => 0.5).state;

    expect(stateOf(state, pc).turn).toMatchObject({
      action: { kind: 'spent' },
      bonusActionAvailable: false,
      reactionAvailable: false,
      movement: { speed: 60, spent: 0, remaining: 60 },
    });
  });

  it('temp_hp_stacks_additively keeps the higher grant and replaces it only with a larger grant', () => {
    const pc = playerProfile('temporary-hit-points', { initiativeBonus: 10, hitPoints: 20 });
    const monster = monsterProfile('temporary-hit-points-attacker', { initiativeBonus: -10 });
    let state = start([pc, monster]);
    const grant = (amount: number) => {
      const reduced = reduceEncounter(state, {
        type: 'grant_temporary_hit_points',
        actor: pc.id,
        target: pc.id,
        amount,
        cost: 'none',
      }, () => 0.5);
      state = reduced.state;
      return reduced;
    };

    grant(10);
    const smaller = grant(4);
    expect(stateOf(state, pc).temporaryHitPoints).toBe(10);
    expect(smaller.events).toContainEqual(expect.objectContaining({
      type: 'temporary_hit_points_changed',
      before: 10,
      after: 10,
    }));

    const larger = grant(12);
    expect(stateOf(state, pc).temporaryHitPoints).toBe(12);
    expect(larger.events).toContainEqual(expect.objectContaining({
      type: 'temporary_hit_points_changed',
      before: 10,
      after: 12,
    }));

    state = reduceEncounter(state, { type: 'end_turn', actor: pc.id }, () => 0.5).state;
    state = reduceEncounter(state, attack(monster, pc, 13), () => 0.5).state;
    expect(stateOf(state, pc)).toMatchObject({ hitPoints: 19, temporaryHitPoints: 0 });
  });

  it('tracks a multiattack sequence across split movement and closes it at the profile limit', () => {
    const pc = playerProfile('multiattacker', {
      initiativeBonus: 10,
      attacksPerAction: 2,
    });
    const monster = monsterProfile('multiattack-target', {
      initiativeBonus: -10,
      hitPoints: 20,
    });
    let state = start([pc, monster], [0, 4]);

    state = reduceEncounter(state, attack(pc, monster, 1), () => 0.5).state;
    expect(stateOf(state, pc).turn.action).toEqual({
      kind: 'attack_sequence',
      attacksRemaining: 1,
    });
    state = reduceEncounter(
      state,
      { type: 'move', actor: pc.id, path: [{ column: 1, row: 1 }], cause: 'voluntary' },
      () => 0.5,
    ).state;
    state = reduceEncounter(state, attack(pc, monster, 1), () => 0.5).state;

    expect(stateOf(state, pc).turn.action).toEqual({ kind: 'spent' });
    expect(stateOf(state, monster).hitPoints).toBe(18);
    expect(() => reduceEncounter(state, attack(pc, monster, 1), () => 0.5)).toThrow(
      'has no attack available',
    );
  });

  it('resolves saving throws and half damage through the shared resolution kernel', () => {
    const pc = playerProfile('save-source', { initiativeBonus: 10 });
    const monster = monsterProfile('save-target', { initiativeBonus: -10 });
    const state = start([pc, monster]);
    const result = reduceEncounter(
      state,
      {
        type: 'force_save',
        actor: pc.id,
        target: monster.id,
        ability: 'dexterity',
        dc: 10,
        rollMode: 'normal',
        damage: damage(5),
        onSuccess: 'half',
        cost: 'action',
      },
      () => 0.5,
    );

    expect(result.events.find((event) => event.type === 'save_resolved')).toMatchObject({
      target: monster.id,
      save: { outcome: 'success', total: 11 },
    });
    expect(stateOf(result.state, monster).hitPoints).toBe(8);
  });

  it('Incapacitated condition removes action, Bonus Action, and Reaction availability', () => {
    const pc = playerProfile('incapacitated', { initiativeBonus: 10 });
    const monster = monsterProfile('other', { initiativeBonus: -10 });
    const state = start([pc, monster]);
    const applied = reduceEncounter(
      state,
      {
        type: 'apply_effect',
        actor: pc.id,
        cost: 'none',
        effect: {
          targets: [pc.id],
          duration: { kind: 'permanent' },
          concentration: false,
          stackingIdentity: effectStackingIdentity('condition:incapacitated'),
          stacking: 'replace_any_source',
          repeatedSave: null,
          payload: { kind: 'condition', condition: 'Incapacitated' },
        },
      },
      () => 0.5,
    ).state;

    expect(stateOf(applied, pc).turn).toMatchObject({
      action: { kind: 'spent' },
      bonusActionAvailable: false,
      reactionAvailable: false,
    });
    expect(() => reduceEncounter(applied, { type: 'dash', actor: pc.id }, () => 0.5)).toThrow(
      'is Incapacitated',
    );
    expect(() =>
      reduceEncounter(
        applied,
        { type: 'spend_bonus_action', actor: pc.id, purpose: 'forbidden' },
        () => 0.5,
      ),
    ).toThrow('is Incapacitated');
    expect(() =>
      reduceEncounter(
        applied,
        { type: 'spend_reaction', actor: pc.id, purpose: 'forbidden' },
        () => 0.5,
      ),
    ).toThrow('cannot react');
  });

  it('Disengage suppresses the shared-kernel Opportunity Attack window', () => {
    const monster = monsterProfile('reactor', { initiativeBonus: 10 });
    const pc = playerProfile('walker', { initiativeBonus: 0 });
    let state = start([monster, pc], [1, 2]);
    state = reduceEncounter(state, { type: 'end_turn', actor: monster.id }, () => 0.5).state;

    expect(() =>
      reduceEncounter(
        state,
        { type: 'move', actor: pc.id, path: [{ column: 3, row: 1 }], cause: 'voluntary' },
        () => 0.5,
      ),
    ).toThrow('unresolved Opportunity Attack window');

    state = reduceEncounter(state, { type: 'disengage', actor: pc.id }, () => 0.5).state;
    state = reduceEncounter(
      state,
      { type: 'move', actor: pc.id, path: [{ column: 3, row: 1 }], cause: 'voluntary' },
      () => 0.5,
    ).state;
    expect(state.tokens.find((token) => token.combatantId === pc.id)?.position.column).toBe(3);
  });

  it('Dodge imposes Disadvantage until the target next starts a turn', () => {
    const pc = playerProfile('dodger', { initiativeBonus: 10 });
    const monster = monsterProfile('attacker', { initiativeBonus: 0 });
    let state = start([pc, monster], [0, 1]);
    state = reduceEncounter(state, { type: 'dodge', actor: pc.id }, () => 0.5).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: pc.id }, () => 0.5).state;
    const result = reduceEncounter(state, attack(monster, pc), () => 0.5);
    const event = result.events.find((candidate) => candidate.type === 'attack_resolved');

    expect(event?.type).toBe('attack_resolved');
    if (event?.type !== 'attack_resolved') throw new Error('Missing attack event.');
    expect(event.attack.roll.mode).toBe('disadvantage');
    expect(event.attack.roll.faces).toHaveLength(2);
  });
});

describe('0-HP, healing, and massive-damage matrix', () => {
  it.each([
    ['ordinary monster at exactly 0', monsterProfile('ordinary-exact'), 10, 'dead', false],
    ['ordinary monster overkilled', monsterProfile('ordinary-over'), 20, 'dead', false],
    [
      'named monster opted into death saves at exactly 0',
      monsterProfile('named-exact', { usesDeathSaves: true }),
      10,
      'dying',
      false,
    ],
    [
      'named monster opted into death saves takes massive damage',
      monsterProfile('named-massive', { usesDeathSaves: true }),
      20,
      'dead',
      true,
    ],
    ['PC at exactly 0', playerProfile('pc-exact', { initiativeBonus: -10 }), 10, 'dying', false],
    ['PC takes massive damage', playerProfile('pc-massive', { initiativeBonus: -10 }), 20, 'dead', true],
  ] as const)('%s', (_label, target, amount, expectedLife, massiveDamage) => {
    const attacker = playerProfile(`attacker-${target.id}`, { initiativeBonus: 20 });
    const state = start([attacker, target]);
    const result = reduceEncounter(state, attack(attacker, target, amount), () => 0.5);
    const event = result.events.find((candidate) => candidate.type === 'damage_applied');

    expect(stateOf(result.state, target)).toMatchObject({ hitPoints: 0, life: expectedLife });
    expect(event?.type).toBe('damage_applied');
    if (event?.type !== 'damage_applied') throw new Error('Missing damage event.');
    expect(event.massiveDamage).toBe(massiveDamage);
  });

  it('healing a dying death-save user restores living state without implementing death-save rolls', () => {
    const healer = playerProfile('healer', { initiativeBonus: 20 });
    const target = playerProfile('patient', { initiativeBonus: -10 });
    let state = start([healer, target]);
    state = reduceEncounter(state, attack(healer, target, 10), () => 0.5).state;
    state = reduceEncounter(
      state,
      { type: 'heal', actor: healer.id, target: target.id, amount: 3, cost: 'none' },
      () => 0.5,
    ).state;

    expect(stateOf(state, target)).toMatchObject({ hitPoints: 3, life: 'living' });
  });
});
