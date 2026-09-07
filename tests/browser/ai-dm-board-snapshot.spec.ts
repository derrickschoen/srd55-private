import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  boardChromeDimensions,
  type BoardChromeTilePx,
} from '../../src/vtt/board-chrome-layout';
import { expect, test } from './fixtures/parallel-test';

const CAPTURE_TILE_PX = 128 satisfies BoardChromeTilePx;

function expectedBoardDimensions(
  bounds: { readonly columns: number; readonly rows: number },
  content: { readonly combatants: number; readonly objects: number },
  tilePx: BoardChromeTilePx = CAPTURE_TILE_PX,
): string {
  const { width, height } = boardChromeDimensions(
    bounds,
    {
      combatants: Array.from({ length: content.combatants }, () => ({ name: 'CREATURE' })),
      objects: Array.from({ length: content.objects }, () => ({ kind: 'object' })),
    },
    tilePx,
  );
  return `${String(width)}x${String(height)}`;
}

const productionBuild = spawnSync(process.execPath, ['tools/dist-build-cache.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, NODE_ENV: 'production' },
});
if (productionBuild.status !== 0) {
  throw new Error(
    `Snapshot production build prerequisite failed (${String(productionBuild.status ?? productionBuild.signal)}).\n` +
    `${productionBuild.stdout}${productionBuild.stderr}`,
  );
}

interface BrowserCheckResult {
  readonly chromiumVersion: string;
  readonly playwrightVersion: string;
  readonly benchmark: {
    readonly captures: number;
    readonly warmedMedianMs: number;
    readonly warmedP95Ms: number;
  };
  readonly dimensions: readonly string[];
  readonly staleRejected: boolean;
  readonly identityRejected: boolean;
  readonly movedDigestChanged: boolean;
  readonly manifestCarriesHtml: boolean;
}

interface BlindBrowserCheckResult {
  readonly primerVersion: string;
  readonly captureTilePx: number;
  readonly results: readonly {
    readonly difficulty: 'hard' | 'brutal';
    readonly seed: number;
    readonly revision: number;
    readonly stateDigest: string;
    readonly images: readonly {
      readonly role: 'dm_board' | 'accessible_board_raster' | 'player_board';
      readonly ordinal: number;
      readonly sha256: string;
      readonly bytes: number;
      readonly width: number;
      readonly height: number;
      readonly path: string;
    }[];
  }[];
}

async function runBrowserCheck(outputDirectory: string): Promise<BrowserCheckResult> {
  const output = await new Promise<{ readonly stdout: string; readonly stderr: string }>((resolveRun, reject) => {
    const child = spawn('npx', [
      'vite-node',
      'tools/ai-dm-board-snapshot-check.ts',
      '--',
      outputDirectory,
      'focused',
    ], { cwd: process.cwd(), env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else reject(new Error(`Snapshot check failed (${String(code ?? signal)}).\n${stdout}\n${stderr}`));
    });
  });
  const line = output.stdout.split('\n').find((candidate) => candidate.startsWith('BOARD_SNAPSHOT_RESULT '));
  if (line === undefined) throw new Error(`Snapshot check emitted no result.\n${output.stdout}\n${output.stderr}`);
  return JSON.parse(line.slice('BOARD_SNAPSHOT_RESULT '.length)) as BrowserCheckResult;
}

async function runBlindBrowserCheck(outputDirectory: string): Promise<BlindBrowserCheckResult> {
  const output = await new Promise<{ readonly stdout: string; readonly stderr: string }>((resolveRun, reject) => {
    const child = spawn('npx', [
      'vite-node',
      'tools/ai-dm-blind-board-snapshot-check.ts',
      '--',
      outputDirectory,
    ], { cwd: process.cwd(), env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else reject(new Error(`Blind snapshot check failed (${String(code ?? signal)}).\n${stdout}\n${stderr}`));
    });
  });
  const line = output.stdout.split('\n').find((candidate) =>
    candidate.startsWith('BLIND_BOARD_SNAPSHOT_RESULT '));
  if (line === undefined) {
    throw new Error(`Blind snapshot check emitted no result.\n${output.stdout}\n${output.stderr}`);
  }
  return JSON.parse(line.slice('BLIND_BOARD_SNAPSHOT_RESULT '.length)) as BlindBrowserCheckResult;
}

test('captures the full production DM board deterministically through durable save upload/load', async () => {
  expect(expectedBoardDimensions({ columns: 17, rows: 13 }, { combatants: 0, objects: 0 }, 64))
    .toBe('1140x1012');
  expect(expectedBoardDimensions({ columns: 24, rows: 15 }, { combatants: 0, objects: 0 }, 64))
    .toBe('1588x1140');

  const outputDirectory = resolve(
    `dnd-slim-runs/board-snapshot-browser-${String(process.pid)}-images`,
  );
  const result = await runBrowserCheck(outputDirectory);
  expect(result.benchmark.captures).toBe(2);
  const expectedDimensions = [
    expectedBoardDimensions({ columns: 17, rows: 13 }, { combatants: 8, objects: 7 }),
    expectedBoardDimensions({ columns: 24, rows: 15 }, { combatants: 7, objects: 5 }),
  ].sort();
  expect(result.dimensions).toEqual(expectedDimensions);
  expect(result.staleRejected).toBe(true);
  expect(result.identityRejected).toBe(true);
  expect(result.movedDigestChanged).toBe(true);
  expect(result.manifestCarriesHtml).toBe(true);
  expect(result.chromiumVersion).not.toBe('');
  expect(result.playwrightVersion).toBe('1.61.1');
});

test('captures synchronized state-only DM, accessible-raster, and player evidence', async () => {
  const outputDirectory = resolve(
    `dnd-slim-runs/blind-board-snapshot-browser-${String(process.pid)}-images`,
  );
  const result = await runBlindBrowserCheck(outputDirectory);
  expect(result.primerVersion).toBe('d562-general-board-primer-v10');
  expect(result.captureTilePx).toBe(128);
  expect(result.results.map(({ difficulty, seed }) => ({ difficulty, seed }))).toEqual([
    { difficulty: 'hard', seed: 5_117_001 },
    { difficulty: 'brutal', seed: 6_203_001 },
  ]);
  for (const family of result.results) {
    expect(family.stateDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(family.images.map(({ role, ordinal }) => ({ role, ordinal }))).toEqual([
      { role: 'dm_board', ordinal: 1 },
      { role: 'accessible_board_raster', ordinal: 2 },
      { role: 'player_board', ordinal: 3 },
    ]);
    expect(new Set(family.images.map(({ sha256 }) => sha256)).size).toBe(3);
    expect(family.images.every((image) =>
      image.bytes > 0 && image.bytes <= 1_000_000 && image.width > 0 && image.height > 0 &&
      image.path.endsWith(`${image.sha256}.png`))).toBe(true);
  }
});
