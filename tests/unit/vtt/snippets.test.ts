import { describe, expect, it } from 'vitest';
import { createEngineStateCapsule, type EngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
import { pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import { mcpRequestMeta } from '../../../src/vtt/mcp/handler';
import { engineSchemaInternals, schemaViolations } from '../../../src/vtt/mcp/schemas';
import { SUGGESTED_PLAN_MAX_BYTES } from '../../../src/vtt/mcp/engine-server';
import { SNIPPET_REGISTRY } from '../../../src/vtt/snippet-registry-runtime';
import type { EngineOfferableOption, EngineTurnProposal } from '../../../src/vtt/turn-proposal';

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

function externalProposal(proposal: EngineTurnProposal): Readonly<Record<string, unknown>> {
  return {
    actor_id: proposal.actorId,
    expected_revision: proposal.expectedRevision,
    primary_option_id: proposal.primaryOptionId,
    fallback_option_id: proposal.fallbackOptionId,
    override_justification: proposal.overrideJustification,
  };
}

function selectedOption(capsule: EngineStateCapsule, proposal: EngineTurnProposal): EngineOfferableOption {
  const actor = capsule.projection.combatants.find((candidate) => candidate.id === proposal.actorId);
  const option = actor?.options.find((candidate) => candidate.optionId === proposal.primaryOptionId);
  if (option === undefined) throw new Error(`Selected option ${proposal.primaryOptionId} is not projected.`);
  return option;
}

function fallbackOption(capsule: EngineStateCapsule, proposal: EngineTurnProposal): EngineOfferableOption | null {
  if (proposal.fallbackOptionId === null) return null;
  const actor = capsule.projection.combatants.find((candidate) => candidate.id === proposal.actorId);
  return actor?.options.find((candidate) => candidate.optionId === proposal.fallbackOptionId) ?? null;
}

function actionIds(option: EngineOfferableOption): readonly string[] {
  return option.actionSlots.flatMap<string>((slot) => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack':
      case 'saving_throw': return [use.actionId];
      case 'multiattack': return use.components.map((component) => component.actionId);
      case 'cast_spell': return [use.spellId];
      case 'use_world_object': return [use.actionId];
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [use.kind];
    }
  });
}

function targetIds(option: EngineOfferableOption): readonly string[] {
  return option.actionSlots.flatMap((slot) => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'multiattack': return use.components.flatMap((component) =>
        component.target.kind === 'combatant' ? [component.target.combatantId] : []);
      case 'saving_throw': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'cast_spell': return use.targets.flatMap((target) =>
        target.kind === 'combatant' ? [target.combatantId] : []);
      case 'use_world_object':
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [];
    }
  });
}

function isOffensive(option: EngineOfferableOption): boolean {
  return option.actionSlots.some((slot) =>
    slot.use.kind === 'attack' || slot.use.kind === 'multiattack' || slot.use.kind === 'saving_throw');
}

async function registryFixture(seed: number) {
  const loaded = await loadArenaFixture(`tests/fixtures/arena-basis/seed-${String(seed)}.json`);
  const state = freshMonsterPlanningState(loaded);
  const runtime = createEngineMcpRuntime(state);
  return { state, runtime, capsule: runtime.feed.current() };
}

async function controlRegistryFixture() {
  const loaded = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
  const actorId = 'combatant:generated-3943001-monster-2';
  const state = freshMonsterPlanningState({
    ...loaded,
    tokens: loaded.tokens.map((token) => token.combatantId === actorId
      ? { ...token, position: { column: 3, row: 6 } }
      : token),
  });
  const runtime = createEngineMcpRuntime(state);
  return { state, runtime, capsule: runtime.feed.current() };
}

function withProjection(capsule: EngineStateCapsule, projection: EngineStateCapsule['projection']) {
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

function chokeCapsule(capsule: EngineStateCapsule): EngineStateCapsule {
  return withProjection(capsule, {
    ...capsule.projection,
    blockedCells: [...capsule.projection.blockedCells, { column: 2, row: 6 }],
  });
}

describe('composite play registry', () => {
  it('gates applicability, advertises at most three plays, and ranks them deterministically', async () => {
    const roomOne = await registryFixture(3_943_001);
    const first = SNIPPET_REGISTRY.applicable(roomOne.capsule);
    expect(first).toEqual(SNIPPET_REGISTRY.applicable(roomOne.capsule));
    expect(first.map((play) => play.name)).toEqual(['focus_fire', 'basic_advance']);
    expect(first).toHaveLength(2);
    expect(first.every((play) => !play.description.includes('\n'))).toBe(true);

    const roomThree = await registryFixture(3_943_003);
    expect(SNIPPET_REGISTRY.applicable(roomThree.capsule).map((play) => play.name))
      .toEqual(['basic_advance']);
  });

  it('advertises the team frontier and returns a chosen composite expansion as an unqueued MCP draft', async () => {
    const { runtime, capsule } = await registryFixture(3_943_001);
    const context = tool(runtime, 'engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
    });
    const advertised = context['applicable_plays'];
    if (!Array.isArray(advertised)) throw new TypeError('Applicable plays are absent.');
    const frontier = record(context['team_plan_frontier'], 'team plan frontier');
    const frontierCandidates = frontier['candidates'];
    if (!Array.isArray(frontierCandidates)) throw new TypeError('Team frontier candidates are absent.');
    expect(frontier).toMatchObject({
      policy: 'team-scorer-v1',
      frontier_resolution: 'contains_unresolved',
      removed: [],
    });
    expect(frontierCandidates.map((entry) => record(entry, 'frontier candidate')['candidate_id']))
      .toEqual(advertised.map((entry) => record(entry, 'advertised play')['name']));
    expect(context).not.toHaveProperty('suggested_plan');

    const expected = SNIPPET_REGISTRY.expand('focus_fire', capsule);
    const draft = tool(runtime, 'engine.propose_from_play', { play_name: 'focus_fire' });
    expect(draft).toEqual({
      state_ref: context['state_ref'],
      play_name: 'focus_fire',
      play_token: expected.definition.snippetHash,
      snippet_hash: expected.definition.snippetHash,
      proposals: expected.proposals.map(externalProposal),
    });
    expect(runtime.proposals).toEqual([]);
    const proposals = draft['proposals'];
    if (!Array.isArray(proposals)) throw new TypeError('Chosen play proposals are absent.');
    expect(proposals.map((value) => schemaViolations(engineSchemaInternals.turnProposal, value)))
      .toEqual(proposals.map(() => []));
    expect(proposals.every((value) =>
      typeof record(value, 'chosen proposal')['primary_option_id'] === 'string')).toBe(true);
  });

  it('emits a size-capped inline suggestion when exactly one team play applies', async () => {
    const { runtime, capsule } = await registryFixture(3_943_003);
    const context = tool(runtime, 'engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
    });
    expect(context['applicable_plays']).toEqual([
      expect.objectContaining({ name: 'basic_advance' }),
    ]);
    const suggestion = record(context['suggested_plan'], 'single-play suggested plan');
    expect(suggestion).toMatchObject({
      play_name: 'basic_advance',
      advisory: expect.any(String),
    });
    expect(new TextEncoder().encode(JSON.stringify(suggestion)).byteLength)
      .toBeLessThanOrEqual(SUGGESTED_PLAN_MAX_BYTES);
    const proposals = suggestion['proposals'];
    if (!Array.isArray(proposals)) throw new TypeError('Suggested plan proposals are absent.');
    expect(proposals.map((value) => schemaViolations(engineSchemaInternals.turnProposal, value)))
      .toEqual(proposals.map(() => []));
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

  it('gates both advertisement and expansion to initial round-plan requests', async () => {
    const loaded = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const state = freshMonsterPlanningState(loaded);
    const actors = state.combatants
      .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
      .map((candidate) => candidate.profile.id)
      .sort();
    const runtime = createEngineMcpRuntime(state, {
      requestKind: 'plan_adjustment',
      requestedActorIds: actors,
      planAdjustment: {
        parentPlanId: 'plan:snippet-adjustment',
        baselinePlanHash: 'a'.repeat(64),
        triggerPcTurnId: 'pc-turn:snippet-adjustment',
        beforeRevision: 1,
        afterRevision: 2,
        materialityReasonCodes: ['PROPOSAL_RESOLUTION_CHANGED'],
        baselineProposalDigests: actors.map((actorId) => ({ actorId, proposalDigest: 'b'.repeat(64) })),
        adjustmentBudget: Math.min(actors.length, 2) as 1 | 2,
      },
    });
    const capsule = runtime.feed.current();
    const context = tool(runtime, 'engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
    });
    expect(context).toMatchObject({
      request: { kind: 'plan_adjustment', baseline_plan_hash: 'a'.repeat(64) },
      applicable_plays: [],
      current_plan: {
        parent_plan_id: 'plan:snippet-adjustment',
        open_actor_proposals: actors.map((actorId) => ({
          actor_id: actorId,
          proposal_digest: 'b'.repeat(64),
        })),
      },
    });
    expect(context).not.toHaveProperty('suggested_plan');
    expect(() => SNIPPET_REGISTRY.expand('focus_fire', capsule)).toThrow('PLAY_NOT_APPLICABLE');
  });

  it.each([
    { name: 'focus_fire', seed: 3_943_001, actor: 'combatant:generated-3943001-monster-1', action: 'dagger', target: 'combatant:wizard' },
    { name: 'remove_obstacle', seed: 3_943_001, actor: 'combatant:generated-3943001-monster-2', action: 'grab', target: 'combatant:wizard' },
  ] as const)('pins $name composite selection against frozen arena-basis room $seed', async ({ name, seed, actor, action, target }) => {
    const { capsule } = name === 'remove_obstacle'
      ? await controlRegistryFixture()
      : await registryFixture(seed);
    const basis = name === 'remove_obstacle' ? chokeCapsule(capsule) : capsule;
    const proposal = SNIPPET_REGISTRY.expand(name, basis).proposals.find((entry) => entry.actorId === actor);
    if (proposal === undefined) throw new Error(`Proposal for ${actor} is absent.`);
    const option = selectedOption(basis, proposal);
    expect(actionIds(option)).toContain(action);
    expect(targetIds(option)).toContain(target);
    expect(proposal.expectedRevision).toBe(option.revision);
  });

  it("pins 'basic_advance' to a complete Dash when the frozen room's melee attack cannot resolve this turn", async () => {
    const { capsule } = await registryFixture(3_943_003);
    const actor = 'combatant:generated-3943003-monster-1';
    const proposal = SNIPPET_REGISTRY.expand('basic_advance', capsule).proposals
      .find((entry) => entry.actorId === actor);
    if (proposal === undefined) throw new Error(`Proposal for ${actor} is absent.`);
    const option = selectedOption(capsule, proposal);
    expect(actionIds(option)).toEqual(['dash']);
    expect(option.movement.engagement).toEqual({
      stance: 'close_to_melee',
      anchor: { kind: 'nearest_visible_enemy' },
    });
  });

  it.each([3_943_001, 3_943_002, 3_943_004, 3_943_005, 3_943_006] as const)(
    'keeps frozen room seed %s focus-fire advancing or offensive and independently resolvable',
    async (seed) => {
      const { state, capsule } = await registryFixture(seed);
      const proposals = SNIPPET_REGISTRY.expand('focus_fire', capsule).proposals;
      expect(proposals.some((proposal) => {
        const option = selectedOption(capsule, proposal);
        return isOffensive(option) || option.actionSlots.some((slot) =>
          slot.slot === 'main' && slot.use.kind === 'dash');
      })).toBe(true);
      for (const proposal of proposals) {
        expect(pureTurnProposalResolver.resolve(state, proposal).valid).toBe(true);
      }
    },
  );

  it.each(['focus_fire', 'basic_advance'] as const)(
    'keeps every room 3943007 %s selection revision-bound to a projected option',
    async (play) => {
      const { capsule } = await registryFixture(3_943_007);
      for (const proposal of SNIPPET_REGISTRY.expand(play, capsule).proposals) {
        const option = selectedOption(capsule, proposal);
        expect(option.actorId).toBe(proposal.actorId);
        expect(option.revision).toBe(proposal.expectedRevision);
      }
    },
  );

  it('offers Dash only as a complete main-action option with double-speed movement', async () => {
    const { capsule } = await registryFixture(3_943_007);
    const requested = capsule.projection.combatants.filter((actor) =>
      capsule.request?.actors.includes(actor.id) === true);
    for (const actor of requested) {
      const dash = actor.options.find((option) => option.actionSlots.some((slot) => slot.use.kind === 'dash'));
      if (dash === undefined) throw new Error(`Dash option for ${actor.id} is absent.`);
      expect(dash.actionSlots).toEqual([{ slot: 'main', use: { kind: 'dash' } }]);
      expect(dash.movement.preference.maximumFeet).toBe(actor.speedFeet * 2);
    }
  });

  it.each([3_943_001, 3_943_002, 3_943_003, 3_943_004, 3_943_005, 3_943_006] as const)(
    'materializes every selected frozen-room option into a legal composite for seed %s',
    async (seed) => {
      const { state, capsule } = await registryFixture(seed);
      for (const proposal of SNIPPET_REGISTRY.expand('basic_advance', capsule).proposals) {
        const resolution = pureTurnProposalResolver.resolve(state, proposal);
        expect(resolution.valid).toBe(true);
        if (!resolution.valid) throw new Error('Frozen-room proposal unexpectedly refused.');
        expect(resolution.mechanics.actionSlots.length).toBeGreaterThan(0);
      }
    },
  );

  it('preserves ranged and melee engagement semantics in selected options', async () => {
    const ranged = await registryFixture(3_943_001);
    const rangedProposal = SNIPPET_REGISTRY.expand('focus_fire', ranged.capsule).proposals
      .find((proposal) => proposal.actorId === 'combatant:generated-3943001-monster-1');
    if (rangedProposal === undefined) throw new Error('Ranged proposal is absent.');
    expect(selectedOption(ranged.capsule, rangedProposal).movement.engagement.stance).toBe('maintain_range');

    const melee = await registryFixture(3_943_003);
    const meleeProposal = SNIPPET_REGISTRY.expand('basic_advance', melee.capsule).proposals[0];
    if (meleeProposal === undefined) throw new Error('Melee proposal is absent.');
    expect(selectedOption(melee.capsule, meleeProposal).movement.engagement.stance).toBe('close_to_melee');
  });

  it('resolves an in-range ranged selection with zero movement', async () => {
    const { state, capsule } = await registryFixture(3_943_001);
    const proposal = SNIPPET_REGISTRY.expand('focus_fire', capsule).proposals
      .find((entry) => entry.actorId === 'combatant:generated-3943001-monster-3');
    if (proposal === undefined) throw new Error('Longbow proposal is absent.');
    const resolved = pureTurnProposalResolver.resolve(state, proposal);
    expect(resolved.valid).toBe(true);
    if (!resolved.valid) throw new Error('Longbow proposal was refused.');
    expect(resolved.mechanics.movementCostFeet).toBe(0);
  });

  it('uses a legal alternate-target offense before Dodge as the fallback option', async () => {
    const { capsule } = await registryFixture(3_943_001);
    const proposal = SNIPPET_REGISTRY.expand('focus_fire', capsule).proposals
      .find((entry) => entry.actorId === 'combatant:generated-3943001-monster-3');
    if (proposal === undefined) throw new Error('Longbow proposal is absent.');
    const primary = selectedOption(capsule, proposal);
    const fallback = fallbackOption(capsule, proposal);
    if (fallback === null) throw new Error('Fallback option is absent.');
    expect(isOffensive(fallback)).toBe(true);
    expect(new Set(targetIds(fallback))).not.toEqual(new Set(targetIds(primary)));
  });

  it('falls through an unavailable primary option to its complete fallback option', async () => {
    const { state, capsule } = await registryFixture(3_943_001);
    const proposal = SNIPPET_REGISTRY.expand('focus_fire', capsule).proposals[0];
    if (proposal === undefined || proposal.fallbackOptionId === null) throw new Error('Fallback proposal is absent.');
    const resolved = pureTurnProposalResolver.resolve(state, {
      ...proposal,
      primaryOptionId: 'option:unavailable-primary' as EngineTurnProposal['primaryOptionId'],
    });
    expect(resolved.valid).toBe(true);
    if (!resolved.valid) throw new Error('Fallback proposal was refused.');
    expect(resolved.selectedBranch).toBe('fallback');
    expect(resolved.option.optionId).toBe(proposal.fallbackOptionId);
  });

  it('moves to use the projected control action against the blocker', async () => {
    const { capsule } = await controlRegistryFixture();
    const basis = chokeCapsule(capsule);
    const proposal = SNIPPET_REGISTRY.expand('remove_obstacle', basis).proposals
      .find((entry) => actionIds(selectedOption(basis, entry)).some((id) => /grapple|grab/iu.test(id)));
    if (proposal === undefined) throw new Error('Control proposal is absent.');
    const option = selectedOption(basis, proposal);
    expect(option.movement.engagement.stance).toBe('close_to_melee');
    expect(option.movement.preference.willingness).toBe('only_if_required');
  });

  it('requires a real projected obstacle and yields honestly without a control option', async () => {
    const { capsule } = await controlRegistryFixture();
    expect(SNIPPET_REGISTRY.applicable(capsule).map((play) => play.name)).not.toContain('remove_obstacle');
    const obstructed = chokeCapsule(capsule);
    expect(SNIPPET_REGISTRY.applicable(obstructed).map((play) => play.name)[0]).toBe('remove_obstacle');
    const withoutControl = withProjection(obstructed, {
      ...obstructed.projection,
      combatants: obstructed.projection.combatants.map((actor) => ({
        ...actor,
        options: actor.options.filter((option) =>
          !actionIds(option).some((id) => /web|grapple|grab/iu.test(id))),
      })),
    });
    expect(SNIPPET_REGISTRY.applicable(withoutControl).map((play) => play.name))
      .toEqual(['focus_fire', 'basic_advance']);
  });

  it('never drafts Dash when an offensive composite option is available', async () => {
    for (let seed = 3_943_001; seed <= 3_943_012; seed += 1) {
      const { capsule } = await registryFixture(seed);
      for (const play of SNIPPET_REGISTRY.applicable(capsule)) {
        for (const proposal of SNIPPET_REGISTRY.expand(play.name, capsule).proposals) {
          const actor = capsule.projection.combatants.find((candidate) => candidate.id === proposal.actorId);
          if (actor === undefined) throw new Error(`Actor ${proposal.actorId} is absent.`);
          if (!actor.options.some(isOffensive)) continue;
          expect(selectedOption(capsule, proposal).actionSlots.some((slot) =>
            slot.slot === 'main' && slot.use.kind === 'dash')).toBe(false);
        }
      }
    }
  });

  it('Dodges when a requested actor has neither an offensive nor an advance option', async () => {
    const { capsule } = await registryFixture(3_943_003);
    if (capsule.request === null) throw new Error('Request is absent.');
    const actorId = capsule.request.actors[0];
    const shaped = withProjection(capsule, {
      ...capsule.projection,
      combatants: capsule.projection.combatants.map((actor) => actor.id !== actorId ? actor : {
        ...actor,
        options: actor.options.filter((option) => !isOffensive(option) &&
          !option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dash')),
      }),
    });
    const proposal = SNIPPET_REGISTRY.expand('basic_advance', shaped).proposals[0];
    if (proposal === undefined) throw new Error('Defensive proposal is absent.');
    expect(actionIds(selectedOption(shaped, proposal))).toEqual(['dodge']);
  });

  it('gives every actor a distinct complete fallback in a concentrated six-unit room', async () => {
    const { capsule } = await registryFixture(3_943_005);
    const proposals = SNIPPET_REGISTRY.expand('focus_fire', capsule).proposals;
    expect(proposals).toHaveLength(6);
    for (const proposal of proposals) {
      const fallback = fallbackOption(capsule, proposal);
      expect(fallback).not.toBeNull();
      expect(fallback?.optionId).not.toBe(proposal.primaryOptionId);
      expect(fallback?.actorId).toBe(proposal.actorId);
    }
  });

  it('does not offer fallback-bearing plays during a correction request', async () => {
    const { capsule } = await registryFixture(3_943_001);
    if (capsule.request === null) throw new TypeError('Fixture request is absent.');
    const correction = createEngineStateCapsule({
      runId: capsule.runId,
      branchId: capsule.branchId,
      revision: capsule.revision + 1,
      generatedAt: capsule.generatedAt,
      request: { ...capsule.request, phase: 'correction', correctionNumber: 1 },
      projection: capsule.projection,
      historyDelta: capsule.historyDelta,
      rulesIndex: capsule.rulesIndex,
    });
    expect(SNIPPET_REGISTRY.applicable(correction)).toEqual([]);
  });

  it('gives every initial frozen-basis draft a schema-valid, independently legal fallback', { timeout: 60_000 }, async () => {
    for (let seed = 3_943_001; seed <= 3_943_012; seed += 1) {
      const { state, capsule } = await registryFixture(seed);
      for (const play of SNIPPET_REGISTRY.applicable(capsule)) {
        for (const proposal of SNIPPET_REGISTRY.expand(play.name, capsule).proposals) {
          expect(schemaViolations(engineSchemaInternals.turnProposal, externalProposal(proposal))).toEqual([]);
          if (proposal.fallbackOptionId === null) throw new Error('Initial play fallback is absent.');
          const fallbackProposal: EngineTurnProposal = {
            ...proposal,
            primaryOptionId: proposal.fallbackOptionId,
            fallbackOptionId: null,
          };
          expect(pureTurnProposalResolver.resolve(state, fallbackProposal).valid).toBe(true);
        }
      }
    }
  });

  it('content-addresses every play and the enabled set independently', () => {
    expect(SNIPPET_REGISTRY.plays.map((play) => play.snippetHash)).toEqual(
      SNIPPET_REGISTRY.plays.map(() => expect.stringMatching(/^[0-9a-f]{64}$/u)),
    );
    expect(new Set(SNIPPET_REGISTRY.plays.map((play) => play.snippetHash)).size)
      .toBe(SNIPPET_REGISTRY.plays.length);
    expect(SNIPPET_REGISTRY.snippetHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(SNIPPET_REGISTRY.snippetSetHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(SNIPPET_REGISTRY.snippetHash).not.toBe(SNIPPET_REGISTRY.snippetSetHash);
  });
});
