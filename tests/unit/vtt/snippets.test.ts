import { describe, expect, it } from 'vitest';
import type { EngineTargetSelector } from '../../../src/vtt/engine-query-port';
import type { EngineTurnIntent } from '../../../src/vtt/intent-resolver';
import { pureIntentResolver } from '../../../src/vtt/intent-resolver';
import { createEngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
import { createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { SUGGESTED_PLAN_MAX_BYTES } from '../../../src/vtt/mcp/engine-server';
import { mcpRequestMeta } from '../../../src/vtt/mcp/handler';
import { engineSchemaInternals, schemaViolations } from '../../../src/vtt/mcp/schemas';
import { SNIPPET_REGISTRY } from '../../../src/vtt/snippet-registry-runtime';

const CLIENT = Object.freeze({ name: 'snippet-test', version: '1.0.0' });

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function structured(value: unknown): Readonly<Record<string, unknown>> {
  const result = record(value, 'tool result');
  expect(result['isError']).toBe(false);
  return record(result['structuredContent'], 'structured content');
}

function tool(
  runtime: ReturnType<typeof createEngineMcpRuntime>,
  name: string,
  argumentsValue: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const response = runtime.handler.handle({
    jsonrpc: '2.0',
    id: name,
    method: 'tools/call',
    params: { _meta: mcpRequestMeta(CLIENT), name, arguments: argumentsValue },
  });
  if (response === null || response.error !== undefined) throw new Error(`Tool ${name} failed.`);
  return structured(response.result);
}

function externalTarget(target: EngineTargetSelector): Readonly<Record<string, unknown>> {
  switch (target.kind) {
    case 'combatant': return { kind: target.kind, combatant_id: target.combatantId };
    case 'enemy_threatening_ally': return { kind: target.kind, ally_id: target.allyId };
    case 'nearest_visible_enemy':
    case 'lowest_hp_visible_enemy':
    case 'most_injured_visible_ally':
    case 'current_threat': return { kind: target.kind };
  }
}

function externalIntent(intent: EngineTurnIntent): Readonly<Record<string, unknown>> {
  const branch = (value: Omit<EngineTurnIntent, 'actorId' | 'fallback'>): Readonly<Record<string, unknown>> => ({
    choice: value.choice.kind === 'attack'
      ? { kind: value.choice.kind, action_id: value.choice.actionId, target: externalTarget(value.choice.target), ...(value.choice.resourcePolicy === undefined ? {} : { resource_policy: value.choice.resourcePolicy }) }
      : value.choice.kind === 'use_action'
        ? { kind: value.choice.kind, action_id: value.choice.actionId, target: value.choice.target === null ? null : externalTarget(value.choice.target) }
        : value.choice.kind === 'cast_spell'
          ? { kind: value.choice.kind, spell_id: value.choice.spellId, target: value.choice.target === null ? null : externalTarget(value.choice.target), ...(value.choice.slotPolicy === undefined ? {} : { slot_policy: value.choice.slotPolicy }) }
          : { kind: value.choice.kind },
    movement: {
      willingness: value.movement.willingness,
      ...(value.movement.maximumFeet === undefined ? {} : { maximum_feet: value.movement.maximumFeet }),
      opportunity_risk: value.movement.opportunityRisk,
    },
    engagement: {
      stance: value.engagement.stance,
      ...(value.engagement.anchor === undefined ? {} : { anchor: value.engagement.anchor === null ? null : externalTarget(value.engagement.anchor) }),
    },
  });
  return {
    actor_id: intent.actorId,
    ...branch(intent),
    fallback: intent.fallback === null ? null : branch(intent.fallback),
  };
}

function goldenSummary(intents: readonly EngineTurnIntent[]) {
  return intents.map((intent) => ({
    actor: intent.actorId,
    action: intent.choice.kind === 'attack' || intent.choice.kind === 'use_action'
      ? `${intent.choice.kind}:${intent.choice.actionId}`
      : intent.choice.kind,
    target: intent.choice.kind === 'attack' || intent.choice.kind === 'use_action'
      ? intent.choice.target?.kind === 'combatant' ? intent.choice.target.combatantId : null
      : null,
    stance: intent.engagement.stance,
  }));
}

async function registryFixture(seed: number) {
  const state = await loadArenaFixture(`tests/fixtures/arena-basis/seed-${String(seed)}.json`);
  const runtime = createEngineMcpRuntime(state);
  return { state, runtime, capsule: runtime.feed.current() };
}

function withProjection(
  capsule: Awaited<ReturnType<typeof registryFixture>>['capsule'],
  projection: typeof capsule.projection,
) {
  if (capsule.request === null) throw new TypeError('Fixture request is absent.');
  return createEngineStateCapsule({
    runId: capsule.runId,
    branchId: capsule.branchId,
    revision: capsule.revision + 1,
    generatedAt: capsule.generatedAt,
    request: capsule.request,
    projection,
    historyDelta: capsule.historyDelta,
    rulesIndex: capsule.rulesIndex,
  });
}

function chokeCapsule(capsule: Awaited<ReturnType<typeof registryFixture>>['capsule']) {
  return withProjection(capsule, {
    ...capsule.projection,
    blockedCells: [...capsule.projection.blockedCells, { column: 2, row: 6 }],
  });
}

describe('plays v1 registry', () => {
  it('gates applicability, advertises at most three plays, and ranks them deterministically', async () => {
    const roomOne = await registryFixture(3_943_001);
    const first = SNIPPET_REGISTRY.applicable(roomOne.capsule);
    const second = SNIPPET_REGISTRY.applicable(roomOne.capsule);
    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    expect(first.map((play) => play.name)).toEqual(['focus_fire', 'basic_advance']);
    expect(first.every((play) => !play.description.includes('\n'))).toBe(true);

    const roomThree = await registryFixture(3_943_003);
    expect(SNIPPET_REGISTRY.applicable(roomThree.capsule).map((play) => play.name))
      .toEqual(['basic_advance']);
  });

  it('returns the validated expansion as an unqueued MCP draft', async () => {
    const { runtime, capsule } = await registryFixture(3_943_001);
    const context = tool(runtime, 'engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
    });
    const advertised = context['applicable_plays'];
    if (!Array.isArray(advertised)) throw new TypeError('Applicable plays are absent.');
    expect(advertised.map((play) => record(play, 'advertised play')['name'])).toContain('focus_fire');

    const top = record(advertised[0], 'top advertised play');
    const suggested = record(context['suggested_plan'], 'suggested plan');
    expect(suggested).toMatchObject({
      play_name: top['name'],
      snippet_hash: top['snippet_hash'],
      advisory: expect.stringContaining('submit_round_intents'),
    });
    expect(Buffer.byteLength(JSON.stringify(suggested), 'utf8')).toBeLessThanOrEqual(
      SUGGESTED_PLAN_MAX_BYTES,
    );
    const suggestedIntents = suggested['intents'];
    if (!Array.isArray(suggestedIntents)) throw new TypeError('Suggested intents are absent.');
    expect(suggestedIntents.some((value) =>
      record(record(value, 'suggested intent')['choice'], 'suggested choice')['kind'] === 'attack'))
      .toBe(true);

    const expected = SNIPPET_REGISTRY.expand('focus_fire', capsule);
    const draft = tool(runtime, 'engine.propose_from_play', { play_name: 'focus_fire' });
    expect(draft).toEqual({
      state_ref: context['state_ref'],
      play_name: 'focus_fire',
      snippet_hash: expected.definition.snippetHash,
      intents: expected.intents.map(externalIntent),
    });
    expect(runtime.proposals).toEqual([]);
    const values = draft['intents'];
    if (!Array.isArray(values)) throw new TypeError('Draft intents are absent.');
    expect(values.map((value) => schemaViolations(engineSchemaInternals.turnIntent, value))).toEqual(
      values.map(() => []),
    );
    expect(values.every((value) => record(value, 'draft intent')['choice'] !== undefined)).toBe(true);
  });

  it('omits the suggestion when no play applies', async () => {
    const { runtime, capsule } = await registryFixture(3_943_003);
    if (capsule.request === null) throw new TypeError('Fixture request is absent.');
    const requested = new Set(capsule.request.actors);
    runtime.feed.replace(createEngineStateCapsule({
      runId: capsule.runId,
      branchId: capsule.branchId,
      revision: capsule.revision + 1,
      generatedAt: capsule.generatedAt,
      request: capsule.request,
      projection: {
        ...capsule.projection,
        combatants: capsule.projection.combatants.map((actor) =>
          requested.has(actor.id) ? { ...actor, life: 'dead' as const } : actor),
      },
      historyDelta: capsule.historyDelta,
      rulesIndex: capsule.rulesIndex,
    }));

    const context = tool(runtime, 'engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision + 1,
      scope: 'round',
    });
    expect(context['applicable_plays']).toEqual([]);
    expect(context).not.toHaveProperty('suggested_plan');
  });

  it.each([
    {
      name: 'basic_advance', seed: 3_943_003,
      expected: [{ actor: 'combatant:generated-3943003-monster-1', action: 'attack:slam', target: 'combatant:wizard', stance: 'close_to_melee' }],
    },
    {
      name: 'focus_fire', seed: 3_943_001,
      expected: [
        { actor: 'combatant:generated-3943001-monster-1', action: 'attack:dagger', target: 'combatant:wizard', stance: 'maintain_range' },
        { actor: 'combatant:generated-3943001-monster-2', action: 'attack:light-hammer', target: 'combatant:wizard', stance: 'maintain_range' },
        { actor: 'combatant:generated-3943001-monster-3', action: 'attack:longbow', target: 'combatant:wizard', stance: 'maintain_range' },
      ],
    },
    {
      name: 'remove_obstacle', seed: 3_943_001,
      expected: [
        { actor: 'combatant:generated-3943001-monster-1', action: 'attack:dagger', target: 'combatant:wizard', stance: 'maintain_range' },
        { actor: 'combatant:generated-3943001-monster-2', action: 'attack:grab', target: 'combatant:wizard', stance: 'close_to_melee' },
        { actor: 'combatant:generated-3943001-monster-3', action: 'attack:longbow', target: 'combatant:wizard', stance: 'maintain_range' },
      ],
    },
  ] as const)('pins $name against frozen arena-basis room $seed', async ({ name, seed, expected }) => {
    const { capsule } = await registryFixture(seed);
    const basis = name === 'remove_obstacle' ? chokeCapsule(capsule) : capsule;
    expect(goldenSummary(SNIPPET_REGISTRY.expand(name, basis).intents)).toEqual(expected);
  });

  it.each([
    // Room 1: the Hobgoblin at (16,3) has a 150-foot Longbow against every PC.
    { room: 1, seed: 3_943_001, proof: 'Longbow 150 feet from (16,3)' },
    // Room 2: the Specters at (11,1)/(10,1) need 40/35 feet to bring 5-foot Life Drain to the Cleric at (2,4), both within a 60-foot Dash commitment.
    { room: 2, seed: 3_943_002, proof: 'Life Drain after 40/35 feet toward (2,4)' },
    // Room 4: the Tough at (20,1) is already within its Heavy Crossbow's 100-foot range of the Wizard at (1,6).
    { room: 4, seed: 3_943_004, proof: 'Heavy Crossbow 100 feet from (20,1)' },
    // Room 5: the Tough at (21,3) is exactly 100 feet from the Wizard at (1,6), matching Heavy Crossbow range.
    { room: 5, seed: 3_943_005, proof: 'Heavy Crossbow exactly 100 feet from (21,3)' },
    // Room 6: the Dire Wolf at (9,1) needs 35 feet to bring its 5-foot Bite to the Fighter at (1,2), within its 50-foot speed.
    { room: 6, seed: 3_943_006, proof: 'Bite after 35 feet toward (1,2)' },
  ] as const)('keeps frozen room $room focus-fire aggressive: $proof', async ({ seed, proof }) => {
    const { state, capsule } = await registryFixture(seed);
    const draft = SNIPPET_REGISTRY.expand('focus_fire', capsule).intents;
    const attacks = draft.filter((intent) => intent.choice.kind === 'attack');
    expect(attacks.length, proof).toBeGreaterThan(0);

    for (const actor of capsule.projection.combatants.filter((candidate) =>
      capsule.request?.actors.includes(candidate.id) === true)) {
      const attackIds = new Set(actor.actions.filter((action) => action.kind === 'attack').map((action) => action.actionId));
      const reachable = actor.actionApproaches.some((approach) =>
        attackIds.has(approach.actionId) && approach.minimumMovementFeet !== null &&
        approach.minimumMovementFeet <= actor.speedFeet * 2);
      const intent = draft.find((candidate) => candidate.actorId === actor.id);
      expect(intent?.choice.kind).toBe(reachable ? 'attack' : 'dash');
    }

    for (const attack of attacks) {
      const resolution = pureIntentResolver.resolve(state, attack);
      expect(resolution.valid).toBe(true);
      if (resolution.valid && resolution.selectedBranch === 'fallback') {
        expect(resolution.mechanics.actionId).toBe('dash');
        expect(resolution.mechanics.movementCostFeet).toBeGreaterThan(0);
      }
    }
  });

  it.each([
    { seed: 3_943_001, actors: [] },
    { seed: 3_943_002, actors: ['combatant:generated-3943002-monster-1', 'combatant:generated-3943002-monster-2'] },
    { seed: 3_943_003, actors: ['combatant:generated-3943003-monster-1'] },
    { seed: 3_943_004, actors: [] },
    { seed: 3_943_005, actors: [] },
    { seed: 3_943_006, actors: ['combatant:generated-3943006-monster-1', 'combatant:generated-3943006-monster-2'] },
  ] as const)('commits movement for out-of-reach melee plans in frozen room seed $seed', async ({ seed, actors }) => {
    const { capsule } = await registryFixture(seed);
    const draft = SNIPPET_REGISTRY.expand('basic_advance', capsule).intents;
    for (const actorId of actors) {
      const intent = draft.find((candidate) => candidate.actorId === actorId);
      expect(intent?.choice.kind).toBe('attack');
      expect(intent?.engagement.stance).toBe('close_to_melee');
      expect(intent?.movement.willingness).not.toBe('none');
    }
  });

  it('moves to grapple the blocker when no control spell is in range', async () => {
    const { capsule } = await registryFixture(3_943_001);
    const draft = SNIPPET_REGISTRY.expand('remove_obstacle', chokeCapsule(capsule)).intents;
    const grapple = draft.find((intent) =>
      (intent.choice.kind === 'attack' || intent.choice.kind === 'use_action') &&
      /grapple|grab/iu.test(intent.choice.actionId));
    expect(grapple?.engagement.stance).toBe('close_to_melee');
    expect(grapple?.movement.willingness).not.toBe('none');
  });

  it('requires a real obstacle and yields honestly to focus fire without a control action', async () => {
    const { capsule } = await registryFixture(3_943_001);
    expect(SNIPPET_REGISTRY.applicable(capsule).map((play) => play.name)).not.toContain('remove_obstacle');
    expect(() => SNIPPET_REGISTRY.expand('remove_obstacle', capsule)).toThrow('PLAY_NOT_APPLICABLE');

    const obstructed = chokeCapsule(capsule);
    expect(SNIPPET_REGISTRY.applicable(obstructed).map((play) => play.name)[0]).toBe('remove_obstacle');
    const withoutControl = withProjection(obstructed, {
      ...obstructed.projection,
      combatants: obstructed.projection.combatants.map((actor) => ({
        ...actor,
        actions: actor.actions.filter((action) => !/web|grapple|grab/iu.test(action.actionId)),
      })),
    });
    expect(SNIPPET_REGISTRY.applicable(withoutControl).map((play) => play.name))
      .toEqual(['focus_fire', 'basic_advance']);
    expect(() => SNIPPET_REGISTRY.expand('remove_obstacle', withoutControl))
      .toThrow('PLAY_NOT_APPLICABLE');
  });

  it('never holds and Dodges against a living projected enemy unless no adjacent path exists', async () => {
    for (let seed = 3_943_001; seed <= 3_943_012; seed += 1) {
      const { capsule } = await registryFixture(seed);
      const requested = capsule.projection.combatants.filter((actor) =>
        capsule.request?.actors.includes(actor.id) === true && actor.life !== 'dead');
      const blocked = [
        ...capsule.projection.blockedCells,
        ...capsule.projection.movementBlockingObjects.flatMap((object) => object.cells),
      ];
      for (const play of SNIPPET_REGISTRY.applicable(capsule)) {
        const intents = SNIPPET_REGISTRY.expand(play.name, capsule).intents;
        for (const intent of intents) {
          const actor = requested.find((candidate) => candidate.id === intent.actorId);
          if (actor === undefined) throw new Error(`Requested actor ${String(intent.actorId)} is absent.`);
          const holdAndDodge = intent.choice.kind === 'dodge' && intent.engagement.stance === 'hold_position';
          const openAdjacentCell = Array.from({ length: capsule.projection.bounds.rows }, (_, row) =>
            Array.from({ length: capsule.projection.bounds.columns }, (_, column) => ({ column, row })))
            .flat()
            .some((cell) =>
              Math.max(Math.abs(cell.column - actor.position.column), Math.abs(cell.row - actor.position.row)) === 1 &&
              !blocked.some((candidate) => candidate.column === cell.column && candidate.row === cell.row) &&
              !capsule.projection.combatants.some((candidate) =>
                candidate.id !== actor.id && candidate.life !== 'dead' &&
                candidate.position.column === cell.column && candidate.position.row === cell.row));
          expect(holdAndDodge, `${String(seed)} ${play.name} ${String(actor.id)}`).toBe(!openAdjacentCell);
        }
      }
    }
  });

  it('advances at full normal speed with a defensive posture when no attack is reachable after Dash', async () => {
    for (let seed = 3_943_001; seed <= 3_943_012; seed += 1) {
      const { capsule } = await registryFixture(seed);
      const actors = capsule.projection.combatants.filter((actor) =>
        capsule.request?.actors.includes(actor.id) === true && actor.life !== 'dead');
      const targets = capsule.projection.combatants.filter((target) =>
        target.life !== 'dead' && target.side !== actors[0]?.side);
      for (const play of SNIPPET_REGISTRY.applicable(capsule).filter((candidate) =>
        candidate.name !== 'remove_obstacle')) {
        const intents = SNIPPET_REGISTRY.expand(play.name, capsule).intents;
        for (const actor of actors) {
          const attackIds = new Set(actor.actions.filter((action) => action.kind === 'attack').map((action) => action.actionId));
          const canAttackAfterDash = actor.actionApproaches.some((approach) =>
            targets.some((target) => target.id === approach.targetId) &&
            attackIds.has(approach.actionId) && approach.minimumMovementFeet !== null &&
            approach.minimumMovementFeet <= actor.speedFeet * 2);
          if (canAttackAfterDash) continue;
          const intent = intents.find((candidate) => candidate.actorId === actor.id);
          expect(intent, `${String(seed)} ${play.name} ${String(actor.id)}`).toMatchObject({
            choice: { kind: 'dash' },
            movement: {
              willingness: 'freely',
              maximumFeet: actor.speedFeet,
              opportunityRisk: 'avoid',
            },
            engagement: { stance: 'close_to_melee' },
            fallback: { choice: { kind: 'dodge' } },
          });
        }
      }
    }
  });

  it('does not offer fallback-bearing plays during a correction request', async () => {
    const { capsule } = await registryFixture(3_943_001);
    if (capsule.request === null) throw new TypeError('Fixture request is absent.');
    const correction = withProjection(createEngineStateCapsule({
      runId: capsule.runId,
      branchId: capsule.branchId,
      revision: capsule.revision + 1,
      generatedAt: capsule.generatedAt,
      request: { ...capsule.request, phase: 'correction', correctionNumber: 1 },
      projection: capsule.projection,
      historyDelta: capsule.historyDelta,
      rulesIndex: capsule.rulesIndex,
    }), capsule.projection);
    expect(SNIPPET_REGISTRY.applicable(correction)).toEqual([]);
  });

  it('gives every initial frozen-basis draft a schema-valid, independently legal fallback', { timeout: 60_000 }, async () => {
    const legalityByBranch = new Map<string, boolean>();
    for (let seed = 3_943_001; seed <= 3_943_012; seed += 1) {
      const { state, capsule } = await registryFixture(seed);
      for (const play of SNIPPET_REGISTRY.applicable(capsule)) {
        for (const intent of SNIPPET_REGISTRY.expand(play.name, capsule).intents) {
          expect(intent.fallback, `${String(seed)} ${play.name} ${String(intent.actorId)}`).not.toBeNull();
          if (intent.fallback === null) throw new Error('Initial play fallback is absent.');
          expect(schemaViolations(engineSchemaInternals.turnIntent, externalIntent(intent))).toEqual([]);
          const fallbackIntent = { actorId: intent.actorId, ...intent.fallback, fallback: null };
          const key = `${String(seed)}:${JSON.stringify(fallbackIntent)}`;
          const legal = legalityByBranch.get(key) ?? pureIntentResolver.resolve(state, fallbackIntent).valid;
          legalityByBranch.set(key, legal);
          expect(legal, `${String(seed)} ${play.name} ${String(intent.actorId)}`).toBe(true);
        }
      }
    }
  });

  it('content-addresses every play and the enabled set independently', () => {
    expect(SNIPPET_REGISTRY.plays.map((play) => play.snippetHash)).toEqual(
      SNIPPET_REGISTRY.plays.map((play) => expect.stringMatching(/^[0-9a-f]{64}$/u)),
    );
    expect(new Set(SNIPPET_REGISTRY.plays.map((play) => play.snippetHash)).size)
      .toBe(SNIPPET_REGISTRY.plays.length);
    expect(SNIPPET_REGISTRY.snippetHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(SNIPPET_REGISTRY.snippetSetHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(SNIPPET_REGISTRY.snippetHash).not.toBe(SNIPPET_REGISTRY.snippetSetHash);
  });
});
