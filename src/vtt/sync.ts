import * as Y from 'yjs';
import {
  fogCells,
  listDiceRolls,
  listTokens,
  readRoomMetadata,
  serializeBoardDocument,
} from './model';
import type { VttTransport } from './transports/transport';

const REMOTE_TRANSPORT_ORIGIN = Object.freeze({ kind: 'vtt-remote-update' });

export interface SyncBinding {
  close(): void;
}

export interface SyncErrorHandlers {
  readonly onFatal: (message: string) => void;
  readonly onTransient: (message: string | null) => void;
}

export function bindDocumentToTransport(
  doc: Y.Doc,
  transport: VttTransport,
  errors: SyncErrorHandlers,
): SyncBinding {
  let compatible = true;
  const send = (update: Uint8Array): void => {
    if (!compatible) return;
    void transport
      .send(update)
      .then(() => errors.onTransient(null))
      .catch((error: unknown) => {
        errors.onTransient(
          error instanceof Error ? error.message : 'VTT update send failed.',
        );
      });
  };
  const onDocumentUpdate = (update: Uint8Array, origin: unknown): void => {
    if (origin !== REMOTE_TRANSPORT_ORIGIN) send(update);
  };
  doc.on('update', onDocumentUpdate);
  const stopUpdates = transport.onUpdate((update) => {
    if (!compatible) return;
    try {
      // Validate against a clone before the live document or its render
      // observers can see an incompatible update.
      const candidate = new Y.Doc();
      try {
        Y.applyUpdate(candidate, Y.encodeStateAsUpdate(doc));
        Y.applyUpdate(candidate, update);
        readRoomMetadata(candidate);
        listTokens(candidate);
        fogCells(candidate);
        listDiceRolls(candidate);
      } finally {
        candidate.destroy();
      }
      Y.applyUpdate(doc, update, REMOTE_TRANSPORT_ORIGIN);
    } catch (error) {
      compatible = false;
      errors.onFatal(
        error instanceof Error ? error.message : 'Incompatible VTT document.',
      );
    }
  });
  const stopConnections = transport.onPeerConnected(() => {
    send(serializeBoardDocument(doc));
  });
  return Object.freeze({
    close: () => {
      doc.off('update', onDocumentUpdate);
      stopUpdates();
      stopConnections();
    },
  });
}
