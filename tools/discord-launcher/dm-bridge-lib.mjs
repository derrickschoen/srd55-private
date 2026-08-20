import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

function object(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function requestSessionId(request) {
  const sessionId = object(request, 'request').codexSessionId;
  if (typeof sessionId !== 'string' || sessionId.length === 0) throw new TypeError('request.codexSessionId is required');
  return sessionId;
}

function safeStreamName(sessionId) {
  return `${createHash('sha256').update(sessionId).digest('hex')}.jsonl`;
}

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

export class FileRevisionMirror {
  constructor(directory) {
    this.directory = resolve(directory);
    this.queues = new Map();
  }

  streamPath(sessionId) {
    return join(this.directory, safeStreamName(sessionId));
  }

  append(revision) {
    const input = object(revision, 'revision');
    if (typeof input.sessionId !== 'string' || !Number.isSafeInteger(input.revision) || typeof input.checksum !== 'string') {
      return Promise.reject(new TypeError('revision identity is malformed'));
    }
    const previous = this.queues.get(input.sessionId) ?? Promise.resolve();
    const queued = previous.then(async () => {
      const existing = await this.replay(input.sessionId);
      const latest = existing.at(-1);
      if (latest?.revision === input.revision && latest.checksum === input.checksum) return 'duplicate';
      if (input.revision !== existing.length + 1) throw new Error('mirror revision stream must be contiguous');
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      await appendFile(this.streamPath(input.sessionId), `${JSON.stringify(input)}\n`, { encoding: 'utf8', mode: 0o600 });
      return 'appended';
    });
    this.queues.set(input.sessionId, queued.then(() => undefined, () => undefined));
    return queued;
  }

  async replay(sessionId) {
    let contents;
    try {
      contents = await readFile(this.streamPath(sessionId), 'utf8');
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
      throw error;
    }
    const revisions = contents.split('\n').filter(Boolean).map((line) => object(JSON.parse(line), 'stored revision'));
    for (const [index, revision] of revisions.entries()) {
      if (revision.sessionId !== sessionId || revision.revision !== index + 1) throw new Error('stored mirror stream is not contiguous');
    }
    return revisions;
  }
}

export class ScriptedCodexExchange {
  constructor(entries) {
    if (!Array.isArray(entries)) throw new TypeError('scripted transcript must be an array');
    this.entries = entries;
    this.index = 0;
    this.sessionId = null;
  }

  async exchange(request) {
    const entry = object(this.entries[this.index], `transcript[${this.index}]`);
    const expected = object(entry.expect, `transcript[${this.index}].expect`);
    const sessionId = requestSessionId(request);
    if (this.sessionId === null) this.sessionId = sessionId;
    if (sessionId !== this.sessionId) throw new Error('scripted exchange started a new Codex session');
    if (expected.kind !== request.kind) throw new Error(`transcript expected ${expected.kind}, received ${request.kind}`);
    if (typeof expected.requestId === 'string' && expected.requestId !== request.requestId) throw new Error('transcript request id mismatch');
    this.index += 1;
    return entry.reply;
  }

  assertComplete() {
    if (this.index !== this.entries.length) throw new Error(`scripted transcript has ${this.entries.length - this.index} unused entries`);
  }
}

/** Durable idempotency boundary: a browser retry replays bytes without another CLI call. */
export class FileExchangeCache {
  constructor(directory, exchange) {
    this.directory = resolve(directory);
    this.exchange = exchange;
    this.pending = new Map();
  }

  cachePath(request) {
    const input = object(request, 'request');
    if (typeof input.encounterId !== 'string' || typeof input.requestId !== 'string') {
      throw new TypeError('cached exchange requires encounterId and requestId');
    }
    return join(this.directory, `${createHash('sha256').update(`${input.encounterId}\0${input.requestId}`).digest('hex')}.json`);
  }

  exchangeRequest(request) {
    const path = this.cachePath(request);
    const previous = this.pending.get(path);
    if (previous !== undefined) return previous;
    const operation = this.#exchange(path, request).finally(() => this.pending.delete(path));
    this.pending.set(path, operation);
    return operation;
  }

  async #read(path, request) {
    let stored;
    try {
      stored = object(JSON.parse(await readFile(path, 'utf8')), 'cached exchange');
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
    }
    if (canonical(stored.request) !== canonical(request)) {
      throw new Error('exchange idempotency key was reused with a different request');
    }
    return stored.reply;
  }

  async #exchange(path, request) {
    const cached = await this.#read(path, request);
    if (cached !== null) return cached;
    const reply = await this.exchange.exchange(request);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    try {
      await writeFile(path, JSON.stringify({ request, reply }), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      return reply;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
        const raced = await this.#read(path, request);
        if (raced !== null) return raced;
      }
      throw error;
    }
  }
}

function findAgentText(value) {
  if (typeof value === 'string') return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findAgentText(entry);
      if (found !== null) return found;
    }
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  if ('type' in value && value.type === 'agent_message' && 'text' in value && typeof value.text === 'string') return value.text;
  for (const entry of Object.values(value)) {
    const found = findAgentText(entry);
    if (found !== null) return found;
  }
  return null;
}

function parseCodexJsonLines(stdout) {
  const messages = stdout.split('\n').filter(Boolean).flatMap((line) => {
    try {
      const text = findAgentText(JSON.parse(line));
      return text === null ? [] : [text];
    } catch {
      return [];
    }
  });
  const last = messages.at(-1);
  if (last === undefined) throw new Error('codex CLI returned no agent JSON message');
  return JSON.parse(last);
}

function parseCodexThreadId(stdout) {
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const event = object(JSON.parse(line), 'codex event');
      if (event.type === 'thread.started' && typeof event.thread_id === 'string' && event.thread_id.length > 0) {
        return event.thread_id;
      }
    } catch {
      continue;
    }
  }
  throw new Error('codex CLI returned no persistent thread id');
}

function runCodexProcess(binary, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (operation) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      operation();
    };
    const append = (current, chunk) => {
      const next = current + chunk.toString('utf8');
      if (Buffer.byteLength(next) > 16 * 1024 * 1024) {
        child.kill('SIGKILL');
        finish(() => reject(new Error('codex CLI output exceeded 16 MiB')));
      }
      return next;
    };
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });
    child.once('error', (error) => finish(() => reject(error)));
    child.once('exit', (code, signal) => finish(() => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`codex CLI exited with code ${code ?? 'null'} signal ${signal ?? 'none'}: ${stderr}`));
    }));
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      finish(() => reject(new Error(`codex CLI exceeded ${options.timeoutMs}ms`)));
    }, options.timeoutMs);
    child.stdin.on('error', (error) => finish(() => reject(error)));
    child.stdin.end(options.input);
  });
}

/** Production exchange. It invokes the Codex CLI directly and never invokes Claude. */
export class CodexCliExchange {
  constructor({ cwd, codexBin = 'codex', timeoutMs = 120_000 }) {
    this.cwd = resolve(cwd);
    this.codexBin = codexBin;
    this.timeoutMs = timeoutMs;
  }

  async exchange(request) {
    const input = object(request, 'request');
    const model = object(input.model, 'request.model');
    if (typeof model.model !== 'string' || typeof model.reasoningEffort !== 'string') throw new TypeError('request.model is malformed');
    const args = [
      'exec',
      '-C', this.cwd,
      '--sandbox', 'read-only',
      '--json',
      '-m', model.model,
      '-c', `model_reasoning_effort="${model.reasoningEffort}"`,
      'resume', requestSessionId(input),
      '-',
    ];
    const prompt = [
      'You are the DM decision engine. Return exactly one JSON value matching the requested typed reply. No markdown.',
      JSON.stringify(input),
    ].join('\n');
    const result = await runCodexProcess(this.codexBin, args, {
      cwd: this.cwd,
      input: prompt,
      timeoutMs: this.timeoutMs,
    });
    return parseCodexJsonLines(result.stdout);
  }

  async createSession(model) {
    const config = object(model, 'model');
    if (typeof config.model !== 'string' || typeof config.reasoningEffort !== 'string') throw new TypeError('model is malformed');
    const args = [
      'exec',
      '-C', this.cwd,
      '--sandbox', 'read-only',
      '--json',
      '-m', config.model,
      '-c', `model_reasoning_effort="${config.reasoningEffort}"`,
      '-',
    ];
    const result = await runCodexProcess(this.codexBin, args, {
      cwd: this.cwd,
      input: 'Start a persistent local VTT Dungeon Master session. Reply with JSON {"kind":"session_ready"}.',
      timeoutMs: this.timeoutMs,
    });
    return parseCodexThreadId(result.stdout);
  }
}

export async function loadTranscript(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

export const dmBridgeLibInternals = { canonical, findAgentText, parseCodexJsonLines, parseCodexThreadId, requestSessionId, runCodexProcess, safeStreamName };
