## 1. Trigger

`rowTurnContext` has only four possible assignments before the failing check:

1. It starts as `{"granularity":"full","context_not_requested":true}`, which has no `dm_mode` property ([ai-dm-conversation.ts:2111](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2111), [ai-dm-conversation.ts:3771](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3771)).
2. It is pre-rendered for `final_indices`, but blind mode requires `mcp_minimal`, so that assignment is unreachable for a validated blind configuration ([ai-dm-conversation.ts:1093](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1093), [ai-dm-conversation.ts:3772](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3772)).
3. The in-process callback can replace it, but that callback exists only for `--cli local-openai`; this arm used `codex` ([ai-dm-conversation.ts:3834](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3834), [ai-dm-conversation.ts:3853](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3853)).
4. The external-client path reads the initial turn-context spool after dispatch and once again before row construction; an empty spool returns `null`, retaining the placeholder ([ai-dm-conversation.ts:2192](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2192), [ai-dm-conversation.ts:4728](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4728), [ai-dm-conversation.ts:5757](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5757)).

On the crashing cell, all three engine-output spools were zero bytes: turn context, blind intents, and proposals. Its ingress contains only startup, initial prompt, image metadata, and `tools_list`; there is no `turn_context` or engine `tool_result` after line 4 ([crash blind ingress:1](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-blind-ingress.jsonl:1), [crash blind ingress:4](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-blind-ingress.jsonl:4)). Line 4 nevertheless advertises both `engine.get_turn_context` and `engine.submit_blind_round_intents`.

The exact model behavior is recoverable from `codex-home-kb/thread_history_1.sqlite`:

- `thread_turns` records one completed turn lasting 42,832 ms.
- `thread_items` rollout ordinal 38 records a call to the generic Codex `list_mcp_resources`, not the advertised engine tool.
- Rollout ordinal 55 is the final answer: “Unable to retrieve the turn context: `engine.get_turn_context` is unavailable in the current tool environment.”

SQLite has no file-line coordinates; those table keys are the exact record locations. Thus this was a model/tool-routing failure: the model ignored the advertised engine tool, queried unrelated generic MCP resources, and finalized a refusal without making any engine call.

That completed/no-engine-activity behavior satisfies `flapped`; blind mode permits only one dispatch, so the code sets the would-be row to `service_null` immediately ([ai-dm-conversation.ts:4659](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4659), [ai-dm-conversation.ts:4765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4765), [ai-dm-conversation.ts:4772](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4772)). Because the spool remained empty, `rowTurnContext` remained the placeholder; `undefined !== 'blind'` selected the fallback ([ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).

The predecessor did the opposite: its ingress has three `turn_context`/tool-result pairs and one accepted submission ([predecessor blind ingress:5](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-blind-ingress.jsonl:5), [predecessor blind ingress:11](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-blind-ingress.jsonl:11)); all three turn-context spool records have `dm_mode:"blind"` ([predecessor turn context:1](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-turn-context.jsonl:1)).

This was not selected by:

- Zero intents alone: hard rows 4, 10, and 22 are `service_null` with zero blind attempts, but their stored contexts have `dm_mode:"blind"`, so they had retrieved context and then failed to submit ([hard rows:4](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:4), [hard rows:10](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:10), [hard rows:22](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:22)).
- `--blind-facts off`: `blindFacts` only configures rendering; the fallback predicate does not inspect it ([ai-dm-conversation.ts:3762](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3762), [ai-dm-conversation.ts:5807](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5807)).
- Rollover: each arena cell creates a separate one-round conversation ([ai-dm-arena.ts:775](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-arena.ts:775)); all 30 hard rows report `contextRolloverOccurred:false`.
- Fixture branching: the crash fixture has seven living monsters while the predecessor has two, but no assignment or fallback predicate branches on actor count ([crash fixture:1](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-fixture.json:1), [predecessor fixture:1](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-fixture.json:1)). Whether the larger fixture induced the model’s tool-routing mistake is unknowable from the files.

The preserved partial directory contains only 24 non-crashing brutal cells, the crash cell, and one leftover hard-seed directory; therefore two of the supervisor-reported 26 earlier brutal spools cannot be independently inspected. Every available non-crash brutal context record is `dm_mode:"blind"`.

## 2. Defect class

This is one missed conditional, enabled by a structurally untyped profile boundary.

The DM schema permits `intel_mode`, three option-selection fields, and `scope:"active_turn"|"round"` ([schemas.ts:1406](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1406)). The blind schema permits none of those and fixes `scope` to `"round"` ([schemas.ts:1459](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1459)). `plannedTurnContext` correctly selects the blind profile but still unconditionally adds the DM-only `intel_mode` field ([ai-dm-conversation.ts:2163](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2163), [ai-dm-conversation.ts:2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177)). The simulated-client implementation already has the missing conditional ([ai-dm-conversation.ts:2308](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2308)).

Every argument-building `get_turn_context` site under `tools/` and `src/vtt/`:

| Site | Classification |
|---|---|
| `plannedTurnContext` ([2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177)) | **Profile-wrong in blind** |
| Simulated MCP client ([2308](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2308)) | Correct for both profiles |
| Full delta-base renderer ([3045](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3045)) | DM-only; correct |
| In-process argument injection ([3132](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3132)) | Correct for its DM runtime, but initial `local-openai` selection is not guarded against blind mode ([3834](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3834)); latent blind integration mismatch |
| Engine current-turn resource callback ([engine-server.ts:3486](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3486)) | Common-subset arguments; correct for both |
| Blind fixture report ([blind-context-fixture-report.ts:61](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/blind-context-fixture-report.ts:61)) | Blind-correct |
| Turn-context cap sweep ([turn-context-cap-sweep.ts:118](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/turn-context-cap-sweep.ts:118)) | Explicit DM; correct |
| Renderer calibration, two calls ([renderer-calibration.ts:139](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/renderer-calibration.ts:139), [renderer-calibration.ts:157](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/renderer-calibration.ts:157)) | Full/DM; correct |
| Prose renderer report ([prose-renderer-report.ts:26](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/prose-renderer-report.ts:26)) | Full/DM; correct |
| Dry MCP client, four calls ([engine-mcp-dry-client.ts:160](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:160), [engine-mcp-dry-client.ts:223](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:223), [engine-mcp-dry-client.ts:229](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:229), [engine-mcp-dry-client.ts:247](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:247)) | Default full profile; correct |

The only other common tool is `engine.read_kb_subject`; its input/output schemas are equivalent between profiles, although the descriptions differ ([schemas.ts:1397](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1397), [schemas.ts:1470](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1470)). It has no host-side argument builder; arguments come from the caller.

Direct builders for profile-exclusive tools are correctly segregated:

- Blind submission is inside the blind branch ([ai-dm-conversation.ts:2340](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2340), [ai-dm-conversation.ts:2372](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2372)).
- Simulated speculative submission, plan adjustment, play expansion, round submission, and UI feedback are before or after an unconditional return from the blind branch, so they are unreachable in blind ([ai-dm-conversation.ts:2268](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2268), [ai-dm-conversation.ts:2380](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2380), [ai-dm-conversation.ts:2416](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2416), [ai-dm-conversation.ts:2451](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2451), [ai-dm-conversation.ts:2496](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2496), [ai-dm-conversation.ts:2509](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2509)).
- Structured-final plan/round submission uses an explicitly DM-profile in-process surface and `final_indices` is unavailable to blind ([ai-dm-conversation.ts:3109](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3109), [ai-dm-conversation.ts:3303](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3303)).
- The dry client’s path, validation, round submission, adjudication, and narration calls all use the default full server ([engine-mcp-dry-client.ts:181](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:181), [engine-mcp-dry-client.ts:188](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:188), [engine-mcp-dry-client.ts:197](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:197), [engine-mcp-dry-client.ts:204](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:204), [engine-mcp-dry-client.ts:214](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:214)).
- Engine-internal `query_path` and `get_state_summary` builders are reached only through DM-only query/resource routes; blind resources return before room-summary handling ([engine-server.ts:3067](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3067), [engine-server.ts:3492](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3492), [engine-server.ts:3591](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3591)).
- There are no host-side argument builders for the remaining exclusive tools; their arguments are model/client supplied.

Validation is not tool-surface-only. Direct calls validate at `EngineToolSurface.execute` ([engine-server.ts:3471](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3471)); JSON-RPC `tools/call` validates the same binding before execution ([handler.ts:369](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/handler.ts:369)). The crash used the direct surface and therefore threw instead of returning a tool error.

There is no compile-time guard: `EngineToolSurface.execute` accepts `name:string` and `argumentsValue:unknown`, while `EngineToolSpec` erases each Zod input to `ZodType<unknown>` ([engine-server.ts:363](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:363), [schemas.ts:1258](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1258)). A profile-indexed tool-name/argument map could make this call fail compilation.

## 3. Blast radius

Yes: the hard basis is behavior-conditioned. All 30 stored hard rows have `dm_mode:"blind"`, so none entered the fallback. Rows 4, 10, and 22 demonstrate that `service_null` itself is safe when the model fetched context first; if any hard turn had instead reproduced the crash cell’s “generic resource lookup, no engine call, final refusal” behavior, current code would have taken the same fallback and crashed ([hard rows:4](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:4), [ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).

The advice arm does not expose this particular mismatch. Its launcher selects the DM profile ([ai-dm-conversation.ts:2951](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2951)); `getPlannedInitialTurnContext` passes no blind configuration in advice mode ([ai-dm-conversation.ts:3762](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3762)); and the DM schema accepts `intel_mode` ([schemas.ts:1406](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1406)). I found no advice-reachable profile-mismatch crash among the enumerated builders.

A separate latent mismatch exists for `blind + local-openai`: the initial-session selection checks only the CLI and constructs a DM-profile surface that injects `intel_mode` ([ai-dm-conversation.ts:3834](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3834), [ai-dm-conversation.ts:3109](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3109), [ai-dm-conversation.ts:3132](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3132)). That does not affect the planned Codex advice arm, but it reinforces the need for a typed follow-up.

## 4. Patch vs rethink

### Minimal patch

One production-line change in `plannedTurnContext`:

```diff
-    intel_mode: intelMode,
+    ...(blind === undefined ? { intel_mode: intelMode } : {}),
```

at [ai-dm-conversation.ts:2181](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2181). This matches the already-correct simulated client at [ai-dm-conversation.ts:2312](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2312).

The regression should run an actual conversation fallback through the blind surface, not merely validate the schema:

- Add a test beside the blind source-binding tests, reusing `FakeBlindSnapshotService` ([blind-context-source-binding.test.ts:149](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tests/unit/vtt/blind-context-source-binding.test.ts:149)).
- Run one dry blind round with `flapPrimaryByRequest: {'room-1-round-1': 1}`. The simulated adapter then returns a completed turn before making any MCP call ([ai-dm-conversation.ts:2626](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2626)).
- Assert `outcome === "service_null"`, zero blind attempts, parsed `rawTurnContext.dm_mode === "blind"`, and populated `creatureFactsEvidence`/`legalMovementEvidence`. Current HEAD throws before those assertions; the patch makes them pass.

### Structural follow-up

Export separately typed DM/blind input schemas and types, then make the tool surface profile-indexed:

```ts
interface EngineToolSurface<Profile extends EngineMcpToolProfile> {
  execute<Name extends ToolName<Profile>>(
    name: Name,
    args: ToolArguments<Profile, Name>,
  ): ToolResult<Profile, Name>;
}
```

Use one `getTurnContextArguments(profile, input)` builder at all 14 host-built call sites. This is a moderate refactor across `schemas.ts`, `engine-server.ts`, `entrypoint.ts`, the conversation tool, and utility callers. If existing JSON schemas remain unchanged, it changes no model-facing bytes.

Do not make blind accept-and-ignore `intel_mode`: that changes the advertised blind schema bytes and weakens the closed-profile contract. Do not remove the fallback: blind row construction immediately requires `creature_facts` and `legal_movement`, so the placeholder cannot produce a valid row ([ai-dm-conversation.ts:5943](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5943)).

Recommendation: **patch now + structural follow-up**. Patch-only leaves compile-time recurrence risk and the latent blind/local-openai mismatch. A full rethink is disproportionate: the engine-authority and profile separation are functioning; the failure is at one untyped host-call boundary.

## 5. Arm integrity

For cells that do not enter the fallback, the patch changes nothing: the modified expression is evaluated only inside `plannedTurnContext`, and those cells already use their spooled blind context at [ai-dm-conversation.ts:5757](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5757).

Even for a fallback cell, no model-facing byte changes. The model invocation and return finish at [ai-dm-conversation.ts:4666](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4666) and [ai-dm-conversation.ts:4725](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4725); fallback reconstruction occurs later at line 5815. Its context is not used to construct or resume a prompt.

The fallback result is used for:

- `blindRendererEvidence` and its row metrics ([ai-dm-conversation.ts:5818](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5818), [ai-dm-conversation.ts:2080](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2080)).
- Blind creature/movement/semantic evidence ([ai-dm-conversation.ts:5943](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5943)).
- `rawTurnContext` and `turnContextGranularity` ([ai-dm-conversation.ts:6084](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6084)).

It does **not** update `roundTotals.contextBytes`: that value is calculated before the fallback ([ai-dm-conversation.ts:5789](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5789), [ai-dm-conversation.ts:6150](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6150)). For this zero-spool cell it would remain the 51-byte synthetic `context_not_requested` marker, while `rawTurnContext` would contain reconstructed blind telemetry. That ordering should be documented or clarified during the structural follow-up; it does not contaminate the model input.

The context handler only renders a projection in this branch and does not submit or execute a turn ([engine-server.ts:2356](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:2356)). `serviceNull` also skips coordination and initiative execution ([ai-dm-conversation.ts:4782](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4782), [ai-dm-conversation.ts:5363](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5363)). Therefore the patch changes neither engine state nor existing row fields for non-fallback cells, and the 30 hard rows remain code-comparable to a relaunched brutal basis.

Verification was read-only. HEAD/branch check returned `90484d45` / `claude/blind-dm`. Spool scan found 30 hard rows, including 3 `service_null`; all 30 had blind contexts. The preserved partial tree contained 24 completed brutal directories with non-empty blind contexts, one zero-byte crash directory, and one hard-seed directory. No Vitest, TypeScript, Vite, Playwright, npm script, build, model, or reviewer command was run because of the quiet-box rule.

```text
VERDICT: patch now + structural follow-up
TRIGGER: The model misrouted to generic list_mcp_resources and finalized that the advertised engine tool was unavailable, leaving the turn-context spool empty so the blind telemetry fallback exercised its unconditional DM-only intel_mode argument.
MODEL-FACING BYTES CHANGED BY PATCH: no — fallback reconstruction runs only after the model turn has completed, and unchanged cells never execute it.
```

ANALYSIS COMPLETE
tokens used
250,407
## 1. Trigger

`rowTurnContext` has only four possible assignments before the failing check:

1. It starts as `{"granularity":"full","context_not_requested":true}`, which has no `dm_mode` property ([ai-dm-conversation.ts:2111](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2111), [ai-dm-conversation.ts:3771](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3771)).
2. It is pre-rendered for `final_indices`, but blind mode requires `mcp_minimal`, so that assignment is unreachable for a validated blind configuration ([ai-dm-conversation.ts:1093](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:1093), [ai-dm-conversation.ts:3772](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3772)).
3. The in-process callback can replace it, but that callback exists only for `--cli local-openai`; this arm used `codex` ([ai-dm-conversation.ts:3834](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3834), [ai-dm-conversation.ts:3853](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3853)).
4. The external-client path reads the initial turn-context spool after dispatch and once again before row construction; an empty spool returns `null`, retaining the placeholder ([ai-dm-conversation.ts:2192](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2192), [ai-dm-conversation.ts:4728](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4728), [ai-dm-conversation.ts:5757](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5757)).

On the crashing cell, all three engine-output spools were zero bytes: turn context, blind intents, and proposals. Its ingress contains only startup, initial prompt, image metadata, and `tools_list`; there is no `turn_context` or engine `tool_result` after line 4 ([crash blind ingress:1](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-blind-ingress.jsonl:1), [crash blind ingress:4](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-blind-ingress.jsonl:4)). Line 4 nevertheless advertises both `engine.get_turn_context` and `engine.submit_blind_round_intents`.

The exact model behavior is recoverable from `codex-home-kb/thread_history_1.sqlite`:

- `thread_turns` records one completed turn lasting 42,832 ms.
- `thread_items` rollout ordinal 38 records a call to the generic Codex `list_mcp_resources`, not the advertised engine tool.
- Rollout ordinal 55 is the final answer: “Unable to retrieve the turn context: `engine.get_turn_context` is unavailable in the current tool environment.”

SQLite has no file-line coordinates; those table keys are the exact record locations. Thus this was a model/tool-routing failure: the model ignored the advertised engine tool, queried unrelated generic MCP resources, and finalized a refusal without making any engine call.

That completed/no-engine-activity behavior satisfies `flapped`; blind mode permits only one dispatch, so the code sets the would-be row to `service_null` immediately ([ai-dm-conversation.ts:4659](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4659), [ai-dm-conversation.ts:4765](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4765), [ai-dm-conversation.ts:4772](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4772)). Because the spool remained empty, `rowTurnContext` remained the placeholder; `undefined !== 'blind'` selected the fallback ([ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).

The predecessor did the opposite: its ingress has three `turn_context`/tool-result pairs and one accepted submission ([predecessor blind ingress:5](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-blind-ingress.jsonl:5), [predecessor blind ingress:11](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-blind-ingress.jsonl:11)); all three turn-context spool records have `dm_mode:"blind"` ([predecessor turn context:1](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-turn-context.jsonl:1)).

This was not selected by:

- Zero intents alone: hard rows 4, 10, and 22 are `service_null` with zero blind attempts, but their stored contexts have `dm_mode:"blind"`, so they had retrieved context and then failed to submit ([hard rows:4](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:4), [hard rows:10](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:10), [hard rows:22](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:22)).
- `--blind-facts off`: `blindFacts` only configures rendering; the fallback predicate does not inspect it ([ai-dm-conversation.ts:3762](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3762), [ai-dm-conversation.ts:5807](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5807)).
- Rollover: each arena cell creates a separate one-round conversation ([ai-dm-arena.ts:775](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-arena.ts:775)); all 30 hard rows report `contextRolloverOccurred:false`.
- Fixture branching: the crash fixture has seven living monsters while the predecessor has two, but no assignment or fallback predicate branches on actor count ([crash fixture:1](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-bRF0Cr/room-1-round-1-initial-fixture.json:1), [predecessor fixture:1](/home/vagrant/dnd-slim-runs/d569-v5/crash-brutal-cell27/dnd-ai-dm-conversation-hje4JF/room-1-round-1-initial-fixture.json:1)). Whether the larger fixture induced the model’s tool-routing mistake is unknowable from the files.

The preserved partial directory contains only 24 non-crashing brutal cells, the crash cell, and one leftover hard-seed directory; therefore two of the supervisor-reported 26 earlier brutal spools cannot be independently inspected. Every available non-crash brutal context record is `dm_mode:"blind"`.

## 2. Defect class

This is one missed conditional, enabled by a structurally untyped profile boundary.

The DM schema permits `intel_mode`, three option-selection fields, and `scope:"active_turn"|"round"` ([schemas.ts:1406](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1406)). The blind schema permits none of those and fixes `scope` to `"round"` ([schemas.ts:1459](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1459)). `plannedTurnContext` correctly selects the blind profile but still unconditionally adds the DM-only `intel_mode` field ([ai-dm-conversation.ts:2163](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2163), [ai-dm-conversation.ts:2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177)). The simulated-client implementation already has the missing conditional ([ai-dm-conversation.ts:2308](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2308)).

Every argument-building `get_turn_context` site under `tools/` and `src/vtt/`:

| Site | Classification |
|---|---|
| `plannedTurnContext` ([2177](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2177)) | **Profile-wrong in blind** |
| Simulated MCP client ([2308](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2308)) | Correct for both profiles |
| Full delta-base renderer ([3045](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3045)) | DM-only; correct |
| In-process argument injection ([3132](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3132)) | Correct for its DM runtime, but initial `local-openai` selection is not guarded against blind mode ([3834](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3834)); latent blind integration mismatch |
| Engine current-turn resource callback ([engine-server.ts:3486](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3486)) | Common-subset arguments; correct for both |
| Blind fixture report ([blind-context-fixture-report.ts:61](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/blind-context-fixture-report.ts:61)) | Blind-correct |
| Turn-context cap sweep ([turn-context-cap-sweep.ts:118](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/turn-context-cap-sweep.ts:118)) | Explicit DM; correct |
| Renderer calibration, two calls ([renderer-calibration.ts:139](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/renderer-calibration.ts:139), [renderer-calibration.ts:157](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/renderer-calibration.ts:157)) | Full/DM; correct |
| Prose renderer report ([prose-renderer-report.ts:26](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/prose-renderer-report.ts:26)) | Full/DM; correct |
| Dry MCP client, four calls ([engine-mcp-dry-client.ts:160](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:160), [engine-mcp-dry-client.ts:223](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:223), [engine-mcp-dry-client.ts:229](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:229), [engine-mcp-dry-client.ts:247](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:247)) | Default full profile; correct |

The only other common tool is `engine.read_kb_subject`; its input/output schemas are equivalent between profiles, although the descriptions differ ([schemas.ts:1397](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1397), [schemas.ts:1470](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1470)). It has no host-side argument builder; arguments come from the caller.

Direct builders for profile-exclusive tools are correctly segregated:

- Blind submission is inside the blind branch ([ai-dm-conversation.ts:2340](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2340), [ai-dm-conversation.ts:2372](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2372)).
- Simulated speculative submission, plan adjustment, play expansion, round submission, and UI feedback are before or after an unconditional return from the blind branch, so they are unreachable in blind ([ai-dm-conversation.ts:2268](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2268), [ai-dm-conversation.ts:2380](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2380), [ai-dm-conversation.ts:2416](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2416), [ai-dm-conversation.ts:2451](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2451), [ai-dm-conversation.ts:2496](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2496), [ai-dm-conversation.ts:2509](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2509)).
- Structured-final plan/round submission uses an explicitly DM-profile in-process surface and `final_indices` is unavailable to blind ([ai-dm-conversation.ts:3109](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3109), [ai-dm-conversation.ts:3303](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3303)).
- The dry client’s path, validation, round submission, adjudication, and narration calls all use the default full server ([engine-mcp-dry-client.ts:181](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:181), [engine-mcp-dry-client.ts:188](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:188), [engine-mcp-dry-client.ts:197](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:197), [engine-mcp-dry-client.ts:204](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:204), [engine-mcp-dry-client.ts:214](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/engine-mcp-dry-client.ts:214)).
- Engine-internal `query_path` and `get_state_summary` builders are reached only through DM-only query/resource routes; blind resources return before room-summary handling ([engine-server.ts:3067](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3067), [engine-server.ts:3492](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3492), [engine-server.ts:3591](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3591)).
- There are no host-side argument builders for the remaining exclusive tools; their arguments are model/client supplied.

Validation is not tool-surface-only. Direct calls validate at `EngineToolSurface.execute` ([engine-server.ts:3471](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:3471)); JSON-RPC `tools/call` validates the same binding before execution ([handler.ts:369](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/handler.ts:369)). The crash used the direct surface and therefore threw instead of returning a tool error.

There is no compile-time guard: `EngineToolSurface.execute` accepts `name:string` and `argumentsValue:unknown`, while `EngineToolSpec` erases each Zod input to `ZodType<unknown>` ([engine-server.ts:363](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:363), [schemas.ts:1258](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1258)). A profile-indexed tool-name/argument map could make this call fail compilation.

## 3. Blast radius

Yes: the hard basis is behavior-conditioned. All 30 stored hard rows have `dm_mode:"blind"`, so none entered the fallback. Rows 4, 10, and 22 demonstrate that `service_null` itself is safe when the model fetched context first; if any hard turn had instead reproduced the crash cell’s “generic resource lookup, no engine call, final refusal” behavior, current code would have taken the same fallback and crashed ([hard rows:4](/home/vagrant/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary-hard.raw.jsonl:4), [ai-dm-conversation.ts:5815](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5815)).

The advice arm does not expose this particular mismatch. Its launcher selects the DM profile ([ai-dm-conversation.ts:2951](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2951)); `getPlannedInitialTurnContext` passes no blind configuration in advice mode ([ai-dm-conversation.ts:3762](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3762)); and the DM schema accepts `intel_mode` ([schemas.ts:1406](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/schemas.ts:1406)). I found no advice-reachable profile-mismatch crash among the enumerated builders.

A separate latent mismatch exists for `blind + local-openai`: the initial-session selection checks only the CLI and constructs a DM-profile surface that injects `intel_mode` ([ai-dm-conversation.ts:3834](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3834), [ai-dm-conversation.ts:3109](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3109), [ai-dm-conversation.ts:3132](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:3132)). That does not affect the planned Codex advice arm, but it reinforces the need for a typed follow-up.

## 4. Patch vs rethink

### Minimal patch

One production-line change in `plannedTurnContext`:

```diff
-    intel_mode: intelMode,
+    ...(blind === undefined ? { intel_mode: intelMode } : {}),
```

at [ai-dm-conversation.ts:2181](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2181). This matches the already-correct simulated client at [ai-dm-conversation.ts:2312](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2312).

The regression should run an actual conversation fallback through the blind surface, not merely validate the schema:

- Add a test beside the blind source-binding tests, reusing `FakeBlindSnapshotService` ([blind-context-source-binding.test.ts:149](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tests/unit/vtt/blind-context-source-binding.test.ts:149)).
- Run one dry blind round with `flapPrimaryByRequest: {'room-1-round-1': 1}`. The simulated adapter then returns a completed turn before making any MCP call ([ai-dm-conversation.ts:2626](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2626)).
- Assert `outcome === "service_null"`, zero blind attempts, parsed `rawTurnContext.dm_mode === "blind"`, and populated `creatureFactsEvidence`/`legalMovementEvidence`. Current HEAD throws before those assertions; the patch makes them pass.

### Structural follow-up

Export separately typed DM/blind input schemas and types, then make the tool surface profile-indexed:

```ts
interface EngineToolSurface<Profile extends EngineMcpToolProfile> {
  execute<Name extends ToolName<Profile>>(
    name: Name,
    args: ToolArguments<Profile, Name>,
  ): ToolResult<Profile, Name>;
}
```

Use one `getTurnContextArguments(profile, input)` builder at all 14 host-built call sites. This is a moderate refactor across `schemas.ts`, `engine-server.ts`, `entrypoint.ts`, the conversation tool, and utility callers. If existing JSON schemas remain unchanged, it changes no model-facing bytes.

Do not make blind accept-and-ignore `intel_mode`: that changes the advertised blind schema bytes and weakens the closed-profile contract. Do not remove the fallback: blind row construction immediately requires `creature_facts` and `legal_movement`, so the placeholder cannot produce a valid row ([ai-dm-conversation.ts:5943](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5943)).

Recommendation: **patch now + structural follow-up**. Patch-only leaves compile-time recurrence risk and the latent blind/local-openai mismatch. A full rethink is disproportionate: the engine-authority and profile separation are functioning; the failure is at one untyped host-call boundary.

## 5. Arm integrity

For cells that do not enter the fallback, the patch changes nothing: the modified expression is evaluated only inside `plannedTurnContext`, and those cells already use their spooled blind context at [ai-dm-conversation.ts:5757](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5757).

Even for a fallback cell, no model-facing byte changes. The model invocation and return finish at [ai-dm-conversation.ts:4666](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4666) and [ai-dm-conversation.ts:4725](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4725); fallback reconstruction occurs later at line 5815. Its context is not used to construct or resume a prompt.

The fallback result is used for:

- `blindRendererEvidence` and its row metrics ([ai-dm-conversation.ts:5818](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5818), [ai-dm-conversation.ts:2080](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:2080)).
- Blind creature/movement/semantic evidence ([ai-dm-conversation.ts:5943](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5943)).
- `rawTurnContext` and `turnContextGranularity` ([ai-dm-conversation.ts:6084](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6084)).

It does **not** update `roundTotals.contextBytes`: that value is calculated before the fallback ([ai-dm-conversation.ts:5789](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5789), [ai-dm-conversation.ts:6150](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:6150)). For this zero-spool cell it would remain the 51-byte synthetic `context_not_requested` marker, while `rawTurnContext` would contain reconstructed blind telemetry. That ordering should be documented or clarified during the structural follow-up; it does not contaminate the model input.

The context handler only renders a projection in this branch and does not submit or execute a turn ([engine-server.ts:2356](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/src/vtt/mcp/engine-server.ts:2356)). `serviceNull` also skips coordination and initiative execution ([ai-dm-conversation.ts:4782](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:4782), [ai-dm-conversation.ts:5363](/home/vagrant/PhpstormProjects/dnd-wt-blind-dm/tools/ai-dm-conversation.ts:5363)). Therefore the patch changes neither engine state nor existing row fields for non-fallback cells, and the 30 hard rows remain code-comparable to a relaunched brutal basis.

Verification was read-only. HEAD/branch check returned `90484d45` / `claude/blind-dm`. Spool scan found 30 hard rows, including 3 `service_null`; all 30 had blind contexts. The preserved partial tree contained 24 completed brutal directories with non-empty blind contexts, one zero-byte crash directory, and one hard-seed directory. No Vitest, TypeScript, Vite, Playwright, npm script, build, model, or reviewer command was run because of the quiet-box rule.

```text
VERDICT: patch now + structural follow-up
TRIGGER: The model misrouted to generic list_mcp_resources and finalized that the advertised engine tool was unavailable, leaving the turn-context spool empty so the blind telemetry fallback exercised its unconditional DM-only intel_mode argument.
MODEL-FACING BYTES CHANGED BY PATCH: no — fallback reconstruction runs only after the model turn has completed, and unchanged cells never execute it.
```

ANALYSIS COMPLETE
lane exit:0
