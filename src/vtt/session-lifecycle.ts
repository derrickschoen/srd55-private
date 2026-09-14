import type { EncounterSessionId } from '../combat/values';
import {
  type IndexedDbBrowserSessionStore,
  type StoredBrowserSave,
} from './local-session-store';
import { decodeSavedSessionFingerprint } from './session-persistence';
import type { SaveManagerNavigationInstruction } from './save-manager';

export type SessionLifecycleIntent =
  | { readonly kind: 'list' }
  | {
      readonly kind: 'rename';
      readonly storageId: string;
      readonly sessionId: EncounterSessionId;
      readonly name: string;
    }
  | {
      readonly kind: 'delete';
      readonly storageId: string;
      readonly sessionId: EncounterSessionId;
    }
  | {
      readonly kind: 'restore';
      readonly storageId: string;
      readonly sessionId: EncounterSessionId;
    }
  | { readonly kind: 'import'; readonly bytes: string }
  | {
      readonly kind: 'export';
      readonly storageId: string;
      readonly sessionId: EncounterSessionId;
    }
  | { readonly kind: 'flush' };

export type SessionLifecycleResult =
  | { readonly kind: 'listed'; readonly saves: readonly StoredBrowserSave[] }
  | { readonly kind: 'renamed' }
  | {
      readonly kind: 'deleted';
      readonly navigation: SaveManagerNavigationInstruction | null;
    }
  | { readonly kind: 'restored'; readonly activeSession: boolean }
  | { readonly kind: 'imported'; readonly sessionId: EncounterSessionId }
  | { readonly kind: 'duplicate'; readonly sessionId: EncounterSessionId }
  | {
      readonly kind: 'conflict';
      readonly sessionId: EncounterSessionId;
      readonly existingFingerprint: string;
      readonly importedFingerprint: string;
    }
  | { readonly kind: 'exported'; readonly bytes: string }
  | { readonly kind: 'flushed' };

export interface ActiveSessionBinding {
  sessionId(): EncounterSessionId | null;
  close(): void | Promise<void>;
}

export interface SessionLifecyclePort {
  dispatch(intent: SessionLifecycleIntent): Promise<SessionLifecycleResult>;
}

export type SessionLifecycleStore = Pick<
  IndexedDbBrowserSessionStore,
  | 'savedSessions'
  | 'renameStored'
  | 'removeStored'
  | 'restoreStored'
  | 'revisions'
  | 'import'
  | 'exported'
  | 'exportedStored'
  | 'flush'
>;

export class IndexedDbSessionLifecycle implements SessionLifecyclePort {
  constructor(
    private readonly store: SessionLifecycleStore,
    private readonly active: ActiveSessionBinding,
  ) {}

  async dispatch(intent: SessionLifecycleIntent): Promise<SessionLifecycleResult> {
    switch (intent.kind) {
      case 'list':
        return { kind: 'listed', saves: this.store.savedSessions() };
      case 'rename':
        await this.store.renameStored(intent.storageId, intent.sessionId, intent.name);
        return { kind: 'renamed' };
      case 'delete':
        return this.#delete(intent);
      case 'restore': {
        await this.store.flush();
        await this.store.restoreStored(intent.storageId, intent.sessionId);
        return {
          kind: 'restored',
          activeSession: this.active.sessionId() === intent.sessionId,
        };
      }
      case 'import':
        return this.#import(intent.bytes);
      case 'export':
        await this.store.flush();
        return {
          kind: 'exported',
          bytes: this.store.exportedStored(intent.storageId, intent.sessionId),
        };
      case 'flush':
        await this.store.flush();
        return { kind: 'flushed' };
    }
  }

  async #delete(intent: Extract<SessionLifecycleIntent, { readonly kind: 'delete' }>): Promise<SessionLifecycleResult> {
    const deletesActiveSession = this.active.sessionId() === intent.sessionId &&
      intent.storageId.startsWith('session:');
    if (deletesActiveSession) await this.active.close();
    await this.store.flush();
    await this.store.removeStored(intent.storageId, intent.sessionId);
    return {
      kind: 'deleted',
      navigation: deletesActiveSession
        ? { kind: 'open_new_session', deletedSessionId: intent.sessionId }
        : null,
    };
  }

  async #import(bytes: string): Promise<SessionLifecycleResult> {
    const decoded = decodeSavedSessionFingerprint(bytes);
    const existing = this.store.revisions(decoded.sessionId);
    if (existing.length !== 0) {
      const existingFingerprint = decodeSavedSessionFingerprint(
        this.store.exported(decoded.sessionId),
      ).fingerprint;
      return existingFingerprint === decoded.fingerprint
        ? { kind: 'duplicate', sessionId: decoded.sessionId }
        : {
            kind: 'conflict',
            sessionId: decoded.sessionId,
            existingFingerprint,
            importedFingerprint: decoded.fingerprint,
          };
    }
    const sessionId = this.store.import(bytes);
    await this.store.flush();
    return { kind: 'imported', sessionId };
  }
}
