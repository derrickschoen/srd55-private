import { describe, expect, it } from 'vitest';
import {
  AlgorithmController,
  ControllerRegistry,
  type StandingReactionPolicy,
} from '../../../src/combat/controllers';
import { TurnCoordinator } from '../../../src/combat/coordinator';
import {
  createEncounter,
  type EncounterState,
  type InitiativeMode,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { damageType, dieSides, type CombatantId } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

function sequenceRng(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error('Initiative fixture exhausted its RNG values.');
    index += 1;
    return value;
  };
}

function modeFixture(mode?: InitiativeMode): {
  readonly state: EncounterState;
  readonly ids: Readonly<Record<'pcFast' | 'pcSlow' | 'monsterFast' | 'monsterMid' | 'monsterSlow', CombatantId>>;
} {
  const pcFast = playerProfile('mode-pc-fast', { initiativeBonus: 0 });
  const monsterSlow = monsterProfile('mode-monster-slow', { initiativeBonus: 1 });
  const pcSlow = playerProfile('mode-pc-slow', { initiativeBonus: 0 });
  const monsterFast = monsterProfile('mode-monster-fast', { initiativeBonus: 3 });
  const monsterMid = monsterProfile('mode-monster-mid', { initiativeBonus: 2 });
  const combatants = [pcFast, monsterSlow, pcSlow, monsterFast, monsterMid];
  return {
    state: createEncounter({
      ...(mode === undefined ? {} : { config: { initiativeMode: mode } }),
      bounds: { columns: 12, rows: 2 },
      combatants,
      tokens: combatants.map((profile, index) => placedToken(profile, index * 2)),
    }),
    ids: {
      pcFast: pcFast.id,
      pcSlow: pcSlow.id,
      monsterFast: monsterFast.id,
      monsterMid: monsterMid.id,
      monsterSlow: monsterSlow.id,
    },
  };
}

async function firstRoundOrder(
  mode: InitiativeMode,
): Promise<{ readonly order: readonly CombatantId[]; readonly state: EncounterState }> {
  const fixture = modeFixture(mode);
  const registry = new ControllerRegistry(fixture.state.combatants.map((subject) => ({
    combatantId: subject.profile.id,
    controller: new AlgorithmController(),
  })));
  const coordinator = new TurnCoordinator(
    fixture.state,
    registry,
    sequenceRng([0.9, 0.7, 0.6, 0.4, 0.2]),
  );
  const rolled = await coordinator.step();
  if (rolled.kind !== 'applied') throw new Error(rolled.reason);
  while (
    coordinator.state().eventLog.filter(
      (event) => event.type === 'turn_started' && event.round === 1,
    ).length < fixture.state.combatants.length
  ) {
    const result = await coordinator.step();
    if (result.kind !== 'applied') throw new Error(result.reason);
  }
  return {
    order: coordinator.state().eventLog.flatMap((event) =>
      event.type === 'turn_started' && event.round === 1 ? [event.combatant] : []),
    state: coordinator.state(),
  };
}

describe('typed encounter initiative modes', () => {
  it('defaults new encounters to the owner-ruled shared enemy block', () => {
    expect(modeFixture().state.config).toEqual({ initiativeMode: 'shared_enemy' });
  });

  it.each([
    [
      'per_combatant',
      ['pcFast', 'monsterSlow', 'pcSlow', 'monsterFast', 'monsterMid'],
    ],
    [
      'shared_enemy',
      ['pcFast', 'monsterFast', 'monsterMid', 'monsterSlow', 'pcSlow'],
    ],
    [
      'side_alternating',
      ['pcFast', 'pcSlow', 'monsterFast', 'monsterMid', 'monsterSlow'],
    ],
  ] as const)('pins the complete first-round order for %s', async (mode, names) => {
    const fixture = modeFixture(mode);
    const result = await firstRoundOrder(mode);
    expect(result.order).toEqual(names.map((name) => fixture.ids[name]));
  });

  it('shared_block_splits keeps every enemy activation in one initiative slot', async () => {
    const fixture = modeFixture('shared_enemy');
    const result = await firstRoundOrder('shared_enemy');
    const monsterIds = [
      fixture.ids.monsterFast,
      fixture.ids.monsterMid,
      fixture.ids.monsterSlow,
    ];
    const monsterIndexes = monsterIds.map((id) => result.order.indexOf(id));
    expect(monsterIndexes).toEqual([1, 2, 3]);
    expect(new Set(
      result.state.initiative
        .filter((entry) => monsterIds.includes(entry.combatant))
        .map((entry) => entry.slot),
    ).size).toBe(1);
    const ordered = result.state.eventLog.find((event) => event.type === 'initiative_ordered');
    expect(ordered).toMatchObject({ slots: expect.arrayContaining([monsterIds]) });
  });

  it('block_order_nondeterministic keeps within-block ordering stable across replay seeds', async () => {
    const orders = await Promise.all([
      firstRoundOrder('shared_enemy'),
      (async () => {
        const fixture = modeFixture('shared_enemy');
        const registry = new ControllerRegistry(fixture.state.combatants.map((subject) => ({
          combatantId: subject.profile.id,
          controller: new AlgorithmController(),
        })));
        const coordinator = new TurnCoordinator(
          fixture.state,
          registry,
          sequenceRng([0.05, 0.95, 0.15, 0.4]),
        );
        await coordinator.step();
        return { state: coordinator.state() };
      })(),
    ]);
    const withinBlock = (state: EncounterState): readonly CombatantId[] => {
      const block = state.eventLog.find((event) => event.type === 'initiative_block_rolled');
      if (block === undefined || block.type !== 'initiative_block_rolled') {
        throw new Error('Shared encounter did not emit its block roll.');
      }
      return block.combatants;
    };
    expect(withinBlock(orders[0].state)).toEqual(withinBlock(orders[1].state));
  });

  it('allows a PC Opportunity Attack to interrupt movement inside the shared enemy block', async () => {
    const mover = monsterProfile('block-mover', { initiativeBonus: 20, hitPoints: 20 });
    const nextMonster = monsterProfile('block-next', { initiativeBonus: 10 });
    const reactor = playerProfile('block-reactor', { initiativeBonus: -20 });
    const state = createEncounter({
      config: { initiativeMode: 'shared_enemy' },
      bounds: { columns: 8, rows: 2 },
      combatants: [mover, nextMonster, reactor],
      tokens: [placedToken(mover, 1), placedToken(nextMonster, 5), placedToken(reactor, 0)],
    });
    const registry = new ControllerRegistry(state.combatants.map((subject) => ({
      combatantId: subject.profile.id,
      controller: new AlgorithmController(),
    })));
    const move: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move',
      actor: mover.id,
      path: [{ column: 2, row: 0 }],
      cause: 'voluntary',
    };
    const opportunityAttack: Extract<EncounterCommand, { readonly type: 'opportunity_attack' }> = {
      type: 'opportunity_attack',
      actor: reactor.id,
      target: mover.id,
      attackBonus: 100,
      criticalFloor: 20,
      rollMode: 'normal',
      attackerCanSeeTarget: true,
      targetCanSeeAttacker: true,
      damage: {
        terms: [{
          type: damageType('Force'),
          dice: { count: 0, sides: dieSides(6), modifier: 1 },
        }],
        critical: false,
        responses: [],
      },
    };
    const policies = new Map<CombatantId, StandingReactionPolicy>([
      [reactor.id, { opportunityAttack: 'use' }],
    ]);
    const coordinator = new TurnCoordinator(state, registry, sequenceRng([0.1, 0.9, 0.5]), {
      turnLegalActions: (current, actor) => ({
        actions: actor === mover.id && current.combatants.find(
          (subject) => subject.profile.id === mover.id,
        )?.turn.movement.spent === 0
          ? [move]
          : [{ type: 'end_turn', actor }],
      }),
      reactionLegalActions: () => [opportunityAttack],
      standingReactionPolicies: policies,
    });

    await coordinator.step();
    const movement = await coordinator.step();
    if (movement.kind !== 'applied') throw new Error(movement.reason);
    expect(movement.events.map((event) => event.type)).toEqual([
      'resource_spent',
      'damage_applied',
      'attack_resolved',
      'movement_completed',
    ]);
    await coordinator.step();
    expect(coordinator.state().activeCombatant).toBe(nextMonster.id);
    const firstRoundStarts = coordinator.state().eventLog.flatMap((event) =>
      event.type === 'turn_started' && event.round === 1 ? [event.combatant] : []);
    expect(firstRoundStarts).toEqual([mover.id, nextMonster.id]);
  });
});
