## 1. Trigger

The proven initiating condition was not model refusal to use an advertised tool. The engine tools were absent from the model’s catalog. The model searched the catalog repeatedly, found no engine-named tools, found only the `codex_apps` MCP server, tested four plausible engine-tool spellings as `undefined`, and then explicitly reported that `engine.get_turn_context` was unavailable ([rollout:13](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:13>), [rollout:21](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:21>), [rollout:27](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:27>), [rollout:39](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:39>), [rollout:52](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:52>), [rollout:56](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:56>)). Codex nevertheless completed normally after 42,832 ms ([rollout:60](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:60>)).

Late optional MCP initialization is a supported explanation, not a proven “startup timeout.” The prompt entered the rollout at 19:41:04.023Z and the first tool-catalog search occurred at 19:41:08.286Z ([rollout:7](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:7>), [rollout:13](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T15-41-01-01a087b0-1f76-7c00-bb84-b7a85d64ec79.jsonl:13>)). The blind ingress’s last record is the engine `tools/list` response ([blind-ingress:4](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-blind-ingress.jsonl:4>)); `stat --format='%n %y'` places its file write at 19:41:18.466Z. That response is recorded inside the server before the handler returns and before stdio writes it ([engine-server.ts:3502](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3502), [entrypoint.ts:695](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/entrypoint.ts:695)). This proves the server produced its catalog after the model had begun searching. It does not prove whether Codex later received it, nor whether a timeout or the optional-server catalog grace caused the omission. The old ingress records carry ordinal/hash but no timestamp ([blind-model-ingress.ts:41](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/blind-model-ingress.ts:41)).

The complete `rowTurnContext` trace before the fallback is:

1. It starts as `{"granularity":"full","context_not_requested":true}`, which has no `dm_mode` ([ai-dm-conversation.ts:2111](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2111), [ai-dm-conversation.ts:3771](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3771)).
2. The planned-context assignment at line 3775 applies only to `final_indices`; valid blind mode requires `mcp_minimal`, so it is unreachable in this arm ([ai-dm-conversation.ts:3772](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3772), [ai-dm-conversation.ts:1093](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1093)).
3. The in-process assignment at line 3857 applies to `local-openai`; PNG blind mode rejects that adapter ([ai-dm-conversation.ts:3834](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3834), [ai-dm-conversation.ts:3857](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3857), [ai-dm-conversation.ts:1070](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1070)).
4. After the model turn, lines 4729–4732 replace it only if the turn-context spool contains a record; finalization repeats the same operation at lines 5757–5760 ([ai-dm-conversation.ts:4729](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4729), [ai-dm-conversation.ts:5757](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5757)).
5. The crash cell has 0 turn-context, 0 intent, and 0 proposal records. Its four ingress records are only startup, prompt, image metadata, and the late `tools/list` response ([turn-context:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-turn-context.jsonl:1>), [blind-intents:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-blind-intents.jsonl:1>), [proposals:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-proposals.jsonl:1>), [blind-ingress:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-blind-ingress.jsonl:1>)).
6. By contrast, the predecessor has 3 context records, 1 intent, 1 proposal, and 11 ingress records; every captured context has `dm_mode:"blind"` ([predecessor context:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-turn-context.jsonl:1>), [predecessor intents:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-blind-intents.jsonl:1>), [predecessor proposals:1](</home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-proposals.jsonl:1>)).

Because the blind arm permits one dispatch, the completed turn with no recognized tool activity, rejection, or proposal satisfies `flapped` and becomes `service_null` immediately ([ai-dm-conversation.ts:4659](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4659), [ai-dm-conversation.ts:4765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4765), [ai-dm-conversation.ts:4772](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4772)). The fallback is not selected by “zero intents,” `service_null`, rollover, `--blind-facts off`, or fixture shape. Its sole predicate is that the retained context does not say `dm_mode === "blind"` ([ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).

The fallback creates a blind runtime but always adds the DM-only `intel_mode` argument ([ai-dm-conversation.ts:2163](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2163), [ai-dm-conversation.ts:2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177)). The blind strict schema has no such property, while the DM schema does ([schemas.ts:1406](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1406), [schemas.ts:1459](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1459)). Runtime validation therefore throws at the observed location ([engine-server.ts:3471](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3471)).

Hard rows 4, 10, and 22 also completed as `service_null` with zero counted calls, but later engine resource reads produced blind context records, so `dm_mode` was already `blind` and the fallback was not selected ([hard row 4](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:4>), [hard row 10](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:10>), [hard row 22](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:22>), [bvZkpX rollout:59](</tmp/dnd-ai-dm-conversation-bvZkpX/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T14-13-09-01a0875f-abd7-7640-96fa-e7d6e8d3b203.jsonl:59>)). Thus all three were infrastructure-contaminated but escaped this particular exception through a different model/tool trajectory.

## 2. Defect class

The immediate exception is a missed conditional, but it occurs inside a structurally unsafe design. The profiles share a string-named `execute(name, unknown)` surface, and `EngineToolSpec.input` erases every schema to `ZodType<unknown>` ([schemas.ts:1258](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1258), [agent-session.ts:84](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session.ts:84)). Consequently, TypeScript accepts a DM argument object against a blind surface.

The DM/adjustment/speculative advertised lists are different from the three-tool blind list ([engine-server.ts:170](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:170), [engine-server.ts:179](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:179), [engine-server.ts:187](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:187), [engine-server.ts:191](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:191)). `read_kb_subject` has the same argument schema in both; `get_turn_context` is shared but divergent; every remaining tool is profile-exclusive ([schemas.ts:1396](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1396), [schemas.ts:1458](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1458)).

All 14 static `get_turn_context` argument-building locations are:

| Builder | Profile assessment |
|---|---|
| `engine-server.ts:3486–3488` current-turn resource | Correct intersection arguments for DM or blind ([engine-server.ts:3486](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3486)). |
| `blind-context-fixture-report.ts:61–66` | Blind-correct ([blind-context-fixture-report.ts:61](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/blind-context-fixture-report.ts:61)). |
| `turn-context-cap-sweep.ts:134–140` | DM/full-correct; runtime is explicitly DM ([turn-context-cap-sweep.ts:134](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/turn-context-cap-sweep.ts:134)). |
| `renderer-calibration.ts:139–142`, `157–165` | Two DM/full calibration calls, both correct ([renderer-calibration.ts:139](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/renderer-calibration.ts:139), [renderer-calibration.ts:157](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/renderer-calibration.ts:157)). |
| `prose-renderer-report.ts:26–32` | DM/full-correct ([prose-renderer-report.ts:26](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/prose-renderer-report.ts:26)). |
| `engine-mcp-dry-client.ts:160–162`, `223–225`, `229–231`, `247–249` | Four full-profile dry-client calls; correct and unreachable through the blind launcher ([engine-mcp-dry-client.ts:160](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:160), [engine-mcp-dry-client.ts:223](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:223), [engine-mcp-dry-client.ts:229](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:229), [engine-mcp-dry-client.ts:247](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:247)). |
| `plannedTurnContext`, `ai-dm-conversation.ts:2177–2185` | Profile-wrong for blind because `intel_mode` is unconditional; DM-correct ([ai-dm-conversation.ts:2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177)). Its initial caller passes blind configuration ([ai-dm-conversation.ts:3755](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3755)); its correction caller does not ([ai-dm-conversation.ts:4811](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4811)). Speculation and adjustment callers are unreachable in explicit D569 modes ([ai-dm-conversation.ts:3943](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3943), [ai-dm-conversation.ts:4125](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4125)); final renderer use is non-blind only ([ai-dm-conversation.ts:5818](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5818)). |
| SIMULATED client `ai-dm-conversation.ts:2308–2316` | Correct: it conditionally omits `intel_mode` for blind ([ai-dm-conversation.ts:2308](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2308)). |
| `fullTurnContextBase`, `ai-dm-conversation.ts:3045–3052` | DM-only builder. Caller 3743 is reached through the advice guard at 4767 and is correct; caller 5189 lacks that guard and is profile-wrong after a reachable blind host-authorization correction ([ai-dm-conversation.ts:3040](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3040), [ai-dm-conversation.ts:3743](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3743), [ai-dm-conversation.ts:4767](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4767), [ai-dm-conversation.ts:5187](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5187)). A staged blind proposal can enter correction when host authorization fails ([turn-exhaustion-coordinator.ts:205](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/turn-exhaustion-coordinator.ts:205)). |
| `inProcessDmToolSession`, `ai-dm-conversation.ts:3130–3134` | DM-correct. Its otherwise unguarded initial/correction callers are unreachable from a valid D569 blind CLI because blind requires PNG while PNG rejects `local-openai` ([ai-dm-conversation.ts:3130](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3130), [ai-dm-conversation.ts:3834](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3834), [ai-dm-conversation.ts:4859](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4859), [ai-dm-conversation.ts:1070](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1070)). |

Every other static builder for a profile-exclusive tool is:

- SIMULATED client: speculative submission at 2287–2300, blind intent submission at 2371–2375, adjustment at 2416–2425, play expansion at 2451–2454, round submission at 2496–2502, and UI feedback at 2508–2517. The blind branch returns at 2380–2385, so each is profile-correct ([ai-dm-conversation.ts:2287](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2287), [ai-dm-conversation.ts:2371](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2371), [ai-dm-conversation.ts:2380](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2380), [ai-dm-conversation.ts:2416](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2416), [ai-dm-conversation.ts:2451](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2451), [ai-dm-conversation.ts:2496](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2496), [ai-dm-conversation.ts:2508](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2508)).
- Structured-final queue: DM adjustment and round submissions at 3306 and 3319; blind mode forbids `final_indices`, so both are unreachable in blind ([ai-dm-conversation.ts:3303](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3303), [ai-dm-conversation.ts:1093](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1093)).
- Full-profile dry client: `query_path`, `validate_proposal`, initial/correction `submit_round_proposals`, `request_dm_adjudication`, and `emit_narration`; all are full-profile-correct and unreachable in blind ([engine-mcp-dry-client.ts:181](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:181), [engine-mcp-dry-client.ts:188](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:188), [engine-mcp-dry-client.ts:197](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:197), [engine-mcp-dry-client.ts:204](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:204), [engine-mcp-dry-client.ts:214](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:214), [engine-mcp-dry-client.ts:234](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:234)).
- Engine internals: `query_path` during preview validation and `get_state_summary` for the DM/full room resource are profile-correct and not advertised through the blind profile ([engine-server.ts:3067](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3067), [engine-server.ts:3490](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3490), [engine-server.ts:3440](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3440)).
- There are no other static argument builders in `tools/` or `src/vtt/` for `query_tactical_intel`, `load_skill`, `get_combatant_options`, `query_reach`, `query_cover`, `query_visibility`, `query_dice_expectation`, or `submit_proposal`; their model-generated arguments cross the generic `unknown` interface and are checked only at runtime ([agent-session.ts:84](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session.ts:84)).

Strict validation is not globally limited to `toolSurface.execute`: direct in-process calls validate and throw at lines 3471–3480, while stdio `tools/call` validates and returns an MCP tool error at `handler.ts:369–394` ([engine-server.ts:3471](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3471), [handler.ts:369](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/handler.ts:369)). For the crashing direct planned-context call, however, `execute` is the first guard; no per-profile compile-time argument type currently exists.

## 3. Blast radius

The immediate `intel_mode` exception could have hit hard under the crash cell’s behavior: a completed blind turn with no delivered context leaves the placeholder and selects the same fallback. Hard escaped because all 30 persisted rows happen to contain a blind context and no rollover; that does not validate the fallback ([hard raw rows](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:1>), [ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).

The correct hard accounting is:

- 24 clean completed rows: 20 refused and 4 authorized, with direct engine activity in their rollouts.
- 3 infrastructure-contaminated rows: rows 4, 10, and 22, currently mislabeled `service_null`.
- 3 genuine 240,000 ms timeouts requiring session-provenance repair: rows 6, 19, and 20. They recorded 22, 22, and 20 tool calls respectively, so they were not engine-surface-absent ([hard row 6](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:6>), [hard row 19](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:19>), [hard row 20](</home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:20>)). The existing validator rejects their null session IDs ([validate-first-arm.ts:59](</home/vagrant/dnd-slim-runs/d569-v5/scripts/validate-first-arm.ts:59>), [d569-blind-experiment.ts:765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:765)).

The recoverable timeout session IDs are independently present in their rollout metadata:

- Row 6: `01a08731-d713-7de0-9ab0-04ef5856e9a6` ([JOxC4t rollout:1](</tmp/dnd-ai-dm-conversation-JOxC4t/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T13-23-05-01a08731-d713-7de0-9ab0-04ef5856e9a6.jsonl:1>)).
- Row 19: `01a08755-40ff-7642-a998-f7bb67b3c268` ([n1f379 rollout:1](</tmp/dnd-ai-dm-conversation-n1f379/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T14-01-46-01a08755-40ff-7642-a998-f7bb67b3c268.jsonl:1>)).
- Row 20: `01a08758-f5f1-7580-b882-8f73e0a0a6a2` ([lLuqTc rollout:1](</tmp/dnd-ai-dm-conversation-lLuqTc/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T14-05-49-01a08758-f5f1-7580-b882-8f73e0a0a6a2.jsonl:1>)).

Each rollout ends without `task_complete` around the configured wall, so provenance repair must not change the timeout outcome ([JOxC4t rollout:145](</tmp/dnd-ai-dm-conversation-JOxC4t/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T13-23-05-01a08731-d713-7de0-9ab0-04ef5856e9a6.jsonl:145>), [n1f379 rollout:157](</tmp/dnd-ai-dm-conversation-n1f379/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T14-01-46-01a08755-40ff-7642-a998-f7bb67b3c268.jsonl:157>), [lLuqTc rollout:156](</tmp/dnd-ai-dm-conversation-lLuqTc/codex-home-kb/sessions/2026/09/09/rollout-2026-09-09T14-05-49-01a08758-f5f1-7580-b882-8f73e0a0a6a2.jsonl:156>)).

A read-only scan of the 27 persisted-session hard rollouts found 27/27 with a later `McpToolCall` whose `server` was `engine`; the first such event ranged from 13.003 to 41.205 seconds after `session_meta`. Those are model-event timings, not server-readiness timings. Because old launchers did not record readiness timestamps, whether any clean hard cell had a late-but-not-too-late catalog cannot be recovered from the files. The completed hard data are therefore not evidence that the old optional startup was safe.

Advice has the same startup exposure because both modes use the same Codex adapter and it currently supplies only engine command and arguments ([codex.ts:242](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:242)). Its model-free client explicitly waits for `tools/list`, so that preflight bypasses the Codex catalog race ([ai-dm-conversation.ts:2234](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2234)). Advice currently creates no blind-ingress recorder, so it also lacks the only existing server-side list evidence ([ai-dm-conversation.ts:2921](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2921), [entrypoint.ts:1013](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/entrypoint.ts:1013)). No advice-only argument mismatch is visible: advice uses the DM schemas for which `intel_mode` is valid. Its latent failure is infrastructure absence being mistaken for model `service_null`.

## 4. Patch specification

### 4.1 Immediate schema correction

In `plannedTurnContext`, make the exact change:

```diff
 const value = runtime.toolSurface.execute('engine.get_turn_context', {
   run_id: capsule.runId,
   expected_revision: capsule.revision,
   scope: 'round',
-  intel_mode: intelMode,
+  ...(blind === undefined ? { intel_mode: intelMode } : {}),
   ...(base === undefined || blind !== undefined
     ? { granularity: 'full' }
     : { granularity: 'turn_delta', since_revision: base.revision }),
 });
```

Target: [ai-dm-conversation.ts:2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177). Do not weaken the blind schema by accepting and ignoring `intel_mode`; its strictness exposed a real cross-profile leak ([schemas.ts:1459](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1459)).

This two-line fix alone is insufficient. The preserved crash then reaches the required-ingress assertion, where `creature_facts` and `legal_movement` are absent, and throws again ([ai-dm-conversation.ts:5911](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5911), [blind-model-ingress.ts:194](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/blind-model-ingress.ts:194)). The planned runtime has no model-ingress recorder, so its host rendering cannot repair delivery evidence ([ai-dm-conversation.ts:2138](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2138)).

Also close the known correction leaks in the same patch:

- Extract one `plannedBlindContextOptions()` helper and pass it from both the initial call at line 3755 and correction call at line 4811 ([ai-dm-conversation.ts:3755](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3755), [ai-dm-conversation.ts:4811](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4811)).
- Add `config.dmMode !== 'blind'` to the `fullTurnContextBase` update at lines 5187–5195. Blind corrections remain full-context and must not manufacture a DM delta base ([ai-dm-conversation.ts:5187](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5187)).

### 4.2 Make engine readiness mandatory

In `codexArgv`, append these settings whenever `engineCommand !== null`:

```ts
'-c', 'mcp_servers.engine.required=true',
'-c', 'mcp_servers.engine.startup_timeout_sec=60',
'-c', 'mcp_servers.engine.tool_timeout_sec=60',
```

Target: [codex.ts:242](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:242).

The installed package is Codex 0.153.4 ([package.json:3](</home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/@openai/codex/package.json:3>)), and its JS wrapper resolves the platform native binary ([codex.js:82](</home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/@openai/codex/bin/codex.js:82>)). Running:

```bash
strings -a /home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/@openai/codex/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/bin/codex \
  | rg 'mcp_optional_startup_grace_ms|required MCP server|required MCP servers|startup_timeout_sec|tool_timeout_sec'
```

finds all four configuration identifiers plus `required MCP servers failed to initialize:` and `required MCP server \`…\` was not initialized`. The [official Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) specifies that `required=true` makes failure to initialize fatal; required servers wait their `startup_timeout_sec`. The top-level `mcp_optional_startup_grace_ms` defaults to 1,000 ms for optional servers, while zero makes optional catalog construction wait each server’s startup timeout. Once `engine.required=true`, that optional grace no longer controls engine readiness; do not change the global grace. `tool_timeout_sec=60` only pins the documented current default and does not fix this crash.

Sixty seconds is a provisional ceiling supported by the observed 17.4-second late response, not proof that every future startup completes within 60 seconds. It consumes part of the existing 240,000 ms experiment wall; it does not alter the D456 live wall.

### 4.3 Preserve adapter diagnostics on all outcomes

Change `AgentTurnResult` at [agent-session.ts:146](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session.ts:146) into a discriminated union:

```ts
interface AgentProcessEvidence {
  readonly stderr: string;
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly firstModelActivityAtUnixMs: number | null;
  readonly directEngineToolCalls: number;
}

type AgentTurnResult =
  | {
      readonly exit: 'completed' | 'cancelled';
      readonly resumeSessionId: AgentSessionId;
      readonly sessionId: string | null;
      readonly finalText: string;
      readonly usage: AgentUsage | null;
      readonly processEvidence: AgentProcessEvidence;
    }
  | {
      readonly exit: 'timed_out';
      readonly resumeSessionId: AgentSessionId | null;
      readonly sessionId: string | null;
      readonly finalText: '';
      readonly usage: null;
      readonly processEvidence: AgentProcessEvidence;
    }
  | {
      readonly exit: 'infrastructure_failed';
      readonly resumeSessionId: AgentSessionId | null;
      readonly sessionId: string | null;
      readonly finalText: '';
      readonly usage: null;
      readonly processEvidence: AgentProcessEvidence;
      readonly candidate: {
        readonly kind: 'required_mcp_initialization_failed';
        readonly server: 'engine';
        readonly stderrSignal:
          | 'required_servers_failed'
          | 'required_server_not_initialized';
      };
    };
```

Required implementation details:

- Extend `AgentProcessOutput` with `timedOut`, and preserve accumulated `stdout` and `stderr` on timeout instead of rejecting with stderr alone. Current timeout rejection discards stdout, causing the null session IDs ([process.ts:120](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/process.ts:120)).
- Timestamp each decoded stdout JSON line. Set `firstModelActivityAtUnixMs` from the first model-produced `item.started`/`item.completed`, not `thread.started`.
- Count engine calls structurally from `item.server === "engine"`; do not reuse `eventToolNames`, which only recognizes selected type/name spellings and searches the tool name for “engine” ([ai-dm-conversation.ts:1202](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1202)).
- Parse a session ID from partial stdout/stderr before returning `timed_out` or `infrastructure_failed`.
- In `CodexAgentSessionAdapter.invoke`, inspect required-server failure before `completedOutput`; the current call throws at line 181 and successful results discard stderr at lines 191–210 ([codex.ts:181](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:181), [codex.ts:191](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-adapters/codex.ts:191)). An unrelated nonzero exit must still throw.
- Update `agent-session-lifecycle.ts` so infrastructure/timeout cold starts do not create a session binding, resume failures leave the existing binding intact, and neither path triggers resume recovery or rollover. Current cold start binds unconditionally and `requireCompleted` converts every non-completion to an exception ([agent-session-lifecycle.ts:29](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session-lifecycle.ts:29), [agent-session-lifecycle.ts:65](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session-lifecycle.ts:65), [agent-session-lifecycle.ts:280](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/agent-session-lifecycle.ts:280)).

The adapter’s required-server stderr classification is a typed candidate, not sufficient row evidence by itself.

### 4.4 Add structured server-readiness evidence

Replace launcher format `engine-mcp-launcher-v1` with `engine-mcp-launcher-v2` and require `readinessSpoolPath` in `EngineMcpLauncherManifest` ([entrypoint.ts:293](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/entrypoint.ts:293)). `writeLauncher` must create `<name>-engine-readiness.jsonl` for every MCP-backed mode—not only blind—and place that path in both normal and recovery launchers ([ai-dm-conversation.ts:2885](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2885), [ai-dm-conversation.ts:2994](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2994)).

Add `src/vtt/mcp/readiness.ts` with:

```ts
interface EngineMcpReadinessRecord {
  readonly version: 'engine-mcp-readiness-v1';
  readonly ordinal: number;
  readonly profile: EngineMcpToolProfile;
  readonly event:
    | 'initialize_response_written'
    | 'tools_list_response_written';
  readonly requestId: string | number | null;
  readonly writtenAtUnixMs: number;
  readonly advertisedToolNames: readonly string[];
  readonly advertisedToolNamesSha256: string | null;
}
```

Modify `runEngineMcpServer` so it writes the JSON-RPC response to stdout first, then synchronously appends the corresponding readiness record for `initialize` and `tools/list` ([entrypoint.ts:681](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/entrypoint.ts:681)). Recording after `writeJsonLine` makes `writtenAtUnixMs` an honest lower bound for availability. The independent spool also covers advice, whose current wrapper creates a recorder only for blind ingress ([entrypoint.ts:1013](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/entrypoint.ts:1013)).

Add one central classifier used for initial, correction, adjustment, and speculative dispatches:

```ts
function diagnoseEngineInfrastructureFailure(input: {
  readonly turn: AgentTurnResult;
  readonly readiness: readonly EngineMcpReadinessRecord[];
}): EngineInfrastructureFailure | null
```

It returns:

- `required_mcp_initialization_failed` only when the adapter has the typed required-server/nonzero candidate, `directEngineToolCalls === 0`, and there is no `tools_list_response_written` at or before first model activity.
- `engine_catalog_unavailable_before_turn` when a nominally completed turn has zero direct engine calls and the first `tools_list_response_written` is missing or later than `firstModelActivityAtUnixMs`.
- `null` for a completed zero-call turn when `tools/list` was written before model activity; that remains genuine model `service_null`.
- No infrastructure classification when direct engine calls are positive.
- `readiness_evidence_incomplete` as a hard error when timestamps are internally inconsistent; do not guess.

A nonzero stderr string alone must never create an infrastructure row. Conversely, a late successful initialization without any stderr is detected by timestamp ordering.

Persist only bounded stderr provenance in rows—SHA-256, UTF-8 byte count, exit code, and the typed signal—not raw stderr. Keep full stderr in the in-memory `AgentTurnResult`.

### 4.5 Represent missing delivery honestly

Add `infrastructure_failed` to `ConversationRow.outcome` ([ai-dm-conversation.ts:690](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:690)). Set `serviceNull=false`, skip model retries/correction/exhaustion, and finalize a row whenever the classifier returns infrastructure evidence.

Replace the loose context fields in `ConversationRowBase` with a discriminated intersection:

```ts
type ConversationTurnContextFields =
  | {
      readonly turnContextDelivery: {
        readonly status: 'delivered';
        readonly source: 'engine_mcp' | 'in_process';
      };
      readonly rawTurnContext: string;
      readonly turnContextGranularity: 'full' | 'turn_delta';
      readonly preTrimBytes: number;
      readonly postTrimBytes: number;
      readonly hostTurnContextDiagnostic: null;
    }
  | {
      readonly turnContextDelivery: {
        readonly status: 'missing';
        readonly reason:
          | 'required_mcp_initialization_failed'
          | 'engine_catalog_unavailable_before_turn';
      };
      readonly rawTurnContext: null;
      readonly turnContextGranularity: null;
      readonly preTrimBytes: null;
      readonly postTrimBytes: null;
      readonly hostTurnContextDiagnostic: {
        readonly rawTurnContext: string;
        readonly granularity: 'full';
        readonly contextBytes: number;
        readonly rendererEvidence: TurnContextRenderEvidence;
      };
    };
```

`roundTotals.contextBytes` must count delivered contexts only, so it is `0` for the crash shape. The current code calculates bytes before resolving the fallback and thereby conflates placeholder/host bytes with delivered bytes ([ai-dm-conversation.ts:5789](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5789), [ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).

Change `BlindIngressAuditSummary` into:

```ts
type BlindIngressAuditSummary =
  | {
      readonly status: 'complete';
      readonly passed: true;
      readonly version: typeof BLIND_INGRESS_AUDIT_VERSION;
      readonly stringCount: number;
      readonly utf8Bytes: number;
      readonly sha256: string;
    }
  | {
      readonly status: 'incomplete';
      readonly passed: false;
      readonly version: typeof BLIND_INGRESS_AUDIT_VERSION;
      readonly reason: 'engine_mcp_unavailable';
      readonly stringCount: number;
      readonly utf8Bytes: number;
      readonly sha256: string;
      readonly missingRequiredText: readonly string[];
    };
```

Refactor `assertBlindIngressSafe` into a scan plus completion check. Forbidden surface names, advice text, and offered option IDs must still throw on both variants. Missing required text may return `incomplete` only when supplied the typed infrastructure evidence; otherwise it remains an exception ([blind-model-ingress.ts:179](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/blind-model-ingress.ts:179)).

For missing delivery:

- Do not call `requiredRecord` for `creature_facts`, `legal_movement`, or `semantic_board` ([ai-dm-conversation.ts:5943](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5943)).
- Set delivered projection evidence, context budget, and private answer-key fields to `null`.
- Place any independently host-rendered context and renderer attribution only under `hostTurnContextDiagnostic`.
- Persist `infrastructureFailure` with classifier, process, readiness, and zero-call evidence.
- Never set `blindIngressAudit.passed=true` or copy host-rendered bytes into `rawTurnContext`.

This allows the preserved empty-context shape to produce one truthful infrastructure row rather than either exception.

### 4.6 Downstream migration

In [ai-dm-rerun-packet.ts:148](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:148):

- Accept literal `infrastructure_failed`.
- Accept the complete/incomplete audit union and nullable delivered-context evidence, but enforce with `superRefine` that incomplete/missing evidence is legal only when `outcome === "infrastructure_failed"` ([ai-dm-rerun-packet.ts:246](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:246)).
- Extend `packetOutcome` to return literal `infrastructure_failed`; leave `service_null` literal ([ai-dm-rerun-packet.ts:962](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:962)).
- Keep `infrastructureFailure`, missing-delivery evidence, and host diagnostics out of judge-visible packets and in the answer key. The existing identity-field and D569 answer-key lists are the enforcement points ([ai-dm-rerun-packet.ts:553](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:553), [ai-dm-rerun-packet.ts:584](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-rerun-packet.ts:584)).

In the pinned [analyze-primary-pair.ts:103](</home/vagrant/dnd-slim-runs/d569-v5/scripts/analyze-primary-pair.ts:103>) and its embedded runbook copy at [runbook:855](</home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:855>), use exactly:

```ts
packetOutcome === 'authorized' ? 'executed'
: packetOutcome === 'refused' ? 'refused'
: packetOutcome === 'execution_failed' ? 'execution_failed'
: packetOutcome === 'service_null' ? 'service_failed'
: packetOutcome === 'infrastructure_failed' ? 'infrastructure_failed'
: throwInvalidOutcome();
```

Do not infer infrastructure from every `service_null`. Preserve all cell keys before exclusion. The registered scorer already matches complete left/right key sets first, then excludes a pair if either side is infrastructure ([d569-blind-experiment.ts:975](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:975), [d569-blind-experiment.ts:1083](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:1083), [d569-blind-experiment.ts:1091](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/d569-blind-experiment.ts:1091)).

The following pins must move after implementation:

- `analyze-primary-pair.ts` and `analyze-primary-pair.ts.sha256`, currently `91542e61276651318a8063f67ccd672efe24866becef658414588ba50548d8b4`.
- `validate-first-arm.ts` and `validate-first-arm.ts.sha256`, currently `7f177aff05a5c57b96461a6bff756fb1e1c4c42df47cdab313ee8a5a59bfa9`.
- The runbook must become a new content-addressed copy replacing `runbook-84326354.md`, currently SHA-256 `84326354321aa9163ebdc6e08f05faadc271c3a0c075c5b2d9aab45c25212aab`.
- Add and pin a new `merge-repaired-hard.ts` plus a reconciliation JSON schema/validator.
- Record all new script hashes in the arm provenance; the current provenance already records validator and analysis hashes ([runbook:957](</home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:957>)).

The existing files and hashes remain immutable forensic artifacts. The replacements require independent re-review of their exact bytes and these invariants before launch: cell keys preserved before exclusion; only literal diagnosed infrastructure excluded; `service_null` remains zero-scored `service_failed`; incomplete delivery is impossible on non-infrastructure rows; and raw row → packet/case key → analysis preserves the same `(basis, seed, rep, arm)`.

The STOP clause requires a new explicit decision ([runbook:1674](</home/vagrant/dnd-slim-runs/d569-v5/runbook-84326354.md:1674>)). Record the owner’s 2026-09-09 “rerun only what is broken” ruling as the new launch decision. Do not construct or analyze new packets until the owner also approves the re-reviewed analysis/runbook pins.

### 4.7 Provenance reconciliation and relaunch

Preserve the original 30-row hard raw file unchanged. Its current SHA-256 is `c259b7e8e9218033e975e0f560a05547aaf808fd0e695f8db9fbc396697f6ead`.

Create `hard-reconciliation-v1.json` containing:

- Original raw path/hash and old commit `90484d453b7b6d1fe63ed28c0a53570a80e158e6`.
- Patched commit and exact command lines.
- One entry for every cell, keyed by `(basis,seed,rep)`.
- Rows 6/19/20: original row hash, launcher/rollout path and hash, recovered session ID, disposition `genuine_timeout_session_reconciled`; no other field may change.
- Rows 4/10/22: original row hash, rollout evidence, disposition `legacy_engine_catalog_absent`, replacement row hash, and patched commit.
- Remaining 24 rows: disposition `retained_byte_identical`, with exact row hashes.
- Two explicit code cohorts: 27 old-code rows and 3 patched replacement rows.

Modify `validate-first-arm.ts` so it validates this sidecar instead of requiring every row’s `repoCommit === HEAD` ([validate-first-arm.ts:59](</home/vagrant/dnd-slim-runs/d569-v5/scripts/validate-first-arm.ts:59>)). It must prove:

- The 24 clean rows are byte-identical to the originals.
- The three timeout rows differ only at `sessionId`, with the exact independently recovered IDs.
- The three replacement rows have the same registered seed/room/rep, fixture state hash, KB hash, visual source hash, manifest inputs, model, effort, and CLI version; only producer-code/readiness/result telemetry may differ.
- The resulting hard grid still has exactly 30 unique registered keys.
- Timeout rows remain timeout/refused rows; they are not relabeled infrastructure.
- `repoCommit` is the old commit on 27 rows and the patched commit on exactly three rows.

Add a scheduler-only `--cells` option to `tools/ai-dm-arena.ts`, parsed as a unique comma-separated list of `room:rep` pairs. Validate each pair against `--rooms` and `--reps`, and skip nonselected loop iterations before `runConversation` at lines 778–780. This retains the original 10-room seed array and fixture selection, and avoids post-hoc room rewriting ([ai-dm-arena.ts:745](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-arena.ts:745), [ai-dm-arena.ts:778](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-arena.ts:778), [ai-dm-arena.ts:794](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-arena.ts:794)).

After the patch commit and new pins pass review, rerun only the three broken hard cells:

```bash
export CODEX_HOME=/home/vagrant/.codex-aidm
export BOARD_SNAPSHOT_PREVIEW_PORT=4530
export PLAYWRIGHT_PORT=4530
export PLAYWRIGHT_WORKERS=1

npx vite-node tools/ai-dm-arena.ts -- \
  --rooms 10 --reps 3 --seed 5117001 --basis hard \
  --cells 2:1,4:1,8:1 \
  --out /home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.repair.raw.jsonl \
  --dm-mode blind --blind-repair-arm code_only --blind-max-attempts 3 --blind-facts off \
  --cli codex --cli-bin /home/vagrant/.nvm/versions/node/v24.13.0/bin/codex \
  --model gpt-5.6-luna --effort high --timeout-ms 240000 \
  --instruction-source kb --kb tests/fixtures/ai-dm-kb/d569/ai-dm-core.md \
  --transport mcp_minimal --board-image png --turn-context-max-bytes 65536 \
  --combat-model initiative_segments_v1 --initiative-profile derived_v1 \
  --party-policy symmetric_evaluator_v1 --override-policy typed_reason \
  --reaction-ask-default decline --intel-mode full
```

Then rerun the entire brutal basis under the patched code and identical experimental manifest:

```bash
npx vite-node tools/ai-dm-arena.ts -- \
  --rooms 10 --reps 3 --seed 6203001 --basis brutal \
  --out /home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-brutal.patched.raw.jsonl \
  --dm-mode blind --blind-repair-arm code_only --blind-max-attempts 3 --blind-facts off \
  --cli codex --cli-bin /home/vagrant/.nvm/versions/node/v24.13.0/bin/codex \
  --model gpt-5.6-luna --effort high --timeout-ms 240000 \
  --instruction-source kb --kb tests/fixtures/ai-dm-kb/d569/ai-dm-core.md \
  --transport mcp_minimal --board-image png --turn-context-max-bytes 65536 \
  --combat-model initiative_segments_v1 --initiative-profile derived_v1 \
  --party-policy symmetric_evaluator_v1 --override-policy typed_reason \
  --reaction-ask-default decline --intel-mode full
```

Do not overwrite the original hard file, partial brutal cells, crash cell, or launch logs. The merge script creates a new 30-row reconciled hard file, replacing exactly keys `hard:5117002:1`, `hard:5117004:1`, and `hard:5117008:1`; it fills only the three independently recovered timeout session IDs and carries the 24 clean rows byte-for-byte. The new brutal file contains all 30 patched-code cells. No automatic retry is allowed if a new typed infrastructure row appears; preserve it and obtain another explicit decision.

### 4.8 Regression suite

Add these tests:

- `tests/unit/vtt/agent-adapters.SIMULATED.test.ts`: exact required/startup/tool timeout argv; successful stderr preservation; nonzero required-server failure returned as a typed candidate; unrelated nonzero still throws; timeout preserves partial session ID/stdout/stderr; structured first-model-activity and engine-call counters.
- `tests/unit/vtt/agent-session-lifecycle.test.ts`: infrastructure/timeout cold start creates no binding; resume preserves the prior binding; no recovery or rollover occurs.
- `tests/unit/tools/engine-mcp-server.test.ts`: v2 launcher records timestamped initialize and `tools/list` after writing; both advice and blind produce readiness evidence.
- `tests/unit/tools/ai-dm-conversation.test.ts`:  
  1. completed zero-call turn with late `tools/list` and no stderr → `infrastructure_failed`;  
  2. required-start failure/nonzero plus missing on-time list → `infrastructure_failed`;  
  3. on-time list plus healthy zero-call noncompliance → `service_null`;  
  4. preserved crash shape completes with missing delivery, incomplete audit, host diagnostic, and no exception;  
  5. staged blind proposal followed by host authorization failure uses blind correction context and never calls the DM `fullTurnContextBase`.
- `tests/unit/tools/ai-dm-rerun-packet.test.ts` and `tests/unit/tools/d569-blind-experiment.test.ts`: raw infrastructure row → literal packet outcome and same case/key → complete pair validation → pair exclusion; raw `service_null` → `service_failed` and zero score, not exclusion.
- `tests/unit/tools/ai-dm-arena.test.ts`: `--cells 2:1,4:1,8:1` emits exactly those three registered keys while retaining the original seeds/fixtures.

Cumulative targeted command after the quiet box clears:

```bash
npx vitest run --configLoader runner \
  tests/unit/vtt/agent-adapters.SIMULATED.test.ts \
  tests/unit/vtt/agent-session-lifecycle.test.ts \
  tests/unit/tools/engine-mcp-server.test.ts \
  tests/unit/tools/ai-dm-conversation.test.ts \
  tests/unit/tools/ai-dm-arena.test.ts \
  tests/unit/tools/ai-dm-rerun-packet.test.ts \
  tests/unit/tools/d569-blind-experiment.test.ts
```

This RCA ran 0 tests, builds, TypeScript compilers, Vite commands, Playwright commands, or npm scripts because the quiet-box prohibition was active.

### 4.9 Structural follow-up

After relaunch, replace the erased tool surface with profile-indexed types:

```ts
type EngineToolArguments = {
  readonly dm: {
    readonly 'engine.get_turn_context': DmGetTurnContextInput;
    // remaining DM tools
  };
  readonly blind: {
    readonly 'engine.get_turn_context': BlindGetTurnContextInput;
    readonly 'engine.read_kb_subject': ReadKbSubjectInput;
    readonly 'engine.submit_blind_round_intents': BlindRoundIntentEnvelope;
  };
};

interface EngineToolSurface<P extends keyof EngineToolArguments> {
  execute<N extends keyof EngineToolArguments[P]>(
    name: N,
    args: EngineToolArguments[P][N],
  ): EngineToolOutput<P, N>;
}
```

`EngineToolSpec` must retain its concrete Zod input/output generics rather than `ZodType<unknown>` ([schemas.ts:1258](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1258)). Add one exhaustive `buildGetTurnContextArguments(profile, input)` and migrate all 14 context builders. Profile-exclusive builders must accept the matching typed surface. The follow-up also reviews the remaining correction renderer/base path at lines 4811 and 5189, not merely the original fallback.

This is a medium refactor across schemas, engine surface, session interface, the 14 context builders, and model-call adapters. If descriptor JSON and strict schemas remain byte-identical, it changes no model-facing bytes. Replacing MCP or removing the fallback is not warranted: the orchestration/readiness and evidence-state defects are bounded.

Recommendation: **patch now + structural follow-up**. A two-line patch alone leaves catalog readiness, the second finalization crash, false delivery evidence, and downstream misclassification. A full architectural replacement would delay the experiment without addressing a need demonstrated by these files. The structural risk left after the blocking patch is future hand-built cross-profile arguments until profile-indexed typing lands.

## 5. Arm integrity

For a healthy cell that already obtained its engine catalog and did not enter missing-delivery finalization, the patch changes no prompt text, tool descriptors, tool schemas, engine tactical result, or reducer behavior. The primary prompt is constructed and dispatched at lines 4653–4715; the fallback and renderer telemetry run only afterward at lines 5815–5828 ([ai-dm-conversation.ts:4653](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4653), [ai-dm-conversation.ts:4708](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4708), [ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)). The fallback context feeds row context/renderer evidence and byte telemetry, not prompt construction in this MCP blind path ([ai-dm-conversation.ts:6084](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6084), [ai-dm-conversation.ts:6090](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6090), [ai-dm-conversation.ts:6150](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6150)).

Mandatory readiness can delay model dispatch and therefore affects wall-clock scheduling, but not model-visible bytes. `tool_timeout_sec=60` pins the existing documented default. New readiness/delivery/infrastructure fields and the producing commit change row telemetry and provenance, not model content.

For the three repaired infrastructure hard cells, model-facing bytes do change: the rerun model will receive an engine catalog and, if it calls `get_turn_context`, blind context bytes that were absent in the contaminated originals. Those cells must replace—not coexist analytically with—the old observations under the same keys.

For the retained hard data:

- 24 clean rows remain byte-identical artifacts from commit `90484d45`.
- 3 timeout rows remain genuine timeout/refusal observations from `90484d45`; only independently recovered session provenance is added in the derived file.
- 3 infrastructure cells are rerun under the patched commit.
- All 30 brutal cells are rerun under the patched commit.

Thus the reconciled hard basis is comparable to the relaunched brutal basis under the owner’s ruling only with the code-identity split explicitly carried in provenance. The model-facing experiment contract and registered inputs remain the same, but the files cannot prove that the old 27 retained cells had the engine catalog ready before their first model activity; the missing old readiness timestamps leave that residual timing confound. It must be disclosed, not silently converted into evidence of equivalence.

VERDICT: patch now + structural follow-up  
TRIGGER: The engine catalog was absent when the model began, so its explicit tool search ended in a completed refusal with no delivered turn context; the placeholder then selected a blind planned-context fallback that illegally supplied DM-only `intel_mode` and crashed strict runtime validation.  
MODEL-FACING BYTES CHANGED BY PATCH: yes for the rerun infrastructure cells, because they will now receive the mandatory engine catalog and context that were absent; no for healthy cells, where the patch changes readiness timing and telemetry only.

ANALYSIS COMPLETE