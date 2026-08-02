import type { Page, Route } from '@playwright/test';
import {
  FORGE_API_ORIGINS,
  fixtureRefusalMessage,
  matchRecordedFixture,
} from '../../fixtures/party-storage/matcher';
import type {
  ActualForgeRequest,
  RecordedForgeFixture,
} from '../../fixtures/party-storage/types';

export type PartyStorageRouteMatch =
  | {
      readonly kind: 'fulfill';
      readonly status: number;
      readonly headers: Readonly<Record<string, string>>;
      readonly body: string;
    }
  | { readonly kind: 'abort-network'; readonly message: string }
  | { readonly kind: 'refuse'; readonly message: string };

export interface PartyStorageRouteGuard {
  assertNoRefusals(): void;
}

export function matchPartyStorageRoute(
  fixtures: readonly RecordedForgeFixture[],
  request: ActualForgeRequest,
  testName: string,
): PartyStorageRouteMatch {
  const match = matchRecordedFixture(fixtures, request);
  if (match.kind !== 'matched') {
    return {
      kind: 'refuse',
      message: fixtureRefusalMessage(request, testName, match),
    };
  }
  if (match.fixture.response.kind === 'network-error') {
    return {
      kind: 'abort-network',
      message: match.fixture.response.message,
    };
  }
  return {
    kind: 'fulfill',
    status: match.fixture.response.status,
    headers: match.fixture.response.headers,
    body: match.fixture.response.body,
  };
}

async function handleRoute(
  route: Route,
  fixtures: readonly RecordedForgeFixture[],
  testName: string,
  refusals: string[],
): Promise<void> {
  const request = route.request();
  const match = matchPartyStorageRoute(
    fixtures,
    {
      method: request.method(),
      url: request.url(),
      body: request.postData(),
      headers: request.headers(),
    },
    testName,
  );
  if (match.kind === 'refuse') {
    refusals.push(match.message);
    await route.abort('blockedbyclient');
    return;
  }
  if (match.kind === 'abort-network') {
    await route.abort('failed');
    return;
  }
  await route.fulfill({
    status: match.status,
    headers: match.headers,
    body: match.body,
  });
}

export async function installPartyStorageRoutes(
  page: Page,
  fixtures: readonly RecordedForgeFixture[],
  testName: string,
): Promise<PartyStorageRouteGuard> {
  const refusals: string[] = [];
  for (const origin of FORGE_API_ORIGINS) {
    await page.route(`${origin}/**`, (route) =>
      handleRoute(route, fixtures, testName, refusals),
    );
  }
  return {
    assertNoRefusals() {
      const refusal = refusals[0];
      if (refusal !== undefined) throw new Error(refusal);
    },
  };
}
