import { canonicalJson } from '../commands/canonical-json';
import type { ControllerIdentity } from '../combat/controllers';
import type {
  CoordinatorPersistence,
  DurableCoordinatorTransition,
  PersistedCoordinatorState,
} from '../combat/coordinator';
import {
  isEncounterConfig,
  reduceEncounter,
  type EncounterState,
} from '../combat/encounter';
import {
  restoreMulberry32,
  type SerializableRng,
  type SerializableRngState,
} from '../combat/random';
import {
  encounterBranchId,
  type CodexSessionId,
  type EncounterBranchId,
  type EncounterSessionId,
} from '../combat/values';
import { projectEncounter, type VisibleEncounterState } from '../combat/visibility';
import { sha256 } from '../crypto/sha256';
import type { DatabaseContext } from '../db/database';

export const VTT_SESSION_SCHEMA_VERSION = 2 as const;
export const VTT_SESSION_MINIMUM_SCHEMA_VERSION = 1 as const;

export type SessionTransition =
  | { readonly kind: 'session_started' }
  | DurableCoordinatorTransition
  | {
      readonly kind: 'head_moved';
      readonly operation: 'undo' | 'redo';
      readonly sourceRevision: number;
      readonly targetRevision: number;
    };

export const SESSION_TRANSITION_KINDS = [
  'session_started',
  'head_moved',
  'controller_request_issued',
  'controller_response_received',
  'controller_request_cancelled',
  'controller_replaced',
  'reaction_policy_resolved',
  'reducer_applied',
  'controller_response_refused',
  'coordinator_paused',
  'coordinator_resumed',
] as const satisfies readonly SessionTransition['kind'][];

type MissingSessionTransitionKind = Exclude<
  SessionTransition['kind'],
  (typeof SESSION_TRANSITION_KINDS)[number]
>;
const sessionTransitionKindInventoryIsComplete: MissingSessionTransitionKind extends never ? true : never = true;
void sessionTransitionKindInventoryIsComplete;

export class UnknownSessionTransitionKindError extends TypeError {
  override readonly name = 'UnknownSessionTransitionKindError' as const;

  constructor(readonly transitionKind: string) {
    super(`Unknown VTT session transition kind ${transitionKind}.`);
  }
}

export class SessionFingerprintMismatchError extends Error {
  override readonly name = 'SessionFingerprintMismatchError' as const;

  constructor() {
    super('Saved VTT session fingerprint mismatch.');
  }
}

export interface PersistedProjections {
  readonly dm: VisibleEncounterState;
  readonly players: readonly {
    readonly combatantId: string;
    readonly projection: VisibleEncounterState;
  }[];
}

interface SessionRevisionBody {
  readonly schemaVersion: typeof VTT_SESSION_SCHEMA_VERSION;
  readonly sessionId: EncounterSessionId;
  readonly revision: number;
  readonly activeHeadRevision: number;
  readonly parentRevision: number | null;
  readonly branchId: EncounterBranchId;
  readonly transition: SessionTransition;
  readonly encounterState: EncounterState;
  readonly rngState: SerializableRngState;
  readonly coordinatorState: PersistedCoordinatorState;
  readonly controllers: readonly ControllerIdentity[];
  readonly codexSessionId: CodexSessionId;
  readonly projections: PersistedProjections;
}

export interface SessionRevision extends SessionRevisionBody {
  readonly checksum: string;
}

export interface BrowserSessionStore {
  append(revision: SessionRevision): void;
  appendAll(revisions: readonly SessionRevision[]): void;
  revisions(sessionId: EncounterSessionId): readonly SessionRevision[];
}

export interface MirrorSink {
  append(revision: SessionRevision): void;
}

export class MemoryMirrorSink implements MirrorSink {
  readonly #revisions: SessionRevision[] = [];

  append(revision: SessionRevision): void {
    this.#revisions.push(revision);
  }

  revisions(): readonly SessionRevision[] {
    return [...this.#revisions];
  }
}

/**
 * Increment 5's bridge seam. While no bridge is connected, every revision is
 * retained in order. Increment 7 may connect a file-backed sink and drain it;
 * neither mode can read or replace browser authority.
 */
export class DeferredMirrorSink implements MirrorSink {
  readonly #queued: SessionRevision[] = [];
  #connected: MirrorSink | null = null;

  append(revision: SessionRevision): void {
    if (this.#connected === null) {
      this.#queued.push(revision);
      return;
    }
    this.#connected.append(revision);
  }

  connect(sink: MirrorSink): void {
    this.#connected = sink;
    for (const revision of this.#queued.splice(0)) sink.append(revision);
  }

  disconnect(): void {
    this.#connected = null;
  }

  queued(): readonly SessionRevision[] {
    return [...this.#queued];
  }
}

function verifyRevisionSequence(
  revisions: readonly SessionRevision[],
  sessionId: EncounterSessionId,
): void {
  const seen = new Set<number>();
  for (const [index, revision] of revisions.entries()) {
    const expected = index + 1;
    if (revision.sessionId !== sessionId || revision.revision !== expected) {
      throw new Error('Session revision stream is not contiguous.');
    }
    if (
      revision.parentRevision !== null &&
      (!seen.has(revision.parentRevision) || revision.parentRevision >= revision.revision)
    ) {
      throw new Error('Session revision parent is outside the preceding stream.');
    }
    seen.add(revision.revision);
  }
}

export class MemoryBrowserSessionStore implements BrowserSessionStore {
  readonly #bySession = new Map<EncounterSessionId, SessionRevision[]>();

  append(revision: SessionRevision): void {
    const current = this.#bySession.get(revision.sessionId) ?? [];
    if (revision.revision !== current.length + 1) {
      throw new Error('Browser store requires every revision in order.');
    }
    if (
      revision.parentRevision !== null &&
      !current.some((candidate) => candidate.revision === revision.parentRevision)
    ) {
      throw new Error('Browser store cannot append a revision with an unknown parent.');
    }
    current.push(revision);
    this.#bySession.set(revision.sessionId, current);
  }

  appendAll(revisions: readonly SessionRevision[]): void {
    if (revisions.length === 0) return;
    const sessionId = revisions[0]!.sessionId;
    if (this.revisions(sessionId).length !== 0) {
      throw new Error('Browser store import target already exists.');
    }
    verifyRevisionSequence(revisions, sessionId);
    for (const revision of revisions) this.append(revision);
  }

  revisions(sessionId: EncounterSessionId): readonly SessionRevision[] {
    return [...(this.#bySession.get(sessionId) ?? [])];
  }
}

export class SqliteBrowserSessionStore implements BrowserSessionStore {
  constructor(private readonly db: DatabaseContext) {}

  append(revision: SessionRevision): void {
    const payload = canonicalJson(revision);
    this.db.transaction((transaction) => {
      const latest = transaction.scalar<number>(
        `SELECT max(revision)
         FROM vtt_session_revisions
         WHERE session_id = $sessionId`,
        { $sessionId: revision.sessionId },
      );
      const expected = (latest ?? 0) + 1;
      if (revision.revision !== expected) {
        throw new Error('SQLite browser store requires every revision in order.');
      }
      if (revision.parentRevision !== null) {
        const parentCount = transaction.scalar<number>(
          `SELECT count(*)
           FROM vtt_session_revisions
           WHERE session_id = $sessionId AND revision = $revision`,
          {
            $sessionId: revision.sessionId,
            $revision: revision.parentRevision,
          },
        );
        if (parentCount !== 1) {
          throw new Error('SQLite browser store cannot append an unknown parent.');
        }
      }
      transaction.exec(
        `INSERT INTO vtt_session_revisions (
           session_id, revision, schema_version, payload_json, payload_checksum
         ) VALUES (
           $sessionId, $revision, $schemaVersion, $payload, $checksum
         )`,
        {
          $sessionId: revision.sessionId,
          $revision: revision.revision,
          $schemaVersion: revision.schemaVersion,
          $payload: payload,
          $checksum: revision.checksum,
        },
      );
    });
  }

  appendAll(revisions: readonly SessionRevision[]): void {
    this.db.transaction(() => {
      for (const revision of revisions) this.append(revision);
    });
  }

  revisions(sessionId: EncounterSessionId): readonly SessionRevision[] {
    return this.db.allRaw(
      `SELECT schema_version, payload_json, payload_checksum
       FROM vtt_session_revisions
       WHERE session_id = $sessionId
       ORDER BY revision`,
      { $sessionId: sessionId },
    ).map((row) => {
      if (typeof row.payload_json !== 'string') {
        throw new TypeError('Stored VTT session payload is not text.');
      }
      const revision = decodeRevision(JSON.parse(row.payload_json));
      if (
        row.schema_version !== revision.schemaVersion ||
        row.payload_checksum !== revision.checksum
      ) {
        throw new Error('Stored VTT session row metadata disagrees with its payload.');
      }
      return revision;
    });
  }
}

export function projectPersistedProjections(state: EncounterState): PersistedProjections {
  return {
    dm: projectEncounter(state, { kind: 'dm' }),
    players: state.combatants
      .filter((subject) => subject.profile.kind === 'player_character')
      .map((subject) => ({
        combatantId: subject.profile.id,
        projection: projectEncounter(state, {
          kind: 'player',
          combatantId: subject.profile.id,
        }),
      })),
  };
}

function revisionChecksum(body: SessionRevisionBody): string {
  return sha256(canonicalJson(body));
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactlyKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).length === expected.size && Object.keys(value).every((key) => expected.has(key));
}

function validPause(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;
  return value.kind === 'interrupted'
    ? hasExactlyKeys(value, ['kind'])
    : value.kind === 'adjudicated' && hasExactlyKeys(value, ['kind', 'eventSequence']) && Number.isSafeInteger(value.eventSequence);
}

function decodeTransition(value: unknown): SessionTransition {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    throw new TypeError('Malformed VTT session transition.');
  }
  if (!SESSION_TRANSITION_KINDS.includes(value.kind as SessionTransition['kind'])) {
    throw new UnknownSessionTransitionKindError(value.kind);
  }
  switch (value.kind as SessionTransition['kind']) {
    case 'session_started':
      if (hasExactlyKeys(value, ['kind'])) return { kind: 'session_started' };
      break;
    case 'head_moved':
      if (
        hasExactlyKeys(value, ['kind', 'operation', 'sourceRevision', 'targetRevision']) &&
        (value.operation === 'undo' || value.operation === 'redo') &&
        Number.isSafeInteger(value.sourceRevision) && Number.isSafeInteger(value.targetRevision)
      ) return value as unknown as Extract<SessionTransition, { readonly kind: 'head_moved' }>;
      break;
    case 'controller_request_issued':
      if (hasExactlyKeys(value, ['kind', 'request']) && isRecord(value.request)) return value as unknown as SessionTransition;
      break;
    case 'controller_response_received':
      if (hasExactlyKeys(value, ['kind', 'decision']) && isRecord(value.decision)) return value as unknown as SessionTransition;
      break;
    case 'controller_request_cancelled':
      if (hasExactlyKeys(value, ['kind', 'request']) && isRecord(value.request)) return value as unknown as SessionTransition;
      break;
    case 'controller_replaced':
      if (hasExactlyKeys(value, ['kind', 'combatantId']) && typeof value.combatantId === 'string') return value as unknown as SessionTransition;
      break;
    case 'reaction_policy_resolved':
      if (hasExactlyKeys(value, ['kind', 'actor', 'decision', 'command']) && typeof value.actor === 'string' && (value.decision === 'use' || value.decision === 'decline') && isRecord(value.command)) return value as unknown as SessionTransition;
      break;
    case 'reducer_applied':
      if (hasExactlyKeys(value, ['kind', 'command', 'events']) && isRecord(value.command) && Array.isArray(value.events)) return value as unknown as SessionTransition;
      break;
    case 'controller_response_refused':
      if (hasExactlyKeys(value, ['kind', 'command', 'reason']) && isRecord(value.command) && typeof value.reason === 'string') return value as unknown as SessionTransition;
      break;
    case 'coordinator_paused':
    case 'coordinator_resumed':
      if (hasExactlyKeys(value, ['kind', 'pause']) && validPause(value.pause)) return value as unknown as SessionTransition;
      break;
  }
  throw new TypeError(`Malformed VTT session transition ${value.kind}.`);
}

function decodeRevision(value: unknown): SessionRevision {
  if (
    !isRecord(value) ||
    value.schemaVersion !== VTT_SESSION_SCHEMA_VERSION ||
    typeof value.sessionId !== 'string' ||
    !Number.isSafeInteger(value.revision) ||
    !Number.isSafeInteger(value.activeHeadRevision) ||
    value.activeHeadRevision !== value.revision ||
    (
      value.parentRevision !== null &&
      !Number.isSafeInteger(value.parentRevision)
    ) ||
    typeof value.branchId !== 'string' ||
    !isRecord(value.transition) ||
    !isRecord(value.encounterState) ||
    !isEncounterConfig(value.encounterState.config) ||
    !isRecord(value.rngState) ||
    !isRecord(value.coordinatorState) ||
    !Array.isArray(value.controllers) ||
    typeof value.codexSessionId !== 'string' ||
    !isRecord(value.projections) ||
    typeof value.checksum !== 'string'
  ) {
    throw new TypeError('Malformed VTT session revision.');
  }
  const transition = decodeTransition(value.transition);
  const revision = { ...value, transition } as unknown as SessionRevision;
  const { checksum: _checksum, ...body } = revision;
  if (revisionChecksum(body) !== revision.checksum) {
    throw new Error('VTT session revision checksum mismatch.');
  }
  return revision;
}

export function deriveBranchRng(
  target: SessionRevision,
  branchId: EncounterBranchId,
): SerializableRng {
  const {
    config: _config,
    persistentAreas,
    nextPersistentAreaSequence,
    worldObjects,
    nextWorldObjectSequence,
    environment,
    combatants,
    ...stateWithoutCombatants
  } = target.encounterState;
  const normalizedCombatants = combatants.map((entry) => {
    const senses = entry.profile.rules.senses;
    if (senses.length !== 1 || senses[0]?.kind !== 'normal_sight') return entry;
    const { senses: _defaultNormalSight, ...rules } = entry.profile.rules;
    return { ...entry, profile: { ...entry.profile, rules } };
  });
  const baseMechanicalState = { ...stateWithoutCombatants, combatants: normalizedCombatants };
  // Empty additive state is mechanically neutral and does not perturb branch
  // streams; once an area exists, both its state and allocator are authoritative.
  const areaNeutralState = persistentAreas.length === 0 && nextPersistentAreaSequence === 1
    ? baseMechanicalState
    : { ...baseMechanicalState, persistentAreas, nextPersistentAreaSequence };
  const worldStateIsNeutral = worldObjects.length === 0 && nextWorldObjectSequence === 1 &&
    environment.lightRegions.length === 0 && environment.difficultTerrainRegions.length === 0;
  const mechanicalState = worldStateIsNeutral
    ? areaNeutralState
    : { ...areaNeutralState, worldObjects, nextWorldObjectSequence, environment };
  const digest = sha256(canonicalJson({
    encounterState: mechanicalState,
    parentRngState: target.rngState,
    branchId,
  }));
  const seed = Number.parseInt(digest.slice(0, 8), 16) >>> 0;
  return restoreMulberry32({
    algorithm: 'mulberry32-v1',
    initialSeed: seed,
    state: seed,
    draws: 0,
    streamId: `branch:${branchId}:${digest}`,
  });
}

function requireCanonicalEqual(
  actual: unknown,
  expected: unknown,
  label: string,
): void {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new Error(`Session replay disagrees with persisted ${label}.`);
  }
}

/**
 * Rebuilds and verifies every revision against its declared parent. The full
 * state held on a revision is a checked recovery cache: reducer transitions
 * must reproduce it from parent state + parent RNG, while coordinator-only
 * transitions must leave both unchanged.
 */
export function replaySessionRevisions(
  revisions: readonly SessionRevision[],
): SessionRevision {
  const first = revisions[0];
  if (first === undefined || decodeTransition(first.transition).kind !== 'session_started') {
    throw new Error('Session stream must begin with session_started.');
  }
  verifyRevisionSequence(revisions, first.sessionId);
  const byRevision = new Map<number, SessionRevision>();
  for (const revision of revisions) {
    const transition = decodeTransition(revision.transition);
    const parent = revision.parentRevision === null
      ? null
      : byRevision.get(revision.parentRevision);
    if (revision.parentRevision !== null && parent === undefined) {
      throw new Error('Session replay cannot find a declared parent.');
    }
    switch (transition.kind) {
      case 'session_started':
        if (revision.revision !== 1 || parent !== null) {
          throw new Error('session_started may only be the first revision.');
        }
        break;
      case 'head_moved': {
        if (parent === null || parent === undefined) {
          throw new Error('A head move requires a target parent.');
        }
        requireCanonicalEqual(
          revision.encounterState,
          parent.encounterState,
          'head-move encounter state',
        );
        requireCanonicalEqual(
          revision.coordinatorState,
          parent.coordinatorState,
          'head-move coordinator state',
        );
        const expected = deriveBranchRng(parent, revision.branchId).snapshot();
        requireCanonicalEqual(revision.rngState, expected, 'head-move RNG state');
        break;
      }
      case 'reducer_applied': {
        if (parent === null || parent === undefined) {
          throw new Error('A reducer revision requires a parent.');
        }
        const replayRng = restoreMulberry32(parent.rngState);
        const replayed = reduceEncounter(
          parent.encounterState,
          transition.command,
          replayRng,
        );
        requireCanonicalEqual(
          revision.encounterState,
          replayed.state,
          'reducer state',
        );
        requireCanonicalEqual(
          transition.events,
          replayed.events,
          'reducer events',
        );
        requireCanonicalEqual(revision.rngState, replayRng.snapshot(), 'reducer RNG state');
        break;
      }
      case 'controller_request_issued':
      case 'controller_response_received':
      case 'controller_request_cancelled':
      case 'controller_replaced':
      case 'reaction_policy_resolved':
      case 'controller_response_refused':
      case 'coordinator_paused':
      case 'coordinator_resumed':
        if (parent === null || parent === undefined) {
          throw new Error('A coordinator revision requires a parent.');
        }
        requireCanonicalEqual(
          revision.encounterState,
          parent.encounterState,
          'coordinator encounter state',
        );
        requireCanonicalEqual(
          revision.rngState,
          parent.rngState,
          'coordinator RNG state',
        );
        break;
    }
    requireCanonicalEqual(
      revision.projections,
      projectPersistedProjections(revision.encounterState),
      'projections',
    );
    byRevision.set(revision.revision, revision);
  }
  return revisions.at(-1) ?? first;
}

export interface SessionResume {
  readonly journal: EncounterSessionJournal;
  readonly encounterState: EncounterState;
  readonly coordinatorState: PersistedCoordinatorState;
  readonly controllers: readonly ControllerIdentity[];
  readonly codexSessionId: CodexSessionId;
  readonly rng: SerializableRng;
}

export class EncounterSessionJournal implements CoordinatorPersistence {
  #rng: SerializableRng;

  private constructor(
    readonly sessionId: EncounterSessionId,
    private readonly store: BrowserSessionStore,
    private readonly mirror: MirrorSink,
    rng: SerializableRng,
  ) {
    this.#rng = rng;
  }

  static create(input: {
    readonly sessionId: EncounterSessionId;
    readonly branchId: EncounterBranchId;
    readonly encounterState: EncounterState;
    readonly coordinatorState: PersistedCoordinatorState;
    readonly controllers: readonly ControllerIdentity[];
    readonly codexSessionId: CodexSessionId;
    readonly rng: SerializableRng;
    readonly store: BrowserSessionStore;
    readonly mirror: MirrorSink;
  }): EncounterSessionJournal {
    if (input.store.revisions(input.sessionId).length !== 0) {
      throw new Error('Encounter session already exists.');
    }
    const journal = new EncounterSessionJournal(
      input.sessionId,
      input.store,
      input.mirror,
      input.rng,
    );
    journal.#append({
      parentRevision: null,
      branchId: input.branchId,
      transition: { kind: 'session_started' },
      encounterState: input.encounterState,
      coordinatorState: input.coordinatorState,
      controllers: input.controllers,
      codexSessionId: input.codexSessionId,
    });
    return journal;
  }

  static resume(
    sessionId: EncounterSessionId,
    store: BrowserSessionStore,
    mirror: MirrorSink,
  ): SessionResume {
    const revisions = store.revisions(sessionId);
    const latest = replaySessionRevisions(revisions);
    const rng = restoreMulberry32(latest.rngState);
    return {
      journal: new EncounterSessionJournal(sessionId, store, mirror, rng),
      encounterState: latest.encounterState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      codexSessionId: latest.codexSessionId,
      rng,
    };
  }

  rng(): SerializableRng {
    return this.#rng;
  }

  codexSessionId(): CodexSessionId {
    return this.#latest().codexSessionId;
  }

  record(input: {
    readonly transition: DurableCoordinatorTransition;
    readonly encounterState: EncounterState;
    readonly coordinatorState: PersistedCoordinatorState;
    readonly controllers: readonly ControllerIdentity[];
  }): void {
    const latest = this.#latest();
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: input.transition,
      encounterState: input.encounterState,
      coordinatorState: input.coordinatorState,
      controllers: input.controllers,
      codexSessionId: latest.codexSessionId,
    });
  }

  moveHead(
    operation: 'undo' | 'redo',
    targetRevision: number,
    requestedBranchId: EncounterBranchId,
  ): SessionResume {
    const revisions = this.store.revisions(this.sessionId);
    const source = revisions.at(-1);
    const target = revisions.find((revision) => revision.revision === targetRevision);
    if (source === undefined || target === undefined) {
      throw new Error('Head move target does not exist.');
    }
    this.#rng = deriveBranchRng(target, requestedBranchId);
    const appended = this.#append({
      parentRevision: target.revision,
      branchId: requestedBranchId,
      transition: {
        kind: 'head_moved',
        operation,
        sourceRevision: source.revision,
        targetRevision,
      },
      encounterState: target.encounterState,
      coordinatorState: target.coordinatorState,
      controllers: target.controllers,
      codexSessionId: target.codexSessionId,
    });
    return {
      journal: this,
      encounterState: appended.encounterState,
      coordinatorState: appended.coordinatorState,
      controllers: appended.controllers,
      codexSessionId: appended.codexSessionId,
      rng: this.#rng,
    };
  }

  history(): readonly SessionHistoryEntry[] {
    return sessionHistory(this.store.revisions(this.sessionId));
  }

  #latest(): SessionRevision {
    const latest = this.store.revisions(this.sessionId).at(-1);
    if (latest === undefined) throw new Error('Encounter session has no revisions.');
    return latest;
  }

  #append(input: {
    readonly parentRevision: number | null;
    readonly branchId: EncounterBranchId;
    readonly transition: SessionTransition;
    readonly encounterState: EncounterState;
    readonly coordinatorState: PersistedCoordinatorState;
    readonly controllers: readonly ControllerIdentity[];
    readonly codexSessionId: CodexSessionId;
  }): SessionRevision {
    const revision = this.store.revisions(this.sessionId).length + 1;
    const body: SessionRevisionBody = {
      schemaVersion: VTT_SESSION_SCHEMA_VERSION,
      sessionId: this.sessionId,
      revision,
      activeHeadRevision: revision,
      parentRevision: input.parentRevision,
      branchId: input.branchId,
      transition: input.transition,
      encounterState: input.encounterState,
      rngState: this.#rng.snapshot(),
      coordinatorState: input.coordinatorState,
      controllers: input.controllers,
      codexSessionId: input.codexSessionId,
      projections: projectPersistedProjections(input.encounterState),
    };
    const persisted: SessionRevision = {
      ...body,
      checksum: revisionChecksum(body),
    };
    this.store.append(persisted);
    this.mirror.append(persisted);
    return persisted;
  }
}

export interface SessionHistoryEntry {
  readonly revision: number;
  readonly parentRevision: number | null;
  readonly branchId: EncounterBranchId;
  readonly transition: SessionTransition;
  readonly void: boolean;
}

export function sessionHistory(
  revisions: readonly SessionRevision[],
): readonly SessionHistoryEntry[] {
  const byRevision = new Map(
    revisions.map((revision) => [revision.revision, revision] as const),
  );
  const active = new Set<number>();
  let cursor = revisions.at(-1)?.revision ?? null;
  while (cursor !== null) {
    if (active.has(cursor)) throw new Error('Session revision ancestry is cyclic.');
    active.add(cursor);
    const revision = byRevision.get(cursor);
    if (revision === undefined) throw new Error('Session ancestry is incomplete.');
    cursor = revision.parentRevision;
  }
  return revisions.map((revision) => ({
    revision: revision.revision,
    parentRevision: revision.parentRevision,
    branchId: revision.branchId,
    transition: revision.transition,
    void: !active.has(revision.revision),
  }));
}

interface SavedSessionBundleV1 {
  readonly schemaVersion: 1;
  readonly sessionId: EncounterSessionId;
  readonly revisions: readonly SessionRevision[];
}

interface SavedSessionBundleV2Body {
  readonly format: 'vtt-session-revisions';
  readonly schemaVersion: typeof VTT_SESSION_SCHEMA_VERSION;
  readonly sessionId: EncounterSessionId;
  readonly revisions: readonly SessionRevision[];
}

interface SavedSessionBundleV2 extends SavedSessionBundleV2Body {
  readonly fingerprint: string;
}

function sessionFingerprint(body: SavedSessionBundleV2Body): string {
  return sha256(canonicalJson(body));
}

export interface VttSessionMigration {
  readonly id: string;
  readonly from: number;
  readonly to: number;
  readonly source: string;
  readonly checksum: string;
  migrate(bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>>;
}

const V1_TO_V2_SOURCE = 'vtt-session-v1-to-v2:add-format-and-sha-fingerprint=vtt-session-revisions';

export const VTT_SESSION_MIGRATIONS: readonly VttSessionMigration[] =
  Object.freeze([
    Object.freeze({
      id: 'vtt_session_v1_to_v2',
      from: 1,
      to: 2,
      source: V1_TO_V2_SOURCE,
      checksum: '92795e05ddf2acdcd70e3540548adc7359a570517e51f1079738b4074500b111',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        const body = {
          ...bundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 2 as const,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
  ]);

export function validateVttSessionMigrationRegistry(): void {
  let expected: number = VTT_SESSION_MINIMUM_SCHEMA_VERSION;
  const ids = new Set<string>();
  for (const migration of VTT_SESSION_MIGRATIONS) {
    if (
      ids.has(migration.id) ||
      migration.from !== expected ||
      migration.to !== expected + 1 ||
      sha256(migration.source) !== migration.checksum
    ) {
      throw new Error('VTT session migration registry is invalid.');
    }
    ids.add(migration.id);
    expected = migration.to;
  }
  if (expected !== VTT_SESSION_SCHEMA_VERSION) {
    throw new Error('VTT session migration registry does not reach current schema.');
  }
}

function migrateSavedBundle(value: unknown): SavedSessionBundleV2 {
  validateVttSessionMigrationRegistry();
  if (!isRecord(value) || !Number.isSafeInteger(value.schemaVersion)) {
    throw new TypeError('Saved VTT session has no valid schema version.');
  }
  let migrated: Readonly<Record<string, unknown>> = value;
  let version: number = value.schemaVersion as number;
  if (
    version < VTT_SESSION_MINIMUM_SCHEMA_VERSION ||
    version > VTT_SESSION_SCHEMA_VERSION
  ) {
    throw new Error('Saved VTT session is outside the migration window.');
  }
  while (version < VTT_SESSION_SCHEMA_VERSION) {
    const migration = VTT_SESSION_MIGRATIONS.find(
      (candidate) => candidate.from === version,
    );
    if (migration === undefined) {
      throw new Error('Saved VTT session has no adjacent migration.');
    }
    migrated = migration.migrate(migrated);
    version = migration.to;
  }
  if (
    migrated.format !== 'vtt-session-revisions' ||
    migrated.schemaVersion !== VTT_SESSION_SCHEMA_VERSION ||
    typeof migrated.sessionId !== 'string' ||
    !Array.isArray(migrated.revisions) ||
    typeof migrated.fingerprint !== 'string'
  ) {
    throw new TypeError('Saved VTT session bundle is malformed.');
  }
  const body: SavedSessionBundleV2Body = {
    format: 'vtt-session-revisions',
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId: migrated.sessionId as EncounterSessionId,
    revisions: migrated.revisions.map(decodeRevision),
  };
  if (sessionFingerprint(body) !== migrated.fingerprint) {
    throw new SessionFingerprintMismatchError();
  }
  return { ...body, fingerprint: migrated.fingerprint };
}

export function exportSavedSession(
  store: BrowserSessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId);
  if (revisions.length === 0) throw new Error('Encounter session does not exist.');
  replaySessionRevisions(revisions);
  const body: SavedSessionBundleV2Body = {
    format: 'vtt-session-revisions',
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId,
    revisions,
  };
  return canonicalJson({ ...body, fingerprint: sessionFingerprint(body) } satisfies SavedSessionBundleV2);
}

export function importSavedSession(
  store: BrowserSessionStore,
  bytes: string,
): EncounterSessionId {
  const bundle = migrateSavedBundle(JSON.parse(bytes));
  if (store.revisions(bundle.sessionId).length !== 0) {
    throw new Error('Imported encounter session already exists.');
  }
  verifyRevisionSequence(bundle.revisions, bundle.sessionId);
  store.appendAll(bundle.revisions);
  return bundle.sessionId;
}

export function exportSavedSessionV1ForMigrationTest(
  store: BrowserSessionStore,
  sessionId: EncounterSessionId,
): string {
  const bundle: SavedSessionBundleV1 = {
    schemaVersion: 1,
    sessionId,
    revisions: store.revisions(sessionId),
  };
  return canonicalJson(bundle);
}

export function nextBranchId(value: string): EncounterBranchId {
  return encounterBranchId(value);
}
