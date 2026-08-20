import { codexSessionId, type CodexSessionId, type EncounterSessionId } from '../../combat/values';
import { exportSavedSession, type BrowserSessionStore, type MirrorSink, type SessionRevision } from '../session-persistence';
import {
  DEFAULT_DM_MODEL_CONFIG,
  type DmBridgeExchange,
  type DmBridgeModelConfig,
  type DmBridgeRequest,
} from './contracts';

export interface BridgeFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type BridgeFetch = (
  url: string,
  init: {
    readonly method: 'POST';
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
    readonly signal?: AbortSignal;
  },
) => Promise<BridgeFetchResponse>;

export interface BridgeAbortReport {
  readonly kind: 'bridge_export_and_abort';
  readonly sessionId: EncounterSessionId;
  readonly error: string;
  readonly exportedSession: string;
}

export class BridgeFailureGuard {
  #report: BridgeAbortReport | null = null;

  constructor(
    private readonly sessionId: EncounterSessionId,
    private readonly store: BrowserSessionStore,
    private readonly abortEncounter: () => void,
  ) {}

  abort(error: unknown): BridgeAbortReport {
    if (this.#report !== null) return this.#report;
    this.abortEncounter();
    const exportedSession = exportSavedSession(this.store, this.sessionId);
    this.#report = {
      kind: 'bridge_export_and_abort',
      sessionId: this.sessionId,
      error: error instanceof Error ? error.message : String(error),
      exportedSession,
    };
    return this.#report;
  }

  report(): BridgeAbortReport | null {
    return this.#report;
  }
}

export class LocalhostDmBridgeClient implements DmBridgeExchange, MirrorSink {
  #mirrorQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly baseUrl: string,
    private readonly fetch: BridgeFetch,
    private readonly onFailure: (error: unknown) => void,
  ) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'http:' || (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost')) {
      throw new TypeError('DM bridge client accepts localhost HTTP URLs only.');
    }
  }

  async exchange(request: DmBridgeRequest, signal: AbortSignal): Promise<unknown> {
    try {
      const response = await this.fetch(`${this.baseUrl}/dm/exchange`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });
      if (!response.ok) throw new Error(`DM bridge exchange failed with HTTP ${response.status}.`);
      const body = await response.json();
      if (typeof body !== 'object' || body === null || Array.isArray(body) || !('reply' in body)) {
        throw new TypeError('DM bridge exchange response is malformed.');
      }
      return body.reply;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  async createSession(
    encounterId: EncounterSessionId,
    signal: AbortSignal,
    model: DmBridgeModelConfig = DEFAULT_DM_MODEL_CONFIG,
  ): Promise<CodexSessionId> {
    try {
      const response = await this.fetch(`${this.baseUrl}/dm/session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'create_dm_session',
          encounterId,
          requestId: `${encounterId}:create-dm-session`,
          model,
        }),
        signal,
      });
      if (!response.ok) throw new Error(`DM bridge session creation failed with HTTP ${response.status}.`);
      const body = await response.json();
      if (
        typeof body !== 'object' || body === null || Array.isArray(body) ||
        !('reply' in body) || typeof body.reply !== 'object' || body.reply === null || Array.isArray(body.reply) ||
        !('codexSessionId' in body.reply) || typeof body.reply.codexSessionId !== 'string'
      ) {
        throw new TypeError('DM bridge session response is malformed.');
      }
      return codexSessionId(body.reply.codexSessionId);
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  append(revision: SessionRevision): void {
    this.#mirrorQueue = this.#mirrorQueue.then(async () => {
      const response = await this.fetch(`${this.baseUrl}/dm/mirror`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(revision),
      });
      if (!response.ok) throw new Error(`DM bridge mirror failed with HTTP ${response.status}.`);
      await response.json();
    }).catch((error: unknown) => {
      this.onFailure(error);
      throw error;
    });
  }

  async flushMirror(): Promise<void> {
    await this.#mirrorQueue;
  }
}
