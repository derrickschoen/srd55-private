The candidate’s SHA-256 and 544-line count match. HEAD remains `0f84e09f`; the worktree contains parallel implementation changes. I changed nothing and ran no tests or builds.

The four targeted remedies are present, but two specifications were lost during the rewrite.

1. **F25 — SIGNIFICANT — Door semantics regressed while cancellation ordering was corrected.**

   **Evidence:** [Current plan:241](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:241) now says “validate door/principal/current/target” and “apply/flush world_operation,” without defining:
   
   - The supported open/closed blocking triples.
   - Refusal of noncanonical doors.
   - Same-state success without cancellation, reducer execution, journal append, or snapshot.
   - The `modify_object` payload and actor/cost policy.

   These were explicit in [archived r3:241–243](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vtt-handoff/plan-candidate-r3-72ef78a1.md:241). Source does not supply these policies automatically: blocking fields are independent (`src/combat/terrain.ts:15–20`); `modify_object` accepts arbitrary changes and emits an event (`src/combat/encounter.ts:11682–11700`); actor/cost combinations have distinct behavior (`src/combat/encounter.ts:12489–12499`).

   **Required change:** Restore those exact policies alongside the corrected cancellation sequence. Explicitly exit for a valid same-state request before cancellation, after required durability acknowledgment. Restore targeted assertions for both canonical triples, noncanonical refusal, and zero-effect no-op behavior.

   **Rejected alternative:** The snapshot’s `open=!movement` mapping at plan:102 defines appearance, not mutation semantics. Mentioning no-op transcripts at plan:287 does not define their expected effects.

2. **F26 — SIGNIFICANT — S7c references a behavior matrix that the rewrite removed.**

   **Evidence:** [Current plan:349–355](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:349) says “Keep the five … resources” and “Retain the behavior matrix.” The actual matrix, runtime pairings, fixed scene/clock/RNG requirement, and independent assertions were deleted from [archived r3:353–359](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vtt-handoff/plan-candidate-r3-72ef78a1.md:353).

   Those assertions matter because all adapters intentionally share one implementation (`plan:229,351`): equality between adapters alone cannot detect a shared projection or revision error.

   **Required change:** Restore the explicit conformance scenarios, in-process/Node and browser Worker/WebSocket pairings, deterministic inputs, and handwritten center/removal/ownership/revision/sequence/execution-count assertions. Retain the corrected separation of adapter convergence in S7c and UI convergence in S8.

   **Rejected alternative:** “Retain” without identifying an incorporated specification leaves the frozen implementation plan dependent on conversational history.

3. **F27 — TRIVIAL — The resource summary contradicts the amended steps.**

   **Evidence:** [Plan:120](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:120) still lists visibility changes in S2a, five resources in S3d, and one in S7d. Their authoritative lists now specify four, six, and two resources respectively (`plan:169,237,359`).

   **Required change:** Update the summary to match those lists.

**Verified claims**

| Residual | Disposition and evidence |
|---|---|
| **F8** | **Cancellation-order defect resolved in design.** Abort now precedes waiting, with repump suppression and a no-human-response completion test (`plan:241–245`). This matches the actual pending promise and abort behavior (`src/combat/controllers.ts:94–107`; `src/combat/coordinator.ts:333–338,505`). Door semantics separately regressed: F25. |
| **F13** | **Resolved in design.** The `.launch-test.ts` filename avoids the root `tests/**/*.test.ts` inclusion (`vitest.config.ts:34`). The dedicated configuration and explicit invocation occur after the build (`plan:359–365,502–503`), addressing `serve`’s unconditional dist preparation (`tools/serve.mjs:179–181`). |
| **F20** | **Ordering resolved.** S7c checks adapters only; S8 adds UI-service and complete convergence assertions (`plan:351–355,371–375`). This respects the current direct host construction (`src/vtt/encounter-app.ts:1415`). Parity specification completeness separately regressed: F26. |
| **F24** | **Resolved in design under D603.** Renderer-only identity enrichment leaves persisted projection/request types unchanged (`plan:169–175`). Freshness is transient, restore behavior is explicit, and baseline-authored checksum fixtures are required (`plan:237–245`). This addresses the actual serialization boundary (`src/combat/coordinator.ts:319–325`; `src/vtt/session-persistence.ts:2324–2335,487–488`). |

The amended handshake, exact dependency pins, immutable publication sequence, art shapes, descriptor-based staging, and PARTIAL reporting remain unchanged from r3. The frozen intel-contract hash also remains unchanged.

The remaining blockers are restoration of the door policy and the explicit parity specification.

VERDICT: REJECT
review complete