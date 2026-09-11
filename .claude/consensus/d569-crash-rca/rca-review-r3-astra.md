F1 — **SIGNIFICANT: Inconclusive catalog evidence still has no truthful finalization state.**

The specification requires persisting `inconclusive` evidence, but a completed dispatch with an invalid/missing catalog and an empty context spool fits none of its delivery variants: it was neither delivered, proven catalog-ready, cancelled, timed out, nor diagnosed infrastructure-absent. These are expressly required regression cases. [Specification:231](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/d569-crash-rca/rca-r4-sol.md:231), [delivery union:240](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/d569-crash-rca/rca-r4-sol.md:240).

Existing finalization cannot supply an alternative: it substitutes a planned context and subsequently requires its fields. [ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815), [ai-dm-conversation.ts:5943](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5943).

**Required change:** Specify an explicit indeterminate-delivery/integrity-stop variant, or a separate versioned forensic artifact that is persisted before stopping. Define its transition before proposal authorization. Test completed + inconclusive catalog + empty spool without fabricating readiness, delivery, or infrastructure attribution.

F2 — **SIGNIFICANT: The replacement adapter result does not specify the session identity needed to implement its binding policy.**

Despite saying “extend—not replace,” the proposed interface removes `resumeSessionId`, `finalText`, and `usage`, delegating completed results to an undefined `AgentResponse`. Its remaining `sessionId` is currently a **Codex rollout identifier**, not the generic reusable session identifier. Pi legitimately returns `sessionId:null` alongside a reusable `resumeSessionId`. [Specification:137](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/d569-crash-rca/rca-r4-sol.md:137), [agent-session.ts:146](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session.ts:146), [pi.ts:109](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/pi.ts:109).

Both `coldStart` **and `coldStartRound`** bind using `resumeSessionId`; recovery also needs it. Merely preserving Pi’s `contractEvidence` does not preserve this contract. [agent-session-lifecycle.ts:29](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session-lifecycle.ts:29), [agent-session-lifecycle.ts:41](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session-lifecycle.ts:41), [agent-session-lifecycle.ts:137](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session-lifecycle.ts:137).

**Required change:** Define the complete response/result types, including branded reusable identity, rollout identity, text, usage, and partial-result evidence. Specify migration of both cold-start entry points and recovery. Add a completed Pi/simulated case with null rollout ID that still binds correctly.

F3 — **TRIVIAL: Several executable references and the provenance commit are wrong.**

The verification command names nonexistent `tests/unit/vtt/agent-session.test.ts` and `tests/unit/vtt/engine-server.test.ts`. Existing relevant suites are [agent-session-lifecycle.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tests/unit/vtt/agent-session-lifecycle.test.ts:1) and [engine-mcp-server.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tests/unit/tools/engine-mcp-server.test.ts:1). The installed Codex package is under **v24.13.0**, not the cited v22.22.0. [package.json:3](/home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/@openai/codex/package.json:3).

The provenance example truncates/mistypes the original commit. It must be `90484d453b7b6d1fe63ed28c0a53570a80e158e6`. [Specification:460](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/d569-crash-rca/rca-r4-sol.md:460), [original hard row:1](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:1).

**Required change:** Correct these references before pinning the specification/runbook.

F4 — **TRIVIAL: The final analysis regresses the previously concrete builder inventory.**

The table now mixes builders, spool readers, launcher plumbing, and callers. For example, the cited area around 4300 handles structured-final adjustment decisions; it is not a `get_turn_context` argument builder. The remaining profile-exclusive audit is deferred with “must receive the same audit.” [Specification:30](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/d569-crash-rca/rca-r4-sol.md:30), [Specification:47](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/d569-crash-rca/rca-r4-sol.md:47), [ai-dm-conversation.ts:4300](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4300).

**Required change:** Restore the exact builder inventory and completed profile classification. Distinguish argument construction from callers and evidence readers.

**Verified claims**

- The immediate crash chain remains supported: absent engine catalog, empty context spool, placeholder fallback, and illegal `intel_mode` against the strict blind schema. The revised analysis correctly stops short of claiming proven client registration timing. [crash rollout:56](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:56), [ai-dm-conversation.ts:2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177), [schemas.ts:1459](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1459).
- Prior F1/F2 are substantially resolved: exact advertised-tool membership excludes generic resources; dispatch correlation and mandatory initialization replace timestamp-only inference. Expected catalogs must reflect phase and enabled capabilities, as the actual server does. [engine-server.ts:3439](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3439).
- Prior F3/F4 are addressed for ordinary service-null, timeout, cancellation, and staged-proposal paths. The remaining contract gaps are F1/F2 above.
- Prior F5’s mixed historical/current decoding, timeout reconciliation sidecar, nullable infrastructure sessions, and configured-cap separation are appropriate. Packet implementation must also change the existing `packetOutcome` fallback, which otherwise converts literal infrastructure into refusal; the prescribed end-to-end test must exercise it. [ai-dm-rerun-packet.ts:962](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:962).
- Prior F6 is resolved by terminating blind host-authorization failure before the coordinator’s DM correction branch. This also makes the unsafe blind correction/base path unreachable. [turn-exhaustion-coordinator.ts:219](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/turn-exhaustion-coordinator.ts:219).
- Prior F7/F8 are resolved: D591’s concurrency policy is explicitly incorporated, and the validator hash is corrected. D590’s three hard replacements, 27 byte-preserved observations with sidecar reconciliation, full brutal relaunch, and recorded code split match the owner’s ruling. Filtering before the existing room/rep invocation preserves cell identities. [D590:21968](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:21968), [D591:21991](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:21991), [ai-dm-arena.ts:778](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-arena.ts:778).
- Healthy primary prompt/descriptor preservation is a reasonable design requirement, not yet an implementation-proven result. Mandatory startup changes timing; suppressing blind DM correction intentionally changes affected trajectories.

Read-only review; no tests or builds run. F1 and F2 block implementation approval under the stated hard gate.

VERDICT: REJECT
OWNER ANSWER: patch + structural follow-up — the failure remains bounded, but the evidence-state and adapter-result contracts must be complete before implementation.
review complete