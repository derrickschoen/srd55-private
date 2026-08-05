import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_PORT = 4173;
const MAX_DEFAULT_WORKERS = 4;

function positiveInteger(
  name: string,
  rawValue: string | undefined,
  fallback: number,
): number {
  const value = rawValue === undefined ? fallback : Number(rawValue);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer; received "${rawValue}".`);
  }
  return value;
}

export const playwrightWorkers = positiveInteger(
  'PLAYWRIGHT_WORKERS',
  process.env.PLAYWRIGHT_WORKERS,
  Math.min(MAX_DEFAULT_WORKERS, availableParallelism()),
);

export const playwrightBasePort = positiveInteger(
  'PLAYWRIGHT_PORT',
  process.env.PLAYWRIGHT_PORT,
  DEFAULT_PORT,
);

if (playwrightBasePort + playwrightWorkers - 1 > 65_535) {
  throw new Error(
    'PLAYWRIGHT_PORT plus PLAYWRIGHT_WORKERS exceeds the TCP port range.',
  );
}

export function workerPort(parallelIndex: number): number {
  if (
    !Number.isSafeInteger(parallelIndex) ||
    parallelIndex < 0 ||
    parallelIndex >= playwrightWorkers
  ) {
    throw new Error(
      `Playwright parallel index ${String(parallelIndex)} is outside the ` +
        `configured ${String(playwrightWorkers)}-worker pool.`,
    );
  }
  return playwrightBasePort + parallelIndex;
}

export function workerOrigin(parallelIndex: number): string {
  return `http://127.0.0.1:${String(workerPort(parallelIndex))}`;
}

export function workerViteCacheDir(parallelIndex: number): string {
  return join(
    tmpdir(),
    `dnd-multiclass-spells-static-vite-playwright-${String(workerPort(parallelIndex))}`,
  );
}
