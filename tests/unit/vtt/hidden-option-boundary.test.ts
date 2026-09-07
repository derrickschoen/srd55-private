import { describe, expect, it } from 'vitest';
import { combatantId } from '../../../src/combat/values';
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';

const ROOM_FIVE_ARCHER = combatantId('combatant:generated-6203005-monster-4');

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

async function roomFiveBoundary(turnContextMaximumBytes?: number) {
  const state = freshMonsterPlanningState(await loadArenaFixture(
    'tests/fixtures/arena-basis-brutal/seed-6203005.json',
  ));
  const runtime = createEngineMcpRuntime(state, {
    revision: 2,
    room: 5,
    ...(turnContextMaximumBytes === undefined ? {} : { turnContextMaximumBytes }),
  });
  const capsule = runtime.feed.current();
  const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
    maximum_options_per_actor: 20,
  }), 'room-five context');
  const actors = context['actors'];
  if (!Array.isArray(actors)) throw new TypeError('Room-five actors are absent.');
  const actor = actors.map((value) => record(value, 'room-five actor'))
    .find((candidate) => candidate['actor_id'] === ROOM_FIVE_ARCHER);
  if (actor === undefined) throw new Error('Room-five archer is absent.');
  const shownValues = actor['options'];
  if (!Array.isArray(shownValues)) throw new TypeError('Room-five archer options are absent.');
  const shown = shownValues.map((value) => record(value, 'shown option'));
  const projected = capsule.projection.combatants.find((candidate) => candidate.id === ROOM_FIVE_ARCHER);
  if (projected === undefined) throw new Error('Projected room-five archer is absent.');
  const shownIds = new Set(shown.map((option) => String(option['option_id'])));
  const hidden = projected.options.filter((option) => !shownIds.has(option.optionId));
  return { runtime, capsule, context, actor, shown, hidden };
}

describe('shown-option boundary', () => {
  it('never renders a hidden room-five option id and does not steer the archer toward Dash', async () => {
    const boundary = await roomFiveBoundary();
    expect(boundary.shown).toHaveLength(2);
    expect(boundary.shown.map((option) => option['kind'])).toEqual(['attack', 'attack']);
    const hiddenKinds = boundary.hidden.map((option) =>
      option.actionSlots.find((slot) => slot.slot === 'main')?.use.kind);
    expect(hiddenKinds).toContain('dash');
    expect(boundary.actor['options_omitted_for_size']).toBe(boundary.hidden.length);
    expect(boundary.actor['options_omitted_for_size']).toBeGreaterThan(0);

    const rendered = JSON.stringify(boundary.context);
    for (const hidden of boundary.hidden) {
      // Each exact id is a plausible wrong renderer output: the pre-fix
      // opportunity block emitted a hidden executable id here.
      expect(rendered).not.toContain(hidden.optionId);
    }
    const intel = record(boundary.actor['intel'], 'room-five archer intel');
    const opportunity = record(intel['opportunity_cost'], 'room-five opportunity cost');
    expect(JSON.stringify(opportunity)).not.toContain('Dash');
    expect(boundary.shown.some((option) =>
      option['option_id'] === opportunity['engine_default_option_id'] && option['kind'] === 'attack')).toBe(true);
    expect(opportunity['dodge_option_label']).toBe('Dodge');
    expect(opportunity).not.toHaveProperty('dodge_option_id');
    expect(opportunity['better_option_id']).toBe(opportunity['engine_default_option_id']);
  });

  it('declares zero size omissions when the full room-five partition fits', async () => {
    const boundary = await roomFiveBoundary(1_000_000);
    expect(boundary.shown).toHaveLength(6);
    expect(boundary.hidden).toHaveLength(0);
    expect(boundary.actor['options_omitted_for_size']).toBe(0);
  });

  it('retains a movement or defensive choice for actors with no usable offense', async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(
      'tests/fixtures/room8-repro/seed-5117008.SIMULATED.json',
    ));
    const actorIds = [1, 2, 4, 5].map((sequence) =>
      combatantId(`combatant:generated-5117008-monster-${String(sequence)}`));
    const runtime = createEngineMcpRuntime(state, {
      revision: 203,
      room: 8,
      requestedActorIds: actorIds,
      turnContextMaximumBytes: 8_000,
    });
    const capsule = runtime.feed.current();
    for (const actorId of actorIds) {
      const projected = capsule.projection.combatants.find((actor) => actor.id === actorId);
      if (projected === undefined) throw new Error(`${actorId} is absent from the projected room.`);
      expect(projected.options.every((option) => {
        const kind = option.actionSlots.find((slot) => slot.slot === 'main')?.use.kind;
        return kind === 'dash' || kind === 'dodge' || kind === 'disengage' || kind === 'end_turn';
      })).toBe(true);
    }
    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
      granularity: 'full',
      maximum_options_per_actor: 20,
    }), 'room-eight context');
    const actors = context['actors'];
    if (!Array.isArray(actors)) throw new TypeError('Room-eight actors are absent.');
    expect(actors).toHaveLength(actorIds.length);
    for (const value of actors) {
      const actor = record(value, 'room-eight actor');
      const options = actor['options'];
      if (!Array.isArray(options)) throw new TypeError('Room-eight options are absent.');
      expect(options.length).toBeGreaterThan(0);
      expect(options.map((option) => record(option, 'room-eight option')['kind']))
        .toEqual(expect.arrayContaining([expect.stringMatching(/^(?:dash|dodge|end_turn)$/u)]));
    }
  });

  it('rejects hidden primary and fallback ids but accepts the shown partition', async () => {
    const boundary = await roomFiveBoundary();
    const request = record(boundary.context['request'], 'room-five request');
    const primary = String(boundary.shown[0]?.['option_id']);
    const fallback = String(boundary.shown[1]?.['option_id']);
    const hidden = boundary.hidden.find((option) =>
      option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dash'));
    if (hidden === undefined) throw new Error('Room-five hidden Dash is absent.');
    const validate = (primaryOptionId: string, fallbackOptionId: string) => record(
      boundary.runtime.toolSurface.execute('engine.validate_proposal', {
        state_ref: boundary.context['state_ref'],
        request_id: request['request_id'],
        phase: request['phase'],
        proposal: {
          actor_id: ROOM_FIVE_ARCHER,
          expected_revision: boundary.capsule.revision,
          primary_option_id: primaryOptionId,
          fallback_option_id: fallbackOptionId,
          reason: 'Fire the shortbow at the most vulnerable visible target.',
          override_justification: null,
        },
      }),
      'proposal validation',
    );

    expect(validate(hidden.optionId, fallback)).toMatchObject({
      valid: false,
      refusals: [{ code: 'OPTION_NOT_SHOWN' }],
    });
    expect(validate(primary, hidden.optionId)).toMatchObject({
      valid: false,
      refusals: [{ code: 'OPTION_NOT_SHOWN' }],
    });
    expect(validate(primary, fallback)).toMatchObject({ valid: true, refusals: [] });
  });
});
