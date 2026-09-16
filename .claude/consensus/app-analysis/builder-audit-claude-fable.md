# BUILDER-AUDIT-01 — Claude lane (Fable 5.1) report

Lane: claude -p --model claude-fable-5-1, read-only clone at 40f04e2c, exit 0, finished 17:04. Brief: /tmp/claude-1000/-home-vagrant-PhpstormProjects-dnd-multiclass-spells-static/c68ffdd0-2e80-4e32-84af-ce3901665155/scratchpad/builder-audit/claude-lane/brief.md. Supervisor spot-verification in loop-log.md.

# BUILDER-AUDIT-01 — Claude lane: "things that should be an import"

Reviewer: Claude Fable 5.1, independent of astra. Clone `../repo` at `40f04e2c` (VERIFIED: `git log --oneline -1`). Read-only; no build/tsc/vitest run. Paths below are relative to `repo/`. Every site count comes from a pasted command. Labels: **VERIFIED** = I ran the command or read the lines; **RECALLED** = inference (scenario, ranking, fix shape, size).

## 0 What I scanned (VERIFIED — all commands run from `repo/`)

```text
rg -n -e 'function (canonical|stable|sorted)[A-Za-z]*(Json|JSON|Stringify|Keys)' -e 'function deepFreeze' -e 'function sha256' -e 'function digest[A-Z]' src tools scripts
for f in $(rg -l 'function deepFreeze' src tools); do awk '/function deepFreeze/{p=1} p{print} p&&/^}/{exit}' $f | md5sum; done | sort | uniq -c   # 25 copies, 4 bodies
rg -o "'(gpt-[0-9][a-z0-9.\-]*|claude-[a-z0-9.\-]+)'" src tools scripts | ... | sort | uniq -c      # model ids by literal and by file
rg -o "'[a-z][a-z0-9\-]*-v[0-9]+'" src tools scripts | ... | awk 'files>1'                         # format/version tags used in >1 file (27 tags)
rg -o "'[a-z][a-z0-9\-]*:[a-z][a-z0-9\-:.]*'" src tools scripts | ... | awk 'files>1'                # colon ids (combatant:, statblock:, encounter:)
rg -n '\b(4173|5173|8787|8788|3000|8080|4174|5174)\b' src tools scripts tests playwright.config.ts vite.config.ts
rg -o '\b\w*(timeout|Timeout|wall|Wall|Budget)\w*\s*[:=]\s*[0-9][0-9_]*' src tools scripts | ... | awk 'files>1'
rg -o '\b\w*[sS]eed\w*\s*[:=]\s*[0-9][0-9_]*' src tools scripts | ... | awk 'files>1'
rg -n '^(export )?const \w+ = new [A-Z]\w*\(' src tools ; rg -n '^(export )?const \w+ = (create|make|build|default)[A-Z]\w*\(' src tools   # module singletons
rg -o '\b\w+(\?: [^=]+)? = (create|make|build|default|new )[A-Za-z]*\(' src tools ; rg -o '= (DEFAULT_[A-Z_]+)\b' src tools ; rg -c '\?\? \{\}' src tools
node /tmp/objsig.mjs   # brace-depth parser over 831 src/tools files: object-literal key-set signatures (>=3 keys) recreated in >=3 files; top 70 reviewed by hand
rg -o "process\.env\.([A-Z][A-Z0-9_]+)|env\[?'([A-Z][A-Z0-9_]+)'" src tools tests scripts *.ts | ... | awk 'files>=3'
rg -o "'(reports|handoff|\.claude|fixtures|content|docs|art|public|dist|tests|tools|src)/[A-Za-z0-9_./\-]+'" src tools scripts tests | ... | awk 'files>=3'
for h in isRecord isObject positiveInteger nonNegativeInteger safeInteger hexadecimal argumentValue ...; do rg -l "^(export )?function $h\b" src tools | wc -l; done
for lit in engine-mcp-launcher-v1 initiative-intel-v1 gpt-5.6-terra gpt-5.6-sol mulberry32-v1 arena-row-v3 encounter:ai-dm-conversation ...; do rg -l "'$lit'" tests | wc -l; done
comm -12 <(rg -o "values\.get\('--[a-z\-]+'\)" tools/ai-dm-conversation.ts | sort -u) <(same for tools/ai-dm-arena.ts)   # 30 shared CLI flags
comm -12 <(schema const names in tools/ai-dm-conversation-row-codec.ts) <(same in tools/ai-dm-rerun-packet.ts) + normalized awk/diff per schema
```
`sg run -p 'function $F($$$A, $P: $T = $D($$$), $$$B) {...}'` matched nothing (pattern too strict); the rg fallback above is what the (c) claims rest on. ast-grep 0.40.5 was otherwise not needed.

## 1 PART 1 — top findings, ranked by drift risk × copies

### F1 (HIGH — drift ALREADY REALISED). Intel policy version tags are declared twice: once in `src/vtt/intel/*`, once in `src/vtt/mcp/schemas.ts`
**VERIFIED** (`rg -n "'actor-knowledge-v[0-9]|intelPolicyVersion\('actor-knowledge" src tools`; `sed -n 36,46p src/vtt/mcp/schemas.ts`; `rg -n 'ENGINE_ACTOR_KNOWLEDGE_POLICY|\bACTOR_KNOWLEDGE_POLICY\b' src tools`):
```text
src/vtt/intel/actor-knowledge.ts:30:export const ACTOR_KNOWLEDGE_POLICY = intelPolicyVersion('actor-knowledge-last-seen-v4');
src/vtt/mcp/schemas.ts:39:export const ENGINE_ACTOR_KNOWLEDGE_POLICY = 'actor-knowledge-v3-last-seen' as const;
src/vtt/mcp/schemas.ts:40:export const ENGINE_LEGENDARY_WINDOWS_POLICY = 'legendary-windows-v2' as const;      // intel/legendary-windows.ts:22 intelPolicyVersion('legendary-windows-v2')
src/vtt/mcp/schemas.ts:41:export const ENGINE_REACTION_SPEND_HOLD_POLICY = 'reaction-spend-hold-v1' as const;  // intel/reaction-spend-hold.ts:16
src/vtt/mcp/schemas.ts:42:export const ENGINE_RECOVERY_CAPABILITY_POLICY = 'recovery-capability-v2' as const; // intel/recovery-capability.ts:15
src/vtt/mcp/engine-server.ts:1956,2080,2207,2607: policy: ENGINE_ACTOR_KNOWLEDGE_POLICY   (v3 producer)
src/vtt/intel/actor-knowledge.ts:294,302: policy: ACTOR_KNOWLEDGE_POLICY                    (v4 producer)
tools/ai-dm-conversation.ts:2141-2144: manifest records ACTOR_KNOWLEDGE_POLICY (v4) + the three intel/* constants
src/vtt/mcp/schemas.ts:477,999: z.literal(ENGINE_ACTOR_KNOWLEDGE_POLICY)   (v3 validator)
```
`schemas.ts:7` already imports `ENGINE_INITIATIVE_PROJECTION_POLICY` from the capsule, so the import pattern exists in the same file; the other four tags were simply retyped. Nothing ties the pairs together (no test greps both; `tests/unit/combat/creature-space.test.ts:395` regex-reads only the schemas.ts copy).
**RECALLED scenario:** actor-knowledge is the proof: the MCP engine context validates and emits `v3` while the intel module and the conversation manifest say `v4`. A rerun packet reconciling a conversation manifest against an MCP capture sees two versions of one policy; the next bump of `LEGENDARY_WINDOWS_POLICY` to v3 makes every MCP context payload fail `z.literal('legendary-windows-v2')`. **Home:** the `intel/*` modules (they already export branded constants); `schemas.ts` and `engine-server.ts` import them. **Size:** 2 files + a decision on v3/v4 (≈3 files).

### F2 (HIGH). `'initiative-intel-v1'` has a canonical constant but 4 files retype it, and the MCP entrypoint hand-builds the projection shape
**VERIFIED** (`rg -n "'initiative-intel-v1'" src tools`; `sed -n 519,534p src/vtt/mcp/entrypoint.ts`; `sed -n 5,16p src/vtt/engine-initiative-intel.ts`):
```text
src/vtt/engine-state-capsule.ts:43:export const ENGINE_INITIATIVE_PROJECTION_POLICY = 'initiative-intel-v1' as const;   (used at :46,:586,:685)
src/vtt/engine-initiative-intel.ts:11:    policy: 'initiative-intel-v1',           <- the producer itself retypes it
src/vtt/mcp/entrypoint.ts:522:        policy: 'initiative-intel-v1',           <- options.initiativeProjection ?? { policy, timeline:{phase,round,currentCombatant:null,initiative:[],upcoming:[],roundBoundaries:[],branchPoints:[]} }
src/vtt/mcp/entrypoint.ts:991:      return candidate['policy'] === 'initiative-intel-v1' &&
tools/ai-dm-conversation-row-codec.ts:4:const STANDARD_INITIATIVE_POLICY = 'initiative-intel-v1';
tools/ai-dm-rerun-packet.ts:39:const STANDARD_INITIATIVE_POLICY = 'initiative-intel-v1';
tests: 6 files / 8 sites retype the literal (rg -l "'initiative-intel-v1'" tests | wc -l)
```
**RECALLED scenario:** bump the capsule constant to v2: the capsule decoder (`:586`) rejects projections the producer (`engine-initiative-intel.ts:11`) still stamps v1; the entrypoint's `?? {...}` default silently keeps producing v1 with an empty timeline. **Home:** `engine-initiative-intel.ts` exports the constant and an `emptyEngineInitiativeProjection(state)`; capsule/entrypoint/tools import. **Size:** 5 files (+6 test files optional).

### F3 (HIGH — drift ALREADY REALISED). 19 zod arena-row schemas are duplicated between `tools/ai-dm-conversation-row-codec.ts` and `tools/ai-dm-rerun-packet.ts`
**VERIFIED** (schema-name comm + normalized diff, commands in §0; `sed -n 8,15p tools/ai-dm-rerun-packet.ts`):
```text
row-codec schemas: 19, rerun-packet schemas: 23, same-named: 19
IDENTICAL (modulo comments): 17 of 19 incl. engineIntelSchema, commonArenaRowSchema, plannerSchema, boardImageSchema, safeIntegerSchema ...
DIFFERS: postShiftCommonArenaRowSchema — row-codec stops at `rationale`; rerun-packet adds ~40 typed blind-mode fields
         (dmMode, blindFacts, blindAttempts[].strict(), blindIngressAudit.strict(), turnContextBudget.strict(), ...)
tools/ai-dm-rerun-packet.ts:8-14 imports { ArenaRowDecodeError, conversationRowCodec, ... } from './ai-dm-conversation-row-codec'  (yet keeps private copies)
importers of row-codec: tools/ai-dm-rerun-packet.ts + 2 tests only; tools/ai-dm-conversation.ts does not import it
```
**RECALLED scenario:** the "shared" codec is `.passthrough()` everywhere, so a blind row with a malformed `blindIngressAudit` passes `conversationRowCodec` and is rejected (or not) only by whichever tool re-declared the stricter copy; `validate-first-arm.ts:109,307` retypes `'arena-row-v3'` a third time. **Home:** row-codec owns all schemas and exports the post-shift blind extension; rerun-packet deletes its copies. **Size:** 2 files (+`tools/d569-v5/validate-first-arm.ts` for the version tag).

### F4 (HIGH). The arena tool re-parses the conversation CLI: 30 shared flags with identical `??` defaults
**VERIFIED** (comm of `values.get('--x')` sets; `rg -n "values.get\('--model'\)|roundWallMs|'sonnet'|selectedCli === 'codex'" tools/ai-dm-conversation.ts tools/ai-dm-arena.ts`; function spans via awk):
```text
30 shared flags: --blind-facts --blind-max-attempts --blind-repair-arm --board-image --cli --cli-bin --combat-model --dm-mode --effort ... --timeout-ms --transport --turn-context-max-bytes
tools/ai-dm-conversation.ts:1226 | tools/ai-dm-arena.ts:664:  model: localOpenAi?.model ?? values.get('--model') ?? (selectedCli === 'codex' ? 'gpt-5.6-sol' : 'sonnet'),
tools/ai-dm-conversation.ts:1233 | tools/ai-dm-arena.ts:671:  cliBin: values.get('--cli-bin') ?? (selectedCli === 'codex' ? 'codex' : selectedCli === 'claude-code' ? 'claude' : ''),
conversation:1092 / arena:377   const effort = values.get('--effort') ?? 'medium';      conversation:1105 / arena:373  const cli = values.get('--cli') ?? 'codex';
conversation:1235 roundWallMs: 180_000  | arena:96 readonly roundWallMs: 180000; arena:425 if (roundWallMs !== 180_000) throw; arena:682 experimentPolicy: { roundWallMs: 180_000 }
tools/agent-conformance.ts:75-78: codex: 'gpt-5.6-sol', 'claude-code': 'sonnet'   (third copy of the default-model table)
parseArenaArgs = tools/ai-dm-arena.ts:309-686 (378 lines); parseConversationArgs = tools/ai-dm-conversation.ts:1055-1245 (191 lines); arena imports 20 names from conversation but not the parser
```
Astra's #10 lists only the model fallback (4 sites). **RECALLED scenario:** change the codex default model or the 180 s wall in the conversation tool; arena runs (the experiment producer) keep the old value, and the arena row's `experimentPolicy.roundWallMs` no longer matches what conversation actually enforced. **Home:** `parseConversationArgs` (or an extracted `conversation-cli-options.ts`) returns the shared config; arena parses only its extra arm flags on top. **Size:** 3 files.

### F5 (MEDIUM-HIGH). The idle `PersistedCoordinatorState` literal is hand-built in 8 files (one already exported)
**VERIFIED** (`rg -n 'requestSequence: 1' src tools`; bodies via awk, all identical; type at `src/combat/coordinator.ts:76-82`):
```text
src/vtt/adventuring-day-session.ts:26  export const ADVENTURING_DAY_INITIAL_COORDINATOR_STATE  {requestSequence:1,pendingRequest:null,pendingCommand:null,continuation:{kind:'idle'},pause:null}
src/vtt/dm-encounter-host.ts:114  INITIAL_COORDINATOR_STATE      (identical)        src/vtt/scripted-skirmish.ts:47  INITIAL_COORDINATOR (identical)
src/vtt/handoff/fixtures/two-room.ts:19  IDLE (identical)                              tools/ai-dm-conversation.ts:263  INITIAL_COORDINATOR_STATE (identical)
tools/ai-dm-screenshot-probe.ts:2634  SEMANTIC_BOARD_COORDINATOR (identical)          tools/ai-dm-board-snapshot.ts:270  INTERRUPTED_COORDINATOR (pause:{kind:'interrupted'})
src/vtt/session-persistence.ts:1127 pacingCoordinatorState(): {...state, pendingRequest:null, pendingCommand:null, continuation:{kind:'idle'}}
```
**RECALLED scenario:** add a field to `PersistedCoordinatorState` with a non-trivial initial value: the typed constants fail to compile (good) but `pacingCoordinatorState` and any spread-built copies keep stale values; a `requestSequence` start of 1 vs 0 would desynchronise replay request links (`replay.ts:73`). **Home:** `src/combat/coordinator.ts` exports `INITIAL_COORDINATOR_STATE` (and `interruptedCoordinatorState()`); everyone imports. Adjacent to, but not part of, the queued TurnCoordinator assembly tranche (that tranche is about `CoordinatorOptions`/registry construction). **Size:** 8 files.

### F6 (MEDIUM). The reserved dev port `4173` is a policy retyped in 7 files
**VERIFIED** (`rg -n '\b4173\b' ...` plus `sed` on each):
```text
tools/serve.mjs:8: const DEFAULT_PORT = 4173;                          tests/browser/fixtures/worker-origin.ts:4: const DEFAULT_PORT = 4173;
tools/vtt-handoff/node-runtime-main.ts:27:  ... || port === 4_173) throw 'other than 4173'
tools/vtt-handoff/serve-existing-dist.mjs:119: ... || port === 4_173) throw 'Invalid non-4173 port'
tools/ai-dm-board-snapshot.ts:655: if (port === 4173) { await server.close(); throw 'Vite preview selected forbidden port 4173.' }
tools/vtt-handoff/gate-inventory.ts:592: if (gate.env.PLAYWRIGHT_PORT === '4173') errors.push('GATE_PORT_FORBIDDEN')
tests/browser/vtt-handoff/playwright.config.ts:12: ... || port === 4_173) throw 'must be a valid non-4173 port'
tests/unit/ai-bridge/guard.test.ts:10: const PORT = 4173;   tests/unit/vtt/handoff-report.test.ts:1488: PLAYWRIGHT_PORT: '4173' (negative test)
```
**RECALLED scenario:** move the dev server to 4174: the gate inventory and the runtime launcher still forbid 4173 and happily accept 4174, so the collision guard silently protects the wrong port. **Home:** one `RESERVED_DEV_SERVER_PORT` in `tools/vtt-handoff/paths.ts` (or a tiny `tools/ports.ts` importable from `.mjs`), with `isAllowedRuntimePort()`. **Size:** 7 files.

### F7 (MEDIUM). Exported wire-format constants exist, but a producer or validator retypes the literal
**VERIFIED** (per-tag `rg -n "'<tag>'" src tools` and usage greps of the constants):
| tag | constant (exported, unused at the site) | retyped at |
|---|---|---|
| `engine-mcp-launcher-v1` | `mcp/entrypoint.ts:318 ENGINE_MCP_LAUNCHER_FORMAT` (decoder compares at :946,:1038) | `tools/ai-dm-conversation.ts:3407` writes the manifest with the literal |
| `symmetric-pc-evaluator-v1` | `symmetric-pc-evaluator.ts:41 SYMMETRIC_PC_EVALUATOR_POLICY` | `scripted-party-round.ts:435` inside the `policyHash` input (no import of the constant in that file) |
| `blind-turn-context-v1` | `blind-turn-context.ts:32 BLIND_TURN_CONTEXT_VERSION` | `tools/ai-dm-conversation.ts:631,7294` (constant never imported in tools/) |
| `blind-model-ingress-v1` | `blind-model-ingress.ts:6 BLIND_INGRESS_AUDIT_VERSION` | `tools/ai-dm-rerun-packet.ts:370 z.literal(...)`, `:400` |
| `heldout-runtime-v1` | `tools/heldout-runtime-guard.ts:17` | `tools/heldout-runtime-guard-worker.mjs:7 const PROTOCOL` (mjs cannot import the .ts; needs a shared .mjs) |
| `heldout-ordinary-v1`/`-development-v1` | `room-generator.ts:59 HELDOUT_ORDINARY_PROTOCOLS` | `tools/generate-arena-basis.ts:315,445,573`, `tools/heldout-leak-check.ts:39,1562,1726,1783` |
| `mulberry32-v1` + snapshot shape | `combat/random.ts` (`mulberry32()` builds it) | `session-persistence.ts:1113-1119` hand-builds `{algorithm,initialSeed,state,draws,streamId}` because no `mulberry32(seed, streamId)` overload exists — astra #4 territory |
| `arena-row-v3` | none | `tools/ai-dm-conversation.ts:673,2423,7380`, `tools/ai-dm-rerun-packet.ts:335`, `tools/d569-v5/validate-first-arm.ts:109,307` |
| `engine-option-environment-v1`, `engine-offer-family-policy-v1`, `party-threat-catalog-v1` | none | `offers/offer-environment.ts` ×5/×3, `offers/party-threat-catalog.ts` ×5; tests retype (2 files) |
**RECALLED scenario (launcher):** bump `ENGINE_MCP_LAUNCHER_FORMAT` to v2: the entrypoint refuses every manifest the conversation tool writes, at run time, with no compile error. **Fix shape:** import the constant; for the offers tags, export `ENGINE_OPTION_ENVIRONMENT_FORMAT` etc. from the in-flight offers builder (see Part 2). **Size:** 1–2 files per row; 12 files total.

### F8 (MEDIUM). Small crypto/freeze helpers are copied instead of imported
**VERIFIED** (md5 grouping in §0; `sed -n 56,70p src/vtt/offers/offer-environment.ts`; `sed -n 160,175p src/vtt/offers/party-threat-catalog.ts`):
```text
deepFreeze: 25 copies / 4 bodies — 18 identical in src/sharing/wire-schemas/v1..v18, a second identical body in v19..v21, 3 identical in
            vtt/engine-state-capsule.ts:976, vtt/offers/offer-environment.ts:56, vtt/offers/party-threat-catalog.ts:170; the cycle-safe one is
            src/simulation/runtime-readonly-map.ts:40 (exported) — the 24 others are not cycle-safe (Object.values recursion)
digestBody(value) = sha256(canonicalJson(value)): offer-environment.ts:62 and party-threat-catalog.ts:166 (identical)
sha256 over node:crypto: 15 private one-liners — src/vtt/knowledge-base-contract.ts:151, src/vtt/mcp/knowledge-base.ts:48, and 13 tools files
            (ai-dm-legacy-oracle-capture, assets/emit-starter-art-hashes, d584-contract-inventory, d586-mutation-contract, heldout-runtime-guard,
            vtt-experiment, vtt-handoff/{art-stage,gate-inventory,publish,report,windows-probe}, ai-dm-board-snapshot sha256Bytes, d569-v5 sha256Text)
            while src/crypto/sha256.ts exports a string-only pure implementation.
```
**RECALLED scenario:** the offers digest helpers are the identity of the environment; two copies mean the family policy and threat catalog can drift to different canonicalisation (e.g. one adopts `canonicalUnorderedValue`) and their digests stop being comparable. **Home:** `src/vtt/offers/` shares one `digestBody`/`deepFreeze` (folds into the in-flight builder); `src/crypto/sha256.ts` gains a `sha256Bytes` node-side companion in `tools/` for the 15 wrappers. **Size:** offers 2 files; sha256 15 files (mechanical); wire-schemas 21 files (mechanical, low value).

### F9 (MEDIUM-LOW). Exact-keys checker copied 7×; `isRecord` copied 23× with 11 bodies, one of which admits arrays
**VERIFIED** (`sed` on each; md5 grouping):
```text
assert/exact-keys (Object.keys(value).sort() vs [...expected].sort()): src/backup/backup-version.ts:34, src/catalog/stored-authored-content-projector-v1.ts:766,
   src/worker/handlers/level-up-preview.ts:26, src/worker/handlers/queries.ts:62, src/grants/configured-choice-rule.ts:102, src/vtt/offers/offer-environment.ts:45,
   src/vtt/offers/party-threat-catalog.ts:58   (5 throw, 2 return boolean)
isRecord: 23 files, 11 body variants; shared export exists at src/worker/handler.ts:40. src/vtt/model.ts's copy is `typeof value === 'object' && value !== null` (arrays pass);
   src/grants/source-rule-reader.ts routes through isContainer; the other 21 exclude arrays.
```
**RECALLED scenario:** a decoder in `vtt/model.ts` accepts `[]` where every sibling decoder refuses it. **Home:** `src/worker/handler.ts` (already exported) or a `src/domain/guards.ts`. **Size:** 7 + 23 files, mechanical.

### F10 (MEDIUM-LOW). Challenge-basis seeds `5831001..5831004` retyped as a literal union in 2 signatures plus 2 CLI guards
**VERIFIED** (`rg -n -B3 -A1 '5_?831_?00[14]' src tools`):
```text
src/vtt/challenge-room-fixture.ts:238-243 ROOM_CORRESPONDENCE = { B:{seed:5831001}, C:{seed:5831002}, A:{seed:5831003}, D:{seed:5831004} }   <- natural home
src/vtt/challenge-room-fixture.ts:17   readonly seed: 5831001 | 5831002 | 5831003 | 5831004;
src/vtt/challenge-feasibility.ts:1533  loadFixtureText: (seed: 5831001 | 5831002 | 5831003) => ...;  :264 seed: 5831004;  :384 seed: 5_831_004 as const
tools/challenge-feasibility.ts:18      (seed: 5831001 | 5831002 | 5831003) => ...;  :40 argument(args,'--seed') !== '5831001';  :46 usage text
tools/ai-dm-arena.ts:640               if (seed !== 5_831_001) throw new TypeError('The challenge basis requires --seed 5831001.');
```
**RECALLED scenario:** re-seed room B; the arena guard and the feasibility CLI still demand the old seed and refuse the new fixture. **Home:** derive `ChallengeSeed = (typeof ROOM_CORRESPONDENCE)[keyof ...]['seed']` and `CHALLENGE_BASIS_SEED` from `challenge-room-fixture.ts`. **Size:** 3 files.

### 1.1 Everything else I saw (VERIFIED sites; RECALLED one-line verdict)
| value | sites (files) | verdict |
|---|---|---|
| `{round, revision, stateDigest: boardStateDigest(state)}` | tools/ai-dm-board-glyph-captures.ts:116, ai-dm-board-snapshot-check.ts:18, ai-dm-blind-board-snapshot-check.ts:23, ai-dm-screenshot-probe.ts:2628, ai-dm-conversation.ts:4418 (+ type mcp/entrypoint.ts:291) | small `boardSourceIdentity(state)` next to `boardStateDigest` (tools/ai-dm-board-snapshot.ts:201); 5 files |
| `ControllerAssignment` literal `{combatantId, controllerId:template, kind, generation:0}` | 8 sites: stored-character-encounter.ts:93, dm-encounter-host.ts:197, scripted-skirmish.ts:83, handoff/worker-entry.ts:73, tools/vtt-handoff/node-runtime.ts:83, tools/ai-dm-board-snapshot.ts:264, ai-dm-conversation.ts:6792, session-persistence.ts:1747; five different controllerId naming templates | belongs to the queued ControllerRegistry assembly tranche — not re-examined |
| `'gpt-5.6-terra'` | `dm-bridge/contracts.ts:98 DEFAULT_DM_MODEL` vs `src/vtt/scripted-skirmish.ts:57 modelId: 'gpt-5.6-terra'`; tests 5 files/12 sites | import the constant (1 file); astra #10 |
| `positiveInteger` | 14 files, 12 bodies; conversation/arena/rl-generate-data identical | shared `tools/cli-numbers.ts`; low risk |
| `canonicalValue` with `localeCompare` key sort | src/rules/srd-subclass-content.ts:190 vs `commands/canonical-json.ts` (code-point sort); only used self-consistently at :219/:255/:422 | fine as is unless its output is ever compared to `canonicalJson` output; `agent-session-digest.ts` correctly wraps `canonicalizeJson` |
| statblock ids `'statblock:*'` | roster.ts retypes `id:` beside the imported statblock (roster.ts:30 has both `id: 'statblock:goblin-warrior'` and `statblock: GOBLIN_WARRIOR`); kb/entries.ts retypes 40+ ids; no equality check found (`rg 'statblock\.id !==' roster.ts` → none) | use `GOBLIN_WARRIOR.id`; 2 files; low risk until a rename |
| two-room fixture paths | tools/vtt-handoff/report.ts:123-124, generate-fixtures.ts:7-8, publish.ts:31-32 (+4 tests) | one constant in tools/vtt-handoff/paths.ts; 3 files |
| agent CLI kinds | `src/vtt/agent-session.ts:115 AgentCliKind` + `:350 isAgentCliKind` vs `tools/agent-conformance.ts:19 AGENT_CLI_KINDS` list vs `tools/ai-dm-conversation.ts:251 CONVERSATION_CLIS` | derive the tools' lists from `agent-session.ts`; 2 files |
| `timeoutMs = 120_000` | tools/discord-launcher/dm-bridge-lib.mjs, tools/rl/generate-data.ts | coincidence; leave |
| `DEFAULT_DM_MODEL_CONFIG` param default | dm-bridge/client.ts, dm-bridge/decision-program.ts | both import the same constant; fine |
| `content-v1` scheme in SQL text | bundled-homebrew-installer.ts:187, bundled-content-digest-v1.ts:431, spells-srd.ts:840 vs `content-identity.ts:76` default | bind as a parameter or interpolate the constant; 3 files; low |
| `ReactionOfferHostPolicy` literal | tools/turn-context-cap-sweep.ts:102 `{kind:'unattended', askDefault:'decline'}` = `ARENA_REACTION_OFFER_POLICY` (reaction-offer-host-policy.ts:21) | import it; 1 line |
| `DM_BRIDGE_PROTOCOL_VERSION` | tools/vtt-experiment.ts:179 `protocolVersion: 2` literal | import the constant; 1 line |
| test-only retyping of production ids | `'encounter:ai-dm-conversation'` tests 4 files/10 sites (prod: ai-dm-conversation.ts:4196, no constant); `'gpt-5.6-sol'` tests 7 files/32 sites; `'arena-row-v3'` tests 4 files/12 sites | export `CONVERSATION_RUN_ID` and the row version; tests import |
| module singletons | `worker/registry.ts:113 rpcRegistry`, `intent-resolver.ts:680 pureTurnProposalResolver` (agreed tranche), `uuidv7.ts:104 defaultGenerator`, `character-command-executor.ts:341 storedPayloadValidator` | no duplicate singletons for one purpose found |
| `?? {}` | 26 sites, max 4 per file | nothing beyond the agreed ConversationRunOptions item |

## 2 PART 2 — astra's §2 rejections

Legend: **AGREE** / **DISAGREE** / **AGREE, with a gap**. Evidence is what I read; astra's inventories were not re-run.

- **Offer-baseline correction (four constructors, MCP `reconstructLauncherOfferEnvironment`):** AGREE with the site list — VERIFIED `rg -n 'createLegacyEngineOptionEnvironment\(' src tools` gives engine-round-session.ts:358 (param default), dm-encounter-host.ts:409 (`??`), mcp/entrypoint.ts:453, ai-dm-conversation.ts:4252. In flight; not re-examined.
- **EngineOfferFamilyPolicy / PartyThreatCatalog — "absorb into offers builder":** AGREE, with a gap. VERIFIED: three format tags have no exported constant and are retyped 13× across the two modules (F7 last row), `digestBody` and `deepFreeze` are duplicated between them (F8), and the exact-keys checker is a third private copy (F9). If the in-flight tranche only privatises the constructors and does not (a) export the format constants, (b) share one digest/freeze helper, the defect class the owner ruled on survives inside the new builder. I cannot see the tranche diff; the owner should check those two points against it.
- **RepositoryIdentityPolicy / HandoffPaths:** AGREE. VERIFIED `tools/vtt-handoff/paths.ts:21` is the only literal; `:57,:85,:101,:127` default to it in the same module; report/doctor/bootstrap/publish only forward `identityPolicy?`.
- **UuidV7Generator:** AGREE. VERIFIED one factory, one module singleton (`uuidv7.ts:104`), one parameter default (`art-request.ts:43`); no cross-generator ordering requirement in code.
- **ContentPackV1 / LoadedContentPack:** AGREE. VERIFIED `content-pack.ts:831 loadContentPack` and `:1186 loadContentPackBytes` are the only loaders.
- **Arena codecs:** AGREE. VERIFIED `decodeEngineFixtureV1` has one caller (`mcp/entrypoint.ts:663`); `decodeEncounterStateV1(value, mode)` takes an explicit mode.
- **Intel contracts — "policy versions are constants":** DISAGREE. They are constants in two places and one pair has already diverged (F1: `actor-knowledge-last-seen-v4` vs `actor-knowledge-v3-last-seen`). Fix: `mcp/schemas.ts` and `engine-server.ts` import from `intel/*`; decide v3/v4. 3 files.
- **ReactionOfferHostPolicy:** AGREE on "no builder", but the unattended literal at `tools/turn-context-cap-sweep.ts:102` equals `ARENA_REACTION_OFFER_POLICY` and should import it (1 line). Conversation's literal is parameterised by `config.reactionAskDefault`; fine.
- **DprRequestContext / SimulationSettings:** AGREE. VERIFIED `simulation/request.ts:214,228` are the only parsers.
- **EncounterSeed:** AGREE. VERIFIED `session-seed.ts` owns `encounterSeed`, `DEFAULT_ENCOUNTER_SEED`, `parseOptionalEncounterSeed`; callers (dm-encounter-host.ts:438, d365-sample-dungeon-app.ts:59, worker-entry.ts:70, node-runtime.ts:80) import.
- **AgentSessionDigest / PlanRelevanceSnapshot / DecisionCatalog:** AGREE. VERIFIED one `create*` each (`agent-session-digest.ts:67`, `plan-materiality.ts:174`, `agent-round-decision.ts:215`); the digest module wraps `canonicalizeJson` rather than copying it.
- **PartySessionState / Journal / AdventuringDay / ResourceRecovery / ReplayBundle:** AGREE. VERIFIED create/decode pairs live in one module each (`party-session-state.ts:383/1067`, `replay.ts:289/547`, `simulation/contracts.ts:1753`). The adventuring-day module is, however, the one place that already exports the idle coordinator constant everyone else retypes (F5).
- **HandlerContext / RpcRegistry / DatabaseLifecycle:** AGREE. VERIFIED `worker/registry.ts:50 createRpcRegistry` + `:113 rpcRegistry`; `worker/handler.ts:6` is the only `HandlerContext`.
- **PartyStorage / RepositoryConfig:** AGREE. VERIFIED `create-storage.ts:11` dispatches through a `Record<Forge, (config) => PartyStorage>`; `github.ts:440` is the only forge factory.
- **Playwright / RequiredHandoffGate:** AGREE that the suites are intentionally different; DISAGREE that "central constants" exist for the port rule — F6 shows the 4173 reservation retyped in both Playwright configs, the gate inventory, the runtime launcher, and the dist server.
- **AlgorithmController, DuplicateWarningDetector, CharacterCommandPayloadValidator, AbilityScore, CasterContribution, CharacterSheetBuilder, MulticlassPrimaryAbilityQueries, WeaponQueries, CharacterState, SourceRuleReader:** AGREE — no configuration enters their constructors beyond `db`.
- **SpellSelectionEligibility / SpellAccessBuilder / EligibleSpellSearch / GrantRuleSlotGenerator / BuildReportBuilder ("DB-bound cluster", 47/29):** AGREE. VERIFIED `rg -n 'new (SpellAccessBuilder|SpellSelectionEligibility|...)\(' src tools` → ~75 lines / 30 files; every optional sub-service defaults from the same required `db` (`spell-access-builder.ts:365-367`, `grant-rule-slot-generator.ts:189-190`, `eligible-spell-search.ts:107`, …). No policy value is chosen at any site, so copies cannot diverge in behaviour; a composition-root would be tidiness, not drift protection.
- **CharacterCompletenessQueries:** AGREE. VERIFIED 6 production sites all use the default `completenessChecks`.
- **CharacterCommandIntegrity:** AGREE. VERIFIED 10 production sites pass `COMMAND_INTEGRITY_KEY` (heldout tool passes its own named key).
- **CharacterCommandExecutor:** AGREE. VERIFIED 7 production sites; options are `state/audit/clock/randomUuid/factory` seams (`character-command-executor.ts:459-470`).
- **MemoryBrowserSessionStore / MemoryMirrorSink:** AGREE. VERIFIED 9 sites; each is an owned store (restore/import/prefix), not a shared policy.
- **DmEncounterHost, DmRoundPlanSession, ControllerRegistry, TurnCoordinator:** in the agreed tranche; not re-examined.
- **ProtocolRuntime, error classes:** AGREE.
- **"Remaining factory-return groups":** AGREE on the groups named, but note the method: astra swept factory *return types* and class constructors. It did not sweep literal constants, zod schema declarations, or object-literal shapes, which is where F1–F7 live.

**Did astra's ranked list miss anything from Part 1?** Yes (VERIFIED by `grep -c` over `../report-astra.md`): F1 (schemas.ts retyping; the v3/v4 drift is not mentioned — `schemas.ts` 0 hits), F2 (`initiative-intel-v1` 0 hits), F3 (`row-codec` 0 hits; rerun-packet appears once, for model ids), F5 (`INITIAL_COORDINATOR_STATE` appears once as a call-site line, not as a duplicate), F6 (`4173` 0 hits), F7's launcher/symmetric/blind rows (0 hits), F8/F9 helpers (`deepFreeze` 2 hits describing offers freezing, no copy count), F10 (`5831001` 0 hits). Overlaps: F4 extends astra #10; the mulberry32 snapshot row of F7 is inside astra #4; the ControllerAssignment literal is inside the agreed coordinator tranche.

## 3 PART 3 — plain English for the owner

The same "many hands rebuild one value" defect the D617.5 ruling addressed shows up mostly as retyped constants and copied schemas rather than as constructors, and two of them have already diverged: the MCP schema and the intel module disagree on the actor-knowledge policy version (v3 vs v4), and the rerun-packet tool carries a stricter private copy of nineteen arena-row zod schemas than the "shared" codec it imports. Fix in this order: (1) make `mcp/schemas.ts` and `engine-server.ts` import the four intel policy constants and settle v3/v4; (2) make the initiative-intel producer, the MCP entrypoint and the two tools import `ENGINE_INITIATIVE_PROJECTION_POLICY` and an empty-projection helper; (3) delete the nineteen schema copies in `ai-dm-rerun-packet.ts` and move the blind-row extension into the row codec; (4) have the arena tool call the conversation CLI parser instead of re-parsing thirty flags with duplicated defaults; (5) export the idle coordinator state from `coordinator.ts` and import it in the other seven files; (6) one reserved-port constant for the seven 4173 checks; (7) import the existing wire-format constants at the twelve sites that retype them, and, inside the in-flight offers tranche, export the three offers format tags and share one digest/freeze helper. The helper copies (deepFreeze, node sha256, exact-keys, isRecord) and the challenge seeds are worth a mechanical pass later but carry little drift risk. Everything astra rejected in §2 is fine as it stands except the intel policy constants and the port rule; the DB-bound service cluster, the handoff paths, UUIDv7, content-pack loading, seeds, session families, worker root, party storage and the executor defaults do not need a builder.

CLAUDE REVIEW DONE
