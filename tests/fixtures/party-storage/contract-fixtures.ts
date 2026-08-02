import type {
  RepositoryPath,
  RepositoryRevision,
} from '../../../src/party/storage/contracts';
import type { PartyStorageContractFixture } from './types';

const path = 'characters/ash--pub-0001.json' as RepositoryPath;
const revision = 'revision-001' as RepositoryRevision;

/**
 * Synthetic harness fixtures only. Their /p0-fixture/ URLs deliberately do
 * not claim a real provider dialect; each P1 lane records its own API corpus.
 */
export const partyStorageContractFixtures = [
  {
    name: 'contract success',
    scenario: 'success',
    request: {
      method: 'GET',
      url: 'https://api.github.com/p0-fixture/success',
      body: null,
      headers: { authorization: 'Bearer synthetic-p0-token' },
      absentHeaders: [],
    },
    response: {
      kind: 'response',
      status: 200,
      headers: { etag: '"synthetic-success"' },
      body: '{"bytes":[123,125,10],"revision":"revision-001"}',
    },
    operation: 'read',
    result: {
      kind: 'success',
      value: {
        path,
        bytes: new Uint8Array([123, 125, 10]),
        revision,
      },
    },
  },
  {
    name: 'contract not found',
    scenario: 'not-found',
    request: {
      method: 'GET',
      url: 'https://gitlab.com/api/v4/p0-fixture/not-found',
      body: null,
      headers: { 'private-token': 'synthetic-p0-token' },
      absentHeaders: [],
    },
    response: {
      kind: 'response',
      status: 404,
      headers: {},
      body: '{"fixture":"not-found"}',
    },
    operation: 'read',
    result: { kind: 'not-found', at: 'unknown' },
  },
  {
    name: 'contract conflict',
    scenario: 'conflict',
    request: {
      method: 'PUT',
      url: 'https://codeberg.org/api/v1/p0-fixture/conflict',
      body: '{"synthetic":true}',
      headers: { authorization: 'token synthetic-p0-token' },
      absentHeaders: [],
    },
    response: {
      kind: 'response',
      status: 409,
      headers: {},
      body: '{"fixture":"conflict"}',
    },
    operation: 'write',
    result: {
      kind: 'conflict',
      expected: 'revision-001' as RepositoryRevision,
      actual: null,
    },
  },
  {
    name: 'contract unauthorized',
    scenario: 'unauthorized',
    request: {
      method: 'GET',
      url: 'https://api.github.com/p0-fixture/unauthorized',
      body: null,
      headers: { authorization: 'Bearer synthetic-expired-token' },
      absentHeaders: [],
    },
    response: {
      kind: 'response',
      status: 401,
      headers: {},
      body: '{"fixture":"unauthorized"}',
    },
    operation: 'read',
    result: {
      kind: 'unauthorized',
      credentialState: 'invalid-expired-or-revoked',
    },
  },
  {
    name: 'contract rate limited',
    scenario: 'rate-limited',
    request: {
      method: 'GET',
      url: 'https://gitlab.com/api/v4/p0-fixture/rate-limited',
      body: null,
      headers: {},
      absentHeaders: ['authorization', 'private-token'],
    },
    response: {
      kind: 'response',
      status: 429,
      headers: {},
      body: '{"fixture":"rate-limited"}',
    },
    operation: 'list',
    result: { kind: 'rate-limited', retryAt: null },
  },
  {
    name: 'contract network failed',
    scenario: 'network-failed',
    request: {
      method: 'GET',
      url: 'https://codeberg.org/api/v1/p0-fixture/network-failed',
      body: null,
      headers: {},
      absentHeaders: ['authorization', 'private-token'],
    },
    response: { kind: 'network-error', message: 'synthetic offline failure' },
    operation: 'read',
    result: { kind: 'network-failed', writeState: 'not-applicable' },
  },
  {
    name: 'contract too large',
    scenario: 'too-large',
    request: {
      method: 'PUT',
      url: 'https://api.github.com/p0-fixture/too-large',
      body: '{"synthetic":true}',
      headers: { authorization: 'Bearer synthetic-p0-token' },
      absentHeaders: [],
    },
    response: {
      kind: 'response',
      status: 413,
      headers: {},
      body: '{"fixture":"too-large"}',
    },
    operation: 'write',
    result: { kind: 'too-large', observedBytes: null, limitBytes: null },
  },
] as const satisfies readonly PartyStorageContractFixture[];

export function contractFixture(
  scenario: PartyStorageContractFixture['scenario'],
): PartyStorageContractFixture {
  const fixture = partyStorageContractFixtures.find(
    (candidate) => candidate.scenario === scenario,
  );
  if (fixture === undefined) {
    throw new Error(`Missing party storage contract fixture: ${scenario}`);
  }
  return fixture;
}
