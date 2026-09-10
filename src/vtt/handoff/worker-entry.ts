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
  workerClientMessageSchema, type WorkerConnectMessage, type WorkerServerMessage,
} from './worker-messages';
import { ProtocolRuntime } from './protocol-runtime';

function post(port: MessagePort, message: WorkerServerMessage): void {
  port.postMessage(message);
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

export function attachHandoffWorkerPort(
  port: MessagePort,
  options: { readonly startAutonomous?: boolean } = {},
): () => void {
  const state = buildTwoRoomEncounter();
  const store = new NamedWorkerMemorySessionStore('vtt-handoff-worker-memory');
  const host = new DmEncounterHost('scene:vtt-handoff-worker', store, {
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
  const service = new EncounterSessionService(host, seats);
  const runtime = new ProtocolRuntime({ service, principal: { role: 'dm' }, seats, art: twoRoomArtPackage() });
  const invocations = new Map<SessionInvocationToken, number>();
  let started = false;
  const unsubscribeEvent = runtime.subscribe((event, receipt) => {
    const receiptInvocation = receipt === undefined ? undefined : invocations.get(receipt.invocationToken);
    post(port, {
      kind: 'event',
      event,
      ...(receiptInvocation === undefined || receipt === undefined
        ? {}
        : { receiptInvocation, receiptRevision: receipt.revision }),
    });
  });
  const unsubscribeFault = runtime.subscribeFaults((fault) => post(port, { kind: 'fault', fault }));
  const onMessage = (messageEvent: MessageEvent<unknown>): void => {
    const decoded = workerClientMessageSchema.safeParse(messageEvent.data);
    if (!decoded.success) {
      post(port, {
        kind: 'fault',
        fault: {
          kind: 'transport_fault', code: 'PROTOCOL_ERROR',
          message: 'Worker message envelope is invalid.', websocketCloseCode: 1002,
        },
      });
      return;
    }
    const message = decoded.data;
    if (message.kind === 'request') {
      const token = runtime.createInvocationToken();
      invocations.set(token, message.invocation);
      void runtime.dispatch(message.request, undefined, token).then(async (result) => {
        invocations.delete(token);
        if (result.kind === 'transport_fault') {
          post(port, { kind: 'request-fault', invocation: message.invocation, fault: result.fault });
          return;
        }
        if (options.startAutonomous !== false && !started && result.response.ok && result.response.id !== undefined) {
          const request = message.request;
          if (typeof request === 'object' && request !== null && Reflect.get(request, 'method') === 'session.open') {
            started = true;
            await new Promise<void>((resolve, reject) => {
              let unsubscribe = (): void => undefined;
              unsubscribe = service.subscribeDm((event) => {
                if (event.kind !== 'offer') return;
                unsubscribe();
                resolve();
              });
              void service.start().catch((error: unknown) => {
                unsubscribe();
                reject(error);
              });
            });
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
    try {
      if (message.kind === 'close') runtime.close();
      else if (message.kind === 'dispose') runtime.dispose();
      else runtime.destroySession();
    } catch {
      post(port, {
        kind: 'fault',
        fault: {
          kind: 'transport_fault', code: 'PROTOCOL_ERROR',
          message: 'Worker session cleanup failed.', websocketCloseCode: 1002,
        },
      });
    } finally {
      unsubscribeEvent();
      unsubscribeFault();
      invocations.clear();
      post(port, { kind: 'closed' });
      port.close();
    }
  };
  port.addEventListener('message', onMessage);
  port.start();
  return () => {
    port.removeEventListener('message', onMessage);
    unsubscribeEvent();
    unsubscribeFault();
    try {
      runtime.destroySession();
    } finally {
      invocations.clear();
      port.close();
    }
  };
}

interface WorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerConnectMessage>) => void): void;
}

const scope = globalThis as unknown as Partial<WorkerScope>;
scope.addEventListener?.('message', (event) => {
  const data: unknown = event.data;
  if (
    typeof data === 'object' && data !== null &&
    Reflect.get(data, 'kind') === 'vtt-handoff.connect' && Reflect.get(data, 'port') instanceof MessagePort
  ) attachHandoffWorkerPort(Reflect.get(data, 'port') as MessagePort);
});
