import { describe, expect, it } from 'vitest';
import type { EngineTargetSelector } from '../../../src/vtt/engine-query-port';
import type { EngineTurnIntent } from '../../../src/vtt/intent-resolver';
import { createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
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
  return { runtime, capsule: runtime.feed.current() };
}

describe('plays v1 registry', () => {
  it('gates applicability, advertises at most three plays, and ranks them deterministically', async () => {
    const roomOne = await registryFixture(3_943_001);
    const first = SNIPPET_REGISTRY.applicable(roomOne.capsule);
    const second = SNIPPET_REGISTRY.applicable(roomOne.capsule);
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first.map((play) => play.name)).toEqual(['remove_obstacle', 'focus_fire', 'basic_advance']);
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
      name: 'remove_obstacle', seed: 3_943_006,
      expected: [
        { actor: 'combatant:generated-3943006-monster-1', action: 'use_action:web', target: 'combatant:fighter', stance: 'maintain_range' },
        { actor: 'combatant:generated-3943006-monster-2', action: 'attack:bite', target: 'combatant:fighter', stance: 'close_to_melee' },
      ],
    },
  ] as const)('pins $name against frozen arena-basis room $seed', async ({ name, seed, expected }) => {
    const { capsule } = await registryFixture(seed);
    expect(goldenSummary(SNIPPET_REGISTRY.expand(name, capsule).intents)).toEqual(expected);
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
