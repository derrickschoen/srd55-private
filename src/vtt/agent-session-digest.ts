import { canonicalizeJson, canonicalJson } from '../commands/canonical-json';
import type { EncounterBranchId, EncounterSessionId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import type { JsonValue } from '../domain/models';

export interface AgentSessionDigestDecisionV1 {
  readonly revision: number;
  readonly decision: JsonValue;
}

export interface AgentSessionDigestV1 {
  readonly schemaVersion: 1;
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly completedRoomSummaries: readonly JsonValue[];
  readonly current: {
    readonly room: number;
    readonly round: number;
    readonly phase: JsonValue;
  };
  readonly durableReactionGuidance: JsonValue | null;
  readonly partyResources: JsonValue | null;
  readonly lifeAndHitPointBands: readonly JsonValue[];
  readonly effectsAndResources: readonly JsonValue[];
  readonly recentAcceptedEngineDecisions: readonly AgentSessionDigestDecisionV1[];
}

export interface AgentSessionDigest {
  readonly value: AgentSessionDigestV1;
  readonly bytes: string;
  readonly hash: string;
}

export type AgentSessionDigestInput = Omit<AgentSessionDigestV1, 'schemaVersion'>;

function canonicalValue(value: unknown): JsonValue {
  return canonicalizeJson(value);
}

function compareCanonical(left: JsonValue, right: JsonValue): number {
  const leftBytes = canonicalJson(left);
  const rightBytes = canonicalJson(right);
  return leftBytes < rightBytes ? -1 : leftBytes > rightBytes ? 1 : 0;
}

function canonicalUnorderedValue(value: unknown): JsonValue {
  const canonical = canonicalValue(value);
  if (Array.isArray(canonical)) {
    return canonical.map(canonicalUnorderedValue).sort(compareCanonical);
  }
  if (canonical !== null && typeof canonical === 'object') {
    return Object.fromEntries(Object.entries(canonical).map(([key, entry]) => [
      key,
      canonicalUnorderedValue(entry),
    ]));
  }
  return canonical;
}

function canonicalSet(values: readonly unknown[]): readonly JsonValue[] {
  return values
    .map(canonicalUnorderedValue)
    .sort(compareCanonical);
}

export function createAgentSessionDigestV1(input: AgentSessionDigestInput): AgentSessionDigest {
  if (!Number.isSafeInteger(input.revision) || input.revision < 1 ||
    !Number.isSafeInteger(input.current.room) || input.current.room < 1 ||
    !Number.isSafeInteger(input.current.round) || input.current.round < 0) {
    throw new RangeError('Agent session digest positions must be safe non-negative engine coordinates.');
  }
  const decisions = input.recentAcceptedEngineDecisions
    .map((entry) => ({ revision: entry.revision, decision: canonicalValue(entry.decision) }))
    .sort((left, right) => left.revision - right.revision || compareCanonical(left.decision, right.decision));
  const value: AgentSessionDigestV1 = {
    schemaVersion: 1,
    runId: input.runId,
    branchId: input.branchId,
    revision: input.revision,
    completedRoomSummaries: canonicalSet(input.completedRoomSummaries),
    current: {
      room: input.current.room,
      round: input.current.round,
      phase: canonicalValue(input.current.phase),
    },
    durableReactionGuidance: input.durableReactionGuidance === null
      ? null : canonicalUnorderedValue(input.durableReactionGuidance),
    partyResources: input.partyResources === null ? null : canonicalUnorderedValue(input.partyResources),
    lifeAndHitPointBands: canonicalSet(input.lifeAndHitPointBands),
    effectsAndResources: canonicalSet(input.effectsAndResources),
    recentAcceptedEngineDecisions: decisions,
  };
  const bytes = canonicalJson(value);
  return { value, bytes, hash: sha256(bytes) };
}

export function verifyAgentSessionDigest(digest: AgentSessionDigest): void {
  if (canonicalJson(digest.value) !== digest.bytes || sha256(digest.bytes) !== digest.hash) {
    throw new Error('Agent session digest bytes or hash do not match its canonical engine state.');
  }
}
