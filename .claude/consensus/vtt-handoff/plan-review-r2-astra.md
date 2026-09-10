Confirmed the r2 hash, 577 lines, unchanged HEAD/branch, and clean tree. No files changed; no tests, scripts, or builds ran.

`P` denotes the [frozen r2 plan](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md). Prior finding numbers are retained; new findings begin at F19.

1. **F5 — SIGNIFICANT — The art shapes are now concrete, but change the binding agreement.**  
   **Claim:** The contract remains verbatim while `Frame.view` becomes required and image paths become `{path,sha256}` objects (`P:186`, `P:188`, `P:571`).  
   **Evidence:** The owner’s frame agreement names `albedo` and optional normal/emissive **paths**, without a required `view`. None of the supplied subsequent rulings authorizes these changes. `P:563` itself says v1 field changes require an owner decision.  
   **Required change:** Preserve path-valued frame fields and place hashes/view associations in an agreed provenance representation, or obtain an explicit contract amendment before publication. My previous request to resolve unspecified metadata was not authorization to add required frame fields.

2. **F7 — SIGNIFICANT — Mutation settlement still omits refusal/cancellation, and malformed IDs now receive fabricated correlation.**  
   **Claim:** FIFO intents settle through a successful reducer commit signal (`P:264`); requests lacking an ID receive `id:""` (`P:304`).  
   **Evidence:** Coordinator execution can return a refusal without applying a reducer (`src/combat/coordinator.ts:774`, `:848`, `:864`). The host then returns from its pump (`src/vtt/dm-encounter-host.ts:558`). Such an intent has no successful commit signal to await. Separately, empty string is explicitly a lawful request ID (`P:186`), so the fabricated failure can collide with an unrelated pending request.  
   **Required change:** Define terminal outcomes for committed, refused, cancelled, closed, and failed intents, with tests proving the queue continues or closes deliberately. Handle uncorrelatable malformed messages through transport error/closure, without inventing an ID. Test a legitimate pending `id:""` alongside malformed input.

3. **F8 — SIGNIFICANT — Cancelling a door-adjacent request does not refresh its offered actions.**  
   **Claim:** Cancel/abort, apply the door change, and repump to obtain a fresh request (`P:280`).  
   **Evidence:** Cancellation clears the request but preserves continuation (`src/combat/coordinator.ts:333`). A turn continuation contains its old `legalActions` (`:60`); `step()` resumes it directly (`:798`), and `#continueTurn()` reuses those actions (`:729`). Cancellation is swallowed only while paused (`:887`), whereas the plan says preserve the running state.  
   **Required change:** Specify quiescence of the outstanding step, cancellation handling, and recomputation of legal offers after geometry changes. Test both newly enabled and newly invalidated moves—not merely a new request ID/revision—and rejection safety before any cancellation side effect. Also correct the claimed missing noncombat authority: `actor:null,cost:"none"` already exists (`src/combat/encounter.ts:12489`); any narrower door policy must be identified as policy.

4. **F11 — SIGNIFICANT — S3a’s “every caller” and clock inventory remain incomplete.**  
   **Claim:** Six resources cover every production interface caller and all ambient timestamps (`P:236`, `P:238`).  
   **Evidence:** `tools/ai-dm-conversation.ts:109` imports `BrowserSessionStore` and uses it at `:696`; it is omitted. Tools are typechecked (`tsconfig.node.json:27`). `appendAll()` also calls `new Date()` at `src/vtt/local-session-store.ts:326`, outside the listed replacement sites.  
   **Required change:** Include the tool caller and import timestamp now, then retain the implementation-time discovery check. Pin imported-session metadata with the injected clock. A future re-audit does not substantiate the current exhaustive inventory.

5. **F13 — SIGNIFICANT — The production browser gate precedes its build, and the Node unit gate hides a build.**  
   **Claim:** The browser spec loads the built Worker, but its command precedes `npm run build` (`P:344`, `P:346`). The Node unit test launches ordinary `npm run serve` (`P:358`).  
   **Evidence:** Serve unconditionally prepares `dist` through the build cache (`tools/serve.mjs:53`, `:179`). Meanwhile, `P:532` reserves full integrated gates for the supervisor.  
   **Required change:** Make fresh supervisor-produced `dist` an explicit prerequisite before built-browser testing. Define its production server/config separately from the dev-server case. Move the real npm-launch check into a serialized supervisor integration gate so ordinary Vitest execution cannot unexpectedly trigger a build. Record which artifact each browser result exercised.

6. **F14 — SIGNIFICANT — PNG completeness improved, but lawful opaque art is rejected.**  
   **Claim:** Every albedo must contain an alpha value below 255, and opaque images are negative controls (`P:424`, `P:428`).  
   **Evidence:** Neither the owner agreement nor the new request shape requires universal transparency (`P:188`). Existing artwork supports opaque pixels by default (`src/assets/bitmap.ts:30`), including floor recipes (`src/assets/pixel-art.ts:469`). Validating alpha is not equivalent to requiring transparency.  
   **Required change:** Separate image validity from asset/view-specific transparency requirements. Accept valid opaque floor albedo and require transparent backgrounds only where the request requires them. Retain the new corruption/decompression controls.

7. **F15 — SIGNIFICANT — Final-component `O_NOFOLLOW` does not secure ancestor directories.**  
   **Claim:** Containment, `lstat`, `O_NOFOLLOW`, and inode comparison make staging race-resistant (`P:436`).  
   **Evidence:** The stated sequence performs pathname checks before opening; it does not anchor traversal through trusted directory descriptors. A parent directory can be replaced with a symlink after containment checking but before `lstat`; the final ordinary file then passes the described `lstat`/`fstat` comparison. The final-component flag does not prevent that traversal.  
   **Required change:** Specify descriptor-anchored traversal that rejects symlinks for every directory component, including the bundle root. Apply it to manifests and provenance sources as well as images. Add a parent-directory swap control distinct from the final-file symlink control. Post-read hash failure does not undo an unauthorized read.

8. **F17 — SIGNIFICANT — The prescribed staging negative control can remain green correctly.**  
   **Claim:** Removing either `O_NOFOLLOW` or the inode check must make the symlink-swap test fail (`P:555`).  
   **Evidence:** The remaining check can independently reject the same final-file swap under the algorithm at `P:436`. Thus neither prescribed single deletion necessarily disables the behavior being tested.  
   **Required change:** Define an effective behavioral mutant, or isolate each mechanism with an appropriate race point. Require the named assertion to fail for the intended reason, with an executed-test count. For the anchor mutant at `P:552`, explicitly require pinned expected centers in that same test; removing matching forward/inverse offsets can preserve round-trip equality.

9. **F19 — SIGNIFICANT — Authentication occurs after upgrade, contrary to D593.**  
   **Claim:** The bearer is supplied in the first WebSocket message, “immediately after upgrade” (`P:364`, `P:368`).  
   **Evidence:** The supplied binding ruling requires bearer authentication **at the handshake**. The candidate repeats first-frame authentication in documentation and its security statement (`P:462`, `P:484`); this is a deliberate transport change, not wording.  
   **Required change:** Choose a browser-compatible credential mechanism that authenticates during the handshake, or obtain an explicit supervisor amendment. Reject unauthenticated upgrades before creating an application socket/session. Also specify the token-to-principal configuration needed for the promised two-player tests: a single `VTT_RUNTIME_TOKEN` does not explain how distinct registered player claims are provisioned (`P:356`, `P:376`). Client-requested role/player ID cannot supply those claims.

10. **F20 — SIGNIFICANT — The ordered plan has forward dependencies that prevent independent gates.**  
    **Claim:** S2c generates real open/move/door/duplicate examples and publishes them (`P:226`), before the service transaction, door intent, and dispatcher exist in S3c/S3d/S4. S7a tests authentication and fragmented authenticated traffic before S7b introduces authentication (`P:358`, `P:360`, `P:368`).  
    **Evidence:** The resource/step ordering explicitly places these implementations later (`P:128`, `P:131–134`, `P:138–139`).  
    **Required change:** Reorder prerequisites or split publication and transport increments so each gate uses only existing components. Do not manufacture protocol examples with a second dispatcher or self-certified outputs. Preserve early handoff by explicitly defining what can be published before executable transcripts, without later overwriting an immutable bundle.

11. **F21 — SIGNIFICANT — A five-method `SceneTransport` cannot replace the existing rich UI service.**  
    **Claim:** Query opt-in injects Worker transport into the shipped top-down application (`P:338`, `P:342`), preserving all rich operations and lifecycle behavior (`P:396`).  
    **Evidence:** The UI consumes `DmBoardProjection`, pending controller requests, history, resources, and rich commands (`src/vtt/encounter-projections.ts:98`, `:398`; `src/vtt/encounter-app.ts:2932`). These are absent from `SceneSnapshot` and the five-method protocol. Initialization also contains functions such as `turnLegalActions` and `composeNextRoom` (`src/vtt/stored-character-encounter.ts:32`), while current persistence explicitly uses IndexedDB plus `localStorage` (`src/vtt/encounter-app.ts:1458`).  
    **Required change:** Plan a separate typed rich application-service proxy, cloneable initialization recipe, and concrete Worker persistence/lifecycle adapter. Include save/reload/RNG/undo and restore/delete quiescence tests. Alternatively, retain the existing UI in-process and provide a dedicated production Worker harness, as the directive permits. Simply injecting `SceneTransport` cannot preserve this UI.

12. **F22 — SIGNIFICANT — Closed doors are projected twice into wall geometry.**  
    **Claim:** The wall union includes all wall-terrain objects, while every door separately emits a companion wall (`P:100–101`, `P:202`).  
    **Evidence:** A canonical closed door uses `cover:"total"` (`P:278`); `terrainWallCells()` includes every object with that terrain classification, without excluding doors (`src/combat/terrain.ts:158`). An isolated closed door therefore produces four union-perimeter segments plus a duplicate north companion segment. Adjacent doors introduce further ownership ambiguity.  
    **Required change:** Explicitly separate door-controlled geometry from non-door perimeter geometry, define stable segment IDs and overlap precedence, and test isolated/adjacent/multicell doors through open/close transitions. Every emitted door must control its referenced segment without duplicate or orphan blockers. Restore an explicit player omission policy for environment-derived lights as well: player board projections contain no environment (`src/vtt/encounter-projections.ts:73`), although `P:102` now describes light regions without an audience qualification.

13. **F23 — SIGNIFICANT — The manifest command does not produce the required exact dev-dependency pins.**  
    **Claim:** Both dev dependencies are exact, and the following gate requires exact strings (`P:153`, `P:159`, `P:164`).  
    **Evidence:** The first install command omits `--save-exact`. Installed npm defaults `save-exact` to false and `save-prefix` to `^` (`/home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/npm/node_modules/@npmcli/config/lib/definitions/definitions.js:1725`, `:1796`).  
    **Required change:** Add `--save-exact` to the dev-dependency command. Keep installation materialization supervisor-only. An explicit package version argument alone does not guarantee an exact manifest entry.

**Verified claims**

Round-one dispositions below assess the **plan**, not implementation completion.

| Prior finding | Disposition | Evidence |
|---|---|---|
| F1 Shared installation | **Resolved** | No materializing lane installs; symlink refusal and zero-installer test at `P:23`, `:174`. |
| F2 Ground-center anchors | **Resolved** | Forward/inverse formulas at `P:93`, `:113` match footprint expansion in `src/combat/creature-space.ts:396`. |
| F3 Token identity / seats | **Resolved at design level** | Filtered `tokenId`, visible cells, registry and ownership at `P:202`, `:262`. `DmVisiblePlacedCombatant` inherits the changed type (`src/combat/visibility.ts:205`), so its constructor at `:702` must also populate it in S2a. |
| F4 Numeric/string narrowing | **Resolved** | `P:186–190` separates lawful wire values from engine feasibility; engine restrictions remain at `src/combat/grid.ts:25`. |
| F5 Art contract | **Partially resolved** | Concrete metadata exists, but required fields/path meanings change; finding above. |
| F6 Schema parity | **Resolved** | Independent Ajv structural evaluation and separate semantic counterexamples at `P:182`, `:190`; existing Zod generation supports the dialect (`tools/generate-engine-mcp-schemas.ts:9`). |
| F7 Mutation completion | **Partially resolved** | Durable flush barrier added; refusal/cancellation and correlation remain defective. |
| F8 Door safety | **Partially resolved** | Exact triples/no-op/replay specified; stale continuations remain. |
| F9 HTTP session binding | **Resolved by replacement** | Socket-bound lifecycle, late-event buffering and explicit fresh reconnect at `P:368–370`; handshake authorization is new F19. |
| F10 Node loader / typing | **Resolved at design level** | Typed `.ts` factory/main and explicit child launcher at `P:352–356`; the referenced executable exists (`node_modules/vite-node/package.json:68`). |
| F11 Granularity / callers | **Partially resolved** | Better split and growing graph, but omitted callers and forward dependencies remain. |
| F12 UI lifecycle/selectors | **Resolved for in-process design** | Lifecycle port and safe player selector at `P:246–250`, `:292`, `:396`; original bypasses are acknowledged at `src/vtt/encounter-app.ts:1620`, `:1681`. Worker preservation is new F21. |
| F13 Browser proof | **Partially resolved** | Explicit load action/config/Playwright alias added; artifact and ordering gaps remain. |
| F14 PNG validation | **Partially resolved** | Complete decoding/bounds replace the inadequate helper (`src/assets/png.ts:213`); opaque-art rejection is excessive. |
| F15 Staging race | **Partially resolved** | Live revalidation/descriptors/hashes added; ancestor races remain. |
| F16 Windows probe | **Resolved** | Actual PowerShell two-way probe and distinct non-pass outcomes at `P:446–454`; readiness treatment is explicit at `P:474`. |
| F17 Negative controls | **Partially resolved** | Supervisor procedure exists at `P:546`; particular mutants need correction. |
| F18 Reducer name | **Resolved** | `P:37` correctly names `reduceSessionEncounter`; source is `src/vtt/session-encounter-reducer.ts:9`. Replay call is specifically at `src/vtt/session-persistence.ts:1535`, just outside the revised citation range. |

Additional retained claims checked against the unchanged source:

- Canonical state and revision advancement: `src/combat/encounter.ts:750`, `:12942`.
- Distinct token/combatant IDs: `src/combat/combatant.ts:122`.
- Host reducer injection and replay chain: `src/vtt/dm-encounter-host.ts:385`, `src/vtt/session-persistence.ts:1535`.
- Hidden filtering precedes projected geometry: `src/combat/visibility.ts:583`.
- Board art lookup and bounds requirements: `src/vtt/encounter-board.ts:815`, `:850`.
- Existing host runs in the DOM view: `src/vtt/encounter-app.ts:1415`.
- Existing Worker URL pattern and separate build pipeline: `src/main.ts:181`, `vite.config.ts:192`.
- Static serve remains plain Node and loopback-bound: `package.json:11`, `tools/serve.mjs:168`.
- Existing `/dm/*` companion is distinct: `tools/discord-launcher/codex-dm-bridge.mjs:102`.
- No Node pin and authorized documentation scope are correctly reflected at `P:25`, `:27`, `:456`.

I do not object to choosing `ws`, the fresh-socket duplicate-ledger policy, or explicitly documented lossy presentation defaults. Those choices do not justify changing handshake authorization, adding required art fields, or bypassing the rich service boundary.

VERDICT: REJECT
review complete