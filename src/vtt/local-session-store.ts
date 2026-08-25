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
import type { SaveRetention } from './save-manager';
import { autosavePoolForTrigger, type AutosavePool, type AutosaveTrigger } from './save-manager';

const STORAGE_PREFIX = 'srd55:vtt-session:';
const METADATA_PREFIX = 'srd55:vtt-session-metadata:';
const AUTOSAVE_PREFIX = 'srd55:vtt-autosave:';

interface BrowserSaveMetadata {
  readonly name: string;
  readonly updatedAt: string;
  readonly retention: SaveRetention;
}

export interface StoredBrowserSave extends DecodedSavedSessionFingerprint {
  readonly storageId: string;
  readonly name: string;
  readonly updatedAt: string;
  readonly bytes: string;
  readonly retention: SaveRetention;
}

interface StoredAutosaveSnapshot {
  readonly storageId: string;
  readonly sessionId: EncounterSessionId;
  readonly trigger: AutosaveTrigger;
  readonly pool: AutosavePool;
  readonly name: string;
  readonly updatedAt: string;
  readonly bytes: string;
  readonly retention: SaveRetention;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    const retention = Reflect.get(parsed, 'retention');
    const decodedRetention: SaveRetention = typeof retention === 'object' && retention !== null &&
      (Reflect.get(retention, 'kind') === 'named' ||
        (Reflect.get(retention, 'kind') === 'autosave' &&
          (Reflect.get(retention, 'pool') === 'per_round' || Reflect.get(retention, 'pool') === 'encounter_boundary')))
      ? retention as SaveRetention
      : { kind: 'autosave', pool: 'per_round' };
    return typeof name === 'string' && typeof updatedAt === 'string'
      ? { name, updatedAt, retention: decodedRetention }
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
      retention: current?.retention ?? { kind: 'autosave', pool: 'per_round' },
    });
  }

  #autosaveSnapshot(value: unknown): StoredAutosaveSnapshot | null {
    if (!isRecord(value) || typeof value.storageId !== 'string' ||
      typeof value.sessionId !== 'string' || typeof value.trigger !== 'string' ||
      typeof value.pool !== 'string' || typeof value.name !== 'string' ||
      typeof value.updatedAt !== 'string' || typeof value.bytes !== 'string') return null;
    if (!['round_boundary', 'encounter_start', 'encounter_end', 'short_rest_boundary', 'long_rest_boundary'].includes(value.trigger)) return null;
    if (value.pool !== 'per_round' && value.pool !== 'encounter_boundary') return null;
    const retention = value.retention;
    if (!isRecord(retention) ||
      !((retention.kind === 'named') ||
        (retention.kind === 'autosave' && retention.pool === value.pool))) return null;
    return value as unknown as StoredAutosaveSnapshot;
  }

  #snapshots(): readonly StoredAutosaveSnapshot[] {
    const snapshots: StoredAutosaveSnapshot[] = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (key === null || !key.startsWith(AUTOSAVE_PREFIX)) continue;
      const raw = this.storage.getItem(key);
      if (raw === null) continue;
      const snapshot = this.#autosaveSnapshot(JSON.parse(raw));
      if (snapshot !== null) snapshots.push(snapshot);
    }
    return snapshots;
  }

  #pruneAutosaves(): void {
    for (const pool of ['per_round', 'encounter_boundary'] as const) {
      const expired = this.#snapshots()
        .filter((snapshot) => snapshot.retention.kind === 'autosave' && snapshot.pool === pool)
        .sort((left, right) => {
          const newest = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
          return newest === 0 ? right.storageId.localeCompare(left.storageId) : newest;
        })
        .slice(10);
      for (const snapshot of expired) this.storage.removeItem(`${AUTOSAVE_PREFIX}${snapshot.storageId}`);
    }
  }

  #captureAutosave(sessionId: EncounterSessionId, revision: SessionRevision, trigger: AutosaveTrigger): void {
    const pool = autosavePoolForTrigger(trigger);
    const storageId = `${pool}:${sessionId}:${String(revision.revision).padStart(12, '0')}:${trigger}`;
    const snapshot: StoredAutosaveSnapshot = {
      storageId,
      sessionId,
      trigger,
      pool,
      name: `${pool === 'per_round' ? 'Round' : 'Encounter boundary'} — ${trigger.replaceAll('_', ' ')} — r${String(revision.encounterState.round)}`,
      updatedAt: new Date().toISOString(),
      bytes: exportSavedSession(this.#memory, sessionId),
      retention: { kind: 'autosave', pool },
    };
    this.storage.setItem(`${AUTOSAVE_PREFIX}${storageId}`, JSON.stringify(snapshot));
    this.#pruneAutosaves();
  }

  #autosaveTriggers(previous: SessionRevision | undefined, revision: SessionRevision): readonly AutosaveTrigger[] {
    const triggers: AutosaveTrigger[] = [];
    if (revision.transition.kind === 'session_started') triggers.push('encounter_start');
    if (previous !== undefined && revision.encounterState.round > previous.encounterState.round) {
      triggers.push('round_boundary');
    }
    if (revision.transition.kind === 'room_composed') {
      triggers.push('encounter_end', 'encounter_start');
    }
    if (revision.transition.kind === 'short_rest_completed') triggers.push('short_rest_boundary');
    if (revision.transition.kind === 'long_rest_completed' ||
      (revision.transition.kind === 'party_state_captured' && revision.transition.restInterruption !== undefined)) {
      triggers.push('long_rest_boundary');
    }
    if (previous !== undefined) {
      const livingSides = (state: SessionRevision['encounterState']) => new Set(state.combatants
        .filter((combatant) => combatant.life === 'living')
        .map((combatant) => combatant.profile.kind));
      const before = livingSides(previous.encounterState);
      const after = livingSides(revision.encounterState);
      if (before.has('player_character') && before.has('monster') &&
        (!after.has('player_character') || !after.has('monster'))) {
        triggers.push('encounter_end');
      }
    }
    return [...new Set(triggers)];
  }

  append(revision: SessionRevision): void {
    this.#load(revision.sessionId);
    const previous = this.#memory.revisions(revision.sessionId).at(-1);
    this.#memory.append(revision);
    this.#flush(revision.sessionId);
    for (const trigger of this.#autosaveTriggers(previous, revision)) {
      this.#captureAutosave(revision.sessionId, revision, trigger);
    }
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

  removeStored(storageId: string, sessionId: EncounterSessionId): void {
    if (storageId.startsWith('session:')) {
      this.remove(sessionId);
      return;
    }
    this.storage.removeItem(`${AUTOSAVE_PREFIX}${storageId}`);
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
      retention: { kind: 'named' },
    });
  }

  renameStored(storageId: string, sessionId: EncounterSessionId, name: string): void {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error('A save name cannot be empty.');
    if (storageId.startsWith('session:')) {
      this.rename(sessionId, trimmed);
      return;
    }
    const key = `${AUTOSAVE_PREFIX}${storageId}`;
    const raw = this.storage.getItem(key);
    const snapshot = raw === null ? null : this.#autosaveSnapshot(JSON.parse(raw));
    if (snapshot === null) throw new Error('Browser autosave does not exist.');
    this.storage.setItem(key, JSON.stringify({ ...snapshot, name: trimmed, retention: { kind: 'named' } }));
  }

  restoreStored(storageId: string, sessionId: EncounterSessionId): void {
    if (storageId.startsWith('session:')) return;
    const raw = this.storage.getItem(`${AUTOSAVE_PREFIX}${storageId}`);
    const snapshot = raw === null ? null : this.#autosaveSnapshot(JSON.parse(raw));
    if (snapshot === null || snapshot.sessionId !== sessionId) {
      throw new Error('Browser autosave does not exist.');
    }
    this.storage.setItem(this.#key(sessionId), snapshot.bytes);
    this.#writeMetadata(sessionId, {
      name: sessionId,
      updatedAt: snapshot.updatedAt,
      retention: { kind: 'autosave', pool: snapshot.pool },
    });
    this.#memory = new MemoryBrowserSessionStore();
    this.#loaded.clear();
  }

  savedSessions(): readonly StoredBrowserSave[] {
    const saves: StoredBrowserSave[] = [];
    const snapshots = this.#snapshots();
    for (const snapshot of snapshots) {
      saves.push({
        ...decodeSavedSessionFingerprint(snapshot.bytes),
        storageId: snapshot.storageId,
        name: snapshot.name,
        updatedAt: snapshot.updatedAt,
        bytes: snapshot.bytes,
        retention: snapshot.retention,
      });
    }
    const sessionsWithSnapshots = new Set(snapshots.map((snapshot) => snapshot.sessionId));
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (key === null || !key.startsWith(STORAGE_PREFIX)) continue;
      const bytes = this.storage.getItem(key);
      if (bytes === null) continue;
      const decoded = decodeSavedSessionFingerprint(bytes);
      const metadata = this.#metadata(decoded.sessionId);
      if (sessionsWithSnapshots.has(decoded.sessionId) && metadata?.retention.kind !== 'named') continue;
      saves.push({
        ...decoded,
        storageId: `session:${decoded.sessionId}`,
        name: metadata?.name ?? decoded.sessionId,
        updatedAt: metadata?.updatedAt ?? new Date(0).toISOString(),
        retention: metadata?.retention ?? { kind: 'autosave', pool: 'per_round' },
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
