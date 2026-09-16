import type { JsonRpcResponse, McpHandler } from '../../src/vtt/mcp/handler';
import { mcpRequestMeta } from '../../src/vtt/mcp/handler';
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../src/vtt/mcp/entrypoint';
import { renderEnginePrompt } from '../../src/vtt/mcp/engine-server';
import { encounterSessionId } from '../../src/combat/values';
import {
  DEFAULT_AI_DM_KB_ROOT,
  loadAiDmKnowledgeBase,
} from '../../src/vtt/knowledge-base-contract';
import { DEFAULT_RENDERER_PROFILE } from '../../src/vtt/renderer-profile';
import { buildOfferEnvironment } from '../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

export const LEGACY_ADVICE_ARENA_FIXTURE = 'tests/fixtures/arena-basis/seed-3943001.json' as const;

export interface LegacyAdviceProtocolSurface {
  readonly startupInstructions: string;
  readonly initialPrompt: string;
  readonly tools: string;
  readonly resources: string;
  readonly prompts: string;
  readonly context: string;
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function request(
  handler: McpHandler,
  method: string,
  params: Readonly<Record<string, unknown>>,
  id: string,
): JsonRpcResponse {
  const response = handler.handle({
    jsonrpc: '2.0',
    id,
    method,
    params: {
      ...params,
      _meta: mcpRequestMeta({ name: 'legacy-advice-invariance', version: '1.0.0' }),
    },
  });
  if (response === null || response.error !== undefined) {
    throw new Error(`Legacy advice ${method} request failed: ${JSON.stringify(response)}`);
  }
  return response;
}

function resultRecord(response: JsonRpcResponse, label: string): Readonly<Record<string, unknown>> {
  return record(response.result, `${label} result`);
}

export async function captureLegacyAdviceProtocolSurface(
  cwd: string,
): Promise<LegacyAdviceProtocolSurface> {
  const knowledgeBase = await loadAiDmKnowledgeBase(cwd, DEFAULT_AI_DM_KB_ROOT);
  const state = freshMonsterPlanningState(await loadArenaFixture(LEGACY_ADVICE_ARENA_FIXTURE));
  const runId = encounterSessionId('encounter:legacy-advice-invariance');
  const runtime = createEngineMcpRuntime(state, {
    runId,
    toolProfile: 'dm',
    rendererProfile: DEFAULT_RENDERER_PROFILE,
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  const capsule = runtime.feed.current();
  const contextResponse = request(runtime.handler, 'tools/call', {
    name: 'engine.get_turn_context',
    arguments: { run_id: runId, expected_revision: capsule.revision, scope: 'round' },
  }, 'context');
  const contextResult = resultRecord(contextResponse, 'context');
  const content = contextResult['content'];
  if (!Array.isArray(content)) throw new TypeError('Legacy context result omitted content.');
  const context = record(content[0], 'legacy context content')['text'];
  if (typeof context !== 'string') throw new TypeError('Legacy context text is absent.');

  const tools = JSON.stringify(request(runtime.handler, 'tools/list', {}, 'tools'));
  const resourcesList = request(runtime.handler, 'resources/list', {}, 'resources-list');
  const resourceResult = resultRecord(resourcesList, 'resources list');
  const resourceDescriptors = resourceResult['resources'];
  if (!Array.isArray(resourceDescriptors)) throw new TypeError('Legacy resource list is absent.');
  const resourceReads = resourceDescriptors.map((descriptorValue, index) => {
    const descriptor = record(descriptorValue, `legacy resource ${String(index + 1)}`);
    if (typeof descriptor['uri'] !== 'string') throw new TypeError('Legacy resource URI is absent.');
    return request(runtime.handler, 'resources/read', { uri: descriptor['uri'] }, `resource-${String(index + 1)}`);
  });
  const resources = JSON.stringify({
    list: resourcesList,
    templates: request(runtime.handler, 'resources/templates/list', {}, 'resource-templates'),
    reads: resourceReads,
  });

  const promptsList = request(runtime.handler, 'prompts/list', {}, 'prompts-list');
  const prompts = JSON.stringify({
    list: promptsList,
    planRound: request(runtime.handler, 'prompts/get', {
      name: 'engine.plan_round',
      arguments: {
        run_id: runId,
        expected_revision: capsule.revision,
        voice: 'terse_tactical',
      },
    }, 'prompt-plan-round'),
  });
  const initialPrompt = [
    'Call engine.get_turn_context with granularity "full" and intel_mode "full".',
    renderEnginePrompt('plan_round', capsule, { get: () => null }),
  ].join('\n\n');

  return {
    startupInstructions: knowledgeBase.startupInstructions,
    initialPrompt,
    tools,
    resources,
    prompts,
    context,
  };
}
