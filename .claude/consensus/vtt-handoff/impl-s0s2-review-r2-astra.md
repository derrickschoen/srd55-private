The main wire incompatibilities are corrected, but several accepted findings remain partially resolved. HEAD, plan hash, clean tree, and frozen-contract hash match the candidate. I ran no tests or builds.

Here, `plan` means `.tmp-plans/2026-09-09-vtt-handoff-plan.md`.

1. **F14 — SIGNIFICANT — F5 remains partially resolved: the declaration gate does not detect snapshot or art drift.**

   **Evidence:** `tests/types/vtt-handoff-contract.type-test.ts:7,20–21` declares already-typed snapshot/art values rather than constructing them. Changing published `SceneToken.label` to `name`, changing vision tuples to objects, or making `ArtFrame.view` required would leave this gate compiling. The runtime types are independently inferred from Zod (`src/vtt/handoff/v1/contracts.ts:42–44,119–121`), with no comparison against the published declarations. Publication tests merely check exported names (`tests/unit/vtt/handoff-publish.test.ts:41–49`).

   **Required change:** Add independently authored consumer literals covering every snapshot/art shape and optional field, plus compile-time assertions detecting declaration/runtime shape drift. Have the supervisor verify effective wrong-field and required-option mutants. Export-name checks are insufficient.

2. **F15 — SIGNIFICANT — The multicell door rewrite changes the accepted geometry policy and breaks companion exclusivity.**

   **Evidence:** Plan:102 specifies the north edge of `object.position`. Instead, `src/vtt/handoff/scene-snapshot.ts:213–221` spans the footprint’s bounding rectangle and selects its west edge when taller than wide. The new test explicitly pins the widened segment (`tests/unit/vtt/scene-snapshot.test.ts:228–241`).

   Ordinary wall edges remain individual cell edges, while suppression compares complete endpoint keys (`scene-snapshot.ts:237–246`). A two-cell horizontal door beneath two blocked cells therefore retains both coincident ordinary segments: neither unit-length key equals the widened companion key. Opening the companion leaves those blocking walls present.

   **Required change:** Restore the accepted north-edge policy and add north-adjacent, multicell, open/closed assertions proving no coincident ordinary wall survives. Any broader geometry policy requires an explicit plan amendment and overlap-aware suppression.

3. **F16 — SIGNIFICANT — F9’s pending-request regression still does not prove persisted-byte compatibility.**

   **Evidence:** The new checksum covers `projection.pendingRequest` (`tests/unit/vtt/scene-snapshot.test.ts:162–177`). That projection deliberately drops `visibleState` (`src/vtt/encounter-projections.ts:212–224`). Actual `ControllerRequest` contains `visibleState` (`src/combat/controllers.ts:29–45`), resides in `PersistedCoordinatorState` (`src/combat/coordinator.ts:76–81`), and is included in persisted revision checksums (`src/vtt/session-persistence.ts:2329–2335`).

   Consequently, adding token identity to the persisted request’s visible state would leave this new checksum assertion unchanged.

   **Required change:** Compare baseline-authored full pending-request/persisted-coordinator bytes and the actual persistence checksum before and after projection. Include a control that introduces enrichment inside `pendingRequest.visibleState` and fails the named assertion. Hashing the reduced presentation summary does not satisfy plan:169–175.

4. **F17 — SIGNIFICANT — F6 remains partially resolved: incomplete artwork can pass “complete” delivery semantics.**

   **Evidence:** `src/vtt/handoff/v1/validation.ts:77–107` checks requested passes using one union across all frames. For an albedo+normal request, one frame containing normal allows another frame without normal to pass. A `status:"complete"` result with `assets:[]` also bypasses every asset/view/pass completeness check. Tests cover a missing pass on the single existing frame, but neither counterexample (`tests/unit/vtt/handoff-contract.test.ts:181–196`).

   **Required change:** For complete deliveries, require the requested asset and requested passes on each delivered frame, with coverage for requested views. Add empty-complete and mixed-frame completeness regressions. Keep these semantic checks separate from structural acceptance of partial/blocked envelopes.

5. **F18 — SIGNIFICANT — Owner-checkout commands now depend on the temporary implementation worktree existing.**

   **Evidence:** The default policy includes the implementation worktree (`tools/vtt-handoff/paths.ts:21–24`). Every repository validation eagerly calls `realpathSync()` on every authorized worktree (`:59–61`), including when validating the owner checkout itself. Removing the temporary worktree makes owner-side doctor/bootstrap/publication fail with `ENOENT`, despite the valid owner repository and explicit handoff root.

   **Required change:** Validate the selected repository without requiring unrelated authorized worktrees to exist. Add a regression with a valid owner checkout and an absent authorized worktree. Preserve common-Git identity and unauthorized-root rejection. Plan:13–19 requires durable owner-checkout operation.

6. **F19 — SIGNIFICANT — F13’s zero-write regression still cannot detect writes to existing files.**

   **Evidence:** The check-mode test compares only directory-entry names (`tests/unit/vtt/handoff-publish.test.ts:14–15,122–131`). Truncating, rewriting, or corrupting an existing payload leaves those arrays unchanged. The current check branch is read-only (`tools/vtt-handoff/publish.ts:138–145`), but its claimed regression would pass those incorrect implementations.

   **Required change:** Record filesystem mutation operations during successful and failing checks and assert none occurred. Add an effective existing-payload-write control. Directory membership alone does not establish zero writes.

**Verified claims**

| R1 finding | Disposition and evidence |
|---|---|
| **F1** | **Resolved.** Correct envelopes, five method names/parameters, object results, and method-result validators: `src/vtt/handoff/v1/contracts.ts:46–87`; positive/negative regressions: `tests/unit/vtt/handoff-contract.test.ts:90–164`. |
| **F2** | **Resolved.** Snapshot fields, token `label`, wall endpoints, optional asset IDs, tuple vision cells, and color constraint match: `contracts.ts:11–40`; JSON Schema: `contracts/vtt-handoff/v1/protocol.schema.json:29–102`; regressions: `handoff-contract.test.ts:130–170`. |
| **F3** | **Resolved.** Canonical identity index joins only projected tokens: `src/vtt/handoff/scene-snapshot.ts:40–51,171–185`. Hidden-token removal is asserted at `tests/unit/vtt/scene-snapshot.test.ts:125–145`; literal canonical identities at `tests/unit/vtt/two-room-fixture.test.ts:39–42`. |
| **F4** | **Resolved for the reported protocol parity failures.** Generic unknown methods and separate known-method validation agree; positive and negative envelope/method cases now exercise both validators: `tests/unit/vtt/handoff-contract.test.ts:90–170`. |
| **F5** | **Partially resolved; F14.** Complete, Zod-free consumer declarations now exist: `contracts/vtt-handoff/v1/contracts.d.ts:1–136`; publisher copies that maintained file: `tools/vtt-handoff/publish.ts:29`. |
| **F6** | **Partially resolved; F17.** Request-bound UUIDv7 `__` filenames, asset identity, unrequested views/passes, and provenance references are checked: `src/vtt/handoff/v1/validation.ts:55–149`. |
| **F7** | **Original lookalike/default-root defect resolved; new limitation F18.** Repository allowlisting, common-Git checks, and explicit worktree override are implemented: `tools/vtt-handoff/paths.ts:55–93`; regressions: `handoff-bootstrap.test.ts:77–99`. |
| **F8** | **Resolved.** Doctor separates completion/readiness and reports failures; Node drift remains warning-only: `tools/vtt-handoff/doctor.ts:73–98`. Actual outside/local/dangling symlinks and absence of Node installer calls are tested: `handoff-bootstrap.test.ts:47–74`. |
| **F9** | **Partially resolved; F15–F16.** Real size/squeeze projections and inverse anchors now have independent expectations: `scene-snapshot.test.ts:110–122`; hidden removal: `:125–145`. |
| **F10** | **Resolved.** All nine logical assets and empty fallback telemetry are independently asserted: `two-room-fixture.test.ts:53–67`. |
| **F11** | **Resolved.** Tests no longer regenerate fixtures; seed, clock, topology, and identities use literal expectations: `two-room-fixture.test.ts:10–33`. Generated equality remains additional: `:70–74`. |
| **F12** | **Resolved.** CLI guard and isolated `--root` support are present: `tools/vtt-handoff/generate-fixtures.ts:32–40`. Recorded missing/divergent executions reach checker errors: `.tmp/vtt-handoff-r2-cli-fixture-missing.log:5–7`, `.tmp/vtt-handoff-r2-cli-fixture-divergent.log:5–7`; valid check records exit 0: `.tmp/vtt-handoff-r2-final-s2b-generator-check.log:1`. |
| **F13** | **Partially resolved; F19.** Exclusive lock/partials, no-replace placement, sealed-bundle refusal, and READY-last ordering are implemented: `tools/vtt-handoff/publish.ts:60–108,148–180`; collision/interruption/order regressions: `handoff-publish.test.ts:19–119`. |

Additional checks: the only existing projection change remains presentation-level `visibleCells` (`src/vtt/encounter-projections.ts:80–81,284`); player environment lights remain omitted (`scene-snapshot.ts:253–261`); dependencies remain exact (`package.json:50,61,63`). No forbidden-pattern matches or changes to combat/persistence/frozen-contract files were found. The recorded lane cumulative result is six files/27 tests (`.tmp/vtt-handoff-r2-final-cumulative-vitest.log:6–12`).

VERDICT: REJECT
review complete