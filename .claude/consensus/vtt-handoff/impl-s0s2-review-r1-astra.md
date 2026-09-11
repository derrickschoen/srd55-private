**S0–S2 is not ready for acceptance.** The committed protocol differs substantially from the owner’s agreement, and the green tests encode several of those differences.

HEAD, clean tree, accepted-plan hash, and frozen-contract hash match. I performed only read-only inspection. Below, `plan` refers to `.tmp-plans/2026-09-09-vtt-handoff-plan.md`.

1. **F1 — SIGNIFICANT — The request/response/event protocol is incompatible with v1.**

   **Evidence:** `src/vtt/handoff/v1/contracts.ts:53–96` and `contracts/vtt-handoff/v1/protocol.schema.json:60–103`:
   
   - Replace envelope `v:1` with `schemaVersion:1`.
   - Replace `session.open` with `scene.open`.
   - Require `sceneId` for `scene.snapshot`, whose parameters must be `{}`.
   - Add required `sceneId`, `revision`, and `mutationId` to mutations.
   - Replace event `data` with `snapshot`.
   - Permit arbitrary success results, including primitives, and add `error.details`.
   - Provide no method-result validators for `{sessionId,capabilities}` or `{revision}`.

   **Required change:** Implement the owner’s envelopes, method names, parameters, and results exactly, as required by plan:157. Add owner-authored examples of every envelope and method. A literal `{v:1,id:"",method:"scene.snapshot",params:{}}` must pass.

   **Rejected alternative:** Renaming these fields on the Windows side would silently change the agreed v1 contract.

2. **F2 — SIGNIFICANT — `SceneSnapshot` also changes the wire agreement.**

   **Evidence:** `src/vtt/handoff/v1/contracts.ts:14–46`; `contracts/vtt-handoff/v1/protocol.schema.json:15–58`:
   
   - Add required snapshot `schemaVersion`.
   - Use token `name` instead of `label`.
   - Use three-dimensional wall `from`/`to` instead of two-dimensional `a`/`b`.
   - Reject optional wall `assetId`.
   - Require door `assetId`, which is optional.
   - Represent vision cells as objects instead of `[number,number]` tuples.
   - Accept any light color, including `""`, instead of `#RRGGBB`.

   The adapter emits these incompatible shapes at `src/vtt/handoff/scene-snapshot.ts:60–64,80–82,151–154,228–242`.

   **Required change:** Correct both validators, declarations, adapter output, and fixtures. Preserve permissive ordinary strings and finite numbers without removing the owner’s explicit color constraint.

3. **F3 — SIGNIFICANT — Renderer enrichment invents IDs instead of preserving engine token IDs.**

   **Evidence:** `rendererTokenId()` returns ``renderer-token:${combatantId}`` at `src/vtt/handoff/scene-snapshot.ts:35–36`, and snapshots use it at line 149. The board model carries combatant identity (`src/vtt/encounter-board.ts:814–828`), while actual tokens have distinct IDs (`src/combat/combatant.ts:122–126`). The fixture’s canonical token ID is `token:two-room-adventurer` (`src/vtt/handoff/fixtures/two-room.ts:34`), but its snapshot publishes `renderer-token:combatant:two-room-adventurer` (`fixtures/scenes/two-room.snapshots.v1.json:713`).

   **Required change:** Implement the transient canonical-token identity index and filtered intersection required by plan:169–175. Keep persisted types unchanged. Assert literal canonical IDs and hidden-ID exclusion.

   **Rejected alternative:** “Renderer-only” permits enrichment outside persistence; it does not authorize rewriting existing IDs. The test at `tests/unit/vtt/scene-snapshot.test.ts:65` calls the same ID-generating helper for its expectation and therefore certifies the wrong behavior.

4. **F4 — SIGNIFICANT — The claimed Zod/Ajv parity and contract coverage are insufficient.**

   **Evidence:** The generic Zod request accepts unknown methods (`contracts.ts:76–78`), but the published schema accepts only five known methods (`protocol.schema.json:60–63,91–92`). `tests/unit/vtt/handoff-contract.test.ts:62–66` checks unknown methods only through Zod.

   The tests validate three positive objects through Ajv, but do not compare negative results, responses, events, or every method (`handoff-contract.test.ts:54–84`). Their snapshot fixture already contains the unauthorized fields and invalid empty color (`:14–25`).

   **Required change:** Publish the generic request schema consistently, retaining separate known-method validation. Add independent positive and negative cases across both validators for every envelope, method, required/optional field, numeric boundary, color, and semantic-only counterexample.

   **Rejected alternative:** Agreement between two implementations of the wrong fixture does not establish agreement with the owner’s contract.

5. **F5 — SIGNIFICANT — Published TypeScript definitions omit most of the handoff API.**

   **Evidence:** `tools/vtt-handoff/publish.ts:9–30` publishes only snapshot-related interfaces and a method-name union. It omits request, success, failure, event, method parameter/result, and art request/result/provenance/frame definitions. It also independently repeats the incorrect protocol shapes.

   **Required change:** Publish complete definitions from a maintained authoritative contract source, with a gate proving consumers can type every agreed exchange. Check declaration/schema/runtime consistency; hashing incomplete declarations is insufficient.

6. **F6 — SIGNIFICANT — Art semantics reject compliant filenames and accept mismatched deliveries.**

   **Evidence:** `src/vtt/handoff/v1/validation.ts:94–96` requires `<uuid>-…`, accepts UUID versions 1–8, and never binds the filename UUID to `requestId`. The agreement requires `<request-uuidv7>__…`. The tests reinforce the wrong spelling at `tests/unit/vtt/handoff-contract.test.ts:38–39`.

   Additionally, `validation.ts:55–81` accepts an explicitly supplied unrequested view, never compares an asset’s identity with the requested asset, and checks unrequested normal/emissive passes but not albedo. `frameViews` entries are not comprehensively validated.

   **Required change:** Implement exact request-bound UUIDv7 filename semantics and complete the plan:161 view/pass/path/identity checks. Add compliant-prefix acceptance and rejection cases for wrong UUID, version, separator, asset, view, and pass. Preserve structural acceptance separately from semantic rejection.

7. **F7 — SIGNIFICANT — Repository lookalike refusal is not implemented.**

   **Evidence:** `tools/vtt-handoff/paths.ts:32–35` accepts any directory containing `.git` and a package named `srd-55`. `resolveHandoffRoot()` accepts `repositoryRoot` but never checks it (`:42–54`). Consequently, an unrelated lookalike checkout can supply publication payloads while the default destination remains the owner’s handoff root.

   **Required change:** Validate the actual repository/worktree identity against the configured owner repository and authorized worktree policy before reading publication inputs. Add negative tests for lookalikes and unauthorized default publication. Preserve the explicit absolute override behavior required by plan:13–19,147.

8. **F8 — SIGNIFICANT — Doctor reports success without verifying the required environment; the shared-installation test substitutes its own verdict.**

   **Evidence:** `paths.ts:57–58` invents `Ubuntu` when the distribution variable is absent. `doctor.ts:42` always returns `ok:true`, including missing tools, missing lockfile, unverifiable UNC, or shared dependencies. The recorded doctor output actually reports both `ok:true` and `SHARED_NODE_MODULES_REFUSED` (`.tmp/vtt-handoff-gates/final-s0b-doctor.log:6,28–36`).

   The bootstrap test injects an inspector that already returns refusal (`tests/unit/vtt/handoff-bootstrap.test.ts:41–47`); it never creates and inspects an actual symlink. `inspectNodeModules()` also classifies dangling symlinks as absent because `existsSync()` precedes `lstatSync()` (`paths.ts:85–89`).

   **Required change:** Verify Ubuntu/WSL rather than defaulting to it; distinguish diagnostic completion from readiness and report required failures honestly. Test actual symlink/outside/dangling cases and zero Node-installer calls. Keep Node-major drift warning-only.

9. **F9 — SIGNIFICANT — S2a’s required projection gates are missing.**

   **Evidence:** `tests/unit/vtt/scene-snapshot.test.ts:47–56` tests arithmetic helpers with supplied spans, not real Large/Huge/Gargantuan/squeezed tokens through the adapter. All coordinator fixtures use `pendingRequest:null` (`:11–16`). The remaining cases cover one initial player projection and one closed door (`:59–80`).

   There is no baseline pending-request JSON/checksum comparison, visible-to-hidden transition, complete inverse-size matrix, or open/adjacent/multicell/ambiguous door matrix required by plan:94,102,175.

   **Required change:** Add those cases using real engine projections and independent expectations. For example, forcing adapter footprints to `{w:1,h:1}` would leave the current arithmetic-helper tests passing; the required integration cases must fail.

10. **F10 — SIGNIFICANT — The synthetic fixture does not exercise the promised logical assets.**

    **Evidence:** The table and torch use rubble/hazard art (`src/vtt/handoff/fixtures/two-room.ts:59–63`). The adapter prioritizes those terrain assets over object identity (`scene-snapshot.ts:135–141`), producing `prop.pillar` for both objects (`fixtures/scenes/two-room.snapshots.v1.json:697–705`). No fixture assertion requires the nine logical IDs promised by plan:183.

    **Required change:** Make the fixture and mapping exercise all nine IDs without changing production art inventories. Pin the logical identities of the table, torch, barrel, pillar, wall, door, floor, and tokens, including honest fallback telemetry.

11. **F11 — SIGNIFICANT — A test can regenerate its expectations before checking them.**

    **Evidence:** `tests/unit/vtt/two-room-fixture.test.ts:10–11` writes tracked fixture JSON when `VTT_HANDOFF_GENERATE=1`; lines 47–49 subsequently compare those files with the same generator. Seed and clock assertions also compare output with constants imported from its implementation (`:17–18`).

    **Required change:** Remove fixture writing from test execution. Keep generation an explicit separate operation. Pin seed, clock, identities, and topology independently; retain generated equality only as an additional check.

    **Rejected alternative:** Limited topology assertions do not justify overwriting the rest of the expected document before comparison.

12. **F12 — SIGNIFICANT — The exact generator CLI does not establish that `--check` executed.**

    **Evidence:** `tools/vtt-handoff/generate-fixtures.ts:32` runs its entry point only when `process.argv[1]` equals the module path. The planned invocation omits `--script` (`plan:185`); installed `vite-node` preserves its own executable in that argv position unless script mode is selected (`node_modules/vite-node/dist/cli.mjs:41–49`).

    Independently, the recorded exact-command gate failed before execution (`.tmp/vtt-handoff-gates/final-s2b-vite-node-check.log:6,22`). Supervisor materialization removes that historical filesystem obstacle, but does not fix the entry-point guard.

    **Required change:** Make the documented command execute the checker reliably. Have the supervisor verify the actual CLI with valid, missing, and deliberately divergent fixture files in an isolated root, proving nonzero failure without writes.

13. **F13 — SIGNIFICANT — Publication is not immutable under collisions/concurrency, and its tests do not prove the claimed guarantees.**

    **Evidence:** `tools/vtt-handoff/publish.ts:58–66` opens a predictable `.partial` with truncating `'w'` and uses replacement-capable `renameSync()`. Compatibility checking occurs earlier (`:109–117`), leaving a race in which another publisher’s bytes can be truncated or overwritten. Existing partial symlinks are followed.

    A bundle containing READY but missing a payload is silently repaired while READY remains visible (`:71–78,111–117`). The READY-order test checks only timestamps with `>=` (`tests/unit/vtt/handoff-publish.test.ts:28`); the “read-only” test never asserts absence of writes (`:43–48`).

    **Required change:** Use collision-safe partial creation and no-replace publication or serialized publication with compatibility checks inside that boundary. Refuse inconsistent already-sealed bundles. Add adversarial collision, interrupted-publication, existing-READY, ordering, and zero-write check-mode controls.

**Verified claims**

- The 23 changed paths match the S0a–S2c resource scope; no existing test was deleted and no `.claude/**`, `docs/**`, combat-domain, persistence, or frozen-contract file changed.
- Exact direct dependencies are present: `package.json:50,61,63`; no Node pin was added.
- The presentation-only `visibleCells` addition clones canonical player cells: `src/vtt/encounter-projections.ts:80–81,284`.
- Ground-center arithmetic and integer-anchor rejection are correct: `src/vtt/handoff/scene-snapshot.ts:14–22`.
- Doors are excluded from the generic wall union; companion edges suppress coincident ordinary edges: `scene-snapshot.ts:161–205`.
- Player environment lights are omitted: `scene-snapshot.ts:211–219`.
- Art image fields are strings, hashes reside in `provenance.files[]`, and frame view remains optional: `src/vtt/handoff/v1/contracts.ts:107–125`.
- The fixture uses real `createEncounter`, real projections, a 12×8 board, the dividing-wall gap, and empty DM notes: `src/vtt/handoff/fixtures/two-room.ts:90–114,144–154`.
- Publication computes five SHA-256/length entries and writes READY last on a fresh, uncontended root: `tools/vtt-handoff/publish.ts:97–117`.
- The recorded cumulative result is genuinely eight files/36 tests passed (`.tmp/vtt-handoff-gates/final-cumulative-vitest.log:6–11`). That result does not establish the missing invariants above.

VERDICT: REJECT
review complete