Implemented S10a and S10b.

### Changes

- Added the five authorized documents:
  - [architecture.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/docs/vtt-handoff/architecture.md)
  - [runtime-api.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/docs/vtt-handoff/runtime-api.md)
  - [protocol-v1.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/docs/vtt-handoff/protocol-v1.md)
  - [art-exchange.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/docs/vtt-handoff/art-exchange.md)
  - [security-and-integration.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/docs/vtt-handoff/security-and-integration.md)
- Added [report.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts):
  - Writes `reports/claude/handoff.json`, then `READY.md`, using temporary files and rename.
  - Never writes `reports/windows`.
  - Computes repository commit/changed files and six contract/fixture digests.
  - Records four adapters, five methods, nine sample art IDs, commands/tool versions, gate outcomes, pre-existing failures, Windows results, limitations, and connection points.
  - Missing, invalid, failed, unavailable, or not-run evidence produces `PARTIAL`.
  - `READY` requires all supplied required gates and Windows probe to be `PASSED`.
- Updated [publish.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/publish.ts) so default publication runs core → examples → report.
- Updated [package.json](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/package.json).
- Added [handoff-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/handoff-report.test.ts) with five tests and 29 new assertions. No existing `expect(` was removed, replaced, or weakened.

All eight ledger IDs—F79, F81, F82, F83, F87, F88, F94, F95—are named in both the security documentation and generated reports.

### Documentation sweep

Case-sensitive occurrence counts:

- `SceneSnapshot`: 4
- `Sec-WebSocket-Protocol`: 1
- `VTT_RUNTIME_TOKENS_FILE`: 2
- `loopback`: 5
- `Worker trust`: 2
- `PARTIAL`: 3
- `art`: 20
- `UNSUPPORTED`: 3
- `memory`: 6

Word counts:

- architecture.md: 442
- runtime-api.md: 383
- protocol-v1.md: 440
- art-exchange.md: 401
- security-and-integration.md: 528
- Total: 2,194

### Gates

- `npx vitest run --configLoader runner tests/unit/vtt/handoff-package-contract.test.ts tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/engine-boundary.test.ts`
  - Exit 0; 3 files, 25/25 tests.
- `npx vitest run --configLoader runner tests/unit/vtt/handoff-report.test.ts tests/unit/vtt/handoff-publish.test.ts`
  - Exit 0; 2 files, 10/10 tests.
- `npm run typecheck:fast`
  - Exit 0.
- `sg scan`
  - Exit 0.
- `git diff --check`
  - Exit 0.
- Additional trailing-whitespace sweep over all new untracked files: zero findings.
- Initial throwaway publication:
  - Core: 8 files published.
  - Examples: 3 files published.
  - Report: 2 files published as `PARTIAL`, reason `SUPERVISOR_RESULTS_MISSING`.
- Required check:
  - `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff-s10" npm run handoff:publish -- --check`
  - Exit 0; core 8 verified, examples 3 verified, report 2 verified.
  - No `reports/windows` directory created.

Plan and frozen-contract hashes remain:

- Plan: `25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d`
- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

HANDOFF S10 DONE
diff --git a/docs/vtt-handoff/architecture.md b/docs/vtt-handoff/architecture.md
new file mode 100644
index 0000000000000000000000000000000000000000..44829b1b57a1f02e97d10cb734f6803ab373d8b1
--- /dev/null
+++ b/docs/vtt-handoff/architecture.md
@@ -0,0 +1,26 @@
+# VTT handoff architecture
+
+This handoff preserves the plan's six boundaries:
+
+1. The rules/game-state core owns `EncounterState`, grid anchors, world mechanics, and reducer semantics (`src/combat/encounter.ts`, `src/combat/grid.ts`).
+2. The renderer-neutral application/session service owns the host, persistence barrier, FIFO outcomes, lifecycle, and seat registry (`src/vtt/dm-encounter-host.ts`, `src/vtt/encounter-session-service.ts`, `src/vtt/session-lifecycle.ts`).
+3. Protocol validation and per-seat projection produce the lossy v1 `SceneSnapshot` only after audience filtering (`src/vtt/handoff/v1/contracts.ts`, `src/vtt/encounter-projections.ts`, `src/vtt/handoff/scene-snapshot.ts`).
+4. The browser-Worker runtime crosses a module Worker/`MessageChannel` boundary (`src/vtt/handoff/worker-transport.ts`, `worker-entry.ts`).
+5. The Node/npm runtime provides an opt-in loopback WebSocket adapter (`tools/vtt-handoff/node-runtime.ts`, `src/vtt/handoff/websocket-transport.ts`).
+6. The existing top-down UI remains an in-process browser adapter (`src/vtt/encounter-app.ts`).
+
+There is one authoritative reducer path. It is pinned by `tests/unit/vtt/engine-boundary.test.ts`: runtime entries converge through the session service and host on the exact reducer edges in `src/vtt/session-encounter-reducer.ts`, `src/vtt/vane-warren.ts`, and `src/combat/encounter.ts`.
+
+The classic `/vtt` route remains in-process. `src/vtt/encounter-app.ts` uses `RichEncounterSessionService` for typed application intents, revision-bound offered option IDs, lifecycle operations, and safe player projections. Browser-only handles, navigation, downloads, local storage, `BroadcastChannel`, and DOM work stay in that adapter. It does not inject a Worker or the wire protocol.
+
+The smaller v1 surface is deliberately lossy. `src/vtt/handoff/protocol-runtime.ts` exposes only `session.open`, `scene.snapshot`, `token.move`, `door.set`, and `light.set`. It resolves a requested move back to a currently offered engine option; it does not accept paths, dice, DCs, damage, or reducer commands as authority. `SceneTransport` in `src/vtt/handoff/scene-transport.ts` gives renderers requests, an initial snapshot, snapshot/status/fault subscriptions, and terminal cleanup without exposing the session reducer.
+
+There are three transport arrangements:
+
+- `src/vtt/handoff/in-process-transport.ts` passes objects without serialization but still invokes the same v1 validation and dispatcher.
+- `src/vtt/handoff/worker-transport.ts` and `worker-entry.ts` use a real module Worker and `MessageChannel`. `worker-memory-session-store.ts` is explicit page-lifetime memory with a no-op flush. A new Worker creates a new memory session, opens it, and emits a full snapshot. Closing the page loses the state. The production `/vtt-handoff` route in `worker-harness.ts` is synthetic verification data, not a secret or durable host. Worker trust is equivalent to trust in the page that owns it.
+- `tools/vtt-handoff/node-runtime.ts` hosts the same dispatcher behind a loopback WebSocket. `src/vtt/handoff/websocket-transport.ts` is the browser-safe client. Each authenticated socket owns a session in the current implementation; reconnecting opens a new session and receives a new full snapshot.
+
+The rich service has terminal outcomes `committed`, `refused`, `cancelled`, `closed`, and `failed` (`src/vtt/encounter-session-service.ts`). A committed receipt is established before observers. Projections and renderer identity bindings are detached at capture time. Player subscriptions use the registered seat and visibility projection; the DM semantic export never enters a player channel.
+
+The contract bundle seal at `contracts/v1/READY.json` means only that the immutable schemas, declarations, and core fixtures form a complete atomic bundle. Overall integration readiness is separate and is reported as `READY` or `PARTIAL` under `reports/claude`.
diff --git a/docs/vtt-handoff/art-exchange.md b/docs/vtt-handoff/art-exchange.md
new file mode 100644
index 0000000000000000000000000000000000000000..f70ef198c3255e9ca00e2b5b68c4772b19ea520e
--- /dev/null
+++ b/docs/vtt-handoff/art-exchange.md
@@ -0,0 +1,23 @@
+# Art exchange
+
+The art contract is `contracts/vtt-handoff/v1/art.schema.json`, with TypeScript shapes in `contracts.d.ts` and `src/vtt/handoff/v1/contracts.ts`. Linux owns validation and staging. Windows or another producer may write a result bundle, but it does not decide whether that bundle is safe to consume.
+
+## Paths and ownership
+
+- Linux writes immutable requests to `art/outbox/<uuid-v7>.request.json` with `npm run art:request` (`tools/vtt-handoff/art-request.ts`).
+- The producer writes `art/inbox/<uuid-v7>.result.json` and payloads below `art/inbox/<uuid-v7>/`.
+- Linux validates a completed result with `npm run art:validate`, then copies and revalidates it into `art/review/<uuid-v7>/` with `npm run art:stage` (`art-validator.ts`, `art-stage.ts`).
+
+Writers must use their owned directory and must not alter `contracts/v1`, fixtures, another producer's bundle, or `reports/claude`. The Linux stage uses anchored, no-follow reads and exclusive promotion. It verifies source identities again after copying; the result manifest is written only after payload checks.
+
+## Request and result shapes
+
+An `ArtRequest` has `schemaVersion`, `requestId`, `assetId`, `brief`, requested `views` and `passes`, `pixelsPerCell`, and footprint. The current batch requests top-down and isometric views, four facings (0, 90, 180, 270), 128 pixels per cell, and albedo/normal with emissive only where requested. Sample asset IDs include `tile.stone.floor`, `wall.stone`, `door.wood`, `prop.barrel`, `prop.table`, `prop.pillar`, `prop.torch`, `token.adventurer`, and `token.goblin` (`tools/vtt-handoff/art-request.ts`).
+
+An `ArtResult` reports `complete`, `partial`, or `blocked`, lists assets and frames, and supplies provenance. Complete results must have no errors. Every declared source and image path must be portable and relative. Every payload is covered by a provenance SHA-256. When both views are requested, each frame declares its view or `provenance.frameViews` resolves it unambiguously.
+
+PNG validation checks signature, chunks, dimensions, color model, alpha expectations, pass dimensions, physical scale, pivots, and the requested facing set. The per-file limit is 64 MiB, the whole result limit is 256 MiB, the result JSON limit is 1 MiB, and provenance is limited to 4,096 entries (`tools/vtt-handoff/art-validator.ts`). Files outside the bundle, traversal paths, symlinks, changed files, hash mismatches, scale mismatches, missing facings, and incomplete results are refused.
+
+At runtime, `src/vtt/handoff/scene-snapshot.ts` maps engine asset provenance to the renderer's logical IDs. Unknown presentation has an explicit role fallback recorded in `assetFallbacks`; it does not add art data to persisted encounter or visibility-domain types. The classic top-down renderer uses the frame view/provenance when available; isometric-only input keeps its existing presentation fallback.
+
+The Windows probe is separate from art validation. `npm run windows:probe` opts in only with `VTT_WINDOWS_INTEROP=1`; it proves independent Windows-to-Linux and Linux-to-Windows byte/hash paths through the configured handoff root and removes only the named random probes (`tools/vtt-handoff/windows-probe.ts`).
diff --git a/docs/vtt-handoff/protocol-v1.md b/docs/vtt-handoff/protocol-v1.md
new file mode 100644
index 0000000000000000000000000000000000000000..327c7dec77b4b48bf8fafb0736341bdb7776dc81
--- /dev/null
+++ b/docs/vtt-handoff/protocol-v1.md
@@ -0,0 +1,25 @@
+# Protocol v1
+
+The authoritative schemas are `contracts/vtt-handoff/v1/protocol.schema.json` and `src/vtt/handoff/v1/contracts.ts`; the published declarations are `contracts/vtt-handoff/v1/contracts.d.ts`. Implementations must validate those shapes rather than this prose.
+
+## Wire envelopes
+
+Requests are exactly `{v:1,id,method,params}`. Success is `{v:1,id,ok:true,result}`. Refusal is `{v:1,id,ok:false,error:{code,message}}`. A full replacement event is `{v:1,event:"scene.snapshot",seq,data}`. A valid string ID, including the empty string, receives a correlated response. Invalid UTF-8 or JSON, or a missing/non-string ID, is a transport fault rather than a fabricated response. In-process and Worker adapters emit typed faults; the WebSocket server closes invalid text with 1007 and protocol structure with 1002 (`src/vtt/handoff/protocol-runtime.ts`, `tools/vtt-handoff/node-runtime.ts`).
+
+The five exact methods are:
+
+- `session.open`: `{requestedRole:"dm"|"player", playerId?}`. The out-of-band principal must match. Success returns the revision-independent logical session ID and capabilities.
+- `scene.snapshot`: empty parameters. It returns the current full `SceneSnapshot` for the authenticated audience.
+- `token.move`: `{tokenId,to:{x,y,z}}`. Coordinates describe a requested rendered destination only. `protocol-runtime.ts` converts the ground centre to an anchor and resolves exactly one current revision-bound offered option ID before the rich service submits it. Illegal, hidden, foreign, stale, absent, or ambiguous offers are refused.
+- `door.set`: `{doorId,open}` for the DM principal. No-op success retains the current revision and emits no snapshot. A changed durable mutation emits its own full snapshot.
+- `light.set`: structurally reserved but currently `UNSUPPORTED`; the engine has no light toggle mechanic. Unknown methods are also `UNSUPPORTED`.
+
+## Snapshot semantics
+
+`SceneSnapshot` contains grid dimensions, tiles, props, tokens, walls, doors, lights, and vision. It is a complete replacement, so arrays becoming shorter remove newly hidden or removed entities. Event `seq` starts at 1 per runtime and increments per emitted full snapshot independently of encounter revision. Opening emits the current full snapshot. Durable mutation and autonomous notifications emit snapshots; offer, status, recovery, refusals, cancellations, failures, and no-ops do not invent replacement snapshots.
+
+The mapping is lossy by design (`src/vtt/handoff/scene-snapshot.ts`). Engine board cells become ground-centred renderer coordinates, asset IDs are mapped through `asset-id-map.ts`, and visibility is filtered before transport. DM snapshots include environmental light regions. Player light audience is limited to visible projected light-source objects; DM-only environmental-light semantics do not cross into the player channel.
+
+Door geometry is represented by a `SceneDoor` referencing a companion `SceneWall`. The wall is derived from the door cell edge, and its movement/vision blocking flags carry the captured state. Ambiguous geometry throws during projection rather than selecting an arbitrary edge. Regular wall perimeter edges that overlap a door companion edge are removed.
+
+Mutation IDs are reserved before queueing and never released in the logical session ledger. Any reuse is `DUPLICATE_MUTATION`, including reuse after refused, cancelled, closed, or failed terminal settlement. This is distinct from WebSocket request-ID uniqueness, which is enforced for the life of one socket.
diff --git a/docs/vtt-handoff/runtime-api.md b/docs/vtt-handoff/runtime-api.md
new file mode 100644
index 0000000000000000000000000000000000000000..a8345ca9ec554eac76ba30421be04b912010bf9b
--- /dev/null
+++ b/docs/vtt-handoff/runtime-api.md
@@ -0,0 +1,30 @@
+# Runtime API
+
+## Rich in-process service
+
+`EncounterSessionService` and `RichEncounterSessionService` in `src/vtt/encounter-session-service.ts` are the application-facing authority boundary. They own FIFO submission, revision-bound offered option catalogs, player-seat authorization, terminal settlement, durability-aware top-down mutations, and detached DM/player captures. The classic browser UI calls typed methods such as `submitTopDownOfferedAction`, `submitTopDownPlacement`, `submitTopDownWorldObject`, and `applyTopDownAdjudication`; command construction remains inside the service.
+
+Mutation results are terminal: `committed` includes the applied revision and durable event, `refused` explains why no accepted mutation ran, `cancelled` means an accepted queued mutation was cancelled before apply, `closed` means the logical session is terminal, and `failed` distinguishes pre-apply from post-apply recovery. Callers display the outcome and do not retry automatically. `src/vtt/session-lifecycle.ts` provides the browser lifecycle boundary.
+
+## Renderer-facing transport
+
+`SceneTransport` in `src/vtt/handoff/scene-transport.ts` has:
+
+- `request(request)` for a v1 request envelope;
+- `initialSnapshot()` for the first full `SceneSnapshot`;
+- `subscribe`, `status`, `subscribeStatus`, and `subscribeErrors`;
+- `close()` to detach a connection, `dispose()` for terminal local cleanup, and `destroySession()` for explicit authoritative destruction.
+
+The in-process, Worker, and WebSocket implementations share that shape. Pending requests are correlated, observer exceptions are isolated, and terminal cleanup does not retry a mutation whose outcome is unknown. The object-only zero-serialization guarantee applies only to `InProcessSceneTransport`; Worker structured clone and WebSocket JSON are transport boundaries.
+
+## Worker runtime
+
+`createHandoffWorkerTransport` creates one module Worker connection. `createHandoffWorkerHost` can bind DM and player ports to a shared logical session key inside one Worker. Principals are supplied by the host-side connection, not by `session.open.requestedRole`; a mismatch is `UNAUTHORIZED`. The named memory store in `src/vtt/handoff/worker-memory-session-store.ts` is not persisted. A reload or new Worker must perform `session.open` and consume its initial full snapshot again.
+
+The `/vtt-handoff` harness in `src/vtt/handoff/worker-harness.ts` exercises a synthetic two-room session. It is a development/dist proof, separate from `/vtt`, and it is not a deployment control.
+
+## Node loopback runtime
+
+`tools/vtt-handoff/node-runtime-main.ts` requires `VTT_RUNTIME_TOKENS_FILE`, one or more exact origins unless originless clients are explicitly enabled, and a port other than 4173. `tools/vtt-handoff/node-runtime.ts` binds `127.0.0.1` and exposes `/vtt/v1`. The browser uses `WebSocketSceneTransport` from `src/vtt/handoff/websocket-transport.ts`.
+
+The token claim determines the runtime principal. `requestedRole` is an authorization assertion to check, not authentication. Socket reconnect does not resume an old authoritative session in this implementation: create a transport, send `session.open`, accept the returned session ID, and replace renderer state with the new full snapshot. Do not retry an unresolved mutation across reconnect.
diff --git a/docs/vtt-handoff/security-and-integration.md b/docs/vtt-handoff/security-and-integration.md
new file mode 100644
index 0000000000000000000000000000000000000000..9828b4b6e8523ed3486bbc047d8660288b1d0bcd
--- /dev/null
+++ b/docs/vtt-handoff/security-and-integration.md
@@ -0,0 +1,33 @@
+# Security and integration
+
+## Current trust boundary
+
+The Node runtime is loopback-only. `tools/vtt-handoff/node-runtime.ts` binds `127.0.0.1`, accepts only `/vtt/v1`, disables per-message deflate, caps payloads at 1 MiB, requires an exact allowed `Origin` unless explicitly configured for originless clients, and refuses malformed upgrades. This is local integration, not an Internet-facing WSS deployment.
+
+Authentication is supplied in `Sec-WebSocket-Protocol` as exactly `vtt.v1` plus `bearer.<base64url-token>`. The server selects only `vtt.v1`; the bearer protocol is upgrade authentication, not the negotiated application protocol. `VTT_RUNTIME_TOKENS_FILE` contains SHA-256 token claims bound to a DM or player principal. `tools/vtt-handoff/token-claims.ts` requires a regular nonsymlink file with mode 0600, caps it at 65,536 bytes, and checks the same device/inode before and after its bounded read. Never put the raw token in a URL or report.
+
+The authenticated claim, not `session.open.requestedRole`, owns the seat. Player claims require `playerId`; DM claims forbid it. Player projection and movement are constrained by the registered seat. Player-hosted Worker trust is not secret protection: a page that owns a Worker can observe its traffic and lifetime.
+
+Malformed transport input produces a typed fault or WebSocket close, never invented success. Unknown and `light.set` methods are `UNSUPPORTED`. Mutation IDs are permanently reserved per logical session. A lost connection with an unresolved mutation must not retry it automatically. Current socket reconnect behavior creates a new memory-backed session: issue `session.open`, discard old renderer state, and apply the new full snapshot.
+
+## Windows connection points
+
+The shared location is the absolute `VTT_HANDOFF_ROOT`, normally displayed to Windows as `\\wsl.localhost\Ubuntu\...`. Windows reads published `contracts/v1` and `fixtures`, writes only its owned `art/inbox/<request-id>` bundle and result manifest, reads requests from `art/outbox`, and reads reports from `reports/claude`. It must never write `reports/claude` or reinterpret contract `READY.json` as overall readiness. Linux never publishes a report under `reports/windows`.
+
+Before declaring integration ready, run the explicit bidirectional Windows probe in `tools/vtt-handoff/windows-probe.ts`. A Windows result of `NOT_RUN`, `UNAVAILABLE`, or `FAILED` makes the overall report `PARTIAL`; only `PASSED`, together with all required gate results, permits `READY`.
+
+`npm run handoff:publish` reads supervisor evidence from the absolute or relative file named by `VTT_HANDOFF_REPORT_INPUT` or `--report-input`. That JSON has `schemaVersion:1`, nonempty `tools` entries (`name`, actual `version`, actual `command`), nonempty `gates` entries (`name`, command, required flag, status, summary, and pre-existing failures), and one `windowsProbe` result. Missing or invalid evidence produces a truthful `PARTIAL` report. `--check` compares the expected report bytes and writes nothing.
+
+## Future deployment work
+
+An external deployment needs a TLS terminator and WSS, explicit trusted origins, host/proxy validation, secret distribution and rotation, rate and connection limits, durable session ownership, deployment health/observability, and a decision about resumption and idempotency. Do not expose the present loopback server directly or treat the synthetic Worker harness as a hardened runtime.
+
+## Known limitations at commit 042c530d
+
+- F79/F81: WebSocket identity-capture edge cases remain in the integration ledger.
+- F82/F87: Worker and terminal-outcome conformance coverage has known gaps.
+- F83: JSON-operation measurement proves the client side only.
+- F88: the production build inherits `NODE_ENV`; its correction is tracked separately on main.
+- F94/F95: top-down closure and post-close settlement edge cases remain ledgered.
+
+These limitations are not contract-bundle corruption. They prevent an unqualified overall readiness claim where applicable, and they must remain visible in `reports/claude/READY.md` and `handoff.json`.
diff --git a/package.json b/package.json
index f9f2fe86a007e3cb8e3b0b3ddeb61295bd8ff152..105a7994be25d5380ea512bb09477c6ebf674853
--- a/package.json
+++ b/package.json
@@ -45,7 +45,7 @@
     "test:protocol": "vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts",
     "test:worker": "playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts",
     "test:runtime-node": "vitest run --configLoader runner tests/unit/vtt/node-runtime.test.ts tests/unit/vtt/node-websocket-transport.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/engine-boundary.test.ts",
-    "handoff:publish": "node --experimental-strip-types tools/vtt-handoff/publish.ts --",
+    "handoff:publish": "node --experimental-strip-types tools/vtt-handoff/publish.ts",
     "art:request": "node --experimental-strip-types tools/vtt-handoff/art-request.ts --",
     "art:validate": "node --experimental-strip-types tools/vtt-handoff/art-validator.ts --",
     "art:stage": "node --experimental-strip-types tools/vtt-handoff/art-stage.ts --",
diff --git a/tests/unit/vtt/handoff-report.test.ts b/tests/unit/vtt/handoff-report.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..43d20483d2e428a8ceb9246585d5b1d4a969d285
--- /dev/null
+++ b/tests/unit/vtt/handoff-report.test.ts
@@ -0,0 +1,142 @@
+import { createHash } from 'node:crypto';
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
+import { describe, expect, it } from 'vitest';
+import {
+  existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
+} from '../../helpers/test-filesystem';
+import {
+  buildHandoffReport, publishHandoffReport, type SupervisorReportInput,
+} from '../../../tools/vtt-handoff/report';
+
+function root(): string {
+  return mkdtempSync(join(tmpdir(), 'vtt-handoff-report-'));
+}
+
+function input(
+  gateStatus: SupervisorReportInput['gates'][number]['status'] = 'PASSED',
+  windowsStatus: SupervisorReportInput['windowsProbe']['status'] = 'PASSED',
+): SupervisorReportInput {
+  return {
+    schemaVersion: 1,
+    tools: [
+      { name: 'node', version: process.version, command: 'node --version' },
+      { name: 'vitest', version: '4.1.10', command: 'npx vitest run focused.test.ts' },
+    ],
+    gates: [{
+      name: 'focused-contracts', command: 'npx vitest run focused.test.ts', required: true,
+      status: gateStatus, summary: gateStatus === 'PASSED' ? '2 tests passed' : '1 test failed',
+      preExistingFailures: gateStatus === 'FAILED' ? ['legacy-control: known before handoff'] : [],
+    }],
+    windowsProbe: {
+      status: windowsStatus, command: 'VTT_WINDOWS_INTEROP=1 npm run windows:probe',
+      reason: windowsStatus === 'PASSED' ? null : 'POWERSHELL_UNAVAILABLE',
+    },
+  };
+}
+
+function inputFile(directory: string, value: SupervisorReportInput): string {
+  const path = join(directory, 'supervisor-results.json');
+  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
+  return path;
+}
+
+describe('VTT handoff readiness report', () => {
+  it('writes READY evidence atomically under reports/claude and independently hashes every contract fixture', () => {
+    const handoffRoot = root();
+    const evidence = inputFile(handoffRoot, input());
+    const order: string[] = [];
+    const result = publishHandoffReport({
+      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence,
+      hooks: { nonce: () => 'fixed', afterRename: (path) => order.push(path) },
+    });
+    expect(result).toMatchObject({ status: 'published', readiness: 'READY', files: 2, reasons: [] });
+    expect(order).toEqual(['reports/claude/handoff.json', 'reports/claude/READY.md']);
+    expect(readdirSync(join(handoffRoot, 'reports/claude')).some((name) => name.includes('.partial.'))).toBe(false);
+    expect(existsSync(join(handoffRoot, 'reports/windows'))).toBe(false);
+
+    const report = JSON.parse(readFileSync(join(handoffRoot, 'reports/claude/handoff.json'), 'utf8')) as {
+      readonly readiness: string;
+      readonly repository: { readonly commit: string; readonly changedFiles: readonly string[] };
+      readonly digests: readonly { readonly path: string; readonly sha256: string; readonly length: number }[];
+      readonly methods: readonly string[];
+      readonly art: { readonly sampleAssetIds: readonly string[] };
+      readonly limitations: readonly string[];
+    };
+    expect(report.readiness).toBe('READY');
+    expect(report.repository.commit).toMatch(/^[a-f0-9]{40}$/u);
+    expect(report.repository.changedFiles).toContain('tools/vtt-handoff/report.ts');
+    expect(report.digests).toHaveLength(6);
+    for (const digest of report.digests) {
+      const bytes = readFileSync(join(process.cwd(), digest.path));
+      expect(digest).toEqual({
+        path: digest.path,
+        sha256: createHash('sha256').update(bytes).digest('hex'),
+        length: bytes.length,
+      });
+    }
+    expect(report.methods).toEqual(['session.open', 'scene.snapshot', 'token.move', 'door.set', 'light.set']);
+    expect(report.art.sampleAssetIds).toContain('token.adventurer');
+    expect(report.limitations.join('\n')).toContain('F94/F95');
+    expect(readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8'))
+      .toContain('contract-level contracts/v1/READY.json denotes only the atomic core bundle');
+    expect(publishHandoffReport({
+      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, check: true,
+    })).toMatchObject({ status: 'verified', readiness: 'READY', files: 2 });
+  });
+
+  it('reports PARTIAL with failed or not-run required gates instead of planned success', () => {
+    const handoffRoot = root();
+    const evidence = inputFile(handoffRoot, input('FAILED'));
+    const result = publishHandoffReport({ repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence });
+    expect(result).toMatchObject({
+      readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_FAILED: focused-contracts'],
+    });
+    const markdown = readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8');
+    expect(markdown).toContain('# VTT handoff: PARTIAL');
+    expect(markdown).toContain('legacy-control: known before handoff');
+    expect(markdown).not.toContain('# VTT handoff: READY\n');
+
+    const notRunEvidence = inputFile(handoffRoot, input('NOT_RUN'));
+    expect(buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: notRunEvidence }))
+      .toMatchObject({ readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_NOT_RUN: focused-contracts'] });
+  });
+
+  it('reports PARTIAL when the Windows probe is UNAVAILABLE even though every required gate passed', () => {
+    const handoffRoot = root();
+    const evidence = inputFile(handoffRoot, input('PASSED', 'UNAVAILABLE'));
+    const report = buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: evidence });
+    expect(report.readiness).toBe('PARTIAL');
+    expect(report.reasons).toEqual(['WINDOWS_PROBE_UNAVAILABLE']);
+    expect(report.evidence?.gates.every((gate) => gate.status === 'PASSED')).toBe(true);
+    expect(report.evidence?.windowsProbe).toMatchObject({
+      status: 'UNAVAILABLE', reason: 'POWERSHELL_UNAVAILABLE',
+    });
+  });
+
+  it('makes absent or invalid supervisor results PARTIAL and check mode performs no repair', () => {
+    const absent = buildHandoffReport({ repositoryRoot: process.cwd() });
+    expect(absent).toMatchObject({ readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_MISSING'], evidence: null });
+    const handoffRoot = root();
+    const invalid = join(handoffRoot, 'invalid-results.json');
+    writeFileSync(invalid, '{"schemaVersion":1,"gates":[]}\n');
+    expect(buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: invalid }))
+      .toMatchObject({ readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_INVALID'], evidence: null });
+    expect(() => publishHandoffReport({
+      repositoryRoot: process.cwd(), handoffRoot, inputPath: invalid, check: true,
+    })).toThrow('HANDOFF_REPORT_MISSING');
+    expect(existsSync(join(handoffRoot, 'reports'))).toBe(false);
+  });
+
+  it('detects report drift in check mode without overwriting the supplied bytes', () => {
+    const handoffRoot = root();
+    const evidence = inputFile(handoffRoot, input());
+    publishHandoffReport({ repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence });
+    const ready = join(handoffRoot, 'reports/claude/READY.md');
+    writeFileSync(ready, 'pre-existing divergent report\n');
+    expect(() => publishHandoffReport({
+      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, check: true,
+    })).toThrow('HANDOFF_REPORT_MISMATCH');
+    expect(readFileSync(ready, 'utf8')).toBe('pre-existing divergent report\n');
+  });
+});
diff --git a/tools/vtt-handoff/publish.ts b/tools/vtt-handoff/publish.ts
index c5b3ad85eb620f85902a090222c0229746a10727..71b4614c38fc734329927cde3b68ecb65c2746c4
--- a/tools/vtt-handoff/publish.ts
+++ b/tools/vtt-handoff/publish.ts
@@ -7,6 +7,7 @@
 import { dirname, join } from 'node:path';
 import { fileURLToPath } from 'node:url';
 import { handoffPaths, type RepositoryIdentityPolicy } from './paths.ts';
+import { publishHandoffReport } from './report.ts';
 
 interface PublicationEntry {
   readonly path: string;
@@ -271,14 +272,21 @@
   (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
   const coreOnly = process.argv.includes('--core') && !process.argv.includes('--examples');
   const examplesOnly = process.argv.includes('--examples') && !process.argv.includes('--core');
+  const reportOnly = process.argv.includes('--report');
   const check = process.argv.includes('--check');
-  if (coreOnly) {
+  const inputFlag = process.argv.indexOf('--report-input');
+  const inputPath = inputFlag < 0 ? process.env.VTT_HANDOFF_REPORT_INPUT : process.argv[inputFlag + 1];
+  if (inputFlag >= 0 && inputPath === undefined) throw new Error('--report-input requires a path.');
+  if (reportOnly) {
+    process.stdout.write(`${JSON.stringify(publishHandoffReport({ check, ...(inputPath === undefined ? {} : { inputPath }) }))}\n`);
+  } else if (coreOnly) {
     process.stdout.write(`${JSON.stringify(publishCore({ check }))}\n`);
   } else if (examplesOnly) {
     process.stdout.write(`${JSON.stringify(publishExamples({ check }))}\n`);
   } else {
     const core = publishCore({ check });
     const examples = publishExamples({ check });
-    process.stdout.write(`${JSON.stringify({ core, examples })}\n`);
+    const report = publishHandoffReport({ check, ...(inputPath === undefined ? {} : { inputPath }) });
+    process.stdout.write(`${JSON.stringify({ core, examples, report })}\n`);
   }
 }
diff --git a/tools/vtt-handoff/report.ts b/tools/vtt-handoff/report.ts
new file mode 100644
index 0000000000000000000000000000000000000000..5bb7bf976686a3730a410e8007d24f0c55428139
--- /dev/null
+++ b/tools/vtt-handoff/report.ts
@@ -0,0 +1,323 @@
+import { createHash, randomBytes } from 'node:crypto';
+import {
+  closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync,
+  renameSync, unlinkSync, writeSync,
+} from 'node:fs';
+import { dirname, join } from 'node:path';
+import { spawnSync } from 'node:child_process';
+import { z } from 'zod';
+import { HANDOFF_METHODS } from '../../src/vtt/handoff/v1/contracts.ts';
+import { ART_REQUEST_DEFINITIONS } from './art-request.ts';
+import { handoffPaths, type RepositoryIdentityPolicy } from './paths.ts';
+
+const resultStatusSchema = z.enum(['PASSED', 'FAILED', 'UNAVAILABLE', 'NOT_RUN']);
+const supervisorReportInputSchema = z.strictObject({
+  schemaVersion: z.literal(1),
+  tools: z.array(z.strictObject({
+    name: z.string().min(1), version: z.string().min(1), command: z.string().min(1),
+  })).min(1),
+  gates: z.array(z.strictObject({
+    name: z.string().min(1), command: z.string().min(1), required: z.boolean(),
+    status: resultStatusSchema, summary: z.string(),
+    preExistingFailures: z.array(z.string()),
+  })).min(1),
+  windowsProbe: z.strictObject({
+    status: resultStatusSchema, command: z.string().min(1), reason: z.string().nullable(),
+  }),
+});
+
+export type SupervisorReportInput = z.infer<typeof supervisorReportInputSchema>;
+export type HandoffReadiness = 'READY' | 'PARTIAL';
+
+interface DigestRecord {
+  readonly path: string;
+  readonly sha256: string;
+  readonly length: number;
+}
+
+export interface HandoffReport {
+  readonly schemaVersion: 1;
+  readonly readiness: HandoffReadiness;
+  readonly reasons: readonly string[];
+  readonly repository: {
+    readonly name: 'srd-55';
+    readonly root: string;
+    readonly commit: string;
+    readonly changedFiles: readonly string[];
+  };
+  readonly evidence: SupervisorReportInput | null;
+  readonly digests: readonly DigestRecord[];
+  readonly adapters: readonly { readonly name: string; readonly path: string }[];
+  readonly methods: readonly string[];
+  readonly art: {
+    readonly outbox: 'art/outbox';
+    readonly inbox: 'art/inbox';
+    readonly review: 'art/review';
+    readonly sampleAssetIds: readonly string[];
+  };
+  readonly limitations: readonly string[];
+  readonly connectionPoints: readonly string[];
+}
+
+export interface ReportPublishResult {
+  readonly root: string;
+  readonly status: 'published' | 'verified';
+  readonly readiness: HandoffReadiness;
+  readonly files: 2;
+  readonly reasons: readonly string[];
+}
+
+export interface ReportPublishHooks {
+  readonly nonce?: () => string;
+  readonly afterRename?: (relativePath: string) => void;
+}
+
+const DIGEST_PATHS = [
+  'contracts/vtt-handoff/v1/protocol.schema.json',
+  'contracts/vtt-handoff/v1/art.schema.json',
+  'contracts/vtt-handoff/v1/contracts.d.ts',
+  'fixtures/scenes/two-room.v1.json',
+  'fixtures/scenes/two-room.snapshots.v1.json',
+  'fixtures/protocol/examples.v1.json',
+] as const;
+
+const ADAPTERS = [
+  { name: 'rich in-process session', path: 'src/vtt/encounter-session-service.ts' },
+  { name: 'in-process SceneTransport', path: 'src/vtt/handoff/in-process-transport.ts' },
+  { name: 'module Worker SceneTransport', path: 'src/vtt/handoff/worker-transport.ts' },
+  { name: 'loopback WebSocket SceneTransport', path: 'src/vtt/handoff/websocket-transport.ts' },
+] as const;
+
+export const HANDOFF_LIMITATIONS = [
+  'F79/F81: WebSocket identity-capture edge cases remain in the integration ledger.',
+  'F82/F87: Worker and terminal-outcome conformance coverage still has known gaps.',
+  'F83: JSON-operation measurement proves the client side only.',
+  'F88: production build inherits NODE_ENV; the correction is tracked separately on main.',
+  'F94/F95: top-down closure and post-close settlement edge cases remain ledgered.',
+] as const;
+
+const CONNECTION_POINTS = [
+  'Browser in-process: src/vtt/encounter-app.ts -> src/vtt/encounter-session-service.ts',
+  'Browser Worker: src/vtt/handoff/worker-transport.ts -> src/vtt/handoff/worker-entry.ts',
+  'Node WebSocket: tools/vtt-handoff/node-runtime-main.ts -> tools/vtt-handoff/node-runtime.ts',
+  'Windows consumer: contracts/v1, fixtures, art/inbox, art/outbox, and reports/claude under VTT_HANDOFF_ROOT',
+] as const;
+
+function sha256(bytes: Uint8Array): string {
+  return createHash('sha256').update(bytes).digest('hex');
+}
+
+function git(repositoryRoot: string, args: readonly string[]): string {
+  const result = spawnSync('git', ['-C', repositoryRoot, ...args], { encoding: 'utf8' });
+  if (result.status !== 0) throw new Error(`REPORT_GIT_FAILED: ${result.stderr.trim()}`);
+  return result.stdout.trim();
+}
+
+function repositoryEvidence(repositoryRoot: string): HandoffReport['repository'] {
+  const changed = [
+    ...git(repositoryRoot, ['diff', '--name-only', 'HEAD', '--']).split('\n'),
+    ...git(repositoryRoot, ['ls-files', '--others', '--exclude-standard']).split('\n'),
+  ].filter((path) => path.length > 0);
+  return {
+    name: 'srd-55', root: repositoryRoot,
+    commit: git(repositoryRoot, ['rev-parse', 'HEAD']),
+    changedFiles: [...new Set(changed)].sort(),
+  };
+}
+
+function readSupervisorInput(inputPath: string | undefined): {
+  readonly input: SupervisorReportInput | null;
+  readonly reason: string | null;
+} {
+  if (inputPath === undefined || inputPath.length === 0) {
+    return { input: null, reason: 'SUPERVISOR_RESULTS_MISSING' };
+  }
+  let candidate: unknown;
+  try { candidate = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown; }
+  catch { return { input: null, reason: 'SUPERVISOR_RESULTS_UNREADABLE' }; }
+  const parsed = supervisorReportInputSchema.safeParse(candidate);
+  return parsed.success
+    ? { input: parsed.data, reason: null }
+    : { input: null, reason: 'SUPERVISOR_RESULTS_INVALID' };
+}
+
+function readiness(input: SupervisorReportInput | null, inputReason: string | null): {
+  readonly value: HandoffReadiness;
+  readonly reasons: readonly string[];
+} {
+  const reasons: string[] = [];
+  if (input === null) {
+    reasons.push(inputReason ?? 'SUPERVISOR_RESULTS_MISSING');
+  } else {
+    const required = input.gates.filter((gate) => gate.required);
+    if (required.length === 0) reasons.push('REQUIRED_GATES_MISSING');
+    for (const gate of required) {
+      if (gate.status !== 'PASSED') reasons.push(`REQUIRED_GATE_${gate.status}: ${gate.name}`);
+    }
+    if (input.windowsProbe.status !== 'PASSED') {
+      reasons.push(`WINDOWS_PROBE_${input.windowsProbe.status}`);
+    }
+  }
+  return { value: reasons.length === 0 ? 'READY' : 'PARTIAL', reasons };
+}
+
+export function buildHandoffReport(options: {
+  readonly repositoryRoot: string;
+  readonly inputPath?: string;
+}): HandoffReport {
+  const supplied = readSupervisorInput(options.inputPath);
+  const status = readiness(supplied.input, supplied.reason);
+  const digests = DIGEST_PATHS.map((path): DigestRecord => {
+    const bytes = readFileSync(join(options.repositoryRoot, path));
+    return { path, sha256: sha256(bytes), length: bytes.length };
+  });
+  return {
+    schemaVersion: 1,
+    readiness: status.value,
+    reasons: status.reasons,
+    repository: repositoryEvidence(options.repositoryRoot),
+    evidence: supplied.input,
+    digests,
+    adapters: ADAPTERS,
+    methods: [...HANDOFF_METHODS],
+    art: {
+      outbox: 'art/outbox', inbox: 'art/inbox', review: 'art/review',
+      sampleAssetIds: ART_REQUEST_DEFINITIONS.map((entry) => entry.assetId),
+    },
+    limitations: HANDOFF_LIMITATIONS,
+    connectionPoints: CONNECTION_POINTS,
+  };
+}
+
+function markdown(report: HandoffReport): Buffer {
+  const evidence = report.evidence;
+  const lines = [
+    `# VTT handoff: ${report.readiness}`,
+    '',
+    `Repository: ${report.repository.name}`,
+    `Commit: ${report.repository.commit}`,
+    `Root: ${report.repository.root}`,
+    '',
+    '## Reasons',
+    '',
+    ...(report.reasons.length === 0 ? ['- None.'] : report.reasons.map((reason) => `- ${reason}`)),
+    '',
+    '## Changed files',
+    '',
+    ...(report.repository.changedFiles.length === 0
+      ? ['- None.'] : report.repository.changedFiles.map((path) => `- ${path}`)),
+    '',
+    '## Tool evidence',
+    '',
+    ...(evidence?.tools.map((tool) => `- ${tool.name} ${tool.version}: ${tool.command}`)
+      ?? ['- No supervisor results supplied.']),
+    '',
+    '## Gate outcomes',
+    '',
+    ...(evidence?.gates.map((gate) => {
+      const existing = gate.preExistingFailures.length === 0
+        ? 'none' : gate.preExistingFailures.join('; ');
+      return `- ${gate.name}: ${gate.status}; required=${String(gate.required)}; command=${gate.command}; summary=${gate.summary}; pre-existing failures=${existing}`;
+    }) ?? ['- No supervisor results supplied.']),
+    '',
+    '## Windows probe',
+    '',
+    evidence === null
+      ? '- No supervisor results supplied.'
+      : `- ${evidence.windowsProbe.status}: ${evidence.windowsProbe.command}; reason=${evidence.windowsProbe.reason ?? 'none'}`,
+    '',
+    '## Contract and fixture digests',
+    '',
+    ...report.digests.map((digest) => `- ${digest.path}: sha256=${digest.sha256}; length=${String(digest.length)}`),
+    '',
+    '## Adapters and methods',
+    '',
+    ...report.adapters.map((adapter) => `- ${adapter.name}: ${adapter.path}`),
+    `- v1 methods: ${report.methods.join(', ')}`,
+    '',
+    '## Art exchange',
+    '',
+    `- Paths: ${report.art.outbox}, ${report.art.inbox}, ${report.art.review}`,
+    `- Sample asset IDs: ${report.art.sampleAssetIds.join(', ')}`,
+    '',
+    '## Known limitations',
+    '',
+    ...report.limitations.map((limitation) => `- ${limitation}`),
+    '',
+    '## Connection points',
+    '',
+    ...report.connectionPoints.map((point) => `- ${point}`),
+    '',
+    'The contract-level contracts/v1/READY.json denotes only the atomic core bundle; it does not assert this overall readiness result.',
+    '',
+  ];
+  return Buffer.from(lines.join('\n'));
+}
+
+function json(report: HandoffReport): Buffer {
+  return Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
+}
+
+function syncDirectory(directory: string): void {
+  const descriptor = openSync(directory, 'r');
+  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
+}
+
+function writeAtomic(destination: string, bytes: Buffer, nonce: () => string): void {
+  const partial = `${destination}.partial.${nonce()}`;
+  const descriptor = openSync(
+    partial,
+    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
+    0o644,
+  );
+  try {
+    let offset = 0;
+    while (offset < bytes.length) {
+      offset += writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
+    }
+    fsyncSync(descriptor);
+  } finally {
+    closeSync(descriptor);
+  }
+  try { renameSync(partial, destination); } finally { if (existsSync(partial)) unlinkSync(partial); }
+  syncDirectory(dirname(destination));
+}
+
+export function publishHandoffReport(options: {
+  readonly repositoryRoot?: string;
+  readonly handoffRoot?: string;
+  readonly inputPath?: string;
+  readonly check?: boolean;
+  readonly identityPolicy?: RepositoryIdentityPolicy;
+  readonly hooks?: ReportPublishHooks;
+} = {}): ReportPublishResult {
+  const paths = handoffPaths({
+    ...(options.repositoryRoot === undefined ? {} : { repositoryRoot: options.repositoryRoot }),
+    ...(options.handoffRoot === undefined ? {} : { handoffRoot: options.handoffRoot }),
+    ...(options.identityPolicy === undefined ? {} : { identityPolicy: options.identityPolicy }),
+  });
+  const report = buildHandoffReport({
+    repositoryRoot: paths.repositoryRoot,
+    ...(options.inputPath === undefined ? {} : { inputPath: options.inputPath }),
+  });
+  const entries = [
+    { path: 'reports/claude/handoff.json', bytes: json(report) },
+    { path: 'reports/claude/READY.md', bytes: markdown(report) },
+  ] as const;
+  if (options.check === true) {
+    for (const entry of entries) {
+      const destination = join(paths.handoffRoot, entry.path);
+      if (!existsSync(destination)) throw new Error(`HANDOFF_REPORT_MISSING: ${entry.path}`);
+      if (!readFileSync(destination).equals(entry.bytes)) throw new Error(`HANDOFF_REPORT_MISMATCH: ${entry.path}`);
+    }
+    return { root: paths.handoffRoot, status: 'verified', readiness: report.readiness, files: 2, reasons: report.reasons };
+  }
+  const reportDirectory = join(paths.handoffRoot, 'reports/claude');
+  mkdirSync(reportDirectory, { recursive: true });
+  const nonce = options.hooks?.nonce ?? (() => `${String(process.pid)}.${randomBytes(12).toString('hex')}`);
+  for (const entry of entries) {
+    writeAtomic(join(paths.handoffRoot, entry.path), entry.bytes, nonce);
+    options.hooks?.afterRename?.(entry.path);
+  }
+  return { root: paths.handoffRoot, status: 'published', readiness: report.readiness, files: 2, reasons: report.reasons };
+}
