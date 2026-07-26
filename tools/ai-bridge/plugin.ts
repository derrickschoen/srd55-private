/**
 * The Vite plugin for the DEV-ONLY AI bridge.
 *
 * IT MUST NOT SHIP, and that is enforced four independent ways:
 *
 *   G1  vite.config.ts puts this plugin in `plugins` ONLY when
 *       `command === 'serve'`, so a production build never registers it;
 *   G2  the plugin declares `apply: 'serve'`, so registering it in a build would
 *       still do nothing;
 *   G3  the browser half is behind `import.meta.env.DEV` in src/main.ts and is
 *       dropped by dead-code elimination;
 *   G4  none of those is a proof, so `npm run build` runs
 *       tools/assert-dist-clean.mjs over dist/ and FAILS if any bridge literal
 *       is present — with a negative control proving the scan read shipped bytes.
 *
 * `tests/unit/ai-bridge/build-boundary.test.ts` pins G1–G4 at the source level,
 * in the same spirit as tests/unit/db/drizzle-is-build-time-only.test.ts.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import type { RpcErrorPayload } from '../../src/rpc/protocol';
import {
  AI_BRIDGE_CHAT_ROUTE,
  AI_BRIDGE_ROUTE_PREFIX,
  AI_BRIDGE_SESSION_ROUTE,
  AI_BRIDGE_TOKEN_META,
  type AiFrame,
} from '../../src/ui/ai-chat/protocol';
import {
  AGENT_TIMEOUT_MS,
  capStderr,
  claudeSpawnSpec,
  createClaudeStream,
  createLineSplitter,
  fakeSpawnSpec,
  type SpawnSpec,
  type StreamEvent,
} from './claude';
import { admit } from './guard';
import { assemblePrompt, validateRequest } from './prompt';

const MAX_BODY_BYTES = 1024 * 1024;

export type SpawnAgent = (spec: SpawnSpec, cwd: string) => ChildProcess;

export interface BridgeOptions {
  readonly resolvePort: () => number | null;
  readonly token: string;
  readonly spawnAgent: SpawnAgent;
  readonly spec: SpawnSpec;
  readonly timeoutMs: number;
}

export type BridgeHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void;

/**
 * `spawn` with an argv ARRAY and no shell. There is no code path anywhere in
 * this plugin that builds a command string, and `spec` is a frozen constant that
 * no request can influence.
 */
const defaultSpawnAgent: SpawnAgent = (spec, cwd) =>
  spawn(spec.bin, [...spec.argv], {
    cwd,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

export function newSessionToken(): string {
  return randomBytes(32).toString('hex');
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(null));
  });
}

function killChild(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) {
    return;
  }
  try {
    // No process group to sweep: this CLI is invoked with no tools, so it has no
    // grandchildren to orphan.
    child.kill('SIGTERM');
  } catch {
    // Already gone.
  }
}

export function createBridgeHandler(options: BridgeOptions): BridgeHandler {
  let busy = false;

  const runChat = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    const raw = await readBody(req);
    res.statusCode = 200;
    res.setHeader('content-type', 'application/x-ndjson');
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');

    let finished = false;
    // A client that walks away mid-stream must not take the dev server with it.
    res.on('error', () => {
      finished = true;
    });
    const write = (frame: AiFrame): void => {
      if (!finished) {
        res.write(`${JSON.stringify(frame)}\n`);
      }
    };
    const fail = (error: RpcErrorPayload): void => {
      write({ t: 'error', error });
      finished = true;
      res.end();
    };

    if (raw === null) {
      fail({
        code: 'invalid_request',
        message: 'request body was not readable',
      });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      fail({ code: 'invalid_request', message: 'request body was not JSON' });
      return;
    }
    const validation = validateRequest(parsed);
    if (!validation.ok) {
      fail(validation.error);
      return;
    }
    if (busy) {
      fail({ code: 'handler_error', message: 'the local agent is busy' });
      return;
    }

    busy = true;
    const cwd = mkdtempSync(join(tmpdir(), 'ai-bridge-'));
    const spec = options.spec;
    const stream = createClaudeStream();
    const split = createLineSplitter();
    let stderr = '';
    let settled = false;
    let violation: string | null = null;

    let child: ChildProcess;
    try {
      child = options.spawnAgent(spec, cwd);
    } catch (error) {
      busy = false;
      rmSync(cwd, { recursive: true, force: true });
      fail({
        code: 'handler_error',
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const settle = (error: RpcErrorPayload | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      busy = false;
      rmSync(cwd, { recursive: true, force: true });
      killChild(child);
      if (!finished) {
        if (error === null) {
          write({ t: 'done' });
        } else {
          write({ t: 'error', error });
        }
        finished = true;
        res.end();
      }
    };

    const consume = (events: readonly StreamEvent[]): void => {
      for (const event of events) {
        if (event.t === 'delta') {
          write({ t: 'delta', text: event.text });
          continue;
        }
        // A containment violation ends the run. Nothing further is emitted, and
        // the caller is told plainly rather than being handed partial output.
        violation = event.message;
        settle({ code: 'handler_error', message: event.message });
        return;
      }
    };

    const timer = setTimeout(() => {
      settle({
        code: 'handler_error',
        message: `the local agent timed out after ${Math.round(
          options.timeoutMs / 1000,
        )}s`,
      });
    }, options.timeoutMs);

    // Abort detection hangs off the RESPONSE: `req` emits 'close' as soon as its
    // body has been consumed, long before the client actually goes away.
    res.on('close', () => {
      if (!res.writableFinished && !settled) {
        finished = true;
        settle(null);
      }
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      settle({
        code: 'handler_error',
        message:
          error.code === 'ENOENT'
            ? `${spec.bin} CLI not found on PATH`
            : error.message,
      });
    });

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      for (const line of split(chunk)) {
        consume(stream.push(line));
      }
    });

    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('close', (code: number | null) => {
      // A non-zero exit is the CLI failing to run at all — a bad flag, or no
      // login. Its stderr is the useful diagnostic, and it is reported ahead of
      // the stream's closing verdict, which in that case would only be saying
      // that a process which never started emitted no init event. Containment
      // itself is enforced in `push`, which emits nothing before it has seen
      // that event, so nothing is relaxed by preferring the real error here.
      if (code !== 0 && code !== null) {
        const detail = capStderr(stderr).trim();
        settle({
          code: 'handler_error',
          message:
            detail.length > 0 ? detail : `${spec.bin} exited with code ${code}`,
        });
        return;
      }
      consume(stream.finish());
      if (violation !== null) {
        return;
      }
      settle(null);
    });

    const stdin = child.stdin;
    if (stdin !== null) {
      stdin.on('error', () => {
        // The child may exit before the prompt is fully written.
      });
      // STDIN, never argv. See prompt.ts and claude.ts.
      stdin.write(assemblePrompt(validation.request));
      stdin.end();
    }
  };

  return (req, res, next) => {
    const path = (req.url ?? '').split('?')[0] ?? '';
    if (!path.startsWith(AI_BRIDGE_ROUTE_PREFIX)) {
      next();
      return;
    }
    const verdict = admit({
      method: req.method,
      headers: req.headers,
      port: options.resolvePort(),
      token: options.token,
    });
    if (!verdict.admitted) {
      sendJson(res, verdict.status, {
        ok: false,
        error: { code: 'invalid_request', message: verdict.reason },
      });
      return;
    }
    if (path === AI_BRIDGE_SESSION_ROUTE) {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (path === AI_BRIDGE_CHAT_ROUTE) {
      void runChat(req, res);
      return;
    }
    sendJson(res, 404, {
      ok: false,
      error: { code: 'unknown_method', message: 'no such bridge route' },
    });
  };
}

export function aiBridge(): Plugin {
  // Regenerated on every dev-server start; never persisted, never logged.
  const token = newSessionToken();
  return {
    name: 'ai-bridge',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [
        {
          tag: 'meta',
          attrs: { name: AI_BRIDGE_TOKEN_META, content: token },
          injectTo: 'head' as const,
        },
      ],
    },
    configureServer(server) {
      const handler = createBridgeHandler({
        resolvePort: () => {
          const address = server.httpServer?.address();
          return address === null ||
            address === undefined ||
            typeof address === 'string'
            ? null
            : (address as AddressInfo).port;
        },
        token,
        spawnAgent: defaultSpawnAgent,
        spec:
          process.env['AI_BRIDGE_FAKE'] === '1'
            ? fakeSpawnSpec()
            : claudeSpawnSpec(),
        timeoutMs: AGENT_TIMEOUT_MS,
      });
      server.middlewares.use(handler);
    },
  };
}
