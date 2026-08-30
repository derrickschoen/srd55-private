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
      task: 'round_plan',
      messages: [
        { role: 'system', content: 'K6 fixture instructions\n' },
        {
          role: 'user',
          content: JSON.stringify({
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
            idempotency_key: 'fixture-round-proposals-initial',
            proposals: [{
              actor_id: 'combatant:fixture-monster',
              expected_revision: 6,
              primary_option_id: 'option:fixture-monster:6:dodge',
              fallback_option_id: null,
              override_justification: null,
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
      planHash: 'a6aea46082929ca6f4a70f82b0c3270971b5375da3744d99102398ca300da3f5',
      contextSource: 'raw',
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

  it('uses raw turn context verbatim and tags its source', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd414-extract-raw-'));
    const arenaPath = join(directory, 'raw.jsonl');
    const outPath = join(directory, 'sft.jsonl');
    const rawTurnContext = '{\n  "granularity": "turn_delta",\n  "exact": "payload bytes"\n}';
    const row = fixtureRow();
    const capture = row['rlData'] as Readonly<Record<string, unknown>>;
    writeFileSync(arenaPath, `${canonicalJson({
      ...row,
      rawTurnContext,
      turnContextGranularity: 'turn_delta',
      rlData: {
        ...capture,
        rawTurnContext,
        turnContext: JSON.parse(rawTurnContext) as Readonly<Record<string, unknown>>,
      },
    })}\n`, 'utf8');

    await extractSft({ arenaPaths: [arenaPath], rolloutPaths: [], outPath });

    const example = JSON.parse(readFileSync(outPath, 'utf8')) as SftExample;
    expect(example.messages[1].content).toBe(rawTurnContext);
    expect(example.contextSource).toBe('raw');
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
    const row = fixtureRow();
    const capture = row['rlData'] as Readonly<Record<string, unknown>>;
    writeFileSync(arenaPath, `${canonicalJson({
      ...row,
      sessionId: '019d2222-2222-7222-8222-222222222222',
      escalationSessionId: '019d3333-3333-7333-8333-333333333333',
      rlData: {
        ...capture,
        sessionId: '019d2222-2222-7222-8222-222222222222',
      },
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
    const submit = capture['submittedArguments'];
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
          name: 'mcp__engine__engine_submit_round_proposals',
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
    expect(example.planHash).toBe('a6aea46082929ca6f4a70f82b0c3270971b5375da3744d99102398ca300da3f5');
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

  it('separates v2 round-plan and adjustment tasks unless all is explicit', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd416-extract-task-separation-'));
    const arenaPath = join(directory, 'tasks.jsonl');
    const fixtureCapture = fixtureRow()['rlData'] as Readonly<Record<string, unknown>>;
    const turnContext = fixtureCapture['turnContext'] as Readonly<Record<string, unknown>>;
    const roundArguments = fixtureCapture['submittedArguments'] as Readonly<Record<string, unknown>>;
    const rawRound = canonicalJson(turnContext);
    const adjustmentArguments = {
      state_ref: {
        run_id: 'encounter:ai-dm-conversation',
        state_handle: `engine-state:${'b'.repeat(64)}`,
        expected_revision: 9,
      },
      request_id: 'request:room-1-round-1-pc-turn-1',
      phase: 'initial',
      baseline_plan_hash: 'c'.repeat(64),
      idempotency_key: 'adjustment-fixture',
      updates: [],
    };
    const commonCapture = {
      format: 'arena-rl-capture-v2',
      sourceLicense: 'project-generated',
      sessionInstructions: 'K6 fixture instructions\n',
      repoCommit: 'd'.repeat(40),
      model: 'gpt-5.6-luna',
      effort: 'low',
      sessionId: null,
      roundProtocolVersion: 3,
      partyPolicyHash: null,
      materialityPolicyHash: null,
    } as const;
    writeFileSync(arenaPath, `${canonicalJson({
      ...fixtureRow(),
      rlData: {
        ...commonCapture,
        task: 'round_plan',
        submissionTool: 'engine.submit_round_proposals',
        rawTurnContext: rawRound,
        turnContext,
        submittedArguments: roundArguments,
        stateDigest: 'a'.repeat(64),
        requestId: 'request:room-1-round-1',
        proposalId: 'round:fixture-authorized',
        parentPlanId: null,
      },
      adjustments: [{
        rlData: [{
          ...commonCapture,
          task: 'plan_adjustment',
          submissionTool: 'engine.submit_plan_adjustment',
          rawTurnContext: '{"granularity":"turn_delta","task":"adjustment"}',
          turnContext: { granularity: 'turn_delta', task: 'adjustment' },
          submittedArguments: adjustmentArguments,
          stateDigest: 'b'.repeat(64),
          requestId: 'request:room-1-round-1-pc-turn-1',
          proposalId: 'adjustment:fixture-authorized',
          parentPlanId: 'round:fixture-authorized',
        }],
      }],
    })}\n`, 'utf8');

    const roundOut = join(directory, 'round.jsonl');
    const adjustmentOut = join(directory, 'adjustment.jsonl');
    const allOut = join(directory, 'all.jsonl');
    await extractSft({ arenaPaths: [arenaPath], rolloutPaths: [], outPath: roundOut });
    await extractSft({
      arenaPaths: [arenaPath], rolloutPaths: [], outPath: adjustmentOut, task: 'plan_adjustment',
    });
    await extractSft({ arenaPaths: [arenaPath], rolloutPaths: [], outPath: allOut, task: 'all' });

    const round = JSON.parse(readFileSync(roundOut, 'utf8')) as SftExample;
    const adjustment = JSON.parse(readFileSync(adjustmentOut, 'utf8')) as SftExample;
    const all = readFileSync(allOut, 'utf8').trim().split('\n')
      .map((line) => JSON.parse(line) as SftExample);
    expect(round.task).toBe('round_plan');
    expect(round.messages[2].content).toBe(canonicalJson(roundArguments));
    expect(adjustment.task).toBe('plan_adjustment');
    expect(adjustment.messages[2].content).toBe(canonicalJson(adjustmentArguments));
    expect(all.map((example) => example.task)).toEqual(['round_plan', 'plan_adjustment']);
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
