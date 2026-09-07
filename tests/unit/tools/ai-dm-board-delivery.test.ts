import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  agentSessionIdFromCli,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { mcpRequestMeta, createMcpHandler } from '../../../src/vtt/mcp/handler';
import {
  decodeEngineMcpLauncherManifest,
  createEngineMcpRuntime,
  loadArenaFixture,
  validatedLauncherBoardHtmlReference,
  validatedLauncherBoardImage,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import { generateRoom } from '../../../src/vtt/room-generator';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import {
  decodeArenaRowEvidence,
  parseArenaArgs,
  runArena,
} from '../../../tools/ai-dm-arena';
import {
  BOARD_IMAGE_SCALE_STARTUP_INSTRUCTION,
  parseConversationArgs,
  runConversation,
  UI_FEEDBACK_STARTUP_INSTRUCTION,
  type BoardImageMode,
  type ConversationBoardSnapshotService,
} from '../../../tools/ai-dm-conversation';
import type {
  BoardImageArtifact,
  BoardImageSource,
  BoardSnapshotCapture,
} from '../../../tools/ai-dm-board-snapshot';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from '../../helpers/test-filesystem';

const META = mcpRequestMeta({ name: 'board-delivery-test', version: '1.0.0' });
// Pin = the intel-leak lane context (04fd8420: shown-option boundary, size-omission
// declarations) BEFORE the last-seen (D545) merge; the last-seen policy string and
// state handle are normalised back below so the pin stays independent of that merge.
const FOOTPRINTS_RAW_CONTEXT_SHA256 = 'aa841063ad0512d0f6b286318db802526da3efc5265a04d8b67f4d8351909d51';
const FOOTPRINTS_STATE_HANDLE = 'engine-state:c7c7b052bd70a39bf59c83277b7508d8bf52b69100fbde5939c8562ac8686842';
// The post-merge E1c pin is paired with byte identity across implicit defaults,
// explicit image-off, and an explicitly semantic-board-off renderer profile.
const E1C_RAW_CONTEXT_SHA256 = '418b9e16e31c01667a2bea7431e6affe3eccc9f80c353783551872bb6ae16118';

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function dimensionedPng(identity: string, bytes = 96): Buffer {
  const png = Buffer.alloc(bytes);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(1, 16);
  png.writeUInt32BE(1, 20);
  Buffer.from(identity, 'utf8').subarray(0, Math.max(0, bytes - 24)).copy(png, 24);
  return png;
}

function hashBytes(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

class FakeSnapshotService implements ConversationBoardSnapshotService {
  readonly outputDirectory: string;
  readonly captures: BoardSnapshotCapture[] = [];
  closed = false;
  reuseFirstArtifact = false;
  failCapture = false;
  #firstArtifact: BoardImageArtifact | null = null;

  constructor() {
    this.outputDirectory = mkdtempSync(join(tmpdir(), 'board-delivery-images-'));
  }

  async capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact> {
    if (this.failCapture) throw new Error('SIMULATED board capture failed.');
    this.captures.push(structuredClone(input));
    if (this.reuseFirstArtifact && this.#firstArtifact !== null) return this.#firstArtifact;
    const png = dimensionedPng(input.source.stateDigest);
    const digest = hashBytes(png);
    const relativePath = `board-images/${digest}.png` as const;
    mkdirSync(join(this.outputDirectory, 'board-images'), { recursive: true });
    writeFileSync(join(this.outputDirectory, relativePath), png);
    const htmlBytes = Buffer.from('<!doctype html><html lang="en"><body><main>SIMULATED board</main></body></html>\n');
    const htmlDigest = hashBytes(htmlBytes);
    const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
    mkdirSync(join(this.outputDirectory, 'board-html', htmlDigest), { recursive: true });
    writeFileSync(join(this.outputDirectory, htmlRelativePath), htmlBytes);
    const artifact: BoardImageArtifact = {
      version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png',
      relativePath, sha256: digest, bytes: png.byteLength, width: 1, height: 1,
      capturedAtUnixMs: Date.now(), captureMs: 1, source: { ...input.source },
      chromiumVersion: 'SIMULATED Chromium',
      html: { relativePath: htmlRelativePath, sha256: htmlDigest, bytes: htmlBytes.byteLength },
    };
    this.#firstArtifact ??= artifact;
    return artifact;
  }

  async close(): Promise<void> { this.closed = true; }
}

class FastProposalAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  async probe() { return { present: true, version: 'SIMULATED' }; }
  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    return this.dispatch(agentSessionIdFromCli('codex:board-image-fast-proposal'), invocation);
  }
  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    return this.dispatch(binding.sessionId, invocation);
  }
  classifyFailure(): 'unknown' { return 'unknown'; }
  private async dispatch(
    sessionId: AgentTurnResult['resumeSessionId'],
    invocation: AgentInvocation,
  ): Promise<AgentTurnResult> {
    const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    const state = await loadArenaFixture(manifest.fixturePath);
    const runtime = createEngineMcpRuntime(state, {
      runId: manifest.runId, branchId: manifest.branchId, revision: manifest.revision,
      requestId: manifest.requestId, phase: manifest.phase,
      correctionNumber: manifest.correctionNumber, room: manifest.room,
      historyKind: manifest.historyKind, toolProfile: 'dm',
      ...(manifest.initiativeProjection === undefined ? {} : {
        initiativeProjection: manifest.initiativeProjection,
      }),
    });
    const actors = runtime.feed.current().request?.actors;
    if (actors === undefined) throw new Error('Fast proposal fixture has no actors.');
    const proposals = actors.map((actorId) => {
      const options = runtime.feed.current().projection.combatants
        .find((combatant) => combatant.id === actorId)?.options ?? [];
      const primary = options.find((option) => option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === 'dodge'));
      const fallback = options.find((option) => option.optionId !== primary?.optionId);
      if (primary === undefined || fallback === undefined) {
        throw new Error(`Fast proposal fixture has too few options for ${actorId}.`);
      }
      return {
        actor_id: actorId, expected_revision: manifest.revision,
        primary_option_id: primary.optionId, fallback_option_id: fallback.optionId,
        reason: 'Dodge to advance the simulated round without external model work.',
        override_justification: { kind: 'missing_metric', id: 'expected_damage_milli' },
      };
    });
    const response = runtime.handler.handle({
      jsonrpc: '2.0', id: 'fast-proposal', method: 'tools/call',
      params: { _meta: META, name: 'engine.submit_round_proposals', arguments: { proposals } },
    });
    const result = record(record(response, 'fast proposal response')['result'], 'fast proposal result');
    if (result['isError'] !== false || runtime.proposals[0]?.kind !== 'round_turn_proposal') {
      throw new Error(`Fast proposal was rejected: ${JSON.stringify(result)}`);
    }
    writeFileSync(manifest.proposalSpoolPath, `${JSON.stringify(runtime.proposals[0])}\n`);
    return {
      resumeSessionId: sessionId,
      sessionId: null, finalText: 'SIMULATED', usage: null, exit: 'completed',
    };
  }
}

function conversationArgs(outPath: string, boardImage?: BoardImageMode): readonly string[] {
  return [
    '--rooms', '1', '--rounds', '2', '--out', outPath, '--dry-run',
    '--capture-rl-data',
    '--model', 'gpt-5.6-luna', '--effort', 'low',
    '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
    ...(boardImage === undefined ? [] : ['--board-image', boardImage]),
  ];
}

describe('board image parsing and row evidence', () => {
  it('parses default/off/png/capture_only as a closed mode in conversation and arena', () => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-parser-'));
    const conversationBase = ['--rooms', '1', '--rounds', '1', '--out', join(directory, 'c.jsonl')];
    const arenaBase = ['--rooms', '1', '--reps', '1', '--seed', '3943001', '--out', join(directory, 'a.jsonl')];
    expect(parseConversationArgs(conversationBase).boardImageMode).toBe('off');
    expect(parseConversationArgs(conversationBase).turnContextMaximumBytes).toBe(32 * 1024);
    expect(parseConversationArgs([
      ...conversationBase, '--turn-context-max-bytes', '24576',
    ]).turnContextMaximumBytes).toBe(24 * 1024);
    expect(parseConversationArgs([...conversationBase, '--board-image', 'off']).boardImageMode).toBe('off');
    expect(parseConversationArgs([...conversationBase, '--board-image', 'png']).boardImageMode).toBe('png');
    expect(parseConversationArgs([...conversationBase, '--board-image', 'capture_only']).boardImageMode)
      .toBe('capture_only');
    expect(parseArenaArgs(arenaBase).boardImageMode).toBe('off');
    expect(parseArenaArgs([...arenaBase, '--turn-context-max-bytes', '49152']).turnContextMaximumBytes)
      .toBe(48 * 1024);
    expect(parseArenaArgs([...arenaBase, '--board-image', 'off']).boardImageMode).toBe('off');
    expect(parseArenaArgs([...arenaBase, '--board-image', 'png']).boardImageMode).toBe('png');
    expect(parseArenaArgs([...arenaBase, '--board-image', 'capture_only']).boardImageMode)
      .toBe('capture_only');
    expect(() => parseConversationArgs([...conversationBase, '--board-image', 'jpeg']))
      .toThrow('--board-image must be off, png, or capture_only');
    expect(() => parseArenaArgs([...arenaBase, '--board-image', 'jpeg']))
      .toThrow('--board-image must be off, png, or capture_only');
    expect(() => parseConversationArgs([
      ...conversationBase, '--board-image', 'png', '--transport', 'final_indices',
    ])).toThrow('--board-image png requires --transport mcp_minimal');
    expect(() => parseArenaArgs([
      ...arenaBase, '--board-image', 'png', '--transport', 'final_indices',
    ])).toThrow('--board-image png requires --transport mcp_minimal');
  });

  it('keeps image bytes outside turn-context and maximum-tool-result accounting', async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117005.json');
    const maximumBytes = 24 * 1024;
    const png = dimensionedPng('image-accounting-mutant', 900_000);
    const evidence: Array<{
      readonly preTrimBytes: number;
      readonly postTrimBytes: number;
      readonly removals: unknown;
    }> = [];
    const runtime = (withImage: boolean) => createEngineMcpRuntime(state, {
      toolProfile: 'dm',
      turnContextMaximumBytes: maximumBytes,
      maximumToolResultBytes: maximumBytes,
      onTurnContextRendered: (value) => { evidence.push(value); },
      ...(withImage ? {
        boardImageContent: { type: 'image' as const, mimeType: 'image/png' as const, data: png.toString('base64') },
      } : {}),
    });
    const call = (withImage: boolean) => {
      const selected = runtime(withImage);
      const capsule = selected.feed.current();
      const response = selected.handler.handle({
        jsonrpc: '2.0', id: withImage ? 'image' : 'off', method: 'tools/call',
        params: {
          _meta: META,
          name: 'engine.get_turn_context',
          arguments: {
            run_id: capsule.runId,
            expected_revision: capsule.revision,
            scope: 'round',
            granularity: 'full',
            intel_mode: 'full',
          },
        },
      });
      const result = record(record(response, 'MCP response')['result'], 'MCP result');
      const context = record(result['structuredContent'], 'MCP structured content');
      return { result, context };
    };
    const off = call(false);
    const image = call(true);
    const optionIds = (context: Readonly<Record<string, unknown>>) => {
      const actors = context['actors'];
      if (!Array.isArray(actors)) throw new TypeError('Turn context omitted actors.');
      return actors.flatMap((actorValue) => {
        const options = record(actorValue, 'turn-context actor')['options'];
        if (!Array.isArray(options)) throw new TypeError('Turn-context actor omitted options.');
        return options.map((option) => String(record(option, 'turn-context option')['option_id']));
      });
    };

    expect(png.byteLength).toBeGreaterThan(maximumBytes);
    expect(image.result['isError']).toBe(false);
    expect(off.context).toEqual(image.context);
    expect(optionIds(off.context)).toEqual(optionIds(image.context));
    expect(off.context['semantic_board_truncated']).toBe(image.context['semantic_board_truncated']);
    expect(evidence).toHaveLength(2);
    expect(evidence[0]).toEqual(evidence[1]);
    expect(evidence[0]?.postTrimBytes).toBeLessThanOrEqual(maximumBytes);
    expect(evidence[0]?.preTrimBytes).toBeGreaterThan(evidence[0]?.postTrimBytes ?? maximumBytes);
    const content = image.result['content'];
    if (!Array.isArray(content)) throw new TypeError('Image MCP result omitted content blocks.');
    expect(content.map((block) => record(block, 'MCP content block')['type'])).toEqual(['text', 'image']);
    expect(Buffer.byteLength(JSON.stringify(image.context))).toBe(evidence[1]?.postTrimBytes);
  });

  it('effort_field_defaults_silently is killed by required current fields and explicit D510 null evidence', () => {
    expect(decodeArenaRowEvidence({ effort: 'medium', escalationEffort: null, boardImage: { mode: 'off' } }, 'increment_2'))
      .toEqual({ era: 'increment_2', effort: 'medium', escalationEffort: null, boardImage: { mode: 'off' } });
    expect(() => decodeArenaRowEvidence({ escalationEffort: null, boardImage: { mode: 'off' } }, 'increment_2'))
      .toThrow('requires a valid effort');
    expect(() => decodeArenaRowEvidence({ effort: 'low', escalationEffort: null }, 'increment_2'))
      .toThrow('requires boardImage');
    expect(decodeArenaRowEvidence({ roundProtocolVersion: 'd510-era' }, 'd510_legacy'))
      .toEqual({ era: 'd510_legacy', effort: null, escalationEffort: null, boardImage: null });
    expect(() => decodeArenaRowEvidence({ effort: 'low' }, 'd510_legacy'))
      .toThrow('must not claim Increment 2 evidence');
  });

  it('accepts capture_only row evidence with PNG-identical fields and rejects every unlisted mode', () => {
    const captured = {
      mode: 'capture_only', sha256: 'a'.repeat(64), bytes: 96, width: 1, height: 1,
      captureMs: 1, relativePath: `board-images/${'a'.repeat(64)}.png`,
    };
    expect(decodeArenaRowEvidence({
      effort: 'low', escalationEffort: null, boardImage: captured,
    }, 'increment_2').boardImage).toEqual(captured);
    expect(() => decodeArenaRowEvidence({
      effort: 'low', escalationEffort: null, boardImage: { ...captured, mode: 'jpeg' },
    }, 'increment_2')).toThrow('closed off|png|capture_only contract');
  });
});

describe('MCP board image content', () => {
  function callWithImage(png: Buffer, tool = 'engine.get_turn_context') {
    const handler = createMcpHandler({
      tools: [{
        descriptor: { name: tool, description: 'test', inputSchema: {} },
        validateArguments: () => [], validateOutput: () => [],
        execute: () => ({ exact: 'structured' }),
      }],
      toolResultContent: ({ name }) => name === 'engine.get_turn_context'
        ? [{ type: 'image', mimeType: 'image/png', data: png.toString('base64') }]
        : [],
    });
    const response = handler.handle({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { _meta: META, name: tool, arguments: {} },
    });
    return record(record(response, 'response')['result'], 'result');
  }

  it('returns unchanged text first, one PNG image second, and image-free structured content', () => {
    const png = dimensionedPng('one-image');
    const result = callWithImage(png);
    expect(result['content']).toEqual([
      { type: 'text', text: '{"exact":"structured"}' },
      { type: 'image', mimeType: 'image/png', data: png.toString('base64') },
    ]);
    expect(result['structuredContent']).toEqual({ exact: 'structured' });
    expect(JSON.stringify(result['structuredContent'])).not.toContain(png.toString('base64'));
    expect(callWithImage(png, 'engine.query_visibility')['content'])
      .toEqual([{ type: 'text', text: '{"exact":"structured"}' }]);
  });

  it('enforces the independent one-megabyte decoded PNG limit', () => {
    const result = callWithImage(dimensionedPng('oversize', 1_000_001));
    expect(result['isError']).toBe(true);
    expect(JSON.stringify(result['content'])).toContain('IMAGE_RESULT_TOO_LARGE');
  });
});

describe('arena capture lifecycle and off-arm invariance', () => {
  it('records delivered semantic-board bytes and truncation on the arena row', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'semantic-board-row-'));
    const profile = { ...DEFAULT_RENDERER_PROFILE, semanticBoard: true as const };
    const [row] = await runArena(parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001',
      '--out', join(directory, 'rows.jsonl'), '--dry-run', '--effort', 'low',
      '--model', 'gpt-5.6-luna', '--transport', 'mcp_minimal',
      '--initiative-profile', 'derived_v1', '--renderer-profile', JSON.stringify(profile),
    ]));
    if (row === undefined) throw new TypeError('Semantic-board arena omitted its row.');
    const context = record(JSON.parse(row.rawTurnContext) as unknown, 'semantic-board context');
    const board = record(context['semantic_board'], 'semantic-board block');
    const base = structuredClone(context) as Record<string, unknown>;
    delete base['semantic_board'];
    delete base['semantic_board_truncated'];

    expect(row.rendererAttribution.profile).toEqual(profile);
    expect(row.baseContextBytes).toBe(Buffer.byteLength(JSON.stringify(base)));
    expect(row.semanticBoardBytes).toBe(Buffer.byteLength(JSON.stringify(board)));
    expect(row.semanticBoardBytes).toBeGreaterThan(0);
    expect(row.semanticBoardTruncated).toEqual(context['semantic_board_truncated'] ?? []);
  });

  it.each(['png', 'capture_only'] as const)(
    'captures each changed round state once, persists %s evidence, and closes one service',
    { timeout: 60_000 },
    async (mode) => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-lifecycle-'));
    const service = new FakeSnapshotService();
    let starts = 0;
    const result = await runConversation(parseConversationArgs(conversationArgs(
      join(directory, 'rows.jsonl'), mode,
    )), {
      roomStates: [generateRoom(3_943_006).encounter.state],
      adapter: new FastProposalAdapter(),
      boardSnapshotServiceFactory: async () => { starts += 1; return service; },
    });
    expect(result.rows).toHaveLength(2);
    expect(starts).toBe(1);
    expect(service.captures).toHaveLength(2);
    expect(service.captures[1]?.source.stateDigest).not.toBe(service.captures[0]?.source.stateDigest);
    expect(result.rows.map((row) => row.boardImage.mode)).toEqual([mode, mode]);
    expect(result.rows.every((row) => row.effort === 'low' && row.escalationEffort === null)).toBe(true);
    expect(result.rows.every((row) => row.uiFeedback === null)).toBe(true);
    expect(result.rows.every((row) => row.endToEndWall >= row.timeToFirstAction)).toBe(true);
    expect(result.rows.every((row) => row.boardImageEvidence !== null &&
      row.boardImageEvidence.capturedAtUnixMs <= row.boardImageEvidence.primaryDispatchStartedAtUnixMs)).toBe(true);
    for (const row of result.rows) {
      if (row.boardImage.mode === 'off') throw new Error('Capturing lifecycle row lost its board image.');
      expect(row.rawTurnContext).not.toContain(row.boardImage.sha256);
      expect(row.rawTurnContext).not.toContain(row.boardImage.relativePath);
      expect(JSON.stringify(row.rlData ?? null)).not.toContain(row.boardImage.sha256);
      expect(JSON.stringify(row.rlData ?? null)).not.toContain(row.boardImage.relativePath);
    }
    expect(service.closed).toBe(true);
    },
  );

  it('board_image_stale_after_move prevents the second dispatch and still cleans up', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-stale-'));
    const service = new FakeSnapshotService();
    service.reuseFirstArtifact = true;
    let dispatches = 0;
    await expect(runConversation(parseConversationArgs(conversationArgs(
      join(directory, 'rows.jsonl'), 'capture_only',
    )), {
      roomStates: [generateRoom(3_943_006).encounter.state],
      adapter: new FastProposalAdapter(),
      boardSnapshotServiceFactory: async () => service,
      onPrimaryDispatchStart: () => { dispatches += 1; },
    })).rejects.toThrow(/stale/u);
    expect(dispatches).toBe(1);
    expect(service.closed).toBe(true);
  });

  it('capture failure is fatal before dispatch and closes the arena-owned lifecycle', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-failure-'));
    const service = new FakeSnapshotService();
    service.failCapture = true;
    let starts = 0;
    let dispatches = 0;
    await expect(runArena(parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001', '--out', join(directory, 'rows.jsonl'),
      '--dry-run', '--board-image', 'capture_only', '--effort', 'low', '--initiative-profile', 'derived_v1',
    ]), {
      boardSnapshotServiceFactory: async () => { starts += 1; return service; },
      onPrimaryInvocation: () => { dispatches += 1; },
    })).rejects.toThrow('SIMULATED board capture failed');
    expect(dispatches).toBe(0);
    expect(starts).toBe(1);
    expect(service.closed).toBe(true);
  });

  it('absent semantic-board and image-off flags preserve the committed raw context and invocation bytes', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'semantic-board-off-invariance-'));
    const invocations = new Map<string, AgentInvocation[]>();
    const run = async (label: 'default' | 'image-off' | 'semantic-absent') => {
      const captured: AgentInvocation[] = [];
      invocations.set(label, captured);
      const args = [
        '--rooms', '1', '--reps', '1', '--seed', '3943001',
        '--out', join(directory, `${label}.jsonl`), '--dry-run', '--effort', 'low',
        '--model', 'gpt-5.6-luna', '--transport', 'mcp_minimal',
        '--initiative-profile', 'derived_v1',
        ...(label === 'image-off' ? ['--board-image', 'off'] : []),
        ...(label === 'semantic-absent'
          ? ['--renderer-profile', JSON.stringify(DEFAULT_RENDERER_PROFILE)]
          : []),
      ];
      return runArena(parseArenaArgs(args), {
        onPrimaryInvocation: (invocation) => { captured.push(structuredClone(invocation)); },
      });
    };
    const defaultResult = await run('default');
    const offResult = await run('image-off');
    const absentResult = await run('semantic-absent');
    expect(absentResult.every((row) =>
      row.semanticBoardBytes === 0 && row.semanticBoardTruncated.length === 0)).toBe(true);
    for (const [label, result] of [['image-off', offResult], ['semantic-absent', absentResult]] as const) {
      expect(result.map((row) => row.rawTurnContext))
        .toEqual(defaultResult.map((row) => row.rawTurnContext));
      expect(invocations.get(label)?.map((entry) => ({
        prompt: entry.prompt, instructions: entry.instructions, output: entry.output,
      }))).toEqual(invocations.get('default')?.map((entry) => ({
        prompt: entry.prompt, instructions: entry.instructions, output: entry.output,
      })));
    }

    const raw = offResult[0]?.rawTurnContext;
    if (raw === undefined) throw new TypeError('Semantic-board-off row omitted rawTurnContext.');
    expect(Buffer.byteLength(raw)).toBe(31_995);
    expect(createHash('sha256').update(raw).digest('hex')).toBe(E1C_RAW_CONTEXT_SHA256);
  });

  it('persists simulated image feedback and gives judges the feedback beside the image', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-feedback-'));
    const service = new FakeSnapshotService();
    const invocations: AgentInvocation[] = [];
    const rows = await runArena(parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001', '--out', join(directory, 'rows.jsonl'),
      '--dry-run', '--board-image', 'png', '--effort', 'low', '--initiative-profile', 'derived_v1',
    ]), {
      boardSnapshotServiceFactory: async () => service,
      onPrimaryInvocation: (invocation) => { invocations.push(structuredClone(invocation)); },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.uiFeedback).toEqual({
      readability: 4,
      what_helped: ['The board picture made positions and nearby obstacles easy to compare.'],
      what_confused: [],
      missing: [],
      suggestion: 'Keep the board picture aligned with the same round context.',
    });
    expect(invocations[0]?.instructions?.split(UI_FEEDBACK_STARTUP_INSTRUCTION)).toHaveLength(2);
    expect(invocations[0]?.instructions?.split(BOARD_IMAGE_SCALE_STARTUP_INSTRUCTION)).toHaveLength(2);
    expect(service.closed).toBe(true);
  });

  it('capture_only_leaks_image_block is killed by off-arm byte identity at every model boundary', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-off-invariance-'));
    const invocations = new Map<string, AgentInvocation[]>();
    const services = new Map<string, FakeSnapshotService>();
    const run = async (label: 'default' | 'off' | 'capture_only') => {
      const captured: AgentInvocation[] = [];
      invocations.set(label, captured);
      const service = label === 'capture_only' ? new FakeSnapshotService() : null;
      if (service !== null) services.set(label, service);
      const args = [
        '--rooms', '1', '--reps', '1', '--seed', '3943001',
        '--out', join(directory, `${label}.jsonl`), '--dry-run', '--effort', 'low',
        '--model', 'gpt-5.6-luna', '--transport', 'mcp_minimal',
        '--initiative-profile', 'derived_v1',
        ...(label === 'default' ? [] : ['--board-image', label]),
      ];
      return runArena(parseArenaArgs(args), {
        onPrimaryInvocation: (invocation) => { captured.push(structuredClone(invocation)); },
        ...(service === null ? {} : { boardSnapshotServiceFactory: async () => service }),
      });
    };
    const defaultResult = await run('default');
    const offResult = await run('off');
    const captureOnlyResult = await run('capture_only');
    expect(offResult.map((row) => row.rawTurnContext))
      .toEqual(defaultResult.map((row) => row.rawTurnContext));
    expect(captureOnlyResult.map((row) => row.rawTurnContext))
      .toEqual(offResult.map((row) => row.rawTurnContext));
    const modelBoundary = (label: 'default' | 'off' | 'capture_only') => invocations.get(label)?.map((entry) => ({
      prompt: entry.prompt, instructions: entry.instructions, output: entry.output,
    }));
    expect(modelBoundary('off')).toEqual(modelBoundary('default'));
    expect(modelBoundary('capture_only')).toEqual(modelBoundary('off'));

    const offInvocation = invocations.get('off')?.[0];
    const captureOnlyInvocation = invocations.get('capture_only')?.[0];
    if (offInvocation === undefined || captureOnlyInvocation === undefined) {
      throw new TypeError('Byte-identity fixture omitted a primary invocation.');
    }
    const launcherMcpResult = async (invocation: AgentInvocation) => {
      const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
      const state = await loadArenaFixture(manifest.fixturePath);
      const boardImageContent = await validatedLauncherBoardImage(manifest, state);
      const runtime = createEngineMcpRuntime(state, {
        runId: manifest.runId, branchId: manifest.branchId, revision: manifest.revision,
        requestId: manifest.requestId, phase: manifest.phase,
        correctionNumber: manifest.correctionNumber, room: manifest.room,
        historyKind: manifest.historyKind, toolProfile: 'dm',
        ...(manifest.overridePolicy === undefined ? {} : { overridePolicy: manifest.overridePolicy }),
        ...(manifest.rendererProfile === undefined ? {} : { rendererProfile: manifest.rendererProfile }),
        ...(manifest.initiativeProjection === undefined ? {} : {
          initiativeProjection: manifest.initiativeProjection,
        }),
        ...(manifest.turnContextDeltaBase === undefined ? {} : {
          turnContextDeltaBase: manifest.turnContextDeltaBase,
        }),
        ...(boardImageContent === undefined ? {} : { boardImageContent }),
      });
      const response = runtime.handler.handle({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          _meta: META, name: 'engine.get_turn_context',
          arguments: {
            run_id: manifest.runId, expected_revision: manifest.revision, scope: 'round',
            intel_mode: 'full',
            ...(manifest.turnContextDeltaBase === undefined ? { granularity: 'full' } : {
              granularity: 'turn_delta', since_revision: manifest.turnContextDeltaBase.revision,
            }),
          },
        },
      });
      const result = record(record(response, 'launcher MCP response')['result'], 'launcher MCP result');
      return {
        toolManifest: canonicalJson(runtime.toolSurface.tools),
        content: result['content'],
        structuredContent: result['structuredContent'],
      };
    };
    const offMcp = await launcherMcpResult(offInvocation);
    const captureOnlyMcp = await launcherMcpResult(captureOnlyInvocation);
    expect(captureOnlyMcp.toolManifest).toBe(offMcp.toolManifest);
    expect(captureOnlyMcp.content).toEqual(offMcp.content);
    expect(captureOnlyMcp.structuredContent).toEqual(offMcp.structuredContent);
    expect(Array.isArray(captureOnlyMcp.content) && captureOnlyMcp.content).toHaveLength(1);
    expect(JSON.stringify(captureOnlyMcp.content)).not.toContain('image/png');

    const raw = offResult[0]?.rawTurnContext;
    if (raw === undefined) throw new TypeError('Off-arm row omitted rawTurnContext.');
    expect(Buffer.byteLength(raw)).toBe(31_995);
    const rawRecord = record(JSON.parse(raw) as unknown, 'off raw context');
    expect(record(rawRecord['actor_knowledge'], 'off actor knowledge')['policy'])
      .toBe('actor-knowledge-v3-last-seen');
    const stateHandle = record(rawRecord['state_ref'], 'off state ref')['state_handle'];
    expect(stateHandle).toMatch(/^engine-state:[0-9a-f]{64}$/u);
    expect(stateHandle).not.toBe(FOOTPRINTS_STATE_HANDLE);
    const baselineEquivalent = raw
      .replace('actor-knowledge-v3-last-seen', 'actor-knowledge-v2-creature-space')
      .replace(String(stateHandle), FOOTPRINTS_STATE_HANDLE);
    expect(Buffer.byteLength(baselineEquivalent)).toBe(32_000);
    expect(createHash('sha256').update(baselineEquivalent).digest('hex')).toBe(FOOTPRINTS_RAW_CONTEXT_SHA256);

    const offHandler = createMcpHandler({ tools: [{
      descriptor: { name: 'engine.get_turn_context', description: 'off-byte fixture', inputSchema: {} },
      validateArguments: () => [], validateOutput: () => [], execute: () => ({ exact: 'structured' }),
    }] });
    const offResponse = offHandler.handle({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { _meta: META, name: 'engine.get_turn_context', arguments: {} },
    });
    const offMcpResult = record(record(offResponse, 'off MCP response')['result'], 'off MCP result');
    expect(offMcpResult['content']).toEqual([{ type: 'text', text: '{"exact":"structured"}' }]);
    expect(offMcpResult['structuredContent']).toEqual({ exact: 'structured' });

    const captureOnlyRow = captureOnlyResult[0];
    if (captureOnlyRow?.boardImage.mode !== 'capture_only' || captureOnlyRow.boardImageEvidence === null) {
      throw new TypeError('Capture-only fixture omitted persisted board-image evidence.');
    }
    expect(services.get('capture_only')?.captures).toHaveLength(1);
    expect(services.get('capture_only')?.closed).toBe(true);
    expect(captureOnlyRow.boardImage.relativePath)
      .toBe(`board-images/${captureOnlyRow.boardImage.sha256}.png`);
    expect(offInvocation.instructions?.split(BOARD_IMAGE_SCALE_STARTUP_INSTRUCTION)).toHaveLength(1);
    expect(captureOnlyInvocation.instructions?.split(BOARD_IMAGE_SCALE_STARTUP_INSTRUCTION)).toHaveLength(1);
  });

  it('ui_feedback_offered_in_off_arm keeps the off-arm tool manifest byte-identical', () => {
    const state = generateRoom(3_943_006).encounter.state;
    const implicitOff = createEngineMcpRuntime(state, { toolProfile: 'dm' });
    const explicitOff = createEngineMcpRuntime(state, { toolProfile: 'dm' });
    const offBytes = canonicalJson(implicitOff.toolSurface.tools);
    expect(canonicalJson(explicitOff.toolSurface.tools)).toBe(offBytes);
    expect(offBytes).not.toContain('engine.submit_ui_feedback');

    const png = dimensionedPng('feedback-tool');
    const image = createEngineMcpRuntime(state, {
      toolProfile: 'dm',
      boardImageContent: { type: 'image', mimeType: 'image/png', data: png.toString('base64') },
    });
    expect(image.toolSurface.tools.map(({ name }) => name)).toContain('engine.submit_ui_feedback');
  });
});

describe('launcher image containment and binding', () => {
  it('validates bytes and rejects a path that is not content-addressed beneath the root', async () => {
    const root = mkdtempSync(join(tmpdir(), 'launcher-board-image-'));
    const state = { ...generateRoom(3_943_006).encounter.state, round: 1, revision: 1 };
    const png = dimensionedPng('launcher');
    const digest = hashBytes(png);
    const relativePath = `board-images/${digest}.png` as const;
    mkdirSync(join(root, 'board-images'), { recursive: true });
    writeFileSync(join(root, relativePath), png);
    const htmlBytes = Buffer.from('<!doctype html><html lang="en"><body><main>Board facts</main></body></html>\n');
    const htmlDigest = hashBytes(htmlBytes);
    const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
    mkdirSync(join(root, 'board-html', htmlDigest), { recursive: true });
    writeFileSync(join(root, htmlRelativePath), htmlBytes);
    const source: BoardImageSource = {
      room: 1, round: state.round, revision: state.revision,
      stateDigest: sha256(canonicalJson(state)),
    };
    const fixturePath = join(root, 'fixture.json');
    const proposalSpoolPath = join(root, 'proposals.jsonl');
    writeFileSync(fixturePath, canonicalJson({ encounter: { state } }));
    writeFileSync(proposalSpoolPath, '');
    const manifest = {
      format: 'engine-mcp-launcher-v1', fixturePath,
      proposalSpoolPath, runId: encounterSessionId('encounter:test'),
      branchId: encounterBranchId('branch:test'),
      revision: 2, requestId: 'request:test', phase: 'initial', correctionNumber: 0,
      room: 1, historyKind: 'room_ready', requestKind: 'round_plan',
      boardImage: {
        artifactRoot: root,
        primaryDispatchStartedAtUnixMs: 2,
        artifact: {
          version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png', relativePath,
          sha256: digest, bytes: png.byteLength, width: 1, height: 1,
          capturedAtUnixMs: 1, captureMs: 1, source, chromiumVersion: 'SIMULATED',
          html: {
            relativePath: htmlRelativePath,
            sha256: htmlDigest,
            bytes: htmlBytes.byteLength,
          },
        },
      },
    } satisfies EngineMcpLauncherManifest;
    const image = await validatedLauncherBoardImage(manifest, state);
    expect(Buffer.from(image?.data ?? '', 'base64')).toEqual(png);
    const htmlReference = await validatedLauncherBoardHtmlReference(manifest, state);
    expect(htmlReference?.text).toContain(htmlRelativePath);
    expect(htmlReference?.text).toContain(htmlDigest);

    const escaped = structuredClone(manifest) as unknown as Record<string, unknown>;
    const binding = record(escaped['boardImage'], 'board binding');
    const artifact = { ...record(binding['artifact'], 'artifact'), relativePath: '../outside.png' };
    escaped['boardImage'] = { ...binding, artifact };
    expect(decodeEngineMcpLauncherManifest(escaped)).toBeNull();
  });
});
