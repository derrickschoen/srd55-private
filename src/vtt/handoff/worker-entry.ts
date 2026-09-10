import { DmEncounterHost } from '../dm-encounter-host';
import { EncounterSessionService, type PlayerSeatRegistration, type SessionInvocationToken } from '../encounter-session-service';
import { encounterSeed } from '../session-seed';
import type { CombatantId } from '../../combat/values';
import type { EncounterState } from '../../combat/encounter';
import type { LegalActionSummary } from '../../combat/controllers';
import {
  buildTwoRoomEncounter, TWO_ROOM_ADVENTURER_ID, TWO_ROOM_SEED, twoRoomArtPackage,
} from './fixtures/two-room';
import { NamedWorkerMemorySessionStore } from './worker-memory-session-store';
import {
  decodeWorkerClientMessage, type WorkerConnectMessage, type WorkerServerMessage,
} from './worker-messages';
import { ProtocolRuntime } from './protocol-runtime';
import type { HandoffPrincipal } from './session-authorizer';
import { postWorkerMessage } from './worker-message-post';

function post(port: MessagePort, message: WorkerServerMessage): void {
  postWorkerMessage(port, message);
}

interface HeldWorkerEvent {
  readonly event: Parameters<Parameters<ProtocolRuntime['subscribe']>[0]>[0];
  readonly receiptInvocation?: number;
  readonly receiptRevision?: number;
}

function workerLegalActions(state: EncounterState, actor: CombatantId): LegalActionSummary {
  if (actor === TWO_ROOM_ADVENTURER_ID) return { actions: [{ type: 'end_turn', actor }] };
  const token = state.tokens.find((candidate) => candidate.combatantId === actor);
  if (token === undefined) return { actions: [{ type: 'end_turn', actor }] };
  const direction = token.position.column < 5 ? 1 : -1;
  return {
    actions: [
      { type: 'move', actor, path: [{ column: token.position.column + direction, row: token.position.row }], cause: 'voluntary' },
      { type: 'end_turn', actor },
    ],
  };
}

interface WorkerSession {
  readonly key: string;
  readonly service: EncounterSessionService;
  readonly seats: readonly PlayerSeatRegistration[];
  readonly bindings: Set<WorkerBinding>;
  startPromise: Promise<void> | null;
}

interface WorkerBinding {
  destroyFromSession(): void;
}

const workerSessions = new Map<string, WorkerSession>();
let anonymousSessionSequence = 0;

function createWorkerSession(key: string): WorkerSession {
  const baseState = buildTwoRoomEncounter();
  const state: EncounterState = {
    ...baseState,
    hiddenCombatants: [{
      combatant: TWO_ROOM_ADVENTURER_ID,
      stealthTotal: 99,
      edition: baseState.rulesEdition,
    }],
  };
  const store = new NamedWorkerMemorySessionStore(`vtt-handoff-worker-memory:${key}`);
  const host = new DmEncounterHost(`scene:vtt-handoff-worker:${key}`, store, {
    initialState: state,
    initialSeed: encounterSeed(TWO_ROOM_SEED),
    initialControllers: state.combatants.map((combatant, index) => ({
      combatantId: combatant.profile.id,
      controllerId: `${combatant.profile.id}:worker`,
      kind: index === 0 ? 'algorithm' as const : 'human' as const,
      generation: 0,
    })),
    playerIds: state.combatants.map((combatant) => combatant.profile.id),
    turnLegalActions: workerLegalActions,
  });
  const bindings = host.rendererTokenBindings();
  const seats: PlayerSeatRegistration[] = state.combatants.map((combatant) => ({
    playerId: String(combatant.profile.id),
    seatId: `seat:${String(combatant.profile.id)}`,
    observerCombatantId: combatant.profile.id,
    ownedCombatantIds: [combatant.profile.id],
    controlledTokenIds: bindings
      .filter((binding) => binding.combatantId === combatant.profile.id)
      .map((binding) => binding.tokenId),
  }));
  return {
    key, service: new EncounterSessionService(host, seats), seats,
    bindings: new Set(), startPromise: null,
  };
}

function workerSession(key: string): WorkerSession {
  const existing = workerSessions.get(key);
  if (existing !== undefined) return existing;
  const created = createWorkerSession(key);
  workerSessions.set(key, created);
  return created;
}

function startWorkerSession(session: WorkerSession): Promise<void> {
  session.startPromise ??= new Promise<void>((resolve, reject) => {
    let unsubscribe = (): void => undefined;
    unsubscribe = session.service.subscribeDm((event) => {
      if (event.kind !== 'offer') return;
      unsubscribe();
      resolve();
    });
    void session.service.start().catch((error: unknown) => {
      unsubscribe();
      reject(error);
    });
  });
  return session.startPromise;
}

export interface AttachHandoffWorkerOptions {
  readonly startAutonomous?: boolean;
  readonly sessionKey?: string;
  readonly principal?: HandoffPrincipal;
  readonly responseBarrier?: () => Promise<void>;
}

export function attachHandoffWorkerPort(
  port: MessagePort,
  options: AttachHandoffWorkerOptions = {},
): () => void {
  const sessionKey = options.sessionKey ?? `anonymous:${String(++anonymousSessionSequence)}`;
  const session = workerSession(sessionKey);
  const runtime = new ProtocolRuntime({
    service: session.service,
    principal: options.principal ?? { role: 'dm' },
    seats: session.seats,
    art: twoRoomArtPackage(),
  });
  const invocations = new Map<SessionInvocationToken, number>();
  const seenInvocations = new Set<number>();
  let heldEvents: { readonly token: SessionInvocationToken; readonly events: HeldWorkerEvent[] } | null = null;
  let detached = false;
  const unsubscribeEvent = runtime.subscribe((event, receipt) => {
    const receiptInvocation = receipt === undefined ? undefined : invocations.get(receipt.invocationToken);
    const held: HeldWorkerEvent = {
      event,
      ...(receiptInvocation === undefined || receipt === undefined
        ? {}
        : { receiptInvocation, receiptRevision: receipt.revision }),
    };
    if (heldEvents !== null) {
      heldEvents.events.push(held);
      return;
    }
    if (receipt !== undefined && receiptInvocation !== undefined) {
      heldEvents = { token: receipt.invocationToken, events: [held] };
      return;
    }
    post(port, { kind: 'event', event });
  });
  const unsubscribeFault = runtime.subscribeFaults((fault) => post(port, { kind: 'fault', fault }));
  const onMessage = (messageEvent: MessageEvent<unknown>): void => {
    const message = decodeWorkerClientMessage(messageEvent.data);
    if (message === null) {
      post(port, {
        kind: 'fault',
        fault: {
          kind: 'transport_fault', code: 'PROTOCOL_ERROR',
          message: 'Worker message envelope is invalid.', websocketCloseCode: 1002,
        },
      });
      return;
    }
    if (message.kind === 'request') {
      if (seenInvocations.has(message.invocation)) {
        post(port, {
          kind: 'fault',
          fault: {
            kind: 'transport_fault', code: 'PROTOCOL_ERROR',
            message: 'Worker request invocation was already consumed.', websocketCloseCode: 1002,
          },
        });
        return;
      }
      seenInvocations.add(message.invocation);
      const token = runtime.createInvocationToken();
      invocations.set(token, message.invocation);
      void runtime.dispatch(message.request, undefined, token).then(async (result) => {
        invocations.delete(token);
        if (heldEvents?.token === token) {
          const events = heldEvents.events;
          heldEvents = null;
          for (const held of events) {
            post(port, {
              kind: 'event', event: held.event,
              ...(held.receiptInvocation === undefined || held.receiptRevision === undefined || result.kind !== 'response'
                ? {}
                : {
                    receiptInvocation: held.receiptInvocation,
                    receiptRevision: held.receiptRevision,
                    receiptId: result.response.id,
                  }),
            });
          }
        }
        await options.responseBarrier?.();
        if (result.kind === 'transport_fault') {
          post(port, { kind: 'request-fault', invocation: message.invocation, fault: result.fault });
          return;
        }
        if (options.startAutonomous !== false && result.response.ok && result.response.id !== undefined) {
          const request = message.request;
          if (typeof request === 'object' && request !== null && Reflect.get(request, 'method') === 'session.open') {
            await startWorkerSession(session);
          }
        }
        post(port, { kind: 'response', invocation: message.invocation, response: result.response });
      }).catch(() => {
        invocations.delete(token);
        post(port, {
          kind: 'request-fault', invocation: message.invocation,
          fault: { kind: 'transport_fault', code: 'PROTOCOL_ERROR', message: 'Worker dispatch failed.', websocketCloseCode: 1002 },
        });
      });
      return;
    }
    release(message.kind, true);
  };
  const release = (
    kind: 'close' | 'dispose' | 'destroy' | 'session-destroyed',
    notifyPeer: boolean,
  ): void => {
    if (detached) return;
    detached = true;
    let cleanupFailed = false;
    try {
      if (kind === 'close') runtime.close();
      else if (kind === 'dispose' || kind === 'session-destroyed') runtime.dispose();
      else runtime.destroySession();
    } catch {
      cleanupFailed = true;
    } finally {
      port.removeEventListener('message', onMessage);
      unsubscribeEvent();
      unsubscribeFault();
      invocations.clear();
      seenInvocations.clear();
      heldEvents = null;
      session.bindings.delete(binding);
      if (kind === 'destroy') {
        if (workerSessions.get(session.key) === session) workerSessions.delete(session.key);
        for (const attached of [...session.bindings]) attached.destroyFromSession();
      } else if (session.bindings.size === 0 && kind !== 'session-destroyed') {
        if (workerSessions.get(session.key) === session) workerSessions.delete(session.key);
        try { runtime.destroySession(); } catch { cleanupFailed = true; }
      }
      if (notifyPeer) {
        if (cleanupFailed) {
          post(port, {
            kind: 'fault',
            fault: {
              kind: 'transport_fault', code: 'PROTOCOL_ERROR',
              message: 'Worker session cleanup failed.', websocketCloseCode: 1002,
            },
          });
        }
        post(port, { kind: 'closed' });
      }
      port.close();
    }
  };
  const binding: WorkerBinding = {
    destroyFromSession: () => release('session-destroyed', true),
  };
  session.bindings.add(binding);
  port.addEventListener('message', onMessage);
  port.start();
  return () => release('dispose', false);
}

interface WorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerConnectMessage>) => void): void;
}

const scope = globalThis as unknown as Partial<WorkerScope>;
scope.addEventListener?.('message', (event) => {
  const data: unknown = event.data;
  if (
    typeof data === 'object' && data !== null &&
    Reflect.get(data, 'kind') === 'vtt-handoff.connect' &&
    Reflect.get(data, 'port') instanceof MessagePort &&
    typeof Reflect.get(data, 'sessionKey') === 'string' &&
    typeof Reflect.get(data, 'principal') === 'object' && Reflect.get(data, 'principal') !== null
  ) attachHandoffWorkerPort(Reflect.get(data, 'port') as MessagePort, {
    sessionKey: Reflect.get(data, 'sessionKey') as string,
    principal: Reflect.get(data, 'principal') as HandoffPrincipal,
  });
});
