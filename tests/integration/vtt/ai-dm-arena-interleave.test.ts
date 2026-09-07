import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import {
  parseArenaArgs,
  runArena,
  type ArenaRow,
} from '../../../tools/ai-dm-arena';
import type {
  ConversationBoardSnapshotService,
  TurnContextRenderEvidence,
} from '../../../tools/ai-dm-conversation';
import type {
  BoardImageArtifact,
  BoardSnapshotCapture,
} from '../../../tools/ai-dm-board-snapshot';
import type { EngineMcpLauncherManifest } from '../../../src/vtt/mcp/entrypoint';

const ALL_OPTIONS_TEST_RENDERER_PROFILE = {
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
} as const;

class IsolatedModeSnapshotService implements ConversationBoardSnapshotService {
  readonly outputDirectory = mkdtempSync(join(tmpdir(), 'dnd-arena-mode-image-'));

  constructor(
    private readonly mode: 'advice' | 'blind',
  ) {}

  async capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact> {
    const png = Buffer.alloc(96);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
    png.writeUInt32BE(1, 16);
    png.writeUInt32BE(1, 20);
    Buffer.from(`${this.mode}:${input.source.stateDigest}`).copy(png, 24, 0, 64);
    const sha256 = createHash('sha256').update(png).digest('hex');
    const relativePath = `board-images/${sha256}.png` as const;
    mkdirSync(join(this.outputDirectory, 'board-images'), { recursive: true });
    writeFileSync(join(this.outputDirectory, relativePath), png);
    const html = Buffer.from(`<!doctype html><main>${this.mode}</main>\n`);
    const htmlSha256 = createHash('sha256').update(html).digest('hex');
    const htmlRelativePath = `board-html/${htmlSha256}/board.html` as const;
    mkdirSync(join(this.outputDirectory, 'board-html', htmlSha256), { recursive: true });
    writeFileSync(join(this.outputDirectory, htmlRelativePath), html);
    return {
      version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png',
      relativePath, sha256, bytes: png.byteLength, width: 1, height: 1,
      capturedAtUnixMs: Date.now(), captureMs: this.mode === 'blind' ? 11 : 13,
      source: { ...input.source }, chromiumVersion: 'SIMULATED Chromium',
      html: { relativePath: htmlRelativePath, sha256: htmlSha256, bytes: html.byteLength },
      ...(this.mode === 'advice' ? {} : {
        blindState: {
          informationMode: 'blind_state' as const, role: 'dm_board' as const, ordinal: 1,
          primerVersion: 'd562-general-board-primer-v10', glyphMode: 'full' as const,
          captureTilePx: 128 as const,
          domEvidence: {
            optionSurfaceAbsent: true as const, nextEventPreviewAbsent: true as const,
            coordinateLabels: 1, creatureBadges: 1, rosterEntries: 1, hpBars: 1,
            legendEntries: 1, blockedCells: 0, difficultCells: 0, obscuredCells: 0,
            illuminatedCells: 0, fogMarks: 0, doors: 0, objects: 0,
            hiddenMarks: 0, multiCellFootprints: 0,
          },
        },
      }),
    };
  }

  async close(): Promise<void> { return undefined; }
}

interface ModeIsolationEvidence {
  readonly advice: ArenaRow;
  readonly blind: ArenaRow;
  readonly launchers: readonly EngineMcpLauncherManifest[];
  readonly rendererEvidenceCacheSize: number;
}

const MODE_ISOLATION_EVIDENCE: ModeIsolationEvidence | Error = await (async (): Promise<ModeIsolationEvidence> => {
  const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-mode-isolation-'));
  const rendererEvidenceCache = new Map<string, TurnContextRenderEvidence>();
  const launchers: EngineMcpLauncherManifest[] = [];
  const runMode = async (mode: 'advice' | 'blind'): Promise<ArenaRow> => {
    const [row] = await runArena(parseArenaArgs([
      '--rooms', '1', '--reps', '1', '--seed', '3943001', '--basis', 'standard',
      '--out', join(directory, `${mode}.jsonl`), '--dry-run', '--dm-mode', mode,
      '--cli', 'codex', '--model', 'gpt-5.6-sol', '--effort', 'high',
    ]), {
      rendererEvidenceCache,
      boardSnapshotServiceFactory: async () => new IsolatedModeSnapshotService(mode),
      onPrimaryInvocation: (invocation) => {
        launchers.push(JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest);
      },
    });
    if (row === undefined) throw new Error(`${mode} isolation run emitted no row.`);
    return row;
  };
  const [advice, blind] = await Promise.all([runMode('advice'), runMode('blind')]);
  return { advice, blind, launchers, rendererEvidenceCacheSize: rendererEvidenceCache.size };
})().catch((error: unknown) => error instanceof Error ? error : new Error(String(error)));

describe('AI-DM arena interleave integration', () => {
  it('blind_resume_reuses_advice_session: isolates sessions, caches, deltas, images, and ingress recorders by mode', () => {
    if (MODE_ISOLATION_EVIDENCE instanceof Error) throw MODE_ISOLATION_EVIDENCE;
    const { advice, blind, launchers, rendererEvidenceCacheSize } = MODE_ISOLATION_EVIDENCE;
    const adviceLauncher = launchers.find((launcher) => launcher.dmMode === 'advice');
    const blindLauncher = launchers.find((launcher) => launcher.dmMode === 'blind');
    if (adviceLauncher === undefined || blindLauncher === undefined) {
      throw new Error('Mode isolation evidence omitted a launcher.');
    }

    expect(advice.sessionIdHash).not.toBe(blind.sessionIdHash);
    expect(advice).toEqual(expect.objectContaining({
      dmMode: 'advice', midRoundAdjustmentsEnabled: false, adjustmentBudget: 0,
      visualProfile: expect.objectContaining({ images: expect.any(Array) }),
    }));
    expect(blind).toEqual(expect.objectContaining({
      dmMode: 'blind', midRoundAdjustmentsEnabled: false, adjustmentBudget: 0,
    }));
    expect(advice.boardImage.mode).toBe('png');
    expect(blind.boardImage.mode).toBe('png');
    if (advice.boardImage.mode !== 'png' || blind.boardImage.mode !== 'png') {
      throw new Error('Mode isolation evidence omitted PNGs.');
    }
    expect(advice.boardImage.sha256).not.toBe(blind.boardImage.sha256);
    expect(rendererEvidenceCacheSize).toBe(2);
    expect(blind.turnContextGranularity).toBe('full');
    expect(blindLauncher.turnContextDeltaBase).toBeUndefined();
    expect(adviceLauncher.blindIngressSpoolPath).toBeUndefined();
    expect(blindLauncher.blindIngressSpoolPath).toMatch(/blind-ingress\.jsonl$/u);
    expect(advice).not.toHaveProperty('blindIngressAudit');
    expect(blind.blindIngressAudit).toEqual(expect.objectContaining({ passed: true }));
  });

  it('completes two dry-run arms through the real scheduler and MCP server within a bounded time', { timeout: 30_000 }, () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-cli-interleave-'));
    const outPath = join(directory, 'arena.jsonl');
    const environment = { ...process.env };
    delete environment.FORCE_COLOR;
    delete environment.NO_COLOR;
    delete environment.VITEST;
    const result = spawnSync(
      process.execPath,
      [
        'node_modules/vite-node/vite-node.mjs',
        'tools/ai-dm-arena.ts',
        '--rooms', '1',
        '--reps', '1',
        '--seed', '5117001',
        '--basis', 'hard',
        '--out', outPath,
        '--interleave',
        '--arm', 'control:model-control:low',
        '--arm', 'candidate:model-candidate:medium',
        '--combat-model', 'monster_block_v1',
        '--initiative-profile', 'legacy',
        '--renderer-profile', JSON.stringify(ALL_OPTIONS_TEST_RENDERER_PROFILE),
        '--cli-bin', 'definitely-not-a-real-codex-binary',
        '--dry-run',
      ],
      { cwd: process.cwd(), encoding: 'utf8', env: environment, timeout: 25_000 },
    );

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('[arena] interleave scheduling started arms=2 rooms=1 reps=1');
    expect(result.stdout).toContain('[arena] dispatch room=1 rep=1 arm=control model=model-control effort=low');
    expect(result.stdout).toContain('[arena] dispatch room=1 rep=1 arm=candidate model=model-candidate effort=medium');
    const rows = readFileSync(outPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as {
      readonly room: number;
      readonly round: number;
      readonly arm: string;
    });
    expect(rows).toEqual([
      { room: 1, round: 1, arm: 'control' },
      { room: 1, round: 1, arm: 'candidate' },
    ].map((expected) => expect.objectContaining(expected)));
  });
});
