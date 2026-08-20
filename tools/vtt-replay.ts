import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { canonicalJson } from '../src/commands/canonical-json';
import { decodeApprovedEncounterFixture } from '../src/vtt/generated-encounter-fixtures';
import { decodeReplayBundle, replayBundle, type ReplayProof } from '../src/vtt/replay';

export type ReplayFileReader = (path: string) => Promise<string>;

/** Offline command boundary: the only capabilities supplied are two file reads. */
export async function runVttReplayCommand(
  args: readonly string[],
  readText: ReplayFileReader = (path) => readFile(path, 'utf8'),
): Promise<ReplayProof> {
  const [bundlePath, fixturePath, ...rest] = args;
  if (bundlePath === undefined || fixturePath === undefined || rest.length > 0) {
    throw new Error('Usage: npm run vtt:replay -- <replay-bundle.json> <approved-fixture.json>');
  }
  const [bundleBytes, fixtureBytes] = await Promise.all([
    readText(bundlePath),
    readText(fixturePath),
  ]);
  const bundle = decodeReplayBundle(bundleBytes);
  const fixtureValue: unknown = JSON.parse(fixtureBytes);
  const fixture = decodeApprovedEncounterFixture(fixtureValue);
  return replayBundle(bundle, fixture);
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  runVttReplayCommand(process.argv.slice(2))
    .then((proof) => process.stdout.write(`${canonicalJson(proof)}\n`))
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
