import type { EncounterSessionId } from '../combat/values';
import { encounterConclusionAfter } from '../combat/encounter';
import { sha256 } from '../crypto/sha256';
import {
  decodeSavedSession,
  decodeSavedSessionFingerprint,
  encodeRecordedSession,
  MemoryBrowserSessionStore,
  exportSavedSession,
  exportStoredSessionSource,
  importSavedSession,
  migrateStoredSessionRevisions,
  recordedSessionSummary,
  replayVerifiedRevisions,
  savedSessionLoadability,
  sessionLoadRefusalOf,
  type SessionStore,
  type DecodedSavedSessionFingerprint,
  type JournalRecordedRevision,
  type RefusedSavedSession,
  type ReplayVerifiedRevisions,
  type SavedSessionLoadability,
  type SessionLoadRefusal,
  type SessionRevision,
} from './session-persistence';
import { RUNNING_ENGINE_BUILD, type EngineBuild } from './engine-build';
import type { SaveRetention } from './save-manager';
import { autosavePoolForTrigger, type AutosavePool, type AutosaveTrigger } from './save-manager';

const DATABASE_VERSION = 1;

const LEGACY_SESSION_PREFIX = 'srd55:vtt-session:';
const LEGACY_METADATA_PREFIX = 'srd55:vtt-session-metadata:';
const LEGACY_TRUNCATED_PREFIX = 'srd55:vtt-session-truncated:';
const LIKELY_LOCAL_STORAGE_LIMIT_BYTES = 4 * 1024 * 1024;

export interface Clock {
  now(): Date;
}

const SYSTEM_CLOCK: Clock = {
  now: () => new Date(),
};

function defaultDatabaseName(): string {
  return 'srd55-vtt-sessions';
}

function revisionStoreName(): string {
  return 'revisions';
}

function sessionStoreName(): string {
  return 'sessions';
}

function snapshotStoreName(): string {
  return 'snapshots';
}

function legacyAutosavePrefix(): string {
  return 'srd55:vtt-autosave:';
}

interface BrowserSaveMetadata {
  readonly sessionId: EncounterSessionId;
  readonly name: string;
  readonly updatedAt: string;
  readonly retention: SaveRetention;
  readonly migrationStatus: 'native' | 'complete' | 'truncated';
}

/**
 * Where an autosave's state is kept (FOOTPRINT fix1, codex r1 P1; owner D919). Each point is bound to the revision
 * it restores, so it resolves to that state or to nothing, never to another state at the same position.
 *   live: the first `revisionCount` revisions of the session's live stream; `headChecksum` is the checksum of live
 *     revision `revisionCount`. A snapshot captured before fix1 has none (null) and is bound by position only.
 *   archived: the first `revisionCount` revisions of the stored stream the live root archived when the session
 *     migrated by archive (a stream v13 cannot express became one session_migrated root). `archivedRevisionSha256`
 *     is the sha256 of that last archived revision's stored text. The point's state is that archived prefix
 *     migrated as a save of its own: repaired and archived when v13 cannot express it, else the version bump
 *     (D919), never a re-reduction.
 *   own_save: a legacy localStorage autosave whose migrated stream is not the first revisions of its session's
 *     (FOOTPRINT fix2, codex r2 P1): the two migrated differently (one by archive and the other by the version
 *     bump, or to two archive roots), so it cannot point into the session and must not write over it. `text` is the
 *     autosave's save text, byte for byte; the point's state is that save migrated as a save of its own (D919).
 */
export type AutosaveRestorePoint =
  | { readonly kind: 'live'; readonly headChecksum: string | null }
  | { readonly kind: 'archived'; readonly archivedRevisionSha256: string }
  | { readonly kind: 'own_save'; readonly text: string };

type LiveRestorePoint = Extract<AutosaveRestorePoint, { readonly kind: 'live' }>;
type ArchivedRestorePoint = Extract<AutosaveRestorePoint, { readonly kind: 'archived' }>;
type OwnSaveRestorePoint = Extract<AutosaveRestorePoint, { readonly kind: 'own_save' }>;

/**
 * A restore point whose revision the session no longer holds: a restore replaced the live stream it pointed into,
 * or discarded the archived revision it pointed at.
 */
export class RestorePointUnavailableError extends Error {
  override readonly name = 'RestorePointUnavailableError' as const;

  constructor(readonly storageId: string) {
    super(`Browser autosave ${storageId} points at a revision this session no longer holds.`);
  }
}

/** What every stored save record beside a session's own row holds: the save it describes, and how it is listed. */
interface StoredSnapshotFields extends DecodedSavedSessionFingerprint {
  readonly storageId: string;
  readonly name: string;
  readonly updatedAt: string;
  readonly retention: SaveRetention;
}

/** An autosave of its session, taken at a boundary `trigger` and pruned within its `pool`. Its record has no kind. */
interface StoredAutosaveSnapshot extends StoredSnapshotFields {
  readonly kind?: never;
  readonly trigger: AutosaveTrigger;
  readonly pool: AutosavePool;
  readonly restorePoint: AutosaveRestorePoint;
}

/**
 * A legacy localStorage session save whose history diverges from the stream IndexedDB already holds under its
 * session id (FOOTPRINT fix3, codex r3 P1): neither holds the other, so it is kept whole as a save of its own beside
 * the untouched stored session. Its state is its save text migrated on its own (D919), like an own_save autosave's.
 * It is a named save (never pruned), it survives a delete of the stored session, and it carries its own migration
 * status, since the legacy save alone may have been truncated.
 */
interface KeptLegacySessionSave extends StoredSnapshotFields {
  readonly kind: 'kept_legacy_session';
  readonly retention: { readonly kind: 'named' };
  readonly migrationStatus: BrowserSaveMetadata['migrationStatus'];
  readonly restorePoint: OwnSaveRestorePoint;
}

/** A stored save record in the snapshots store. */
type StoredSnapshot = StoredAutosaveSnapshot | KeptLegacySessionSave;

type ArchivedAutosaveSnapshot = StoredAutosaveSnapshot & { readonly restorePoint: ArchivedRestorePoint };

/**
 * The storage id a kept legacy session save is listed under, never a `session:` row. It names the save's text by its
 * sha256, so a resumed migration writes the same record again and a different legacy save of the same session (a
 * later migration) is kept beside it, never over it.
 */
function keptLegacySessionStorageId(sessionId: EncounterSessionId, text: string): string {
  return `legacy_session:${sessionId}:${sha256(text)}`;
}

function isAutosave(snapshot: StoredSnapshot): snapshot is StoredAutosaveSnapshot {
  return snapshot.kind !== 'kept_legacy_session';
}

function isMigrationStatus(value: unknown): value is BrowserSaveMetadata['migrationStatus'] {
  return value === 'native' || value === 'complete' || value === 'truncated';
}

function decodedRestorePoint(value: unknown): AutosaveRestorePoint {
  // A snapshot stored before FOOTPRINT fix1 has no restore point field: every snapshot then was a live prefix,
  // bound by position only.
  if (value === undefined) return { kind: 'live', headChecksum: null };
  if (isRecord(value) && value.kind === 'live' && (value.headChecksum === null || typeof value.headChecksum === 'string')) {
    return { kind: 'live', headChecksum: value.headChecksum };
  }
  if (isRecord(value) && value.kind === 'archived' && typeof value.archivedRevisionSha256 === 'string') {
    return { kind: 'archived', archivedRevisionSha256: value.archivedRevisionSha256 };
  }
  if (isRecord(value) && value.kind === 'own_save' && typeof value.text === 'string') {
    return { kind: 'own_save', text: value.text };
  }
  throw new TypeError('Stored browser autosave restore point is malformed.');
}

function storedSnapshot(value: unknown): StoredSnapshot {
  if (!isRecord(value) || typeof value.storageId !== 'string') throw new TypeError('Stored browser autosave is malformed.');
  if (value.kind === 'kept_legacy_session') {
    const restorePoint = decodedRestorePoint(value.restorePoint);
    if (restorePoint.kind !== 'own_save' || !isRecord(value.retention) || value.retention.kind !== 'named' ||
      !isMigrationStatus(value.migrationStatus)) {
      throw new TypeError('Stored kept legacy session save is malformed.');
    }
    return {
      ...(value as unknown as KeptLegacySessionSave),
      retention: { kind: 'named' },
      migrationStatus: value.migrationStatus,
      restorePoint,
    };
  }
  if (value.kind !== undefined) throw new TypeError('Stored browser autosave is malformed.');
  return { ...(value as unknown as StoredAutosaveSnapshot), restorePoint: decodedRestorePoint(value.restorePoint) };
}

function isArchivedSnapshot(snapshot: StoredSnapshot): snapshot is ArchivedAutosaveSnapshot {
  return isAutosave(snapshot) && snapshot.restorePoint.kind === 'archived';
}

/**
 * Where a legacy localStorage session save goes, against the stream IndexedDB already holds under its session id
 * (FOOTPRINT fix3, codex r3 P1). Nothing IndexedDB holds is written over:
 *   new_session: IndexedDB holds no stream; the save's revisions become the session, with the save's metadata.
 *   held: the stored stream holds every revision of the save (identical, or the save is a prefix of it, checksum for
 *     checksum); nothing is written.
 *   extends: the stored stream is a prefix of the save's; only `added`, the save's revisions past it, are written.
 *   diverged: neither holds the other; the save is kept whole as a save of its own (KeptLegacySessionSave) and the
 *     stored stream and its metadata are untouched.
 */
type LegacySessionPlacement =
  | { readonly kind: 'new_session' }
  | { readonly kind: 'held' }
  | { readonly kind: 'extends'; readonly added: readonly SessionRevision[] }
  | { readonly kind: 'diverged' };

function legacySessionPlacement(
  legacy: readonly SessionRevision[],
  stored: readonly SessionRevision[],
): LegacySessionPlacement {
  if (stored.length === 0) return { kind: 'new_session' };
  if (isPrefixOf(legacy, stored)) return { kind: 'held' };
  if (isPrefixOf(stored, legacy)) return { kind: 'extends', added: legacy.slice(stored.length) };
  return { kind: 'diverged' };
}

/** The checksum of revision `count` of `revisions`: what a live restore point at `count` is bound to. */
function checksumAt(revisions: readonly SessionRevision[], count: number): string {
  const head = revisions[count - 1];
  if (head === undefined) throw new Error('A restore point has no revision to bind to.');
  return head.checksum;
}

/**
 * How many revisions a legacy save records as saved, before any migration: its history length. Every save format
 * (the v1 bundle, the revision bundle, the journal DAG) lists them under `revisions`. A history that migrates by
 * archive is one revision after migration, so only the saved list says how long it is.
 */
function legacyHistoryLength(bytes: string): number {
  const value: unknown = JSON.parse(bytes);
  if (!isRecord(value) || !Array.isArray(value.revisions)) throw new TypeError('Stored browser autosave save lists no revisions.');
  return value.revisions.length;
}

/** Whether `prefix` is the first revisions of `stream`, revision for revision (every checksum equal). */
function isPrefixOf(prefix: readonly SessionRevision[], stream: readonly SessionRevision[]): boolean {
  return prefix.length > 0 && prefix.length <= stream.length &&
    prefix.every((revision, index) => revision.checksum === stream[index]?.checksum);
}

/**
 * A session's stream as this store holds it (SAVE-COMPAT C2, C3):
 *   stored: its revisions, as stored (current schema);
 *   unpersisted: its stored records migrate, but the migrated stream fails a strict replay, so the migration is NOT
 *     written (D944): the stored texts and keys stay exactly as an earlier build left them, listed refused, and the
 *     next open migrates them again (deterministically);
 *   undecodable: its stored records do not decode (a hash, schema or sequence fault, a step that refuses them): the
 *     texts and keys exactly as stored, the error and its refusal. Nothing is written for it, nothing can be appended
 *     to it, and a new journal cannot be created over it; it is listed refused and exports its stored source.
 */
type HeldStream =
  | { readonly kind: 'stored'; readonly revisions: SessionRevision[] }
  | {
      readonly kind: 'unpersisted';
      readonly keys: readonly string[];
      readonly texts: readonly string[];
      readonly revisions: readonly SessionRevision[];
      readonly refusal: SessionLoadRefusal;
    }
  | {
      readonly kind: 'undecodable';
      readonly keys: readonly string[];
      readonly texts: readonly string[];
      readonly error: unknown;
      readonly refusal: SessionLoadRefusal;
    };

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

interface StoredSaveFields {
  readonly storageId: string;
  readonly name: string;
  readonly updatedAt: string;
  readonly retention: SaveRetention;
  readonly migrationStatus: BrowserSaveMetadata['migrationStatus'];
}

/** A listed save whose record decodes: its summary as recorded, and whether it loads under this store's build. */
export interface DecodedStoredBrowserSave extends StoredSaveFields, DecodedSavedSessionFingerprint {
  readonly contents: 'decoded';
  readonly load: SavedSessionLoadability;
}

/** A listed session whose stored stream does not decode: always refused, with why. */
export interface UndecodableStoredBrowserSave extends StoredSaveFields {
  readonly contents: 'undecodable';
  readonly sessionId: EncounterSessionId;
  readonly load: RefusedSavedSession;
}

export type StoredBrowserSave = DecodedStoredBrowserSave | UndecodableStoredBrowserSave;

/** What the store holds under a session id, without a replay: its recorded summary, or that it does not decode. */
export type HeldSessionSummary =
  | { readonly kind: 'decoded'; readonly summary: DecodedSavedSessionFingerprint }
  | { readonly kind: 'undecodable' };

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
      for (const storeName of [revisionStoreName(), sessionStoreName(), snapshotStoreName()]) {
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

interface StoredRevisionHeader {
  readonly sessionId: EncounterSessionId;
  readonly revision: number;
  readonly schemaVersion: unknown;
}

/**
 * A stored revision record: its header, and the text it was stored as. A gzip record (what this store writes) is
 * the decompressed JSON exactly; a structured-clone record (an older write) is its JSON serialization, in its
 * stored key order. The text is what a migration archives byte for byte (FOOTPRINT D919).
 */
interface StoredRevisionRecord {
  readonly header: StoredRevisionHeader;
  readonly text: string;
}

async function decodedStoredRevision(value: unknown): Promise<StoredRevisionRecord> {
  const text = value instanceof ArrayBuffer
    ? await new Response(new Blob([value]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
    : JSON.stringify(value);
  const decoded: unknown = JSON.parse(text);
  if (!isRecord(decoded) || typeof decoded.sessionId !== 'string' ||
    !Number.isSafeInteger(decoded.revision) || typeof decoded.checksum !== 'string') {
    throw new TypeError('Stored VTT session revision is malformed.');
  }
  return {
    header: { sessionId: decoded.sessionId as EncounterSessionId, revision: decoded.revision as number, schemaVersion: decoded.schemaVersion },
    text,
  };
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
export class IndexedDbBrowserSessionStore implements SessionStore {
  #held = new Map<EncounterSessionId, HeldStream>();
  /** Each listed entry's loadability, by the identity of the stream it loads; cleared whenever the store reloads. */
  #loadability = new Map<string, SavedSessionLoadability>();
  readonly #metadata = new Map<EncounterSessionId, BrowserSaveMetadata>();
  readonly #snapshots = new Map<string, StoredSnapshot>();
  readonly #queuedWrites: QueuedBrowserWrite[] = [];
  #scheduledWrite: Promise<void> | null = null;
  #latestAcknowledgement: Promise<void> = Promise.resolve();
  #failure: BrowserSessionWriteError | null = null;

  private constructor(
    private readonly database: IDBDatabase,
    private readonly legacyStorage: Storage,
    private readonly clock: Clock,
    readonly recordingEngine: EngineBuild,
  ) {}

  static async open(
    indexedDb: IDBFactory,
    legacyStorage: Storage,
    options: { readonly databaseName?: string; readonly clock?: Clock; readonly recordingEngine?: EngineBuild } = {},
  ): Promise<IndexedDbBrowserSessionStore> {
    let database: IDBDatabase;
    try {
      database = await openDatabase(indexedDb, options.databaseName ?? defaultDatabaseName());
    } catch (error: unknown) {
      throw storageError('open', error);
    }
    const store = new IndexedDbBrowserSessionStore(
      database,
      legacyStorage,
      options.clock ?? SYSTEM_CLOCK,
      options.recordingEngine ?? RUNNING_ENGINE_BUILD,
    );
    try {
      // The stored sessions first: a legacy autosave is placed against the session it belongs to (#migrateLegacy).
      await store.#preload();
      if (await store.#migrateLegacy()) await store.#preload();
      const removed = store.#pruneAutosaves();
      if (removed.length > 0) {
        const transaction = database.transaction(snapshotStoreName(), 'readwrite');
        for (const storageId of removed) transaction.objectStore(snapshotStoreName()).delete(storageId);
        await transactionComplete(transaction);
      }
      return store;
    } catch (error: unknown) {
      database.close();
      throw storageError('migration', error);
    }
  }

  append(revision: JournalRecordedRevision): void {
    this.#requireWritable();
    const held = this.#held.get(revision.sessionId);
    if (held?.kind === 'undecodable') throw held.error;
    // A journal resumes only a stream that replays, and an unpersisted one does not.
    if (held?.kind === 'unpersisted') throw new Error('A session whose migration is not persisted takes no revision.');
    const stream = held?.revisions ?? [];
    if (revision.revision !== stream.length + 1) {
      throw new Error('Browser store requires every revision in order.');
    }
    if (
      revision.parentRevision !== null &&
      !stream.some((candidate) => candidate.revision === revision.parentRevision)
    ) {
      throw new Error('Browser store cannot append a revision with an unknown parent.');
    }
    const previous = stream.at(-1);
    if (held === undefined) this.#held.set(revision.sessionId, { kind: 'stored', revisions: [revision] });
    else stream.push(revision);
    const current = this.#metadata.get(revision.sessionId);
    const metadata: BrowserSaveMetadata = {
      sessionId: revision.sessionId,
      name: current?.name ?? revision.sessionId,
      updatedAt: this.clock.now().toISOString(),
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
        transaction.objectStore(revisionStoreName()).put(stored, revisionKey(revision.sessionId, revision.revision));
        transaction.objectStore(sessionStoreName()).put(metadata, revision.sessionId);
        for (const snapshot of added) transaction.objectStore(snapshotStoreName()).put(snapshot, snapshot.storageId);
        for (const storageId of removed) transaction.objectStore(snapshotStoreName()).delete(storageId);
      };
    });
  }

  appendAll(revisions: ReplayVerifiedRevisions): void {
    const first = revisions[0];
    if (first === undefined) return;
    this.#requireWritable();
    if (this.#held.has(first.sessionId)) throw new Error('Browser store import target already exists.');
    // The memory store checks the stream (in order, known parents) exactly as a single append would.
    const checked = new MemoryBrowserSessionStore(this.recordingEngine);
    checked.appendAll(revisions);
    this.#held.set(first.sessionId, { kind: 'stored', revisions: [...checked.revisions(first.sessionId)] });
    const current = this.#metadata.get(first.sessionId);
    const metadata: BrowserSaveMetadata = {
      sessionId: first.sessionId,
      name: current?.name ?? first.sessionId,
      updatedAt: this.clock.now().toISOString(),
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
          transaction.objectStore(revisionStoreName()).put(revision.bytes, revision.key);
        }
        transaction.objectStore(sessionStoreName()).put(metadata, first.sessionId);
      };
    });
  }

  /**
   * The session's revisions. A stream that does not decode throws its own typed error, so a caller that would create
   * a session when it finds none (dm-encounter-host) never writes revision 1 over its stored records (W57).
   */
  revisions(sessionId: EncounterSessionId): readonly SessionRevision[] {
    const held = this.#held.get(sessionId);
    if (held === undefined) return [];
    switch (held.kind) {
      case 'stored':
      case 'unpersisted':
        return [...held.revisions];
      case 'undecodable': throw held.error;
    }
  }

  /** What the store holds under `sessionId`, without a replay; null when it holds nothing. */
  heldSession(sessionId: EncounterSessionId): HeldSessionSummary | null {
    const held = this.#held.get(sessionId);
    if (held === undefined) return null;
    switch (held.kind) {
      case 'stored':
      case 'unpersisted':
        return { kind: 'decoded', summary: recordedSessionSummary(held.revisions) };
      case 'undecodable': return { kind: 'undecodable' };
    }
  }

  /** The keys of every stored record of the session: what a delete removes. */
  #heldKeys(sessionId: EncounterSessionId): readonly string[] {
    const held = this.#held.get(sessionId);
    if (held === undefined) return [];
    switch (held.kind) {
      case 'stored': return held.revisions.map((revision) => revisionKey(sessionId, revision.revision));
      case 'unpersisted':
      case 'undecodable':
        return held.keys;
    }
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
    const keys = this.#heldKeys(sessionId);
    // The session's autosaves go with it; a kept legacy session save is a save of its own and stays.
    const snapshotIds = [...this.#snapshots.values()]
      .filter((snapshot) => snapshot.sessionId === sessionId && isAutosave(snapshot))
      .map((snapshot) => snapshot.storageId);
    await this.#directWrite('delete', async () => {
      const transaction = this.database.transaction(
        [revisionStoreName(), sessionStoreName(), snapshotStoreName()],
        'readwrite',
      );
      for (const key of keys) transaction.objectStore(revisionStoreName()).delete(key);
      transaction.objectStore(sessionStoreName()).delete(sessionId);
      for (const storageId of snapshotIds) transaction.objectStore(snapshotStoreName()).delete(storageId);
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
      const transaction = this.database.transaction(snapshotStoreName(), 'readwrite');
      transaction.objectStore(snapshotStoreName()).delete(storageId);
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
        const transaction = this.database.transaction(sessionStoreName(), 'readwrite');
        transaction.objectStore(sessionStoreName()).put(metadata, sessionId);
        await transactionComplete(transaction);
      });
      this.#metadata.set(sessionId, metadata);
      return;
    }
    const existing = this.#snapshots.get(storageId);
    if (existing === undefined || existing.sessionId !== sessionId) {
      throw new Error('Browser autosave does not exist.');
    }
    const snapshot: StoredSnapshot = { ...existing, name: trimmed, retention: { kind: 'named' } };
    await this.#directWrite('rename', async () => {
      const transaction = this.database.transaction(snapshotStoreName(), 'readwrite');
      transaction.objectStore(snapshotStoreName()).put(snapshot, storageId);
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
    if (!isAutosave(snapshot)) {
      // A kept legacy session save: the session becomes that save; it keeps its own name and retention, and takes
      // the kept save's migration status, since it now holds that history.
      const current = this.#metadata.get(sessionId);
      const restored = replayVerifiedRevisions(this.#ownSavePoint(snapshot, snapshot.restorePoint), this.recordingEngine);
      await this.#replaceStream(restored, [], {
        sessionId,
        name: current?.name ?? sessionId,
        updatedAt: snapshot.updatedAt,
        retention: current?.retention ?? { kind: 'named' },
        migrationStatus: snapshot.migrationStatus,
      });
      return;
    }
    const point = snapshot.restorePoint;
    switch (point.kind) {
      case 'archived':
        await this.#restoreArchived(snapshot, point);
        return;
      case 'own_save':
        // Its stream is its own: no other point of the session is re-pointed by it. It replaces the session only once
        // a strict replay verifies it (SAVE-COMPAT C3): a refused point throws before any write or delete.
        await this.#replaceStream(
          replayVerifiedRevisions(this.#ownSavePoint(snapshot, point), this.recordingEngine),
          [],
          this.#restoredAutosaveMetadata(snapshot),
        );
        return;
      case 'live':
        await this.#restoreLive(snapshot, point);
        return;
    }
  }

  /**
   * Restores a live point: the live revisions after it are deleted, once the stream the point leaves verifies
   * (SAVE-COMPAT C3): a point whose prefix does not replay throws before anything is deleted. For a stream whose
   * migration is not persisted, what remains is its first stored texts, which the reload migrates and writes only
   * after a strict replay; so that is what is verified here.
   */
  async #restoreLive(snapshot: StoredAutosaveSnapshot, point: LiveRestorePoint): Promise<void> {
    const sessionId = snapshot.sessionId;
    this.#requireLivePoint(snapshot, point);
    const held = this.#held.get(sessionId);
    replayVerifiedRevisions(
      held?.kind === 'unpersisted'
        ? migrateStoredSessionRevisions(held.texts.slice(0, snapshot.revisionCount), this.recordingEngine)
        : this.revisions(sessionId).slice(0, snapshot.revisionCount),
      this.recordingEngine,
    );
    const laterKeys = this.#heldKeys(sessionId).slice(snapshot.revisionCount);
    const metadata: BrowserSaveMetadata = {
      sessionId,
      name: sessionId,
      updatedAt: snapshot.updatedAt,
      retention: { kind: 'autosave', pool: snapshot.pool },
      migrationStatus: this.#metadata.get(sessionId)?.migrationStatus ?? 'native',
    };
    await this.#directWrite('restore', async () => {
      const transaction = this.database.transaction([revisionStoreName(), sessionStoreName()], 'readwrite');
      for (const key of laterKeys) transaction.objectStore(revisionStoreName()).delete(key);
      transaction.objectStore(sessionStoreName()).put(metadata, sessionId);
      await transactionComplete(transaction);
    });
    await this.#preload();
  }

  /**
   * Every save, each with its own loadability (SAVE-COMPAT C2): a session row from its stream, an autosave from its
   * own restore point. A refused or undecodable save is listed with its typed refusal beside the others; nothing one
   * entry throws hides another (an unavailable restore point is listed load_failed).
   */
  savedSessions(): readonly StoredBrowserSave[] {
    const used = new Set<string>();
    const saves: StoredBrowserSave[] = [];
    for (const stored of this.#snapshots.values()) {
      const { restorePoint: _restorePoint, kind: _kind, ...snapshot } = stored;
      saves.push({
        ...snapshot,
        migrationStatus: isAutosave(stored)
          ? this.#metadata.get(snapshot.sessionId)?.migrationStatus ?? 'native'
          : stored.migrationStatus,
        contents: 'decoded',
        load: this.#entryLoad(() => this.#pointLoad(stored, used)),
      });
    }
    // A session with autosaves is listed through them unless it is named; a kept legacy save is not one of them.
    const sessionsWithSnapshots = new Set([...this.#snapshots.values()].filter(isAutosave).map((snapshot) => snapshot.sessionId));
    for (const [sessionId, metadata] of this.#metadata) {
      if (sessionsWithSnapshots.has(sessionId) && metadata.retention.kind !== 'named') continue;
      const fields: StoredSaveFields = {
        storageId: `session:${sessionId}`,
        name: metadata.name,
        updatedAt: metadata.updatedAt,
        retention: metadata.retention,
        migrationStatus: metadata.migrationStatus,
      };
      const held = this.#held.get(sessionId);
      if (held?.kind === 'stored' && held.revisions.length > 0) {
        saves.push({
          ...recordedSessionSummary(held.revisions),
          ...fields,
          contents: 'decoded',
          load: this.#entryLoad(() => this.#streamLoad(sessionId, held.revisions, used)),
        });
      } else if (held?.kind === 'unpersisted') {
        saves.push({
          ...recordedSessionSummary(held.revisions),
          ...fields,
          contents: 'decoded',
          load: { kind: 'refused', refusal: held.refusal },
        });
      } else {
        const refusal = held?.kind === 'undecodable'
          ? held.refusal
          : sessionLoadRefusalOf(new Error('Encounter session does not exist.'));
        saves.push({ ...fields, contents: 'undecodable', sessionId, load: { kind: 'refused', refusal } });
      }
    }
    for (const key of [...this.#loadability.keys()]) if (!used.has(key)) this.#loadability.delete(key);
    return saves;
  }

  /** An entry's loadability; anything computing it throws (an unavailable restore point) is its refusal. */
  #entryLoad(load: () => SavedSessionLoadability): SavedSessionLoadability {
    try {
      return load();
    } catch (error) {
      return { kind: 'refused', refusal: sessionLoadRefusalOf(error) };
    }
  }

  /** The loadability of the stream `identity` names, replayed at most once while the store holds it. */
  #memoized(identity: string, used: Set<string>, load: () => SavedSessionLoadability): SavedSessionLoadability {
    used.add(identity);
    const known = this.#loadability.get(identity);
    if (known !== undefined) return known;
    const loadability = load();
    this.#loadability.set(identity, loadability);
    return loadability;
  }

  /** A stored stream's loadability: a strict replay under this store's build. */
  #streamLoad(sessionId: EncounterSessionId, revisions: readonly SessionRevision[], used: Set<string>): SavedSessionLoadability {
    const head = revisions.at(-1);
    return this.#memoized(
      `stream:${sessionId}:${String(revisions.length)}:${head?.checksum ?? ''}`,
      used,
      () => savedSessionLoadability(revisions, this.recordingEngine),
    );
  }

  /** A snapshot's loadability, from its own restore point (P1-4): a session and its autosaves load independently. */
  #pointLoad(snapshot: StoredSnapshot, used: Set<string>): SavedSessionLoadability {
    if (!isAutosave(snapshot)) return this.#ownSaveLoad(snapshot, snapshot.restorePoint, used);
    const point = snapshot.restorePoint;
    switch (point.kind) {
      case 'live': {
        const held = this.#held.get(snapshot.sessionId);
        if (held?.kind === 'undecodable') return { kind: 'refused', refusal: held.refusal };
        this.#requireLivePoint(snapshot, point);
        const stream = this.revisions(snapshot.sessionId);
        const whole: SavedSessionLoadability = held?.kind === 'unpersisted'
          ? { kind: 'refused', refusal: held.refusal }
          : this.#streamLoad(snapshot.sessionId, stream, used);
        // A prefix of a stream that replays replays too.
        if (whole.kind === 'loadable') return whole;
        const prefix = stream.slice(0, snapshot.revisionCount);
        return this.#memoized(
          `live:${snapshot.sessionId}:${String(snapshot.revisionCount)}:${checksumAt(prefix, snapshot.revisionCount)}`,
          used,
          () => savedSessionLoadability(prefix, this.recordingEngine),
        );
      }
      case 'archived':
        return this.#memoized(
          `archived:${snapshot.sessionId}:${String(snapshot.revisionCount)}:${point.archivedRevisionSha256}`,
          used,
          () => savedSessionLoadability(this.#archivedPoint(snapshot, point), this.recordingEngine),
        );
      case 'own_save':
        return this.#ownSaveLoad(snapshot, point, used);
    }
  }

  #ownSaveLoad(snapshot: StoredSnapshotFields, point: OwnSaveRestorePoint, used: Set<string>): SavedSessionLoadability {
    return this.#memoized(
      `own_save:${snapshot.sessionId}:${sha256(point.text)}`,
      used,
      () => savedSessionLoadability(this.#ownSavePoint(snapshot, point), this.recordingEngine),
    );
  }

  import(bytes: string): EncounterSessionId {
    return importSavedSession(this, bytes);
  }

  /**
   * The session as a save file: the strict export when it loads; otherwise what the store holds as recorded (§6.6),
   * so the build that recorded it can replay what its refusal names.
   */
  exported(sessionId: EncounterSessionId): string {
    const held = this.#held.get(sessionId);
    if (held === undefined) throw new Error('Encounter session does not exist.');
    switch (held.kind) {
      case 'stored':
        return this.#streamLoad(sessionId, held.revisions, new Set()).kind === 'loadable'
          ? exportSavedSession(this, sessionId)
          : encodeRecordedSession(held.revisions);
      case 'unpersisted':
      case 'undecodable':
        return exportStoredSessionSource(held.texts);
    }
  }

  exportedStored(storageId: string, sessionId: EncounterSessionId): string {
    if (storageId.startsWith('session:')) return this.exported(sessionId);
    const snapshot = this.#snapshots.get(storageId);
    if (snapshot === undefined || snapshot.sessionId !== sessionId) {
      throw new Error('Browser autosave does not exist.');
    }
    const loadable = this.#pointLoad(snapshot, new Set()).kind === 'loadable';
    const point = snapshot.restorePoint;
    switch (point.kind) {
      case 'archived': {
        const texts = this.#archivedRevisions(snapshot, point);
        if (texts === null) throw new RestorePointUnavailableError(snapshot.storageId);
        return loadable
          ? this.#strictExport(this.#archivedPoint(snapshot, point))
          : exportStoredSessionSource(texts);
      }
      case 'own_save':
        return loadable
          ? this.#strictExport(this.#ownSavePoint(snapshot, point))
          : point.text;
      case 'live': {
        const held = this.#held.get(sessionId);
        if (held?.kind === 'undecodable') return exportStoredSessionSource(held.texts.slice(0, snapshot.revisionCount));
        this.#requireLivePoint(snapshot, point);
        if (loadable) return this.#exportPrefix(sessionId, snapshot.revisionCount);
        // Refused: as recorded; a stream whose migration is not persisted, as its stored texts.
        return held?.kind === 'unpersisted'
          ? exportStoredSessionSource(held.texts.slice(0, snapshot.revisionCount))
          : encodeRecordedSession(this.revisions(sessionId).slice(0, snapshot.revisionCount));
      }
    }
  }

  /** A live point resolves only while live revision `revisionCount` is the one it was bound to. */
  #requireLivePoint(snapshot: StoredSnapshotFields, point: LiveRestorePoint): void {
    if (point.headChecksum === null) return;
    const head = this.revisions(snapshot.sessionId)[snapshot.revisionCount - 1];
    if (head?.checksum !== point.headChecksum) throw new RestorePointUnavailableError(snapshot.storageId);
  }

  /**
   * The v13 stream of an archived restore point: the first `revisionCount` revisions the live root archived,
   * as stored, migrated as a save of their own. Throws RestorePointUnavailableError when the live root
   * no longer archives that exact revision.
   */
  #archivedPoint(snapshot: StoredSnapshotFields, point: ArchivedRestorePoint): readonly SessionRevision[] {
    const archived = this.#archivedRevisions(snapshot, point);
    if (archived === null) throw new RestorePointUnavailableError(snapshot.storageId);
    return migrateStoredSessionRevisions(archived, this.recordingEngine);
  }

  /** The stored texts of an archived restore point's prefix, or null when the live root does not archive it. */
  #archivedRevisions(snapshot: StoredSnapshotFields, point: ArchivedRestorePoint): readonly string[] | null {
    const held = this.#held.get(snapshot.sessionId);
    const root = held?.kind === 'stored' ? held.revisions[0] : undefined;
    if (root?.transition.kind !== 'session_migrated' || root.transition.archive.source.kind !== 'stored_stream') return null;
    const prefix = root.transition.archive.source.revisions.slice(0, snapshot.revisionCount);
    return prefix.length === snapshot.revisionCount && prefix.at(-1)?.sha256 === point.archivedRevisionSha256
      ? prefix.map((revision) => revision.text)
      : null;
  }

  /**
   * The v13 stream of an own-save point (FOOTPRINT fix2; a kept legacy session save's, fix3): its save text migrated
   * as a save of its own (D919), by the loader that migrates any save: repaired and archived when v13 cannot express
   * it, else the version bump.
   */
  #ownSavePoint(snapshot: StoredSnapshotFields, point: OwnSaveRestorePoint): readonly SessionRevision[] {
    // Decoded as recorded, not imported: its loadability and its restore replay it on their own (SAVE-COMPAT C3).
    const { summary, revisions } = decodeSavedSession(point.text, this.recordingEngine);
    if (summary.sessionId !== snapshot.sessionId) {
      throw new Error('Browser autosave save belongs to another session.');
    }
    return revisions;
  }

  /** The strict export of `revisions`: replayed under this store's build, then encoded as recorded. */
  #strictExport(revisions: readonly SessionRevision[]): string {
    return encodeRecordedSession(replayVerifiedRevisions(revisions, this.recordingEngine));
  }

  /**
   * Restores an archived point: the live stream becomes that point's own migrated stream (D919), and every other
   * archived point of the session that the restored stream now holds LIVE (its prefix migrated by the version
   * bump) becomes a live prefix bound to its revision there. Points it holds archived still resolve against the
   * new root's archive, which keeps the same stored texts. Points into the replaced live stream, and archived
   * points past this one, refer to history the restore discarded: they no longer resolve.
   */
  async #restoreArchived(snapshot: StoredAutosaveSnapshot, point: ArchivedRestorePoint): Promise<void> {
    const sessionId = snapshot.sessionId;
    const restored = replayVerifiedRevisions(this.#archivedPoint(snapshot, point), this.recordingEngine);
    const repointed: StoredAutosaveSnapshot[] = restored[0]?.transition.kind === 'session_migrated'
      ? []
      : [...this.#snapshots.values()]
          .filter((candidate): candidate is ArchivedAutosaveSnapshot => candidate.sessionId === sessionId &&
            isArchivedSnapshot(candidate) && candidate.revisionCount <= restored.length &&
            this.#archivedRevisions(candidate, candidate.restorePoint) !== null)
          .map((candidate) => ({
            ...candidate,
            restorePoint: { kind: 'live', headChecksum: checksumAt(restored, candidate.revisionCount) },
          }));
    await this.#replaceStream(restored, repointed, this.#restoredAutosaveMetadata(snapshot));
  }

  /** The session's metadata once `snapshot`, an autosave, is restored: an autosave of its pool. */
  #restoredAutosaveMetadata(snapshot: StoredAutosaveSnapshot): BrowserSaveMetadata {
    return {
      sessionId: snapshot.sessionId,
      name: snapshot.sessionId,
      updatedAt: snapshot.updatedAt,
      retention: { kind: 'autosave', pool: snapshot.pool },
      migrationStatus: this.#metadata.get(snapshot.sessionId)?.migrationStatus ?? 'native',
    };
  }

  /**
   * The session's whole live stream replaced by `restored` (a restore point's own stream), in one transaction with
   * the session's `metadata` and the re-pointed autosaves.
   */
  async #replaceStream(
    restored: ReplayVerifiedRevisions,
    repointed: readonly StoredAutosaveSnapshot[],
    metadata: BrowserSaveMetadata,
  ): Promise<void> {
    const sessionId = metadata.sessionId;
    const currentKeys = this.#heldKeys(sessionId);
    const encoded = await Promise.all(restored.map(async (revision) => ({
      key: revisionKey(sessionId, revision.revision),
      value: await encodedStoredRevision(revision),
    })));
    await this.#directWrite('restore', async () => {
      const transaction = this.database.transaction(
        [revisionStoreName(), sessionStoreName(), snapshotStoreName()],
        'readwrite',
      );
      for (const key of currentKeys) transaction.objectStore(revisionStoreName()).delete(key);
      for (const revision of encoded) transaction.objectStore(revisionStoreName()).put(revision.value, revision.key);
      transaction.objectStore(sessionStoreName()).put(metadata, sessionId);
      for (const live of repointed) transaction.objectStore(snapshotStoreName()).put(live, live.storageId);
      await transactionComplete(transaction);
    });
    await this.#preload();
  }

  #captureAutosave(revision: SessionRevision, trigger: AutosaveTrigger): StoredAutosaveSnapshot {
    const pool = autosavePoolForTrigger(trigger);
    const storageId = `${pool}:${revision.sessionId}:${String(revision.revision).padStart(12, '0')}:${trigger}`;
    const decoded = decodeSavedSessionFingerprint(this.#exportPrefix(revision.sessionId, revision.revision), this.recordingEngine);
    return {
      ...decoded,
      storageId,
      trigger,
      pool,
      name: `${pool === 'per_round' ? 'Round' : 'Encounter boundary'} — ${trigger.replaceAll('_', ' ')} — r${String(revision.encounterState.round)}`,
      updatedAt: this.clock.now().toISOString(),
      retention: { kind: 'autosave', pool },
      restorePoint: { kind: 'live', headChecksum: revision.checksum },
    };
  }

  #exportPrefix(sessionId: EncounterSessionId, revisionCount: number): string {
    return this.#strictExport(this.revisions(sessionId).slice(0, revisionCount));
  }

  #pruneAutosaves(): readonly string[] {
    const removed: string[] = [];
    for (const pool of ['per_round', 'encounter_boundary'] as const) {
      const expired = [...this.#snapshots.values()]
        .filter((snapshot) => isAutosave(snapshot) && snapshot.retention.kind === 'autosave' && snapshot.pool === pool)
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
        [revisionStoreName(), sessionStoreName(), snapshotStoreName()],
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
    const transaction = this.database.transaction(
      [revisionStoreName(), sessionStoreName(), snapshotStoreName()],
      'readonly',
    );
    const [revisions, metadata, snapshots] = await Promise.all([
      requestResult(transaction.objectStore(revisionStoreName()).getAll()),
      requestResult(transaction.objectStore(sessionStoreName()).getAll()),
      requestResult(transaction.objectStore(snapshotStoreName()).getAll()),
    ]);
    await transactionComplete(transaction);
    const nextHeld = new Map<EncounterSessionId, HeldStream>();
    const bySession = new Map<EncounterSessionId, StoredRevisionRecord[]>();
    for (const stored of await Promise.all(
      (revisions as unknown[]).map(async (value) => decodedStoredRevision(value)),
    )) {
      const current = bySession.get(stored.header.sessionId) ?? [];
      current.push(stored);
      bySession.set(stored.header.sessionId, current);
    }
    const migratedStreams: SessionRevision[][] = [];
    // A stream whose history v13 cannot express migrates to ONE archived root revision (FOOTPRINT, D919): the
    // stored revisions past it are deleted, since the root's archive holds their stored texts byte for byte.
    const staleRevisionKeys: string[] = [];
    // The stored texts of each stream that migrated by archive, for its autosaves' restore points.
    const archivedStreams = new Map<EncounterSessionId, readonly string[]>();
    for (const [sessionId, stream] of bySession) {
      stream.sort((left, right) => left.header.revision - right.header.revision);
      const texts = stream.map((stored) => stored.text);
      const keys = stream.map((stored) => revisionKey(stored.header.sessionId, stored.header.revision));
      // SAVE-COMPAT C2 (WR17, WR18): each stream decodes on its own. One that does not is held undecodable, its
      // stored records untouched, and every other stream still opens.
      let migrated: SessionRevision[];
      try {
        migrated = [...migrateStoredSessionRevisions(texts, this.recordingEngine)];
      } catch (error) {
        nextHeld.set(sessionId, { kind: 'undecodable', keys, texts, error, refusal: sessionLoadRefusalOf(error) });
        continue;
      }
      if (!stream.some((stored, index) => stored.header.schemaVersion !== migrated[index]?.schemaVersion)) {
        nextHeld.set(sessionId, { kind: 'stored', revisions: migrated });
        continue;
      }
      // SAVE-COMPAT C3 (WR12, D944): a migrated stream is written only after a strict replay under this store's build
      // verifies it. One that does not verify is held unpersisted: its stored records and metadata stay as they are.
      const verdict = savedSessionLoadability(migrated, this.recordingEngine);
      if (verdict.kind === 'refused') {
        nextHeld.set(sessionId, { kind: 'unpersisted', keys, texts, revisions: migrated, refusal: verdict.refusal });
        continue;
      }
      nextHeld.set(sessionId, { kind: 'stored', revisions: migrated });
      migratedStreams.push(migrated);
      staleRevisionKeys.push(...keys.slice(migrated.length));
      const root = migrated[0];
      if (root?.transition.kind === 'session_migrated') archivedStreams.set(root.sessionId, texts);
    }
    this.#held = nextHeld;
    this.#loadability.clear();
    this.#metadata.clear();
    for (const value of metadata as BrowserSaveMetadata[]) this.#metadata.set(value.sessionId, value);
    this.#snapshots.clear();
    const repointed: StoredAutosaveSnapshot[] = [];
    for (const stored of (snapshots as unknown[]).map(storedSnapshot)) {
      const texts = archivedStreams.get(stored.sessionId);
      // Only a live point pointed into the stream that just migrated; an archived or own-save point (and a kept
      // legacy session save, always its own save) holds its own.
      if (texts === undefined || !isAutosave(stored) || stored.restorePoint.kind !== 'live') {
        this.#snapshots.set(stored.storageId, stored);
        continue;
      }
      const snapshot = this.#pointedIntoArchive(stored, texts);
      if (snapshot !== stored) repointed.push(snapshot);
      this.#snapshots.set(snapshot.storageId, snapshot);
    }
    if (migratedStreams.length > 0) {
      const encoded = await Promise.all(migratedStreams.flatMap((stream) =>
        stream.map(async (revision) => ({
          key: revisionKey(revision.sessionId, revision.revision),
          value: await encodedStoredRevision(revision),
        }))));
      const migration = this.database.transaction([revisionStoreName(), sessionStoreName(), snapshotStoreName()], 'readwrite');
      for (const revision of encoded) {
        migration.objectStore(revisionStoreName()).put(revision.value, revision.key);
      }
      for (const key of staleRevisionKeys) migration.objectStore(revisionStoreName()).delete(key);
      for (const snapshot of repointed) migration.objectStore(snapshotStoreName()).put(snapshot, snapshot.storageId);
      for (const stream of migratedStreams) {
        const sessionId = stream[0]?.sessionId;
        if (sessionId === undefined) continue;
        const existing = this.#metadata.get(sessionId);
        if (existing === undefined) continue;
        const complete: BrowserSaveMetadata = { ...existing, migrationStatus: 'complete' };
        this.#metadata.set(sessionId, complete);
        migration.objectStore(sessionStoreName()).put(complete, sessionId);
      }
      await transactionComplete(migration);
    }
  }

  /**
   * A live autosave of a stream that just migrated by archive (FOOTPRINT fix1, codex r1 P1), re-pointed: a point
   * before the stream's last stored revision becomes an archived point (its prefix of the archived texts); a point
   * at the head (or past it) is the migrated root itself, a live prefix of one revision, described afresh.
   */
  #pointedIntoArchive(snapshot: StoredAutosaveSnapshot, texts: readonly string[]): StoredAutosaveSnapshot {
    const head = texts[snapshot.revisionCount - 1];
    if (snapshot.revisionCount < texts.length && head !== undefined) {
      return { ...snapshot, restorePoint: { kind: 'archived', archivedRevisionSha256: sha256(head) } };
    }
    return {
      ...snapshot,
      ...decodeSavedSessionFingerprint(this.#exportPrefix(snapshot.sessionId, 1), this.recordingEngine),
      restorePoint: { kind: 'live', headChecksum: checksumAt(this.revisions(snapshot.sessionId), 1) },
    };
  }

  /**
   * Moves legacy localStorage saves into IndexedDB, removing each from localStorage once its IndexedDB copy is
   * committed. True when any was moved (the caller preloads again). Runs after a preload, so the stream of a session
   * already stored is known.
   */
  async #migrateLegacy(): Promise<boolean> {
    const keys = Array.from({ length: this.legacyStorage.length }, (_unused, index) => this.legacyStorage.key(index))
      .filter((key): key is string => key !== null);
    let migrated = false;
    // Each session's stored stream as this migration leaves it: the preloaded one, or the one written here; null when
    // the stored stream does not decode (SAVE-COMPAT C2): nothing is written over it, so a legacy save of that session
    // is kept as a save of its own.
    const streams = new Map<EncounterSessionId, readonly SessionRevision[]>();
    const streamOf = (sessionId: EncounterSessionId): readonly SessionRevision[] | null => {
      const written = streams.get(sessionId);
      if (written !== undefined) return written;
      const held = this.#held.get(sessionId);
      return held?.kind === 'undecodable' ? null : held?.revisions ?? [];
    };
    // Legacy sessions (FOOTPRINT fix3, codex r3 P1). A legacy session save never writes over a stream IndexedDB
    // already holds under its id (legacySessionPlacement): only a session with no stream takes its revisions and its
    // metadata; a save that extends the stored stream adds its later revisions; one the stored stream holds adds
    // nothing; one that diverges is kept whole as a save of its own. The legacy keys go once that is committed.
    for (const key of keys.filter((candidate) => candidate.startsWith(LEGACY_SESSION_PREFIX))) {
      const bytes = this.legacyStorage.getItem(key);
      if (bytes === null) continue;
      const sessionId = key.slice(LEGACY_SESSION_PREFIX.length) as EncounterSessionId;
      // Decoded as recorded, never imported (SAVE-COMPAT C3). A save that does not decode stays in localStorage,
      // untouched, and is retried at the next open (D947 SQ11).
      let decoded: ReturnType<typeof decodeSavedSession>;
      try {
        decoded = decodeSavedSession(bytes, this.recordingEngine);
      } catch {
        continue;
      }
      if (decoded.summary.sessionId !== sessionId) throw new Error('Stored VTT session identity does not match its storage key.');
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
      const legacyRevisions = decoded.revisions;
      const stored = streamOf(sessionId);
      const natural: LegacySessionPlacement = stored === null
        ? { kind: 'diverged' }
        : legacySessionPlacement(legacyRevisions, stored);
      // Its revisions are written only when a strict replay verifies the stream they make (SAVE-COMPAT C3, WR14);
      // otherwise the save is kept whole, verbatim, as a save of its own.
      const writes = natural.kind === 'new_session' || natural.kind === 'extends';
      const placement: LegacySessionPlacement =
        writes && savedSessionLoadability(legacyRevisions, this.recordingEngine).kind === 'refused'
          ? { kind: 'diverged' }
          : natural;
      const written = placement.kind === 'new_session' ? legacyRevisions : placement.kind === 'extends' ? placement.added : [];
      const storedRevisions = await Promise.all(written.map(async (revision) => ({
        bytes: await encodedStoredRevision(revision),
        key: revisionKey(sessionId, revision.revision),
      })));
      const transaction = this.database.transaction([revisionStoreName(), sessionStoreName(), snapshotStoreName()], 'readwrite');
      for (const revision of storedRevisions) {
        transaction.objectStore(revisionStoreName()).put(revision.bytes, revision.key);
      }
      if (placement.kind === 'new_session') transaction.objectStore(sessionStoreName()).put(metadata, sessionId);
      if (placement.kind === 'diverged') {
        const kept: KeptLegacySessionSave = {
          ...decoded.summary,
          kind: 'kept_legacy_session',
          storageId: keptLegacySessionStorageId(sessionId, bytes),
          name: `${metadata.name} (kept legacy copy)`,
          updatedAt: metadata.updatedAt,
          retention: { kind: 'named' },
          migrationStatus: metadata.migrationStatus,
          restorePoint: { kind: 'own_save', text: bytes },
        };
        transaction.objectStore(snapshotStoreName()).put(kept, kept.storageId);
      }
      await transactionComplete(transaction);
      if (written.length > 0) streams.set(sessionId, legacyRevisions);
      migrated = true;
      this.legacyStorage.removeItem(key);
      this.legacyStorage.removeItem(`${LEGACY_METADATA_PREFIX}${sessionId}`);
      this.legacyStorage.removeItem(`${LEGACY_TRUNCATED_PREFIX}${sessionId}`);
    }

    // Legacy autosaves (FOOTPRINT fix2, codex r2 P1). An autosave never writes over a session's revisions: since
    // D919 an autosave's save can migrate differently from its session's (one by archive and the other by the
    // version bump, or to two archive roots), and writing it to the session's revision keys replaced the session's
    // head. An autosave whose migrated stream is a prefix of its session's is a live point into it; any other keeps
    // its own save text as an own_save point. Only a session with no stream takes an autosave's revisions: the
    // autosave with the longest saved history first (ties keep key order), so the session is the longest history
    // the autosaves hold, as when every prefix wrote the same keys.
    const autosaves = keys.filter((candidate) => candidate.startsWith(legacyAutosavePrefix())).flatMap((key) => {
      const raw = this.legacyStorage.getItem(key);
      if (raw === null) return [];
      const legacy = legacySnapshot(raw);
      if (legacy === null) throw new Error('Stored browser autosave is malformed.');
      // Decoded as recorded, never imported (SAVE-COMPAT C3); a save that does not decode stays in localStorage.
      let decoded: ReturnType<typeof decodeSavedSession>;
      try {
        decoded = decodeSavedSession(legacy.bytes, this.recordingEngine);
      } catch {
        return [];
      }
      if (decoded.summary.sessionId !== legacy.sessionId) {
        throw new Error('Stored browser autosave identity does not match its session.');
      }
      return [{ key, legacy, decoded, historyLength: legacyHistoryLength(legacy.bytes) }];
    }).sort((left, right) => right.historyLength - left.historyLength);
    for (const { key, legacy, decoded: { summary: decoded, revisions } } of autosaves) {
      const session = streamOf(legacy.sessionId);
      // An autosave's revisions become the session only when a strict replay verifies them (SAVE-COMPAT C3, WR14);
      // otherwise it keeps its own save text, verbatim.
      const written = session !== null && session.length === 0 &&
        savedSessionLoadability(revisions, this.recordingEngine).kind === 'loadable'
        ? revisions
        : [];
      let restorePoint: AutosaveRestorePoint;
      if (written.length > 0) restorePoint = { kind: 'live', headChecksum: checksumAt(written, written.length) };
      else if (session !== null && isPrefixOf(revisions, session)) {
        restorePoint = { kind: 'live', headChecksum: checksumAt(session, revisions.length) };
      }
      else restorePoint = { kind: 'own_save', text: legacy.bytes };
      const snapshot: StoredAutosaveSnapshot = {
        ...decoded,
        storageId: legacy.storageId,
        trigger: legacy.trigger,
        pool: legacy.pool,
        name: legacy.name,
        updatedAt: legacy.updatedAt,
        retention: legacy.retention,
        restorePoint,
      };
      const existingMetadata = await this.#readMetadata(legacy.sessionId);
      const storedRevisions = await Promise.all(written.map(async (revision) => ({
        bytes: await encodedStoredRevision(revision),
        key: revisionKey(legacy.sessionId, revision.revision),
      })));
      const transaction = this.database.transaction(
        [revisionStoreName(), sessionStoreName(), snapshotStoreName()],
        'readwrite',
      );
      for (const revision of storedRevisions) {
        transaction.objectStore(revisionStoreName()).put(revision.bytes, revision.key);
      }
      // No session metadata without the session's revisions.
      if (existingMetadata === null && written.length > 0) {
        transaction.objectStore(sessionStoreName()).put({
          sessionId: legacy.sessionId,
          name: legacy.sessionId,
          updatedAt: legacy.updatedAt,
          retention: { kind: 'autosave', pool: legacy.pool },
          migrationStatus: legacy.bytes.length >= LIKELY_LOCAL_STORAGE_LIMIT_BYTES ? 'truncated' : 'complete',
        } satisfies BrowserSaveMetadata, legacy.sessionId);
      }
      transaction.objectStore(snapshotStoreName()).put(snapshot, snapshot.storageId);
      await transactionComplete(transaction);
      if (written.length > 0) streams.set(legacy.sessionId, written);
      migrated = true;
      this.legacyStorage.removeItem(key);
    }
    return migrated;
  }

  async #readMetadata(sessionId: EncounterSessionId): Promise<BrowserSaveMetadata | null> {
    const transaction = this.database.transaction(sessionStoreName(), 'readonly');
    const value: unknown = await requestResult(transaction.objectStore(sessionStoreName()).get(sessionId));
    await transactionComplete(transaction);
    return value === undefined ? null : value as BrowserSaveMetadata;
  }
}

/** Imports a save and resolves only after the browser's durable write boundary acknowledges it. */
export async function importBrowserSessionDurably(
  store: Pick<IndexedDbBrowserSessionStore, 'import' | 'flush'>,
  bytes: string,
): Promise<EncounterSessionId> {
  const sessionId = store.import(bytes);
  await store.flush();
  return sessionId;
}
