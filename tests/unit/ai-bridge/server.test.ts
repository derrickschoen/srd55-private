/**
 * Drives the bridge middleware over a REAL loopback HTTP server, with the child
 * process injected. That keeps the assertions about admission, streaming,
 * containment and cleanup honest — they run against actual sockets and an actual
 * `spawn`-shaped object — without needing the `claude` CLI, an account, or the
 * network.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  AGENT_REFERENCE_FORMAT,
  AGENT_REFERENCE_VERSION,
} from '../../../src/ui/screens/planner/agent-reference';
import {
  AI_BRIDGE_CHAT_ROUTE,
  AI_BRIDGE_SESSION_ROUTE,
  AI_BRIDGE_TOKEN_HEADER,
  AI_CHAT_METHOD,
  isAiFrame,
  type AiFrame,
} from '../../../src/ui/ai-chat/protocol';
import { fakeSpawnSpec, type SpawnSpec } from '../../../tools/ai-bridge/claude';
import {
  createBridgeHandler,
  newSessionToken,
  type SpawnAgent,
} from '../../../tools/ai-bridge/plugin';

const TOKEN = newSessionToken();

interface Harness {
  readonly server: Server;
  readonly origin: string;
  readonly spec: SpawnSpec;
  readonly spawns: { spec: SpawnSpec; cwd: string }[];
}

let harness: Harness;

function start(spawnAgent: SpawnAgent, timeoutMs = 10_000): Promise<Harness> {
  const spawns: { spec: SpawnSpec; cwd: string }[] = [];
  const spec = fakeSpawnSpec();
  const server = createServer();
  const handler = createBridgeHandler({
    resolvePort: () => {
      const address = server.address();
      return address === null || typeof address === 'string'
        ? null
        : (address as AddressInfo).port;
    },
    token: TOKEN,
    spawnAgent: (spec, cwd) => {
      spawns.push({ spec, cwd });
      return spawnAgent(spec, cwd);
    },
    spec,
    timeoutMs,
  });
  server.on('request', (req, res) => {
    handler(req, res, () => {
      res.statusCode = 404;
      res.end('not a bridge route');
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, origin: `http://127.0.0.1:${port}`, spec, spawns });
    });
  });
}

const realSpawn: SpawnAgent = (spec, cwd) =>
  spawn(spec.bin, [...spec.argv], {
    cwd,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

function post(
  path: string,
  body: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${harness.origin}${path}`, {
    method: 'POST',
    headers: {
      [AI_BRIDGE_TOKEN_HEADER]: TOKEN,
      origin: harness.origin,
      'content-type': 'application/json',
      ...headers,
    },
    body,
  });
}

async function frames(response: Response): Promise<AiFrame[]> {
  const text = await response.text();
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as unknown)
    .filter(isAiFrame);
}

function chatBody(
  message: string,
  reference: string | null = null,
): string {
  return JSON.stringify({
    id: 1,
    method: AI_CHAT_METHOD,
    params: { message, reference },
  });
}

afterEach(async () => {
  await new Promise<void>((resolve) => harness.server.close(() => resolve()));
});

describe('admission over a real socket', () => {
  beforeEach(async () => {
    harness = await start(realSpawn);
  });

  it('answers the probe only for a POST carrying the secret and the dev origin', async () => {
    const ok = await post(AI_BRIDGE_SESSION_ROUTE, '{}');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true });
  });

  it('never sets an Access-Control-Allow-Origin header of its own', async () => {
    const response = await post(AI_BRIDGE_SESSION_ROUTE, '{}');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('refuses a GET, a missing secret, a wrong secret and a foreign origin', async () => {
    const get = await fetch(`${harness.origin}${AI_BRIDGE_SESSION_ROUTE}`, {
      headers: { [AI_BRIDGE_TOKEN_HEADER]: TOKEN, origin: harness.origin },
    });
    expect(get.status).toBe(405);

    const noSecret = await fetch(
      `${harness.origin}${AI_BRIDGE_SESSION_ROUTE}`,
      { method: 'POST', headers: { origin: harness.origin }, body: '{}' },
    );
    expect(noSecret.status).toBe(403);

    const wrongSecret = await post(AI_BRIDGE_SESSION_ROUTE, '{}', {
      [AI_BRIDGE_TOKEN_HEADER]: newSessionToken(),
    });
    expect(wrongSecret.status).toBe(403);

    const foreign = await post(AI_BRIDGE_SESSION_ROUTE, '{}', {
      origin: 'http://evil.example',
    });
    expect(foreign.status).toBe(403);
  });

  it('passes non-bridge paths to the next middleware untouched', async () => {
    const response = await fetch(`${harness.origin}/index.html`);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('not a bridge route');
  });

  it('404s an unknown bridge route without spawning anything', async () => {
    const response = await post('/__ai/anything-else', '{}');
    expect(response.status).toBe(404);
    expect(harness.spawns).toHaveLength(0);
  });

  it('spawns nothing for a request that fails admission', async () => {
    await post(AI_BRIDGE_CHAT_ROUTE, chatBody('hello'), {
      origin: 'http://evil.example',
    });
    expect(harness.spawns).toHaveLength(0);
  });
});

describe('chat streaming', () => {
  beforeEach(async () => {
    harness = await start(realSpawn);
  });

  it('streams deltas from the agent and ends with done', async () => {
    const response = await post(AI_BRIDGE_CHAT_ROUTE, chatBody('hello there'));
    expect(response.headers.get('content-type')).toBe('application/x-ndjson');
    const received = await frames(response);
    expect(received.at(-1)).toEqual({ t: 'done' });
    const text = received
      .filter((frame) => frame.t === 'delta')
      .map((frame) => frame.text)
      .join('');
    expect(text).toContain('question=hello there');
    expect(text).toContain('has-reference=no');
  });

  it('delivers the prompt on stdin, never on argv', async () => {
    const response = await post(
      AI_BRIDGE_CHAT_ROUTE,
      chatBody('a distinctive question'),
    );
    const text = (await frames(response))
      .filter((frame) => frame.t === 'delta')
      .map((frame) => frame.text)
      .join('');
    // The stand-in reports the byte count it read from stdin and echoes the
    // question back out of it: both prove the prompt travelled there.
    expect(text).toMatch(/stdin-bytes=[1-9]\d+/);
    expect(text).toContain('question=a distinctive question');

    const spawned = harness.spawns.at(0);
    expect(spawned).toBeDefined();
    expect(spawned?.spec.argv.join(' ')).not.toContain('distinctive');
    // The spec handed to spawn is the SAME frozen object the handler was
    // configured with, so there is no per-request argv to smuggle anything into.
    expect(spawned?.spec).toBe(harness.spec);
    expect(Object.isFrozen(spawned?.spec)).toBe(true);
  });

  it('forwards a valid build reference into the prompt', async () => {
    const reference = JSON.stringify({
      format: AGENT_REFERENCE_FORMAT,
      version: AGENT_REFERENCE_VERSION,
      summary: { slot_count: 2 },
    });
    const response = await post(
      AI_BRIDGE_CHAT_ROUTE,
      chatBody('what is here?', reference),
    );
    const text = (await frames(response))
      .filter((frame) => frame.t === 'delta')
      .map((frame) => frame.text)
      .join('');
    expect(text).toContain('has-reference=yes');
  });

  it('reports a validation failure as an error frame and spawns nothing', async () => {
    const response = await post(AI_BRIDGE_CHAT_ROUTE, chatBody('   '));
    expect(await frames(response)).toEqual([
      {
        t: 'error',
        error: {
          code: 'invalid_params',
          message: expect.stringContaining('message') as unknown as string,
        },
      },
    ]);
    expect(harness.spawns).toHaveLength(0);
  });

  it('reports unparseable bodies without spawning', async () => {
    const response = await post(AI_BRIDGE_CHAT_ROUTE, 'not json');
    expect(await frames(response)).toEqual([
      {
        t: 'error',
        error: {
          code: 'invalid_request',
          message: expect.stringContaining('JSON') as unknown as string,
        },
      },
    ]);
    expect(harness.spawns).toHaveLength(0);
  });

  it('runs one agent at a time', async () => {
    const [first, second] = await Promise.all([
      post(AI_BRIDGE_CHAT_ROUTE, chatBody('first')),
      post(AI_BRIDGE_CHAT_ROUTE, chatBody('second')),
    ]);
    const results = [await frames(first), await frames(second)];
    const busy = results.filter((set) =>
      set.some(
        (frame) => frame.t === 'error' && frame.error.message.includes('busy'),
      ),
    );
    expect(busy).toHaveLength(1);
    expect(harness.spawns).toHaveLength(1);
  });

  it('removes the scratch directory it gave the agent', async () => {
    // Drained to completion: `fetch` resolves on headers, which arrive before
    // the agent has even been spawned.
    await frames(await post(AI_BRIDGE_CHAT_ROUTE, chatBody('hello')));
    const cwd = harness.spawns.at(0)?.cwd;
    expect(cwd).toBeDefined();
    const { existsSync } = await import('node:fs');
    expect(existsSync(cwd ?? '')).toBe(false);
  });
});

describe('containment failure is refused at the socket', () => {
  const uncontained = `
process.stdout.write(JSON.stringify({
  type: 'system', subtype: 'init', tools: ['Bash'], mcp_servers: [],
}) + '\\n');
process.stdout.write(JSON.stringify({
  type: 'stream_event',
  event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'SECRET' } },
}) + '\\n');
process.stdin.on('data', () => {});
process.stdin.on('end', () => process.exit(0));
`;

  beforeEach(async () => {
    harness = await start((_spec, cwd) =>
      spawn(process.execPath, ['-e', uncontained], {
        cwd,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      }),
    );
  });

  it('emits an error instead of the output when the CLI reports a tool', async () => {
    const response = await post(AI_BRIDGE_CHAT_ROUTE, chatBody('hello'));
    const received = await frames(response);
    expect(received.some((frame) => frame.t === 'delta')).toBe(false);
    expect(received.at(-1)).toMatchObject({
      t: 'error',
      error: { message: expect.stringContaining('containment failed') },
    });
    expect(JSON.stringify(received)).not.toContain('SECRET');
  });
});

describe('an agent that exits cleanly having proved nothing is refused', () => {
  beforeEach(async () => {
    harness = await start((_spec, cwd) =>
      spawn(
        process.execPath,
        [
          '-e',
          "process.stdin.on('data', () => {});" +
            "process.stdin.on('end', () => process.exit(0));",
        ],
        { cwd, shell: false, stdio: ['pipe', 'pipe', 'pipe'] },
      ),
    );
  });

  it('reports containment as unverified rather than reporting success', async () => {
    // Exit 0 with no init event is the alarming case: something ran, and this
    // bridge cannot say it was capability-free. The non-zero-exit path reports
    // the CLI's own stderr instead, and that distinction is deliberate.
    const received = await frames(
      await post(AI_BRIDGE_CHAT_ROUTE, chatBody('hello')),
    );
    expect(received).toEqual([
      {
        t: 'error',
        error: {
          code: 'handler_error',
          message: expect.stringContaining(
            'containment unverified',
          ) as unknown as string,
        },
      },
    ]);
  });
});

describe('agent failures', () => {
  it('reports a missing CLI rather than hanging', async () => {
    harness = await start((_spec, cwd) =>
      spawn('definitely-not-a-real-binary-xyzzy', [], {
        cwd,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      }),
    );
    const received = await frames(
      await post(AI_BRIDGE_CHAT_ROUTE, chatBody('hello')),
    );
    expect(received.at(-1)).toMatchObject({ t: 'error' });
  });

  it('surfaces a non-zero exit with its stderr', async () => {
    harness = await start((_spec, cwd) =>
      spawn(
        process.execPath,
        ['-e', 'process.stderr.write("boom"); process.exit(3);'],
        { cwd, shell: false, stdio: ['pipe', 'pipe', 'pipe'] },
      ),
    );
    const received = await frames(
      await post(AI_BRIDGE_CHAT_ROUTE, chatBody('hello')),
    );
    expect(received.at(-1)).toMatchObject({
      t: 'error',
      error: { message: expect.stringContaining('boom') },
    });
  });

  it('times out a silent agent and kills it', async () => {
    let child: ChildProcess | null = null;
    harness = await start((_spec, cwd) => {
      child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000);'], {
        cwd,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return child;
    }, 300);
    const received = await frames(
      await post(AI_BRIDGE_CHAT_ROUTE, chatBody('hello')),
    );
    expect(received.at(-1)).toMatchObject({
      t: 'error',
      error: { message: expect.stringContaining('timed out') },
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect((child as ChildProcess | null)?.killed).toBe(true);
  });
});
