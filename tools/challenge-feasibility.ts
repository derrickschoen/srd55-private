import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runChallengeReducerFeasibility } from '../src/vtt/challenge-feasibility';

const ROOT = resolve(import.meta.dirname, '..');

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

async function main(): Promise<void> {
  if (
    argument('--basis') !== 'challenge' ||
    argument('--seed') !== '5831001' ||
    argument('--rooms') !== '3' ||
    argument('--room-order') !== 'B,C,A' ||
    argument('--mode') !== 'reducer' ||
    argument('--limits') !== 'd583_bca_v1'
  ) {
    throw new TypeError(
      'Usage: challenge-feasibility --basis challenge --seed 5831001 --rooms 3 ' +
      '--room-order B,C,A --mode reducer --limits d583_bca_v1 --out /tmp/report.json',
    );
  }
  const output = argument('--out');
  if (output === null || !resolve(output).startsWith('/tmp/')) {
    throw new TypeError('Challenge feasibility output must be under /tmp.');
  }
  const report = await runChallengeReducerFeasibility(async (seed) => readFile(
    resolve(ROOT, `tests/fixtures/arena-basis-challenge/seed-${String(seed)}.json`), 'utf8',
  ));
  await writeFile(output, `${JSON.stringify(report)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ verdict: report.verdict, failure: report.failure, output })}\n`);
}

if (process.env['VITEST'] !== 'true') await main();
