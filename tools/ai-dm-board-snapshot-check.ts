import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { EncounterState } from '../src/combat/encounter';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import {
  BoardSnapshotService,
  assertBoardImageFresh,
  boardStateDigest,
  type BoardImageArtifact,
  type BoardImageSource,
} from './ai-dm-board-snapshot';

function sourceFor(state: EncounterState, room: number): BoardImageSource {
  return {
    room,
    round: state.round,
    revision: state.revision,
    stateDigest: boardStateDigest(state),
  };
}

function movedState(state: EncounterState): EncounterState {
  const first = state.tokens[0];
  if (first === undefined) throw new Error('Fixture has no token to move.');
  return {
    ...state,
    tokens: state.tokens.map((token, index) => index === 0
      ? { ...token, position: { column: token.position.column + 1, row: token.position.row } }
      : token),
  };
}

function percentile(values: readonly number[], fraction: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  const value = ordered[Math.ceil(ordered.length * fraction) - 1];
  if (value === undefined) throw new Error('Cannot take a percentile of an empty sample.');
  return value;
}

function requireEqual(left: unknown, right: unknown, label: string): void {
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label}: ${JSON.stringify(left)} !== ${JSON.stringify(right)}`);
  }
}

const outputArgument = process.argv[2];
if (outputArgument === undefined) throw new Error('Usage: ai-dm-board-snapshot-check.ts <artifact-directory-images>');
const mode = process.argv[3] === 'focused' ? 'focused' : 'benchmark';
const captureCount = mode === 'focused' ? 2 : 30;
const outputDirectory = resolve(outputArgument);
const small = await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203002.json');
const maximum = await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203004.json');
const service = await BoardSnapshotService.start({
  outputDirectory,
  forbiddenBoardStrings: ['arm-identity-canary', 'model-identity-canary', 'effort-identity-canary'],
});

try {
  const captures: BoardImageArtifact[] = [];
  for (let index = 0; index < captureCount; index += 1) {
    const state = mode === 'focused' || index % 2 === 0 ? small : maximum;
    captures.push(await service.capture({ state, source: sourceFor(state, index % 2 === 0 ? 2 : 4) }));
  }
  requireEqual(captures.length, captureCount, 'warmed capture count');
  const repeatedIndex = mode === 'focused' ? 1 : 2;
  requireEqual(captures[0]?.sha256, captures[repeatedIndex]?.sha256, 'same-state PNG digest');
  requireEqual(
    await readFile(join(outputDirectory, captures[0]!.relativePath)),
    await readFile(join(outputDirectory, captures[repeatedIndex]!.relativePath)),
    'same-state PNG bytes',
  );
  requireEqual(new Set(captures.map((artifact) => artifact.chromiumVersion)).size, 1, 'Chromium version count');
  if (!captures.every((artifact) => artifact.bytes > 0 && artifact.bytes <= 1_000_000)) {
    throw new Error('A board PNG violated the nonzero 1,000,000-byte contract.');
  }
  if (mode === 'benchmark') {
    requireEqual(
      [...new Set(captures.map((artifact) => `${String(artifact.width)}x${String(artifact.height)}`))].sort(),
      // D533: 64 px cells + 24 px coordinate gutters + the roster/object-aware
      // legend height. The fixture inputs independently give 8/7 roster rows
      // and 7/5 non-door object rows, respectively; see boardChromeDimensions().
      ['1140x1458', '1588x1502'],
      'captured dimensions',
    );
  }

  const captureTimes = captures.map((artifact) => artifact.captureMs);
  const benchmark = {
    version: 'arena-board-snapshot-benchmark-v1',
    captures: captureCount,
    coldStartMs: service.coldStartMs,
    warmedMedianMs: percentile(captureTimes, 0.5),
    warmedP95Ms: percentile(captureTimes, 0.95),
    warmedMaximumMs: Math.max(...captureTimes),
    pngBytes: captures.map((artifact) => artifact.bytes),
    dimensions: captures.map((artifact) => ({ width: artifact.width, height: artifact.height })),
  } as const;
  if (mode === 'benchmark' && (benchmark.warmedMedianMs > 500 || benchmark.warmedP95Ms > 1_000)) {
    throw new Error(`Snapshot performance budget failed: ${JSON.stringify(benchmark)}.`);
  }
  if (mode === 'benchmark') {
    const benchmarkBytes = Buffer.from(`${JSON.stringify(benchmark)}\n`, 'utf8');
    const benchmarkDigest = createHash('sha256').update(benchmarkBytes).digest('hex');
    const manifests = join(outputDirectory, 'manifests');
    await mkdir(manifests, { recursive: true });
    await writeFile(join(manifests, `${benchmarkDigest}.benchmark.json`), benchmarkBytes, { flag: 'wx' });
  }

  const moved = movedState(maximum);
  const movedSource = sourceFor(moved, 4);
  let staleRejected = false;
  try {
    assertBoardImageFresh(captures[1]!, moved, movedSource);
  } catch (error: unknown) {
    if (error instanceof Error && /stale/u.test(error.message)) staleRejected = true;
  }
  if (!staleRejected) throw new Error('board_image_stale_after_move was not rejected.');
  const movedArtifact = await service.capture({ state: moved, source: movedSource });
  if (movedArtifact.sha256 === captures[1]?.sha256) throw new Error('Moving a token did not change PNG bytes.');

  const identityState: EncounterState = {
    ...small,
    combatants: small.combatants.map((combatant, index) => index === 0
      ? { ...combatant, profile: { ...combatant.profile, name: 'arm-identity-canary' } }
      : combatant),
  };
  let identityRejected = false;
  try {
    await service.capture({ state: identityState, source: sourceFor(identityState, 2) });
  } catch (error: unknown) {
    if (error instanceof Error && /forbidden identity string/u.test(error.message)) identityRejected = true;
  }
  if (!identityRejected) throw new Error('Board-contained arm identity was not rejected.');

  const manifestPath = service.manifestPath;
  if (manifestPath === null) throw new Error('Snapshot service did not write a manifest.');
  const manifest: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest === null || typeof manifest !== 'object') throw new Error('Snapshot manifest is malformed.');
  const manifestViewport = Reflect.get(manifest, 'viewport');
  if (
    manifestViewport === null ||
    typeof manifestViewport !== 'object' ||
    Reflect.get(manifestViewport, 'width') !== 1_280 ||
    Reflect.get(manifestViewport, 'height') !== 1_280
  ) {
    throw new Error(`manifest viewport: ${JSON.stringify(manifestViewport)}`);
  }
  requireEqual(Reflect.get(manifest, 'deviceScaleFactor'), 1, 'manifest DPR');
  requireEqual(Reflect.get(manifest, 'tileSizeCssPx'), 64, 'manifest tile size');
  requireEqual(Reflect.get(manifest, 'maximumPngBytes'), 1_000_000, 'manifest PNG cap');

  process.stdout.write(`BOARD_SNAPSHOT_RESULT ${JSON.stringify({
    outputDirectory,
    manifestPath,
    chromiumVersion: captures[0]?.chromiumVersion,
    playwrightVersion: Reflect.get(manifest, 'playwrightVersion'),
    benchmark,
    minimumPngBytes: Math.min(...captures.map((artifact) => artifact.bytes)),
    maximumPngBytes: Math.max(...captures.map((artifact) => artifact.bytes)),
    dimensions: [...new Set([...captures, movedArtifact].map(
      (artifact) => `${String(artifact.width)}x${String(artifact.height)}`,
    ))].sort(),
    staleRejected,
    identityRejected,
    movedDigestChanged: movedArtifact.source.stateDigest !== captures[1]?.source.stateDigest,
  })}\n`);
} finally {
  await service.close();
}
