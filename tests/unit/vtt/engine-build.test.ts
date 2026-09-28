import { describe, expect, it } from 'vitest';
import {
  decodeEngineBuild,
  decodeRecordedEngine,
  engineBuildOfCompiledCommit,
  engineCommit,
  EngineCommitError,
  recordedEngineOf,
  type EngineBuild,
} from '../../../src/vtt/engine-build';
import { engineCommitDefine } from '../../../vite.config';

// FOOTPRINT fix1 (owner D919, D929): every session revision names the engine build that recorded it, and an archive
// names the one commit its history was recorded under, or why there is none. Expectations are hand-derived.

const A = 'a'.repeat(40);
const B = `${'b'.repeat(39)}0`;
const commitA: EngineBuild = { kind: 'engine_commit', commit: engineCommit(A) };
const commitB: EngineBuild = { kind: 'engine_commit', commit: engineCommit(B) };
const devBuild: EngineBuild = { kind: 'unrecorded', reason: 'build_without_commit' };
const v12: EngineBuild = { kind: 'unrecorded', reason: 'recorded_before_engine_recording' };

describe('FOOTPRINT fix1: engine builds and recorded commits', () => {
  it('an engine commit is a full 40-character lowercase hexadecimal name, nothing shorter or other', () => {
    expect(engineCommit(A)).toBe(A);
    for (const bad of ['a'.repeat(39), 'a'.repeat(41), 'A'.repeat(40), `${'a'.repeat(39)}g`, 7, null]) {
      expect(() => engineCommit(bad)).toThrow(EngineCommitError);
    }
  });

  it('a compiled commit names its build; none compiled in is a build without a commit', () => {
    expect(engineBuildOfCompiledCommit(A)).toEqual(commitA);
    expect(engineBuildOfCompiledCommit(undefined)).toEqual(devBuild);
    expect(() => engineBuildOfCompiledCommit('HEAD')).toThrow(EngineCommitError);
  });

  it('an archived history names its one commit, or why it has none', () => {
    expect(recordedEngineOf([commitA, commitA, commitA])).toEqual({ kind: 'engine_commit', commit: A });
    expect(recordedEngineOf([commitA, commitB])).toEqual({ kind: 'recorded_commit_unknown', reason: 'recorded_by_several_commits' });
    expect(recordedEngineOf([commitA, devBuild])).toEqual({ kind: 'recorded_commit_unknown', reason: 'build_without_commit' });
    // A revision from before engine recording outranks a build without a commit.
    expect(recordedEngineOf([v12, devBuild, commitA])).toEqual({ kind: 'recorded_commit_unknown', reason: 'recorded_before_engine_recording' });
    expect(() => recordedEngineOf([])).toThrow(TypeError);
  });

  it('the decoders take exactly the typed shapes', () => {
    for (const build of [commitA, devBuild, v12]) expect(decodeEngineBuild(JSON.parse(JSON.stringify(build)), 'x')).toEqual(build);
    for (const bad of [{ kind: 'engine_commit', commit: A, extra: 1 }, { kind: 'engine_commit', commit: 'abc' }, { kind: 'unrecorded', reason: 'forgot' }, { kind: 'unrecorded' }, null]) {
      expect(() => decodeEngineBuild(bad, 'Revision 1 recordedBy')).toThrow(/Revision 1 recordedBy is not an engine build|Not a full git commit name/u);
    }
    expect(decodeRecordedEngine({ kind: 'recorded_commit_unknown', reason: 'recorded_by_several_commits' }, 'x'))
      .toEqual({ kind: 'recorded_commit_unknown', reason: 'recorded_by_several_commits' });
    expect(() => decodeRecordedEngine({ kind: 'recorded_commit_unknown', reason: 'forgot' }, 'Archive recordedEngine'))
      .toThrow('Archive recordedEngine is not a recorded engine.');
  });

  it('a production build compiles in HEAD only from a tree with nothing changed against it', () => {
    const git = (status: string, headName: string) => (args: readonly string[]): string =>
      args[0] === 'status' ? status : args.join(' ') === 'rev-parse HEAD' ? `${headName}\n` : '';
    expect(engineCommitDefine(git('', A))).toBe(`"${A}"`);
    expect(engineCommitDefine(git(' M src/vtt/engine-build.ts\n', A))).toBe('undefined');
    expect(engineCommitDefine(git('?? scratch.ts\n', A))).toBe('undefined');
    expect(() => engineCommitDefine(git('', 'not-a-commit'))).toThrow('The build commit is invalid.');
  });
});
