import type { EncounterSessionId } from '../combat/values';
import type {
  IndexedDbBrowserSessionStore,
  StoredBrowserSave,
} from './local-session-store';
import {
  savedSessionSummary,
  sessionLoadRefusalOf,
  type DecodedSavedSessionFingerprint,
  type SessionLoadRefusal,
} from './session-persistence';
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
      /** Null: the session the store holds under this id does not decode. */
      readonly existingFingerprint: string | null;
      readonly importedFingerprint: string;
    }
  /** The save was refused as the player should see it: another build recorded it, or it cannot be carried (D939, D947 SQ6). */
  | { readonly kind: 'refused'; readonly refusal: ReturnedImportRefusal }
  | { readonly kind: 'exported'; readonly bytes: string }
  | { readonly kind: 'flushed' };

/**
 * The refusals an import returns as a result: another build recorded the save, or a migration step cannot carry it
 * (D947 SQ6: the same family, D940's fallback to D939's refusal). Every other refusal (integrity, load_failed) still
 * throws.
 */
export type ReturnedImportRefusal = Extract<SessionLoadRefusal, { readonly kind: 'recorded_by_other_build' | 'not_migratable' }>;

export function returnedImportRefusal(refusal: SessionLoadRefusal): ReturnedImportRefusal | null {
  switch (refusal.kind) {
    case 'recorded_by_other_build':
    case 'not_migratable':
      return refusal;
    case 'integrity':
    case 'load_failed':
      return null;
  }
}

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
  | 'heldSession'
  | 'import'
  | 'exportedStored'
  | 'flush'
  | 'recordingEngine'
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
    // The save's own summary, without a replay: the store's import replays it strictly before any write (SAVE-COMPAT
    // C3), and refuses it there when this build cannot verify it.
    let decoded: DecodedSavedSessionFingerprint;
    try {
      decoded = savedSessionSummary(bytes, this.store.recordingEngine);
    } catch (error) {
      return this.#refusedImport(error);
    }
    // The session already held is compared by its recorded summary, without replaying it (it may be refused itself).
    const held = this.store.heldSession(decoded.sessionId);
    if (held !== null) {
      const existingFingerprint = held.kind === 'decoded' ? held.summary.fingerprint : null;
      return existingFingerprint === decoded.fingerprint
        ? { kind: 'duplicate', sessionId: decoded.sessionId }
        : {
            kind: 'conflict',
            sessionId: decoded.sessionId,
            existingFingerprint,
            importedFingerprint: decoded.fingerprint,
          };
    }
    let sessionId: EncounterSessionId;
    try {
      sessionId = this.store.import(bytes);
    } catch (error) {
      return this.#refusedImport(error);
    }
    await this.store.flush();
    return { kind: 'imported', sessionId };
  }

  /** A refusal the player should see is returned; any other failure is rethrown as it is. */
  #refusedImport(error: unknown): SessionLifecycleResult {
    const refusal = returnedImportRefusal(sessionLoadRefusalOf(error));
    if (refusal === null) throw error;
    return { kind: 'refused', refusal };
  }
}
