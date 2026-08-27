import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { monsterCombatantProfile, type CombatantProfile } from '../../../src/combat/combatant';
import type { EncounterCommand } from '../../../src/combat/events';
import type { MonsterLegendaryAction } from '../../../src/combat/statblock';
import { UNICORN } from '../../../src/combat/statblocks/monsters';
import { LEGENDARY_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { damageType, dieSides, effectStackingIdentity } from '../../../src/combat/values';
import { placedToken, playerProfile } from '../combat/fixtures';

function face(value: number): () => number {
  return () => (value - 0.5) / 20;
}

function sequence(...values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values.at(-1) ?? 10;
    index += 1;
    return (value - 0.5) / 20;
  };
}

function unicornProfile(key = 'legendary-unicorn'): CombatantProfile {
  return monsterCombatantProfile(UNICORN, {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
  });
}

function withLegendaryActions(
  profile: CombatantProfile,
  actions: readonly MonsterLegendaryAction[],
): CombatantProfile {
  const legendary = profile.rules.legendary;
  if (legendary === undefined) throw new Error('Unicorn legendary kit is missing.');
  return { ...profile, rules: { ...profile.rules, legendary: { ...legendary, actions } } };
}

function startedEncounter(
  players: readonly CombatantProfile[],
  unicorn = unicornProfile(),
  options: { readonly resistancePolicy?: 'ask' | 'always' | 'never' } = {},
): { readonly state: EncounterState; readonly unicorn: CombatantProfile } {
  const combatants = [...players, unicorn];
  const initial = createEncounter({
    bounds: { columns: 12, rows: 4 },
    combatants,
    tokens: combatants.map((profile, index) => placedToken(profile, index, 1)),
    ...(options.resistancePolicy === undefined ? {} : {
      reactionPolicies: [{
        combatant: unicorn.id,
        reactionKind: 'legendary_resistance' as const,
        policy: options.resistancePolicy,
      }],
    }),
  });
  const initiativeFaces = players.flatMap((_player, index) => [20 - index * 2]);
  return {
    state: reduceEncounter(initial, { type: 'roll_initiative' }, sequence(...initiativeFaces, 1)).state,
    unicorn,
  };
}

function pendingWindow(state: EncounterState) {
  const decision = state.pendingDecisions.find((candidate) => candidate.kind === 'legendary_action_window');
  if (decision === undefined) throw new Error('Expected a legendary-action window.');
  return decision;
}

function combatantState(state: EncounterState, profile: CombatantProfile) {
  const subject = state.combatants.find((candidate) => candidate.profile.id === profile.id);
  if (subject === undefined) throw new Error(`Missing combatant ${profile.id}.`);
  return subject;
}

function forceConstitutionSave(
  actor: CombatantProfile,
  target: CombatantProfile,
): Extract<EncounterCommand, { readonly type: 'force_save' }> {
  return {
    type: 'force_save', actor: actor.id, target: target.id,
    ability: 'constitution', dc: 20, rollMode: 'normal',
    damage: {
      terms: [{ type: damageType('Force'), dice: { count: 0, sides: dieSides(6), modifier: 4 } }],
      critical: false, responses: [],
    },
    onSuccess: 'none', cost: 'none',
  };
}

describe('D371.3 SRD legendary-monster vocabulary', () => {
  it('decodes the Unicorn end-to-end with SRD provenance and both legendary pools', () => {
    // General Legendary Action rule: docs/srd/full/srd-5.2.1.txt:16703-16716.
    // Legendary Resistance: docs/srd/full/srd-5.2.1.txt:21964-21971.
    // Legendary Action pool, window, refresh, and actions: docs/srd/full/srd-5.2.1.txt:21997-22009.
    const row = LEGENDARY_MONSTER_ROSTER[0];
    expect(row).toMatchObject({
      id: 'statblock:unicorn', name: 'Unicorn', challengeRating: 5,
      provenance: { kind: 'srd_5_2_1_decoded' },
    });
    expect(row?.provenance.source).toEqual([{
      path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 21945, lineEnd: 22009,
    }]);
    expect(row?.statblock.sourceDetails.legendaryResistance).toEqual({
      kind: 'present',
      value: { maximumUses: 3, recharge: 'day', conversion: 'failed_save_to_success' },
    });
    expect(row?.statblock.sourceDetails.legendaryActions).toEqual({
      kind: 'present',
      value: expect.objectContaining({
        maximumUses: 3, refresh: 'start_of_each_turn', window: 'after_another_creature_turn',
        actions: [
          expect.objectContaining({ id: 'charging-horn', kind: 'move_and_attack', cost: 1, attackId: 'radiant-horn' }),
          expect.objectContaining({ id: 'shimmering-shield', kind: 'temporary_defense', cost: 1, armorClassBonus: 2 }),
        ],
      }),
    });
    expect(row?.statblock.sourceDetails.languages).toEqual({
      kind: 'present',
      value: expect.arrayContaining([{ kind: 'telepathy', rangeFeet: 120 }]),
    });
    expect(row?.statblock.sourceDetails.actions).toEqual({
      kind: 'present',
      value: expect.arrayContaining([expect.objectContaining({
        kind: 'spellcasting', id: 'spellcasting',
        spells: expect.arrayContaining([
          { id: 'detect-evil-and-good', availability: 'at_will', manifestStatus: 'implemented' },
          { id: 'druidcraft', availability: 'at_will', manifestStatus: 'not_in_manifest' },
          { id: 'word-of-recall', availability: '1_per_day', manifestStatus: 'not_in_manifest' },
        ]),
      })]),
    });
    expect(row?.statblock.sourceDetails.bonusActions).toEqual({
      kind: 'present',
      value: [expect.objectContaining({
        kind: 'spell_choice', id: 'unicorns-blessing', uses: 3,
        spells: [
          { id: 'cure-wounds', availability: 'shared_3_per_day', manifestStatus: 'implemented' },
          { id: 'lesser-restoration', availability: 'shared_3_per_day', manifestStatus: 'implemented' },
        ],
      })],
    });
    expect(unicornProfile('decoded-unicorn').rules.magicResistance).toBe(true);
    const generalRule = readFileSync('docs/srd/full/srd-5.2.1.txt', 'utf8')
      .split('\n').slice(16702, 16716).join(' ');
    for (const sourced of ['immediately after', 'another creature’s turn', 'limited number', 'regains all']) {
      expect(generalRule).toContain(sourced);
    }
    const cited = readFileSync('docs/srd/full/srd-5.2.1.txt', 'utf8')
      .split('\n').slice(21944, 22009).join(' ');
    for (const sourced of ['Unicorn', 'AC 12', 'HP 97', 'Speed 50 ft.', 'CR 5', 'Legendary Resistance (3/Day)', 'Legendary Action Uses: 3', 'Charging Horn', 'Shimmering Shield']) {
      expect(cited).toContain(sourced);
    }
  });

  it('queues affordable actions plus pass only at the end of another creature turn', () => {
    // Valid window and refresh rule: docs/srd/full/srd-5.2.1.txt:21997-22005.
    const player = playerProfile('window-player', { initiativeBonus: 20 });
    const setup = startedEncounter([player]);
    const ended = reduceEncounter(setup.state, { type: 'end_turn', actor: player.id }, face(10));
    expect(ended.state.activeCombatant).toBe(player.id);
    expect(pendingWindow(ended.state).options.map((option) => option.id)).toEqual([
      'legendary_action:charging-horn', 'legendary_action:shimmering-shield', 'pass',
    ]);
  });

  it('cost_ignored: two different legendary actions decrement their distinct declared costs', () => {
    const base = unicornProfile('cost-unicorn');
    const legendary = base.rules.legendary;
    if (legendary === undefined) throw new Error('Unicorn legendary kit is missing.');
    const actions = legendary.actions.map((action) => action.id === 'shimmering-shield'
      ? { ...action, cost: 2 }
      : action);
    const unicorn = withLegendaryActions(base, actions);
    const player = playerProfile('cost-player', { initiativeBonus: 20, hitPoints: 100 });

    const attackSetup = startedEncounter([player], unicorn);
    const attackQueued = reduceEncounter(attackSetup.state, { type: 'end_turn', actor: player.id }, face(10)).state;
    const attackDecision = pendingWindow(attackQueued);
    const attacked = reduceEncounter(attackQueued, {
      type: 'resolve_pending_decision', decisionId: attackDecision.id,
      optionId: 'legendary_action:charging-horn',
    }, face(20));
    expect(combatantState(attacked.state, unicorn).legendary?.actionUsesRemaining).toBe(2);
    expect(attacked.events.some((event) => event.type === 'attack_resolved')).toBe(true);

    const shieldSetup = startedEncounter([player], unicorn);
    const shieldQueued = reduceEncounter(shieldSetup.state, { type: 'end_turn', actor: player.id }, face(10)).state;
    const shieldDecision = pendingWindow(shieldQueued);
    const shielded = reduceEncounter(shieldQueued, {
      type: 'resolve_pending_decision', decisionId: shieldDecision.id,
      optionId: 'legendary_action:shimmering-shield',
    }, face(10));
    expect(combatantState(shielded.state, unicorn).legendary?.actionUsesRemaining).toBe(1);
    expect(combatantState(shielded.state, unicorn).temporaryHitPoints).toBeGreaterThan(0);
  });

  it('exhausts the action pool exactly and queues no window at zero remaining', () => {
    const base = unicornProfile('exhausted-unicorn');
    const legendary = base.rules.legendary;
    if (legendary === undefined) throw new Error('Unicorn legendary kit is missing.');
    const actions = legendary.actions.map((action) => action.id === 'shimmering-shield'
      ? { ...action, cost: 3 }
      : action);
    const unicorn = withLegendaryActions(base, actions);
    const first = playerProfile('exhaust-first', { initiativeBonus: 20 });
    const second = playerProfile('exhaust-second', { initiativeBonus: 18 });
    const setup = startedEncounter([first, second], unicorn);
    const queued = reduceEncounter(setup.state, { type: 'end_turn', actor: first.id }, face(10)).state;
    const decision = pendingWindow(queued);
    const spent = reduceEncounter(queued, {
      type: 'resolve_pending_decision', decisionId: decision.id,
      optionId: 'legendary_action:shimmering-shield',
    }, face(10)).state;
    expect(combatantState(spent, unicorn).legendary?.actionUsesRemaining).toBe(0);
    const advanced = reduceEncounter(spent, { type: 'end_turn', actor: first.id }, face(10)).state;
    expect(advanced.activeCombatant).toBe(second.id);
    const secondEnded = reduceEncounter(advanced, { type: 'end_turn', actor: second.id }, face(10)).state;
    expect(secondEnded.pendingDecisions).toEqual([]);
    expect(secondEnded.activeCombatant).toBe(unicorn.id);
  });

  it('pool_never_refreshes: refreshes all legendary action uses at the monster turn start', () => {
    const player = playerProfile('refresh-player', { initiativeBonus: 20 });
    const setup = startedEncounter([player]);
    const queued = reduceEncounter(setup.state, { type: 'end_turn', actor: player.id }, face(10)).state;
    const decision = pendingWindow(queued);
    const used = reduceEncounter(queued, {
      type: 'resolve_pending_decision', decisionId: decision.id,
      optionId: 'legendary_action:charging-horn',
    }, face(20)).state;
    expect(combatantState(used, setup.unicorn).legendary?.actionUsesRemaining).toBe(2);
    const advanced = reduceEncounter(used, { type: 'end_turn', actor: player.id }, face(10));
    expect(advanced.state.activeCombatant).toBe(setup.unicorn.id);
    expect(combatantState(advanced.state, setup.unicorn).legendary?.actionUsesRemaining).toBe(3);
    expect(advanced.events).toContainEqual(expect.objectContaining({
      type: 'legendary_action_pool_refreshed', combatant: setup.unicorn.id, remaining: 3,
    }));
  });

  it('window_on_own_turn: does not queue a legendary window at the monster own turn end', () => {
    const player = playerProfile('own-turn-player', { initiativeBonus: 20 });
    const setup = startedEncounter([player]);
    const queued = reduceEncounter(setup.state, { type: 'end_turn', actor: player.id }, face(10)).state;
    const decision = pendingWindow(queued);
    const passed = reduceEncounter(queued, {
      type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'pass',
    }, face(10)).state;
    const unicornTurn = reduceEncounter(passed, { type: 'end_turn', actor: player.id }, face(10)).state;
    expect(unicornTurn.activeCombatant).toBe(setup.unicorn.id);
    const ownEnd = reduceEncounter(unicornTurn, { type: 'end_turn', actor: setup.unicorn.id }, face(10)).state;
    expect(ownEnd.pendingDecisions).toEqual([]);
    expect(ownEnd.activeCombatant).toBe(player.id);
  });

  it('legendary_window_incapacitated: excludes an Incapacitated monster while queueing its eligible peer', () => {
    const player = playerProfile('incapacitated-window-player', { initiativeBonus: 20 });
    const incapacitated = unicornProfile('incapacitated-window-unicorn');
    const eligible = unicornProfile('eligible-window-unicorn');
    const setup = startedEncounter([player, incapacitated], eligible);
    const conditioned = reduceEncounter(setup.state, {
      type: 'apply_effect',
      actor: player.id,
      cost: 'none',
      effect: {
        targets: [incapacitated.id],
        duration: { kind: 'permanent' },
        concentration: false,
        stackingIdentity: effectStackingIdentity('condition:incapacitated'),
        stacking: 'replace_any_source',
        repeatedSave: null,
        payload: { kind: 'condition', condition: 'Incapacitated' },
      },
    }, face(10)).state;

    const ended = reduceEncounter(conditioned, { type: 'end_turn', actor: player.id }, face(10));
    const windows = ended.state.pendingDecisions.filter((decision) => decision.kind === 'legendary_action_window');
    expect(windows.some((decision) => decision.combatant === incapacitated.id)).toBe(false);
    expect(windows.some((decision) => decision.combatant === eligible.id)).toBe(true);
  });
});

describe('D373.12 Legendary Resistance pending decisions', () => {
  it('resistance_free: spend converts a failure, restores its damage, and decrements the visible uses', () => {
    // Conversion rule: docs/srd/full/srd-5.2.1.txt:21964-21971.
    const player = playerProfile('resistance-spend-player', { initiativeBonus: 20 });
    const setup = startedEncounter([player]);
    const failed = reduceEncounter(setup.state, forceConstitutionSave(player, setup.unicorn), face(1));
    const decision = failed.state.pendingDecisions.find((candidate) => candidate.kind === 'legendary_resistance');
    if (decision === undefined) throw new Error('Expected a Legendary Resistance decision.');
    expect(combatantState(failed.state, setup.unicorn).hitPoints).toBe(93);
    const spent = reduceEncounter(failed.state, {
      type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'spend',
    }, face(10));
    expect(combatantState(spent.state, setup.unicorn)).toMatchObject({
      hitPoints: 97,
      legendary: { resistanceUsesRemaining: 2 },
    });
    expect(spent.events).toContainEqual(expect.objectContaining({
      type: 'legendary_resistance_used', originalOutcome: 'failure', convertedOutcome: 'success', remaining: 2,
    }));
  });

  it('distinguishes suffer from spend by retaining the failed-save damage and all uses', () => {
    const player = playerProfile('resistance-suffer-player', { initiativeBonus: 20 });
    const setup = startedEncounter([player]);
    const failed = reduceEncounter(setup.state, forceConstitutionSave(player, setup.unicorn), face(1));
    const decision = failed.state.pendingDecisions.find((candidate) => candidate.kind === 'legendary_resistance');
    if (decision === undefined) throw new Error('Expected a Legendary Resistance decision.');
    const suffered = reduceEncounter(failed.state, {
      type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'suffer',
    }, face(10));
    expect(combatantState(suffered.state, setup.unicorn)).toMatchObject({
      hitPoints: 93,
      legendary: { resistanceUsesRemaining: 3 },
    });
    expect(suffered.events.some((event) => event.type === 'legendary_resistance_used')).toBe(false);
  });

  it('queues no resistance prompt at exactly zero remaining', () => {
    const player = playerProfile('zero-resistance-player', { initiativeBonus: 20 });
    const setup = startedEncounter([player]);
    const zeroed: EncounterState = {
      ...setup.state,
      combatants: setup.state.combatants.map((subject) => subject.profile.id === setup.unicorn.id && subject.legendary !== undefined
        ? { ...subject, legendary: { ...subject.legendary, resistanceUsesRemaining: 0 } }
        : subject),
    };
    const failed = reduceEncounter(zeroed, forceConstitutionSave(player, setup.unicorn), face(1));
    expect(failed.state.pendingDecisions.some((decision) => decision.kind === 'legendary_resistance')).toBe(false);
    expect(combatantState(failed.state, setup.unicorn).hitPoints).toBe(93);
  });

  it('a never policy auto-declines Legendary Resistance with an explicit record', () => {
    const player = playerProfile('never-resistance-player', { initiativeBonus: 20 });
    const setup = startedEncounter([player], unicornProfile('never-resistance-unicorn'), { resistancePolicy: 'never' });
    const failed = reduceEncounter(setup.state, forceConstitutionSave(player, setup.unicorn), face(1));
    expect(failed.state.pendingDecisions).toEqual([]);
    expect(failed.events).toContainEqual(expect.objectContaining({
      type: 'reaction_policy_auto_resolved', reactionKind: 'legendary_resistance',
      policy: 'never', resolution: 'decline', autoFired: false,
    }));
    expect(combatantState(failed.state, setup.unicorn)).toMatchObject({
      hitPoints: 93,
      legendary: { resistanceUsesRemaining: 3 },
    });
  });
});
