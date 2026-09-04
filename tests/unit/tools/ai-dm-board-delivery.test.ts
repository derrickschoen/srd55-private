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
  validatedLauncherBoardImage,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import { generateRoom } from '../../../src/vtt/room-generator';
import {
  decodeArenaRowEvidence,
  parseArenaArgs,
  runArena,
} from '../../../tools/ai-dm-arena';
import {
  parseConversationArgs,
  runConversation,
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
const HEAD_RAW_CONTEXT_SHA256 = 'd5f1dfbcac2fdd93cadb4c2c6aa50a9d52a83f00bd71d57e6dd7908372ef0951';

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
    const artifact: BoardImageArtifact = {
      version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png',
      relativePath, sha256: digest, bytes: png.byteLength, width: 1, height: 1,
      capturedAtUnixMs: Date.now(), captureMs: 1, source: { ...input.source },
      chromiumVersion: 'SIMULATED Chromium',
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

function conversationArgs(outPath: string, boardImage?: 'off' | 'png'): readonly string[] {
  return [
    '--rooms', '1', '--rounds', '2', '--out', outPath, '--dry-run',
    '--capture-rl-data',
    '--model', 'gpt-5.6-luna', '--effort', 'low',
    '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
    ...(boardImage === undefined ? [] : ['--board-image', boardImage]),
  ];
}

describe('board image parsing and row evidence', () => {
  it('parses default/off/png as a closed mode in conversation and arena', () => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-parser-'));
    const conversationBase = ['--rooms', '1', '--rounds', '1', '--out', join(directory, 'c.jsonl')];
    const arenaBase = ['--rooms', '1', '--reps', '1', '--seed', '3943001', '--out', join(directory, 'a.jsonl')];
    expect(parseConversationArgs(conversationBase).boardImageMode).toBe('off');
    expect(parseConversationArgs([...conversationBase, '--board-image', 'off']).boardImageMode).toBe('off');
    expect(parseConversationArgs([...conversationBase, '--board-image', 'png']).boardImageMode).toBe('png');
    expect(parseArenaArgs(arenaBase).boardImageMode).toBe('off');
    expect(parseArenaArgs([...arenaBase, '--board-image', 'off']).boardImageMode).toBe('off');
    expect(parseArenaArgs([...arenaBase, '--board-image', 'png']).boardImageMode).toBe('png');
    expect(() => parseConversationArgs([...conversationBase, '--board-image', 'jpeg']))
      .toThrow('--board-image must be off or png');
    expect(() => parseArenaArgs([...arenaBase, '--board-image', 'jpeg']))
      .toThrow('--board-image must be off or png');
    expect(() => parseConversationArgs([
      ...conversationBase, '--board-image', 'png', '--transport', 'final_indices',
    ])).toThrow('--board-image png requires --transport mcp_minimal');
    expect(() => parseArenaArgs([
      ...arenaBase, '--board-image', 'png', '--transport', 'final_indices',
    ])).toThrow('--board-image png requires --transport mcp_minimal');
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
  it('captures each changed round state once, persists evidence, and closes one service', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-lifecycle-'));
    const service = new FakeSnapshotService();
    let starts = 0;
    const result = await runConversation(parseConversationArgs(conversationArgs(
      join(directory, 'rows.jsonl'), 'png',
    )), {
      roomStates: [generateRoom(3_943_006).encounter.state],
      adapter: new FastProposalAdapter(),
      boardSnapshotServiceFactory: async () => { starts += 1; return service; },
    });
    expect(result.rows).toHaveLength(2);
    expect(starts).toBe(1);
    expect(service.captures).toHaveLength(2);
    expect(service.captures[1]?.source.stateDigest).not.toBe(service.captures[0]?.source.stateDigest);
    expect(result.rows.map((row) => row.boardImage.mode)).toEqual(['png', 'png']);
    expect(result.rows.every((row) => row.effort === 'low' && row.escalationEffort === null)).toBe(true);
    expect(result.rows.every((row) => row.endToEndWall >= row.timeToFirstAction)).toBe(true);
    expect(result.rows.every((row) => row.boardImageEvidence !== null &&
      row.boardImageEvidence.capturedAtUnixMs <= row.boardImageEvidence.primaryDispatchStartedAtUnixMs)).toBe(true);
    for (const row of result.rows) {
      if (row.boardImage.mode !== 'png') throw new Error('PNG lifecycle row lost its board image.');
      expect(row.rawTurnContext).not.toContain(row.boardImage.sha256);
      expect(row.rawTurnContext).not.toContain(row.boardImage.relativePath);
      expect(JSON.stringify(row.rlData ?? null)).not.toContain(row.boardImage.sha256);
      expect(JSON.stringify(row.rlData ?? null)).not.toContain(row.boardImage.relativePath);
    }
    expect(service.closed).toBe(true);
  });

  it('board_image_stale_after_move prevents the second dispatch and still cleans up', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-stale-'));
    const service = new FakeSnapshotService();
    service.reuseFirstArtifact = true;
    let dispatches = 0;
    await expect(runConversation(parseConversationArgs(conversationArgs(
      join(directory, 'rows.jsonl'), 'png',
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
      '--dry-run', '--board-image', 'png', '--effort', 'low', '--initiative-profile', 'derived_v1',
    ]), {
      boardSnapshotServiceFactory: async () => { starts += 1; return service; },
      onPrimaryInvocation: () => { dispatches += 1; },
    })).rejects.toThrow('SIMULATED board capture failed');
    expect(dispatches).toBe(0);
    expect(starts).toBe(1);
    expect(service.closed).toBe(true);
  });

  it('image_flag_off_changes_prompt_bytes preserves the committed raw context and all invocation bytes', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'board-image-off-invariance-'));
    const invocations = new Map<string, AgentInvocation[]>();
    const run = async (label: 'default' | 'off') => {
      const captured: AgentInvocation[] = [];
      invocations.set(label, captured);
      const args = [
        '--rooms', '1', '--reps', '1', '--seed', '3943001',
        '--out', join(directory, `${label}.jsonl`), '--dry-run', '--effort', 'low',
        '--model', 'gpt-5.6-luna', '--transport', 'mcp_minimal',
        '--initiative-profile', 'derived_v1',
        ...(label === 'off' ? ['--board-image', 'off'] : []),
      ];
      return runArena(parseArenaArgs(args), {
        onPrimaryInvocation: (invocation) => { captured.push(structuredClone(invocation)); },
      });
    };
    const defaultResult = await run('default');
    const offResult = await run('off');
    expect(offResult.map((row) => row.rawTurnContext))
      .toEqual(defaultResult.map((row) => row.rawTurnContext));
    expect(invocations.get('off')?.map((entry) => ({
      prompt: entry.prompt, instructions: entry.instructions, output: entry.output,
    }))).toEqual(invocations.get('default')?.map((entry) => ({
      prompt: entry.prompt, instructions: entry.instructions, output: entry.output,
    })));

    const raw = offResult[0]?.rawTurnContext;
    if (raw === undefined) throw new TypeError('Off-arm row omitted rawTurnContext.');
    expect(Buffer.byteLength(raw)).toBe(32_120);
    expect(createHash('sha256').update(raw).digest('hex')).toBe(HEAD_RAW_CONTEXT_SHA256);

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
        },
      },
    } satisfies EngineMcpLauncherManifest;
    const image = await validatedLauncherBoardImage(manifest, state);
    expect(Buffer.from(image?.data ?? '', 'base64')).toEqual(png);

    const escaped = structuredClone(manifest) as unknown as Record<string, unknown>;
    const binding = record(escaped['boardImage'], 'board binding');
    const artifact = { ...record(binding['artifact'], 'artifact'), relativePath: '../outside.png' };
    escaped['boardImage'] = { ...binding, artifact };
    expect(decodeEngineMcpLauncherManifest(escaped)).toBeNull();
  });
});
