export type TransportKind = 'trystero' | 'manual' | 'relay';
export type TransportState = 'connecting' | 'connected' | 'closed' | 'failed';

export interface TransportStatus {
  readonly state: TransportState;
  readonly message: string;
}

export type TransportCleanup = () => void;

export interface VttTransport {
  readonly kind: TransportKind;
  readonly connected: boolean;
  send(update: Uint8Array): Promise<void>;
  onUpdate(listener: (update: Uint8Array) => void): TransportCleanup;
  onPeerConnected(listener: () => void): TransportCleanup;
  onStatus(listener: (status: TransportStatus) => void): TransportCleanup;
  close(): void;
}

/** Type-only seam for the phase-2 Cloudflare Durable Object relay. */
export interface RelayTransport extends VttTransport {
  readonly kind: 'relay';
}

export class TransportEvents {
  readonly #updates = new Set<(update: Uint8Array) => void>();
  readonly #connections = new Set<() => void>();
  readonly #statuses = new Set<(status: TransportStatus) => void>();

  onUpdate(listener: (update: Uint8Array) => void): TransportCleanup {
    this.#updates.add(listener);
    return () => this.#updates.delete(listener);
  }

  onPeerConnected(listener: () => void): TransportCleanup {
    this.#connections.add(listener);
    return () => this.#connections.delete(listener);
  }

  onStatus(listener: (status: TransportStatus) => void): TransportCleanup {
    this.#statuses.add(listener);
    return () => this.#statuses.delete(listener);
  }

  emitUpdate(update: Uint8Array): void {
    for (const listener of this.#updates) listener(update);
  }

  emitPeerConnected(): void {
    for (const listener of this.#connections) listener();
  }

  emitStatus(status: TransportStatus): void {
    for (const listener of this.#statuses) listener(status);
  }

  clear(): void {
    this.#updates.clear();
    this.#connections.clear();
    this.#statuses.clear();
  }
}

