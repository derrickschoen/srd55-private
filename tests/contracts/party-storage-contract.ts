import { describe, expect, it } from 'vitest';
import type {
  PartyStorage,
  RepositoryPath,
  RepositoryRevision,
  StorageResult,
  StoredObject,
  StoredObjectSummary,
  WriteReceipt,
} from '../../src/party/storage/contracts';
import type { PartyStorageContractScenario } from '../fixtures/party-storage/types';

export type PartyStorageContractFactory = (
  scenario: PartyStorageContractScenario,
) => PartyStorage;

const expectedPath = 'characters/ash--pub-0001.json' as RepositoryPath;
const expectedRevision = 'revision-001' as RepositoryRevision;

function expectedResult(
  scenario: PartyStorageContractScenario,
): StorageResult<
  StoredObject | readonly StoredObjectSummary[] | WriteReceipt
> {
  switch (scenario) {
    case 'success':
      return {
        kind: 'success',
        value: {
          path: expectedPath,
          bytes: new Uint8Array([123, 125, 10]),
          revision: expectedRevision,
        },
        rateObservation: { remaining: 41, limit: 60 },
      };
    case 'not-found':
      return { kind: 'not-found', at: 'unknown' };
    case 'conflict':
      return {
        kind: 'conflict',
        expected: expectedRevision,
        actual: null,
      };
    case 'unauthorized':
      return {
        kind: 'unauthorized',
        credentialState: 'invalid-expired-or-revoked',
      };
    case 'rate-limited':
      return {
        kind: 'rate-limited',
        retryAt: null,
      };
    case 'network-failed':
      return { kind: 'network-failed', writeState: 'not-applicable' };
    case 'too-large':
      return { kind: 'too-large', observedBytes: null, limitBytes: null };
  }
}

async function exerciseScenario(
  storage: PartyStorage,
  scenario: PartyStorageContractScenario,
): Promise<StorageResult<unknown>> {
  switch (scenario) {
    case 'success':
    case 'not-found':
    case 'unauthorized':
    case 'network-failed':
      return storage.read(readableContractPath);
    case 'rate-limited':
      return storage.list('library/' as RepositoryPath);
    case 'conflict':
      return storage.write(
        readableContractPath,
        new Uint8Array([123, 125, 10]),
        { kind: 'replace', expected: expectedRevision },
      );
    case 'too-large':
      return storage.write(
        readableContractPath,
        new Uint8Array([123, 125, 10]),
        { kind: 'create-only' },
      );
  }
}

const readableContractPath = expectedPath;

/** Shared unchanged by P1-GH, P1-GL, and P1-CB. */
export function runPartyStorageContract(
  label: string,
  makeStorage: PartyStorageContractFactory,
): void {
  describe(`party storage contract: ${label}`, () => {
    for (const scenario of [
      'success',
      'not-found',
      'conflict',
      'unauthorized',
      'rate-limited',
      'network-failed',
      'too-large',
    ] as const satisfies readonly PartyStorageContractScenario[]) {
      it(`maps the ${scenario} fixture to the exact ${scenario} result arm`, async () => {
        const actual = await exerciseScenario(makeStorage(scenario), scenario);
        expect(actual).toEqual(expectedResult(scenario));
      });
    }
  });
}
