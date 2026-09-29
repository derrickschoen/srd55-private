import { describe, expect, it } from 'vitest';
import { importSavedSession, MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';
import {
  BUILD_A,
  BUILD_B,
  bundle,
  bundleNotRehashed,
  e1,
  OVERHANG_V12,
  recordS2,
  thrown,
} from '../../helpers/save-compat-fixtures';
import { declareTestInputs } from '../../helpers/test-inputs';
import { loadSaveTrustingRecordedHistory } from '../../helpers/trust-recorded-history';

const inputs = declareTestInputs({ fixtures: [OVERHANG_V12] });
const overhang = (): string => inputs.fixtures.readText(OVERHANG_V12);

describe('SAVE-COMPAT C5: trust-recorded-history', () => {
  it('W23: another build\'s differing derivation loads with a marker naming both builds and purpose', () => {
    const plain = e1(recordS2(BUILD_A, overhang()).plain);
    const save = bundle(plain);
    expect(thrown(() => importSavedSession(new MemoryBrowserSessionStore(BUILD_B), save))?.name)
      .toBe('SessionRecordedByOtherBuildError');
    const { session, loaded } = loadSaveTrustingRecordedHistory(save, BUILD_B, 'W23');
    expect(session.encounterState).toEqual(plain[1]!.encounterState);
    expect(loaded).toEqual({ kind: 'loaded_relaxed', recordedBy: [BUILD_A], runningBuild: BUILD_B, purpose: 'W23' });
  });

  it('W26: a relaxed export is still refused by strict import under the running build', () => {
    const { session } = loadSaveTrustingRecordedHistory(bundle(e1(recordS2(BUILD_A, overhang()).plain)), BUILD_B, 'W26');
    let exported = '';
    expect(() => { exported = session.journal.export(); }).not.toThrow();
    const error = thrown(() => importSavedSession(new MemoryBrowserSessionStore(BUILD_B), exported));
    expect(error?.name).toBe('SessionRecordedByOtherBuildError');
  });

  it('W24: a hash mismatch is refused even when derivation is trusted', () => {
    const save = bundleNotRehashed(e1(recordS2(BUILD_A, overhang()).plain));
    const error = thrown(() => loadSaveTrustingRecordedHistory(save, BUILD_B, 'W24'));
    expect(error?.name).toBe('SessionIntegrityError');
    expect(error.fault).toMatchObject({ kind: 'hash_mismatch' });
  });
});
