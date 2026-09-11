# VTT-HANDOFF-01 implementation plan — candidate r3 (final)

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

Directive coverage is explicit: owner section 1 is A/S0; section 2 is S1-S2c; section 3 is S3a-S3e/S8; section 4 is S4-S7d; section 5 is S9a-S9d; section 6 is package aliases, S8 smoke, S10, and F. `docs/vtt-handoff/**` is expressly authorized by the supervisor for S10a, not gated on later permission. Every increment below is independently reversible and has a targeted gate.

## A. Touched-system anatomy

### 1. Rules/game-state core

- `EncounterState` is authoritative and contains revision, bounds, blocked cells, world objects, environment, fog, combatants, tokens, event history, hidden combatants, and observation history (`src/combat/encounter.ts:750-793`). `createEncounter` validates construction (`src/combat/encounter.ts:1142-1281`); `reduceEncounter` advances revision before processing a command (`src/combat/encounter.ts:12930-12953`).
- Coordinates are renderer-neutral `GridCell {column,row}` and `GridBounds {columns,rows}` (`src/combat/grid.ts:3-11`); cells/bounds are safe integers (`src/combat/grid.ts:21-37`) and grid distance is in five-foot steps (`src/combat/grid.ts:71-85`). Saved anchors must not change.
- `CombatToken` retains distinct token/combatant IDs, anchor, and placement mode (`src/combat/combatant.ts:102-127`). Footprints extend east/south from that anchor: Medium 1×1, Large 2×2, Huge 3×3, Gargantuan 4×4 (`src/combat/creature-space.ts:396-447`). `creatureSpace` uses the placement mode's controlled size, so squeeze can reduce the occupied footprint (`src/combat/creature-space.ts:451-470`).
- World objects have seven mechanical kinds, absolute footprint cells, and independent movement/line-of-sight/cover fields (`src/combat/world-objects.ts:9-20`, `src/combat/world-objects.ts:49-68`; `src/combat/terrain.ts:15-20`). Environment light regions store cells and `bright|dim|darkness`, not point photometry/enabled (`src/combat/world-objects.ts:70-93`). The operation union can modify objects and set region light level, but cannot toggle a light source (`src/combat/world-objects.ts:115-159`).
- F18 correction: the persisted VTT entry is `reduceSessionEncounter`, which delegates to `reduceVaneWarrenEncounter` (`src/vtt/session-encounter-reducer.ts:1-14`). The host injects `reduceSessionEncounter` into `TurnCoordinator` (`src/vtt/dm-encounter-host.ts:385-394`), and replay uses the persisted-command path (`src/vtt/session-persistence.ts:1535`). The pacing-only session reconstruction directly invokes the lower reducer legitimately (`src/vtt/session-persistence.ts:1090-1127`); boundary tests allow that exact edge.
- Retain rather than duplicate existing coverage: movement projection (`tests/unit/vtt/encounter-board-projection.test.ts:374-419`), crash recovery (`tests/unit/vtt/session-persistence.test.ts:579-624`), hidden removal/last-seen (`tests/unit/combat/visibility.test.ts:193-216`), blocking/LOS/cover (`tests/unit/combat/world-objects.test.ts:150-217`), live/replay equality (`tests/integration/vtt/dm-encounter-host-live-path.test.ts:130-156`), and bundled dungeon behavior (`tests/integration/vtt/d365-dungeon.test.ts:113-124`, `tests/integration/vtt/d365-dungeon.test.ts:195-237`). Add characterization only for new seams: offered-destination matching, center/anchor round trips including squeeze, door journal/replay, durable mutation ordering, and visible-to-hidden subscription removal.

### 2. Renderer-neutral application/session service

- `DmEncounterHost` is the service nucleus. It owns the store, journal, controller registry, coordinator, RNG, listeners, bridge, and player IDs (`src/vtt/dm-encounter-host.ts:220-281`); restores integration state (`src/vtt/dm-encounter-host.ts:361-383`); constructs the coordinator (`src/vtt/dm-encounter-host.ts:385-394`); and exposes initial/update subscriptions (`src/vtt/dm-encounter-host.ts:421-465`). Its module does not import DOM, canvas, IndexedDB, or Node filesystem APIs.
- The port is misleadingly named `BrowserSessionStore`, although its interface is synchronous append/read and has memory/SQLite implementations (`src/vtt/session-persistence.ts:299-307`, `src/vtt/session-persistence.ts:376-455`). The real browser adapter documents `flush()` as its acknowledgment boundary. Its ambient metadata times include `src/vtt/local-session-store.ts:293`, `src/vtt/local-session-store.ts:326`, and `src/vtt/local-session-store.ts:499`; `tools/ai-dm-conversation.ts` also imports/constructs this port (`tools/ai-dm-conversation.ts:109`, `tools/ai-dm-conversation.ts:696`). S3a renames the port, makes durability explicit, and injects a clock at every listed site.
- Journal append stores canonical state, RNG, coordinator, controllers, and checksum (`src/vtt/session-persistence.ts:2306-2339`). Today `submitHumanDecision` only submits to the controller (`src/vtt/dm-encounter-host.ts:751-755`); the asynchronous pump applies, flushes, and publishes later (`src/vtt/dm-encounter-host.ts:518-580`). Protocol mutation acknowledgment therefore needs the explicit transaction boundary in S3c.
- Session lifecycle bypasses the host today. UI code directly renames/deletes (`src/vtt/encounter-app.ts:1613-1647`), exports/flushes (`src/vtt/encounter-app.ts:1648-1668`), restores/imports/conflict-checks (`src/vtt/encounter-app.ts:1679-1712`), and durably imports uploads (`src/vtt/encounter-app.ts:1718-1735`). S3b adds a lifecycle port while retaining browser handles and user gestures in the UI adapter.

### 3. Protocol/validation and per-seat projection

- No bootstrap v1 protocol or `SceneSnapshot` exists. Database RPC is a different numeric-ID contract (`src/rpc/protocol.ts:3-47`); its client only supplies lifecycle precedent for correlation and pending-call closure (`src/rpc/client.ts:49-123`).
- D359 requires player/DM projection types before transport and compile-time resistance to leaks (`.claude/decisions.md:4771-4781`). The classification marks tokens, world objects, blocked cells, hidden combatants, and observation history per-seat (`src/combat/visibility.ts:24-68`). `projectPlayerView` removes hidden/unseen geometry before constructing combatants and derives last-seen anchors from observation history (`src/combat/visibility.ts:548-659`).
- Two real gaps need projection changes. `PlayerVisiblePlacedCombatant` lacks token ID (`src/combat/visibility.ts:157-163`) although the projector has the token (`src/combat/visibility.ts:557-603`). `PlayerBoardProjection` carries neither token identity nor `PlayerView.cells` (`src/vtt/encounter-projections.ts:73-96`, `src/vtt/encounter-projections.ts:237-310`). S2a adds `tokenId` as an explicitly classified per-seat field after filtering and adds `visibleCells`.
- Current host output has one party-wide player view whose observer follows the active PC and whose owned set is the whole party (`src/vtt/dm-encounter-host.ts:421-435`). New renderer sessions instead resolve an external player ID through an authoritative registry to one immutable `PlayerSeatBinding`, with independent snapshot/subscription per seat.

### 4. Browser-Worker runtime

- Encounter execution is presently in the DOM/main thread: `DmEncounterView` creates `DmEncounterHost` (`src/vtt/encounter-app.ts:1385-1436`). There is no encounter-engine Worker.
- A production module-Worker pattern exists for SQLite (`src/main.ts:176-195`); a capability Worker is separate (`src/pwa/browser-capability-worker-port.ts:64-66`). Vite has a Worker-specific plugin pipeline (`vite.config.ts:181-230`), and app TypeScript includes DOM/WebWorker libs (`tsconfig.app.json:2-19`).
- S6 ships a separate production-reachable `/vtt-handoff` renderer harness. Its real Worker constructs the same service/dispatcher with an explicit in-memory persistence adapter. It is not injected into the rich `/vtt` UI and does not claim to preserve saves after Worker/page closure.

### 5. Node/npm runtime

- `npm run serve` is plain Node (`package.json:8-18`). `tools/serve.mjs` prepares `dist`, accepts GET/HEAD, binds `127.0.0.1`, and defaults to forbidden-for-tests port 4173 (`tools/serve.mjs:1-7`, `tools/serve.mjs:28-68`, `tools/serve.mjs:135-181`). The renderer runtime must be opt-in and tests use port 0.
- The engine MCP runtime is Node/stdio and imports Node filesystem/readline (`src/vtt/mcp/entrypoint.ts:1-14`, `src/vtt/mcp/entrypoint.ts:67-147`). It is not the renderer contract and stays unchanged.
- A localhost `/dm/*` server exists outside the dev bridge: `tools/discord-launcher/codex-dm-bridge.mjs` serves `/dm/session`, `/dm/exchange`, `/dm/mirror` on loopback (`tools/discord-launcher/codex-dm-bridge.mjs:81-119`), matching the bridge client (`src/vtt/dm-bridge/client.ts:81-91`, `src/vtt/dm-bridge/client.ts:123-128`, `src/vtt/dm-bridge/client.ts:167-206`). It moves AI projections/journal mirrors, not authoritative renderer sessions; S7 does not overload it.
- `tools/discord-launcher/relay-server.mjs` is a small echo spike with a 64-KiB cutoff and incomplete frame decoder (`tools/discord-launcher/relay-server.mjs:1-60`). D593 explicitly forbids using it as the base. S7 uses exact-pinned `ws` server support and global browser/Node WebSocket clients.
- The Vite AI bridge is dev-only and boundary-tested (`tools/ai-bridge/plugin.ts:1-17`, `tests/unit/ai-bridge/build-boundary.test.ts:45-100`). The new WebSocket starts only under `--vtt-runtime`, validates Host/Origin and authenticates in the HTTP upgrade handler before a socket/session exists.

### 6. Existing top-down UI adapter

- `/vtt` dynamically imports/mounts the encounter app (`src/main.ts:47-82`). Rendering is imperative DOM over pure board render models (`src/vtt/encounter-app.ts:672-855`). D505/D508 require alternate renderers to use the same state and be playable (`.claude/decisions.md:9888-9895`, `.claude/decisions.md:9912-9923`); D516 retains the current top-down grammar (`.claude/decisions.md:10142-10148`).
- `EncounterBoardProjectionShape` carries bounds, terrain, lights, combatants, and world objects (`src/vtt/encounter-board.ts:97-142`). Token rendering joins combatants to actual art IDs (`src/vtt/encounter-board.ts:782-843`); cell rendering creates deterministic row-major floor/wall/door/terrain layers (`src/vtt/encounter-board.ts:846-920`). Snapshot projection consumes these models.
- `encounter-app.ts` has no direct `createEncounter`, `reduceEncounter`, `reduceSessionEncounter`, or `reduceVaneWarrenEncounter` call. The complete direct rules-call inventory is `terrainProfile` at line 830, `previewAffectedCells` at 1146, and `terrainWallCells` at 1149 (`src/vtt/encounter-app.ts:28-30`, `src/vtt/encounter-app.ts:826-838`, `src/vtt/encounter-app.ts:1139-1158`). S8 moves the first behind a DM-board selector and the latter two to a pure player selector accepting only `PlayerBoardProjection`.
- Host mutations to wrap as typed intents are: player/DM decisions (`src/vtt/encounter-app.ts:1558-1596`), placement (`src/vtt/encounter-app.ts:2055-2071`), interrupt/resume/undo/skip (`src/vtt/encounter-app.ts:2195-2233`), delay/day/rest/room/session transitions (`src/vtt/encounter-app.ts:2260-2385`, `src/vtt/encounter-app.ts:2440-2547`), adjudication/decision resolution (`src/vtt/encounter-app.ts:2630-2713`), preferences (`src/vtt/encounter-app.ts:2740-2827`), and world-object/adjudication/controller changes (`src/vtt/encounter-app.ts:2883-2980`). Reads/subscription/close occur around construction, heartbeat, and close (`src/vtt/encounter-app.ts:1399-1488`, `src/vtt/encounter-app.ts:3055-3062`). The direct lifecycle/store calls are listed under boundary 2.

### Explicit MISSING-COMPONENTS

1. No v1 types, structural/semantic validators, draft-2020-12 schemas, examples, immutable bundle, checksum manifest, or READY publisher.
2. No real encounter Worker, Worker transport, common `SceneTransport`, production-reachable Worker harness, v1 Node WebSocket, or WebSocket `SceneTransport`.
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
| `walls` | Union `blockedCells` with wall-class terrain objects, but exclude every `kind:"door"` before the wall classification (`src/combat/terrain.ts:158-164`). Cell `(c,r)` contributes four edges at `c±.5,r±.5`; cancel shared internal edges. Stable IDs use normalized endpoints. Emit `baseZ:0,height:1`; plain cells block movement/vision, object edges copy those booleans. | Cell solids become perimeters; thickness/cover are lost. A door companion owns and suppresses any coincident non-door edge. |
| `doors` | A visible door retains its ID and references exclusive `wall:door:<doorId>`. Its companion is the north edge of `object.position`, remains present open/closed, and copies movement/LOS; `open=!object.blocking.movement`, matching current board appearance (`src/vtt/encounter-board.ts:767-779`). | North edge is a documented orientation placeholder; multicell doors control one segment. Coincident door companions refuse `AMBIGUOUS_DOOR_GEOMETRY`, so no duplicate/orphan is emitted. Test isolated, adjacent and multicell doors through open/close. |
| `lights` | DM gets synthetic environment-region lights (centroid, radius `max center distance+.5`, bright→`#FFF2CC`/1, dim→`#FFD27F`/.5, darkness→`#000000`/0) plus visible light-source objects. Player gets visible light-source objects only; environment-derived lights are omitted because `PlayerBoardProjection` has no environment (`src/vtt/encounter-projections.ts:73-96`). | Photometry/enabled are synthetic; `light.set` remains `UNSUPPORTED`. This audience rule prevents environment metadata crossing the player boundary. |
| `vision` | DM: `mode:"all"` and visible/explored contain every cell. Player: `mode:"cells"`, visible from newly carried `PlayerView.cells`, explored = deduped visible plus `lastSeen[].cell`. Last seen comes from observation history (`src/combat/visibility.ts:609-648`). | Observation history is not persistent map exploration, so explored is incomplete. Full arrays replace old arrays and remove newly hidden tokens. |

### One asset-ID adapter

Only `src/vtt/handoff/asset-id-map.ts` translates current art IDs into the nine logical IDs. Role-aware rules map `art.map.floor.stone*.v1`→`tile.stone.floor`, `art.map.wall.stone*.v1`→`wall.stone`, `art.map.door.wood*.v1`→`door.wood`, crate/barrel→`prop.barrel`, table→`prop.table`, pillar→`prop.pillar`, light-source/torch→`prop.torch`, player token→`token.adventurer`, and goblin/other monster token→`token.goblin`. Existing IDs use a branded `art.<kind>...v<n>` form (`src/assets/ids.ts:1-16`), but v1 asset IDs stay strings.

Unknown fallbacks are floor→`tile.stone.floor`, wall→`wall.stone`, door→`door.wood`, other prop→`prop.pillar`, PC token→`token.adventurer`, monster→`token.goblin`. Return `{assetId,fallbackUsed,sourceAssetId}` so tests/reports expose fallback; never rewrite engine art. An isometric-only delivery retains current top-down starter/fallback art until a v1 `view:"top-down"` frame exists.

### `token.move` inverse

After parsing, find the seat-visible token and current projected `{w,h}`. Compute `column=to.x−(w−1)/2`, `row=to.y−(h−1)/2`; require safe integers and z=0 or return `INVALID_DESTINATION`. Examine only current revision-bound legal `move` commands for that token's owned combatant; require exactly one whose final path cell equals that anchor and whose resulting controlled footprint yields the requested center/footprint. Dispatch that existing command unchanged. Zero matches is `ILLEGAL_MOVE`; multiple is `AMBIGUOUS_MOVE`. Tests independently pin anchor `(2,3)` as Medium `(2,3)`, Large `(2.5,3.5)`, Huge `(3,4)`, Gargantuan `(3.5,4.5)`, and squeezed-Large-as-Medium `(2,3)`, then cover inverses, fractional centers, bounds, stale offers, arbitrary destinations, and cross-seat ownership. The model never supplies coordinates, paths, dice, DCs, damage, or reducer commands.

## C–D. Dependent implementation steps

Each step names one reversible decision, exact resources, implementation, targeted gate, authoritative verification, docs/report impact, rollback, and assumptions. Generated JSON is excluded from hand-written-line budgets but never substitutes for an independent invariant.

Resource status is explicit: S0a modifies two manifests and adds one test; S0b adds three tools/one test and modifies the package; S1 adds two source, two schema, one test; S2a modifies visibility/projections and adds adapter/map/test; S2b adds builder/generator/two fixtures/test; S2c adds publisher/test and modifies package. S3a is the justified seven-file mechanical exception listed in its step; S3b/S3c/S3d use five files each; S3e four. S4 and S5 use five each; S5b four. S6a/S6b use five each and S6c four. S7a/S7b/S7c use five each and S7d one. S8/S9a/S9b use five each, S9c/S9d/S10b four each, and authorized S10a adds five docs.

The final `package.json` aliases are exactly `bootstrap`, `doctor`, `test:engine`, `test:protocol`, `test:worker`, `test:runtime-node`, `handoff:publish`, `art:request`, `art:validate`, and `art:stage`, in addition to existing scripts. Each alias first becomes callable in the step that names it; S10b's handoff-report test requires the final set, while S0a's package-contract test covers only dependency/no-engine-pin policy.

### S0a — Declare validators/transports without materializing dependencies

**Decision.** Add exact direct `ajv@8.18.0` (dev), `ws@8.18.3` (runtime), and `@types/ws@8.18.1` (dev). `ws` is chosen over hand-rolling RFC 6455 because D593 requires fragmentation, ping/pong, close semantics, and size enforcement; the existing relay is explicitly an incomplete echo spike (`tools/discord-launcher/relay-server.mjs:1-60`). Browser code imports only global `WebSocket`, never `ws`. Do not pin Node.

**Resources.** `package.json`; `package-lock.json`; `tests/unit/vtt/handoff-package-contract.test.ts` (new).

**Implementation.** Use manifest-only commands:
```sh
npm install --save-dev --save-exact --package-lock-only ajv@8.18.0 @types/ws@8.18.1
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

### S1 — Verbatim wire contract, concrete art shapes, two validation layers

**Decision/resources.** Use direct Zod 4 (`package.json:43-49`) for runtime structural parsing and direct Ajv 8.18.0 as the independent draft-2020-12 evaluator. Add `src/vtt/handoff/v1/contracts.ts`, `validation.ts`, `contracts/vtt-handoff/v1/protocol.schema.json`, `art.schema.json`, and `tests/unit/vtt/handoff-contract.test.ts`.

**Implementation.** Encode the owner's envelopes, all five methods, and SceneSnapshot exactly. A generic request accepts any string method/object params so unknown methods reach `UNSUPPORTED`; known-method parsers validate their exact params. Every numeric field is finite; only revision/seq are additionally safe integers. All strings may be empty. Add no positivity, nonempty, UUID, bounds, or known-ID wire restriction.

Art request is `{schemaVersion:1,requestId:string,assetId:string,brief:string,views:View[],passes:Pass[],pixelsPerCell:number,footprint:{w:number,h:number}}`, with `View="top-down"|"isometric"` and `Pass="albedo"|"normal"|"emissive"`. Result is `{schemaVersion:1,requestId:string,status:"complete"|"partial"|"blocked",assets:Asset[],provenance:Provenance,errors:string[]}`. `Asset={assetId:string,footprint:{w:number,h:number},heightCells:number,pixelsPerCell:number,frames:Frame[]}`. `Frame={facing:number,frameIndex:number,view?:View,width:number,height:number,pivotPx:[number,number],albedo:string,normal?:string,emissive?:string}`: image fields remain path strings. `Provenance={sourceFiles:string[],files:{path:string,sha256:string}[],frameViews?:{path:string,view:View}[],normalMapConvention:"opengl-positive-y"|"directx-negative-y"|"none",tool:string,notes:string}`.

`provenance.files` has exactly one entry for every frame image and every source path, no extras. Optional frame view wins; otherwise the request has one view or exactly one `frameViews` entry keyed by albedo path, inherited by normal/emissive. Semantic uniqueness is asset ID and `(resolvedView,facing,frameIndex)`. A separate semantic layer enforces entity IDs, door-wall FKs, view/pass duplicates, path/pass consistency, request identity, lowercase SHA-256, exact hash-path set, UUID filename prefix, and relative containment for frames and source files. Counterexamples pass Zod/Ajv structure and fail semantics. Boundary fixtures accept empty strings plus zero/negative/fractional finite sizes/coordinates/radii/intensity/facing and negative safe revision/seq; reject nonfinite/unsafe values. Feasibility later returns explicit engine error codes.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor confirms Zod/Ajv structural parity and semantic-only counterexamples. Roll back five files. S0 materialization is prerequisite. Required `Frame.view` is not v1.

### S2a — D359-safe snapshot/coordinate/asset adapter

**Decision.** Carry real token identity/visible cells through the existing filtered player seam, then project only safe board views.

**Resources.** `src/combat/visibility.ts`; `src/vtt/encounter-projections.ts`; `src/vtt/handoff/asset-id-map.ts`; `src/vtt/handoff/scene-snapshot.ts`; `tests/unit/vtt/scene-snapshot.test.ts`.

**Implementation.** Add `tokenId:TokenId` to `PlayerVisiblePlacedCombatant`, classify it in a new exhaustive nested `PLAYER_PLACED_COMBATANT_VIEW_CLASSIFICATION` as `per_seat`, and populate from token only after hidden/fog/LOS checks in both the player constructor and the inherited DM constructor. Add `visibleCells` to `PlayerBoardProjection` by cloning `view.cells`. Implement B exactly, deterministic ordering, fallback telemetry, center/inverse helpers, wall dedupe, companion door wall. Overloads accept `DmBoardProjection` or `PlayerBoardProjection`, never `EncounterState`.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/scene-snapshot.test.ts tests/unit/combat/visibility.test.ts tests/unit/vtt/encounter-projections.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Hand-written assertions pin centers/round trips for all sizes and squeeze, distinct token/combatant IDs, walls/door FK, visible cells, two seats, hidden removal. S10 documents loss. Roll back five files; persistence is unchanged. Existing board requires rectangular footprint (`src/vtt/encounter-board.ts:821-825`).

### S2b — Real-engine synthetic two-room fixture

**Decision.** One fixed-seed, secret-free builder uses `createEncounter`, real world objects/environment, and real adapter.

**Resources.** `src/vtt/handoff/fixtures/two-room.ts`; `tools/vtt-handoff/generate-fixtures.ts`; `fixtures/scenes/two-room.v1.json`; `fixtures/scenes/two-room.snapshots.v1.json`; `tests/unit/vtt/two-room-fixture.test.ts`.

**Implementation.** Build a 12×8, five-foot scene: dividing wall; one single-cell door between rooms; torch `light-source` plus bright region; barrel/table/pillar objects; adventurer/goblin; fixed clock/RNG; two distinct player bindings; no DM notes/secrets; art package exercises nine logical IDs. First JSON is encoded encounter/session source; second has DM and both player snapshots; player snapshots omit environment-derived lights. Generator supports `--check`. Independent tests assert topology, canonical IDs, door adjacency/reference, exact token centers, seat differences, empty secret fields, seed, and source revision; generated equality is additional.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/two-room-fixture.test.ts tests/unit/vtt/scene-snapshot.test.ts`; `npx vite-node tools/vtt-handoff/generate-fixtures.ts -- --check`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor is authoritative. S10 links fixtures. Roll back five resources. Generated JSON moves only with same-change independent invariants, never regeneration alone.

### S2c — Early immutable core handoff

**Decision/resources.** Publish schemas/types/scenes/snapshots before executable protocol infrastructure. Add `tools/vtt-handoff/publish.ts`, `tests/unit/vtt/handoff-publish.test.ts`; modify `package.json`.

**Implementation.** `handoff:publish -- --core` writes handoff `contracts/v1/{protocol.schema.json,art.schema.json,contracts.d.ts,manifest.json,READY.json}` plus `fixtures/scenes/*`. Each file uses same-directory `.partial`, fsync, rename; manifest records lowercase SHA-256/length; READY is last and permanently says `{core:"ready",examples:"pending"}`. Identical republish is a no-op; differing same-v1 bytes yield `IMMUTABLE_BUNDLE_CONFLICT` before overwrite. No executable transcripts. Reserve append-only `contracts/v1/manifest.entries/`; S5b may add new files but never change S2c bytes. Windows can proceed from schemas and real snapshots.

**Gate.** Contract/fixture/publisher targeted Vitest; `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run handoff:publish -- --core --check`; fast typecheck.

**Verification/docs/rollback/assumptions.** Supervisor publishes twice, tests a conflict in a temp root, and hashes every existing byte. Revert three resources; cache is diagnostic. Core READY is not whole-unit READY.

### S3a — Renderer-neutral persistence/durability port

**Decision/resources.** Rename `BrowserSessionStore`→`SessionStore`, require `flush():Promise<void>`, inject `Clock.now()`. Modify `src/vtt/session-persistence.ts`, `adventuring-day-session.ts`, `dm-bridge/client.ts`, `dm-encounter-host.ts`, `local-session-store.ts`, `tools/ai-dm-conversation.ts`, and `tests/unit/vtt/session-persistence.test.ts`. Seven files are an indivisible compile-breaking mechanical change under ~250 hand-written lines.

**Implementation.** Memory/SQLite get no-op flush; IndexedDB keeps real flush. Remove host duck typing. Update all callers, including bridge `src/vtt/dm-bridge/client.ts:2,47` and tool `tools/ai-dm-conversation.ts:109,696`. Replace ambient metadata time including import `src/vtt/local-session-store.ts:326`.

**Gate.** Persistence/local-store/bridge/live-path targeted Vitest; fast typecheck; implementation-time `rg -n "BrowserSessionStore|new Date\\(" src/vtt tools/ai-dm-conversation.ts tests/unit/vtt` with every result reviewed.

**Verification/docs/rollback/assumptions.** Supervisor pins import timestamp and delayed/failed/no-op flush. Revert seven together. Re-audit remains a gate; newly found callers join this step before edits.

### S3b — Session lifecycle adapter

**Decision.** Rename/delete/restore/import/export/flush ordering becomes a typed port; browser file/folder handles, URL navigation, download, and gestures remain browser-side.

**Resources.** `src/vtt/session-lifecycle.ts`; `src/vtt/local-session-store.ts`; `src/vtt/save-manager.ts`; `tests/unit/vtt/session-lifecycle.test.ts`; `tests/unit/vtt/local-session-store.test.ts`.

**Implementation.** Define typed list/rename/delete/restore/import/export/flush intents and conflict/active-session results. Implement over IndexedDB. Flush before export/restore/delete boundaries and after import before success. Active deletion yields navigation instruction only after close+flush+remove. Preserve different-fingerprint conflict/refusal and revision streams. Test rename, restore, active/non-active delete, duplicate/different import, corruption, flush order/failure, reopen preservation.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/session-lifecycle.test.ts tests/unit/vtt/local-session-store.test.ts tests/unit/vtt/save-manager.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor compares checksummed revision streams after reopen. S10 documents browser boundary. Roll back five files; no save schema/migration.

### S3c — Rich service, seat registry, terminal transactions

**Decision/resources.** Add `src/vtt/encounter-session-service.ts`, service test, engine-boundary test; modify host and projections.

**Implementation.** Expose rich UI intents/selectors and renderer operations plus independent safe DM/player subscriptions. Authoritative registry maps external player IDs to immutable controlled token/combatant sets. Missing/unknown player is `UNAUTHORIZED`; cross-seat move is `FORBIDDEN` without state/event.

Serialize FIFO with terminal outcomes `{committed, refused, cancelled, closed, failed}`. Committed only after the consuming coordinator step applies, identifies the revision it produced, and store flush succeeds; then response/captured snapshot become deliverable. Refused has no reducer and queue continues. Cancelled is pre-apply and queue continues. Closed settles all work and stops acceptance. Recoverable pre-apply failed continues; post-apply/flush failed has no revision claim, emits typed error/current resnapshot, degrades/closes and settles remainder closed. Noncommitted outcomes emit no mutation snapshot. Autonomous reactions/agent steps emit their own snapshots/seq, never a mutation response. Cover existing refusal paths (`src/combat/coordinator.ts:774`, `:848`, `:864`), cancellation, delayed/failed flush, concurrency and closure.

Boundary graph forbids DOM/canvas/IndexedDB/node:fs from core/service. Permitted reducers: coordinator→`reduceSessionEncounter`→`reduceVaneWarrenEncounter`, replay through the session reducer, and exact pacing edge `src/vtt/session-persistence.ts:1090-1127`.

**Gate.** Service/boundary/live-path targeted Vitest and fast typecheck.

**Verification/docs/rollback/assumptions.** Supervisor observes every outcome, deliberate continuation/closure, exact acknowledged revision, and no response before flush. Revert five. Add typed coordinator result rather than infer latest revision.

### S3d — Canonical door intent and fresh offers

**Decision/resources.** Modify coordinator, host, service, door-intent test, persistence test.

**Implementation.** Open `{movement:false,lineOfSight:false,cover:"none"}`; closed `{movement:true,lineOfSight:true,cover:"total"}` (`src/combat/terrain.ts:8-20`). Validate authorization/kind/current canonical triple before cancellation. Invalid/noncanonical is `UNSUPPORTED` with pending request untouched. Same state returns current revision after prior flush, with no reducer/journal/event.

For change, await quiescence of any running `step()`, cancel/journal the outstanding request through existing DM safety (`src/combat/coordinator.ts:333-372`), and apply persisted `world_operation/modify_object`, `actor:activeCombatant,cost:"none"`. The reducer supports `actor:null,cost:"none"` (`src/combat/encounter.ts:12489-12499`); active actor is explicit v1 attribution policy, not missing capability.

Continuations cache/reuse legalActions (`src/combat/coordinator.ts:60-66`, `:725-735`, `:798-799`). Revision-stamp them: after geometry mutation retain turn cursor but discard actions and recompute via the fresh planner (`src/combat/coordinator.ts:830-837`) before reissue. Paused stays paused but dirty; resume recomputes. Old response remains stale (`src/combat/coordinator.ts:502-517`).

**Gate.** Door/persistence/live targeted Vitest and fast typecheck.

**Verification/docs/rollback/assumptions.** Supervisor proves rejection has zero cancellation side effect, pending open/close cancellation, stale/fresh request, newly enabled move after opening, newly invalidated move absent after closing, replay/later movement/triples. Revert five. Broader null-actor door policy is extension.

### S3e — Safe board selectors

**Decision.** Player previews use safe projection only; no DM authority.

**Resources.** `src/vtt/encounter-selectors.ts`; `src/vtt/encounter-projections.ts`; `tests/unit/vtt/encounter-selectors.test.ts`; `tests/unit/vtt/engine-boundary.test.ts`.

**Implementation.** Add DM label selector and player `previewAffectedCellKeys(PlayerBoardProjection,area)` deriving walls only from filtered fields. Characterize offered destination matching. Graph forbids selector imports of `DmView`, `EncounterState`, host, persistence, DOM, transports.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Two seats with concealed geometry yield appropriate distinct previews. S10 documents selector inputs. Roll back four files. If safe geometry is insufficient, return unavailable rather than leak.

### S4 — Dispatcher, authorization, duplicate ledger

**Decision/resources.** Add `src/vtt/handoff/{protocol-runtime,session-authorizer,mutation-ledger}.ts`, protocol test; modify boundary test.

**Implementation.** Parse structure before feasibility. Valid string ID including `""` receives a correlated v1 response. Invalid UTF-8/JSON or missing/non-string ID is uncorrelatable and yields a transport fault, never a fabricated envelope: Worker/in-process typed error event; WebSocket close 1007 for invalid text/JSON and 1002 for protocol/no usable ID. Test a legitimate pending `id:""` beside malformed input.

Unknown/light.set returns `UNSUPPORTED`. Out-of-band principal must match requested role/player. Project exact seat before transport. Reserve mutation ID before queue; any reuse—even identical, concurrent, refused, cancelled or failed—is duplicate and never executes. Ledger is session scoped. Seq starts 1 and increases for every full snapshot independently of revision. Open emits current full snapshot; committed/autonomous changes emit their own; no-op does not. Replacement arrays remove newly hidden entities.

**Gate.** Contract/protocol/service/boundary targeted Vitest and fast typecheck.

**Verification/docs/rollback/assumptions.** Supervisor pins two bindings, cross-seat/role mismatch, hidden removal, terminal outcomes, empty-ID/malformed coexistence, duplicate execution count, revision/seq. Revert five. Principal is transport input.

### S5 — Common logical transport and in-process adapter

**Decision.** All clients implement one `SceneTransport`; in-process avoids extra serialization.

**Resources.** `src/vtt/handoff/scene-transport.ts`; `src/vtt/handoff/in-process-transport.ts`; `tests/unit/vtt/in-process-transport.test.ts`; `tests/unit/vtt/engine-boundary.test.ts`; `package.json`.

**Implementation.** Define `request`, `initialSnapshot`, `subscribe`, `status`, `subscribeStatus`, typed errors, `close`, `dispose`. In-process passes objects while still validating. Close rejects pending reads/unsubscribes and never retries unknown mutation; dispose destroys logical session/ledger. Add `test:protocol`. Also add `test:engine` as `vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts`. Grow the graph entry.

**Gate.** `npm run test:engine`; `npm run test:protocol`, exactly `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Test initial/late subscription, status/error, legitimate empty ID beside malformed typed error, pending close, cleanup, zero serialization calls. S10 defines lifecycle. Roll back five resources.

### S5b — Real executable transcripts as an append-only entry

**Decision/resources.** Add `fixtures/protocol/examples.v1.json`, `tests/unit/vtt/handoff-examples.test.ts`; modify publisher/package.

**Implementation.** Drive the real two-room service, S4 dispatcher and in-process transport with fixed clock/RNG to record DM/two-player open, snapshot, move, door open/close/no-op, light `UNSUPPORTED`, unauthorized/cross-seat/illegal/duplicate responses and events. Independent assertions precede byte comparison; no mock dispatcher. `handoff:publish -- --examples` writes the fixture, new `contracts/v1/manifest.entries/examples.json`, then `contracts/v1/examples.READY.json` last. Never change an S2c byte. Identical is no-op; differing conflicts. Default publish runs core then examples.

**Gate.** Examples/protocol/publisher targeted Vitest; examples publish `--check`; fast typecheck.

**Verification/docs/rollback/assumptions.** Supervisor proves all S2c hashes unchanged. Revert four; core remains usable with examples pending.

### S6a — Real memory-backed Worker

**Decision/resources.** Add Worker entry, transport, explicit memory session store, message-boundary test; modify boundary test.

**Implementation.** A real module Worker/MessageChannel hosts the same service/dispatcher and named memory store/no-op flush. Validate/correlate/status/error/cleanup; malformed input emits typed transport error. No SharedArrayBuffer/Atomics/Node/authoritative DOM. Reload/new Worker creates new memory session/open/full snapshot; page close loses it.

**Gate.** Worker boundary/boundary targeted Vitest and fast typecheck.

**Verification/docs/rollback/assumptions.** Supervisor inspects imports; S6b proves browser. Revert five. Player-hosted Worker is not secret protection.

### S6b — Shipped Worker harness, development proof

**Decision/resources.** Add `src/vtt/handoff/worker-harness.ts`, checked-in handoff Playwright config, worker spec; modify main/package.

**Implementation.** Production `/vtt-handoff` drives Worker via v1 and renders synthetic scene/controls; separate from `/vtt`. Config has absolute testDir/webServer cwd, required `PLAYWRIGHT_PORT`, rejects 4173, workers1/nonparallel/baseURL/headless/trace, `AI_BRIDGE_FAKE=1`, unique `/tmp` cache. `test:worker` is single-spec Playwright. Spec proves actual Worker resource, correlation, empty ID, malformed error, validation, mutation/event, initial, reconnect/resnapshot, duplicate, cleanup; attach `artifact=dev` and URLs.

**Gate.** `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts`; fast typecheck. No build.

**Verification/docs/rollback/assumptions.** Supervisor records dev artifact. Revert five. Harness has synthetic data only.

### S6c — Fresh-dist browser proof

**Decision/resources.** Add `tools/vtt-handoff/serve-existing-dist.mjs`, unit test; modify config/spec.

**Implementation.** Loopback server refuses missing/unstamped dist, never builds, safely serves dist only. Dist spec records commit/hash/Worker URL and rejects dev marker.

**Gate.** Lane runs server unit test+fast typecheck only. After fresh supervisor build: `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dist npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts`.

**Verification/docs/rollback/assumptions.** Supervisor records exact artifact. Revert four. Fresh supervisor-produced dist is mandatory.

### S7a — WebSocket factory and pre-upgrade authentication

**Decision/resources.** Add `tools/vtt-handoff/{node-runtime,node-runtime-main}.ts`, node-runtime test; modify serve/package. Typed factory has no startup side effect; main listens; only `serve -- --vtt-runtime` launches vite-node child. Hard-bind 127.0.0.1, upgrade `/vtt/v1`.

**Implementation.** Operator supplies `VTT_RUNTIME_TOKENS_FILE`, a nonsymlink regular mode-0600 bounded JSON `[{tokenSha256,role:"dm"|"player",playerId?}]`; hashes unique lowercase SHA-256, player requires ID, DM omits. Before a socket exists, upgrade validates loopback Host, key/version, Origin allowlist (originless only explicit flag) and `Sec-WebSocket-Protocol` proposals `vtt.v1` plus exactly one `bearer.<base64url-token>`. Hash/constant-time match; failure sends HTTP 401 and destroys before `handleUpgrade`. Echo only `vtt.v1`; never URL/log token; no auth frame.

Use exact-pinned `ws`, noServer, maxPayload 1,048,576, compression off. Reject binary. Library handles masked fragmentation, ping/pong, close; enforce 1002 protocol, 1007 invalid text/JSON, 1008 policy, 1009 size, five-second open deadline.

**Gate.** Factory unit test+fast typecheck only; never npm serve/build.

**Verification/docs/rollback/assumptions.** Supervisor tests file mode/symlink/claims, two player tokens, bad handshake/token, pre-upgrade no-session, fragmentation/ping/pong/close/binary/size. Revert five. Operator provisions tokens out of band.

### S7b — Authenticated socket sessions and WebSocket client

**Decision/resources.** Add browser-safe websocket transport/test; modify factory/boundary/package.

**Implementation.** Global `new WebSocket(url,["vtt.v1","bearer."+token])`; no `ws` in src. Authenticated socket is session; first text envelope is session.open, whose result stays `{sessionId,capabilities}`. Requested role/player must match token claim or `UNAUTHORIZED`; two-player tests use two tokens.

Per socket: service, seat, ledger, seq, events. Open response then full snapshot; buffer latest for initial/late subscriber. Same DM principal may create two independent sessions. Reconnect is new socket+open+full snapshot+fresh ledger; never retry unknown mutation. Close/dispose cancels pending and cleans in finally. Browser parity Origin is exact `http://127.0.0.1:4410`; token enters harness memory/input, never URL.

**Gate.** `test:runtime-node` is exact targeted Vitest node-runtime/websocket/protocol/boundary list; run plus fast typecheck.

**Verification/docs/rollback/assumptions.** Test two DM sessions, two player claims/mismatch, late subscribe, reconnect, cleanup, empty ID/malformed close. Revert five; retain factory.

### S7c — Three-runtime parity

**Decision/resources.** Add conformance helper, unit parity, browser parity; modify config/boundary test.

**Implementation.** Identical fixed scene/clock/RNG covers correlation/boundaries/auth/initial/move/door/no-op/light unsupported/outcomes/reconnect/late/hidden/duplicate/malformed/cleanup/no retry. Unit compares in-process/Node; browser compares Worker/WebSocket via ephemeral Node allowing exact 4410 Origin and token outside URL. Equality is secondary to handwritten center/removal/ownership/revision/seq/one-execution pins. Source graph from UI/inprocess/Worker/Node converges on service/permitted reducer and excludes cross-runtime imports.

**Gate.** Targeted parity/boundary Vitest; single parity Playwright spec at 4410; fast typecheck.

**Verification/docs/rollback/assumptions.** Record Node port0 and artifact=dev. Revert five. Common-code parity is not an oracle.

### S7d — Real npm launch, supervisor serialized

**Decision/resources.** Add `tests/integration/vtt/node-runtime-launch.test.ts`.

**Implementation.** Create temp mode-0600 claims file; spawn real `npm run serve -- --vtt-runtime --port 0`; parse endpoint; handshake/open/snapshot; terminate; prove child cleanup.

**Gate.** Because serve prepares dist (`tools/serve.mjs:28-68`), only supervisor runs after fresh build: `npx vitest run --configLoader runner tests/integration/vtt/node-runtime-launch.test.ts`.

**Verification/docs/rollback/assumptions.** Record fresh artifact. Remove one file. Port0 only.

### S8 — Existing top-down UI remains in-process

**Decision/resources.** Modify encounter app, rich service, lifecycle, boundary test; add top-down smoke. The 3,135-line adapter is indivisible, but forwarding stays under ~250 lines.

**Implementation.** Route every A6 mutation and A2 lifecycle bypass through typed rich services. Keep handles/download/navigation/localStorage/BroadcastChannel/DOM in browser adapters. Move three direct rule reads to S3e selectors; player preview gets safe projection. Do not inject five-method SceneTransport/Worker into `/vtt`.

Smoke clicks “Load bundled dungeon and party” as existing test does (`tests/browser/vtt-encounter.spec.ts:26-39`), waits deterministic human request, chooses first enabled revision-bound move differing from anchor, records offered destination/DOM coordinates, confirms, and asserts revision/DOM destination. One in-process case. Optional top-down art resolves through frame view/provenance; isometric-only retains current fallback.

**Gate.** Boundary/lifecycle/selectors Vitest; one top-down Playwright spec at 4410; fast typecheck.

**Verification/docs/rollback/assumptions.** Supervisor records artifact=dev and unchanged visuals. Revert five. No art/capture/atlas/context pins change.

### S9a — RFC 9562 UUIDv7 and non-destructive requests

**Decision.** Implement monotonic-within-ms UUIDv7 and new handoff queue; existing queue untouched.

**Resources.** `tools/vtt-handoff/uuidv7.ts`; `tools/vtt-handoff/art-request.ts`; `tests/unit/vtt/uuidv7.test.ts`; `tests/unit/vtt/art-request.test.ts`; `package.json`.

**Implementation.** Encode 48-bit Unix ms, version 7, RFC variant `10`, 12-bit per-ms monotonic counter initialized from injected random, 62 random bits; counter exhaustion waits/fails via clock, never wraps. Test timestamp round-trip, nibbles, deterministic randomness, lexical monotonic ordering, rollback-clock, collision refusal. Add `art:request`; it exclusive-writes `art/outbox/<uuidv7>.request.json` via `.partial`/rename. Generate nine logical requests with top-down/isometric views, relevant passes, 128 px/cell, consistent clean-room style, ground-center pivot/scale and 0/90/180/270 facings. Transparency rule per ID: tile/wall/door may be opaque; barrel/table/pillar/torch/adventurer/goblin require transparent backgrounds. No third-party names.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/uuidv7.test.ts tests/unit/vtt/art-request.test.ts tests/unit/vtt/handoff-contract.test.ts`; `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:request -- --check`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor confirms nine unique valid files. S10 distinguishes queues. Roll back five resources; outbox cache preserved. Existing tracked flow remains as documented (`art/requests/README.md:20-47`).

### S9b — Complete bounded PNG/result validation

**Decision/resources.** Add PNG/art validators and tests; modify package.

**Implementation.** Scan completed result JSON only, ignoring `.partial`; require relative UUID-prefixed frame/source paths under bundle. Validate S1 shape/semantics, identity, duplicates, exact provenance hash set, passes, traversal/drive/UNC/symlink, regular files, 64MiB/file and 256MiB/bundle. Never execute scripts.

Beyond existing header helper (`src/assets/png.ts:213-219`), walk chunks with lengths/CRC, exactly one first 13-byte IHDR, legal methods, noninterlaced 8-bit RGBA6, contiguous IDAT, terminal zero-length IEND/no trailing. Bounds: 8192², 64m pixels, 64MiB compressed, 256MiB decoded with overflow checks. Inflate via node:zlib with maxOutputLength, exact scanline length/filter 0–4, unfilter; normal/emissive align. Image validity is separate from transparency: opaque tile/wall/door is valid; four props/two tokens require some alpha<255.

**Gate.** PNG/art/contract tests; validate JSON command; fast typecheck.

**Verification/docs/rollback/assumptions.** Controls include valid opaque floor/transparent prop, opaque-prop rejection, truncated/corrupt IDAT, inflate/CRC/order/length/IHDR/IEND/trailing/filter/bombs/path/symlink/hash/view/pass/identity. Revert five; inbox untouched.

### S9c — Descriptor-anchored revalidated staging

**Decision/resources.** Add art-stage/safe-files/test; modify package.

**Implementation.** Distrust reports; reopen request/result and every provenance image/source, rerun S9b, bind exact result bytes/hashes, compare before/after copy. On Linux open roots and every directory component with `O_DIRECTORY|O_NOFOLLOW`, retain parent fds, open child via `/proc/self/fd/<fd>/<component>`, fstat dev/inode/type, and require proc-fd realpath equal expected canonical path without deleted/symlink component. Open final relative to retained parent with `O_RDONLY|O_NOFOLLOW`, bounds/hash/refstat. Node lacks openat: document `/proc` dependency and doctor refusal. Apply to manifests, provenance sources, images and anchored O_EXCL destination.

Stage `.partial`, fsync/hash destination, revalidate result before review manifest last. Failure publishes no completion. Never public art, overwrite, serve inbox, relicense, or change notices.

**Gate.** Staging/validator/PNG tests; stage `--check`; fast typecheck.

**Verification/docs/rollback/assumptions.** Controls: changed/forged/stale manifest, final symlink/inode swap, parent-dir swap between opens with outside-read count zero, changed source, oversize, destination collision/postcopy mismatch. Revert four; preserve originals and existing pins (`tests/unit/assets/starter-art.test.ts:53-118`; `tests/unit/source-is-greppable.test.ts:45-83`).

### S9d — Real Windows interop probe

**Decision.** Structured NOT_RUN/UNAVAILABLE never passes and makes whole handoff PARTIAL.

**Resources.** `tools/vtt-handoff/windows-probe.ts`; `tests/unit/vtt/windows-probe.test.ts`; `package.json`; `tools/vtt-handoff/doctor.ts`.

**Implementation.** Return `{status:"PASSED"|"NOT_RUN"|"UNAVAILABLE"|"FAILED",linuxPath,windowsPath,checks,reason}`. Without `VTT_WINDOWS_INTEROP=1`: NOT_RUN. Enabled without WSL/PowerShell: UNAVAILABLE. Neither increments pass. When available derive UNC; `powershell.exe` writes random bytes through UNC and Linux hashes; Linux writes different bytes and PowerShell reads/hashes; require both directions and remove only named probes. Unit tests injected runner/classification; actual command is separate, never `.skip`. No watcher claim.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/windows-probe.test.ts`; actual: `VTT_WINDOWS_INTEROP=1 VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/vtt-handoff npm run doctor -- --windows-probe --json`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor records structured result. S10 status uses it. Roll back four resources. Binding proof runs from owner checkout; worktree probe is diagnostic.

### S10a — Authorized durable docs

**Decision/resources.** Add exactly `docs/vtt-handoff/{architecture,runtime-api,protocol-v1,art-exchange,security-and-integration}.md`; this scope is expressly authorized.

**Implementation.** Document six boundaries/one reducer, rich service versus v1, terminal outcomes, Worker memory/harness, handshake subprotocol/token file/socket reconnect, exact v1/refusals/lossy mapping/light audience/door geometry, art shapes/limits/Linux staging, ownership, probe, future WSS/origin/deployment, Windows connection points.

**Gate.** Targeted `rg` for SceneSnapshot/Sec-WebSocket-Protocol/VTT_RUNTIME_TOKENS_FILE/loopback/Worker trust/PARTIAL/art/UNSUPPORTED/memory; contract/boundary tests.

**Verification/docs/rollback/assumptions.** Supervisor cross-checks. Remove five docs; no docs/specs edit.

### S10b — Reproducible reports/readiness

**Decision.** Publish reports only in handoff `reports/claude`; required failure/not-run means PARTIAL.

**Resources.** `tools/vtt-handoff/report.ts`; `tools/vtt-handoff/publish.ts`; `tests/unit/vtt/handoff-report.test.ts`; `package.json`.

**Implementation.** Write `reports/claude/READY.md` and `handoff.json` via temp+rename. Include repo/commit/changed files; actual tool versions/commands; contract/checksum/fixtures; adapters/methods; art paths/sample IDs; test outcomes/pre-existing failures; Windows result; limitations/connection points. Never `reports/windows`. Overall READY only if required gates pass and Windows probe PASSED; otherwise PARTIAL with reasons. Contract READY.json means atomic bundle only.

**Gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-report.test.ts tests/unit/vtt/handoff-publish.test.ts`; `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run handoff:publish -- --check`; `npm run typecheck:fast`.

**Verification/docs/rollback/assumptions.** Supervisor simulates gate failure/UNAVAILABLE and confirms PARTIAL. Roll back four resources. Report accepts supervisor results, never planned-as-passed.

## E. Security and side-effect statement

Conditional on A's inspected surfaces: only explicit `serve -- --vtt-runtime` adds a listener, hard-bound 127.0.0.1 and absent by default. Upgrade validates Host/Origin/key/version/subprotocol/token before socket/session; failure is HTTP 401+destroy. Browser offers `vtt.v1` and `bearer.<token>` through `Sec-WebSocket-Protocol`; server echoes only `vtt.v1`. Claims come from local mode-0600 `VTT_RUNTIME_TOKENS_FILE`; no token URL/log/report. Requested role/player must match principal.

Per-seat projection precedes postMessage/WebSocket. Token ID enters after D359 filtering; arrays remove hidden; environment lights, raw state, DM semantic export, notes/options and AI bridge never enter player channels. A player-hosted Worker cannot protect secrets; fog is presentation and its memory state dies with the page. Inbox is hostile; validators bound JSON/PNG/decompression and staging reopens manifests/images/sources through descriptor chains/hashes. Delivered scripts never execute.

This unit does not touch frozen `src/vtt/intel/contracts.ts`, saved schemas/coordinates/IDs, production art/notices, Windows/Godot, existing `/dm/*`, MCP, P2P VTT, firewall, port 4173, or model authority. No `any`, suppressions, skipped/todo/weakened/deleted tests, or regenerated pins.

## F. Gate battery and negative controls

### Cumulative targeted suite

```sh
npx vitest run --configLoader runner \
 tests/unit/vtt/handoff-package-contract.test.ts \
 tests/unit/vtt/handoff-bootstrap.test.ts \
 tests/unit/vtt/handoff-contract.test.ts \
 tests/unit/vtt/scene-snapshot.test.ts \
 tests/unit/vtt/two-room-fixture.test.ts \
 tests/unit/vtt/handoff-publish.test.ts \
 tests/unit/vtt/handoff-examples.test.ts \
 tests/unit/vtt/session-lifecycle.test.ts \
 tests/unit/vtt/encounter-session-service.test.ts \
 tests/unit/vtt/door-intent.test.ts \
 tests/unit/vtt/encounter-selectors.test.ts \
 tests/unit/vtt/protocol-runtime.test.ts \
 tests/unit/vtt/in-process-transport.test.ts \
 tests/unit/vtt/worker-message-boundary.test.ts \
 tests/unit/vtt/serve-existing-dist.test.ts \
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
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts runtime-parity.spec.ts
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts
```

No outer flock or 4173. `test:worker` is Playwright; engine/protocol/runtime-node aliases are Vitest.

### Supervisor full/artifact battery

```sh
npx tsc -b --force
sg scan
npm run test:gate
npm run build
npx vitest run --configLoader runner tests/integration/vtt/node-runtime-launch.test.ts
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dist npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npm run test:gate:browser
```

Fresh supervisor build is prerequisite for launch and dist-browser gates; targeted unit gates never build. Record dev/dist, commit and artifact hash. Then publish/art/probe. Any required failure or non-PASSED probe is PARTIAL. Never regenerate pins.

### Supervisor-owned effective negative controls

For each row: save exact bytes/SHA in named `/tmp`, apply one behavioral mutant, prove it applied with diff/rg/hash, run exactly the selected assertion and require 1 failed/nonzero, restore via patch, verify SHA, rerun and require 1 passed/zero. Never commit mutants or regenerate fixtures.

| Invariant | Effective mutant | Assertion that must fail and why |
| --- | --- | --- |
| authorization | Let player-A token accept requested DM and execute door change. | `protocol-runtime.test.ts -t "requested role cannot grant DM authority"` pins UNAUTHORIZED, unchanged revision, reducer count 0; mutant succeeds/changes. |
| hidden removal | Retain prior tokens when next array is empty. | `protocol-runtime.test.ts -t "removes a token that becomes hidden"` pins IDs `[]`; mutant retains ID. |
| anchor | Remove forward center offset (or both) for non-1×1. | `scene-snapshot.test.ts -t "pins ground centres for every controlled footprint"` pins B's five literal centers, so large sizes fail even if inverse changes. |
| duplicate | Bypass ledger and submit same ID twice. | `protocol-runtime.test.ts -t "never executes a duplicate mutation id"` pins reducer count 1/revision delta 1; mutant yields 2/2. |
| reducer route | Make in-process move bypass service and call imported `reduceEncounter`. | `engine-boundary.test.ts -t "all runtime entries converge on the session reducer"` pins zero forbidden graph edges; mutant reports one. |
| staging | Replace descriptor reads with ordinary resolved read, then swap parent to outside sentinel at hook. | `art-stage.test.ts -t "never reads through a swapped parent directory"` pins refusal/outside reads 0; mutant reads/succeeds. |

Supervisor records mutation proof, selected/executed=1, mutant `1 failed`, restored `1 passed`, exit codes and restored SHA.

## G. Open questions and proposed v1 extensions

### Open owner questions

None blocks v1. D593 settles handshake WebSocket; D594 settles no Node pin; supervisor settles duplicates, docs, optional art view/hash placement, Worker/UI split, doors and player lights. Public exposure, browser-secret trust, art promotion/relicensing, or a required v1 field requires a new decision.

### Proposed extensions — not v1

1. Require `Frame.view`; v1 keeps it optional and resolves through a single request view or optional provenance `frameViews`.
2. Scene hierarchy, elevation, variable grid, stored facing, persistent explored cells.
3. Wall/door orientation, thickness, cover, multisegment linkage and source IDs.
4. Authored photometry/enabled and real light toggle.
5. More art views/passes, animation/source-license fields, other PNG modes.
6. HTTP+SSE alternative or public WSS/deployment authentication.
7. Durable Worker persistence/rich-service Worker proxy; shipped harness is memory-backed.
8. Cross-reconnect mutation receipts/idempotency; v1 never blindly retries and ledger is socket-scoped.
9. Rich errors/capabilities, delta events or transport session handle.
10. Broader door policy using existing null-actor capability.

Stop after S10b plus supervisor gates/negative controls: top-down remains in-process through the rich service; the separate Worker harness and WebSocket use the same service/dispatcher/reducer; immutable core/examples and art exchange are ready; reports are honest READY/PARTIAL; Windows/Godot remains disconnected.
