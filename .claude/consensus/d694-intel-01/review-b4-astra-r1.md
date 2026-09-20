# D694-INTEL-01 B4 — astra MEDIUM review r1 (session 01a0be58-7355-7e01-8bb6-4ca0fb0dfe63, final message only)

**REJECT — three P2 findings.**

1. **P2: The internal typed-unknown contract required by D800 is missing.** The new [query wrappers](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/engine-query-port.ts:282) return the existing host result types. An absent target produces `{legal:false, codes:[…]}` from reach and `null` from cover/visibility; none has a discriminated unknown arm. Consequently, consumers can interpret missing knowledge as concrete illegality—the MCP reach selector does so for indication-only targets without tokens. D800 deferred the **wire schema**, explicitly retaining internal typed unknown in B4. Add the internal discriminated result and direct runtime/type witnesses that forbid concrete facts on its unknown arm.

2. **P2: Threat-content correctness has no load-bearing witness.** The [Guard assertions](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:754) check hidden-ID absence, cover and invariance, but never assert threat contents. Room 8 asserts a separately reconstructed `reactionSources` array, not the emitted threats. This explains the supervisor’s surviving `sameSide` mutant: allied monsters can appear in every variant identically. This is a **B4 acceptance defect**, since B4 migrates this producer and owns its correctness witnesses. Assert Guard’s exact threat rows against the perceived Wizard and Room 8’s empty threat array; the reported mutant must fail.

3. **P2: The new phase witness blesses copying instead of the required derivation.** The [phase test](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:857) injects `outcome:'victory', survivingSide:'monster'` and expects that same object back, including through `resumePhase`. The engine’s conclusion constructor maps monster survival to `defeat`. Meanwhile, `safePhase` simply clones concluded phases, contrary to §2’s retained-participant derivation requirement. The prior B1 review explicitly left this obligation outstanding. Replace this self-confirming case with hand-derived conclusion cases and cover the omitted originating-record references. Any required out-of-manifest production change needs a scope ruling; this witness cannot establish completion.

Other review results:

- Movement, threat and direct path/reach/cover/visibility callers inspected use the requested actor’s local mechanics. Hidden occupants therefore do not enter those geometry calculations through the authoritative roster.
- The two D800 entries are genuine todos with assertion comments preserved. B5’s manifest can activate them, including reconstructing their guessed-target setup.
- Summon tests verify participant classification before redaction for both requested monsters. They do **not** prove faction preservation throughout local mechanics; that remains the explicitly scheduled B17 obligation.
- The opportunity diff removes exactly Guard→Fighter’s MCP expectation and retains Bandit→Wizard plus the independent host calculation. Added movement/summon expectations were not regenerated from output.
- Exactly seven manifest files changed; no fixture or documentation edits. Frozen-plan SHA matches; working tree clean.

Independent verification: node TypeScript check and diff-check passed. Vitest collected no tests because its temporary SSR directory failed with `ENOENT`; runtime counts and mutant results remain supervisor-supplied evidence. I did not independently reproduce the HALF geometry or run mutations.

D694-INTEL-01 B4 REVIEW R1 DONE
