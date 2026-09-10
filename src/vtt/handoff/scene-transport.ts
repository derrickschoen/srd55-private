import type {
  HandoffResponse,
  ProtocolTransportFault,
  SceneSnapshotEvent,
} from './protocol-runtime';
import type { SceneSnapshot } from './v1/contracts';

export type SceneTransportStatus = 'connecting' | 'open' | 'closed' | 'disposed';

export class SceneTransportClosedError extends Error {
  readonly code = 'TRANSPORT_CLOSED';

  constructor(message = 'The scene transport is closed.') {
    super(message);
    this.name = 'SceneTransportClosedError';
  }
}

export class SceneTransportFaultError extends Error {
  readonly code: ProtocolTransportFault['code'];
  readonly websocketCloseCode: ProtocolTransportFault['websocketCloseCode'];

  constructor(readonly fault: ProtocolTransportFault) {
    super(fault.message);
    this.name = 'SceneTransportFaultError';
    this.code = fault.code;
    this.websocketCloseCode = fault.websocketCloseCode;
  }
}

export interface SceneTransport {
  request(request: unknown): Promise<HandoffResponse>;
  initialSnapshot(): Promise<SceneSnapshot>;
  subscribe(listener: (event: SceneSnapshotEvent) => void): () => void;
  status(): SceneTransportStatus;
  subscribeStatus(listener: (status: SceneTransportStatus) => void): () => void;
  subscribeErrors(listener: (error: SceneTransportFaultError) => void): () => void;
  close(): void;
  dispose(): void;
}
