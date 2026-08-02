import type {
  PartyStorage,
  RateLimitObservation,
  RepositoryPath,
  RepositoryRevision,
  StorageResult,
  StoredObject,
  StoredObjectSummary,
  WriteCondition,
  WriteReceipt,
} from '../../../src/party/storage/contracts';
import type { PartyStorageContractFixture } from './types';

function unscripted(operation: string): never {
  throw new Error(`Fixture-backed party storage has no ${operation} fixture`);
}

function recordedCount(value: string | null): number | null {
  if (value === null || !/^(?:0|[1-9]\d*)$/u.test(value)) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : null;
}

function rateObservation(response: Response): RateLimitObservation | undefined {
  const remaining = recordedCount(response.headers.get('x-ratelimit-remaining'));
  const limit = recordedCount(response.headers.get('x-ratelimit-limit'));
  if (remaining === null || limit === null) return undefined;
  return { remaining, limit };
}

function observeSuccess<T>(
  result: StorageResult<T>,
  response: Response | null,
): StorageResult<T> {
  if (result.kind !== 'success') return result;
  const observation = response === null ? undefined : rateObservation(response);
  return observation === undefined
    ? { kind: 'success', value: result.value }
    : { kind: 'success', value: result.value, rateObservation: observation };
}

export class FixtureBackedPartyStorage implements PartyStorage {
  public constructor(
    private readonly fixture: PartyStorageContractFixture,
    private readonly fixtureFetch: typeof fetch,
  ) {}

  private async replayFixture(): Promise<Response | null> {
    const request = this.fixture.request;
    try {
      const response = await this.fixtureFetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      if (this.fixture.response.kind === 'network-error') {
        throw new Error('Network-error fixture unexpectedly returned a response');
      }
      return response;
    } catch (error) {
      if (
        this.fixture.response.kind === 'network-error' &&
        error instanceof Error &&
        error.message === this.fixture.response.message
      ) {
        return null;
      }
      throw error;
    }
  }

  public async list(
    _prefix: RepositoryPath,
  ): Promise<StorageResult<readonly StoredObjectSummary[]>> {
    if (this.fixture.operation !== 'list') return unscripted('list');
    const response = await this.replayFixture();
    return observeSuccess(this.fixture.result, response);
  }

  public async read(
    _path: RepositoryPath,
  ): Promise<StorageResult<StoredObject>> {
    if (this.fixture.operation !== 'read') return unscripted('read');
    const response = await this.replayFixture();
    return observeSuccess(this.fixture.result, response);
  }

  public async write(
    _path: RepositoryPath,
    _bytes: Uint8Array,
    _condition: WriteCondition,
  ): Promise<StorageResult<WriteReceipt>> {
    if (this.fixture.operation !== 'write') return unscripted('write');
    const response = await this.replayFixture();
    return observeSuccess(this.fixture.result, response);
  }

  public async delete(
    _path: RepositoryPath,
    _expected: RepositoryRevision,
  ): Promise<StorageResult<{ readonly deleted: true }>> {
    return unscripted('delete');
  }
}
