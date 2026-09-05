import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test } from './fixtures/parallel-test';

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
  const outputDirectory = resolve(
    `dnd-slim-runs/board-snapshot-browser-${String(process.pid)}-images`,
  );
  const result = await runBrowserCheck(outputDirectory);
  expect(result.benchmark.captures).toBe(2);
  // D516: seed-6203002 is 17×13 and seed-6203004 is 24×15; each board is
  // 2·2 px border + 2·24 px coordinate gutters + columns·64, and
  // 2·2 + 2·24 + rows·64 + 8 px gap + 120 px legend tall (boardChromeDimensions).
  expect(result.dimensions).toEqual(['1140x1012', '1588x1140']);
  expect(result.staleRejected).toBe(true);
  expect(result.identityRejected).toBe(true);
  expect(result.movedDigestChanged).toBe(true);
  expect(result.chromiumVersion).not.toBe('');
  expect(result.playwrightVersion).toBe('1.61.1');
});
