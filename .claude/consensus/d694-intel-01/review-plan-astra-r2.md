# D694-INTEL-01 plan r2 — astra HIGH review r2 (session 01a0b9b9-2a41-7050-af4e-e4c4310077f3, plan sha 64145d67…)

**VERDICT: REJECT — 2 P1, 2 P2, 0 P3.**

Reviewed commit `55465bf618d0d4647d76e39b62fe4b9837af0782` and [revision 2](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-plan.md), SHA-256 `64145d673e1c4c1ab053d62ef434a2b292f97deb11bcc2d31cf08025205f52dc`. I read R1 from the main checkout because its saved review is absent from this worktree.

1. **P1 — `tacticalOptions` and `engine.get_combatant_options` remain outside the explicit migration.**

   [engine-server.ts:929](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:929) resolves targets against authoritative state. Lines 930–963 derive movement validity, visibility, cover, and expectations using that state, including `evaluateOptionOutcome`. These results reach:

   - Full turn context at line 2010.
   - State-summary combatant details at line 3095.
   - The separate `engine.get_combatant_options` endpoint at lines 3112–3118.

   The inventory at plan lines 40–50 omits this producer and the separate endpoint. The schema consistency check at lines 92–95 enumerates intel, movement, threats, and unresolved findings, **not advertised options**.

   **Runtime confirmation:** hard seed 5117009, Guard, hidden Fighter with Stealth 30 and empty observation history. Moving Fighter `(1,2)→(17,2)` preserves actor-knowledge hash `8288a7afacf0f5bdc96345982f0b15108c215a35a5c31f75a1bb0465dbbdf92c`, but `get_combatant_options` returns:

   | Advertised option | Before | After |
   |---|---|---|
   | Guard→Wizard cover | `half` | `three_quarters` |
   | Guard→unknown Fighter cover | `half` | `none` |
   | Guard→unknown Fighter outcome probability | `null` | `0.30000000000000004` |

   Require an explicit actor-safe contract for option advertisement, including movement/availability and outcome annotations, plus mixed-perception witnesses through **both endpoints**. Reconcile this with line 6’s frozen offer behavior; fixing matrix rows alone is insufficient.

2. **P1 — Authoritative board images still reach the model independently of semantic-board JSON.**

   Plan lines 107–109 say the privileged board remains in the “host/UI projection and board-snapshot pipeline” and “is never returned by … model ingress.” The existing pipeline contradicts that assumption:

   - [ai-dm-conversation.ts:4489](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-conversation.ts:4489) captures `rendererState` and binds the artifact for PNG delivery.
   - `ai-dm-board-snapshot.ts:804–808` selects `view=dm`, including blind-state capture; line 868 also produces accessible HTML from `projectEncounterBoard(projectDmView(input.state))`.
   - [entrypoint.ts:875](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint.ts:875) validates the authoritative-board PNG and returns its bytes.
   - **Lines 630–635 attach those image blocks to `engine.get_turn_context` as additional MCP content**, outside the semantic-board object and its schema.
   - Advice additionally exposes the authoritative accessible-HTML reference at lines 916–955.

   These are code-traced delivery paths; I did not launch a browser. Filtering JSON leaves them intact. Specify actor-safe visual delivery or remove privileged attachments from monster-facing delivery. Add the necessary production files and tests to the manifests.

3. **P2 — The ordered batches still cannot satisfy their own gates.**

   Plan lines 59–63 require proof-bearing `DmTargetIntelRow` construction. B1 introduces that requirement, but its allowed list at lines 129–130 excludes the existing direct constructors in:

   - `decision-trace.test.ts:19`
   - `renderer-profile.test.ts:105`

   They are deferred to **B5**, lines 157–160. Because `tsconfig.node.json` includes all tests, B1 cannot pass its mandatory node typecheck with those constructors unchanged.

   There is another missing integration boundary: line 99 says `projectEngineBlindTurn` receives the required knowledge projections, but its actual runtime caller is `mcp/entrypoint.ts:544`, with additional callers in `blind-intent-resolver.test.ts:95,306,375`. Neither file belongs to any batch. Specify whether the signature changes or knowledge is derived internally, and include every affected caller.

   I verified manifest sizes **4/6/5/8/4/2**, totaling **25 unique files**. The unit-wide union is insufficient: each batch must contain the files needed to reach its own V gate.

   Six batches also exceed this brief’s four-batch checklist, although the full D738 entry explicitly permits re-batching beyond four. Record that exception in the plan. The dependency failures above remain regardless of the batch-count ruling.

4. **P2 — Blind-context provenance contradicts the promised relocation-invariance comparison.**

   Plan lines 188–189 require equal canonical context “except opaque state ref.” However, authoritative digest copies also appear at:

   - `legal_movement.provenance.state_digest` — `blind-turn-context.ts:1142`
   - `semantic_board.provenance.state_digest` — lines 1220 and 1264

   My blind-context probe confirmed both change under the same unseen-Fighter relocation:

   ```text
   010daa9466d2ea7724d8939dda3e44e658065ec0ca1da040b586970785dc89bd
   →
   6c60abeb8c6ac7b209eec78a36cb0fc1e94dd645e04e7fd378a983f97c60be18
   ```

   Removing unknown creatures and movement holes will not remove these differences. Define actor-safe provenance outside `state_ref`, preserve any authoritative binding privately, and include these fields in the invariance witness. Do not silently broaden the comparison’s exclusions.

**R1 closure audit**

| R1 finding | R2 evidence and disposition |
|---|---|
| **P1-1: blind/advice semantic boards** | Lines 103–106: “Both blind `blindSemanticBoard` and advice attachment … use this producer and schema.” Lines 99–102 cover HP, facts, and movement. **Original JSON paths addressed; broader delivery closure remains blocked by the image path above.** |
| **P1-2: third-party contamination/selectors** | Lines 64–69: “Build an actor-local evaluation state”; unknown creatures are excluded from cover, blockers, reactions, hazards, and selectors. Lines 75–78 distinguish contaminated rows from unchanged controls. **Design correction confirmed by probe**, subject to the omitted option consumer above. |
| **P2-1: proof/schema contracts** | Lines 54–63 specify a “module-private `unique symbol`,” private issuer, actor/target IDs derived from proof, and compile-negative witnesses. Lines 82–95 specify strict absence/result unions and unresolved-finding checks. **Closed at plan-contract level.** |
| **P2-2: files/pins** | Lines 111–113 and 175–184 now identify the missing pin dispositions and hand derivation. **Pin accounting closed; batch executability remains open.** |
| **P2-3: D583** | Lines 230–240 require the recorded baseline union and “closure **218**.” **Independently confirmed; closed.** |
| **P2-4: repeated D705 checks** | Lines 120–126 give both TypeScript checks, architecture self-test/check, and command outcomes; every batch repeats them under V. **Closed.** |
| **P3: witnesses/generation evidence** | Lines 188–197 map all four mutants to witnesses, including both indication sources, near-unperceived targets, schema negatives, and plausible wrong cover. Lines 206–228 identify the 43-fixture families, commands, instrumentation, and evidence locations. **Original finding closed.** |

The corrected pin dispositions are:

| Existing assertions | Required disposition |
|---|---|
| Arena `1264–1317`, seed 5117005 | Hand-derive reduced context; preserve five Dodge IDs/actions and size invariants. |
| Arena `1338–1369`, seed 3943001 | Freeze `41,295 / 41,295 / 38,034 / 41,295` and option counts. |
| Conversation `2652–2722` | Freeze perceived knowledge bodies/distances. |
| Conversation `2738–2853` | Hand-derive reduced and decontaminated context/capture; freeze planner/fallback outcomes. |
| Conversation `3881–3900` | Add independent capture expectations, then compare RL/row copies. |
| Blind context `253–315`, `377–446` | Hand-derive roster, facts, board, and movement expectations. |
| Opportunity movement `288–302` | Remove MCP Guard→Fighter `P25/T+0`; preserve Bandit→Wizard’s five-foot upgrade and the separate authoritative calculation. |

**Independent probe results**

The original Room 8 probe reproduced R1 exactly:

| Measurement | SHA-256 |
|---|---|
| Knowledge, both positions | `86a82ac180804c5ac06f8072d93302663403556ad6816b94d9c29330b65c8c74` |
| Base actor context | `db8408f15d83b204267c2e191958934393b0fa27232a356d2924382236966824` |
| Relocated actor context | `dd23e1f028ec43084eb263662c3fe4d9278706de51fe297c774783b742a897fc` |

The direct `engine.query_cover` probe returned HALF→TOTAL for the unknown Fighter. With `query_id:"cover"` and `state_ref` excluded, response hashes were:

```text
3479bebd723b622b19f5a2d64b1781f4ef1a92ac935a8f3111acf7bc3e149534
7161ba27c83ec7ca3063cfddbf6c9852ad6b7e3e113e45e74972aa2498ea3177
```

For the mixed-perception witness, retaining the actor, all allies, and perceived Wizard removed the HALF→THREE_QUARTERS contamination. Both bounded Wizard rows were HALF with hash:

```text
af03761f853361559ef8944050dd20f2e31f39fe0d10e7c5c393aee1f259f0b6
```

D583 recount: **50 recorded paths + 25 unit paths → 64 unique seeds; 217→218 specs; no drops**. The sole added spec is `d694-intel-privacy.test.ts`, and closure SHA matches:

```text
f5bf19bddae37da3bd4a48cc54d253d76026adf09a949902ce4d2187339ca4bb
```

I did not rerun unchanged D630 or generation gates. Their stated requirements remain 36/36 within 41 seconds and 43-fixture byte/instrumentation checks. No agents, model calls, or repository writes were performed. A concurrent change appeared in `blind-turn-context.test.ts`; it was not mine.

D694-INTEL-01 PLAN REVIEW R2 DONE
