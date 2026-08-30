import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import { ENGINE_DM_TOOL_NAMES } from '../../../src/vtt/mcp/engine-server';
import { ENGINE_TOOL_SPECS } from '../../../src/vtt/mcp/schemas';
import {
  LocalOpenAiAgentSessionAdapter,
  openAiFunctionTools,
} from '../../../src/vtt/agent-adapters/local-openai';
import { parseArenaArgs, runArena } from '../../../tools/ai-dm-arena';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';

interface FakeRequest {
  readonly path: string;
  readonly headers: IncomingHttpHeaders;
  readonly body: Readonly<Record<string, unknown>>;
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function messages(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value)) throw new TypeError('messages must be an array.');
  return value.map((entry) => record(entry, 'message'));
}

async function fakeServer(
  respond: (request: FakeRequest, index: number) => { readonly status?: number; readonly body: unknown },
): Promise<{ readonly server: Server; readonly baseUrl: string; readonly requests: FakeRequest[] }> {
  const requests: FakeRequest[] = [];
  const server = createServer((request, response) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const decoded: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
      const captured = {
        path: request.url ?? '',
        headers: request.headers,
        body: record(decoded, 'request body'),
      };
      requests.push(captured);
      const result = respond(captured, requests.length - 1);
      response.statusCode = result.status ?? 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(result.body));
    })().catch((error: unknown) => {
      response.statusCode = 500;
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    });
  });
  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${String(address.port)}/v1`, requests };
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    server.close((error) => { if (error === undefined) resolvePromise(); else reject(error); });
  });
}

function enginePromptData(content: string): Readonly<Record<string, unknown>> {
  const match = /<engine-data-json>(.*)<\/engine-data-json>/su.exec(content);
  if (match?.[1] === undefined) throw new Error('Prompt omitted engine data.');
  return record(JSON.parse(match[1]) as unknown, 'engine prompt data');
}

function assistantToolCall(id: string, name: string, argumentsValue: unknown, usage: unknown): unknown {
  return {
    choices: [{
      finish_reason: 'tool_calls',
      message: {
        role: 'assistant', content: null,
        tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(argumentsValue) } }],
      },
    }],
    usage,
  };
}

describe('SIMULATED local OpenAI conversation adapter', () => {
  it('terminates the tool loop immediately after an accepted plan adjustment', async () => {
    const endpoint = await fakeServer(() => ({
      body: assistantToolCall('call-adjustment', 'engine__submit_plan_adjustment', {
        baseline_plan_hash: 'a'.repeat(64),
        updates: [],
      }, null),
    }));
    const calls: string[] = [];
    try {
      const adapter = new LocalOpenAiAgentSessionAdapter({
        baseUrl: endpoint.baseUrl,
        thinkMode: 'off',
      });
      const result = await adapter.start({
        runId: encounterSessionId('encounter:SIMULATED-adjustment'),
        prompt: 'SIMULATED adjustment prompt',
        model: 'SIMULATED-local-model',
        reasoningEffort: 'low',
        launcherToken: 'SIMULATED-adjustment-launcher',
        timeoutMs: null,
        toolSession: {
          tools: [{
            name: 'engine.submit_plan_adjustment',
            description: 'Submit a bounded adjustment.',
            inputSchema: { type: 'object', additionalProperties: false },
          }],
          execute: (name) => {
            calls.push(name);
            return { status: 'proposed', adjustment_proposal_id: 'proposal:SIMULATED-adjustment' };
          },
        },
      }, new AbortController().signal);

      expect(result.exit).toBe('completed');
      expect(calls).toEqual(['engine.submit_plan_adjustment']);
      expect(endpoint.requests).toHaveLength(1);
    } finally {
      await close(endpoint.server);
    }
  });

  it('drives a full authorized round through one context tool round and the in-process proposer', { timeout: 30_000 }, async () => {
    const endpoint = await fakeServer((request, index) => {
      const requestMessages = messages(request.body['messages']);
      if (index === 0) {
        const user = requestMessages.findLast((message) => message['role'] === 'user');
        if (typeof user?.['content'] !== 'string') throw new Error('Initial request omitted its user prompt.');
        const promptData = enginePromptData(user['content']);
        return { body: assistantToolCall('call-context', 'engine__get_turn_context', {
          run_id: promptData['run_id'],
          expected_revision: promptData['revision'],
          scope: 'round',
          granularity: 'full',
        }, {
          prompt_tokens: 11, completion_tokens: 2,
          prompt_tokens_details: { cached_tokens: 1 },
        }) };
      }
      const toolMessage = requestMessages.findLast((message) => message['role'] === 'tool');
      if (typeof toolMessage?.['content'] !== 'string') throw new Error('Follow-up omitted context tool output.');
      const context = record(JSON.parse(toolMessage['content']) as unknown, 'turn context');
      const requestValue = record(context['request'], 'turn request');
      const suggestion = record(context['suggested_plan'], 'suggested plan');
      return { body: assistantToolCall('call-submit', 'engine__submit_round_proposals', {
        state_ref: context['state_ref'],
        request_id: requestValue['request_id'],
        phase: requestValue['phase'],
        idempotency_key: 'SIMULATED-local-openai-round-submit',
        proposals: suggestion['proposals'],
      }, {
        prompt_tokens: 17, completion_tokens: 3,
        prompt_tokens_details: { cached_tokens: 2 },
        completion_tokens_details: { reasoning_tokens: 1 },
      }) };
    });
    const directory = mkdtempSync(join(tmpdir(), 'dnd-local-openai-round-'));
    try {
      const config = parseArenaArgs([
        '--rooms', '1', '--reps', '1', '--seed', '3943001',
        '--out', join(directory, 'rows.jsonl'),
        '--cli', 'local-openai', '--local-base-url', endpoint.baseUrl,
        '--local-model', 'quantized-SIMULATED', '--local-api-key', 'secret-SIMULATED',
        '--local-think', 'on',
        '--effort', 'low', '--kb', 'tests/fixtures/ai-dm-kb/k6.txt',
        '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
      ]);
      const rows = await runArena(config);

      expect(rows).toEqual([expect.objectContaining({
        cli: 'local-openai', model: 'quantized-SIMULATED', thinkMode: 'on', outcome: 'authorized',
        toolCalls: 2, callsPerRound: 1, flapRetries: 0, serviceNull: false,
        plannedBy: { model: 'quantized-SIMULATED', effort: 'low' },
        refusals: [],
        tokens: { input: 28, cachedInput: 3, output: 5, reasoning: 1 },
      })]);
      expect(endpoint.requests).toHaveLength(2);
      expect(endpoint.requests.map((request) => request.path)).toEqual([
        '/v1/chat/completions', '/v1/chat/completions',
      ]);
      expect(endpoint.requests.every((request) => request.body['model'] === 'quantized-SIMULATED')).toBe(true);
      expect(endpoint.requests.every((request) => request.body['reasoning_effort'] === 'low')).toBe(true);
      expect(endpoint.requests.every((request) => request.headers.authorization === 'Bearer secret-SIMULATED')).toBe(true);
      expect(messages(endpoint.requests[1]?.body['messages'])).toEqual(expect.arrayContaining([
        expect.objectContaining({
          role: 'system', content: readFileSync('tests/fixtures/ai-dm-kb/k6.txt', 'utf8'),
        }),
        expect.objectContaining({ role: 'assistant' }),
        expect.objectContaining({ role: 'tool', tool_call_id: 'call-context' }),
      ]));
    } finally {
      await close(endpoint.server);
    }
  });

  it('classifies a refusing local server as local_error without service-null retries', { timeout: 30_000 }, async () => {
    const endpoint = await fakeServer(() => ({ status: 503, body: { error: 'model unavailable' } }));
    const directory = mkdtempSync(join(tmpdir(), 'dnd-local-openai-error-'));
    try {
      const rows = await runArena(parseArenaArgs([
        '--rooms', '1', '--reps', '1', '--seed', '3943001',
        '--out', join(directory, 'rows.jsonl'),
        '--cli', 'local-openai', '--local-base-url', endpoint.baseUrl,
        '--local-model', 'quantized-SIMULATED', '--timeout-ms', '1000',
      ]));

      expect(endpoint.requests).toHaveLength(1);
      expect(endpoint.requests[0]?.body['reasoning_effort']).toBe('none');
      expect(rows).toEqual([expect.objectContaining({
        model: 'quantized-SIMULATED', thinkMode: 'off', outcome: 'local_error',
        callsPerRound: 1, agentDispatched: true,
        flapRetries: 0, serviceNull: false, proposalId: null,
        refusals: [expect.stringContaining('HTTP 503')],
      })]);
    } finally {
      await close(endpoint.server);
    }
  });

  it('converts exactly the pruned DM schemas to OpenAI function-calling tools', () => {
    const dmSpecs = ENGINE_TOOL_SPECS.filter((spec) =>
      (ENGINE_DM_TOOL_NAMES as readonly string[]).includes(spec.descriptor.name));
    const converted = openAiFunctionTools(dmSpecs.map((spec) => spec.descriptor));

    expect(converted.map((tool) => tool.function.name)).toEqual([
      'engine__get_turn_context',
      'engine__query_tactical_intel',
      'engine__propose_from_play',
      'engine__validate_proposal',
      'engine__submit_round_proposals',
      'engine__request_dm_adjudication',
    ]);
    expect(converted.map((tool) => tool.function.parameters))
      .toEqual(dmSpecs.map((spec) => spec.descriptor.inputSchema));
    expect(openAiFunctionTools([{
      name: 'engine.example',
      description: 'Golden schema conversion.',
      inputSchema: {
        type: 'object',
        properties: { actor_id: { type: 'string', minLength: 1 } },
        required: ['actor_id'],
        additionalProperties: false,
      },
    }])).toEqual([{
      type: 'function',
      function: {
        name: 'engine__example',
        description: 'Golden schema conversion.',
        parameters: {
          type: 'object',
          properties: { actor_id: { type: 'string', minLength: 1 } },
          required: ['actor_id'],
          additionalProperties: false,
        },
      },
    }]);
  });
});
