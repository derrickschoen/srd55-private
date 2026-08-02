import type {
  CredentialLease,
  CredentialState,
  Forge,
  PartyStorage,
  RateLimitObservation,
  RepositoryConfig,
  RepositoryRevision,
  StorageResult,
  WriteCondition,
} from '../../src/party/storage/contracts';
import type { PartyStorageFactories } from '../../src/party/storage/create-storage';

type Assert<T extends true> = T;
type Exact<A, B> =
  (<G>() => G extends A ? 1 : 2) extends (<G>() => G extends B ? 1 : 2)
    ? (<G>() => G extends B ? 1 : 2) extends (<G>() => G extends A ? 1 : 2)
      ? true
      : false
    : false;

type ReplaceCondition = Extract<WriteCondition, { readonly kind: 'replace' }>;
type AnonymousLease = Extract<CredentialLease, { readonly kind: 'anonymous' }>;
type AuthenticatedLease = Extract<
  CredentialLease,
  { readonly kind: 'authenticated' }
>;
type SuccessResult<T> = Extract<StorageResult<T>, { readonly kind: 'success' }>;
type RateLimitedResult = Extract<
  StorageResult<unknown>,
  { readonly kind: 'rate-limited' }
>;

type _ForgeSetIsClosed = Assert<
  Exact<Forge, 'github' | 'gitlab' | 'codeberg'>
>;
type _CredentialStatesAreExact = Assert<
  Exact<
    CredentialState,
    | 'missing'
    | 'expired'
    | 'revoked'
    | 'invalid-expired-or-revoked'
    | 'insufficient-scope'
  >
>;
type _StorageResultHasExactlySevenKinds = Assert<
  Exact<
    StorageResult<unknown>['kind'],
    | 'success'
    | 'not-found'
    | 'conflict'
    | 'unauthorized'
    | 'rate-limited'
    | 'network-failed'
    | 'too-large'
  >
>;
type ExpectedStorageResult<T> =
  | {
      readonly kind: 'success';
      readonly value: T;
      readonly rateObservation?: RateLimitObservation;
    }
  | {
      readonly kind: 'not-found';
      readonly at: 'repository' | 'object' | 'unknown';
    }
  | {
      readonly kind: 'conflict';
      readonly expected: RepositoryRevision | null;
      readonly actual: RepositoryRevision | null;
    }
  | { readonly kind: 'unauthorized'; readonly credentialState: CredentialState }
  | { readonly kind: 'rate-limited'; readonly retryAt: string | null }
  | {
      readonly kind: 'network-failed';
      readonly writeState: 'not-sent' | 'unknown' | 'not-applicable';
    }
  | {
      readonly kind: 'too-large';
      readonly observedBytes: number | null;
      readonly limitBytes: number | null;
    };
type _StorageResultPayloadsAreExact = Assert<
  Exact<StorageResult<unknown>, ExpectedStorageResult<unknown>>
>;
type _RateLimitObservationIsExactlyTwoNumbers = Assert<
  Exact<
    RateLimitObservation,
    { readonly remaining: number; readonly limit: number }
  >
>;
type _SuccessResultAddsOnlyOptionalRateObservation = Assert<
  Exact<keyof SuccessResult<unknown>, 'kind' | 'value' | 'rateObservation'>
>;
type _RateObservationIsOptionalAndNeverNullable = Assert<
  Exact<
    SuccessResult<unknown>['rateObservation'],
    RateLimitObservation | undefined
  >
>;
type _RateLimitedFailureArmIsUnchanged = Assert<
  Exact<
    RateLimitedResult,
    { readonly kind: 'rate-limited'; readonly retryAt: string | null }
  >
>;
type _WriteConditionHasOnlyGuardedKinds = Assert<
  Exact<WriteCondition['kind'], 'create-only' | 'replace'>
>;
type _ReplaceExpectedIsRequired = Assert<
  Exact<ReplaceCondition['expected'], RepositoryRevision>
>;
type _ReplaceExpectedRejectsUndefined = Assert<
  undefined extends ReplaceCondition['expected'] ? false : true
>;
type _AnonymousLeaseExposesNoTokenOrJson = Assert<
  Extract<keyof AnonymousLease, 'token' | 'toJSON' | 'clone'> extends never
    ? true
    : false
>;
type _AuthenticatedLeaseExposesNoTokenOrJson = Assert<
  Extract<keyof AuthenticatedLease, 'token' | 'toJSON' | 'clone'> extends never
    ? true
    : false
>;
type _CredentialLeaseHasBothExactArms = Assert<
  Exact<CredentialLease['kind'], 'anonymous' | 'authenticated'>
>;
type _FactoriesCoverExactlyEveryForge = Assert<
  Exact<keyof PartyStorageFactories, Forge>
>;

declare const storage: PartyStorage;
const completeFactoryProbe = {
  github: (_config: RepositoryConfig) => storage,
  gitlab: (_config: RepositoryConfig) => storage,
  codeberg: (_config: RepositoryConfig) => storage,
} satisfies PartyStorageFactories;

void completeFactoryProbe;
