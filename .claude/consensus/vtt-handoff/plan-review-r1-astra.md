Frozen hash, branch, HEAD, and clean working tree confirmed. I read both assumption registers. No files were changed and no test runners or builds were executed; verification used source inspection and one pure Zod snippet.

`P` below denotes [.tmp-plans/2026-09-09-vtt-handoff-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md).

1. **F1 — SIGNIFICANT — Bootstrap can modify the owner’s shared installation.**  
   **Claim:** S0 permits `npm ci` when dependency inspection finds missing packages (`P:108`).  
   **Evidence:** `node_modules` is currently a symlink to the owner checkout, confirmed by `ls -ld`; the independent register explicitly disproves installation isolation (`assumptions-astra-pass.md:15`). Checking package completeness does not establish installation isolation.  
   **Required change:** Before any installation, inspect the dependency directory and its resolved location. Refuse installation into shared dependencies; name the supervisor-controlled procedure for obtaining an isolated installation. Add a bootstrap test proving the installer is never invoked for a symlinked/shared directory. Printing the command is insufficient protection.

2. **F2 — SIGNIFICANT — Token coordinates violate the ground-center agreement.**  
   **Claim:** All token anchors pass through unchanged, with “no value … offset” (`P:85`, `P:91`, `P:145`).  
   **Evidence:** A Large footprint extends east/south from its stored anchor (`src/combat/creature-space.ts:409`); larger footprints follow the same convention. The register already disproved anchor equivalence (`assumptions-astra-pass.md:85`).  
   **Required change:** Project the occupied footprint’s ground center: for the existing rectangular footprints, `x = column + (w−1)/2`, `y = row + (h−1)/2`. Specify the inverse conversion when matching offered movement destinations, including squeezed footprints. Independently pin centers and round trips for multiple sizes. Saved coordinates must remain unchanged.

3. **F3 — SIGNIFICANT — The proposed safe projection cannot supply required token identity, and seat binding is incomplete.**  
   **Claim:** The adapter consumes existing seat-safe board projections while preserving `CombatToken.id`, and the service provides authorized player snapshots (`P:43`, `P:91`, `P:153`, `P:169`).  
   **Evidence:** `projectPlayerView` copies combatant identity and geometry but omits token identity (`src/combat/visibility.ts:590`). `PlayerBoardProjection` supplies neither tokens nor `PlayerView.cells` (`src/vtt/encounter-projections.ts:73`). The host currently constructs one party-wide seat whose viewer changes with the active combatant (`src/vtt/dm-encounter-host.ts:425`).  
   **Required change:** Name the projection changes that carry visible token IDs through the secrecy boundary. Define authoritative `playerId` resolution, ownership, absent/unknown IDs, and per-seat subscriptions. Test two distinct player bindings and attempts to move another seat’s token. Substituting combatant IDs or forwarding the existing party-wide snapshot is unacceptable.

4. **F4 — SIGNIFICANT — S1 narrows the binding wire types.**  
   **Claim:** The contract is verbatim, yet sizes must be positive and error codes nonempty (`P:81`, `P:127`, `P:133`).  
   **Evidence:** The owner specifies finite numbers for sizes and strings for codes, without those restrictions. The register explicitly identifies this distinction (`assumptions-astra-pass.md:179`). Existing engine restrictions are stronger (`src/combat/grid.ts:25`), but are not wire restrictions.  
   **Required change:** Separate bootstrap structural acceptance from engine feasibility checks. Remove unagreed positivity/nonempty restrictions from the wire schema, and add lawful boundary-value acceptance fixtures. Unsupported engine inputs can receive an explicit refusal after parsing.

5. **F5 — SIGNIFICANT — The immutable art contract is not sufficiently defined to publish.**  
   **Claim:** S1 defines strict art schemas “exactly,” leaving hashes/source files in “applicable … records” (`P:129`). Later steps require view metadata, frame identity, and normal conventions (`P:260`, `P:290`, `P:304`), while view discriminants are also listed as future extensions (`P:420`).  
   **Evidence:** The register identifies unresolved vocabularies, hash placement, frame identity, and provenance structure (`assumptions-astra-pass.md:183`). The plan repeats rather than resolves them.  
   **Required change:** Specify the concrete JSON shapes and vocabularies before publication, including how a returned frame is associated with a requested view, hash/source records, errors, normal convention, and frame uniqueness. Resolve the fallback-versus-extension contradiction. Apply filename-prefix and containment rules to source files as well as frames. A strict schema cannot defer these decisions until S9.

6. **F6 — SIGNIFICANT — The JSON Schema parity gate promises something its proposed generator cannot provide.**  
   **Claim:** Zod and generated JSON Schema validate the same fixtures, including dangling door references and duplicate entity identities (`P:133`).  
   **Evidence:** Draft 2020-12 generation is already supported (`tools/generate-engine-mcp-schemas.ts:9`). However, the permitted pure snippet confirmed that a Zod `superRefine` rejection disappears from generated schema. Cross-array foreign-key checks are not ordinary structural JSON Schema constraints. No independent validator is named; Ajv is only transitive (`package-lock.json:2296`).  
   **Required change:** Separate structural-schema parity from semantic validation. Name and provision the independent validator, publish semantic rules/tests separately, and include counterexamples proving both layers execute. Declaring `$schema` does not prove validation equivalence.

7. **F7 — SIGNIFICANT — Mutation completion and snapshot emission lack an implementable transaction boundary.**  
   **Claim:** Every successful mutation returns its revision and emits exactly one snapshot (`P:173`).  
   **Evidence:** `submitHumanDecision` returns immediately after submitting to a controller (`src/vtt/dm-encounter-host.ts:751`). The asynchronous pump publishes before and after steps and can continue processing (`src/vtt/dm-encounter-host.ts:527`, `:549`). Browser durability requires a separate flush (`src/vtt/encounter-app.ts:1487`).  
   **Required change:** Define how a dispatched intent awaits its actual committed outcome, identifies the acknowledged revision, and handles pending reactions, persistence failure, and concurrent calls. Distinguish mutation-correlated emission from later autonomous/rich-API state changes. Add delayed-flush, failed-flush, concurrent-duplicate, and external-state-change tests. Also define malformed-envelope handling when no valid correlation ID exists; do not fabricate one.

8. **F8 — SIGNIFICANT — `setDoorOpen` lacks both blocking semantics and coordinator safety.**  
   **Claim:** A narrow coordinator method changes a door through one normal persisted reducer transition (`P:153`, `P:157`, `P:165`).  
   **Evidence:** Movement, sight, and cover are independent wire fields (`src/combat/terrain.ts:16`). Cover can block movement even when `blocking.movement` is false (`src/combat/terrain.ts:149`). Existing DM mutations cancel pending requests before applying a command (`src/combat/coordinator.ts:355`); leaving a request outstanding across a revision change produces stale-response rejection (`src/combat/coordinator.ts:507`).  
   **Required change:** Specify exact supported open/closed triples, handling of noncanonical doors, no-op behavior, pending-request cancellation/reissue, and continuation/pause policy. Use the existing `world_operation` command with explicit actor/cost semantics (`src/combat/events.ts:160`, `src/combat/encounter.ts:12489`). Test opening and closing while a human request is pending, including replay and subsequent movement. Permit necessary existing journal transitions; “stop if more than one transition” does not resolve the requirement.

9. **F9 — SIGNIFICANT — HTTP has no defined logical session binding or client adapter.**  
   **Claim:** Sessions are connection-bound, and Node exposes separate POST and SSE endpoints (`P:169`, `P:216`, `P:238`).  
   **Evidence:** S7 supplies no cookie/header/session-handle convention tying those HTTP requests together. Its resource list contains no Node-facing `SceneTransport` client (`P:242`). The initial event is emitted immediately after open (`P:173`), potentially before SSE attachment.  
   **Required change:** Define authenticated transport-level session binding without changing the v1 envelope; repeated open, SSE attachment/reconnect, buffering/resnapshot, disposal, and ledger lifetime. Add an actual HTTP/SSE `SceneTransport`, including bearer-capable streaming. Test two simultaneous sessions sharing a DM principal, reconnect without ledger reset, late subscription, and pending-request cleanup. A TCP connection or bearer token alone is not a logical session.

10. **F10 — SIGNIFICANT — S7’s launch and typing story is incomplete.**  
    **Claim:** A JSDoc-typed `.mjs` adapter is “loaded through vite-node,” preserving `npm run serve` and avoiding untyped imports (`P:238`, `P:242`).  
    **Evidence:** `serve` runs plain Node (`package.json:11`); `serve.mjs` executes build/listen at module top level (`tools/serve.mjs:179`). The TypeScript configuration enables neither `allowJs` nor `checkJs` (`tsconfig.node.json:2`).  
    **Required change:** Choose the exact loading mechanism, isolate importable server factories from startup side effects, and provide an actual checked type boundary for the adapter. Test the real npm opt-in launch on an ephemeral port. Loading `.mjs` through Vite-node is possible, but the current plan does not establish that path or its type checking; a Vitest factory import cannot prove production startup.

11. **F11 — SIGNIFICANT — S3’s gate and indivisible-step justification are invalid as written.**  
    **Claim:** Seven files form one indivisible increment; its graph gate reaches UI, Worker, Node, and in-process entries and finds no alternate reducer/transport (`P:155`, `P:157`).  
    **Evidence:** Three entries do not exist until S5–S7. Renaming the persistence port affects additional callers, including `src/vtt/dm-bridge/client.ts:2`. The host already imports that transport-bearing module (`src/vtt/dm-encounter-host.ts:39`). A legitimate pacing path directly calls `reduceEncounter` (`src/vtt/session-persistence.ts:1115`).  
    **Required change:** Split port/adapter extraction, service intents, and door behavior into independently gated increments; enumerate mechanical callers. Grow entry-graph coverage as entries land. Define precise permitted reducer paths and portable adapter boundaries rather than banning existing behavior indiscriminately. Add targeted type checking before declaring each increment complete.

12. **F12 — SIGNIFICANT — The UI inventory omits session mutations and misplaces player selectors.**  
    **Claim:** Every state-changing UI call already passes through the host, and converting the listed calls completes S8 (`P:62`, `P:258`).  
    **Evidence:** Rename/delete directly call storage (`src/vtt/encounter-app.ts:1620`, `:1633`); restore/import bypass the host (`:1681`, `:1687`, `:1733`). The spell-preview calls being moved belong to the player view (`:1139`), which has no DM host service. These omissions were already recorded in assumptions A25–A27.  
    **Required change:** Add an explicit session-lifecycle/persistence adapter boundary and preservation tests for restore, import conflict, active deletion, and flush ordering. Specify how player preview selectors operate on safe projections without constructing DM authority. Keep browser handles and user gestures in browser adapters.

13. **F13 — SIGNIFICANT — Browser gates are not yet reproducible proof of the promised runtimes.**  
    **Claim:** Navigating to the D365 URL yields the board; the temporary wrapper and package aliases prove browser behavior (`P:226`, `P:264`, `P:370`).  
    **Evidence:** The existing test explicitly clicks “Load bundled dungeon and party” (`tests/browser/vtt-encounter.spec.ts:35`). Controllers are already human (`src/vtt/stored-character-encounter.ts:88`), but no concrete deterministic movement sequence is established. The wrapper omits explicit workers/baseURL/offline bridge settings that the normal config supplies (`playwright.config.ts:34`, `:45`, `:50`). Finally, `P:370` requires every test alias to use Vitest despite `test:worker` owning a Playwright spec.  
    **Required change:** Provide a durable wrapper or reproducible wrapper generator with complete settings and a verified load/move sequence. Correct the aliases. Name a production-reachable Worker entry or built harness and test its emitted bundle; a dev-only import does not prove the Worker ships. Resolve the parity test’s browser-to-ephemeral-Node origin/CORS setup explicitly.

14. **F14 — SIGNIFICANT — Header inspection does not validate completed PNGs.**  
    **Claim:** Signature/IHDR inspection proves dimensions and alpha (`P:292`), with tests limited accordingly (`P:296`).  
    **Evidence:** This repeats the limitation already identified in the existing helper, which reads signature and dimensions only (`src/assets/png.ts:213`; assumptions A81). A truncated file can advertise RGBA dimensions without containing valid image data. Compressed-byte limits do not bound decoded pixel allocation.  
    **Required change:** Validate complete PNG structure and image data under explicit dimension/pixel/decompression limits. Add corrupt/truncated IDAT, missing IEND, malformed chunks, invalid checksum, and excessive decoded-size controls, alongside independently valid transparent images. Do not call header-only inspection image validation.

15. **F15 — SIGNIFICANT — Staging trusts a stale validation result across an untrusted filesystem boundary.**  
    **Claim:** `art:stage` accepts a clean report and subsequently copies source files (`P:304`); validation checks paths using `lstat` and `realpath` (`P:290`).  
    **Evidence:** Validation and copying are separate operations, while the plan expressly treats inbox paths/files as attacker-controlled (`P:342`). Recomputing a hash after copying does not prevent reading outside the bundle after a path replacement, nor does it establish that copied bytes match the previously approved manifest.  
    **Required change:** Revalidate at staging, bind acceptance to exact manifest and file hashes, and use a safe file-opening/copy strategy with pre-copy limits and post-copy comparison against approved hashes. Cover source/provenance files, not only PNGs. Test changed manifests, swapped files/symlinks, and forged/stale reports. Preserve incomplete staging without publishing its completion manifest.

16. **F16 — SIGNIFICANT — The Windows probe manufactures a passing test for unexecuted interoperability.**  
    **Claim:** Without an environment flag, the test asserts a skip message and passes (`P:308`).  
    **Evidence:** Repository policy explicitly says skipped is not passed (`.claude/supervision.md:157`). The plan also supplies no concrete Windows-side process performing the read/write; `wslpath` translation alone was marked unproved interoperability (`assumptions-astra-pass.md:9`).  
    **Required change:** Separate the probe’s structured result from its unit tests. Report `NOT_RUN`/`UNAVAILABLE` without incrementing interop pass counts, and define its effect on READY. When available, run an actual Windows-side read/write against the translated path and verify both directions. Testing that a skip string exists does not test interoperability.

17. **F17 — SIGNIFICANT — Required negative-control verification has no implementation step.**  
    **Claim:** Invariant tests, source checks, and parity establish the new boundaries (`P:145`, `P:157`, `P:244`, `P:347`).  
    **Evidence:** Standing rules require applying each load-bearing negative control, proving it applied, observing failure, restoring it, and rerunning (`.claude/supervision.md:95`). The gate battery includes no such procedure. Three adapters sharing the same incorrect projector can still agree perfectly.  
    **Required change:** Assign supervisor-owned negative controls for authorization, hidden removal, anchor conversion, duplicate execution, reducer routing, and staging containment. Record failed-under-mutation and restored-pass evidence. Keep independent expected invariants separate from generated fixture comparisons.

18. **F18 — TRIVIAL — The anatomy names the persisted reducer incorrectly.**  
    **Claim:** `reduceVaneWarrenEncounter` is the explicitly named reducer in `session-encounter-reducer.ts` (`P:31`).  
    **Evidence:** That module exports `reduceSessionEncounter`, which delegates to `reduceVaneWarrenEncounter` (`src/vtt/session-encounter-reducer.ts:9`).  
    **Required change:** Correct the name and show the actual chain. The reuse decision itself is sound.

**Verified claims**

The following source claims were checked and found correct, subject to the findings above:

- Canonical aggregate fields: `src/combat/encounter.ts:750`.
- Constructor validates bounds and configuration: `src/combat/encounter.ts:1142`.
- Reducer advances encounter revision: `src/combat/encounter.ts:12942`.
- Grid cells and bounds use integer coordinates: `src/combat/grid.ts:25`.
- Grid distance uses five-foot cells: `src/combat/grid.ts:71`.
- Tokens retain distinct token/combatant IDs: `src/combat/combatant.ts:122`.
- Controlled footprints account for placement mode: `src/combat/creature-space.ts:462`.
- World-object kinds and blocking fields match the inventory: `src/combat/world-objects.ts:9`, `:50`.
- Light regions lack point-emitter photometry: `src/combat/world-objects.ts:70`.
- Empty environment regions are rejected: `src/combat/world-objects.ts:170`.
- Host injects the persisted-command reducer: `src/vtt/dm-encounter-host.ts:385`.
- Replay uses the same persisted-command reducer: `src/vtt/session-persistence.ts:1530`.
- Journal appends persist state, RNG, and checksum: `src/vtt/session-persistence.ts:2316`.
- Host subscriptions emit initially and support cleanup: `src/vtt/dm-encounter-host.ts:456`.
- DM projection clones canonical fields: `src/combat/visibility.ts:501`.
- Player filtering removes hidden geometry before projection: `src/combat/visibility.ts:583`.
- Last-seen positions come from observation history: `src/combat/visibility.ts:609`.
- Board floors are selected per row-major cell: `src/vtt/encounter-board.ts:899`.
- Board door appearance uses movement blocking: `src/vtt/encounter-board.ts:773`.
- Board token art lookup uses combatant identity: `src/vtt/encounter-board.ts:815`.
- Existing engine execution is in the DOM view: `src/vtt/encounter-app.ts:1415`.
- Existing Worker construction handles the database, with a separate capability Worker: `src/main.ts:181`, `src/pwa/browser-capability-worker-port.ts:64`.
- Existing RPC uses numeric IDs and closes pending requests: `src/rpc/protocol.ts:3`, `src/rpc/client.ts:105`.
- Static serve prepares `dist`, restricts methods, and binds loopback: `tools/serve.mjs:53`, `:138`, `:168`.
- MCP is a separate Node/stdio surface: `src/vtt/mcp/entrypoint.ts:1`, `:144`.
- Production-local `/dm/*` routes do exist: `tools/discord-launcher/codex-dm-bridge.mjs:102`.
- Worker builds have a separate Vite plugin pipeline: `vite.config.ts:192`.
- Existing tests cover movement projection, crash recovery, and hidden removal: `tests/unit/vtt/encounter-board-projection.test.ts:374`, `tests/unit/vtt/session-persistence.test.ts:579`, `tests/unit/combat/visibility.test.ts:193`.

I reject objections to **documented lossy rendering defaults themselves**: perimeter walls, placeholder photometry/facing, and incomplete exploration history are reasonable initial projections when clearly identified. Returning `UNSUPPORTED` for light toggling is honest. Keeping the default UI in-process, preserving MCP separately, and staging art without production promotion also fit the directive. The intended named documentation authorization removes the S10a permission concern.

VERDICT: REJECT
review complete