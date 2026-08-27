import type { EncounterSessionId } from '../combat/values';
import { encounterConclusionAfter } from '../combat/encounter';
import {
  decodeSavedSessionFingerprint,
  MemoryBrowserSessionStore,
  exportSavedSession,
  importSavedSession,
  type BrowserSessionStore,
  type DecodedSavedSessionFingerprint,
  type SessionRevision,
} from './session-persistence';
import type { SaveRetention } from './save-manager';
import { autosavePoolForTrigger, type AutosavePool, type AutosaveTrigger } from './save-manager';

const DATABASE_NAME = 'srd55-vtt-sessions';
const DATABASE_VERSION = 1;
const REVISION_STORE = 'revisions';
const SESSION_STORE = 'sessions';
const SNAPSHOT_STORE = 'snapshots';

const LEGACY_SESSION_PREFIX = 'srd55:vtt-session:';
const LEGACY_METADATA_PREFIX = 'srd55:vtt-session-metadata:';
const LEGACY_AUTOSAVE_PREFIX = 'srd55:vtt-autosave:';
const LEGACY_TRUNCATED_PREFIX = 'srd55:vtt-session-truncated:';
const LIKELY_LOCAL_STORAGE_LIMIT_BYTES = 4 * 1024 * 1024;

interface BrowserSaveMetadata {
  readonly sessionId: EncounterSessionId;
  readonly name: string;
  readonly updatedAt: string;
  readonly retention: SaveRetention;
  readonly migrationStatus: 'native' | 'complete' | 'truncated';
}

interface StoredAutosaveSnapshot extends DecodedSavedSessionFingerprint {
  readonly storageId: string;
  readonly trigger: AutosaveTrigger;
  readonly pool: AutosavePool;
  readonly name: string;
  readonly updatedAt: string;
  readonly retention: SaveRetention;
}

interface LegacyAutosaveSnapshot {
  readonly storageId: string;
  readonly sessionId: EncounterSessionId;
  readonly trigger: AutosaveTrigger;
  readonly pool: AutosavePool;
  readonly name: string;
  readonly updatedAt: string;
  readonly bytes: string;
  readonly retention: SaveRetention;
}

interface QueuedBrowserWrite {
  readonly operation: BrowserSessionWriteError['operation'];
  readonly prepare: () => Promise<(transaction: IDBTransaction) => void>;
  readonly acknowledge: () => void;
}

export interface StoredBrowserSave extends DecodedSavedSessionFingerprint {
  readonly storageId: string;
  readonly name: string;
  readonly updatedAt: string;
  readonly retention: SaveRetention;
  readonly migrationStatus: BrowserSaveMetadata['migrationStatus'];
}

export class BrowserSessionWriteError extends Error {
  readonly kind = 'browser_session_write_failed';

  constructor(
    readonly operation: 'open' | 'migration' | 'write' | 'delete' | 'rename' | 'restore',
    readonly quotaExceeded: boolean,
    options?: ErrorOptions,
  ) {
    super(
      quotaExceeded
        ? 'Browser session storage is full. This revision was not saved; export a copy before continuing.'
        : 'Browser session storage failed. This revision was not saved; export a copy before continuing.',
      options,
    );
    this.name = 'BrowserSessionWriteError';
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

function storageError(
  operation: BrowserSessionWriteError['operation'],
  error: unknown,
): BrowserSessionWriteError {
  return error instanceof BrowserSessionWriteError
    ? error
    : new BrowserSessionWriteError(operation, isQuotaError(error), { cause: error });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error), { once: true });
    transaction.addEventListener('error', () => reject(transaction.error), { once: true });
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

function openDatabase(indexedDb: IDBFactory, databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const opening = indexedDb.open(databaseName, DATABASE_VERSION);
    opening.addEventListener('upgradeneeded', () => {
      for (const storeName of [REVISION_STORE, SESSION_STORE, SNAPSHOT_STORE]) {
        if (!opening.result.objectStoreNames.contains(storeName)) {
          opening.result.createObjectStore(storeName);
        }
      }
    });
    opening.addEventListener('success', () => resolve(opening.result), { once: true });
    opening.addEventListener('error', () => reject(opening.error), { once: true });
  });
}

function revisionKey(sessionId: EncounterSessionId, revision: number): string {
  return `${sessionId}\u0000${String(revision).padStart(12, '0')}`;
}

async function encodedStoredRevision(revision: SessionRevision): Promise<ArrayBuffer> {
  const compressed = new Blob([JSON.stringify(revision)], { type: 'application/json' })
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Response(compressed).arrayBuffer();
}

async function decodedStoredRevision(value: unknown): Promise<SessionRevision> {
  const decoded: unknown = value instanceof ArrayBuffer
    ? JSON.parse(await new Response(
        new Blob([value]).stream().pipeThrough(new DecompressionStream('gzip')),
      ).text())
    : value;
  if (!isRecord(decoded) || typeof decoded.sessionId !== 'string' ||
    !Number.isSafeInteger(decoded.revision) || typeof decoded.checksum !== 'string') {
    throw new TypeError('Stored VTT session revision is malformed.');
  }
  return decoded as unknown as SessionRevision;
}

function retention(value: unknown): SaveRetention {
  if (isRecord(value) && value.kind === 'named') return { kind: 'named' };
  if (isRecord(value) && value.kind === 'autosave' &&
    (value.pool === 'per_round' || value.pool === 'encounter_boundary')) {
    return { kind: 'autosave', pool: value.pool };
  }
  return { kind: 'autosave', pool: 'per_round' };
}

function legacyMetadata(value: string | null, sessionId: EncounterSessionId): BrowserSaveMetadata | null {
  if (value === null) return null;
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed) || typeof parsed.name !== 'string' || typeof parsed.updatedAt !== 'string') {
    return null;
  }
  return {
    sessionId,
    name: parsed.name,
    updatedAt: parsed.updatedAt,
    retention: retention(parsed.retention),
    migrationStatus: 'complete',
  };
}

function legacySnapshot(value: string): LegacyAutosaveSnapshot | null {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed) || typeof parsed.storageId !== 'string' ||
    typeof parsed.sessionId !== 'string' || typeof parsed.trigger !== 'string' ||
    typeof parsed.pool !== 'string' || typeof parsed.name !== 'string' ||
    typeof parsed.updatedAt !== 'string' || typeof parsed.bytes !== 'string') return null;
  const trigger: AutosaveTrigger | null = (() => {
    switch (parsed.trigger) {
      case 'round_boundary':
      case 'encounter_start':
      case 'encounter_end':
      case 'rest_boundary':
      case 'rest_interruption': return parsed.trigger;
      case 'short_rest_boundary':
      case 'long_rest_boundary': return 'rest_boundary';
      default: return null;
    }
  })();
  if (trigger === null) return null;
  if (parsed.pool !== 'per_round' && parsed.pool !== 'encounter_boundary') return null;
  const decodedRetention = retention(parsed.retention);
  if (decodedRetention.kind !== 'named' &&
    (decodedRetention.kind !== 'autosave' || decodedRetention.pool !== parsed.pool)) return null;
  return {
    storageId: parsed.storageId,
    sessionId: parsed.sessionId as EncounterSessionId,
    trigger,
    pool: parsed.pool,
    name: parsed.name,
    updatedAt: parsed.updatedAt,
    bytes: parsed.bytes,
    retention: decodedRetention,
  };
}

/**
 * Browser-authoritative VTT store. Rules-engine reads use the cache populated by
 * open(); flush() is the acknowledgement boundary for queued IndexedDB writes.
 */
export class IndexedDbBrowserSessionStore implements BrowserSessionStore {
  #memory = new MemoryBrowserSessionStore();
  readonly #metadata = new Map<EncounterSessionId, BrowserSaveMetadata>();
  readonly #snapshots = new Map<string, StoredAutosaveSnapshot>();
  readonly #queuedWrites: QueuedBrowserWrite[] = [];
  #scheduledWrite: Promise<void> | null = null;
  #latestAcknowledgement: Promise<void> = Promise.resolve();
  #failure: BrowserSessionWriteError | null = null;

  private constructor(
    private readonly database: IDBDatabase,
    private readonly legacyStorage: Storage,
  ) {}

  static async open(
    indexedDb: IDBFactory,
    legacyStorage: Storage,
    options: { readonly databaseName?: string } = {},
  ): Promise<IndexedDbBrowserSessionStore> {
    let database: IDBDatabase;
    try {
      database = await openDatabase(indexedDb, options.databaseName ?? DATABASE_NAME);
    } catch (error: unknown) {
      throw storageError('open', error);
    }
    const store = new IndexedDbBrowserSessionStore(database, legacyStorage);
    try {
      await store.#migrateLegacy();
      await store.#preload();
      const removed = store.#pruneAutosaves();
      if (removed.length > 0) {
        const transaction = database.transaction(SNAPSHOT_STORE, 'readwrite');
        for (const storageId of removed) transaction.objectStore(SNAPSHOT_STORE).delete(storageId);
        await transactionComplete(transaction);
      }
      return store;
    } catch (error: unknown) {
      database.close();
      throw storageError('migration', error);
    }
  }

  append(revision: SessionRevision): void {
    this.#requireWritable();
    const previous = this.#memory.revisions(revision.sessionId).at(-1);
    this.#memory.append(revision);
    const current = this.#metadata.get(revision.sessionId);
    const metadata: BrowserSaveMetadata = {
      sessionId: revision.sessionId,
      name: current?.name ?? revision.sessionId,
      updatedAt: new Date().toISOString(),
      retention: current?.retention ?? { kind: 'autosave', pool: 'per_round' },
      migrationStatus: current?.migrationStatus ?? 'native',
    };
    this.#metadata.set(revision.sessionId, metadata);

    const added: StoredAutosaveSnapshot[] = [];
    for (const trigger of this.#autosaveTriggers(previous, revision)) {
      const snapshot = this.#captureAutosave(revision, trigger);
      this.#snapshots.set(snapshot.storageId, snapshot);
      added.push(snapshot);
    }
    const removed = this.#pruneAutosaves();
    this.#enqueue('write', async () => {
      const stored = await encodedStoredRevision(revision);
      return (transaction) => {
        transaction.objectStore(REVISION_STORE).put(stored, revisionKey(revision.sessionId, revision.revision));
        transaction.objectStore(SESSION_STORE).put(metadata, revision.sessionId);
        for (const snapshot of added) transaction.objectStore(SNAPSHOT_STORE).put(snapshot, snapshot.storageId);
        for (const storageId of removed) transaction.objectStore(SNAPSHOT_STORE).delete(storageId);
      };
    });
  }

  appendAll(revisions: readonly SessionRevision[]): void {
    const first = revisions[0];
    if (first === undefined) return;
    this.#requireWritable();
    this.#memory.appendAll(revisions);
    const current = this.#metadata.get(first.sessionId);
    const metadata: BrowserSaveMetadata = {
      sessionId: first.sessionId,
      name: current?.name ?? first.sessionId,
      updatedAt: new Date().toISOString(),
      retention: current?.retention ?? { kind: 'autosave', pool: 'per_round' },
      migrationStatus: current?.migrationStatus ?? 'native',
    };
    this.#metadata.set(first.sessionId, metadata);
    this.#enqueue('write', async () => {
      const stored = await Promise.all(revisions.map(async (revision) => ({
        bytes: await encodedStoredRevision(revision),
        key: revisionKey(revision.sessionId, revision.revision),
      })));
      return (transaction) => {
        for (const revision of stored) {
          transaction.objectStore(REVISION_STORE).put(revision.bytes, revision.key);
        }
        transaction.objectStore(SESSION_STORE).put(metadata, first.sessionId);
      };
    });
  }

  revisions(sessionId: EncounterSessionId): readonly SessionRevision[] {
    return this.#memory.revisions(sessionId);
  }

  async flush(): Promise<void> {
    // Acknowledge the durable high-water mark captured by this call. Writes
    // published later must not turn one render acknowledgement into an
    // unbounded drain of a still-moving controller stream.
    await this.#latestAcknowledgement;
    if (this.#failure !== null) throw this.#failure;
  }

  close(): void {
    this.database.close();
  }

  async remove(sessionId: EncounterSessionId): Promise<void> {
    this.#requireWritable();
    const revisionCount = this.#memory.revisions(sessionId).length;
    const snapshotIds = [...this.#snapshots.values()]
      .filter((snapshot) => snapshot.sessionId === sessionId)
      .map((snapshot) => snapshot.storageId);
    await this.#directWrite('delete', async () => {
      const transaction = this.database.transaction(
        [REVISION_STORE, SESSION_STORE, SNAPSHOT_STORE],
        'readwrite',
      );
      for (let revision = 1; revision <= revisionCount; revision += 1) {
        transaction.objectStore(REVISION_STORE).delete(revisionKey(sessionId, revision));
      }
      transaction.objectStore(SESSION_STORE).delete(sessionId);
      for (const storageId of snapshotIds) transaction.objectStore(SNAPSHOT_STORE).delete(storageId);
      await transactionComplete(transaction);
    });
    await this.#preload();
  }

  async removeStored(storageId: string, sessionId: EncounterSessionId): Promise<void> {
    if (storageId.startsWith('session:')) {
      await this.remove(sessionId);
      return;
    }
    await this.#directWrite('delete', async () => {
      const transaction = this.database.transaction(SNAPSHOT_STORE, 'readwrite');
      transaction.objectStore(SNAPSHOT_STORE).delete(storageId);
      await transactionComplete(transaction);
    });
    this.#snapshots.delete(storageId);
  }

  async renameStored(storageId: string, sessionId: EncounterSessionId, name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error('A save name cannot be empty.');
    if (storageId.startsWith('session:')) {
      const existing = this.#metadata.get(sessionId);
      if (existing === undefined) throw new Error('Browser save does not exist.');
      const metadata: BrowserSaveMetadata = { ...existing, name: trimmed, retention: { kind: 'named' } };
      await this.#directWrite('rename', async () => {
        const transaction = this.database.transaction(SESSION_STORE, 'readwrite');
        transaction.objectStore(SESSION_STORE).put(metadata, sessionId);
        await transactionComplete(transaction);
      });
      this.#metadata.set(sessionId, metadata);
      return;
    }
    const existing = this.#snapshots.get(storageId);
    if (existing === undefined || existing.sessionId !== sessionId) {
      throw new Error('Browser autosave does not exist.');
    }
    const snapshot: StoredAutosaveSnapshot = { ...existing, name: trimmed, retention: { kind: 'named' } };
    await this.#directWrite('rename', async () => {
      const transaction = this.database.transaction(SNAPSHOT_STORE, 'readwrite');
      transaction.objectStore(SNAPSHOT_STORE).put(snapshot, storageId);
      await transactionComplete(transaction);
    });
    this.#snapshots.set(storageId, snapshot);
  }

  async restoreStored(storageId: string, sessionId: EncounterSessionId): Promise<void> {
    if (storageId.startsWith('session:')) return;
    const snapshot = this.#snapshots.get(storageId);
    if (snapshot === undefined || snapshot.sessionId !== sessionId) {
      throw new Error('Browser autosave does not exist.');
    }
    const currentCount = this.#memory.revisions(sessionId).length;
    const metadata: BrowserSaveMetadata = {
      sessionId,
      name: sessionId,
      updatedAt: snapshot.updatedAt,
      retention: { kind: 'autosave', pool: snapshot.pool },
      migrationStatus: this.#metadata.get(sessionId)?.migrationStatus ?? 'native',
    };
    await this.#directWrite('restore', async () => {
      const transaction = this.database.transaction([REVISION_STORE, SESSION_STORE], 'readwrite');
      for (let revision = snapshot.revisionCount + 1; revision <= currentCount; revision += 1) {
        transaction.objectStore(REVISION_STORE).delete(revisionKey(sessionId, revision));
      }
      transaction.objectStore(SESSION_STORE).put(metadata, sessionId);
      await transactionComplete(transaction);
    });
    await this.#preload();
  }

  savedSessions(): readonly StoredBrowserSave[] {
    const saves: StoredBrowserSave[] = [];
    for (const snapshot of this.#snapshots.values()) {
      saves.push({
        ...snapshot,
        migrationStatus: this.#metadata.get(snapshot.sessionId)?.migrationStatus ?? 'native',
      });
    }
    const sessionsWithSnapshots = new Set([...this.#snapshots.values()].map((snapshot) => snapshot.sessionId));
    for (const [sessionId, metadata] of this.#metadata) {
      if (sessionsWithSnapshots.has(sessionId) && metadata.retention.kind !== 'named') continue;
      const bytes = this.exported(sessionId);
      saves.push({
        ...decodeSavedSessionFingerprint(bytes),
        storageId: `session:${sessionId}`,
        name: metadata.name,
        updatedAt: metadata.updatedAt,
        retention: metadata.retention,
        migrationStatus: metadata.migrationStatus,
      });
    }
    return saves;
  }

  import(bytes: string): EncounterSessionId {
    return importSavedSession(this, bytes);
  }

  exported(sessionId: EncounterSessionId): string {
    return exportSavedSession(this, sessionId);
  }

  exportedStored(storageId: string, sessionId: EncounterSessionId): string {
    if (storageId.startsWith('session:')) return this.exported(sessionId);
    const snapshot = this.#snapshots.get(storageId);
    if (snapshot === undefined || snapshot.sessionId !== sessionId) {
      throw new Error('Browser autosave does not exist.');
    }
    return this.#exportPrefix(sessionId, snapshot.revisionCount);
  }

  #captureAutosave(revision: SessionRevision, trigger: AutosaveTrigger): StoredAutosaveSnapshot {
    const pool = autosavePoolForTrigger(trigger);
    const storageId = `${pool}:${revision.sessionId}:${String(revision.revision).padStart(12, '0')}:${trigger}`;
    const decoded = decodeSavedSessionFingerprint(this.#exportPrefix(revision.sessionId, revision.revision));
    return {
      ...decoded,
      storageId,
      trigger,
      pool,
      name: `${pool === 'per_round' ? 'Round' : 'Encounter boundary'} — ${trigger.replaceAll('_', ' ')} — r${String(revision.encounterState.round)}`,
      updatedAt: new Date().toISOString(),
      retention: { kind: 'autosave', pool },
    };
  }

  #exportPrefix(sessionId: EncounterSessionId, revisionCount: number): string {
    const prefix = new MemoryBrowserSessionStore();
    prefix.appendAll(this.#memory.revisions(sessionId).slice(0, revisionCount));
    return exportSavedSession(prefix, sessionId);
  }

  #pruneAutosaves(): readonly string[] {
    const removed: string[] = [];
    for (const pool of ['per_round', 'encounter_boundary'] as const) {
      const expired = [...this.#snapshots.values()]
        .filter((snapshot) => snapshot.retention.kind === 'autosave' && snapshot.pool === pool)
        .sort((left, right) => {
          const newest = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
          return newest === 0 ? right.storageId.localeCompare(left.storageId) : newest;
        })
        .slice(10);
      for (const snapshot of expired) {
        this.#snapshots.delete(snapshot.storageId);
        removed.push(snapshot.storageId);
      }
    }
    return removed;
  }

  #autosaveTriggers(previous: SessionRevision | undefined, revision: SessionRevision): readonly AutosaveTrigger[] {
    const triggers: AutosaveTrigger[] = [];
    if (revision.transition.kind === 'session_started') triggers.push('encounter_start');
    if (previous !== undefined && revision.encounterState.round > previous.encounterState.round) {
      triggers.push('round_boundary');
    }
    if (revision.transition.kind === 'room_composed') triggers.push('encounter_start');
    if (revision.transition.kind === 'short_rest_completed' || revision.transition.kind === 'long_rest_completed') {
      triggers.push('rest_boundary');
    }
    if (revision.transition.kind === 'party_state_captured' && revision.transition.restInterruption !== undefined) {
      triggers.push('rest_interruption');
    }
    if (previous !== undefined) {
      if (encounterConclusionAfter(previous.encounterState, revision.encounterState) !== null) {
        triggers.push('encounter_end');
      }
    }
    return [...new Set(triggers)];
  }

  #enqueue(
    operation: BrowserSessionWriteError['operation'],
    prepare: () => Promise<(transaction: IDBTransaction) => void>,
  ): void {
    let acknowledge = (): void => undefined;
    const acknowledgement = new Promise<void>((resolve) => {
      acknowledge = resolve;
    });
    this.#latestAcknowledgement = acknowledgement;
    this.#queuedWrites.push({ operation, prepare, acknowledge });
    this.#scheduleQueuedWrite();
  }

  #scheduleQueuedWrite(): void {
    if (this.#scheduledWrite !== null) return;
    let writes: QueuedBrowserWrite[] = [];
    const pending = new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, 0);
    }).then(async () => {
      writes = this.#queuedWrites.splice(0);
      const prepared = await Promise.all(writes.map(async (queued) => queued.prepare()));
      const transaction = this.database.transaction(
        [REVISION_STORE, SESSION_STORE, SNAPSHOT_STORE],
        'readwrite',
      );
      for (const write of prepared) write(transaction);
      await transactionComplete(transaction);
      for (const queued of writes) queued.acknowledge();
    }).catch((error: unknown) => {
      const operation = writes[0]?.operation ?? this.#queuedWrites[0]?.operation ?? 'write';
      this.#failure ??= storageError(operation, error);
      for (const queued of writes) queued.acknowledge();
      for (const queued of this.#queuedWrites.splice(0)) queued.acknowledge();
    });
    this.#scheduledWrite = pending;
    void pending.finally(() => {
      this.#scheduledWrite = null;
      if (this.#queuedWrites.length > 0 && this.#failure === null) {
        this.#scheduleQueuedWrite();
      }
    });
  }

  async #directWrite(operation: BrowserSessionWriteError['operation'], write: () => Promise<void>): Promise<void> {
    await this.flush();
    try {
      await write();
    } catch (error: unknown) {
      this.#failure ??= storageError(operation, error);
      throw this.#failure;
    }
  }

  #requireWritable(): void {
    if (this.#failure !== null) throw this.#failure;
  }

  async #preload(): Promise<void> {
    const transaction = this.database.transaction([REVISION_STORE, SESSION_STORE, SNAPSHOT_STORE], 'readonly');
    const [revisions, metadata, snapshots] = await Promise.all([
      requestResult(transaction.objectStore(REVISION_STORE).getAll()),
      requestResult(transaction.objectStore(SESSION_STORE).getAll()),
      requestResult(transaction.objectStore(SNAPSHOT_STORE).getAll()),
    ]);
    await transactionComplete(transaction);
    const nextMemory = new MemoryBrowserSessionStore();
    const bySession = new Map<EncounterSessionId, SessionRevision[]>();
    for (const revision of await Promise.all(
      (revisions as unknown[]).map(async (value) => decodedStoredRevision(value)),
    )) {
      const current = bySession.get(revision.sessionId) ?? [];
      current.push(revision);
      bySession.set(revision.sessionId, current);
    }
    for (const stream of bySession.values()) {
      stream.sort((left, right) => left.revision - right.revision);
      nextMemory.appendAll(stream);
    }
    this.#memory = nextMemory;
    this.#metadata.clear();
    for (const value of metadata as BrowserSaveMetadata[]) this.#metadata.set(value.sessionId, value);
    this.#snapshots.clear();
    for (const value of snapshots as StoredAutosaveSnapshot[]) this.#snapshots.set(value.storageId, value);
  }

  async #migrateLegacy(): Promise<void> {
    const keys = Array.from({ length: this.legacyStorage.length }, (_unused, index) => this.legacyStorage.key(index))
      .filter((key): key is string => key !== null);
    for (const key of keys.filter((candidate) => candidate.startsWith(LEGACY_SESSION_PREFIX))) {
      const bytes = this.legacyStorage.getItem(key);
      if (bytes === null) continue;
      const sessionId = key.slice(LEGACY_SESSION_PREFIX.length) as EncounterSessionId;
      const imported = new MemoryBrowserSessionStore();
      const decodedSessionId = importSavedSession(imported, bytes);
      if (decodedSessionId !== sessionId) throw new Error('Stored VTT session identity does not match its storage key.');
      const storedMetadata = legacyMetadata(
        this.legacyStorage.getItem(`${LEGACY_METADATA_PREFIX}${sessionId}`),
        sessionId,
      );
      const explicitlyTruncated = this.legacyStorage.getItem(`${LEGACY_TRUNCATED_PREFIX}${sessionId}`) !== null;
      const metadata: BrowserSaveMetadata = {
        sessionId,
        name: storedMetadata?.name ?? sessionId,
        updatedAt: storedMetadata?.updatedAt ?? new Date(0).toISOString(),
        retention: storedMetadata?.retention ?? { kind: 'autosave', pool: 'per_round' },
        migrationStatus: explicitlyTruncated || bytes.length >= LIKELY_LOCAL_STORAGE_LIMIT_BYTES
          ? 'truncated'
          : 'complete',
      };
      const storedRevisions = await Promise.all(imported.revisions(sessionId).map(async (revision) => ({
        bytes: await encodedStoredRevision(revision),
        key: revisionKey(sessionId, revision.revision),
      })));
      const transaction = this.database.transaction([REVISION_STORE, SESSION_STORE], 'readwrite');
      for (const revision of storedRevisions) {
        transaction.objectStore(REVISION_STORE).put(revision.bytes, revision.key);
      }
      transaction.objectStore(SESSION_STORE).put(metadata, sessionId);
      await transactionComplete(transaction);
      this.legacyStorage.removeItem(key);
      this.legacyStorage.removeItem(`${LEGACY_METADATA_PREFIX}${sessionId}`);
      this.legacyStorage.removeItem(`${LEGACY_TRUNCATED_PREFIX}${sessionId}`);
    }

    for (const key of keys.filter((candidate) => candidate.startsWith(LEGACY_AUTOSAVE_PREFIX))) {
      const raw = this.legacyStorage.getItem(key);
      if (raw === null) continue;
      const legacy = legacySnapshot(raw);
      if (legacy === null) throw new Error('Stored browser autosave is malformed.');
      const imported = new MemoryBrowserSessionStore();
      importSavedSession(imported, legacy.bytes);
      const decoded = decodeSavedSessionFingerprint(legacy.bytes);
      const snapshot: StoredAutosaveSnapshot = {
        ...decoded,
        storageId: legacy.storageId,
        trigger: legacy.trigger,
        pool: legacy.pool,
        name: legacy.name,
        updatedAt: legacy.updatedAt,
        retention: legacy.retention,
      };
      const existingMetadata = await this.#readMetadata(legacy.sessionId);
      const storedRevisions = await Promise.all(imported.revisions(legacy.sessionId).map(async (revision) => ({
        bytes: await encodedStoredRevision(revision),
        key: revisionKey(legacy.sessionId, revision.revision),
      })));
      const transaction = this.database.transaction([REVISION_STORE, SESSION_STORE, SNAPSHOT_STORE], 'readwrite');
      for (const revision of storedRevisions) {
        transaction.objectStore(REVISION_STORE).put(revision.bytes, revision.key);
      }
      if (existingMetadata === null) {
        transaction.objectStore(SESSION_STORE).put({
          sessionId: legacy.sessionId,
          name: legacy.sessionId,
          updatedAt: legacy.updatedAt,
          retention: { kind: 'autosave', pool: legacy.pool },
          migrationStatus: legacy.bytes.length >= LIKELY_LOCAL_STORAGE_LIMIT_BYTES ? 'truncated' : 'complete',
        } satisfies BrowserSaveMetadata, legacy.sessionId);
      }
      transaction.objectStore(SNAPSHOT_STORE).put(snapshot, snapshot.storageId);
      await transactionComplete(transaction);
      this.legacyStorage.removeItem(key);
    }
  }

  async #readMetadata(sessionId: EncounterSessionId): Promise<BrowserSaveMetadata | null> {
    const transaction = this.database.transaction(SESSION_STORE, 'readonly');
    const value: unknown = await requestResult(transaction.objectStore(SESSION_STORE).get(sessionId));
    await transactionComplete(transaction);
    return value === undefined ? null : value as BrowserSaveMetadata;
  }
}
