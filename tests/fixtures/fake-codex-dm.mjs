#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = Buffer.concat(chunks).toString('utf8');
const isResume = process.argv.includes('resume');

if (process.env.FAKE_CODEX_PID_FILE !== undefined) {
  await writeFile(process.env.FAKE_CODEX_PID_FILE, String(process.pid), 'utf8');
}

if (isResume && process.env.FAKE_CODEX_MODE === 'hang') {
  setInterval(() => undefined, 1_000);
} else if (!isResume) {
  process.stdout.write(`${JSON.stringify({
    type: 'thread.started',
    thread_id: `codex:scripted-soak-${String(process.pid)}`,
  })}\n`);
  process.stdout.write(`${JSON.stringify({
    type: 'item.completed',
    item: { type: 'agent_message', text: JSON.stringify({ kind: 'session_ready' }) },
  })}\n`);
} else {
  const requestMarker = '\nRequest:\n';
  const request = JSON.parse(input.slice(input.lastIndexOf(requestMarker) + requestMarker.length));
  const monsterIds = request.kind === 'round_plan_request'
    ? request.livingMonsterIds
    : request.kind === 'monster_reconsult_request'
      ? [request.monsterId]
      : request.requestedMonsterIds;
  const monsterIdSet = new Set(monsterIds);
  const nonMonsterControllers = request.projection.controllers.filter(
    (controller) => !monsterIdSet.has(controller.combatantId),
  );
  if (nonMonsterControllers.some((controller) => controller.kind !== 'algorithm')) {
    process.stderr.write('Scripted soak requires AlgorithmController on every PC.\n');
    process.exitCode = 9;
  } else {
    let reply = request.surface === 'js_program'
      ? {
          kind: 'js_round_plan',
          protocolVersion: request.protocolVersion,
          encounterId: request.encounterId,
          requestId: request.requestId,
          expectedRevision: request.expectedRevision,
          round: request.round,
          monsters: monsterIds.map((monsterId) => ({ monsterId, source: 'emit(endTurn());' })),
        }
      : {
          kind: 'round_plan',
          protocolVersion: request.protocolVersion,
          encounterId: request.encounterId,
          requestId: request.requestId,
          expectedRevision: request.expectedRevision,
          round: request.round,
          monsters: monsterIds.map((monsterId) => ({
            monsterId,
            program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
          })),
        };
    if (
      process.env.FAKE_CODEX_MODE === 'malformed_once' &&
      process.env.FAKE_CODEX_STATE_FILE !== undefined
    ) {
      let alreadyMalformed = false;
      try {
        await readFile(process.env.FAKE_CODEX_STATE_FILE, 'utf8');
        alreadyMalformed = true;
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
      }
      if (!alreadyMalformed) {
        await writeFile(process.env.FAKE_CODEX_STATE_FILE, 'malformed', 'utf8');
        reply = {
          ...reply,
          commands: [{ type: 'end_turn', actor: monsterIds[0] }],
        };
      }
    }
    process.stdout.write(`${JSON.stringify({
      type: 'item.completed',
      item: { type: 'agent_message', text: JSON.stringify(reply) },
    })}\n`);
    process.stdout.write(`${JSON.stringify({
      type: 'turn.completed',
      usage: {
        input_tokens: 101,
        cached_input_tokens: 17,
        output_tokens: 23,
        reasoning_tokens: 7,
      },
    })}\n`);
  }
}
