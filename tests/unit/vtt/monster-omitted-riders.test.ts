import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { MonsterStatblock } from '../../../src/combat/statblock';
import { DOPPELGANGER } from '../../../src/combat/statblocks/astral-tower';
import { BUNDLED_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { GOBLIN_WARRIOR } from '../../../src/combat/statblocks/monsters';
import { WARHORSE_SKELETON, WIGHT } from '../../../src/combat/statblocks/undead-crypt';
import { BOAR, ELEPHANT } from '../../../src/combat/statblocks/wild-beasts';
import { projectHumanEngineOptions } from '../../../src/vtt/encounter-board-projection';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import type { EngineOfferableOption } from '../../../src/vtt/turn-proposal';
import { placedToken, playerProfile } from '../combat/fixtures';

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected an object.');
  }
  return value as Readonly<Record<string, unknown>>;
}

function encounter(statblock: MonsterStatblock): EncounterState {
  const actor = monsterCombatantProfile(statblock, {
    combatantId: `combatant:${String(statblock.id)}`,
    tokenId: `token:${String(statblock.id)}`,
  });
  const target = playerProfile(`target-${String(statblock.id)}`, { hitPoints: 500, initiativeBonus: -100 });
  return freshMonsterPlanningState(createEncounter({
    bounds: { columns: 20, rows: 10 },
    combatants: [actor, target],
    tokens: [placedToken(actor, 1, 1), placedToken(target, 2, 1)],
  }));
}

function optionUsing(state: EncounterState, actionId: string): EngineOfferableOption {
  const actorId = state.combatants.find((candidate) => candidate.profile.kind === 'monster')?.profile.id;
  if (actorId === undefined) throw new Error('Rider fixture omitted its monster.');
  const option = availableEngineActorOptions(state, actorId).find((candidate) =>
    candidate.actionSlots.some((slot) => slot.use.kind === 'attack'
      ? slot.use.actionId === actionId
      : slot.use.kind === 'saving_throw'
        ? slot.use.actionId === actionId
        : slot.use.kind === 'multiattack' && slot.use.components.some((component) =>
          component.actionId === actionId)));
  if (option === undefined) throw new Error(`Rider fixture omitted ${actionId}.`);
  return option;
}

describe('engine omitted rider pipeline', () => {
  it('names goblin Advantage damage while retaining a resolvable Scimitar base attack', () => {
    const state = encounter(GOBLIN_WARRIOR);
    const option = optionUsing(state, 'scimitar');
    expect(option.omittedRiders).toEqual([{
      kind: 'conditional_damage_trigger',
      sourceActionId: 'scimitar',
      componentActionId: 'scimitar',
      trigger: 'attack_roll_advantage',
    }]);
    expect(resolveEngineActorOption(state, option).valid).toBe(true);
  });

  it.each([
    { statblock: BOAR, actionId: 'gore', requiredKinds: ['conditional_damage_trigger', 'conditional_on_hit_effect'] },
    { statblock: ELEPHANT, actionId: 'gore', requiredKinds: ['conditional_on_hit_effect'] },
    { statblock: WARHORSE_SKELETON, actionId: 'hooves', requiredKinds: ['conditional_on_hit_effect'] },
  ])('flags charge omissions on $actionId without suppressing the base option', ({ statblock, actionId, requiredKinds }) => {
    const state = encounter(statblock);
    const option = optionUsing(state, actionId);
    expect(new Set(option.omittedRiders.map((rider) => rider.kind))).toEqual(new Set(requiredKinds));
    expect(resolveEngineActorOption(state, option).valid).toBe(true);
  });

  it('flags homebrew crest and raking charge riders from their typed declarations', () => {
    for (const [statblockId, actionId] of [
      ['statblock:homebrew-beast/razorcrest-saurian', 'crest-gore'],
      ['statblock:homebrew-beast/needlebeak-glider', 'raking-pass'],
    ] as const) {
      const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === statblockId);
      if (row === undefined) throw new Error(`Roster omitted ${statblockId}.`);
      const option = optionUsing(encounter(row.statblock), actionId);
      expect(option.omittedRiders.map((rider) => rider.kind)).toEqual(expect.arrayContaining([
        'conditional_damage_trigger', 'conditional_on_hit_effect',
      ]));
    }
  });

  it('carries doppelganger advantage-window and coupled-action omissions beside Slam', () => {
    const state = encounter(DOPPELGANGER);
    const option = optionUsing(state, 'slam');
    expect(option.omittedRiders).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'attack_advantage_window', componentActionId: 'slam' }),
      expect.objectContaining({
        kind: 'other_explicitly_classified_secondary_effect',
        classification: 'coupled_action_use',
        componentActionId: 'multiattack',
        relatedActionId: 'unsettling-visage',
      }),
    ]));
    expect(resolveEngineActorOption(state, option).valid).toBe(true);
  });

  it('omits delayed Zombie creation while preserving Life Drain damage and maximum-HP reduction', () => {
    const state = encounter(WIGHT);
    const option = optionUsing(state, 'life-drain');
    expect(option.omittedRiders).toContainEqual(expect.objectContaining({
      kind: 'delayed_zombie_creation',
      componentActionId: 'life-drain',
      targetKind: 'Humanoid',
      delayHours: 24,
    }));
    const resolution = resolveEngineActorOption(state, option);
    expect(resolution.valid).toBe(true);
    if (!resolution.valid) throw new Error('Life Drain base effect did not resolve.');
    expect(resolution.mechanics.omittedRiders).toEqual(option.omittedRiders);
  });

  it('renders every flag in MCP structured/prose surfaces and the human catalog beside its component', () => {
    const state = encounter(GOBLIN_WARRIOR);
    const actorId = state.combatants.find((candidate) => candidate.profile.kind === 'monster')?.profile.id;
    if (actorId === undefined) throw new Error('Rider surface fixture omitted its actor.');
    const runtime = createEngineMcpRuntime(state, { requestedActorIds: [actorId] });
    const capsule = runtime.feed.current();
    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
      granularity: 'full',
    }));
    const serialized = JSON.stringify(context);
    expect(serialized).toContain('conditional_damage_trigger');
    expect(serialized).toContain('componentActionId');

    const proseRuntime = createEngineMcpRuntime(state, {
      requestedActorIds: [actorId],
      rendererProfile: {
        format: 'regular_prose', delta: 'path_granular', anchor: 'full', rows: 'full', slots: 'full',
        opportunityCost: 'full', threats: 'full', ids: 'full', status: 'full', movement: 'always',
        labels: 'always', frontier: 'full', knowledge: 'full', failures: 'full', adverts: 'full',
        rare: 'always', misc: 'separate', shortlist: 'all', optionDetail: 'full', nullFields: 'explicit',
        attribution: 'off',
      },
    });
    const proseCapsule = proseRuntime.feed.current();
    const prose = record(proseRuntime.toolSurface.execute('engine.get_turn_context', {
      run_id: proseCapsule.runId,
      expected_revision: proseCapsule.revision,
      scope: 'round',
      granularity: 'full',
    }));
    expect(String(prose['document'])).toContain('Omitted rider beside scimitar: conditional damage trigger');

    const human = projectHumanEngineOptions(state, [actorId])[0];
    expect(human?.options.find((entry) => entry.option.label.startsWith('Scimitar'))?.label)
      .toContain('scimitar: conditional attack roll advantage damage is not executed');
  });
});
