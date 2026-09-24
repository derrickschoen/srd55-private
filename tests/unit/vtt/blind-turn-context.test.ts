import { describe, expect, it } from 'vitest';
import { BUNDLED_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import { projectEncounterBoard } from '../../../src/vtt/encounter-board';
import { projectPlayerBoard } from '../../../src/vtt/encounter-projections';
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
  BLIND_STATBLOCK_DROPPED_FIELDS,
  BLIND_TURN_CONTEXT_MAX_BYTES,
  blindSemanticBoard,
  blindStatblockFacts,
  blindTurnContextSchema,
  projectEngineBlindTurn,
  type BlindTurnContextBudgetEvidence,
} from '../../../src/vtt/blind-turn-context';
import { referenceLegalMovement } from '../../helpers/reference-legal-movement';
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
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

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

const IDLE_COORDINATOR: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

const DIRECT_PAIRWISE_ANSWER_KEYS = new Set([
  'line_of_sight',
  'line_of_sight_between',
  'cover_between',
  'pair_answer',
  'pairwise_answers',
  'visibility_between',
]);
const PAIR_ENDPOINTS = [
  ['source_id', 'target_id'],
  ['sourceId', 'targetId'],
  ['from_id', 'to_id'],
  ['from', 'to'],
  ['first_id', 'second_id'],
] as const;
const PAIR_ANSWER_KEYS = new Set([
  'line_of_sight',
  'lineOfSight',
  'cover',
  'cover_tier',
  'coverTier',
  'blocks_sight',
  'blocksSight',
  'answer',
]);

function pairwiseTacticalAnswerPaths(value: unknown, path = '$'): readonly string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      pairwiseTacticalAnswerPaths(entry, `${path}[${String(index)}]`));
  }
  if (typeof value !== 'object' || value === null) return [];
  const entries = Object.entries(value);
  const keys = new Set(entries.map(([key]) => key));
  const direct = entries.flatMap(([key]) => DIRECT_PAIRWISE_ANSWER_KEYS.has(key)
    ? [`${path}.${key}`]
    : []);
  const compound = PAIR_ENDPOINTS.some(([source, target]) => keys.has(source) && keys.has(target)) &&
    [...PAIR_ANSWER_KEYS].some((key) => keys.has(key))
    ? [`${path}::<pairwise-tactical-answer>`]
    : [];
  return [
    ...direct,
    ...compound,
    ...entries.flatMap(([key, child]) => pairwiseTacticalAnswerPaths(child, `${path}.${key}`)),
  ];
}

async function hardContext(seed = 5_117_001) {
  const loaded = await loadArenaFixture(
    `tests/fixtures/arena-basis-hard/seed-${String(seed)}.json`,
  );
  let budget: BlindTurnContextBudgetEvidence | null = null;
  const runtime = createEngineMcpRuntime(loaded, {
    dmMode: 'blind',
    toolProfile: 'blind',
    blindFacts: true,
    offerEnvironment: OFFER_ENVIRONMENT,
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
// Independent oracle: one frozen-reference findPath per cell per required actor, row-major, routes included.
const REFERENCE_MOVEMENT_BY_ACTOR = referenceLegalMovement(
  MOVEMENT_PARITY_CONTEXT.planningState,
  MOVEMENT_PARITY_CONTEXT.capsule,
);
if (REFERENCE_MOVEMENT_BY_ACTOR.length !== movementParityRequest.actors.length) {
  throw new Error('Movement parity oracle lost an actor.');
}

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

  it('copies sourced mechanical essentials including attack bonuses, damage dice, spell DCs, and reduced spell definitions', async () => {
    const { context } = preparedHardContext();
    const facts = record(context['creature_facts'], 'creature facts');
    const statblocks = record(facts['statblocks'], 'statblocks');
    const priest = BUNDLED_MONSTER_ROSTER.find((row) => row.statblock.id === 'statblock:priest');
    if (priest === undefined) throw new Error('Priest statblock missing.');
    const projected = record(statblocks['statblock:priest'], 'projected priest');
    const block = record(projected['statblock'], 'priest block');
    const attacks = recordArray(block['attacks'], 'priest attacks');
    const sourceActions = priest.statblock.sourceDetails.actions;
    if (sourceActions.kind !== 'present') throw new Error('Priest sourced actions missing.');
    const sourceAttack = sourceActions.value.find((action) => action.kind === 'attack');
    const sourceSpellcasting = sourceActions.value.find((action) => action.kind === 'spellcasting');
    if (sourceAttack === undefined || sourceSpellcasting === undefined || sourceSpellcasting.saveDc.kind !== 'present') {
      throw new Error('Priest sourced attack or spellcasting mechanics missing.');
    }
    const attack = attacks.find((candidate) => candidate['id'] === sourceAttack.id);
    expect(attack?.['attack_bonus']).toBe(sourceAttack.attackBonus);
    expect(attack?.['delivery']).toEqual(sourceAttack.delivery);
    expect(recordArray(attack?.['damage'], 'priest attack damage').map((term) => term['dice']))
      .toEqual(sourceAttack.damage.map((term) => term.dice));
    const spellcasting = recordArray(block['spellcasting'], 'priest spellcasting')
      .find((candidate) => candidate['id'] === sourceSpellcasting.id);
    expect(spellcasting?.['save_dc']).toBe(sourceSpellcasting.saveDc.value);
    expect(spellcasting?.['spell_list']).toEqual(sourceSpellcasting.spells);
    const spiritGuardians = record(record(projected['referenced_spells'], 'priest spells')['spirit-guardians'], 'spirit guardians');
    expect(Object.keys(spiritGuardians).sort()).toEqual(['casting_time', 'effect', 'level', 'targeting']);
    expect(record(facts['provenance'], 'creature provenance')).toMatchObject({ kind: 'engine_fact' });
  });

  it('shares one Guard block across three actor references', () => {
    const { context } = preparedHardContext(5_117_002);
    const facts = record(context['creature_facts'], 'creature facts');
    const statblocks = record(facts['statblocks'], 'statblocks');
    const guardActors = recordArray(facts['actors'], 'creature actors')
      .filter((actor) => actor['statblock_ref'] === 'statblock:guard');

    expect(guardActors).toHaveLength(3);
    expect(Object.keys(statblocks).filter((id) => id === 'statblock:guard')).toEqual(['statblock:guard']);
    expect(new Set(guardActors.map((actor) => actor['statblock_ref']))).toEqual(new Set(['statblock:guard']));
  });

  it('drops the known flavor field provenance.designNote and records why it was removed', () => {
    const homebrew = BUNDLED_MONSTER_ROSTER.find(
      (row) => row.statblock.id === 'statblock:homebrew-beast/brush-bear',
    );
    if (homebrew === undefined || homebrew.statblock.provenance.kind !== 'original_homebrew') {
      throw new Error('Brush Bear original-homebrew fixture missing.');
    }
    const projected = blindStatblockFacts(homebrew.statblock);
    const flavor = homebrew.statblock.provenance.designNote;

    expect(projected.statblock).not.toHaveProperty('provenance');
    expect(projected.statblock).not.toHaveProperty('sourceDetails');
    expect(JSON.stringify(projected.statblock)).not.toContain(flavor);
    expect(BLIND_STATBLOCK_DROPPED_FIELDS).toContainEqual(expect.objectContaining({ path: 'provenance' }));
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

  it('keeps creature facts, movement, player projection, and semantic board free of pairwise tactical answers', () => {
    const { planningState, context } = preparedHardContext();
    const partyActor = planningState.combatants.find(
      (combatant) => combatant.profile.kind === 'player_character',
    );
    if (partyActor === undefined) throw new Error('Boundary fixture has no player character.');
    const playerProjection = projectPlayerBoard(projectPlayerView(planningState, {
      seatId: `seat:${String(partyActor.profile.id)}`,
      combatantId: partyActor.profile.id,
    }), IDLE_COORDINATOR);
    const surfaces = {
      creature_facts: context['creature_facts'],
      legal_movement: context['legal_movement'],
      player_projection: playerProjection,
      semantic_board: context['semantic_board'],
    } as const;

    expect(pairwiseTacticalAnswerPaths({
      source_id: 'creature:a', target_id: 'creature:b', cover_tier: 'half',
    })).toEqual(['$::<pairwise-tactical-answer>']);
    expect(pairwiseTacticalAnswerPaths({ line_of_sight: true })).toEqual(['$.line_of_sight']);
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(pairwiseTacticalAnswerPaths(surface), name).toEqual([]);
    }

    const semantic = record(context['semantic_board'], 'semantic board');
    const terrain = record(record(semantic['cells'], 'semantic cells')['terrain'], 'semantic terrain');
    expect(Object.keys(terrain).sort()).toEqual([
      'half_cover', 'open', 'partition', 'three_quarters_cover', 'wall',
    ]);
    expect(semantic).not.toHaveProperty('reach_range_summaries');
  });

  it('prints exactly canonical same-revision destination costs without routes or tactical verdicts', async () => {
    const { capsule, context } = preparedHardContext(5_117_002);
    const movement = record(context['legal_movement'], 'legal movement');
    const actors = recordArray(movement['actors'], 'movement actors');
    expect(actors).toHaveLength(REFERENCE_MOVEMENT_BY_ACTOR.length);
    for (const [index, actor] of actors.entries()) {
      const expected = REFERENCE_MOVEMENT_BY_ACTOR[index];
      if (expected === undefined) throw new Error('Movement actor order mismatch.');
      // An array, not a Map: the printed order (row-major) is part of the answer.
      expect(actor['cells']).toEqual(expected.cells.map((cell) => ({ label: cell.label, cost_feet: cell.costFeet })));
    }
    expect(movement).toMatchObject({
      provenance: { query: 'canonical-path-v1', state_digest: capsule.digest },
    });
    expect(JSON.stringify(movement)).not.toMatch(/route|path_cells|target|opportunity|cover|score/iu);
  });

  it('resolves the frozen per-cell reference destinations, costs, and routes in row-major order', () => {
    const { planningState, capsule } = MOVEMENT_PARITY_CONTEXT;
    const projection = projectEngineBlindTurn(planningState, capsule, OFFER_ENVIRONMENT.queries);
    expect(projection.resolvedMovement).toEqual(REFERENCE_MOVEMENT_BY_ACTOR);
    // The comparison must cover real routes, not only the start and single steps.
    expect(REFERENCE_MOVEMENT_BY_ACTOR.flatMap((actor) => actor.cells).some((cell) => cell.path.length > 1)).toBe(true);
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
    const facts = record(context['creature_facts'], 'creature facts');
    const statblocks = record(facts['statblocks'], 'statblocks');
    const [statblockId, statblockEntry] = Object.entries(statblocks)[0] ?? [];
    if (statblockId === undefined || statblockEntry === undefined) throw new Error('Expected a statblock.');
    const statblockFacts = record(statblockEntry, 'statblock facts');
    const statblock = record(statblockFacts['statblock'], 'statblock');
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
      {
        ...context,
        creature_facts: {
          ...facts,
          statblocks: {
            ...statblocks,
            [statblockId]: { ...statblockFacts, statblock: { ...statblock, flavor: 'undeclared' } },
          },
        },
      },
    ];

    for (const injected of injections) {
      expect(() => blindTurnContextSchema.parse(injected)).toThrow();
      expect(() => new BlindModelIngressRecorder().recordJson('turn_context', injected)).toThrow();
    }
  });

  it.each([5_117_002, 5_117_004, 5_117_007])(
    'compresses every shared statblock in seven-actor hard fixture %i without truncation',
    async (seed) => {
      const fixture = BLIND_FIXTURES.find((entry) => entry.seed === seed);
      if (fixture === undefined) throw new Error(`Missing fixture ${String(seed)}.`);
      const state = await fixture.state();
      expect(state.combatants.filter((actor) => actor.profile.kind === 'monster')).toHaveLength(7);
      const serialized = SERIALIZED_FIXTURES.get(seed);
      if (serialized === undefined) throw new Error(`Missing serialized fixture ${String(seed)}.`);
      const facts = record(serialized.context.creature_facts, 'creature facts');
      const statblocks = record(facts['statblocks'], 'statblocks');
      for (const [id, entry] of Object.entries(statblocks)) {
        const source = BUNDLED_MONSTER_ROSTER.find((row) => row.statblock.id === id);
        if (source === undefined) throw new Error(`Missing source statblock ${id}.`);
        const projected = record(entry, 'projected statblock');
        const compressedBytes = new TextEncoder().encode(JSON.stringify(projected['statblock'])).byteLength;
        const sourceBytes = new TextEncoder().encode(JSON.stringify(source.statblock)).byteLength;
        expect(compressedBytes, id).toBeLessThan(sourceBytes);
      }
      expect(serialized.truncatedBlocks).toEqual([]);
    },
  );

  it('rejects a 32 KiB blind base cap instead of truncating a required block', async () => {
    const loaded = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117002.json');
    expect(() => createEngineMcpRuntime(loaded, {
      dmMode: 'blind',
      toolProfile: 'blind',
      turnContextMaximumBytes: 32 * 1024,
      offerEnvironment: OFFER_ENVIRONMENT,
    }).toolSurface.execute('engine.get_turn_context', {
      run_id: 'encounter:engine-mcp',
      expected_revision: 1,
      scope: 'round',
      granularity: 'full',
    })).toThrow('Blind context base cap must be 65536 bytes');
  });
});
