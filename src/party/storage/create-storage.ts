import type {
  Forge,
  PartyStorage,
  RepositoryConfig,
} from './contracts';

export type PartyStorageFactories = Readonly<
  Record<Forge, (config: RepositoryConfig) => PartyStorage>
>;

export function createPartyStorage(
  config: RepositoryConfig,
  factories: PartyStorageFactories,
): PartyStorage {
  return factories[config.forge](config);
}
