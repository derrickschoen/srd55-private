import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import { combatantId } from '../../../src/combat/values';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import {
  actorOpportunityReport,
  submissionDominance,
  type ActorOpportunityReport,
} from '../../../src/vtt/intel/opportunity-cost';
import { renderMovementIntelRow, type MovementIntelRow } from '../../../src/vtt/intel/movement-options';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import type { GeneratedRoom } from '../../../src/vtt/room-generator';
import { engineSchemaInternals, schemaViolations } from '../../../src/vtt/mcp/schemas';
import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
import { declareTestInputs } from '../../helpers/test-inputs';

const inputs = declareTestInputs({
  fixtures: ['tests/fixtures/arena-basis-hard/seed-5117009.json'],
});

const BANDIT = combatantId('combatant:generated-5117009-monster-4');
const GUARD = combatantId('combatant:generated-5117009-monster-2');
const PRIEST = combatantId('combatant:generated-5117009-monster-1');
const WIZARD = combatantId('combatant:wizard');
const FIGHTER = combatantId('combatant:fighter');

function frozenState(): EncounterState {
  const generated = JSON.parse(inputs.fixtures.readText(
    'tests/fixtures/arena-basis-hard/seed-5117009.json',
  )) as GeneratedRoom;
  return freshMonsterPlanningState(generated.encounter.state);
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected a record.');
  }
  return value as Readonly<Record<string, unknown>>;
}

describe('engine movement and opportunity-cost intel', () => {
  it('renders the hand-computed R02 one-square Bandit upgrade and Guard attack ETA', () => {
    const state = frozenState();
    const bandit = canonicalEngineQueryPort.movementOptions(
      state,
      BANDIT,
      WIZARD,
      'light-crossbow',
    );
    if (bandit === null) throw new Error('Frozen Bandit movement evaluation is absent.');
    const upgrade = bandit.candidates.find((candidate) =>
      candidate.semantic.status === 'resolved' &&
      candidate.semantic.kind === 'move_5_to_normal_range');
    if (upgrade === undefined || upgrade.path.status !== 'found' ||
      upgrade.before.status !== 'resolved' || upgrade.after.status !== 'resolved') {
      throw new Error('Frozen Bandit one-square upgrade is absent.');
    }
    // (18,3) -> (17,3) changes the Wizard distance from 85 to 80 feet.
    // Against AC 16, +3 crossbow: disadvantage EV=.1575*5.5+.0025*10=.89125;
    // straight EV=.35*5.5+.05*10=2.425.
    expect(upgrade.path.cost).toBe(5);
    expect(upgrade.before.evaluation.range).toEqual({
      status: 'resolved', distanceFeet: 85, band: 'long', legal: true,
    });
    expect(upgrade.after.evaluation.range).toEqual({
      status: 'resolved', distanceFeet: 80, band: 'normal', legal: true,
    });
    expect(upgrade.before.evaluation.rollMode.mode).toBe('disadvantage');
    expect(upgrade.after.evaluation.rollMode.mode).toBe('normal');
    expect(upgrade.deltas.expectedDamage.status).toBe('resolved');
    if (upgrade.deltas.expectedDamage.status !== 'resolved') throw new Error('Bandit EV delta is unresolved.');
    expect(upgrade.deltas.expectedDamage.before).toBeCloseTo(0.89125, 12);
    expect(upgrade.deltas.expectedDamage.after).toBeCloseTo(2.425, 12);
    expect(upgrade.deltas.expectedDamage.delta).toBeCloseTo(1.53375, 12);

    const guard = canonicalEngineQueryPort.movementOptions(state, GUARD, FIGHTER, 'spear');
    if (guard?.earliestAttackTurn.status !== 'resolved') {
      throw new Error('Frozen Guard ETA is unresolved.');
    }
    // Guard's Spear has an engine-authored 20/60 thrown profile. From 85 feet,
    // five ordinary squares reach long range this turn: P25/T+0.
    expect(guard.earliestAttackTurn.movementCost).toBe(25);
    expect(guard.earliestAttackTurn.turns).toBe(0);

    const rendered = renderMovementIntelRow({
      actorId: GUARD,
      targetId: FIGHTER,
      optionId: null,
      actionId: 'spear',
      evaluatorPolicy: guard.policy,
      semantic: 'no_reposition',
      before: { range: 'out', rollMode: 'normal', expectedDamage: 0 },
      after: null,
      leastCostMovementFeet: null,
      opportunityRisk: 'none',
      hazardRisk: 'none',
      attackEta: {
        status: 'resolved',
        movementCostFeet: guard.earliestAttackTurn.movementCost,
        turns: guard.earliestAttackTurn.turns,
      },
    } satisfies MovementIntelRow);
    expect(rendered['attack_eta']).toBe('P25/T+0');
    // Mutation check: treating Spear as melee-only yields a plausible but wrong P100/T+2.
    expect(rendered['attack_eta']).not.toBe('P100/T+2');

    const runtime = createEngineMcpRuntime(state, { requestedActorIds: [BANDIT, GUARD] });
    const capsule = runtime.feed.current();
    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
    }));
    const query = record(runtime.toolSurface.execute('engine.query_tactical_intel', {
      state_ref: context['state_ref'],
      actor_ids: [BANDIT, GUARD],
      target_ids: [WIZARD, FIGHTER],
      page: { maximum_items: 20 },
      initiative: { mode: 'none' },
    }));
    const queryRows = query['movement_rows'];
    if (!Array.isArray(queryRows)) throw new TypeError('Movement query rows are absent.');
    expect(queryRows.map(record)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actor_id: BANDIT,
        target_id: WIZARD,
        semantic: 'move_5_to_normal_range',
        move_feet: 5,
      }),
      expect.objectContaining({
        actor_id: GUARD,
        target_id: FIGHTER,
        attack_eta: 'P25/T+0',
      }),
    ]));
  });

  it('refuses every R02 Dodge default while retaining Dodge when no offense or approach exists', () => {
    const state = frozenState();
    const monsters = state.combatants.filter((combatant) => combatant.profile.kind === 'monster');
    expect(monsters).toHaveLength(6);
    for (const monster of monsters) {
      const report = actorOpportunityReport(state, monster.profile.id, canonicalEngineQueryPort, 1);
      const selectedDefault = report.options.find((option) =>
        option.option.optionId === report.defaultOption.optionId);
      expect(selectedDefault?.kind === 'offense' || selectedDefault?.kind === 'approach').toBe(true);
      const dodge = report.options.find((option) => option.kind === 'dodge');
      if (dodge === undefined) throw new Error(`${monster.profile.id} has no Dodge option.`);
      expect(submissionDominance(report, dodge.option.optionId).status).toBe('dominated');
    }

    const loneGuard: EncounterState = {
      ...state,
      combatants: state.combatants.filter((combatant) => combatant.profile.id === GUARD),
      tokens: state.tokens.filter((token) => token.combatantId === GUARD),
    };
    const report = actorOpportunityReport(loneGuard, GUARD, canonicalEngineQueryPort, 1);
    const selected = report.options.find((option) => option.option.optionId === report.defaultOption.optionId);
    expect(selected?.kind).toBe('dodge');
    expect(submissionDominance(report, report.defaultOption.optionId).status).toBe('not_dominated');

    expect(actorOpportunityReport(state, BANDIT, canonicalEngineQueryPort, 1).frontierResolution)
      .toBe('fully_resolved');
    expect(actorOpportunityReport(state, PRIEST, canonicalEngineQueryPort, 1).frontierResolution)
      .toBe('contains_unresolved');
  });

  it('blocks M5 refusal when the selected option has an unresolved declared metric', () => {
    const state = frozenState();
    const report = actorOpportunityReport(state, BANDIT, canonicalEngineQueryPort, 1);
    const resolved = report.options.find((option) => option.status === 'resolved' && option.kind === 'offense');
    if (resolved === undefined) throw new Error('Frozen Bandit has no resolved offense option.');
    const unresolvedReport: ActorOpportunityReport = {
      ...report,
      options: [{
        status: 'unresolved',
        option: resolved.option,
        kind: resolved.kind,
        unresolvedMetrics: ['expected_damage_milli'],
        reasons: ['expected_damage_unresolved'],
        summary: 'Expected damage is unresolved.',
      }, ...report.options.filter((option) => option.option.optionId !== resolved.option.optionId)],
    };
    expect(submissionDominance(unresolvedReport, resolved.option.optionId)).toMatchObject({
      status: 'blocked_unresolved',
      reasons: ['expected_damage_unresolved'],
    });
  });

  it('accepts a typed dominance override and rejects an override object without its reason', () => {
    const base = {
      actor_id: 'monster',
      expected_revision: 1,
      primary_option_id: 'option',
      fallback_option_id: null,
    };
    expect(schemaViolations(engineSchemaInternals.turnProposal, {
      ...base,
      override_justification: { reason: 'objective', note: 'Hold the gate.' },
    })).toEqual([]);
    expect(schemaViolations(engineSchemaInternals.turnProposal, {
      ...base,
      override_justification: { note: 'Hold the gate.' },
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/override_justification/reason' }),
    ]));
  });
});
