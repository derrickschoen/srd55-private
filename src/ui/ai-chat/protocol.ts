/**
 * The wire contract shared by the two halves of the DEV-ONLY AI bridge.
 *
 * It lives under `src/` rather than `tools/` so the browser half can import it
 * without reaching outside the application graph, and the node half imports the
 * same module so the route names, header name and limits cannot drift apart.
 * Nothing here is reachable from a production bundle: the only importer in
 * `src/` is `ui/ai-chat/mount.ts`, which `src/main.ts` loads exclusively from
 * inside an `import.meta.env.DEV` branch. `tools/assert-dist-clean.mjs` scans
 * `dist/` for the literals below and fails the build if any of them ship.
 */
import type { RpcErrorPayload } from '../../rpc/protocol';

export const AI_BRIDGE_ROUTE_PREFIX = '/__ai/';
export const AI_BRIDGE_SESSION_ROUTE = `${AI_BRIDGE_ROUTE_PREFIX}session`;
export const AI_BRIDGE_CHAT_ROUTE = `${AI_BRIDGE_ROUTE_PREFIX}chat`;

/**
 * A custom request header is the load-bearing browser barrier: cross-origin
 * JavaScript cannot set one without a CORS preflight, and the dev server sets
 * `server.cors: false`, so that preflight is never answered. Carrying the
 * per-run secret in the header rather than the body means a request that fails
 * the preflight never reaches a handler at all.
 */
export const AI_BRIDGE_TOKEN_HEADER = 'x-ai-bridge-token';

/**
 * The per-run secret is injected into the dev-served HTML only, by a
 * `transformIndexHtml` hook that never runs in a build. A cross-origin page
 * cannot read it, because reading this document's markup would itself need
 * CORS.
 */
export const AI_BRIDGE_TOKEN_META = 'ai-bridge-token';

export const AI_CHAT_METHOD = 'ai.chat';
export const AI_CHAT_MAX_MESSAGE_LENGTH = 4000;

/**
 * The reference is the page's OWN `agentReferenceJson` projection, read back out
 * of the `<script type="application/json">` block the planner already renders.
 * It is deliberately not a second projection: that one is enum-checked, withholds
 * every importer-authored string, and has a unit test pinning each of its fields
 * to a visible row. A parallel projection could drift from it.
 */
export const AI_CHAT_MAX_REFERENCE_BYTES = 512 * 1024;

export interface AiChatParams {
  readonly message: string;
  readonly reference: string | null;
}

/** One newline-delimited frame of the chat response stream. */
export type AiFrame =
  | { readonly t: 'delta'; readonly text: string }
  | { readonly t: 'done' }
  | { readonly t: 'error'; readonly error: RpcErrorPayload };

export function isAiFrame(value: unknown): value is AiFrame {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const frame = value as { t?: unknown; text?: unknown; error?: unknown };
  if (frame.t === 'delta') {
    return typeof frame.text === 'string';
  }
  if (frame.t === 'done') {
    return true;
  }
  if (frame.t === 'error') {
    const error = frame.error as { code?: unknown; message?: unknown } | null;
    return (
      typeof error === 'object' &&
      error !== null &&
      typeof error.code === 'string' &&
      typeof error.message === 'string'
    );
  }
  return false;
}
