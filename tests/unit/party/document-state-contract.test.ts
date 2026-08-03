import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';
import schemaSql from '../../../src/db/schema.sql?raw';
import {
  PARTY_DOCUMENT_KINDS,
  PARTY_OBSERVATION_STATES,
  observationStateKind,
  mintPartyPublicationId,
} from '../../../src/party/document-state';
import {
  PARTY_RPC,
  createPartyClient,
  type PartyDocumentState,
} from '../../../src/party/client';
import type { CharacterId } from '../../../src/domain/ids';
import type { RpcClient } from '../../../src/rpc/client';

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));

describe('party document-state contracts', () => {
  it('PARTY-INDEX-NULLS-STAY-NULL pins the exact observation vocabularies and exhaustive grouping', () => {
    expect(PARTY_DOCUMENT_KINDS).toEqual(['library', 'character']);
    expect(PARTY_OBSERVATION_STATES).toEqual([
      'Never published',
      'Unpublished local changes',
      'Published at revision N from this device',
      'Published; refresh required before another publish',
      'No longer published',
      'Never refreshed',
      'Last refreshed successfully',
      'Latest refresh attempt',
    ]);
    expect(PARTY_OBSERVATION_STATES.map(observationStateKind)).toEqual([
      'publication',
      'publication',
      'publication',
      'publication',
      'publication',
      'refresh',
      'refresh',
      'refresh',
    ]);
  });

  it('PARTY-PUBLICATION-ID-BRANDED mints opaque random ids rather than character-derived ids', () => {
    const first = mintPartyPublicationId();
    const second = mintPartyPublicationId();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
    expect(second).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
    expect(second).not.toBe(first);
  });

  it('PARTY-INDEX-NOT-CHARACTER-TRUTH exposes observation fields and no character-facing facts', () => {
    const state: PartyDocumentState = {
      forge: 'github',
      repository: 'table/party',
      observedRef: null,
      path: 'characters/ash--pub-1.json' as PartyDocumentState['path'],
      documentKind: 'character',
      publicationId: null,
      characterId: null,
      lastObservedRemoteRevision: null,
      lastImportedRevision: null,
      lastPublishedLocalRevision: null,
      lastSuccessfulRefreshAt: null,
      observationState: 'Never published',
    };

    expect(Object.keys(state).sort()).toEqual([
      'characterId',
      'documentKind',
      'forge',
      'lastImportedRevision',
      'lastObservedRemoteRevision',
      'lastPublishedLocalRevision',
      'lastSuccessfulRefreshAt',
      'observationState',
      'observedRef',
      'path',
      'publicationId',
      'repository',
    ]);
  });

  it('PARTY-ROSTER-DERIVATION-SEAM stores only a character reference, never copied roster facts', () => {
    const indexFields = {
      forge: true,
      repository: true,
      observedRef: true,
      path: true,
      documentKind: true,
      publicationId: true,
      characterId: true,
      lastObservedRemoteRevision: true,
      lastImportedRevision: true,
      lastPublishedLocalRevision: true,
      lastSuccessfulRefreshAt: true,
      observationState: true,
    } as const satisfies Record<keyof PartyDocumentState, true>;
    const state: PartyDocumentState = {
      forge: 'github',
      repository: 'table/party',
      observedRef: null,
      path: 'characters/ash--pub-1.json' as PartyDocumentState['path'],
      documentKind: 'character',
      publicationId: null,
      characterId: 7 as CharacterId,
      lastObservedRemoteRevision: null,
      lastImportedRevision: null,
      lastPublishedLocalRevision: null,
      lastSuccessfulRefreshAt: null,
      observationState: 'Never published',
    };

    expectTypeOf<PartyDocumentState['characterId']>()
      .toEqualTypeOf<CharacterId | null>();
    expect(state).toHaveProperty('characterId', 7);
    for (const copiedRosterFact of [
      'name',
      'classes',
      'level',
      'armorClass',
      'hitPointMaximum',
      'passivePerception',
      'spellSaveDifficultyClass',
    ]) {
      expect(indexFields).not.toHaveProperty(copiedRosterFact);
      expect(state).not.toHaveProperty(copiedRosterFact);
    }
  });

  it('PARTY-INDEX-NO-CREDENTIAL-COLUMN scans the declaration, generated DDL, migration, and source boundary', () => {
    const schemaSource = readFileSync(`${repositoryRoot}/db/schema/party.ts`, 'utf8');
    const migration = readFileSync(
      `${repositoryRoot}/drizzle/0029_party_document_states.sql`,
      'utf8',
    );
    const generatedTable = schemaSql.match(
      /CREATE TABLE `party_document_states`[\s\S]*?;\n/u,
    )?.[0];
    expect(generatedTable).toBeDefined();

    const forbidden = /credential|token|secret|password|bearer|authorization/iu;
    for (const source of [schemaSource, generatedTable ?? '', migration]) {
      expect(source).not.toMatch(forbidden);
    }

    for (const relativePath of [
      'db/schema/party.ts',
      'src/worker/handlers/party.ts',
      'src/party/client.ts',
    ]) {
      const source = readFileSync(`${repositoryRoot}/${relativePath}`, 'utf8');
      expect(source).not.toMatch(/(?:from|import\s*\()\s*['"][^'"]*credentials/iu);
    }
  });

  it('wires the typed client to the two non-secret observation RPC methods', async () => {
    const calls: { method: string; params: unknown }[] = [];
    const rpc = {
      call: async (method: string, params: unknown) => {
        calls.push({ method, params });
        return method === PARTY_RPC.listDocumentStates ? [] : params;
      },
    } as Pick<RpcClient, 'call'> as RpcClient;
    const client = createPartyClient(rpc);
    const locator = { forge: 'github' as const, repository: 'table/party' };
    await expect(client.listDocumentStates(locator)).resolves.toEqual([]);

    const state: PartyDocumentState = {
      ...locator,
      observedRef: null,
      path: 'library/party-library.json' as PartyDocumentState['path'],
      documentKind: 'library',
      publicationId: null,
      characterId: null,
      lastObservedRemoteRevision: null,
      lastImportedRevision: null,
      lastPublishedLocalRevision: null,
      lastSuccessfulRefreshAt: null,
      observationState: 'Never refreshed',
    };
    await client.saveDocumentState(state);

    expect(PARTY_RPC).toEqual({
      listDocumentStates: 'party.listDocumentStates',
      saveDocumentState: 'party.saveDocumentState',
    });
    expect(calls).toEqual([
      { method: PARTY_RPC.listDocumentStates, params: locator },
      { method: PARTY_RPC.saveDocumentState, params: { state } },
    ]);
  });
});
