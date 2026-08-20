import { codexSessionId, type CodexSessionId, type EncounterSessionId } from '../../combat/values';
import { exportSavedSession, type BrowserSessionStore, type MirrorSink, type SessionRevision } from '../session-persistence';
import {
  DEFAULT_DM_MODEL_CONFIG,
  type DmBridgeExchange,
  type DmBridgeModelConfig,
  type DmBridgeRequest,
} from './contracts';
import {
  modelFleetTelemetry,
  type FleetTelemetry,
} from '../fleet-telemetry';
import {
  ProjectionTransferSender,
  type ProjectionTransportMode,
  type ProjectionTransportTelemetry,
} from './projection-transport';

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
  readonly #projectionSender = new ProjectionTransferSender();
  #projectionTelemetry: ProjectionTransportTelemetry = {
    bytesSent: 0,
    fullSnapshots: 0,
    deltaSnapshots: 0,
    reconstructionFailures: 0,
  };

  constructor(
    private readonly baseUrl: string,
    private readonly fetch: BridgeFetch,
    private readonly onFailure: (error: unknown) => void,
    private readonly onTelemetry: (telemetry: FleetTelemetry) => void = () => undefined,
    private readonly projectionTransport: ProjectionTransportMode = 'full',
  ) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'http:' || (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost')) {
      throw new TypeError('DM bridge client accepts localhost HTTP URLs only.');
    }
  }

  async exchange(request: DmBridgeRequest, signal: AbortSignal): Promise<unknown> {
    try {
      const send = async (forceFull: boolean): Promise<BridgeFetchResponse> => {
        const wireRequest = this.projectionTransport === 'revision_delta'
          ? this.#projectionSender.encode(request, forceFull)
          : request;
        const body = JSON.stringify(wireRequest);
        if (this.projectionTransport === 'revision_delta') {
          const transfer = 'projectionTransfer' in wireRequest ? wireRequest.projectionTransfer : null;
          this.#projectionTelemetry = {
            ...this.#projectionTelemetry,
            bytesSent: this.#projectionTelemetry.bytesSent + new TextEncoder().encode(body).length,
            fullSnapshots: this.#projectionTelemetry.fullSnapshots + (transfer?.kind === 'full_projection' ? 1 : 0),
            deltaSnapshots: this.#projectionTelemetry.deltaSnapshots + (transfer?.kind === 'projection_delta' ? 1 : 0),
          };
        }
        return this.fetch(`${this.baseUrl}/dm/exchange`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          signal,
        });
      };
      let response = await send(false);
      if (!response.ok) throw new Error(`DM bridge exchange failed with HTTP ${response.status}.`);
      let body = await response.json();
      if (
        this.projectionTransport === 'revision_delta' &&
        typeof body === 'object' && body !== null && !Array.isArray(body) &&
        'kind' in body && body.kind === 'full_projection_required'
      ) {
        if (
          !('encounterId' in body) || body.encounterId !== request.encounterId ||
          !('expectedRevision' in body) || body.expectedRevision !== request.expectedRevision
        ) {
          throw new TypeError('DM bridge full-projection request has stale identity.');
        }
        this.#projectionTelemetry = {
          ...this.#projectionTelemetry,
          reconstructionFailures: this.#projectionTelemetry.reconstructionFailures + 1,
        };
        response = await send(true);
        if (!response.ok) throw new Error(`DM bridge exchange failed with HTTP ${response.status}.`);
        body = await response.json();
      }
      if (typeof body !== 'object' || body === null || Array.isArray(body) || !('reply' in body)) {
        throw new TypeError('DM bridge exchange response is malformed.');
      }
      if ('telemetry' in body) this.onTelemetry(decodeBridgeFleetTelemetry(body.telemetry));
      return body.reply;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  projectionTransportTelemetry(): ProjectionTransportTelemetry {
    return structuredClone(this.#projectionTelemetry);
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

function decodeBridgeFleetTelemetry(value: unknown): FleetTelemetry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('DM bridge fleet telemetry is malformed.');
  }
  const input = value as Readonly<Record<string, unknown>>;
  const tokenCounts = input.tokenCounts;
  if (
    typeof input.modelId !== 'string' ||
    typeof input.reasoningEffort !== 'string' ||
    (input.buildId !== null && typeof input.buildId !== 'string') ||
    (input.commit !== null && typeof input.commit !== 'string') ||
    (input.loadLevelTag !== null && typeof input.loadLevelTag !== 'string') ||
    typeof input.latencyMs !== 'number' ||
    typeof input.correctionAttempts !== 'number' ||
    typeof tokenCounts !== 'object' || tokenCounts === null || Array.isArray(tokenCounts)
  ) {
    throw new TypeError('DM bridge fleet telemetry is malformed.');
  }
  const counts = tokenCounts as Readonly<Record<string, unknown>>;
  if (
    typeof counts.input !== 'number' ||
    typeof counts.cachedInput !== 'number' ||
    typeof counts.output !== 'number' ||
    typeof counts.reasoning !== 'number'
  ) {
    throw new TypeError('DM bridge fleet token counts are malformed.');
  }
  return modelFleetTelemetry({
    modelId: input.modelId,
    reasoningEffort: input.reasoningEffort as FleetTelemetry['reasoningEffort'],
    buildId: input.buildId as string | null,
    commit: input.commit as string | null,
    loadLevelTag: input.loadLevelTag as string | null,
    latencyMs: input.latencyMs,
    correctionAttempts: input.correctionAttempts,
    tokenCounts: {
      input: counts.input,
      cachedInput: counts.cachedInput,
      output: counts.output,
      reasoning: counts.reasoning,
    },
  });
}
