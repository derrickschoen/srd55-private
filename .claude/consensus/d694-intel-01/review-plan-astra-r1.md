# D694-INTEL-01 plan — astra HIGH review r1 (session 01a0b99e-3229-7172-a11d-6ca2cc83ff51, plan sha 4206691e…)

**VERDICT: REJECT — 2 P1, 4 P2, 1 P3.**

Reviewed `55465bf618d0d4647d76e39b62fe4b9837af0782` and verified plan SHA-256 `4206691e3706790597d0d239adef321f079183e1d697620735b69679cd35dfde`. Repository files remain unchanged; no agents or model calls were invoked.

1. **P1 — The inventory misses the separate blind-context path and incorrectly exempts delivered semantic boards.**

   [engine-server.ts:2460](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:2460) returns the blind renderer’s context before entering the matrix-based renderer. [blind-turn-context.ts:1209](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/blind-turn-context.ts:1209) retains semantic-board creature positions; its creature facts additionally expose unseen PCs’ HP bands, conditions, concentration, and action economy. Its legal-movement map uses authoritative occupancy.

   **Runtime confirmation:** Room 8, revision 203, requested monster 1, `dmMode:'blind'`, `blindFacts:true`: the never-perceived Fighter appears in `semantic_board.creatures.items` at `[1,2]`, then `[10,10]` after relocation. Its roster also says `hp_band:"BLOODIED"`.

   The plan’s advice-board exemption is likewise unsupported: [engine-server.ts:2893](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:2893) attaches that board to the model-visible context. Calling its source “authoritative” does not satisfy D694’s actor-specific restriction.

   **Required:** cover these delivery paths, their schemas, captures, and tests. Keep any privileged board separate from monster-facing advice, or obtain an explicit scope exception before claiming D694 closure.

2. **P1 — A perceived-target proof does not prevent hidden third-party positions from influencing that target’s row.**

   The retained row still calls authoritative tactical/cover evaluators. [cover.ts:302](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover.ts:302) includes other creatures’ true occupied cells. Movement intel calls authoritative `queries.movementOptions`, whose world and reaction sources likewise include other combatants.

   **Runtime confirmation:** using hard `seed-5117009`, monster 2, with Fighter hidden, stealth 30, and empty observation history, I moved Fighter from `(1,2)` to `(17,2)`. Guard knowledge remained byte-identical:

   `8288a7afacf0f5bdc96345982f0b15108c215a35a5c31f75a1bb0465dbbdf92c`

   Holding the capsule fixed to isolate evaluation, the **perceived Wizard’s** rendered row changed from `cover:"HALF"` to `"THREE_QUARTERS"`. Filtering out Fighter’s own row cannot fix this.

   Another omitted dependency is [engine-query-port.ts:1009](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/engine-query-port.ts:1009): `current_threat` and `enemy_threatening_ally` select using unseen positions **before** the proposed perception guard. A post-selection refusal still permits hidden state to influence which result is returned.

   **Required:** actor-bounded evaluation inputs and selector resolution, plus a mixed-perception relocation witness. Reconcile “every perceived row stays byte-identical” with removing existing hidden-third-party contamination; retain byte equality for unaffected controls.

3. **P2 — The proof and MCP schema contracts are insufficiently specified.**

   `PerceivedTargetKnowledge` is currently a public structural interface. Narrowing to it alone does not establish an unforgeable, actor-bound proof. The plan must identify the private issuer and prevent substituting a proof belonging to another actor/target.

   More concretely, plan lines 90–94 explicitly leave non-context outputs “producer-guarded.” Current [schemas.ts:1143](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/schemas.ts:1143) allows an `unknown` pair result to carry concrete booleans or cover facts. The proposed full-context refinement cannot protect these outputs.

   **Required:** explicit discriminated absence/result types for path, reach, cover, visibility, and expectation; proof-requiring evaluation helpers; compile-negative construction tests; and negative schema witnesses for every oracle. Include unresolved findings in the context consistency check. An unknown result must structurally forbid concrete facts, including plausible zero/false values.

4. **P2 — Mandatory files and affected pins are missing from the batches.**

   B1’s required proof breaks direct row constructors in:

   - [decision-trace.test.ts:19](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/decision-trace.test.ts:19)
   - [renderer-profile.test.ts:105](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/renderer-profile.test.ts:105)

   Neither is allowed. The overlooked blind-context producers/tests and authoritative-query changes also need explicit ownership.

   The pinned-test accounting should be:

   | Test | Required disposition |
   |---|---|
   | `ai-dm-arena.test.ts:1264–1317` | Hand-derive reduced `5117005` context/capture membership and cap behavior, including the strict small/large inequality. Preserve all five Dodge IDs/actions. |
   | `ai-dm-arena.test.ts:1338–1369` | Preserve unaffected `3943001` byte and option-count controls. |
   | `ai-dm-conversation.test.ts:2652–2722` | Preserve perceived `3943001` knowledge records. |
   | `ai-dm-conversation.test.ts:2738–2853` | Preserve planner/fallback outcomes; add independently derived reduced capture/context expectations. These assertions currently do not enumerate intel rows. |
   | `ai-dm-conversation.test.ts:3881–3900` | Add an independent capture expectation; equality between two produced captures cannot detect a shared leak. |
   | `engine-opportunity-movement-intel.test.ts:288–302` | Remove the **MCP Guard→Fighter `P25/T+0` row expectation**: I verified Fighter is unknown to Guard. Preserve Bandit→Wizard’s five-foot upgrade. The separate authoritative movement calculation can remain. |
   | `blind-turn-context.test.ts:253–305,377–446` | Re-derive actor-safe roster/facts, semantic-board, and movement expectations. Preserve unrelated fixture hashes. |

   The last two files are entirely absent from the plan’s affected-pin list. Explicitly require hand derivation for each changed assertion. Four batches remain plausible, but the present manifests cannot implement the stated contract.

5. **P2 — D583’s “217” hides a dropped accepted test.**

   I recomputed both inventories using the recorded **50 D730 seed paths**:

   - Accepted baseline: **217**
   - Proposed 13-path inventory: **217**
   - Dropped: `tests/unit/vtt/blind-dm-contract.test.ts`
   - Added: `tests/unit/vtt/d694-intel-privacy.test.ts`

   The cumulative union is **218**, SHA-256:

   `f5bf19bddae37da3bd4a48cc54d253d76026adf09a949902ce4d2187339ca4bb`

   **Required:** preserve the accepted inventory as a set, add this unit’s closure, and recompute after correcting the manifests. The current plan’s expected count is wrong for cumulative closure.

6. **P2 — D705 is repeated incorrectly.**

   B1–B4 list focused tests under V and typechecking separately; architecture self-test/check and command outcomes appear only in the final gate. D705 specifically requires these checks in **every batch’s V**.

   Add both TypeScript checks, architecture self-test, architecture check, and command outcomes to each batch’s verification requirements.

7. **P3 — Make the mutation and generation evidence executable and attributable.**

   All four requested mutants are named, but the plan should map each to a concrete witness and expected failure. Specify a near-but-unperceived case for the distance-threshold mutant, both search-memory and observation-history indications, and actual handler/schema coverage. The mixed-perception HALF→THREE_QUARTERS example supplies a plausible wrong-value witness beyond complete row omission.

   The D630 `36/36, ≤41 s` and 43-fixture byte/instrumentation requirements are present. Record the exact fixture manifest, generator invocation, instrumentation entrypoint, and evidence location so those gates are reproducible.

I independently reproduced the original Room 8 leak:

| Measurement | SHA-256 |
|---|---|
| Actor knowledge, both positions | `86a82ac180804c5ac06f8072d93302663403556ad6816b94d9c29330b65c8c74` |
| Base actor context | `db8408f15d83b204267c2e191958934393b0fa27232a356d2924382236966824` |
| Relocated actor context | `dd23e1f028ec43084eb263662c3fe4d9278706de51fe297c774783b742a897fc` |

Fighter distance changed **105→60**, movement need **50→0**, and zero-movement offense count **0→1**.

The independent `engine.query_cover` probe returned HALF versus TOTAL. Excluding `state_ref`, response hashes were respectively:

- `a7a27a77bd5b79f2fb2e7ced601c87c30e9c2bb70dad276f0029e9ea23cc21c6`
- `e868e0038cdb301e0c811a4b8b4e85a53b97485bf78b7e91218fdf9530d4e580`

Probes ran through the permitted `/tmp` wrapper using Vite’s in-memory config runner after the ordinary CLI encountered a read-only cache-write error. I did not rerun D630 or the generation gate.

D694-INTEL-01 PLAN REVIEW DONE
