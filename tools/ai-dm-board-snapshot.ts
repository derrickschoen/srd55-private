import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { arch, platform, release, tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { preview, type PreviewServer } from 'vite';
import { canonicalJson } from '../src/commands/canonical-json';
import type { ControllerIdentity } from '../src/combat/controllers';
import type { PersistedCoordinatorState } from '../src/combat/coordinator';
import type { EncounterState } from '../src/combat/encounter';
import { projectDmView } from '../src/combat/visibility';
import { mulberry32 } from '../src/combat/random';
import { isBoardGlyphMode, type BoardGlyphMode } from '../src/assets/board-glyphs';
import {
  encounterBranchId,
  encounterSessionId,
  type EncounterSessionId,
} from '../src/combat/values';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  exportSavedSession,
} from '../src/vtt/session-persistence';
import { projectEncounterBoard } from '../src/vtt/encounter-board';
import { serializeAccessibleBoard } from '../src/vtt/accessible-board';

const repositoryRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export const MAX_BOARD_PNG_BYTES = 1_000_000;
const VIEWPORT = Object.freeze({ width: 1_280, height: 1_280 });
const SNAPSHOT_CANARY = 'board-snapshot-element-crop-canary';
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export function configuredPreviewPort(
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): number {
  const raw = environment['BOARD_SNAPSHOT_PREVIEW_PORT'];
  if (raw === undefined) return 0;
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError(
      `BOARD_SNAPSHOT_PREVIEW_PORT must be a valid port; received "${raw}".`,
    );
  }
  return port;
}

export type CaptureTilePx = 64 | 128;
export type BoardSnapshotInformationMode = 'advice' | 'blind_state';
export type BoardSnapshotImageRole = 'dm_board' | 'accessible_board_raster' | 'player_board';
export const BLIND_STATE_PRIMER_VERSION = 'd562-general-board-primer-v10' as const;
export const BOARD_SNAPSHOT_IMAGE_ROLES = Object.freeze([
  'dm_board',
  'accessible_board_raster',
  'player_board',
] as const satisfies readonly BoardSnapshotImageRole[]);

export function boardSnapshotInformationMode(
  mode?: BoardSnapshotInformationMode,
): BoardSnapshotInformationMode {
  return mode ?? 'advice';
}

export function boardSnapshotCaptureGeometry(
  captureTilePx: CaptureTilePx = 128,
): {
  readonly tileSizeCssPx: CaptureTilePx;
  readonly markerHeightCssPx: number;
} {
  return {
    tileSizeCssPx: captureTilePx,
    markerHeightCssPx: captureTilePx * 10,
  };
}

export interface BoardImageSource {
  readonly room: number;
  readonly round: number;
  readonly revision: number;
  readonly stateDigest: string;
}

export interface BoardImageArtifact {
  readonly version: 'arena-board-image-v1';
  readonly audience: 'dm';
  readonly mimeType: 'image/png';
  readonly relativePath: `board-images/${string}.png`;
  readonly sha256: string;
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
  readonly capturedAtUnixMs: number;
  readonly captureMs: number;
  readonly source: BoardImageSource;
  readonly chromiumVersion: string;
  readonly html: BoardHtmlArtifact;
  /** Present only for the D569 state-only family; omitted advice artifacts keep legacy bytes. */
  readonly blindState?: {
    readonly informationMode: 'blind_state';
    readonly role: BoardSnapshotImageRole;
    readonly ordinal: number;
    readonly primerVersion: string;
    readonly glyphMode: BoardGlyphMode;
    readonly captureTilePx: CaptureTilePx;
    readonly domEvidence: BoardSnapshotDomEvidence;
  };
}

export interface BoardSnapshotDomEvidence {
  readonly optionSurfaceAbsent: true;
  readonly nextEventPreviewAbsent: true;
  readonly coordinateLabels: number;
  readonly creatureBadges: number;
  readonly rosterEntries: number;
  readonly hpBars: number;
  readonly legendEntries: number;
  readonly blockedCells: number;
  readonly difficultCells: number;
  readonly obscuredCells: number;
  readonly illuminatedCells: number;
  readonly fogMarks: number;
  readonly doors: number;
  readonly objects: number;
  readonly hiddenMarks: number;
  readonly multiCellFootprints: number;
}

export interface BoardHtmlArtifact {
  readonly relativePath: `board-html/${string}/board.html`;
  readonly sha256: string;
  readonly bytes: number;
}

export interface BoardSnapshotManifest {
  readonly version: 'arena-board-snapshot-manifest-v1';
  readonly chromiumVersion: string;
  readonly playwrightVersion: string;
  readonly executableSha256: string;
  readonly os: {
    readonly platform: string;
    readonly release: string;
    readonly architecture: string;
  };
  readonly viewport: { readonly width: 1_280; readonly height: 1_280 };
  readonly deviceScaleFactor: 1;
  readonly tileSizeCssPx: CaptureTilePx;
  readonly maximumPngBytes: 1_000_000;
  readonly capturePolicy: 'encounter-board-element-settled-v1';
  /** D525: the glyph mode forced through the snapshot page's URL, or null when the art package decided. */
  readonly boardGlyphsOverride: BoardGlyphMode | null;
  readonly coldStartMs: number;
  readonly artifacts: readonly BoardImageArtifact[];
}

export interface BoardSnapshotCapture {
  readonly state: EncounterState;
  readonly source: BoardImageSource;
  readonly role?: BoardSnapshotImageRole;
}

export interface BoardSnapshotServiceOptions {
  readonly outputDirectory: string;
  readonly forbiddenBoardStrings?: readonly string[];
  /** D525: render every capture under this glyph mode; a board that says otherwise is never captured. */
  readonly boardGlyphs?: BoardGlyphMode;
  /** D561: CSS raster scale for the diagnostic capture; native art remains unchanged. */
  readonly captureTilePx?: CaptureTilePx;
  /** D569: advice is deliberately implicit so old capture URLs and artifacts are byte-identical. */
  readonly informationMode?: BoardSnapshotInformationMode;
  readonly primerVersion?: string;
}

function sha256Bytes(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function boardStateDigest(state: EncounterState): string {
  return sha256Bytes(Buffer.from(canonicalJson(state), 'utf8'));
}

function validateSource(state: EncounterState, source: BoardImageSource): void {
  if (!Number.isSafeInteger(source.room) || source.room < 1) {
    throw new RangeError('Board image room must be a positive safe integer.');
  }
  if (source.round !== state.round) {
    throw new Error(`Board image round ${String(source.round)} does not match state round ${String(state.round)}.`);
  }
  if (source.revision !== state.revision) {
    throw new Error(`Board image revision ${String(source.revision)} does not match state revision ${String(state.revision)}.`);
  }
  if (!SHA256_PATTERN.test(source.stateDigest)) {
    throw new TypeError('Board image state digest must be a lowercase SHA-256 digest.');
  }
  const digest = boardStateDigest(state);
  if (source.stateDigest !== digest) {
    throw new Error(`Board image state digest ${source.stateDigest} does not match canonical state ${digest}.`);
  }
}

export function assertBoardImageFresh(
  artifact: BoardImageArtifact,
  state: EncounterState,
  source: BoardImageSource,
): void {
  validateSource(state, source);
  if (
    artifact.source.room !== source.room ||
    artifact.source.round !== source.round ||
    artifact.source.revision !== source.revision ||
    artifact.source.stateDigest !== source.stateDigest
  ) {
    throw new Error('Board image artifact is stale for the current encounter state.');
  }
}

export function assertSynchronizedBoardImages(input: {
  readonly artifacts: readonly BoardImageArtifact[];
  readonly state: EncounterState;
  readonly source: BoardImageSource;
  readonly primaryDispatchStartedAtUnixMs: number;
}): void {
  if (input.artifacts.length === 0) throw new TypeError('A visual family must not be empty.');
  const roles = new Set<BoardSnapshotImageRole>();
  for (const [index, artifact] of input.artifacts.entries()) {
    assertBoardImageFresh(artifact, input.state, input.source);
    const blind = artifact.blindState;
    if (blind === undefined || blind.ordinal !== index + 1 || roles.has(blind.role)) {
      throw new Error('Blind visual roles must be unique and use contiguous delivery ordinals.');
    }
    if (artifact.capturedAtUnixMs > input.primaryDispatchStartedAtUnixMs) {
      throw new Error('Every blind visual must be captured before primary model dispatch.');
    }
    roles.add(blind.role);
  }
}

function allHumanControllers(state: EncounterState): readonly ControllerIdentity[] {
  return state.combatants.map((combatant) => ({
    combatantId: combatant.profile.id,
    controllerId: `snapshot:${String(combatant.profile.id)}:human`,
    kind: 'human' as const,
    generation: 0,
  })).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
}

const INTERRUPTED_COORDINATOR: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: { kind: 'interrupted' },
};

export function createBoardSnapshotSessionBundle(
  state: EncounterState,
  source: BoardImageSource,
  captureOrdinal: number,
): { readonly sessionId: EncounterSessionId; readonly bytes: string } {
  validateSource(state, source);
  if (!Number.isSafeInteger(captureOrdinal) || captureOrdinal < 1) {
    throw new RangeError('Board capture ordinal must be a positive safe integer.');
  }
  const sessionId = encounterSessionId(
    `board-snapshot:${source.stateDigest}:${String(captureOrdinal)}`,
  );
  const store = new MemoryBrowserSessionStore();
  EncounterSessionJournal.create({
    sessionId,
    branchId: encounterBranchId(`branch:board-snapshot:${source.stateDigest}`),
    encounterState: state,
    coordinatorState: INTERRUPTED_COORDINATOR,
    controllers: allHumanControllers(state),
    rng: mulberry32(0x50a9_504),
    store,
    mirror: new MemoryMirrorSink(),
  });
  return { sessionId, bytes: exportSavedSession(store, sessionId) };
}

async function runDistBuildCache(): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['tools/dist-build-cache.mjs'], {
      cwd: repositoryRoot,
      // vite-node sets a development-flavoured NODE_ENV for this tool process.
      // The preview artifact must be the same production build that ships.
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(
        signal === null
          ? `Dist build cache exited with code ${String(code)}.`
          : `Dist build cache exited on signal ${signal}.`,
      ));
    });
  });
}

function actualPort(server: PreviewServer): number {
  const address = server.httpServer.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Vite preview did not expose a loopback TCP port.');
  }
  return address.port;
}

async function playwrightVersion(): Promise<string> {
  const decoded: unknown = JSON.parse(await readFile(
    resolve(repositoryRoot, 'node_modules/@playwright/test/package.json'),
    'utf8',
  ));
  if (decoded === null || typeof decoded !== 'object') {
    throw new TypeError('Playwright package metadata is malformed.');
  }
  const version = Reflect.get(decoded, 'version');
  if (typeof version !== 'string') throw new TypeError('Playwright version is missing.');
  return version;
}

function validateOutputDirectory(outputDirectory: string): string {
  const resolved = resolve(outputDirectory);
  if (!basename(resolved).endsWith('-images')) {
    throw new Error('Board snapshot artifact directories must end in -images.');
  }
  const artifactRoot = resolve(repositoryRoot, 'dnd-slim-runs');
  const fromArtifactRoot = relative(artifactRoot, resolved);
  if (
    fromArtifactRoot === '' ||
    fromArtifactRoot === '..' ||
    fromArtifactRoot.startsWith(`..${sep}`)
  ) {
    throw new Error('Board snapshot artifacts must live under dnd-slim-runs/<family>-images/.');
  }
  return resolved;
}

function pngDimensions(png: Buffer): { readonly width: number; readonly height: number } {
  if (png.byteLength === 0 || !png.subarray(0, PNG_SIGNATURE.byteLength).equals(PNG_SIGNATURE)) {
    throw new Error('Board screenshot is not a PNG.');
  }
  if (png.byteLength < 24) throw new Error('Board screenshot PNG header is truncated.');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width < 1 || height < 1) throw new Error('Board screenshot has invalid dimensions.');
  return { width, height };
}

function validateArtifactShape(artifact: BoardImageArtifact): void {
  if (artifact.version !== 'arena-board-image-v1' || artifact.audience !== 'dm' ||
    artifact.mimeType !== 'image/png') {
    throw new TypeError('Board image artifact has an unsupported contract discriminator.');
  }
  if (!/^board-images\/[a-f0-9]{64}\.png$/u.test(artifact.relativePath) ||
    artifact.relativePath !== `board-images/${artifact.sha256}.png`) {
    throw new TypeError('Board image path must be content-addressed under board-images/.');
  }
  if (!SHA256_PATTERN.test(artifact.sha256)) {
    throw new TypeError('Board image SHA-256 must be lowercase hexadecimal.');
  }
  if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes < 24 ||
    artifact.bytes > MAX_BOARD_PNG_BYTES) {
    throw new RangeError('Board image byte count violates the PNG size contract.');
  }
  for (const [label, value] of Object.entries({ width: artifact.width, height: artifact.height })) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`Board image ${label} must be a positive safe integer.`);
    }
  }
  if (!Number.isSafeInteger(artifact.capturedAtUnixMs) || artifact.capturedAtUnixMs < 1 ||
    !Number.isFinite(artifact.captureMs) || artifact.captureMs < 0) {
    throw new RangeError('Board image capture timing is invalid.');
  }
  if (!SHA256_PATTERN.test(artifact.html.sha256) ||
    artifact.html.relativePath !== `board-html/${artifact.html.sha256}/board.html` ||
    !Number.isSafeInteger(artifact.html.bytes) || artifact.html.bytes < 1) {
    throw new TypeError('Board HTML artifact must be content-addressed with a positive byte count.');
  }
  const blind = artifact.blindState;
  const domCountKeys = [
    'coordinateLabels', 'creatureBadges', 'rosterEntries', 'hpBars', 'legendEntries',
    'blockedCells', 'difficultCells', 'obscuredCells', 'illuminatedCells', 'fogMarks',
    'doors', 'objects', 'hiddenMarks', 'multiCellFootprints',
  ] as const;
  if (blind !== undefined && (
    blind.informationMode !== 'blind_state' ||
    !BOARD_SNAPSHOT_IMAGE_ROLES.includes(blind.role) ||
    !Number.isSafeInteger(blind.ordinal) || blind.ordinal < 1 ||
    blind.primerVersion.length === 0 ||
    (blind.glyphMode !== 'none' && blind.glyphMode !== 'light' && blind.glyphMode !== 'full') ||
    (blind.captureTilePx !== 64 && blind.captureTilePx !== 128) ||
    Object.keys(blind.domEvidence).length !== domCountKeys.length + 2 ||
    blind.domEvidence.optionSurfaceAbsent !== true ||
    blind.domEvidence.nextEventPreviewAbsent !== true ||
    domCountKeys.some((key) =>
      !Number.isSafeInteger(blind.domEvidence[key]) || blind.domEvidence[key] < 0)
  )) {
    throw new TypeError('Blind state board metadata is malformed.');
  }
}

export function boardSnapshotVisualDescriptor(artifact: BoardImageArtifact): {
  readonly kind: BoardSnapshotImageRole;
  readonly ordinal: number;
  readonly primer_version: string;
  readonly glyph_mode: BoardGlyphMode;
  readonly capture_tile_px: CaptureTilePx;
} {
  const blind = artifact.blindState;
  if (blind === undefined) {
    throw new TypeError('Advice artifacts do not have a blind visual descriptor.');
  }
  return {
    kind: blind.role,
    ordinal: blind.ordinal,
    primer_version: blind.primerVersion,
    glyph_mode: blind.glyphMode,
    capture_tile_px: blind.captureTilePx,
  };
}

export async function readValidatedBoardImage(input: {
  readonly artifact: BoardImageArtifact;
  readonly artifactRoot: string;
  readonly state: EncounterState;
  readonly source: BoardImageSource;
  readonly primaryDispatchStartedAtUnixMs: number;
}): Promise<Buffer> {
  validateArtifactShape(input.artifact);
  assertBoardImageFresh(input.artifact, input.state, input.source);
  if (!Number.isSafeInteger(input.primaryDispatchStartedAtUnixMs) ||
    input.primaryDispatchStartedAtUnixMs < input.artifact.capturedAtUnixMs) {
    throw new Error('Board image capture must complete before primary model dispatch.');
  }
  const root = resolve(input.artifactRoot);
  const path = resolve(root, input.artifact.relativePath);
  const inside = relative(root, path);
  if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
    throw new Error('Board image escaped its artifact root.');
  }
  const [realRoot, realPath] = await Promise.all([realpath(root), realpath(path)]);
  const realInside = relative(realRoot, realPath);
  if (realInside === '..' || realInside.startsWith(`..${sep}`) || isAbsolute(realInside)) {
    throw new Error('Board image resolved outside its artifact root.');
  }
  const png = await readFile(realPath);
  const dimensions = pngDimensions(png);
  if (png.byteLength !== input.artifact.bytes || sha256Bytes(png) !== input.artifact.sha256 ||
    dimensions.width !== input.artifact.width || dimensions.height !== input.artifact.height) {
    throw new Error('Board image bytes do not match their persisted artifact metadata.');
  }
  return png;
}

export async function readValidatedBoardHtml(input: {
  readonly artifact: BoardImageArtifact;
  readonly artifactRoot: string;
}): Promise<string> {
  validateArtifactShape(input.artifact);
  const root = resolve(input.artifactRoot);
  const path = resolve(root, input.artifact.html.relativePath);
  const inside = relative(root, path);
  if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
    throw new Error('Board HTML escaped its artifact root.');
  }
  const [realRoot, realPath] = await Promise.all([realpath(root), realpath(path)]);
  const realInside = relative(realRoot, realPath);
  if (realInside === '..' || realInside.startsWith(`..${sep}`) || isAbsolute(realInside)) {
    throw new Error('Board HTML resolved outside its artifact root.');
  }
  const bytes = await readFile(realPath);
  if (bytes.byteLength !== input.artifact.html.bytes ||
    sha256Bytes(bytes) !== input.artifact.html.sha256) {
    throw new Error('Board HTML bytes do not match their persisted artifact metadata.');
  }
  return bytes.toString('utf8');
}

async function writeContentAddressedPng(
  directory: string,
  digest: string,
  png: Buffer,
): Promise<`board-images/${string}.png`> {
  const images = join(directory, 'board-images');
  await mkdir(images, { recursive: true });
  const destination = join(images, `${digest}.png`);
  try {
    await writeFile(destination, png, { flag: 'wx' });
  } catch (error: unknown) {
    if (!(error instanceof Error) || Reflect.get(error, 'code') !== 'EEXIST') throw error;
    const existing = await readFile(destination);
    if (!existing.equals(png)) {
      throw new Error(`Content-addressed board image ${digest} has conflicting bytes.`);
    }
  }
  return `board-images/${digest}.png`;
}

async function writeContentAddressedHtml(
  directory: string,
  html: string,
): Promise<BoardHtmlArtifact> {
  const bytes = Buffer.from(html, 'utf8');
  const digest = sha256Bytes(bytes);
  const htmlDirectory = join(directory, 'board-html', digest);
  await mkdir(htmlDirectory, { recursive: true });
  const destination = join(htmlDirectory, 'board.html');
  try {
    await writeFile(destination, bytes, { flag: 'wx' });
  } catch (error: unknown) {
    if (!(error instanceof Error) || Reflect.get(error, 'code') !== 'EEXIST') throw error;
    const existing = await readFile(destination);
    if (!existing.equals(bytes)) {
      throw new Error(`Content-addressed board HTML ${digest} has conflicting bytes.`);
    }
  }
  return Object.freeze({
    relativePath: `board-html/${digest}/board.html`,
    sha256: digest,
    bytes: bytes.byteLength,
  });
}

async function assertContainedArtifact(
  outputDirectory: string,
  relativePath: BoardImageArtifact['relativePath'] | BoardHtmlArtifact['relativePath'],
): Promise<void> {
  const absolute = resolve(outputDirectory, relativePath);
  const inside = relative(outputDirectory, absolute);
  if (inside.startsWith(`..${sep}`) || inside === '..') {
    throw new Error('Board image escaped its artifact directory.');
  }
  if (!(await stat(absolute)).isFile()) throw new Error('Board image artifact is not a file.');
}

export class BoardSnapshotService implements AsyncDisposable {
  readonly #outputDirectory: string;
  readonly #forbiddenBoardStrings: readonly string[];
  readonly #boardGlyphs: BoardGlyphMode | null;
  readonly #captureGeometry: ReturnType<typeof boardSnapshotCaptureGeometry>;
  readonly #informationMode: BoardSnapshotInformationMode;
  readonly #primerVersion: string;
  #loadedRole: BoardSnapshotImageRole = 'dm_board';
  readonly #server: PreviewServer;
  readonly #context: BrowserContext;
  readonly #page: Page;
  readonly #profileDirectory: string;
  readonly #chromiumVersion: string;
  readonly #playwrightVersion: string;
  readonly #executableSha256: string;
  readonly #coldStartMs: number;
  readonly #artifacts: BoardImageArtifact[] = [];
  #captureOrdinal = 0;
  #closed = false;
  #manifestPath: string | null = null;

  private constructor(input: {
    readonly outputDirectory: string;
    readonly forbiddenBoardStrings: readonly string[];
    readonly boardGlyphs: BoardGlyphMode | null;
    readonly captureGeometry: ReturnType<typeof boardSnapshotCaptureGeometry>;
    readonly informationMode: BoardSnapshotInformationMode;
    readonly primerVersion: string;
    readonly server: PreviewServer;
    readonly context: BrowserContext;
    readonly page: Page;
    readonly profileDirectory: string;
    readonly chromiumVersion: string;
    readonly playwrightVersion: string;
    readonly executableSha256: string;
    readonly coldStartMs: number;
  }) {
    this.#outputDirectory = input.outputDirectory;
    this.#forbiddenBoardStrings = input.forbiddenBoardStrings;
    this.#boardGlyphs = input.boardGlyphs;
    this.#captureGeometry = input.captureGeometry;
    this.#informationMode = input.informationMode;
    this.#primerVersion = input.primerVersion;
    this.#server = input.server;
    this.#context = input.context;
    this.#page = input.page;
    this.#profileDirectory = input.profileDirectory;
    this.#chromiumVersion = input.chromiumVersion;
    this.#playwrightVersion = input.playwrightVersion;
    this.#executableSha256 = input.executableSha256;
    this.#coldStartMs = input.coldStartMs;
  }

  static async start(options: BoardSnapshotServiceOptions): Promise<BoardSnapshotService> {
    const startedAt = performance.now();
    const outputDirectory = validateOutputDirectory(options.outputDirectory);
    await mkdir(outputDirectory, { recursive: true });
    await runDistBuildCache();
    const server = await preview({
      root: repositoryRoot,
      configLoader: 'runner',
      preview: { host: '127.0.0.1', port: configuredPreviewPort(), strictPort: true },
    });
    const port = actualPort(server);
    if (port === 4173) {
      await server.close();
      throw new Error('Vite preview selected forbidden port 4173.');
    }
    const profileDirectory = await mkdtemp(join(tmpdir(), 'dnd-board-snapshot-profile-'));
    let context: BrowserContext | null = null;
    try {
      context = await chromium.launchPersistentContext(profileDirectory, {
        headless: true,
        locale: 'en-US',
        timezoneId: 'UTC',
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
      });
      const page = context.pages()[0] ?? await context.newPage();
      const origin = `http://127.0.0.1:${String(port)}`;
      const boardGlyphs = options.boardGlyphs ?? null;
      const captureGeometry = boardSnapshotCaptureGeometry(options.captureTilePx);
      const informationMode = boardSnapshotInformationMode(options.informationMode);
      const primerVersion = options.primerVersion ?? BLIND_STATE_PRIMER_VERSION;
      if (informationMode === 'blind_state' && primerVersion.length === 0) {
        throw new TypeError('Blind state snapshots require a non-empty primer version.');
      }
      const glyphParameter = boardGlyphs === null ? '' : `&boardGlyphs=${boardGlyphs}`;
      const captureTileParameter = captureGeometry.tileSizeCssPx === 128
        ? ''
        : `&captureTilePx=${String(captureGeometry.tileSizeCssPx)}`;
      const informationParameter = informationMode === 'advice'
        ? ''
        : '&boardSnapshotInformation=blind_state&boardSnapshotRole=dm_board';
      await page.goto(`${origin}/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot-bootstrap${glyphParameter}${captureTileParameter}${informationParameter}`);
      await page.locator('.dm-save-manager').waitFor({ state: 'visible' });
      const browser = context.browser();
      if (browser === null) throw new Error('Persistent Chromium context has no browser handle.');
      const executable = chromium.executablePath();
      return new BoardSnapshotService({
        outputDirectory,
        forbiddenBoardStrings: [...(options.forbiddenBoardStrings ?? []), SNAPSHOT_CANARY],
        boardGlyphs,
        captureGeometry,
        informationMode,
        primerVersion,
        server,
        context,
        page,
        profileDirectory,
        chromiumVersion: browser.version(),
        playwrightVersion: await playwrightVersion(),
        executableSha256: sha256Bytes(await readFile(executable)),
        coldStartMs: performance.now() - startedAt,
      });
    } catch (error: unknown) {
      if (context !== null) await context.close();
      await server.close();
      await rm(profileDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  get coldStartMs(): number {
    return this.#coldStartMs;
  }

  get outputDirectory(): string {
    return this.#outputDirectory;
  }

  get manifestPath(): string | null {
    return this.#manifestPath;
  }

  get boardGlyphs(): BoardGlyphMode | null {
    return this.#boardGlyphs;
  }

  get informationMode(): BoardSnapshotInformationMode {
    return this.#informationMode;
  }

  async capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact> {
    return this.#capture(input, 1);
  }

  async captureSynchronized(input: {
    readonly state: EncounterState;
    readonly source: BoardImageSource;
    readonly roles: readonly BoardSnapshotImageRole[];
  }): Promise<readonly BoardImageArtifact[]> {
    if (this.#informationMode !== 'blind_state') {
      throw new TypeError('Synchronized role families require blind_state information mode.');
    }
    if (input.roles.length === 0 || new Set(input.roles).size !== input.roles.length) {
      throw new TypeError('A synchronized image family requires one or more unique roles.');
    }
    const artifacts: BoardImageArtifact[] = [];
    for (const [index, role] of input.roles.entries()) {
      artifacts.push(await this.#capture({ state: input.state, source: input.source, role }, index + 1));
    }
    if (artifacts.some((artifact) =>
      artifact.source.revision !== input.source.revision ||
      artifact.source.stateDigest !== input.source.stateDigest)) {
      throw new Error('Synchronized image family diverged from its bound state.');
    }
    return artifacts;
  }

  async #selectBlindRole(role: BoardSnapshotImageRole): Promise<void> {
    if (this.#loadedRole === role) return;
    const url = new URL(this.#page.url());
    url.pathname = '/vtt';
    url.search = '';
    url.searchParams.set('encounter', 'reference');
    url.searchParams.set('view', 'dm');
    url.searchParams.set('boardSnapshot', '1');
    url.searchParams.set('session', 'board-snapshot-bootstrap');
    url.searchParams.set('boardSnapshotInformation', 'blind_state');
    url.searchParams.set('boardSnapshotRole', role);
    if (this.#boardGlyphs !== null) url.searchParams.set('boardGlyphs', this.#boardGlyphs);
    if (this.#captureGeometry.tileSizeCssPx !== 128) {
      url.searchParams.set('captureTilePx', String(this.#captureGeometry.tileSizeCssPx));
    }
    await this.#page.goto(url.toString());
    await this.#page.locator('.dm-save-manager').waitFor({ state: 'visible' });
    this.#loadedRole = role;
  }

  async #capture(
    input: BoardSnapshotCapture,
    visualOrdinal: number,
  ): Promise<BoardImageArtifact> {
    if (this.#closed) throw new Error('Board snapshot service is closed.');
    const role = input.role ?? 'dm_board';
    if (this.#informationMode === 'advice' && role !== 'dm_board') {
      throw new TypeError('Advice snapshots support only the legacy dm_board capture.');
    }
    if (this.#informationMode === 'blind_state') await this.#selectBlindRole(role);
    validateSource(input.state, input.source);
    const captureStartedAt = performance.now();
    this.#captureOrdinal += 1;
    const captureOrdinal = this.#captureOrdinal;
    const bundle = createBoardSnapshotSessionBundle(input.state, input.source, captureOrdinal);
    const sessions = join(this.#outputDirectory, 'snapshot-sessions');
    await mkdir(sessions, { recursive: true });
    const bundlePath = join(sessions, `${input.source.stateDigest}-${String(captureOrdinal)}.vtt.json`);
    try {
      await writeFile(bundlePath, bundle.bytes, { flag: 'wx' });
    } catch (error: unknown) {
      if (!(error instanceof Error) || Reflect.get(error, 'code') !== 'EEXIST') throw error;
      if (await readFile(bundlePath, 'utf8') !== bundle.bytes) {
        throw new Error(`Snapshot session bundle ${basename(bundlePath)} has conflicting bytes.`);
      }
    }

    const fileChooserPromise = this.#page.waitForEvent('filechooser');
    await this.#page.locator('.dm-save-manager')
      .getByRole('button', { name: 'Upload save file', exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(bundlePath);
    const saveId = `browser:session:${String(bundle.sessionId)}`;
    const row = this.#page.locator(`.dm-save-row[data-save-id=${JSON.stringify(saveId)}]`);
    await row.waitFor({ state: 'visible' });
    await Promise.all([
      this.#page.waitForURL((url) => url.searchParams.get('session') === bundle.sessionId),
      row.getByRole('button', { name: 'Load', exact: true }).click(),
    ]);

    await this.#page.addStyleTag({ content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
      html { scrollbar-width: none !important; }
      ::-webkit-scrollbar { display: none !important; }
      .encounter-board {
        --encounter-tile-size: ${String(this.#captureGeometry.tileSizeCssPx)}px !important;
        user-select: none !important;
      }
    ` });
    await this.#page.evaluate(({ ordinal, canary, markerHeightCssPx }) => {
      const marker = document.createElement('p');
      marker.id = 'board-snapshot-outside-canary';
      marker.textContent = `${canary}:${String(ordinal)}`;
      marker.style.height = `${String(markerHeightCssPx)}px`;
      marker.style.margin = '0';
      document.body.append(marker);
    }, {
      ordinal: captureOrdinal,
      canary: SNAPSHOT_CANARY,
      markerHeightCssPx: this.#captureGeometry.markerHeightCssPx,
    });

    const board = this.#page.locator(
      this.#informationMode === 'blind_state'
        ? `[data-blind-snapshot-capture=true][data-blind-snapshot-role=${role}]`
        : '.encounter-board',
    );
    await this.#waitForBoardVisible(board, input.source, role);
    await board.evaluate((element) => element.scrollIntoView({ block: 'start', inline: 'start' }));
    await this.#waitForSettledBoard(board, input.source, role);
    const blindDomEvidence = this.#informationMode === 'blind_state'
      ? await this.#inspectBlindStateDom(board)
      : null;
    const png = await board.screenshot({
      type: 'png',
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    });
    const captureMs = performance.now() - captureStartedAt;
    if (png.byteLength > MAX_BOARD_PNG_BYTES) {
      throw new Error(`Board screenshot is ${String(png.byteLength)} bytes; limit is ${String(MAX_BOARD_PNG_BYTES)}.`);
    }
    const dimensions = pngDimensions(png);
    const digest = sha256Bytes(png);
    const relativePath = await writeContentAddressedPng(this.#outputDirectory, digest, png);
    const renderedGlyphMode = await board.evaluate((element) =>
      (element as HTMLElement).dataset.boardGlyphs ?? null);
    if (renderedGlyphMode === null || !isBoardGlyphMode(renderedGlyphMode)) {
      throw new TypeError('State-only snapshot omitted its glyph mode.');
    }
    const html = await writeContentAddressedHtml(this.#outputDirectory, serializeAccessibleBoard({
      encounterName: 'Encounter board',
      audience: 'dm',
      round: input.state.round,
      activeCombatant: input.state.activeCombatant,
      board: projectEncounterBoard(projectDmView(input.state)),
    }));
    const artifact: BoardImageArtifact = Object.freeze({
      version: 'arena-board-image-v1',
      audience: 'dm',
      mimeType: 'image/png',
      relativePath,
      sha256: digest,
      bytes: png.byteLength,
      ...dimensions,
      capturedAtUnixMs: Date.now(),
      captureMs,
      source: { ...input.source },
      chromiumVersion: this.#chromiumVersion,
      html,
      ...(this.#informationMode === 'blind_state' ? {
        blindState: {
          informationMode: 'blind_state' as const,
          role,
          ordinal: visualOrdinal,
          primerVersion: this.#primerVersion,
          glyphMode: renderedGlyphMode,
          captureTilePx: this.#captureGeometry.tileSizeCssPx,
          domEvidence: blindDomEvidence!,
        },
      } : {}),
    });
    assertBoardImageFresh(artifact, input.state, input.source);
    await assertContainedArtifact(this.#outputDirectory, artifact.relativePath);
    await assertContainedArtifact(this.#outputDirectory, artifact.html.relativePath);
    this.#artifacts.push(artifact);
    await this.#writeManifest();
    return artifact;
  }

  async #waitForBoardVisible(
    board: ReturnType<Page['locator']>,
    source: BoardImageSource,
    role: BoardSnapshotImageRole,
  ): Promise<void> {
    await new Promise<void>((resolveBoard, reject) => {
      const onPageError = (error: Error): void => {
        this.#page.off('pageerror', onPageError);
        reject(new Error(`Snapshot page failed before board render: ${error.message}`, { cause: error }));
      };
      this.#page.on('pageerror', onPageError);
      void this.#page.waitForFunction((expected) => {
        const selector = expected.informationMode === 'blind_state'
          ? `[data-blind-snapshot-capture=true][data-blind-snapshot-role=${expected.role}]`
          : '.encounter-board';
        const candidate = document.querySelector<HTMLElement>(selector);
        if (candidate === null) return false;
        const bounds = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        return bounds.width > 0 && bounds.height > 0 &&
          style.visibility !== 'hidden' && style.display !== 'none' &&
          candidate.dataset.boardAudience === (expected.role === 'player_board' ? 'player' : 'dm') &&
          candidate.dataset.sourceRevision === String(expected.revision) &&
          candidate.dataset.sourceRound === String(expected.round) &&
          candidate.dataset.sourceStateDigest === expected.stateDigest &&
          // D525: a board rendered under another glyph mode than requested is never captured.
          (expected.boardGlyphs === null || candidate.dataset.boardGlyphs === expected.boardGlyphs);
      }, {
        ...source,
        boardGlyphs: this.#boardGlyphs,
        informationMode: this.#informationMode,
        role,
      }, { polling: 'raf' }).then(() => {
        this.#page.off('pageerror', onPageError);
        resolveBoard();
      }, (error: unknown) => {
        this.#page.off('pageerror', onPageError);
        reject(error);
      });
    });
    if (await board.count() !== 1) throw new Error('Snapshot page must render exactly one encounter board.');
  }

  async #waitForSettledBoard(
    board: ReturnType<Page['locator']>,
    source: BoardImageSource,
    role: BoardSnapshotImageRole,
  ): Promise<void> {
    await board.evaluate(async (element, expected) => {
      const html = element as HTMLElement;
      const attributes = (): readonly string[] => [
        html.dataset.boardAudience ?? '',
        html.dataset.sourceRevision ?? '',
        html.dataset.sourceRound ?? '',
        html.dataset.sourceStateDigest ?? '',
      ];
      const wanted = [
        expected.role === 'player_board' ? 'player' : 'dm',
        String(expected.revision),
        String(expected.round),
        expected.stateDigest,
      ];
      if (canonical(attributes()) !== canonical(wanted)) {
        throw new Error(`Board provenance ${canonical(attributes())} does not match ${canonical(wanted)}.`);
      }
      await document.fonts.ready;
      for (const image of Array.from(html.querySelectorAll('img'))) {
        await image.decode();
        if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
          throw new Error('Board image asset did not decode to nonzero dimensions.');
        }
      }
      const animations = html.getAnimations({ subtree: true });
      if (animations.some((animation) => animation.playState !== 'finished')) {
        throw new Error('Board still has a running animation.');
      }
      const snapshot = (): string => canonical({
        outerHTML: html.outerHTML,
        width: getComputedStyle(html).width,
        height: getComputedStyle(html).height,
        scrollWidth: html.scrollWidth,
        scrollHeight: html.scrollHeight,
        attributes: attributes(),
      });
      const frame = (): Promise<void> => new Promise((resolveFrame) => {
        requestAnimationFrame(() => resolveFrame());
      });
      await frame();
      const first = snapshot();
      await frame();
      const second = snapshot();
      if (first !== second) throw new Error('Board changed across consecutive animation frames.');

      function canonical(value: unknown): string {
        return JSON.stringify(value);
      }
    }, { ...source, role });
    const identityLeak = await board.evaluate((element, forbidden) => {
      const root = element as HTMLElement;
      const values: string[] = [root.innerText];
      for (const node of [root, ...Array.from(root.querySelectorAll('*'))]) {
        for (const attribute of Array.from(node.attributes)) {
          if (
            attribute.name === 'aria-label' || attribute.name === 'title' ||
            attribute.name === 'alt' || attribute.name.startsWith('data-')
          ) values.push(attribute.value);
        }
      }
      const haystack = values.join('\n').toLocaleLowerCase('en-US');
      return forbidden.find((candidate) =>
        candidate.length > 0 && haystack.includes(candidate.toLocaleLowerCase('en-US'))) ?? null;
    }, this.#forbiddenBoardStrings);
    if (identityLeak !== null) {
      throw new Error(`Board contains forbidden identity string ${JSON.stringify(identityLeak)}.`);
    }
  }

  async #inspectBlindStateDom(
    board: ReturnType<Page['locator']>,
  ): Promise<BoardSnapshotDomEvidence> {
    const inspection = await board.evaluate((element) => {
      const root = element as HTMLElement;
      const forbiddenClass = Array.from(root.querySelectorAll<HTMLElement>('*')).find((node) =>
        Array.from(node.classList).some((name) => name.startsWith('encounter-option-')));
      if (forbiddenClass !== undefined) return { violation: `class:${forbiddenClass.className}` };
      const forbiddenAttribute = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
        .flatMap((node) => Array.from(node.attributes))
        .find((attribute) => attribute.name.startsWith('data-option'));
      if (forbiddenAttribute !== undefined) return { violation: `attribute:${forbiddenAttribute.name}` };
      if (/Movement options|Opportunity Attack|beyond movement \(Dash\)|option N/iu.test(root.innerText)) {
        return { violation: 'legend:text' };
      }
      if (root.querySelector('.dm-next-event-preview') !== null) return { violation: 'next-event-preview' };
      const count = (selector: string): number => root.querySelectorAll(selector).length;
      return {
        violation: null,
        evidence: {
          optionSurfaceAbsent: true as const,
          nextEventPreviewAbsent: true as const,
          coordinateLabels: count('.encounter-coordinate-label'),
          creatureBadges: count('.encounter-creature-badge'),
          rosterEntries: count('.encounter-roster-entry'),
          hpBars: count('.encounter-hp-bar'),
          legendEntries: count('.encounter-legend-item'),
          blockedCells: count('.encounter-mechanical-blocked'),
          difficultCells: count('.encounter-mechanical-difficult_terrain'),
          obscuredCells: count('.encounter-mechanical-obscurement'),
          illuminatedCells: count('.encounter-mechanical-illumination'),
          fogMarks: count('[data-glyph-kind="fog"]'),
          doors: count('.encounter-world-object[data-kind="door"]'),
          objects: count('.encounter-world-object'),
          hiddenMarks: count('.encounter-hidden-ring'),
          multiCellFootprints: Array.from(root.querySelectorAll<HTMLElement>('.encounter-token-space'))
            .filter((node) => Number(node.dataset.columnSpan) > 1 || Number(node.dataset.rowSpan) > 1).length,
        },
      };
    });
    if (inspection.violation !== null) {
      throw new Error(`Blind state board contains an offered-option DOM leak (${inspection.violation}).`);
    }
    return inspection.evidence;
  }

  async #writeManifest(): Promise<void> {
    const manifest: BoardSnapshotManifest = {
      version: 'arena-board-snapshot-manifest-v1',
      chromiumVersion: this.#chromiumVersion,
      playwrightVersion: this.#playwrightVersion,
      executableSha256: this.#executableSha256,
      os: { platform: platform(), release: release(), architecture: arch() },
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      tileSizeCssPx: this.#captureGeometry.tileSizeCssPx,
      maximumPngBytes: MAX_BOARD_PNG_BYTES,
      capturePolicy: 'encounter-board-element-settled-v1',
      boardGlyphsOverride: this.#boardGlyphs,
      coldStartMs: this.#coldStartMs,
      artifacts: [...this.#artifacts],
    };
    const bytes = Buffer.from(`${canonicalJson(manifest)}\n`, 'utf8');
    const digest = sha256Bytes(bytes);
    const manifests = join(this.#outputDirectory, 'manifests');
    await mkdir(manifests, { recursive: true });
    const destination = join(manifests, `${digest}.json`);
    const temporary = `${destination}.partial`;
    try {
      await writeFile(temporary, bytes, { flag: 'wx' });
      await rename(temporary, destination);
    } catch (error: unknown) {
      if (!(error instanceof Error) || Reflect.get(error, 'code') !== 'EEXIST') throw error;
      await rm(temporary, { force: true });
      const existing = await readFile(destination);
      if (!existing.equals(bytes)) throw new Error(`Manifest ${digest} has conflicting bytes.`);
    }
    this.#manifestPath = destination;
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#context.close();
    await this.#server.close();
    await rm(this.#profileDirectory, { recursive: true, force: true });
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
