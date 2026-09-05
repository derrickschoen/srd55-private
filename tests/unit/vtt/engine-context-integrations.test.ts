import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { damageType, dieSides, effectStackingIdentity } from '../../../src/combat/values';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import { mulberry32 } from '../../../src/combat/random';
import { UNICORN } from '../../../src/combat/statblocks/monsters';
import { createEngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
import { createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import {
  TURN_CONTEXT_MAX_BYTES,
  type TurnContextDeltaBase,
} from '../../../src/vtt/mcp/engine-server';
import { EngineRoundSession } from '../../../src/vtt/engine-round-session';
import { applyRoomInitiativeProfile } from '../../../src/vtt/room-generator';
import { projectEncounterTimeline } from '../../../src/vtt/session-timeline';
import { engineOptionId } from '../../../src/vtt/turn-proposal';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
import { projectHumanEngineOptions } from '../../../src/vtt/encounter-board-projection';

const fixedD20 = (face: number) => () => (face - 0.5) / 20;

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function integratedState(): {
  readonly state: EncounterState;
  readonly pc: ReturnType<typeof playerProfile>;
  readonly unicorn: ReturnType<typeof monsterCombatantProfile>;
  readonly responder: ReturnType<typeof monsterProfile>;
} {
  const pc = playerProfile('context-target', { initiativeBonus: 20 });
  const unicorn = monsterCombatantProfile(UNICORN, {
    combatantId: 'combatant:context-unicorn',
    tokenId: 'token:context-unicorn',
  });
  const responder = monsterProfile('context-responder', { initiativeBonus: -20 });
  let state = createEncounter({
    bounds: { columns: 8, rows: 3 },
    alerting: { nearbyNpcIds: [responder.id] },
    combatants: [pc, unicorn, responder],
    tokens: [placedToken(pc, 0, 1), placedToken(unicorn, 2, 1), placedToken(responder, 4, 1)],
  });
  state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(10)).state;
  state = reduceEncounter(state, {
    type: 'attack', actor: pc.id, target: unicorn.id,
    attackBonus: 100, criticalFloor: 20, rollMode: 'normal',
    attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    damage: {
      terms: [{ type: damageType('Force'), dice: { count: 0, sides: dieSides(6), modifier: 0 } }],
      critical: false, responses: [],
    },
  }, fixedD20(10)).state;
  state = reduceEncounter(state, {
    type: 'apply_effect', actor: pc.id, cost: 'none',
    effect: {
      targets: [pc.id], duration: { kind: 'permanent' }, concentration: false,
      stackingIdentity: effectStackingIdentity('context-invisible'),
      stacking: 'replace_same_source', repeatedSave: null,
      payload: { kind: 'condition', condition: 'Invisible' },
    },
  }, fixedD20(10)).state;
  state = reduceEncounter(state, { type: 'end_turn', actor: pc.id }, fixedD20(10)).state;
  state = {
    ...state,
    combatants: state.combatants.map((combatant) => combatant.profile.id === pc.id
      ? { ...combatant, hitPoints: 0, life: 'dying' as const, deathSaves: { successes: 0, failures: 1 } }
      : combatant),
    pendingDecisions: [
      ...state.pendingDecisions,
      {
        id: 'decision:context-reaction',
        kind: 'reaction_offer',
        combatant: unicorn.id,
        boundary: { activeCombatant: pc.id, round: state.round },
        reactionKind: 'opportunity_attack',
        options: [{ id: 'accept', label: 'Accept' }, { id: 'decline', label: 'Decline' }],
        opportunityAttack: {
          mover: pc.id,
          from: { column: 1, row: 1 },
          to: { column: 0, row: 1 },
          command: {
            type: 'opportunity_attack', actor: unicorn.id, target: pc.id,
            attackBonus: 5, criticalFloor: 20, rollMode: 'normal',
            attackerCanSeeTarget: true, targetCanSeeAttacker: true,
            damage: {
              terms: [{
                type: damageType('Piercing'),
                dice: { count: 1, sides: dieSides(8), modifier: 2 },
              }],
              critical: false, responses: [],
            },
          },
        },
      },
    ],
  };
  return { state, pc, unicorn, responder };
}

function contextFor(setup: ReturnType<typeof integratedState>) {
  const timeline = projectEncounterTimeline(setup.state, []);
  const runtime = createEngineMcpRuntime(setup.state, {
    toolProfile: 'dm',
    requestedActorIds: [setup.unicorn.id],
    initiativeProjection: { policy: 'initiative-intel-v1', timeline },
  });
  const capsule = runtime.feed.current();
  const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
  }), 'turn context');
  return { runtime, capsule, context };
}

async function brutalTurnContext(
  seed: number,
  revision: number,
  base?: TurnContextDeltaBase,
  requestedActorCount?: number,
): Promise<Readonly<Record<string, unknown>>> {
  const state = await loadArenaFixture(
    `tests/fixtures/arena-basis-brutal/seed-${String(seed)}.json`,
  );
  const session = new EngineRoundSession(
    applyRoomInitiativeProfile(state, 'derived_v1'),
    mulberry32(seed),
    { kind: 'unattended', askDefault: 'decline' },
  );
  const prepared = session.beginRoundWithoutSkipping({
    runId: encounterSessionId('encounter:brutal-context'),
    branchId: encounterBranchId('branch:brutal-context'),
    revision,
    requestId: `request:brutal-context-${String(seed)}`,
    phase: 'initial', room: 1, historyKind: 'room_ready',
  }, null);
  const request = prepared.snapshot.capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error(`Brutal ${String(seed)} did not produce an ordinary round request.`);
  }
  const runtime = createEngineMcpRuntime(session.currentState(), {
    toolProfile: 'dm',
    runId: prepared.snapshot.capsule.runId,
    branchId: prepared.snapshot.capsule.branchId,
    revision: prepared.snapshot.capsule.revision,
    requestId: request.requestId,
    phase: request.phase,
    correctionNumber: request.correctionNumber,
    room: 1,
    historyKind: 'room_ready',
    requestedActorCount: requestedActorCount ?? request.actors.length,
    initiativeProjection: prepared.snapshot.capsule.projection.initiative,
    ...(base === undefined ? {} : { turnContextDeltaBase: base }),
  });
  const capsule = runtime.feed.current();
  return record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: base === undefined ? 'full' : 'turn_delta',
    intel_mode: 'full',
    ...(base === undefined ? {} : { since_revision: base.revision }),
  }), `brutal ${String(seed)} turn context`);
}

describe('M-core and D420 turn-context rendering', () => {
  it('keeps hidden candidates out of get_turn_context while retaining their labeled human projection last', async () => {
    const state = freshMonsterPlanningState(
      await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json'),
    );
    const actor = state.combatants.find((combatant) => combatant.profile.kind === 'monster');
    if (actor === undefined) throw new Error('Brutal context fixture has no monster.');
    const partition = engineActorOptions(state, actor.profile.id);
    const hidden = partition.humanOnly.find((option) =>
      option.noModeledEffect.kind === 'unsupported_spell_payload' &&
      option.noModeledEffect.limitation === 'utility_operation_unmodeled');
    if (hidden === undefined) throw new Error('Brutal context fixture has no hidden spell.');
    const runtime = createEngineMcpRuntime(state, {
      toolProfile: 'dm', requestedActorIds: [actor.profile.id],
    });
    const capsule = runtime.feed.current();
    const context = runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
      granularity: 'full',
      intel_mode: 'full',
    });
    const human = projectHumanEngineOptions(state, [actor.profile.id])[0];
    if (human === undefined) throw new Error('Human projection omitted the brutal actor.');
    const firstHumanOnly = human.options.findIndex((option) => option.availability === 'human_only');

    expect(JSON.stringify(context)).not.toContain(hidden.optionId);
    expect(JSON.stringify(context)).not.toContain(hidden.label);
    expect(human.options.map((option) => option.option.optionId)).toContain(hidden.optionId);
    expect(firstHumanOnly).toBeGreaterThan(0);
    expect(human.options.slice(firstHumanOnly).every((option) => option.availability === 'human_only')).toBe(true);
    expect(human.options.find((option) => option.option.optionId === hidden.optionId)?.label)
      .toContain('not modeled: detect evil and good has no in-combat effect');
  });

  it.each(Array.from({ length: 10 }, (_unused, index) => 6_203_001 + index))(
    'keeps brutal-basis seed %i full-intel round context within the hard byte cap',
    async (seed) => {
      const context = await brutalTurnContext(seed, seed - 6_203_000);
      const bytes = new TextEncoder().encode(JSON.stringify(context)).byteLength;
      expect(bytes, `seed ${String(seed)}`).toBeLessThanOrEqual(TURN_CONTEXT_MAX_BYTES);
    },
  );

  it('falls back to the capped full context when the brutal seed 6203003 delta is larger', async () => {
    const baseRevision = 2;
    const context = await brutalTurnContext(6_203_003, baseRevision + 1, {
      revision: baseRevision,
      context: {
        granularity: 'full',
        context_trimmed: false,
        state_ref: {
          run_id: 'encounter:brutal-context',
          state_handle: `engine-state:${'0'.repeat(64)}`,
          expected_revision: baseRevision,
        },
        actors: Array.from({ length: 2 }, () => ({
          options: Array.from({ length: 1_000 }, () => ({})),
        })),
      },
    }, 2);
    const bytes = new TextEncoder().encode(JSON.stringify(context)).byteLength;
    expect(context['granularity']).toBe('full');
    expect(context['context_trimmed']).toBe(true);
    expect(bytes).toBeLessThanOrEqual(TURN_CONTEXT_MAX_BYTES);
  });

  it('renders hand-computed core reports through engine.get_turn_context', () => {
    const setup = integratedState();
    const { runtime, context } = contextFor(setup);

    expect(context['actor_knowledge']).toEqual({
      policy: 'actor-knowledge-v3-last-seen',
      actors: [{
        actor_id: setup.unicorn.id,
        targets: [{
          kind: 'suspected', target_id: setup.pc.id,
          last_seen: { status: 'resolved', lastSeenPosition: { column: 0, row: 1 } },
        }],
      }],
    });

    const reaction = record(context['reaction_spend_hold'], 'reaction spend/hold');
    expect(reaction['policy']).toBe('reaction-spend-hold-v1');
    expect(array(reaction['windows'], 'reaction windows')).toEqual([
      expect.objectContaining({
        policy: 'reaction-spend-hold-v1',
        status: 'resolved',
        trigger_id: 'decision:context-reaction',
        // AC 14 needs 9+, Unconscious grants Advantage, and a hit from 5 feet is
        // automatically critical: .84 × (2d8 + 2 = 11) = 9.24.
        spend: { status: 'resolved', expected_damage: 9.24 },
      }),
    ]);

    const legendary = record(context['legendary_windows'], 'legendary windows');
    expect(legendary).toMatchObject({
      policy: 'legendary-windows-v2', status: 'resolved', detail_level: 'full',
      compact: [
        'legendary', 'Unicorn', 'actions', '3/3', 'resistance', '3/3',
        'next', String(setup.pc.id), 'pending', 'action',
      ],
    });
    expect(array(legendary['actors'], 'legendary actors')).toEqual([
      expect.objectContaining({
        combatant: setup.unicorn.id,
        action_uses: { remaining: 3, maximum: 3 },
        resistance_uses: { remaining: 3, maximum: 3 },
      }),
    ]);

    expect(context['recovery_capabilities']).toEqual({
      policy: 'recovery-capability-v2',
      targets: [{ target: setup.pc.id, status: 'unresolved', reason: 'party_data_unavailable' }],
    });
    expect(array(context['applicable_skills'], 'applicable skills')).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'core_tactics',
        description: expect.any(String),
        skill_hash: expect.stringMatching(/^[0-9a-f]{64}$/u),
      }),
    ]));

    const loaded = record(runtime.toolSurface.execute('engine.load_skill', {
      skill_name: 'core_tactics',
    }), 'loaded skill');
    expect(loaded).toMatchObject({
      state_ref: context['state_ref'],
      skill_name: 'core_tactics',
      skill_hash: record(array(context['applicable_skills'], 'applicable skills')[0], 'advertised skill')['skill_hash'],
      description: expect.any(String),
      procedure: expect.any(String),
      plays: [expect.objectContaining({ name: 'basic_advance', snippet_hash: expect.stringMatching(/^[0-9a-f]{64}$/u) })],
    });
  });

  it('renders actionable search memory, help calls, and joined membership', () => {
    const setup = integratedState();
    const { context } = contextFor(setup);
    const search = record(context['search_memory'], 'search memory');
    expect(search['policy']).toBe('search-memory-v1');
    expect(array(search['memories'], 'search memories')).toEqual(expect.arrayContaining([
      expect.objectContaining({
        observer: setup.unicorn.id,
        target: setup.pc.id,
        cause: 'invisibility',
        last_known_position: { column: 0, row: 1 },
        suspicion: {
          kind: 'grid_radius', center: { column: 0, row: 1 }, radius_feet: 0,
          cells: [{ column: 0, row: 1 }],
        },
        legal_escalations: [
          { kind: 'move_and_search', citation: 'docs/srd/full/srd-5.2.1.txt:12016-12027' },
          { kind: 'ready_action', citation: 'docs/srd/full/srd-5.2.1.txt:11997-12015' },
          {
            kind: 'attack_suspected_square', roll_mode: 'disadvantage',
            citation: 'docs/srd/full/srd-5.2.1.txt:884-889',
          },
          { kind: 'area_effect_over_region' },
        ],
      }),
    ]));

    expect(context['alert_state']).toEqual({
      policy: 'npc-help-calling-v1',
      yelling_distance_feet: 60,
      sound_propagation: { kind: 'radial', occlusion: 'not_modeled' },
      calls: [{
        caller: setup.unicorn.id, attacker: setup.pc.id,
        origin: { column: 2, row: 1 }, round: 1,
      }],
      joined: [{ combatant: setup.responder.id, called_by: setup.unicorn.id, round: 1 }],
    });
  });

  it('shrinks the manifest by recording the two D420 blind spots as covered', () => {
    const { context } = contextFor(integratedState());
    const manifest = record(context['known_failure_modes'], 'known failure modes');
    const modes = array(manifest['modes'], 'failure modes');
    expect(modes).toEqual([
      'no_repeated_player_pattern_memory:No persistent tactical memory of repeated player patterns.',
      'rigid_engagement_objectives:Engagement stances do not model flexible leash or aggro changes.',
      'summon_economy_unscored:Future action economy from summons is not scored as tactical value.',
    ]);
    expect(modes.some((mode) => String(mode).startsWith('no_help_calling_plan:'))).toBe(false);
    expect(modes.some((mode) => String(mode).startsWith('no_invisibility_search_plan:'))).toBe(false);
    expect(manifest['covered_blind_spot_classes']).toEqual([
      { class: 'combat_membership_leash', covered_by_policy: 'npc-help-calling-v1' },
      { class: 'stealth_search', covered_by_policy: 'search-memory-v1' },
    ]);
  });

  it('degrades every new surface under byte pressure before returning the capped context', () => {
    const setup = integratedState();
    const { runtime, capsule } = contextFor(setup);
    const firstActor = capsule.projection.combatants.find((actor) => actor.id === setup.unicorn.id);
    if (firstActor?.options[0] === undefined) throw new Error('Unicorn context has no option to bloat.');
    const bloated = createEngineStateCapsule({
      runId: capsule.runId,
      branchId: capsule.branchId,
      revision: capsule.revision + 1,
      generatedAt: capsule.generatedAt,
      request: capsule.request,
      projection: {
        ...capsule.projection,
        movementBlockingObjects: Array.from({ length: 98 }, (_unused, index) => ({
          id: `world-object:context-pressure:${String(index)}:${'y'.repeat(60)}`,
          name: `Pressure ${String(index)}`,
          cells: [],
        })),
        combatants: capsule.projection.combatants.map((actor) => actor.id !== setup.unicorn.id
          ? actor
          : {
              ...actor,
              options: Array.from({ length: 20 }, (_unused, index) => ({
                ...firstActor.options[0]!,
                optionId: engineOptionId(`option:context-pressure:${String(index)}`),
                label: `${String(index)}:${'x'.repeat(490)}`,
              })),
            }),
      },
      historyDelta: Array.from({ length: 100 }, (_unused, index) => ({
        revision: index + 1,
        kind: `pressure-${String(index)}-${'z'.repeat(70)}`,
        branchStatus: 'active' as const,
        encounterRound: 999_999,
      })),
      rulesIndex: capsule.rulesIndex,
    });
    runtime.feed.replace(bloated);
    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: bloated.runId,
      expected_revision: bloated.revision,
      scope: 'round',
      granularity: 'full',
    }), 'trimmed context');
    const bytes = new TextEncoder().encode(JSON.stringify(context)).byteLength;
    expect(context['context_trimmed'], `rendered ${String(bytes)} bytes`).toBe(true);
    expect(bytes).toBeLessThanOrEqual(TURN_CONTEXT_MAX_BYTES);
    expect(context['actor_knowledge']).toEqual({ policy: 'actor-knowledge-v3-last-seen', actors: [] });
    expect(context['reaction_spend_hold']).toEqual({ policy: 'reaction-spend-hold-v1', windows: [] });
    expect(context['legendary_windows']).toMatchObject({
      policy: 'legendary-windows-v2', detail_level: 'compact',
    });
    expect(context['recovery_capabilities']).toEqual({ policy: 'recovery-capability-v2', targets: [] });
    expect(context['search_memory']).toEqual({ policy: 'search-memory-v1', memories: [] });
    expect(context['alert_state']).toMatchObject({ calls: [], joined: [] });
    expect(context['applicable_skills']).toEqual([]);
  });
});
