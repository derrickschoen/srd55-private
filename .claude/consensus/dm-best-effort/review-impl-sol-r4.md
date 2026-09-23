VERDICT: REVISE — P1: 0 / P2: 3 / P3: 1.

P2 findings are verification gaps, not defects found in either delta:

1. **P2 — unrun grep hit:** [ai-dm-knowledge-base.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/tools/ai-dm-knowledge-base.test.ts:226). It pins assembled startup text and hashes and separately verifies `k6.txt` loading at line 251. D867/D871 do not record this file being run.
2. **P2 — unrun grep hit:** [rl-generate-data.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/tools/rl-generate-data.test.ts:38). Its hits pin the K6 path and dynamically derived K6 hash at lines 42 and 76. D867/D871 do not record it being run.
3. **P2 — unrun grep hit:** [agent-session-lifecycle.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/vtt/agent-session-lifecycle.test.ts:60). Its hit is simulated startup-instruction content rather than repository prompt bytes, but the requested grep-and-run rule still makes the absent run a P2.

4. **P3 — provenance wording is now incomplete:** [d569-prepatch-primary-bytes.json](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/fixtures/d569-prepatch-primary-bytes.json:7) says the prompt below was captured at `90484d45`, although the stored prompt was subsequently normalized. `sourceCommit` remains correct as the original capture provenance, but a one-line derivation note should disclose that the prompt was rebuilt from those original bytes by inserting the monster-knowledge instruction. This does not invalidate the pin.

Checks completed:

- Old prompt equals the `7c91e96b` original exactly.
- Prompt delta is exactly the 749-byte exported instruction plus one newline, inserted immediately after “Choose one intent …”; no bytes were removed or otherwise changed.
- Prompt size is `4901 → 5651` bytes.
- Computed SHA-256 is exactly `a563cafdfe29f82a8ed30e419fa64e753daebf96ab956c09a881d7ab5e941511`.
- Only `prompt` and `promptSha256` changed. `descriptorBytes`, `descriptorSha256`, `sourceCommit`, and `derivation` are byte-identical.
- This matches [renderBlindEnginePrompt](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/mcp/engine-server.ts:1065), whose order is task, instruction, boundary lines, then turn resource.

The local-OpenAI expectation is correct:

- The test supplies neither `--dm-mode` nor `--board-image`, so defaults are advice/off.
- That branch produces exactly K6 text followed by `\n\n## Monster knowledge\n` and the exported instruction at [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:597).
- Local OpenAI inserts those instructions as the initial system message and retains the same message array across tool rounds at [local-openai.ts](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-adapters/local-openai.ts:217).
- Therefore requests 1 and 2 both contain the system message. The request-2 assertion at [local-openai-conversation.SIMULATED.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:356) uses `arrayContaining` and does not assert its absence, so it is consistent.

Complete grep inventory:

- `tests/fixtures/ai-dm-legacy/implicit-advice-v1.json` — exercised by invariance, 10/10.
- `tests/fixtures/d569-prepatch-primary-bytes.json` — exercised by the arena selection, green.
- `tests/helpers/legacy-advice-surface.ts` — exercised by invariance, 10/10.
- `tests/unit/tools/ai-dm-arena.test.ts` — selected pin test green.
- `tests/unit/tools/ai-dm-conversation.test.ts` — selected witnesses 6/6 under D867.
- `tests/unit/tools/ai-dm-knowledge-base.test.ts` — not recorded as run; P2.
- `tests/unit/tools/ai-dm-legacy-invariance.test.ts` — 10/10.
- `tests/unit/tools/engine-mcp-server.test.ts` — included in D867’s paired 68/68 run.
- `tests/unit/tools/local-openai-conversation.SIMULATED.test.ts` — 4/4.
- `tests/unit/tools/rl-generate-data.test.ts` — not recorded as run; P2.
- `tests/unit/vtt/agent-session-lifecycle.test.ts` — not recorded as run; P2.

Protocol: fresh independent read-only review of applied candidate `e702f9ea..56aef037`; no tests, builds, type checks, or writes performed. Supervisor evidence remained authoritative. The two code/data deltas themselves are correct; revision is required only to close the three explicitly mandated file-run gaps, with the provenance clarification recommended as P3.

DM-BEST-EFFORT-01 IMPL REVIEW R4 DONE