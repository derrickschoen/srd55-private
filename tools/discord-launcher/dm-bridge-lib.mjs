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

function projectionHash(projection) {
  return createHash('sha256').update(canonical(projection)).digest('hex');
}

function applyProjectionOperation(root, operation) {
  const input = object(operation, 'projection delta operation');
  if (!Array.isArray(input.path) || input.path.length === 0 || !input.path.every((entry) => typeof entry === 'string')) {
    throw new TypeError('projection delta operation path is malformed');
  }
  let parent = root;
  for (const segment of input.path.slice(0, -1)) parent = object(parent[segment], 'projection delta path');
  const leaf = input.path.at(-1);
  if (input.kind === 'set') parent[leaf] = structuredClone(input.value);
  else if (input.kind === 'delete') delete parent[leaf];
  else throw new TypeError('projection delta operation kind is unsupported');
}

export class ProjectionReconstructor {
  constructor() {
    this.snapshots = new Map();
    this.failures = 0;
  }

  reconstruct(value) {
    const request = object(value, 'request');
    if (!('projectionTransfer' in request)) return { kind: 'reconstructed', request };
    const transfer = object(request.projectionTransfer, 'request.projectionTransfer');
    if (typeof request.encounterId !== 'string' || !Number.isSafeInteger(transfer.revision)) {
      throw new TypeError('projection transfer identity is malformed');
    }
    if (request.expectedRevision !== transfer.revision) {
      throw new TypeError('projection transfer revision disagrees with the bridge request');
    }
    let projection;
    if (transfer.kind === 'full_projection') {
      projection = structuredClone(object(transfer.projection, 'full projection'));
    } else if (transfer.kind === 'projection_delta') {
      const previous = this.snapshots.get(request.encounterId);
      if (
        previous === undefined ||
        previous.revision !== transfer.baseRevision ||
        previous.hash !== transfer.baseHash ||
        !Array.isArray(transfer.operations)
      ) {
        this.failures += 1;
        return { kind: 'full_projection_required', encounterId: request.encounterId, expectedRevision: transfer.revision };
      }
      projection = structuredClone(previous.projection);
      for (const operation of transfer.operations) applyProjectionOperation(projection, operation);
    } else {
      throw new TypeError('projection transfer kind is unsupported');
    }
    const actualHash = projectionHash(projection);
    if (
      typeof transfer.stateHash !== 'string' ||
      actualHash !== transfer.stateHash ||
      object(projection.encounter, 'projection.encounter').revision !== transfer.revision
    ) {
      this.failures += 1;
      return { kind: 'full_projection_required', encounterId: request.encounterId, expectedRevision: transfer.revision };
    }
    this.snapshots.set(request.encounterId, {
      revision: transfer.revision,
      hash: transfer.stateHash,
      projection: structuredClone(projection),
    });
    const reconstructed = { ...request, projection };
    delete reconstructed.projectionTransfer;
    return { kind: 'reconstructed', request: reconstructed };
  }

  telemetry() {
    return { reconstructionFailures: this.failures };
  }
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

  async exchangeWithTelemetry(request) {
    const started = Date.now();
    const reply = await this.exchange(request);
    return {
      reply,
      telemetry: fleetTelemetry(request, Date.now() - started, {
        input: 0,
        cachedInput: 0,
        output: 0,
        reasoning: 0,
      }),
    };
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

function usageCandidate(value) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = usageCandidate(entry);
      if (found !== null) return found;
    }
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const input = value.input_tokens ?? value.inputTokens;
  const output = value.output_tokens ?? value.outputTokens;
  if (Number.isSafeInteger(input) && input >= 0 && Number.isSafeInteger(output) && output >= 0) {
    const cached = value.cached_input_tokens ?? value.cachedInputTokens ?? 0;
    const reasoning = value.reasoning_tokens ?? value.reasoningTokens ?? 0;
    return {
      input,
      cachedInput: Number.isSafeInteger(cached) && cached >= 0 ? cached : 0,
      output,
      reasoning: Number.isSafeInteger(reasoning) && reasoning >= 0 ? reasoning : 0,
    };
  }
  for (const entry of Object.values(value)) {
    const found = usageCandidate(entry);
    if (found !== null) return found;
  }
  return null;
}

function parseCodexUsage(stdout) {
  let latest = null;
  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      latest = usageCandidate(JSON.parse(line)) ?? latest;
    } catch {
      continue;
    }
  }
  return latest ?? { input: 0, cachedInput: 0, output: 0, reasoning: 0 };
}

function fleetTelemetry(request, latencyMs, tokenCounts) {
  const input = object(request, 'request');
  const model = object(input.model, 'request.model');
  if (typeof model.model !== 'string' || typeof model.reasoningEffort !== 'string') {
    throw new TypeError('request.model is malformed');
  }
  return {
    modelId: model.model,
    reasoningEffort: model.reasoningEffort,
    buildId: process.env.DM_BRIDGE_BUILD_ID ?? 'local-dm-bridge',
    commit: process.env.DM_BRIDGE_COMMIT ?? 'unknown-local-commit',
    loadLevelTag: process.env.DM_BRIDGE_LOAD_LEVEL ?? 'interactive',
    latencyMs,
    tokenCounts,
    correctionAttempts: Number.isSafeInteger(input.correctionAttempt) && input.correctionAttempt >= 0
      ? input.correctionAttempt
      : 0,
  };
}

function roundPlanPrompt(request) {
  const input = object(request, 'request');
  const contract = object(input.replyContract, 'request.replyContract');
  if (contract.schemaVersion !== 1) {
    throw new TypeError('request.replyContract version is unsupported');
  }
  if ('maximumCorrectionAttempts' in contract && contract.maximumCorrectionAttempts !== 2) {
    throw new TypeError('request.replyContract correction bound is unsupported');
  }
  let correction = 'This is the initial reply for this request.';
  if (input.kind === 'round_plan_correction_request') {
    if (typeof input.validatorError !== 'string' || input.validatorError.length === 0) {
      throw new TypeError('correction request requires the validator error');
    }
    correction = `The previous reply failed strict validation with exactly this error: ${input.validatorError}`;
  }
  const contractInstructions = contract.delivery === 'reference'
    ? [
        `Use the strict JSON reply contract already established in this session as ${String(contract.contractId)}.`,
        'Return only a JSON object accepted by that unchanged contract.',
      ]
    : contract.delivery === 'compact'
      ? [
          `Contract ${String(contract.contractId)} compact JSON grammar:`,
          String(contract.grammar),
          'Canonical valid example:',
          JSON.stringify(object(contract.canonicalExample, 'request.replyContract.canonicalExample')),
          'The production strict validator remains authoritative.',
        ]
      : 'jsonSchema' in contract
        ? [
        'The reply MUST validate against this exact JSON Schema:',
        JSON.stringify(object(contract.jsonSchema, 'request.replyContract.jsonSchema')),
        ...('canonicalExample' in contract
          ? [
              'Canonical valid example (replace envelope ids/revision/round and requested monster ids with this request values):',
              JSON.stringify(object(contract.canonicalExample, 'request.replyContract.canonicalExample')),
            ]
          : []),
        'No other fields are permitted at the envelope or at any nested object level.',
          ...(typeof contract.contractId === 'string'
            ? [`Remember this unchanged contract as ${contract.contractId} for later requests in this session.`]
            : []),
        ]
        : [
            'The reply MUST use this restricted program grammar:',
            String(contract.grammar),
            'Canonical valid example:',
            String(contract.canonicalExample),
          ];
  return [
    'You are the DM decision engine. Return exactly one JSON object and no markdown.',
    ...contractInstructions,
    correction,
    'Request:',
    JSON.stringify(input),
  ].join('\n');
}

function runCodexProcess(binary, args, options) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
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
      if (code === 0) resolve({ stdout, stderr, latencyMs: Date.now() - started });
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
    return (await this.exchangeWithTelemetry(request)).reply;
  }

  async exchangeWithTelemetry(request) {
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
    const prompt = roundPlanPrompt(input);
    const result = await runCodexProcess(this.codexBin, args, {
      cwd: this.cwd,
      input: prompt,
      timeoutMs: this.timeoutMs,
    });
    return {
      reply: parseCodexJsonLines(result.stdout),
      telemetry: fleetTelemetry(request, result.latencyMs, parseCodexUsage(result.stdout)),
    };
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

export const dmBridgeLibInternals = {
  canonical,
  findAgentText,
  fleetTelemetry,
  parseCodexJsonLines,
  parseCodexThreadId,
  parseCodexUsage,
  projectionHash,
  requestSessionId,
  roundPlanPrompt,
  runCodexProcess,
  safeStreamName,
};
