import { describe, expect, it } from 'vitest';
import { gridDistance } from '../../../src/combat/grid';
import { combatantId } from '../../../src/combat/values';
import {
  DM_INTEL_CAPTURE_POLICY,
  DM_INTEL_QUERY_POLICY,
  DM_TURN_INTEL_POLICY,
  exactDmIntelMatrix,
  renderDmIntelRow,
  salientInitiativeWindow,
} from '../../../src/vtt/dm-tactical-intel';
import { createEngineStateCapsule, type EngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { ENGINE_FAILURE_MODES_POLICY } from '../../../src/vtt/engine-failure-modes';
import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { TURN_CONTEXT_MAX_BYTES } from '../../../src/vtt/mcp/engine-server';
import { engineOptionId } from '../../../src/vtt/turn-proposal';

const FIGHTER = combatantId('combatant:fighter');
const SCOUT = combatantId('combatant:generated-5117009-monster-3');

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

async function r02Runtime(profile: 'dm' | 'full' = 'dm') {
  const loaded = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
  const state = freshMonsterPlanningState(loaded);
  const runtime = createEngineMcpRuntime(state, { toolProfile: profile });
  return { state, runtime, capsule: runtime.feed.current() };
}

function fullContext(runtime: ReturnType<typeof createEngineMcpRuntime>, capsule: EngineStateCapsule) {
  return record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
  }), 'full context');
}

describe('versioned DM tactical intel', () => {
  it('renders target-specific non-nearest R02 rows in always-on context with exact reasons', async () => {
    const { state, runtime, capsule } = await r02Runtime();
    const context = fullContext(runtime, capsule);
    const actors = context['actors'];
    if (!Array.isArray(actors)) throw new TypeError('Actor contexts are absent.');
    const requested = capsule.request?.actors ?? [];
    expect(actors).toHaveLength(requested.length);
    expect(actors.every((value) => {
      const intel = record(record(value, 'actor')['intel'], 'actor intel');
      return intel['policy'] === DM_TURN_INTEL_POLICY &&
        Array.isArray(intel['rows']) && intel['rows'].length > 0;
    })).toBe(true);

    const scout = capsule.projection.combatants.find((actor) => actor.id === SCOUT);
    const fighter = capsule.projection.combatants.find((actor) => actor.id === FIGHTER);
    if (scout === undefined || fighter === undefined) throw new Error('Frozen R02 tokens are absent.');
    const nearestDistance = Math.min(...capsule.projection.combatants
      .filter((target) => target.side === 'player_character' && target.life !== 'dead')
      .map((target) => gridDistance(scout.position, target.position)));
    expect(gridDistance(scout.position, fighter.position)).toBe(90);
    expect(nearestDistance).toBe(85);

    const scoutContext = record(actors.find((value) => record(value, 'actor')['actor_id'] === SCOUT), 'scout context');
    const intel = record(scoutContext['intel'], 'scout intel');
    const rows = intel['rows'];
    if (!Array.isArray(rows)) throw new TypeError('Scout intel rows are absent.');
    const fighterRow = record(rows.find((value) => record(value, 'intel row')['target_id'] === FIGHTER), 'fighter row');
    expect(fighterRow).toMatchObject({
      target_id: FIGHTER,
      attacks: 2,
      visibility: 'VISIBLE',
      cover: 'NONE',
      range: 'NORMAL',
      distance_feet: 90,
      roll_mode: 'STRAIGHT',
      p_hit: '≈1/2',
      ev: 5,
      movement_need_feet: 0,
    });
    expect(fighterRow['reason_codes']).toEqual([
      'unconscious_advantage',
      'prone_ranged_disadvantage',
    ]);
    expect(fighterRow['consequence_codes']).toEqual([
      'death_failure_on_hit',
      'two_death_failures_on_critical',
      'automatic_critical_within_5_feet',
    ]);
    expect(JSON.stringify(context)).toContain('STRAIGHT');
    expect(JSON.stringify(context)).toContain('unconscious_advantage');
    expect(JSON.stringify(context)).toContain('prone_ranged_disadvantage');
    expect(context['known_failure_modes']).toMatchObject({ policy: ENGINE_FAILURE_MODES_POLICY });
    expect(new TextEncoder().encode(JSON.stringify(context)).byteLength).toBeLessThanOrEqual(TURN_CONTEXT_MAX_BYTES);
    expect(state.combatants.find((actor) => actor.profile.id === FIGHTER)?.life).toBe('dying');
  });

  it('keeps exact probability internally while both context and query render coarse values', async () => {
    const { state, runtime, capsule } = await r02Runtime();
    const exact = exactDmIntelMatrix(state, capsule, canonicalEngineQueryPort)
      .find((row) => row.actorId === SCOUT && row.targetId === FIGHTER);
    if (exact === undefined) throw new Error('Exact Scout-to-Fighter row is absent.');
    // Two independent 7/20-hit shots: 1 - (13/20)^2 = 231/400.
    expect(exact.hitProbability).toBeCloseTo(231 / 400, 12);
    // Two hand-authored 2.5-EV Longbow attacks.
    expect(exact.expectedDamage).toBe(5);
    expect(renderDmIntelRow(exact)).toMatchObject({ p_hit: '≈1/2', ev: 5 });

    const first = record(runtime.toolSurface.execute('engine.query_tactical_intel', {
      state_ref: {
        run_id: capsule.runId,
        state_handle: `engine-state:${capsule.digest}`,
        expected_revision: capsule.revision,
      },
      actor_ids: [SCOUT],
      target_ids: [FIGHTER],
      page: { maximum_items: 1 },
      initiative: { mode: 'full' },
    }), 'tactical query');
    expect(first).toMatchObject({
      policy: DM_INTEL_QUERY_POLICY,
      renderer_policy: DM_TURN_INTEL_POLICY,
      evaluator_policy: 'tactical-evaluator-v2',
      truncated: false,
    });
    expect(first['rows']).toEqual([expect.objectContaining({ p_hit: '≈1/2', ev: 5 })]);
    expect(JSON.stringify(first)).not.toContain('0.5775');
  });

  it('paginates the full matrix with a state-bound cursor and advertises the read tool to the DM', async () => {
    const { runtime, capsule } = await r02Runtime();
    expect(runtime.toolSurface.tools.map((tool) => tool.name)).toContain('engine.query_tactical_intel');
    const stateRef = {
      run_id: capsule.runId,
      state_handle: `engine-state:${capsule.digest}`,
      expected_revision: capsule.revision,
    };
    const first = record(runtime.toolSurface.execute('engine.query_tactical_intel', {
      state_ref: stateRef,
      page: { maximum_items: 2 },
      initiative: { mode: 'pairwise', pairs: [{ actor_id: SCOUT, target_id: FIGHTER }] },
    }), 'first matrix page');
    expect(first['truncated']).toBe(true);
    expect(first['next_cursor']).toEqual(expect.any(String));
    expect(first['rows']).toHaveLength(2);
    const second = record(runtime.toolSurface.execute('engine.query_tactical_intel', {
      state_ref: stateRef,
      page: { maximum_items: 2, cursor: first['next_cursor'] },
      initiative: { mode: 'none' },
    }), 'second matrix page');
    expect(second['rows']).toHaveLength(2);
    expect(second['rows']).not.toEqual(first['rows']);
  });

  it('emits a short neutral death-save window only when the top actor precedes the target', async () => {
    const { state, capsule } = await r02Runtime();
    const row = exactDmIntelMatrix(state, capsule, canonicalEngineQueryPort)
      .find((candidate) => candidate.actorId === SCOUT && candidate.targetId === FIGHTER);
    if (row === undefined) throw new Error('Salience row is absent.');
    const orderedCapsule = (order: readonly [typeof SCOUT, typeof FIGHTER] | readonly [typeof FIGHTER, typeof SCOUT]): EngineStateCapsule => ({
      ...capsule,
      projection: {
        ...capsule.projection,
        initiative: {
          ...capsule.projection.initiative,
          timeline: {
            ...capsule.projection.initiative.timeline,
            currentCombatant: order[0],
            initiative: order.map((combatant, position) => ({
              combatant,
              name: String(combatant),
              position,
              current: position === 0,
              delayedThisRound: false,
              life: combatant === FIGHTER ? 'dying' as const : 'living' as const,
            })),
          },
        },
      },
    });
    const salient = salientInitiativeWindow(orderedCapsule([SCOUT, FIGHTER]), [row]);
    expect(salient).toBe(`WINDOW ${String(SCOUT)} before ${String(FIGHTER)} death-save turn`);
    expect(salient?.split(/\s+/u)).toHaveLength(6);
    expect(salientInitiativeWindow(orderedCapsule([FIGHTER, SCOUT]), [row])).toBeNull();
  });

  it('renders the failure manifest only in the DM profile and retains the 32 KiB trim', async () => {
    const dm = await r02Runtime('dm');
    const original = dm.capsule;
    const bloated = createEngineStateCapsule({
      runId: original.runId,
      branchId: original.branchId,
      revision: original.revision + 1,
      generatedAt: original.generatedAt,
      request: original.request,
      projection: {
        ...original.projection,
        movementBlockingObjects: Array.from({ length: 98 }, (_unused, index) => ({
          id: `world-object:bloat:${String(index)}:${'y'.repeat(70)}`,
          name: `Bloat ${String(index)}`,
          cells: [],
        })),
        combatants: original.projection.combatants.map((actor) => ({
          ...actor,
          options: actor.options[0] === undefined ? [] : Array.from({ length: 20 }, (_unused, index) => ({
            ...actor.options[0]!,
            optionId: engineOptionId(`option:${'q'.repeat(100)}:${String(actor.id)}:${String(index)}`),
            label: `${String(index)}:${'x'.repeat(495)}`,
          })),
        })),
      },
      historyDelta: Array.from({ length: 100 }, (_unused, index) => ({
        revision: index + 1,
        kind: `bloat-${String(index)}-${'z'.repeat(90)}`,
        branchStatus: 'active' as const,
        encounterRound: 999_999,
      })),
      rulesIndex: original.rulesIndex,
    });
    dm.runtime.feed.replace(bloated);
    const trimmed = fullContext(dm.runtime, bloated);
    const trimmedBytes = new TextEncoder().encode(JSON.stringify(trimmed)).byteLength;
    expect(trimmed['context_trimmed'], `rendered ${String(trimmedBytes)} bytes`).toBe(true);
    expect(trimmedBytes).toBeLessThanOrEqual(TURN_CONTEXT_MAX_BYTES);
    expect(trimmed['known_failure_modes']).toMatchObject({ policy: 'failure-modes-v1' });

    const full = await r02Runtime('full');
    expect(fullContext(full.runtime, full.capsule)).not.toHaveProperty('known_failure_modes');
  });

  it('attaches full-precision offered-set and all intel policy versions to accepted capture', async () => {
    const { runtime, capsule } = await r02Runtime();
    const context = fullContext(runtime, capsule);
    const suggested = context['suggested_plan'];
    const plan = suggested === undefined
      ? (() => {
          const advertised = context['applicable_plays'];
          if (!Array.isArray(advertised)) throw new TypeError('Applicable frontier plays are absent.');
          const playName = record(advertised[0], 'first frontier play')['name'];
          return record(runtime.toolSurface.execute('engine.propose_from_play', {
            play_name: playName,
          }), 'chosen frontier plan');
        })()
      : record(suggested, 'suggested plan');
    const proposals = plan['proposals'];
    if (!Array.isArray(proposals)) throw new TypeError('Frontier plan proposals are absent.');
    runtime.toolSurface.execute('engine.submit_round_proposals', {
      state_ref: context['state_ref'],
      request_id: record(context['request'], 'request')['request_id'],
      phase: 'initial',
      idempotency_key: 'dm-intel-capture-0001',
      proposals,
    });
    const capture = runtime.proposals[0]?.kind === 'round_turn_proposal'
      ? runtime.proposals[0].intelCapture : undefined;
    expect(capture).toMatchObject({
      policy: DM_INTEL_CAPTURE_POLICY,
      policyVersions: {
        evaluator: 'tactical-evaluator-v2',
        renderer: DM_TURN_INTEL_POLICY,
        query: DM_INTEL_QUERY_POLICY,
        capture: DM_INTEL_CAPTURE_POLICY,
        initiative: 'initiative-intel-v1',
        failureModes: 'failure-modes-v1',
      },
    });
    const actor = capture?.actors.find((candidate) => candidate.actorId === SCOUT);
    expect(actor?.offeredOptionIds.length).toBeGreaterThan(0);
    expect(actor?.rows.find((row) => row.targetId === FIGHTER)?.hitProbability)
      .toBeCloseTo(231 / 400, 12);
  });
});
