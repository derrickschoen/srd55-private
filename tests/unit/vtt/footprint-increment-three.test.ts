import { describe, expect, it } from 'vitest';
import { combatToken, type CombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { combatantId, type CombatantId } from '../../../src/combat/values';
import { exactDmIntelMatrix } from '../../../src/vtt/dm-tactical-intel';
import { engineStateHandle } from '../../../src/vtt/engine-state-capsule';
import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import {
  DEFAULT_RENDERER_PROFILE,
  RENDERER_POLICY_VERSION,
  extractCircumstanceFeatures,
} from '../../../src/vtt/renderer-profile';
import { generateRoom } from '../../../src/vtt/room-generator';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const SEED = 3_943_001;
const SCOUT = combatantId('combatant:generated-3943001-monster-3');
const FIGHTER = combatantId('combatant:fighter');
const CLERIC = combatantId('combatant:cleric');
const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

function requiredProfile(state: EncounterState, id: CombatantId): CombatantProfile {
  const profile = state.combatants.find((candidate) => candidate.profile.id === id)?.profile;
  if (profile === undefined) throw new Error(`Missing fixture profile ${String(id)}.`);
  return profile;
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function values(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function separatedState(): EncounterState {
  const generated = generateRoom(SEED).encounter.state;
  const scout = requiredProfile(generated, SCOUT);
  const fighterBase = requiredProfile(generated, FIGHTER);
  const fighter = { ...fighterBase, rules: { ...fighterBase.rules, sizeCategory: 'Gargantuan' as const } };
  return freshMonsterPlanningState(createEncounter({
    bounds: { columns: 12, rows: 5 },
    combatants: [scout, fighter],
    tokens: [combatToken(scout, { column: 8, row: 0 }), combatToken(fighter, { column: 0, row: 0 })],
  }));
}

function selectorState(): EncounterState {
  const generated = generateRoom(SEED).encounter.state;
  const scout = requiredProfile(generated, SCOUT);
  const fighter = requiredProfile(generated, FIGHTER);
  const clericBase = requiredProfile(generated, CLERIC);
  const cleric = { ...clericBase, rules: { ...clericBase.rules, sizeCategory: 'Large' as const } };
  return freshMonsterPlanningState(createEncounter({
    bounds: { columns: 10, rows: 10 },
    combatants: [scout, fighter, cleric],
    tokens: [
      combatToken(scout, { column: 5, row: 5 }),
      combatToken(fighter, { column: 2, row: 2 }),
      combatToken(cleric, { column: 1, row: 5 }),
    ],
  }));
}

function turnContext(runtime: ReturnType<typeof createEngineMcpRuntime>): Readonly<Record<string, unknown>> {
  const capsule = runtime.feed.current();
  return record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
    intel_mode: 'full',
  }), 'turn context');
}

describe('footprint Increment 3 AI-DM semantics', () => {
  it('reports hand-computed nearest-cell separation', () => {
    const state = separatedState();
    // Gargantuan target occupies columns 0..3; Scout at column 8: five intervals = 25 feet.
    expect(OFFER_ENVIRONMENT.queries.spaceDistance(state, SCOUT, FIGHTER)).toBe(25);
  });

  it('keeps path cost as travel cost rather than creature separation', () => {
    const state = separatedState();
    expect(OFFER_ENVIRONMENT.queries.path(state, {
      actorId: SCOUT,
      destination: { column: 7, row: 0 },
      movement: 'normal',
    })).toMatchObject({ legal: true, costFeet: 5 });
  });

  it('uses nearest-cell separation in nearest-target selection', () => {
    const state = selectorState();
    // Both are 15 feet from the Scout by occupied cells; the branded-id tie break chooses Cleric.
    // Anchor distance would incorrectly prefer Fighter (15 feet versus Cleric's 20).
    expect(OFFER_ENVIRONMENT.queries.resolveTarget(state, SCOUT, { kind: 'nearest_visible_enemy' })).toBe(CLERIC);
  });

  it('publishes footprint-aware public MCP summaries and nearest-cell threat bands', () => {
    const state = separatedState();
    const runtime = createEngineMcpRuntime(state, {
      requestedActorIds: [SCOUT],
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const capsule = runtime.feed.current();
    const result = record(runtime.toolSurface.execute('engine.get_state_summary', {
      state_ref: {
        run_id: capsule.runId,
        state_handle: engineStateHandle(capsule),
        expected_revision: capsule.revision,
      },
      granularity: 'combatant_detail',
      combatant_ids: [SCOUT],
    }), 'state summary');
    expect(result['policy']).toBe('state-summary-v2-creature-space');
    const summary = record(result['summary'], 'summary body');
    const combatant = record(values(summary['combatants'], 'summary combatants')[0], 'combatant summary');
    expect(combatant).toMatchObject({
      placement_status: 'placed',
      effective_size: 'Medium',
      placement_mode: { kind: 'normal', actual: 'Medium' },
      footprint: [{ column: 8, row: 0 }],
    });
    const threat = record(values(combatant['threats'], 'threats')[0], 'threat');
    expect(threat).toMatchObject({ source_id: FIGHTER, distance_band: 'near' });
  });

  it('publishes placement-pending MCP summaries without spatial keys', () => {
    const placed = separatedState();
    const state: EncounterState = {
      ...placed,
      tokens: placed.tokens.filter((token) => token.combatantId !== FIGHTER),
      adjudicationPending: [{
        kind: 'legacy_size_required',
        combatant: FIGHTER,
        sourceSizeText: null,
        suggestedAnchor: { column: 0, row: 0 },
        originatingToken: null,
      }],
    };
    const runtime = createEngineMcpRuntime(state, {
      requestedActorIds: [SCOUT],
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const capsule = runtime.feed.current();
    const result = record(runtime.toolSurface.execute('engine.get_state_summary', {
      state_ref: {
        run_id: capsule.runId,
        state_handle: engineStateHandle(capsule),
        expected_revision: capsule.revision,
      },
      granularity: 'combatant_detail',
      combatant_ids: [FIGHTER],
    }), 'pending state summary');
    const summary = record(result['summary'], 'pending summary body');
    const pending = record(values(summary['combatants'], 'pending summary combatants')[0], 'pending combatant');
    expect(pending).toEqual({
      combatant_id: FIGHTER,
      name: requiredProfile(state, FIGHTER).name,
      side: 'player_character',
      status: {
        life: 'living',
        hit_point_band: 'uninjured',
        effect_tags: [],
        action_available: false,
        bonus_action_available: false,
        reaction_available: false,
        movement_feet: 0,
        pending_decision_ids: [],
      },
      placement_status: 'placement_pending',
      pending_reason: 'legacy_size_required',
      options: [],
      threats: [],
    });
    expect(Object.keys(pending)).not.toEqual(expect.arrayContaining([
      'position', 'effective_size', 'placement_mode', 'footprint',
    ]));
  });

  it('records nearest-cell distance in actor knowledge', () => {
    const projection = projectActorKnowledge(separatedState(), SCOUT);
    expect(projection.policy).toBe('actor-knowledge-last-seen-v4');
    expect(projection.targets).toEqual([
      expect.objectContaining({
        kind: 'perceived', placementStatus: 'placed', targetId: FIGHTER,
        effectiveSize: 'Gargantuan', distanceFeet: 25,
      }),
    ]);
  });

  it('uses nearest-cell separation in DM intel', () => {
    const state = separatedState();
    const structuredRuntime = createEngineMcpRuntime(state, {
      requestedActorIds: [SCOUT],
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const capsule = structuredRuntime.feed.current();
    const row = exactDmIntelMatrix(state, capsule, OFFER_ENVIRONMENT.queries, [SCOUT])
      .find((candidate) => candidate.targetId === FIGHTER);
    expect(row).toMatchObject({
      policy: 'dm-turn-intel-v2-creature-space',
      targetId: FIGHTER,
      distanceFeet: 25,
    });
  });

  it('renders nearest-cell separation in AI-DM prose', () => {
    const state = separatedState();
    const proseRuntime = createEngineMcpRuntime(state, {
      requestedActorIds: [SCOUT],
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'regular_prose' },
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const prose = turnContext(proseRuntime);
    expect(RENDERER_POLICY_VERSION).toBe('turn-context-renderer-v4-creature-space');
    expect(String(prose['document'])).toContain(`${String(FIGHTER)}, 25 ft away`);
  });

  it('uses nearest-cell separation in renderer circumstance metrics', () => {
    const state = separatedState();
    const runtime = createEngineMcpRuntime(state, {
      requestedActorIds: [SCOUT],
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const capsule = runtime.feed.current();
    const context = turnContext(runtime);
    expect(extractCircumstanceFeatures({
      state,
      capsule,
      renderedContext: context,
      granularity: 'full',
      preTrimBytes: 1,
      postTrimBytes: 1,
    })).toMatchObject({
      mean_pairwise_engagement_distance: 25,
      minimum_pairwise_engagement_distance: 25,
    });
  });
});
