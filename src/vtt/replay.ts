import { canonicalJson } from '../commands/canonical-json';
import {
  isEncounterConfig,
  reduceEncounter,
  type EncounterConfig,
  type EncounterState,
} from '../combat/encounter';
import { restoreMulberry32, type SerializableRngState } from '../combat/random';
import {
  dmVisibleEncounter,
  projectDmView,
  projectPlayerView,
  type DmVisibleEncounterState,
  type PlayerView,
} from '../combat/visibility';
import { sha256 } from '../crypto/sha256';
import {
  decodeApprovedEncounterFixture,
  encounterStateFromApprovedFixture,
  type ApprovedEncounterFixture,
  type EncounterFixtureId,
} from './generated-encounter-fixtures';
import {
  deriveBranchRng,
  migrateStoredSessionRevisions,
  replayPacingTransition,
  sessionHistory,
  type SessionRevision,
} from './session-persistence';
import {
  VTT_FLEET_SCHEMA_VERSION,
  emptyFleetTelemetry,
  modelFleetTelemetry,
  type FleetTelemetry,
} from './fleet-telemetry';
import {
  adjudicationSubjectGap,
  deduplicateGapReports,
  gapReportSchema,
  type GapReport,
} from './srd-gap-report';

export {
  VTT_FLEET_SCHEMA_VERSION,
  emptyFleetTelemetry,
  modelFleetTelemetry,
  type FleetReasoningEffort,
  type FleetTelemetry,
  type FleetTokenCounts,
} from './fleet-telemetry';

export const VTT_REPLAY_SCHEMA_VERSION = 7 as const;
export const VTT_REPLAY_MINIMUM_SCHEMA_VERSION = 1 as const;

export interface ReplayControllerIdentity {
  readonly kind: 'human' | 'algorithm' | 'agent' | 'system';
  readonly controllerId: string;
}

export type ReplayTranscriptKind =
  | 'controller_request'
  | 'policy_result'
  | 'prompt'
  | 'response'
  | 'round_plan'
  | 'invalidation'
  | 'adjudication'
  | 'narration'
  | 'undo'
  | 'void'
  | 'resume';

export interface ReplayRequestLink {
  readonly requestId: string;
  readonly requestSequence: number;
}

export interface ReplayTranscriptDraft {
  readonly kind: ReplayTranscriptKind;
  readonly encounterRevision: number;
  readonly controller: ReplayControllerIdentity;
  readonly requestId: string | null;
  readonly requestLink: ReplayRequestLink | null;
  readonly payload: unknown;
  readonly fleet: FleetTelemetry;
}

export interface ReplayTranscriptRecord extends ReplayTranscriptDraft {
  readonly sequence: number;
  readonly previousSequence: number | null;
  /** Hash of ordered attribution and payload; fleet clocks/usage are excluded. */
  readonly contentHash: string;
}

export interface ReplayProjectionHashes {
  readonly dm: string;
  readonly players: readonly {
    readonly combatantId: string;
    readonly hash: string;
  }[];
}

export interface ReplayRevisionRecord {
  readonly revision: SessionRevision;
  readonly void: boolean;
  readonly rng: {
    readonly pre: SerializableRngState;
    readonly post: SerializableRngState;
  };
  readonly stateHash: string;
  readonly projectionHashes: ReplayProjectionHashes;
}

export interface ReplayBundle {
  readonly format: 'vtt-deterministic-replay';
  readonly schemaVersion: typeof VTT_REPLAY_SCHEMA_VERSION;
  readonly fleetSchemaVersion: typeof VTT_FLEET_SCHEMA_VERSION;
  readonly encounterConfig: EncounterConfig;
  readonly fixture: {
    readonly fixtureId: EncounterFixtureId;
    readonly sha256: string;
    readonly approval: 'owner' | 'test';
  };
  readonly build: {
    readonly buildId: string;
    readonly commit: string;
  };
  readonly protocolVersions: readonly string[];
  readonly licensingVersions: readonly string[];
  readonly gapReports: readonly GapReport[];
  readonly revisions: readonly ReplayRevisionRecord[];
  readonly transcripts: readonly ReplayTranscriptRecord[];
}

export interface ReplayProof {
  readonly fixtureId: EncounterFixtureId;
  readonly revisionCount: number;
  readonly reducerRevisionCount: number;
  readonly eventCount: number;
  readonly transcriptCount: number;
  readonly rounds: number;
  readonly finalStateHash: string;
  readonly finalProjectionHashes: ReplayProjectionHashes;
  readonly authoritativeHash: string;
}

export class ReplayDivergenceError extends Error {
  override readonly name = 'ReplayDivergenceError' as const;

  constructor(
    readonly source: 'bundle' | 'fixture' | 'rng' | 'event' | 'state' | 'projection' | 'transcript' | 'gap_report',
    readonly recordIndex: number,
    readonly field: string,
    readonly expected: unknown,
    readonly actual: unknown,
  ) {
    super(`Replay divergence in ${source} record ${recordIndex} at ${field}.`);
  }
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function transcriptContent(record: ReplayTranscriptDraft & {
  readonly sequence: number;
  readonly previousSequence: number | null;
}): unknown {
  const { fleet: _fleet, ...authoritative } = record;
  return authoritative;
}

export class ReplayTranscriptRecorder {
  readonly #records: ReplayTranscriptRecord[] = [];
  readonly #requests = new Map<string, ReplayTranscriptRecord>();

  record(draft: ReplayTranscriptDraft): ReplayTranscriptRecord {
    const sequence = this.#records.length + 1;
    const previousSequence = sequence === 1 ? null : sequence - 1;
    if (draft.controller.controllerId.trim().length === 0) {
      throw new TypeError('Replay controller id must be non-empty.');
    }
    nonNegativeInteger(draft.encounterRevision, 'transcript.encounterRevision');
    if (draft.kind === 'controller_request') {
      if (draft.requestId === null || draft.requestLink !== null) {
        throw new TypeError('Controller requests require their own request id and no request link.');
      }
      if (this.#requests.has(draft.requestId)) {
        throw new Error(`Duplicate replay request id ${draft.requestId}.`);
      }
    } else if (
      draft.kind === 'policy_result' ||
      draft.kind === 'prompt' ||
      draft.kind === 'response' ||
      draft.kind === 'round_plan' ||
      draft.kind === 'invalidation'
    ) {
      if (draft.requestLink === null) {
        throw new TypeError(`${draft.kind} requires an ordered request link.`);
      }
      const request = this.#requests.get(draft.requestLink.requestId);
      if (
        request === undefined ||
        request.sequence !== draft.requestLink.requestSequence ||
        request.controller.controllerId !== draft.controller.controllerId
      ) {
        throw new Error(`${draft.kind} is attributed to the wrong controller request.`);
      }
    }
    const withOrder = { ...draft, sequence, previousSequence };
    const record: ReplayTranscriptRecord = {
      ...withOrder,
      contentHash: sha256(canonicalJson(transcriptContent(withOrder))),
    };
    this.#records.push(record);
    if (record.kind === 'controller_request' && record.requestId !== null) {
      this.#requests.set(record.requestId, record);
    }
    return record;
  }

  records(): readonly ReplayTranscriptRecord[] {
    return structuredClone(this.#records);
  }
}

interface ReplayViews {
  readonly dm: DmVisibleEncounterState;
  readonly players: readonly {
    readonly combatantId: string;
    readonly projection: PlayerView;
  }[];
}

function projectReplayViews(state: EncounterState): ReplayViews {
  return {
    dm: dmVisibleEncounter(projectDmView(state)),
    players: state.combatants
      .filter((subject) => subject.profile.kind === 'player_character')
      .map((subject) => ({
        combatantId: subject.profile.id,
        projection: projectPlayerView(state, {
          seatId: `seat:replay:${subject.profile.id}`,
          combatantId: subject.profile.id,
        }),
      })),
  };
}

function hashProjections(projections: ReplayViews): ReplayProjectionHashes {
  return {
    dm: sha256(canonicalJson(projections.dm)),
    players: projections.players.map((entry) => ({
      combatantId: entry.combatantId,
      hash: sha256(canonicalJson(entry.projection)),
    })),
  };
}

function replayRevisionRecords(revisions: readonly SessionRevision[]): readonly ReplayRevisionRecord[] {
  const history = sessionHistory(revisions);
  return revisions.map((revision, index) => {
    const prior = revisions[index - 1];
    const pre = prior?.rngState ?? revision.rngState;
    return {
      revision,
      void: history[index]?.void ?? false,
      rng: { pre, post: revision.rngState },
      stateHash: sha256(canonicalJson(revision.encounterState)),
      projectionHashes: hashProjections(projectReplayViews(revision.encounterState)),
    };
  });
}

function adjudicationGapsFromRevisions(revisions: readonly SessionRevision[]): readonly GapReport[] {
  return revisions.flatMap((revision) => {
    if (revision.transition.kind !== 'reducer_applied') return [];
    return revision.transition.events.flatMap((event) => {
      if (event.type !== 'adjudicated') return [];
      const gap = adjudicationSubjectGap({ target: event.target, subject: event.subject });
      return gap === null ? [] : [gap];
    });
  });
}

export function createReplayBundle(input: {
  readonly fixture: ApprovedEncounterFixture;
  readonly revisions: readonly SessionRevision[];
  readonly transcripts: readonly ReplayTranscriptRecord[];
  readonly build: ReplayBundle['build'];
  readonly protocolVersions: readonly string[];
  readonly licensingVersions: readonly string[];
  readonly gapReports: readonly GapReport[];
}): ReplayBundle {
  const fixture = decodeApprovedEncounterFixture(input.fixture);
  if (input.revisions.length === 0) throw new Error('Replay bundle needs at least one revision.');
  const encounterConfig = input.revisions[0]!.encounterState.config;
  if (input.revisions.some(
    (revision) => canonicalJson(revision.encounterState.config) !== canonicalJson(encounterConfig),
  )) {
    throw new Error('Replay bundle encounter configuration changed during the session.');
  }
  const bundle: ReplayBundle = {
    format: 'vtt-deterministic-replay',
    schemaVersion: VTT_REPLAY_SCHEMA_VERSION,
    fleetSchemaVersion: VTT_FLEET_SCHEMA_VERSION,
    encounterConfig: structuredClone(encounterConfig),
    fixture: {
      fixtureId: fixture.fixtureId,
      sha256: fixture.approval.packageSha256,
      approval: fixture.approval.status === 'owner_approved_with_calibration_residuals'
        ? 'owner'
        : 'test',
    },
    build: structuredClone(input.build),
    protocolVersions: [...input.protocolVersions],
    licensingVersions: [...input.licensingVersions],
    gapReports: deduplicateGapReports([
      ...input.gapReports,
      ...adjudicationGapsFromRevisions(input.revisions),
    ]),
    revisions: replayRevisionRecords(input.revisions),
    transcripts: structuredClone(input.transcripts),
  };
  replayBundle(bundle, fixture);
  return bundle;
}

function record(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const V1_TO_V2_SOURCE = 'vtt-replay-v1-to-v2:add-format-and-fleet-schema=vtt-deterministic-replay:1';
const V1_TO_V2_CHECKSUM = '97a0f335d4928ab6cd2720452ea6f53230780f17cd5a1059fea2cfdb34b68b97';
const V2_TO_V3_SOURCE = 'vtt-replay-v2-to-v3:add-gap-reports=[]:1';
const V2_TO_V3_CHECKSUM = '9c7f6016f360115db5e718408a2e2b42f7757604a95e7284f4dcb8453ee1f1c3';
const V3_TO_V4_SOURCE = 'vtt-replay-v3-to-v4:add-fleet-correction-attempts-null-and-fleet-schema=2:1';
const V3_TO_V4_CHECKSUM = '97854870631f51f4cc89cdcd3164ad086ff2954a574428bd8d54692eaccaa9e1';
const V4_TO_V5_SOURCE = 'vtt-replay-v4-to-v5:add-encounter-config-from-first-revision-or-per-combatant:1';
const V4_TO_V5_CHECKSUM = 'c0375bd900a13afe5a87cbc9c75028780c0b323a84bbe78b782084e18785d4d8';
const V5_TO_V6_SOURCE = 'vtt-replay-v5-to-v6:migrate-embedded-session-11-and-rehash-state-projections:1';
const V5_TO_V6_CHECKSUM = 'db9297b92a422ecf32b6ea85e5ab4d5b180ca5e9c39e7e1f36e9831529028cce';
const V6_TO_V7_SOURCE = 'vtt-replay-v6-to-v7:migrate-embedded-session-12-and-rehash-state-projections:1';
const V6_TO_V7_CHECKSUM = '919c1010a9f2a8ec897399653a21e1994dc200dc26fbb2a9b890eedb92f1a5f8';

function migratedEncounterConfig(bundle: Readonly<Record<string, unknown>>): EncounterConfig {
  const revisions = bundle.revisions;
  if (Array.isArray(revisions)) {
    const first = revisions[0];
    if (record(first) && record(first.revision) && record(first.revision.encounterState)) {
      const candidate = first.revision.encounterState.config;
      if (isEncounterConfig(candidate)) return candidate;
    }
  }
  return { initiativeMode: 'per_combatant' };
}

export const VTT_REPLAY_MIGRATIONS = Object.freeze([
  Object.freeze({
    id: 'vtt_replay_v1_to_v2',
    from: 1,
    to: 2,
    source: V1_TO_V2_SOURCE,
    checksum: V1_TO_V2_CHECKSUM,
    migrate: (bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => ({
      ...bundle,
      format: 'vtt-deterministic-replay',
      schemaVersion: 2,
      fleetSchemaVersion: 1,
    }),
  }),
  Object.freeze({
    id: 'vtt_replay_v2_to_v3',
    from: 2,
    to: 3,
    source: V2_TO_V3_SOURCE,
    checksum: V2_TO_V3_CHECKSUM,
    migrate: (bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => ({
      ...bundle,
      schemaVersion: 3,
      gapReports: [],
    }),
  }),
  Object.freeze({
    id: 'vtt_replay_v3_to_v4',
    from: 3,
    to: 4,
    source: V3_TO_V4_SOURCE,
    checksum: V3_TO_V4_CHECKSUM,
    migrate: (bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => ({
      ...bundle,
      schemaVersion: 4,
      fleetSchemaVersion: 2,
      transcripts: Array.isArray(bundle.transcripts)
        ? bundle.transcripts.map((transcript) => record(transcript) && record(transcript.fleet)
          ? {
              ...transcript,
              fleet: {
                ...transcript.fleet,
                correctionAttempts: typeof transcript.fleet.modelId === 'string' ? 0 : null,
              },
            }
          : transcript)
        : bundle.transcripts,
    }),
  }),
  Object.freeze({
    id: 'vtt_replay_v4_to_v5',
    from: 4,
    to: 5,
    source: V4_TO_V5_SOURCE,
    checksum: V4_TO_V5_CHECKSUM,
    migrate: (bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => ({
      ...bundle,
      schemaVersion: 5,
      encounterConfig: migratedEncounterConfig(bundle),
    }),
  }),
  Object.freeze({
    id: 'vtt_replay_v5_to_v6',
    from: 5,
    to: 6,
    source: V5_TO_V6_SOURCE,
    checksum: V5_TO_V6_CHECKSUM,
    migrate: (bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => ({
      ...bundle,
      schemaVersion: 6,
      revisions: Array.isArray(bundle.revisions)
        ? bundle.revisions.map((entry) => {
            if (!record(entry) || !record(entry.revision)) {
              throw new TypeError('VTT replay v5 revision record is malformed.');
            }
            const revision = migrateStoredSessionRevisions([entry.revision])[0];
            if (revision === undefined) throw new TypeError('VTT replay v5 revision migration produced no revision.');
            return {
              ...entry,
              revision,
              stateHash: sha256(canonicalJson(revision.encounterState)),
              projectionHashes: hashProjections(projectReplayViews(revision.encounterState)),
            };
          })
        : bundle.revisions,
    }),
  }),
  Object.freeze({
    id: 'vtt_replay_v6_to_v7',
    from: 6,
    to: 7,
    source: V6_TO_V7_SOURCE,
    checksum: V6_TO_V7_CHECKSUM,
    migrate: (bundle: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => ({
      ...bundle,
      schemaVersion: 7,
      revisions: Array.isArray(bundle.revisions)
        ? bundle.revisions.map((entry) => {
            if (!record(entry) || !record(entry.revision)) {
              throw new TypeError('VTT replay v6 revision record is malformed.');
            }
            const revision = migrateStoredSessionRevisions([entry.revision])[0];
            if (revision === undefined) throw new TypeError('VTT replay v6 revision migration produced no revision.');
            return {
              ...entry,
              revision,
              stateHash: sha256(canonicalJson(revision.encounterState)),
              projectionHashes: hashProjections(projectReplayViews(revision.encounterState)),
            };
          })
        : bundle.revisions,
    }),
  }),
]);

export function validateReplayMigrationRegistry(): void {
  let expected: number = VTT_REPLAY_MINIMUM_SCHEMA_VERSION;
  const ids = new Set<string>();
  for (const migration of VTT_REPLAY_MIGRATIONS) {
    if (
      ids.has(migration.id) ||
      migration.from !== expected ||
      migration.to !== expected + 1 ||
      sha256(migration.source) !== migration.checksum
    ) {
      throw new Error('VTT replay migration registry is invalid.');
    }
    ids.add(migration.id);
    expected = migration.to;
  }
  if (expected !== VTT_REPLAY_SCHEMA_VERSION) {
    throw new Error('VTT replay migration registry does not reach the current schema.');
  }
}

function migrateReplayBundle(value: unknown): ReplayBundle {
  validateReplayMigrationRegistry();
  if (!record(value) || !Number.isSafeInteger(value.schemaVersion)) {
    throw new TypeError('Replay bundle has no valid schema version.');
  }
  let migrated = value;
  let version = value.schemaVersion as number;
  if (version < VTT_REPLAY_MINIMUM_SCHEMA_VERSION || version > VTT_REPLAY_SCHEMA_VERSION) {
    throw new Error('Replay bundle is outside the migration window.');
  }
  while (version < VTT_REPLAY_SCHEMA_VERSION) {
    const migration = VTT_REPLAY_MIGRATIONS.find((candidate) => candidate.from === version);
    if (migration === undefined) throw new Error('Replay bundle has no adjacent migration.');
    migrated = migration.migrate(migrated);
    version = migration.to;
  }
  if (
    migrated.format !== 'vtt-deterministic-replay' ||
    migrated.schemaVersion !== VTT_REPLAY_SCHEMA_VERSION ||
    migrated.fleetSchemaVersion !== VTT_FLEET_SCHEMA_VERSION ||
    !isEncounterConfig(migrated.encounterConfig) ||
    !record(migrated.fixture) ||
    !record(migrated.build) ||
    !Array.isArray(migrated.protocolVersions) ||
    !Array.isArray(migrated.licensingVersions) ||
    !Array.isArray(migrated.gapReports) ||
    !Array.isArray(migrated.revisions) ||
    !Array.isArray(migrated.transcripts)
  ) {
    throw new TypeError('Replay bundle is malformed.');
  }
  return migrated as unknown as ReplayBundle;
}

export function exportReplayBundle(bundle: ReplayBundle): string {
  replayBundle(bundle);
  return canonicalJson(bundle);
}

export function exportReplayBundleV1ForMigrationTest(bundle: ReplayBundle): string {
  const {
    format: _format,
    fleetSchemaVersion: _fleetSchemaVersion,
    schemaVersion: _schemaVersion,
    gapReports: _gapReports,
    encounterConfig: _encounterConfig,
    ...body
  } = bundle;
  return canonicalJson({ ...body, schemaVersion: 1 });
}

export function decodeReplayBundle(bytes: string): ReplayBundle {
  const parsed: unknown = JSON.parse(bytes);
  const migrated = migrateReplayBundle(parsed);
  replayBundle(migrated);
  return migrated;
}

interface Difference {
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
}

function firstDifference(expected: unknown, actual: unknown, path: string): Difference | null {
  if (Object.is(expected, actual)) return null;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return { path: `${path}.length`, expected: expected.length, actual: actual.length };
    }
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(expected[index], actual[index], `${path}[${index}]`);
      if (difference !== null) return difference;
    }
    return null;
  }
  if (record(expected) && record(actual)) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      if (!(key in expected) || !(key in actual)) {
        return { path: `${path}.${key}`, expected: expected[key], actual: actual[key] };
      }
      const difference = firstDifference(expected[key], actual[key], `${path}.${key}`);
      if (difference !== null) return difference;
    }
    return null;
  }
  return { path, expected, actual };
}

function assertEqual(
  source: ReplayDivergenceError['source'],
  index: number,
  field: string,
  expected: unknown,
  actual: unknown,
): void {
  const difference = firstDifference(expected, actual, field);
  if (difference !== null) {
    throw new ReplayDivergenceError(
      source,
      index,
      difference.path,
      difference.expected,
      difference.actual,
    );
  }
}

function validateTranscripts(transcripts: readonly ReplayTranscriptRecord[]): void {
  const requests = new Map<string, ReplayTranscriptRecord>();
  const fleetKeys = [
    'buildId',
    'commit',
    'correctionAttempts',
    'latencyMs',
    'loadLevelTag',
    'modelId',
    'reasoningEffort',
    'tokenCounts',
  ];
  for (const [index, transcript] of transcripts.entries()) {
    if (canonicalJson(Object.keys(transcript.fleet).sort()) !== canonicalJson(fleetKeys)) {
      throw new ReplayDivergenceError('transcript', index, 'fleet', fleetKeys, Object.keys(transcript.fleet));
    }
    try {
      if (transcript.fleet.modelId === null) {
        if (canonicalJson(transcript.fleet) !== canonicalJson(emptyFleetTelemetry())) {
          throw new TypeError('Human telemetry must use the empty fleet record.');
        }
      } else {
        modelFleetTelemetry(transcript.fleet);
      }
    } catch (error: unknown) {
      throw new ReplayDivergenceError(
        'transcript',
        index,
        'fleet',
        'valid fleet telemetry',
        error instanceof Error ? error.message : String(error),
      );
    }
    assertEqual('transcript', index, 'sequence', index + 1, transcript.sequence);
    assertEqual(
      'transcript',
      index,
      'previousSequence',
      index === 0 ? null : index,
      transcript.previousSequence,
    );
    if (transcript.kind === 'controller_request') {
      if (transcript.requestId === null || transcript.requestLink !== null) {
        throw new ReplayDivergenceError(
          'transcript', index, 'requestId', 'unique controller request id', transcript.requestId,
        );
      }
      if (requests.has(transcript.requestId)) {
        throw new ReplayDivergenceError(
          'transcript', index, 'requestId', 'unique request id', transcript.requestId,
        );
      }
      requests.set(transcript.requestId, transcript);
    }
    if (transcript.requestLink !== null) {
      const request = requests.get(transcript.requestLink.requestId);
      assertEqual(
        'transcript', index, 'requestLink.requestSequence',
        request?.sequence, transcript.requestLink.requestSequence,
      );
      assertEqual(
        'transcript', index, 'requestLink.requestId',
        request?.requestId, transcript.requestLink.requestId,
      );
      assertEqual(
        'transcript', index, 'controller.controllerId',
        request?.controller.controllerId, transcript.controller.controllerId,
      );
    }
    const { contentHash: _contentHash, ...withoutHash } = transcript;
    assertEqual(
      'transcript', index, 'contentHash',
      sha256(canonicalJson(transcriptContent(withoutHash))), transcript.contentHash,
    );
  }
}

function adjudicationGaps(bundle: ReplayBundle): readonly GapReport[] {
  return adjudicationGapsFromRevisions(bundle.revisions.map((entry) => entry.revision));
}

function validateGapReports(bundle: ReplayBundle): void {
  const decoded = bundle.gapReports.map((report, index) => {
    const result = gapReportSchema.safeParse(report);
    if (!result.success) {
      throw new ReplayDivergenceError(
        'gap_report', index, 'gapReports', 'valid GapReport', report,
      );
    }
    return result.data;
  });
  const present = new Set(decoded.map((report) => JSON.stringify(report)));
  for (const required of deduplicateGapReports(adjudicationGaps(bundle))) {
    if (!present.has(JSON.stringify(required))) {
      throw new ReplayDivergenceError(
        'gap_report', -1, 'gapReports', required, 'missing',
      );
    }
  }
}

function activeRevisionNumbers(records: readonly ReplayRevisionRecord[]): ReadonlySet<number> {
  const byRevision = new Map(
    records.map((recordEntry) => [recordEntry.revision.revision, recordEntry.revision] as const),
  );
  const active = new Set<number>();
  let cursor = records.at(-1)?.revision.revision ?? null;
  while (cursor !== null) {
    if (active.has(cursor)) {
      throw new ReplayDivergenceError('bundle', records.length - 1, 'revision.parentRevision', 'acyclic ancestry', cursor);
    }
    active.add(cursor);
    const revision = byRevision.get(cursor);
    if (revision === undefined) {
      throw new ReplayDivergenceError('bundle', records.length - 1, 'revision.parentRevision', 'existing revision', cursor);
    }
    cursor = revision.parentRevision;
  }
  return active;
}

function authoritativeReplayValue(bundle: ReplayBundle): unknown {
  return {
    encounterConfig: bundle.encounterConfig,
    fixture: bundle.fixture,
    build: bundle.build,
    protocolVersions: bundle.protocolVersions,
    licensingVersions: bundle.licensingVersions,
    gapReports: bundle.gapReports,
    revisions: bundle.revisions.map((recordEntry) => ({
      revision: recordEntry.revision,
      void: recordEntry.void,
      rng: recordEntry.rng,
      stateHash: recordEntry.stateHash,
      projectionHashes: recordEntry.projectionHashes,
    })),
    transcripts: bundle.transcripts.map((transcript) => ({
      sequence: transcript.sequence,
      previousSequence: transcript.previousSequence,
      contentHash: transcript.contentHash,
    })),
  };
}

export function authoritativeReplayHash(bundle: ReplayBundle): string {
  return sha256(canonicalJson(authoritativeReplayValue(bundle)));
}

export function replayBundle(
  bundleValue: ReplayBundle,
  fixtureValue?: unknown,
): ReplayProof {
  const bundle = bundleValue;
  if (
    bundle.format !== 'vtt-deterministic-replay' ||
    bundle.schemaVersion !== VTT_REPLAY_SCHEMA_VERSION ||
    bundle.fleetSchemaVersion !== VTT_FLEET_SCHEMA_VERSION
  ) {
    throw new ReplayDivergenceError('bundle', -1, 'schemaVersion', VTT_REPLAY_SCHEMA_VERSION, bundle.schemaVersion);
  }
  if (!isEncounterConfig(bundle.encounterConfig)) {
    throw new ReplayDivergenceError(
      'bundle', -1, 'encounterConfig', 'valid encounter configuration', bundle.encounterConfig,
    );
  }
  const fixture = fixtureValue === undefined ? null : decodeApprovedEncounterFixture(fixtureValue);
  if (fixture !== null) {
    assertEqual('fixture', -1, 'fixture.fixtureId', fixture.fixtureId, bundle.fixture.fixtureId);
    assertEqual('fixture', -1, 'fixture.sha256', fixture.approval.packageSha256, bundle.fixture.sha256);
  }
  validateTranscripts(bundle.transcripts);
  validateGapReports(bundle);
  if (bundle.revisions.length === 0) {
    throw new ReplayDivergenceError('bundle', -1, 'revisions.length', 'at least 1', 0);
  }
  const active = activeRevisionNumbers(bundle.revisions);
  const rebuilt = new Map<number, { readonly state: EncounterState; readonly rng: SerializableRngState }>();
  let reducerRevisionCount = 0;
  let eventCount = 0;
  let rounds = 0;
  for (const [index, replayRecord] of bundle.revisions.entries()) {
    const revision = replayRecord.revision;
    assertEqual(
      'bundle', index, 'encounterConfig', bundle.encounterConfig, revision.encounterState.config,
    );
    assertEqual('bundle', index, 'revision.revision', index + 1, revision.revision);
    assertEqual('bundle', index, 'void', !active.has(revision.revision), replayRecord.void);
    const prior = bundle.revisions[index - 1]?.revision;
    assertEqual('rng', index, 'rng.pre', prior?.rngState ?? revision.rngState, replayRecord.rng.pre);
    const parent = revision.parentRevision === null ? null : rebuilt.get(revision.parentRevision);
    let expectedState: EncounterState;
    let expectedRng: SerializableRngState;
    switch (revision.transition.kind) {
      case 'session_started':
        if (index !== 0 || revision.parentRevision !== null) {
          throw new ReplayDivergenceError('bundle', index, 'transition.kind', 'first session_started', revision.transition.kind);
        }
        expectedState = fixture === null
          ? revision.encounterState
          : encounterStateFromApprovedFixture(fixture, bundle.encounterConfig);
        expectedRng = revision.rngState;
        break;
      case 'agent_session_started':
      case 'agent_session_dispatched':
      case 'agent_call_usage_recorded':
      case 'agent_session_recovered':
      case 'agent_session_recovery_failed':
      case 'agent_session_rolled_over':
        if (parent === null || parent === undefined) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing agent-session parent', revision.parentRevision);
        }
        expectedState = parent.state;
        expectedRng = parent.rng;
        break;
      case 'head_moved': {
        if (parent === null || parent === undefined || revision.parentRevision === null) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing head target', revision.parentRevision);
        }
        expectedState = parent.state;
        expectedRng = deriveBranchRng(
          bundle.revisions[revision.parentRevision - 1]!.revision,
          revision.branchId,
        ).snapshot();
        break;
      }
      case 'party_state_captured':
        if (parent === null || parent === undefined) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing party-state parent', revision.parentRevision);
        }
        expectedState = parent.state;
        expectedRng = parent.rng;
        break;
      case 'reaction_preference_changed': {
        if (parent === null || parent === undefined || revision.partyState === null) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'party-state reaction preference parent', revision.parentRevision);
        }
        const partyIds = new Set(revision.partyState.characters.map((entry) => entry.combatantId));
        expectedState = {
          ...parent.state,
          reactionPolicies: [
            ...parent.state.reactionPolicies.filter((entry) => !partyIds.has(entry.combatant)),
            ...revision.partyState.reactionPolicies,
          ],
        };
        expectedRng = parent.rng;
        break;
      }
      case 'short_rest_completed':
        if (parent === null || parent === undefined) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing Short Rest parent', revision.parentRevision);
        }
        expectedState = parent.state;
        expectedRng = revision.rngState;
        break;
      case 'long_rest_completed':
        if (parent === null || parent === undefined) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing Long Rest parent', revision.parentRevision);
        }
        expectedState = parent.state;
        expectedRng = parent.rng;
        break;
      case 'session_ended':
        if (parent === null || parent === undefined) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing session parent', revision.parentRevision);
        }
        expectedState = parent.state;
        expectedRng = parent.rng;
        break;
      case 'room_composed':
        if (parent === null || parent === undefined) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing room parent', revision.parentRevision);
        }
        expectedState = revision.encounterState;
        expectedRng = parent.rng;
        break;
      case 'reducer_applied': {
        if (parent === null || parent === undefined) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing reducer parent', revision.parentRevision);
        }
        assertEqual('rng', index, 'rng.pre', parent.rng, replayRecord.rng.pre);
        const rng = restoreMulberry32(replayRecord.rng.pre);
        const reduction = reduceEncounter(parent.state, revision.transition.command, rng);
        expectedState = reduction.state;
        expectedRng = rng.snapshot();
        assertEqual('event', index, 'transition.events', reduction.events, revision.transition.events);
        reducerRevisionCount += 1;
        eventCount += reduction.events.length;
        break;
      }
      case 'turn_skipped':
      case 'turn_delayed': {
        if (parent === null || parent === undefined) {
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing pacing parent', revision.parentRevision);
        }
        assertEqual('rng', index, 'rng.pre', parent.rng, replayRecord.rng.pre);
        const rng = restoreMulberry32(replayRecord.rng.pre);
        const reduction = replayPacingTransition(parent.state, revision.transition, rng);
        expectedState = reduction.encounterState;
        expectedRng = rng.snapshot();
        assertEqual('event', index, 'transition.events', reduction.events, revision.transition.events);
        reducerRevisionCount += 1;
        eventCount += reduction.events.length;
        break;
      }
      case 'controller_request_issued':
      case 'controller_response_received':
      case 'controller_request_cancelled':
      case 'controller_replaced':
      case 'reaction_policy_resolved':
      case 'refusal_handling_changed':
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
          throw new ReplayDivergenceError('bundle', index, 'parentRevision', 'existing coordinator parent', revision.parentRevision);
        }
        expectedState = parent.state;
        expectedRng = parent.rng;
        break;
    }
    assertEqual('state', index, 'encounterState', expectedState, revision.encounterState);
    assertEqual('rng', index, 'rng.post', expectedRng, replayRecord.rng.post);
    assertEqual('rng', index, 'revision.rngState', expectedRng, revision.rngState);
    const expectedProjections = projectReplayViews(expectedState);
    assertEqual(
      'state', index, 'stateHash',
      sha256(canonicalJson(expectedState)), replayRecord.stateHash,
    );
    assertEqual(
      'projection', index, 'projectionHashes',
      hashProjections(expectedProjections), replayRecord.projectionHashes,
    );
    rebuilt.set(revision.revision, { state: expectedState, rng: expectedRng });
    rounds = Math.max(rounds, expectedState.round);
  }
  const finalRecord = bundle.revisions.at(-1)!;
  return {
    fixtureId: bundle.fixture.fixtureId,
    revisionCount: bundle.revisions.length,
    reducerRevisionCount,
    eventCount,
    transcriptCount: bundle.transcripts.length,
    rounds,
    finalStateHash: finalRecord.stateHash,
    finalProjectionHashes: finalRecord.projectionHashes,
    authoritativeHash: authoritativeReplayHash(bundle),
  };
}
