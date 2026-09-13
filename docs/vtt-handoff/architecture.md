# VTT handoff architecture

This handoff preserves the plan's six boundaries:

1. The rules/game-state core owns `EncounterState`, grid anchors, world mechanics, and reducer semantics (`src/combat/encounter.ts`, `src/combat/grid.ts`).
2. The renderer-neutral application/session service owns the host, persistence barrier, FIFO outcomes, lifecycle, and seat registry (`src/vtt/dm-encounter-host.ts`, `src/vtt/encounter-session-service.ts`, `src/vtt/session-lifecycle.ts`).
3. Protocol validation and per-seat projection produce the lossy v1 `SceneSnapshot` only after audience filtering (`src/vtt/handoff/v1/contracts.ts`, `src/vtt/encounter-projections.ts`, `src/vtt/handoff/scene-snapshot.ts`).
4. The browser-Worker runtime crosses a module Worker/`MessageChannel` boundary (`src/vtt/handoff/worker-transport.ts`, `worker-entry.ts`).
5. The Node/npm runtime provides an opt-in loopback WebSocket adapter (`tools/vtt-handoff/node-runtime.ts`, `src/vtt/handoff/websocket-transport.ts`).
6. The existing top-down UI remains an in-process browser adapter (`src/vtt/encounter-app.ts`).

There is one authoritative reducer path. It is pinned by `tests/unit/vtt/engine-boundary.test.ts`: runtime entries converge through the session service and host on the exact reducer edges in `src/vtt/session-encounter-reducer.ts`, `src/vtt/vane-warren.ts`, and `src/combat/encounter.ts`.

The classic `/vtt` route remains in-process. `src/vtt/encounter-app.ts` uses `RichEncounterSessionService` for typed application intents, revision-bound offered option IDs, lifecycle operations, and safe player projections. Browser-only handles, navigation, downloads, local storage, `BroadcastChannel`, and DOM work stay in that adapter. It does not inject a Worker or the wire protocol.

The smaller v1 surface is deliberately lossy. `src/vtt/handoff/protocol-runtime.ts` exposes only `session.open`, `scene.snapshot`, `token.move`, `door.set`, and `light.set`. It resolves a requested move back to a currently offered engine option; it does not accept paths, dice, DCs, damage, or reducer commands as authority. `SceneTransport` in `src/vtt/handoff/scene-transport.ts` gives renderers requests, an initial snapshot, snapshot/status/fault subscriptions, and terminal cleanup without exposing the session reducer.

There are three transport arrangements:

- `src/vtt/handoff/in-process-transport.ts` passes objects without serialization but still invokes the same v1 validation and dispatcher.
- `src/vtt/handoff/worker-transport.ts` and `worker-entry.ts` use a real module Worker and `MessageChannel`. `worker-memory-session-store.ts` is explicit page-lifetime memory with a no-op flush. A new Worker creates a new memory session, opens it, and emits a full snapshot. Closing the page loses the state. The production `/vtt-handoff` route in `worker-harness.ts` is synthetic verification data, not a secret or durable host. Worker trust is equivalent to trust in the page that owns it.
- `tools/vtt-handoff/node-runtime.ts` hosts the same dispatcher behind a loopback WebSocket. `src/vtt/handoff/websocket-transport.ts` is the browser-safe client. Each authenticated socket owns a session in the current implementation; reconnecting opens a new session and receives a new full snapshot.

The rich service has terminal outcomes `committed`, `refused`, `cancelled`, `closed`, and `failed` (`src/vtt/encounter-session-service.ts`). A committed receipt is established before observers. Projections and renderer identity bindings are detached at capture time. Player subscriptions use the registered seat and visibility projection; the DM semantic export never enters a player channel.

The contract bundle seal at `contracts/v1/READY.json` means only that the immutable schemas, declarations, and core fixtures form a complete atomic bundle. Overall integration readiness is separate and is reported as `READY` or `PARTIAL` under `reports/claude`.
