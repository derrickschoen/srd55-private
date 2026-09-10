import { z } from 'zod';
import { handoffEventSchema, handoffResponseSchema } from './v1/contracts';
import type { ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
import type { HandoffResponse } from './protocol-runtime';
import type { HandoffPrincipal } from './session-authorizer';

const invocationSchema = z.number().int().safe().positive();
const transportFaultSchema = z.strictObject({
  kind: z.literal('transport_fault'),
  code: z.enum(['INVALID_UTF8', 'INVALID_JSON', 'PROTOCOL_ERROR']),
  message: z.string(),
  websocketCloseCode: z.union([z.literal(1002), z.literal(1007)]),
});

export const workerClientMessageSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('request'), invocation: invocationSchema, request: z.unknown() }),
  z.strictObject({ kind: z.literal('close') }),
  z.strictObject({ kind: z.literal('dispose') }),
  z.strictObject({ kind: z.literal('destroy') }),
]);

export const workerServerMessageSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('response'), invocation: invocationSchema, response: handoffResponseSchema }),
  z.strictObject({ kind: z.literal('request-fault'), invocation: invocationSchema, fault: transportFaultSchema }),
  z.strictObject({
    kind: z.literal('event'), event: handoffEventSchema,
    receiptInvocation: invocationSchema.optional(), receiptRevision: z.number().int().safe().optional(),
  }),
  z.strictObject({ kind: z.literal('fault'), fault: transportFaultSchema }),
  z.strictObject({ kind: z.literal('closed') }),
]);

export function decodeWorkerClientMessage(input: unknown): WorkerClientMessage | null {
  // Zod is pinned at 4.4.3; recheck this no-error-materialization path on every Zod upgrade.
  const decoded = workerClientMessageSchema._zod.run({ value: input, issues: [] }, { async: false });
  if (decoded instanceof Promise) throw new TypeError('Worker client messages must validate synchronously.');
  return decoded.issues.length === 0 ? decoded.value as WorkerClientMessage : null;
}

export function decodeWorkerServerMessage(input: unknown): WorkerServerMessage | null {
  const decoded = workerServerMessageSchema._zod.run({ value: input, issues: [] }, { async: false });
  if (decoded instanceof Promise) throw new TypeError('Worker server messages must validate synchronously.');
  return decoded.issues.length === 0 ? decoded.value as WorkerServerMessage : null;
}

export type WorkerClientMessage =
  | { readonly kind: 'request'; readonly invocation: number; readonly request: unknown }
  | { readonly kind: 'close' }
  | { readonly kind: 'dispose' }
  | { readonly kind: 'destroy' };

export type WorkerServerMessage =
  | { readonly kind: 'response'; readonly invocation: number; readonly response: HandoffResponse }
  | { readonly kind: 'request-fault'; readonly invocation: number; readonly fault: ProtocolTransportFault }
  | { readonly kind: 'event'; readonly event: SceneSnapshotEvent; readonly receiptInvocation?: number; readonly receiptRevision?: number }
  | { readonly kind: 'fault'; readonly fault: ProtocolTransportFault }
  | { readonly kind: 'closed' };

export interface WorkerConnectMessage {
  readonly kind: 'vtt-handoff.connect';
  readonly port: MessagePort;
  readonly sessionKey: string;
  readonly principal: HandoffPrincipal;
}

// Compile every pinned Zod 4.4.3 message branch before adapter measurements begin.
const warmSnapshot = {
  sceneId: 'warm', revision: 0,
  grid: { width: 1, height: 1, feetPerCell: 5 },
  tiles: [{ id: 'tile', assetId: 'asset', x: 0, y: 0, z: 0 }],
  props: [{ id: 'prop', assetId: 'asset', x: 0, y: 0, z: 0 }],
  tokens: [{
    id: 'token', label: 'Token', assetId: 'asset', x: 0, y: 0, z: 0,
    facing: 0, footprint: { w: 1, h: 1 },
  }],
  walls: [{
    id: 'wall', a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, baseZ: 0, height: 1,
    blocksMovement: true, blocksVision: true, assetId: 'asset',
  }],
  doors: [{ id: 'door', wallId: 'wall', open: false, assetId: 'asset' }],
  lights: [{
    id: 'light', x: 0, y: 0, z: 0, radius: 1,
    color: '#ffffff', intensity: 1, enabled: true,
  }],
  vision: { mode: 'cells' as const, visible: [[0, 0]], explored: [[0, 0]] },
};
for (const message of [
  { kind: 'request', invocation: 1, request: null },
  { kind: 'close' }, { kind: 'dispose' }, { kind: 'destroy' },
] as const) decodeWorkerClientMessage(message);
for (const message of [
  { kind: 'response', invocation: 1, response: { v: 1, id: 'warm', ok: true, result: {} } },
  { kind: 'response', invocation: 1, response: { v: 1, id: 'warm', ok: false, error: { code: 'WARM', message: 'warm' } } },
  {
    kind: 'request-fault', invocation: 1,
    fault: { kind: 'transport_fault', code: 'PROTOCOL_ERROR', message: 'warm', websocketCloseCode: 1002 },
  },
  {
    kind: 'fault',
    fault: { kind: 'transport_fault', code: 'INVALID_JSON', message: 'warm', websocketCloseCode: 1007 },
  },
  { kind: 'event', event: { v: 1, event: 'scene.snapshot', seq: 1, data: warmSnapshot } },
  { kind: 'closed' },
] as const) decodeWorkerServerMessage(message);
