import type { Brand } from '../domain/ids';

/**
 * FOOTPRINT fix1 (owner D919, D929): "verifiable with the rules it was recorded under, on demand". Rules change
 * without a session schema bump, so the only faithful record of the rules a turn was recorded under is the engine
 * build that recorded it. Every session revision names that build; an archive of a history names the one commit
 * its revisions were recorded by, and tools/session-archive-replay.ts replays the archive at that commit.
 */

/** A commit of this repository: its full 40-character hexadecimal object name. */
export type EngineCommit = Brand<string, 'EngineCommit'>;

export class EngineCommitError extends TypeError {
  override readonly name = 'EngineCommitError' as const;

  constructor(readonly value: unknown) {
    super(`Not a full git commit name: ${JSON.stringify(value) ?? String(value)}.`);
  }
}

/** The one mint of an EngineCommit: 40 lowercase hexadecimal characters, else EngineCommitError. */
export function engineCommit(value: unknown): EngineCommit {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/u.test(value)) throw new EngineCommitError(value);
  return value as EngineCommit;
}

/** Why a revision names no engine commit. */
export type UnrecordedEngineReason =
  /** Recorded by code that is not one commit: a development server, a test run, a tool, a build of a dirty tree. */
  | 'build_without_commit'
  /** Recorded by session schema 12 or older, before revisions named their engine build. */
  | 'recorded_before_engine_recording';

/** The engine build that recorded a session revision. */
export type EngineBuild =
  | { readonly kind: 'engine_commit'; readonly commit: EngineCommit }
  | { readonly kind: 'unrecorded'; readonly reason: UnrecordedEngineReason };

/**
 * How the build that recorded a revision relates to the build running now (SAVE-COMPAT, owner D939/D946). Only two
 * named commits can be compared: the same commit, or two different ones. When either side names no commit, whether
 * the code differs cannot be told (two uncommitted builds relate as 'unrecorded' too, D945 SQ5).
 */
export type EngineBuildRelation =
  | { readonly kind: 'same_commit'; readonly commit: EngineCommit }
  | { readonly kind: 'other_commit'; readonly recorded: EngineCommit; readonly running: EngineCommit }
  /** Either side names no commit: whether the code differs cannot be told. */
  | { readonly kind: 'unrecorded'; readonly recorded: EngineBuild; readonly running: EngineBuild };

export function engineBuildRelation(recorded: EngineBuild, running: EngineBuild): EngineBuildRelation {
  if (recorded.kind === 'engine_commit' && running.kind === 'engine_commit') {
    return recorded.commit === running.commit
      ? { kind: 'same_commit', commit: recorded.commit }
      : { kind: 'other_commit', recorded: recorded.commit, running: running.commit };
  }
  return { kind: 'unrecorded', recorded, running };
}

/** An engine build as a refusal names it to the player. */
export function describeEngineBuild(build: EngineBuild): string {
  switch (build.kind) {
    case 'engine_commit':
      return `engine build ${build.commit}`;
    case 'unrecorded':
      switch (build.reason) {
        case 'build_without_commit':
          return 'an unrecorded engine build (a development, test or uncommitted build, which records no commit)';
        case 'recorded_before_engine_recording':
          return 'an unrecorded engine build (saved before saves recorded their engine build, session schema 12 or older)';
      }
  }
}

/** A revision migrated from schema 12 or older: it was recorded before revisions named their engine build. */
export const RECORDED_BEFORE_ENGINE_RECORDING: EngineBuild = Object.freeze({
  kind: 'unrecorded',
  reason: 'recorded_before_engine_recording',
});

/**
 * The build a compiled commit names: a production build of a clean tree compiles its commit in (vite.config.ts,
 * `__VTT_ENGINE_COMMIT__`); anything else runs without one.
 */
export function engineBuildOfCompiledCommit(compiled: string | undefined): EngineBuild {
  return compiled === undefined
    ? { kind: 'unrecorded', reason: 'build_without_commit' }
    : { kind: 'engine_commit', commit: engineCommit(compiled) };
}

declare const __VTT_ENGINE_COMMIT__: string | undefined;

/** The engine build running now. Stores record new revisions with it unless they are given another. */
export const RUNNING_ENGINE_BUILD: EngineBuild = engineBuildOfCompiledCommit(
  typeof __VTT_ENGINE_COMMIT__ === 'string' ? __VTT_ENGINE_COMMIT__ : undefined,
);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function keysAre(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const own = Object.keys(value).sort();
  return own.length === keys.length && [...keys].sort().every((key, index) => own[index] === key);
}

/** A loaded engine build, checked to be exactly one EngineBuild; TypeError names `label` otherwise. */
export function decodeEngineBuild(value: unknown, label: string): EngineBuild {
  if (isRecord(value) && value.kind === 'engine_commit' && keysAre(value, ['kind', 'commit'])) {
    return { kind: 'engine_commit', commit: engineCommit(value.commit) };
  }
  if (isRecord(value) && value.kind === 'unrecorded' && keysAre(value, ['kind', 'reason']) &&
    (value.reason === 'build_without_commit' || value.reason === 'recorded_before_engine_recording')) {
    return { kind: 'unrecorded', reason: value.reason };
  }
  throw new TypeError(`${label} is not an engine build.`);
}

/** Why an archived history has no one recorded commit to replay it at. */
export type UnknownRecordedCommitReason =
  | UnrecordedEngineReason
  /** Its revisions were recorded by more than one commit (the app was updated during the session). */
  | 'recorded_by_several_commits';

/** The commit an archived history was recorded under, or why there is no one such commit. */
export type RecordedEngine =
  | { readonly kind: 'engine_commit'; readonly commit: EngineCommit }
  | { readonly kind: 'recorded_commit_unknown'; readonly reason: UnknownRecordedCommitReason };

/**
 * The commit a history was recorded under, from the engine build each of its revisions names: the one commit when
 * they all name the same one; otherwise unknown, and why (a revision from before engine recording outranks a
 * build without a commit, which outranks several commits).
 */
export function recordedEngineOf(builds: readonly EngineBuild[]): RecordedEngine {
  if (builds.length === 0) throw new TypeError('A recorded history has at least one revision.');
  const reasons = new Set(builds.flatMap((build) => build.kind === 'unrecorded' ? [build.reason] : []));
  if (reasons.has('recorded_before_engine_recording')) return { kind: 'recorded_commit_unknown', reason: 'recorded_before_engine_recording' };
  if (reasons.has('build_without_commit')) return { kind: 'recorded_commit_unknown', reason: 'build_without_commit' };
  // Every build names a commit now.
  const commits = [...new Set(builds.flatMap((build) => build.kind === 'engine_commit' ? [build.commit] : []))];
  const [commit, ...others] = commits;
  if (commit !== undefined && others.length === 0) return { kind: 'engine_commit', commit };
  return { kind: 'recorded_commit_unknown', reason: 'recorded_by_several_commits' };
}

/** A loaded RecordedEngine, checked; TypeError names `label` otherwise. */
export function decodeRecordedEngine(value: unknown, label: string): RecordedEngine {
  if (isRecord(value) && value.kind === 'engine_commit' && keysAre(value, ['kind', 'commit'])) {
    return { kind: 'engine_commit', commit: engineCommit(value.commit) };
  }
  if (isRecord(value) && value.kind === 'recorded_commit_unknown' && keysAre(value, ['kind', 'reason']) && (
    value.reason === 'build_without_commit' || value.reason === 'recorded_before_engine_recording' ||
    value.reason === 'recorded_by_several_commits'
  )) {
    return { kind: 'recorded_commit_unknown', reason: value.reason };
  }
  throw new TypeError(`${label} is not a recorded engine.`);
}
