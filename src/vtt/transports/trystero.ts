import { joinRoom, type Room } from 'trystero';
import {
  TransportEvents,
  type TransportCleanup,
  type TransportStatus,
  type VttTransport,
} from './transport';

export class TrysteroTransport implements VttTransport {
  readonly kind = 'trystero' as const;
  readonly #events = new TransportEvents();
  readonly #room: Room;
  readonly #sendUpdate: (data: ArrayBuffer) => Promise<void>;
  #connected = false;
  #lastStatus: TransportStatus = Object.freeze({
    state: 'connecting',
    message: 'Finding peers through public Nostr relays…',
  });

  constructor(roomCode: string) {
    this.#room = joinRoom(
      {
        appId: 'srd55-vtt-phase-1',
        password: roomCode,
      },
      roomCode,
      {
        onJoinError: ({ error }) => {
          this.#setStatus('failed', `Trystero signaling failed: ${error}`);
        },
      },
    );
    const action = this.#room.makeAction<ArrayBuffer>('yjs-update');
    this.#sendUpdate = (data) => action.send(data);
    action.onMessage = (data) => {
      this.#events.emitUpdate(new Uint8Array(data));
    };
    // Trystero exposes one assignable hook, so status and sync share it here.
    this.#room.onPeerJoin = () => {
      this.#connected = true;
      this.#setStatus('connected', 'Trystero peer connected.');
      this.#events.emitPeerConnected();
    };
    this.#room.onPeerLeave = () => {
      this.#connected = Object.keys(this.#room.getPeers()).length > 0;
      this.#setStatus(
        this.#connected ? 'connected' : 'connecting',
        this.#connected ? 'Connected to another peer.' : 'Waiting for a peer…',
      );
    };
  }

  get connected(): boolean {
    return this.#connected;
  }

  send(update: Uint8Array): Promise<void> {
    if (!this.connected) return Promise.resolve();
    return this.#sendUpdate(update.slice().buffer);
  }

  onUpdate(listener: (update: Uint8Array) => void): TransportCleanup {
    return this.#events.onUpdate(listener);
  }

  onPeerConnected(listener: () => void): TransportCleanup {
    const cleanup = this.#events.onPeerConnected(listener);
    if (this.connected) queueMicrotask(listener);
    return cleanup;
  }

  onStatus(listener: (status: TransportStatus) => void): TransportCleanup {
    const cleanup = this.#events.onStatus(listener);
    queueMicrotask(() => listener(this.#lastStatus));
    return cleanup;
  }

  close(): void {
    this.#connected = false;
    void this.#room.leave();
    this.#setStatus('closed', 'Trystero room left.');
    this.#events.clear();
  }

  #setStatus(state: TransportStatus['state'], message: string): void {
    this.#lastStatus = Object.freeze({ state, message });
    this.#events.emitStatus(this.#lastStatus);
  }
}
