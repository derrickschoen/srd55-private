import {
  TransportEvents,
  type TransportCleanup,
  type TransportStatus,
  type VttTransport,
} from './transport';

const FRAME_VERSION = 1;
const FRAME_HEADER_BYTES = 9;
const FRAME_PAYLOAD_BYTES = 12 * 1024;
const MAX_BUFFERED_BYTES = 256 * 1024;
const ICE_GATHERING_DEADLINE_MS = 2_000;

type ManualRole = 'offerer' | 'answerer';

interface PendingMessage {
  readonly chunks: Array<Uint8Array | undefined>;
  readonly createdAt: number;
  received: number;
}

function parseDescription(
  value: string,
  expectedType: RTCSdpType,
): RTCSessionDescriptionInit {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('The pasted session description is not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('The pasted session description must be an object.');
  }
  const type = Reflect.get(parsed, 'type');
  const sdp = Reflect.get(parsed, 'sdp');
  if (type !== expectedType || typeof sdp !== 'string' || sdp.length === 0) {
    throw new Error(`Expected a valid ${expectedType} session description.`);
  }
  return Object.freeze({ type, sdp });
}

async function waitForIceGathering(connection: RTCPeerConnection): Promise<boolean> {
  if (connection.iceGatheringState === 'complete') return true;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (complete: boolean): void => {
      if (settled) return;
      settled = true;
      connection.removeEventListener('icegatheringstatechange', onChange);
      clearTimeout(deadline);
      resolve(complete);
    };
    const onChange = (): void => {
      if (connection.iceGatheringState === 'complete') finish(true);
    };
    const deadline = window.setTimeout(
      () => finish(connection.iceGatheringState === 'complete'),
      ICE_GATHERING_DEADLINE_MS,
    );
    connection.addEventListener('icegatheringstatechange', onChange);
    onChange();
  });
}

function normalizeData(data: unknown): Promise<Uint8Array> {
  if (data instanceof ArrayBuffer) {
    return Promise.resolve(new Uint8Array(data));
  }
  if (ArrayBuffer.isView(data)) {
    return Promise.resolve(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    );
  }
  if (data instanceof Blob) {
    return data.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }
  return Promise.reject(new Error('Manual transport received non-binary data.'));
}

export class ManualTransport implements VttTransport {
  readonly kind = 'manual' as const;
  readonly #events = new TransportEvents();
  readonly #connection = new RTCPeerConnection({ iceServers: [] });
  readonly #pending = new Map<number, PendingMessage>();
  #channel: RTCDataChannel | null = null;
  #connected = false;
  #sendTail: Promise<void> = Promise.resolve();
  #lastStatus: TransportStatus = Object.freeze({
    state: 'connecting',
    message: 'Waiting for manual signaling.',
  });

  constructor(readonly role: ManualRole) {
    this.#connection.addEventListener('connectionstatechange', () => {
      const state = this.#connection.connectionState;
      if (state === 'failed' || state === 'disconnected') {
        this.#setStatus('failed', `WebRTC connection ${state}.`);
      } else if (state === 'closed') {
        this.#setStatus('closed', 'Manual connection closed.');
      }
    });
    if (role === 'offerer') {
      this.#attachChannel(this.#connection.createDataChannel('vtt-yjs', {
        ordered: true,
      }));
    } else {
      this.#connection.addEventListener('datachannel', (event) => {
        this.#attachChannel(event.channel);
      });
    }
  }

  get connected(): boolean {
    return this.#connected;
  }

  async createOffer(): Promise<string> {
    if (this.role !== 'offerer') throw new Error('Only a room creator makes an offer.');
    await this.#connection.setLocalDescription(await this.#connection.createOffer());
    const complete = await waitForIceGathering(this.#connection);
    this.#setStatus(
      'connecting',
      complete
        ? 'Offer ready. Send it to the player.'
        : 'Offer ready at the ICE deadline. Send it to the player.',
    );
    return JSON.stringify(this.#requiredLocalDescription('offer'));
  }

  async acceptOfferAndCreateAnswer(offer: string): Promise<string> {
    if (this.role !== 'answerer') throw new Error('Only a joining player answers an offer.');
    await this.#connection.setRemoteDescription(parseDescription(offer, 'offer'));
    await this.#connection.setLocalDescription(await this.#connection.createAnswer());
    const complete = await waitForIceGathering(this.#connection);
    this.#setStatus(
      'connecting',
      complete
        ? 'Answer ready. Send it to the DM.'
        : 'Answer ready at the ICE deadline. Send it to the DM.',
    );
    return JSON.stringify(this.#requiredLocalDescription('answer'));
  }

  async acceptAnswer(answer: string): Promise<void> {
    if (this.role !== 'offerer') throw new Error('Only the room creator applies an answer.');
    await this.#connection.setRemoteDescription(parseDescription(answer, 'answer'));
    this.#setStatus('connecting', 'Answer applied. Opening the board connection…');
  }

  send(update: Uint8Array): Promise<void> {
    if (!this.connected) return Promise.resolve();
    const task = this.#sendTail.then(() => this.#sendChunked(update));
    this.#sendTail = task.catch(() => undefined);
    return task;
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
    this.#channel?.close();
    this.#connection.close();
    this.#pending.clear();
    this.#setStatus('closed', 'Manual connection closed.');
    this.#events.clear();
  }

  #requiredLocalDescription(type: RTCSdpType): RTCSessionDescriptionInit {
    const description = this.#connection.localDescription;
    if (description === null || description.type !== type) {
      throw new Error(`WebRTC did not create the expected ${type}.`);
    }
    return Object.freeze({ type: description.type, sdp: description.sdp });
  }

  #attachChannel(channel: RTCDataChannel): void {
    this.#channel = channel;
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = MAX_BUFFERED_BYTES / 2;
    channel.addEventListener('open', () => {
      this.#connected = true;
      this.#setStatus('connected', 'Manual peer connected.');
      this.#events.emitPeerConnected();
    });
    channel.addEventListener('close', () => {
      this.#connected = false;
      this.#setStatus('closed', 'Manual data channel closed.');
    });
    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      void normalizeData(event.data)
        .then((frame) => this.#receiveFrame(frame))
        .catch((error: unknown) => {
          this.#setStatus('failed', errorMessage(error));
        });
    });
  }

  async #sendChunked(update: Uint8Array): Promise<void> {
    const channel = this.#channel;
    if (channel === null || channel.readyState !== 'open') return;
    const count = Math.max(1, Math.ceil(update.byteLength / FRAME_PAYLOAD_BYTES));
    if (count > 65_535) throw new Error('VTT update is too large for manual transport.');
    const idBytes = new Uint32Array(1);
    crypto.getRandomValues(idBytes);
    const messageId = idBytes[0] ?? 0;
    for (let index = 0; index < count; index += 1) {
      await this.#waitForBuffer(channel);
      const start = index * FRAME_PAYLOAD_BYTES;
      const payload = update.subarray(start, start + FRAME_PAYLOAD_BYTES);
      const frame = new Uint8Array(FRAME_HEADER_BYTES + payload.byteLength);
      const view = new DataView(frame.buffer);
      view.setUint8(0, FRAME_VERSION);
      view.setUint32(1, messageId);
      view.setUint16(5, index);
      view.setUint16(7, count);
      frame.set(payload, FRAME_HEADER_BYTES);
      channel.send(frame.buffer);
    }
  }

  #waitForBuffer(channel: RTCDataChannel): Promise<void> {
    if (channel.bufferedAmount <= MAX_BUFFERED_BYTES) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onLow = (): void => {
        clearTimeout(deadline);
        resolve();
      };
      const deadline = window.setTimeout(() => {
        channel.removeEventListener('bufferedamountlow', onLow);
        reject(new Error('Manual transport send buffer did not drain.'));
      }, 3_000);
      channel.addEventListener('bufferedamountlow', onLow, { once: true });
    });
  }

  #receiveFrame(frame: Uint8Array): void {
    const now = Date.now();
    for (const [messageId, pending] of this.#pending) {
      if (now - pending.createdAt > 30_000) this.#pending.delete(messageId);
    }
    if (frame.byteLength < FRAME_HEADER_BYTES) {
      throw new Error('Manual transport received a truncated frame.');
    }
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
    if (view.getUint8(0) !== FRAME_VERSION) {
      throw new Error('Manual transport received an unsupported frame version.');
    }
    const messageId = view.getUint32(1);
    const index = view.getUint16(5);
    const count = view.getUint16(7);
    if (count < 1 || index >= count) {
      throw new Error('Manual transport received invalid chunk metadata.');
    }
    let pending = this.#pending.get(messageId);
    if (pending === undefined) {
      if (this.#pending.size >= 128) {
        throw new Error('Manual transport has too many incomplete messages.');
      }
      pending = {
        chunks: Array.from({ length: count }),
        createdAt: now,
        received: 0,
      };
    }
    if (pending.chunks.length !== count) {
      throw new Error('Manual transport chunk count changed mid-message.');
    }
    if (pending.chunks[index] === undefined) {
      pending.chunks[index] = frame.slice(FRAME_HEADER_BYTES);
      pending.received += 1;
    }
    this.#pending.set(messageId, pending);
    if (pending.received !== count) return;
    this.#pending.delete(messageId);
    const length = pending.chunks.reduce(
      (sum, chunk) => sum + (chunk?.byteLength ?? 0),
      0,
    );
    const update = new Uint8Array(length);
    let offset = 0;
    for (const chunk of pending.chunks) {
      if (chunk === undefined) throw new Error('Manual transport message is incomplete.');
      update.set(chunk, offset);
      offset += chunk.byteLength;
    }
    this.#events.emitUpdate(update);
  }

  #setStatus(state: TransportStatus['state'], message: string): void {
    this.#lastStatus = Object.freeze({ state, message });
    this.#events.emitStatus(this.#lastStatus);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Manual transport failed.';
}
