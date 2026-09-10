# Pending-request baseline verification

## Scope and provenance

This fixture was captured from detached revision `0f84e09f822ff614eec944aaf48f61e13475f22d` without modifying a tracked file. The capture uses `EncounterSessionJournal`, `TurnCoordinator`, `MemoryBrowserSessionStore`, and the existing `playerProfile`, `monsterProfile`, and `placedToken` test helpers. Those helpers mint the stable combatant/token IDs and accept the initiative inputs used here (`tests/unit/combat/fixtures.ts:13-53`, `tests/unit/combat/fixtures.ts:132-153`).

The reconstruction inputs are embedded in the fixture: seed `9182`; fixed clock `2026-09-10T12:00:00.000Z`; a 6-by-2 board; the player at `(0,0)` with initiative bonus `20`; the monster at `(5,0)` with initiative bonus `-20`; and the two persisted controller identities. The coordinator and journal do not consume a clock on this path, so the fixed clock controls the evidence envelope's `capturedAt` value and deterministic log. The seed controls the real journal RNG used for initiative; the captured rolls are player `5 + 20 = 25` and monster `19 - 20 = -1`.

## The genuinely pending human request

`combatant:baseline-human-player` is waiting. After initiative, it is the active combatant at encounter revision `1`. `TurnCoordinator.step()` caches a `turn` continuation for the active living combatant and its legal actions before entering the controller decision (`src/combat/coordinator.ts:804-837`). `#continueTurn` waits for `#decision` while no pending command exists (`src/combat/coordinator.ts:725-733`).

This is a real unresolved `HumanController` wait, not a fabricated request object. `HumanController.choose` installs the request in its private pending slot and returns a Promise that resolves only through `submit` (or rejects on abort) (`src/combat/controllers.ts:77-121`). The host uses the same boundary: it begins a coordinator step, yields one microtask, inspects the coordinator's pending request, flushes non-algorithm requests, publishes, and only then awaits the unfinished step (`src/vtt/dm-encounter-host.ts:518-540`).

The request is:

- kind: `turn`
- request ID: `turn:1:combatant:baseline-human-player:1`
- encounter revision: `1`
- actor: `combatant:baseline-human-player`
- offered legal actions (the request's options at this revision): exactly one, `{ "type": "end_turn", "actor": "combatant:baseline-human-player" }`
- visible state: the actual player projection stored in `pendingRequest.visibleState`, with audience `player` and two visible combatants

The request fields are the baseline `ControllerRequest` contract (`src/combat/controllers.ts:25-46`). The coordinator constructs the request from its current revision, player projection, and legal actions; assigns it to `pendingRequest`; and records `controller_request_issued` before awaiting `choose` (`src/combat/coordinator.ts:447-505`). The script proves that `HumanController.pendingRequest()` and the journal's canonical persisted `pendingRequest` are identical.

## Coordinator cursor, pause, command, and continuation

The complete persisted coordinator object is present verbatim as top-level `coordinatorState`, including all five fields defined at this revision (`src/combat/coordinator.ts:60-86`):

- `requestSequence: 2` — request sequence `1` was consumed when the ID above was minted.
- `pendingRequest` — the full turn request, including `visibleState` and `legalActions`.
- `pendingCommand: null` — the human has not responded.
- `continuation` — `{ kind: "turn", actor: "combatant:baseline-human-player", legalActions: ... }`, the cached turn that resumes after a response.
- `pause: null` — the coordinator is running and blocked only on the human decision, not interrupted or adjudicated.

The canonical hashes are:

- pending request: `9a4ff6c01381bf5b6477fa2d0fe2821063b65280debbca667ba47df5e223d234`
- coordinator state: `d178740deb59675eba7192df8af220b359432ca1da609da83fd017e37d3d6c31`

## Store revision and checksum

The pending request is store revision index `3`: revision 1 is `session_started`, revision 2 is the initiative reducer transition, and revision 3 is `controller_request_issued`. `MemoryBrowserSessionStore.append` requires contiguous indices and retains the actual revision objects per session; `revisions` returns that persisted stream (`src/vtt/session-persistence.ts:376-405`).

The fixture's `revisionChecksum` is `56c3c2b127f0b0b61a6fb056f6e420199989e0a4e009c1417b7173517af8f6aa`. This is the store's persisted revision checksum, not a checksum invented by the capture: the coordinator passes the encounter state, complete coordinator state, and controller identities into persistence (`src/combat/coordinator.ts:438-445`); the journal carries those values into `#append` (`src/vtt/session-persistence.ts:1964-1980`); and `#append` computes the checksum over the canonical complete revision body before appending that exact object to both store and mirror (`src/vtt/session-persistence.ts:2306-2339`). The checksum function is explicitly SHA-256 of canonical JSON (`src/vtt/session-persistence.ts:487-489`). The capture independently recomputes that body checksum before writing any evidence file.

## Byte reproduction

Run this exact command from the worktree root:

```sh
NODE_NO_WARNINGS=1 node --experimental-transform-types .tmp/baseline-capture/capture.ts | tee .tmp/baseline-capture/capture.log
```

Then verify the fixture from its directory:

```sh
(cd .tmp/baseline-capture && sha256sum -c pending-request-baseline.v1.sha256)
```

Two complete consecutive runs of the exact capture command produced identical fixture bytes:

```text
run 1  8e2e2f0e3d26fb7c43d350716c4aad881a10af98fed1a32b90039c9c8baea4e6
run 2  8e2e2f0e3d26fb7c43d350716c4aad881a10af98fed1a32b90039c9c8baea4e6
```

`sha256sum -c` reports `pending-request-baseline.v1.json: OK`. An independent Node SHA-256/canonical-key-order check also reproduced the fixture hash and both embedded subobject hashes. The canonical fixture is 8,006 bytes including its final newline.
