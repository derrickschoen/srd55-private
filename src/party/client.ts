import type { CharacterId, PartyPublicationId } from '../domain/ids';
import type { RpcClient } from '../rpc/client';
import type {
  PartyDocumentKind,
  PartyObservationState,
} from './document-state';
import type {
  RepositoryConfig,
  RepositoryPath,
  RepositoryRevision,
} from './storage/contracts';

export type PartyRepositoryIdentity = Pick<
  RepositoryConfig,
  'forge' | 'repository'
>;

export interface PartyDocumentState extends PartyRepositoryIdentity {
  readonly observedRef: string | null;
  readonly path: RepositoryPath;
  readonly documentKind: PartyDocumentKind;
  readonly publicationId: PartyPublicationId | null;
  /**
   * Recipient-local roster derivation seam. The index stores only the newest
   * clone association; roster name and mechanics are read from this referenced
   * character at read time and are never copied into the observation row.
   */
  readonly characterId: CharacterId | null;
  readonly lastObservedRemoteRevision: RepositoryRevision | null;
  readonly lastImportedRevision: RepositoryRevision | null;
  readonly lastPublishedLocalRevision: number | null;
  readonly lastSuccessfulRefreshAt: string | null;
  readonly observationState: PartyObservationState;
}

export const PARTY_RPC = Object.freeze({
  listDocumentStates: 'party.listDocumentStates',
  saveDocumentState: 'party.saveDocumentState',
} as const);

export interface PartyClient {
  listDocumentStates(
    repository: PartyRepositoryIdentity,
  ): Promise<readonly PartyDocumentState[]>;
  saveDocumentState(state: PartyDocumentState): Promise<PartyDocumentState>;
}

export function createPartyClient(rpc: RpcClient): PartyClient {
  return Object.freeze({
    listDocumentStates: (repository: PartyRepositoryIdentity) =>
      rpc.call<PartyRepositoryIdentity, readonly PartyDocumentState[]>(
        PARTY_RPC.listDocumentStates,
        repository,
      ),
    saveDocumentState: (state: PartyDocumentState) =>
      rpc.call<{ readonly state: PartyDocumentState }, PartyDocumentState>(
        PARTY_RPC.saveDocumentState,
        { state },
      ),
  });
}
