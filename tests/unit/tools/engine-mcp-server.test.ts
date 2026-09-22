import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { describe, expect, it } from 'vitest';
import { readFileSync } from '../../helpers/test-filesystem';
import {
  MCP_PROTOCOL_VERSION,
  MCP_STATIC_LIST_TTL_MS,
  mcpRequestMeta,
} from '../../../src/vtt/mcp/handler';
import {
  createEngineMcpRuntime,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import {
  MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION,
  renderBlindEnginePrompt,
  renderEnginePrompt,
} from '../../../src/vtt/mcp/engine-server';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import { engineDispatchId } from '../../../src/vtt/agent-session';
import {
  BlindModelIngressRecorder,
  assertNoForbiddenBlindStructure,
} from '../../../src/vtt/blind-model-ingress';
import {
  loadD569AiDmKnowledgeBase,
} from '../../../src/vtt/knowledge-base-contract';
import {
  kbSubjectSources,
  KbReadBudget,
} from '../../../src/vtt/mcp/knowledge-base';
import { BUNDLED_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { blindStatblockFacts } from '../../../src/vtt/blind-turn-context';
import { createOptionPathFixtureEncounter } from '../../fixtures/vtt-option-path-encounter';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { ENGINE_OFFER_FAMILY_POLICY_FORMAT } from '../../../src/vtt/offers/offer-codec-primitives';
import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
const POLICY_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createEngineOfferFamilyPolicy({
    format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
    helpAttack: 'enabled',
    readyAttack: 'disabled',
    unarmedControl: 'disabled',
    reposition: 'disabled',
  }),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected an object response.');
  }
  return value as Readonly<Record<string, unknown>>;
}

async function prepareMovementParityEvidence() {
  const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
  const runtime = createEngineMcpRuntime(state, {
    dmMode: 'blind',
    toolProfile: 'blind',
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  const capsule = runtime.feed.current();
  const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
  }));
  const legalMovement = record(context['legal_movement']);
  const movementActors = Array.isArray(legalMovement['actors'])
    ? legalMovement['actors'].map(record)
    : [];
  const ordinaryRequest = capsule.request;
  if (ordinaryRequest === null || ordinaryRequest.phase === 'speculative') {
    throw new Error('Expected an ordinary blind request.');
  }
  return movementActors.map((movementActor, actorIndex) => {
    const actorId = ordinaryRequest.actors[actorIndex];
    if (actorId === undefined) throw new Error('Blind movement actor order mismatch.');
    const actual = new Map((Array.isArray(movementActor['cells']) ? movementActor['cells'] : [])
      .map((cell) => record(cell))
      .map((cell) => [String(cell['label']), Number(cell['cost_feet'])] as const));
    const expected = new Map<string, number>();
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const path = OFFER_ENVIRONMENT.queries.path(state, {
          actorId,
          destination: { column, row },
          movement: 'normal',
          maximumFeet: Number(movementActor['movement_budget_feet']),
        });
        if (path.legal) expected.set(`${String(column)},${String(row)}`, path.costFeet);
      }
    }
    return { actual, expected };
  });
}

const MOVEMENT_PARITY_EVIDENCE = await prepareMovementParityEvidence().catch((error: unknown) => error);

async function prepareHardCapEvidence() {
  const state = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117002.json');
  const runtime = createEngineMcpRuntime(state, {
    dmMode: 'blind',
    toolProfile: 'blind',
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  const capsule = runtime.feed.current();
  const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
  }));
  const { semantic_board: _semanticBoard, ...base } = context;
  const facts = record(context['creature_facts']);
  const statblocks = record(facts['statblocks']);
  const actors = Array.isArray(facts['actors']) ? facts['actors'].map(record) : [];
  const compressedStatblockBytes = new TextEncoder().encode(JSON.stringify(statblocks)).byteLength;
  const fullStatblockBytes = new TextEncoder().encode(JSON.stringify(Object.fromEntries(
    Object.keys(statblocks).map((id) => {
      const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.statblock.id === id);
      if (row === undefined) throw new Error(`Missing source statblock ${id}.`);
      return [id, row.statblock] as const;
    }),
  ))).byteLength;
  return {
    baseBytes: new TextEncoder().encode(JSON.stringify(base)).byteLength,
    compressedStatblockBytes,
    fullStatblockBytes,
    guardActorReferences: actors.filter((actor) => actor['statblock_ref'] === 'statblock:guard').length,
    guardSharedBlocks: Object.keys(statblocks).filter((id) => id === 'statblock:guard').length,
    inlineStatblocks: actors.filter((actor) => Object.hasOwn(actor, 'statblock')).length,
  };
}

const HARD_CAP_EVIDENCE = await prepareHardCapEvidence().catch((error: unknown) => error);

describe('engine MCP stdio protocol', () => {
  it('places the monster-knowledge instruction exactly once on every live DM prompt surface', () => {
    const runtime = createEngineMcpRuntime(createOptionPathFixtureEncounter(), {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const capsule = runtime.feed.current();
    const rules = { get: () => null } as const;
    const prompts = [
      ['plan_round', renderEnginePrompt('plan_round', capsule, rules), 'Turn resource:'],
      ['correct_proposal', renderEnginePrompt('correct_proposal', capsule, rules), 'Turn resource:'],
      ['speculate_round', renderEnginePrompt('speculate_round', capsule, rules), 'Turn resource:'],
      ['plan_blind_round', renderBlindEnginePrompt('plan_blind_round', capsule, rules), 'Input mechanics may include'],
      ['repair_blind_intents', renderBlindEnginePrompt('repair_blind_intents', capsule, rules), 'Input mechanics may include'],
    ] as const;

    for (const [surface, prompt, boundaryPrefix] of prompts) {
      const lines = prompt.split('\n');
      const instructionIndexes = lines.flatMap((line, index) =>
        line === MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION ? [index] : []);
      const boundaryIndex = lines.findIndex((line) => line.startsWith(boundaryPrefix));
      expect(
        { instructionIndexes, boundaryIndex },
        `${surface} instruction placement`,
      ).toEqual({ instructionIndexes: [1], boundaryIndex: 2 });
    }
  });

  it('keeps healthy primary prompt and descriptor bytes equal with readiness instrumentation', () => {
    const state = createOptionPathFixtureEncounter();
    const common = {
      runId: encounterSessionId('encounter:d569-byte-equality'),
      branchId: encounterBranchId('branch:d569-byte-equality'),
      requestId: 'request:d569-byte-equality',
      phase: 'initial' as const,
      toolProfile: 'blind' as const,
      dmMode: 'blind' as const,
      offerEnvironment: OFFER_ENVIRONMENT,
    };
    const before = createEngineMcpRuntime(state, common);
    const after = createEngineMcpRuntime(state, {
      ...common,
      readinessEvidence: {
        spoolPath: '/tmp/d569-byte-equality-readiness.jsonl',
        dispatchId: engineDispatchId('engine-dispatch:byte-equality-0001'),
        phase: 'primary',
        profile: 'blind',
        requestId: common.requestId,
      },
    });
    const rules = { get: () => null } as const;
    expect(JSON.stringify(after.toolSurface.tools)).toBe(JSON.stringify(before.toolSurface.tools));
    expect(renderBlindEnginePrompt('plan_blind_round', after.feed.current(), rules))
      .toBe(renderBlindEnginePrompt('plan_blind_round', before.feed.current(), rules));
  });

  it('completes real blind proposal composition under the application policy environment', async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const actorId = state.combatants.find((entry) =>
      entry.profile.kind === 'monster' && entry.life === 'living')?.profile.id;
    if (actorId === undefined) throw new Error('Policy forwarding fixture has no monster.');
    const runtime = createEngineMcpRuntime(state, {
      dmMode: 'blind',
      toolProfile: 'blind',
      requestedActorIds: [actorId],
      offerEnvironment: POLICY_OFFER_ENVIRONMENT,
    });
    const capsule = runtime.feed.current();
    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
    }));
    const request = record(context['request']);
    const actors = Array.isArray(request['required_actors'])
      ? request['required_actors'].map(record)
      : [];
    if (actors.length !== 1) throw new Error('Policy forwarding fixture has the wrong actor count.');
    const result = runtime.toolSurface.execute('engine.submit_blind_round_intents', {
      intent_version: 'blind-round-intent-v1',
      intents: actors.map((actor) => ({
        actor: { name: actor['name'], badge: actor['badge'] },
        action: { kind: 'end' },
        reason: 'Hold the line.',
      })),
    });

    expect(result).toEqual({ status: 'accepted', attempt: 1 });
    expect(runtime.blindIntentSubmissions).toHaveLength(1);
    expect(runtime.blindIntentSubmissions[0]?.resolution.status).toBe('accepted');
    expect(runtime.proposals).toHaveLength(1);
    const stored = runtime.proposals[0];
    if (stored?.kind !== 'round_turn_proposal') throw new Error('Blind proposal was not stored as a round.');
    expect(stored.resolutions.map((entry) => entry.offerEnvironmentDigest))
      .toEqual([POLICY_OFFER_ENVIRONMENT.digest]);
  });

  it('exposes only the closed blind profile and records every simulated MCP ingress channel', async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const bundle = await loadD569AiDmKnowledgeBase(process.cwd(), 'blind');
    const recorder = new BlindModelIngressRecorder();
    recorder.record('startup', bundle.startupInstructions);
    recorder.record('initial_prompt', 'Use the complete blind facts and submit one typed intent per required badge.');
    recorder.record('retry_prompt', 'INVALID_INTENT_SHAPE');
    recorder.record('replay_history', 'Prior blind attempt rejected with INVALID_INTENT_SHAPE.');
    recorder.record('image_metadata', '{"kind":"dm_board","ordinal":1}');
    const runtime = createEngineMcpRuntime(state, {
      dmMode: 'blind',
      toolProfile: 'blind',
      blindIngressRecorder: recorder,
      kbReadBudget: new KbReadBudget(kbSubjectSources(bundle)),
      kbReadCallPhase: 'initial',
      turnContextDeltaBase: {
        revision: 1,
        context: { granularity: 'full', actors: [{ options: ['private-advice-base'] }] },
      },
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const capsule = runtime.feed.current();
    let id = 0;
    const request = (method: string, params: Readonly<Record<string, unknown>>) => {
      id += 1;
      const response = runtime.handler.handle({
        jsonrpc: '2.0',
        id,
        method,
        params: {
          ...params,
          _meta: mcpRequestMeta({ name: 'blind-vitest', version: '1.0.0' }),
        },
      });
      if (response === null || response.error !== undefined) {
        throw new Error(`Blind MCP ${method} failed: ${JSON.stringify(response)}`);
      }
      return record(response.result);
    };

    const tools = request('tools/list', {})['tools'];
    expect(Array.isArray(tools) ? tools.map((tool) => record(tool)['name']) : []).toEqual([
      'engine.get_turn_context',
      'engine.read_kb_subject',
      'engine.submit_blind_round_intents',
    ]);
    const toolDescriptors = Array.isArray(tools) ? tools.map(record) : [];
    expect(JSON.stringify(toolDescriptors)).not.toMatch(
      /query_tactical|option_id|option_ref|submit_round_proposals|validate_proposal/u,
    );

    const contextResult = request('tools/call', {
      name: 'engine.get_turn_context',
      arguments: {
        run_id: capsule.runId,
        expected_revision: capsule.revision,
        scope: 'round',
        granularity: 'full',
      },
    });
    const context = record(contextResult['structuredContent']);
    expect(context).toMatchObject({ granularity: 'full', dm_mode: 'blind' });
    const creatureFacts = record(context['creature_facts']);
    const creatureActors = Array.isArray(creatureFacts['actors'])
      ? creatureFacts['actors'].map(record)
      : [];
    const roster = Array.isArray(context['roster']) ? context['roster'].map(record) : [];
    for (const contextActor of creatureActors) {
      const display = roster.find((entry) => entry['badge'] === contextActor['badge']);
      if (display === undefined) throw new Error('Blind actor is absent from the display roster.');
      if (contextActor['side'] === 'party') {
        expect(contextActor['hp_knowledge']).toEqual({
          kind: 'displayed_band',
          band: display['hp_band'],
        });
        expect(contextActor['remaining_resources']).toBeNull();
      }
    }

    const deltaResult = request('tools/call', {
      name: 'engine.get_turn_context',
      arguments: {
        run_id: capsule.runId,
        expected_revision: capsule.revision,
        scope: 'round',
        granularity: 'turn_delta',
        since_revision: capsule.revision,
      },
    });
    expect(deltaResult['structuredContent']).toEqual({
      status: 'rejected',
      code: 'BLIND_FULL_CONTEXT_REQUIRED',
    });

    const resourcesResult = request('resources/list', {});
    const resources = Array.isArray(resourcesResult['resources'])
      ? resourcesResult['resources'].map(record)
      : [];
    expect(resources.map((resource) => resource['name'])).toEqual([
      'Current blind turn',
      'Blind round intent v1',
    ]);
    expect(JSON.stringify(resources)).not.toMatch(/room\/current|journal|turn-proposal/iu);
    expect(request('resources/templates/list', {})['resourceTemplates']).toEqual([
      expect.objectContaining({ name: 'Rule entry' }),
    ]);
    const currentUri = String(resources[0]?.['uri']);
    const schemaUri = String(resources[1]?.['uri']);
    expect(request('resources/read', { uri: currentUri })['contents']).toEqual([
      expect.objectContaining({ uri: currentUri }),
    ]);
    expect(request('resources/read', { uri: schemaUri })['contents']).toEqual([
      expect.objectContaining({ uri: schemaUri }),
    ]);

    const promptsResult = request('prompts/list', {});
    const prompts = Array.isArray(promptsResult['prompts'])
      ? promptsResult['prompts'].map(record)
      : [];
    expect(prompts.map((prompt) => prompt['name'])).toEqual([
      'engine.plan_blind_round',
      'engine.repair_blind_intents',
    ]);
    const prompt = request('prompts/get', {
      name: 'engine.plan_blind_round',
      arguments: { run_id: capsule.runId, expected_revision: capsule.revision },
    });
    expect(JSON.stringify(prompt)).toContain('Never output a path, die result, DC, damage value');
    expect(JSON.stringify(prompt)).not.toMatch(/offered|option_id|suggested_plan|top recommendation/iu);

    const kbResult = request('tools/call', {
      name: 'engine.read_kb_subject',
      arguments: { subject: 'movement' },
    });
    expect(record(kbResult['structuredContent'])).toMatchObject({
      kind: 'kb_subject',
      subject: 'movement',
    });

    const requestValue = record(context['request']);
    const requiredActors = requestValue['required_actors'];
    if (!Array.isArray(requiredActors) || requiredActors.length === 0) {
      throw new Error('Blind context omitted required actors.');
    }
    const receipt = request('tools/call', {
      name: 'engine.submit_blind_round_intents',
      arguments: {
        intent_version: 'blind-round-intent-v1',
        intents: requiredActors.map((value) => {
          const actor = record(value);
          return {
          actor: { name: actor['name'], badge: actor['badge'] },
          action: { kind: 'end' },
          reason: 'Hold the line.',
          };
        }),
      },
    });
    expect(receipt['structuredContent']).toEqual({ status: 'accepted', attempt: 1 });
    expect(runtime.blindIntentSubmissions).toHaveLength(1);
    expect(runtime.blindIntentSubmissions[0]?.resolution.status).toBe('accepted');
    expect(runtime.proposals).toEqual([
      expect.objectContaining({
        kind: 'round_turn_proposal',
        resolutions: requiredActors.map(() => expect.objectContaining({
          selectedBranch: 'primary',
          offerEnvironmentDigest: OFFER_ENVIRONMENT.digest,
        })),
      }),
    ]);

    const privateOfferIds = capsule.projection.combatants.flatMap((combatant) =>
      combatant.options.map((option) => option.optionId));
    const audit = recorder.assertSafe({
      offeredOptionIds: privateOfferIds,
      requiredText: [bundle.startupInstructions.slice(0, 80), 'armorClass', 'cost_feet'],
    });
    expect(audit).toMatchObject({ passed: true });
    expect(new Set(recorder.records().map((entry) => entry.channel))).toEqual(new Set([
      'startup', 'initial_prompt', 'retry_prompt', 'replay_history', 'image_metadata',
      'tools_list', 'tool_result', 'turn_context', 'resources_list', 'resource_templates',
      'resource_read', 'prompts_list', 'prompt_get', 'kb_read',
    ]));
  });

  it('uses canonical same-revision paths for every legal destination and cost', () => {
    if (!Array.isArray(MOVEMENT_PARITY_EVIDENCE)) throw MOVEMENT_PARITY_EVIDENCE;
    expect(MOVEMENT_PARITY_EVIDENCE.length).toBeGreaterThan(0);
    for (const evidence of MOVEMENT_PARITY_EVIDENCE) {
      expect(evidence.actual).toEqual(evidence.expected);
    }
  });

  it('bounds one-to-three blind attempts under one absolute live deadline and never stages a fallback', { timeout: 15_000 }, async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const actorId = state.combatants.find((entry) => entry.profile.kind === 'monster' && entry.life === 'living')?.profile.id;
    if (actorId === undefined) throw new Error('Blind attempt fixture has no monster.');
    for (const maximum of [1, 2, 3] as const) {
      let now = 10_000;
      const runtime = createEngineMcpRuntime(state, {
        dmMode: 'blind', toolProfile: 'blind', blindMaxAttempts: maximum,
        blindDeadlineUnixMs: 20_000, clock: () => now,
        requestedActorIds: [actorId],
        offerEnvironment: OFFER_ENVIRONMENT,
      });
      const capsule = runtime.feed.current();
      const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
        run_id: capsule.runId, expected_revision: capsule.revision, scope: 'round',
      }));
      const requestValue = record(context['request']);
      const actors = Array.isArray(requestValue['required_actors'])
        ? requestValue['required_actors'].map(record)
        : [];
      const argumentsValue = {
        intent_version: 'blind-round-intent-v1',
        intents: actors.map((actor) => ({
          actor: { name: actor['name'], badge: actor['badge'] },
          action: { kind: 'help' },
          reason: 'Support an ally.',
        })),
      };
      for (let attempt = 1; attempt <= maximum; attempt += 1) {
        expect(runtime.toolSurface.execute('engine.submit_blind_round_intents', argumentsValue))
          .toEqual(expect.objectContaining({ status: 'rejected', attempt }));
        now += 1;
      }
      expect(() => runtime.toolSurface.execute('engine.submit_blind_round_intents', argumentsValue))
        .toThrow('BLIND_MAX_ATTEMPTS_EXCEEDED');
      expect(runtime.blindIntentSubmissions).toHaveLength(maximum);
      expect(runtime.proposals).toEqual([]);
    }

    let now = 30_000;
    const deadlineRuntime = createEngineMcpRuntime(state, {
      dmMode: 'blind', toolProfile: 'blind', blindMaxAttempts: 3,
      blindDeadlineUnixMs: 30_002, clock: () => now,
      requestedActorIds: [actorId],
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const capsule = deadlineRuntime.feed.current();
    const context = record(deadlineRuntime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId, expected_revision: capsule.revision, scope: 'round',
    }));
    const requestValue = record(context['request']);
    const actors = Array.isArray(requestValue['required_actors'])
      ? requestValue['required_actors'].map(record)
      : [];
    const rejectedArguments = {
      intent_version: 'blind-round-intent-v1',
      intents: actors.map((actor) => ({
        actor: { name: actor['name'], badge: actor['badge'] },
        action: { kind: 'ready' },
        reason: 'Wait for an opening.',
      })),
    };
    expect(deadlineRuntime.toolSurface.execute('engine.submit_blind_round_intents', {
      intent_version: 'blind-round-intent-v1',
      intents: [{
        actor: { name: actors[0]?.['name'], badge: actors[0]?.['badge'] },
        action: { kind: 'dodge' }, damage: '2d6',
      }],
    })).toEqual({ status: 'rejected', attempt: 1, codes: ['INVALID_INTENT_SHAPE'] });
    now += 1;
    expect(deadlineRuntime.toolSurface.execute('engine.submit_blind_round_intents', rejectedArguments))
      .toEqual(expect.objectContaining({ status: 'rejected', attempt: 2 }));
    now = 30_002;
    expect(() => deadlineRuntime.toolSurface.execute('engine.submit_blind_round_intents', rejectedArguments))
      .toThrow('BLIND_INTENT_DEADLINE_EXCEEDED');
    expect(deadlineRuntime.blindIntentSubmissions).toHaveLength(2);
    expect(deadlineRuntime.proposals).toEqual([]);
  });

  it('returns only one lexical minimal hint and refuses a mid-resolution revision change without staging', { timeout: 15_000 }, async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const actorId = state.combatants.find((entry) => entry.profile.kind === 'monster' && entry.life === 'living')?.profile.id;
    if (actorId === undefined) throw new Error('Blind repair fixture has no monster.');
    const hinted = createEngineMcpRuntime(state, {
      dmMode: 'blind', toolProfile: 'blind', blindRepairArm: 'minimal_legal_alternative',
      requestedActorIds: [actorId],
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const hintedCapsule = hinted.feed.current();
    const hintedContext = record(hinted.toolSurface.execute('engine.get_turn_context', {
      run_id: hintedCapsule.runId, expected_revision: hintedCapsule.revision, scope: 'round',
    }));
    const actors = Array.isArray(record(hintedContext['request'])['required_actors'])
      ? (record(hintedContext['request'])['required_actors'] as readonly unknown[]).map(record)
      : [];
    const rejected = record(hinted.toolSurface.execute('engine.submit_blind_round_intents', {
      intent_version: 'blind-round-intent-v1',
      intents: actors.map((actor) => ({
        actor: { name: actor['name'], badge: actor['badge'] },
        action: { kind: 'help' }, reason: 'Support an ally.',
      })),
    }));
    expect(rejected).toEqual({
      status: 'rejected', attempt: 1,
      actor: { name: actors[0]?.['name'], badge: actors[0]?.['badge'] },
      codes: ['ACTION_UNAVAILABLE'],
      legal_alternative: expect.objectContaining({ action_kind: expect.any(String) }),
    });
    expect(Object.keys(record(rejected['legal_alternative']))).toEqual(
      expect.arrayContaining(['action_kind']),
    );
    expect(JSON.stringify(rejected)).not.toMatch(/option:|path|score|rank|damage/iu);

    let changedRuntime: ReturnType<typeof createEngineMcpRuntime> | null = null;
    const changing = createEngineMcpRuntime(state, {
      dmMode: 'blind', toolProfile: 'blind',
      requestedActorIds: [actorId],
      offerEnvironment: OFFER_ENVIRONMENT,
      beforeBlindIntentStage: () => {
        const replacement = createEngineMcpRuntime(state, {
          dmMode: 'blind', toolProfile: 'blind', revision: 2, requestedActorIds: [actorId],
          offerEnvironment: OFFER_ENVIRONMENT,
        }).feed.current();
        changedRuntime?.feed.replace(replacement);
      },
    });
    changedRuntime = changing;
    const changingCapsule = changing.feed.current();
    const changingContext = record(changing.toolSurface.execute('engine.get_turn_context', {
      run_id: changingCapsule.runId, expected_revision: changingCapsule.revision, scope: 'round',
    }));
    const changingActors = Array.isArray(record(changingContext['request'])['required_actors'])
      ? (record(changingContext['request'])['required_actors'] as readonly unknown[]).map(record)
      : [];
    expect(changing.toolSurface.execute('engine.submit_blind_round_intents', {
      intent_version: 'blind-round-intent-v1',
      intents: changingActors.map((actor) => ({
        actor: { name: actor['name'], badge: actor['badge'] },
        action: { kind: 'end' }, reason: 'Hold the line.',
      })),
    })).toEqual({ status: 'rejected', attempt: 1, codes: ['STALE_REVISION'] });
    expect(changing.proposals).toEqual([]);
  });

  it('copies sourced attack to-hit and spell save DC values instead of deriving them', () => {
    const priest = BUNDLED_MONSTER_ROSTER.find((row) => row.statblock.id === 'statblock:priest');
    if (priest === undefined) throw new Error('Priest statblock missing.');
    const facts = record(blindStatblockFacts(priest.statblock));
    const block = record(facts['statblock']);
    const sourceActions = priest.statblock.sourceDetails.actions;
    if (sourceActions.kind !== 'present') throw new Error('Priest sourced actions missing.');
    const sourceSpellcasting = sourceActions.value.find((action) => action.kind === 'spellcasting');
    const sourceAttack = sourceActions.value.find((action) => action.kind === 'attack');
    if (sourceAttack === undefined || sourceSpellcasting === undefined || sourceSpellcasting.saveDc.kind !== 'present') {
      throw new Error('Priest sourced attack or spell save DC missing.');
    }
    const attack = Array.isArray(block['attacks'])
      ? block['attacks'].map(record).find((action) => action['id'] === sourceAttack.id)
      : undefined;
    const spellcasting = Array.isArray(block['spellcasting'])
      ? block['spellcasting'].map(record).find((action) => action['id'] === sourceSpellcasting.id)
      : undefined;

    expect(attack?.['attack_bonus']).toBe(sourceAttack.attackBonus);
    expect(spellcasting?.['save_dc']).toBe(sourceSpellcasting.saveDc.value);
  });

  it('keeps provenance.designNote flavor out of the mechanical statblock', () => {
    const homebrew = BUNDLED_MONSTER_ROSTER.find(
      (row) => row.statblock.id === 'statblock:homebrew-beast/brush-bear',
    );
    if (homebrew === undefined || homebrew.statblock.provenance.kind !== 'original_homebrew') {
      throw new Error('Brush Bear original-homebrew fixture missing.');
    }
    const projected = blindStatblockFacts(homebrew.statblock).statblock;

    expect(projected).not.toHaveProperty('provenance');
    expect(JSON.stringify(projected)).not.toContain(homebrew.statblock.provenance.designNote);
  });

  it('stores one shared Guard block for three actor references', () => {
    if (HARD_CAP_EVIDENCE instanceof Error) throw HARD_CAP_EVIDENCE;
    const evidence = record(HARD_CAP_EVIDENCE);
    expect(evidence['guardActorReferences']).toBe(3);
    expect(evidence['guardSharedBlocks']).toBe(1);
    expect(evidence['inlineStatblocks']).toBe(0);
  });

  it('compresses complete seven-monster statblocks while retaining the protected full context', () => {
    if (HARD_CAP_EVIDENCE instanceof Error) throw HARD_CAP_EVIDENCE;
    const evidence = record(HARD_CAP_EVIDENCE);
    const compressed = evidence['compressedStatblockBytes'];
    const full = evidence['fullStatblockBytes'];
    const base = evidence['baseBytes'];
    if (typeof compressed !== 'number' || typeof full !== 'number' || typeof base !== 'number') {
      throw new TypeError('Hard-cap byte evidence is malformed.');
    }
    expect(compressed).toBeLessThan(full);
    expect(base).toBeLessThan(65_536);
  });

  it('allows sourced mechanics and neutral reach facts through the ingress audit', () => {
    const recorder = new BlindModelIngressRecorder();
    recorder.recordJson('turn_context', {
      statblock: {
        armorClass: 17,
        hitPoints: 38,
        attackBonus: 5,
        damage: { dice: '2d10+3', average: 14 },
        saveDc: 13,
        spellSlots: [4, 3, 2],
      },
      legal_movement: { cells: [{ label: '12,7', cost_feet: 25 }] },
    });
    recorder.record('startup', 'A rules option can be chosen by a human DM.');

    expect(recorder.assertSafe({ requiredText: ['2d10+3', 'saveDc', '12,7'] }))
      .toMatchObject({ passed: true });
  });

  it('rejects each recommendation structure independently at the ingress boundary', () => {
    for (const key of [
      'options', 'option_count', 'option_order', 'rank', 'score', 'scores', 'intel',
      'threats', 'adverts', 'plays', 'consequence_cards', 'team_plan_frontier',
      'suggested_plan', 'tactical_intel', 'opportunity_cost', 'movement_candidates',
      'top_recommendation',
    ]) {
      expect(() => assertNoForbiddenBlindStructure({ neutral_wrapper: { [key]: ['private'] } }), key)
        .toThrow('Blind structure contains recommendation fields');
      const recorder = new BlindModelIngressRecorder();
      expect(() => recorder.recordJson('tool_result', { neutral_wrapper: { [key]: ['private'] } }), key)
        .toThrow('Blind structure contains recommendation fields');
    }
  });

  it('rejects exact private option ids, advice tools, and recommendation prose in byte ingress', () => {
    for (const forbidden of [
      'option:private-current-revision',
      'engine.query_tactical_intel',
      'Top recommendation: move first.',
      'Suggested plan: focus fire.',
      'movement candidate score 9',
      'path_cells are 1,1 then 1,2',
    ]) {
      const recorder = new BlindModelIngressRecorder();
      recorder.record('retry_prompt', forbidden);
      expect(() => recorder.assertSafe({ offeredOptionIds: ['option:private-current-revision'] }), forbidden)
        .toThrow('Blind model ingress contains forbidden recommendation bytes');
    }
  });

  it('discovers, lists tools, and calls a loaded encounter tool', { timeout: 20_000 }, async () => {
    const child = spawn(process.execPath, [
      resolve('node_modules/vite-node/vite-node.mjs'),
      resolve('tools/engine-mcp-server.ts'),
      resolve('tests/fixtures/arena-basis/seed-3943001.json'),
    ], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
    const exit = new Promise<number | null>((resolvePromise, reject) => {
      child.once('error', reject);
      child.once('exit', resolvePromise);
    });
    const lines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
    const iterator = lines[Symbol.asyncIterator]();
    let id = 0;
    const request = async (method: string, params: unknown): Promise<Readonly<Record<string, unknown>>> => {
      id += 1;
      child.stdin.write(`${JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params: {
          ...record(params),
          _meta: mcpRequestMeta({ name: 'vitest', version: '1.0.0' }),
        },
      })}\n`);
      const line = await iterator.next();
      if (line.done) throw new Error('MCP server closed before responding.');
      return record(JSON.parse(line.value) as unknown);
    };

    const discovered = await request('server/discover', {});
    const listed = await request('tools/list', {});
    const called = await request('tools/call', {
      name: 'engine.get_turn_context',
      arguments: { run_id: 'encounter:engine-mcp', expected_revision: 1, scope: 'round' },
    });
    child.stdin.end();

    expect(discovered).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        resultType: 'complete',
        supportedVersions: [MCP_PROTOCOL_VERSION],
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: true, listChanged: true },
          prompts: { listChanged: true },
        },
      },
    });
    const listResult = record(listed['result']);
    expect(listResult).toMatchObject({
      resultType: 'complete',
      ttlMs: MCP_STATIC_LIST_TTL_MS,
      cacheScope: 'public',
    });
    const tools = listResult['tools'];
    expect(Array.isArray(tools) ? tools.map((tool) => record(tool)['name']) : []).toEqual([
      'engine.get_turn_context',
      'engine.query_tactical_intel',
      'engine.propose_from_play',
      'engine.load_skill',
      'engine.get_state_summary',
      'engine.get_combatant_options',
      'engine.query_path',
      'engine.query_reach',
      'engine.query_cover',
      'engine.query_visibility',
      'engine.query_dice_expectation',
      'engine.validate_proposal',
      'engine.submit_round_proposals',
      'engine.submit_plan_adjustment',
      'engine.submit_speculative_round_plan',
      'engine.submit_proposal',
      'engine.emit_narration',
      'engine.request_dm_adjudication',
    ]);
    const callResult = record(called['result']);
    expect(callResult).toMatchObject({ resultType: 'complete', isError: false });
    const structured = record(callResult['structuredContent']);
    expect(record(structured['summary'])['round']).toBe(0);
    expect(Array.isArray(structured['actors'])).toBe(true);
    expect(record((callResult['content'] as readonly unknown[])[0])['text'])
      .toBe(JSON.stringify(callResult['structuredContent']));
    expect(await exit).toBe(0);
  });

  it('negotiates the literal Claude Code initialize transcript and serves classic tools over real stdio', { timeout: 20_000 }, async () => {
    const child = spawn(process.execPath, [
      resolve('node_modules/vite-node/vite-node.mjs'),
      resolve('tools/engine-mcp-server.ts'),
      resolve('tests/fixtures/arena-basis/seed-3943001.json'),
    ], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
    const exit = new Promise<number | null>((resolvePromise, reject) => {
      child.once('error', reject);
      child.once('exit', resolvePromise);
    });
    const lines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
    const iterator = lines[Symbol.asyncIterator]();
    const nextResponse = async (): Promise<Readonly<Record<string, unknown>>> => {
      const line = await iterator.next();
      if (line.done) throw new Error('Classic MCP server closed before responding.');
      return record(JSON.parse(line.value) as unknown);
    };

    child.stdin.write(readFileSync(
      'tests/fixtures/mcp-migration/claude-code-2.1.246-initialize.json',
      'utf8',
    ));
    const initialized = await nextResponse();
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })}\n`);
    const listed = await nextResponse();
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'engine.get_turn_context',
        arguments: { run_id: 'encounter:engine-mcp', expected_revision: 1, scope: 'round' },
      },
    })}\n`);
    const called = await nextResponse();
    child.stdin.end();

    expect(initialized).toMatchObject({ id: 0, result: { protocolVersion: '2025-11-25' } });
    expect(record(listed['result'])['resultType']).toBeUndefined();
    expect(Array.isArray(record(listed['result'])['tools'])).toBe(true);
    expect(record(called['result'])).toMatchObject({ isError: false });
    expect(record(called['result'])['resultType']).toBeUndefined();
    expect(await exit).toBe(0);
  });
});
