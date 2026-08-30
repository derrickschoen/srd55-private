import { describe, expect, it } from 'vitest';
import {
  AlgorithmController,
  type AlgorithmRoundProposal,
} from '../../../src/combat/controllers';
import type { TurnLegalActions } from '../../../src/combat/coordinator';
import { reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import type { DmVisibleEncounterState } from '../../../src/combat/visibility';
import type { CombatantId } from '../../../src/combat/values';
import type { DecisionProgram } from '../../../src/vtt/dm-bridge/round-plan-contract';
import {
  createScriptedPartyPlan,
  materializeScriptedPartyTurn,
  scriptedPartyProgramHash,
} from '../../../src/vtt/scripted-party-round';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { generateRoom } from '../../../src/vtt/room-generator';
import { alternatingInitiativeRoom } from '../../fixtures/initiative-segments/alternating-room';

class FixedProgramController extends AlgorithmController {
  constructor(private readonly fixed: DecisionProgram) { super(); }

  override proposeRoundProgram(
    state: DmVisibleEncounterState,
    actorId: CombatantId,
  ): AlgorithmRoundProposal {
    void state;
    void actorId;
    return { program: this.fixed, topActionGapPercent: 0 };
  }
}

async function fixture() {
  return loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
}

function livingPlayerId(state: Awaited<ReturnType<typeof fixture>>): CombatantId {
  const actor = state.combatants.find((candidate) =>
    candidate.profile.kind === 'player_character' && candidate.life === 'living');
  if (actor === undefined) throw new Error('Fixture has no living player character.');
  return actor.profile.id;
}

describe('scripted party round planning and adherence', () => {
  it('follows the first PC planned primary when no state drift occurred', async () => {
    const generated = generateRoom(6_100_081, { initiativeProfile: 'derived_v1' }).encounter.state;
    const state = reduceEncounter(
      generated,
      { type: 'roll_initiative' },
      mulberry32(8_274_113),
    ).state;
    const plan = createScriptedPartyPlan(state);
    const actorId = plan.programs[0]?.actorId;
    if (actorId === undefined) throw new Error('Fixture has no planned player turn.');
    expect(state.revision).toBe(1);
    expect(state.activeCombatant).toBe(actorId);

    const turn = materializeScriptedPartyTurn({ state, plan, actorId });

    expect(turn.adherence).toBe('followed');
    expect(turn.reasonCodes).toEqual(['PLANNED_PRIMARY_FOLLOWED']);
    expect(turn.plannedProgramHash).toBe(turn.executedProgramHash);
  });

  it('aggregates every living PC deterministically with stable policy, plan, and program hashes', async () => {
    const state = await fixture();

    const first = createScriptedPartyPlan(state);
    const second = createScriptedPartyPlan(structuredClone(state));

    expect(second).toEqual(first);
    expect(first.programs.map((entry) => entry.actorId)).toEqual([
      'combatant:cleric',
      'combatant:fighter',
      'combatant:wizard',
    ]);
    expect(first.programs.every((entry) =>
      entry.programHash === scriptedPartyProgramHash(entry.program))).toBe(true);
    expect(first.policyHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(first.planHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(first.planId).toBe(`party-plan:${first.planHash.slice(0, 48)}`);
  });

  it('labels the same legal semantic program followed and ignores movement-path-only differences', async () => {
    const state = await fixture();
    const actorId = livingPlayerId(state);
    const target = state.combatants.find((candidate) => candidate.profile.kind === 'monster');
    if (target === undefined) throw new Error('Fixture has no monster target.');
    const program: DecisionProgram = {
      kind: 'action',
      action: { kind: 'move_toward', target: { kind: 'combatant', combatantId: target.profile.id } },
    };
    const planProvider: TurnLegalActions = (_current, actor) => ({
      actions: [{ type: 'move', actor, path: [{ column: 1, row: 1 }], cause: 'voluntary' }],
    });
    const liveProvider: TurnLegalActions = (_current, actor) => ({
      actions: [{
        type: 'move', actor,
        path: [{ column: 1, row: 0 }, { column: 2, row: 0 }],
        cause: 'voluntary',
      }],
    });
    const controller = new FixedProgramController(program);
    const plan = createScriptedPartyPlan(state, {
      controller,
      turnLegalActions: planProvider,
      legalActionsProviderId: 'path-fixture-v1',
    });

    const turn = materializeScriptedPartyTurn({
      state, plan, actorId, controller, turnLegalActions: liveProvider,
    });

    expect(turn).toEqual(expect.objectContaining({
      adherence: 'followed',
      reasonCodes: ['PLANNED_PRIMARY_FOLLOWED'],
    }));
    expect(turn.plannedProgramHash).toBe(turn.executedProgramHash);
    expect(turn.plannedProgramHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(turn.reducerCommands).toEqual([{
      type: 'move', actor: actorId,
      path: [{ column: 1, row: 0 }, { column: 2, row: 0 }],
      cause: 'voluntary',
    }]);
  });

  it('labels a different still-legal policy choice altered', async () => {
    const state = await fixture();
    const actorId = livingPlayerId(state);
    const planned: DecisionProgram = {
      kind: 'action', action: { kind: 'use_action', action: 'dodge' },
    };
    const executed: DecisionProgram = {
      kind: 'action', action: { kind: 'use_action', action: 'end_turn' },
    };
    const legal: TurnLegalActions = (_current, actor) => ({
      actions: [{ type: 'dodge', actor }, { type: 'end_turn', actor }],
    });
    const plan = createScriptedPartyPlan(state, {
      controller: new FixedProgramController(planned),
      turnLegalActions: legal,
      legalActionsProviderId: 'altered-fixture-v1',
    });

    const turn = materializeScriptedPartyTurn({
      state,
      plan,
      actorId,
      controller: new FixedProgramController(executed),
      turnLegalActions: legal,
    });

    expect(turn.adherence).toBe('altered');
    expect(turn.reasonCodes).toEqual(['POLICY_SELECTED_DIFFERENT_LEGAL_PROGRAM']);
    expect(turn.plannedProgramHash).not.toBe(turn.executedProgramHash);
    expect(turn.reducerCommands).toEqual([{ type: 'end_turn', actor: actorId }]);
  });

  it('labels an illegal planned primary with deterministic fallback plan_invalidated', async () => {
    const state = await fixture();
    const actorId = livingPlayerId(state);
    const planned: DecisionProgram = {
      kind: 'action', action: { kind: 'use_action', action: 'dodge' },
    };
    const fallback: DecisionProgram = {
      kind: 'action', action: { kind: 'use_action', action: 'end_turn' },
    };
    const plan = createScriptedPartyPlan(state, {
      controller: new FixedProgramController(planned),
      turnLegalActions: (_current, actor) => ({ actions: [{ type: 'dodge', actor }] }),
      legalActionsProviderId: 'invalidation-fixture-v1',
    });

    const turn = materializeScriptedPartyTurn({
      state,
      plan,
      actorId,
      controller: new FixedProgramController(fallback),
      turnLegalActions: (_current, actor) => ({ actions: [{ type: 'end_turn', actor }] }),
    });

    expect(turn.adherence).toBe('plan_invalidated');
    expect(turn.reasonCodes).toEqual(['PLANNED_PRIMARY_NO_LONGER_LEGAL']);
    expect(turn.reducerCommands).toEqual([{ type: 'end_turn', actor: actorId }]);
  });

  it('invalidates a planned targeted action when its target dies before the PC turn', async () => {
    const unstarted = await alternatingInitiativeRoom();
    const firstPlayerId = livingPlayerId(unstarted);
    const boosted = {
      ...unstarted,
      combatants: unstarted.combatants.map((combatant) => ({
        ...combatant,
        profile: {
          ...combatant.profile,
          rules: {
            ...combatant.profile.rules,
            initiativeBonus: combatant.profile.id === firstPlayerId
              ? 1_000
              : combatant.profile.rules.initiativeBonus,
          },
        },
      })),
    };
    const state = reduceEncounter(
      boosted,
      { type: 'roll_initiative' },
      mulberry32(8_274_113),
    ).state;
    expect(state.activeCombatant).toBe(firstPlayerId);
    const plan = createScriptedPartyPlan(state);
    const planned = plan.programs[0];
    if (planned === undefined) throw new Error('Fixture has no planned player turn.');
    if (planned.program.kind !== 'action' ||
      (planned.program.action.kind !== 'attack' && planned.program.action.kind !== 'force_save') ||
      planned.program.action.target.kind !== 'combatant') {
      throw new Error('Fixture first player did not plan a concrete targeted action.');
    }
    const actorId = planned.actorId;
    const targetId = planned.program.action.target.combatantId;
    const drifted = {
      ...state,
      combatants: state.combatants.map((combatant) => combatant.profile.id === targetId
        ? { ...combatant, hitPoints: 0, life: 'dead' as const }
        : combatant),
    };

    const turn = materializeScriptedPartyTurn({
      state: drifted,
      plan,
      actorId,
    });

    expect(turn.adherence).toBe('plan_invalidated');
    expect(turn.reasonCodes).toEqual(['PLANNED_PRIMARY_NO_LONGER_LEGAL']);
    expect(turn.reducerCommands).toHaveLength(1);
    expect(turn.executedProgramHash).not.toBe(turn.plannedProgramHash);
  });
});
