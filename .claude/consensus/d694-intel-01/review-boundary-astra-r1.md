# D694-INTEL-01 boundary plan — astra HIGH review r1 (session 01a0bb02-c3dc-7db1-98bc-aeea57086995, plan sha 2ae2a499…)

**VERDICT: REJECT — 1 P1, 4 P2, 2 P3.**

Reviewed `be09e5757d4c86c8a30a1d4af19186eb06d433d5`; plan SHA matches `2ae2a49933936f8d02824fab9c4a4672d834311709d8d5f8e4d95d68ba1ab917`. I read the superseded plan and all three reviews. No files were changed, agents invoked, or model calls made.

1. **P1 — The authoritative capsule remains a second planning channel outside the proposed choke point.**

   The nineteen entries cover the readers named in the previous reviews, but additional producers consume `EngineStateCapsule` directly:

   - [rankedTargets](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/snippets/registry.ts:190) sorts opponents by authoritative HP and reach.
   - [hasProjectedObstacle](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/snippets/registry.ts:272) reads opponent footprints.
   - [teamPlanReport](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:1639) expands these capsule-derived proposals **before** scoring. `engine.propose_from_play`, `engine.load_skill`, applicable plays/skills, and suggested plans also use this registry.
   - [revision resources](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:3740) serialize authoritative tactical summaries independently of `get_turn_context`. Journal resource identifiers/cursors use the authoritative digest outside `state_ref`.

   **Independent runtime witness:** seed 5117009, Guard, hidden Fighter. Changing only Fighter HP from **1→50** preserves both:

   ```text
   knowledge: 8288a7afacf0f5bdc96345982f0b15108c215a35a5c31f75a1bb0465dbbdf92c
   local:     e4ac8b650ac6fe76ba00979705b4e91393f44acf0b1f9e958720e2ce4b331de4
   ```

   Nevertheless, `SNIPPET_REGISTRY.expand('basic_advance', capsule)` changes its primary proposal from **Spear→Fighter to Spear→Wizard**.

   Changing the scorer’s state parameter cannot remove contamination already embedded in its candidate proposals. Neither `snippets/registry.ts` nor `snippet-registry-runtime.ts` appears in the 49-file union.

   **Required:** extend the producer inventory and manifests; prevent model producers from receiving an authoritative capsule projection as well as authoritative `EncounterState`. Carry frozen offers and permitted request metadata through a safe boundary contract. Cover MCP resources, play/skill generation, and their provenance with independent witnesses.

2. **P2 — The proposed private-symbol intersection rejects plain authoritative state, but is forgeable through ordinary object spread.**

   [Plan lines 44–48](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-boundary-plan.md:44) provide the mechanism for rejecting `producer(authoritative)`: authoritative state lacks the required private-symbol property. That part works.

   However, a TypeScript compiler probe using the proposed declaration shape accepted both calls without diagnostics:

   ```ts
   producer({ ...local, ...authoritative });
   producer({ ...local, actorId: 'different-actor' });
   ```

   The spread transfers the brand while replacing the protected data or actor binding. `readonly` does not prevent constructing these replacement objects. The proposed raw-state `@ts-expect-error` witness still passes.

   **Required:** specify an opaque representation that prevents this reconstruction and actor rebinding, and add negative witnesses for both. Also identify how capture/calibration obtain the already-built actor states without another construction path. A private issuer plus one raw-assignment test does not establish the stronger claimed invariant.

3. **P2 — Frozen capsule offer cores cannot currently enter the resolver with their authorization intact.**

   The plan says to consume frozen capsule cores without recomputing offers. But [capsule construction](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/engine-state-capsule.ts:794) clones those options, while [resolveEngineActorOption](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver.ts:636) requires object identity registered in its private `optionEnvironmentDigests` WeakMap.

   **Runtime confirmation:** passing capsule Dash and Dodge options to the existing resolver with the projected encounter and correct environment returns `OFFER_ENVIRONMENT_MISMATCH` for both.

   The prototype avoids this problem because existing `tacticalOptions` still calls `availableEngineActorOptions` and regenerates registered options. Therefore its success does not prove the planned frozen-input resolution seam.

   **Required:** specify how the new local resolver consumes authenticated frozen cores while preserving D617. Include positive capsule-origin resolution, wrong-environment rejection, exact core-byte preservation, and a witness that filtered-state offer regeneration is not occurring.

4. **P2 — The ordered batches cannot satisfy their stated gates and preservation requirements.**

   | Batch | Verified issue |
   |---|---|
   | B4 | Changing `turnContextOutput` requires updating `docs/specs/engine-turn-context.schema.json`. [engine-mcp-handler.test.ts:1120](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/engine-mcp-handler.test.ts:1120), explicitly run by B4, compares that artifact against the runtime schema. The artifact is absent from every manifest. |
   | B5 | Authoritative `actorOpportunityReport` callers remain in [challenge-room-fixtures.test.ts:229](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/challenge-room-fixtures.test.ts:229), [arena-basis-brutal-b.test.ts:248](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/arena-basis-brutal-b.test.ts:248), and [ai-dm-conversation.test.ts:2862](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/ai-dm-conversation.test.ts:2862). The first two are outside the union; the third is deferred to B8. All are included by `tsconfig.node.json`. The promised migration to explicitly authoritative names cannot happen within B5’s manifest. |
   | B6 | The byte-frozen Batch-10 block calls `projectEngineBlindTurn(planningState, capsule, queries)` at [line 582](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/blind-turn-context.test.ts:582), and calls `blindSemanticBoard` with an authoritative board projection earlier in the same block. These conflict with the promised boundary-only producer signatures. |

   B1’s `createEngineMcpApplication` caller inventory is correct. B2’s additive query-seam approach avoids changing the authoritative port. B3 lists the direct matrix/capture consumers found by grep. B7 now includes the engine-server attachment wiring omitted previously. B8 still cannot repair B5’s earlier compile gate.

   **Required:** reconcile exact signatures, callers, generated artifacts, and the frozen cap witness before binding the batches. Preserve the cap test’s independent arithmetic and failure assertion; explicitly explain any fixture setup needed to keep its protected block unchanged. Recount the union afterward.

5. **P2 — Withholding `resolutionPreview` does not specify a safe complete submission result.**

   [Plan lines 132–134](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-boundary-plan.md:132) describe withheld previews, but several authoritative outputs bypass that helper:

   - [Round submission](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:3340) manually returns `selected_branch`, `resolution_digest`, and `summary`.
   - Validation and submission rejection branches return authoritative resolver refusal codes and summaries.
   - Successful response IDs are derived from authoritative digests and, for round submissions, resolved mechanics.
   - Host resolution can influence acceptance, fallback selection, and correction guidance even when the preview object is withheld.

   **Required:** define the complete safe response contract, including failure branches and receipts. State which validation happens locally and which authoritative results remain private. Test complete responses with only `state_ref` excluded, including a primary/fallback or validity-changing hidden-state variant. Testing two successful previews is insufficient.

6. **P3 — The generation gate references a missing instrumentation artifact.**

   `/tmp/d694-generation-audit/vite.config.ts` does not exist in this session. The plan provides commands referencing it but no reproducible construction recipe.

   **Required:** provide the config source or setup command, including runtime evaluation instrumentation and sentinel checks. The 43-fixture manifest and required zero forbidden-module evaluations are otherwise correctly specified.

7. **P3 — Expand the invariance witnesses beyond the two relocation examples.**

   Add explicit coverage for:

   - Different perception sets across two requested monsters, including rejecting another actor’s boundary state.
   - Hidden HP/resources/conditions, dead and absent-token variants, and an adjacent never-perceived opponent.
   - A perceived opponent alongside a different indication-only opponent.
   - Remaining encounter collections carried by the intersection, such as `absentTokens`, shared-space relations, equipment, pending decisions, and embedded references.

   These need hand-built permitted outputs or forbidden-access witnesses. A branded root and filtered combatant array alone do not prove every retained collection is safe.

The annotation discriminator issue from R3 is **closed at design level**: omitting a resolved discriminator adds zero bytes, and I independently counted the withheld suffix as **63 bytes**. That establishes discriminator arithmetic, not unchanged complete context sizes after every other migration. The named pin dispositions largely follow the prior review; their final literals still require the stated hand derivations.

The stub union correctly makes direct position/HP/AC/slot/condition/feature access unavailable, and explicitly removes roster `hp_band`. The indication fields match existing `KnownIndication`. PNG/HTML removal and projection-based provenance are also appropriate design commitments. They are not implemented or proven by a zero-attachment execution yet.

Both requested prototype probes reproduced:

| Measurement | Result |
|---|---|
| Mixed Wizard cover | HALF / HALF |
| Mixed Wizard row SHA, both | `61f3ddfc8ddcdd8e06a326cad62c52fe7bd957199346d4188b62f4a149a9e56a` |
| Room 8 local-state SHA, both | `b0cd1a7f63de3c912ed0d825046f00d5ac322e9ca1c748cf955a11a47897ed50` |
| Room 8 final prototype context SHA, both | `95a907630a4f64683541b837d8e9d87ff6d2b28c1e1d97ba20b0ac952d2d72ad` |

The last equality includes the prototype’s explicit post-serialization removal of stub-target rows. Before that removal, excluding only `state_ref` still gives different hashes and four differing paths. This supports the proposed filtering approach; it does not demonstrate production choke-point closure.

D583 independently checks out: **50 recorded + 49 unit paths → 80 unique paths; 217 → 218 tests; zero drops**. The sole addition is `d694-intel-privacy.test.ts`; closure SHA is:

```text
f5bf19bddae37da3bd4a48cc54d253d76026adf09a949902ce4d2187339ca4bb
```

All eight manifests meet the ten-file limit as written. D705 checks appear in every V. D630’s **36/36 within 41 seconds**, serial test closure, and frozen 43-fixture requirements are specified; I did not rerun D630 or generation during this review.

D694-INTEL-01 BOUNDARY PLAN REVIEW DONE
