F1 — **SIGNIFICANT: The replacement validator no longer validates the registered experiment.**

It checks room/rep grids, session uniqueness, and a few evidence fields, but does not validate basis, seeds, model, effort, CLI version, fixture state, KB/visual hashes, manifest inputs, or the approved code split. Its “historical” test rows contain only four fields and pass. [validate-first-arm.ts:80](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-v5/validate-first-arm.ts:80), [d569-v5.test.ts:11](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/d569-v5.test.ts:11).

The original validator performed those checks and called `validateD569ObservedRows`. [Original validator:46](/home/vagrant/dnd-slim-runs/d569-v5/scripts/validate-first-arm.ts:46), [original validator:110](/home/vagrant/dnd-slim-runs/d569-v5/scripts/validate-first-arm.ts:110).

**Required change:** Migrate those checks, adapting only the approved historical/reconciled/current distinctions. Validate replacement inputs against their original registered cells. Test manifest, seed, fixture, code-cohort, and provenance mutations—not merely minimally shaped grids.

F2 — **SIGNIFICANT: The replacement analyzer does not implement the required paired-analysis migration.**

It maps one raw file to outcome labels and counts. It never reads packets, answer keys, judge seats, or the registered manifest; never matches both arms; and never calls `analyzeD569Pair`. [analyze-primary-pair.ts:41](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-v5/analyze-primary-pair.ts:41).

The original analyzer performs packet/key/seat matching and invokes the registered paired scorer. [Original analyzer:86](/home/vagrant/dnd-slim-runs/d569-v5/scripts/analyze-primary-pair.ts:86), [original analyzer:127](/home/vagrant/dnd-slim-runs/d569-v5/scripts/analyze-primary-pair.ts:127).

**Required change:** Supply the actual migrated analysis pipeline, including complete key matching before infrastructure exclusion. Keep this single-file diagnostic separately named if useful. Test the complete raw→packet/key→paired-scorer path.

F3 — **SIGNIFICANT: Adjustment correction can consume a proposal written before timeout or cancellation.**

`AdjustmentExhaustionCoordinator` still ignores the adapter result and immediately calls `takeProposal()`. The conversation callback likewise returns incomplete results without preventing subsequent spool consumption. [adjustment-exhaustion-coordinator.ts:222](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/adjustment-exhaustion-coordinator.ts:222), [ai-dm-conversation.ts:4795](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:4795), [ai-dm-conversation.ts:4846](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:4846).

**Required change:** Branch on the exit before taking any correction proposal. Preserve the authorized baseline for cancellation/timeout and propagate infrastructure failure. Add a staged-proposal-then-timeout coordinator/runner regression.

F4 — **SIGNIFICANT: Speculative integrity STOPs are swallowed, and recalculation infrastructure failure can execute a default.**

The speculative dispatch catches `D569IntegrityStop` and converts it into an ordinary error string, allowing the caller to continue. [ai-dm-conversation.ts:4354](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:4354), [ai-dm-conversation.ts:4370](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:4370).

Recalculation lacks an infrastructure-failure transition; absent recalculated proposals fall through to `engineDefaultPlanEntry`. Its local-proposal expression also precedes the completed-exit guard. [ai-dm-conversation.ts:6082](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6082), [ai-dm-conversation.ts:6107](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6107).

**Required change:** Propagate typed integrity STOPs through every speculative catch/join. Gate both local and spooled proposals on completion; abort the cell on recalculation infrastructure failure.

F5 — **SIGNIFICANT: Infrastructure attribution still bypasses structured evidence.**

Codex returns `infrastructure_failed` whenever a nonzero result matches a text regex, irrespective of whether catalog evidence is ready, inconclusive, or absent. The regex’s first alternative does not even require the failed required server to be `engine`. [codex.ts:231](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/codex.ts:231), [codex.ts:429](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/codex.ts:429).

Malformed readiness input is caught and discarded; this can leave an empty or partially populated record set that subsequently supports absence or readiness instead of an integrity failure. [codex.ts:449](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/codex.ts:449), [engine-dispatch-evidence.ts:121](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/engine-dispatch-evidence.ts:121).

**Required change:** Treat text as an engine-specific candidate. Let correlated structured evidence determine attribution, preserve malformed-evidence status, and route conflicts to integrity handling. Test another required server failing, conflicting evidence, and malformed readiness.

F6 — **SIGNIFICANT: Produced infrastructure rows and downstream contracts disagree.**

Both validators require infrastructure rows to have `sessionId:null`, although the adapter preserves an announced session on startup failure. The adapter’s own regression expects precisely that non-null session. [validate-first-arm.ts:71](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-v5/validate-first-arm.ts:71), [d569-blind-experiment.ts:777](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-blind-experiment.ts:777), [agent-adapters.SIMULATED.test.ts:322](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/agent-adapters.SIMULATED.test.ts:322).

Later-phase failures set the cell outcome to infrastructure, but finalization still persists **primary** catalog/delivery evidence. Packet decoding then rejects the row because it requires absent infrastructure evidence. [ai-dm-conversation.ts:5672](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:5672), [ai-dm-conversation.ts:6564](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6564), [ai-dm-rerun-packet.ts:386](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-rerun-packet.ts:386).

Primary cancellation also becomes timeout/refusal, contrary to the specified D569 `dispatch_cancelled` transition. [ai-dm-conversation.ts:5133](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:5133).

**Required change:** Preserve optional observed sessions, identify the failing dispatch separately from primary delivery, and make producer/packet/validator contracts agree. Apply D569 cancellation policy without changing the restored historical structured-final behavior.

F7 — **SIGNIFICANT: Missing delivery still produces misleading context telemetry.**

`contextBytes` still includes the placeholder’s bytes. Missing-delivery rows retain placeholder `rawTurnContext` and full granularity, while pre/post-trim and base/semantic measurements may describe the separately rendered host diagnostic. [ai-dm-conversation.ts:6273](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6273), [ai-dm-conversation.ts:6312](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6312), [ai-dm-conversation.ts:6584](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6584), [ai-dm-conversation.ts:6610](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6610).

**Required change:** Derive delivered fields and byte totals exclusively from delivered evidence. Use null measurements and zero delivered bytes when absent; keep host attribution entirely within diagnostic provenance. Exercise a real runner completion with no context.

F8 — **SIGNIFICANT: Failed ingress integrity can reach packet conversion.**

For incomplete delivery, forbidden content merely produces `forbiddenContentPassed:false`; finalization does not stop. Packet decoding accepts that boolean. It also fails to reject inconclusive catalog evidence unless the outcome itself is `integrity_indeterminate`. [blind-model-ingress.ts:248](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/blind-model-ingress.ts:248), [ai-dm-rerun-packet.ts:353](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-rerun-packet.ts:353), [ai-dm-rerun-packet.ts:371](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-rerun-packet.ts:371).

**Required change:** Persist then stop on forbidden-content violations, regardless of delivery. Reject inconclusive evidence and inconsistent outcome/catalog/delivery/audit combinations at packet decoding.

F9 — **SIGNIFICANT: Non-Codex incomplete results discard available decoded provenance.**

Claude Code, OpenCode, and Pi return raw JSON stdout as `finalText`, hard-code null usage and zero decoded events, and skip their decoders on timeout/cancellation. Claude/OpenCode cold starts also discard reusable session IDs already present in partial stdout. [claude-code.ts:118](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/claude-code.ts:118), [opencode.ts:98](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/opencode.ts:98), [pi.ts:98](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/pi.ts:98).

**Required change:** Decode complete observed events tolerantly on incomplete exits, retaining session identity, text fragments, usage, invocation IDs, and timestamps. Test partial transcripts for each affected adapter.

F10 — **SIGNIFICANT: The claimed regression coverage and healthy-byte proof are insufficient.**

The healthy-byte test compares two instances of the current runtime differing only in `readinessEvidence`. That option is consumed by the stdio server, which the test never invokes. It therefore cannot detect changes to actual conversation dispatch bytes or readiness instrumentation. [engine-mcp-server.test.ts:118](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/engine-mcp-server.test.ts:118), [entrypoint.ts:728](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/mcp/entrypoint.ts:728).

The integrity test calls the persistence helper directly; the four-phase startup test calls only the classifier; the `--cells` test checks only parsing. None proves the corresponding runner invariant. [ai-dm-conversation.test.ts:504](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:504), [engine-dispatch-evidence.test.ts:57](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/engine-dispatch-evidence.test.ts:57), [ai-dm-arena.test.ts:451](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-arena.test.ts:451).

**Required change:** Add runner-level regressions for the failures above, actual readiness spooling, and selected-cell seed/fixture preservation. Compare actual primary invocation and descriptor bytes against independent pre-patch evidence. The current equality test is vacuous with respect to the claimed instrumentation change.

F11 — **SIGNIFICANT: Blind refusal attribution incorrectly reports host authorization failure when no proposal exists.**

The no-proposal branch now manufactures `host_authorization_failed` even though host authorization was never called. [ai-dm-conversation.ts:5509](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:5509).

**Required change:** Reserve that reason for the coordinator’s actual failed authorization. Preserve appropriate no-proposal/resolver-rejection attribution and test both branches.

F12 — **TRIVIAL: The readiness “write completed” timestamp can precede write completion.**

`writeJsonLine` returns immediately when `stdout.write()` returns true; no write callback has completed. Nevertheless, the caller stamps `tools_list_stream_write_completed`. [entrypoint.ts:164](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/mcp/entrypoint.ts:164), [entrypoint.ts:731](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/mcp/entrypoint.ts:731).

**Required change:** Await the write callback/error path before recording completion.

**Verified claims**

- HEAD is `d60a0571`, directly following `90484d45`; the working tree is clean.
- Mandatory Codex startup settings are present. Distinct primary/retry/recovery launchers and dispatch IDs are implemented. [codex.ts:308](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/codex.ts:308), [ai-dm-conversation.ts:3167](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:3167).
- Result types retain both identities and evidence fields; cold-start and recovery binding guards exist. [agent-session.ts:202](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-session.ts:202), [agent-session-lifecycle.ts:30](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-session-lifecycle.ts:30).
- The real blind host-authorization failure branch avoids correction, and its coordinator test checks actual renderer/adapter non-invocation. [turn-exhaustion-coordinator.ts:235](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:235), [turn-exhaustion-coordinator.test.ts:210](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/turn-exhaustion-coordinator.test.ts:210).
- Historical packet mappings, literal infrastructure mapping, and D591 runbook clauses are present. `--cells` filters before invocation and retains existing seed/fixture indexing. [ai-dm-rerun-packet.ts:1083](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-rerun-packet.ts:1083), [runbook:47](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/.tmp-plans/2026-09-09-d569-v5-runbook-v2.md:47), [ai-dm-arena.ts:809](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-arena.ts:809).
- The supervisor log confirms **17 files / 359 tests passed**, plus successful typecheck, structural scan, and diff checks. [Test log:24](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/fanout/verify-d569-patch-2.vitest.log:24), [verification log:5](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/fanout/verify-d569-patch-2.log:5).
- No existing assertion deletion/weakening or timeout increase appeared in the reviewed test diff. Reported replacement hashes match. The frozen contract and four pinned external forensic artifacts retain their expected hashes. No added prohibited suppression/skip/`any` patterns were found.

Read-only review; no tests or builds run. Passing tests do not cover the blocking execution and experiment-integrity gaps above.

VERDICT: REJECT
review complete