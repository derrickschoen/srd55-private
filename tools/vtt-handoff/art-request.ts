import { randomBytes } from 'node:crypto';
import {
  closeSync, constants, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync,
  unlinkSync, writeSync,
} from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artRequestSchema, type ArtRequest } from '../../src/vtt/handoff/v1/contracts.ts';
import { createUuidV7Generator, type UuidV7Generator } from './uuidv7.ts';

const STYLE = 'Clean-room original fantasy tabletop asset; restrained stone, wood, iron and warm-fire palette; crisp readable silhouette; no text, logos, signatures or references to existing works.';
type ArtPass = ArtRequest['passes'][number];
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

interface RequestDefinition {
  readonly assetId: string;
  readonly footprint: { readonly w: number; readonly h: number };
  readonly passes: readonly ArtPass[];
  readonly transparent: boolean;
  readonly purpose: string;
}

export const ART_REQUEST_DEFINITIONS: readonly RequestDefinition[] = [
  { assetId: 'tile', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'repeatable dungeon ground tile' },
  { assetId: 'wall', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'directional dungeon wall segment' },
  { assetId: 'door', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'directional closed dungeon door' },
  { assetId: 'barrel', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding wooden barrel prop' },
  { assetId: 'table', footprint: { w: 2, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding rectangular wooden table prop' },
  { assetId: 'pillar', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding stone pillar prop' },
  { assetId: 'torch', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal', 'emissive'], transparent: true, purpose: 'freestanding lit torch prop' },
  { assetId: 'adventurer', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'readable humanoid adventurer token' },
  { assetId: 'goblin', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'readable small goblin token' },
] as const;

function requestBrief(definition: RequestDefinition): string {
  const background = definition.transparent
    ? 'Background must be transparent, with at least one alpha value below 255 outside the subject.'
    : 'Background may be opaque; image validity must not depend on transparency.';
  return `${STYLE} Purpose: ${definition.purpose}. Produce both top-down and isometric views at 128 pixels per grid cell, each with 0, 90, 180 and 270 degree facings. Use a ground-centre pivot at [width/2,height], consistent physical scale across views, and the requested passes. ${background}`;
}

export function buildArtRequests(generator: UuidV7Generator = createUuidV7Generator()): readonly ArtRequest[] {
  return ART_REQUEST_DEFINITIONS.map((definition) => artRequestSchema.parse({
    schemaVersion: 1,
    requestId: generator.next(),
    assetId: definition.assetId,
    brief: requestBrief(definition),
    views: ['top-down', 'isometric'],
    passes: definition.passes,
    pixelsPerCell: 128,
    footprint: definition.footprint,
  }));
}

function configuredRoot(value = process.env.VTT_HANDOFF_ROOT): string {
  if (value === undefined || !isAbsolute(value)) throw new Error('VTT_HANDOFF_ROOT_ABSOLUTE_REQUIRED');
  return resolve(value);
}

function writeExclusiveViaPartial(destination: string, bytes: Buffer, nonce: () => string): void {
  const partial = `${destination}.partial.${nonce()}`;
  let partialHandle: number;
  try {
    partialHandle = openSync(partial, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('ART_REQUEST_PARTIAL_COLLISION');
    throw error;
  }
  let reserved = false;
  try {
    writeSync(partialHandle, bytes);
    closeSync(partialHandle);
    partialHandle = -1;
    const reservation = openSync(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    closeSync(reservation);
    reserved = true;
    renameSync(partial, destination);
  } catch (error) {
    if (partialHandle >= 0) closeSync(partialHandle);
    if (reserved) unlinkSync(destination);
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('ART_REQUEST_COLLISION');
    throw error;
  } finally {
    if (existsSync(partial)) unlinkSync(partial);
  }
}

export interface ArtRequestBatchResult {
  readonly root: string;
  readonly requestFiles: readonly string[];
  readonly status: 'created' | 'verified';
}

export function writeArtRequests(options: {
  readonly handoffRoot?: string;
  readonly generator?: UuidV7Generator;
  readonly check?: boolean;
  readonly nonce?: () => string;
} = {}): ArtRequestBatchResult {
  const root = configuredRoot(options.handoffRoot);
  const outbox = join(root, 'art', 'outbox');
  if (options.check) {
    if (!existsSync(outbox)) throw new Error('ART_REQUEST_OUTBOX_MISSING');
    const names = readdirSync(outbox).filter((name) => name.endsWith('.request.json')).sort();
    if (names.length !== ART_REQUEST_DEFINITIONS.length) throw new Error(`ART_REQUEST_COUNT: ${String(names.length)}`);
    const assets = new Set<string>();
    for (const name of names) {
      const parsed: unknown = JSON.parse(readFileSync(join(outbox, name), 'utf8'));
      const request = artRequestSchema.parse(parsed);
      if (!UUID_V7.test(request.requestId)) throw new Error('ART_REQUEST_ID_INVALID');
      if (name !== `${request.requestId}.request.json`) throw new Error('ART_REQUEST_FILENAME_MISMATCH');
      if (assets.has(request.assetId)) throw new Error('ART_REQUEST_ASSET_DUPLICATE');
      assets.add(request.assetId);
      const definition = ART_REQUEST_DEFINITIONS.find((entry) => entry.assetId === request.assetId);
      if (definition === undefined || request.brief !== requestBrief(definition) ||
        JSON.stringify(request.views) !== JSON.stringify(['top-down', 'isometric']) ||
        JSON.stringify(request.passes) !== JSON.stringify(definition.passes) ||
        request.pixelsPerCell !== 128 || request.footprint.w !== definition.footprint.w ||
        request.footprint.h !== definition.footprint.h) {
        throw new Error(`ART_REQUEST_CONTENT_MISMATCH: ${request.assetId}`);
      }
    }
    for (const definition of ART_REQUEST_DEFINITIONS) if (!assets.has(definition.assetId)) throw new Error(`ART_REQUEST_ASSET_MISSING: ${definition.assetId}`);
    return { root, requestFiles: names, status: 'verified' };
  }
  mkdirSync(outbox, { recursive: true });
  const requests = buildArtRequests(options.generator);
  const nonce = options.nonce ?? (() => `${String(process.pid)}.${randomBytes(8).toString('hex')}`);
  const requestFiles: string[] = [];
  for (const request of requests) {
    const name = `${request.requestId}.request.json`;
    writeExclusiveViaPartial(join(outbox, name), Buffer.from(`${JSON.stringify(request, null, 2)}\n`), nonce);
    requestFiles.push(name);
  }
  return { root, requestFiles, status: 'created' };
}

if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
  process.stdout.write(`${JSON.stringify(writeArtRequests({ check: process.argv.includes('--check') }), null, 2)}\n`);
}
