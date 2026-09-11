**F34 RESIDUAL — Medium, blocking.**

The synthesized `invalidated` result is removed, and the valid-proposal regression is strong. However, the post-retrieval deadline check at [turn-exhaustion-coordinator.ts:443](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:443) runs **only for a structurally valid, non-null proposal**.

If `takeProposal()` expires the deadline and returns `null` or an invalid proposal, [lines 430–440](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:430) bypass that check. With escalation disabled, execution proceeds to [persist `proposal_correction_failed`](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:502) and [deterministic resolution](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:513). This contradicts the claimed deadline refusal guarantee.

The [new test](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/turn-exhaustion-coordinator.test.ts:399) covers only a valid retrieved proposal. Check expiry unconditionally after correction/direct-escalation/resumed-correction retrieval, as already done after the later escalation retrieval at line 483.

Verified:

- Exactly two `{ timeout: 15_000 }` additions; the engine-MCP test file is otherwise byte-identical.
- Six assertions added; no existing assertions changed.
- F32’s evidence handling, other round-7 files, D569 tools, runbook, and frozen contract are untouched.

No new findings beyond this residual. No tests run.

REJECT