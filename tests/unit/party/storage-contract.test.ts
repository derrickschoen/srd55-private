import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  CredentialLease,
  Forge,
  PartyStorage,
  RepositoryConfig,
} from '../../../src/party/storage/contracts';
import { createPartyStorage } from '../../../src/party/storage/create-storage';
import { createRecordedFixtureFetch } from '../../fixtures/party-storage/mock-fetch';
import { contractFixture } from '../../fixtures/party-storage/contract-fixtures';
import { FixtureBackedPartyStorage } from '../../fixtures/party-storage/fixture-backed-storage';
import type { PartyStorageContractScenario } from '../../fixtures/party-storage/types';
import { runPartyStorageContract } from '../../contracts/party-storage-contract';

function makeFixtureStorage(
  scenario: PartyStorageContractScenario,
): PartyStorage {
  const fixture = contractFixture(scenario);
  return new FixtureBackedPartyStorage(
    fixture,
    createRecordedFixtureFetch([fixture], () => `contract ${scenario}`),
  );
}

runPartyStorageContract('fixture-backed P0 adapter', makeFixtureStorage);

describe('party storage contract invariants', () => {
  it('PARTY-FORGE-EXHAUSTIVE keeps the closed forge set and dispatch free of default arms', () => {
    const forgeValues = [
      'github',
      'gitlab',
      'codeberg',
    ] as const satisfies readonly Forge[];
    expect(forgeValues).toEqual(['github', 'gitlab', 'codeberg']);

    const source = readFileSync(
      fileURLToPath(
        new URL('../../../src/party/storage/create-storage.ts', import.meta.url),
      ),
      'utf8',
    );
    expect(source).not.toMatch(/\bdefault\s*:/u);
  });

  it('PARTY-NO-UNCONDITIONAL-WRITE keeps replace expected required and permits no third arm', () => {
    const source = readFileSync(
      fileURLToPath(
        new URL('../../../src/party/storage/contracts.ts', import.meta.url),
      ),
      'utf8',
    );
    expect(source).toContain(
      "| { readonly kind: 'replace'; readonly expected: RepositoryRevision };",
    );
    expect(source.match(/readonly kind: 'create-only'/gu)).toHaveLength(1);
    expect(source.match(/readonly kind: 'replace'/gu)).toHaveLength(1);
  });

  it('PARTY-LEASE-NOT-SERIALIZABLE exposes a capability with no readable token or JSON hook', () => {
    const lease: CredentialLease = {
      kind: 'authenticated',
      applyAuthorization(request) {
        const headers = new Headers(request.headers);
        headers.set('authorization', 'Bearer synthetic-runtime-token');
        return new Request(request, { headers });
      },
    };

    expect(Object.keys(lease)).toEqual(['kind', 'applyAuthorization']);
    expect(JSON.stringify(lease)).toBe('{"kind":"authenticated"}');
    expect(() => structuredClone(lease)).toThrow();

    const source = readFileSync(
      fileURLToPath(
        new URL('../../../src/party/storage/contracts.ts', import.meta.url),
      ),
      'utf8',
    );
    expect(source).not.toMatch(/readonly\s+(?:token|toJSON|clone)\b/u);
  });

  it('keeps contracts.ts a leaf with only the shared Brand type import', () => {
    const source = readFileSync(
      fileURLToPath(
        new URL('../../../src/party/storage/contracts.ts', import.meta.url),
      ),
      'utf8',
    );
    const imports = source.match(/^import .*;$/gmu);
    expect(imports).toEqual([
      "import type { Brand } from '../../domain/ids';",
    ]);
  });

  it('routes through the factory selected by RepositoryConfig.forge', () => {
    const calls: Forge[] = [];
    const storage = makeFixtureStorage('success');
    const factories = {
      github: (_config: RepositoryConfig) => {
        calls.push('github');
        return storage;
      },
      gitlab: (_config: RepositoryConfig) => {
        calls.push('gitlab');
        return storage;
      },
      codeberg: (_config: RepositoryConfig) => {
        calls.push('codeberg');
        return storage;
      },
    };

    const actual = createPartyStorage(
      { forge: 'gitlab', repository: 'table/party', defaultBranch: null },
      factories,
    );
    expect(actual).toBe(storage);
    expect(calls).toEqual(['gitlab']);
  });
});
