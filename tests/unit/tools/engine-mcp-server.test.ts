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

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected an object response.');
  }
  return value as Readonly<Record<string, unknown>>;
}

describe('engine MCP stdio protocol', () => {
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
      'engine.propose_from_play',
      'engine.get_state_summary',
      'engine.get_combatant_options',
      'engine.query_path',
      'engine.query_reach',
      'engine.query_cover',
      'engine.query_visibility',
      'engine.query_dice_expectation',
      'engine.validate_intent',
      'engine.submit_round_intents',
      'engine.submit_speculative_round_plan',
      'engine.submit_intent',
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
