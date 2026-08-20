import type { EncounterSessionId } from '../combat/values';
import {
  MemoryBrowserSessionStore,
  exportSavedSession,
  importSavedSession,
  type BrowserSessionStore,
  type SessionRevision,
} from './session-persistence';

const STORAGE_PREFIX = 'srd55:vtt-session:';

/** Durable browser adapter over increment 5's checked revision bundle codec. */
export class LocalStorageBrowserSessionStore implements BrowserSessionStore {
  readonly #memory = new MemoryBrowserSessionStore();
  readonly #loaded = new Set<EncounterSessionId>();

  constructor(private readonly storage: Storage) {}

  #key(sessionId: EncounterSessionId): string {
    return `${STORAGE_PREFIX}${sessionId}`;
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
  }
}
