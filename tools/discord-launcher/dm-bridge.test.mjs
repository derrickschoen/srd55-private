import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CodexCliExchange, FileExchangeCache, FileRevisionMirror, ProjectionReconstructor, ScriptedCodexExchange, dmBridgeLibInternals } from './dm-bridge-lib.mjs';

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('test server did not get a TCP port');
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForListening(child) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('bridge process did not listen')), 5_000);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.stdout.on('data', (chunk) => {
      if (!chunk.toString('utf8').includes('listening on')) return;
      clearTimeout(timeout);
      resolve();
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`bridge exited before listening with ${code}`));
    });
  });
}

test('scripted exchange resumes one persisted Codex session', async () => {
  const exchange = new ScriptedCodexExchange([
    { expect: { kind: 'round_plan_request' }, reply: { kind: 'first' } },
    { expect: { kind: 'monster_reconsult_request' }, reply: { kind: 'second' } },
  ]);
  assert.deepEqual(await exchange.exchange({ kind: 'round_plan_request', agentSessionId: 'session-17' }), { kind: 'first' });
  assert.deepEqual(await exchange.exchange({ kind: 'monster_reconsult_request', agentSessionId: 'session-17' }), { kind: 'second' });
  exchange.assertComplete();
  await assert.rejects(
    new ScriptedCodexExchange([{ expect: { kind: 'round_plan_request' }, reply: {} }]).exchange({
      kind: 'wrong_request',
      agentSessionId: 'session-17',
    }),
    /transcript expected/,
  );
});

test('compact projection manifest names a bridge field omission before hash comparison', () => {
  const reconstructor = new ProjectionReconstructor();
  assert.throws(() => reconstructor.reconstruct({
    encounterId: 'encounter:compact-manifest',
    expectedRevision: 3,
    history: [],
    projectionTransfer: {
      kind: 'compact_projection',
      revision: 3,
      stateHash: '0'.repeat(64),
      projectionFields: [
        'audience',
        'encounter',
        'board',
        'coordinator',
        'pendingRequest',
        'humanCommandActions',
        'movementPreviews',
        'controllers',
        'history',
        'adjudicatedTargets',
        'partySession',
        'decisionTray',
        'timeline',
        'worldObjectControls',
      ],
      view: {
        encounter: { revision: 3 },
        board: {},
        coordinator: {},
        pendingRequest: null,
        humanCommandActions: [],
        movementPreviews: [],
        controllers: [],
        adjudicatedTargets: [],
        partySession: null,
        decisionTray: {},
        timeline: {},
      },
    },
  }), /missing: worldObjectControls; unexpected: none/u);
});

test('Codex CLI contract writes the request on stdin and resumes only the supplied session', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dnd-fake-codex-cli-'));
  try {
    const fakeCodex = join(directory, 'codex');
    await writeFile(fakeCodex, `#!/usr/bin/env node
let input = '';
for await (const chunk of process.stdin) input += chunk.toString('utf8');
const text = JSON.stringify({ args: process.argv.slice(2), input });
process.stdout.write(JSON.stringify({ type: 'thread.started', thread_id: '019c-fake-codex-thread' }) + '\\n');
process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text } }) + '\\n');
`);
    await chmod(fakeCodex, 0o700);
    const exchange = new CodexCliExchange({ cwd: process.cwd(), codexBin: fakeCodex, timeoutMs: 5_000 });
    const reply = await exchange.exchange({
      kind: 'round_plan_request',
      agentSessionId: 'codex:persisted-cli-session',
      model: { model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
      correctionAttempt: 0,
      replyContract: {
        schemaVersion: 1,
        jsonSchema: { type: 'object', additionalProperties: false },
        canonicalExample: { kind: 'round_plan' },
      },
    });
    assert.ok(reply && typeof reply === 'object' && 'args' in reply && Array.isArray(reply.args));
    assert.deepEqual(reply.args.slice(-3), ['resume', 'codex:persisted-cli-session', '-']);
    assert.ok('input' in reply && typeof reply.input === 'string');
    assert.match(reply.input, /"kind":"round_plan_request"/);
    assert.match(reply.input, /No other fields are permitted/);
    assert.match(reply.input, /"additionalProperties":false/);
    assert.match(reply.input, /Canonical valid example/);
    assert.doesNotMatch(reply.input, /claude/i);
    const correctionPrompt = dmBridgeLibInternals.roundPlanPrompt({
      kind: 'round_plan_correction_request',
      validatorError: 'round plan contains unexpected field commands.',
      replyContract: {
        schemaVersion: 1,
        jsonSchema: { type: 'object', additionalProperties: false },
        canonicalExample: { kind: 'round_plan' },
      },
    });
    assert.match(correctionPrompt, /previous reply failed strict validation/);
    assert.match(correctionPrompt, /round plan contains unexpected field commands\./);
    assert.equal(
      await exchange.createSession({ model: 'gpt-5.6-terra', reasoningEffort: 'medium' }),
      '019c-fake-codex-thread',
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('bridge fleet telemetry decodes first-class usage fields from Codex JSON events', () => {
  const stdout = JSON.stringify({
    type: 'turn.completed',
    usage: { input_tokens: 120, cached_input_tokens: 80, output_tokens: 30, reasoning_tokens: 12 },
  });
  assert.deepEqual(dmBridgeLibInternals.parseCodexUsage(stdout), {
    input: 120,
    cachedInput: 80,
    output: 30,
    reasoning: 12,
  });
  assert.equal(dmBridgeLibInternals.fleetTelemetry({
    model: { model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
    correctionAttempt: 1,
  }, 42, {
    input: 120,
    cachedInput: 80,
    output: 30,
    reasoning: 12,
  }).correctionAttempts, 1);
});

test('restricted-JS prompt retains three full-envelope examples and demonstrates batching', () => {
  const workedExamples = [{
    kind: 'js_round_plan',
    protocolVersion: 2,
    encounterId: 'encounter:example-batch',
    requestId: 'request:example-batch',
    expectedRevision: 7,
    round: 2,
    monsters: [
      { monsterId: 'combatant:example-one', source: 'emit(endTurn());' },
      { monsterId: 'combatant:example-two', source: 'emit(endTurn());' },
    ],
  }, {
    kind: 'js_round_plan', protocolVersion: 2, encounterId: 'encounter:example-two',
    requestId: 'request:example-two', expectedRevision: 7, round: 2,
    monsters: [{ monsterId: 'combatant:example-three', source: 'emit(endTurn());' }],
  }, {
    kind: 'js_round_plan', protocolVersion: 2, encounterId: 'encounter:example-three',
    requestId: 'request:example-three', expectedRevision: 7, round: 2,
    monsters: [{ monsterId: 'combatant:example-four', source: 'emit(endTurn());' }],
  }];
  const prompt = dmBridgeLibInternals.roundPlanPrompt({
    kind: 'round_plan_request',
    livingMonsterIds: ['combatant:live-one', 'combatant:live-two'],
    replyContract: {
      surface: 'js_program',
      schemaVersion: 1,
      grammar: 'program ::= statement*',
      workedExamples,
    },
  });

  assert.equal((prompt.match(/Worked example \d:/g) ?? []).length, 3);
  assert.match(prompt, /"monsterId":"combatant:example-one"/);
  assert.match(prompt, /"monsterId":"combatant:example-two"/);
  assert.doesNotMatch(prompt.slice(prompt.indexOf('Request:')), /replyContract/);
});

test('file mirror appends, de-duplicates, and replays a contiguous revision stream', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dnd-dm-mirror-'));
  try {
    const mirror = new FileRevisionMirror(directory);
    const first = { sessionId: 'encounter:file-test', revision: 1, checksum: 'one', payload: 'alpha' };
    const second = { sessionId: 'encounter:file-test', revision: 2, checksum: 'two', payload: 'beta' };
    assert.equal(await mirror.append(first), 'appended');
    assert.equal(await mirror.append(first), 'duplicate');
    assert.equal(await mirror.append(second), 'appended');
    assert.deepEqual(await mirror.replay('encounter:file-test'), [first, second]);
    await assert.rejects(
      mirror.append({ sessionId: 'encounter:file-test', revision: 4, checksum: 'four' }),
      /contiguous/,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('file exchange cache survives reconstruction without a second scripted call', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dnd-dm-exchange-cache-'));
  try {
    const request = {
      kind: 'round_plan_request',
      encounterId: 'encounter:cache',
      requestId: 'request:stable',
      agentSessionId: 'codex:stable',
    };
    const firstTranscript = new ScriptedCodexExchange([
      { expect: { kind: 'round_plan_request' }, reply: { marker: 'durable-reply' } },
    ]);
    const first = new FileExchangeCache(directory, firstTranscript);
    assert.deepEqual(await first.exchangeRequest(request), { marker: 'durable-reply' });
    firstTranscript.assertComplete();

    const emptyTranscript = new ScriptedCodexExchange([]);
    const resumed = new FileExchangeCache(directory, emptyTranscript);
    assert.deepEqual(await resumed.exchangeRequest(request), { marker: 'durable-reply' });
    emptyTranscript.assertComplete();
    await assert.rejects(
      resumed.exchangeRequest({ ...request, kind: 'monster_reconsult_request' }),
      /idempotency key was reused/,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('localhost process uses the fake transcript for exchange and the append-only mirror', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dnd-dm-bridge-process-'));
  const transcriptPath = join(directory, 'transcript.json');
  await writeFile(transcriptPath, JSON.stringify([
    { expect: { kind: 'round_plan_request', requestId: 'request:1' }, reply: { kind: 'round_plan', marker: 'fake-only' } },
    { expect: { kind: 'monster_reconsult_request', requestId: 'request:2' }, reply: { kind: 'round_plan', marker: 'same-session' } },
  ]));
  const port = await availablePort();
  const child = spawn(process.execPath, ['tools/discord-launcher/codex-dm-bridge.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DM_BRIDGE_PORT: String(port),
      DM_BRIDGE_DATA_DIR: join(directory, 'mirror'),
      DM_BRIDGE_TRANSCRIPT: transcriptPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await waitForListening(child);
    const health = await fetch(`http://127.0.0.1:${port}/health`).then((response) => response.json());
    assert.deepEqual(health, { ok: true, exchange: 'scripted_transcript' });
    const preflight = await fetch(`http://127.0.0.1:${port}/dm/exchange`, {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const foreign = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { origin: 'https://attacker.example' },
    });
    assert.equal(foreign.status, 403);
    const created = await fetch(`http://127.0.0.1:${port}/dm/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'create_dm_session',
        encounterId: 'encounter:process-cache',
        requestId: 'encounter:process-cache:create-dm-session',
        model: { model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
      }),
    });
    assert.equal(created.status, 200);
    assert.deepEqual(await created.json(), { reply: { agentSessionId: 'codex:scripted-session' } });
    for (const [kind, requestId, marker] of [
      ['round_plan_request', 'request:1', 'fake-only'],
      ['monster_reconsult_request', 'request:2', 'same-session'],
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}/dm/exchange`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          requestId,
          encounterId: 'encounter:process-cache',
          agentSessionId: 'codex:persisted-process-session',
          model: { model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
        }),
      });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.deepEqual(body.reply, { kind: 'round_plan', marker });
      assert.deepEqual(body.telemetry, {
        modelId: 'gpt-5.6-terra',
        reasoningEffort: 'medium',
        buildId: 'local-dm-bridge',
        commit: 'unknown-local-commit',
        loadLevelTag: 'interactive',
        latencyMs: body.telemetry.latencyMs,
        tokenCounts: { input: 0, cachedInput: 0, output: 0, reasoning: 0 },
        correctionAttempts: 0,
      });
      assert.ok(Number.isFinite(body.telemetry.latencyMs) && body.telemetry.latencyMs >= 0);
    }
    const repeated = await fetch(`http://127.0.0.1:${port}/dm/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'round_plan_request',
        requestId: 'request:1',
        encounterId: 'encounter:process-cache',
        agentSessionId: 'codex:persisted-process-session',
        model: { model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
      }),
    });
    assert.equal(repeated.status, 200);
    const revision = { sessionId: 'encounter:process', revision: 1, checksum: 'checksum:1' };
    const mirrored = await fetch(`http://127.0.0.1:${port}/dm/mirror`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(revision),
    });
    assert.equal(mirrored.status, 200);
    assert.deepEqual(await mirrored.json(), { result: 'appended' });
    const replay = await new FileRevisionMirror(join(directory, 'mirror')).replay('encounter:process');
    assert.deepEqual(replay, [revision]);
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
    await rm(directory, { recursive: true });
  }
});
