# Offers 3B review, astra round 2 (2026-09-13, read-only, dnd-wt-p-offer-help at 86e83024)

Source: .tmp/runs/fanout/review-offers-s3b-r2.log (verbatim final message)

1. **S3B-R2-F1 — P2, blocks: yes. The eight runtime proxies observe a property read, not consumer identity.** At [engine-mcp-handler.test.ts:106](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts:106), this replacement would satisfy the following counter assertion:

   ```ts
   offerEnvironment: engineOptionEnvironmentFromBinding(
     observed.environment.queries,
     observed.environment.binding,
   )
   ```

   Evaluating the argument increments `bindingReads`; the runtime receives a different instance. The subsequent identity probe independently mints and resolves an option using `observed.environment`, so it also passes. The same defect exists in all eight proxy implementations listed below. Substitution using the **unobserved** environment can produce the lane’s reported red result, but that establishes only sensitivity to that particular substitution.

2. **S3B-R2-F2 — P2, blocks: yes. Golden retains the unobservable-instance problem.** [engine-mcp-golden.test.ts:99](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:99) now correctly extracts the actual submitted option ID. However, [line 51](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:51) creates a separate local environment, and lines 52–62 remint and resolve a local option. Neither the child’s environment nor its option object crosses the stdio boundary. Matching the ID attaches the check to transcript **values**, but does not establish the child consumer’s instance identity. The standalone test at line 69 does not exercise stdio at all.

3. **S3B-R2-F3 — P2, blocks: yes. Divergence consistency is restored by returning to the unbound path; shared environment identity remains untested.** [ai-dm-conversation.test.ts:100](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:100) aliases `canonicalEngineQueryPort`, which is an `EngineQueryPort`, not an `EngineOptionEnvironment`. Consequently, option creation bypasses environment registration at [intent-resolver.ts:91](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intent-resolver.ts:91). The new assertion at [test line 1627](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:1627) proves equal output. Substituting a distinct query-port object with the same methods would preserve that equality. This fixes the mixed-path inconsistency identified previously, but does not complete the requested bound-environment migration.

4. **S3B-R2-F4 — P2, blocks: no, per your explicit exception. SIMULATED proves request/acceptance correspondence, with a separate local identity control.** [local-openai-conversation.SIMULATED.test.ts:235](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:235) traces advertised IDs through submitted proposals to accepted rows. Lines 274–278 demonstrate rejection by a second environment for a **locally reminted** option. They do not demonstrate rejection by the arena’s runtime. The reported surviving production mutant is consistent with this boundary.

The per-file S3B-F1 audit follows. “Local identity” identifies the positive/negative resolver assertions; those assertions are instance-sensitive, but their attachment to the exercised consumer remains limited.

| File | Local identity lines | Consumer observation and assessment |
|---|---:|---|
| [dm-encounter-host-live-path](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/integration/vtt/dm-encounter-host-live-path.test.ts:83) | 64, 71 | Call 83; counter 84. F1 applies. |
| [ai-dm-arena](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-arena.test.ts:106) | 87, 94 | Call 106; counter 107. F1 applies. |
| [ai-dm-board-delivery](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-delivery.test.ts:107) | 88, 95 | Call 107; counter 108. Launcher probe 207 also precedes, rather than observes, forwarding. |
| [ai-dm-board-snapshot](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-snapshot.test.ts:180) | 65, 72 | Call 180; counter 183. Now attached to resumed-state projection at 186; F1 remains. |
| [ai-dm-conversation](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:146) | 127, 134 | Call 146; counter 147. F1 applies; divergence has F3 separately. |
| [ai-dm-knowledge-base](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-knowledge-base.test.ts:101) | 82, 89 | Call 101; counter 102. F1 applies. |
| [engine-mcp-boundary](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-boundary.test.ts:73) | 54, 61 | Call 73; counter 74. Transitional parity also uses this wrapper. |
| [engine-mcp-golden](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:107) | 55, 62 | Submitted ID reaches local probe at 107; child identity remains unobserved. |
| [engine-mcp-handler](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts:106) | 87, 94 | Call 106; counter 107. F1 applies. |
| [SIMULATED](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:274) | 274, 275 | Actual arena requests checked; exact runtime instance unobserved. Deferred exception. |

The proposed `engineMcpRuntimeFactory` is a suitably located, narrow runtime-observation seam, but **alone it does not establish the claimed proof**. A factory receiving whichever fresh environment line 2776 constructs has no independently known reference against which to compare it. The test needs an independently captured or controlled pre-consumer instance, followed by an identity assertion at consumption.

A test-only route also appears to have been missed: scoped namespace `vi.spyOn` calls on the exported environment constructor and runtime constructor, recording actual constructor returns and checking the runtime argument against those references, with both spies restored in `finally`. Unlike hoisted `vi.mock`, this operates on already-loaded module exports. The installed Vitest spy implementation explicitly supports Vite SSR getters, and Vite rewrites imported calls through namespace properties. This is a supported candidate, **not an arena proof I executed**; its mutant, ordering, and leak runs must pass before relying on it. The evidence does not yet establish that production changes are necessary.

I could not edit a scratch copy under this read-only sandbox. My mutation assessment is therefore static:

| Mutant | Predicted result |
|---|---|
| Handler call 106: reconstruct from `observed.environment` as shown above | Counter and local identity assertions survive. |
| Board-snapshot call 180: same reconstruction | Counter, local identity, and projection-ID assertions survive. |
| Board-delivery call 107: same reconstruction | Counter and local/launcher identity assertions survive. |
| Divergence resolver 1625: pass `{ ...DIVERGENCE_OFFER_ENVIRONMENT }` | Output equality survives. |

All nine unchanged spec hashes match the lane’s reported restoration hashes. That verifies current bytes, not historical red execution or mutation adequacy. The old tenth row covered the subsequently removed SIMULATED mock and cannot establish current coverage.

All **52 deletions** are accounted for: live-path 4, arena 3, delivery 3, snapshot 9, conversation 5, knowledge-base 3, boundary 4, golden 5, handler 3, SIMULATED 13. No pre-3B baseline expectation was removed in the cumulative diff. However, **11 round-1 capsule expectations were removed**, including the two disconnected constructor tests. Their replacements do not uniformly preserve the original runtime-binding observation; the limitations are covered by F1/F2 and the explicit SIMULATED exception. I cannot certify the stronger “no expectation weakened” condition.

| Original finding | Disposition |
|---|---|
| **S3B-F1** | **Partially fixed, remains blocking:** genuine local identity controls added; consumer attachment is insufficient. |
| **S3B-F2** | **Partially fixed, remains blocking:** snapshot reaches resumed-state projection; golden remains value-connected only; SIMULATED gap explicitly deferred. |
| **S3B-F3** | **Partially fixed, remains blocking:** consistent canonical-query behavior restored; equality does not prove shared bound identity. |

Verified HEAD `86e83024`, clean working tree, both diff whitespace checks passing, and no cumulative changes under `src`, `tools`, or the D545 register. Frozen contract SHA-256 remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. No added module mocking, registry resetting, shared-export patching, or cross-file state dependency remains in the reviewed diff. The supplied 331/331 and ordering results are supervisor evidence; I did not rerun them.

**REJECT 3B**

3B REVIEW R2 DONE