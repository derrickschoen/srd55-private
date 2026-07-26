/**
 * Request admission for the DEV-ONLY AI bridge.
 *
 * Assume any web page open in this browser can reach the port. Loopback binding
 * stops remote HOSTS; it does nothing about `evil.example` in another tab, whose
 * `fetch` originates from inside this machine. So the barriers that matter are
 * the ones a hostile PAGE cannot get past, and they are layered deliberately —
 * `--tools ""` on the CLI is one layer whose meaning a future release could
 * change, and it is never the boundary on its own.
 *
 *   1. POST only. A cross-origin `<form>` POST is a "simple request" that needs
 *      no preflight, but it cannot set a custom header, so barrier 2 catches it;
 *      a GET `<img>`/`<script>` probe is refused here outright.
 *   2. A custom header carrying the PER-RUN secret. Setting a custom header
 *      cross-origin forces a CORS preflight, and `server.cors: false` in
 *      vite.config.ts means that preflight receives no `Access-Control-Allow-*`
 *      response, so the browser never sends the real request. Vite's DEFAULT
 *      cors setting reflects loopback-ish origins, which is exactly why turning
 *      it off is load-bearing rather than decorative.
 *   3. The secret itself, compared in constant time. It is regenerated on every
 *      dev-server start and injected only into the dev-served HTML. Its real
 *      value is defence against future MISCONFIGURATION: if someone ever flips
 *      `server.cors` back on, barrier 2 evaporates silently and this is the only
 *      thing left standing. It is not oversold as anything more.
 *   4. `Origin` equality. The browser sets `Origin` and page script cannot forge
 *      it, so against the browser threat model this is a real check. Against a
 *      non-browser caller it is worth nothing — `curl` sends any Origin it likes.
 *      It is kept as the backstop it is, not as the primary.
 *
 * The honest gap: any local process running as this user can call the bridge
 * with a forged Origin and a secret scraped from the dev server's own HTML. That
 * is no escalation, because such a process could run the `claude` CLI directly.
 */
import { timingSafeEqual } from 'node:crypto';
import {
  AI_BRIDGE_ROUTE_PREFIX,
  AI_BRIDGE_TOKEN_HEADER,
} from '../../src/ui/ai-chat/protocol';

export { AI_BRIDGE_ROUTE_PREFIX, AI_BRIDGE_TOKEN_HEADER };

export interface GuardInput {
  readonly method: string | undefined;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly port: number | null;
  readonly token: string;
}

export type GuardVerdict =
  | { readonly admitted: true }
  | { readonly admitted: false; readonly status: number; readonly reason: string };

function header(input: GuardInput, name: string): string | undefined {
  const value = input.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/** Constant-time equality that does not leak length through an early return. */
export function secretEquals(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  if (a.length !== b.length) {
    // Still do the comparison, against a copy of the expected buffer, so the
    // work done is independent of whether the lengths happened to match.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function allowedOrigins(port: number | null): readonly string[] {
  if (port === null) {
    return [];
  }
  return Object.freeze([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    `http://[::1]:${port}`,
  ]);
}

/**
 * Both bridge routes are POST, including the capability probe. A GET probe would
 * read more naturally, but browsers omit `Origin` on a same-origin GET even when
 * a custom header is present, so barrier 4 would deny the page's own probe.
 */
export function admit(input: GuardInput): GuardVerdict {
  if (input.method !== 'POST') {
    return {
      admitted: false,
      status: 405,
      reason: 'bridge routes accept POST only',
    };
  }
  if (input.token.length === 0) {
    return {
      admitted: false,
      status: 503,
      reason: 'bridge has no session secret',
    };
  }
  const presented = header(input, AI_BRIDGE_TOKEN_HEADER);
  if (presented === undefined || !secretEquals(input.token, presented)) {
    return {
      admitted: false,
      status: 403,
      reason: `missing or invalid ${AI_BRIDGE_TOKEN_HEADER} header`,
    };
  }
  const origin = header(input, 'origin');
  if (origin === undefined || !allowedOrigins(input.port).includes(origin)) {
    return { admitted: false, status: 403, reason: 'origin not allowed' };
  }
  return { admitted: true };
}
