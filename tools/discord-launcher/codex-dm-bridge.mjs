import { createServer } from 'node:http';
import { resolve } from 'node:path';
import {
  CodexCliExchange,
  FileExchangeCache,
  FileRevisionMirror,
  ProjectionReconstructor,
  ScriptedCodexExchange,
  loadTranscript,
} from './dm-bridge-lib.mjs';

const port = Number.parseInt(process.env.DM_BRIDGE_PORT ?? '43173', 10);
if (!Number.isSafeInteger(port) || port < 0 || port > 65535) throw new Error('DM_BRIDGE_PORT is invalid');
const requestTimeoutMs = Number.parseInt(process.env.DM_BRIDGE_REQUEST_TIMEOUT_MS ?? '120000', 10);
if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 1) {
  throw new Error('DM_BRIDGE_REQUEST_TIMEOUT_MS is invalid');
}
const maxBodyBytes = 16 * 1024 * 1024;
const dataDirectory = resolve(process.env.DM_BRIDGE_DATA_DIR ?? '.vtt-dm-bridge');
const mirror = new FileRevisionMirror(dataDirectory);
const projectionReconstructor = new ProjectionReconstructor();
const transcriptPath = process.env.DM_BRIDGE_TRANSCRIPT;
const rawExchange = transcriptPath === undefined
  ? new CodexCliExchange({
      cwd: process.cwd(),
      codexBin: process.env.DM_BRIDGE_CODEX_BIN ?? 'codex',
      timeoutMs: requestTimeoutMs,
    })
  : new ScriptedCodexExchange(await loadTranscript(transcriptPath));
const exchange = new FileExchangeCache(resolve(dataDirectory, 'exchange-cache'), {
  exchange: (request) => rawExchange.exchangeWithTelemetry(request),
});
const sessionExchange = new FileExchangeCache(
  resolve(dataDirectory, 'session-cache'),
  {
    exchange: async (request) => ({
      codexSessionId: transcriptPath === undefined
        ? await rawExchange.createSession(request.model)
        : process.env.DM_BRIDGE_FAKE_SESSION_ID ?? 'codex:scripted-session',
    }),
  },
);

function allowedOrigin(request) {
  const origin = request.headers.origin;
  if (origin === undefined) return null;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
      ? origin
      : false;
  } catch {
    return false;
  }
}

function json(response, status, body, origin = null) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(origin === null ? {} : { 'access-control-allow-origin': origin, vary: 'Origin' }),
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBodyBytes) throw new Error('body_too_large');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new Error('invalid_json');
  }
}

const server = createServer(async (request, response) => {
  const origin = allowedOrigin(request);
  if (origin === false) return json(response, 403, { error: 'non_local_origin' });
  if (request.method === 'OPTIONS' && request.url?.startsWith('/dm/')) {
    response.writeHead(204, {
      ...(origin === null ? {} : { 'access-control-allow-origin': origin, vary: 'Origin' }),
      'access-control-allow-methods': 'POST',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '600',
    });
    return response.end();
  }
  if (request.method === 'GET' && request.url === '/health') return json(response, 200, { ok: true, exchange: transcriptPath === undefined ? 'codex_cli' : 'scripted_transcript' }, origin);
  if (request.method !== 'POST') return json(response, 404, { error: 'not_found' }, origin);
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json(response, error.message === 'body_too_large' ? 413 : 400, { error: error.message }, origin);
  }
  try {
    if (request.url === '/dm/session') return json(response, 200, { reply: await sessionExchange.exchangeRequest(body) }, origin);
    if (request.url === '/dm/exchange') {
      const reconstructed = projectionReconstructor.reconstruct(body);
      if (reconstructed.kind === 'full_projection_required') return json(response, 200, reconstructed, origin);
      return json(response, 200, await exchange.exchangeRequest(reconstructed.request), origin);
    }
    if (request.url === '/dm/mirror') return json(response, 200, { result: await mirror.append(body) }, origin);
    return json(response, 404, { error: 'not_found' }, origin);
  } catch (error) {
    return json(response, 422, { error: error instanceof Error ? error.message : String(error) }, origin);
  }
});

server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('DM bridge did not bind a TCP port');
  console.log(`listening on http://127.0.0.1:${address.port}`);
});

function stop() {
  server.close(() => process.exit(0));
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
