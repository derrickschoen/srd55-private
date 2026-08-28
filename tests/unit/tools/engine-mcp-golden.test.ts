import { describe, expect, it } from 'vitest';
import { runEngineMcpDryClient } from '../../../tools/engine-mcp-dry-client';
import type { DryTranscriptEntry } from '../../../tools/engine-mcp-dry-client';
import { loadArenaFixture } from '../../../tools/engine-mcp-server';

const FIXTURE = 'tests/fixtures/arena-basis/seed-3943006.json';

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Readonly<Record<string, unknown>>;
}

function decoded(value: string): Readonly<Record<string, unknown>> {
  return record(JSON.parse(value) as unknown, 'JSON');
}

function toolEntry(entries: readonly DryTranscriptEntry[], name: string, occurrence = 0): DryTranscriptEntry {
  const matches = entries.filter((entry) => {
    const request = decoded(entry.request);
    const params = record(request['params'], 'params');
    return request['method'] === 'tools/call' && params['name'] === name;
  });
  const match = matches[occurrence];
  if (match === undefined) throw new Error(`Transcript is missing ${name}.`);
  return match;
}

function structured(entry: DryTranscriptEntry): Readonly<Record<string, unknown>> {
  const response = decoded(entry.response);
  const result = record(response['result'], 'result');
  return record(result['structuredContent'], 'structured content');
}

function stateHandle(context: Readonly<Record<string, unknown>>): string {
  const value = record(context['state_ref'], 'state ref')['state_handle'];
  if (typeof value !== 'string') throw new TypeError('state_handle is missing.');
  return value;
}

describe('real-stdio engine MCP golden dungeon run', () => {
  it('covers discovery, intent correction, adjudication, narration, and restart shapes', { timeout: 30_000 }, async () => {
    const report = await runEngineMcpDryClient(FIXTURE);
    expect(report).toMatchObject({ status: 'VERIFIED', protocolConformance: 'SUBSTITUTED_LOCAL' });
    const methods = report.initial.map((entry) => decoded(entry.request)['method']);
    expect(methods).toEqual(expect.arrayContaining(['server/discover', 'tools/list', 'resources/list', 'prompts/list']));

    const pathEntry = toolEntry(report.initial, 'engine.query_path');
    const path = structured(pathEntry);
    const initialBefore = structured(toolEntry(report.initial, 'engine.get_turn_context', 0));
    const queryArguments = record(record(decoded(pathEntry.request)['params'], 'query params')['arguments'], 'query arguments');
    const actorId = queryArguments['actor_id'];
    if (typeof actorId !== 'string') throw new TypeError('query actor_id is missing.');
    const state = await loadArenaFixture(FIXTURE);
    const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
    const actorToken = state.tokens.find((token) => token.combatantId === actorId);
    const targets = state.combatants.filter((candidate) => candidate.profile.kind === 'player_character');
    const targetCells = targets.flatMap((target) => state.tokens.filter((token) => token.combatantId === target.profile.id).map((token) => token.position));
    if (actor === undefined || actorToken === undefined || targetCells.length === 0) throw new TypeError('Fixture geometry is incomplete.');
    const nearestCellDistance = Math.min(...targetCells.map((cell) => Math.max(Math.abs(cell.row - actorToken.position.row), Math.abs(cell.column - actorToken.position.column))));
    const independentlyDerivedFeet = Math.max(0, nearestCellDistance * 5 - actor.profile.rules.reach);
    const maximumFeet = record(queryArguments['movement'], 'query movement')['maximum_feet'];
    if (typeof maximumFeet !== 'number') throw new TypeError('query maximum_feet is missing.');
    expect(independentlyDerivedFeet).toBe(35);
    expect(independentlyDerivedFeet).toBeGreaterThan(maximumFeet);
    expect(path).toMatchObject({ feasible: false, minimum_feet: null, refusals: [{ code: 'OBJECTIVE_UNREACHABLE' }] });
    expect(structured(toolEntry(report.initial, 'engine.validate_intent'))).toMatchObject({ valid: true, selected_branch: 'fallback' });
    const initialAfter = structured(toolEntry(report.initial, 'engine.get_turn_context', 1));
    expect(stateHandle(initialAfter)).toBe(stateHandle(initialBefore));
    expect(structured(toolEntry(report.initial, 'engine.submit_round_intents'))).toMatchObject({ status: 'proposed' });
    expect(structured(toolEntry(report.initial, 'engine.request_dm_adjudication'))).toMatchObject({ status: 'requested' });
    expect(structured(toolEntry(report.initial, 'engine.emit_narration'))).toMatchObject({ status: 'queued' });

    expect(structured(toolEntry(report.correction, 'engine.get_turn_context'))).toMatchObject({ request: { phase: 'correction', correction_number: 1 } });
    expect(structured(toolEntry(report.correction, 'engine.submit_round_intents'))).toMatchObject({ status: 'proposed' });
    expect(structured(toolEntry(report.roomTransition, 'engine.get_turn_context'))).toMatchObject({ summary: { room: 2 } });
    expect(report.roomTransition.map((entry) => decoded(entry.request)['method'])).toContain('resources/read');
    expect(report.stderrBytes).toBeLessThanOrEqual(16 * 1024);
  });
});
