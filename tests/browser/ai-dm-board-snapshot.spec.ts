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
