# D569 v5 first arm: brutal basis crashed at cell 27 — relaunch policy? (opened 2026-09-09 15:43 EDT)

See decisions.md D586.165. Hard basis complete (30 rows). Brutal basis lost (arena writes at completion). Root cause: `plannedTurnContext` sends `intel_mode` to the blind-profile `engine.get_turn_context`, whose strict schema has no such key (tools/ai-dm-conversation.ts:2181 vs src/vtt/mcp/schemas.ts:1459); reached only via the fallback at ai-dm-conversation.ts:5815–5817.

Options:
- (a) RECOMMENDED: one-line guard + regression test on claude/blind-dm, re-run runbook preflight 2.1–3.2 against the new HEAD, relaunch both bases (~3 h) so the arm has one code identity.
- (b) Fix, relaunch brutal only; record the hard/brutal code-identity split.
- (c) Abandon the v5 first arm.

Nothing is relaunched until you rule. The VTT-handoff unit (D589) proceeds meanwhile and now has a quiet box for its baseline gates.
