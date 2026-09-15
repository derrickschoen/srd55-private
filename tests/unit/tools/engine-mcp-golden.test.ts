import { describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync, writeFileSync } from '../../helpers/test-filesystem';
import { EngineMcpStdioClient, runEngineMcpDryClient } from '../../../tools/engine-mcp-dry-client';
import type { DryTranscriptEntry } from '../../../tools/engine-mcp-dry-client';
import {
  freshMonsterPlanningState,
  loadArenaFixture,
  projectFutureMonsterTurns,
} from '../../../src/vtt/mcp/entrypoint';
import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
import {
  engineActionRegistryForEnvironment,
} from '../../../src/vtt/engine-query-port';
import {
  createDisabledEngineOfferFamilyPolicy,
} from '../../../src/vtt/offers/offer-environment';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import * as offerEnvironmentBuilder from '../../../src/vtt/offers/build-offer-environment';
import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import {
  createEngineStateCapsuleForEnvironment,
  engineStateHandle,
  projectEngineEncounterState,
} from '../../../src/vtt/engine-state-capsule';

const FIXTURE = 'tests/fixtures/arena-basis/seed-3943006.json';
const BOUND_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});
const LEGACY_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});

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

function structuredResponse(response: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const result = record(response['result'], 'result');
  return record(result['structuredContent'], 'structured content');
}

function advertisedProposal(
  actorContext: Readonly<Record<string, unknown>>,
  revision: number,
): Readonly<Record<string, unknown>> {
  const actorId = actorContext['actor_id'];
  const optionValues = actorContext['options'];
  if (typeof actorId !== 'string' || !Array.isArray(optionValues)) {
    throw new TypeError('Golden launcher actor context is invalid.');
  }
  const options = optionValues.map((value) => record(value, 'advertised option'));
  const primary = options.find((option) => option['kind'] === 'dodge') ?? options[0];
  const fallback = options.find((option) => option['option_id'] !== primary?.['option_id']);
  if (typeof primary?.['option_id'] !== 'string') throw new TypeError(`Actor ${actorId} has no offered option.`);
  return {
    actor_id: actorId,
    expected_revision: revision,
    primary_option_id: primary['option_id'],
    fallback_option_id: typeof fallback?.['option_id'] === 'string' ? fallback['option_id'] : null,
    reason: 'Select an option advertised by the serialized-binding child.',
    override_justification: primary['kind'] === 'dodge'
      ? { kind: 'missing_metric', id: 'expected_damage_milli' }
      : null,
  };
}

function expectOfferEnvironmentIdentity(
  planningState: Parameters<typeof availableEngineActorOptions>[0],
  actorId: Parameters<typeof availableEngineActorOptions>[1],
  optionId?: string,
): void {
  const offerEnvironment = LEGACY_OFFER_ENVIRONMENT;
  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment, 1)
    .find((candidate) => optionId === undefined || candidate.optionId === optionId);
  if (option === undefined) throw new Error('Golden offer-environment probe did not find its option.');
  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
  const equalBindingEnvironment = buildOfferEnvironment({
    kind: 'binding',
    binding: offerEnvironment.binding,
  });
  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
    valid: false,
    code: 'OFFER_ENVIRONMENT_MISMATCH',
  });
}

describe('real-stdio engine MCP golden dungeon run', () => {
  it('rejects an equal-binding replacement for a stdio-shaped option', async () => {
    const planningState = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
    const boundRuntime = engineMcpEntrypoint.createEngineMcpRuntime(planningState, {
      offerEnvironment: BOUND_OFFER_ENVIRONMENT,
    });
    expect(boundRuntime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
    const actorId = planningState.combatants.find(
      (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
    )?.profile.id;
    if (actorId === undefined) throw new Error('Golden identity probe has no living monster.');
    expectOfferEnvironmentIdentity(planningState, actorId);
  });

  it('reconstructs the serialized non-legacy binding in the real MCP child', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-engine-mcp-bound-launcher-'));
    const launcherPath = join(directory, 'launcher.json');
    const proposalSpoolPath = join(directory, 'proposals.jsonl');
    const runId = encounterSessionId('encounter:golden-bound-child');
    const branchId = encounterBranchId('branch:golden-bound-child');
    const requestId = 'request:golden-bound-child';
    const revision = 1;
    const state = await loadArenaFixture(FIXTURE);
    const actors = state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life === 'living' ? [combatant.profile.id] : []);
    const planningState = projectFutureMonsterTurns(state, actors);
    const referenceCapsule = createEngineStateCapsuleForEnvironment({
      runId,
      branchId,
      revision,
      generatedAt: '2026-08-27T12:00:00.000Z',
      offerEnvironment: BOUND_OFFER_ENVIRONMENT.binding,
      request: {
        requestId,
        phase: 'initial',
        correctionNumber: 0,
        actors,
      },
      projection: projectEngineEncounterState(
        planningState,
        engineActionRegistryForEnvironment(planningState, BOUND_OFFER_ENVIRONMENT, revision),
        {
          policy: 'initiative-intel-v1',
          timeline: {
            phase: structuredClone(planningState.phase),
            round: planningState.round,
            currentCombatant: null,
            initiative: [],
            upcoming: [],
            roundBoundaries: [],
            branchPoints: [],
          },
        },
        1,
      ),
      historyDelta: [{
        revision,
        kind: 'golden_binding',
        branchStatus: 'active',
        encounterRound: planningState.round,
      }],
    });
    writeFileSync(proposalSpoolPath, '');
    writeFileSync(launcherPath, canonicalJson({
      format: 'engine-mcp-launcher-v1',
      fixturePath: FIXTURE,
      proposalSpoolPath,
      runId,
      branchId,
      revision,
      requestId,
      phase: 'initial',
      correctionNumber: 0,
      offerEnvironment: BOUND_OFFER_ENVIRONMENT.binding,
      room: 1,
      historyKind: 'golden_binding',
      requestKind: 'round_plan',
    }));
    const client = new EngineMcpStdioClient({ kind: 'launcher', launcherPath });
    try {
      const context = structuredResponse(await client.tool('engine.get_turn_context', {
        run_id: runId,
        expected_revision: revision,
        scope: 'round',
      }));
      const stateRef = record(context['state_ref'], 'state ref');
      expect(stateRef['state_handle']).toBe(engineStateHandle(referenceCapsule));
      const actorValues = context['actors'];
      if (!Array.isArray(actorValues)) throw new TypeError('Golden launcher context omitted actors.');
      const proposals = actorValues.map((value) => advertisedProposal(record(value, 'actor context'), revision));
      expect(proposals).toHaveLength(actors.length);
      expect(structuredResponse(await client.tool('engine.submit_round_proposals', {
        state_ref: stateRef,
        request_id: requestId,
        phase: 'initial',
        idempotency_key: 'golden-bound-child-submit-0001',
        proposals,
      }))).toMatchObject({ status: 'proposed' });
    } finally {
      expect(await client.close()).toBe(0);
    }
  });

  it('covers discovery, proposal correction, adjudication, narration, and restart shapes', { timeout: 30_000 }, async () => {
    const environmentConstructor = vi.spyOn(offerEnvironmentBuilder, 'buildOfferEnvironment');
    const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
    let report: Awaited<ReturnType<typeof runEngineMcpDryClient>>;
    try {
      report = await runEngineMcpDryClient(FIXTURE);
      expect(environmentConstructor).not.toHaveBeenCalled();
      expect(runtimeConstructor).not.toHaveBeenCalled();
    } finally {
      runtimeConstructor.mockRestore();
      environmentConstructor.mockRestore();
      expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
      expect(vi.isMockFunction(offerEnvironmentBuilder.buildOfferEnvironment)).toBe(false);
    }
    expect(report).toMatchObject({ status: 'VERIFIED', protocolConformance: 'SUBSTITUTED_LOCAL' });
    const methods = report.initial.map((entry) => decoded(entry.request)['method']);
    expect(methods).toEqual(expect.arrayContaining(['server/discover', 'tools/list', 'resources/list', 'prompts/list']));
    const listed = report.initial.find((entry) => decoded(entry.request)['method'] === 'tools/list');
    if (listed === undefined) throw new Error('Golden transcript omitted tools/list.');
    const listedTools = record(decoded(listed.response)['result'], 'tools/list result')['tools'];
    if (!Array.isArray(listedTools)) throw new Error('Golden tools/list omitted tools.');
    expect(listedTools.map((tool) => record(tool, 'listed tool')['name'])).toContain('engine.submit_plan_adjustment');

    const pathEntry = toolEntry(report.initial, 'engine.query_path');
    const path = structured(pathEntry);
    const initialBefore = structured(toolEntry(report.initial, 'engine.get_turn_context', 0));
    const queryArguments = record(record(decoded(pathEntry.request)['params'], 'query params')['arguments'], 'query arguments');
    const actorId = queryArguments['actor_id'];
    if (typeof actorId !== 'string') throw new TypeError('query actor_id is missing.');
    expect(actorId).toBe('combatant:generated-3943006-monster-1');
    expect(record(queryArguments['objective'], 'query objective')['action_id']).toBe('web');
    const state = await loadArenaFixture(FIXTURE);
    const planningState = freshMonsterPlanningState(state);
    const submittedRequest = decoded(toolEntry(report.initial, 'engine.submit_round_proposals').request);
    const submittedArguments = record(record(submittedRequest['params'], 'submission params')['arguments'], 'submission arguments');
    const submittedProposals = submittedArguments['proposals'];
    if (!Array.isArray(submittedProposals)) throw new TypeError('Golden submission omitted proposals.');
    const submittedProposal = submittedProposals.map((value) => record(value, 'submitted proposal'))
      .find((value) => value['actor_id'] === actorId);
    const submittedOptionId = submittedProposal?.['primary_option_id'];
    if (typeof submittedOptionId !== 'string') throw new TypeError('Golden submission omitted its primary option id.');
    expectOfferEnvironmentIdentity(
      planningState,
      actorId as Parameters<typeof availableEngineActorOptions>[1],
      submittedOptionId,
    );
    const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
    const actorToken = state.tokens.find((token) => token.combatantId === actorId);
    const targets = state.combatants.filter((candidate) => candidate.profile.kind === 'player_character');
    const targetCells = targets.flatMap((target) => state.tokens.filter((token) => token.combatantId === target.profile.id).map((token) => token.position));
    if (actor === undefined || actorToken === undefined || targetCells.length === 0) throw new TypeError('Fixture geometry is incomplete.');
    const nearestCellDistance = Math.min(...targetCells.map((cell) => Math.max(Math.abs(cell.row - actorToken.position.row), Math.abs(cell.column - actorToken.position.column))));
    // Giant Spider Web is sourced at 60 feet; its 40-foot nearest-target distance needs no movement.
    const independentlyDerivedFeet = Math.max(0, nearestCellDistance * 5 - 60);
    const maximumFeet = record(queryArguments['movement'], 'query movement')['maximum_feet'];
    if (typeof maximumFeet !== 'number') throw new TypeError('query maximum_feet is missing.');
    expect(independentlyDerivedFeet).toBe(0);
    expect(independentlyDerivedFeet).toBeLessThanOrEqual(maximumFeet);
    expect(path).toMatchObject({ feasible: true, minimum_feet: 0, refusals: [] });
    expect(structured(toolEntry(report.initial, 'engine.validate_proposal'))).toMatchObject({
      valid: false,
      selected_branch: 'none',
      refusals: [{ code: 'OPTION_NOT_SHOWN' }],
    });
    const initialAfter = structured(toolEntry(report.initial, 'engine.get_turn_context', 1));
    expect(stateHandle(initialAfter)).toBe(stateHandle(initialBefore));
    expect(structured(toolEntry(report.initial, 'engine.submit_round_proposals'))).toMatchObject({ status: 'proposed' });
    expect(structured(toolEntry(report.initial, 'engine.request_dm_adjudication'))).toMatchObject({ status: 'requested' });
    expect(structured(toolEntry(report.initial, 'engine.emit_narration'))).toMatchObject({ status: 'queued' });

    expect(structured(toolEntry(report.correction, 'engine.get_turn_context'))).toMatchObject({ request: { phase: 'correction', correction_number: 1 } });
    expect(structured(toolEntry(report.correction, 'engine.submit_round_proposals'))).toMatchObject({ status: 'proposed' });
    expect(structured(toolEntry(report.roomTransition, 'engine.get_turn_context'))).toMatchObject({ summary: { room: 2 } });
    expect(report.roomTransition.map((entry) => decoded(entry.request)['method'])).toContain('resources/read');
    expect(report.stderrBytes).toBeLessThanOrEqual(16 * 1024);
  });
});
