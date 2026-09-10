## 1. Trigger

The immediate trigger was not ordinary model noncompliance. The crashing dispatch completed without the advertised blind-engine tools in its catalog, produced no blind intent or delivered turn context, then entered an invalid diagnostic fallback.

The proven sequence is:

1. The blind prompt was dispatched at `19:41:04.023Z`; the rollout then searched for engine tools, but filtered and complete tool enumeration exposed no engine tool names, candidate spellings were `undefined`, and only `codex_apps` MCP resources existed ([rollout:7](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:7>), [rollout:13](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:13>), [rollout:25](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:25>), [rollout:37](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:37>), [rollout:50](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:50>)).

2. The model explicitly reported that the required engine interface was unavailable and completed after 42,832 ms ([rollout:56](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:56>), [rollout:60](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:60>)). Thus “the model ignored an advertised tool” is false: it searched for a tool that was absent.

3. The crash cell’s turn-context, intent, and proposal files are empty; its blind-ingress file contains only startup, prompt, image, and a late `tools_list` record ([turn-context.jsonl:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-turn-context.jsonl:1>), [blind-intents.jsonl:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-blind-intents.jsonl:1>), [proposals.jsonl:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-proposals.jsonl:1>), [blind-ingress.jsonl:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-blind-ingress.jsonl:1>)). The predecessor has three blind turn contexts plus one intent and one proposal; each context says `dm_mode:"blind"` ([predecessor turn-context:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-turn-context.jsonl:1>), [predecessor intents:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-blind-intents.jsonl:1>), [predecessor proposals:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-proposals.jsonl:1>)).

4. `rowTurnContext` begins as a placeholder lacking `dm_mode` ([ai-dm-conversation.ts:2111](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2111), [ai-dm-conversation.ts:3771](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3771)). For this CLI/PNG configuration, neither the fixture-context nor local-render assignments apply; blind/local PNG is rejected by configuration validation ([ai-dm-conversation.ts:1070](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1070), [ai-dm-conversation.ts:3775](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3775), [ai-dm-conversation.ts:3857](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3857)). Normally the recorded model-ingress context replaces it at lines 4729 or 5757; the empty spool left the placeholder intact ([ai-dm-conversation.ts:4729](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4729), [ai-dm-conversation.ts:5757](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5757)).

5. The completed zero-proposal blind dispatch became `service_null` ([ai-dm-conversation.ts:4765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4765), [ai-dm-conversation.ts:4772](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4772)). Finalization then saw `undefined !== "blind"` and called `getPlannedInitialTurnContext` ([ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).

6. That helper correctly creates a blind-profile runtime but unconditionally passes DM-only `intel_mode` to `engine.get_turn_context` ([ai-dm-conversation.ts:2138](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2138), [ai-dm-conversation.ts:2163](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2163), [ai-dm-conversation.ts:2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177)). The DM schema accepts that key, while the strict blind schema does not ([schemas.ts:1406](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1406), [schemas.ts:1459](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1459)). Execute-time validation therefore threw at the tool surface ([engine-server.ts:3470](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3470)).

The late server-side `tools_list` write supports late optional initialization/catalog construction as the explanation, but does not prove when Codex received or registered the response: the server records around its buffered JSON-RPC write, which is not a client acknowledgement ([entrypoint.ts:162](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/entrypoint.ts:162), [engine-server.ts:3502](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3502)). The proven condition is narrower: the advertised engine tools were absent from this model dispatch’s catalog.

The earlier “27/27” statement must also be corrected. Among the 27 hard rows with persisted session IDs, all show some engine-server interaction, but only 24 show calls to actual advertised profile tools. The three contaminated trajectories contain only generic resource operations: `nDXgPJ` invokes `list_mcp_resource_templates` and `read_mcp_resource`; `CUAnqn` invokes resource reads/templates; `bvZkpX` invokes `read_mcp_resource` and templates ([nDXgPJ rollout:51](</tmp/dnd-ai-dm-conversation-nDXgPJ/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T13-16-43-01a0872c-02e8-7a33-a9cf-8f138c7ce920.jsonl:51>), [CUAnqn rollout:46](</tmp/dnd-ai-dm-conversation-CUAnqn/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T13-34-00-01a0873b-d352-7851-b198-b94660c202ff.jsonl:46>), [CUAnqn rollout:122](</tmp/dnd-ai-dm-conversation-CUAnqn/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T13-34-00-01a0873b-d352-7851-b198-b94660c202ff.jsonl:122>), [bvZkpX rollout:58](</tmp/dnd-ai-dm-conversation-bvZkpX/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T14-13-09-01a0875f-abd7-7640-96fa-e7d6e8d3b203.jsonl:58>)). By contrast, a healthy trajectory calls `engine.get_turn_context` and `engine.submit_blind_round_intents` ([healthy rollout:94](</tmp/dnd-ai-dm-conversation-2j84Z7/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T13-08-04-01a08723-8b5f-7a21-84cb-0de77a131005.jsonl:94>), [healthy rollout:106](</tmp/dnd-ai-dm-conversation-2j84Z7/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T13-08-04-01a08723-8b5f-7a21-84cb-0de77a131005.jsonl:106>)).

## 2. Defect class

There are two defects:

- A bounded missed conditional caused the immediate exception: `plannedTurnContext` did not follow the already-correct simulated-client pattern that omits `intel_mode` for blind mode ([ai-dm-conversation.ts:2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177), [ai-dm-conversation.ts:2312](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2312)).
- The codebase structurally erases the selected tool profile and reconstructs profile-dependent argument objects at numerous call sites. Schema lookup returns runtime data without preserving a profile-indexed argument type, and the agent session accepts generic tool arguments ([schemas.ts:1258](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1258), [agent-session.ts:84](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session.ts:84)). Therefore the compiler cannot reject a blind call containing `intel_mode`; validation occurs only when the tool handler executes.

### Exact 14-site `get_turn_context` argument-builder inventory

This inventory contains only locations that construct or alter the argument object. Callers, prompts, counters, and spool readers follow separately.

| # | Argument builder | Profile classification |
|---:|---|---|
| 1 | `plannedTurnContext` direct execute ([ai-dm-conversation.ts:2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177)) | **Profile-wrong today:** dynamic DM/blind runtime, but always adds `intel_mode`. Patch makes DM correct and blind correct by conditional omission. |
| 2 | Simulated MCP client ([ai-dm-conversation.ts:2308](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2308)) | **Profile-correct:** explicitly omits `intel_mode` for blind at line 2312. |
| 3 | `fullTurnContextBase` JSON-RPC request ([ai-dm-conversation.ts:3045](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3045)) | **DM-correct builder:** runtime is fixed to `toolProfile:"dm"` and `intel_mode` is legal. A caller is currently unsafe, addressed below. |
| 4 | `inProcessDmToolSession` argument augmentation ([ai-dm-conversation.ts:3132](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3132)) | **DM-correct / unreachable in blind:** runtime is fixed to DM and adds DM-only `intel_mode`. |
| 5 | Engine resource provider’s `currentTurnContext` ([engine-server.ts:3486](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3486)) | **Correct for DM and blind:** sends only the common `run_id`, `expected_revision`, and `scope` subset. |
| 6 | Dry client initial context ([engine-mcp-dry-client.ts:160](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:160)) | **Full-profile only / unreachable in blind:** includes `maximum_options_per_actor`, which blind forbids. |
| 7 | Dry client second initial-server context ([engine-mcp-dry-client.ts:223](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:223)) | **Full-profile only / unreachable in blind:** common arguments happen to be blind-compatible, but this server trajectory is not the blind profile. |
| 8 | Dry client correction context ([engine-mcp-dry-client.ts:229](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:229)) | **Full/DM correction only / unreachable in blind.** |
| 9 | Dry client room-transition context ([engine-mcp-dry-client.ts:247](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:247)) | **Full-profile only / unreachable in blind.** |
| 10 | Prose renderer report ([prose-renderer-report.ts:26](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/prose-renderer-report.ts:26)) | **Full-profile only / unreachable in blind:** sends `intel_mode`. |
| 11 | Turn-context cap sweep ([turn-context-cap-sweep.ts:134](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/turn-context-cap-sweep.ts:134)) | **DM-correct / unreachable in blind:** explicitly creates `toolProfile:"dm"` and sends `intel_mode`. |
| 12 | Blind context fixture report ([blind-context-fixture-report.ts:61](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/blind-context-fixture-report.ts:61)) | **Blind-correct:** explicitly selects the blind profile and sends no DM-only keys. |
| 13 | Renderer calibration base ([renderer-calibration.ts:139](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/renderer-calibration.ts:139)) | **Full-profile only / unreachable in blind:** sends `intel_mode`. |
| 14 | Renderer calibration measured request ([renderer-calibration.ts:157](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/renderer-calibration.ts:157)) | **Full-profile only / unreachable in blind:** sends `intel_mode` and optional delta fields. |

The `plannedTurnContext` callers are distinct from builder #1:

- Initial/fallback caller at line 3755 passes blind configuration when `dmMode` is blind and is the crashing path ([ai-dm-conversation.ts:3755](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3755), [ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).
- Speculative ordinary-context projection at line 3987 is guarded out for explicit D569 modes and uses the DM context form ([ai-dm-conversation.ts:3947](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3947), [ai-dm-conversation.ts:3987](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3987)).
- Adjustment initial and correction callers at lines 4188 and 4402 are disabled for explicit D569 modes because `midRoundAdjustmentsEnabled` is `!dmModeExplicit` ([ai-dm-conversation.ts:1107](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1107), [ai-dm-conversation.ts:4188](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4188), [ai-dm-conversation.ts:4402](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4402)).
- Main correction caller at line 4811 is currently reachable after blind host-authorization failure. Section 4.6 makes it unreachable by terminating blind authorization failure before correction ([ai-dm-conversation.ts:4811](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4811), [turn-exhaustion-coordinator.ts:219](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/turn-exhaustion-coordinator.ts:219)).
- Renderer-evidence fallback at line 5821 is explicitly the non-blind branch of the ternary and is profile-correct ([ai-dm-conversation.ts:5818](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5818)).

`fullTurnContextBase` has two callers:

- Line 3743 is reached through the advice-only update at line 4767 and is profile-correct ([ai-dm-conversation.ts:3743](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3743), [ai-dm-conversation.ts:4767](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4767)).
- Line 5189 follows host correction and lacks its own blind guard; Section 4.6 makes that blind path unreachable, while the structural follow-up should encode the restriction in its type rather than depending only on control flow ([ai-dm-conversation.ts:5189](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5189)).

The context evidence readers/counters at lines 3855, 4236, 4453, 4879, and 5568 do not construct arguments ([ai-dm-conversation.ts:3855](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3855), [ai-dm-conversation.ts:4236](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4236), [ai-dm-conversation.ts:4453](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4453), [ai-dm-conversation.ts:4879](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4879), [ai-dm-conversation.ts:5568](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5568)). Nor do the spool assignments at lines 4729/5757 or final fallback at 5815 ([ai-dm-conversation.ts:4729](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4729), [ai-dm-conversation.ts:5757](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5757), [ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).

### Other profile-divergent argument builders

The DM advertised list and blind advertised list differ except for `engine.get_turn_context`; the exact phase-specific advertised sets are declared separately ([engine-server.ts:170](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:170), [engine-server.ts:179](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:179), [engine-server.ts:187](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:187), [engine-server.ts:191](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:191)).

The remaining host-built arguments are:

| Builder | Classification |
|---|---|
| Simulated speculative submission ([ai-dm-conversation.ts:2287](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2287)) | Speculative-DM only; unreachable in blind |
| Simulated blind-intent submission ([ai-dm-conversation.ts:2372](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2372)) | Blind-only and correct |
| Simulated plan adjustment ([ai-dm-conversation.ts:2416](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2416)) | Adjustment-DM only; unreachable in blind |
| Simulated `propose_from_play` ([ai-dm-conversation.ts:2451](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2451)) | DM-only; unreachable in blind |
| Simulated round submission ([ai-dm-conversation.ts:2496](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2496)) | DM-only; blind branch returns earlier |
| Simulated UI feedback ([ai-dm-conversation.ts:2509](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2509)) | Ordinary image-feedback capability; unreachable through blind submission |
| Host-normalized plan-adjustment execution ([ai-dm-conversation.ts:3306](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3306)) | Adjustment-DM only |
| Host-normalized round submission ([ai-dm-conversation.ts:3319](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3319)) | DM only |
| Dry-client `query_path`, validation, initial/correction submission, adjudication, and narration ([engine-mcp-dry-client.ts:181](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:181), [engine-mcp-dry-client.ts:188](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:188), [engine-mcp-dry-client.ts:197](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:197), [engine-mcp-dry-client.ts:204](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:204), [engine-mcp-dry-client.ts:214](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:214), [engine-mcp-dry-client.ts:234](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:234)) | Full-profile dry client; unreachable in blind |
| Engine internal reach-preview `query_path` ([engine-server.ts:3067](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3067)) | Internal full/DM validation path; not model-built and unreachable from blind tools |
| Engine resource-provider state summary ([engine-server.ts:3492](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3492)) | Internal full-profile resource construction; not a blind advertised call |

There is no host argument builder for `query_tactical_intel`, `load_skill`, or `read_kb_subject`; those arguments originate at the tool client/model boundary and are runtime-validated. The generic forwarding sites at `inProcessDmToolSession.execute`, `dmToolSession.execute`, and Local OpenAI execute model-supplied values rather than constructing a tool-specific argument object ([ai-dm-conversation.ts:3130](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3130), [ai-dm-conversation.ts:3362](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3362), [local-openai.ts:292](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/local-openai.ts:292)).

The proper long-term guard is a profile-indexed surface:

```ts
type EngineProfile = 'dm' | 'blind';

type EngineToolArgs<P extends EngineProfile, N extends EngineToolName<P>> =
  ArgsForProfileAndTool<P, N>;

interface EngineToolSurface<P extends EngineProfile> {
  execute<N extends EngineToolName<P>>(
    name: N,
    args: EngineToolArgs<P, N>,
  ): Promise<EngineToolResult<P, N>>;
}
```

A `BlindEngineToolSurface` would make `{intel_mode: ...}` a compile error for blind `get_turn_context`, while preventing blind code from naming DM-only tools. Runtime strict validation should remain as a trust-boundary check.

## 3. Blast radius

The immediate crash was avoidable luck, not brutal-only engine behavior. Any blind cell that reached finalization without a delivered blind context would take the same fallback and then, after the first conditional fix, hit the second exception requiring recorded `creature_facts` and `legal_movement` delivery ([ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815), [ai-dm-conversation.ts:5911](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5911), [blind-model-ingress.ts:194](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/blind-model-ingress.ts:194)). A host-rendered diagnostic context cannot repair that evidence because `plannedTurnContext` uses a separate runtime without the model-ingress recorder ([ai-dm-conversation.ts:2138](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2138)).

The hard cohort comprises:

- 24 clean rows with actual advertised engine calls and usable persisted sessions.
- Three genuine CLI timeouts—rows 6, 19, and 20—with positive engine-call activity but `sessionId:null`; they are not engine-catalog-absence failures ([hard raw:6](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:6>), [hard raw:19](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:19>), [hard raw:20](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:20>)). Their recovered rollout session IDs are `01a08731-d713-7de0-9ab0-04ef5856e9a6`, `01a08755-40ff-7642-a998-f7bb67b3c268`, and `01a08758-f5f1-7580-b882-8f73e0a0a6a2`; the rollouts contain 145, 157, and 156 records and no `task_complete`.
- Three infrastructure-contaminated resource-only rows—4, 10, and 22—corresponding to room/rep keys `2:1`, `4:1`, and `8:1`.

The existing external validator rejects the timeout rows’ null sessions and assumes a delivered budget object ([validate-first-arm.ts:65](</home/vagrant/dnd-slim-runs/d569-v5/scripts/validate-first-arm.ts:65>), [validate-first-arm.ts:105](</home/vagrant/dnd-slim-runs/d569-v5/scripts/validate-first-arm.ts:105>)); the registered D569 validator independently requires a real unique session ([d569-blind-experiment.ts:714](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:714), [d569-blind-experiment.ts:765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:765)). Those provenance defects must be reconciled without relabeling the timeouts or rewriting their raw rows.

Advice has the same catalog-readiness exposure because it uses the same Codex adapter, while its normal dry run uses a scripted MCP client and therefore does not exercise Codex catalog initialization ([codex.ts:242](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:242), [ai-dm-conversation.ts:2234](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2234)). Advice currently has no blind-ingress-style readiness recorder, so the patch must add a profile-neutral readiness spool rather than depending on blind ingress.

## 4. Patch specification

### 4.1 Make every Codex engine dispatch mandatory and independently identifiable

In [codex.ts:242](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:242), append these arguments for every engine-backed Codex dispatch:

```text
-c mcp_servers.engine.required=true
-c mcp_servers.engine.startup_timeout_sec=60
-c mcp_servers.engine.tool_timeout_sec=60
```

Codex 0.153.4 contains the `required`, `startup_timeout_sec`, `tool_timeout_sec`, and `mcp_optional_startup_grace_ms` configuration identifiers and required-server failure messages; its installed package under Node v24.13.0 identifies that version ([package.json:3](/home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/@openai/codex/package.json:3)). `required=true` makes failed initialization fatal and governed by that server’s startup timeout. The global optional-server grace, documented as 1,000 ms by default, no longer decides whether this required server enters the initial catalog and should not be changed. Sixty seconds is a pinned experiment ceiling, not proof that startup will always succeed. `tool_timeout_sec=60` merely pins post-start call behavior and does not fix catalog construction.

Add a branded `EngineDispatchId`. Generate one per actual process dispatch—primary, each advice retry, correction, adjustment, speculation, and recovery—and persist it in that dispatch’s immutable launcher. Do not reuse a launcher across retries or between normal and recovery paths, which currently share paths or launcher state ([ai-dm-conversation.ts:2994](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2994), [ai-dm-conversation.ts:4660](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4660)).

Add a profile-neutral readiness spool whose every row contains:

```ts
interface EngineReadinessRecord {
  readonly version: 1;
  readonly dispatchId: EngineDispatchId;
  readonly phase: 'primary' | 'correction' | 'adjustment' | 'speculative';
  readonly profile: 'dm' | 'blind';
  readonly requestId: string;
  readonly event:
    | 'tools_list_response_generated'
    | 'tools_list_stream_write_completed';
  readonly generatedAtUnixMs: number;
  readonly writeCompletedAtUnixMs: number | null;
  readonly responseId: string;
  readonly responseSha256: string;
  readonly expectedToolNames: readonly string[];
  readonly returnedToolNames: readonly string[];
  readonly descriptorSha256: string | null;
  readonly validation:
    | { readonly status: 'valid' }
    | { readonly status: 'invalid'; readonly violations: readonly string[] };
}
```

The MCP wrapper must receive `dispatchId`, profile, and phase through launcher arguments and echo them into every readiness, turn-context, intent, and proposal record. Record `generatedAtUnixMs` when the validated response object exists and `writeCompletedAtUnixMs` only after the JSON-RPC write callback/drain completes. Neither timestamp claims client receipt or catalog registration because `stdout.write` is buffered ([entrypoint.ts:162](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/entrypoint.ts:162)).

Validate that the correlated JSON-RPC response:

- is successful rather than an error;
- has the matching response ID, dispatch ID, profile, and phase;
- contains descriptors whose exact names equal the expected advertised names for that profile, phase, and enabled capabilities;
- contains the expected schemas/descriptors, represented by a canonical hash.

The server already selects phase/capability-specific tool catalogs, so readiness validation must derive its expected set from the same authoritative selection rather than a hard-coded superset ([engine-server.ts:3439](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3439)). A record with wrong profile, missing names, extra names, malformed content, or a different dispatch ID is invalid and cannot prove readiness.

### 4.2 Preserve complete result and live process evidence for all exit paths

Refactor the line decoder in [process.ts:120](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/process.ts:120) and [process.ts:138](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/process.ts:138) so complete stdout lines are decoded as they arrive. Attach `observedAtUnixMs` at decode time, not after process completion. Preserve partial stdout, stderr, exit code/signal, start/end times, and timeout/cancellation cause for completed, nonzero, cancelled, and timed-out processes; stderr is currently buffered but discarded from successful Codex results ([process.ts:145](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/process.ts:145), [codex.ts:181](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:181), [codex.ts:191](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:191)).

Retain the existing branded reusable `AgentSessionId`; do not conflate it with the Codex rollout ID. The current contract already distinguishes `resumeSessionId` from nullable `sessionId`, and Pi demonstrates why both are required: Pi returns a reusable session-file identity while its Codex-specific rollout ID remains null ([agent-session.ts:146](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session.ts:146), [pi.ts:99](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/pi.ts:99), [pi.ts:109](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/pi.ts:109)).

Use these complete types:

```ts
interface AgentProcessEvidence {
  readonly startedAtUnixMs: number;
  readonly endedAtUnixMs: number;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly decodedEvents: readonly {
    readonly invocationId: string | null;
    readonly kind: string;
    readonly observedAtUnixMs: number;
  }[];
}

type AgentPartialResultEvidence =
  | {
      readonly status: 'complete';
      readonly decodedEventCount: number;
    }
  | {
      readonly status: 'partial';
      readonly decodedEventCount: number;
      readonly finalTextFragment: string;
      readonly observedUsage: AgentUsage | null;
      readonly stagedInvocationIds: readonly string[];
    };

interface AgentTurnResultBase {
  /** Codex rollout session ID only; null for Pi, simulated, and other adapters. */
  readonly sessionId: string | null;
  /** Complete text, or the captured partial fragment on a non-completed exit. */
  readonly finalText: string;
  /** Complete or last observed partial usage; null when none was emitted. */
  readonly usage: AgentUsage | null;
  readonly processEvidence: AgentProcessEvidence | null;
  readonly partialResultEvidence: AgentPartialResultEvidence;
  readonly contractEvidence?: readonly string[];
  readonly engineCatalogEvidence: EngineCatalogEvidence | null;
}

interface AgentTurnCompletedResult extends AgentTurnResultBase {
  readonly exit: 'completed';
  /** Generic reusable identity used by lifecycle binding. */
  readonly resumeSessionId: AgentSessionId;
  readonly partialResultEvidence: Extract<
    AgentPartialResultEvidence,
    { readonly status: 'complete' }
  >;
}

interface AgentTurnCancelledResult extends AgentTurnResultBase {
  readonly exit: 'cancelled';
  /** May be observed, but is never bound for this failed cold dispatch. */
  readonly resumeSessionId: AgentSessionId | null;
  readonly cancellationReason: string;
  readonly partialResultEvidence: Extract<
    AgentPartialResultEvidence,
    { readonly status: 'partial' }
  >;
}

interface AgentTurnTimedOutResult extends AgentTurnResultBase {
  readonly exit: 'timed_out';
  readonly resumeSessionId: AgentSessionId | null;
  readonly timeoutMs: number;
  readonly partialResultEvidence: Extract<
    AgentPartialResultEvidence,
    { readonly status: 'partial' }
  >;
}

interface AgentTurnInfrastructureFailedResult extends AgentTurnResultBase {
  readonly exit: 'infrastructure_failed';
  readonly resumeSessionId: AgentSessionId | null;
  readonly component: 'engine_mcp_startup';
  readonly failureReason: string;
  readonly partialResultEvidence: Extract<
    AgentPartialResultEvidence,
    { readonly status: 'partial' }
  >;
}

type AgentTurnResult =
  | AgentTurnCompletedResult
  | AgentTurnCancelledResult
  | AgentTurnTimedOutResult
  | AgentTurnInfrastructureFailedResult;
```

`finalText` on a non-completed result is forensic partial output and must never be interpreted as a completed model decision. A discovered `resumeSessionId` on a non-completed cold start is likewise evidence only and must not create a journal binding.

Change both lifecycle entry points to return an explicit outcome:

```ts
type AgentColdStartOutcome =
  | {
      readonly kind: 'bound';
      readonly binding: AgentSessionBinding;
      readonly turn: AgentTurnCompletedResult;
    }
  | {
      readonly kind: 'unbound';
      readonly turn:
        | AgentTurnCancelledResult
        | AgentTurnTimedOutResult
        | AgentTurnInfrastructureFailedResult;
    };
```

Both `coldStart` and `coldStartRound` currently bind from `resumeSessionId`; migrate both to create a binding only from `AgentTurnCompletedResult.resumeSessionId`, never from rollout `sessionId` and never from an incomplete result ([agent-session-lifecycle.ts:29](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session-lifecycle.ts:29), [agent-session-lifecycle.ts:41](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session-lifecycle.ts:41)). `coldStartRound` additionally records a dispatch only for the bound completed case; the unbound result still propagates to conversation finalization.

Resume behavior is:

- Existing-session resume requires a completed result whose `resumeSessionId` equals the binding.
- A cancellation or timeout returns its partial evidence without changing the binding and cannot authorize partial output.
- A required-server failure returns `infrastructure_failed` instead of throwing.
- Resume-not-found/corrupt recovery starts a fresh dispatch with a distinct dispatch ID and recovery launcher.
- Recovery creates a successor journal binding only when `adapter.start` returns completed with a non-null branded `resumeSessionId`.
- If recovery is cancelled, times out, or fails infrastructure startup, record a recovery-failure journal transition with predecessor hash and dispatch ID, do not call `recoverAgentSession`, and return the unbound failure ([agent-session-lifecycle.ts:137](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session-lifecycle.ts:137)).
- Context rollover and escalation follow the same completed-only binding rule.

Claude Code, OpenCode, and Pi use the updated process evidence without acquiring Codex-specific catalog semantics. Pi retains `contractEvidence` on completed and incomplete results ([pi.ts:104](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/pi.ts:104), [pi.ts:114](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/pi.ts:114)). Local OpenAI and simulated adapters return `processEvidence:null` and deterministic/non-applicable catalog evidence; they still return a branded reusable `resumeSessionId`.

Required lifecycle regression: a completed Pi or simulated result with `sessionId:null`, non-null branded `resumeSessionId`, `finalText`, and usage must bind successfully through both `coldStart` and `coldStartRound`; recovery must also bind its successor from `resumeSessionId`, not rollout `sessionId`. Separate tests assert that incomplete results with an observed `resumeSessionId` remain unbound.

### 4.3 Classify catalog evidence without counting resource operations

Define:

```ts
type EngineCatalogEvidence =
  | {
      readonly status: 'ready';
      readonly basis:
        | 'advertised_tool_invoked'
        | 'required_cli_completed_with_valid_catalog';
      readonly dispatchId: EngineDispatchId;
      readonly advertisedInvocationCount: number;
      readonly resourceOperationCount: number;
    }
  | {
      readonly status: 'absent';
      readonly basis: 'required_engine_initialization_failed';
      readonly dispatchId: EngineDispatchId;
      readonly corroboration: readonly string[];
    }
  | {
      readonly status: 'inconclusive';
      readonly dispatchId: EngineDispatchId;
      readonly reason:
        | 'no_correlated_catalog'
        | 'invalid_catalog_response'
        | 'missing_live_timestamp'
        | 'conflicting_success_and_failure'
        | 'timestamp_only';
    };
```

Count an advertised invocation only when:

- its server is exactly `engine`;
- its tool name is exactly a member of the expected tool-name set for the dispatch’s profile and phase;
- its invocation ID is present;
- duplicate start/completion events with that invocation ID are deduplicated.

`read_mcp_resource`, `list_mcp_resources`, and `list_mcp_resource_templates` are always counted separately as resource operations, never advertised engine calls.

Classification rules are exhaustive:

1. At least one exact advertised invocation means `ready`.
2. A successful required Codex dispatch plus a valid correlated catalog response means `ready`, even with zero calls.
3. A nonzero required-server startup failure plus no valid catalog response for the same dispatch means `absent`.
4. A failure record following an earlier successful list from another dispatch cannot use that earlier record.
5. A valid success and failure for the same dispatch is `inconclusive`, not whichever arrived last.
6. Timestamp ordering alone never proves readiness or absence.
7. A null first-model timestamp is permitted; readiness may still be established by an advertised invocation or the required-CLI contract. Otherwise it is `inconclusive`.
8. An `inconclusive` result is neither model failure nor diagnosed infrastructure failure. Section 4.4 gives it an explicit delivery/integrity state and Section 4.5 stops the arm after persisting the evidence.

Regressions must include the three preserved resource-only trajectories, a healthy exact-tool trajectory, delayed first model output, scheduling delay after the server write, null model timestamp, malformed/wrong-profile catalog content, and a failed retry after an earlier dispatch’s successful list.

### 4.4 Separate delivery from failure attribution, including indeterminate integrity

Replace the assumption that a usable context must always exist with:

```ts
type TurnContextDelivery =
  | {
      readonly status: 'delivered';
      readonly dispatchId: EngineDispatchId;
      readonly contextSha256: string;
      readonly measurement: TurnContextMeasurement;
    }
  | {
      readonly status: 'not_requested';
      readonly dispatchId: EngineDispatchId;
      readonly reason:
        | 'catalog_ready_model_did_not_fetch'
        | 'dispatch_cancelled';
      readonly measurement: null;
    }
  | {
      readonly status: 'timeout_before_delivery';
      readonly dispatchId: EngineDispatchId;
      readonly measurement: null;
    }
  | {
      readonly status: 'infrastructure_absent';
      readonly dispatchId: EngineDispatchId;
      readonly measurement: null;
    }
  | {
      readonly status: 'indeterminate';
      readonly dispatchId: EngineDispatchId;
      readonly reason: 'catalog_inconclusive_empty_context_spool';
      readonly measurement: null;
      readonly integrityAction: 'stop_after_persist';
    };
```

Delivery comes only from a correlated `get_turn_context` response in the model’s dispatch spool. A separately rendered host diagnostic is never delivery evidence. A timeout after context retrieval remains `delivered`; a timeout before retrieval is `timeout_before_delivery`; a ready completed model that invokes other tools or no tool but never requests context is `not_requested`; diagnosed absence is `infrastructure_absent`.

A completed dispatch with `engineCatalogEvidence.status === "inconclusive"` and no correlated context receives `delivery.status === "indeterminate"`. It must not become `not_requested`, because readiness is unproved, and must not become `infrastructure_absent`, because infrastructure failure is unproved.

Before stopping, write this immutable artifact atomically:

```ts
interface D569DispatchIntegrityArtifact {
  readonly version: 1;
  readonly kind: 'dispatch_integrity_indeterminate';
  readonly scheduledCellKey: string;
  readonly dispatchId: EngineDispatchId;
  readonly launcherSha256: string;
  readonly processEvidenceSha256: string;
  readonly catalogEvidence: Extract<
    EngineCatalogEvidence,
    { readonly status: 'inconclusive' }
  >;
  readonly delivery: Extract<
    TurnContextDelivery,
    { readonly status: 'indeterminate' }
  >;
  readonly contextSpool: {
    readonly recordCount: 0;
    readonly sha256: string;
  };
  readonly proposalSpool: {
    readonly recordCount: number;
    readonly sha256: string;
    readonly stagedUnconsumed: true;
  };
  readonly recordedAtUnixMs: number;
}
```

Then append and flush an `arena-row-v3` forensic row with:

```ts
{
  outcome: 'integrity_indeterminate',
  passed: false,
  engineCatalogEvidence: { status: 'inconclusive', ... },
  turnContextDelivery: { status: 'indeterminate', ... },
  authorizedPlan: null,
  execution: null
}
```

Only after the artifact and row are durable may the runner throw a typed `D569IntegrityStop`. No proposal is consumed or authorized. Packet conversion rejects `integrity_indeterminate` explicitly; it is not scored and not treated as an excluded infrastructure pair.

Store configured limits independently:

```ts
interface TurnContextConfiguredCaps {
  readonly baseBytes: number;
  readonly semanticBytes: number;
}

type HostContextDiagnostic =
  | { readonly status: 'rendered'; readonly contextSha256: string }
  | { readonly status: 'unavailable'; readonly errorClass: string }
  | null;
```

The diagnostic fallback must omit `intel_mode` in blind mode, but its failure must be caught and stored as `hostContextDiagnostic.status="unavailable"`. It cannot replace model delivery or prevent the original outcome from being persisted.

Change blind ingress finalization at [ai-dm-conversation.ts:5911](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5911) and [blind-model-ingress.ts:194](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/blind-model-ingress.ts:194) to produce:

```ts
type BlindIngressAudit =
  | ExistingHistoricalCompleteAudit
  | {
      readonly version: 2;
      readonly status: 'complete';
      readonly passed: true;
      readonly forbiddenContentPassed: true;
      readonly delivery: Extract<TurnContextDelivery, { status: 'delivered' }>;
    }
  | {
      readonly version: 2;
      readonly status: 'incomplete';
      readonly passed: false;
      readonly forbiddenContentPassed: boolean;
      readonly delivery: Exclude<TurnContextDelivery, { status: 'delivered' }>;
      readonly missingRequiredFields: readonly string[];
    };
```

Forbidden-content checks always run over whatever actual ingress exists. Missing required fields become honest incomplete evidence rather than an exception. Incomplete delivery is valid row provenance for `service_null`, timeout/refusal, cancellation, infrastructure, and integrity-indeterminate outcomes; attribution remains independent.

### 4.5 Exhaustive dispatch transitions

Immediately after the adapter result and correlated spool snapshot—but before reading a proposal for authorization—perform the catalog/delivery integrity transition:

```text
completed + inconclusive catalog + empty correlated context spool
→ delivery=indeterminate
→ atomically persist integrity artifact
→ append and flush arena-row-v3 integrity_indeterminate
→ throw D569IntegrityStop
→ stop the scheduled arm
```

D591 permits authorized concurrency; it does not waive an evidence-integrity STOP. Therefore this state stops the remaining scheduled arm rather than continuing with an excluded cell. Only explicitly diagnosed `infrastructure_failed` cells may be persisted, excluded, and followed by later scheduled cells.

After that guard, branch on `AgentTurnResult.exit`:

| Phase | Completed | Cancelled | Timed out | Infrastructure failed |
|---|---|---|---|---|
| Primary | Apply the integrity guard first. Then read only dispatch-correlated spools; authorize only a completed staged proposal | Read readiness/context for audit; do not consume proposal; persist `infrastructure_failed/dispatch_cancelled` | Read proposal only as `stagedUnconsumed`; never authorize; persist `refused/agent_timeout` | Read evidence only; persist `infrastructure_failed`; skip proposal, reducer, correction, and execution |
| Correction | Apply the integrity guard first. Ordinary DM/advice correction may consume only a completed proposal; blind correction is prohibited | No proposal consumption/default; persist `refused/correction_cancelled` | No proposal consumption/default; persist `refused/correction_timeout` | Persist `infrastructure_failed`; no default |
| Adjustment | Apply the integrity guard first. Apply only a completed, validated adjustment | Record adjustment cancelled; retain previously authorized baseline | Record adjustment timed out; ignore staged adjustment and retain baseline | Mark whole cell `infrastructure_failed`; stop further execution |
| Speculative | Apply the integrity guard before adoption. A completed validated result may be considered by existing adoption policy | Discard speculation; primary result unchanged | Discard staged speculation; primary result unchanged | Mark the cell `infrastructure_failed` when joined; never adopt speculative output |

A proposal written before timeout or integrity STOP is audit evidence only and is never passed to authorization. Coordinator callbacks must return the same exit union rather than throwing for every non-completed correction, which is the current behavior ([ai-dm-conversation.ts:4725](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4725), [ai-dm-conversation.ts:4765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4765), [ai-dm-conversation.ts:5140](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5140)).

Tests must cover timeout before context, timeout after context, timeout after a staged proposal, cancellation after a staged proposal, correction timeout, adjustment timeout with baseline retention, speculative timeout, startup failure in every phase, and completed plus inconclusive catalog plus empty context spool. The last test must assert:

- the forensic artifact and row exist before the typed STOP is observed;
- delivery remains `indeterminate`;
- catalog evidence remains `inconclusive`;
- infrastructure attribution is absent;
- no proposal authorization, reducer call, correction, default, packet, or score occurs.

### 4.6 Enforce the blind host-authorization ruling

Add an explicit coordinator policy:

```ts
type AuthorizationFailurePolicy =
  | { readonly kind: 'correct_with_dm_protocol' }
  | { readonly kind: 'refuse_blind' };
```

At [turn-exhaustion-coordinator.ts:219](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/turn-exhaustion-coordinator.ts:219), a failed host authorization under `refuse_blind` must immediately return:

```ts
{
  kind: 'refused',
  reason: 'host_authorization_failed',
  attemptConsumed: true,
}
```

It must not enter the correction method at line 282, render `correct_proposal`, invoke an adapter again, or execute a default ([turn-exhaustion-coordinator.ts:282](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/turn-exhaustion-coordinator.ts:282)). Make the correction renderer an injected dependency whose default calls `renderEnginePrompt`; the blind regression asserts the injected renderer was invoked zero times specifically for `'correct_proposal'`, the correction adapter was invoked zero times, the attempt count increased once, the row persisted `refused/host_authorization_failed`, and no reducer/default execution occurred.

This removes the DM proposal protocol from blind trajectories instead of merely correcting its telemetry.

### 4.7 Version and migrate row, packet, validator, and analysis contracts

Add `rowContractVersion:"arena-row-v3"` to new rows. Packet decoding must be a strict discriminated union:

- No `rowContractVersion`: decode using the existing historical schema exactly. Do not synthesize new fields or rewrite old lines.
- `arena-row-v3`: require catalog evidence, delivery status—including `indeterminate`—configured caps, nullable delivered measurements, scheduled-cell identity, dispatch identity, and outcome-aware ingress evidence.
- Reject partial hybrids.

Extend packet outcome parsing at [ai-dm-rerun-packet.ts:148](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:148) to accept literal `infrastructure_failed`.

Replace the catch-all at [ai-dm-rerun-packet.ts:962](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:962) with exhaustive mapping over the validated row outcome:

```ts
function packetOutcome(outcome: ValidatedArenaRow['outcome']): PacketOutcome {
  switch (outcome) {
    case 'authorized':
      return 'authorized';
    case 'refused':
      return 'refused';
    case 'service_null':
      return 'service_null';
    case 'execution_failed':
    case 'partial_execution':
      return 'execution_failed';
    case 'infrastructure_failed':
      return 'infrastructure_failed';
    case 'integrity_indeterminate':
      throw new D569IntegrityStop(
        'An integrity-indeterminate row cannot become a rerun packet.',
      );
  }
}
```

There is no default arm. Literal infrastructure must remain infrastructure, never fall through to refusal. Infrastructure packets carry null rubric values and retain the scheduled key so the registered scorer can exclude the matched pair. Preserve the existing historical audit shape at [ai-dm-rerun-packet.ts:218](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:218).

Change D569 observed-row validation so:

- normal scored rows require a unique real or reconciled session identity;
- diagnosed infrastructure rows may have `sessionId:null`, but require a unique scheduled cell key and dispatch ID;
- configured caps remain numeric even when delivered measurements are null;
- `integrity_indeterminate` and inconclusive evidence are rejected before packet/scoring;
- cell-key matching occurs before outcome exclusion, preserving the paired grid;
- only literal diagnosed `infrastructure_failed` is excluded by the registered scorer ([d569-blind-experiment.ts:714](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:714), [d569-blind-experiment.ts:765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:765), [d569-blind-experiment.ts:975](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:975), [d569-blind-experiment.ts:1086](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:1086), [d569-blind-experiment.ts:1091](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:1091)).

`service_null` must map to the scored zero result `service_failed`, not to infrastructure. The current external analyzer instead maps all `service_null` rows to infrastructure and rejects literal infrastructure outcomes; replace both copies ([analyze-primary-pair.ts:103](</home/vagrant/dnd-slim-runs/d569-v5/scripts/analyze-primary-pair.ts:103>), [runbook:855](</home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:855>)).

Create a reconciliation sidecar for hard rows 6, 19, and 20. It contains raw line number/hash, scheduled key, recovered session ID, rollout path/hash, and reviewer approval. The raw JSONL remains byte-identical; validators consume the sidecar as provenance rather than inserting session IDs into retained rows.

The forensic starting pins are:

- Hard raw: `c259b7e8e9218033e975e0f560a05547aaf808fd0e695f8db9fbc396697f6ead`
- Analyzer: `91542e61276651318a8063f67ccd672efe24866becef658414588ba50548d8b4`
- Validator: `7f177aff05a5c57b96461a6bff756fb1e1b1c4c42df47cdab313ee8a5a59bfa9`
- Runbook: `84326354321aa9163ebdc6e08f05faadc271c3a0c075c5b2d9aab45c25212aab`

The analyzer, validator, runbook, and reconciliation sidecar receive new SHA-256 pins and independent review. The runbook already says a STOP requires an explicit new launch/analysis decision ([runbook:1674](</home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:1674>)); D590 authorizes the specified reruns, but new analysis pins still require explicit approval after review.

### 4.8 Exact runbook policy replacement

Replace the affected preflight and STOP clauses with these semantics:

1. `D591` permits owner-authorized concurrent work. When that authorization is recorded in launch provenance, process-count or load-average observations alone do not STOP the arm. They remain recorded diagnostics. This replaces the unconditional concurrency/load clauses at [runbook:221](</home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:221>) and [runbook:233](</home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:233>).

2. Authorization does not waive resource integrity. Occupied port 4530, any attempted use of port 4173, duplicate execution of the same scheduled cell, collision with an output directory or required lock, insufficient disk, corrupt pins, manifest drift, or workspace identity mismatch remains a STOP.

3. A diagnosed `infrastructure_failed` cell is written with its scheduled identity and evidence, excluded by the registered scorer, and does not itself stop the remaining scheduled arm. Null session, missing delivery, and null measurement are valid only for the corresponding typed failure ([runbook:1635](</home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:1635>), [runbook:1642](</home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:1642>)).

4. An `integrity_indeterminate` row is written and flushed with its versioned forensic artifact, then stops the scheduled arm. It is neither scored nor excluded as infrastructure. An absent row, duplicate cell, uncorrelated readiness record, invalid hybrid schema, or other integrity violation also remains a STOP. D591 does not override any of these integrity STOPs.

5. Continuing later scheduled cells after persisting a diagnosed infrastructure row is not a retry. The launcher must never automatically dispatch that same cell again. Replacement of a failed observation requires a separate owner decision; D590 supplies that decision only for hard keys `2:1,4:1,8:1` and for the full brutal relaunch.

These exact clauses are part of the new runbook pin’s independent review.

### 4.9 Required regressions and verification

Add targeted tests covering:

- Blind planned-context arguments omit `intel_mode`, while DM retains it.
- Crash-shaped completed zero-call dispatch with valid catalog becomes scored `service_null`, delivery `not_requested`, and incomplete ingress without throwing.
- Completed dispatch with inconclusive/invalid catalog and empty context spool persists `integrity_indeterminate` artifacts before stopping, without readiness, delivery, or infrastructure fabrication.
- Required-server startup nonzero becomes `infrastructure_failed` with stderr and structured evidence preserved.
- Resource-only `nDXgPJ`, `CUAnqn`, and `bvZkpX` trajectories do not increment advertised-tool counts.
- Invocation-ID deduplication.
- Valid/wrong-profile/malformed catalog responses.
- Delayed first model output, post-write scheduling delay, null timestamps, and failed retry after earlier successful list.
- All five delivery states through finalization; the four non-integrity states through packet conversion, with explicit packet rejection for `indeterminate`.
- Timeout before context and after staged proposal.
- Exit transitions for primary, correction, adjustment, and speculation.
- `coldStart` and `coldStartRound` completed-only binding.
- Recovery’s completed-only successor binding and failure propagation.
- Completed Pi/simulated results with null rollout `sessionId` but valid reusable `resumeSessionId`.
- Pi `contractEvidence`, `finalText`, `usage`, and partial evidence, plus other adapters’ existing contracts.
- Blind host-authorization failure’s zero invocation of `renderEnginePrompt('correct_proposal')`.
- Historical row decoding without rewriting.
- New infrastructure row with null session/measurement.
- Raw row → packet/key → scorer exclusion, exercising `packetOutcome` so literal infrastructure remains infrastructure rather than refusal.
- A mixed 27-historical/3-current hard grid and a 30-cell brutal grid containing a startup failure through the replacement external validator and packet/key analysis path.

The permitted future cumulative unit command is:

```bash
npx vitest run --configLoader runner \
  tests/unit/vtt/agent-adapters.SIMULATED.test.ts \
  tests/unit/vtt/agent-session-lifecycle.test.ts \
  tests/unit/vtt/blind-model-ingress.test.ts \
  tests/unit/vtt/turn-exhaustion-coordinator.test.ts \
  tests/unit/tools/engine-mcp-server.test.ts \
  tests/unit/tools/ai-dm-conversation.test.ts \
  tests/unit/tools/ai-dm-rerun-packet.test.ts \
  tests/unit/tools/d569-blind-experiment.test.ts \
  tests/unit/tools/ai-dm-arena.test.ts
```

`agent-session-lifecycle.test.ts` and `engine-mcp-server.test.ts` are the existing relevant suite paths ([agent-session-lifecycle.test.ts:1](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tests/unit/vtt/agent-session-lifecycle.test.ts:1), [engine-mcp-server.test.ts:1](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tests/unit/tools/engine-mcp-server.test.ts:1)). `blind-model-ingress.test.ts` is a new required suite.

No tests or builds were run during this read-only quiet-box analysis.

### 4.10 Relaunch procedure

After implementation, targeted verification, independent pin review, and explicit approval:

1. Preserve the original hard raw file and all original cell artifacts unchanged.

2. Run only hard cells `2:1`, `4:1`, and `8:1` under seed `5117001`, the identical hard manifest, and the patched revision. Arena selection must filter the existing independent room/rep loop rather than renumbering cells, preserving fixture and seed derivation ([ai-dm-arena.ts:745](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-arena.ts:745), [ai-dm-arena.ts:778](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-arena.ts:778)).

3. Construct a new hard cohort in original key order:

   - Copy the 24 clean original raw lines byte-for-byte.
   - Copy the three timeout lines byte-for-byte and resolve identity only through the reconciliation sidecar.
   - Insert patched replacement rows only for `2:1`, `4:1`, and `8:1`.

4. Run the complete 30-cell brutal basis under seed `6203001` and the identical manifest on the patched revision. Do not retain the 26 pre-crash brutal rows, because the owner specifically ordered the full brutal basis rerun.

5. Write a provenance manifest containing:

   - original and patched full commit IDs;
   - original and replacement raw hashes;
   - each cell key and source cohort;
   - launcher, rollout, readiness, and dispatch IDs;
   - the exact unchanged experiment arguments;
   - the three timeout reconciliation entries;
   - the three hard replacement mappings;
   - code-identity split: 27 retained hard observations at `90484d453b7b6d1fe63ed28c0a53570a80e158e6`, three hard replacements at the patched revision, and all brutal observations at the patched revision;
   - D590 and D591 owner decisions;
   - analyzer, validator, runbook, and sidecar hashes and reviews.

6. Run the replacement external validator against the actual mixed 27-old/3-new hard grid and the new brutal grid, including a controlled startup-failure fixture. Run packet/key analysis to prove all 30 scheduled identities remain present, literal infrastructure survives `packetOutcome`, and only literal infrastructure pairs are excluded. Do not run the scored pair analysis until the advice arm and new analysis pins have been explicitly approved.

7. If any relaunch cell produces `integrity_indeterminate`, verify that its forensic artifact and row were flushed, stop the remaining scheduled arm, and obtain a new explicit owner decision. Do not classify or retry it automatically.

## 5. Arm integrity

The immediate `intel_mode` conditional and telemetry-state changes occur after the primary prompt has already been built and dispatched ([ai-dm-conversation.ts:4653](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4653), [ai-dm-conversation.ts:4708](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4708), [ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)). `rowTurnContext` subsequently feeds byte/evidence telemetry, including context and renderer fields; it is not used to construct that already-dispatched primary prompt ([ai-dm-conversation.ts:6084](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6084), [ai-dm-conversation.ts:6090](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6090), [ai-dm-conversation.ts:6150](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6150)).

For a healthy primary dispatch, `required=true`, dispatch IDs, evidence recording, and row versioning change orchestration/provenance but not prompt text, tool names, tool schemas, or game-engine behavior. Exact healthy prompt and descriptor byte equality must nevertheless be asserted in regression tests.

There are two intentional model-visible differences:

- A dispatch that formerly started without engine tools will now wait for mandatory initialization or fail before model execution. Its model-visible catalog necessarily changes.
- A blind staged proposal rejected by host authorization will no longer receive the erroneous DM `correct_proposal` prompt. It terminates as `refused/host_authorization_failed`.

An indeterminate catalog/delivery state does not change or reinterpret model-facing bytes. It preserves the available bytes and provenance, prevents authorization, and stops the arm because their delivery meaning cannot be established.

The retained hard cohort is therefore 24 clean rows, three genuine timeouts with sidecar-reconciled provenance, and three patched replacements. It is comparable to the fully relaunched brutal basis only with the recorded code-identity split; it is not a single-revision cohort. The three timeout rows remain genuine timeout/refusal observations, not infrastructure failures.

VERDICT: patch now + structural follow-up  
TRIGGER: The crashing dispatch had no advertised blind-engine tools, completed with empty delivery spools, retained the placeholder context, and entered a blind fallback that supplied the DM-only `intel_mode` argument to a strict blind schema.  
MODEL-FACING BYTES CHANGED BY PATCH: yes—mandatory readiness changes broken-dispatch catalogs, and blind host-authorization failures no longer receive the DM correction prompt; healthy primary prompt and tool-descriptor bytes remain unchanged.

ANALYSIS COMPLETE