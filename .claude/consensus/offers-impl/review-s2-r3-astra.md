No new findings. **F4 is resolved.**

Verified claims

- **Discriminator-first routing:** Claimed launchers either return a validated, explicitly bound manifest or throw. They cannot return `null` and reach fixture decoding. Missing binding is checked before structure; invalid binding errors propagate unchanged. This satisfies [plan:539](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:539). See [entrypoint.ts:727](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:727) and [entrypoint.ts:746](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:746).
- **Errors surface:** Document decoding remains outside the file-read/JSON catch. Reconstruction has no fallback, and the CLI awaits the entrypoint without catching its rejection. Conversation’s simulated readers do not convert decoder failure into legacy reconstruction. [entrypoint.ts:761](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:761), [engine-mcp-server.ts:3](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/engine-mcp-server.ts:3).
- **Regression coverage:** The tests cover the revision-zero/embedded-fixture counterexample, a bound malformed launcher with zero fixture-decoder calls, and successful genuine-fixture fallback. The assertions would fail if the former `null` routing returned. Missing-binding and structural errors have distinct messages. [engine-mcp-boundary.test.ts:73](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-boundary.test.ts:73).
- **Board rejection is strengthened:** The escaped-path expectation now requires the structural error instead of accepting `null`; the explicit binding ensures the failure concerns structure. Existing valid-image/HTML controls remain. E1C, FOOTPRINTS, byte counts and the state-reference invariant are unchanged. [board-delivery.test.ts:719](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-delivery.test.ts:719), [board-delivery.test.ts:490](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-delivery.test.ts:490).
- **Scope and authority:** No Slice 3+ behavior or capability activation appeared. Conversation, engine-server, round-session, capability registry and Slice 1 oracle are byte-identical to round 2. MCP remains proposer-only. Plan and frozen-contract hashes match; the working tree and whitespace check are clean.

Changed `expect(` expressions:

- Replaced board-delivery’s escaped-path `toBeNull()` with `toThrow(new TypeError(...))` at line 719.
- Added boundary assertions at lines **82, 88, 98, 104, 110 and 114**: two error checks, two fallback-exclusion checks, and two genuine-fixture checks.
- No other `expect(` expressions changed. No tests were removed or timeout values changed.

No tests, builds or agents were invoked. Runtime results and the disclosed arena timeout history remain supervisor-supplied evidence.

VERDICT: ACCEPT

review complete