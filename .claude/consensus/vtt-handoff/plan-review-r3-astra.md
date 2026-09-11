The r3 hash, 548-line count, branch, HEAD, clean tree, and frozen intel-contract hash match the supplied identity. No files were changed and no tests or builds were run.

Four significant blockers remain. Paths below are relative to `/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff`; “plan” means `.tmp-plans/2026-09-09-vtt-handoff-plan.md`.

1. **F8 — SIGNIFICANT — Partially resolved: door cancellation still has a deadlock.**

   **Claim:** S3d awaits quiescence of the running `step()` before cancelling its outstanding request. [plan:243](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:243)

   **Evidence:** `step()` awaits the controller decision at `src/combat/coordinator.ts:505`. A human decision remains pending until submission or abort at `src/combat/controllers.ts:94–121`. The cancellation that aborts it is at `src/combat/coordinator.ts:333–338`. Therefore, with a pending human request, the proposed wait can prevent the cancellation needed to finish that wait. The host also awaits that same step at `src/vtt/dm-encounter-host.ts:540`.

   **Required change:** Specify this order: validate without side effects; prevent repumping; establish the cancellation/pause state; abort the pending request; await settlement; revalidate and apply the door operation; recompute offers; resume according to the previous pause state. Add a test issuing `door.set` during a genuinely pending human request, with **no human response**, and require completion plus a fresh offer.

   **Rejected alternative:** Merely waiting for the current step preserves the deadlock. The new revision-stamped offer policy at plan:245 addresses stale actions, not this ordering problem.

2. **F13 — SIGNIFICANT — Partially resolved: the supposedly supervisor-only launch test remains automatically discoverable before the build.**

   **Claim:** S7d runs only after a fresh supervisor build. The proposed file is `tests/integration/vtt/node-runtime-launch.test.ts`. [plan:363–367](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:363)

   **Evidence:** `vitest.config.ts:34` includes **all** `tests/**/*.test.ts`. The full battery runs `npm run test:gate` at plan:505 **before** `npm run build` at plan:506. Consequently, that gate discovers the launch test and invokes `serve`, whose startup prepares dist (`tools/serve.mjs:179–181`); a cache miss runs a build (`tools/dist-build-cache.mjs:185–193`). Ordinary `npm test` also discovers it (`package.json:16`).

   **Required change:** Put the new launch probe outside ordinary Vitest discovery and provide an explicit supervisor integration configuration/command that includes it after the build. Preserve its assertions and execute it as a required gate.

   **Rejected alternative:** Calling the file “supervisor-only” in prose does not constrain test discovery. Its later explicit invocation does not undo its earlier execution.

3. **F20 — SIGNIFICANT — Partially resolved: the UI boundary gate precedes the UI refactor it claims to verify.**

   **Claim:** S7c verifies that the source graph from UI/in-process/Worker/Node converges on the service/permitted reducer. [plan:355](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:355)

   **Evidence:** Routing the existing UI through the rich service is deferred to S8 at plan:375. Until then, the UI constructs `DmEncounterHost` directly (`src/vtt/encounter-app.ts:1415`) and invokes it directly, including interrupt/resume/undo (`src/vtt/encounter-app.ts:2211–2219`).

   **Required change:** Limit S7c’s service-convergence assertion to the adapters already converted. Add the actual UI-to-rich-service assertion in S8, or move the complete convergence gate after S8. State the separate assertions explicitly.

   **Rejected alternative:** Checking only that every path eventually reaches the existing reducer can pass before S8; it does not prove that UI mutations use the extracted service.

4. **F24 — SIGNIFICANT — New: the projection and continuation changes have unaddressed persistence effects.**

   **Claim:** S2a adds required `tokenId` to `PlayerVisiblePlacedCombatant` while declaring persistence unchanged; S3d revision-stamps continuations while the plan also excludes saved-schema changes. [plan:173–177](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:173), [plan:245](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:245), plan:459.

   **Evidence:** `ControllerRequest.visibleState` contains the player projection (`src/combat/controllers.ts:29–45`), populated by `projectPlayerView` (`src/combat/coordinator.ts:480`). Requests and continuations belong to `PersistedCoordinatorState` (`src/combat/coordinator.ts:76–81`) and are persisted directly (`src/combat/coordinator.ts:319–325`, `src/vtt/session-persistence.ts:2324–2335`). The checksum covers that entire body (`src/vtt/session-persistence.ts:487–488`). Adding the projection field therefore changes newly persisted request bytes. Existing pending requests are restored directly (`src/combat/coordinator.ts:265–269`) and lack that newly required field.

   **Required change:** Specify the persistence boundary for renderer-only token identity and continuation freshness. If persisted output must remain unchanged, use explicit renderer enrichment and transient freshness state with a defined restore policy. Otherwise, replace the “unchanged” claim with an explicit compatibility design. Add baseline-authored pending-request save fixtures proving restore, resume, replay, and paused-door freshness without regenerating their expectations.

   **Rejected alternative:** D359 classification establishes disclosure policy; it does not establish journal compatibility.

**Verified claims**

All 13 round-two findings were checked:

| Finding | Disposition | Evidence |
|---|---|---|
| F5 | Resolved in plan | Path-string image fields, `provenance.files[]` hashes, and optional frame `view`: plan:159–165. |
| F7 | Resolved in plan | Five terminal outcomes and durability ordering: plan:229. Uncorrelatable transport faults and pending `id:""` control: plan:267–273. The underlying asynchronous acknowledgment gap is real: `src/vtt/dm-encounter-host.ts:527–549`. |
| F8 | Partially resolved | Fresh-offer recomputation is explicit at plan:245–249; cancellation ordering remains blocked above. |
| F11 | Resolved in plan | Both missed sites are included: plan:203–207; `tools/ai-dm-conversation.ts:109,696`; `src/vtt/local-session-store.ts:326`. |
| F13 | Partially resolved | Fresh-dist and explicit launch gates added at plan:323,367,507–512; automatic discovery remains blocked above. |
| F14 | Resolved in plan | Transparency requirements vary by logical ID: plan:389,401–405. The existing PNG helper only checks signature/dimensions: `src/assets/png.ts:213–219`. |
| F15 | Resolved in design | Retained directory descriptors, component traversal, `/proc` prerequisite, and parent-swap control: plan:411–417. Execution evidence remains a required implementation gate. |
| F17 | Resolved in procedure | Named behavioral mutants, exact selected assertions, mutation proof, restoration hashes, and restored passes: plan:516–527. |
| F19 | Resolved in design | Amended handshake subprotocol bearer, pre-upgrade validation, principal file, role/player matching, and browser construction: plan:331–349. |
| F20 | Partially resolved | Early core publication and later immutable transcript entry are correctly separated: plan:195,291–295. UI gate ordering remains blocked above. |
| F21 | Resolved in plan | Shipped memory-backed Worker harness and in-process rich DM UI are explicit: plan:301–315,371–381. Current main-thread construction is confirmed at `src/vtt/encounter-app.ts:1415`. |
| F22 | Resolved in plan | Doors excluded from generic walls; companion ownership and player environment-light omission are explicit: plan:101–103. Relevant source: `src/combat/terrain.ts:158–164`; `src/vtt/encounter-projections.ts:73–96`. |
| F23 | Resolved | Both manifest-only commands include `--save-exact`: plan:132–135. |

Additional source checks confirmed:

- The authoritative reducer chain and replay route: `src/vtt/dm-encounter-host.ts:393`, `src/vtt/session-encounter-reducer.ts:9–14`, `src/vtt/vane-warren.ts:805`, `src/vtt/session-persistence.ts:1535`.
- Ground-center conversion and controlled squeezing follow the actual footprints: `src/combat/creature-space.ts:409–424,462–468`.
- Token identity is added after existing player filtering, with the inherited DM constructor accounted for: plan:173; `src/combat/visibility.ts:583–603,699–712`. The remaining concern is persistence, not disclosure.
- Lights lack authored point photometry: `src/combat/world-objects.ts:70–85`. The plan labels its projection synthetic.
- The existing Worker construction and RPC cleanup are useful precedents, not an existing encounter runtime: `src/main.ts:181–188`; `src/rpc/client.ts:95–115`.
- Documentation authorization, no Node pin, supervisor-only dependency materialization, and honest PARTIAL reporting are reflected at plan:23–27,135–147,433–451.

The final candidate remains blocked by cancellation ordering, launch-test discovery, premature UI-service verification, and unplanned persistence effects.

VERDICT: REJECT
review complete