import { describe, expect, it } from 'vitest';
import { combatantId, encounterSessionId } from '../../../src/combat/values';
import type { DmTargetIntelRow } from '../../../src/vtt/dm-tactical-intel';
import {
  DM_TURN_INTEL_POLICY,
  isInformativeDmIntelRow,
  renderDmContextIntelRow,
  topDmActorIntelRows,
} from '../../../src/vtt/dm-tactical-intel';
import { TACTICAL_EVALUATOR_POLICY } from '../../../src/combat/tactical-evaluator';
import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import {
  DEFAULT_RENDERER_PROFILE,
  PLANNED_COMBINED_RENDERER_PROFILES,
  RENDERER_POLICY_VERSION,
  decodeSparseActionSlot,
  decodeSparseActorStatus,
  decodeShortReferencedOption,
  extractCircumstanceFeatures,
  rendererProfileSchema,
  renderTurnContextProfile,
  resolveOptionReference,
} from '../../../src/vtt/renderer-profile';
import { engineOptionId } from '../../../src/vtt/turn-proposal';
import { applyRevisionDelta, diffTurnContextValues } from '../../../src/vtt/dm-bridge/projection-transport';

const actorId = combatantId('combatant:renderer-actor');
const targetId = combatantId('combatant:renderer-target');

function unresolvedRow(): DmTargetIntelRow {
  return {
    policy: DM_TURN_INTEL_POLICY,
    evaluatorPolicy: TACTICAL_EVALUATOR_POLICY,
    actorId,
    targetId,
    optionId: null,
    actionId: 'unresolved-strike',
    attackCount: 0,
    kind: 'approach',
    visible: null,
    cover: 'unknown',
    distanceFeet: null,
    rangeBand: 'unresolved',
    rangeLegal: false,
    rollMode: 'unresolved',
    rollModeReasons: [],
    hitProbability: null,
    criticalProbability: null,
    expectedDamage: null,
    deathFailureOnHit: false,
    failuresOnHit: 0,
    failuresOnCritical: 0,
    automaticCriticalMaximumDistanceFeet: null,
    minimumMovementFeet: null,
    unresolvedReasons: ['damage_unresolved'],
    omittedRiders: [],
    featureSupportFlags: [],
  };
}

function option(id: string, actionId: string, expectedValue: number) {
  return {
    option_id: engineOptionId(id), actor_id: actorId, revision: 1, label: actionId,
    action_slots: [{
      slot: 'main', kind: 'attack', action_id: actionId,
      component_action_ids: [], spell_id: null, target_ids: [targetId], world_object_id: null,
    }],
    action_id: actionId, kind: 'attack', target_selectors: [], resource_cost_labels: [],
    usable_now: true, usable_after_movement: true, minimum_movement_feet: 0,
    visibility: 'yes', cover: 'none', risks: [],
    expectation: {
      resolvable: true, outcome_probability: 0.5, critical_probability: 0.05,
      expected_value: expectedValue, metric: 'damage', assumption_codes: [],
      policy: TACTICAL_EVALUATOR_POLICY,
    },
    refusals: [],
  };
}

function actorContext() {
  const first = option('option:default', 'claw', 5);
  const second = option('option:resource', 'breath-weapon', 8);
  const third = option('option:movement', 'longbow', 4);
  const fourth = option('option:duplicate', 'claw', 3);
  return {
    actor_id: actorId,
    status: {
      life: 'living', hit_point_band: 'uninjured', movement_feet: 30,
      action_available: true, bonus_action_available: true, reaction_available: true,
      effect_tags: [], pending_decision_ids: [],
    },
    options: [first, second, third, fourth],
    threats: [],
    intel: {
      policy: DM_TURN_INTEL_POLICY, zero_movement_offense_count: 1,
      rows: [], movement: [], salient_window: null,
      opportunity_cost: {
        policy: 'opportunity-cost-v1', correction_policy: 'dominance-correction-v1',
        dodge_option_id: engineOptionId('option:dodge'), engine_default_option_id: first.option_id,
        status: 'not_dominated', reason_codes: [],
      },
    },
  };
}

describe('renderer profile', () => {
  it('schema-validates every complete planned profile and rejects open or incomplete profiles', () => {
    expect(rendererProfileSchema.parse(DEFAULT_RENDERER_PROFILE)).toEqual(DEFAULT_RENDERER_PROFILE);
    expect(DEFAULT_RENDERER_PROFILE).toMatchObject({
      format: 'structured', nullFields: 'explicit', attribution: 'off',
    });
    expect(Object.values(PLANNED_COMBINED_RENDERER_PROFILES).every((profile) =>
      rendererProfileSchema.safeParse(profile).success)).toBe(true);
    expect(rendererProfileSchema.safeParse({ ...DEFAULT_RENDERER_PROFILE, delta: 'maybe' }).success).toBe(false);
    expect(rendererProfileSchema.safeParse({ ...DEFAULT_RENDERER_PROFILE, nullFields: 'maybe' }).success).toBe(false);
    expect(rendererProfileSchema.safeParse({ ...DEFAULT_RENDERER_PROFILE, attribution: 'maybe' }).success).toBe(false);
    expect(rendererProfileSchema.parse({ ...DEFAULT_RENDERER_PROFILE, semanticBoard: true }))
      .toEqual({ ...DEFAULT_RENDERER_PROFILE, semanticBoard: true });
    expect(rendererProfileSchema.safeParse({ ...DEFAULT_RENDERER_PROFILE, semanticBoard: false }).success).toBe(false);
    expect(rendererProfileSchema.safeParse({
      ...DEFAULT_RENDERER_PROFILE,
      format: 'caveman_prose',
      semanticBoard: true,
    }).success).toBe(false);
    expect(DEFAULT_RENDERER_PROFILE).not.toHaveProperty('semanticBoard');
    const { rows: _rows, ...incomplete } = DEFAULT_RENDERER_PROFILE;
    expect(rendererProfileSchema.safeParse(incomplete).success).toBe(false);
  });

  it('omits only wholly non-informative intel and retains mechanically populated evidence', () => {
    const absent = unresolvedRow();
    expect(isInformativeDmIntelRow(absent)).toBe(false);
    const populated: DmTargetIntelRow = {
      ...absent,
      visible: true,
      cover: 'none',
      distanceFeet: 25,
      rangeBand: 'normal',
      rangeLegal: true,
      rollMode: 'normal',
      hitProbability: 0.5,
      criticalProbability: 0.05,
      expectedDamage: 7,
      minimumMovementFeet: 0,
      unresolvedReasons: [],
    };
    expect(isInformativeDmIntelRow(populated)).toBe(true);
    expect(renderDmContextIntelRow(populated)).toMatchObject({
      visibility: 'VISIBLE', cover: 'NONE', range: 'NORMAL', distance_feet: 25,
      roll_mode: 'STRAIGHT', p_hit: '≈1/2', ev: 7, movement_need_feet: 0,
    });
    expect(renderDmContextIntelRow(absent)).not.toHaveProperty('distance_feet');
    expect(renderDmContextIntelRow(absent)).not.toHaveProperty('roll_mode');
  });

  it('restores the hand-written old-era row bytes without restoring wholly empty rows', () => {
    const retained: DmTargetIntelRow = {
      ...unresolvedRow(),
      actionId: null,
      visible: true,
    };
    const oldEraRow = '{"target_id":"combatant:renderer-target","action_id":null,"attacks":0,"kind":"approach","visibility":"VISIBLE","cover":"UNKNOWN","range":"UNRESOLVED","distance_feet":null,"roll_mode":"UNRESOLVED","p_hit":null,"ev":null,"movement_need_feet":null}';

    expect(JSON.stringify(renderDmContextIntelRow(retained, 'explicit'))).toBe(oldEraRow);
    expect(topDmActorIntelRows([unresolvedRow()], actorId).map((row) =>
      renderDmContextIntelRow(row, 'omit'))).toEqual([]);
    expect(topDmActorIntelRows([unresolvedRow()], actorId).map((row) =>
      renderDmContextIntelRow(row, 'explicit'))).toEqual([]);
  });

  it('independently controls model-visible renderer attribution', () => {
    const input = { actors: [actorContext()] };
    const off = renderTurnContextProfile(input, DEFAULT_RENDERER_PROFILE).context;
    const stamped = renderTurnContextProfile(input, {
      ...DEFAULT_RENDERER_PROFILE,
      attribution: 'stamped',
    }).context;

    expect(stamped['renderer_attribution']).toEqual({ policy_version: RENDERER_POLICY_VERSION });
    expect(off).not.toHaveProperty('renderer_attribution');
  });

  it('reconstructs sparse slots and status byte-for-byte to the incumbent object', () => {
    const incumbentSlot = actorContext().options[0]!.action_slots[0]!;
    const incumbentStatus = actorContext().status;
    const rendered = renderTurnContextProfile({ actors: [actorContext()] }, {
      ...DEFAULT_RENDERER_PROFILE, slots: 'sparse', status: 'sparse',
    }).context;
    const actors = rendered['actors'];
    if (!Array.isArray(actors)) throw new Error('Rendered actors are absent.');
    const actor = actors[0] as Record<string, unknown>;
    const options = actor['options'];
    if (!Array.isArray(options)) throw new Error('Rendered options are absent.');
    const slots = (options[0] as Record<string, unknown>)['action_slots'];
    if (!Array.isArray(slots)) throw new Error('Rendered slots are absent.');
    expect(decodeSparseActionSlot(slots[0])).toEqual(incumbentSlot);
    expect(decodeSparseActorStatus(actor['status'])).toEqual(incumbentStatus);
  });

  it('reconstructs short-referenced options byte-for-byte to the incumbent object', () => {
    const incumbent = actorContext().options[0]!;
    const rendered = renderTurnContextProfile({ actors: [actorContext()] }, {
      ...DEFAULT_RENDERER_PROFILE, ids: 'short_refs',
    });
    const actors = rendered.context['actors'];
    if (!Array.isArray(actors)) throw new Error('Rendered actors are absent.');
    const options = (actors[0] as Record<string, unknown>)['options'];
    if (!Array.isArray(options)) throw new Error('Rendered options are absent.');
    expect(decodeShortReferencedOption(options[0], actorId, 1, rendered.optionRefs)).toEqual(incumbent);
  });

  it('keeps default first, one visible alternative, top-2 details, and resolver-legal hidden exact IDs', () => {
    const actor = actorContext();
    actor.options = [actor.options[0]!, actor.options[3]!, actor.options[1]!, actor.options[2]!];
    const rendered = renderTurnContextProfile({ actors: [actor] }, {
      ...DEFAULT_RENDERER_PROFILE,
      shortlist: 'k3', optionDetail: 'top2_stubs', ids: 'short_refs',
    });
    const actors = rendered.context['actors'];
    if (!Array.isArray(actors)) throw new Error('Rendered actors are absent.');
    const options = (actors[0] as Record<string, unknown>)['options'];
    if (!Array.isArray(options)) throw new Error('Rendered options are absent.');
    expect(options).toHaveLength(3);
    const references = options.map((value) => (value as Record<string, unknown>)['option_ref']);
    expect(references).toEqual(['o1', 'o2', 'o3']);
    expect(resolveOptionReference('o1', rendered.optionRefs)).toBe('option:default');
    expect(resolveOptionReference('o2', rendered.optionRefs)).toBe('option:resource');
    expect((options[2] as Record<string, unknown>)['action_slots']).toBeUndefined();
  });

  it('fails the K-set safety assertion when the only alternative is known dominated', () => {
    const actor = actorContext();
    actor.options = [actor.options[0]!, option('option:dodge', 'dodge', 0)];
    actor.intel.opportunity_cost.status = 'dominated';
    expect(() => renderTurnContextProfile({ actors: [actor] }, {
      ...DEFAULT_RENDERER_PROFILE, shortlist: 'k2',
    })).toThrow('actor lost every visible non-default option');
  });

  it('keeps only competitive or selected Dodge evidence in the conditional opportunity rung', () => {
    const renderOpportunity = (status: 'dominated' | 'not_dominated', selected: boolean): unknown => {
      const actor = actorContext();
      actor.intel.opportunity_cost.status = status;
      actor.intel.opportunity_cost.engine_default_option_id = selected
        ? actor.intel.opportunity_cost.dodge_option_id
        : actor.options[0]!.option_id;
      const rendered = renderTurnContextProfile({ actors: [actor] }, {
        ...DEFAULT_RENDERER_PROFILE, rows: 'best_exception', opportunityCost: 'conditional',
      }).context;
      const actors = rendered['actors'] as ReadonlyArray<Readonly<Record<string, unknown>>>;
      return (actors[0]?.['intel'] as Readonly<Record<string, unknown>> | undefined)?.['opportunity_cost'];
    };
    expect(renderOpportunity('not_dominated', false)).not.toBeNull();
    expect(renderOpportunity('dominated', true)).not.toBeNull();
    expect(renderOpportunity('dominated', false)).toBeNull();
  });

  it.each([
    ['legendary_windows', { actors: [{}], resistance_spend_inputs: [] }],
    ['alert_state', { calls: [{}], joined: [] }],
    ['search_memory', { memories: [{}] }],
    ['recovery_capabilities', { targets: [{}] }],
    ['reaction_spend_hold', { windows: [{}] }],
  ] as const)('retains triggered rare surface %s', (key, trigger) => {
    const rendered = renderTurnContextProfile({ [key]: trigger }, {
      ...DEFAULT_RENDERER_PROFILE, rare: 'triggered',
    }).context;
    expect(rendered).toHaveProperty(key);
  });

  it('omits every empty or null rare surface and emits attributed advert stubs', () => {
    const rendered = renderTurnContextProfile({
      legendary_windows: null,
      alert_state: { calls: [], joined: [] },
      search_memory: { memories: [] },
      recovery_capabilities: { targets: [] },
      reaction_spend_hold: { windows: [] },
      suggested_plan: { play_name: 'focus_fire' },
      applicable_plays: [{ name: 'focus_fire', description: 'Focus.', snippet_hash: 'abc' }],
      applicable_skills: [{ name: 'positioning', description: 'Move.', skill_hash: 'def' }],
    }, { ...DEFAULT_RENDERER_PROFILE, rare: 'triggered', adverts: 'stubs' }).context;
    for (const key of ['legendary_windows', 'alert_state', 'search_memory', 'recovery_capabilities', 'reaction_spend_hold']) {
      expect(rendered).not.toHaveProperty(key);
    }
    expect(rendered['applicable_plays']).toEqual([{
      id: 'focus_fire', label: 'focus_fire', dominance_status: 'frontier', override_status: 'selected',
    }]);
    expect(rendered['applicable_skills']).toEqual([{
      id: 'positioning', label: 'positioning', dominance_status: 'not_evaluated', override_status: 'available',
    }]);
  });

  it('is byte deterministic for the same state and profile', () => {
    const input = { actors: [actorContext()], summary: { room: 1 }, recent_changes: [] };
    const profile = PLANNED_COMBINED_RENDERER_PROFILES.compact;
    expect(JSON.stringify(renderTurnContextProfile(input, profile).context))
      .toBe(JSON.stringify(renderTurnContextProfile(input, profile).context));
  });

  it('diffs actor-array length changes by actor index instead of resending the actors subtree', () => {
    const before = { actors: [{ actor_id: 'actor:a', status: { life: 'living' } }] };
    const after = {
      actors: [
        { actor_id: 'actor:a', status: { life: 'injured' } },
        { actor_id: 'actor:b', status: { life: 'living' } },
      ],
    };
    const changes = diffTurnContextValues(before, after);
    expect(changes).toContainEqual({ kind: 'set', path: ['actors', '0', 'status', 'life'], value: 'injured' });
    expect(changes).toContainEqual({ kind: 'set', path: ['actors', '1'], value: after.actors[1] });
    expect(changes).not.toContainEqual(expect.objectContaining({ path: ['actors'] }));
    expect(applyRevisionDelta(before, changes)).toEqual(after);
  });

  it('uses the 0.8 relative guard, supports delta-off, and emits a hash-only anchor', async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(
      'tests/fixtures/arena-basis-brutal/seed-6203001.json',
    ));
    const runId = encounterSessionId('encounter:renderer-delta-guard');
    const baseRuntime = createEngineMcpRuntime(state, {
      runId,
      revision: 1,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, delta: 'guarded' },
    });
    const baseCapsule = baseRuntime.feed.current();
    const baseValue = baseRuntime.toolSurface.execute('engine.get_turn_context', {
      run_id: baseCapsule.runId, expected_revision: 1, scope: 'round', granularity: 'full',
    });
    if (typeof baseValue !== 'object' || baseValue === null || Array.isArray(baseValue)) {
      throw new Error('Delta base is not an object.');
    }
    const oversizedBase = { ...baseValue, actors: [] };
    const guardedRuntime = createEngineMcpRuntime(state, {
      runId: baseCapsule.runId,
      revision: 2,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, delta: 'guarded' },
      turnContextDeltaBase: { revision: 1, context: oversizedBase },
    });
    const guarded = guardedRuntime.toolSurface.execute('engine.get_turn_context', {
      run_id: baseCapsule.runId, expected_revision: 2, scope: 'round',
      granularity: 'turn_delta', since_revision: 1,
    }) as Readonly<Record<string, unknown>>;
    expect(guarded['granularity']).toBe('full');

    const hashBaseRuntime = createEngineMcpRuntime(state, {
      runId: baseCapsule.runId,
      revision: 1,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, anchor: 'hash_only' },
    });
    const hashBaseCapsule = hashBaseRuntime.feed.current();
    const hashBase = hashBaseRuntime.toolSurface.execute('engine.get_turn_context', {
      run_id: hashBaseCapsule.runId, expected_revision: 1, scope: 'round', granularity: 'full',
    }) as Readonly<Record<string, unknown>>;
    const hashRuntime = createEngineMcpRuntime(state, {
      runId: hashBaseCapsule.runId,
      revision: 2,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, anchor: 'hash_only' },
      turnContextDeltaBase: { revision: 1, context: hashBase },
    });
    const hashDelta = hashRuntime.toolSurface.execute('engine.get_turn_context', {
      run_id: hashBaseCapsule.runId, expected_revision: 2, scope: 'round',
      granularity: 'turn_delta', since_revision: 1,
    }) as Readonly<Record<string, unknown>>;
    expect(hashDelta['granularity']).toBe('turn_delta');
    expect(hashDelta['anchor']).not.toHaveProperty('state_ref');

    const offRuntime = createEngineMcpRuntime(state, {
      runId: hashBaseCapsule.runId,
      revision: 2,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, delta: 'off' },
      turnContextDeltaBase: { revision: 1, context: hashBase },
    });
    const off = offRuntime.toolSurface.execute('engine.get_turn_context', {
      run_id: hashBaseCapsule.runId, expected_revision: 2, scope: 'round',
      granularity: 'turn_delta', since_revision: 1,
    }) as Readonly<Record<string, unknown>>;
    expect(off['granularity']).toBe('full');
  });

  it('keeps the K2 floor inside a schema-valid compact fallback instead of throwing', async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(
      'tests/fixtures/arena-basis-brutal/seed-6203004.json',
    ));
    const runtime = createEngineMcpRuntime(state, {
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, shortlist: 'k2' },
      turnContextMaximumBytes: 4 * 1024,
    });
    const capsule = runtime.feed.current();
    const context = runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId, expected_revision: capsule.revision,
      scope: 'round', granularity: 'full',
    }) as Readonly<Record<string, unknown>>;
    expect(context['compact_fallback']).toBe(true);
    expect(context).not.toHaveProperty('renderer_defect');
    expect(new TextEncoder().encode(JSON.stringify(context)).byteLength).toBeLessThanOrEqual(4 * 1024);
    const actors = context['actors'];
    if (!Array.isArray(actors)) throw new Error('Compact K2 fallback omitted actors.');
    expect(actors.every((value) => {
      const actor = value as Readonly<Record<string, unknown>>;
      return Array.isArray(actor['options']) && actor['options'].length === 2;
    })).toBe(true);
  });

  it('matches the hand-computed brutal-room circumstance oracle', async () => {
    const loaded = await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json');
    const state = freshMonsterPlanningState(loaded);
    const runtime = createEngineMcpRuntime(state);
    const capsule = runtime.feed.current();
    const features = extractCircumstanceFeatures({
      state,
      capsule,
      renderedContext: { actors: [{ options: [{}, {}, {}] }, { options: [{}] }] },
      granularity: 'full',
      preTrimBytes: 1_000,
      postTrimBytes: 900,
    });
    expect(features).toEqual({
      actor_count: 7,
      caster_count: 3,
      terrain_feature_count: 31,
      blocked_cell_fraction: 16 / (19 * 17),
      difficult_cell_fraction: 30 / (19 * 17),
      mean_pairwise_engagement_distance: 910 / 12,
      minimum_pairwise_engagement_distance: 70,
      challenge_budget_spent_eighths: 72,
      granularity: 'full',
      pre_trim_bytes: 1_000,
      trim_engaged: true,
      trim_bytes_removed: 100,
      options_per_actor_mean: 2,
      options_per_actor_max: 3,
    });
    expect(RENDERER_POLICY_VERSION).toBe('turn-context-renderer-v3');
  });
});
