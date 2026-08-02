import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { matchPartyStorageRoute } from '../../browser/fixtures/party-storage-routes';
import { partyStorageContractFixtures } from '../../fixtures/party-storage/contract-fixtures';
import { installForgeNetworkGuard } from '../../fixtures/party-storage/network-guard';
import { matchRecordedFixture } from '../../fixtures/party-storage/matcher';
import type { RecordedForgeFixture } from '../../fixtures/party-storage/types';

installForgeNetworkGuard(partyStorageContractFixtures);

describe('recorded party storage fixture harness', () => {
  it('matches method, URL, body, and relevant headers', async () => {
    const fixture = partyStorageContractFixtures[0];
    const response = await fetch(fixture.request.url, {
      method: fixture.request.method,
      headers: {
        ...fixture.request.headers,
        'x-irrelevant-browser-header': 'ignored',
      },
      body: fixture.request.body,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe('"synthetic-success"');
    expect(await response.text()).toBe(
      '{"bytes":[123,125,10],"revision":"revision-001"}',
    );

    expect(
      matchRecordedFixture(partyStorageContractFixtures, {
        ...fixture.request,
        method: 'POST',
      }),
    ).toEqual({ kind: 'unmatched' });
  });

  it('PARTY-NO-LIVE-NETWORK throws with the unhandled forge URL and exact test name', async () => {
    const url = 'https://api.github.com/unhandled-party-request';
    await expect(fetch(url)).rejects.toThrow(url);
    await expect(fetch(url)).rejects.toThrow(
      'PARTY-NO-LIVE-NETWORK throws with the unhandled forge URL and exact test name',
    );
  });

  it('replays a recorded transport failure as a rejected fetch', async () => {
    const fixture = partyStorageContractFixtures[5];
    await expect(
      fetch(fixture.request.url, {
        method: fixture.request.method,
        headers: fixture.request.headers,
        body: fixture.request.body,
      }),
    ).rejects.toThrow('synthetic offline failure');
  });

  it('has no record mode, live fallback, or environment-controlled escape hatch', () => {
    const sources = ['network-guard.ts', 'mock-fetch.ts', 'matcher.ts'].map(
      (name) =>
        readFileSync(
          fileURLToPath(
            new URL(`../../fixtures/party-storage/${name}`, import.meta.url),
          ),
          'utf8',
        ),
    );
    expect(sources.join('\n')).not.toMatch(
      /process\.env|import\.meta\.env|originalFetch\s*\(/u,
    );
  });

  it('proves Playwright matching and refusal as a pure function', () => {
    const fixture = partyStorageContractFixtures[1];
    if (fixture.response.kind !== 'response') {
      throw new Error('The not-found fixture must contain an HTTP response');
    }
    expect(
      matchPartyStorageRoute(
        partyStorageContractFixtures,
        fixture.request,
        'public party journey',
      ),
    ).toEqual({
      kind: 'fulfill',
      status: fixture.response.status,
      headers: fixture.response.headers,
      body: fixture.response.body,
    });

    const missingUrl = 'https://gitlab.com/api/v4/unhandled';
    expect(
      matchPartyStorageRoute(
        partyStorageContractFixtures,
        { method: 'GET', url: missingUrl, body: null, headers: {} },
        'public party journey',
      ),
    ).toEqual({
      kind: 'refuse',
      message: `Unhandled forge request ${missingUrl} in test "public party journey"`,
    });

    const networkFixture = partyStorageContractFixtures[5];
    expect(
      matchPartyStorageRoute(
        partyStorageContractFixtures,
        networkFixture.request,
        'offline party journey',
      ),
    ).toEqual({
      kind: 'abort-network',
      message: 'synthetic offline failure',
    });
  });

  it('normalizes bodyless requests and can require authorization to be absent', () => {
    const fixture = partyStorageContractFixtures[4];
    const bodylessFixture = {
      ...fixture,
      name: 'bodyless request',
      request: {
        ...fixture.request,
        method: 'DELETE',
        body: null,
      },
    } satisfies RecordedForgeFixture;
    expect(
      matchRecordedFixture([bodylessFixture], {
        ...bodylessFixture.request,
        method: 'DELETE',
        body: '',
      }),
    ).toEqual({ kind: 'matched', fixture: bodylessFixture });
    expect(
      matchRecordedFixture([bodylessFixture], {
        ...bodylessFixture.request,
        headers: { authorization: 'Bearer must-not-match' },
      }),
    ).toEqual({ kind: 'unmatched' });
  });
});
