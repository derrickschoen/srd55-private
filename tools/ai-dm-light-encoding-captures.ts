/**
 * D525: captures the same reference states under each light encoding through
 * the real snapshot service (production build, headless Chromium) and copies
 * the PNGs to test-results/ so the supervisor can run the comprehension probe
 * on each. No model is called here.
 *
 *   npx vite-node tools/ai-dm-light-encoding-captures.ts -- [--encodings tint,inverse,symbol]
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { LIGHT_ENCODINGS, isLightEncoding, type LightEncoding } from '../src/assets/light-encoding';
import { canonicalJson } from '../src/commands/canonical-json';
import { createEncounter, type EncounterState } from '../src/combat/encounter';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import { REFERENCE_MONSTER_ID, referenceEncounterSetup } from '../src/vtt/reference-encounter';
import { BoardSnapshotService, boardStateDigest, type BoardImageArtifact } from './ai-dm-board-snapshot';

const repositoryRoot = resolve(new URL('../', import.meta.url).pathname);

interface ReferenceState {
  readonly id: string;
  readonly state: EncounterState;
}

async function referenceStates(): Promise<readonly ReferenceState[]> {
  const arena = await loadArenaFixture(join(repositoryRoot, 'tests/fixtures/arena-basis-brutal/seed-6203002.json'));
  const reference = createEncounter(referenceEncounterSetup());
  const referenceWithHidden: EncounterState = {
    ...reference,
    hiddenCombatants: [{ combatant: REFERENCE_MONSTER_ID, stealthTotal: 20, edition: reference.rulesEdition }],
  };
  return [
    { id: 'arena-brutal-6203002', state: arena },
    { id: 'reference-hidden', state: referenceWithHidden },
  ];
}

function parseEncodings(argv: readonly string[]): readonly LightEncoding[] {
  const index = argv.indexOf('--encodings');
  if (index < 0) return LIGHT_ENCODINGS;
  const value = argv[index + 1];
  if (value === undefined) throw new TypeError('--encodings requires a comma-separated value.');
  return value.split(',').map((entry) => {
    if (!isLightEncoding(entry)) throw new TypeError(`Unknown light encoding ${entry}.`);
    return entry;
  });
}

export interface LightEncodingCapture {
  readonly encoding: LightEncoding;
  readonly stateId: string;
  readonly artifact: BoardImageArtifact;
  readonly outputPath: string;
}

export async function captureLightEncodings(
  encodings: readonly LightEncoding[],
  outputDirectory: string,
): Promise<readonly LightEncodingCapture[]> {
  const states = await referenceStates();
  await mkdir(outputDirectory, { recursive: true });
  const captures: LightEncodingCapture[] = [];
  for (const encoding of encodings) {
    const imagesRoot = join(repositoryRoot, 'dnd-slim-runs', `d525-light-${encoding}-images`);
    const service = await BoardSnapshotService.start({ outputDirectory: imagesRoot, lightEncoding: encoding });
    try {
      for (const [index, candidate] of states.entries()) {
        const artifact = await service.capture({
          state: candidate.state,
          source: {
            room: index + 1,
            round: candidate.state.round,
            revision: candidate.state.revision,
            stateDigest: boardStateDigest(candidate.state),
          },
        });
        const outputPath = join(outputDirectory, `d525-light-${encoding}-${candidate.id}.png`);
        await copyFile(join(imagesRoot, artifact.relativePath), outputPath);
        captures.push({ encoding, stateId: candidate.id, artifact, outputPath });
      }
    } finally {
      await service.close();
    }
  }
  await writeFile(join(outputDirectory, 'd525-light-encoding-captures.json'), `${canonicalJson(captures)}\n`, 'utf8');
  return captures;
}

const invokedPath = process.argv[1];
if (process.env['VITEST'] !== 'true' && invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-light-encoding-captures.ts') ||
  invokedPath.endsWith('/vite-node') || invokedPath.endsWith('/vite-node.mjs')
)) {
  const captures = await captureLightEncodings(parseEncodings(process.argv), join(repositoryRoot, 'test-results'));
  for (const capture of captures) {
    process.stdout.write(`${capture.encoding} ${capture.stateId} ${String(capture.artifact.width)}x${String(capture.artifact.height)} ${String(capture.artifact.bytes)} B sha256 ${capture.artifact.sha256} -> ${capture.outputPath}\n`);
  }
}
