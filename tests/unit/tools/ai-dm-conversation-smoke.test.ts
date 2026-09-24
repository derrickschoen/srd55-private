import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { parseConversationArgs, runConversation } from '../../../tools/ai-dm-conversation';
import { mkdtempSync } from '../../helpers/test-filesystem';
import {
  importSavedSession,
  exportSavedSession,
  MemoryBrowserSessionStore,
} from '../../../src/vtt/session-persistence';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import { DEFAULT_KB_HASH } from './ai-dm-conversation-fixtures';

const LEGACY_BLOCK_ARGS = [
  '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
] as const;
const ALL_OPTIONS_TEST_RENDERER_ARGS = [
  '--renderer-profile', JSON.stringify({
    ...DEFAULT_RENDERER_PROFILE,
    rows: 'off',
    movement: 'material_only',
    threats: 'counts_exception_ids',
    rare: 'triggered',
    knowledge: 'relevance_gated',
    frontier: 'off',
    failures: 'headline_codes',
    adverts: 'full',
    misc: 'merged',
    optionDetail: 'top2_stubs',
  }),
] as const;

describe('AI-DM engine MCP conversation runner', () => {
  it('runs a model-free stdio MCP dry-run smoke (mutation: count tool calls as KB reads)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-smoke-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config);

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', toolCalls: 2, kbReads: [], callsPerRound: 1,
        refusals: [], kbHash: DEFAULT_KB_HASH,
        contextRolloverOccurred: false,
        contextRolloverTriggerCount: 0,
        escalated: false,
        escalationSessionId: null,
      }),
    ]);
    expect(result.rows[0]?.tokens).toEqual({ input: 0, cachedInput: 0, output: 0, reasoning: 0 });
    const store = new MemoryBrowserSessionStore();
    const sessionId = importSavedSession(store, result.journalExport);
    expect(exportSavedSession(store, sessionId)).toBe(result.journalExport);
  });

  it('runs a three-room three-round model-free brutal smoke with the stub adapter', { timeout: 300_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-3round-smoke-'));
    const config = parseConversationArgs([
      '--fixtures', 'tests/fixtures/arena-basis-brutal',
      '--rooms', '3', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'derived_v1',
      '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config);

    expect(new Set(result.rows.map((row) => row.room))).toEqual(new Set([1, 2, 3]));
    expect(result.rows).toHaveLength(9);
    expect(result.rows.flatMap((row) => row.refusals)).toEqual([]);
    expect(result.rows.every((row) => row.knowledgeModel === 'engine_state')).toBe(true);
  });

  it('retries one SIMULATED service flap and uses the first healthy primary turn', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-flap-recovery-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config, {
      flapPrimaryByRequest: { 'room-1-round-1': 1 },
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', flapRetries: 1, serviceNull: false,
        toolCalls: 2, refusals: [],
      }),
    ]);
  });

  it('marks three consecutive SIMULATED service flaps as service_null without exhausting the turn', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-service-null-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      flapPrimaryByRequest: { 'room-1-round-1': 3 },
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'service_null', flapRetries: 2, serviceNull: true,
        toolCalls: 0, proposalId: null, refusals: [],
        plannedBy: null, escalated: false, escalationModel: null,
        authorizedPlan: null, roundNarrative: null,
        chainEvidence: { failedAttempts: [], autoResolvedTrigger: null, correctionFinalText: null },
      }),
    ]);
    expect(result.rows[0]?.projectionRevision).toBe(result.rows[0]?.contextRevision);
  });

  it('does not retry a SIMULATED primary turn that called engine tools before rejection', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-engine-rejection-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config, {
      invalidInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', planner: 'engine_default', flapRetries: 0, serviceNull: false,
        toolCalls: 3,
        chainEvidence: expect.objectContaining({
          failedAttempts: expect.arrayContaining([
            expect.objectContaining({ attempt: 'primary' }),
            expect.objectContaining({ attempt: 'fallback' }),
          ]),
        }),
      }),
    ]);
  });
});
