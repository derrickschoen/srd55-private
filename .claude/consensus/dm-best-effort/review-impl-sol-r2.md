VERDICT: REVISE — P1: 0 / P2: 1 / P3: 0.

1. **P2 — The precedence sentence does not override the conflicting higher-priority instructions.** The knowledge constraint is placed in the invocation’s user prompt at [engine-server.ts:1022](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/mcp/engine-server.ts:1022). However:

   - The unconditional tactics at [tactics.md:1](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/fixtures/ai-dm-kb/tactics.md:1) enter `startupInstructions` at [ai-dm-conversation.ts:4241](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:4241).
   - The escalation’s unconditional “every actor with a legal attack must attack” remains at [ai-dm-conversation.ts:4339](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:4339) and is appended to those startup instructions at [agent-session-lifecycle.ts:373](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-session-lifecycle.ts:373).
   - Codex receives these as `developer_instructions` at [codex.ts:331](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-adapters/codex.ts:331), and local OpenAI receives them as a system message at [local-openai.ts:217](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-adapters/local-openai.ts:217).

   Therefore, the user-prompt sentence claiming precedence cannot resolve a direct conflict with developer/system instructions. The witness at [ai-dm-conversation.test.ts:1805](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/tools/ai-dm-conversation.test.ts:1805) proves delivery and wording, but not effective instruction precedence. Put the knowledge qualification into the higher-priority startup/escalation instructions, or qualify those imperatives there. The KB file itself can remain untouched.

Other dispositions:

- **P2-1 is closed.** `structuredFinalPrompt` includes the instruction exactly once before `[TURN_CONTEXT]` at [ai-dm-conversation.ts:3845](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:3845). The six-surface witness is at [engine-mcp-server.test.ts:148](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/tools/engine-mcp-server.test.ts:148). Non-structured escalation reaches `renderEnginePrompt('correct_proposal', …)` through [turn-exhaustion-coordinator.ts:546](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/turn-exhaustion-coordinator.ts:546) and its dispatches at lines 405 and 468. I found no uncovered production AI-DM prompt surface. D858’s offline E02 contract remains intentionally excluded and pinned by [experiment-orchestrator.test.ts:201](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/vtt/experiment-orchestrator.test.ts:201).
- The knowledge constraint is conceptually consistent with D844: strongest legal tactics can still be selected among targets and facts the monster plausibly knows. The problem is message priority, not the tactical policy.
- Independently decoded all four pins. Each new payload is exactly the original payload with the current instruction plus newline inserted before the single `Turn resource:` marker: `+750` raw bytes and `+751` JSON-escaped bytes. Metadata byte counts and hashes correspond.
- The KB is byte-identical at `1639ea14037b197c959595b86354a4dff4d8b6275465cfaa5774948ff639e083`.
- Scope is clean: seven cumulative paths—five code/test files plus the two pin fixtures. Under `src/`, only `src/vtt/mcp/engine-server.ts` changed. Worktree is clean.
- No tests, builds, type checks, or writes performed. Supervisor verification remains the authoritative execution evidence.

Protocol status: APPLIED cumulative candidate `7c91e96b..96236f88`, round 2; fresh read-only review under D860; no security hard gate; one significant finding remains open, so consensus is not reached.

DM-BEST-EFFORT-01 IMPL REVIEW R2 DONE