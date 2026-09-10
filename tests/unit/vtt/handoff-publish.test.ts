import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync,
} from '../../helpers/test-filesystem';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { publishCore } from '../../../tools/vtt-handoff/publish';

function root(): string {
  return mkdtempSync(join(tmpdir(), 'vtt-handoff-publish-'));
}

function tree(directory: string): readonly string[] {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' }).sort();
}

interface FileSnapshot {
  readonly path: string;
  readonly bytes: string;
  readonly mtimeMs: number;
  readonly size: number;
}

function fileSnapshots(rootDirectory: string, directory = rootDirectory): readonly FileSnapshot[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry): readonly FileSnapshot[] => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return fileSnapshots(rootDirectory, path);
    const stat = statSync(path);
    return [{
      path: relative(rootDirectory, path),
      bytes: readFileSync(path).toString('base64'),
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    }];
  }).sort((left, right) => left.path.localeCompare(right.path));
}

function assertCheckMadeNoFilesystemMutation(
  before: readonly FileSnapshot[],
  after: readonly FileSnapshot[],
): void {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error('CHECK_MODE_FILESYSTEM_MUTATION');
  }
}

describe('immutable VTT core publication', () => {
  it('publishes complete authoritative contracts and READY strictly last', () => {
    const handoffRoot = root();
    const order: string[] = [];
    const result = publishCore({
      repositoryRoot: process.cwd(), handoffRoot, hooks: { afterCreate: (path) => order.push(path) },
    });
    expect(result).toMatchObject({ status: 'published', files: 8 });
    expect(order).toHaveLength(8);
    expect(order.at(-1)).toBe('contracts/v1/READY.json');
    expect(order.slice(0, -1)).not.toContain('contracts/v1/READY.json');
    const manifest = JSON.parse(readFileSync(join(handoffRoot, 'contracts/v1/manifest.json'), 'utf8')) as {
      readonly entries: readonly { readonly path: string; readonly sha256: string; readonly length: number }[];
    };
    expect(manifest.entries).toHaveLength(5);
    for (const entry of manifest.entries) {
      const bytes = readFileSync(join(handoffRoot, entry.path));
      expect(entry.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
      expect(entry.length).toBe(bytes.length);
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/u);
    }
    expect(readFileSync(join(handoffRoot, 'contracts/v1/contracts.d.ts'), 'utf8'))
      .toBe(readFileSync('contracts/vtt-handoff/v1/contracts.d.ts', 'utf8'));
    const declarations = readFileSync(join(handoffRoot, 'contracts/v1/contracts.d.ts'), 'utf8');
    for (const declaration of [
      'export type SessionOpenRequest', 'export type SceneSnapshotRequest',
      'export type TokenMoveRequest', 'export type DoorSetRequest', 'export type LightSetRequest',
      'export interface HandoffSuccess', 'export interface HandoffFailure',
      'export interface SceneSnapshotEvent', 'export interface SessionOpenResult',
      'export interface MutationResult', 'export interface ArtRequest',
      'export interface ArtResult', 'export interface ArtProvenance',
    ]) expect(declarations).toContain(declaration);
    expect(readFileSync(join(handoffRoot, 'contracts/v1/README.md'), 'utf8')).toContain('Transcript examples are pending');
    expect(JSON.parse(readFileSync(join(handoffRoot, 'contracts/v1/READY.json'), 'utf8')))
      .toEqual({ core: 'ready', examples: 'pending' });
  });

  it('makes identical republication a no-op and refuses every inconsistent sealed bundle', () => {
    const handoffRoot = root();
    publishCore({ repositoryRoot: process.cwd(), handoffRoot });
    const readyPath = join(handoffRoot, 'contracts/v1/READY.json');
    const before = statSync(readyPath).mtimeMs;
    expect(publishCore({ repositoryRoot: process.cwd(), handoffRoot }).status).toBe('unchanged');
    expect(statSync(readyPath).mtimeMs).toBe(before);
    writeFileSync(join(handoffRoot, 'contracts/v1/contracts.d.ts'), 'conflict\n');
    expect(() => publishCore({ repositoryRoot: process.cwd(), handoffRoot }))
      .toThrow('INCONSISTENT_SEALED_BUNDLE');
    expect(statSync(readyPath).mtimeMs).toBe(before);

    const readyOnly = root();
    mkdirSync(join(readyOnly, 'contracts/v1'), { recursive: true });
    writeFileSync(join(readyOnly, 'contracts/v1/READY.json'), '{"core":"ready","examples":"pending"}\n');
    expect(() => publishCore({ repositoryRoot: process.cwd(), handoffRoot: readyOnly }))
      .toThrow('INCONSISTENT_SEALED_BUNDLE');
    expect(existsSync(join(readyOnly, 'contracts/v1/protocol.schema.json'))).toBe(false);
  });

  it('recovers interrupted compatible publication but never exposes READY early', () => {
    const handoffRoot = root();
    expect(() => publishCore({
      repositoryRoot: process.cwd(), handoffRoot,
      hooks: { afterCreate: (path) => { if (path === 'contracts/v1/README.md') throw new Error('SIMULATED_INTERRUPTION'); } },
    })).toThrow('SIMULATED_INTERRUPTION');
    expect(existsSync(join(handoffRoot, 'contracts/v1/READY.json'))).toBe(false);
    expect(publishCore({ repositoryRoot: process.cwd(), handoffRoot }).status).toBe('published');
    expect(existsSync(join(handoffRoot, 'contracts/v1/READY.json'))).toBe(true);
  });

  it('uses exclusive lock and partial creation without following collision symlinks', () => {
    const locked = root();
    writeFileSync(join(locked, '.contracts-v1.publish.lock'), 'other publisher\n');
    expect(() => publishCore({ repositoryRoot: process.cwd(), handoffRoot: locked }))
      .toThrow('PUBLICATION_IN_PROGRESS');
    expect(tree(locked)).toEqual(['.contracts-v1.publish.lock']);

    const collided = root();
    const contractDirectory = join(collided, 'contracts/v1');
    mkdirSync(contractDirectory, { recursive: true });
    const external = join(collided, 'external-target');
    writeFileSync(external, 'untouched\n');
    symlinkSync(external, join(contractDirectory, 'protocol.schema.json.partial.fixed'));
    expect(() => publishCore({
      repositoryRoot: process.cwd(), handoffRoot: collided, hooks: { nonce: () => 'fixed' },
    })).toThrow('PARTIAL_PUBLICATION_COLLISION');
    expect(readFileSync(external, 'utf8')).toBe('untouched\n');
    expect(existsSync(join(contractDirectory, 'protocol.schema.json'))).toBe(false);

    const finalRace = root();
    let raced = false;
    expect(() => publishCore({
      repositoryRoot: process.cwd(), handoffRoot: finalRace,
      hooks: {
        beforeFinalPlacement: (destination) => {
          if (raced) return;
          raced = true;
          writeFileSync(destination, 'racing publisher\n');
        },
      },
    })).toThrow('IMMUTABLE_BUNDLE_CONFLICT');
    expect(readFileSync(join(finalRace, 'contracts/v1/protocol.schema.json'), 'utf8'))
      .toBe('racing publisher\n');
    expect(existsSync(join(finalRace, 'contracts/v1/READY.json'))).toBe(false);
  });

  it('performs zero writes in check mode', () => {
    const missingRoot = root();
    const beforeMissingCheck = fileSnapshots(missingRoot);
    expect(() => publishCore({ repositoryRoot: process.cwd(), handoffRoot: missingRoot, check: true }))
      .toThrow('IMMUTABLE_BUNDLE_MISSING');
    assertCheckMadeNoFilesystemMutation(beforeMissingCheck, fileSnapshots(missingRoot));

    const handoffRoot = root();
    publishCore({ repositoryRoot: process.cwd(), handoffRoot });
    const beforeSuccessfulCheck = fileSnapshots(handoffRoot);
    expect(publishCore({ repositoryRoot: process.cwd(), handoffRoot, check: true }).status).toBe('verified');
    assertCheckMadeNoFilesystemMutation(beforeSuccessfulCheck, fileSnapshots(handoffRoot));

    const protocolPath = join(handoffRoot, 'contracts/v1/protocol.schema.json');
    writeFileSync(protocolPath, 'pre-existing conflict\n');
    const beforeFailingCheck = fileSnapshots(handoffRoot);
    expect(() => publishCore({ repositoryRoot: process.cwd(), handoffRoot, check: true }))
      .toThrow('INCONSISTENT_SEALED_BUNDLE');
    assertCheckMadeNoFilesystemMutation(beforeFailingCheck, fileSnapshots(handoffRoot));

    const controlBefore = fileSnapshots(handoffRoot);
    writeFileSync(protocolPath, 'mutant check rewrite\n');
    expect(() => assertCheckMadeNoFilesystemMutation(controlBefore, fileSnapshots(handoffRoot)))
      .toThrow('CHECK_MODE_FILESYSTEM_MUTATION');
  });
});
