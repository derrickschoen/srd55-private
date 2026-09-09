# OWNER DIRECTIVE (verbatim, 2026-09-09) — unit VTT-HANDOFF-01

You are Claude Code running in Ubuntu under WSL2 on my Windows computer.

Implement the backend/preparation half of a two-part project. I already have a
TypeScript D&D rules engine and a working top-down VTT. The backend can run as a
DM-local Node/npm process or in a browser Web Worker. Another agent, ChatGPT on
Windows, will independently build test art and an optional Godot 2.5D browser
client using a mock backend. We will join them in a later task.

Your deliverable is a working, tested refactor and handoff infrastructure—not
just an architecture document. Preserve the current application throughout.

## Shared integration agreement — use exactly this on both sides

The real TypeScript engine is authoritative. Godot is a replaceable view. The
Windows proof of concept must use a separate TypeScript mock engine in a Web
Worker, behind the same contract that will later reach the real engine.
Do not connect the two applications in this phase.

Repository: /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
Shared handoff root: <repository>/.tmp/vtt-handoff
Windows view:
\\wsl.localhost\Ubuntu\home\vagrant\PhpstormProjects\dnd-multiclass-spells-static\.tmp\vtt-handoff

Confirm these paths exist and the distribution is Ubuntu. Do not silently use a
lookalike repository. Paths must also be configurable, not scattered constants.

Ownership inside the handoff root:
- contracts/ and fixtures/: Claude publishes; Windows reads.
- art/outbox/: Claude publishes UUIDv7-named request JSON; Windows reads.
- art/inbox/: Windows publishes UUIDv7-named result bundles; Claude reads.
- reports/claude/ and reports/windows/: each agent writes only its own directory.
- deliveries/windows/: Windows publishes its standalone source/build handoff.

Only Claude changes the existing application repository. Windows keeps its
working project at %USERPROFILE%\VTT-Godot-POC, outside the WSL repository.
Do not share node_modules, Python environments, .godot caches or active Git
working trees across the two operating systems.

Bootstrap wire protocol, v1:
Request: {v:1,id:string,method:string,params:object}
Success: {v:1,id:string,ok:true,result:object}
Failure: {v:1,id:string,ok:false,error:{code:string,message:string}}
Event: {v:1,event:"scene.snapshot",seq:number,data:SceneSnapshot}

Methods and parameters:
- session.open: {requestedRole:"dm"|"player",playerId?:string}
  Result: {sessionId:string,capabilities:string[]}
- scene.snapshot: {}. Result: SceneSnapshot.
- token.move: {tokenId:string,to:{x:number,y:number,z:number}}
- door.set: {doorId:string,open:boolean}
- light.set: {lightId:string,enabled:boolean}
Mutations return {revision:number}; successful state changes also emit a full
snapshot. Unsupported operations return UNSUPPORTED, never invented success.
The requested role is not authentication. A real backend must authorize it.

SceneSnapshot contains:
- sceneId:string; revision:number.
- grid:{width:number,height:number,feetPerCell:number}.
- tiles and props: arrays of {id,assetId,x,y,z}.
- tokens: array of {id,label,assetId,x,y,z,facing,footprint:{w,h}}.
- walls: array of {id,a:{x,y},b:{x,y},baseZ,height,
  blocksMovement,blocksVision,assetId?}.
- doors: array of {id,wallId,open,assetId?}.
- lights: array of {id,x,y,z,radius,color,intensity,enabled}.
- vision:{mode:"all"|"cells",visible:[number,number][],
  explored:[number,number][]}.
All IDs/assetIds/labels are strings. Coordinates, sizes, radii, intensities,
revisions and facings are finite numbers; blocking/open/enabled fields are
booleans. Color is #RRGGBB. Revisions and event seq are safe integers.
Coordinates/sizes are in grid cells; x points east, y south, z up. Integer x/y
identify cell centers. Token x/y are ground-center anchors. Facing is degrees
from +x toward +y. Each door controls its referenced wall segment. Snapshot
arrays replace previous arrays, including removal of previously visible tokens.

This is an initial rendering projection, not a replacement campaign format or
complete D&D command API. The production model can remain richer. Keep existing
engine IDs; UUIDv7 is required for new art requests, not for rewriting old IDs.

Claude owns the versioned JSON Schema, TypeScript definitions, examples and
contract tests. Publish immutable contract bundles with a checksum manifest and
a READY.json written last. Windows pins a validated local copy. If none exists
yet, Windows implements this bootstrap agreement locally, records it as
provisional, and continues. Neither side waits indefinitely or silently changes
the v1 meanings. Record proposed extensions separately.

Art exchange:
- Request: art/outbox/<uuidv7>.request.json, with schemaVersion:1, requestId,
  assetId, brief, views, passes, pixelsPerCell and footprint.
- Result files: art/inbox/<uuidv7>/..., with filenames beginning <uuidv7>__.
- Completion: art/inbox/<uuidv7>.result.json, with schemaVersion:1, requestId,
  status:"complete"|"partial"|"blocked", assets, provenance and errors.
- Each asset has assetId, footprint, heightCells, pixelsPerCell and frames.
  Each frame has facing, frameIndex, width, height, pivotPx:[x,y], albedo and
  optional normal/emissive paths. Paths are relative to the result bundle.
  Record SHA-256 hashes, source files and the normal-map convention.
Copy through .partial files and publish the result JSON last. Never ingest an
unfinished bundle. Preserve originals and do not silently overwrite results.

## 1. Inspect, protect and install only what this side needs

Confirm the repository, read its agent instructions and inspect git status.
Preserve uncommitted work. Do not reset, clean, stash, force-push or change
branches underneath another running agent. Make small reviewable changes;
commit only your own changes when appropriate, and do not push.

Audit the actual rules/state modules, existing UI, Node entry point, Worker
entry point, persistence, networking, tests and package manager. Do not assume
an earlier description still matches the code. Record missing components rather
than inventing an existing implementation.

Run the existing build/tests before changing behavior. Add characterization
fixtures for important rules and token interactions where coverage is weak.

Inventory Linux tools. Reuse the project's required Node version and lockfile.
Install missing development/test dependencies, Python with a project-local
virtual environment, and basic utilities as needed. Use Linux tools for the
WSL project. Do not install Windows Node packages into its node_modules.
Do not install Blender or a large Godot toolchain on this side unnecessarily;
Windows owns asset production and Godot compilation in this phase.

Use official packages/downloads; inspect installation commands. Prefer
user-local installation where feasible. Never change sudo policy, disable
security, wipe environments or start a blanket OS upgrade. If approval is
required, request that specific approval and continue independent work.
Provide an idempotent bootstrap script and a doctor command.

## 2. Publish the minimum handoff early

Create the shared directory layout without altering existing .tmp contents.
Keep durable schemas, scripts and documentation in version control; the shared
.tmp directory is an exchange cache, not the only copy of important work.

Write and publish the bootstrap v1 contract, validation schemas and a small
synthetic two-room scene early so Windows can proceed. Include examples of
session initialization, snapshot, token movement, door changes, light changes
and rejected commands. Use no real campaign secrets in these fixtures.

Suggested logical asset IDs:
 tile.stone.floor, wall.stone, door.wood, prop.barrel, prop.table,
 prop.pillar, prop.torch, token.adventurer, token.goblin.

The initial scene can use five-foot cells. Convert from the existing game's
actual coordinate system at the adapter boundary; never change existing saved
coordinates simply to match the demo.

## 3. Extract one authoritative engine, not a second implementation

Establish clear boundaries corresponding to:
- rules/game-state core;
- renderer-neutral application/session service;
- protocol/validation and view projection;
- browser-Worker runtime;
- Node/npm runtime;
- existing top-down UI adapter.

Use the repository's current organization when possible. Do not introduce a
monorepo framework just to achieve these boundaries.

The core must not depend on DOM, React, canvas, Godot, WebSocket instances,
IndexedDB/Dexie or Node filesystem APIs. Keep persistence, transport, random
sources and clocks behind suitable adapters. Preserve deterministic test
behavior and existing randomness semantics.

The authoritative state must not contain DOM nodes, screen pixels, canvas
handles, Godot node paths or camera settings. Keep presentation metadata and
selection separate from rules. Represent world coordinates and footprints
without tying them to an isometric projection.

Preserve existing rules, IDs, saves, undo/audit behavior, resources, permissions,
house rules and feature support. Avoid unrelated game-mechanics changes.
Do not silently migrate or discard existing campaigns.

The existing UI must actually use the extracted engine/service boundary. It
must not keep calling an old independent copy of the rules. Route state-changing
UI interactions through typed intents/commands; UI reads should receive safe
snapshots/selectors rather than mutable authoritative objects.

The bootstrap protocol is only the optional renderer-facing view. Existing
complex commands can stay in the richer application API. Adapt them instead of
forcing all game behavior into the five demo methods. Expose real engine
capabilities honestly and return UNSUPPORTED where a feature does not exist.

Add dependency-boundary checks and tests demonstrating there is only one rules
implementation used by both execution modes and the existing UI.

## 4. Preserve both TypeScript runtime modes

Use a common logical transport interface: request, subscribe, initial snapshot,
close/dispose, connection status and error handling. Reuse existing transports
where possible; avoid extra serialization for in-process tests.

Worker mode must use an actual browser Worker with postMessage/MessageChannel,
not an in-process mock that merely has "Worker" in its name. Keep browser-only
and Node-only imports out of each other's bundles. Standard message passing
must not acquire an unnecessary SharedArrayBuffer dependency.

Node mode must retain the existing DM-local npm startup workflow. Reuse its
network transport or add the smallest necessary localhost API/adapter.
Validate requests and authorization at authoritative boundaries. A role field
in a browser request must not grant DM access. Do not expose new public network
listeners or change firewall settings. Document the later HTTPS/local-server,
origin-validation and deployment questions without deploying a public service.

For both modes test correlation IDs, validation failures, mutation results,
initial state, session reconnect/resnapshot, subscription cleanup and duplicate
mutation IDs within a session. Do not retry a mutation blindly after an unknown
outcome. Do not assume a new Worker survives page closure.

Player filtering belongs before state crosses an untrusted client boundary.
Test removal when an entity becomes hidden, not just its initial omission.
Document that a player-controlled Worker is not a trusted server protecting
secrets from that player. Preserve the existing actual trust model and flag
limitations; do not claim that a fog texture provides security.

## 5. Prepare and validate the art inbox

Implement commands for creating UUIDv7 art requests, listing completed results,
validating results and staging accepted assets. Reuse an existing queue if it
can satisfy this agreement; migrate non-destructively rather than deleting it.

Create requests for the logical asset IDs listed above. Give them consistent
style, ground-pivot, scale, facing and render-pass requirements. Use a tested
UUIDv7 implementation; randomUUID alone is not a UUIDv7 implementation.

Validate JSON, request identity, image signatures/dimensions/alpha, hashes,
albedo/normal alignment, duplicate IDs and relative paths. Reject path traversal,
symlink escapes and unreasonable file sizes. Do not execute scripts delivered
with artwork merely because they are in the inbox.

A completed render is not automatically production-approved art. Stage assets
and provenance for review; do not overwrite production assets or relicense
anything. Preserve the project's current notices and license boundaries.
The existing top-down UI must have a fallback when an asset only has an
isometric presentation.

The browser will not load arbitrary UNC paths. Prepare a manifest/copy pipeline
for later serving approved assets as application assets. Do not expose the
whole repository or inbox through an HTTP directory server.

Test the exchange with synthetic files and a Windows-path write/read probe if
interop is available. Do not generate the real art or manipulate Gemini here.
If cross-filesystem watching is unreliable, provide explicit scan/import
commands instead of pretending file events are guaranteed.

## 6. Concrete commands, tests and stopping point

Provide scripts using the existing package manager, with names equivalent to:
 doctor
 test:engine
 test:protocol
 test:worker
 test:runtime-node
 handoff:publish
 art:request
 art:validate
 art:stage

Keep existing dev/build/test commands working. Add at least one top-down browser
smoke test and contract/engine parity tests across the real Worker and Node
adapters. Use synthetic fixtures, fixed clocks/random inputs where appropriate,
and report tests actually executed.

Write concise durable documentation covering the architecture, runtime adapter
API, protocol, art exchange, security boundaries and future integration steps.
Publish reports/claude/READY.md and a machine-readable handoff with:
- repository/commit or changed-file list;
- actual installed tool versions and commands;
- contract version, checksum and fixture locations;
- runtime adapters available and supported methods;
- art queue paths and sample request IDs;
- tests executed, outcomes and pre-existing failures;
- remaining limitations and exact connection points for the Windows client.

READY means ready for the later integration phase, not that both applications
are already joined. If a gate fails, label the handoff PARTIAL and explain it.

Stop after the refactored top-down application works, both existing backend
modes are preserved/tested, and the contract/art exchange is ready. Do not build
the Godot UI, edit the Windows workspace or connect its mock demo to real games.
Do not stop after planning: implement, run, fix and leave reproducible results.
