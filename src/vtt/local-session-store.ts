import type { EncounterSessionId } from '../combat/values';
import {
  decodeSavedSessionFingerprint,
  MemoryBrowserSessionStore,
  exportSavedSession,
  importSavedSession,
  type BrowserSessionStore,
  type DecodedSavedSessionFingerprint,
  type SessionRevision,
} from './session-persistence';

const STORAGE_PREFIX = 'srd55:vtt-session:';
const METADATA_PREFIX = 'srd55:vtt-session-metadata:';

interface BrowserSaveMetadata {
  readonly name: string;
  readonly updatedAt: string;
}

export interface StoredBrowserSave extends DecodedSavedSessionFingerprint {
  readonly name: string;
  readonly updatedAt: string;
  readonly bytes: string;
}

/** Durable browser adapter over increment 5's checked revision bundle codec. */
export class LocalStorageBrowserSessionStore implements BrowserSessionStore {
  #memory = new MemoryBrowserSessionStore();
  readonly #loaded = new Set<EncounterSessionId>();

  constructor(private readonly storage: Storage) {}

  #key(sessionId: EncounterSessionId): string {
    return `${STORAGE_PREFIX}${sessionId}`;
  }

  #metadataKey(sessionId: EncounterSessionId): string {
    return `${METADATA_PREFIX}${sessionId}`;
  }

  #metadata(sessionId: EncounterSessionId): BrowserSaveMetadata | null {
    const raw = this.storage.getItem(this.#metadataKey(sessionId));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const name = Reflect.get(parsed, 'name');
    const updatedAt = Reflect.get(parsed, 'updatedAt');
    return typeof name === 'string' && typeof updatedAt === 'string'
      ? { name, updatedAt }
      : null;
  }

  #writeMetadata(sessionId: EncounterSessionId, metadata: BrowserSaveMetadata): void {
    this.storage.setItem(this.#metadataKey(sessionId), JSON.stringify(metadata));
  }

  #load(sessionId: EncounterSessionId): void {
    if (this.#loaded.has(sessionId)) return;
    this.#loaded.add(sessionId);
    const saved = this.storage.getItem(this.#key(sessionId));
    if (saved === null) return;
    const imported = importSavedSession(this.#memory, saved);
    if (imported !== sessionId) {
      throw new Error('Stored VTT session identity does not match its storage key.');
    }
  }

  #flush(sessionId: EncounterSessionId): void {
    this.storage.setItem(
      this.#key(sessionId),
      exportSavedSession(this.#memory, sessionId),
    );
    const current = this.#metadata(sessionId);
    this.#writeMetadata(sessionId, {
      name: current?.name ?? sessionId,
      updatedAt: new Date().toISOString(),
    });
  }

  append(revision: SessionRevision): void {
    this.#load(revision.sessionId);
    this.#memory.append(revision);
    this.#flush(revision.sessionId);
  }

  appendAll(revisions: readonly SessionRevision[]): void {
    const first = revisions[0];
    if (first === undefined) return;
    this.#load(first.sessionId);
    this.#memory.appendAll(revisions);
    this.#flush(first.sessionId);
  }

  revisions(sessionId: EncounterSessionId): readonly SessionRevision[] {
    this.#load(sessionId);
    return this.#memory.revisions(sessionId);
  }

  remove(sessionId: EncounterSessionId): void {
    this.storage.removeItem(this.#key(sessionId));
    this.storage.removeItem(this.#metadataKey(sessionId));
    this.#memory = new MemoryBrowserSessionStore();
    this.#loaded.clear();
  }

  rename(sessionId: EncounterSessionId, name: string): void {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error('A save name cannot be empty.');
    const existing = this.#metadata(sessionId);
    if (existing === null && this.storage.getItem(this.#key(sessionId)) === null) {
      throw new Error('Browser save does not exist.');
    }
    this.#writeMetadata(sessionId, {
      name: trimmed,
      updatedAt: existing?.updatedAt ?? new Date().toISOString(),
    });
  }

  savedSessions(): readonly StoredBrowserSave[] {
    const saves: StoredBrowserSave[] = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (key === null || !key.startsWith(STORAGE_PREFIX)) continue;
      const bytes = this.storage.getItem(key);
      if (bytes === null) continue;
      const decoded = decodeSavedSessionFingerprint(bytes);
      const metadata = this.#metadata(decoded.sessionId);
      saves.push({
        ...decoded,
        name: metadata?.name ?? decoded.sessionId,
        updatedAt: metadata?.updatedAt ?? new Date(0).toISOString(),
        bytes,
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
}
