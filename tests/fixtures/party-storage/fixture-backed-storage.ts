import type {
  PartyStorage,
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

export class FixtureBackedPartyStorage implements PartyStorage {
  public constructor(
    private readonly fixture: PartyStorageContractFixture,
    private readonly fixtureFetch: typeof fetch,
  ) {}

  private async replayFixture(): Promise<void> {
    const request = this.fixture.request;
    try {
      await this.fixtureFetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      if (this.fixture.response.kind === 'network-error') {
        throw new Error('Network-error fixture unexpectedly returned a response');
      }
    } catch (error) {
      if (
        this.fixture.response.kind === 'network-error' &&
        error instanceof Error &&
        error.message === this.fixture.response.message
      ) {
        return;
      }
      throw error;
    }
  }

  public async list(
    _prefix: RepositoryPath,
  ): Promise<StorageResult<readonly StoredObjectSummary[]>> {
    if (this.fixture.operation !== 'list') return unscripted('list');
    await this.replayFixture();
    return this.fixture.result;
  }

  public async read(
    _path: RepositoryPath,
  ): Promise<StorageResult<StoredObject>> {
    if (this.fixture.operation !== 'read') return unscripted('read');
    await this.replayFixture();
    return this.fixture.result;
  }

  public async write(
    _path: RepositoryPath,
    _bytes: Uint8Array,
    _condition: WriteCondition,
  ): Promise<StorageResult<WriteReceipt>> {
    if (this.fixture.operation !== 'write') return unscripted('write');
    await this.replayFixture();
    return this.fixture.result;
  }

  public async delete(
    _path: RepositoryPath,
    _expected: RepositoryRevision,
  ): Promise<StorageResult<{ readonly deleted: true }>> {
    return unscripted('delete');
  }
}
