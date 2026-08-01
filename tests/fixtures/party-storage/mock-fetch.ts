import type { RecordedForgeFixture } from './types';
import {
  fixtureRefusalMessage,
  matchRecordedFixture,
} from './matcher';

async function describeRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{
  readonly method: string;
  readonly url: string;
  readonly body: string | null;
  readonly headers: Readonly<Record<string, string>>;
}> {
  const request = new Request(input, init);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const body = request.method === 'GET' || request.method === 'HEAD'
    ? null
    : await request.clone().text();
  return { method: request.method, url: request.url, body, headers };
}

export function createRecordedFixtureFetch(
  fixtures: readonly RecordedForgeFixture[],
  testName: () => string,
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = await describeRequest(input, init);
    const match = matchRecordedFixture(fixtures, request);
    if (match.kind !== 'matched') {
      throw new Error(fixtureRefusalMessage(request, testName(), match));
    }
    const response = match.fixture.response;
    if (response.kind === 'network-error') {
      throw new TypeError(response.message);
    }
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  };
}
