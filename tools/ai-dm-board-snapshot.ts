import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { arch, platform, release, tmpdir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { preview, type PreviewServer } from 'vite';
import { canonicalJson } from '../src/commands/canonical-json';
import type { ControllerIdentity } from '../src/combat/controllers';
import type { PersistedCoordinatorState } from '../src/combat/coordinator';
import type { EncounterState } from '../src/combat/encounter';
import { mulberry32 } from '../src/combat/random';
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

const repositoryRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_PNG_BYTES = 1_000_000;
const VIEWPORT = Object.freeze({ width: 1_280, height: 1_280 });
const TILE_SIZE_CSS_PX = 40;
const SNAPSHOT_CANARY = 'board-snapshot-element-crop-canary';
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

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
  readonly tileSizeCssPx: 40;
  readonly maximumPngBytes: 1_000_000;
  readonly capturePolicy: 'encounter-board-element-settled-v1';
  readonly coldStartMs: number;
  readonly artifacts: readonly BoardImageArtifact[];
}

export interface BoardSnapshotCapture {
  readonly state: EncounterState;
  readonly source: BoardImageSource;
}

export interface BoardSnapshotServiceOptions {
  readonly outputDirectory: string;
  readonly forbiddenBoardStrings?: readonly string[];
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

async function assertContainedArtifact(
  outputDirectory: string,
  relativePath: BoardImageArtifact['relativePath'],
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
      preview: { host: '127.0.0.1', port: 0, strictPort: true },
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
      await page.goto(`${origin}/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot-bootstrap`);
      await page.locator('.dm-save-manager').waitFor({ state: 'visible' });
      const browser = context.browser();
      if (browser === null) throw new Error('Persistent Chromium context has no browser handle.');
      const executable = chromium.executablePath();
      return new BoardSnapshotService({
        outputDirectory,
        forbiddenBoardStrings: [...(options.forbiddenBoardStrings ?? []), SNAPSHOT_CANARY],
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

  get manifestPath(): string | null {
    return this.#manifestPath;
  }

  async capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact> {
    if (this.#closed) throw new Error('Board snapshot service is closed.');
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
        --encounter-tile-size: ${String(TILE_SIZE_CSS_PX)}px !important;
        user-select: none !important;
      }
    ` });
    await this.#page.evaluate(({ ordinal, canary }) => {
      const marker = document.createElement('p');
      marker.id = 'board-snapshot-outside-canary';
      marker.textContent = `${canary}:${String(ordinal)}`;
      marker.style.height = '1280px';
      marker.style.margin = '0';
      document.body.append(marker);
    }, { ordinal: captureOrdinal, canary: SNAPSHOT_CANARY });

    const board = this.#page.locator('.encounter-board');
    await this.#waitForBoardVisible(board, input.source);
    await board.evaluate((element) => element.scrollIntoView({ block: 'start', inline: 'start' }));
    await this.#waitForSettledBoard(board, input.source);
    const png = await board.screenshot({
      type: 'png',
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    });
    const captureMs = performance.now() - captureStartedAt;
    if (png.byteLength > MAX_PNG_BYTES) {
      throw new Error(`Board screenshot is ${String(png.byteLength)} bytes; limit is ${String(MAX_PNG_BYTES)}.`);
    }
    const dimensions = pngDimensions(png);
    const digest = sha256Bytes(png);
    const relativePath = await writeContentAddressedPng(this.#outputDirectory, digest, png);
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
    });
    assertBoardImageFresh(artifact, input.state, input.source);
    await assertContainedArtifact(this.#outputDirectory, artifact.relativePath);
    this.#artifacts.push(artifact);
    await this.#writeManifest();
    return artifact;
  }

  async #waitForBoardVisible(
    board: ReturnType<Page['locator']>,
    source: BoardImageSource,
  ): Promise<void> {
    await new Promise<void>((resolveBoard, reject) => {
      const onPageError = (error: Error): void => {
        this.#page.off('pageerror', onPageError);
        reject(new Error(`Snapshot page failed before board render: ${error.message}`, { cause: error }));
      };
      this.#page.on('pageerror', onPageError);
      void this.#page.waitForFunction((expected) => {
        const candidate = document.querySelector<HTMLElement>('.encounter-board');
        if (candidate === null) return false;
        const bounds = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        return bounds.width > 0 && bounds.height > 0 &&
          style.visibility !== 'hidden' && style.display !== 'none' &&
          candidate.dataset.boardAudience === 'dm' &&
          candidate.dataset.sourceRevision === String(expected.revision) &&
          candidate.dataset.sourceRound === String(expected.round) &&
          candidate.dataset.sourceStateDigest === expected.stateDigest;
      }, source, { polling: 'raf' }).then(() => {
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
  ): Promise<void> {
    await board.evaluate(async (element, expected) => {
      const html = element as HTMLElement;
      const attributes = (): readonly string[] => [
        html.dataset.boardAudience ?? '',
        html.dataset.sourceRevision ?? '',
        html.dataset.sourceRound ?? '',
        html.dataset.sourceStateDigest ?? '',
      ];
      const wanted = ['dm', String(expected.revision), String(expected.round), expected.stateDigest];
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
    }, source);
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

  async #writeManifest(): Promise<void> {
    const manifest: BoardSnapshotManifest = {
      version: 'arena-board-snapshot-manifest-v1',
      chromiumVersion: this.#chromiumVersion,
      playwrightVersion: this.#playwrightVersion,
      executableSha256: this.#executableSha256,
      os: { platform: platform(), release: release(), architecture: arch() },
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      tileSizeCssPx: TILE_SIZE_CSS_PX,
      maximumPngBytes: MAX_PNG_BYTES,
      capturePolicy: 'encounter-board-element-settled-v1',
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
