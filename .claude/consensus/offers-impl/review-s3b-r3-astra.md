# Offers 3B review r3 FINAL (astra 01a09db8-5c82-7621-8e38-632900f54e12) on 82ae8554, harvested 2026-09-13 22:34

1. **S3B-R3-F1 — P2; blocks: yes. Constructor assertions prove test-authored arguments, not production forwarding.**  
   At [dm-encounter-host-live-path.test.ts:71](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/integration/vtt/dm-encounter-host-live-path.test.ts:71), the wrapper calls the spied constructor with `offerEnvironment`, then checks that argument at line 72. **Yes: this is tautological as evidence of production forwarding.** It detects changing that test call, but an equal-binding reconstruction *inside production* leaves the assertion green.

   No assertion in this file proves that the live host uses the bound instance. The host constructed at line 200 omits `offerEnvironment`; the runtime at line 209 is constructed separately. Production therefore takes its default at [dm-encounter-host.ts:295](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/dm-encounter-host.ts:295).

   **Minimal change:** supply the independently owned environment to the exercised host and assert `host.engineOptionEnvironment().toBe(BOUND_OFFER_ENVIRONMENT)` before and after driving it. For runtime consumers, observe production’s imported `createEngineMcpApplication` and `createPureTurnProposalResolver` calls at [entrypoint.ts:417](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:417), checking their environment arguments against the independently owned reference. Keep the existing behavioral assertions.

   Per-file audit:

   | File | Construction → identity assertion | What it establishes |
   |---|---|---|
   | [live-path](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/integration/vtt/dm-encounter-host-live-path.test.ts:71) | 71 → 72 | Test-wrapper argument; no host-instance assertion. |
   | [arena](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-arena.test.ts:94) | 94 → 95 | Test-wrapper argument; does not observe `runArena` construction. |
   | [board-delivery](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-delivery.test.ts:95) | 95 → 96 | Test-wrapper argument. The expected reference comes from the same supplied options, so replacing it upstream also replaces the oracle. |
   | [board-snapshot](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-snapshot.test.ts:169) | 169 → 172 | Test-authored construction; correctly attached to resumed-state projection, but internal identity remains unobserved. |
   | [conversation](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:135) | 135 → 136 | Test-wrapper argument; divergence has the separate issue below. |
   | [knowledge-base](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-knowledge-base.test.ts:89) | 89 → 90 | Test-wrapper argument. |
   | [boundary](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-boundary.test.ts:61) | 61 → 62 | Test-wrapper argument, including the transitional parity runtime. |
   | [handler](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts:94) | 94 → 95 | Test-wrapper argument. |
   | [golden](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:87) | 87–98 | No child-instance observation; see F2. |
   | [SIMULATED](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:239) | Real `runArena` → 240–254 | Actual production constructor observations; materially stronger. |

2. **S3B-R3-F2 — P2; blocks: yes. Golden still does not observe the child’s environment identity.**  
   [engine-mcp-golden.test.ts:92](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:92) proves that the parent constructors were unused. That establishes process separation, not correct construction in the child. The local environment at line 55 and locally reminted option at line 56 remain independent of the child. The restored capsule observation at line 78 is useful value coverage only.

   **Minimal change:** supplement the unchanged real-stdio golden with an exercised **production entrypoint** identity test: feed recorded requests through `runEngineMcpEntrypoint`/`runEngineMcpServer` using scoped stream interception, capture the environment constructor return, and compare it with production’s imported application/resolver constructor arguments. Observe those imported dependencies because `runEngineMcpServer` calls its same-module runtime constructor directly.

   That is a stronger test-only route than the current standalone local control. If acceptance specifically requires identity **inside the actual child**, use test-owned child instrumentation to perform the reference comparison there and require its explicit verdict in the parent; the object itself need not cross stdio. These are static implementation recommendations, not routes I executed. The present cross-process limitation needs an explicit scope exception if retained.

3. **S3B-R3-F3 — P2; blocks: yes. Divergence now installs a bound resolver, but does not prove the production call consumed it; an expectation was weakened.**  
   At [ai-dm-conversation.test.ts:1622](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:1622), the former comparison with `pureTurnProposalResolver` became a comparison against a second invocation of `divergenceResolver` itself. The negative query-port control at line 1625 proves registration of the locally minted option. It does not observe authoritative re-resolution.

   The getter installed at line 1630 has no call assertion. If production retains an earlier resolver reference, the expected geometry message can still pass: the default resolver regenerates options from proposal IDs, rather than resolving the locally bound option object.

   **Minimal change:** return a test-owned resolver facade whose `resolve` is a recording, call-through function delegating to `divergenceResolver`; assert that production invoked it with the actual state/proposal. Preserve the prior canonical-versus-bound result comparison separately instead of replacing it with self-comparison.

   Under the gate’s Vite SSR execution, imported namespace access supports this interception even when the module was loaded by an earlier file. `--configLoader runner` alone is not an assertion that interception occurred. Native ESM’s nonconfigurable namespace fails loudly; a loader retaining an earlier binding can bypass an otherwise successfully installed spy. The missing consumption assertion should make that case fail explicitly.

4. **S3B-R3-F4 — P3; blocks: no. Getter cleanup assertion checks the wrong object.**  
   [ai-dm-conversation.test.ts:1647](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:1647) checks whether the **returned resolver object** is a mock function. That is false even while the mocked getter remains installed.

   I reproduced this with the installed `@vitest/spy` implementation using an in-memory getter: the current assertion passed before restoration. Restoration itself correctly restored the original getter and object.

   **Minimal change:** capture the original property descriptor and resolver before spying; after `mockRestore()`, assert the getter reference and returned resolver are the originals. This is a deficient cleanup check, **not an observed leak**.

SIMULATED’s observation is on the real submitted-turn path. Production constructs the tool-session runtime at [ai-dm-conversation.ts:2775](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:2775), and its returned session executes that runtime’s `toolSurface` at line 2827. The spies surround `runArena`; the later local controls run after restoration. Thus this is not a runtime built alongside the tested arena by the test.

The corrected supervisor mutant is relevant evidence; the syntax-error attempt contributes none. One limitation remains: lines 248–249 compare aggregate reference membership, not constructor-to-consumer pairing. They detect the corrected mutant’s discarded first reconstruction, but should not be described as proving every individual pairing. This does not reopen the explicitly excepted SIMULATED blocker.

The **222 removed lines** include these expectation changes:

- Eight `bindingReads() > 0` assertions were removed: old live-path:84, arena:107, delivery:108, snapshot:183, conversation:147, knowledge-base:102, boundary:74, handler:107. Capsule-value observations were restored, but the new argument checks do not preserve proof that production consulted the supplied object. F1 describes the replacement needed.
- Old conversation:1627’s canonical-resolver parity assertion became self-comparison at current line 1622.
- The divergence message expectation remains textually intact, but now executes with a substituted production dependency; the original default-resolver integration case is no longer covered by that assertion.

No other removed expectation, deleted test, relaxed timeout, or regenerated expected value was found. The cumulative diff retains baseline assertion text, subject to the divergence dependency change above.

The scoped spies restore in `finally`; no new concurrent tests, module mocks, registry resets, or demonstrated cross-file leak remain. The file-local probe flags affect which test performs the once-only control, but do not establish a cross-file dependency. The supplied ordering and leak runs support the current gate configuration; they do not resolve the observation gaps above.

| Round-2 finding | Round-3 disposition |
|---|---|
| **S3B-R2-F1** | **Partially fixed; blocking.** Test-call replacements are detected; production forwarding remains unproven. |
| **S3B-R2-F2** | **Open; blocking.** Process limitation documented, child identity still unobserved. |
| **S3B-R2-F3** | **Partially fixed; blocking.** Bound resolver installed; require consumption evidence and preserve parity coverage. |
| **S3B-R2-F4** | **Materially strengthened; nonblocking.** Real arena runtime observed; corrected mutant supports construction-boundary coverage. |

Verified HEAD `82ae8554`, clean working tree, both diff checks, ten test-only files, and empty incremental **and cumulative** `src`/`tools` diffs. The D545 register is untouched. [src/vtt/intel/contracts.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intel/contracts.ts) hashes to `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

My targeted divergence Vitest attempt failed before collecting tests while creating `/tmp/…/ssr`; it provides no test verdict. The 331/331, ordering, leak, typecheck, and mutant results are supervisor evidence. No P1 production defect is asserted; the blocking findings concern 3B’s required proof.

**Recommendation for the owner:** Do not add the proposed injected runtime factory solely for 3B. Scoped namespace spies now demonstrably reach the arena’s production construction path, and the corrected supervisor mutant supplies useful evidence that the test-only route works. A factory alone would still lack an independently captured reference. Resolve the remaining helper assertions by observing production’s downstream constructor arguments, strengthen the divergence consumption check, and either add production-entrypoint identity coverage for golden or explicitly accept its cross-process limitation. A production seam can be reconsidered later for an architectural need; these findings do not establish that it is necessary.

**REJECT 3B**

3B REVIEW R3 DONE