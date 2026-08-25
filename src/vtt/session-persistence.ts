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
  type ReactionKind,
  type ReactionPolicy,
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
import { sha256 } from '../crypto/sha256';
import type { DatabaseContext } from '../db/database';
import { decodeWildShapeOverlay, decodeWildShapeUseState } from '../combat/wild-shape';
import {
  capturePartySessionState,
  decodePartySessionState,
  enterNextRoom,
  interruptLongRest,
  LONG_REST_CITATIONS,
  restInterruptionRuling,
  setPartyReactionPolicy,
  takeLongRest,
  takeShortRest,
  type LongRestResult,
  type LongRestBenefit,
  type LongRestSummaryCard,
  type PartySessionState,
  type RestInterruptionOutcome,
  type RestInterruptionResult,
  type RestInterruptionRulingCard,
  type ShortRestHitDieRoll,
  type ShortRestHitDieSpend,
  type ShortRestResult,
} from './party-session-state';

export const VTT_SESSION_SCHEMA_VERSION = 5 as const;
export const VTT_SESSION_MINIMUM_SCHEMA_VERSION = 1 as const;

export type SessionTransition =
  | { readonly kind: 'session_started' }
  | DurableCoordinatorTransition
  | {
      readonly kind: 'party_state_captured';
      readonly room: number;
      readonly restInterruption?: {
        readonly outcome: RestInterruptionOutcome;
        readonly ruling: RestInterruptionRulingCard;
      };
    }
  | {
      readonly kind: 'reaction_preference_changed';
      readonly combatant: import('../combat/values').CombatantId;
      readonly reactionKind: ReactionKind;
      readonly policy: ReactionPolicy;
    }
  | {
      readonly kind: 'short_rest_completed';
      readonly room: number;
      readonly spends: readonly ShortRestHitDieSpend[];
      readonly rolls: readonly ShortRestHitDieRoll[];
    }
  | {
      readonly kind: 'long_rest_completed';
      readonly room: number;
      readonly summary: LongRestSummaryCard;
    }
  | { readonly kind: 'room_composed'; readonly room: number }
  | {
      readonly kind: 'head_moved';
      readonly operation: 'undo' | 'redo';
      readonly sourceRevision: number;
      readonly targetRevision: number;
    };

export const SESSION_TRANSITION_KINDS = [
  'session_started',
  'party_state_captured',
  'reaction_preference_changed',
  'short_rest_completed',
  'long_rest_completed',
  'room_composed',
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

interface SessionRevisionBody {
  readonly schemaVersion: typeof VTT_SESSION_SCHEMA_VERSION;
  readonly sessionId: EncounterSessionId;
  readonly revision: number;
  readonly activeHeadRevision: number;
  readonly parentRevision: number | null;
  readonly branchId: EncounterBranchId;
  readonly transition: SessionTransition;
  readonly encounterState: EncounterState;
  /** Digest of the persisted, mechanically relevant encounter representation. */
  readonly branchRngStateFingerprint: string;
  readonly partyState: PartySessionState | null;
  readonly rngState: SerializableRngState;
  readonly coordinatorState: PersistedCoordinatorState;
  readonly controllers: readonly ControllerIdentity[];
  readonly codexSessionId: CodexSessionId;
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

function validRoom(value: unknown): boolean {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function decodeRestInterruptionOutcome(value: unknown): RestInterruptionOutcome | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if ((value.kind === 'no_benefit' || value.kind === 'resumed') && hasExactlyKeys(value, ['kind'])) {
    return { kind: value.kind };
  }
  if (
    value.kind === 'partial_per_dm' &&
    hasExactlyKeys(value, ['kind', 'benefits']) &&
    Array.isArray(value.benefits) &&
    value.benefits.every((benefit) => typeof benefit === 'string' && [
      'hit_points', 'hit_dice', 'spell_slots', 'exhaustion', 'limited_resources',
    ].includes(benefit)) &&
    new Set(value.benefits).size === value.benefits.length
  ) {
    return { kind: 'partial_per_dm', benefits: value.benefits as readonly LongRestBenefit[] };
  }
  return null;
}

function validShortRestSpends(value: unknown): value is readonly ShortRestHitDieSpend[] {
  return Array.isArray(value) && value.every((spend) =>
    isRecord(spend) && hasExactlyKeys(spend, ['combatantId', 'dice']) &&
    typeof spend.combatantId === 'string' && Array.isArray(spend.dice) &&
    spend.dice.every((die) =>
      isRecord(die) && hasExactlyKeys(die, ['sides', 'count']) &&
      (die.sides === 6 || die.sides === 8 || die.sides === 10 || die.sides === 12) &&
      Number.isSafeInteger(die.count) && typeof die.count === 'number' && die.count >= 0));
}

function validShortRestRolls(value: unknown): value is readonly ShortRestHitDieRoll[] {
  return Array.isArray(value) && value.every((roll) =>
    isRecord(roll) && hasExactlyKeys(
      roll,
      ['combatantId', 'sides', 'face', 'constitutionModifier', 'healing'],
    ) &&
    typeof roll.combatantId === 'string' &&
    (roll.sides === 6 || roll.sides === 8 || roll.sides === 10 || roll.sides === 12) &&
    Number.isSafeInteger(roll.face) && typeof roll.face === 'number' && roll.face >= 1 && roll.face <= roll.sides &&
    Number.isSafeInteger(roll.constitutionModifier) && typeof roll.constitutionModifier === 'number' &&
    Number.isSafeInteger(roll.healing) && typeof roll.healing === 'number' && roll.healing >= 1);
}

function validLongRestSummary(value: unknown): value is LongRestSummaryCard {
  if (!isRecord(value) || !hasExactlyKeys(value, ['kind', 'durationHours', 'characters', 'citations']) ||
    value.kind !== 'long_rest_summary' || value.durationHours !== 8 || !Array.isArray(value.characters) ||
    !isRecord(value.citations) || canonicalJson(value.citations) !== canonicalJson(LONG_REST_CITATIONS)) {
    return false;
  }
  return value.characters.every((character) => {
    if (!isRecord(character) || !hasExactlyKeys(character, [
      'combatantId', 'hitPointsRestored', 'hitDiceRestored', 'spellSlotsRestored',
      'exhaustionLevelsRemoved', 'limitedResourcesRestored', 'lifeBefore', 'lifeAfter',
    ]) || typeof character.combatantId !== 'string' ||
      !Number.isSafeInteger(character.hitPointsRestored) ||
      typeof character.hitPointsRestored !== 'number' || character.hitPointsRestored < 0 ||
      (character.exhaustionLevelsRemoved !== 0 && character.exhaustionLevelsRemoved !== 1) ||
      !['living', 'dying', 'stable', 'dead'].includes(String(character.lifeBefore)) ||
      !['living', 'dying', 'stable', 'dead'].includes(String(character.lifeAfter)) ||
      !Array.isArray(character.hitDiceRestored) || !Array.isArray(character.spellSlotsRestored) ||
      !Array.isArray(character.limitedResourcesRestored)) return false;
    const hitDiceValid = character.hitDiceRestored.every((die) =>
      isRecord(die) && hasExactlyKeys(die, ['sides', 'count']) &&
      (die.sides === 6 || die.sides === 8 || die.sides === 10 || die.sides === 12) &&
      Number.isSafeInteger(die.count) && typeof die.count === 'number' && die.count > 0);
    const spellSlotsValid = character.spellSlotsRestored.every((slot) =>
      isRecord(slot) && hasExactlyKeys(slot, ['pool', 'level', 'count']) &&
      (slot.pool === 'shared' || slot.pool === 'pact_magic') &&
      Number.isSafeInteger(slot.level) && typeof slot.level === 'number' && slot.level >= 1 && slot.level <= 9 &&
      Number.isSafeInteger(slot.count) && typeof slot.count === 'number' && slot.count > 0);
    const resourcesValid = character.limitedResourcesRestored.every((resource) =>
      isRecord(resource) && hasExactlyKeys(resource, ['id', 'count']) &&
      typeof resource.id === 'string' &&
      Number.isSafeInteger(resource.count) && typeof resource.count === 'number' && resource.count > 0);
    return hitDiceValid && spellSlotsValid && resourcesValid;
  });
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
    case 'party_state_captured':
    case 'room_composed':
      if (hasExactlyKeys(value, ['kind', 'room']) && validRoom(value.room)) {
        return value as unknown as SessionTransition;
      }
      if (
        value.kind === 'party_state_captured' &&
        hasExactlyKeys(value, ['kind', 'room', 'restInterruption']) &&
        validRoom(value.room) &&
        isRecord(value.restInterruption) &&
        hasExactlyKeys(value.restInterruption, ['outcome', 'ruling'])
      ) {
        const outcome = decodeRestInterruptionOutcome(value.restInterruption.outcome);
        if (outcome !== null && canonicalJson(value.restInterruption.ruling) === canonicalJson(restInterruptionRuling(outcome))) {
          return {
            kind: 'party_state_captured',
            room: value.room as PartySessionState['room'],
            restInterruption: { outcome, ruling: restInterruptionRuling(outcome) },
          };
        }
      }
      break;
    case 'reaction_preference_changed':
      if (
        hasExactlyKeys(value, ['kind', 'combatant', 'reactionKind', 'policy']) &&
        typeof value.combatant === 'string' &&
        ['hit_by_attack', 'damaged_by_creature', 'taking_damage_of_type', 'creature_casts_spell', 'opportunity_attack'].includes(String(value.reactionKind)) &&
        (value.policy === 'ask' || value.policy === 'always' || value.policy === 'never')
      ) return value as unknown as SessionTransition;
      break;
    case 'short_rest_completed':
      if (
        hasExactlyKeys(value, ['kind', 'room', 'spends', 'rolls']) &&
        validRoom(value.room) &&
        validShortRestSpends(value.spends) &&
        validShortRestRolls(value.rolls)
      ) return value as unknown as SessionTransition;
      break;
    case 'long_rest_completed':
      if (
        hasExactlyKeys(value, ['kind', 'room', 'summary']) &&
        validRoom(value.room) &&
        validLongRestSummary(value.summary)
      ) return value as unknown as SessionTransition;
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
    typeof value.branchRngStateFingerprint !== 'string' ||
    !(value.partyState === null || isRecord(value.partyState)) ||
    !isRecord(value.rngState) ||
    !isRecord(value.coordinatorState) ||
    !Array.isArray(value.controllers) ||
    typeof value.codexSessionId !== 'string' ||
    typeof value.checksum !== 'string'
  ) {
    throw new TypeError('Malformed VTT session revision.');
  }
  const transition = decodeTransition(value.transition);
  const partyState = value.partyState === null
    ? null
    : decodePartySessionState(value.partyState);
  if (!Array.isArray(value.encounterState.combatants)) {
    throw new TypeError('Persisted encounter combatants are malformed.');
  }
  const encounterCombatants = value.encounterState.combatants.map((combatant) => {
    if (!isRecord(combatant)) throw new TypeError('Persisted encounter combatant is malformed.');
    if (!Object.hasOwn(combatant, 'wildShapeUses')) {
      throw new TypeError('Persisted encounter combatant lacks Wild Shape use state.');
    }
    if (!Object.hasOwn(combatant, 'deathAt')) {
      throw new TypeError('Persisted encounter combatant lacks a typed time of death.');
    }
    if (combatant.deathAt !== null && (
      !isRecord(combatant.deathAt) ||
      !hasExactlyKeys(combatant.deathAt, ['round', 'initiativeIndex']) ||
      !Number.isSafeInteger(combatant.deathAt.round) ||
      !Number.isSafeInteger(combatant.deathAt.initiativeIndex) ||
      (combatant.deathAt.round as number) < 0 ||
      (combatant.deathAt.initiativeIndex as number) < 0
    )) {
      throw new TypeError('Persisted encounter combatant time of death is malformed.');
    }
    const wildShapeUses = combatant.wildShapeUses === null
      ? null
      : decodeWildShapeUseState(combatant.wildShapeUses);
    return Object.hasOwn(combatant, 'wildShape')
      ? { ...combatant, wildShapeUses, wildShape: decodeWildShapeOverlay(combatant.wildShape) }
      : { ...combatant, wildShapeUses };
  });
  const encounterState = {
    ...value.encounterState,
    combatants: encounterCombatants,
  } as unknown as EncounterState;
  if (
    branchRngStateFingerprint(value.encounterState as unknown as EncounterState) !==
    value.branchRngStateFingerprint
  ) {
    throw new Error('Persisted VTT branch RNG state fingerprint mismatch.');
  }
  const revision = { ...value, transition, encounterState, partyState } as unknown as SessionRevision;
  const { checksum: _checksum, ...body } = revision;
  if (revisionChecksum(body) !== revision.checksum) {
    throw new Error('VTT session revision checksum mismatch.');
  }
  return revision;
}

function mechanicalBranchState(encounterState: EncounterState): unknown {
  const {
    config: _config,
    hideDeathSaveRolls: _hideDeathSaveRolls,
    persistentAreas,
    nextPersistentAreaSequence,
    worldObjects,
    nextWorldObjectSequence,
    environment,
    combatants,
    rulesEdition,
    nextDecisionSequence,
    hiddenCombatants,
    pendingDecisions,
    reactionPolicies,
    ...stateWithoutCombatants
  } = encounterState;
  // Player-facing roll visibility cannot change the deterministic mechanical
  // future of an otherwise identical branch.
  const normalizedCombatants = combatants.map((entry) => {
    const senses = entry.profile.rules.senses;
    const rulesAreDetectionNeutral = senses.length === 1 && senses[0]?.kind === 'normal_sight' &&
      entry.profile.rules.passivePerception === 10 && entry.profile.rules.detectionTraits.length === 0 &&
      entry.profile.rules.contactMedium === 'surface';
    if (!rulesAreDetectionNeutral) return entry;
    const {
      senses: _defaultNormalSight,
      passivePerception: _defaultPassivePerception,
      detectionTraits: _defaultDetectionTraits,
      contactMedium: _defaultContactMedium,
      ...rules
    } = entry.profile.rules;
    return { ...entry, profile: { ...entry.profile, rules } };
  });
  const defaultDetectionState = rulesEdition === '2024' && nextDecisionSequence === 1 &&
    hiddenCombatants.length === 0 && pendingDecisions.length === 0 && reactionPolicies.length === 0;
  const baseMechanicalState = defaultDetectionState
    ? { ...stateWithoutCombatants, combatants: normalizedCombatants }
    : {
        ...stateWithoutCombatants, combatants: normalizedCombatants, rulesEdition,
        nextDecisionSequence, hiddenCombatants, pendingDecisions, reactionPolicies,
      };
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
  return mechanicalState;
}

function branchRngStateFingerprint(encounterState: EncounterState): string {
  return sha256(canonicalJson(mechanicalBranchState(encounterState)));
}

export function deriveBranchRng(
  target: SessionRevision,
  branchId: EncounterBranchId,
): SerializableRng {
  const digest = sha256(canonicalJson({
    persistedEncounterStateFingerprint: target.branchRngStateFingerprint,
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

function requireEncounterMatchesParty(
  encounter: EncounterState,
  party: PartySessionState,
): void {
  const playerCharacters = encounter.combatants.filter(
    (subject) => subject.profile.kind === 'player_character',
  );
  if (playerCharacters.length !== party.characters.length) {
    throw new Error('Composed room does not contain the persisted party.');
  }
  for (const persisted of party.characters) {
    const subject = playerCharacters.find((candidate) => candidate.profile.id === persisted.combatantId);
    if (subject === undefined) throw new Error('Composed room omitted a persisted party character.');
    requireCanonicalEqual(subject.hitPoints, persisted.currentHitPoints, 'preloaded party Hit Points');
    requireCanonicalEqual(subject.life, persisted.life, 'preloaded party life state');
    requireCanonicalEqual(subject.deathSaves, persisted.deathSaves, 'preloaded party death state');
    requireCanonicalEqual(
      subject.spellSlots.map((slot) => ({
        level: slot.level,
        maximum: slot.maximum,
        remaining: slot.remaining,
        recharge: slot.recharge ?? 'long_rest',
      })),
      persisted.spellSlots.map((slot) => ({
        level: slot.level,
        maximum: slot.maximum,
        remaining: slot.remaining,
        recharge: slot.recharge,
      })),
      'preloaded party spell slots',
    );
    requireCanonicalEqual(
      subject.limitedResources ?? [],
      persisted.limitedResources,
      'preloaded party limited resources',
    );
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
      case 'party_state_captured': {
        if (parent === null || parent === undefined || parent.partyState === null) {
          throw new Error('Party capture requires an existing party session state.');
        }
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'party-capture encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'party-capture coordinator state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'party-capture RNG state');
        const expectedPartyState = transition.restInterruption === undefined
          ? capturePartySessionState(parent.partyState, parent.encounterState)
          : interruptLongRest(parent.partyState, transition.restInterruption.outcome).state;
        requireCanonicalEqual(revision.partyState, expectedPartyState, transition.restInterruption === undefined
          ? 'captured party state'
          : 'rest-interruption party state');
        break;
      }
      case 'short_rest_completed': {
        if (parent === null || parent === undefined || parent.partyState === null) {
          throw new Error('A Short Rest requires an existing party session state.');
        }
        const restRng = restoreMulberry32(parent.rngState);
        const rested = takeShortRest(parent.partyState, transition.spends, restRng);
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'Short Rest encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'Short Rest coordinator state');
        requireCanonicalEqual(revision.partyState, rested.state, 'Short Rest party state');
        requireCanonicalEqual(transition.rolls, rested.rolls, 'Short Rest rolls');
        requireCanonicalEqual(revision.rngState, restRng.snapshot(), 'Short Rest RNG state');
        break;
      }
      case 'long_rest_completed': {
        if (parent === null || parent === undefined || parent.partyState === null) {
          throw new Error('A Long Rest requires an existing party session state.');
        }
        const rested = takeLongRest(parent.partyState);
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'Long Rest encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'Long Rest coordinator state');
        requireCanonicalEqual(revision.partyState, rested.state, 'Long Rest party state');
        requireCanonicalEqual(transition.summary, rested.summary, 'Long Rest summary');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'Long Rest RNG state');
        break;
      }
      case 'room_composed': {
        if (parent === null || parent === undefined || parent.partyState === null) {
          throw new Error('Room composition requires an existing party session state.');
        }
        const advanced = enterNextRoom(parent.partyState);
        requireCanonicalEqual(revision.partyState, advanced, 'advanced room party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'room-composition RNG state');
        if (transition.room !== advanced.room) throw new Error('Room transition ordinal disagrees with party state.');
        requireEncounterMatchesParty(revision.encounterState, advanced);
        break;
      }
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
        requireCanonicalEqual(revision.partyState, parent.partyState, 'head-move party state');
        const expected = deriveBranchRng(parent, revision.branchId).snapshot();
        requireCanonicalEqual(revision.rngState, expected, 'head-move RNG state');
        break;
      }
      case 'reaction_preference_changed': {
        if (parent === null || parent === undefined || parent.partyState === null) {
          throw new Error('A reaction preference revision requires party state.');
        }
        const expectedParty = setPartyReactionPolicy(
          parent.partyState,
          transition.combatant,
          transition.reactionKind,
          transition.policy,
        );
        requireCanonicalEqual(revision.partyState, expectedParty, 'reaction preference party state');
        const partyIds = new Set(expectedParty.characters.map((entry) => entry.combatantId));
        const expectedEncounter = {
          ...parent.encounterState,
          reactionPolicies: [
            ...parent.encounterState.reactionPolicies.filter((entry) => !partyIds.has(entry.combatant)),
            ...expectedParty.reactionPolicies,
          ],
        };
        requireCanonicalEqual(revision.encounterState, expectedEncounter, 'reaction preference encounter state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'reaction preference RNG state');
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
        requireCanonicalEqual(revision.partyState, parent.partyState, 'reducer party state');
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
        requireCanonicalEqual(revision.partyState, parent.partyState, 'coordinator party state');
        break;
    }
    byRevision.set(revision.revision, revision);
  }
  return revisions.at(-1) ?? first;
}

export interface SessionResume {
  readonly journal: EncounterSessionJournal;
  readonly encounterState: EncounterState;
  readonly partyState: PartySessionState | null;
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
    readonly partyState?: PartySessionState;
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
      partyState: input.partyState ?? null,
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
      partyState: latest.partyState,
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

  partyState(): PartySessionState | null {
    return structuredClone(this.#latest().partyState);
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
      partyState: latest.partyState,
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
      partyState: target.partyState,
      coordinatorState: target.coordinatorState,
      controllers: target.controllers,
      codexSessionId: target.codexSessionId,
    });
    return {
      journal: this,
      encounterState: appended.encounterState,
      partyState: appended.partyState,
      coordinatorState: appended.coordinatorState,
      controllers: appended.controllers,
      codexSessionId: appended.codexSessionId,
      rng: this.#rng,
    };
  }

  history(): readonly SessionHistoryEntry[] {
    return sessionHistory(this.store.revisions(this.sessionId));
  }

  capturePartyState(): PartySessionState {
    const latest = this.#latest();
    if (latest.partyState === null) throw new Error('Encounter session has no party state to capture.');
    const partyState = capturePartySessionState(latest.partyState, latest.encounterState);
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'party_state_captured', room: partyState.room },
      encounterState: latest.encounterState,
      partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      codexSessionId: latest.codexSessionId,
    });
    return partyState;
  }

  resolveRestInterruption(outcome: RestInterruptionOutcome): RestInterruptionResult {
    const latest = this.#latest();
    if (latest.partyState === null) throw new Error('Encounter session has no party state to interrupt a rest.');
    const result = interruptLongRest(latest.partyState, outcome);
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: {
        kind: 'party_state_captured',
        room: result.state.room,
        restInterruption: { outcome: result.outcome, ruling: result.ruling },
      },
      encounterState: latest.encounterState,
      partyState: result.state,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      codexSessionId: latest.codexSessionId,
    });
    return result;
  }

  takeShortRest(spends: readonly ShortRestHitDieSpend[]): ShortRestResult {
    const latest = this.#latest();
    if (latest.partyState === null) throw new Error('Encounter session has no party state to rest.');
    const rested = takeShortRest(latest.partyState, spends, this.#rng);
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: {
        kind: 'short_rest_completed',
        room: rested.state.room,
        spends: structuredClone(spends),
        rolls: rested.rolls,
      },
      encounterState: latest.encounterState,
      partyState: rested.state,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      codexSessionId: latest.codexSessionId,
    });
    return rested;
  }

  takeLongRest(): LongRestResult {
    const latest = this.#latest();
    if (latest.partyState === null) throw new Error('Encounter session has no party state to rest.');
    const rested = takeLongRest(latest.partyState);
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: {
        kind: 'long_rest_completed',
        room: rested.state.room,
        summary: rested.summary,
      },
      encounterState: latest.encounterState,
      partyState: rested.state,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      codexSessionId: latest.codexSessionId,
    });
    return rested;
  }

  updateReactionPreference(
    combatant: import('../combat/values').CombatantId,
    reactionKind: ReactionKind,
    policy: ReactionPolicy,
  ): SessionResume {
    const latest = this.#latest();
    if (latest.partyState === null) throw new Error('Encounter session has no party state for reaction preferences.');
    const partyState = setPartyReactionPolicy(latest.partyState, combatant, reactionKind, policy);
    const partyIds = new Set(partyState.characters.map((entry) => entry.combatantId));
    const encounterState: EncounterState = {
      ...latest.encounterState,
      reactionPolicies: [
        ...latest.encounterState.reactionPolicies.filter((entry) => !partyIds.has(entry.combatant)),
        ...partyState.reactionPolicies,
      ],
    };
    const appended = this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'reaction_preference_changed', combatant, reactionKind, policy },
      encounterState,
      partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      codexSessionId: latest.codexSessionId,
    });
    return {
      journal: this,
      encounterState: appended.encounterState,
      partyState: appended.partyState,
      coordinatorState: appended.coordinatorState,
      controllers: appended.controllers,
      codexSessionId: appended.codexSessionId,
      rng: this.#rng,
    };
  }

  composeNextRoom(input: {
    readonly encounterState: EncounterState;
    readonly coordinatorState: PersistedCoordinatorState;
    readonly controllers: readonly ControllerIdentity[];
  }): PartySessionState {
    const latest = this.#latest();
    if (latest.partyState === null) throw new Error('Encounter session has no party state to advance.');
    const partyState = enterNextRoom(latest.partyState);
    requireEncounterMatchesParty(input.encounterState, partyState);
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'room_composed', room: partyState.room },
      encounterState: input.encounterState,
      partyState,
      coordinatorState: input.coordinatorState,
      controllers: input.controllers,
      codexSessionId: latest.codexSessionId,
    });
    return partyState;
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
    readonly partyState: PartySessionState | null;
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
      branchRngStateFingerprint: branchRngStateFingerprint(input.encounterState),
      partyState: input.partyState,
      rngState: this.#rng.snapshot(),
      coordinatorState: input.coordinatorState,
      controllers: input.controllers,
      codexSessionId: input.codexSessionId,
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
  readonly revisions: readonly Readonly<Record<string, unknown>>[];
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

export interface DecodedSavedSessionFingerprint {
  readonly sessionId: EncounterSessionId;
  readonly fingerprint: string;
  readonly revisionCount: number;
  readonly room: number | null;
  readonly round: number;
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
const V2_TO_V3_SOURCE = 'vtt-session-v2-to-v3:add-party-session-state-null-and-rehash-revisions';
const V3_TO_V4_SOURCE = 'vtt-session-v3-to-v4:add-persisted-branch-rng-state-fingerprint';
const V4_TO_V5_SOURCE = 'vtt-session-v4-to-v5:add-typed-combatant-death-moment-and-rehash-revisions';

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
    Object.freeze({
      id: 'vtt_session_v2_to_v3',
      from: 2,
      to: 3,
      source: V2_TO_V3_SOURCE,
      checksum: '0a6dd026931de184063de3aa5173901c1876fb8ef8f89ac340de241511e5303a',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v2 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision)) throw new TypeError('VTT session v2 revision is malformed.');
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 3 as const,
            partyState: null,
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 3 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v3_to_v4',
      from: 3,
      to: 4,
      source: V3_TO_V4_SOURCE,
      checksum: '03fad58a6864c3419f1243aa818fdcb6b38e3411d832de8b32a2e9364ba4bd20',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v3 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
            throw new TypeError('VTT session v3 revision is malformed.');
          }
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 4 as const,
            branchRngStateFingerprint: branchRngStateFingerprint(
              revision.encounterState as unknown as EncounterState,
            ),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 4 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v4_to_v5',
      from: 4,
      to: 5,
      source: V4_TO_V5_SOURCE,
      checksum: '2b0d139e3b2c7c9c5491fe09a103cc667beb246f8d199f093c058b0835cb9c3d',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v4 revisions are malformed.');
        }
        const priorDeathMoments = new Map<string, unknown>();
        const revisions = bundle.revisions.map((revision, revisionIndex) => {
          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
            throw new TypeError('VTT session v4 revision is malformed.');
          }
          const encounterState = revision.encounterState;
          const rawCombatants = encounterState.combatants;
          if (!Array.isArray(rawCombatants)) {
            throw new TypeError('VTT session v4 combatants are malformed.');
          }
          const round = Number.isSafeInteger(encounterState.round) ? encounterState.round as number : 0;
          const initiativeIndex = Number.isSafeInteger(encounterState.activeInitiativeIndex)
            ? encounterState.activeInitiativeIndex as number
            : 0;
          const combatants = rawCombatants.map((combatant: unknown) => {
            if (!isRecord(combatant) || !isRecord(combatant.profile) || typeof combatant.profile.id !== 'string') {
              throw new TypeError('VTT session v4 combatant is malformed.');
            }
            const id = combatant.profile.id;
            const existing = Reflect.get(combatant, 'deathAt');
            const deathAt = combatant.life === 'dead'
              ? existing ?? (priorDeathMoments.has(id)
                  ? priorDeathMoments.get(id) ?? null
                  : revisionIndex === 0
                    ? null
                    : { round, initiativeIndex })
              : null;
            priorDeathMoments.set(id, deathAt);
            return { ...combatant, deathAt };
          });
          const migratedEncounterState = { ...encounterState, combatants } as unknown as EncounterState;
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 5 as const,
            encounterState: migratedEncounterState,
            branchRngStateFingerprint: branchRngStateFingerprint(migratedEncounterState),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 5 as const,
          revisions,
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

/** Decodes, fingerprints, and replays a save without importing it. */
export function decodeSavedSessionFingerprint(
  bytes: string,
): DecodedSavedSessionFingerprint {
  const bundle = migrateSavedBundle(JSON.parse(bytes));
  const latest = replaySessionRevisions(bundle.revisions);
  return {
    sessionId: bundle.sessionId,
    fingerprint: bundle.fingerprint,
    revisionCount: bundle.revisions.length,
    room: latest.partyState?.room ?? null,
    round: latest.encounterState.round,
  };
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
  const revisions = store.revisions(sessionId).map((revision) => {
    const {
      checksum: _checksum,
      partyState: _partyState,
      branchRngStateFingerprint: _branchRngStateFingerprint,
      ...currentBody
    } = revision;
    const body = { ...currentBody, schemaVersion: 2 as const };
    return { ...body, checksum: sha256(canonicalJson(body)) };
  });
  const bundle: SavedSessionBundleV1 = {
    schemaVersion: 1,
    sessionId,
    revisions,
  };
  return canonicalJson(bundle);
}

export function nextBranchId(value: string): EncounterBranchId {
  return encounterBranchId(value);
}
