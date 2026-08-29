import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  extractSft,
  formatExtractSftStats,
  type SftExample,
} from '../../../tools/rl/extract-sft';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from '../../helpers/test-filesystem';
import { declareTestInputs } from '../../helpers/test-inputs';

const inputs = declareTestInputs({
  fixtures: ['tests/fixtures/rl/authorized-arena-row.SIMULATED.jsonl'],
});
const fixturePath = 'tests/fixtures/rl/authorized-arena-row.SIMULATED.jsonl';
const fixtureSource = inputs.fixtures.readText(fixturePath);

function fixtureRow(): Readonly<Record<string, unknown>> {
  return JSON.parse(fixtureSource) as Readonly<Record<string, unknown>>;
}

describe('RL SFT extractor', () => {
  it('pins the exact chat example produced from the authorized fixture row', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd410-extract-golden-'));
    const outPath = join(directory, 'sft.jsonl');
    const heartbeats: string[] = [];

    const stats = await extractSft({
      arenaPaths: [resolve(fixturePath)],
      rolloutPaths: [],
      outPath,
    }, { heartbeat: (line) => { heartbeats.push(line); } });

    const expected: SftExample = {
      messages: [
        { role: 'system', content: 'K6 fixture instructions\n' },
        {
          role: 'user',
          content: canonicalJson({
            granularity: 'full',
            context_trimmed: false,
            state_ref: {
              run_id: 'encounter:ai-dm-conversation',
              state_handle: `engine-state:${'a'.repeat(64)}`,
              expected_revision: 6,
            },
            request: {
              request_id: 'request:room-1-round-1',
              phase: 'initial',
              correction_number: 0,
              required_actor_ids: ['combatant:fixture-monster'],
            },
          }),
        },
        {
          role: 'assistant',
          content: canonicalJson({
            state_ref: {
              run_id: 'encounter:ai-dm-conversation',
              state_handle: `engine-state:${'a'.repeat(64)}`,
              expected_revision: 6,
            },
            request_id: 'request:room-1-round-1',
            phase: 'initial',
            idempotency_key: 'fixture-round-intents-initial',
            intents: [{
              actor_id: 'combatant:fixture-monster',
              choice: { kind: 'dodge' },
              movement: { willingness: 'none', maximum_feet: 0, opportunity_risk: 'avoid' },
              engagement: { stance: 'hold_position' },
              fallback: null,
            }],
          }),
        },
      ],
      sourceRow: {
        path: resolve(fixturePath),
        line: 1,
        seed: 3_943_001,
        basis: 'standard',
        room: 1,
        round: 1,
        proposalId: 'round:fixture-authorized',
      },
      stateDigest: 'a'.repeat(64),
      planHash: '736ca86563291fa686e06d91d055145c6cfde87b41ac11518622e0c4617b430a',
      sessionId: '019d1111-1111-7111-8111-111111111111',
      escalationSessionId: null,
    };
    expect(readFileSync(outPath, 'utf8')).toBe(`${canonicalJson(expected)}\n`);
    expect(stats).toEqual({ examples: 1, rooms: 1, deduplicated: 0 });
    expect(formatExtractSftStats(stats)).toBe(
      'examples=1 rooms=1 deduplicated=0 dedupe=state-digest+plan-hash',
    );
    expect(heartbeats).toEqual([
      `start batches=1 rollouts=0 out=${outPath}`,
      `batch path=${resolve(fixturePath)} status=start`,
      `batch path=${resolve(fixturePath)} status=complete examples=1`,
    ]);
  });

  it('deduplicates by state digest plus plan hash', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd410-extract-dedupe-'));
    const arenaPath = join(directory, 'duplicates.jsonl');
    const outPath = join(directory, 'sft.jsonl');
    writeFileSync(arenaPath, `${fixtureSource.trim()}\n${fixtureSource.trim()}\n`, 'utf8');

    const stats = await extractSft({ arenaPaths: [arenaPath], rolloutPaths: [], outPath });

    expect(stats).toEqual({ examples: 1, rooms: 1, deduplicated: 1 });
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(1);
  });

  it('round-trips primary and escalation session IDs as non-training metadata', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd411-extract-session-metadata-'));
    const arenaPath = join(directory, 'session-linked.jsonl');
    const outPath = join(directory, 'sft.jsonl');
    writeFileSync(arenaPath, `${canonicalJson({
      ...fixtureRow(),
      sessionId: '019d2222-2222-7222-8222-222222222222',
      escalationSessionId: '019d3333-3333-7333-8333-333333333333',
    })}\n`, 'utf8');

    await extractSft({ arenaPaths: [arenaPath], rolloutPaths: [], outPath });

    const example = JSON.parse(readFileSync(outPath, 'utf8')) as SftExample;
    expect(example.sessionId).toBe('019d2222-2222-7222-8222-222222222222');
    expect(example.escalationSessionId).toBe('019d3333-3333-7333-8333-333333333333');
    expect(example.messages.every((message) => !message.content.includes('019d2222') &&
      !message.content.includes('019d3333'))).toBe(true);
  });

  it('uses a proposal-matched Codex rollout when legacy rows lack the opt-in capture', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd410-extract-rollout-'));
    const arenaPath = join(directory, 'legacy.jsonl');
    const rolloutPath = join(directory, 'rollout.jsonl');
    const outPath = join(directory, 'sft.jsonl');
    const { rlData, ...legacyRow } = fixtureRow();
    const capture = rlData as Readonly<Record<string, unknown>>;
    const submit = capture['submitRoundIntentsArguments'];
    const context = capture['turnContext'];
    writeFileSync(arenaPath, `${canonicalJson(legacyRow)}\n`, 'utf8');
    writeFileSync(rolloutPath, [
      {
        type: 'response_item',
        payload: { type: 'message', role: 'developer', content: [{ text: 'K6 fixture instructions\n' }] },
      },
      {
        type: 'response_item',
        payload: {
          type: 'custom_tool_call_output',
          call_id: 'call-context',
          output: JSON.stringify({ structuredContent: context }),
        },
      },
      {
        type: 'response_item',
        payload: {
          type: 'custom_tool_call',
          call_id: 'call-submit',
          name: 'mcp__engine__engine_submit_round_intents',
          arguments: submit,
        },
      },
      {
        type: 'response_item',
        payload: {
          type: 'custom_tool_call_output',
          call_id: 'call-submit',
          output: JSON.stringify({
            structuredContent: { round_proposal_id: 'round:fixture-authorized' },
          }),
        },
      },
    ].map(canonicalJson).join('\n') + '\n', 'utf8');

    const stats = await extractSft({ arenaPaths: [arenaPath], rolloutPaths: [rolloutPath], outPath });

    expect(stats.examples).toBe(1);
    const example = JSON.parse(readFileSync(outPath, 'utf8')) as SftExample;
    expect(example.planHash).toBe('736ca86563291fa686e06d91d055145c6cfde87b41ac11518622e0c4617b430a');
    expect(example.sourceRow).toEqual({
      path: arenaPath,
      line: 1,
      seed: 3_943_001,
      basis: 'standard',
      room: 1,
      round: 1,
      proposalId: 'round:fixture-authorized',
    });
  });

  it('excludes service-null, auto-resolved, refused, and non-authorized rows', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd410-extract-exclusions-'));
    const arenaPath = join(directory, 'excluded.jsonl');
    const outPath = join(directory, 'sft.jsonl');
    const row = fixtureRow();
    writeFileSync(arenaPath, [
      { ...row, outcome: 'service_null', serviceNull: true },
      { ...row, outcome: 'auto_resolved', proposalId: null },
      { ...row, outcome: 'refused', proposalId: null },
      { ...row, outcome: 'awaiting_dm_adjudication', proposalId: null },
    ].map(canonicalJson).join('\n') + '\n', 'utf8');

    const stats = await extractSft({ arenaPaths: [arenaPath], rolloutPaths: [], outPath });

    expect(stats).toEqual({ examples: 0, rooms: 0, deduplicated: 0 });
    expect(readFileSync(outPath, 'utf8')).toBe('');
  });

  it('rejects captures carrying CC-BY-SA provenance', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd410-extract-license-'));
    const arenaPath = join(directory, 'forbidden.jsonl');
    const outPath = join(directory, 'sft.jsonl');
    const row = fixtureRow();
    const rlData = row['rlData'] as Readonly<Record<string, unknown>>;
    writeFileSync(arenaPath, `${canonicalJson({
      ...row,
      rlData: { ...rlData, sessionInstructions: 'content/cc-by-sa/forbidden' },
    })}\n`, 'utf8');

    await expect(extractSft({ arenaPaths: [arenaPath], rolloutPaths: [], outPath }))
      .rejects.toThrow('contains prohibited CC-BY-SA provenance');
  });

  it('runs on bad CLI arguments and exits nonzero with usage text', { timeout: 15_000 }, () => {
    const environment = { ...process.env };
    delete environment.FORCE_COLOR;
    delete environment.NO_COLOR;
    delete environment.VITEST;
    const result = spawnSync(process.execPath, [
      'node_modules/vite-node/vite-node.mjs',
      'tools/rl/extract-sft.ts',
      '--',
      '--not-an-extractor-option',
    ], { cwd: process.cwd(), encoding: 'utf8', env: environment });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Usage: rl:extract-sft');
    expect(result.stderr).toContain('Unknown extractor option --not-an-extractor-option.');
  });
});
