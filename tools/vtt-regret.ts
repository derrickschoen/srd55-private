import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { canonicalJson } from '../src/commands/canonical-json';
import {
  decodeExperimentTableRecord,
  VTT_EXPERIMENT_SCHEMA_VERSION,
  type ExperimentTableRecordV3,
} from '../src/vtt/experiment-telemetry';
import {
  aggregateTables,
  evaluateTable,
  type TableRegretReport,
} from '../src/vtt/regret/report';

interface CliConfig {
  readonly runDirectory: string;
  readonly outDirectory: string;
}

function parseArgs(args: readonly string[]): CliConfig {
  let runDirectory: string | null = null;
  let outDirectory: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === '--run' && value !== undefined) {
      runDirectory = resolve(value);
      index += 1;
    } else if (arg === '--out' && value !== undefined) {
      outDirectory = resolve(value);
      index += 1;
    } else {
      throw new TypeError(`Unknown or incomplete vtt:regret argument ${arg ?? '<missing>'}.`);
    }
  }
  if (runDirectory === null || outDirectory === null) {
    throw new TypeError('Usage: npm run vtt:regret -- --run <experiment-run> --out <report-directory>');
  }
  return { runDirectory, outDirectory };
}

async function readCurrentTable(path: string): Promise<ExperimentTableRecordV3> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  const table = decodeExperimentTableRecord(value);
  if (table.schemaVersion !== VTT_EXPERIMENT_SCHEMA_VERSION) {
    throw new Error(`Regret oracle requires experiment schema ${String(VTT_EXPERIMENT_SCHEMA_VERSION)} captures.`);
  }
  return table;
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));
  const names = (await readdir(config.runDirectory))
    .filter((name) => /^table-\d+\.json$/u.test(name))
    .sort();
  if (names.length === 0) throw new Error(`No experiment tables found in ${config.runDirectory}.`);
  await mkdir(config.outDirectory, { recursive: true });
  const reports: TableRegretReport[] = [];
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    if (name === undefined) continue;
    const table = await readCurrentTable(resolve(config.runDirectory, name));
    const report = await evaluateTable(name, table);
    reports.push(report);
    await writeFile(
      resolve(config.outDirectory, name.replace(/\.json$/u, '-regret.json')),
      `${canonicalJson(report)}\n`,
      'utf8',
    );
    process.stderr.write(
      `[vtt:regret] ${String(index + 1)}/${String(names.length)} ${basename(name)} ${String(report.decisions.length)} decisions\n`,
    );
  }
  const aggregate = aggregateTables(config.runDirectory, reports);
  await writeFile(
    resolve(config.outDirectory, 'aggregate.json'),
    `${canonicalJson(aggregate)}\n`,
    'utf8',
  );
  process.stdout.write(`${canonicalJson(aggregate)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
