import { canonicalizeJson, canonicalJson } from '../commands/canonical-json';
import type { ControllerIdentity } from '../combat/controllers';
import type {
  CoordinatorPersistence,
  DurableCoordinatorTransition,
  PersistedCoordinatorState,
} from '../combat/coordinator';
import {
  encounterConclusionAfter,
  isEncounterConfig,
  isEncounterPhase,
  REACTION_KINDS,
  reduceEncounter,
  type EncounterState,
  type ReactionKind,
  type ReactionPolicy,
} from '../combat/encounter';
import type { EncounterEvent } from '../combat/events';
import {
  restoreMulberry32,
  type SerializableRng,
  type SerializableRngState,
} from '../combat/random';
import {
  encounterBranchId,
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
  setPartyRefusalHandling,
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
import {
  REFUSAL_CATEGORIES,
  handlingModesForCategory,
  type RefusalCategory,
  type RefusalHandlingMode,
} from './refusal-handling';
import { deriveSessionRecord, type SessionRecord } from './session-record';
import { isHiddenRollCategory } from '../combat/roll-visibility';
import { reduceSessionEncounter } from './session-encounter-reducer';
import type { JsonValue } from '../domain/models';
import {
  isAgentSessionBinding,
  isAgentCallUsage,
  type AgentCallUsage,
  type AgentFailureClassification,
  type AgentSessionBinding,
} from './agent-session';
import {
  createAgentSessionDigestV1,
  type AgentSessionDigest,
} from './agent-session-digest';
import type { AdjudicationEnvelope } from './mcp/engine-server';
import type { TurnExhaustionTransition } from './turn-exhaustion-coordinator';
import type { AutoResolvedReactionOffer } from './reaction-offer-host-policy';
import {
  REACTION_GUIDANCE_INSTRUCTIONS,
  type GuidedReactionResolution,
  type ReactionGuidanceDeclaration,
  type ReactionGuidanceInstruction,
} from './reaction-guidance';

export type EngineHostTransition =
  | TurnExhaustionTransition
  | ({ readonly kind: 'unattended_reaction_auto_resolved' } & AutoResolvedReactionOffer)
  | {
      readonly kind: 'reaction_guidance_replaced';
      readonly requestId: string;
      readonly proposalId: string;
      readonly guidance: ReactionGuidanceDeclaration;
    }
  | ({ readonly kind: 'reaction_guidance_auto_resolved' } & GuidedReactionResolution)
  | { readonly kind: 'engine_adjudication_requested'; readonly request: AdjudicationEnvelope }
  | {
      readonly kind: 'engine_adjudication_resolved';
      readonly adjudicationRequestId: string;
      readonly verdictSubject: string;
    }
  | {
      readonly kind: 'dm_takeover_started';
      readonly actorId: import('../combat/values').CombatantId;
      readonly previousControllerKind: 'agent' | 'algorithm';
    }
  | {
      readonly kind: 'dm_handback_requested';
      readonly actorId: import('../combat/values').CombatantId;
      readonly controllerKind: 'agent' | 'algorithm';
    }
  | {
      readonly kind: 'dm_handback_completed';
      readonly actorId: import('../combat/values').CombatantId;
      readonly controllerKind: 'agent' | 'algorithm';
    };

export const VTT_SESSION_SCHEMA_VERSION = 10 as const;
export const VTT_SESSION_MINIMUM_SCHEMA_VERSION = 1 as const;

export type SessionTransition =
  | { readonly kind: 'session_started' }
  | {
      readonly kind: 'agent_session_started';
      readonly binding: AgentSessionBinding;
    }
  | {
      readonly kind: 'agent_session_dispatched';
      readonly dispatchedRevision: number;
    }
  | {
      readonly kind: 'agent_call_usage_recorded';
      readonly usage: AgentCallUsage;
    }
  | {
      readonly kind: 'agent_session_recovered';
      readonly failedBinding: AgentSessionBinding;
      readonly binding: AgentSessionBinding;
      readonly failure: Extract<AgentFailureClassification, 'resume_not_found' | 'resume_corrupt'>;
    }
  | {
      readonly kind: 'agent_session_rolled_over';
      readonly supersededBinding: AgentSessionBinding;
      readonly binding: AgentSessionBinding;
      readonly latestInputTokens: import('./agent-session').ContextTokenCount;
      readonly threshold: import('./agent-session').MeasuredContextRolloverThreshold;
      readonly digestHash: string;
    }
  | { readonly kind: 'session_ended' }
  | EngineHostTransition
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
      readonly kind: 'refusal_handling_changed';
      readonly category: RefusalCategory;
      readonly mode: RefusalHandlingMode;
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
      readonly kind: 'turn_skipped';
      readonly combatant: import('../combat/values').CombatantId;
      readonly round: number;
      readonly events: readonly EncounterEvent[];
    }
  | {
      readonly kind: 'turn_delayed';
      readonly combatant: import('../combat/values').CombatantId;
      readonly afterCombatant: import('../combat/values').CombatantId;
      readonly round: number;
      readonly fromIndex: number;
      readonly toIndex: number;
      readonly events: readonly EncounterEvent[];
    }
  | {
      readonly kind: 'head_moved';
      readonly operation: 'undo' | 'redo';
      readonly sourceRevision: number;
      readonly targetRevision: number;
    };

export const SESSION_TRANSITION_KINDS = [
  'session_started',
  'agent_session_started',
  'agent_session_dispatched',
  'agent_call_usage_recorded',
  'agent_session_recovered',
  'agent_session_rolled_over',
  'session_ended',
  'proposal_fallback_resolved',
  'proposal_correction_requested',
  'proposal_correction_resolved',
  'proposal_correction_failed',
  'proposal_auto_resolved',
  'proposal_auto_resolution_failed',
  'unattended_reaction_auto_resolved',
  'reaction_guidance_replaced',
  'reaction_guidance_auto_resolved',
  'engine_adjudication_requested',
  'engine_adjudication_resolved',
  'dm_takeover_started',
  'dm_handback_requested',
  'dm_handback_completed',
  'party_state_captured',
  'reaction_preference_changed',
  'refusal_handling_changed',
  'short_rest_completed',
  'long_rest_completed',
  'room_composed',
  'turn_skipped',
  'turn_delayed',
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
  readonly agentSession: AgentSessionBinding | null;
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
    const stored = this.db.allRaw(
      `SELECT schema_version, payload_json, payload_checksum
       FROM vtt_session_revisions
       WHERE session_id = $sessionId
       ORDER BY revision`,
      { $sessionId: sessionId },
    ).map((row) => {
      if (typeof row.payload_json !== 'string') {
        throw new TypeError('Stored VTT session payload is not text.');
      }
      const revision: unknown = JSON.parse(row.payload_json);
      if (
        !isRecord(revision) ||
        row.schema_version !== revision.schemaVersion ||
        row.payload_checksum !== revision.checksum
      ) {
        throw new Error('Stored VTT session row metadata disagrees with its payload.');
      }
      return revision;
    });
    return stored.length === 0 ? [] : migrateStoredSessionRevisions(stored);
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

function validAdjudicationEnvelope(value: unknown): value is AdjudicationEnvelope {
  return isRecord(value) && hasExactlyKeys(value, [
    'adjudicationRequestId', 'runId', 'branchId', 'requestId', 'expectedRevision',
    'stateDigest', 'stateHandle', 'actorId', 'subject', 'reason', 'blocking',
    'suggestedOutcomes', 'idempotencyKey',
  ]) &&
    typeof value.adjudicationRequestId === 'string' &&
    typeof value.runId === 'string' && typeof value.branchId === 'string' &&
    typeof value.requestId === 'string' && Number.isSafeInteger(value.expectedRevision) &&
    typeof value.stateDigest === 'string' && typeof value.stateHandle === 'string' &&
    typeof value.actorId === 'string' && typeof value.subject === 'string' &&
    typeof value.reason === 'string' && typeof value.blocking === 'boolean' &&
    Array.isArray(value.suggestedOutcomes) && value.suggestedOutcomes.every((entry) => typeof entry === 'string') &&
    typeof value.idempotencyKey === 'string';
}

function validActorFailures(value: unknown): value is Extract<
  TurnExhaustionTransition,
  { readonly kind: 'proposal_correction_requested' }
>['actorFailures'] {
  return Array.isArray(value) && value.length > 0 && value.every((entry) =>
    isRecord(entry) && hasExactlyKeys(entry, ['actorId', 'fallbackResult']) &&
    typeof entry.actorId === 'string' &&
    (entry.fallbackResult === 'invalid' || entry.fallbackResult === 'invalidated' || entry.fallbackResult === 'absent')) &&
    new Set(value.map((entry) => String(Reflect.get(entry, 'actorId')))).size === value.length;
}

function validReactionTriggerGuidance(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) =>
    REACTION_KINDS.includes(key as ReactionKind) &&
    REACTION_GUIDANCE_INSTRUCTIONS.includes(value[key] as ReactionGuidanceInstruction));
}

function validReactionGuidance(value: unknown): value is ReactionGuidanceDeclaration {
  if (!isRecord(value) || !hasExactlyKeys(value, ['sideWide', 'actors']) ||
    (value.sideWide !== null && !validReactionTriggerGuidance(value.sideWide)) ||
    !Array.isArray(value.actors) || value.actors.length > 50 ||
    !value.actors.every((entry) => isRecord(entry) && hasExactlyKeys(entry, ['actorId', 'triggers']) &&
      typeof entry.actorId === 'string' && validReactionTriggerGuidance(entry.triggers))) return false;
  const actorIds = value.actors.map((entry) => String(Reflect.get(entry, 'actorId')));
  return new Set(actorIds).size === actorIds.length && (value.sideWide !== null || value.actors.length > 0);
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
    case 'agent_session_started':
      if (
        hasExactlyKeys(value, ['kind', 'binding']) &&
        isAgentSessionBinding(value.binding)
      ) return { kind: 'agent_session_started', binding: value.binding };
      break;
    case 'agent_session_dispatched':
      if (
        hasExactlyKeys(value, ['kind', 'dispatchedRevision']) &&
        Number.isSafeInteger(value.dispatchedRevision) &&
        typeof value.dispatchedRevision === 'number' &&
        value.dispatchedRevision >= 1
      ) return { kind: 'agent_session_dispatched', dispatchedRevision: value.dispatchedRevision };
      break;
    case 'agent_call_usage_recorded':
      if (hasExactlyKeys(value, ['kind', 'usage']) && isAgentCallUsage(value.usage)) {
        return { kind: 'agent_call_usage_recorded', usage: value.usage };
      }
      break;
    case 'agent_session_recovered':
      if (
        hasExactlyKeys(value, ['kind', 'failedBinding', 'binding', 'failure']) &&
        isAgentSessionBinding(value.failedBinding) &&
        isAgentSessionBinding(value.binding) &&
        (value.failure === 'resume_not_found' || value.failure === 'resume_corrupt')
      ) {
        return {
          kind: 'agent_session_recovered',
          failedBinding: value.failedBinding,
          binding: value.binding,
          failure: value.failure,
        };
      }
      break;
    case 'agent_session_rolled_over':
      if (
        hasExactlyKeys(value, [
          'kind', 'supersededBinding', 'binding', 'latestInputTokens', 'threshold', 'digestHash',
        ]) &&
        isAgentSessionBinding(value.supersededBinding) &&
        isAgentSessionBinding(value.binding) &&
        typeof value.latestInputTokens === 'number' && Number.isSafeInteger(value.latestInputTokens) &&
        value.latestInputTokens >= 0 &&
        typeof value.threshold === 'number' && Number.isSafeInteger(value.threshold) && value.threshold >= 1 &&
        typeof value.digestHash === 'string' && /^[a-f0-9]{64}$/u.test(value.digestHash)
      ) return value as unknown as Extract<SessionTransition, { readonly kind: 'agent_session_rolled_over' }>;
      break;
    case 'session_ended':
      if (hasExactlyKeys(value, ['kind'])) return { kind: 'session_ended' };
      break;
    case 'proposal_fallback_resolved':
      if (hasExactlyKeys(value, ['kind', 'requestId', 'proposalId', 'actorId', 'resolutionDigest']) &&
        typeof value.requestId === 'string' && typeof value.proposalId === 'string' &&
        typeof value.actorId === 'string' && typeof value.resolutionDigest === 'string') {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'proposal_fallback_resolved' }>;
      }
      break;
    case 'proposal_correction_requested':
      if (hasExactlyKeys(value, ['kind', 'requestId', 'initialProposalId', 'correctionNumber', 'actorFailures']) &&
        typeof value.requestId === 'string' && typeof value.initialProposalId === 'string' &&
        value.correctionNumber === 1 && validActorFailures(value.actorFailures)) {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'proposal_correction_requested' }>;
      }
      break;
    case 'proposal_correction_resolved':
      if (hasExactlyKeys(value, ['kind', 'requestId', 'proposalId', 'actorIds']) &&
        typeof value.requestId === 'string' && typeof value.proposalId === 'string' &&
        Array.isArray(value.actorIds) && value.actorIds.length > 0 &&
        value.actorIds.every((entry) => typeof entry === 'string') &&
        new Set(value.actorIds).size === value.actorIds.length) {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'proposal_correction_resolved' }>;
      }
      break;
    case 'proposal_correction_failed':
      if (hasExactlyKeys(value, ['kind', 'requestId', 'result']) && typeof value.requestId === 'string' &&
        (value.result === 'invalid' || value.result === 'invalidated' || value.result === 'no_response')) {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'proposal_correction_failed' }>;
      }
      break;
    case 'proposal_auto_resolved':
      if (hasExactlyKeys(value, [
        'kind', 'runId', 'branchId', 'expectedRevision', 'requestId', 'actorId',
        'initialProposalId', 'fallbackResult', 'correctionResult', 'controllerResolutionDigest',
      ]) && typeof value.runId === 'string' && typeof value.branchId === 'string' &&
        Number.isSafeInteger(value.expectedRevision) && typeof value.requestId === 'string' &&
        typeof value.actorId === 'string' && typeof value.initialProposalId === 'string' &&
        (value.fallbackResult === 'invalid' || value.fallbackResult === 'invalidated' || value.fallbackResult === 'absent') &&
        (value.correctionResult === 'invalid' || value.correctionResult === 'invalidated' || value.correctionResult === 'no_response') &&
        typeof value.controllerResolutionDigest === 'string') {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'proposal_auto_resolved' }>;
      }
      break;
    case 'proposal_auto_resolution_failed':
      if (hasExactlyKeys(value, ['kind', 'requestId', 'actorId', 'reason']) &&
        typeof value.requestId === 'string' && typeof value.actorId === 'string' && typeof value.reason === 'string') {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'proposal_auto_resolution_failed' }>;
      }
      break;
    case 'unattended_reaction_auto_resolved':
      if (
        hasExactlyKeys(value, [
          'kind', 'decisionId', 'combatant', 'reactionKind', 'configuredPolicy',
          'askDefault', 'resolution',
        ]) &&
        typeof value.decisionId === 'string' &&
        typeof value.combatant === 'string' &&
        value.reactionKind === 'opportunity_attack' &&
        (value.configuredPolicy === 'ask' || value.configuredPolicy === 'always' || value.configuredPolicy === 'never') &&
        (value.askDefault === null || value.askDefault === 'decline' || value.askDefault === 'take') &&
        (value.resolution === 'accept' || value.resolution === 'decline') &&
        (
          value.configuredPolicy === 'always'
            ? value.askDefault === null && value.resolution === 'accept'
            : value.configuredPolicy === 'never'
              ? value.askDefault === null && value.resolution === 'decline'
              : (value.askDefault === 'take') === (value.resolution === 'accept')
        )
      ) {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'unattended_reaction_auto_resolved' }>;
      }
      break;
    case 'reaction_guidance_replaced':
      if (hasExactlyKeys(value, ['kind', 'requestId', 'proposalId', 'guidance']) &&
        typeof value.requestId === 'string' && typeof value.proposalId === 'string' &&
        validReactionGuidance(value.guidance)) {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'reaction_guidance_replaced' }>;
      }
      break;
    case 'reaction_guidance_auto_resolved':
      if (hasExactlyKeys(value, [
        'kind', 'decisionId', 'combatant', 'reactionKind', 'instruction', 'scope', 'resolution',
      ]) && typeof value.decisionId === 'string' && typeof value.combatant === 'string' &&
        REACTION_KINDS.includes(value.reactionKind as ReactionKind) &&
        REACTION_GUIDANCE_INSTRUCTIONS.includes(value.instruction as ReactionGuidanceInstruction) &&
        isRecord(value.scope) && (
          hasExactlyKeys(value.scope, ['kind']) && value.scope.kind === 'side_wide' ||
          hasExactlyKeys(value.scope, ['kind', 'actorId']) && value.scope.kind === 'actor' &&
            value.scope.actorId === value.combatant
        ) && (value.resolution === 'accept' || value.resolution === 'decline')) {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'reaction_guidance_auto_resolved' }>;
      }
      break;
    case 'engine_adjudication_requested':
      if (hasExactlyKeys(value, ['kind', 'request']) && validAdjudicationEnvelope(value.request)) {
        return { kind: 'engine_adjudication_requested', request: value.request };
      }
      break;
    case 'engine_adjudication_resolved':
      if (hasExactlyKeys(value, ['kind', 'adjudicationRequestId', 'verdictSubject']) &&
        typeof value.adjudicationRequestId === 'string' && typeof value.verdictSubject === 'string') {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'engine_adjudication_resolved' }>;
      }
      break;
    case 'dm_takeover_started':
      if (hasExactlyKeys(value, ['kind', 'actorId', 'previousControllerKind']) &&
        typeof value.actorId === 'string' &&
        (value.previousControllerKind === 'agent' || value.previousControllerKind === 'algorithm')) {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'dm_takeover_started' }>;
      }
      break;
    case 'dm_handback_requested':
    case 'dm_handback_completed':
      if (hasExactlyKeys(value, ['kind', 'actorId', 'controllerKind']) && typeof value.actorId === 'string' &&
        (value.controllerKind === 'agent' || value.controllerKind === 'algorithm')) {
        return value as unknown as Extract<SessionTransition, { readonly kind: 'dm_handback_requested' | 'dm_handback_completed' }>;
      }
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
    case 'refusal_handling_changed':
      if (
        hasExactlyKeys(value, ['kind', 'category', 'mode']) &&
        typeof value.category === 'string' &&
        REFUSAL_CATEGORIES.includes(value.category as RefusalCategory) &&
        typeof value.mode === 'string' &&
        handlingModesForCategory(value.category as RefusalCategory).includes(value.mode as RefusalHandlingMode)
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
    case 'turn_skipped':
      if (
        hasExactlyKeys(value, ['kind', 'combatant', 'round', 'events']) &&
        typeof value.combatant === 'string' &&
        Number.isSafeInteger(value.round) && typeof value.round === 'number' && value.round >= 1 &&
        Array.isArray(value.events)
      ) return value as unknown as Extract<SessionTransition, { readonly kind: 'turn_skipped' }>;
      break;
    case 'turn_delayed':
      if (
        hasExactlyKeys(value, [
          'kind', 'combatant', 'afterCombatant', 'round', 'fromIndex', 'toIndex', 'events',
        ]) &&
        typeof value.combatant === 'string' && typeof value.afterCombatant === 'string' &&
        Number.isSafeInteger(value.round) && typeof value.round === 'number' && value.round >= 1 &&
        Number.isSafeInteger(value.fromIndex) && typeof value.fromIndex === 'number' && value.fromIndex >= 0 &&
        Number.isSafeInteger(value.toIndex) && typeof value.toIndex === 'number' && value.toIndex > value.fromIndex &&
        Array.isArray(value.events)
      ) return value as unknown as Extract<SessionTransition, { readonly kind: 'turn_delayed' }>;
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
    !isEncounterPhase(value.encounterState.phase) ||
    !Array.isArray(value.encounterState.hiddenRolls) ||
    !value.encounterState.hiddenRolls.every(isHiddenRollCategory) ||
    new Set(value.encounterState.hiddenRolls).size !== value.encounterState.hiddenRolls.length ||
    typeof value.branchRngStateFingerprint !== 'string' ||
    !(value.partyState === null || isRecord(value.partyState)) ||
    !isRecord(value.rngState) ||
    !isRecord(value.coordinatorState) ||
    !Array.isArray(value.controllers) ||
    !(value.agentSession === null || isAgentSessionBinding(value.agentSession)) ||
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
    hiddenRolls: _hiddenRolls,
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

export interface PacingAdvance {
  readonly encounterState: EncounterState;
  readonly events: readonly EncounterEvent[];
}

function pacingCoordinatorState(state: PersistedCoordinatorState): PersistedCoordinatorState {
  return {
    ...state,
    pendingRequest: null,
    pendingCommand: null,
    continuation: { kind: 'idle' },
  };
}

function advanceSkippedTurn(
  state: EncounterState,
  rng: SerializableRng,
): PacingAdvance {
  const actor = state.activeCombatant;
  if (actor === null || state.round < 1) throw new Error('A turn can only be skipped during initiative.');
  const reduction = reduceEncounter(state, { type: 'end_turn', actor }, rng);
  if (reduction.state.activeCombatant === actor) {
    throw new Error('Resolve the current turn-boundary decision before skipping or delaying.');
  }
  return { encounterState: reduction.state, events: reduction.events };
}

function advanceDelayedTurn(
  state: EncounterState,
  afterCombatant: import('../combat/values').CombatantId,
  rng: SerializableRng,
): PacingAdvance & { readonly fromIndex: number; readonly toIndex: number } {
  const actor = state.activeCombatant;
  const fromIndex = state.activeInitiativeIndex;
  if (actor === null || fromIndex === null || state.round < 1) {
    throw new Error('A turn can only be delayed during initiative.');
  }
  const toIndex = state.initiative.findIndex((entry) => entry.combatant === afterCombatant);
  if (toIndex <= fromIndex) {
    throw new Error('A delayed combatant must move after a later initiative entry this round.');
  }
  const advanced = advanceSkippedTurn(state, rng);
  const moved = state.initiative[fromIndex];
  if (moved === undefined || moved.combatant !== actor) {
    throw new Error('Active combatant and initiative index disagree.');
  }
  const withoutActor = state.initiative.filter((entry) => entry.combatant !== actor);
  const targetIndex = withoutActor.findIndex((entry) => entry.combatant === afterCombatant);
  if (targetIndex < 0) throw new Error('Delay target is absent from initiative.');
  const initiative = [
    ...withoutActor.slice(0, targetIndex + 1),
    moved,
    ...withoutActor.slice(targetIndex + 1),
  ];
  const nextActiveIndex = initiative.findIndex(
    (entry) => entry.combatant === advanced.encounterState.activeCombatant,
  );
  if (nextActiveIndex < 0) throw new Error('Delayed initiative lost the next active combatant.');
  return {
    encounterState: {
      ...advanced.encounterState,
      initiative,
      activeInitiativeIndex: nextActiveIndex,
      initiativeBeforeDelays: state.initiativeBeforeDelays ?? {
        round: state.round,
        order: state.initiative.map((entry) => entry.combatant),
      },
    },
    events: advanced.events,
    fromIndex,
    toIndex,
  };
}

export function replayPacingTransition(
  state: EncounterState,
  transition: Extract<SessionTransition, { readonly kind: 'turn_skipped' | 'turn_delayed' }>,
  rng: SerializableRng,
): PacingAdvance {
  return transition.kind === 'turn_skipped'
    ? advanceSkippedTurn(state, rng)
    : advanceDelayedTurn(state, transition.afterCombatant, rng);
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
        if (revision.agentSession !== null && (
          revision.agentSession.cli !== 'codex' ||
          revision.agentSession.status !== 'active' ||
          revision.agentSession.generation !== 0 ||
          revision.agentSession.predecessorSessionHash !== null ||
          revision.agentSession.startedAtRevision !== 1
        )) {
          throw new Error('Migrated session_started agent binding is malformed.');
        }
        break;
      case 'agent_session_started':
        if (parent === null || parent === undefined || parent.agentSession !== null) {
          throw new Error('agent_session_started requires an unbound parent revision.');
        }
        requireCanonicalEqual(revision.agentSession, transition.binding, 'started agent binding');
        if (
          transition.binding.status !== 'active' ||
          transition.binding.generation !== 0 ||
          transition.binding.predecessorSessionHash !== null ||
          transition.binding.startedAtRevision !== revision.revision ||
          transition.binding.lastDispatchedRevision !== 0
        ) throw new Error('Initial agent session binding is malformed.');
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-start encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-start coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-start party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-start RNG state');
        break;
      case 'agent_session_dispatched':
        if (parent === null || parent === undefined || parent.agentSession === null) {
          throw new Error('agent_session_dispatched requires an active binding.');
        }
        if (
          parent.agentSession.status !== 'active' ||
          transition.dispatchedRevision !== parent.revision
        ) throw new Error('Agent dispatch revision does not identify its active parent.');
        requireCanonicalEqual(
          revision.agentSession,
          { ...parent.agentSession, lastDispatchedRevision: transition.dispatchedRevision },
          'dispatched agent binding',
        );
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-dispatch encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-dispatch coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-dispatch party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-dispatch RNG state');
        break;
      case 'agent_call_usage_recorded':
        if (parent === null || parent === undefined || parent.agentSession === null ||
          parent.agentSession.status !== 'active') {
          throw new Error('agent_call_usage_recorded requires an active binding.');
        }
        if (transition.usage.ordinal !== parent.agentSession.callUsage.length + 1) {
          throw new Error('Recorded agent call usage ordinal is not contiguous.');
        }
        requireCanonicalEqual(
          revision.agentSession,
          {
            ...parent.agentSession,
            callUsage: [...parent.agentSession.callUsage, transition.usage],
            currentContextTokens: transition.usage.contextInputTokens,
          },
          'agent call usage binding',
        );
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-usage encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-usage coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-usage party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-usage RNG state');
        break;
      case 'agent_session_recovered':
        if (parent === null || parent === undefined || parent.agentSession === null) {
          throw new Error('agent_session_recovered requires a failed active binding.');
        }
        requireCanonicalEqual(
          transition.failedBinding,
          { ...parent.agentSession, status: 'superseded_after_resume_failure' },
          'superseded agent binding',
        );
        requireCanonicalEqual(revision.agentSession, transition.binding, 'recovery successor binding');
        if (
          transition.binding.cli !== parent.agentSession.cli ||
          transition.binding.status !== 'active' ||
          transition.binding.generation !== parent.agentSession.generation + 1 ||
          transition.binding.startedAtRevision !== revision.revision ||
          transition.binding.lastDispatchedRevision !== 0 ||
          transition.binding.predecessorSessionHash === null
        ) throw new Error('Agent recovery successor is malformed.');
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-recovery encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-recovery coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-recovery party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-recovery RNG state');
        break;
      case 'agent_session_rolled_over':
        if (parent === null || parent === undefined || parent.agentSession === null ||
          parent.agentSession.currentContextTokens === null) {
          throw new Error('agent_session_rolled_over requires an active binding with measured usage.');
        }
        requireCanonicalEqual(
          transition.supersededBinding,
          { ...parent.agentSession, status: 'superseded_after_context_rollover' },
          'rollover superseded binding',
        );
        requireCanonicalEqual(revision.agentSession, transition.binding, 'rollover successor binding');
        if (
          transition.latestInputTokens !== parent.agentSession.currentContextTokens ||
          transition.latestInputTokens < transition.threshold ||
          transition.binding.cli !== parent.agentSession.cli ||
          transition.binding.status !== 'active' ||
          transition.binding.generation !== parent.agentSession.generation + 1 ||
          transition.binding.rolloverTriggerCount !== parent.agentSession.rolloverTriggerCount + 1 ||
          transition.binding.measuredRolloverThreshold !== transition.threshold ||
          transition.binding.lastDigestHash !== transition.digestHash ||
          transition.binding.startedAtRevision !== revision.revision ||
          transition.binding.lastDispatchedRevision !== 0 ||
          transition.binding.predecessorSessionHash === null
        ) throw new Error('Agent rollover successor is malformed.');
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-rollover encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-rollover coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-rollover party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-rollover RNG state');
        break;
      case 'session_ended':
        if (parent === null || parent === undefined) {
          throw new Error('session_ended requires a parent revision.');
        }
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'ended-session encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'ended-session coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'ended-session party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'ended-session RNG state');
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
      case 'turn_skipped': {
        if (parent === null || parent === undefined) throw new Error('A skipped turn requires a parent.');
        if (
          parent.encounterState.activeCombatant !== transition.combatant ||
          parent.encounterState.round !== transition.round
        ) throw new Error('Skipped-turn metadata disagrees with its parent state.');
        const replayRng = restoreMulberry32(parent.rngState);
        const replayed = advanceSkippedTurn(parent.encounterState, replayRng);
        requireCanonicalEqual(revision.encounterState, replayed.encounterState, 'skipped-turn state');
        requireCanonicalEqual(transition.events, replayed.events, 'skipped-turn events');
        requireCanonicalEqual(revision.rngState, replayRng.snapshot(), 'skipped-turn RNG state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'skipped-turn party state');
        requireCanonicalEqual(
          revision.coordinatorState,
          pacingCoordinatorState(parent.coordinatorState),
          'skipped-turn coordinator state',
        );
        break;
      }
      case 'turn_delayed': {
        if (parent === null || parent === undefined) throw new Error('A delayed turn requires a parent.');
        if (
          parent.encounterState.activeCombatant !== transition.combatant ||
          parent.encounterState.round !== transition.round
        ) throw new Error('Delayed-turn metadata disagrees with its parent state.');
        const replayRng = restoreMulberry32(parent.rngState);
        const replayed = advanceDelayedTurn(
          parent.encounterState,
          transition.afterCombatant,
          replayRng,
        );
        requireCanonicalEqual(
          { fromIndex: transition.fromIndex, toIndex: transition.toIndex },
          { fromIndex: replayed.fromIndex, toIndex: replayed.toIndex },
          'delayed-turn reposition',
        );
        requireCanonicalEqual(revision.encounterState, replayed.encounterState, 'delayed-turn state');
        requireCanonicalEqual(transition.events, replayed.events, 'delayed-turn events');
        requireCanonicalEqual(revision.rngState, replayRng.snapshot(), 'delayed-turn RNG state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'delayed-turn party state');
        requireCanonicalEqual(
          revision.coordinatorState,
          pacingCoordinatorState(parent.coordinatorState),
          'delayed-turn coordinator state',
        );
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
        const replayed = reduceSessionEncounter(
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
      case 'proposal_fallback_resolved':
      case 'proposal_correction_requested':
      case 'proposal_correction_resolved':
      case 'proposal_correction_failed':
      case 'proposal_auto_resolved':
      case 'proposal_auto_resolution_failed':
      case 'unattended_reaction_auto_resolved':
      case 'reaction_guidance_replaced':
      case 'reaction_guidance_auto_resolved':
      case 'engine_adjudication_requested':
      case 'engine_adjudication_resolved':
      case 'dm_takeover_started':
      case 'dm_handback_requested':
      case 'dm_handback_completed':
        if (parent === null || parent === undefined) {
          throw new Error('A host-state revision requires a parent.');
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
    if (
      parent !== null && parent !== undefined &&
      transition.kind !== 'agent_session_started' &&
      transition.kind !== 'agent_session_dispatched' &&
      transition.kind !== 'agent_call_usage_recorded' &&
      transition.kind !== 'agent_session_recovered' &&
      transition.kind !== 'agent_session_rolled_over'
    ) {
      requireCanonicalEqual(revision.agentSession, parent.agentSession, 'unchanged agent binding');
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
  readonly agentSession: AgentSessionBinding | null;
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
      agentSession: null,
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
      agentSession: latest.agentSession,
      rng,
    };
  }

  rng(): SerializableRng {
    return this.#rng;
  }

  agentSession(): AgentSessionBinding | null {
    return structuredClone(this.#latest().agentSession);
  }

  reactionGuidance(): ReactionGuidanceDeclaration | null {
    const transition = [...this.history()].reverse().find((entry) =>
      !entry.void && entry.transition.kind === 'reaction_guidance_replaced')?.transition;
    return transition?.kind === 'reaction_guidance_replaced'
      ? structuredClone(transition.guidance)
      : null;
  }

  replaceReactionGuidance(
    requestId: string,
    proposalId: string,
    guidance: ReactionGuidanceDeclaration,
  ): void {
    this.recordHostTransition({
      kind: 'reaction_guidance_replaced', requestId, proposalId,
      guidance: structuredClone(guidance),
    });
  }

  startAgentSession(input: Pick<AgentSessionBinding, 'cli' | 'sessionId' | 'adapterVersion'> & {
    readonly measuredRolloverThreshold?: AgentSessionBinding['measuredRolloverThreshold'];
  }): AgentSessionBinding {
    const latest = this.#latest();
    if (latest.agentSession !== null) throw new Error('Encounter run already has an agent session.');
    const binding: AgentSessionBinding = {
      cli: input.cli,
      sessionId: input.sessionId,
      adapterVersion: input.adapterVersion,
      generation: 0,
      rolloverTriggerCount: 0,
      measuredRolloverThreshold: input.measuredRolloverThreshold ?? null,
      lastDigestHash: null,
      predecessorSessionHash: null,
      startedAtRevision: latest.revision + 1,
      lastDispatchedRevision: 0,
      callUsage: [],
      currentContextTokens: null,
      status: 'active',
    };
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'agent_session_started', binding },
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: binding,
    });
    return binding;
  }

  recordAgentSessionDispatch(): AgentSessionBinding {
    const latest = this.#latest();
    if (latest.agentSession === null || latest.agentSession.status !== 'active') {
      throw new Error('Encounter run has no active agent session to resume.');
    }
    const binding: AgentSessionBinding = {
      ...latest.agentSession,
      lastDispatchedRevision: latest.revision,
    };
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'agent_session_dispatched', dispatchedRevision: latest.revision },
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: binding,
    });
    return binding;
  }

  recordAgentCallUsage(usage: AgentCallUsage): AgentSessionBinding {
    const latest = this.#latest();
    if (latest.agentSession === null || latest.agentSession.status !== 'active') {
      throw new Error('Encounter run has no active agent session for call usage.');
    }
    if (usage.ordinal !== latest.agentSession.callUsage.length + 1) {
      throw new Error('Agent call usage ordinal is not contiguous.');
    }
    const binding: AgentSessionBinding = {
      ...latest.agentSession,
      callUsage: [...latest.agentSession.callUsage, structuredClone(usage)],
      currentContextTokens: usage.contextInputTokens,
    };
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'agent_call_usage_recorded', usage: structuredClone(usage) },
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: binding,
    });
    return binding;
  }

  agentSessionDigest(): AgentSessionDigest {
    const revisions = this.store.revisions(this.sessionId);
    const latest = this.#latest();
    const history = sessionHistory(revisions).filter((entry) => !entry.void);
    const record = deriveSessionRecord(revisions);
    const acceptedKinds = new Set<SessionTransition['kind']>([
      'reducer_applied', 'proposal_fallback_resolved', 'proposal_correction_resolved',
      'reaction_guidance_replaced', 'reaction_guidance_auto_resolved',
      'engine_adjudication_resolved', 'controller_response_received',
    ]);
    return createAgentSessionDigestV1({
      runId: this.sessionId,
      branchId: latest.branchId,
      revision: latest.revision,
      completedRoomSummaries: record.encounters
        .filter((entry) => entry.status === 'closed')
        .map((entry) => canonicalizeJson(entry)),
      current: {
        room: latest.partyState?.room ?? history.at(-1)?.encounterOrdinal ?? 1,
        round: latest.encounterState.round,
        phase: latest.encounterState.phase,
      },
      durableReactionGuidance: this.reactionGuidance() === null
        ? null : canonicalizeJson(this.reactionGuidance()),
      partyResources: latest.partyState === null ? null : canonicalizeJson(latest.partyState),
      lifeAndHitPointBands: latest.encounterState.combatants.map((combatant) => ({
        combatantId: combatant.profile.id,
        life: combatant.life,
        hitPoints: combatant.hitPoints,
        hitPointMaximum: combatant.profile.rules.hitPointMaximum,
        temporaryHitPoints: combatant.temporaryHitPoints,
      })),
      effectsAndResources: [
        ...latest.encounterState.effects,
        ...latest.encounterState.combatants.map((combatant) => ({
          combatantId: combatant.profile.id,
          spellSlots: combatant.spellSlots,
          limitedResources: combatant.limitedResources ?? [],
          wildShapeUses: combatant.wildShapeUses,
          legendary: combatant.legendary ?? null,
        })),
      ].map((entry) => canonicalizeJson(entry)),
      recentAcceptedEngineDecisions: history
        .filter((entry) => acceptedKinds.has(entry.transition.kind))
        .slice(-25)
        .map((entry) => ({ revision: entry.revision, decision: canonicalizeJson(entry.transition) })),
    });
  }

  recoverAgentSession(input: {
    readonly sessionId: AgentSessionBinding['sessionId'];
    readonly predecessorSessionHash: string;
    readonly failure: Extract<AgentFailureClassification, 'resume_not_found' | 'resume_corrupt'>;
    readonly digestHash: string;
  }): AgentSessionBinding {
    const latest = this.#latest();
    if (latest.agentSession === null || latest.agentSession.status !== 'active') {
      throw new Error('Encounter run has no active failed agent session to recover.');
    }
    const failedBinding: AgentSessionBinding = {
      ...latest.agentSession,
      status: 'superseded_after_resume_failure',
    };
    const binding: AgentSessionBinding = {
      cli: latest.agentSession.cli,
      sessionId: input.sessionId,
      adapterVersion: latest.agentSession.adapterVersion,
      generation: latest.agentSession.generation + 1,
      rolloverTriggerCount: latest.agentSession.rolloverTriggerCount,
      measuredRolloverThreshold: latest.agentSession.measuredRolloverThreshold,
      lastDigestHash: input.digestHash,
      predecessorSessionHash: input.predecessorSessionHash,
      startedAtRevision: latest.revision + 1,
      lastDispatchedRevision: 0,
      callUsage: [],
      currentContextTokens: null,
      status: 'active',
    };
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: {
        kind: 'agent_session_recovered',
        failedBinding,
        binding,
        failure: input.failure,
      },
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: binding,
    });
    return binding;
  }

  rollOverAgentSession(input: {
    readonly sessionId: AgentSessionBinding['sessionId'];
    readonly predecessorSessionHash: string;
    readonly latestInputTokens: import('./agent-session').ContextTokenCount;
    readonly threshold: import('./agent-session').MeasuredContextRolloverThreshold;
    readonly digestHash: string;
  }): AgentSessionBinding {
    const latest = this.#latest();
    if (latest.agentSession === null || latest.agentSession.status !== 'active') {
      throw new Error('Encounter run has no active agent session to roll over.');
    }
    const supersededBinding: AgentSessionBinding = {
      ...latest.agentSession,
      status: 'superseded_after_context_rollover',
    };
    const binding: AgentSessionBinding = {
      cli: latest.agentSession.cli,
      sessionId: input.sessionId,
      adapterVersion: latest.agentSession.adapterVersion,
      generation: latest.agentSession.generation + 1,
      rolloverTriggerCount: latest.agentSession.rolloverTriggerCount + 1,
      measuredRolloverThreshold: input.threshold,
      lastDigestHash: input.digestHash,
      predecessorSessionHash: input.predecessorSessionHash,
      startedAtRevision: latest.revision + 1,
      lastDispatchedRevision: 0,
      callUsage: [],
      currentContextTokens: null,
      status: 'active',
    };
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: {
        kind: 'agent_session_rolled_over',
        supersededBinding,
        binding,
        latestInputTokens: input.latestInputTokens,
        threshold: input.threshold,
        digestHash: input.digestHash,
      },
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: binding,
    });
    return binding;
  }

  partyState(): PartySessionState | null {
    return structuredClone(this.#latest().partyState);
  }

  ended(): boolean {
    return this.#latest().transition.kind === 'session_ended';
  }

  endSession(): void {
    const latest = this.#latest();
    if (latest.transition.kind === 'session_ended') {
      throw new Error('Encounter session has already ended.');
    }
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'session_ended' },
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: latest.agentSession,
    });
  }

  export(): string {
    return exportSavedSession(this.store, this.sessionId);
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
      agentSession: latest.agentSession,
    });
  }

  recordHostTransition(transition: EngineHostTransition): void {
    const latest = this.#latest();
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition,
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: latest.agentSession,
    });
  }

  turnExhaustionPersistence(): import('./turn-exhaustion-coordinator').TurnExhaustionPersistence {
    return {
      transitions: () => this.history().flatMap((entry) =>
        !entry.void && entry.transition.kind.startsWith('proposal_')
          ? [entry.transition as TurnExhaustionTransition]
          : []),
      record: (transition) => this.recordHostTransition(transition),
    };
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
      agentSession: target.agentSession,
    });
    return {
      journal: this,
      encounterState: appended.encounterState,
      partyState: appended.partyState,
      coordinatorState: appended.coordinatorState,
      controllers: appended.controllers,
      agentSession: appended.agentSession,
      rng: this.#rng,
    };
  }

  skipTurn(): SessionResume {
    const latest = this.#latest();
    const actor = latest.encounterState.activeCombatant;
    if (actor === null) throw new Error('A turn can only be skipped during initiative.');
    const advanced = advanceSkippedTurn(latest.encounterState, this.#rng);
    return this.#appendPacing({
      latest,
      transition: {
        kind: 'turn_skipped',
        combatant: actor,
        round: latest.encounterState.round,
        events: advanced.events,
      },
      encounterState: advanced.encounterState,
    });
  }

  delayTurn(afterCombatant: import('../combat/values').CombatantId): SessionResume {
    const latest = this.#latest();
    const actor = latest.encounterState.activeCombatant;
    if (actor === null) throw new Error('A turn can only be delayed during initiative.');
    const advanced = advanceDelayedTurn(latest.encounterState, afterCombatant, this.#rng);
    return this.#appendPacing({
      latest,
      transition: {
        kind: 'turn_delayed',
        combatant: actor,
        afterCombatant,
        round: latest.encounterState.round,
        fromIndex: advanced.fromIndex,
        toIndex: advanced.toIndex,
        events: advanced.events,
      },
      encounterState: advanced.encounterState,
    });
  }

  history(): readonly SessionHistoryEntry[] {
    return sessionHistory(this.store.revisions(this.sessionId));
  }

  roundBoundaries(): readonly SessionRoundBoundary[] {
    const history = this.history();
    const currentEncounter = history.at(-1)?.encounterOrdinal;
    if (currentEncounter === undefined) return [];
    return history.flatMap((entry): readonly SessionRoundBoundary[] =>
      !entry.void && entry.encounterOrdinal === currentEncounter && entry.roundBoundary
        ? [{
            round: entry.encounterRound,
            revision: entry.revision,
            branchId: entry.branchId,
          }]
        : []);
  }

  rewindToRound(round: number, requestedBranchId: EncounterBranchId): SessionResume {
    const boundary = this.roundBoundaries().find((candidate) => candidate.round === round);
    if (boundary === undefined) throw new Error(`Round ${String(round)} has no active boundary snapshot.`);
    return this.moveHead('undo', boundary.revision, requestedBranchId);
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
      agentSession: latest.agentSession,
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
      agentSession: latest.agentSession,
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
      agentSession: latest.agentSession,
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
      agentSession: latest.agentSession,
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
      agentSession: latest.agentSession,
    });
    return {
      journal: this,
      encounterState: appended.encounterState,
      partyState: appended.partyState,
      coordinatorState: appended.coordinatorState,
      controllers: appended.controllers,
      agentSession: appended.agentSession,
      rng: this.#rng,
    };
  }

  updateRefusalHandling(
    category: RefusalCategory,
    mode: RefusalHandlingMode,
  ): SessionResume {
    const latest = this.#latest();
    if (latest.partyState === null) throw new Error('Encounter session has no party state for refusal handling.');
    const partyState = setPartyRefusalHandling(latest.partyState, category, mode);
    const appended = this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'refusal_handling_changed', category, mode },
      encounterState: latest.encounterState,
      partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: latest.agentSession,
    });
    return {
      journal: this,
      encounterState: appended.encounterState,
      partyState: appended.partyState,
      coordinatorState: appended.coordinatorState,
      controllers: appended.controllers,
      agentSession: appended.agentSession,
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
      agentSession: latest.agentSession,
    });
    return partyState;
  }

  #latest(): SessionRevision {
    const latest = this.store.revisions(this.sessionId).at(-1);
    if (latest === undefined) throw new Error('Encounter session has no revisions.');
    return latest;
  }

  #appendPacing(input: {
    readonly latest: SessionRevision;
    readonly transition: Extract<SessionTransition, { readonly kind: 'turn_skipped' | 'turn_delayed' }>;
    readonly encounterState: EncounterState;
  }): SessionResume {
    const appended = this.#append({
      parentRevision: input.latest.revision,
      branchId: input.latest.branchId,
      transition: input.transition,
      encounterState: input.encounterState,
      partyState: input.latest.partyState,
      coordinatorState: pacingCoordinatorState(input.latest.coordinatorState),
      controllers: input.latest.controllers,
      agentSession: input.latest.agentSession,
    });
    return {
      journal: this,
      encounterState: appended.encounterState,
      partyState: appended.partyState,
      coordinatorState: appended.coordinatorState,
      controllers: appended.controllers,
      agentSession: appended.agentSession,
      rng: this.#rng,
    };
  }

  #append(input: {
    readonly parentRevision: number | null;
    readonly branchId: EncounterBranchId;
    readonly transition: SessionTransition;
    readonly encounterState: EncounterState;
    readonly partyState: PartySessionState | null;
    readonly coordinatorState: PersistedCoordinatorState;
    readonly controllers: readonly ControllerIdentity[];
    readonly agentSession: AgentSessionBinding | null;
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
      agentSession: input.agentSession,
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
  readonly encounterOrdinal: number;
  readonly encounterRound: number;
  readonly roundBoundary: boolean;
}

export interface SessionRoundBoundary {
  readonly round: number;
  readonly revision: number;
  readonly branchId: EncounterBranchId;
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
  const encounterOrdinals = new Map<number, number>();
  for (const revision of revisions) {
    const parentOrdinal = revision.parentRevision === null
      ? 1
      : encounterOrdinals.get(revision.parentRevision);
    if (parentOrdinal === undefined) throw new Error('Session encounter ancestry is incomplete.');
    encounterOrdinals.set(
      revision.revision,
      revision.transition.kind === 'room_composed' ? parentOrdinal + 1 : parentOrdinal,
    );
  }
  return revisions.map((revision) => ({
    revision: revision.revision,
    parentRevision: revision.parentRevision,
    branchId: revision.branchId,
    transition: revision.transition,
    void: !active.has(revision.revision),
    encounterOrdinal: encounterOrdinals.get(revision.revision) ?? 1,
    encounterRound: revision.encounterState.round,
    roundBoundary: revision.encounterState.round > 0 && (
      revision.parentRevision === null ||
      byRevision.get(revision.parentRevision)?.encounterState.round !== revision.encounterState.round
    ),
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
  readonly sessionRecord?: SessionRecord;
}

const JOURNAL_DAG_FORMAT = 'vtt-session-journal-dag' as const;

type JournalDagNode =
  | readonly ['n']
  | readonly ['b', boolean]
  | readonly ['d', number]
  | readonly ['s', string]
  | readonly ['a', readonly number[]]
  | readonly ['o', readonly (string | number)[]];

interface JournalDagBundleBody {
  readonly format: typeof JOURNAL_DAG_FORMAT;
  readonly schemaVersion: typeof VTT_SESSION_SCHEMA_VERSION;
  readonly sessionId: EncounterSessionId;
  readonly nodes: readonly JournalDagNode[];
  /** One content-addressed root per retained journal revision, in stream order. */
  readonly revisions: readonly number[];
}

interface JournalDagBundle extends JournalDagBundleBody {
  readonly fingerprint: string;
  readonly sessionRecord?: SessionRecord;
}

export interface DecodedSavedSessionFingerprint {
  readonly sessionId: EncounterSessionId;
  readonly fingerprint: string;
  readonly revisionCount: number;
  readonly room: number | null;
  readonly round: number;
  readonly initialSeed: number;
}

function sessionFingerprint(body: SavedSessionBundleV2Body): string {
  return sha256(canonicalJson(body));
}

function encodeJournalDag(revisions: readonly SessionRevision[]): Pick<JournalDagBundleBody, 'nodes' | 'revisions'> {
  const nodes: JournalDagNode[] = [];
  const nodeIds = new Map<string, number>();
  const encodeNode = (value: JsonValue): number => {
    let node: JournalDagNode;
    if (value === null) node = ['n'];
    else if (typeof value === 'boolean') node = ['b', value];
    else if (typeof value === 'number') node = ['d', value];
    else if (typeof value === 'string') node = ['s', value];
    else if (Array.isArray(value)) node = ['a', value.map(encodeNode)];
    else {
      node = ['o', Object.keys(value).sort().flatMap((key) => [key, encodeNode(value[key]!)])];
    }
    const key = JSON.stringify(node);
    const existing = nodeIds.get(key);
    if (existing !== undefined) return existing;
    const id = nodes.length;
    nodes.push(node);
    nodeIds.set(key, id);
    return id;
  };
  return {
    nodes,
    revisions: revisions.map((revision) => encodeNode(canonicalizeJson(revision))),
  };
}

function decodeJournalDagValues(
  rawNodes: unknown,
  rawRevisionRoots: unknown,
): readonly JsonValue[] {
  if (!Array.isArray(rawNodes) || !Array.isArray(rawRevisionRoots) || rawRevisionRoots.length === 0) {
    throw new TypeError('Saved VTT session journal DAG is malformed.');
  }
  const values: JsonValue[] = [];
  const dereference = (reference: unknown, nodeIndex: number): JsonValue => {
    if (!Number.isSafeInteger(reference) || (reference as number) < 0 || (reference as number) >= nodeIndex) {
      throw new TypeError('Saved VTT session journal DAG has an invalid child reference.');
    }
    const value = values[reference as number];
    if (value === undefined) throw new TypeError('Saved VTT session journal DAG has a missing child.');
    return value;
  };
  for (const [nodeIndex, rawNode] of rawNodes.entries()) {
    if (!Array.isArray(rawNode) || typeof rawNode[0] !== 'string') {
      throw new TypeError('Saved VTT session journal DAG has a malformed node.');
    }
    switch (rawNode[0]) {
      case 'n':
        if (rawNode.length !== 1) throw new TypeError('Saved VTT session journal DAG has a malformed null node.');
        values.push(null);
        break;
      case 'b':
        if (rawNode.length !== 2 || typeof rawNode[1] !== 'boolean') {
          throw new TypeError('Saved VTT session journal DAG has a malformed boolean node.');
        }
        values.push(rawNode[1]);
        break;
      case 'd':
        if (rawNode.length !== 2 || typeof rawNode[1] !== 'number' || !Number.isFinite(rawNode[1])) {
          throw new TypeError('Saved VTT session journal DAG has a malformed number node.');
        }
        values.push(rawNode[1]);
        break;
      case 's':
        if (rawNode.length !== 2 || typeof rawNode[1] !== 'string') {
          throw new TypeError('Saved VTT session journal DAG has a malformed string node.');
        }
        values.push(rawNode[1]);
        break;
      case 'a':
        if (rawNode.length !== 2 || !Array.isArray(rawNode[1])) {
          throw new TypeError('Saved VTT session journal DAG has a malformed array node.');
        }
        values.push(rawNode[1].map((reference) => dereference(reference, nodeIndex)));
        break;
      case 'o': {
        if (rawNode.length !== 2 || !Array.isArray(rawNode[1]) || rawNode[1].length % 2 !== 0) {
          throw new TypeError('Saved VTT session journal DAG has a malformed object node.');
        }
        const object = Object.create(null) as Record<string, JsonValue>;
        for (let index = 0; index < rawNode[1].length; index += 2) {
          const key = rawNode[1][index];
          const reference = rawNode[1][index + 1];
          if (typeof key !== 'string' || Object.hasOwn(object, key)) {
            throw new TypeError('Saved VTT session journal DAG has a malformed object entry.');
          }
          object[key] = dereference(reference, nodeIndex);
        }
        values.push(object);
        break;
      }
      default:
        throw new TypeError(`Saved VTT session journal DAG has unknown node kind ${JSON.stringify(rawNode[0])}.`);
    }
  }
  return rawRevisionRoots.map((root) => {
    if (!Number.isSafeInteger(root) || (root as number) < 0 || (root as number) >= values.length) {
      throw new TypeError('Saved VTT session journal DAG has an invalid revision root.');
    }
    return values[root as number]!;
  });
}

function decodeJournalDag(
  rawNodes: unknown,
  rawRevisionRoots: unknown,
): readonly SessionRevision[] {
  return decodeJournalDagValues(rawNodes, rawRevisionRoots).map(decodeRevision);
}

function decodeJournalDagBundle(value: Readonly<Record<string, unknown>>): SavedSessionBundleV2 {
  if (
    value.schemaVersion !== VTT_SESSION_SCHEMA_VERSION ||
    typeof value.sessionId !== 'string' ||
    typeof value.fingerprint !== 'string'
  ) {
    throw new TypeError('Saved VTT session journal DAG header is malformed.');
  }
  const body: JournalDagBundleBody = {
    format: JOURNAL_DAG_FORMAT,
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId: value.sessionId as EncounterSessionId,
    nodes: value.nodes as readonly JournalDagNode[],
    revisions: value.revisions as readonly number[],
  };
  if (sha256(canonicalJson(body)) !== value.fingerprint) {
    throw new SessionFingerprintMismatchError();
  }
  const revisions = decodeJournalDag(value.nodes, value.revisions);
  const expanded: SavedSessionBundleV2Body = {
    format: 'vtt-session-revisions',
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId: body.sessionId,
    revisions,
  };
  return { ...expanded, fingerprint: value.fingerprint };
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
const V5_TO_V6_SOURCE = 'vtt-session-v5-to-v6:replace-hide-death-save-rolls-with-hidden-roll-categories';
const V6_TO_V7_SOURCE = 'vtt-session-v6-to-v7:add-typed-encounter-phase-and-rehash-revisions';
const V7_TO_V8_SOURCE = 'vtt-session-v7-to-v8:replace-codex-session-id-with-agent-session-binding-and-rehash-revisions';
const V8_TO_V9_SOURCE = 'vtt-session-v8-to-v9:add-agent-call-usage-and-current-context-token-count';
const V9_TO_V10_SOURCE = 'vtt-session-v9-to-v10:add-agent-generation-rollover-transition-and-digest-telemetry';

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
    Object.freeze({
      id: 'vtt_session_v5_to_v6',
      from: 5,
      to: 6,
      source: V5_TO_V6_SOURCE,
      checksum: '29795e2183f7e7c3831d4d233722a51ba2beee75e124abd434976499132ef174',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v5 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
            throw new TypeError('VTT session v5 revision is malformed.');
          }
          if (typeof revision.encounterState.hideDeathSaveRolls !== 'boolean') {
            throw new TypeError('VTT session v5 death-save visibility setting is malformed.');
          }
          const { hideDeathSaveRolls, ...legacyEncounterState } = revision.encounterState;
          const migratedEncounterState = {
            ...legacyEncounterState,
            hiddenRolls: hideDeathSaveRolls ? ['death_saves'] : [],
          } as unknown as EncounterState;
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 6 as const,
            encounterState: migratedEncounterState,
            branchRngStateFingerprint: branchRngStateFingerprint(migratedEncounterState),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 6 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v6_to_v7',
      from: 6,
      to: 7,
      source: V6_TO_V7_SOURCE,
      checksum: '523db2c861ce38aeeec95824f4d73de203fa98a475ffaf3ad488e79696beaa2e',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v6 revisions are malformed.');
        }
        const migratedByRevision = new Map<number, EncounterState>();
        const revisions = bundle.revisions.map((revision) => {
          if (
            !isRecord(revision) ||
            !Number.isSafeInteger(revision.revision) ||
            !isRecord(revision.encounterState)
          ) {
            throw new TypeError('VTT session v6 revision is malformed.');
          }
          const activeEncounterState = {
            ...revision.encounterState,
            phase: { kind: 'active' as const },
          } as unknown as EncounterState;
          const parent = typeof revision.parentRevision === 'number'
            ? migratedByRevision.get(revision.parentRevision)
            : undefined;
          const startsNewEncounter = isRecord(revision.transition) &&
            revision.transition.kind === 'room_composed';
          const phase = parent?.phase.kind === 'concluded' && !startsNewEncounter
            ? parent.phase
            : parent === undefined
              ? activeEncounterState.phase
              : encounterConclusionAfter(parent, activeEncounterState) ?? activeEncounterState.phase;
          const migratedEncounterState = { ...activeEncounterState, phase };
          migratedByRevision.set(revision.revision as number, migratedEncounterState);
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 7 as const,
            encounterState: migratedEncounterState,
            branchRngStateFingerprint: branchRngStateFingerprint(migratedEncounterState),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 7 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v7_to_v8',
      from: 7,
      to: 8,
      source: V7_TO_V8_SOURCE,
      checksum: '7438ba7c327f99cfe6eaecedaad97c2e5cd63c0cfdb31b26152eacc9cb2ef5ee',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v7 revisions are malformed.');
        }
        const { fingerprint: legacyFingerprint, ...legacyBundleBody } = bundle;
        if (
          typeof legacyFingerprint !== 'string' ||
          sha256(canonicalJson(legacyBundleBody)) !== legacyFingerprint
        ) throw new SessionFingerprintMismatchError();
        const revisions = bundle.revisions.map((revision) => {
          if (
            !isRecord(revision) ||
            typeof revision.codexSessionId !== 'string' ||
            typeof revision.checksum !== 'string'
          ) {
            throw new TypeError('VTT session v7 revision has no Codex session ID.');
          }
          const { checksum: _oldChecksum, codexSessionId: legacySessionId, ...oldBody } = revision;
          if (sha256(canonicalJson({ ...oldBody, codexSessionId: legacySessionId })) !== revision.checksum) {
            throw new Error('VTT session v7 revision checksum mismatch.');
          }
          const body = {
            ...oldBody,
            schemaVersion: 8 as const,
            agentSession: {
              cli: 'codex' as const,
              sessionId: legacySessionId,
              adapterVersion: 1,
              recoveryGeneration: 0,
              predecessorSessionHash: null,
              startedAtRevision: 1,
              lastDispatchedRevision: 0,
              status: 'active' as const,
            },
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 8 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v8_to_v9',
      from: 8,
      to: 9,
      source: V8_TO_V9_SOURCE,
      checksum: 'cf56e83a7fad46c19ab76b437cbb943ba48ce9122022207031ffa7d22f8f826a',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v8 revisions are malformed.');
        }
        const migrateBinding = (value: unknown): unknown => {
          if (value === null) return null;
          if (!isRecord(value)) throw new TypeError('VTT session v8 agent binding is malformed.');
          return { ...value, callUsage: [], currentContextTokens: null };
        };
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || typeof revision.checksum !== 'string' || !isRecord(revision.transition)) {
            throw new TypeError('VTT session v8 revision is malformed.');
          }
          const { checksum: _oldChecksum, ...oldBody } = revision;
          if (sha256(canonicalJson(oldBody)) !== revision.checksum) {
            throw new Error('VTT session v8 revision checksum mismatch.');
          }
          const transition = revision.transition.kind === 'agent_session_started'
            ? { ...revision.transition, binding: migrateBinding(revision.transition.binding) }
            : revision.transition.kind === 'agent_session_recovered'
              ? {
                  ...revision.transition,
                  failedBinding: migrateBinding(revision.transition.failedBinding),
                  binding: migrateBinding(revision.transition.binding),
                }
              : revision.transition;
          const body = {
            ...oldBody,
            schemaVersion: 9 as const,
            transition,
            agentSession: migrateBinding(revision.agentSession),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 9 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v9_to_v10',
      from: 9,
      to: 10,
      source: V9_TO_V10_SOURCE,
      checksum: 'e32f5335315cd5202b872cadf87f171560933a172f562d9ef2483c3a2d7665a8',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v9 revisions are malformed.');
        }
        const migrateBinding = (value: unknown): unknown => {
          if (value === null) return null;
          if (!isRecord(value) || !Number.isSafeInteger(value.recoveryGeneration)) {
            throw new TypeError('VTT session v9 agent binding is malformed.');
          }
          const { recoveryGeneration, ...binding } = value;
          return {
            ...binding,
            generation: recoveryGeneration,
            rolloverTriggerCount: 0,
            measuredRolloverThreshold: null,
            lastDigestHash: null,
          };
        };
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || typeof revision.checksum !== 'string' || !isRecord(revision.transition)) {
            throw new TypeError('VTT session v9 revision is malformed.');
          }
          const { checksum: _oldChecksum, ...oldBody } = revision;
          if (sha256(canonicalJson(oldBody)) !== revision.checksum) {
            throw new Error('VTT session v9 revision checksum mismatch.');
          }
          const transition = revision.transition.kind === 'agent_session_started'
            ? { ...revision.transition, binding: migrateBinding(revision.transition.binding) }
            : revision.transition.kind === 'agent_session_recovered'
              ? {
                  ...revision.transition,
                  failedBinding: migrateBinding(revision.transition.failedBinding),
                  binding: migrateBinding(revision.transition.binding),
                }
              : revision.transition;
          const body = {
            ...oldBody,
            schemaVersion: 10 as const,
            transition,
            agentSession: migrateBinding(revision.agentSession),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 10 as const,
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
  if (isRecord(value) && value.format === JOURNAL_DAG_FORMAT) {
    if (value.schemaVersion === VTT_SESSION_SCHEMA_VERSION) return decodeJournalDagBundle(value);
    if (
      (value.schemaVersion !== 7 && value.schemaVersion !== 8 && value.schemaVersion !== 9) ||
      typeof value.sessionId !== 'string' ||
      typeof value.fingerprint !== 'string'
    ) throw new TypeError('Saved VTT session journal DAG header is malformed.');
    const legacySchemaVersion = value.schemaVersion;
    const legacyBody = {
      format: JOURNAL_DAG_FORMAT,
      schemaVersion: legacySchemaVersion,
      sessionId: value.sessionId,
      nodes: value.nodes,
      revisions: value.revisions,
    };
    if (sha256(canonicalJson(legacyBody)) !== value.fingerprint) {
      throw new SessionFingerprintMismatchError();
    }
    const expandedLegacyBody = {
      format: 'vtt-session-revisions',
      schemaVersion: legacySchemaVersion,
      sessionId: value.sessionId,
      revisions: decodeJournalDagValues(value.nodes, value.revisions),
    };
    value = {
      ...expandedLegacyBody,
      fingerprint: sha256(canonicalJson(expandedLegacyBody)),
    };
  }
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

export function migrateStoredSessionRevisions(
  revisions: readonly unknown[],
): readonly SessionRevision[] {
  const first = revisions[0];
  if (
    !isRecord(first) ||
    typeof first.sessionId !== 'string' ||
    !Number.isSafeInteger(first.schemaVersion)
  ) throw new TypeError('Stored VTT session revision stream is malformed.');
  const groups: Array<{
    readonly schemaVersion: number;
    readonly revisions: unknown[];
  }> = [];
  for (const revision of revisions) {
    if (
      !isRecord(revision) ||
      revision.sessionId !== first.sessionId ||
      !Number.isSafeInteger(revision.schemaVersion)
    ) throw new TypeError('Stored VTT session revision stream is malformed.');
    const schemaVersion = revision.schemaVersion as number;
    const current = groups.at(-1);
    if (current?.schemaVersion === schemaVersion) current.revisions.push(revision);
    else groups.push({ schemaVersion, revisions: [revision] });
  }
  return groups.flatMap((group) => {
    const body = {
      format: 'vtt-session-revisions' as const,
      schemaVersion: group.schemaVersion,
      sessionId: first.sessionId,
      revisions: group.revisions,
    };
    return migrateSavedBundle({
      ...body,
      fingerprint: sha256(canonicalJson(body)),
    }).revisions;
  });
}

export function exportSavedSession(
  store: BrowserSessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId);
  if (revisions.length === 0) throw new Error('Encounter session does not exist.');
  replaySessionRevisions(revisions);
  const encoded = encodeJournalDag(revisions);
  const body: JournalDagBundleBody = {
    format: JOURNAL_DAG_FORMAT,
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId,
    ...encoded,
  };
  return canonicalJson({
    ...body,
    fingerprint: sha256(canonicalJson(body)),
    sessionRecord: deriveSessionRecord(revisions),
  } satisfies JournalDagBundle);
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
    initialSeed: latest.rngState.initialSeed,
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
      agentSession,
      encounterState,
      ...currentBody
    } = revision;
    const { hiddenRolls, ...legacyEncounterState } = encounterState;
    const body = {
      ...currentBody,
      schemaVersion: 2 as const,
      codexSessionId: agentSession?.sessionId ?? 'codex:legacy-v1-migration-fixture',
      encounterState: {
        ...legacyEncounterState,
        hideDeathSaveRolls: hiddenRolls.includes('death_saves'),
      },
    };
    return { ...body, checksum: sha256(canonicalJson(body)) };
  });
  const bundle: SavedSessionBundleV1 = {
    schemaVersion: 1,
    sessionId,
    revisions,
  };
  return canonicalJson(bundle);
}

export function exportSavedSessionV5ForMigrationTest(
  store: BrowserSessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId).map((revision) => {
    const { checksum: _checksum, agentSession, encounterState, ...currentBody } = revision;
    const { hiddenRolls, ...legacyEncounterState } = encounterState;
    const body = {
      ...currentBody,
      schemaVersion: 5 as const,
      codexSessionId: agentSession?.sessionId ?? 'codex:legacy-v5-migration-fixture',
      encounterState: {
        ...legacyEncounterState,
        hideDeathSaveRolls: hiddenRolls.includes('death_saves'),
      },
    };
    return { ...body, checksum: sha256(canonicalJson(body)) };
  });
  const body = {
    format: 'vtt-session-revisions' as const,
    schemaVersion: 5 as const,
    sessionId,
    revisions,
  };
  return canonicalJson({ ...body, fingerprint: sha256(canonicalJson(body)) });
}

export function nextBranchId(value: string): EncounterBranchId {
  return encounterBranchId(value);
}
