# Runtime API

## Rich in-process service

`EncounterSessionService` and `RichEncounterSessionService` in `src/vtt/encounter-session-service.ts` are the application-facing authority boundary. They own FIFO submission, revision-bound offered option catalogs, player-seat authorization, terminal settlement, durability-aware top-down mutations, and detached DM/player captures. The classic browser UI calls typed methods such as `submitTopDownOfferedAction`, `submitTopDownPlacement`, `submitTopDownWorldObject`, and `applyTopDownAdjudication`; command construction remains inside the service.

Mutation results are terminal: `committed` includes the applied revision and durable event, `refused` explains why no accepted mutation ran, `cancelled` means an accepted queued mutation was cancelled before apply, `closed` means the logical session is terminal, and `failed` distinguishes pre-apply from post-apply recovery. Callers display the outcome and do not retry automatically. `src/vtt/session-lifecycle.ts` provides the browser lifecycle boundary.

## Renderer-facing transport

`SceneTransport` in `src/vtt/handoff/scene-transport.ts` has:

- `request(request)` for a v1 request envelope;
- `initialSnapshot()` for the first full `SceneSnapshot`;
- `subscribe`, `status`, `subscribeStatus`, and `subscribeErrors`;
- `close()` to detach a connection, `dispose()` for terminal local cleanup, and `destroySession()` for explicit authoritative destruction.

The in-process, Worker, and WebSocket implementations share that shape. Pending requests are correlated, observer exceptions are isolated, and terminal cleanup does not retry a mutation whose outcome is unknown. The object-only zero-serialization guarantee applies only to `InProcessSceneTransport`; Worker structured clone and WebSocket JSON are transport boundaries.

## Worker runtime

`createHandoffWorkerTransport` creates one module Worker connection. `createHandoffWorkerHost` can bind DM and player ports to a shared logical session key inside one Worker. Principals are supplied by the host-side connection, not by `session.open.requestedRole`; a mismatch is `UNAUTHORIZED`. The named memory store in `src/vtt/handoff/worker-memory-session-store.ts` is not persisted. A reload or new Worker must perform `session.open` and consume its initial full snapshot again.

The `/vtt-handoff` harness in `src/vtt/handoff/worker-harness.ts` exercises a synthetic two-room session. It is a development/dist proof, separate from `/vtt`, and it is not a deployment control.

## Node loopback runtime

`tools/vtt-handoff/node-runtime-main.ts` requires `VTT_RUNTIME_TOKENS_FILE`, one or more exact origins unless originless clients are explicitly enabled, and a port other than 4173. `tools/vtt-handoff/node-runtime.ts` binds `127.0.0.1` and exposes `/vtt/v1`. The browser uses `WebSocketSceneTransport` from `src/vtt/handoff/websocket-transport.ts`.

The token claim determines the runtime principal. `requestedRole` is an authorization assertion to check, not authentication. Socket reconnect does not resume an old authoritative session in this implementation: create a transport, send `session.open`, accept the returned session ID, and replace renderer state with the new full snapshot. Do not retry an unresolved mutation across reconnect.
