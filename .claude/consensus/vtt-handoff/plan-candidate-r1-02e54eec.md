# VTT-HANDOFF-01 implementation plan

Date: 2026-09-09  
Planning worktree: `/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff`  
Planning revision: `0f84e09f822ff614eec944aaf48f61e13475f22d` on `claude/vtt-handoff`  
Owner-designated repository: `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static`  
Bootstrap wire-contract version: `1`

## Scope, precedence, and stopping point

This plan implements the backend/preparation half only. The TypeScript encounter engine remains authoritative; the Godot proof of concept remains a disconnected Windows-owned mock in this unit. The finished unit stops when the existing top-down application still works, the same rules/session implementation is reachable in-process, in a real browser Worker, and from the opt-in DM-local Node process, and the immutable contract/fixture and art-exchange handoffs are ready for later integration. It does not build Godot, edit `%USERPROFILE%\VTT-Godot-POC`, inspect or write a sibling worktree, connect either application, run a model, change a firewall, or expose a public service.

The owner directive names `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static`, while this unit is deliberately being planned and implemented in `/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff`. That mismatch must never be papered over. The single path configuration in S0 defaults to the owner-designated repository's `.tmp/vtt-handoff`, refuses when `git rev-parse --show-toplevel` is not the owner-designated path, and permits a worktree only when the caller explicitly sets `VTT_HANDOFF_ROOT` to an absolute handoff root. Supervisor verification in this worktree therefore always sets:

`VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp/vtt-handoff`

Production publication from the owner-designated checkout uses the default and must confirm the Windows view `\\wsl.localhost\Ubuntu\home\vagrant\PhpstormProjects\dnd-multiclass-spells-static\.tmp\vtt-handoff`. The current checkout is a WSL2 Linux checkout (observed with `pwd`, `git rev-parse`, and `uname -a`); S0's doctor rechecks `/etc/os-release`, `WSL_DISTRO_NAME`, `wslpath`, Git identity, Node/npm/Python, and the lockfile rather than trusting this plan.

The current dispatch forbids edits below `docs/**`, although owner section 6 requires durable documents there. S10 names the exact required documentation files, but it is an authorization boundary: S10's documentation substep must not execute unless the implementation dispatch explicitly permits those paths. S0-S9, the report generator, and the published handoff remain independently implementable. This is not permission to substitute generated `.tmp` reports for durable documentation.

Directive coverage is explicit: owner section 1 is A/S0 and the baseline/characterization gates; section 2 is S1/S2/S4/S4b; section 3 is S3/S8 and the one-reducer boundary test; section 4 is S4-S7 and the parity/security tests; section 5 is S9a-S9c; and section 6 is S0 package aliases, S8 browser smoke, S10 reports/docs, and F's final battery. No numbered directive section is deferred except the currently unauthorized durable-doc write called out above.

## A. Touched-system anatomy

### 1. Rules/game-state core

- `EncounterState` is the canonical aggregate. It owns `revision`, grid bounds, blocked cells, world objects, environment, fog, combatants, tokens, event history, hidden combatants, and observation history (`src/combat/encounter.ts:750-793`). `createEncounter` validates and constructs that state; the reducer returns a new state and advances its revision (`src/combat/encounter.ts:1142-1281`, `src/combat/encounter.ts:12925-12955`).
- Coordinates are already renderer-neutral `GridCell {column,row}` and `GridBounds {columns,rows}` (`src/combat/grid.ts:3-11`). Cells and bounds are safe integers (`src/combat/grid.ts:21-37`), and the engine's grid distance is five feet per cell (`src/combat/grid.ts:71-85`). No saved coordinate conversion is required or allowed.
- `CombatToken` persists a branded token id, related combatant id, grid position, and placement mode (`src/combat/combatant.ts:102-127`). Creature-space construction derives the controlled footprint from the effective size and anchor (`src/combat/creature-space.ts:451-470`); the existing safe projection exposes position, effective size, placement mode, and footprint cells (`src/combat/creature-space.ts:151-156`).
- World objects have branded ids, seven closed mechanical kinds, absolute footprint cells, and a blocking wire with movement, line-of-sight, and cover fields (`src/combat/world-objects.ts:9-20`, `src/combat/world-objects.ts:49-68`; `src/combat/terrain.ts:15-20`). The environment stores light regions as an id, cells, and `bright | dim | darkness`, but stores no emitter radius, color, intensity, enabled bit, or origin (`src/combat/world-objects.ts:70-93`). `WorldOperation` can modify an object and set a region's light level, but it has no enable/disable-light operation (`src/combat/world-objects.ts:115-159`).
- The persisted VTT path has one explicitly named reducer, `reduceVaneWarrenEncounter`, which delegates to the combat reducer and is used by live execution and replay (`src/vtt/session-encounter-reducer.ts:1-14`). `DmEncounterHost` injects exactly that reducer into `TurnCoordinator` (`src/vtt/dm-encounter-host.ts:385-394`). Existing tests already prove live/replay equality (`tests/integration/vtt/dm-encounter-host-live-path.test.ts:130-156`), crash/reload state-RNG-history fidelity (`tests/unit/vtt/session-persistence.test.ts:579-624`), non-repetition after a response-side crash (`tests/unit/vtt/session-persistence.test.ts:649-703`), movement/teleport/forced-movement projection (`tests/unit/vtt/encounter-board-projection.test.ts:374-419`), blocking/LOS/cover behavior (`tests/unit/combat/world-objects.test.ts:150-217`), exact size footprints and hidden removal/last-seen behavior (`tests/unit/combat/visibility.test.ts:127-216`), and the four-room bundled session (`tests/integration/vtt/d365-dungeon.test.ts:113-124`, `tests/integration/vtt/d365-dungeon.test.ts:195-237`). Do not duplicate those fixtures. Add characterizations only for the new seams: matching a requested destination to one current offered move, rejecting an arbitrary or ambiguous destination, a door mutation's journal/replay result, and a visible-to-hidden full-snapshot transition.

### 2. Renderer-neutral application/session service

- `DmEncounterHost` is already the nearest thing to the requested service, not merely a DOM controller. It owns a store, journal, controller registry, coordinator, serializable RNG, subscriptions, bridge, and player bindings (`src/vtt/dm-encounter-host.ts:220-275`); it creates or resumes the journal and injected RNG (`src/vtt/dm-encounter-host.ts:306-358`); and it exposes initial-and-update subscriptions (`src/vtt/dm-encounter-host.ts:421-465`). Its module does not import DOM, canvas, IndexedDB, or Node filesystem APIs.
- Persistence is already a port despite its browser-specific name: `BrowserSessionStore` has only append/appendAll/revisions, with memory and SQLite implementations (`src/vtt/session-persistence.ts:299-307`, `src/vtt/session-persistence.ts:376-410`). `EncounterSessionJournal.resume` restores state, coordinator, controller identities, and RNG (`src/vtt/session-persistence.ts:1607-1678`) and every append persists the canonical state plus RNG and checksum (`src/vtt/session-persistence.ts:2306-2339`). IndexedDB and the wall clock are isolated in `IndexedDbBrowserSessionStore`; `new Date()` is used while writing browser save metadata (`src/vtt/local-session-store.ts:239-315`).
- Decision: do not build a parallel service or reducer. Introduce a small `EncounterSessionService` interface and typed `EncounterSessionIntent`/query API, and make/refactor `DmEncounterHost` as its one implementation. Rename the persistence port to renderer-neutral `SessionStore` while updating callers in the same step; concrete IndexedDB stays in its adapter. Inject a clock into that adapter so no service/core module acquires ambient time.

### 3. Protocol/validation and view projection

- There is no bootstrap v1 renderer protocol or `SceneSnapshot` today. The existing database RPC is a different contract: numeric request ids, generic methods, and responses with optional error data (`src/rpc/protocol.ts:3-9`, `src/rpc/protocol.ts:18-47`). Its client correlates pending requests and rejects them on close (`src/rpc/client.ts:49-123`); those lifecycle ideas may be reused, but the v1 shapes and string ids must remain separate.
- D359 already supplies the mandatory secrecy boundary. The exhaustive classification marks environment and notes DM-only and blocked cells, world objects, combatants, tokens, and observation history per-seat (`src/combat/visibility.ts:24-68`). `DmView` prevents raw state from being passed as a view, and player seats bind visibility to a combatant (`src/combat/visibility.ts:91-103`). `projectPlayerView` is the only canonical state-to-player projection, omits hidden/unseen combatants before copying their geometry, obtains last-seen anchors from observation history, and filters fogged cells and world objects (`src/combat/visibility.ts:548-659`). This implements decision D359's requirement that leakage fail at the projection type boundary (`.claude/decisions.md:4771-4781`).
- `encounter-projections.ts` then creates DM/player board projections; `DmEncounterHost.snapshot()` calls `projectPlayerView` before `projectPlayerBoard` and `projectDmView` before `projectDmBoard` (`src/vtt/dm-encounter-host.ts:421-449`). The new adapter must accept only those seat-safe projections, never a raw `EncounterState` at an untrusted transport boundary.

### 4. Browser-Worker runtime

- There is no VTT/encounter engine Worker. The actual engine is constructed in the main-thread `DmEncounterView` (`src/vtt/encounter-app.ts:1361-1434`). The existing real module Worker is the SQLite worker, created with `new Worker(new URL('./db/worker.ts', import.meta.url), {type:'module'})` and ordinary `postMessage` (`src/main.ts:176-195`); it validates its unrelated numeric RPC at the worker edge (`src/db/worker.ts:104-135`). The other source Worker is a browser-capability probe, not the encounter engine (`src/pwa/browser-capability-worker-port.ts:64-66`).
- Vite builds worker graphs through their own plugin pipeline, already guarded separately from the main graph (`vite.config.ts:181-230`), and the app TypeScript configuration includes WebWorker types with strict and exact optional-property checks (`tsconfig.app.json:2-19`). S6 follows that established Vite URL pattern, uses a transferred `MessagePort`, and does not use `SharedArrayBuffer`.

### 5. Node/npm runtime

- `npm run serve` invokes `tools/serve.mjs` (`package.json:8-18`). That script builds/restores `dist`, serves only GET/HEAD static content, binds `127.0.0.1`, and defaults to port 4173 (`tools/serve.mjs:1-7`, `tools/serve.mjs:53-68`, `tools/serve.mjs:135-181`). VTT-HANDOFF tests must never use 4173.
- A separate Node engine MCP process exists over stdio: its launcher calls `src/vtt/mcp/entrypoint.ts` (`tools/engine-mcp-server.ts:1-3`), and that entrypoint imports Node readline/filesystem and parses duplicate-free JSON lines (`src/vtt/mcp/entrypoint.ts:1-14`, `src/vtt/mcp/entrypoint.ts:67-147`). It is an AI-DM tool surface, not the five-method renderer protocol, and it must remain unchanged.
- Correction to the audit inventory: there *is* an HTTP `/dm/*` server outside the Vite development bridge. `tools/discord-launcher/codex-dm-bridge.mjs` binds 127.0.0.1 and serves `/dm/session`, `/dm/exchange`, and `/dm/mirror` (`tools/discord-launcher/codex-dm-bridge.mjs:81-119`), matching the localhost-only client calls (`src/vtt/dm-bridge/client.ts:88-91`, `src/vtt/dm-bridge/client.ts:123-128`, `src/vtt/dm-bridge/client.ts:167-206`). It exchanges AI projections and mirrors journals; it is not a game-session authority, and its browser role model is unsuitable for the v1 renderer API. Do not overload those routes.
- The Vite AI bridge is development-only and is excluded from builds by four guards (`tools/ai-bridge/plugin.ts:1-17`); it uses a generated token and Vite middleware (`tools/ai-bridge/plugin.ts:338-374`). S7 similarly requires explicit opt-in and a token, but attaches to the existing production-local serve workflow rather than the dev bridge.
- `package-lock.json` and npm are the current package manager, Zod 4.4.3 is already installed, and no new runtime validation dependency is needed (`package.json:43-65`). `package.json` currently has no `engines` member (`package.json:1-67`), and repository inventory found no `.nvmrc`; S0 adds both rather than guessing an implicit version.

### 6. Existing top-down UI adapter

- `/vtt` dynamically imports and mounts `encounter-app.ts` (`src/main.ts:55-82`). The board is imperative DOM: `renderBoard` creates `.encounter-board`, cells, layers, and token overlays from the pure encounter board render model (`src/vtt/encounter-app.ts:672-709`, `src/vtt/encounter-app.ts:729-855`). D516 binds this as the current top-down grammar (`.claude/decisions.md:10142-10148`), while D505/D508 require alternative renderers to share the same encounter state (`.claude/decisions.md:9888-9895`, `.claude/decisions.md:9912-9923`).
- The renderer-neutral board projection carries bounds, canonical terrain, light regions, combatants, and world objects (`src/vtt/encounter-board.ts:97-142`). `projectEncounterTerrainCells` uses the canonical terrain query (`src/vtt/encounter-board.ts:368-375`). `encounterBoardRenderModel` creates row-major cells and chooses floor/wall/door/terrain layers (`src/vtt/encounter-board.ts:846-989`), while token models join combatants to engine art-package ids and enforce rectangular footprints (`src/vtt/encounter-board.ts:782-843`). The handoff snapshot adapter must consume this same model rather than re-deriving tiles or props.
- All state-changing calls in `encounter-app.ts` already go through `DmEncounterHost`; the complete call-site inventory is: construction/lifecycle and reads at lines 1399, 1415-1436, 2374, 2388, and 3060; human/start calls at 1431, 1563, 1578, and 1592; placement at 2071; interrupt/resume/undo/skip/delay/day/room/rest at 2211, 2215, 2219, 2225, 2273, 2285, 2347, 2361, 2378, 2458, and 2541; adjudication/pending/refusal at 2645, 2686, and 2709; preferences at 2754, 2795, and 2823; world-object/adjudicate/controller calls at 2896, 2932, and 2974 (`src/vtt/encounter-app.ts:1361-1436`, `src/vtt/encounter-app.ts:1545-1596`, `src/vtt/encounter-app.ts:2055-2071`, `src/vtt/encounter-app.ts:2195-2458`, `src/vtt/encounter-app.ts:2630-2823`, `src/vtt/encounter-app.ts:2883-2974`, `src/vtt/encounter-app.ts:3055-3062`). S8 changes the receiver from a concrete host to the service interface and typed intents without changing behavior.
- There are no direct `createEncounter`, `reduceEncounter`, or persisted-reducer calls in `encounter-app.ts`. There are exactly three direct read-only rules calls: `terrainProfile` for object label text at line 830, plus `previewAffectedCells` and `terrainWallCells` for spell preview at lines 1146 and 1149 (`src/vtt/encounter-app.ts:826-838`, `src/vtt/encounter-app.ts:1139-1158`). S8 moves all three behind service selectors. The branded `encounterSessionId` conversions at lines 1629, 1657, and 2379 are identity parsing, not reducer/rules execution, but S8 also centralizes session-id parsing at the factory boundary.

### Explicit MISSING-COMPONENTS list

1. No `SceneSnapshot`, request/success/failure/event v1 types, draft-2020-12 schema, examples, validation, or immutable publisher.
2. No real encounter-engine browser Worker, Worker transport, or renderer-runtime lifecycle API.
3. No v1 Node renderer endpoint. The static server, stdio MCP server, AI `/dm/*` bridge, and Yjs/Trystero shared tabletop are different systems.
4. No common renderer transport interface spanning request, subscription, initial snapshot, status/error, and disposal. The Yjs `VttTransport` only sends binary document updates and peer/status events (`src/vtt/transports/transport.ts:1-26`), and belongs to the separate shared tabletop.
5. No handoff-root configuration/layout, durable handoff contract source, checksum/READY publication, or Claude handoff report. `.tmp/` is ignored (`.gitignore:28-32`) and the root does not currently exist.
6. No current Node-version declaration in `.nvmrc`/`engines`, bootstrap, or doctor command.
7. No engine scene id, facing, elevation, wall-segment geometry, object presentation asset id, light radius/color/intensity/enabled value, or persistent explored-cell set. These must be explicit adapter projections/placeholders, never written back into saves.
8. No generic `token.move` API. The engine accepts an entire path (`src/combat/events.ts:34-88`), so v1 destinations can only match a unique current revision-bound offered movement command; the adapter cannot invent a path.
9. No light enable/disable mechanic. `set_light_level` is a different operation (`src/combat/world-objects.ts:145-154`), so v1 `light.set` is initially honest `UNSUPPORTED`.
10. No art v1 inbox/result validator/stager or UUIDv7-named outbox matching the shared agreement. The existing tracked queue has a different `<uuid>-<slug>.json` request and flat incoming format (`art/requests/README.md:3-18`, `art/requests/new-request.mjs:37-58`).
11. No public Godot service, no connection to Windows, and no entitlement for a browser-supplied `requestedRole` to grant a seat.

## B. Coordinate and entity mapping to `SceneSnapshot`

All conversion is one-way and pure. It never changes `EncounterState`, session journals, imports, backups, or saved grid coordinates. Arrays are sorted deterministically by id and then row/column/edge where an engine entity expands to multiple output entries. The v1 schema validates every number as finite; revisions/event sequences as safe integers; grid/footprint sizes as positive finite numbers; colors as `^#[0-9A-Fa-f]{6}$`; all arrays as arrays; ids/labels/asset ids as strings; and every object as strict (no unknown fields). The real adapter emits nonempty ids/labels and positive integer grid/footprint counts, but those stronger engine invariants do not silently narrow the owner-specified v1 wire types.

| `SceneSnapshot` field | Authoritative input and exact mapping | Loss/placeholder policy |
| --- | --- | --- |
| Coordinate convention | `GridCell.column -> x`, `GridCell.row -> y`; integer x/y remain the existing cell-center anchors. x increases east and y south. Ground entities use `z = 0`; no value is divided or offset. The engine already enforces safe integer cells (`src/combat/grid.ts:21-37`; `src/combat/combatant.ts:352-368`). | Elevation is absent, so every current entity is ground-level. This is a documented projection, not a migration. |
| `sceneId` | `String(EncounterSessionService.sessionId)`. Scene identity therefore follows the existing branded session id that `DmEncounterHost` constructs (`src/vtt/dm-encounter-host.ts:255-278`). | The engine state itself has no scene id; a room-within-session id is a proposed extension, not silently synthesized into v1. |
| `revision` | Exact `EncounterState.revision`/safe projection revision (`src/combat/encounter.ts:750-768`; `src/combat/visibility.ts:273-289`). | None. Protocol event `seq` is separate and never substituted for revision. |
| `grid` | `{width: bounds.columns, height: bounds.rows, feetPerCell: 5}`. Bounds are authoritative (`src/combat/grid.ts:8-11`) and existing distance code establishes five feet per step (`src/combat/grid.ts:71-85`). | v1 cannot express a non-square or variable-sized grid; return `UNSUPPORTED` if such an engine mode is added later. |
| `tiles` | Build the seat-specific `EncounterBoardProjectionShape`, call `encounterBoardRenderModel`, and emit exactly one tile per row-major cell using that cell's `role:'floor'` layer: `{id:'tile:<column>,<row>', assetId:mapAsset(...), x:column,y:row,z:0}`. The board model already chooses its floor variant per cell (`src/vtt/encounter-board.ts:899-925`). | Multiple visual overlay layers do not become tiles; light/fog/terrain mechanics use their own snapshot fields. Tile ids are adapter ids because the engine has no tile entities. |
| `props` | From the same board model's `worldObjects` (`src/vtt/encounter-board.ts:958-985`), emit non-door, non-wall objects once at their engine `position`, keeping `String(object.id)`. A `light-source` also emits a `prop.torch` prop so it can render physically. Synthetic barrel/table/pillar ids get exact mappings in the single asset mapper. | The engine stores mechanics/name but no object asset id (`src/combat/world-objects.ts:49-68`); production unknown props use the documented `prop.pillar` fallback and retain their label only through their engine identity (v1 props have no label). Multi-cell prop footprints are lossy because v1 props have no footprint. |
| `tokens` | Join each placed `CombatToken` to its combatant. Emit `id = String(token.id)`, `label = profile.name`, anchor x/y from `token.position`, z 0, `footprint.w/h` from the bounding rectangle of the projected `combatantSpace` footprint, and verify `w*h === footprint.length`. The engine supplies token/combatant relation (`src/combat/combatant.ts:102-127`) and effective-size footprints (`src/combat/visibility.ts:583-603`). Art is selected by combatant id by the current board model (`src/vtt/encounter-board.ts:814-843`) and then mapped. | `facing = 0` because facing is not stored. Squeezed footprint uses controlled occupied cells, not the creature's nominal size. Placement-pending combatants are omitted, not guessed. |
| `walls` from blocked cells | Treat each blocked cell as an opaque, movement-blocking unit square, as the core documents (`src/combat/grid.ts:13-18`). Emit its exposed north/east/south/west cell-edge segments around center `(x,y)`, with endpoints at half coordinates; suppress an edge shared with an adjacent wall cell. Id is `blocked:<column>,<row>:<n|e|s|w>`, `baseZ=0`, `height=1`, both block flags true, and `assetId='wall.stone'`. | The source is a blocked area, not an authored plane, so perimeter segments are a deliberate lossy rendering boundary. Internal shared edges are omitted. |
| `walls` from objects | A non-door world-object footprint cell is wall geometry when canonical terrain classifies its blocking wire as `wall`; that derives from mechanics, not fiction (`src/combat/terrain.ts:103-129`, `src/combat/terrain.ts:158-174`). Emit exposed cell edges as above, ids `<objectId>:wall:<column>,<row>:<edge>`, flags copied exactly from `blocking.movement` and `blocking.lineOfSight`, base 0, height 1. | One cell object can expand to multiple segment ids; its saved id is retained as the prefix. Mixed/overlapping blockers are deterministically de-duplicated by geometry, preferring an authored object over anonymous `blockedCells`; a conflicting flag pair is a projection error, not guessed. |
| `doors` | A one-cell object with `kind:'door'` emits one wall segment `<doorId>:wall` and `{id:String(door.id), wallId:'<doorId>:wall', open:!door.blocking.movement, assetId:'door.wood'}`. The existing board explicitly defines movement-blocking doors as closed (`src/vtt/encounter-board.ts:767-779`). The segment flags copy the blocking wire. Choose its plane from adjacent wall cells: north/south adjacency means the west cell edge, east/west adjacency means the north edge; ambiguous/no-neighbor cases use the north edge and are recorded as `placeholderGeometry` in internal diagnostics, not a new v1 field. | v1 can reference only one segment. Multi-cell doors and ambiguous orientations return `UNSUPPORTED` from `door.set` and are called out in reports; their snapshot may use the deterministic placeholder so rendering remains total. Open is not inferred from cover or a name. |
| `lights` from environment | For every DM-visible environment light region, choose the arithmetic centroid of its cell centers for x/y, z 0, and radius `max(Euclidean distance from centroid to a member center) + 0.5`. `bright -> (#FFF4D6,1)`, `dim -> (#B8C7FF,0.5)`, `darkness -> (#000000,0)`; `enabled=true`. Id is the engine region id. Regions have only id/cells/level (`src/combat/world-objects.ts:70-86`). D359 classifies the environment DM-only (`src/combat/visibility.ts:37-45`), so player snapshots omit environment-derived lights rather than reaching back into raw state. | Radius, color, intensity, origin, and enabled are synthetic presentation defaults. Player omission is intentionally conservative and may make illumination visually incomplete. Nothing is written back and these cannot be mutated via `light.set`. Empty regions are invalid at the engine boundary. |
| `lights` from objects | Every seat-visible `kind:'light-source'` object emits id=`String(object.id)`, position at its anchor, z 0, radius 1, color `#FFD27D`, intensity 1, enabled true. `light-source` is an existing mechanical kind (`src/combat/world-objects.ts:9-20`), but carries no emitter data. | All photometric fields except position are documented placeholders. If a region id and object id collide, fail projection rather than rename an engine id. |
| DM `vision` | `{mode:'all', visible:allGridCells, explored:allGridCells}` using row-major cells within bounds. DM projection is omniscient (`src/combat/visibility.ts:91-95`, `src/combat/visibility.ts:500-545`). | Arrays are populated even though `mode:'all'` makes them redundant, so consumers need no undocumented special omission. |
| Player `vision` | Call `projectPlayerView` first. `visible` is exactly `PlayerView.cells`; `explored` is the sorted union of those cells and `PlayerView.lastSeen[].cell`. Player cells exclude concealed/fogged cells and last-seen anchors come from observation history (`src/combat/visibility.ts:609-648`). | This is not a complete exploration history: the engine stores last-seen creature anchors, not every formerly visible cell. Never add current hidden-token geometry from canonical state. |
| Player entity removal | Every event contains a complete, newly projected snapshot array. When a creature becomes hidden, `projectPlayerView` omits it (`src/combat/visibility.ts:583-603`), so the next `tokens` array omits it even if the prior event contained it. | No tombstone/delta exists in v1. Replacement-array semantics are binding. |
| Asset ids | One module, `src/vtt/handoff/asset-map.ts`, owns every exact and fallback mapping. Existing `art.map.floor.stone.*`, `art.map.wall.stone-*`, and `art.map.door.wood-*` families map to `tile.stone.floor`, `wall.stone`, and `door.wood`; reference combatant assets show the current `art.token.pc.*` and `art.token.monster.*` vocabulary (`src/vtt/reference-encounter-art.ts:3-34`). Synthetic ids map exactly to `prop.barrel`, `prop.table`, `prop.pillar`, `prop.torch`, `token.adventurer`, and `token.goblin`. Unknown floor/wall/door/light roles fall back to their matching listed logical id; unknown player tokens to `token.adventurer`, monster tokens to `token.goblin`, and unknown props to `prop.pillar`. | The mapper returns internal `{assetId, provenance:'exact'|'fallback', sourceId}` so reports/tests can expose fallback use even though v1 only carries the string. No scattered mapping and no silent undefined/coalescing at call sites. |

## C/D. Dependent, independently reversible implementation steps

Each step below encodes one review decision, carries its own tests/documentation impact, is independently revertible, and has a targeted gate. “Supervisor rerun” is the authoritative verification source; implementer results are evidence recorded in the report, not the final verdict. Unless noted, stay at or below roughly five changed resources and 250 hand-written lines per step. Generated JSON fixtures/schemas are counted as one generated resource and must be reviewed by invariant tests, never accepted merely because the generator emitted them.

### S0 — Toolchain declaration, path authority, doctor, and bootstrap

**Decision.** Pin the observed major toolchain and make the owner path/worktree override explicit before any exchange write. Add `.nvmrc` with `24.13.0` and `package.json.engines` for Node `24.13.0` and npm `11.6.2`; do not add a dependency. `scripts/bootstrap-vtt-handoff.sh` is idempotent, never uses sudo, never installs Windows packages, and creates a repo-local `.tmp/vtt-handoff-python` with `uv venv` when available or `python3 -m venv --without-pip` plus user-local `pip3 --python <venv>/bin/python install pip`. It validates the official npm lockfile and runs `npm ci` only when `npm ls` proves locked development/test packages are missing, recording the lock hash so an unchanged complete installation is left alone; print the exact command before executing it. It installs no Blender/Godot/OS packages and stops for a specific approval instead of changing sudo policy. It records exact versions/paths as JSON under `.tmp/vtt-handoff-bootstrap/`, not in the shared root until publication. `doctor` checks Ubuntu/WSL/path/lock/tool versions and only reads state. `tools/vtt-handoff/paths.ts` is the only handoff-root/stage-root resolver and enforces absolute, contained targets and the owner-path rule above. Never alter pre-existing `.tmp` children.

**Files/resources.** New `.nvmrc`; modify `package.json` (add `engines`, `doctor`, and initially `test:engine`; later steps add their own scripts); mechanically update the root package metadata in `package-lock.json`; new `scripts/bootstrap-vtt-handoff.sh`; new `tools/vtt-handoff/paths.ts`; new `tools/vtt-handoff/doctor.ts`. This six-file exception is one indivisible toolchain declaration: package and lock metadata must agree, and the declaration is not safe without doctor/path/bootstrap enforcement. No dependency versions change.

**Targeted gate.** After the quiet-box restriction ends:

```sh
VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp/vtt-handoff npm run doctor -- --json
bash scripts/bootstrap-vtt-handoff.sh
bash scripts/bootstrap-vtt-handoff.sh --check
npx vitest run --configLoader runner tests/unit/combat/world-objects.test.ts tests/unit/combat/visibility.test.ts tests/unit/vtt/encounter-board-projection.test.ts tests/unit/vtt/session-persistence.test.ts tests/integration/vtt/dm-encounter-host-live-path.test.ts tests/integration/vtt/d365-dungeon.test.ts
```

Also run doctor once without the override in this worktree and assert it refuses with both the actual and owner-designated paths; this expected refusal is a test, not a gate failure. Record exit codes and test counts. Existing gates prove the rules/token interactions cited in anatomy; do not create duplicates.

**Verification/rollback/assumptions.** Supervisor reruns the commands from this exact worktree and checks that no shared-root write occurred during the refusal. Revert these six files to remove all tool/path behavior; `.tmp` venv and bootstrap records are disposable and removable without application data. Assumptions: Node 24.13.0/npm 11.6.2 are the intended project versions, `uv` or user-local pip remains available, and the supervisor will explicitly set the worktree override. Doctor proves each locally before proceeding.

### S1 — Exact v1 TypeScript contract, strict Zod validation, and draft-2020-12 schema

**Decision.** Define the owner agreement verbatim with no additional required v1 fields. Use Zod 4 because it is already a runtime dependency (`package.json:43-49`), produces typed runtime parsing at every trust boundary, supports finite/safe-integer refinements, and can generate JSON Schema from the same definitions. Keep request/success/failure/event as separate strict discriminated schemas. Method-specific request/result unions cover only `session.open`, `scene.snapshot`, `token.move`, `door.set`, and `light.set`; `method` remains a string at the base envelope so a well-formed unknown method can return `UNSUPPORTED`. Error `code` remains nonempty string, not a closed wire enum. The schema adds no session id, role, auth token, mutation key, timestamp, capability details, diagnostics, or presentation metadata.

The same contract source defines strict art schemas exactly from the owner agreement. A request requires only `schemaVersion:1`, `requestId`, `assetId`, `brief`, `views`, `passes`, `pixelsPerCell`, and `footprint`. A completion requires `schemaVersion:1`, `requestId`, `status:'complete'|'partial'|'blocked'`, `assets`, `provenance`, and `errors`; each asset requires `assetId`, `footprint`, `heightCells`, `pixelsPerCell`, and `frames`; each frame requires `facing`, `frameIndex`, `width`, `height`, `pivotPx`, and `albedo`, with `normal`/`emissive` optional. Hashes, source files, and normal-map convention are represented in the applicable asset/provenance records without making optional image passes required. Keeping these definitions in the initially published contract lets Windows validate art before S9's Linux tooling lands and avoids mutating an immutable bundle later.

**Files/resources.** New `src/vtt/handoff/protocol-v1.ts`; new `src/vtt/handoff/art-contract-v1.ts`; new `tools/vtt-handoff/generate-contract-v1.ts`; new generated resources `handoff/contracts/v1/{protocol.schema.json,art-exchange.schema.json}`; new `tests/unit/vtt/handoff-contract-v1.test.ts`; modify `package.json` to add `test:protocol` and `schema:vtt-handoff` (the generator command is not `schema:engine-mcp` and does not touch `docs/specs`). This six-resource increment is indivisible because the two binding schemas share one immutable v1 release and one generator/test gate.

**Tests.** Hand-author valid/invalid values for every envelope/method/result and a minimal `SceneSnapshot`: reject NaN/Infinity, unsafe seq/revision, nonpositive sizes, malformed colors, missing fields, added required-looking fields, arrays replaced by objects, a door with missing wall reference, duplicate entity ids within each array, duplicate wall geometry/id, and unknown properties; accept finite fractional coordinates/facing/radius/intensity and finite positive fractional sizes because v1 does not declare those integers. Prove unknown methods parse at the base envelope and dispatch later to `UNSUPPORTED`. Prove JSON Schema declares draft 2020-12 and validates the same fixtures with the project's chosen JSON-schema test helper; do not infer correctness from Zod generation alone.

**Targeted gate.** `npm run test:protocol` and `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract-v1.test.ts`; then run `npm run schema:vtt-handoff -- --check`, which regenerates to a temporary file and byte-compares rather than overwriting.

**Verification/rollback/assumptions.** Supervisor diff-checks the owner field names and required arrays against this plan, then reruns the gate. Reverting these six resources removes only the unconsumed contract. Assumption: Zod 4.4.3's JSON-schema output can target 2020-12; the generator's independent meta-schema declaration and tests prove it before S2.

### S2 — Real-engine two-room fixture and seat-safe `SceneSnapshot` projection

**Decision.** Implement the mapping table as a pure adapter over existing DM/player projections and the existing board model, plus one synthetic scene built by `createEncounter`. Use a 9×5 five-foot grid, fixed seed `20260909`, a vertical divider at column 4 made of two `kind:'barrier'` wall world objects above/below a one-cell `kind:'door'` object at row 2, a `kind:'light-source'` torch plus an environment light region, barrel/table/pillar world objects, one adventurer at `(2,2)`, and one goblin at `(6,2)`. A separate adapter test covers anonymous `blockedCells`. Use existing profile/test builders or production constructors; do not encode new D&D mechanics. The player seat owns the adventurer. No campaign text, notes, credentials, or real saves enter the fixture.

**Files/resources.** New `src/vtt/handoff/asset-map.ts`; new `src/vtt/handoff/scene-snapshot.ts`; new `src/vtt/handoff/two-room-scene.ts`; new `tools/vtt-handoff/generate-two-room.ts`; new `tests/unit/vtt/handoff-scene-snapshot.test.ts`; generated resource set `handoff/fixtures/scenes/{two-room.v1.json,two-room.dm.scene-snapshot.v1.json,two-room.player.scene-snapshot.v1.json}`. This is a justified seven-resource indivisible increment: the three generated JSON files are one fixture product, while source, adapter, mapping, generator, and independent test must land together to avoid self-certified output.

**Tests/invariants.** Reconstruct through `createEncounter`, decode through the real state codec where applicable, project both seats, and byte-compare generated files only after independently asserting: exact 9×5 bounds and five-foot grid; exact unchanged token centers; two token ids/labels in DM and no current hidden goblin geometry in the player projection; exact `revision`; four props including torch; one door whose `wallId` resolves; all wall endpoints on half-cell edges with no duplicate geometry; door open iff movement is passable; asset mapping exact/fallback provenance; DM all-cells vision; player visible/explored union; no `dmNotes`, raw state, hidden combatant, or observation-history structure serialized. Add direct tests for large/squeezed footprint w/h and unknown asset fallback. These invariants are the independent pin required before fixture bytes may change.

**Targeted gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract-v1.test.ts tests/unit/vtt/handoff-scene-snapshot.test.ts` and `npx vite-node tools/vtt-handoff/generate-two-room.ts -- --check`.

**Verification/rollback/assumptions.** Supervisor reruns both and reviews the JSON for secrets. Revert the listed source/generated resources without touching saved sessions. Assumptions: the chosen constructors can create the two profiles/world objects without imported campaign data; the test proves this. Placeholder geometry/photometry/facing is confined to projection code and enumerated in reports.

### S3 — One renderer-neutral session service, typed intents, and dependency boundary

**Decision.** Treat `DmEncounterHost` as the existing service implementation. Add an `EncounterSessionService` interface/factory and typed intent union rather than a second engine. It exposes seat-bound immutable snapshots/selectors; `dispatch(intent)` for the rich existing UI; `moveTokenToOfferedDestination(tokenId,to)` that matches exactly one current revision-bound offered move and submits that exact engine command; `setDoorOpen(doorId,open)` that validates a one-cell door and applies a canonical object-blocking change through a narrow `TurnCoordinator.setDoorOpen` method; and lifecycle/subscription. It never accepts a client-authored path, die, DC, damage, reducer command, or model proposal. `light.set` is deliberately absent. Rename the abstract persistence port from `BrowserSessionStore` to `SessionStore`, keep memory/SQLite/IndexedDB implementations, and inject `now():Date` only into the IndexedDB adapter. Preserve journal, undo, audit, resource, permission, house-rule, and RNG semantics.

**Files/resources.** New `src/vtt/encounter-session-service.ts`; modify `src/vtt/dm-encounter-host.ts`; modify `src/combat/coordinator.ts`; modify `src/vtt/session-persistence.ts` and `src/vtt/local-session-store.ts`; new tests `tests/unit/vtt/{encounter-session-service.test.ts,handoff-boundary.test.ts}`. This seven-file exception is indivisible because the interface, sole implementation, narrow coordinator authority, port rename/adapters, and structural proof cannot compile independently. Keep hand-written production changes under 250 lines; mechanical type-name replacements are excluded but must be separately reviewed.

**Tests.** Characterize the unique offered destination success, no-offer/ambiguous/stale destination refusals, token-id/combatant join, door open/closed canonical blocking triples and journal/replay revision, invalid/multi-cell/non-door rejection, subscriber initial/update/unsubscribe, deterministic RNG, and injected-clock save metadata. A source-graph test modeled on `tests/unit/ai-bridge/build-boundary.test.ts:16-17` and the runtime-import walk in `tests/unit/db/drizzle-is-build-time-only.test.ts:29-61` starts at `src/combat/**`, `encounter-session-service.ts`, and `dm-encounter-host.ts`; it fails on reachable DOM/canvas/IndexedDB/Dexie/Node builtins or transport modules. A second assertion starts at UI, Worker, Node, and in-process entries and proves each reaches exactly `session-encounter-reducer.ts`, with no alternate direct reducer in those graphs. Do not ban legitimate test-only reducer use repository-wide.

**Targeted gate.** `npm run test:engine`, defined as the cumulative relevant core/service suite, and explicitly:

```sh
npx vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/handoff-boundary.test.ts tests/unit/vtt/session-persistence.test.ts tests/integration/vtt/dm-encounter-host-live-path.test.ts tests/unit/combat/world-objects.test.ts tests/unit/combat/visibility.test.ts
```

**Verification/rollback/assumptions.** Supervisor reruns the suite and reviews the import graph output. Roll back the interface/coordinator/port rename together; state schemas and saved bytes do not change. Assumptions: a door mutation is DM-authoritative application behavior, while arbitrary movement still requires an offered command; tests prove both. If adding the narrow coordinator method changes persisted output beyond one normal reducer transition, stop rather than add a compatibility layer.

### S4 — Bootstrap protocol dispatcher, authorization context, idempotency refusal, and examples

**Decision.** Add one runtime-neutral dispatcher that validates before dispatch and binds a connection to an authoritative `AuthorizedSeat` supplied by its runtime. `session.open.requestedRole` is a request, never evidence; the runtime authorizer either grants a concrete DM/player binding or returns `UNAUTHORIZED`. Connection context, not a new v1 field, carries the session thereafter. Capabilities list only actual methods: initially `session.open`, `scene.snapshot`, `token.move` when the seat can select a current offered move, and DM `door.set`; omit `light.set`. Well-formed unavailable/unknown operations return `UNSUPPORTED`.

For each opened session, store every mutation request envelope id for its entire in-memory lifetime. A repeat id for `token.move`, `door.set`, or `light.set` returns `DUPLICATE_MUTATION_ID` even when bytes match and never replays/caches success. Reads may reuse ids because the policy is mutation-specific. Bound the ledger at 10,000 ids; once full, refuse new mutations with `SESSION_LIMIT` rather than evict an id and risk re-execution. Do not blindly retry after an unknown outcome. The ledger is not claimed durable across a dead Worker/process; v1 has no resume/idempotency field.

`session.open` emits the initial full snapshot as seq 1 after its success response. Every successful state-changing mutation returns `{revision}` and emits exactly one newly projected full snapshot with the next monotonic safe-integer seq. Refuse with `SESSION_LIMIT` before `Number.MAX_SAFE_INTEGER` rather than wrap. `scene.snapshot` returns a snapshot but does not itself emit. Failed/unsupported mutations emit nothing. Project for the authorized seat before handing data to the protocol session, and ensure the event contains only the projected snapshot. When an entity becomes hidden, the next full array omits it.

Generate durable examples by executing this real dispatcher/service over the S2 scene with fixed ids/clock/seed: DM and player `session.open`, `scene.snapshot`, a successful uniquely offered `token.move`, a successful `door.set`, `light.set -> UNSUPPORTED`, malformed request rejection, unauthorized role rejection, arbitrary move rejection, and duplicate mutation rejection. Never hand-author expected output from a second implementation.

**Files/resources.** New `src/vtt/handoff/protocol-session.ts`; new `src/vtt/handoff/authorization.ts`; new `tools/vtt-handoff/generate-examples-v1.ts`; new generated `handoff/contracts/v1/examples.json`; new `tests/unit/vtt/handoff-protocol-session.test.ts`.

**Targeted gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract-v1.test.ts tests/unit/vtt/handoff-scene-snapshot.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/handoff-protocol-session.test.ts` and `npx vite-node tools/vtt-handoff/generate-examples-v1.ts -- --check`.

**Verification/rollback/assumptions.** Supervisor checks response ids equal request ids, mutation ids never execute twice, event sequence and engine revision are distinct, player snapshots omit then remove hidden entities, and examples contain no raw state. Revert these five resources to remove the renderer protocol without altering the service. Assumptions: the synthetic service can be advanced to exactly one human movement offer; the generator must fail if that ceases to be true.

### S4b — Immutable minimum handoff publisher

**Decision.** Publish the contract and fixtures immediately after S4, before runtime/UI/art work. `handoff:publish` creates only missing directories under the configured root: `contracts/v1`, `fixtures/scenes`, `art/outbox`, `art/inbox`, `reports/claude`, `reports/windows`, and `deliveries/windows`. It writes only Claude-owned paths. For `contracts/v1`, copy durable schema/examples to temporary sibling files, fsync/close, rename; write `manifest.json` containing sorted relative paths, byte counts, and lowercase SHA-256 for every payload file; then write `READY.json` last via temp-file-plus-atomic-rename with the manifest's own SHA-256. Fixtures get their own checksum entries in READY. Publishing identical content is an idempotent no-op; a differing existing `contracts/v1` or READY refuses and tells the caller to choose a future version. It never deletes, cleans, or overwrites an existing differing bundle.

**Files/resources.** New `tools/vtt-handoff/publish.ts`; new `tools/vtt-handoff/immutable-bundle.ts`; new `tests/unit/tools/vtt-handoff-publish.test.ts`; modify `package.json` to add `handoff:publish`.

**Targeted gate.** `npx vitest run --configLoader runner tests/unit/tools/vtt-handoff-publish.test.ts tests/unit/vtt/handoff-contract-v1.test.ts tests/unit/vtt/handoff-scene-snapshot.test.ts tests/unit/vtt/handoff-protocol-session.test.ts`; then publish twice to a `mktemp -d` root and verify the second run is byte-identical; then preseed one differing byte and verify refusal/no overwrite. Do not publish the shared root until these pass.

**Verification/rollback/assumptions.** Supervisor repeats temp-root tests, then runs `VTT_HANDOFF_ROOT=... npm run handoff:publish` and independently recomputes all manifest hashes. Rollback deletes only a newly created test/temp bundle; an already shared bundle is immutable and must be left in place. Assumptions: temp and final paths share a filesystem so rename is atomic; publisher verifies device identity and refuses otherwise.

### S5 — Common logical transport and zero-serialization in-process adapter

**Decision.** Define one transport used by tests and both runtime clients:

```ts
interface SceneTransport {
  readonly status: SceneTransportStatus;
  request(request: V1Request): Promise<V1Response>;
  subscribe(listener: (event: V1SceneSnapshotEvent) => void): () => void;
  initialSnapshot(): Promise<SceneSnapshot>;
  onStatus(listener: (status: SceneTransportStatus) => void): () => void;
  onError(listener: (error: SceneTransportError) => void): () => void;
  close(): void;
  dispose(): void;
}
```

`close` is idempotent and `dispose` aliases it for host integration. Status is a closed union (`connecting|connected|closed|failed`), errors are typed, and all pending requests reject on close. `initialSnapshot()` awaits the first snapshot event produced by an explicitly issued successful `session.open`; it rejects if open fails or transport closes, and never invents an implicit wire method. The in-process implementation calls the S4 protocol session with typed objects—no JSON stringify/parse or structured-clone round trip—while still using the same validation/dispatch code.

**Files/resources.** New `src/vtt/handoff/transport.ts`; new `src/vtt/handoff/in-process-transport.ts`; new `tests/unit/vtt/handoff-in-process-transport.test.ts`.

**Targeted gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-contract-v1.test.ts tests/unit/vtt/handoff-protocol-session.test.ts tests/unit/vtt/handoff-in-process-transport.test.ts`.

**Verification/rollback/assumptions.** Supervisor proves request correlation, initial snapshot, event order, status/error transitions, no events after unsubscribe, and rejection after close. Revert three new files with no callers affected until S6/S8. Assumption: one logical transport instance owns one authorized protocol session; v1 does not multiplex sessions on one connection.

### S6 — Real browser Worker and MessageChannel transport

**Decision.** Add a dedicated module Worker entry and client. The client constructs `new Worker(new URL('./worker-entry.ts', import.meta.url), {type:'module'})`, transfers one `MessagePort`, and uses ordinary structured-clone messages. Initialization supplies trusted runtime configuration (initial encounter/session-store choice and an already authorized seat policy); `requestedRole` cannot replace it. The Worker constructs the same service and S4 dispatcher used in-process. Do not use a SharedWorker, SharedArrayBuffer, Atomics, DOM, canvas, IndexedDB unless supplied as an explicit persistence adapter, or an in-process fake. A player-hosted Worker is explicitly *not* a trusted server protecting secrets from the player who controls that origin/process.

**Files/resources.** New `src/vtt/handoff/worker-entry.ts`; new `src/vtt/handoff/browser-worker-transport.ts`; new `src/vtt/handoff/message-port-protocol.ts`; new `tests/browser/vtt-handoff-worker.spec.ts`; modify `package.json` to add `test:worker`.

**Tests.** In Chromium, instantiate the real Worker and verify string correlation ids (including out-of-order calls), strict validation failures, mutation result revision and one event, initial snapshot, close/recreate/resnapshot, no event after unsubscribe, duplicate mutation id refusal/no revision change, and a player visible-then-hidden transition that removes the token. Prove the built messages contain no raw canonical state. A new Worker gets a new protocol connection; it may reload injected persistence but is never assumed to survive page closure.

**Targeted gate.** Use only the touched spec and a `/tmp/vtt-handoff-playwright.config.ts` wrapper whose `testDir` is the absolute worktree `tests/browser`, whose one web server has absolute `cwd=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff`, `reuseExistingServer:false`, and command `npm run dev -- --host 127.0.0.1 --port 4410`; import `defineConfig` through the absolute worktree `node_modules/@playwright/test/index.mjs` so module resolution does not depend on `/tmp`. Then run:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=/tmp/vtt-handoff-playwright.config.ts vtt-handoff-worker.spec.ts
```

No outer `flock`; never touch port 4173.

**Verification/rollback/assumptions.** Supervisor owns the rerun and validates the served origin is 127.0.0.1:4410. Revert the Worker/client/spec and package alias; in-process mode remains. Assumptions: Vite follows its existing worker graph behavior (`vite.config.ts:192-230`) and Chromium is present; S6 test proves both.

### S7 — Opt-in localhost Node HTTP+SSE runtime and three-mode parity

**Decision.** Reuse `npm run serve`/`tools/serve.mjs` as the DM-local startup, adding an explicit `--vtt-runtime` option. Without it, current static-only behavior is byte-for-behavior unchanged. With it, start one combined server through a Vite-node-loadable typed adapter: static GET/HEAD remains, `POST /vtt/v1/request` carries v1 requests, and `GET /vtt/v1/events` is SSE for full snapshots. Bind only `127.0.0.1`; tests use port 0 or 4410-series, never 4173. Do not reuse `/dm/*`.

Require a high-entropy startup token from an explicit environment/file input and `Authorization: Bearer`; never put it in a URL. Validate `Host` as 127.0.0.1/localhost plus the actual bound port and reject missing/nonmatching `Origin` except non-browser CLI requests explicitly enabled by the local operator. Emit no permissive CORS. The token authorizes the configured local DM principal; `requestedRole:'dm'` alone never does. Player sessions, when later enabled, require a separately configured token-to-player binding; the bootstrap Node runtime initially returns `UNAUTHORIZED` for them. Limit JSON bodies to 1 MiB, SSE clients per session to a small documented cap, heartbeat without state, and clean every subscription on disconnect. Node initially uses the memory `SessionStore`; process restart loses that demo session and must be reported honestly.

**Files/resources.** Modify `tools/serve.mjs` to export/reuse its static handler and parse/forward the opt-in without altering default startup; new `tools/vtt-handoff/node-runtime.mjs` with fully typed JSDoc imports, containing the HTTP/SSE adapter and testable handler/server factory and loaded through `vite-node`; new `tests/unit/vtt/handoff-node-runtime.test.ts`; new `tests/browser/vtt-handoff-runtime-parity.spec.ts`; modify `package.json` to add `test:runtime-node`. This exact five-resource design avoids duplicating static path-containment code and avoids an untyped TypeScript import of `.mjs`; no literal or inferred `any` is permitted in JSDoc or tests.

**Tests.** Vitest covers the same request matrix as S6 plus bind address, explicit opt-in, token, Host/Origin, method/content-type/body cap, player elevation refusal, SSE initial event/reconnect/resnapshot, disconnect cleanup, duplicate mutation, and graceful close. The Playwright parity spec starts the testable Node server on ephemeral 127.0.0.1, runs the in-process and real Worker transports in the 4410 browser origin, executes identical fixed-id fixture transcripts, and compares normalized responses, revisions, and full snapshot events across all three. It compares semantic values, not a regenerated hash alone.

**Targeted gates.** `npm run test:runtime-node`; explicitly `npx vitest run --configLoader runner tests/unit/vtt/handoff-node-runtime.test.ts tests/unit/vtt/handoff-in-process-transport.test.ts tests/unit/vtt/handoff-protocol-session.test.ts`; then, through the same absolute `/tmp` wrapper:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=/tmp/vtt-handoff-playwright.config.ts vtt-handoff-runtime-parity.spec.ts
```

**Verification/rollback/assumptions.** Supervisor uses `ss -ltnp` during the opt-in test to verify only loopback and confirms default `npm run serve -- --port 0` exposes no `/vtt/v1/*`. Revert the option, adapter, tests, and alias together; ordinary serve remains. Assumptions: HTTP+SSE is sufficient because v1 traffic is request/response plus server snapshots; no bidirectional streaming or new dependency is justified. Later HTTPS/deployment remains unresolved and is documented, not deployed.

### S8 — Existing top-down UI through the service boundary, with top-down fallback

**Decision.** Change `DmEncounterView` to receive/create `EncounterSessionService` and dispatch typed rich intents; read only service snapshots/selectors. Move the three direct read-only rules calls at lines 830/1146/1149 behind `describeTerrain` and `previewArea` selectors. Preserve the existing in-process service as the default UI adapter so session persistence and visual behavior do not change. The Worker is an optional renderer runtime, not silently substituted under the current app.

Convert every host call enumerated in anatomy to the corresponding service intent/query: lifecycle/subscription/snapshot; start/human decision; placement; interrupt/resume/undo; skip/delay/rest/room/day/session; rewind; adjudication/refusal/pending; preferences/hidden rolls; world-object use; manual adjudication; and controller replacement. No reducer imports remain in the UI. Session-id branding moves to the service factory. Keep `renderBoard`, `encounterBoardRenderModel`, CSS classes, art package selection, DOM order, and accessible text unchanged.

Define top-down fallback in the asset adapter: a staged manifest frame is eligible for this UI only when it declares a top-down view; if it has only isometric facings, retain the existing starter-art `AssetId` chosen by `encounterArtForBoard`, never rotate/project the isometric image and never emit a broken URL. This is testable now even though S9 does not promote staged art.

**Files/resources.** Modify `src/vtt/encounter-app.ts`; modify `src/vtt/encounter-session-service.ts`; modify `src/vtt/handoff/asset-map.ts`; new `tests/unit/vtt/encounter-app-service-boundary.test.ts`; new `tests/browser/vtt-handoff-topdown-smoke.spec.ts`.

**Tests.** Source-boundary test enumerates and rejects direct core reducer/rules imports/calls while allowing type-only imports and renderer projection. Existing board-art seam test already pins that DOM uses the pure model and data resolver (`tests/unit/assets/encounter-board-art.test.ts:194-210`), so retain it. The new smoke loads `/vtt?encounter=d365&view=dm`, waits for the bundled D365 board, chooses one real offered movement UI control, records the token's engine id/cell/revision, clicks it, and asserts the same `.encounter-token` moves and DOM revision increases. This is an independent DOM/service invariant, not a screenshot or art/context/capture pin. Assert an isometric-only candidate resolves to the pre-existing top-down starter asset.

**Targeted gates.** `npx vitest run --configLoader runner tests/unit/vtt/encounter-app-service-boundary.test.ts tests/unit/vtt/handoff-boundary.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/encounter-board-projection.test.ts tests/unit/assets/encounter-board-art.test.ts`; then through the absolute wrapper:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=/tmp/vtt-handoff-playwright.config.ts vtt-handoff-topdown-smoke.spec.ts
```

**Verification/rollback/assumptions.** Supervisor reruns both, compares no screenshot pins, and checks `rg` finds no direct rules calls listed above. Revert the UI/interface/mapper/tests as one adapter change; service/runtimes continue. Assumptions: the bundled dungeon exposes at least one deterministic human movement option; if not, fixture setup may pause/choose a known human controller through public UI, but assertions may not be weakened.

### S9a — RFC 9562 UUIDv7 and nine consistent art requests

**Decision.** Implement a tested UUIDv7 module using a supplied/injected millisecond clock and cryptographic random bytes: encode the 48-bit Unix-millisecond timestamp, version nibble 7, and RFC variant `10`. Do **not** promise monotonic ordering within the same millisecond; therefore do not add a monotonic-order test. Collision resistance comes from the random payload, while filenames are roughly chronological. Validate timestamp range and random byte length.

`art:request` writes exactly `art/outbox/<uuidv7>.request.json` under the configured handoff root using temp file plus rename and refuses overwrite. Create one request for each of the nine logical ids. All share a versioned style brief: original clean-room high-resolution retro-fantasy rendering; consistent world scale; grid ground-center pivot; +x/east as facing zero and clockwise toward +y/south; declared top-down and isometric views as appropriate; albedo plus optional OpenGL-style +Y normal/emissive passes; 128 pixels/cell; and explicit footprint. Do not name third-party games/artists/products and do not generate art.

**Files/resources.** New `tools/vtt-handoff/uuidv7.ts`; new `tools/vtt-handoff/art-request.ts` consuming S1's `art-contract-v1.ts`; new `tests/unit/tools/vtt-handoff-art-request.test.ts`; modify `package.json` to add `art:request`.

**Tests.** Decode UUID bytes to prove version/variant nibbles and exact 48-bit millisecond round-trip at boundary values; use fixed randomness; prove two same-ms ids differ when supplied different random bytes, without asserting their order. Validate every request field/schema, filename equality, nine unique request/asset ids, consistent style/pivot/scale/facing/passes, no placeholders/forbidden references, and no overwrite.

**Targeted gate.** `npx vitest run --configLoader runner tests/unit/tools/vtt-handoff-art-request.test.ts`; run `VTT_HANDOFF_ROOT=<mktemp>/handoff npm run art:request -- --all` twice and prove first creates nine and second refuses existing ids unless `--missing` is explicitly used to create only absent logical ids.

**Verification/rollback/assumptions.** Supervisor decodes sample UUIDs independently and lists exact generated ids for the report. Roll back code/tests/scripts; already published requests are immutable exchange messages and are not deleted. Assumption: Windows accepts the exact owner schema; no new required field is added.

### S9b — Defensive art inbox scanner and validator

**Decision.** `art:validate` performs explicit scans; it never relies on cross-filesystem watch events and never executes delivered scripts. It ignores `.partial` names and only considers `art/inbox/<uuidv7>.result.json` complete. For every result, strictly validate schemaVersion 1, request id/filename/outbox identity, status, assets/provenance/errors, unique asset/frame identities, footprint/height/pixels, facing/index/dimensions/pivot, normal convention, source files, and lowercase SHA-256. Every frame path must be relative to its `<requestId>/` bundle; reject empty, absolute POSIX, drive-letter, UNC, backslash, `..`, NUL, and percent-encoded traversal. `lstat` then `realpath` every component and reject symlinks or escape.

Parse PNG signature and IHDR without decoding arbitrary ancillary content; require declared dimensions, supported bit depth/color type, an actual alpha channel for required transparent albedo, and matching albedo/normal dimensions/frame identity. Every delivered frame filename must begin `<requestId>__`. Recompute hashes. Cap result JSON at 1 MiB, each PNG at 64 MiB, total bundle at 256 MiB, frames/assets at documented finite counts, and reject special files. Listing reports complete/partial/blocked/invalid without mutating inbox.

**Files/resources.** New `tools/vtt-handoff/art-validator.ts`; new `tools/vtt-handoff/png-inspection.ts`; new `tools/vtt-handoff/art-validate-cli.ts`; new `tests/unit/tools/vtt-handoff-art-validator.test.ts`; modify `package.json` to add `art:validate`.

**Tests.** Generate small synthetic PNG byte fixtures in temporary directories (not committed raster expectations) for valid RGBA, bad signature, wrong dimensions, no alpha, hash mismatch, normal mismatch, duplicate ids, wrong request identity, incomplete `.partial`, absolute/Windows/UNC/traversal/backslash paths, symlink escape, oversize sparse file, special file, and a script that is merely listed/rejected and never run. Assert inbox bytes/mtimes remain unchanged.

**Targeted gate.** `npx vitest run --configLoader runner tests/unit/tools/vtt-handoff-art-request.test.ts tests/unit/tools/vtt-handoff-art-validator.test.ts`; then `VTT_HANDOFF_ROOT=<synthetic-temp-root> npm run art:validate -- --json`.

**Verification/rollback/assumptions.** Supervisor independently hashes fixture assets and checks no command execution. Revert validator files/alias without touching inbox. Assumptions: v1 result frames are PNG for this unit; if Windows supplies another format, return a typed validation error and propose it for v2 instead of sniffing permissively.

### S9c — Review staging, provenance manifest, and explicit Windows-path probe

**Decision.** `art:stage` accepts only a clean `art:validate` report whose result status is `complete` and copies originals into the separately configured review root (default `<repo>/.tmp/vtt-art-review/<requestId>/`) using create-new semantics; `partial` and `blocked` are listed but never staged. Preserve source files byte-for-byte, recompute hashes after copy, copy result provenance, and write a review manifest with source request/result paths, validation timestamp, all hashes, view/pass metadata, and a future application-relative destination proposal. Write manifest last. This is preparation for a later reviewed copy into application-owned URLs because browsers cannot load arbitrary UNC paths; it does not add a server or expose the inbox/repository. Never write `public/assets/art`, never modify `ART-PROVENANCE.md`, `NOTICE.md`, `LICENSE-ART`, or existing production manifests, never relicense, and never replace an existing stage.

Keep the existing `art/requests` and `art/incoming` queue intact. Reuse its documented clean-room/top-down style facts, deliberate-review workflow, and provenance/licensing warnings (`art/requests/README.md:20-65`, `art/requests/README.md:81-91`); do not reuse its different filename/schema or flat incoming directory. Existing `uuidv7` establishes useful prior code but its queue naming is different (`art/requests/new-request.mjs:5-21`). The new shared outbox/inbox is additive, and no migration deletes or rewrites old requests.

The Windows-path probe is a normal test, never `.skip`/`.todo`. Only when `VTT_WINDOWS_INTEROP=1` is explicitly set does it convert the configured path with `wslpath`, create a random temporary probe below the handoff root, read the exact bytes back through the Windows-mounted spelling where supported, and remove only that probe. Without that gate, the test runs and asserts/prints `SKIPPED-WITH-REASON: VTT_WINDOWS_INTEROP is not 1`; it cannot silently pass as though interop was tested.

**Files/resources.** New `tools/vtt-handoff/art-stage.ts`; new `tools/vtt-handoff/windows-path-probe.ts`; new `tests/unit/tools/vtt-handoff-art-stage.test.ts`; modify `package.json` to add `art:stage`.

**Targeted gate.** `npx vitest run --configLoader runner tests/unit/tools/vtt-handoff-art-request.test.ts tests/unit/tools/vtt-handoff-art-validator.test.ts tests/unit/tools/vtt-handoff-art-stage.test.ts`; then run validation/staging against a synthetic temp inbox. If interop is available, additionally run `VTT_WINDOWS_INTEROP=1 VTT_HANDOFF_ROOT=... npx vitest run --configLoader runner tests/unit/tools/vtt-handoff-art-stage.test.ts -t 'Windows path probe'`.

**Verification/rollback/assumptions.** Supervisor compares source/staged hashes and verifies production art inventory is unchanged; that inventory is independently pinned today (`tests/unit/assets/starter-art.test.ts:132-153`) and tracked rasters outside exemptions are rejected (`tests/unit/source-is-greppable.test.ts:45-83`). Roll back code/tests/alias; staging is disposable review output, while inbox originals remain Windows-owned and untouched. Assumption: WSL interop may be unavailable; the explicit result records which case occurred.

### S10a — Durable architecture/protocol/art/security documentation (authorization-gated)

**Decision.** Once a dispatch explicitly permits `docs/**`, write concise documents that state facts and limitations rather than claim integration: architecture and single-engine dependency diagram; runtime transport API/lifecycle; exact v1 protocol and replacement-array semantics; coordinate/placeholder mapping; art request/result/validation/staging; trust boundaries, localhost token/origin/Host checks, player-Worker security ceiling; and future Windows/Godot connection steps. Include unresolved HTTPS certificate/local-server/deployment/origin/token-provisioning questions without deploying them. Link existing `docs/RPC-CONTRACT.md` only as a different database RPC, never merge meanings. Do not touch `.claude/**` or `docs/specs/**`.

**Files/resources.** New `docs/vtt-handoff/{architecture.md,runtime-api.md,protocol-v1.md,art-exchange.md,security-and-integration.md}` and new `tests/unit/vtt/handoff-docs.test.ts`. This six-file exception keeps the required durable documents coupled to an executable field/link/security assertion rather than letting them drift.

**Targeted gate.** `npx vitest run --configLoader runner tests/unit/vtt/handoff-docs.test.ts`. Run `rg -n "requestedRole|127\.0\.0\.1|UNSUPPORTED|replacement|player-hosted|HTTPS|origin|provenance" docs/vtt-handoff` and inspect every hit.

**Verification/rollback/assumptions.** Supervisor validates docs against contract/schema and actual commands. Revert documentation only. Assumption/authorization prerequisite: current no-`docs/**` restriction is lifted for this substep. If not, mark documentation incomplete/PARTIAL and do not create an alternate hidden source of truth.

### S10b — Reproducible Claude reports and final publication status

**Decision.** Extend `handoff:publish` to write only `reports/claude/READY.md` and `reports/claude/handoff.json`. Gather Git revision and changed-file list with read-only Git commands; doctor-recorded actual tool versions; v1 contract version and manifest/checksum; fixture paths/hashes; available adapters and exact supported methods; art queue/stage paths and the nine sample request ids; exact commands, exit codes, test counts/durations, and pre-existing failures; limitations/placeholders/security ceiling; and exact future Windows connection points. It must not claim a test ran unless a machine-readable execution record exists. If any required gate is missing/fails, docs authorization is absent, or a bundle is inconsistent, heading/status is `PARTIAL`, with each blocker. `READY` means ready for later integration, never “applications connected.” Update the contract bundle's `READY.json` only by the immutable S4b rules; reports do not mutate v1.

**Files/resources.** Modify `tools/vtt-handoff/publish.ts`; new `tools/vtt-handoff/handoff-report.ts`; new `tests/unit/tools/vtt-handoff-report.test.ts`; new durable `handoff/report-schema.json`; `package.json` already has `handoff:publish`.

**Targeted gate.** `npx vitest run --configLoader runner tests/unit/tools/vtt-handoff-publish.test.ts tests/unit/tools/vtt-handoff-report.test.ts`; run one synthetic all-pass report and one failed/missing-gate report and assert READY versus PARTIAL; then publish twice and prove report updates never alter `contracts/v1` bytes.

**Verification/rollback/assumptions.** The supervisor runs the whole battery below, supplies its execution record, reruns publish, and independently checks report claims/hashes. Roll back report code/schema; published report may be replaced only in Claude's own report directory, while contract v1 remains immutable. Assumption: supervisor provides authoritative integrated results; absent evidence produces PARTIAL rather than a fabricated pass.

## E. Security and side-effect statement

This statement is limited to surfaces actually inspected above: the encounter core/host/projections, database RPC/Worker, static server, Vite AI bridge, Discord-launcher DM bridge, local window channel, persistence adapters, board renderer, and existing art queue. It is not a repository-wide security certification.

- **New listener.** Only S7 adds one, only behind `npm run serve -- --vtt-runtime`, always bound to `127.0.0.1`. Default serve remains static. It requires a bearer token, validates Host/Origin, has no wildcard CORS, limits bodies/SSE clients, and exposes named `/vtt/v1/*` routes rather than `/dm/*` or filesystem browsing. No firewall, HTTPS, port-forward, LAN/public bind, arbitrary UNC serving, repository serving, or inbox serving is added.
- **Role/authorization.** `requestedRole` is untrusted data. In-process tests inject an authority; Worker configuration fixes the maximum seat before messages; Node maps a startup token to local DM. A browser request cannot self-promote. Player projection happens before protocol/serialization. The current player-window channel already requires player audience and exact request/revision/offered action (`src/vtt/local-window-channel.ts:26-84`); the new boundary preserves that principle.
- **Inbox threat model.** Treat every result JSON, filename, path, PNG, hash, provenance field, and source file as attacker-controlled. Strict size/type/schema, path containment, symlink, identity, signature, dimension/alpha/alignment, duplicate, and checksum checks occur before staging. No delivered script/module is imported, spawned, or executed. Scanning is explicit; completion JSON is the only commit marker and `.partial` is ignored.
- **Engine authority.** A coordinate in bootstrap `token.move` can only select a unique exact currently offered revision-bound engine command. No renderer/model can supply path, dice, DC, damage, reducer/world-operation command, or hidden state. `door.set` is a narrow DM-only domain intent. `light.set` is `UNSUPPORTED`. AI advice/plays/scores remain drafts and no model output auto-submits; frozen `src/vtt/intel/contracts.ts` is not touched. D405.3 remains flywheel-only, D406's Luna-low floor, D456's 180-second live wall, and D474's Luna-high escalation remain unchanged because this unit makes no model-routing or live-model call changes.
- **Secrets/trust ceiling.** DM snapshots never enter player channels. A player-hosted Worker is controlled by that player and therefore cannot protect secrets from them; fog rendering is not authorization. A future remote trusted server is outside scope. Existing AI DM semantic export, model routing, arena/probe calls, and model credentials are untouched.
- **Persistence/side effects.** Existing saves, coordinates, session schemas, undo/audit chains, IndexedDB, File System Access, SQLite character DB, Yjs/Trystero VTT, public art, notices/licenses, and Windows delivery/workspace are not migrated or discarded. Writes are limited to explicit `.tmp` handoff/stage roots, durable source/schema/fixtures/tests/docs when authorized, and Claude's report directory. Publishers are create-new/atomic and non-destructive.

## F. Gate battery

### Per-step targeted gates

Run each step's exact commands above. The cumulative non-browser contract suite after S10 is:

```sh
npx vitest run --configLoader runner \
  tests/unit/vtt/handoff-contract-v1.test.ts \
  tests/unit/vtt/handoff-scene-snapshot.test.ts \
  tests/unit/vtt/encounter-session-service.test.ts \
  tests/unit/vtt/handoff-boundary.test.ts \
  tests/unit/vtt/handoff-protocol-session.test.ts \
  tests/unit/vtt/handoff-in-process-transport.test.ts \
  tests/unit/vtt/handoff-node-runtime.test.ts \
  tests/unit/vtt/encounter-app-service-boundary.test.ts \
  tests/unit/tools/vtt-handoff-publish.test.ts \
  tests/unit/tools/vtt-handoff-art-request.test.ts \
  tests/unit/tools/vtt-handoff-art-validator.test.ts \
  tests/unit/tools/vtt-handoff-art-stage.test.ts \
  tests/unit/tools/vtt-handoff-report.test.ts
```

Final package aliases must exist exactly: `doctor`, `test:engine`, `test:protocol`, `test:worker`, `test:runtime-node`, `handoff:publish`, `art:request`, `art:validate`, and `art:stage`. Each test alias names only its owned/cumulative targeted specs and uses Vitest's `--configLoader runner`; it must not hide a full suite.

For touched browser specs, create the absolute `/tmp/vtt-handoff-playwright.config.ts` described in S6 and run one spec per invocation, always:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=/tmp/vtt-handoff-playwright.config.ts vtt-handoff-worker.spec.ts
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=/tmp/vtt-handoff-playwright.config.ts vtt-handoff-runtime-parity.spec.ts
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=/tmp/vtt-handoff-playwright.config.ts vtt-handoff-topdown-smoke.spec.ts
```

No outer `flock`, no retries, no `.skip`/`.todo`, no raised timeout unless a D544-named flaky test independently qualifies, and no art/atlas/context/capture expectation regeneration.

### Supervisor's authoritative whole-unit battery

The implementer does **not** run these full commands under the current quiet-box/full-gate prohibitions. After integration and when the box is quiet, the supervisor runs exactly:

```sh
npm run typecheck
npm run test
npm run build
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npm run test:browser
```

Before the battery, verify `sha256sum src/vtt/intel/contracts.ts` remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. Afterward run doctor, schema/example `--check`, the cumulative targeted suite, immutable temp-root publication, optional explicit Windows probe, and final `handoff:publish`. Record exact command, exit code, tests passed/failed/skipped-with-reason, and elapsed time. Any missing/failing gate makes the handoff report PARTIAL. Do not use `npm run test:gate`, `npm run test:gate:browser`, a full Vitest/Playwright run from the implementer lane, or an outer lock; the supervisor owns the integrated full battery.

## G. Owner questions and proposed v1 extensions

### Genuine owner questions

No owner design choice blocks S0-S9: the binding directive already chooses engine authority, both runtimes, bootstrap v1, ownership, and art workflow, and the current engine evidence resolves unsupported light toggling honestly.

The following genuine future product questions are documented but do not block v1: which process becomes the trusted remote authority; how DM/player tokens are provisioned/revoked; whether a local production service uses HTTPS and which origin set is allowed; whether Node sessions require durable file persistence; and whether the Godot client connects through HTTP+SSE, a later WebSocket adapter, or an exported local bridge.

### Implementation authorization prerequisite (not an owner design question)

The supervisor must decide before S10a whether that implementation dispatch may write the five named `docs/vtt-handoff/**` files despite the current no-`docs/**` restriction. Until expressly allowed, S10a remains unexecuted and the handoff report is PARTIAL.

### Proposed extensions — explicitly not part of bootstrap v1

These are recorded separately and must not appear as required v1 fields or changed v1 meanings:

1. `session.resume` with a resume token, durable mutation-id ledger, acknowledged event seq, and explicit unknown-outcome recovery.
2. Authenticated seat/token claims and capability metadata issued outside `requestedRole`.
3. Rich light-source fields/commands (`level`, radius, color, intensity, enabled) after the authoritative state models them; no reinterpretation of v1 `light.set` before then.
4. Multi-segment/multi-cell doors and authored wall orientation/elevation/material instead of placeholder cell perimeters.
5. Explicit scene/room identity distinct from encounter session id, plus scene transitions.
6. Persisted facing/elevation, non-square/variable grids, prop footprints/labels, tile stacks, and presentation provenance/fallback flags.
7. True per-seat explored-cell history rather than the v1 union of current visible cells and last-seen creature anchors.
8. Snapshot deltas/tombstones and pagination, while retaining full replacement snapshots as v1 semantics.
9. Spectator role, multiple player-seat bindings, remote trusted-server transport, HTTPS, and a separately reviewed WebSocket adapter.
10. Additional art formats/passes, animation timing, top-down/isometric view discriminants, signed result manifests, and an explicitly authorized promotion pipeline into `public/assets/art` with licensing/provenance review.

No extension may silently change or overwrite `contracts/v1`; it requires a new version/bundle and its own READY marker.
