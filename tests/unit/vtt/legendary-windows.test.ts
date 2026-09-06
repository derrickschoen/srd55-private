import { describe, expect, it } from 'vitest';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { monsterCombatantProfile, type CombatantProfile } from '../../../src/combat/combatant';
import { damageType, dieSides } from '../../../src/combat/values';
import { UNICORN } from '../../../src/combat/statblocks/monsters';
import {
  LEGENDARY_WINDOWS_POLICY,
  provideLegendaryWindows,
  type LegendaryWindowsIntel,
} from '../../../src/vtt/intel/legendary-windows';
import {
  projectEncounterTimeline,
  type EncounterTimelineProjection,
} from '../../../src/vtt/session-timeline';
import { placedToken, playerProfile } from '../combat/fixtures';

function face(value: number): () => number {
  return () => (value - 0.5) / 20;
}

function unicornProfile(key = 'legendary-window-unicorn'): CombatantProfile {
  return monsterCombatantProfile(UNICORN, {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
  });
}

function startedEncounter(
  player: CombatantProfile,
  unicorn = unicornProfile(),
): { readonly state: EncounterState; readonly player: CombatantProfile; readonly unicorn: CombatantProfile } {
  const combatants = [player, unicorn];
  const initial = createEncounter({
    bounds: { columns: 12, rows: 4 },
    combatants,
    tokens: combatants.map((profile, index) => placedToken(profile, index, 1)),
  });
  return {
    state: reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.975).state,
    player,
    unicorn,
  };
}

function full(
  state: EncounterState,
  severityInputs: Parameters<typeof provideLegendaryWindows>[0]['resistanceSeverityInputs'] = [],
  timeline: EncounterTimelineProjection | null = projectEncounterTimeline(state, []),
): LegendaryWindowsIntel {
  return provideLegendaryWindows({
    state,
    timeline,
    detail: 'full',
    resistanceSeverityInputs: severityInputs,
  });
}

function requireDetails(intel: LegendaryWindowsIntel) {
  if (intel.status !== 'resolved' || intel.details === null) throw new Error('Expected resolved full legendary intel.');
  return intel.details;
}

describe('M4 legendary-windows-v2', () => {
  it('reports Unicorn pools, the hand-built post-player window, and tactical verdicts for pending actions', () => {
    const player = playerProfile('legendary-window-player', { initiativeBonus: 20 });
    const setup = startedEncounter(player);
    const handBuiltTimeline = {
      phase: setup.state.phase,
      round: 1,
      currentCombatant: player.id,
      initiative: [],
      upcoming: [{
        kind: 'legendary_action_window', legendaryCombatant: setup.unicorn.id,
        boundary: { round: 1, combatant: player.id, boundary: 'end' },
      }],
      roundBoundaries: [],
      branchPoints: [],
    } satisfies EncounterTimelineProjection;
    const beforeWindow = requireDetails(full(setup.state, [], handBuiltTimeline)).actors[0];
    if (beforeWindow === undefined || beforeWindow.status !== 'resolved') throw new Error('Expected resolved Unicorn facts.');
    expect(beforeWindow.nextWindow).toEqual({
      status: 'resolved', afterCombatant: player.id, round: 1, source: 'timeline',
    });

    const state = reduceEncounter(setup.state, { type: 'end_turn', actor: player.id }, face(10)).state;

    const intel = full(state);
    const details = requireDetails(intel);
    const unicorn = details.actors[0];
    if (unicorn === undefined || unicorn.status !== 'resolved') throw new Error('Expected resolved Unicorn facts.');

    expect(intel.policy).toBe(LEGENDARY_WINDOWS_POLICY);
    expect(intel.compact).toEqual([
      'legendary', 'Unicorn', 'actions', '3/3', 'resistance', '3/3',
      'next', String(player.id), 'pending', 'action',
    ]);
    expect(intel.compact).toHaveLength(10);
    expect(unicorn.nextWindow).toEqual({
      status: 'resolved', afterCombatant: player.id, round: 1, source: 'pending_decision',
    });
    expect(unicorn.pendingWindow?.options.map((option) => option.option.id)).toEqual([
      'legendary_action:charging-horn', 'legendary_action:shimmering-shield', 'pass',
    ]);
    const horn = unicorn.pendingWindow?.options[0];
    if (horn === undefined || horn.status !== 'resolved' || horn.assessment.kind !== 'attack') {
      throw new Error('Expected a scored Charging Horn.');
    }
    expect(horn.assessment.tactical).toEqual({
      policy: 'tactical-evaluator-v3',
      range: { status: 'resolved', distanceFeet: 5, band: 'melee', legal: true },
      rollMode: { mode: 'normal', reasons: [], sources: [] },
      probabilities: { status: 'resolved', hit: 0.7, critical: 0.05, miss: 0.3 },
      damage: {
        // (13/20 × 9.5) + (1/20 × 15), represented by the evaluator's IEEE-754 arithmetic.
        status: 'resolved', normalHitAverage: 9.5, criticalHitAverage: 15, expectedDamage: 6.924999999999999,
      },
      consequences: {
        deathFailureOnHit: false, failuresOnHit: 0, failuresOnCritical: 0,
        automaticCriticalOnHit: false, automaticCriticalMaximumDistanceFeet: null,
      },
      unresolved: [],
    });
  });

  it('mutation_guard: reports two remaining legendary uses after one declared-use action', () => {
    const player = playerProfile('legendary-window-spend-player', { initiativeBonus: 20, hitPoints: 100 });
    const setup = startedEncounter(player);
    const queued = reduceEncounter(setup.state, { type: 'end_turn', actor: player.id }, face(10)).state;
    const decision = queued.pendingDecisions.find((candidate) => candidate.kind === 'legendary_action_window');
    if (decision === undefined) throw new Error('Expected Unicorn legendary window.');
    const spent = reduceEncounter(queued, {
      type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'legendary_action:charging-horn',
    }, face(20)).state;

    const unicorn = requireDetails(full(spent)).actors[0];
    if (unicorn === undefined || unicorn.status !== 'resolved') throw new Error('Expected resolved Unicorn facts.');
    // A plausible off-by-one mutant reports 3 here; the reducer has spent Charging Horn's cost of 1.
    expect(unicorn.actionUses).toEqual({ remaining: 2, maximum: 3 });
  });

  it('exposes pending legendary-resistance save and severity facts without choosing a policy', () => {
    const player = playerProfile('legendary-resistance-player', { initiativeBonus: 20 });
    const setup = startedEncounter(player);
    const failed = reduceEncounter(setup.state, {
      type: 'force_save', actor: player.id, target: setup.unicorn.id,
      ability: 'constitution', dc: 20, rollMode: 'normal', cost: 'none', onSuccess: 'none',
      damage: {
        terms: [{ type: damageType('Force'), dice: { count: 0, sides: dieSides(6), modifier: 4 } }],
        critical: false, responses: [],
      },
    }, face(1)).state;
    const decision = failed.pendingDecisions.find((candidate) => candidate.kind === 'legendary_resistance');
    if (decision === undefined) throw new Error('Expected failed-save Legendary Resistance decision.');

    const details = requireDetails(full(failed, [{
      decisionId: decision.id,
      effectSeverity: {
        damageExpected: 4, imposedConditions: ['Poisoned'], forcedMovementFeet: null, removesTurn: false,
      },
    }]));
    expect(details.resistanceSpendInputs).toEqual([{
      status: 'resolved', decisionId: decision.id, combatant: setup.unicorn.id,
      source: player.id, failedAbility: 'constitution', saveDc: 20,
      effectSeverity: {
        damageExpected: 4, imposedConditions: ['Poisoned'], forcedMovementFeet: null, removesTurn: false,
      },
    }]);
  });

  it('returns typed unresolved results when no legendary actor or no timeline is available', () => {
    const player = playerProfile('ordinary-player', { initiativeBonus: 20 });
    const ordinary = createEncounter({
      bounds: { columns: 4, rows: 4 }, combatants: [player], tokens: [placedToken(player, 0, 0)],
    });
    expect(provideLegendaryWindows({ state: ordinary, timeline: null, detail: 'compact' })).toMatchObject({
      policy: LEGENDARY_WINDOWS_POLICY, status: 'unresolved', reason: 'no_legendary_actor',
    });

    const setup = startedEncounter(playerProfile('timeline-missing-player', { initiativeBonus: 20 }));
    const intel = provideLegendaryWindows({ state: setup.state, timeline: null, detail: 'full' });
    const unicorn = requireDetails(intel).actors[0];
    if (unicorn === undefined || unicorn.status !== 'resolved') throw new Error('Expected Unicorn facts.');
    expect(unicorn.nextWindow).toEqual({ status: 'unresolved', reason: 'timeline_unavailable' });
  });
});
