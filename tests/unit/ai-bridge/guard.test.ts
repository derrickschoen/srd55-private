import { describe, expect, it } from 'vitest';
import {
  AI_BRIDGE_TOKEN_HEADER,
  admit,
  allowedOrigins,
  secretEquals,
  type GuardInput,
} from '../../../tools/ai-bridge/guard';

const PORT = 4173;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const TOKEN = 'a'.repeat(64);

function request(changes: Partial<GuardInput> = {}): GuardInput {
  return {
    method: 'POST',
    headers: { [AI_BRIDGE_TOKEN_HEADER]: TOKEN, origin: ORIGIN },
    port: PORT,
    token: TOKEN,
    ...changes,
  };
}

describe('bridge admission', () => {
  it('admits the dev page’s own POST', () => {
    expect(admit(request())).toEqual({ admitted: true });
  });

  it('refuses every method but POST, so no form or img can reach a handler', () => {
    for (const method of ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', undefined]) {
      const verdict = admit(request({ method }));
      expect(verdict.admitted, `method ${String(method)}`).toBe(false);
      expect(verdict).toMatchObject({ status: 405 });
    }
  });

  it('refuses a request with no secret, a wrong secret, or a truncated secret', () => {
    for (const presented of [undefined, '', 'wrong', TOKEN.slice(0, 63), `${TOKEN}x`]) {
      const headers: Record<string, string> = { origin: ORIGIN };
      if (presented !== undefined) {
        headers[AI_BRIDGE_TOKEN_HEADER] = presented;
      }
      const verdict = admit(request({ headers }));
      expect(verdict.admitted, `secret ${String(presented)}`).toBe(false);
      expect(verdict).toMatchObject({ status: 403 });
    }
  });

  it('refuses everything when the server has no secret at all', () => {
    expect(admit(request({ token: '' }))).toMatchObject({
      admitted: false,
      status: 503,
    });
  });

  it('refuses a foreign Origin even when the secret is correct', () => {
    for (const origin of [
      undefined,
      'http://evil.example',
      'null',
      'http://127.0.0.1:9999',
      `https://127.0.0.1:${PORT}`,
      `http://127.0.0.1:${PORT}.evil.example`,
    ]) {
      const headers: Record<string, string> = {
        [AI_BRIDGE_TOKEN_HEADER]: TOKEN,
      };
      if (origin !== undefined) {
        headers['origin'] = origin;
      }
      const verdict = admit(request({ headers }));
      expect(verdict.admitted, `origin ${String(origin)}`).toBe(false);
      expect(verdict).toMatchObject({ status: 403 });
    }
  });

  it('takes the first value when a header is sent more than once', () => {
    expect(
      admit(
        request({
          headers: {
            [AI_BRIDGE_TOKEN_HEADER]: [TOKEN, 'ignored'],
            origin: [ORIGIN, 'http://evil.example'],
          },
        }),
      ),
    ).toEqual({ admitted: true });
    expect(
      admit(
        request({
          headers: {
            [AI_BRIDGE_TOKEN_HEADER]: ['wrong', TOKEN],
            origin: ORIGIN,
          },
        }),
      ),
    ).toMatchObject({ admitted: false, status: 403 });
  });

  it('allows no origin at all before the server has a port', () => {
    expect(allowedOrigins(null)).toEqual([]);
    expect(admit(request({ port: null }))).toMatchObject({
      admitted: false,
      status: 403,
    });
  });

  it('accepts the three spellings of loopback the browser may send', () => {
    for (const origin of allowedOrigins(PORT)) {
      expect(
        admit(
          request({
            headers: { [AI_BRIDGE_TOKEN_HEADER]: TOKEN, origin },
          }),
        ),
        origin,
      ).toEqual({ admitted: true });
    }
  });
});

describe('secretEquals', () => {
  it('compares by value and never throws on a length mismatch', () => {
    expect(secretEquals('abc', 'abc')).toBe(true);
    expect(secretEquals('abc', 'abd')).toBe(false);
    expect(secretEquals('abc', '')).toBe(false);
    expect(secretEquals('abc', 'abcd')).toBe(false);
    expect(secretEquals('', '')).toBe(true);
  });
});
