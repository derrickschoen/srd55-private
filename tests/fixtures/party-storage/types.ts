import type {
  StorageResult,
  StoredObject,
  StoredObjectSummary,
  WriteReceipt,
} from '../../../src/party/storage/contracts';

export type RecordedHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RecordedForgeRequest {
  readonly method: RecordedHttpMethod;
  readonly url: string;
  readonly body: string | null;
  /** Only headers whose values are material to the fixture belong here. */
  readonly headers: Readonly<Record<string, string>>;
  /** Headers whose absence is material, notably authorization on public reads. */
  readonly absentHeaders: readonly string[];
}

export type RecordedForgeResponse =
  | {
      readonly kind: 'response';
      readonly status: number;
      readonly headers: Readonly<Record<string, string>>;
      readonly body: string;
    }
  | { readonly kind: 'network-error'; readonly message: string };

export interface RecordedForgeFixture {
  readonly name: string;
  readonly request: RecordedForgeRequest;
  readonly response: RecordedForgeResponse;
}

export type PartyStorageContractScenario =
  | 'success'
  | 'not-found'
  | 'conflict'
  | 'unauthorized'
  | 'rate-limited'
  | 'network-failed'
  | 'too-large';

export type PartyStorageContractFixture = RecordedForgeFixture &
  (
    | {
        readonly scenario:
          | 'success'
          | 'not-found'
          | 'unauthorized'
          | 'network-failed';
        readonly operation: 'read';
        readonly result: StorageResult<StoredObject>;
      }
    | {
        readonly scenario: 'rate-limited';
        readonly operation: 'list';
        readonly result: StorageResult<readonly StoredObjectSummary[]>;
      }
    | {
        readonly scenario: 'conflict' | 'too-large';
        readonly operation: 'write';
        readonly result: StorageResult<WriteReceipt>;
      }
  );

export interface ActualForgeRequest {
  readonly method: string;
  readonly url: string;
  readonly body: string | null;
  readonly headers: Readonly<Record<string, string>>;
}

export type FixtureMatch =
  | { readonly kind: 'matched'; readonly fixture: RecordedForgeFixture }
  | { readonly kind: 'unmatched' }
  | {
      readonly kind: 'ambiguous';
      readonly fixtureNames: readonly string[];
    };
