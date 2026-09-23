VERDICT: APPROVE — P1: 0 / P2: 0 / P3: 0.

R2’s P2 is closed.

- `conversationStartupInstructions()` appends exactly one final `## Monster knowledge` section after KB and mode-specific text for default, blind, and PNG modes: [ai-dm-conversation.ts:590](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:590), [ai-dm-conversation.ts:597](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:597). The sole production KB load flows through it at [ai-dm-conversation.ts:4263](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:4263).
- The resulting startup text reaches Codex as `developer_instructions` at [codex.ts:331](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-adapters/codex.ts:331), local OpenAI as a system message at [local-openai.ts:217](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-adapters/local-openai.ts:217), and Claude Code through `--append-system-prompt` at [claude-code.ts:232](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-adapters/claude-code.ts:232).
- Pi does not carry `invocation.instructions`; it sends only `invocation.prompt` at [pi.ts:94](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-adapters/pi.ts:94). OpenCode behaves likewise. Those paths still receive the constraint in every live per-turn prompt, while the conflicting startup KB is also absent.
- Escalation composes the qualified startup section exactly once, followed by digest/full-context metadata and the now-qualified escalation text: [agent-session-lifecycle.ts:264](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-session-lifecycle.ts:264), [agent-session-lifecycle.ts:373](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/src/vtt/agent-session-lifecycle.ts:373), [ai-dm-conversation.ts:4362](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:4362), [ai-dm-conversation.ts:6203](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:6203).
- Structured-final carries both the per-turn constraint and the normal cold-start developer/system instructions: [ai-dm-conversation.ts:3869](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:3869), [ai-dm-conversation.ts:5560](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-conversation.ts:5560).

No live startup bypass remains. `ai-dm-arena.ts` delegates to `runConversation()` at [ai-dm-arena.ts:940](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-arena.ts:940) and [ai-dm-arena.ts:980](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tools/ai-dm-arena.ts:980). `vtt-experiment.ts` is the intentionally separate historical experiment surface. `legacy-advice-surface.ts` is a non-model-facing snapshot helper.

Independent pin decoding confirmed, for both primary and correction:

- Only `prompt`, `instructions`, and `freshSessionContext.startupInstructions` changed.
- `prompt` is exactly the original with the 750-byte constant-plus-newline inserted before `Turn resource:`.
- Both startup fields are exactly the original plus the same 772-byte `## Monster knowledge` suffix.
- Serialized payloads are `10457 → 12758` bytes, hash `777716e3c3bea5445b0fa531c504b39ccb08c2a78683e5464f5cee34245d1448`; primary and correction are identical.
- No other fixture field changed. `implicit-advice-v1.json` is unchanged since round 2.

The flipped assertion is intentional and paired with a positive assertion derived from the qualified source wording at [ai-dm-conversation.test.ts:1793](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/tools/ai-dm-conversation.test.ts:1793). Mode, ordering, occurrence, and escalation witnesses derive from the exported constant at [ai-dm-conversation.test.ts:3032](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/tools/ai-dm-conversation.test.ts:3032) and [engine-mcp-server.test.ts:148](/home/vagrant/PhpstormProjects/dnd-wt-dm-best-effort/tests/unit/tools/engine-mcp-server.test.ts:148).

The wording preserves D844’s strongest-legal-tactics policy within the set of creatures each monster plausibly knows about. The formerly unconditional attack imperative is qualified, and the final startup section explicitly governs the earlier pursue/attack tactics. No material contradiction remains.

Protocol: applied cumulative candidate `7c91e96b..e702f9ea`, round 3, clean worktree, seven changed paths, fresh independent read-only review. No tests, builds, type checks, or writes were performed as instructed; supervisor execution evidence remains authoritative. No load-bearing assumption remains unproved.

DM-BEST-EFFORT-01 IMPL REVIEW R3 DONE