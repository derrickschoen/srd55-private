import { describe, expect, it } from 'vitest';
import { BUNDLED_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { projectDmView } from '../../../src/combat/visibility';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { projectEncounterBoard } from '../../../src/vtt/encounter-board';
import {
  createEngineMcpRuntime,
  loadArenaFixture,
  projectFutureMonsterTurns,
} from '../../../src/vtt/mcp/entrypoint';
import {
  BLIND_CONTEXT_TOP_LEVEL_KEYS,
  BlindModelIngressRecorder,
  assertBlindTurnContextAllowlist,
  assertNoForbiddenBlindStructure,
} from '../../../src/vtt/blind-model-ingress';
import {
  BLIND_SEMANTIC_BOARD_MAX_BYTES,
  BLIND_TURN_CONTEXT_MAX_BYTES,
  blindSemanticBoard,
  blindTurnContextSchema,
  type BlindTurnContextBudgetEvidence,
} from '../../../src/vtt/blind-turn-context';
import {
  projectEngineSemanticBoard,
  semanticBoardPayload,
} from '../../../src/vtt/semantic-board-payload';
import {
  assignCreatureBadges,
  hpBandLabel,
  hpBandOf,
} from '../../../src/vtt/board-chrome';
import {
  blindFixtureCases,
  serializeBlindFixture,
} from '../../../tools/blind-context-fixture-report';

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function recordArray(value: unknown, label: string): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value.map((entry) => record(entry, label));
}

async function hardContext(seed = 5_117_001) {
  const loaded = await loadArenaFixture(
    `tests/fixtures/arena-basis-hard/seed-${String(seed)}.json`,
  );
  let budget: BlindTurnContextBudgetEvidence | null = null;
  const runtime = createEngineMcpRuntime(loaded, {
    dmMode: 'blind',
    toolProfile: 'blind',
    onBlindTurnContextRendered: (value) => { budget = value; },
  });
  const capsule = runtime.feed.current();
  const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
  }), 'blind context');
  const request = capsule.request;
  if (request === null || request.phase === 'speculative') throw new Error('Expected ordinary request.');
  const planningState = projectFutureMonsterTurns(loaded, request.actors);
  if (budget === null) throw new Error('Expected blind budget evidence.');
  return { loaded, planningState, runtime, capsule, context, budget: budget as BlindTurnContextBudgetEvidence };
}

const BLIND_FIXTURES = blindFixtureCases();
const PREPARED_HARD_CONTEXTS = new Map((await Promise.all(
  [5_117_001, 5_117_002].map(async (seed) => [seed, await hardContext(seed)] as const),
)));
const SERIALIZED_FIXTURES = new Map((await Promise.all(
  BLIND_FIXTURES.map(async (fixture) => [fixture.seed, await serializeBlindFixture(fixture)] as const),
)));

function preparedHardContext(seed = 5_117_001) {
  const prepared = PREPARED_HARD_CONTEXTS.get(seed);
  if (prepared === undefined) throw new Error(`Missing prepared hard context ${String(seed)}.`);
  return prepared;
}

const MOVEMENT_PARITY_CONTEXT = preparedHardContext(5_117_002);
const movementParityRequest = MOVEMENT_PARITY_CONTEXT.capsule.request;
if (movementParityRequest === null || movementParityRequest.phase === 'speculative') {
  throw new Error('Expected ordinary movement parity request.');
}
const CANONICAL_MOVEMENT_BY_ACTOR = movementParityRequest.actors.map((actorId) => {
  const actor = MOVEMENT_PARITY_CONTEXT.capsule.projection.combatants.find(
    (candidate) => candidate.id === actorId,
  );
  if (actor === undefined) throw new Error('Movement parity actor missing.');
  const expected = new Map<string, number>();
  for (let row = 0; row < MOVEMENT_PARITY_CONTEXT.planningState.bounds.rows; row += 1) {
    for (let column = 0; column < MOVEMENT_PARITY_CONTEXT.planningState.bounds.columns; column += 1) {
      const result = canonicalEngineQueryPort.path(MOVEMENT_PARITY_CONTEXT.planningState, {
        actorId,
        destination: { column, row },
        movement: 'normal',
        maximumFeet: actor.movementRemainingFeet,
      });
      if (result.legal) expected.set(`${String(column)},${String(row)}`, result.costFeet);
    }
  }
  return expected;
});

describe('blind turn context', () => {
  it('emits exactly the closed top-level allowlist and no recommendation structure', async () => {
    const { context } = preparedHardContext();

    expect(Object.keys(context).sort()).toEqual([...BLIND_CONTEXT_TOP_LEVEL_KEYS].sort());
    expect(() => assertBlindTurnContextAllowlist(context)).not.toThrow();
    expect(() => assertNoForbiddenBlindStructure(context)).not.toThrow();
    expect(context).toMatchObject({ granularity: 'full', dm_mode: 'blind' });
    expect(JSON.stringify(context)).not.toMatch(
      /options_omitted_for_size|suggested_plan|team_plan_frontier|opportunity_cost|engine_default_option_id/u,
    );
  });

  it('binds name, badge, side, and HP band through the exact board-chrome projector', async () => {
    const { planningState, context } = preparedHardContext();
    const board = projectEncounterBoard(projectDmView(planningState));
    const placed = board.combatants.filter(
      (combatant): combatant is Extract<typeof combatant, { readonly placementStatus: 'placed' }> =>
        combatant.placementStatus === 'placed',
    );
    const badges = assignCreatureBadges(placed);
    const expected = placed.map((combatant, index) => ({
      name: combatant.name,
      badge: badges[index]?.number,
      side: combatant.kind === 'player_character' ? 'party' : 'foe',
      hp_band: hpBandLabel(hpBandOf(combatant.hitPointBand)),
    }));
    const roster = recordArray(context['roster'], 'roster');
    const initiative = recordArray(context['initiative'], 'initiative');

    expect(roster).toEqual(expected);
    expect(initiative.map(({ current: _current, delayed: _delayed, ...identity }) => identity))
      .toEqual(planningState.initiative.map((entry) =>
        expected.find((_display, index) => placed[index]?.id === entry.combatant)));
    const request = record(context['request'], 'request');
    expect(recordArray(request['required_actors'], 'required actors').every((actor) =>
      typeof actor['name'] === 'string' && typeof actor['badge'] === 'number' &&
      Object.keys(actor).sort().join(',') === 'badge,name')).toBe(true);
  });

  it('hides numeric party HP/resources while preserving exact monster state and current conditions', async () => {
    const { planningState, capsule, context } = preparedHardContext();
    const facts = record(context['creature_facts'], 'creature facts');
    const actors = recordArray(facts['actors'], 'creature actors');
    const activeRules = record(facts['active_rules'], 'active rules');

    for (const [actorIndex, actor] of actors.entries()) {
      const badge = actor['badge'];
      const roster = recordArray(context['roster'], 'roster');
      const display = roster.find((entry) => entry['badge'] === badge);
      const projected = capsule.projection.combatants[actorIndex];
      if (display === undefined || projected === undefined) throw new Error('Actor binding failed.');
      expect(actor['conditions']).toEqual(projected.planning.conditionFlags);
      expect(actor['concentration']).toBe(projected.planning.concentrating);
      const hp = record(actor['hp_knowledge'], 'HP knowledge');
      if (actor['side'] === 'party') {
        expect(hp).toEqual({ kind: 'displayed_band', band: display['hp_band'] });
        expect(actor['remaining_resources']).toBeNull();
        const rules = record(activeRules[String(actor['active_rules_ref'])], 'party active rules');
        expect(rules).not.toHaveProperty('hitPointMaximum');
        expect(rules).not.toHaveProperty('spellSlots');
        expect(rules).not.toHaveProperty('limitedResources');
      } else {
        expect(hp).toEqual({
          kind: 'exact',
          current: projected.hitPoints,
          maximum: projected.hitPointMaximum,
          temporary: projected.planning.temporaryHitPoints,
        });
        const stateActor = planningState.combatants.find((entry) => entry.profile.id === projected.id);
        const resources = record(actor['remaining_resources'], 'monster resources');
        expect(resources['spell_slots']).toEqual(projected.planning.spellSlots);
        expect(resources['limited_uses']).toEqual(stateActor?.limitedResources ?? []);
        expect(resources['legendary_actions']).toBe(projected.planning.legendaryActionUsesRemaining);
        expect(resources['legendary_resistances']).toBe(projected.planning.legendaryResistanceUsesRemaining);
      }
    }
  });

  it('copies complete sourced statblocks, save DCs, attacks, and referenced spell definitions', async () => {
    const { context } = preparedHardContext();
    const facts = record(context['creature_facts'], 'creature facts');
    const statblocks = record(facts['statblocks'], 'statblocks');
    const priest = BUNDLED_MONSTER_ROSTER.find((row) => row.statblock.id === 'statblock:priest');
    if (priest === undefined) throw new Error('Priest statblock missing.');
    const projected = record(statblocks['statblock:priest'], 'projected priest');

    expect(projected['statblock']).toEqual(priest.statblock);
    expect(record(projected['statblock'], 'priest block')).toHaveProperty('sourceDetails.actions');
    expect(record(projected['referenced_spells'], 'priest spells')).toHaveProperty('spirit-guardians');
    expect(record(facts['provenance'], 'creature provenance')).toMatchObject({ kind: 'engine_fact' });
  });

  it('preserves every E1b semantic block byte-for-byte except the entire reach/range summary', async () => {
    const { planningState, capsule, context } = preparedHardContext();
    const projection = projectEngineSemanticBoard(planningState, capsule.revision);
    const source = semanticBoardPayload(projection);
    const expected = blindSemanticBoard(projection, capsule.digest);
    const semantic = record(context['semantic_board'], 'semantic board');

    expect(semantic).toEqual(expected);
    expect(semantic).not.toHaveProperty('reach_range_summaries');
    for (const key of [
      'creatures', 'cells', 'doors', 'objects', 'light_sources', 'adjacency_pairs',
    ] as const) {
      expect(JSON.stringify(semantic[key])).toBe(JSON.stringify(source[key]));
    }
    expect(record(semantic['cells'], 'semantic cells')).toHaveProperty('blocked');
    expect(record(semantic['cells'], 'semantic cells')).toHaveProperty('difficult_terrain');
    expect(record(semantic['cells'], 'semantic cells')).toHaveProperty('light');
    expect(record(semantic['cells'], 'semantic cells')).toHaveProperty('obscured');
    expect(record(semantic['cells'], 'semantic cells')).toHaveProperty('fogged');
  });

  it('prints exactly canonical same-revision destination costs without routes or tactical verdicts', async () => {
    const { capsule, context } = preparedHardContext(5_117_002);
    const movement = record(context['legal_movement'], 'legal movement');
    const actors = recordArray(movement['actors'], 'movement actors');
    for (const [index, actor] of actors.entries()) {
      const expected = CANONICAL_MOVEMENT_BY_ACTOR[index];
      if (expected === undefined) throw new Error('Movement actor order mismatch.');
      const actual = new Map(recordArray(actor['cells'], 'movement cells').map((cell) =>
        [String(cell['label']), Number(cell['cost_feet'])] as const));
      expect(actual).toEqual(expected);
    }
    expect(movement).toMatchObject({
      provenance: { query: 'canonical-path-v1', state_digest: capsule.digest },
    });
    expect(JSON.stringify(movement)).not.toMatch(/route|path_cells|target|opportunity|cover|score/iu);
  });

  it.each(BLIND_FIXTURES)(
    'fits required $family seed $seed blocks under the blind caps without truncation',
    async (fixture) => {
      const row = SERIALIZED_FIXTURES.get(fixture.seed);
      if (row === undefined) throw new Error(`Missing serialized fixture ${String(fixture.seed)}.`);
      expect(blindTurnContextSchema.parse(row.context)).toEqual(row.context);
      expect(row.baseBytes).toBeLessThanOrEqual(BLIND_TURN_CONTEXT_MAX_BYTES);
      expect(row.semanticBytes).toBeLessThanOrEqual(BLIND_SEMANTIC_BOARD_MAX_BYTES);
      expect(row.truncatedBlocks).toEqual([]);
    },
  );

  it('rejects undeclared context fields at top, actor, and movement-cell depths', () => {
    const { context } = preparedHardContext(5_117_002);
    const actor = recordArray(record(context['legal_movement'], 'legal movement')['actors'], 'movement actors')[0];
    if (actor === undefined) throw new Error('Expected a movement actor.');
    const cell = recordArray(actor['cells'], 'movement cells')[0];
    if (cell === undefined) throw new Error('Expected a movement cell.');
    const injections = [
      { ...context, undeclared: true },
      {
        ...context,
        legal_movement: {
          ...record(context['legal_movement'], 'legal movement'),
          actors: [{ ...actor, candidate_count: 6 }],
        },
      },
      {
        ...context,
        legal_movement: {
          ...record(context['legal_movement'], 'legal movement'),
          actors: [{ ...actor, cells: [{ ...cell, candidate_count: 6 }] }],
        },
      },
    ];

    for (const injected of injections) {
      expect(() => blindTurnContextSchema.parse(injected)).toThrow();
      expect(() => new BlindModelIngressRecorder().recordJson('turn_context', injected)).toThrow();
    }
  });

  it.each([5_117_002, 5_117_004, 5_117_007])(
    'proves the seven-actor hard fixture %i cannot fit the legacy 32 KiB base cap',
    async (seed) => {
      const fixture = BLIND_FIXTURES.find((entry) => entry.seed === seed);
      if (fixture === undefined) throw new Error(`Missing fixture ${String(seed)}.`);
      const state = await fixture.state();
      expect(state.combatants.filter((actor) => actor.profile.kind === 'monster')).toHaveLength(7);
      const serialized = SERIALIZED_FIXTURES.get(seed);
      if (serialized === undefined) throw new Error(`Missing serialized fixture ${String(seed)}.`);
      expect(serialized.baseBytes).toBeGreaterThan(32 * 1024);
    },
  );

  it('rejects a 32 KiB blind base cap instead of truncating a required block', async () => {
    const loaded = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117002.json');
    expect(() => createEngineMcpRuntime(loaded, {
      dmMode: 'blind',
      toolProfile: 'blind',
      turnContextMaximumBytes: 32 * 1024,
    }).toolSurface.execute('engine.get_turn_context', {
      run_id: 'encounter:engine-mcp',
      expected_revision: 1,
      scope: 'round',
      granularity: 'full',
    })).toThrow('Blind context base cap must be 65536 bytes');
  });
});
