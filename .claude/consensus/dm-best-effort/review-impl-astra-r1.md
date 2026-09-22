**VERDICT: REVISE — P1: 0 / P2: 2 / P3: 0.**

1. **P2 — A live transport bypasses the instruction.** [`structuredFinalPrompt`](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:3844) contains no best-effort instruction. The supported `--transport final_indices` path selects it for initial planning at line 5539, adjustments at 5064, and corrections at 5366/6425. Both exhaustion coordinators preserve structured-final prompts rather than invoking the updated renderer. Add the instruction to this surface and cover its dispatch paths; the current five-renderer witness misses this omission.

2. **P2 — Existing live instructions contradict the knowledge constraint.** The new instruction at [`engine-server.ts:1023`](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/mcp/engine-server.ts:1023) prohibits pursuing unknown creatures, but the loaded legacy [tactics instructions](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/fixtures/ai-dm-kb/tactics.md:1) unconditionally require pursuit of the nearest reachable enemy and prohibit unused movement. The [escalation instructions](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:4338), delivered at line 6180, likewise require every actor with a legal attack to attack. Engine legality does not establish plausible knowledge. Explicitly subordinate these tactical imperatives to the knowledge constraint.

Other checks:

- All five **named renderer variants** receive the instruction exactly once, before their boundary/resource lines. The wording itself follows D847 and adds no engine enforcement.
- `E02_SHARED_INSTRUCTIONS` is absent from ordinary conversation rendering, so leaving the historical experiment contract unchanged is consistent with D858. However, “not live” needs qualification: [`vtt-experiment.ts:680`](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/vtt-experiment.ts:680) selects it, and that harness can launch a model bridge at line 836.
- Independently decoded both revisions of both fixtures. Exactly four pin payloads changed: **+526 bytes** for `initialPrompt`, **+527 bytes each** for the three JSON-escaped payloads. Removing the inserted instruction plus newline reproduces every old payload byte-for-byte. All old/new lengths and SHA-256 values match; no other fixture values changed.
- The [witness](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/tools/engine-mcp-server.test.ts:147) would fail for insertion after the boundary, omission from any enumerated kind, or duplicate instruction lines. It does not establish exhaustive live-dispatch coverage.
- Exactly the stated three source/test files and two fixtures changed; nothing beyond them.

No tests, builds, type checks, or writes performed.

DM-BEST-EFFORT-01 IMPL REVIEW R1 DONE