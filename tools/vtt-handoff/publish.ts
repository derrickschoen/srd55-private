import {
  closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, statSync, writeSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handoffPaths } from './paths.ts';

const CONTRACT_DECLARATIONS = `export interface SceneSnapshot {
  readonly schemaVersion: 1;
  readonly sceneId: string;
  readonly revision: number;
  readonly grid: { readonly width: number; readonly height: number; readonly feetPerCell: number };
  readonly tiles: readonly PlacedAsset[];
  readonly props: readonly PlacedAsset[];
  readonly tokens: readonly SceneToken[];
  readonly walls: readonly SceneWall[];
  readonly doors: readonly SceneDoor[];
  readonly lights: readonly SceneLight[];
  readonly vision: { readonly mode: 'all' | 'cells'; readonly visible: readonly Cell[]; readonly explored: readonly Cell[] };
}
export interface Cell { readonly x: number; readonly y: number }
export interface Point3 { readonly x: number; readonly y: number; readonly z: number }
export interface PlacedAsset extends Point3 { readonly id: string; readonly assetId: string }
export interface SceneToken extends PlacedAsset { readonly name: string; readonly facing: number; readonly footprint: { readonly w: number; readonly h: number } }
export interface SceneWall { readonly id: string; readonly from: Point3; readonly to: Point3; readonly baseZ: number; readonly height: number; readonly blocksMovement: boolean; readonly blocksVision: boolean }
export interface SceneDoor { readonly id: string; readonly wallId: string; readonly assetId: string; readonly open: boolean }
export interface SceneLight extends Point3 { readonly id: string; readonly color: string; readonly intensity: number; readonly radius: number; readonly enabled: boolean }
export type HandoffMethod = 'scene.open' | 'scene.snapshot' | 'token.move' | 'door.set' | 'light.set';
`;

interface PublicationEntry {
  readonly path: string;
  readonly bytes: Buffer;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function json(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function coreEntries(repositoryRoot: string): readonly PublicationEntry[] {
  const source = (relative: string): Buffer => readFileSync(join(repositoryRoot, relative));
  return [
    { path: 'contracts/v1/protocol.schema.json', bytes: source('contracts/vtt-handoff/v1/protocol.schema.json') },
    { path: 'contracts/v1/art.schema.json', bytes: source('contracts/vtt-handoff/v1/art.schema.json') },
    { path: 'contracts/v1/contracts.d.ts', bytes: Buffer.from(CONTRACT_DECLARATIONS) },
    { path: 'fixtures/scenes/two-room.v1.json', bytes: source('fixtures/scenes/two-room.v1.json') },
    { path: 'fixtures/scenes/two-room.snapshots.v1.json', bytes: source('fixtures/scenes/two-room.snapshots.v1.json') },
  ];
}

function atomicCreate(destination: string, bytes: Buffer): void {
  mkdirSync(dirname(destination), { recursive: true });
  const partial = `${destination}.partial`;
  const handle = openSync(partial, 'w', 0o644);
  try {
    writeSync(handle, bytes);
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  renameSync(partial, destination);
  const directory = openSync(dirname(destination), 'r');
  try { fsyncSync(directory); } finally { closeSync(directory); }
}

function assertCompatible(root: string, entries: readonly PublicationEntry[], check: boolean): void {
  for (const entry of entries) {
    const destination = join(root, entry.path);
    if (!existsSync(destination)) {
      if (check) throw new Error(`IMMUTABLE_BUNDLE_MISSING: ${entry.path}`);
      continue;
    }
    if (!readFileSync(destination).equals(entry.bytes)) throw new Error(`IMMUTABLE_BUNDLE_CONFLICT: ${entry.path}`);
  }
}

export interface PublishResult {
  readonly root: string;
  readonly status: 'published' | 'verified' | 'unchanged';
  readonly files: number;
}

export function publishCore(options: {
  readonly repositoryRoot?: string;
  readonly handoffRoot?: string;
  readonly check?: boolean;
} = {}): PublishResult {
  const paths = handoffPaths({
    ...(options.repositoryRoot === undefined ? {} : { repositoryRoot: options.repositoryRoot }),
    ...(options.handoffRoot === undefined ? {} : { handoffRoot: options.handoffRoot }),
  });
  const payloads = coreEntries(paths.repositoryRoot);
  const manifestBytes = json({
    schemaVersion: 1,
    bundle: 'contracts/v1',
    entries: payloads.map((entry) => ({ path: entry.path, sha256: sha256(entry.bytes), length: entry.bytes.length })),
  });
  const readyBytes = json({ core: 'ready', examples: 'pending' });
  const all = [
    ...payloads,
    { path: 'contracts/v1/manifest.json', bytes: manifestBytes },
    { path: 'contracts/v1/READY.json', bytes: readyBytes },
  ];
  assertCompatible(paths.handoffRoot, all, options.check ?? false);
  if (options.check) return { root: paths.handoffRoot, status: 'verified', files: all.length };
  const absent = all.filter((entry) => !existsSync(join(paths.handoffRoot, entry.path)));
  mkdirSync(join(paths.handoffRoot, 'contracts/v1/manifest.entries'), { recursive: true });
  for (const entry of absent.filter((candidate) => !candidate.path.endsWith('/READY.json'))) {
    atomicCreate(join(paths.handoffRoot, entry.path), entry.bytes);
  }
  const ready = absent.find((entry) => entry.path.endsWith('/READY.json'));
  if (ready !== undefined) atomicCreate(join(paths.handoffRoot, ready.path), ready.bytes);
  return { root: paths.handoffRoot, status: absent.length === 0 ? 'unchanged' : 'published', files: all.length };
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!process.argv.includes('--core')) throw new Error('PUBLISH_MODE_REQUIRED: --core');
  const result = publishCore({ check: process.argv.includes('--check') });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
