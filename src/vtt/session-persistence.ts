import { canonicalizeJson, canonicalJson } from '../commands/canonical-json';
import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import type { ControllerIdentity } from '../combat/controllers';
import type {
  CoordinatorPersistence,
  DurableCoordinatorTransition,
  PersistedCoordinatorState,
} from '../combat/coordinator';
import {
  awaitingPlacementPhase,
  encounterConclusionAfter,
  isEncounterConfig,
  isEncounterPhase,
  orderedMigrationPlacementQueue,
  REACTION_KINDS,
  reduceEncounter,
  type EncounterState,
  type MigrationOriginatingToken,
  type ReactionKind,
  type ReactionPolicy,
  type ResumableEncounterPhase,
} from '../combat/encounter';
import {
  creatureSpace,
  normalPlacementFor,
  placementFor,
  sizedCombatantState,
  spacesIntersect,
} from '../combat/creature-space';
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
import {
  assembleDecodedState,
  decodeAbsentTokens,
  decodeBoardTokens,
  type DecodedStateRest,
} from '../combat/token-placement';
import { assertSupportedGrid } from '../combat/grid-size';
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
import {
  repairV12EncounterState,
  v13PlacementIssues,
  type PlacementRepair,
} from './session-v13-migration';
import {
  decodeEngineBuild,
  decodeRecordedEngine,
  describeEngineBuild,
  engineBuildRelation,
  RECORDED_BEFORE_ENGINE_RECORDING,
  recordedEngineOf,
  RUNNING_ENGINE_BUILD,
  type EngineBuild,
  type EngineBuildRelation,
  type EngineCommit,
  type RecordedEngine,
} from './engine-build';
import { EncounterRuleError } from '../combat/encounter-rule-error';
import type { TestRef } from '../rules/srd/rule-status-types';
import type { JsonValue } from '../domain/models';
import {
  isAgentSessionBinding,
  isAgentCallUsage,
  type AgentCallUsage,
  type EngineDispatchId,
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

/** Every session schema version this build reads (SAVE-COMPAT §6.7). */
export const VTT_SESSION_SCHEMA_VERSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export type VttSessionSchemaVersion = (typeof VTT_SESSION_SCHEMA_VERSIONS)[number];
export const VTT_SESSION_SCHEMA_VERSION = 13 as const satisfies VttSessionSchemaVersion;
/**
 * The last session schema before revisions named the engine build that recorded them (FOOTPRINT fix1), and before
 * whole-body placement (D900): the rules archived histories keep, and the `from` of the bump-or-archive step.
 */
export const LAST_SCHEMA_BEFORE_ENGINE_RECORDING = 12 as const;
/** The first session schema a save was written as a journal DAG. */
export const JOURNAL_DAG_FIRST_SCHEMA_VERSION = 7 as const;
type MigratableVersion = Exclude<VttSessionSchemaVersion, typeof VTT_SESSION_SCHEMA_VERSION>;
type LegacyBundleVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

function isLegacyBundleVersion(version: number): version is LegacyBundleVersion {
  return Number.isSafeInteger(version) && version >= 1 && version < LAST_SCHEMA_BEFORE_ENGINE_RECORDING;
}

/** One input the loader accepted, kept exactly as it arrived (owner D919: byte for byte), and that text's sha256. */
export interface ArchivedText {
  readonly text: string;
  readonly sha256: string;
}

/**
 * What the loader accepted, kept exactly, before any parse or migration: an imported save's text, or a stored
 * stream's revisions, each as the text its store holds (IndexedDB: the decompressed JSON it wrote), in revision
 * order. Nothing here is a re-serialization.
 */
export type ArchivedSource =
  | { readonly kind: 'saved_session'; readonly save: ArchivedText }
  | { readonly kind: 'stored_stream'; readonly revisions: readonly ArchivedText[] };

/**
 * What an archived source's revisions record (FOOTPRINT fix2, codex r2 P1), read from the archived texts
 * themselves: archivedSourceRecording derives it, and nothing else is trusted to state it.
 */
export interface ArchivedSourceRecording {
  /** Every session schema version the source's revisions were recorded under, ascending. */
  readonly recordedSchemaVersions: readonly number[];
  /**
   * The engine commit the source's revisions were recorded under: the engine build each revision names inside its
   * own checksum (engine-build.ts), when they all name one commit. It is the commit tools/session-archive-replay.ts
   * replays every archived turn at. A history recorded by schema 12 or older names none:
   * 'recorded_commit_unknown', recorded_before_engine_recording.
   */
  readonly recordedEngine: RecordedEngine;
}

/**
 * FOOTPRINT (owner D919): the history of a v12-or-older save that v13 cannot express, kept byte for byte and
 * read-only. `source` holds every input the loader accepted as it arrived, each text with its sha256. It is
 * verifiable on demand under the rules it was recorded under: verifySessionHistoryArchive re-reads it with those
 * versions' integrity rules and re-derives the migrated root, and exportSessionHistoryArchive hands the texts back
 * unchanged. No old turn is re-interpreted here. The recording it states is its source's: derived when the archive
 * is made, and checked against the source whenever it is decoded (SessionHistoryArchiveMetadataError).
 */
export interface SessionHistoryArchive extends ArchivedSourceRecording {
  readonly kind: 'vtt_session_history_archive';
  readonly source: ArchivedSource;
}

export type SessionTransition =
  | { readonly kind: 'session_started' }
  | {
      /**
       * The root of a v13 stream migrated from a v12-or-older save whose history v13 cannot express (D919):
       * the repaired current state, the archived history and every repair. Nothing before it is replayed.
       */
      readonly kind: 'session_migrated';
      readonly migration: BumpOrArchiveStep['id'];
      readonly archive: SessionHistoryArchive;
      readonly placementRepair: readonly PlacementRepair[];
    }
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
      readonly kind: 'agent_session_recovery_failed';
      readonly predecessorSessionHash: string;
      readonly dispatchId: EngineDispatchId;
      readonly exit: 'cancelled' | 'timed_out' | 'infrastructure_failed';
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
  'session_migrated',
  'agent_session_started',
  'agent_session_dispatched',
  'agent_call_usage_recorded',
  'agent_session_recovered',
  'agent_session_recovery_failed',
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

/**
 * SAVE-COMPAT (owner D939, D946; supervisor D943-D945). Replaying a revision checks two kinds of thing, and a failure
 * of each means something different:
 *   a RECORDED FACT is checked against something the save itself records (a carried parent field, the transition's
 *     own payload, session-persistence's own bookkeeping): a disagreement means the save was altered after it was
 *     written, whatever build runs;
 *   a DERIVATION is checked against what the rules (party-session-state, the reducer, the pacing advance, the v12
 *     repair) derive from the recorded input: a disagreement under another build than the one that recorded the turn
 *     is indeterminate (the rules changed, or the save was altered), and under the recording build it is integrity.
 * The two label sets are closed and disjoint. A unit that makes a transition's recorded field rules-derived moves its
 * label here, in the same commit, with a witness.
 */
export const RECORDED_FACT_CHECKS = [
  'started agent binding', 'agent-start encounter state', 'agent-start coordinator state', 'agent-start party state',
  'agent-start RNG state',
  'dispatched agent binding', 'agent-dispatch encounter state', 'agent-dispatch coordinator state',
  'agent-dispatch party state', 'agent-dispatch RNG state',
  'agent call usage binding', 'agent-usage encounter state', 'agent-usage coordinator state', 'agent-usage party state',
  'agent-usage RNG state',
  'superseded agent binding', 'recovery successor binding', 'agent-recovery encounter state',
  'agent-recovery coordinator state', 'agent-recovery party state', 'agent-recovery RNG state',
  'failed agent-recovery encounter state', 'failed agent-recovery coordinator state',
  'failed agent-recovery party state', 'failed agent-recovery RNG state',
  'rollover superseded binding', 'rollover successor binding', 'agent-rollover encounter state',
  'agent-rollover coordinator state', 'agent-rollover party state', 'agent-rollover RNG state',
  'ended-session encounter state', 'ended-session coordinator state', 'ended-session party state',
  'ended-session RNG state',
  'party-capture encounter state', 'party-capture coordinator state', 'party-capture RNG state',
  'Short Rest encounter state', 'Short Rest coordinator state',
  'Long Rest encounter state', 'Long Rest coordinator state', 'Long Rest RNG state',
  'room-composition RNG state',
  'preloaded party Hit Points', 'preloaded party life state', 'preloaded party death state',
  'preloaded party spell slots', 'preloaded party limited resources',
  'skipped-turn party state', 'skipped-turn coordinator state',
  'delayed-turn party state', 'delayed-turn coordinator state',
  'head-move encounter state', 'head-move coordinator state', 'head-move party state', 'head-move RNG state',
  'reaction preference RNG state',
  'refusal-handling encounter state', 'refusal-handling coordinator state', 'refusal-handling RNG state',
  'reducer party state',
  'coordinator encounter state', 'coordinator RNG state', 'coordinator party state',
  'unchanged agent binding',
] as const;

export const DERIVATION_CHECKS = [
  'captured party state', 'rest-interruption party state', 'Short Rest party state', 'Short Rest rolls',
  'Short Rest RNG state', 'Long Rest party state', 'Long Rest summary', 'advanced room party state',
  'advanced room ordinal', 'skipped-turn state', 'skipped-turn events', 'skipped-turn RNG state',
  'delayed-turn reposition', 'delayed-turn state', 'delayed-turn events', 'delayed-turn RNG state',
  'reaction preference party state', 'reaction preference encounter state', 'refusal-handling party state',
  'reducer state', 'reducer events', 'reducer RNG state', 'migrated root',
] as const;

export type RecordedFactCheck = (typeof RECORDED_FACT_CHECKS)[number];
export type DerivationCheck = (typeof DERIVATION_CHECKS)[number];
const DISJOINT_CHECKS: [Extract<RecordedFactCheck, DerivationCheck>] extends [never] ? true : never = true;
void DISJOINT_CHECKS;

/** The transitions whose replay re-derives a recorded result under the running rules. */
export const DERIVED_TRANSITIONS = [
  'party_state_captured', 'short_rest_completed', 'long_rest_completed', 'room_composed', 'turn_skipped',
  'turn_delayed', 'reaction_preference_changed', 'refusal_handling_changed', 'reducer_applied',
] as const satisfies readonly SessionTransition['kind'][];
export type DerivedTransitionKind = (typeof DERIVED_TRANSITIONS)[number];

/** How a derivation failed: the rules derived something else, or refused the recorded input outright. */
export type DerivationFailure =
  | { readonly kind: 'derivation_differs'; readonly check: DerivationCheck }
  /** Only an EncounterRuleError (a typed rules refusal): `${error.name}: ${error.message}`. */
  | { readonly kind: 'rules_refused_recorded_input'; readonly check: DerivationCheck; readonly error: string };

/** What a hash that does not match covers. */
export const SESSION_HASH_SUBJECTS = [
  'bundle_fingerprint', 'revision_checksum', 'branch_rng_fingerprint', 'legacy_revision_checksum',
  'recorded_build_checksum',
] as const;
export type SessionHashSubject = (typeof SESSION_HASH_SUBJECTS)[number];

/** Why a save fails its own integrity: whatever build runs, it is not what a build wrote. */
export type SessionIntegrityFault =
  | {
      readonly kind: 'recorded_fact_disagreement';
      readonly revision: number;
      readonly transition: SessionTransition['kind'];
      readonly check: RecordedFactCheck;
    }
  | {
      readonly kind: 'same_build_rederivation';
      readonly revision: number;
      readonly transition: DerivedTransitionKind | 'session_migrated';
      readonly check: DerivationCheck;
      readonly failure: DerivationFailure;
      readonly build: EngineCommit;
    }
  | {
      readonly kind: 'hash_mismatch';
      readonly subject: SessionHashSubject;
      readonly revision: number | null;
      readonly detail: string;
    }
  | { readonly kind: 'schema_violation'; readonly detail: string }
  | { readonly kind: 'sequence_violation'; readonly detail: string }
  | { readonly kind: 'archive_refused'; readonly detail: string };

function derivationFailureText(failure: DerivationFailure): string {
  switch (failure.kind) {
    case 'derivation_differs': return failure.check;
    case 'rules_refused_recorded_input': return `${failure.check}: ${failure.error}`;
  }
}

function integrityMessage(fault: SessionIntegrityFault): string {
  switch (fault.kind) {
    case 'same_build_rederivation':
      return `Save refused: turn ${String(fault.revision)} (${fault.transition}) does not play out as recorded under ` +
        `${describeEngineBuild({ kind: 'engine_commit', commit: fault.build })}, the build that recorded it ` +
        `(${derivationFailureText(fault.failure)}). The save was altered after it was written, or this build is not ` +
        'deterministic.';
    case 'recorded_fact_disagreement':
      return `Save refused: turn ${String(fault.revision)} (${fault.transition}) disagrees with its own recorded ` +
        `history (${fault.check}). The save was altered after it was written.`;
    case 'hash_mismatch':
      return `Save refused: ${fault.detail} The save was altered or damaged after it was written.`;
    case 'schema_violation':
      return `Save refused: ${fault.detail} The save does not match the session format this build reads: it was ` +
        'altered after it was written, or written by a build whose format this build does not read.';
    case 'sequence_violation':
      return `Save refused: ${fault.detail} Its revision chain is broken: it was altered or damaged after it was written.`;
    case 'archive_refused':
      return `Save refused: ${fault.detail}`;
  }
}

/** A save that fails its own integrity (D943): never the cross-build refusal, whatever build runs. */
export class SessionIntegrityError extends Error {
  override readonly name = 'SessionIntegrityError' as const;

  constructor(readonly fault: SessionIntegrityFault) {
    super(integrityMessage(fault));
  }
}

function hashMismatch(subject: SessionHashSubject, revision: number | null, detail: string): SessionIntegrityError {
  return new SessionIntegrityError({ kind: 'hash_mismatch', subject, revision, detail });
}

function schemaViolation(detail: string): SessionIntegrityError {
  return new SessionIntegrityError({ kind: 'schema_violation', detail });
}

function sequenceViolation(detail: string): SessionIntegrityError {
  return new SessionIntegrityError({ kind: 'sequence_violation', detail });
}

/** The revision number a raw (pre-decode) revision states, when it states one. */
function statedRevision(value: unknown): number | null {
  return isRecord(value) && Number.isSafeInteger(value.revision) ? value.revision as number : null;
}

/** A turn another build recorded that the build running now does not reproduce (owner D939, D946). */
export interface RecordedByOtherBuild {
  readonly revision: number;
  readonly transition: DerivedTransitionKind | 'session_migrated';
  readonly relation: Exclude<EngineBuildRelation, { readonly kind: 'same_commit' }>;
  readonly failure: DerivationFailure;
}

/** The builds a cross-build relation names, as EngineBuilds. */
function relationBuilds(
  relation: RecordedByOtherBuild['relation'],
): { readonly recorded: EngineBuild; readonly running: EngineBuild } {
  switch (relation.kind) {
    case 'other_commit':
      return {
        recorded: { kind: 'engine_commit', commit: relation.recorded },
        running: { kind: 'engine_commit', commit: relation.running },
      };
    case 'unrecorded':
      return { recorded: relation.recorded, running: relation.running };
  }
}

function recordedByOtherBuildMessage(refusal: RecordedByOtherBuild): string {
  const { recorded, running } = relationBuilds(refusal.relation);
  const decider = recorded.kind === 'engine_commit'
    ? ' Replaying the save at the recording build (tools/session-archive-replay.ts --save) tells which; export a ' +
      'browser save first.'
    : ' The recording build names no commit, so the offline replay (tools/session-archive-replay.ts --save) cannot ' +
      'tell which either.';
  return `Save refused: turn ${String(refusal.revision)} (${refusal.transition}) was recorded by ` +
    `${describeEngineBuild(recorded)} and cannot be verified by ${describeEngineBuild(running)}, the build running ` +
    `now: under this build that turn does not play out as recorded (${derivationFailureText(refusal.failure)}). ` +
    'Either the rules changed between these builds or the save was altered after it was recorded; this build cannot ' +
    `tell which.${decider}`;
}

/**
 * The typed refusal of a turn another build recorded (owner D939, D946): it names both builds, says that either the
 * rules changed or the save was altered and that this build cannot tell which, and points to the offline replay at
 * the recording build, which can.
 */
export class SessionRecordedByOtherBuildError extends Error {
  override readonly name = 'SessionRecordedByOtherBuildError' as const;

  constructor(readonly refusal: RecordedByOtherBuild) {
    super(recordedByOtherBuildMessage(refusal));
  }
}

/**
 * A derivation of revision `revision` failed. The build that recorded THAT revision decides (D943): the build running
 * now recorded it, so it is integrity; another build (or either side unrecorded), so it is the cross-build refusal.
 */
function derivationFailed(
  revision: SessionRevision,
  transition: DerivedTransitionKind | 'session_migrated',
  failure: DerivationFailure,
  running: EngineBuild,
): SessionIntegrityError | SessionRecordedByOtherBuildError {
  const relation = engineBuildRelation(revision.recordedBy, running);
  if (relation.kind === 'same_commit') {
    return new SessionIntegrityError({
      kind: 'same_build_rederivation', revision: revision.revision, transition, check: failure.check, failure,
      build: relation.commit,
    });
  }
  return new SessionRecordedByOtherBuildError({ revision: revision.revision, transition, relation, failure });
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
  /** The engine build that recorded this revision (FOOTPRINT fix1): the rules it was recorded under. */
  readonly recordedBy: EngineBuild;
}

export interface SessionRevision extends SessionRevisionBody {
  readonly checksum: string;
}

declare const replayVerified: unique symbol;

/**
 * Revisions a strict replay under the build it names verified (SAVE-COMPAT C3, D944 "persisted only after a strict
 * replay"): the only thing a store takes in bulk. Minted only by replayVerifiedRevisions; its key is never exported,
 * so no other code can build one, and ast-grep no-session-proof-cast forbids casting to it.
 */
export type ReplayVerifiedRevisions = readonly SessionRevision[] & { readonly [replayVerified]: EngineBuild };

/** Strictly replays `revisions` under `running` (typed throws), then brands them verified: the only mint. */
export function replayVerifiedRevisions(
  revisions: readonly SessionRevision[],
  running: EngineBuild,
): ReplayVerifiedRevisions {
  replayRevisions(revisions, running, 'strict');
  return revisions as ReplayVerifiedRevisions;
}

declare const journalRecorded: unique symbol;

/** A revision the journal recorded (EncounterSessionJournal's #append is its only mint): the only single append. */
export type JournalRecordedRevision = SessionRevision & { readonly [journalRecorded]: true };

export interface SessionStore {
  /** The engine build this store records new revisions with: a journal's appends and a migration's root. */
  readonly recordingEngine: EngineBuild;
  append(revision: JournalRecordedRevision): void;
  appendAll(revisions: ReplayVerifiedRevisions): void;
  revisions(sessionId: EncounterSessionId): readonly SessionRevision[];
  flush(): Promise<void>;
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
      throw sequenceViolation('Session revision stream is not contiguous.');
    }
    if (
      revision.parentRevision !== null &&
      (!seen.has(revision.parentRevision) || revision.parentRevision >= revision.revision)
    ) {
      throw sequenceViolation('Session revision parent is outside the preceding stream.');
    }
    seen.add(revision.revision);
  }
}

const seedTrustedHistory: unique symbol = Symbol('seedTrustedHistory');

export class MemoryBrowserSessionStore implements SessionStore {
  readonly #bySession = new Map<EncounterSessionId, SessionRevision[]>();

  /**
   * Module-private, trust mode only: a relaxed load's history, which no strict replay verified, seeds the fresh store
   * its relaxed journal records into; it never reaches a durable store (owner D941).
   */
  [seedTrustedHistory](revisions: readonly SessionRevision[]): void {
    const first = revisions[0];
    if (first === undefined) return;
    verifyRevisionSequence(revisions, first.sessionId);
    for (const revision of revisions) this.#appendChecked(revision);
  }

  constructor(readonly recordingEngine: EngineBuild = RUNNING_ENGINE_BUILD) {}

  append(revision: JournalRecordedRevision): void {
    this.#appendChecked(revision);
  }

  #appendChecked(revision: SessionRevision): void {
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

  appendAll(revisions: ReplayVerifiedRevisions): void {
    if (revisions.length === 0) return;
    const sessionId = revisions[0]!.sessionId;
    if (this.revisions(sessionId).length !== 0) {
      throw new Error('Browser store import target already exists.');
    }
    verifyRevisionSequence(revisions, sessionId);
    for (const revision of revisions) this.#appendChecked(revision);
  }

  revisions(sessionId: EncounterSessionId): readonly SessionRevision[] {
    return [...(this.#bySession.get(sessionId) ?? [])];
  }

  async flush(): Promise<void> {}
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
    throw schemaViolation('Malformed VTT session transition.');
  }
  if (!SESSION_TRANSITION_KINDS.includes(value.kind as SessionTransition['kind'])) {
    throw schemaViolation(`Unknown VTT session transition kind ${value.kind}.`);
  }
  switch (value.kind as SessionTransition['kind']) {
    case 'session_started':
      if (hasExactlyKeys(value, ['kind'])) return { kind: 'session_started' };
      break;
    case 'session_migrated':
      if (
        hasExactlyKeys(value, ['kind', 'migration', 'archive', 'placementRepair']) &&
        value.migration === VTT_SESSION_MIGRATION_CHAIN[LAST_SCHEMA_BEFORE_ENGINE_RECORDING].id &&
        Array.isArray(value.placementRepair) && value.placementRepair.every(isRecord)
      ) {
        const archive = decodeSessionHistoryArchive(value.archive);
        if (archive.recordedSchemaVersions.some((version) => version > LAST_SCHEMA_BEFORE_ENGINE_RECORDING)) {
          throw new SessionHistoryArchiveError('A migrated root archives a history of session schema 12 or older.');
        }
        return value as unknown as SessionTransition;
      }
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
    case 'agent_session_recovery_failed':
      if (
        hasExactlyKeys(value, ['kind', 'predecessorSessionHash', 'dispatchId', 'exit']) &&
        typeof value.predecessorSessionHash === 'string' && /^[a-f0-9]{64}$/u.test(value.predecessorSessionHash) &&
        typeof value.dispatchId === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._-]{15,199}$/u.test(value.dispatchId) &&
        (value.exit === 'cancelled' || value.exit === 'timed_out' || value.exit === 'infrastructure_failed')
      ) return value as Extract<SessionTransition, { readonly kind: 'agent_session_recovery_failed' }>;
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
  throw schemaViolation(`Malformed VTT session transition ${value.kind}.`);
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
    !Array.isArray(value.encounterState.observationHistory) ||
    typeof value.branchRngStateFingerprint !== 'string' ||
    !(value.partyState === null || isRecord(value.partyState)) ||
    !isRecord(value.rngState) ||
    !isRecord(value.coordinatorState) ||
    !Array.isArray(value.controllers) ||
    !(value.agentSession === null || isAgentSessionBinding(value.agentSession)) ||
    typeof value.checksum !== 'string'
  ) {
    throw schemaViolation('Malformed VTT session revision.');
  }
  decodeEngineBuild(value.recordedBy, 'VTT session revision recordedBy');
  const bounds = value.encounterState.bounds;
  if (!isRecord(bounds)) throw schemaViolation('Persisted encounter bounds are malformed.');
  const grid = { columns: bounds.columns, rows: bounds.rows };
  assertSupportedGrid(grid);
  const transition = decodeTransition(value.transition);
  const partyState = value.partyState === null
    ? null
    : decodePartySessionState(value.partyState);
  if (!Array.isArray(value.encounterState.combatants)) {
    throw schemaViolation('Persisted encounter combatants are malformed.');
  }
  const encounterCombatants = value.encounterState.combatants.map((combatant) => {
    if (!isRecord(combatant)) throw schemaViolation('Persisted encounter combatant is malformed.');
    if (!Object.hasOwn(combatant, 'wildShapeUses')) {
      throw schemaViolation('Persisted encounter combatant lacks Wild Shape use state.');
    }
    if (!Object.hasOwn(combatant, 'deathAt')) {
      throw schemaViolation('Persisted encounter combatant lacks a typed time of death.');
    }
    if (combatant.deathAt !== null && (
      !isRecord(combatant.deathAt) ||
      !hasExactlyKeys(combatant.deathAt, ['round', 'initiativeIndex']) ||
      !Number.isSafeInteger(combatant.deathAt.round) ||
      !Number.isSafeInteger(combatant.deathAt.initiativeIndex) ||
      (combatant.deathAt.round as number) < 0 ||
      (combatant.deathAt.initiativeIndex as number) < 0
    )) {
      throw schemaViolation('Persisted encounter combatant time of death is malformed.');
    }
    const wildShapeUses = combatant.wildShapeUses === null
      ? null
      : decodeWildShapeUseState(combatant.wildShapeUses);
    return Object.hasOwn(combatant, 'wildShape')
      ? { ...combatant, wildShapeUses, wildShape: decodeWildShapeOverlay(combatant.wildShape) }
      : { ...combatant, wildShapeUses };
  });
  const observationKeys = new Set<string>();
  const observationHistory = value.encounterState.observationHistory.map((entry) => {
    if (!isRecord(entry) || !hasExactlyKeys(entry, ['observer', 'subject', 'cell', 'round', 'revision']) ||
      typeof entry.observer !== 'string' || typeof entry.subject !== 'string' || entry.observer === entry.subject ||
      !isRecord(entry.cell) || !hasExactlyKeys(entry.cell, ['column', 'row']) ||
      !Number.isSafeInteger(entry.cell.column) || (entry.cell.column as number) < 0 ||
      !Number.isSafeInteger(entry.cell.row) || (entry.cell.row as number) < 0 ||
      !Number.isSafeInteger(entry.round) || (entry.round as number) < 0 ||
      !Number.isSafeInteger(entry.revision) || (entry.revision as number) < 0) {
      throw schemaViolation('Persisted combatant observation is malformed.');
    }
    const key = `${entry.observer}\u0000${entry.subject}`;
    if (observationKeys.has(key)) throw schemaViolation('Persisted combatant observations duplicate an observer-subject pair.');
    observationKeys.add(key);
    return structuredClone(entry) as unknown as EncounterState['observationHistory'][number];
  });
  const orderedObservationKeys = observationHistory.map((entry) => `${String(entry.observer)}\u0000${String(entry.subject)}`);
  if (orderedObservationKeys.some((key, index) => index > 0 && key.localeCompare(orderedObservationKeys[index - 1]!) < 0)) {
    throw schemaViolation('Persisted combatant observations are not canonical.');
  }
  // The decoded state holds minted tokens, not the loaded ones (D895, D900): each board body is checked
  // whole against the grid and the decoded combatants' effective sizes; an absent token keeps an
  // anchor-only return origin. The rest holds no token field, so it is the only cast.
  const rest = {
    ...value.encounterState,
    combatants: encounterCombatants,
    observationHistory,
  } as unknown as DecodedStateRest;
  const encounterState = assembleDecodedState(
    rest,
    decodeBoardTokens({ ...rest, bounds: grid }, value.encounterState.tokens, 'Persisted encounter tokens'),
    Object.hasOwn(value.encounterState, 'absentTokens')
      ? decodeAbsentTokens(grid, value.encounterState.absentTokens, 'Persisted encounter absentTokens')
      : undefined,
  );
  if (branchRngStateFingerprint(encounterState) !== value.branchRngStateFingerprint) {
    throw hashMismatch('branch_rng_fingerprint', value.revision as number, 'Persisted VTT branch RNG state fingerprint mismatch.');
  }
  // Every other field was checked above; it holds no token, so its record is the only cast here.
  const revisionRest = value as unknown as Omit<SessionRevisionBody, 'transition' | 'encounterState' | 'partyState'> & {
    readonly checksum: string;
  };
  const revision: SessionRevision = { ...revisionRest, transition, encounterState, partyState };
  const { checksum: _checksum, ...body } = revision;
  if (revisionChecksum(body) !== revision.checksum) {
    throw hashMismatch('revision_checksum', revision.revision, 'VTT session revision checksum mismatch.');
  }
  return revision;
}

function mechanicalBranchState(encounterState: DecodedStateRest): unknown {
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

function branchRngStateFingerprint(encounterState: DecodedStateRest): string {
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

/** The first preloaded-party check a composed room fails against `party`, or null when it holds every one. */
function encounterPartyMismatch(
  encounter: EncounterState,
  party: PartySessionState,
): Extract<RecordedFactCheck, `preloaded party ${string}`> | null {
  const playerCharacters = encounter.combatants.filter(
    (subject) => subject.profile.kind === 'player_character',
  );
  if (playerCharacters.length !== party.characters.length) {
    throw new Error('Composed room does not contain the persisted party.');
  }
  const differs = (actual: unknown, expected: unknown): boolean => canonicalJson(actual) !== canonicalJson(expected);
  for (const persisted of party.characters) {
    const subject = playerCharacters.find((candidate) => candidate.profile.id === persisted.combatantId);
    if (subject === undefined) throw new Error('Composed room omitted a persisted party character.');
    if (differs(subject.hitPoints, persisted.currentHitPoints)) return 'preloaded party Hit Points';
    if (differs(subject.life, persisted.life)) return 'preloaded party life state';
    if (differs(subject.deathSaves, persisted.deathSaves)) return 'preloaded party death state';
    if (differs(
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
    )) return 'preloaded party spell slots';
    if (differs(subject.limitedResources ?? [], persisted.limitedResources)) return 'preloaded party limited resources';
  }
  return null;
}

/**
 * How a replay treats derivations (SAVE-COMPAT C5, owner D941): `strict` re-derives every one under the running rules;
 * `trust` (trust-recorded-history, tests only) skips every derivation without calling the rules and still checks every
 * recorded fact (D944, D945 SQ1).
 */
type ReplayMode = 'strict' | 'trust';

/** What the rules derive from a recorded input: the value, their typed refusal of it, or (trust mode) not asked. */
type Derived<T> =
  | { readonly kind: 'derived'; readonly value: T }
  | { readonly kind: 'refused'; readonly failure: DerivationFailure }
  | { readonly kind: 'trusted' };

/**
 * Runs a rules derivation. Only a typed rules refusal (EncounterRuleError) is a refusal of the recorded input
 * (P1-2); any other throw is not the rules deciding and propagates as it is. In trust mode the rules are not called.
 */
function derive<T>(mode: 'strict', check: DerivationCheck, compute: () => T): Exclude<Derived<T>, { readonly kind: 'trusted' }>;
function derive<T>(mode: ReplayMode, check: DerivationCheck, compute: () => T): Derived<T>;
function derive<T>(mode: ReplayMode, check: DerivationCheck, compute: () => T): Derived<T> {
  if (mode === 'trust') return { kind: 'trusted' };
  try {
    return { kind: 'derived', value: compute() };
  } catch (error) {
    if (!(error instanceof EncounterRuleError)) throw error;
    return { kind: 'refused', failure: { kind: 'rules_refused_recorded_input', check, error: `${error.name}: ${error.message}` } };
  }
}

function derivedPart<T, U>(derived: Derived<T>, part: (value: T) => U): Derived<U> {
  return derived.kind === 'derived' ? { kind: 'derived', value: part(derived.value) } : derived;
}

/** What replaying one revision established: every check held, or (trust mode) its derivations were not asked. */
type RevisionVerdict = 'verified' | 'derivation_trusted';

/**
 * Replays one revision against its declared parent. Every transition kind has its case (a kind without one is a
 * compile error: the function would lack an ending return). Recorded facts are checked with `recorded`, rules
 * derivations with `derived` (§5.1's classification); structural faults stay plain Errors (D945 SQ4).
 */
function replayTransition(
  revision: SessionRevision,
  transition: SessionTransition,
  parent: SessionRevision | null | undefined,
  running: EngineBuild,
  mode: ReplayMode,
): RevisionVerdict {
  let trusted = false;
  const verdict = (): RevisionVerdict => trusted ? 'derivation_trusted' : 'verified';
  const recorded = (actual: unknown, expected: unknown, check: RecordedFactCheck): void => {
    if (canonicalJson(actual) !== canonicalJson(expected)) {
      throw new SessionIntegrityError({
        kind: 'recorded_fact_disagreement', revision: revision.revision, transition: transition.kind, check,
      });
    }
  };
  const derived = <T>(
    kind: DerivedTransitionKind,
    result: Derived<T>,
    recordedValue: unknown,
    check: DerivationCheck,
  ): void => {
    if (result.kind === 'trusted') {
      trusted = true;
      return;
    }
    if (result.kind === 'refused') throw derivationFailed(revision, kind, result.failure, running);
    if (canonicalJson(recordedValue) !== canonicalJson(result.value)) {
      throw derivationFailed(revision, kind, { kind: 'derivation_differs', check }, running);
    }
  };
  switch (transition.kind) {
    case 'session_migrated':
      // D919: the root of a migrated save. Its state is the repaired current state of the archived history,
      // which v13 does not replay; the archive is verified on demand (verifySessionHistoryArchive).
      if (revision.revision !== 1 || parent !== null) {
        throw new Error('session_migrated may only be the first revision.');
      }
      return verdict();
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
      return verdict();
    case 'agent_session_started':
      if (parent === null || parent === undefined || parent.agentSession !== null) {
        throw new Error('agent_session_started requires an unbound parent revision.');
      }
      recorded(revision.agentSession, transition.binding, 'started agent binding');
      if (
        transition.binding.status !== 'active' ||
        transition.binding.generation !== 0 ||
        transition.binding.predecessorSessionHash !== null ||
        transition.binding.startedAtRevision !== revision.revision ||
        transition.binding.lastDispatchedRevision !== 0
      ) throw new Error('Initial agent session binding is malformed.');
      recorded(revision.encounterState, parent.encounterState, 'agent-start encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'agent-start coordinator state');
      recorded(revision.partyState, parent.partyState, 'agent-start party state');
      recorded(revision.rngState, parent.rngState, 'agent-start RNG state');
      return verdict();
    case 'agent_session_dispatched':
      if (parent === null || parent === undefined || parent.agentSession === null) {
        throw new Error('agent_session_dispatched requires an active binding.');
      }
      if (
        parent.agentSession.status !== 'active' ||
        transition.dispatchedRevision !== parent.revision
      ) throw new Error('Agent dispatch revision does not identify its active parent.');
      recorded(
        revision.agentSession,
        { ...parent.agentSession, lastDispatchedRevision: transition.dispatchedRevision },
        'dispatched agent binding',
      );
      recorded(revision.encounterState, parent.encounterState, 'agent-dispatch encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'agent-dispatch coordinator state');
      recorded(revision.partyState, parent.partyState, 'agent-dispatch party state');
      recorded(revision.rngState, parent.rngState, 'agent-dispatch RNG state');
      return verdict();
    case 'agent_call_usage_recorded':
      if (parent === null || parent === undefined || parent.agentSession === null ||
        parent.agentSession.status !== 'active') {
        throw new Error('agent_call_usage_recorded requires an active binding.');
      }
      if (transition.usage.ordinal !== parent.agentSession.callUsage.length + 1) {
        throw new Error('Recorded agent call usage ordinal is not contiguous.');
      }
      recorded(
        revision.agentSession,
        {
          ...parent.agentSession,
          callUsage: [...parent.agentSession.callUsage, transition.usage],
          currentContextTokens: transition.usage.contextInputTokens,
        },
        'agent call usage binding',
      );
      recorded(revision.encounterState, parent.encounterState, 'agent-usage encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'agent-usage coordinator state');
      recorded(revision.partyState, parent.partyState, 'agent-usage party state');
      recorded(revision.rngState, parent.rngState, 'agent-usage RNG state');
      return verdict();
    case 'agent_session_recovered':
      if (parent === null || parent === undefined || parent.agentSession === null) {
        throw new Error('agent_session_recovered requires a failed active binding.');
      }
      recorded(
        transition.failedBinding,
        { ...parent.agentSession, status: 'superseded_after_resume_failure' },
        'superseded agent binding',
      );
      recorded(revision.agentSession, transition.binding, 'recovery successor binding');
      if (
        transition.binding.cli !== parent.agentSession.cli ||
        transition.binding.status !== 'active' ||
        transition.binding.generation !== parent.agentSession.generation + 1 ||
        transition.binding.startedAtRevision !== revision.revision ||
        transition.binding.lastDispatchedRevision !== 0 ||
        transition.binding.predecessorSessionHash === null
      ) throw new Error('Agent recovery successor is malformed.');
      recorded(revision.encounterState, parent.encounterState, 'agent-recovery encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'agent-recovery coordinator state');
      recorded(revision.partyState, parent.partyState, 'agent-recovery party state');
      recorded(revision.rngState, parent.rngState, 'agent-recovery RNG state');
      return verdict();
    case 'agent_session_recovery_failed':
      if (parent === null || parent === undefined || parent.agentSession === null) {
        throw new Error('agent_session_recovery_failed requires an active predecessor binding.');
      }
      recorded(revision.encounterState, parent.encounterState, 'failed agent-recovery encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'failed agent-recovery coordinator state');
      recorded(revision.partyState, parent.partyState, 'failed agent-recovery party state');
      recorded(revision.rngState, parent.rngState, 'failed agent-recovery RNG state');
      return verdict();
    case 'agent_session_rolled_over':
      if (parent === null || parent === undefined || parent.agentSession === null ||
        parent.agentSession.currentContextTokens === null) {
        throw new Error('agent_session_rolled_over requires an active binding with measured usage.');
      }
      recorded(
        transition.supersededBinding,
        { ...parent.agentSession, status: 'superseded_after_context_rollover' },
        'rollover superseded binding',
      );
      recorded(revision.agentSession, transition.binding, 'rollover successor binding');
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
      recorded(revision.encounterState, parent.encounterState, 'agent-rollover encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'agent-rollover coordinator state');
      recorded(revision.partyState, parent.partyState, 'agent-rollover party state');
      recorded(revision.rngState, parent.rngState, 'agent-rollover RNG state');
      return verdict();
    case 'session_ended':
      if (parent === null || parent === undefined) {
        throw new Error('session_ended requires a parent revision.');
      }
      recorded(revision.encounterState, parent.encounterState, 'ended-session encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'ended-session coordinator state');
      recorded(revision.partyState, parent.partyState, 'ended-session party state');
      recorded(revision.rngState, parent.rngState, 'ended-session RNG state');
      return verdict();
    case 'party_state_captured': {
      if (parent === null || parent === undefined || parent.partyState === null) {
        throw new Error('Party capture requires an existing party session state.');
      }
      const parentParty = parent.partyState;
      recorded(revision.encounterState, parent.encounterState, 'party-capture encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'party-capture coordinator state');
      recorded(revision.rngState, parent.rngState, 'party-capture RNG state');
      const interruption = transition.restInterruption;
      if (interruption === undefined) {
        derived(transition.kind, derive(mode, 'captured party state', () =>
          capturePartySessionState(parentParty, parent.encounterState)), revision.partyState, 'captured party state');
      } else {
        derived(transition.kind, derive(mode, 'rest-interruption party state', () =>
          interruptLongRest(parentParty, interruption.outcome).state), revision.partyState, 'rest-interruption party state');
      }
      return verdict();
    }
    case 'short_rest_completed': {
      if (parent === null || parent === undefined || parent.partyState === null) {
        throw new Error('A Short Rest requires an existing party session state.');
      }
      const parentParty = parent.partyState;
      const rested = derive(mode, 'Short Rest party state', () => {
        const restRng = restoreMulberry32(parent.rngState);
        const result = takeShortRest(parentParty, transition.spends, restRng);
        return { state: result.state, rolls: result.rolls, rng: restRng.snapshot() };
      });
      recorded(revision.encounterState, parent.encounterState, 'Short Rest encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'Short Rest coordinator state');
      derived(transition.kind, derivedPart(rested, (value) => value.state), revision.partyState, 'Short Rest party state');
      derived(transition.kind, derivedPart(rested, (value) => value.rolls), transition.rolls, 'Short Rest rolls');
      derived(transition.kind, derivedPart(rested, (value) => value.rng), revision.rngState, 'Short Rest RNG state');
      return verdict();
    }
    case 'long_rest_completed': {
      if (parent === null || parent === undefined || parent.partyState === null) {
        throw new Error('A Long Rest requires an existing party session state.');
      }
      const parentParty = parent.partyState;
      const rested = derive(mode, 'Long Rest party state', () => takeLongRest(parentParty));
      recorded(revision.encounterState, parent.encounterState, 'Long Rest encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'Long Rest coordinator state');
      derived(transition.kind, derivedPart(rested, (value) => value.state), revision.partyState, 'Long Rest party state');
      derived(transition.kind, derivedPart(rested, (value) => value.summary), transition.summary, 'Long Rest summary');
      recorded(revision.rngState, parent.rngState, 'Long Rest RNG state');
      return verdict();
    }
    case 'room_composed': {
      if (parent === null || parent === undefined || parent.partyState === null) {
        throw new Error('Room composition requires an existing party session state.');
      }
      const parentParty = parent.partyState;
      const advanced = derive(mode, 'advanced room party state', () => enterNextRoom(parentParty));
      derived(transition.kind, advanced, revision.partyState, 'advanced room party state');
      recorded(revision.rngState, parent.rngState, 'room-composition RNG state');
      derived(transition.kind, derivedPart(advanced, (value) => value.room), transition.room, 'advanced room ordinal');
      if (revision.partyState === null) throw new Error('A composed room records no party state.');
      const mismatch = encounterPartyMismatch(revision.encounterState, revision.partyState);
      if (mismatch !== null) {
        throw new SessionIntegrityError({
          kind: 'recorded_fact_disagreement', revision: revision.revision, transition: transition.kind, check: mismatch,
        });
      }
      return verdict();
    }
    case 'turn_skipped': {
      if (parent === null || parent === undefined) throw new Error('A skipped turn requires a parent.');
      if (
        parent.encounterState.activeCombatant !== transition.combatant ||
        parent.encounterState.round !== transition.round
      ) throw new Error('Skipped-turn metadata disagrees with its parent state.');
      const replayed = derive(mode, 'skipped-turn state', () => {
        const replayRng = restoreMulberry32(parent.rngState);
        const advance = advanceSkippedTurn(parent.encounterState, replayRng);
        return { ...advance, rng: replayRng.snapshot() };
      });
      derived(transition.kind, derivedPart(replayed, (value) => value.encounterState), revision.encounterState, 'skipped-turn state');
      derived(transition.kind, derivedPart(replayed, (value) => value.events), transition.events, 'skipped-turn events');
      derived(transition.kind, derivedPart(replayed, (value) => value.rng), revision.rngState, 'skipped-turn RNG state');
      recorded(revision.partyState, parent.partyState, 'skipped-turn party state');
      recorded(
        revision.coordinatorState,
        pacingCoordinatorState(parent.coordinatorState),
        'skipped-turn coordinator state',
      );
      return verdict();
    }
    case 'turn_delayed': {
      if (parent === null || parent === undefined) throw new Error('A delayed turn requires a parent.');
      if (
        parent.encounterState.activeCombatant !== transition.combatant ||
        parent.encounterState.round !== transition.round
      ) throw new Error('Delayed-turn metadata disagrees with its parent state.');
      const replayed = derive(mode, 'delayed-turn reposition', () => {
        const replayRng = restoreMulberry32(parent.rngState);
        const advance = advanceDelayedTurn(parent.encounterState, transition.afterCombatant, replayRng);
        return { ...advance, rng: replayRng.snapshot() };
      });
      derived(
        transition.kind,
        derivedPart(replayed, (value) => ({ fromIndex: value.fromIndex, toIndex: value.toIndex })),
        { fromIndex: transition.fromIndex, toIndex: transition.toIndex },
        'delayed-turn reposition',
      );
      derived(transition.kind, derivedPart(replayed, (value) => value.encounterState), revision.encounterState, 'delayed-turn state');
      derived(transition.kind, derivedPart(replayed, (value) => value.events), transition.events, 'delayed-turn events');
      derived(transition.kind, derivedPart(replayed, (value) => value.rng), revision.rngState, 'delayed-turn RNG state');
      recorded(revision.partyState, parent.partyState, 'delayed-turn party state');
      recorded(
        revision.coordinatorState,
        pacingCoordinatorState(parent.coordinatorState),
        'delayed-turn coordinator state',
      );
      return verdict();
    }
    case 'head_moved': {
      if (parent === null || parent === undefined) {
        throw new Error('A head move requires a target parent.');
      }
      recorded(revision.encounterState, parent.encounterState, 'head-move encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'head-move coordinator state');
      recorded(revision.partyState, parent.partyState, 'head-move party state');
      recorded(revision.rngState, deriveBranchRng(parent, revision.branchId).snapshot(), 'head-move RNG state');
      return verdict();
    }
    case 'reaction_preference_changed': {
      if (parent === null || parent === undefined || parent.partyState === null) {
        throw new Error('A reaction preference revision requires party state.');
      }
      const parentParty = parent.partyState;
      const changed = derive(mode, 'reaction preference party state', () => {
        const party = setPartyReactionPolicy(parentParty, transition.combatant, transition.reactionKind, transition.policy);
        const partyIds = new Set(party.characters.map((entry) => entry.combatantId));
        const encounter = {
          ...parent.encounterState,
          reactionPolicies: [
            ...parent.encounterState.reactionPolicies.filter((entry) => !partyIds.has(entry.combatant)),
            ...party.reactionPolicies,
          ],
        };
        return { party, encounter };
      });
      derived(transition.kind, derivedPart(changed, (value) => value.party), revision.partyState, 'reaction preference party state');
      derived(transition.kind, derivedPart(changed, (value) => value.encounter), revision.encounterState, 'reaction preference encounter state');
      recorded(revision.rngState, parent.rngState, 'reaction preference RNG state');
      return verdict();
    }
    case 'refusal_handling_changed': {
      // WR11: this kind had no replay case, so an edited refusal-handling revision loaded unchecked.
      if (parent === null || parent === undefined || parent.partyState === null) {
        throw new Error('A refusal-handling revision requires party state.');
      }
      const parentParty = parent.partyState;
      recorded(revision.encounterState, parent.encounterState, 'refusal-handling encounter state');
      recorded(revision.coordinatorState, parent.coordinatorState, 'refusal-handling coordinator state');
      recorded(revision.rngState, parent.rngState, 'refusal-handling RNG state');
      derived(transition.kind, derive(mode, 'refusal-handling party state', () =>
        setPartyRefusalHandling(parentParty, transition.category, transition.mode)), revision.partyState, 'refusal-handling party state');
      return verdict();
    }
    case 'reducer_applied': {
      if (parent === null || parent === undefined) {
        throw new Error('A reducer revision requires a parent.');
      }
      const replayed = derive(mode, 'reducer state', () => {
        const replayRng = restoreMulberry32(parent.rngState);
        const reduction = reduceSessionEncounter(parent.encounterState, transition.command, replayRng);
        return { state: reduction.state, events: reduction.events, rng: replayRng.snapshot() };
      });
      derived(transition.kind, derivedPart(replayed, (value) => value.state), revision.encounterState, 'reducer state');
      derived(transition.kind, derivedPart(replayed, (value) => value.events), transition.events, 'reducer events');
      derived(transition.kind, derivedPart(replayed, (value) => value.rng), revision.rngState, 'reducer RNG state');
      recorded(revision.partyState, parent.partyState, 'reducer party state');
      return verdict();
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
      recorded(revision.encounterState, parent.encounterState, 'coordinator encounter state');
      recorded(revision.rngState, parent.rngState, 'coordinator RNG state');
      recorded(revision.partyState, parent.partyState, 'coordinator party state');
      return verdict();
  }
}

/**
 * THE CORE REPLAY: rebuilds and verifies every revision against its declared parent, under `running` (the build
 * replaying it: a store's recording build, or the build the offline tool replays at), in `mode`. The full state held
 * on a revision is a checked recovery cache: reducer transitions must reproduce it from parent state + parent RNG,
 * while coordinator-only transitions must leave both unchanged. A failure is typed: SessionIntegrityError, or, for a
 * derivation of a turn another build recorded, SessionRecordedByOtherBuildError (the failing revision's own build
 * decides). Returns the last revision and the revisions whose derivations trust mode did not ask.
 */
function replayRevisions(
  revisions: readonly SessionRevision[],
  runningBuild: EngineBuild,
  mode: ReplayMode,
): { readonly latest: SessionRevision; readonly trustedRevisions: readonly number[] } {
  const trustedRevisions: number[] = [];
  const first = revisions[0];
  const rootKind = first === undefined ? undefined : decodeTransition(first.transition).kind;
  if (first === undefined || (rootKind !== 'session_started' && rootKind !== 'session_migrated')) {
    throw new Error('Session stream must begin with session_started or session_migrated.');
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
    if (replayTransition(revision, transition, parent, runningBuild, mode) === 'derivation_trusted') {
      trustedRevisions.push(revision.revision);
    }
    if (
      parent !== null && parent !== undefined &&
      transition.kind !== 'agent_session_started' &&
      transition.kind !== 'agent_session_dispatched' &&
      transition.kind !== 'agent_call_usage_recorded' &&
      transition.kind !== 'agent_session_recovered' &&
      transition.kind !== 'agent_session_rolled_over' &&
      canonicalJson(revision.agentSession) !== canonicalJson(parent.agentSession)
    ) {
      throw new SessionIntegrityError({
        kind: 'recorded_fact_disagreement', revision: revision.revision, transition: transition.kind,
        check: 'unchanged agent binding',
      });
    }
    byRevision.set(revision.revision, revision);
  }
  return { latest: revisions.at(-1) ?? first, trustedRevisions };
}

/** The strict replay of `revisions` under `runningBuild` (every derivation re-derived); the last revision. */
export function replaySessionRevisions(
  revisions: readonly SessionRevision[],
  runningBuild: EngineBuild = RUNNING_ENGINE_BUILD,
): SessionRevision {
  return replayRevisions(revisions, runningBuild, 'strict').latest;
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
    private readonly store: SessionStore,
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
    readonly store: SessionStore;
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
    store: SessionStore,
    mirror: MirrorSink,
  ): SessionResume {
    const revisions = store.revisions(sessionId);
    const { latest } = replayRevisions(revisions, store.recordingEngine, 'strict');
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

  /**
   * TRUST-RECORDED-HISTORY (owner D941; tests only, through tests/helpers/trust-recorded-history.ts): `bytes` loaded
   * trusting its recorded history. The grant is checked before anything is decoded; the save is decoded (hashes,
   * schema, sequence; a migration is not persisted anywhere, and a step that cannot carry it still refuses it); every
   * recorded fact is checked and no derivation is re-derived; the history seeds a fresh private memory store recording
   * `recordingEngine`, so new revisions record that build and use the rules running now. Everything it returns is
   * stamped (LoadedRelaxedStamp).
   */
  static loadSaveTrustingRecordedHistory(
    bytes: string,
    recordingEngine: EngineBuild,
    grant: TrustRecordedHistoryGrant,
    mirror: MirrorSink = new MemoryMirrorSink(),
  ): RelaxedSessionResume {
    requireTrustGrant(grant);
    const { summary, revisions } = decodeSavedSession(bytes, recordingEngine);
    const { latest, trustedRevisions } = replayRevisions(revisions, recordingEngine, 'trust');
    const store = new MemoryBrowserSessionStore(recordingEngine);
    store[seedTrustedHistory](revisions);
    const rng = restoreMulberry32(latest.rngState);
    const loaded: LoadedRelaxedStamp = {
      kind: 'loaded_relaxed',
      recordedBy: recordingBuildsOf(revisions),
      runningBuild: recordingEngine,
      trustedRevisions,
      purpose: grant.purpose,
    };
    const journal = RelaxedSessionJournal[relaxedJournalOf](
      new EncounterSessionJournal(summary.sessionId, store, mirror, rng),
      store,
      loaded,
    );
    return {
      journal,
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: latest.agentSession,
      rng,
      loaded,
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
        phase: canonicalizeJson(latest.encounterState.phase),
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

  recordAgentSessionRecoveryFailure(input: {
    readonly predecessorSessionHash: string;
    readonly dispatchId: EngineDispatchId;
    readonly exit: 'cancelled' | 'timed_out' | 'infrastructure_failed';
  }): void {
    const latest = this.#latest();
    if (latest.agentSession === null || latest.agentSession.status !== 'active') {
      throw new Error('Encounter run has no active predecessor for a failed recovery dispatch.');
    }
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'agent_session_recovery_failed', ...input },
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: latest.agentSession,
    });
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
    const mismatch = encounterPartyMismatch(input.encounterState, partyState);
    if (mismatch !== null) throw new Error(`The composed room disagrees with the party state (${mismatch}).`);
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
      recordedBy: this.store.recordingEngine,
    };
    // The only mint of a JournalRecordedRevision: a revision this journal recorded from its own verified state.
    const persisted = {
      ...body,
      checksum: revisionChecksum(body),
    } as JournalRecordedRevision;
    this.store.append(persisted);
    this.mirror.append(persisted);
    return persisted;
  }
}

/**
 * TRUST-RECORDED-HISTORY (owner D941; supervisor D944, D945 SQ1/SQ3, D947 SQ7; SAVE-COMPAT §6.8). Default off, tests
 * only: a save is loaded trusting its recorded history. Integrity still holds (hashes, schema, sequence and every
 * recorded fact); the rules derivations are not re-derived; new actions use the rules and build running now; and every
 * value the relaxed journal returns carries a typed stamp naming the recording builds and "loaded relaxed". The app
 * cannot construct it: a grant's key is a symbol this module never exports, the key's sha256 is checked before
 * anything is decoded, and only tests/helpers/trust-recorded-history.ts holds the key (R3, ast-grep, W39).
 */
export const TRUST_RECORDED_HISTORY_KEY_SHA256 = 'd6207c517b8590eb976e41a01b2b91e31f85a0dc0acdb69394aa0c02dff6f69e' as const;

declare const trustGrant: unique symbol;

/** A grant to load a save trusting its recorded history: minted only by tests/helpers/trust-recorded-history.ts. */
export interface TrustRecordedHistoryGrant {
  readonly [trustGrant]: true;
  readonly key: string;
  readonly purpose: string;
}

export class TrustRecordedHistoryRefusedError extends Error {
  override readonly name = 'TrustRecordedHistoryRefusedError' as const;

  constructor() {
    super('Loading a save by trusting its recorded history needs a grant only tests can mint (owner D941).');
  }
}

/** The key check, before anything is decoded (W38). */
function requireTrustGrant(grant: unknown): void {
  const key = isRecord(grant) ? grant.key : undefined;
  if (typeof key !== 'string' || sha256(key) !== TRUST_RECORDED_HISTORY_KEY_SHA256) throw new TrustRecordedHistoryRefusedError();
}

/** What every result of a relaxed load carries (owner D941: "the recording build(s) and 'loaded relaxed'"). */
export interface LoadedRelaxedStamp {
  readonly kind: 'loaded_relaxed';
  /** Every distinct build the loaded revisions name, first seen first. */
  readonly recordedBy: readonly [EngineBuild, ...EngineBuild[]];
  readonly runningBuild: EngineBuild;
  /** The revisions of a rules-derived kind whose derivations were not re-derived. */
  readonly trustedRevisions: readonly number[];
  readonly purpose: string;
}

/** A value a relaxed journal returned, with its stamp. */
export interface LoadedRelaxed<T> {
  readonly loaded: LoadedRelaxedStamp;
  readonly value: T;
}

/** What a relaxed journal's method returns for a strict one returning T: stamped, a relaxed resume, or nothing. */
export type RelaxedJournalResult<T> =
  [T] extends [void] ? void : [T] extends [SessionResume] ? RelaxedSessionResume : LoadedRelaxed<T>;

type JournalMethodKey = {
  [K in keyof EncounterSessionJournal]: EncounterSessionJournal[K] extends (...args: never) => unknown ? K : never;
}[keyof EncounterSessionJournal];

/**
 * The relaxed journal's surface: every public method of the strict journal, each returning its stamped result. A
 * method added to the strict journal without its relaxed twin does not compile (TS2420), nor does an unstamped return.
 */
export type RelaxedJournalSurface = {
  readonly [K in JournalMethodKey]: EncounterSessionJournal[K] extends (...args: infer A) => infer R
    ? (...args: A) => RelaxedJournalResult<R>
    : never;
};

/** A resume of a relaxed load: its journal is the relaxed one, and it carries the stamp. */
export interface RelaxedSessionResume extends Omit<SessionResume, 'journal'> {
  readonly journal: RelaxedSessionJournal;
  readonly loaded: LoadedRelaxedStamp;
}

/** Every distinct build `revisions` name, first seen first. */
function recordingBuildsOf(revisions: readonly SessionRevision[]): readonly [EngineBuild, ...EngineBuild[]] {
  const [first, ...rest] = revisions;
  if (first === undefined) throw schemaViolation('Saved VTT session revisions are malformed.');
  const builds: [EngineBuild, ...EngineBuild[]] = [first.recordedBy];
  for (const revision of rest) {
    if (!builds.some((build) => canonicalJson(build) === canonicalJson(revision.recordedBy))) builds.push(revision.recordedBy);
  }
  return builds;
}

const relaxedJournalOf: unique symbol = Symbol('relaxedJournalOf');

/**
 * The journal of a relaxed load: a separate nominal type (it lacks the strict class's private members, so it can never
 * be passed where the strict journal is expected, W27), each method delegating to a private strict core over a private
 * memory store and stamping its result. Its export is the history as recorded, which a strict import still refuses
 * (no laundering, W26).
 */
export class RelaxedSessionJournal implements RelaxedJournalSurface {
  readonly sessionId: EncounterSessionId;
  readonly #core: EncounterSessionJournal;
  readonly #store: MemoryBrowserSessionStore;

  private constructor(core: EncounterSessionJournal, store: MemoryBrowserSessionStore, readonly loaded: LoadedRelaxedStamp) {
    this.sessionId = core.sessionId;
    this.#core = core;
    this.#store = store;
  }

  /** Module-private: only EncounterSessionJournal.loadSaveTrustingRecordedHistory builds one. */
  static [relaxedJournalOf](
    core: EncounterSessionJournal,
    store: MemoryBrowserSessionStore,
    loaded: LoadedRelaxedStamp,
  ): RelaxedSessionJournal {
    return new RelaxedSessionJournal(core, store, loaded);
  }

  #stamped<T>(value: T): LoadedRelaxed<T> {
    return { loaded: this.loaded, value };
  }

  #resumed(resume: SessionResume): RelaxedSessionResume {
    const { journal: _strict, ...rest } = resume;
    return { ...rest, journal: this, loaded: this.loaded };
  }

  rng(): LoadedRelaxed<SerializableRng> {
    return this.#stamped(this.#core.rng());
  }

  agentSession(): LoadedRelaxed<AgentSessionBinding | null> {
    return this.#stamped(this.#core.agentSession());
  }

  reactionGuidance(): LoadedRelaxed<ReactionGuidanceDeclaration | null> {
    return this.#stamped(this.#core.reactionGuidance());
  }

  replaceReactionGuidance(...args: Parameters<EncounterSessionJournal['replaceReactionGuidance']>): void {
    this.#core.replaceReactionGuidance(...args);
  }

  startAgentSession(...args: Parameters<EncounterSessionJournal['startAgentSession']>): LoadedRelaxed<AgentSessionBinding> {
    return this.#stamped(this.#core.startAgentSession(...args));
  }

  recordAgentSessionDispatch(): LoadedRelaxed<AgentSessionBinding> {
    return this.#stamped(this.#core.recordAgentSessionDispatch());
  }

  recordAgentCallUsage(...args: Parameters<EncounterSessionJournal['recordAgentCallUsage']>): LoadedRelaxed<AgentSessionBinding> {
    return this.#stamped(this.#core.recordAgentCallUsage(...args));
  }

  agentSessionDigest(): LoadedRelaxed<AgentSessionDigest> {
    return this.#stamped(this.#core.agentSessionDigest());
  }

  recoverAgentSession(...args: Parameters<EncounterSessionJournal['recoverAgentSession']>): LoadedRelaxed<AgentSessionBinding> {
    return this.#stamped(this.#core.recoverAgentSession(...args));
  }

  recordAgentSessionRecoveryFailure(...args: Parameters<EncounterSessionJournal['recordAgentSessionRecoveryFailure']>): void {
    this.#core.recordAgentSessionRecoveryFailure(...args);
  }

  rollOverAgentSession(...args: Parameters<EncounterSessionJournal['rollOverAgentSession']>): LoadedRelaxed<AgentSessionBinding> {
    return this.#stamped(this.#core.rollOverAgentSession(...args));
  }

  partyState(): LoadedRelaxed<PartySessionState | null> {
    return this.#stamped(this.#core.partyState());
  }

  ended(): LoadedRelaxed<boolean> {
    return this.#stamped(this.#core.ended());
  }

  endSession(): void {
    this.#core.endSession();
  }

  /** The history as recorded (never replayed strictly: a strict import still refuses what trust mode loaded). */
  export(): LoadedRelaxed<string> {
    return this.#stamped(encodeRecordedSession(this.#store.revisions(this.sessionId)));
  }

  record(...args: Parameters<EncounterSessionJournal['record']>): void {
    this.#core.record(...args);
  }

  recordHostTransition(...args: Parameters<EncounterSessionJournal['recordHostTransition']>): void {
    this.#core.recordHostTransition(...args);
  }

  turnExhaustionPersistence(): LoadedRelaxed<ReturnType<EncounterSessionJournal['turnExhaustionPersistence']>> {
    return this.#stamped(this.#core.turnExhaustionPersistence());
  }

  moveHead(...args: Parameters<EncounterSessionJournal['moveHead']>): RelaxedSessionResume {
    return this.#resumed(this.#core.moveHead(...args));
  }

  skipTurn(): RelaxedSessionResume {
    return this.#resumed(this.#core.skipTurn());
  }

  delayTurn(...args: Parameters<EncounterSessionJournal['delayTurn']>): RelaxedSessionResume {
    return this.#resumed(this.#core.delayTurn(...args));
  }

  history(): LoadedRelaxed<readonly SessionHistoryEntry[]> {
    return this.#stamped(this.#core.history());
  }

  roundBoundaries(): LoadedRelaxed<readonly SessionRoundBoundary[]> {
    return this.#stamped(this.#core.roundBoundaries());
  }

  rewindToRound(...args: Parameters<EncounterSessionJournal['rewindToRound']>): RelaxedSessionResume {
    return this.#resumed(this.#core.rewindToRound(...args));
  }

  capturePartyState(): LoadedRelaxed<PartySessionState> {
    return this.#stamped(this.#core.capturePartyState());
  }

  resolveRestInterruption(...args: Parameters<EncounterSessionJournal['resolveRestInterruption']>): LoadedRelaxed<RestInterruptionResult> {
    return this.#stamped(this.#core.resolveRestInterruption(...args));
  }

  takeShortRest(...args: Parameters<EncounterSessionJournal['takeShortRest']>): LoadedRelaxed<ShortRestResult> {
    return this.#stamped(this.#core.takeShortRest(...args));
  }

  takeLongRest(): LoadedRelaxed<LongRestResult> {
    return this.#stamped(this.#core.takeLongRest());
  }

  updateReactionPreference(...args: Parameters<EncounterSessionJournal['updateReactionPreference']>): RelaxedSessionResume {
    return this.#resumed(this.#core.updateReactionPreference(...args));
  }

  updateRefusalHandling(...args: Parameters<EncounterSessionJournal['updateRefusalHandling']>): RelaxedSessionResume {
    return this.#resumed(this.#core.updateRefusalHandling(...args));
  }

  composeNextRoom(...args: Parameters<EncounterSessionJournal['composeNextRoom']>): LoadedRelaxed<PartySessionState> {
    return this.#stamped(this.#core.composeNextRoom(...args));
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
    throw schemaViolation('Saved VTT session journal DAG is malformed.');
  }
  const values: JsonValue[] = [];
  const dereference = (reference: unknown, nodeIndex: number): JsonValue => {
    if (!Number.isSafeInteger(reference) || (reference as number) < 0 || (reference as number) >= nodeIndex) {
      throw schemaViolation('Saved VTT session journal DAG has an invalid child reference.');
    }
    const value = values[reference as number];
    if (value === undefined) throw schemaViolation('Saved VTT session journal DAG has a missing child.');
    return value;
  };
  for (const [nodeIndex, rawNode] of rawNodes.entries()) {
    if (!Array.isArray(rawNode) || typeof rawNode[0] !== 'string') {
      throw schemaViolation('Saved VTT session journal DAG has a malformed node.');
    }
    switch (rawNode[0]) {
      case 'n':
        if (rawNode.length !== 1) throw schemaViolation('Saved VTT session journal DAG has a malformed null node.');
        values.push(null);
        break;
      case 'b':
        if (rawNode.length !== 2 || typeof rawNode[1] !== 'boolean') {
          throw schemaViolation('Saved VTT session journal DAG has a malformed boolean node.');
        }
        values.push(rawNode[1]);
        break;
      case 'd':
        if (rawNode.length !== 2 || typeof rawNode[1] !== 'number' || !Number.isFinite(rawNode[1])) {
          throw schemaViolation('Saved VTT session journal DAG has a malformed number node.');
        }
        values.push(rawNode[1]);
        break;
      case 's':
        if (rawNode.length !== 2 || typeof rawNode[1] !== 'string') {
          throw schemaViolation('Saved VTT session journal DAG has a malformed string node.');
        }
        values.push(rawNode[1]);
        break;
      case 'a':
        if (rawNode.length !== 2 || !Array.isArray(rawNode[1])) {
          throw schemaViolation('Saved VTT session journal DAG has a malformed array node.');
        }
        values.push(rawNode[1].map((reference) => dereference(reference, nodeIndex)));
        break;
      case 'o': {
        if (rawNode.length !== 2 || !Array.isArray(rawNode[1]) || rawNode[1].length % 2 !== 0) {
          throw schemaViolation('Saved VTT session journal DAG has a malformed object node.');
        }
        const object = Object.create(null) as Record<string, JsonValue>;
        for (let index = 0; index < rawNode[1].length; index += 2) {
          const key = rawNode[1][index];
          const reference = rawNode[1][index + 1];
          if (typeof key !== 'string' || Object.hasOwn(object, key)) {
            throw schemaViolation('Saved VTT session journal DAG has a malformed object entry.');
          }
          object[key] = dereference(reference, nodeIndex);
        }
        values.push(object);
        break;
      }
      default:
        throw schemaViolation(`Saved VTT session journal DAG has unknown node kind ${JSON.stringify(rawNode[0])}.`);
    }
  }
  return rawRevisionRoots.map((root) => {
    if (!Number.isSafeInteger(root) || (root as number) < 0 || (root as number) >= values.length) {
      throw schemaViolation('Saved VTT session journal DAG has an invalid revision root.');
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
    throw schemaViolation('Saved VTT session journal DAG header is malformed.');
  }
  const body: JournalDagBundleBody = {
    format: JOURNAL_DAG_FORMAT,
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId: value.sessionId as EncounterSessionId,
    nodes: value.nodes as readonly JournalDagNode[],
    revisions: value.revisions as readonly number[],
  };
  if (sha256(canonicalJson(body)) !== value.fingerprint) {
    throw hashMismatch('bundle_fingerprint', null, 'Saved VTT session fingerprint mismatch.');
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

/** A schema step for the whole saved bundle (schema 1 through 11): the chain before revisions named their build. */
export interface LegacyBundleStep<F extends LegacyBundleVersion> {
  readonly kind: 'legacy_bundle';
  readonly id: string;
  readonly from: F;
  readonly source: string;
  readonly checksum: string;
  /** The tests that fail if this step stops carrying its saves (W22 holds every reference to a test that runs). */
  readonly witnessedBy: readonly [TestRef, ...TestRef[]];
  migrate(bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>>;
}

/**
 * The FOOTPRINT step (owner D919): a schema-12 stream schema 13 can express migrates by the version bump alone;
 * any other becomes ONE root revision whose archive keeps the stream byte for byte, its current state repaired.
 */
export interface BumpOrArchiveStep {
  readonly kind: 'bump_or_archive';
  readonly id: 'vtt_session_v12_to_v13';
  readonly source: string;
  readonly checksum: string;
  /** The bundle's schema-12 revisions, each checksum verified. */
  verified(bundle: Readonly<Record<string, unknown>>): readonly Readonly<Record<string, unknown>>[];
  /** Whether schema 13 can express every revision (then the stream migrates by the bump). */
  expressible(revisions: readonly Readonly<Record<string, unknown>>[]): boolean;
  bump(bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>>;
  archive(
    bundle: Readonly<Record<string, unknown>>,
    archive: SessionHistoryArchive,
    recordingEngine: EngineBuild,
  ): Readonly<Record<string, unknown>>;
}

/** A recorded revision without its schemaVersion, recordedBy and checksum: what a rewrite step reads and returns. */
export type RevisionContent = Readonly<Record<string, unknown>>;

/** What a rewrite step makes of one revision: its content at the next schema, or why it cannot carry it (D940). */
export type RevisionRewriteOutcome<R extends string> =
  | { readonly kind: 'rewritten'; readonly content: RevisionContent }
  /** `path`: a JSON path inside the content. */
  | { readonly kind: 'not_migratable'; readonly reason: R; readonly path: string };

/** Repository fixture paths: an earlier-build revision in, the exact rewritten revision out (owner D940). */
export interface GoldenPair {
  readonly input: string;
  readonly output: string;
}

/** A repository fixture the step refuses, with the reason and path it must refuse it with. */
export interface NotMigratableGolden<R extends string> {
  readonly input: string;
  readonly reason: R;
  readonly path: string;
}

/**
 * A schema step for each recorded revision, from schema F (13 and later; SAVE-COMPAT adds none). `rewrite` is pure and
 * total (D940): a function of the content alone. Every reason it can refuse with carries its refusal text and a
 * golden, both mapped over R, so a reason without either does not compile (W19b). The chain driver
 * (rewriteRevisionsToCurrent) owns the rest: the revision's checksum, its recording build, the next version, the
 * refusal, and the branch RNG-state fingerprint invariant ([FS-b]).
 */
export interface RevisionRewriteStep<F extends number, R extends string> {
  readonly kind: 'revision_rewrite';
  readonly id: `vtt_session_v${F}_to_v${number}`;
  /** The refusal text of each reason. */
  readonly reasons: { readonly [K in R]: string };
  readonly golden: GoldenPair;
  readonly notMigratableGoldens: { readonly [K in R]: NotMigratableGolden<K> };
  rewrite(content: RevisionContent): RevisionRewriteOutcome<R>;
}

type StepFor<F extends MigratableVersion> =
  F extends LegacyBundleVersion ? LegacyBundleStep<F> : F extends 12 ? BumpOrArchiveStep : RevisionRewriteStep<F, string>;

/** What the chain must be: one step from every schema version before the current one, keyed by that version. */
export type VttSessionMigrationChainShape = { readonly [F in MigratableVersion]: StepFor<F> };

/**
 * A revision the build running now cannot carry to the current schema (owner D940, D945 Q-W): the step and reason
 * that refused it, and both builds (D939). Trust mode does not bypass it: the save is not re-interpreted either way.
 */
export interface SessionNotMigratable {
  readonly revision: number;
  readonly fromSchemaVersion: number;
  readonly toSchemaVersion: number;
  readonly step: string;
  readonly reason: string;
  readonly reasonText: string;
  readonly path: string;
  readonly recordedBy: EngineBuild;
  readonly running: EngineBuild;
}

/** The typed refusal of a save a migration step cannot carry; its message always names both builds ([FS-a]). */
export class SessionNotMigratableError extends Error {
  override readonly name = 'SessionNotMigratableError' as const;

  constructor(readonly refusal: SessionNotMigratable) {
    super(
      `Save refused: turn ${String(refusal.revision)} was recorded by ${describeEngineBuild(refusal.recordedBy)} under ` +
        `session schema ${String(refusal.fromSchemaVersion)}, and ${describeEngineBuild(refusal.running)}, the build ` +
        `running now, cannot carry it to schema ${String(refusal.toSchemaVersion)}: ${refusal.reasonText} (at ` +
        `${refusal.path}). The save is not changed.`,
    );
  }
}

/** [FS-b] How a rewrite step broke the driver's contract: a defect of the step, never of the save. */
export type RevisionRewriteStepViolation = {
  readonly kind: 'branch_rng_fingerprint_changed';
  readonly step: string;
  readonly revision: number;
  /** The stored field rewritten, or the rewritten state no longer recomputing to it. */
  readonly subject: 'stored_field' | 'recomputed';
  readonly expected: string;
  readonly actual: string;
};

/**
 * [FS-b] (MOVE-COST S12/OQ10, D947): a head_moved revision's RNG is derived from its parent's STORED branch
 * fingerprint and decode recomputes the fingerprint from the state, so a step that moves either would refuse an honest
 * branched save as an integrity fault. The driver refuses the step instead: a typed program error, which every load
 * surface shows as load_failed.
 */
export class RevisionRewriteStepError extends Error {
  override readonly name = 'RevisionRewriteStepError' as const;

  constructor(readonly violation: RevisionRewriteStepViolation) {
    super(
      `Migration step ${violation.step} changed the branch RNG-state fingerprint of revision ${String(violation.revision)} ` +
        `(${violation.subject}): expected ${violation.expected}, got ${violation.actual}. A rewrite step must leave the ` +
        'fingerprinted mechanical state byte-identical.',
    );
  }
}

function isRevisionRewriteStep(step: unknown): step is RevisionRewriteStep<number, string> {
  return isRecord(step) && step.kind === 'revision_rewrite';
}

/** The chain's revision-rewrite steps, by the schema they rewrite from (SAVE-COMPAT adds none). */
function revisionRewriteChain(): Readonly<Record<number, RevisionRewriteStep<number, string>>> {
  const chain: Record<number, RevisionRewriteStep<number, string>> = {};
  for (const [from, step] of Object.entries(VTT_SESSION_MIGRATION_CHAIN) as readonly [string, unknown][]) {
    if (isRevisionRewriteStep(step)) chain[Number(from)] = step;
  }
  return chain;
}

/**
 * One recorded revision at schema `from` carried by `step` to `from + 1`: its checksum verified at its own version, its
 * content rewritten, its ORIGINAL recordedBy kept (a strict replay afterwards classifies against the build that
 * recorded each outcome: D940's per-move proof), then rehashed.
 */
function rewrittenRevision(
  step: RevisionRewriteStep<number, string>,
  from: number,
  value: unknown,
  running: EngineBuild,
): Readonly<Record<string, unknown>> {
  if (!isRecord(value) || value.schemaVersion !== from || !Number.isSafeInteger(value.revision) ||
    typeof value.checksum !== 'string') {
    throw schemaViolation('Stored VTT session revision stream is malformed.');
  }
  const revision = value.revision as number;
  const { checksum, ...body } = value;
  if (sha256(canonicalJson(body)) !== checksum) {
    throw hashMismatch('revision_checksum', revision, 'VTT session revision checksum mismatch.');
  }
  const { schemaVersion: _schemaVersion, recordedBy, ...content } = body;
  const outcome = step.rewrite(content);
  switch (outcome.kind) {
    case 'not_migratable': {
      const reasonText = step.reasons[outcome.reason];
      // A typed step states a text for every reason it can refuse with (its `reasons` are mapped over them).
      if (reasonText === undefined) throw new Error(`Migration step ${step.id} refused with ${outcome.reason}, a reason it states no text for.`);
      throw new SessionNotMigratableError({
        revision, fromSchemaVersion: from, toSchemaVersion: from + 1, step: step.id, reason: outcome.reason, reasonText,
        path: outcome.path, recordedBy: decodeEngineBuild(recordedBy, `VTT session revision ${String(revision)} recordedBy`),
        running,
      });
    }
    case 'rewritten': {
      // [FS-b] The branch RNG-state fingerprint must come through byte-identical: stored and recomputed.
      const stored = String(content.branchRngStateFingerprint);
      const storedAfter = String(outcome.content.branchRngStateFingerprint);
      if (storedAfter !== stored) {
        throw new RevisionRewriteStepError({
          kind: 'branch_rng_fingerprint_changed', step: step.id, revision, subject: 'stored_field', expected: stored, actual: storedAfter,
        });
      }
      const recomputed = branchRngStateFingerprint(outcome.content.encounterState as unknown as DecodedStateRest);
      if (recomputed !== stored) {
        throw new RevisionRewriteStepError({
          kind: 'branch_rng_fingerprint_changed', step: step.id, revision, subject: 'recomputed', expected: stored, actual: recomputed,
        });
      }
      const next = { ...outcome.content, schemaVersion: from + 1, recordedBy };
      return { ...next, checksum: sha256(canonicalJson(next)) };
    }
  }
}

/**
 * The chain driver for revision-rewrite steps (SAVE-COMPAT §6.7): every revision, all at one schema version, carried
 * step by step to `current`. A step's `not_migratable` outcome is the typed refusal SessionNotMigratableError; a step
 * that moves the branch RNG-state fingerprint is RevisionRewriteStepError. The defaults are this build's chain and
 * schema; a test passes a synthetic chain.
 */
export function rewriteRevisionsToCurrent(
  revisions: readonly unknown[],
  running: EngineBuild,
  chain: Readonly<Record<number, RevisionRewriteStep<number, string>>> = revisionRewriteChain(),
  current: number = VTT_SESSION_SCHEMA_VERSION,
): readonly unknown[] {
  let staged: readonly unknown[] = revisions;
  for (;;) {
    const first = staged[0];
    if (!isRecord(first) || !Number.isSafeInteger(first.schemaVersion)) {
      throw schemaViolation('Stored VTT session revision stream is malformed.');
    }
    const version = first.schemaVersion as number;
    if (version === current) return staged;
    const step = chain[version];
    if (step === undefined) throw schemaViolation(`VTT session schema ${String(version)} has no step to schema ${String(current)}.`);
    staged = staged.map((revision) => rewrittenRevision(step, version, revision, running));
  }
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
const V10_TO_V11_SOURCE = 'vtt-session-v10-to-v11:add-canonical-creature-space-and-migration-placement-recovery:2';
const V11_TO_V12_SOURCE = 'vtt-session-v11-to-v12:add-observation-history-empty-and-rehash-revisions:1';
const V12_TO_V13_SOURCE =
  'vtt-session-v12-to-v13:schema-version-bump-when-every-revision-places-whole-bodies-else-archive-history-and-repair-current-state:1';

function migrationOriginatingToken(value: unknown): MigrationOriginatingToken | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.combatantId !== 'string' ||
    !isRecord(value.position) || !Number.isSafeInteger(value.position.column) ||
    !Number.isSafeInteger(value.position.row)) return null;
  return {
    id: value.id as MigrationOriginatingToken['id'],
    combatantId: value.combatantId as MigrationOriginatingToken['combatantId'],
    position: { column: value.position.column as number, row: value.position.row as number },
  };
}

function migrateV10EncounterState(value: unknown): DecodedStateRest {
  if (!isRecord(value) || !Array.isArray(value.combatants) || !Array.isArray(value.tokens) ||
    !Array.isArray(value.effects) || !isRecord(value.environment)) {
    throw schemaViolation('VTT session v10 encounter state is malformed.');
  }
  const knownSizes = new Set<string>(creatureSizes);
  const sizes = new Map<string, KnownCreatureSize>();
  const pending: EncounterState['adjudicationPending'][number][] = [];
  const oldTokens = new Map<string, MigrationOriginatingToken>();
  for (const rawToken of value.tokens) {
    const token = migrationOriginatingToken(rawToken);
    if (token === null) throw schemaViolation('VTT session v10 token is malformed.');
    oldTokens.set(token.combatantId, token);
  }
  for (const entry of value.combatants) {
    if (!isRecord(entry) || !isRecord(entry.profile)) {
      throw schemaViolation('VTT session v10 combatant is malformed.');
    }
    const profile = entry.profile;
    if (typeof profile.id !== 'string' || !isRecord(profile.rules)) {
      throw schemaViolation('VTT session v10 combatant profile is malformed.');
    }
    const rules = profile.rules;
    const sourceSize = rules.sizeCategory;
    if (typeof sourceSize === 'string' && knownSizes.has(sourceSize)) {
      sizes.set(profile.id as string, sourceSize as KnownCreatureSize);
    } else {
      const oldToken = oldTokens.get(profile.id);
      pending.push({
        kind: 'legacy_size_required',
        combatant: profile.id as EncounterState['combatants'][number]['profile']['id'],
        sourceSizeText: typeof sourceSize === 'string' ? sourceSize : null,
        suggestedAnchor: oldToken === undefined ? null : { ...oldToken.position },
        originatingToken: oldToken ?? null,
      });
    }
  }
  const activeEffects = value.effects.flatMap((entry) => {
    if (!isRecord(entry) || !isRecord(entry.payload)) {
      throw schemaViolation('VTT session v10 effect is malformed.');
    }
    if (entry.payload.kind !== 'size_alteration') return [entry];
    if (typeof entry.id !== 'string' || !Array.isArray(entry.targets) || entry.targets.length !== 1 ||
      typeof entry.targets[0] !== 'string' || entry.payload.selection !== 'selected_when_cast' ||
      !Number.isSafeInteger(entry.payload.damageDieCount) ||
      !Number.isSafeInteger(entry.payload.damageDieSides)) {
      throw schemaViolation('VTT session v10 size effect is not a resolvable single-target effect.');
    }
    const combatant = entry.targets[0] as EncounterState['combatants'][number]['profile']['id'];
    const oldToken = oldTokens.get(combatant);
    pending.push({
      kind: 'effect_adjudication_pending',
      combatant,
      effectId: entry.id as EncounterState['effects'][number]['id'],
      originalEffect: structuredClone(entry) as unknown as EncounterState['effects'][number],
      suggestedAnchor: oldToken === undefined ? null : { ...oldToken.position },
      originatingToken: oldToken ?? null,
    });
    return [];
  });
  const formerTokens = [...oldTokens.values()];
  for (let leftIndex = 0; leftIndex < formerTokens.length; leftIndex += 1) {
    const left = formerTokens[leftIndex];
    if (left === undefined) continue;
    for (const right of formerTokens.slice(leftIndex + 1)) {
      const leftSize = sizes.get(left.combatantId);
      const rightSize = sizes.get(right.combatantId);
      if (leftSize === undefined || rightSize === undefined) continue;
      const leftSized = sizedCombatantState(leftSize);
      const rightSized = sizedCombatantState(rightSize);
      const leftSpace = creatureSpace(leftSized, placementFor(
        leftSized, left.position, normalPlacementFor(leftSized),
      ));
      const rightSpace = creatureSpace(rightSized, placementFor(
        rightSized, right.position, normalPlacementFor(rightSized),
      ));
      if (!spacesIntersect(leftSpace, rightSpace)) continue;
      const [retained, resolving] = String(left.combatantId).localeCompare(String(right.combatantId)) <= 0
        ? [left, right]
        : [right, left];
      pending.push({
        kind: 'overlap_adjudication_pending',
        combatant: resolving.combatantId,
        overlappingCombatant: retained.combatantId,
        formerAnchors: [
          { ...retained.position },
          { ...resolving.position },
        ],
        originatingToken: resolving,
      });
    }
  }
  const orderedPending = orderedMigrationPlacementQueue(
    pending,
    Array.isArray(value.initiative) ? value.initiative as EncounterState['initiative'] : [],
  );
  const pendingCombatants = new Set(orderedPending.map((entry) => entry.combatant));
  const tokens = value.tokens.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.combatantId !== 'string') {
      throw schemaViolation('VTT session v10 token is malformed.');
    }
    const size = sizes.get(entry.combatantId);
    return size === undefined || pendingCombatants.has(entry.combatantId as MigrationOriginatingToken['combatantId'])
      ? []
      : [{ ...entry, placementMode: { kind: 'normal' as const, actual: size } }];
  });
  const originalPhase = value.phase;
  if (!isEncounterPhase(originalPhase) || originalPhase.kind === 'awaiting_placement') {
    throw schemaViolation('VTT session v10 encounter phase is malformed.');
  }
  const migrated = {
    ...value,
    tokens,
    effects: activeEffects,
    environment: { ...value.environment, narrowOpeningRegions: [] },
    sharedSpaceRelations: [],
    adjudicationPending: orderedPending,
  } as unknown as DecodedStateRest;
  return {
    ...migrated,
    phase: awaitingPlacementPhase(
      orderedPending,
      migrated.initiative,
      originalPhase as ResumableEncounterPhase,
    ),
  };
}

/**
 * THE SESSION MIGRATION CHAIN (SAVE-COMPAT §6.7): one step from every schema version before the current one, keyed by
 * that version, so a gap or a duplicate does not compile (W18). Legacy bundle steps carry a whole save to schema 12;
 * the bump-or-archive step carries it to 13 (D919); later schemas are revision-rewrite steps (none yet; MOVE-COST's
 * key 13 is the first), which rewriteRevisionsToCurrent drives.
 */
export const VTT_SESSION_MIGRATION_CHAIN = Object.freeze({
    1: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v1_to_v2',
      from: 1,
      witnessedBy: [
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
        'tests/unit/vtt/session-persistence.test.ts::unknown transition kind refuses the whole session file with a typed refusal naming the kind',
      ] as const,
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
    2: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v2_to_v3',
      from: 2,
      witnessedBy: [
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V2_TO_V3_SOURCE,
      checksum: '0a6dd026931de184063de3aa5173901c1876fb8ef8f89ac340de241511e5303a',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v2 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision)) throw schemaViolation('VTT session v2 revision is malformed.');
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
    3: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v3_to_v4',
      from: 3,
      witnessedBy: [
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V3_TO_V4_SOURCE,
      checksum: '03fad58a6864c3419f1243aa818fdcb6b38e3411d832de8b32a2e9364ba4bd20',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v3 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
            throw schemaViolation('VTT session v3 revision is malformed.');
          }
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 4 as const,
            branchRngStateFingerprint: branchRngStateFingerprint(
              revision.encounterState as unknown as DecodedStateRest,
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
    4: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v4_to_v5',
      from: 4,
      witnessedBy: [
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V4_TO_V5_SOURCE,
      checksum: '2b0d139e3b2c7c9c5491fe09a103cc667beb246f8d199f093c058b0835cb9c3d',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v4 revisions are malformed.');
        }
        const priorDeathMoments = new Map<string, unknown>();
        const revisions = bundle.revisions.map((revision, revisionIndex) => {
          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
            throw schemaViolation('VTT session v4 revision is malformed.');
          }
          const encounterState = revision.encounterState;
          const rawCombatants = encounterState.combatants;
          if (!Array.isArray(rawCombatants)) {
            throw schemaViolation('VTT session v4 combatants are malformed.');
          }
          const round = Number.isSafeInteger(encounterState.round) ? encounterState.round as number : 0;
          const initiativeIndex = Number.isSafeInteger(encounterState.activeInitiativeIndex)
            ? encounterState.activeInitiativeIndex as number
            : 0;
          const combatants = rawCombatants.map((combatant: unknown) => {
            if (!isRecord(combatant) || !isRecord(combatant.profile) || typeof combatant.profile.id !== 'string') {
              throw schemaViolation('VTT session v4 combatant is malformed.');
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
          const migratedEncounterState = { ...encounterState, combatants } as unknown as DecodedStateRest;
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
    5: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v5_to_v6',
      from: 5,
      witnessedBy: [
        'tests/unit/vtt/preview-hidden-rolls.test.ts::legacy_toggle_dropped: migrates a hideDeathSaveRolls-only v5 save to the equivalent category',
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V5_TO_V6_SOURCE,
      checksum: '29795e2183f7e7c3831d4d233722a51ba2beee75e124abd434976499132ef174',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v5 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
            throw schemaViolation('VTT session v5 revision is malformed.');
          }
          if (typeof revision.encounterState.hideDeathSaveRolls !== 'boolean') {
            throw schemaViolation('VTT session v5 death-save visibility setting is malformed.');
          }
          const { hideDeathSaveRolls, ...legacyEncounterState } = revision.encounterState;
          const migratedEncounterState = {
            ...legacyEncounterState,
            hiddenRolls: hideDeathSaveRolls ? ['death_saves'] : [],
          } as unknown as DecodedStateRest;
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
    6: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v6_to_v7',
      from: 6,
      witnessedBy: [
        'tests/unit/vtt/preview-hidden-rolls.test.ts::legacy_toggle_dropped: migrates a hideDeathSaveRolls-only v5 save to the equivalent category',
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V6_TO_V7_SOURCE,
      checksum: '523db2c861ce38aeeec95824f4d73de203fa98a475ffaf3ad488e79696beaa2e',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v6 revisions are malformed.');
        }
        const migratedByRevision = new Map<number, DecodedStateRest>();
        const revisions = bundle.revisions.map((revision) => {
          if (
            !isRecord(revision) ||
            !Number.isSafeInteger(revision.revision) ||
            !isRecord(revision.encounterState)
          ) {
            throw schemaViolation('VTT session v6 revision is malformed.');
          }
          const activeEncounterState = {
            ...revision.encounterState,
            phase: { kind: 'active' as const },
          } as unknown as DecodedStateRest;
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
    7: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v7_to_v8',
      from: 7,
      witnessedBy: [
        'tests/unit/vtt/session-persistence.test.ts::migrates the literal pre-AgentSessionBinding v7 save without changing unrelated journal bytes',
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V7_TO_V8_SOURCE,
      checksum: '7438ba7c327f99cfe6eaecedaad97c2e5cd63c0cfdb31b26152eacc9cb2ef5ee',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v7 revisions are malformed.');
        }
        const { fingerprint: legacyFingerprint, ...legacyBundleBody } = bundle;
        if (
          typeof legacyFingerprint !== 'string' ||
          sha256(canonicalJson(legacyBundleBody)) !== legacyFingerprint
        ) throw hashMismatch('bundle_fingerprint', null, 'Saved VTT session fingerprint mismatch.');
        const revisions = bundle.revisions.map((revision) => {
          if (
            !isRecord(revision) ||
            typeof revision.codexSessionId !== 'string' ||
            typeof revision.checksum !== 'string'
          ) {
            throw schemaViolation('VTT session v7 revision has no Codex session ID.');
          }
          const { checksum: _oldChecksum, codexSessionId: legacySessionId, ...oldBody } = revision;
          if (sha256(canonicalJson({ ...oldBody, codexSessionId: legacySessionId })) !== revision.checksum) {
            throw hashMismatch('legacy_revision_checksum', statedRevision(revision), 'VTT session v7 revision checksum mismatch.');
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
    8: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v8_to_v9',
      from: 8,
      witnessedBy: [
        'tests/unit/vtt/session-persistence.test.ts::migrates the literal pre-AgentSessionBinding v7 save without changing unrelated journal bytes',
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V8_TO_V9_SOURCE,
      checksum: 'cf56e83a7fad46c19ab76b437cbb943ba48ce9122022207031ffa7d22f8f826a',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v8 revisions are malformed.');
        }
        const migrateBinding = (value: unknown): unknown => {
          if (value === null) return null;
          if (!isRecord(value)) throw schemaViolation('VTT session v8 agent binding is malformed.');
          return { ...value, callUsage: [], currentContextTokens: null };
        };
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || typeof revision.checksum !== 'string' || !isRecord(revision.transition)) {
            throw schemaViolation('VTT session v8 revision is malformed.');
          }
          const { checksum: _oldChecksum, ...oldBody } = revision;
          if (sha256(canonicalJson(oldBody)) !== revision.checksum) {
            throw hashMismatch('legacy_revision_checksum', statedRevision(revision), 'VTT session v8 revision checksum mismatch.');
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
    9: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v9_to_v10',
      from: 9,
      witnessedBy: [
        'tests/unit/vtt/session-persistence.test.ts::migrates the literal pre-AgentSessionBinding v7 save without changing unrelated journal bytes',
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V9_TO_V10_SOURCE,
      checksum: 'e32f5335315cd5202b872cadf87f171560933a172f562d9ef2483c3a2d7665a8',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v9 revisions are malformed.');
        }
        const migrateBinding = (value: unknown): unknown => {
          if (value === null) return null;
          if (!isRecord(value) || !Number.isSafeInteger(value.recoveryGeneration)) {
            throw schemaViolation('VTT session v9 agent binding is malformed.');
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
            throw schemaViolation('VTT session v9 revision is malformed.');
          }
          const { checksum: _oldChecksum, ...oldBody } = revision;
          if (sha256(canonicalJson(oldBody)) !== revision.checksum) {
            throw hashMismatch('legacy_revision_checksum', statedRevision(revision), 'VTT session v9 revision checksum mismatch.');
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
    10: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v10_to_v11',
      from: 10,
      witnessedBy: [
        'tests/unit/vtt/session-persistence.test.ts::preserves known sizes and emits explicit v10 adjudication records for every unknown',
        'tests/unit/vtt/session-persistence.test.ts::decodes the hand-authored schema-10 creature-space fixture through the current schema',
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V10_TO_V11_SOURCE,
      checksum: '7c407f3ed1d3ad12692deeca519742dcef3b6a89e8b8de16e76964b3d2d583ef',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v10 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || typeof revision.checksum !== 'string') {
            throw schemaViolation('VTT session v10 revision is malformed.');
          }
          const { checksum: _oldChecksum, ...oldBody } = revision;
          if (sha256(canonicalJson(oldBody)) !== revision.checksum) {
            throw hashMismatch('legacy_revision_checksum', statedRevision(revision), 'VTT session v10 revision checksum mismatch.');
          }
          const encounterState = migrateV10EncounterState(revision.encounterState);
          const body = {
            ...oldBody,
            schemaVersion: 11 as const,
            encounterState,
            branchRngStateFingerprint: branchRngStateFingerprint(encounterState),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 11 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    11: Object.freeze({
      kind: 'legacy_bundle',
      id: 'vtt_session_v11_to_v12',
      from: 11,
      witnessedBy: [
        'tests/unit/vtt/session-persistence.test.ts::migrates a hand-authored pre-history schema-11 save without guessing observations',
        'tests/unit/vtt/session-v13-footprint-migration.test.ts::D919 mixed versions: a stored v11 + v12 stream is one save, one archive of every stored revision',
        'tests/unit/vtt/session-persistence.test.ts::MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export',
      ] as const,
      source: V11_TO_V12_SOURCE,
      checksum: '0e45635886c5cd0f61e1ae8df72d030417642154833165bdec642a520813b976',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw schemaViolation('VTT session v11 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || typeof revision.checksum !== 'string' || !isRecord(revision.encounterState)) {
            throw schemaViolation('VTT session v11 revision is malformed.');
          }
          const { checksum: _oldChecksum, ...oldBody } = revision;
          if (sha256(canonicalJson(oldBody)) !== revision.checksum) {
            throw hashMismatch('legacy_revision_checksum', statedRevision(revision), 'VTT session v11 revision checksum mismatch.');
          }
          const encounterState = {
            ...revision.encounterState,
            observationHistory: [],
          } as unknown as DecodedStateRest;
          const body = {
            ...oldBody,
            schemaVersion: 12 as const,
            encounterState,
            branchRngStateFingerprint: branchRngStateFingerprint(encounterState),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 12 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    // FOOTPRINT (D900, D919): the version bump of a stream schema 13 can express, else the archive.
    12: Object.freeze({
      kind: 'bump_or_archive',
      id: 'vtt_session_v12_to_v13',
      source: V12_TO_V13_SOURCE,
      checksum: 'de046b49e03876e51e0a05476f63449bdbaa3d888b24f3273ecbb20a5aa5e4e7',
      verified: verifiedV12Revisions,
      expressible: v12StreamIsExpressible,
      bump: bumpedV12Bundle,
      archive: archivedV13Bundle,
    }),
} as const satisfies VttSessionMigrationChainShape);

/** Every step that names a source matches its recorded sha256, and no two steps share an id. */
export function validateVttSessionMigrationChain(): void {
  const ids = new Set<string>();
  for (const step of Object.values(VTT_SESSION_MIGRATION_CHAIN)) {
    if (ids.has(step.id) || sha256(step.source) !== step.checksum) {
      throw new Error('VTT session migration chain is invalid.');
    }
    ids.add(step.id);
  }
}

/** What the loader accepted, as it arrived: the texts a v13 archive keeps if the save has to be archived (D919). */
export type AcceptedInput =
  | { readonly kind: 'saved_session'; readonly text: string }
  | { readonly kind: 'stored_stream'; readonly texts: readonly string[] };

function archivedText(text: string): ArchivedText {
  return { text, sha256: sha256(text) };
}

/** The texts of an archived source, in order: the save's, or each stored revision's. */
function archivedTexts(source: ArchivedSource): readonly ArchivedText[] {
  switch (source.kind) {
    case 'saved_session': return [source.save];
    case 'stored_stream': return source.revisions;
  }
}

/** A revision bundle of `revisions` at `schemaVersion`, fingerprinted as the migration chain reads one. */
function revisionBundleOf(
  sessionId: string,
  schemaVersion: number,
  revisions: readonly unknown[],
): Readonly<Record<string, unknown>> {
  const body = { format: 'vtt-session-revisions' as const, schemaVersion, sessionId, revisions };
  return { ...body, fingerprint: sha256(canonicalJson(body)) };
}

/** A stored stream's parsed revisions of one session, split into contiguous schema-version groups, in order. */
function schemaVersionGroups(
  revisions: readonly unknown[],
): { readonly sessionId: string; readonly groups: readonly { readonly schemaVersion: number; readonly revisions: readonly unknown[] }[] } {
  const first = revisions[0];
  if (
    !isRecord(first) ||
    typeof first.sessionId !== 'string' ||
    !Number.isSafeInteger(first.schemaVersion)
  ) throw schemaViolation('Stored VTT session revision stream is malformed.');
  const groups: Array<{ readonly schemaVersion: number; readonly revisions: unknown[] }> = [];
  for (const revision of revisions) {
    if (
      !isRecord(revision) ||
      revision.sessionId !== first.sessionId ||
      !Number.isSafeInteger(revision.schemaVersion)
    ) throw schemaViolation('Stored VTT session revision stream is malformed.');
    const schemaVersion = revision.schemaVersion as number;
    const current = groups.at(-1);
    if (current?.schemaVersion === schemaVersion) current.revisions.push(revision);
    else groups.push({ schemaVersion, revisions: [revision] });
  }
  return { sessionId: first.sessionId, groups };
}

/**
 * A stored stream from before the bump-or-archive step as one bundle at that step's schema: each contiguous version
 * group migrated by the chain's legacy steps.
 */
function storedStreamArchiveStepBundle(
  sessionId: string,
  groups: readonly { readonly schemaVersion: number; readonly revisions: readonly unknown[] }[],
): Readonly<Record<string, unknown>> {
  const v12Revisions = groups.flatMap((group) => {
    const migrated = migratedToArchiveStep(revisionBundleOf(sessionId, group.schemaVersion, group.revisions));
    return Array.isArray(migrated.revisions) ? migrated.revisions : [];
  });
  return revisionBundleOf(sessionId, LAST_SCHEMA_BEFORE_ENGINE_RECORDING, v12Revisions);
}

/** A saved journal DAG of a pre-v13 version, expanded to its revision bundle (its fingerprint checked first). */
function expandedLegacyJournalDag(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  if (
    !Number.isSafeInteger(value.schemaVersion) ||
    (value.schemaVersion as number) < JOURNAL_DAG_FIRST_SCHEMA_VERSION ||
    (value.schemaVersion as number) > LAST_SCHEMA_BEFORE_ENGINE_RECORDING ||
    typeof value.sessionId !== 'string' ||
    typeof value.fingerprint !== 'string'
  ) throw schemaViolation('Saved VTT session journal DAG header is malformed.');
  const legacySchemaVersion = value.schemaVersion;
  const legacyBody = {
    format: JOURNAL_DAG_FORMAT,
    schemaVersion: legacySchemaVersion,
    sessionId: value.sessionId,
    nodes: value.nodes,
    revisions: value.revisions,
  };
  if (sha256(canonicalJson(legacyBody)) !== value.fingerprint) {
    throw hashMismatch('bundle_fingerprint', null, 'Saved VTT session fingerprint mismatch.');
  }
  const expandedLegacyBody = {
    format: 'vtt-session-revisions',
    schemaVersion: legacySchemaVersion,
    sessionId: value.sessionId,
    revisions: decodeJournalDagValues(value.nodes, value.revisions),
  };
  return { ...expandedLegacyBody, fingerprint: sha256(canonicalJson(expandedLegacyBody)) };
}

/**
 * A saved bundle from before engine recording (revision list or journal DAG) migrated by the chain's legacy steps to
 * the bump-or-archive step's schema (12), the last schema its history can be replayed under. Every step verifies the
 * checksums of what it reads.
 */
function migratedToArchiveStep(value: unknown): Readonly<Record<string, unknown>> {
  const expanded = isRecord(value) && value.format === JOURNAL_DAG_FORMAT ? expandedLegacyJournalDag(value) : value;
  if (!isRecord(expanded) || !Number.isSafeInteger(expanded.schemaVersion)) {
    throw schemaViolation('Saved VTT session has no valid schema version.');
  }
  let migrated: Readonly<Record<string, unknown>> = expanded;
  let version: number = expanded.schemaVersion as number;
  if (version !== LAST_SCHEMA_BEFORE_ENGINE_RECORDING && !isLegacyBundleVersion(version)) {
    throw schemaViolation('Saved VTT session is outside the migration window.');
  }
  while (isLegacyBundleVersion(version)) {
    migrated = VTT_SESSION_MIGRATION_CHAIN[version].migrate(migrated);
    version += 1;
  }
  return migrated;
}

/** The v12 revisions of a bundle, each with its v12 checksum verified. */
function verifiedV12Revisions(bundle: Readonly<Record<string, unknown>>): readonly Readonly<Record<string, unknown>>[] {
  if (bundle.schemaVersion !== LAST_SCHEMA_BEFORE_ENGINE_RECORDING || !Array.isArray(bundle.revisions) || bundle.revisions.length === 0) {
    throw schemaViolation('VTT session v12 revisions are malformed.');
  }
  return bundle.revisions.map((revision) => {
    if (!isRecord(revision) || typeof revision.checksum !== 'string' || !isRecord(revision.encounterState)) {
      throw schemaViolation('VTT session v12 revision is malformed.');
    }
    const { checksum: _checksum, ...body } = revision;
    if (sha256(canonicalJson(body)) !== revision.checksum) throw hashMismatch('legacy_revision_checksum', statedRevision(revision), 'VTT session v12 revision checksum mismatch.');
    return revision;
  });
}

/** Whether every revision of a v12 stream is expressible in v13, so the stream migrates by the version bump alone. */
function v12StreamIsExpressible(revisions: readonly Readonly<Record<string, unknown>>[]): boolean {
  return revisions.every((revision) => v13PlacementIssues(revision.encounterState as Readonly<Record<string, unknown>>).length === 0);
}

/** The v12 -> v13 bump of a stream v13 can express: the schema version and the checksums, nothing else. */
function bumpedV12Bundle(bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const revisions = verifiedV12Revisions(bundle);
  if (!v12StreamIsExpressible(revisions)) {
    throw new Error('A v12 session whose history v13 cannot express migrates by archive, not by the version bump.');
  }
  const bumped = revisions.map((revision) => {
    const { checksum: _checksum, ...oldBody } = revision;
    const body = { ...oldBody, schemaVersion: 13 as const, recordedBy: RECORDED_BEFORE_ENGINE_RECORDING };
    return { ...body, checksum: sha256(canonicalJson(body)) };
  });
  const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
  const body = { ...oldBundle, format: 'vtt-session-revisions' as const, schemaVersion: 13 as const, revisions: bumped };
  return { ...body, fingerprint: sha256(canonicalJson(body)) };
}

/**
 * D919: a v12 stream v13 cannot express becomes ONE v13 revision. Its state is the stream's current state
 * (its last revision) repaired by the D514 rule (session-v13-migration.ts); every other field is carried from
 * that revision; its transition keeps the whole source save verbatim as a read-only archive, with every repair.
 * New history starts here. No archived turn is re-reduced.
 */
function archivedV13Bundle(
  bundle: Readonly<Record<string, unknown>>,
  archive: SessionHistoryArchive,
  recordingEngine: EngineBuild,
): Readonly<Record<string, unknown>> {
  const revisions = verifiedV12Revisions(bundle);
  const head = revisions.at(-1);
  if (head === undefined) throw schemaViolation('VTT session v12 revisions are malformed.');
  const repaired = repairV12EncounterState(head.encounterState as Readonly<Record<string, unknown>>);
  const body = {
    schemaVersion: 13 as const,
    sessionId: head.sessionId,
    revision: 1,
    activeHeadRevision: 1,
    parentRevision: null,
    branchId: head.branchId,
    transition: {
      kind: 'session_migrated' as const,
      migration: 'vtt_session_v12_to_v13' satisfies BumpOrArchiveStep['id'],
      archive,
      placementRepair: repaired.repairs,
    },
    encounterState: repaired.state,
    branchRngStateFingerprint: branchRngStateFingerprint(repaired.state as unknown as DecodedStateRest),
    partyState: head.partyState,
    rngState: head.rngState,
    coordinatorState: head.coordinatorState,
    controllers: head.controllers,
    agentSession: head.agentSession,
    recordedBy: recordingEngine,
  };
  const root = { ...body, checksum: sha256(canonicalJson(body)) };
  const migratedBody = {
    format: 'vtt-session-revisions' as const,
    schemaVersion: 13 as const,
    sessionId: bundle.sessionId,
    revisions: [root],
  };
  return { ...migratedBody, fingerprint: sha256(canonicalJson(migratedBody)) };
}

/**
 * The engine build a stored or saved revision names, read from inside its own checksum; a revision of schema 12 or
 * older names none.
 */
function recordedByOf(revision: unknown, label: string): EngineBuild {
  if (!isRecord(revision) || !Number.isSafeInteger(revision.schemaVersion)) throw schemaViolation(`${label} is malformed.`);
  if ((revision.schemaVersion as number) <= LAST_SCHEMA_BEFORE_ENGINE_RECORDING) return RECORDED_BEFORE_ENGINE_RECORDING;
  // FOOTPRINT fix2 (codex r2 P1): the build is read only from inside the revision's own checksum, so a build
  // written over the recorded one is refused rather than believed.
  const { checksum, ...body } = revision;
  if (typeof checksum !== 'string' || sha256(canonicalJson(body)) !== checksum) {
    throw hashMismatch('recorded_build_checksum', statedRevision(revision), `${label} checksum does not cover its recorded engine build.`);
  }
  return decodeEngineBuild(revision.recordedBy, `${label} recordedBy`);
}

/**
 * The schema version and engine build of each revision a saved session records. A save of schema 12 or older
 * names no engine build: one entry, recorded before engine recording. A newer save's revisions (a journal DAG
 * expanded) each name theirs.
 */
function savedSessionRecording(value: unknown): readonly { readonly schemaVersion: number; readonly recordedBy: EngineBuild }[] {
  if (!isRecord(value) || !Number.isSafeInteger(value.schemaVersion)) throw schemaViolation('Saved VTT session has no valid schema version.');
  const schemaVersion = value.schemaVersion as number;
  if (schemaVersion <= LAST_SCHEMA_BEFORE_ENGINE_RECORDING) return [{ schemaVersion, recordedBy: RECORDED_BEFORE_ENGINE_RECORDING }];
  const revisions = value.format === JOURNAL_DAG_FORMAT ? decodeJournalDagValues(value.nodes, value.revisions) : value.revisions;
  if (!Array.isArray(revisions) || revisions.length === 0) throw schemaViolation('Saved VTT session revisions are malformed.');
  return revisions.map((revision, index) => ({ schemaVersion, recordedBy: recordedByOf(revision, `Saved revision ${String(index + 1)}`) }));
}

/**
 * What an archived source's revisions record, derived from its texts alone (FOOTPRINT fix2, codex r2 P1): each
 * revision's schema version, and the engine build each names inside its own checksum, reduced to the one commit
 * they all name or why there is none (recordedEngineOf). This is the only source of an archive's recording: an
 * archive's own metadata is checked against it, never used in its place. Throws when a text is not a revision whose
 * recording it can read.
 */
export function archivedSourceRecording(source: ArchivedSource): ArchivedSourceRecording {
  const recorded = source.kind === 'saved_session'
    ? savedSessionRecording(JSON.parse(source.save.text))
    : source.revisions.map((archived, index) => {
        const revision: unknown = JSON.parse(archived.text);
        const recordedBy = recordedByOf(revision, `Stored revision ${String(index + 1)}`);
        // recordedByOf refuses a revision without a safe-integer schemaVersion.
        return { schemaVersion: (revision as Readonly<Record<string, unknown>>).schemaVersion as number, recordedBy };
      });
  return {
    recordedSchemaVersions: [...new Set(recorded.map((entry) => entry.schemaVersion))].sort((left, right) => left - right),
    recordedEngine: recordedEngineOf(recorded.map((entry) => entry.recordedBy)),
  };
}

/**
 * The archive of a history exactly as the loader accepted it (owner D919): every accepted text with its sha256, and
 * what its revisions record (archivedSourceRecording). The v12 -> v13 migration archives with it; tools that hold a
 * save (tools/session-archive-replay.ts) do too.
 */
export function sessionHistoryArchiveOf(input: AcceptedInput): SessionHistoryArchive {
  const source: ArchivedSource = input.kind === 'saved_session'
    ? { kind: 'saved_session', save: archivedText(input.text) }
    : { kind: 'stored_stream', revisions: input.texts.map(archivedText) };
  return { kind: 'vtt_session_history_archive', source, ...archivedSourceRecording(source) };
}

/**
 * The bump-or-archive step of the loader: the version bump when the next schema can express the whole stream, else
 * the archive (D919), whose root `recordingEngine` records. (Revision-rewrite steps after it carry its output on; the
 * first one, MOVE-COST's key 13, adds that carrying, since SAVE-COMPAT's chain has none: decisions.md:92.)
 */
function migratedThroughArchiveStep(
  bundle: Readonly<Record<string, unknown>>,
  from: AcceptedInput,
  recordingEngine: EngineBuild,
): Readonly<Record<string, unknown>> {
  const step = VTT_SESSION_MIGRATION_CHAIN[LAST_SCHEMA_BEFORE_ENGINE_RECORDING];
  return step.expressible(step.verified(bundle))
    ? step.bump(bundle)
    : step.archive(bundle, sessionHistoryArchiveOf(from), recordingEngine);
}

/** A v13 revision bundle, every revision decoded and the fingerprint checked. */
function decodedV13Bundle(migrated: Readonly<Record<string, unknown>>): SavedSessionBundleV2 {
  if (
    migrated.format !== 'vtt-session-revisions' ||
    migrated.schemaVersion !== VTT_SESSION_SCHEMA_VERSION ||
    typeof migrated.sessionId !== 'string' ||
    !Array.isArray(migrated.revisions) ||
    typeof migrated.fingerprint !== 'string'
  ) {
    throw schemaViolation('Saved VTT session bundle is malformed.');
  }
  const body: SavedSessionBundleV2Body = {
    format: 'vtt-session-revisions',
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId: migrated.sessionId as EncounterSessionId,
    revisions: migrated.revisions.map(decodeRevision),
  };
  if (sessionFingerprint(body) !== migrated.fingerprint) {
    throw hashMismatch('bundle_fingerprint', null, 'Saved VTT session fingerprint mismatch.');
  }
  return { ...body, fingerprint: migrated.fingerprint };
}

/**
 * A saved session's text, parsed and migrated to v13. A save v13 cannot express archives `text` itself (D919), in
 * a root `recordingEngine` records.
 */
function migrateSavedBundle(text: string, recordingEngine: EngineBuild): SavedSessionBundleV2 {
  validateVttSessionMigrationChain();
  const value: unknown = JSON.parse(text);
  if (isRecord(value) && value.format === JOURNAL_DAG_FORMAT && value.schemaVersion === VTT_SESSION_SCHEMA_VERSION) {
    return decodeJournalDagBundle(value);
  }
  if (isRecord(value) && value.schemaVersion === VTT_SESSION_SCHEMA_VERSION) return decodedV13Bundle(value);
  return decodedV13Bundle(migratedThroughArchiveStep(migratedToArchiveStep(value), { kind: 'saved_session', text }, recordingEngine));
}

/**
 * A stored stream (the local store's revisions of one session, in order, each the text its store holds) migrated
 * to v13. Its contiguous schema-version groups each migrate to v12 by the registered chain, as before; then the
 * WHOLE stream takes the v13 step, so a mixed-version stream is one save: one bump, or one archive of every stored
 * revision's text, byte for byte.
 */
export function migrateStoredSessionRevisions(
  texts: readonly string[],
  recordingEngine: EngineBuild,
): readonly SessionRevision[] {
  const revisions: readonly unknown[] = texts.map((text): unknown => JSON.parse(text));
  const { sessionId, groups } = schemaVersionGroups(revisions);
  if (groups.every((group) => group.schemaVersion === VTT_SESSION_SCHEMA_VERSION)) {
    return decodedV13Bundle(revisionBundleOf(sessionId, VTT_SESSION_SCHEMA_VERSION, revisions)).revisions;
  }
  if (groups.some((group) => group.schemaVersion > LAST_SCHEMA_BEFORE_ENGINE_RECORDING)) {
    throw schemaViolation('Stored VTT session revision stream mixes v13 revisions with older ones.');
  }
  validateVttSessionMigrationChain();
  const v13 = migratedThroughArchiveStep(
    storedStreamArchiveStepBundle(sessionId, groups),
    { kind: 'stored_stream', texts },
    recordingEngine,
  );
  return decodedV13Bundle(v13).revisions;
}

/**
 * A replay bundle's embedded session revision (a proof of its history, not a save to continue) that v13 cannot
 * express. D919 keeps old history verifiable under the rules it was recorded under: such a replay is verified by
 * the last v12 build, not re-interpreted here.
 */
export class ReplayHistoryNotExpressibleError extends Error {
  override readonly name = 'ReplayHistoryNotExpressibleError' as const;

  constructor(readonly issues: readonly string[]) {
    super(`This replay's history holds a placement v13 cannot express (${issues.join('; ')}); replay it with the last v12 build.`);
  }
}

/**
 * One revision embedded in a replay bundle, migrated to the current session schema: the registered chain to v12,
 * then the v13 version bump. A replay is history, so nothing is archived or repaired here: a revision v13 cannot
 * express is refused (ReplayHistoryNotExpressibleError).
 */
export function migrateReplayEmbeddedRevision(revision: unknown): SessionRevision {
  if (!isRecord(revision) || typeof revision.sessionId !== 'string' || !Number.isSafeInteger(revision.schemaVersion)) {
    throw schemaViolation('Embedded VTT replay revision is malformed.');
  }
  const bundleOf = (schemaVersion: number, revisions: readonly unknown[]) => {
    const body = { format: 'vtt-session-revisions' as const, schemaVersion, sessionId: revision.sessionId, revisions };
    return { ...body, fingerprint: sha256(canonicalJson(body)) };
  };
  if (revision.schemaVersion === VTT_SESSION_SCHEMA_VERSION) {
    const [decoded] = decodedV13Bundle(bundleOf(VTT_SESSION_SCHEMA_VERSION, [revision])).revisions;
    if (decoded === undefined) throw schemaViolation('Embedded VTT replay revision is malformed.');
    return decoded;
  }
  validateVttSessionMigrationChain();
  const step = VTT_SESSION_MIGRATION_CHAIN[LAST_SCHEMA_BEFORE_ENGINE_RECORDING];
  const v12 = migratedToArchiveStep(bundleOf(revision.schemaVersion as number, [revision]));
  const issues = step.verified(v12).flatMap((entry) =>
    v13PlacementIssues(entry.encounterState as Readonly<Record<string, unknown>>));
  if (issues.length > 0) throw new ReplayHistoryNotExpressibleError(issues);
  const [decoded] = decodedV13Bundle(step.bump(v12)).revisions;
  if (decoded === undefined) throw schemaViolation('Embedded VTT replay revision is malformed.');
  return decoded;
}

function decodeArchivedText(value: unknown): ArchivedText {
  if (!isRecord(value) || !hasExactlyKeys(value, ['text', 'sha256']) || typeof value.text !== 'string' ||
    typeof value.sha256 !== 'string') {
    throw new SessionHistoryArchiveError('The session history archive is malformed.');
  }
  if (sha256(value.text) !== value.sha256) {
    throw new SessionHistoryArchiveError('The session history archive does not match its recorded sha256.');
  }
  return { text: value.text, sha256: value.sha256 };
}

function decodeArchivedSource(value: unknown): ArchivedSource {
  if (isRecord(value) && value.kind === 'saved_session' && hasExactlyKeys(value, ['kind', 'save'])) {
    return { kind: 'saved_session', save: decodeArchivedText(value.save) };
  }
  if (isRecord(value) && value.kind === 'stored_stream' && hasExactlyKeys(value, ['kind', 'revisions']) &&
    Array.isArray(value.revisions) && value.revisions.length > 0) {
    return { kind: 'stored_stream', revisions: value.revisions.map(decodeArchivedText) };
  }
  throw new SessionHistoryArchiveError('The session history archive is malformed.');
}

/**
 * A session history archive as decoded: its shape; every archived text against its recorded sha256 (tampering is
 * refused); and its stated recording against the one its archived revisions record (FOOTPRINT fix2, codex r2 P1):
 * metadata that names another engine commit or other schema versions is refused
 * (SessionHistoryArchiveMetadataError). The recording returned is the derived one.
 */
function decodeSessionHistoryArchive(value: unknown): SessionHistoryArchive {
  if (
    !isRecord(value) ||
    !hasExactlyKeys(value, ['kind', 'source', 'recordedSchemaVersions', 'recordedEngine']) ||
    value.kind !== 'vtt_session_history_archive' ||
    !Array.isArray(value.recordedSchemaVersions) || value.recordedSchemaVersions.length === 0 ||
    !value.recordedSchemaVersions.every((version) => Number.isSafeInteger(version) &&
      (VTT_SESSION_SCHEMA_VERSIONS as readonly number[]).includes(version as number))
  ) {
    throw new SessionHistoryArchiveError('The session history archive is malformed.');
  }
  let claimed: ArchivedSourceRecording;
  try {
    claimed = {
      recordedSchemaVersions: value.recordedSchemaVersions as readonly number[],
      recordedEngine: decodeRecordedEngine(value.recordedEngine, 'The session history archive recordedEngine'),
    };
  } catch (error) {
    throw new SessionHistoryArchiveError(error instanceof Error ? error.message : String(error));
  }
  const source = decodeArchivedSource(value.source);
  let derived: ArchivedSourceRecording;
  try {
    derived = archivedSourceRecording(source);
  } catch (error) {
    throw new SessionHistoryArchiveError(
      `The archived revisions do not state what recorded them: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (canonicalJson(claimed) !== canonicalJson(derived)) throw new SessionHistoryArchiveMetadataError(claimed, derived);
  return { kind: 'vtt_session_history_archive', source, ...derived };
}

/**
 * A session history archive document (canonical JSON of a SessionHistoryArchive, as
 * exportSessionHistoryArchiveDocument writes one), decoded with every archived text checked against its sha256:
 * the in-app hash check an offline replay starts from. Throws SessionHistoryArchiveError.
 */
export function decodeSessionHistoryArchiveDocument(text: string): SessionHistoryArchive {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new SessionHistoryArchiveError(`The session history archive is not JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return decodeSessionHistoryArchive(value);
}

/** An archive as a document: canonical JSON, every archived text inside it unchanged. */
export function sessionHistoryArchiveDocument(archive: SessionHistoryArchive): string {
  return canonicalJson(archive);
}

/** A session history archive that fails its own verification (D919: tampering is refused on demand). */
export class SessionHistoryArchiveError extends Error {
  override readonly name = 'SessionHistoryArchiveError' as const;
}

/**
 * An archive whose stated recording (its schema versions and engine commit) is not the one its archived revisions
 * record (FOOTPRINT fix2, codex r2 P1): edited metadata would name a commit to replay at that the history never
 * named, so the archive is refused, never read by its metadata.
 */
export class SessionHistoryArchiveMetadataError extends Error {
  override readonly name = 'SessionHistoryArchiveMetadataError' as const;

  constructor(readonly claimed: ArchivedSourceRecording, readonly derived: ArchivedSourceRecording) {
    super(`The session history archive states ${canonicalJson(claimed)}, but its archived revisions record ${canonicalJson(derived)}.`);
  }
}

/**
 * On-demand verification of a migrated save's archive (D919), under the rules its history was recorded under:
 *   1. the archived bytes hash to the recorded sha256;
 *   2. the source reads back under its own recorded versions: every revision checksum and bundle fingerprint the
 *      registered chain checks, up to v12, the last schema its history replays under;
 *   3. the migration re-derived from the archive equals the root revision: the repaired state, every repair and
 *      every carried field.
 * A full reducer replay of the archived turns belongs to the last v12 build (exportSessionHistoryArchive).
 * Returns the archive; throws SessionHistoryArchiveError naming the first check that fails. The root re-derivation (3)
 * runs the v12 repair, a derivation: when the root does not follow and another build than `runningBuild` recorded
 * it (the root's own build), the refusal is the cross-build one (SAVE-COMPAT, D943); under its own build it is
 * the archive error.
 */
export function verifySessionHistoryArchive(
  root: SessionRevision,
  runningBuild: EngineBuild = RUNNING_ENGINE_BUILD,
): SessionHistoryArchive {
  if (root.revision !== 1 || root.transition.kind !== 'session_migrated') {
    throw new SessionHistoryArchiveError('Only a session_migrated root carries a history archive.');
  }
  const archive = decodeSessionHistoryArchive(root.transition.archive);
  let rederived: Exclude<Derived<unknown>, { readonly kind: 'trusted' }>;
  try {
    let v12Bundle: Readonly<Record<string, unknown>>;
    switch (archive.source.kind) {
      case 'saved_session':
        v12Bundle = migratedToArchiveStep(JSON.parse(archive.source.save.text));
        break;
      case 'stored_stream': {
        const { sessionId, groups } = schemaVersionGroups(
          archive.source.revisions.map((revision): unknown => JSON.parse(revision.text)),
        );
        if (sessionId !== root.sessionId) throw schemaViolation('The archived stream belongs to another session.');
        v12Bundle = storedStreamArchiveStepBundle(sessionId, groups);
        break;
      }
    }
    rederived = derive('strict', 'migrated root', () => {
      const bundle = VTT_SESSION_MIGRATION_CHAIN[LAST_SCHEMA_BEFORE_ENGINE_RECORDING].archive(v12Bundle, archive, root.recordedBy);
      const [expected] = Array.isArray(bundle.revisions) ? bundle.revisions : [];
      return expected;
    });
  } catch (error) {
    if (error instanceof SessionHistoryArchiveError) throw error;
    throw new SessionHistoryArchiveError(
      `The archived history does not verify under its recorded rules: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const failure: DerivationFailure | null = rederived.kind === 'refused'
    ? rederived.failure
    : canonicalJson(rederived.value) === canonicalJson(root)
      ? null
      : { kind: 'derivation_differs', check: 'migrated root' };
  if (failure !== null) {
    const refusal = derivationFailed(root, 'session_migrated', failure, runningBuild);
    if (refusal instanceof SessionIntegrityError) {
      throw new SessionHistoryArchiveError('The migrated root does not follow from its archived history.');
    }
    throw refusal;
  }
  return archive;
}

/**
 * The archived inputs exactly as the loader accepted them (D919: byte for byte), after on-demand verification: the
 * imported save's text, or each stored revision's text, in order.
 */
export function exportSessionHistoryArchive(root: SessionRevision): readonly string[] {
  return archivedTexts(verifySessionHistoryArchive(root).source).map((archived) => archived.text);
}

/** The journal-DAG body of `revisions` as recorded: what an export writes and fingerprints. */
function journalDagBody(sessionId: EncounterSessionId, revisions: readonly SessionRevision[]): JournalDagBundleBody {
  return {
    format: JOURNAL_DAG_FORMAT,
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId,
    ...encodeJournalDag(revisions),
  };
}

/**
 * `revisions` as a save exactly as recorded (a journal DAG with its session record): the revision sequence is checked,
 * NOTHING is replayed. What a refused entry exports, so the recording build can replay what the refusal names.
 */
export function encodeRecordedSession(revisions: readonly SessionRevision[]): string {
  const first = revisions[0];
  if (first === undefined) throw new Error('Encounter session does not exist.');
  verifyRevisionSequence(revisions, first.sessionId);
  const body = journalDagBody(first.sessionId, revisions);
  return canonicalJson({
    ...body,
    fingerprint: sha256(canonicalJson(body)),
    sessionRecord: deriveSessionRecord(revisions),
  } satisfies JournalDagBundle);
}

/** The strict export: the session's revisions replayed under the store's build, then encoded as recorded. */
export function exportSavedSession(
  store: SessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId);
  if (revisions.length === 0) throw new Error('Encounter session does not exist.');
  return encodeRecordedSession(replayVerifiedRevisions(revisions, store.recordingEngine));
}

/**
 * A listing's summary of `revisions` as recorded, without a replay: the fingerprint of their as-recorded export (a
 * journal DAG, what a listing has always reported) and the recorded last revision.
 */
export function recordedSessionSummary(revisions: readonly SessionRevision[]): DecodedSavedSessionFingerprint {
  const first = revisions[0];
  const latest = revisions.at(-1);
  if (first === undefined || latest === undefined) throw new Error('Encounter session does not exist.');
  return {
    sessionId: first.sessionId,
    fingerprint: sha256(canonicalJson(journalDagBody(first.sessionId, revisions))),
    revisionCount: revisions.length,
    room: latest.partyState?.room ?? null,
    round: latest.encounterState.round,
    initialSeed: latest.rngState.initialSeed,
  };
}

/**
 * What a stored stream's own texts are as a save, for an entry whose migration is not persisted or that does not
 * decode (SAVE-COMPAT §6.6): every text at one schema version -> a revision bundle at that version of the texts as
 * parsed (their checksums untouched, the fingerprint computed), which every build whose chain reads that version
 * imports; mixed versions (only a pre-v13 stream) -> the D919 history-archive document of the stored stream, byte for
 * byte, which tools/session-archive-replay.ts --archive reads. Never a migration's output.
 */
export function exportStoredSessionSource(texts: readonly string[]): string {
  const revisions: readonly unknown[] = texts.map((text): unknown => JSON.parse(text));
  const { sessionId, groups } = schemaVersionGroups(revisions);
  const [only, ...others] = groups;
  if (only !== undefined && others.length === 0) {
    return canonicalJson(revisionBundleOf(sessionId, only.schemaVersion, revisions));
  }
  return sessionHistoryArchiveDocument(sessionHistoryArchiveOf({ kind: 'stored_stream', texts }));
}

/** Why a save does not load, as every load surface shows it (SAVE-COMPAT §6.4). `message` is what the player reads. */
export type SessionLoadRefusal =
  | { readonly kind: 'recorded_by_other_build'; readonly refusal: RecordedByOtherBuild; readonly message: string }
  | { readonly kind: 'not_migratable'; readonly refusal: SessionNotMigratable; readonly message: string }
  | { readonly kind: 'integrity'; readonly fault: SessionIntegrityFault; readonly message: string }
  /** Any other throw (a structural replay fault, another module's decoder, an unexpected error): its own name and message. */
  | { readonly kind: 'load_failed'; readonly errorName: string; readonly message: string };

export interface LoadableSavedSession { readonly kind: 'loadable' }
export interface RefusedSavedSession { readonly kind: 'refused'; readonly refusal: SessionLoadRefusal }
export type SavedSessionLoadability = LoadableSavedSession | RefusedSavedSession;

/** Any throw of a load as the refusal a surface shows: the typed kinds by class, everything else load_failed. */
export function sessionLoadRefusalOf(error: unknown): SessionLoadRefusal {
  if (error instanceof SessionRecordedByOtherBuildError) {
    return { kind: 'recorded_by_other_build', refusal: error.refusal, message: error.message };
  }
  if (error instanceof SessionNotMigratableError) {
    return { kind: 'not_migratable', refusal: error.refusal, message: error.message };
  }
  if (error instanceof SessionIntegrityError) return { kind: 'integrity', fault: error.fault, message: error.message };
  if (error instanceof SessionHistoryArchiveError || error instanceof SessionHistoryArchiveMetadataError) {
    const typed = new SessionIntegrityError({ kind: 'archive_refused', detail: error.message });
    return { kind: 'integrity', fault: typed.fault, message: typed.message };
  }
  const errorName = error instanceof Error ? error.name : 'thrown value';
  const detail = error instanceof Error ? error.message : String(error);
  return { kind: 'load_failed', errorName, message: `Save could not be loaded: ${errorName}: ${detail}` };
}

/** Whether `revisions` load (a strict replay under `running`), and if not, why. */
export function savedSessionLoadability(
  revisions: readonly SessionRevision[],
  running: EngineBuild,
): SavedSessionLoadability {
  try {
    replaySessionRevisions(revisions, running);
    return { kind: 'loadable' };
  } catch (error) {
    return { kind: 'refused', refusal: sessionLoadRefusalOf(error) };
  }
}

function bundleSummary(bundle: SavedSessionBundleV2): DecodedSavedSessionFingerprint {
  const latest = bundle.revisions.at(-1);
  if (latest === undefined) throw schemaViolation('Saved VTT session revisions are malformed.');
  return {
    sessionId: bundle.sessionId,
    fingerprint: bundle.fingerprint,
    revisionCount: bundle.revisions.length,
    room: latest.partyState?.room ?? null,
    round: latest.encounterState.round,
    initialSeed: latest.rngState.initialSeed,
  };
}

/**
 * Decodes, fingerprints, and replays a save without importing it. A save that migrates by archive gets a root
 * recorded by `recordingEngine`: pass a store's own to fingerprint what that store would import.
 */
export function decodeSavedSessionFingerprint(
  bytes: string,
  recordingEngine: EngineBuild = RUNNING_ENGINE_BUILD,
): DecodedSavedSessionFingerprint {
  const bundle = migrateSavedBundle(bytes, recordingEngine);
  replaySessionRevisions(bundle.revisions, recordingEngine);
  return bundleSummary(bundle);
}

/** A save decoded as recorded, NO replay: its summary (its own fingerprint, its recorded last revision) and revisions. */
export function decodeSavedSession(
  bytes: string,
  recordingEngine: EngineBuild = RUNNING_ENGINE_BUILD,
): { readonly summary: DecodedSavedSessionFingerprint; readonly revisions: readonly SessionRevision[] } {
  const bundle = migrateSavedBundle(bytes, recordingEngine);
  verifyRevisionSequence(bundle.revisions, bundle.sessionId);
  return { summary: bundleSummary(bundle), revisions: bundle.revisions };
}

/** A save's summary as recorded (decode, migrate, hashes, schema, sequence), NO replay. */
export function savedSessionSummary(
  bytes: string,
  recordingEngine: EngineBuild = RUNNING_ENGINE_BUILD,
): DecodedSavedSessionFingerprint {
  return decodeSavedSession(bytes, recordingEngine).summary;
}

/**
 * A saved session's revisions as recorded: decoded and migrated, every hash, the schema and the revision sequence
 * checked, and NOT replayed (no rule re-derives anything). A save that migrates by archive gets a root
 * `recordingEngine` records. What the offline replay decodes before it replays a save at its recording build.
 */
export function decodeSavedSessionRevisions(
  bytes: string,
  recordingEngine: EngineBuild = RUNNING_ENGINE_BUILD,
): readonly SessionRevision[] {
  return decodeSavedSession(bytes, recordingEngine).revisions;
}

/**
 * Imports a save: decoded and migrated, then strictly replayed under the store's build BEFORE any write (SAVE-COMPAT
 * C3, WR16): a save the build cannot verify is refused with its typed error and nothing is stored.
 */
export function importSavedSession(
  store: SessionStore,
  bytes: string,
): EncounterSessionId {
  const bundle = migrateSavedBundle(bytes, store.recordingEngine);
  if (store.revisions(bundle.sessionId).length !== 0) {
    throw new Error('Imported encounter session already exists.');
  }
  store.appendAll(replayVerifiedRevisions(bundle.revisions, store.recordingEngine));
  return bundle.sessionId;
}

export function exportSavedSessionV1ForMigrationTest(
  store: SessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId).map((revision) => {
    const {
      checksum: _checksum,
      partyState: _partyState,
      branchRngStateFingerprint: _branchRngStateFingerprint,
      recordedBy: _recordedBy,
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
  store: SessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId).map((revision) => {
    const { checksum: _checksum, recordedBy: _recordedBy, agentSession, encounterState, ...currentBody } = revision;
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
