1. **F1 — SIGNIFICANT: The new counter again confuses resource access with advertised engine-tool access.**  
   **Evidence:** §4.3 counts any `item.server === "engine"` as a direct tool call. But [nDXgPJ rollout:51](/tmp/dnd-ai-dm-conversation-nDXgPJ/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T13-16-43-01a0872c-02e8-7a33-a9cf-8f138c7ce920.jsonl:51) is an engine-server `McpToolCall` for `list_mcp_resource_templates`; [bvZkpX rollout:58](/tmp/dnd-ai-dm-conversation-bvZkpX/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T14-13-09-01a0875f-abd7-7640-96fa-e7d6e8d3b203.jsonl:58) is `read_mcp_resource`. All three known contaminated cells would receive positive counters, making §4.4 explicitly refuse infrastructure classification.

   **Required change:** Count calls to the advertised profile’s actual tool names separately from generic resource operations, with invocation-ID deduplication. Correct the “27/27 `McpToolCall`” paragraph: that scan proves engine-server interaction, not direct catalog availability. Add the resource-only trajectories to classifier regressions.

2. **F2 — SIGNIFICANT: The timestamp classifier does not establish the ordering it claims, and lacks dispatch correlation.**  
   **Evidence:** `writeJsonLine` returns when `stdout.write` accepts buffering or drains; it does not acknowledge client receipt ([entrypoint.ts:162](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/entrypoint.ts:162)). A timestamp appended afterward can postdate client receipt and even model activity. Conversely, the first model-produced item observed on stdout can arrive well after the model began; decoding currently occurs after process completion ([codex.ts:175](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:175), [codex.ts:192](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:192)).

   The same launcher is reused across advice retries, and normal/recovery launchers share spool paths ([ai-dm-conversation.ts:4660](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4660), [ai-dm-conversation.ts:2994](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2994)). The proposed records have no process/dispatch identifier. An earlier successful list can therefore mask a later failed initialization.

   **Required change:** Define live timestamp capture, null-timestamp behavior, and per-dispatch readiness correlation. Distinguish response generation, stream writing, and client registration. A completed server write alone must not prove a healthy catalog; a post-write timestamp alone must not prove late availability. Validate successful response contents/profile/tool names, and represent inconclusive evidence explicitly. Add regressions for delayed first model output, post-write scheduling delay, and a failed retry following an earlier successful list.

3. **F3 — SIGNIFICANT: The delivery union cannot represent the specification’s own healthy noncompliance test.**  
   **Evidence:** §4.4 correctly retains an on-time-catalog, zero-call completion as `service_null`. That turn can have no context record: the current runner retains its placeholder when the spool is empty ([ai-dm-conversation.ts:4729](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4729)). Yet §4.5 permits missing delivery only for two infrastructure reasons, and §4.6 prohibits missing/incomplete evidence on non-infrastructure rows. The required-text check therefore still throws for this lawful model-failure outcome ([blind-model-ingress.ts:194](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/blind-model-ingress.ts:194)).

   The same gap covers a genuine timeout before context retrieval and calls to other engine tools without retrieving context.

   **Required change:** Make delivery status independent of failure attribution. Represent “available but not requested,” timeout before delivery, and infrastructure absence distinctly. Permit truthful incomplete delivery on scored model failures while preserving forbidden-content checks. Test each outcome through finalization and packet conversion. A host diagnostic must also be optional or failure-tolerant, so diagnostic rendering cannot prevent persistence of the original failure.

4. **F4 — SIGNIFICANT: Returning `timed_out` changes control flow without specifying how the conversation consumes it.**  
   **Evidence:** Currently a process timeout throws ([process.ts:120](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/process.ts:120)). Under the proposed return-based behavior, the runner proceeds to read the proposal spool at [ai-dm-conversation.ts:4725](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4725). A timed-out result is not `flapped`, so it can reach authorization; a proposal staged before timeout could become authorized instead of retaining the former timeout/refusal outcome ([ai-dm-conversation.ts:4765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4765)). §4.5 specifies an early exit for infrastructure, but not timeout. Correction handling still throws for every non-completed result at [ai-dm-conversation.ts:5140](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5140).

   The replacement shared result type also drops existing `contractEvidence`, which Pi produces and tests consume ([pi.ts:104](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/pi.ts:104), [agent-adapters.SIMULATED.test.ts:641](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tests/unit/vtt/agent-adapters.SIMULATED.test.ts:641)).

   **Required change:** Specify an exhaustive exit transition table before proposal handling for each affected dispatch phase. Preserve timeout outcomes, provenance, and execution boundaries explicitly. Define propagation through coordinator callbacks and lifecycle methods, including `coldStart`’s binding-returning API. Inventory the other adapters and simulated results affected by the shared type/process changes; retain their evidence contracts. Add timeout-before-context and timeout-after-staged-proposal regressions.

5. **F5 — SIGNIFICANT: The migration still cannot validate the intended mixture of retained rows and new infrastructure rows.**  
   **Evidence:** Retained hard rows have neither `turnContextDelivery` nor `blindIngressAudit.status`; their audit uses the existing strict shape ([hard row 1](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:1), [ai-dm-rerun-packet.ts:218](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:218)). Replacing that schema with the specified complete/incomplete union rejects the byte-identical retained cohort unless an explicit historical decoding path is provided.

   New initialization failures may have `sessionId:null`, `passed:false`, and `turnContextBudget:null`. The external validator rejects the first two and dereferences the third ([validate-first-arm.ts:65](/home/vagrant/dnd-slim-runs/d569-v5/scripts/validate-first-arm.ts:65), [validate-first-arm.ts:105](/home/vagrant/dnd-slim-runs/d569-v5/scripts/validate-first-arm.ts:105)). Its downstream observed-row validator independently requires a non-null unique session and has no outcome discriminator ([d569-blind-experiment.ts:714](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:714), [d569-blind-experiment.ts:765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:765)). Changing only commit validation to use the reconciliation sidecar does not resolve these constraints.

   **Required change:** Specify historical-cohort decoding without rewriting retained artifacts, plus outcome-aware validation for new failed dispatches. Preserve scheduled-cell identity when a CLI session never existed; keep configured caps separate from absent delivered measurements. Test the actual mixed 27-old/3-new hard grid and a full brutal grid containing a startup failure through the external validator and analysis path.

6. **F6 — SIGNIFICANT: The proposed correction changes fix telemetry, but leave the model receiving the DM correction protocol.**  
   **Evidence:** A staged proposal whose authorization fails enters the coordinator’s correction path ([turn-exhaustion-coordinator.ts:219](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/turn-exhaustion-coordinator.ts:219)). That path unconditionally invokes `renderEnginePrompt('correct_proposal', …)` for tool-driven turns ([turn-exhaustion-coordinator.ts:282](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/turn-exhaustion-coordinator.ts:282)). The resulting prompt asks for `engine.submit_round_proposals`, option IDs, and the ordinary proposal schema ([engine-server.ts:1008](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:1008)).

   Passing blind options into `plannedTurnContext` and suppressing `fullTurnContextBase` does not alter that model-facing prompt. The proposed regression checks the recorded context and base builder, so it can pass while this defect remains.

   **Required change:** Specify whether blind host-authorization failure terminates the cell or enters a genuinely blind repair path. Define its attempt budget and prohibit unintended exhaustion/default execution. Assert the actual correction invocation’s prompt and tool contract, not only telemetry. This cannot remain unspecified while §4.1 claims to close the correction leaks.

7. **F7 — SIGNIFICANT: The replacement runbook does not explicitly implement D591 or the new failure-row policy.**  
   **Evidence:** The preserved runbook prohibits concurrent arena/test activity and load above 2.0 ([runbook:221](/home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:221), [runbook:233](/home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:233)). Its STOP rules also reject missing sessions and incomplete ingress ([runbook:1635](/home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:1635), [runbook:1642](/home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:1642)). These conflict with the supplied D591 ruling and planned typed infrastructure rows. §4.6 names a replacement runbook but does not specify these necessary clause changes.

   **Required change:** Explicitly revise preflight and STOP rules: permit owner-authorized concurrent work, retain genuine port/resource conflicts and integrity failures, and allow diagnosed infrastructure cells to persist and be excluded. Distinguish continuing the scheduled arm from retrying a failed cell. Include these exact clauses in the required independent review of replacement pins.

8. **F8 — TRIVIAL: The validator’s quoted original SHA-256 is incorrect.**  
   **Evidence:** The actual file and its [checksum sidecar:1](/home/vagrant/dnd-slim-runs/d569-v5/scripts/validate-first-arm.ts.sha256:1) contain:

   `7f177aff05a5c57b96461a6bff756fb1e1b1c4c42df47cdab313ee8a5a59bfa9`

   §4.6 omits `b1` from that value.

   **Required change:** Correct the forensic pin before using it in replacement or reconciliation validation.

**Verified claims**

- Mandatory `engine.required=true` with a 60-second startup ceiling resolves the previous optional-grace configuration omission. Required servers use their startup timeout; the global optional grace need not change. Sixty seconds remains a policy ceiling, not a reliability guarantee. [Official Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).
- The immediate conditional is correct, and the revised explanation accurately identifies the second required-ingress exception. The general direction—separating host diagnostics from delivered evidence—is correct, but F3 shows the state model is incomplete.
- The `fullTurnContextBase` caller inventory is corrected. PNG validation also confirms valid blind CLI configurations cannot select local OpenAI ([ai-dm-conversation.ts:1070](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1070)).
- All three recovered timeout session IDs match their cited rollout metadata. Their files contain 145, 157, and 156 records respectively, with no `task_complete`. Retaining their timeout/refusal outcomes is appropriate.
- D590’s selection is correct: filtering the independent room/rep loops preserves the intended fixture and seed mapping ([ai-dm-arena.ts:778](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-arena.ts:778)). `2:1,4:1,8:1` identifies exactly the three infrastructure hard cells. Retaining 24 rows byte-identically, reconciling three timeout identities, replacing three infrastructure observations, rerunning all brutal cells, and recording the code split matches the ruling.
- The original hard-file, analysis-script, and runbook hashes reproduce. Preserving originals and independently reviewing new script/runbook bytes is correct.
- Mapping `service_null` to zero-scored `service_failed`, while excluding only diagnosed `infrastructure_failed`, matches the existing analysis outcome type ([d569-blind-experiment.ts:870](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:870)).
- No intentional healthy primary prompt or tool-schema change is specified. However, complete behavioral/byte-equivalence is not yet established: the lifecycle and correction gaps above must be settled, and regression coverage should compare actual healthy invocation and descriptor bytes.

VERDICT: REJECT

OWNER ANSWER: patch + structural follow-up — the diagnosis and D590 rerun selection are sound, but the specification still needs complete failure-state, classification, and validation contracts before implementation or relaunch.

review complete