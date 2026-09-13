# APP-ANALYSIS-01 — astra round 2 (cross-critique + merged list)

Source: .tmp/runs/fanout/analysis-astra-r2.log

The merged result is **14 findings**. Gate correctness remains first. Several supervisor measurements reproduce, but its runtime-cycle interpretation, error-code census, timeout policy, and proposed breadth need correction.

I read both supervisor files in full, checked the saved round-1 report, and independently measured the current source. HEAD was `a6228ba3`; the inspected code remains identical to `45f0bc33`. All work was read-only: no edits, git writes, other agents, Claude, or prohibited-directory reads. Measurements used TypeScript AST walks, in-memory execution of extracted implementation code, and the supplied historical Vitest report. I did not run a fresh full gate.

**Independent measurements**

The import census covers 709 source files. Edges below are unique importer–target pairs resolved with TypeScript’s module resolver. Raw asset imports are treated as assets, not executable modules.

| Graph | Edges | Cyclic components | Files inside cycles | Largest components |
|---|---:|---:|---:|---|
| Static imports/re-exports, including types | 3,969 | 13 | 198 | 77, 75, 23 |
| Above plus literal dynamic imports/import types | 3,991 | 13 | 198 | 77, 75, 23 |
| Emitted JavaScript imports, including literal dynamic imports | 2,619 | 4 | 18 | 7, 6, 3, 2 |

The supervisor’s **3,972 edges** did not reproduce under these definitions. Its **13 components, 198 cyclic files, and 77/75/23 component sizes did reproduce**.

Its six leading static fan-in figures also reproduce exactly:

| Module | Supervisor | R2 |
|---|---:|---:|
| `domain/enums.ts` | 195 | 195 |
| `db/database.ts` | 139 | 139 |
| `combat/values.ts` | 135 | 135 |
| `domain/ids.ts` | 115 | 115 |
| `db/codecs.ts` | 90 | 90 |
| `combat/encounter.ts` | 82 | 82 |

`encounter.ts` has **32 incoming emitted-JavaScript edges** and belongs to none of the four emitted-JavaScript SCCs. The seven-file runtime component is principally the offers/query/intent group; the six-file component joins builder, commands, grants, and sheet queries. This is a source dependency analysis, not a measurement of loaded bundle bytes or execution cost.

The cast census counts AST assertion expressions, including each side of `as unknown as T` separately:

| File | All casts | `as const` | Other casts, including `unknown` | `as unknown` subset |
|---|---:|---:|---:|---:|
| `vtt/session-persistence.ts` | 175 | 48 | 127 | 40 |
| `backup/portable-content.ts` | 75 | 11 | 64 | 6 |
| `backup/character-backup.ts` | 58 | 15 | 43 | 7 |
| `catalog/stored-authored-content-projector-v1.ts` | 48 | 11 | 37 | 2 |
| `simulation/contracts.ts` | 65 | 14 | 51 | 0 |
| `combat/encounter.ts` | 138 | 88 | 50 | 0 |
| `db/test-core-spell-content-keys.generated.ts` | 95 | 0 | 95 | 0 |
| **All `src`** | **4,107** | **2,050** | **2,057** | **160** |

There are **zero AST `any` keywords**, hence zero actual `as any` or `: any` constructions. Additional AST counts: **234 non-null assertions, 103 `JSON.parse` calls, 280 `structuredClone` calls, and 1,692 `Object.freeze` calls**. These counts describe syntax, not defects.

The supplied [Vitest report](/tmp/dnd-gate-reports/vitest-initial-6555-d4c00f3b-4116-42a4-bf91-8b53e87f3b84.json) contains **638 file results and 11,288 assertions**:

| File | Tests | Supervisor seconds | R2 seconds |
|---|---:|---:|---:|
| `ai-dm-conversation.test.ts` | 107 | 691.1 | 691.073 |
| `ai-dm-arena.test.ts` | 57 | 317.5 | 317.524 |
| `survival-policy.test.ts` | 29 | 149.0 | 149.025 |
| `ai-dm-board-delivery.test.ts` | 17 | 119.8 | 119.770 |
| `room-generator-los-cover.test.ts` | 111 | 96.4 | 96.393 |
| `renderer-profile.test.ts` | 112 | 92.7 | 92.676 |
| `d569-v5.test.ts` | 26 | 80.4 | 80.435 |
| `d583-contract-inventory.test.ts` | 17 | — | 38.323 |

The sum is **2,780.326 seconds**. The largest two contribute **1,008.597 seconds, 36.276%**; `tests/unit/tools` contributes **1,470.731 seconds, 52.898%**; the largest 30 contribute **80.551%**.

These are **summed file elapsed durations**, not CPU time or gate wall time. The interval between the earliest file start and latest file finish is **693.898 seconds**; that also excludes any surrounding runner work. The report records an initial failure—**seven failed assertions**—and cannot independently establish the final retried gate verdict. It contains no browser-duration evidence.

**Disposition of S-F1 through S-F10**

1. **S-F1 — PARTIAL.** The large source SCCs and reported fan-in are confirmed. The claim that their members cannot be independently tested or bundled, or that every combat module loads the whole group, is refuted by the emitted-JavaScript graph. Many relevant edges already use `import type`, including `controllers.ts → round-plan-contract.ts`. Changing those declarations cannot reduce a graph that deliberately includes type edges. The ownership proposal is sound when narrowed to A-F7’s actual reverse dependencies. A global maximum-SCC ratchet is insufficient: it can admit new small cycles while an unrelated maximum remains unchanged. Use explicit ownership rules and separate runtime/type dependency measurements. D269, D388, D586.27 and D589 apply; “no ruling found” was incorrect.

2. **S-F2 — PARTIAL.** I confirm **12,967 lines, 298 function declarations, 45 switches and 580 case clauses**. There are also **599 arrow functions**. The **99 export-bearing statements** comprise 94 declarations with export modifiers and five re-export declarations; this is not necessarily 99 exported names. These metrics do not establish a beneficial reducer decomposition. The mutation ledger does reference test names, but D583’s inventory hashes **file paths**, not test names. Its additional healing-potion check also reads a particular reducer branch, so preserving names alone is inadequate. Defer a blanket domain split; require a concrete capability seam after the ownership work. A permanent facade preserving every old import solely for compatibility would conflict with D25.

3. **S-F3 — PARTIAL.** Cost concentration is confirmed by the duration table. Calling it CPU consumption is wrong. Extracting narrow scheduler tests from full conversation execution is sound. Moving tests between projects alone does not reduce their total landing cost. “Lanes never run” the slow project conflicts with required cumulative coverage: both expensive files are explicitly in the [session-transaction inventory](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/d583-contract-inventory.ts:13). D613 authorizes making these tests cheaper; it does not authorize excluding required tests from lane verification.

4. **S-F4 — PARTIAL.** Marginal inventory execution is confirmed, but the supplied report shows **5,153.852 ms and 5,130.802 ms** for its two failed cases, not 5,294 ms. Eight inventory-building cases consume approximately **38.317 seconds combined**, with individual cases around **4.3–5.2 seconds**. It does not show a 30-second graph walk per test. `buildD583ContractInventory` really rebuilds the graph on every invocation, including injected Git-failure cases. A supplied graph for narrow tests, plus retained real discovery coverage, is sound. A stale expected inventory is not. Neither D544 nor D613 establishes a general “serial time ×3” timeout policy. An empty “LOAD FLAKES” list on one quiet run is inadequate verification. The homebrew failures remain unexplained ledger residuals.

5. **S-F5 — CONFIRMED.** Executing the actual configuration guards against each command’s declared environment makes both parity and smoke commands throw **`VTT_HANDOFF_ARTIFACT must be either dev or dist.`** The cumulative command also contains the placeholder. Structured executable inventory is sound and merges with A-F9. Dry parsing is a useful first regression, but execution/discovery reconciliation must follow. D589/D603/D620 apply.

6. **S-F6 — PARTIAL.** Duplication is real, and I found at least **four relevant resolver implementations**, including the separate engine-boundary helper. Both static test resolvers return the existing `src/vtt/offers` directory for `./offers`; attempting to read it produces **EISDIR**. D583’s current resolver already checks `isFile()` and supports `.d.ts`/`index.d.ts`, so that historical defect is repaired. The held-out worker, however, calls the **real Vite plugin resolver** with environment and require-specific conditions. Replacing it with one static file resolver would undermine D607. Share narrowly defined filesystem/AST utilities between static consumers; retain distinct resolution policies and the real held-out runtime resolver.

7. **S-F7 — PARTIAL; its headline evidence is wrong.** There are **778 `throw new Error(...)` statements**, but their arguments classify as **494 prose literals, 270 template expressions, nine other expressions, and only five uppercase code literals**. For classes, I count **374 extending declarations whose names end in `Error`**, or **399 declarations extending the observed Error-family bases**: 174 `Error`, 213 `TypeError`, one `SyntaxError`, one `RangeError`, ten `EncounterRuleError`. “373 typed error classes” is not a reproducible semantic count. The two examples actually live in `tools/vtt-handoff`, outside the stated `src` census; that directory has **57 uppercase-code throws representing 48 distinct codes**. I found no literal references to the two cited example codes under `tests`. A bounded typed code vocabulary for externally interpreted tooling errors is reasonable. A blanket ban on explanatory `Error` throws across persistence and MCP is over-scoped.

8. **S-F8 — PARTIAL.** The AST table replaces the regex estimates. Many casts follow existing validation, construct brands, or preserve literals; replacing all four files with schemas is not justified by their counts. There is nevertheless a concrete seam: extracted execution of [decodeTransition](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/session-persistence.ts:913) accepts both `{"kind":"controller_request_issued","request":{}}` and `{"kind":"reducer_applied","command":{},"events":[42]}` as `SessionTransition`. A malformed `session_started` control is rejected. This establishes insufficient refinement at that function’s typed return boundary, **not successful admission through the complete session importer**. Repair specific decoders and preserve versioned import behavior; a cast-count ratchet is not correctness verification.

9. **S-F9 — PARTIAL.** Clone count **280** reproduces; freeze count is **1,692**, not 1,650. The proposed generalization was appropriately withdrawn in the critique. Re-executing the actual history projection/cache/freezing functions produced **2,000/10,000/20,000 cloned entries** for 20 unchanged reads at 100/500/1,000 revisions, matching A-F3. An additional synthetic 839-read, 1,224-entry probe cloned **1,026,936 entries in 4.230 seconds**. That is not the original workload or a reproduction of its reported 23.5 seconds. Keep a representative benchmark, but do not prescribe “under one second” before measuring the intended complete path. Retain D263/D589’s immutable publication boundary.

10. **S-F10 — PARTIAL.** Fragile line anchors and their checking machinery are confirmed. Git history shows **one repair commit, `6677e3bd`, correcting three anchors** during the stated week—not evidence of three distinct drift incidents. Symbol references are reasonable where unambiguous, but require resolver support; merely changing notation would remove existing checks. Merge into A-F11’s documentation work with lower priority than correcting operational instructions.

**Responses to the supervisor’s contests**

- **A-F3 superseding S-F9: accept.** Keep journal-owned invalidation and the benchmark. Reject an unmeasured universal one-second wall.
- **A-F7 merging with S-F1: accept the ownership merge; reject the proposed SCC maximum as sole acceptance.** The runtime/type distinction materially changes the diagnosis. Verify removed edges directly and monitor both graphs.
- **A-F9 merging with S-F5: accept.** The missing environment is an independently reproduced first regression.
- **A-F10 merging with S-F3/S-F4: accept as one D613 family.** Accept narrower execution seams and graph reuse. Reject blanket lane exclusion, automatic timeout multiplication, and cached expectations replacing live discovery.
- **Re-ranking above A-F6: accept.** Round 1 already ranked A-F10 seventh and A-F6 eighth; the critique misread that ordering. The duration evidence strengthens it. I now also move executable inventory ahead of MCP typing, because coverage accounting should precede execution-policy changes.
- **S-F6, S-F7, S-F8: accept only the bounded revisions above.** Their original scopes and numerical arguments do not survive intact.
- **S-F2 after S-F1: reject as an automatic next step.** Resolving ownership does not itself establish that a wholesale reducer split is valuable. A later extraction needs an identifiable responsibility and behavioral verification.
- **“Passed on retry” versus “load”: accept.** D620 itself preserves the homebrew failures without a demonstrated cause. Preserve both attempts’ evidence and distinguish outcome from causal diagnosis.

The critique’s A-F2 count also needs correction: **33 documentation import declarations resolve to 30 distinct files**. The actual cache inventory contains 840 files and omits exactly **97 distinct raw inputs: 67 migration files and 30 documentation files**.

**The merged findings**

The following is the deduplicated set. Effort is relative: S = bounded change, M = several collaborating components, L = broad migration. Dependencies describe implementation ordering; all landings require trustworthy verification.

**M-1 = A-F1 — Gate verdict integrity. Category: tooling-dx.**

Both analysts identified ignored process outcomes and conditional reporter-failure handling. R2 executed the actual gate bodies with supplied runner boundaries: both returned exit 0 for a successful report paired with exit 2, and for a global-error-plus-failed-file phase followed by a passing retry. An ordinary failed-test retry also returned 0, providing the positive control.

Proposal: distinguish process, global/reporter, discovery and test outcomes; permit one authorized retry to resolve attributable test failures. Verification: mismatched exit/report, signals, spawn failures, global errors, missing results and legitimate retry controls. Risk: medium—ordinary test-failure exits must remain retryable. Effort: M. Dependencies: none. Rulings: D544, D584.4/D587.3 verification records, D620. Owner: **new gate-integrity lane**.

**M-2 = A-F2 — Complete build-cache inputs. Category: tooling-dx.**

Astra measured 97 omitted raw files; the supervisor confirmed the omission but mixed documentation declarations with unique files. R2 independently compared AST imports with the actual 840-file cache inventory and reproduced **67 + 30 omissions**. Vite also embeds HEAD while the key does not. F88-b separately records the direct-build environment inconsistency.

Proposal: cover raw dependencies, plugin inputs and emitted provenance; close F88-b without changing Node policy. Verification: independently authored mutation tests for imported SQL/text, plugin inputs and revision stamping, plus unchanged-input hits and production-environment behavior. Risk: medium—extra rebuilds and incomplete invalidation if discovery remains partial. Effort: M. Dependencies: M-1 for acceptance. Rulings: D589, D594, D612/D612.1. Owner: **new build-cache lane**, cross-linked to **vtt-handoff F88-b**.

**M-3 = A-F9 + S-F5 — Executable verification inventory. Category: test-strategy.**

Both analysts found incompatible inventories; the supervisor encountered two unrunnable commands. R2 reproduced both configuration failures and confirmed the cumulative placeholder. The corrected commands used by the supervisor remain separate evidence; broken metadata alone does not invalidate those runs.

Proposal: structured argv/environment/configuration, prerequisites, expected discovery and execution tier, consumed by wrappers and reports. Verification: reject placeholders and missing configuration; reconcile required, discovered, executed, failed and skipped tests. Risk: medium—accidental coverage loss while consolidating. Effort: M. Dependencies: M-1; M-2 before trusting distribution checks. Rulings: D584.4, D589, D603, D620. Owner: **vtt-handoff ledger residuals**, with shared gate-inventory ownership.

**M-4 = A-F4 — Canonical JSON property preservation. Category: type-safety/data integrity.**

Both analysts executed the utility and observed `__proto__` disappearing. R2 reproduced both top-level and nested loss. Distinct accepted JSON inputs therefore collapse to identical canonical bytes; neither report proves a complete share-import exploit.

Proposal: construct canonical objects without the inherited setter and retain explicit boundary-specific reserved-key policies. Audit versioned canonical-byte consumers before changing output. Verification: literal expected bytes, nested cases, distinct-input controls, integrity tests and frozen-format fixtures; never regenerate expectations from the new encoder. Risk: medium because hashes and signatures consume these bytes. Effort: S implementation, M consumer audit. Dependencies: M-1 for acceptance. Rulings: D25, D41, D199. Owner: **new canonical-data-integrity lane**.

**M-5 = A-F3 + S-F9 — Stable immutable history projection. Category: state-and-performance.**

Astra’s unchanged-read clone counts reproduce exactly. The supervisor’s append-heavy instrumentation—829 appends and 30 rebuilds—missed that every new unchanged array takes the rebuild branch. R2 additionally measured over one million cloned entries in the larger synthetic read case. These measurements establish redundant work, not complete UI latency.

Proposal: journal-owned immutable projection keyed by actual generation and ancestry state, with safe append reuse and rebuild on branch/restore changes. Verification: zero extra clones on unchanged reads, one detached suffix entry on append, ancestry/void correctness, old-snapshot immutability, and a separately calibrated full-host benchmark. Risk: medium—stale projections. Effort: M. Dependencies: M-1; coordinate persistence edits with M-12. Rulings: D25, D263, D589. Owner: **vtt-handoff ledger F1 follow-up**.

**M-6 = A-F10 + S-F3 + S-F4 — Reduce repeated orchestration in tests. Category: test-strategy.**

Astra identified full arena execution beneath scheduling assertions; the supervisor measured concentration. R2 confirms the largest two files consume **36.276% of summed file elapsed time**, and eight inventory cases repeatedly rebuild the same graph. The evidence supports cheaper seams, without establishing a browser-speed improvement.

Proposal: deterministic cell-execution inputs for scheduler tests, retained real conversation/engine integration cases, lazy fixture setup, and supplied graph inputs for narrow inventory tests. Preserve cumulative membership; consider tiers only after M-3 makes execution accounting explicit. Verification: assertion/test census, negative controls, real integration retention, collection/setup/execution timings and repeated named-case measurements. Risk: medium—mocking away integration defects. Effort: M. Dependencies: M-1; M-3 before tier changes; M-11 for shared graph work. Rulings: D25, D544, D584.4, D606, D613. Owner: **D613 cost-cutting lane**.

**M-7 = A-F5 — Profile-preserving internal MCP types. Category: type-safety.**

Astra’s compiler probe demonstrated unconstrained internal calls; the supervisor confirmed the surface but did not independently compile it. R2 confirms `execute(string, unknown)` and the helper’s independent `blind`/optional revision inputs. The patched runtime crash is historical evidence for the failure class, not evidence it still occurs.

Proposal: profile-indexed internal tool/input/output types, a discriminated context helper, and an explicit unknown-input wire adapter. Verification: negative compiler cases for forbidden profile arguments, hostile runtime inputs, and retained profile-byte/invariance tests. Risk: medium—generic complexity and caller migration. Effort: M. Dependencies: M-1; coordinate overlapping engine-server changes with offers 3C. Rulings: D25, D569, D602/D586.173. Owner: **new MCP structural-follow-up lane**.

**M-8 = A-F8 — Transport lifecycle conformance. Category: duplication/correctness.**

Astra’s Worker execution probe showed no late replay and successful initial reads after closure; the supervisor confirmed both source paths. R2 independently confirms Worker listener registration lacks the terminal guards present in WebSocket. The existing handoff ledger also records incomplete Worker scenario execution.

Proposal: specify and share observer/lifecycle behavior while retaining transport-specific framing, receipts and destruction semantics. Verification: execute the same late-subscription, termination, observer-exception and receipt-order assertions against all three transports, including the real Worker. Risk: medium—reentrancy and committed-outcome ordering. Effort: M. Dependencies: M-3 for complete conformance accounting. Rulings: D586.27, D589, D593. Owner: **vtt-handoff ledger residuals**, coordinated with F81 and host lifecycle work.

**M-9 = A-F7 + S-F1; S-F2 retained only as a deferred option — Engine contract ownership. Category: architecture.**

Astra identified concrete combat→VTT and content→party-pack ownership inversions. The supervisor’s 75-file source SCC corroborates structural coupling; R2 confirms those edges while showing the component is not a 75-file runtime cycle. S-F2’s size metrics add context but do not independently justify wholesale decomposition.

Proposal: move engine refusal classification, decision-program contracts, and shared imported effect/resource contracts below their adapters. Keep one authoritative reducer. Verification: explicit forbidden-edge tests, separate type/runtime graph reports, replay and importer tests, and meaningful mutation controls. Risk: medium–high. Effort: L, landed as separate extractions. Dependencies: M-11 for graph utilities; coordinate after offers 3C and Quietstone changes touching the same surfaces stabilize. Rulings: D25, D269, D388, D586.27, D589. Owner: **new engine-contract lane**.

**M-10 = A-F6 — Spell-level constraints at the read boundary. Category: type-safety.**

Astra’s compiler probes accepted invalid numeric values; the supervisor spot-checked the model and stale comment. R2 confirms unrestricted numeric fields in storage/read models, integer-only catalog decoding, and later known/placeholder narrowing in the sheet builder. No current wrong UI output was demonstrated.

Proposal: one domain representation with an explicit known/placeholder distinction at the appropriate read boundary; preserve storage/import sentinel handling. Verification: invalid domain assignments fail compilation, valid and placeholder imports round-trip, and invalid stored values fail at the declared boundary. Risk: medium—broad consumers and accidental import rejection. Effort: M–L. Dependencies: trustworthy gate; no dependency on broad engine extraction. Rulings: D11, D25, D30, D41, D235, D269. Owner: **new read-model constraints lane**.

**M-11 = S-F6 — Correct reusable static graph utilities. Category: duplication/tooling-dx.**

The supervisor identified three walkers and historical resolution problems. R2 found four relevant implementations and reproduced directory acceptance in both static test resolvers; D583’s declaration-file repair is already present. The held-out implementation uses real Vite resolution and has a different contract.

Proposal: share candidate-file handling and explicitly parameterized static-edge collection where semantics coincide. Preserve the held-out runtime resolver. Verification: directory/index/declaration/extension/query cases, policy-specific type/runtime edges, unresolved controls, and existing graph assertions. Risk: medium—false confidence from conflating resolution environments. Effort: M. Dependencies: M-1; supports M-6/M-9. Rulings: D607/D607.1, D584.4, D589. Owner: **D613 supporting graph-tooling slice**; runtime-guard changes remain outside this scope.

**M-12 = S-F8 — Sound decoder return types. Category: type-safety.**

The supervisor’s cast concentration is directionally correct but numerically inaccurate. R2 supplies the AST breakdown and concrete transition-decoder counterexamples. Other sampled casts already follow validation, such as portable references and grant parsing, so the evidence does not justify replacing all four boundary implementations.

Proposal: first make transition decoding establish the nested type it returns; audit adjacent escape casts by invariant rather than quota. Verification: malformed nested request/command/event cases, positive fixtures, compile-time return contracts, and complete versioned session-import/replay tests to determine downstream exposure. Risk: medium–high—tightening accepted persisted content can lose data if mishandled. Effort: M for the bounded seam. Dependencies: coordinate after M-5; use M-4’s canonical-byte audit where relevant. Rulings: D25, D41, D235, D589. Owner: **new persistence-decoder lane**.

**M-13 = S-F7 — Typed handoff tooling error codes. Category: type-safety.**

The supervisor’s 778 string-code claim is refuted. R2 nevertheless finds a narrower surface of **57 uppercase-code throws and 48 distinct codes** in handoff tooling, including four repetitions of the root-path code. Neither analyst demonstrated a current typo-induced failure; this is a representational weakness.

Proposal: establish which codes are externally interpreted, then type that vocabulary and preserve diagnostic messages and causes. Avoid banning ordinary explanatory exceptions elsewhere. Verification: compiler rejection of misspelled emitted codes and tests of actual CLI/report mappings and preserved code bytes. Risk: low–medium. Effort: S–M. Dependencies: M-3 clarifies reporting consumers. Rulings: D25, D269, D589. Owner: **new bounded handoff-tooling types lane**.

**M-14 = A-F11 + S-F10 — Current operational guidance and durable references. Category: docs.**

Both analysts confirmed stale compile guidance, obsolete build-plan status and the spell-level comment. R2 confirms those contradictions and identifies one commit repairing three documentation anchors. Operational misinformation has more immediate consequence than anchor maintenance.

Proposal: correct the compile guidance, mark historical plans clearly, link controlling decisions and executable inventories, and update inaccurate comments. Add symbol resolution only where it preserves useful checking. Verification: commands against actual configurations, links/symbols against current source, and retained semantic anchor checks. Risk: low. Effort: S initially, M if symbol tooling is added. Dependencies: none for factual corrections; M-3 for generated command guidance and M-10 for eventual type documentation. Rulings: D25, D29, D201, D263, D544 and later concurrency records. Owner: **new operational-docs lane**.

Offers **3C** and **Quietstone fog** should retain their existing scope. They are coordination dependencies for overlapping files, not catch-all owners for these findings.

**Recommended execution waves**

1. **Smallest safe first wave: M-1 only.** Repair gate outcome classification with isolated runner/report fixtures and both failure and valid-retry controls. Do not simultaneously change test membership, timeout policy or caching. Accept the gate repair using the underlying runner evidence as well as the repaired wrapper.
2. **Complete the verification foundation: M-2, then M-3.** Make build identity reliable and required execution explicit. M-14’s factual guidance corrections can accompany this wave; symbol-reference tooling can wait.
3. **Bounded correctness and cost work: M-4, M-5, M-11, then M-6’s graph-related changes.** Arena seam work within M-6 can proceed independently once its assertion census is established. Keep the named timeout exceptions unchanged while measuring improvements.
4. **Boundary contracts: M-7 and M-8; then M-12 after persistence edits settle.** Coordinate engine-server work with offers 3C. Preserve actual Worker and importer integration proofs.
5. **Broader structure: M-9 and M-10.** Use the now-trustworthy graph and verification machinery. Reassess specific reducer extractions afterward; S-F2 does not automatically become a project.
6. **Lower-priority maintenance: M-13 and optional M-14 symbol tooling.**

The revised priority places **executable inventory before MCP typing** and keeps **measured test-cost reduction above spell-level migration**. That ordering addresses both trustworthy evidence and recurring verification expense.

I now consider the following statements wrong or insufficiently supported, including my own:

- The supervisor’s large source SCCs do **not** prove equally large runtime cycles or inability to test/bundle independently.
- Its “778 string-coded errors,” regex cast figures, CPU terminology, universal ×3 timeout proposal, and three separate documentation-drift incidents should not be retained.
- Its D583 test-name claim is wrong: the inventory primarily identifies files; other checks have additional source assumptions.
- My round-1 size table cited `tools/screenshot-probe.ts`; the correct file is **`tools/ai-dm-screenshot-probe.ts`**.
- My round-1 ownership proposal needs the explicit runtime/type distinction now measured. I retain the ownership defect, without implying an initialization or bundle-size defect.
- My round-1 ranking placed inventory too late relative to MCP typing. I have corrected that.
- My synthetic history timings remain function-level evidence. Neither analyst has established a full-host latency target or justified a universal one-second benchmark.
- A canonicalization fix and stricter decoder types require their consumer/version audits; neither should be presented as an already-proven end-to-end import vulnerability.

**APP-ANALYSIS R2 DONE — 14 merged findings**
