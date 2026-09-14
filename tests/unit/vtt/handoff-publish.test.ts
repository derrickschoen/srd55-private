import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync,
} from '../../helpers/test-filesystem';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';
import ts from 'typescript';
import { publishCore } from '../../../tools/vtt-handoff/publish';
import {
  DEFAULT_REPOSITORY_IDENTITY_POLICY,
  validateRepositoryRoot,
  type RepositoryIdentityPolicy,
} from '../../../tools/vtt-handoff/paths';

const CORE_INPUT_PATHS = [
  'contracts/vtt-handoff/v1/protocol.schema.json',
  'contracts/vtt-handoff/v1/art.schema.json',
  'contracts/vtt-handoff/v1/contracts.d.ts',
  'fixtures/scenes/two-room.v1.json',
  'fixtures/scenes/two-room.snapshots.v1.json',
] as const;

interface RepositoryFixture {
  readonly root: string;
  readonly policy: RepositoryIdentityPolicy;
}

function repository(): RepositoryFixture {
  const fixtureRoot = root();
  mkdirSync(join(fixtureRoot, '.git'));
  writeFileSync(join(fixtureRoot, 'package.json'), '{"name":"srd-55"}\n');
  for (const path of CORE_INPUT_PATHS) {
    const destination = join(fixtureRoot, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, readFileSync(join(process.cwd(), path)));
  }
  return {
    root: fixtureRoot,
    policy: { ownerCheckout: fixtureRoot, authorizedWorktrees: [] },
  };
}

type PublishOptions = Omit<NonNullable<Parameters<typeof publishCore>[0]>, 'identityPolicy' | 'repositoryRoot'>;

function publish(
  fixture: RepositoryFixture,
  options: PublishOptions = {},
): ReturnType<typeof publishCore> {
  return publishCore({
    ...options,
    repositoryRoot: fixture.root,
    identityPolicy: fixture.policy,
  });
}

function inMemoryDefaultPolicyValidator(removeGuard: boolean): typeof validateRepositoryRoot {
  const path = join(process.cwd(), 'tools/vtt-handoff/paths.ts');
  const source = readFileSync(path, 'utf8');
  const selected = removeGuard
    ? source.replace(
      "if (!allowed) throw new Error('UNAUTHORIZED_REPOSITORY_ROOT');",
      "if (false) throw new Error('UNAUTHORIZED_REPOSITORY_ROOT');",
    )
    : source;
  if (removeGuard && selected === source) throw new Error('DEFAULT_GUARD_MUTANT_NOT_APPLIED');
  const compiled = ts.transpileModule(selected, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  const module: { exports: unknown } = { exports: {} };
  const realRequire = createRequire(import.meta.url);
  const candidate = '/virtual/unlisted-worktree';
  const owner = '/virtual/owner-checkout';
  const sharedGitDirectory = '/virtual/shared.git';
  const filesystem = {
    existsSync: () => true,
    lstatSync: (pathValue: string) => {
      if (pathValue.endsWith('/.git')) {
        return { isDirectory: () => true, isFile: () => false };
      }
      throw Object.assign(new Error(`ENOENT: ${pathValue}`), { code: 'ENOENT' });
    },
    readFileSync: (pathValue: string) => {
      if (pathValue.endsWith('/package.json')) return '{"name":"srd-55"}\n';
      throw Object.assign(new Error(`ENOENT: ${pathValue}`), { code: 'ENOENT' });
    },
    realpathSync: (pathValue: string) => {
      if (pathValue === candidate) return candidate;
      if (pathValue === DEFAULT_REPOSITORY_IDENTITY_POLICY.ownerCheckout) return owner;
      if (pathValue.endsWith('/.git')) return sharedGitDirectory;
      throw Object.assign(new Error(`ENOENT: ${pathValue}`), { code: 'ENOENT' });
    },
  };
  const requireFunction = (specifier: string): unknown => specifier === 'node:fs'
    ? filesystem
    : realRequire(specifier);
  const evaluate = new Function('exports', 'require', 'module', '__filename', '__dirname', compiled) as (
    exports: unknown,
    requireModule: (specifier: string) => unknown,
    commonJsModule: { exports: unknown },
    filename: string,
    directory: string,
  ) => void;
  evaluate(module.exports, requireFunction, module, path, dirname(path));
  const exported = module.exports;
  if (typeof exported !== 'object' || exported === null ||
    !('validateRepositoryRoot' in exported) || typeof exported.validateRepositoryRoot !== 'function') {
    throw new Error('IN_MEMORY_PATHS_MODULE_INVALID');
  }
  return exported.validateRepositoryRoot as typeof validateRepositoryRoot;
}

const TEMP_ROOTS = new Set<string>();

function root(): string {
  const path = mkdtempSync(join(tmpdir(), 'vtt-handoff-publish-'));
  TEMP_ROOTS.add(path);
  return path;
}

afterEach(() => {
  for (const path of TEMP_ROOTS) rmSync(path, { recursive: true, force: true });
  TEMP_ROOTS.clear();
});

function tree(directory: string): readonly string[] {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' }).sort();
}

interface DirectorySnapshot {
  readonly kind: 'directory';
  readonly path: string;
}

interface FileSnapshot {
  readonly kind: 'file';
  readonly path: string;
  readonly bytes: string;
  readonly mtimeMs: number;
  readonly size: number;
}

type FilesystemSnapshot = DirectorySnapshot | FileSnapshot;

function filesystemSnapshots(
  rootDirectory: string,
  directory = rootDirectory,
): readonly FilesystemSnapshot[] {
  const directorySnapshot: DirectorySnapshot = {
    kind: 'directory',
    path: relative(rootDirectory, directory) || '.',
  };
  const descendants = readdirSync(directory, { withFileTypes: true })
    .flatMap((entry): readonly FilesystemSnapshot[] => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return filesystemSnapshots(rootDirectory, path);
      const stat = statSync(path);
      return [{
        kind: 'file',
        path: relative(rootDirectory, path),
        bytes: readFileSync(path).toString('base64'),
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      }];
    });
  return [directorySnapshot, ...descendants]
    .sort((left, right) => left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind));
}

function assertCheckMadeNoFilesystemMutation(
  before: readonly FilesystemSnapshot[],
  after: readonly FilesystemSnapshot[],
): void {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error('CHECK_MODE_FILESYSTEM_MUTATION');
  }
}

describe('immutable VTT core publication', () => {
  it('kills M3-SPEC-POLICY-OMIT while publishing contracts and READY strictly last', () => {
    const fixture = repository();
    expect(fixture.policy).toEqual({ ownerCheckout: fixture.root, authorizedWorktrees: [] });
    expect(fixture.root).not.toBe(process.cwd());
    const handoffRoot = root();
    const order: string[] = [];
    const result = publish(fixture, {
      handoffRoot, hooks: { afterCreate: (path) => order.push(path) },
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
    expect(readFileSync(join(handoffRoot, 'contracts/v1/README.md'), 'utf8'))
      .toContain('Transcript examples are pending');
    expect(JSON.parse(readFileSync(join(handoffRoot, 'contracts/v1/READY.json'), 'utf8')))
      .toEqual({ core: 'ready', examples: 'pending' });
  });

  it('makes identical republication a no-op and refuses every inconsistent sealed bundle', () => {
    const fixture = repository();
    const handoffRoot = root();
    publish(fixture, { handoffRoot });
    const readyPath = join(handoffRoot, 'contracts/v1/READY.json');
    const before = statSync(readyPath).mtimeMs;
    expect(publish(fixture, { handoffRoot }).status).toBe('unchanged');
    expect(statSync(readyPath).mtimeMs).toBe(before);
    writeFileSync(join(handoffRoot, 'contracts/v1/contracts.d.ts'), 'conflict\n');
    expect(() => publish(fixture, { handoffRoot }))
      .toThrow('INCONSISTENT_SEALED_BUNDLE');
    expect(statSync(readyPath).mtimeMs).toBe(before);

    const readyOnly = root();
    mkdirSync(join(readyOnly, 'contracts/v1'), { recursive: true });
    writeFileSync(join(readyOnly, 'contracts/v1/READY.json'), '{"core":"ready","examples":"pending"}\n');
    expect(() => publish(fixture, { handoffRoot: readyOnly }))
      .toThrow('INCONSISTENT_SEALED_BUNDLE');
    expect(existsSync(join(readyOnly, 'contracts/v1/protocol.schema.json'))).toBe(false);
  });

  it('recovers interrupted compatible publication but never exposes READY early', () => {
    const fixture = repository();
    const handoffRoot = root();
    expect(() => publish(fixture, {
      handoffRoot,
      hooks: {
        afterCreate: (path) => {
          if (path === 'contracts/v1/README.md') throw new Error('SIMULATED_INTERRUPTION');
        },
      },
    })).toThrow('SIMULATED_INTERRUPTION');
    expect(existsSync(join(handoffRoot, 'contracts/v1/READY.json'))).toBe(false);
    expect(publish(fixture, { handoffRoot }).status).toBe('published');
    expect(existsSync(join(handoffRoot, 'contracts/v1/READY.json'))).toBe(true);
  });

  it('uses exclusive lock and partial creation without following collision symlinks', () => {
    const fixture = repository();
    const locked = root();
    writeFileSync(join(locked, '.contracts-v1.publish.lock'), 'other publisher\n');
    expect(() => publish(fixture, { handoffRoot: locked }))
      .toThrow('PUBLICATION_IN_PROGRESS');
    expect(tree(locked)).toEqual(['.contracts-v1.publish.lock']);

    const collided = root();
    const contractDirectory = join(collided, 'contracts/v1');
    mkdirSync(contractDirectory, { recursive: true });
    const external = join(collided, 'external-target');
    writeFileSync(external, 'untouched\n');
    symlinkSync(external, join(contractDirectory, 'protocol.schema.json.partial.fixed'));
    expect(() => publish(fixture, {
      handoffRoot: collided, hooks: { nonce: () => 'fixed' },
    })).toThrow('PARTIAL_PUBLICATION_COLLISION');
    expect(readFileSync(external, 'utf8')).toBe('untouched\n');
    expect(existsSync(join(contractDirectory, 'protocol.schema.json'))).toBe(false);

    const finalRace = root();
    let raced = false;
    expect(() => publish(fixture, {
      handoffRoot: finalRace,
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
    const fixture = repository();
    const missingRoot = root();
    const beforeMissingCheck = filesystemSnapshots(missingRoot);
    expect(() => publish(fixture, { handoffRoot: missingRoot, check: true }))
      .toThrow('IMMUTABLE_BUNDLE_MISSING');
    assertCheckMadeNoFilesystemMutation(beforeMissingCheck, filesystemSnapshots(missingRoot));

    const handoffRoot = root();
    publish(fixture, { handoffRoot });
    const beforeSuccessfulCheck = filesystemSnapshots(handoffRoot);
    expect(publish(fixture, { handoffRoot, check: true }).status).toBe('verified');
    assertCheckMadeNoFilesystemMutation(beforeSuccessfulCheck, filesystemSnapshots(handoffRoot));

    const protocolPath = join(handoffRoot, 'contracts/v1/protocol.schema.json');
    writeFileSync(protocolPath, 'pre-existing conflict\n');
    const beforeFailingCheck = filesystemSnapshots(handoffRoot);
    expect(() => publish(fixture, { handoffRoot, check: true }))
      .toThrow('INCONSISTENT_SEALED_BUNDLE');
    assertCheckMadeNoFilesystemMutation(beforeFailingCheck, filesystemSnapshots(handoffRoot));

    const directoryControlRoot = root();
    const directoryControlBefore = filesystemSnapshots(directoryControlRoot);
    mkdirSync(join(directoryControlRoot, 'unexpected'));
    expect(() => assertCheckMadeNoFilesystemMutation(
      directoryControlBefore,
      filesystemSnapshots(directoryControlRoot),
    )).toThrow('CHECK_MODE_FILESYSTEM_MUTATION');

    const controlBefore = filesystemSnapshots(handoffRoot);
    writeFileSync(protocolPath, 'mutant check rewrite\n');
    expect(() => assertCheckMadeNoFilesystemMutation(controlBefore, filesystemSnapshots(handoffRoot)))
      .toThrow('CHECK_MODE_FILESYSTEM_MUTATION');
  });

  it('kills M3-DEFAULT-GUARD-REMOVE and M3-SPEC-POLICY-BROAD', () => {
    const candidate = '/virtual/unlisted-worktree';
    expect(() => inMemoryDefaultPolicyValidator(false)(candidate, DEFAULT_REPOSITORY_IDENTITY_POLICY))
      .toThrow('UNAUTHORIZED_REPOSITORY_ROOT');
    expect(inMemoryDefaultPolicyValidator(true)(candidate, DEFAULT_REPOSITORY_IDENTITY_POLICY)).toBe(candidate);
  });
});
