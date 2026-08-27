import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { describe, expect, it } from 'vitest';

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected an object response.');
  }
  return value as Readonly<Record<string, unknown>>;
}

describe('engine MCP stdio protocol', () => {
  it('initializes, lists tools, and calls a loaded encounter tool', { timeout: 20_000 }, async () => {
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
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      const line = await iterator.next();
      if (line.done) throw new Error('MCP server closed before responding.');
      return record(JSON.parse(line.value) as unknown);
    };

    const initialized = await request('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'vitest', version: '1.0.0' },
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    const listed = await request('tools/list', {});
    const called = await request('tools/call', { name: 'state_summary', arguments: {} });
    child.stdin.end();

    expect(initialized).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: { protocolVersion: '2025-03-26' },
    });
    const tools = record(listed['result'])['tools'];
    expect(Array.isArray(tools) ? tools.map((tool) => record(tool)['name']) : []).toEqual([
      'state_summary',
      'combatant_options',
      'path_cost',
      'reach_check',
      'declare_intent',
    ]);
    const callResult = record(called['result']);
    const structured = record(callResult['structuredContent']);
    expect(structured['round']).toBe(0);
    expect(Array.isArray(structured['combatants'])).toBe(true);
    expect(await exit).toBe(0);
  });
});
