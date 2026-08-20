#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';

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
  const request = JSON.parse(input.slice(input.indexOf('\n') + 1));
  const monsterIds = request.kind === 'round_plan_request'
    ? request.livingMonsterIds
    : [request.monsterId];
  const monsterIdSet = new Set(monsterIds);
  const nonMonsterControllers = request.projection.controllers.filter(
    (controller) => !monsterIdSet.has(controller.combatantId),
  );
  if (nonMonsterControllers.some((controller) => controller.kind !== 'algorithm')) {
    process.stderr.write('Scripted soak requires AlgorithmController on every PC.\n');
    process.exitCode = 9;
  } else {
    const reply = {
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
