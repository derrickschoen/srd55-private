import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { exportCharacterBackup } from '../../../src/backup/character-backup';
import { createBackupClient } from '../../../src/backup/client';
import { exportDatabaseBackup } from '../../../src/backup/database-backup';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import { CharacterCompletenessQueries } from '../../../src/queries/character-completeness';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { CharacterWorkspaceBuilder } from '../../../src/queries/character-workspace-builder';
import { createQueriesClient } from '../../../src/queries/client';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import { exportCharacterShare } from '../../../src/sharing/character-share';
import { createShareClient } from '../../../src/sharing/client';
import { encodeShareFragment } from '../../../src/sharing/codec';
import {
  PartyCredentialVault,
  type PartyCredentialStorage,
} from '../../../src/party/credentials';
import type {
  CredentialLease,
  RepositoryConfig,
  RepositoryPath,
} from '../../../src/party/storage/contracts';
import {
  GitHubPartyStorage,
  type GitHubCommitMessage,
} from '../../../src/party/storage/github';
import {
  agentReferenceJson,
  buildAgentReference,
} from '../../../src/ui/screens/planner/agent-reference';
import { sheetFacts } from '../../../src/ui/screens/sheet/sheet-view';
import {
  githubCapturedFixture,
  githubCharacterPath,
  githubFixtureRepository,
  githubInitialBase64,
  githubLibraryPath,
} from '../../fixtures/party-storage/github/fixtures';
import { createRecordedFixtureFetch } from '../../fixtures/party-storage/mock-fetch';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const SENTINEL = 'PARTY_TOKEN_NEVER_TRAVELS_4e6f9b';

export const PARTY_TOKEN_SURFACES = [
  { id: 'character-export-bytes', coverage: 'covered' },
  { id: 'library-export-bytes', coverage: 'owed-to-DOC-L' },
  { id: 'share-url', coverage: 'covered' },
  { id: 'database-backup-bytes', coverage: 'covered' },
  { id: 'observability-arguments', coverage: 'covered' },
  { id: 'sheet-structured-json', coverage: 'covered' },
  { id: 'planner-structured-json', coverage: 'covered' },
  { id: 'worker-rpc-request-payloads', coverage: 'covered' },
] as const;

type CoveredSurfaceId = Extract<
  (typeof PARTY_TOKEN_SURFACES)[number],
  { readonly coverage: 'covered' }
>['id'];

class MemoryStorage implements PartyCredentialStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class CapturingTransport implements RpcTransport {
  readonly requests: RpcRequest[] = [];
  readonly #messages = new Set<(event: MessageEvent<RpcResponse>) => void>();
  readonly #errors = new Set<(event: ErrorEvent) => void>();

  constructor(private readonly results: Readonly<Record<string, unknown>>) {}

  postMessage(message: RpcRequest): void {
    this.requests.push(structuredClone(message));
    const response: RpcResponse = {
      id: message.id,
      ok: true,
      result: this.results[message.method],
    };
    queueMicrotask(() => {
      const event = new MessageEvent<RpcResponse>('message', { data: response });
      for (const listener of this.#messages) listener(event);
    });
  }

  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<RpcResponse>) => void,
  ): void;
  addEventListener(
    type: 'error',
    listener: (event: ErrorEvent) => void,
  ): void;
  addEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.add(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<RpcResponse>) => void,
  ): void;
  removeEventListener(
    type: 'error',
    listener: (event: ErrorEvent) => void,
  ): void;
  removeEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.delete(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.delete(listener as (event: ErrorEvent) => void);
    }
  }
}

function bytesFromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function commitMessage(path: RepositoryPath): GitHubCommitMessage {
  return path.startsWith('library/')
    ? 'Publish party library document'
    : 'Publish party character document';
}

function requestHeaders(headers: Headers): readonly [string, string][] {
  const entries: [string, string][] = [];
  headers.forEach((value, name) => entries.push([name, value]));
  return entries;
}

function includesSentinel(value: unknown): boolean {
  if (value instanceof Uint8Array) {
    return Buffer.from(value).includes(Buffer.from(SENTINEL));
  }
  if (value instanceof Error) {
    return `${value.name}\n${value.message}\n${value.stack ?? ''}`.includes(
      SENTINEL,
    );
  }
  if (typeof value === 'string') return value.includes(SENTINEL);
  if (Array.isArray(value)) return value.some(includesSentinel);
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, nested]) => key.includes(SENTINEL) || includesSentinel(nested),
    );
  }
  return false;
}

interface SentinelFlow {
  readonly surfaces: Readonly<Record<CoveredSurfaceId, unknown>>;
  readonly observabilityCaptureCounts: Readonly<{
    console: number;
    errors: number;
    analytics: number;
  }>;
  readonly secretLocationsBeforeForget: readonly string[];
  readonly storageAfterForget: readonly [string, string][];
}

async function runSentinelFlow(): Promise<SentinelFlow> {
  const consoleSpies = [
    vi.spyOn(console, 'debug').mockImplementation(() => undefined),
    vi.spyOn(console, 'info').mockImplementation(() => undefined),
    vi.spyOn(console, 'log').mockImplementation(() => undefined),
    vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    vi.spyOn(console, 'error').mockImplementation(() => undefined),
  ];
  const captureError = vi.fn((..._arguments: unknown[]): void => undefined);
  const captureAnalytics = vi.fn(
    (..._arguments: unknown[]): void => undefined,
  );

  // Positive controls keep every claimed observability capture wired. Replacing
  // any control argument with SENTINEL must fail the named surface sweep.
  console.log('party observability console capture control');
  captureError('party observability error capture control');
  captureAnalytics('party observability analytics capture control');

  const credentialStorage = new MemoryStorage();
  const config: RepositoryConfig = {
    forge: 'github',
    repository: githubFixtureRepository,
    defaultBranch: 'main',
  };
  const vault = new PartyCredentialVault(credentialStorage);
  expect(vault.save(config, SENTINEL)).toEqual({ kind: 'saved' });
  const leaseResult = vault.lease(config, {
    // P1-GH's captured fixture establishes this format; the vault only applies it.
    name: 'authorization',
    prefix: 'Bearer ',
  });
  expect(leaseResult.kind).toBe('available');
  if (leaseResult.kind !== 'available') {
    throw new Error('Expected the fixture-backed credential lease');
  }
  const lease: CredentialLease = leaseResult.lease;

  const fixtures = [
    githubCapturedFixture('get-file'),
    githubCapturedFixture('put-unicode'),
  ];
  const replay = createRecordedFixtureFetch(
    fixtures,
    () => 'PARTY-TOKEN-NEVER-TRAVELS fixture-backed read/write flow',
  );
  const requests: Request[] = [];
  const capturingFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request.clone());
    return replay(request);
  };
  const remote = new GitHubPartyStorage({
    config,
    credential: lease,
    commitMessageForPath: commitMessage,
    fetch: capturingFetch,
  });
  await expect(remote.read(githubLibraryPath)).resolves.toMatchObject({
    kind: 'success',
  });
  await expect(
    remote.write(
      githubCharacterPath,
      bytesFromBase64(githubInitialBase64),
      { kind: 'create-only' },
    ),
  ).resolves.toMatchObject({ kind: 'success' });

  const sqlite3 = await getSqlite3();
  const lifecycle = createApplicationLifecycle(
    sqlite3,
    new MemoryDatabaseStorage(sqlite3),
  );
  lifecycle.open();
  let rpc: RpcClient | undefined;
  try {
    const characterId = lifecycle.database.exec(
      `INSERT INTO characters
         (name, strength, dexterity, constitution, intelligence, wisdom, charisma)
       VALUES ('Sentinel Boundary Hero', 10, 12, 14, 16, 13, 8)`,
    ).lastInsertId;
    const characterDocument = exportCharacterBackup(
      lifecycle.database,
      characterId,
      '2026-08-02T12:00:00.000Z',
    );
    const databaseDocument = await exportDatabaseBackup(
      lifecycle,
      '2026-08-02T12:00:00.000Z',
    );
    const shareDocument = exportCharacterShare(lifecycle.database, characterId);
    const shareFragment = await encodeShareFragment(shareDocument);
    const sheet = new CharacterSheetBuilder(lifecycle.database).build(
      characterId,
    );
    const workspace = new CharacterWorkspaceBuilder(lifecycle.database).build(
      characterId,
    );
    const completeness = new CharacterCompletenessQueries(
      lifecycle.database,
    ).build(characterId);
    const plannerJson = agentReferenceJson(
      buildAgentReference(workspace, completeness).reference,
    );

    const transport = new CapturingTransport({
      'backup.exportCharacter': characterDocument,
      'backup.exportDatabase': databaseDocument,
      'share.exportCharacter': shareDocument,
      'queries.characters.sheet': sheet,
      'queries.characters.workspace': workspace,
      'queries.characters.completeness': completeness,
    });
    rpc = new RpcClient(transport);
    await createBackupClient(rpc).exportCharacter(characterId);
    await createBackupClient(rpc).exportDatabase();
    await createShareClient(rpc).createFragment(characterId);
    const queries = createQueriesClient(rpc);
    await queries.sheet(characterId);
    const projectedWorkspace = await queries.workspace(characterId);
    const projectedCompleteness = await queries.completeness(characterId);
    const projectedPlannerJson = agentReferenceJson(
      buildAgentReference(projectedWorkspace, projectedCompleteness).reference,
    );

    const observabilityArguments = {
      console: consoleSpies.flatMap((spy) => spy.mock.calls),
      errors: captureError.mock.calls,
      analytics: captureAnalytics.mock.calls,
    };

    const storageBeforeForget = [...credentialStorage.values.entries()];
    const requestParts = await Promise.all(
      requests.map(async (request, index) => ({
        index,
        url: request.url,
        body: await request.clone().text(),
        headers: requestHeaders(request.headers),
      })),
    );
    const secretLocationsBeforeForget = [
      ...requestParts.flatMap((request) => [
        ...(request.url.includes(SENTINEL)
          ? [`mock request ${String(request.index)} URL`]
          : []),
        ...(request.body.includes(SENTINEL)
          ? [`mock request ${String(request.index)} body`]
          : []),
        ...request.headers.flatMap(([name, value]) =>
          value.includes(SENTINEL)
            ? [`mock request ${String(request.index)} ${name}`]
            : [],
        ),
      ]),
      ...storageBeforeForget.flatMap(([key, value]) => [
        ...(key.includes(SENTINEL) ? ['session storage key'] : []),
        ...(value.includes(SENTINEL) ? ['session storage value'] : []),
      ]),
    ];

    expect(vault.forget(config)).toEqual({ kind: 'forgotten' });
    return {
      surfaces: {
        'character-export-bytes': new TextEncoder().encode(
          JSON.stringify(characterDocument),
        ),
        'share-url': `https://srd55.example/characters/#${shareFragment}`,
        'database-backup-bytes': databaseDocument.sqlite,
        'observability-arguments': observabilityArguments,
        'sheet-structured-json': JSON.stringify(sheetFacts(sheet)),
        'planner-structured-json': `${plannerJson}\n${projectedPlannerJson}`,
        'worker-rpc-request-payloads': transport.requests,
      },
      observabilityCaptureCounts: {
        console: observabilityArguments.console.length,
        errors: observabilityArguments.errors.length,
        analytics: observabilityArguments.analytics.length,
      },
      secretLocationsBeforeForget,
      storageAfterForget: [...credentialStorage.values.entries()],
    };
  } finally {
    rpc?.close();
    lifecycle.close();
  }
}

describe('PARTY-TOKEN-NEVER-TRAVELS', () => {
  let flow: SentinelFlow;

  beforeAll(async () => {
    flow = await runSentinelFlow();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  for (const surface of PARTY_TOKEN_SURFACES) {
    if (surface.coverage === 'covered') {
      it(`PARTY-TOKEN-NEVER-TRAVELS excludes the sentinel from ${surface.id}`, () => {
        expect(includesSentinel(flow.surfaces[surface.id])).toBe(false);
      });
    }
  }

  it('PARTY-TOKEN-NEVER-TRAVELS keeps every observability capture live', () => {
    expect(flow.observabilityCaptureCounts.console).toBeGreaterThan(0);
    expect(flow.observabilityCaptureCounts.errors).toBeGreaterThan(0);
    expect(flow.observabilityCaptureCounts.analytics).toBeGreaterThan(0);
  });

  it('keeps the library export surface explicitly owed to DOC-L', () => {
    expect(
      PARTY_TOKEN_SURFACES.find(({ id }) => id === 'library-export-bytes'),
    ).toEqual({ id: 'library-export-bytes', coverage: 'owed-to-DOC-L' });
  });

  it('allows the sentinel only in mock authorization headers and session storage before Forget', () => {
    expect(flow.secretLocationsBeforeForget).toEqual([
      'mock request 0 authorization',
      'mock request 1 authorization',
      'session storage value',
    ]);
    expect(flow.storageAfterForget).toEqual([]);
  });
});
