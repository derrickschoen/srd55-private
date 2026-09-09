import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  runChallengeReducerFeasibility,
  shelvedChallengeFeasibilityReport,
  type ChallengeReducerFeasibilityReportV1,
} from '../src/vtt/challenge-feasibility';

const ROOT = resolve(import.meta.dirname, '..');

function argument(args: readonly string[], name: string): string | null {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1] ?? null;
}

export interface ChallengeFeasibilityCliIo {
  readonly loadFixtureText: (seed: 5831001 | 5831002 | 5831003) => Promise<string>;
  readonly writeReport: (output: string, report: ChallengeReducerFeasibilityReportV1) => Promise<void>;
}

const PRODUCTION_IO: ChallengeFeasibilityCliIo = {
  loadFixtureText: async (seed) => readFile(
    resolve(ROOT, `tests/fixtures/arena-basis-challenge/seed-${String(seed)}.json`), 'utf8',
  ),
  writeReport: async (output, report) => writeFile(output, `${JSON.stringify(report)}\n`, 'utf8'),
};

export async function runChallengeFeasibilityCli(
  args: readonly string[],
  io: ChallengeFeasibilityCliIo = PRODUCTION_IO,
): Promise<Readonly<{ report: ChallengeReducerFeasibilityReportV1; output: string }>> {
  const output = argument(args, '--out');
  if (output === null || !resolve(output).startsWith('/tmp/')) {
    throw new TypeError('Challenge feasibility output must be under /tmp.');
  }
  if (
    argument(args, '--basis') !== 'challenge' ||
    argument(args, '--seed') !== '5831001' ||
    argument(args, '--rooms') !== '3' ||
    argument(args, '--room-order') !== 'B,C,A' ||
    argument(args, '--mode') !== 'reducer'
  ) {
    throw new TypeError(
      'Usage: challenge-feasibility --basis challenge --seed 5831001 --rooms 3 ' +
      '--room-order B,C,A --mode reducer --limits d583_bca_v1 --out /tmp/report.json',
    );
  }
  const suppliedLimits = argument(args, '--limits');
  const report = suppliedLimits === 'd583_bca_v1'
    ? await runChallengeReducerFeasibility(io.loadFixtureText)
    : shelvedChallengeFeasibilityReport({
        kind: 'missing_limits', counter: 'limits_profile',
        observed: suppliedLimits ?? '<missing>', limit: 'd583_bca_v1',
      });
  await io.writeReport(output, report);
  return { report, output };
}

async function main(): Promise<void> {
  const { report, output } = await runChallengeFeasibilityCli(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify({ verdict: report.verdict, failure: report.failure, output })}\n`);
}

if (process.env['VITEST'] !== 'true') await main();
