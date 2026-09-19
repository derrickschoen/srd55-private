# D694-INTEL-01 plan r3 — astra HIGH review r3 (session 01a0b9d4-6ac6-73e2-be80-0c55cdd3d0b0, plan sha 12f5614a…)

**VERDICT: REJECT — 2 P1, 2 P2, 1 P3.**

Reviewed `claude/cohort-01@55465bf6` and verified plan SHA-256 `12f5614ab59350e66d6b7cfba26b683e4022131d82e52d8359a1afc2842a0cc4`. I read R1 and R2 from the main checkout; their copies are absent from this worktree. No agents, model calls, repository writes, or concurrent-lane tests were run. The two protected files were read from HEAD, including during probes.

1. **P1 — Opportunity-cost and team-plan advice remain outside the explicit actor-safe migration.**

   [engine-server.ts:1627](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:1627) calls `actorOpportunityReport` with authoritative state. [opportunity-cost.ts:159](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/opportunity-cost.ts:159) resolves movement and evaluates outcomes independently of `tacticalOptions`. Its result reaches `actors[].intel.opportunity_cost`, tactical-intel responses, dominance guidance, and renderer shortlisting.

   **New runtime confirmation:** hard seed 5117009, Guard, hidden Fighter, Stealth 30, empty observation history. Relocating Fighter `(1,2)→(1,12)` leaves knowledge SHA unchanged:

   `8288a7afacf0f5bdc96345982f0b15108c215a35a5c31f75a1bb0465dbbdf92c`

   Yet `opportunity_cost.engine_default_option_id` and its explanation switch from **Spear→Fighter to Spear→Cleric**. Opportunity-cost hashes:

   - Before: `fd08d5ba590392e893a4bebefd2cfc2db24685fd86e5f5e3222cc518d0cfacec`
   - After: `16d3c5e213b6dbd7b770fc58bc979430a63e1af7072dbb6994e21636cb3caf10`

   The parallel team path is also unaccounted for: [engine-server.ts:1639](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:1639) passes authoritative state to `scoreTeamPlans`; [team-scorer.ts:365](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/team-scorer.ts:365) enumerates hostile targets and evaluates outcomes/allocations. Its frontier controls advertised plays and suggested plans.

   **Required:** explicitly bind these producers and their renderer/correction consumers to actor-safe evaluation, with independent witnesses. Withholding option annotations does not protect these separate outputs.

2. **P1 — `engine.validate_proposal` remains a position oracle for withheld options.**

   The plan covers five query oracles but omits this preview endpoint. [engine-server.ts:3209](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:3209) resolves against authoritative state; [resolutionPreview:994](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:994) returns movement feet, a movement-bearing summary, and the resolution digest.

   **New runtime confirmation:** same Guard/Fighter fixture, correction phase, same offered Fighter option ID. Relocating Fighter `(1,2)→(19,13)` preserves the knowledge hash above, but validation returns:

   | Field | Before | After |
   |---|---:|---:|
   | `valid` | `true` | `true` |
   | `resolution.movement_feet` | 25 | 0 |
   | Summary | “after 25 feet” | “after 0 feet” |

   Excluding only `state_ref`, response hashes are:

   - `210ab53c5717df0d97b726a2343b39d7a2710623f7b18108395021d64c5bec97`
   - `2aea9857ff0a257dac5b2d310b7aa0adf7552a344cf2c6910424d3d0d6be3cea`

   Frozen offer cores preserve the option ID needed to invoke this oracle after its annotations are withheld.

   **Required:** specify a structurally safe preview/refusal contract and audit the other callers of `resolutionPreview`. Private authoritative adjudication must not automatically become model-visible planning evidence.

3. **P2 — Batch executability is still not established.**

   The original B1 constructor omissions are fixed, but the revised boundaries have remaining problems:

   - **B2:** lines 160–161 claim query-port consumers are included. Actual callers also include `dm-tactical-intel.ts`, `mcp/engine-server.ts`, `intent-resolver.ts`, `intel/opportunity-cost.ts`, and tests outside B2. Lines 65–67 require proof-bound evaluation APIs, but the plan never identifies which shared signatures change versus which new proof-bound methods are added. Specify that boundary explicitly; the authoritative movement control must remain executable.
   - **B5:** lines 127–128 require deleting “engine `toolResultContent` wiring.” That wiring also exists in [engine-server.ts:376](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:376) and [engine-server.ts:3634](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:3634), but `engine-server.ts` is absent from B5. Its only allowance is B3, before the entrypoint callers are removed. The promised atomic removal is not represented by the manifests.
   - **B5/B6:** B5 requires both arena and conversation suites green; B6 explicitly leaves affected pins RED until their later hand derivation. Assign those repairs before the first batch gate that runs them.

   **Required:** reconcile the ordered allowed lists with actual interface changes and test prerequisites.

4. **P2 — The new wire discriminator contradicts the frozen perceived-fixture byte pins.**

   Plan lines 84–87 require every resolved advertised option to carry `annotation_status:'resolved'`. Line 211 nevertheless freezes the complete seed-3943001 context sizes at:

   `41,295 / 41,295 / 38,034 / 41,295`

   The existing wire option has no discriminator. Adding `,"annotation_status":"resolved"` adds **31 bytes per option**—930 bytes across the fixture’s pinned 18/6/6 full option set, before other changes. This also changes byte-cap pruning arithmetic.

   **Required:** preserve the unaffected knowledge/intel bodies and offer cores, but explicitly hand-derive the changed wire-size and pruning expectations. The previous whole-context byte freeze cannot coexist with the new required wire field.

5. **P3 — The D583 seed-union arithmetic is incorrect.**

   Using the recorded D730 seed file, I independently computed:

   | Measurement | Result |
   |---|---:|
   | Recorded paths | 50 |
   | Unit paths | 37 |
   | Unique union | **72**, not line 255’s 73 |
   | Accepted specs | 217 |
   | Closure specs | 218 |
   | Dropped specs | 0 |

   Closure SHA matches the plan exactly:

   `f5bf19bddae37da3bd4a48cc54d253d76026adf09a949902ce4d2187339ca4bb`

   The sole addition is `tests/unit/vtt/d694-intel-privacy.test.ts`. Correct the intermediate count or identify the differing seed set.

**R2 closure audit**

References below are to the [reviewed R3 plan](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-plan.md).

| R2 finding | R3 quotation and disposition |
|---|---|
| P1-A: option advertisement | Lines 87–89: “The withheld arm structurally cannot carry any listed annotation.” Lines 93–96 name context, state summary, and combatant options. **Original finding closed at design level.** Findings 1–2 above identify separate remaining readers. |
| P1-B: board images | Lines 123–126: “Authoritative PNG and accessible HTML are removed from monster-facing delivery.” Lines 127–134 specify ingress removal and zero-attachment witnesses. **Design closed; batch ownership remains incomplete.** |
| P2-A: executable batches | Lines 145–147 now include both direct row-constructor tests. Lines 107–110 say `projectEngineBlindTurn` “keeps its signature”; B4 includes resolver/provenance consumers. **Original named omissions closed; revised batch executability remains open as finding 3.** |
| P2-B: provenance | Lines 115–120 replace authoritative copies with projection digests and require tests to “remove exactly `state_ref`.” **Closed at plan-contract level.** |

**Batch and reader audit**

I verified manifest sizes **6/8/10/10/10/2**, totaling **37 unique files: 14 production, 23 tests**. D738 permits six batches; the four-batch checklist is superseded.

- **B1:** direct `DmTargetIntelRow` constructor closure confirmed, including renderer-test spread constructors.
- **B2:** shared query-interface boundary remains unspecified.
- **B3:** named option producer, full/compact carriers, renderer consumers, and direct option fixtures are represented.
- **B4:** stable projection signature and named provenance consumers are represented.
- **B5:** image-binding consumer and validator imports are represented; engine-server attachment wiring is missing.
- **B6:** allowed files are sufficient for its pins, but timing and byte-freeze requirements conflict.

Calibration and capture readers delegate to `exactDmIntelMatrix`/`captureDmIntel`; those inherit row filtering if signatures remain stable. The separate opportunity-cost/team-plan and validation paths do not.

**Pin disposition**

| Existing assertions | Required treatment |
|---|---|
| Arena `1264–1317`, seed 5117005 | Hand-derive reduced context; preserve five Dodge IDs/actions and independently justified cap behavior. |
| Arena `1338–1369`, seed 3943001 | Preserve offer cores and unaffected facts; hand-derive wire-size/pruning changes caused by the discriminator. |
| Conversation `2652–2722` | Freeze perceived knowledge bodies and distances. |
| Conversation `2738–2853` | Hand-derive reduced/decontaminated context and captures; retain planner/fallback outcome controls. |
| Conversation `3881–3900` | Require an independent expected capture before comparing produced copies. |
| Blind context, HEAD `253–315`, `377–446` | Hand-derive roster/facts, semantic board, movement, and provenance expectations; preserve unrelated fixture hashes. |
| Opportunity movement `288–302` | Remove MCP Guard→Fighter `P25/T+0`; preserve Bandit→Wizard’s five-foot upgrade and authoritative movement control. |

Line 138 globally requires hand derivation; lines 200–217 reinforce it for the listed pins. No expectation may be regenerated from candidate output.

**Witnesses, gates, and reproduced baseline**

The private-symbol issuer, actor binding, strict unknown/withheld arms, both indication sources, adjacent-unperceived witness, and plausible wrong-cover witness remain adequate plan contracts. The four requested mutants have explicit killing witnesses at lines 219–224. They need extension to the newly demonstrated readers above.

The original Room 8 probe, SHA `3fd81bc5f78afae3fe9b52fdef6ecc91eaf15011184fa30b358219eb9232d00f`, reproduced:

| Measurement | SHA-256 |
|---|---|
| Knowledge, both positions | `86a82ac180804c5ac06f8072d93302663403556ad6816b94d9c29330b65c8c74` |
| Base actor context | `db8408f15d83b204267c2e191958934393b0fa27232a356d2924382236966824` |
| Relocated actor context | `dd23e1f028ec43084eb263662c3fe4d9278706de51fe297c774783b742a897fc` |

The direct unknown-Fighter cover oracle returned **HALF→TOTAL**, with `state_ref` excluded:

- `3479bebd723b622b19f5a2d64b1781f4ef1a92ac935a8f3111acf7bc3e149534`
- `7161ba27c83ec7ca3063cfddbf6c9852ad6b7e3e113e45e74972aa2498ea3177`

Probes used the permitted `/tmp` wrapper and Vite’s in-memory config runner. Both TypeScript checks, architecture checks, command outcomes, touched tests, D630 **36/36 ≤41 seconds**, and the instrumented **43-fixture** generation gate remain specified. I did not rerun unchanged D630/generation gates.

Under D741, this rejection proceeds to owner escalation rather than a fourth planning round.

D694-INTEL-01 PLAN REVIEW R3 DONE
