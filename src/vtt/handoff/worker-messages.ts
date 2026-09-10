import { z } from 'zod';
import { handoffEventSchema, handoffResponseSchema } from './v1/contracts';
import type { ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
import type { HandoffResponse } from './protocol-runtime';

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
}
