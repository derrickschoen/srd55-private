# VTT-HANDOFF-01 implementation plan — candidate r2

Date: 2026-09-09  
Implementation worktree: `/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff`  
Branch/revision inspected: `claude/vtt-handoff` at `0f84e09f822ff614eec944aaf48f61e13475f22d`  
Owner-designated checkout: `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static`  
Bootstrap wire protocol: immutable v1

## Scope, precedence, baseline, and stopping point

This plan implements the backend/preparation half of the owner directive. The TypeScript encounter engine remains authoritative, the existing top-down VTT remains functional, and the Godot proof of concept remains a disconnected Windows-owned mock during this unit. Nothing here builds Godot, edits `%USERPROFILE%\VTT-Godot-POC`, connects the mock to real games, invokes a model/reviewer, changes firewall policy, exposes a public listener, rewrites saved coordinates or IDs, or promotes staged art.

The directive's default handoff root belongs to the owner checkout, but implementation occurs in the named worktree. S0 centralizes that distinction: publication defaults to `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/vtt-handoff`, refuses any other repository top level, and permits this worktree only when the caller explicitly sets:

```sh
VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp/vtt-handoff
```

No other module may spell either checkout path or the Windows UNC view. The doctor derives and verifies `\\wsl.localhost\Ubuntu\home\vagrant\PhpstormProjects\dnd-multiclass-spells-static\.tmp\vtt-handoff` with `wslpath`. The exchange root is a cache; durable types, schemas, generators, fixtures, scripts, and documentation remain tracked.

The supervisor supplied this clean-worktree baseline after candidate r1: `tsc -b --force` exit 0; `sg scan` exit 0; the Vitest gate exit 0 with no failures (three known load flakes passed on the serial retry); and the Playwright gate exit 0 on port 4410. These are supervisor-run baseline results, not results from this planning dispatch. No test counts were supplied, so none are invented.

Dependency installation is a hard boundary. `node_modules` is currently a symlink to `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/node_modules`; no lane writes it. No lane runs `npm ci` or a materializing `npm install`. Manifest-only dependency changes use exact versions and `--package-lock-only`, then stop at the named prerequisite **SUPERVISOR MATERIALIZES NODE_MODULES**. Bootstrap checks `lstat` and `realpath`; when `node_modules` is a symlink or resolves outside the checkout it refuses installation and a test proves an injected installer is never invoked.

D594 overrides the original version-pin suggestion: do not add `.nvmrc` or `engines`. Doctor records actual Node/npm versions and only warns when the Node major differs from the declared `@types/node` major; version drift never fails doctor. Ajv 8.18.0 is currently only transitive (`package-lock.json:2296`, `package-lock.json:2755-2757`), so S0 makes it a direct exact dev dependency. D593 overrides the earlier HTTP+SSE ruling: Node transport is WebSocket; HTTP+SSE is recorded only under proposed extensions.

Directive coverage is explicit: owner section 1 is A/S0; section 2 is S1-S2c; section 3 is S3a-S3e/S8; section 4 is S4-S7c; section 5 is S9a-S9d; section 6 is package aliases, S8 smoke, S10, and F. `docs/vtt-handoff/**` is expressly authorized by the supervisor for S10a, not gated on later permission. Every increment below is independently reversible and has a targeted gate.

## A. Touched-system anatomy

### 1. Rules/game-state core

- `EncounterState` is authoritative and contains revision, bounds, blocked cells, world objects, environment, fog, combatants, tokens, event history, hidden combatants, and observation history (`src/combat/encounter.ts:750-793`). `createEncounter` validates construction (`src/combat/encounter.ts:1142-1281`); `reduceEncounter` advances revision before processing a command (`src/combat/encounter.ts:12930-12953`).
- Coordinates are renderer-neutral `GridCell {column,row}` and `GridBounds {columns,rows}` (`src/combat/grid.ts:3-11`); cells/bounds are safe integers (`src/combat/grid.ts:21-37`) and grid distance is in five-foot steps (`src/combat/grid.ts:71-85`). Saved anchors must not change.
- `CombatToken` retains distinct token/combatant IDs, anchor, and placement mode (`src/combat/combatant.ts:102-127`). Footprints extend east/south from that anchor: Medium 1×1, Large 2×2, Huge 3×3, Gargantuan 4×4 (`src/combat/creature-space.ts:396-447`). `creatureSpace` uses the placement mode's controlled size, so squeeze can reduce the occupied footprint (`src/combat/creature-space.ts:451-470`).
- World objects have seven mechanical kinds, absolute footprint cells, and independent movement/line-of-sight/cover fields (`src/combat/world-objects.ts:9-20`, `src/combat/world-objects.ts:49-68`; `src/combat/terrain.ts:15-20`). Environment light regions store cells and `bright|dim|darkness`, not point photometry/enabled (`src/combat/world-objects.ts:70-93`). The operation union can modify objects and set region light level, but cannot toggle a light source (`src/combat/world-objects.ts:115-159`).
- F18 correction: the persisted VTT entry is `reduceSessionEncounter`, which delegates to `reduceVaneWarrenEncounter` (`src/vtt/session-encounter-reducer.ts:1-14`). The host injects `reduceSessionEncounter` into `TurnCoordinator` (`src/vtt/dm-encounter-host.ts:385-394`), and replay uses the persisted-command path (`src/vtt/session-persistence.ts:1515-1534`). The pacing-only session reconstruction directly invokes the lower reducer legitimately (`src/vtt/session-persistence.ts:1090-1127`); boundary tests allow that exact edge.
- Retain rather than duplicate existing coverage: movement projection (`tests/unit/vtt/encounter-board-projection.test.ts:374-419`), crash recovery (`tests/unit/vtt/session-persistence.test.ts:579-624`), hidden removal/last-seen (`tests/unit/combat/visibility.test.ts:193-216`), blocking/LOS/cover (`tests/unit/combat/world-objects.test.ts:150-217`), live/replay equality (`tests/integration/vtt/dm-encounter-host-live-path.test.ts:130-156`), and bundled dungeon behavior (`tests/integration/vtt/d365-dungeon.test.ts:113-124`, `tests/integration/vtt/d365-dungeon.test.ts:195-237`). Add characterization only for new seams: offered-destination matching, center/anchor round trips including squeeze, door journal/replay, durable mutation ordering, and visible-to-hidden subscription removal.

### 2. Renderer-neutral application/session service

- `DmEncounterHost` is the service nucleus. It owns the store, journal, controller registry, coordinator, RNG, listeners, bridge, and player IDs (`src/vtt/dm-encounter-host.ts:220-281`); restores integration state (`src/vtt/dm-encounter-host.ts:361-383`); constructs the coordinator (`src/vtt/dm-encounter-host.ts:385-394`); and exposes initial/update subscriptions (`src/vtt/dm-encounter-host.ts:421-465`). Its module does not import DOM, canvas, IndexedDB, or Node filesystem APIs.
- The port is misleadingly named `BrowserSessionStore`, although its interface is synchronous append/read and has memory/SQLite implementations (`src/vtt/session-persistence.ts:299-307`, `src/vtt/session-persistence.ts:376-455`). The real browser adapter documents `flush()` as its acknowledgment boundary and directly calls `new Date()` for save metadata (`src/vtt/local-session-store.ts:239-315`). S3a renames the port, makes durability explicit, and injects a clock.
- Journal append stores canonical state, RNG, coordinator, controllers, and checksum (`src/vtt/session-persistence.ts:2306-2339`). Today `submitHumanDecision` only submits to the controller (`src/vtt/dm-encounter-host.ts:751-755`); the asynchronous pump applies, flushes, and publishes later (`src/vtt/dm-encounter-host.ts:518-580`). Protocol mutation acknowledgment therefore needs the explicit transaction boundary in S3c.
- Session lifecycle bypasses the host today. UI code directly renames/deletes (`src/vtt/encounter-app.ts:1613-1647`), exports/flushes (`src/vtt/encounter-app.ts:1648-1668`), restores/imports/conflict-checks (`src/vtt/encounter-app.ts:1679-1712`), and durably imports uploads (`src/vtt/encounter-app.ts:1718-1735`). S3b adds a lifecycle port while retaining browser handles and user gestures in the UI adapter.

### 3. Protocol/validation and per-seat projection

- No bootstrap v1 protocol or `SceneSnapshot` exists. Database RPC is a different numeric-ID contract (`src/rpc/protocol.ts:3-47`); its client only supplies lifecycle precedent for correlation and pending-call closure (`src/rpc/client.ts:49-123`).
- D359 requires player/DM projection types before transport and compile-time resistance to leaks (`.claude/decisions.md:4771-4781`). The classification marks tokens, world objects, blocked cells, hidden combatants, and observation history per-seat (`src/combat/visibility.ts:24-68`). `projectPlayerView` removes hidden/unseen geometry before constructing combatants and derives last-seen anchors from observation history (`src/combat/visibility.ts:548-659`).
- Two real gaps need projection changes. `PlayerVisiblePlacedCombatant` lacks token ID (`src/combat/visibility.ts:157-163`) although the projector has the token (`src/combat/visibility.ts:557-603`). `PlayerBoardProjection` carries neither token identity nor `PlayerView.cells` (`src/vtt/encounter-projections.ts:73-96`, `src/vtt/encounter-projections.ts:237-310`). S2a adds `tokenId` as an explicitly classified per-seat field after filtering and adds `visibleCells`.
- Current host output has one party-wide player view whose observer follows the active PC and whose owned set is the whole party (`src/vtt/dm-encounter-host.ts:421-435`). New renderer sessions instead resolve an external player ID through an authoritative registry to one immutable `PlayerSeatBinding`, with independent snapshot/subscription per seat.

### 4. Browser-Worker runtime

- Encounter execution is presently in the DOM/main thread: `DmEncounterView` directly creates `DmEncounterHost` (`src/vtt/encounter-app.ts:1385-1436`). There is no encounter-engine Worker.
- A production module Worker pattern does exist for SQLite: `new Worker(new URL('./db/worker.ts', import.meta.url), {type:'module'})` plus `postMessage` (`src/main.ts:176-195`). A separate capability Worker also exists (`src/pwa/browser-capability-worker-port.ts:64-66`). Vite Worker graphs have a separate plugin pipeline (`vite.config.ts:181-230`), and app TypeScript includes DOM/WebWorker libs (`tsconfig.app.json:2-19`). S6 uses that pattern and no `SharedArrayBuffer`.

### 5. Node/npm runtime

- `npm run serve` is plain Node (`package.json:8-18`). `tools/serve.mjs` prepares `dist`, accepts GET/HEAD, binds `127.0.0.1`, and defaults to forbidden-for-tests port 4173 (`tools/serve.mjs:1-7`, `tools/serve.mjs:28-68`, `tools/serve.mjs:135-181`). The renderer runtime must be opt-in and tests use port 0.
- The engine MCP runtime is Node/stdio and imports Node filesystem/readline (`src/vtt/mcp/entrypoint.ts:1-14`, `src/vtt/mcp/entrypoint.ts:67-147`). It is not the renderer contract and stays unchanged.
- A localhost `/dm/*` server exists outside the dev bridge: `tools/discord-launcher/codex-dm-bridge.mjs` serves `/dm/session`, `/dm/exchange`, `/dm/mirror` on loopback (`tools/discord-launcher/codex-dm-bridge.mjs:81-119`), matching the bridge client (`src/vtt/dm-bridge/client.ts:81-91`, `src/vtt/dm-bridge/client.ts:123-128`, `src/vtt/dm-bridge/client.ts:167-206`). It moves AI projections/journal mirrors, not authoritative renderer sessions; S7 does not overload it.
- `tools/discord-launcher/relay-server.mjs` is a small echo spike with a 64-KiB cutoff and incomplete frame decoder (`tools/discord-launcher/relay-server.mjs:1-60`). D593 explicitly forbids using it as the base. S7 uses exact-pinned `ws` server support and global browser/Node WebSocket clients.
- The Vite AI bridge is dev-only and boundary-tested (`tools/ai-bridge/plugin.ts:1-17`, `tests/unit/ai-bridge/build-boundary.test.ts:45-100`). The new WebSocket starts only under `--vtt-runtime`, authenticates before v1 messages, and validates Host/Origin.

### 6. Existing top-down UI adapter

- `/vtt` dynamically imports/mounts the encounter app (`src/main.ts:47-82`). Rendering is imperative DOM over pure board render models (`src/vtt/encounter-app.ts:672-855`). D505/D508 require alternate renderers to use the same state and be playable (`.claude/decisions.md:9888-9895`, `.claude/decisions.md:9912-9923`); D516 retains the current top-down grammar (`.claude/decisions.md:10142-10148`).
- `EncounterBoardProjectionShape` carries bounds, terrain, lights, combatants, and world objects (`src/vtt/encounter-board.ts:97-142`). Token rendering joins combatants to actual art IDs (`src/vtt/encounter-board.ts:782-843`); cell rendering creates deterministic row-major floor/wall/door/terrain layers (`src/vtt/encounter-board.ts:846-920`). Snapshot projection consumes these models.
- `encounter-app.ts` has no direct `createEncounter`, `reduceEncounter`, `reduceSessionEncounter`, or `reduceVaneWarrenEncounter` call. The complete direct rules-call inventory is `terrainProfile` at line 830, `previewAffectedCells` at 1146, and `terrainWallCells` at 1149 (`src/vtt/encounter-app.ts:28-30`, `src/vtt/encounter-app.ts:826-838`, `src/vtt/encounter-app.ts:1139-1158`). S8 moves the first behind a DM-board selector and the latter two to a pure player selector accepting only `PlayerBoardProjection`.
- Host mutations to wrap as typed intents are: player/DM decisions (`src/vtt/encounter-app.ts:1558-1596`), placement (`src/vtt/encounter-app.ts:2055-2071`), interrupt/resume/undo/skip (`src/vtt/encounter-app.ts:2195-2233`), delay/day/rest/room/session transitions (`src/vtt/encounter-app.ts:2260-2385`, `src/vtt/encounter-app.ts:2440-2547`), adjudication/decision resolution (`src/vtt/encounter-app.ts:2630-2713`), preferences (`src/vtt/encounter-app.ts:2740-2827`), and world-object/adjudication/controller changes (`src/vtt/encounter-app.ts:2883-2980`). Reads/subscription/close occur around construction, heartbeat, and close (`src/vtt/encounter-app.ts:1399-1488`, `src/vtt/encounter-app.ts:3055-3062`). The direct lifecycle/store calls are listed under boundary 2.

### Explicit MISSING-COMPONENTS

1. No v1 types, structural/semantic validators, draft-2020-12 schemas, examples, immutable bundle, checksum manifest, or READY publisher.
2. No real encounter Worker, Worker transport, common `SceneTransport`, production-reachable Worker mode, v1 Node WebSocket, or WebSocket `SceneTransport`.
3. No authoritative external-player registry or independent per-seat subscription.
4. No mutation transaction coupling coordinator consumption to durable store flush.
5. No handoff-root config/layout, doctor/bootstrap, direct Ajv, direct WebSocket server dependency, or Claude report. `.tmp/` is ignored (`.gitignore:1-32`).
6. No engine scene ID, elevation, facing, wall orientation, point-light photometry/enabled state, or persistent explored bitmap.
7. No destination-only move API. Engine move commands hold paths (`src/combat/events.ts:79-88`); offered-option projection retains exact engine-derived path/destination (`src/vtt/offered-option-paths.ts:123-180`).
8. No light toggle mechanic; `light.set` must return `UNSUPPORTED`.
9. No v1 art result validator/stager. Existing queue uses `<uuidv7>-<slug>.json` and flat `art/incoming` (`art/requests/README.md:3-18`).
10. No public Godot service or entitlement for browser `requestedRole` to grant a role. The Yjs/Trystero tabletop transport is separate and only exchanges updates/peer/status (`src/vtt/transports/transport.ts:1-26`).

## B. Coordinate and entity mapping to `SceneSnapshot`

Projection is pure and one-way. It never mutates state, journals, saves, imports, IDs, or anchors. Arrays sort by stable ID then geometry. Structural wire parsing accepts the owner's finite-number/plain-string domain; stronger engine feasibility is checked afterward.

| v1 field | Exact mapping | Loss/placeholder/refusal |
| --- | --- | --- |
| Coordinates | For top-left engine anchor `{column,row}` and projected occupied spans `{w,h}`, `x = column + (w−1)/2`, `y = row + (h−1)/2`, `z=0`. This follows east/south footprint expansion (`src/combat/creature-space.ts:396-447`). x east, y south, z up. | z=0 is synthetic. Pin Medium, Large, Huge, Gargantuan, and squeezed controlled footprints (`src/combat/creature-space.ts:451-470`). Saved anchors never change. |
| `sceneId` | `String(EncounterSessionService.sessionId)`, retaining the host's branded session key (`src/vtt/dm-encounter-host.ts:255-278`). | State has no room-scene ID; scene hierarchy is an extension. |
| `revision` | Exact projected `EncounterState.revision` (`src/combat/encounter.ts:750-768`; `src/combat/visibility.ts:273-290`). | Event seq stays separate. |
| `grid` | `{width:bounds.columns,height:bounds.rows,feetPerCell:5}` from projected bounds/five-foot grid (`src/combat/grid.ts:8-11`, `src/combat/grid.ts:71-85`). | Future incompatible grids return `UNSUPPORTED`. |
| `tiles` | Run `encounterBoardRenderModel` over the seat-safe projection; emit one `{id:"tile:<column>:<row>",assetId,x:column,y:row,z:0}` from each row-major cell's `role:"floor"` layer (`src/vtt/encounter-board.ts:899-920`). | Shade/fog are excluded. Stone variants map to `tile.stone.floor`. |
| `props` | For visible non-door/non-wall world objects, keep `String(object.id)`, anchor x/y/z=0, and use the `role:"terrain"` asset at its anchor from that same board model (`src/vtt/encounter-board.ts:865-925`). | Footprint/durability are lossy. Shared/missing terrain layer uses deterministic kind/name mapping or `prop.pillar` fallback, reported as fallback. |
| `tokens` | Real `CombatToken.id`, combatant name, board token art, center formula, rectangular min/max occupied-cell span `{w,h}`, facing 0 (`src/combat/combatant.ts:102-127`, `src/vtt/encounter-board.ts:814-843`). | Facing is synthetic. Player token ID is added only after filtering. Nonrectangular footprints refuse as the board already does (`src/vtt/encounter-board.ts:821-825`). |
| `walls` | First union `blockedCells` with cells from wall-terrain world objects and aggregate coincident blocking (`src/combat/terrain.ts:158-164`). Cell `(c,r)` contributes its four edges at `c±.5,r±.5`; an undirected edge shared by two adjacent union cells is cancelled, so only the union perimeter remains. `baseZ:0,height:1`. Plain blocked cells use movement/vision true; object edges copy `blocking.movement`/`lineOfSight`. | Cell solids become perimeter segments; thickness/cover tier are lost. Coincident sources in one cell use true-wins per boolean and deterministic source ordering. |
| `doors` | Each visible `kind:"door"` produces `id=object.id`, `wallId="wall:door:"+id`, `open=!object.blocking.movement`, logical door art. Companion wall is the north edge of `object.position` with the object's blocking. Current board likewise treats movement-blocking as closed (`src/vtt/encounter-board.ts:767-779`). | No orientation exists; north edge is documented placeholder. Multi-cell doors control that one segment. |
| `lights` | Light-region centroid, radius `max cell-center distance + .5`, bright→`#FFF2CC`/1, dim→`#FFD27F`/.5, darkness→`#000000`/0, enabled true. Visible light-source object uses anchor, z0, radius1, `#FFB347`, intensity1, enabled true (`src/combat/world-objects.ts:70-93`). | Photometry/enabled are synthetic; `light.set` remains `UNSUPPORTED`. |
| `vision` | DM: `mode:"all"` and visible/explored contain every cell. Player: `mode:"cells"`, visible from newly carried `PlayerView.cells`, explored = deduped visible plus `lastSeen[].cell`. Last seen comes from observation history (`src/combat/visibility.ts:609-648`). | Observation history is not persistent map exploration, so explored is incomplete. Full arrays replace old arrays and remove newly hidden tokens. |

### One asset-ID adapter

Only `src/vtt/handoff/asset-id-map.ts` translates current art IDs into the nine logical IDs. Role-aware rules map `art.map.floor.stone*.v1`→`tile.stone.floor`, `art.map.wall.stone*.v1`→`wall.stone`, `art.map.door.wood*.v1`→`door.wood`, crate/barrel→`prop.barrel`, table→`prop.table`, pillar→`prop.pillar`, light-source/torch→`prop.torch`, player token→`token.adventurer`, and goblin/other monster token→`token.goblin`. Existing IDs use a branded `art.<kind>...v<n>` form (`src/assets/ids.ts:1-16`), but v1 asset IDs stay strings.

Unknown fallbacks are floor→`tile.stone.floor`, wall→`wall.stone`, door→`door.wood`, other prop→`prop.pillar`, PC token→`token.adventurer`, monster→`token.goblin`. Return `{assetId,fallbackUsed,sourceAssetId}` so tests/reports expose fallback; never rewrite engine art. An isometric-only delivery retains current top-down starter/fallback art until a v1 `view:"top-down"` frame exists.

### `token.move` inverse

After parsing, find the seat-visible token and current projected `{w,h}`. Compute `column=to.x−(w−1)/2`, `row=to.y−(h−1)/2`; require safe integers and z=0 or return `INVALID_DESTINATION`. Examine only current revision-bound legal `move` commands for that token's owned combatant; require exactly one whose final path cell equals that anchor and whose resulting controlled footprint yields the requested center/footprint. Dispatch that existing command unchanged. Zero matches is `ILLEGAL_MOVE`; multiple is `AMBIGUOUS_MOVE`. Tests cover squeezed/non-squeezed round trips, fractional centers, out-of-bounds, stale revision, arbitrary destinations, and cross-seat ownership. The model never supplies coordinates, paths, dice, DCs, damage, or reducer commands.

## C–D. Dependent implementation steps

Each step names one reversible decision, exact resources, implementation, targeted gate, authoritative verification, docs/report impact, rollback, and assumptions. Generated JSON is excluded from hand-written-line budgets but never substitutes for an independent invariant.

Resource status is explicit here so every later `Resources` list can stay readable:

| Step | New | Modified |
| --- | --- | --- |
| S0a | `tests/unit/vtt/handoff-package-contract.test.ts` | `package.json`, `package-lock.json` |
| S0b | `tools/vtt-handoff/paths.ts`, `bootstrap.ts`, `doctor.ts`; `tests/unit/vtt/handoff-bootstrap.test.ts` | `package.json` |
| S1 | both `src/vtt/handoff/v1/*` files, both `contracts/vtt-handoff/v1/*` schema files, `tests/unit/vtt/handoff-contract.test.ts` | none |
| S2a | `src/vtt/handoff/asset-id-map.ts`, `scene-snapshot.ts`; `tests/unit/vtt/scene-snapshot.test.ts` | `src/combat/visibility.ts`, `src/vtt/encounter-projections.ts` |
| S2b | all five listed resources | none |
| S2c | example JSON, publisher, publish test | `package.json` |
| S3a | none | all six listed resources |
| S3b | `src/vtt/session-lifecycle.ts`, lifecycle test | local store, save manager, local-store test |
| S3c | service interface and both tests | host, encounter projections |
| S3d | door-intent test | coordinator, host, service, persistence test |
| S3e | selectors and selector test | encounter projections, boundary test |
| S4 | protocol runtime, authorizer, ledger, protocol test | boundary test |
| S5 | transport interface, in-process adapter/test | boundary test, `package.json` |
| S6a | Worker entry/transport/test | boundary test |
| S6b | Playwright config/spec | `src/main.ts`, encounter app, `package.json` |
| S7a | Node runtime factory/main/test | `tools/serve.mjs`, `package.json` |
| S7b | WebSocket transport/test | Node runtime factory, boundary test, `package.json` |
| S7c | conformance helper and two parity tests | handoff Playwright config, boundary test |
| S8 | top-down smoke spec | encounter app, service, lifecycle, boundary test |
| S9a | UUID/request tools and tests | `package.json` |
| S9b | PNG/art validators and tests | `package.json` |
| S9c | staging/safe-file tools and test | `package.json` |
| S9d | Windows probe and test | `package.json`, doctor |
| S10a | all five docs (expressly authorized) | none |
| S10b | report tool/test | publisher, `package.json` |

The final `package.json` aliases are exactly `bootstrap`, `doctor`, `test:engine`, `test:protocol`, `test:worker`, `test:runtime-node`, `handoff:publish`, `art:request`, `art:validate`, and `art:stage`, in addition to existing scripts. Each alias first becomes callable in the step that names it; S10b's handoff-report test requires the final set, while S0a's package-contract test covers only dependency/no-engine-pin policy.

### S0a — Declare validators/transports without materializing dependencies

**Decision.** Add exact direct `ajv@8.18.0` (dev), `ws@8.18.3` (runtime), and `@types/ws@8.18.1` (dev). `ws` is chosen over hand-rolling RFC 6455 because D593 requires fragmentation, ping/pong, close semantics, and size enforcement; the existing relay is explicitly an incomplete echo spike (`tools/discord-launcher/relay-server.mjs:1-60`). Browser code imports only global `WebSocket`, never `ws`. Do not pin Node.

**Resources.** `package.json`; `package-lock.json`; `tests/unit/vtt/handoff-package-contract.test.ts` (new).

**Implementation.** Use manifest-only commands:
```sh
npm install --save-dev --package-lock-only ajv@8.18.0 @types/ws@8.18.1
npm install --save-exact --package-lock-only ws@8.18.3
```
Inspect that only manifests changed and all versions are exact. Then STOP: **SUPERVISOR MATERIALIZES NODE_MODULES**. No `.nvmrc`/`engines`.

**Gate.** Before materialization: `git diff --check -- package.json package-lock.json` and `node -e "const p=require('./package.json');if(p.devDependencies.ajv!=='8.18.0'||p.dependencies.ws!=='8.18.3'||p.devDependencies['@types/ws']!=='8.18.1'||p.engines)process.exit(1)"`. After supervisor materialization: `npx vitest run --configLoader runner tests/unit/vtt/handoff-package-contract.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor rerun is authoritative; S10 reports materialization/tool versions. Roll back three files. If either exact package version is unavailable or already direct at implementation HEAD, stop and re-audit rather than silently changing versions.

### S0b — Central paths, safe bootstrap, and doctor

**Decision.** One Node-only module owns handoff paths; bootstrap creates layout/venv idempotently but never installs Node packages.

**Resources.** `tools/vtt-handoff/paths.ts`; `tools/vtt-handoff/bootstrap.ts`; `tools/vtt-handoff/doctor.ts`; `tests/unit/vtt/handoff-bootstrap.test.ts`; `package.json`.

**Implementation.** Resolve repo top level, default/overridden root, WSL distribution, and UNC display path. Default refuses a lookalike; override must be absolute. `mkdir({recursive:true})` creates only `contracts`, `fixtures`, `art/outbox`, `art/inbox`, `reports/claude`, `reports/windows`, `deliveries/windows` and preserves existing contents. Before dependency diagnosis, `lstat`/`realpath` `node_modules`; symlink/outside returns `SHARED_NODE_MODULES_REFUSED` and the named supervisor prerequisite. Injected runner test proves zero installer calls. Python prefers `uv venv .tmp/vtt-tools-venv`; fallback is `python3 -m venv --without-pip`, and only if pip is actually needed, `~/.local/bin/pip3 --python <venv>/bin/python install pip`; never sudo. Doctor reports Ubuntu/WSL, paths, jq, lockfile, Node/npm/Python, symlink target, and versions as JSON. It compares Node major with `@types/node` major only for a warning and never fails version drift. Add `bootstrap` and `doctor`.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-bootstrap.test.ts`; `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run doctor -- --json`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor double-runs bootstrap and tests symlink/outside refusal. S10 documents paths/install policy. Roll back four files/aliases; `.tmp` output is disposable cache. Assumes audited Ubuntu tools but doctor rechecks them.

### S1 — Exact v1 TypeScript, Zod, JSON Schema, and semantic layers

**Decision.** Zod 4 is the runtime structural parser because it is direct (`package.json:43-49`); Ajv independently evaluates draft 2020-12 schema. Cross-record semantics remain separate.

**Resources.** `src/vtt/handoff/v1/contracts.ts`; `src/vtt/handoff/v1/validation.ts`; `contracts/vtt-handoff/v1/protocol.schema.json`; `contracts/vtt-handoff/v1/art.schema.json`; `tests/unit/vtt/handoff-contract.test.ts`.

**Implementation.** Encode the owner's request/success/failure/event, all five methods, and `SceneSnapshot` verbatim. Every coordinate/size/radius/intensity/revision/facing is finite; only revision/seq additionally safe integer. Every blocking/open/enabled value is boolean and color is exactly `#RRGGBB`. IDs, asset IDs, labels, error codes/messages are plain strings, including empty. Do not impose positivity, UUID, nonempty, bounds, or known asset IDs structurally. Strict objects reject extras.

Art request is `{schemaVersion:1,requestId:string,assetId:string,brief:string,views:View[],passes:Pass[],pixelsPerCell:number,footprint:{w:number,h:number}}`; `View="top-down"|"isometric"` and `Pass="albedo"|"normal"|"emissive"`. Result is `{schemaVersion:1,requestId:string,status:"complete"|"partial"|"blocked",assets:Asset[],provenance:Provenance,errors:string[]}`. `Asset={assetId:string,footprint:{w:number,h:number},heightCells:number,pixelsPerCell:number,frames:Frame[]}`. `Frame={facing:number,frameIndex:number,view:View,width:number,height:number,pivotPx:[number,number],albedo:ImageFile,normal?:ImageFile,emissive?:ImageFile}`. `ImageFile={path:string,sha256:string}`. `Provenance={sourceFiles:SourceFile[],normalMapConvention:"opengl-positive-y"|"directx-negative-y"|"none",tool:string,notes:string}`; `SourceFile={path:string,sha256:string}`. Frame view is v1.

JSON Schema covers structure. Separate semantic functions enforce duplicate entity IDs, door wall foreign keys, unique request views/passes, unique result asset IDs, unique `(view,facing,frameIndex)` per asset, pass/file consistency, request/result identity, hex SHA-256, request-ID filename prefixes, and relative containment for both image and source-file paths. Counterexamples parse with Zod/Ajv then fail semantics. Boundary fixtures accept empty strings, zero/negative/fractional finite dimensions/coordinates/radii/intensity/facing and negative safe revision/seq; reject infinities/NaN/unsafe revision/seq. Feasibility later uses `INVALID_PARAMS`, `OUT_OF_BOUNDS`, `INVALID_DESTINATION`, `ILLEGAL_MOVE`, `AMBIGUOUS_MOVE`, `FORBIDDEN`, `UNAUTHORIZED`, `UNSUPPORTED`.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor confirms bidirectional Zod/Ajv structural parity and semantic counterexamples. S10 copies exact shapes. Roll back the five isolated resources. Block until S0 dependencies are materialized.

### S2a — D359-safe snapshot/coordinate/asset adapter

**Decision.** Carry real token identity/visible cells through the existing filtered player seam, then project only safe board views.

**Resources.** `src/combat/visibility.ts`; `src/vtt/encounter-projections.ts`; `src/vtt/handoff/asset-id-map.ts`; `src/vtt/handoff/scene-snapshot.ts`; `tests/unit/vtt/scene-snapshot.test.ts`.

**Implementation.** Add `tokenId:TokenId` to `PlayerVisiblePlacedCombatant`, classify it in a new exhaustive nested `PLAYER_PLACED_COMBATANT_VIEW_CLASSIFICATION` as `per_seat`, and populate from token only after hidden/fog/LOS checks. Add `visibleCells` to `PlayerBoardProjection` by cloning `view.cells`. Implement B exactly, deterministic ordering, fallback telemetry, center/inverse helpers, wall dedupe, companion door wall. Overloads accept `DmBoardProjection` or `PlayerBoardProjection`, never `EncounterState`.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/scene-snapshot.test.ts tests/unit/combat/visibility.test.ts tests/unit/vtt/encounter-projections.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Hand-written assertions pin centers/round trips for all sizes and squeeze, distinct token/combatant IDs, walls/door FK, visible cells, two seats, hidden removal. S10 documents loss. Roll back five files; persistence is unchanged. Existing board requires rectangular footprint (`src/vtt/encounter-board.ts:821-825`).

### S2b — Real-engine synthetic two-room fixture

**Decision.** One fixed-seed, secret-free builder uses `createEncounter`, real world objects/environment, and real adapter.

**Resources.** `src/vtt/handoff/fixtures/two-room.ts`; `tools/vtt-handoff/generate-fixtures.ts`; `fixtures/scenes/two-room.v1.json`; `fixtures/scenes/two-room.snapshots.v1.json`; `tests/unit/vtt/two-room-fixture.test.ts`.

**Implementation.** Build a 12×8, five-foot scene: dividing wall; one single-cell door between rooms; torch `light-source` plus bright region; barrel/table/pillar objects; adventurer/goblin; fixed clock/RNG; two distinct player bindings; no DM notes/secrets; art package exercises nine logical IDs. First JSON is encoded encounter/session source; second has DM and both player snapshots. Generator supports `--check`. Independent tests assert topology, canonical IDs, door adjacency/reference, exact token centers, seat differences, empty secret fields, seed, and source revision; generated equality is additional.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/two-room-fixture.test.ts tests/unit/vtt/scene-snapshot.test.ts`; `npx vite-node tools/vtt-handoff/generate-fixtures.ts -- --check`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor is authoritative. S10 links fixtures. Roll back five resources. Generated JSON moves only with same-change independent invariants, never regeneration alone.

### S2c — Real examples and immutable bundle publisher

**Decision.** Examples come from real fixture/adapter; publication is immutable and READY is last.

**Resources.** `fixtures/protocol/examples.v1.json`; `tools/vtt-handoff/publish.ts`; `tests/unit/vtt/handoff-publish.test.ts`; `package.json`.

**Implementation.** Generate DM/two-player `session.open`, snapshot, move, door open/close/no-op, light `UNSUPPORTED`, malformed/unauthorized/illegal/duplicate rejections and snapshot events. Publisher writes configured-root `contracts/v1/{protocol.schema.json,art.schema.json,contracts.d.ts,examples.v1.json}`, scene fixtures, then `manifest.json` with lowercase SHA-256/byte length. Each file uses same-directory `.partial`, fsync, rename, and hash verification; `READY.json` is temp+rename last. Republish is no-op only byte-identically; differing same-v1 bundle returns `IMMUTABLE_BUNDLE_CONFLICT` without overwrite. Add `handoff:publish`.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/scene-snapshot.test.ts tests/unit/vtt/two-room-fixture.test.ts tests/unit/vtt/handoff-publish.test.ts`; `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run handoff:publish -- --check`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor publishes twice then tests a differing bundle in a temp root. S10 distinguishes bundle READY from whole-unit readiness. Roll back four resources/alias; temp cache may be removed. Existing v1 causes validation/refusal, never overwrite.

### S3a — Renderer-neutral persistence/durability port

**Decision.** Rename interface `BrowserSessionStore`→`SessionStore`, require `flush():Promise<void>`, inject clock; retain concrete class names in this mechanical step.

**Resources.** `src/vtt/session-persistence.ts`; `src/vtt/adventuring-day-session.ts`; `src/vtt/dm-bridge/client.ts`; `src/vtt/dm-encounter-host.ts`; `src/vtt/local-session-store.ts`; `tests/unit/vtt/session-persistence.test.ts`. Six files are justified as every production type caller plus the only test helper typed as the interface found by exact symbol search. Concrete names remain to avoid unrelated cosmetic test churn.

**Implementation.** Memory/SQLite get resolved no-op flush; IndexedDB retains real queue flush. Remove host duck-typing. Update journal, adventuring-day factory, bridge failure guard (including `src/vtt/dm-bridge/client.ts:2,47`), host, local adapter, and test helper. Add `Clock{now():Date}` to IndexedDB open options and replace timestamps currently at `src/vtt/local-session-store.ts:293-315,489-500`.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/session-persistence.test.ts tests/unit/vtt/local-session-store.test.ts tests/unit/bridge/client.test.ts tests/integration/vtt/dm-encounter-host-live-path.test.ts`; `npm run typecheck:fast`; exact `rg` over the six files finds no old interface use.

**Verification/docs/rollback/assumptions.** Supervisor checks no-op and delayed/failed flush. S10 names port/adapters. Roll back six-file seam. Re-run exact symbol search at implementation HEAD and add any newly found mechanical caller before editing.

### S3b — Session lifecycle adapter

**Decision.** Rename/delete/restore/import/export/flush ordering becomes a typed port; browser file/folder handles, URL navigation, download, and gestures remain browser-side.

**Resources.** `src/vtt/session-lifecycle.ts`; `src/vtt/local-session-store.ts`; `src/vtt/save-manager.ts`; `tests/unit/vtt/session-lifecycle.test.ts`; `tests/unit/vtt/local-session-store.test.ts`.

**Implementation.** Define typed list/rename/delete/restore/import/export/flush intents and conflict/active-session results. Implement over IndexedDB. Flush before export/restore/delete boundaries and after import before success. Active deletion yields navigation instruction only after close+flush+remove. Preserve different-fingerprint conflict/refusal and revision streams. Test rename, restore, active/non-active delete, duplicate/different import, corruption, flush order/failure, reopen preservation.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/session-lifecycle.test.ts tests/unit/vtt/local-session-store.test.ts tests/unit/vtt/save-manager.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor compares checksummed revision streams after reopen. S10 documents browser boundary. Roll back five files; no save schema/migration.

### S3c — Session service, seat registry, durable mutation transaction

**Decision.** `DmEncounterHost` implements one `EncounterSessionService`; per-seat reads/subscriptions and serialized intents resolve at durable commit.

**Resources.** `src/vtt/encounter-session-service.ts`; `src/vtt/dm-encounter-host.ts`; `src/vtt/encounter-projections.ts`; `tests/unit/vtt/encounter-session-service.test.ts`; `tests/unit/vtt/engine-boundary.test.ts`.

**Implementation.** Interface exposes typed `dispatch`, DM/player snapshots, DM/player subscriptions, selectors, status/error, close. Host-owned `PlayerSeatRegistry` maps external player IDs to immutable bindings. Missing/unknown player ID is `UNAUTHORIZED`; ownership includes visibility combatant. Two player IDs bind different controlled sets/subscriptions. Player moves verify token ownership; cross-seat is `FORBIDDEN` without revision/event.

Host owns a FIFO intent queue. At execution it records coordinator request/revision, resolves only one exact offered move, submits, and awaits a new internal commit signal identifying that consumed command, its produced encounter revision, and immutable per-seat projections captured from that reducer result. The pump holds at this transaction barrier while `SessionStore.flush` runs. Only after flush succeeds does it return that exact `{revision}`, emit the captured full snapshot, and release the pump to reactions/agent turns. Flush failure returns `PERSISTENCE_FAILED` with no revision claim; memory may have advanced, so status degrades and a current snapshot/error reports reality—never false success/retry. Concurrent intents serialize. Protocol request-ID reservation belongs only to S4's ledger, not this renderer-neutral service. Later agent/reaction/autonomous steps emit snapshots with own seq but never another mutation response. Tests defer/reject flush, race intents, cause autonomous post-change, and pin ordering.

Boundary graph initially proves core/service no DOM/canvas/IndexedDB/`node:fs`; allowed reducer routes are coordinator→`reduceSessionEncounter`→`reduceVaneWarrenEncounter`, journal replay through that reducer, and exact pacing helper `session-persistence.ts:1090-1127`. UI/protocol/transports cannot import `reduceEncounter`. Grow entries in S5-S8.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/engine-boundary.test.ts tests/integration/vtt/dm-encounter-host-live-path.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor observes pending-on-delayed-flush and no-success-on-failure. S10 defines transaction. Roll back five files. If command correlation cannot be explicit, add a typed coordinator result; never infer from revision alone.

### S3d — Canonical door intent through `world_operation`

**Decision.** Door changes use persisted `world_operation/modify_object` with explicit active DM-attribution actor and `cost:"none"`; never direct state edits.

**Resources.** `src/combat/coordinator.ts`; `src/vtt/dm-encounter-host.ts`; `src/vtt/encounter-session-service.ts`; `tests/unit/vtt/door-intent.test.ts`; `tests/unit/vtt/session-persistence.test.ts`.

**Implementation.** Open triple `{movement:false,lineOfSight:false,cover:"none"}`; closed `{movement:true,lineOfSight:true,cover:"total"}` (`src/combat/terrain.ts:8-20`). Unknown/non-door/noncanonical current triple is `UNSUPPORTED`. Already requested canonical state returns current revision after flush, no event/reducer/journal append. Otherwise choose current active combatant as engine DM-attribution actor and issue `{type:"world_operation",actor:active,cost:"none",operation:{kind:"modify_object",objectId,changes:{blocking}}}`; no active actor is `UNSUPPORTED`. This obeys existing active/cost checks (`src/combat/events.ts:160-164`, `src/combat/encounter.ts:12489-12499`).

Coordinator method follows DM mutation safety: cancel/abort and journal pending request before apply (`src/combat/coordinator.ts:333-372`), preserve running/paused state, apply; if previously running repump/reissue at new revision, if paused remain paused. Old response is stale (`src/combat/coordinator.ts:502-517`). Cancellation/reissue plus reducer journal rows are expected.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/door-intent.test.ts tests/unit/vtt/session-persistence.test.ts tests/integration/vtt/dm-encounter-host-live-path.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Test open/close during pending human request, abort/stale/fresh request, replay, later movement, all three blocking fields (cover can block movement independently; `src/combat/terrain.ts:145-155`). S10 states limits. Roll back five files. Out-of-combat/no-active door mutation is extension.

### S3e — Safe board selectors

**Decision.** Player previews use safe projection only; no DM authority.

**Resources.** `src/vtt/encounter-selectors.ts`; `src/vtt/encounter-projections.ts`; `tests/unit/vtt/encounter-selectors.test.ts`; `tests/unit/vtt/engine-boundary.test.ts`.

**Implementation.** Add DM label selector and player `previewAffectedCellKeys(PlayerBoardProjection,area)` deriving walls only from filtered fields. Characterize offered destination matching. Graph forbids selector imports of `DmView`, `EncounterState`, host, persistence, DOM, transports.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Two seats with concealed geometry yield appropriate distinct previews. S10 documents selector inputs. Roll back four files. If safe geometry is insufficient, return unavailable rather than leak.

### S4 — Transport-neutral validating dispatcher and ledger

**Decision.** One dispatcher validates, authorizes, dispatches, deduplicates, and projects before untrusted boundaries.

**Resources.** `src/vtt/handoff/protocol-runtime.ts`; `src/vtt/handoff/session-authorizer.ts`; `src/vtt/handoff/mutation-ledger.ts`; `tests/unit/vtt/protocol-runtime.test.ts`; `tests/unit/vtt/engine-boundary.test.ts`.

**Implementation.** Parse before feasibility. Malformed envelope with a usable string ID echoes it; absent/non-string unusable ID yields `{v:1,id:"",ok:false,error:{code:"INVALID_REQUEST",message}}`. Empty string is structurally valid/usable. Unknown method and `light.set` return `UNSUPPORTED`. Authorizer receives transport principal plus requested role/playerId; DM requires DM claim, player requires exact registered player claim. Project through exact seat before events.

Reserve mutation ID before queue. Any reuse—including byte-identical, concurrent, failed—is `DUPLICATE_MUTATION_ID`, never re-executed. Ledger lasts the logical runtime session. Read IDs are correlated but not mutation-ledger entries. Seq starts 1/session and increments every full snapshot independently of revision. Open queues current snapshot; state change emits after durable commit; autonomous commits emit separately; door no-op emits none. Full arrays replace previous and remove hidden entities.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/engine-boundary.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Pin two players, cross-seat/role escalation refusal, hidden removal, concurrent duplicate, revision/seq, malformed ID, unsupported. S10 mirrors trust/errors. Roll back five files. Transport must supply principal out of band.

### S5 — Common logical transport and in-process adapter

**Decision.** All clients implement one `SceneTransport`; in-process avoids extra serialization.

**Resources.** `src/vtt/handoff/scene-transport.ts`; `src/vtt/handoff/in-process-transport.ts`; `tests/unit/vtt/in-process-transport.test.ts`; `tests/unit/vtt/engine-boundary.test.ts`; `package.json`.

**Implementation.** Define `request`, `initialSnapshot`, `subscribe`, `status`, `subscribeStatus`, typed errors, `close`, `dispose`. In-process passes objects while still validating. Close rejects pending reads/unsubscribes and never retries unknown mutation; dispose destroys logical session/ledger. Add `test:protocol`. Also add `test:engine` as `vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts`. Grow the graph entry.

**Gate.** `npm run test:engine`; `npm run test:protocol`, exactly `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Test initial/late subscription, status/error, pending close, cleanup, zero serialization calls. S10 defines lifecycle. Roll back five resources.

### S6a — Real browser Worker

**Decision.** Module Worker hosts same service/dispatcher over transferred `MessagePort`.

**Resources.** `src/vtt/handoff/worker-entry.ts`; `src/vtt/handoff/worker-transport.ts`; `tests/unit/vtt/worker-message-boundary.test.ts`; `tests/unit/vtt/engine-boundary.test.ts`.

**Implementation.** Construct via `new Worker(new URL('./worker-entry.ts',import.meta.url),{type:'module'})`, transfer channel port, validate all messages, correlate IDs, send initial/events/status/errors, clean close/dispose. No SharedArrayBuffer/Atomics/Node/DOM in worker core and no fake. Reconnect creates new Worker/session/open/snapshot; page closure loses Worker.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/worker-message-boundary.test.ts tests/unit/vtt/engine-boundary.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Unit exercises decoder/MessagePort; S6b Playwright proves browser. S10 says player-hosted Worker cannot protect secrets. Roll back four files.

### S6b — Production-reachable Worker/browser matrix

**Decision.** `/vtt?...&runtime=worker` opts into shipped Worker; default remains in-process.

**Resources.** `src/main.ts`; `src/vtt/encounter-app.ts`; `tests/browser/vtt-handoff/playwright.config.ts`; `tests/browser/vtt-handoff/worker.spec.ts`; `package.json`.

**Implementation.** Inject Worker transport only for query opt-in. Checked-in config resolves absolute `testDir`/`webServer.cwd`, requires `PLAYWRIGHT_PORT`, rejects 4173, sets workers1/fullyParallel false/baseURL/headless/trace, `AI_BRIDGE_FAKE=1`, unique `/tmp` Vite cache. `test:worker` invokes Playwright.

Spec navigates D365 Worker URL, waits heading, clicks **Load bundled dungeon and party** as existing smoke does (`tests/browser/vtt-encounter.spec.ts:26-39`), waits a pending human turn, picks first enabled revision-bound move option whose destination differs, records token data coordinates, uses existing confirm sequence (`tests/browser/vtt-encounter.spec.ts:4-7`), asserts token/revision reach declared destination. It covers correlation, invalid request, mutation, initial snapshot, reconnect/resnapshot, duplicate, subscription cleanup. Build assertion locates Worker chunk in `dist/assets` and loads built mode.

**Gate.** `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npm run test:worker`; exactly `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts`; `npm run build`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor owns 4410 rerun. S10 shows query. Roll back five files. If destination lacks stable DOM data, add a data attribute from existing option projection, never parse prose.

### S7a — Opt-in loopback TypeScript WebSocket runtime

**Decision.** `tools/serve.mjs` launches a TypeScript factory/main through a `vite-node` child only under `--vtt-runtime`. `ws` handles RFC 6455 server protocol; the echo spike is not reused.

**Resources.** `tools/vtt-handoff/node-runtime.ts`; `tools/vtt-handoff/node-runtime-main.ts`; `tools/serve.mjs`; `tests/unit/vtt/node-runtime.test.ts`; `package.json`.

**Implementation.** Factory exports without listening; main parses and listens. Default serve path stays unchanged. Opt-in prepares dist then spawns `process.execPath node_modules/vite-node/vite-node.mjs tools/vtt-handoff/node-runtime-main.ts -- --port <n>`, forwards signals/stdio/exit, and does not start the old server in parallel. Factory serves static dist and upgrades only `/vtt/v1`; address is hard-coded 127.0.0.1, not configurable. Require `VTT_RUNTIME_TOKEN`, loopback Host, WebSocket version/key, and Origin policy: every present Origin must exactly match `VTT_RUNTIME_ORIGINS`; an absent Origin is rejected unless explicit `VTT_RUNTIME_ALLOW_ORIGINLESS=1` is set for a non-browser Node client, which remains bearer-authenticated. Configure `ws` `noServer`, `maxPayload:1_048_576`, per-message deflate false. Reject binary. `ws` must handle masked client frames, fragmentation/reassembly, ping/pong, and close; enforce 5-second authentication/open deadlines and close codes 1002 protocol, 1008 auth/policy, 1009 oversize. No token in URL/log.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/node-runtime.test.ts`; test spawns real `npm run serve -- --vtt-runtime --port 0`, parses ephemeral loopback origin, authenticates, then terminates and asserts child cleanup; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Test default no-v1 route; opt-in loopback; bad Host/Origin/version/key/token; fragmented auth/v1 text; ping/pong; graceful/abrupt close; binary and >1MiB refusal. S10 documents. Roll back five files. Assumes exact dependencies materialized and vite-node remains current (`package.json:63-65`).

### S7b — Authenticated-socket session binding and WebSocket transport

**Decision.** Session is the authenticated socket. Browser-compatible first authenticated frame supplies bearer; v1 envelopes remain exact text-frame JSON. Reconnect always creates a new session, new ledger, `session.open`, full snapshot.

**Resources.** `tools/vtt-handoff/node-runtime.ts`; `src/vtt/handoff/websocket-transport.ts`; `tests/unit/vtt/node-websocket-transport.test.ts`; `tests/unit/vtt/engine-boundary.test.ts`; `package.json`.

**Implementation.** Immediately after upgrade client sends transport-only `{kind:"authenticate",token:string}` as first complete text message. Server constant-time compares configured bearer, replies transport-only `{kind:"authenticated"}`, binds principal to socket, then requires first v1 request be `session.open`. JSON session.open result remains `{sessionId,capabilities}` with no handle/header. Each socket owns one service session, seat binding, mutation ledger, seq, and event stream. Two sockets with same DM principal are two sessions. Server pushes initial full snapshot after successful open; client buffers latest event until `subscribe`/`initialSnapshot`, so late subscription cannot miss it. `close()` closes socket/subscription/pending requests; `dispose()` additionally closes service/session—both erase ledger. Abrupt close aborts pending controller work and disposes in `finally`.

Reconnect creates/authenticates a new socket and requires caller to send a fresh session.open; it receives a full snapshot and a fresh ledger. It never resends an outstanding mutation after unknown outcome because duplicate protection does not cross socket sessions. Browser client uses global `WebSocket`; Node tests use Node global `WebSocket`; no `ws` import is reachable from `src`. Add `test:runtime-node`.

For browser parity, Playwright origin is exact `http://127.0.0.1:4410`; Node's ephemeral server allowlists that Origin during upgrade. WebSocket has no CORS preflight; origin checking at upgrade is the boundary.

**Gate.** `npm run test:runtime-node`, exactly `npx vitest run --configLoader runner tests/unit/vtt/node-runtime.test.ts tests/unit/vtt/node-websocket-transport.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/engine-boundary.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Test two sockets/sessions under one DM bearer, two players, fresh-open reconnect, full resnapshot, fresh ledger, late subscribe, no unknown-outcome retry, pending-request cleanup, close/dispose, wrong auth/role/origin. S10 defines frame/session semantics. Roll back client/session layer while retaining factory. Assumes a later client can receive a bearer out of band; no URL secret.

### S7c — In-process/Worker/WebSocket parity

**Decision.** Table-driven conformance uses identical fixture, with independent invariants separate from equality.

**Resources.** `tests/helpers/vtt-handoff/transport-conformance.ts`; `tests/unit/vtt/runtime-parity.test.ts`; `tests/browser/vtt-handoff/runtime-parity.spec.ts`; `tests/browser/vtt-handoff/playwright.config.ts`; `tests/unit/vtt/engine-boundary.test.ts`.

**Implementation.** Matrix covers correlation, structural failure, auth, initial snapshot, move, door/no-op, light unsupported, reconnect/full resnapshot, late subscribe, hidden removal, duplicate within session, cleanup, no blind retry. Unit runs in-process/Node; browser runs Worker and WebSocket to ephemeral Node with exact 4410 Origin. Canonical equality uses fixed seed/clock; hand-written assertions pin center, removal, ownership, revision/seq, one execution. Graph grows from all runtime/UI entries, asserts one service/reducer, and browser/Node imports mutually absent.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/runtime-parity.test.ts tests/unit/vtt/engine-boundary.test.ts`; `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts runtime-parity.spec.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor uses Node port0/browser4410. S10 publishes matrix. Roll back test harness only. Parity never replaces independent oracle.

### S8 — Existing top-down UI as service/lifecycle adapter

**Decision.** Visual behavior stays; mutations/lifecycle use typed ports and reads use safe selectors.

**Resources.** `src/vtt/encounter-app.ts`; `src/vtt/encounter-session-service.ts`; `src/vtt/session-lifecycle.ts`; `tests/browser/vtt-handoff/top-down-smoke.spec.ts`; `tests/unit/vtt/engine-boundary.test.ts`. The 3,135-line existing adapter is one indivisible class; changes remain under ~250 hand-written lines by forwarding, not rewriting rendering.

**Implementation.** Inject service/lifecycle factories. Replace all mutation groups in A6 and store lifecycle groups in A2. Keep directory handles, upload/download, navigation, localStorage, BroadcastChannel, DOM in UI. Replace three direct rules reads with S3e selectors. Player preview gets only `PlayerBoardProjection`, never DM host. Local-window decisions authorize exact seat. Art prefers v1 `view:"top-down"`; isometric-only keeps current starter/logical fallback and reports it, never stretches isometric art.

Smoke uses checked-in config, navigates D365, clicks load, waits deterministic human move option, records token DOM coordinate, confirms, asserts offered destination/board. One spec has default in-process and Worker cases.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts tests/unit/vtt/session-lifecycle.test.ts tests/unit/vtt/encounter-selectors.test.ts`; `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor confirms behavior/source graph. S10 records adapter. Roll back five-file forwarding step. No art/capture/atlas pin changes.

### S9a — RFC 9562 UUIDv7 and non-destructive requests

**Decision.** Implement monotonic-within-ms UUIDv7 and new handoff queue; existing queue untouched.

**Resources.** `tools/vtt-handoff/uuidv7.ts`; `tools/vtt-handoff/art-request.ts`; `tests/unit/vtt/uuidv7.test.ts`; `tests/unit/vtt/art-request.test.ts`; `package.json`.

**Implementation.** Encode 48-bit Unix ms, version 7, RFC variant `10`, 12-bit per-ms monotonic counter initialized from injected random, 62 random bits; counter exhaustion waits/fails via clock, never wraps. Test timestamp round-trip, nibbles, deterministic randomness, lexical monotonic ordering, rollback-clock, collision refusal. Add `art:request`; it exclusive-writes `art/outbox/<uuidv7>.request.json` via `.partial`/rename. Generate nine logical requests with `views:["top-down","isometric"]`, relevant passes, 128 px/cell, consistent clean-room pixel-art style, ground-center pivot/scale, 0/90/180/270 facings, footprints; no third-party names.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/uuidv7.test.ts tests/unit/vtt/art-request.test.ts tests/unit/vtt/handoff-contract.test.ts`; `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:request -- --check`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor confirms nine unique valid files. S10 distinguishes queues. Roll back five resources; outbox cache preserved. Existing tracked flow remains as documented (`art/requests/README.md:20-47`).

### S9b — Hostile-inbox JSON and complete PNG validation

**Decision.** Explicit scanner validates whole PNG under bounds; no watchers/scripts.

**Resources.** `tools/vtt-handoff/png-validator.ts`; `tools/vtt-handoff/art-validator.ts`; `tests/unit/vtt/png-validator.test.ts`; `tests/unit/vtt/art-validator.test.ts`; `package.json`.

**Implementation.** Add `art:validate`. It ignores `.partial` and scans only completion files `art/inbox/<uuidv7>.result.json`; each referenced frame/source lives under `art/inbox/<uuidv7>/`, its filename begins `<uuidv7>__`, and its path is relative to that bundle. Validate S1 shape/semantics/request identity/status/duplicates/hashes/dimensions/pass alignment, traversal/absolute/drive/UNC rejection, no symlink component/escape, regular files, 64MiB/file and 256MiB/bundle. Unknown scripts are inert. The producer's `.partial` copies and result-last publication are verified by consuming only the final result file.

Do more than existing header helper (`src/assets/png.ts:213-219`): walk chunks/checked lengths; CRC32; exactly one first 13-byte IHDR; legal compression/filter; v1 only noninterlaced 8-bit RGBA type6; contiguous IDAT; zero-length terminal IEND/no trailing. Cap dimensions 8192², pixels 64m, compressed IDAT 64MiB, calculated decoded bytes 256MiB with overflow checks. Inflate via `node:zlib.inflateSync({maxOutputLength})`; require exact `(width*4+1)*height`; filter byte 0–4; unfilter under cap; albedo contains alpha<255. Normal/emissive dimensions equal albedo and convention matches provenance.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/png-validator.test.ts tests/unit/vtt/art-validator.test.ts tests/unit/vtt/handoff-contract.test.ts`; `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:validate -- --json`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Controls: independently valid transparent PNG; corrupt/truncated IDAT; bad zlib/CRC; malformed order/length; duplicate/missing IHDR/IEND; trailing; illegal filter; opaque; dimension/pixel/inflate bombs; traversal/Windows/symlink; duplicate identity; hash/pass mismatch. S10 lists limits. Roll back five resources; inbox untouched.

### S9c — Race-resistant review staging

**Decision.** Staging distrusts reports, revalidates live manifest/files, and copies via safe descriptors.

**Resources.** `tools/vtt-handoff/art-stage.ts`; `tools/vtt-handoff/art-safe-files.ts`; `tests/unit/vtt/art-stage.test.ts`; `package.json`.

**Implementation.** Add `art:stage`. Reread request/result, run S9b, canonical-hash result into in-memory approved manifest. For every image and provenance source: contain path; `lstat`; open `O_RDONLY|O_NOFOLLOW`; `fstat` regular/size/dev+inode equals lstat; stream/hash under cap; refstat; compare approved hash; create destination `O_CREAT|O_EXCL|O_NOFOLLOW`; copy from open fd; fsync; destination hash compare. Revalidate result identity/hash immediately before publish.

Stage `art/staging/<id>.partial`, originals/provenance preserved; rename and write review manifest last only after all pass. Failure publishes no completion. Never `public/assets/art`, no relicensing, no NOTICE/ART-PROVENANCE changes. Manifest supports later explicit copy pipeline and exposes no inbox server.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/art-stage.test.ts tests/unit/vtt/art-validator.test.ts tests/unit/vtt/png-validator.test.ts`; `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:stage -- --check`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Inject changed manifest, swapped inode/symlink, oversize replacement, forged/stale report, changed source, destination collision/postcopy mismatch. S10 marks review-only. Roll back four resources. Production art is pinned (`tests/unit/assets/starter-art.test.ts:53-118`) and raster tracking restricted (`tests/unit/source-is-greppable.test.ts:45-83`).

### S9d — Real Windows interop probe

**Decision.** Structured NOT_RUN/UNAVAILABLE never passes and makes whole handoff PARTIAL.

**Resources.** `tools/vtt-handoff/windows-probe.ts`; `tests/unit/vtt/windows-probe.test.ts`; `package.json`; `tools/vtt-handoff/doctor.ts`.

**Implementation.** Return `{status:"PASSED"|"NOT_RUN"|"UNAVAILABLE"|"FAILED",linuxPath,windowsPath,checks,reason}`. Without `VTT_WINDOWS_INTEROP=1`: NOT_RUN. Enabled without WSL/PowerShell: UNAVAILABLE. Neither increments pass. When available derive UNC; `powershell.exe` writes random bytes through UNC and Linux hashes; Linux writes different bytes and PowerShell reads/hashes; require both directions and remove only named probes. Unit tests injected runner/classification; actual command is separate, never `.skip`. No watcher claim.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/windows-probe.test.ts`; actual: `VTT_WINDOWS_INTEROP=1 VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/vtt-handoff npm run doctor -- --windows-probe --json`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor records structured result. S10 status uses it. Roll back four resources. Binding proof runs from owner checkout; worktree probe is diagnostic.

### S10a — Authorized durable docs

**Decision.** Write stable architecture/trust/integration docs in explicitly authorized scope.

**Resources.** `docs/vtt-handoff/architecture.md`; `docs/vtt-handoff/runtime-api.md`; `docs/vtt-handoff/protocol-v1.md`; `docs/vtt-handoff/art-exchange.md`; `docs/vtt-handoff/security-and-integration.md`.

**Implementation.** Cover six boundaries/one reducer; transactions/transports/socket sessions; exact v1/semantic refusals/loss; exact art shapes/limits/ownership/staging; requestedRole/player Worker trust; WebSocket first auth frame, loopback/origin/Host, later HTTPS/deployment; Windows connection points. READY means later-integration-ready, not connected.

**Gate.** `rg -n "SceneSnapshot|WebSocket|authenticate|127\\.0\\.0\\.1|player-hosted Worker|PARTIAL|art/inbox|UNSUPPORTED" docs/vtt-handoff`; `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/engine-boundary.test.ts`.

**Verification/docs/rollback/assumptions.** Supervisor cross-checks source/schema. Roll back five new docs. No `docs/specs` generator involved.

### S10b — Reproducible reports/readiness

**Decision.** Publish reports only in handoff `reports/claude`; required failure/not-run means PARTIAL.

**Resources.** `tools/vtt-handoff/report.ts`; `tools/vtt-handoff/publish.ts`; `tests/unit/vtt/handoff-report.test.ts`; `package.json`.

**Implementation.** Write `reports/claude/READY.md` and `handoff.json` via temp+rename. Include repo/commit/changed files; actual tool versions/commands; contract/checksum/fixtures; adapters/methods; art paths/sample IDs; test outcomes/pre-existing failures; Windows result; limitations/connection points. Never `reports/windows`. Overall READY only if required gates pass and Windows probe PASSED; otherwise PARTIAL with reasons. Contract READY.json means atomic bundle only.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-report.test.ts tests/unit/vtt/handoff-publish.test.ts`; `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run handoff:publish -- --check`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor simulates gate failure/UNAVAILABLE and confirms PARTIAL. Roll back four resources. Report accepts supervisor results, never planned-as-passed.

## E. Security and side-effect statement

This is conditional on the inspected surfaces in A, not a claim about uninspected deployments.

- Only new listener is explicit `npm run serve -- --vtt-runtime`; hard-bound 127.0.0.1, port0-capable, absent from default serve, bearer first frame, exact Host/Origin. No firewall/public/LAN/HTTPS/repository-directory service.
- `requestedRole` is untrusted. Worker/in-process authority comes from constructor; Node from authenticated principal. External player ID resolves exact seat. Cross-seat/unknown refuses.
- Player projection precedes postMessage/WebSocket. Token ID enters only after D359 filtering. Full arrays remove hidden. DM semantic export/raw state/DM-only notes/options/AI bridge never enter player channels.
- Player-controlled Worker cannot protect secrets from player; fog is presentation, not auth. Secret protection needs DM-controlled Node and server-side projection.
- Inbox is hostile. Bound structure/semantics/size/inflate/containment/races; staging revalidates/copies safe descriptors; delivered scripts never execute.
- This unit does not touch frozen `src/vtt/intel/contracts.ts`, production art/notices/provenance, save coordinates/IDs/schema, Windows/Godot, existing `/dm/*`, MCP, P2P VTT, 4173, or model proposer/authority boundaries. No `any`, suppressions, skipped/todo/weakened/deleted tests, or regenerated expectation pins.

## F. Gate battery and negative controls

### Targeted/cumulative commands

Per-step commands are above. Cumulative contract suite:

```sh
npx vitest run --configLoader runner \
  tests/unit/vtt/handoff-package-contract.test.ts \
  tests/unit/vtt/handoff-bootstrap.test.ts \
  tests/unit/vtt/handoff-contract.test.ts \
  tests/unit/vtt/scene-snapshot.test.ts \
  tests/unit/vtt/two-room-fixture.test.ts \
  tests/unit/vtt/handoff-publish.test.ts \
  tests/unit/vtt/session-lifecycle.test.ts \
  tests/unit/vtt/encounter-session-service.test.ts \
  tests/unit/vtt/door-intent.test.ts \
  tests/unit/vtt/encounter-selectors.test.ts \
  tests/unit/vtt/protocol-runtime.test.ts \
  tests/unit/vtt/in-process-transport.test.ts \
  tests/unit/vtt/worker-message-boundary.test.ts \
  tests/unit/vtt/node-runtime.test.ts \
  tests/unit/vtt/node-websocket-transport.test.ts \
  tests/unit/vtt/runtime-parity.test.ts \
  tests/unit/vtt/engine-boundary.test.ts \
  tests/unit/vtt/uuidv7.test.ts \
  tests/unit/vtt/art-request.test.ts \
  tests/unit/vtt/png-validator.test.ts \
  tests/unit/vtt/art-validator.test.ts \
  tests/unit/vtt/art-stage.test.ts \
  tests/unit/vtt/windows-probe.test.ts \
  tests/unit/vtt/handoff-report.test.ts
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts runtime-parity.spec.ts
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts
```

No Playwright touches 4173 or receives outer flock.

### Supervisor whole-unit battery

Only supervisor runs full integrated gates and records exact output:

```sh
npx tsc -b --force
sg scan
npm run test:gate
npm run build
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npm run test:gate:browser
```

Then configured `handoff:publish`, art checks, and owner-checkout Windows probe. Any failure yields PARTIAL, never a changed expectation pin.

### Supervisor-owned negative controls

For each invariant, supervisor starts clean, saves exact pre-mutation bytes/SHA in `/tmp`, applies one temporary mutation, proves it with `git diff --check` plus `rg`/`sha256sum`, runs targeted test and requires nonzero, restores by controlled patch, verifies original SHA, reruns requiring zero. Never commit mutants or regenerate fixtures.

| Invariant | Mutation/proof | Fail then pass command |
| --- | --- | --- |
| Authorization | Accept requested DM role without principal; prove bypass branch. | `npx vitest run --configLoader runner tests/unit/vtt/protocol-runtime.test.ts -t "requested role cannot grant DM authority"` |
| Hidden removal | Retain prior token array when new is empty; prove retained branch. | `npx vitest run --configLoader runner tests/unit/vtt/protocol-runtime.test.ts -t "removes a token that becomes hidden"` |
| Anchor | Replace both center formulas with raw anchor; prove offset absent. | `npx vitest run --configLoader runner tests/unit/vtt/scene-snapshot.test.ts -t "round trips ground centres for every controlled footprint"` |
| Duplicate | Bypass in-session ledger reservation; prove reserve removed. | `npx vitest run --configLoader runner tests/unit/vtt/protocol-runtime.test.ts -t "never executes a duplicate mutation id"` |
| Reducer route | Add direct `reduceEncounter` import/call to in-process transport; prove edge. | `npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts -t "all runtime entries converge on the session reducer"` |
| Staging | Remove `O_NOFOLLOW` or dev+inode check; prove guard absent. | `npx vitest run --configLoader runner tests/unit/vtt/art-stage.test.ts -t "refuses a symlink swap between validation and staging"` |

Report all mutant SHA/diff proof, failing exit, restored SHA, passing exit. Parity alone is insufficient because common code can be commonly wrong.

## G. Open owner questions and proposed v1 extensions

### Open questions

None blocks v1. D593 settles WebSocket/session reconnect; D594 settles no Node pin; supervisor settles duplicate refusal/docs/door semantics. Public exposure, browser-secret trust, art promotion/relicensing, or v1 field changes require new owner decisions.

### Proposed extensions — not v1

1. Scene hierarchy beyond session ID.
2. Explicit wall/door orientation/thickness/cover/multi-segment linkage/source IDs.
3. Authoritative elevation, variable grid, persistent explored cells, stored facing.
4. Authored light photometry/enabled and real toggle operation.
5. More art views/passes, animation timing, source licensing, interlaced/non-RGBA. `Frame.view` top-down/isometric is already v1.
6. HTTP+SSE as an alternative transport, or a later public WebSocket deployment with HTTPS/WSS and separately owned auth.
7. Cross-reconnect mutation outcome receipts/idempotency. v1 never blindly retries and ledger is socket-session scoped.
8. Richer error payload/capabilities, delta events, transport session handle in a future protocol. v1 envelopes remain verbatim.
9. Out-of-combat door changes after engine gains typed non-combat DM authority.

Stop after S10b plus supervisor battery/negative controls: default top-down and opt-in Worker work, one service/reducer serves in-process/Worker/WebSocket, contract/fixtures/art exchange publish, reports are honest READY/PARTIAL, and Windows/Godot remains disconnected.
