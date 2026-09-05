import { describe, expect, it } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { ENGINE_TOOL_SPECS, schemaViolations } from '../../../src/vtt/mcp/schemas';
import {
  DEFAULT_RENDERER_PROFILE,
  PLANNED_COMBINED_RENDERER_PROFILES,
  renderProseTurnContext,
  renderTurnContextProfile,
  type ProseRendererFormat,
} from '../../../src/vtt/renderer-profile';

const FIXTURE = 'tests/fixtures/arena-basis-brutal/seed-6203001.json';
const PROSE_FORMATS = ['caveman_prose', 'regular_prose'] as const;

function object(value: unknown, label = 'value'): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} is not an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function values(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function turnContext(
  runtime: ReturnType<typeof createEngineMcpRuntime>,
): Readonly<Record<string, unknown>> {
  const capsule = runtime.feed.current();
  return object(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
    intel_mode: 'full',
  }), 'turn context');
}

function expectFullCounterparts(context: Readonly<Record<string, unknown>>, document: string): void {
  const normalizedDocument = document.replaceAll('_', ' ');
  const stateRef = object(context['state_ref'], 'state reference');
  const request = object(context['request'], 'request');
  for (const value of [stateRef['run_id'], stateRef['state_handle'], stateRef['expected_revision'],
    request['request_id'], request['phase'], request['correction_number']]) {
    expect(document).toContain(String(value));
  }
  expect(normalizedDocument).toContain(String(request['kind']).replaceAll('_', ' '));
  for (const actorId of values(request['required_actor_ids'])) expect(document).toContain(String(actorId));
  const summary = object(context['summary'], 'summary');
  expect(document.toLowerCase()).toContain(`room ${String(summary['room'])}`);
  expect(document.toLowerCase()).toContain(`round ${String(summary['round'])}`);
  expect(document).toContain(String(summary['living_allies']));
  expect(document).toContain(String(summary['living_enemies']));
  for (const terrain of values(summary['terrain_tags'])) expect(document).toContain(String(terrain));
  for (const [key, value] of Object.entries(context)) {
    if (['granularity', 'context_trimmed', 'state_ref', 'request', 'summary', 'actors',
      'truncated', 'next_cursor', 'renderer_attribution'].includes(key) || value === undefined) continue;
    const title = ({
      recent_changes: 'recent', actor_knowledge: 'actor knowledge',
      reaction_spend_hold: 'reaction', legendary_windows: 'legendary',
      recovery_capabilities: 'recovery', search_memory: 'search', alert_state: 'alert',
      applicable_plays: 'play', applicable_skills: 'skill',
      team_plan_frontier: 'team plan',
    } as Readonly<Record<string, string>>)[key] ?? key.replaceAll('_', ' ');
    expect(document.toLowerCase()).toContain(title);
  }
  for (const actorValue of values(context['actors'])) {
    const actor = object(actorValue, 'actor');
    expect(document).toContain(String(actor['actor_id']));
    const status = object(actor['status'], 'actor status');
    expect(document).toContain(String(status['life']));
    expect(document).toContain(String(status['hit_point_band']));
    expect(document).toContain(`${String(status['movement_feet'])} ft movement`);
    for (const tag of values(status['effect_tags'])) expect(document).toContain(String(tag));
    for (const decision of values(status['pending_decision_ids'])) expect(document).toContain(String(decision));
    for (const optionValue of values(actor['options'])) {
      const option = object(optionValue, 'option');
      expect(document).toContain(`[${String(option['option_id'])}]`);
      expect(normalizedDocument).toContain(String(option['action_id']).replaceAll('_', ' '));
      if (typeof option['minimum_movement_feet'] === 'number') {
        expect(document).toContain(option['minimum_movement_feet'] === 0
          ? 'No movement needed'
          : `${String(option['minimum_movement_feet'])} ft movement`);
      }
      const expectationValue = option['expectation'];
      if (typeof expectationValue === 'object' && expectationValue !== null && !Array.isArray(expectationValue)) {
        const expectation = expectationValue as Readonly<Record<string, unknown>>;
        if (typeof expectation['outcome_probability'] === 'number') {
          expect(document).toContain(`outcome probability ${String(expectation['outcome_probability'])}`);
        }
        if (typeof expectation['critical_probability'] === 'number') {
          expect(document).toContain(`critical probability ${String(expectation['critical_probability'])}`);
        }
        if (typeof expectation['expected_value'] === 'number') {
          expect(document).toContain(`EV ${String(expectation['expected_value'])}`);
        }
      }
    }
    for (const threatValue of values(actor['threats'])) {
      const threat = object(threatValue, 'threat');
      expect(document).toContain(String(threat['source_id']));
      expect(document).toContain(`${String(threat['distance_band'])} away`);
      expect(document).toContain(threat['can_reach_now'] === true ? 'can reach now' : 'cannot reach now');
    }
    const intel = object(actor['intel'], 'intel');
    for (const rowValue of values(intel['rows'])) {
      const row = object(rowValue, 'verdict row');
      expect(document).toContain(String(row['target_id']));
      if (typeof row['distance_feet'] === 'number') expect(document).toContain(`${String(row['distance_feet'])} ft away`);
      if (row['p_hit'] !== null) expect(document).toContain(`hit chance ${String(row['p_hit'])}`);
      if (row['ev'] !== null) expect(document).toContain(`EV ${String(row['ev'])}`);
      if (typeof row['movement_need_feet'] === 'number') {
        expect(document).toContain(`${String(row['movement_need_feet'])} ft movement needed`);
      }
    }
    for (const movementValue of values(intel['movement'])) {
      const movement = object(movementValue, 'movement row');
      if (typeof movement['move_feet'] === 'number') {
        expect(document.toLowerCase()).toContain(`move ${String(movement['move_feet'])} ft`);
      }
      if (movement['opportunity_risk'] === 'none' && movement['hazard_risk'] === 'none') {
        expect(document).toContain('No opportunity or hazard risk');
      } else {
        expect(document).toContain(`Opportunity risk is ${String(movement['opportunity_risk'])}`);
        expect(document).toContain(`Hazard risk is ${String(movement['hazard_risk'])}`);
      }
      expect(document).toContain(String(movement['attack_eta']));
    }
    if (intel['opportunity_cost'] !== null) {
      const opportunity = object(intel['opportunity_cost'], 'opportunity cost');
      for (const key of ['dodge_option_id', 'engine_default_option_id', 'better_option_id', 'status']) {
        if (opportunity[key] !== undefined) expect(document).toContain(String(opportunity[key]));
      }
      if (typeof opportunity['delta'] === 'string') {
        for (const code of opportunity['delta'].match(/\b[A-Z]\d+\b/gu) ?? []) expect(document).toContain(code);
        expect(document).toContain('typed');
      }
    }
  }
}

describe('turn-context prose formats', () => {
  it('keeps the default structured rendering byte-identical', async () => {
    const loaded = await loadArenaFixture(FIXTURE);
    const state = freshMonsterPlanningState(loaded);
    const runId = encounterSessionId('encounter:prose-default-proof');
    const incumbent = turnContext(createEngineMcpRuntime(state, { runId, revision: 1 }));
    const explicit = turnContext(createEngineMcpRuntime(state, {
      runId, revision: 1, rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'structured' },
    }));
    expect(JSON.stringify(explicit)).toBe(JSON.stringify(incumbent));
    const local = { alpha: 1, actors: [] };
    expect(JSON.stringify(renderTurnContextProfile(local, DEFAULT_RENDERER_PROFILE).context))
      .toBe(JSON.stringify(local));
  });

  it.each(PROSE_FORMATS)('%s preserves every exact option id and authorizes ids extracted from prose', async (format) => {
    const loaded = await loadArenaFixture(FIXTURE);
    const state = freshMonsterPlanningState(loaded);
    const runId = encounterSessionId(`encounter:prose-round-trip:${format}`);
    const structured = turnContext(createEngineMcpRuntime(state, {
      runId, revision: 1,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'structured' },
    }));
    const proseRuntime = createEngineMcpRuntime(state, {
      runId, revision: 1,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
    });
    const prose = turnContext(proseRuntime);
    const document = String(prose['document']);
    const extracted = new Set([...document.matchAll(/\[([^\]]+)\]/gu)].map((match) => match[1]));
    const proposals = values(structured['actors']).map((actorValue) => {
      const actor = object(actorValue, 'structured actor');
      const intel = object(actor['intel'], 'structured intel');
      const opportunity = object(intel['opportunity_cost'], 'opportunity cost');
      const optionId = String(opportunity['engine_default_option_id']);
      const selectedOption = values(actor['options']).map((value) => object(value, 'advertised option'))
        .find((option) => option['option_id'] === optionId);
      if (selectedOption === undefined) throw new Error('Engine default option is not advertised.');
      const fallbackOption = values(actor['options']).map((value) => object(value, 'advertised option'))
        .find((option) => option['option_id'] !== optionId);
      if (fallbackOption === undefined) throw new Error('Independent fallback option is not advertised.');
      expect(document).toContain(optionId);
      expect(extracted.has(optionId)).toBe(true);
      expect(document).toContain(String(fallbackOption['option_id']));
      expect(extracted.has(String(fallbackOption['option_id']))).toBe(true);
      const choice = selectedOption['activation_choice'] === undefined
        ? null
        : object(selectedOption['activation_choice'], 'activation choice');
      const choiceKind = choice === null ? null : String(choice['kind']);
      const choiceValues = choice === null ? [] : values(choice['values']);
      const activationChoice = choice === null
        ? undefined
        : choiceKind === 'calm_emotions_per_target'
          ? {
              kind: choiceKind,
              selections: values(choice['target_ids']).map((targetId) => ({
                target_id: targetId,
                mode: choiceValues[0],
              })),
            }
          : { kind: choiceKind, value: choiceValues[0] };
      return {
        actor_id: actor['actor_id'],
        expected_revision: selectedOption['revision'],
        primary_option_id: optionId,
        fallback_option_id: fallbackOption['option_id'],
        reason: 'Exercise the prose-rendered option selection.',
        override_justification: null,
        ...(activationChoice === undefined ? {} : { activation_choice: activationChoice }),
      };
    });
    const request = object(prose['request'], 'prose request');
    const result = object(proseRuntime.toolSurface.execute('engine.submit_round_proposals', {
      state_ref: prose['state_ref'],
      request_id: request['request_id'],
      phase: request['phase'],
      idempotency_key: `prose-round-trip-${format}`,
      proposals,
    }), 'round submission');
    expect(result['status'], JSON.stringify(result)).toBe('proposed');
  });

  it.each(PROSE_FORMATS)('%s has a mechanical counterpart for every full-profile informative fact', async (format) => {
    const loaded = await loadArenaFixture(FIXTURE);
    const state = freshMonsterPlanningState(loaded);
    const runId = encounterSessionId(`encounter:prose-completeness:${format}`);
    const structured = turnContext(createEngineMcpRuntime(state, {
      runId, revision: 1,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'structured' },
      turnContextMaximumBytes: 10 * 1024 * 1024,
    }));
    const filtered = renderTurnContextProfile(structured, {
      ...DEFAULT_RENDERER_PROFILE, format: 'structured',
    });
    const prose = renderProseTurnContext(
      filtered.context, format, filtered.optionRefs, 10 * 1024 * 1024,
    );
    const document = String(prose.context['document']);
    expectFullCounterparts(structured, document);
  });

  it.each(PROSE_FORMATS)('%s composes with compact seams after filtering', async (format) => {
    const loaded = await loadArenaFixture(FIXTURE);
    const state = freshMonsterPlanningState(loaded);
    const runId = encounterSessionId(`encounter:prose-compose:${format}`);
    const filtered = renderTurnContextProfile(
      turnContext(createEngineMcpRuntime(state, { runId, revision: 1 })),
      { ...PLANNED_COMBINED_RENDERER_PROFILES.compact, format: 'structured' },
    );
    const expectedIds = new Set(filtered.optionRefs.values());
    const compactProse = renderProseTurnContext(
      filtered.context, format, filtered.optionRefs, 10 * 1024 * 1024,
    );
    const document = String(compactProse.context['document']);
    expect(expectedIds.size).toBeGreaterThan(0);
    for (const optionId of expectedIds) expect(document).toContain(optionId);
    expect(document).not.toContain('action slots 3');
    expect(document).not.toContain('applicable skills skill hash');
  });

  it('renders resolved last-seen knowledge as one plain sentence', async () => {
    const loaded = await loadArenaFixture(FIXTURE);
    const structured = turnContext(createEngineMcpRuntime(freshMonsterPlanningState(loaded), {
      runId: encounterSessionId('encounter:prose-last-seen'), revision: 1,
    }));
    const filtered = renderTurnContextProfile(structured, {
      ...DEFAULT_RENDERER_PROFILE, format: 'structured',
    });
    const rendered = renderProseTurnContext({
      ...filtered.context,
      actor_knowledge: {
        policy: 'actor-knowledge-v3-last-seen',
        actors: [{
          actor_id: 'combatant:observer',
          targets: [{
            kind: 'suspected',
            target_id: 'combatant:target',
            last_seen: { status: 'resolved', lastSeenPosition: { column: 2, row: 3 } },
          }],
        }],
      },
    }, 'regular_prose', filtered.optionRefs, 10 * 1024 * 1024);

    expect(String(rendered.context['document'])).toContain(
      'combatant:observer last saw combatant:target at cell (2, 3).',
    );
  });

  it.each(PROSE_FORMATS)('%s trims by relevance, preserves the K-set floor, and remains schema-valid', async (format) => {
    const loaded = await loadArenaFixture(FIXTURE);
    let evidence: { readonly preTrimBytes: number; readonly postTrimBytes: number } | undefined;
    const runtime = createEngineMcpRuntime(freshMonsterPlanningState(loaded), {
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
      turnContextMaximumBytes: 4 * 1024,
      onTurnContextRendered: (value) => { evidence = value; },
    });
    const context = turnContext(runtime);
    const document = String(context['document']);
    expect(new TextEncoder().encode(document).byteLength).toBeLessThanOrEqual(4 * 1024);
    expect(context['context_trimmed']).toBe(true);
    expect(context['truncated']).toBe(true);
    expect(evidence?.preTrimBytes).toBeGreaterThan(evidence?.postTrimBytes ?? 0);
    const fullRuntime = createEngineMcpRuntime(freshMonsterPlanningState(loaded), {
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'structured' },
    });
    const full = turnContext(fullRuntime);
    for (const actorValue of values(full['actors'])) {
      const actor = object(actorValue, 'full actor');
      const options = values(actor['options']).map((optionValue) => object(optionValue, 'floor option'));
      const intel = object(actor['intel'], 'full actor intel');
      const opportunity = object(intel['opportunity_cost'], 'full actor opportunity');
      const defaultId = String(opportunity['engine_default_option_id']);
      const alternative = options.find((option) => option['option_id'] !== defaultId);
      const floor = [defaultId, ...(alternative === undefined ? [] : [String(alternative['option_id'])])];
      for (const optionId of floor) expect(document).toContain(optionId);
    }
    const spec = ENGINE_TOOL_SPECS.find((candidate) => candidate.descriptor.name === 'engine.get_turn_context');
    if (spec === undefined) throw new Error('Turn-context tool spec is absent.');
    expect(schemaViolations(spec.output, context)).toEqual([]);
  });

  it.each(PROSE_FORMATS)('%s is byte deterministic and measures pre-trim prose bytes', async (format) => {
    const loaded = await loadArenaFixture(FIXTURE);
    const state = freshMonsterPlanningState(loaded);
    let firstEvidence: { readonly preTrimBytes: number } | undefined;
    const options = {
      runId: encounterSessionId(`encounter:prose-determinism:${format}`),
      revision: 1,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
      turnContextMaximumBytes: 32 * 1024,
    } as const;
    const first = turnContext(createEngineMcpRuntime(state, {
      ...options,
      onTurnContextRendered: (value) => { firstEvidence = value; },
    }));
    const second = turnContext(createEngineMcpRuntime(state, options));
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    const documentBytes = new TextEncoder().encode(String(first['document'])).byteLength;
    expect(firstEvidence?.preTrimBytes).toBeGreaterThanOrEqual(documentBytes);
    expect(documentBytes).toBeLessThanOrEqual(32 * 1024);
  });

  it('keeps both prose registers distinct while using the same content pipeline', async () => {
    const loaded = await loadArenaFixture(FIXTURE);
    const state = freshMonsterPlanningState(loaded);
    const render = (format: ProseRendererFormat) => turnContext(createEngineMcpRuntime(state, {
      runId: encounterSessionId('encounter:prose-registers'), revision: 1,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
      turnContextMaximumBytes: 32 * 1024,
    }));
    const caveman = String(render('caveman_prose')['document']);
    const regular = String(render('regular_prose')['document']);
    expect(caveman).not.toBe(regular);
    expect(caveman).not.toContain('Its details are');
    expect(regular).toContain('is a dash option');
  });

  it.each(PROSE_FORMATS)('%s opens tactically, keeps bookkeeping in the footer, and has clean sentences', async (format) => {
    const loaded = await loadArenaFixture(FIXTURE);
    const context = turnContext(createEngineMcpRuntime(freshMonsterPlanningState(loaded), {
      runId: encounterSessionId(`encounter:prose-style:${format}`),
      revision: 1,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
    }));
    const document = String(context['document']);
    const referenceIndex = document.lastIndexOf('Reference data');
    expect(document.startsWith('Round 0.')).toBe(true);
    expect(referenceIndex).toBeGreaterThan(document.indexOf('Actor combatant:'));
    expect(document.slice(0, referenceIndex)).not.toContain('state handle');
    expect(document.slice(0, referenceIndex)).not.toContain('request:engine-mcp');
    expect(document.slice(0, referenceIndex)).not.toMatch(/\b(?:M5|G8)\b/u);
    expect(document.slice(referenceIndex)).toContain('state handle');
    expect(document).not.toMatch(/\.{2,}/u);
    expect(document).not.toContain('hit chance unresolved');
    expect(document).not.toContain('EV unresolved');
  });
});
