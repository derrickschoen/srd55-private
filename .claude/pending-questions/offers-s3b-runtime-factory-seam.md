# Offers 3B: production seam for the SIMULATED arena identity proof (asked 2026-09-13 19:52, supervisor)

Context: Slice 3B (first ten consumer tests bind their own offer environment) is test-only by ruling. Astra's S3B-F2 required the SIMULATED arena test to prove that the runtime the arena actually builds is bound to the exact environment instance. Sol's round 1 did it with a vi.mock of the MCP entrypoint, which the supervisor showed to be order-dependent under vitest `isolate: false` (rejected). Round 2 removed all module mocking; the test now proves from the fake server's request bodies that the advertised option ids were minted and accepted by the arena's own environment and that an equal-binding second instance is refused. Sol reports (supervisor verification running): 12 specs serial 331/331, tsc 0, sg 0.

What remains unprovable test-only: `runArena` exposes only serialized bindings, option ids, requests and rows. The environment reconstructed inside tools/ai-dm-conversation.ts:2775 never crosses the test boundary, so the required production mutant (replace it with a fresh equal-binding instance at :2776) SURVIVES the test (sol ran it: 4/4 green with the mutant; restore byte-identical, sha d8d23dc5…).

Sol's proposed minimal seam: an optional `engineMcpRuntimeFactory` on `ConversationRunOptions`, threaded into `inProcessDmToolSession`, used for `createEngineMcpRuntime` at :2775; the test's factory receives the exact offerEnvironment so the mutant becomes observable.

Options for the owner:
1. Authorize the seam now as a 3B production change (one optional field, default = today's behaviour; astra reviews it with the ten test files).
2. Defer to 3C (remove the transitional default), where tools/ai-dm-conversation.ts changes anyway; accept 3B with the SIMULATED file's weaker, non-mutation-killable identity assertion recorded as a known gap.
3. Reject the seam; accept the gap permanently.
Supervisor recommendation: option 2 — 3C touches that file by design and the seam is better judged in that plan; the other nine files' mutation proofs stand.

## Update 2026-09-13 20:40 (supervisor) — astra round 2 changes the question

Astra reviewed 86e83024: the proposed `engineMcpRuntimeFactory` seam ALONE would not establish the proof (a factory receiving whichever environment line 2776 builds has no independently known reference to compare against); the test needs an independently captured pre-consumer instance plus an identity assertion at consumption. Astra also named a test-only route it did not execute: scoped namespace `vi.spyOn` on the exported environment and runtime constructors, restored in `finally` (acts on already-loaded exports, unlike hoisted `vi.mock`). Sol's final fix round is proving or refuting that route now under isolate:false. Revised recommendation: HOLD the ruling until that round reports; if the spy route works, no production seam is needed for 3B; if it fails, choose between options 1–3 above with the seam widened to "factory + independently captured instance".

## Update 2026-09-13 22:40 (supervisor) — round cap reached: astra REJECT 3B at r3 (final); owner ruling needed

The spy route WORKS where it reaches production: SIMULATED now observes the real runArena construction path (environment-constructor returns vs runtime-constructor arguments by identity), and my corrected counter-mutant at tools/ai-dm-conversation.ts:2776 (a second equal-binding reconstruction handed to the tool-session runtime) is KILLED (1 failed / 89 passed; the first attempt was a syntax error and void). Astra r3 on 82ae8554: no P1, no production defect, but three P2 that it marks blocking for 3B's *proof claim*:
- S3B-R3-F1: in eight files the wrapper spies on the constructor and then CALLS it itself, then asserts its own argument — tautological as evidence of production forwarding (I had flagged the live-path wrapper in the brief; astra confirms it is all eight). The live host under test is constructed without offerEnvironment, so production takes its default (src/vtt/dm-encounter-host.ts:295). Minimal change: supply the owned environment to the exercised host and assert host.engineOptionEnvironment() identity; for runtime consumers observe production's imported createEngineMcpApplication / createPureTurnProposalResolver calls (src/vtt/mcp/entrypoint.ts:417) against the owned reference.
- S3B-R3-F2: golden proves the parent constructors are unused, not that the child constructs correctly. Minimal change: a production-entrypoint identity test via runEngineMcpEntrypoint/runEngineMcpServer with scoped stream interception, or test-owned child instrumentation reporting an explicit verdict to the parent; else an explicit scope exception.
- S3B-R3-F3: divergence installs a bound resolver but never asserts production consumed it, and the former canonical-vs-bound parity comparison became a self-comparison (a weakened expectation). Minimal change: a recording call-through resolver facade + restore the parity assertion.
- S3B-R3-F4 (P3): the getter-restore assertion checks the returned object, not the getter.
- Removed expectations: eight `bindingReads() > 0` assertions gone; the divergence parity assertion replaced by self-comparison.

Astra's recommendation for you: do NOT add the injected runtime factory for 3B; the spy route demonstrably reaches production construction; resolve the helper assertions by observing production's downstream constructor arguments, strengthen divergence consumption, and either add entrypoint identity coverage for golden or accept its cross-process limitation explicitly. A seam can be reconsidered later for an architectural need.

Options:
A. Authorize ONE cap-exceeding test-only fix round (round 4) implementing astra's four minimal changes exactly, then a final astra review; 3C waits.
B. Accept 3B now with F1-F4 recorded as residuals (proof weaker than the slice's claim), no seam; carry the four items into 3C's plan.
C. Reject the slice's proof claim and reopen the seam question (options 1-3 above).
Supervisor recommendation: A. The changes are concrete, test-only, and each has a named oracle; the alternative records a proof that we know is tautological in eight files. Nothing is dispatched on offers until you rule.
